"use client";

// Reusable, presentational controls for the settings menu. None of these hold
// application state — they take a value and an onChange.

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

/** Compact native select styled to match the panel. */
export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (next: T) => void;
  label?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value as T)}
        className="cursor-pointer appearance-none rounded border border-white/10 bg-white/[0.03] py-1 pl-2 pr-6 text-[11px] text-parchment-300 transition-colors hover:border-white/25 focus:border-gold/60 focus:outline-none [&>option]:bg-ink-800"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-parchment-400" />
    </div>
  );
}

/** Row of accent color swatches; the selected swatch gets a bright ring. */
export function Swatches({
  colors,
  selected,
  onSelect,
}: {
  colors: Array<{ id: string; color: string; label: string }>;
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {colors.map((c) => (
        <button
          key={c.id}
          type="button"
          title={c.label}
          aria-label={c.label}
          aria-pressed={selected === c.id}
          onClick={() => onSelect(c.id)}
          className={
            "h-4.5 w-4.5 rounded-full border transition " +
            (selected === c.id
              ? "border-parchment ring-1 ring-parchment/60"
              : "border-white/15 hover:border-white/40")
          }
          style={{ background: c.color, width: 18, height: 18 }}
        />
      ))}
    </div>
  );
}

/** Small secondary action button (e.g. Reset). */
export function GhostButton({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-white/12 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-parchment-300 transition-colors hover:border-white/25 hover:text-parchment"
    >
      {label}
    </button>
  );
}
