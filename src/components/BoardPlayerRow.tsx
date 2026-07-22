"use client";

import { BoardState, Color } from "@/engine/types";
import { Piece } from "@/components/Pieces";
import { capturedPiecesFor, capturedValue, opponentOf } from "@/lib/material";
import { PlayerAvatar } from "@/components/PlayerAvatar";

interface Props {
  board: BoardState;
  playerColor: Color;
  myColor: Color;
  name: string;
  elo?: number | null;
  avatar?: string | null;
  className?: string;
  // Whether the name links to the player's profile. True for spectator/replay
  // rows (watching or reviewing a finished game); false in the viewer's OWN
  // active game, where a click must not leave the board mid-play.
  linkProfile?: boolean;
  // Live socket state for this seat, when the caller knows it: a small dot
  // beside the name (green = connected, red = disconnected). Omitted = no dot.
  connected?: boolean | null;
}

export function BoardPlayerRow({ board, playerColor, myColor, name, elo, avatar, className = "", linkProfile = true, connected = null }: Props) {
  const pieces = capturedPiecesFor(board, playerColor);
  const mineValue = capturedValue(capturedPiecesFor(board, myColor));
  const opponentValue = capturedValue(capturedPiecesFor(board, opponentOf(myColor)));
  const playerValue = playerColor === myColor ? mineValue : opponentValue;
  const otherValue = playerColor === myColor ? opponentValue : mineValue;
  const delta = playerValue - otherValue;
  const isMe = playerColor === myColor;
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const isNamed = name !== "Anonymous" && name !== "You";
  const showLink = linkProfile && isNamed;

  return (
    <div className={`flex min-h-[3.25rem] items-center gap-3 px-2 py-2 sm:px-6 ${className}`}>
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex min-w-[8.5rem] items-center gap-2 px-0 py-2">
          {isNamed ? (
            <PlayerAvatar name={name} avatar={avatar} size={32} />
          ) : (
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
          )}
          <div className="min-w-0">
            <div className="truncate font-display text-sm font-semibold text-parchment">
              {showLink ? (
                // Opens in a new tab so following a player never abandons the
                // board being watched (spectator / replay rows only).
                <a
                  href={`/u/${encodeURIComponent(name)}`}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex min-h-[44px] items-center align-middle sm:min-h-0 hover:text-gold-leaf hover:underline transition-colors"
                >
                  {name}
                </a>
              ) : (
                name
              )}
              {typeof elo === "number" && (
                <span className="text-parchment-400"> ({Math.round(elo)})</span>
              )}
              {connected !== null && (
                <span
                  aria-label={connected ? "Connected" : "Disconnected"}
                  title={connected ? "Connected" : "Disconnected"}
                  className={
                    "ml-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full align-middle " +
                    (connected ? "bg-[rgb(var(--pos-rgb))]" : "bg-oxblood-glow")
                  }
                />
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
