const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db/pool");
const { ok, fail } = require("../utils/responses");
const { generateSessionToken, generateOtp, hashOtp } = require("../services/licenses");
const { sendOtp } = require("../services/mailer");
const { audit } = require("../services/audit");
const { rid } = require("../utils/helpers");
const { clientIp } = require("../middleware/rateLimit");
const { signBody } = require("../utils/srp");

const router = express.Router();

async function appByBody(body) {
  const appId = body.app_id || body.ownerid || body.appId;
  if (!appId) return null;
  const r = await pool.query(
    `SELECT a.*, s.* FROM apps a LEFT JOIN app_settings s ON s.app_id = a.id WHERE a.api_key = $1 OR a.id = $1`,
    [appId]
  );
  return r.rows[0] || null;
}

function validateAppRequest(body) {
  const { name, version, secret } = body;
  return { name, version, secret };
}

async function appSession(token) {
  const r = await pool.query(`SELECT * FROM sessions WHERE token = $1 AND expires_at > now()`, [token]);
  return r.rows[0] || null;
}

function publicUser(row) {
  const { password_hash, two_factor_secret, ...safe } = row;
  return safe;
}

// SRP: sign every /api/v2/client JSON response with the app's api_secret so the
// DexterAuth C# SDK's strict X-Response-Sig check passes (like AuthForge parity).
// Unsigned responses make SDKs with a configured secret self-terminate.
router.use((req, res, next) => {
  const origJson = res.json.bind(res);
  res.json = (body) => {
    (async () => {
      try {
        const app = await appByBody(req.body || {});
        if (app && app.api_secret && body && typeof body === "object") {
          const { sig, nonce } = signBody(app.api_secret, body);
          res.set("X-Response-Sig", sig);
          res.set("X-Response-Nonce", nonce);
        }
      } catch { /* never break the response path */ }
      return origJson(body);
    })();
  };
  next();
});

function subEntry(level, expDate) {
  return {
    subscription: level || "Default",
    expiry: expDate ? Math.floor(new Date(expDate).getTime() / 1000).toString() : "",
  };
}

router.post("/init", async (req, res, next) => {
  try {
    const app = await appByBody(req.body);
    if (!app) return fail(res, 404, "Application not found");
    if (!app.status) return fail(res, 403, "Application is paused");
    await audit({ appId: app.id, action: "sdk.init", ip: clientIp(req) });
    return ok(res, {
      message: "Successfully initialized",
      app: { id: app.id, name: app.name, version: app.version },
      // app_info: legacy DexterAuth SDK shape (like AuthForge latest_version parity)
      app_info: { name: app.name, version: app.version, hwid_method: "windows_user" },
    });
  } catch (e) { next(e); }
});

