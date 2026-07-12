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
  // Player-submitted ideas from the "Suggest a nerf or a buff" form.
  // kind is 'nerf' or 'buff'; pool only applies to buff ideas and records
  // which draft pool the buff is meant for: 'buff' (Buff mode card) or
  // 'boon' (Nerf-mode relief boon).
  `CREATE TABLE IF NOT EXISTS rule_suggestions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    contact TEXT,
    user_id TEXT,
    username TEXT,
    created_at INTEGER NOT NULL,
    kind TEXT NOT NULL DEFAULT 'nerf',
    pool TEXT
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
    rated INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_challenges_to ON challenges(to_user_id, status, created_at DESC)`,
  // Small site-wide counters (e.g. bot games played, which have no game row).
  `CREATE TABLE IF NOT EXISTS site_counters (
    key TEXT PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 0
  )`,
  // Site-wide key/value settings a moderator can flip at runtime (e.g.
  // house_enabled = "1"/"0" to turn the house bots on or off). Read by the
  // game-server Durable Object (cached) so a change takes effect without a
  // redeploy.
  `CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT 0
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
  // Post-game thumbs up / down on the buffs a player drafted during the game.
  `CREATE TABLE IF NOT EXISTS buff_feedback (
    id TEXT PRIMARY KEY,
    buff_id TEXT NOT NULL,
    vote INTEGER NOT NULL,
    user_id TEXT,
    username TEXT,
    game_id TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_buff_feedback_buff ON buff_feedback(buff_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS clubs (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    owner_user_id TEXT NOT NULL REFERENCES users(id),
    owner_name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    icon TEXT NOT NULL DEFAULT ''
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
  // Failed sign-in counters for brute-force throttling (see lib/server/auth.ts).
  // Keys are "u:<username_lower>" or "ip:<client ip>".
  `CREATE TABLE IF NOT EXISTS login_attempts (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    first_at INTEGER NOT NULL
  )`,
  // Unlockable achievements, one row per (user, achievement). A row appears the
  // first time a finished game advances the achievement; progress climbs to the
  // achievement's goal, then unlocked_at is stamped (and never rewritten).
  // Locked achievements have no row, so the catalog's locked/unlocked state is a
  // left join. Keyed by user_id so evaluation and reads stay bounded + indexed.
  // Mirrors migrations/0017_achievements.sql.
  `CREATE TABLE IF NOT EXISTS user_achievements (
    user_id TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    unlocked_at INTEGER,
    PRIMARY KEY (user_id, achievement_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id, unlocked_at)`,
  // Idempotency ledger for finished-game processing: recordFinishedGame
  // INSERT OR IGNOREs one row per game id (with a per-call nonce) in the same
  // atomic D1 batch as the rating/counter updates, and every update is
  // conditioned on THIS call's nonce having won the insert. A game id can
  // therefore apply its rating deltas exactly once, no matter how many times
  // the end path re-runs (DO eviction between the DB write and the durable
  // `recorded` flag, arena /arena/end retries, replayed end frames).
  // Mirrors migrations/0021_recorded_games.sql.
  `CREATE TABLE IF NOT EXISTS recorded_games (
    id TEXT PRIMARY KEY,
    nonce TEXT NOT NULL,
    recorded_at INTEGER NOT NULL
  )`,
  // Buff/nerf card metadata overrides a moderator edits at runtime (name,
  // description, flavor, tier, enabled) so card copy and draft availability
  // change without a deploy. At most one row per card id; NULL column = no
  // override, fall through to the code definition. Card logic stays in code.
  // kind is 'buff' or 'nerf'. Mirrors migrations/0019_card_overrides.sql.
  `CREATE TABLE IF NOT EXISTS card_overrides (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    name TEXT,
    description TEXT,
    flavor TEXT,
    tier INTEGER,
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER
  )`,
  // Cache for the codex card-insights rollup (one JSON blob of per-card
  // aggregate stats, recomputed lazily by /api/cards/insights). key is a
  // shape-version tag ('v1'). Mirrors migrations/0023_codex_insights.sql.
  `CREATE TABLE IF NOT EXISTS codex_insights_cache (
    key TEXT PRIMARY KEY,
    json TEXT NOT NULL,
    computed_at INTEGER NOT NULL
  )`,
  // Append-only audit of runtime card metadata changes (card_overrides
  // edits), one row per changed field, shown publicly on the card's codex
  // page. No actor column on purpose: the events are public, the moderator's
  // identity is not. Mirrors migrations/0024_card_override_history.sql.
  `CREATE TABLE IF NOT EXISTS card_override_history (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    field TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_coh_card ON card_override_history (kind, card_id, at DESC)`,
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
  // Emoji flair shown next to the username (see src/lib/flair.ts).
  `ALTER TABLE users ADD COLUMN flair TEXT`,
  // Suggestion kind ('nerf' | 'buff') and, for buff ideas, the intended draft
  // pool ('buff' = Buff mode card, 'boon' = Nerf-mode relief boon). Runtime
  // additions like users.avatar (see migrations/0003's header) because
  // ensureSchema may bootstrap the table before any migration runs; the
  // DEFAULT backfills every pre-existing suggestion as a nerf.
  `ALTER TABLE rule_suggestions ADD COLUMN kind TEXT NOT NULL DEFAULT 'nerf'`,
  `ALTER TABLE rule_suggestions ADD COLUMN pool TEXT`,
  // Direct challenges can be rated (a custom challenge staked on rating).
  // Backfills every pre-existing challenge as casual.
  `ALTER TABLE challenges ADD COLUMN rated INTEGER NOT NULL DEFAULT 0`,
  // Optional sign-in email and linked Google account (google_sub is the
  // stable Google account id from the OAuth id_token). The unique indexes
  // live here rather than SCHEMA_STATEMENTS because they must run after the
  // ALTERs on a fresh database.
  `ALTER TABLE users ADD COLUMN email TEXT`,
  `ALTER TABLE users ADD COLUMN google_sub TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL`,
  // Per-mode rating buckets ("nerf" and "buff") for rated queue games.
  // Seeded from the games-weighted average of the account's legacy speed
  // ratings (rating weighted by games in each speed bucket with games
  // played), falling back to the legacy shared users.rating for accounts
  // with no speed history. Idempotent (INSERT OR IGNORE) and additive:
  // accounts whose mode rows already exist are never reseeded, so this
  // formula only affects accounts seeded after it shipped. Accounts created
  // later are seeded lazily on first contact by seedCategoryRatings, which
  // uses the same formula. Supersedes migrations/0013_mode_ratings.sql
  // (which seeded from the raw legacy rating).
  `INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
     SELECT u.id, 'nerf', COALESCE(s.wavg, u.rating), u.rd, u.vol, COALESCE(s.wavg, u.rating)
     FROM users u
     LEFT JOIN (
       SELECT user_id, SUM(rating * games) * 1.0 / SUM(games) AS wavg
       FROM user_ratings
       WHERE category IN ('ultrabullet','bullet','blitz','rapid') AND games > 0
       GROUP BY user_id
     ) s ON s.user_id = u.id`,
  `INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
     SELECT u.id, 'buff', COALESCE(s.wavg, u.rating), u.rd, u.vol, COALESCE(s.wavg, u.rating)
     FROM users u
     LEFT JOIN (
       SELECT user_id, SUM(rating * games) * 1.0 / SUM(games) AS wavg
       FROM user_ratings
       WHERE category IN ('ultrabullet','bullet','blitz','rapid') AND games > 0
       GROUP BY user_id
     ) s ON s.user_id = u.id`,
  // Richer tournament settings so an event carries its game mode, time control,
  // and arena length rather than only a name and format. Live phase
  // (upcoming/ongoing/finished) is derived from starts_at + duration_min at read
  // time, so no status scheduler is needed. Mirrors
  // migrations/0015_tournament_details.sql.
  `ALTER TABLE tournaments ADD COLUMN mode TEXT NOT NULL DEFAULT 'nerf'`,
  `ALTER TABLE tournaments ADD COLUMN rated INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE tournaments ADD COLUMN clock_time_sec INTEGER NOT NULL DEFAULT 180`,
  `ALTER TABLE tournaments ADD COLUMN clock_increment_sec INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE tournaments ADD COLUMN duration_min INTEGER NOT NULL DEFAULT 60`,
  // Per-entrant standings. Scores are written by the pairing/scoring engine
  // (not yet built for this first version) and default to zero, so the
  // standings table renders real entrants seeded by rating until then.
  `ALTER TABLE tournament_entries ADD COLUMN score INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE tournament_entries ADD COLUMN games_played INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE tournament_entries ADD COLUMN streak INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE tournament_entries ADD COLUMN performance INTEGER`,
  // Club identity icon, a curated "emoji|colorId" pair picked by the club
  // owner (validated against src/lib/clubIcons.ts; '' = monogram fallback).
  // Mirrors migrations/0018_club_icon.sql.
  `ALTER TABLE clubs ADD COLUMN icon TEXT NOT NULL DEFAULT ''`,
  // Full-fidelity draft record (JSON string) + the engine REPLAY_VERSION the row
  // was written under, so a draft game replays from the archive alone. D1 has no
  // JSONB, so draft_record is TEXT here; Postgres uses JSONB. Mirrors
  // migrations/0020_games_draft_record.sql (and migrations-pg/0002). Never
  // exposed by any public API (see docs/archive-draft-record.md).
  `ALTER TABLE games ADD COLUMN draft_record TEXT`,
  `ALTER TABLE games ADD COLUMN replay_version INTEGER`,
  // Claim every game already archived on D1 in the recorded_games idempotency
  // ledger (nonce 'backfill' can never match a live call's random nonce), so a
  // stale replay of a pre-ledger game can never re-apply its rating deltas.
  // Idempotent: INSERT OR IGNORE never overwrites a real claim. Mirrors
  // migrations/0021_recorded_games.sql.
  `INSERT OR IGNORE INTO recorded_games (id, nonce, recorded_at)
     SELECT id, 'backfill', completed_at FROM games`,
];

export async function ensureSchema(db: D1Database): Promise<void> {
  await db.batch(SCHEMA_STATEMENTS.map((sql) => db.prepare(sql)));
  for (const sql of ADDITIVE_COLUMNS) {
    try {
      await db.prepare(sql).run();
    } catch {}
  }
}
