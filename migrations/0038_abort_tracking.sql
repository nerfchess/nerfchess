-- Abort-abuse tracking. recent_aborts is a ring buffer of the account's last
-- six finished games ('1' = a game this player aborted, most recent last);
-- abort_timeout_until blocks matchmaking/game creation until the instant
-- passes after repeated aborts. Mirrored in src/lib/server/schema.ts.
ALTER TABLE users ADD COLUMN recent_aborts TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN abort_timeout_until INTEGER;