router.post("/login", async (req, res, next) => {
  try {
    const app = await appByBody(req.body);
    if (!app) return fail(res, 404, "Application not found");
    if (!app.status) return fail(res, 403, "Application is paused");
    const { username, password, hwid, version } = req.body;
    if (!username || !password) return fail(res, 400, "username and password are required");
    if (app.version !== version && version) return fail(res, 403, "Application version mismatch. Please update your client.");

    const user = await pool.query(`SELECT * FROM app_users WHERE app_id = $1 AND (LOWER(username) = LOWER($2) OR LOWER(email) = LOWER($2))`, [app.id, username]);
    // AuthForge parity: never reveal whether the username exists (no user enumeration).
    if (user.rows.length === 0) return fail(res, 401, "Invalid credentials");
    const u = user.rows[0];
    if (!(await bcrypt.compare(password, u.password_hash))) return fail(res, 401, "Invalid credentials");
    if (u.is_banned) return fail(res, 403, "This account is banned");
    if (new Date(u.expiration_date) < new Date()) {
      await pool.query(`UPDATE app_users SET status = 'expired' WHERE id = $1`, [u.id]);
      return fail(res, 403, "Your subscription has expired");
    }
    if (app.hwid_lock) {
      if (!u.hwid) {
        if (!hwid) return fail(res, 400, "hwid is required for this application");
        await pool.query(`UPDATE app_users SET hwid = $2, hwid_affected = true WHERE id = $1`, [u.id, hwid]);
      } else if (hwid && u.hwid !== hwid && u.additional_hwid !== hwid) {
        return fail(res, 403, "Account is bound to another device (HWID mismatch)");
      }
    }
    const bl = await pool.query(`SELECT 1 FROM blacklist WHERE app_id = $1 AND hwid = $2`, [app.id, hwid || ""]);
    if (bl.rows.length > 0) return fail(res, 403, "This device is blacklisted");

    const token = generateSessionToken();
    await pool.query(
      `INSERT INTO sessions (id, app_id, user_id, token, ip, device, hwid, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now() + interval '7 days')`,
      [rid("sess"), app.id, u.id, token, clientIp(req), (req.headers["user-agent"] || "").slice(0, 128), u.hwid || hwid || ""]
    );
    await pool.query(`UPDATE app_users SET last_login_at = now(), last_ip = $2 WHERE id = $1`, [u.id, clientIp(req)]);
    await audit({ appId: app.id, actorId: u.id, action: "sdk.login", ip: clientIp(req) });
    const fresh = (await pool.query(`SELECT * FROM app_users WHERE id = $1`, [u.id])).rows[0];
    const freshExp = fresh.expiration_date ? new Date(fresh.expiration_date) : null;
    return ok(res, {
      token,
      session_token: token,
      // AuthForge parity fields (top-level expiry/plan + subscriptions array)
      expires_at: freshExp ? freshExp.toISOString() : null,
      plan: fresh.subscription_level || "Default",
      user: { ...publicUser(fresh), subscriptions: [subEntry(fresh.subscription_level, fresh.expiration_date)] },
    });
  } catch (e) { next(e); }
});

