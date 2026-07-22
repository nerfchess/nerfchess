"use client";

// React binding for the draft lifecycle state machine (draftSequence.ts).
//
// One hook instance per game surface. It owns a DraftSequence for the offer
// currently on the table and turns the two real completion signals the
// surfaces have into machine transitions:
//
//   1. "the board's spectacles finished" (the signature queue went idle)
//      gates ANIMATIONS_PLAYING -> CARDS_PREPARING, which is when the draft
//      overlay is allowed to mount at all;
//   2. "both cards are dealt, painted, and interactive" (DraftOverlay's
//      onCardsReady) gates CARDS_PREPARING -> CARDS_READY, at which point the
//      decision countdown is armed with its FULL duration.
//
// Both gates carry watchdog caps inside the machine, so a lost animation
// event delays the draft by at most a few seconds instead of blocking it.
// A reroll (offer key change) restarts preparation and earns a complete
// fresh window. An offer that is already running on the player's own clock
// (the decision window expired, e.g. restored from a save or a reconnect)
// skips the hold entirely: the compact pending panel must show immediately
// and no new countdown is ever armed for it.

import { useEffect, useRef, useState } from "react";
import { DraftSequence, type DraftPhase } from "./draftSequence";

/** Cap on waiting for board spectacles before the draft proceeds anyway. */
const ANIMATIONS_SETTLE_CAP_MS = 7000;
/** Cap on waiting for the overlay's cards-ready report (unmounted overlay,
 * crashed animation) before the countdown arms anyway. */
const CARDS_READY_CAP_MS = 12000;

export interface UseDraftSequenceOptions {
  /** Identity of the live offer version (`${index}:${rerolled}`); null when
   * no draft is open. A key change with a draft still open is a reroll (or a
   * re-dealt offer) and restarts preparation. */
  offerKey: string | null;
  /** True while board spectacles (card plays, captures) are still playing. */
  animationsBusy: boolean;
  /** True when this offer's decision window has already expired and the
   * draft runs on the player's clock. */
  onClock: boolean;
  /** Full decision window granted once the cards are ready. */
  decisionMs?: number;
  /** Arm the countdown at this absolute deadline (epoch ms). */
  onDecisionStart: (deadline: number) => void;
  /** A fresh offer version entered preparation: clear any armed countdown. */
  onPrepStart?: () => void;
}

export interface DraftSequenceHandle {
  /** Current machine phase (DRAFT_COMPLETE when no draft is open). */
  phase: DraftPhase;
  /** True once the draft overlay may render (animations settled). */
  overlayVisible: boolean;
  /** Pass to DraftOverlay's onCardsReady. */
  reportCardsReady: (offerKey: string) => void;
  /** Optional: surfaces may report the pick/bank commit for telemetry. */
  noteConfirmed: () => void;
}

