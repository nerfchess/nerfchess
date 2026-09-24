// The chrome motion vocabulary, once, for code that cannot read CSS tokens.
//
// globals.css owns the tokens (--ease-out, --ease-io, --ease-spring, --dur-1..3)
// and the classes built on them (.m-pop, .m-modal, .m-scrim, .m-list, .m-toast,
// .m-chevron, .m-live-dot). This module mirrors the same numbers for framer
// transitions and timers, and installs the one gate every framer animation
// needs: html[data-anim="off"] (which applyUiPrefs also sets for the in-app
// reduced motion switch and, when opted in, the OS preference) makes framer
// jump straight to its final keyframe, exactly like the CSS backstop does for
// transitions and keyframes.
//
// Leaf module: no imports from settings.ts or React, so anything can use it.

import { MotionGlobalConfig } from "framer-motion";

/** Durations in ms, the same values as --dur-1..3 in globals.css. */
export const DUR = { 1: 120, 2: 200, 3: 320 } as const;
export type DurStep = keyof typeof DUR;

/** Cubic bezier control points, the same curves as the --ease-* tokens. */
export const EASE = {
  out: [0.2, 0.8, 0.2, 1],
  io: [0.45, 0.03, 0.52, 0.96],
  spring: [0.2, 1.4, 0.4, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;
export type EaseName = keyof typeof EASE;

/** The Animations setting as stamped on <html>. */
export type AnimMode = "normal" | "fast" | "off";

/** Tempo multiplier per mode. "fast" matches the --tempo token in globals.css. */
export const TEMPO: Record<AnimMode, number> = { normal: 1, fast: 0.6, off: 0 };

/** Current mode. SSR and the pre-stamp window read as "normal"; the pre-paint
 *  script stamps data-anim before first paint, so that window is empty in
 *  practice. */
export function animMode(): AnimMode {
  if (typeof document === "undefined") return "normal";
  const v = document.documentElement.getAttribute("data-anim");
  return v === "off" || v === "fast" ? v : "normal";
}

/** A token duration scaled by the current tempo, in ms (0 with motion off). */
export function dur(step: DurStep): number {
  return Math.round(DUR[step] * TEMPO[animMode()]);
}

/** A framer transition on the token vocabulary. Durations are scaled by the
 *  tempo; with motion off the global gate below already skips the animation,
 *  and the zero duration here keeps a first render consistent too. */
export function framerTransition(step: DurStep, ease: EaseName = "out", delayMs = 0) {
  const t = TEMPO[animMode()];
  return { duration: (DUR[step] * t) / 1000, ease: EASE[ease] as unknown as number[], delay: (delayMs * t) / 1000 };
}

let installed = false;

/** Keep framer-motion in step with html[data-anim]. Idempotent; safe to call
 *  from any client module. With motion off every framer animation (motion.*
 *  props, AnimatePresence exits, useAnimate, animate()) applies its final
 *  keyframe on the next frame instead of running, so no component needs its
 *  own gate for the end state to be right. */
export function installFramerGate(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;
  const sync = () => {
    MotionGlobalConfig.skipAnimations = animMode() === "off";
  };
  sync();
  new MutationObserver(sync).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-anim"],
  });
}

// Importing this module is enough to install the gate.
installFramerGate();
