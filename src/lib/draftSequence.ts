// ---------------------------------------------------------------------------
// Draft lifecycle state machine.
//
// One controller owns the complete life of a single draft offer, from the move
// that triggered it to the moment play resumes. Both game surfaces (the local
// bot game and OnlineMatch) drive their draft UI through this machine instead
// of coordinating phases with independent timeouts. The invariant it enforces
// is the whole point of the module:
//
//   THE DECISION COUNTDOWN NEVER STARTS WHILE ANYTHING IS STILL ANIMATING.
//
// Phases, in order:
//
//   MOVE_RESOLVING      the triggering move (and its captures) is landing
//   ANIMATIONS_PLAYING  triggered card / passive / opponent spectacles play out
//   CARDS_PREPARING     chest opening + card dealing inside the draft overlay
//   CARDS_READY         both cards are rendered, readable, and interactive
//   DRAFT_DECIDING      the countdown runs; the player owns the full window
//   DRAFT_CONFIRMING    a pick / bank was locked in and is being processed
//   SELECTION_ANIMATING the chosen card's flight / bank slide is playing
//   RETURNING_TO_GAME   the overlay is closing and play is resuming
//   DRAFT_COMPLETE      terminal; the machine is inert
//
// Every gated wait is EVENT driven: callers register real completion signals
// (promises) with `track`. There are no guessed choreography timeouts in here.
// The only timers this module owns are per-signal WATCHDOG CAPS, which exist
// so a lost completion event (an unmounted component, a failed animation, a
// dropped requestAnimationFrame in a background tab) can delay the sequence by
// at most its cap instead of blocking the draft forever. A cap firing is a
// fault recovery, not a scheduling mechanism, and it is surfaced through
// `onStall` so tests and telemetry can see it.
//
// Reduced motion / performance mode: animations there settle immediately (or
// after their shortened form) and resolve the same tracked promises, so the
// machine advances through the same phases without any special casing.
//
// The machine is deliberately framework free and dependency injected (clock +
// timer functions) so it runs identically in the browser, in node test
// scripts with a fake clock, and on any future surface.
// ---------------------------------------------------------------------------

export type DraftPhase =
  | "MOVE_RESOLVING"
  | "ANIMATIONS_PLAYING"
  | "CARDS_PREPARING"
  | "CARDS_READY"
  | "DRAFT_DECIDING"
  | "DRAFT_CONFIRMING"
  | "SELECTION_ANIMATING"
  | "RETURNING_TO_GAME"
  | "DRAFT_COMPLETE";

export const DRAFT_PHASE_ORDER: readonly DraftPhase[] = [
  "MOVE_RESOLVING",
  "ANIMATIONS_PLAYING",
  "CARDS_PREPARING",
  "CARDS_READY",
  "DRAFT_DECIDING",
  "DRAFT_CONFIRMING",
  "SELECTION_ANIMATING",
  "RETURNING_TO_GAME",
  "DRAFT_COMPLETE",
];

export function draftPhaseIndex(phase: DraftPhase): number {
  return DRAFT_PHASE_ORDER.indexOf(phase);
}

/** True when `phase` is at or past `atLeast` in the lifecycle order. */
export function draftPhaseReached(phase: DraftPhase, atLeast: DraftPhase): boolean {
  return draftPhaseIndex(phase) >= draftPhaseIndex(atLeast);
}

/** The player-facing label for a pre-decision phase (requirement: never say
 * "free time"; say what is actually happening). */
export function draftPrepLabel(phase: DraftPhase): string | null {
  switch (phase) {
    case "MOVE_RESOLVING":
    case "ANIMATIONS_PLAYING":
      return "Resolving effects";
    case "CARDS_PREPARING":
      return "Opening your draft";
    case "CARDS_READY":
      return "Dealing the cards";
    default:
      return null;
  }
}

