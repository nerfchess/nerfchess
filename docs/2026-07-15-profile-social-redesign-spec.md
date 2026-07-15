# Profile and Social Redesign - Product Spec (2026-07-15)

Design lead spec. Implementation agents must follow this; deviations need a documented reason
in the PR description. Use Lichess as a functional reference only. Preserve NerfChess's visual
identity: dark nebula background, parchment text, gold accent, buff blue, nerf coral, existing
`.plate` / `.btn-leaf` / `.smallcaps` idiom, `font-display` headings.

## Hard constraints

- Do NOT edit `worker.ts` or any GameServer Durable Object logic. All presence work is
  client-side over the existing lobby snapshot feed (`src/lib/multiplayer.ts`, `src/lib/lobbyClient.ts`).
- D1 migrations are append-only in `migrations/` (mirror `src/lib/server/schema.ts`); PG in `migrations-pg/`.
  API routes run on the Cloudflare worker: WebCrypto only, `export const dynamic = "force-dynamic"`.
- PG (Hyperdrive) may be absent locally: every PG read must degrade to empty, never crash.
- Never expose hidden game info (secret nerfs, masked draft cards, private chat) beyond what
  the existing spectator payload filtering already allows.
- No em dashes in any user-facing copy. Sentence-case labels, smallcaps utility for micro-labels.
- Accessibility: 44px min touch targets, visible focus (`focus-visible` ring), no color-only
  results (always pair W/L color with text), reduced-motion respected, no horizontal overflow
  at 320/375/768/1024/1440.

## 1. Presence (client-side, server-authoritative via lobby feed)

New `src/lib/presence.ts` + hook `usePresence(username)`:
- One module-level shared `MPSession` lobby subscription (refcounted; disconnect when no
  subscribers). Derives per-username: `{ state: "in-game" | "searching" | "online" | "offline",
  gameId?, game? }` from the lobby snapshot (`players[]`, `seeks[]`, `games[]`).
- Also `useLobbyFeed()` returning the raw snapshot for lists (search results, friends).
- Cleanup on unmount; no duplicate listeners; snapshot updates propagate live.
- `lastSeenAt`: new D1 column `users.last_seen_at INTEGER` updated at most once per 5 minutes
  from `/api/auth/me` (cheap write guard). Served in the profile payload.

Status chip component `src/components/PresenceBadge.tsx`: dot + label.
- in-game: nerf-coral or buff-blue dot per mode, label "Playing right now"
- searching: gold pulse (reduced-motion: static), "Looking for a game"
- online: verdigris dot, "Online"
- offline: gray, "Last seen <relative>" (or "Offline" if lastSeen hidden/unknown)
Text label always present; never color-only.

## 2. Profile pages

### 2.1 Routes
- `/u/[username]` is THE profile. `/profile` becomes a tiny client redirect to `/u/<me>`
  (logged out: sign-in prompt). Nav "Profile" points at `/u/<me>`.
- New `/profile/edit`: everything customization. Sections: Profile picture (existing picker +
  upload), Flair (existing picker incl. laurel), Bio, Privacy (friends list visibility toggle,
  online status / last seen visibility toggle). Reuse the picker code moved out of the old
  `/profile` page. Header action from own profile: "Edit profile" -> `/profile/edit`.
- Direct URL load and refresh of `/u/x` must work (it already does; keep it).

### 2.2 Header (top of `/u/[username]`)
Avatar (72px desktop / 56 mobile), username + flair + laurel badge (title via `placementTitle`),
role badge, PresenceBadge, "Member since <date>", bio (inline, edit affordance only for self
links to nothing inline anymore: bio editing moves to /profile/edit; keep read-only display),
club chip when the player belongs to a club (link to club page; omit if none or too costly),
strongest current rating inline chip (best of nerf/buff).
Actions row:
- Own: Edit profile, Share, Settings (opens existing SettingsPanel).
- Other (signed in): Challenge (primary, btn-leaf), friend button with real state machine
  (Add friend / Request sent / Accept request / Friends with remove-in-overflow), Share,
  overflow menu (Message, Report). Hide unavailable actions (guests: no friend button).
- Share: navigator.share fallback clipboard copy, confirmation toast text "Link copied".
Friend state comes from a new `relationship` field in the profile payload (see 5).

### 2.3 Current / Recent game module (directly below header + rating cards)
- If in-game (from presence feed): "Playing right now" module with visual priority
  (gilt plate, mode-colored edge). Contents: miniature live board (reuse the TV mini board
  mechanism used by `/tv` / `HeroTv`), both players (avatar, clickable name, rating), mode
  badge (Buff/Nerf), time control, rated/casual, live clocks, side to move, move number,
  viewer count when available, disconnected/reconnecting state if exposed by watch feed.
  Entire module clickable to spectator view `/game/<id>`; explicit "Watch live" button too.
  Updates in real time; when the game ends while viewed: swap label to "Final", show result
  (and rating changes when they arrive in the recent-games payload), keep replay link, and
  it becomes the Recent Game module without a reload.
