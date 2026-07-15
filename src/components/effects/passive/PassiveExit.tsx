// PassiveExit: the exit (lifecycle stage 5, docs section 7.5).
//
// A 300ms reverse of the aura: a fade plus one primitive from the composition
// played backwards where natural (chains fall away, embers cool). Glass never
// "un-cracks", so fracture cards exit via shatterExit. The exit treatment is
// chosen from the card's exitKey (derived from its family).
//
// Props contract (for the wiring phase): PassiveLifecycleProps plus onDone,
// fired after the 300ms budget so the caller can unmount both the exit and the
// aura together.

"use client";

import * as React from "react";
import type { PassiveLifecycleProps } from "./contract";
import { squareCenter } from "./contract";
import { getPassiveVisual } from "./registry";
import { PRIMITIVES } from "./primitives";
import { useReducedMotion } from "./runtime";
import "./primitives.css";

const EXIT_MS = 300;

export interface PassiveExitProps extends PassiveLifecycleProps {
  onDone?: () => void;
}

export function PassiveExit({
  cardId,
  cardFamily,
  targetSquares,
  boardMetrics,
  reduced,
  colorHexOverride,
  onDone,
}: PassiveExitProps): React.ReactElement | null {
  const visual = getPassiveVisual(cardId, cardFamily);
  const isReduced = useReducedMotion(reduced);
  const onDoneRef = React.useRef(onDone);
  React.useEffect(() => {
    onDoneRef.current = onDone;
  });

  React.useEffect(() => {
    if (!visual) return;
    const ms = isReduced ? Math.min(160, EXIT_MS) : EXIT_MS;
    const t = window.setTimeout(() => onDoneRef.current?.(), ms);
    return () => window.clearTimeout(t);
  }, [visual, isReduced]);

  if (!visual) return null;

  const hex = colorHexOverride ?? visual.color;
  const shatter = visual.exitKey === "shatterExit";
  const Shatter = PRIMITIVES.shatterExit;
  const squares = targetSquares.length > 0 ? targetSquares : [null];
  const cssColor = { ["--pfx-c"]: hex } as React.CSSProperties & Record<string, string>;

  return (
    <div className="pfx-exit-layer" data-card={cardId} data-exit={visual.exitKey} aria-hidden>
      {squares.map((sq, i) => {
        const box: React.CSSProperties =
          sq === null
            ? { position: "absolute", inset: 0 }
            : (() => {
                const c = squareCenter(sq, boardMetrics);
                return {
                  position: "absolute",
                  left: c.x - boardMetrics.squarePx / 2,
                  top: c.y - boardMetrics.squarePx / 2,
                  width: boardMetrics.squarePx,
                  height: boardMetrics.squarePx,
                };
              })();
        return (
          <span key={sq ?? `board-${i}`} className="pfx-anchor" style={box}>
            {shatter && !isReduced ? (
              <Shatter color={hex} durationMs={EXIT_MS} maxNodes={visual.maxNodes} reduced={isReduced} />
            ) : (
              <span className="pfx pfx-exit" style={cssColor}>
                <span className="pfx-el pfx-exit-el" />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export default PassiveExit;
