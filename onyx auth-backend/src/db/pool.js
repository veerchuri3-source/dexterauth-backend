const { Pool } = require("pg");
const config = require("../config");

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: parseInt(process.env.PG_POOL_MAX || "10", 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  options: "-c search_path=authlx",
  ssl: /sslmode=require|neon|\.cloud\./.test(config.databaseUrl)
    ? { rejectUnauthorized: false }
    : undefined,
});

pool.on("error", (err) => {
  console.error("[pg] idle client error", err.message);
});

// Keep Neon serverless warm: ping every 15s (fire-and-forget)
setInterval(() => {
  pool.query("SELECT 1").catch(()=>{});
}, 15000).unref();

module.exports = pool;