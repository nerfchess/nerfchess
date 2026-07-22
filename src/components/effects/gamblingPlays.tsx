// Gambling plugin signatures (bespoke literal card animations) for the 28
// overhaul gm_* cards. See sigPlugins.tsx for the contract. Self-contained:
// own SVG, own CSS (gamblingPlays.css), transform/opacity only. Does NOT
// import from BoardEffects.tsx (cycle hazard) and is registered only through
// sigPluginsMerged.tsx.
//
// OUTCOME-HONEST by design: every gambling card rolls with the seeded effect
// RNG and stores what actually happened in inst.state (gambling.ts). The
// firing surfaces stash that state via gamblingOutcome.ts and each Render
// takes it at mount, so the lootbox opens the rarity it opened, the coin
// lands on the face it landed on, the wheel stops on the segment it rolled.
// A missing stash (late queue replay, spectator edge) plays a neutral
// variant that claims nothing.
//
// Choreography follows the casinoPlays.tsx vocabulary: a lead-only Wide
// scene (~1.5-2.7s), a small square-local flourish for non-lead squares,
// chunky silhouettes, satisfying easing, reduced-motion gated in the CSS.

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { SigPlugin } from "./sigPlugins";
import { takeGamblingOutcome } from "./gamblingOutcome";
import "./gamblingPlays.css";

/* ------------------------------------------------------------------------- */
/* Outcome plumbing                                                           */
/* ------------------------------------------------------------------------- */

// The lead scene and the square-local flourishes of ONE play mount together,
// but the stash is single-read. First reader takes it, later mounts of the
// same fire (and StrictMode's double render) reuse the cached copy.
const lastOutcome = new Map<string, Record<string, unknown>>();

function outcomeOf(id: string): Record<string, unknown> | null {
  const fresh = takeGamblingOutcome(id);
  if (fresh) {
    lastOutcome.set(id, fresh);
    return fresh;
  }
  return lastOutcome.get(id) ?? null;
}

/** Read the card's true outcome once, at mount. null = play it neutral. */
function useOutcome(id: string): Record<string, unknown> | null {
  const [o] = useState(() => outcomeOf(id));
  return o;
}

const oStr = (o: Record<string, unknown> | null, key: string): string | null =>
  o && typeof o[key] === "string" ? (o[key] as string) : null;
const oNum = (o: Record<string, unknown> | null, key: string): number | null =>
  o && typeof o[key] === "number" ? (o[key] as number) : null;
const oArr = (o: Record<string, unknown> | null, key: string): unknown[] | null =>
  o && Array.isArray(o[key]) ? (o[key] as unknown[]) : null;

/* ------------------------------------------------------------------------- */
/* Shared staging                                                             */
/* ------------------------------------------------------------------------- */

interface PlayProps {
  lead: boolean;
  delayMs: number;
}

/** Inline animation-delay (all choreography offsets flow through this). */
const d = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });
/** Delay plus arbitrary CSS custom properties (reel stops, wheel turns). */
const dv = (ms: number, vars: Record<string, string>): CSSProperties =>
  ({ animationDelay: `${ms}ms`, ...vars }) as CSSProperties;

/** Square-local stage (small non-lead flourishes). */
function Stage({ children }: { children: ReactNode }) {
  return (
    <span className="gsp pointer-events-none absolute z-20 block" style={{ inset: 0 }} aria-hidden="true">
      {children}
    </span>
  );
}

/** Board-crop stage for a wide lead: oversized around the lead square so the
 * skit takes over the whole visible board (the caller's crop clips it). Same
 * geometry as casinoPlays' Wide, rebuilt here (no cross-module import). */
function Wide({ children }: { children: ReactNode }) {
  return (
    <span className="gsp pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      <span className="absolute left-[-650%] top-[-650%] block h-[1400%] w-[1400%]">{children}</span>
    </span>
  );
}

/** Small square flourish: one glyph popping on the square. */
function Mini({ delayMs, children }: { delayMs: number; children: ReactNode }) {
  return (
    <Stage>
      <svg viewBox="0 0 40 40" className="h-full w-full">
        <g className="gsp-pop" style={d(delayMs)}>
          {children}
        </g>
      </svg>
    </Stage>
  );
}

/* ------------------------------------------------------------------------- */
/* Palette + reusable props                                                   */
/* ------------------------------------------------------------------------- */

const GOLD = "#ffd76a";
const GOLD_EDGE = "#b98a1e";
const RED = "#e04b63";
const DEEP_RED = "#8a1230";
const GREEN = "#4fd08a";
const FELT = "#0d3a24";
const FELT_EDGE = "#1f6b44";
const BLUE = "#7fa0e0";
const PURPLE = "#b98cff";
const GREY = "#b9bec9";
const INK = "#12070d";
const CREAM = "#e8dcc0";
const WOOD = "#8a5a2a";
const WOOD_DARK = "#4a2f14";

/** A stacked poker chip (top ellipse + rim), themed by color. */
function Chip({ cx, cy, r = 6, fill = "#d6234f", edge = DEEP_RED }: { cx: number; cy: number; r?: number; fill?: string; edge?: string }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <ellipse cx={0} cy={r * 0.42} rx={r} ry={r * 0.42} fill={edge} />
      <ellipse cx={0} cy={0} rx={r} ry={r * 0.42} fill={fill} stroke={edge} strokeWidth={0.5} />
      <ellipse cx={0} cy={0} rx={r * 0.6} ry={r * 0.25} fill="none" stroke="#fff" strokeWidth={0.7} strokeDasharray="1.4 1.2" opacity={0.85} />
    </g>
  );
}

/** Sparkle star (jackpot / big win). */
function Star({ x, y, s = 1, fill = GOLD }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -5 l1.5 3.4 3.7 0.4 -2.8 2.5 0.8 3.6 -3.2 -1.9 -3.2 1.9 0.8 -3.6 -2.8 -2.5 3.7 -0.4 Z"
      fill={fill}
    />
  );
}

/** Winnings arc down toward the player's rail (bottom edge). */
function Payout({ x, y, delayMs, n = 5 }: { x: number; y: number; delayMs: number; n?: number }) {
  const lanes = [
    { px: "-190%", py: "420%" },
    { px: "-90%", py: "540%" },
    { px: "10%", py: "460%" },
    { px: "110%", py: "560%" },
    { px: "200%", py: "440%" },
  ];
  return (
    <>
      {lanes.slice(0, n).map((p, i) => (
        <g key={i} className="gsp-payout" style={dv(delayMs + i * 90, { "--px": p.px, "--py": p.py })}>
          <Chip cx={x} cy={y} r={3.6} fill={GOLD} edge={GOLD_EDGE} />
        </g>
      ))}
    </>
  );
}

/** Grey sad-puff wisps (the bust beat). */
function SadPuffs({ x, y, delayMs }: { x: number; y: number; delayMs: number }) {
  return (
    <>
      <g className="gsp-puff" style={d(delayMs)}><circle cx={x - 4} cy={y} r={2.4} fill="rgba(185,190,201,0.75)" /></g>
      <g className="gsp-puff" style={d(delayMs + 160)}><circle cx={x + 3} cy={y - 2} r={1.8} fill="rgba(185,190,201,0.6)" /></g>
      <g className="gsp-puff" style={d(delayMs + 320)}><circle cx={x + 7} cy={y + 1} r={1.3} fill="rgba(185,190,201,0.5)" /></g>
    </>
  );
}

/** Verdict tag: a small banner that pops in under the scene. */
function Tag({ x, y, w, text, delayMs, color = GOLD }: { x: number; y: number; w: number; text: string; delayMs: number; color?: string }) {
  return (
    <g className="gsp-pop" style={d(delayMs)}>
      <rect x={x - w / 2} y={y - 5.4} width={w} height={10} rx={2.4} fill={INK} stroke={color} strokeWidth={1} />
      <text x={x} y={y + 2.4} fontSize={5} fontWeight={800} fill={color} textAnchor="middle">{text}</text>
    </g>
  );
}

/* --- chess piece silhouettes (chunky, centered on 0,0, ~14 tall) ----------- */

function PawnSil({ fill = CREAM, s = 1 }: { fill?: string; s?: number }) {
  return (
    <g transform={`scale(${s})`}>
      <circle cx={0} cy={-4.6} r={2.7} fill={fill} />
      <path d="M-2.2 -2.4 Q0 -0.6 2.2 -2.4 L3.2 4.2 H-3.2 Z" fill={fill} />
      <rect x={-4.2} y={4.2} width={8.4} height={2.4} rx={1.1} fill={fill} />
    </g>
  );
}

function KnightSil({ fill = CREAM, s = 1 }: { fill?: string; s?: number }) {
  return (
    <g transform={`scale(${s})`}>
      <path d="M-3.6 4.2 L-2.6 -0.6 Q-2.2 -3.4 0 -4.8 L-0.6 -7 L1.6 -5.6 Q4.4 -4.4 4.6 -1.4 L4.8 0.6 L2.6 0 Q1.4 1.6 2.6 4.2 Z" fill={fill} />
      <rect x={-4.6} y={4.2} width={9.6} height={2.4} rx={1.1} fill={fill} />
    </g>
  );
}

function BishopSil({ fill = CREAM, s = 1 }: { fill?: string; s?: number }) {
  return (
    <g transform={`scale(${s})`}>
      <circle cx={0} cy={-6.4} r={1.2} fill={fill} />
      <path d="M0 -5.4 Q3.4 -2.2 2.4 1 Q1.4 3.4 0 3.4 Q-1.4 3.4 -2.4 1 Q-3.4 -2.2 0 -5.4 Z" fill={fill} />
      <rect x={-3.8} y={3.6} width={7.6} height={2.4} rx={1.1} fill={fill} />
    </g>
  );
}

function RookSil({ fill = CREAM, s = 1 }: { fill?: string; s?: number }) {
  return (
    <g transform={`scale(${s})`}>
      <path d="M-4 -6.6 h2 v1.8 h1.4 v-1.8 h1.2 v1.8 H2 v-1.8 h2 v3.4 h-1 L2.6 3 h-5.2 L-3 -3.2 h-1 Z" fill={fill} />
      <rect x={-4.4} y={3} width={8.8} height={2.6} rx={1.1} fill={fill} />
    </g>
  );
}

function QueenSil({ fill = CREAM, s = 1 }: { fill?: string; s?: number }) {
  return (
    <g transform={`scale(${s})`}>
      <path d="M-4.6 -3.4 L-3 3 h6 L4.6 -3.4 L2.2 -1 L0 -5.4 L-2.2 -1 Z" fill={fill} />
      <circle cx={-4.6} cy={-4} r={1} fill={fill} />
      <circle cx={0} cy={-6.2} r={1} fill={fill} />
      <circle cx={4.6} cy={-4} r={1} fill={fill} />
      <rect x={-4.2} y={3.2} width={8.4} height={2.4} rx={1.1} fill={fill} />
    </g>
  );
}

const PIECE_SIL: Record<string, (p: { fill?: string; s?: number }) => ReactNode> = {
  pawn: PawnSil,
  knight: KnightSil,
  bishop: BishopSil,
  rook: RookSil,
  queen: QueenSil,
};

/* --- dice ------------------------------------------------------------------ */

const PIP_LAYOUT: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-2.8, -2.8], [2.8, 2.8]],
  3: [[-2.8, -2.8], [0, 0], [2.8, 2.8]],
  4: [[-2.8, -2.8], [2.8, -2.8], [-2.8, 2.8], [2.8, 2.8]],
  5: [[-2.8, -2.8], [2.8, -2.8], [0, 0], [-2.8, 2.8], [2.8, 2.8]],
  6: [[-2.8, -2.8], [2.8, -2.8], [-2.8, 0], [2.8, 0], [-2.8, 2.8], [2.8, 2.8]],
};

/** A die face; value null draws a blank "?" face (neutral). */
function Die({ v, s = 1, body = "#fdfbf4", pip = INK }: { v: number | null; s?: number; body?: string; pip?: string }) {
  return (
    <g transform={`scale(${s})`}>
      <rect x={-5.4} y={-5.4} width={10.8} height={10.8} rx={2.2} fill={body} stroke="#c9c2ac" strokeWidth={0.9} />
      {v == null ? (
        <text x={0} y={2.6} fontSize={7} fontWeight={800} fill={pip} textAnchor="middle">?</text>
      ) : (
        (PIP_LAYOUT[Math.max(1, Math.min(6, v))] ?? []).map(([px, py], i) => (
          <circle key={i} cx={px} cy={py} r={1.15} fill={pip} />
        ))
      )}
    </g>
  );
}

/* --- playing cards ----------------------------------------------------------- */

function CardBack({ w = 16, h = 23 }: { w?: number; h?: number }) {
  return (
    <>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={2.2} fill="#2c4f9e" stroke="#16264d" strokeWidth={1} />
      <rect x={-w / 2 + 1.6} y={-h / 2 + 1.6} width={w - 3.2} height={h - 3.2} rx={1.6} fill="none" stroke={BLUE} strokeWidth={0.7} strokeDasharray="2 1.6" />
    </>
  );
}

function CardFace({ w = 16, h = 23, pip = "#d6234f", label, children }: { w?: number; h?: number; pip?: string; label?: string; children?: ReactNode }) {
  return (
    <>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={2.2} fill="#fdfbf4" stroke="#c9c2ac" strokeWidth={1} />
      {label != null && (
        <text x={0} y={2.6} fontSize={7.4} fontWeight={800} fill={pip} textAnchor="middle">{label}</text>
      )}
      {children}
    </>
  );
}

/** A card that snap-flips from back to face at flipMs. */
function FlipCard({ x, y, tilt = 0, dealMs, flipMs, face }: { x: number; y: number; tilt?: number; dealMs: number; flipMs: number; face: ReactNode }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="gsp-deal" style={dv(dealMs, { "--tilt": `${tilt}deg` })}>
        <g transform={`rotate(${tilt})`}>
          <g className="gsp-flipback" style={d(flipMs)}><CardBack /></g>
          <g className="gsp-flipface" style={d(flipMs)}>{face}</g>
        </g>
      </g>
    </g>
  );
}

/* --- wheels -------------------------------------------------------------------- */

