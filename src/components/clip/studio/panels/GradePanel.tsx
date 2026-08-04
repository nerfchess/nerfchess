"use client";

// GRADE: live thumbnails instead of text chips. One 64px-class canvas per
// grade, all drawn from the SAME base frame (the payoff landing) through each
// grade's tint stack, redrawn once per config change. Plus the per-grade
// strength dial and the custom duotone builder's two hex wells.

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { renderClipFrame, type ClipScene } from "../../clipScene";
import { applyGrade, type GradeId } from "../../clipStyles";
import { GRADE_OPTIONS } from "../../clipOptions";
import { HexWell, Row, SliderRow, type Studio } from "../controls";

const THUMB_W = 84;

/** The frame every thumbnail samples: the payoff landing, where the reel is
 *  at its most colorful. */
function sampleTime(scene: ClipScene): number {
  const sf = scene.segs[scene.payoffIndex];
  if (!sf) return scene.durationMs * 0.5;
  return sf.start + sf.arrowMs + sf.preMs + sf.moveMs * 0.9;
}

export function GradePanel({ studio }: { studio: Studio }) {
  const { opts, setStyle, locked, scene, images } = studio;
  const s = opts.style;
  const canvasRefs = useRef(new Map<GradeId, HTMLCanvasElement>());

  useEffect(() => {
    if (!scene || !images) return;
    const { W, H } = scene.layout;
    const tw = THUMB_W;
    const th = Math.max(24, Math.round((tw * H) / W));
    // One ungraded base render, scaled down; then each thumbnail is a cheap
    // drawImage + tint-stack composite.
    const base = document.createElement("canvas");
    base.width = tw;
    base.height = th;
    const bg = base.getContext("2d", { alpha: false });
    if (!bg) return;
    bg.save();
    bg.scale(tw / W, th / H);
    const ungraded: ClipScene = {
      ...scene,
      opts: { ...scene.opts, style: { ...scene.opts.style, grade: "none" } },
    };
    renderClipFrame(ungraded, bg, sampleTime(scene), images);
    bg.restore();
    for (const [id, canvas] of canvasRefs.current) {
      const g = canvas.getContext("2d", { alpha: false });
      if (!g) continue;
      canvas.width = tw;
      canvas.height = th;
      g.drawImage(base, 0, 0);
      applyGrade(g, id, tw, th, sampleTime(scene), 1, { a: s.duotoneA, b: s.duotoneB });
    }
  }, [scene, images, s.duotoneA, s.duotoneB]);

  return (
    <div className="clip-panel">
      <div className="clip-grade-grid" role="group" aria-label="Color grade">
        {GRADE_OPTIONS.map(([id, label]) => (
          <Button
            key={id}
            tone="ghost"
            size="xs"
            press={false}
            onClick={() => setStyle({ grade: id })}
            disabled={locked}
            aria-pressed={s.grade === id}
            className="clip-grade-thumb block h-auto flex-col items-stretch p-0.5"
          >
            <canvas
              ref={(el) => {
                if (el) canvasRefs.current.set(id, el);
                else canvasRefs.current.delete(id);
              }}
              aria-hidden
            />
            <span className="clip-grade-name">{label}</span>
          </Button>
        ))}
      </div>
      <SliderRow
        label="Strength"
        value={s.gradeStrength}
        onChange={(v) => setStyle({ gradeStrength: v })}
        disabled={locked || s.grade === "none"}
      />
      <Row label="Duotone">
        <HexWell
          label="Duotone shadows hex"
          value={s.duotoneA}
          onCommit={(hex) => setStyle({ duotoneA: hex, grade: "duotone" })}
          disabled={locked}
        />
        <HexWell
          label="Duotone highlights hex"
          value={s.duotoneB}
          onCommit={(hex) => setStyle({ duotoneB: hex, grade: "duotone" })}
          disabled={locked}
        />
      </Row>
    </div>
  );
}
