"use client";

// The studio DECK: preset swatch chips pinned on top (each with a 3-color
// palette strip sampled from its grade), then the smallcaps tab rail and the
// active panel. The rail scrolls horizontally on narrow phones.

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  STYLE_DEFAULTS,
  STYLE_PRESETS,
  gradeSwatch,
  type StylePreset,
} from "../clipStyles";
import type { Studio } from "./controls";
import { StylePanel } from "./panels/StylePanel";
import { CamPanel } from "./panels/CamPanel";
import { FxPanel } from "./panels/FxPanel";
import { PacePanel } from "./panels/PacePanel";
import { GradePanel } from "./panels/GradePanel";
import { TextPanel } from "./panels/TextPanel";
import { AudioPanel } from "./panels/AudioPanel";
import { ExplainPanel } from "./panels/ExplainPanel";
import { BrandPanel } from "./panels/BrandPanel";
import { FormatPanel } from "./panels/FormatPanel";

const TABS = [
  "STYLE", "CAM", "FX", "PACE", "GRADE", "TEXT", "AUDIO", "EXPLAIN", "BRAND", "FORMAT",
] as const;
export type DeckTab = (typeof TABS)[number];

const PANELS: Record<DeckTab, (props: { studio: Studio }) => React.ReactNode> = {
  STYLE: StylePanel,
  CAM: CamPanel,
  FX: FxPanel,
  PACE: PacePanel,
  GRADE: GradePanel,
  TEXT: TextPanel,
  AUDIO: AudioPanel,
  EXPLAIN: ExplainPanel,
  BRAND: BrandPanel,
  FORMAT: FormatPanel,
};

function Swatch({ colors }: { colors: [string, string, string] }) {
  return (
    <span className="clip-swatch" aria-hidden>
      {colors.map((c, i) => (
        <span key={i} style={{ background: c }} />
      ))}
    </span>
  );
}

interface Props {
  studio: Studio;
  presetId: string | null;
  applyPreset: (p: StylePreset) => void;
  surpriseMe: () => void;
}

export function Deck({ studio, presetId, applyPreset, surpriseMe }: Props) {
  const [tab, setTab] = useState<DeckTab>("STYLE");
  const { accent, opts, locked } = studio;
  const Panel = PANELS[tab];
  return (
    <div data-clip-deck>
      <div className="clip-presets" role="group" aria-label="Style presets">
        {STYLE_PRESETS.map((p) => {
          const grade = p.style.grade ?? STYLE_DEFAULTS.grade;
          return (
            <Button
              key={p.id}
              tone="ghost"
              size="xs"
              onClick={() => applyPreset(p)}
              disabled={locked}
              aria-pressed={presetId === p.id}
              className={
                "shrink-0 " + (presetId === p.id ? "text-gold-leaf" : "text-parchment-300")
              }
            >
              <Swatch colors={gradeSwatch(grade, accent, opts.style.duotoneA, opts.style.duotoneB)} />
              {p.label}
            </Button>
          );
        })}
        <Button
          tone="ghost"
          size="xs"
          onClick={surpriseMe}
          disabled={locked}
          aria-pressed={presetId === "surprise"}
          className={
            "shrink-0 " + (presetId === "surprise" ? "text-gold-leaf" : "text-parchment-300")
          }
        >
          <Swatch
            colors={gradeSwatch(opts.style.grade, accent, opts.style.duotoneA, opts.style.duotoneB)}
          />
          Surprise me
        </Button>
      </div>

      <div className="clip-deck-tabs" role="tablist" aria-label="Control deck">
        {TABS.map((id) => (
          <Button
            key={id}
            tone="quiet"
            size="xs"
            press={false}
            role="tab"
            aria-selected={tab === id}
            data-clip-tab={id}
            onClick={() => setTab(id)}
            className="clip-deck-tab"
          >
            {id}
          </Button>
        ))}
      </div>

      <div role="tabpanel" aria-label={tab} data-clip-panel={tab}>
        <Panel studio={studio} />
      </div>
    </div>
  );
}
