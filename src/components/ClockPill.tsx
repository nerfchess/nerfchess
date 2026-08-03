"use client";

import { useEffect, useRef, useState } from "react";
import { formatClock } from "@/lib/clockFormat";
import { playLowTime, playUrgentTick } from "@/lib/sounds";

// Shared across every ClockPill instance so the duplicated mobile/desktop
// copies of the same clock never double-play a warning within one tick.
let lastClockWarnAt = 0;
function warnClockOnce(play: () => void) {
  const now = Date.now();
  if (now - lastClockWarnAt < 900) return;
  lastClockWarnAt = now;
  play();
}

// Lives in a pure module so the boundary behaviour is unit-testable without
// React; re-exported here because this is where callers expect to find it.
export { formatClock } from "@/lib/clockFormat";

export function ClockPill({
  ms,
  active,
  compact = false,
  startDelayMs = 0,
  warnLowTime = false,
  draftRunning = false,
  seat = null,
}: {
  ms: number;
  active: boolean;
  compact?: boolean;
  startDelayMs?: number;
  /** Engine color of the seat this pill times, stamped as data-clock-seat so
   * the clock-raid overlay can find and aim at the on-screen pill. Mobile and
   * desktop copies share the seat; the overlay picks whichever is visible. */
  seat?: "w" | "b" | null;
  // When true, this clock belongs to the local player: play a low-time warning
  // as it ticks past 10s, and an urgent tick past 5s. Fires once per crossing
  // and re-arms only if time climbs back above the threshold (increment).
  warnLowTime?: boolean;
  // An unresolved draft is charging this clock (the free pick window ended):
  // a small DRAFT tag rides inside the pill so the reason the clock is
  // running is visible right where the player watches the time.
  draftRunning?: boolean;
}) {
  const [displayMs, setDisplayMs] = useState(ms);
  const lowFiredRef = useRef(false);
  const urgentFiredRef = useRef(false);
  // First-move grace: milliseconds of free time left before this clock
  // actually starts charging (startDelayMs counting down to zero).
  const [graceMs, setGraceMs] = useState(() => (active ? startDelayMs : 0));

  // Snap the display back to the authoritative clock values whenever they
  // change (adjust during render), leaving the effect to run the tick loop.
  const [prevSync, setPrevSync] = useState({ ms, active, startDelayMs });
  if (prevSync.ms !== ms || prevSync.active !== active || prevSync.startDelayMs !== startDelayMs) {
    setPrevSync({ ms, active, startDelayMs });
    setDisplayMs(ms);
    setGraceMs(active ? startDelayMs : 0);
  }

  useEffect(() => {
    if (!active) return;

    const startedAt = performance.now();
    let raf = 0;
    let timer = 0;

    const update = () => {
      const now = performance.now();
      const elapsed = Math.max(0, now - startedAt - startDelayMs);
      const remaining = Math.max(0, ms - elapsed);
      const grace = Math.max(0, startDelayMs - (now - startedAt));
      setDisplayMs(remaining);
      setGraceMs(grace);

      // Low-time warnings only for the local player's own running clock, and
      // never while the first-move grace timer is still shielding it.
      if (warnLowTime && grace <= 0) {
        if (remaining > 10000) lowFiredRef.current = false;
        else if (!lowFiredRef.current) {
          lowFiredRef.current = true;
          warnClockOnce(playLowTime);
        }
        if (remaining > 5000) urgentFiredRef.current = false;
        else if (remaining > 0 && !urgentFiredRef.current) {
          urgentFiredRef.current = true;
          warnClockOnce(playUrgentTick);
        }
      }
    };

    const tick = () => {
      update();
      // Cadence keys off the time LEFT, not the `ms` prop. The prop is the last
      // authoritative value and deliberately does not change per tick (the pill
      // self-interpolates via rAF, so the game view is not repainted every
      // frame) — so keying on it meant a player thinking from 60s down to 2s
      // kept the 250ms cadence the whole way, and the sub-10s tenths display
      // advanced in visible 0.25s jumps.
      const remaining = Math.max(0, ms - Math.max(0, performance.now() - startedAt - startDelayMs));
      timer = window.setTimeout(tick, remaining < 10000 ? 100 : 250);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [active, ms, startDelayMs, warnLowTime]);

  // Urgency ramp: under 30s the running clock breathes a subtle pulse (gold),
  // under 10s it pulses stronger and tints oxblood. Border stays 2px across
  // every active tier so switching urgency never shifts layout; the countdown
  // text is always tabular-nums so digits never jitter.
  const low = displayMs < 30000;
  const critical = displayMs < 10000;
  return (
    <div
      data-clock-seat={seat ?? undefined}
      className={
        "plate flex items-center justify-center transition " +
        (compact ? "shrink-0 px-3 py-1.5 " : "p-4 ") +
        (active
          ? critical
            ? "border-2 border-oxblood-glow bg-oxblood/25 shadow-oxblood ring-1 ring-oxblood-glow/50 animate-pulse"
            : low
            ? "border-2 border-gold bg-gold/15 shadow-leaf ring-1 ring-gold/40 clock-pulse-soft"
            : "border-2 border-gold bg-gold/15 shadow-leaf ring-1 ring-gold/40"
          // Idle clocks stay clearly readable; the gold border/glow on the
          // running clock (not heavy dimming) is what marks whose turn it is.
          : "opacity-80")
      }
    >
      <span
        className={
          "font-mono tabular-nums font-bold tracking-wide " +
          (compact ? "text-xl " : "text-4xl ") +
          (critical
            ? "text-oxblood-glow"
            : low
            ? "text-gold-leaf"
            : "text-parchment")
        }
      >
        {formatClock(displayMs)}
      </span>
      {draftRunning && (
        <span
          title="Your draft is unresolved and this clock is running"
          aria-label="Draft unresolved: this clock is running"
          className={
            "smallcaps shrink-0 border border-oxblood-glow/60 bg-oxblood/20 font-display font-bold tracking-wide text-oxblood-glow animate-flicker " +
            (compact ? "ml-1.5 px-1 text-[9px]" : "ml-2 px-1.5 text-[11px]")
          }
        >
          Draft
        </span>
      )}
      {active && graceMs > 0 && (
        <span
          role="timer"
          aria-label={`Free time: ${Math.ceil(graceMs / 1000)} seconds until the clock starts`}
          title="Free time before your clock starts"
          className={
            "font-mono tabular-nums text-gold-leaf/80 " +
            (compact ? "ml-1.5 text-[10px]" : "ml-2 text-sm")
          }
        >
          +{Math.ceil(graceMs / 1000)}
        </span>
      )}
    </div>
  );
}
