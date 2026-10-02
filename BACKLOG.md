# NerfChess backlog

Ranked findings from the MEGA_AUDIT passes. `MEGA_AUDIT.md` is the checklist; this file is what the audit found. Every row came from an auditor reading the code and running checks, then a second agent trying to refute it. Rows that did not survive are listed at the bottom so a later pass does not raise them again without new evidence.

- **Last full pass:** 2026-10-02, against `master` at 9d3379d. All 242 checklist lines, 15 section groups.
- **Line verdicts:** 52 yes, 143 partial, 47 no, 0 unsure. Per-line evidence is in `docs/audit/2026-10-02-scorecard.md`.
- **Items:** 309 after merging duplicates (8 P0, 33 P1, 185 P2, 83 P3). 29 more were refuted in verification.
- **Repro scripts:** `docs/audit/2026-10-02/repro/<group>/`, one folder per audit group (perft, a reference move generator, move-list and board invariant fuzzers, a fake Durable Object harness that captures every frame each seat receives, and one script per reproduced bug). Run them from the repo root with `./node_modules/.bin/tsx <path>`. They are excluded from `tsc` and `eslint` and are not wired into the guard. Porting the useful ones into `scripts/` is itself a backlog item.

## How to use this file

- Work top down: every P0, then P1. Within a priority, rows are ordered by area, and bugs come before gaps.
- Close a row in the same commit as the work: set Status to `DONE (commit)` or `DROPPED (reason)`. Keep IDs stable, and add new rows at the end of their priority.
- **Ralph** names the overlapping `docs/ralph-backlog.md` row. That file stays the loop's round log and holds the long-form rows; this file holds the audit's findings. When you close one, check the other.
- Priorities: **P0**, a player can hit it now and it is wrong (illegal move, wrong result, hidden-info leak, security hole, data loss). **P1**, a missing safety net on core correctness, or a major UX or accessibility blocker. **P2**, quality gaps, polish, and measurements never taken. **P3**, features and nice-to-haves.
- Sizes: XS under an hour, S a session, M two or three sessions, L a night. **Repro** means a script demonstrated the defect; otherwise the evidence is from reading code.

## Scorecard

| Section | Lines | Yes | Partial | No | Unsure |
|---|---|---|---|---|---|
| 1.1 | 21 | 12 | 5 | 4 | 0 |
| 1.2 | 10 | 0 | 8 | 2 | 0 |
| 1.3 | 4 | 0 | 4 | 0 | 0 |
| 2.1 | 8 | 0 | 5 | 3 | 0 |
| 2.2 | 10 | 0 | 3 | 7 | 0 |
| 2.3 | 5 | 1 | 2 | 2 | 0 |
| 2.4 | 6 | 3 | 3 | 0 | 0 |
| 2.5 | 8 | 0 | 5 | 3 | 0 |
| 3 | 12 | 1 | 10 | 1 | 0 |
| 4 | 17 | 6 | 10 | 1 | 0 |
| 5 | 12 | 4 | 7 | 1 | 0 |
| 6.1 | 13 | 4 | 9 | 0 | 0 |
| 6.2 | 10 | 1 | 8 | 1 | 0 |
| 6.3 | 7 | 0 | 5 | 2 | 0 |
| 6.4 | 5 | 1 | 3 | 1 | 0 |
| 7 | 19 | 5 | 11 | 3 | 0 |
| 8 | 11 | 4 | 5 | 2 | 0 |
| 9 | 9 | 1 | 8 | 0 | 0 |
| 10 | 13 | 1 | 8 | 4 | 0 |
| 11 | 6 | 0 | 4 | 2 | 0 |
| 12 | 13 | 2 | 8 | 3 | 0 |
| 13 | 10 | 3 | 6 | 1 | 0 |
| 14 | 8 | 3 | 4 | 1 | 0 |
| 15 | 5 | 0 | 2 | 3 | 0 |

## P0

### MA-001 · Promote card-granted pawn arrivals on the last rank (expand into the four promotion moves) and drop card pawn moves onto the pawn's own back rank, centrally after the augmentMoves loop in legalMoves, with a makeMove backstop; make the picker list only promotion moves

- **Why:** The server accepts card moves that put a pawn on rank 8 unpromoted, or on its own rank 1. That breaks the engine's own rule (helpers.ts:64-67 pawnRankOk), and the picker shows a blank 'Promote to undefined' tile.
- **Evidence:** helpers.ts:69-87 moveFor sets no promotion; warp_step at library.ts:2179-2194 pushes raw Moves. I re-ran server-accepts.ts. moveByUci (replay.ts:74, the same function worker.ts:4039 calls) accepts warp_step b6b8, and the resulting FEN 1P2k3/... has the pawn left on b8. It also accepts overclock_major b7a8. invariants.ts re-run: 20 cards show PAWN_BACK, including ones that move a pawn onto its own back rank (warp_step a2b1). twin.ts (verify dir): with Warp Step, b7 offers b7b8q/r/b/n plus a bare b7b8. Board.tsx:3943 then opens the picker and 5487 renders 5 tiles, one of them undefined. Archived games may already contain such moves, so the fix needs a REPLAY_VERSION decision.
- **Verifier:** Reproduced independently. Kept at P0: the server accepts a move the engine's own stated invariant forbids, and Warp Step (T3) is in the draft pool. Merged in the picker blank tile (same root cause) and widened the title to cover own-back-rank arrivals, which the fuzz shows are the more common case.
- **Files:** `src/engine/game.ts`, `src/engine/buffs/helpers.ts`, `src/engine/buffs/library.ts`, `src/engine/board.ts`, `src/components/Board.tsx`
- **Size** S · **Kind** bug · **Section** 1.1 · **Repro** yes · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/rules-movegen/`, `docs/audit/2026-10-02/repro/cards/`
- **Merged in:** Promote (or forbid) pawn moves that reach the last rank via card-granted movement, centrally in legalMoves (P0, from cards)

### MA-002 · Key threefold repetition on the true side to move after extra moves and skips

- **Why:** A shipped Extra Move card produces a false 'draw by threefold repetition' in 9 plies, which is a wrong game result.
- **Evidence:** game.ts:1835 calls countRepetitions before the extraMoves/skips handover (game.ts:1842-1852). countRepetitions (board.ts:403-433) replays through makeMove, which always flips the turn, so the plies of a double move are keyed with the wrong side to move. Independent repro, verify/extra-move-card.ts, with a REAL activateBuff of the live 'extra_move' card (library.ts:1875; extraMovesNow sets no historyDiverged, helpers.ts:488-495): 1.Nf3 Nc6 2.Ng1 Nb8 3.Nf3 Nc6 4.Ng1, Black activates Extra Move, 4...Nb8 gives {draw by threefold repetition} even though Black is still to move, a position that had never occurred. The auditor's fuzz (re-run): 464 false draws out of 2,596. Counterstep and other passive grants hit the same path. A player can also engineer it on purpose. Needs a REPLAY_VERSION bump (worker.ts:220).
- **Verifier:** Promoted from P1 to P0: reproduced end to end with a live card through the public API, wrong result in 9 plies.
- **Files:** `src/engine/game.ts`, `src/engine/board.ts`, `worker.ts`, `scripts/test-san.ts`
- **Size** S · **Kind** bug · **Section** 1.2 · **Repro** yes · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/rules-end-state/`

### MA-003 · Settle every draft pick and grant through resolveNoMoves (forced pass), and give the king_only effect a never-strand relax

- **Why:** A passive hex picked by the non-mover can leave the mover with 0 legal moves and no result: a human is stuck until flag, and a bot resigns.
- **Evidence:** Independent repro softlock2.ts: after a2a3 a7a6 h2h3 h7h6, acquireBuff(b, court_in_exile) gives white 0 legal moves and result null. The auditor's repro-softlock.ts (re-run) shows the same through pickDraftCard. Cause: acquireBuff calls settleAfterBuff only when def.kind==='instant' (game.ts:1977-1981), and case 'king_only' filters to king moves with no fallback (game.ts:1462-1463). court_in_exile's own filter has a safety net for the queen lock only (tier6.ts:55-59). The worker's resolveDraftPick→settleDraftAction (worker.ts:8082-8210) never checks for zero moves; the bot path resigns (worker.ts:~6069-6077). Note: bn4_long_winter did NOT soft-lock in repro-softlock.ts (white's own pick happened to settle it); it is evidenced only by the fuzz/probe.
- **Verifier:** Reproduced independently in buff-mode setup with acquireBuff. A boxed-in king on e1 (or behind castled pawns) is common, so this is reachable in nerf mode. P0 kept.
- **Files:** `src/engine/game.ts`, `src/engine/buffs/hexes/tier6.ts`, `worker.ts`
- **Size** S · **Kind** bug · **Section** 2.2 · **Repro** yes · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/cards/`

### MA-004 · Stop sending the opponent's opening nerf options in startPayload.nerfDraft for nerf-mode games; ship only this seat's options plus oppPicked

- **Why:** In queue, tournament and house nerf games each seat receives the two cards the opponent's hidden nerf is drawn from, and against a house bot the nerf itself in most games.
- **Evidence:** worker.ts:2719-2727 ships `options: match.nerfOptions` (both colours), and its comment calls them public. OnlineMatch.tsx:2433-2436 says 'the opponent's nerf is completely hidden ... their options never show'. Re-ran worker-payloads.ts: white's pre-start frame had black's options [merciful_queen, wn_edge_shy_queen]. bots.ts:3634-3641 always takes the lower tier, and 62.7% of 20000 real deals give a seat two different tiers. Closing this alone is not enough: the same options can be derived from nerfSeed (separate P0).
- **Verifier:** Independently re-ran the harness and confirmed. Queue (worker.ts:4774), tournament (6342) and arena-import matches all set picksVisible:false and go through beginNerfDraft (worker.ts:3888, 6503, 6840).
- **Files:** `worker.ts`, `src/lib/multiplayer.ts`, `src/components/OnlineMatch.tsx`, `docs/game-server-protocol.md`
- **Size** S · **Kind** bug · **Section** 2.3 · **Repro** yes · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/hidden-draft/`

### MA-005 · Derive the nerf-mode option deal and each seat's nerfSeed from independent server-only seeds so a client cannot brute-force the 31-bit master seed (stamp a new REPLAY_VERSION)

- **Why:** From its own nerfSeed a client recovers the master seed in about 10s and re-derives the opponent's nerf options and nerf RNG.
- **Evidence:** startPayload sends masterRng.fork() of setup.seed (worker.ts:2685-2689). makeSeed is 31-bit (worker.ts:958-960), and dealNerfDraftOptions deals from the third fork of the same seed (worker.ts:8605-8609). My scratch seed-to-options.ts (hidden-draft-verify/) ran the real GameServer, took white's start-frame nerfSeed, brute-forced 2^31 in 9.8s to 1 candidate equal to the real setup.seed, and fed it to server.dealNerfDraftOptions. It matched black's real options exactly ([wagon_train, domino]). The opponent's nerf RNG is also exposed: 8 of 241 opening nerfs draw from it (auditor's nerf-rng-users.ts).
- **Verifier:** Raised from P1 to P0. The auditor noted that the deal shares the master seed but did not show the consequence. I reproduced it: in nerf mode this is the same hidden-info leak as the options payload, and fixing the payload alone leaves it open.
- **Files:** `worker.ts`, `src/engine/rng.ts`, `src/engine/game.ts`, `server/index.ts`
- **Size** M · **Kind** bug · **Section** 2.3 · **Repro** yes · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/hidden-draft/`

### MA-006 · Stop read-only check probes from arming lossy cards: run augmentMoves in buffAugmentedAttacks on cloned BuffInstances (A13-style private view) and add a probe-purity regression test

- **Why:** A check probe (house-bot king-safety test, check highlight, premove or move-risk check) forfeits a player's op_old_post_road or op_viziers_errand charge even when the move was never on offer on their turn.
- **Evidence:** game.ts:1044-1058: buffAugmentedAttacks clones the board but passes the LIVE inst to def.augmentMoves, even though its doc comment says 'Pure'. lossyAugment sets inst.state.armed=true from augmentMoves and never clears it there (openers.ts:120). onMovePlayed then burns a charge for any armed card (openers.ts:133-138). Callers: bots.ts:3243 (leavesKingCapturable on HYPOTHETICAL post-move boards, via {...game, board}, which shares game.buffs), 3615 and 3713; game.ts:2540; worker.ts:6043 pickHouseMove on the live DO game; page.tsx:1773 and OnlineMatch.tsx:2203 for both colours every render (checkHighlight defaults to true, settings.ts:267); premoves.ts:27; moveSafety.ts:33. I re-ran the auditor's lossy-probe-repro-active.ts myself: - no probe: charges 1; - gameInCheck(g,'b'): armed at White's turn although not offered, charges 0, spent; - pickHouseMove for Black: same as gameInCheck; - desyncFingerprint differs. The human's move path does not undo this: moveByUci (replay.ts:74) calls legalMoves, but augment never resets armed to false. My own probe-purity.ts runs gameInCheck on all 182 active augmentMoves cards across 3 lines and diffs the instance JSON. It found 3 mutators: op_old_post_road, op_viziers_errand and ghost_legion. ghost_legion writes state.offered, which legalMoves recomputes before every commit, so it is likely benign. Server-authoritative house-bot games and local practice games are directly affected. Human-vs-human DO games are not, since worker.ts never calls gameInCheck. A13 (DONE) removed this exact hazard only inside negamax; it persists here.
- **Verifier:** Reproduced independently. Added a general purity diff over all 182 active augment cards, which found ghost_legion as a third, likely benign writer. Linked A13, whose DONE status is right for negamax but does not cover buffAugmentedAttacks. Severity confirmed: the player-visible wrong charge loss hits house-bot and practice games.
- **Files:** `src/engine/game.ts`, `src/engine/buffs/overhaul/openers.ts`, `src/lib/server/bots.ts`, `src/app/game/page.tsx`, `src/components/OnlineMatch.tsx`, `src/lib/premoves.ts`, `src/engine/moveSafety.ts`, `worker.ts`
- **Size** S · **Kind** bug · **Section** 3 · **Repro** yes · **Ralph** A13 · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/balance-ai/`

### MA-007 · Stop sending the real draft RNG seed in the seat start frame; replay the client from the public card ids, as spectators already do

- **Why:** Any player can read draftSeed off the socket and predict every future draft offer and reroll, a hidden-info leak the protocol explicitly forbids.
- **Evidence:** worker.ts:2709 sends `draftSeed: match.draftSeed ?? match.setup.seed` in startPayload, against worker.ts:345 ('Never sent to any client') and docs/game-server-protocol.md:148-150. The client consumes it at OnlineMatch.tsx:207 (enableDraftMode(next, start.draftSeed ?? 1)). I re-ran the auditor's draft-seed-predict.ts: offers rolled=58, predicted before the deal=58, mismatched=0. The seed is not needed: publicDraftActions (worker.ts:8009-8037) already carries the real card ids for every pick, and spectators replay without any seed. Cards like Peek (buffs/library.ts:754) and Early Bird (overhaul/openers.ts:530) exist only to reveal this information. Run test:desync, test:parity and test:tv-spectator after the change.
- **Verifier:** Reproduced (engine-level, 58/58). The P0 holds on airtight code evidence: the field is on the wire and the code comment itself says it must not be. I added the worker.ts:345 contradiction and the fact that the public pick record already carries card ids, which makes the fix feasible at size S.
- **Files:** `worker.ts`, `src/components/OnlineMatch.tsx`, `src/lib/draftOnline.ts`, `docs/game-server-protocol.md`, `src/lib/multiplayer.ts`, `src/engine/draft.ts`
- **Size** S · **Kind** bug · **Section** 14 · **Repro** yes · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/security/`, `docs/audit/2026-10-02/repro/hidden-draft/`, `docs/audit/2026-10-02/repro/rules-end-state/`
- **Merged in:** Remove draftSeed from the start payload so clients cannot predict future buff offers or reroll results (P0, from hidden-draft); Stop sending the real draftSeed to clients and replay picks from recorded offer cards (P2, from rules-end-state)

### MA-008 · Upgrade next to 16.3.8 (GHSA-vcvr-r3jv-pc5j, critical, in next/og ImageResponse) and bump eslint-config-next to match

- **Why:** A critical advisory covers the exact renderer behind 39 public link-preview routes, 11 of them dynamic and fed with DB and user text, and the fix is a non-major bump.
- **Evidence:** node_modules/next is 16.3.4, and package.json:145 pins it. npm-audit.json: next critical, range >=16.2.0 <16.3.6, fixAvailable 16.3.8, isSemVerMajor false, CWE-1395, CVSS unscored. src/lib/og/render.ts:17,68 call new ImageResponse; 39 opengraph-image files exist, including 11 dynamic ones (u/[username], clubs/[slug], game/[id], history/[id], c/[code] and others). eslint-config-next is 16.2.10 (package.json:164).
- **Verifier:** Kept at P0, but exploitability on workerd is unverified and the advisory has no CVSS score. A published critical with a non-major fix on an anonymous-reachable surface is airtight exposure evidence, and the fix is XS. The route count is 39 (11 dynamic), not 20.
- **Files:** `package.json`, `package-lock.json`, `src/lib/og/render.ts`
- **Size** XS · **Kind** bug · **Section** 14 · **Repro** no · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/security/`

## P1

### MA-009 · Clear the matching castling right whenever a king or corner rook leaves its home square through any card path (BuffApi removePiece/relocate/place/setPieceType/setPieceColor and raw api.board.pieces writes), using one reconcile step after each card effect

- **Why:** Rights survive a card removing the rook or moving the king, so a different rook, or a king that was relocated away and back, can later castle. That breaks the rule at board.ts:347-351.
- **Evidence:** castle-rights.ts re-run. Purge on h1 leaves KQ; Ra1-a3-h3-h1 then gets e1g1 offered. A king relocated e1->e3->e1 can still castle both ways. A rook summoned onto h1 castles. activation-invariants.ts re-run: STALE_RIGHTS in 92 non-retired cards, including bw3_castle_in_the_storm leaving KQ after it castles. makeBuffApi (game.ts:941-1006) never writes board.castling. restoreCastling cards decouple rights from piece identity on purpose, so the identity rule needs deciding first. This also covers the Chess960 back-rank-shuffle line.
- **Verifier:** Reproduced. Not P0: it needs a multi-move setup, the outcome is an extra castle rather than a wrong result, and server and client agree, so there is no desync. Kept at P1 because it is a core-rule inconsistency reachable through a pool card.
- **Files:** `src/engine/game.ts`, `src/engine/buffs/library.ts`, `src/engine/buffs/boons2.ts`, `src/engine/buffs/boons3.ts`, `src/engine/board.ts`
- **Size** S · **Kind** bug · **Section** 1.1 · **Repro** yes · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/rules-movegen/`

### MA-010 · Add a move-list invariant suite over every augmentMoves card and every nerf filter, plus post-activation board invariants, and wire it into guard. Checks: on-board, origin piece matches, no own-colour target, captured/capturedSquare match the board, last-rank pawn arrivals promote, no pawn on rank 1 or 8, UCI strings unique, castling rights consistent with king and rook squares

- **Why:** Hundreds of card move generators have no invariant check. The existing test-nerfs.cjs (8 plies, moves[0]) missed 20 cards producing illegal pawn arrivals and 92 that leave stale castling rights.
- **Evidence:** scripts/test-nerfs.cjs:40-55. I re-ran the scratch invariants.ts (about 7s): PAWN_BACK in 20 cards, UCI_DUP in 1. I re-ran activation-invariants.ts (about 30s): PAWN_RANK in 3 non-retired cards, STALE_RIGHTS in 92.
- **Verifier:** Fuzz re-run, results confirmed. The suite would have caught both the P0 and the castling bug.
- **Files:** `scripts/test-movegen-invariants.ts`, `package.json`, `scripts/polish/guard.mjs`, `scripts/test-nerfs.cjs`
- **Size** S · **Kind** test · **Section** 1.1 · **Repro** yes · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/rules-movegen/`

### MA-011 · Add scripts/test-perft.ts: legal counts through legalMoves' Chess Diff branch against the published numbers, and site-rule counts through generateMoves with king capture terminal against embedded reference numbers; wire a sub-10s subset into npm run guard

