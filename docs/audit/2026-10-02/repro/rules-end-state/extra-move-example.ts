// Minimal hand-built false threefold: an extra move makes the engine key the
// position with the wrong side to move.
import { NerfGame, UNRESTRICTED_NERF, enableDraftMode, legalMoves, newGame, playMove } from "../../../../../src/engine/game";
import { moveToUCI, positionKey } from "../../../../../src/engine/board";
import type { Color } from "../../../../../src/engine/types";
let g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1);
enableDraftMode(g, 5, {});
for (const c of ["w", "b"] as Color[]) g.buffs!.players[c].offer = undefined as never;
g.buffs!.nextDraftAtPly = 1e9;
const trueKeys: string[] = [positionKey(g.board)];
// "+" = the mover holds one extra move before this move (an extra-move card)
const line = (process.argv[2] ?? "").split(" ").filter(Boolean);
for (const t of line) {
  const extra = t.startsWith("+"); const u = t.replace("+", "");
  if (extra) g.buffs!.extraMoves[g.board.turn] = 1;
  const m = legalMoves(g).find((x) => moveToUCI(x) === u);
  if (!m) { console.log("illegal", u, "turn", g.board.turn); break; }
  g = playMove(g, m);
  trueKeys.push(positionKey(g.board));
  const k = trueKeys.at(-1)!;
  console.log(`${t.padEnd(6)} true side to move=${g.board.turn} trueOccurrences=${trueKeys.filter((x) => x === k).length} result=${JSON.stringify(g.result)}`);
  if (g.result) break;
}
