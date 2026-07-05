-- Site-wide key/value settings a moderator can flip at runtime. Currently
-- holds house_enabled ("1"/"0") to turn the house bots on or off without a
-- redeploy; the game-server Durable Object reads it (cached).
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT 0
);
