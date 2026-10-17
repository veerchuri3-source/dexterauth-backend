const pool = require("../db/pool");
const { verifyToken } = require("../services/jwt");
const { fail } = require("../utils/responses");
const config = require("../config");

const PUBLIC_USER_FIELDS = `
  id, username, email, display_name, avatar_url, banner_url, bio, badges,
  role, plan, plan_expires_at, is_verified, is_unlimited_reseller,
  allowed_license_levels, balance_day, balance_week, balance_month,
  balance_three_month, balance_six_month, balance_year, balance_lifetime,
  is_paused, is_2fa_enabled, last_login_at, created_at
 `;

const appCache = new Map(); // appId -> { app, ts }
const APP_CACHE_TTL = 30000;
function invalidateAppCache(appId) { if (appId) appCache.delete(appId); }
function setAppCache(appId, app) { if (appId && app) appCache.set(appId, { app, ts: Date.now() }); }

const authCache = new Map(); // jti -> { user, sessionId, expires_at, ts }
const AUTH_CACHE_TTL = 30000;

// Drop cached auth entries for a user so role/plan/pause/delete/logout
// changes apply on their very next request instead of after AUTH_CACHE_TTL.
function invalidateUserCache(userId) {
  if (!userId) return;
  for (const [jti, entry] of authCache) {
    try {
      if (entry && entry.user && entry.user.id === userId) authCache.delete(jti);
    } catch { /* ignore */ }
  }
}

async function requireAuth(req, res, next) {
  // ── Discord Bot auth (x-discord-id + x-discord-secret) ───────────────
  // The self-hosted Discord bot authenticates with the dashboard's
  // bot_secret (dex_...) rather than a JWT. If those headers are present
  // we verify them against discord_links and attach req.user directly.
  const discordId = req.headers["x-discord-id"] || req.headers["x-discord_id"];
  const discordSecret = req.headers["x-discord-secret"] || req.headers["x-discord_secret"];
  const botToken = req.headers["x-bot-token"] || req.headers["x-bot_token"];
  if (discordId && discordSecret) {
    // Optional extra check: if DISCORD_BOT_TOKEN is configured, enforce it
    if (config.discord.botToken && botToken && botToken !== config.discord.botToken) {
      return fail(res, 401, "Invalid bot token");
    }
    try {
      const link = await pool.query(
        `SELECT * FROM discord_links WHERE discord_id = $1 AND bot_secret = $2`,
        [String(discordId), String(discordSecret)]
      );
      if (link.rows.length === 0) {
        return fail(res, 401, "Invalid Discord credentials. Make sure you have linked your Discord account under the dashboard Profile settings first.");
      }
      const userRes = await pool.query(
        `SELECT ${PUBLIC_USER_FIELDS}, token_version FROM users WHERE id = $1`,
        [link.rows[0].user_id]
      );
      if (userRes.rows.length === 0) return fail(res, 401, "Account not found");
      const u = userRes.rows[0];
      if (u.is_paused) return fail(res, 403, "Your account is paused. Contact support.");
      req.user = u;
      req.discordLink = link.rows[0];
      // No sessionId for bot auth — some routes don't need it
      return next();
    } catch (e) {
      console.error("[auth] discord bot auth error:", e.message);
      return fail(res, 500, "Discord authentication failed");
    }
  }

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return fail(res, 401, "Authentication required");

  const payload = verifyToken(token);
  if (!payload) return fail(res, 401, "Invalid or expired token");

  // Fast path: cached auth (avoids 2 DB round-trips)
  const cachedAuth = authCache.get(payload.jti);
  if (cachedAuth && Date.now() - cachedAuth.ts < AUTH_CACHE_TTL) {
    if (new Date(cachedAuth.expires_at) < new Date()) return fail(res, 401, "Session expired");
    if (cachedAuth.user.is_paused) return fail(res, 403, "Your account is paused. Contact support.");
    if (cachedAuth.user.token_version !== (payload.tokv || 0)) return fail(res, 401, "Session invalidated");
    req.user = cachedAuth.user;
    req.sessionId = cachedAuth.sessionId;
    return next();
  }
  try {
    const session = await pool.query(
      `SELECT s.id, s.expires_at FROM user_sessions s WHERE s.jti = $1`,
      [payload.jti]
    );
    if (session.rows.length === 0) return fail(res, 401, "Session revoked");
    if (new Date(session.rows[0].expires_at) < new Date()) return fail(res, 401, "Session expired");

    const user = await pool.query(
      `SELECT ${PUBLIC_USER_FIELDS}, token_version FROM users WHERE id = $1`,
      [payload.sub]
    );
    if (user.rows.length === 0) return fail(res, 401, "Account not found");
    const u = user.rows[0];
    if (u.is_paused) return fail(res, 403, "Your account is paused. Contact support.");
    if (u.token_version !== (payload.tokv || 0)) return fail(res, 401, "Session invalidated");

    authCache.set(payload.jti, { user: u, sessionId: session.rows[0].id, expires_at: session.rows[0].expires_at, ts: Date.now() });
    req.user = u;
    req.sessionId = session.rows[0].id;
    next();
  } catch (e) {
    return fail(res, 500, "Authentication failed");
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return fail(res, 401, "Authentication required");
    if (!roles.includes(req.user.role)) return fail(res, 403, "Insufficient permissions");
    next();
  };
}

