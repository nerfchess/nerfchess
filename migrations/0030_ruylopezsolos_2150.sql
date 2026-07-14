-- One-time rating grant: set ruylopezsolos's nerf and buff mode buckets (and the
-- legacy users.rating column) to 2150. Games rated afterwards move the number
-- normally, so it can drop from here. Gated on its OWN schema_meta marker so
-- re-runs (including the mirrored additive pass in src/lib/server/schema.ts)
-- never re-apply it. The marker is planted only when the account row exists, so a
-- missing account at run time is not permanently marked done.
INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
  SELECT id, 'nerf', 2150, 90, 0.06, 2150 FROM users
  WHERE username_lower = 'ruylopezsolos'
    AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ruylopezsolos_2150');
INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
  SELECT id, 'buff', 2150, 90, 0.06, 2150 FROM users
  WHERE username_lower = 'ruylopezsolos'
    AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ruylopezsolos_2150');
UPDATE user_ratings SET rating = 2150, rd = MIN(rd, 90), peak = MAX(peak, 2150)
  WHERE category IN ('nerf','buff')
    AND user_id = (SELECT id FROM users WHERE username_lower = 'ruylopezsolos')
    AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ruylopezsolos_2150');
UPDATE users SET rating = 2150
  WHERE username_lower = 'ruylopezsolos'
    AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ruylopezsolos_2150');
INSERT OR IGNORE INTO schema_meta (key, value)
  SELECT 'grant_ruylopezsolos_2150', '1'
  WHERE EXISTS (SELECT 1 FROM users WHERE username_lower = 'ruylopezsolos');
