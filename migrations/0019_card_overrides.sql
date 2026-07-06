-- Buff/nerf card metadata overrides, editable by moderators at runtime so the
-- owner can rename a card, rewrite its description or flavor, move its tier,
-- or disable it without a code deploy. At most one row per card id; a NULL
-- column means "no override, use the code value". Card LOGIC always stays in
-- code: this table only carries presentation metadata plus the enabled flag
-- and tier that shape draft pools. Read by GET /api/cards (public merged
-- catalog), /api/mod/cards (the editor), and the game-server Durable Object
-- (cached ~5 minutes) which filters disabled cards and applies tier moves
-- when draft offers are rolled.
-- Mirrored in src/lib/server/schema.ts (SCHEMA_STATEMENTS).
CREATE TABLE IF NOT EXISTS card_overrides (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  name TEXT,
  description TEXT,
  flavor TEXT,
  tier INTEGER,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER
);
