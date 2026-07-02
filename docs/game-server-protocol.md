# Game Server Protocol

Friend games use a dedicated authoritative websocket service at `/socket/v1`.
Frames are JSON objects with a short event name and optional data:

```json
{ "t": "move", "d": { "u": "e2e4", "ply": 0 } }
```

This follows the practical conventions used by Lichess live games: a websocket
transport, compact `{ "t", "d" }` event envelopes, UCI move strings, server
clock updates, and liveness pings. It is a Nerf Chess protocol, not a
drop-in Lichess endpoint.

References:

- Lichess websocket service: https://github.com/lichess-org/lila-ws
- Lichess live-round client: https://github.com/lichess-org/lila/tree/master/ui/round

## Client Messages

| Type | Data | Purpose |
| --- | --- | --- |
| `create` | `{ "timeSec": 600, "incrementSec": 5 }` | Create a waiting game as White. |
| `join` | `{ "id": "A2BCD" }` | Join an unstarted game as Black. |
| `reconnect` | `{ "id": "A2BCD", "color": "w", "token": "..." }` | Resume a reserved seat after reload or a dropped socket. |
| `move` | `{ "u": "e2e4", "ply": 0 }` | Submit a UCI move for server validation. |
| `resign` | none | Resign the current game. |
| `drawOffer` / `drawAccept` / `drawDecline` | none | Draw negotiation. |
| `rematch` | none | Offer (or accept a pending) rematch once the game is over. |
| `queue` | `{ "pool": "3+2" }` | Join the rated quick-pairing pool (signed-in sockets only). |
| `queueCancel` | none | Leave the pairing pool. |
| `chat` | `{ "text": "gg" }` | Send an in-game chat message (profanity is censored and flagged). |
| `watch` | `{ "id": "A2BCD" }` | Spectate a live game. |
| `watchLeave` | none | Stop spectating. |
| `lobby` | none | Request a lobby snapshot (online players + live games). |
| `p` | none | Application heartbeat; server replies with `n`. |

## Server Messages

| Type | Data | Purpose |
| --- | --- | --- |
| `created` | `{ "id": "A2BCD", "color": "w", "token": "..." }` | Game code assigned; store `token` privately for reconnect. |
| `start` | setup, color, token, `wc`/`bc`, `moves`, `players`, `rated`, `chat`, optional `preview` | Both seats are present, or a player reconnected; construct the same game and replay accepted UCI moves. `preview` carries the projected rating change per outcome for rated games. |
| `move` | `{ "u", "ply", "wc", "bc" }` | Accepted move and authoritative clocks in milliseconds. |
| `end` | `{ "result", "wc", "bc", "ratings?", "nerfs?" }` | Authoritative terminal result; rating changes for rated games, and the revealed rules for spectators. |
| `queued` / `paired` / `queueCancelled` | pairing pool events | `paired` carries `{ id, color, token }` for the new game. |
| `chat` | `{ "color", "name", "text", "at" }` | Relayed chat message (censored server-side when profane). |
| `wstart` | watch payload | Spectator joined: game snapshot with `moves`, `players`, clocks, `watchers`, and `nerfs` once over. |
| `watchers` | `{ "n" }` | Live spectator count, sent to players and watchers. |
| `lobby` | `{ "players", "anonymous", "games" }` | Lobby snapshot reply. |
| `drawOffer` / `drawDeclined` / `rematchOffer` / `rematched` | negotiation events | |
| `opponentGone` | none | Opponent websocket disconnected. |
| `error` | `{ "code", "message" }` | Rejected request or illegal/stale move. |
| `n` | optional clocks | Heartbeat reply. |

The browser does not apply a submitted move until it receives `move` from the
server. The server runs the same nerf engine as the UI, verifies the side
to move and UCI legality, and owns clocks, increments, flag falls, and
resignations.

Browsers store only their own seat token in local storage. Reloading the page
opens a new websocket and sends `reconnect`; the server reattaches that seat and
returns `start` with the authoritative accepted move history (and a trailing
`end` frame if the game finished while the player was away). A short disconnect
grace period prevents normal reloads from immediately notifying the opponent.
The client (`MPSession`) also reconnects automatically with backoff whenever a
seated or spectating socket drops, and retries immediately when the tab becomes
visible or the browser comes back online.

Clocks have a start-of-game grace period: each side's first move gets 15 free
seconds before its clock starts charging, so a slow page load never costs time.

This document describes the production server (`worker.ts`, a Cloudflare
Durable Object). The standalone Node server in `server/` implements an older
subset of this protocol (no queue, chat, spectate frames in the same shape) and
is only suitable for self-hosted friend games.
