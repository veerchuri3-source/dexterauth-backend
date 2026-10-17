-- AuthLX schema (PostgreSQL). Idempotent: safe to run on every boot.
-- All objects live in the dedicated `authlx` schema so this backend never
-- conflicts with other applications on the same Postgres instance.

CREATE SCHEMA IF NOT EXISTS authlx;

CREATE TABLE IF NOT EXISTS platform_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id                    TEXT PRIMARY KEY,
  username              TEXT NOT NULL UNIQUE,
  email                 TEXT UNIQUE,
  password_hash         TEXT NOT NULL,
  display_name          TEXT DEFAULT '',
  avatar_url            TEXT DEFAULT '',
  banner_url            TEXT DEFAULT '',
  bio                   TEXT DEFAULT '',
  badges                JSONB DEFAULT '[]',
  role                  TEXT NOT NULL DEFAULT 'user',        -- user | manager | reseller | admin | master_admin
  plan                  TEXT NOT NULL DEFAULT 'Free',        -- Free | Developer | PRO | Enterprise | Seller
  plan_expires_at       BIGINT DEFAULT 0,
  is_verified           BOOLEAN NOT NULL DEFAULT false,
  is_unlimited_reseller BOOLEAN NOT NULL DEFAULT false,
  allowed_license_levels TEXT DEFAULT 'all',
  balance_day           BIGINT NOT NULL DEFAULT 0,
  balance_week          BIGINT NOT NULL DEFAULT 0,
  balance_month         BIGINT NOT NULL DEFAULT 0,
  balance_three_month   BIGINT NOT NULL DEFAULT 0,
  balance_six_month     BIGINT NOT NULL DEFAULT 0,
  balance_year          BIGINT NOT NULL DEFAULT 0,
  balance_lifetime      BIGINT NOT NULL DEFAULT 0,
  is_paused             BOOLEAN NOT NULL DEFAULT false,
  is_2fa_enabled        BOOLEAN NOT NULL DEFAULT false,
  two_factor_secret     TEXT,
  token_version         INTEGER NOT NULL DEFAULT 0,
  last_login_at         TIMESTAMPTZ,
  last_login_ip         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS user_sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jti        TEXT NOT NULL UNIQUE,
  ip         TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_jti ON user_sessions(jti);

CREATE TABLE IF NOT EXISTS otp_codes (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  purpose    TEXT NOT NULL,               -- register | reset | login
  code_hash  TEXT NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email, purpose);

