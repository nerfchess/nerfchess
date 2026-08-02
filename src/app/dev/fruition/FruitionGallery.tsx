"use client";

// Hand-trigger harness for the fx-event animation layers. Feeds synthetic
// FxEvent arrays into the real FruitionLayer and ClockRaidLayer (fresh array
// per press, exactly like the engine's per-cycle log), so what plays here is
// what plays in a game. Dev-only; no engine, no server.

import { useState } from "react";
import type { ActiveEffect } from "@/engine/buff";
import type { FxEvent } from "@/engine/fxEvents";
import { effectVictim } from "@/engine/fxEvents";
import { FruitionLayer } from "@/components/effects/fruition/FruitionLayer";
import { ClockRaidLayer } from "@/components/effects/clockraid/ClockRaidLayer";
import { ClockPill } from "@/components/ClockPill";

const PLY = { n: 1 };

// Distributive omit: Omit over the FxEvent union collapses to common keys.
type NoPly<T> = T extends unknown ? Omit<T, "ply"> : never;
function ev(e: NoPly<FxEvent>): FxEvent {
  return { ...e, ply: PLY.n++ } as FxEvent;
}

const applied = (effect: ActiveEffect, sourceCardId?: string): FxEvent =>
  ev({ kind: "effect-applied", effect, victim: effectVictim(effect), sourceCardId });
const expired = (effect: ActiveEffect): FxEvent =>
  ev({ kind: "effect-expired", effect, victim: effectVictim(effect) });

const TRIGGERS: { label: string; make: () => FxEvent[] }[] = [
  {
    label: "Nerf constrained (clamp)",
    make: () => [
      ev({ kind: "nerf-constrained", color: "w", nerfId: "demo", removed: 6, fromSquares: [1, 6, 11] }),
    ],
  },
  { label: "Nerf relaxed (release)", make: () => [ev({ kind: "nerf-relaxed", color: "w", nerfId: "demo" })] },
  { label: "Receive: freeze", make: () => [applied({ kind: "freeze", sq: 27, owner: "w", turns: 2 })] },
  {
    label: "Receive: barred wall",
    make: () => [applied({ kind: "barred", squares: [24, 25, 26, 27, 28, 29, 30, 31], against: "w", turns: 3 })],
  },
  { label: "Receive: king only (frame)", make: () => [applied({ kind: "king_only", against: "w", turns: 2 })] },
  {
    label: "Ward: shield rises",
    make: () => [applied({ kind: "shield", owner: "w", squares: [3, 4, 5], turns: 3 })],
  },
  { label: "Expire: freeze thaws", make: () => [expired({ kind: "freeze", sq: 27, owner: "w", turns: 0 })] },
  { label: "Expire: leash lifts", make: () => [expired({ kind: "short_leash", owner: "w", turns: 0 })] },
  {
    label: "Clock raid: Time Thief (steal)",
    make: () => [
      ev({
        kind: "clock-fx",
        caster: "w",
        sourceCardId: "time_thief",
        request: { caster: "w", stealFractionOfOpp: 0.5, stealCapSec: 75 },
      }),
    ],
  },
  {
    label: "Clock raid: flat drain (-60s)",
    make: () => [
      ev({ kind: "clock-fx", caster: "w", sourceCardId: "alt_f4", request: { caster: "w", subOppSec: 60 } }),
    ],
  },
  {
    label: "Clock raid: gift (+35s)",
    make: () => [
      ev({ kind: "clock-fx", caster: "w", sourceCardId: "overtime", request: { caster: "w", addSelfSec: 35 } }),
    ],
  },
];

export default function FruitionGallery() {
  const [fx, setFx] = useState<FxEvent[] | null>(null);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-xl text-parchment">Fruition and clock-raid harness</h1>
      <p className="mt-1 text-sm text-parchment-400">
        Each button feeds one synthetic fx cycle into the real layers. The viewer is white, bottom.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {TRIGGERS.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => setFx(t.make())}
            className="rounded-[1px] border border-[color:var(--edge)] bg-white/[0.04] px-3 py-1.5 font-display text-[13px] text-parchment-200 hover:bg-white/[0.08]"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Fake opponent clock, the raid's victim. */}
      <div className="mt-6 flex justify-end">
        <ClockPill ms={183_000} active={false} compact seat="b" />
      </div>

      {/* Mini board with the real FruitionLayer on top. */}
      <div className="relative mx-auto mt-3 aspect-square w-full max-w-[28rem]">
        <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 overflow-hidden">
          {Array.from({ length: 64 }, (_, i) => {
            const file = i % 8;
            const rank = 7 - Math.floor(i / 8);
            const dark = (file + rank) % 2 === 1;
            return <div key={i} className={dark ? "bg-ink-900/70" : "bg-ink-800/40"} />;
          })}
        </div>
        <FruitionLayer fx={fx} viewerColor="w" orientation="w" />
      </div>

      {/* Your clock, the raid's beneficiary. */}
      <div className="mt-3 flex justify-start">
        <ClockPill ms={97_000} active={false} compact seat="w" />
      </div>

      <ClockRaidLayer fx={fx} />
    </main>
  );
}
