# DexterAuth Discord Bot Integration

The official, open-source Discord bot for managing the **DexterAuth** platform. This bot allows developers, admins, resellers, and managers to manage applications, licenses, users, subscriptions, and active client sessions directly from their Discord guild.

---

## 🛠️ Discord Developer Portal Setup

To deploy and self-host this bot, follow these configuration steps in the [Discord Developer Portal](https://discord.com/developers/applications):

### 1. Create a New Application
1. Click **New Application** and give it a name (e.g., `DexterAuth Manager`).
2. Go to the **General Information** tab and copy your **Application ID** (this is your `DISCORD_CLIENT_ID`).

### 2. Configure Bot User
1. Go to the **Bot** tab on the left sidebar.
2. Click **Add Bot**.
3. Under the bot name, copy the **Token** (this is your `DISCORD_TOKEN`). Keep this highly secure!
4. **Privileged Gateway Intents**: Enable **NONE** (this bot runs purely on slash commands and autocomplete interaction events, so it does not require message content or presence intents, maintaining low memory usage).

### 3. Generate Bot Invite Link
1. Go to the **OAuth2** tab, then select the **URL Generator** sub-menu.
2. Under **Scopes**, check:
   - `bot`
   - `applications.commands` (crucial for slash command registration)
3. Under **Bot Permissions**, check:
   - `Send Messages`
   - `Embed Links` (needed to render embed cards for user searches and stats)
4. Copy the generated URL at the bottom and open it in a browser to invite the bot to your Discord server.

---

## ⚙️ Local Configuration

1. Copy `example.env` to `.env`:
   ```bash
   cp example.env .env
   ```
2. Populate the parameters in `.env`:
   - `DISCORD_TOKEN`: Paste the bot token.
   - `DISCORD_CLIENT_ID`: Paste the application client ID.
   - `DISCORD_GUILD_ID`: (Optional) Paste the ID of your developer Discord server. This will register slash commands instantly to that specific server, bypassing the global 1-hour propagation delay.
   - `AUTH_API_URL`: Points to your hosted DexterAuth developer backend API (`https://dexterauth.com/api/v1/dev` by default).

---

## 🚀 Running the Bot

### Installation
Install node dependencies using npm:
```bash
npm install
```

### Development Mode (Local Live Reloading)
Runs the bot using `ts-node` directly:
```bash
npm run dev
```

### Production Build & Execution
`npm install` automatically runs `npm run build` via `postinstall` to generate `dist/` (required on hosts where `dist/` is gitignored). Manual build:
```bash
npm run build
```
```bash
npm start
```

### Pterodactyl / Orihost Deployment (Fix for `Cannot find module '/home/container/dist/index.js'`)
If you see:
```
Skipping git operations, missing variables: GIT_ADDRESS BRANCH USERNAME ACCESS_TOKEN
Error: Cannot find module '/home/container/dist/index.js'
MAIN_FILE is not set. Skipping execution.
```
You hit 3 host misconfigurations at once — fixed in this repo as of v1.0.0 postinstall:

**Root cause:** `dist/` is in `.gitignore` so Pterodactyl's `git clone` never fetches it, and the default NodeJS egg runs `npm install` but *never* `npm run build`. Without a build step `dist/index.js` doesn't exist → crash. Additionally `MAIN_FILE` was empty so the egg skips execution entirely. The fix is `postinstall: npm run build` + `typescript` in `dependencies` so `npm install` alone produces `dist/`.

**What to set in Pterodactyl Panel → Startup:**

| Variable | Value |
|---|---|
| `MAIN_FILE` | `dist/index.js` (or `bootstrap.js` as fallback) |
| `NODE_PACKAGES` / `UNNODE_PACKAGES` | leave empty |
| `GIT_ADDRESS` / `BRANCH` / `USERNAME` / `ACCESS_TOKEN` | Only if you deploy via Git — otherwise leave empty and upload files via SFTP |
| `AUTO_UPDATE` | `0` for SFTP upload, `1` if using Git |

**Option A — Keep default egg startup (recommended after this fix):**
1. Upload files via SFTP (or via Git with vars filled)
2. Set `MAIN_FILE=dist/index.js`
3. Restart. `npm install` will auto-build `dist/` via `postinstall` and the egg will run `node dist/index.js`.

**Option B — Use resilient bootstrap (works even if you forget to set MAIN_FILE):**
Set `MAIN_FILE=bootstrap.js` — `bootstrap.js:8` checks for `dist/index.js`, runs `npm run build` if missing, then launches the bot.

**Option C — Override Startup Command entirely (most explicit):**
In Panel → Startup → Startup Command, replace the long `missing=""...` line with:
```bash
npm install && npm run build && node dist/index.js
```
or for Git-enabled hosts, use `pterodactyl-egg-startup.sh:1` from this repo.

**Node version:** The egg was pulling `v25.9.0` (odd/unreleased). Switch your Docker Image to `ghcr.io/pterodactyl/yolks:nodejs_20` or `nodejs_22` — Discord.js `src/services/api.ts:1` requires `>=18.17.0` and LTS 20/22 is recommended.

**Environment:** Ensure a `.env` file exists in `/home/container` with `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `AUTH_API_URL`, etc. (copy `example.env:1`). The bot health server listens on `BOT_HEALTH_PORT` (default 3002) — expose it if using `BOT_HEALTH_URL`.

**Verify after fix:** After `npm install` on the host you should see `> dexterauth-discord-bot@1.0.0 build > tsc` in logs, and `/home/container/dist/index.js` should exist (`ls dist`).

---

## 📚 Bot Slash Commands

### 🔒 Authentication (DMs / Ephemeral Responses)
Before executing app or user commands, you must link your Discord profile with your DexterAuth account:
- `/link token:<your_dashboard_bot_secret>`: Maps your Discord ID to your dashboard secret token securely (ephemeral response hides token from chat logs).
- `/unlink`: Revokes access and deletes the local token association.

### 📊 Application Operations (`/app`)
- `/app create name:<str> [version:1.0.0]`: Creates a new application. (Requires App Management permission).
- `/app switch application:<select>`: Toggles the active application scope for your commands (has autocomplete support). Displays real-time role, balance, and permissions on switch.
- `/app status`: Shows real-time statistics (total users, active sessions, blacklists, licenses, subscriptions).
- `/app list`: Lists all applications available to you along with your role.
- `/app snapshot`: Displays a complete snapshot: settings, live stats, registered hashes, and bot permissions.
- `/app pause`: Pauses the active application (blocks user logins).
- `/app resume`: Resumes the active application (allows user logins).

### 🔑 License Management (`/license`)
- `/license generate [amount:1] [duration:30d] [level:1] [mask] [note]`: Generates product keys and prints them in chat.
- `/license list [filter:all/used/unused]`: Lists generated licenses for the active app.
- `/license ban key:<key>`: Bans a specific license key.
- `/license delete key:<key>`: Deletes a specific license key.

### 👤 Client User Management (`/user`)
- `/user view query:<username/email>`: Views full details of a user by username or email.
- `/user create username:<str> password:<str> [status:active/banned/paused] [level:1/2/3] [email] [duration:30d] [notes]`: Manually creates client accounts.
- `/user update username:<str> [new_password] [new_email] [status] [level] [notes]`: Updates user details.
- `/user resethwid username:<str>`: Resets user Hardware ID (HWID).
- `/user delete username:<str>`: Deletes client user account.

### 💳 Subscription Management (`/subscription`)
- `/subscription list`: Lists all subscription plans.
- `/subscription create name:<str> [level:1/2/3]`: Creates a new subscription plan (Admin only).
- `/subscription delete name:<str>`: Deletes a subscription plan by name (Admin only).

### 🟢 Session Management (`/session`)
- `/session list`: Lists all active client sessions (username, IP, device, ID).
- `/session kill session_id:<id>`: Terminates a specific active session.
- `/session killall`: Terminates all active sessions for the app.

### ⚙️ Application Settings (`/settings`)
- `/settings view`: Views current application settings and version.
- `/settings set [status] [hash_check] [force_hwid] [block_leaked_passwords] [min_username_length]`: Updates settings.
- `/settings version new_version:<str>`: Updates the required app version.
- `/settings hash-add hash:<str>`: Adds an integrity hash.
- `/settings hash-list`: Lists all registered integrity hashes.
- `/settings hash-delete hash_id:<id>`: Removes an integrity hash.
- `/settings hash-reset`: Removes all integrity hashes (Admin only).

### 👥 Team Inspection (`/team`)
- `/team view`: Read-only list displaying team members, roles, emails, and reseller balance limits.
