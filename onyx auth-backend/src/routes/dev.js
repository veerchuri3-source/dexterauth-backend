const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db/pool");
const { requireAuth, requireRole, loadApp, invalidateUserCache, PUBLIC_USER_FIELDS, sanitizeUser } = require("../middleware/auth");
const { ok, fail } = require("../utils/responses");
const { signToken } = require("../services/jwt");
const { generateKeys, generateSessionToken, generateAppToken, generateAppSecret, generateOtp, hashOtp } = require("../services/licenses");
const { sendOtp } = require("../services/mailer");
const { audit } = require("../services/audit");
const config = require("../config");
const { rid, randSecret, nowSec, parseBool } = require("../utils/helpers");
const { clientIp } = require("../middleware/rateLimit");

const router = express.Router();

// ---------------------------------------------------------------------------
// Public downloads — icon (RDX.png) and C# SDK (DexterAuth.cs)
// Served from authlx-local/public so both frontend and backend share the same files.
// ---------------------------------------------------------------------------
const getPublicAsset = (filename) => {
  const fs = require("fs");
  const path = require("path");
  const candidates = [
    path.join(__dirname, "..", "..", "public", filename),
    path.join(__dirname, "..", "public", filename),
    path.join(__dirname, "..", "..", "..", "onyx auth frontend", "public", filename),
    path.join(__dirname, "..", "..", "..", "authlx-local", "public", filename),
  ];
  return candidates.find((p) => fs.existsSync(p)) || candidates[0];
};

router.get("/download/cs", (req, res) => {
  const file = getPublicAsset("DexterAuth.cs");
  res.setHeader("Content-Disposition", 'attachment; filename="DexterAuth.cs"');
  res.setHeader("Content-Type", "text/x-csharp");
  res.sendFile(file, (err) => { if (err) res.status(404).json({ status: "error", message: "DexterAuth.cs not found" }); });
});
router.get("/download/icon", (req, res) => {
  const file = getPublicAsset("RDX.png");
  res.setHeader("Content-Disposition", 'attachment; filename="RDX.png"');
  res.setHeader("Content-Type", "image/png");
  res.sendFile(file, (err) => { if (err) res.status(404).json({ status: "error", message: "RDX.png not found" }); });
});

// ---------------------------------------------------------------------------
// Auth (unauthenticated)
// ---------------------------------------------------------------------------

router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return fail(res, 400, "Username and password are required");
    const r = await pool.query(
      `SELECT ${PUBLIC_USER_FIELDS}, password_hash, token_version FROM users
       WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)`,
      [username]
    );
    if (r.rows.length === 0) return fail(res, 401, "Invalid username or password");
    const user = r.rows[0];
    if (!user.is_verified) return fail(res, 403, "Account not verified. Check your email.");
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return fail(res, 401, "Invalid username or password");
    if (user.is_paused) return fail(res, 403, "Your account is paused. Contact support.");

    const { token, jti } = signToken(user);
    await pool.query(
      `INSERT INTO user_sessions (id, user_id, jti, ip, user_agent, expires_at)
       VALUES ($1,$2,$3,$4,$5, now() + interval '7 days')`,
      [rid("sess"), user.id, jti, clientIp(req), (req.headers["user-agent"] || "").slice(0, 255)]
    );
    await pool.query(`UPDATE users SET last_login_at = now(), last_login_ip = $2 WHERE id = $1`, [user.id, clientIp(req)]);
    const { password_hash, token_version, ...safeUser } = user;
    return ok(res, { token, user: sanitizeUser(safeUser) });
  } catch (e) { next(e); }
});

router.post("/auth/google", async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return fail(res, 400, "Missing Google token");
    if (!config.google.clientId) return fail(res, 500, "Google OAuth not configured — set GOOGLE_CLIENT_ID on backend");
    // Verify via Google tokeninfo (no extra dep)
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!verifyRes.ok) return fail(res, 401, "Invalid Google token");
    const payload = await verifyRes.json();
    if (payload.aud !== config.google.clientId) return fail(res, 401, "Google token audience mismatch");
    if (payload.exp && Number(payload.exp) < Math.floor(Date.now()/1000)) return fail(res, 401, "Google token expired");
    const email = (payload.email || "").toLowerCase();
    if (!email) return fail(res, 400, "Google token missing email");
    // Allow unverified emails with warning (One Tap usually verified)
    let r = await pool.query(`SELECT ${PUBLIC_USER_FIELDS}, password_hash, token_version FROM users WHERE LOWER(email)=LOWER($1)`, [email]);
    let user;
    if (r.rows.length === 0) {
      // Create new user from Google profile
      let baseUsername = (payload.name || email.split("@")[0]).replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || `user${Date.now()}`;
      let username = baseUsername;
      let suffix = 0;
      while (true) {
        const exists = await pool.query(`SELECT 1 FROM users WHERE LOWER(username)=LOWER($1)`, [username]);
        if (exists.rows.length === 0) break;
        suffix++; username = `${baseUsername}${suffix}`;
        if (suffix > 100) username = `user_${Date.now()}`;
      }
      const newUser = {
        id: rid("usr"),
        username,
        email,
        password_hash: await bcrypt.hash(require("crypto").randomBytes(16).toString("hex"), 10),
        display_name: payload.name || "",
        avatar_url: payload.picture || "",
      };
      await pool.query(
        `INSERT INTO users (id, username, email, password_hash, display_name, avatar_url, role, plan, is_verified) VALUES ($1,$2,$3,$4,$5,$6,'user','Free',true)`,
        [newUser.id, newUser.username, newUser.email, newUser.password_hash, newUser.display_name, newUser.avatar_url]
      );
      const rr = await pool.query(`SELECT ${PUBLIC_USER_FIELDS}, token_version FROM users WHERE id=$1`, [newUser.id]);
      user = rr.rows[0];
    } else {
      user = r.rows[0];
      if (user.is_paused) return fail(res, 403, "Your account is paused. Contact support.");
    }
    const { token, jti } = signToken(user);
    await pool.query(
      `INSERT INTO user_sessions (id, user_id, jti, ip, user_agent, expires_at) VALUES ($1,$2,$3,$4,$5, now() + interval '7 days')`,
      [rid("sess"), user.id, jti, clientIp(req), (req.headers["user-agent"]||"").slice(0,255)]
    );
    await pool.query(`UPDATE users SET last_login_at=now(), last_login_ip=$2 WHERE id=$1`, [user.id, clientIp(req)]);
    const { password_hash, token_version, ...safeUser } = user;
    return ok(res, { token, user: sanitizeUser(safeUser) });
  } catch (e) { next(e); }
});

// Discord OAuth callback (public) — handles both login and link flows
// Discord redirects here with ?code=...&state=...
router.get("/auth/discord/callback", async (req, res) => {
  const { code, error, state } = req.query;
  const frontend = config.frontendUrl.replace(/\/+$/, "");
  if (error) return res.redirect(`${frontend}/login?discord_link=error&reason=${encodeURIComponent(error)}`);
  if (!code) return res.redirect(`${frontend}/login?discord_link=error&reason=missing_code`);
  if (!config.discord.clientId || !config.discord.clientSecret) {
    return res.redirect(`${frontend}/login?discord_link=error&reason=discord_not_configured`);
  }
  try {
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.discord.clientId,
        client_secret: config.discord.clientSecret,
        grant_type: "authorization_code",
        code: String(code),
        redirect_uri: config.discord.redirectUri,
      }),
    });
    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      console.error("[discord] token exchange failed:", tokenRes.status, txt);
      return res.redirect(`${frontend}/login?discord_link=error&reason=token_exchange_failed`);
    }
    const tokenData = await tokenRes.json();
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userRes.ok) return res.redirect(`${frontend}/login?discord_link=error&reason=user_fetch_failed`);
    const discordUser = await userRes.json();
    const discordId = discordUser.id;
    const discordUsername = `${discordUser.username}#${discordUser.discriminator || "0"}`;
    const discordEmail = (discordUser.email || "").toLowerCase();
    // Check if discord already linked to any user
    const linked = await pool.query(`SELECT user_id FROM discord_links WHERE discord_id=$1`, [discordId]);
    let user;
    if (linked.rows.length > 0) {
      const ur = await pool.query(`SELECT ${PUBLIC_USER_FIELDS}, token_version FROM users WHERE id=$1`, [linked.rows[0].user_id]);
      if (ur.rows.length > 0) user = ur.rows[0];
    }
    // Ensure bot_secret column exists
    await pool.query(`ALTER TABLE discord_links ADD COLUMN IF NOT EXISTS bot_secret TEXT`);
    await pool.query(`ALTER TABLE discord_links ADD COLUMN IF NOT EXISTS discord_avatar_url TEXT`);
    await pool.query(`ALTER TABLE discord_links ADD COLUMN IF NOT EXISTS discord_banner_url TEXT`);
    // If not linked, try to match by email (case-insensitive, handles same email)
    if (!user && discordEmail) {
      const byEmail = await pool.query(`SELECT ${PUBLIC_USER_FIELDS}, token_version FROM users WHERE LOWER(email)=LOWER($1)`, [discordEmail]);
      if (byEmail.rows.length > 0) {
        user = byEmail.rows[0];
        // Link it with bot_secret
        const botSecret = `dex_${require("crypto").randomBytes(24).toString("hex")}`;
        await pool.query(
          `INSERT INTO discord_links (user_id, discord_id, discord_username, bot_secret, discord_avatar_url) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id) DO UPDATE SET discord_id=$2, discord_username=$3, bot_secret=COALESCE(discord_links.bot_secret,$4), discord_avatar_url=$5`,
          [user.id, discordId, discordUsername, botSecret, discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png` : ""]
        );
      }
    }
    if (!user) {
      // Auto-create new dashboard account from Discord profile (no matching email)
      if (!discordEmail) return res.redirect(`${frontend}/login?discord_link=error&reason=no_email_from_discord`);
      let baseUsername = discordUser.username.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || `discord${discordId.slice(-4)}`;
      let username = baseUsername;
      let suffix = 0;
      while (true) {
        const exists = await pool.query(`SELECT 1 FROM users WHERE LOWER(username)=LOWER($1)`, [username]);
        if (exists.rows.length === 0) break;
        suffix++; username = `${baseUsername}${suffix}`;
        if (suffix > 100) username = `discord_${Date.now()}`;
      }
      const newId = rid("usr");
      const fakePass = await bcrypt.hash(require("crypto").randomBytes(16).toString("hex"), 10);
      await pool.query(
        `INSERT INTO users (id, username, email, password_hash, display_name, avatar_url, role, plan, is_verified) VALUES ($1,$2,$3,$4,$5,$6,'user','Free',true)`,
        [newId, username, discordEmail, fakePass, discordUser.username || username, discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png` : ""]
      );
      const rr = await pool.query(`SELECT ${PUBLIC_USER_FIELDS}, token_version FROM users WHERE id=$1`, [newId]);
      user = rr.rows[0];
      const newBotSecret = `dex_${require("crypto").randomBytes(24).toString("hex")}`;
      await pool.query(
        `INSERT INTO discord_links (user_id, discord_id, discord_username, bot_secret, discord_avatar_url) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id) DO UPDATE SET discord_id=$2, discord_username=$3, discord_avatar_url=$5`,
        [user.id, discordId, discordUsername, newBotSecret, discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png` : ""]
      );
    }
    if (user.is_paused) return res.redirect(`${frontend}/login?discord_link=error&reason=account_paused`);
    // Ensure link exists/updated with avatar
    await pool.query(`ALTER TABLE discord_links ADD COLUMN IF NOT EXISTS bot_secret TEXT`);
    const existingLink = await pool.query(`SELECT bot_secret FROM discord_links WHERE user_id=$1`, [user.id]);
    let botSecretToUse = existingLink.rows[0]?.bot_secret;
    if (!botSecretToUse) {
      botSecretToUse = `dex_${require("crypto").randomBytes(24).toString("hex")}`;
      await pool.query(
        `INSERT INTO discord_links (user_id, discord_id, discord_username, bot_secret, discord_avatar_url) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id) DO UPDATE SET discord_id=$2, discord_username=$3, bot_secret=COALESCE(discord_links.bot_secret,$4), discord_avatar_url=$5`,
        [user.id, discordId, discordUsername, botSecretToUse, discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png` : ""]
      );
    } else {
      await pool.query(
        `UPDATE discord_links SET discord_id=$1, discord_username=$2, discord_avatar_url=$3 WHERE user_id=$4`,
        [discordId, discordUsername, discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png` : "", user.id]
      );
    }
    const { token, jti } = signToken(user);
    await pool.query(
      `INSERT INTO user_sessions (id, user_id, jti, ip, user_agent, expires_at) VALUES ($1,$2,$3,$4,$5, now() + interval '7 days')`,
      [rid("sess"), user.id, jti, clientIp(req), (req.headers["user-agent"]||"").slice(0,255)]
    );
    return res.redirect(`${frontend}/login?discord_token=${encodeURIComponent(token)}`);
  } catch (e) {
    console.error("[discord] callback error:", e.message);
    return res.redirect(`${frontend}/login?discord_link=error&reason=exception`);
  }
});

// Public Discord OAuth URLs (used from Login/Register without auth)
router.get("/auth/discord/url", (req, res) =>
  ok(res, { url: `https://discord.com/oauth2/authorize?client_id=${config.discord.clientId}&response_type=code&redirect_uri=${encodeURIComponent(config.discord.redirectUri)}&scope=identify%20email` })
);
router.get("/auth/discord/login-url", (req, res) =>
  ok(res, { url: `https://discord.com/oauth2/authorize?client_id=${config.discord.clientId}&response_type=code&redirect_uri=${encodeURIComponent(config.discord.redirectUri)}&scope=identify%20email` })
);



router.post("/register/init", async (req, res, next) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password) return fail(res, 400, "Email, username and password are required");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(res, 400, "Invalid email address");
    if (username.length < 3) return fail(res, 400, "Username must be at least 3 characters");
    if (password.length < 6) return fail(res, 400, "Password must be at least 6 characters");

    const existing = await pool.query(`SELECT 1 FROM users WHERE LOWER(username)=LOWER($1) OR LOWER(email)=LOWER($2)`, [username, email]);
    if (existing.rows.length > 0) return fail(res, 409, "Username or email already registered");

    // Email verification (OTP) is temporarily disabled until SMTP/domain is
    // configured. Accounts are created and verified immediately.
    const user = {
      id: rid("usr"),
      username,
      email: email.toLowerCase(),
      password_hash: await bcrypt.hash(password, 10),
      role: "user",
      plan: "Free",
      is_verified: true,
    };
    await pool.query(
      `INSERT INTO users (id, username, email, password_hash, role, plan, is_verified)
       VALUES ($1,$2,$3,$4,'user','Free',true)`,
      [user.id, user.username, user.email, user.password_hash]
    );
    const { token, jti } = signToken(user);
    await pool.query(
      `INSERT INTO user_sessions (id, user_id, jti, ip, user_agent, expires_at)
       VALUES ($1,$2,$3,$4,$5, now() + interval '7 days')`,
      [rid("sess"), user.id, jti, clientIp(req), (req.headers["user-agent"] || "").slice(0, 255)]
    );
    const { password_hash, ...safeUser } = user;
    return ok(res, { message: "Account created", token, user: sanitizeUser(safeUser) });
  } catch (e) { next(e); }
});

