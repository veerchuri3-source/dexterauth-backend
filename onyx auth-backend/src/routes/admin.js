const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireAdmin, sanitizeUser, invalidateUserCache } = require("../middleware/auth");
const { ok, fail } = require("../utils/responses");
const { audit } = require("../services/audit");
const { rid } = require("../utils/helpers");

const router = express.Router();
router.use(requireAuth, requireAdmin());

const PUBLIC_USER_FIELDS = `
  id, username, email, display_name, avatar_url, banner_url, bio, badges,
  role, plan, plan_expires_at, is_verified, is_unlimited_reseller,
  allowed_license_levels, balance_day, balance_week, balance_month,
  balance_three_month, balance_six_month, balance_year, balance_lifetime,
  is_paused, is_2fa_enabled, last_login_at, created_at
`;

async function getTarget(req, res) {
  const id = req.params.id;
  const r = await pool.query(`SELECT ${PUBLIC_USER_FIELDS}, is_paused, token_version FROM users WHERE id = $1 OR username = $1`, [id]);
  if (r.rows.length === 0) {
    fail(res, 404, "User not found");
    return null;
  }
  return sanitizeUser(r.rows[0]);
}

router.get("/overview", async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 200);
    const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);
    const search = req.query.search ? `%${req.query.search}%` : null;
    const plan = req.query.plan || null;

    const where = [];
    const vals = [];
    if (search) { vals.push(search, search); where.push(`(LOWER(username) LIKE LOWER($${vals.length - 1}) OR LOWER(email) LIKE LOWER($${vals.length}))`); }
    if (plan) { vals.push(plan); where.push(`plan = $${vals.length}`); }
    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

    const [users, totals] = await Promise.all([
      pool.query(
        `SELECT ${PUBLIC_USER_FIELDS}, (SELECT count(*)::int FROM apps a WHERE a.owner_id = u.id) AS app_count,
                (SELECT count(*)::int FROM team_members tm WHERE tm.owner_id = u.id) AS team_count
         FROM users u ${whereSql} ORDER BY u.created_at DESC LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}`,
        [...vals, limit, offset]
      ),
      pool.query(
        `SELECT count(*)::int AS total,
                (SELECT count(*)::int FROM users WHERE is_paused = true) AS paused,
                (SELECT count(*)::int FROM users WHERE plan = 'Free') AS free,
                (SELECT count(*)::int FROM users WHERE plan != 'Free') AS paid,
                (SELECT count(*)::int FROM apps) AS apps,
                (SELECT count(*)::int FROM app_users) AS end_users,
                (SELECT count(*)::int FROM licenses) AS licenses
         FROM users u ${whereSql}`,
        vals
      ),
    ]);
    return ok(res, {
      users: users.rows.map(sanitizeUser),
      total: totals.rows[0].total,
      stats: totals.rows[0],
      limit,
      offset,
    });
  } catch (e) { next(e); }
});

router.get("/:id/team", async (req, res, next) => {
  try {
    const t = await getTarget(req, res);
    if (!t) return;
    const r = await pool.query(
      `SELECT tm.id, tm.username, tm.email, tm.role, tm.status, tm.created_at, tm.expires_at,
              tm.balance_day, tm.balance_week, tm.balance_month, tm.balance_three_month,
              tm.balance_six_month, tm.balance_year, tm.balance_lifetime, tm.allowed_license_levels
       FROM team_members tm WHERE tm.owner_id = $1`,
      [t.id]
    );
    return ok(res, { team: r.rows });
  } catch (e) { next(e); }
});

router.post("/:id/pause", async (req, res, next) => {
  try {
    const t = await getTarget(req, res);
    if (!t) return;
    if (t.role === "master_admin") return fail(res, 403, "Cannot pause a master admin");
    await pool.query(`UPDATE users SET is_paused = true WHERE id = $1`, [t.id]);
    await pool.query(`DELETE FROM user_sessions WHERE user_id = $1`, [t.id]);
    invalidateUserCache(t.id);
    await audit({ actorType: "admin", actorId: req.user.id, action: "user.paused", details: { targetId: t.id } });
    return ok(res, { message: `${t.username} paused` });
  } catch (e) { next(e); }
});

