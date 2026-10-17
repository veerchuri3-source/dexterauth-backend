const { Client } = require("pg");
const c = new Client({
  connectionString: "postgresql://neondb_owner:npg_W8jbMAHV3enY@ep-quiet-darkness-ax6tarom.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require",
});
c.connect().then(async () => {
  await c.query(`UPDATE authlx.users SET plan='Free', plan_expires_at=0 WHERE username='admin'`);
  console.log("admin reset Free");
  await c.end();
}).catch((e) => { console.error(e.message); process.exit(1); });