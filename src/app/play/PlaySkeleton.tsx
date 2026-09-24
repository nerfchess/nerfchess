"use client";

// The bot setup card before it can render: the /play Suspense fallback (a hard
// load paints it until the card's ?mode= read resolves) and the card half of
// the route's loading.tsx.
//
// Built from the card's own parts (Group, Pill, TimeSlider) and the same
// class strings, so it has the card's exact geometry: the group labels and
// the option labels are real text, the options, sliders and Start button are
// the real controls held disabled, and only the values that depend on the
// player's choices (the selection, the mode caption, the slider readouts)
// are left out. The old skeleton stacked approximate bars (four
// time presets where the card has five, no mode caption, 32px slider blocks),
// so the card jumped when it swapped in.

import { Button } from "@/components/ui/Button";
import {
  BotStrengthLabel,
  formatTimeControl,
  Group,
  Pill,
  range,
  TIME_PRESETS,
  TIME_STEPS_SEC,
  TimeSlider,
} from "./setupParts";

const noop = () => {};

// The options with their real labels, disabled and unselected: a label that
// wraps at a phone width (Plain chess, Medium ~1500) makes its pill taller,
// which a fixed block cannot predict.
function Options({ labels }: { labels: React.ReactNode[] }) {
  return (
    <>
      {labels.map((label, i) => (
        <Pill key={i} selected={false} disabled>
          {label}
        </Pill>
      ))}
    </>
  );
}

export function BotSetupSkeleton() {
  return (
    <div className="mt-6 plate p-6 sm:p-7 space-y-6" aria-busy="true" aria-label="Loading bot setup">
      <div>
        <Group label="Game type">
          <Options labels={["Buff", "Nerf", "Plain chess"]} />
        </Group>
        {/* The one-line mode caption under the game type. */}
        <p className="mt-2 text-[13px] text-parchment-400">
          <span aria-hidden className="skeleton inline-block h-[1em] w-48 max-w-full align-middle" />
        </p>
      </div>
      <Group label="Bot strength">
        <Options labels={(["easy", "medium", "hard"] as const).map((d) => <BotStrengthLabel key={d} level={d} />)} />
      </Group>
      <Group label="Your color">
        <Options labels={["White", "Random", "Black"]} />
      </Group>
      <div className="space-y-4">
        <Group label="Time control">
          <Options labels={TIME_PRESETS.map((p) => p.label)} />
        </Group>
        <TimeSlider
          label="Time per side"
          value={0}
          values={[0, ...TIME_STEPS_SEC]}
          display=""
          formatEdgeLabel={formatTimeControl}
          loading
          onChange={noop}
        />
        <TimeSlider label="Increment (seconds)" value={0} values={range(0, 30, 1)} display="" loading onChange={noop} />
      </div>
      {/* The Start game button itself, held disabled until the card is live. */}
      <Button tone="leaf" disabled className="w-full py-3.5 text-lg flex">
        Start game
      </Button>
    </div>
  );
}
