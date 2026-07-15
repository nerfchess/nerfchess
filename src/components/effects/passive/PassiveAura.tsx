// PassiveAura: the persistent aura (lifecycle stage 3, docs section 7 and the
// target-taxonomy auras in section 4).
//
// Active for as long as the passive is live. It is INFORMATION, so it remains
// under reduced motion and animations-off (only its gentle breathe stops); the
// alphas in section 4 are maxima. Auras never cover piece glyphs, coordinates,
// last-move highlight, check marker, targeting reticles, or clocks.
//
// Props contract (for the wiring phase): PassiveLifecycleProps. targetSquares
// carries the squares the aura attaches to (under-piece rings, square/file/rank
// washes, zone tints). For board/clock/movement/capture/winCondition targets
// the aura is a single ambient marker and targetSquares may be empty. Hidden
// targets render nothing.

"use client";

import * as React from "react";
import type { AuraKey } from "./spec";
import type { PassiveLifecycleProps } from "./contract";
import { squareCenter } from "./contract";
import { getPassiveVisual } from "./registry";
import "./primitives.css";

const PER_SQUARE: Record<AuraKey, boolean> = {
  pieceRing: true,
  squareTint: true,
  fileWash: true,
  rankWash: true,
  zoneTint: true,
  boardFrame: false,
  clockAccent: false,
  moveIndicator: true,
  captureMarker: true,
  hudBadge: false,
  none: false,
};

const AURA_CLASS: Record<AuraKey, string> = {
  pieceRing: "pfx-aura-piece",
  squareTint: "pfx-aura-square",
  fileWash: "pfx-aura-file",
  rankWash: "pfx-aura-rank",
  zoneTint: "pfx-aura-zone",
  boardFrame: "pfx-aura-frame",
  clockAccent: "pfx-aura-chip",
  moveIndicator: "pfx-aura-move",
  captureMarker: "pfx-aura-capture",
  hudBadge: "pfx-aura-chip",
  none: "",
};

export function PassiveAura({
  cardId,
  cardFamily,
  targetSquares,
  boardMetrics,
  colorHexOverride,
}: PassiveLifecycleProps): React.ReactElement | null {
  const visual = getPassiveVisual(cardId, cardFamily);
  if (!visual || visual.auraKey === "none") return null;

  const hex = colorHexOverride ?? visual.color;
  const cls = AURA_CLASS[visual.auraKey];
  const perSquare = PER_SQUARE[visual.auraKey];
  const cssColor = { ["--pfx-c"]: hex } as React.CSSProperties & Record<string, string>;

  return (
    <div className="pfx-aura" data-card={cardId} aria-hidden>
      {perSquare && targetSquares.length > 0 ? (
        targetSquares.map((sq) => {
          const c = squareCenter(sq, boardMetrics);
          return (
            <span
              key={sq}
              className={cls}
              style={{
                ...cssColor,
                position: "absolute",
                left: c.x - boardMetrics.squarePx / 2,
                top: c.y - boardMetrics.squarePx / 2,
                width: boardMetrics.squarePx,
                height: boardMetrics.squarePx,
              }}
            />
          );
        })
      ) : (
        <span className={cls} style={{ ...cssColor, position: "absolute", inset: 0 }} />
      )}
    </div>
  );
}

export default PassiveAura;
