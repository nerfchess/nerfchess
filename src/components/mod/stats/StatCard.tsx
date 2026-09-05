"use client";

// The stats pages' number tile: one figure with its label, on the standard
// plate. Moved out of /mod/stats when that page split into per-scope subpages.

export function StatCard({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="plate p-4">
      <div className="font-mono text-2xl text-parchment-50 tabular-nums">
        {value.toLocaleString()}
        {suffix && <span className="text-sm text-parchment-400">{suffix}</span>}
      </div>
      <div className="mt-1 text-[10px] text-parchment-400">{label}</div>
    </div>
  );
}