- Multiple active games: show most relevant first + "N active games" note (data permitting;
  current server supports one live game per player, so guard but do not over-build).
- Else if the player has finished games: "Recent game" module: result (text + color),
  opponent (avatar, clickable, rating), rating change, mode, time control, end reason,
  relative date, compact final-position board when replay data is cheaply available
  (otherwise omit the board rather than fake it), "View replay" -> `/game/<id>`.
- Else (new player): empty state (EmptyState component): invite to play, "Find a match" ->
  /lobby. Never render an empty "current game" shell.

### 2.4 Rating cards (shared component `src/components/ratings/ModeRatingCard.tsx`)
One per mode (Nerf, Buff), used on `/u` (and anywhere else mode ratings render):
current rating (+ provisional "?"), peak, games, W/D/L, win rate %, recent movement
(delta over last 7 days from ratingHistory, +N gold / -N oxblood / flat), mode icon + color.
Rank/percentile: show "#N" when the player is in the cached top-100 standings, else omit.

### 2.5 Rating history chart
Keep `RatingChart` multi-series but add controls: mode chips (Nerf / Buff / both) and range
7d / 30d / 90d / All. The plotted series must end at the player's current displayed rating
(append a synthetic "now" point at the current rating per mode so chart and card reconcile).

### 2.6 Tabs: Activity | Games
Below the game module. Tab state in the URL (`?tab=games`) so links are stable.
- Activity: rating movement summary (last 30d delta per mode), recent achievements
  (existing strip data, newest first with dates), current standings laurels, milestone lines
  (peak rating reached, 100th game, etc. computed client-side from available stats; keep
  modest, no fake data), 30-day activity strip from PlayerStats daily buckets.
- Games: header counts (playing now, total, rated, W/L/D), filters: mode (All/Buff/Nerf),
  result (All/Wins/Losses/Draws), rated (All/Rated/Casual); newest first;
  "Load more" pagination (30/page) against the new games endpoint (see 5).
  Row: result text ("Won/Lost/Draw" colored + text), opponent avatar + clickable username +
  rating, mode badge, time control, rated chip, rating delta, end reason, relative time,
  opens replay. FIX the delta/date run-together bug (currently `-2` + `7/14/2026` renders
  as "-27/14/2026"): delta gets an explicit chip/parenthesis and a " · " separator.
  Mobile (<640px): rows become stacked cards, no truncation of essentials.

### 2.7 Friends module
- Own profile: "Friends (N)" panel: incoming requests (accept/decline) on top, then online
  friends first (presence-sorted: in-game > searching > online > offline), each with avatar,
  clickable name, rating, PresenceBadge, "Watch" when in-game, "Challenge" when online,
  overflow with Remove friend. Search/filter box when > 8 friends. Outgoing requests section.
  Empty state: "Find players" -> search, plus one sentence on why friends help (rematches,
  challenges). Reuse `/api/friends`.
- Public profile: friend count + mutual friends first (from payload), respecting the owner's
  friends-visibility setting; when private show "Friends list is private". Never show the
  owner's pending requests to anyone else. Show Watch beside a visible friend currently playing.

### 2.8 Remove Favorite Rules
Delete the "Favorite rules" stat: `favoriteNerfs` from `src/lib/playerStats.ts` (type, field,
computation, min-games const) and the table in `src/components/PlayerStatsPanel.tsx:328-373`.
Nothing else references it. Do not touch Codex/rules/gameplay.

## 3. Player search

API (`/api/users/search`): add `avatar`, `flair` to hits; match = prefix OR substring
(prefix ranked first), then a cheap typo pass (edit distance 1 via a bounded LIKE variant or
in-route rerank of a wider candidate set) when under 5 hits; exclude banned; dedupe; limit 10.
Exact-username match always ranks first. Case-insensitive (already).

