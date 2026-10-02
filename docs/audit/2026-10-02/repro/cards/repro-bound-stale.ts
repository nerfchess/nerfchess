// Repro: a piece-bound upgrade (Bishop to Archbishop) tracks its piece only
// through MOVES. If the bound bishop is removed by a card (not a move capture),
// the card stays live and the next friendly piece to land on that square
// inherits the knight leaps (here: a rook).
import { UNRESTRICTED_NERF, newGame, enableDraftMode, legalMoves, playMove, acquireBuff, activateBuff, makeBuffApi } from "../../../../../src/engine/game";
import { moveToUCI } from "../../../../../src/engine/board";
let g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1);
enableDraftMode(g, 2, { mode: "buff" });
g.buffs!.players.w.offer = null; g.buffs!.players.b.offer = null;
for (let s = 0; s < 64; s++) g.board.pieces[s] = null;
const P = (sq: number, type: any, color: any) => (g.board.pieces[sq] = { type, color });
P(4, "k", "w"); P(60, "k", "b"); P(2, "b", "w"); /* c1 bishop */ P(0, "r", "w"); /* a1 rook */
g.board.castling = { wk: false, wq: false, bk: false, bq: false };
acquireBuff(g, "w", "bishop_archbishop", 4);
const idx = g.buffs!.players.w.buffs.findIndex((b) => b.id === "bishop_archbishop");
activateBuff(g, "w", idx, [{ square: 2 }]); // binds c1 bishop; turn passes to black
console.log("bound to sq", g.buffs!.players.w.buffs[idx].state.sq, "turn", g.board.turn);
// Black removes the bishop with a card effect (what every removal card calls):
makeBuffApi(g, "b").removePiece(2);
g = playMove(g, legalMoves(g).find((m) => moveToUCI(m) === "e8d8")!);
// White rook a1 -> c1 (b1 empty)
g = playMove(g, legalMoves(g).find((m) => moveToUCI(m) === "a1c1")!);
g = playMove(g, legalMoves(g).find((m) => moveToUCI(m) === "d8e8")!);
const inst = g.buffs!.players.w.buffs[idx];
const rookMoves = legalMoves(g).filter((m) => m.from === 2).map((m) => moveToUCI(m) + (m.via ? "[" + m.via + "]" : ""));
console.log("card spent:", !!inst.spent, "state.sq:", inst.state.sq);
console.log("rook on c1 moves:", rookMoves.join(" "));
