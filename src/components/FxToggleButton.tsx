"use client";

import { EyeOff, Sparkles } from "lucide-react";
import { FX_LEVELS, setFxLevel, useFxLevel, type FxLevel } from "@/lib/fxToggle";

/** The effects dial beside the board: a five-step slider from Off (the old
 * hide switch) through Calm / Normal / Epic to Max craziness. Functional
 * board reads always stay visible; the dial only scales the show. Kept under
 * the old FxToggleButton name so both game rails mount it unchanged. */
export function FxToggleButton({ className = "" }: { className?: string }) {
  const level = useFxLevel();
  const info = FX_LEVELS[level];
  return (
    <label
      title="Effects intensity: Off, Calm, Normal, Epic, Max"
      className={
        "flex items-center gap-2 border border-[color:var(--edge)] bg-white/[0.02] px-2.5 py-1.5 " + className
      }
    >
      {level === 0 ? (
        <EyeOff size={12} strokeWidth={2.2} className="shrink-0 text-parchment-400" />
      ) : (
        <Sparkles
          size={12}
          strokeWidth={2.2}
          className={"shrink-0 " + (level >= 3 ? "text-gold-leaf" : "text-parchment-300")}
        />
      )}
      <input
        type="range"
        min={0}
        max={4}
        step={1}
        value={level}
        onChange={(e) => setFxLevel(Number(e.target.value) as FxLevel)}
        aria-label="Effects intensity"
        aria-valuetext={info.label}
        className="fx-slider w-20"
        list="fx-slider-ticks"
      />
      <datalist id="fx-slider-ticks">
        {FX_LEVELS.map((l, i) => (
          <option key={i} value={i} label={l.label} />
        ))}
      </datalist>
      <span
        className={
          "smallcaps w-10 shrink-0 text-[12px] " +
          (level === 0 ? "text-parchment-400" : level >= 3 ? "text-gold-leaf" : "text-parchment-300")
        }
      >
        {info.label}
      </span>
    </label>
  );
}
