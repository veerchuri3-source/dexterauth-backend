const fs = require("fs");
const config = require("./config");
const migrate = require("./db/migrate");
const seed = require("./db/seed");
const { startPlanSweeper } = require("./services/planSweeper");

async function main() {
  fs.mkdirSync(config.uploadsDir, { recursive: true });
  await migrate();
  await seed();
  startPlanSweeper();
  const app = require("./app");
  app.listen(config.port, () => {
    console.log(`[authlx] backend listening on http://0.0.0.0:${config.port} (${config.env})`);
  });
}

main().catch((e) => {
  console.error("[authlx] startup failed:", e);
  process.exit(1);
});