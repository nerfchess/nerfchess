"use client";

// BRAND: watermark (handle text, corner, opacity dial) and the end card
// (call-to-action line). The reel is an ad for the game; this tab decides how
// loudly it says so.

import { CORNER_OPTIONS } from "../../clipOptions";
import { ChoiceRow, Row, SliderRow, ToggleRow, type Studio } from "../controls";

export function BrandPanel({ studio }: { studio: Studio }) {
  const { opts, set, setStyle, locked } = studio;
  const s = opts.style;
  return (
    <div className="clip-panel">
      <ToggleRow
        label="Watermark"
        disabled={locked}
        toggles={[{ label: "Burned handle", on: opts.watermarkOn, onClick: () => set("watermarkOn", !opts.watermarkOn) }]}
      />
      <Row label="Handle">
        <input
          type="text"
          value={opts.handle}
          maxLength={40}
          disabled={locked || !opts.watermarkOn}
          onChange={(e) => set("handle", e.target.value)}
          aria-label="Watermark handle"
          className="clip-input"
        />
      </Row>
      <ChoiceRow label="Corner" options={CORNER_OPTIONS} value={s.watermarkCorner} onPick={(v) => setStyle({ watermarkCorner: v })} disabled={locked || !opts.watermarkOn} />
      <SliderRow
        label="Opacity"
        value={s.watermarkOpacity}
        onChange={(v) => setStyle({ watermarkOpacity: v })}
        disabled={locked || !opts.watermarkOn}
      />
      <ToggleRow
        label="End card"
        disabled={locked}
        toggles={[{ label: "Outro card", on: opts.endCard, onClick: () => set("endCard", !opts.endCard) }]}
      />
      <Row label="CTA">
        <input
          type="text"
          value={opts.ctaText}
          maxLength={40}
          disabled={locked || !opts.endCard}
          onChange={(e) => set("ctaText", e.target.value)}
          aria-label="End card text"
          placeholder="nerfchess.com"
          className="clip-input"
        />
      </Row>
    </div>
  );
}
