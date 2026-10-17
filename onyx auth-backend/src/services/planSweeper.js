/**
 * Plan expiry enforcement — makes the "auto-downgrade on expiry" promise real.
 * Every minute, accounts whose plan_expires_at has passed drop to Free.
 * master_admin accounts are never touched. Each downgrade is audit-logged.
 */
const pool = require("../db/pool");
const { audit } = require("./audit");

const SWEEP_INTERVAL_MS = 60 * 1000;

async function sweepExpiredPlans(now = Date.now()) {
  const r = await pool.query(
    `UPDATE users SET plan = 'Free', plan_expires_at = NULL
     WHERE role != 'master_admin' AND plan != 'Free'
       AND plan_expires_at IS NOT NULL AND plan_expires_at > 0 AND plan_expires_at <= $1
     RETURNING id, username, plan`,
    [now]
  );
  for (const u of r.rows) {
    await audit({ actorType: "system", actorId: u.id, action: "user.plan-downgraded", details: { username: u.username } });
  }
  if (r.rows.length > 0) console.log(`[plans] auto-downgraded ${r.rows.length} expired plan(s) to Free`);
  return r.rows.length;
}

function startPlanSweeper() {
  sweepExpiredPlans().catch((e) => console.error("[plans] sweep failed:", e.message));
  setInterval(() => sweepExpiredPlans().catch((e) => console.error("[plans] sweep failed:", e.message)), SWEEP_INTERVAL_MS).unref();
}

module.exports = { startPlanSweeper, sweepExpiredPlans, SWEEP_INTERVAL_MS };
