# Tier 2 · M1 — Arena service (bot-vs-bot in RAM on Tokyo)

**Goal:** a standalone, long-lived Node service on the Tokyo box that runs
house-vs-house (bot-vs-bot) games entirely in memory with the bundled engine —
holding each `NerfGame` in RAM and applying moves incrementally, so there is
**no O(plies) replay** and no per-tick CPU cap. It reproduces the DO's filler
orchestration and per-game lifecycle faithfully, and emits lifecycle events
through a pluggable **sink**.

**M1 is deliberately isolated: it touches nothing in production.** No DO
connection, no D1/Postgres, no lobby/TV, no rating writes. Its games aren't
shown anywhere yet — M1 exists to prove the arena can run faithful games and
produce archive-ready, replayable records. The sink is a logger + a local
status endpoint; **M2 swaps the sink for the DO `/arena` WebSocket client.**

This is the port target — keep it in lockstep with these DO functions:
- `houseTick` ([worker.ts:2242](../worker.ts)) — filler spawn, caps, spacing, seek/stand-down (the bot-vs-bot parts only).
- `startHouseVsHouseGame` ([worker.ts:2850](../worker.ts)) + `newHouseMatchRecord` ([worker.ts:2777](../worker.ts)) — game setup.
- `armBotAction` ([worker.ts:2199](../worker.ts)) — action pacing/timers.
- `playHouseAction` ([worker.ts:2499](../worker.ts)) — the one-action-per-step loop (nerf pick, buff-offer resolve, buff activation, move).
- `currentClocks` / `finishOnFlag` ([worker.ts:1307](../worker.ts)) + `firstMoveGraceMs` — clock model.

---

## Non-goals (belong to later milestones)
- DO `/arena` ingestion, lobby/TV visibility, spectator streaming — **M2/M3**.
- Rating (Glicko) application + `recordFinishedGame` archive — **M2 (the DO does it on `game_end`)**.
- Removing the in-DO house-vs-house path from `houseTick` — **M4 cutover**.
- Bot-vs-**human** games — never the arena's job (they stay on the DO; Tier 1 handles their search).

---

