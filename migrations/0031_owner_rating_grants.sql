-- One-time rating grants (mirrors the ADDITIVE_COLUMNS block in
-- src/lib/server/schema.ts). Each is gated on its OWN schema_meta marker so it
-- fires exactly once; peak only ratchets up; the marker is planted only when the
-- account row exists, so a missing account is not permanently marked done.

-- ilovemygirlfriend -> 2504 buff / 2498 nerf (users.rating = their average).
INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
  SELECT id, 'nerf', 2498, 90, 0.06, 2498 FROM users
  WHERE username_lower = 'ilovemygirlfriend'
    AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovemygirlfriend_2504');
INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
  SELECT id, 'buff', 2504, 90, 0.06, 2504 FROM users
  WHERE username_lower = 'ilovemygirlfriend'
    AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovemygirlfriend_2504');
UPDATE user_ratings SET rating = 2498, rd = MIN(rd, 90), peak = MAX(peak, 2498)
  WHERE category = 'nerf'
    AND user_id = (SELECT id FROM users WHERE username_lower = 'ilovemygirlfriend')
    AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovemygirlfriend_2504');
UPDATE user_ratings SET rating = 2504, rd = MIN(rd, 90), peak = MAX(peak, 2504)
  WHERE category = 'buff'
    AND user_id = (SELECT id FROM users WHERE username_lower = 'ilovemygirlfriend')
    AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovemygirlfriend_2504');
UPDATE users SET rating = 2501
  WHERE username_lower = 'ilovemygirlfriend'
    AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovemygirlfriend_2504');
INSERT OR IGNORE INTO schema_meta (key, value)
  SELECT 'grant_ilovemygirlfriend_2504', '1'
  WHERE EXISTS (SELECT 1 FROM users WHERE username_lower = 'ilovemygirlfriend');

-- ilovenewjeans -> 2437 buff / 2416 nerf (a fixed pick in the requested 2400-2450
-- band; users.rating = their average). Supersedes the earlier 2180/2250 grants.
INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
  SELECT id, 'nerf', 2416, 90, 0.06, 2416 FROM users
  WHERE username_lower = 'ilovenewjeans'
    AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovenewjeans_2437');
INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
  SELECT id, 'buff', 2437, 90, 0.06, 2437 FROM users
  WHERE username_lower = 'ilovenewjeans'
    AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovenewjeans_2437');
UPDATE user_ratings SET rating = 2416, rd = MIN(rd, 90), peak = MAX(peak, 2416)
  WHERE category = 'nerf'
    AND user_id = (SELECT id FROM users WHERE username_lower = 'ilovenewjeans')
    AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovenewjeans_2437');
UPDATE user_ratings SET rating = 2437, rd = MIN(rd, 90), peak = MAX(peak, 2437)
  WHERE category = 'buff'
    AND user_id = (SELECT id FROM users WHERE username_lower = 'ilovenewjeans')
    AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovenewjeans_2437');
UPDATE users SET rating = 2427
  WHERE username_lower = 'ilovenewjeans'
    AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovenewjeans_2437');
INSERT OR IGNORE INTO schema_meta (key, value)
  SELECT 'grant_ilovenewjeans_2437', '1'
  WHERE EXISTS (SELECT 1 FROM users WHERE username_lower = 'ilovenewjeans');
