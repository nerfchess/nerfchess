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
// One implementation for the whole app, in @/lib/useReducedMotion: any of an
// explicit `force` from the caller, the in-app animations-off switch
// (html[data-anim="off"]), or the OS prefers-reduced-motion setting when the
// player opted into honoring it (Settings "Follow system motion", default off
// so card plays stay visible; docs section 10). Re-exported here so the
// passive components' imports are
// unchanged. The components render their static fallback whenever it is true;
// the CSS also hard-stops keyframes independently.
// ---------------------------------------------------------------------------

export { useReducedMotion } from "@/lib/useReducedMotion";
