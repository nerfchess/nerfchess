"use client";

import { BUFF_BY_ID } from "@/engine/buffs/library";
import { Tier } from "@/engine/nerf";
import { TIER_ROMAN } from "@/lib/tiers";

// Transient toast explaining a card the other side just played: name, tier,
// and the full rule text, so its effect on the board is never a mystery.
// Docked to the top-right edge so it never covers the board; the effect
// itself animates on the affected squares (freeze flash, strike...).
export function BuffUsedToast({
  card,
  label,
}: {
  card: { id: string; tier: number };
  label: string;
}) {
  const def = BUFF_BY_ID[card.id];
  if (!def) return null;
  const tier = card.tier as Tier;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed right-3 top-16 z-40 w-[min(80vw,20rem)] animate-rise border border-gold/40 bg-ink-700/95 p-3 shadow-plate backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="smallcaps text-[10px] text-parchment-400">{label}</span>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 font-display text-[10px] font-bold tier-bg-${tier} tier-${tier}`}
        >
          {TIER_ROMAN[tier]}
        </span>
      </div>
      <div className={`mt-0.5 font-display text-lg leading-tight tier-${tier}`}>{def.name}</div>
      <p className="mt-1 text-xs leading-snug text-parchment-300">{def.description}</p>
    </div>
  );
}
