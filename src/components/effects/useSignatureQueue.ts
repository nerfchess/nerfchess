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
  // Live "a spectacle is playing (or queued to play)" signal for the draft
  // sequencing layer: the draft overlay's own entrance is deferred while the
  // board is still telling the previous move's story, so the card animations
  // always finish BEFORE the draft presentation begins. Held (gated) plays do
  // not count as busy: they wait for the overlay by design.
  const [busy, setBusy] = useState(false);
  const busyTimerRef = useRef<number | null>(null);
  // Self-rescheduling through a ref (a useCallback cannot refer to itself
  // before its own declaration), mirroring the drainRef pattern below.
  const scheduleBusyClearRef = useRef<() => void>(() => {});
  const scheduleBusyClear = useCallback(() => {
    if (busyTimerRef.current != null) window.clearTimeout(busyTimerRef.current);
    const wait = Math.max(0, busyUntilRef.current - Date.now()) + 30;
    busyTimerRef.current = window.setTimeout(() => {
      busyTimerRef.current = null;
      if (Date.now() >= busyUntilRef.current && queueRef.current.length === 0) {
        setBusy(false);
      } else if (!gateRef?.current) {
        scheduleBusyClearRef.current();
      } else {
        // Gated leftovers replay under the overlay; they no longer block it.
        setBusy(false);
      }
    }, wait);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    scheduleBusyClearRef.current = scheduleBusyClear;
  }, [scheduleBusyClear]);

  const playNow = useCallback(
    (id: string) => {
      busyUntilRef.current = Date.now() + SPACING_MS;
      setSignatureCard({ id, key: ++keyRef.current });
      setBusy(true);
      scheduleBusyClear();
    },
    [scheduleBusyClear],
  );

  // The stepper self-reschedules through a ref (a useCallback cannot refer to
  // itself before its own declaration). Written from an effect, never during
  // render; the initial value is a safe no-op that no caller can reach before
  // the first effect pass has run.
  const drainRef = useRef<() => void>(() => {});
  useEffect(() => {
    drainRef.current = () => {
      timerRef.current = null;
      if (gateRef?.current) return; // resumes via notifyGateOpen
      const id = queueRef.current.shift();
      if (id == null) return;
      playNow(id);
      if (queueRef.current.length > 0)
        timerRef.current = window.setTimeout(() => drainRef.current(), SPACING_MS);
    };
  }, [gateRef, playNow]);

  /** Fire a card's signature: immediately when the board is free, queued when
   *  another spectacle is mid-play or the draft overlay covers the board. */
  const fire = useCallback(
    (id: string) => {
      if (gateRef?.current || timerRef.current != null || Date.now() < busyUntilRef.current) {
        queueRef.current = [...queueRef.current, id].slice(-MAX_QUEUED);
        if (!gateRef?.current && timerRef.current == null) {
          timerRef.current = window.setTimeout(
            () => drainRef.current(),
            Math.max(0, busyUntilRef.current - Date.now()),
          );
        }
        return;
      }
      playNow(id);
    },
    [gateRef, playNow],
  );

  /** The gate flipped open (draft overlay dismissed): held plays step out. */
  const notifyGateOpen = useCallback(() => {
    if (timerRef.current == null && queueRef.current.length > 0) drainRef.current();
  }, []);

  // Unmount: stop the stepper so no timer outlives the board.
  useEffect(
    () => () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      if (busyTimerRef.current != null) window.clearTimeout(busyTimerRef.current);
    },
    [],
  );

  return { signatureCard, fire, notifyGateOpen, busy };
}
