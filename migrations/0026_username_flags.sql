-- Flagged-username rename flow. A moderator flags an inappropriate name
-- instead of deleting the account: the owner keeps their ratings, games, and
-- achievements, but must choose a new name before playing on. 0 = fine,
-- 1 = flagged (rename required). Additive and non-destructive.
-- Mirrored in src/lib/server/schema.ts ADDITIVE_COLUMNS for fresh databases.
ALTER TABLE users ADD COLUMN name_flagged INTEGER NOT NULL DEFAULT 0;
