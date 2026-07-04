# Phase 4: stats and community

Date: 2026-07-04

## What shipped

- `games.ruleset` column (`TEXT NOT NULL DEFAULT 'classic'`): in `ADDITIVE_COLUMNS` (src/lib/server/schema.ts) and `migrations/0009_games_ruleset.sql`. `recordFinishedGame` accepts an optional `ruleset` (defaults to classic); the profile and game APIs return it. The live worker still records classic games only, no worker change needed.
- Profile rating graph is now per speed category: `/api/users/[username]` returns a `category` on every rating-history point (older rows fall back to the time control), and the profile page filters the chart with `CategoryTabs`, defaulting to the most-played bucket. Under 2 points in a bucket shows "Not enough rated games yet".
- `computePlayerStats` (src/lib/playerStats.ts) additionally returns: `headToHead` (top 5 opponents with W/L/D and last played), `favoriteNerfs` (min 3 deals to rank), `gameLength` (avg plies and duration), `daily` (last 30 UTC days of W/L/D), and `sessions` (games under a 60 minute gap belong to one session; last 5 reported plus longest and average). `StatsGameRow` gained `white_nerf_id`, `black_nerf_id`, and a SQL-computed `move_count`.
- `PlayerStatsPanel` renders the new data: 30-day stacked bar strip, Head to head, Favorite rules (names via `getNerf`), Game length, Recent sessions.
- `/community` hub page: blitz top 10 (leaderboard API), most active this week (`/api/community/active`), online now (lobby snapshot via `useLobbySnapshot`), recent games (`/api/community/recent`), and link cards to Clubs, Tournaments, Nerf TV. "Community" link added to `SiteHeader` and `MobileNavMenu`.
- Archived replays (`/game/[id]`) have a Copy PGN button reusing `gameToPGN`, matching the post-game screen.

## Conventions worth remembering

- Additive schema changes go in both `ADDITIVE_COLUMNS` (runtime idempotent) and a numbered migration file; keep the two in sync.
- `games.category` can be NULL on pre-0006 rows; anything reading it should fall back to `categoryForTimeControl(time_sec, increment_sec)` from src/lib/speed.ts.
- Nerf display names in stats UIs resolve through `getNerf` from src/engine/nerfs/library with `tier-*` classes, as on /stats.
