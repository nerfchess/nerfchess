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
    rd REAL NOT NULL DEFAULT 500,
    vol REAL NOT NULL DEFAULT 0.09,
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
  // Old-name -> account map, written whenever an account (player or house bot)
  // is renamed, so a stale /u/<oldName> link redirects to the current profile
  // instead of dead-ending on "Player not found". Keyed by the OLD lowercase
  // name; user_id is the stable account id (usernames are never the permanent
  // identity). Mirrored in migrations/0037_username_history.sql.
  `CREATE TABLE IF NOT EXISTS username_history (
    old_username_lower TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    changed_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_username_history_user ON username_history(user_id)`,
  `CREATE TABLE IF NOT EXISTS user_ratings (
    user_id TEXT NOT NULL REFERENCES users(id),
    category TEXT NOT NULL,
    rating REAL NOT NULL DEFAULT 1500,
    rd REAL NOT NULL DEFAULT 500,
    vol REAL NOT NULL DEFAULT 0.09,
    games INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,
    peak REAL NOT NULL DEFAULT 1500,
    hand_set INTEGER NOT NULL DEFAULT 0,
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
    actor_user_id TEXT,
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
  // Friendships: ONE row per pair, stored canonically (user_lo < user_hi by id)
  // so direction never duplicates it. requested_by records who sent the request
  // (the OTHER user accepts); status is 'pending' until then, 'accepted' after.
  // Mirrors migrations/0024_friendships.sql.
  `CREATE TABLE IF NOT EXISTS friendships (
    user_lo TEXT NOT NULL,
    user_hi TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_lo, user_hi)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_friendships_hi ON friendships(user_hi)`,
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
  // Staff-editable identity overrides (username, avatar, bio) for the house-bot
  // personas; NULL column = no override, fall through to the code constant in
  // lib/server/bots.ts (bio has no code default — empty until a moderator sets
  // one). Mirrors migrations/0025_house_identity_overrides.sql +
  // migrations/0028_house_identity_bio.sql (bio column).
  `CREATE TABLE IF NOT EXISTS house_identity_overrides (
    user_id TEXT PRIMARY KEY,
    username TEXT,
    avatar TEXT,
    bio TEXT,
    rating REAL,
    updated_at INTEGER NOT NULL DEFAULT 0
  )`,
  // Tiny key/value ledger for schema bookkeeping (see ADDITIVE_VERSION below).
  // Mirrors migrations/0023_schema_meta.sql.
  `CREATE TABLE IF NOT EXISTS schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
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
  // A moderator can flag a username as inappropriate without touching the
  // account: 1 = the owner must pick a new name (ratings, games, and
  // achievements are all kept). Mirrors migrations/0026_username_flags.sql.
  `ALTER TABLE users ADD COLUMN name_flagged INTEGER NOT NULL DEFAULT 0`,
  // One-time rating grant: set ilovenewjeans's nerf and buff buckets to 2180.
  // Games rated after this move the number normally. The whole additive pass
  // re-runs on every version bump, so the grant is gated on a schema_meta
  // marker: the UPDATE fires only while the marker is absent, and the final
  // INSERT plants it. Mirrors migrations/0027_ilovenewjeans_2180.sql.
  `INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
     SELECT id, 'nerf', 2180, 90, 0.06, 2180 FROM users
     WHERE username_lower = 'ilovenewjeans'
       AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovenewjeans_2180')`,
  `INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
     SELECT id, 'buff', 2180, 90, 0.06, 2180 FROM users
     WHERE username_lower = 'ilovenewjeans'
       AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovenewjeans_2180')`,
  `UPDATE user_ratings SET rating = 2180, rd = MIN(rd, 90), peak = MAX(peak, 2180)
     WHERE category IN ('nerf','buff')
       AND user_id = (SELECT id FROM users WHERE username_lower = 'ilovenewjeans')
       AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovenewjeans_2180')`,
  `INSERT OR IGNORE INTO schema_meta (key, value) VALUES ('grant_ilovenewjeans_2180', '1')`,
  // Moderator-set profile bio for a house persona (username + avatar were the
  // original two override fields). NULL = no override, empty bio. Additive and
  // non-destructive. Mirrors migrations/0028_house_identity_bio.sql.
  `ALTER TABLE house_identity_overrides ADD COLUMN bio TEXT`,
  // One-time re-grant: bump ilovenewjeans's nerf and buff buckets to 2250 (peak
  // keeps whichever is higher). Same gated pattern as the 2180 grant above with
  // its OWN marker, so it fires exactly once even though both blocks live in the
  // append-only pass; games rated afterwards move the number normally (he can
  // drop from here). Mirrors migrations/0029_ilovenewjeans_2250.sql.
  `INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
     SELECT id, 'nerf', 2250, 90, 0.06, 2250 FROM users
     WHERE username_lower = 'ilovenewjeans'
       AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovenewjeans_2250')`,
  `INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
     SELECT id, 'buff', 2250, 90, 0.06, 2250 FROM users
     WHERE username_lower = 'ilovenewjeans'
       AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovenewjeans_2250')`,
  `UPDATE user_ratings SET rating = 2250, rd = MIN(rd, 90), peak = MAX(peak, 2250)
     WHERE category IN ('nerf','buff')
       AND user_id = (SELECT id FROM users WHERE username_lower = 'ilovenewjeans')
       AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovenewjeans_2250')`,
  `INSERT OR IGNORE INTO schema_meta (key, value) VALUES ('grant_ilovenewjeans_2250', '1')`,
  // One-time rating grant: set ruylopezsolos's nerf and buff buckets (and the
  // legacy users.rating) to 2150. Same gated pattern as the grants above, with its
  // OWN marker so it fires exactly once. The INSERTs seed the buckets if missing;
  // the UPDATEs do the real work when they already exist (migration 0006 backfills
  // every user). The marker plant is guarded on the account EXISTING, so if the
  // row is somehow absent at deploy the grant is not permanently marked done (it
  // can still land on a later additive-version bump). Mirrors
  // migrations/0030_ruylopezsolos_2150.sql.
  `INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
     SELECT id, 'nerf', 2150, 90, 0.06, 2150 FROM users
     WHERE username_lower = 'ruylopezsolos'
       AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ruylopezsolos_2150')`,
  `INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
     SELECT id, 'buff', 2150, 90, 0.06, 2150 FROM users
     WHERE username_lower = 'ruylopezsolos'
       AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ruylopezsolos_2150')`,
  `UPDATE user_ratings SET rating = 2150, rd = MIN(rd, 90), peak = MAX(peak, 2150)
     WHERE category IN ('nerf','buff')
       AND user_id = (SELECT id FROM users WHERE username_lower = 'ruylopezsolos')
       AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ruylopezsolos_2150')`,
  `UPDATE users SET rating = 2150
     WHERE username_lower = 'ruylopezsolos'
       AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ruylopezsolos_2150')`,
  `INSERT OR IGNORE INTO schema_meta (key, value)
     SELECT 'grant_ruylopezsolos_2150', '1'
     WHERE EXISTS (SELECT 1 FROM users WHERE username_lower = 'ruylopezsolos')`,
  // One-time rating grant: ilovemygirlfriend -> 2504 buff / 2498 nerf (users.rating
  // = their average). Per-mode values, so each bucket is set separately. Same
  // gated/idempotent shape as the grants above with its OWN marker. Mirrors
  // migrations/0031_owner_rating_grants.sql.
  `INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
     SELECT id, 'nerf', 2498, 90, 0.06, 2498 FROM users
     WHERE username_lower = 'ilovemygirlfriend'
       AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovemygirlfriend_2504')`,
  `INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
     SELECT id, 'buff', 2504, 90, 0.06, 2504 FROM users
     WHERE username_lower = 'ilovemygirlfriend'
       AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovemygirlfriend_2504')`,
  `UPDATE user_ratings SET rating = 2498, rd = MIN(rd, 90), peak = MAX(peak, 2498)
     WHERE category = 'nerf'
       AND user_id = (SELECT id FROM users WHERE username_lower = 'ilovemygirlfriend')
       AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovemygirlfriend_2504')`,
  `UPDATE user_ratings SET rating = 2504, rd = MIN(rd, 90), peak = MAX(peak, 2504)
     WHERE category = 'buff'
       AND user_id = (SELECT id FROM users WHERE username_lower = 'ilovemygirlfriend')
       AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovemygirlfriend_2504')`,
  `UPDATE users SET rating = 2501
     WHERE username_lower = 'ilovemygirlfriend'
       AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovemygirlfriend_2504')`,
  `INSERT OR IGNORE INTO schema_meta (key, value)
     SELECT 'grant_ilovemygirlfriend_2504', '1'
     WHERE EXISTS (SELECT 1 FROM users WHERE username_lower = 'ilovemygirlfriend')`,
  // One-time rating grant: ilovenewjeans -> 2437 buff / 2416 nerf (a fixed pick in
  // the requested 2400-2450 band; users.rating = their average). Supersedes the
  // earlier 2180/2250 grants via its OWN marker; peak only ratchets up. Mirrors
  // migrations/0031_owner_rating_grants.sql.
  `INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
     SELECT id, 'nerf', 2416, 90, 0.06, 2416 FROM users
     WHERE username_lower = 'ilovenewjeans'
       AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovenewjeans_2437')`,
  `INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
     SELECT id, 'buff', 2437, 90, 0.06, 2437 FROM users
     WHERE username_lower = 'ilovenewjeans'
       AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovenewjeans_2437')`,
  `UPDATE user_ratings SET rating = 2416, rd = MIN(rd, 90), peak = MAX(peak, 2416)
     WHERE category = 'nerf'
       AND user_id = (SELECT id FROM users WHERE username_lower = 'ilovenewjeans')
       AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovenewjeans_2437')`,
  `UPDATE user_ratings SET rating = 2437, rd = MIN(rd, 90), peak = MAX(peak, 2437)
     WHERE category = 'buff'
       AND user_id = (SELECT id FROM users WHERE username_lower = 'ilovenewjeans')
       AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovenewjeans_2437')`,
  `UPDATE users SET rating = 2427
     WHERE username_lower = 'ilovenewjeans'
       AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'grant_ilovenewjeans_2437')`,
  `INSERT OR IGNORE INTO schema_meta (key, value)
     SELECT 'grant_ilovenewjeans_2437', '1'
     WHERE EXISTS (SELECT 1 FROM users WHERE username_lower = 'ilovenewjeans')`,
  // One-time lichess-parity Glicko resettle for accounts that have NEVER
  // played: widen the old default deviation (350) to the new start (500) so
  // their first games swing like a fresh lichess account, and set the 0.09
  // start volatility. Only never-played rows still at the old wide default are
  // touched (games = 0 AND rd >= 300): anyone mid-convergence keeps their
  // earned rd, and house bots (seeded settled, rd <= 150) are never widened.
  // Gated on a marker like the grants above. New databases get 500/0.09 from
  // the column defaults; new signups write the values explicitly. Mirrors
  // migrations/0032_glicko_lichess_params.sql.
  `UPDATE users SET rd = 500, vol = 0.09
     WHERE games = 0 AND rd >= 300
       AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'glicko_lichess_params_v1')`,
  `UPDATE user_ratings SET rd = 500, vol = 0.09
     WHERE games = 0 AND rd >= 300
       AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key = 'glicko_lichess_params_v1')`,
  `INSERT OR IGNORE INTO schema_meta (key, value) VALUES ('glicko_lichess_params_v1', '1')`,
  // Bell notifications now carry the actor's stable user id alongside the
  // frozen actor_name, so the read path can resolve the CURRENT username live
  // (a friend who renamed after sending a request no longer shows their old
  // name). Nullable and additive; legacy rows stay frozen. Mirrors
  // migrations/0033_notification_actor_id.sql.
  `ALTER TABLE notifications ADD COLUMN actor_user_id TEXT`,
  // Profile privacy + presence. friends_visibility ('public'|'private') gates
  // who may read a player's friends list (owner and moderators always may);
  // show_online = 0 hides the player's last-seen/online presence from the
  // profile payload; last_seen_at is refreshed at most once per 5 minutes from
  // /api/auth/me. Mirrors migrations/0034_profile_privacy.sql.
  `ALTER TABLE users ADD COLUMN friends_visibility TEXT NOT NULL DEFAULT 'public'`,
  `ALTER TABLE users ADD COLUMN show_online INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE users ADD COLUMN last_seen_at INTEGER`,
  // 1 = this rating bucket was set by hand via the rating editor (/api/mod/ratings,
  // ilovenewjeans only) rather than earned through play. The leaderboard's
  // population filter normally hides rows with no games (they would all sit at
  // the 1500 default); a hand-set row carries no games, so this flag lets the
  // board include an edited player who has never played that mode. Mirrors
  // migrations/0035_user_ratings_hand_set.sql.
  `ALTER TABLE user_ratings ADD COLUMN hand_set INTEGER NOT NULL DEFAULT 0`,
  // A hand-set rating override for a house bot, applied from its profile's House
  // bot editor (/api/mod/house/personas). NULL = no override (the bot keeps its
  // roster seed). When set, syncHouseRatings writes this number instead of the
  // seed on every resync, so a hand-edit is not reverted on the next roster
  // version bump. Mirrors migrations/0036_house_rating_override.sql.
  `ALTER TABLE house_identity_overrides ADD COLUMN rating REAL`,
];

