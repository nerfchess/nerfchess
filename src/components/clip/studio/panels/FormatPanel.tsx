"use client";

// FORMAT: frame geometry and the clip window, plus the one-tap reset back to
// TikTok mode. Resolution readouts ride the aspect chips in mono. The THUMB
// section is the thumbnail designer: scrub any frame to be the export's
// poster (frame 0), burn an overlay line, ring the payoff square. The mini
// canvas previews exactly what the encoder will stamp.

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { renderClipPoster, type ClipPoster, type ClipScene } from "../../clipScene";
import {
  ASPECTS,
  BOARD_THEME_OPTIONS,
  FORMAT_OPTIONS,
  FPS_OPTIONS,
  LENGTH_OPTIONS,
  QUALITY_OPTIONS,
  TARGET_OPTIONS,
} from "../../clipOptions";
import { Chip, ChoiceRow, Row, SliderRow, type Studio } from "../controls";

/** Mbps readouts for the quality chips (mono voice, numbers only). */
const QUALITY_MBPS = { compact: 6, standard: 10, high: 16 } as const;

const THUMB_W = 96;

/** Live poster preview: the same renderClipPoster the encoder burns as frame
 *  0, scaled down. Redraws on any poster/config change. */
function PosterPreview({
  scene,
  images,
  poster,
}: {
  scene: ClipScene | null;
  images: Map<string, HTMLImageElement> | null;
  poster: ClipPoster;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !scene || !images) return;
    const { W, H } = scene.layout;
    const tw = THUMB_W;
    const th = Math.max(24, Math.round((tw * H) / W));
    canvas.width = tw;
    canvas.height = th;
    const g = canvas.getContext("2d", { alpha: false });
    if (!g) return;
    g.save();
    g.scale(tw / W, th / H);
    renderClipPoster({ ...scene, opts: { ...scene.opts, poster } }, g, images);
    g.restore();
  }, [scene, images, poster]);
  return <canvas ref={ref} className="clip-poster-thumb" aria-hidden />;
}

