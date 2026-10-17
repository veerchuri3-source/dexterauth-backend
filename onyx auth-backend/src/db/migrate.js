const fs = require("fs");
const path = require("path");
const pool = require("./pool");

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  console.log("[migrate] applying schema...");
  await pool.query(sql);
  await pool.query(
    `INSERT INTO migration_versions (version) VALUES (1)
     ON CONFLICT (version) DO NOTHING`
  );
  console.log("[migrate] done");
  if (require.main === module) await pool.end();
}

if (require.main === module) {
  migrate().catch((e) => {
    console.error("[migrate] failed:", e.message);
    process.exit(1);
  });
}

module.exports = migrate;