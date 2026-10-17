#!/bin/bash
# Recommended Pterodactyl/Orihost Startup Command for DexterAuth Discord Bot
# Paste this into your Panel → Startup → Startup Command
#
# This auto-handles:
#  - optional git pull (if GIT_ADDRESS/BRANCH vars are set)
#  - npm install + TypeScript build (postinstall handles it)
#  - correct entry point regardless of MAIN_FILE
#
# If you prefer to use the default NodeJS egg command, you MUST set:
#   MAIN_FILE=dist/index.js   (or bootstrap.js)
# and leave this file unused.

set -e

echo "=== DexterAuth Bot Startup ==="

# 1) Optional git operations (only if vars supplied — mirrors default egg behaviour)
missing=""
[[ -z "${GIT_ADDRESS}" ]] && missing+="GIT_ADDRESS "
[[ -z "${BRANCH}" ]] && missing+="BRANCH "
[[ -z "${USERNAME}" ]] && missing+="USERNAME "
[[ -z "${ACCESS_TOKEN}" ]] && missing+="ACCESS_TOKEN "
if [[ -z "$missing" ]]; then
  AUTH_GIT_URL="https://${USERNAME}:${ACCESS_TOKEN}@${GIT_ADDRESS#https://}"
  if [[ ! -d .git ]]; then
    echo "[GIT] Cloning ${BRANCH} from ${GIT_ADDRESS}"
    git clone --branch "${BRANCH}" "${AUTH_GIT_URL}" . || { echo "[GIT] Clone failed"; exit 1; }
  elif [[ "${AUTO_UPDATE}" == "1" ]]; then
    echo "[GIT] Pulling latest ${BRANCH}"
    git pull origin "${BRANCH}"
  fi
else
  echo "[GIT] Skipping git operations (missing: $missing) — using uploaded files via SFTP"
fi

# 2) Install deps (postinstall will run `npm run build` → creates dist/)
if [[ -f /home/container/package.json ]]; then
  echo "[NPM] Installing dependencies..."
  /usr/local/bin/npm install
fi

# 3) Ensure dist exists (fallback if postinstall didn't run e.g. --omit=dev)
if [[ ! -f /home/container/dist/index.js ]]; then
  echo "[BUILD] dist/index.js missing — running tsc..."
  /usr/local/bin/npx tsc || /usr/local/bin/npm run build
fi

# 4) Launch
if [[ -f /home/container/dist/index.js ]]; then
  echo "[START] Launching bot: node dist/index.js"
  exec /usr/local/bin/node /home/container/dist/index.js
elif [[ -f /home/container/bootstrap.js ]]; then
  echo "[START] Fallback: node bootstrap.js"
  exec /usr/local/bin/node /home/container/bootstrap.js
else
  echo "[ERROR] No entry found. Set MAIN_FILE=dist/index.js or use this startup script."
  exit 1
fi
