// For every nerf with a move filter: is the en passant capture e5xd6 treated like
// the equivalent ordinary pawn capture e5xd6? Also: ep timing (only right after
// the double push) and the horizontal-pin case, under the site rules and in the
// Chess Diff (standard-rules) sub-game.
import { newGame, legalMoves, playMove, UNRESTRICTED_NERF } from "../../../../../src/engine/game";
import { moveToUCI, moveFromUCI } from "../../../../../src/engine/board";
import { ALL_NERFS } from "../../../../../src/engine/nerfs/library";
import { fenToBoard } from "../../../../../src/lib/fen";

function line(nerf: any, ucis: string[]) {
  const g = newGame(nerf, UNRESTRICTED_NERF, 11);
  for (const u of ucis) {
    const m = legalMoves(g).find((x) => moveToUCI(x) === u) ?? moveFromUCI(g.board, u)!;
    playMove(g, m);
  }
  return g;
}
const A = ["e2e4", "a7a6", "e4e5", "d7d5"]; // ep e5xd6 available
const B = ["e2e4", "d7d6", "e4e5", "a7a6"]; // ordinary e5xd6 available
const diffs: string[] = [];
let n = 0;
for (const nerf of ALL_NERFS.filter((x) => x.filterMoves && x.implemented)) {
  try {
    const ga = line(nerf, A), gb = line(nerf, B);
    if (ga.result || gb.result) continue;
    const la = legalMoves(ga), lb = legalMoves(gb);
    const epOk = la.some((m) => m.isEnPassant && moveToUCI(m) === "e5d6");
    const capOk = lb.some((m) => moveToUCI(m) === "e5d6" && m.captured === "p");
    // Was each one a pre-filter candidate at all? (should be true in both)
    n++;
    if (epOk !== capOk) diffs.push(`${nerf.id.padEnd(30)} ep=${epOk} ordinaryCapture=${capOk} :: ${nerf.description.slice(0, 110)}`);
  } catch (e) {
    diffs.push(`${nerf.id} threw ${(e as Error).message}`);
  }
}
console.log(`nerfs compared: ${n}; ep vs ordinary capture disagreements: ${diffs.length}`);
console.log(diffs.join("\n"));

// ep timing through the real game
{
  const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1);
  for (const u of ["e2e4", "a7a6", "e4e5", "d7d5"]) playMove(g, legalMoves(g).find((x) => moveToUCI(x) === u)!);
  const now = legalMoves(g).some((m) => m.isEnPassant);
  for (const u of ["h2h3", "a6a5"]) playMove(g, legalMoves(g).find((x) => moveToUCI(x) === u)!);
  const later = legalMoves(g).some((m) => m.isEnPassant || moveToUCI(m) === "e5d6");
  console.log(`ep timing: right after d7d5 ep=${now}; one move pair later ep=${later}`);
}
// horizontal pin
for (const [label, diff] of [["site rules", false], ["Chess Diff", true]] as const) {
  const g: any = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1);
  g.board = fenToBoard("8/8/8/KPp4r/8/8/8/7k w - c6 0 1")!;
  if (diff) g.buffs = { diff: { active: true } } as any;
  const ep = legalMoves(g).filter((m: any) => m.isEnPassant).map(moveToUCI);
  console.log(`horizontal pin 8/8/8/KPp4r/8/8/8/7k w - c6 [${label}]: ep moves offered = ${ep.join(",") || "none"}`);
}
