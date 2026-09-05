"use client";

import { useEffect, useState } from "react";
import type { NerfGame } from "@/engine/game";
import type { Move } from "@/engine/types";
import { computeMoveRisks, type MoveRisk } from "@/engine/moveSafety";

/**
 * The move-risk dots (self-loss / walks-into-check warnings) cost a full
 * makeMove + buff-aware check test PER LEGAL MOVE, which used to run inside the
 * render that lands the opponent's move: the exact frame the player is about
 * to click on. The dots are advisory, so they are computed AFTER that frame
 * paints, in an idle callback, and arrive a few milliseconds later. The board
 * never waits on them.
 *
 * Returns undefined while disabled, while it is not our turn, and for the
 * one frame before the idle pass lands.
 */
export function useDeferredMoveRisks(
  game: NerfGame | null | undefined,
  moves: Move[],
  enabled: boolean,
): Map<string, MoveRisk> | undefined {
  const [risks, setRisks] = useState<{ game: NerfGame; risks: Map<string, MoveRisk> } | null>(null);

  useEffect(() => {
    if (!enabled || !game) return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const out = computeMoveRisks(game, moves);
      if (!cancelled) setRisks({ game, risks: out });
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(run, { timeout: 120 });
      return () => {
        cancelled = true;
        w.cancelIdleCallback?.(id);
      };
    }
    const id = window.setTimeout(run, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [game, moves, enabled]);

  if (!enabled || !game || !risks || risks.game !== game) return undefined;
  return risks.risks;
}
