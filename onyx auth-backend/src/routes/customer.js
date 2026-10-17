const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db/pool");
const { ok, fail } = require("../utils/responses");
const { generateSessionToken } = require("../services/licenses");
const { audit } = require("../services/audit");
const { rid } = require("../utils/helpers");
const { clientIp } = require("../middleware/rateLimit");

const router = express.Router();

const CUSTOMER_FIELDS = `
  u.id, u.username, u.email, u.status, u.subscription_level, u.expiration_date,
  u.hwid, u.hwid_affected, u.additional_hwid, u.hwid_reset_at, u.is_banned,
  u.ban_reason, u.ban_expires, u.is_2fa_enabled, u.created_at, u.last_login_at,
  u.last_ip, a.id AS app_id, a.name AS app_name, a.status AS app_status
`;

async function appByParam(appId) {
  const r = await pool.query(`SELECT a.*, s.* FROM apps a LEFT JOIN app_settings s ON s.app_id = a.id WHERE a.api_key = $1 OR a.id = $1`, [appId]);
  return r.rows[0] || null;
}

async function getAppUser(app, authKey) {
  if (!authKey) return null;
  const r = await pool.query(
    `SELECT u.*, u.password_hash FROM app_users u WHERE u.app_id = $1 AND (u.id = $2 OR u.username = $2)`,
    [app.id, authKey]
  );
  return r.rows[0] || null;
}

function publicUser(row) {
  const { password_hash, two_factor_secret, ...safe } = row;
  return safe;
}

router.get("/lookup-app", async (req, res, next) => {
  try {
    const { appId, ownerUsername, appName } = req.query;
    let app = null;
    if (appId) {
      app = await appByParam(appId);
    } else if (ownerUsername && appName) {
      const r = await pool.query(
        `SELECT a.*, s.* FROM apps a LEFT JOIN app_settings s ON s.app_id = a.id
         JOIN users u ON u.id = a.owner_id
         WHERE LOWER(u.username) = LOWER($1) AND LOWER(a.name) = LOWER($2)`,
        [ownerUsername, appName]
      );
      app = r.rows[0] || null;
    }
    if (!app) return fail(res, 404, "Application not found");
    return ok(res, { app: { id: app.id, name: app.name, api_key: app.api_key, status: app.status, license_only: app.license_only, allow_registration: app.allow_registration, allow_customer_panel: app.allow_customer_panel, panel_icon: app.panel_icon, panel_color: app.panel_color, panel_status: app.panel_status } });
  } catch (e) { next(e); }
});

router.post("/login", async (req, res, next) => {
  try {
    const { app_id, username, password, hwid } = req.body;
    if (!app_id || !username || !password) return fail(res, 400, "app_id, username and password are required");
    const app = await appByParam(app_id);
    if (!app) return fail(res, 404, "Application not found");
    if (!app.status) return fail(res, 403, "This application is paused");
    const user = await getAppUser(app, username);
    if (!user) return fail(res, 404, "Account not found");
    if (!(await bcrypt.compare(password, user.password_hash))) return fail(res, 401, "Invalid credentials");
    if (user.is_banned) return fail(res, 403, "This account is banned");
    if (new Date(user.expiration_date) < new Date()) {
      await pool.query(`UPDATE app_users SET status = 'expired' WHERE id = $1`, [user.id]);
      return fail(res, 403, "Your subscription has expired");
    }
    if (app.hwid_lock) {
      if (!user.hwid) {
        if (!hwid) return fail(res, 400, "HWID is required for this application");
        await pool.query(`UPDATE app_users SET hwid = $2, hwid_affected = true WHERE id = $1`, [user.id, hwid]);
      } else if (hwid && user.hwid !== hwid && user.additional_hwid !== hwid) {
        return fail(res, 403, "This account is bound to another device (HWID mismatch)");
      }
    }
    const token = generateSessionToken();
    await pool.query(
      `INSERT INTO sessions (id, app_id, user_id, token, ip, device, hwid, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now() + interval '7 days')`,
      [rid("sess"), app.id, user.id, token, clientIp(req), (req.headers["user-agent"] || "").slice(0, 128), user.hwid || hwid || ""]
    );
    await pool.query(`UPDATE app_users SET last_login_at = now(), last_ip = $2 WHERE id = $1`, [user.id, clientIp(req)]);
    await audit({ appId: app.id, actorId: user.id, action: "customer.login", ip: clientIp(req) });
    const fresh = (await pool.query(`SELECT ${CUSTOMER_FIELDS} FROM app_users u JOIN apps a ON a.id = u.app_id WHERE u.id = $1`, [user.id])).rows[0];
    return ok(res, { token, session_token: token, user: publicUser(fresh) });
  } catch (e) { next(e); }
});

