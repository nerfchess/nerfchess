-- Chat messages that tripped the profanity filter, kept for moderator review.
CREATE TABLE IF NOT EXISTS chat_flags (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  user_id TEXT,
  username TEXT NOT NULL,
  color TEXT NOT NULL,
  text TEXT NOT NULL,
  matched_words TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  reviewed INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_chat_flags_created ON chat_flags(reviewed, created_at DESC);
