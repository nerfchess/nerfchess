// Clock rendering, kept as a pure module so it can be tested headlessly
// (scripts/test-clock-format.ts) without pulling React or the sound layer in
// through ClockPill.

/**
 * Render remaining time for a clock pill.
 *
 * Above 10s: `m:ss`, CEILED — a clock never reads 0:00 while time remains.
 * Below 10s: `0:ss.t` with one decimal, so the last stretch feels urgent.
 *
 * The tenths are FLOORED, not rounded. `toFixed(1)` rounds, so 9999ms rendered
 * "10.0" and the pill showed "0:10.0" immediately after "0:10" — claiming a
 * full ten seconds while already under ten. Flooring also matches the ceil
 * above it in intent (never overstate what is left) and reaches "0:00.0" only
 * at true zero.
 */
export function formatClock(ms: number): string {
  const clamped = Math.max(0, ms);
  if (clamped < 10000) {
    return `0:${(Math.floor(clamped / 100) / 10).toFixed(1).padStart(4, "0")}`;
  }
  const totalSec = Math.ceil(clamped / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
