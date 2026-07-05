-- A direct challenge can be staked on rating (a rated custom challenge).
-- Mirrors src/lib/server/schema.ts. Backfills every pre-existing challenge as
-- casual.
ALTER TABLE challenges ADD COLUMN rated INTEGER NOT NULL DEFAULT 0;
