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
| `create` | `{ "timeSec": 600, "incrementSec": 5, "draft": true, "mode": "buff", "picksVisible": false, "invite": "name", "stacked": false, "rated": false }` | Create a waiting game as White. The clock must be within `CUSTOM_GAME_CLOCK` (`src/lib/clockBounds.ts`: base 0 to 7200 s, increment 0 to 60 s) or the reply is `invalid_clock`. `rated: true` makes it a rated custom game; ratings only move when both seats are different accounts. `stacked` (draft only) gives the joiner +2 draft tiers. Each account may open a limited number of new games per ten minutes (`too_many_games`). Anonymous sockets and guest accounts also share a per-client-address limit; full accounts are never limited by address, so one user on a shared address (a school, an office, a carrier NAT) cannot lock the others out. A refused create uses up nothing. `draft`, `mode`, and `picksVisible` are optional and select the Draft ruleset. `mode` picks the section: `"nerf"` (opening nerf pick, hidden until game end, nerf-modifier buffs only on a slow cadence) or `"buff"` (no nerfs at all, nerf-modifier buffs excluded); omitted = the legacy merged rules. `invite` (optional, signed-in hosts only) reserves the Black seat for that username: the game is never listed as an open challenge and other joiners are rejected with `invite_only`. |
| `join` | `{ "id": "A2BCD" }` | Join an unstarted game as Black. |
| `reconnect` | `{ "id": "A2BCD", "color": "w", "token": "..." }` | Resume a reserved seat after reload or a dropped socket. |
| `move` | `{ "u": "e2e4", "ply": 0 }` | Submit a UCI move for server validation. |
| `resign` | none | Resign the current game. |
| `abort` | none | Abort a game before both sides have moved. |
| `claimWin` / `claimDraw` | none | Abandonment claims: end a started, unfinished game once the opponent has been disconnected for 30+ seconds (server-checked; otherwise rejected with `no_claim`). Both end the match with reason "abandonment": `claimWin` awards the win to the caller, `claimDraw` makes it a draw. |
| `drawOffer` / `drawAccept` / `drawDecline` | none | Draw negotiation. |
| `takebackOffer` / `takebackAccept` / `takebackDecline` | none | Takeback negotiation (casual, non-draft games only; rated games reject with `takeback_rated`, draft games with `takeback_draft`). The target is fixed when the offer is made: the offerer's last move, plus the reply if one was already played. Accepting rewinds to that ply even if the offerer has moved since. |
| `rematch` / `rematchCancel` | none | Offer (or accept a pending) rematch once the game is over, or withdraw the offer. |
| `playbot` | `{ "difficulty": "easy" \| "medium" \| "hard", "mode": "nerf" \| "buff", "timeSec", "incrementSec", "color": "w" \| "b" \| "random" }` | Signed-in only: start a rated draft game against a house player. Same clock bounds and creation limit as `create`. |
| `queue` | `{ "pool": "3+2", "mode": "nerf" }` | Join a quick-pairing pool (signed-in sockets only). The queue runs two separate pools, `"nerf"` and `"buff"`; only players in the same mode (and time control) pair. An omitted or unknown `mode` falls back to `"buff"`, which is the pool older clients always queued into. Paired games are rated Draft games in the pool's mode, staking that mode's rating bucket. |
| `queueCancel` | none | Leave the pairing pool. |
| `chat` | `{ "text": "gg" }` | Send an in-game chat message. The text goes through `cleanText` (`src/lib/textInput.ts`: NFC, invisible format and bidi characters removed, 200 code points); profanity is censored and flagged. One message per 500 ms per socket. |
| `schat` | `{ "text": "nice" }` | Spectator chat, for sockets watching a game. Same sanitizer and throttle. A player of the live game (matched by account) cannot post it (`seated_player`) and never receives it, even when watching their own game from another window. |
| `reveal` | none | Show my secret rule to the table (irreversible). |
| `dtPick` | `{ "index": 0 }` | Draft games: take a card from my pending buff offer. |
| `dtBank` | none | Draft games: skip my pending offer and bank +1 tier for the next draft. |
| `dtReroll` | none | Draft games: spend a reroll on my pending offer. |
| `dtUse` | `{ "buffIndex": 0, "picks": [{ "square": 28 }] }` | Draft games: activate a held buff with its collected targets. The server re-walks the buff's own target chain, so invalid targets are rejected. |
| `dtTarget` | `{ "buffIndex": 0, "picks": [] }` | Draft games: ask for the buff's next target request; the server replies with `dtTargetReq`. |
| `dtNerfPick` | `{ "index": 0 }` | Draft games: pick one of my two opening nerf options. Validated by index against the server-dealt options (0 or 1, never a nerf id); the game starts once both seats have picked. |
| `watch` | `{ "id": "A2BCD" }` | Spectate a live game. |
| `watchLeave` | none | Stop spectating. |
| `lobby` | none | Request a lobby snapshot (online players + live games). |
| `p` | none | Application heartbeat while seated or watching; the server runs a flag check and replies with `n`. |
| `hb` | none | Idle heartbeat (lobby, queue). Answered by the platform's auto-response (`{"t":"hb"}`) without waking the game server; keep the frame byte-identical. |
| `adjustOppClock` / `adminGrant` / `seeOppBuffs` / `godRerolls` | `{ "delta" }` / `{ "id" }` / `{ "on" }` / `{ "on" }` | Owner god-panel tools, server-gated to the god-panel accounts (`forbidden` otherwise). Every use is announced to the table. |

