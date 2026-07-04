-- The house-player ("bot") system is retired: the engine-driven accounts made
-- the single-threaded game server run chess searches on its own thread and
-- kept it too busy to serve real traffic. Remove their user rows so they stop
-- appearing on the leaderboard and in the lobby. Their user ids were all
-- created as 'bot_' || lower(username) with an unusable password hash, so the
-- prefix uniquely identifies them (real accounts get random hex ids).
-- Finished games they played are kept for history; the games table stores
-- display names directly.
DELETE FROM user_ratings WHERE user_id LIKE 'bot\_%' ESCAPE '\';
DELETE FROM sessions WHERE user_id LIKE 'bot\_%' ESCAPE '\';
DELETE FROM users WHERE id LIKE 'bot\_%' ESCAPE '\' AND password_hash = 'unusable';
