"use client";

import { useState } from "react";
import type { Tier } from "@/engine/nerf";
import { DraftOverlay } from "@/components/DraftOverlay";

// Dev harness for the buff-draft overlay. Sibling of /dev/chest, /dev/plays
// and /dev/effects, and it exists for the same reason they do: the overlay is
// only reachable mid-game after five moves, which makes a layout regression in
// it expensive to see and nearly impossible to screenshot repeatably.
//
// The presets below are the shapes that actually broke: a two-card offer with
// wildly UNEVEN description lengths (the grid row stretches to the taller card,
// so the shorter card's selection ring and check badge have somewhere wrong to
// go), plus a three-card prepped offer and a top-tier offer. Pick a card to see
// the selected state, which is the state the centring bug shows up in.

interface Preset {
  key: string;
  label: string;
  note: string;
  cards: { id: string; tier: Tier }[];
  index: number;
  noun: string;
}

const PRESETS: Preset[] = [
  {
    key: "uneven",
    label: "Uneven pair (tier I)",
    note: "The reported case: a short card beside a long one, so the row stretches.",
    cards: [
      { id: "op_hoofbeat_log", tier: 1 },
      { id: "op_hearth_blessing", tier: 1 },
    ],
    index: 1,
    noun: "buff",
  },
  {
    key: "opening",
    label: "Opening pick",
    note: "Offer index 0 wears the 'Opening pick' label instead of a round number.",
    cards: [
      { id: "op_hoofbeat_log", tier: 1 },
      { id: "op_hearth_blessing", tier: 1 },
    ],
    index: 0,
    noun: "buff",
  },
  {
    key: "prepped",
    label: "Three-card prepped offer",
    note: "A prepped offer deals three cards; the grid goes to three columns on desktop.",
    cards: [
      { id: "op_hoofbeat_log", tier: 3 },
      { id: "op_hearth_blessing", tier: 3 },
      { id: "op_hoofbeat_log", tier: 4 },
    ],
    index: 3,
    noun: "buff",
  },
];

export function DraftGallery() {
  const [active, setActive] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const preset = PRESETS.find((p) => p.key === active) ?? null;

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="font-display text-2xl text-parchment">Draft overlay harness</h1>
      <p className="mt-1 text-sm text-parchment-400">
        Open a preset, then click a card to select it. Check that the ember frame is centred, that
        the selection ring and its check badge hug the card face (not the grid row), and that a
        glossary term&apos;s popover is not clipped by the panel&apos;s scroll box. Narrow the
        viewport to 390px wide to reproduce the mobile layout.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        {PRESETS.map((p) => (
          <div key={p.key} className="plate flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="font-display text-[15px] text-parchment-100">{p.label}</div>
              <div className="mt-0.5 text-[12px] text-parchment-400">{p.note}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setRun((n) => n + 1);
                setActive(p.key);
              }}
              className="btn-ghost press shrink-0 px-3 py-1.5 text-[13px]"
            >
              Open
            </button>
          </div>
        ))}
      </div>

      {preset && (
        <DraftOverlay
          key={`${preset.key}-${run}`}
          offer={{ cards: preset.cards, index: preset.index }}
          cardNoun={preset.noun}
          rerollsLeft={1}
          onReroll={() => {}}
          onPick={() => setActive(null)}
          onBank={() => setActive(null)}
          clocks={{ mine: 120_000, theirs: 120_000 }}
        />
      )}
    </main>
  );
}
