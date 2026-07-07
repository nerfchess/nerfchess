"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Piece } from "./Pieces";
import type { Color, PieceType } from "@/engine/types";

const PIECE_LABEL: Record<PieceType, string> = {
  p: "Pawn",
  n: "Knight",
  b: "Bishop",
  r: "Rook",
  q: "Queen",
  k: "King",
};

export interface PocketEntry {
  type: PieceType;
  count: number;
}

interface Props {
  /** The viewer's banked pieces (count > 0). Empty renders nothing. */
  entries: PocketEntry[];
  /** Whose pieces these are: the tray always shows the viewer's own colour. */
  color: Color;
  /** The piece type currently armed for a drop (drop mode), or null. */
  activeType: PieceType | null;
  /** Whether a drop can be started right now (viewer's own turn, nothing
   * pending). Off = the tray reads but the pieces are not clickable. */
  canDrop: boolean;
  /** Toggle drop mode for a pocket piece; the same type again cancels. */
  onSelect: (type: PieceType) => void;
}

/**
 * Crazyhouse-style pocket tray for the viewer. Lists each banked piece type
 * with its count using the board's own piece art; clicking one arms a drop, and
 * the board then highlights every square where that drop is legal (via the
 * shared pickSquares plumbing). Renders nothing when the pocket is empty.
 *
 * Look: 1px corners, no gradients/glow. Mint marks the armed / actionable
 * piece; the count chip rides in coral so it reads at a glance.
 */
export function Pocket({ entries, color, activeType, canDrop, onSelect }: Props) {
  const reduceMotion = useReducedMotion();
  if (entries.length === 0) return null;
  return (
    <div className="plate flex items-center gap-2 rounded-[1px] px-2 py-1.5">
      <span className="smallcaps shrink-0 text-[10px] text-parchment-400">Pocket</span>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {entries.map(({ type, count }) => {
          const active = activeType === type;
          return (
            <motion.button
              key={type}
              type="button"
              whileTap={reduceMotion ? undefined : { scale: 0.9 }}
              onClick={() => onSelect(type)}
              disabled={!canDrop && !active}
              aria-pressed={active}
              title={
                canDrop || active
                  ? active
                    ? `Cancel ${PIECE_LABEL[type]} drop`
                    : `Drop a ${PIECE_LABEL[type]}`
                  : "Your turn only"
              }
              className={
                "relative flex h-10 w-10 items-center justify-center rounded-[1px] border transition-colors duration-100 " +
                (active
                  ? "border-mint/70 bg-mint/15 "
                  : canDrop
                  ? "cursor-pointer border-white/12 bg-white/[0.03] hover:border-mint/45 hover:bg-mint/10 "
                  : "cursor-not-allowed border-white/10 bg-white/[0.02] opacity-60 ")
              }
            >
              {active && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-[1px] ring-1 ring-inset ring-mint/70 animate-flicker"
                />
              )}
              <Piece type={type} color={color} size={30} />
              <span
                className={
                  "absolute -bottom-1 -right-1 min-w-[14px] rounded-[1px] border px-1 py-px text-center font-mono text-[9px] font-bold tabular-nums " +
                  (active
                    ? "border-mint/60 bg-ink-950 text-mint-glow"
                    : "border-coral/45 bg-ink-950 text-coral-glow")
                }
              >
                {count}
              </span>
            </motion.button>
          );
        })}
      </div>
      {activeType && (
        <span className="smallcaps ml-auto hidden shrink-0 text-[9px] text-mint-glow sm:block">
          Pick a square · Esc
        </span>
      )}
    </div>
  );
}
