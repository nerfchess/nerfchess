"use client";

import { BoardState, Color } from "@/engine/types";
import { Piece } from "@/components/Pieces";
import { capturedPiecesFor, capturedValue, opponentOf } from "@/lib/material";

interface Props {
  board: BoardState;
  playerColor: Color;
  myColor: Color;
  name: string;
  elo?: number | null;
  className?: string;
}

export function BoardPlayerRow({ board, playerColor, myColor, name, elo, className = "" }: Props) {
  const pieces = capturedPiecesFor(board, playerColor);
  const mineValue = capturedValue(capturedPiecesFor(board, myColor));
  const opponentValue = capturedValue(capturedPiecesFor(board, opponentOf(myColor)));
  const playerValue = playerColor === myColor ? mineValue : opponentValue;
  const otherValue = playerColor === myColor ? opponentValue : mineValue;
  const delta = playerValue - otherValue;
  const isMe = playerColor === myColor;
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className={`flex min-h-[3.25rem] items-center gap-3 px-2 py-2 sm:px-6 ${className}`}>
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex min-w-[8.5rem] items-center gap-2 px-0 py-2">
          <div
            className={
              "grid h-8 w-8 shrink-0 place-items-center rounded-md border font-display text-xs font-semibold " +
              (isMe
                ? "border-gold/60 bg-gold/20 text-gold-leaf"
                : "border-bruise/60 bg-bruise/20 text-bruise-glow")
            }
            aria-hidden="true"
          >
            {initial}
          </div>
          <div className="min-w-0">
            <div className="truncate font-display text-sm font-semibold text-parchment">
              {name}
              {typeof elo === "number" && (
                <span className="text-parchment-400"> ({Math.round(elo)})</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center">
          {pieces.map((piece, index) => (
            <div
              key={`${piece}-${index}`}
              className={index > 0 && pieces[index - 1] === piece ? "-ml-[15px]" : ""}
            >
              <Piece
                type={piece}
                color={opponentOf(playerColor)}
                size={22}
                className="opacity-90"
              />
            </div>
          ))}
        </div>

        {delta > 0 && (
          <div className="shrink-0 font-mono text-sm font-semibold text-white">
            +{delta}
          </div>
        )}
      </div>
    </div>
  );
}
