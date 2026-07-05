# Mode queue pools and per-mode ratings

Owner request (2026-07-05): put rating back in the lobby, big; two clearly
separated queue pools ("play a Nerf game" / "play a Buff game"); and preview
"a few of the rules" with 3 nerfs and 3 buffs. Per-mode ratings ARE the
separate Draft ratings the old "Draft stays unrated" rule was waiting for, so
queue games are rated again.

## Two pools

- The matchmaking queue is now two separate pools, Nerf and Buff. A player
  queues into one explicitly; only same-pool (same mode AND same time
  control) seeks pair.
- Wire: `queue` takes `{ pool: "3+2", mode: "nerf" | "buff" }`. Missing or
  unknown mode falls back to `"buff"`, which is exactly the pool old clients
  always queued into, so an out-of-date tab keeps working.
- Durable Object storage keys went from `queue:<pool>` to
  `queue:<mode>:<pool>`. `queueLeave` now scrubs by the `queue:` prefix
  (storage.list), which also cleans any pre-split legacy keys left over at
  deploy time.
- Pairing threads the mode into the created match (`mode`, `rated: true`).
  Nerf-pool games get an initial dealt nerf pair like friend Nerf games and
  open with the usual opening nerf draft (the autoStart reconnect path
  already called beginNerfDraft for draft non-buff matches). Buff-pool games
  start immediately with the unrestricted rule, as before.
- Lobby seeks carry their pool's `mode` and the seeker's mode rating;
  answering a seek queues with the same pool and mode. The seek row keeps
  the ModeBadge from PR #129 and now reads "Rated" instead of "Draft".

## Per-mode ratings (schema)

- No new table or columns. `user_ratings` already keys on
  (user_id, category); the modes are two new categories, `nerf` and `buff`,
  next to the legacy speed buckets (ultrabullet/bullet/blitz/rapid). Same
  Glicko-2 math, same peak/wins/losses/draws columns, same leaderboard index.
- `migrations/0013_mode_ratings.sql` seeds both mode buckets for every
  existing account from the legacy shared `users.rating` column (the same
  seed rule the speed buckets used at their split), via INSERT OR IGNORE, so
  it is additive, idempotent, and safe for existing rows. The same
  statements run from `ensureSchema` (schema.ts) for dev/preview databases,
  and `seedCategoryRatings` still lazily seeds accounts created later on
  first contact.
- `recordFinishedGame` takes an optional `ratingCategory`; the worker passes
  the match mode for Draft mode games, so a rated queue game moves only that
  mode's bucket. `games.category` records `nerf`/`buff` for mode games,
  which feeds the profile rating history chart and game lists.
- Friend, challenge, and bot games stay casual: `create` still never sets
  `rated`, only `queueJoin` does.

## Rating displayed / staked

- `matchRatingCategory(match)`: Draft games with a mode read and stake the
  mode bucket; everything else buckets by time control as before. Used at
  queue join, seat attach, and rematch refresh, so the rating next to a name
  is always the one the game would move, and the pre-game preview
  (win/draw/loss deltas) is computed from the same numbers.
- `ratingCategories.ts` gains the two mode buckets (Nerf red #dc5a54, Buff
  blue #4a9fee, matching the PR #129 identity), listed first on tabbed
  surfaces (leaderboard, profile). `RATING_CATEGORY_IDS` stays speed-only
  because per-speed stats tables key off it. The leaderboard API now accepts
  the mode categories too.

## Lobby UI

- QueueButton is now the two big pool actions, side by side, above the seek
  list: "Play a Nerf game" (red) and "Play a Buff game" (blue), each showing
  "Your Nerf/Buff rating" fetched from the profile API (fallback: the legacy
  shared rating, which is what would seed the bucket anyway). Time control
  picker below is shared by both buttons.
- Under the buttons: "A few of the nerfs" (Skittish, Horse Tranquilizer,
  Shadow Queen) and "A few of the buffs" (Pawn Push, Ferz King, Pawn
  Shield), name + one-line description, tinted per mode. Static picks of
  implemented mid-tier rules; text imported from the engine libraries so it
  cannot drift.
- The play page reused QueueButton, so it gets both pools too; its "Quick
  pairing runs Buff mode" note is gone.
