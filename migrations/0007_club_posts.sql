-- Club message boards: short posts visible on the club page, members only.
CREATE TABLE IF NOT EXISTS club_posts (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL REFERENCES clubs(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  username TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_club_posts_club ON club_posts(club_id, created_at DESC);
