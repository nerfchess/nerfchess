import { fenToBoard } from "../../../../../src/lib/fen";
import { capturedPiecesFor, capturedValue } from "../../../../../src/lib/material";
// Plain chess: white's a-pawn promoted to a queen on a8 square that was empty (black a8 rook moved off via... simplify: black rook on b-file gone? no) - pure promotion, nothing captured by either side.
const fen = "Q1bqkbnr/1ppppppp/r1n5/8/8/8/1PPPPPPP/RNBQKBNR b KQk - 0 1";
const b = fenToBoard(fen)!;
const cnt=(c:string)=>b.pieces.filter(p=>p?.color===c).map(p=>p!.type).sort().join("");
console.log("white", cnt("w"), "black", cnt("b"));
const w=capturedPiecesFor(b,"w"), k=capturedPiecesFor(b,"b");
console.log("white captured", w, capturedValue(w), "black captured", k, capturedValue(k));