router.post("/:id/resume", async (req, res, next) => {
  try {
    const t = await getTarget(req, res);
    if (!t) return;
    await pool.query(`UPDATE users SET is_paused = false WHERE id = $1`, [t.id]);
    invalidateUserCache(t.id);
    await audit({ actorType: "admin", actorId: req.user.id, action: "user.resumed", details: { targetId: t.id } });
    return ok(res, { message: `${t.username} resumed` });
  } catch (e) { next(e); }
});

router.put("/:id/role", async (req, res, next) => {
  try {
    const t = await getTarget(req, res);
    if (!t) return;
    if (t.role === "master_admin") return fail(res, 403, "Cannot modify a master admin");
    const { role, plan, badges, plan_expires_at } = req.body;
    if (!role || !["user", "manager", "reseller", "admin"].includes(role)) return fail(res, 400, "Invalid role");
    // NOTE: role/plan/badge changes must NOT bump token_version — that would
    // invalidate the user's live sessions and log them out (auth.js compares
    // token_version on every request). Sessions re-read role/plan from the DB,
    // so the new permissions apply immediately without re-login. Only password
    // changes bump token_version (dev.js password reset).
    // Explicit null clears the expiry (lifetime); an absent key keeps the old value.
    const explicitExpiry = Object.prototype.hasOwnProperty.call(req.body, "plan_expires_at");
    await pool.query(
      `UPDATE users SET role = $2, plan = COALESCE($3, plan), badges = COALESCE($4::jsonb, badges),
                        plan_expires_at = ${explicitExpiry ? "$5" : "COALESCE($5, plan_expires_at)"}
       WHERE id = $1`,
       [t.id, role, plan || null, badges ? JSON.stringify(badges) : null, plan_expires_at ? new Date(plan_expires_at).getTime() : null]
    );
    invalidateUserCache(t.id);
    await audit({ actorType: "admin", actorId: req.user.id, action: "user.role.updated", details: { targetId: t.id, role, plan } });
    return ok(res, { message: `${t.username} updated to ${role}` });
  } catch (e) { next(e); }
});

router.delete("/:id/wipe", async (req, res, next) => {
  try {
    const t = await getTarget(req, res);
    if (!t) return;
    if (t.role === "master_admin") return fail(res, 403, "Cannot wipe a master admin");
    await pool.query(`DELETE FROM users WHERE id = $1`, [t.id]);
    invalidateUserCache(t.id);
    await audit({ actorType: "admin", actorId: req.user.id, action: "user.wiped", details: { targetId: t.id } });
    return ok(res, { message: `${t.username} wiped` });
  } catch (e) { next(e); }
});

router.post("/:id/impersonate", async (req, res, next) => {
  try {
    const t = await getTarget(req, res);
    if (!t) return;
    if (t.role === "master_admin" && t.id !== req.user.id) return fail(res, 403, "Cannot impersonate a master admin");
    await audit({ actorType: "admin", actorId: req.user.id, action: "user.impersonated", details: { targetId: t.id } });
    return ok(res, { message: "Impersonation session created", user: t });
  } catch (e) { next(e); }
});

router.post("/cloudflare/link", async (req, res, next) => {
  try {
    const { token, domain, targetIp, targetPort } = req.body;
    if (!token || !domain || !targetIp) return fail(res, 400, "token, domain, targetIp are required");
    await pool.query(
      `INSERT INTO platform_settings (key, value) VALUES ('cloudflare', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [JSON.stringify({ token, domain, targetIp, targetPort, linked_at: new Date().toISOString() })]
    );
    await audit({ actorType: "admin", actorId: req.user.id, action: "cloudflare.linked", details: { domain } });
    return ok(res, { message: "Cloudflare tunnel linked", domain });
  } catch (e) { next(e); }
});

router.post("/cloudflare/unlink", async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM platform_settings WHERE key = 'cloudflare'`);
    return ok(res, { message: "Cloudflare tunnel unlinked" });
  } catch (e) { next(e); }
});

