// Independent repro: real "extra_move" card activation produces a false threefold.
import { UNRESTRICTED_NERF, enableDraftMode, legalMoves, newGame, playMove, acquireBuff, activateBuff } from "../../../../../src/engine/game";
import { moveToUCI, positionKey } from "../../../../../src/engine/board";
let g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 7);
enableDraftMode(g, 5, {});
for (const c of ["w", "b"] as const) g.buffs!.players[c].offer = undefined as never;
g.buffs!.nextDraftAtPly = 1e9;
acquireBuff(g, "b", "extra_move", 4 as never);
const keys = [positionKey(g.board)];
const line = ["g1f3","b8c6","f3g1","c6b8","g1f3","b8c6","f3g1","!","c6b8"];
for (const u of line) {
  if (u === "!") { const idx = g.buffs!.players.b.buffs.findIndex((b) => b.id === "extra_move"); console.log("activate:", activateBuff(g, "b", idx, []), "extraMoves.b=", g.buffs!.extraMoves.b, "turn", g.board.turn); continue; }
  const m = legalMoves(g).find((x) => moveToUCI(x) === u);
  if (!m) { console.log("illegal", u); break; }
  g = playMove(g, m);
  keys.push(positionKey(g.board));
  const k = keys.at(-1)!;
  console.log(u, "turn now", g.board.turn, "true occurrences", keys.filter((x) => x === k).length, "result", JSON.stringify(g.result), "diverged", g.buffs!.historyDiverged);
}
