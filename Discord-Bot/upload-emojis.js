const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');

const token = process.env.DISCORD_TOKEN?.trim();
const clientId = process.env.DISCORD_CLIENT_ID?.trim();
const guildId = process.env.DISCORD_GUILD_ID?.trim();

if (!token || !clientId) {
  console.error('❌ Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env');
  process.exit(1);
}

const assetsDir = path.join(__dirname, 'assets');
const emojiTsPath = path.join(__dirname, 'src/utils/emojis.ts');

// Map EMOJIS key -> file and animated flag (mirrors emojis.ts)
const emojiMap = {
  SUCCESS: { file: 'SUCCESS.png', animated: false },
  ERROR: { file: 'ERROR.png', animated: false },
  INFO: { file: 'INFO.png', animated: false },
  WARNING: { file: 'WARNING.png', animated: false },
  LOADING: { file: 'LOADING_animated.gif', animated: true },
  ACTIVE: { file: 'ACTIVE_animated.gif', animated: true },
  INACTIVE: { file: 'INACTIVE_animated.gif', animated: true },
  CROWN: { file: 'CROWN.png', animated: false },
  SHIELD: { file: 'SHIELD.png', animated: false },
  BOT: { file: 'BOT.png', animated: false },
  APP: { file: 'APP.png', animated: false },
  LICENSE: { file: 'LICENSE.png', animated: false },
  USER: { file: 'USER.png', animated: false },
  TEAM: { file: 'TEAM.png', animated: false },
  SETTINGS: { file: 'SETTINGS_animated.gif', animated: true },
  TRASH: { file: 'TRASH_animated.gif', animated: true },
  TAG: { file: 'TAG.png', animated: false },
  RESELLER: { file: 'RESELLER_animated.gif', animated: true },
  STORE: { file: 'STORE_animated.gif', animated: true },
  SESSIONS: { file: 'SESSIONS.png', animated: false },
  PLAN: { file: 'PLAN.png', animated: false },
  LOCK: { file: 'LOCK.png', animated: false },
  STATS: { file: 'STATS.png', animated: false },
  IP: { file: 'IP.png', animated: false },
  TIME: { file: 'TIME_animated.gif', animated: true },
  UNLIMITED: { file: 'UNLIMITED.png', animated: false },
  EMAIL: { file: 'EMAIL.png', animated: false },
  BALANCE: { file: 'BALANCE.png', animated: false },
  BULLET: { file: 'BULLET_animated.gif', animated: true },
  ARROW: { file: 'ARROW_animated.gif', animated: true },
  LINK: { file: 'LINK.png', animated: false },
};

async function discordRequest(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data, headers: res.headers };
}

async function getExistingApplicationEmojis() {
  const { ok, status, data } = await discordRequest('GET', `https://discord.com/api/v10/applications/${clientId}/emojis`);
  if (!ok) {
    console.warn(`⚠️ GET application emojis failed ${status}:`, JSON.stringify(data).slice(0,500));
    return null;
  }
  return data.items || data || [];
}

async function getExistingGuildEmojis() {
  if (!guildId) return null;
  const { ok, status, data } = await discordRequest('GET', `https://discord.com/api/v10/guilds/${guildId}/emojis`);
  if (!ok) {
    console.warn(`⚠️ GET guild emojis failed ${status}:`, JSON.stringify(data).slice(0,500));
    return null;
  }
  return Array.isArray(data) ? data : [];
}

