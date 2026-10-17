/**
 * Pterodactyl / Orihost bootstrap helper
 * Ensures TypeScript is compiled before launching the bot.
 * Use this file as MAIN_FILE=bootstrap.js if `dist/index.js` is missing
 * (e.g. when dist/ is gitignored and postinstall hasn't run).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distEntry = path.join(__dirname, 'dist', 'index.js');

if (!fs.existsSync(distEntry)) {
  console.log('[BOOTSTRAP] dist/index.js not found — compiling TypeScript (npm run build)...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
  } catch (e) {
    console.error('[BOOTSTRAP] npm run build failed, trying npx tsc fallback...');
    try {
      execSync('npx tsc', { stdio: 'inherit' });
    } catch (e2) {
      console.error('[BOOTSTRAP] Fallback build also failed:', e2.message);
    }
  }

  if (!fs.existsSync(distEntry)) {
    console.error('[BOOTSTRAP] ERROR: dist/index.js still missing after build. Check build logs above.');
    console.error('[BOOTSTRAP] Hint for Pterodactyl: Set Startup Command to "npm install && npm run build && node dist/index.js" or ensure MAIN_FILE=dist/index.js and that "npm install" triggers postinstall build.');
    process.exit(1);
  }
  console.log('[BOOTSTRAP] Build complete — launching bot...');
}

require(distEntry);
