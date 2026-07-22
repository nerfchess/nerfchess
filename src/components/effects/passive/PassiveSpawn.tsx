// PassiveSpawn: the spawn intro (lifecycle stage 1, docs section 7).
//
// Plays the card's unique composition ONCE per activation. Activation identity
// is `cardId:color:activationPly`, deduped in a session set so re-renders,
// reconnects, and takeback re-derives never replay it (section 7.1). Under
// reduced motion it collapses to the 160ms fade + static sigil.
//
// Props contract (for the wiring phase): extends PassiveLifecycleProps with the
// activation ply that stamps the dedupe key, and an optional onDone fired when
// the intro's duration budget elapses (the caller then unmounts it, leaving the
// persistent PassiveAura in place). This component renders nothing after its
// one play; it never loops.

"use client";

import * as React from "react";
import type { PassiveLifecycleProps } from "./contract";
import { squareCenter } from "./contract";
import { getPassiveVisual } from "./registry";
import { CompositionLayers } from "./primitives";
import { activationId, hasPlayedActivation, markActivationPlayed, useReducedMotion } from "./runtime";
import { playPassiveCue } from "@/lib/sounds";

export interface PassiveSpawnProps extends PassiveLifecycleProps {
  /** Ply at which this activation happened; stamps the dedupe key. */
  activationPly: number | string;
  /** Fired once the spawn duration budget elapses. */
  onDone?: () => void;
}

export function PassiveSpawn({
  cardId,
  cardFamily,
  color,
  targetSquares,
  boardMetrics,
  reduced,
  colorHexOverride,
  activationPly,
  onDone,
}: PassiveSpawnProps): React.ReactElement | null {
  const visual = getPassiveVisual(cardId, cardFamily);
  const isReduced = useReducedMotion(reduced);
  const id = activationId(cardId, color, activationPly);

  // Decide once, at mount, whether this activation still needs to play.
  const [play] = React.useState<boolean>(() => {
    if (hasPlayedActivation(id)) return false;
    markActivationPlayed(id);
    return true;
  });

  const onDoneRef = React.useRef(onDone);
  React.useEffect(() => {
    onDoneRef.current = onDone;
  });
  const duration = visual?.spawnDurationMs ?? 0;

  // Play the effect's family sound cue exactly once, when its aura first
  // appears. `play` already gates on the per-activation dedupe, and the ref
  // guard makes this immune to the re-renders that recreate `visual`'s
  // identity, so a card is voiced once per activation and never on a replay,
  // reconnect, or hover-driven rerender. One shot on spawn, never a loop.
  const cuePlayedRef = React.useRef(false);
  React.useEffect(() => {
    if (!play || !visual || cuePlayedRef.current) return;
    cuePlayedRef.current = true;
    // Per-card audio fingerprint: the family voice plus this card's own
    // pitch/timbre/timing variation (see cueVariation in sounds.ts).
    playPassiveCue(visual.soundCue, cardId);
  }, [play, visual, cardId]);

  React.useEffect(() => {
    if (!play || !visual) return;
    const ms = isReduced ? Math.min(160, duration) : duration;
    const t = window.setTimeout(() => onDoneRef.current?.(), ms);
    return () => window.clearTimeout(t);
  }, [play, visual, isReduced, duration]);

  if (!visual || !play) return null;

  const hex = colorHexOverride ?? visual.color;
  const squares = targetSquares.length > 0 ? targetSquares : null;

  return (
    <div className="pfx-spawn" data-card={cardId} aria-hidden>
      {squares
        ? squares.map((sq) => {
            const c = squareCenter(sq, boardMetrics);
            return (
              <span
                key={sq}
                className="pfx-anchor"
                style={{
                  position: "absolute",
                  left: c.x - boardMetrics.squarePx / 2,
                  top: c.y - boardMetrics.squarePx / 2,
                  width: boardMetrics.squarePx,
                  height: boardMetrics.squarePx,
                }}
              >
                <CompositionLayers
                  composition={visual.composition}
                  color={hex}
                  durationMs={duration}
                  maxNodes={visual.maxNodes}
                  reduced={isReduced}
                />
              </span>
            );
          })
        : (
          <span className="pfx-anchor pfx-anchor-board" style={{ position: "absolute", inset: 0 }}>
            <CompositionLayers
              composition={visual.composition}
              color={hex}
              durationMs={duration}
              maxNodes={visual.maxNodes}
              reduced={isReduced}
            />
          </span>
        )}
    </div>
  );
}

export default PassiveSpawn;
