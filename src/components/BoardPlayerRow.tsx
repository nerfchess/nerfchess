"use client";

import { BoardState, Color } from "@/engine/types";
import { Piece } from "@/components/Pieces";
import { capturedPiecesFor, capturedValue, opponentOf } from "@/lib/material";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useSettingsValue } from "@/lib/useSettingsValue";

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
  const { showCaptured, showRatings } = useSettingsValue();
  const pieces = showCaptured ? capturedPiecesFor(board, playerColor) : [];
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
    // Phone: Lichess's column-one bar, name over material in ~2.75rem with the
    // clock beside it. From sm up the same row spreads out to the desktop
    // height. Material never wraps: the row cannot grow mid-game and push the
    // board around, the pieces just overlap tighter.
    <div className={`flex min-h-[2.75rem] items-center gap-2 px-2 py-1 sm:min-h-[3.25rem] sm:gap-3 sm:py-2 sm:px-6 ${className}`}>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {isNamed ? (
          <span className="hidden sm:block">
            <PlayerAvatar name={name} avatar={avatar} size={32} />
          </span>
        ) : (
          <div
            className={
              "hidden h-8 w-8 shrink-0 place-items-center rounded-md border font-display text-xs font-semibold sm:grid " +
              (isMe
                ? "border-gold/60 bg-gold/20 text-gold-leaf"
                : "border-bruise/60 bg-bruise/20 text-bruise-glow")
            }
            aria-hidden="true"
          >
            {initial}
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-3">
          <div className="min-w-0 truncate font-display text-[14px] font-semibold leading-tight text-parchment sm:min-w-[7rem] sm:text-sm">
            {showLink ? (
              // Opens in a new tab so following a player never abandons the
              // board being watched (spectator / replay rows only).
              <a
                href={`/u/${encodeURIComponent(name)}`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center align-middle hover:text-gold-leaf hover:underline transition-colors"
              >
                {name}
              </a>
            ) : (
              name
            )}
            {typeof elo === "number" && showRatings && (
              <span className="font-normal text-parchment-400"> {Math.round(elo)}</span>
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

          <div className="flex h-5 min-w-0 items-center overflow-hidden sm:h-auto">
            <div className="flex min-w-0 flex-nowrap items-center">
              {pieces.map((piece, index) => (
                <div
                  key={`${piece}-${index}`}
                  className={
                    "h-4 w-4 shrink-0 [&>svg]:h-full [&>svg]:w-full sm:h-[22px] sm:w-[22px] " +
                    (index > 0 && pieces[index - 1] === piece ? "-ml-[9px] sm:-ml-[15px]" : "")
                  }
                >
                  <Piece type={piece} color={opponentOf(playerColor)} size={22} className="opacity-90" />
                </div>
              ))}
            </div>
            {showCaptured && delta > 0 && (
              <div className="ml-1 shrink-0 font-mono text-[13px] font-semibold text-white sm:text-sm">
                +{delta}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
