-- Append-only audit of runtime card metadata changes (card_overrides edits):
-- one row per changed field per edit, written by upsertCardOverride /
-- deleteCardOverride and shown publicly on the card's codex page as its
-- "moderator changes" timeline. Deliberately carries NO actor column: the
-- events are public, and which moderator made a change is not.
-- field is 'name' | 'description' | 'flavor' | 'tier' | 'enabled' | 'reset'.
-- Mirrored in src/lib/server/schema.ts (SCHEMA_STATEMENTS).
CREATE TABLE IF NOT EXISTS card_override_history (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_coh_card ON card_override_history (kind, card_id, at DESC);
