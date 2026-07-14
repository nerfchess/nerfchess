"use client";

// Rating-over-time line for profile pages, styled after Lichess's rating
// history graph: a thin accent line over a soft translucent area, a muted
// horizontal grid, y labels mirrored inside the right edge, dated x-axis ticks
// along the bottom, a small translucent ink tooltip, and Lichess's hallmark
// time-range buttons (2W / 1M / 3M / All). Data in stays a flat point list;
// the range filter is applied client-side, anchored to the most recent point.

import { useId, useMemo, useRef, useState } from "react";

export interface RatingPoint {
  at: number;
  rating: number;
}

const W = 600;
const H = 190;
// Left pad is tight: like Lichess, the y labels sit mirrored inside the right
// edge rather than in a left gutter, so the line gets the full width. Bottom
// pad leaves room for the dated x-axis ticks.
const PAD = { top: 14, right: 16, bottom: 26, left: 14 };

const DAY = 86_400_000;
type RangeKey = "2w" | "1m" | "3m" | "all";
const RANGES: { key: RangeKey; label: string; ms: number }[] = [
  { key: "2w", label: "2W", ms: 14 * DAY },
  { key: "1m", label: "1M", ms: 30 * DAY },
  { key: "3m", label: "3M", ms: 90 * DAY },
  { key: "all", label: "All", ms: Infinity },
];

/** Points within `ms` of the most recent point (Lichess anchors ranges to the
 * latest game, so a dormant account still shows a full window). */
function windowPoints(points: RatingPoint[], ms: number): RatingPoint[] {
  if (!Number.isFinite(ms) || points.length === 0) return points;
  const cutoff = points[points.length - 1].at - ms;
  const win = points.filter((p) => p.at >= cutoff);
  return win.length >= 2 ? win : points;
}

/** Date label whose precision follows the visible span: day+month for short
 * windows, month+year once the window crosses several months. */
function axisDate(t: number, spanMs: number): string {
  const d = new Date(t);
  if (spanMs > 300 * DAY) return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function RatingChart({ points }: { points: RatingPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [range, setRange] = useState<RangeKey>("all");
  const gid = useId();
  const fillId = `rc-fill-${gid}`;

  // Only offer range buttons whose window actually holds 2+ points, so a young
  // account is not littered with dead tabs. "All" is always available.
  const available = useMemo(() => {
    const span = points.length ? points[points.length - 1].at - points[0].at : 0;
    return RANGES.filter((r) => r.key === "all" || (r.ms < span && windowPoints(points, r.ms).length >= 2));
  }, [points]);

  const effectiveRange = available.some((r) => r.key === range) ? range : "all";
  const view = useMemo(
    () => windowPoints(points, RANGES.find((r) => r.key === effectiveRange)!.ms),
    [points, effectiveRange],
  );

  const { path, area, xs, ys, yTicks, xTicks, min, max } = useMemo(() => {
    const ratings = view.map((p) => p.rating);
    let lo = Math.min(...ratings);
    let hi = Math.max(...ratings);
    if (hi - lo < 40) {
      const mid = (hi + lo) / 2;
      lo = mid - 20;
      hi = mid + 20;
    }
    const spanR = hi - lo;
    lo -= spanR * 0.08;
    hi += spanR * 0.08;

    const t0 = view[0].at;
    const t1 = view[view.length - 1].at;
    const spanT = t1 - t0;
    const xOf = (t: number) =>
      PAD.left + (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0)) * (W - PAD.left - PAD.right);
    const yOf = (r: number) => PAD.top + (1 - (r - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);

    const xs = view.map((p) => xOf(p.at));
    const ys = view.map((p) => yOf(p.rating));
    const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
    const baseline = H - PAD.bottom;
    const area = `${path} L${xs[xs.length - 1].toFixed(1)},${baseline} L${xs[0].toFixed(1)},${baseline} Z`;

    // Round-numbered horizontal gridlines inside the range (Lichess caps ~7).
    const step = Math.max(25, Math.ceil((hi - lo) / 4 / 25) * 25);
    const yTicks: { y: number; label: number }[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
      yTicks.push({ y: yOf(v), label: v });
    }

    // Dated vertical gridlines: up to 5 evenly spaced across the time span,
    // deduped when the span is so short that ticks would share a date label.
    const xTicks: { x: number; label: string }[] = [];
    if (spanT > 0) {
      const n = 4;
      let last = "";
      for (let i = 0; i <= n; i++) {
        const t = t0 + (spanT * i) / n;
        const label = axisDate(t, spanT);
        if (label === last && i !== n) continue;
        last = label;
        xTicks.push({ x: xOf(t), label });
      }
    } else {
      xTicks.push({ x: xOf(t0), label: axisDate(t0, 0) });
    }

    return { path, area, xs, ys, yTicks, xTicks, min: Math.min(...ratings), max: Math.max(...ratings) };
  }, [view]);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i] - x) < Math.abs(xs[best] - x)) best = i;
    setHover(best);
  };

  const h = hover != null ? view[hover] : null;

  return (
    <div className="plate p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="smallcaps text-[10px] text-parchment-400">Rating history</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-parchment-400">
            low {Math.round(min)} · high {Math.round(max)}
          </span>
          {available.length > 1 && (
            <div className="flex overflow-hidden rounded-sm border border-white/10" role="group" aria-label="Time range">
              {available.map((r) => {
                const on = r.key === effectiveRange;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRange(r.key)}
                    aria-pressed={on}
                    className={
                      "px-2 py-0.5 text-[10px] font-medium tabular-nums transition " +
                      (on
                        ? "bg-gold/15 text-gold-leaf"
                        : "text-parchment-400 hover:bg-white/[0.04] hover:text-parchment-200")
                    }
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="relative mt-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full touch-none"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={`Rating history from ${Math.round(view[0].rating)} to ${Math.round(view[view.length - 1].rating)}`}
        >
          <defs>
            {/* Soft accent wash that fades to nothing before the baseline. */}
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--accent-hi-rgb))" stopOpacity={0.18} />
              <stop offset="100%" stopColor="rgb(var(--accent-hi-rgb))" stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Dated vertical gridlines + bottom x labels (Lichess time axis). */}
          {xTicks.map((t, i) => (
            <g key={`x-${i}`}>
              <line
                x1={t.x}
                x2={t.x}
                y1={PAD.top}
                y2={H - PAD.bottom}
                stroke="var(--paper-dim)"
                strokeOpacity={0.1}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={t.x}
                y={H - 8}
                textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
                fontSize={10}
                fill="var(--paper-dim)"
              >
                {t.label}
              </text>
            </g>
          ))}

          {/* Muted horizontal grid + mirrored y labels (Lichess right-axis). */}
          {yTicks.map((t) => (
            <g key={t.label}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={t.y}
                y2={t.y}
                stroke="var(--paper-dim)"
                strokeOpacity={0.16}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
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
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
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
                vectorEffect="non-scaling-stroke"
              />
              {/* Accent node with a soft halo + surface-toned ring, echoing
                  Lichess's pale hover dot. */}
              <circle
                cx={xs[hover]}
                cy={ys[hover]}
                r={7}
                fill="rgb(var(--accent-hi-rgb))"
                fillOpacity={0.18}
              />
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
