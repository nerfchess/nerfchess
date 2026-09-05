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
  //
  // The initializer only READS; the global set is marked from an effect. A
  // `useState` initializer must be pure, and this one used to mutate module
  // state — exactly what `reactStrictMode: true` exists to surface. On
  // StrictMode's simulated unmount/remount the second pass saw the id already
  // marked, returned false, and the effect below then never scheduled
  // `onDone`, so SpawnRunner's queue head never cleared and every later spawn
  // piled up behind it forever. useState still latches the decision for this
  // instance's whole life; the fire-immediately branch below makes the queue
  // robust even when `play` is false for any other reason.
  const [play] = React.useState<boolean>(() => !hasPlayedActivation(id));
  React.useEffect(() => {
    if (play) markActivationPlayed(id);
  }, [play, id]);

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
    if (!visual) return;
    // Nothing to animate (no visual, or this activation already played): report
    // done IMMEDIATELY rather than returning silently. SpawnRunner advances its
    // queue only on this callback, so a spawn that renders nothing and reports
    // nothing wedges the head forever and every later spawn queues behind it.
    if (!play) {
      onDoneRef.current?.();
      return;
    }
    const ms = isReduced ? Math.min(160, duration) : duration;
    const t = window.setTimeout(() => onDoneRef.current?.(), ms);
    return () => window.clearTimeout(t);
  }, [play, visual, isReduced, duration]);

  if (!visual || !play) return null;

  const hex = colorHexOverride ?? visual.color;
  const squares = targetSquares.length > 0 ? targetSquares : null;

  // The reveal-variant spawn (docs section 9) is a nerf's big entrance moment:
  // the same composition, but the whole anchor presses into the board with a
  // physical compress-overshoot-settle (pfx-reveal-press). CSS-only, so the
  // StrictMode-safe play/dedupe logic and onDone timing above are untouched.
  const isReveal = String(activationPly) === "reveal";
  const rootClass = isReveal && !isReduced ? "pfx-spawn pfx-spawn-reveal" : "pfx-spawn";
  const durVar = { ["--pfx-d"]: `${duration}ms`, ["--pfx-c"]: hex } as React.CSSProperties & Record<string, string>;

  // Spawn chrome (tell / strike / settle, docs section 7.1): four presentational
  // nodes per anchor that choreograph the composition's arrival in the visual's
  // own hue. A soft under-bloom tells and then decays out slower than it came,
  // one crisp announce ring expands as the composition lands, and two mote
  // flecks rise off the landing. CSS-only and inside the spawn duration budget,
  // so play/dedupe/onDone timing above are untouched. Under reduced motion the
  // spawn is already the 160ms fade + static sigil; chrome renders nothing.
  const chrome = isReduced ? null : (
    <>
      <span className="pfx-chrome pfx-chrome-bloom" />
      <span className="pfx-chrome pfx-chrome-ring" />
      <span className="pfx-chrome pfx-chrome-mote pfx-chrome-mote-a" />
      <span className="pfx-chrome pfx-chrome-mote pfx-chrome-mote-b" />
    </>
  );

  return (
    <div className={rootClass} data-card={cardId} aria-hidden>
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
                  ...durVar,
                }}
              >
                {chrome}
                <CompositionLayers
                  composition={visual.composition}
                  color={hex}
                  durationMs={duration}
                  maxNodes={visual.maxNodes}
                  reduced={isReduced}
                  cue={visual.cue}
                />
              </span>
            );
          })
        : (
          <span className="pfx-anchor pfx-anchor-board" style={{ position: "absolute", inset: 0, ...durVar }}>
            {chrome}
            <CompositionLayers
              composition={visual.composition}
              color={hex}
              durationMs={duration}
              maxNodes={visual.maxNodes}
              reduced={isReduced}
              cue={visual.cue}
            />
          </span>
        )}
    </div>
  );
}

export default PassiveSpawn;
