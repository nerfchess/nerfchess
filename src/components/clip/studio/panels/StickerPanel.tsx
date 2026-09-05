"use client";

// STICKER: the curated vector sticker set. Tap a sticker to add it (cap 5),
// drag it into place on the viewport, and per row: pin it to one ply (it
// slams in for that ply's span) or let it ride the whole reel, poster frame
// included. Previews render through the SAME paintSticker painters the reel
// burns, in the reel's live palette, so what the tray shows is what exports.

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import {
  STICKER_CAP,
  STICKER_OPTIONS,
  paintSticker,
  type StickerId,
} from "../../clipStickers";
import { reelPalette } from "../../clipStyles";
import { Chip, Row, type Studio } from "../controls";

const THUMB = 34;

/** One sticker preview canvas, painted with the reel's current palette. */
function StickerThumb({
  id,
  paletteKey,
  studio,
}: {
  id: StickerId;
  paletteKey: string;
  studio: Studio;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = THUMB;
    canvas.height = THUMB;
    const g = canvas.getContext("2d");
    if (!g) return;
    g.clearRect(0, 0, THUMB, THUMB);
    const pal =
      studio.scene?.palette ??
      reelPalette(studio.opts.style.grade, studio.accent, studio.opts.style.duotoneB);
    g.save();
    g.translate(THUMB / 2, THUMB / 2);
    paintSticker(g, id, THUMB * 0.86, pal, "system-ui, sans-serif");
    g.restore();
    // paletteKey retriggers the paint when the grade/duotone changes.
  }, [id, paletteKey, studio]);
  return <canvas ref={ref} className="clip-sticker-thumb" aria-hidden />;
}

export function StickerPanel({ studio }: { studio: Studio }) {
  const { opts, locked, addSticker, removeSticker, pinSticker, reelPlyRange } = studio;
  const paletteKey = `${opts.style.grade}:${opts.style.duotoneB}`;
  const full = opts.stickers.length >= STICKER_CAP;
  const labelOf = (id: StickerId) =>
    STICKER_OPTIONS.find(([sid]) => sid === id)?.[1] ?? id;
  return (
    <div className="clip-panel">
      <div className="clip-sticker-grid" role="group" aria-label="Sticker tray">
        {STICKER_OPTIONS.map(([id, label]) => (
          <Button
            key={id}
            tone="ghost"
            size="xs"
            press={false}
            onClick={() => addSticker(id)}
            disabled={locked || full}
            data-clip-sticker-add={id}
            title={full ? `Cap of ${STICKER_CAP} stickers; remove one first` : `Add the ${label} sticker`}
            className="clip-sticker-cell block h-auto flex-col items-center p-1 text-parchment-300"
          >
            <StickerThumb id={id} paletteKey={paletteKey} studio={studio} />
            <span className="clip-sticker-name">{label}</span>
          </Button>
        ))}
      </div>
      <div className="clip-row">
        <span className="clip-row-label">Placed</span>
        <div className="clip-row-body">
          <span className="clip-readout" data-clip-sticker-count>
            {opts.stickers.length}/{STICKER_CAP}
          </span>
          {opts.stickers.length > 0 && (
            <span className="clip-tools-note">drag them on the preview</span>
          )}
        </div>
      </div>
      {opts.stickers.map((st, i) => {
        const pinned = st.ply !== null;
        const range = reelPlyRange;
        return (
          <Row key={`${st.id}-${i}`} label={`#${i + 1}`}>
            <StickerThumb id={st.id} paletteKey={paletteKey} studio={studio} />
            <span className="clip-readout">{labelOf(st.id).toUpperCase()}</span>
            <Chip
              label="Whole reel"
              on={!pinned}
              onClick={() => pinSticker(i, null)}
              disabled={locked}
              title="Show for the whole reel (poster frame included)"
            />
            <Chip
              label={pinned ? `Ply ${st.ply! + 1}` : "Pin to ply"}
              on={pinned}
              onClick={() => pinSticker(i, range ? (st.ply ?? range.last) : null)}
              disabled={locked || !range}
              title="Slam in for one ply's span only"
            />
            {pinned && range && (
              <>
                <input
                  type="range"
                  className="clip-slider"
                  min={range.first}
                  max={range.last}
                  step={1}
                  value={Math.max(range.first, Math.min(range.last, st.ply!))}
                  disabled={locked}
                  aria-label={`Sticker ${i + 1} pinned ply`}
                  data-clip-sticker-ply={i}
                  onChange={(e) => pinSticker(i, Number(e.target.value))}
                />
              </>
            )}
            <Button
              tone="quiet"
              size="xs"
              press={false}
              iconOnly
              onClick={() => removeSticker(i)}
              disabled={locked}
              aria-label={`Remove sticker ${i + 1}`}
              data-clip-sticker-remove={i}
              className="clip-pin text-parchment-500"
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Button>
          </Row>
        );
      })}
    </div>
  );
}
