-- Per-mode ratings: queue games are rated again, under two new independent
-- user_ratings buckets keyed by mode ("nerf" and "buff") instead of a speed
-- bucket. No new tables or columns: user_ratings already keys on
-- (user_id, category). Seed both mode buckets for every existing account from
-- the legacy shared users.rating column (the same seed rule the speed buckets
-- used), so nobody starts from scratch. INSERT OR IGNORE keeps this additive
-- and safe to re-run: accounts whose mode buckets already exist are untouched.
-- Mirrors src/lib/server/schema.ts.
INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
  SELECT id, 'nerf', rating, rd, vol, rating FROM users;
INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
  SELECT id, 'buff', rating, rd, vol, rating FROM users;
