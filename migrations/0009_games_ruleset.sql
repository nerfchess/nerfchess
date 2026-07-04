-- Which rules variant a game was played under. Everything recorded so far is
-- classic nerf chess; future variants will write their own id. Mirrors
-- src/lib/server/schema.ts.
ALTER TABLE games ADD COLUMN ruleset TEXT NOT NULL DEFAULT 'classic';
