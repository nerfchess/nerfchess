-- Mark rating buckets that were set by hand rather than earned through play.
-- The rating editor (/api/mod/ratings, ilovenewjeans only) can overwrite any
-- player's rating in every category; a player who never played a given mode has
-- no user_ratings row with games > 0, and the leaderboard's population filter
-- (r.games > 0 OR house-bot) would otherwise keep that edited player off the
-- board. hand_set = 1 lets the leaderboard include an edited row that carries no
-- games. Additive and non-destructive; every pre-existing row backfills to 0
-- (earned normally). Mirrored in src/lib/server/schema.ts (the user_ratings
-- CREATE TABLE and ADDITIVE_COLUMNS) for fresh databases.
ALTER TABLE user_ratings ADD COLUMN hand_set INTEGER NOT NULL DEFAULT 0;
