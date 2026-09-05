"use client";

// Reusable, presentational controls for the settings menu. None of these hold
// application state — they take a value and an onChange. The carved-recess
// styling (tracks, thumbs, hit areas) lives in SettingsPanel.css.

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Forged toggle: a carved recess in the stone with a gem thumb that lights
 *  with the accent energy when on. The visual stays 44x24; the CSS ::before
 *  pads the touch target to 44px tall. */
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
      className="settings-toggle"
    >
      <span aria-hidden className="settings-toggle__thumb" />
    </button>
  );
}

/** Range slider in a carved stone channel with a monospace readout on the
 *  right. Fills the space its row offers (the row caps the width). */
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
    <div
      className={
        "flex w-full min-w-[8.5rem] max-w-[16rem] items-center gap-2.5 " +
        (disabled ? "opacity-40" : "")
      }
    >
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange?.(parseFloat(e.target.value))}
        className="settings-range w-full accent-gold-leaf"
      />
      <span className="w-10 shrink-0 text-right font-mono text-[12px] tabular-nums text-parchment-400">
        {format ? format(value) : value}
      </span>
    </div>
  );
}

/** Native select carved into the stone (the shared .input-rune recess). */
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
        className="input-rune min-h-[36px] cursor-pointer appearance-none py-1.5 pl-3 pr-8 text-[13px] font-medium text-parchment-200 [&>option]:bg-ink-800"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-parchment-400" />
    </div>
  );
}

/** Small secondary action button (e.g. Reset, Apply, Remove). */
export function GhostButton({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <Button tone="ghost"
     
      onClick={onClick}
      className="shrink-0 px-3 py-1.5 text-[13px] font-medium">
      {label}
    </Button>
  );
}