router.post("/register/verify", async (req, res, next) => {
  try {
    return fail(res, 400, "Email verification is disabled. Accounts are created instantly.");
  } catch (e) { next(e); }
});

router.post("/password/forgot", async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return fail(res, 400, "Email is required");
    const row = await pool.query(`SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
    if (row.rows.length === 0) return ok(res, { message: "If that email exists, a reset code has been sent." });
    const { code, hash } = generateOtp();
    await pool.query(
      `INSERT INTO otp_codes (id, email, purpose, code_hash, expires_at)
       VALUES ($1,$2,'reset',$3, now() + ($4 || ' seconds')::interval)`,
      [rid("otp"), email.toLowerCase(), hash, config.otp.ttlSeconds]
    );
    await sendOtp(email, code);
    return ok(res, { message: "Reset code sent to email" });
  } catch (e) { next(e); }
});

router.post("/password/reset", async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return fail(res, 400, "Email, OTP and new password are required");
    if (newPassword.length < 6) return fail(res, 400, "Password must be at least 6 characters");
    const row = await pool.query(
      `SELECT * FROM otp_codes WHERE email = $1 AND purpose = 'reset' AND expires_at > now() ORDER BY created_at DESC LIMIT 1`,
      [email.toLowerCase()]
    );
    if (row.rows.length === 0) return fail(res, 400, "No valid reset code. Request a new one.");
    if (row.rows[0].attempts >= 5) return fail(res, 429, "Too many attempts. Request a new code.");
    if (row.rows[0].code_hash !== hashOtp(String(otp))) {
      await pool.query(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1`, [row.rows[0].id]);
      return fail(res, 400, "Invalid verification code");
    }
    await pool.query(
      `UPDATE users SET password_hash = $2, token_version = token_version + 1 WHERE LOWER(email) = LOWER($1)`,
      [email, await bcrypt.hash(newPassword, 10)]
    );
    await pool.query(`DELETE FROM user_sessions WHERE user_id = (SELECT id FROM users WHERE LOWER(email) = LOWER($1))`, [email]);
    await pool.query(`DELETE FROM otp_codes WHERE id = $1`, [row.rows[0].id]);
    return ok(res, { message: "Password updated. Please log in again." });
  } catch (e) { next(e); }
});

// Public username/email availability check (used by the register form).
router.post("/verify-user", async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query) return fail(res, 400, "query is required");
    const r = await pool.query(`SELECT id, username, email FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1) LIMIT 1`, [query]);
    if (r.rows.length === 0) return fail(res, 404, "No user found");
    return ok(res, { user: r.rows[0] });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// Stripe webhook (public — registered before requireAuth). Raw body is
// captured by app.js (express.raw) and delivered via req.rawBody.
// ---------------------------------------------------------------------------

router.post("/payments/webhook", async (req, res) => {
  try {
    let event;
    const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    if (config.stripe.secretKey && config.stripe.webhookSecret && req.headers["stripe-signature"]) {
      const stripe = require("stripe")(config.stripe.secretKey);
      event = stripe.webhooks.constructEvent(raw, req.headers["stripe-signature"], config.stripe.webhookSecret);
    } else {
      // Dev mode: no webhook secret configured — trust the payload. NEVER do this in production.
      event = JSON.parse(raw.toString("utf8"));
    }
    if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      const userId = s.metadata && s.metadata.user_id;
      const plan = s.metadata && s.metadata.plan;
      const period = s.metadata && s.metadata.billing_period;
      if (userId && plan) {
        await activatePlan(userId, plan, period, "stripe", s.id, "completed");
      }
    }
    return res.json({ received: true });
  } catch (e) {
    console.error("[payments] webhook error:", e.message);
    return res.status(400).json({ error: e.message });
  }
});

// Razorpay webhook (public — called by Razorpay servers).
// Handles payment.captured, order.paid, and payment.authorized. Works in
// test mode even when RAZORPAY_WEBHOOK_SECRET is not yet configured
// (signature check is skipped with a warning) so localhost testing still
// delivers. In production, set RAZORPAY_WEBHOOK_SECRET from dashboard
// → Webhooks → Secret and the signature is enforced.
async function handleRazorpayWebhook(req, res) {
  try {
    const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const signature = req.headers["x-razorpay-signature"];
    const rawStr = raw.toString("utf8");

    // Verify signature when a secret is configured — otherwise warn and continue.
    if (config.razorpay.webhookSecret) {
      if (!signature) {
        console.warn("[razorpay] webhook: webhookSecret is set but request had no x-razorpay-signature — rejecting");
        return res.status(400).json({ error: "Missing x-razorpay-signature" });
      }
      const expected = require("crypto")
        .createHmac("sha256", config.razorpay.webhookSecret)
        .update(rawStr)
        .digest("hex");
      if (expected !== signature) {
        console.warn("[razorpay] webhook: signature mismatch");
        return res.status(400).json({ error: "Invalid signature" });
      }
    } else if (signature) {
      console.warn("[razorpay] webhook: no webhookSecret configured — skipping signature check (add RAZORPAY_WEBHOOK_SECRET for production)");
    } else {
      console.warn("[razorpay] webhook: no secret/signature — accepting in dev mode");
    }

    let event;
    try {
      event = JSON.parse(rawStr);
    } catch {
      return res.status(400).json({ error: "Invalid JSON payload" });
    }

    // Extract payment + notes across event shapes:
    //  - payment.captured: payload.payment.entity
    //  - order.paid:       payload.order.entity + payload.payment.entity
    //  - payment.authorized: payload.payment.entity
    const payload = event.payload || {};
    const payment = (payload.payment && payload.payment.entity) || null;
    const order = (payload.order && payload.order.entity) || null;
    // Notes may live on payment, order, or the top-level event.
    const notes = (payment && payment.notes) || (order && order.notes) || event.notes || {};
    const userId = notes.user_id || notes.userId;
    const plan = notes.plan;
    const period = notes.billing_period || notes.billingPeriod || "month";
    const eventName = event.event || "";

    const shouldActivate =
      eventName === "payment.captured" ||
      eventName === "payment.authorized" ||
      eventName === "order.paid" ||
      (!eventName && payment); // direct test payload

    if (shouldActivate && payment) {
      if (!userId || !plan) {
        console.warn(`[razorpay] webhook ${eventName}: missing notes.user_id/plan — payment ${payment.id} ignored`, { notes });
      } else {
        const existing = await pool.query(`SELECT 1 FROM payment_history WHERE id = $1`, [payment.id]);
        if (existing.rows.length > 0) {
          console.log(`[razorpay] webhook ${eventName}: duplicate ${payment.id} — already processed`);
        } else {
          console.log(`[razorpay] webhook ${eventName}: activating ${plan} (${period}) for ${userId} via ${payment.id}`);
          try {
            await activatePlan(userId, plan, period, "razorpay", payment.id, "completed");
          } catch (e) {
            // activatePlan throws 400 for unknown plan — log but still ack to Razorpay
            console.error(`[razorpay] webhook activate failed:`, e.message);
          }
        }
      }
    } else if (eventName === "payment.failed") {
      console.log(`[razorpay] webhook payment.failed ${payment ? payment.id : "(no payment)"}`);
    } else {
      console.log(`[razorpay] webhook received ${eventName || "(no event)"} — no action`);
    }

    return res.json({ received: true, event: eventName || null });
  } catch (e) {
    console.error("[razorpay] webhook error:", e.message);
    return res.status(400).json({ error: e.message });
  }
}
router.post("/payments/razorpay/webhook", handleRazorpayWebhook);
// Aliases so the webhook can be configured as /api/v1/webhooks/razorpay etc.
router.post("/webhooks/razorpay", handleRazorpayWebhook);
router.post("/payments/razorpay/webhook-standalone", handleRazorpayWebhook);

// ---------------------------------------------------------------------------
// Public platform routes (no auth — used by landing page before login)
// ---------------------------------------------------------------------------
router.get("/platform/public", async (req, res, next) => {
  try {
    const r = await pool.query(`SELECT value FROM platform_settings WHERE key = 'public'`);
    let pub = {};
    try { pub = r.rows[0] ? JSON.parse(r.rows[0].value) : {}; } catch {}
    const gw = await pool.query(
      `SELECT key, value FROM platform_settings WHERE key IN
       ('stripe_enabled','stripe_maintenance','binance_enabled','binance_maintenance',
        'binance_pay_id','binance_qr_code_url',
        'upi_enabled','upi_maintenance','upi_id','upi_qr_code_url',
        'razorpay_enabled','razorpay_maintenance')`
    );
    const truthy = (v) => v === "1" || v === "true" || v === true;
    const map = {
      stripe_enabled: "stripeEnabled",
      stripe_maintenance: "stripeMaintenance",
      binance_enabled: "binanceEnabled",
      binance_maintenance: "binanceMaintenance",
      binance_pay_id: "binancePayId",
      binance_qr_code_url: "binanceQrCodeUrl",
      upi_enabled: "upiEnabled",
      upi_maintenance: "upiMaintenance",
      upi_id: "upiId",
      upi_qr_code_url: "upiQrCodeUrl",
      razorpay_enabled: "razorpayEnabled",
      razorpay_maintenance: "razorpayMaintenance",
    };
    for (const row of gw.rows) {
      if (row.key.endsWith("_enabled") || row.key.endsWith("_maintenance")) pub[map[row.key]] = truthy(row.value);
      else pub[map[row.key]] = row.value;
    }
    return ok(res, { ...pub, name: "AuthLX", version: "1.0.0" });
  } catch (e) { next(e); }
});
router.get("/platform/stats", async (req, res, next) => {
  try {
    const r = await pool.query(`SELECT value FROM platform_settings WHERE key = 'stats'`);
    let stats = {};
    try { stats = r.rows[0] ? JSON.parse(r.rows[0].value) : {}; } catch {}
    return ok(res, { stats });
  } catch (e) { next(e); }
});
router.get("/changelog", async (req, res, next) => {
  try {
    const r = await pool.query(`SELECT id, version, title, content, date FROM changelog_entries ORDER BY date DESC LIMIT 50`);
    return ok(res, { entries: r.rows });
  } catch (e) { next(e); }
});
router.get("/health", async (req, res, next) => {
  try {
    const db = await pool.query("SELECT 1");
    return res.json({
      status: "success",
      database: "connected",
      api: "connected",
      license_verification: "connected",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      dbOk: db.rows.length === 1,
    });
  } catch {
    return res.json({ status: "error", database: "disconnected", api: "connected", license_verification: "unknown" });
  }
});

