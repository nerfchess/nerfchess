-- A hand-set rating override for a house bot, applied from its profile's House
-- bot editor (/api/mod/house/personas, ilovenewjeans / moderators). Bot ratings
-- are otherwise seeded from the roster and rewritten on every roster revision by
-- syncHouseRatings, which would silently revert a hand-edit. This column lets an
-- edit persist: when non-NULL, syncHouseRatings writes this number (for both the
-- legacy users.rating and the Nerf/Buff buckets) instead of the seed. NULL = no
-- override (keep the seed). Additive and non-destructive; every pre-existing row
-- backfills to NULL. Mirrored in src/lib/server/schema.ts (the
-- house_identity_overrides CREATE TABLE and ADDITIVE_COLUMNS) for fresh databases.
ALTER TABLE house_identity_overrides ADD COLUMN rating REAL;
