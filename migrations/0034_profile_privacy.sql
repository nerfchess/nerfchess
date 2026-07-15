-- Profile privacy + presence columns. friends_visibility gates who may see a
-- player's friends list ('public' = anyone, 'private' = owner and moderators
-- only). show_online = 0 hides the player's last-seen / online presence from
-- their profile payload. last_seen_at is refreshed at most once every 5 minutes
-- from /api/auth/me (a cheap write guard) so the profile can show "Last seen
-- <relative>". Mirrors src/lib/server/schema.ts.
ALTER TABLE users ADD COLUMN friends_visibility TEXT NOT NULL DEFAULT 'public';
ALTER TABLE users ADD COLUMN show_online INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN last_seen_at INTEGER;
