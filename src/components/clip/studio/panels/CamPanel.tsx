"use client";

// CAM: everything that moves the imaginary camera. Zoom style plus the new
// target bias and punch-in timing dials, drift, shake, and the toggles.

import {
  DRIFT_OPTIONS,
  PUNCH_TIMING_OPTIONS,
  SHAKE_OPTIONS,
  ZOOM_BIAS_OPTIONS,
  ZOOM_OPTIONS,
} from "../../clipOptions";
import { ChoiceRow, ToggleRow, type Studio } from "../controls";

export function CamPanel({ studio }: { studio: Studio }) {
  const { opts, setStyle, locked } = studio;
  const s = opts.style;
  return (
    <div className="clip-panel">
      <ChoiceRow label="Zoom" options={ZOOM_OPTIONS} value={s.zoom} onPick={(v) => setStyle({ zoom: v })} disabled={locked} />
      <ChoiceRow label="Aim" options={ZOOM_BIAS_OPTIONS} value={s.zoomBias} onPick={(v) => setStyle({ zoomBias: v })} disabled={locked || s.zoom === "off"} />
      <ChoiceRow label="Punch" options={PUNCH_TIMING_OPTIONS} value={s.punchTiming} onPick={(v) => setStyle({ punchTiming: v })} disabled={locked || s.zoom === "off"} />
      <ChoiceRow label="Drift" options={DRIFT_OPTIONS} value={s.driftCam} onPick={(v) => setStyle({ driftCam: v })} disabled={locked} />
      <ChoiceRow label="Shake" options={SHAKE_OPTIONS} value={s.shake} onPick={(v) => setStyle({ shake: v })} disabled={locked} />
      <ToggleRow
        label="Moves"
        disabled={locked}
        toggles={[
          { label: "Follow cam", on: s.followCam, onClick: () => setStyle({ followCam: !s.followCam }) },
          { label: "Payoff dolly", on: s.payoffDolly, onClick: () => setStyle({ payoffDolly: !s.payoffDolly }) },
          { label: "Tilt sway", on: s.tiltSway, onClick: () => setStyle({ tiltSway: !s.tiltSway }) },
        ]}
      />
    </div>
  );
}