/** Pie segment path (angles in degrees, clockwise, 0 = pointing right). */
function segPath(r: number, a0: number, a1: number): string {
  const r0 = (a0 * Math.PI) / 180;
  const r1 = (a1 * Math.PI) / 180;
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M0 0 L${(r * Math.cos(r0)).toFixed(2)} ${(r * Math.sin(r0)).toFixed(2)} A${r} ${r} 0 ${large} 1 ${(r * Math.cos(r1)).toFixed(2)} ${(r * Math.sin(r1)).toFixed(2)} Z`;
}

/** Rotation that parks segment `seg` (of n) under a pointer at 12 o'clock,
 * after `turns` full spins. Segment 0 starts at 12 o'clock and runs CW. */
function turnFor(seg: number, n: number, turns = 3): string {
  const arc = 360 / n;
  return `${turns * 360 - (seg * arc + arc / 2)}deg`;
}

/** Pointer wedge at 12 o'clock (flicked by the passing pegs). */
function Pointer({ cy, delayMs }: { cy: number; delayMs: number }) {
  return (
    <g className="gsp-pointer" style={d(delayMs)}>
      <path d={`M-3 ${cy - 4} h6 l-3 7 Z`} fill={GOLD} stroke={GOLD_EDGE} strokeWidth={0.8} />
    </g>
  );
}

/* --- reels ----------------------------------------------------------------------- */

const REEL_FILL = ["7", "★", "♦", "♣", "★", "7", "♦"];
const REEL_COLORS: Record<string, string> = { "7": "#ff4d6d", "★": GOLD, "♦": "#5fc9b0", "♣": BLUE };

/** One reel: a strip of symbols that spins down and STOPS with `final`
 * centered in the window (exact px stop, so the payline is outcome-true). */
function SlotReel({ x, delayMs, spinMs, final }: { x: number; delayMs: number; spinMs: number; final: string }) {
  const rows = [...REEL_FILL.slice(0, 5), final, ...REEL_FILL.slice(5)];
  const FINAL_I = 5;
  return (
    <g transform={`translate(${x} 0)`}>
      <g className="gsp-reel" style={dv(delayMs, { "--spin": `${spinMs}ms`, "--stop": `${-FINAL_I * 13}px` })}>
        {rows.map((sym, i) => (
          <text key={i} x={0} y={i * 13 + 3.4} fontSize={10} fontWeight={800} fill={REEL_COLORS[sym] ?? CREAM} textAnchor="middle">
            {sym}
          </text>
        ))}
      </g>
    </g>
  );
}

/* ========================================================================= */
/* 1. Penny Slots (t1) - the reels stop on what the lever actually paid       */
/* ========================================================================= */

function PennySlotsPlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_penny_slots");
  const result = oStr(o, "result"); // blank | sidestep | jackpot | null
  const finals =
    result === "jackpot" ? ["7", "7", "7"]
    : result === "sidestep" ? ["★", "★", "★"]
    : result === "blank" ? ["7", "★", "♣"]
    : ["♦", "★", "♣"];
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <rect x={9} y={13} width={22} height={14} rx={2} fill="#1b2333" stroke="#3a475f" strokeWidth={1.2} />
        <text x={20} y={24} fontSize={8} fontWeight={800} fill={result === "blank" ? GREY : GOLD} textAnchor="middle">
          {result === "jackpot" ? "777" : result === "blank" ? "7-★" : "★★★"}
        </text>
      </Mini>
    );
  }
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(30,10,20,0.55)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          {/* penny cabinet */}
          <rect x={26} y={22} width={48} height={58} rx={5} fill="#3a1524" stroke={GOLD} strokeWidth={2} />
          <rect x={30} y={26} width={40} height={8} rx={2} fill={INK} />
          <text x={50} y={32.2} fontSize={5.2} fontWeight={800} fill={GOLD} textAnchor="middle" style={{ letterSpacing: "1px" }}>PENNY SLOTS</text>
          <rect x={31} y={39} width={38} height={24} rx={2.5} fill="#0c1420" stroke="#5a6b8f" strokeWidth={1.5} />
          <clipPath id="gsp-pslot-win"><rect x={32} y={40} width={36} height={22} rx={2} /></clipPath>
          <g clipPath="url(#gsp-pslot-win)">
            <g transform="translate(0 51)">
              <SlotReel x={41} delayMs={delayMs + 150} spinMs={850} final={finals[0]} />
              <SlotReel x={50} delayMs={delayMs + 330} spinMs={1080} final={finals[1]} />
              <SlotReel x={59} delayMs={delayMs + 540} spinMs={1320} final={finals[2]} />
            </g>
          </g>
          {/* coin slot + sticky lever */}
          <rect x={32} y={67} width={36} height={9} rx={2} fill={INK} />
          <circle cx={50} cy={71.5} r={2.2} fill="#c47a3a" />
          <g className="gsp-lever" style={d(delayMs + 60)}>
            <rect x={73} y={40} width={2.4} height={18} rx={1.2} fill="#8a94a8" />
            <circle cx={74.2} cy={39} r={3} fill="#d6234f" stroke={DEEP_RED} strokeWidth={0.8} />
          </g>
        </g>
        {result === "jackpot" && (
          <>
            <g className="gsp-flash" style={d(delayMs + 1100)}><rect x={31} y={49} width={38} height={4} rx={2} fill="#ff4d6d" /></g>
            <g className="gsp-star" style={d(delayMs + 1900)}><Star x={38} y={44} s={1.3} /></g>
            <g className="gsp-star" style={d(delayMs + 2050)}><Star x={62} y={44} s={1.1} /></g>
            <g className="gsp-pop" style={d(delayMs + 2000)}><g transform="translate(50 14)"><PawnSil fill={GOLD} /></g></g>
            <Tag x={50} y={90} w={52} text="JACKPOT! A FRESH PAWN" delayMs={delayMs + 1950} />
            <Payout x={50} y={74} delayMs={delayMs + 2050} />
          </>
        )}
        {result === "sidestep" && (
          <>
            <g className="gsp-step" style={d(delayMs + 1950)}>
              <g transform="translate(59 13)"><PawnSil fill={CREAM} s={0.9} /></g>
              <path d="M48 13 h6 m-2.4 -2.4 l2.6 2.4 -2.6 2.4" stroke={GREEN} strokeWidth={1.4} fill="none" />
            </g>
            <Tag x={50} y={90} w={48} text="A PAWN SIDESTEPS" delayMs={delayMs + 1900} color={GREEN} />
          </>
        )}
        {result === "blank" && (
          <>
            <SadPuffs x={50} y={16} delayMs={delayMs + 1950} />
            <Tag x={50} y={90} w={34} text="NO WIN" delayMs={delayMs + 1900} color={GREY} />
          </>
        )}
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 2. Heads or Tails (t1) - the coin lands on the TRUE face                   */
/* ========================================================================= */

function HeadsOrTailsPlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_heads_or_tails");
  const result = oStr(o, "result"); // heads | tails | null
  const face = result === "heads" ? "H" : result === "tails" ? "T" : "?";
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <circle cx={20} cy={20} r={8} fill={GOLD} stroke={GOLD_EDGE} strokeWidth={1.2} />
        <text x={20} y={23.2} fontSize={9} fontWeight={800} fill="#8a5a10" textAnchor="middle">{face}</text>
      </Mini>
    );
  }
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(28,20,8,0.5)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          <rect x={16} y={76} width={68} height={12} rx={3} fill={FELT} stroke={FELT_EDGE} strokeWidth={1.4} />
          <text x={50} y={26} fontSize={6} fontWeight={800} fill={CREAM} textAnchor="middle" style={{ letterSpacing: "1px" }}>BEST OUT OF ONE</text>
          {/* the thumb that launched it */}
          <path d="M36 84 q3 -5 8 -4" stroke={CREAM} strokeWidth={2} fill="none" strokeLinecap="round" />
        </g>
        {/* toss, tumble, land on the true face */}
        <g className="gsp-toss" style={d(delayMs + 120)}>
          <g className="gsp-tumble" style={d(delayMs + 120)} transform="translate(50 62)">
            <circle r={10} fill={GOLD} stroke={GOLD_EDGE} strokeWidth={1.5} />
            <circle r={7.4} fill="none" stroke={GOLD_EDGE} strokeWidth={0.6} strokeDasharray="1.8 1.4" />
            <text x={0} y={3.8} fontSize={10} fontWeight={800} fill="#8a5a10" textAnchor="middle">{face}</text>
          </g>
        </g>
        {result === "heads" && (
          <>
            <g className="gsp-flash" style={d(delayMs + 1500)}><circle cx={50} cy={62} r={13} fill="#ffef9f" opacity={0.6} /></g>
            <g className="gsp-star" style={d(delayMs + 1750)}><Star x={38} y={52} s={1.3} /></g>
            <g className="gsp-star" style={d(delayMs + 1900)}><Star x={63} y={54} s={1.1} /></g>
            <Tag x={50} y={90} w={40} text="HEADS: +1 MOVE" delayMs={delayMs + 1750} color={GREEN} />
          </>
        )}
        {result === "tails" && (
          <>
            <SadPuffs x={50} y={48} delayMs={delayMs + 1550} />
            <g className="gsp-rise" style={d(delayMs + 1650)}>
              <text x={62} y={48} fontSize={5.4} fontWeight={800} fill={GREY} textAnchor="middle">ha ha</text>
            </g>
            <Tag x={50} y={90} w={48} text="TAILS: THE COIN LAUGHS" delayMs={delayMs + 1700} color={GREY} />
          </>
        )}
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 3. Claw Machine (t1) - the claw hoists the prize it actually grabbed       */
/* ========================================================================= */

function PlushBlob({ s = 1 }: { s?: number }) {
  return (
    <g transform={`scale(${s})`}>
      <circle cx={-2.6} cy={-5.4} r={1.7} fill="#f2a2c0" />
      <circle cx={2.6} cy={-5.4} r={1.7} fill="#f2a2c0" />
      <circle cx={0} cy={0} r={5} fill="#f7bcd3" stroke="#d67ba0" strokeWidth={0.8} />
      <circle cx={-1.7} cy={-1} r={0.7} fill={INK} />
      <circle cx={1.7} cy={-1} r={0.7} fill={INK} />
      <path d="M-1.4 1.6 q1.4 1.2 2.8 0" stroke={INK} strokeWidth={0.7} fill="none" />
    </g>
  );
}

function PeekCard({ s = 1 }: { s?: number }) {
  return (
    <g transform={`scale(${s})`}>
      <rect x={-4.4} y={-6} width={8.8} height={12} rx={1.6} fill="#fdfbf4" stroke="#c9c2ac" strokeWidth={0.8} />
      <path d="M-2.8 0 q2.8 -3 5.6 0 q-2.8 3 -5.6 0 Z" fill="none" stroke={BLUE} strokeWidth={0.9} />
      <circle cx={0} cy={0} r={1.1} fill={BLUE} />
    </g>
  );
}

function ClawMachinePlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_claw_machine");
  const result = oStr(o, "result"); // plush | peek | pawn | null
  const prize =
    result === "plush" ? <PlushBlob s={0.9} />
    : result === "peek" ? <PeekCard s={0.9} />
    : result === "pawn" ? <PawnSil fill={CREAM} s={0.9} />
    : <text x={0} y={2.6} fontSize={7} fontWeight={800} fill={GREY} textAnchor="middle">?</text>;
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <path d="M20 8 v6 M16 14 l4 6 4 -6" stroke="#8a94a8" strokeWidth={1.8} fill="none" strokeLinecap="round" />
        <g transform="translate(20 27)">{prize}</g>
      </Mini>
    );
  }
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(10,14,30,0.55)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          {/* cabinet */}
          <rect x={26} y={16} width={48} height={68} rx={4} fill="#22304d" stroke="#ffd76a" strokeWidth={2} />
          <rect x={30} y={26} width={40} height={44} rx={2.5} fill="#0c1420" stroke="#5a6b8f" strokeWidth={1.4} />
          <text x={50} y={23} fontSize={5} fontWeight={800} fill={GOLD} textAnchor="middle" style={{ letterSpacing: "1px" }}>THE CLAW</text>
          {/* prize pit */}
          <g transform="translate(37 64)"><PlushBlob s={0.8} /></g>
          <g transform="translate(50 65)"><PawnSil s={0.8} /></g>
          <g transform="translate(62 64)"><PeekCard s={0.8} /></g>
          {/* chute */}
          <rect x={30} y={72} width={12} height={8} rx={1.5} fill={INK} stroke="#5a6b8f" strokeWidth={0.8} />
          <text x={36} y={78} fontSize={3.6} fontWeight={700} fill={GREY} textAnchor="middle">WIN</text>
          {/* rail */}
          <rect x={30} y={27} width={40} height={2.2} rx={1.1} fill="#39496e" />
        </g>
        {/* the claw: slide over, drop, pinch, hoist the true prize */}
        <g className="gsp-clawdrop" style={d(delayMs + 150)}>
          <g transform="translate(50 29)">
            <rect x={-3.4} y={-2} width={6.8} height={4} rx={1.2} fill="#8a94a8" />
            <path d="M0 2 v7" stroke="#8a94a8" strokeWidth={1.4} />
            <g className="gsp-prong-l" style={d(delayMs + 150)}>
              <path d="M0 9 q-4.4 2 -4.6 7.4" stroke="#c3cad6" strokeWidth={1.7} fill="none" strokeLinecap="round" />
            </g>
            <g className="gsp-prong-r" style={d(delayMs + 150)}>
              <path d="M0 9 q4.4 2 4.6 7.4" stroke="#c3cad6" strokeWidth={1.7} fill="none" strokeLinecap="round" />
            </g>
            <g className="gsp-prize" style={d(delayMs + 150)}>
              <g transform="translate(0 17)">{prize}</g>
            </g>
          </g>
        </g>
        {result === "plush" && <Tag x={50} y={92} w={58} text="PLUSH RIDES YOUR KING (5 TURNS)" delayMs={delayMs + 2150} color="#f2a2c0" />}
        {result === "peek" && <Tag x={50} y={92} w={54} text="PEEK AT THEIR NEXT OFFER" delayMs={delayMs + 2150} color={BLUE} />}
        {result === "pawn" && (
          <>
            <g className="gsp-star" style={d(delayMs + 2200)}><Star x={38} y={20} s={1.2} /></g>
            <Tag x={50} y={92} w={48} text="THE CLAW DROPS A PAWN" delayMs={delayMs + 2150} color={GREEN} />
          </>
        )}
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 4. Raffle Ticket (t2) - drum tumbles, a winning stub flies out             */
/* ========================================================================= */

function RaffleTicketPlay({ lead, delayMs }: PlayProps) {
  // Fires only when a draw actually paid (the hook mutates the board on a
  // win), so the choreography is always the winning draw.
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <rect x={11} y={15} width={18} height={10} rx={1.6} fill={GOLD} stroke={GOLD_EDGE} strokeWidth={1} transform="rotate(-8 20 20)" />
        <circle cx={20} cy={20} r={2.2} fill="none" stroke={GOLD_EDGE} strokeWidth={0.8} strokeDasharray="1.2 1" />
      </Mini>
    );
  }
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(28,20,8,0.5)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          <text x={50} y={22} fontSize={6} fontWeight={800} fill={CREAM} textAnchor="middle" style={{ letterSpacing: "1px" }}>HOURLY DRAW</text>
          {/* stand */}
          <path d="M38 74 h24 M42 74 L46 60 M58 74 L54 60" stroke={WOOD} strokeWidth={2.4} strokeLinecap="round" />
        </g>
        {/* the drum tumbles with the stubs inside */}
        <g transform="translate(50 46)">
          <g className="gsp-drum" style={d(delayMs + 100)}>
            <circle r={16} fill="#3a1524" stroke={GOLD} strokeWidth={2} />
            <circle r={16} fill="none" stroke="#6b2a42" strokeWidth={0.8} strokeDasharray="4 3" />
            <rect x={-6} y={-9} width={9} height={5} rx={1} fill={GOLD} transform="rotate(20)" />
            <rect x={-2} y={2} width={9} height={5} rx={1} fill="#f2a2c0" transform="rotate(-14)" />
            <rect x={-9} y={1} width={9} height={5} rx={1} fill={BLUE} transform="rotate(48)" />
          </g>
          <path d="M0 -19 v4" stroke={GOLD_EDGE} strokeWidth={1.6} />
        </g>
        {/* the winning stub flies out */}
        <g className="gsp-ticket" style={d(delayMs + 300)}>
          <g transform="translate(52 42)">
            <rect x={-6} y={-3.4} width={12} height={6.8} rx={1.2} fill={GOLD} stroke={GOLD_EDGE} strokeWidth={0.9} />
            <text x={0} y={1.8} fontSize={3.8} fontWeight={800} fill="#8a5a10" textAnchor="middle">WIN</text>
          </g>
        </g>
        {/* the paid pawn marches a free square */}
        <g className="gsp-step" style={d(delayMs + 1500)}>
          <g transform="translate(76 30)"><PawnSil fill={CREAM} s={0.95} /></g>
          <path d="M76 18 v-5 m-2.6 2.4 l2.6 -2.6 2.6 2.6" stroke={GREEN} strokeWidth={1.4} fill="none" />
        </g>
        <g className="gsp-star" style={d(delayMs + 1650)}><Star x={64} y={24} s={1.1} /></g>
        <Tag x={50} y={90} w={52} text="WINNER: A FREE MARCH" delayMs={delayMs + 1550} color={GREEN} />
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 5. Card Counting (t2) - the streak flips exactly as many hits as it hit    */
/* ========================================================================= */

function CardCountingPlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_card_counting");
  const hits = oNum(o, "result"); // 0..3 | null
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <g transform="translate(15 20) scale(0.62) rotate(-10)"><CardBack /></g>
        <g transform="translate(21 20) scale(0.62)"><CardFace label="♠" pip={INK} /></g>
        <text x={31} y={13} fontSize={7} fontWeight={800} fill={GOLD} textAnchor="middle">{hits ?? "?"}</text>
      </Mini>
    );
  }
  const known = hits != null;
  const verdictAt = (i: number) => delayMs + 500 + i * 420;
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(8,26,16,0.5)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          <path d="M8 86 Q50 58 92 86" fill="none" stroke={FELT_EDGE} strokeWidth={2.4} />
          <text x={50} y={24} fontSize={6} fontWeight={800} fill={CREAM} textAnchor="middle" style={{ letterSpacing: "1px" }}>THE SHOE KNOWS</text>
          {/* the shoe */}
          <path d="M76 46 h14 v10 l-14 4 Z" fill={WOOD} stroke={WOOD_DARK} strokeWidth={1.2} />
        </g>
        {/* three draws; each flips its true verdict, the streak dies on a miss */}
        {[0, 1, 2].map((i) => {
          const state: "hit" | "miss" | "unturned" = !known ? "unturned" : i < hits ? "hit" : i === hits ? "miss" : "unturned";
          const x = 32 + i * 18;
          return (
            <g key={i} className="gsp-linger gsp-linger--long" style={d(delayMs)}>
              {state === "unturned" ? (
                <g transform={`translate(${x} 58)`}>
                  <g className="gsp-deal" style={dv(delayMs + 200 + i * 300, { "--tilt": "0deg" })}><CardBack /></g>
                </g>
              ) : (
                <FlipCard
                  x={x}
                  y={58}
                  tilt={i === 0 ? -6 : i === 2 ? 6 : 0}
                  dealMs={delayMs + 200 + i * 300}
                  flipMs={verdictAt(i)}
                  face={
                    state === "hit" ? (
                      <CardFace pip={GOLD_EDGE}><Star x={0} y={0} s={0.9} /><text x={0} y={8.4} fontSize={4} fontWeight={800} fill={GOLD_EDGE} textAnchor="middle">HIT</text></CardFace>
                    ) : (
                      <CardFace pip={RED} label="✕" />
                    )
                  }
                />
              )}
            </g>
          );
        })}
        {known && hits >= 1 && (
          <g className="gsp-step" style={d(delayMs + 2050)}>
            <g transform="translate(72 26)"><PawnSil fill={CREAM} s={0.9} /></g>
            <path d="M62 26 h5 m-2 -2.2 l2.4 2.2 -2.4 2.2" stroke={GREEN} strokeWidth={1.3} fill="none" />
          </g>
        )}
        {known && hits >= 3 && <g className="gsp-star" style={d(delayMs + 2200)}><Star x={30} y={30} s={1.4} /></g>}
        {known && hits >= 1 && <Payout x={50} y={76} delayMs={delayMs + 2150} n={hits + 1} />}
        <Tag
          x={50}
          y={90}
          w={56}
          text={
            !known ? "COUNTING..."
            : hits === 0 ? "COLD DECK: NO HITS"
            : hits === 1 ? "1 HIT: PAWN SIDESTEPS"
            : hits === 2 ? "2 HITS: SIDESTEP + ADVANCE"
            : "3 HITS: A FRESH PAWN JOINS"
          }
          delayMs={delayMs + 1950}
          color={!known || hits === 0 ? GREY : GREEN}
        />
        {known && hits === 0 && <SadPuffs x={32} y={44} delayMs={delayMs + 1450} />}
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 6. Loaded Dice (t2) - the bones settle on the TRUE total                   */
/* ========================================================================= */

function LoadedDicePlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_loaded_dice");
  const total = oNum(o, "result"); // 2..12 | null
  const rerolled = o?.rerolled === true;
  const a = total == null ? null : Math.max(1, Math.min(6, Math.round(total / 2)));
  const b = total == null || a == null ? null : Math.max(1, Math.min(6, total - a));
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <g transform="translate(14 20) rotate(-8) scale(0.85)"><Die v={a} /></g>
        <g transform="translate(26 21) rotate(7) scale(0.85)"><Die v={b} /></g>
      </Mini>
    );
  }
  const win = total != null && total >= 7;
  const boxcars = total === 12;
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(8,26,16,0.5)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          <rect x={18} y={34} width={64} height={38} rx={4} fill={FELT} stroke={FELT_EDGE} strokeWidth={1.8} />
          <text x={50} y={24} fontSize={6} fontWeight={800} fill={CREAM} textAnchor="middle" style={{ letterSpacing: "1px" }}>SEVEN OR BETTER</text>
          {rerolled && (
            <g className="gsp-pop" style={d(delayMs + 350)}>
              <text x={50} y={31} fontSize={4.4} fontWeight={700} fill={GOLD} textAnchor="middle">free re-roll taken</text>
            </g>
          )}
        </g>
        {/* the dice clatter across the felt and settle on the true faces */}
        <g className="gsp-dice" style={d(delayMs + (rerolled ? 550 : 250))}>
          <g transform="translate(41 52) scale(1.35)"><Die v={a} /></g>
        </g>
        <g className="gsp-dice" style={d(delayMs + (rerolled ? 700 : 400))}>
          <g transform="translate(59 54) scale(1.35)"><Die v={b} /></g>
        </g>
        {/* total badge */}
        <g className="gsp-pop" style={d(delayMs + 1750)}>
          <rect x={40} y={62} width={20} height={9} rx={2.2} fill={INK} stroke={win ? GREEN : GREY} strokeWidth={1} />
          <text x={50} y={68.6} fontSize={5.4} fontWeight={800} fill={win ? GREEN : GREY} textAnchor="middle">{total == null ? "?" : `= ${total}`}</text>
        </g>
        {win && (
          <g className="gsp-step" style={d(delayMs + 2050)}>
            <g transform="translate(50 16)"><PawnSil fill={CREAM} s={0.95} /></g>
            <path d="M43 16 v-5 m-2.2 2 l2.2 -2.2 2.2 2.2" stroke={GREEN} strokeWidth={1.3} fill="none" />
            {boxcars && <path d="M57 16 v-8 m-2.2 2 l2.2 -2.2 2.2 2.2 M57 12 m-2.2 2 l2.2 -2.2 2.2 2.2" stroke={GOLD} strokeWidth={1.3} fill="none" />}
          </g>
        )}
        {boxcars && <g className="gsp-star" style={d(delayMs + 2200)}><Star x={66} y={22} s={1.4} /></g>}
        {total != null && !win && <SadPuffs x={50} y={44} delayMs={delayMs + 1900} />}
        <Tag
          x={50}
          y={90}
          w={54}
          text={total == null ? "ROLLING..." : boxcars ? "BOXCARS! TWO SQUARES" : win ? "SEVEN UP: PAWN ADVANCES" : "UNDER SEVEN: NO DICE"}
          delayMs={delayMs + 1950}
          color={total == null ? GREY : boxcars ? GOLD : win ? GREEN : GREY}
        />
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 7. Lootbox (t3) - lock pops, lid blows, the beam is the TRUE rarity        */
/* ========================================================================= */

const RARITY_COLOR: Record<string, string> = {
  common: "#b9c2d0",
  rare: "#4aa3ff",
  epic: PURPLE,
  legendary: GOLD,
};

function LootboxPlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_lootbox");
  const rarity = oStr(o, "rarity"); // common | rare | epic | legendary | null
  const beam = rarity ? RARITY_COLOR[rarity] ?? "#e8e8f0" : "#e8e8f0";
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <rect x={12} y={18} width={16} height={11} rx={1.6} fill={WOOD} stroke={WOOD_DARK} strokeWidth={1.1} />
        <rect x={12} y={14} width={16} height={4.4} rx={1.4} fill="#a06a34" stroke={WOOD_DARK} strokeWidth={1} />
        <circle cx={20} cy={11} r={2.6} fill={beam} opacity={0.9} />
      </Mini>
    );
  }
  const prize =
    rarity === "common" ? (
      <g>
        <KnightSil fill={RARITY_COLOR.common} s={1.1} />
        <path d="M-9 4 q4 -12 14 -9" stroke={RARITY_COLOR.common} strokeWidth={1.1} fill="none" strokeDasharray="2 1.6" />
      </g>
    ) : rarity === "rare" ? (
      <PawnSil fill={RARITY_COLOR.rare} s={1.2} />
    ) : rarity === "epic" ? (
      <g>
        <g transform="translate(-7 1) rotate(-14) scale(0.6)"><CardBack /></g>
        <g transform="translate(0 0) scale(0.6)"><CardBack /></g>
        <g transform="translate(7 1) rotate(14) scale(0.6)"><CardBack /></g>
      </g>
    ) : rarity === "legendary" ? (
      <g>
        <path d="M0 -8 l6 4 -2 8 -8 0 -2 -8 Z" fill={GOLD} stroke="#fff0c0" strokeWidth={0.8} />
        <path d="M-6 -4 h12 M0 -8 v16" stroke="#fff0c0" strokeWidth={0.5} opacity={0.8} />
      </g>
    ) : (
      <text x={0} y={3} fontSize={9} fontWeight={800} fill={GREY} textAnchor="middle">?</text>
    );
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(18,10,30,0.55)" /></g>
        {/* rarity rays, tinted by what the box ACTUALLY held */}
        <g className="gsp-rays" style={d(delayMs)}>
          <g transform="translate(50 52)">
            {Array.from({ length: 12 }, (_, i) => (
              <rect key={i} x={-1.4} y={-40} width={2.8} height={26} rx={1.4} fill={beam} transform={`rotate(${i * 30})`} opacity={0.85} />
            ))}
          </g>
        </g>
        {/* vertical rarity beam out of the crate mouth */}
        <g className="gsp-flash" style={d(delayMs + 900)}>
          <rect x={43} y={8} width={14} height={40} rx={5} fill={beam} opacity={0.5} />
        </g>
        {/* the crate: shakes, the padlock strains and pops, the lid blows */}
        <g className="gsp-jiggle" style={d(delayMs)}>
          <rect x={34} y={46} width={32} height={24} rx={2.4} fill={WOOD} stroke={WOOD_DARK} strokeWidth={2} />
          <rect x={34} y={46} width={32} height={24} rx={2.4} fill="none" stroke={beam} strokeWidth={0.9} strokeDasharray="3 2.4" />
          <path d="M50 46 V70" stroke={WOOD_DARK} strokeWidth={1.4} />
        </g>
        <g className="gsp-lock" style={d(delayMs)}>
          <g transform="translate(50 52)">
            <path d="M-3 0 v-3 a3 3 0 0 1 6 0 v3" stroke="#8a94a8" strokeWidth={1.6} fill="none" />
            <rect x={-4.4} y={0} width={8.8} height={7} rx={1.6} fill={GOLD} stroke={GOLD_EDGE} strokeWidth={1} />
            <circle cx={0} cy={3.4} r={1.1} fill={GOLD_EDGE} />
          </g>
        </g>
        <g className="gsp-lid" style={d(delayMs)} transform="translate(34 46)">
          <rect x={0} y={-8} width={32} height={9} rx={2.4} fill="#a06a34" stroke={WOOD_DARK} strokeWidth={2} />
          <rect x={2} y={-6} width={28} height={4.4} rx={1.4} fill="none" stroke={beam} strokeWidth={0.8} strokeDasharray="3 2.2" />
        </g>
        {/* the drop floats out */}
        <g className="gsp-loot" style={d(delayMs)}>
          <g transform="translate(50 46)">{prize}</g>
        </g>
        {rarity === "legendary" && (
          <>
            <g className="gsp-star" style={d(delayMs + 1550)}><Star x={38} y={38} s={1.4} /></g>
            <g className="gsp-star" style={d(delayMs + 1700)}><Star x={63} y={40} s={1.2} /></g>
            <Payout x={50} y={58} delayMs={delayMs + 1450} n={4} />
          </>
        )}
        <Tag
          x={50}
          y={90}
          w={58}
          text={
            rarity === "common" ? "COMMON: A CAMEL LEAP"
            : rarity === "rare" ? "RARE: A FRESH PAWN"
            : rarity === "epic" ? "EPIC: THREE-CARD DRAFT"
            : rarity === "legendary" ? "LEGENDARY: TIER 5 CARD"
            : "CRACKING IT OPEN..."
          }
          delayMs={delayMs + 1500}
          color={beam}
        />
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 8. Three-Card Monte (t3) - the shuffle, then the card you actually found   */
/* ========================================================================= */

function ThreeCardMontePlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_three_card_monte");
  const result = oStr(o, "result"); // found | lost | null
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <g transform="translate(13 21) scale(0.55) rotate(-8)"><CardBack /></g>
        <g transform="translate(20 20) scale(0.55)"><CardBack /></g>
        <g transform="translate(27 21) scale(0.55) rotate(8)"><CardBack /></g>
      </Mini>
    );
  }
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(28,20,8,0.5)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          {/* cardboard box table */}
          <rect x={22} y={68} width={56} height={12} rx={2} fill={WOOD} stroke={WOOD_DARK} strokeWidth={1.6} />
          <text x={50} y={24} fontSize={6} fontWeight={800} fill={CREAM} textAnchor="middle" style={{ letterSpacing: "1px" }}>FIND THE QUEEN</text>
        </g>
        {/* the shuffle: outer cards trade places twice over the hold */}
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          <g transform="translate(32 54)"><g className="gsp-monte-a" style={d(delayMs + 250)}><CardBack /></g></g>
          <g transform="translate(68 54)"><g className="gsp-monte-b" style={d(delayMs + 250)}><CardBack /></g></g>
        </g>
        {/* the middle card flips to what the chase actually found */}
        <FlipCard
          x={50}
          y={54}
          dealMs={delayMs}
          flipMs={delayMs + 1500}
          face={
            result === "found" ? (
              <CardFace pip={GOLD_EDGE}><g transform="scale(0.62)"><QueenSil fill={GOLD_EDGE} /></g></CardFace>
            ) : result === "lost" ? (
              <CardFace pip={GREY} label="2" />
            ) : (
              <CardFace pip={GREY} label="?" />
            )
          }
        />
        {result === "found" && (
          <>
            <g className="gsp-star" style={d(delayMs + 2350)}><Star x={38} y={40} s={1.3} /></g>
            <g className="gsp-star" style={d(delayMs + 2500)}><Star x={62} y={42} s={1.1} /></g>
            <Tag x={50} y={90} w={58} text="FOUND HER: REROLL + PEEK" delayMs={delayMs + 2350} color={GOLD} />
          </>
        )}
        {result === "lost" && (
          <>
            {/* the dealer tips his hat */}
            <g className="gsp-pop" style={d(delayMs + 2350)}>
              <g transform="translate(76 34) rotate(14)">
                <ellipse cx={0} cy={2} rx={7} ry={1.8} fill={INK} />
                <path d="M-4 2 a4 4 0 0 1 8 0 Z" fill={INK} />
              </g>
            </g>
            <SadPuffs x={50} y={38} delayMs={delayMs + 2300} />
            <Tag x={50} y={90} w={54} text="THE DEALER TIPS HIS HAT" delayMs={delayMs + 2400} color={GREY} />
          </>
        )}
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 9. Underdog Parlay (t3) - the slip is stamped leg by TRUE leg              */
/* ========================================================================= */

function UnderdogParlayPlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_underdog_parlay");
  const hits = oNum(o, "result"); // 0 | 1 | 2 | null
  const checkHit = o?.check === true;
  const capHit = o?.cap === true;
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <rect x={11} y={12} width={18} height={16} rx={1.6} fill="#f4ecd6" stroke="#c2a24a" strokeWidth={1} transform="rotate(-6 20 20)" />
        <text x={20} y={22} fontSize={7} fontWeight={800} fill={hits != null && hits > 0 ? GREEN : GREY} textAnchor="middle">{hits ?? "?"}✓</text>
      </Mini>
    );
  }
  const legStamp = (hit: boolean, y: number, ms: number) => (
    <g className="gsp-stamp" style={d(ms)}>
      <rect x={58} y={y - 4.6} width={16} height={9.2} rx={1.6} fill="none" stroke={hit ? GREEN : RED} strokeWidth={1.4} transform={`rotate(-8 66 ${y})`} />
      <text x={66} y={y + 2} fontSize={4.6} fontWeight={800} fill={hit ? GREEN : RED} textAnchor="middle" transform={`rotate(-8 66 ${y})`}>{hit ? "HIT" : "MISS"}</text>
    </g>
  );
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(28,20,8,0.5)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          {/* the bet slip */}
          <rect x={22} y={26} width={56} height={46} rx={2.4} fill="#f4ecd6" stroke="#c2a24a" strokeWidth={1.6} />
          <text x={50} y={35} fontSize={5.2} fontWeight={800} fill="#8a5a10" textAnchor="middle" style={{ letterSpacing: "1px" }}>UNDERDOG PARLAY</text>
          <path d="M26 38 h48" stroke="#c2a24a" strokeWidth={0.7} strokeDasharray="2 1.6" />
          <text x={27} y={47} fontSize={4.2} fontWeight={700} fill={INK} textAnchor="start">LEG 1: KING UNDER ATTACK</text>
          <text x={27} y={60} fontSize={4.2} fontWeight={700} fill={INK} textAnchor="start">LEG 2: CAPTURE MADE</text>
          <path d="M26 66 h48" stroke="#c2a24a" strokeWidth={0.7} strokeDasharray="2 1.6" />
        </g>
        {hits != null && legStamp(checkHit, 45, delayMs + 550)}
        {hits != null && legStamp(capHit, 58, delayMs + 1050)}
        {hits === 2 && (
          <>
            <g className="gsp-pop" style={d(delayMs + 1700)}><g transform="translate(50 14)"><KnightSil fill={GOLD} s={1.15} /></g></g>
            <g className="gsp-star" style={d(delayMs + 1900)}><Star x={62} y={12} s={1.2} /></g>
            <Payout x={50} y={70} delayMs={delayMs + 1850} n={4} />
            <Tag x={50} y={90} w={58} text="BOTH LEGS: A KNIGHT ARRIVES" delayMs={delayMs + 1750} color={GOLD} />
          </>
        )}
        {hits === 1 && (
          <>
            <g className="gsp-pop" style={d(delayMs + 1700)}><g transform="translate(50 14)"><PawnSil fill={CREAM} /></g></g>
            <Tag x={50} y={90} w={54} text="ONE LEG: A PAWN ARRIVES" delayMs={delayMs + 1750} color={GREEN} />
          </>
        )}
        {hits === 0 && (
          <>
            <SadPuffs x={50} y={20} delayMs={delayMs + 1600} />
            <Tag x={50} y={90} w={62} text="NO LEGS: OPPONENT GAINS A REROLL" delayMs={delayMs + 1750} color={RED} />
          </>
        )}
        {hits == null && <Tag x={50} y={90} w={44} text="LEGS STILL OPEN" delayMs={delayMs + 1500} color={GREY} />}
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 10. River Card (t4) - both hole cards flip to their TRUE ranks             */
/* ========================================================================= */

const RANK_LABEL = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function RiverCardPlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_river_card");
  const mine = oNum(o, "mine");
  const theirs = oNum(o, "theirs");
  const known = mine != null && theirs != null;
  const iWin = known && mine > theirs;
  const theyWin = known && theirs > mine;
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <g transform="translate(15 20) scale(0.6) rotate(-8)"><CardFace label={mine != null ? RANK_LABEL[mine] : "?"} /></g>
        <g transform="translate(26 20) scale(0.6) rotate(8)"><CardFace label={theirs != null ? RANK_LABEL[theirs] : "?"} pip={INK} /></g>
      </Mini>
    );
  }
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(8,26,16,0.5)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          <path d="M8 84 Q50 58 92 84" fill="none" stroke={FELT_EDGE} strokeWidth={2.4} />
          {/* the river */}
          <path d="M10 30 q20 6 40 0 q20 -6 40 0" fill="none" stroke={BLUE} strokeWidth={1.6} opacity={0.7} />
          <text x={50} y={22} fontSize={6} fontWeight={800} fill={CREAM} textAnchor="middle" style={{ letterSpacing: "1px" }}>THE RIVER FORGIVES NOTHING</text>
          <text x={32} y={76} fontSize={4.6} fontWeight={700} fill={CREAM} textAnchor="middle">YOU</text>
          <text x={68} y={76} fontSize={4.6} fontWeight={700} fill={CREAM} textAnchor="middle">THEM</text>
        </g>
        <FlipCard x={32} y={56} tilt={-6} dealMs={delayMs + 150} flipMs={delayMs + 900}
          face={<CardFace pip={DEEP_RED} label={mine != null ? RANK_LABEL[mine] : "?"} />} />
        <FlipCard x={68} y={56} tilt={6} dealMs={delayMs + 400} flipMs={delayMs + 1300}
          face={<CardFace pip={INK} label={theirs != null ? RANK_LABEL[theirs] : "?"} />} />
        {known && (iWin || theyWin) && (
          <>
            {/* winner's halo + the stolen pawn defecting across the river */}
            <g className="gsp-flash" style={d(delayMs + 1900)}>
              <circle cx={iWin ? 32 : 68} cy={56} r={16} fill="none" stroke={GOLD} strokeWidth={2} />
            </g>
            <g className="gsp-step" style={d(delayMs + 2150)}>
              <g transform={`translate(50 34) ${iWin ? "" : "rotate(180)"}`}>
                <PawnSil fill={iWin ? CREAM : INK} s={0.95} />
              </g>
              <path d={iWin ? "M50 44 v6 m-2.4 -2.4 l2.4 2.6 2.4 -2.6" : "M50 24 v-6 m-2.4 2.4 l2.4 -2.6 2.4 2.6"} stroke={GOLD} strokeWidth={1.4} fill="none" />
            </g>
            <Tag x={50} y={92} w={58} text={iWin ? "YOUR CARD WINS: PAWN DEFECTS TO YOU" : "THEIR CARD WINS: A PAWN DEFECTS"} delayMs={delayMs + 2100} color={iWin ? GOLD : RED} />
          </>
        )}
        {known && !iWin && !theyWin && (
          <>
            <SadPuffs x={50} y={44} delayMs={delayMs + 1950} />
            <Tag x={50} y={92} w={44} text="TIE: SPLIT POT" delayMs={delayMs + 2050} color={GREY} />
          </>
        )}
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 11. Piece Roulette (t4) - the wheel parks on the TRUE pocket               */
/* ========================================================================= */

const ROULETTE_SEGS = [
  { key: "knight", fill: "#233a63", label: "N", labelFill: BLUE },
  { key: "rook", fill: "#0d3a24", label: "0", labelFill: GREEN },
  { key: "nothing", fill: "#3a3f4a", label: "-", labelFill: GREY },
  { key: "lost", fill: "#2a0d14", label: "X", labelFill: RED },
];

function PieceRoulettePlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_piece_roulette");
  const result = oStr(o, "result"); // knight | rook | nothing | lost | null
  const seg = Math.max(0, ROULETTE_SEGS.findIndex((s) => s.key === result));
  const segIdx = result ? seg : 2;
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <g transform="translate(20 20)">
          <g className="gsp-spinvar" style={dv(delayMs, { "--turn": turnFor(segIdx, 4, 2) })}>
            {ROULETTE_SEGS.map((s, i) => (
              <path key={i} d={segPath(12, -90 + i * 90, -90 + (i + 1) * 90)} fill={s.fill} stroke={GOLD_EDGE} strokeWidth={0.6} />
            ))}
          </g>
          <path d="M-2.4 -15 h4.8 l-2.4 5 Z" fill={GOLD} />
        </g>
      </Mini>
    );
  }
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(8,26,16,0.55)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          <text x={50} y={16} fontSize={6} fontWeight={800} fill={CREAM} textAnchor="middle" style={{ letterSpacing: "1px" }}>PIECE ROULETTE</text>
          {/* the staked pawn, waiting on the felt */}
          <rect x={12} y={72} width={76} height={16} rx={3} fill={FELT} stroke={FELT_EDGE} strokeWidth={1.6} />
          {result !== "lost" && <g transform="translate(24 80)"><PawnSil fill={CREAM} s={0.95} /></g>}
        </g>
        {/* wheel: spins several turns, eases dead onto the rolled pocket */}
        <g transform="translate(50 44)">
          <circle r={29} fill="none" stroke="#5a3a1a" strokeWidth={2.4} />
          <g className="gsp-spinvar" style={dv(delayMs + 150, { "--turn": turnFor(segIdx, 4) })}>
            {ROULETTE_SEGS.map((s, i) => (
              <g key={i}>
                <path d={segPath(26, -90 + i * 90, -90 + (i + 1) * 90)} fill={s.fill} stroke={GOLD_EDGE} strokeWidth={1} />
                <text
                  x={16 * Math.cos(((-90 + i * 90 + 45) * Math.PI) / 180)}
                  y={16 * Math.sin(((-90 + i * 90 + 45) * Math.PI) / 180) + 2.4}
                  fontSize={7}
                  fontWeight={800}
                  fill={s.labelFill}
                  textAnchor="middle"
                >
                  {s.label}
                </text>
              </g>
            ))}
            <circle r={5} fill="#8a5a2a" stroke={GOLD_EDGE} strokeWidth={1} />
          </g>
          {/* ball riding the rim, clattering into the pocket */}
          <g className="gsp-balltrack" style={d(delayMs + 150)}>
            <g className="gsp-balldrop" style={d(delayMs + 150)}>
              <circle cx={0} cy={-23} r={2.6} fill="#fff" stroke="#c9c2ac" strokeWidth={0.6} />
            </g>
          </g>
          <Pointer cy={-31} delayMs={delayMs + 150} />
        </g>
        {result === "knight" && (
          <>
            <g className="gsp-pop" style={d(delayMs + 2100)}><g transform="translate(24 62)"><KnightSil fill={BLUE} s={1.1} /></g></g>
            <Tag x={50} y={94} w={58} text="IT COMES BACK A KNIGHT" delayMs={delayMs + 2150} color={BLUE} />
          </>
        )}
        {result === "rook" && (
          <>
            <g className="gsp-pop" style={d(delayMs + 2100)}><g transform="translate(24 62)"><RookSil fill={GREEN} s={1.1} /></g></g>
            <g className="gsp-star" style={d(delayMs + 2300)}><Star x={34} y={58} s={1.2} /></g>
            <Tag x={50} y={94} w={58} text="GREEN ZERO! A ROOK RETURNS" delayMs={delayMs + 2150} color={GREEN} />
          </>
        )}
        {result === "nothing" && (
          <>
            <SadPuffs x={24} y={70} delayMs={delayMs + 2100} />
            <Tag x={50} y={94} w={46} text="NO ACTION: PAWN KEPT" delayMs={delayMs + 2150} color={GREY} />
          </>
        )}
        {result === "lost" && (
          <>
            <g className="gsp-sweep" style={d(delayMs + 2050)}><g transform="translate(24 80)"><PawnSil fill={CREAM} s={0.95} /></g></g>
            <Tag x={50} y={94} w={52} text="THE HOUSE TAKES THE PAWN" delayMs={delayMs + 2200} color={RED} />
          </>
        )}
        {result == null && <Tag x={50} y={94} w={44} text="ROUND AND ROUND" delayMs={delayMs + 2100} color={GREY} />}
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 12. Jackpot Pawn (t4) - reels bolt on; later spins pay what they paid      */
/* ========================================================================= */

function JackpotPawnPlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_jackpot_pawn");
  const charges = oNum(o, "charges") ?? 0;
  const promoted = o?.__spent === true && charges <= 0 && oNum(o, "turns") != null && (oNum(o, "turns") as number) > 0;
  const banked = charges > 0;
  const finals = promoted ? ["7", "7", "7"] : banked ? ["★", "★", "★"] : ["♦", "★", "♣"];
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <g transform="translate(20 18)"><PawnSil s={1.05} /></g>
        <rect x={13} y={20} width={14} height={7} rx={1.4} fill="#1b2333" stroke={GOLD} strokeWidth={0.9} />
        <text x={20} y={25.4} fontSize={4.6} fontWeight={800} fill={promoted ? "#ff4d6d" : GOLD} textAnchor="middle">{finals.join("")}</text>
      </Mini>
    );
  }
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(30,10,20,0.5)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          <text x={50} y={20} fontSize={6} fontWeight={800} fill={GOLD} textAnchor="middle" style={{ letterSpacing: "1px" }}>KA-CHUNK. BELIEVE.</text>
          {/* the lucky pawn, reels strapped to its belly */}
          <g transform="translate(50 48) scale(2.6)"><PawnSil /></g>
          <rect x={38} y={48} width={24} height={12} rx={2} fill="#1b2333" stroke={GOLD} strokeWidth={1.4} />
          <circle cx={36} cy={54} r={1.6} fill="#8a94a8" />
          <circle cx={64} cy={54} r={1.6} fill="#8a94a8" />
        </g>
        <clipPath id="gsp-jp-win"><rect x={39.5} y={49} width={21} height={10} rx={1.6} /></clipPath>
        <g clipPath="url(#gsp-jp-win)">
          <g transform="translate(0 54)">
            <SlotReel x={44} delayMs={delayMs + 250} spinMs={780} final={finals[0]} />
            <SlotReel x={50} delayMs={delayMs + 420} spinMs={960} final={finals[1]} />
            <SlotReel x={56} delayMs={delayMs + 620} spinMs={1180} final={finals[2]} />
          </g>
        </g>
        {promoted && (
          <>
            <g className="gsp-flash" style={d(delayMs + 1350)}><rect x={38} y={48} width={24} height={12} rx={2} fill="#ffef9f" opacity={0.6} /></g>
            <g className="gsp-loot" style={d(delayMs)}>
              <g transform="translate(50 30)"><QueenSil fill={GOLD} s={1.3} /></g>
            </g>
            <g className="gsp-star" style={d(delayMs + 1800)}><Star x={36} y={30} s={1.4} /></g>
            <g className="gsp-star" style={d(delayMs + 1950)}><Star x={64} y={32} s={1.2} /></g>
            <Payout x={50} y={62} delayMs={delayMs + 1900} />
            <Tag x={50} y={90} w={58} text="JACKPOT! QUEEN ON THE SPOT" delayMs={delayMs + 1850} />
          </>
        )}
        {banked && !promoted && (
          <>
            <g className="gsp-chip" style={d(delayMs + 1750)}><Chip cx={70} cy={64} r={5} fill={GOLD} edge={GOLD_EDGE} /></g>
            <Tag x={50} y={90} w={56} text={`KING-STEP BANKED (${charges})`} delayMs={delayMs + 1800} color={GOLD} />
          </>
        )}
        {!banked && !promoted && <Tag x={50} y={90} w={56} text="REELS FITTED: 5 SPINS AHEAD" delayMs={delayMs + 1800} color={GREY} />}
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 13. Double Down Draft (t5) - both cards taken, or the round swept away     */
/* ========================================================================= */

function DoubleDownDraftPlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_double_down_draft");
  const result = oStr(o, "result"); // both | bust | null
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <g transform="translate(16 20) scale(0.62) rotate(-10)"><CardBack /></g>
        <g transform="translate(24 20) scale(0.62) rotate(10)"><CardBack /></g>
        <text x={20} y={35} fontSize={6} fontWeight={800} fill={result === "both" ? GREEN : result === "bust" ? RED : GREY} textAnchor="middle">
          {result === "both" ? "x2" : result === "bust" ? "--" : "?"}
        </text>
      </Mini>
    );
  }
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(8,26,16,0.5)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          <path d="M8 86 Q50 58 92 86" fill="none" stroke={FELT_EDGE} strokeWidth={2.4} />
          <text x={50} y={22} fontSize={6} fontWeight={800} fill={CREAM} textAnchor="middle" style={{ letterSpacing: "1px" }}>DOUBLE OR NOTHING</text>
        </g>
        {/* chips pushed in first, always */}
        <g className="gsp-chip" style={d(delayMs + 250)}><Chip cx={44} cy={78} r={6} /></g>
        <g className="gsp-chip" style={d(delayMs + 420)}><Chip cx={52} cy={80} r={6} fill="#5fc9b0" edge="#2a7a68" /></g>
        <g className="gsp-chip" style={d(delayMs + 590)}><Chip cx={48} cy={73} r={6} fill={GOLD} edge={GOLD_EDGE} /></g>
        {result === "bust" ? (
          <>
            {/* the dealer's arm sweeps the whole next draft off the felt */}
            <g className="gsp-sweep" style={d(delayMs + 1250)}>
              <g transform="translate(40 46) rotate(-8)"><CardBack /></g>
              <g transform="translate(58 46) rotate(9)"><CardBack /></g>
            </g>
            <g className="gsp-rake" style={d(delayMs + 1050)}>
              <rect x={44} y={42} width={34} height={3} rx={1.5} fill="#8a94a8" />
              <rect x={40} y={38} width={5} height={11} rx={1.4} fill="#c3cad6" />
            </g>
            {/* the dealer smiles */}
            <g className="gsp-pop" style={d(delayMs + 2050)}>
              <path d="M44 30 q6 5 12 0" stroke={CREAM} strokeWidth={1.6} fill="none" strokeLinecap="round" />
            </g>
            <g className="gsp-stamp" style={d(delayMs + 1900)}>
              <rect x={30} y={52} width={40} height={11} rx={2} fill="none" stroke={RED} strokeWidth={1.6} transform="rotate(-8 50 57)" />
              <text x={50} y={59.6} fontSize={5.6} fontWeight={800} fill={RED} textAnchor="middle" transform="rotate(-8 50 57)">DRAFT SKIPPED</text>
            </g>
            <SadPuffs x={50} y={38} delayMs={delayMs + 2150} />
          </>
        ) : result === "both" ? (
          <>
            {/* BOTH cards of the next draft fan into your hand */}
            <FlipCard x={40} y={46} tilt={-9} dealMs={delayMs + 1100} flipMs={delayMs + 1500} face={<CardFace pip={GOLD_EDGE} label="1st" />} />
            <FlipCard x={60} y={46} tilt={9} dealMs={delayMs + 1300} flipMs={delayMs + 1750} face={<CardFace pip={GOLD_EDGE} label="2nd" />} />
            <g className="gsp-flash" style={d(delayMs + 2250)}><rect x={28} y={32} width={44} height={28} rx={4} fill="#ffef9f" opacity={0.45} /></g>
            <g className="gsp-star" style={d(delayMs + 2450)}><Star x={50} y={28} s={1.4} /></g>
            <Payout x={50} y={72} delayMs={delayMs + 2350} n={4} />
            <Tag x={50} y={92} w={56} text="YOU TAKE BOTH CARDS" delayMs={delayMs + 2300} color={GOLD} />
          </>
        ) : (
          <Tag x={50} y={92} w={44} text="CHIPS ARE IN" delayMs={delayMs + 1500} color={GREY} />
        )}
        {result === "bust" && <Tag x={50} y={92} w={52} text="THE DEALER SMILES" delayMs={delayMs + 2350} color={RED} />}
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 14. Crash Game (t5) - the rocket rides to the TRUE multiplier, then        */
/* parachutes (win) or detonates (crash)                                      */
/* ========================================================================= */

const CRASH_PAYLOAD: Record<string, { sil: keyof typeof PIECE_SIL; text: string; color: string }> = {
  "1.5x": { sil: "pawn", text: "1.5x: PAWN SIDESTEPS DOWN", color: GREEN },
  "2x": { sil: "knight", text: "2x: IT LANDS A KNIGHT", color: BLUE },
  "3x": { sil: "knight", text: "3x: KNIGHT + A REROLL", color: BLUE },
  "5x": { sil: "rook", text: "5x! IT LANDS A ROOK", color: GOLD },
};

function CrashGamePlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_crash_game");
  const result = oStr(o, "result"); // 1.5x | 2x | 3x | 5x | crash | null
  const crashed = result === "crash";
  const payload = result != null && result !== "crash" ? CRASH_PAYLOAD[result] : null;
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <g transform={`translate(20 20) rotate(${crashed ? 90 : 30})`}>
          <path d="M0 -8 q4 4 2.6 10 h-5.2 q-1.4 -6 2.6 -10 Z" fill={crashed ? GREY : CREAM} stroke="#8a94a8" strokeWidth={0.8} />
          <path d="M-2.6 2 l-2.6 4 M2.6 2 l2.6 4" stroke={RED} strokeWidth={1.4} />
        </g>
        {crashed && <g className="gsp-boom" style={d(delayMs + 300)}><Star x={20} y={20} s={1.6} fill={RED} /></g>}
      </Mini>
    );
  }
  const SilComp = payload ? PIECE_SIL[payload.sil] : null;
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(6,10,26,0.6)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          {/* multiplier chart */}
          <path d="M18 82 V22 M18 82 H86" stroke="#5a6b8f" strokeWidth={1.4} />
          <path d="M18 80 Q44 76 62 58 Q76 44 84 24" fill="none" stroke={GOLD} strokeWidth={1.2} strokeDasharray="3 2.4" opacity={0.7} />
          <text x={14} y={28} fontSize={4} fontWeight={700} fill={GREY} textAnchor="middle">5x</text>
          <text x={14} y={56} fontSize={4} fontWeight={700} fill={GREY} textAnchor="middle">2x</text>
          <text x={14} y={80} fontSize={4} fontWeight={700} fill={GREY} textAnchor="middle">1x</text>
          {/* live ticker climbing */}
          <g className="gsp-rise" style={d(delayMs + 350)}><text x={30} y={70} fontSize={4.6} fontWeight={800} fill={CREAM} textAnchor="middle">1.2x</text></g>
          <g className="gsp-rise" style={d(delayMs + 800)}><text x={44} y={62} fontSize={4.6} fontWeight={800} fill={CREAM} textAnchor="middle">1.7x</text></g>
          <g className="gsp-rise" style={d(delayMs + 1250)}><text x={58} y={50} fontSize={4.6} fontWeight={800} fill={CREAM} textAnchor="middle">2.6x</text></g>
        </g>
        {/* the rocket rides the curve, pawn strapped aboard */}
        <g transform="translate(24 74)">
          <g className="gsp-rocket" style={d(delayMs + 200)}>
            <g transform="rotate(0)">
              <path d="M0 -9 q4.6 4.4 3 11 h-6 q-1.6 -6.6 3 -11 Z" fill={CREAM} stroke="#8a94a8" strokeWidth={0.9} />
              <circle cx={0} cy={-2} r={1.8} fill={BLUE} />
              <path d="M-3 2 l-3.2 4.6 M3 2 l3.2 4.6" stroke={RED} strokeWidth={1.6} />
              <g className="gsp-exhaust" style={d(delayMs + 200)}>
                <path d="M-1.8 3 q1.8 6 3.6 0 q-1.8 3.4 -3.6 0 Z" fill={GOLD} />
              </g>
            </g>
          </g>
        </g>
        {crashed ? (
          <>
            <g className="gsp-boom" style={d(delayMs + 1650)}>
              <g transform="translate(72 40)">
                <Star x={0} y={0} s={2.4} fill="#ff7d4d" />
                <Star x={0} y={0} s={1.4} fill={GOLD} />
              </g>
            </g>
            <g className="gsp-alarm" style={d(delayMs + 1650)}><rect width={100} height={100} fill="rgba(224,75,99,0.25)" /></g>
            <SadPuffs x={72} y={34} delayMs={delayMs + 1950} />
            <g className="gsp-stamp" style={d(delayMs + 2000)}>
              <rect x={32} y={40} width={36} height={12} rx={2} fill="none" stroke={RED} strokeWidth={1.8} transform="rotate(-8 50 46)" />
              <text x={50} y={48.4} fontSize={6.4} fontWeight={800} fill={RED} textAnchor="middle" transform="rotate(-8 50 46)">CRASHED</text>
            </g>
            <Tag x={50} y={92} w={52} text="THE PAWN BURNS UP" delayMs={delayMs + 2250} color={RED} />
          </>
        ) : payload && SilComp ? (
          <>
            {/* the payout parachutes back down to the board */}
            <g className="gsp-chute" style={d(delayMs + 1700)}>
              <g transform="translate(72 34)">
                <path d="M-8 0 a8 8 0 0 1 16 0 Z" fill={payload.color} opacity={0.9} />
                <path d="M-8 0 L-2.4 10 M8 0 L2.4 10 M0 0 L0 10" stroke={GREY} strokeWidth={0.6} />
                <g transform="translate(0 15)"><SilComp fill={CREAM} s={0.95} /></g>
              </g>
            </g>
            <g className="gsp-pop" style={d(delayMs + 1800)}>
              <rect x={40} y={20} width={20} height={10} rx={2.4} fill={INK} stroke={payload.color} strokeWidth={1.2} />
              <text x={50} y={27.4} fontSize={6} fontWeight={800} fill={payload.color} textAnchor="middle">{result}</text>
            </g>
            {result === "5x" && <Payout x={72} y={60} delayMs={delayMs + 2250} n={4} />}
            {result === "3x" && <g className="gsp-star" style={d(delayMs + 2250)}><Star x={84} y={54} s={1.1} /></g>}
            <Tag x={50} y={92} w={60} text={payload.text} delayMs={delayMs + 2200} color={payload.color} />
          </>
        ) : (
          <Tag x={50} y={92} w={44} text="LET IT RIDE..." delayMs={delayMs + 1900} color={GREY} />
        )}
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 15. Blood Wager (t5) - the dais returns a rook, feeds, or DELIGHTS         */
/* ========================================================================= */

function BloodWagerPlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_blood_wager");
  const result = oStr(o, "result"); // rook | taken | delighted | null
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <rect x={10} y={26} width={20} height={4} rx={1.4} fill="#3a1524" stroke={DEEP_RED} strokeWidth={0.9} />
        <g transform="translate(20 19)">
          {result === "taken" ? <BishopSil fill={GREY} s={0.9} /> : <RookSil fill={result ? "#e08a9a" : CREAM} s={0.9} />}
        </g>
      </Mini>
    );
  }
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(30,6,14,0.6)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          {/* the dais: two stone steps + candles */}
          <rect x={28} y={62} width={44} height={7} rx={1.6} fill="#3a1524" stroke={DEEP_RED} strokeWidth={1.2} />
          <rect x={34} y={55} width={32} height={7} rx={1.6} fill="#4a1c2e" stroke={DEEP_RED} strokeWidth={1.2} />
          <rect x={24} y={48} width={2.6} height={12} rx={1.2} fill={CREAM} />
          <rect x={73} y={48} width={2.6} height={12} rx={1.2} fill={CREAM} />
          <g className="gsp-exhaust" style={d(delayMs + 200)}><circle cx={25.3} cy={46} r={1.6} fill={GOLD} /></g>
          <g className="gsp-exhaust" style={d(delayMs + 350)}><circle cx={74.3} cy={46} r={1.6} fill={GOLD} /></g>
          <text x={50} y={20} fontSize={6} fontWeight={800} fill="#e08a9a" textAnchor="middle" style={{ letterSpacing: "1px" }}>THE HOUSE IS AN ALTAR</text>
        </g>
        {/* the offered minor lies on the dais */}
        <g className="gsp-linger" style={d(delayMs)}>
          <g transform="translate(50 48)"><BishopSil fill={CREAM} s={1.3} /></g>
        </g>
        {(result === "rook" || result === "delighted") && (
          <>
            <g className="gsp-rays" style={d(delayMs)}>
              <g transform="translate(50 48)">
                {Array.from({ length: 10 }, (_, i) => (
                  <rect key={i} x={-1.2} y={-34} width={2.4} height={20} rx={1.2} fill="#e04b63" transform={`rotate(${i * 36})`} opacity={0.8} />
                ))}
              </g>
            </g>
            <g className="gsp-loot" style={d(delayMs)}>
              <g transform="translate(50 44)"><RookSil fill={GOLD} s={1.5} /></g>
            </g>
          </>
        )}
        {result === "delighted" && (
          <>
            <g className="gsp-pop" style={d(delayMs + 1750)}>
              <g transform="translate(68 46)"><PawnSil fill="#e08a9a" s={1.05} /></g>
              <path d="M62 52 q4 3 6 0" stroke="#e08a9a" strokeWidth={0.8} fill="none" opacity={0.7} />
            </g>
            <g className="gsp-star" style={d(delayMs + 1950)}><Star x={34} y={34} s={1.3} fill="#ff8da3" /></g>
            <g className="gsp-star" style={d(delayMs + 2100)}><Star x={64} y={30} s={1.1} fill="#ff8da3" /></g>
            <Tag x={50} y={90} w={62} text="DELIGHTED: ROOK + A PAWN FROM MIST" delayMs={delayMs + 2000} color="#ff8da3" />
          </>
        )}
        {result === "rook" && <Tag x={50} y={90} w={52} text="IT RISES AS A ROOK" delayMs={delayMs + 1900} color={GOLD} />}
        {result === "taken" && (
          <>
            <g className="gsp-shadowgrab" style={d(delayMs + 1000)}>
              <g transform="translate(50 62)">
                <path d="M-7 14 Q-9 2 -4 -2 L-2 -6 L0 -2 L2 -6 L4 -2 Q9 2 7 14 Z" fill="rgba(20,4,10,0.85)" />
              </g>
            </g>
            <SadPuffs x={50} y={42} delayMs={delayMs + 1900} />
            <Tag x={50} y={90} w={52} text="THE ALTAR FEEDS" delayMs={delayMs + 2000} color={RED} />
          </>
        )}
        {result == null && <Tag x={50} y={90} w={44} text="THE DAIS DECIDES" delayMs={delayMs + 1800} color={GREY} />}
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 16. Progressive Jackpot (t6) - the pot pays out exactly what it held       */
/* ========================================================================= */

function ProgressiveJackpotPlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_progressive_jackpot");
  const pot = oNum(o, "pot") ?? 0;
  const known = o != null;
  const prizeType: keyof typeof PIECE_SIL | null = pot >= 6 ? "rook" : pot >= 4 ? "knight" : pot >= 2 ? "pawn" : null;
  const Prize = prizeType ? PIECE_SIL[prizeType] : null;
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <path d="M12 18 q8 -6 16 0 l-2 9 q-6 4 -12 0 Z" fill="#3a1524" stroke={GOLD} strokeWidth={1.1} />
        <text x={20} y={26} fontSize={6.4} fontWeight={800} fill={GOLD} textAnchor="middle">{known ? pot : "?"}</text>
      </Mini>
    );
  }
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(20,8,26,0.55)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          {/* the pot */}
          <path d="M32 46 q18 -10 36 0 l-4 22 q-14 8 -28 0 Z" fill="#3a1524" stroke={GOLD} strokeWidth={2} />
          <ellipse cx={50} cy={46} rx={18} ry={4.4} fill={INK} stroke={GOLD} strokeWidth={1.2} />
          <text x={50} y={62} fontSize={6.4} fontWeight={800} fill={GOLD} textAnchor="middle">{known ? `${pot} SOULS` : "THE POT"}</text>
          <text x={50} y={18} fontSize={5.6} fontWeight={800} fill={CREAM} textAnchor="middle" style={{ letterSpacing: "1px" }}>TIME IS CALLED</text>
        </g>
        {/* the collected souls drop in one by one */}
        {Array.from({ length: Math.min(pot, 6) }, (_, i) => (
          <g key={i} className="gsp-chip" style={d(delayMs + 250 + i * 170)}>
            <g transform={`translate(${40 + (i % 3) * 10} ${40 - Math.floor(i / 3) * 3})`}>
              <path d="M0 -3.6 q2.6 2 1.6 5 q-0.8 2 -1.6 2 q-0.8 0 -1.6 -2 q-1 -3 1.6 -5 Z" fill="#8fd8e8" opacity={0.9} />
            </g>
          </g>
        ))}
        {Prize && (
          <>
            <g className="gsp-loot" style={d(delayMs + 400)}>
              <g transform="translate(50 40)"><Prize fill={GOLD} s={1.4} /></g>
            </g>
            <g className="gsp-star" style={d(delayMs + 1950)}><Star x={36} y={34} s={1.3} /></g>
            <g className="gsp-star" style={d(delayMs + 2100)}><Star x={64} y={36} s={1.1} /></g>
            <Tag x={50} y={90} w={62} text={`LAST BLOOD CLAIMS: ${prizeType === "rook" ? "A ROOK" : prizeType === "knight" ? "A KNIGHT" : "A PAWN"}`} delayMs={delayMs + 2000} />
          </>
        )}
        {known && !Prize && (
          <>
            <SadPuffs x={50} y={40} delayMs={delayMs + 1700} />
            <Tag x={50} y={90} w={54} text={pot > 0 ? "POT TOO THIN: NO PAYOUT" : "DRY POT: NO WINNER"} delayMs={delayMs + 1850} color={GREY} />
          </>
        )}
        {!known && <Tag x={50} y={90} w={48} text="COUNTING SOULS" delayMs={delayMs + 1800} color={GREY} />}
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 17. The House (t6) - the rake collects, the rake pays a pawn               */
/* ========================================================================= */

function TheHousePlay({ lead, delayMs }: PlayProps) {
  // Fires only when the rake actually bought a board payout (a fresh pawn):
  // reroll purchases change no squares, so no signature plays for them.
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <path d="M11 22 L20 13 L29 22" stroke={GOLD} strokeWidth={1.8} fill="none" />
        <rect x={14} y={22} width={12} height={7} rx={1.2} fill="#1b2333" stroke={GOLD} strokeWidth={1} />
      </Mini>
    );
  }
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(8,26,16,0.55)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          <rect x={14} y={70} width={72} height={16} rx={3} fill={FELT} stroke={FELT_EDGE} strokeWidth={1.6} />
          {/* the house marquee */}
          <path d="M34 30 L50 18 L66 30" stroke={GOLD} strokeWidth={2.2} fill="none" />
          <rect x={38} y={30} width={24} height={12} rx={1.6} fill="#1b2333" stroke={GOLD} strokeWidth={1.4} />
          <text x={50} y={38.4} fontSize={5} fontWeight={800} fill={GOLD} textAnchor="middle">HOUSE</text>
          <text x={50} y={54} fontSize={4.6} fontWeight={700} fill={CREAM} textAnchor="middle">every draft pays you a chip</text>
        </g>
        {/* the croupier rake drags the table's chips to your rail */}
        <g className="gsp-rake" style={d(delayMs + 350)}>
          <rect x={50} y={74} width={38} height={3} rx={1.5} fill="#8a94a8" />
          <rect x={46} y={70} width={5} height={11} rx={1.4} fill="#c3cad6" />
          <Chip cx={40} cy={78} r={5} />
          <Chip cx={32} cy={80} r={5} fill="#5fc9b0" edge="#2a7a68" />
        </g>
        {/* four chips buy a pawn, planted on the second rank */}
        <g className="gsp-pop" style={d(delayMs + 1600)}><g transform="translate(28 62)"><PawnSil fill={GOLD} s={1.15} /></g></g>
        <g className="gsp-star" style={d(delayMs + 1850)}><Star x={38} y={58} s={1.1} /></g>
        <Payout x={50} y={78} delayMs={delayMs + 1750} n={4} />
        <Tag x={50} y={94} w={58} text="RAKE CASHED: A FRESH PAWN" delayMs={delayMs + 1800} />
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 18. Gacha Banner (t6) - three capsules crack open on their TRUE rarities   */
/* ========================================================================= */

const PULL_COLOR: Record<string, string> = { common: "#b9c2d0", rare: "#4aa3ff", epic: PURPLE, ssr: GOLD };
const PULL_LETTER: Record<string, string> = { common: "C", rare: "R", epic: "E", ssr: "SSR" };

function GachaBannerPlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_gacha_banner");
  const rawPulls = oArr(o, "pulls");
  const pulls = rawPulls ? rawPulls.filter((p): p is string => typeof p === "string").slice(0, 3) : null;
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${12 + i * 8} 22)`}>
            <circle r={3.4} fill={pulls?.[i] ? PULL_COLOR[pulls[i]] ?? GREY : GREY} stroke={INK} strokeWidth={0.6} />
            <path d="M-3.4 0 h6.8" stroke={INK} strokeWidth={0.5} />
          </g>
        ))}
      </Mini>
    );
  }
  const hasSSR = pulls?.includes("ssr") ?? false;
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(18,10,30,0.55)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          {/* the gacha machine: dome of capsules + crank */}
          <circle cx={30} cy={34} r={13} fill="rgba(200,220,255,0.18)" stroke="#8a94a8" strokeWidth={1.4} />
          <circle cx={26} cy={31} r={3} fill="#f2a2c0" />
          <circle cx={34} cy={30} r={3} fill={BLUE} />
          <circle cx={30} cy={38} r={3} fill={GOLD} />
          <rect x={22} y={47} width={16} height={14} rx={2} fill="#3a1524" stroke={GOLD} strokeWidth={1.4} />
          <g className="gsp-drum" style={d(delayMs + 150)}>
            <g transform="translate(30 54)">
              <circle r={3.2} fill="none" stroke={GOLD} strokeWidth={1.2} />
              <rect x={-1} y={-5.4} width={2} height={4} rx={1} fill={GOLD} />
            </g>
          </g>
          <text x={64} y={20} fontSize={5.4} fontWeight={800} fill={CREAM} textAnchor="middle" style={{ letterSpacing: "1px" }}>THREE PULLS</text>
        </g>
        {/* three capsules roll out; each cracks to its TRUE rarity */}
        {[0, 1, 2].map((i) => {
          const pull = pulls?.[i] ?? null;
          const color = pull ? PULL_COLOR[pull] ?? GREY : GREY;
          const x = 52 + i * 15;
          const t = delayMs + 500 + i * 420;
          return (
            <g key={i}>
              <g className="gsp-capsule" style={d(t)}>
                <g transform={`translate(${x} 62)`}>
                  <path d="M-5.4 0 a5.4 5.4 0 0 1 10.8 0 Z" fill="rgba(230,235,245,0.35)" stroke={INK} strokeWidth={0.6} />
                  <path d="M-5.4 0 a5.4 5.4 0 0 0 10.8 0 Z" fill={color} stroke={INK} strokeWidth={0.6} />
                </g>
              </g>
              {pull && (
                <>
                  <g className="gsp-capsplit" style={d(t + 500)}>
                    <path transform={`translate(${x} 62)`} d="M-5.4 0 a5.4 5.4 0 0 1 10.8 0 Z" fill="rgba(230,235,245,0.55)" stroke={INK} strokeWidth={0.6} />
                  </g>
                  <g className="gsp-rise" style={d(t + 650)}>
                    <g transform={`translate(${x} 54)`}>
                      {pull === "common" && <path d="M-4 2 h5 m-2 -2 l2.4 2 -2.4 2 M-4 -3 h3" stroke={color} strokeWidth={1.2} fill="none" />}
                      {pull === "rare" && <PawnSil fill={color} s={0.8} />}
                      {pull === "epic" && <g transform="scale(0.5)"><CardBack /></g>}
                      {pull === "ssr" && <Star x={0} y={0} s={1.2} fill={GOLD} />}
                    </g>
                  </g>
                  <g className="gsp-pop" style={d(t + 700)}>
                    <text x={x} y={76} fontSize={4.6} fontWeight={800} fill={color} textAnchor="middle">{PULL_LETTER[pull] ?? "?"}</text>
                  </g>
                </>
              )}
            </g>
          );
        })}
        {hasSSR && (
          <>
            <g className="gsp-rays" style={d(delayMs + 300)}>
              <g transform="translate(67 60)">
                {Array.from({ length: 12 }, (_, i) => (
                  <rect key={i} x={-1.2} y={-32} width={2.4} height={18} rx={1.2} fill={GOLD} transform={`rotate(${i * 30})`} opacity={0.8} />
                ))}
              </g>
            </g>
            <g className="gsp-stamp" style={d(delayMs + 2100)}>
              <rect x={56} y={26} width={24} height={11} rx={2} fill="none" stroke={GOLD} strokeWidth={1.6} transform="rotate(-8 68 31)" />
              <text x={68} y={34} fontSize={6} fontWeight={800} fill={GOLD} textAnchor="middle" transform="rotate(-8 68 31)">SSR!</text>
            </g>
          </>
        )}
        <Tag
          x={50}
          y={92}
          w={58}
          text={pulls ? `PULLS: ${pulls.map((p) => PULL_LETTER[p] ?? "?").join(" / ")}` : "ROLLING THE BANNER"}
          delayMs={delayMs + 2050}
          color={hasSSR ? GOLD : pulls ? CREAM : GREY}
        />
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 19. Seven Cases (t7) - the case that opened holds what it truly held       */
/* ========================================================================= */

