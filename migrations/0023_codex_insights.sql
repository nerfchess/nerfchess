-- Cache for the codex card-insights rollup: one JSON blob covering every
-- card's aggregate gameplay stats (dealt/picked counts, holder win rates),
-- recomputed lazily by /api/cards/insights when older than its freshness
-- window. Dedicated table (not app_settings): the blob is a few hundred KB of
-- derived data, not a setting. key is a shape-version tag ('v1'); bump it when
-- the blob layout changes so stale shapes are simply never read.
-- Mirrored in src/lib/server/schema.ts (SCHEMA_STATEMENTS).
CREATE TABLE IF NOT EXISTS codex_insights_cache (
  key TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  computed_at INTEGER NOT NULL
);
