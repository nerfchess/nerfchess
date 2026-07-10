"use client";

import { useSyncExternalStore } from "react";

// The effects dial beside the board (owner request: a slider for "scale and
// craziness"). Five steps:
//   0 Off    — decorative layers stand down entirely (the old hide switch)
//   1 Calm   — the show plays but quietly: fewer canvas particles, no shake
//   2 Normal — the default, tuned presentation
//   3 Epic   — more particles
//   4 Max    — most particles and a bigger board thump
// FUNCTIONAL reads (freeze tint, shield ring, stun swirl, check red) are never
// touched by this dial at any level, so turning the show down never hides the
// rules. Level 0 keeps the legacy "nc-fx-hidden" key in sync because that flag
// predates the dial and other code (and old tabs) may still read it.

export type FxLevel = 0 | 1 | 2 | 3 | 4;

export const FX_LEVELS = [
  { label: "Off", vfx: 0, shake: "none" },
  { label: "Calm", vfx: 0.6, shake: "none" },
  { label: "Normal", vfx: 1, shake: "normal" },
  { label: "Epic", vfx: 1.25, shake: "normal" },
  { label: "Max", vfx: 1.5, shake: "big" },
] as const satisfies ReadonlyArray<{ label: string; vfx: number; shake: "none" | "normal" | "big" }>;

const LEVEL_KEY = "nc-fx-level";
const LEGACY_HIDDEN_KEY = "nc-fx-hidden";
const EVENT = "nc-fx-toggle";

export function fxLevel(): FxLevel {
  try {
    const raw = window.localStorage.getItem(LEVEL_KEY);
    if (raw != null) {
      const n = Number(raw);
      if (Number.isInteger(n) && n >= 0 && n <= 4) return n as FxLevel;
    }
    // Migration: a pre-dial "hide effects" preference maps to Off.
    return window.localStorage.getItem(LEGACY_HIDDEN_KEY) === "1" ? 0 : 2;
  } catch {
    return 2;
  }
}

export function setFxLevel(level: FxLevel) {
  try {
    window.localStorage.setItem(LEVEL_KEY, String(level));
    // Keep the legacy flag truthful for any reader that still checks it.
    if (level === 0) window.localStorage.setItem(LEGACY_HIDDEN_KEY, "1");
    else window.localStorage.removeItem(LEGACY_HIDDEN_KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function fxHidden(): boolean {
  return fxLevel() === 0;
}

export function setFxHidden(hidden: boolean) {
  setFxLevel(hidden ? 0 : 2);
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Reactive read of the effects dial (SSR-safe: Normal on the server). */
export function useFxLevel(): FxLevel {
  return useSyncExternalStore(subscribe, fxLevel, () => 2);
}

/** Reactive read of "effects fully off" (SSR-safe: false on the server). */
export function useFxHidden(): boolean {
  return useSyncExternalStore(subscribe, fxHidden, () => false);
}
