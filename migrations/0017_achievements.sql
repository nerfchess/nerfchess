-- Unlockable achievements, one row per (user, achievement). A row is created
-- the first time a finished game makes progress toward the achievement; the
-- progress counter climbs until it reaches the achievement's goal, at which
-- point unlocked_at is stamped (and then left alone). Locked achievements have
-- no row at all, so the catalog's locked/unlocked state is a left join in the
-- API. Everything is keyed by user_id so the reads stay bounded and indexed.
CREATE TABLE IF NOT EXISTS user_achievements (
  user_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  unlocked_at INTEGER,
  PRIMARY KEY (user_id, achievement_id)
);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id, unlocked_at);
