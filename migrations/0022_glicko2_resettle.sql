-- Glicko-2 swap (lichess-style, tau 0.75) resettle: keep everyone's current
-- rating NUMBER as-is, but widen the rating deviation so the first ~10 games
-- under the new math re-converge each rating to true strength quickly
-- ("keep, resettle fast"). Volatility is reset to the 0.06 default; the
-- widened RD is what drives the fast resettle. Rows already at RD >= 150
-- (fresh accounts at 350, mid-placement players) are left alone by MAX().
--
-- users.rd/vol are widened too: they are the seed source for lazily created
-- user_ratings buckets (seedCategoryRatings), so a bucket seeded after the
-- swap starts wide as well.
--
-- ONE-TIME DATA MIGRATION — deliberately NOT mirrored into
-- src/lib/server/schema.ts's ensureSchema: re-running it would re-widen
-- ratings that have since settled, and a fresh database has no legacy rows to
-- resettle in the first place.
UPDATE user_ratings SET rd = MAX(rd, 150), vol = 0.06;
UPDATE users SET rd = MAX(rd, 150), vol = 0.06;