const CASE_SLOT: Record<string, number> = { pawn: 1, knight: 2, bishop: 3, rook: 4, intel: 5, dud: 6 };

function SevenCasesPlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_seven_cases");
  const result = oStr(o, "result"); // pawn | knight | bishop | rook | intel | dud | null
  const openIdx = result ? CASE_SLOT[result] ?? 3 : -1;
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <rect x={11} y={16} width={18} height={12} rx={1.8} fill="#2c2416" stroke={GOLD} strokeWidth={1.1} />
        <rect x={17} y={13} width={6} height={3.4} rx={1.2} fill="none" stroke={GOLD} strokeWidth={1.1} />
        <text x={20} y={25} fontSize={6} fontWeight={800} fill={GOLD} textAnchor="middle">7</text>
      </Mini>
    );
  }
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(14,12,8,0.6)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          <text x={50} y={22} fontSize={6} fontWeight={800} fill={CREAM} textAnchor="middle" style={{ letterSpacing: "1px" }}>SEVEN CASES, ONE OPENS</text>
          {/* the row of briefcases */}
          {Array.from({ length: 7 }, (_, i) => (
            <g key={i} transform={`translate(${14 + i * 12} 56)`}>
              <rect x={-5} y={-4} width={10} height={8.4} rx={1.4} fill="#2c2416" stroke={i === openIdx ? GOLD : "#6b5a34"} strokeWidth={i === openIdx ? 1.4 : 1} />
              <rect x={-2} y={-6.2} width={4} height={2.6} rx={1} fill="none" stroke="#6b5a34" strokeWidth={0.9} />
              <text x={0} y={2.4} fontSize={4.4} fontWeight={800} fill={i === openIdx ? GOLD : "#8a7a54"} textAnchor="middle">{i + 1}</text>
            </g>
          ))}
        </g>
        {openIdx >= 0 && (
          <>
            {/* the chosen case's lid flips open */}
            <g className="gsp-lid" style={d(delayMs + 350)}>
              <rect x={14 + openIdx * 12 - 5} y={49.6} width={10} height={2.6} rx={1.2} fill="#43361e" stroke={GOLD} strokeWidth={0.9} />
            </g>
            <g className="gsp-loot" style={d(delayMs + 250)}>
              <g transform={`translate(${14 + openIdx * 12} 42)`}>
                {result === "pawn" && <PawnSil fill={GOLD} s={1.1} />}
                {result === "knight" && <KnightSil fill={GOLD} s={1.1} />}
                {result === "bishop" && <BishopSil fill={GOLD} s={1.1} />}
                {result === "rook" && <RookSil fill={GOLD} s={1.1} />}
                {result === "intel" && (
                  <g>
                    <rect x={-4.4} y={-5.4} width={8.8} height={11} rx={1.2} fill="#fdfbf4" stroke="#c9c2ac" strokeWidth={0.8} />
                    <path d="M-2.6 -2.4 q2.6 -2.6 5.2 0 q-2.6 2.6 -5.2 0 Z" fill="none" stroke={BLUE} strokeWidth={0.9} />
                    <circle cx={0} cy={-2.4} r={1} fill={BLUE} />
                    <path d="M-2.6 1.4 h5.2 M-2.6 3.6 h5.2" stroke="#8a94a8" strokeWidth={0.7} />
                  </g>
                )}
                {result === "dud" && <SadPuffs x={0} y={0} delayMs={delayMs + 1500} />}
              </g>
            </g>
            {result !== "dud" && <g className="gsp-star" style={d(delayMs + 1900)}><Star x={14 + openIdx * 12} y={30} s={1.2} /></g>}
          </>
        )}
        <Tag
          x={50}
          y={90}
          w={62}
          text={
            result === "pawn" ? "CASE PAYS: A PAWN"
            : result === "knight" ? "CASE PAYS: A KNIGHT"
            : result === "bishop" ? "CASE PAYS: A BISHOP"
            : result === "rook" ? "CASE PAYS: A ROOK"
            : result === "intel" ? "INTEL PACKET: REROLL + PEEK"
            : result === "dud" ? "ABSOLUTELY NOTHING"
            : "THE BANKER IS THE PHONE"
          }
          delayMs={delayMs + 1950}
          color={result === "dud" ? GREY : result ? GOLD : GREY}
        />
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 20. Martingale (t7) - the ladder doubles rung by TRUE rung                 */
/* ========================================================================= */

