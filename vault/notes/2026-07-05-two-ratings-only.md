# Two ratings only: Nerf and Buff (2026-07-05)

Owner request: merge the bullet/blitz/rapid leaderboards and stats into the
mode ratings and remove them from view. Nerf and Buff are now the only two
visible ratings anywhere on the site. This was a UI-level removal: no columns
were dropped and no rows were deleted; all historical speed-rating data stays
in `user_ratings` and `games`.

## What was hidden or changed

- `src/lib/ratingCategories.ts`: all four speed buckets (ultrabullet, bullet,
  blitz, rapid) moved into `RETIRED_CATEGORY_IDS`, so
  `ACTIVE_RATING_CATEGORIES` is now exactly `[nerf, buff]`. Every tabbed
  surface (CategoryTabs on the leaderboard and the profile rating graph)
  derives from that list, so the speed tabs disappeared everywhere at once.
  `DEFAULT_CATEGORY` is now `nerf`. A new `LEGACY_LOCAL_CATEGORY` ("blitz")
  keeps the old localStorage single-rating migration stable (lib/rating.ts and
  lib/ratings.ts use it; the local vs-bot rating store is untouched).
  New export `ALL_RATING_CATEGORY_IDS` (modes + speeds) for stats tallies.
- Leaderboard page (`src/app/leaderboard/page.tsx`): exactly two boards, Nerf
  and Buff, each wearing its mode accent color via the registry. No speed tabs.
- Leaderboard API (`src/app/api/leaderboard/route.ts`): only accepts
  `?category=nerf|buff`. Anything else (including the old speed ids) maps to
  the default board (nerf). No speed leaderboard is reachable.
- Community page: the "Top players" box is the Nerf top ten (follows
  `DEFAULT_CATEGORY`).
- Public profile (`src/app/u/[username]/page.tsx`): exactly two rating cards
  (Nerf and Buff) with rating, provisional marker, games, W/L/D, and peak. The
  rating-history graph offers only the Nerf and Buff tabs and defaults to the
  most-played mode bucket; old speed-rated points remain in the data but have
  no tab.
- Own profile (`src/app/profile/page.tsx`): the single legacy "Online rating"
  card (users.rating) was replaced by two mode cards fed from the per-category
  rows returned by `/api/users/[username]` (rating, W/L/D, peak, games).
- Stats panel (`src/components/PlayerStatsPanel.tsx`): the "By speed" table is
  now "By mode" and lists only Nerf and Buff. `computePlayerStats`
  (src/lib/playerStats.ts) files each game under its recorded `games.category`
  (nerf/buff for mode games) and only falls back to the time-control bucket
  for old rows without a category; the stats API selects the column now.
  Legacy speed-bucketed games are still tallied internally but not displayed.

Time-control labels on games themselves (lobby seek rows, queue pool picker
groupings, local game history labels like "Blitz 3+2") are unchanged: they
describe the clock, not a rating.

## Seed formula for first-time mode ratings

When a user's nerf or buff rating row is created for the first time (lazy path
`seedCategoryRatings` in src/lib/server/games.ts, and the mirrored bulk
INSERT OR IGNORE statements in src/lib/server/schema.ts ADDITIVE_COLUMNS):

- If the account has speed-bucket rows with games played, the starting rating
  (and peak) is the games-weighted average of those speed ratings:
  `SUM(rating * games) / SUM(games)` over `user_ratings` rows in
  (ultrabullet, bullet, blitz, rapid) with `games > 0`.
- Otherwise it falls back to the legacy shared `users.rating` (the original
  rule). `rd` and `vol` still come from the users row in both cases.
- Idempotency is unchanged: INSERT OR IGNORE, so accounts already seeded
  (including everyone bulk-seeded by migrations/0013_mode_ratings.sql) keep
  their current mode ratings and are never reseeded. The new formula only
  affects accounts whose mode rows are created after this shipped.

## Rating writes audit

- Both rated match creators in worker.ts (human queue pairing and house-bot
  queue matches) set `draft: true` and `mode`, so `recordFinishedGame` always
  receives `ratingCategory: "nerf" | "buff"` for rated games.
- The `categoryForTimeControl` fallback inside `recordFinishedGame` is only
  reached by casual friend/challenge games, where it merely labels the
  archived `games.category` column; casual games never touch `user_ratings`.
  Nothing writes speed rating buckets for new games.
- The local (localStorage) vs-bot rating in src/lib/rating.ts still keys by
  speed bucket; it is device-local, never shown on rating surfaces, and out of
  scope here.
