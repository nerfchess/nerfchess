"use client";

// The "most dealt rules" table, shared by both stat scopes.
//
// getNerf is pulled from the card engine lazily so the ~26k-line library stays
// out of the stats pages' initial bundle. The pages mount this table only
// after the mod check passes, so the chunk is fetched for moderators alone.

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Nerf } from "@/engine/nerf";
import { TIER_LABEL, TIER_ROMAN } from "@/lib/tiers";
import type { NerfRow } from "@/components/mod/stats/useSiteStats";

export function RulesTable({ rows }: { rows: NerfRow[] }) {
  const [getNerf, setGetNerf] = useState<((id: string) => Nerf | undefined) | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("@/engine/nerfs/library").then((m) => {
      if (!cancelled) setGetNerf(() => m.getNerf);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mt-10">
      <div className="rule-ornament mb-4">
        <span className="font-display">Most dealt rules</span>
      </div>
      {!getNerf ? (
        <p className="text-sm text-parchment-400">Loading the library…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-parchment-400">No games recorded yet.</p>
      ) : (
        <div className="plate overflow-hidden">
          <div className="grid grid-cols-[1fr_3.25rem_3.25rem_3.75rem] sm:grid-cols-[1fr_5rem_5rem_5rem] items-center border-b border-white/8 px-3 sm:px-4 py-3 text-[10px] text-parchment-400">
            <span>Rule</span>
            <span className="text-right">Dealt</span>
            <span className="text-right">Wins</span>
            <span className="text-right">Win rate</span>
          </div>
          {rows.map((row, i) => {
            const nerf = getNerf(row.id);
            return (
              <div
                key={row.id}
                className={
                  "grid grid-cols-[1fr_3.25rem_3.25rem_3.75rem] sm:grid-cols-[1fr_5rem_5rem_5rem] items-center border-b border-white/5 px-3 sm:px-4 py-2.5 text-sm " +
                  (i % 2 ? "bg-white/[0.015]" : "")
                }
              >
                <span className="flex min-w-0 items-center gap-2">
                  {nerf ? (
                    <>
                      <span className={`truncate font-display font-semibold tier-${nerf.tier}`}>
                        {nerf.name}
                      </span>
                      <span
                        className="shrink-0 text-[9px] text-parchment-400"
                        title={`Difficulty ${nerf.tier}: ${TIER_LABEL[nerf.tier]}`}
                      >
                        {TIER_ROMAN[nerf.tier]}
                      </span>
                    </>
                  ) : (
                    <span className="truncate font-mono text-parchment-300">{row.id}</span>
                  )}
                </span>
                <span className="text-right font-mono text-parchment-100 tabular-nums">{row.dealt}</span>
                <span className="text-right font-mono text-parchment-300 tabular-nums">{row.wins}</span>
                <span className="text-right font-mono text-parchment-100 tabular-nums">
                  {row.dealt > 0 ? `${Math.round((row.wins / row.dealt) * 100)}%` : "-"}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-xs text-parchment-400">
        Win rate is how often the player holding that rule won the game. Curious what a
        rule does? Look it up in the <Link href="/codex" className="text-gold-leaf hover:underline">Codex</Link>.
      </p>
    </div>
  );
}