- **Why:** No perft exists anywhere, so a regression in core move generation (or in the Chess Diff legality filter) would ship undetected.
- **Evidence:** 'perft' has 0 hits in scripts/, src/, docs/, e2e/, package.json. I re-ran the auditor's perft.ts legal mode to d3 on all 6 positions: every count is correct and the run takes about 2s in total. scripts/sim-chess-diff.ts tests the diff lifecycle, not move counts. The auditor's harness (perft.ts plus ref.ts in the rules-movegen scratch dir) can be ported.
- **Verifier:** The gap is confirmed. Dropped game.ts and board.ts from files, since this adds a test and changes no engine code.
- **Files:** `scripts/test-perft.ts`, `package.json`, `scripts/polish/guard.mjs`
- **Size** S · **Kind** test · **Section** 1.1 · **Repro** no · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/rules-movegen/`

### MA-012 · Apply standard draw rules inside the Chess Diff: insufficient material, flag vs insufficient material, and threefold

- **Why:** The diff claims standard chess rules, yet bare kings never end it, a 1+0 flag against a lone king pays out a tier-9 apex card, and threefold is off for the whole diff.
- **Evidence:** Re-ran diff-kvk.ts: with Ke1 v Ke8, the diff ran 6 more plies, then resolveDiffFlag(g,'w') awarded Black 'culling (tier 9)'. resolveDiffFlag (game.ts:1611-1614) and flagChessDiff (worker.ts:3511-3519) always award the other side. The diff cast sets historyDiverged (library.ts:3799), so the game.ts:1835 threefold check never runs during a diff, and endChessDiff (game.ts:1595) leaves it set for the rest of the main game. Chess Diff is live and drawn at 2x rate (library.ts:3740-3743).
- **Verifier:** Merged in that threefold is also off inside the diff. The 1+0 bullet flag against a bare king is plausible. Kept at P1.
- **Files:** `src/engine/game.ts`, `worker.ts`, `src/engine/buffs/library.ts`, `scripts/sim-chess-diff.ts`
- **Size** S · **Kind** bug · **Section** 1.2 · **Repro** yes · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/rules-end-state/`

### MA-013 · Add scripts/test-game-end.ts and run it in npm run guard with test:san, test:archive-replay, sim-chess-diff and a short parity fuzz

- **Why:** No regression test covers fifty-move, threefold, no-moves, paralysis, end precedence or the flag result, and the engine suites that do exist never run in CI.
- **Evidence:** CHEAP_GUARDS (guard.mjs:18-43) lists none of the engine suites. sim-chess-diff.ts is not in package.json. grep for 'fifty-move|threefold|mutual paralysis' in scripts finds only sims and an incidental comment (test-house-engine.ts:404). Re-ran test:archive-replay (27/27) and sim-chess-diff (ALL PASS) in about 1-2s each. The scratch scripts end-state*.ts, extra-move-card.ts and diff-kvk.ts can seed the new test.
- **Verifier:** new in the resolve pass
- **Files:** `scripts/polish/guard.mjs`, `package.json`, `scripts/sim-chess-diff.ts`, `scripts/test-san.ts`, `scripts/test-archive-replay.ts`, `scripts/polish/parity-fuzz.ts`, `.github/workflows/guards.yml`
- **Size** S · **Kind** test · **Section** 1.2 · **Repro** no · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/rules-end-state/`

### MA-014 · Mix a server-held per-match secret into card-effect RNG so random outcomes cannot be computed from public state

- **Why:** A modified client can compute live gamble cards' outcomes (Heads or Tails, Loaded Dice, Lootbox...) before deciding to activate them in rated games.
- **Evidence:** fxRng (game.ts:887-917) seeds from boardSignature, ply and public card counts only, by design (comment at game.ts:880-886). The auditor's Wheel of Fortune proof used a retired card (retired.ts:808). Re-done on the live gm_heads_or_tails (gambling.ts:130): verify/rng-live-card.ts predicted heads or tails from a serialize/deserialize clone in 40/40 positions, identical under two different server draft seeds. 31 live cards reference rng (verify/live-rng-cards.ts). A fix must keep replicas in sync, either by sending resolved outcomes or by revealing a salt at game end and archiving it.
- **Verifier:** Evidence swapped to a live card. Kept at P1: exploiting it needs a modified client, so it is not a P0 leak.
- **Files:** `src/engine/game.ts`, `worker.ts`, `src/components/OnlineMatch.tsx`, `src/lib/draftOnline.ts`, `src/engine/replay.ts`
- **Size** L · **Kind** bug · **Section** 1.3 · **Repro** yes · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/rules-end-state/`, `docs/audit/2026-10-02/repro/hidden-draft/`
- **Merged in:** Decide whether api.rng card outcomes may be predictable by the acting player; if not, roll them server-side and ship the result in dtUsed/dtResolved (P2, from hidden-draft)

### MA-015 · Guard card-id stability and replay safety: append-only id ledger plus a draft-pool fingerprint that forces a REPLAY_VERSION bump; verify stored pick card ids on replay

- **Why:** Replays resolve a pick as an index into an offer re-rolled from today's pool, so any pool change across deploys re-deals archived draft games.
- **Evidence:** repro-pool-drift.ts (re-run): removing sentinel_pawn changed 2 of 4 offers for the same seed. applyEngineDraftAction calls pickDraftCard(game, color, action.index) and ignores the stored cards (replay.ts:78). REPLAY_VERSION is a hand-edited literal (worker.ts:220). Per-match moderator overrides ARE stamped (worker.ts:3806-3808, cardOverrides on StoredMatch), so the drift comes from code deploys, not moderation.
- **Verifier:** Verified that moderator overrides are frozen per match, which narrows the cause to code changes.
- **Files:** `scripts/gen-card-registry.ts`, `src/engine/replay.ts`, `worker.ts`, `src/engine/draft.ts`, `src/engine/retired.ts`
- **Size** M · **Kind** gap · **Section** 2.1 · **Repro** yes · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/cards/`

### MA-016 · Add a table-driven per-card effect test harness, starting with the 242 live nerfs and the tier 7-10 buffs

- **Why:** Almost no card has a behavioural assertion; existing suites are no-throw or soft-lock probes.
- **Evidence:** test-hexes.cjs (256 lines) probes opening soft-lock and one walnut case; test-nerfs.cjs (76 lines) probes EXPANDED_NERFS only. No effect-table script exists in scripts/ (ls). The auditor's coverage count of 19/1665 was not independently recounted.
- **Verifier:** File list corrected to name the new script.
- **Files:** `scripts/test-card-effects.ts`, `scripts/test-card-impact.ts`, `src/engine/nerfs/expanded/index.ts`, `src/engine/buffs/library.ts`, `src/engine/nerfs/library.ts`, `docs/card-registry.json`
- **Size** L · **Kind** test · **Section** 2.1 · **Repro** no · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/cards/`, `docs/audit/2026-10-02/repro/quality/`
- **Merged in:** Add per-card behaviour assertions by growing scripts/test-card-impact.ts into a scenario table (FEN, card, action, expected legal-move or effect delta), starting with nerfs and tiers 7-10 (P2, from quality)

### MA-017 · Make pocket drops and card-driven placements respect the holder's nerf, or reword own_half_only and total_pacifism

- **Why:** Nerf text promises that spawned pieces can't bypass the boundary and that no card captures on your behalf, but drops and card effects never consult the nerf.
- **Evidence:** repro-drop-bypass.ts (re-run): own_half_only plus bn4_spare_button gives 0 board moves past rank 4 but 16 enemy-half pawn drops. The drop loop is deliberately appended after every nerf filter (game.ts:1527-1547). repro-nerf-claims.ts (re-run): 5 attack cards break total_pacifism, and about 7 non-relief cards break own_half_only (its list of 20 includes legit nerf-relief cards such as reprieve and full_pardon).
- **Verifier:** Reproduced. A8 (DROPPED) discussed drops bypassing nerfs only as a balance question; it does not cover the text contradiction, so the row's status is right for its own scope. Kept at P1 rather than P0 because drop bypass is a documented engine design choice and the fix may be a text change.
- **Files:** `src/engine/game.ts`, `src/engine/nerfs/expanded/tier8.ts`, `src/engine/buffs/boons4.ts`, `src/engine/buffs/boons3.ts`, `src/engine/buffs/boons2.ts`
- **Size** M · **Kind** bug · **Section** 2.2 · **Repro** yes · **Ralph** A8 · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/cards/`

### MA-018 · Extend scripts/polish/parity-fuzz.ts with board invariants (pawn rank, zero-moves-no-result, orphan effects) and add a per-card probe and pair matrix; run a time-boxed slice in the guard

- **Why:** A random multi-card fuzz already exists but only checks replay parity; the auditor's invariant fuzz found both P0 classes in seconds.
- **Evidence:** parity-fuzz.ts plays random games with picks, banks, rerolls and activations and asserts live/replay/checkpoint agreement only (header lines 1-24). It runs as test:parity (package.json:129), which is NOT in CHEAP_GUARDS. The auditor's scratch fuzz.ts/probe-cards.ts/pairs.ts flagged PAWN_NO_PROMO, NO_MOVES_NO_RESULT, PAWN_BACK_RANK and ORPHAN_EFFECT.
- **Verifier:** The auditor said nothing in the repo runs random multi-card games. parity-fuzz.ts does, minus invariants, so the item is reframed to extend it.
- **Files:** `scripts/polish/parity-fuzz.ts`, `scripts/probe-cards.ts`, `scripts/test-card-pairs.ts`, `scripts/polish/guard.mjs`, `package.json`, `.github/workflows/guards.yml`
- **Size** S · **Kind** test · **Section** 2.2 · **Repro** yes · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/cards/`, `docs/audit/2026-10-02/repro/quality/`
- **Merged in:** Scale the fuzz to 10k games in a sharded nightly run and add per-action legality invariants to parity-fuzz (one king per side unless a result is set, side to move consistent, no piece on a void or blocked square, legalMoves non-empty or result set) (P1, from quality)

### MA-019 · Make Extra Glance and Stream Sniper reveal the opponent's nerf in online games: send the nerf id to the holder when oppNerfRevealed is set (or keep them out of online pools)

- **Why:** In about 10% of nerf-mode games a card is offered whose main effect does nothing online.
- **Evidence:** oppNerfRevealed is read only in src/app/game/page.tsx:1696 and 2583, the local game. worker.ts and OnlineMatch.tsx never read it. I re-ran worker-extra-glance.ts: the server set oppNerfRevealed, 0 later frames named the nerf, and the reconnect frame had revealed=null. Live in pools: extra_glance and stream_sniper (tier 1). third_eye, pr_phishing, wa_foresight and wa_omniscience set the flag too but are retired (my reveal-cards.ts).
- **Verifier:** Lowered from P0 to P1. A card that does nothing is wrong, but it is not on the P0 list: no illegal move, leak, desync or wrong result.
- **Files:** `worker.ts`, `src/components/OnlineMatch.tsx`, `src/engine/draft.ts`, `src/engine/buffs/library.ts`, `src/engine/buffs/funny/meta.ts`
- **Size** S · **Kind** bug · **Section** 2.3 · **Repro** yes · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/hidden-draft/`

### MA-020 · Keep opening nerfs secret in friend and challenge nerf-mode games: stop finalizeNerfDraft revealing on the picksVisible flag that createMatch now forces on (or, if open nerfs are intended, change the copy and docs)

- **Why:** Friend nerf games show both nerfs face up from move one, while the nerf screen says 'It stays secret until the game ends' and queue games keep them hidden.
- **Evidence:** createMatch forces `picksVisible = draft` (worker.ts:3792), and finalizeNerfDraft then sets `if (match.picksVisible) match.revealed = {w:true,b:true}` (worker.ts:8722). Re-ran the friend harness: started frame revealed {w: switchback, b: artillery}. OnlineMatch.tsx:415-418 and 569 then show it at once. Commit dd8d1df made buff picks public and says nothing about opening nerfs, so this looks like a side effect. Spectators who joined before the start still see neither nerf.
- **Verifier:** Lowered from P0 to P1. The leak is symmetric (both seats see both nerfs), so neither player gains an edge. It hits mostly casual friend games and may be what the owner wants. Owner decision needed.
- **Files:** `worker.ts`, `src/components/OnlineMatch.tsx`, `docs/game-server-protocol.md`
- **Size** XS · **Kind** bug · **Section** 2.3 · **Repro** yes · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/hidden-draft/`

### MA-021 · Commit a worker frame-capture test (fake DurableObject ctx and sockets) asserting per-recipient payloads for classic, nerf-queue, nerf-friend, buff, house and spectator, plus reconnect mid-draft

- **Why:** Every leak above is in worker.ts frames that no test inspects.
- **Evidence:** grep finds GameServer/startPayload/draftStateFor only in scripts/test-desync.cjs (a header comment; it loads dist-server engine modules, not the worker) and scripts/polish/test-realtime-rules.ts (source slicing). The auditor's preload.cjs plus stubs approach ran the real GameServer for me in under 3s per scenario.
- **Verifier:** new in the resolve pass
- **Files:** `scripts/`, `package.json`, `scripts/polish/guard.mjs`, `worker.ts`
- **Size** M · **Kind** test · **Section** 2.3 · **Repro** no · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/hidden-draft/`

### MA-022 · Commit a seeded AI-vs-AI legality fuzz (random cards and nerfs, every practice level and house tier) that asserts move in legalMoves, no mutation of the game by the pick or any probe, and accepted activations; run a short slice in npm run guard

- **Why:** Nothing in CI checks that the AI plays only legal moves or leaves the game untouched under card combos, which is how the P0 went unnoticed.
- **Evidence:** Auditor's fuzz-run1.txt: 42 games and 1896 plies, with 0 illegal moves and 1 pick-mutated-game (seed 105, op_viziers_errand armed:true). The only committed check, test:house-sim (sim-house-bots.ts:142-160), plays 3 tiers x 3 games x 2 modes with organic drafts. It is not in CHEAP_GUARDS (guard.mjs:18-43), and guards.yml runs only typecheck, lint and guard. scripts/audit-augment-purity.ts (package.json:24) exists but probes augment hooks directly, not the probe callers, and is also not in guard.
- **Verifier:** Confirmed the guard list and CI steps. Also noted that audit:augment-purity exists but is out of CI and missed the live-instance path.
- **Files:** `scripts/polish/guard.mjs`, `package.json`, `scripts/sim-house-bots.ts`
- **Size** S · **Kind** test · **Section** 3 · **Repro** yes · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/balance-ai/`

### MA-023 · Stamp disconnectedAt for seats with no live socket after an isolate restart (or track last-seen per seat), so opponentGone, claimWin and GC keep working

- **Why:** After a deploy, an opponent who never returns cannot be claimed against, and an untimed game stays live and listed in the lobby forever.
- **Evidence:** The constructor only rehydrates sockets from getWebSockets (worker.ts:1350-1354). reconnectMatch clears only the returning seat's stamp (worker.ts:2419). claimAbandonment requires match.disconnectedAt[opp] (worker.ts:4378-4384), and isExpired requires a stamp (worker.ts:9536-9538). Re-ran net-audit.ts: opponentGone is never sent, and claimWin returns no_claim for both untimed and 30+0. Re-ran restart-leak.ts: the timeSec=0 game is stored, in live:ids and listed in the lobby after 55h. This rests on the unverified assumption that Cloudflare delivers no webSocketClose for sockets dropped by a code update.
- **Verifier:** Re-ran both scripts and confirmed every code path. It stays P1, not P0, because it depends on runtime behaviour the harness cannot prove.
- **Files:** `worker.ts`
- **Size** S · **Kind** bug · **Section** 4 · **Repro** yes · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/net/`

### MA-024 · Retry finished games whose D1/Postgres record failed, and never leave match.recorded=true when db() returns null

- **Why:** One transient D1, Hyperdrive or ensureSchema failure at game end permanently loses the game row and its rating change.
- **Evidence:** endMatch sets recorded=true, then resets it to false on error "so a later end-path replay can retry" (worker.ts:3663-3712). But every endMatch caller is gated on a live result, and grep for '.recorded' finds only those three lines, so nothing ever retries. db() returns null during the 5s ensureSchema backoff (worker.ts:1382-1401), which skips the write and leaves recorded=true. The Postgres insert runs after the D1 batch and throws out of recordFinishedGame (games.ts:534-572). Re-ran record-loss.ts: result was set, recorded=false, and 4 alarms over about 5 min issued no game write.
- **Verifier:** Reproduced. P1 is right: it is data and rating loss, but it needs an infrastructure blip to trigger.
- **Files:** `worker.ts`, `src/lib/server/games.ts`
- **Size** S · **Kind** bug · **Section** 4 · **Repro** yes · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/net/`, `docs/audit/2026-10-02/repro/accounts/`
- **Merged in:** Retry failed finished-game recordings (D1 or Postgres) from the DO alarm instead of relying on an end-path replay that never happens (P1, from accounts)

### MA-025 · Cap concurrent sockets per client address and per account at upgrade, and require an account (plus a per-user throttle) for spectator chat

- **Why:** Every live game shares one DO, and one client can open unlimited sockets, each with its own 10 frames/s budget and durable chat writes.
- **Evidence:** handleFetch computes attachment.addr (worker.ts:1853-1854) but never counts it. The frame budget is per socket (socketGuard.ts:55-90). schat accepts 'Anonymous' (worker.ts:7818). Re-ran net-audit2: 50 anonymous sockets from one address were accepted, and 100 schat messages caused 100 storage puts. LEDGER F069 / Q19 is still TODO. Not tested against Cloudflare edge or WAF limits.
- **Verifier:** Reproduced in the harness. Real-edge limits are unknown, so this is an availability gap, not a proven outage.
- **Files:** `worker.ts`, `src/lib/server/socketGuard.ts`
- **Size** S · **Kind** gap · **Section** 4 · **Repro** yes · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/net/`

### MA-026 · Promote the fake-runtime GameServer harness into scripts/test-do-harness.ts and add it to npm run guard

- **Why:** No executable test covers the DO's realtime behaviour; the existing guards are mostly regexes over worker.ts.
- **Evidence:** guard.mjs:18-42 runs test:socket-guard, test:realtime-rules and test:seat-superseded, which are mostly source checks per the auditor's counts. The scratch harness (audit/net/fakeRuntime.ts, fakeD1.ts, net-audit.ts, net-audit2.ts) ran in this verification in about 10s and covers fuzz, duplicates, two tabs, abandonment, restart, rematch, spectating, floods and GC. Fix its 'out-of-turn' check first: it sends a legal white move at ply 2. Ralph P1 (TODO) wants a real preview game for seat takeover, which this partly covers.
- **Verifier:** Kept. Notes the harness's own false FAIL (out-of-turn test) so it is not committed as-is. Ralph P1 is still correctly TODO.
- **Files:** `scripts/polish/guard.mjs`, `package.json`, `worker.ts`
- **Size** M · **Kind** test · **Section** 4 · **Repro** no · **Ralph** P1 · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/net/`

### MA-027 · Commit a recordFinishedGame regression test on a node:sqlite D1 shim (replay, abort, self-play, concurrent CAS, archive retry) and add it to npm run guard

- **Why:** The exactly-once ledger and the CAS retry are the core rating-correctness guarantees and nothing tests them.
- **Evidence:** Nothing under scripts/ or e2e/ calls recordFinishedGame or touches recorded_games. Only countsForRating is checked (scripts/polish/test-realtime-rules.ts:21-29), and CHEAP_GUARDS (guard.mjs:18-43) has nothing for rating writes. The auditor's d1shim.ts and record-idempotency.ts run in about 1s under tsx.
- **Verifier:** Confirmed by grep.
- **Files:** `src/lib/server/games.ts`, `scripts/polish/guard.mjs`, `package.json`
- **Size** S · **Kind** test · **Section** 5 · **Repro** no · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/accounts/`

### MA-028 · Add e2e/board-input.spec.ts: mouse drag-drop, touch tap-tap and touch drag (hasTouch), pen via CDP pointerType 'pen', right-click arrow then left-click clear, premove queue/cancel, flip button and `f`, ArrowLeft/Right scrubbing, and assert the drag ghost sits 0px from the pointer at 360/390

- **Why:** Board.tsx is 5,522 lines, only mouse click-click is automated, and the ghost offset has never been measured on touch.
- **Evidence:** The only board-input test is e2e/feel.spec.ts:126-217 (mouse.down/up click-click). The hasTouch contexts in e2e/ (social-routes, content-states, sweep:393, home-stable) never touch the board. The ghost transform is at Board.tsx:4260-4262 on a fixed .drag-ghost (globals.css:1786). Merged in the auditor's separate ghost-offset measure item. B2 is TODO, which is correct.
- **Verifier:** Merged with the P2 ghost-measure item, since it is the same spec and the same assertion. Dropped the pinch-zoom worry: caniuse-lite rates touch-action 'y' on iOS Safari 13+ and Android Chrome.
- **Files:** `e2e/board-input.spec.ts`, `src/components/Board.tsx`, `playwright.config.ts`
- **Size** M · **Kind** test · **Section** 6.1 · **Repro** no · **Ralph** B2 · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/ui-board/`

