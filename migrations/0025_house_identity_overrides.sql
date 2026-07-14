-- Admin-editable identity overrides for the house-bot personas. The roster
-- itself (skill, pacing, location) stays a code constant in
-- src/lib/server/bots.ts; this table only carries the two fields an admin can
-- change from /mod/house: the display username and the avatar preset id. At
-- most one row per persona user id ('hp_...'); a NULL column means "no
-- override, use the code value" (override ?? default, read through by
-- syncHouseRatings and the /api/mod/house/personas route). Saving an override
-- also updates the persona's users row directly, so profiles, the leaderboard,
-- the lobby, and the game server all pick the edit up without a deploy; this
-- table is what keeps the next identity re-sync from clobbering the edit.
-- Mirrored in src/lib/server/schema.ts (SCHEMA_STATEMENTS).
CREATE TABLE IF NOT EXISTS house_identity_overrides (
  user_id TEXT PRIMARY KEY,
  username TEXT,
  avatar TEXT,
  updated_at INTEGER NOT NULL DEFAULT 0
);
