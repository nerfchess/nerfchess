"use client";

// PACE: the reel's clock. Global speed, slow-motion depth, the speed ramp,
// freeze frames, stutter cuts, and the between-ply cut style.

import { SLOWMO_OPTIONS, SPEED_OPTIONS, TRANSITION_OPTIONS } from "../../clipOptions";
import { ChoiceRow, ToggleRow, type Studio } from "../controls";

export function PacePanel({ studio }: { studio: Studio }) {
  const { opts, set, setStyle, locked } = studio;
  const s = opts.style;
  return (
    <div className="clip-panel">
      <ChoiceRow label="Speed" options={SPEED_OPTIONS} value={s.speed} onPick={(v) => setStyle({ speed: v })} disabled={locked} />
      <ChoiceRow label="Slow-mo" options={SLOWMO_OPTIONS} value={s.slowmo} onPick={(v) => setStyle({ slowmo: v })} disabled={locked} />
      <ToggleRow
        label="Rhythm"
        disabled={locked}
        toggles={[
          { label: "Speed ramp", on: opts.speedRamp, onClick: () => set("speedRamp", !opts.speedRamp) },
          { label: "Freeze frames", on: s.captureFreeze, onClick: () => setStyle({ captureFreeze: !s.captureFreeze }) },
          { label: "Stutter cuts", on: s.stutter, onClick: () => setStyle({ stutter: !s.stutter }) },
        ]}
      />
      <ChoiceRow label="Cuts" options={TRANSITION_OPTIONS} value={s.transition} onPick={(v) => setStyle({ transition: v })} disabled={locked} />
    </div>
  );
}
