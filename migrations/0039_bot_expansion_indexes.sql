-- 2026-07 house-bot expansion (roster grows to ~510 accounts): indexes for the
-- matchmaking and profile queries that now scan a much larger population.
--
-- idx_user_ratings_user_games serves the "active bucket" subquery the lobby
-- online list and seat attach run per user (WHERE user_id = ? AND category IN
-- ('nerf','buff') ORDER BY games DESC, rating DESC) without a sort step.
--
-- idx_user_ratings_games serves the leaderboard's rating-ties ordering
-- (ORDER BY rating DESC, games DESC) and the viewer-rank count.
CREATE INDEX IF NOT EXISTS idx_user_ratings_user_games ON user_ratings(user_id, games DESC, rating DESC);
CREATE INDEX IF NOT EXISTS idx_user_ratings_games ON user_ratings(category, rating DESC, games DESC);
