# Slice H: realtime, engine, worker (wave 1)

Owner files: `worker.ts`, `src/lib/multiplayer.ts`, `src/lib/server/{gameServer,clockPause,games}.ts`, `server/*`, `docs/game-server-protocol.md`, `src/engine/*` except `ai.ts` (OWNER DIRECTIVE 2 moved `bots.ts`, `ai.ts`, `engine-service/*`, `arena-service/*` to HB). New files: `src/lib/socketProtocol.ts`, `src/lib/server/socketGuard.ts`, `scripts/polish/{parity-fuzz,test-seat-superseded,test-socket-guard,test-realtime-rules}.ts`. Evidence: `docs/polish-pass/evidence/H/`.

The Durable Object does not run under `next dev`, so worker-side fixes are covered by unit checks on the pure helpers plus source assertions on `worker.ts` (`POLISH_WORKER_PATH=<old worker.ts>` reruns them against an older tree; the before files were made that way). Client and engine fixes have real runtime tests.

## Row updates

| Row | Status | Evidence | Commit | Note |
|---|---|---|---|---|
| F082 | DONE | `seat-superseded-before.txt` (8 failures: a 4001 close reconnects, background wakes steal the seat back), `seat-superseded-after.txt` (15 ok) | 1fc268a | Root cause: the server closed the old seat socket with 1000 and the client auto-reconnects on any close with the shared token, so each tab stole the seat from the other forever. Server: `attachSession` unseats the old socket's attachment, then closes it with `SEAT_SUPERSEDED_CLOSE` (4001, `src/lib/socketProtocol.ts`). Client: `MPSession` sets `superseded` on a 4001 close, emits `{ type: "superseded" }` and connection state `lost`, never schedules a reconnect, ignores `online` / `pageshow` / hidden wakes, `resync()` refuses, and only `reclaim()` or a focused, visible wake takes the seat back (which supersedes the other tab once, no loop). Test: `scripts/polish/test-seat-superseded.ts` (fake socket and timers). UI for "open in another tab" is a REQUEST to J. |
| F068 | DONE | `socket-guard-before.txt`, `socket-guard-after.txt` | 1fc268a | `webSocketMessage` now spends a per-socket token bucket (40 burst, 10/s, `rate_limited` at most once a second, close 1008 after about 200 sustained drops), then checks size (8192 bytes before JSON.parse), parse and shape (object with a 1-32 char string `t`). `JSON.parse("null")` used to throw out of the handler at `frame.t`. Helpers in `src/lib/server/socketGuard.ts`; 5 frames a second for two minutes never drops. |
| F090 | DONE | `socket-guard-after.txt` | 1fc268a | `forgetSocket` on close and error deletes the socket's `lastChatAt` entry and frame budget. |
| F050 | DONE (SECURITY) | `socket-guard-before.txt` / `-after.txt` | 1fc268a | Decision Q20. Both ok:false bodies are `{ ok, version }` only; the success body turns `db.lastError`, `house.tickError`, `house.seedError`, `house.lastDesync` (which carried a match id and the raw draft actions of a live game, hidden picks included) and `house.lastEngineReject` into booleans, and the lobby probe error into `{ error: true }`. Every string was already `console.error`ed where it is set; the lobby probe now logs too. |
| F056 | DONE | `socket-guard-after.txt` | 1fc268a | `x-content-type-options: nosniff` on `/healthz` (all three bodies), `/api/lobby` (edge) and `/mod/online`. |
| F114 | DROPPED (owner) | | | OWNER DIRECTIVE 2. Public figure, personas, curve and filler untouched. The internal human count below is additive and reachable only through the DO stub. |
| F125 (H part) | DONE | `socket-guard-after.txt` (`/mod/online` served, never forwarded publicly) | 1fc268a | `GET /mod/online` on the DO, the route `src/lib/server/metrics.ts getOnlineNow()` already calls. Field list for slice G below. Historical DAU and indexes stay G's. |
| Engine rules parity (BACKEND), P-fuzz | DONE | `parity-fuzz-before.json` (200 games: 62 diverged, all on the checkpoint path), `parity-regression-after.json` (the same 62 seeds: 0), `parity-fuzz-after.json` (400 games, 38,639 plies, 9,686 draft actions, 1,968 activations of 456 distinct cards: 0 divergences) | 46f225d | `scripts/polish/parity-fuzz.ts` plays random draft games (both modes, random nerfs, stacked sometimes) with random picks, banks, rerolls and card activations (targets walked through `buffNextTarget` like dtUse), and after every action compares live play, a full `replayToPosition` and the DO's checkpoint path (serialize, deserialize, delta replay) on canonical `serializeGame` JSON plus `desyncFingerprint`; it also flags engine exceptions and refused activations that still mutate state. Three findings, all fixed, below (A-parity-1..3). Regression: `parity-fuzz --seeds $(cat docs/polish-pass/evidence/H/parity-regression-seeds.txt)` fails on 46f225d^ and passes after; the RNG self-check runs on every invocation. |
| F080 | DONE (safety part) | `realtime-rules-before.txt` / `-after.txt` | a36a943 | `countsForRating()` in `games.ts`: the same account on both seats never moves ratings or win counts (the row is still archived, unrated). Whether rated custom challenges should exist at all is still Q18. |
| F086 | DONE | `realtime-rules-*.txt` | a36a943 | The offer pins `takebackToPly`; accept rewinds to it (old stored offers fall back to the old computation). No protocol change. |
| F088 | DONE | `realtime-rules-*.txt` | a36a943 | `playClientMove` reads the time once on arrival; the flag check and the clock bank use it, and the opponent's clock starts at commit, so neither side pays for the server's replay. Server moves (house) unchanged. |
| F083 | DONE | `realtime-rules-*.txt` | a36a943 | `seatedInLiveGame`: a watcher whose account holds a seat in the unfinished game gets no `schat` fan-out, an empty `spectatorChat` in `wstart`, and `seated_player` if it posts. |
| F078 (H part) | DONE | `realtime-rules-*.txt` | a36a943 | The three clock checks use `clockWithin(..., CUSTOM_GAME_CLOCK / TOURNAMENT_CLOCK)` from slice F's `src/lib/clockBounds.ts`. |
| F052, F053 (H part) | DONE | `realtime-rules-*.txt` | a36a943 | Player and spectator chat go through `cleanText(text, { maxChars: 200 })` instead of `.trim().slice(0, 200)`. |
| F067 | DONE | `create-limit-before.txt`, `socket-guard-after.txt` | 1309dab | `WindowLimiter` (`socketGuard.ts`): 20 new matches per account and 40 per client address per 10 minutes for `create` and `playbot` (`too_many_games`). The address key is an FNV-1a digest of `CF-Connecting-IP` kept on the socket attachment, never the address. |
| F091 | DONE | `test-realtime-rules.ts` (F091 checks) | 1309dab | `seeOppBuffs`, `godRerolls` and `lastClockAdjustAt` are written to the socket attachment when changed. |
| F092 | DONE | `docs/game-server-protocol.md` | 1309dab | Added `abort`, `rematchCancel`, `playbot`, `schat` (both directions), `reveal`, `dtReroll`, `hb`, the god-panel frames, `create.rated` / `stacked` and clock bounds, the new takeback rule, frame limits and close codes, guard error codes, and the internal HTTP routes including `/mod/online` and the public `/healthz` contract. |
| F069 | TODO (owner) | | | Needs Q19 (signed-in only spectator chat). Per-userId throttle and batching wait on it. |
| F079 | TODO (owner) | | | Needs Q24 (0+N). |
| F084 | TODO (owner) | | | Needs Q25 (account-based reclaim). F082's `reclaim()` is the client half either way. |
| F081 | TODO (proposal) | | | P-mod-push: an internal DO route the mod API calls after mute, ban or rename. Protocol between G and H; not started. |
| F089 | TODO (proposal) | | | Repetition key change alters replay results, needs a REPLAY_VERSION bump: PROPOSALS. |
| F241 / P-snapshot | TODO | | | Asked by E2 (`GET /game-snapshot?id=` with spectator masking). Not started this wave. |
| F051, F071, F255 | REASSIGNED | | | engine-service and arena-service are HB's now (OWNER DIRECTIVE 2). F255 lives in the arena lobby client config, not an H file. |
| F098, cron (BACKEND) | TODO (integrator) | | | Per this slice's prompt, no `scheduled()` handler was added; the integrator wires it to slice L's `runDailyJob`. |
| GameServer DO: socket router (BACKEND) | DONE | as F068 | 1fc268a | |
| GameServer DO: reconnect, tabs, reclaim (BACKEND) | PARTIAL | as F082 | 1fc268a | F084 waits on Q25. |
| GameServer DO: clocks (BACKEND) | PARTIAL | as F088, F078 | a36a943 | F079 waits on Q24. `test:clock-pause` passes. |
| GameServer DO: chat (BACKEND) | PARTIAL | as F083, F052, F053, F090 | a36a943 | F069 waits on Q19, F081 on P-mod-push. |
| GameServer DO: /healthz, headers (BACKEND) | DONE | as F050, F056 | 1fc268a | |
| B request: export ACTIVE_GAME_KEY and ACTIVE_GAME_TTL_MS | DONE | `src/lib/multiplayer.ts` | 1309dab | Both exported; B can import them instead of mirroring the literals. |

