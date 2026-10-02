// moveFromUCI (the replica/review raw fallback) infers castling / en passant /
// double-push from geometry alone. Show what it does with buff-shaped moves.
import { moveFromUCI, makeMove } from "../../../../../src/engine/board";
import { fenToBoard, boardToFen } from "../../../../../src/lib/fen";
import { replayUci } from "../../../../../src/lib/gameReview";
const cases: [string, string, string][] = [
  ["king c1->a1 (royal_decree/kingslide style 2-square king slide)", "4k3/8/8/8/8/8/8/2K5 w - - 0 1", "c1a1"],
  ["king e1->g1 with no rights (ivy crown lunge) and rook on h1", "4k3/8/8/8/8/8/8/4K2R w - - 0 1", "e1g1"],
  ["pawn diagonal step onto empty square beside enemy pawn (berolina/half_step)", "4k3/8/8/3pP3/8/8/8/4K3 w - - 0 1", "e5d6"],
  ["pawn 2-square push from rank 3 (little_leap)", "4k3/8/8/8/8/4P3/8/4K3 w - - 0 1", "e3e5"],
];
for (const [label, fen, u] of cases) {
  const b = fenToBoard(fen)!;
  const m = moveFromUCI(b, u)!;
  const after = makeMove(b, m);
  console.log(`${label}\n  ${fen}  ${u}\n  inferred: castle=${m.castle} ep=${m.isEnPassant} dbl=${m.isDoublePawn} cap=${m.captured}@${m.capturedSquare}\n  after: ${boardToFen(after)}`);
}
// review replay: 1.e4 e5 then a (buff-granted) Ke1-g1 style slide is impossible here; use e2e4 d7d5 e4e5 ... + a berolina-style e5d6 with black pawn on d5? Shown above.
const r = replayUci(["e2e4", "d7d5", "e4e5", "d5d4", "e5d6"]);
console.log("replayUci [e4 d5 e5 d4 e5d6(buff diagonal step)]:", boardToFen(r.board));