router.post("/login-license", async (req, res, next) => {
  try {
    const { app_id, license_key, hwid } = req.body;
    if (!app_id || !license_key) return fail(res, 400, "app_id and license_key are required");
    const app = await appByParam(app_id);
    if (!app) return fail(res, 404, "Application not found");
    if (!app.status) return fail(res, 403, "This application is paused");
    const lic = await pool.query(`SELECT * FROM licenses WHERE app_id = $1 AND key = $2`, [app.id, license_key]);
    if (lic.rows.length === 0) return fail(res, 404, "Invalid license key");
    const license = lic.rows[0];
    if (license.status === "banned") return fail(res, 403, "This license key is banned");
    if (license.status === "used" && license.used_by) {
      const existing = await pool.query(`SELECT * FROM app_users WHERE id = $1 AND app_id = $2`, [license.used_by, app.id]);
      if (existing.rows.length > 0) {
        const user = existing.rows[0];
        if (app.hwid_lock && user.hwid && hwid && user.hwid !== hwid) return fail(res, 403, "License is bound to another device");
        const token = generateSessionToken();
        await pool.query(
          `INSERT INTO sessions (id, app_id, user_id, token, ip, device, hwid, expires_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7, now() + interval '7 days')`,
          [rid("sess"), app.id, user.id, token, clientIp(req), (req.headers["user-agent"] || "").slice(0, 128), hwid || ""]
        );
        await audit({ appId: app.id, actorId: user.id, action: "customer.login-license", ip: clientIp(req) });
        return ok(res, { token, session_token: token, user: publicUser(user) });
      }
    }
    return fail(res, 401, "License key is not bound to an account");
  } catch (e) { next(e); }
});

router.post("/register", async (req, res, next) => {
  try {
    const { app_id, license_key, username, password, email, hwid } = req.body;
    if (!app_id || !license_key || !username || !password) return fail(res, 400, "app_id, license_key, username and password are required");
    const app = await appByParam(app_id);
    if (!app) return fail(res, 404, "Application not found");
    if (!app.status) return fail(res, 403, "This application is paused");
    if (app.allow_registration === false) return fail(res, 403, "Registration is disabled for this application");
    if (username.length < (app.min_username_length || 3)) return fail(res, 400, `Username must be at least ${app.min_username_length || 3} characters`);
    if (password.length < (app.min_password_length || 6)) return fail(res, 400, `Password must be at least ${app.min_password_length || 6} characters`);

    const lic = await pool.query(`SELECT * FROM licenses WHERE app_id = $1 AND key = $2`, [app.id, license_key]);
    if (lic.rows.length === 0) return fail(res, 404, "Invalid license key");
    const license = lic.rows[0];
    if (license.status !== "unused") return fail(res, 403, "License key is already used or banned");

    const existing = await pool.query(`SELECT 1 FROM app_users WHERE app_id = $1 AND LOWER(username) = LOWER($2)`, [app.id, username]);
    if (existing.rows.length > 0) return fail(res, 409, "Username already taken");

    const userId = rid("usr");
    const base = new Date();
    const expires = new Date(base.getTime() + license.expiry_duration * 1000);
    await pool.query(
      `INSERT INTO app_users (id, app_id, username, email, password_hash, subscription_level, hwid, hwid_affected, created_by, expiration_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NULL,$9)`,
      [userId, app.id, username, email || "", await bcrypt.hash(password, 10), license.subscription_level || "Default", app.hwid_lock ? (hwid || "") : "", app.hwid_lock ? !!hwid : false, expires]
    );
    await pool.query(
      `UPDATE licenses SET status = 'used', used_by = $2, used_on = $3, used_at = now() WHERE id = $1`,
      [license.id, userId, hwid || ""]
    );
    await audit({ appId: app.id, actorId: userId, action: "customer.register", ip: clientIp(req) });
    const token = generateSessionToken();
    await pool.query(
      `INSERT INTO sessions (id, app_id, user_id, token, ip, device, hwid, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now() + interval '7 days')`,
      [rid("sess"), app.id, userId, token, clientIp(req), (req.headers["user-agent"] || "").slice(0, 128), hwid || ""]
    );
    const fresh = (await pool.query(`SELECT ${CUSTOMER_FIELDS} FROM app_users u JOIN apps a ON a.id = u.app_id WHERE u.id = $1`, [userId])).rows[0];
    return ok(res, { token, session_token: token, user: publicUser(fresh) });
  } catch (e) { next(e); }
});

