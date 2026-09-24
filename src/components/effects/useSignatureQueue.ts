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
import type { Color, Square } from "@/engine/types";
import { fxDurationScale } from "@/lib/settings";
import { detectTempo, tempoScale } from "@/components/useMotionTempo";

/** What a surface can tell the board about a play beyond the card id. Today
 *  that is who cast it: the effect geometry aims and leans away from the
 *  caster, and every surface already knows the answer, so it no longer has to
 *  be guessed from which side lost more pieces. Optional throughout: a
 *  surface that has not been widened yet still fires with just an id. */
export interface SigPlayMeta {
  caster?: Color;
  /** The square the card was played on, when the surface knows it. Cards that
   *  remove pieces or touch a zone give Board squares to work from already;
   *  this is what lets a DIFF-LESS play (a clock steal, a draft trick, an info
   *  peek) still happen somewhere rather than dead centre. */
  sq?: Square;
}

interface QueuedPlay {
  id: string;
  meta?: SigPlayMeta;
}

/** The play slot Board reads. */
export interface SigPlaySlot {
  id: string;
  key: number;
  caster?: Color;
  sq?: Square;
}

/** How long one cast spectacle owns the board before the next queued play
 *  steps out (the historic hold-and-replay spacing), at normal tempo and the
 *  default effect duration. */
const SPACING_MS = 2600;

/** How the queue steps right now. `animMs` is how long a spectacle owns the
 *  board: it follows the same two dials the spectacle itself follows, the
 *  effect duration (--fx-dur) and the tempo (fast 0.6, off 0, which also
 *  covers reduced motion and the low-time hold). Only that time counts as
 *  busy: with animations off no spectacle plays, so the board and the draft
 *  overlay's entrance are never held for it (F208, the draft used to lose up
 *  to 2.6s per queued play from its decision window).
 *  `stepMs` is how far apart queued plays step out. With animations off it
 *  stays the historic reading hold (2600 x --fx-dur): the only card-play
 *  feedback then is CastTextFallback, which is keyed to the single play slot,
 *  so a shorter step would replace each announcement before it can be read
 *  and a burst would leave only the last one on screen. The hold is below the
 *  fallback's own 3600ms dismiss, so each chip is read, then replaced. */
function stepping(): { animMs: number; stepMs: number } {
  const base = SPACING_MS * fxDurationScale();
  const animMs = Math.round(base * tempoScale(detectTempo()));
  return { animMs, stepMs: animMs > 0 ? animMs : Math.round(base) };
}
/** A floor under the step: each play keeps its own frame: plays fired in one
 *  tick would otherwise batch into one render and only the last would reach
 *  the board (the R9 coalescing defect this queue exists to prevent). */
const MIN_STEP_MS = 16;
/** Newest plays kept when a burst outruns the queue (historic cap). */
const MAX_QUEUED = 6;

export function useSignatureQueue(gateRef?: { current: boolean }) {
  const [signatureCard, setSignatureCard] = useState<SigPlaySlot | null>(null);
  const keyRef = useRef(0);
  const queueRef = useRef<QueuedPlay[]>([]);
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
    (play: QueuedPlay) => {
      const { animMs, stepMs } = stepping();
      busyUntilRef.current = Date.now() + Math.max(stepMs, MIN_STEP_MS);
      setSignatureCard({
        id: play.id,
        key: ++keyRef.current,
        caster: play.meta?.caster,
        sq: play.meta?.sq,
      });
      // Only a playing spectacle is busy: a text announcement never holds
      // the board or the draft.
      if (animMs > 0) {
        setBusy(true);
        scheduleBusyClear();
      }
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
      const play = queueRef.current.shift();
      if (play == null) return;
      playNow(play);
      if (queueRef.current.length > 0)
        timerRef.current = window.setTimeout(
          () => drainRef.current(),
          Math.max(0, busyUntilRef.current - Date.now()),
        );
    };
  }, [gateRef, playNow]);

  /** Fire a card's signature: immediately when the board is free, queued when
   *  another spectacle is mid-play or the draft overlay covers the board. */
  const fire = useCallback(
    (id: string, meta?: SigPlayMeta) => {
      if (gateRef?.current || timerRef.current != null || Date.now() < busyUntilRef.current) {
        queueRef.current = [...queueRef.current, { id, meta }].slice(-MAX_QUEUED);
        if (!gateRef?.current && timerRef.current == null) {
          timerRef.current = window.setTimeout(
            () => drainRef.current(),
            Math.max(0, busyUntilRef.current - Date.now()),
          );
        }
        return;
      }
      playNow({ id, meta });
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
