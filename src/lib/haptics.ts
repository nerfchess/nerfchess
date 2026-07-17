"use client";

// Optional haptic hooks for supported mobile devices. Deliberately quiet:
// short, light patterns on meaningful beats only (draft tear, pick commit,
// bank, victory), never on routine hovers or moves. Stands down entirely when
// animations are off in Settings or the OS asks for reduced motion, and every
// call is fail-safe on browsers without navigator.vibrate (iOS Safari has no
// vibration API; this is a progressive enhancement, not a dependency).

const PATTERNS = {
  light: [10],
  medium: [18],
  success: [12, 60, 24],
} as const;

export type HapticKind = keyof typeof PATTERNS;

export function haptic(kind: HapticKind = "light"): void {
  try {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;
    if (!("vibrate" in navigator)) return;
    if (document.documentElement.getAttribute("data-anim") === "off") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    // Never let a feedback nicety break an interaction.
  }
}