router.get("/settings", async (req, res, next) => {
  try {
    const r = await pool.query(`SELECT key, value FROM platform_settings`);
    const out = {};
    for (const row of r.rows) {
      try { out[row.key] = JSON.parse(row.value); } catch { out[row.key] = row.value; }
    }
    return ok(res, { settings: out });
  } catch (e) { next(e); }
});

router.post("/settings", async (req, res, next) => {
  try {
    const b = req.body;
    for (const [key, value] of Object.entries(b)) {
      await pool.query(
        `INSERT INTO platform_settings (key, value) VALUES ($1,$2)
         ON CONFLICT (key) DO UPDATE SET value = $2`,
        [key, typeof value === "string" ? value : JSON.stringify(value)]
      );
    }
    await audit({ actorType: "admin", actorId: req.user.id, action: "settings.updated", details: { keys: Object.keys(b) } });
    return ok(res, { message: "Settings updated" });
  } catch (e) { next(e); }
});

router.post("/announcements", async (req, res, next) => {
  try {
    const { title, content, type } = req.body;
    if (!title || !content) return fail(res, 400, "title and content are required");
    const id = rid("ann");
    await pool.query(`INSERT INTO announcements (id, title, content, type) VALUES ($1,$2,$3,$4)`, [id, title, content, type || "info"]);
    return ok(res, { announcement: { id, title, content, type: type || "info" }, message: "Announcement created" });
  } catch (e) { next(e); }
});

router.delete("/announcements/:id", async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM announcements WHERE id = $1`, [req.params.id]);
    if (r.rowCount === 0) return fail(res, 404, "Announcement not found");
    return ok(res, { message: "Announcement deleted" });
  } catch (e) { next(e); }
});

router.get("/changelog", async (req, res, next) => {
  try {
    const r = await pool.query(`SELECT id, version, title, content, date FROM changelog_entries ORDER BY date DESC`);
    return ok(res, { entries: r.rows });
  } catch (e) { next(e); }
});

router.post("/changelog", async (req, res, next) => {
  try {
    const { version, title, content } = req.body;
    if (!version || !title || !content) return fail(res, 400, "version, title and content are required");
    const id = rid("cl");
    await pool.query(`INSERT INTO changelog_entries (id, version, title, content) VALUES ($1,$2,$3,$4)`, [id, version, title, content]);
    return ok(res, { entry: { id, version, title, content, date: new Date().toISOString() }, message: "Changelog entry created" });
  } catch (e) { next(e); }
});

router.put("/changelog/:id", async (req, res, next) => {
  try {
    const b = req.body;
    const cols = [];
    const vals = [];
    const push = (col, val) => { if (val !== undefined) { cols.push(`${col} = $${cols.length + 1}`); vals.push(val); } };
    push("version", b.version);
    push("title", b.title);
    push("content", b.content);
    if (cols.length === 0) return ok(res, { entry: req.params.id, message: "Nothing to update" });
    vals.push(req.params.id);
    const r = await pool.query(`UPDATE changelog_entries SET ${cols.join(", ")} WHERE id = $${vals.length} RETURNING *`, vals);
    if (r.rows.length === 0) return fail(res, 404, "Entry not found");
    return ok(res, { entry: r.rows[0], message: "Entry updated" });
  } catch (e) { next(e); }
});

router.delete("/changelog/:id", async (req, res, next) => {
  try {
    const r = await pool.query(`DELETE FROM changelog_entries WHERE id = $1`, [req.params.id]);
    if (r.rowCount === 0) return fail(res, 404, "Entry not found");
    return ok(res, { message: "Entry deleted" });
  } catch (e) { next(e); }
});

module.exports = router;