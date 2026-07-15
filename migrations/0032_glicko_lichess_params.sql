-- Lichess-parity Glicko-2 parameters (see src/lib/glicko.ts):
--   new accounts start 1500 with RD 500 (lichess default deviation) and
--   volatility 0.09, converge to the RD 45 floor, and are no longer capped to
--   +-150 rating per game (cap is now lichess's 700 sanity bound).
--
-- This migration widens the deviation of accounts that have NEVER played and
-- still sit at the old 350 default, so their first games behave like a fresh
-- lichess account. Anyone mid-convergence (games > 0, or an rd they earned)
-- keeps their value; house bots are seeded settled (rd <= 150) and are never
-- widened. Mirrored into src/lib/server/schema.ts's additive pass gated on the
-- schema_meta marker 'glicko_lichess_params_v1'.
UPDATE users SET rd = 500, vol = 0.09 WHERE games = 0 AND rd >= 300;
UPDATE user_ratings SET rd = 500, vol = 0.09 WHERE games = 0 AND rd >= 300;
