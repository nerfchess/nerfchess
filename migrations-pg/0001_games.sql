-- PostgreSQL schema for the finished-game archive, ported from the D1 `games`
-- table (src/lib/server/schema.ts + migrations/0001_init.sql, 0006, 0009). This
-- table lives on the OCI Postgres, reached from Cloudflare Workers via
-- Hyperdrive. Keep in sync with the D1 definition until the D1 copy is retired.
--
-- Type mapping: TEXT -> TEXT, epoch-ms/seed INTEGER -> BIGINT, REAL -> DOUBLE
-- PRECISION, the 0/1 `rated` flag stays SMALLINT so app bind values are
-- unchanged. Objects are owned by the least-privilege app role.

SET ROLE nerfchess_app;

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  white_user_id TEXT,
  black_user_id TEXT,
  white_name TEXT NOT NULL,
  black_name TEXT NOT NULL,
  white_nerf_id TEXT NOT NULL,
  black_nerf_id TEXT NOT NULL,
  seed BIGINT NOT NULL,
  time_sec INTEGER NOT NULL,
  increment_sec INTEGER NOT NULL,
  moves TEXT NOT NULL,
  winner TEXT,
  reason TEXT NOT NULL,
  rated SMALLINT NOT NULL DEFAULT 0,
  category TEXT,
  ruleset TEXT NOT NULL DEFAULT 'classic',
  white_rating_before DOUBLE PRECISION,
  white_rating_after DOUBLE PRECISION,
  black_rating_before DOUBLE PRECISION,
  black_rating_after DOUBLE PRECISION,
  started_at BIGINT NOT NULL,
  completed_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_games_white ON games (white_user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_black ON games (black_user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_completed ON games (completed_at DESC);
