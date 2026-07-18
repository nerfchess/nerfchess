-- Per-account record of which one-time forced-default rollouts have already
-- been applied to this account, stored as a JSON array of force ids (e.g.
-- ["accent-theme-rose-classic-v1"]). Lets a forced default apply exactly once
-- per ACCOUNT across every device, instead of once per browser: the first
-- device to load claims the pending forces and records them here, so later
-- devices see them as already applied and leave the user's current settings
-- alone. NULL means no force has ever been applied. See
-- /api/users/forced-defaults. Mirrors src/lib/server/schema.ts.
ALTER TABLE users ADD COLUMN forced_defaults TEXT;
