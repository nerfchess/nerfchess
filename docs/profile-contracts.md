# Profile and Social - Phase 1 contracts

Frozen contracts for the profile/social redesign. Later phases (profile pages,
search UI, navigation, clickable usernames) build on these and must not rewrite
them; corrections go through the integration owner.

All API routes run on the Cloudflare worker with `export const dynamic =
"force-dynamic"`. PG-backed reads degrade to empty when Hyperdrive is absent.

## Schema (D1)

Migration `migrations/0034_profile_privacy.sql`, mirrored in
`src/lib/server/schema.ts` (ADDITIVE_COLUMNS):

- `users.friends_visibility TEXT NOT NULL DEFAULT 'public'` - `'public'` |
  `'private'`. Private = only the owner and moderators may read the friends list.
- `users.show_online INTEGER NOT NULL DEFAULT 1` - `0` hides last-seen/online
  presence from the profile payload.
- `users.last_seen_at INTEGER` - epoch ms, refreshed at most once per 5 minutes
  from `/api/auth/me`.

## GET /api/auth/me (changed)

Unchanged response shape. Side effect added: stamps `users.last_seen_at` for the
signed-in user at most once per 5 minutes (guarded UPDATE, non-fatal on error).

## GET /api/users/[username] (extended)

Existing fields (`user.{username,rating,rd,games,wins,losses,draws,avatar,
createdAt,role,bio,flair}`, `games`, `ratings`, `ratingHistory`) are unchanged.
Added:

```
user.lastSeenAt: number | null      // null when show_online = 0
user.showOnline: boolean
user.friendsVisibility: "public" | "private"
user.friendCount: number            // accepted friendships
relationship: "self" | "none" | "friends" | "incoming" | "outgoing" | null
                                    // null when signed out
mutualFriends: { username: string; avatar: string | null }[]   // cap 6
```

`mutualFriends` is populated only when a viewer is signed in, is not viewing
their own profile, and may see this player's friends (public list, or the viewer
is the owner or a moderator); otherwise `[]`. `relationship` uses the session
cookie via the same `userForSession` helper `/api/friends` uses.

## GET /api/users/[username]/games (new)

PG-backed archive with filters + cursor pagination.

Query params (all optional):
- `mode` = `nerf` | `buff` (filters `category`; other values ignored)
- `result` = `win` | `loss` | `draw` (resolved for the player's seat)
- `rated` = `1` | `0`
- `before` = epoch-ms cursor; returns games with `completed_at < before`
- `limit` = page size, default 30, clamped to 1..50

Response:

```
{
  games: Array<{
    id, white_name, black_name, winner, reason, rated, category, ruleset,
    white_user_id, black_user_id,
    white_rating_before, white_rating_after, black_rating_before, black_rating_after,
    time_sec, increment_sec, completed_at,
    mode: "nerf" | "buff" | null   // category when a mode bucket, else null
  }>,
  hasMore: boolean
}
```

Same row shape as the profile's `recentGames` plus `mode`. Returns
`{ games: [], hasMore: false }` when the archive is unreachable. 404 for an
unknown username. Newest first. `hasMore` is computed by over-fetching one row.

## GET /api/users/[username]/friends (new)

Accepted friends only (never pending requests).

```
// Visible (public list, or viewer is owner/mod):
{
  friends: { username: string; avatar: string | null; rating: number | null }[],
                                    // ordered by rating desc
  count: number,                    // accepted friend count
  mutual: { username: string; avatar: string | null }[]   // cap 6, signed-in viewer
}

// Private and viewer not owner/mod:
{ private: true, count: number, mutual: [...] }
```

`mutual` is the accepted friends shared by the signed-in viewer and this player
(empty when signed out or viewing own profile). It is returned even when the
list is private, since those are the viewer's own friends. 404 for an unknown
username.

## GET /api/users/settings (extended) + POST (new)

GET now also returns the privacy columns alongside the existing settings blob:

```
{ settings, updatedAt, friendsVisibility: "public"|"private", showOnline: boolean }
```

POST writes the privacy columns (PUT still owns the device-synced settings
blob). Body (either or both keys):

```
{ friendsVisibility?: "public" | "private", showOnline?: boolean }
```

Validates inputs (400 on a bad value or an empty body); 401 when signed out;
returns `{ ok: true }`.

## GET /api/users/search (changed)

Hits now include `avatar` and `flair`:

```
{ players: { username, rating, games, avatar: string|null, flair: string|null }[] }
```

Ranking: exact `username_lower` match first, then prefix matches, then substring
matches. When fewer than 5 hits, a bounded typo pass adds edit-distance-1
matches over candidates sharing the first letter with near-equal length (<=200
rows scanned in-route), deduped. Banned users (`banned_until` in the future) are
excluded. Limit 10. Existing LIKE escaping preserved. `q` still 2..20 chars.

## Removed: Favorite Rules (spec 2.8)

`src/lib/playerStats.ts` no longer exports `FavoriteNerf` or populates
`PlayerStats.favoriteNerfs` (type, field, `FAVORITE_NERF_MIN_GAMES`, and the
`byNerf` accumulation are gone). `src/components/PlayerStatsPanel.tsx` dropped
the "Favorite rules" table. No other consumers.

## src/lib/presence.ts (new, client)

One module-level, refcounted poll of the shared edge-cached lobby snapshot
(`fetchLobbySnapshot` from `lib/lobbyClient.ts`) - no per-hook socket. Case-
insensitive name matching.

```
type PresenceState = "in-game" | "searching" | "online" | "offline";
interface Presence { state: PresenceState; gameId?: string; game?: MPLobbyGame }

useLobbyFeed(): MPLobby | null           // shared snapshot, live-updating
usePresence(username): Presence          // derived per-username presence
derivePresence(lobby, username): Presence // pure helper (tests / list rendering)
```

Priority: in-game (seated in a `games[]` entry) > searching (`seeks[]` or a
"searching" player row) > online (present in `players[]`) > offline. Caveat: a
player who hides presence (`show_online = 0`) is still visible in the lobby
snapshot, so broad lists cannot suppress them cheaply; the profile and friends
endpoints enforce the hidden flag, lists surface lobby presence regardless.

## src/components/PresenceBadge.tsx (new)

```
PresenceBadge({ state: PresenceState, mode?: DraftMode|null,
                lastSeenAt?: number|null, className?: string })
```

Dot + always-present text label (never color-only). In-game dot is mode-colored
(Nerf coral / Buff blue); searching pulses gold (static under `motion-reduce`);
online is verdigris; offline is gray with "Last seen <relative>" or "Offline".

## src/components/PlayerLink.tsx (new)

```
PlayerLink({ name, avatar?, flair?, avatarSize?, className?, disableLink?, children? })
isLinkablePlayerName(name): boolean
```

Renders a username as a `Link` to `/u/<encodeURIComponent(name)>` with
`stopPropagation` (safe inside larger clickable rows) and a hover underline;
optional avatar/flair ride along. Non-linkable names (empty, placeholder/
anonymous, or outside the username charset) and `disableLink` render plain text
with the same layout. `isLinkablePlayerName` is exported for callers that need
the check independently.
