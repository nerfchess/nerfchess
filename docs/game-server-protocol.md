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
| `p` | none | Application heartbeat; server replies with `n`. |

## Server Messages

| Type | Data | Purpose |
| --- | --- | --- |
| `created` | `{ "id": "A2BCD", "color": "w", "token": "..." }` | Game code assigned; store `token` privately for reconnect. |
| `start` | setup, color, token, `wc`/`bc`, and `moves` | Both seats are present, or a player reconnected; construct the same game and replay accepted UCI moves. |
| `move` | `{ "u", "ply", "wc", "bc" }` | Accepted move and authoritative clocks in milliseconds. |
| `end` | `{ "result", "wc", "bc" }` | Authoritative terminal result. |
| `opponentGone` | none | Opponent websocket disconnected. |
| `error` | `{ "code", "message" }` | Rejected request or illegal/stale move. |
| `n` | optional clocks | Heartbeat reply. |

The browser does not apply a submitted move until it receives `move` from the
server. The server runs the same nerf engine as the UI, verifies the side
to move and UCI legality, and owns clocks, increments, flag falls, and
resignations.

Browsers store only their own seat token in local storage. Reloading the page
opens a new websocket and sends `reconnect`; the server reattaches that seat and
returns `start` with the authoritative accepted move history. A short disconnect
grace period prevents normal reloads from immediately notifying the opponent.
