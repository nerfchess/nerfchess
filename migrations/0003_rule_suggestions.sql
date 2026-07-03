-- Player-submitted rule ideas ("Suggest a rule" form). The users.avatar
-- column is added at runtime by ensureSchema (SQLite has no idempotent
-- ADD COLUMN, so it cannot safely live in a migration that may run after
-- the runtime bootstrap already added it).
CREATE TABLE IF NOT EXISTS rule_suggestions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  contact TEXT,
  user_id TEXT,
  username TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rule_suggestions_created ON rule_suggestions(created_at DESC);
