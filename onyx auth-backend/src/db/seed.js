const bcrypt = require("bcryptjs");
const pool = require("./pool");
const config = require("../config");

const now = Math.floor(Date.now() / 1000);
const iso = (sec) => new Date(sec * 1000).toISOString();
const rid = (p) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

async function seed() {
  if (!config.seedDemo) {
    console.log("[seed] SEED_DEMO disabled, skipping");
    return;
  }
  const { rowCount } = await pool.query("SELECT 1 FROM users LIMIT 1");
  if (rowCount > 0) {
    console.log("[seed] users already exist, skipping");
    return;
  }
  console.log("[seed] seeding demo data...");

  const hash = (pw) => bcrypt.hashSync(pw, 10);

  const demo = { id: "usr_demo001", username: "DemoDev", email: "demo@authlx.local", password_hash: hash("DemoDev123!"), display_name: "Demo Developer", role: "admin", plan: "PRO", bio: "Demo account on local AuthLX backend", is_verified: true, is_unlimited_reseller: true, allowed_license_levels: "all", balance_day: 2500, balance_week: 12000, balance_month: 50000, balance_three_month: 150000, balance_six_month: 300000, balance_year: 600000, balance_lifetime: 999999, plan_expires_at: now + 2592000 };
  const mgr = { id: "usr_demo002", username: "ManagerX", email: "mgr@authlx.local", password_hash: hash("ManagerX123!"), display_name: "Manager X", role: "manager", plan: "Developer", is_verified: true, balance_day: 500, balance_week: 2000, balance_month: 8000, balance_three_month: 24000, balance_six_month: 48000, balance_year: 96000, balance_lifetime: 0, plan_expires_at: now + 2592000 };
  const adm = { id: "usr_admin001", username: "AdminX", email: "admin@authlx.local", password_hash: hash("AdminX123!"), display_name: "Platform Admin", role: "master_admin", plan: "Enterprise", is_verified: true, is_unlimited_reseller: true, allowed_license_levels: "all", balance_lifetime: 99999999 };

  await pool.query(
    `INSERT INTO users (id, username, email, password_hash, display_name, role, plan, bio, is_verified, is_unlimited_reseller, allowed_license_levels, balance_day, balance_week, balance_month, balance_three_month, balance_six_month, balance_year, balance_lifetime, plan_expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
    [demo.id, demo.username, demo.email, demo.password_hash, demo.display_name, demo.role, demo.plan, demo.bio, demo.is_verified, demo.is_unlimited_reseller, demo.allowed_license_levels, demo.balance_day, demo.balance_week, demo.balance_month, demo.balance_three_month, demo.balance_six_month, demo.balance_year, demo.balance_lifetime, demo.plan_expires_at]
  );
  await pool.query(
    `INSERT INTO users (id, username, email, password_hash, display_name, role, plan, is_verified, balance_day, balance_week, balance_month, balance_three_month, balance_six_month, balance_year, balance_lifetime, plan_expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [mgr.id, mgr.username, mgr.email, mgr.password_hash, mgr.display_name, mgr.role, mgr.plan, mgr.is_verified, mgr.balance_day, mgr.balance_week, mgr.balance_month, mgr.balance_three_month, mgr.balance_six_month, mgr.balance_year, mgr.balance_lifetime, mgr.plan_expires_at]
  );
  await pool.query(
    `INSERT INTO users (id, username, email, password_hash, display_name, role, plan, is_verified, is_unlimited_reseller, allowed_license_levels, balance_lifetime)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [adm.id, adm.username, adm.email, adm.password_hash, adm.display_name, adm.role, adm.plan, adm.is_verified, adm.is_unlimited_reseller, adm.allowed_license_levels, adm.balance_lifetime]
  );

  const apps = [
    ["app_demo001", demo.id, "Demo Loader", "app_demo001", "sk_demo_secret_001", "1.0.0", true, "Sample application running against the local AuthLX backend", true, true, ""],
    ["app_demo002", demo.id, "Test Cheat", "app_demo002", "sk_demo_secret_002", "2.4.1", true, "Second sample app", true, false, ""],
    ["app_demo003", demo.id, "Paused App", "app_demo003", "sk_demo_secret_003", "0.9.0", false, "This app is paused", false, false, "https://webloader.demo.local/app"],
  ];
  for (const [id, owner, name, key, secret, version, status, desc, hwidLock, tv, webloader] of apps) {
    await pool.query(
      `INSERT INTO apps (id, owner_id, name, api_key, api_secret, version, status, description, hwid_lock, token_validation, webloader_link)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, owner, name, key, secret, version, status, desc, hwidLock, tv, webloader]
    );
    await pool.query(
      `INSERT INTO app_settings (app_id, min_hwid_length, hwid_reset_cooldown_unit, hwid_reset_cooldown_duration, min_username_length, min_password_length, max_hwids_per_user, allow_registration, license_only, allow_customer_panel)
       VALUES ($1, 8, 'Days', 7, 3, 6, 1, true, false, true) ON CONFLICT (app_id) DO NOTHING`,
      [id]
    );
  }

  const mkUser = (i) => ({
    id: `usr_${i}`,
    username: `User${i}`,
    email: `user${i}@demo.local`,
    password_hash: hash("UserPass123!"),
    status: i % 7 === 0 ? "banned" : "active",
    subscription_level: i % 5 === 0 ? "Pro" : "Default",
    hwid: i % 3 === 0 ? "" : `HWID-${i * 77}`,
    hwid_affected: i % 3 !== 0,
    is_banned: i % 7 === 0,
    ban_reason: i % 7 === 0 ? "Demo ban" : null,
    created_by: demo.id,
    created_at: iso(now - 86400 * i),
    expiration_date: iso(now + 86400 * (i + 5)),
    last_login_at: iso(now - 3600 * i),
    last_ip: `203.0.113.${(i % 250) + 1}`,
  });
  for (let i = 1; i <= 7; i++) {
    const u = mkUser(i);
    await pool.query(
      `INSERT INTO app_users (id, app_id, username, email, password_hash, status, subscription_level, hwid, hwid_affected, is_banned, ban_reason, created_by, created_at, expiration_date, last_login_at, last_ip)
       VALUES ($1,'app_demo001',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [u.id, u.username, u.email, u.password_hash, u.status, u.subscription_level, u.hwid, u.hwid_affected, u.is_banned, u.ban_reason, u.created_by, u.created_at, u.expiration_date, u.last_login_at, u.last_ip]
    );
  }

  const mkLic = (i) => [
    `lic_${i}`,
    "app_demo001",
    `AUTH-${String(i).padStart(4, "0")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    i % 2 === 0 ? "used" : "unused",
    demo.id,
    i % 3 === 0 ? "Demo note" : "",
    "1 Month(s)",
    2592000,
    i % 2 === 0 ? `usr_${i}` : null,
    i % 2 === 0 ? `HWID-${i * 77}` : null,
    i % 2 === 0 ? iso(now - 86400 * i) : null,
  ];
  for (let i = 1; i <= 6; i++) {
    const l = mkLic(i);
    await pool.query(
      `INSERT INTO licenses (id, app_id, key, status, created_by, note, duration, expiry_duration, used_by, used_on, used_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      l
    );
  }

  await pool.query(`INSERT INTO tokens (id, app_id, token_string, assigned_to, type, status, is_banned, ban_reason, created_at, last_used_at) VALUES
    ('tok1','app_demo001','authlx_xxxxxxxxxxxxxxxx','DemoDev','standalone','active',false,NULL,$1,$2),
    ('tok2','app_demo001','authlx_yyyyyyyyyyyyyyyy','Integration','standalone','banned',true,'Rotated',$3,NULL)`,
    [iso(now - 86400 * 3), iso(now - 3600), iso(now - 86400 * 40)]);

  await pool.query(`INSERT INTO subscriptions (id, app_id, name, level, status, price, duration_days, created_at) VALUES
    ('sub1','app_demo001','Default',0,'active',0,0,$1),
    ('sub2','app_demo001','Pro',1,'active',9.99,30,$2),
    ('sub3','app_demo001','Lifetime',2,'active',49.99,0,$3)`,
    [iso(now - 86400 * 30), iso(now - 86400 * 20), iso(now - 86400 * 10)]);

  await pool.query(`INSERT INTO sessions (id, app_id, user_id, token, ip, device, hwid, created_at, last_seen, expires_at) VALUES
    ('sess1','app_demo001','usr_1','sess_tok_1','203.0.113.7','Windows','HWID-77',$1,$2,$3),
    ('sess2','app_demo001','usr_2','sess_tok_2','198.51.100.4','Linux','HWID-154',$4,$5,$6),
    ('sess3','app_demo001','usr_3','sess_tok_3','192.0.2.44','Android','',$7,$8,$9)`,
    [iso(now - 7200), iso(now - 60), iso(now + 3600), iso(now - 5000), iso(now - 300), iso(now + 3600), iso(now - 9000), iso(now - 120), iso(now + 3600)]);

  await pool.query(`INSERT INTO team_members (id, owner_id, member_id, username, email, role, status, permissions, balance_day, balance_week, balance_month, balance_three_month, balance_six_month, balance_year, balance_lifetime, allowed_license_levels, created_at) VALUES
    ('tm1',$1,$1,'DemoDev','demo@authlx.local','Owner','active','{"all":true}'::jsonb,2500,12000,50000,150000,300000,600000,999999,'all',$2)`,
    [demo.id, iso(now - 86400 * 30)]);
  await pool.query(`INSERT INTO team_members (id, owner_id, member_id, username, email, role, status, permissions, balance_day, balance_week, balance_month, balance_three_month, balance_six_month, balance_year, balance_lifetime, allowed_license_levels, created_at) VALUES
    ('tm2',$1,$2,'ManagerX','mgr@authlx.local','Manager','active','{"all":false,"licenses":true,"users":true,"sessions":true}'::jsonb,500,2000,8000,24000,48000,96000,0,'1',$3)`,
    [demo.id, mgr.id, iso(now - 86400 * 10)]);

  await pool.query(`INSERT INTO variables_global (id, app_id, name, data, is_authenticated, created_at) VALUES
    ('gv1','app_demo001','welcome_message','Welcome to Demo Loader!',false,$1),
    ('gv2','app_demo001','announcement','Server maintenance on Sunday',true,$2)`,
    [iso(now - 86400 * 10), iso(now - 86400 * 2)]);

  await pool.query(`INSERT INTO variables_user (id, app_id, user_id, name, data, is_readonly, created_at) VALUES
    ('uv1','app_demo001','usr_1','theme','dark',false,$1),
    ('uv2','app_demo001','usr_2','settings','{"fps":60}',true,$2)`,
    [iso(now - 86400 * 5), iso(now - 86400 * 3)]);

  await pool.query(`INSERT INTO files (id, app_id, name, download_url, version_tag, is_latest_release, is_authenticated, tags, size, downloads, created_at) VALUES
    ('file1','app_demo001','loader.exe','https://cdn.demo.local/loader.exe','1.0.0',true,false,'["loader"]'::jsonb,5242880,1200,$1),
    ('file2','app_demo001','dll.zip','https://cdn.demo.local/dll.zip','2.4.1',true,true,'["dll"]'::jsonb,1048576,340,$2)`,
    [iso(now - 86400 * 20), iso(now - 86400 * 5)]);

  await pool.query(`INSERT INTO hashes (id, app_id, hash_value, created_at) VALUES
    ('hash1','app_demo001','sha256:3f2a1b9c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a',$1),
    ('hash2','app_demo001','sha256:9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7',$2)`,
    [iso(now - 86400 * 8), iso(now - 86400 * 3)]);

  await pool.query(`INSERT INTO chat_messages (id, app_id, sender_id, sender_username, sender_display_name, sender_role, sender_plan, content, created_at) VALUES
    ('msg1','app_demo001',$1,'DemoDev','Demo Developer','admin','PRO','Welcome to the team chat!',$2),
    ('msg2','app_demo001',$3,'ManagerX','Manager X','manager','Developer','Thanks! Demo environment is live.',$4)`,
    [demo.id, iso(now - 3600), mgr.id, iso(now - 1800)]);

  await pool.query(`INSERT INTO announcements (id, title, content, type, created_at) VALUES
    ('ann1','Welcome to AuthLX','This backend is running on PostgreSQL.','info',$1)`,
    [iso(now - 86400)]);

  await pool.query(`INSERT INTO changelog_entries (id, version, title, content, date) VALUES
    ('cl1','1.0.0','Initial release','PostgreSQL backend online. All systems operational.',$1),
    ('cl2','1.0.1','Demo data','Seeded demo applications, users and licenses.',$2)`,
    [iso(now - 86400 * 30), iso(now - 86400 * 10)]);

  await pool.query(`INSERT INTO notifications (id, user_id, title, content, type, is_read, created_at) VALUES
    ('n1',$1,'Account verified','Your developer account is active.','success',false,$2),
    ('n2',$1,'New application','Demo Loader was created successfully.','info',false,$3)`,
    [demo.id, iso(now - 86400 * 2), iso(now - 86400)]);

  await pool.query(`INSERT INTO payment_history (id, user_id, plan, amount, currency, status, method, created_at) VALUES
    ('pay1',$1,'PRO',19.99,'USD','completed','card',$2),
    ('pay2',$1,'PRO',19.99,'USD','completed','card',$3)`,
    [demo.id, iso(now - 86400 * 25), iso(now - 86400 * 55)]);

  await pool.query(`INSERT INTO platform_settings (key, value) VALUES
    ('public','{"linked":true,"registration_paused":false,"discord_invite":"https://discord.gg/demo","name":"AuthLX","version":"1.0.0"}'),
    ('stats','{"total_apps":4821,"total_users":142310,"total_licenses":512030,"total_online":937,"uptime":"99.9%"}'),
    ('announcements','[]') ON CONFLICT (key) DO NOTHING`);

  console.log("[seed] done");
  if (require.main === module) await pool.end();
}

if (require.main === module) {
  seed().catch((e) => {
    console.error("[seed] failed:", e.message);
    process.exit(1);
  });
}

module.exports = seed;