"use client";

export function formatClock(ms: number): string {
  const clamped = Math.max(0, ms);
  // Under 10s, show 1 decimal so the user can feel the rush.
  if (clamped < 10000) return `0:${(clamped / 1000).toFixed(1).padStart(4, "0")}`;
  const totalSec = Math.ceil(clamped / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ClockPill({ ms, active, compact = false }: { ms: number; active: boolean; compact?: boolean }) {
  const low = ms < 30000;
  const critical = ms < 10000;
  return (
    <div
      className={
        "plate flex items-center justify-center transition " +
        (compact ? "shrink-0 px-3 py-1.5 " : "p-4 ") +
        (active
          ? "border-2 border-gold bg-gold/15 shadow-leaf ring-1 ring-gold/40"
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
        {formatClock(ms)}
      </span>
    </div>
  );
}
