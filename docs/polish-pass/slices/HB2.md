# Slice HB2 (house bots: the engine, `src/engine/ai.ts`), wave 1

Owner: HB2 track. Plan and acceptance: `docs/polish-pass/slices/HB.md` (TRACKS, HB2). The integrator folds this file into `HB.md` RESULTS and `LEDGER.md`.
Evidence: `docs/polish-pass/evidence/HB/HB2/`. Baseline engine: `src/engine/ai.ts` at `bbe4271` (unchanged in every commit before `3b211ae`). HB2 engine: `3b211ae` plus `f2d20b4` (PVS and the deeper reduction); every after number below is from `f2d20b4`. Every script loads the baseline from git into the scratchpad with its imports pointed back at this checkout's rules files, so no second engine is committed and both engines run under the same rules code. Timed runs interleave the engines per position, alternating the order, so the load of a shared 4-core box (load average about 2 throughout) lands on both equally. Numbers are from `tsx` on that box; absolute nodes per ms are lower than production, ratios are what count.

Resume note: a previous HB2 agent wrote the five scripts and was killed before any measurement or engine change. The scripts were reviewed, three were corrected (see ADDITIONS), and all of the work below is new.

## ROW UPDATES (HB2 goals, in plan order)

| Row | Status | Evidence | Commit | Note |
|---|---|---|---|---|
| HB2 goal 1: contract (`SearchStats.scoreCp`, `KING_CAPTURE_SCORE - ply`, `isKingCaptureScore`) | DONE | `before-engine-assertions.txt` (16 of 22 fail on the baseline), `after-engine-assertions.txt` (all pass) | 3b211ae | `export const KING_CAPTURE_SCORE = 100000`, `isKingCaptureScore(cp)` (abs at or above 90000, the eval bar's line). A captured king scores `+-(100000 - ply)` from the root, so magnitudes stay above 99800 (the search stops at ply 120 plus quiescence). `scoreCp` is set on the argmax path (best score at the deepest completed depth), on the sampling path (best pre-noise score, and `depth` is now set there too; it was always 0), and stays undefined when no depth completed. The transposition table stores king-capture scores relative to the node. `pickAIMove`, `analyzeBoard`, `aiBudgetMs`, `LEVELS` and `defaultSearchShape` keep their signatures and values. |
| HB2 goal 2 / P6 (quiescence in check, check extension, depth-1 fallback, fastest capture) | DONE | `after-engine-assertions.txt`; `tactics-before-after.txt` | 3b211ae | Quiescence no longer stands pat for a side whose king is attacked: it searches every move (a move that leaves the king attacked is scored as the capture it allows without generating the reply). A check extends one ply, at most twice per line. A search whose depth 1 never completes returns a one-ply king-safe ranking (king capture first, then static evaluation of king-safe moves, then king-hanging moves) on both paths; before, argmax returned the first root move and sampling sampled among moves all scored 0 (5 of 20 king-safe in check in the assertion). A sampling tier that sees a king capture plays the fastest one (8 of 40 before, 40 of 40 after). |
| HB2 goal 3 / P4 (own nerf loss in one) | DONE | `nerf-safety-400ms.txt` / `.json`, `nerf-safety-positions.json` (240 frozen positions); `nerf-safety-ab.json` (see RESULTS) | 3b211ae | `dropNerfLossInOne` beside `isSelfLosing`: a root move is dropped when some opponent `generateMoves` reply (never the opponent's nerf, asserted with a spy nerf) trips the mover's own `checkLoss`, with the capture tallies playMove would have, unless nothing else is left. At most a quarter of the budget; moves not reached are kept. Stage 2 (the mover's own filter at interior plies) not done: stage 1 alone takes the unsafe rate to 0 of 240. |
| HB2 goal 4 / P7 (repetition, endgame king, mop-up, passed pawns) | DONE | `endgames-before.json`, `endgames-after.json`, `endgames-noblunder-{baseline,current}.json` and the logs as `.txt` | 3b211ae | A position repeated in the search line scores as a draw at the first repeat; a game-history position (since the last irreversible move, replayed from the history and verified against the board, skipped in a Chess Diff or once a buff rewrote the board, as the game's own threefold rule does) only when the game has already seen it twice. Draw = `-contemptCp` (20) for the searching side; `analyzeBoard` uses 0. Fifty-move positions score as draws. Evaluation: endgame king table tapered by phase, passed pawns by rank and phase, and a mop-up (a rook or more ahead against no pawns) that pushes the lone king to the edge, brings the kings together and takes away the lone king's safe squares, which in this game wins by itself (a king with no safe square must step into capture). |
| HB2 goal 5 / P12 (search efficiency) | DONE | `bench-depth.json` / `.txt`, `bench-frozen.json` / `.txt`, `after-engine-assertions.txt` (TT identity), `engine-ab.json` / `.txt` | 3b211ae, f2d20b4 | Zobrist hash (two 32-bit halves, incremental over the squares makeMove touches, checked against a from-scratch hash over 60 random games), transposition table (2^17 entries, typed arrays, 2.9 MB, allocated on first search, a fresh age per search so no entry crosses searches, off whenever a move-granting buff is live since the spent-charge mask would have to be in the key), null move (not in check, not with king and pawns only, never twice in a row, not with buffs), late move reductions (quiet, not a killer, not giving check, from the 4th move at depth 3 or more, two plies from the 9th move at depth 5 or more, re-searched when they beat alpha), principal variation search at the root and below, quiescence delta pruning. With the selective parts off, TT on and TT off give identical depth-4 root scores on all 27 positions. The search runs on a copy of the root board with an empty history when no buff is live (nothing below the root reads it), so `makeMove` no longer copies a 100-move history at every node. No capture-only generator: it would duplicate `generateMoves`. Node cap (A25): each move generation is charged 2 extra nodes, measured so a capped search with the clock frozen costs no more CPU than the baseline at the same cap (see RESULTS). |
| HB2 goal 6 (depth table for HB1) | DONE | `bench-depth.json` | this file | See RESULTS, "Depth table". |
| test-house-policy.ts type errors | NO-CHANGE (not HB2's file) | filtered tsc on `scripts/(bench|test|sim)-(house|search)` is clean at `3b211ae` | | The file is HB1's (HB.md, HB1 files). Its two errors are gone in the tree HB1 committed (`e5cab80`); nothing for HB2 to do. |

## RESULTS (before = baseline `bbe4271` engine, after = `f2d20b4`)

Filled from the evidence files; each line is the HB.md acceptance line.

### Acceptance lines

| Line (HB.md) | Before (baseline) | After (f2d20b4) | n / CI | Target | Verdict | Evidence |
|---|---|---|---|---|---|---|
| `test-house-engine.ts` assertions | 16 of 22 checks fail | 25 of 25 pass (the P7 and internals lines report separate checks once the exports exist, and a seen-once check was added) | | pass | MET | `before-engine-assertions.txt`, `after-engine-assertions.txt` |
| Tactics, solve rate at 40 / 120 / 400ms, deep judge | 6 / 13 / 31 of 33 | 28 / 33 / 32 of 33 | 33 frozen positions | higher at every budget | MET | `tactics-before-after.{txt,json}`, `tactics-set.json` |
| same, harvest judge (depth 4 overall) | 3 / 11 / 31 | 26 / 30 / 29 | | | the shallow judge marks forced king captures past its horizon as misses (t19 and t31 in a per-switch diagnosis at 400ms) | same |
| Tactics, mean completed depth at 40 / 120 / 400ms | 3.00 / 3.42 / 4.48 | 3.06 / 4.61 / 6.33 | | reported | | same |
| Own nerf, hard@400, unsafe picks | 8 of 240 (3.3%, 95% 1.7-6.4%) | 0 of 240 (0.0%, 95% 0.0-1.6%) | 240 positions, 28 at risk | 0, upper bound under 2% | MET | `nerf-safety-400ms.{txt,json}` |
| Own nerf, depth cost of the filter at 400ms | | 5.43 with the filter, 5.35 without (no cost) | 240 | 0.3 ply or less | MET | same |
| Own nerf A/B, filter ON vs OFF, hard@40 | | +11.9 points (95% 3.6 to 20.1); nerf losses ON 90, OFF 165 | 8 nerfs x 20 pairs, 320 games | positive, lower bound -3 or better | MET | `nerf-safety-ab.{txt,json}` (one nerf, simp, scored 35% ON over 20 pairs; the other seven 52.5-77.5%) |
| Endgames, pinned tier policy (old random blunder roll on): 1350 KQK | 2 of 10 | 9 of 10 (the one loss followed the pinned random blunder roll) | 10 starts | 8 of 10 or more | MET | `endgames-before.{txt,json}`, `endgames-after.{txt,json}` |
| 1750 KQK / KRK | 10 of 10 / 0 of 10 | 10 of 10 / 9 of 10 | 10 each | 10 of 10 / 8 of 10 or more | MET | same |
| threefold draws with a rook or more ahead | 0 of 60 (every failure was the 50-move window: the old engine shuffled) | 0 of 60 | 60 | 0 | MET | same |
| Endgames, engine alone (`--blunders off`), 1350 KQK / KRK / KRPKP | 2 / 0 / 2 of 10 | 10 / 8 / 9 of 10 | 10 each | reported | | `endgames-noblunder-{baseline,current}.{txt,json}` |
| same, 1750 KQK / KRK / KRPKP | 10 / 0 / 8 of 10 | 10 / 10 / 10 of 10 | 10 each | reported | | same |
| Depth, hard, 27 midgame positions, 25 / 80 / 120 / 400 / 1800ms | 2.19 / 3.04 / 3.11 / 3.85 / 4.96 | 1.96 / 3.00 / 3.33 / 4.63 / 6.48 | 27 | +1.0 ply at 400 and 1800 | PARTIAL: +0.78 at 400, +1.52 at 1800 | `bench-depth.{txt,json}` |
| Depth, hard, 20 late positions (plies 60-120) | 3.20 / 4.05 / 4.35 / 5.10 / 6.25 | 3.50 / 4.75 / 5.15 / 6.90 / 8.80 | 20 | same | MET: +1.80 at 400, +2.55 at 1800 | same |
| Depth, medium (maxDepth 3), mid | 2.30 / 2.96 / 3.00 / 3.00 / 3.00 | 1.96 / 2.85 / 2.96 / 3.00 / 3.00 | 27 | reported | -0.34 ply at 25ms: check evasions and extensions cost a small search more | same |
| Nodes per ms | | counted nodes per ms x1.12 to x1.45 | | not down more than 10% | MET, with a caveat: counted nodes now include the GEN_COST charge, so depth per ms is the honest throughput figure (above) | same |
| Late-position node cost | hard@1800: 336 counted nodes/ms late vs 214 mid | 412 late vs 242 mid | | reported | The empty-history root copy removed most of the late-game history copying inside the search; the per-node copy in `makeMove` (board.ts, H) still costs at the root and in the nerf filter | same |
| Frozen clock (A25), hard@80, CPU of a capped search | mid 781ms, late 528ms, depth 4.22 / 5.30 | mid 698ms, late 388ms, depth 5.22 / 6.75 | 27 + 20 | no more CPU than before | MET | `bench-frozen.{txt,json}` |
| Frozen clock, medium@80 (runs to depth 3, never capped) | mid 32ms, late 8ms | mid 48ms, late 15ms | | not in the plan | a cost, see LEFT | same |
| Strength, new vs baseline, hard@120ms, 60 pairs | | +83 =34 -3, 83.3% (Wilson 95% 75.7-88.9%) | 120 games | 58% or more, lower bound above 50% | MET | `engine-ab.{txt,json}` |
| Guards | | `test-search-buff-visibility` OK, `test-ai-activation` OK, `test-card-impact` PASS, `bench-move-review` 51 of 51 at depth 2 in the 60ms budget (p95 43ms), `bench-search-buffs` reported (amazon_army hard@2000: depth 4 against 7 without the card, since the table and null move are off while a move-granting buff is live) | | pass | MET | `after-guard-*.txt`, `after-bench-search-buffs.txt` |
| Filtered tsc and eslint | | clean on `src/engine/ai.ts` and the HB2 scripts; no new error in bots.ts, worker.ts, engine-service, arena-service or the ai.ts importers | | clean | MET | |

### Depth table for HB1 (goal 6)

Mean completed depth at `f2d20b4`, hard level, no weakening (`bench-depth.json`, the `--table` block). House tiers that pass `weaken.maxDepth` stop at that depth instead.

| Budget | 25ms | 80ms | 120ms | 400ms | 1800ms |
|---|---|---|---|---|---|
| 27 midgame positions | 1.96 | 3.00 | 3.33 | 4.63 | 6.48 |
| 20 late positions | 3.50 | 4.75 | 5.15 | 6.90 | 8.80 |
| midgame, baseline, for comparison | 2.19 | 3.04 | 3.11 | 3.85 | 4.96 |

Measured steps in the midgame: 25 to 80ms +1.04 ply, 80 to 120ms +0.33, 120 to 400ms +1.30, 400 to 1800ms +1.85. For HB1's 0.4-ply rule, a budget step inside 80-120ms is too small; the tiers need to sit further apart than that.

## ADDITIONS

- `scripts/test-house-engine.ts` (assertions): the transposition-table identity check also turns the check extension off, because its per-line budget makes a node's depth depend on the path to it, so a table entry from the deeper path is a deeper search, not the same one. The sampling-path `scoreCp` check searches 400ms instead of 60ms: a cold first full-window search on the loaded box missed depth 1 at 60ms on both engines (measured 24ms per depth-1 search warm). The P7 check now uses a line where the position has been seen twice, and adds a check that a position seen once is not a draw (the in-progress engine scored a single sighting as a draw and so stepped back into a lost position in tactic t3; the new check fails on that version).
- `scripts/test-house-engine.ts --tactics`: a second, deeper judge (baseline at depth 5 after the move, against the harvested solution at the same depth). The harvest's own judge (depth 3 after the move) marks as wrong a move that forces a king capture at ply 7, which the new engine did twice in a per-switch diagnosis at 400ms (t19, t31). Both rates are reported.
- The tactics set was harvested with `--want 36 --max-candidates 6000` (the default 420 candidates yielded 3). 33 positions from 6000 candidates, frozen.
- `scripts/bench-house-search.ts --frozen`: freezes `Date.now` inside each search, as a Worker does, so the node cap is the only stop and the time column is the CPU of a capped search.
- `scripts/sim-house-endgames.ts --blunders off`: the attacker never takes the pinned blunder roll. The roll is the old bots.ts policy (a uniformly random move, HB1's P3), and it produced every attacker loss in the default runs; the off runs measure the engine alone.
- An earlier run (on `3b211ae`) wrote its results over the frozen `nerf-safety-positions.json` (the `--out` in the run named that file by mistake); the positions were restored byte for byte from a copy taken before the run finished, and the final run writes `nerf-safety-400ms.json`. `late-positions.json` is the bench's frozen late set (generated once by the baseline at a fixed depth).

## PROPOSALS

- None that change a public shape. `rankRootMoves`, `getEngineTuning`, `setEngineTuning` and `engineInternals` are new exports for the scripts; nothing in the app imports them.

## REQUESTS

- To HB1: the depth table above is the input for goal 7 (re-spacing 1350-2700). `SearchStats.scoreCp` and `isKingCaptureScore` are in, so `houseChooseActivation` and the resign helpers can read the search's own score. Note that the house blunder in `sim-house-endgames` is the pinned old policy; the new bots.ts blunder is not measured there.
- To HB3: the engine service can return `scoreCp` from `SearchStats` now. The TT is module level and single threaded; a `worker_threads` pool gets one table per thread, which is what it should be.
- To the integrator: fold RESULTS into `HB.md` and the ledger.

## OWNER QUESTIONS

- None.

## LEFT (TODO)

- Midgame depth at 400ms: +0.78 ply against the +1.0 target (1800ms and the late set meet it). Next levers: aspiration windows at the root, and a capture-only move generator for quiescence, which needs an export from the rules files (H) so it does not duplicate `generateMoves`.

- Stage 2 of P4 (the mover's own `filterMoves` at interior plies): not needed for the acceptance numbers; would cost depth.
- Buff effects below the root (R13, `game.ts` is H's): unchanged.
- Medium (maxDepth 3) with a frozen clock runs to its full depth and now spends more CPU per move than before (see RESULTS, frozen bench), because check evasions and extensions are searched; still bounded by the same node cap.
