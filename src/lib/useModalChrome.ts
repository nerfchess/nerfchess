"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The three things every full-screen overlay in this app needs and, before
 * this hook, mostly did not have. FilterSheet was the only overlay that locked
 * body scroll; nothing but the draft overlay handled Escape.
 *
 * 1. BODY SCROLL LOCK — without it a touch drag on the backdrop scrolls the
 *    page behind the modal, so closing it lands the reader somewhere else.
 * 2. ESCAPE — `aria-modal="true"` promises keyboard dismissal.
 * 3. A GHOST-CLICK GUARD (`dismissArmed`) — on touch, the tap that CAUSES a
 *    modal to mount also fires a trailing synthesized mouse event at the same
 *    coordinates a moment later. Landing on a freshly-mounted full-bleed
 *    backdrop, that closes the modal the instant it appears. Board.tsx
 *    documents and fixes exactly this for its promotion picker; the game-over
 *    screen had the same hazard (the winning move commits on pointerdown, the
 *    result screen mounts in the same frame, and a finishing tap outside the
 *    centred panel dismissed it immediately). Gate backdrop dismissal on
 *    `dismissArmed` and the ghost event is ignored while a real tap-away,
 *    which arrives later, still works.
 *
 * Scroll locking is reference-counted so nested overlays (a confirm on top of
 * a panel) restore the page exactly once, in the right order.
 */

let scrollLocks = 0;
let savedOverflow = "";
let savedPaddingRight = "";

function lockScroll() {
  if (typeof document === "undefined") return;
  if (scrollLocks++ > 0) return;
  const body = document.body;
  savedOverflow = body.style.overflow;
  savedPaddingRight = body.style.paddingRight;
  // Compensate for the scrollbar the lock removes, so the page behind does not
  // visibly jump sideways on desktop. Zero on overlay-scrollbar platforms.
  const gap = window.innerWidth - document.documentElement.clientWidth;
  if (gap > 0) body.style.paddingRight = `${gap}px`;
  body.style.overflow = "hidden";
}

function unlockScroll() {
  if (typeof document === "undefined") return;
  if (--scrollLocks > 0) return;
  scrollLocks = 0;
  document.body.style.overflow = savedOverflow;
  document.body.style.paddingRight = savedPaddingRight;
}

export interface ModalChrome {
  /** False for the first frames after mount; gate backdrop dismissal on it. */
  dismissArmed: boolean;
  /** Attach to the backdrop: dismisses only once armed. */
  onBackdropPointerDown: (e: { target: unknown; currentTarget: unknown }) => void;
}

/**
 * @param active whether the overlay is currently shown.
 * @param onClose dismissal callback (Escape and an armed backdrop press).
 * @param opts.armDelayMs how long to ignore backdrop presses after mount.
 *   250ms comfortably outlives the ~300ms-max synthesized-click window on the
 *   platforms that still emit one, without being noticeable to a real user.
 */
export function useModalChrome(
  active: boolean,
  onClose?: () => void,
  opts: { armDelayMs?: number; lockScroll?: boolean; escape?: boolean } = {},
): ModalChrome {
  const { armDelayMs = 250, lockScroll: wantLock = true, escape = true } = opts;
  const [dismissArmed, setDismissArmed] = useState(false);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  // Arm on a timer, never synchronously: a setState in the effect body would
  // cascade a render. Disarming is handled during render below (the standard
  // derived-state pattern) rather than in the cleanup.
  const [armedFor, setArmedFor] = useState<boolean | null>(null);
  if (armedFor !== active) {
    setArmedFor(active);
    if (dismissArmed) setDismissArmed(false);
  }
  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => setDismissArmed(true), armDelayMs);
    return () => window.clearTimeout(id);
  }, [active, armDelayMs]);

  useEffect(() => {
    if (!active || !wantLock) return;
    lockScroll();
    return unlockScroll;
  }, [active, wantLock]);

  useEffect(() => {
    if (!active || !escape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, escape]);

  return {
    dismissArmed,
    onBackdropPointerDown: (e) => {
      // Only a press that STARTED on the backdrop itself dismisses, so a drag
      // that began inside the panel and ended outside does not.
      if (e.target !== e.currentTarget) return;
      if (!dismissArmed) return;
      closeRef.current?.();
    },
  };
}