### MA-029 · Design a landscape-phone match layout: a short-height media query that shrinks the header and reserves, puts player strips and actions beside the board, and drops the fixed drawer below 500px of height

- **Why:** A rotated phone gets a 130-222px board (16-28px squares).
- **Evidence:** The only orientation query in src is (orientation:portrait) for the tablet band (matchLayout.ts). There is no landscape or max-height query. boardFitClass at OnlineMatch.tsx:2652-2660 uses sm:calc(100dvh-12rem) (15rem with a hint). Re-ran landscape-board.mjs: iPhone 14 landscape 222px, 180px with a hint, 130px with the tab bar shown. C13 (TODO) covers the 768-1023 band; its portrait half has shipped in matchLayout.ts, so the row text is partly stale.
- **Verifier:** Corrected the evidence: orientation queries do exist, but only portrait ones. Sizes are computed from literal calc strings.
- **Files:** `src/components/OnlineMatch.tsx`, `src/app/game/page.tsx`, `src/components/matchLayout.ts`, `src/components/SiteHeader.tsx`, `src/components/MobileBuffDrawer.tsx`, `src/components/mobileChrome.ts`
- **Size** M · **Kind** gap · **Section** 6.2 · **Repro** no · **Ralph** C13 · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/ui-screens/`, `docs/audit/2026-10-02/repro/ui-board/`
- **Merged in:** Measure the match board in landscape phone viewports (568x320 to 932x430) and, if squares are under 32px, add a short-height rule that trims the 12-15rem height reserve or puts the player strips beside the board (P2, from ui-board)

### MA-030 · Keep the usable cards and game actions inside the first phone viewport during play (a sticky mini-dock, or cards ahead of the move strip), and move the read-only opponent pocket out from between the board and the bottom clock

- **Why:** Activated buffs are played from the dock, which on phones sits 4th in a scrolling stack under the board.
- **Evidence:** MobileMatchStack.tsx:45-62 orders actions, then move strip, rule, cards, chat and extra. BuffDock.tsx passes usable/onStartUse to DockRow, so activation happens in the dock. OnlineMatch.tsx:3257-3279 renders own and opponent pockets between the board and the bottom BoardPlayerRow; the own drop tray belongs there, but the read-only 'Their pocket' does not. The fold position is estimated. C6 (TODO) is correct.
- **Verifier:** Narrowed the pocket part to the opponent's read-only tray. Keeping the own drop tray by the board is correct.
- **Files:** `src/components/MobileMatchStack.tsx`, `src/components/OnlineMatch.tsx`, `src/app/game/page.tsx`, `src/components/dock/BuffDock.tsx`
- **Size** M · **Kind** gap · **Section** 6.2 · **Repro** no · **Ralph** C6 · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/ui-screens/`

### MA-031 · Fix unreadable light-theme notices and board banners: replace bg-ink-700/95, bg-ink-950/90 and bg-ink-900/75 with var(--bg-raised) or .plate-raised, or add html[data-light] overrides