// The additive pass is versioned by list length (the list is append-only) and
// recorded in schema_meta once it completes, so it runs once per deploy that
// appends to it — NOT on every cold isolate. Before this gate, every cold
// start (each Next API route's first getDb() and every Durable Object wake)
// paid ~34 sequential D1 round-trips plus the full-table-scan INSERT...SELECT
// backfills below, which showed up as multi-second stalls on the first
// request — including the WebSocket join right after accepting a challenge.
const ADDITIVE_VERSION = ADDITIVE_COLUMNS.length;

export async function ensureSchema(db: D1Database): Promise<void> {
  // One round-trip: bootstrap tables and read the additive marker together.
  const results = await db.batch([
    ...SCHEMA_STATEMENTS.map((sql) => db.prepare(sql)),
    db.prepare(`SELECT value FROM schema_meta WHERE key = 'additive_version'`),
  ]);
  const marker = results[results.length - 1]?.results?.[0] as { value?: string } | undefined;
  if (marker?.value === String(ADDITIVE_VERSION)) return;
  // Stale or fresh database: run the additive pass (idempotent; duplicate
  // columns throw and are ignored), then stamp the version. Concurrent cold
  // isolates may race through here once after a deploy; every statement is
  // safe to repeat.
  for (const sql of ADDITIVE_COLUMNS) {
    try {
      await db.prepare(sql).run();
    } catch {}
  }
  await db
    .prepare(
      `INSERT INTO schema_meta (key, value) VALUES ('additive_version', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .bind(String(ADDITIVE_VERSION))
    .run();
}
