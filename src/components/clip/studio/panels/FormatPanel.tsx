"use client";

// FORMAT: frame geometry and the clip window, plus the one-tap reset back to
// TikTok mode. Resolution readouts ride the aspect chips in mono.

import { Button } from "@/components/ui/Button";
import { ASPECTS, LENGTH_OPTIONS } from "../../clipOptions";
import { Chip, Row, type Studio } from "../controls";

export function FormatPanel({ studio }: { studio: Studio }) {
  const { opts, set, locked, pliesChoice, setPliesChoice, resetTikTok } = studio;
  const current = ASPECTS.find((a) => a.id === opts.aspect);
  return (
    <div className="clip-panel">
      <Row label="Frame">
        {ASPECTS.map((a) => (
          <Chip
            key={a.id}
            label={a.label}
            on={opts.aspect === a.id}
            onClick={() => set("aspect", a.id)}
            disabled={locked}
            title={a.res}
          />
        ))}
      </Row>
      <div className="clip-row">
        <span className="clip-row-label">Output</span>
        <div className="clip-row-body">
          <span className="clip-readout">{current?.res ?? ""} 30fps</span>
        </div>
      </div>
      <Row label="Window">
        {LENGTH_OPTIONS.map((num) => (
          <Chip
            key={String(num)}
            label={num === "auto" ? "Auto" : `Last ${num}`}
            on={pliesChoice === num}
            onClick={() => setPliesChoice(num)}
            disabled={locked}
          />
        ))}
      </Row>
      <Row label="Reset">
        <Button tone="ghost" size="xs" disabled={locked} onClick={resetTikTok} className="text-parchment-300">
          TikTok mode
        </Button>
      </Row>
    </div>
  );
}
