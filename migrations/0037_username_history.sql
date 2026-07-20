-- Old-username -> account map, so a renamed account's old profile links keep
-- working. Written on every rename path (flagged-user rename in
-- /api/auth/rename, and the House-bot editor in /api/mod/house/personas): the
-- OUTGOING lowercase name is recorded against the stable account id. When a
-- profile lookup misses the current username, /api/users/[username] consults
-- this table and redirects the old name to the account's current profile.
--
-- Usernames were already never the permanent identity (games, ratings,
-- leaderboard, notifications all key on the account id); this only repairs the
-- one place identity was denormalized for display: the frozen game-archive
-- names and any previously shared /u/<oldName> URL. Additive and idempotent;
-- mirrored in src/lib/server/schema.ts for fresh databases.
CREATE TABLE IF NOT EXISTS username_history (
  old_username_lower TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  changed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_username_history_user ON username_history(user_id);
