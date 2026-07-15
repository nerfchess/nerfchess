-- Bell notifications now record the actor's stable user id alongside the
-- frozen actor_name text. The notifications read path resolves the CURRENT
-- username live from this id, so a friend (or house bot) who renamed after
-- sending / accepting a friend request no longer shows their old name in the
-- bell. Nullable and additive: legacy rows keep their frozen text.
-- Mirrored in src/lib/server/schema.ts ADDITIVE_COLUMNS for fresh databases.
ALTER TABLE notifications ADD COLUMN actor_user_id TEXT;
