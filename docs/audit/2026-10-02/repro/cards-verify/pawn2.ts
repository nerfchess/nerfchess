import { UNRESTRICTED_NERF, newGame, enableDraftMode, legalMoves, playMove, acquireBuff, buffNextTarget, activateBuff } from "../../../../../src/engine/game";
import { moveToUCI } from "../../../../../src/engine/board";
let g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1);
enableDraftMode(g, 2, { mode: "buff" });
g.buffs!.players.w.offer = null; g.buffs!.players.b.offer = null;
for (let s = 0; s < 64; s++) g.board.pieces[s] = null;
g.board.pieces[4] = { type: "k", color: "w" }; g.board.pieces[63] = { type: "k", color: "b" };
g.board.pieces[42] = { type: "p", color: "w" }; // c6
g.board.castling = { wk: false, wq: false, bk: false, bq: false };
acquireBuff(g, "w", "dragon_pawn", 4);
const idx = g.buffs!.players.w.buffs.findIndex(b => b.id === "dragon_pawn");
const t = buffNextTarget(g, "w", idx, []);
console.log("target", JSON.stringify(t)?.slice(0,200));
activateBuff(g, "w", idx, [{ square: 42 }]);
console.log("turn after activation", g.board.turn);
if (g.board.turn === "b") { const m = legalMoves(g).find(x => x.piece === "k")!; g = playMove(g, m); }
const lm = legalMoves(g).filter(m => m.from === 42);
console.log("c6 pawn moves:", lm.map(m => moveToUCI(m) + (m.promotion ? "(promo)" : "")).join(" "));
const bad = lm.find(m => (m.to >> 3) === 7 && !m.promotion);
if (bad) { g = playMove(g, bad); console.log("played", moveToUCI(bad), "->", JSON.stringify(g.board.pieces[bad.to])); }