router.post("/register", async (req, res, next) => {
  try {
    const app = await appByBody(req.body);
    if (!app) return fail(res, 404, "Application not found");
    if (!app.status) return fail(res, 403, "Application is paused");
    if (app.allow_registration === false) return fail(res, 403, "Registration is disabled");
    const { username, password, license_key, hwid, version, email } = req.body;
    if (!username || !password || !license_key) return fail(res, 400, "username, password and license_key are required");
    if (app.version !== version && version) return fail(res, 403, "Application version mismatch. Please update your client.");
    if (username.length < (app.min_username_length || 3)) return fail(res, 400, `Username must be at least ${app.min_username_length || 3} characters`);
    if (password.length < (app.min_password_length || 6)) return fail(res, 400, `Password must be at least ${app.min_password_length || 6} characters`);

    const lic = await pool.query(`SELECT * FROM licenses WHERE app_id = $1 AND key = $2`, [app.id, license_key]);
    if (lic.rows.length === 0) return fail(res, 404, "Invalid license key");
    const license = lic.rows[0];
    if (license.status !== "unused") return fail(res, 403, "License key is already used or banned");

    const exists = await pool.query(`SELECT 1 FROM app_users WHERE app_id = $1 AND LOWER(username) = LOWER($2)`, [app.id, username]);
    if (exists.rows.length > 0) return fail(res, 409, "Username already taken");

    const userId = rid("usr");
    const expires = new Date(Date.now() + license.expiry_duration * 1000);
    await pool.query(
      `INSERT INTO app_users (id, app_id, username, email, password_hash, subscription_level, hwid, hwid_affected, expiration_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [userId, app.id, username, email || "", await bcrypt.hash(password, 10), license.subscription_level || "Default", app.hwid_lock ? (hwid || "") : "", app.hwid_lock ? !!hwid : false, expires]
    );
    await pool.query(`UPDATE licenses SET status = 'used', used_by = $2, used_on = $3, used_at = now() WHERE id = $1`, [license.id, userId, hwid || ""]);
    await audit({ appId: app.id, actorId: userId, action: "sdk.register", ip: clientIp(req) });
    const token = generateSessionToken();
    await pool.query(
      `INSERT INTO sessions (id, app_id, user_id, token, ip, device, hwid, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now() + interval '7 days')`,
      [rid("sess"), app.id, userId, token, clientIp(req), (req.headers["user-agent"] || "").slice(0, 128), hwid || ""]
    );
    return ok(res, {
      token,
      session_token: token,
      message: "Registration successful",
      expires_at: expires ? expires.toISOString() : null,
      plan: license.subscription_level || "Default",
      user: {
        id: userId,
        username,
        email: email || "",
        subscription_level: license.subscription_level || "Default",
        hwid: hwid || "",
        expiration_date: expires ? expires.toISOString() : null,
        subscriptions: [subEntry(license.subscription_level, expires)],
      },
    });
  } catch (e) { next(e); }
});

// License-key-only login (no username/password) — AuthForge parity.
// First use activates the key (creates + binds the account), later uses log in.
router.post("/license", async (req, res, next) => {
  try {
    const app = await appByBody(req.body);
    if (!app) return fail(res, 404, "Application not found");
    if (!app.status) return fail(res, 403, "Application is paused");
    const { license_key, hwid, version } = req.body;
    if (!license_key) return fail(res, 400, "license_key is required");
    if (app.version !== version && version) return fail(res, 403, "Application version mismatch. Please update your client.");
    const effHwid = hwid || "";

    const lic = await pool.query(`SELECT * FROM licenses WHERE app_id = $1 AND key = $2`, [app.id, license_key]);
    if (lic.rows.length === 0) return fail(res, 404, "Invalid license key");
    const license = lic.rows[0];
    if (license.is_banned || license.status === "banned") return fail(res, 403, "License key is banned");
    if (license.status === "expired") return fail(res, 403, "License key has expired");

    if (effHwid) {
      const bl = await pool.query(`SELECT 1 FROM blacklist WHERE app_id = $1 AND hwid = $2`, [app.id, effHwid]);
      if (bl.rows.length > 0) return fail(res, 403, "This device is blacklisted");
    }

    let user;
    if (license.status === "unused") {
      if (app.hwid_lock && !effHwid) return fail(res, 400, "hwid is required for this application");
      const base = "user_" + String(license_key).replace(/-/g, "").slice(0, 12);
      let username = base;
      for (let i = 0; i < 5; i++) {
        const exists = await pool.query(`SELECT 1 FROM app_users WHERE app_id = $1 AND LOWER(username) = LOWER($2)`, [app.id, username]);
        if (exists.rows.length === 0) break;
        username = base + Math.floor(Math.random() * 9000 + 1000);
      }
      const userId = rid("usr");
      const expires = new Date(Date.now() + Number(license.expiry_duration || 2592000) * 1000);
      await pool.query(
        `INSERT INTO app_users (id, app_id, username, email, password_hash, subscription_level, hwid, hwid_affected, expiration_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [userId, app.id, username, "", await bcrypt.hash(generateSessionToken(), 10), license.subscription_level || "Default", effHwid, !!effHwid, expires]
      );
      await pool.query(`UPDATE licenses SET status = 'used', used_by = $2, used_on = $3, used_at = now() WHERE id = $1`, [license.id, userId, effHwid]);
      await audit({ appId: app.id, actorId: userId, action: "sdk.license-activate", ip: clientIp(req) });
      user = (await pool.query(`SELECT * FROM app_users WHERE id = $1`, [userId])).rows[0];
    } else if (license.status === "used") {
      const r = await pool.query(`SELECT * FROM app_users WHERE id = $1 AND app_id = $2`, [license.used_by, app.id]);
      if (r.rows.length === 0) return fail(res, 404, "License is used but linked account not found");
      user = r.rows[0];
      if (user.is_banned) return fail(res, 403, "This account is banned");
      if (user.expiration_date && new Date(user.expiration_date) < new Date()) {
        await pool.query(`UPDATE app_users SET status = 'expired' WHERE id = $1`, [user.id]);
        return fail(res, 403, "Your subscription has expired");
      }
      if (app.hwid_lock) {
        if (!user.hwid) {
          if (!effHwid) return fail(res, 400, "hwid is required for this application");
          await pool.query(`UPDATE app_users SET hwid = $2, hwid_affected = true WHERE id = $1`, [user.id, effHwid]);
          user.hwid = effHwid;
        } else if (effHwid && user.hwid !== effHwid && user.additional_hwid !== effHwid) {
          return fail(res, 403, "Account is bound to another device (HWID mismatch)");
        }
      }
    } else {
      return fail(res, 403, "License key is not available");
    }

    const token = generateSessionToken();
    await pool.query(
      `INSERT INTO sessions (id, app_id, user_id, token, ip, device, hwid, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now() + interval '7 days')`,
      [rid("sess"), app.id, user.id, token, clientIp(req), (req.headers["user-agent"] || "").slice(0, 128), user.hwid || effHwid || ""]
    );
    await pool.query(`UPDATE app_users SET last_login_at = now(), last_ip = $2 WHERE id = $1`, [user.id, clientIp(req)]);
    await audit({ appId: app.id, actorId: user.id, action: "sdk.license-login", ip: clientIp(req) });
    const fresh = (await pool.query(`SELECT * FROM app_users WHERE id = $1`, [user.id])).rows[0];
    const freshExp = fresh.expiration_date ? new Date(fresh.expiration_date) : null;
    return ok(res, {
      token,
      session_token: token,
      message: "License activated successfully",
      expires_at: freshExp ? freshExp.toISOString() : null,
      plan: fresh.subscription_level || "Default",
      user: { ...publicUser(fresh), subscriptions: [subEntry(fresh.subscription_level, fresh.expiration_date)] },
    });
  } catch (e) { next(e); }
});

