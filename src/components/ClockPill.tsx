"use client";

import { useEffect, useState } from "react";

export function formatClock(ms: number): string {
  const clamped = Math.max(0, ms);
  // Under 10s, show 1 decimal so the user can feel the rush.
  if (clamped < 10000) return `0:${(clamped / 1000).toFixed(1).padStart(4, "0")}`;
  const totalSec = Math.ceil(clamped / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ClockPill({
  ms,
  active,
  compact = false,
  startDelayMs = 0,
}: {
  ms: number;
  active: boolean;
  compact?: boolean;
  startDelayMs?: number;
}) {
  const [displayMs, setDisplayMs] = useState(ms);
  // First-move grace: milliseconds of free time left before this clock
  // actually starts charging (startDelayMs counting down to zero).
  const [graceMs, setGraceMs] = useState(() => (active ? startDelayMs : 0));

  useEffect(() => {
    setDisplayMs(ms);
    setGraceMs(active ? startDelayMs : 0);
    if (!active) return;

    const startedAt = performance.now();
    let raf = 0;
    let timer = 0;

    const update = () => {
      const now = performance.now();
      const elapsed = Math.max(0, now - startedAt - startDelayMs);
      setDisplayMs(Math.max(0, ms - elapsed));
      setGraceMs(Math.max(0, startDelayMs - (now - startedAt)));
    };

    const tick = () => {
      update();
      const nextDelay = ms < 10000 ? 100 : 250;
      timer = window.setTimeout(tick, nextDelay);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [active, ms, startDelayMs]);

  const low = displayMs < 30000;
  const warning = displayMs < 15000;
  const critical = displayMs < 10000;
  return (
    <div
      className={
        "plate flex items-center justify-center transition " +
        (compact ? "shrink-0 px-3 py-1.5 " : "p-4 ") +
        (active
          ? warning
            ? "border-2 border-oxblood-glow bg-oxblood/20 shadow-oxblood ring-1 ring-oxblood-glow/40 animate-pulse"
            : "border-2 border-gold bg-gold/15 shadow-leaf ring-1 ring-gold/40"
          : "opacity-60")
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
