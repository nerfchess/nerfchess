"use client";

// PACE: the reel's clock. Global speed, slow-motion depth, the speed ramp,
// freeze frames, stutter cuts, beat-synced cuts, and the between-ply cut
// style.

import { SLOWMO_OPTIONS, SPEED_OPTIONS, TRACK_META, TRANSITION_OPTIONS } from "../../clipOptions";
import { ChoiceRow, Row, Chip, ToggleRow, type Studio } from "../controls";

export function PacePanel({ studio }: { studio: Studio }) {
  const { opts, set, setStyle, locked, customMusic } = studio;
  const s = opts.style;
  // Beat sync needs a BPM map: built-in tracks carry one, imported audio
  // does not, and with music off there is no grid to snap to.
  const beatBlocked = !opts.musicOn || !!customMusic;
  const beatNote = !opts.musicOn
    ? "music is off"
    : customMusic
      ? "imported audio has no BPM map"
      : `${TRACK_META[opts.musicTrack].bpm} bpm grid`;
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
      <Row label="Beat">
        <Chip
          label="Sync cuts to beat"
          on={s.beatSync && !beatBlocked}
          onClick={() => setStyle({ beatSync: !s.beatSync })}
          disabled={locked || beatBlocked}
          title="Snap ply starts to the track's beat grid (max shift 40% of a beat)"
        />
        <span className="clip-readout">{beatNote}</span>
      </Row>
      <ChoiceRow label="Cuts" options={TRANSITION_OPTIONS} value={s.transition} onPick={(v) => setStyle({ transition: v })} disabled={locked} />
    </div>
  );
}
