# Game Server Protocol

Friend games use a dedicated authoritative websocket service at `/socket/v1`.
Frames are JSON objects with a short event name and optional data:

```json
{ "t": "move", "d": { "u": "e2e4", "ply": 0 } }
```

This follows the practical conventions used by Lichess live games: a websocket
transport, compact `{ "t", "d" }` event envelopes, UCI move strings, server
clock updates, and liveness pings. It is a Drawback Chess protocol, not a
drop-in Lichess endpoint.

References:

- Lichess websocket service: https://github.com/lichess-org/lila-ws
- Lichess live-round client: https://github.com/lichess-org/lila/tree/master/ui/round

## Client Messages

| Type | Data | Purpose |
| --- | --- | --- |
| `create` | `{ "timeSec": 600, "incrementSec": 5 }` | Create a waiting game as White. |
| `join` | `{ "id": "A2BCD" }` | Join an unstarted game as Black. |
| `move` | `{ "u": "e2e4", "ply": 0 }` | Submit a UCI move for server validation. |
| `resign` | none | Resign the current game. |
| `p` | none | Application heartbeat; server replies with `n`. |

## Server Messages

| Type | Data | Purpose |
| --- | --- | --- |
| `created` | `{ "id": "A2BCD", "color": "w" }` | Game code assigned. |
| `start` | setup, color, and `wc`/`bc` | Both seats are present; construct the same initial game. |
| `move` | `{ "u", "ply", "wc", "bc" }` | Accepted move and authoritative clocks in milliseconds. |
| `end` | `{ "result", "wc", "bc" }` | Authoritative terminal result. |
| `opponentGone` | none | Opponent websocket disconnected. |
| `error` | `{ "code", "message" }` | Rejected request or illegal/stale move. |
| `n` | optional clocks | Heartbeat reply. |

The browser does not apply a submitted move until it receives `move` from the
server. The server runs the same drawback engine as the UI, verifies the side
to move and UCI legality, and owns clocks, increments, flag falls, and
resignations.