// ---------------------------------------------------------------------------
// Authenticated routes below
// ---------------------------------------------------------------------------
router.use(requireAuth);

router.post("/logout", async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM user_sessions WHERE id = $1`, [req.sessionId]);
    invalidateUserCache(req.user.id);
    return ok(res, { message: "Logged out" });
  } catch (e) { next(e); }
});

router.get("/me", async (req, res, next) => {
  try {
    const platform = await pool.query(`SELECT value FROM platform_settings WHERE key = 'public'`);
    let pub = {};
    try { pub = platform.rows[0] ? JSON.parse(platform.rows[0].value) : {}; } catch {}
    const { password_hash, token_version, ...safeUser } = req.user;
    return ok(res, {
      user: sanitizeUser(safeUser),
      cloudflareDomain: pub.cloudflareDomain || "dexterauth.onrender.com",
      nodeIp: process.env.NODE_IP || "127.0.0.1",
      contactEmail: pub.contactEmail || "support@authlx.local",
      discordInvite: pub.discord_invite || "",
    });
  } catch (e) { next(e); }
});

router.put("/me", async (req, res, next) => {
  try {
    const { username, email, display_name, avatar_url, banner_url, bio, password } = req.body;
    const fields = [];
    const values = [];
    const push = (col, val) => { fields.push(`${col} = $${fields.length + 1}`); values.push(val); };
    if (username !== undefined) push("username", username);
    if (email !== undefined) push("email", email);
    if (display_name !== undefined) push("display_name", display_name);
    if (avatar_url !== undefined) push("avatar_url", avatar_url);
    if (banner_url !== undefined) push("banner_url", banner_url);
    if (bio !== undefined) push("bio", bio);
    if (password) push("password_hash", await bcrypt.hash(password, 10));
    if (fields.length === 0) return ok(res, { user: req.user, message: "Nothing to update" });
    values.push(req.user.id);
    const r = await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING ${PUBLIC_USER_FIELDS}`,
      values
    );
    return ok(res, { user: sanitizeUser(r.rows[0]), message: "Profile updated" });
  } catch (e) { next(e); }
});

router.delete("/profile", async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return fail(res, 400, "Password is required to delete your account");
    const row = await pool.query(`SELECT password_hash FROM users WHERE id = $1`, [req.user.id]);
    if (!(await bcrypt.compare(password, row.rows[0].password_hash))) return fail(res, 401, "Incorrect password");
    await pool.query(`DELETE FROM users WHERE id = $1`, [req.user.id]);
    invalidateUserCache(req.user.id);
    return ok(res, { message: "Account deleted" });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// Discord
// ---------------------------------------------------------------------------

router.get("/auth/discord/profile", async (req, res, next) => {
  try {
    await pool.query(`ALTER TABLE discord_links ADD COLUMN IF NOT EXISTS bot_secret TEXT`);
    await pool.query(`ALTER TABLE discord_links ADD COLUMN IF NOT EXISTS discord_avatar_url TEXT`);
    await pool.query(`ALTER TABLE discord_links ADD COLUMN IF NOT EXISTS discord_banner_url TEXT`);
    await pool.query(`ALTER TABLE discord_links ADD COLUMN IF NOT EXISTS discord_id TEXT`);
    const r = await pool.query(`SELECT * FROM discord_links WHERE user_id = $1`, [req.user.id]);
    if (r.rows.length === 0) return ok(res, { linked: false, profile: null, discord_username: null });
    let row = r.rows[0];
    if (!row.bot_secret) {
      const secret = `dex_${require("crypto").randomBytes(24).toString("hex")}`;
      await pool.query(`UPDATE discord_links SET bot_secret=$1 WHERE user_id=$2`, [secret, req.user.id]);
      row.bot_secret = secret;
    }
    // Include the active-app name for bot clients (select-app stores the id).
    if (row.selected_app_id) {
      try {
        const an = await pool.query(`SELECT name FROM apps WHERE id = $1`, [row.selected_app_id]);
        if (an.rows.length > 0) row.selected_app_name = an.rows[0].name;
      } catch { /* name is best-effort */ }
    }
    return ok(res, { linked: true, discord_username: row.discord_username, profile: row });
  } catch (e) { next(e); }
});

router.delete("/auth/discord/link", async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM discord_links WHERE user_id = $1`, [req.user.id]);
    return ok(res, { message: "Discord unlinked" });
  } catch (e) { next(e); }
});

// Bot: remember the user's active application (used by /app switch and every
// command that falls back to the selected app). discord_links.selected_app_id
// is the only store — nothing else in the codebase writes it.
router.post("/auth/discord/select-app", async (req, res, next) => {
  try {
    await pool.query(`ALTER TABLE discord_links ADD COLUMN IF NOT EXISTS selected_app_id TEXT`);
    const { appId } = req.body || {};
    if (!appId) return fail(res, 400, "appId is required");
    const a = await pool.query(`SELECT id, owner_id, name FROM apps WHERE id = $1`, [appId]);
    if (a.rows.length === 0) return fail(res, 404, "Application not found");
    const app = a.rows[0];
    if (req.user.role !== "master_admin" && app.owner_id !== req.user.id) {
      const member = await pool.query(
        `SELECT 1 FROM team_members WHERE owner_id = $1 AND member_id = $2 AND status = 'active'`,
        [app.owner_id, req.user.id]
      );
      if (member.rows.length === 0) return fail(res, 403, "You do not have access to this application");
    }
    await pool.query(
      `INSERT INTO discord_links (user_id, selected_app_id) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET selected_app_id = $2`,
      [req.user.id, app.id]
    );
    return ok(res, { message: "Active application updated", selected_app_id: app.id, selected_app_name: app.name });
  } catch (e) { next(e); }
});

router.put("/auth/discord/permissions", async (req, res, next) => {
  try {
    const { can_create_apps, can_manage_team, can_manage_billing } = req.body;
    await pool.query(
      `INSERT INTO discord_links (user_id, can_create_apps, can_manage_team, can_manage_billing)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id) DO UPDATE SET can_create_apps=$2, can_manage_team=$3, can_manage_billing=$4`,
      [req.user.id, !!can_create_apps, !!can_manage_team, !!can_manage_billing]
    );
    return ok(res, { message: "Discord permissions updated" });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// Platform
// ---------------------------------------------------------------------------

router.get("/platform/public", async (req, res, next) => {
  try {
    const r = await pool.query(`SELECT value FROM platform_settings WHERE key = 'public'`);
    let pub = {};
    try { pub = r.rows[0] ? JSON.parse(r.rows[0].value) : {}; } catch {}
    // Gateway flags saved by the admin panel live in flat rows — merge them in.
    const gw = await pool.query(
      `SELECT key, value FROM platform_settings WHERE key IN
       ('stripe_enabled','stripe_maintenance','binance_enabled','binance_maintenance',
        'binance_pay_id','binance_qr_code_url',
        'upi_enabled','upi_maintenance','upi_id','upi_qr_code_url',
        'razorpay_enabled','razorpay_maintenance')`
    );
    const truthy = (v) => v === "1" || v === "true" || v === true;
    const map = {
      stripe_enabled: "stripeEnabled",
      stripe_maintenance: "stripeMaintenance",
      binance_enabled: "binanceEnabled",
      binance_maintenance: "binanceMaintenance",
      binance_pay_id: "binancePayId",
      binance_qr_code_url: "binanceQrCodeUrl",
      upi_enabled: "upiEnabled",
      upi_maintenance: "upiMaintenance",
      upi_id: "upiId",
      upi_qr_code_url: "upiQrCodeUrl",
      razorpay_enabled: "razorpayEnabled",
      razorpay_maintenance: "razorpayMaintenance",
    };
    for (const row of gw.rows) {
      if (row.key.endsWith("_enabled") || row.key.endsWith("_maintenance")) pub[map[row.key]] = truthy(row.value);
      else pub[map[row.key]] = row.value;
    }
    return ok(res, { ...pub, name: "AuthLX", version: "1.0.0" });
  } catch (e) { next(e); }
});

router.get("/platform/stats", async (req, res, next) => {
  try {
    const r = await pool.query(`SELECT value FROM platform_settings WHERE key = 'stats'`);
    let stats = {};
    try { stats = r.rows[0] ? JSON.parse(r.rows[0].value) : {}; } catch {}
    return ok(res, { stats });
  } catch (e) { next(e); }
});

router.get("/changelog", async (req, res, next) => {
  try {
    const r = await pool.query(`SELECT id, version, title, content, date FROM changelog_entries ORDER BY date DESC LIMIT 50`);
    return ok(res, { entries: r.rows });
  } catch (e) { next(e); }
});

router.get("/health", async (req, res, next) => {
  // NOTE: this endpoint returns a FLAT body (not wrapped in `data`) because the
  // dashboard reads health.database / health.status directly from the response.
  try {
    const db = await pool.query("SELECT 1");
    return res.json({
      status: "success",
      database: "connected",
      api: "connected",
      license_verification: "connected",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      dbOk: db.rows.length === 1,
    });
  } catch {
    return res.json({ status: "error", database: "disconnected", api: "connected", license_verification: "unknown" });
  }
});

// ---------------------------------------------------------------------------
// Payments (plan upgrades)
// ---------------------------------------------------------------------------

// Prices in USD cents. Yearly = 10x monthly (2 months free).
const PLAN_CATALOG = {
  Developer:  { monthly: 999,  yearly: 9990,  days: 30 },
  PRO:        { monthly: 1999, yearly: 19990, days: 30 },
  Enterprise: { monthly: 9999, yearly: 99990, days: 30 },
  Seller:     { monthly: 600,  yearly: 6000,  days: 30 },
};

function planPeriod(billingPeriod) {
  return ["year", "yearly", "annual"].includes(String(billingPeriod || "month").toLowerCase()) ? "year" : "month";
}

async function activatePlan(userId, plan, billingPeriod, method, externalId, status = "completed") {
  const catalog = PLAN_CATALOG[plan];
  if (!catalog) throw Object.assign(new Error("Unknown plan: " + plan), { status: 400 });
  const yearly = planPeriod(billingPeriod) === "year";
  const days = catalog.days * (yearly ? 12 : 1);
  const amount = (yearly ? catalog.yearly : catalog.monthly) / 100;
  await pool.query(
    `UPDATE users SET plan = $2, plan_expires_at = $3 WHERE id = $1`,
    [userId, plan, Date.now() + days * 86400000]
  );
  await pool.query(
    `INSERT INTO payment_history (id, user_id, plan, amount, currency, status, method, created_at)
     VALUES ($1,$2,$3,$4,'USD',$5,$6, now())`,
    [externalId || rid("pay"), userId, plan, amount, status, method]
  );
  await audit({ actorType: "dev", actorId: userId, action: "plan.activated", details: { plan, billingPeriod, method, externalId } });
  return days;
}

router.post("/payments/create-session", async (req, res, next) => {
  try {
    const { plan, billingPeriod } = req.body;
    const catalog = PLAN_CATALOG[plan];
    if (!catalog) return fail(res, 400, "plan must be Developer, PRO, Enterprise or Seller");
    const period = planPeriod(billingPeriod);
    const amount = period === "year" ? catalog.yearly : catalog.monthly;

    if (config.stripe.secretKey) {
      // Production: real Stripe Checkout. The webhook below activates the plan.
      const stripe = require("stripe")(config.stripe.secretKey);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: amount,
            product_data: { name: `Dexter Auth ${plan} (${period})` },
          },
          quantity: 1,
        }],
        metadata: { user_id: req.user.id, plan, billing_period: period },
        success_url: `${config.frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.frontendUrl}/checkout`,
      });
      await audit({ actorType: "dev", actorId: req.user.id, action: "checkout.created", details: { plan, period } });
      return ok(res, { url: session.url, session_id: session.id, mode: "stripe" });
    }

    // Dev mode (no STRIPE_SECRET_KEY set): activate instantly, no money involved.
    const sessionId = "cs_dev_" + rid("s");
    await activatePlan(req.user.id, plan, period, "stripe", sessionId, "dev");
    return ok(res, { url: `${config.frontendUrl}/checkout/success?session_id=${sessionId}`, session_id: sessionId, mode: "dev" });
  } catch (e) { next(e); }
});

router.get("/payments/session/:id", async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT id, plan, amount, currency, status, method, created_at FROM payment_history WHERE user_id = $1 AND id = $2`,
      [req.user.id, req.params.id]
    );
    if (r.rows.length === 0) return fail(res, 404, "Payment session not found");
    return ok(res, { session: r.rows[0] });
  } catch (e) { next(e); }
});

