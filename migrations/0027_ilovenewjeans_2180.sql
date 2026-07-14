-- One-time rating grant: set ilovenewjeans's nerf and buff mode buckets to
-- 2180 (peak keeps whichever is higher). Games rated afterwards move the
-- number normally. Gated on a schema_meta marker so re-runs (including the
-- mirrored additive pass in src/lib/server/schema.ts) never re-apply it.
INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
  SELECT id, 'nerf', 2180, 90, 0.06, 2180 FROM users
  WHERE username_lower = 'ilovenewjeans'
    AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovenewjeans_2180');
INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
  SELECT id, 'buff', 2180, 90, 0.06, 2180 FROM users
  WHERE username_lower = 'ilovenewjeans'
    AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovenewjeans_2180');
UPDATE user_ratings SET rating = 2180, rd = MIN(rd, 90), peak = MAX(peak, 2180)
  WHERE category IN ('nerf','buff')
    AND user_id = (SELECT id FROM users WHERE username_lower = 'ilovenewjeans')
    AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovenewjeans_2180');
INSERT OR IGNORE INTO schema_meta (key, value) VALUES ('grant_ilovenewjeans_2180', '1');
