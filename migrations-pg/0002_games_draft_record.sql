-- Full-fidelity draft record for the finished-game archive, so a draft-ruleset
-- game can be deterministically replayed (position at any ply) from the archive
-- alone. See docs/archive-draft-record.md. Both columns are nullable and
-- invisible to the running worker until it starts writing them, so this is a
-- safe online add. Keep in sync with the D1 copy (migrations/0020 +
-- ADDITIVE_COLUMNS in src/lib/server/schema.ts).
--
-- draft_record: JSONB (mode, draftSeed, cadence, stacked, picksVisible,
--   cardOverrides, and the FULL draftActions stream) so card-value analytics
--   can query into the action stream without a schema rewrite.
-- replay_version: the engine REPLAY_VERSION the record was written under
--   (own column so "which rows can the current engine replay" is an
--   index-friendly predicate, not a JSON probe).

SET ROLE nerfchess_app;

ALTER TABLE games ADD COLUMN IF NOT EXISTS draft_record JSONB;
ALTER TABLE games ADD COLUMN IF NOT EXISTS replay_version INTEGER;
