// Low-time animation hold: while EITHER player's clock is under
// LOW_TIME_MOTION_MS, every animation stands down exactly as if the Settings
// switch were off, and comes back the moment both clocks are above the line
// again (increment). A leaf module (no imports) so settings.ts can read the
// held flag while this module never has to import settings.ts back: settings
// registers the re-apply callback once at load instead.
//
// Each clock pill reports for its seat ("w" / "b"); duplicated pills (mobile
// and desktop copies of one seat) share a key, so they always agree.

export const LOW_TIME_MOTION_MS = 20_000;

const under = new Map<string, boolean>();
let reapply: (() => void) | null = null;

/** True while any reporting clock is under the line. Read by applyUiPrefs. */
export function lowTimeMotionHeld(): boolean {
  for (const v of under.values()) if (v) return true;
  return false;
}

/** settings.ts registers the function that re-stamps html[data-anim]. */
export function setLowTimeReapply(fn: () => void): void {
  reapply = fn;
}

/** Report whether the clock `key` is currently under the line. Re-applies the
 * UI prefs only when the aggregate flag actually flips. */
export function reportLowTime(key: string, isUnder: boolean): void {
  const before = lowTimeMotionHeld();
  if (isUnder) under.set(key, true);
  else under.delete(key);
  if (before !== lowTimeMotionHeld()) reapply?.();
}

/** Forget a clock (pill unmounted, game over). */
export function releaseLowTime(key: string): void {
  reportLowTime(key, false);
}
