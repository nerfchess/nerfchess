"use client";

import type { TurnCost } from "@/engine/buff";

// Small chip stating whether playing a card spends the holder's turn. Driven by
// engine.turnCost() so it always matches real behavior. Four states:
//   Uses your turn - activated, playing it is your move
//   Free action    - activated but resolves within your turn
//   Instant        - applies the moment you draft it
//   Passive        - always on while held (also every nerf)

const FULL_LABEL: Record<TurnCost, string> = {
  turn: "Uses your turn",
  free: "Free action",
  instant: "Instant",
  passive: "Passive",
};

// Tight-space label for the in-game dock rows.
const SHORT_LABEL: Record<TurnCost, string> = {
  turn: "Uses turn",
  free: "Free action",
  instant: "Instant",
  passive: "Passive",
};

// The turn-spending card wears the warm accent so the one real cost stands out;
// the free/instant/passive states read progressively quieter.
const TONE: Record<TurnCost, string> = {
  turn: "border-gold/45 bg-gold/12 text-gold-leaf",
  free: "border-verdigris-glow/50 bg-verdigris/12 text-verdigris-glow",
  instant: "border-bruise/50 bg-bruise/12 text-bruise-glow",
  passive: "border-white/15 bg-white/[0.03] text-parchment-400",
};

const TITLE: Record<TurnCost, string> = {
  turn: "Using this card is your move for the turn.",
  free: "Free action: using this card does not use up your turn.",
  instant: "Applies the moment you draft it. It does not use a turn.",
  passive: "Always active while held. Nothing to activate; it does not use a turn.",
};

export function TurnCostBadge({
  cost,
  short = false,
  className = "",
}: {
  cost: TurnCost;
  /** Use the tighter label set (in-game dock). */
  short?: boolean;
  className?: string;
}) {
  return (
    <span
      title={TITLE[cost]}
      className={
        "inline-flex shrink-0 items-center rounded-sm border px-1 py-px text-[8px] font-semibold leading-none " +
        TONE[cost] +
        (className ? " " + className : "")
      }
    >
      {(short ? SHORT_LABEL : FULL_LABEL)[cost]}
    </span>
  );
}
