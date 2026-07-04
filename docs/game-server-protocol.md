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
| `create` | `{ "timeSec": 600, "incrementSec": 5, "draft": true, "picksVisible": false }` | Create a waiting game as White. `draft` and `picksVisible` are optional and select the Draft ruleset (always casual). |
| `join` | `{ "id": "A2BCD" }` | Join an unstarted game as Black. |
| `reconnect` | `{ "id": "A2BCD", "color": "w", "token": "..." }` | Resume a reserved seat after reload or a dropped socket. |
| `move` | `{ "u": "e2e4", "ply": 0 }` | Submit a UCI move for server validation. |
| `resign` | none | Resign the current game. |
| `drawOffer` / `drawAccept` / `drawDecline` | none | Draw negotiation. |
| `takebackOffer` / `takebackAccept` / `takebackDecline` | none | Takeback negotiation (casual games only; rated games reject with `takeback_rated`). Accepting rewinds the offerer's last move, plus the reply if one was already played. |
| `rematch` | none | Offer (or accept a pending) rematch once the game is over. |
| `queue` | `{ "pool": "3+2" }` | Join the rated quick-pairing pool (signed-in sockets only). |
| `queueCancel` | none | Leave the pairing pool. |
| `chat` | `{ "text": "gg" }` | Send an in-game chat message (profanity is censored and flagged). |
| `dtPick` | `{ "index": 0 }` | Draft games: take a card from my pending buff offer. |
| `dtBank` | none | Draft games: skip my pending offer and bank +1 tier for the next draft. |
| `dtUse` | `{ "buffIndex": 0, "picks": [{ "square": 28 }] }` | Draft games: activate a held buff with its collected targets. The server re-walks the buff's own target chain, so invalid targets are rejected. |
| `dtTarget` | `{ "buffIndex": 0, "picks": [] }` | Draft games: ask for the buff's next target request; the server replies with `dtTargetReq`. |
| `dtNerfPick` | `{ "index": 0 }` | Draft games: pick one of my two opening nerf options. Validated by index against the server-dealt options (0 or 1, never a nerf id); the game starts once both seats have picked. |
| `watch` | `{ "id": "A2BCD" }` | Spectate a live game. |
| `watchLeave` | none | Stop spectating. |
| `lobby` | none | Request a lobby snapshot (online players + live games). |
| `p` | none | Application heartbeat; server replies with `n`. |

## Server Messages

