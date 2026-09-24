"use client";

import { useEffect, useState } from "react";

import { lowTimeMotionHeld } from "@/lib/lowTimeMotion";
import { loadSettings } from "@/lib/settings";

/**
 * Whether motion should be suppressed right now.
 *
 * ALWAYS use this, never framer-motion's `useReducedMotion`. Theirs reads only
 * `(prefers-reduced-motion: reduce)` and is blind to the in-app Settings →
 * Animations switch (`html[data-anim="off"]`). Six components imported theirs,
 * so turning animations off in Settings stopped the CSS layer (globals.css has
 * a `html[data-anim="off"] *` backstop) while every framer-motion animation
 * kept running: the draft overlay still held cards unusable for its 900ms deal,
 * still 3D-spun them, still flew them across the viewport, and the game-over
 * panel still spring-popped. Half-animated is worse than either mode.
 *
 * It is also live in both directions: a MutationObserver on `data-anim` and a
 * media-query listener, so flipping the setting mid-session takes effect at
 * once (framer-motion's captures its value at mount).
 *
 * @param force overrides detection entirely; pass when a parent already knows.
 * @param opts.ignoreLowTimeHold read the player's own setting through the
 *   low-time hold (src/lib/lowTimeMotion.ts). Only for a surface that exists
 *   because the game ended, which is what ends the hold: the result screen
 *   mounts in the same commit that releases it and must not take its first
 *   frame from the scramble's "off".
 */
export function useReducedMotion(
  force?: boolean,
  opts?: { ignoreLowTimeHold?: boolean },
): boolean {
  const ignoreHold = !!opts?.ignoreLowTimeHold;
  // Initial value is read during render (via the useState initializer).
  const [detected, setDetected] = useState<boolean>(() => detectReduced(ignoreHold));
  useEffect(() => {
    if (force !== undefined) return;
    const update = () => setDetected(detectReduced(ignoreHold));
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-anim"] });
    // Read once more now that we are subscribed. The attribute can flip
    // between render and this effect (a sibling's effect in the same commit
    // releases the low-time hold when the game ends), and a MutationObserver
    // attached after that write never hears of it, which left the game-over
    // panel stuck in its motion-off branch for the whole ending (F204).
    update();
    return () => {
      mq.removeEventListener("change", update);
      observer.disconnect();
    };
  }, [force, ignoreHold]);
  return force ?? detected;
}

/** Reduced motion is any of: the in-app switch, or the OS preference when the
 *  user opted into honoring it (Settings → "Follow system motion", default
 *  off — card plays are gameplay information, so they run by default even on
 *  devices that ask apps to reduce motion). Once applyUiPrefs has stamped
 *  html[data-anim] it already folded all of that in, so the attribute alone is
 *  authoritative; the settings read below only covers the pre-stamp window. */
export function detectReduced(ignoreLowTimeHold = false): boolean {
  if (typeof window === "undefined") return false;
  const anim = document.documentElement.getAttribute("data-anim");
  // Under the hold the attribute says "off" whatever the player chose, so a
  // caller that looks through the hold falls back to the settings below.
  if (anim && !(ignoreLowTimeHold && lowTimeMotionHeld())) return anim === "off";
  const s = loadSettings();
  if (s.reducedMotion || s.animationSpeed === "off") return true;
  return s.followSystemMotion && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
