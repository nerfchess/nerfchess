# Tier 2 — House-vs-house arena (full bot-vs-bot offload)

**Goal:** move the *entire* bot-vs-bot simulation to a long-lived OCI "arena" process —
orchestration, play, clocks, and state held in RAM. The Durable Object is reduced to
**lobby/TV display** and **rating/archive persistence**. Per-move DO cost for filler games
drops to ~0 (relay only to *active* spectators).

Depends on Tier 1 having proven the OCI engine bundle + transport. Bot-vs-**human** games
stay on the DO and keep using the Tier-1 engine service. Only bot-vs-**bot** leaves.

## Why this is possible (and why it wasn't for human games)

The DO does an O(plies) replay every access only because it's **hibernatable** — it discards
game state between events and rebuilds. A long-lived arena process **doesn't**: it holds each
game's `NerfGame` in RAM and calls `playMove` incrementally — **O(1)/move, no replay**.

Bot-vs-bot games have **no human anchor**, so OCI can be the sole authority. The DO only needs
them for things humans actually touch:

| DO's remaining job per bot-vs-bot game | Cost |
|---|---|
| Show it in lobby / TV | tiny, on change only |
| Relay live moves to spectators | per-move **only while watched**; 0 otherwise |
| Rate + archive on completion | one write per finished game |

Filler games are unwatched the vast majority of the time, so DO per-move cost is ~0 for the
majority. This is what lets bot-vs-bot scale far past 18 at near-zero DO load.

## Components

- **A. Arena service** (OCI, stateful) — owns bot-vs-bot orchestration + simulation.
- **B. DO `/arena` control channel** — ingestion + spectator relay + stand-down signalling.
- **C. Lobby/TV integration** — surface arena games alongside DO-native matches.
- **D. Rating + archive ingest** — apply Glicko + `recordFinishedGame` on completion.
- **E. In-DO changes** — remove the house-vs-house path; keep bot-vs-human (Tier 1).

---

### A. Arena service (OCI)

Owns everything currently in `houseTick` that concerns **bot-vs-bot** (seek/pair, mode/pool
weighting, house-vs-house spawn, caps) plus the per-move play loop currently in
`playHouseAction`.

Per game, in RAM:
- both seats engine-driven via `pickHouseMove` (Tier-1 bundle already has it),
- local clocks + human-like pacing (`houseThinkMs`, `houseDraftThinkMs`),
- draft resolution (`aiDraftChoice`, `aiChooseBuffActivation`),
- game-end detection (`checkLossConditions`, flag on clock),
- **no replay** — state persists in memory across moves.

