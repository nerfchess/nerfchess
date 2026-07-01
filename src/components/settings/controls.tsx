"use client";

// Reusable, presentational controls for the settings menu. None of these hold
// application state — they take a value and (optionally) an onChange, so both
// the live settings and the disabled "Coming soon" placeholders reuse them.

import { ChevronDown } from "lucide-react";

/** Modern pill toggle switch with a sliding, animated knob. */
export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={
        "relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full border transition-colors duration-200 ease-out " +
        (disabled ? "cursor-not-allowed opacity-40 " : "cursor-pointer ") +
        (checked
          ? "bg-gold/70 border-gold/60"
          : "bg-white/[0.06] border-white/15 hover:border-white/25")
      }
    >
      <span
        className={
          "inline-block h-3 w-3 rounded-full bg-parchment shadow-sm transition-transform duration-200 ease-out " +
          (checked ? "translate-x-[15px]" : "translate-x-[2px]")
        }
      />
    </button>
  );
}

/** Compact range slider with a monospace readout on the right. */
export function Slider({
  value,
  min,
  max,
  step,
  onChange,
  disabled = false,
  format,
  label,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange?: (next: number) => void;
  disabled?: boolean;
  format?: (v: number) => string;
  label?: string;
}) {
  return (
    <div className={"flex items-center gap-2 w-[9.5rem] " + (disabled ? "opacity-40" : "")}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange?.(parseFloat(e.target.value))}
        className={
          "w-full accent-gold-leaf h-1 " + (disabled ? "cursor-not-allowed" : "cursor-pointer")
        }
      />
      <span className="font-mono text-[10px] text-parchment-400 w-8 text-right tabular-nums">
        {format ? format(value) : value}
      </span>
    </div>
  );
}

/** Static dropdown-styled control used only for disabled placeholders. */
export function FakeSelect({ value, disabled = true }: { value: string; disabled?: boolean }) {
  return (
    <div
      className={
        "flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-parchment-300 " +
        (disabled ? "opacity-50 cursor-not-allowed" : "")
      }
    >
      <span>{value}</span>
      <ChevronDown className="h-3 w-3 text-parchment-400" />
    </div>
  );
}

/** Row of color swatches used only for the disabled Accent Color placeholder. */
export function Swatches({ colors, disabled = true }: { colors: string[]; disabled?: boolean }) {
  return (
    <div className={"flex items-center gap-1 " + (disabled ? "opacity-40" : "")}>
      {colors.map((c, i) => (
        <span
          key={i}
          className={
            "h-4 w-4 rounded-full border " +
            (i === 0 ? "border-parchment/60" : "border-white/15")
          }
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

/** Small secondary button used only for disabled placeholders (e.g. Reset). */
export function GhostButton({ label, disabled = true }: { label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={
        "rounded border border-white/12 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-parchment-300 " +
        (disabled ? "cursor-not-allowed opacity-50" : "hover:border-white/25")
      }
    >
      {label}
    </button>
  );
}
