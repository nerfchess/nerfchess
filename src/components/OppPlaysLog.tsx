"use client";

import { BUFF_BY_ID } from "@/engine/buffs/library";
import { Tier } from "@/engine/nerf";
import { TIER_ROMAN } from "@/lib/tiers";
import { useEffect, useState } from "react";

// The feed of cards/hexes the opponent has played.
//
// Two homes, one record:
//  - Top-right feed (OppPlaysLog): every play lands here with its full rule
//    text and stays for FEED_TTL_MS (5 minutes), so a hex cast while you
//    looked away is still readable a long while later.
//  - Left dock (OppPlaysDockSection): the same plays live there permanently
//    for the rest of the game, so the opponent's whole line of play is always
//    reviewable at a glance.

export interface OppPlay {
  /** Stable, monotonic key for React (a counter, not the card id). */
  key: number;
  card: { id: string; tier: number };
  label: string;
  /** When the play landed (ms epoch). Drives the top-right 5-minute TTL. */
  at: number;
}

/** How long a play stays in the top-right feed before it retires to the
 * dock's permanent list. */
const FEED_TTL_MS = 5 * 60_000;
/** The feed never shows more than this many plays at once. */
const FEED_MAX = 5;

export function OppPlaysLog({ plays }: { plays: OppPlay[] }) {
  // Re-render on a slow tick so entries age out of the feed without any
  // parent state change. 10s granularity is plenty for a 5-minute TTL.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const now = Date.now();
  const fresh = plays.filter((p) => now - p.at < FEED_TTL_MS);
  const shown = fresh.slice(-FEED_MAX).reverse();
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

/** The permanent home of the same plays, rendered inside the left dock:
 * a compact, newest-first ledger of everything the opponent has played this
 * game. A row expands on click to show the full rule text, so nothing the
 * opponent did is ever more than one tap away. */
export function OppPlaysDockSection({ plays }: { plays: OppPlay[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!plays.length) return null;
  const newestFirst = [...plays].reverse();
  return (
    <div className="border-t border-white/10 pt-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="smallcaps text-[10px] text-parchment-400">Opponent played</span>
        <span className="font-mono text-[10px] tabular-nums text-parchment-400">{plays.length}</span>
      </div>
      <ul className="mt-1 space-y-0.5">
        {newestFirst.map((p) => {
          const def = BUFF_BY_ID[p.card.id];
          if (!def) return null;
          const tier = p.card.tier as Tier;
          const expanded = open === p.key;
          return (
            <li key={p.key}>
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : p.key)}
                aria-expanded={expanded}
                className="dock-card w-full border border-white/10 bg-white/[0.02] px-2 py-1 text-left transition hover:border-white/25"
              >
                <span className="flex items-center gap-1.5">
                  <span className={`min-w-0 flex-1 truncate font-display text-[11px] font-semibold tier-${tier}`}>
                    {def.name}
                  </span>
                  <span
                    className={`shrink-0 rounded-full border px-1.5 py-px font-display text-[9px] font-bold tier-bg-${tier} tier-${tier}`}
                  >
                    {TIER_ROMAN[tier]}
                  </span>
                </span>
                {expanded && (
                  <>
                    <span className="smallcaps mt-0.5 block text-[9px] text-parchment-400">{p.label}</span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-parchment-300">
                      {def.description}
                    </span>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
