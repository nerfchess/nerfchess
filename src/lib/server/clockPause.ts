// Bounded disconnect-pause arithmetic for house games.
//
// A house game pauses the human's clock when they disconnect during their own
// turn, so a dropped socket never flags them mid-move. That protection used to
// be open-ended, and nothing could end it: `currentClocks` returns the banked
// values while `runningSince` is null, and the flag alarm is only armed when
// `runningSince` is set. So walking away for five minutes cost only the ~10s the
// socket took to notice the disconnect, and backgrounding a phone tab (which
// closes the socket, indistinguishable from a real disconnect) froze the clock
// for as long as the player liked.
//
// The rules here bound it: one absence buys at most PAUSE_MAX_MS, a seat gets at
// most PAUSE_BUDGET_MS across a whole game, and the pause carries a deadline the
// Durable Object's alarm honours — so the clock restarts itself and an absent
// player faces the ordinary flag path like anyone else.
//
// Kept as pure functions over a structural slice of the stored match so the
// behaviour is testable without standing up a Durable Object
// (scripts/test-clock-pause.ts).

import type { Color } from "@/engine/types";

/** Longest a single absence can freeze the clock. */
export const PAUSE_MAX_MS = 45 * 1000;
/** Longest one seat can be paused across a whole game, so a refresh loop
 * cannot chain grants. */
export const PAUSE_BUDGET_MS = 90 * 1000;

/** The fields the pause rules read. StoredMatch in worker.ts satisfies this. */
export interface PausableMatch {
  startedAt?: number | null;
  result: unknown;
  runningSince: number | null;
  disconnectedAt: Partial<Record<Color, number>>;
  bots?: Partial<Record<Color, string>> | null;
  /** A draft's lock-in window, which pauses the clock for its own reasons. */
  dtDeadline?: number | null;
  pauseUntil?: number | null;
  pausedSince?: number | null;
  pausedTotalMs?: Partial<Record<Color, number>>;
}

/** How much pause this seat may still be granted, given what it has used. 0
 * means the budget is spent and the clock must simply keep running. */
export function pauseGrantMs(match: PausableMatch, color: Color): number {
  const spent = match.pausedTotalMs?.[color] ?? 0;
  return Math.min(PAUSE_MAX_MS, Math.max(0, PAUSE_BUDGET_MS - spent));
}

/** Bill an ended pause against the seat's budget and clear the deadline.
 * Never bills past the grant, so a late alarm cannot overcharge.
 *
 * The elapsed pause is measured from `pausedSince`, stamped when the pause was
 * granted, NOT from `disconnectedAt`. That distinction is the whole point: the
 * reconnect path calls `attachSession` first, which deletes `disconnectedAt`
 * for the returning seat, so billing off that field always measured zero and
 * `pausedTotalMs` never grew — a player could disconnect/reconnect on their own
 * turn indefinitely and be granted a fresh PAUSE_MAX_MS every time, with
 * PAUSE_BUDGET_MS never reached. `disconnectedAt` stays as the fallback so
 * matches persisted before `pausedSince` existed still bill something sane.
 */
export function chargePauseBudget(match: PausableMatch, color: Color, now: number): void {
  if (match.pauseUntil == null) return;
  const since = match.pausedSince ?? match.disconnectedAt[color];
  const paused = since != null ? Math.min(now, match.pauseUntil) - since : 0;
  match.pausedTotalMs = {
    ...match.pausedTotalMs,
    [color]: (match.pausedTotalMs?.[color] ?? 0) + Math.max(0, paused),
  };
  match.pauseUntil = null;
  match.pausedSince = null;
}

/** Drop a disconnect-pause without billing it, for paths that resume the clock
 * for an unrelated reason (a draft action settling, a takeback). Leaving
 * `pauseUntil` set behind a running clock strands a deadline the alarm later
 * sweeps as stale, which bills nothing and silently ends the protection. */
export function clearPause(match: PausableMatch): void {
  match.pauseUntil = null;
  match.pausedSince = null;
}

/** The human seat currently away in a house game, if any. */
export function awaySeat(match: PausableMatch): Color | undefined {
  return (["w", "b"] as Color[]).find(
    (c) => match.disconnectedAt[c] != null && !match.bots?.[c],
  );
}

/**
 * Release a disconnect-pause whose deadline has passed: restart the clock even
 * though the player is still away. Mutates `match` and returns true when the
 * clock was restarted (so the caller knows to persist and re-check the flag).
 *
 * Also self-heals: if something else already resumed the clock, or the game is
 * over, the stale deadline is simply dropped.
 */
export function releaseExpiredPause(match: PausableMatch, now: number): boolean {
  if (match.pauseUntil == null || now < match.pauseUntil) return false;
  if (match.result || !match.startedAt || match.runningSince !== null) {
    clearPause(match);
    return false;
  }
  // A draft's lock-in window outranks this: it holds the clock for a reason of
  // its own and owns the resume, so leave the deadline standing for next time.
  if (match.dtDeadline != null && now < match.dtDeadline) return false;
  const away = awaySeat(match);
  if (away) chargePauseBudget(match, away, now);
  else clearPause(match);
  match.runningSince = now;
  return true;
}
