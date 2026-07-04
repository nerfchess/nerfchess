-- Independent per-time-control ratings (ultrabullet/bullet/blitz/rapid) and
-- per-account settings sync. Mirrors src/lib/server/schema.ts.
CREATE TABLE IF NOT EXISTS user_ratings (
  user_id TEXT NOT NULL REFERENCES users(id),
  category TEXT NOT NULL,
  rating REAL NOT NULL DEFAULT 1500,
  rd REAL NOT NULL DEFAULT 350,
  vol REAL NOT NULL DEFAULT 0.06,
  games INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  peak REAL NOT NULL DEFAULT 1500,
  PRIMARY KEY (user_id, category)
);
CREATE INDEX IF NOT EXISTS idx_user_ratings_leaderboard ON user_ratings(category, rating DESC);

ALTER TABLE games ADD COLUMN category TEXT;
ALTER TABLE users ADD COLUMN settings TEXT;
ALTER TABLE users ADD COLUMN settings_updated_at INTEGER;
