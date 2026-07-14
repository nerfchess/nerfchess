-- Add a moderator-editable profile bio to the house-bot identity overrides.
-- The original table (migrations/0025) carried only the display username and
-- avatar preset; this adds the third field a moderator can set from /mod/house.
-- NULL = no override, which resolves to an empty bio (the roster no longer
-- seeds a persona's location as its bio). Additive and non-destructive; a
-- saved override also lands on the persona's users row so profiles pick it up
-- without a deploy, and syncHouseRatings writes it verbatim so a re-sync never
-- clobbers it. Mirrored in src/lib/server/schema.ts (ADDITIVE_COLUMNS and the
-- house_identity_overrides CREATE TABLE) for fresh databases.
ALTER TABLE house_identity_overrides ADD COLUMN bio TEXT;