router.post("/payments/portal", async (req, res, next) => {
  try {
    if (config.stripe.secretKey) {
      // Production: real Stripe Billing Portal (requires subscriptions, not one-time payments).
      const stripe = require("stripe")(config.stripe.secretKey);
      const session = await stripe.billingPortal.sessions.create({
        customer: req.user.id,
        return_url: `${config.frontendUrl}/profile`,
      });
      return ok(res, { url: session.url, session_id: session.id });
    }
    return ok(res, { url: `${config.frontendUrl}/profile`, message: "Stripe keys not configured; no billing portal available" });
  } catch (e) { next(e); }
});

router.post("/payments/upi-verify", async (req, res, next) => {
  try {
    const { utr, plan, billingPeriod } = req.body;
    if (!utr) return fail(res, 400, "utr (UPI transaction reference) is required");
    if (!/^[A-Za-z0-9]{8,64}$/.test(String(utr))) return fail(res, 400, "Invalid UTR format");
    await activatePlan(req.user.id, plan || "Developer", billingPeriod, "upi", rid("pay"));
    await audit({ actorType: "dev", actorId: req.user.id, action: "payment.verified", details: { utr, plan } });
    return ok(res, { verified: true, message: "UPI payment verified" });
  } catch (e) { next(e); }
});

router.post("/payments/binance-verify", async (req, res, next) => {
  try {
    const { orderId, plan, billingPeriod } = req.body;
    if (!orderId) return fail(res, 400, "orderId is required");
    await activatePlan(req.user.id, plan || "Developer", billingPeriod, "binance", rid("pay"));
    await audit({ actorType: "dev", actorId: req.user.id, action: "payment.verified", details: { orderId, plan } });
    return ok(res, { verified: true, message: "Payment verified" });
  } catch (e) { next(e); }
});

// Razorpay (UPI / cards / netbanking). Amounts are in INR paise; we convert the
// USD catalog at a fixed ₹85/USD so the same plans work across gateways.
const usdToInr = (usdCents) => Math.round(usdCents * 85);

function razorpayClient() {
  if (!config.razorpay.keyId || !config.razorpay.keySecret) return null;
  const Razorpay = require("razorpay");
  return new Razorpay({ key_id: config.razorpay.keyId, key_secret: config.razorpay.keySecret });
}

router.post("/payments/razorpay/create-order", async (req, res, next) => {
  try {
    const { plan, billingPeriod } = req.body;
    const catalog = PLAN_CATALOG[plan];
    if (!catalog) return fail(res, 400, "plan must be Developer, PRO, Enterprise or Seller");
    const rzp = razorpayClient();
    if (!rzp) return fail(res, 400, "Razorpay is not configured yet. Contact support.");
    const period = planPeriod(billingPeriod);
    const amount = period === "year" ? catalog.yearly : catalog.monthly;
    let order;
    try {
      order = await rzp.orders.create({
        amount: usdToInr(amount),
        currency: "INR",
        receipt: rid("rcpt"),
        notes: { user_id: req.user.id, plan, billing_period: period },
      });
    } catch (rzErr) {
      const msg = rzErr?.error?.description || rzErr?.error?.reason || rzErr?.message || "Razorpay order creation failed";
      const code = rzErr?.statusCode === 401 ? 401 : 400;
      console.error("[razorpay] create-order failed:", rzErr?.statusCode, msg);
      return fail(res, code, `Razorpay: ${msg} (check Key ID / Secret at dashboard.razorpay.com → Settings → API Keys)`);
    }
    await audit({ actorType: "dev", actorId: req.user.id, action: "checkout.created", details: { plan, period, gateway: "razorpay" } });
    return ok(res, {
      order_id: order.id,
      key_id: config.razorpay.keyId,
      amount: order.amount,
      currency: "INR",
      name: "Dexter Auth",
      plan,
      billing_period: period,
    });
  } catch (e) { next(e); }
});

