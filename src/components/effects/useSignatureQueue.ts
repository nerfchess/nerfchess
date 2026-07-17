"use client";

// Serialized signature-play state shared by every game surface (local game,
// online match, spectator). Fixes the "simultaneous plays coalesce to one"
// defect (docs/passive-effect-audit.md R9): the signatureCard prop is a single
// state slot, so two fireSignature calls in one apply cycle used to batch into
// one render and only the LAST card's choreography played. Here the first play
// fires immediately and every further play lands in a short queue that steps
// out one spectacle at a time.
//
// The optional gate ref reproduces the surfaces' HOLD-AND-REPLAY behavior
// (plays that land while the player's full-screen draft overlay covers the
// board are held and replayed once it lifts). While gated, plays only queue;
// the surface calls notifyGateOpen() when the overlay dismisses.

import { useCallback, useEffect, useRef, useState } from "react";

/** How long one cast spectacle owns the board before the next queued play
 *  steps out (the historic hold-and-replay spacing). */
const SPACING_MS = 2600;
/** Newest plays kept when a burst outruns the queue (historic cap). */
const MAX_QUEUED = 6;

export function useSignatureQueue(gateRef?: { current: boolean }) {
  const [signatureCard, setSignatureCard] = useState<{ id: string; key: number } | null>(null);
  const keyRef = useRef(0);
  const queueRef = useRef<string[]>([]);
  const busyUntilRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const playNow = useCallback((id: string) => {
    busyUntilRef.current = Date.now() + SPACING_MS;
    setSignatureCard({ id, key: ++keyRef.current });
  }, []);

  const drain = useCallback(() => {
    timerRef.current = null;
    if (gateRef?.current) return; // resumes via notifyGateOpen
    const id = queueRef.current.shift();
    if (id == null) return;
    playNow(id);
    if (queueRef.current.length > 0) timerRef.current = window.setTimeout(drain, SPACING_MS);
  }, [gateRef, playNow]);

  /** Fire a card's signature: immediately when the board is free, queued when
   *  another spectacle is mid-play or the draft overlay covers the board. */
  const fire = useCallback(
    (id: string) => {
      if (gateRef?.current || timerRef.current != null || Date.now() < busyUntilRef.current) {
        queueRef.current = [...queueRef.current, id].slice(-MAX_QUEUED);
        if (!gateRef?.current && timerRef.current == null) {
          timerRef.current = window.setTimeout(drain, Math.max(0, busyUntilRef.current - Date.now()));
        }
        return;
      }
      playNow(id);
    },
    [drain, gateRef, playNow],
  );

  /** The gate flipped open (draft overlay dismissed): held plays step out. */
  const notifyGateOpen = useCallback(() => {
    if (timerRef.current == null && queueRef.current.length > 0) drain();
  }, [drain]);

  // Unmount: stop the stepper so no timer outlives the board.
  useEffect(
    () => () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  return { signatureCard, fire, notifyGateOpen };
}