router.post("/upgrade", async (req, res, next) => {
  try {
    const app = await appByBody(req.body);
    if (!app) return fail(res, 404, "Application not found");
    const { username, license_key } = req.body;
    if (!username || !license_key) return fail(res, 400, "username and license_key are required");
    const user = await pool.query(`SELECT * FROM app_users WHERE app_id = $1 AND LOWER(username) = LOWER($2)`, [app.id, username]);
    if (user.rows.length === 0) return fail(res, 404, "Account not found");
    const lic = await pool.query(`SELECT * FROM licenses WHERE app_id = $1 AND key = $2`, [app.id, license_key]);
    if (lic.rows.length === 0) return fail(res, 404, "Invalid license key");
    const license = lic.rows[0];
    if (license.status !== "unused") return fail(res, 403, "License key is already used or banned");
    await pool.query(
      `UPDATE app_users SET expiration_date = expiration_date + ($2 || ' seconds')::interval, status = 'active' WHERE id = $1`,
      [user.rows[0].id, license.expiry_duration]
    );
    await pool.query(`UPDATE licenses SET status = 'used', used_by = $2, used_at = now() WHERE id = $1`, [license.id, user.rows[0].id]);
    await audit({ appId: app.id, actorId: user.rows[0].id, action: "sdk.upgrade", ip: clientIp(req) });
    return ok(res, { message: "Subscription upgraded" });
  } catch (e) { next(e); }
});

router.post("/web-login", async (req, res, next) => {
  try {
    const app = await appByBody(req.body);
    if (!app) return fail(res, 404, "Application not found");
    const { username, password } = req.body;
    if (!username || !password) return fail(res, 400, "username and password are required");
    const user = await pool.query(`SELECT * FROM app_users WHERE app_id = $1 AND LOWER(username) = LOWER($2)`, [app.id, username]);
    // AuthForge parity: never reveal whether the username exists (no user enumeration).
    if (user.rows.length === 0) return fail(res, 401, "Invalid credentials");
    if (!(await bcrypt.compare(password, user.rows[0].password_hash))) return fail(res, 401, "Invalid credentials");
    const wu = user.rows[0];
    return ok(res, {
      message: "Web login approved",
      expires_at: wu.expiration_date ? new Date(wu.expiration_date).toISOString() : null,
      plan: wu.subscription_level || "Default",
      user: { ...publicUser(wu), subscriptions: [subEntry(wu.subscription_level, wu.expiration_date)] },
    });
  } catch (e) { next(e); }
});