## Process model
- One long-lived Node 20 process, `nerfchess-arena.service` (systemd), on Tokyo, **separate** from `nerfchess-engine.service`.
- Single JS thread. Engine searches are ≤80ms and spread across per-game pacing timers (1–4s between actions), so concurrent games do not starve each other. `worker_threads` for search is an **optional** later optimization, not needed for M1's game counts.
- Holds all live games in an in-memory `Map<gameId, ArenaGame>`. Crash = in-flight games lost (acceptable for filler; M2's DO side marks them aborted/unrated).

## Reused repo code + the bundle
Bundled exactly like the Tier-1 engine service (`esbuild`, `src/engine` has zero external deps):
- **Engine** (`src/engine/*`): `newGame`, `enableDraftMode`, `playMove`, `legalMoves`, `checkLossConditions`, `resign`, `activateBuff`, `pickDraftCard`, `bankDraft`, `aiDraftChoice`, `aiChooseBuffActivation`, `moveToUCI`; `PLAYABLE_NERFS`, `openingNerfPool`, `pickNerfPair`, `UNRESTRICTED_NERF` (`src/engine/nerfs/library`); `NERF_MODE_CADENCE`, `DEFAULT_CADENCE` (`src/engine/draft`).
- **Bots** (`src/lib/server/bots`): `HOUSE_ROSTER`, `HousePersona`, `HouseSkill`, `pickHouseMove`, `houseThinkMs`, `houseDraftThinkMs`, `houseNerfPickIndex`, `houseSeedRating`, `pickHouseSeek`.
- **Small helpers/tables to duplicate** (currently private to worker.ts, not worth extracting for M1): `QUEUE_POOLS` (time controls), `makeSeed()` (random 32-bit), id/token generators, `firstMoveGraceMs`, and the cap constants. Keep values identical to worker.ts.

> Recommended: put the shared record/enum types (`EngineMatch`, `StoredDraftAction`, the `ArenaFinishedRecord` shape below) in a small `src/lib/arena/types.ts` so M2's DO side imports the exact same types.

---

## In-RAM game model

```ts
type Color = "w" | "b";

interface ArenaGame {
  id: string;
  mode: "nerf" | "buff";
  pool: string;                 // e.g. "3+0"
  timeSec: number;
  incrementSec: number;
  seats: Record<Color, { personaId: string; skill: HouseSkill; name: string; rating: number }>;

  // Live engine state — the whole point: kept in RAM, mutated in place, never replayed.
  game: NerfGame | null;        // null until the opening nerf draft finalizes (nerf mode)

  // Deterministic record, appended as we play — this is what M2 archives.
  seed: number;
  draftSeed: number;
  cadence: number;
  nerf: { w: string; b: string } | null;   // chosen opening nerfs (buff mode: UNRESTRICTED)
  moves: string[];              // UCI, in order
  draftActions: StoredDraftAction[]; // same discriminated union as worker.ts:89

  // Clocks + scheduling
  clocks: Record<Color, number>;   // ms remaining
  runningSince: number | null;     // epoch ms the active clock started counting
  startedAt: number | null;
  // opening nerf draft (nerf mode, pre-start)
  nerfOptions: Record<Color, string[]> | null;
  nerfPicks: Partial<Record<Color, number>>;

  nextActionAt: number;         // epoch ms — when the scheduler should act (mirrors botActAt)
  timer: NodeJS.Timeout | null;
  result: { winner: Color | "draw" | null; reason: string } | null;
}
```

## Orchestration loop (port of `houseTick`'s filler path)

A periodic supervisor (`setInterval`, ~1s) that only manages **spawning** — each
game drives its own actions via its own timer (below), so the supervisor never
runs engine work in a batch (no `houseMaxActionsPerTick`/`houseTickBudgetMs`
needed; those caps existed only for the single-thread alarm).

Per tick:
1. **Run/pause gate.** If `enabled === false` (config or M2's `stand_down`), end all live games as unrated draws (mirror the pause branch [worker.ts:2244](../worker.ts)) and stop.
2. **Reap** finished games from the map; free their personas.
3. **Enforce caps + spacing.** If `liveGames < ARENA_MAX_GAMES` (= `houseVsHouseCap`, 18) and `now >= nextFillerAt`, and ≥2 personas are free, spawn one game with two random free personas (mirror [worker.ts:2526](../worker.ts)); set `nextFillerAt = now + 4000 + rand(6000)`.
   - "Free" = a persona not currently seated in a live game. (M1 has no seek queue — seeks are a lobby-visibility concept; skip them until M2 optionally mirrors them.)

Caps/spacing constants (copy from worker.ts): `houseVsHouseCap = 18`, filler spacing `4000 + rand(6000)`.

## Per-game lifecycle & scheduling

Each game schedules its own next action with a real timer — no global alarm.
`schedule(g)` sets `g.timer = setTimeout(() => step(g), g.nextActionAt - Date.now())`.
`step(g)` performs **exactly one** action (like `playHouseAction`), recomputes
`nextActionAt` (like `armBotAction`), and re-schedules. All logic wrapped so one
game throwing kills only that game (mirror the retire behavior at [worker.ts:2362](../worker.ts)).

### 1. Setup (port `startHouseVsHouseGame` + `newHouseMatchRecord`)
- Pick `{pool, mode} = pickHouseSeek(rng)`; random seat colors.
- `seed = makeSeed()`, `draftSeed = makeSeed()`, `cadence = mode==="nerf" ? NERF_MODE_CADENCE : DEFAULT_CADENCE`, clocks = `timeSec*1000` each.
- Seat rating = `houseSeedRating(persona)` (M1 has no DB; real live ratings arrive in M2 when the DO owns the record — the engine plays off `skill`, not rating, so this only affects display metadata).
- **buff mode:** `game = enableDraftMode(newGame(UNRESTRICTED, UNRESTRICTED, seed), draftSeed, {mode:"buff", cadence})`; `startedAt = runningSince = now`; emit `game_open`; schedule first action.
- **nerf mode:** enter the opening nerf draft (below); `startedAt` stays null.

### 2. Nerf-mode opening draft (port `beginNerfDraft`/`finalizeNerfDraft`)
- Deal `nerfOptions[color]` from `openingNerfPool`/`pickNerfPair(draftSeed,…)` (two options per seat).
- Emit `game_open` (game exists, unstarted).
- Schedule each seat's pick at `now + houseDraftThinkMs(rng)` (2–8s).
- On step: for each seat not yet picked, `nerfPicks[color] = houseNerfPickIndex([tierOf(opt0), tierOf(opt1)], rng)` (prefer milder). When both picked → **finalize**: set `nerf = {w: options[w][pick], b: options[b][pick]}`, build `game = enableDraftMode(newGame(nerf.w, nerf.b, seed), draftSeed, {mode:"nerf", cadence})`, `startedAt = runningSince = now`, schedule first move.

### 3. The one-action step (port `playHouseAction`, minus reveal/wire bookkeeping)
On each `step(g)` for a started game, in order:
1. `finishOnFlag` check (below) → if flagged, end game.
2. **Pending buff offer** on either seat → `aiDraftChoice(game, color)` → `pickDraftCard`/`bankDraft`; append the `pick`/`bank` `StoredDraftAction`. (One resolve, then re-arm.)
3. Otherwise it's the on-turn seat's move:
   - 40% coin (buff games): try `aiChooseBuffActivation(game, color)`; if it fires, `activateBuff(...)`, append the `use` action, re-arm. On throw, rebuild is unnecessary (we hold live state) — just fall through to a move. *Note the divergence from the DO:* the DO must rebuild from the record on a failed activation because it discards state; the arena holds the live `game`, so on a throw it discards the attempted mutation by cloning `game` **before** `activateBuff` and restoring on failure. Keep a cheap structured clone of `game` around the activation only.
   - **Move:** `move = pickHouseMove(game, seat.skill, rng, timed ? clocks[turn] : undefined)`; fallback to a random legal move; if no legal move, end via `resign`. Apply `game = playMove(game, move)`; append `moveToUCI(move)` to `moves`. Update clocks (below).
4. Recompute `nextActionAt` (port `armBotAction`): pending offer → `+houseDraftThinkMs`; else on-turn → `+houseThinkMs(rng, clocks[turn] + firstMoveGrace, timed)`. `firstMoveGrace = firstMoveGraceMs (10s)` only on that side's first move.
5. `checkLossConditions(game)` / mate/stalemate → set `result` and end.

### 4. Clocks (port `currentClocks`/`finishOnFlag`)
- On the active side's move: `elapsed = now - runningSince`; on that side's first move subtract `firstMoveGraceMs`; `clocks[turn] = max(0, clocks[turn] - elapsed) + incrementSec*1000`; set `runningSince = now` for the new active side.
- `finishOnFlag`: if `clocks[activeColor] <= 0` before a move lands → game ends, winner = other side, reason `"time"`. (Untimed pools: `timeSec === 0` → skip clocks.)
- The arena is the sole clock authority (no human to dispute) — simpler than the DO's disconnect-pause logic, which the arena omits entirely (no humans).

### 5. End → finished record
On any terminal (`checkLossConditions`, flag, stalemate, resign, pause-draw), build the archive-ready record and emit `game_end`:

```ts
interface ArenaFinishedRecord {
  id: string;
  setup: { whiteNerfId: string; blackNerfId: string; seed: number; timeSec: number; incrementSec: number };
  mode: "nerf" | "buff";
  draft: true;
  cadence: number;
  draftSeed: number;
  moves: string[];
  draftActions: StoredDraftAction[];
  bots: Record<Color, string>;          // persona ids
  seats: Record<Color, { rating: number; name: string }>;
  result: { winner: Color | "draw" | null; reason: string };
  rated: true;
  replayVersion: number;                // = REPLAY_VERSION (3) — MUST match the Worker
  startedAt: number; completedAt: number;
}
```

This is exactly the field set the DO needs in M2 to (a) archive via `recordFinishedGame` and (b) apply Glicko to both house accounts.

---

## Event sink interface (the M2 seam)
The lifecycle emits through one interface; M1 ships a logging impl, M2 ships the DO client. Nothing else in the arena changes between milestones.

```ts
interface ArenaSink {
  gameOpen(g: ArenaGame): void;
  move(gameId: string, ply: number, uci: string, clocks: Record<Color, number>): void;
  draft(gameId: string, action: StoredDraftAction): void;
  gameEnd(rec: ArenaFinishedRecord): void;
}
```
- **M1 impl (`LogSink`)**: structured JSON logs + counters; retains last N `ArenaFinishedRecord`s in memory for the status endpoint.
- **M2 impl (`ArenaWsSink`)**: buffers/sends over the authenticated `/arena` WebSocket to the DO; honors `watch`/`unwatch` (only stream `move`/`draft` for watched games).

## HTTP control / observability surface
Small `node:http` server (like the engine service), bearer-auth with `ARENA_TOKEN`:
- `GET /healthz` → `ok`.
- `GET /stats` → `{ live, spawnedTotal, finishedTotal, byMode, avgPlies, enabled }`.
- `GET /games` → live game summaries (id, mode, pool, seats, ply, clocks).
- `GET /finished?limit=N` → recent `ArenaFinishedRecord`s (for the self-validation check).
- `POST /pause` / `POST /resume` → toggle `enabled` (M2 drives this via the DO channel instead).

## Config & env (`/etc/nerfchess-arena.env`, chmod 600)
```
ARENA_TOKEN=<bearer for the HTTP surface>
ARENA_REPLAY_VERSION=3          # must equal the Worker's REPLAY_VERSION
ARENA_MAX_GAMES=18              # = houseVsHouseCap; raise later once M4 lands
ARENA_ENABLED=true
PORT=8788                       # distinct from the engine service (8787)
```

## Determinism & the archive contract
The whole point of Tier 2 is that the DO does **not** replay these games — but the
**stored move stream still must replay** later for TV replay + DB integrity. So:
- The arena bundles the **same `src/engine`** and stamps `replayVersion = ARENA_REPLAY_VERSION` on every record; deploy the arena from the same commit as the Worker, bump in lockstep with `REPLAY_VERSION`.
- Moves recorded as UCI; draft actions recorded in the **exact** `StoredDraftAction` union the DO replays via `applyStoredDraftAction`.

## Self-validation (build the safety net into M1)
Because M1 has no DO to catch a bad record, add an **in-process** check: on
`game_end`, feed the record through `replayToPosition` (the Tier-1 module) and
assert the replayed final board equals the in-RAM `game` board (FEN + legal-move
set). Any mismatch = a recording bug (an action not logged, wrong order, wrong
seed) — log loudly and drop the record. This is the M1 acceptance gate: **every
finished game must round-trip.**

## Deployment on Tokyo (mirror the engine service)
- `engine-service`-style `build.mjs` → `arena-service/dist/server.mjs`.
- `/opt/nerfchess-arena/server.mjs`, `/etc/nerfchess-arena.env` (600), `nerfchess-arena.service` (`Type=simple`, `Restart=always`, `Nice=10` — below the engine service and Postgres), port `8788` local-only.
- **No tunnel ingress in M1** (nothing external needs to reach it; the status endpoint is local/SSH-only). M2 adds whatever channel the DO↔arena protocol needs.

## Acceptance criteria (definition of done for M1)
1. Service runs continuously, holds up to `ARENA_MAX_GAMES` concurrent bot-vs-bot games, spawns with 4–10s spacing.
2. Games of **both** modes (buff + nerf-draft) reach natural terminals (mate/stalemate/flag/no-legal-move) at plausible rates; no game wedges.
3. **100% of finished records round-trip** through `replayToPosition` (self-validation passes).
4. Pacing looks human (1–4s typical, occasional longer), clocks flag correctly, no game runs the JS thread hot (search stays ≤80ms; `/stats` shows healthy cadence).
5. Zero production impact — the service has no path to the DO, D1, or PG.

## Risks / notes
- **Buff-activation rollback:** the DO relies on rebuild-from-record to undo a failed activation; the arena must instead clone `game` before `activateBuff` and restore on throw (called out above). This is the one place the port isn't line-for-line.
- **Single-thread search under high `ARENA_MAX_GAMES`:** fine at 18; if M4 raises caps into the hundreds, move `pickHouseMove` to `worker_threads` (or reuse the Tier-1 engine service over localhost).
- **Clock/increment fidelity:** mirror `currentClocks` exactly (first-move grace, increment on the moving side) so archived clocks match how the DO would have computed them.
```
