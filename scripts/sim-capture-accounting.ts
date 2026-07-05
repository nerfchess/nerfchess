// Focused engine sim for buff capture accounting. Run with:
//
//   npx -y tsx scripts/sim-capture-accounting.ts
//
// Proves, off the server, that the removePiece capture accounting (added for
// the Resurrect fix) stays truthful under whole-board rewrites and summons:
// 1. Genesis resets the board without counting the cleared armies as
//    captures: the revive pools (game.captured) are unchanged by the reset.
// 2. Perfect Rewind rewinds the board without touching the pools.
// 3. Phantom Rook's expiry removes the summoned rook uncounted: the
//    opponent's revive pool never gains a rook they never took.
// 4. Control: a real buff destruction still counts (default removePiece),
//    and the explicit uncounted path does not.

import {
  UNRESTRICTED_NERF,
  activateBuff,
  bankDraft,
  enableDraftMode,
  legalMoves,
  makeBuffApi,
  newGame,
  playMove,
  type NerfGame,
} from "../src/engine/game";
import { moveToUCI } from "../src/engine/board";
import { SQ } from "../src/engine/types";
import type { Color } from "../src/engine/types";

let failures = 0;
function check(ok: boolean, label: string) {
  if (!ok) {
    failures++;
    console.error("FAIL:", label);
  } else {
    console.log("ok:", label);
  }
}

function freshGame(seed = 42): NerfGame {
  const game = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  enableDraftMode(game, seed + 1, { mode: "buff" });
  return game;
}

// Bank any pending offers so the draft cadence never blocks scripted moves.
function clearOffers(game: NerfGame) {
  for (const color of ["w", "b"] as Color[]) {
    if (game.buffs?.players[color].offer) bankDraft(game, color);
  }
}

function play(game: NerfGame, uci: string): NerfGame {
  clearOffers(game);
  const move = legalMoves(game).find((m) => moveToUCI(m) === uci);
  if (!move) throw new Error(`scripted move ${uci} is not legal here`);
  return playMove(game, move);
}

const pool = (game: NerfGame) => JSON.stringify(game.captured);
const pieceCount = (game: NerfGame) => game.board.pieces.filter(Boolean).length;

// ---------------------------------------------------------------------------
// 1. Genesis: captures happen, the reset changes nothing in the pools.
// ---------------------------------------------------------------------------
{
  let game = freshGame(101);
  game = play(game, "e2e4");
  game = play(game, "d7d5");
  game = play(game, "e4d5"); // white takes a pawn
  game = play(game, "d8d5"); // black takes a pawn back
  check(game.captured.w.p === 1 && game.captured.b.p === 1, "genesis setup: one pawn captured each way");

  const before = pool(game);
  game.buffs!.players.w.buffs.push({ id: "genesis", tier: 8, state: {} });
  const fired = activateBuff(game, "w", game.buffs!.players.w.buffs.length - 1, []);
  check(fired, "genesis activates");
  check(pieceCount(game) === 32, "genesis rebuilt the full opening position");
  check(pool(game) === before, "genesis left the revive pools untouched");
  check(game.captured.w.p === 1 && game.captured.b.p === 1, "genesis: real captures still remembered");
}

// ---------------------------------------------------------------------------
// 2. Perfect Rewind: same property for the snapshot restore.
// ---------------------------------------------------------------------------
{
  let game = freshGame(202);
  // Manual injection skips pickDraftCard, so seed the init-hook state here.
  game.buffs!.players.w.buffs.push({
    id: "perfect_rewind",
    tier: 8,
    state: { snaps: [game.board.pieces.map((p) => (p ? { ...p } : null))] },
  });
  game = play(game, "e2e4");
  game = play(game, "d7d5");
  game = play(game, "e4d5");
  game = play(game, "d8d5");
  check(game.captured.w.p === 1 && game.captured.b.p === 1, "rewind setup: one pawn captured each way");

  const before = pool(game);
  const idx = game.buffs!.players.w.buffs.findIndex((b) => b.id === "perfect_rewind");
  const fired = activateBuff(game, "w", idx, []);
  check(fired, "perfect rewind activates");
  check(pieceCount(game) === 32, "perfect rewind restored the pre-capture board");
  check(pool(game) === before, "perfect rewind left the revive pools untouched");
}

// ---------------------------------------------------------------------------
// 3. Phantom Rook: the expiry removal is not a capture.
// ---------------------------------------------------------------------------
{
  let game = freshGame(303);
  game.buffs!.players.w.buffs.push({ id: "phantom_rook", tier: 4, state: {} });
  const fired = activateBuff(game, "w", 0, [{ square: SQ(0, 2) }]); // a3
  check(fired, "phantom rook places");
  check(game.board.pieces[SQ(0, 2)]?.type === "r", "phantom rook stands on a3");

  const before = pool(game);
  // Four white moves tick the 4-turn timer down; quiet knight shuffles only.
  const script = ["g8f6", "g1f3", "f6g8", "f3g1", "g8f6", "g1f3", "f6g8", "f3g1"];
  for (const uci of script) game = play(game, uci);
  check(game.board.pieces[SQ(0, 2)] === null, "phantom rook expired and vanished");
  check(pool(game) === before, "phantom rook expiry left the revive pools untouched");
  check(game.captured.b.r === 0, "no rook ever entered black's captured pool");
}

// ---------------------------------------------------------------------------
// 4. Control: real destruction counts, the uncounted path does not.
// ---------------------------------------------------------------------------
{
  const game = freshGame(404);
  const api = makeBuffApi(game, "w");
  api.removePiece(SQ(0, 6)); // destroy black's a7 pawn: a real loss
  check(game.captured.w.p === 1, "counted removal feeds the capture counter");
  api.removePiece(SQ(1, 6), { uncounted: true }); // clear b7 uncounted
  check(game.captured.w.p === 1, "uncounted removal leaves the counter alone");
}

if (failures) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nall checks passed");
