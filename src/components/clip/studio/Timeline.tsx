"use client";

// The studio TIMELINE: a film-strip scrubber over the whole reel. One cell
// per ply sized by its real share of the clock (so slow-motion payoffs read
// wide), capture cells tinted, card cells ticked with a tier numeral, the
// payoff bracketed, and the intro / endcard slots at the ends. Dragging the
// strip scrubs the preview: the pure renderer makes seek = set t, and none of
// this touches config state, so scrubbing can never trigger a re-encode.

import { useRef, useState } from "react";
import { PIECE_PATHS } from "@/components/Pieces";
import type { ClipScene } from "../clipScene";

interface Props {
  scene: ClipScene;
  onScrubStart: () => void;
  onScrub: (tMs: number) => void;
  onScrubEnd: () => void;
  registerTickTarget: (key: string, el: HTMLElement | null) => void;
}

interface Cell {
  key: string;
  kind: "intro" | "ply" | "out";
  /** Fraction of the reel's wall clock. */
  frac: number;
  capture: boolean;
  tier: number | null;
  glyph: string | null;
  label: string | null;
  startFrac: number;
}

function buildCells(scene: ClipScene): { cells: Cell[]; payoff: { left: number; width: number } | null } {
  const dur = Math.max(1, scene.durationMs);
  const cells: Cell[] = [];
  let payoff: { left: number; width: number } | null = null;
  cells.push({
    key: "intro", kind: "intro", frac: scene.lead / dur,
    capture: false, tier: null, glyph: null, label: "IN", startFrac: 0,
  });
  for (let i = 0; i < scene.segs.length; i++) {
    const sf = scene.segs[i];
    const span = sf.arrowMs + sf.preMs + sf.moveMs + sf.freezeMs + sf.holdMs;
    const primary = sf.seg.pairs.find((p) => p.primary) ?? sf.seg.pairs[0] ?? null;
    const capture = sf.seg.pairs.some((p) => p.captured) || sf.seg.vanishes.length > 0;
    const startFrac = sf.start / dur;
    const frac = span / dur;
    cells.push({
      key: `ply-${sf.seg.ply}`,
      kind: "ply",
      frac,
      capture,
      tier: sf.seg.sig?.tier ?? null,
      glyph: primary ? primary.before.color + primary.before.type : null,
      label: null,
      startFrac,
    });
    if (sf.isPayoff) payoff = { left: startFrac * 100, width: frac * 100 };
  }
  cells.push({
    key: "out", kind: "out", frac: (scene.freezeMs + scene.endMs) / dur,
    capture: false, tier: null, glyph: null,
    label: scene.endMs > 0 ? "END" : "FIN",
    startFrac: scene.freezeStart / dur,
  });
  return { cells, payoff };
}

export function Timeline({ scene, onScrubStart, onScrub, onScrubEnd, registerTickTarget }: Props) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const { cells, payoff } = buildCells(scene);
  const startPly = scene.opts.timeline.startPly;
  const endPly = startPly + scene.segs.length;

  const timeAt = (clientX: number): number => {
    const el = stripRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    return frac * scene.durationMs;
  };

  return (
    <div className="clip-strip-wrap" data-clip-strip>
      <div className="clip-strip-scale" aria-hidden>
        <span>PLY {startPly + 1}</span>
        <span>{scene.segs.length} PLIES</span>
        <span>PLY {endPly}</span>
      </div>
      <div
        ref={(el) => {
          stripRef.current = el;
          registerTickTarget("strip", el);
        }}
        className={"clip-strip" + (scrubbing ? " scrubbing" : "")}
        role="slider"
        aria-label="Scrub the reel"
        aria-valuemin={0}
        aria-valuemax={Math.round(scene.durationMs)}
        aria-valuenow={0}
        tabIndex={-1}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          setScrubbing(true);
          onScrubStart();
          onScrub(timeAt(e.clientX));
        }}
        onPointerMove={(e) => {
          if (!scrubbing) return;
          onScrub(timeAt(e.clientX));
        }}
        onPointerUp={() => {
          if (!scrubbing) return;
          setScrubbing(false);
          onScrubEnd();
        }}
        onPointerCancel={() => {
          if (!scrubbing) return;
          setScrubbing(false);
          onScrubEnd();
        }}
      >
        <div className="clip-strip-cells">
          {cells.map((cell) => (
            <div
              key={cell.key}
              className={
                "clip-cell" +
                (cell.kind !== "ply" ? " clip-cell--slot" : "") +
                (cell.capture ? " clip-cell--capture" : "") +
                (cell.tier !== null ? " clip-cell--card" : "")
              }
              style={{ flexGrow: Math.max(0.02, cell.frac), flexBasis: 0 }}
              data-clip-cell={cell.kind}
              data-clip-cell-t={Math.round(cell.startFrac * scene.durationMs)}
            >
              {cell.glyph && PIECE_PATHS[cell.glyph] ? (
                <span className="clip-cell-glyph" aria-hidden>
                  <svg
                    viewBox="0 0 45 45"
                    dangerouslySetInnerHTML={{ __html: PIECE_PATHS[cell.glyph] }}
                  />
                </span>
              ) : cell.label ? (
                <span className="clip-slot-label">{cell.label}</span>
              ) : null}
              {cell.tier !== null && <span className="clip-cell-tier">{cell.tier}</span>}
            </div>
          ))}
        </div>
        {payoff && (
          <div
            className="clip-payoff-bracket"
            style={{ left: `${payoff.left}%`, width: `${payoff.width}%` }}
            aria-hidden
          />
        )}
        <div
          className="clip-playhead"
          ref={(el) => registerTickTarget("playhead", el)}
          data-clip-playhead
          aria-hidden
        >
          <span className="clip-playhead-tip" ref={(el) => registerTickTarget("ptime", el)}>
            00:00.0
          </span>
        </div>
      </div>
    </div>
  );
}
