-- Full-fidelity draft record for the games archive (D1 dev/no-Hyperdrive
-- fallback copy of migrations-pg/0002_games_draft_record.sql). D1 has no JSONB,
-- so draft_record is a JSON string in a TEXT column. Mirrored in ADDITIVE_COLUMNS
-- (src/lib/server/schema.ts) so a fresh dev DB self-applies it via ensureSchema.
-- See docs/archive-draft-record.md.
ALTER TABLE games ADD COLUMN draft_record TEXT;
ALTER TABLE games ADD COLUMN replay_version INTEGER;
