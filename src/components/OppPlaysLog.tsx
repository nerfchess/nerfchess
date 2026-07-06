"use client";

import { BUFF_BY_ID } from "@/engine/buffs/library";
import { Tier } from "@/engine/nerf";
import { TIER_ROMAN } from "@/lib/tiers";

// A persistent feed of the cards/hexes the opponent has played, docked to the
// top-right edge so it never covers the board. Replaces the old single toast
// that vanished after a few seconds: the newest play shows its full rule text
// (with an entrance animation) so a hex cast on you is never a mystery, and
// older plays collapse to a name+tier line but STAY, so you can still read what
// hit you if you looked away when it landed.

export interface OppPlay {
  /** Stable, monotonic key for React (a counter, not the card id). */
  key: number;
  card: { id: string; tier: number };
  label: string;
}

export function OppPlaysLog({ plays }: { plays: OppPlay[] }) {
  // Newest first; keep the last handful so the feed never grows without bound.
  const shown = plays.slice(-6).reverse();
  if (!shown.length) return null;
  return (
    <div className="pointer-events-none fixed right-3 top-16 z-40 flex w-[min(80vw,20rem)] flex-col gap-1">
      {shown.map((p, i) => {
        const def = BUFF_BY_ID[p.card.id];
        if (!def) return null;
        const tier = p.card.tier as Tier;
        const newest = i === 0;
        return (
          <div
            key={p.key}
            role={newest ? "status" : undefined}
            aria-live={newest ? "polite" : undefined}
            className={
              "border bg-ink-700/95 px-3 shadow-plate backdrop-blur-sm " +
              (newest ? "border-gold/40 py-2.5 animate-rise" : "border-white/10 py-1.5 opacity-85")
            }
          >
            <div className="flex items-center justify-between gap-3">
              <span className={`min-w-0 truncate font-display ${newest ? "text-lg" : "text-[12px]"} font-semibold leading-tight tier-${tier}`}>
                {def.name}
              </span>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 font-display text-[10px] font-bold tier-bg-${tier} tier-${tier}`}
              >
                {TIER_ROMAN[tier]}
              </span>
            </div>
            {newest && (
              <>
                <div className="smallcaps mt-0.5 text-[10px] text-parchment-400">{p.label}</div>
                <p className="mt-1 text-xs leading-snug text-parchment-300">{def.description}</p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
