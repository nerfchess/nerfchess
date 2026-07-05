-- Richer tournament settings and per-entrant standings columns. Every event
-- now carries its game mode, time control, rated flag, and arena duration; each
-- entry carries a score, games played, streak, and performance rating for the
-- standings table. All additive columns with defaults, so the change is safe to
-- apply to a populated database and mirrors src/lib/server/schema.ts.
--
-- Live phase (upcoming / in progress / finished) is derived at read time from
-- starts_at + duration_min, so no status-transition scheduler is required.

ALTER TABLE tournaments ADD COLUMN mode TEXT NOT NULL DEFAULT 'nerf';
ALTER TABLE tournaments ADD COLUMN rated INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN clock_time_sec INTEGER NOT NULL DEFAULT 180;
ALTER TABLE tournaments ADD COLUMN clock_increment_sec INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN duration_min INTEGER NOT NULL DEFAULT 60;

ALTER TABLE tournament_entries ADD COLUMN score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tournament_entries ADD COLUMN games_played INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tournament_entries ADD COLUMN streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tournament_entries ADD COLUMN performance INTEGER;

-- Rollback (reversible): SQLite (and D1) support DROP COLUMN, so this migration
-- is undone by dropping the columns it added. Run these to revert:
--
--   ALTER TABLE tournament_entries DROP COLUMN performance;
--   ALTER TABLE tournament_entries DROP COLUMN streak;
--   ALTER TABLE tournament_entries DROP COLUMN games_played;
--   ALTER TABLE tournament_entries DROP COLUMN score;
--   ALTER TABLE tournaments DROP COLUMN duration_min;
--   ALTER TABLE tournaments DROP COLUMN clock_increment_sec;
--   ALTER TABLE tournaments DROP COLUMN clock_time_sec;
--   ALTER TABLE tournaments DROP COLUMN rated;
--   ALTER TABLE tournaments DROP COLUMN mode;