Guards run after the changes: `test:clock-pause`, `test:spectator-sync`, `test:tv-spectator` (141 checks), `test:desync`, `test:snapshot`, `test:buff-purity`, `test:draft-sequence`, `test:draft-derivation`, `test:replay-spectate`, `test:archive-replay`, `check-emdash`; tsc filtered to the touched files and eslint on them, clean.

## ADDITIONS

- A-parity-1 (fixed, 46f225d): `serializeGame` dropped `buffs.mutations` as transient, but `fxRng` mixes it into the seed of every random card effect. The DO rebuilds from a checkpoint on the play path, so after a checkpoint every random effect (walnut hexes, random removals, wheel spins) rolled different squares on the server than on both clients: a silent desync on 62 of 200 fuzz games. Now persisted (always as a number), and `gameFromCheckpoint` refuses checkpoints written without it (one full replay, then a fresh checkpoint). `GAME_SNAPSHOT_VERSION` is not bumped, so stored puzzles and saved games still load.
- A-parity-2 (fixed): `RNG.next()` grew its state as an unbounded double (`this.s += ...`); `getState()` returned values above 2^32 that `fromState` truncates, so a restored game carried a different stored state. The state is now kept as a uint32; the draws are bit-identical (self-check against the original Mulberry32 on 250,000 draws each run), so every recorded game replays the same.
- A-parity-3 (fixed): Rampart kept the live shield effect object in `inst.state.shield` and found it later by identity (`effects.includes`). A restored game holds copies, so the shield read as gone and the card was spent early on the server only. The shield effect now carries a `tag`, the card finds it by tag and stores a flag instead of the object; state written before the change falls back to the identity lookup. Edge: a finished game that combined Rampart with a Chess Diff restore now replays with the shield found (it was lost live before); no REPLAY_VERSION bump for that.
- The fuzz does not yet cover: the nerf opening draft (`dtNerfPick` is DO-only), god-panel grants, Chess Diff flags (server-time events), and the masked replica path (`draftOnline` with hidden opponent cards; `test:desync` covers seven scenarios of it). Extending it to the masked replica needs P-replica (slice J).

