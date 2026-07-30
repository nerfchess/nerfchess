"use client";

import { useEffect, useState } from "react";

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
 */
export function useReducedMotion(force?: boolean): boolean {
  // Initial value is read during render (via the useState initializer), so no
  // synchronous setState is needed in the effect; the effect only subscribes to
  // later changes when the caller is not controlling the value with `force`.
  const [detected, setDetected] = useState<boolean>(detectReduced);
  useEffect(() => {
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

/** Reduced motion is any of: the in-app switch, or the OS preference. */
export function detectReduced(): boolean {
  if (typeof window === "undefined") return false;
  const anim = document.documentElement.getAttribute("data-anim");
  if (anim === "off") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
