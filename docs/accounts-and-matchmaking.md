# Accounts, Matchmaking, and Game History

Player accounts, rated quick-pairing, shareable game URLs, live spectating,
game history, and the real leaderboard all run on the existing Cloudflare
deployment: Next.js route handlers + the `GameServer` Durable Object, with
persistence in Cloudflare D1.

## Deploy

No manual database setup. The D1 binding in `wrangler.jsonc` is declared by
`database_name` only, so `npm run deploy` resolves the `nerfchess` database on
your Cloudflare account — creating (provisioning) it automatically on the
first deploy. The schema is ensured idempotently at runtime on first database
access, so no migration step is required either; `migrations/0001_init.sql`
exists for anyone who prefers `wrangler d1 migrations apply nerfchess --remote`.

Local dev and `wrangler dev` also need nothing: local D1 state lives in
`.wrangler/`.

## Storage (D1)

Schema lives in `src/lib/server/schema.ts` (runtime-idempotent) and
`migrations/0001_init.sql` (wrangler migrations) — keep them in sync.

- `users` — account, PBKDF2 password hash, Glicko-2 rating (rating/rd/vol),
  W/L/D counters.
- `sessions` — SHA-256 hashes of bearer tokens; the raw token is an httpOnly
  `dc_session` cookie (90 days).
- `games` — every finished online game (friend and matchmade), moves as
  space-separated UCI, result, and before/after ratings for rated games.

## HTTP API

| Route | Purpose |
| --- | --- |
| `POST /api/auth/register` | Create account (`username`, `password`), sets session cookie. |
| `POST /api/auth/login` | Sign in, sets session cookie. |
| `POST /api/auth/logout` | Clear session. |
| `GET /api/auth/me` | Current account or `{ user: null }`. |
| `GET /api/leaderboard` | Top 100 by rating (players with ≥1 rated game). |
| `GET /api/games/:id` | Archived game for the replay page. |
| `GET /api/users/:username` | Profile + 30 most recent games. |
| `GET /api/users/search?q=` | Username prefix search (min 2 chars, top 10 by games/rating). |

## Websocket protocol additions

The upgrade request's session cookie authenticates the socket (same origin).
New frames on top of `docs/game-server-protocol.md`:

| Type | Data | Purpose |
| --- | --- | --- |
| `queue` | `{ "pool": "3+2" }` | Join rated quick pairing (requires account). Server replies `queued`, then `paired { id, color, token }` for both players. |
| `queueCancel` | none | Leave the queue (`queueCancelled`). |
| `watch` | `{ "id": "AB12CD34" }` | Spectate. Server replies `wstart` with moves, clocks, player names/ratings — nerf ids only once the game has ended. Spectators then receive `move`/`end` broadcasts. |
| `rematch` | none | After a game ends: first sender broadcasts `rematchOffer`; when the opponent also sends it, the server creates a fresh match (colors swapped, new rules/seed, same clock and ratedness) and sends both players `rematched { id, color, token }`. |
| `chat` | `{ "text": "gl hf" }` | Player-to-player chat. Broadcast to both seats as `chat { color, name, text, at }`; the last 50 messages are stored on the match and included in `start`, so transcripts survive reloads. 200-char cap, 500ms per-socket throttle. |

`start` payloads now include `players` (names + ratings) and `rated`.
`end` payloads include `ratings` (before/after per color, rated games) and,
for spectators, `nerfs` (both rules revealed).

## Game URLs

Matchmade games live at `/game/<id>` (8-char code). The paired player holds a
seat token in localStorage and reclaims it via `reconnect`; anyone else
watches live; once the Durable Object archives the match (1 hour after
completion), the same URL serves the stored replay from D1. Friend games are
archived too and replayable at `/game/<code>`.

## Rating

Glicko-2 (`src/lib/glicko.ts`), updated per game inside
`recordFinishedGame` (`src/lib/server/games.ts`), which the Durable Object
calls exactly once per finished match. Friend games are recorded for history
but never rated. The local bot ladder (`src/lib/rating.ts`) is unchanged and
stays on-device.

## Limitations

- The standalone Node server (`server/index.ts`) still speaks only the friend
  protocol — no accounts, queue, or persistence. Matchmaking features require
  the Cloudflare worker (`npm run preview` locally).
- One queue pool (3+2). Add pools in `QUEUE_POOLS` in `worker.ts`.
- Pairing is first-come-first-served, not rating-banded.
