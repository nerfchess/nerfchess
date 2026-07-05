"use client";

// Rating-over-time line for profile pages, styled after Lichess's Chart.js
// rating history graph: a thin accent line over a soft translucent area, a
// muted horizontal grid, y labels mirrored inside the right edge, and a small
// translucent ink tooltip carrying the rating and date. Visual only; the data
// and props are untouched.

import { useId, useMemo, useRef, useState } from "react";

export interface RatingPoint {
  at: number;
  rating: number;
}

const W = 600;
const H = 180;
// Left pad is tight: like Lichess, the y labels sit mirrored inside the right
// edge rather than in a left gutter, so the line gets the full width.
const PAD = { top: 14, right: 14, bottom: 22, left: 14 };

export function RatingChart({ points }: { points: RatingPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId();
  const fillId = `rc-fill-${gid}`;

  const { path, area, xs, ys, ticks, min, max } = useMemo(() => {
    const ratings = points.map((p) => p.rating);
    let lo = Math.min(...ratings);
    let hi = Math.max(...ratings);
    if (hi - lo < 40) {
      const mid = (hi + lo) / 2;
      lo = mid - 20;
      hi = mid + 20;
    }
    const span = hi - lo;
    lo -= span * 0.08;
    hi += span * 0.08;

    const t0 = points[0].at;
    const t1 = points[points.length - 1].at;
    const xOf = (t: number) =>
      PAD.left + (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0)) * (W - PAD.left - PAD.right);
    const yOf = (r: number) => PAD.top + (1 - (r - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);

    const xs = points.map((p) => xOf(p.at));
    const ys = points.map((p) => yOf(p.rating));
    const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
    const baseline = H - PAD.bottom;
    const area = `${path} L${xs[xs.length - 1].toFixed(1)},${baseline} L${xs[0].toFixed(1)},${baseline} Z`;

    // Round-numbered gridlines inside the range (Lichess caps at ~7 ticks).
    const step = Math.max(25, Math.ceil((hi - lo) / 4 / 25) * 25);
    const ticks: { y: number; label: number }[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
      ticks.push({ y: yOf(v), label: v });
    }
    return { path, area, xs, ys, ticks, min: Math.min(...ratings), max: Math.max(...ratings) };
  }, [points]);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i] - x) < Math.abs(xs[best] - x)) best = i;
    setHover(best);
  };

  const h = hover != null ? points[hover] : null;

  return (
    <div className="plate p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="smallcaps text-[10px] text-parchment-400">Rating history</h3>
        <span className="text-xs text-parchment-400">
          low {Math.round(min)} · high {Math.round(max)}
        </span>
      </div>
      <div className="relative mt-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full touch-none"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={`Rating history from ${Math.round(points[0].rating)} to ${Math.round(points[points.length - 1].rating)}`}
        >
          <defs>
            {/* Soft accent wash that fades to nothing before the baseline. */}
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--accent-hi-rgb))" stopOpacity={0.18} />
              <stop offset="100%" stopColor="rgb(var(--accent-hi-rgb))" stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Muted horizontal grid + mirrored y labels (Lichess right-axis). */}
          {ticks.map((t) => (
            <g key={t.label}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={t.y}
                y2={t.y}
                stroke="var(--paper-dim)"
                strokeOpacity={0.22}
                strokeWidth={1}
              />
              <text
                x={W - PAD.right}
                y={t.y - 4}
                textAnchor="end"
                fontSize={10}
                fill="var(--paper-dim)"
              >
                {t.label}
              </text>
            </g>
          ))}

          <path d={area} fill={`url(#${fillId})`} />
          <path
            d={path}
            fill="none"
            stroke="rgb(var(--accent-hi-rgb))"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {hover != null && (
            <g>
              <line
                x1={xs[hover]}
                x2={xs[hover]}
                y1={PAD.top}
                y2={H - PAD.bottom}
                stroke="var(--paper-dim)"
                strokeOpacity={0.45}
                strokeWidth={1}
              />
              {/* Accent node ringed in the surface tone, echoing Lichess's
                  pale hover border. */}
              <circle
                cx={xs[hover]}
                cy={ys[hover]}
                r={4}
                fill="rgb(var(--accent-hi-rgb))"
                stroke="var(--paper)"
                strokeOpacity={0.85}
                strokeWidth={1.5}
              />
            </g>
          )}

          <text x={PAD.left} y={H - 6} fontSize={10} fill="var(--paper-dim)">
            {new Date(points[0].at).toLocaleDateString()}
          </text>
          <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize={10} fill="var(--paper-dim)">
            {new Date(points[points.length - 1].at).toLocaleDateString()}
          </text>
        </svg>
        {/* not .plate: it forces position:relative, which would knock out `absolute` */}
        {h && (
          <div
            className="pointer-events-none absolute -top-1 flex -translate-x-1/2 items-center gap-1.5 border border-ink-500 bg-ink-900/90 px-2 py-1 text-xs whitespace-nowrap shadow-plate backdrop-blur-sm motion-safe:transition-opacity"
            style={{ left: `${(xs[hover!] / W) * 100}%` }}
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-gold-leaf" aria-hidden />
            <span className="font-semibold text-parchment-100">{Math.round(h.rating)}</span>
            <span className="text-parchment-400">{new Date(h.at).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
