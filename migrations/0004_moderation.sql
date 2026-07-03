-- Moderation: player reports and the mod action audit log. The users
-- role/muted_until/banned_until/bio columns are added at runtime by
-- ensureSchema (same reasoning as users.avatar — SQLite has no idempotent
-- ADD COLUMN, and the runtime bootstrap may have already added them).
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter_user_id TEXT,
  reporter_name TEXT NOT NULL,
  reported_user_id TEXT NOT NULL,
  reported_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT NOT NULL,
  game_id TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  handled_by TEXT,
  handled_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS mod_actions (
  id TEXT PRIMARY KEY,
  mod_user_id TEXT NOT NULL,
  mod_name TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  target_name TEXT NOT NULL,
  action TEXT NOT NULL,
  expires_at INTEGER,
  note TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mod_actions_created ON mod_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mod_actions_target ON mod_actions(target_user_id, created_at DESC);
