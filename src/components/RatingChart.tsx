"use client";

// Rating-over-time line for profile pages (a la Lichess). Single series in
// the site accent, recessive grid, crosshair + tooltip on hover.

import { useMemo, useRef, useState } from "react";

export interface RatingPoint {
  at: number;
  rating: number;
}

const W = 600;
const H = 180;
const PAD = { top: 12, right: 12, bottom: 22, left: 40 };

export function RatingChart({ points }: { points: RatingPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

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

    // Three round-numbered gridlines inside the range.
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
          className="w-full h-auto block touch-none"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={`Rating history from ${Math.round(points[0].rating)} to ${Math.round(points[points.length - 1].rating)}`}
        >
          {ticks.map((t) => (
            <g key={t.label}>
              <line x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
              <text x={PAD.left - 6} y={t.y + 3} textAnchor="end" fontSize={10} fill="#7f7d77">
                {t.label}
              </text>
            </g>
          ))}
          <path d={area} fill="rgb(var(--accent-rgb) / 0.08)" />
          <path d={path} fill="none" stroke="rgb(var(--accent-hi-rgb))" strokeWidth={2} strokeLinejoin="round" />
          {hover != null && (
            <g>
              <line
                x1={xs[hover]}
                x2={xs[hover]}
                y1={PAD.top}
                y2={H - PAD.bottom}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={1}
              />
              <circle cx={xs[hover]} cy={ys[hover]} r={4} fill="rgb(var(--accent-hi-rgb))" stroke="#1a1917" strokeWidth={2} />
            </g>
          )}
          <text x={PAD.left} y={H - 6} fontSize={10} fill="#7f7d77">
            {new Date(points[0].at).toLocaleDateString()}
          </text>
          <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize={10} fill="#7f7d77">
            {new Date(points[points.length - 1].at).toLocaleDateString()}
          </text>
        </svg>
        {/* not .plate: it forces position:relative, which would knock out `absolute` */}
        {h && (
          <div
            className="absolute -translate-x-1/2 -top-1 pointer-events-none bg-[#262421] border border-white/10 px-2 py-1 text-xs whitespace-nowrap"
            style={{ left: `${(xs[hover!] / W) * 100}%` }}
          >
            <span className="text-gold-leaf font-semibold">{Math.round(h.rating)}</span>
            <span className="text-parchment-400"> · {new Date(h.at).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