router.post("/upgrade", async (req, res, next) => {
  try {
    const { app_id, token, license_key } = req.body;
    if (!app_id || !token || !license_key) return fail(res, 400, "app_id, token and license_key are required");
    const app = await appByParam(app_id);
    if (!app) return fail(res, 404, "Application not found");
    const sess = await pool.query(`SELECT * FROM sessions WHERE app_id = $1 AND token = $2 AND expires_at > now()`, [app.id, token]);
    if (sess.rows.length === 0) return fail(res, 401, "Invalid session");
    const lic = await pool.query(`SELECT * FROM licenses WHERE app_id = $1 AND key = $2`, [app.id, license_key]);
    if (lic.rows.length === 0) return fail(res, 404, "Invalid license key");
    const license = lic.rows[0];
    if (license.status !== "unused") return fail(res, 403, "License key is already used or banned");
    await pool.query(
      `UPDATE app_users SET expiration_date = expiration_date + ($2 || ' seconds')::interval, status = 'active' WHERE id = $1`,
      [sess.rows[0].user_id, license.expiry_duration]
    );
    await pool.query(`UPDATE licenses SET status = 'used', used_by = $2, used_at = now() WHERE id = $1`, [license.id, sess.rows[0].user_id]);
    await audit({ appId: app.id, actorId: sess.rows[0].user_id, action: "customer.upgrade", ip: clientIp(req) });
    return ok(res, { message: "Subscription upgraded" });
  } catch (e) { next(e); }
});

async function requireCustomer(req, res, next) {
  const { app_id, token, session_token } = req.body;
  const key = token || session_token;
  if (!app_id || !key) return fail(res, 401, "Authentication required");
  try {
    const app = await appByParam(app_id);
    if (!app) return fail(res, 404, "Application not found");
    const sess = await pool.query(`SELECT * FROM sessions WHERE app_id = $1 AND token = $2 AND expires_at > now()`, [app.id, key]);
    if (sess.rows.length === 0) return fail(res, 401, "Invalid or expired session");
    const user = await pool.query(`SELECT * FROM app_users WHERE id = $1`, [sess.rows[0].user_id]);
    if (user.rows.length === 0) return fail(res, 404, "Account not found");
    if (user.rows[0].is_banned) return fail(res, 403, "This account is banned");
    req.app = app;
    req.customer = user.rows[0];
    req.customerSession = sess.rows[0];
    next();
  } catch (e) { next(e); }
}

router.get("/profile", requireCustomer, async (req, res, next) => {
  try {
    const r = await pool.query(`SELECT ${CUSTOMER_FIELDS} FROM app_users u JOIN apps a ON a.id = u.app_id WHERE u.id = $1`, [req.customer.id]);
    const vars = await pool.query(`SELECT name, data FROM variables_global WHERE app_id = $1 AND is_authenticated = true`, [req.app.id]);
    return ok(res, {
      user: publicUser(r.rows[0]),
      hwid_lock: req.app.hwid_lock,
      hwid_reset_cooldown: req.app.hwid_reset_cooldown_duration,
      hwid_reset_cooldown_unit: req.app.hwid_reset_cooldown_unit,
      variables: vars.rows,
    });
  } catch (e) { next(e); }
});

router.post("/update-credentials", requireCustomer, async (req, res, next) => {
  try {
    const { username, password, new_password } = req.body;
    if (username) {
      const exists = await pool.query(`SELECT 1 FROM app_users WHERE app_id = $1 AND LOWER(username) = LOWER($2) AND id != $3`, [req.app.id, username, req.customer.id]);
      if (exists.rows.length > 0) return fail(res, 409, "Username already taken");
      await pool.query(`UPDATE app_users SET username = $2 WHERE id = $1`, [req.customer.id, username]);
    }
    if (new_password) {
      await pool.query(`UPDATE app_users SET password_hash = $2 WHERE id = $1`, [req.customer.id, await bcrypt.hash(new_password, 10)]);
    }
    await audit({ appId: req.app.id, actorId: req.customer.id, action: "customer.credentials-updated", ip: clientIp(req) });
    return ok(res, { message: "Credentials updated" });
  } catch (e) { next(e); }
});

router.post("/reset-hwid", requireCustomer, async (req, res, next) => {
  try {
    const user = req.customer;
    const cooldownSec = (req.app.hwid_reset_cooldown_duration || 7) * 86400;
    if (user.hwid_reset_at) {
      const nextAllowed = new Date(new Date(user.hwid_reset_at).getTime() + cooldownSec * 1000);
      if (nextAllowed > new Date()) {
        const mins = Math.ceil((nextAllowed - new Date()) / 60000);
        return fail(res, 429, `HWID reset is on cooldown. Try again in ${mins} minutes.`);
      }
    }
    await pool.query(`UPDATE app_users SET hwid = '', hwid_affected = false, hwid_reset_at = now(), additional_hwid = '' WHERE id = $1`, [user.id]);
    await audit({ appId: req.app.id, actorId: user.id, action: "customer.hwid-reset", ip: clientIp(req) });
    return ok(res, { message: "HWID reset successfully" });
  } catch (e) { next(e); }
});

router.post("/logout", requireCustomer, async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM sessions WHERE id = $1`, [req.customerSession.id]);
    return ok(res, { message: "Logged out" });
  } catch (e) { next(e); }
});

module.exports = router;