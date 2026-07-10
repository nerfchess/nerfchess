"use client";

import { useSyncExternalStore } from "react";

// One small site-wide switch: "hide effects/animations" (the little eye
// button beside the board). When ON, the decorative layers stand down —
// signature choreographies, cast spectacles, splashes, empower shine,
// motif badges and the hover effect popover — while every FUNCTIONAL read
// (freeze tint, shield ring, stun swirl, check red) stays, so hiding the
// show never hides the rules.

const KEY = "nc-fx-hidden";
const EVENT = "nc-fx-toggle";

export function fxHidden(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setFxHidden(hidden: boolean) {
  try {
    if (hidden) window.localStorage.setItem(KEY, "1");
    else window.localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Reactive read of the hide-effects switch (SSR-safe: false on the server). */
export function useFxHidden(): boolean {
  return useSyncExternalStore(subscribe, fxHidden, () => false);
}