router.post("/verify-session", async (req, res, next) => {
  try {
    const app = await appByBody(req.body);
    if (!app) return fail(res, 404, "Application not found");
    const { token } = req.body;
    if (!token) return fail(res, 400, "token is required");
    const sess = await appSession(token);
    if (!sess || sess.app_id !== app.id) return fail(res, 401, "Invalid session");
    const user = await pool.query(`SELECT * FROM app_users WHERE id = $1`, [sess.user_id]);
    if (user.rows.length === 0 || user.rows[0].is_banned) return fail(res, 401, "Session user unavailable");
    if (new Date(user.rows[0].expiration_date) < new Date()) return fail(res, 403, "Subscription expired");
    await pool.query(`UPDATE sessions SET last_seen = now() WHERE id = $1`, [sess.id]);
    return ok(res, { valid: true, is_valid: true, user: publicUser(user.rows[0]) });
  } catch (e) { next(e); }
});

router.post("/verify-token", async (req, res, next) => {
  try {
    const app = await appByBody(req.body);
    if (!app) return fail(res, 404, "Application not found");
    const { token } = req.body;
    if (!token) return fail(res, 400, "token is required");
    if (app.token_validation === false) return fail(res, 403, "Token validation is disabled for this application");
    const t = await pool.query(`SELECT * FROM tokens WHERE app_id = $1 AND token_string = $2`, [app.id, token]);
    if (t.rows.length === 0 || t.rows[0].is_banned || t.rows[0].status !== "active") return fail(res, 401, "Invalid token");
    await pool.query(`UPDATE tokens SET last_used_at = now() WHERE id = $1`, [t.rows[0].id]);
    return ok(res, { valid: true, token: t.rows[0].token_string });
  } catch (e) { next(e); }
});

router.post("/logout", async (req, res, next) => {
  try {
    const { session_token } = req.body;
    if (session_token) await pool.query(`DELETE FROM sessions WHERE token = $1`, [session_token]);
    return ok(res, { message: "Logged out" });
  } catch (e) { next(e); }
});

router.post("/change-username", async (req, res, next) => {
  try {
    const app = await appByBody(req.body);
    if (!app) return fail(res, 404, "Application not found");
    const { session_token, new_username } = req.body;
    if (!session_token || !new_username) return fail(res, 400, "session_token and new_username are required");
    const sess = await appSession(session_token);
    if (!sess) return fail(res, 401, "Invalid session");
    const exists = await pool.query(`SELECT 1 FROM app_users WHERE app_id = $1 AND LOWER(username) = LOWER($2) AND id != $3`, [app.id, new_username, sess.user_id]);
    if (exists.rows.length > 0) return fail(res, 409, "Username already taken");
    await pool.query(`UPDATE app_users SET username = $2 WHERE id = $1`, [sess.user_id, new_username]);
    return ok(res, { message: "Username changed" });
  } catch (e) { next(e); }
});

router.post("/forgot", async (req, res, next) => {
  try {
    const app = await appByBody(req.body);
    if (!app) return fail(res, 404, "Application not found");
    const { username, hwid, new_password } = req.body;
    if (!username || !new_password) return fail(res, 400, "username and new_password are required");
    const user = await pool.query(`SELECT * FROM app_users WHERE app_id = $1 AND LOWER(username) = LOWER($2)`, [app.id, username]);
    if (user.rows.length === 0) return fail(res, 404, "Account not found");
    if (app.hwid_lock && user.rows[0].hwid && hwid !== user.rows[0].hwid) return fail(res, 403, "HWID does not match this account");
    if (new_password.length < (app.min_password_length || 6)) return fail(res, 400, `Password must be at least ${app.min_password_length || 6} characters`);
    await pool.query(`UPDATE app_users SET password_hash = $2 WHERE id = $1`, [user.rows[0].id, await bcrypt.hash(new_password, 10)]);
    await audit({ appId: app.id, actorId: user.rows[0].id, action: "sdk.password-reset", ip: clientIp(req) });
    return ok(res, { message: "Password reset successfully" });
  } catch (e) { next(e); }
});

async function authedSession(req) {
  const app = await appByBody(req.body);
  if (!app) return { error: { code: 404, message: "Application not found" } };
  const { session_token, token } = req.body;
  const sess = await appSession(session_token || token);
  if (!sess || sess.app_id !== app.id) return { error: { code: 401, message: "Invalid session" } };
  return { app, sess };
}

const sendAuthError = (res, err) => err && fail(res, err.code, err.message);