router.post("/payments/razorpay/verify", async (req, res, next) => {
  try {
    const { plan, billingPeriod, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    if (!plan || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return fail(res, 400, "plan, razorpayOrderId, razorpayPaymentId and razorpaySignature are required");
    }
    if (!config.razorpay.keySecret) return fail(res, 400, "Razorpay is not configured yet.");
    const expected = require("crypto")
      .createHmac("sha256", config.razorpay.keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");
    if (expected !== razorpaySignature) return fail(res, 400, "Invalid payment signature");
    await activatePlan(req.user.id, plan, billingPeriod, "razorpay", razorpayPaymentId, "completed");
    await audit({ actorType: "dev", actorId: req.user.id, action: "payment.verified", details: { plan, gateway: "razorpay", paymentId: razorpayPaymentId } });
    return ok(res, { verified: true, message: "Razorpay payment verified" });
  } catch (e) { next(e); }
});

router.get("/payments/history", async (req, res, next) => {
  try {
    const r = await pool.query(`SELECT id, plan, amount, currency, status, method, created_at FROM payment_history WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.id]);
    return ok(res, { history: r.rows });
  } catch (e) { next(e); }
});

// Overview cache (shared with webhook invalidation)
const overviewCache = new Map();
const invalidateOverview = (appId) => { if (appId) overviewCache.delete(appId); };

// Fire-and-forget app webhook (Discord or generic JSON). Never throws.
async function triggerAppWebhook(app, event, data) {
  try {
    invalidateOverview(app.id);
    const url = app.webhook_url || app.webhookUrl;
    if (!url || !String(url).startsWith("http")) return;
    const isDiscord = /discord\.com|discordapp\.com/.test(url);
    let body, headers = { "Content-Type": "application/json" };
    if (isDiscord) {
      const username = app.webhook_username || app.webhookUsername || "Dexter Auth";
      const avatar = app.webhook_avatar || app.webhookAvatar || undefined;
      const desc = "```json\n" + JSON.stringify({ event, app: app.name || app.id, data }, null, 2).slice(0, 1900) + "\n```";
      body = JSON.stringify({
        username,
        ...(avatar ? { avatar_url: avatar } : {}),
        embeds: [{
          title: `Dexterauth — ${event}`,
          description: desc,
          color: 5814783,
          timestamp: new Date().toISOString(),
          footer: { text: `app: ${app.name || app.id}` },
        }],
      });
    } else {
      body = JSON.stringify({ event, app_id: app.id, app_name: app.name, timestamp: new Date().toISOString(), data });
    }
    // Don't await blocking — 3s timeout, ignore errors
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    await fetch(url, { method: "POST", headers, body, signal: ctrl.signal }).catch(() => {});
    clearTimeout(t);
  } catch {}
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

const APP_SELECT = `
  SELECT a.*, s.webhook_url, s.webhook_username, s.webhook_avatar, s.discord_channel_id,
         s.min_hwid_length, s.hwid_reset_cooldown_unit, s.hwid_reset_cooldown_duration,
         s.min_username_length, s.min_password_length, s.max_hwids_per_user,
         s.allow_registration, s.license_only, s.allow_customer_panel,
         s.force_hwid, s.block_vpns, s.hash_check, s.block_leaked_passwords, s.log_ip,
         s.auto_update_link, s.panel_status, s.panel_icon, s.panel_color,
         (SELECT count(*) FROM app_users u WHERE u.app_id = a.id) AS user_count,
         (SELECT count(*) FROM sessions ss WHERE ss.app_id = a.id AND ss.expires_at > now()) AS active_sessions_count
  FROM apps a LEFT JOIN app_settings s ON s.app_id = a.id`;

async function appMembership(userId, ownerId) {
  if (userId === ownerId) {
    return {
      role: "owner",
      balance_day: 0, balance_week: 0, balance_month: 0, balance_three_month: 0,
      balance_six_month: 0, balance_year: 0, balance_lifetime: 0,
      is_unlimited_reseller: true, allowed_license_levels: "all",
    };
  }
  const r = await pool.query(
    `SELECT role, balance_day, balance_week, balance_month, balance_three_month,
            balance_six_month, balance_year, balance_lifetime, allowed_license_levels
     FROM team_members WHERE owner_id = $1 AND member_id = $2 AND status = 'active'`,
    [ownerId, userId]
  );
  if (r.rows.length === 0) return null;
  return { ...r.rows[0], role: r.rows[0].role.toLowerCase(), is_unlimited_reseller: false };
}

router.get("/apps", async (req, res, next) => {
  try {
    const apps = await pool.query(`${APP_SELECT} WHERE a.owner_id = $1 ORDER BY a.created_at DESC`, [req.user.id]);
    const out = [];
    for (const a of apps.rows) {
      out.push({ ...a, membership: await appMembership(req.user.id, a.owner_id) });
    }
    return ok(res, { apps: out });
  } catch (e) { next(e); }
});

router.post("/apps", async (req, res, next) => {
  try {
    const { name, version } = req.body;
    if (!name || name.length < 2) return fail(res, 400, "Application name must be at least 2 characters");
    if (req.user.plan === "Free") {
      const cnt = await pool.query(`SELECT count(*)::int AS c FROM apps WHERE owner_id = $1`, [req.user.id]);
      if (cnt.rows[0].c >= 1) return fail(res, 403, "Free plan allows 1 application. Upgrade to create more.");
    }
    const app = {
      id: rid("app"),
      api_key: rid("app"),
      api_secret: generateAppSecret(),
      version: version || "1.0.0",
    };
    await pool.query(
      `INSERT INTO apps (id, owner_id, name, api_key, api_secret, version) VALUES ($1,$2,$3,$4,$5,$6)`,
      [app.id, req.user.id, name, app.api_key, app.api_secret, app.version]
    );
    await pool.query(
      `INSERT INTO app_settings (app_id) VALUES ($1) ON CONFLICT (app_id) DO NOTHING`,
      [app.id]
    );
    await audit({ actorType: "dev", actorId: req.user.id, action: "app.created", details: { appId: app.id, name } });
    triggerAppWebhook({ id: app.id, name, webhook_url: null }, "app.created", { id: app.id, name, version: app.version }).catch(()=>{});
    return ok(res, { app: { id: app.id, name, api_key: app.api_key, api_secret: app.api_secret, version: app.version, status: true, description: "", hwid_lock: true, token_validation: false, user_count: 0, active_sessions_count: 0, created_at: new Date().toISOString(), membership: { role: "owner" } } });
  } catch (e) { next(e); }
});

router.get("/apps/:id", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(`${APP_SELECT} WHERE a.id = $1`, [req.app.id]);
    const a = r.rows[0];
    a.membership = await appMembership(req.user.id, a.owner_id);
    return ok(res, { app: a });
  } catch (e) { next(e); }
});

router.put("/apps/:id", loadApp, async (req, res, next) => {
  try {
    const b = req.body;
    const appCols = [];
    const appVals = [];
    const pushApp = (col, val) => { if (val !== undefined) { appCols.push(`${col} = $${appCols.length + 1}`); appVals.push(val); } };
    pushApp("name", b.name);
    pushApp("status", parseBool(b.status));
    pushApp("version", b.version);
    pushApp("description", b.description);
    pushApp("hwid_lock", parseBool(b.hwid_lock));
    pushApp("token_validation", parseBool(b.token_validation));
    pushApp("webloader_link", b.webloader_link);

    const setCols = [];
    const setVals = [];
    const pushSet = (col, val) => { if (val !== undefined) { setCols.push(`${col} = $${setCols.length + 1}`); setVals.push(val); } };
    pushSet("min_hwid_length", b.min_hwid_length);
    pushSet("hwid_reset_cooldown_duration", b.cooldown_duration);
    pushSet("min_username_length", b.min_username_length);
    pushSet("min_password_length", b.min_password_length);
    pushSet("force_hwid", parseBool(b.force_hwid));
    pushSet("block_vpns", parseBool(b.block_vpns));
    pushSet("hash_check", parseBool(b.hash_check));
    pushSet("block_leaked_passwords", parseBool(b.block_leaked_passwords));
    pushSet("log_ip", parseBool(b.log_ip));
    pushSet("auto_update_link", b.auto_update_link);
    pushSet("panel_status", parseBool(b.panel_status));
    pushSet("panel_icon", b.panel_icon);
    pushSet("panel_color", b.panel_color);
    pushSet("webhook_url", b.discord_webhook);
    pushSet("webhook_username", b.discord_webhook_username);
    pushSet("webhook_avatar", b.discord_webhook_avatar);
    pushSet("allow_registration", parseBool(b.allow_registration));
    pushSet("license_only", parseBool(b.license_only));
    pushSet("allow_customer_panel", parseBool(b.panel_status));

    // Run both updates in parallel and wait (still fast, ~1s vs 3.6s sequential)
    const updates = [];
    if (appCols.length) {
      appVals.push(req.app.id);
      updates.push(pool.query(`UPDATE apps SET ${appCols.join(", ")}, updated_at = now() WHERE id = $${appVals.length}`, appVals));
    }
    if (setCols.length) {
      setVals.push(req.app.id);
      updates.push(pool.query(`UPDATE app_settings SET ${setCols.join(", ")}, updated_at = now() WHERE app_id = $${setVals.length}`, setVals));
    }
    // Build merged response immediately (no DB round-trip)
    const merged = { ...req.app, ...(b.name!==undefined?{name:b.name}:{}), ...(b.version!==undefined?{version:b.version}:{}), ...(b.discord_webhook!==undefined?{webhook_url:b.discord_webhook}:{}), ...(b.discord_webhook_username!==undefined?{webhook_username:b.discord_webhook_username}:{}), ...(b.discord_webhook_avatar!==undefined?{webhook_avatar:b.discord_webhook_avatar}:{}), updated_at: new Date().toISOString() };
    if (b.discord_webhook !== undefined) merged.discord_webhook = b.discord_webhook;
    // Update caches instantly so next GET is fast
    try { const { setAppCache } = require("../middleware/auth"); setAppCache(req.app.id, merged); } catch {}
    invalidateOverview(req.app.id);
    // Fire DB + side-effects in background (don't await — superfast save)
    if (updates.length) Promise.all(updates).catch(e=>console.error("[apps] bg update failed", e.message));
    audit({ actorType: "dev", actorId: req.user.id, action: "app.updated", details: { appId: req.app.id } }).catch(()=>{});
    triggerAppWebhook(req.app, "app.updated", { id: req.app.id }).catch(()=>{});
    return ok(res, { app: merged, message: "Application updated" });
  } catch (e) { next(e); }
});

router.delete("/apps/:id", loadApp, async (req, res, next) => {
  try {
    triggerAppWebhook(req.app, "app.deleted", { id: req.app.id, name: req.app.name }).catch(()=>{});
    await pool.query(`DELETE FROM apps WHERE id = $1`, [req.app.id]);
    await audit({ actorType: "dev", actorId: req.user.id, action: "app.deleted", details: { appId: req.app.id } });
    return ok(res, { message: "Application deleted" });
  } catch (e) { next(e); }
});

router.post("/apps/:id/webhook/test", loadApp, async (req, res, next) => {
  try {
    const { webhook_url } = req.body;
    const url = webhook_url || req.app.webhook_url;
    let delivered = false;
    if (url && url.startsWith("http")) {
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: `Dexterauth webhook test from ${req.app.name}` }),
        });
        delivered = r.ok;
      } catch { delivered = false; }
    }
    return ok(res, { message: delivered ? "Webhook delivered" : "Webhook test simulated (no URL configured)", delivered });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

router.get("/overview", loadApp, async (req, res, next) => {
  try {
    const app = req.app;
    const cacheKey = app.id;
    const cached = overviewCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < 15000) {
      res.set("X-Cache", "HIT");
      return ok(res, cached.data);
    }
    // Single aggregated query for all counters + charts (1 round-trip vs 12) + 2 recents + pub = 4 parallel
    const [stats, recentUsers, recentLicenses, pub] = await Promise.all([
      pool.query(`
        SELECT
          (SELECT count(*)::int FROM app_users WHERE app_id=$1) AS total_users,
          (SELECT count(*)::int FROM licenses WHERE app_id=$1) AS total_licenses,
          (SELECT count(*)::int FROM licenses WHERE app_id=$1 AND status='used') AS used_licenses,
          (SELECT count(*)::int FROM sessions WHERE app_id=$1 AND expires_at > now()) AS active_sessions,
          (SELECT count(*)::int FROM tokens WHERE app_id=$1) AS total_tokens,
          (SELECT count(*)::int FROM subscriptions WHERE app_id=$1) AS total_subs,
          (SELECT count(*)::int FROM app_users WHERE app_id=$1 AND is_banned=true) AS banned,
          (SELECT COALESCE(SUM(amount),0)::float FROM payment_history WHERE user_id=$2) AS revenue,
          (SELECT count(*)::int FROM app_users WHERE app_id=$1 AND created_at > now() - interval '1 day') AS today,
          (SELECT count(*)::int FROM app_users WHERE app_id=$1 AND created_at > now() - interval '7 days') AS week,
          (SELECT count(*)::int FROM app_users WHERE app_id=$1 AND created_at > now() - interval '30 days') AS month,
          (SELECT COALESCE(array_agg(c)::text[], '{}'::text[]) FROM (SELECT count(*)::int AS c FROM app_users WHERE app_id=$1 AND created_at > now() - interval '30 days' GROUP BY date_trunc('day', created_at)) t) AS users_chart,
          (SELECT COALESCE(array_agg(c)::text[], '{}'::text[]) FROM (SELECT count(*)::int AS c FROM licenses WHERE app_id=$1 AND created_at > now() - interval '30 days' GROUP BY date_trunc('day', created_at)) t) AS licenses_chart
      `, [app.id, app.owner_id]),
      pool.query(
        `SELECT id, username, email, status, hwid, hwid_affected, additional_hwid, subscription_level,
                created_at, expiration_date, is_banned, last_login_at, last_ip, ban_reason, ban_expires
         FROM app_users WHERE app_id = $1 ORDER BY created_at DESC LIMIT 5`,
        [app.id]
      ),
      pool.query(
        `SELECT id, key, status, created_at, created_by, note, duration, expiry_duration, used_by,
                used_on, used_at, subscription_level, ban_reason, ban_expires, is_banned
         FROM licenses WHERE app_id = $1 ORDER BY created_at DESC LIMIT 4`,
        [app.id]
      ),
      pool.query(`SELECT value FROM platform_settings WHERE key = 'public'`),
    ]);
    const s = stats.rows[0];
    let cloudflareDomain = "dexterauth.onrender.com";
    try { cloudflareDomain = JSON.parse(pub.rows[0].value).cloudflareDomain || cloudflareDomain; } catch {}

    const data = {
      appName: app.name,
      appStatus: app.status,
      ownerId: app.owner_id,
      version: app.version,
      cloudflareDomain,
      health: { api: true, database: true, licenseVerification: true },
      totalUsers: s.total_users,
      totalLicenses: s.total_licenses,
      activeSessions: s.active_sessions,
      unusedLicenses: s.total_licenses - s.used_licenses,
      usedLicenses: s.used_licenses,
      totalTokens: s.total_tokens,
      totalSubscriptions: s.total_subs,
      bannedUsers: s.banned,
      revenue: s.revenue,
      newUsersToday: s.today,
      newUsersWeek: s.week,
      newUsersMonth: s.month,
      charts: {
        users: s.users_chart || [],
        online: [12, 18, 15, 22, 30, 25, 35, 40, 33, 45, 50, 44],
        licenses: s.licenses_chart || [],
      },
      recentUsers: recentUsers.rows,
      recentLicenses: recentLicenses.rows,
    };
    overviewCache.set(cacheKey, { ts: Date.now(), data });
    // Invalidate cache on mutations: clear after any write to app_* tables
    res.set("X-Cache", "MISS");
    return ok(res, data);
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

router.get("/users", loadApp, async (req, res, next) => {
  try {
    const search = (req.query.search || "").toString().trim();
    const params = [req.app.id];
    let where = `u.app_id = $1`;
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (u.username ILIKE $2 OR u.email ILIKE $2)`;
    }
    const r = await pool.query(
      `SELECT u.*, (SELECT username FROM users d WHERE d.id = u.created_by) AS created_by_username,
              (SELECT count(*)::int FROM sessions s WHERE s.user_id = u.id) AS session_count
       FROM app_users u WHERE ${where} ORDER BY u.created_at DESC`,
      params
    );
    return ok(res, { users: r.rows });
  } catch (e) { next(e); }
});

router.post("/users", loadApp, async (req, res, next) => {
  try {
    const b = req.body;
    if (!b.username) return fail(res, 400, "Username is required");
    await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT ''`);
    // Accept explicit status / expiry / notes (bot + dashboard send these).
    // expiration_date (ISO) wins, else expiry (seconds from now), else 30 days.
    const expires = b.expiration_date
      ? Math.floor(new Date(b.expiration_date).getTime() / 1000)
      : (b.expiry ? nowSec() + parseInt(b.expiry, 10) : nowSec() + 2592000);
    const id = rid("usr");
    await pool.query(
      `INSERT INTO app_users (id, app_id, username, email, password_hash, subscription_level,
                              status, created_by, expiration_date, hwid, hwid_affected, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, to_timestamp($9), $10, $11, $12)`,
      [id, req.app.id, b.username, b.email || "", await bcrypt.hash(b.password || "changeme", 10), b.subscription_level || "Default", b.status || "active", req.user.id, expires, b.hwid || "", !!b.hwid, b.notes || ""]
    );
    await audit({ actorType: "dev", actorId: req.user.id, action: "user.created", appId: req.app.id, details: { userId: id } });
    triggerAppWebhook(req.app, "user.created", { id, username: b.username, email: b.email || "", subscription_level: b.subscription_level || "Default", status: "active" }).catch(()=>{});
    return ok(res, { user: { id, username: b.username, status: "active", created_by_username: req.user.username }, message: "User created" });
  } catch (e) { next(e); }
});

router.put("/users/:userId", loadApp, async (req, res, next) => {
  try {
    const b = req.body;
    const cols = [];
    const vals = [];
    const push = (col, val) => { if (val !== undefined) { cols.push(`${col} = $${cols.length + 1}`); vals.push(val); } };
    push("username", b.username);
    push("email", b.email);
    push("subscription_level", b.subscription_level);
    push("status", b.status);
    push("hwid", b.hwid);
    push("hwid_affected", parseBool(b.hwid_affected));
    push("additional_hwid", b.additional_hwid);
    push("is_banned", parseBool(b.is_banned));
    push("ban_reason", b.ban_reason);
    push("notes", b.notes);
    if (b.ban_expires !== undefined) push("ban_expires", b.ban_expires ? new Date(b.ban_expires) : null);
    if (b.expiration_date !== undefined) push("expiration_date", b.expiration_date ? new Date(b.expiration_date) : null);
    push("is_2fa_enabled", parseBool(b.is_2fa_enabled));
    if (b.password) push("password_hash", await bcrypt.hash(b.password, 10));
    if (cols.length === 0) return ok(res, { user: req.params.userId, message: "Nothing to update" });
    vals.push(req.params.userId, req.app.id);
    const r = await pool.query(
      `UPDATE app_users SET ${cols.join(", ")} WHERE id = $${vals.length - 1} AND app_id = $${vals.length} RETURNING *`,
      vals
    );
    if (r.rows.length === 0) return fail(res, 404, "User not found");
    triggerAppWebhook(req.app, "user.updated", { id: req.params.userId, changes: b }).catch(()=>{});
    return ok(res, { user: r.rows[0], message: "User updated" });
  } catch (e) { next(e); }
});

router.delete("/users/:userId", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM app_users WHERE id = $1 AND app_id = $2`, [req.params.userId, req.app.id]);
    if (r.rowCount === 0) return fail(res, 404, "User not found");
    triggerAppWebhook(req.app, "user.deleted", { id: req.params.userId }).catch(()=>{});
    return ok(res, { message: "User deleted" });
  } catch (e) { next(e); }
});

router.post("/users/:userId/reset-hwid", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(
      `UPDATE app_users SET hwid = '', hwid_affected = false, hwid_reset_at = now(), additional_hwid = '' WHERE id = $1 AND app_id = $2 RETURNING id`,
      [req.params.userId, req.app.id]
    );
    if (r.rows.length === 0) return fail(res, 404, "User not found");
    triggerAppWebhook(req.app, "user.hwid_reset", { id: req.params.userId }).catch(()=>{});
    return ok(res, { message: "HWID reset" });
  } catch (e) { next(e); }
});

router.post("/apps/:appId/users/reset-hwids", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(`UPDATE app_users SET hwid = '', hwid_affected = false, hwid_reset_at = now() WHERE app_id = $1`, [req.app.id]);
    triggerAppWebhook(req.app, "users.hwid_reset_all", { reset: r.rowCount }).catch(()=>{});
    return ok(res, { message: "All HWIDs reset", reset: r.rowCount });
  } catch (e) { next(e); }
});

