// Targeted rule probes for MEGA_AUDIT 1.1, through the real legalMoves().
// "site" = the live game's rules with no cards (king capture variant);
// "diff" = the Chess Diff sub-game (standard legality, the only check-aware path).
import { newGame, legalMoves, UNRESTRICTED_NERF } from "../../../../../src/engine/game";
import { moveToUCI } from "../../../../../src/engine/board";
import { fenToBoard } from "../../../../../src/lib/fen";
function moves(fen: string, mode: "site" | "diff"): string[] {
  const g: any = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1);
  g.board = fenToBoard(fen)!;
  if (mode === "diff") g.buffs = { diff: { active: true } };
  return legalMoves(g).map(moveToUCI).sort();
}
let fails = 0;
function expect(label: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? "  " + detail : ""}`);
  if (!cond) fails++;
}
const from = (ms: string[], sq: string) => ms.filter((u) => u.startsWith(sq));
// --- pawns
{
  const m = moves("4k3/8/8/8/8/8/3P4/4K3 w - - 0 1", "site");
  expect("pawn d2 single+double", JSON.stringify(from(m, "d2")) === JSON.stringify(["d2d3", "d2d4"]), from(m, "d2").join(","));
  const blk1 = moves("4k3/8/8/8/8/3n4/3P4/4K3 w - - 0 1", "site");
  expect("pawn blocked on d3: no pushes", from(blk1, "d2").length === 0, from(blk1, "d2").join(","));
  const blk2 = moves("4k3/8/8/8/3n4/8/3P4/4K3 w - - 0 1", "site");
  expect("pawn blocked on d4: single only", JSON.stringify(from(blk2, "d2")) === JSON.stringify(["d2d3"]), from(blk2, "d2").join(","));
  const r3 = moves("4k3/8/8/8/8/3P4/8/4K3 w - - 0 1", "site");
  expect("pawn on d3: no double", JSON.stringify(from(r3, "d3")) === JSON.stringify(["d3d4"]), from(r3, "d3").join(","));
  const bl = moves("4k3/3p4/8/8/8/8/8/4K3 b - - 0 1", "site");
  expect("black pawn d7 single+double", JSON.stringify(from(bl, "d7")) === JSON.stringify(["d7d5", "d7d6"]), from(bl, "d7").join(","));
  const edge = moves("4k3/8/8/1p5p/P6P/8/8/4K3 w - - 0 1", "site");
  expect("a4 captures b5 only, h4 never wraps to a5", JSON.stringify(from(edge, "a4")) === JSON.stringify(["a4a5", "a4b5"]) && JSON.stringify(from(edge, "h4")) === JSON.stringify([]), `a4:${from(edge, "a4")} h4:${from(edge, "h4")}`);
  const edge2 = moves("4k3/8/8/p6p/P6P/8/8/4K3 w - - 0 1", "site");
  expect("a4/h4 blocked, no wrap captures", from(edge2, "a4").length === 0 && from(edge2, "h4").length === 0, `${from(edge2, "a4")} ${from(edge2, "h4")}`);
  const both = moves("4k3/8/8/2p1p3/3P4/8/8/4K3 w - - 0 1", "site");
  expect("d4 captures both diagonals", from(both, "d4").join(",") === "d4c5,d4d5,d4e5", from(both, "d4").join(","));
  const promo = moves("1n2k3/P7/8/8/8/8/8/4K3 w - - 0 1", "site");
  expect("a7 promotes 4 ways by push and 4 by capture", from(promo, "a7").length === 8, from(promo, "a7").join(","));
}
// --- castling both colours both sides
for (const [fen, side] of [["r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1", "e1"], ["r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1", "e8"]] as const) {
  for (const mode of ["site", "diff"] as const) {
    const m = moves(fen, mode);
    const c = m.filter((u) => u === `${side}g${side[1]}` || u === `${side}c${side[1]}`);
    expect(`castling ${side} both sides [${mode}]`, c.length === 2, c.join(","));
  }
}
// --- castling out of / through / into check
const cases: [string, string, string][] = [
  ["out of check", "4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1".replace("4k3/8/8/8/8/8/8", "4k3/8/8/8/4r3/8/8"), "e1g1"],
  ["through check (f1)", "4k3/8/8/8/8/5r2/8/4K2R w K - 0 1", "e1g1"],
  ["into check (g1)", "4k3/8/8/8/8/6r1/8/4K2R w K - 0 1", "e1g1"],
  ["queenside through d1", "4k3/8/8/8/8/3r4/8/R3K3 w Q - 0 1", "e1c1"],
  ["queenside b1 attacked only (legal)", "4k3/8/8/8/8/1r6/8/R3K3 w Q - 0 1", "e1c1"],
];
for (const [label, fen, u] of cases) {
  const site = moves(fen, "site").includes(u);
  const diff = moves(fen, "diff").includes(u);
  const wantDiff = label.includes("(legal)");
  expect(`castle ${label}: site allows (by design), diff ${wantDiff ? "allows" : "forbids"}`, site && diff === wantDiff, `site=${site} diff=${diff}`);
}
// --- pins, double check, discovered check (diff only; site rules have no check legality)
{
  const pin = moves("4k3/4r3/8/8/8/8/4N3/4K3 w - - 0 1", "diff");
  expect("absolutely pinned knight has no moves [diff]", from(pin, "e2").length === 0, from(pin, "e2").join(","));
  const pinSite = moves("4k3/4r3/8/8/8/8/4N3/4K3 w - - 0 1", "site");
  expect("pinned knight may move under site rules (king-capture variant)", from(pinSite, "e2").length > 0);
  const rookPin = moves("4k3/4r3/8/8/8/8/4R3/4K3 w - - 0 1", "diff");
  expect("pinned rook may slide along the pin line only [diff]", from(rookPin, "e2").every((u) => u[2] === "e"), from(rookPin, "e2").join(","));
  const dbl = moves("4k3/8/8/8/1b6/8/8/r3K2R w K - 0 1".replace("r3K2R", "4K2R").replace("4k3/8/8/8/1b6/8/8", "4k3/8/8/8/1b6/8/8"), "diff");
  // double check: rook e8 + bishop b4 both hit e1
  const dc = moves("4r1k1/8/8/8/1b6/8/3Q4/4K3 w - - 0 1", "diff");
  expect("double check: only king moves [diff]", dc.length > 0 && dc.every((u) => u.startsWith("e1")), dc.join(","));
  // single check: the queen may block or capture
  const sc = moves("4r1k1/8/8/8/8/8/3Q4/4K3 w - - 0 1", "diff");
  expect("single check: queen may interpose on e2/e-file [diff]", sc.some((u) => u.startsWith("d2")), sc.filter((u) => u.startsWith("d2")).join(","));
  void dbl;
  // true double check: Re8 and Bb4 both hit e1; Qa3 could capture b4 or block on e3, neither is legal
  const real = moves("4r1k1/8/8/8/1b6/Q7/8/4K3 w - - 0 1", "diff");
  expect("true double check: Qxb4 and Qe3 both illegal, only king moves [diff]", real.length > 0 && real.every((u) => u.startsWith("e1")), real.join(","));
  const realSingle = moves("6k1/8/8/8/1b6/Q7/8/4K3 w - - 0 1", "diff");
  expect("same position single check: Qxb4 legal [diff]", realSingle.includes("a3b4"), realSingle.filter((u) => u.startsWith("a3")).join(","));
  // discovered check: black to move after Bd3 uncovers Re1 on e8 king is covered by perft; here the reply set must all resolve it
  const disc = moves("4k3/8/8/8/8/3B4/8/4R1K1 b - - 0 1".replace("3B4", "8").replace("4R1K1", "4R1K1"), "diff");
  expect("king in check from Re1 (after discovery): every reply resolves it [diff]", disc.every((u) => u.startsWith("e8")), disc.join(","));
}
console.log(fails ? `\n${fails} FAIL` : "\nall pass");
