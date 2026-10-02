// Repro: api.relocate (and swaps) move a piece but leave its square-bound freeze
// behind; the orphaned freeze then binds to the next friendly piece that lands
// on that square.
import { UNRESTRICTED_NERF, newGame, enableDraftMode, legalMoves, playMove, acquireBuff } from "../../../../../src/engine/game";
import { moveToUCI } from "../../../../../src/engine/board";
import { BUFF_BY_ID } from "../../../../../src/engine/buffs/library";
let g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1);
enableDraftMode(g, 2, { mode: "nerf" });
g.buffs!.players.w.offer = null; g.buffs!.players.b.offer = null;
for (let s = 0; s < 64; s++) g.board.pieces[s] = null;
const P = (sq: number, type: any, color: any) => (g.board.pieces[sq] = { type, color });
P(4, "k", "w"); P(60, "k", "b"); P(36, "p", "b"); /* e5 black pawn (relRank 4 for black) */ P(51, "n", "b"); /* d7 knight */
g.board.castling = { wk: false, wq: false, bk: false, bq: false };
g.board.turn = "w";
g.buffs!.effects.push({ kind: "freeze", sq: 36, owner: "b", turns: 3 });
acquireBuff(g, "w", "leaden_fields", BUFF_BY_ID.leaden_fields.tier);
console.log("after Leaden Fields: e5 =", JSON.stringify(g.board.pieces[36]), "e6 =", JSON.stringify(g.board.pieces[44]), "effects:", JSON.stringify(g.buffs!.effects));
// white quiet move, then black knight d7-e5
g = playMove(g, legalMoves(g).find((m) => moveToUCI(m) === "e1d1")!);
const kn = legalMoves(g).find((m) => moveToUCI(m) === "d7e5");
console.log("black can play d7e5:", !!kn);
if (kn) { g = playMove(g, kn); g = playMove(g, legalMoves(g).find((m) => moveToUCI(m) === "d1e1")!);
  console.log("knight on e5 now frozen? black moves from e5:", legalMoves(g).filter((m) => m.from === 36).map(moveToUCI).join(",") || "NONE", "| effects:", JSON.stringify(g.buffs!.effects)); }
