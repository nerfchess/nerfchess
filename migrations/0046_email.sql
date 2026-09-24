-- Daily email (brief section 17): who registered when, email opt-out, and a
-- send log that makes every email exactly-once. Mirrored at runtime by
-- ensureEmailSchema in src/lib/server/emailSchema.ts (and, after integration,
-- by the matching ADDITIVE_COLUMNS block in src/lib/server/schema.ts).

-- registered_at: when the account became a registered (non-guest) account.
-- A guest that registers or links Google keeps its guest created_at, so
-- created_at cannot answer "who signed up in the last 24 hours" (F099). The
-- two triggers below stamp it for every future registration without any route
-- having to remember to; existing registered accounts are backfilled with
-- created_at, which is the best record there is for them.
ALTER TABLE users ADD COLUMN registered_at INTEGER;

-- 1 = the player turned email off (settings toggle or the one-click
-- unsubscribe link). The daily job never mails an account with this set.
ALTER TABLE users ADD COLUMN email_opt_out INTEGER NOT NULL DEFAULT 0;

UPDATE users SET registered_at = created_at WHERE is_guest = 0 AND registered_at IS NULL;

CREATE TRIGGER IF NOT EXISTS trg_users_registered_insert
AFTER INSERT ON users
WHEN NEW.is_guest = 0 AND NEW.registered_at IS NULL
BEGIN
  UPDATE users SET registered_at = NEW.created_at WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_users_registered_upgrade
AFTER UPDATE OF is_guest ON users
WHEN OLD.is_guest = 1 AND NEW.is_guest = 0
BEGIN
  UPDATE users SET registered_at = CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) WHERE id = NEW.id;
END;

CREATE INDEX IF NOT EXISTS idx_users_registered ON users(registered_at) WHERE registered_at IS NOT NULL;

-- One row per email the site means to send exactly once. send_key is the
-- identity ('welcome:<user id>', 'report:<YYYY-MM-DD>'): the job claims the key
-- with INSERT OR IGNORE before sending, so a retried or double-fired cron
-- finds the row and skips. status: 'pending' (claimed, sending), 'sent',
-- 'skipped' (for example opted out between claim and send).
CREATE TABLE IF NOT EXISTS email_sends (
  send_key TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  user_id TEXT,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  sent_at INTEGER,
  provider_id TEXT,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_sends_kind ON email_sends(kind, created_at DESC);
