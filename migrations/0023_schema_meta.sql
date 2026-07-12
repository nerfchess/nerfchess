-- Tiny key/value ledger for schema bookkeeping. ensureSchema stamps
-- 'additive_version' here once the runtime additive pass has completed, so
-- cold isolates skip the ~34-statement pass (and its full-table-scan
-- backfills) when the schema is already current. Mirrors the schema_meta
-- entry in src/lib/server/schema.ts.
CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
