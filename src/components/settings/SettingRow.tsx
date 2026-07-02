"use client";

import type { ReactNode } from "react";

/**
 * A single compact settings row: label + optional hint on the left, a control
 * on the right. When `stacked` is set (e.g. the board-theme grid) the control
 * drops onto its own full-width line below the label.
 */
export function SettingRow({
  label,
  hint,
  control,
  stacked = false,
}: {
  label: string;
  hint?: string;
  control: ReactNode;
  stacked?: boolean;
}) {
  const text = (
    <div className="min-w-0">
      <span className="block truncate text-[13px] font-medium leading-tight text-parchment">
        {label}
      </span>
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