## Fields for slice G (internal online count)

`GET https://game-server/mod/online` through `getGameServerStub()` (already what `metrics.ts getOnlineNow()` calls). JSON, `cache-control: no-store`:

- `humans` (alias `humansOnline`): distinct signed-in accounts with an open game socket right now, excluding `hp_` and `seed_` ids and `polish_` usernames (Q5). Guests included.
- `guests`: how many of `humans` are guest accounts.
- `anonymousSockets`: open sockets with no account (signed-out tabs; one per tab, so it can double count a person).
- `peakHumansToday`, `peakAt` (ms epoch), `peakDay` (`YYYY-MM-DD`, UTC): the day's maximum of `humans`, sampled on every socket connect (the only moment it can rise), persisted in DO storage under `humanPeak:v1`.
- `publicFigure`: the unchanged public number (`players.length + anonymous` from the lobby payload), for side-by-side display.
- `at`: when the numbers were read.

HTTP-only visitors (no socket) are not counted; the public figure never changes (OWNER DIRECTIVE 2).

## PROPOSALS

- P-fuzz-masked: extend `parity-fuzz.ts` with a masked replica (opponent cards as tier placeholders, reveals from the DO's rules) once P-replica lands; would also cover `dtNerfPick`, grants and Chess Diff flags by recording them as the DO does.
- F089: a separate `repetitionKey` that omits an en passant square no pawn can use, behind a REPLAY_VERSION bump.

## OWNER QUESTIONS

None new. F069 (Q19), F079 (Q24), F084 (Q25) and the rated-custom half of F080 (Q18) wait on existing questions.

## REQUESTS

- Slice J (`src/components/OnlineMatch.tsx`, or whoever owns `src/components/ConnectionBanner.tsx`): handle the new `{ type: "superseded" }` event. Today the tab shows the generic "Connection lost. Reconnecting" pill (connection state `lost`) while another tab holds the seat. Wanted: a notice "This game is open in another tab." with a "Play here" button that calls `session.reclaim()`; clear it on the next `start`. `session.isSuperseded()` tells a late-mounting component the state. The seat also comes back on its own when this tab is focused.
- Slice B (`src/app/page.tsx` pre-paint rejoin stamp): `ACTIVE_GAME_KEY` and `ACTIVE_GAME_TTL_MS` are now exported from `src/lib/multiplayer.ts`.
- Slice L (`package.json`): add `"test:parity": "tsx scripts/polish/parity-fuzz.ts --games 40"` (about 40 s on an idle box; a heavy command, so through `heavy.sh`), plus `"test:seat-superseded": "tsx scripts/polish/test-seat-superseded.ts"`, `"test:socket-guard": "tsx scripts/polish/test-socket-guard.ts"`, `"test:realtime-rules": "tsx scripts/polish/test-realtime-rules.ts"` (all three under a second, good for `npm run guard`).
- Integrator: the worker `scheduled()` handler for slice L's cron (not added here, as instructed).
- Slice HB: `src/engine/rng.ts` and `serializeGame` changed (state normalized, `mutations` persisted). Search copies made with `serializeGame` now carry the mutation counter, so a search's random effects match the real game's; no API change. The HB REQUESTS R1 to R12 for `worker.ts` are not done in this wave.
