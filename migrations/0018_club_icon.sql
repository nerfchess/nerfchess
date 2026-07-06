-- Club identity icon: a curated "emoji|colorId" pair chosen by the club owner
-- (validated against src/lib/clubIcons.ts). Empty string = no icon chosen yet;
-- the UI falls back to a monogram tile of the club name.
-- Mirrored in src/lib/server/schema.ts (clubs CREATE TABLE + ADDITIVE_COLUMNS).
ALTER TABLE clubs ADD COLUMN icon TEXT NOT NULL DEFAULT '';