async function upload() {
  console.log(`🔑 Token: ${token.slice(0,10)}... Client: ${clientId} Guild: ${guildId || 'none'}`);
  console.log(`📁 Assets: ${assetsDir}`);

  // Check files exist
  for (const [key, cfg] of Object.entries(emojiMap)) {
    const fp = path.join(assetsDir, cfg.file);
    if (!fs.existsSync(fp)) {
      console.error(`❌ Missing file for ${key}: ${cfg.file}`);
      process.exit(1);
    }
    const stat = fs.statSync(fp);
    if (stat.size > 256*1024) console.warn(`⚠️ ${cfg.file} >256KB (${stat.size}) may fail`);
  }

  // Try application emojis first (developer portal)
  let existing = await getExistingApplicationEmojis();
  let useGuild = false;
  let endpointBase;
  if (existing === null) {
    console.log('↪️ Application emojis not available, trying Guild endpoint...');
    existing = await getExistingGuildEmojis();
    if (existing === null) {
      console.error('❌ Neither application nor guild endpoint accessible. Check Bot token + Client ID + Guild ID + permissions (ManageEmojis).');
      process.exit(1);
    }
    useGuild = true;
    endpointBase = `https://discord.com/api/v10/guilds/${guildId}/emojis`;
    console.log(`✅ Using Guild emojis (${guildId}) – found ${existing.length} existing`);
  } else {
    endpointBase = `https://discord.com/api/v10/applications/${clientId}/emojis`;
    console.log(`✅ Using Application emojis (developer portal) – found ${existing.length} existing`);
  }

  const existingByName = new Map();
  for (const e of existing) {
    existingByName.set(e.name.toLowerCase(), e);
  }

  const results = {};

  for (const [key, cfg] of Object.entries(emojiMap)) {
    const name = key.toLowerCase(); // 2-32, alphanumeric + _
    const filePath = path.join(assetsDir, cfg.file);
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === '.gif' ? 'image/gif' : ext === '.png' ? 'image/png' : 'image/png';
    const b64 = buf.toString('base64');
    const image = `data:${mime};base64,${b64}`;

    let emojiId;
    let isAnimated = cfg.animated;

    const existingEmoji = existingByName.get(name);

    // If exists, delete first to allow re-upload (simpler than PATCH)
    if (existingEmoji) {
      console.log(`🗑️ Deleting existing ${name} (${existingEmoji.id})...`);
      const delUrl = `${endpointBase}/${existingEmoji.id}`;
      const del = await discordRequest('DELETE', delUrl);
      if (!del.ok && del.status !== 404) {
        console.warn(`⚠️ Delete ${name} failed ${del.status}:`, JSON.stringify(del.data).slice(0,300));
      } else {
        console.log(`   deleted`);
      }
      // small delay after delete
      await new Promise(r => setTimeout(r, 800));
    }

    console.log(`⬆️ Uploading ${key} -> ${name} (${cfg.file}, ${buf.length} bytes, animated=${isAnimated})...`);
    const payload = { name, image };
    const { ok, status, data } = await discordRequest('POST', endpointBase, payload);
    if (!ok) {
      console.error(`❌ Failed ${key} (${name}) ${status}:`, JSON.stringify(data, null, 2));
      // Try to continue, but store error
      results[key] = { error: `${status} ${JSON.stringify(data)}` };
      await new Promise(r => setTimeout(r, 1500));
      continue;
    }
    emojiId = data.id;
    // Discord may return animated flag based on image type, use our config
    isAnimated = data.animated ?? cfg.animated;
    console.log(`✅ ${key} -> ${isAnimated ? `<a:${name}:${emojiId}>` : `<:${name}:${emojiId}>`}`);

    results[key] = { id: emojiId, name, animated: isAnimated };

    // Rate limit delay
    await new Promise(r => setTimeout(r, 1200));

    // Refresh existing map to avoid duplicates in next loop if needed
    existingByName.set(name, { id: emojiId, name, animated: isAnimated });
  }

  // Build new emojis.ts
  let out = `/**
 * DexterAuth Discord Bot Emoji Configuration Map
 * Auto-generated by upload-emojis.js on ${new Date().toISOString()}
 * Source: assets/*.png/*.gif -> ${useGuild ? `Guild ${guildId}` : `Application ${clientId}`}
 * 
 * To replace with custom IDs manually: '<:name:id>' or '<a:name:id>'
 */
export const EMOJIS = {
`;

  const groups = [
    ['Status Indicators', ['SUCCESS','ERROR','INFO','WARNING','LOADING','ACTIVE','INACTIVE']],
    ['Roles and Permissions', ['CROWN','SHIELD']],
    ['Entities', ['BOT','APP','LICENSE','USER','TEAM','SETTINGS','TRASH','TAG','RESELLER','STORE','SESSIONS','PLAN','LOCK']],
    ['Metrics & Attributes', ['STATS','IP','TIME','UNLIMITED','EMAIL','BALANCE']],
    ['Formatting & Visuals', ['BULLET','ARROW','LINK']],
  ];

  for (const [title, keys] of groups) {
    out += `  // ${title}\n`;
    for (const k of keys) {
      const r = results[k];
      if (!r || r.error) {
        out += `  ${k}: '<:${k.toLowerCase()}:MISSING>', // ERROR: ${r?.error || 'unknown'}\n`;
      } else {
        const tag = r.animated ? `<a:${r.name}:${r.id}>` : `<:${r.name}:${r.id}>`;
        out += `  ${k}: '${tag}',\n`;
      }
    }
    out += `\n`;
  }
  out += `};
`;

  fs.writeFileSync(emojiTsPath, out, 'utf8');
  console.log(`\n📝 Updated ${emojiTsPath}`);
  console.log(out);

  console.log('\n🎉 Done. Restart bot: npm run build && npm start or pm2 restart');
  console.log('If any MISSING, check logs and re-run. Guild emojis need bot in guild with ManageEmojis; Application emojis need app owner token.');
}

upload().catch(e => { console.error(e); process.exit(1); });
