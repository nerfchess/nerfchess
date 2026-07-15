// PassivePulse: the trigger pulse (lifecycle stage 4, docs section 7.4).
//
// A 200ms pulseRing on the affected target when the passive rejects or alters
// an action. For rejections the wiring layer additionally plays the existing
// invalid-input shake on the input square; that is not this component's job.
// Hidden passives have pulseKey "none" and render nothing opponent-facing.
//
// Props contract (for the wiring phase): PassiveLifecycleProps plus a `nonce`
// that changes on every trigger so the same mounted component can replay the
// pulse (a new nonce restarts the animation). onDone fires after 200ms.

"use client";

import * as React from "react";
import type { PassiveLifecycleProps } from "./contract";
import { squareCenter } from "./contract";
import { getPassiveVisual } from "./registry";
import { PRIMITIVES } from "./primitives";
import { useReducedMotion } from "./runtime";

const PULSE_MS = 200;

export interface PassivePulseProps extends PassiveLifecycleProps {
  /** Changes on each trigger to restart the pulse. */
  nonce?: number | string;
  onDone?: () => void;
}

export function PassivePulse({
  cardId,
  cardFamily,
  targetSquares,
  boardMetrics,
  reduced,
  colorHexOverride,
  nonce,
  onDone,
}: PassivePulseProps): React.ReactElement | null {
  const visual = getPassiveVisual(cardId, cardFamily);
  const isReduced = useReducedMotion(reduced);
  const onDoneRef = React.useRef(onDone);
  React.useEffect(() => {
    onDoneRef.current = onDone;
  });

  React.useEffect(() => {
    if (!visual || visual.pulseKey === "none") return;
    const t = window.setTimeout(() => onDoneRef.current?.(), PULSE_MS);
    return () => window.clearTimeout(t);
  }, [visual, nonce]);

  if (!visual || visual.pulseKey === "none") return null;

  const hex = colorHexOverride ?? visual.color;
  const Pulse = PRIMITIVES.pulseRing;
  const squares = targetSquares.length > 0 ? targetSquares : [null];

  return (
    <div className="pfx-pulse-layer" data-card={cardId} data-nonce={nonce} aria-hidden>
      {squares.map((sq, i) => {
        const box =
          sq === null
            ? ({ position: "absolute", inset: 0 } as React.CSSProperties)
            : (() => {
                const c = squareCenter(sq, boardMetrics);
                return {
                  position: "absolute",
                  left: c.x - boardMetrics.squarePx / 2,
                  top: c.y - boardMetrics.squarePx / 2,
                  width: boardMetrics.squarePx,
                  height: boardMetrics.squarePx,
                } as React.CSSProperties;
              })();
        return (
          <span key={sq ?? `board-${i}`} className="pfx-anchor" style={box}>
            <Pulse color={hex} durationMs={PULSE_MS} maxNodes={1} reduced={isReduced} />
          </span>
        );
      })}
    </div>
  );
}

export default PassivePulse;
