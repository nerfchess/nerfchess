"use client";

import { useId } from "react";

// The bot setup card's building blocks, shared by the live card (page.tsx) and
// its skeleton (PlaySkeleton.tsx), so the skeleton is laid out by the same
// components and cannot drift from the card's geometry.

export const TIME_STEPS_SEC = [
  30,
  45,
  60,
  90,
  120,
  150,
  180,
  ...range(5 * 60, 10 * 60, 60),
  15 * 60, // the 15+10 preset's base falls between the coarser ranges
  ...range(12 * 60, 30 * 60, 2 * 60),
  ...range(35 * 60, 2 * 60 * 60, 5 * 60),
].sort((a, b) => a - b);

// One-tap time controls: a preset sets both sliders (base + increment); the
// sliders stay for fine-tuning.
export const TIME_PRESETS: { label: string; baseSec: number; incrementSec: number }[] = [
  { label: "1+0", baseSec: 60, incrementSec: 0 },
  { label: "3+2", baseSec: 3 * 60, incrementSec: 2 },
  { label: "5+0", baseSec: 5 * 60, incrementSec: 0 },
  { label: "10+0", baseSec: 10 * 60, incrementSec: 0 },
  { label: "15+10", baseSec: 15 * 60, incrementSec: 10 },
];

// Rough Elo of each bot level, mirroring BOT_ELO in the game view so the
// strength pills carry the same estimates the board header shows.
export const BOT_ELO: Record<"easy" | "medium" | "hard", number> = {
  easy: 1100,
  medium: 1500,
  hard: 1900,
};

export function range(start: number, end: number, step: number) {
  const values: number[] = [];
  for (let value = start; value <= end; value += step) {
    values.push(value);
  }
  return values;
}

export function formatTimeControl(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSec = seconds % 60;
  return `${minutes}:${remainingSec.toString().padStart(2, "0")}`;
}

export function TimeSlider({
  label,
  value,
  values,
  display,
  disabled = false,
  loading = false,
  formatEdgeLabel = String,
  onChange,
}: {
  label: string;
  value: number;
  values: number[];
  display: string;
  disabled?: boolean;
  /** Skeleton mode: same geometry, value hidden, input inert. */
  loading?: boolean;
  formatEdgeLabel?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const index = Math.max(0, values.indexOf(value));
  const id = useId();

  return (
    <div className={disabled ? "opacity-50" : ""}>
      <div className="flex items-center justify-between mb-2">
        {/* A real label: the range input had no accessible name (axe). */}
        <label htmlFor={id} className="text-[12px] text-parchment-400">
          {label}
        </label>
        <div className="font-mono text-sm text-gold-leaf tabular-nums">
          {loading ? <span aria-hidden className="skeleton inline-block h-[1em] w-10 align-middle" /> : display}
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={values.length - 1}
        step={1}
        value={index}
        disabled={disabled || loading}
        onChange={(e) => onChange(values[Number(e.target.value)])}
        // A native range renders a 16px-tall box, which is a hard thing to
        // grab with a thumb and the one control on this page a player has to
        // drag rather than tap. The track paints centred in whatever height
        // the element has, so raising min-height grows the hit area without
        // moving the slider. Relaxed on a fine pointer, where 16px is a
        // perfectly good mouse target and the extra height would just push
        // the two time-control rows apart.
        className="min-h-[44px] w-full accent-gold-leaf disabled:cursor-not-allowed [@media(pointer:fine)]:min-h-0"
      />
      <div className="mt-1 flex justify-between font-mono text-[12px] text-parchment-400">
        <span>{formatEdgeLabel(values[0])}</span>
        <span>{formatEdgeLabel(values[values.length - 1])}</span>
      </div>
    </div>
  );
}

export function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[12px] text-parchment-400">{label}</div>
      {/* Options fill the row edge to edge (Lichess's setup dialog), never a
          cluster of small pills floating in the left of a wide card. Columns
          are minmax(0, 1fr), not 1fr: a 1fr column cannot shrink below its
          content, so at 360px "Medium ~1500" pushed past its pill's border.
          Now every column is an equal share and a long label wraps inside
          its pill (F154). */}
      <div className="grid grid-flow-col auto-cols-[minmax(0,1fr)] gap-2">{children}</div>
    </div>
  );
}

// A strength option's label: the level and its rough Elo, which wraps under
// the level when the pill is narrow.
export function BotStrengthLabel({ level }: { level: "easy" | "medium" | "hard" }) {
  return (
    <>
      {level[0].toUpperCase() + level.slice(1)}
      <span className="font-mono text-[12px] opacity-70">~{BOT_ELO[level]}</span>
    </>
  );
}

export function Pill({
  selected,
  onClick,
  disabled = false,
  children,
}: { selected: boolean; onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={
        "inline-flex min-h-[44px] w-full flex-wrap items-center justify-center gap-x-1.5 border px-3 py-2 text-center font-display text-[14px] font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 " +
        (selected
          ? "border-gold bg-gold/20 text-gold-leaf"
          : "border-[color:var(--edge)] bg-[color:var(--bg-raised)] text-parchment-200 hover:border-[color:var(--edge-strong)] hover:text-parchment-50")
      }
    >
      {children}
    </button>
  );
}