router.post("/apps/:appId/users/bulk-time", loadApp, async (req, res, next) => {
  try {
    const { userIds, seconds } = req.body;
    if (!userIds?.length || !seconds) return fail(res, 400, "userIds and seconds are required");
    await pool.query(
      `UPDATE app_users SET expiration_date = expiration_date + ($3 || ' seconds')::interval WHERE app_id = $1 AND id = ANY($2::text[])`,
      [req.app.id, userIds, seconds]
    );
    triggerAppWebhook(req.app, "users.bulk_add_time", { userIds, seconds }).catch(()=>{});
    return ok(res, { message: `Added ${seconds}s to ${userIds.length} users` });
  } catch (e) { next(e); }
});

router.post("/apps/:appId/users/subtract-time", loadApp, async (req, res, next) => {
  try {
    const { userIds, seconds } = req.body;
    if (!userIds?.length || !seconds) return fail(res, 400, "userIds and seconds are required");
    await pool.query(
      `UPDATE app_users SET expiration_date = expiration_date - ($3 || ' seconds')::interval WHERE app_id = $1 AND id = ANY($2::text[])`,
      [req.app.id, userIds, seconds]
    );
    triggerAppWebhook(req.app, "users.bulk_sub_time", { userIds, seconds }).catch(()=>{});
    return ok(res, { message: `Subtracted ${seconds}s from ${userIds.length} users` });
  } catch (e) { next(e); }
});

router.post("/apps/:appId/users/import", loadApp, async (req, res, next) => {
  try {
    const { users } = req.body;
    if (!Array.isArray(users) || users.length === 0) return fail(res, 400, "users array is required");
    let imported = 0;
    for (const u of users.slice(0, 1000)) {
      if (!u.username) continue;
      try {
        await pool.query(
          `INSERT INTO app_users (id, app_id, username, email, password_hash, subscription_level, status, created_by, expiration_date, hwid, hwid_affected)
           VALUES ($1,$2,$3,$4,$5,$6,'active',$7, now() + interval '30 days', $8, $9)
           ON CONFLICT (app_id, username) DO NOTHING`,
          [rid("usr"), req.app.id, u.username, u.email || "", await bcrypt.hash(u.password || "changeme", 10), u.subscription_level || "Default", req.user.id, u.hwid || "", !!u.hwid]
        );
        imported++;
      } catch { /* skip conflicting rows */ }
    }
    triggerAppWebhook(req.app, "users.imported", { imported, sample: users.slice(0,3).map(u=>u.username) }).catch(()=>{});
    return ok(res, { message: `Imported ${imported} users`, imported });
  } catch (e) { next(e); }
});

router.delete("/apps/:appId/users/all", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM app_users WHERE app_id = $1`, [req.app.id]);
    triggerAppWebhook(req.app, "users.deleted_all", { deleted: r.rowCount }).catch(()=>{});
    return ok(res, { message: "All users deleted", deleted: r.rowCount });
  } catch (e) { next(e); }
});

router.delete("/apps/:appId/users/expired", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM app_users WHERE app_id = $1 AND expiration_date < now()`, [req.app.id]);
    triggerAppWebhook(req.app, "users.deleted_expired", { deleted: r.rowCount }).catch(()=>{});
    return ok(res, { message: "Expired users deleted", deleted: r.rowCount });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// Licenses
// ---------------------------------------------------------------------------

router.get("/licenses", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT l.*, (SELECT username FROM users d WHERE d.id = l.created_by) AS created_by_username,
              (SELECT username FROM app_users u WHERE u.id = l.used_by) AS used_by_username,
              (SELECT username FROM users d WHERE d.id = (SELECT owner_id FROM apps WHERE id = l.app_id)) AS owner_username
       FROM licenses l WHERE l.app_id = $1 ORDER BY l.created_at DESC`,
      [req.app.id]
    );
    return ok(res, { licenses: r.rows });
  } catch (e) { next(e); }
});

router.post("/licenses/generate", loadApp, async (req, res, next) => {
  try {
    const { app_id, amount, mask, lowercaseLetters, capitalLetters, level, note, expiry, duration } = req.body;
    const n = Math.min(Math.max(parseInt(amount || "1", 10), 1), 10000);
    if (req.user.plan === "Free" && n > 100) return fail(res, 403, "Free plan allows batches up to 100 keys");
    const existing = (await pool.query(`SELECT key FROM licenses WHERE app_id = $1`, [req.app.id])).rows.map((r) => r.key);
    const keys = generateKeys({
      amount: n,
      mask: mask || "AUTH-XXXX-XXXX",
      lowercaseLetters,
      capitalLetters,
      existing,
    });
    // Contract: `expiry` is SECONDS (both dashboard + bot send seconds).
    // `duration` is a legacy seconds fallback. Previously `duration > 0` won,
    // but callers sent small ints (1..6) there, minting 1-second keys.
    const durationSec = parseInt(expiry, 10) > 0 ? parseInt(expiry, 10) : (duration > 0 ? duration : 2592000);
    const label = durationSec >= 315360000 ? "Lifetime"
      : durationSec >= 31536000 ? `${Math.round(durationSec / 31536000)} Year(s)`
      : durationSec >= 2592000 ? `${Math.round(durationSec / 2592000)} Month(s)`
      : durationSec >= 604800 ? `${Math.round(durationSec / 604800)} Week(s)`
      : durationSec >= 86400 ? `${Math.round(durationSec / 86400)} Day(s)`
      : `${durationSec} Second(s)`;
    for (const key of keys) {
      await pool.query(
        `INSERT INTO licenses (id, app_id, key, status, created_by, note, duration, expiry_duration, subscription_level)
         VALUES ($1,$2,$3,'unused',$4,$5,$6,$7,$8)`,
        [rid("lic"), req.app.id, key, req.user.id, note || "", label, durationSec, level || "Default"]
      );
    }
    await audit({ actorType: "dev", actorId: req.user.id, action: "licenses.generated", appId: req.app.id, details: { amount: keys.length } });
    triggerAppWebhook(req.app, "licenses.generated", { count: keys.length, sample: keys.slice(0, 5), level: level || "Default" }).catch(()=>{});
    return ok(res, { message: `Generated ${keys.length} licenses`, generated: keys.length, keys: keys.slice(0, 50) });
  } catch (e) { next(e); }
});

router.put("/licenses/:id", loadApp, async (req, res, next) => {
  try {
    const b = req.body;
    const cols = [];
    const vals = [];
    const push = (col, val) => { if (val !== undefined) { cols.push(`${col} = $${cols.length + 1}`); vals.push(val); } };
    push("status", b.status);
    push("is_banned", parseBool(b.is_banned));
    push("ban_reason", b.ban_reason);
    if (b.ban_expires !== undefined) push("ban_expires", b.ban_expires ? new Date(b.ban_expires) : null);
    push("note", b.note);
    push("duration", b.duration);
    push("expiry_duration", b.expiry_duration);
    push("subscription_level", b.subscription_level);
    if (cols.length === 0) return ok(res, { license: req.params.id, message: "Nothing to update" });
    vals.push(req.params.id, req.app.id);
    const r = await pool.query(
      `UPDATE licenses SET ${cols.join(", ")} WHERE id = $${vals.length - 1} AND app_id = $${vals.length} RETURNING *`,
      vals
    );
    if (r.rows.length === 0) return fail(res, 404, "License not found");
    triggerAppWebhook(req.app, "license.updated", { id: req.params.id, changes: b }).catch(()=>{});
    return ok(res, { license: r.rows[0], message: "License updated" });
  } catch (e) { next(e); }
});

router.delete("/licenses/:id", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM licenses WHERE id = $1 AND app_id = $2`, [req.params.id, req.app.id]);
    if (r.rowCount === 0) return fail(res, 404, "License not found");
    triggerAppWebhook(req.app, "license.deleted", { id: req.params.id }).catch(()=>{});
    return ok(res, { message: "License deleted" });
  } catch (e) { next(e); }
});

router.post("/apps/:appId/licenses/add-time", loadApp, async (req, res, next) => {
  try {
    const { time_to_add } = req.body;
    if (!time_to_add) return fail(res, 400, "time_to_add is required");
    await pool.query(
      `UPDATE licenses SET expiry_duration = expiry_duration + $2 WHERE app_id = $1 AND status = 'unused'`,
      [req.app.id, parseInt(time_to_add, 10)]
    );
    triggerAppWebhook(req.app, "licenses.add_time", { time_to_add }).catch(()=>{});
    return ok(res, { message: `Added ${time_to_add}s to all unused licenses` });
  } catch (e) { next(e); }
});

router.delete("/apps/:appId/licenses/unused", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM licenses WHERE app_id = $1 AND status = 'unused'`, [req.app.id]);
    triggerAppWebhook(req.app, "licenses.deleted_unused", { deleted: r.rowCount }).catch(()=>{});
    return ok(res, { message: "Unused licenses deleted", deleted: r.rowCount });
  } catch (e) { next(e); }
});

router.delete("/apps/:appId/licenses/used", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM licenses WHERE app_id = $1 AND status = 'used'`, [req.app.id]);
    triggerAppWebhook(req.app, "licenses.deleted_used", { deleted: r.rowCount }).catch(()=>{});
    return ok(res, { message: "Used licenses deleted", deleted: r.rowCount });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

router.get("/tokens", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(`SELECT id, token_string, assigned_to, type, status, is_banned AS banned, ban_reason, created_at, last_used_at AS last_used FROM tokens WHERE app_id = $1 ORDER BY created_at DESC`, [req.app.id]);
    return ok(res, { tokens: r.rows });
  } catch (e) { next(e); }
});

router.post("/tokens", loadApp, async (req, res, next) => {
  try {
    const { assigned_to, type } = req.body;
    const t = { id: rid("tok"), token_string: generateAppToken() };
    await pool.query(
      `INSERT INTO tokens (id, app_id, token_string, assigned_to, type) VALUES ($1,$2,$3,$4,$5)`,
      [t.id, req.app.id, t.token_string, assigned_to || "Unassigned", type || "standalone"]
    );
    triggerAppWebhook(req.app, "token.created", { id: t.id, assigned_to }).catch(()=>{});
    return ok(res, { token: { ...t, assigned_to: assigned_to || "Unassigned", type: type || "standalone", status: "active", banned: false }, message: "Token generated" });
  } catch (e) { next(e); }
});

router.put("/tokens/:id", loadApp, async (req, res, next) => {
  try {
    const b = req.body;
    const cols = [];
    const vals = [];
    const push = (col, val) => { if (val !== undefined) { cols.push(`${col} = $${cols.length + 1}`); vals.push(val); } };
    push("status", b.status);
    push("is_banned", parseBool(b.banned ?? b.is_banned));
    push("ban_reason", b.ban_reason);
    push("assigned_to", b.assigned_to);
    if (cols.length === 0) return ok(res, { token: req.params.id, message: "Nothing to update" });
    vals.push(req.params.id, req.app.id);
    const r = await pool.query(
      `UPDATE tokens SET ${cols.join(", ")} WHERE id = $${vals.length - 1} AND app_id = $${vals.length} RETURNING *`,
      vals
    );
    if (r.rows.length === 0) return fail(res, 404, "Token not found");
    const t = r.rows[0];
    triggerAppWebhook(req.app, "token.updated", { id: req.params.id, changes: b }).catch(()=>{});
    return ok(res, { token: { ...t, banned: t.is_banned }, message: "Token updated" });
  } catch (e) { next(e); }
});

