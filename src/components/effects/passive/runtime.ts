// Shared runtime helpers for the passive lifecycle components.

import * as React from "react";

// ---------------------------------------------------------------------------
// Activation dedupe.
//
// A spawn intro plays once per activation, keyed by the stable activation id
// `cardId:color:activationPly` (docs section 7.1). The set is session-scoped so
// re-renders, reconnects, and takeback re-derives never replay an intro. The
// wiring layer supplies the activation id; tests and the dev gallery can clear
// the set to force a replay.
// ---------------------------------------------------------------------------

const playedActivations = new Set<string>();

export function activationId(cardId: string, color: string, activationPly: number | string): string {
  return `${cardId}:${color}:${activationPly}`;
}

export function hasPlayedActivation(id: string): boolean {
  return playedActivations.has(id);
}

export function markActivationPlayed(id: string): void {
  playedActivations.add(id);
}

/** Clear the dedupe set. For the dev gallery and tests only. */
export function resetPassiveActivations(): void {
  playedActivations.clear();
}

// ---------------------------------------------------------------------------
// Reduced-motion detection.
//
// Reduced motion is any of: an explicit `force` from the caller, the in-app
// animations-off switch (html[data-anim="off"]), or the OS prefers-reduced-
// motion setting (docs section 10). The components render their static fallback
// whenever this is true; the CSS also hard-stops keyframes independently.
// ---------------------------------------------------------------------------

function detectReduced(): boolean {
  if (typeof window === "undefined") return false;
  const anim = document.documentElement.getAttribute("data-anim");
  if (anim === "off") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useReducedMotion(force?: boolean): boolean {
  // Initial value is read during render (via the useState initializer), so no
  // synchronous setState is needed in the effect; the effect only subscribes to
  // later changes when the caller is not controlling the value with `force`.
  const [detected, setDetected] = React.useState<boolean>(detectReduced);
  React.useEffect(() => {
    if (force !== undefined) return;
    const update = () => setDetected(detectReduced());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-anim"] });
    return () => {
      mq.removeEventListener("change", update);
      observer.disconnect();
    };
  }, [force]);
  return force ?? detected;
}