function requireAdmin() {
  return requireRole("admin", "master_admin");
}

/**
 * Load the app and verify the authenticated user has access to it
 * (owner, or team member). Sets req.app.
 */
async function loadApp(req, res, next) {
  const raw =
    req.params.appId ||
    req.params.app_id ||
    req.query.appId ||
    req.query.app_id ||
    (req.body && (req.body.appId || req.body.app_id)) ||
    req.headers["x-app-id"] ||
    req.headers["x-appid"];
  // Legacy fallback: /apps/:id where :id IS the app id (e.g. GET /apps/app_xxx).
  // We must NOT treat params.id as appId for routes like /licenses/:id where
  // :id is a license/user/token id — those would then fail with "Application
  // not found". Only accept params.id when it looks like an app id.
  const fallbackId = req.params.id;
  const appIdCandidate = raw || (fallbackId && String(fallbackId).startsWith("app_") ? fallbackId : null);
  let appId = appIdCandidate && String(appIdCandidate).trim();
  // Fallback: derive appId from the resource itself when the frontend deletes
  // e.g. DELETE /licenses/lic_xxx or DELETE /users/usr_xxx without ?appId=.
  // This is why deletes were showing "appId is required".
  if (!appId || appId === "undefined" || appId === "null" || appId === "") {
    const rid = req.params.id || req.params.userId || req.params.hashId || req.params.fileId || req.params.varId || req.params.tokenId;
    if (rid) {
      try {
        // Try each table that holds an app_id FK; first hit wins.
        const lookups = [
          ["SELECT app_id FROM licenses WHERE id = $1", rid],
          ["SELECT app_id FROM app_users WHERE id = $1", rid],
          ["SELECT app_id FROM tokens WHERE id = $1", rid],
          ["SELECT app_id FROM subscriptions WHERE id = $1", rid],
          ["SELECT app_id FROM sessions WHERE id = $1", rid],
          ["SELECT app_id FROM files WHERE id = $1", rid],
          ["SELECT app_id FROM hashes WHERE id = $1", rid],
          ["SELECT app_id FROM variables_global WHERE id = $1", rid],
          ["SELECT app_id FROM variables_user WHERE id = $1", rid],
          ["SELECT app_id FROM chat_messages WHERE id = $1", rid],
        ];
        // Special case: userId param for /users/:userId routes
        if (req.params.userId) lookups.unshift(["SELECT app_id FROM app_users WHERE id = $1", req.params.userId]);
        for (const [sql, param] of lookups) {
          try {
            const r = await pool.query(sql, [param]);
            if (r.rows.length > 0 && r.rows[0].app_id) { appId = r.rows[0].app_id; break; }
          } catch {}
        }
        // Also check by email/username lookups are not needed
      } catch {}
    }
  }
  if (!appId || appId === "undefined" || appId === "null" || appId === "") {
    return fail(res, 400, "appId is required — create or select an application first.");
  }
  try {
    let a = null;
    const cached = appCache.get(appId);
    if (cached && Date.now() - cached.ts < APP_CACHE_TTL) {
      a = cached.app;
      // console.log(`[appCache] HIT ${appId}`);
    } else {
      // console.log(`[appCache] MISS ${appId}`);
      const appRes = await pool.query(
        `SELECT a.*, s.webhook_url, s.webhook_username, s.webhook_avatar, s.discord_channel_id,
                s.min_hwid_length, s.hwid_reset_cooldown_unit, s.hwid_reset_cooldown_duration,
                s.min_username_length, s.min_password_length, s.max_hwids_per_user,
                s.allow_registration, s.license_only, s.allow_customer_panel
         FROM apps a LEFT JOIN app_settings s ON s.app_id = a.id WHERE a.id = $1`,
        [appId]
      );
      if (appRes.rows.length === 0) return fail(res, 404, "Application not found");
      a = appRes.rows[0];
      appCache.set(appId, { app: a, ts: Date.now() });
    }
    if (req.user.role === "master_admin") {
      req.app = a;
      return next();
    }
    if (a.owner_id === req.user.id) {
      req.app = a;
      return next();
    }
    const member = await pool.query(
      `SELECT role FROM team_members WHERE owner_id = $1 AND member_id = $2 AND status = 'active'`,
      [a.owner_id, req.user.id]
    );
    if (member.rows.length === 0) return fail(res, 403, "You do not have access to this application");
    req.teamRole = member.rows[0].role;
    req.app = a;
    next();
  } catch (e) {
    return fail(res, 500, "Failed to load application");
  }
}

/**
 * pg returns BIGINT columns as strings; the frontend expects numbers
 * (plan_expires_at is epoch ms, e.g. new Date(user.plan_expires_at)).
 */
function sanitizeUser(user) {
  if (!user) return user;
  const u = { ...user };
  if (u.plan_expires_at !== undefined && u.plan_expires_at !== null) u.plan_expires_at = Number(u.plan_expires_at);
  return u;
}

module.exports = { requireAuth, requireRole, requireAdmin, loadApp, invalidateAppCache, setAppCache, invalidateUserCache, PUBLIC_USER_FIELDS, sanitizeUser };