const MARTINGALE_PRIZE = [
  "BUST ON FLIP ONE: STUNNED",
  "ONE WIN: A PAWN",
  "TWO WINS: TWO PAWNS",
  "THREE WINS: KNIGHT + PAWN",
  "FOUR WINS: ROOK + KNIGHT",
];

function MartingalePlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_martingale");
  const wins = oNum(o, "wins"); // 0..4 | null
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <Chip cx={13} cy={27} r={4} />
        <Chip cx={20} cy={27} r={4} fill="#5fc9b0" edge="#2a7a68" />
        <Chip cx={20} cy={22.6} r={4} fill="#5fc9b0" edge="#2a7a68" />
        <Chip cx={27} cy={27} r={4} fill={GOLD} edge={GOLD_EDGE} />
        <Chip cx={27} cy={22.6} r={4} fill={GOLD} edge={GOLD_EDGE} />
        <Chip cx={27} cy={18.2} r={4} fill={GOLD} edge={GOLD_EDGE} />
      </Mini>
    );
  }
  const known = wins != null;
  const stacks = [1, 2, 3, 4]; // drawn chips per rung (the ladder doubling)
  const stackColor = [["#d6234f", DEEP_RED], ["#5fc9b0", "#2a7a68"], ["#7fa0e0", "#2c4f9e"], [GOLD, GOLD_EDGE]] as const;
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(8,26,16,0.5)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          <rect x={10} y={70} width={80} height={16} rx={3} fill={FELT} stroke={FELT_EDGE} strokeWidth={1.6} />
          <text x={50} y={20} fontSize={6} fontWeight={800} fill={CREAM} textAnchor="middle" style={{ letterSpacing: "1px" }}>DOUBLE UNTIL YOU MISS</text>
          {stacks.map((_, r) => (
            <text key={r} x={24 + r * 17} y={66} fontSize={3.8} fontWeight={700} fill={known && r < wins ? GREEN : GREY} textAnchor="middle">{`x${2 ** r}`}</text>
          ))}
        </g>
        {/* each won rung stacks its doubled chips; the miss slams a red X */}
        {stacks.map((count, r) => {
          const won = known && r < wins;
          const missed = known && r === wins;
          return (
            <g key={r}>
              {won &&
                Array.from({ length: count }, (_, c) => (
                  <g key={c} className="gsp-chip" style={d(delayMs + 350 + r * 380 + c * 110)}>
                    <Chip cx={24 + r * 17} cy={76 - c * 4.6} r={5.4} fill={stackColor[r][0]} edge={stackColor[r][1]} />
                  </g>
                ))}
              {missed && (
                <g className="gsp-stamp" style={d(delayMs + 350 + r * 380)}>
                  <text x={24 + r * 17} y={78} fontSize={9} fontWeight={800} fill={RED} textAnchor="middle">✕</text>
                </g>
              )}
            </g>
          );
        })}
        {known && wins === 0 && (
          <>
            {/* first flip dies: the chip is swept and the mover sees stars */}
            <g className="gsp-sweep" style={d(delayMs + 900)}><Chip cx={24} cy={76} r={5.4} /></g>
            <g className="gsp-pop" style={d(delayMs + 1500)}>
              <g transform="translate(50 42)"><KnightSil fill={GREY} s={1.2} /></g>
              <g transform="translate(50 30)">
                <Star x={-7} y={0} s={0.7} fill={GREY} />
                <Star x={0} y={-3} s={0.7} fill={GREY} />
                <Star x={7} y={0} s={0.7} fill={GREY} />
              </g>
            </g>
          </>
        )}
        {known && wins >= 1 && (
          <>
            <g className="gsp-pop" style={d(delayMs + 350 + wins * 380 + 300)}>
              <g transform="translate(50 36)">
                {wins >= 4 ? <RookSil fill={GOLD} s={1.3} /> : wins >= 3 ? <KnightSil fill={GOLD} s={1.3} /> : <PawnSil fill={GOLD} s={1.3} />}
              </g>
              {wins >= 3 && <g transform="translate(66 38)"><PawnSil fill={CREAM} s={0.95} /></g>}
              {wins >= 4 && <g transform="translate(66 38)"><KnightSil fill={CREAM} s={0.95} /></g>}
              {wins === 2 && <g transform="translate(66 38)"><PawnSil fill={CREAM} s={0.95} /></g>}
            </g>
            <g className="gsp-star" style={d(delayMs + 350 + wins * 380 + 550)}><Star x={36} y={30} s={1.2} /></g>
            <Payout x={50} y={76} delayMs={delayMs + 350 + wins * 380 + 500} n={Math.min(5, wins + 1)} />
          </>
        )}
        <Tag x={50} y={94} w={62} text={known ? MARTINGALE_PRIZE[wins] : "FLIPPING..."} delayMs={delayMs + (known ? 350 + Math.min(wins + 1, 4) * 380 + 400 : 1600)} color={known ? (wins === 0 ? RED : GOLD) : GREY} />
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 21. Devil's Deck (t7) - the three cards drawn are the three that resolve   */
/* ========================================================================= */

