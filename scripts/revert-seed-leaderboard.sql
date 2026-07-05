-- Revert the leaderboard seed (migration 0014). Removes only the fake seed
-- accounts, identified by the seed_ id prefix and the unusable password hash,
-- exactly like migration 0008 removed the old house bots. Real accounts and
-- their ratings are untouched.
DELETE FROM user_ratings WHERE user_id LIKE 'seed\_%' ESCAPE '\';
DELETE FROM users WHERE id LIKE 'seed\_%' ESCAPE '\' AND password_hash = 'unusable';
