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
    bio TEXT,
    is_guest INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_users_rating ON users(rating DESC)`,
  `CREATE TABLE IF NOT EXISTS user_ratings (
    user_id TEXT NOT NULL REFERENCES users(id),
    category TEXT NOT NULL,
    rating REAL NOT NULL DEFAULT 1500,
    rd REAL NOT NULL DEFAULT 350,
    vol REAL NOT NULL DEFAULT 0.06,
    games INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,
    peak REAL NOT NULL DEFAULT 1500,
    PRIMARY KEY (user_id, category)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_user_ratings_leaderboard ON user_ratings(category, rating DESC)`,
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
  // Post-game thumbs up / down on the secret rule a player was dealt.
  `CREATE TABLE IF NOT EXISTS nerf_feedback (
    id TEXT PRIMARY KEY,
    nerf_id TEXT NOT NULL,
    vote INTEGER NOT NULL,
    user_id TEXT,
    username TEXT,
    game_id TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_nerf_feedback_nerf ON nerf_feedback(nerf_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS clubs (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    owner_user_id TEXT NOT NULL REFERENCES users(id),
    owner_name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_clubs_created ON clubs(created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS club_members (
    club_id TEXT NOT NULL REFERENCES clubs(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    role TEXT NOT NULL DEFAULT 'member',
    joined_at INTEGER NOT NULL,
    PRIMARY KEY (club_id, user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_club_members_user ON club_members(user_id, joined_at DESC)`,
  `CREATE TABLE IF NOT EXISTS club_posts (
    id TEXT PRIMARY KEY,
    club_id TEXT NOT NULL REFERENCES clubs(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    username TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_club_posts_club ON club_posts(club_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    creator_user_id TEXT NOT NULL REFERENCES users(id),
    creator_name TEXT NOT NULL,
    club_id TEXT REFERENCES clubs(id),
    format TEXT NOT NULL DEFAULT 'swiss',
    starts_at INTEGER,
    status TEXT NOT NULL DEFAULT 'scheduled',
    max_players INTEGER NOT NULL DEFAULT 16,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tournaments_created ON tournaments(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_tournaments_club ON tournaments(club_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS tournament_entries (
    tournament_id TEXT NOT NULL REFERENCES tournaments(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    username TEXT NOT NULL,
    joined_at INTEGER NOT NULL,
    PRIMARY KEY (tournament_id, user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tournament_entries_user ON tournament_entries(user_id, joined_at DESC)`,
];

// Columns added after launch. SQLite has no "ADD COLUMN IF NOT EXISTS", so
// each is attempted and a duplicate-column error means it is already there.
const ADDITIVE_COLUMNS: string[] = [
  `ALTER TABLE users ADD COLUMN avatar TEXT`,
  `ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`,
  `ALTER TABLE users ADD COLUMN muted_until INTEGER`,
  `ALTER TABLE users ADD COLUMN banned_until INTEGER`,
  `ALTER TABLE users ADD COLUMN bio TEXT`,
  `ALTER TABLE users ADD COLUMN is_guest INTEGER NOT NULL DEFAULT 0`,
  // The speed bucket the game was rated under (ultrabullet|bullet|blitz|rapid).
  `ALTER TABLE games ADD COLUMN category TEXT`,
  // Per-account settings blob (JSON) so preferences follow the user across
  // devices; see /api/users/settings.
  `ALTER TABLE users ADD COLUMN settings TEXT`,
  `ALTER TABLE users ADD COLUMN settings_updated_at INTEGER`,
  // Which rules variant the game was played under. Every live game today is
  // classic nerf chess; future variants record their own id here.
  `ALTER TABLE games ADD COLUMN ruleset TEXT NOT NULL DEFAULT 'classic'`,
];

export async function ensureSchema(db: D1Database): Promise<void> {
  await db.batch(SCHEMA_STATEMENTS.map((sql) => db.prepare(sql)));
  for (const sql of ADDITIVE_COLUMNS) {
    try {
      await db.prepare(sql).run();
    } catch {}
  }
}
