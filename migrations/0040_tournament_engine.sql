-- Tournament engine v1: rounds, pairings, and per-round games.
--
-- A tournament now actually runs. When its start time arrives, the engine
-- pairs entrants Swiss-style each round (sort by score then rating, pair
-- adjacent, avoid rematches when possible, bye for an odd player), asks the
-- game-server Durable Object to create a real game per board, and collects
-- results from the finished-game archive: win 1, draw 0.5, bye 1. The driver
-- is lazy (advance-on-read from GET /api/tournaments/[id]); see
-- src/lib/server/tournamentEngine.ts for the full design note.
--
-- The `games` archive is deliberately NOT touched: it is dual-backend (OCI
-- Postgres via Hyperdrive in prod, D1 in dev), so a tournament_id column
-- there would need a risky coordinated PG migration. The mapping lives in
-- tournament_games instead (game_id -> tournament/round/board), which the
-- engine joins against the archive by game id.
--
-- rounds_total: configured round count; 0 = as many rounds as fit in the
-- duration window. current_round: 0 until the first round is paired.
-- round_started_at: when the current round's games were created (feeds the
-- round deadline that voids never-finished games). finished_at: stamped when
-- the engine completes the event (status becomes 'finished').
ALTER TABLE tournaments ADD COLUMN rounds_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN current_round INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN round_started_at INTEGER;
ALTER TABLE tournaments ADD COLUMN finished_at INTEGER;

-- One row per board per round, plus one row per bye (game_id NULL, result
-- 'bye'). Seat tokens are stored so the players can claim their seats from
-- the tournament page; they are NEVER exposed publicly (the detail API only
-- returns the caller's own token). result: NULL = pending, then 'w' | 'b' |
-- 'draw' | 'bye' | 'void' (void = never finished before the round deadline,
-- aborted, or the game could not be created; no points either way).
CREATE TABLE IF NOT EXISTS tournament_games (
  tournament_id TEXT NOT NULL REFERENCES tournaments(id),
  round INTEGER NOT NULL,
  board INTEGER NOT NULL,
  game_id TEXT,
  white_user_id TEXT NOT NULL,
  white_username TEXT NOT NULL,
  black_user_id TEXT,
  black_username TEXT,
  white_token TEXT,
  black_token TEXT,
  result TEXT,
  created_at INTEGER NOT NULL,
  resolved_at INTEGER,
  PRIMARY KEY (tournament_id, round, board)
);
CREATE INDEX IF NOT EXISTS idx_tournament_games_game ON tournament_games(game_id);

-- Rollback (reversible): SQLite (and D1) support DROP COLUMN/TABLE:
--
--   DROP TABLE tournament_games;
--   ALTER TABLE tournaments DROP COLUMN finished_at;
--   ALTER TABLE tournaments DROP COLUMN round_started_at;
--   ALTER TABLE tournaments DROP COLUMN current_round;
--   ALTER TABLE tournaments DROP COLUMN rounds_total;