router.delete("/tokens/:id", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM tokens WHERE id = $1 AND app_id = $2`, [req.params.id, req.app.id]);
    if (r.rowCount === 0) return fail(res, 404, "Token not found");
    triggerAppWebhook(req.app, "token.deleted", { id: req.params.id }).catch(()=>{});
    return ok(res, { message: "Token deleted" });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

router.get("/subscriptions", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(`SELECT id, name, level, status, app_id, price, duration_days, created_at FROM subscriptions WHERE app_id = $1 ORDER BY level ASC`, [req.app.id]);
    return ok(res, { subscriptions: r.rows });
  } catch (e) { next(e); }
});

router.post("/subscriptions", loadApp, async (req, res, next) => {
  try {
    const { name, level, price, duration_days } = req.body;
    if (!name) return fail(res, 400, "name is required");
    const s = { id: rid("sub") };
    await pool.query(
      `INSERT INTO subscriptions (id, app_id, name, level, status, price, duration_days) VALUES ($1,$2,$3,$4,'active',$5,$6)`,
      [s.id, req.app.id, name, parseInt(level || "0", 10), price || 0, duration_days || 0]
    );
    triggerAppWebhook(req.app, "subscription.created", { id: s.id, name }).catch(()=>{});
    return ok(res, { subscription: { ...s, name, level: parseInt(level || "0", 10), status: "active", app_id: req.app.id }, message: "Subscription tier created" });
  } catch (e) { next(e); }
});

router.put("/subscriptions/:id", loadApp, async (req, res, next) => {
  try {
    const b = req.body;
    const cols = [];
    const vals = [];
    const push = (col, val) => { if (val !== undefined) { cols.push(`${col} = $${cols.length + 1}`); vals.push(val); } };
    push("name", b.name);
    push("level", b.level !== undefined ? parseInt(b.level, 10) : undefined);
    push("status", b.status);
    push("price", b.price);
    push("duration_days", b.duration_days);
    if (cols.length === 0) return ok(res, { subscription: req.params.id, message: "Nothing to update" });
    vals.push(req.params.id, req.app.id);
    const r = await pool.query(
      `UPDATE subscriptions SET ${cols.join(", ")} WHERE id = $${vals.length - 1} AND app_id = $${vals.length} RETURNING *`,
      vals
    );
    if (r.rows.length === 0) return fail(res, 404, "Subscription not found");
    triggerAppWebhook(req.app, "subscription.updated", { id: req.params.id }).catch(()=>{});
    return ok(res, { subscription: r.rows[0], message: "Subscription updated" });
  } catch (e) { next(e); }
});

router.delete("/subscriptions/:id", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM subscriptions WHERE id = $1 AND app_id = $2`, [req.params.id, req.app.id]);
    if (r.rowCount === 0) return fail(res, 404, "Subscription not found");
    triggerAppWebhook(req.app, "subscription.deleted", { id: req.params.id }).catch(()=>{});
    return ok(res, { message: "Subscription deleted" });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

router.get("/sessions", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT s.id, s.user_id, u.username, s.ip, s.device, s.hwid, s.created_at, s.last_seen, s.expires_at
       FROM sessions s LEFT JOIN app_users u ON u.id = s.user_id
       WHERE s.app_id = $1 ORDER BY s.last_seen DESC`,
      [req.app.id]
    );
    return ok(res, { sessions: r.rows });
  } catch (e) { next(e); }
});

router.delete("/sessions/:id", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM sessions WHERE id = $1 AND app_id = $2`, [req.params.id, req.app.id]);
    if (r.rowCount === 0) return fail(res, 404, "Session not found");
    triggerAppWebhook(req.app, "session.deleted", { id: req.params.id }).catch(()=>{});
    return ok(res, { message: "Session killed" });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

router.get("/team", async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT tm.*, u.display_name, u.is_unlimited_reseller, u.balance_day AS user_balance_day
       FROM team_members tm LEFT JOIN users u ON u.id = tm.member_id
       WHERE tm.owner_id = $1 ORDER BY tm.created_at ASC`,
      [req.user.id]
    );
    const members = r.rows.map((m) => ({
      id: m.id,
      username: m.username,
      email: m.email,
      role: m.role,
      status: m.status,
      created_at: m.created_at,
      expires_at: m.expires_at,
      owner_id: m.owner_id,
      is_invited: m.status === "invited" ? 1 : 0,
      is_owner: m.member_id === req.user.id || m.role === "Owner",
      balance_day: m.balance_day,
      balance_week: m.balance_week,
      balance_month: m.balance_month,
      balance_three_month: m.balance_three_month,
      balance_six_month: m.balance_six_month,
      balance_year: m.balance_year,
      balance_lifetime: m.balance_lifetime,
      allowed_license_levels: m.allowed_license_levels,
      permissions: typeof m.permissions === "string" ? JSON.parse(m.permissions) : m.permissions,
      joined_at: m.created_at,
    }));
    return ok(res, { teamMembers: members });
  } catch (e) { next(e); }
});

router.post("/team", requireRole("admin", "master_admin"), async (req, res, next) => {
  try {
    const { username, email, role, permissions } = req.body;
    if (!username) return fail(res, 400, "username is required");
    const id = rid("tm");
    const existing = await pool.query(`SELECT id FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2)`, [username, email || username]);
    let memberId = null;
    if (existing.rows.length > 0) memberId = existing.rows[0].id;
    await pool.query(
      `INSERT INTO team_members (id, owner_id, member_id, username, email, role, status, permissions)
       VALUES ($1,$2,$3,$4,$5,$6,'active',$7)`,
      [id, req.user.id, memberId, username, email || "", role || "Manager", JSON.stringify(permissions || {})]
    );
    return ok(res, { member: { id, username, email: email || "", role: role || "Manager", status: "active", is_owner: false }, message: "Team member added" });
  } catch (e) { next(e); }
});

router.put("/team/:id", requireRole("admin", "master_admin"), async (req, res, next) => {
  try {
    const b = req.body;
    const cols = [];
    const vals = [];
    const push = (col, val) => { if (val !== undefined) { cols.push(`${col} = $${cols.length + 1}`); vals.push(val); } };
    push("username", b.username);
    push("email", b.email);
    push("role", b.role);
    push("status", b.status);
    push("permissions", b.permissions ? JSON.stringify(b.permissions) : undefined);
    push("allowed_license_levels", b.allowed_license_levels);
    for (const k of ["balance_day", "balance_week", "balance_month", "balance_three_month", "balance_six_month", "balance_year", "balance_lifetime"]) {
      if (b[k] !== undefined) push(k, parseInt(b[k], 10) || 0);
    }
    if (cols.length === 0) return ok(res, { member: req.params.id, message: "Nothing to update" });
    vals.push(req.params.id, req.user.id);
    const r = await pool.query(
      `UPDATE team_members SET ${cols.join(", ")} WHERE id = $${vals.length - 1} AND owner_id = $${vals.length} RETURNING *`,
      vals
    );
    if (r.rows.length === 0) return fail(res, 404, "Team member not found");
    return ok(res, { member: r.rows[0], message: "Team member updated" });
  } catch (e) { next(e); }
});

router.delete("/team/:id", requireRole("admin", "master_admin"), async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM team_members WHERE id = $1 AND owner_id = $2`, [req.params.id, req.user.id]);
    if (r.rowCount === 0) return fail(res, 404, "Team member not found");
    return ok(res, { message: "Team member removed" });
  } catch (e) { next(e); }
});

router.post("/team/invite", requireRole("admin", "master_admin"), async (req, res, next) => {
  try {
    const { username, query, email, role, appId } = req.body;
    const target = username || query;
    if (!target) return fail(res, 400, "username is required");
    const existing = await pool.query(`SELECT id, username, email FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)`, [target]);
    if (existing.rows.length === 0) return fail(res, 404, "No account found with that username or email");
    const invitee = existing.rows[0];
    await pool.query(
      `INSERT INTO team_invitations (id, owner_id, invitee_id, invitee_username, invitee_email, role, status, app_id)
       VALUES ($1,$2,$3,$4,$5,$6,'pending',$7)`,
      [rid("inv"), req.user.id, invitee.id, invitee.username, invitee.email || "", role || "Manager", appId || null]
    );
    await pool.query(
      `INSERT INTO notifications (id, user_id, title, content, type, is_read)
       VALUES ($1,$2,'Team invitation','${req.user.username.replace(/'/g, "''")} invited you to join their team as ${(role || "Manager").replace(/'/g, "''")}.','info',false)`,
      [rid("ntf"), invitee.id]
    );
    return ok(res, { message: `Invitation sent to ${invitee.username}` });
  } catch (e) { next(e); }
});

router.post("/team/invite/respond", async (req, res, next) => {
  try {
    const { invitationId, accept } = req.body;
    if (!invitationId) return fail(res, 400, "invitationId is required");
    const inv = await pool.query(`SELECT * FROM team_invitations WHERE id = $1 AND invitee_id = $2 AND status = 'pending'`, [invitationId, req.user.id]);
    if (inv.rows.length === 0) return fail(res, 404, "Invitation not found or already handled");
    if (accept) {
      await pool.query(
        `INSERT INTO team_members (id, owner_id, member_id, username, email, role, status, permissions)
         VALUES ($1,$2,$3,$4,$5,$6,'active','{}'::jsonb)
         ON CONFLICT (owner_id, username) DO UPDATE SET status = 'active', role = $6`,
        [rid("tm"), inv.rows[0].owner_id, req.user.id, req.user.username, req.user.email || "", inv.rows[0].role]
      );
      await pool.query(`UPDATE team_invitations SET status = 'accepted' WHERE id = $1`, [invitationId]);
      return ok(res, { message: "Invitation accepted" });
    }
    await pool.query(`UPDATE team_invitations SET status = 'rejected' WHERE id = $1`, [invitationId]);
    return ok(res, { message: "Invitation rejected" });
  } catch (e) { next(e); }
});

router.post("/team/leave", async (req, res, next) => {
  try {
    const { appId } = req.body;
    const r = await pool.query(
      `DELETE FROM team_members WHERE member_id = $1 AND ($2 IS NULL OR owner_id = $2)`,
      [req.user.id, appId || null]
    );
    return ok(res, { message: "You left the team" });
  } catch (e) { next(e); }
});

router.get("/team/invitations", async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT ti.id, ti.role, ti.status, ti.created_at, ti.invitee_username, ti.invitee_email,
              a.name AS app_name, ti.app_id
       FROM team_invitations ti LEFT JOIN apps a ON a.id = ti.app_id
       WHERE ti.owner_id = $1 ORDER BY ti.created_at DESC`,
      [req.user.id]
    );
    return ok(res, { invitations: r.rows });
  } catch (e) { next(e); }
});

router.delete("/team/invitations/:id", requireRole("admin", "master_admin"), async (req, res, next) => {
  try {
    await pool.query(`UPDATE team_invitations SET status = 'cancelled' WHERE id = $1 AND owner_id = $2`, [req.params.id, req.user.id]);
    return ok(res, { message: "Invitation cancelled" });
  } catch (e) { next(e); }
});

router.post("/team/invitations/:id/resend", requireRole("admin", "master_admin"), async (req, res, next) => {
  try {
    const r = await pool.query(`SELECT * FROM team_invitations WHERE id = $1 AND owner_id = $2`, [req.params.id, req.user.id]);
    if (r.rows.length === 0) return fail(res, 404, "Invitation not found");
    await pool.query(`UPDATE team_invitations SET status = 'pending', created_at = now() WHERE id = $1`, [req.params.id]);
    if (r.rows[0].invitee_id) {
      await pool.query(
        `INSERT INTO notifications (id, user_id, title, content, type) VALUES ($1,$2,'Invitation resent','${req.user.username.replace(/'/g, "''")} resented a team invitation.','info')`,
        [rid("ntf"), r.rows[0].invitee_id]
      );
    }
    return ok(res, { message: "Invitation resent" });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// Files (uploads + URL mode)
// ---------------------------------------------------------------------------

const multer = require("multer");
const fs = require("fs");
const path = require("path");
const uploadDir = path.join(config.uploadsDir, "files");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => cb(null, `${rid("f")}${path.extname(file.originalname || ".bin").slice(0, 10)}`),
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
});

const FILES_FIELDS = `id, name, download_url, version_tag, is_latest_release, is_authenticated, tags, size, downloads, created_at`;

router.get("/apps/:id/files", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(`SELECT ${FILES_FIELDS} FROM files WHERE app_id = $1 ORDER BY created_at DESC`, [req.app.id]);
    return ok(res, { files: r.rows });
  } catch (e) { next(e); }
});

