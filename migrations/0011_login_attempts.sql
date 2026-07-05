-- Failed sign-in counters for brute-force throttling on /api/auth/login.
-- Mirrors src/lib/server/schema.ts.
CREATE TABLE IF NOT EXISTS login_attempts (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  first_at INTEGER NOT NULL
);
