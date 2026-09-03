"use client";

// The studio TIMELINE: a film-strip scrubber over the whole reel. One cell
// per ply sized by its real share of the clock (so slow-motion payoffs read
// wide), capture cells tinted, card cells ticked with a tier numeral, the
// payoff bracketed, and the intro / endcard slots at the ends. Dragging the
// strip scrubs the preview: the pure renderer makes seek = set t, and none of
// this touches config state, so scrubbing can never trigger a re-encode.
//
// Wave 5 adds the DIRECTOR layer on top:
//
//   WINDOW  a rail above the strip spanning every reconstructable ply, with
//           pointer-captured drag handles (32px+ hit areas) on both ends.
//           Dragging cuts a manual clip window, overriding planAutoClip; the
//           AUTO chip hands the cut back to the director.
//   CELLS   tapping a ply cell opens an inline curation strip: Skip (hard
//           cut, the cell stays visible but hatched), Slow, Punch, Set as
//           payoff, and the commentary note input. All of it flows through
//           the options state and therefore the encode key.

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PIECE_PATHS } from "@/components/Pieces";
import type { ClipPlyMod } from "../clipReplay";
import type { ClipScene } from "../clipScene";

interface WindowControl {
  /** Earliest reconstructable ply the window may start from. */
  availStart: number;
  /** The head (the game's current ply count). */
  head: number;
  /** The effective window, whatever chose it. */
  start: number;
  end: number;
  /** True when a manual window overrides the director. */
  manual: boolean;
  onChange: (start: number, end: number) => void;
  onAuto: () => void;
}

interface Curation {
  mods: Record<number, ClipPlyMod>;
  /** Manual payoff override ply, or null. */
  payoffPly: number | null;
  onMod: (ply: number, patch: Partial<ClipPlyMod>) => void;
  onTogglePayoff: (ply: number) => void;
  locked: boolean;
}

interface Props {
  scene: ClipScene;
  onScrubStart: () => void;
  onScrub: (tMs: number) => void;
  onScrubEnd: () => void;
  registerTickTarget: (key: string, el: HTMLElement | null) => void;
  window: WindowControl;
  curation: Curation;
}

interface Cell {
  key: string;
  kind: "intro" | "ply" | "skip" | "out";
  /** Fraction of the reel's wall clock (skip stubs use a fixed sliver). */
  frac: number;
  capture: boolean;
  tier: number | null;
  glyph: string | null;
  label: string | null;
  startFrac: number;
  ply: number | null;
}

const MIN_WINDOW = 2;

function buildCells(
  scene: ClipScene,
  win: WindowControl,
  mods: Record<number, ClipPlyMod>,
): { cells: Cell[]; payoff: { left: number; width: number } | null } {
  const dur = Math.max(1, scene.durationMs);
  const plyCells: Cell[] = [];
  let payoff: { left: number; width: number } | null = null;
  for (const sf of scene.segs) {
    const span = sf.arrowMs + sf.preMs + sf.moveMs + sf.freezeMs + sf.holdMs;
    const primary = sf.seg.pairs.find((p) => p.primary) ?? sf.seg.pairs[0] ?? null;
    const capture = sf.seg.pairs.some((p) => p.captured) || sf.seg.vanishes.length > 0;
    const startFrac = sf.start / dur;
    const frac = span / dur;
    plyCells.push({
      key: `ply-${sf.seg.ply}`,
      kind: "ply",
      frac,
      capture,
      tier: sf.seg.sig?.tier ?? null,
      glyph: primary ? primary.before.color + primary.before.type : null,
      label: null,
      startFrac,
      ply: sf.seg.ply,
    });
    if (sf.isPayoff) payoff = { left: startFrac * 100, width: frac * 100 };
  }
  // Skipped plies stay visible as hatched slivers in ply order, so the hard
  // cut reads as an editorial choice rather than a vanished move.
  for (let ply = win.start; ply < win.end; ply++) {
    if (!mods[ply]?.skip) continue;
    if (plyCells.some((c) => c.ply === ply)) continue;
    let at = plyCells.findIndex((c) => c.ply !== null && c.ply > ply);
    if (at < 0) at = plyCells.length;
    const nearFrac =
      at < plyCells.length ? plyCells[at].startFrac : scene.freezeStart / dur;
    plyCells.splice(at, 0, {
      key: `skip-${ply}`,
      kind: "skip",
      frac: 0,
      capture: false,
      tier: null,
      glyph: null,
      label: null,
      startFrac: nearFrac,
      ply,
    });
  }
  const cells: Cell[] = [
    {
      key: "intro", kind: "intro", frac: scene.lead / dur,
      capture: false, tier: null, glyph: null, label: "IN", startFrac: 0, ply: null,
    },
    ...plyCells,
    {
      key: "out", kind: "out", frac: (scene.freezeMs + scene.endMs) / dur,
      capture: false, tier: null, glyph: null,
      label: scene.endMs > 0 ? "END" : "FIN",
      startFrac: scene.freezeStart / dur, ply: null,
    },
  ];
  return { cells, payoff };
}

