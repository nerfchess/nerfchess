"use client";

import { useMemo } from "react";
import { Piece } from "./Pieces";
import type { Color, PieceType } from "@/engine/types";

// A quiet, non-interactive board for the landing hero. It shows a real
// position (Giuoco Piano, after 3...Bc5) so the page reads as "a game in
// progress" the instant it loads — the board sells the site, not copy.
// White is at the bottom; cells are laid out rank 8 → 1, file a → h, which
// matches FEN reading order exactly, so we can render straight from the FEN.
const FEN = "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R";

// Row-major indices (row 0 = rank 8, col 0 = file a) of black's last move,
// Bf8–c5, so the board carries a lit last-move trail like a live game.
const LAST_MOVE = new Set([5, 26]);

type Cell = { type: PieceType; color: Color } | null;

function parseFen(fen: string): Cell[] {
  const cells: Cell[] = [];
  for (const ch of fen) {
    if (ch === "/") continue;
    if (ch >= "1" && ch <= "8") {
      for (let i = 0; i < Number(ch); i++) cells.push(null);
    } else {
      const color: Color = ch === ch.toUpperCase() ? "w" : "b";
      cells.push({ type: ch.toLowerCase() as PieceType, color });
    }
  }
  return cells;
}

export function HeroBoard() {
  const cells = useMemo(() => parseFen(FEN), []);

  return (
    <div className="w-full max-w-[560px] mx-auto aspect-square border border-black/50 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.85)]">
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full" aria-hidden>
        {cells.map((cell, i) => {
          const row = Math.floor(i / 8);
          const col = i % 8;
          const isLight = (row + col) % 2 === 0;
          const file = "abcdefgh"[col];
          const rank = 8 - row;
          return (
            <div
              key={i}
              className={
                "relative flex items-center justify-center " +
                (isLight ? "sq-light" : "sq-dark") +
                (LAST_MOVE.has(i) ? " sq-last" : "")
              }
            >
              {cell && (
                <div className="w-[86%] h-[86%]">
                  <Piece type={cell.type} color={cell.color} size="100%" />
                </div>
              )}
              {col === 0 && (
                <span
                  className={
                    "absolute top-0.5 left-1 text-[10px] font-mono font-semibold pointer-events-none " +
                    (isLight ? "text-[#4a3826]" : "text-[#eeeed2]/85")
                  }
                >
                  {rank}
                </span>
              )}
              {row === 7 && (
                <span
                  className={
                    "absolute bottom-0.5 right-1 text-[10px] font-mono font-semibold pointer-events-none " +
                    (isLight ? "text-[#4a3826]" : "text-[#eeeed2]/85")
                  }
                >
                  {file}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