export interface DraftSequenceOptions {
  /** Clock, injectable for deterministic tests. Defaults to Date.now. */
  now?: () => number;
  /** Timer pair, injectable for deterministic tests. */
  setTimeout?: (fn: () => void, ms: number) => unknown;
  clearTimeout?: (handle: unknown) => void;
  /** Called on every phase transition. */
  onPhase?: (phase: DraftPhase, prev: DraftPhase) => void;
  /** Called when a tracked signal hit its watchdog cap or rejected; the
   * sequence continues (nothing may block the draft), this is diagnostics. */
  onStall?: (label: string, kind: "timeout" | "error") => void;
  /** Default watchdog cap for tracked signals without an explicit cap. */
  defaultCapMs?: number;
}

interface TrackedSignal {
  label: string;
  settled: boolean;
}

const DEFAULT_CAP_MS = 8000;

export class DraftSequence {
  private phaseValue: DraftPhase = "MOVE_RESOLVING";
  private readonly now: () => number;
  private readonly setT: (fn: () => void, ms: number) => unknown;
  private readonly clearT: (handle: unknown) => void;
  private readonly onPhase?: (phase: DraftPhase, prev: DraftPhase) => void;
  private readonly onStall?: (label: string, kind: "timeout" | "error") => void;
  private readonly defaultCapMs: number;
  private disposed = false;
  /** Bumped on every restartPreparation, so a gated advance that was already
   * in flight when a reroll landed can detect the reset and stand down even
   * though the phase name may read the same before and after. */
  private epoch = 0;
  /** Signals gating the NEXT forward transition, per phase they were tracked in. */
  private pending = new Map<DraftPhase, TrackedSignal[]>();
  private waiters = new Map<DraftPhase, (() => void)[]>();
  private watchdogs = new Set<unknown>();
  /** Set once startDecision runs; survives restarts only via startDecision. */
  private decisionDeadline: number | null = null;

  constructor(opts: DraftSequenceOptions = {}) {
    this.now = opts.now ?? Date.now;
    this.setT =
      opts.setTimeout ??
      ((fn, ms) => (typeof window !== "undefined" ? window.setTimeout(fn, ms) : setTimeout(fn, ms)));
    this.clearT =
      opts.clearTimeout ??
      ((h) =>
        typeof window !== "undefined"
          ? window.clearTimeout(h as number)
          : clearTimeout(h as ReturnType<typeof setTimeout>));
    this.onPhase = opts.onPhase;
    this.onStall = opts.onStall;
    this.defaultCapMs = opts.defaultCapMs ?? DEFAULT_CAP_MS;
  }

  get phase(): DraftPhase {
    return this.phaseValue;
  }

  /** The armed decision deadline (epoch ms), null before DRAFT_DECIDING. */
  get deadline(): number | null {
    return this.decisionDeadline;
  }

  /**
   * Register a real completion signal that must settle before the machine may
   * leave the CURRENT phase through `advanceWhenSettled`. The signal is a
   * promise (animation completion, layout-ready, network ack). A rejection or
   * a watchdog cap both count as settled: no animation can block the draft
   * permanently, only delay it by at most its cap.
   */
  track(label: string, signal: Promise<unknown>, capMs?: number): void {
    if (this.disposed || this.phaseValue === "DRAFT_COMPLETE") return;
    const phase = this.phaseValue;
    const entry: TrackedSignal = { label, settled: false };
    const list = this.pending.get(phase) ?? [];
    list.push(entry);
    this.pending.set(phase, list);

    let capHandle: unknown = null;
    const settle = (stall: "timeout" | "error" | null) => {
      if (entry.settled) return;
      entry.settled = true;
      if (capHandle != null) {
        this.clearT(capHandle);
        this.watchdogs.delete(capHandle);
      }
      if (stall) this.onStall?.(label, stall);
      this.drainWaiters(phase);
    };
    capHandle = this.setT(() => settle("timeout"), capMs ?? this.defaultCapMs);
    this.watchdogs.add(capHandle);
    void signal.then(
      () => settle(null),
      () => settle("error"),
    );
  }

  /** Resolves once every signal tracked in the CURRENT phase has settled.
   * Resolves immediately when nothing is tracked. */
  whenSettled(): Promise<void> {
    const phase = this.phaseValue;
    if (this.allSettled(phase)) return Promise.resolve();
    return new Promise((resolve) => {
      const list = this.waiters.get(phase) ?? [];
      list.push(resolve);
      this.waiters.set(phase, list);
    });
  }

