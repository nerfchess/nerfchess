// ---------------------------------------------------------------------------
// UI interrupt gate + queue.
//
// While a draft is active (or any other moment the game marks as protected),
// nonessential interruptions must not appear: performance prompts, achievement
// toasts, tour nudges, general notices. They would either cover the cards or
// eat the player's decision time. This module is the single gate they all
// check.
//
//   - Surfaces that must not be interrupted take a hold: `pushUiHold()`
//     returns a release function. Holds nest (two open drafts in two tabs of
//     state are impossible, but a draft plus a closing animation is not).
//   - Interrupters request a presentation slot with a priority:
//     `requestUiSlot(priority, show)`. The `show` callback fires only when no
//     hold is active AND no other interrupter currently owns the slot. It
//     receives a `release` function it must call when its surface goes away,
//     which lets the next queued interrupter (highest priority first, then
//     request order) present. One interruption at a time, never a pile.
//
// Urgent surfaces (connection failures that block play) intentionally do NOT
// go through this queue; they render directly and must preserve draft state.
//
// Pure module: no React, no DOM. Deterministic and directly unit testable.
// ---------------------------------------------------------------------------

export const UI_PRIORITY = {
  /** Connection notices that can wait (a reconnect succeeded, ping is high). */
  connectionInfo: 10,
  /** Achievement unlock toasts. */
  achievement: 20,
  /** Tour / onboarding nudges. */
  tour: 30,
  /** General announcements. */
  announcement: 40,
  /** Performance recommendations (the "smooth it out" prompt). Lowest: it is
   * advice about presentation, so every real notification outranks it. */
  performance: 50,
} as const;

interface SlotRequest {
  priority: number;
  seq: number;
  show: (release: () => void) => void;
  cancelled: boolean;
}

let holdCount = 0;
let seqCounter = 0;
let activeSlot: SlotRequest | null = null;
const queue: SlotRequest[] = [];
const holdListeners = new Set<() => void>();

function notifyHoldChange() {
  for (const cb of [...holdListeners]) cb();
}

/** True while any protected surface (an active draft) holds interrupts. */
export function uiInterruptsHeld(): boolean {
  return holdCount > 0;
}

/** Observe hold-state changes (used by React surfaces and by the drain). */
export function subscribeUiHold(cb: () => void): () => void {
  holdListeners.add(cb);
  return () => holdListeners.delete(cb);
}

/**
 * Take an interrupt hold for the lifetime of a protected surface. Returns the
 * release function; releasing twice is safe. When the last hold releases, the
 * queue drains (one interrupter at a time).
 */
export function pushUiHold(): () => void {
  holdCount += 1;
  notifyHoldChange();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holdCount = Math.max(0, holdCount - 1);
    notifyHoldChange();
    maybePresentNext();
  };
}

function maybePresentNext() {
  if (holdCount > 0 || activeSlot || queue.length === 0) return;
  // Highest priority first (lower number = more important), then FIFO.
  queue.sort((a, b) => a.priority - b.priority || a.seq - b.seq);
  const next = queue.shift()!;
  if (next.cancelled) {
    maybePresentNext();
    return;
  }
  activeSlot = next;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    if (activeSlot === next) activeSlot = null;
    maybePresentNext();
  };
  next.show(release);
}

/**
 * Ask to present an interruption. `show(release)` fires when it is safe: no
 * hold active, no other interruption showing. Call `release()` when the
 * surface dismisses. Returns a cancel function for requesters that unmount
 * before their turn arrives.
 */
export function requestUiSlot(
  priority: number,
  show: (release: () => void) => void,
): () => void {
  const req: SlotRequest = { priority, seq: seqCounter++, show, cancelled: false };
  queue.push(req);
  maybePresentNext();
  return () => {
    req.cancelled = true;
    const i = queue.indexOf(req);
    if (i >= 0) queue.splice(i, 1);
  };
}

/** Test hook: reset all module state between test cases. */
export function resetUiInterruptsForTest() {
  holdCount = 0;
  seqCounter = 0;
  activeSlot = null;
  queue.length = 0;
  holdListeners.clear();
}
