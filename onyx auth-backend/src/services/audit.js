const pool = require("../db/pool");
const { rid } = require("../utils/helpers");

async function audit({ appId, actorType = "client", actorId, action, details = {}, ip }) {
  try {
    await pool.query(
      `INSERT INTO audit_log (id, app_id, actor_type, actor_id, action, details, ip)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [rid("aud"), appId || null, actorType, actorId || null, action, JSON.stringify(details), ip || null]
    );
  } catch (e) {
    console.error("[audit] write failed:", e.message);
  }
}

module.exports = { audit };