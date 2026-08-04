"use client";

// STYLE: the overlay layer. Stamps, meters, and flourish toggles that decide
// how much editorial furniture rides on top of the board.

import { ToggleRow, type Studio } from "../controls";

export function StylePanel({ studio }: { studio: Studio }) {
  const { opts, set, setStyle, locked } = studio;
  const s = opts.style;
  return (
    <div className="clip-panel">
      <ToggleRow
        label="Stamps"
        disabled={locked}
        toggles={[
          { label: "Move verdicts", on: s.verdictStamps, onClick: () => setStyle({ verdictStamps: !s.verdictStamps }) },
          { label: "Final verdict", on: opts.freezeStamp, onClick: () => set("freezeStamp", !opts.freezeStamp) },
        ]}
      />
      <ToggleRow
        label="Meters"
        disabled={locked}
        toggles={[
          { label: "Momentum bar", on: opts.momentumBar, onClick: () => set("momentumBar", !opts.momentumBar) },
          { label: "Move counter", on: opts.moveCounter, onClick: () => set("moveCounter", !opts.moveCounter) },
          { label: "Score bug", on: s.scoreBug, onClick: () => setStyle({ scoreBug: !s.scoreBug }) },
        ]}
      />
      <ToggleRow
        label="Flourish"
        disabled={locked}
        toggles={[
          { label: "Flame trail", on: s.flameTrail, onClick: () => setStyle({ flameTrail: !s.flameTrail }) },
          { label: "Confetti", on: s.confetti, onClick: () => setStyle({ confetti: !s.confetti }) },
        ]}
      />
    </div>
  );
}