router.post("/chat/retrieve", async (req, res, next) => {
  try {
    const { app, sess, error } = await authedSession(req);
    if (error) return sendAuthError(res, error);
    const { channel } = req.body;
    const r = await pool.query(
      `SELECT id, channel, sender_username, sender_display_name, content, created_at
       FROM chat_messages WHERE app_id = $1 AND channel = $2 ORDER BY created_at ASC LIMIT 200`,
      [app.id, channel || "general"]
    );
    return ok(res, { messages: r.rows });
  } catch (e) { next(e); }
});

router.post("/chat/send", async (req, res, next) => {
  try {
    const { app, sess, error } = await authedSession(req);
    if (error) return sendAuthError(res, error);
    const { channel, message } = req.body;
    if (!message) return fail(res, 400, "message is required");
    const user = (await pool.query(`SELECT username, display_name FROM app_users WHERE id = $1`, [sess.user_id])).rows[0];
    const id = rid("msg");
    await pool.query(
      `INSERT INTO chat_messages (id, app_id, channel, sender_id, sender_username, sender_display_name, content)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, app.id, channel || "general", sess.user_id, user.username, user.display_name || user.username, message]
    );
    return ok(res, { message: "Message sent", id });
  } catch (e) { next(e); }
});

router.post("/vars/global", async (req, res, next) => {
  try {
    const { app, sess, error } = await authedSession(req);
    if (error) return sendAuthError(res, error);
    const r = await pool.query(
      `SELECT name, data FROM variables_global WHERE app_id = $1 AND is_authenticated = false ORDER BY name ASC`,
      [app.id]
    );
    return ok(res, { variables: r.rows });
  } catch (e) { next(e); }
});

router.post("/vars/user/get", async (req, res, next) => {
  try {
    const { app, sess, error } = await authedSession(req);
    if (error) return sendAuthError(res, error);
    const r = await pool.query(`SELECT name, data FROM variables_user WHERE app_id = $1 AND user_id = $2 ORDER BY name ASC`, [app.id, sess.user_id]);
    return ok(res, { variables: r.rows });
  } catch (e) { next(e); }
});

router.post("/vars/user/set", async (req, res, next) => {
  try {
    const { app, sess, error } = await authedSession(req);
    if (error) return sendAuthError(res, error);
    const { variables } = req.body;
    if (!variables || typeof variables !== "object") return fail(res, 400, "variables object is required");
    const tx = await pool.query("BEGIN");
    try {
      for (const [name, data] of Object.entries(variables)) {
        const existing = await pool.query(`SELECT id, is_readonly FROM variables_user WHERE app_id = $1 AND user_id = $2 AND name = $3`, [app.id, sess.user_id, name]);
        if (existing.rows.length === 0) {
          await pool.query(
            `INSERT INTO variables_user (id, app_id, user_id, name, data) VALUES ($1,$2,$3,$4,$5)`,
            [rid("uv"), app.id, sess.user_id, name, String(data)]
          );
        } else if (!existing.rows[0].is_readonly) {
          await pool.query(`UPDATE variables_user SET data = $4 WHERE id = $1`, [existing.rows[0].id, null, null, String(data)]);
        }
      }
      await pool.query("COMMIT");
    } catch (e) {
      await pool.query("ROLLBACK");
      throw e;
    }
    return ok(res, { message: "Variables updated" });
  } catch (e) { next(e); }
});

router.post("/2fa/enable", async (req, res, next) => {
  try {
    const app = await appByBody(req.body);
    if (!app) return fail(res, 404, "Application not found");
    const { session_token, secret, code } = req.body;
    if (!session_token || !secret || !code) return fail(res, 400, "session_token, secret and code are required");
    const sess = await appSession(session_token);
    if (!sess) return fail(res, 401, "Invalid session");
    // Production: verify `code` against the TOTP secret (e.g. otplib / speakeasy).
    await pool.query(`UPDATE app_users SET is_2fa_enabled = true, two_factor_secret = $2 WHERE id = $1`, [sess.user_id, secret]);
    return ok(res, { message: "Two-factor authentication enabled" });
  } catch (e) { next(e); }
});

router.post("/2fa/disable", async (req, res, next) => {
  try {
    const app = await appByBody(req.body);
    if (!app) return fail(res, 404, "Application not found");
    const { session_token } = req.body;
    const sess = await appSession(session_token);
    if (!sess) return fail(res, 401, "Invalid session");
    await pool.query(`UPDATE app_users SET is_2fa_enabled = false, two_factor_secret = NULL WHERE id = $1`, [sess.user_id]);
    return ok(res, { message: "Two-factor authentication disabled" });
  } catch (e) { next(e); }
});

router.post("/util/online-users", async (req, res, next) => {
  try {
    const app = await appByBody(req.body);
    if (!app) return fail(res, 404, "Application not found");
    const r = await pool.query(`SELECT count(*)::int AS c FROM sessions WHERE app_id = $1 AND expires_at > now() AND last_seen > now() - interval '5 minutes'`, [app.id]);
    return ok(res, { online: r.rows[0].c });
  } catch (e) { next(e); }
});

router.post("/util/stats", async (req, res, next) => {
  try {
    const app = await appByBody(req.body);
    if (!app) return fail(res, 404, "Application not found");
    const [users, licenses, online] = await Promise.all([
      pool.query(`SELECT count(*)::int AS c FROM app_users WHERE app_id = $1`, [app.id]),
      pool.query(`SELECT count(*)::int AS c FROM licenses WHERE app_id = $1 AND status = 'unused'`, [app.id]),
      pool.query(`SELECT count(*)::int AS c FROM sessions WHERE app_id = $1 AND expires_at > now()`, [app.id]),
    ]);
    return ok(res, { total_users: users.rows[0].c, total_licenses: licenses.rows[0].c, online_users: online.rows[0].c });
  } catch (e) { next(e); }
});

router.post("/util/check-blacklist", async (req, res, next) => {
  try {
    const app = await appByBody(req.body);
    if (!app) return fail(res, 404, "Application not found");
    const { hwid } = req.body;
    if (!hwid) return fail(res, 400, "hwid is required");
    const r = await pool.query(`SELECT 1 FROM blacklist WHERE app_id = $1 AND hwid = $2`, [app.id, hwid]);
    return ok(res, { blacklisted: r.rows.length > 0 });
  } catch (e) { next(e); }
});

router.post("/util/ban", async (req, res, next) => {
  try {
    const app = await appByBody(req.body);
    if (!app) return fail(res, 404, "Application not found");
    const { session_token, reason } = req.body;
    const sess = await appSession(session_token);
    if (sess) {
      await pool.query(`UPDATE app_users SET is_banned = true, ban_reason = $2, banned_at = now() WHERE id = $1`, [sess.user_id, reason || "Self-ban (anti-tamper triggered)"]);
      await pool.query(`DELETE FROM sessions WHERE user_id = $1`, [sess.user_id]);
      await audit({ appId: app.id, actorId: sess.user_id, action: "sdk.self-ban", details: { reason: reason || "anti-tamper" }, ip: clientIp(req) });
    }
    return ok(res, { message: "Account banned" });
  } catch (e) { next(e); }
});

router.post("/util/log", async (req, res, next) => {
  try {
    const app = await appByBody(req.body);
    if (!app) return fail(res, 404, "Application not found");
    const { message } = req.body;
    await audit({ appId: app.id, action: "sdk.log", details: { message: String(message || "").slice(0, 4000) }, ip: clientIp(req) });
    return ok(res, { message: "Logged" });
  } catch (e) { next(e); }
});

router.post("/util/webhook", async (req, res, next) => {
  try {
    const app = await appByBody(req.body);
    if (!app) return fail(res, 404, "Application not found");
    const { content } = req.body;
    let delivered = false;
    if (app.webhook_url && app.webhook_url.startsWith("http")) {
      try {
        const r = await fetch(app.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: String(content || "").slice(0, 2000) }),
        });
        delivered = r.ok;
      } catch { delivered = false; }
    }
    return ok(res, { delivered, message: delivered ? "Webhook delivered" : "Webhook not configured" });
  } catch (e) { next(e); }
});

module.exports = router;