### Frame limits and close codes

Every inbound frame passes, in order, a per-socket token bucket (40 frames of
burst, refilled at 10 per second; over it the frame is dropped with at most one
`rate_limited` error per second, and a socket that keeps flooding is closed
with code 1008), a size check (8192 bytes, `frame_too_large`), JSON parsing
(`bad_json`) and a shape check (an object with a string `t` of 1 to 32
characters, `bad_frame`). Handlers validate every field of `d` themselves.
The limits live in `src/lib/server/socketGuard.ts` and `src/lib/socketProtocol.ts`.

| Close code | Meaning | Client behaviour |
| --- | --- | --- |
| 4001 | Seat superseded: the same seat was claimed from another tab or device. | Do not auto-reconnect. `MPSession` emits `superseded` and takes the seat back only on `reclaim()` or when that tab is focused. |
| 1008 | Too many messages. | Treated as an ordinary drop. |
| 1000 | Game expired. | Treated as an ordinary drop. |

## Server Messages

| Type | Data | Purpose |
| --- | --- | --- |
| `created` | `{ "id": "A2BCD", "color": "w", "token": "..." }` | Game code assigned; store `token` privately for reconnect. |
| `start` | setup, color, token, `wc`/`bc`, `moves`, `players`, `rated`, `chat`, optional `preview`, optional `draft`/`mode`/`picksVisible`/`dtActions`/`dtState`/`nerfDraft` | Both seats are present, or a player reconnected; construct the same game and replay accepted UCI moves. `preview` carries the projected rating change per outcome for rated games. Draft games add the public draft action record (`dtActions`, interleaved with moves by ply for exact replay) and this seat's filtered draft state (`dtState`). While the opening nerf draft is unresolved they add `nerfDraft` instead: both sides' two options, this seat's own pick index (or `null`), and whether the opponent has picked. |
| `move` | `{ "u", "ply", "wc", "bc" }` | Accepted move and authoritative clocks in milliseconds. |
| `end` | `{ "result", "wc", "bc", "ratings?", "nerfs?", "draftBuffs?" }` | Authoritative terminal result; rating changes for rated games, and the revealed rules for spectators. Draft games add each side's held buffs (public all game, repeated for post-game screens). |
| `queued` / `paired` / `queueCancelled` | pairing pool events | `queued` and `paired` carry `pool` and `mode`; `paired` adds `{ id, color, token }` for the new game. |
| `chat` | `{ "color", "name", "text", "at" }` | Relayed chat message (censored server-side when profane). |
| `wstart` | watch payload | Spectator joined: game snapshot with `moves`, `players`, clocks, `watchers`, and `nerfs` once over. Draft games add `draft`, `mode` (when the game runs a section), `dtActions`, and a spectator-safe `dtState` (held buffs and board effects only; never offers, pending markers, flags, or reveals). |
| `dtOffer` | `{ "color", "cards", "index", "banked?" }` | Draft games: a buff offer rolled. Sent only to the drafting seat, plus the opposing seat when the match has `picksVisible`. Never sent to spectators. |
| `dtResolved` | `{ "color", "kind": "picked" or "banked", "cards?" }` | Draft games: the public outcome of a draft. Picked cards become public the moment they are held; a bank reveals only that it happened. Broadcast to both seats and spectators. |
| `dtUsed` | `{ "color", "buffIndex", "picks" }` | Draft games: a held buff was activated with these targets. Broadcast to both seats and spectators so replicas can reproduce the board mutation. |
| `dtState` | `{ "state" }` | Draft games: the receiving seat's filtered draft state (own offer, flags, and one-shot reveal snapshot; opponent state stripped of those unless `picksVisible`). Sent per seat after every offer roll and resolution; never sent to spectators. |
| `dtTargetReq` | `{ "buffIndex", "target" }` | Draft games: reply to `dtTarget` with the buff's next target request, or `null` when the pick chain is complete. |
| `dtNerfPicked` | `{ "color" }` | Draft games: a seat locked in its opening nerf pick. Progress only, the pick's identity stays hidden. Sent to both seats, never to spectators. |
| `watchers` | `{ "n" }` | Live spectator count, sent to players and watchers. |
| `lobby` | `{ "players", "anonymous", "games", "challenges", "seeks" }` | Lobby snapshot reply. Each live game and open challenge carries `draft` plus `mode` when the match runs a section (`"nerf"` or `"buff"`; omitted for legacy merged-rules matches). Each seek carries the `mode` of the pool it waits in, plus the seeker's rating in that mode's bucket; answering a seek must queue with the same `pool` and `mode`. Clients use `mode` to color-code listings (Nerf red, Buff blue) and render no badge when it is absent. |
| `drawOffer` / `drawDeclined` / `rematchOffer` / `rematched` | negotiation events | |
| `takebackOffer` / `takebackDeclined` | `{ "color" }` | Takeback negotiation events. Moving past an opponent's request declines it. |
| `takeback` | `{ "by", "moves", "ply", "wc", "bc" }` | Accepted takeback: the authoritative rewound move list; rebuild the game from it (players and spectators). |
| `opponentGone` | none | Opponent websocket disconnected. |
| `error` | `{ "code", "message" }` | Rejected request or illegal/stale move. Guard codes: `rate_limited`, `frame_too_large`, `bad_json`, `bad_frame`, `too_many_games`, `seated_player`, `invalid_clock`. |
| `schat` | `{ "name", "text", "at" }` | Relayed spectator chat, to watchers only (never to the live game's players). |
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
visible or the browser comes back online. The one exception is close code 4001
(see above): a seat taken over by another tab stays with that tab until this
one is focused or calls `reclaim()`, so two tabs never pass the seat back and
forth.

Clocks have a start-of-game grace period: each side's first move gets 15 free
seconds before its clock starts charging, so a slow page load never costs time.

## Draft games

Friend games created with `draft: true` run the Draft ruleset (buff drafts on
a move cadence, see `docs/draft-system.md`). Server rules:

- Friend and challenge Draft games are always casual: `create` never honors
  a rated request, whatever the client asks. Quick-pairing queue games are
  rated, under per-mode rating buckets: a queue game in the Nerf pool moves
  only the players' Nerf ratings, one in the Buff pool only their Buff
  ratings (Glicko-2, same math the legacy speed buckets used). A mode bucket
  is seeded from the account's legacy shared rating on first contact.
- `mode` splits Draft games into the site's two sections. Buff mode
  (`"buff"`): no nerfs at all (both seats run the unrestricted `none` rule,
  the opening nerf draft is skipped and the game starts like a classic one)
  and the buff pool excludes the nerf-modifier category. Nerf mode
  (`"nerf"`): the opening nerf pick stays, the pool contains ONLY
  nerf-modifier cards, and the cadence stretches to 10 own moves. Queue
  games run the mode of the pool they were queued into. Matches without a
  mode keep the legacy merged rules so stored games replay unchanged, but no
  current UI creates them.
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

## Internal HTTP routes

Reachable only through the Durable Object stub from server code (the public
worker forwards just the socket path, `/healthz`, `/api/lobby` and `/arena/*`):

- `GET /live-game?userId=` : the started game a user occupies, for the profile card.
- `POST /tournament/create-game` : a tournament board with both seats assigned. Clock bounds are `TOURNAMENT_CLOCK`.
- `GET /mod/online` : `{ humans, humansOnline, guests, anonymousSockets, peakHumansToday, peakAt, peakDay, publicFigure, at }`. `humans` counts distinct signed-in accounts with an open socket, leaving out house bots (`hp_`), the seeded roster (`seed_`) and test accounts (`polish_`); guests are included and also counted in `guests`. `peakHumansToday` is the UTC day's maximum of `humans`, sampled at every socket connect. `publicFigure` is the unchanged public online number (`players.length + anonymous` on `/lobby`), echoed for comparison. For the mod panel only.

`GET /healthz` is public: it reports counts and booleans (`db.lastError`,
`house.tickError`, `house.seedError`, `house.lastDesync`,
`house.lastEngineReject` are true when something failed), never error text,
stacks, game ids or draft actions; those go to the worker log.