| Type | Data | Purpose |
| --- | --- | --- |
| `created` | `{ "id": "A2BCD", "color": "w", "token": "..." }` | Game code assigned; store `token` privately for reconnect. |
| `start` | setup, color, token, `wc`/`bc`, `moves`, `players`, `rated`, `chat`, optional `preview`, optional `draft`/`picksVisible`/`dtActions`/`dtState`/`nerfDraft` | Both seats are present, or a player reconnected; construct the same game and replay accepted UCI moves. `preview` carries the projected rating change per outcome for rated games. Draft games add the public draft action record (`dtActions`, interleaved with moves by ply for exact replay) and this seat's filtered draft state (`dtState`). While the opening nerf draft is unresolved they add `nerfDraft` instead: both sides' two options, this seat's own pick index (or `null`), and whether the opponent has picked. |
| `move` | `{ "u", "ply", "wc", "bc" }` | Accepted move and authoritative clocks in milliseconds. |
| `end` | `{ "result", "wc", "bc", "ratings?", "nerfs?", "draftBuffs?" }` | Authoritative terminal result; rating changes for rated games, and the revealed rules for spectators. Draft games add each side's held buffs (public all game, repeated for post-game screens). |
| `queued` / `paired` / `queueCancelled` | pairing pool events | `paired` carries `{ id, color, token }` for the new game. |
| `chat` | `{ "color", "name", "text", "at" }` | Relayed chat message (censored server-side when profane). |
| `wstart` | watch payload | Spectator joined: game snapshot with `moves`, `players`, clocks, `watchers`, and `nerfs` once over. Draft games add `draft`, `dtActions`, and a spectator-safe `dtState` (held buffs and board effects only; never offers, pending markers, flags, or reveals). |
| `dtOffer` | `{ "color", "cards", "index", "banked?" }` | Draft games: a buff offer rolled. Sent only to the drafting seat, plus the opposing seat when the match has `picksVisible`. Never sent to spectators. |
| `dtResolved` | `{ "color", "kind": "picked" or "banked", "cards?" }` | Draft games: the public outcome of a draft. Picked cards become public the moment they are held; a bank reveals only that it happened. Broadcast to both seats and spectators. |
| `dtUsed` | `{ "color", "buffIndex", "picks" }` | Draft games: a held buff was activated with these targets. Broadcast to both seats and spectators so replicas can reproduce the board mutation. |
| `dtState` | `{ "state" }` | Draft games: the receiving seat's filtered draft state (own offer, flags, and one-shot reveal snapshot; opponent state stripped of those unless `picksVisible`). Sent per seat after every offer roll and resolution; never sent to spectators. |
| `dtTargetReq` | `{ "buffIndex", "target" }` | Draft games: reply to `dtTarget` with the buff's next target request, or `null` when the pick chain is complete. |
| `dtNerfPicked` | `{ "color" }` | Draft games: a seat locked in its opening nerf pick. Progress only, the pick's identity stays hidden. Sent to both seats, never to spectators. |
| `watchers` | `{ "n" }` | Live spectator count, sent to players and watchers. |
| `lobby` | `{ "players", "anonymous", "games" }` | Lobby snapshot reply. |
| `drawOffer` / `drawDeclined` / `rematchOffer` / `rematched` | negotiation events | |
| `takebackOffer` / `takebackDeclined` | `{ "color" }` | Takeback negotiation events. Moving past an opponent's request declines it. |
| `takeback` | `{ "by", "moves", "ply", "wc", "bc" }` | Accepted takeback: the authoritative rewound move list — rebuild the game from it (players and spectators). |
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

## Draft games

Friend games created with `draft: true` run the Draft ruleset (buff drafts on
a move cadence, see `docs/draft-system.md`). Server rules:

- Draft games are always casual. The server never rates a draft match,
  whatever the client asks, and the quick-pairing queue never creates one.
- When the second seat arrives, the server deals the opening nerf draft
  instead of starting the game: two nerf options per seat, all four distinct,
  drawn from the match seed RNG. Each seat's two options share a tier and the
  two seats' tiers sit within one of each other (the same fairness rule
  classic games use for their nerf pair). Both sides' options are public; the
  chosen index is not. The match stays un-started, so the clocks do not run
  and `move` and draft frames are rejected with `nerf_pending` until both
  seats have sent `dtNerfPick`. Reconnecting mid-draft replays `start` with
  the seat's options and own pick state. With `picksVisible`, both chosen
  rules are revealed the moment the game starts. Spectators joining during
  the nerf draft get the normal waiting-for-start payload and never receive
  options or picks.
- The server runs the same draft engine as the client. Offers roll inside its
  authoritative `playMove`; the draft RNG seed and state are never sent to any
  client, since they would let a client predict every future offer.
- A seat with a pending offer cannot move: `move` frames are rejected with
  the error code `draft_pending` until the seat sends `dtPick` or `dtBank`.
- Visibility is filtered in one place server-side: pending offer cards go to
  the offer's own seat (plus the opposing seat when the match was created
  with `picksVisible`); draft flags and one-shot reveal snapshots are
  per-seat secrets; held buffs, board effects, and tempo counters are public.
  Spectators never receive offers, pending markers, flags, or reveals.
- Reconnects and Durable Object restarts rebuild the exact state by replaying
  moves and the stored draft action record interleaved by ply through the
  engine, so board mutations from buffs and the RNG stream reproduce exactly.
- Takebacks are rejected in draft games (`takeback_draft`): rolled offers,
  consumed RNG, and applied buffs cannot rewind.

This document describes the production server (`worker.ts`, a Cloudflare
Durable Object). The standalone Node server in `server/` implements an older
subset of this protocol (no queue, chat, spectate, or draft frames) and is
only suitable for self-hosted classic friend games.