const DEVIL_FACE: Record<string, { glyph: ReactNode; curse: boolean; short: string }> = {
  knight: { glyph: <g transform="scale(0.6)"><KnightSil fill={GOLD_EDGE} /></g>, curse: false, short: "KNIGHT" },
  stun3: {
    glyph: (
      <g>
        <Star x={-3.4} y={-2.4} s={0.55} fill={GOLD_EDGE} />
        <Star x={3.4} y={-2.4} s={0.55} fill={GOLD_EDGE} />
        <Star x={0} y={3.4} s={0.55} fill={GOLD_EDGE} />
      </g>
    ),
    curse: false,
    short: "STUN x3",
  },
  revive: {
    glyph: (
      <g>
        <path d="M0 -5 v10 M-4.4 -0.6 h8.8" stroke={GOLD_EDGE} strokeWidth={1.6} />
        <path d="M-3.4 4.4 q3.4 3 6.8 0" stroke={GOLD_EDGE} strokeWidth={1.1} fill="none" />
      </g>
    ),
    curse: false,
    short: "REVIVE",
  },
  shield: {
    glyph: <path d="M0 -6 l5.4 2 v4 q0 4.6 -5.4 6.6 q-5.4 -2 -5.4 -6.6 v-4 Z" fill="none" stroke={GOLD_EDGE} strokeWidth={1.5} />,
    curse: false,
    short: "SHIELD",
  },
  losepawn: {
    glyph: (
      <g>
        <g transform="scale(0.55)"><PawnSil fill={DEEP_RED} /></g>
        <path d="M-5 -5 L5 5 M5 -5 L-5 5" stroke={RED} strokeWidth={1.4} />
      </g>
    ),
    curse: true,
    short: "PAWN LOST",
  },
  freezeminor: {
    glyph: (
      <g stroke={RED} strokeWidth={1.2}>
        <path d="M0 -5.4 V5.4 M-4.7 -2.7 L4.7 2.7 M4.7 -2.7 L-4.7 2.7" />
        <path d="M0 -5.4 l-1.6 1.8 M0 -5.4 l1.6 1.8" strokeWidth={0.9} />
      </g>
    ),
    curse: true,
    short: "MINOR FROZEN",
  },
};

function DevilsDeckPlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_devils_deck");
  const rawDrawn = oArr(o, "drawn");
  const drawn = rawDrawn ? rawDrawn.filter((c): c is string => typeof c === "string").slice(0, 3) : null;
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <g transform="translate(14 21) scale(0.55) rotate(-12)"><CardBack /></g>
        <g transform="translate(20 20) scale(0.55)"><CardBack /></g>
        <g transform="translate(26 21) scale(0.55) rotate(12)"><CardBack /></g>
        <path d="M30 10 q4 -2 3 3 q-0.6 2.6 -3.4 2" stroke={RED} strokeWidth={1.2} fill="none" />
      </Mini>
    );
  }
  const flipSlots = [1, 2, 4]; // which of the six fanned cards flip
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(26,4,10,0.6)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          <text x={50} y={18} fontSize={6} fontWeight={800} fill="#e08a9a" textAnchor="middle" style={{ letterSpacing: "1px" }}>HE SHUFFLES WITH HIS TAIL</text>
          {/* the tail, mid-shuffle */}
          <path d="M84 74 q8 -10 -2 -16 q-7 -4 -5 -10 q1.6 -5 7 -4" stroke={RED} strokeWidth={2} fill="none" strokeLinecap="round" />
          <path d="M82 42 l4 -3 -0.6 5 Z" fill={RED} />
        </g>
        {/* six cards fanned; the three DRAWN slots flip to their true faces */}
        {Array.from({ length: 6 }, (_, i) => {
          const x = 22 + i * 11.2;
          const tilt = (i - 2.5) * 7;
          const drawIdx = flipSlots.indexOf(i);
          const card = drawIdx >= 0 && drawn ? drawn[drawIdx] : null;
          const face = card ? DEVIL_FACE[card] : null;
          if (!face) {
            return (
              <g key={i} transform={`translate(${x} 54)`}>
                <g className="gsp-deal" style={dv(delayMs + 150 + i * 90, { "--tilt": `${tilt}deg` })}>
                  <g transform={`rotate(${tilt}) scale(0.86)`}><CardBack /></g>
                </g>
              </g>
            );
          }
          const flipMs = delayMs + 900 + drawIdx * 430;
          return (
            <g key={i} transform={`translate(${x} 54)`}>
              <g className="gsp-deal" style={dv(delayMs + 150 + i * 90, { "--tilt": `${tilt}deg` })}>
                <g transform={`rotate(${tilt}) scale(0.86)`}>
                  <g className="gsp-flipback" style={d(flipMs)}><CardBack /></g>
                  <g className="gsp-flipface" style={d(flipMs)}>
                    <rect x={-8} y={-11.5} width={16} height={23} rx={2.2} fill={face.curse ? "#2a0d14" : "#fdf3d8"} stroke={face.curse ? RED : GOLD_EDGE} strokeWidth={1.1} />
                    {face.glyph}
                  </g>
                  {/* ignition flash: gold for a blessing, red for a curse */}
                  <g className="gsp-flash" style={d(flipMs + 250)}>
                    <rect x={-8} y={-11.5} width={16} height={23} rx={2.2} fill={face.curse ? "rgba(224,75,99,0.55)" : "rgba(255,215,106,0.55)"} />
                  </g>
                </g>
              </g>
            </g>
          );
        })}
        {drawn && (
          <Tag
            x={50}
            y={90}
            w={70}
            text={drawn.map((c) => DEVIL_FACE[c]?.short ?? "?").join(" / ")}
            delayMs={delayMs + 2300}
            color={drawn.some((c) => DEVIL_FACE[c]?.curse) ? "#e08a9a" : GOLD}
          />
        )}
        {!drawn && <Tag x={50} y={90} w={48} text="THREE CARDS DRAW" delayMs={delayMs + 2100} color={GREY} />}
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 22. Break the Bank (t8) - each laser flashes its TRUE verdict              */
/* ========================================================================= */

