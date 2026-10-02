// Repro: BoardPlayerRow's captured list and "+N" come from lib/material.ts,
// which infers captures from pieces missing vs the START set. Any position
// where a side has MORE of a type than it started with (promotion, card
// summons/transforms) reports a wrong capture list and a wrong material sign.
import { fenToBoard } from "../../../../../src/lib/fen";
import { capturedPiecesFor, capturedValue } from "../../../../../src/lib/material";

function rowFor(fen: string, label: string, truth: string) {
  const board = fenToBoard(fen)!;
  const capW = capturedPiecesFor(board, "w");
  const capB = capturedPiecesFor(board, "b");
  const vW = capturedValue(capW), vB = capturedValue(capB);
  // Same arithmetic as BoardPlayerRow: delta shown on a row = its captured value - the other's
  console.log(`\n${label}\n  fen ${fen}\n  white row: captured [${capW.join(",")}] ${vW - vB > 0 ? "+" + (vW - vB) : ""}`);
  console.log(`  black row: captured [${capB.join(",")}] ${vB - vW > 0 ? "+" + (vB - vW) : ""}`);
  // On-board material (lichess approach) for comparison
  const val: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let w = 0, b = 0;
  for (const p of board.pieces) if (p) (p.color === "w" ? (w += val[p.type]) : (b += val[p.type]));
  console.log(`  on-board material: white ${w}, black ${b} -> true diff ${w - b > 0 ? "white +" + (w - b) : w < b ? "black +" + (b - w) : "even"}  (${truth})`);
}

// 1. White promoted a pawn to a queen; NO capture has happened.
rowFor("rnbqkbnr/pppppppp/8/8/8/8/1PPPPPPP/RNBQKBNR w KQkq - 0 1".replace("8/8/8/8/1PPPPPPP", "8/8/8/8/1PPPPPPP"), "control: white is just missing the a-pawn (captured by black)", "black really is +1");
rowFor("Qnbqkbnr/1ppppppp/8/8/8/8/1PPPPPPP/RNBQKBNR b KQkq - 0 1".replace("Qnbqkbnr/1ppppppp","Qnbqkbnr/pppppppp").replace("rnbqkbnr","rnbqkbnr"), "white a-pawn promoted to Q on a8 after black's a8 rook was taken", "white is up");
// Cleaner: white's a-pawn promoted to a queen on a-file empty square, nothing captured.
rowFor("rnbqkbnr/pppppppp/8/8/8/8/1PPPPPPP/RNBQKBNR w KQkq - 0 1", "white missing a pawn only", "");
rowFor("1nbqkbnr/pppppppp/8/8/8/8/1PPPPPPP/QNBQKBNR w Kk - 0 1", "white's a-pawn became a 2nd queen (shown on a1 for simplicity); black lost the a8 rook", "white +13: up a rook and pawn->queen");
// 2. A card summoned an extra white rook (no capture at all).
rowFor("rnbqkbnr/pppppppp/8/8/3R4/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "card summoned an extra white rook on d4, no captures", "white +5");
// 3. A card transformed a white knight into a queen (no capture).
rowFor("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RQBQKBNR w KQkq - 0 1", "card turned white's b1 knight into a queen, no captures", "white +6");