Concurrency: many games in parallel (async is enough; it's bursty CPU). The `houseVsHouseCap`
lives here now and can be much higher than 18. Persists nothing durably itself — the DO owns
the durable record.

**Transport:** the arena opens **one** persistent authenticated WebSocket *into* the DO
(a dedicated `/arena` route, bearer `ARENA_TOKEN`). This is the crucial distinction from
"bots as clients": **one** control socket carrying all bot-vs-bot games, not ~36 player
sockets — and it's near-silent when nothing is being watched.

---

### B. DO `/arena` control channel

New authenticated WS route on the DO. `ARENA_TOKEN` secret; reject unauthenticated upgrades.

**Arena → DO:**

| msg | effect on DO |
|---|---|
| `game_open { gameId, players:{w,b}, ratings, mode, pool, timeSec, startedAt }` | register in `externalGames` map (lobby/TV) |
| `move { gameId, ply, uci, boardFrame, clocks }` | relay to spectators subscribed to `gameId`; else drop (optionally keep latest frame) |
| `draft { gameId, ... }` | same relay |
| `game_end { gameId, result, moves[], draftActions[], ratedFlag, replayVersion }` | apply ratings + archive (D); drop from `externalGames`; send end frame to spectators |

**DO → Arena:**

| msg | effect on arena |
|---|---|
| `watch { gameId }` / `unwatch { gameId }` | start/stop streaming per-move frames for that game (bandwidth: only stream watched games) |
| `stand_down` / `resume` | mirrors `house_enabled` + "human present anywhere" — arena runs only while a human is connected (preserves today's stand-down rule) |
| `cap { maxGames }` | optional runtime tuning |

Keep an in-DO `externalGames: Map<gameId, ExternalGameMeta>` (in memory, optionally mirrored
to storage for restart). Entries look enough like matches to slot into existing lobby/TV
queries (players, ratings, timeSec, moveCount, mode).

---

### C. Lobby / TV integration

- Wherever the DO builds the **lobby list** and **TV "current games"**, union DO-native
  matches with `externalGames`.
- **Spectating** an external game: when a human opens `gameId ∈ externalGames`, the DO sends
  `watch{gameId}` to the arena, subscribes that socket, relays frames, and sends `unwatch`
  when the last spectator leaves.
- Flower avatars + leaderboard treatment unchanged — these are the same `hp_` accounts.

---

### D. Rating + archive ingest

On `game_end`:
- Apply Glicko to **both** house accounts using the same rating path `endMatch` uses today
  (both seats are house accounts).
- Archive via `recordFinishedGame` (`src/lib/server/games.ts`, dual-write PG/D1) so bot-vs-bot
  games appear in history / TV replay / DB exactly like now.
- **Stamp `replayVersion`** on the archived record. This matters: the stored move list must
  **replay correctly later** under the DO's constants for TV replay + DB integrity. So the
  arena's engine must stay version-locked to the Worker's `REPLAY_VERSION` — same lockstep
  discipline as Tier 1, enforced at archive time.

**Trust boundary:** the arena reports results the DO applies to ratings. It can move **only
house-account** ratings — no human stakes — so the blast radius is trivial. Gate `/arena`
with the bearer token and accept it. (A full DO-side replay-to-verify would reintroduce the
very cost we removed; skip it.)

---

### E. In-DO changes

- **`houseTick`:** remove the house-vs-house **spawn + play** path (moves to the arena). Keep
  the **bot-vs-human pickup** path — a lone queued human still gets a house opponent, and
  *that* game runs on the DO using Tier-1 remote search.
- **Stand-down + `house_enabled`:** the DO forwards these to the arena over the control channel
  instead of acting on them locally for bot-vs-bot.
- **Caps:** `houseVsHouseCap` / bot-vs-bot `houseTotalGamesCap` now enforced in the arena (and
  can be raised a lot). Bot-vs-human game cap stays in the DO.
- **Arena disconnect handling:** if the `/arena` WS drops, the DO clears (or marks aborted,
  unrated) all `externalGames` so the lobby doesn't show ghost games. Bot-vs-human games are
  DO-hosted and unaffected.

---

## Load outcome

- **Unwatched** bot-vs-bot game: DO cost = 1 `game_open` + 1 `game_end` + rating/archive.
  **Zero per-move.**
- **Watched:** + per-move relay, only while watched.
- vs today (DO did replay + search + commit + storage every move for all ~18 games): a large
  shed, and it scales — 100 unwatched bot games cost the DO almost nothing.

## Risks / caveats

- **Biggest build:** a new stateful service + a DO protocol + lobby/TV integration.
- **`/arena` is privileged** — it can inject games and move house-account ratings. Strong auth
  (bearer/service token), and treat the channel as trusted infra.
- **Version-lockstep on the archive** — stored bot-vs-bot moves must replay under the Worker's
  constants. Deploy arena from the same commit; stamp `replayVersion`; CI-check that a sample
  of arena-produced games replays cleanly in the DO viewer.
- **Clock authority** — arena owns clocks for bot-vs-bot (fine; no human to dispute).
- **Restart semantics** — on arena crash, in-flight games are lost; DO aborts them unrated.
  Acceptable for filler.

## Sequencing within Tier 2

1. **Headless first:** arena runs games in RAM, reports only `game_open` / `game_end` (no live
   streaming). External games show in lobby as "in progress" and results archive. Validates the
   rating/archive path with the least surface.
2. **Add spectating:** `watch`/`unwatch` + live move streaming for TV.
3. **Full cutover:** move orchestration + caps entirely; delete the in-DO house-vs-house path.

## Relationship to Tier 1

Tier 1 and Tier 2 compose:

| | Moves to OCI | DO keeps | Shed |
|---|---|---|---|
| **Tier 1 (engine service)** | search for bot-vs-**human** moves | replay + commit + framing (human needs it) | search CPU |
| **Tier 2 (arena)** | *entire* bot-vs-**bot** simulation | lobby/TV display + rating/archive | replay **+** search **+** game-hosting for the unwatched majority |

After both: essentially all bot CPU leaves Cloudflare, and the game-hosting load for the
unwatched filler majority leaves too. The DO does real per-move work for a bot game only when
a human is **in** one (Tier 1 game) or **watching** one (Tier 2 spectated game).
