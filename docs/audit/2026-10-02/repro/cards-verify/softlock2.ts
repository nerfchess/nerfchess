import { UNRESTRICTED_NERF, newGame, enableDraftMode, legalMoves, playMove, acquireBuff } from "../../../../../src/engine/game";
import { moveToUCI } from "../../../../../src/engine/board";
let g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 99);
enableDraftMode(g, 5, { mode: "buff" });
g.buffs!.players.w.offer = null; g.buffs!.players.b.offer = null;
for (const u of ["a2a3","a7a6","h2h3","h7h6"]) { const m = legalMoves(g).find(x=>moveToUCI(x)===u)!; g = playMove(g, m); }
acquireBuff(g, "b", "court_in_exile", 7);
console.log("turn", g.board.turn, "white legal", legalMoves(g).length, "result", JSON.stringify(g.result));
// does a subsequent black-side action unstick it? try playing nothing: check whose turn can act
g.board.turn = "b"; console.log("black would have", legalMoves(g).length, "moves if it were black's turn");