export function useDraftSequence(opts: UseDraftSequenceOptions): DraftSequenceHandle {
  const { offerKey, animationsBusy, onClock, decisionMs = 20_000 } = opts;
  const [phase, setPhase] = useState<DraftPhase>("DRAFT_COMPLETE");
  const seqRef = useRef<DraftSequence | null>(null);
  const keyRef = useRef<string | null>(null);
  // Latest values readable from stable callbacks without effect churn.
  // Synced in an effect (never during render); declared BEFORE the machine
  // effect below so the sync always runs first in the same commit.
  const busyRef = useRef(animationsBusy);
  const onClockRef = useRef(onClock);
  const optsRef = useRef(opts);
  useEffect(() => {
    busyRef.current = animationsBusy;
    onClockRef.current = onClock;
    optsRef.current = opts;
  });
  // whenIdle-style listeners waiting for the busy flag to drop.
  const idleWaitersRef = useRef<(() => void)[]>([]);
  // Resolver for the current offer version's cards-ready signal.
  const readyResolveRef = useRef<(() => void) | null>(null);

  // Notify idle waiters whenever the busy flag drops.
  useEffect(() => {
    if (animationsBusy) return;
    const waiters = idleWaitersRef.current;
    idleWaitersRef.current = [];
    for (const w of waiters) w();
  }, [animationsBusy]);

  // Drive the machine for the current offer key. The extra seqRef check
  // matters under React StrictMode's simulated unmount/remount in dev: the
  // unmount cleanup disposes the machine while keyRef (a ref) survives, so a
  // bare key-equality guard would leave the draft with no machine at all.
  // A matching key with a missing machine rebuilds it instead.
  useEffect(() => {
    if (offerKey === keyRef.current && (offerKey == null || seqRef.current != null)) return;
    const prevKey = keyRef.current;
    keyRef.current = offerKey;

    if (offerKey == null) {
      // Draft resolved (or gone): walk the tail and retire the machine.
      const seq = seqRef.current;
      if (seq) {
        seq.to("RETURNING_TO_GAME");
        seq.to("DRAFT_COMPLETE");
        seq.dispose();
        seqRef.current = null;
      }
      readyResolveRef.current = null;
      queueMicrotask(() => setPhase("DRAFT_COMPLETE"));
      return;
    }

    const armPreparation = (seq: DraftSequence) => {
      optsRef.current.onPrepStart?.();
      // Cards-ready signal for THIS offer version, capped so a lost report
      // (overlay unmounted mid-deal, animation error) can never park the
      // draft in preparation forever.
      const ready = new Promise<void>((resolve) => {
        readyResolveRef.current = resolve;
      });
      seq.track("cards-ready", ready, CARDS_READY_CAP_MS);
      void seq.advanceWhenSettled("CARDS_READY").then((ok) => {
        if (!ok || seqRef.current !== seq) return;
        // The full decision window opens NOW, after every animation. An
        // offer already running on the player's clock gets no new window.
        if (!onClockRef.current) {
          const deadline = seq.startDecision(optsRef.current.decisionMs ?? decisionMs);
          if (deadline != null) optsRef.current.onDecisionStart(deadline);
        } else {
          seq.to("DRAFT_DECIDING");
        }
      });
    };

    if (prevKey != null && seqRef.current) {
      // Reroll / re-dealt offer: same draft moment, fresh presentation and a
      // fresh full window once the new cards are ready.
      const seq = seqRef.current;
      seq.restartPreparation();
      armPreparation(seq);
      return;
    }

    // Brand-new draft: fresh machine. Phase mirrors into React state through
    // a microtask so no transition ever writes state inside an effect body
    // (transitions fire synchronously from effects and async continuations
    // alike); microtask order preserves transition order.
    const seq = new DraftSequence({
      onPhase: (p) => queueMicrotask(() => setPhase(p)),
      onStall: (label, kind) => {
        // Diagnostics only: the sequence already recovered by design.
        console.warn(`[draft-sequence] ${label} ${kind}; continuing`);
      },
    });
    seqRef.current = seq;
    queueMicrotask(() => setPhase(seq.phase));
    seq.to("ANIMATIONS_PLAYING");

    if (onClockRef.current) {
      // Restored mid-expiry: the compact pending panel must appear at once.
      seq.to("CARDS_PREPARING");
      armPreparation(seq);
      return;
    }

    // Wait for the board's spectacles to finish before the overlay mounts.
    // Real signal: the signature queue's busy flag dropping; the cap keeps a
    // stuck queue from ever blocking the draft. A quiet board (the common
    // case) proceeds synchronously so the overlay never flashes a hold.
    if (!busyRef.current) {
      seq.to("CARDS_PREPARING");
      armPreparation(seq);
      return;
    }
    const idle = new Promise<void>((resolve) => {
      idleWaitersRef.current.push(resolve);
    });
    seq.track("board-animations", idle, ANIMATIONS_SETTLE_CAP_MS);
    void seq.advanceWhenSettled("CARDS_PREPARING").then((ok) => {
      if (!ok || seqRef.current !== seq) return;
      armPreparation(seq);
    });
  }, [offerKey, decisionMs]);

  // Unmount: never leave watchdogs running.
  useEffect(
    () => () => {
      seqRef.current?.dispose();
      seqRef.current = null;
    },
    [],
  );

  const reportCardsReady = (key: string) => {
    if (key !== keyRef.current) return; // stale report from a replaced offer
    readyResolveRef.current?.();
    readyResolveRef.current = null;
  };

  const noteConfirmed = () => {
    seqRef.current?.to("DRAFT_CONFIRMING");
    seqRef.current?.to("SELECTION_ANIMATING");
  };

  return {
    phase,
    overlayVisible:
      phase === "CARDS_PREPARING" ||
      phase === "CARDS_READY" ||
      phase === "DRAFT_DECIDING" ||
      phase === "DRAFT_CONFIRMING" ||
      phase === "SELECTION_ANIMATING",
    reportCardsReady,
    noteConfirmed,
  };
}
