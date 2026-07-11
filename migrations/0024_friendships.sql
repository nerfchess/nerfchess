-- Friendships: one row per pair, stored canonically (user_lo < user_hi by id)
-- so a request in either direction never duplicates it. requested_by is who
-- sent the request; the other user accepts. status: 'pending' | 'accepted'.
-- Mirrors the friendships table in src/lib/server/schema.ts.
CREATE TABLE IF NOT EXISTS friendships (
  user_lo TEXT NOT NULL,
  user_hi TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_lo, user_hi)
);
CREATE INDEX IF NOT EXISTS idx_friendships_hi ON friendships(user_hi);
