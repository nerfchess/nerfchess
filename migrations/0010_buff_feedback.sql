-- Post-game thumbs up / down on the buffs a player drafted during the game.
-- Mirrors src/lib/server/schema.ts.
CREATE TABLE IF NOT EXISTS buff_feedback (
  id TEXT PRIMARY KEY,
  buff_id TEXT NOT NULL,
  vote INTEGER NOT NULL,
  user_id TEXT,
  username TEXT,
  game_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_buff_feedback_buff ON buff_feedback(buff_id, created_at DESC);
