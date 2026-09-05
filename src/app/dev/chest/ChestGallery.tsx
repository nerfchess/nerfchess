"use client";

import { useState } from "react";
import { DraftVault } from "@/components/DraftVault";

// Dev gallery for the draft vault: one vault per material band so the ladder
// (slate -> mythic) can be eyeballed side by side, with a click-to-replay
// opening on each. Sibling of /dev/plays and /dev/effects.

const BANDS: { tier: number; label: string }[] = [
  { tier: 2, label: "Tier 2 · slate" },
  { tier: 4, label: "Tier 4 · iron" },
  { tier: 6, label: "Tier 6 · gilt" },
  { tier: 8, label: "Tier 8 · arcane" },
  { tier: 9, label: "Tier 9 · apex" },
  { tier: 10, label: "Tier 10 · mythic" },
];

export function ChestGallery() {
  // Bumping a chest's key remounts it sealed; opening runs the full sequence.
  const [runs, setRuns] = useState<Record<number, { n: number; stage: "sealed" | "tearing" }>>({});

  const stageOf = (tier: number) => runs[tier]?.stage ?? "sealed";
  const open = (tier: number) =>
    setRuns((r) => ({ ...r, [tier]: { n: r[tier]?.n ?? 0, stage: "tearing" } }));
  const reset = (tier: number) =>
    setRuns((r) => ({ ...r, [tier]: { n: (r[tier]?.n ?? 0) + 1, stage: "sealed" } }));

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <h1 className="font-display text-2xl text-parchment">Draft vault ladder</h1>
      <p className="mt-1 text-sm text-parchment-400">
        Click a vault to play its opening; Reset re-seals it. The material climbs with the best
        card in the offer.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {BANDS.map((b) => (
          <div key={b.tier} className="plate flex flex-col items-center gap-3 p-5">
            <DraftVault
              key={runs[b.tier]?.n ?? 0}
              tier={b.tier}
              count={3}
              label={b.label}
              stage={stageOf(b.tier)}
              onOpen={() => open(b.tier)}
            />
            <button type="button" onClick={() => reset(b.tier)} className="btn-ghost press px-3 py-1.5 text-[13px]">
              Reset
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
