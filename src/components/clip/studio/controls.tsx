"use client";

// Shared control primitives for the studio deck, all built on the sanctioned
// Button primitive. Dense rows: smallcaps label on the left, segmented chips
// or a ruled slider with a tabular-mono readout on the right.

import type { MutableRefObject, ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import type { ClipScene } from "../clipScene";
import type { ClipStyle } from "../clipStyles";
import type { ClipCustomMusic } from "../clipMusic";
import type { ClipOptionsState, PliesChoice } from "../clipOptions";

/** Everything a deck panel can touch, passed as one object so the ten panels
 *  stay skinny. All mutations flow through set / setStyle, which discard the
 *  current take and let the auto-encode debounce rebuild it. */
export interface Studio {
  opts: ClipOptionsState;
  set: <K extends keyof ClipOptionsState>(key: K, value: ClipOptionsState[K]) => void;
  setStyle: (patch: Partial<ClipStyle>) => void;
  locked: boolean;
  accent: string;
  scene: ClipScene | null;
  images: Map<string, HTMLImageElement> | null;
  // TEXT panel
  hookText: string;
  hookSuggestion: string;
  editHook: (value: string | null) => void;
  // FORMAT panel
  pliesChoice: PliesChoice;
  setPliesChoice: (p: PliesChoice) => void;
  resetTikTok: () => void;
  /** Encoder capabilities for the fps fallback note (null while probing). */
  encode: { tier: 1 | 2 | 3; fps60: boolean } | null;
  // AUDIO panel
  customMusic: ClipCustomMusic | null;
  pickMusicFile: () => void;
  clearCustomMusic: () => void;
  musicFileRef: MutableRefObject<HTMLInputElement | null>;
  importMusicFile: (file: File) => void;
  /** DOM nodes the transport tick writes into (playhead, meter needle). */
  registerTickTarget: (key: string, el: HTMLElement | null) => void;
}

/** Square-bullet chip: state is carried by the bullet's fill (filled square =
 *  active), never by color alone. */
export function Chip({
  label,
  on,
  onClick,
  disabled,
  title,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <Button
      tone="ghost"
      size="xs"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      title={title}
      className={on ? "text-gold-leaf" : "text-parchment-300"}
    >
      <span
        aria-hidden
        className={
          "h-1.5 w-1.5 shrink-0 " + (on ? "bg-gold-leaf" : "border border-white/30")
        }
      />
      {label}
    </Button>
  );
}

/** One deck row: label left, controls right, hairline underneath. */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="clip-row" role="group" aria-label={label}>
      <span className="clip-row-label">{label}</span>
      <div className="clip-row-body">{children}</div>
    </div>
  );
}

/** A row of mutually exclusive chips. */
export function ChoiceRow<T extends string | number>({
  label,
  options,
  value,
  onPick,
  disabled,
}: {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T;
  onPick: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <Row label={label}>
      {options.map(([id, lab]) => (
        <Chip
          key={String(id)}
          label={lab}
          on={value === id}
          onClick={() => onPick(id)}
          disabled={disabled}
        />
      ))}
    </Row>
  );
}

/** A row of independent toggles. */
export function ToggleRow({
  label,
  toggles,
  disabled,
}: {
  label: string;
  toggles: { label: string; on: boolean; onClick: () => void }[];
  disabled?: boolean;
}) {
  return (
    <Row label={label}>
      {toggles.map((tg) => (
        <Chip key={tg.label} label={tg.label} on={tg.on} onClick={tg.onClick} disabled={disabled} />
      ))}
    </Row>
  );
}

/** Slider row: ruled track, snapping thumb, live tabular-mono readout. */
export function SliderRow({
  label,
  value,
  onChange,
  disabled,
  min = 0,
  max = 100,
  step = 5,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
}) {
  return (
    <Row label={label}>
      <input
        type="range"
        className="clip-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
      <span className="clip-readout">{format ? format(value) : String(value)}</span>
    </Row>
  );
}

const HEX_RE = /^#?([0-9a-f]{6})$/i;

/** Hex well + mono input. Commits only complete #rrggbb values. */
export function HexWell({
  label,
  value,
  onCommit,
  disabled,
}: {
  label: string;
  value: string;
  onCommit: (hex: string) => void;
  disabled?: boolean;
}) {
  return (
    <span className="clip-hex">
      <span className="clip-hex-well" style={{ background: value }} aria-hidden />
      <input
        type="text"
        defaultValue={value}
        key={value}
        maxLength={7}
        disabled={disabled}
        aria-label={label}
        spellCheck={false}
        onBlur={(e) => {
          const m = HEX_RE.exec(e.target.value.trim());
          if (m) onCommit(`#${m[1].toLowerCase()}`);
          else e.target.value = value;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
    </span>
  );
}
