-- Idempotency ledger for finished-game processing. recordFinishedGame
-- INSERT OR IGNOREs one row per game id (with a per-call nonce) in the same
-- atomic batch as the rating/counter updates; every update is conditioned on
-- this call's nonce having won the insert, so one finished game can apply its
-- Glicko deltas exactly once no matter how many times the end path re-runs
-- (DO eviction between the DB write and the durable `recorded` flag, arena
-- /arena/end retries, replayed end frames). Mirrors src/lib/server/schema.ts.
CREATE TABLE IF NOT EXISTS recorded_games (
  id TEXT PRIMARY KEY,
  nonce TEXT NOT NULL,
  recorded_at INTEGER NOT NULL
);

-- Backfill: every game already archived on D1 is claimed with a nonce no live
-- call can ever produce, so a stale replay of a pre-ledger game can never
-- re-apply its rating deltas. (Games archived to Postgres instead of D1 are
-- not listed here; they are protected by their match's durable `recorded`
-- flag, exactly as before, plus the ledger from their first post-migration
-- touch.)
INSERT OR IGNORE INTO recorded_games (id, nonce, recorded_at)
  SELECT id, 'backfill', completed_at FROM games;
