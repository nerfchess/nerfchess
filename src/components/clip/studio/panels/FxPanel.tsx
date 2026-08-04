"use client";

// FX: the finishing passes. Where wave 2 shipped only on/off switches, the
// heavy hitters now carry intensity dials (glitch violence, bloom strength,
// particle density), each with a live tabular-mono readout.

import { CHROMATIC_OPTIONS, GRAIN_OPTIONS, PARTICLE_OPTIONS } from "../../clipOptions";
import { ChoiceRow, SliderRow, ToggleRow, type Studio } from "../controls";

export function FxPanel({ studio }: { studio: Studio }) {
  const { opts, setStyle, locked } = studio;
  const s = opts.style;
  return (
    <div className="clip-panel">
      <ChoiceRow label="Chromatic" options={CHROMATIC_OPTIONS} value={s.chromatic} onPick={(v) => setStyle({ chromatic: v })} disabled={locked} />
      <ChoiceRow label="Grain" options={GRAIN_OPTIONS} value={s.grain} onPick={(v) => setStyle({ grain: v })} disabled={locked} />
      <ChoiceRow label="Particles" options={PARTICLE_OPTIONS} value={s.particles} onPick={(v) => setStyle({ particles: v })} disabled={locked} />
      <SliderRow
        label="Density"
        value={s.particleDensity}
        onChange={(v) => setStyle({ particleDensity: v })}
        disabled={locked || s.particles === "off"}
      />
      <ToggleRow
        label="Glitch"
        disabled={locked}
        toggles={[{ label: "Bursts", on: s.glitch, onClick: () => setStyle({ glitch: !s.glitch }) }]}
      />
      <SliderRow
        label="Amount"
        value={s.glitchAmount}
        onChange={(v) => setStyle({ glitchAmount: v })}
        disabled={locked || !s.glitch}
      />
      <ToggleRow
        label="Bloom"
        disabled={locked}
        toggles={[{ label: "Swell", on: s.bloom, onClick: () => setStyle({ bloom: !s.bloom }) }]}
      />
      <SliderRow
        label="Strength"
        value={s.bloomAmount}
        onChange={(v) => setStyle({ bloomAmount: v })}
        disabled={locked || !s.bloom}
      />
      <ToggleRow
        label="Finish"
        disabled={locked}
        toggles={[
          { label: "Letterbox", on: s.letterbox, onClick: () => setStyle({ letterbox: !s.letterbox }) },
          { label: "VHS", on: s.vhs, onClick: () => setStyle({ vhs: !s.vhs }) },
          { label: "Invert flash", on: s.invertFlash, onClick: () => setStyle({ invertFlash: !s.invertFlash }) },
        ]}
      />
    </div>
  );
}