function ChainsClamp({ x, y, delayMs }: { x: number; y: number; delayMs: number }) {
  return (
    <g className="gsp-chains" style={d(delayMs)}>
      <g transform={`translate(${x} ${y})`} stroke="#8a94a8" strokeWidth={1.4} fill="none">
        <ellipse cx={-3.6} cy={0} rx={2.2} ry={3.2} />
        <ellipse cx={0} cy={1.6} rx={2.2} ry={3.2} transform="rotate(38)" />
        <ellipse cx={3.6} cy={0} rx={2.2} ry={3.2} />
      </g>
    </g>
  );
}

function BreakTheBankPlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_break_the_bank");
  const hits = oNum(o, "hits"); // 0..3 | null
  const known = hits != null;
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <circle cx={20} cy={20} r={9} fill="#39496e" stroke="#c3cad6" strokeWidth={1.4} />
        <circle cx={20} cy={20} r={4} fill="none" stroke="#c3cad6" strokeWidth={1.1} />
        <path d="M20 16 v8 M16 20 h8" stroke="#c3cad6" strokeWidth={1.1} />
      </Mini>
    );
  }
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(6,10,22,0.62)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          <text x={50} y={16} fontSize={6} fontWeight={800} fill={CREAM} textAnchor="middle" style={{ letterSpacing: "1px" }}>RUN THE HEIST</text>
          {/* the vault at the end of the corridor */}
          <rect x={64} y={30} width={26} height={46} rx={3} fill="#22304d" stroke="#5a6b8f" strokeWidth={1.6} />
          <text x={77} y={26} fontSize={4.2} fontWeight={700} fill={GREY} textAnchor="middle">THE BANK</text>
        </g>
        {/* the vault door (swings open only on a clean run) */}
        <g className={known && hits === 3 ? "gsp-vaultdoor" : "gsp-linger gsp-linger--long"} style={d(delayMs + (known && hits === 3 ? 400 : 0))}>
          <g transform="translate(77 53)">
            <circle r={11} fill="#39496e" stroke="#c3cad6" strokeWidth={2} />
            <circle r={4.6} fill="none" stroke="#c3cad6" strokeWidth={1.4} />
            <path d="M0 -8 v16 M-8 0 h16" stroke="#c3cad6" strokeWidth={1.4} />
          </g>
        </g>
        {/* three laser grids: each flashes green (slipped) or red (tripped) */}
        {[0, 1, 2].map((i) => {
          const slipped = known ? i < hits : false;
          const color = !known ? GREY : slipped ? GREEN : RED;
          return (
            <g key={i} className="gsp-laser" style={d(delayMs + 350 + i * 380)}>
              <rect x={10} y={38 + i * 13} width={52} height={1.8} rx={0.9} fill={color} />
              <circle cx={10} cy={38.9 + i * 13} r={2} fill={color} />
              {known && (
                <text x={5} y={41 + i * 13} fontSize={3.8} fontWeight={800} fill={color} textAnchor="middle">{slipped ? "OK" : "!!"}</text>
              )}
            </g>
          );
        })}
        {known && hits <= 1 && (
          <g className="gsp-alarm" style={d(delayMs + 1500)}>
            <rect width={100} height={100} fill="rgba(224,75,99,0.28)" />
            <circle cx={77} cy={24} r={2.6} fill={RED} />
          </g>
        )}
        {known && hits === 3 && (
          <>
            <g className="gsp-loot" style={d(delayMs + 700)}>
              <g transform="translate(77 44)"><QueenSil fill={GOLD} s={1.2} /></g>
            </g>
            <g className="gsp-pop" style={d(delayMs + 2250)}>
              <g transform="translate(58 26) rotate(-9) scale(0.8)"><CardFace pip={GOLD_EDGE} label="T6" /></g>
            </g>
            <g className="gsp-star" style={d(delayMs + 2400)}><Star x={88} y={34} s={1.3} /></g>
            <Payout x={77} y={64} delayMs={delayMs + 2350} n={5} />
            <Tag x={50} y={92} w={66} text="CLEAN RUN: BEST PIECE BACK + T6 CARD" delayMs={delayMs + 2300} />
          </>
        )}
        {known && hits === 2 && (
          <>
            <g className="gsp-pop" style={d(delayMs + 2100)}>
              <g transform="translate(50 26) rotate(-6) scale(0.85)"><CardFace pip={GOLD_EDGE} label="T6" /></g>
            </g>
            <Tag x={50} y={92} w={58} text="TWO GRIDS: THE TIER 6 CARD" delayMs={delayMs + 2250} color={GOLD} />
          </>
        )}
        {known && hits === 1 && (
          <>
            <g className="gsp-pop" style={d(delayMs + 2100)}><g transform="translate(30 24)"><PawnSil fill={CREAM} s={1.05} /></g></g>
            <ChainsClamp x={44} y={26} delayMs={delayMs + 1900} />
            <Tag x={50} y={92} w={66} text="ONE GRID: A PAWN, ONE PIECE JAILED" delayMs={delayMs + 2250} color={RED} />
          </>
        )}
        {known && hits === 0 && (
          <>
            <ChainsClamp x={36} y={24} delayMs={delayMs + 1800} />
            <ChainsClamp x={52} y={26} delayMs={delayMs + 2000} />
            <Tag x={50} y={92} w={62} text="BUSTED: TWO PIECES IN CUSTODY" delayMs={delayMs + 2300} color={RED} />
          </>
        )}
        {!known && <Tag x={50} y={92} w={48} text="THE PLAN HAD ONE JOB" delayMs={delayMs + 2100} color={GREY} />}
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 23. Wheel of the Cosmos (t8) - twelve segments, parked on the TRUE one     */
/* ========================================================================= */

const COSMOS_TAGS = [
  "A MINOR RETURNS",
  "GREAT PAWN MARCH",
  "THREE-CARD DRAFT",
  "TWO ENEMIES STUNNED",
  "PAWN BECOMES KNIGHT",
  "TWO REROLLS",
  "YOUR ARMY THAWS",
  "A KNIGHT IS SUMMONED",
  "A PAWN IS LOST",
  "A MINOR FREEZES",
  "OPPONENT GAINS A REROLL",
  "A PAWN DEFECTS",
];
const COSMOS_KIND = ["#233a63", "#1d2f52", "#2a2454", "#1f3a5e", "#232f63", "#2a2454", "#1d2f52", "#233a63"];

function WheelOfTheCosmosPlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_wheel_of_the_cosmos");
  const segment = oNum(o, "segment"); // 0..11 | null
  const known = segment != null && segment >= 0 && segment < 12;
  const seg = known ? segment : 2;
  const cruel = known && segment >= 8;
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <g transform="translate(20 21)">
          <g className="gsp-spinvar" style={dv(delayMs, { "--turn": turnFor(seg, 12, 2) })}>
            {Array.from({ length: 12 }, (_, i) => (
              <path key={i} d={segPath(12, -90 + i * 30, -90 + (i + 1) * 30)} fill={i >= 8 ? "#3a0d18" : COSMOS_KIND[i]} stroke={PURPLE} strokeWidth={0.4} />
            ))}
          </g>
          <path d="M-2.2 -15.4 h4.4 l-2.2 4.6 Z" fill={GOLD} />
        </g>
      </Mini>
    );
  }
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(10,6,26,0.62)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          <text x={50} y={13} fontSize={5.6} fontWeight={800} fill={PURPLE} textAnchor="middle" style={{ letterSpacing: "1px" }}>THE UNIVERSE IS A WHEEL</text>
          {/* drifting stars */}
          <circle cx={16} cy={26} r={0.9} fill={CREAM} opacity={0.8} />
          <circle cx={86} cy={22} r={0.7} fill={CREAM} opacity={0.7} />
          <circle cx={12} cy={70} r={0.7} fill={CREAM} opacity={0.6} />
          <circle cx={88} cy={74} r={0.9} fill={CREAM} opacity={0.8} />
        </g>
        <g transform="translate(50 47)">
          <circle r={32} fill="none" stroke={PURPLE} strokeWidth={1.4} strokeDasharray="2 3" opacity={0.7} />
          {/* the wheel: 8 kind segments, 4 cruel, parked on the rolled one */}
          <g className="gsp-spinvar" style={dv(delayMs + 200, { "--turn": turnFor(seg, 12) })}>
            {Array.from({ length: 12 }, (_, i) => (
              <g key={i}>
                <path d={segPath(28, -90 + i * 30, -90 + (i + 1) * 30)} fill={i >= 8 ? "#3a0d18" : COSMOS_KIND[i]} stroke={i >= 8 ? RED : PURPLE} strokeWidth={0.8} />
                <circle
                  cx={20 * Math.cos(((-90 + i * 30 + 15) * Math.PI) / 180)}
                  cy={20 * Math.sin(((-90 + i * 30 + 15) * Math.PI) / 180)}
                  r={1.2}
                  fill={i >= 8 ? RED : GOLD}
                />
              </g>
            ))}
            <circle r={6} fill="#1a1030" stroke={PURPLE} strokeWidth={1.2} />
            <Star x={0} y={0} s={0.8} fill={PURPLE} />
          </g>
          <Pointer cy={-33} delayMs={delayMs + 200} />
        </g>
        {known && !cruel && (
          <>
            <g className="gsp-flash" style={d(delayMs + 1900)}><circle cx={50} cy={47} r={34} fill="rgba(255,215,106,0.22)" /></g>
            <g className="gsp-star" style={d(delayMs + 2150)}><Star x={30} y={26} s={1.3} /></g>
            <g className="gsp-star" style={d(delayMs + 2300)}><Star x={70} y={28} s={1.1} /></g>
          </>
        )}
        {known && cruel && (
          <>
            <g className="gsp-alarm" style={d(delayMs + 1900)}><rect width={100} height={100} fill="rgba(224,75,99,0.2)" /></g>
            <SadPuffs x={50} y={20} delayMs={delayMs + 2150} />
          </>
        )}
        <Tag
          x={50}
          y={93}
          w={64}
          text={known ? COSMOS_TAGS[segment] : "SPUN ONCE, RIGGED FAIRLY"}
          delayMs={delayMs + 2150}
          color={!known ? GREY : cruel ? RED : GOLD}
        />
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 24. Cursed Dice (t3 hex) - bone dice roll what they truly rolled           */
/* ========================================================================= */

function BoneDie({ grin }: { grin: boolean }) {
  return (
    <g>
      <rect x={-5.4} y={-5.4} width={10.8} height={10.8} rx={2.6} fill="#e8e2d2" stroke="#8a8270" strokeWidth={0.9} />
      {/* skull eyes for pips */}
      <circle cx={-2.2} cy={-1.6} r={1.3} fill={INK} />
      <circle cx={2.2} cy={-1.6} r={1.3} fill={INK} />
      <path d="M-0.7 0.6 L0 1.8 L0.7 0.6" fill="none" stroke={INK} strokeWidth={0.7} />
      {grin ? (
        <path d="M-2.8 3 q2.8 2.6 5.6 0" stroke={INK} strokeWidth={0.9} fill="none" />
      ) : (
        <path d="M-2.6 3.2 h5.2" stroke={INK} strokeWidth={0.9} strokeDasharray="1.1 0.8" />
      )}
    </g>
  );
}

function CursedDicePlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_cursed_dice");
  const result = oStr(o, "result"); // freeze | stumble | grin | null
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <g transform="translate(14 20) rotate(-9) scale(0.9)"><BoneDie grin={result === "grin"} /></g>
        <g transform="translate(26 21) rotate(8) scale(0.9)"><BoneDie grin={result === "grin"} /></g>
      </Mini>
    );
  }
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(26,4,12,0.6)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          <text x={50} y={20} fontSize={5.6} fontWeight={800} fill="#e08a9a" textAnchor="middle" style={{ letterSpacing: "1px" }}>ROLL, THEY INSIST</text>
          {/* the opponent's side of the table */}
          <rect x={20} y={26} width={60} height={3} rx={1.5} fill={DEEP_RED} opacity={0.7} />
        </g>
        {/* the bone dice clatter toward the enemy camp */}
        <g className="gsp-dice" style={d(delayMs + 250)}>
          <g transform="translate(42 48) scale(1.35)"><BoneDie grin={result === "grin"} /></g>
        </g>
        <g className="gsp-dice" style={d(delayMs + 420)}>
          <g transform="translate(58 50) scale(1.35)"><BoneDie grin={result === "grin"} /></g>
        </g>
        {result === "freeze" && (
          <>
            {/* an enemy piece ices over */}
            <g className="gsp-pop" style={d(delayMs + 1700)}>
              <g transform="translate(50 22)"><KnightSil fill="#9fd0e8" s={1.15} /></g>
              <g stroke="#9fd0e8" strokeWidth={1}>
                <path d="M38 18 v8 M34 22 h8" />
                <path d="M62 16 v6 M59 19 h6" />
              </g>
            </g>
            <Tag x={50} y={90} w={58} text="AN ENEMY PIECE FREEZES" delayMs={delayMs + 1850} color="#9fd0e8" />
          </>
        )}
        {result === "stumble" && (
          <>
            <g className="gsp-step" style={d(delayMs + 1700)}>
              <g transform="translate(50 20) rotate(180)"><PawnSil fill={INK} s={1.05} /></g>
              <path d="M58 20 v7 m-2.4 -2.6 l2.4 2.8 2.4 -2.8" stroke={RED} strokeWidth={1.4} fill="none" />
            </g>
            <Tag x={50} y={90} w={60} text="AN ENEMY PAWN STUMBLES BACK" delayMs={delayMs + 1850} color={RED} />
          </>
        )}
        {result === "grin" && (
          <>
            <g className="gsp-rise" style={d(delayMs + 1750)}>
              <text x={62} y={40} fontSize={5} fontWeight={800} fill={GREY} textAnchor="middle">heh heh</text>
            </g>
            <SadPuffs x={40} y={40} delayMs={delayMs + 1700} />
            <Tag x={50} y={90} w={56} text="THE DICE JUST... GRIN" delayMs={delayMs + 1850} color={GREY} />
          </>
        )}
        {result == null && <Tag x={50} y={90} w={44} text="THE BONES DECIDE" delayMs={delayMs + 1750} color={GREY} />}
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 25. Rigged Raffle (t5 hex) - the glue prize finds its unwilling winner     */
/* ========================================================================= */