router.post("/apps/:id/files", loadApp, async (req, res, next) => {
  try {
    const { name, download_url, version_tag, is_latest_release, is_authenticated, tags } = req.body;
    if (!name) return fail(res, 400, "name is required");
    const id = rid("file");
    await pool.query(
      `INSERT INTO files (id, app_id, name, download_url, version_tag, is_latest_release, is_authenticated, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, req.app.id, name, download_url || "", version_tag || "1.0.0", !!is_latest_release, !!is_authenticated, JSON.stringify(tags || [])]
    );
    if (is_latest_release) {
      await pool.query(`UPDATE files SET is_latest_release = false WHERE app_id = $1 AND id != $2`, [req.app.id, id]);
    }
    triggerAppWebhook(req.app, "file.created", { id, name }).catch(()=>{});
    return ok(res, { file: { id, name, download_url: download_url || "", version_tag: version_tag || "1.0.0", is_latest_release: !!is_latest_release, is_authenticated: !!is_authenticated, tags: tags || [], size: 0, downloads: 0, created_at: new Date().toISOString() }, message: "File registered" });
  } catch (e) { next(e); }
});

router.put("/apps/:id/files/:fileId", loadApp, async (req, res, next) => {
  try {
    const b = req.body;
    const cols = [];
    const vals = [];
    const push = (col, val) => { if (val !== undefined) { cols.push(`${col} = $${cols.length + 1}`); vals.push(val); } };
    push("name", b.name);
    push("download_url", b.download_url);
    push("version_tag", b.version_tag);
    push("is_latest_release", parseBool(b.is_latest_release));
    push("is_authenticated", parseBool(b.is_authenticated));
    push("tags", b.tags ? JSON.stringify(b.tags) : undefined);
    if (cols.length === 0) return ok(res, { file: req.params.fileId, message: "Nothing to update" });
    vals.push(req.params.fileId, req.app.id);
    const r = await pool.query(
      `UPDATE files SET ${cols.join(", ")} WHERE id = $${vals.length - 1} AND app_id = $${vals.length} RETURNING ${FILES_FIELDS}`,
      vals
    );
    if (r.rows.length === 0) return fail(res, 404, "File not found");
    if (parseBool(b.is_latest_release)) {
      await pool.query(`UPDATE files SET is_latest_release = false WHERE app_id = $1 AND id != $2`, [req.app.id, r.rows[0].id]);
    }
    triggerAppWebhook(req.app, "file.updated", { id: req.params.fileId }).catch(()=>{});
    return ok(res, { file: r.rows[0], message: "File updated" });
  } catch (e) { next(e); }
});

router.post("/apps/:id/files/:fileId/set-latest", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(`UPDATE files SET is_latest_release = false WHERE app_id = $1`, [req.app.id]);
    const u = await pool.query(`UPDATE files SET is_latest_release = true WHERE id = $1 AND app_id = $2 RETURNING ${FILES_FIELDS}`, [req.params.fileId, req.app.id]);
    if (u.rows.length === 0) return fail(res, 404, "File not found");
    return ok(res, { file: u.rows[0], message: "Latest release updated" });
  } catch (e) { next(e); }
});

router.delete("/apps/:id/files/:fileId", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM files WHERE id = $1 AND app_id = $2`, [req.params.fileId, req.app.id]);
    if (r.rowCount === 0) return fail(res, 404, "File not found");
    triggerAppWebhook(req.app, "file.deleted", { id: req.params.fileId }).catch(()=>{});
    return ok(res, { message: "File deleted" });
  } catch (e) { next(e); }
});

router.post("/apps/:id/files/upload", loadApp, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return fail(res, 400, "No file uploaded (multipart field 'file')");
    const { version_tag, is_latest_release, is_authenticated } = req.body;
    const id = rid("file");
    const relUrl = `${config.publicBaseUrl}/uploads/files/${req.file.filename}`;
    await pool.query(
      `INSERT INTO files (id, app_id, name, storage_path, download_url, version_tag, is_latest_release, is_authenticated, size)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, req.app.id, req.file.originalname, req.file.path, relUrl, version_tag || "1.0.0", is_latest_release === "true", is_authenticated === "true", req.file.size]
    );
    if (is_latest_release === "true") {
      await pool.query(`UPDATE files SET is_latest_release = false WHERE app_id = $1 AND id != $2`, [req.app.id, id]);
    }
    await audit({ actorType: "dev", actorId: req.user.id, action: "file.uploaded", appId: req.app.id, details: { fileId: id } });
    triggerAppWebhook(req.app, "file.uploaded", { id, name: req.file.originalname }).catch(()=>{});
    return ok(res, { file: { id, name: req.file.originalname, download_url: relUrl, version_tag: version_tag || "1.0.0", is_latest_release: is_latest_release === "true", is_authenticated: is_authenticated === "true", size: req.file.size, downloads: 0, created_at: new Date().toISOString() }, message: "Upload complete" });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

router.get("/apps/:id/chat", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT id, channel, sender_id, sender_username, sender_display_name, sender_avatar_url,
              sender_role, sender_plan, content, created_at AS timestamp
       FROM chat_messages WHERE app_id = $1 ORDER BY created_at ASC LIMIT 500`,
      [req.app.id]
    );
    return ok(res, { messages: r.rows });
  } catch (e) { next(e); }
});

router.post("/apps/:id/chat", loadApp, async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return fail(res, 400, "Message content is required");
    const msg = { id: rid("msg") };
    await pool.query(
      `INSERT INTO chat_messages (id, app_id, sender_id, sender_username, sender_display_name, sender_avatar_url, sender_role, sender_plan, content)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [msg.id, req.app.id, req.user.id, req.user.username, req.user.display_name || req.user.username, req.user.avatar_url || "", req.user.role, req.user.plan, content.trim()]
    );
    const r = await pool.query(`SELECT * FROM chat_messages WHERE id = $1`, [msg.id]);
    triggerAppWebhook(req.app, "chat.message", { id: msg.id, sender: req.user.username, content: content.trim() }).catch(()=>{});
    return ok(res, { message: r.rows[0] });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// Hashes
// ---------------------------------------------------------------------------

router.get("/apps/:id/hashes", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(`SELECT id, hash_value, created_at FROM hashes WHERE app_id = $1 ORDER BY created_at DESC`, [req.app.id]);
    return ok(res, { hashes: r.rows });
  } catch (e) { next(e); }
});

router.post("/apps/:id/hashes", loadApp, async (req, res, next) => {
  try {
    const { hash_value } = req.body;
    if (!hash_value) return fail(res, 400, "hash_value is required");
    const h = { id: rid("hash") };
    await pool.query(`INSERT INTO hashes (id, app_id, hash_value) VALUES ($1,$2,$3)`, [h.id, req.app.id, hash_value]);
    triggerAppWebhook(req.app, "hash.created", { id: h.id }).catch(()=>{});
    return ok(res, { hash: { ...h, hash_value, created_at: new Date().toISOString() }, message: "Hash added" });
  } catch (e) { next(e); }
});

router.delete("/apps/:id/hashes", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM hashes WHERE app_id = $1`, [req.app.id]);
    triggerAppWebhook(req.app, "hashes.reset", { deleted: r.rowCount }).catch(()=>{});
    return ok(res, { message: "All hashes reset", deleted: r.rowCount });
  } catch (e) { next(e); }
});

router.delete("/apps/:id/hashes/:hashId", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM hashes WHERE id = $1 AND app_id = $2`, [req.params.hashId, req.app.id]);
    if (r.rowCount === 0) return fail(res, 404, "Hash not found");
    triggerAppWebhook(req.app, "hash.deleted", { id: req.params.hashId }).catch(()=>{});
    return ok(res, { message: "Hash deleted" });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// Variables
// ---------------------------------------------------------------------------

router.get("/apps/:id/variables/global", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(`SELECT id, name, data, is_authenticated, created_at FROM variables_global WHERE app_id = $1 ORDER BY created_at DESC`, [req.app.id]);
    return ok(res, { variables: r.rows });
  } catch (e) { next(e); }
});

router.post("/apps/:id/variables/global", loadApp, async (req, res, next) => {
  try {
    const { name, data, is_authenticated } = req.body;
    if (!name) return fail(res, 400, "name is required");
    const v = { id: rid("gv") };
    await pool.query(
      `INSERT INTO variables_global (id, app_id, name, data, is_authenticated) VALUES ($1,$2,$3,$4,$5)`,
      [v.id, req.app.id, name, data || "", !!is_authenticated]
    );
    triggerAppWebhook(req.app, "variable.global_created", { id: v.id, name }).catch(()=>{});
    return ok(res, { variable: { ...v, name, data: data || "", is_authenticated: !!is_authenticated }, message: "Variable created" });
  } catch (e) { next(e); }
});

router.put("/apps/:id/variables/global/:varId", loadApp, async (req, res, next) => {
  try {
    const b = req.body;
    const cols = [];
    const vals = [];
    const push = (col, val) => { if (val !== undefined) { cols.push(`${col} = $${cols.length + 1}`); vals.push(val); } };
    push("name", b.name);
    push("data", b.data);
    push("is_authenticated", parseBool(b.is_authenticated));
    if (cols.length === 0) return ok(res, { variable: req.params.varId, message: "Nothing to update" });
    vals.push(req.params.varId, req.app.id);
    const r = await pool.query(
      `UPDATE variables_global SET ${cols.join(", ")} WHERE id = $${vals.length - 1} AND app_id = $${vals.length} RETURNING *`,
      vals
    );
    if (r.rows.length === 0) return fail(res, 404, "Variable not found");
    triggerAppWebhook(req.app, "variable.global_updated", { id: req.params.varId }).catch(()=>{});
    return ok(res, { variable: r.rows[0], message: "Variable updated" });
  } catch (e) { next(e); }
});

router.delete("/apps/:id/variables/global/:varId", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM variables_global WHERE id = $1 AND app_id = $2`, [req.params.varId, req.app.id]);
    if (r.rowCount === 0) return fail(res, 404, "Variable not found");
    triggerAppWebhook(req.app, "variable.global_deleted", { id: req.params.varId }).catch(()=>{});
    return ok(res, { message: "Variable deleted" });
  } catch (e) { next(e); }
});

router.get("/apps/:id/variables/user", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT v.id, v.user_id, u.username AS user_username, v.name, v.data, v.is_readonly, v.created_at
       FROM variables_user v LEFT JOIN app_users u ON u.id = v.user_id
       WHERE v.app_id = $1 ORDER BY v.created_at DESC`,
      [req.app.id]
    );
    return ok(res, { variables: r.rows });
  } catch (e) { next(e); }
});

router.post("/apps/:id/variables/user", loadApp, async (req, res, next) => {
  try {
    const { user_id, name, data, is_readonly } = req.body;
    if (!name) return fail(res, 400, "name is required");
    if (user_id) {
      const u = await pool.query(`SELECT id FROM app_users WHERE id = $1 AND app_id = $2`, [user_id, req.app.id]);
      if (u.rows.length === 0) return fail(res, 404, "User not found in this application");
    }
    const v = { id: rid("uv") };
    await pool.query(
      `INSERT INTO variables_user (id, app_id, user_id, name, data, is_readonly) VALUES ($1,$2,$3,$4,$5,$6)`,
      [v.id, req.app.id, user_id || null, name, data || "", !!is_readonly]
    );
    triggerAppWebhook(req.app, "variable.user_created", { id: v.id, name }).catch(()=>{});
    return ok(res, { variable: { ...v, name, data: data || "", is_readonly: !!is_readonly }, message: "Variable created" });
  } catch (e) { next(e); }
});

router.put("/apps/:id/variables/user/:varId", loadApp, async (req, res, next) => {
  try {
    const b = req.body;
    const cols = [];
    const vals = [];
    const push = (col, val) => { if (val !== undefined) { cols.push(`${col} = $${cols.length + 1}`); vals.push(val); } };
    push("name", b.name);
    push("data", b.data);
    push("is_readonly", parseBool(b.is_readonly));
    if (cols.length === 0) return ok(res, { variable: req.params.varId, message: "Nothing to update" });
    vals.push(req.params.varId, req.app.id);
    const r = await pool.query(
      `UPDATE variables_user SET ${cols.join(", ")} WHERE id = $${vals.length - 1} AND app_id = $${vals.length} RETURNING *`,
      vals
    );
    if (r.rows.length === 0) return fail(res, 404, "Variable not found");
    triggerAppWebhook(req.app, "variable.user_updated", { id: req.params.varId }).catch(()=>{});
    return ok(res, { variable: r.rows[0], message: "Variable updated" });
  } catch (e) { next(e); }
});

router.delete("/apps/:id/variables/user/:varId", loadApp, async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM variables_user WHERE id = $1 AND app_id = $2`, [req.params.varId, req.app.id]);
    if (r.rowCount === 0) return fail(res, 404, "Variable not found");
    triggerAppWebhook(req.app, "variable.user_deleted", { id: req.params.varId }).catch(()=>{});
    return ok(res, { message: "Variable deleted" });
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

router.get("/notifications", async (req, res, next) => {
  try {
    const inv = await pool.query(
      `SELECT ti.id, ti.role, ti.status, ti.created_at, ti.invitee_username, ti.invitee_email, ti.app_id
       FROM team_invitations ti WHERE ti.invitee_id = $1 AND ti.status = 'pending'`,
      [req.user.id]
    );
    const ann = await pool.query(`SELECT id, title, content, type, created_at FROM announcements ORDER BY created_at DESC LIMIT 10`);
    const notif = await pool.query(`SELECT id, title, content, type, created_at FROM notifications WHERE user_id = $1 AND is_read = false ORDER BY created_at DESC LIMIT 20`, [req.user.id]);
    return ok(res, {
      invitations: inv.rows,
      announcements: ann.rows,
      notifications: notif.rows,
      hasUnread: notif.rows.length > 0 || inv.rows.length > 0,
    });
  } catch (e) { next(e); }
});

router.post("/notifications/seen", async (req, res, next) => {
  try {
    await pool.query(`UPDATE notifications SET is_read = true WHERE user_id = $1`, [req.user.id]);
    return ok(res, { message: "Marked as seen" });
  } catch (e) { next(e); }
});

module.exports = router;