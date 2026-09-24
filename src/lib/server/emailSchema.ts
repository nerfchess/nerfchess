/// <reference types="@cloudflare/workers-types" />

// Runtime mirror of migrations/0046_email.sql, for the daily job and the
// /api/email routes. Every statement is idempotent (a duplicate ALTER throws
// and is ignored), and a schema_meta marker keeps it to one pass per database,
// so a cold isolate pays one SELECT after the first run.
//
// The same list is meant to be appended to ADDITIVE_COLUMNS in schema.ts at
// integration (see docs/polish-pass/slices/L.md REQUESTS), after which this
// function is a cheap no-op on every database the main pass has reached.

export const EMAIL_SCHEMA_STATEMENTS: string[] = [
  `ALTER TABLE users ADD COLUMN registered_at INTEGER`,
  `ALTER TABLE users ADD COLUMN email_opt_out INTEGER NOT NULL DEFAULT 0`,
  `UPDATE users SET registered_at = created_at WHERE is_guest = 0 AND registered_at IS NULL`,
  `CREATE TRIGGER IF NOT EXISTS trg_users_registered_insert
   AFTER INSERT ON users
   WHEN NEW.is_guest = 0 AND NEW.registered_at IS NULL
   BEGIN
     UPDATE users SET registered_at = NEW.created_at WHERE id = NEW.id;
   END`,
  `CREATE TRIGGER IF NOT EXISTS trg_users_registered_upgrade
   AFTER UPDATE OF is_guest ON users
   WHEN OLD.is_guest = 1 AND NEW.is_guest = 0
   BEGIN
     UPDATE users SET registered_at = CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) WHERE id = NEW.id;
   END`,
  `CREATE INDEX IF NOT EXISTS idx_users_registered ON users(registered_at) WHERE registered_at IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS email_sends (
    send_key TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    user_id TEXT,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    sent_at INTEGER,
    provider_id TEXT,
    error TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_email_sends_kind ON email_sends(kind, created_at DESC)`,
];

const MARKER = "email_schema_v1";

const ready = new WeakMap<D1Database, Promise<void>>();

export function ensureEmailSchema(db: D1Database): Promise<void> {
  let p = ready.get(db);
  if (!p) {
    p = run(db).catch((err) => {
      ready.delete(db);
      throw err;
    });
    ready.set(db, p);
  }
  return p;
}

async function run(db: D1Database): Promise<void> {
  await db.prepare(`CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`).run();
  const row = await db.prepare(`SELECT value FROM schema_meta WHERE key = ?`).bind(MARKER).first<{ value: string }>();
  if (row?.value === "1") return;
  for (const sql of EMAIL_SCHEMA_STATEMENTS) {
    try {
      await db.prepare(sql).run();
    } catch {
      // Duplicate column on a database that already has it.
    }
  }
  await db
    .prepare(`INSERT INTO schema_meta (key, value) VALUES (?, '1') ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
    .bind(MARKER)
    .run();
}