export function FormatPanel({ studio }: { studio: Studio }) {
  const {
    opts, set, locked, pliesChoice, setPliesChoice, resetTikTok, scene, images, hookText, encode,
    highlightsCount,
  } = studio;
  const highlightsOn = opts.format === "highlights" && highlightsCount > 0;
  const current = ASPECTS.find((a) => a.id === opts.aspect);
  // 60fps needs the offline encoder AND a codec that takes a 60Hz config.
  const fpsBlocked = opts.fps === 60 && !!encode && !encode.fps60;
  const effFps = fpsBlocked ? 30 : opts.fps;
  // Default poster moment when the designer switches on: the payoff landing.
  const payoffFrac = (() => {
    if (!scene) return 0.6;
    const sf = scene.segs[scene.payoffIndex];
    if (!sf) return 0.6;
    return Math.min(
      1,
      (sf.start + sf.arrowMs + sf.preMs + sf.moveMs) / Math.max(1, scene.durationMs),
    );
  })();
  const designing = opts.posterFrac !== null;
  const poster: ClipPoster = {
    frac: opts.posterFrac ?? payoffFrac,
    text: opts.posterText.trim() || hookText,
    ring: opts.posterRing,
  };
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
          <span className="clip-readout" data-clip-output>
            {current?.res ?? ""} {effFps}fps {QUALITY_MBPS[opts.quality]}Mbps
          </span>
        </div>
      </div>
      <Row label="Quality">
        {QUALITY_OPTIONS.map(([id, label]) => (
          <Chip
            key={id}
            label={label}
            on={opts.quality === id}
            onClick={() => set("quality", id)}
            disabled={locked}
            title={`${QUALITY_MBPS[id]} Mbps video`}
          />
        ))}
      </Row>
      <Row label="Rate">
        {FPS_OPTIONS.map(([id, label]) => (
          <Chip
            key={id}
            label={label}
            on={opts.fps === id}
            onClick={() => set("fps", id)}
            disabled={locked}
            title={id === 60 ? "Double the frame samples through the same renderer" : "The classic rate"}
          />
        ))}
        {fpsBlocked && (
          <span className="clip-readout" data-clip-fps-note>
            {encode?.tier === 2 ? "realtime records at 30" : "no 60fps encoder; using 30"}
          </span>
        )}
      </Row>
      {/* Reel-only board looks: recolors squares and frame in the render;
          the game board is untouched, and grades composite on top. */}
      <ChoiceRow
        label="Board"
        options={BOARD_THEME_OPTIONS}
        value={opts.boardTheme}
        onPick={(v) => set("boardTheme", v)}
        disabled={locked}
      />
      {/* Reel format: one continuous moment, or stitched highlight chapters
          (top card plays + biggest swings, 8+ plies apart). */}
      <Row label="Format">
        {FORMAT_OPTIONS.map(([id, label]) => (
          <Chip
            key={id}
            label={id === "highlights" && highlightsCount > 0 ? `${label} (${highlightsCount})` : label}
            on={opts.format === id}
            onClick={() => set("format", id)}
            disabled={locked || (id === "highlights" && highlightsCount === 0)}
            title={
              id === "highlights"
                ? highlightsCount === 0
                  ? "No distinct moments to chapter in this game"
                  : "Stitch up to 3 highlight moments into one reel"
                : "One continuous window (classic)"
            }
          />
        ))}
      </Row>
      {/* Reel length target: fit by trimming holds, never by playback speed
          (that stays a PACE choice). */}
      <Row label="Target">
        {TARGET_OPTIONS.map(([id, label]) => (
          <Chip
            key={String(id)}
            label={label}
            on={opts.lengthTarget === id}
            onClick={() => set("lengthTarget", id)}
            disabled={locked}
            title={
              id === "auto"
                ? "Natural duration (highlights still fit 8-20s)"
                : `Fit the reel to about ${id}s by trimming holds`
            }
          />
        ))}
      </Row>
      <Row label="Window">
        {LENGTH_OPTIONS.map((num) => (
          <Chip
            key={String(num)}
            label={num === "auto" ? "Auto" : `Last ${num}`}
            on={!highlightsOn && pliesChoice === num}
            onClick={() => setPliesChoice(num)}
            disabled={locked || highlightsOn}
            title={
              highlightsOn ? "Highlights mode cuts its own chapter windows" : undefined
            }
          />
        ))}
      </Row>

      {/* --- THUMB: the thumbnail designer --------------------------------- */}
      <Row label="Thumb">
        <Chip
          label="Frame 0"
          on={!designing}
          onClick={() => set("posterFrac", null)}
          disabled={locked}
          title="Classic behavior: the reel's first frame is the poster"
        />
        <Chip
          label="Design poster"
          on={designing}
          onClick={() => set("posterFrac", payoffFrac)}
          disabled={locked}
          title="Pick any frame as the export's poster"
        />
      </Row>
      {designing && (
        <>
          <div className="clip-row">
            <span className="clip-row-label">Poster</span>
            <div className="clip-row-body" style={{ flexWrap: "nowrap" }}>
              <PosterPreview scene={scene} images={images} poster={poster} />
            </div>
          </div>
          <SliderRow
            label="Moment"
            value={Math.round((opts.posterFrac ?? payoffFrac) * 100)}
            onChange={(v) => set("posterFrac", v / 100)}
            min={0}
            max={100}
            step={1}
            disabled={locked}
            format={(v) => `${v}%`}
          />
          <div className="clip-row">
            <span className="clip-row-label">Overlay</span>
            <input
              type="text"
              value={opts.posterText}
              maxLength={80}
              disabled={locked}
              onChange={(e) => set("posterText", e.target.value)}
              aria-label="Poster overlay text"
              placeholder={hookText}
              data-clip-poster-text
              className="clip-input font-display"
            />
          </div>
          <Row label="Sticker">
            <Chip
              label="Payoff ring"
              on={opts.posterRing}
              onClick={() => set("posterRing", !opts.posterRing)}
              disabled={locked}
              title="Accent ring around the payoff square"
            />
          </Row>
        </>
      )}

      <Row label="Reset">
        <Button tone="ghost" size="xs" disabled={locked} onClick={resetTikTok} className="text-parchment-300">
          TikTok mode
        </Button>
      </Row>
    </div>
  );
}