function RiggedRafflePlay({ lead, delayMs }: PlayProps) {
  // Fires only when a draw actually glued the piece the opponent just moved
  // (the hook mutates the board only then), so the splat is always earned.
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <g className="gsp-splat" style={d(delayMs)}>
          <path d="M20 14 q6 2 5 8 q3 1 1 4 q-3 3 -6 1 q-5 2 -7 -2 q-3 -4 1 -6 q0 -4 6 -5 Z" fill="#b8e05a" opacity={0.9} />
        </g>
      </Mini>
    );
  }
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(20,22,6,0.55)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          <text x={50} y={20} fontSize={5.6} fontWeight={800} fill="#d6e08a" textAnchor="middle" style={{ letterSpacing: "1px" }}>EVERYONE IS A WINNER. OF GLUE.</text>
          <path d="M32 78 h36 M38 78 L42 64 M62 78 L58 64" stroke={WOOD} strokeWidth={2.2} strokeLinecap="round" />
        </g>
        {/* the drum tumbles a raffle nobody entered */}
        <g transform="translate(50 50)">
          <g className="gsp-drum" style={d(delayMs + 100)}>
            <circle r={15} fill="#2a3010" stroke="#d6e08a" strokeWidth={2} />
            <rect x={-6} y={-8} width={9} height={5} rx={1} fill="#d6e08a" transform="rotate(24)" />
            <rect x={-2} y={2} width={9} height={5} rx={1} fill="#b8e05a" transform="rotate(-16)" />
          </g>
        </g>
        {/* the "winning" stub arcs up to the piece that just moved */}
        <g className="gsp-ticket" style={d(delayMs + 300)}>
          <g transform="translate(52 46)">
            <rect x={-6} y={-3.4} width={12} height={6.8} rx={1.2} fill="#b8e05a" stroke="#7a9a2a" strokeWidth={0.9} />
            <text x={0} y={1.8} fontSize={3.4} fontWeight={800} fill="#3a4a10" textAnchor="middle">GLUE</text>
          </g>
        </g>
        {/* the just-moved enemy piece takes the splat */}
        <g className="gsp-pop" style={d(delayMs + 1350)}>
          <g transform="translate(78 26)"><KnightSil fill={INK} s={1.1} /></g>
        </g>
        <g className="gsp-splat" style={d(delayMs + 1100)}>
          <g transform="translate(78 30)">
            <path d="M0 -7 q7 2 6 8 q4 1 1.4 5 q-4 3.4 -7.4 1 q-6 2.6 -8 -2 q-3.4 -5 1 -7 q0 -4.6 7 -5 Z" fill="#b8e05a" opacity={0.9} />
            <circle cx={-3} cy={7} r={1.2} fill="#b8e05a" />
          </g>
        </g>
        <Tag x={50} y={92} w={62} text="GLUED IN PLACE FOR A TURN" delayMs={delayMs + 1900} color="#b8e05a" />
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 26. Consolation Scratcher (t2 boon) - the foil reveals the TRUE prize      */
/* ========================================================================= */

function ConsolationScratcherPlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_consolation_scratcher");
  const result = oStr(o, "result"); // advance | reroll | dust | null
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <rect x={9} y={14} width={22} height={12} rx={1.8} fill="#f4ecd6" stroke="#c2a24a" strokeWidth={1} />
        <g className="gsp-scratch" style={d(delayMs)}><rect x={9} y={14} width={22} height={12} rx={1.8} fill={GREY} /></g>
      </Mini>
    );
  }
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(28,20,8,0.5)" /></g>
        <g className={result === "dust" ? "gsp-slump" : "gsp-linger gsp-linger--long"} style={d(delayMs + (result === "dust" ? 1200 : 0))}>
          <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
            {/* the apology ticket */}
            <rect x={24} y={32} width={52} height={36} rx={3} fill="#f4ecd6" stroke="#c2a24a" strokeWidth={1.6} />
            <text x={50} y={41} fontSize={4.6} fontWeight={800} fill="#c2372f" textAnchor="middle" style={{ letterSpacing: "0.5px" }}>SORRY ABOUT THE HANDICAP</text>
            {/* prize window (already printed beneath the foil) */}
            <rect x={38} y={46} width={24} height={16} rx={1.8} fill="#fffbe9" stroke="#d8c58a" strokeWidth={0.9} />
            <g transform="translate(50 54)">
              {result === "advance" && (
                <g>
                  <g transform="translate(-3 0) scale(0.75)"><PawnSil fill="#3a7a4a" /></g>
                  <path d="M5 2 v-6 m-2.2 2 l2.2 -2.2 2.2 2.2" stroke="#3a7a4a" strokeWidth={1.3} fill="none" />
                </g>
              )}
              {result === "reroll" && (
                <g stroke={BLUE} strokeWidth={1.4} fill="none">
                  <path d="M-4.4 0 a4.4 4.4 0 1 1 1.4 3.2" />
                  <path d="M-4.6 -3.4 l0.4 3.6 3.4 -1.2" fill={BLUE} stroke="none" />
                </g>
              )}
              {result === "dust" && <text x={0} y={2} fontSize={4} fontWeight={700} fill={GREY} textAnchor="middle">xoxo</text>}
              {result == null && <text x={0} y={2.4} fontSize={6} fontWeight={800} fill={GREY} textAnchor="middle">?</text>}
            </g>
          </g>
        </g>
        {/* the foil gets scrubbed off the window */}
        <g className="gsp-scratch" style={d(delayMs + 500)}>
          <rect x={37.6} y={45.6} width={24.8} height={16.8} rx={1.8} fill={GREY} stroke="#8a94a8" strokeWidth={0.7} />
          <path d="M40 50 h20 M40 54 h20 M40 58 h20" stroke="#9098a6" strokeWidth={0.7} />
        </g>
        {/* the scraping coin */}
        <g className="gsp-sweep" style={d(delayMs + 450)}>
          <g transform="translate(34 54) rotate(-22)"><Chip cx={0} cy={0} r={4.6} fill={GOLD} edge={GOLD_EDGE} /></g>
        </g>
        {result === "advance" && <Tag x={50} y={90} w={58} text="A PAWN ADVANCES, FREE" delayMs={delayMs + 1750} color={GREEN} />}
        {result === "reroll" && <Tag x={50} y={90} w={50} text="+1 DRAFT REROLL" delayMs={delayMs + 1750} color={BLUE} />}
        {result === "dust" && (
          <>
            <SadPuffs x={50} y={42} delayMs={delayMs + 1550} />
            <Tag x={50} y={90} w={62} text="DUST AND A LOVELY SENTIMENT" delayMs={delayMs + 1750} color={GREY} />
          </>
        )}
        {result == null && <Tag x={50} y={90} w={44} text="SCRATCHING..." delayMs={delayMs + 1650} color={GREY} />}
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 27. Hardship Jackpot (t4 boon) - the piggy pays what misery earned         */
/* ========================================================================= */

function HardshipJackpotPlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_hardship_jackpot");
  const result = oStr(o, "result"); // pawn | thaw | double | null
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <ellipse cx={20} cy={22} rx={9} ry={7} fill="#f2a2c0" stroke="#d67ba0" strokeWidth={1.1} />
        <ellipse cx={12} cy={22} rx={2.6} ry={2.2} fill="#f7bcd3" stroke="#d67ba0" strokeWidth={0.9} />
        <rect x={17.6} y={13.4} width={4.8} height={1.6} rx={0.8} fill="#d67ba0" />
      </Mini>
    );
  }
  const showPawn = result === "pawn" || result === "double";
  const showThaw = result === "thaw" || result === "double";
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(28,12,20,0.5)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          <text x={50} y={20} fontSize={5.6} fontWeight={800} fill="#f2a2c0" textAnchor="middle" style={{ letterSpacing: "1px" }}>THE MISERY METER PAYS OUT</text>
        </g>
        {/* the piggy bank shakes hard, then the payout bursts free */}
        <g className="gsp-jiggle" style={d(delayMs)}>
          <g transform="translate(50 56)">
            <ellipse rx={17} ry={13} fill="#f2a2c0" stroke="#d67ba0" strokeWidth={1.8} />
            <ellipse cx={-15} cy={0} rx={4.4} ry={3.6} fill="#f7bcd3" stroke="#d67ba0" strokeWidth={1.2} />
            <circle cx={-15.6} cy={-0.8} r={0.8} fill="#a04a70" />
            <circle cx={-15.6} cy={1} r={0.8} fill="#a04a70" />
            <circle cx={-6} cy={-4.6} r={1.1} fill={INK} />
            <rect x={-2.6} y={-14.6} width={7} height={2} rx={1} fill="#d67ba0" />
            <path d="M-9 12 v3 M9 12 v3" stroke="#d67ba0" strokeWidth={2.2} strokeLinecap="round" />
          </g>
        </g>
        {/* the crack of the payout */}
        <g className="gsp-flash" style={d(delayMs + 900)}>
          <path d="M50 42 l3 5 -4 3 5 5" stroke="#fff" strokeWidth={1.4} fill="none" />
        </g>
        {showPawn && (
          <g className="gsp-loot" style={d(delayMs)}>
            <g transform="translate(40 42)"><PawnSil fill={GOLD} s={1.2} /></g>
          </g>
        )}
        {showThaw && (
          <>
            {/* the ice cube on a piece melts away */}
            <g className="gsp-loot" style={d(delayMs + 150)}>
              <g transform="translate(62 42)">
                <rect x={-6} y={-6} width={12} height={12} rx={2} fill="rgba(159,208,232,0.5)" stroke="#9fd0e8" strokeWidth={1.2} />
                <g transform="scale(0.75)"><KnightSil fill={CREAM} /></g>
              </g>
            </g>
            <g className="gsp-drip" style={d(delayMs + 1550)}><circle cx={58} cy={50} r={1.4} fill="#9fd0e8" /></g>
            <g className="gsp-drip" style={d(delayMs + 1750)}><circle cx={66} cy={50} r={1.2} fill="#9fd0e8" /></g>
          </>
        )}
        {result === "double" && (
          <>
            <g className="gsp-star" style={d(delayMs + 1900)}><Star x={50} y={30} s={1.4} /></g>
            <Payout x={50} y={64} delayMs={delayMs + 1850} n={4} />
          </>
        )}
        <Tag
          x={50}
          y={92}
          w={60}
          text={
            result === "pawn" ? "PAYOUT: A FRESH PAWN"
            : result === "thaw" ? "PAYOUT: A PIECE THAWS"
            : result === "double" ? "DOUBLE JACKPOT: PAWN + THAW"
            : "SHAKING THE PIGGY"
          }
          delayMs={delayMs + 1800}
          color={result === "double" ? GOLD : result ? "#f2a2c0" : GREY}
        />
      </svg>
    </Wide>
  );
}

/* ========================================================================= */
/* 28. The Last Bet (t8) - the queen returns gilded, or the door shuts        */
/* ========================================================================= */

function TheLastBetPlay({ lead, delayMs }: PlayProps) {
  const o = useOutcome("gm_the_last_bet");
  const result = oStr(o, "result"); // empowered | backroom | null
  if (!lead) {
    return (
      <Mini delayMs={delayMs}>
        <g transform="translate(20 19)"><QueenSil fill={result === "backroom" ? GREY : GOLD} s={1.1} /></g>
      </Mini>
    );
  }
  return (
    <Wide>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <g className="gsp-wash"><rect width={100} height={100} fill="rgba(8,26,16,0.58)" /></g>
        <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
          <rect x={8} y={64} width={84} height={22} rx={4} fill={FELT} stroke={FELT_EDGE} strokeWidth={2} />
          <text x={50} y={18} fontSize={5.6} fontWeight={800} fill={CREAM} textAnchor="middle" style={{ letterSpacing: "1px" }}>NOBODY AT THE TABLE BREATHED</text>
          {/* her stake: herself */}
          <Chip cx={38} cy={74} r={5} fill={GOLD} edge={GOLD_EDGE} />
          <Chip cx={46} cy={76} r={5} />
        </g>
        {result === "empowered" && (
          <>
            {/* she returns gilded, leaping like a knight */}
            <g className="gsp-rays" style={d(delayMs)}>
              <g transform="translate(58 46)">
                {Array.from({ length: 10 }, (_, i) => (
                  <rect key={i} x={-1.2} y={-30} width={2.4} height={18} rx={1.2} fill={GOLD} transform={`rotate(${i * 36})`} opacity={0.85} />
                ))}
              </g>
            </g>
            <g className="gsp-loot" style={d(delayMs)}>
              <g transform="translate(58 44)"><QueenSil fill={GOLD} s={1.7} /></g>
            </g>
            {/* the borrowed knight-step orbits her */}
            <g className="gsp-pop" style={d(delayMs + 1850)}>
              <g transform="translate(74 34)"><KnightSil fill={CREAM} s={0.85} /></g>
              <path d="M70 42 q-5 6 -12 6" stroke={CREAM} strokeWidth={0.9} fill="none" strokeDasharray="2 1.6" />
            </g>
            <g className="gsp-star" style={d(delayMs + 2050)}><Star x={42} y={30} s={1.4} /></g>
            <g className="gsp-star" style={d(delayMs + 2200)}><Star x={72} y={26} s={1.2} /></g>
            <Payout x={58} y={62} delayMs={delayMs + 2150} n={4} />
            <Tag x={50} y={94} w={62} text="SHE RETURNS EMPOWERED: 6 TURNS" delayMs={delayMs + 2100} />
          </>
        )}
        {result === "backroom" && (
          <>
            {/* the back room door slides shut over her */}
            <g className="gsp-linger gsp-linger--long" style={d(delayMs)}>
              <rect x={60} y={28} width={26} height={38} rx={2} fill="#1a0d14" stroke={DEEP_RED} strokeWidth={1.6} />
              <text x={73} y={25} fontSize={3.8} fontWeight={700} fill={GREY} textAnchor="middle">BACK ROOM</text>
            </g>
            <g className="gsp-sweep" style={d(delayMs + 500)}>
              <g transform="translate(44 47)"><QueenSil fill={CREAM} s={1.4} /></g>
            </g>
            <g className="gsp-doorshut" style={d(delayMs + 900)}>
              <rect x={60} y={28} width={26} height={38} rx={2} fill="#30101c" stroke={DEEP_RED} strokeWidth={1.6} />
              <circle cx={64.6} cy={47} r={1.3} fill={GOLD_EDGE} />
            </g>
            <SadPuffs x={48} y={40} delayMs={delayMs + 2050} />
            <Tag x={50} y={94} w={66} text="THE HOUSE KEEPS HER FOR 2 TURNS" delayMs={delayMs + 2150} color={RED} />
          </>
        )}
        {result == null && (
          <>
            <g className="gsp-pop" style={d(delayMs + 800)}>
              <g transform="translate(58 46)"><QueenSil fill={CREAM} s={1.5} /></g>
            </g>
            <Tag x={50} y={94} w={44} text="THE FELT AWAITS" delayMs={delayMs + 1800} color={GREY} />
          </>
        )}
      </svg>
    </Wide>
  );
}

/* ------------------------------------------------------------------------- */
/* Registry                                                                   */
/* ------------------------------------------------------------------------- */

export const PLAYS: Record<string, SigPlugin> = {
  gm_penny_slots: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "slots" },
    Render: PennySlotsPlay,
  },
  gm_heads_or_tails: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coinflip" },
    Render: HeadsOrTailsPlay,
  },
  gm_claw_machine: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "gacha" },
    Render: ClawMachinePlay,
  },
  gm_raffle_ticket: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wheel" },
    Render: RaffleTicketPlay,
  },
  gm_card_counting: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "chips" },
    Render: CardCountingPlay,
  },
  gm_loaded_dice: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "dice" },
    Render: LoadedDicePlay,
  },
  gm_lootbox: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "gacha" },
    Render: LootboxPlay,
  },
  gm_three_card_monte: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "chips" },
    Render: ThreeCardMontePlay,
  },
  gm_underdog_parlay: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "chips" },
    Render: UnderdogParlayPlay,
  },
  gm_river_card: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "chips" },
    Render: RiverCardPlay,
  },
  gm_piece_roulette: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wheel" },
    Render: PieceRoulettePlay,
  },
  gm_jackpot_pawn: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "slots" },
    Render: JackpotPawnPlay,
  },
  gm_double_down_draft: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "chips" },
    Render: DoubleDownDraftPlay,
  },
  gm_crash_game: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crashrocket" },
    Render: CrashGamePlay,
  },
  gm_blood_wager: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" },
    Render: BloodWagerPlay,
  },
  gm_progressive_jackpot: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "chips" },
    Render: ProgressiveJackpotPlay,
  },
  gm_the_house: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "chips" },
    Render: TheHousePlay,
  },
  gm_gacha_banner: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "gacha" },
    Render: GachaBannerPlay,
  },
  gm_seven_cases: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "gacha" },
    Render: SevenCasesPlay,
  },
  gm_martingale: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "chips" },
    Render: MartingalePlay,
  },
  gm_devils_deck: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades" },
    Render: DevilsDeckPlay,
  },
  gm_break_the_bank: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "vault" },
    Render: BreakTheBankPlay,
  },
  gm_wheel_of_the_cosmos: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wheel" },
    Render: WheelOfTheCosmosPlay,
  },
  gm_cursed_dice: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "dice" },
    Render: CursedDicePlay,
  },
  gm_rigged_raffle: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wheel" },
    Render: RiggedRafflePlay,
  },
  gm_consolation_scratcher: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "bust" },
    Render: ConsolationScratcherPlay,
  },
  gm_hardship_jackpot: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "slots" },
    Render: HardshipJackpotPlay,
  },
  gm_the_last_bet: {
    config: { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "chips" },
    Render: TheLastBetPlay,
  },
};