export function Timeline({
  scene,
  onScrubStart,
  onScrub,
  onScrubEnd,
  registerTickTarget,
  window: win,
  curation,
}: Props) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const [selPly, setSelPly] = useState<number | null>(null);
  // Tap detection over the scrub gesture: a short, still press selects a cell.
  const tapRef = useRef<{ x: number; t: number } | null>(null);

  const { cells, payoff } = buildCells(scene, win, curation.mods);
  const liveCount = scene.segs.length;
  const firstPly = scene.segs[0]?.seg.ply ?? win.start;
  const lastPly = scene.segs[scene.segs.length - 1]?.seg.ply ?? win.end - 1;
  const windowSpan = win.end - win.start;

  const timeAt = (clientX: number): number => {
    const el = stripRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    return frac * scene.durationMs;
  };

  // --- Window rail geometry --------------------------------------------------
  const railSpan = Math.max(1, win.head - win.availStart);
  const fracOf = (ply: number) => (ply - win.availStart) / railSpan;
  const plyAt = (clientX: number): number => {
    const el = railRef.current;
    if (!el) return win.start;
    const rect = el.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    return Math.round(win.availStart + frac * railSpan);
  };
  const dragHandleTo = (which: "start" | "end", clientX: number) => {
    const ply = plyAt(clientX);
    if (which === "start") {
      const next = Math.max(win.availStart, Math.min(ply, win.end - MIN_WINDOW));
      if (next !== win.start) win.onChange(next, win.end);
    } else {
      const next = Math.min(win.head, Math.max(ply, win.start + MIN_WINDOW));
      if (next !== win.end) win.onChange(win.start, next);
    }
  };

  const selMod = selPly !== null ? curation.mods[selPly] ?? {} : {};
  const selSkipped = selPly !== null && !!selMod.skip;
  // Never let the last live ply be skipped: a reel needs at least one segment.
  const skipBlocked = !selSkipped && liveCount <= 1;

  const handle = (which: "start" | "end", ply: number, label: string) => (
    <div
      className={"clip-winhandle" + (dragging === which ? " dragging" : "")}
      style={{ left: `${fracOf(ply) * 100}%` }}
      role="slider"
      aria-label={label}
      aria-valuemin={which === "start" ? win.availStart + 1 : win.start + MIN_WINDOW}
      aria-valuemax={which === "start" ? win.end - MIN_WINDOW : win.head}
      aria-valuenow={ply + (which === "start" ? 1 : 0)}
      tabIndex={curation.locked ? -1 : 0}
      data-clip-winhandle={which}
      onPointerDown={(e) => {
        if (curation.locked) return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(which);
        dragHandleTo(which, e.clientX);
      }}
      onPointerMove={(e) => {
        if (dragging !== which) return;
        dragHandleTo(which, e.clientX);
      }}
      onPointerUp={() => setDragging(null)}
      onPointerCancel={() => setDragging(null)}
      onKeyDown={(e) => {
        if (curation.locked) return;
        const dir = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
        if (!dir) return;
        e.preventDefault();
        if (which === "start") {
          const next = Math.max(win.availStart, Math.min(win.start + dir, win.end - MIN_WINDOW));
          if (next !== win.start) win.onChange(next, win.end);
        } else {
          const next = Math.min(win.head, Math.max(win.end + dir, win.start + MIN_WINDOW));
          if (next !== win.end) win.onChange(win.start, next);
        }
      }}
    >
      <span className="clip-winhandle-blade" aria-hidden />
    </div>
  );

  return (
    <div className="clip-strip-wrap" data-clip-strip>
      <div className="clip-strip-scale">
        <span aria-hidden>PLY {firstPly + 1}</span>
        <span className="clip-strip-mid">
          <span data-clip-plyrange aria-hidden>
            {liveCount < windowSpan ? `${liveCount} OF ${windowSpan}` : `${liveCount}`} PLIES
          </span>
          {win.manual && (
            <Button
              tone="quiet"
              size="xs"
              press={false}
              onClick={win.onAuto}
              disabled={curation.locked}
              data-clip-window-auto
              className="clip-winauto"
              title="Hand the cut back to the auto-director"
            >
              AUTO
            </Button>
          )}
        </span>
        <span aria-hidden>PLY {lastPly + 1}</span>
      </div>

      {/* Window rail: the whole reconstructable range, shaded outside the
          window, with a pointer-captured drag handle at each end. */}
      <div className="clip-winrail" ref={railRef} data-clip-winrail>
        <div className="clip-winrail-track" aria-hidden>
          <div
            className="clip-winrail-active"
            style={{
              left: `${fracOf(win.start) * 100}%`,
              width: `${(fracOf(win.end) - fracOf(win.start)) * 100}%`,
            }}
          />
          {Array.from({ length: railSpan + 1 }, (_, i) => (
            <span
              key={i}
              className="clip-winrail-tick"
              style={{ left: `${(i / railSpan) * 100}%` }}
            />
          ))}
        </div>
        {handle("start", win.start, "Clip window start")}
        {handle("end", win.end, "Clip window end")}
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
          tapRef.current = { x: e.clientX, t: performance.now() };
          onScrubStart();
          onScrub(timeAt(e.clientX));
        }}
        onPointerMove={(e) => {
          if (!scrubbing) return;
          if (tapRef.current && Math.abs(e.clientX - tapRef.current.x) > 6) {
            tapRef.current = null;
          }
          onScrub(timeAt(e.clientX));
        }}
        onPointerUp={(e) => {
          if (!scrubbing) return;
          setScrubbing(false);
          onScrubEnd();
          // A short, still press is a tap: open the cell's curation strip.
          const tap = tapRef.current;
          tapRef.current = null;
          if (tap && performance.now() - tap.t < 450) {
            const el = document
              .elementFromPoint(e.clientX, e.clientY)
              ?.closest("[data-clip-cell-ply]");
            const ply = el ? Number(el.getAttribute("data-clip-cell-ply")) : NaN;
            if (Number.isFinite(ply)) {
              setSelPly((cur) => (cur === ply ? null : ply));
            } else {
              setSelPly(null);
            }
          }
        }}
        onPointerCancel={() => {
          if (!scrubbing) return;
          tapRef.current = null;
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
                (cell.kind === "intro" || cell.kind === "out" ? " clip-cell--slot" : "") +
                (cell.capture ? " clip-cell--capture" : "") +
                (cell.tier !== null ? " clip-cell--card" : "") +
                (cell.kind === "skip" ? " clip-cell--skip" : "") +
                (cell.ply !== null && cell.ply === selPly ? " clip-cell--sel" : "")
              }
              style={
                cell.kind === "skip"
                  ? { flexGrow: 0, flexBasis: "14px" }
                  : { flexGrow: Math.max(0.02, cell.frac), flexBasis: 0 }
              }
              data-clip-cell={cell.kind}
              data-clip-cell-t={Math.round(cell.startFrac * scene.durationMs)}
              {...(cell.ply !== null ? { "data-clip-cell-ply": cell.ply } : {})}
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

      {/* Inline curation strip for the tapped ply. */}
      {selPly !== null && (
        <div className="clip-cellstrip" data-clip-cellstrip={selPly}>
          <span className="clip-cellstrip-ply">PLY {selPly + 1}</span>
          <Button
            tone="ghost"
            size="xs"
            onClick={() => curation.onMod(selPly, { skip: !selSkipped })}
            disabled={curation.locked || skipBlocked}
            aria-pressed={selSkipped}
            data-clip-mod-skip
            className={selSkipped ? "text-gold-leaf" : "text-parchment-300"}
            title={skipBlocked ? "The reel needs at least one ply" : "Hard-cut this ply from the reel"}
          >
            Skip
          </Button>
          <Button
            tone="ghost"
            size="xs"
            onClick={() => curation.onMod(selPly, { slow: !selMod.slow })}
            disabled={curation.locked || selSkipped}
            aria-pressed={!!selMod.slow}
            data-clip-mod-slow
            className={selMod.slow ? "text-gold-leaf" : "text-parchment-300"}
            title="Stretch this ply into a slow beat"
          >
            Slow
          </Button>
          <Button
            tone="ghost"
            size="xs"
            onClick={() => curation.onMod(selPly, { punch: !selMod.punch })}
            disabled={curation.locked || selSkipped}
            aria-pressed={!!selMod.punch}
            data-clip-mod-punch
            className={selMod.punch ? "text-gold-leaf" : "text-parchment-300"}
            title="Force a zoom punch on this landing"
          >
            Punch
          </Button>
          <Button
            tone="ghost"
            size="xs"
            onClick={() => curation.onTogglePayoff(selPly)}
            disabled={curation.locked || selSkipped}
            aria-pressed={curation.payoffPly === selPly}
            data-clip-mod-payoff
            className={curation.payoffPly === selPly ? "text-gold-leaf" : "text-parchment-300"}
            title="Make this ply the payoff (slow-mo hit, pre-beat)"
          >
            Payoff
          </Button>
          <input
            key={`note-${selPly}`}
            type="text"
            defaultValue={selMod.note ?? ""}
            maxLength={90}
            disabled={curation.locked}
            placeholder="Add note"
            aria-label={`Commentary note for ply ${selPly + 1}`}
            data-clip-mod-note
            className="clip-input"
            onBlur={(e) => {
              const next = e.target.value;
              if ((selMod.note ?? "") !== next) curation.onMod(selPly, { note: next });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
          <Button
            tone="ghost"
            size="xs"
            iconOnly
            onClick={() => setSelPly(null)}
            aria-label="Close ply strip"
            className="text-parchment-400"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        </div>
      )}
    </div>
  );
}
