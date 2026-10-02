import { gameToPGN } from "../../../../../src/lib/pgn";
import { generateMoves, initialBoard, makeMove, moveToUCI, sanLabels } from "../../../../../src/engine/board";
import type { Move } from "../../../../../src/engine/types";
function line(ucis: string[]): Move[] {
  let b = initialBoard(); const out: Move[] = [];
  for (const u of ucis) { const m = generateMoves(b).find((x) => moveToUCI(x) === u)!; out.push(m); b = makeMove(b, m); }
  return out;
}
const ms = line(["g1f3", "g8f6", "b1c3"]);
// extra-move card: white moves twice in a row (Nf3, Nc3), then black
const extra: Move[] = [ms[0], ms[2], ms[1]];
console.log("sanLabels:", sanLabels(extra).join(" | "));
console.log(gameToPGN({ moves: extra, result: { winner: "draw", reason: "draw by agreement" } as never }));
// History page passes result: null for a finished game
console.log(gameToPGN({ moves: ms, result: null }).split("\n").filter((l) => /Result|Termination/.test(l) || /\*$/.test(l)).join("\n"));
