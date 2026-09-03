"use client";

// TEXT: the hook line, caption behavior, and the burned-type dials. Caption
// ink source (auto from grade / accent / white / custom hex), size, vertical
// parking, and the stamp rotation dial.

import {
  CAPTION_COLOR_OPTIONS,
  CAPTION_PACK_OPTIONS,
  CAPTION_POS_OPTIONS,
  CAPTION_SIZE_OPTIONS,
  CAPTION_STYLES,
  EMOJI_LEVELS,
  HOOK_PRESETS,
  STAMP_ROT_OPTIONS,
  TITLE_TEMPLATE_OPTIONS,
} from "../../clipOptions";
import { Chip, ChoiceRow, HexWell, Row, type Studio } from "../controls";

export function TextPanel({ studio }: { studio: Studio }) {
  const { opts, set, setStyle, locked, hookText, hookSuggestion, editHook } = studio;
  const s = opts.style;
  return (
    <div className="clip-panel">
      {/* Intro title templates: each restyles the hook slam's typography and
          (except Custom) auto-fills the line, card name included. */}
      <ChoiceRow
        label="Template"
        options={TITLE_TEMPLATE_OPTIONS}
        value={s.titleTemplate}
        onPick={(v) => setStyle({ titleTemplate: v })}
        disabled={locked}
      />
      <div className="clip-row">
        <span className="clip-row-label">Hook</span>
        <input
          type="text"
          value={hookText}
          maxLength={80}
          disabled={locked}
          onChange={(e) => {
            // Typing takes the hook back to free text.
            if (s.titleTemplate !== "custom") setStyle({ titleTemplate: "custom" });
            editHook(e.target.value);
          }}
          aria-label="Hook caption"
          placeholder="Hook text burned at the top"
          className="clip-input font-display"
        />
      </div>
      <Row label="Presets">
        {[hookSuggestion, ...HOOK_PRESETS.filter((p) => p !== hookSuggestion)]
          .slice(0, 4)
          .map((preset) => (
            <Chip
              key={preset}
              label={preset}
              on={hookText === preset}
              onClick={() => {
                if (s.titleTemplate !== "custom") setStyle({ titleTemplate: "custom" });
                editHook(preset);
              }}
              disabled={locked}
            />
          ))}
      </Row>
      <ChoiceRow label="Captions" options={CAPTION_STYLES} value={opts.captionStyle} onPick={(v) => set("captionStyle", v)} disabled={locked} />
      <ChoiceRow label="Pack" options={CAPTION_PACK_OPTIONS} value={s.captionPack} onPick={(v) => setStyle({ captionPack: v })} disabled={locked || opts.captionStyle === "off"} />
      <ChoiceRow label="Ink" options={CAPTION_COLOR_OPTIONS} value={s.captionColor} onPick={(v) => setStyle({ captionColor: v })} disabled={locked || opts.captionStyle === "off"} />
      {s.captionColor === "custom" && (
        <Row label="Hex">
          <HexWell
            label="Caption hex"
            value={s.captionHex}
            onCommit={(hex) => setStyle({ captionHex: hex })}
            disabled={locked}
          />
        </Row>
      )}
      <ChoiceRow label="Size" options={CAPTION_SIZE_OPTIONS} value={s.captionSize} onPick={(v) => setStyle({ captionSize: v })} disabled={locked || opts.captionStyle === "off"} />
      <ChoiceRow label="Park" options={CAPTION_POS_OPTIONS} value={s.captionPos} onPick={(v) => setStyle({ captionPos: v })} disabled={locked || opts.captionStyle === "off"} />
      <ChoiceRow label="Rotation" options={STAMP_ROT_OPTIONS} value={s.stampRotation} onPick={(v) => setStyle({ stampRotation: v })} disabled={locked} />
      <ChoiceRow label="Emoji" options={EMOJI_LEVELS} value={opts.emojiLevel} onPick={(v) => set("emojiLevel", v)} disabled={locked} />
      {/* Commentary track: the creator's own voice layer. Notes are written
          per ply from the timeline cell strip; this is the master switch. */}
      <Row label="Notes">
        <Chip
          label="Commentary"
          on={opts.commentaryOn}
          onClick={() => set("commentaryOn", !opts.commentaryOn)}
          disabled={locked}
          title="Render your per-ply notes as lower-third bars"
        />
        <span className="clip-readout" data-clip-note-count>
          {(() => {
            const n = Object.values(opts.plyMods).filter((m) => m.note?.trim()).length;
            return n === 0 ? "tap a timeline cell to add" : `${n} note${n === 1 ? "" : "s"}`;
          })()}
        </span>
      </Row>
    </div>
  );
}
