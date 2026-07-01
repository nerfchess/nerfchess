"use client";

import type { ReactNode } from "react";

/** "Coming soon" pill shown next to placeholder settings. */
function SoonBadge() {
  return (
    <span className="shrink-0 rounded border border-gold/25 px-1 py-px text-[8.5px] font-semibold uppercase leading-none tracking-wider text-gold-leaf/70">
      Soon
    </span>
  );
}

/**
 * A single compact settings row: label + optional hint on the left, a control
 * on the right. When `stacked` is set (e.g. the board-theme grid) the control
 * drops onto its own full-width line below the label.
 */
export function SettingRow({
  label,
  hint,
  comingSoon = false,
  control,
  stacked = false,
}: {
  label: string;
  hint?: string;
  comingSoon?: boolean;
  control: ReactNode;
  stacked?: boolean;
}) {
  const text = (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span
          className={
            "truncate text-[13px] font-medium leading-tight " +
            (comingSoon ? "text-parchment-300/70" : "text-parchment")
          }
        >
          {label}
        </span>
        {comingSoon && <SoonBadge />}
      </div>
      {hint && (
        <p className="mt-0.5 text-[11px] leading-snug text-parchment-500">{hint}</p>
      )}
    </div>
  );

  if (stacked) {
    return (
      <div className="py-2">
        {text}
        <div className="mt-2">{control}</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      {text}
      <div className="shrink-0">{control}</div>
    </div>
  );
}
