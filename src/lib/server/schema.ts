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
    draws INTEGER NOT NULL DEFAULT 0
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
];

export async function ensureSchema(db: D1Database): Promise<void> {
  await db.batch(SCHEMA_STATEMENTS.map((sql) => db.prepare(sql)));
}
