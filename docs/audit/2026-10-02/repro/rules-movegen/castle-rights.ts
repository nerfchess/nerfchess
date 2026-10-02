// Castling-rights probes through the real game pipeline.
import { newGame, enableDraftMode, acquireBuff, activateBuff, legalMoves, playMove, UNRESTRICTED_NERF, makeBuffApi } from "../../../../../src/engine/game";
import { moveToUCI, makeMove, generateMoves } from "../../../../../src/engine/board";
import { BUFF_BY_ID } from "../../../../../src/engine/buffs/library";
import { fenToBoard, boardToFen } from "../../../../../src/lib/fen";
import type { Color } from "../../../../../src/engine/types";
import { parseSquare } from "../../../../../src/engine/types";

function game(fen: string, draft = true) {
  const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 5);
  if (draft) enableDraftMode(g, 5, { mode: "buff" });
  g.board = fenToBoard(fen)!;
  if (g.buffs) for (const c of ["w", "b"] as Color[]) g.buffs.players[c].offer = null;
  return g;
}
function play(g: any, u: string) {
  const m = legalMoves(g).find((x: any) => moveToUCI(x) === u);
  if (!m) throw new Error(`not legal: ${u} in ${boardToFen(g.board)} legal=${legalMoves(g).map(moveToUCI).join(",")}`);
  playMove(g, m);
  if (g.buffs) for (const c of ["w", "b"] as Color[]) g.buffs.players[c].offer = null;
}
const castles = (g: any) => legalMoves(g).filter((m: any) => m.castle).map(moveToUCI);

// 1. Plain makeMove: rights lost on king move, rook move, rook captured on its home square.
{
  const b = fenToBoard("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1")!;
  const k = makeMove(b, generateMoves(b).find((m) => moveToUCI(m) === "e1e2")!);
  const r = makeMove(b, generateMoves(b).find((m) => moveToUCI(m) === "h1h5")!);
  const cap = makeMove(b, generateMoves(b).find((m) => moveToUCI(m) === "a1a8")!);
  const capH = makeMove(b, generateMoves(b).find((m) => moveToUCI(m) === "h1h8")!);
  console.log("1 king move ->", boardToFen(k).split(" ")[2], "| rook h1 move ->", boardToFen(r).split(" ")[2], "| Rxa8 ->", boardToFen(cap).split(" ")[2], "| Rxh8 ->", boardToFen(capH).split(" ")[2]);
  // promotion capture on the rook's home square
  const p = fenToBoard("r3k2r/1P6/8/8/8/8/8/4K3 w kq - 0 1")!;
  const pc = makeMove(p, generateMoves(p).find((m) => moveToUCI(m) === "b7a8q")!);
  console.log("  bxa8=Q ->", boardToFen(pc).split(" ")[2]);
}

// 2. Purge (enemy card) removes the h1 rook; the K right survives; a DIFFERENT rook later reaching h1 castles.
{
  const g = game("4k3/8/8/8/8/8/8/R3K2R b KQ - 0 1");
  acquireBuff(g, "b", "purge", BUFF_BY_ID.purge.tier);
  const idx = g.buffs!.players.b.buffs.findIndex((b) => b.id === "purge");
  const ok = activateBuff(g, "b", idx, [{ square: parseSquare("h1") }]);
  console.log(`2 purge h1 activated=${ok} board=${boardToFen(g.board)} turn=${g.board.turn}`);
  if (g.board.turn === "b") play(g, "e8d8");
  for (const [w, bl] of [["a1a3", "e8d8"], ["a3h3", "d8e8"], ["h3h1", "e8d8"]] as const) { play(g, w); play(g, bl); }
  console.log(`  after Ra1-a3-h3-h1 (a different rook): ${boardToFen(g.board)} castles offered: ${castles(g).join(",") || "none"}`);
}

// 3. Relocation (own teleport-style card via BuffApi.relocate): king leaves e1 and returns without ever "moving".
{
  const g = game("4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1");
  const api = makeBuffApi(g, "w");
  api.relocate(parseSquare("e1"), parseSquare("e3"));
  console.log(`3 king relocated e1->e3: rights now ${boardToFen(g.board).split(" ")[2]}`);
  api.relocate(parseSquare("e3"), parseSquare("e1"));
  console.log(`  relocated back: castles offered ${castles(g).join(",") || "none"}`);
}

// 4. Rook removed by api.removePiece directly (any removal card) then a rook PLACED on h1 by a summon.
{
  const g = game("4k3/8/8/8/8/8/8/4K2R w K - 0 1");
  const api = makeBuffApi(g, "w");
  api.removePiece(parseSquare("h1"));
  api.place(parseSquare("h1"), "r", "w");
  console.log(`4 rook removed then a fresh rook summoned on h1: castles offered ${castles(g).join(",") || "none"}`);
}
// 5. Rook converted to the enemy colour and back (setPieceColor).
{
  const g = game("4k3/8/8/8/8/8/8/4K2R w K - 0 1");
  const api = makeBuffApi(g, "b");
  api.setPieceColor(parseSquare("h1"), "b");
  console.log(`5 h1 rook mind-controlled: rights ${boardToFen(g.board).split(" ")[2]} castles ${castles(g).join(",") || "none"}`);
  api.setPieceColor(parseSquare("h1"), "w");
  console.log(`  returned to white: castles ${castles(g).join(",") || "none"}`);
}