UI (`PlayerSearch.tsx`): rows show avatar, username, flair, laurel, best rating, PresenceBadge
(from useLobbyFeed), friend indicator when the hit is a friend (small "Friend" tag; data from a
lazily fetched `/api/friends` for signed-in users). Keep debounce, keyboard nav, Enter opens
highlighted, Escape closes. Recent searches (last 5, localStorage `nerfchess.recentSearches`)
shown when the field is focused and empty; clicking one opens the profile; per-item remove.
Loading, empty, and error states all distinct ("Searching...", "No players match", "Search
failed, try again" with retry). Whole row clickable.

## 4. Clickable usernames everywhere

Every rendered username in: lobby (players list, seeks, live games), search, leaderboard,
friends lists, game history rows, live game / spectator player rows, challenges dropdown,
tournaments, clubs, notifications, TV, inbox threads links to `/u/<name>` (encodeURIComponent,
stopPropagation inside larger clickable rows). Skip anonymous/guest placeholder names and
in-board overlays where a click must not leave the game (board player rows during YOUR OWN
active game keep current behavior; spectator view names ARE clickable).
Add a tiny shared `PlayerLink` component to standardize this.

## 5. API additions (integration owner)

- `GET /api/users/[username]` payload additions: `lastSeenAt`, `friendCount`,
  `relationship: "self" | "none" | "friends" | "incoming" | "outgoing" | null` (null when
  signed out), `mutualFriends: [{username, avatar}]` (cap 6, only when viewer signed in),
  `friendsVisibility`, `club: {id, name} | null` (cheapest available lookup; omit if heavy).
- New `GET /api/users/[username]/games?mode=&result=&rated=&before=<ts>&limit=30`:
  PG-backed, same shape as current recentGames rows + `mode` (nerf/buff) per game; falls
  back to empty list without PG. Must include both players' names/ratings/deltas + reason.
- New `GET /api/users/[username]/friends`: accepted friends only (username, avatar, rating),
  404-free; respects `friends_visibility` (owner + mods always allowed); plus `mutual` array
  for the signed-in viewer.
- `POST /api/users/settings` (extend existing): `friendsVisibility: "public" | "private"`,
  `showOnline: boolean`. D1 migration `00xx_profile_privacy.sql`: users.friends_visibility
  TEXT DEFAULT 'public', users.show_online INTEGER DEFAULT 1, users.last_seen_at INTEGER.
  Mirror in `src/lib/server/schema.ts`.
- Search route changes per section 3.
- When `show_online = 0`: profile payload omits lastSeenAt and the UI shows no presence chip
  for that player anywhere (presence hook takes a `hidden` flag from profile payload; search
  results and friends lists of OTHERS cannot know it cheaply, so enforce at minimum on the
  profile page and friends endpoints; document the lobby-visibility caveat in code).

## 6. Navigation

Desktop header nav: Play (menu: Lobby, Challenge a friend, Practice vs computer, Tournaments),
Watch (Nerf TV, Buff TV), Community (hub, Clubs, Tournaments, Guidelines), Leaderboard,
Rules (/codex). Search icon, challenges, notifications, account menu stay right.
Account menu gains: Profile, Game history (/history), Achievements, Inbox, Preferences,
(Moderation), Sign out. Remove History and Achievements from the top-level bar.
Mobile menu: grouped sections Play / Watch / Community / You with the same destinations.
Active section highlighting must work for subpaths (e.g. /tv* -> Watch).
No route deletions; everything reachable.

## 7. Play hub

- Lobby stays the online hub: keep Buff default + "Recommended" tag, 3+2 default, remembered
  selections, counts. Polish: compact mode selector + time grid, one dominant "Find match"
  button, clear queue status with elapsed time, links: Create custom game (challenges tab),
  Challenge a friend, Practice against computer (-> /play).
- `/play` = bot practice ONLY: remove the embedded online `QueueButton`/online matchmaking
  from /play, add a link "Play online" -> /lobby.
- Homepage: restore a visible "Practice against the computer" entry (link card to /play).

## 8. Reconnect UX (client only)

In the online game surface (OnlineMatch / game page):
- On socket loss during an active game: non-blocking banner "Connection lost. Reconnecting..."
  with elapsed seconds; board stays; input disabled only if truly disconnected.
- On reconnect: brief "Reconnected" confirmation (auto-dismiss 3s), state re-synced via the
  existing seat-reclaim replay; verify no duplicated event handling (guard by dropping frames
  for a stale socket generation if not already guarded in MPSession).
- Opponent disconnected: show the existing 30s abandonment claim flow with a visible countdown
  ("Opponent disconnected. You can claim the win in Ns").
- Spectator: same reconnect banner + auto re-watch (exists in tryReconnect; surface it).
- No indefinite "Connecting..." text anywhere: every waiting state gets either progress or a
  retry action after 10s.

## 9. QA / tests

- `npm run typecheck`, `npm run lint`, `npm run build` must pass.
- Playwright: extend e2e with profile smoke (loads /u/<seeded or guest>, tabs switch, search
  opens a profile, nav renders at 320/768/1440, /play has no online queue, lobby find-match
  visible). Keep tests independent of PG (archive-backed sections must render their empty
  states cleanly).
- Manual visual review at 320, 375, 768, 1024, 1440 and short landscape (log issues, fix).

## Sequencing

Phase 1 integration owner: migrations, schema mirror, API payloads/endpoints, search API,
favorite-rules removal, presence lib + PresenceBadge + PlayerLink contracts.
Phase 2: profile pages (/u redesign, /profile redirect, /profile/edit), game modules, rating
cards/chart, friends module.
Phase 3: search UI, navigation, play hub, clickable usernames.
Phase 4: reconnect UX, a11y sweep, tests, build verification.
Later phases must not rewrite Phase 1 contracts; corrections go through the integration owner.