CREATE TABLE IF NOT EXISTS discord_links (
  user_id          TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  discord_id       TEXT UNIQUE,
  discord_username TEXT,
  discord_avatar_url TEXT,
  discord_banner_url TEXT,
  bot_secret       TEXT,
  can_create_apps  BOOLEAN NOT NULL DEFAULT false,
  can_manage_team  BOOLEAN NOT NULL DEFAULT false,
  can_manage_billing BOOLEAN NOT NULL DEFAULT false,
  linked_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS apps (
  id             TEXT PRIMARY KEY,
  owner_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  api_key        TEXT NOT NULL UNIQUE,
  api_secret     TEXT NOT NULL,
  version        TEXT NOT NULL DEFAULT '1.0.0',
  status         BOOLEAN NOT NULL DEFAULT true,
  description    TEXT DEFAULT '',
  hwid_lock      BOOLEAN NOT NULL DEFAULT true,
  token_validation BOOLEAN NOT NULL DEFAULT false,
  webloader_link TEXT DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_apps_owner ON apps(owner_id);

CREATE TABLE IF NOT EXISTS app_settings (
  app_id                     TEXT PRIMARY KEY REFERENCES apps(id) ON DELETE CASCADE,
  min_hwid_length            INTEGER NOT NULL DEFAULT 8,
  hwid_reset_cooldown_unit   TEXT NOT NULL DEFAULT 'Days',   -- Days | Hours
  hwid_reset_cooldown_duration INTEGER NOT NULL DEFAULT 7,
  min_username_length        INTEGER NOT NULL DEFAULT 3,
  min_password_length        INTEGER NOT NULL DEFAULT 6,
  max_hwids_per_user         INTEGER NOT NULL DEFAULT 1,
  allow_registration         BOOLEAN NOT NULL DEFAULT true,
  license_only               BOOLEAN NOT NULL DEFAULT false,
  allow_customer_panel       BOOLEAN NOT NULL DEFAULT true,
  force_hwid                 BOOLEAN NOT NULL DEFAULT false,
  block_vpns                 BOOLEAN NOT NULL DEFAULT false,
  hash_check                 BOOLEAN NOT NULL DEFAULT false,
  block_leaked_passwords     BOOLEAN NOT NULL DEFAULT false,
  log_ip                     BOOLEAN NOT NULL DEFAULT true,
  auto_update_link           TEXT DEFAULT '',
  panel_status               BOOLEAN NOT NULL DEFAULT true,
  panel_icon                 TEXT DEFAULT 'https://cdn.keyauth.cc/front/assets/img/favicon.png',
  panel_color                TEXT DEFAULT '#8b5cf6',
  webhook_url                TEXT DEFAULT '',
  webhook_username           TEXT DEFAULT '',
  webhook_avatar             TEXT DEFAULT '',
  discord_channel_id         TEXT DEFAULT '',
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_users (
  id                TEXT PRIMARY KEY,
  app_id            TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  username          TEXT NOT NULL,
  email             TEXT DEFAULT '',
  password_hash     TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active',        -- active | banned | expired
  subscription_level TEXT NOT NULL DEFAULT 'Default',
  notes             TEXT DEFAULT '',
  hwid              TEXT DEFAULT '',
  hwid_affected     BOOLEAN NOT NULL DEFAULT false,
  additional_hwid   TEXT DEFAULT '',
  ip                TEXT DEFAULT '',
  hwid_reset_at     TIMESTAMPTZ,
  is_2fa_enabled    BOOLEAN NOT NULL DEFAULT false,
  two_factor_secret TEXT,
  is_banned         BOOLEAN NOT NULL DEFAULT false,
  ban_reason        TEXT,
  ban_expires       TIMESTAMPTZ,
  banned_at         TIMESTAMPTZ,
  created_by        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  expiration_date   TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  last_login_at     TIMESTAMPTZ,
  last_ip           TEXT,
  UNIQUE (app_id, username)
);
CREATE INDEX IF NOT EXISTS idx_app_users_app ON app_users(app_id);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(app_id, email);

CREATE TABLE IF NOT EXISTS licenses (
  id            TEXT PRIMARY KEY,
  app_id        TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  key           TEXT NOT NULL UNIQUE,
  status        TEXT NOT NULL DEFAULT 'unused',           -- unused | used | banned
  created_by    TEXT,
  note          TEXT DEFAULT '',
  duration      TEXT DEFAULT '1 Month(s)',
  expiry_duration BIGINT NOT NULL DEFAULT 2592000,        -- seconds
  used_by       TEXT,
  used_on       TEXT,
  used_at       TIMESTAMPTZ,
  subscription_level TEXT DEFAULT 'Default',
  is_banned     BOOLEAN NOT NULL DEFAULT false,
  ban_reason    TEXT,
  ban_expires   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_licenses_app ON licenses(app_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(app_id, status);

CREATE TABLE IF NOT EXISTS tokens (
  id           TEXT PRIMARY KEY,
  app_id       TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  token_string TEXT NOT NULL UNIQUE,
  assigned_to  TEXT DEFAULT '',
  type         TEXT NOT NULL DEFAULT 'standalone',
  status       TEXT NOT NULL DEFAULT 'active',            -- active | paused | banned
  is_banned    BOOLEAN NOT NULL DEFAULT false,
  ban_reason   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tokens_app ON tokens(app_id);

CREATE TABLE IF NOT EXISTS subscriptions (
  id            TEXT PRIMARY KEY,
  app_id        TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  level         INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'active',
  price         NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 0,               -- 0 = lifetime
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subs_app ON subscriptions(app_id);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  app_id     TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  ip         TEXT,
  device     TEXT DEFAULT '',
  hwid       TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);
CREATE INDEX IF NOT EXISTS idx_sessions_app ON sessions(app_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS team_members (
  id          TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
  username    TEXT NOT NULL,
  email       TEXT DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'Manager',            -- Manager | Reseller
  status      TEXT NOT NULL DEFAULT 'active',             -- active | invited
  permissions JSONB DEFAULT '{}',
  balance_day BIGINT NOT NULL DEFAULT 0,
  balance_week BIGINT NOT NULL DEFAULT 0,
  balance_month BIGINT NOT NULL DEFAULT 0,
  balance_three_month BIGINT NOT NULL DEFAULT 0,
  balance_six_month BIGINT NOT NULL DEFAULT 0,
  balance_year BIGINT NOT NULL DEFAULT 0,
  balance_lifetime BIGINT NOT NULL DEFAULT 0,
  allowed_license_levels TEXT DEFAULT 'all',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ,
  UNIQUE (owner_id, username)
);
CREATE INDEX IF NOT EXISTS idx_team_owner ON team_members(owner_id);

CREATE TABLE IF NOT EXISTS team_invitations (
  id          TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  invitee_username TEXT NOT NULL,
  invitee_email TEXT DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'Manager',
  status      TEXT NOT NULL DEFAULT 'pending',            -- pending | accepted | rejected | cancelled
  app_id      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invites_owner ON team_invitations(owner_id);
CREATE INDEX IF NOT EXISTS idx_invites_invitee ON team_invitations(invitee_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id                  TEXT PRIMARY KEY,
  app_id              TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  channel             TEXT NOT NULL DEFAULT 'general',
  sender_id           TEXT,
  sender_username     TEXT NOT NULL,
  sender_display_name TEXT DEFAULT '',
  sender_avatar_url   TEXT DEFAULT '',
  sender_role         TEXT DEFAULT '',
  sender_plan         TEXT DEFAULT '',
  content             TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_app ON chat_messages(app_id, created_at);

CREATE TABLE IF NOT EXISTS hashes (
  id         TEXT PRIMARY KEY,
  app_id     TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  hash_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hashes_app ON hashes(app_id);

CREATE TABLE IF NOT EXISTS variables_global (
  id              TEXT PRIMARY KEY,
  app_id          TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  data            TEXT NOT NULL DEFAULT '',
  is_authenticated BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (app_id, name)
);
CREATE INDEX IF NOT EXISTS idx_gvars_app ON variables_global(app_id);

CREATE TABLE IF NOT EXISTS variables_user (
  id          TEXT PRIMARY KEY,
  app_id      TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  user_id     TEXT REFERENCES app_users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  data        TEXT NOT NULL DEFAULT '',
  is_readonly BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_uvars_app ON variables_user(app_id);
CREATE INDEX IF NOT EXISTS idx_uvars_user ON variables_user(user_id);

CREATE TABLE IF NOT EXISTS files (
  id               TEXT PRIMARY KEY,
  app_id           TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  storage_path     TEXT DEFAULT '',
  download_url     TEXT DEFAULT '',
  version_tag      TEXT DEFAULT '1.0.0',
  is_latest_release BOOLEAN NOT NULL DEFAULT false,
  is_authenticated BOOLEAN NOT NULL DEFAULT false,
  tags             JSONB DEFAULT '[]',
  size             BIGINT NOT NULL DEFAULT 0,
  downloads        BIGINT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_files_app ON files(app_id);

CREATE TABLE IF NOT EXISTS announcements (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'info',               -- info | warning | update
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS changelog_entries (
  id         TEXT PRIMARY KEY,
  version    TEXT NOT NULL,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  date       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'info',
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifs_user ON notifications(user_id, is_read);

CREATE TABLE IF NOT EXISTS payment_history (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan       TEXT NOT NULL,
  amount     NUMERIC(10,2) NOT NULL,
  currency   TEXT NOT NULL DEFAULT 'USD',
  status     TEXT NOT NULL DEFAULT 'completed',
  method     TEXT DEFAULT 'card',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payment_history(user_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id         TEXT PRIMARY KEY,
  app_id     TEXT,
  actor_type TEXT NOT NULL DEFAULT 'client',             -- client | dev | admin | system
  actor_id   TEXT,
  action     TEXT NOT NULL,
  details    JSONB DEFAULT '{}',
  ip         TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_app ON audit_log(app_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id, created_at);

CREATE TABLE IF NOT EXISTS blacklist (
  id         TEXT PRIMARY KEY,
  app_id     TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  hwid       TEXT NOT NULL,
  reason     TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (app_id, hwid)
);
CREATE INDEX IF NOT EXISTS idx_blacklist_app ON blacklist(app_id);

CREATE TABLE IF NOT EXISTS otp_pending_registrations (
  email      TEXT PRIMARY KEY,
  username   TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS migration_versions (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);