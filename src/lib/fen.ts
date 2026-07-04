// FEN import/export for the engine's BoardState. The engine plays a
// king-capture variant, so a parsed position never needs check bookkeeping —
// fields 1–4 map directly onto BoardState and the move counters ride along.

import { BoardState, Color, Piece, PieceType, SQ, parseSquare, squareName } from "@/engine/types";

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const PIECE_LETTERS = new Set(["p", "n", "b", "r", "q", "k"]);

/** Parse a FEN string into a BoardState. Returns null on malformed input. */
export function fenToBoard(fen: string): BoardState | null {
  const fields = fen.trim().split(/\s+/);
  if (fields.length < 2) return null;
  const [placement, turnField, castleField = "-", epField = "-", halfField = "0", fullField = "1"] = fields;

  const ranks = placement.split("/");
  if (ranks.length !== 8) return null;
  const pieces: (Piece | null)[] = new Array(64).fill(null);
  for (let r = 0; r < 8; r++) {
    // FEN lists rank 8 first; our rank 0 is white's back rank.
    const rank = 7 - r;
    let file = 0;
    for (const ch of ranks[r]) {
      if (ch >= "1" && ch <= "8") {
        file += parseInt(ch, 10);
      } else {
        const lower = ch.toLowerCase();
        if (!PIECE_LETTERS.has(lower) || file > 7) return null;
        pieces[SQ(file, rank)] = { type: lower as PieceType, color: ch === lower ? "b" : "w" };
        file++;
      }
    }
    if (file !== 8) return null;
  }

  const turn: Color = turnField === "b" ? "b" : "w";
  const epTarget = /^[a-h][36]$/.test(epField) ? parseSquare(epField) : null;

  return {
    pieces,
    turn,
    castling: {
      wk: castleField.includes("K"),
      wq: castleField.includes("Q"),
      bk: castleField.includes("k"),
      bq: castleField.includes("q"),
    },
    epTarget,
    halfmove: Math.max(0, parseInt(halfField, 10) || 0),
    fullmove: Math.max(1, parseInt(fullField, 10) || 1),
    history: [],
  };
}

export function boardToFen(board: BoardState): string {
  const ranks: string[] = [];
  for (let rank = 7; rank >= 0; rank--) {
    let row = "";
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const p = board.pieces[SQ(file, rank)];
      if (!p) {
        empty++;
        continue;
      }
      if (empty) {
        row += empty;
        empty = 0;
      }
      row += p.color === "w" ? p.type.toUpperCase() : p.type;
    }
    if (empty) row += empty;
    ranks.push(row);
  }
  const castle =
    (board.castling.wk ? "K" : "") +
    (board.castling.wq ? "Q" : "") +
    (board.castling.bk ? "k" : "") +
    (board.castling.bq ? "q" : "");
  const ep = board.epTarget != null ? squareName(board.epTarget) : "-";
  return `${ranks.join("/")} ${board.turn} ${castle || "-"} ${ep} ${board.halfmove} ${board.fullmove}`;
}
