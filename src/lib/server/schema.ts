/// <reference types="@cloudflare/workers-types" />

// Canonical schema for the D1 database. Every statement is idempotent so the
// schema can be ensured at runtime (dev, preview, and fresh deploys) as well as
// applied via the wrangler migration in migrations/0001_init.sql, which must be
// kept in sync with this list.

export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    username_lower TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    rating REAL NOT NULL DEFAULT 1500,
    rd REAL NOT NULL DEFAULT 350,
    vol REAL NOT NULL DEFAULT 0.06,
    games INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,
    avatar TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    muted_until INTEGER,
    banned_until INTEGER,
    bio TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_users_rating ON users(rating DESC)`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    white_user_id TEXT,
    black_user_id TEXT,
    white_name TEXT NOT NULL,
    black_name TEXT NOT NULL,
    white_nerf_id TEXT NOT NULL,
    black_nerf_id TEXT NOT NULL,
    seed INTEGER NOT NULL,
    time_sec INTEGER NOT NULL,
    increment_sec INTEGER NOT NULL,
    moves TEXT NOT NULL,
    winner TEXT,
    reason TEXT NOT NULL,
    rated INTEGER NOT NULL DEFAULT 0,
    white_rating_before REAL,
    white_rating_after REAL,
    black_rating_before REAL,
    black_rating_after REAL,
    started_at INTEGER NOT NULL,
    completed_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_games_white ON games(white_user_id, completed_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_games_black ON games(black_user_id, completed_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_games_completed ON games(completed_at DESC)`,
  // Chat messages that tripped the profanity filter, kept for moderator
  // review. A notification hook (email/Discord) can read from here later.
  `CREATE TABLE IF NOT EXISTS chat_flags (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL,
    user_id TEXT,
    username TEXT NOT NULL,
    color TEXT NOT NULL,
    text TEXT NOT NULL,
    matched_words TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    reviewed INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_chat_flags_created ON chat_flags(reviewed, created_at DESC)`,
  // Player-submitted rule ideas from the "Suggest a rule" form.
  `CREATE TABLE IF NOT EXISTS rule_suggestions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    contact TEXT,
    user_id TEXT,
    username TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_rule_suggestions_created ON rule_suggestions(created_at DESC)`,
  // Player-filed reports (cheating, chat abuse, ...), reviewed by moderators.
  `CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reporter_user_id TEXT,
    reporter_name TEXT NOT NULL,
    reported_user_id TEXT NOT NULL,
    reported_name TEXT NOT NULL,
    reason TEXT NOT NULL,
    description TEXT NOT NULL,
    game_id TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    handled_by TEXT,
    handled_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_user_id, created_at DESC)`,
  // Audit log of every moderation action (mute, ban, warn, role change).
  `CREATE TABLE IF NOT EXISTS mod_actions (
    id TEXT PRIMARY KEY,
    mod_user_id TEXT NOT NULL,
    mod_name TEXT NOT NULL,
    target_user_id TEXT NOT NULL,
    target_name TEXT NOT NULL,
    action TEXT NOT NULL,
    expires_at INTEGER,
    note TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_mod_actions_created ON mod_actions(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_mod_actions_target ON mod_actions(target_user_id, created_at DESC)`,
  // Direct messages between players (the inbox).
  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    read INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_user_id, created_at DESC)`,
  // Bell notifications: new messages, challenges, moderation notices.
  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    actor_name TEXT,
    text TEXT NOT NULL,
    href TEXT,
    created_at INTEGER NOT NULL,
    read INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC)`,
  // Direct challenges: a friend-game code addressed to a specific player.
  `CREATE TABLE IF NOT EXISTS challenges (
    id TEXT PRIMARY KEY,
    from_user_id TEXT NOT NULL,
    from_name TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    time_sec INTEGER NOT NULL,
    increment_sec INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_challenges_to ON challenges(to_user_id, status, created_at DESC)`,
  // Small site-wide counters (e.g. bot games played, which have no game row).
  `CREATE TABLE IF NOT EXISTS site_counters (
    key TEXT PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 0
  )`,
];

// Columns added after launch. SQLite has no "ADD COLUMN IF NOT EXISTS", so
// each is attempted and a duplicate-column error means it is already there.
const ADDITIVE_COLUMNS: string[] = [
  `ALTER TABLE users ADD COLUMN avatar TEXT`,
  `ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`,
  `ALTER TABLE users ADD COLUMN muted_until INTEGER`,
  `ALTER TABLE users ADD COLUMN banned_until INTEGER`,
  `ALTER TABLE users ADD COLUMN bio TEXT`,
];

export async function ensureSchema(db: D1Database): Promise<void> {
  await db.batch(SCHEMA_STATEMENTS.map((sql) => db.prepare(sql)));
  for (const sql of ADDITIVE_COLUMNS) {
    try {
      await db.prepare(sql).run();
    } catch {}
  }
}