- **Why:** Light-theme players cannot read the opponent-card log, extra-turn and nerf-reveal banners, the abort warning or the motion notices.
- **Evidence:** ink-700 (#302e2c) and ink-950 are literal hexes (tailwind.config.ts:39-47) with no light override (globals.css:2211-2213 only patches 900/60, 900/70 and 800/60), while html[data-light] .text-parchment-* becomes dark ink (globals.css:517-523). Sites: SettingsBootstrap.tsx:164 and :329, OnlineMatch.tsx:2890, OppPlaysLog.tsx:181, Board.tsx:339-340, 369, 464 and 525-528, TvView.tsx:345. contrast.mjs (re-run): 1.08, 1.45 and 2.09 on the notices. My banner-contrast.mjs: light gold-leaf on the board banner 2.20, TV failover text 1.24. The light theme is applied via html.dataset.light (settings.ts:622). Computed from shipped values, not rendered.
- **Verifier:** Verified the cascade by reading. No override for bg-ink-700 or bg-ink-950 exists anywhere in the CSS. Added the gold-leaf and TV numbers. Kept at P1 as an accessibility blocker; it is not P0 game logic.
- **Files:** `src/components/SettingsBootstrap.tsx`, `src/components/OnlineMatch.tsx`, `src/components/OppPlaysLog.tsx`, `src/components/Board.tsx`, `src/app/tv/TvView.tsx`, `src/app/globals.css`
- **Size** S · **Kind** bug · **Section** 6.3 · **Repro** no · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/ui-screens/`

### MA-032 · Clear dropSkipRef when a drag drop opens the promotion picker (or exclude promotions from the skip) so drag promotions stop firing a card detonation and explosion on the pawn's origin

- **Why:** Every dragged promotion shows an explosion and plays its sound on the pawn, which looks like a card removed it.
- **Evidence:** onUp sets dropSkipRef = sq (Board.tsx:4274) and calls tryPlay. For a promotion, tryPlay either opens setPromotionMove or auto-queens (:3944-3960), and board.pieces does not change yet. The skip is cleared only inside the fxPieces-diff block (:3151) or on pointercancel (:4300). The later commit therefore diffs with skipSquare = the promotion square. gainedColor ignores that square (:1325-1331), so the vanished pawn goes into detSquares, which renders DetonationBurst (:2137) and calls playExplosion (:3238). Reproduced in feel-verify/ by re-extracting the current Board.tsx lines 948-995 and 1288-1451 and running the cases: drag e7-e8=Q gives 'detonate@e7', drag e7xd8=Q gives 'detonate@e7', click gives 'morph+crown@e8'. Related: if the picker is dismissed, the stale skip stays set until the next position change. Not run in a browser.
- **Verifier:** Reproduced on the current source. Kept at P1 because it shows false feedback about game state (a fake card removal) on a common input path. Not P0: no rules, result or sync effect. Size cut to XS: the fix is a one- or two-line reset.
- **Files:** `src/components/Board.tsx`
- **Size** XS · **Kind** bug · **Section** 7 · **Repro** yes · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/feel/`

### MA-033 · Announce check, low-clock warnings, card plays and extra-turn grants through Board's persistent announce() live region instead of aria-live wrappers mounted with their text

- **Why:** Screen-reader players are never told they are in check or low on time, and card effects reach them unreliably.
- **Evidence:** The move words at Board.tsx:4912-4923 never include check; 'in check' appears only in descText (Board.tsx:1802). ClockPill.tsx:143-147 fires sound cues only, with no live region. ExtraTurnsBanner and PlayAnnouncement (Board.tsx:334, 366) and OppPlaysLog.tsx:161-162 add role or aria-live on mount together with their content, and the game-page hint does the same (game/page.tsx:2052-2066). The check and clock gaps are certain; how unreliable the mounted-with-content regions are depends on the screen reader and was not tested.
- **Verifier:** Added OppPlaysLog, which uses the same pattern. The check and clock gaps are definite from the code. The live-region reliability point is from code reading only.
- **Files:** `src/components/Board.tsx`, `src/components/ClockPill.tsx`, `src/components/OppPlaysLog.tsx`, `src/app/game/page.tsx`, `src/components/OnlineMatch.tsx`
- **Size** S · **Kind** gap · **Section** 9 · **Repro** no · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/a11y-npe-copy/`

### MA-034 · Add a Playwright keyboard-only full-game spec: /play Start, arrow and Enter moves, draft pick, card activation with square targeting, promotion and its cancel, game-over dialog

- **Why:** Keyboard play is claimed but has only ever been measured for a single move.
- **Evidence:** smoke.spec.ts:50 and feel.spec.ts click gridcells. keyboard.press appears only in the polish route specs and draft-escape.spec.ts:30 (Escape only). C10 is DONE and measured one move (sq12 to sq28); that status is right for its scope, but the full-game claim is untested.
- **Verifier:** Confirmed by grep of e2e/.
- **Files:** `e2e/keyboard-game.spec.ts`, `src/components/Board.tsx`, `src/components/DraftOverlay.tsx`, `src/components/dock/targeting.tsx`, `src/lib/boardKeymap.ts`
- **Size** M · **Kind** test · **Section** 9 · **Repro** no · **Ralph** C10 · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/a11y-npe-copy/`

### MA-035 · Run the engine suites in CI: add a guard:engine tier (server:build, test:rules, test:nerfs, test:desync, test:snapshot, test:san, test:lab, test:parity, test:draft-sequence/fairness/derivation/timeout, test:glicko, test:clock-pause, test:card-impact) as a guards.yml job

- **Why:** No rules-engine, desync, snapshot or card test runs on push, so a broken rule merges green.
- **Evidence:** guards.yml:33-38 runs typecheck, lint and guard only. guard.mjs:11-15 says the engine suites are left out on purpose. I re-ran test:lab (5s) and test:card-impact (0.8s), and the auditor measured test:parity at 79s, so all are cheap enough for CI. LEDGER F250 is still TODO and asked for a build and e2e job as well; CI now exists but runs neither, so that row is half done rather than stale.
- **Verifier:** Added test:card-impact and the F250 cross-reference. CI also never runs next build, so the .next/types route validator is only checked at deploy time.
- **Files:** `scripts/polish/guard.mjs`, `package.json`, `.github/workflows/guards.yml`, `scripts/test-hexes.cjs`, `scripts/test-nerfs.cjs`, `scripts/test-companions.cjs`, `scripts/test-expansion.cjs`, `scripts/audit-cards.ts` +2
- **Size** S · **Kind** test · **Section** 10 · **Repro** yes · **Ralph** E2 · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/quality/`, `docs/audit/2026-10-02/repro/cards/`, `docs/audit/2026-10-02/repro/hidden-draft/`, `docs/audit/2026-10-02/repro/net/`, `docs/audit/2026-10-02/repro/balance-ai/`, `docs/audit/2026-10-02/repro/features-meta/`
- **Merged in:** Wire the engine card suites into CI (tsx ports or a server:build step), fix the stale card-audit, and correct the 'Wired into CI' comments (P1, from cards); Add test:draft-fairness, test:draft-sequence, test:draft-derivation, test:draft-timeout, test:spectator-sync and test:archive-replay to npm run guard (P1, from hidden-draft); Run test:desync and a 10-game parity fuzz in CI (guard.mjs or a guards.yml step) (P1, from net); Add test:ai-activation, test:house-policy, test:search-buffs and test:balance-pass to CHEAP_GUARDS so CI runs them (P2, from balance-ai); Wire the cheap feature-surface checks into the guard and CI: test:tournament-pairing, test:archive-replay, test:og, and a new test:puzzles (gen-puzzles.ts --verify) (P2, from features-meta)

### MA-036 · Make test:nerfs smoke every nerf (all 368, as White's and Black's handicap, 3 seeds x 60 plies; fail on throw, zero legal moves without a result, or king count other than 2), and make audit-cards.ts stop crediting test-nerfs.cjs to nerfs it never plays

- **Why:** 287 of 368 nerfs get no deterministic smoke, yet card-audit.md reports 0 untested cards.
- **Evidence:** test-nerfs.cjs:28 loops EXPANDED_NERFS (81). audit-cards.ts:101-106 pushes 'test-nerfs.cjs' onto every implemented nerf, which yields docs/card-audit.md:5 '0 without direct test references'. I re-ran the auditor's nerf-smoke.ts: 368 nerfs, 2208 games, 117,817 plies, 5.5s, 0 failures. I checked that the king check is real (board.pieces is a 64-entry array). test:parity samples random PLAYABLE_NERFS (parity-fuzz.ts:204), but only about 40 per run.
- **Verifier:** Merged in the lab-to-nerfs item. Added the false card-audit claim, found during verification. 'Reproduced' means the coverage gap and the false claim were shown; no nerf failed.
- **Files:** `scripts/test-nerfs.cjs`, `scripts/audit-cards.ts`, `docs/card-audit.md`
- **Size** XS · **Kind** test · **Section** 10 · **Repro** yes · **Ralph** A7 · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/quality/`, `docs/audit/2026-10-02/repro/cards/`
- **Merged in:** Make card-audit's 'tests' column count real assertions instead of crediting every card to lab-run-all/test-nerfs (P2, from cards)

### MA-037 · Add a Playwright spec against `npm run preview`: two browser contexts play an online game, one goes setOffline mid-game and reconnects to the same position, then resign and online rematch

- **Why:** The core online loop, including reconnect and rematch, has no automated end-to-end test.
- **Evidence:** No setOffline or reconnect appears in e2e/. Specs mock the game socket under next dev (game-id-states.spec.ts, quickmatch-double-tap.spec.ts, seek-persist.spec.ts). README.md:20 says next dev does not run the DO. Ralph P1 (manual preview game, TODO) overlaps but is manual.
- **Verifier:** new in the resolve pass
- **Files:** `e2e`, `playwright.config.ts`, `worker.ts`, `src/lib/multiplayer.ts`
- **Size** M · **Kind** test · **Section** 10 · **Repro** no · **Ralph** P1 · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/quality/`

### MA-038 · Make /history/[id] replay card games correctly: send draft games that have a serverGameId to /game/{id}, and record draft actions for local AI draft games or show 'replay unavailable'

- **Why:** The local replay of a card game shows pieces that cards destroyed, because the entry stores UCI moves only and is replayed with plain makeMove.
- **Evidence:** history/page.tsx:152-156 prefers /history/{id} whenever moves exist. OnlineMatch.tsx:1599-1615 and game/page.tsx:1108-1125 store only moves.map(moveToUCI). history/[id]/page.tsx:79 replays with replayUci. gameReview.ts:45-46 says callers should gate on buffs.historyDiverged, and this page does not. I re-ran history-replay-draft.ts from the repo cwd: after detonate on e5, 3 squares (e4, e5, d6) are empty live but still hold pawns in the replay.
- **Verifier:** I reproduced this independently. It needs the repo as cwd because of the @/ alias. No ralph row covers it. P1 rather than P0: it affects a post-game display only and does not touch results or ratings.
- **Files:** `src/app/history/[id]/page.tsx`, `src/app/history/page.tsx`, `src/lib/gameHistory.ts`, `src/lib/gameReview.ts`, `src/components/OnlineMatch.tsx`, `src/app/game/page.tsx`
- **Size** S · **Kind** bug · **Section** 12 · **Repro** yes · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/features-meta/`

### MA-039 · Make test:sitemap-dates independent of clone depth: set fetch-depth: 0 in guards.yml and have gen-sitemap-dates.ts skip with a warning when git rev-parse --is-shallow-repository is true (do not regenerate the file from a shallow clone)

- **Why:** The guard fails in any shallow clone, including CI's fetch-depth 50, which turns the whole guard job red and hides real regressions.
- **Evidence:** npm run -s test:sitemap-dates exits 1 here. A fresh git clone --depth 50 file:// of HEAD 1582cf7 (the CI depth) also exits 1 with the same 16 routes moving from 09-23 to 09-24. Cause: shallow-boundary commits (.git/shallow lists 44b39101, which shows 5353 files added) make git log -1 -- <files> return the boundary date. bf5805d regenerated the file after 44b39101, so the committed dates are probably right under full history. The auditor's 'regenerate the file' fix would write wrong dates. guard.mjs:34 includes it and guards.yml:27 sets fetch-depth: 50.
- **Verifier:** The auditor called this real staleness, not a shallow-clone artefact. That is wrong: it is exactly a shallow-clone artefact, which I proved with a depth-50 clone. The defect is the guard's dependence on clone depth, and CI's depth 50 reproduces it. Retitled and changed the fix.
- **Files:** `scripts/gen-sitemap-dates.ts`, `.github/workflows/guards.yml`, `scripts/polish/guard.mjs`
- **Size** XS · **Kind** bug · **Section** 13 · **Repro** yes · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/a11y-npe-copy/`, `docs/audit/2026-10-02/repro/quality/`
- **Merged in:** Make test:sitemap-dates shallow-clone safe: detect `git rev-parse --is-shallow-repository` and skip routes whose newest commit is a graft boundary (or fail with a 'fetch more history' message) (P2, from quality)

### MA-040 · Push ban, mute, rename and logout to live game sockets through an internal DO route (F081 / P-mod-push)

- **Why:** A banned or muted player with an open socket keeps playing rated games and chatting until they reconnect.
- **Evidence:** worker.ts:1855-1866 resolves userId, username, guest and mutedUntil once at upgrade, and that is the only userForSession call in worker.ts. Chat gates on the cached session.mutedUntil (worker.ts:7773,7821). mod.ts:199-208 only updates D1 and deletes sessions; it never contacts the DO. LEDGER F081 is TODO.
- **Verifier:** Confirmed. P12 is correctly TODO, but its label 'mod push notifications' misdescribes F081, which is about re-checking state on live sockets.
- **Files:** `worker.ts`, `src/lib/server/mod.ts`, `src/app/api/auth/logout/route.ts`, `src/app/api/mod/users/route.ts`
- **Size** M · **Kind** bug · **Section** 14 · **Repro** no · **Ralph** P12 · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/security/`, `docs/audit/2026-10-02/repro/net/`
- **Merged in:** Apply mute, ban and rename to already-open sockets through an internal DO route the mod API calls (P2, from net)

### MA-041 · Extend the existing spectator secrecy checks into a guard that also builds seat start, draftStateFor and offer frames and fails on secret fields

- **Why:** Only spectator and TV payloads are checked for draftSeed and rngState, so the seat-side leak shipped unnoticed.
- **Evidence:** scripts/test-tv-spectator.ts:294 and scripts/validate-tv-snapshots.cjs:142 already assert that no rngState, draftSeed or oppReveal appears, but only for spectator snapshots. Neither is in scripts/polish/guard.mjs. No script inspects startPayload (worker.ts:2690-2760) or per-seat dtState. The protocol's secret list is at docs/game-server-protocol.md:148-156.
- **Verifier:** The auditor said no frame check exists. Spectator-side checks do exist, so the item is 'extend to seat frames and wire into guard'.
- **Files:** `worker.ts`, `scripts/test-tv-spectator.ts`, `scripts/validate-tv-snapshots.cjs`, `scripts/polish/guard.mjs`, `docs/game-server-protocol.md`
- **Size** S · **Kind** test · **Section** 14 · **Repro** no · **Ralph** none · **Status** TODO
- **Scripts:** `docs/audit/2026-10-02/repro/security/`

## P2

### Rules engine

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-042 | Stop moveFromUCI inferring castling, en passant and double push from geometry alone: infer them only when generateMoves produces that exact move, otherwise apply a plain relocation | The raw fallback rewrites card-granted king slides into castles, diagonal pawn steps into phantom en passant captures, and sets bogus ep targets. History, review, OG and TV boards replay buff games through it. | `src/engine/board.ts`, `src/lib/gameReview.ts`, `src/components/OnlineMatch.tsx` +3 | S | bug, repro |  | TODO |
| MA-043 | Make Escape Hatch, Piece Swap and Warp Sovereign respect pawnRankOk so a swap never puts a pawn on rank 1 or 8 (route their raw api.board.pieces swaps through a checked swap helper) | Raw board writes bypass relocate()'s pawn-rank backstop. Escape Hatch (T1) used from the starting king square puts a pawn on e1. | `src/engine/buffs/library.ts`, `src/engine/buffs/helpers.ts`, `src/engine/game.ts` | XS | bug, repro |  | TODO |
| MA-044 | Give every bound-piece card one explicit promotion policy (follow, die, or transform) via trackBoundPiece, and test promoting a bound pawn for each policy | What a buff does when its piece promotes is decided card by card in hand-written trackers, and nothing tests it. | `src/engine/buffs/helpers.ts`, `src/engine/buffs/library.ts`, `src/engine/buffs/boons2.ts` +2 | M | gap, repro |  | TODO |
| MA-045 | Add a Playwright spec for the promotion picker at 390x844 touch and by keyboard: Enter opens it, focus lands on the queen, Tab+Enter underpromotes to a knight, Esc cancels with no move played | No test has ever exercised the underpromotion input path or its ghost-click and focus handling. | `e2e/promotion.spec.ts`, `src/components/Board.tsx` | S | test |  | TODO |
| MA-046 | Create DECISIONS.md recording the king-capture rule deviations, Chess Diff = FIDE, card-pawn promotion, castling rights under card removal and back-rank shuffles, card double pushes and en passant, and bound-card promotion policy; mark the FIDE-legality lines of MEGA_AUDIT 1.1 N/A or re-scoped to the Chess Diff | Several 1.1 lines can only be judged against a written rule, and the rules exist only as code comments and player-guide text. | `DECISIONS.md`, `src/app/guide/capture-the-king/page.tsx`, `src/engine/board.ts` | S | docs |  | TODO |
| MA-047 | Make a fully immobile side a draw or a forced pass, or correct the guide that says a lack of moves never ends the game | A side with zero pseudo-legal moves loses on the spot, while the guide FAQ promises that a lack of moves never ends the game. | `src/engine/game.ts`, `src/app/guide/capture-the-king/page.tsx` | S | bug, repro |  | TODO |
| MA-048 | Decide whether a card removal resets the fifty-move clock, and implement or document it | A card capture counts as a capture for material and revives but not for the fifty-move rule, so a game can be drawn two plies after a Purge. | `src/engine/game.ts`, `docs/draft-system.md`, `worker.ts` | S | gap, repro |  | TODO |
| MA-049 | Track repetition keys incrementally so threefold survives card board rewrites, drops and diffs, and include effect state | Threefold is off for the rest of the game after any summon, teleport, drop or Chess Diff, and it ignores effects that change the legal moves. | `src/engine/board.ts`, `src/engine/game.ts`, `src/engine/types.ts` +2 | M | gap, repro |  | TODO |
| MA-050 | Decide and implement insufficient-material and flag-vs-insufficient-material rules for the main game | Bare-king endings shuffle for 100 plies, and a flag against a lone king counts as a win. King capture keeps K v K live, so this needs an owner ruling that also accounts for pockets and future drafts. | `src/engine/game.ts`, `worker.ts`, `server/index.ts` +3 | M | gap, repro |  | TODO |
| MA-051 | Store a structured termination code next to the reason text and classify by it | End reasons are free text, so moderation stats count nerf losses as flags and paralysis or interruption draws as decisive results. | `src/engine/game.ts`, `src/lib/server/games.ts`, `src/lib/server/schema.ts` +3 | M | gap |  | TODO |
| MA-052 | Behaviour-test the Durable Object end flow and recordFinishedGame exactly-once under Miniflare | Resign, draw offer/accept/decline, the abort window, flag vs move, and a double end with exactly-once rating are covered only by regexes over worker.ts. | `worker.ts`, `src/lib/server/games.ts`, `scripts/polish/test-realtime-rules.ts` | M | test | P1 | TODO |
| MA-053 | Record the game-end rules and their owner decisions in DECISIONS.md and align the docs | Several end rules need an owner ruling, and the docs disagree with the code on threefold suspension and immobility. | `DECISIONS.md`, `docs/draft-system.md`, `src/lib/glossary.ts` +1 | S | docs |  | TODO |
| MA-054 | Pass the stored outcome and reason to gameToPGN on /history/[id] | PGN copied from a saved game says Result "*" with no Termination, although the entry stores the outcome and reason. The Date tag also uses endedAt. | `src/app/history/[id]/page.tsx`, `src/lib/gameHistory.ts`, `docs/ralph-backlog.md` | XS | bug, repro | E15 | TODO |
| MA-055 | Add draft card events to PGN export for draft games | Draft-game PGN has no picks, activations or card board rewrites, so the movetext alone cannot be followed or replayed. | `src/lib/pgn.ts`, `src/components/GameOver.tsx`, `src/app/game/[id]/page.tsx` +1 | M | gap |  | TODO |
| MA-056 | Store a final-position hash and check replay_version when viewing archived games (merged: Replay archived games under their recorded REPLAY_VERSION, or detect divergence from the stored result and show a 'replayed with current rules' notice; add golden archived fixtures per version) | After an engine change, old archived games can replay to a different board with no warning. | `worker.ts`, `src/lib/server/games.ts`, `src/app/api/games/[id]/route.ts` +4 | S | gap |  | TODO |
| MA-057 | Add a parity test or shared implementation for worker gameFromMatch and engine replayToPosition | The engine-service replay is kept in lockstep with the Durable Object replay by hand, and nothing compares the two. | `worker.ts`, `src/engine/replay.ts`, `scripts/polish/parity-fuzz.ts` | M | test |  | TODO |

### Cards and interactions

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-058 | Make nerf and buff ids one namespace, or key retired.ts, card_overrides, icon/glyph maps and the card audit by kind; restore the collaterally retired cards | Nine ids are both a nerf and a buff, so retiring, moderating or iconning one silently affects the other. | `src/engine/retired.ts`, `src/engine/nerfs/library.ts`, `src/engine/draft.ts` +5 | M | bug, repro |  | TODO |
| MA-059 | Fix the sampled card-text mismatches (banshee_bond, daisy_chain, raise_dead, unstated relax clauses, party_hat) | Card faces state rules the code does not follow. | `src/engine/nerfs/wild.ts`, `src/engine/nerfs/fantasy.ts`, `src/engine/buffs/fantasy/necromancy.ts` +3 | S | bug |  | TODO |
| MA-060 | Apply moderator card text overrides on in-game surfaces, not only in the codex browser | A moderator rewording a card changes the codex while draft cards, the dock and game-over still show the code text. | `src/lib/cardText.ts`, `src/components/BuffCard.tsx`, `src/components/NerfCard.tsx` +2 | S | bug |  | TODO |
| MA-061 | Rename the live display-name duplicates so no two live cards share a name | 'Opponent drafted Cold Snap' can name two different cards, and the game log cannot tell them apart. | `src/engine/buffs/library.ts`, `src/engine/buffs/boons4.ts`, `src/engine/buffs/overhaul/t1.ts` +2 | S | polish, repro | A7 | TODO |
| MA-062 | Add a card-text linter (duration templates, number style, rank names, permanence, caps, ≤/≥, can't/cannot, project-wordlist spellcheck) to the guard | Card numbers and templates read differently from card to card, and no typo guard exists. | `scripts/check-card-text.ts`, `scripts/polish/guard.mjs`, `scripts/audit-card-readability.ts` | M | polish, repro |  | TODO |
| MA-063 | Render card descriptions through GlossaryText on every surface (dock, opponent plays log, online nerf panel, history, puzzles) | Keywords are tooltipped on draft cards but not in the in-game dock where players reread cards. | `src/components/dock/DockRow.tsx`, `src/components/OppPlaysLog.tsx`, `src/components/OnlineMatch.tsx` +3 | S | polish |  | TODO |
| MA-064 | Correct glossary and guide copy that disagrees with the engine (60% hex share, per-turn freeze ticking) and add missing keyword aliases | Players are told 60% of nerf draws are hexes after the bucket was removed, and the most common card phrases have no tooltip. | `src/lib/glossary.ts`, `src/app/guide/how-to-play/page.tsx`, `src/app/guide/nerf-mode/page.tsx` | S | docs, repro | F1 | TODO |
| MA-065 | Stop swap/spawn cards from placing pawns on their own back rank (or state it on the card) | escape_hatch, piece_swap, warp_sovereign, rift_storm and trade_up write pawns onto rank 1/8 directly, bypassing the relocate guard's 'pawns never stand on rank 1 or 8'. | `src/engine/buffs/library.ts`, `src/engine/buffs/wild/warfare.ts`, `src/engine/game.ts` | S | bug, repro |  | TODO |
| MA-066 | Unify duration counting (card timers vs board effects) on one documented unit and test it | 'For your next 3 turns' can end after one turn, and a turn spent activating a card ticks some timers but not others. | `src/engine/buffs/helpers.ts`, `src/engine/game.ts`, `src/engine/buff.ts` +1 | M | bug, repro |  | TODO |
| MA-067 | Carry square-bound effects through relocations and swaps, and prune orphans after every acquisition | A relocated piece sheds its freeze/walnut/shield, and passive picks leave effects on empty squares. | `src/engine/game.ts`, `src/engine/buffs/hexes/tier6.ts` | S | bug, repro |  | TODO |
| MA-068 | Write the effect stacking and conflict rules and make card removal vs 'cannot be captured' consistent | Stacking is implicit, and 36 of 85 attack cards remove shielded pieces while explosion helpers honour shields. | `src/engine/buffs/helpers.ts`, `src/engine/comboTags.ts`, `src/lib/glossary.ts` +1 | M | gap, repro |  | TODO |
| MA-069 | Decide what bound-card effects do on promotion, make the 20 trackBoundPiece sites agree (and the helper's doc comment true), and add a test | 7 bound-card sites end on promotion and 13 carry the upgrade to the new piece, and the helper's own comment claims it always dies. | `src/engine/buffs/helpers.ts`, `src/engine/game.ts`, `src/lib/glossary.ts` | S | gap |  | TODO |
| MA-070 | Document hook trigger order and test same-ply triggers from both sides (decide mover-first vs white-first) | White's reactions always resolve before black's regardless of who moved, untested and undocumented. | `src/engine/game.ts`, `docs/game-server-protocol.md` | S | test |  | TODO |
| MA-071 | Build the top-100 most-picked pair matrix from an offline export of draftActions | The checklist wants pair coverage weighted by real picks, and no local pick-rate data exists. | `scripts/test-card-pairs.ts`, `src/lib/server/games.ts` | S | test |  | TODO |

### Hidden information and draft

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-072 | Send a fresh wstart (with pub, seq and any start-time reveals) to watchers when a Durable Object game starts, as the arena hub already does | Spectators who tune in before the start keep a 'Waiting for players' header with no sync baseline while moves stream in. | `worker.ts`, `src/app/game/[id]/page.tsx`, `arena-service/spectate.ts` | S | bug, repro |  | TODO |
| MA-073 | Auto-pick a server-random nerf option (not index 0) when the opening nerf lock-in expires | While the opponent's options are known, a timeout tells the opponent exactly which nerf was taken. | `worker.ts`, `src/components/OnlineMatch.tsx` | XS | bug, repro |  | TODO |
| MA-074 | Retire or rewrite the offer-peek clause of the draftable cards that set seeOppCards/seeOppTier, since every offer is already public online | Their information effect is dead text online under the transparency rule. | `src/engine/buffs/boons4b.ts`, `src/engine/buffs/overhaul/gambling.ts`, `src/engine/buffs/overhaul/t7.ts` +2 | S | gap |  | TODO |
| MA-075 | Rewrite the visibility and timeout sections of game-server-protocol.md, draft-system.md and draft-sequence.md to match the code, and record the owner's transparency rule (and its scope for opening nerfs) in one place | The docs describe masking, auto-resolve, cadence and tiers the code no longer has, so the next agent will 'fix' the wrong thing. | `docs/game-server-protocol.md`, `docs/draft-system.md`, `docs/draft-sequence.md` +4 | S | docs |  | TODO |
| MA-076 | Give an expired buff-draft window a terminal outcome in untimed draft games (server-random pick, or let the waiting seat move or claim) | With timeSec 0, one seat leaving its offer open blocks the other seat's own turn forever. | `worker.ts`, `src/lib/draftTimeout.ts`, `src/components/DraftOverlay.tsx` | S | bug, repro |  | TODO |
| MA-077 | Archive the opening nerf draft (both seats' options, pick indexes, timed-out flag) in DraftRecord | A nerf-mode game's draft cannot be reviewed or disputed from the archive, and the deal cannot be re-derived. | `src/lib/server/games.ts`, `worker.ts`, `docs/archive-draft-record.md` | S | gap |  | TODO |
| MA-078 | Add a test for dealNerfDraftOptions (4 distinct, symmetric tier mix, per-nerf frequency) and decide whether the 6.5x per-nerf skew from tier-uniform anchoring is intended | The opening nerf deal is untested, and some nerfs come up 6.5 times as often as others. | `worker.ts`, `scripts/test-draft-fairness.ts` | S | test, repro |  | TODO |
| MA-079 | Pin reroll and bank limits in a unit test: reroll refused at 0 and on the opener, bank bonus capped at +1, server no_reroll error | The limits hold today, but no test would catch a regression. | `scripts/test-draft-fairness.ts`, `src/engine/draft.ts`, `worker.ts` | XS | test |  | TODO |

### Balance

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-080 | Apply nerf tier overrides to opening nerf pairing, or refuse nerf tier edits in /api/mod/cards | A moderator can retier a nerf and the codex shows the new tier, but games ignore it. | `worker.ts`, `src/app/api/mod/cards/route.ts`, `src/app/api/cards/route.ts` +1 | S | bug |  | TODO |
| MA-081 | Extend sim-card-winrate to grant the card to either colour and report per side, take --skill and a multi-card --set, and write CSV alongside JSON | The checklist asks for win rate per card per side and a CSV; the harness only measures White holding one card at one skill. | `scripts/sim-card-winrate.ts`, `scripts/report-card-winrate.ts` | M | gap |  | TODO |
| MA-082 | Write a read-only balance report over an exported archive: per-card pick rate and holder win rate by side and time control, flagging cards outside 45-55% (with CI) and never-picked cards | Real pick and win data exists only as a per-card codex rollup, with no flags and an offered count that misses banked and rerolled offers. | `src/lib/server/cardInsights.ts`, `scripts/backfill-games.mjs` | M | gap |  | TODO |
| MA-083 | Re-run the full card win-rate sweep on the current engine, commit merged output that npm run report:winrate can read, and refresh material-model.json's fit | Every balance decision rests on stale data that covers about a quarter of the library. | `scripts/sim-card-winrate.ts`, `scripts/report-card-winrate.ts`, `docs/material-model.json` +1 | L | measure, repro | A2 | TODO |
| MA-084 | Add a paired per-nerf win-rate sweep (nerf on one side vs UNRESTRICTED_NERF, both colours) and flag nerfs outside the band for their tier | Opening nerf pairing relies on nerf tiers whose win-rate cost no sim has measured. | `scripts/sim-card-winrate.ts`, `src/engine/nerfs/library.ts` | M | measure |  | TODO |
| MA-085 | Measure White/Black score with and without cards: mirror-bot sims in plain, nerf and buff modes, plus an archive split by mode | Nobody knows whether cards widen or narrow the first-move edge. | `scripts/sim-card-winrate.ts`, `src/app/api/stats/route.ts` | S | measure |  | TODO |
| MA-086 | Start a balance decision log (DECISIONS.md) with before/after sweep numbers per change, and link CARD_HISTORY retier notes to it | Retiers carry prose reasons but almost no measured before/after numbers. | `src/data/cardHistory.ts`, `docs/ralph-backlog.md` | S | docs |  | TODO |

### AI opponent

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-087 | Compare drop (and castle) in worker.ts sameMove so a remote-engine pocket drop is not swapped for a different piece | With two piece types in the pocket, the DO commits a different drop than the remote engine chose. | `worker.ts` | XS | bug, repro |  | TODO |
| MA-088 | Bound frozen-clock (Workers) search CPU by measured throughput, not the 1000 nodes/ms estimate | On the DO fallback path a search can burn 10-19x its budget. | `src/engine/ai.ts` | S | bug | A25 | TODO |
| MA-089 | Teach evaluate() nerf and buff piece values (frozen or walnut pieces, shields, granted movement, pieces a nerf makes critical) | In a game about nerfs and buffs, the bot values every piece as in plain chess. | `src/engine/ai.ts`, `src/engine/game.ts` | M | gap |  | TODO |
| MA-090 | Model the mover's nerf move filter and freeze/shield effects below the root (with that state in the TT key), or measure that root-only filtering is enough | The search plans lines its own nerf forbids and drops the TT whenever a buff is held. | `src/engine/ai.ts`, `src/engine/game.ts` | L | gap |  | TODO |
| MA-091 | Score bot draft offers by measured card value and the bot's own nerf instead of 'usable + tier'; never take measured wrong-sign cards | Bots draft by card type and tier and can take cards measured to hurt their holder. | `src/engine/game.ts`, `src/lib/server/bots.ts` | M | gap |  | TODO |
| MA-092 | Calibrate bot strength labels: ladder practice easy/medium/hard and house tiers 1550-2700 at larger N, then set BOT_ELO and the Play-vs-bot bands from the results | The ratings shown and staked against bots are not backed by measured strength. | `scripts/sim-house-ladder.ts`, `src/app/game/page.tsx`, `src/app/play/setupParts.tsx` +1 | M | measure, repro |  | TODO |
| MA-093 | Track engine nodes/ms per iteration: a bench:nps command (fixed positions and budgets) that appends date, commit and median to a LEARNINGS.md series | Throughput fell from about 450 to 186 nodes/ms and was only noticed by accident. | `scripts/bench-node-throughput.ts`, `package.json` | S | measure, repro |  | TODO |
| MA-094 | Give the practice bot opening variety (HOUSE_BOOK with a per-game seed, or seeded root sampling in the first plies) for medium and hard | Every practice game against medium or hard opens identically. | `src/app/game/page.tsx`, `src/workers/aiWorker.ts`, `src/engine/ai.ts` +1 | S | polish, repro |  | TODO |
| MA-095 | Add small think-time variance to the practice bot (reuse houseThinkMs shaping instead of a fixed paceBase) | The practice bot replies after the same delay every move. | `src/app/game/page.tsx`, `src/lib/server/bots.ts` | XS | polish | B11 | TODO |
| MA-096 | Replace practice easy's 22% uniform random move with a human-shaped seeded blunder (houseBlunderMove-style) and route pickAIMove randomness through a seeded RNG | Easy still plays random-nonsense moves, and its games cannot be reproduced from a seed. | `src/engine/ai.ts`, `src/lib/server/bots.ts` | S | polish |  | TODO |

### Multiplayer and backend

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-097 | Look queue pools up with Object.hasOwn (or a Map) so prototype keys like "constructor" are rejected | A crafted queue frame creates a RATED game with no time control and null clocks that never resolves on its own. | `worker.ts`, `server/index.ts` | XS | bug, repro |  | TODO |
| MA-098 | Refuse queue, playbot and create for an account already seated in a live game (reuse liveGameIdForUser), or point it at that game | One account can play two rated games at once from two tabs, which breaks an invariant the code itself assumes. | `worker.ts`, `src/app/lobby/QuickMatch.tsx` | S | bug, repro |  | TODO |
| MA-099 | Retire the uncalled playbot frame, or limit it to queue pool time controls, so a crafted client cannot start rated games against a chosen-difficulty bot or untimed rated games | A crafted client can farm rating against an 'easy' house persona, or play a rated untimed game. | `worker.ts`, `src/lib/multiplayer.ts`, `docs/game-server-protocol.md` | XS | bug, repro |  | TODO |
| MA-100 | Lichess-style no-start abort: end unstarted autoStart games and games where a side never moved as aborted (unrated) within about 30-60s, and tell the waiting player (merged: Keep games that end before both sides have moved out of the ratings; Abort instead of rating games where a side never moved (abandonment claims and first-move flags before 2 plies), pending an owner decision) | A no-show either strands the other player for up to 30 min, or hands them a rated win over someone who never moved. | `worker.ts`, `src/lib/server/games.ts`, `src/app/lobby/QuickMatch.tsx` +3 | M | gap, repro |  | TODO |
| MA-101 | Add bounded lag compensation to move clocks, crediting each socket's measured transit from p/n round trips | The mover pays network transit on every move, which is unfair in the 1+0 and 2+1 pools. | `worker.ts`, `src/lib/multiplayer.ts`, `src/components/OnlineMatch.tsx` | M | gap |  | TODO |
| MA-102 | Add a heartbeat watchdog: the client reconnects when no frame arrives for about 2 heartbeats, and the server treats a seat silent for N seconds as disconnected | Half-open sockets after a Wi-Fi switch or a phone freeze are left to TCP timeouts, so the opponent cannot claim. | `src/lib/multiplayer.ts`, `worker.ts` | S | gap |  | TODO |
| MA-103 | Rating-banded quick pairing with a band that widens with wait time, plus rating-aware house pickup | The checklist expects rating-based pairing; today a new player can meet anyone in the pool, or any house persona. | `worker.ts`, `docs/accounts-and-matchmaking.md` | M | gap |  | TODO |
| MA-104 | Surface how many live games end as 'server update interrupted this game' per deploy, and keep games playable across REPLAY_VERSION bumps where possible | Each replay-version bump ends every live game as an unrated draw, and no dashboard or deploy step shows how many. | `worker.ts` | M | gap |  | TODO |
| MA-105 | Account-based seat reclaim so a signed-in player can resume a live game from another device | Switching from phone to laptop mid-game turns the player into a spectator of their own game. | `worker.ts`, `src/lib/multiplayer.ts` | M | gap |  | TODO |
| MA-106 | Commit the DO load test as scripts/load-test-do.ts and record its numbers in a new LEARNINGS.md | Every live game shares one global DO, and its capacity is not recorded anywhere in the repo. | `scripts/load-test-do.ts`, `LEARNINGS.md`, `worker.ts` | S | measure |  | TODO |
| MA-107 | Report maintenanceAll duration on /healthz and cut the per-alarm full read of every live match | Alarm cost grows linearly with live games on the single DO thread, and nobody can see it. | `worker.ts` | M | measure |  | TODO |
| MA-108 | Fix protocol and matchmaking doc drift (first-move grace 10s, rated custom/Draft games, per-mode buckets, standalone server has a queue) and document every server frame and error code (merged: Fix docs/game-server-protocol.md first-move grace (says 15s, code is 10s)) | These docs are the protocol contract, and several statements in them are wrong. | `docs/game-server-protocol.md`, `docs/accounts-and-matchmaking.md`, `worker.ts` | S | docs |  | TODO |

### Accounts, ratings, data

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-109 | Archive the rating before/after this call actually applied: skip or null the ratings when the ledger claim is lost, and update whiteBefore/blackBefore (and the reported 'before') on a CAS retry | Wrong archived rating_before/after corrupt the profile graph, the Highest-rating stat and the end-frame delta. | `src/lib/server/games.ts` | S | bug, repro |  | TODO |
| MA-110 | Make the profile 'N Games' label and the Games/Record tiles count casual games too, or label them 'Rated games' | A player with only casual games sees '0 Games' above a list of their games. | `src/lib/server/games.ts`, `src/app/u/[username]/page.tsx` | XS | bug, repro |  | TODO |
| MA-111 | Fix profanity-filter false positives (Scunthorpe problem) in usernames, in-game chat, DMs and club posts, and add false-positive cases to test:text-input | Real surnames and ordinary words are refused at sign-up, censored in chat and filed as chat_flags for moderators. | `src/lib/profanity.ts`, `worker.ts`, `scripts/polish/text-input-test.ts` | S | bug, repro |  | TODO |
| MA-112 | Widen reserved-name rules (prefix/contains for admin, mod, staff, nerfchess, system, support, guest, null, anonymous) and block confusable lookalikes of power and existing names | Anyone can register staff-looking names or a visual clone of the owner's account. | `src/lib/server/auth.ts`, `src/app/api/auth/_lib/reserved.ts`, `src/app/api/auth/register/route.ts` +2 | S | gap, repro |  | TODO |
| MA-113 | Inflate RD for inactivity (store last_game_at per bucket and pass elapsedPeriods) so returning players become provisional again | A player who left a year ago comes back 'settled' at RD 45-60, so their rating barely moves. | `src/lib/glicko.ts`, `src/lib/server/games.ts`, `src/lib/server/schema.ts` +1 | S | gap, repro |  | TODO |
| MA-114 | Keep provisional (RD>110) players off the ranked leaderboard or list them separately, and correct the MAX_RATING_DELTA comment | One lucky win, or a few farmed ones, puts a brand-new account (guests included) high on the leaderboard. | `src/app/api/leaderboard/route.ts`, `src/app/leaderboard/page.tsx`, `src/lib/glicko.ts` | XS | gap, repro |  | TODO |
| MA-115 | Make migrations/ build a working DB from empty or declare it historical, quarantine its data migrations (0014 seed, 0022 resettle, 0027/0029/0030/0031 owner grants), and add a guard that diffs it against schema.ts | The migration path that wrangler.jsonc and the docs still advertise fails on an empty DB, and on a real one it would reseed 150 fake players and reset every RD. | `migrations/0014_seed_leaderboard.sql`, `migrations/0022_glicko2_resettle.sql`, `src/lib/server/schema.ts` +3 | S | gap, repro |  | TODO |
| MA-116 | Back /history and /history/[id] with the account archive for signed-in players (filters + cursor pagination), keep localStorage for bot and anonymous games, and use or delete the dead /api/history | The nav's 'Game history' shows only this device's games, so a signed-in player on another device sees an empty or partial list. | `src/app/history/page.tsx`, `src/app/history/[id]/page.tsx`, `src/lib/gameHistory.ts` +2 | S | gap |  | TODO |
| MA-117 | Show favourite cards and win rate by card on the profile, reusing ogData.ts topCardsFrom for favourites (or drop 'favourite cards' from the profile meta description) | The checklist expects card-level identity on the profile, and the page's own meta description promises favourite cards it does not show. | `src/lib/playerStats.ts`, `src/lib/server/ogData.ts`, `src/app/api/users/[username]/stats/route.ts` +2 | M | gap |  | TODO |
| MA-118 | Add self-serve account deletion that removes the D1 rows and anonymizes the account's names in the Postgres archive | The privacy policy promises deletion, and no code path, not even an admin one, can carry it out. | `src/app/api/auth`, `src/lib/server/auth.ts`, `src/lib/server/pg.ts` +2 | M | gap |  | TODO |
| MA-119 | Add a signed-in data export (account JSON + all games as PGN) endpoint and a settings button | Nobody can export their own data or game collection, and the privacy policy names a right of access. | `src/app/api/users/settings/route.ts`, `src/lib/pgn.ts`, `src/lib/server/pg.ts` +1 | S | gap | E15 | TODO |

### UI and visual design

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-120 | Compute the captured-piece row and +N from the engine's capture pools and on-board material instead of inferring missing pieces from the standard start set | Any promotion, even in plain chess, and any card that summons or transforms a piece shows phantom captures and the wrong material lead. | `src/lib/material.ts`, `src/components/BoardPlayerRow.tsx`, `src/components/PlayerNerfCard.tsx` +4 | S | bug, repro |  | TODO |
| MA-121 | Show check on every board: pass the already-computed review checkSquares during history review, and derive check squares for the spectator/replay GameShell, /history/[id] and /analysis | Stepping back to a checking move, spectating a live game, or replaying shows no check glow, because Board renders check only from a prop that these paths drop or never pass. | `src/app/game/page.tsx`, `src/components/OnlineMatch.tsx`, `src/app/game/[id]/page.tsx` +3 | S | bug | B3 | TODO |
| MA-122 | Keep the in-game flip per game: stop the flip button and `f` writing the persisted, account-synced flipBoard setting | One flip or one stray `f` starts every later game, on every signed-in device, with your own pieces at the top. | `src/lib/boardKeymap.ts`, `src/components/board/BoardTools.tsx`, `src/lib/settings.ts` +2 | S | bug | C11 | TODO |
| MA-123 | Add a local-orientation flip (button and `f`) to the spectator/replay GameShell and /history/[id], and orient replays to the viewer's own colour | Spectators and replay viewers are locked to White's side, even when replaying their own game as Black. | `src/app/game/[id]/page.tsx`, `src/app/history/[id]/page.tsx`, `src/components/board/BoardTools.tsx` | S | gap | C11 | TODO |
| MA-124 | Add a live mini-board preview (board theme, piece set and piece colour together) to the Board and pieces section of /settings | Themes are picked from a 28px swatch and sets from 16px knights, and the combination is only visible over a live game. | `src/components/settings/rows.tsx`, `src/app/settings/_components/SettingsScreen.tsx` | S | gap | C29 | TODO |
| MA-125 | Add scripts/test-premoves.ts for premoveOptionsFor (dedupe, nerf filter, buff union, speculative pawn captures), premoveSelfChecks and virtual-board chaining, and wire it into `npm run guard` | The premove generator runs every opponent turn and has no test. e2e runs with premoves turned off. | `src/lib/premoves.ts`, `scripts/test-premoves.ts`, `scripts/polish/guard.mjs` +1 | S | test, repro | B1 | TODO |
| MA-126 | Add a touch e2e that asserts the drag ghost centre equals the pointer, plus one iOS pinch-zoom device check | Ghost centring is correct only because no ancestor creates a containing block, and nothing would catch a future transform or filter wrapper that breaks it. | `src/components/Board.tsx`, `src/app/globals.css`, `e2e/feel.spec.ts` +1 | S | test | B2 | TODO |
| MA-127 | Give coordinate labels per-theme colours that clear 4.5:1 on all 12 board themes, and add the contrast check to `npm run guard` | The hard-coded label colours fall under 3:1 on dark squares in 7 of the 12 themes. | `src/components/Board.tsx`, `src/lib/settings.ts`, `scripts/polish/guard.mjs` | XS | polish, repro |  | TODO |
| MA-128 | Scale CountdownChip with the square (about 28%, numeral at least 12px) and lighten its opaque ink backing | A fixed 15px opaque chip with a 10px numeral sits over the piece's base and is under the 12px text floor. | `src/components/Board.tsx`, `src/app/globals.css` | S | polish, repro | C14 | TODO |
| MA-129 | Enlarge or drop the motif-badge category chip (15% of a square) and give the bound sigil and motif badges a px floor on small squares | The per-card glyph that tells two cards apart is 6-7px at phone widths. | `src/components/effects/BoardEffects.tsx`, `src/components/Board.tsx` | S | polish, repro | C14 | TODO |
| MA-130 | Remove the 1024px landscape board cliff: collapse the left rail by default between 1024 and 1279, or reserve less, so the board stays at 480px or more | An iPad in landscape (1024x768) gets a 324px board, while 1023px gets 600px. | `src/components/OnlineMatch.tsx`, `src/app/game/page.tsx`, `src/components/RailResizeHandle.tsx` | S | bug | C13 | TODO |
| MA-131 | Add safe-area padding: left and right insets on the page shell and header, and bottom insets on the Show result, rematch-offer and draft-peek floating controls | viewport-fit=cover lets content paint under the landscape notch and under the home indicator. | `src/app/globals.css`, `src/components/SiteHeader.tsx`, `src/components/OnlineMatch.tsx` +3 | S | bug |  | TODO |
| MA-132 | Add a visible one-line tagline under the homepage H1 and show it above HeroTv on phones | A first-time phone visitor's first screen shows a board and a 15px 'Nerf Chess'. | `src/app/page.tsx`, `src/components/HeroTv.tsx` | S | gap |  | TODO |
| MA-133 | Add a 'key moment' to GameOver (biggest swing or decisive card play, with a jump-to-ply link), reusing the clip studio's highlight picker | The checklist's post-game asks for a key moment, and the logic to find one already exists in the clip studio. | `src/components/GameOver.tsx`, `src/components/clip/ClipModal.tsx`, `src/components/clip/clipScene.ts` | M | gap | D3 | TODO |
| MA-134 | Offer post-game Analyze for card games through a card-aware replay instead of hiding the link (merged: Build card-aware analysis: open an archived draft game on /analysis with card state per ply, and the eval captioned or disabled) | There is no analysis entry after any Buff game or any game with a card event. | `src/components/GameOver.tsx`, `src/app/analysis/page.tsx`, `src/engine/replay.ts` +1 | M | gap | E22 | TODO |
| MA-135 | Link How to play (/tutorial, /guide/how-to-play) from the desktop header Rules menu, the shared footer and the homepage | At 768px and wider, the tutorial is not in the global chrome. | `src/components/SiteHeader.tsx`, `src/components/SiteFooter.tsx`, `src/app/page.tsx` | XS | gap |  | TODO |
| MA-136 | Extend the sweep and polish matrix to 320, 414, 1280 and 2560, add landscape cells (667x375, 844x390, 1024x768) and a seeded /game/[id], and run it on a schedule | Four of the ten checklist widths and every landscape shape are never swept, and nothing runs the sweep automatically. | `e2e/sweep.spec.ts`, `scripts/polish/lib/states.ts`, `.github/workflows/guards.yml` | M | test | C1 | TODO |
| MA-137 | Measure fold positions of the phone match column (actions, move strip, first card, chat, bottom clock) at 360x640, 390x664 and 414x736 in Buff and Nerf games, and record them in the LEDGER | The scroll-by-design phone column was never measured against real visible heights with browser chrome. | `src/components/MobileMatchStack.tsx`, `scripts/polish/lib/states.ts`, `docs/polish-pass/LEDGER.md` | S | measure | C6 | TODO |
| MA-138 | Make one homepage entry a primary-tone 'Play now' to quick pairing and keep the other two default | design-system.md:38 asks for one accent primary per region, and the homepage hero has none. | `src/app/page.tsx` | XS | polish |  | TODO |
| MA-139 | Codemod text-[12px] and text-[13px] onto the pinned text-xs and text-sm tokens (checking line-height), and give the --step scale real consumers | The type scale is defined but bypassed by about 950 literal font sizes. | `tailwind.config.ts`, `src/app/globals.css` | M | gap, repro |  | TODO |
| MA-140 | Add a per-file ratchet guard on arbitrary Tailwind values (including text-[Npx], px sizes, max-w-[..] and literal ms durations) to npm run guard, and tokenise container widths and durations in the worst files first | There are 2,666 arbitrary values in chrome and nothing stops the count growing. | `scripts/polish/guard.mjs`, `tailwind.config.ts`, `src/app/u/[username]/page.tsx` +3 | M | gap, repro | C32 | TODO |
| MA-141 | Add a static guard to npm run guard that fails on fixed-dark colour utilities in chrome that have no html[data-light] override and are not on an allowlist | Transient overlays never reach the route sweep, which is how the 1.08:1 notices shipped. | `scripts/polish/guard.mjs`, `src/app/globals.css` | S | test, repro |  | TODO |
| MA-142 | Remove shadow-plate, shadow-xl and shadow-2xl from chrome, drop the glow and plate boxShadow tokens, and add a check-shadows guard | The contract says no shadows and no glow, but the tokens and 28 call sites ship them. | `tailwind.config.ts`, `src/components/OnlineMatch.tsx`, `src/components/OppPlaysLog.tsx` +2 | S | polish, repro | P10 | TODO |
| MA-143 | Codemod the deprecated Button tones (ghost, leaf, quiet, glass, cta, gold) to primary/default/danger, move EmptyState and the homepage span.btn-ghost onto LinkButton, and make check-buttons count raw btn-* on non-button elements | The hierarchy exists in the primitive but not in practice. | `src/components/ui/Button.tsx`, `scripts/check-buttons.ts`, `src/components/EmptyState.tsx` +1 | M | polish, repro | C25 | TODO |
| MA-144 | Replace hand-drawn generic SVG icons with lucide at one stroke width, and use one label and one icon per action across home, lobby and header | Icon sources and stroke weights are mixed, and the same action has three names. | `src/components/GameOver.tsx`, `src/components/OnlineMatch.tsx`, `src/app/play/page.tsx` +4 | S | polish |  | TODO |
| MA-145 | Reconcile DESIGN.md, design-system.md, themes.md, the ralph-backlog working rules and check-rounded.ts with the shipped tokens, and add a docs-vs-globals.css drift check | The design contract states values the code does not ship. | `docs/DESIGN.md`, `docs/design-system.md`, `docs/themes.md` +3 | S | docs, repro |  | TODO |
| MA-146 | Schedule a frontend-design visual-identity critique every 30 rounds in the ralph-backlog working rules and record each one under docs/ | The checklist requires it, and none is scheduled or recorded. | `docs/ralph-backlog.md` | XS | docs |  | TODO |
| MA-147 | Add Retry to the profile ActivityFeed failure, and surface a load error in GuestProfile instead of swallowing its three fetches | A failed load reads as a dead end, or wrongly as 'Unrated'. | `src/components/profile/ActivityFeed.tsx`, `src/app/profile/page.tsx` | XS | bug | C26 | TODO |
| MA-148 | Give the dead-end empty states one next action: Play a game, Find players, Play a rated game, Create the first event | design-system.md section 8 wants a sentence plus an action, and these are dead ends. | `src/components/profile/ActivityFeed.tsx`, `src/components/profile/FriendsModule.tsx`, `src/components/PlayerStatsPanel.tsx` +3 | S | gap | C5 | TODO |
| MA-149 | Expose staleness from lobbyClient after N failed polls even when a snapshot is cached, show it on the home page, HeroTv, TV and Community, and add one site-wide offline banner | After a drop, the live counts and the TV list freeze silently. | `src/lib/lobbyClient.ts`, `src/app/page.tsx`, `src/components/HeroTv.tsx` +2 | S | gap | C37 | TODO |
| MA-150 | Build one Toast/Notice primitive with named lanes and a duration table, move the bespoke notices onto it, and show achievement toasts on phones | Feedback appears in about six places with mixed lifetimes, two notices share a lane, and phones miss achievements. | `src/components/AchievementToast.tsx`, `src/components/OnlineMatch.tsx`, `src/components/SettingsBootstrap.tsx` +2 | M | gap |  | TODO |

### Animation, sound, feel

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-151 | Rebalance the lichess-theme mix (castle, urgent tick, card play, buff and nerf cues against the sampled move) and add an offline loudness guard | In the default theme castling is 7dB quieter than a move, and the 5s warning is 9dB quieter than the 10s warning. | `src/lib/sounds.ts`, `scripts/polish/guard.mjs`, `package.json` | S | bug, repro | B5 | TODO |
| MA-152 | Size the online draft window to the client's worst-case presentation (or start the server deadline on a cards-ready report) | Board spectacles plus the vault and deal can use up to 5.6s of the 20s free decision window before the countdown appears. | `worker.ts`, `src/lib/useDraftSequence.ts`, `src/components/effects/useSignatureQueue.ts` +1 | M | bug |  | TODO |
| MA-153 | Commit a confirmed draft pick immediately and play the pocket flight as decoration | Every pick reaches the server 429ms late at every tempo, against design-system.md:81. | `src/components/DraftOverlay.tsx` | XS | bug | D2 | TODO |
| MA-154 | Keep the clock separator blink alive under data-anim=fast and through the low-time hold, and add a short critical-band pulse | The only 'your clock is running' signal is switched off in the last 20 seconds and in Fast mode. | `src/app/globals.css`, `src/lib/lowTimeMotion.ts`, `src/lib/settings.ts` +1 | XS | bug | B6 | TODO |
| MA-155 | Wire the card-effect sound pref to a Settings toggle and stop gating playNerf on the Game end toggle | Players cannot mute card blasts on their own, and turning off game-end chimes silently mutes nerf triggers. | `src/lib/sounds.ts`, `src/components/SettingsBootstrap.tsx`, `src/components/HeaderSettingsMenu.tsx` +3 | S | gap |  | TODO |
| MA-156 | Play move, capture, castle and check sounds for spectators and TV | Watching a game is silent for chess moves while card blasts and the end chime still play. | `src/app/game/[id]/page.tsx`, `src/app/tv/TvView.tsx`, `src/lib/sounds.ts` | S | gap |  | TODO |
| MA-157 | Decide the OS prefers-reduced-motion default, and at least honor it by default for non-gameplay motion (chrome, shake, victory burst, 3D) | Players whose OS asks for reduced motion get full motion by default, against the repo's own working rule. | `src/lib/settings.ts`, `src/components/SettingsBootstrap.tsx`, `src/lib/haptics.ts` +1 | M | gap |  | TODO |
| MA-158 | Move computeAnims/computeBoardFx into a pure module and pin every core move type (quiet, capture, ep, castle, promotion by click, drag and premove, drop, conversion) in a guard script | An untested diff heuristic decides which moves slide, morph or detonate, and it already misfires on drag promotions. | `src/components/Board.tsx`, `package.json`, `scripts/polish/guard.mjs` | S | test, repro |  | TODO |
| MA-159 | Wire test-clock-warn, test-settle and test:animations into package.json and CHEAP_GUARDS | Passing feel tests never run in CI. | `package.json`, `scripts/polish/guard.mjs`, `scripts/polish/j/test-clock-warn.ts` +1 | XS | test, repro |  | TODO |
| MA-160 | Record frame timings at 4x CPU on a 390x844 viewport for the board glide, capture, castle, signature plays, nerf reveal, draft deal and game-over, and set a dropped-frame budget | The 60fps-at-4x requirement has never been measured; existing frame data is desktop-only and unthrottled. | `scripts/polish/strip.ts`, `scripts/polish/card-strip.ts`, `scripts/polish/lib/states.ts` +1 | M | measure |  | TODO |
| MA-161 | Give ordinary captures an impact: keep a fading ghost of the victim under the arriving slide plus a small landing beat, gated by data-anim | The most common violent event on the board has no visual feedback. | `src/components/Board.tsx`, `src/app/globals.css` | S | polish, repro | B3 | TODO |
| MA-162 | Stop hover sticking after a tap on touch: enable Tailwind future.hoverOnlyWhenSupported and wrap the .btn-* :hover rules in @media (hover: hover) | On phones a tapped control keeps its hover fill. | `tailwind.config.ts`, `src/app/globals.css` | S | polish |  | TODO |

### Performance

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-163 | Bound the clip renderer's module caches (sceneSetCache full-size canvases, fieldCache specks) with a small LRU and clear them when ClipModal closes | Each new clip window or Surprise-me seed in the stadium or study set keeps another full-size canvas (about 8MB at 1080x1920) alive for the rest of the session. | `src/components/clip/clipStyles.ts`, `src/components/clip/clipScene.ts`, `src/components/clip/ClipModal.tsx` | XS | bug |  | TODO |
| MA-164 | Design per-game or lazy loading of card definitions so /game, /game/[id], /analysis and /puzzles stop shipping the whole 1.3MB buff library in the first chunk | engine/buffs is 1319KB min of the 2880KB initial game chunk, and its parse and eval cost lands in TBT on phones. | `src/engine/buffs/library.ts`, `src/engine/game.ts`, `src/components/Board.tsx` +2 | L | gap, repro |  | TODO |
| MA-165 | Report real-user web vitals (useReportWebVitals to a small sampled endpoint, reusing the readJsonObject maxBytes plus memoryRateLimit pattern) so field LCP, INP and CLS on phones are known | Lab runs on next dev do not show what real mobile players get. | `src/app/layout.tsx`, `src/app/api/tv-telemetry/route.ts`, `src/lib/server/request.ts` | S | gap |  | TODO |
| MA-166 | Add a cheap bundle-budget guard (esbuild per-route approximation, no next build) with per-route budgets and a 'no engine on /, /play, /lobby' assertion to npm run guard, and start LEARNINGS.md with the per-route numbers | Bundle size is never tracked, so regressions like /play pulling in the engine land silently. | `scripts/polish/guard.mjs`, `package.json`, `.github/workflows/guards.yml` | S | test, repro |  | TODO |
| MA-167 | Build a long-session soak harness that plays bot games for 2 hours on /game (and /game/[id] on a preview) and samples CDP Performance.getMetrics (JSHeapUsedSize, Nodes, JSEventListeners) every minute, recording results in LEARNINGS.md | Teardown hygiene looks good statically, but memory over a real session has never been measured. | `e2e/feel.spec.ts`, `scripts/polish/lib/states.ts` | M | test |  | TODO |
| MA-168 | Run Lighthouse mobile on a production preview for /, /game (bot) and /game/[id], and record the scores, LCP, TBT, CLS and the next build route table in LEARNINGS.md | The checklist's headline number has never been taken. Production builds were made but used only for geometry checks. | `docs/polish-pass/LEDGER.md`, `docs/ralph-backlog.md` | S | measure | P9 | TODO |
| MA-169 | Add LCP and INP (event-timing PerformanceObserver) to the polish probe next to CLS, and run them at 4x CPU against a production preview | Only CLS is measured, so the LCP < 2s and INP < 200ms targets are unknown. | `scripts/polish/lib/probe.ts`, `scripts/polish/lib/inpage.ts`, `scripts/polish/cls.ts` | S | measure | B11 | TODO |
| MA-170 | Point the existing React commit-hook harness (e2e/polish/social-routes.spec.ts:573-581) at the bot game and the online match, record commits and durations per ply (F112's owed numbers), then decide on React.memo for Board | Re-render work on the game routes was done without counts, and the checklist asks for a profile. | `src/components/Board.tsx`, `src/components/OnlineMatch.tsx`, `src/app/game/page.tsx` +2 | S | measure |  | TODO |
| MA-171 | Run a Slow 3G (400kbps, 2000ms RTT) pass on a preview build for /, /play, /game bot and /game/[id], including socket connect and reconnect, and record time-to-playable | Only Fast 3G on next dev has been tried, and the online game has never been throttled. | `scripts/polish/lib/states.ts`, `src/lib/multiplayer.ts` | S | measure |  | TODO |
| MA-172 | Move ACTIVE_AI_GAME_KEY and clearSavedAiGame into an engine-free module (e.g. src/lib/aiGameKey.ts), re-export from gamePersistence, and import it from /play | /play ships about 1.5MB min (393KB gz) of rules engine and card libraries just to call localStorage.removeItem. | `src/app/play/page.tsx`, `src/lib/gamePersistence.ts` | XS | polish, repro |  | TODO |
| MA-173 | Lazy-load the passive composition table: make derive.ts's getPassiveVisual check not import compositions.ts statically, so the 286KB table rides with the dynamic PassiveLayer | PassiveLayer was made dynamic so this table would load off the first paint (Board.tsx:157-158), but derive.ts brings it back into the initial chunk statically. | `src/components/Board.tsx`, `src/components/effects/passive/derive.ts`, `src/components/effects/passive/registry.ts` +1 | S | polish, repro |  | TODO |
| MA-174 | Defer CardOfTheDay's card-library import until the box nears the viewport (IntersectionObserver), or serve the day's card from a small generated JSON | Every homepage visit downloads and evaluates about 1.5MB min (about 430KB gz) of engine right after hydration for a widget below the fold, which inflates homepage TBT and mobile data use. | `src/app/page.tsx` | S | polish, repro |  | TODO |
| MA-175 | Gate the three.js board layer and the sigVisuals and plays prefetch on navigator.connection.effectiveType (2g/3g) as well as saveData | By default every capable phone downloads three.js and sigVisuals (about 226KB gz combined) right after a game mounts, competing with the first moves on mobile data. | `src/lib/board3d.ts`, `src/components/Board.tsx`, `src/components/effects/BoardEffects.tsx` | S | polish | D5 | TODO |

### Accessibility

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-176 | Fix the history/page.tsx:103 opacity-70 count label, check whether --text-muted text ever sits on --bg-raised outside disabled states, and close the stale contrast rows C15, C30 and C46 | The backlog lists contrast work that is already done and hides the one straggler that is left. | `src/app/history/page.tsx`, `src/app/globals.css`, `tailwind.config.ts` +1 | S | bug, repro | C30 | TODO |
| MA-177 | Put OpponentDraftViewer and codex FilterSheet on useModalChrome attachDialog (focus in, Tab trap, focus restore), then close the stale C16 | Two aria-modal dialogs neither take focus nor trap Tab, so keyboard and screen-reader users land behind them. | `src/components/OpponentDraftViewer.tsx`, `src/app/codex/_components/FilterSheet.tsx`, `src/lib/useModalChrome.ts` +1 | XS | bug | C16 | TODO |
| MA-178 | Honour the browser text-size preference (root font-size 87.5% instead of 14px, with C32's spacing decision) and measure 200% zoom and 200% text size on core routes and /game | A px root ignores the user's browser font-size setting, and 200% has never been measured. | `src/app/globals.css`, `tailwind.config.ts`, `e2e/sweep.spec.ts` +1 | M | gap | C32 | TODO |
| MA-179 | Add a static contrast guard to npm run guard: every text token against every surface token in dark, midnight and light at 4.5:1 (3:1 for large text and UI) | Contrast is checked only by a browser-dependent, report-only axe run, so token regressions can land unnoticed. | `scripts/check-contrast-tokens.ts`, `scripts/polish/guard.mjs`, `src/app/globals.css` +1 | S | test | C15 | TODO |
| MA-180 | Run polish:axe on all routes in dark, midnight and light with seeded in-game states (draft open, dock, targeting, promotion, game over, each modal) and commit one complete evidence file | The existing axe evidence is partial, covers page load only, and has many connection-refused cells. | `scripts/polish/axe.ts`, `scripts/polish/lib/states.ts`, `docs/polish-pass/evidence/axe/` | M | measure | C1 | TODO |
| MA-181 | Draw the warded and barred glyph chips on the board (shape, not just rope colour), and separate the blind and doomed status colours under protan and deutan | 'Enemy can't enter' and 'you can't enter' differ only in hue on the board. | `src/components/Board.tsx`, `src/components/board/StatusGlyph.tsx`, `src/components/effects/BoardEffects.tsx` +1 | S | polish, repro |  | TODO |
| MA-182 | Lift raw in-game buttons to the 44px coarse-pointer floor (promotion Cancel, the +15s/-15s clock buttons, MoveList and DockRow rows, DockAgainstYou chips, the Board3DLayer dismiss) and extend the touch sweep to seeded in-game states | The sweep's 0-defect result covers only page-load states, and several in-game controls on phones are about 26px tall. | `src/components/Board.tsx`, `src/components/OnlineMatch.tsx`, `src/components/MoveList.tsx` +4 | S | polish | C38 | TODO |

### Code quality and tests

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-183 | Lock in zero-any and widen lint: enable @typescript-eslint/no-explicit-any (error in src, worker and server, warn in scripts), fix or justify the scripts' `any`, and lint arena-service/ and engine-service/ | Production has 0 `any` today, but nothing stops a regression, and two services are not linted at all. | `eslint.config.mjs`, `scripts/polish/test-seat-superseded.ts`, `scripts/bench-search-buffs.ts` | S | gap, repro |  | TODO |
| MA-184 | Add `npm run check` (typecheck, lint, guard, guard:engine, and Playwright behind --e2e) and document it in README Checks | The checklist asks for one command that runs everything; today it takes four or more, and none of them runs the engine tests. | `package.json`, `README.md`, `scripts/polish/guard.mjs` | XS | gap |  | TODO |
| MA-185 | Add visual regression: toHaveScreenshot baselines for home, lobby, /play board, draft overlay, game-over panel and a codex card at 390 and 1440, with animations off and a fixed seed | With a 5k-line Board.tsx and 19.6k-line sigVisuals.tsx, nothing catches a visual regression automatically. | `e2e`, `playwright.config.ts` | M | gap | C1 | TODO |
| MA-186 | Add a dev-only client error logging hook: a client component in the root layout that listens for window 'error' and 'unhandledrejection' and logs a structured line in development; leave any prod sink to P12/F093 | Uncaught client errors outside a route boundary leave no structured trace. | `src/app/layout.tsx`, `src/components/ui/RouteError.tsx` | XS | gap | P12 | TODO |
| MA-187 | Wrap the board effects layers (sigVisuals, godPlays, greatPlays, basicPlays, passive runtime) in a component ErrorBoundary that drops the failing effect and logs it instead of unmounting the match | A cosmetic VFX bug in one of 2480 cards takes down the whole game page mid-match. | `src/components/Board.tsx`, `src/components/effects/sigVisuals.tsx`, `src/app/game/error.tsx` | S | gap |  | TODO |
| MA-188 | Add Playwright specs for UI signup (create account through the form, land signed in) and settings persistence (change board theme or sound on /settings, reload, assert kept, signed out and signed in) | Signup and settings persistence are on the checklist's e2e list and have no spec. | `e2e/polish/account-routes.spec.ts`, `src/app/settings` | S | test |  | TODO |
| MA-189 | Add test:coverage: run test:lab, test:parity and the all-nerf smoke under c8 or NODE_V8_COVERAGE, record per-file function and branch % for src/engine in docs, and ratchet it | Engine coverage has never been recorded, so the untested rule paths are unknown. | `package.json`, `scripts/lab-run-all.ts`, `scripts/polish/parity-fuzz.ts` | S | measure |  | TODO |
| MA-190 | Delete CurrentGameCard.tsx and components/ratings/StatGrid.tsx, retarget or remove the vacuous e2e/profile-current-game.spec.ts, prune the ~50 never-referenced exports, and add a knip check | Dead code adds bulk and misleads readers, and one e2e spec now guards a component nothing mounts. | `src/components/profile/CurrentGameCard.tsx`, `src/components/ratings/StatGrid.tsx`, `e2e/profile-current-game.spec.ts` +4 | S | polish |  | TODO |
| MA-191 | Extract one pure clock-billing helper (elapsed, first-move grace, draft-window exclusion, increment, flag check) with a unit test, and use it from worker.ts, arena-service/game.ts and server/index.ts | Clock arithmetic is hand-copied in three servers with different rules; arena already bills draft think time that the DO excludes. | `worker.ts`, `arena-service/game.ts`, `server/index.ts` +1 | M | polish |  | TODO |
| MA-192 | Write the folder-structure map (src/engine, src/lib/server, src/components/effects, worker.ts, server/, arena-service/, engine-service/, scripts/ test conventions, e2e/, docs/) in LEARNINGS.md and link it from README | Contributors and loop agents have no map of a repo this large. | `README.md`, `LEARNINGS.md` | XS | docs |  | TODO |

### New player experience

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-193 | Add an interactive nerf/hex/boon lesson to /tutorial (feel your own nerf's restriction, cast a hex, see it land) | Nerf mode, the game's namesake, has no interactive teaching. | `src/app/tutorial/walkthrough/page.tsx`, `src/app/tutorial/page.tsx`, `src/components/tutorial/tourState.ts` | M | gap |  | TODO |
| MA-194 | Add first-appearance coach marks per mechanic (draft offer, bank, hex landing, boon, trap, frozen, barred, doom), dismissible, remembered per mechanic, and gated by uiInterrupts | Players meet dozens of mechanics with no just-in-time explanation outside the one tour. | `src/lib/uiInterrupts.ts`, `src/components/Board.tsx`, `src/components/DraftOverlay.tsx` +1 | M | gap |  | TODO |
| MA-195 | Embed short animated examples (capture the king, a draft, a hex landing) in /guide/how-to-play, reusing the walkthrough board or the card rule scenes | The rules page is text only. | `src/app/guide/how-to-play/page.tsx`, `src/app/tutorial/walkthrough/page.tsx` | M | gap |  | TODO |
| MA-196 | Add a beginner card pool (low tier, no hidden-information-heavy cards) for the tour and a new player's first N bot and online games | New players draft from the full pool of 1665 cards from game one. | `src/engine/draft.ts`, `src/app/game/page.tsx`, `worker.ts` +1 | M | gap |  | TODO |
| MA-197 | Explain refused pickups: name the player's own visible blocking effect (own nerf, visible hex status) and use generic wording for anything unrevealed; add a test that hidden cards are never named | 'Has no legal move' with no reason confuses new players, and a naive fix could leak hidden cards. | `src/components/Board.tsx`, `src/engine/game.ts`, `src/engine/nerf.ts` | M | gap |  | TODO |
| MA-198 | Add an e2e spec that completes the first-game tour end to end (every FirstGameTour step reached through TOUR_STATE_EVENT) | The main onboarding path has no regression test. | `e2e/tutorial-tour.spec.ts`, `src/components/tutorial/FirstGameTour.tsx` | S | test | C43 | TODO |
| MA-199 | Measure time from first visit at / to first move against the AI (cold load, mid phone and desktop) and record it; consider newcomer defaults on /play (easy, white, no clock) or point the home page at the guided game (merged: Measure home-to-first-move end to end on a production build (phone and desktop) and cut the opening-pick and scroll friction if it exceeds 10s) | The 10-second target has never been measured, and the defaults make half of new players wait for the bot. | `src/app/play/page.tsx`, `src/app/page.tsx`, `src/app/game/page.tsx` +3 | S | measure | B8 | TODO |

### Features

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-200 | Award ladder achievements on the post-game rating: pass the after-ratings into AchievementExtras and compare them in ratedAt and ratedAtIn | 'Climb to 2000' unlocks one game late, on the next rated game rather than the win that crossed the mark, and never if that win was the player's last game. | `src/lib/achievements.ts`, `src/lib/server/achievements.ts`, `src/lib/server/games.ts` | XS | bug, repro |  | TODO |
| MA-201 | Make tournament formats honest: drop arena and single-elim from TOURNAMENT_FORMATS and default to swiss, or implement their pairing | An organiser who picks 'Single elimination' or the default 'Arena' silently gets Swiss rounds and a score-table winner. | `src/lib/tournaments.ts`, `src/lib/server/tournamentEngine.ts`, `src/app/tournaments/page.tsx` +1 | S | bug |  | TODO |
| MA-202 | Grow the puzzle corpus before 2026-11-11, pin past days so regeneration does not reshuffle them, and add a guard that fails when fewer than 21 days of unique dailies remain | The daily starts repeating in 40 days, and regenerating the corpus changes which puzzle every past date, including the archive link, shows. | `public/puzzle-data/puzzles.json`, `src/lib/puzzles/daily.ts`, `scripts/gen-puzzles.ts` | S | gap, repro | E2 | TODO |
| MA-203 | Drive tournament rounds from a DO alarm or the cron instead of the detail-page GET, so rounds advance when nobody has the event page open | The next round pairs only when someone polls the event page, so players who sit on their game page stall the event. | `src/lib/server/tournamentEngine.ts`, `src/app/api/tournaments/[id]/route.ts`, `worker.ts` +1 | M | gap |  | TODO |
| MA-204 | Add scripts/test-tournament-engine.ts that drives advanceTournament against an in-memory D1 shim: round CAS, result collection, void at deadline, completion, mid-event withdraw | Only the pure pairing function is tested. The read-driven engine that creates games and scores rounds has no test. | `src/lib/server/tournamentEngine.ts`, `src/app/api/tournaments/[id]/entry/route.ts`, `package.json` +1 | S | test |  | TODO |
| MA-205 | Add test:achievements: table-driven checks of evaluateAchievements, including every ladder threshold, the all_modes and double_champion unlocked-set paths, and the 'king captured' reason match | 102 award predicates, some keyed on free-text engine reason strings, have no test. | `src/lib/achievements.ts`, `package.json`, `scripts/polish/guard.mjs` | XS | test |  | TODO |

### Copy, SEO, sharing

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-206 | Add src/app/manifest.ts (name, short_name, icons 192/512, theme and background colours, display standalone, start_url /) and close LEDGER F242 | There is no web app manifest, so install-to-home-screen metadata is missing. | `src/app/manifest.ts`, `src/app/layout.tsx`, `docs/polish-pass/LEDGER.md` | XS | gap |  | TODO |
| MA-207 | Add a visible 'What is Nerf Chess' explainer section (about 150 words, an h2, links to /guide pages) to the home page | Search visitors get one short paragraph and an sr-only h1 tail. | `src/app/page.tsx`, `src/lib/seoPages.ts` | S | gap |  | TODO |
| MA-208 | Add a next step to failure messages that lack one ('Could not load tournaments.', 'Could not post.', worker reconnect_failed and server_unconfigured) and check that no raw API code reaches UI text | Several failures say what broke but not what to do. | `src/app/tournaments/page.tsx`, `src/app/clubs/[slug]/page.tsx`, `worker.ts` +1 | S | polish, repro |  | TODO |

### Security

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-209 | Move guest, register and login IP limits onto the atomic rateLimit() with one clientIpKey helper that groups IPv6 by /64 | Rotating addresses inside one IPv6 allocation resets every per-IP auth limit, and the check-then-record pattern lets parallel requests overshoot the caps. | `src/lib/server/request.ts`, `src/app/api/auth/guest/route.ts`, `src/app/api/auth/register/route.ts` +1 | S | gap, repro |  | TODO |
| MA-210 | Replace the hard 50-failure per-username login lockout with a Turnstile challenge, and add Turnstile to guest minting | Anyone with 5 IPs can keep any known player, owners included, locked out 15 minutes at a time, and only register is bot-checked. | `src/app/api/auth/login/route.ts`, `src/app/api/auth/guest/route.ts`, `src/lib/server/turnstile.ts` +1 | S | gap, repro |  | TODO |
| MA-211 | Run npm audit (--omit=dev --audit-level=high) in CI, add .github/dependabot.yml for the root, arena-service and engine-service, and upgrade wrangler | The critical next advisory sat unnoticed because nothing in CI or automation reports vulnerable dependencies. | `.github/workflows/guards.yml`, `package.json`, `package-lock.json` | S | gap, repro |  | TODO |
| MA-212 | Add change-password (current password required) and sign-out-everywhere routes that revoke other sessions, and wire them into settings | A user whose password or cookie leaks has no remedy short of the 90-day expiry or a moderator ban. | `src/lib/server/auth.ts`, `src/components/settings/rows.tsx`, `src/app/api/auth/logout/route.ts` | M | gap |  | TODO |
| MA-213 | Commit lockfiles for arena-service and engine-service and switch the OCI updater to npm ci | The production box auto-deploys from master with unpinned installs, so a bad transitive release ships with no review. | `engine-service/deploy/update.sh`, `engine-service/package.json`, `arena-service/package.json` | S | gap |  | TODO |
| MA-214 | Tighten the CSP: name the exact ws/wss origins, add a report-to endpoint and COOP, and record the nonce-based script-src and HSTS-preload decisions in a new NEEDS_JOSEPH.md | With 'unsafe-inline' scripts, any-host sockets and no reporting, the CSP neither blocks an injected script nor reports a violation. | `next.config.mjs`, `public/_headers`, `docs/polish-pass/LEDGER.md` | M | gap |  | TODO |
| MA-215 | Verify email ownership before an address is used for sign-in, uniqueness or outbound mail, and stop register and login from revealing which emails have accounts | Anyone can squat someone else's email, blocking their registration and Google sign-in, and registered emails can be enumerated. | `src/app/api/auth/register/route.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/google/callback/route.ts` +1 | M | gap |  | TODO |
| MA-216 | Stop rated custom challenges from moving ratings when either seat is a guest or a brand-new account (merged: Flag or limit rated games against minutes-old guest accounts and same-IP accounts (rated friend challenges and their rematches)) | A player can farm rating by beating guest alts they mint themselves in rated friend games. | `worker.ts`, `src/lib/server/games.ts`, `src/app/api/challenges/route.ts` +2 | S | gap |  | TODO |
| MA-217 | Add a static guard: every mutating export in src/app/api/**/route.ts calls guardJsonWrite, assertSameOrigin or requireMod, or is on an explicit allowlist, and GET handlers do not write | CSRF coverage is complete today, but nothing stops the next route from shipping without the check. | `scripts/polish/guard.mjs`, `scripts/check-auth-safety.ts`, `src/lib/server/request.ts` | S | test, repro |  | TODO |
| MA-218 | Add a positive security-header guard (static, NODE_ENV=production import of next.config.mjs) to npm run guard, and record a production header capture | A CSP or HSTS regression would pass every guard today, and nobody has confirmed what the deployed worker sends. | `scripts/polish/headers-check.ts`, `scripts/polish/guard.mjs`, `next.config.mjs` | S | test |  | TODO |

### Loop upkeep

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-219 | Create docs/STATE.md: an iteration counter, the last 25-iteration review, the last full regression run, and a per-section 'last touched round' table as the neglect tracker | Section 15's checkpoints and neglect rule need a counter and per-area timestamps, and neither exists. | `docs/STATE.md`, `docs/ralph-backlog.md`, `docs/prompts/LAUNCH.md` +1 | S | gap |  | TODO |
| MA-220 | Create docs/baselines.md recording the comparison numbers (sweep, CLS, console, guard runtime, puzzle verify, OG and archive-replay counts) and take the first Lighthouse run on a preview build | A regression review needs recorded numbers. Lighthouse has never been run, and the sim baseline is stale. | `docs/baselines.md`, `e2e/sweep-baseline.json`, `scripts/polish/cls-thresholds.json` +1 | S | measure | A2 | TODO |
| MA-221 | Create LEARNINGS.md, capped at 400 lines by a guard, seeded from the ralph-backlog working rules and the lessons inside long DONE rows | Lessons live inside a 657-line backlog, so each round must read all of it. | `LEARNINGS.md`, `docs/ralph-backlog.md`, `scripts/polish/guard.mjs` | S | docs |  | TODO |
| MA-222 | Create DECISIONS.md from ralph-backlog's 'Deliberately NOT building' list, the LEDGER's INTEGRATOR DECISIONS, and owner calls recorded in code | Decisions are scattered across three files and code comments, which invites relitigation. | `DECISIONS.md`, `docs/ralph-backlog.md`, `docs/polish-pass/LEDGER.md` | XS | docs |  | TODO |
| MA-223 | Create NEEDS_JOSEPH.md from the open LEDGER owner questions (Q1..Q37, minus Q4, which is answered) and the owner-blocked ralph rows (A19, A20, P7, P11) | Owner-blocked work has no single queue, so blocked items get re-picked. | `NEEDS_JOSEPH.md`, `docs/polish-pass/LEDGER.md`, `docs/ralph-backlog.md` | XS | docs | P7 | TODO |
| MA-224 | Settle the one backlog: retarget MEGA_AUDIT.md:5 to docs/ralph-backlog.md, or create BACKLOG.md as the ranked merge target that points to it | The audit writes to a file that does not exist while the loop reads another. | `MEGA_AUDIT.md`, `docs/ralph-backlog.md` | XS | docs |  | TODO |
| MA-225 | Reconcile ralph rows still marked TODO for shipped work: E2 (puzzles), E4 (analysis eval and classification), E12/E13 (clock urgency and blink), E15 (PGN on history), E16 (keymap and ? sheet), E20 (eval worker, done as A18); refresh E22's stale text | Stale TODO rows send rounds to re-prove working code. | `docs/ralph-backlog.md` | XS | docs | E20 | TODO |
| MA-226 | Add a round-close step to the loop prompt: append any new failure category to MEGA_AUDIT.md, update STATE.md and close rows in the same commit | 'This file only grows' has no trigger in the loop prompt. | `docs/prompts/LAUNCH.md`, `MEGA_AUDIT.md`, `docs/ralph-backlog.md` | XS | docs |  | TODO |

## P3

### Rules engine

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-227 | Record movegen throughput and the perft tables in docs, and profile the Chess Diff legality filter (attackedBy allocates a Set per candidate, cloneBoard copies history) | Throughput has never been recorded, and the check-aware path runs about 10x slower than the site-rule path. | `src/engine/board.ts`, `src/engine/game.ts`, `docs/improvement-roadmap.md` | XS | measure, repro |  | TODO |
| MA-228 | Count the en passant square in the repetition key only when an en passant capture is legal | FIDE 9.2 treats such positions as equal, but the engine needs a 4th occurrence after a double pawn push. | `src/engine/board.ts` | XS | bug, repro |  | TODO |
| MA-229 | Do not award the human a win when the local AI move throws | Any client exception in the AI apply path ends a local game as a win for the player. | `src/app/game/page.tsx` | XS | bug |  | TODO |
| MA-230 | Share one engine helper for the flag result across worker, dev server and local AI games | The timeout result is written three times, so any material rule would have to land in three places. | `src/engine/game.ts`, `worker.ts`, `server/index.ts` +1 | XS | polish |  | TODO |
| MA-231 | Skip the re-broadcast in endMatch when the match was already ended and broadcast | A second endMatch call sends another 'end' frame, this time without the ratings payload, to players and watchers. | `worker.ts` | XS | polish |  | TODO |
| MA-232 | Number consecutive same-colour moves in PGN movetext the way sanLabels does | An extra-move card makes the PGN read '1. Nf3 1. Nc3 Nf6', which disagrees with the move list. | `src/lib/pgn.ts` | XS | bug, repro |  | TODO |
| MA-233 | Add a SAN parser and SAN/FEN round-trip tests | SAN is export-only, and the repo has no FEN round-trip test. | `src/engine/board.ts`, `src/lib/fen.ts`, `scripts/test-san.ts` | S | test |  | TODO |
| MA-234 | Validate FEN input on the analysis board: one king per side, legal pawn ranks, ep rank and castling rights | The analysis board accepts impossible positions. fenToBoard has no other caller. | `src/lib/fen.ts`, `src/app/analysis/page.tsx` | XS | polish, repro |  | TODO |

### Cards and interactions

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-235 | Pin existing card faces in a lock file and give the colliding nerf/buff ids distinct faces | Hash probing can move shipped faces when ids are added, and colliding ids wear one face. | `scripts/gen-card-icons.mjs`, `scripts/gen-card-glyphs.mjs`, `src/lib/cardIconNames.gen.ts` +1 | S | polish |  | TODO |

### Hidden information and draft

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-236 | Use crypto randomness for seeds and nerf deals in the standalone server/index.ts | Math.random seeds and deals on the self-hosted server are predictable, and the nerfSeed fork leak exists there too. | `server/index.ts`, `src/engine/rng.ts`, `src/engine/nerfs/library.ts` | XS | bug |  | TODO |
| MA-237 | Compute a revealed opponent nerf's visuals from server-supplied state, not the replica's empty NOOP slot | After a reveal, random-square nerfs highlight nothing or the wrong squares. | `src/components/OnlineMatch.tsx`, `worker.ts` | S | polish |  | TODO |
| MA-238 | Include cardOverrides in the DO /arena/end fallback draftRecord, matching /api/arena/end | Arena games archived through the fallback replay against the wrong pool when overrides are active. | `worker.ts`, `src/app/api/arena/end/route.ts` | XS | bug |  | TODO |

### Balance

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-239 | Expose per-card numeric knobs (charges, durations, counts) as overridable data so balance tweaks below a retier need no deploy | Only tier, enabled and text are config today. | `src/lib/server/cardOverrides.ts`, `src/engine/draft.ts`, `src/engine/buffs/library.ts` | L | gap |  | TODO |
| MA-240 | Let report-card-winrate read a named snapshot (--file) and fix sim-card-winrate's comment pointing at a nonexistent --merge flag | The committed snapshots cannot be triaged, and the sweep's docs name a flag that does not exist. | `scripts/report-card-winrate.ts`, `scripts/sim-card-winrate.ts` | XS | docs, repro | A2 | TODO |

### AI opponent

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-241 | Cap the no-Worker synchronous search on the practice page to a short budget (or run it in chunks) | Without a Worker, the hard bot freezes the UI for up to 4 seconds. | `src/app/game/page.tsx` | XS | polish |  | TODO |

### Multiplayer and backend

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-242 | Tell a tab its seek was replaced when the same account queues from another tab | Otherwise the first tab shows 'searching' forever. | `worker.ts`, `src/app/lobby/QuickMatch.tsx` | XS | polish, repro |  | TODO |
| MA-243 | Answer a duplicate move (ply already applied) as stale_ply or a silent ack instead of not_your_turn, and require an integer ply | A harmless network duplicate shows 'It is not your turn.' to the player. | `worker.ts`, `src/components/OnlineMatch.tsx` | XS | polish, repro |  | TODO |
| MA-244 | Add a cooldown to takeback and rematch re-offers after a decline or cancel | An offer/decline or offer/cancel loop can spam the opponent with popups. | `worker.ts` | XS | polish, repro |  | TODO |
| MA-245 | Wrap the webSocketMessage dispatch in a try/catch that logs and replies internal_error | No handler throws on garbage today, but nothing protects the global DO if a future one does. | `worker.ts` | XS | polish |  | TODO |
| MA-246 | Update ralph F3 (desync telemetry): hashing, client beacon and sink exist; narrow the row to the missing aggregation/report surface | The backlog row says TODO for work that has shipped. | `docs/ralph-backlog.md` | XS | docs | F3 | TODO |

### Accounts, ratings, data

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-247 | Enforce rated => draft + mode + not stacked in createMatch, and fix the two stale comments that say friend games are never rated or only casual games reach the speed fallback | A raw-socket create frame can make a rated stacked-draft game, or rate a retired speed bucket. | `worker.ts`, `src/lib/server/games.ts` | XS | bug |  | TODO |
| MA-248 | Only ignore 'duplicate column' errors in the ensureSchema additive pass, and do not stamp additive_version when any other statement fails | A broken ALTER would be skipped silently and stamped as done, so it never retries. | `src/lib/server/schema.ts` | XS | bug |  | TODO |
| MA-249 | Make the profile games-list cursor tie-safe with a (completed_at, id) keyset | Games that share a completed_at at a page boundary are skipped by 'Load more'. | `src/app/api/users/[username]/games/route.ts`, `src/app/u/[username]/page.tsx` | XS | bug |  | TODO |
| MA-250 | Offer to merge a guest's games and ratings when the guest signs in to an existing account, and purge long-idle guest rows | A guest who then logs in loses the games just played, and guest rows grow without bound. | `src/app/api/auth/login/route.ts`, `src/app/api/auth/google/callback/route.ts`, `src/app/api/auth/guest/route.ts` | S | gap | P11 | TODO |
| MA-251 | Assert in check-auth-safety that a guest's user_ratings and archived games survive registration and the Google upgrade | 'Convert without losing history' is guaranteed only by construction, and no test enforces it. | `scripts/check-auth-safety.ts`, `src/app/api/auth/register/route.ts` | XS | test |  | TODO |
| MA-252 | Show the provisional '?' on the mobile menu rating, and stop returning the frozen legacy users.rd from /api/auth/me and the profile payload | The chip shows a settled-looking number for provisional players, and the API exposes an RD that no longer moves. | `src/components/MobileNavMenu.tsx`, `src/app/api/auth/me/route.ts`, `src/app/api/users/[username]/route.ts` | XS | polish |  | TODO |
| MA-253 | Make a Postgres read failure visible to callers instead of silently serving the frozen D1 games table | During a Postgres outage, profiles, history and the rating graph show games frozen at the cutover as if they were current. | `src/lib/server/pg.ts`, `src/lib/server/games.ts` | XS | polish |  | TODO |
| MA-254 | Update the stale 'single account rating / per-speed is a future step' note to record the per-mode rating decision (1+0 to 15+10 share the Nerf or Buff bucket) | The checklist expects per-time-control ratings, and the only written note contradicts what the code does. | `docs/accounts-and-matchmaking.md`, `src/lib/ratingCategories.ts`, `worker.ts` | XS | docs |  | TODO |

### UI and visual design

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-255 | Clear drawn arrows and square marks on a plain left click when the board is disabled (spectating, after the result, history review) | Right-drag still draws on a disabled board, but no left click can clear it. | `src/components/Board.tsx` | XS | bug |  | TODO |
| MA-256 | Ignore contextmenu from touch and pen long-press in handleSquareContextMenu (and while a left drag is armed), so a slow drag does not cancel the queued premove | An Android or pen long-press fires contextmenu, which cancels the premove queue and the selection mid-gesture. | `src/components/Board.tsx` | XS | bug | B1 | TODO |
| MA-257 | Make Board read the showCoordinates, highlightLastMove and showLegalMoves prefs itself (or pass them) on the spectator, replay, history, analysis and tutorial boards | A player who turned coordinates or last-move highlight off still gets them on every non-play board. | `src/components/Board.tsx`, `src/app/game/[id]/page.tsx`, `src/app/history/[id]/page.tsx` +2 | XS | gap |  | TODO |
| MA-258 | Add an 'outside the board' placement as a second value of the coordinates setting | The checklist asks for inside or outside, and only inside exists. | `src/components/Board.tsx`, `src/lib/settings.ts`, `src/components/settings/config.ts` | S | gap |  | TODO |
| MA-259 | Make desktop board size a real control: a corner drag handle, and a size setting that can trade the 100dvh-12rem reserve or shows the effective size | On common laptops the 0.8-1.1 slider can only shrink the board, because the height reserve caps it first. | `src/lib/settings.ts`, `src/components/HeaderSettingsMenu.tsx`, `src/components/settings/config.ts` +2 | S | gap |  | TODO |
| MA-260 | Retint legal-move dots and capture rings on the green board themes (Forest, Green, Tournament) | The fixed green hints have the lowest separation on green dark squares. | `src/app/globals.css`, `src/lib/settings.ts` | XS | polish, repro | B3 | TODO |
| MA-261 | Draw knight arrows as a bent L and snap right-drag arrows to queen and knight lines | A straight diagonal for a knight move reads as a bishop line. | `src/components/Board.tsx` | S | polish | E18 | TODO |
| MA-262 | Delete or implement the mobile double-tap premove-cancel: lastTapRef is declared and documented but never set | The comment promises a touch gesture that does not exist. | `src/components/Board.tsx` | XS | polish | B1 | TODO |
| MA-263 | Mark the shown ply with aria-current, give MoveList cells a 44px coarse-pointer height, and disable cells below the review floor as MoveStrip does | Screen readers cannot tell which move is shown, and the rail cells are small on touch tablets. | `src/components/MoveList.tsx`, `src/components/MoveStrip.tsx` | XS | polish |  | TODO |
| MA-264 | Highlight every ply of the opponent's last turn when an extra-move card gave them two moves | With extra-move cards, the first of two opponent moves leaves no trace on the board. | `src/app/game/page.tsx`, `src/components/OnlineMatch.tsx`, `src/components/Board.tsx` | S | polish | B3 | TODO |
| MA-265 | Correct stale backlog rows and comments: E14, E16 and E19 are implemented, B4 is partly done, D6's line count is stale, and the 'Brown is the default' comment contradicts the midnight default | TODO rows for finished work send the loop back to it. | `docs/ralph-backlog.md`, `src/lib/settings.ts` | XS | docs | E19 | TODO |
| MA-266 | Offer an auto-flip-to-side-to-move toggle on /analysis | The checklist asks for auto-flip in local play. There is no pass-and-play mode, and /analysis is the board where one person moves both sides. | `src/app/analysis/page.tsx` | XS | feature |  | TODO |
| MA-267 | Give the root 404 the site header and a small chess-flavoured element, keeping the per-kind copy | The 404 is helpful but generic and has no global nav. | `src/app/not-found.tsx`, `src/app/_components/NotFoundPanel.tsx` | S | polish | C17 | TODO |
| MA-268 | Add tabular-nums to the in-game player rating in BoardPlayerRow | The checklist wants tabular ratings everywhere. | `src/components/BoardPlayerRow.tsx` | XS | polish |  | TODO |

### Animation, sound, feel

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-269 | Make data-anim=fast scale the Piece glide value instead of the 80ms !important clamp overriding it | Under Fast, the Piece glide setting does nothing. | `src/app/globals.css`, `src/components/Board.tsx` | XS | bug | B7 | TODO |
| MA-270 | Delete or wire the dead playNotify export, and give a picked buff its own audible apply cue | Two of the 14 checklist sounds are dead or only indirect. | `src/lib/sounds.ts`, `src/components/DraftOverlay.tsx`, `src/components/effects/passive/PassiveSpawn.tsx` | XS | gap |  | TODO |
| MA-271 | Scale piece-glide duration slightly with travel distance | A one-square step and a full-board move glide in the same time. | `src/components/Board.tsx` | S | polish, repro | B7 | TODO |
| MA-272 | Slide the promoting pawn before the transform flourish, and keep the crown on capture-promotions | The pawn teleports, and capture-promotions lose the crown flash. | `src/components/Board.tsx` | S | polish, repro |  | TODO |
| MA-273 | Fix design-system.md's '.press is on by default' and opt game controls into press (or add an :active treatment to .btn-*) | Press feedback is almost absent, and the design doc says the opposite of the code. | `src/components/ui/Button.tsx`, `src/app/globals.css`, `docs/design-system.md` | S | polish, repro |  | TODO |
| MA-274 | Add a two-beat pulse on the checked king's square when check lands, and delete the dead sq-check-pulse keyframes and ::after rule | The checklist asks for a pulse, and the CSS for one is dead code. | `src/app/globals.css`, `src/components/Board.tsx` | XS | polish | B3 | TODO |
| MA-275 | Mark checkmate on the board during the settle (mated-king beat) before the result panel | The board itself never says 'mate'. | `src/components/GameOver.tsx`, `src/components/Board.tsx`, `src/app/globals.css` | S | polish | D3 | TODO |
| MA-276 | Add route transitions (a crossfade, gated by data-anim) | Navigation hard-cuts between pages. | `src/app/layout.tsx`, `src/app/globals.css` | M | polish | D1 | TODO |
| MA-277 | Correct stale feel docs: ralph B5/E12/E13 statuses, the animation audit's followSystemMotion default, the playPassiveCue 'never resumes' comment and the .sq-check pulsing-ring comment | The loop treats these as truth and will redo work that has already landed. | `docs/ralph-backlog.md`, `docs/animation-audit-2026-07-17.md`, `src/lib/sounds.ts` +1 | XS | docs | E13 | TODO |
| MA-278 | Add haptics on capture, on check against you and at game start, behind a Settings toggle that follows the app motion policy | The checklist's three haptic moments are not wired. | `src/lib/haptics.ts`, `src/components/OnlineMatch.tsx`, `src/app/game/page.tsx` +2 | S | feature |  | TODO |
| MA-279 | Decide on an optional soft per-second tick under 10s, and fix the 'Ticks when your clock runs low' hint, which describes two one-shots | The checklist asks for a tick; the setting promises ticks; the code plays two one-shots. | `src/components/ClockPill.tsx`, `src/lib/sounds.ts`, `src/components/settings/config.ts` | XS | feature | B6 | TODO |

### Performance

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-280 | Split the game route's render-blocking effect CSS (effects.css 110KB, DraftOverlay.css 59KB) so rarely used keyframes load with the lazy chunks that use them | About 170KB of effect CSS source sits on the game route's critical path on top of globals.css (133KB). | `src/components/effects/effects.css`, `src/components/DraftOverlay.css`, `src/components/effects/BoardEffects.tsx` +1 | M | polish, repro |  | TODO |
| MA-281 | Add cache rules for /gym and /puzzle-data to public/_headers and PUBLIC_ASSET_DIRS, plus a guard that the two lists name the same directories | Two public dirs fall back to revalidating on every visit, and the two hand-kept lists can drift. | `public/_headers`, `next.config.mjs`, `scripts/polish/headers-check.ts` | XS | polish, repro |  | TODO |
| MA-282 | Move the GameOver rating count-up into a leaf component (or write textContent through a ref) so the whole panel stops re-rendering every animation frame | For 700ms the full end screen re-renders at 60fps (F111, still open). | `src/components/GameOver.tsx`, `docs/polish-pass/LEDGER.md` | XS | polish |  | TODO |
| MA-283 | Key the board-height ResizeObserver effects on board presence instead of game identity, so each ply stops rebuilding the observer and 5 listeners and forcing a layout read | Every ply tears down and re-attaches the observer and listeners and forces a getBoundingClientRect, even though the ResizeObserver already tracks size changes. | `src/app/game/page.tsx`, `src/components/OnlineMatch.tsx` | XS | polish |  | TODO |

### Accessibility

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-284 | Add a skip-to-content link in the root layout | Keyboard users have to Tab through the whole header on every page. | `src/app/layout.tsx`, `src/components/SiteHeader.tsx` | XS | gap |  | TODO |
| MA-285 | Add screen-reader read-out commands (clocks, last move, held cards, opponent cards) and typed move input; move B4 to WIP | A blind player cannot query the clock or hand without hunting through the DOM. | `src/lib/boardKeymap.ts`, `src/components/Board.tsx`, `src/components/board/ShortcutsDialog.tsx` +1 | M | feature | B4 | TODO |

### Code quality and tests

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-286 | Decide on Prettier: add it with format:check on changed files, or record in DECISIONS.md why formatting is not enforced | The checklist expects a formatter, and none is configured. | `package.json`, `eslint.config.mjs` | XS | gap |  | TODO |
| MA-287 | Make feel.spec 'a whole game' reach a result (play on or resign after N plies, then assert #game-over-title) | The only long vs-AI e2e passes without reaching a result. | `e2e/feel.spec.ts` | XS | test |  | TODO |
| MA-288 | Retire the legacy standalone server (server/index.ts, server:start, tsconfig.server include) or mark it unsupported, then drop ws from root dependencies | It is a second, classic-only copy of the match lifecycle that drifts from worker.ts. | `server/index.ts`, `package.json`, `tsconfig.server.json` | S | polish |  | TODO |
| MA-289 | Refresh stale tracker rows: mark ralph C4 DONE (28 error.tsx plus global-error.tsx, test:error-boundaries green) and narrow LEDGER F250 to the missing build and e2e jobs | Stale rows send the loop after finished work. | `docs/ralph-backlog.md`, `docs/polish-pass/LEDGER.md` | XS | docs | C4 | TODO |

### Features

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-290 | Add a Wordle-style share to the solved daily puzzle: number, tries, streak and a link, via navigator.share with a clipboard fallback | The checklist asks for a shareable daily result. Only a bare permalink exists. | `src/components/puzzles/PuzzleRunner.tsx`, `src/app/puzzles/page.tsx`, `src/lib/puzzles/session.ts` | S | feature | E2 | TODO |
| MA-291 | Add a puzzle rating: Glicko in D1 for accounts with a local fallback for guests, attached to both the puzzle and the solver | The checklist asks for a puzzle rating, and there is none. | `src/lib/puzzles/session.ts`, `src/lib/glicko.ts`, `src/lib/server/schema.ts` +1 | M | feature |  | TODO |
| MA-292 | Add a worked example to each codex detail page: a small static board showing the card's effect, reusing puzzle or dev plays scene data where it exists | The detail pages describe each card in prose only, and the checklist asks for examples. | `src/components/codex/CardDetail.tsx`, `src/app/codex/_components/AffectedPieces.tsx` | M | feature |  | TODO |
| MA-293 | Offer codex sorts by measured win rate and pick rate from the cached card-insights rollup | Per-card stats exist, but the browser sorts only by name and tier. | `src/lib/nerfFilter.ts`, `src/app/codex/_components/CodexBrowser.tsx`, `src/lib/server/cardInsights.ts` | S | feature |  | TODO |
| MA-294 | Offer clip and reel export for online and archived games: mount ClipModal from OnlineMatch's GameOver and from /game/[id] using the draft replica snapshots | The reel export works only for bot games. | `src/components/OnlineMatch.tsx`, `src/app/game/[id]/page.tsx`, `src/components/clip/ClipModal.tsx` +1 | M | feature |  | TODO |
| MA-295 | Add weekly leaderboards (rating gain or games in an ISO week) and a per-card board (best record while holding card X) | Only two all-time boards, one per mode, exist. | `src/app/api/leaderboard/route.ts`, `src/app/leaderboard/page.tsx`, `src/lib/server/cardInsights.ts` | M | feature |  | TODO |
| MA-296 | Expose the stacked-draft preset in FriendGame (the server already honours it), then add colour choice and a tier-cap or card-pool option end to end | The server honours a stacked option that no UI can reach, and the checklist asks for card-pool control. | `src/components/FriendGame.tsx`, `src/lib/multiplayer.ts`, `worker.ts` | S | feature |  | TODO |
| MA-297 | Add in-game emotes: a fixed set sent as a new 'emote' frame, rate-limited per userId (not per socket), and hidden by muteChat | The checklist asks for rate-limited emotes, and there are none. | `worker.ts`, `src/components/ChatPanel.tsx`, `src/lib/socketProtocol.ts` +1 | S | feature |  | TODO |
| MA-298 | Add a streamer mode setting: hide the opponent's name, avatar and chat, and wire spectatorDelaySec to a real delay for the streamer's games | The checklist asks for streamer mode. The delay field exists but is hardcoded to 0. | `src/lib/settings.ts`, `worker.ts`, `src/engine/game.ts` +1 | M | feature |  | TODO |
| MA-299 | Make the site an installable PWA: add src/app/manifest.ts and a service worker that precaches the /game vs-AI shell, engine chunks and piece and sound assets | There is no manifest and no service worker, although vs-AI play is fully client-side. | `src/app/layout.tsx`, `src/app/game/page.tsx`, `public/_headers` | M | feature |  | TODO |

### Copy, SEO, sharing

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-300 | Run test:seo-dupes and test:jsonld against a local server in a CI job, and add Event structured data to tournament pages | The crawl-level SEO and JSON-LD guards never run automatically. | `.github/workflows/guards.yml`, `scripts/check-seo.ts`, `scripts/check-jsonld.ts` +2 | S | test |  | TODO |
| MA-301 | Rename ambiguous button labels (resign confirm 'Yes' to 'Resign', 'Engine', 'none', 'Custom game') and add a verb-first check with an allowlist to scripts/check-buttons.ts | A few labels are ambiguous, notably the resign confirm, and nothing checks wording. | `scripts/check-buttons.ts`, `src/app/game/page.tsx`, `src/app/analysis/page.tsx` +2 | S | polish, repro |  | TODO |
| MA-302 | Do a personality pass on site copy (404, empty states, loading lines, error toasts) in the card-flavour voice, and add a copy-voice section to docs/design-system.md | The meme brand lives only in card flavour text; site chrome copy is flat. | `src/app/_components/notFoundCopy.ts`, `docs/design-system.md` | S | polish |  | TODO |

### Security

| ID | Item | Why | Files | Size | Kind | Ralph | Status |
|---|---|---|---|---|---|---|---|
| MA-303 | Prune login_attempts (rl:, guest:, register:, ip:, u: keys) and stale never-upgraded guest accounts in the daily job | Every IP and every rate-limited key adds a row that is never deleted unless the same key is checked again. | `src/lib/server/dailyJob.ts`, `src/lib/server/auth.ts`, `src/lib/server/request.ts` | S | gap |  | TODO |
| MA-304 | Route the tutorial and glossary JSON-LD through <JsonLd>/safeJson, and add a guard that allowlists the 10 dangerouslySetInnerHTML sites and bans innerHTML, insertAdjacentHTML, document.write and eval | The XSS 'yes' rests on 10 sites happening to be static or escaped, and no guard pins that. | `src/app/tutorial/page.tsx`, `src/app/guide/glossary/page.tsx`, `src/components/seo/JsonLd.tsx` +1 | XS | test |  | TODO |
| MA-305 | Use constant-time bearer comparison in arena-service and engine-service | The Worker compares these shared secrets in constant time, but the sidecars use ===. | `arena-service/server.ts`, `engine-service/server.ts` | XS | polish |  | TODO |
| MA-306 | Make GET /api/messages/[username] read-only and move mark-as-read to a guarded POST | A cross-site top-level navigation can mark a victim's messages and notifications read, because Lax cookies ride on GET. | `src/app/api/messages/[username]/route.ts` | XS | polish |  | TODO |
| MA-307 | Make server/index.ts fall back to same-origin when GAME_SERVER_ORIGINS is unset (or retire it per P-legacy) | The legacy Node server accepts sockets from any origin by default, while the production DO fails closed. | `server/index.ts` | XS | polish |  | TODO |
| MA-308 | Add X-Content-Type-Options: nosniff (and a restrictive CSP) for ASSETS-served files in public/_headers | The ASSETS binding serves public files and /_next/static before the worker runs, so they get none of the security headers. | `public/_headers`, `next.config.mjs` | XS | polish |  | TODO |
| MA-309 | Reconcile docs/polish-pass/LEDGER.md security rows with the code (F062, F063, F068 and the auth/socket rows still TODO although implemented) and fix the P12 label | The ledger misstates which security fixes shipped, so the next loop may redo them or skip the parts that remain. | `docs/polish-pass/LEDGER.md`, `docs/ralph-backlog.md` | XS | docs | P12 | TODO |

## Refuted in verification

Raised by an auditor and disproved by the verifier. Do not raise them again without new evidence.

| Group | Claim | Why it was refuted |
|---|---|---|
| rules-end-state | Wheel of Fortune outcome predictable (as the evidence for the fxRng item) | wheel_of_fortune is retired (src/engine/retired.ts:808), so players cannot draft it. The item survives on new evidence: the live gm_heads_or_tails outcome was predicted from public state in 40/40 positions (verify/rng-live-card.ts). |
| rules-end-state | Threefold never fires in FEN-start games (end-state2 E, part of the incremental-repetition item) | Real games never start from a FEN. fenToBoard is used only by src/app/analysis/page.tsx, and worker, server and engine-service have no start-FEN path (grep startFen/fenToBoard in worker.ts and src/engine is empty). The behaviour is real but no player can reach it, so it was dropped as a sub-claim. |
| rules-end-state | Make endMatch fully idempotent (auditor's framing) | Rating and recording are already exactly-once (match.recorded at worker.ts:3663, plus the nonce ledger). Calling endMatch again on an ended match in retireFailedHouseMatch is a plausible recovery path. Only the duplicate rating-less 'end' broadcast remains, kept as a narrowed P3. |
| cards | Add a spellcheck pass over card names, descriptions, tips and flavor (separate P3 item) | Not refuted on substance; it was merged into the card-text linter item (same script, scripts/check-card-text.ts), so it is no longer a separate item. |
| cards | Claim: 'nothing in the repo exercises random multi-card games' (in the fuzz item) | scripts/polish/parity-fuzz.ts (npm run test:parity, package.json:129) already plays random games with picks, banks, rerolls and activations. It lacks board invariants and is not in CHEAP_GUARDS. The item was kept but reframed as extending it. |
| cards | bn4_long_winter as a reproduced soft-lock card | repro-softlock.ts's own run shows white with 26 legal moves after the bn4_long_winter pick (white's simultaneous pick settled it). It appears only in the probe/fuzz output, so the reproduced soft-lock evidence is court_in_exile. The P0 stands on that card. |
| net | Harness check 'out-of-turn move rejected' FAIL (net-audit.ts:155-158), as a server defect | The auditor did not raise it as an item, but its harness reports FAIL. The test sends white's d2d4 at ply 2, which is white's turn and a legal move, so the server is right to accept it. It is a test bug and must be fixed before the harness is promoted to CI. |
| net | Separate items: 'Abort autoStart games whose second seat never arrives' and 'End games where a side never moved as aborted' | Not refuted on substance. Both reproduce, and they are merged into one item (the Lichess-style no-start abort policy, P2 M) because one mechanism fixes both. |
| security | Remove the login timing oracle by running PBKDF2 against a dummy hash when no account matches | Not wrong, but useless alone: register/route.ts:94-101 already returns 'That email is already in use.' to any caller, so fixing login timing does not stop email enumeration. Merged into the email-verification and enumeration item. |
| security | Route the tutorial and glossary JSON-LD through <JsonLd>/safeJson | Merged into the dangerouslySetInnerHTML allowlist guard item (same file set, same goal). |
| ui-board | touch-action: pinch-zoom may be dropped by some browsers (the iOS concern in the e2e item) | caniuse-lite (node_modules/caniuse-lite/data/features/css-touch-action.js) rates touch-action 'y' (full support) for iOS Safari 13.0 through 26.6, Android Chrome and Samsung Internet. Only iOS 9.3-12.x was partial (#3). Removed from the item. |
| ui-board | Measure the drag ghost's offset (separate P2 measure item) | Not refuted on substance, but merged into the board-input e2e item: it is the same spec and the same assertion. |
| ui-board | Pass the already-computed review-board checkSquares (separate XS item) | Merged into the 'show check on every board' item, which covers the same missing check glow on the review, spectator, replay, history and analysis boards. |
| ui-screens | (part of) Record the owner's decision on a distinctive display face versus Noto Sans in DESIGN.md | It is already recorded: the DESIGN.md 'Type' section says 'Faces: Noto Sans for both the display and body roles (the UI face lichess ships)', and globals.css:165-167 carries the same rationale. Only the tabular-nums half survives. |
| ui-screens | (claim) There are no orientation queries anywhere in src | matchLayout.ts has 12 uses of (orientation:portrait) for the 768-1279 tablet band. The landscape-phone gap still stands, because there is no landscape or short-height query. |
| ui-screens | (claim) No key-moment logic anywhere | ClipModal.tsx:271 highlightsPlan picks top card plays and biggest swings, and clipScene.ts:3601 computes BIGGEST SWING. The logic exists but is not surfaced on GameOver. The item was kept as a reuse task. |
| feel | Match found has no cue at pairing (part of the 'notify, match found and buff' item) | QuickMatch router.push to /game/<id> runs right on pairing (QuickMatch.tsx:224-229), and OnlineMatch plays playGameStart on mount for a game with no moves (OnlineMatch.tsx:321-334), so match found is voiced within a navigation of pairing. The rest of that item survives as the notify/buff item. |
| feel | No recorded frame or dropped-frame numbers for card plays (evidence claim in the 60fps line and the measure item) | 789 card-strip JSONs under docs/polish-pass/evidence carry raf.dropped (median 6, worst 263). They are unthrottled 1280x800 desktop data (card-strip.ts:359), so the 4x-CPU mobile requirement is still unmeasured and the item survives with corrected evidence. |
| perf | Claim (Lighthouse line): 'No production build has ever been measured' | docs/polish-pass/slices/B.md:6-12 shows production next build plus next start runs for before and after checks, and LEDGER.md:892 says next build is green. The real gap is narrower: no Lighthouse, route-table or web-vitals numbers were recorded from those builds. The line verdict stays 'no'. |
| perf | Claim (web-vitals item): the desync and tv-telemetry sinks still have the F066 body-size and rate-limit gap | F066 is DONE in slices/F.md:34 (9KB bodies now return 413, and 20 of 140 beacons were rate limited). tv-telemetry/route.ts:2,46 uses readJsonObject with maxBytes and memoryRateLimit. LEDGER.md:433 TODO is stale. |
| perf | Claim (re-render line and profiler item): there is no profiler tooling anywhere | e2e/polish/social-routes.spec.ts:573-581 installs a __REACT_DEVTOOLS_GLOBAL_HOOK__ onCommitFiberRoot commit counter, and scripts/measure-draft-open.mjs counts commits too. It has just never been run on the game routes. The item stays, reworded to reuse that harness. |
| perf | Claim (CardOfTheDay item): the eager import contradicts page.tsx:12-15 | That comment only promises the engine never ships in the home page's chunk, and it does not. The item stays, reframed as post-hydration download and eval cost. |
| a11y-npe-copy | (Claim inside the sitemap item) sitemapDates.gen.ts is genuinely stale and should be regenerated | 44b39101 is a shallow-boundary commit (.git/shallow; git show --stat shows 5353 files added), so git log -1 -- <route files> returns the boundary date in this clone and in a depth-50 clone alike. bf5805d regenerated the file after 44b39101 with 09-23 dates, which is consistent with full history. Regenerating here would write wrong dates. The item survives, rewritten as a clone-depth bug in the guard and CI config. |
| a11y-npe-copy | (Line verdict) 'Text scales to 200 percent' is a flat 'no' | Browser page zoom is not blocked (layout.tsx:136, no maximum-scale or user-scalable lock), and the sweep already checks layout at 360 to 1920 widths (sweep.spec.ts:31), which covers much of what 200% zoom produces. Only the browser text-size preference is ignored, because of the 14px root. Changed to partial. |
| a11y-npe-copy | (Line verdict) 'sitemap.xml and robots.txt' is partial because of the failing guard | Both exist and test:seo-static passes. The failure is a shallow-clone artefact in the date guard, now a separate tooling item. Changed to yes. |
| quality | Extend the card lab run-all to nerfs and wire test:lab into guard | Not wrong, but a duplicate. The nerf half is the same work as the all-nerf smoke item, and wiring test:lab is part of the guard:engine CI item. Both points survive in those items. |
| quality | Clock billing copies 'subtract raw elapsed' (auditor evidence) | False as worded: arena-service/game.ts:225-226 and :512-513 and server/index.ts:210 subtract first-move grace. The real divergence is the missing draft-window exclusion. I folded the corrected claim into the clock helper item. |
| features-meta | (part of the friend-game item) The server accepts picksVisible but no UI sends it | worker.ts:3788-3793 forces picksVisible = draft and voids requested.picksVisible ('owner call: the opponent's draft should not be hidden'). It is a deliberately fixed field, not an unreachable option, so I dropped it from the item; only stacked remains. |
| features-meta | Wire puzzle re-verification into the guard (separate item) | I merged it into the single 'wire the cheap feature-surface checks into the guard and CI' item. It is the same change in the same files. |