  private allSettled(phase: DraftPhase): boolean {
    return (this.pending.get(phase) ?? []).every((s) => s.settled);
  }

  private drainWaiters(phase: DraftPhase) {
    if (!this.allSettled(phase)) return;
    const list = this.waiters.get(phase);
    if (!list) return;
    this.waiters.delete(phase);
    for (const w of list) w();
  }

  /**
   * Move forward to `next` once every signal tracked in the current phase has
   * settled. Transitions are forward only (skipping intermediate phases is
   * allowed: a draft with no pending animations goes straight from
   * MOVE_RESOLVING to CARDS_PREPARING). A stale call for a phase the machine
   * has already passed is a no-op, never an error, so racing effects in the
   * React surfaces cannot corrupt the order.
   */
  async advanceWhenSettled(next: DraftPhase): Promise<boolean> {
    const from = this.phaseValue;
    const epoch = this.epoch;
    if (this.disposed) return false;
    if (draftPhaseIndex(next) <= draftPhaseIndex(from)) return false;
    await this.whenSettled();
    // The world may have moved on while we waited (a restart, a faster path).
    if (this.disposed || this.phaseValue !== from || this.epoch !== epoch) return false;
    this.transition(next);
    return true;
  }

  /** Immediate forward transition (no gating). Stale/backward calls no-op. */
  to(next: DraftPhase): boolean {
    if (this.disposed) return false;
    if (draftPhaseIndex(next) <= draftPhaseIndex(this.phaseValue)) return false;
    this.transition(next);
    return true;
  }

  /**
   * Arm the decision window. Legal only once the cards are ready; returns the
   * absolute deadline. The full `durationMs` is granted from NOW, so however
   * long the animations took, the player always receives the complete window.
   */
  startDecision(durationMs: number): number | null {
    if (this.disposed) return null;
    if (this.phaseValue !== "CARDS_READY") {
      // Never start a countdown over animations or an unprepared board.
      if (!draftPhaseReached(this.phaseValue, "CARDS_READY")) return null;
      // Already deciding (or later): return the armed deadline unchanged.
      return this.decisionDeadline;
    }
    this.decisionDeadline = this.now() + durationMs;
    this.transition("DRAFT_DECIDING");
    return this.decisionDeadline;
  }

  /**
   * A reroll (or a re-dealt offer) restarts the presentation: back to
   * CARDS_PREPARING, dropping any armed deadline and every pending signal.
   * The player then receives a complete fresh decision window once the new
   * cards are ready. Illegal after completion.
   */
  restartPreparation(): boolean {
    if (this.disposed || this.phaseValue === "DRAFT_COMPLETE") return false;
    this.epoch += 1;
    this.decisionDeadline = null;
    this.clearAllPending();
    const prev = this.phaseValue;
    this.phaseValue = "CARDS_PREPARING";
    this.onPhase?.(this.phaseValue, prev);
    return true;
  }

  private transition(next: DraftPhase) {
    const prev = this.phaseValue;
    this.phaseValue = next;
    this.onPhase?.(next, prev);
  }

  private clearAllPending() {
    for (const h of this.watchdogs) this.clearT(h);
    this.watchdogs.clear();
    this.pending.clear();
    // Anyone waiting on a dropped phase resolves now: their phase check in
    // advanceWhenSettled sees the restart and no-ops safely.
    for (const [, list] of this.waiters) for (const w of list) w();
    this.waiters.clear();
  }

  /** Tear down: clears every watchdog and releases every waiter. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.clearAllPending();
  }
}

/**
 * Convenience: wrap an "is something still animating" boolean stream into a
 * promise the machine can track. `subscribe` must invoke the callback on every
 * change and return an unsubscribe. Resolves immediately when already idle.
 */
export function whenIdle(
  isBusy: () => boolean,
  subscribe: (cb: () => void) => () => void,
): Promise<void> {
  if (!isBusy()) return Promise.resolve();
  return new Promise((resolve) => {
    const un = subscribe(() => {
      if (!isBusy()) {
        un();
        resolve();
      }
    });
  });
}
