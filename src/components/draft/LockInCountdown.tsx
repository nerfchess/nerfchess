"use client";

import { useEffect, useRef, useState } from "react";

// The lock-in countdown and its tick, in their own module so the corner
// notice and the nerf-draft screen can render one without pulling the whole
// draft overlay (and its stylesheet) into the first paint of every match.

/** Shared countdown tick: milliseconds left plus a one-shot expiry callback
 * that always sees the latest closure. */
export function useCountdown(deadline: number, onExpire?: () => void) {
  const [leftMs, setLeftMs] = useState(() => Math.max(0, deadline - Date.now()));
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    expiredRef.current = false;
    const id = window.setInterval(() => {
      const left = Math.max(0, deadline - Date.now());
      setLeftMs(left);
      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current?.();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [deadline]);

  return leftMs;
}

/** Thin lock-in countdown: bar plus seconds. Silent by design: picking a
 * card should not come with time-pressure noise. */
export function LockInCountdown({
  deadline,
  onExpire,
  className = "",
}: {
  deadline: number;
  onExpire?: () => void;
  className?: string;
}) {
  const total = 20_000;
  const leftMs = useCountdown(deadline, onExpire);
  const seconds = Math.ceil(leftMs / 1000);
  const fraction = Math.max(0, Math.min(1, leftMs / total));
  // The whole window is paused free time (same rule as DraftTimerWindow
  // below): flashing the on-your-clock red at 5s-left showed it 5 seconds
  // too early, so the urgent style only fires once the window truly ends.
  const urgent = leftMs <= 0;
  return (
    <div className={"flex items-center gap-2 " + className} role="timer" aria-label="Lock-in timer">
      <div className="h-1 flex-1 overflow-hidden rounded-[1px] bg-white/10">
        {/* scaleX, not width. The countdown ticks ten times a second for the
            whole 20 second window, and a width transition relayouts the bar
            (inside an overflow-hidden parent) on every one of those ticks. A
            transform runs on the compositor instead. */}
        <div
          className={
            "h-full w-full origin-left transition-transform duration-100 " +
            (urgent ? "bg-oxblood-glow" : "bg-gold-leaf")
          }
          style={{ transform: `scaleX(${fraction})` }}
        />
      </div>
      <span
        className={
          "w-6 shrink-0 text-right font-mono text-sm font-bold tabular-nums " +
          (urgent ? "text-oxblood-glow" : "text-gold-leaf")
        }
      >
        {seconds}
      </span>
    </div>
  );
}

