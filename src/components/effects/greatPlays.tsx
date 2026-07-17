// Tier 5-6 plugin signatures — the "great" band: every tier 5-6 card that was
// still riding the generated fallback gets a UNIQUE, name-matched play, one
// notch below the god-tier set (godPlays.tsx). See sigPlugins.tsx for the
// registry contract. Self-contained: own SVG, own CSS (greatPlays.css),
// transform/opacity only. Do NOT import from BoardEffects.tsx.
//
// Every play here is a staged SCENE (bigger than a badge/motif moment, smaller
// than a god manifestation): a distinct entity / object staged board-wide,
// ~1.4-2.0s, ONE shockwave, no letterboxing-scale drama. Owner size pass
// ("animations are too small in general"): the central figure of each scene
// now sits at ~26-31% of the 14x14 canvas ≈ ~45-55% of the visible board
// (the crop is the central ~57% of the canvas), supporting props scaled to
// match. Non-lead ("target") renders are compact per-square hits because
// zone-fed cards mount one overlay per affected square.
//
// THIRTEEN TEMPLATES, each parameterised by { palette, glyph }:
//   WitchCircle — a hexwitch's sigil circle settles flat and ignites, candles
//                 popping alight around it (the curse/hex pool)
//   StoneGaze   — a gorgon bust rises mid-board and rakes the crop with a
//                 petrifying gaze beam (the walnut/petrify pool)
//   ColdFront   — a jagged ice front sweeps the whole crop, frost stripes
//                 trailing behind it (the freeze pool)
//   SiegeRoll   — a siege engine rolls in from the wing, arm swings, payload
//                 arcs to a strike flash (bombs / demolitions / barrages)
//   WarBanner   — a great command banner slams in while shield ranks rise at
//                 its flanks (protection / musters / holds)
//   Grove       — a great tree bursts up mid-board, canopy unfurling, petals
//                 adrift (nature / roots / blooms)
//   PhantomParade — a spectral procession glides across behind a floating
//                 lantern (spirits / veils / phasings)
//   ClockSpire  — a clock tower rises and its great pendulum swings twice
//                 (tempo / stolen hours / lost days)
//   CardRite    — a colossal card is dealt down and its face resolves
//                 (drafts / fates / contracts / paperwork)
//   ThiefHand   — a shadow-gauntlet sweeps in and drags the glowing prize
//                 back off the board (steals / seizures / nullifies)
//   CrownForge  — the old kings' anvil rises, the hammer falls, and the
//                 work comes out glowing (promotions / reforgings)
//   RiftGate    — twin obelisks rise and an aurora pane stretches open
//                 between them (teleports / conjurings / mirrors)
//   BeastRush   — a horned beast charges the full crop, dust kicked up
//                 behind it (hunts / mounts / charges)
//
// The CARD -> TEMPLATE / PALETTE / GLYPH table lives in the PLAYS registry at
// the bottom of this file (116 entries, one per still-uncovered tier 5-6 card).

import "./greatPlays.css";

import type { ComponentType, CSSProperties, ReactNode } from "react";
import type { SigPlugin } from "./sigPlugins";

/* =============================================================================
   Shared bits
   ========================================================================== */

type Palette = [string, string, string];

interface TemplateProps {
  palette: Palette;
  glyph: ReactNode;
  lead: boolean;
  delayMs: number;
  /** Optional bespoke-flourish key for marquee cards (extra scene dressing
   * layered on the shared template; never changes the template's core beats). */
  flourish?: string;
}

/** hex "#rrggbb" -> rgba() at the given alpha (glow fills, gradients). */
function tint(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const SJ = { strokeLinejoin: "round", strokeLinecap: "round" } as const;

/** The oversized-clipped board-wide stage (the overlay mounts inside ONE
 * square; this canvas is ~14 squares wide — the board is the central ~57%). */
function Stage({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      <span className="absolute left-[-650%] top-[-650%] block h-[1400%] w-[1400%]">{children}</span>
    </span>
  );
}

/** Full-board colour wash. */
function Wash({ color, delayMs }: { color: string; delayMs: number }) {
  return <span className="grp-wash absolute inset-0 block" style={{ background: color, animationDelay: `${delayMs}ms` }} />;
}

/** THE shockwave ring — exactly one per play in this band. */
function Boom({ delayMs, color, thickness = 3 }: { delayMs: number; color: string; thickness?: number }) {
  return (
    <span
      className="grp-boom absolute block rounded-full"
      style={{
        left: "50%",
        top: "50%",
        height: "70%",
        width: "70%",
        marginLeft: "-35%",
        marginTop: "-35%",
        border: `${thickness}px solid ${color}`,
        animationDelay: `${delayMs}ms`,
      }}
    />
  );
}

/** Strike flare. */
function Flash({
  delayMs,
  color,
  left = 40,
  top = 44,
  w = 20,
  h = 13,
}: {
  delayMs: number;
  color: string;
  left?: number;
  top?: number;
  w?: number;
  h?: number;
}) {
  return (
    <span
      className="grp-flash absolute block rounded-full"
      style={{ left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%`, background: color, animationDelay: `${delayMs}ms` }}
    />
  );
}

/** A burst of flat diamond sparks flying out of the strike point. */
const BURST = [
  { dx: "210%", dy: "-240%", rot: "160deg", d: 0 },
  { dx: "-190%", dy: "-210%", rot: "-150deg", d: 14 },
  { dx: "240%", dy: "-80%", rot: "200deg", d: 8 },
  { dx: "-220%", dy: "-110%", rot: "-190deg", d: 22 },
  { dx: "40%", dy: "-290%", rot: "120deg", d: 5 },
  { dx: "120%", dy: "200%", rot: "220deg", d: 18 },
];
function Sparks({
  delayMs,
  fill,
  stroke,
  sizePct = 5.5,
  cx = 50,
  cy = 52,
}: {
  delayMs: number;
  fill: string;
  stroke: string;
  sizePct?: number;
  cx?: number;
  cy?: number;
}) {
  return (
    <>
      {BURST.map((v, i) => (
        <span
          key={i}
          className="grp-spark absolute block"
          style={
            {
              left: `${cx - sizePct / 2}%`,
              top: `${cy - sizePct / 2}%`,
              width: `${sizePct}%`,
              height: `${sizePct}%`,
              "--dx": v.dx,
              "--dy": v.dy,
              "--rot": v.rot,
              animationDelay: `${delayMs + v.d}ms`,
            } as CSSProperties
          }
        >
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0.6 L9 5 L5 9.4 L1 5 Z" fill={fill} stroke={stroke} strokeWidth="0.7" {...SJ} />
          </svg>
        </span>
      ))}
    </>
  );
}

/** Petals / motes / dust drifting down and away. */
const DRIFTS = [
  { l: 40, t: 34, dx: "60%", dy: "180%", rot: "160deg", d: 0 },
  { l: 56, t: 30, dx: "-50%", dy: "200%", rot: "-140deg", d: 90 },
  { l: 47, t: 26, dx: "90%", dy: "170%", rot: "200deg", d: 180 },
  { l: 62, t: 38, dx: "-70%", dy: "150%", rot: "-180deg", d: 45 },
  { l: 36, t: 42, dx: "40%", dy: "160%", rot: "120deg", d: 135 },
];
function Drifts({ delayMs, render, sizePct = 3.2 }: { delayMs: number; render: (i: number) => ReactNode; sizePct?: number }) {
  return (
    <>
      {DRIFTS.map((v, i) => (
        <span
          key={i}
          className="grp-drift absolute block"
          style={
            {
              left: `${v.l}%`,
              top: `${v.t}%`,
              width: `${sizePct}%`,
              height: `${sizePct}%`,
              "--dx": v.dx,
              "--dy": v.dy,
              "--rot": v.rot,
              animationDelay: `${delayMs + v.d}ms`,
            } as CSSProperties
          }
        >
          {render(i)}
        </span>
      ))}
    </>
  );
}

/** The brief aftermath glint. */
function Glint({
  delayMs,
  color,
  left = 47,
  top = 26,
  sizePct = 6,
}: {
  delayMs: number;
  color: string;
  left?: number;
  top?: number;
  sizePct?: number;
}) {
  return (
    <span
      className="grp-glint absolute block"
      style={{ left: `${left}%`, top: `${top}%`, width: `${sizePct}%`, height: `${sizePct}%`, animationDelay: `${delayMs}ms` }}
    >
      <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
        <path d="M5 0 L6.1 3.9 L10 5 L6.1 6.1 L5 10 L3.9 6.1 L0 5 L3.9 3.9 Z" fill={color} />
      </svg>
    </span>
  );
}

/* --- Tell beats (≤300ms anticipation, palette-themed) ----------------------- */

/** Gathering glow that contracts toward the spot where the scene will land. */
function TellGlow({
  delayMs,
  color,
  left = 38,
  top = 32,
  w = 24,
  h = 20,
}: {
  delayMs: number;
  color: string;
  left?: number;
  top?: number;
  w?: number;
  h?: number;
}) {
  return (
    <span
      className="grp-tellglow absolute block rounded-full"
      style={{ left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%`, background: color, animationDelay: `${delayMs}ms` }}
    />
  );
}

/** Ground shadow pooling where a mass is about to rise or land. */
function TellShadow({
  delayMs,
  color,
  left = 38,
  top = 60,
  w = 24,
  h = 6,
}: {
  delayMs: number;
  color: string;
  left?: number;
  top?: number;
  w?: number;
  h?: number;
}) {
  return (
    <span
      className="grp-tellshadow absolute block rounded-full"
      style={{ left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%`, background: color, animationDelay: `${delayMs}ms` }}
    />
  );
}

/** Four thin streaks converging on the gather point (drawn inward). */
const TELL_RAYS = [
  { l: 29, t: 30, dx: "150%", dy: "110%", rot: "34deg", d: 0 },
  { l: 64, t: 32, dx: "-160%", dy: "100%", rot: "-36deg", d: 40 },
  { l: 27, t: 58, dx: "170%", dy: "-90%", rot: "-30deg", d: 25 },
  { l: 66, t: 60, dx: "-170%", dy: "-100%", rot: "28deg", d: 55 },
];
function TellRays({ delayMs, color }: { delayMs: number; color: string }) {
  return (
    <>
      {TELL_RAYS.map((v, i) => (
        <span
          key={i}
          className="grp-tellray absolute block rounded-full"
          style={
            {
              left: `${v.l}%`,
              top: `${v.t}%`,
              width: "7%",
              height: "0.9%",
              background: color,
              rotate: v.rot,
              "--dx": v.dx,
              "--dy": v.dy,
              animationDelay: `${delayMs + v.d}ms`,
            } as CSSProperties
          }
        />
      ))}
    </>
  );
}

/* --- Settle tails (decaying dust / embers / afterglow) ----------------------- */

/** Soft afterglow left hanging where the strike landed, decaying. */
function Afterglow({
  delayMs,
  color,
  left = 36,
  top = 36,
  w = 28,
  h = 20,
}: {
  delayMs: number;
  color: string;
  left?: number;
  top?: number;
  w?: number;
  h?: number;
}) {
  return (
    <span
      className="grp-afterglow absolute block rounded-full"
      style={{ left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%`, background: color, animationDelay: `${delayMs}ms` }}
    />
  );
}

/** Decaying settle motes: dust falls (dir "fall"), embers rise (dir "rise"). */
const SETTLE = [
  { l: 42, t: 44, dx: "70%", dy: "150%", rot: "140deg", d: 0 },
  { l: 55, t: 40, dx: "-55%", dy: "180%", rot: "-120deg", d: 90 },
  { l: 47, t: 48, dx: "110%", dy: "130%", rot: "180deg", d: 170 },
  { l: 61, t: 46, dx: "-85%", dy: "160%", rot: "-160deg", d: 60 },
  { l: 38, t: 40, dx: "45%", dy: "170%", rot: "110deg", d: 230 },
  { l: 51, t: 36, dx: "-30%", dy: "140%", rot: "90deg", d: 140 },
];
function Settle({
  delayMs,
  dir,
  render,
  sizePct = 2.4,
}: {
  delayMs: number;
  dir: "fall" | "rise";
  render: (i: number) => ReactNode;
  sizePct?: number;
}) {
  const sign = dir === "rise" ? -1 : 1;
  return (
    <>
      {SETTLE.map((v, i) => (
        <span
          key={i}
          className="grp-settle absolute block"
          style={
            {
              left: `${v.l}%`,
              top: `${v.t}%`,
              width: `${sizePct}%`,
              height: `${sizePct}%`,
              "--dx": v.dx,
              "--dy": `${sign * parseFloat(v.dy)}%`,
              "--rot": v.rot,
              animationDelay: `${delayMs + v.d}ms`,
            } as CSSProperties
          }
        >
          {render(i)}
        </span>
      ))}
    </>
  );
}

/** Default settle mote: a soft round fleck in the given colour. */
function Mote({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <circle cx="5" cy="5" r="3.4" fill={color} />
    </svg>
  );
}

/** Tiny flat chessman silhouettes — the supporting actors of the per-card
 * flourishes (a hexed queen, a shackled pawn, a puppeted knight...). */
const CHESSMAN = {
  p: "M5 1.2 C6.2 1.2 7 2 7 3 C7 3.7 6.6 4.3 6 4.6 L7 8 H3 L4 4.6 C3.4 4.3 3 3.7 3 3 C3 2 3.8 1.2 5 1.2 Z M2.4 8.6 H7.6 V9.6 H2.4 Z",
  r: "M2.6 1.4 H3.8 V2.6 H4.6 V1.4 H5.4 V2.6 H6.2 V1.4 H7.4 V3.8 H6.8 L7.2 7.6 H2.8 L3.2 3.8 H2.6 Z M2.2 8.4 H7.8 V9.6 H2.2 Z",
  n: "M2.8 8.2 C2.8 5.4 3.8 4 5.4 3.2 L5 1.6 L6.4 2.6 L7.2 2.4 C7.9 3 8.1 4 7.7 4.9 L6.6 4.6 L6.2 4 C6.5 5.6 6.4 7 7 8.2 Z M2.4 8.8 H7.6 V9.8 H2.4 Z",
  b: "M5 1 C6.4 2 7 3.4 7 4.6 C7 5.8 6.2 6.6 5 6.6 C3.8 6.6 3 5.8 3 4.6 C3 3.4 3.6 2 5 1 Z M3.4 7.2 H6.6 L7.2 8.2 H2.8 Z M2.2 8.8 H7.8 V9.8 H2.2 Z",
  q: "M2.4 3.2 L3.4 5 L4.2 2.6 L5 4.6 L5.8 2.6 L6.6 5 L7.6 3.2 L7 7.4 H3 Z M2.6 8 H7.4 V9.2 H2.6 Z",
  k: "M4.6 1 H5.4 V2 H6.4 V2.8 H5.4 V3.8 H4.6 V2.8 H3.6 V2 H4.6 Z M3.4 4.4 H6.6 L7.2 8 H2.8 Z M2.4 8.6 H7.6 V9.8 H2.4 Z",
} as const;
function Man({ kind, fill, stroke }: { kind: keyof typeof CHESSMAN; fill: string; stroke: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d={CHESSMAN[kind]} fill={fill} stroke={stroke} strokeWidth="0.45" {...SJ} />
    </svg>
  );
}

/** Compact per-square hit for non-lead ("target") renders: glyph pop + a small
 * ring + three palette sparks. Zone-fed cards mount one per square, so this
 * must NOT be board-wide. */
const HIT_SPARKS = [
  { dx: "160%", dy: "-140%", rot: "140deg", d: 0 },
  { dx: "-150%", dy: "-110%", rot: "-160deg", d: 18 },
  { dx: "30%", dy: "180%", rot: "90deg", d: 36 },
];
function TargetHit({ palette, glyph, delayMs }: { palette: Palette; glyph: ReactNode; delayMs: number }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {/* tell: a gathering glow contracts onto the square before the hit */}
      <span
        className="grp-tellglow absolute block rounded-full"
        style={{ left: "22%", top: "22%", width: "56%", height: "56%", background: tint(p1, 0.4), animationDelay: `${delayMs}ms` }}
      />
      <span
        className="grp-flash absolute block rounded-full"
        style={{ left: "16%", top: "16%", width: "68%", height: "68%", background: tint(p1, 0.45), animationDelay: `${delayMs + 150}ms` }}
      />
      <span className="grp-pop absolute block" style={{ left: "18%", top: "16%", width: "64%", height: "64%", animationDelay: `${delayMs + 210}ms` }}>
        {glyph}
      </span>
      <span
        className="grp-tring absolute block rounded-full"
        style={{ left: "10%", top: "10%", width: "80%", height: "80%", border: `2px solid ${tint(p1, 0.9)}`, animationDelay: `${delayMs + 280}ms` }}
      />
      {HIT_SPARKS.map((v, i) => (
        <span
          key={i}
          className="grp-spark absolute block"
          style={
            {
              left: "40%",
              top: "40%",
              width: "20%",
              height: "20%",
              "--dx": v.dx,
              "--dy": v.dy,
              "--rot": v.rot,
              animationDelay: `${delayMs + 260 + v.d}ms`,
            } as CSSProperties
          }
        >
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0.6 L9 5 L5 9.4 L1 5 Z" fill={i === 1 ? p0 : p1} stroke={p2} strokeWidth="0.7" {...SJ} />
          </svg>
        </span>
      ))}
      {/* settle: two flecks sift off the square as the hit decays */}
      {[
        { l: 38, t: 42, dx: "-50%", dy: "120%", rot: "-110deg", d: 0 },
        { l: 56, t: 38, dx: "60%", dy: "140%", rot: "130deg", d: 90 },
      ].map((v, i) => (
        <span
          key={`s${i}`}
          className="grp-settle absolute block"
          style={
            {
              left: `${v.l}%`,
              top: `${v.t}%`,
              width: "12%",
              height: "12%",
              "--dx": v.dx,
              "--dy": v.dy,
              "--rot": v.rot,
              animationDelay: `${delayMs + 560 + v.d}ms`,
            } as CSSProperties
          }
        >
          <Mote color={tint(p1, 0.75)} />
        </span>
      ))}
    </span>
  );
}

/* =============================================================================
   Template 1: WitchCircle — a hexwitch's sigil circle settles flat over the
   board centre and ignites: rune rings, candles popping alight at the compass
   points, the card's glyph burning at its heart.
   ========================================================================== */
const CANDLES = [
  { l: 33, t: 30, d: 0 },
  { l: 64, t: 30, d: 80 },
  { l: 64, t: 60, d: 160 },
  { l: 33, t: 60, d: 240 },
];
function WitchCircle({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.26)} delayMs={delayMs} />
      {/* tell: stray hex-light gathers to the point the circle will claim */}
      <TellGlow delayMs={delayMs} color={tint(p1, 0.32)} left={40} top={36} w={20} h={18} />
      <TellRays delayMs={delayMs + 20} color={tint(p1, 0.8)} />
      {/* the sigil circle, settling flat out of the air */}
      <span className="grp-sigil absolute block" style={{ left: "27%", top: "24%", width: "46%", height: "46%", animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="17" fill="none" stroke={tint(p1, 0.9)} strokeWidth="1.2" />
          <circle cx="20" cy="20" r="13.4" fill="none" stroke={tint(p2, 0.65)} strokeWidth="0.6" strokeDasharray="2.2 1.6" />
          {/* the hex star scribed between the rings */}
          <path d="M20 4.6 L33.4 27.7 H6.6 Z" fill="none" stroke={tint(p1, 0.55)} strokeWidth="0.7" {...SJ} />
          <path d="M20 35.4 L6.6 12.3 H33.4 Z" fill="none" stroke={tint(p1, 0.55)} strokeWidth="0.7" {...SJ} />
          {/* rune ticks at the compass points */}
          <path d="M20 1.6 V3.8 M20 36.2 V38.4 M1.6 20 H3.8 M36.2 20 H38.4" stroke={tint(p2, 0.85)} strokeWidth="0.9" strokeLinecap="round" />
        </svg>
        {/* the card's glyph, burning at the circle's heart */}
        <span className="grp-facein absolute block" style={{ left: "34%", top: "34%", width: "32%", height: "32%", animationDelay: `${delayMs + 460}ms` }}>{glyph}</span>
      </span>
      {/* candles popping alight around the circle */}
      {CANDLES.map((c, i) => (
        <span key={i} className="grp-candle absolute block" style={{ left: `${c.l}%`, top: `${c.t}%`, width: "4.4%", height: "7.3%", animationDelay: `${delayMs + 320 + c.d}ms` }}>
          <svg viewBox="0 0 6 10" className="block h-full w-full" aria-hidden="true">
            <path d="M2.2 4.6 H3.8 V9.4 H2.2 Z" fill={tint(p2, 0.9)} />
            <path d="M3 0.6 C4.2 2 4.4 3 3 4.2 C1.6 3 1.8 2 3 0.6 Z" fill={p1} stroke={tint(p0, 0.8)} strokeWidth="0.4" {...SJ} />
          </svg>
        </span>
      ))}
      {/* ignition flare + hex sparks + the single curse-wave */}
      <Flash delayMs={delayMs + 720} color={tint(p1, 0.6)} left={42} top={41} w={16} h={11} />
      <Sparks delayMs={delayMs + 760} fill={p1} stroke={p2} cy={46} />
      <Boom delayMs={delayMs + 820} color={tint(p1, 0.85)} />
      <Glint delayMs={delayMs + 1150} color={p1} left={48} top={40} />
      {/* settle: candle-smoke embers lift off the guttering circle */}
      <Afterglow delayMs={delayMs + 960} color={tint(p1, 0.28)} left={38} top={34} w={24} h={22} />
      <Settle delayMs={delayMs + 1000} dir="rise" render={(i) => <Mote color={tint(i % 2 ? p1 : p2, 0.8)} />} />
    </Stage>
  );
}

/* =============================================================================
   Template 2: StoneGaze — a gorgon bust rises at the board's heart and rakes
   the crop with a petrifying gaze beam; stone chips spall off the victims.
   ========================================================================== */
function StoneGaze({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.26)} delayMs={delayMs} />
      {/* tell: the boards shadow over and grit shivers where the bust will breach */}
      <TellShadow delayMs={delayMs} color={tint(p2, 0.55)} left={37} top={62} w={26} h={7} />
      <TellGlow delayMs={delayMs + 40} color={tint(p1, 0.3)} left={41} top={30} w={18} h={16} />
      {/* the bust, grinding up out of the boards */}
      <span className="grp-rise absolute block" style={{ left: "36%", top: "20%", width: "28%", height: "50%", animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 24 40" className="block h-full w-full" aria-hidden="true">
          {/* serpent hair */}
          <path
            d="M8 8 C5 6 4 3.4 6 1.6 M12 7 C11 4 12 1.8 14.6 1 M16 8 C19 6 20 3.4 18 1.6"
            fill="none"
            stroke={tint(p1, 0.9)}
            strokeWidth="1.1"
            {...SJ}
          />
          <circle cx="6" cy="1.8" r="0.7" fill={p1} />
          <circle cx="14.8" cy="1.2" r="0.7" fill={p1} />
          <circle cx="18" cy="1.8" r="0.7" fill={p1} />
          {/* the stone face, eyes lit */}
          <path d="M7 20 L7.6 9.4 C7.6 6.4 16.4 6.4 16.4 9.4 L17 20 Z" fill={tint(p0, 0.92)} stroke={p2} strokeWidth="0.9" {...SJ} />
          <path d="M9.4 12.4 H11 M13 12.4 H14.6" stroke={p1} strokeWidth="1" strokeLinecap="round" />
          <path d="M10.6 16.6 H13.4" stroke={tint(p2, 0.7)} strokeWidth="0.6" strokeLinecap="round" />
          {/* shoulders + plinth */}
          <path d="M4 26 C6 21.5 18 21.5 20 26 L20.5 30 H3.5 Z" fill={tint(p0, 0.85)} stroke={p2} strokeWidth="0.9" {...SJ} />
          <path d="M2.5 30 H21.5 V39 H2.5 Z" fill={tint(p2, 0.85)} stroke={tint(p0, 0.8)} strokeWidth="0.7" {...SJ} />
        </svg>
        {/* the card's glyph, carved into the plinth */}
        <span className="grp-facein absolute block" style={{ left: "28%", top: "78%", width: "44%", height: "20%", animationDelay: `${delayMs + 420}ms` }}>{glyph}</span>
      </span>
      {/* the petrifying gaze, raking both wings of the crop */}
      <span
        className="grp-beam absolute block"
        style={{
          left: "20%",
          top: "35.5%",
          width: "24%",
          height: "3.6%",
          background: `linear-gradient(270deg, ${tint(p1, 0.9)}, transparent)`,
          transformOrigin: "100% 50%",
          animationDelay: `${delayMs + 520}ms`,
        }}
      />
      <span
        className="grp-beam absolute block"
        style={{
          left: "56%",
          top: "35.5%",
          width: "24%",
          height: "3.6%",
          background: `linear-gradient(90deg, ${tint(p1, 0.9)}, transparent)`,
          transformOrigin: "0% 50%",
          animationDelay: `${delayMs + 520}ms`,
        }}
      />
      {/* bespoke: Medusa's Verdict — the queen catches the gaze, stiffens, and
          crunches into a walnut while frost nips her guard */}
      {flourish === "medusa" && (
        <>
          <span className="grp-shiver absolute block" style={{ left: "25%", top: "29%", width: "7%", height: "15%", animationDelay: `${delayMs + 520}ms` }}>
            <svg viewBox="0 0 8 16" className="block h-full w-full" aria-hidden="true">
              <path d="M2 3.4 L1.4 1 L2.6 1.9 L3.4 0.6 L4.2 1.9 L5.4 1 L4.8 3.4 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
              <path d="M2.2 4 H4.6 L5.4 13 C5.4 14.4 1.4 14.4 1.4 13 Z" fill={tint(p0, 0.95)} stroke={p2} strokeWidth="0.5" {...SJ} />
            </svg>
          </span>
          <span className="grp-pop absolute block" style={{ left: "24.5%", top: "34%", width: "8%", height: "10%", animationDelay: `${delayMs + 880}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <ellipse cx="5" cy="5" rx="4" ry="4.4" fill="#c9b89a" stroke="#8a6a4a" strokeWidth="0.6" />
              <path d="M5 0.8 V9.2 M2.6 2.4 C2 3.8 2 6.2 2.6 7.6" fill="none" stroke="#8a6a4a" strokeWidth="0.45" />
            </svg>
          </span>
          {[
            { l: 21, t: 33, d: 0 },
            { l: 33, t: 36, d: 70 },
            { l: 27, t: 46, d: 140 },
          ].map((v, i) => (
            <span key={i} className="grp-glint absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "3%", height: "3%", animationDelay: `${delayMs + 960 + v.d}ms` }}>
              <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
                <path d="M5 0 L6.1 3.9 L10 5 L6.1 6.1 L5 10 L3.9 6.1 L0 5 L3.9 3.9 Z" fill="#9fd8ff" />
              </svg>
            </span>
          ))}
        </>
      )}
      {/* bespoke: Eternal Statue — a laurel wreath is lowered onto the bust and
          the gallery plaque catches the light: chosen once, still for an age */}
      {flourish === "statue" && (
        <>
          <span className="grp-drop absolute block" style={{ left: "41%", top: "15%", width: "18%", height: "9%", animationDelay: `${delayMs + 560}ms` }}>
            <svg viewBox="0 0 18 9" className="block h-full w-full" aria-hidden="true">
              <path d="M2 7 C4 3 14 3 16 7" fill="none" stroke="#7fae5a" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M4 5.2 L3 3.8 M6.5 4.2 L6 2.6 M9 4 L9 2.2 M11.5 4.2 L12 2.6 M14 5.2 L15 3.8" stroke="#7fae5a" strokeWidth="0.8" strokeLinecap="round" />
            </svg>
          </span>
          <span className="grp-hold absolute block" style={{ left: "42%", top: "58%", width: "16%", height: "4%", animationDelay: `${delayMs + 760}ms` }}>
            <svg viewBox="0 0 16 4" className="block h-full w-full" aria-hidden="true">
              <rect x="0.5" y="0.5" width="15" height="3" rx="0.8" fill={tint(p1, 0.35)} stroke={tint(p1, 0.9)} strokeWidth="0.4" />
              <path d="M2.5 2 H13.5" stroke={tint(p1, 0.9)} strokeWidth="0.5" strokeLinecap="round" />
            </svg>
          </span>
          <Glint delayMs={delayMs + 1300} color="#7fae5a" left={44} top={57} sizePct={4} />
        </>
      )}
      {/* spalling stone chips + the single stone-shock */}
      <Flash delayMs={delayMs + 680} color={tint(p1, 0.55)} left={41} top={50} w={18} h={11} />
      <Sparks delayMs={delayMs + 720} fill={tint(p0, 0.95)} stroke={p2} cy={54} />
      <Boom delayMs={delayMs + 780} color={tint(p1, 0.85)} />
      <Glint delayMs={delayMs + 1120} color={p1} left={48} top={30} />
      {/* settle: masonry dust sifts down off the fresh stone */}
      <Afterglow delayMs={delayMs + 920} color={tint(p0, 0.3)} left={38} top={38} w={24} h={20} />
      <Settle delayMs={delayMs + 980} dir="fall" render={(i) => <Mote color={tint(i % 2 ? p0 : p2, 0.7)} />} />
    </Stage>
  );
}

/* =============================================================================
   Template 3: ColdFront — a jagged ice front sweeps the whole crop left to
   right, frost stripes trailing behind it; the glyph rides the front as a
   frozen medallion.
   ========================================================================== */
const FROST_STRIPES = [
  { t: 32, d: 140 },
  { t: 47, d: 240 },
  { t: 62, d: 340 },
];
function ColdFront({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.26)} delayMs={delayMs} />
      {/* tell: the cold draft — a pale gleam gathers at the west wing */}
      <TellGlow delayMs={delayMs} color={tint(p1, 0.3)} left={24} top={36} w={18} h={20} />
      <TellRays delayMs={delayMs + 20} color={tint(p1, 0.75)} />
      {/* frost stripes glazing in behind the front */}
      {FROST_STRIPES.map((s, i) => (
        <span
          key={i}
          className="grp-beam absolute block"
          style={{
            left: "22%",
            top: `${s.t}%`,
            width: "56%",
            height: "6%",
            background: `linear-gradient(90deg, ${tint(p1, 0.5)}, ${tint(p0, 0.25)} 70%, transparent)`,
            transformOrigin: "0% 50%",
            animationDelay: `${delayMs + s.d}ms`,
          }}
        />
      ))}
      {/* the ice front itself: a wall of leaning icicles crossing the crop */}
      <span className="grp-sweep absolute block" style={{ left: "24%", top: "22%", width: "32%", height: "54%", animationDelay: `${delayMs + 100}ms` }}>
        <svg viewBox="0 0 26 44" className="block h-full w-full" aria-hidden="true">
          <path
            d="M4 44 L2 12 L7 20 L8 2 L13 16 L15 6 L19 18 L21 10 L24 24 L24 44 Z"
            fill={tint(p0, 0.6)}
            stroke={tint(p1, 0.9)}
            strokeWidth="1"
            {...SJ}
          />
          <path d="M8 10 L9 26 M15 14 L16 30 M21 18 L21 34" stroke={tint(p2, 0.6)} strokeWidth="0.6" fill="none" />
        </svg>
        {/* the card's glyph, frozen into the front as a medallion */}
        <span className="absolute block" style={{ left: "30%", top: "58%", width: "38%", height: "24%" }}>
          <svg viewBox="0 0 10 10" className="absolute inset-0 block h-full w-full" aria-hidden="true">
            <path d="M5 0.6 L9 5 L5 9.4 L1 5 Z" fill={tint(p1, 0.4)} stroke={tint(p2, 0.85)} strokeWidth="0.5" {...SJ} />
          </svg>
          <span className="absolute block" style={{ left: "18%", top: "18%", width: "64%", height: "64%" }}>{glyph}</span>
        </span>
      </span>
      {/* bespoke: The Big Chill — the glaze cracks apart behind the front and
          ONE shard shakes itself free early (the uneven thaw) */}
      {flourish === "bigchill" && (
        <>
          {[
            { l: 34, t: 40, rot: "-9deg", d: 0 },
            { l: 46, t: 52, rot: "6deg", d: 80 },
            { l: 40, t: 61, rot: "-4deg", d: 160 },
          ].map((v, i) => (
            <span key={i} className="absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "22%", height: "1.1%", rotate: v.rot }}>
              <span
                className="grp-beam absolute inset-0 block"
                style={{ background: `linear-gradient(90deg, ${tint(p1, 0.95)}, transparent)`, transformOrigin: "0% 50%", animationDelay: `${delayMs + 1080 + v.d}ms` }}
              />
            </span>
          ))}
          <span className="grp-bonk absolute block" style={{ left: "47%", top: "55%", width: "6%", height: "7%", animationDelay: `${delayMs + 1360}ms` }}>
            <svg viewBox="0 0 8 9" className="block h-full w-full" aria-hidden="true">
              <path d="M4 0.8 L7 4 L6 8.4 H2 L1 4 Z" fill={tint(p0, 0.85)} stroke={p2} strokeWidth="0.6" {...SJ} />
              <path d="M3 3 L4.6 5.4" stroke="#ffffff" strokeWidth="0.5" strokeLinecap="round" />
            </svg>
          </span>
        </>
      )}
      {/* bespoke: Total Freeze — every neighbour iced in the same instant: a
          ring of six ice blocks snaps shut around the heart of the board */}
      {flourish === "totalfreeze" && (
        <>
          {[
            { l: 47, t: 30 },
            { l: 59, t: 38 },
            { l: 59, t: 53 },
            { l: 47, t: 61 },
            { l: 35, t: 53 },
            { l: 35, t: 38 },
          ].map((v, i) => (
            <span key={i} className="grp-pop absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "6%", height: "6.5%", animationDelay: `${delayMs + 980}ms` }}>
              <svg viewBox="0 0 8 9" className="block h-full w-full" aria-hidden="true">
                <path d="M1 2.6 L4 0.8 L7 2.6 V6.4 L4 8.2 L1 6.4 Z" fill={tint(p0, 0.6)} stroke={tint(p2, 0.95)} strokeWidth="0.6" {...SJ} />
                <path d="M1.8 3.2 L3.4 4.8" stroke="#ffffff" strokeWidth="0.5" strokeLinecap="round" />
              </svg>
            </span>
          ))}
        </>
      )}
      {/* rime flare + ice sparks + the single glacial shock */}
      <Flash delayMs={delayMs + 900} color={tint(p1, 0.6)} left={44} top={42} w={17} h={12} />
      <Sparks delayMs={delayMs + 940} fill={p1} stroke={p2} cy={47} />
      <Boom delayMs={delayMs + 1000} color={tint(p1, 0.85)} />
      <Glint delayMs={delayMs + 1320} color={p1} left={52} top={34} />
      {/* settle: fine snow sifts down in the front's wake */}
      <Afterglow delayMs={delayMs + 1140} color={tint(p1, 0.26)} left={38} top={36} w={26} h={22} />
      <Settle delayMs={delayMs + 1180} dir="fall" sizePct={2} render={() => <Mote color={tint("#ffffff", 0.85)} />} />
    </Stage>
  );
}

/* =============================================================================
   Template 4: SiegeRoll — a siege engine rolls in from the left wing, its arm
   swings, and the payload arcs across to a strike flash on the far side.
   ========================================================================== */
function SiegeRoll({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  // Comic-timing: the party cannon holds its wind-up a beat before the punchline.
  const hold = flourish === "confetti" ? 200 : 0;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.24)} delayMs={delayMs} />
      {/* tell: the ground shadows under the incoming engine's track */}
      <TellShadow delayMs={delayMs} color={tint(p2, 0.55)} left={24} top={64} w={26} h={6} />
      <TellGlow delayMs={delayMs + 40} color={tint(p1, 0.28)} left={28} top={36} w={18} h={18} />
      {/* the engine, rolling in and braking */}
      <span className="grp-rollin absolute block" style={{ left: "24%", top: "30%", width: "28%", height: "38%", animationDelay: `${delayMs + 80}ms` }}>
        <svg viewBox="0 0 24 32" className="block h-full w-full" aria-hidden="true">
          {/* frame + wheels */}
          <path d="M3 26 L8 14 H16 L21 26 Z" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="1" {...SJ} />
          <circle cx="6.5" cy="28" r="3" fill={tint(p2, 0.9)} stroke={tint(p0, 0.8)} strokeWidth="0.8" />
          <circle cx="17.5" cy="28" r="3" fill={tint(p2, 0.9)} stroke={tint(p0, 0.8)} strokeWidth="0.8" />
          <path d="M6.5 26 V30 M4.5 28 H8.5 M17.5 26 V30 M15.5 28 H19.5" stroke={tint(p0, 0.8)} strokeWidth="0.5" />
          {/* crossbar the arm pivots on */}
          <circle cx="12" cy="15" r="1.2" fill={p1} stroke={p2} strokeWidth="0.5" />
        </svg>
        {/* the throwing arm, swinging over the pivot */}
        <span className="grp-swing absolute block" style={{ left: "38%", top: "-52%", width: "24%", height: "98%", transformOrigin: "50% 96%", animationDelay: `${delayMs + 460 + hold}ms` }}>
          <svg viewBox="0 0 8 32" className="block h-full w-full" aria-hidden="true">
            <path d="M3.4 31 L4.6 31 L5.4 3 H2.6 Z" fill={tint(p0, 0.95)} stroke={p2} strokeWidth="0.7" {...SJ} />
            <path d="M2 3.4 C2 0.8 6 0.8 6 3.4 C6 5.4 2 5.4 2 3.4 Z" fill="none" stroke={p2} strokeWidth="0.7" />
          </svg>
        </span>
        {/* the card's glyph, blazoned on the engine's side banner */}
        <span className="grp-facein absolute block" style={{ left: "32%", top: "48%", width: "36%", height: "34%", animationDelay: `${delayMs + 420}ms` }}>{glyph}</span>
      </span>
      {/* the payload, lobbed across the crop */}
      <span
        className="grp-arcshot absolute block"
        style={
          {
            left: "46%",
            top: "30%",
            width: "5.5%",
            height: "5.5%",
            "--dx": "420%",
            "--dy": "-170%",
            animationDelay: `${delayMs + 660 + hold}ms`,
          } as CSSProperties
        }
      >
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <circle cx="5" cy="5" r="4" fill={tint(p1, 0.95)} stroke={p2} strokeWidth="0.8" />
        </svg>
      </span>
      {/* bespoke: Confetti Cannon — the payload bursts into party squares */}
      {flourish === "confetti" && (
        <Settle
          delayMs={delayMs + 1120 + hold}
          dir="fall"
          sizePct={2.2}
          render={(i) => (
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <rect x="2" y="2" width="6" height="6" fill={["#4fe3ff", "#ff4fa3", "#ffcf4d", "#a8e07f", "#c9b0e8", "#ff9d3d"][i]} transform="rotate(18 5 5)" />
            </svg>
          )}
        />
      )}
      {/* strike flash on the far wing + debris + the single concussion */}
      <Flash delayMs={delayMs + 1000 + hold} color={tint(p1, 0.8)} left={60} top={37} w={18} h={13} />
      <Sparks delayMs={delayMs + 1040 + hold} fill={p1} stroke={p2} sizePct={6.5} cx={68} cy={42} />
      <Boom delayMs={delayMs + 1080 + hold} color={tint(p1, 0.85)} thickness={4} />
      <Glint delayMs={delayMs + 1360 + hold} color={p1} left={67} top={33} sizePct={7} />
      {/* settle: powder smoke drifts down off the impact */}
      <Afterglow delayMs={delayMs + 1200 + hold} color={tint(p1, 0.28)} left={56} top={32} w={22} h={18} />
      {flourish !== "confetti" && (
        <Settle delayMs={delayMs + 1240 + hold} dir="fall" render={(i) => <Mote color={tint(i % 2 ? p2 : p1, 0.65)} />} />
      )}
    </Stage>
  );
}

/* =============================================================================
   Template 5: WarBanner — a great command banner slams in mid-board while two
   shield-wall ranks rise at its flanks; a rally flare rolls out.
   ========================================================================== */
function WarBanner({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.24)} delayMs={delayMs} />
      {/* tell: the standard's shadow falls on the muster ground first */}
      <TellShadow delayMs={delayMs} color={tint(p2, 0.55)} left={39} top={66} w={22} h={6} />
      <TellGlow delayMs={delayMs + 40} color={tint(p1, 0.3)} left={40} top={26} w={20} h={18} />
      {/* the flanking shield ranks, rising */}
      {[24, 61].map((l, i) => (
        <span key={i} className="grp-rise absolute block" style={{ left: `${l}%`, top: "46%", width: "15%", height: "20%", animationDelay: `${delayMs + 260 + i * 90}ms` }}>
          <svg viewBox="0 0 24 12" className="block h-full w-full" aria-hidden="true">
            <path
              d="M2 11 V4 C2 2 4 1 6 1 C8 1 10 2 10 4 V11 Z M12 11 V4 C12 2 14 1 16 1 C18 1 20 2 20 4 V11 Z"
              fill={tint(p0, 0.9)}
              stroke={p2}
              strokeWidth="0.8"
              {...SJ}
            />
            <path d="M6 3 V9 M16 3 V9" stroke={tint(p1, 0.8)} strokeWidth="0.7" strokeLinecap="round" />
          </svg>
        </span>
      ))}
      {/* the great banner, slamming in */}
      <span className="grp-drop absolute block" style={{ left: "40%", top: "17%", width: "20%", height: "54%", animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 16 44" className="block h-full w-full" aria-hidden="true">
          <path d="M8 44 V1.6" stroke={p2} strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="8" cy="1.6" r="1.1" fill={p1} />
          <path d="M2 4 H14 V22 L8 26 L2 22 Z" fill={tint(p1, 0.9)} stroke={p2} strokeWidth="0.9" {...SJ} />
          <path d="M3.4 6 V20 M12.6 6 V20" stroke={tint(p2, 0.45)} strokeWidth="0.5" fill="none" />
        </svg>
        {/* the card's glyph, borne on the cloth */}
        <span className="grp-facein absolute block" style={{ left: "22%", top: "18%", width: "56%", height: "28%", animationDelay: `${delayMs + 520}ms` }}>{glyph}</span>
      </span>
      {/* the rally: flare + sparks + the single ward-wave */}
      <Flash delayMs={delayMs + 760} color={tint(p1, 0.65)} left={42} top={44} w={16} h={12} />
      <Sparks delayMs={delayMs + 800} fill={p1} stroke={p2} cy={49} />
      <Boom delayMs={delayMs + 860} color={tint(p1, 0.85)} />
      <Glint delayMs={delayMs + 1180} color={p1} left={49} top={24} />
      {/* settle: pennant threads and rally-light sift down over the ranks */}
      <Afterglow delayMs={delayMs + 1000} color={tint(p1, 0.26)} left={38} top={34} w={24} h={22} />
      <Settle delayMs={delayMs + 1040} dir="fall" render={(i) => <Mote color={tint(i % 2 ? p1 : p0, 0.7)} />} />
    </Stage>
  );
}

/* =============================================================================
   Template 6: Grove — a great tree bursts up through the board's heart, its
   canopy unfurling while petals drift down; the glyph glows in a trunk knot.
   ========================================================================== */
function Grove({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.24)} delayMs={delayMs} />
      {/* tell: the soil bulges and green light seeps up before the trunk breaches */}
      <TellShadow delayMs={delayMs} color={tint(p2, 0.5)} left={37} top={64} w={26} h={7} />
      <TellGlow delayMs={delayMs + 40} color={tint(p1, 0.3)} left={40} top={44} w={20} h={18} />
      {/* the great tree, heaving up */}
      <span className="grp-rise absolute block" style={{ left: "31%", top: "18%", width: "38%", height: "54%", animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 34 44" className="block h-full w-full" aria-hidden="true">
          {/* canopy */}
          <path
            d="M6 18 C1 16 2 9 7 8 C7 3 15 1 17 5 C19 1 27 3 27 8 C32 9 33 16 28 18 C30 21 26 24 22 23 H12 C8 24 4 21 6 18 Z"
            fill={tint(p1, 0.85)}
            stroke={tint(p2, 0.8)}
            strokeWidth="0.9"
            {...SJ}
          />
          {/* trunk + roots gripping the boards */}
          <path d="M14 23 C14.5 30 14 34 12 40 L10 44 H24 L22 40 C20 34 19.5 30 20 23 Z" fill={tint(p0, 0.92)} stroke={p2} strokeWidth="0.9" {...SJ} />
          <path d="M12 41 C9 41.5 7 42.5 5.5 44 M22 41 C25 41.5 27 42.5 28.5 44" fill="none" stroke={tint(p0, 0.9)} strokeWidth="1.4" strokeLinecap="round" />
          {/* the knot that seats the glyph */}
          <ellipse cx="17" cy="30" rx="4.2" ry="4.8" fill={tint(p2, 0.5)} stroke={tint(p0, 0.8)} strokeWidth="0.6" />
        </svg>
        {/* the card's glyph, aglow in the knot */}
        <span className="grp-facein absolute block" style={{ left: "38%", top: "58%", width: "24%", height: "20%", animationDelay: `${delayMs + 520}ms` }}>{glyph}</span>
      </span>
      {/* petals adrift */}
      <Drifts
        delayMs={delayMs + 480}
        sizePct={4}
        render={() => (
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 1 C8 2.4 8 6 5 9 C2 6 2 2.4 5 1 Z" fill={tint(p1, 0.9)} stroke={tint(p2, 0.6)} strokeWidth="0.4" {...SJ} />
          </svg>
        )}
      />
      {/* root-strike flare + the single verdant wave */}
      <Flash delayMs={delayMs + 700} color={tint(p1, 0.55)} left={42} top={52} w={16} h={11} />
      <Sparks delayMs={delayMs + 740} fill={p1} stroke={p2} cy={56} />
      <Boom delayMs={delayMs + 800} color={tint(p1, 0.85)} />
      <Glint delayMs={delayMs + 1130} color={p1} left={49} top={24} />
      {/* settle: pollen motes hang and sink in the canopy's shade */}
      <Afterglow delayMs={delayMs + 940} color={tint(p1, 0.26)} left={36} top={30} w={28} h={22} />
      <Settle delayMs={delayMs + 980} dir="fall" sizePct={2} render={(i) => <Mote color={tint(i % 2 ? p1 : "#ffe9b0", 0.75)} />} />
    </Stage>
  );
}

/* =============================================================================
   Template 7: PhantomParade — a spectral procession glides across the crop
   behind a floating lantern that carries the card's glyph.
   ========================================================================== */
const GHOSTS = [
  { l: 26, t: 32, w: 12, d: 140 },
  { l: 40, t: 27, w: 14, d: 0 },
  { l: 58, t: 33, w: 12, d: 220 },
];
function PhantomParade({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.24)} delayMs={delayMs} />
      {/* tell: a graveside chill gathers where the parade will pass */}
      <TellGlow delayMs={delayMs} color={tint(p1, 0.26)} left={30} top={32} w={22} h={22} />
      <TellRays delayMs={delayMs + 20} color={tint(p1, 0.6)} />
      {/* the procession, gliding through */}
      {GHOSTS.map((g, i) => (
        <span key={i} className="grp-sweep absolute block" style={{ left: `${g.l}%`, top: `${g.t}%`, width: `${g.w}%`, height: `${g.w * 2.4}%`, animationDelay: `${delayMs + g.d}ms` }}>
          <svg viewBox="0 0 12 28" className="block h-full w-full" aria-hidden="true">
            <path
              d="M6 1 C9.4 1 11 4 11 8 L11 22 L9 20 L7.5 24 L6 21 L4.5 24 L3 20 L1 22 L1 8 C1 4 2.6 1 6 1 Z"
              fill={tint(p1, 0.55)}
              stroke={tint(p2, 0.75)}
              strokeWidth="0.7"
              {...SJ}
            />
            <path d="M4.2 7 H5.4 M6.6 7 H7.8" stroke={tint(p0, 0.9)} strokeWidth="0.8" strokeLinecap="round" />
          </svg>
        </span>
      ))}
      {/* the leading lantern, the glyph shining inside it */}
      <span className="grp-sweep absolute block" style={{ left: "66%", top: "26%", width: "10%", height: "22%", animationDelay: `${delayMs + 60}ms` }}>
        <svg viewBox="0 0 12 26" className="block h-full w-full" aria-hidden="true">
          <path d="M6 0.6 V4" stroke={tint(p2, 0.9)} strokeWidth="0.8" strokeLinecap="round" />
          <path d="M3 4.6 H9 L10 9 V19 L9 23 H3 L2 19 V9 Z" fill={tint(p1, 0.35)} stroke={tint(p2, 0.9)} strokeWidth="0.8" {...SJ} />
          <path d="M4 24 H8" stroke={tint(p2, 0.9)} strokeWidth="0.8" strokeLinecap="round" />
        </svg>
        <span className="absolute block" style={{ left: "22%", top: "34%", width: "56%", height: "40%" }}>{glyph}</span>
      </span>
      {/* veil shimmer laid along the procession's path */}
      <span
        className="grp-beam absolute block"
        style={{
          left: "24%",
          top: "52%",
          width: "52%",
          height: "4%",
          background: `linear-gradient(90deg, transparent, ${tint(p1, 0.45)} 40%, transparent)`,
          transformOrigin: "0% 50%",
          animationDelay: `${delayMs + 420}ms`,
        }}
      />
      {/* passing flare + pale sparks + the single spirit-wave */}
      <Flash delayMs={delayMs + 880} color={tint(p1, 0.5)} left={44} top={40} w={15} h={11} />
      <Sparks delayMs={delayMs + 920} fill={p1} stroke={p2} cy={45} />
      <Boom delayMs={delayMs + 980} color={tint(p1, 0.8)} />
      <Glint delayMs={delayMs + 1290} color={p1} left={57} top={30} />
      {/* settle: lantern-light wisps rise off the parade's wake */}
      <Afterglow delayMs={delayMs + 1120} color={tint(p1, 0.24)} left={36} top={32} w={28} h={22} />
      <Settle delayMs={delayMs + 1160} dir="rise" sizePct={2} render={(i) => <Mote color={tint(i % 2 ? p1 : p0, 0.7)} />} />
    </Stage>
  );
}

/* =============================================================================
   Template 8: ClockSpire — a clock tower rises mid-board, its great pendulum
   swinging twice beneath the face; a time-ring pulse rolls out.
   ========================================================================== */
function ClockSpire({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.24)} delayMs={delayMs} />
      {/* tell: the tower's shadow stretches over the square before it rises */}
      <TellShadow delayMs={delayMs} color={tint(p2, 0.55)} left={40} top={64} w={20} h={6} />
      <TellGlow delayMs={delayMs + 40} color={tint(p1, 0.3)} left={42} top={24} w={16} h={16} />
      {/* the spire, rising */}
      <span className="grp-rise absolute block" style={{ left: "41%", top: "18%", width: "18%", height: "50%", animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 18 50" className="block h-full w-full" aria-hidden="true">
          {/* peaked roof + body */}
          <path d="M9 0.8 L15.4 9 H2.6 Z" fill={tint(p0, 0.92)} stroke={p2} strokeWidth="0.9" {...SJ} />
          <path d="M4 9 H14 L15 49 H3 Z" fill={tint(p0, 0.88)} stroke={p2} strokeWidth="1" {...SJ} />
          <path d="M6 30 H12 M6.5 38 H11.5" stroke={tint(p2, 0.5)} strokeWidth="0.6" />
          {/* the clock face */}
          <circle cx="9" cy="17" r="5.6" fill={tint(p1, 0.25)} stroke={p1} strokeWidth="1.1" />
          <path d="M9 12.4 V13.8 M9 20.2 V21.6 M4.4 17 H5.8 M12.2 17 H13.6" stroke={tint(p1, 0.9)} strokeWidth="0.7" strokeLinecap="round" />
          <path d="M9 17 L9 13.6 M9 17 L11.6 18.4" stroke={p2} strokeWidth="1" strokeLinecap="round" />
        </svg>
        {/* the great pendulum — for Time Stop it seizes DEAD mid-swing and
            hangs there, held for the length of a stolen breath */}
        <span
          className={`${flourish === "timestop" ? "grp-halt" : "grp-pendulum"} absolute block`}
          style={{ left: "42%", top: "50%", width: "16%", height: "44%", transformOrigin: "50% 0%", animationDelay: `${delayMs + 480}ms` }}
        >
          <svg viewBox="0 0 6 20" className="block h-full w-full" aria-hidden="true">
            <path d="M3 0.4 V13" stroke={tint(p2, 0.9)} strokeWidth="0.9" strokeLinecap="round" />
            <circle cx="3" cy="16" r="2.6" fill={tint(p1, 0.9)} stroke={p2} strokeWidth="0.6" />
          </svg>
        </span>
        {/* bespoke: Time Rewind — a great hand spins BACKWARDS over the face */}
        {flourish === "rewind" && (
          <span className="grp-spinback absolute block" style={{ left: "38%", top: "23%", width: "24%", height: "8.6%", animationDelay: `${delayMs + 560}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 5 L5 1.4" stroke={tint(p1, 0.95)} strokeWidth="1" strokeLinecap="round" />
              <circle cx="5" cy="5" r="0.8" fill={p1} />
            </svg>
          </span>
        )}
        {/* the card's glyph, mounted over the door */}
        <span className="grp-facein absolute block" style={{ left: "28%", top: "56%", width: "44%", height: "16%", animationDelay: `${delayMs + 560}ms` }}>{glyph}</span>
      </span>
      {/* bespoke: Time Stop — the world hushes deep blue while the pendulum
          hangs; the single resuming TICK glints only after the held beat */}
      {flourish === "timestop" && (
        <>
          <Wash color={tint(p2, 0.4)} delayMs={delayMs + 780} />
          <span
            className="grp-hold absolute block rounded-full"
            style={{ left: "44.4%", top: "24.4%", width: "11.2%", height: "5.6%", border: `2px solid ${tint(p1, 0.9)}`, animationDelay: `${delayMs + 700}ms` }}
          />
          <Glint delayMs={delayMs + 1500} color={p1} left={48} top={25} sizePct={5} />
        </>
      )}
      {/* bespoke: Time Rewind — the hours stream back the way they came */}
      {flourish === "rewind" && (
        <>
          {[36, 52].map((t, i) => (
            <span
              key={i}
              className="grp-beam absolute block"
              style={{
                left: "24%",
                top: `${t}%`,
                width: "52%",
                height: "3.4%",
                background: `linear-gradient(270deg, ${tint(p1, 0.8)}, transparent)`,
                transformOrigin: "100% 50%",
                animationDelay: `${delayMs + 700 + i * 110}ms`,
              }}
            />
          ))}
        </>
      )}
      {/* the toll: flare + sparks + the single time-ring */}
      <Flash delayMs={delayMs + 900} color={tint(p1, 0.6)} left={43} top={32} w={14} h={11} />
      <Sparks delayMs={delayMs + 940} fill={p1} stroke={p2} cy={38} />
      <Boom delayMs={delayMs + 1000} color={tint(p1, 0.85)} />
      <Glint delayMs={delayMs + 1320} color={p1} left={49} top={18} />
      {/* settle: loosed clock-dust — for Rewind it climbs back UP the hour */}
      <Afterglow delayMs={delayMs + 1140} color={tint(p1, 0.24)} left={40} top={26} w={20} h={20} />
      <Settle delayMs={delayMs + 1180} dir={flourish === "rewind" ? "rise" : "fall"} sizePct={2} render={(i) => <Mote color={tint(i % 2 ? p1 : p2, 0.7)} />} />
    </Stage>
  );
}

/* =============================================================================
   Template 9: CardRite — a colossal card is dealt down over the board and its
   face resolves into the play; sparks scatter off the deal.
   ========================================================================== */
function CardRite({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.24)} delayMs={delayMs} />
      {/* tell: the card's shadow grows on the boards as it falls */}
      <TellShadow delayMs={delayMs} color={tint(p2, 0.55)} left={40} top={44} w={20} h={22} />
      <TellGlow delayMs={delayMs + 40} color={tint(p1, 0.28)} left={42} top={30} w={16} h={16} />
      {/* the great card, dealt down */}
      <span className="grp-drop absolute block" style={{ left: "39%", top: "24%", width: "22%", height: "46%", animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 22 46" className="block h-full w-full" aria-hidden="true">
          <rect x="1" y="1" width="20" height="44" rx="2.4" fill={tint(p0, 0.92)} stroke={p1} strokeWidth="1.1" />
          <rect x="3.4" y="3.6" width="15.2" height="38.8" rx="1.4" fill="none" stroke={tint(p1, 0.55)} strokeWidth="0.6" />
          {/* corner pips */}
          <path d="M5.4 6.2 L6.4 8.6 L5.4 11 L4.4 8.6 Z M16.6 34.6 L17.6 37 L16.6 39.4 L15.6 37 Z" fill={tint(p1, 0.9)} />
        </svg>
        {/* the face, resolving (Death keeps its face hidden — see below) */}
        {flourish !== "death" && (
          <span className="grp-facein absolute block" style={{ left: "26%", top: "32%", width: "48%", height: "24%", animationDelay: `${delayMs + 560}ms` }}>{glyph}</span>
        )}
      </span>
      {/* bespoke: The Death Arcana — the thirteenth card lands FACE DOWN,
          holds the beat, then flips up to name its mark (staged outside the
          dealt card so the reveal outlives the deal itself) */}
      {flourish === "death" && (
        <>
          <span className="grp-hold absolute block" style={{ left: "43%", top: "29.5%", width: "14%", height: "35%", animationDelay: `${delayMs + 480}ms` }}>
            <svg viewBox="0 0 14 34" className="block h-full w-full" aria-hidden="true">
              <rect x="0.6" y="0.6" width="12.8" height="32.8" rx="1.2" fill={tint(p2, 0.95)} stroke={tint(p1, 0.7)} strokeWidth="0.5" />
              <path d="M3 8 L11 26 M11 8 L3 26" stroke={tint(p1, 0.5)} strokeWidth="0.5" />
              <path d="M5 15.4 V18.6 M7 15.4 V18.6 M9 15.4 V18.6" stroke={tint(p1, 0.9)} strokeWidth="0.6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="grp-flip absolute block" style={{ left: "44.5%", top: "37%", width: "11.5%", height: "14%", animationDelay: `${delayMs + 1160}ms` }}>{glyph}</span>
        </>
      )}
      {/* bespoke: The Tower — a bolt splits the card's own tower, which breaks
          at the crown and topples off the face */}
      {flourish === "tower" && (
        <span className="grp-topple absolute block" style={{ left: "45.5%", top: "33%", width: "9%", height: "16%", transformOrigin: "82% 96%", animationDelay: `${delayMs + 880}ms` }}>
          <svg viewBox="0 0 10 16" className="block h-full w-full" aria-hidden="true">
            <path d="M3 15.4 L3.4 5 H3 V2.6 H4.2 V3.6 H5.8 V2.6 H7 V5 H6.6 L7 15.4 Z" fill={tint(p0, 0.95)} stroke="#c94a3a" strokeWidth="0.5" {...SJ} />
            <path d="M4 7 L6 9 M6 7.4 L4.2 9.6" stroke="#c94a3a" strokeWidth="0.4" strokeLinecap="round" />
          </svg>
        </span>
      )}
      {/* bespoke: Sever — the contract is cut: a shear-line flashes across the
          card and its severed halves spring apart */}
      {flourish === "sever" && (
        <>
          <span className="absolute block" style={{ left: "36%", top: "42%", width: "28%", height: "1.4%", rotate: "-22deg" }}>
            <span
              className="grp-beam absolute inset-0 block"
              style={{ background: `linear-gradient(90deg, transparent, ${tint(p1, 0.95)} 30%, ${tint(p1, 0.95)} 70%, transparent)`, transformOrigin: "0% 50%", animationDelay: `${delayMs + 760}ms` }}
            />
          </span>
          {(["l", "r"] as const).map((side) => (
            <span
              key={side}
              className={`grp-split-${side} absolute block`}
              style={{ left: side === "l" ? "40%" : "50.5%", top: "26%", width: "9.5%", height: "42%", animationDelay: `${delayMs + 860}ms` }}
            >
              <svg viewBox="0 0 10 44" className="block h-full w-full" aria-hidden="true">
                <path
                  d={side === "l" ? "M2 1 H10 L10 43 H2 C1 43 0.6 42 0.6 41 V3 C0.6 2 1 1 2 1 Z" : "M0 1 H8 C9 1 9.4 2 9.4 3 V41 C9.4 42 9 43 8 43 H0 Z"}
                  fill={tint(p0, 0.7)}
                  stroke={tint(p1, 0.85)}
                  strokeWidth="0.7"
                  {...SJ}
                />
              </svg>
            </span>
          ))}
        </>
      )}
      {/* bespoke: The Tower — the bolt itself, hammering the card from above */}
      {flourish === "tower" && (
        <span className="grp-bolt absolute block" style={{ left: "45%", top: "10%", width: "10%", height: "18%", animationDelay: `${delayMs + 700}ms` }}>
          <svg viewBox="0 0 10 18" className="block h-full w-full" aria-hidden="true">
            <path d="M6.4 0.6 L3 8 H5.2 L2.6 15 L8.4 6.6 H5.8 L8 0.6 Z" fill="#ffd166" stroke="#c94a3a" strokeWidth="0.6" {...SJ} />
          </svg>
        </span>
      )}
      {/* the deal lands: flare + sparks + the single fate-wave */}
      <Flash delayMs={delayMs + 780} color={tint(p1, 0.6)} left={42} top={44} w={16} h={12} />
      <Sparks delayMs={delayMs + 820} fill={p1} stroke={p2} cy={49} />
      <Boom delayMs={delayMs + 880} color={tint(p1, 0.85)} />
      <Glint delayMs={delayMs + 1200} color={p1} left={54} top={27} />
      {/* settle: paper-fate flecks drift off the deal — Death's rise as souls */}
      <Afterglow delayMs={delayMs + 1020} color={tint(p1, 0.24)} left={40} top={32} w={20} h={22} />
      <Settle
        delayMs={delayMs + 1060}
        dir={flourish === "death" ? "rise" : "fall"}
        sizePct={2}
        render={(i) => <Mote color={tint(i % 2 ? p1 : p0, 0.7)} />}
      />
    </Stage>
  );
}

/* =============================================================================
   Template 10: ThiefHand — the prize gleams at mid-board, then a shadow
   gauntlet sweeps in from the right wing and drags it off the board.
   ========================================================================== */
function ThiefHand({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p2, 0.32)} delayMs={delayMs} />
      {/* tell: the prize glimmers awake while a shadow creeps in from the wing */}
      <TellGlow delayMs={delayMs} color={tint(p1, 0.35)} left={40} top={34} w={16} h={16} />
      <TellShadow delayMs={delayMs + 60} color={tint(p2, 0.7)} left={58} top={40} w={24} h={12} />
      {/* the prize, gleaming where it sits */}
      <span className="grp-facein absolute block" style={{ left: "42%", top: "36%", width: "12%", height: "20%", animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 12 20" className="absolute inset-0 block h-full w-full" aria-hidden="true">
          <circle cx="6" cy="10" r="5.4" fill={tint(p1, 0.3)} stroke={tint(p1, 0.9)} strokeWidth="0.8" />
        </svg>
        <span className="absolute block" style={{ left: "22%", top: "33%", width: "56%", height: "34%" }}>{glyph}</span>
      </span>
      {/* the shadow gauntlet, in and out with the goods */}
      <span className="grp-grab absolute block" style={{ left: "48%", top: "32%", width: "30%", height: "26%", animationDelay: `${delayMs + 420}ms` }}>
        <svg viewBox="0 0 32 26" className="block h-full w-full" aria-hidden="true">
          {/* trailing arm, off the right edge */}
          <path d="M14 10 C20 7 26 7 32 9 L32 19 C26 21 20 20 14 18 Z" fill={tint(p2, 0.92)} stroke={tint(p0, 0.8)} strokeWidth="0.8" {...SJ} />
          {/* the closing fingers */}
          <path
            d="M14 9 C9 7 5 8 3 11 C5 11.4 6.4 12 7.4 13 C4.6 13 3 14 2 16 C4.4 16.2 6 16.8 7.4 18 C9.6 19.8 12 19.4 14 18"
            fill={tint(p2, 0.95)}
            stroke={tint(p0, 0.85)}
            strokeWidth="0.8"
            {...SJ}
          />
          <path d="M8 11.4 C9.6 11 11.2 11 12.6 11.6 M8.4 15.8 C10 16 11.6 16 13 15.6" stroke={tint(p1, 0.5)} strokeWidth="0.5" fill="none" />
        </svg>
      </span>
      {/* wisps peeled off the snatch */}
      <Drifts
        delayMs={delayMs + 620}
        sizePct={2.6}
        render={() => (
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <circle cx="5" cy="5" r="3.4" fill={tint(p1, 0.7)} />
          </svg>
        )}
      />
      {/* the snap of the theft: flare + sparks + the single dark wave */}
      <Flash delayMs={delayMs + 820} color={tint(p1, 0.55)} left={42} top={38} w={15} h={11} />
      <Sparks delayMs={delayMs + 860} fill={p1} stroke={p0} cy={44} />
      <Boom delayMs={delayMs + 920} color={tint(p1, 0.8)} />
      <Glint delayMs={delayMs + 1230} color={p1} left={47} top={36} />
      {/* settle: shadow-smoke curls up where the prize used to sit */}
      <Afterglow delayMs={delayMs + 1060} color={tint(p1, 0.22)} left={38} top={32} w={22} h={20} />
      <Settle delayMs={delayMs + 1100} dir="rise" sizePct={2} render={(i) => <Mote color={tint(i % 2 ? p1 : p2, 0.7)} />} />
    </Stage>
  );
}

/* =============================================================================
   Template 11: CrownForge — the old kings' anvil rises mid-board, the hammer
   falls in a fan of sparks, and the finished work comes out glowing.
   ========================================================================== */
function CrownForge({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.24)} delayMs={delayMs} />
      {/* tell: forge-heat pools under the boards before the anvil breaches */}
      <TellShadow delayMs={delayMs} color={tint(p2, 0.55)} left={38} top={62} w={24} h={7} />
      <TellGlow delayMs={delayMs + 40} color={tint(p1, 0.35)} left={40} top={44} w={20} h={16} />
      {/* the anvil, grinding up */}
      <span className="grp-rise absolute block" style={{ left: "38%", top: "42%", width: "24%", height: "24%", animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
          <path d="M2 6 H19 C21.4 6 23 7.4 23 9 C20 10.6 17 10.6 15 9.6 L15.5 13 H8.5 L9 9.6 C7 11 4.6 11.4 2 10 Z" fill={tint(p2, 0.95)} stroke={tint(p0, 0.85)} strokeWidth="0.9" {...SJ} />
          <path d="M7 13 H17 L19 19 H5 Z M4 19 H20 V22.6 H4 Z" fill={tint(p2, 0.9)} stroke={tint(p0, 0.85)} strokeWidth="0.8" {...SJ} />
          <path d="M4 7.6 H12" stroke={tint(p1, 0.5)} strokeWidth="0.6" strokeLinecap="round" />
        </svg>
      </span>
      {/* the hammer, falling onto the face */}
      <span className="grp-swing absolute block" style={{ left: "52%", top: "22%", width: "16%", height: "24%", transformOrigin: "88% 88%", animationDelay: `${delayMs + 460}ms` }}>
        <svg viewBox="0 0 16 24" className="block h-full w-full" aria-hidden="true">
          <path d="M13.4 21.6 L4.6 7.4" stroke={tint(p0, 0.95)} strokeWidth="1.6" strokeLinecap="round" />
          <rect x="0.8" y="2" width="9" height="6.4" rx="1" transform="rotate(-14 5.3 5.2)" fill={tint(p2, 0.95)} stroke={tint(p0, 0.85)} strokeWidth="0.8" />
        </svg>
      </span>
      {/* bespoke: Double Queen — the hammer comes down TWICE, and a second
          crown pops out on the off-beat (a proper double-take) */}
      {flourish === "doublequeen" && (
        <>
          <span className="grp-swing absolute block" style={{ left: "53%", top: "24%", width: "13%", height: "20%", transformOrigin: "88% 88%", animationDelay: `${delayMs + 880}ms` }}>
            <svg viewBox="0 0 16 24" className="block h-full w-full" aria-hidden="true">
              <path d="M13.4 21.6 L4.6 7.4" stroke={tint(p0, 0.95)} strokeWidth="1.6" strokeLinecap="round" />
              <rect x="0.8" y="2" width="9" height="6.4" rx="1" transform="rotate(-14 5.3 5.2)" fill={tint(p2, 0.95)} stroke={tint(p0, 0.85)} strokeWidth="0.8" />
            </svg>
          </span>
          <Sparks delayMs={delayMs + 1180} fill={p1} stroke={p0} sizePct={4} cx={50} cy={46} />
          <span className="grp-pop absolute block" style={{ left: "38%", top: "29%", width: "9%", height: "9%", animationDelay: `${delayMs + 1000}ms` }}>{glyph}</span>
          <span className="grp-pop absolute block" style={{ left: "53%", top: "29%", width: "9%", height: "9%", animationDelay: `${delayMs + 1280}ms` }}>{glyph}</span>
          <Glint delayMs={delayMs + 1480} color={p1} left={56} top={27} sizePct={5} />
        </>
      )}
      {/* strike sparks fanning off the anvil face */}
      <Sparks delayMs={delayMs + 760} fill={p1} stroke={p0} cx={50} cy={46} />
      <Flash delayMs={delayMs + 740} color={tint(p1, 0.8)} left={43} top={41} w={14} h={10} />
      {/* the finished work — Royal Ascension sends it climbing on rising light */}
      {flourish === "ascension" ? (
        <>
          {[42, 49, 56].map((l, i) => (
            <span
              key={i}
              className="grp-ray absolute block"
              style={{
                left: `${l}%`,
                top: "24%",
                width: "2.4%",
                height: "26%",
                background: `linear-gradient(0deg, transparent, ${tint(p1, 0.75)})`,
                transformOrigin: "50% 100%",
                animationDelay: `${delayMs + 880 + i * 70}ms`,
              }}
            />
          ))}
          <span className="grp-riseslow absolute block" style={{ left: "44%", top: "30%", width: "12%", height: "12%", animationDelay: `${delayMs + 920}ms` }}>{glyph}</span>
        </>
      ) : (
        flourish !== "doublequeen" && (
          <span className="grp-facein absolute block" style={{ left: "44%", top: "28%", width: "12%", height: "12%", animationDelay: `${delayMs + 900}ms` }}>{glyph}</span>
        )
      )}
      {/* the single forge-wave */}
      <Boom delayMs={delayMs + 940} color={tint(p1, 0.85)} thickness={4} />
      <Glint delayMs={delayMs + 1260} color={p1} left={49} top={27} />
      {/* settle: forge embers climb and gutter out over the cooling work */}
      <Afterglow delayMs={delayMs + 1080} color={tint(p1, 0.28)} left={38} top={36} w={24} h={20} />
      <Settle delayMs={delayMs + 1120} dir="rise" sizePct={2} render={(i) => <Mote color={tint(i % 2 ? p1 : "#ff9d3d", 0.8)} />} />
    </Stage>
  );
}

/* =============================================================================
   Template 12: RiftGate — twin obelisks rise flanking the centre and an aurora
   pane stretches open between them; the glyph shines through the gate.
   ========================================================================== */
function RiftGate({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.24)} delayMs={delayMs} />
      {/* tell: stray aurora light converges on the two footings */}
      <TellGlow delayMs={delayMs} color={tint(p1, 0.3)} left={35} top={40} w={10} h={20} />
      <TellGlow delayMs={delayMs + 60} color={tint(p1, 0.3)} left={55} top={40} w={10} h={20} />
      <TellRays delayMs={delayMs + 20} color={tint(p1, 0.7)} />
      {/* the twin obelisks */}
      {[36, 58].map((l, i) => (
        <span key={i} className="grp-rise absolute block" style={{ left: `${l}%`, top: "26%", width: "6%", height: "40%", animationDelay: `${delayMs + 120 + i * 90}ms` }}>
          <svg viewBox="0 0 8 40" className="block h-full w-full" aria-hidden="true">
            <path d="M4 0.8 L7 6 L6.4 39 H1.6 L1 6 Z" fill={tint(p2, 0.92)} stroke={tint(p0, 0.85)} strokeWidth="0.7" {...SJ} />
            <path d="M4 8 V13 M2.8 17 H5.2 M4 21 V26" stroke={tint(p1, 0.85)} strokeWidth="0.7" strokeLinecap="round" />
          </svg>
        </span>
      ))}
      {/* the aurora pane, stretching open between them */}
      <span
        className="grp-pane absolute block"
        style={{
          left: "41%",
          top: "30%",
          width: "18%",
          height: "32%",
          background: `linear-gradient(180deg, ${tint(p1, 0.6)}, ${tint(p0, 0.35)} 60%, ${tint(p1, 0.5)})`,
          animationDelay: `${delayMs + 420}ms`,
        }}
      />
      {/* the card's glyph, shining through the gate */}
      <span className="grp-facein absolute block" style={{ left: "45%", top: "38%", width: "10%", height: "16%", animationDelay: `${delayMs + 620}ms` }}>{glyph}</span>
      {/* bespoke: Mirror of Souls — two reflections trade places THROUGH the
          glass, each dimming as it passes the silvered pane */}
      {flourish === "mirror" && (
        <>
          <span
            className="grp-cross absolute block"
            style={{ left: "33%", top: "38%", width: "5.5%", height: "13%", "--dx": "510%", animationDelay: `${delayMs + 640}ms` } as CSSProperties}
          >
            <svg viewBox="0 0 8 16" className="block h-full w-full" aria-hidden="true">
              <path d="M2 15 L2.6 6 C1.2 5 1.4 3 4 2.2 C6.6 3 6.8 5 5.4 6 L6 15 Z" fill={tint(p1, 0.85)} stroke={p2} strokeWidth="0.6" {...SJ} />
            </svg>
          </span>
          <span
            className="grp-cross absolute block"
            style={{ left: "61.5%", top: "38%", width: "5.5%", height: "13%", "--dx": "-510%", animationDelay: `${delayMs + 640}ms` } as CSSProperties}
          >
            <svg viewBox="0 0 8 16" className="block h-full w-full" aria-hidden="true">
              <path d="M2 15 C2 10.6 3 8.6 5.4 8.2 L6.6 10 L5.4 11.2 C5.4 13 4.4 15 3.2 15 Z" fill={tint(p2, 0.9)} stroke={tint(p1, 0.9)} strokeWidth="0.6" {...SJ} />
            </svg>
          </span>
        </>
      )}
      {/* crossing flare + sparks + the single rift-wave */}
      <Flash delayMs={delayMs + 800} color={tint(p1, 0.6)} left={43} top={42} w={14} h={11} />
      <Sparks delayMs={delayMs + 840} fill={p1} stroke={p2} cy={47} />
      <Boom delayMs={delayMs + 900} color={tint(p1, 0.85)} />
      <Glint delayMs={delayMs + 1220} color={p1} left={49} top={31} />
      {/* settle: gate-light motes float up as the pane lets go */}
      <Afterglow delayMs={delayMs + 1040} color={tint(p1, 0.26)} left={39} top={32} w={22} h={24} />
      <Settle delayMs={delayMs + 1080} dir="rise" sizePct={2} render={(i) => <Mote color={tint(i % 2 ? p1 : p0, 0.75)} />} />
    </Stage>
  );
}

/* =============================================================================
   Template 13: BeastRush — a horned beast charges the full width of the crop,
   dust kicked up behind it; the card's glyph rides on its flank drape.
   ========================================================================== */
function BeastRush({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  // Comic-timing: the bonk holds its beat before the punchline lands.
  const hold = flourish === "sahur" ? 200 : 0;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.24)} delayMs={delayMs} />
      {/* tell: hoofbeat rumble — the ground shadows and speed-light gathers */}
      <TellShadow delayMs={delayMs} color={tint(p2, 0.55)} left={26} top={58} w={26} h={6} />
      <TellRays delayMs={delayMs + 20} color={tint(p1, 0.7)} />
      {/* bespoke: Dragon Mount — a wingbeat shadow crosses above the charge */}
      {flourish === "dragon" && (
        <span
          className="grp-sweep-fast absolute block rounded-full"
          style={{ left: "30%", top: "24%", width: "26%", height: "7%", background: tint(p2, 0.5), animationDelay: `${delayMs + 220}ms` }}
        />
      )}
      {/* dust kicked up along the charge line */}
      <Drifts
        delayMs={delayMs + 380}
        sizePct={3}
        render={() => (
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <circle cx="5" cy="5" r="3.6" fill={tint(p2, 0.55)} />
          </svg>
        )}
      />
      {/* the beast, at full gallop */}
      <span className="grp-sweep-fast absolute block" style={{ left: "32%", top: "34%", width: "30%", height: "26%", animationDelay: `${delayMs + 140}ms` }}>
        <svg viewBox="0 0 32 26" className="block h-full w-full" aria-hidden="true">
          {/* body low and driving */}
          <path d="M6 16 C8 10 14 8 20 9 L24 7 C26 5.6 28 6 29.4 7.6 L27 10 C28 12 27 15 24.5 16.5 L25.5 21 L22.5 20.5 L21 17.5 L12 18 L11 21.5 L8 21 L8.6 17.6 C7.4 17.2 6.4 16.8 6 16 Z" fill={tint(p0, 0.92)} stroke={p2} strokeWidth="0.9" {...SJ} />
          {/* horns + eye */}
          <path d="M24.6 6.4 C24.2 4.2 25 2.6 26.8 1.6 M27.8 6.8 C28.4 4.8 30 3.8 31.4 3.8" fill="none" stroke={tint(p1, 0.95)} strokeWidth="1" {...SJ} />
          <circle cx="27" cy="8.4" r="0.6" fill={p1} />
          {/* driving legs */}
          <path d="M9 17 L4 22 M13 18 L10 24 M20 17.5 L18 24 M24 16.5 L27 22" stroke={tint(p0, 0.9)} strokeWidth="1.6" strokeLinecap="round" />
          {/* the flank drape that bears the glyph */}
          <path d="M11 10.5 H19 V16 L15 17.5 L11 16 Z" fill={tint(p1, 0.85)} stroke={p2} strokeWidth="0.6" {...SJ} />
        </svg>
        <span className="absolute block" style={{ left: "37%", top: "42%", width: "22%", height: "26%" }}>{glyph}</span>
      </span>
      {/* bespoke: The Wild Hunt — spectral hounds course behind the horn-bearer
          and the Hunt's two diagonals blaze through the chosen square */}
      {flourish === "hunt" && (
        <>
          {[
            { l: 26, t: 42, d: 280 },
            { l: 20, t: 36, d: 420 },
          ].map((v, i) => (
            <span key={i} className="grp-sweep-fast absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "12%", height: "8%", animationDelay: `${delayMs + v.d}ms` }}>
              <svg viewBox="0 0 16 10" className="block h-full w-full" aria-hidden="true">
                <path
                  d="M1.6 6 C3 3.6 6 2.6 9 3.2 L11.4 1.6 L13 3 L11.6 4.4 C12.4 6 11 7.6 9 8 L9.6 9.4 H7.8 L7 8 H4.4 L3.6 9.4 H2 L2.6 7.4 C2 7 1.6 6.6 1.6 6 Z"
                  fill={tint(p1, 0.45)}
                  stroke={tint(p1, 0.85)}
                  strokeWidth="0.5"
                  {...SJ}
                />
              </svg>
            </span>
          ))}
          {["45deg", "-45deg"].map((rot, i) => (
            <span key={rot} className="absolute block" style={{ left: "36%", top: "42%", width: "28%", height: "1.6%", rotate: rot }}>
              <span
                className="grp-beam absolute inset-0 block"
                style={{ background: `linear-gradient(90deg, transparent, ${tint(p1, 0.9)} 50%, transparent)`, transformOrigin: "50% 50%", animationDelay: `${delayMs + 720 + i * 90}ms` }}
              />
            </span>
          ))}
        </>
      )}
      {/* bespoke: Dragon Mount — flame licks catch along the charge line */}
      {flourish === "dragon" &&
        [
          { l: 36, t: 56, d: 0 },
          { l: 46, t: 58, d: 110 },
          { l: 56, t: 56, d: 220 },
        ].map((v, i) => (
          <span key={i} className="grp-candle absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "4%", height: "6%", animationDelay: `${delayMs + 520 + v.d}ms` }}>
            <svg viewBox="0 0 6 10" className="block h-full w-full" aria-hidden="true">
              <path d="M3 0.8 C5 3 5.4 5.4 3 8.8 C0.6 5.4 1 3 3 0.8 Z" fill="#d6234f" stroke="#7a2e0e" strokeWidth="0.4" {...SJ} />
              <path d="M3 4 C4 5.2 4 6.6 3 7.8 C2 6.6 2 5.2 3 4 Z" fill="#ffd166" />
            </svg>
          </span>
        ))}
      {/* bespoke: Bobrito Bandito — the log hangs cocked at the top of the
          swing (hold it... hold it...) and THEN the bonk lands, stars and all */}
      {flourish === "sahur" && (
        <>
          <span className="grp-shiver absolute block" style={{ left: "56%", top: "26%", width: "12%", height: "10%", animationDelay: `${delayMs + 620}ms` }}>
            <svg viewBox="0 0 14 10" className="block h-full w-full" aria-hidden="true">
              <rect x="1" y="3" width="12" height="4" rx="2" transform="rotate(-32 7 5)" fill="#8a6a3a" stroke="#4a3a22" strokeWidth="0.6" />
            </svg>
          </span>
          <span className="grp-bonk absolute block" style={{ left: "60%", top: "36%", width: "7%", height: "9%", animationDelay: `${delayMs + 1020 + hold}ms` }}>
            <svg viewBox="0 0 8 10" className="block h-full w-full" aria-hidden="true">
              <circle cx="4" cy="3" r="1.6" fill="#c9cdd6" stroke="#5a6b8f" strokeWidth="0.5" />
              <path d="M2 9.4 C2 6.6 6 6.6 6 9.4 Z" fill="#c9cdd6" stroke="#5a6b8f" strokeWidth="0.5" {...SJ} />
            </svg>
          </span>
          {[
            { l: 58, t: 30, d: 0 },
            { l: 65, t: 28, d: 90 },
            { l: 62, t: 34, d: 180 },
          ].map((v, i) => (
            <span key={i} className="grp-glint absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "3.2%", height: "3.2%", animationDelay: `${delayMs + 1140 + hold + v.d}ms` }}>
              <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
                <path d="M5 0 L6.1 3.9 L10 5 L6.1 6.1 L5 10 L3.9 6.1 L0 5 L3.9 3.9 Z" fill="#ffd76a" />
              </svg>
            </span>
          ))}
        </>
      )}
      {/* impact at the far wing: flare + sparks + the single stampede-shock */}
      <Flash delayMs={delayMs + 820 + hold} color={tint(p1, 0.7)} left={56} top={38} w={16} h={12} />
      <Sparks delayMs={delayMs + 860 + hold} fill={p1} stroke={p2} cx={63} cy={43} />
      <Boom delayMs={delayMs + 900 + hold} color={tint(p1, 0.85)} thickness={4} />
      <Glint delayMs={delayMs + 1220 + hold} color={p1} left={62} top={33} />
      {/* settle: the kicked-up trail dust sinks back to the boards */}
      <Afterglow delayMs={delayMs + 1040 + hold} color={tint(p1, 0.22)} left={44} top={34} w={26} h={18} />
      <Settle delayMs={delayMs + 1080 + hold} dir="fall" render={(i) => <Mote color={tint(i % 2 ? p2 : p0, 0.65)} />} />
    </Stage>
  );
}

/* =============================================================================
   Glyph library — one tiny name-matched SVG per card, seated into its
   template's glyph slot (chest / plinth / banner / card face / lantern...).
   ========================================================================== */

function Gl({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      {children}
    </svg>
  );
}

const GLYPH: Record<string, ReactNode> = {
  /* --- WitchCircle ----------------------------------------------------------- */
  // iron ball on a shackle chain
  ball_and_chain: (
    <Gl>
      <circle cx="3.4" cy="6.6" r="2.8" fill="#3a3a40" stroke="#8a94a8" strokeWidth="0.5" />
      <path d="M5.8 5 L7 3.8 M7.6 3.2 L8.6 2.2" stroke="#8a94a8" strokeWidth="0.7" strokeLinecap="round" />
      <circle cx="7.3" cy="3.5" r="0.8" fill="none" stroke="#8a94a8" strokeWidth="0.5" />
    </Gl>
  ),
  // the royal writ: a bell over a crown
  royal_summons: (
    <Gl>
      <path d="M3 6 C3 3 7 3 7 6 L7.6 7 H2.4 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.5" {...SJ} />
      <circle cx="5" cy="8" r="0.6" fill="#8a6a3a" />
      <path d="M3.4 2.6 V1 L4.4 1.8 L5 0.8 L5.6 1.8 L6.6 1 V2.6 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // a trembling open hand
  palsied_hands: (
    <Gl>
      <path d="M3 9 V5 M4.3 8.6 V3.6 M5.6 8.6 V3 M6.9 8.8 V4 M3 9 C4.6 9.8 6.2 9.8 6.9 8.8" fill="none" stroke="#c9b0e8" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M1.4 4.6 L2.2 5.4 M1.2 6.6 L2 6.4 M8.6 3.2 L7.9 4 M9 5.4 L8.1 5.4" stroke="#8f6bff" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // the queen's throne, chained fast
  throne_bound: (
    <Gl>
      <path d="M2.6 9 V2.4 L3.8 3.6 V5 H6.2 V3.6 L7.4 2.4 V9 Z" fill="#6b4a8f" stroke="#c9b0e8" strokeWidth="0.5" {...SJ} />
      <path d="M1.4 5.4 C3.4 7 6.6 7 8.6 5.4" fill="none" stroke="#8a94a8" strokeWidth="0.7" strokeDasharray="1.1 0.8" strokeLinecap="round" />
    </Gl>
  ),
  // a lone crown beside a horse head
  lone_sovereign: (
    <Gl>
      <path d="M1.6 5.6 V3 L2.8 4 L3.6 2.6 L4.4 4 L5.6 3 V5.6 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <path d="M5.6 9 C5.6 6.6 6.6 5.4 8 5.2 L8.8 6.4 L8 7 C8 8 7.4 9 6.8 9 Z" fill="#c9cdd6" stroke="#5a6b8f" strokeWidth="0.5" {...SJ} />
      <circle cx="7.7" cy="6.1" r="0.3" fill="#5a6b8f" />
    </Gl>
  ),
  // the levy's pitchfork
  peasant_levy: (
    <Gl>
      <path d="M5 9.4 V3.4 M3 1 V3.4 H7 V1 M5 1 V3.4" fill="none" stroke="#b58a5a" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M3 3.4 H7" stroke="#8a6a3a" strokeWidth="0.6" />
    </Gl>
  ),
  // the crown sent into exile
  court_in_exile: (
    <Gl>
      <path d="M2 6.4 V3.4 L3.4 4.6 L4.4 3 L5.4 4.6 L6.8 3.4 V6.4 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.5" {...SJ} />
      <path d="M5.4 8.2 H8.8 M7.4 6.8 L8.8 8.2 L7.4 9.6" fill="none" stroke="#c94a5a" strokeWidth="0.7" {...SJ} />
    </Gl>
  ),
  // a jagged nerf-bolt snapped over a card
  cast_a_nerf: (
    <Gl>
      <rect x="2" y="1.4" width="6" height="7.2" rx="0.8" fill="#e3d0ff" stroke="#6b4a8f" strokeWidth="0.5" />
      <path d="M5.8 2.2 L4 5 H5.2 L3.6 8 L7 4.6 H5.6 L6.8 2.2 Z" fill="#ff9d3d" stroke="#7a4a10" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // the king dragging a weight
  royal_handicap: (
    <Gl>
      <path d="M3 3 L3.8 1.6 L4.6 3 M3.8 1.6 V0.8" stroke="#ffd76a" strokeWidth="0.6" strokeLinecap="round" fill="none" />
      <path d="M2.6 8.8 L3 3.6 H4.6 L5 8.8 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.5" {...SJ} />
      <path d="M5 7.4 H6.4" stroke="#8a94a8" strokeWidth="0.6" />
      <circle cx="7.6" cy="7.4" r="1.5" fill="#3a3a40" stroke="#8a94a8" strokeWidth="0.4" />
    </Gl>
  ),
  // the queen's clipped stride: three short steps
  queens_handicap: (
    <Gl>
      <path d="M2.6 4.4 L2 2.4 L3.2 3.2 L3.8 1.8 L4.4 3.2 L5.6 2.4 L5 4.4 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <path d="M2.6 5 L5 5 L4.6 8.6 H3 Z" fill="#c94ad1" stroke="#6b1a5e" strokeWidth="0.4" {...SJ} />
      <path d="M6.2 6.4 H7 M7.6 6.4 H8.4 M6.2 8 H7" stroke="#e3d0ff" strokeWidth="0.7" strokeLinecap="round" />
    </Gl>
  ),
  // rook and queen barred together
  grounded_command: (
    <Gl>
      <path d="M1.6 8.8 L2 4.6 H1.6 V3.2 H2.6 V3.8 H3.4 V3.2 H4.4 V4.6 H4 L4.4 8.8 Z" fill="#8a94a8" stroke="#3a3a40" strokeWidth="0.4" {...SJ} />
      <path d="M6 4.4 L5.6 2.8 L6.6 3.4 L7.2 2.2 L7.8 3.4 L8.8 2.8 L8.4 4.4 Z M6 5 H8.4 L8 8.8 H6.4 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <path d="M0.8 6.6 H9.2" stroke="#c94a5a" strokeWidth="0.8" strokeLinecap="round" />
    </Gl>
  ),
  // the eclipsed moon
  lunar_eclipse: (
    <Gl>
      <circle cx="5" cy="5" r="3.8" fill="#2c3e6b" stroke="#cdd6ff" strokeWidth="0.5" />
      <path d="M5 1.2 A3.8 3.8 0 0 1 5 8.8 A5 5 0 0 0 5 1.2 Z" fill="#cdd6ff" opacity="0.9" />
      <circle cx="2.2" cy="2" r="0.4" fill="#cdd6ff" />
      <circle cx="8.4" cy="8" r="0.35" fill="#cdd6ff" />
    </Gl>
  ),
  // the hexed satchel, star-stitched
  hexed_satchel: (
    <Gl>
      <path d="M2.4 4 H7.6 L8.2 9 H1.8 Z" fill="#8a6a3a" stroke="#4a3a22" strokeWidth="0.5" {...SJ} />
      <path d="M3.4 4 C3.4 1.8 6.6 1.8 6.6 4" fill="none" stroke="#4a3a22" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M5 5.2 L5.4 6.2 L6.4 6.3 L5.7 7 L5.9 8 L5 7.5 L4.1 8 L4.3 7 L3.6 6.3 L4.6 6.2 Z" fill="#a8e07f" />
    </Gl>
  ),
  // a barred furrow of wheat
  iron_furrow: (
    <Gl>
      <path d="M3 9 C3 6 3.6 3.6 5 1.4 C6.4 3.6 7 6 7 9" fill="none" stroke="#c9a84c" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M5 3.4 L3.8 2.6 M5 5 L6.4 4.2 M5 6.6 L3.8 5.8" stroke="#c9a84c" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M1.4 8 H8.6" stroke="#8a94a8" strokeWidth="0.9" strokeLinecap="round" />
    </Gl>
  ),
  // a pawn under a lead ingot
  leaden_fields: (
    <Gl>
      <path d="M2.6 3.4 H7.4 L8.4 5.6 H1.6 Z" fill="#6e6e78" stroke="#3a3a40" strokeWidth="0.5" {...SJ} />
      <circle cx="5" cy="7" r="1" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.4" />
      <path d="M3.8 9.4 C3.8 8 6.2 8 6.2 9.4 Z" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // the stitched doll, pin through its heart
  wc_voodoo_doll: (
    <Gl>
      <circle cx="5" cy="2.6" r="1.6" fill="#b58a5a" stroke="#4a3a22" strokeWidth="0.5" />
      <path d="M3.8 4.4 H6.2 L6.8 8.8 H3.2 Z M3.8 5.4 L2 6.6 M6.2 5.4 L8 6.6" fill="#b58a5a" stroke="#4a3a22" strokeWidth="0.5" {...SJ} />
      <path d="M4.4 2.2 L5.6 3 M5.6 2.2 L4.4 3" stroke="#4a3a22" strokeWidth="0.35" strokeLinecap="round" />
      <path d="M6.8 4.6 L4.6 6.8" stroke="#c94a5a" strokeWidth="0.6" strokeLinecap="round" />
      <circle cx="6.9" cy="4.5" r="0.55" fill="#c94a5a" />
    </Gl>
  ),
  // a boot caught in honey-glue
  wc_sticky_floor: (
    <Gl>
      <path d="M3.4 1.4 H5.8 V5.4 C7 5.4 8 6 8 7.2 H3.4 Z" fill="#8a6a3a" stroke="#4a3a22" strokeWidth="0.5" {...SJ} />
      <path d="M1.6 7.8 C3 6.8 4.4 8.6 6 7.6 C7.2 6.9 8.4 7.6 8.8 8.4 C6.4 9.6 3.2 9.6 1.6 8.6 Z" fill="#ffd23f" stroke="#c9a84c" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // the fate-thread, snipped
  threads_of_fate: (
    <Gl>
      <path d="M1 4.6 C3 3.6 5 5.6 7 4.6 M8.2 4.2 L9.4 3.6" fill="none" stroke="#cdd6ff" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M4.6 6.4 L7.8 3.6 M4.6 3.6 L7.8 6.4" stroke="#8a94a8" strokeWidth="0.7" strokeLinecap="round" />
      <circle cx="4.2" cy="6.8" r="0.7" fill="none" stroke="#8a94a8" strokeWidth="0.5" />
      <circle cx="4.2" cy="3.2" r="0.7" fill="none" stroke="#8a94a8" strokeWidth="0.5" />
    </Gl>
  ),
  // the hypnotic eye
  mind_control: (
    <Gl>
      <path d="M1 5 C2.6 2.6 7.4 2.6 9 5 C7.4 7.4 2.6 7.4 1 5 Z" fill="#12081f" stroke="#c94ad1" strokeWidth="0.5" {...SJ} />
      <circle cx="5" cy="5" r="1.7" fill="#c94ad1" />
      <circle cx="5" cy="5" r="0.8" fill="none" stroke="#12081f" strokeWidth="0.4" />
      <circle cx="5" cy="5" r="0.3" fill="#ffffff" />
    </Gl>
  ),
  // the eye fixed on a tower
  mind_dominion: (
    <Gl>
      <path d="M1.2 3.4 C2.4 1.6 5.6 1.6 6.8 3.4 C5.6 5.2 2.4 5.2 1.2 3.4 Z" fill="#12081f" stroke="#8f6bff" strokeWidth="0.5" {...SJ} />
      <circle cx="4" cy="3.4" r="1" fill="#8f6bff" />
      <path d="M6.2 9 L6.5 6 H6.2 V4.8 H7.1 V5.4 H7.7 V4.8 H8.6 V6 H8.3 L8.6 9 Z" fill="#8a94a8" stroke="#3a3a40" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),

  /* --- StoneGaze --------------------------------------------------------------- */
  // the queen crunched to walnut, court frozen at her feet
  medusas_verdict: (
    <Gl>
      <path d="M3.4 3.2 L3 1.6 L4 2.2 L5 1 L6 2.2 L7 1.6 L6.6 3.2 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <ellipse cx="5" cy="6" rx="2.6" ry="3" fill="#c9b89a" stroke="#8a6a4a" strokeWidth="0.5" />
      <path d="M5 3.4 V8.6 M3.4 4.6 C3 5.6 3 6.8 3.4 7.6" fill="none" stroke="#8a6a4a" strokeWidth="0.4" />
      <path d="M1.2 8.6 L1.8 9.4 M8.8 8.6 L8.2 9.4" stroke="#9fd8ff" strokeWidth="0.6" strokeLinecap="round" />
    </Gl>
  ),
  // rook towers turned nutshell
  granite_ramparts: (
    <Gl>
      <path d="M2 8.8 L2.3 5 H2 V3.6 H2.9 V4.2 H3.6 V3.6 H4.5 V5 H4.2 L4.5 8.8 Z" fill="#c9b89a" stroke="#8a6a4a" strokeWidth="0.4" {...SJ} />
      <path d="M5.5 8.8 L5.8 5 H5.5 V3.6 H6.4 V4.2 H7.1 V3.6 H8 V5 H7.7 L8 8.8 Z" fill="#c9b89a" stroke="#8a6a4a" strokeWidth="0.4" {...SJ} />
      <path d="M2.8 6.4 C3 5.8 3.6 5.8 3.8 6.4 M6.3 6.4 C6.5 5.8 7.1 5.8 7.3 6.4" stroke="#8a6a4a" strokeWidth="0.35" fill="none" />
    </Gl>
  ),
  // knight and bishop set on gallery plinths
  stone_menagerie: (
    <Gl>
      <path d="M1.4 7.6 H4.4 V8.8 H1.4 Z M5.6 7.6 H8.6 V8.8 H5.6 Z" fill="#c9c9cf" stroke="#6e6e74" strokeWidth="0.4" />
      <path d="M2 7.6 C2 5.6 2.8 4.6 4 4.4 L4.6 5.4 L4 6 C4 6.8 3.6 7.6 3 7.6 Z" fill="#8d8d94" stroke="#5c5c63" strokeWidth="0.4" {...SJ} />
      <circle cx="7.1" cy="4.9" r="0.5" fill="#8d8d94" stroke="#5c5c63" strokeWidth="0.3" />
      <path d="M6.4 7.6 L6.7 5.8 L7.5 5.8 L7.8 7.6 Z" fill="#8d8d94" stroke="#5c5c63" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // one piece mid-crunch: half silhouette, half shell
  stone_curse: (
    <Gl>
      <path d="M5 1.2 C3.4 1.2 2.6 2.4 2.6 3.6 C2.6 4.8 3.4 5.4 3.4 6.4 L3 8.8 H5 Z" fill="#8d8d94" stroke="#5c5c63" strokeWidth="0.5" {...SJ} />
      <path d="M5 1.6 C6.8 1.6 7.8 3.4 7.8 5.2 C7.8 7.2 6.8 8.8 5 8.8 Z" fill="#c9b89a" stroke="#8a6a4a" strokeWidth="0.5" {...SJ} />
      <path d="M6.2 3 C6.8 4.4 6.8 6.4 6.2 7.6" fill="none" stroke="#8a6a4a" strokeWidth="0.4" />
    </Gl>
  ),
  // a knight head in the nutshell
  stone_riders: (
    <Gl>
      <ellipse cx="5" cy="5.4" rx="3.4" ry="3.8" fill="#c9b89a" stroke="#8a6a4a" strokeWidth="0.5" />
      <path d="M3.6 7.4 C3.6 4.8 4.6 3.4 6.2 3.2 L7 4.4 L6.2 5 C6.2 6.2 5.6 7.4 4.8 7.4 Z" fill="#8d8d94" stroke="#5c5c63" strokeWidth="0.4" {...SJ} />
      <circle cx="6" cy="4.2" r="0.3" fill="#5c5c63" />
    </Gl>
  ),
  // a bishop mitre in the nutshell
  stone_prelates: (
    <Gl>
      <ellipse cx="5" cy="5.4" rx="3.4" ry="3.8" fill="#c9b89a" stroke="#8a6a4a" strokeWidth="0.5" />
      <circle cx="5" cy="3" r="0.55" fill="#8d8d94" stroke="#5c5c63" strokeWidth="0.3" />
      <path d="M3.8 7.6 L4.2 4.6 C4.5 4 5.5 4 5.8 4.6 L6.2 7.6 Z" fill="#8d8d94" stroke="#5c5c63" strokeWidth="0.4" {...SJ} />
      <path d="M4.5 5.2 L5.5 6.2" stroke="#c9b89a" strokeWidth="0.35" strokeLinecap="round" />
    </Gl>
  ),
  // a rook turret in the nutshell
  stone_bastions: (
    <Gl>
      <ellipse cx="5" cy="5.4" rx="3.4" ry="3.8" fill="#c9b89a" stroke="#8a6a4a" strokeWidth="0.5" />
      <path d="M3.6 7.6 L3.9 4.8 H3.6 V3.6 H4.4 V4.1 H5.6 V3.6 H6.4 V4.8 H6.1 L6.4 7.6 Z" fill="#8d8d94" stroke="#5c5c63" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // the crown itself in the nutshell
  queen_of_stone: (
    <Gl>
      <ellipse cx="5" cy="5.4" rx="3.4" ry="3.8" fill="#c9b89a" stroke="#8a6a4a" strokeWidth="0.5" />
      <path d="M3.2 6.6 V4 L4.2 4.9 L5 3.4 L5.8 4.9 L6.8 4 V6.6 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <circle cx="5" cy="5.9" r="0.3" fill="#8a6a3a" />
    </Gl>
  ),
  // the statue that never wakes: figure on a laurelled plinth
  eternal_statue: (
    <Gl>
      <rect x="2.6" y="7.2" width="4.8" height="1.8" fill="#c9c9cf" stroke="#6e6e74" strokeWidth="0.4" />
      <circle cx="5" cy="2.2" r="0.9" fill="#8d8d94" stroke="#6e6e74" strokeWidth="0.35" />
      <path d="M4.1 7.2 L4.3 4.4 L3.4 5.2 L2.9 4.7 L4.3 3.4 H5.7 L7.1 4.7 L6.6 5.2 L5.7 4.4 L5.9 7.2 Z" fill="#8d8d94" stroke="#6e6e74" strokeWidth="0.35" {...SJ} />
      <path d="M3.2 8.1 C4 7.6 4.8 8.4 5.6 8" fill="none" stroke="#7fae5a" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // the nerf hammer over a cracked shell
  nerf_hammer: (
    <Gl>
      <rect x="2.4" y="1" width="5.2" height="2.6" rx="0.7" fill="#ff9d3d" stroke="#7a4a10" strokeWidth="0.5" />
      <path d="M5 3.6 V6" stroke="#7a4a10" strokeWidth="0.8" strokeLinecap="round" />
      <ellipse cx="5" cy="7.8" rx="2.4" ry="1.7" fill="#c9b89a" stroke="#8a6a4a" strokeWidth="0.4" />
      <path d="M4 7 L5 8.2 L6.2 7.2" fill="none" stroke="#8a6a4a" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),

  /* --- ColdFront ------------------------------------------------------------------ */
  // the whole board glazed: a snow-heaped pawn
  the_big_chill: (
    <Gl>
      <circle cx="5" cy="4" r="1.4" fill="#bfe6ff" stroke="#4f8fd1" strokeWidth="0.5" />
      <path d="M3.2 9 C3.2 6.8 6.8 6.8 6.8 9 Z" fill="#bfe6ff" stroke="#4f8fd1" strokeWidth="0.5" {...SJ} />
      <path d="M2.6 3.4 C3.4 2.4 6.6 2.4 7.4 3.4" fill="none" stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M1.6 6.2 L2.4 6.2 M2 5.8 L2 6.6" stroke="#9fd8ff" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // a piece frozen mid-step: boot in an ice cube
  frozen_moment: (
    <Gl>
      <path d="M2 3.6 L5 1.6 L8 3.6 L8 7.6 L5 9.4 L2 7.6 Z" fill="#bfe6ff" fillOpacity="0.55" stroke="#4f8fd1" strokeWidth="0.5" {...SJ} />
      <path d="M4 4 H5.6 V6 C6.4 6 7 6.4 7 7.2 H4 Z" fill="#5a6b8f" stroke="#2c3e6b" strokeWidth="0.4" {...SJ} />
      <path d="M2.8 4.4 L4 5.6" stroke="#ffffff" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // frost creeping finger by finger
  creeping_frost: (
    <Gl>
      <path d="M1 8.8 C2.6 8.2 3 6.6 4 5.6 C5 4.6 6.6 4.6 7.4 3.4 C8 2.6 8.2 1.8 8 1" fill="none" stroke="#9fd8ff" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M4 5.6 L5.2 6.4 M4.9 4.9 L6.2 5.4 M7.4 3.4 L8.4 4 M7.9 2.4 L9 2.6" stroke="#e8f8ff" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // knight and bishop iced at the wings
  glacial_flanks: (
    <Gl>
      <path d="M1.6 7.6 C1.6 5.6 2.4 4.6 3.6 4.4 L4.2 5.4 L3.6 6 C3.6 6.8 3.2 7.6 2.6 7.6 Z" fill="#bfe6ff" stroke="#4f8fd1" strokeWidth="0.4" {...SJ} />
      <path d="M6.4 7.6 L6.7 5.6 C7 5 7.8 5 8.1 5.6 L8.4 7.6 Z" fill="#bfe6ff" stroke="#4f8fd1" strokeWidth="0.4" {...SJ} />
      <circle cx="7.4" cy="4.4" r="0.5" fill="#bfe6ff" stroke="#4f8fd1" strokeWidth="0.3" />
      <path d="M5 2 V3.2 M4.5 2.6 H5.5" stroke="#ffffff" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // total whiteout: the blizzard flake
  total_whiteout: (
    <Gl>
      <path d="M5 0.8 V9.2 M1.4 2.9 L8.6 7.1 M8.6 2.9 L1.4 7.1" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M4 1.8 L5 2.8 L6 1.8 M4 8.2 L5 7.2 L6 8.2 M1.9 4.2 L3 3.7 M1.9 5.8 L3 6.3 M8.1 4.2 L7 3.7 M8.1 5.8 L7 6.3" fill="none" stroke="#ffffff" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // numbed hand, fingers iced over
  we_frostbite_curse: (
    <Gl>
      <path d="M3 9 V5.4 M4.3 8.8 V4 M5.6 8.8 V3.4 M6.9 9 V4.4 M3 9 C4.4 9.8 6 9.8 6.9 9" fill="none" stroke="#9fd8ff" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M4.3 4 L3.6 3 M4.3 4 L5 3 M5.6 3.4 L4.9 2.4 M5.6 3.4 L6.3 2.4" stroke="#e8f8ff" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // every neighbouring piece iced at once: ring of shards
  total_freeze: (
    <Gl>
      <circle cx="5" cy="5" r="1.3" fill="#ffffff" stroke="#4f8fd1" strokeWidth="0.4" />
      <path d="M5 0.8 L5.8 2.6 H4.2 Z M5 9.2 L4.2 7.4 H5.8 Z M0.8 5 L2.6 4.2 V5.8 Z M9.2 5 L7.4 5.8 V4.2 Z" fill="#9fd8ff" stroke="#4f8fd1" strokeWidth="0.35" {...SJ} />
    </Gl>
  ),

  /* --- SiegeRoll ---------------------------------------------------------------------- */
  // one blast octagon around a cross-hair
  atomic_captures: (
    <Gl>
      <path d="M3.4 1.4 H6.6 L8.6 3.4 V6.6 L6.6 8.6 H3.4 L1.4 6.6 V3.4 Z" fill="none" stroke="#ff9d3d" strokeWidth="0.7" {...SJ} />
      <circle cx="5" cy="5" r="1.2" fill="#e6432c" />
      <path d="M5 2.4 V3.6 M5 6.4 V7.6 M2.4 5 H3.6 M6.4 5 H7.6" stroke="#ffd166" strokeWidth="0.6" strokeLinecap="round" />
    </Gl>
  ),
  // blasts begetting blasts: chained bursts
  atomic_reaction: (
    <Gl>
      <path d="M2.6 3.6 L3.4 2 L4.2 3.6 L5.8 3 L5.2 4.6 L6.4 5.4 L4.8 5.8 L5 7.4 L3.6 6.4 L2.4 7.4 L2.6 5.6 L1.2 4.8 L2.8 4.6 Z" fill="#ff9d3d" stroke="#7a2e0e" strokeWidth="0.4" {...SJ} />
      <path d="M6.6 6.4 L7.1 5.4 L7.6 6.4 L8.7 6.2 L8.1 7.1 L8.8 7.9 L7.7 7.9 L7.6 9 L6.9 8.2 L5.9 8.6 L6.3 7.6 L5.6 6.9 Z" fill="#ffd166" stroke="#7a2e0e" strokeWidth="0.35" {...SJ} />
    </Gl>
  ),
  // three charges wired to one plunger
  detonation_field: (
    <Gl>
      <rect x="1.4" y="6.4" width="1.8" height="2.6" fill="#c94a3a" stroke="#5a1512" strokeWidth="0.4" />
      <rect x="4.1" y="6.4" width="1.8" height="2.6" fill="#c94a3a" stroke="#5a1512" strokeWidth="0.4" />
      <rect x="6.8" y="6.4" width="1.8" height="2.6" fill="#c94a3a" stroke="#5a1512" strokeWidth="0.4" />
      <path d="M2.3 6.4 C2.3 4 5 4.6 5 2.6 M5 6.4 V2.6 M7.7 6.4 C7.7 4 5 4.6 5 2.6" fill="none" stroke="#ffd166" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M4 1.2 H6 M5 1.2 V2.6" stroke="#8a94a8" strokeWidth="0.6" strokeLinecap="round" />
    </Gl>
  ),
  // the rigged piece: dynamite strapped to a pawn
  ww_demolition_charge: (
    <Gl>
      <circle cx="5" cy="3.4" r="1.3" fill="#c9cdd6" stroke="#5a6b8f" strokeWidth="0.4" />
      <path d="M3.4 9 C3.4 6.6 6.6 6.6 6.6 9 Z" fill="#c9cdd6" stroke="#5a6b8f" strokeWidth="0.4" {...SJ} />
      <rect x="2.2" y="5.2" width="5.6" height="1.6" rx="0.4" fill="#c94a3a" stroke="#5a1512" strokeWidth="0.4" />
      <path d="M7.8 5.6 C8.4 5 8.6 4.4 8.4 3.6" fill="none" stroke="#ffd166" strokeWidth="0.5" strokeLinecap="round" />
      <circle cx="8.4" cy="3.3" r="0.4" fill="#ff9d3d" />
    </Gl>
  ),
  // the party cannon
  wc_confetti_cannon: (
    <Gl>
      <path d="M2 8.4 L6.2 5 L7.6 6.8 L3.4 9.4 Z" fill="#c94ad1" stroke="#6b1a5e" strokeWidth="0.5" {...SJ} />
      <circle cx="2.9" cy="8.7" r="0.9" fill="#3a3a40" />
      <path d="M6.8 4 L7.6 2.6 M7.8 4.8 L9.2 4.2 M8.2 3.6 L9 2.4" stroke="#ffcf4d" strokeWidth="0.5" strokeLinecap="round" />
      <rect x="6.4" y="1.6" width="0.9" height="0.9" fill="#4fe3ff" transform="rotate(20 6.8 2)" />
      <rect x="8.6" y="1" width="0.8" height="0.8" fill="#ff4fa3" transform="rotate(-15 9 1.4)" />
    </Gl>
  ),
  // two captures, two firestorms: twin flames
  we_firestorm: (
    <Gl>
      <path d="M3.2 2 C4.6 3.4 4.8 4.8 3.2 6.4 C1.6 4.8 1.8 3.4 3.2 2 Z" fill="#ff7a29" stroke="#7a2e0e" strokeWidth="0.4" {...SJ} />
      <path d="M6.8 3.6 C8.2 5 8.4 6.4 6.8 8 C5.2 6.4 5.4 5 6.8 3.6 Z" fill="#ffd166" stroke="#7a2e0e" strokeWidth="0.4" {...SJ} />
      <circle cx="3.2" cy="4.6" r="0.5" fill="#ffd166" />
      <circle cx="6.8" cy="6.2" r="0.5" fill="#ff7a29" />
    </Gl>
  ),
  // the wagon-sized maul
  giants_maul: (
    <Gl>
      <path d="M2 8.8 L6.4 3.2" stroke="#8a6a3a" strokeWidth="0.9" strokeLinecap="round" />
      <rect x="4.6" y="0.8" width="4.2" height="3.4" rx="0.6" transform="rotate(14 6.7 2.5)" fill="#8a94a8" stroke="#3a3a40" strokeWidth="0.5" />
      <path d="M5.4 1.8 L7.8 2.4" stroke="#c9cdd6" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // the middle ranks branded off-limits
  scorched_middle: (
    <Gl>
      <path d="M1.4 4 H8.6 M1.4 6 H8.6" stroke="#3a1c12" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M5 2.6 C6.2 3.6 6.4 4.6 5 5.8 C3.6 4.6 3.8 3.6 5 2.6 Z" fill="#ff7a29" stroke="#7a2e0e" strokeWidth="0.4" {...SJ} />
      <path d="M3 7 C3.6 7.6 3.7 8.2 3 8.9 C2.3 8.2 2.4 7.6 3 7 Z M7 7 C7.6 7.6 7.7 8.2 7 8.9 C6.3 8.2 6.4 7.6 7 7 Z" fill="#ffb454" stroke="#7a2e0e" strokeWidth="0.35" {...SJ} />
    </Gl>
  ),

  /* --- WarBanner -------------------------------------------------------------------------- */
  // the crowned shield that refuses the mate
  checkmate_immunity: (
    <Gl>
      <path d="M5 2.6 C6.4 3.4 7.6 3.6 8.4 3.4 C8.4 6.6 7 8.6 5 9.4 C3 8.6 1.6 6.6 1.6 3.4 C2.4 3.6 3.6 3.4 5 2.6 Z" fill="#dfe8ff" stroke="#5a8fc0" strokeWidth="0.5" {...SJ} />
      <path d="M3.6 2.4 V1 L4.3 1.7 L5 0.8 L5.7 1.7 L6.4 1 V2.4 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <path d="M3.6 5.4 L4.6 6.6 L6.6 4.6" fill="none" stroke="#5a8fc0" strokeWidth="0.7" {...SJ} />
    </Gl>
  ),
  // the king in irons that cannot be touched
  iron_reign: (
    <Gl>
      <path d="M3 3.2 L3.8 1.6 L4.6 3.2 M3.8 1.6 V0.6 M3.3 1.1 H4.3" stroke="#ffd76a" strokeWidth="0.6" strokeLinecap="round" fill="none" />
      <path d="M2.4 9 L3 3.8 H4.6 L5.2 9 Z" fill="#8a94a8" stroke="#3a3a40" strokeWidth="0.5" {...SJ} />
      <path d="M6.2 4.6 V3.8 A1.3 1.3 0 0 1 8.8 3.8 V4.6" fill="none" stroke="#3a3a40" strokeWidth="0.6" strokeLinecap="round" />
      <rect x="5.7" y="4.6" width="3.6" height="3" rx="0.5" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" />
    </Gl>
  ),
  // the back ranks plated over
  ironclad: (
    <Gl>
      <path d="M1.4 5.4 H8.6 V8.8 H1.4 Z" fill="#8a94a8" stroke="#3a3a40" strokeWidth="0.5" />
      <path d="M1.4 7.1 H8.6 M3.8 5.4 V8.8 M6.2 5.4 V8.8" stroke="#3a3a40" strokeWidth="0.4" />
      <circle cx="2.6" cy="6.2" r="0.25" fill="#c9cdd6" />
      <circle cx="7.4" cy="8" r="0.25" fill="#c9cdd6" />
      <path d="M5 1.4 L6 2.8 H4 Z" fill="#c9cdd6" stroke="#3a3a40" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // the bulwark tower, spiked against all comers
  ww_iron_bulwark: (
    <Gl>
      <path d="M3 9 L3.4 4.4 H3 V3 H4 V3.6 H6 V3 H7 V4.4 H6.6 L7 9 Z" fill="#8a94a8" stroke="#3a3a40" strokeWidth="0.5" {...SJ} />
      <path d="M1.2 6.4 L2.4 6 M8.8 6.4 L7.6 6 M1.8 8.2 L2.8 7.6 M8.2 8.2 L7.2 7.6" stroke="#c94a3a" strokeWidth="0.6" strokeLinecap="round" />
    </Gl>
  ),
  // the praetorian's crested helm
  ww_praetorian_guard: (
    <Gl>
      <path d="M2.6 4.4 C2.6 2.2 7.4 2.2 7.4 4.4 V6.6 L6.4 8.6 H3.6 L2.6 6.6 Z" fill="#c9a84c" stroke="#7a5b23" strokeWidth="0.5" {...SJ} />
      <path d="M4.2 5 H4.9 M5.5 5 H6.2 M4.6 8.6 V6.6 H5.8 V8.6" stroke="#3a3a40" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M3.4 2.4 C4.2 0.8 5.8 0.8 6.6 2.4" fill="none" stroke="#c94a3a" strokeWidth="1.1" strokeLinecap="round" />
    </Gl>
  ),
  // the round table itself, two swords crossed over it
  round_table: (
    <Gl>
      <circle cx="5" cy="5" r="3.8" fill="#c9b89a" stroke="#8a6a4a" strokeWidth="0.5" />
      <circle cx="5" cy="5" r="2.2" fill="none" stroke="#8a6a4a" strokeWidth="0.4" />
      <path d="M2.8 2.8 L7.2 7.2 M7.2 2.8 L2.8 7.2" stroke="#5a6b8f" strokeWidth="0.6" strokeLinecap="round" />
      <circle cx="5" cy="5" r="0.6" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.3" />
    </Gl>
  ),
  // the bridgehead: a pontoon plank into enemy ground
  ww_bridgehead: (
    <Gl>
      <path d="M1 7.4 C3.6 5 6.4 5 9 7.4" fill="none" stroke="#8a6a3a" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M2.4 6.4 V7.8 M4.2 5.7 V7.2 M5.8 5.7 V7.2 M7.6 6.4 V7.8" stroke="#8a6a3a" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M5 5.2 V1.6 M5 1.6 L7 2.6 L5 3.6" fill="none" stroke="#c94a3a" strokeWidth="0.6" {...SJ} />
    </Gl>
  ),
  // the d and e files, gated shut
  sealed_avenues: (
    <Gl>
      <path d="M3.6 1.4 V8.6 M6.4 1.4 V8.6" stroke="#8a94a8" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M2 3.2 H8 M2 5 H8 M2 6.8 H8" stroke="#5c5c63" strokeWidth="0.5" strokeLinecap="round" />
      <circle cx="5" cy="5" r="0.9" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" />
      <path d="M5 5.4 V5.9" stroke="#8a6a3a" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),

  /* --- Grove ---------------------------------------------------------------------------------- */
  // the dryad stepping out of her bark
  dryad_grove: (
    <Gl>
      <path d="M3 9.4 C2.4 6 2.6 3 4 1 C4.6 2.6 4.8 4.2 4.4 6.2 L5.4 9.4 Z" fill="#8a6a3a" stroke="#4a3a22" strokeWidth="0.4" {...SJ} />
      <circle cx="6.4" cy="3.2" r="1" fill="#a8e07f" stroke="#3f8f3f" strokeWidth="0.4" />
      <path d="M5.8 4.4 H7 L7.4 7.4 L6.8 9.4 H6 L5.6 7.4 Z" fill="#a8e07f" stroke="#3f8f3f" strokeWidth="0.4" {...SJ} />
      <path d="M7 2.2 C7.6 1.6 8.4 1.4 9 1.8" fill="none" stroke="#3f8f3f" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // the pawn in full queenly bloom
  we_overgrowth: (
    <Gl>
      <path d="M5 9.2 V4.6" stroke="#3f8f3f" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M5 5.6 C3.8 5.4 3.2 4.6 3.2 3.6 C4.4 3.6 5 4.4 5 5.6 Z M5 4.4 C6.2 4.2 6.8 3.4 6.8 2.4 C5.6 2.4 5 3.2 5 4.4 Z" fill="#a8e07f" stroke="#3f8f3f" strokeWidth="0.4" {...SJ} />
      <path d="M3.4 3 L3 1.6 L4.1 2.4 L5 1 L5.9 2.4 L7 1.6 L6.6 3 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // roots seizing a tower
  we_rooted: (
    <Gl>
      <path d="M3.6 8.8 L4 4.6 H3.6 V3.2 H4.6 V3.8 H5.4 V3.2 H6.4 V4.6 H6 L6.4 8.8 Z" fill="#8a94a8" stroke="#3a3a40" strokeWidth="0.5" {...SJ} />
      <path d="M2 9.4 C3 8 3.4 6.6 3.2 5 M8 9.4 C7 8 6.6 6.6 6.8 5 M4.6 9.4 C4.8 8.4 5.2 8.4 5.4 9.4" fill="none" stroke="#3f8f3f" strokeWidth="0.7" strokeLinecap="round" />
    </Gl>
  ),
  // sucking mud, one boot going under
  we_quagmire: (
    <Gl>
      <ellipse cx="5" cy="7" rx="3.8" ry="1.8" fill="#5c5348" stroke="#3a3026" strokeWidth="0.4" />
      <path d="M4 6.6 H5.4 V4 H4 Z" fill="#8a94a8" stroke="#3a3a40" strokeWidth="0.4" {...SJ} />
      <path d="M2.2 6.2 C2.8 5.8 3.4 5.8 3.8 6.2 M6.2 7.6 C6.8 7.2 7.4 7.2 7.8 7.6" fill="none" stroke="#8a7a63" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // one rank of black thorn
  thorn_hedge: (
    <Gl>
      <path d="M1 6.4 C2.4 5.6 3.6 5.6 5 6.4 C6.4 7.2 7.6 7.2 9 6.4" fill="none" stroke="#1c4a1c" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M2.4 6 L2 4.8 M4 6.2 L4.2 5 M6 6.8 L5.8 5.6 M7.6 6.6 L8 5.4" stroke="#3f8f3f" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M2 4.8 L1.6 4.2 M4.2 5 L4.6 4.4 M5.8 5.6 L5.4 5 M8 5.4 L8.4 4.8" stroke="#a8e07f" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),

  /* --- PhantomParade -------------------------------------------------------------------------------- */
  // the silken veil settling
  gossamer_veil: (
    <Gl>
      <path d="M1.4 3 C3.8 1.4 6.2 1.4 8.6 3 C8.2 5.4 8.2 7 8.6 9 C6.2 7.6 3.8 7.6 1.4 9 C1.8 7 1.8 5.4 1.4 3 Z" fill="#e3d0ff" fillOpacity="0.6" stroke="#8f6bff" strokeWidth="0.5" {...SJ} />
      <path d="M3 4.2 C4.4 3.4 5.6 3.4 7 4.2 M3 6.2 C4.4 5.4 5.6 5.4 7 6.2" fill="none" stroke="#8f6bff" strokeWidth="0.35" strokeLinecap="round" />
    </Gl>
  ),
  // the star-woven ward
  starlight_ward: (
    <Gl>
      <path d="M5 1 L5.9 3.4 L8.4 3.5 L6.4 5 L7.1 7.4 L5 6 L2.9 7.4 L3.6 5 L1.6 3.5 L4.1 3.4 Z" fill="#cdd6ff" stroke="#5a6b8f" strokeWidth="0.4" {...SJ} />
      <path d="M2 9 C4 8 6 8 8 9" fill="none" stroke="#8b7bff" strokeWidth="0.5" strokeLinecap="round" strokeDasharray="0.9 0.7" />
    </Gl>
  ),
  // the patient spirit, candle in hand
  spirit_guide: (
    <Gl>
      <path d="M5 1.4 C7 1.4 7.8 3.2 7.8 5.4 L7.8 8.6 L6.6 7.6 L5.6 9 L4.6 7.6 L3.4 9 L2.2 7.6 L2.2 5.4 C2.2 3.2 3 1.4 5 1.4 Z" fill="#7fd8d8" fillOpacity="0.7" stroke="#4a6b8f" strokeWidth="0.5" {...SJ} />
      <path d="M4 4 H4.8 M5.6 4 H6.4" stroke="#12303a" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M5 5.6 C5.5 6.1 5.5 6.6 5 7.1 C4.5 6.6 4.5 6.1 5 5.6 Z" fill="#ffd76a" />
    </Gl>
  ),
  // a piece passing THROUGH its neighbour
  phase_army: (
    <Gl>
      <path d="M3.2 2.6 C4.6 2.6 5.4 3.8 5.4 5 C5.4 6.2 4.6 7.4 3.2 7.4 C1.8 7.4 1 6.2 1 5 C1 3.8 1.8 2.6 3.2 2.6 Z" fill="none" stroke="#8f6bff" strokeWidth="0.6" strokeDasharray="1 0.7" />
      <path d="M6.2 2.2 C7.8 2.2 8.8 3.6 8.8 5 C8.8 6.4 7.8 7.8 6.2 7.8 C5.4 7.8 4.8 7.4 4.4 6.8 C5.2 6.4 5.6 5.8 5.6 5 C5.6 4.2 5.2 3.6 4.4 3.2 C4.8 2.6 5.4 2.2 6.2 2.2 Z" fill="#e3d0ff" stroke="#8f6bff" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // a pawn vaulting its blocker
  ghost_legion: (
    <Gl>
      <path d="M2 8.8 C2 7.2 4 7.2 4 8.8 Z" fill="#c9cdd6" stroke="#5a6b8f" strokeWidth="0.4" {...SJ} />
      <circle cx="3" cy="6.4" r="0.9" fill="#c9cdd6" stroke="#5a6b8f" strokeWidth="0.4" />
      <path d="M3.6 4.6 C4.6 2.6 6.4 2.6 7.4 4.4" fill="none" stroke="#7fd8d8" strokeWidth="0.6" strokeDasharray="0.9 0.7" strokeLinecap="round" />
      <path d="M7.4 4.4 L7.2 3.4 M7.4 4.4 L8.3 4" stroke="#7fd8d8" strokeWidth="0.5" strokeLinecap="round" />
      <circle cx="7.6" cy="6.2" r="0.7" fill="#eef8ff" fillOpacity="0.8" stroke="#7fd8d8" strokeWidth="0.4" />
      <path d="M6.9 8.8 C6.9 7.4 8.3 7.4 8.3 8.8 Z" fill="#eef8ff" fillOpacity="0.8" stroke="#7fd8d8" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // the chooser's winged helm
  valkyrie: (
    <Gl>
      <path d="M3.2 4.6 C3.2 2.6 6.8 2.6 6.8 4.6 V6.4 L6 8 H4 L3.2 6.4 Z" fill="#c9cdd6" stroke="#5a6b8f" strokeWidth="0.5" {...SJ} />
      <path d="M4.3 5.2 H4.8 M5.2 5.2 H5.7 M4.6 8 V6.6 H5.4 V8" stroke="#2c3e6b" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M3 4 C1.8 3.4 1.2 2.4 1.4 1.2 C2.6 1.6 3.2 2.6 3.2 3.8 Z M7 4 C8.2 3.4 8.8 2.4 8.6 1.2 C7.4 1.6 6.8 2.6 6.8 3.8 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),

  /* --- ClockSpire -------------------------------------------------------------------------------------- */
  // two arrows chasing around the dial
  extra_move_repeat: (
    <Gl>
      <path d="M7.6 3 A3.4 3.4 0 0 0 2.6 3.4" fill="none" stroke="#6fe3ff" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M2.2 1.8 L2.5 3.8 L4.3 3 Z" fill="#6fe3ff" />
      <path d="M2.4 7 A3.4 3.4 0 0 0 7.4 6.6" fill="none" stroke="#ffd76a" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M7.8 8.2 L7.5 6.2 L5.7 7 Z" fill="#ffd76a" />
    </Gl>
  ),
  // the stopped hands, held at the wrist
  time_stop_short: (
    <Gl>
      <circle cx="5" cy="5" r="3.8" fill="none" stroke="#6fe3ff" strokeWidth="0.6" />
      <path d="M5 5 L5 2.2 M5 5 L7.2 6.2" stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M3 3.4 L7 6.8" stroke="#3a3766" strokeWidth="0.9" strokeLinecap="round" />
    </Gl>
  ),
  // the dial wound three hours widdershins
  time_rewind: (
    <Gl>
      <circle cx="5" cy="5" r="3.8" fill="none" stroke="#8f6bff" strokeWidth="0.6" />
      <path d="M7.7 2.8 A3.8 3.8 0 1 0 8.8 5.4" fill="none" stroke="#6fe3ff" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M8 0.9 L7.5 3.2 L9.6 2.6 Z" fill="#6fe3ff" />
      <path d="M5 5 L5 3 M5 5 L3.6 6" stroke="#ffd76a" strokeWidth="0.7" strokeLinecap="round" />
    </Gl>
  ),
  // two calendar days, struck through
  lost_days: (
    <Gl>
      <rect x="1.4" y="2.2" width="3.4" height="3.8" rx="0.5" fill="#cdd6ff" stroke="#5a6b8f" strokeWidth="0.4" />
      <rect x="5.2" y="4" width="3.4" height="3.8" rx="0.5" fill="#cdd6ff" stroke="#5a6b8f" strokeWidth="0.4" />
      <path d="M1.4 3.4 H4.8 M5.2 5.2 H8.6" stroke="#5a6b8f" strokeWidth="0.5" />
      <path d="M2 4.2 L4.2 5.6 M4.2 4.2 L2 5.6 M5.8 6 L8 7.4 M8 6 L5.8 7.4" stroke="#c94a5a" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // the hourglass with a siphon tapped into it
  wa_stolen_hours: (
    <Gl>
      <path d="M2.6 1.4 H7.4 L5.8 5 L7.4 8.6 H2.6 L4.2 5 Z" fill="none" stroke="#e8c97a" strokeWidth="0.6" {...SJ} />
      <path d="M4 2.4 H6 L5 4.4 Z" fill="#ffd76a" />
      <path d="M5 5.4 L5.6 8 H4.4 Z" fill="#ffd76a" />
      <path d="M5.8 5 C7.2 4.6 8.2 3.6 8.6 2.2" fill="none" stroke="#6fe3ff" strokeWidth="0.6" strokeLinecap="round" strokeDasharray="0.9 0.7" />
    </Gl>
  ),

  /* --- CardRite ---------------------------------------------------------------------------------------------- */
  // one buff struck out for good
  sever: (
    <Gl>
      <rect x="2.6" y="1.6" width="4.8" height="6.8" rx="0.7" fill="#e3d0ff" stroke="#6b4a8f" strokeWidth="0.5" />
      <path d="M4 3.2 H6 M3.6 4.6 H6.4" stroke="#6b4a8f" strokeWidth="0.4" strokeLinecap="round" />
      <path d="M1.6 8.4 L8.4 1.8" stroke="#c94a5a" strokeWidth="0.9" strokeLinecap="round" />
    </Gl>
  ),
  // their draft crushed to the bottom of the deck
  draft_domination: (
    <Gl>
      <rect x="2.4" y="4" width="5.2" height="4.6" rx="0.6" fill="#8a94a8" stroke="#3a3a40" strokeWidth="0.5" />
      <path d="M5 1 V4.8 M5 4.8 L3.6 3.4 M5 4.8 L6.4 3.4" fill="none" stroke="#c94a5a" strokeWidth="0.8" {...SJ} />
      <path d="M3.4 6.4 H6.6 M3.8 7.4 H6.2" stroke="#c9cdd6" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // the null seal over their spells
  total_nullify: (
    <Gl>
      <rect x="2.4" y="1.6" width="5.2" height="6.8" rx="0.7" fill="#c9cdd6" stroke="#5c5c63" strokeWidth="0.5" />
      <circle cx="5" cy="5" r="2.2" fill="none" stroke="#c94a5a" strokeWidth="0.7" />
      <path d="M3.4 6.6 L6.6 3.4" stroke="#c94a5a" strokeWidth="0.7" strokeLinecap="round" />
    </Gl>
  ),
  // the chart where every house agrees
  favorable_stars: (
    <Gl>
      <circle cx="5" cy="5" r="3.8" fill="none" stroke="#c9a84c" strokeWidth="0.5" />
      <path d="M2.4 6.6 L4.2 5.2 L5.8 6 L7.6 3.6" fill="none" stroke="#cdd6ff" strokeWidth="0.5" strokeLinecap="round" />
      <circle cx="2.4" cy="6.6" r="0.5" fill="#ffd76a" />
      <circle cx="4.2" cy="5.2" r="0.4" fill="#cdd6ff" />
      <circle cx="5.8" cy="6" r="0.4" fill="#cdd6ff" />
      <circle cx="7.6" cy="3.6" r="0.6" fill="#ffd76a" />
    </Gl>
  ),
  // the Tower arcana: struck, cracked, falling
  the_tower: (
    <Gl>
      <path d="M3.4 9 L3.8 3 H6.2 L6.6 9 Z" fill="#5a6b8f" stroke="#2c3e6b" strokeWidth="0.5" {...SJ} />
      <path d="M3.4 3 L3 1.8 L4.4 2.4 L5 1.2 L5.6 2.4 L7 1.8 L6.6 3 Z" fill="#c94a3a" stroke="#5a1512" strokeWidth="0.4" {...SJ} />
      <path d="M8.6 0.8 L6.4 2.6 L7.4 3 L5.8 4.6" fill="none" stroke="#ffd166" strokeWidth="0.6" {...SJ} />
      <path d="M5 5.4 L4.6 7 L5.4 7.6" fill="none" stroke="#2c3e6b" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // the thirteenth card: the sickle moon and a fallen rose
  death_arcana: (
    <Gl>
      <path d="M6.8 1.4 A4.2 4.2 0 1 0 8.8 6.2 A3.4 3.4 0 0 1 6.8 1.4 Z" fill="#12081f" stroke="#8f6bff" strokeWidth="0.5" {...SJ} />
      <circle cx="3.4" cy="6.8" r="1" fill="#c94a5a" stroke="#5a1512" strokeWidth="0.4" />
      <path d="M3.4 7.8 C3.4 8.6 3 9.2 2.4 9.6" fill="none" stroke="#3f8f3f" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a clean fresh chessboard, dealt like a card
  chess_diff: (
    <Gl>
      <rect x="1.8" y="1.8" width="6.4" height="6.4" fill="#eef1f7" stroke="#3a3a40" strokeWidth="0.5" />
      <path d="M1.8 1.8 H3.4 V3.4 H1.8 Z M5 1.8 H6.6 V3.4 H5 Z M3.4 3.4 H5 V5 H3.4 Z M6.6 3.4 H8.2 V5 H6.6 Z M1.8 5 H3.4 V6.6 H1.8 Z M5 5 H6.6 V6.6 H5 Z M3.4 6.6 H5 V8.2 H3.4 Z M6.6 6.6 H8.2 V8.2 H6.6 Z" fill="#5a6b8f" />
    </Gl>
  ),
  // three cards, one greedy hand's fan
  wa_greed: (
    <Gl>
      <rect x="1.2" y="2.6" width="3.4" height="5.2" rx="0.5" transform="rotate(-14 2.9 5.2)" fill="#e3d0ff" stroke="#6b4a8f" strokeWidth="0.4" />
      <rect x="3.3" y="2.2" width="3.4" height="5.2" rx="0.5" fill="#cdd6ff" stroke="#5a6b8f" strokeWidth="0.4" />
      <rect x="5.4" y="2.6" width="3.4" height="5.2" rx="0.5" transform="rotate(14 7.1 5.2)" fill="#ffe9b0" stroke="#8a6a3a" strokeWidth="0.4" />
      <circle cx="7.1" cy="5.2" r="0.7" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.3" />
    </Gl>
  ),
  // the riddle: a question-marked scroll
  riddle_game: (
    <Gl>
      <path d="M2.4 2 H7.6 V8 L6.6 8.8 L5.6 8.2 L4.6 9 L3.6 8.2 L2.4 8.6 Z" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.5" {...SJ} />
      <path d="M3.8 3.8 C3.8 2.6 6.2 2.6 6.2 3.9 C6.2 4.9 5 4.9 5 5.9" fill="none" stroke="#5a6b8f" strokeWidth="0.7" strokeLinecap="round" />
      <circle cx="5" cy="7.2" r="0.5" fill="#5a6b8f" />
    </Gl>
  ),
  // the recovery certificate, ribboned
  rehab: (
    <Gl>
      <rect x="2" y="1.8" width="6" height="6.4" rx="0.5" fill="#eef1f7" stroke="#5a6b8f" strokeWidth="0.5" />
      <path d="M3.2 3.2 H6.8 M3.2 4.4 H6.8 M3.2 5.6 H5.4" stroke="#8a94a8" strokeWidth="0.4" strokeLinecap="round" />
      <circle cx="6.6" cy="7" r="0.9" fill="#5fc9b0" stroke="#1c7a4a" strokeWidth="0.4" />
      <path d="M6.2 7.8 L5.8 9.2 M7 7.8 L7.4 9.2" stroke="#1c7a4a" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // release papers, stamped and signed
  parole: (
    <Gl>
      <rect x="2" y="1.6" width="6" height="6.8" rx="0.5" fill="#eef1f7" stroke="#5a6b8f" strokeWidth="0.5" />
      <path d="M3.2 3 H6.8 M3.2 4.2 H6.8 M3.2 5.4 H6" stroke="#8a94a8" strokeWidth="0.4" strokeLinecap="round" />
      <path d="M3 7.2 C3.8 6.6 4.6 7.6 5.4 7" fill="none" stroke="#2c3e6b" strokeWidth="0.5" strokeLinecap="round" />
      <rect x="5.8" y="6.2" width="1.9" height="1.4" rx="0.2" fill="none" stroke="#c94a5a" strokeWidth="0.5" transform="rotate(-12 6.7 6.9)" />
    </Gl>
  ),
  // the long leash, unclipped for seven turns
  long_leash: (
    <Gl>
      <path d="M1.6 8.4 C3 7.4 3.4 5.8 3 4.2 C2.8 3 3.4 2 4.6 1.6" fill="none" stroke="#b58a5a" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M5.2 1.8 C5.8 2.6 6.6 2.8 7.4 2.4" fill="none" stroke="#b58a5a" strokeWidth="0.7" strokeLinecap="round" strokeDasharray="1 0.8" />
      <circle cx="4.9" cy="1.7" r="0.6" fill="none" stroke="#8a6a3a" strokeWidth="0.5" />
      <path d="M7.6 2.2 C8.4 3.4 8.4 5 7.6 6.2" fill="none" stroke="#8a94a8" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // the warden's coin purse
  wardens_bribe: (
    <Gl>
      <path d="M3.2 3.6 H6.8 C7.8 5 8 7 7.4 8.8 H2.6 C2 7 2.2 5 3.2 3.6 Z" fill="#8a6a3a" stroke="#4a3a22" strokeWidth="0.5" {...SJ} />
      <path d="M3.6 3.6 C3.6 2.6 4.2 2 5 2 C5.8 2 6.4 2.6 6.4 3.6" fill="none" stroke="#4a3a22" strokeWidth="0.6" strokeLinecap="round" />
      <circle cx="5" cy="6.2" r="1.2" fill="#ffd76a" stroke="#8a6414" strokeWidth="0.4" />
      <path d="M5 5.6 V6.8" stroke="#8a6414" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // the iron heart that shrugs the loss
  iron_will: (
    <Gl>
      <path d="M5 8.8 C2 6.6 1.2 4.4 2.2 2.8 C3 1.6 4.4 1.8 5 3 C5.6 1.8 7 1.6 7.8 2.8 C8.8 4.4 8 6.6 5 8.8 Z" fill="#8a94a8" stroke="#3a3a40" strokeWidth="0.5" {...SJ} />
      <path d="M3 4.4 H4.2 M5.8 4.4 H7 M4.2 4.4 V5.6 M5.8 4.4 V5.6" stroke="#3a3a40" strokeWidth="0.4" strokeLinecap="round" />
      <circle cx="3.6" cy="3.4" r="0.25" fill="#c9cdd6" />
      <circle cx="6.4" cy="3.4" r="0.25" fill="#c9cdd6" />
    </Gl>
  ),
  // the map held upside down
  wc_wrong_way: (
    <Gl>
      <path d="M1.8 2.4 L4 3.2 L6 2.4 L8.2 3.2 V7.6 L6 6.8 L4 7.6 L1.8 6.8 Z" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.5" {...SJ} />
      <path d="M4 3.2 V7.6 M6 2.4 V6.8" stroke="#8a6a3a" strokeWidth="0.35" />
      <path d="M5 9.4 L5 8.4 M4.4 8.9 L5 9.5 L5.6 8.9" fill="none" stroke="#c94a5a" strokeWidth="0.6" {...SJ} />
      <path d="M3 4.6 C3.8 5.4 5.4 5 6.6 4.2" fill="none" stroke="#c94a5a" strokeWidth="0.5" strokeLinecap="round" strokeDasharray="0.8 0.6" />
    </Gl>
  ),
  // OUT OF ORDER, taped to the lift
  wc_broken_elevator: (
    <Gl>
      <rect x="2.4" y="1.4" width="5.2" height="7.2" rx="0.5" fill="#8a94a8" stroke="#3a3a40" strokeWidth="0.5" />
      <path d="M5 1.4 V8.6" stroke="#3a3a40" strokeWidth="0.5" />
      <rect x="3" y="3.6" width="4" height="2.6" rx="0.3" transform="rotate(-8 5 4.9)" fill="#ffe9b0" stroke="#8a6a3a" strokeWidth="0.4" />
      <path d="M3.6 4.5 L6.2 4.1 M3.7 5.3 L5.6 5" stroke="#c94a5a" strokeWidth="0.45" strokeLinecap="round" />
    </Gl>
  ),
  // the dark court's contract, sealed in dusk-wax
  unseelie_bargain: (
    <Gl>
      <path d="M2.4 1.6 H7.6 V8.4 H2.4 Z" fill="#2a1030" stroke="#8f6bff" strokeWidth="0.5" {...SJ} />
      <path d="M3.4 3 H6.6 M3.4 4.2 H6.6 M3.4 5.4 H5.6" stroke="#b98cff" strokeWidth="0.4" strokeLinecap="round" />
      <circle cx="6.2" cy="7" r="0.9" fill="#c94a5a" stroke="#5a1512" strokeWidth="0.35" />
      <path d="M5.9 6.7 L6.5 7.3 M6.5 6.7 L5.9 7.3" stroke="#5a1512" strokeWidth="0.3" strokeLinecap="round" />
    </Gl>
  ),

  /* --- ThiefHand ------------------------------------------------------------------------------------------------- */
  // one buff, bagged
  buff_thief: (
    <Gl>
      <path d="M2.6 4.4 H7.4 L8 9 H2 Z" fill="#3a3a45" stroke="#8f6bff" strokeWidth="0.5" {...SJ} />
      <path d="M3.6 4.4 C3.6 3 6.4 3 6.4 4.4" fill="none" stroke="#8f6bff" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M5 5.6 L5.4 6.4 L6.2 6.5 L5.6 7.1 L5.8 7.9 L5 7.5 L4.2 7.9 L4.4 7.1 L3.8 6.5 L4.6 6.4 Z" fill="#ffd76a" />
    </Gl>
  ),
  // two buffs, siphoned up the tube
  buff_siphon: (
    <Gl>
      <path d="M2.2 8.6 C2.2 7 3.4 6.4 4.6 6.8 C4.8 5.4 6.6 5.2 7.2 6.4" fill="none" stroke="#c94ad1" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M7.4 6.2 C8.2 4.6 8.2 3 7.4 1.6" fill="none" stroke="#8f6bff" strokeWidth="0.8" strokeLinecap="round" strokeDasharray="1 0.8" />
      <path d="M2.6 7.6 L3 8.4 L3.8 8.5 L3.2 9.1 L3.4 9.9 L2.6 9.5 L1.8 9.9 L2 9.1 L1.4 8.5 L2.2 8.4 Z" fill="#ffd76a" transform="translate(0,-1.2)" />
      <circle cx="5.8" cy="6.4" r="0.7" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.3" />
    </Gl>
  ),
  // a spell wrenched out of their book
  wa_spelltheft: (
    <Gl>
      <path d="M2 2 H6.6 C7.4 2 8 2.6 8 3.4 V8 C7.4 7.6 6.8 7.4 6 7.4 H2 Z" fill="#5b2b8f" stroke="#e3d0ff" strokeWidth="0.5" {...SJ} />
      <path d="M2 2 V7.4" stroke="#e3d0ff" strokeWidth="0.5" />
      <path d="M4.4 4.2 L5 3 L5.6 4.2 L6.8 4.4 L5.9 5.2 L6.2 6.4 L5 5.8 L3.8 6.4 L4.1 5.2 L3.2 4.4 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.3" {...SJ} />
    </Gl>
  ),
  // both draft cards, palmed at once
  draft_seize: (
    <Gl>
      <rect x="1.8" y="2.4" width="3.2" height="5" rx="0.5" transform="rotate(-10 3.4 4.9)" fill="#e3d0ff" stroke="#6b4a8f" strokeWidth="0.4" />
      <rect x="5" y="2.4" width="3.2" height="5" rx="0.5" transform="rotate(10 6.6 4.9)" fill="#cdd6ff" stroke="#5a6b8f" strokeWidth="0.4" />
      <path d="M3 8.4 C4.4 9.2 5.6 9.2 7 8.4" fill="none" stroke="#3a3a45" strokeWidth="0.8" strokeLinecap="round" />
    </Gl>
  ),
  // every rank dragged one square home
  collapse: (
    <Gl>
      <path d="M2.2 2 V6.4 M5 1.4 V6.8 M7.8 2 V6.4" stroke="#8f6bff" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M2.2 6.4 L1.4 5.2 M2.2 6.4 L3 5.2 M5 6.8 L4.2 5.6 M5 6.8 L5.8 5.6 M7.8 6.4 L7 5.2 M7.8 6.4 L8.6 5.2" fill="none" stroke="#8f6bff" strokeWidth="0.6" {...SJ} />
      <path d="M1.4 8.6 H8.6" stroke="#3a3a45" strokeWidth="0.8" strokeLinecap="round" />
    </Gl>
  ),
  // the hungry square, lips of the dark
  void: (
    <Gl>
      <path d="M1.8 1.8 H8.2 V8.2 H1.8 Z" fill="none" stroke="#8f6bff" strokeWidth="0.5" strokeDasharray="1.1 0.8" />
      <ellipse cx="5" cy="5" rx="2.6" ry="1.8" fill="#12081f" stroke="#b98cff" strokeWidth="0.5" />
      <ellipse cx="5" cy="5" rx="1.2" ry="0.7" fill="none" stroke="#5b2b8f" strokeWidth="0.4" />
    </Gl>
  ),
  // the wrench in their draft works
  wa_sabotage: (
    <Gl>
      <rect x="4.2" y="1.4" width="4.2" height="5.6" rx="0.6" transform="rotate(14 6.3 4.2)" fill="#cdd6ff" stroke="#5a6b8f" strokeWidth="0.4" />
      <path d="M1.6 8.6 L4.6 5.6 M1.6 8.6 C0.9 7.6 1 6.6 1.8 5.9 L2.9 7 L4 5.9 L2.9 4.8 C3.6 4 4.6 3.9 5.6 4.6" fill="none" stroke="#3a3a45" strokeWidth="0.7" {...SJ} />
    </Gl>
  ),
  // their outstretched hand, and nothing in it
  empty_handed: (
    <Gl>
      <path d="M2.6 9 V5.6 M3.9 8.8 V4.4 M5.2 8.8 V4 M6.5 9 V4.8 M2.6 9 C4 9.8 5.6 9.8 6.5 9" fill="none" stroke="#8a94a8" strokeWidth="0.8" strokeLinecap="round" />
      <rect x="3" y="1" width="3.4" height="2.4" rx="0.4" fill="none" stroke="#c94a5a" strokeWidth="0.5" strokeDasharray="0.9 0.7" />
      <path d="M3.8 1.6 L5.8 2.8 M5.8 1.6 L3.8 2.8" stroke="#c94a5a" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),

  /* --- CrownForge ---------------------------------------------------------------------------------------------------- */
  // one pawn, one instant crown
  double_queen: (
    <Gl>
      <circle cx="5" cy="6.2" r="1.1" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.4" />
      <path d="M3.6 9.2 C3.6 7.6 6.4 7.6 6.4 9.2 Z" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <path d="M2.8 4.2 V1.8 L4 2.9 L5 1.2 L6 2.9 L7.2 1.8 V4.2 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // two crowns of the fifth rank
  twin_queens: (
    <Gl>
      <path d="M1.2 5.4 V3 L2.3 4 L3.1 2.6 L3.9 4 L5 3 V5.4 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <path d="M5 7.6 V5.2 L6.1 6.2 L6.9 4.8 L7.7 6.2 L8.8 5.2 V7.6 Z" fill="#ffe9b0" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // a rank of pawns under knightly helms
  promotion_storm: (
    <Gl>
      <path d="M1.6 8.8 C1.6 6.6 2.4 5.6 3.6 5.4 L4.2 6.4 L3.6 7 C3.6 7.8 3.2 8.8 2.6 8.8 Z" fill="#c9cdd6" stroke="#5a6b8f" strokeWidth="0.4" {...SJ} />
      <path d="M5.6 8.8 C5.6 6.6 6.4 5.6 7.6 5.4 L8.2 6.4 L7.6 7 C7.6 7.8 7.2 8.8 6.6 8.8 Z" fill="#c9cdd6" stroke="#5a6b8f" strokeWidth="0.4" {...SJ} />
      <path d="M2 3.6 L3 2 L4 3.6 M6 3.6 L7 2 L8 3.6" fill="none" stroke="#ffd76a" strokeWidth="0.6" {...SJ} />
    </Gl>
  ),
  // two pawns knighted where they stand
  mass_promote_minor: (
    <Gl>
      <circle cx="3" cy="4" r="0.9" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.35" />
      <path d="M1.8 6.8 C1.8 5.4 4.2 5.4 4.2 6.8 Z" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.35" {...SJ} />
      <path d="M5.6 8.8 C5.6 6.2 6.6 4.8 8.2 4.6 L9 5.8 L8.2 6.4 C8.2 7.6 7.6 8.8 6.8 8.8 Z" fill="#c9cdd6" stroke="#5a6b8f" strokeWidth="0.4" {...SJ} />
      <path d="M4.6 4.6 L6 3.4 M6 3.4 L5.8 2.4 M6 3.4 L7 3.5" fill="none" stroke="#ffd76a" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // the queen brought back from the velvet box
  resurrect_queen: (
    <Gl>
      <path d="M2 8.8 L2.6 5.6 H7.4 L8 8.8 Z" fill="#6b1a2a" stroke="#3a0e1a" strokeWidth="0.5" {...SJ} />
      <path d="M2.6 5.6 C2.2 4.6 2.6 3.8 3.4 3.6" fill="none" stroke="#3a0e1a" strokeWidth="0.4" />
      <path d="M3.4 4.6 V2.6 L4.3 3.5 L5 2 L5.7 3.5 L6.6 2.6 V4.6 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.45" {...SJ} />
      <path d="M4 1.4 L5 0.6 L6 1.4" fill="none" stroke="#fff2c9" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // the forge of the old kings: tongs holding a rook blank
  legendary_forge: (
    <Gl>
      <path d="M2 1.6 C3.2 3.2 3.2 5.2 2 6.8 M8 1.6 C6.8 3.2 6.8 5.2 8 6.8" fill="none" stroke="#8a94a8" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M3.8 7.6 L4.1 5.2 H3.8 V4 H4.6 V4.5 H5.4 V4 H6.2 V5.2 H5.9 L6.2 7.6 Z" fill="#ff9d3d" stroke="#7a2e0e" strokeWidth="0.4" {...SJ} />
      <path d="M3 8.8 H7" stroke="#5c5348" strokeWidth="0.7" strokeLinecap="round" />
      <circle cx="5" cy="2.4" r="0.4" fill="#ffd166" />
    </Gl>
  ),
  // the king who moves as the queen
  royal_ascension: (
    <Gl>
      <path d="M5 1 V2.6 M4.3 1.8 H5.7" stroke="#ffd76a" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M3.4 5.4 L3 3.2 L4.1 4 L5 2.8 L5.9 4 L7 3.2 L6.6 5.4 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.45" {...SJ} />
      <path d="M3.4 6 H6.6 L6.2 8.8 H3.8 Z" fill="#b98cff" stroke="#5b2b8f" strokeWidth="0.45" {...SJ} />
      <path d="M1.4 7.4 H2.4 M7.6 7.4 H8.6 M5 9.4 V8.8" stroke="#e3d0ff" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // two crowns, one board
  second_king: (
    <Gl>
      <path d="M2.6 4.8 L2.2 2.8 L3.3 3.6 L4 2.4 L4.7 3.6 L5.8 2.8 L5.4 4.8 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <path d="M4 1.8 V0.8 M3.5 1.3 H4.5" stroke="#ffd76a" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M5.4 8.6 L5 6.6 L6.1 7.4 L6.8 6.2 L7.5 7.4 L8.6 6.6 L8.2 8.6 Z" fill="#ffe9b0" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <path d="M6.8 5.6 V4.6 M6.3 5.1 H7.3" stroke="#ffe9b0" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // the leaden crown, heavy and unkillable
  wa_leaden_crown: (
    <Gl>
      <path d="M2.4 6.8 V3.4 L3.8 4.6 L5 2.8 L6.2 4.6 L7.6 3.4 V6.8 Z" fill="#6e6e78" stroke="#3a3a40" strokeWidth="0.5" {...SJ} />
      <circle cx="5" cy="5.6" r="0.5" fill="#c9a84c" />
      <path d="M3 8.4 H7 M3.8 9.4 H6.2" stroke="#3a3a40" strokeWidth="0.6" strokeLinecap="round" />
    </Gl>
  ),
  // every piece stepping like the king: crown over a compass rose
  overclock_major: (
    <Gl>
      <path d="M3.4 3.6 L3 1.8 L4.1 2.6 L5 1.2 L5.9 2.6 L7 1.8 L6.6 3.6 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <path d="M5 4.6 V9 M2.8 6.8 H7.2 M3.4 5.2 L6.6 8.4 M6.6 5.2 L3.4 8.4" stroke="#6fe3ff" strokeWidth="0.55" strokeLinecap="round" />
      <circle cx="5" cy="6.8" r="0.6" fill="#ffffff" stroke="#3a5fbf" strokeWidth="0.3" />
    </Gl>
  ),
  // the knight in amazon regalia
  ascendant_knight: (
    <Gl>
      <path d="M3.2 8.8 C3.2 5.6 4.4 4 6.2 3.8 L7.2 5.2 L6.2 6 C6.2 7.2 5.6 8.8 4.6 8.8 Z" fill="#b98cff" stroke="#5b2b8f" strokeWidth="0.5" {...SJ} />
      <circle cx="6" cy="4.8" r="0.35" fill="#5b2b8f" />
      <path d="M3.6 3.4 L3.2 1.6 L4.3 2.4 L5.1 1 L5.9 2.4 L7 1.6 L6.6 3.4" fill="none" stroke="#ffd76a" strokeWidth="0.55" {...SJ} />
    </Gl>
  ),
  // the shackle, broken on the anvil
  nerf_breaker: (
    <Gl>
      <path d="M2.2 3.2 C2.2 1.6 4 0.8 5 1.8" fill="none" stroke="#8a94a8" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M6 2.2 C7.2 2.6 7.8 3.8 7.4 5" fill="none" stroke="#8a94a8" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M5.2 1.4 L5.9 2.6 M6.3 1.2 L6.1 2.4" stroke="#ffd166" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M2.6 6.2 H7.4 L6.8 8.6 H3.2 Z" fill="#5c5c63" stroke="#2a2a30" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),

  /* --- RiftGate ------------------------------------------------------------------------------------------------------- */
  // one step into the hedgerow, one step out
  fey_step: (
    <Gl>
      <path d="M2 8.6 C1.4 6.6 1.8 4.8 3 3.4 C3.8 4.8 3.8 6.6 3.2 8.6 Z" fill="#3f8f3f" stroke="#1c4a1c" strokeWidth="0.4" {...SJ} />
      <path d="M8 8.6 C8.6 6.6 8.2 4.8 7 3.4 C6.2 4.8 6.2 6.6 6.8 8.6 Z" fill="#3f8f3f" stroke="#1c4a1c" strokeWidth="0.4" {...SJ} />
      <path d="M3.8 5.6 C4.4 4.6 5.6 4.6 6.2 5.6" fill="none" stroke="#a8e07f" strokeWidth="0.6" strokeDasharray="0.9 0.7" strokeLinecap="round" />
      <path d="M6.2 5.6 L5.8 4.8 M6.2 5.6 L7 5.4" stroke="#a8e07f" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // anywhere at all: a door standing open in nothing
  rift_walker: (
    <Gl>
      <path d="M3 8.8 V2 H7 V8.8" fill="none" stroke="#8f6bff" strokeWidth="0.7" {...SJ} />
      <path d="M3 2 L4.4 3 V8.8" fill="#12081f" stroke="#8f6bff" strokeWidth="0.4" {...SJ} />
      <circle cx="5.9" cy="5.4" r="0.4" fill="#6fe3ff" />
      <path d="M1.6 8.8 H8.4" stroke="#8f6bff" strokeWidth="0.5" strokeLinecap="round" strokeDasharray="1 0.7" />
    </Gl>
  ),
  // the mirror that keeps what it sees
  mirror_of_souls: (
    <Gl>
      <ellipse cx="5" cy="4.8" rx="2.8" ry="3.6" fill="#bfe6ff" fillOpacity="0.5" stroke="#c9a84c" strokeWidth="0.6" />
      <path d="M3.8 3 C4.6 2.4 5.6 2.4 6.4 3.2" fill="none" stroke="#ffffff" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M4.2 5.8 C4.2 4.6 5.8 4.6 5.8 5.8 L5.6 6.8 H4.4 Z" fill="#5a6b8f" stroke="#2c3e6b" strokeWidth="0.35" {...SJ} />
      <path d="M3.6 9.2 H6.4 M5 8.4 V9.2" stroke="#c9a84c" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // the conjured tower, half-real
  wa_conjure_rook: (
    <Gl>
      <path d="M3.2 8.8 L3.6 4.6 H3.2 V3 H4.2 V3.6 H5.8 V3 H6.8 V4.6 H6.4 L6.8 8.8 Z" fill="#8f6bff" fillOpacity="0.55" stroke="#e3d0ff" strokeWidth="0.5" {...SJ} />
      <path d="M2 6.2 L2.8 6.2 M7.2 6.2 L8 6.2 M2.4 4 L3 4.4 M7.6 4 L7 4.4" stroke="#6fe3ff" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // twin familiars, pocketed
  wa_twin_familiars: (
    <Gl>
      <circle cx="3.2" cy="3.2" r="0.6" fill="#7fd8d8" stroke="#4a6b8f" strokeWidth="0.3" />
      <path d="M2.4 6.6 L2.8 4.4 C3 3.9 3.4 3.9 3.6 4.4 L4 6.6 Z" fill="#7fd8d8" stroke="#4a6b8f" strokeWidth="0.35" {...SJ} />
      <circle cx="6.8" cy="4.4" r="0.6" fill="#e3d0ff" stroke="#6b4a8f" strokeWidth="0.3" />
      <path d="M6 7.8 L6.4 5.6 C6.6 5.1 7 5.1 7.2 5.6 L7.6 7.8 Z" fill="#e3d0ff" stroke="#6b4a8f" strokeWidth="0.35" {...SJ} />
    </Gl>
  ),
  // the old current under the file
  ley_line: (
    <Gl>
      <path d="M5 0.8 V9.2" stroke="#5fc9b0" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M3.6 2.4 C4.4 3 5.6 3 6.4 2.4 M3.6 5 C4.4 5.6 5.6 5.6 6.4 5 M3.6 7.6 C4.4 8.2 5.6 8.2 6.4 7.6" fill="none" stroke="#a8e07f" strokeWidth="0.5" strokeLinecap="round" />
      <circle cx="5" cy="5" r="0.5" fill="#e8fff7" />
    </Gl>
  ),

  /* --- BeastRush -------------------------------------------------------------------------------------------------------- */
  // the twilight horn that starts the Hunt
  wild_hunt: (
    <Gl>
      <path d="M2 7.4 C2.6 5 4.6 3.4 7.4 3 C8.2 2.9 8.8 3.4 8.6 4.2 C8.2 5.8 6.4 7.6 3.4 8.2 C2.6 8.4 1.8 8.2 2 7.4 Z" fill="#5b2b8f" stroke="#e3d0ff" strokeWidth="0.5" {...SJ} />
      <path d="M2.2 6.6 L1.2 6.2 M8.6 3.6 C9.2 3.2 9.4 2.6 9.2 1.8" fill="none" stroke="#e3d0ff" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M4.4 5.4 C5.2 4.8 6.2 4.4 7.2 4.4" fill="none" stroke="#b98cff" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // the young dragon, saddled
  dragon_mount: (
    <Gl>
      <path d="M2.4 6.8 C3 4.8 4.6 3.8 6.4 4 L7.6 3 L8.4 4.2 L7.4 5 C7.4 6.6 6 8 4.2 8 Z" fill="#4a8f5f" stroke="#1c4a2c" strokeWidth="0.5" {...SJ} />
      <circle cx="7.3" cy="4.3" r="0.3" fill="#1c4a2c" />
      <path d="M4.6 4.2 C4.2 3 4.6 1.8 5.8 1.2 C6 2.4 5.6 3.4 4.9 4.1" fill="#d6234f" stroke="#5a1512" strokeWidth="0.4" {...SJ} />
      <path d="M4.2 5.4 H5.8 V6.4 H4.2 Z" fill="#8a6a3a" stroke="#4a3a22" strokeWidth="0.35" />
    </Gl>
  ),
  // the bandit's bonking log
  sahur: (
    <Gl>
      <rect x="1.6" y="3.8" width="6.8" height="2.4" rx="1.2" transform="rotate(-18 5 5)" fill="#8a6a3a" stroke="#4a3a22" strokeWidth="0.5" />
      <ellipse cx="8" cy="3.5" rx="0.9" ry="1.1" transform="rotate(-18 8 3.5)" fill="#c9a84c" stroke="#4a3a22" strokeWidth="0.4" />
      <path d="M2.6 7.6 L2.2 8.6 M4 8 L3.8 9 M5.4 8.2 L5.6 9.2" stroke="#e8dcc0" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
};

/* =============================================================================
   Registry — CARD -> TEMPLATE / PALETTE / GLYPH, one entry per still-uncovered
   tier 5-6 card. `source` names an fx zone ONLY where the card reliably paints
   it (frozen / walnut / shield / kingSafe / stun / summon); everything else
   rides the removal diff or Board's diff-less lead branch.
   ========================================================================== */

/** Bind a template + palette + glyph + config into a SigPlugin entry. The
 * optional trailing `flourish` keys a bespoke extra scene for a marquee card
 * (rendering only — the config object is untouched). */
function G(
  Template: ComponentType<TemplateProps>,
  palette: Palette,
  glyph: ReactNode,
  config: SigPlugin["config"],
  flourish?: string,
): SigPlugin {
  return {
    config,
    Render: function GreatPlayRender({ lead, delayMs }: { lead: boolean; delayMs: number }) {
      return <Template palette={palette} glyph={glyph} lead={lead} delayMs={delayMs} flourish={flourish} />;
    },
  };
}

export const PLAYS: Record<string, SigPlugin> = {
  /* --- WitchCircle (the hex pool) ---------------------------------------- */
  ball_and_chain: G(WitchCircle, ["#6b4a8f", "#c9b0e8", "#2a1030"], GLYPH.ball_and_chain, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
  }),
  royal_summons: G(WitchCircle, ["#8f2bbf", "#ffd76a", "#2a1030"], GLYPH.royal_summons, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "shades",
  }),
  palsied_hands: G(WitchCircle, ["#6b4a8f", "#8faf4a", "#2f3a26"], GLYPH.palsied_hands, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
  }),
  throne_bound: G(WitchCircle, ["#5b2b8f", "#c94ad1", "#1c0f18"], GLYPH.throne_bound, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "shades",
  }),
  lone_sovereign: G(WitchCircle, ["#5a6b8f", "#cdd6ff", "#1c1c2a"], GLYPH.lone_sovereign, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
  }),
  peasant_levy: G(WitchCircle, ["#8a7a63", "#c9a84c", "#3a3026"], GLYPH.peasant_levy, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
  }),
  court_in_exile: G(WitchCircle, ["#6b1a2a", "#e8b04b", "#2b1218"], GLYPH.court_in_exile, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
  }),
  cast_a_nerf: G(WitchCircle, ["#8f6bff", "#ff9d3d", "#2a1030"], GLYPH.cast_a_nerf, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
  }),
  royal_handicap: G(WitchCircle, ["#8f2bbf", "#e3d0ff", "#1c0f18"], GLYPH.royal_handicap, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "shades",
  }),
  queens_handicap: G(WitchCircle, ["#c94ad1", "#e3d0ff", "#2a1030"], GLYPH.queens_handicap, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "shades",
  }),
  grounded_command: G(WitchCircle, ["#6b4a8f", "#ffd76a", "#1c1c2a"], GLYPH.grounded_command, {
    ordering: "sweep", staggerMs: 55, victims: ["q", "r"], hasLead: true, sound: "shades",
  }),
  lunar_eclipse: G(WitchCircle, ["#2c3e6b", "#cdd6ff", "#0d1326"], GLYPH.lunar_eclipse, {
    ordering: "sweep", staggerMs: 55, victims: ["q", "r"], hasLead: true, sound: "shades",
  }),
  hexed_satchel: G(WitchCircle, ["#8a6a3a", "#a8e07f", "#2f3a26"], GLYPH.hexed_satchel, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
  }),
  iron_furrow: G(WitchCircle, ["#8faf4a", "#c9a84c", "#2f3a26"], GLYPH.iron_furrow, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true, sound: "shades",
  }),
  leaden_fields: G(WitchCircle, ["#6e6e78", "#e8dcc0", "#2a2a30"], GLYPH.leaden_fields, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true, sound: "petrify",
  }),
  wc_voodoo_doll: G(WitchCircle, ["#6b4a8f", "#c94a5a", "#1c0f18"], GLYPH.wc_voodoo_doll, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
  }),
  wc_sticky_floor: G(WitchCircle, ["#c9a84c", "#ffd23f", "#4a3a22"], GLYPH.wc_sticky_floor, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "snooze",
  }),
  threads_of_fate: G(WitchCircle, ["#5a6b8f", "#cdd6ff", "#2c3e6b"], GLYPH.threads_of_fate, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "shades", source: "stun",
  }),
  mind_control: G(WitchCircle, ["#8f2bbf", "#c94ad1", "#12081f"], GLYPH.mind_control, {
    ordering: "radial", staggerMs: 0, victims: ["n", "b"], hasLead: true, sound: "shades",
  }),
  mind_dominion: G(WitchCircle, ["#5b2b8f", "#8f6bff", "#12081f"], GLYPH.mind_dominion, {
    ordering: "radial", staggerMs: 0, victims: ["r", "b"], hasLead: true, sound: "shades",
  }),

  /* --- StoneGaze (the walnut / petrify pool) -------------------------------- */
  medusas_verdict: G(StoneGaze, ["#8d8d94", "#7fae5a", "#4c4c53"], GLYPH.medusas_verdict, {
    ordering: "radial", staggerMs: 50, victims: "all", hasLead: true, sound: "petrify", source: "walnut",
  }, "medusa"),
  granite_ramparts: G(StoneGaze, ["#8a8478", "#c9b89a", "#4a4036"], GLYPH.granite_ramparts, {
    ordering: "sweep", staggerMs: 60, victims: ["r"], hasLead: true, sound: "petrify", source: "walnut",
  }),
  stone_menagerie: G(StoneGaze, ["#8d8d94", "#c9c9cf", "#3a3a40"], GLYPH.stone_menagerie, {
    ordering: "sweep", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "petrifiedforest", source: "walnut",
  }),
  stone_curse: G(StoneGaze, ["#8a6a4a", "#c9b89a", "#4a3a2a"], GLYPH.stone_curse, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", source: "walnut",
  }),
  stone_riders: G(StoneGaze, ["#8d8d94", "#b58a5a", "#4c4c53"], GLYPH.stone_riders, {
    ordering: "sweep", staggerMs: 60, victims: ["n"], hasLead: true, sound: "petrifiedforest", source: "walnut",
  }),
  stone_prelates: G(StoneGaze, ["#9a9a9a", "#e8dcc0", "#5c5c63"], GLYPH.stone_prelates, {
    ordering: "sweep", staggerMs: 60, victims: ["b"], hasLead: true, sound: "petrifiedforest", source: "walnut",
  }),
  stone_bastions: G(StoneGaze, ["#8a94a8", "#c9b89a", "#3a3a40"], GLYPH.stone_bastions, {
    ordering: "sweep", staggerMs: 60, victims: ["r"], hasLead: true, sound: "petrify", source: "walnut",
  }),
  queen_of_stone: G(StoneGaze, ["#8d8d94", "#ffd76a", "#4c4c53"], GLYPH.queen_of_stone, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "petrify", source: "walnut",
  }),
  eternal_statue: G(StoneGaze, ["#c9c9cf", "#7fae5a", "#6e6e74"], GLYPH.eternal_statue, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrifiedforest", source: "walnut",
  }, "statue"),
  nerf_hammer: G(StoneGaze, ["#8a6a4a", "#ff9d3d", "#4a3a2a"], GLYPH.nerf_hammer, {
    ordering: "radial", staggerMs: 0, victims: ["n", "b", "r"], hasLead: true, sound: "petrify", source: "walnut",
  }),

  /* --- ColdFront (the freeze pool) --------------------------------------------- */
  the_big_chill: G(ColdFront, ["#9fd8ff", "#e8f8ff", "#3f7fb5"], GLYPH.the_big_chill, {
    ordering: "sweep", staggerMs: 45, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen",
  }, "bigchill"),
  frozen_moment: G(ColdFront, ["#bfe6ff", "#ffffff", "#4f8fd1"], GLYPH.frozen_moment, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice",
  }),
  creeping_frost: G(ColdFront, ["#7fd8d8", "#dff7f7", "#3f6f9f"], GLYPH.creeping_frost, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "clockice", source: "frozen",
  }),
  glacial_flanks: G(ColdFront, ["#9fd8ff", "#c9cdd6", "#4f8fd1"], GLYPH.glacial_flanks, {
    ordering: "sweep", staggerMs: 50, victims: ["n", "b"], hasLead: true, sound: "massfreeze", source: "frozen",
  }),
  total_whiteout: G(ColdFront, ["#e8f8ff", "#ffffff", "#6fb5e8"], GLYPH.total_whiteout, {
    ordering: "sweep", staggerMs: 45, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen",
  }),
  we_frostbite_curse: G(ColdFront, ["#9fd8ff", "#eef8ff", "#5a8fc0"], GLYPH.we_frostbite_curse, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "clockice",
  }),
  total_freeze: G(ColdFront, ["#bfe6ff", "#e8f8ff", "#3f6f9f"], GLYPH.total_freeze, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen",
  }, "totalfreeze"),

  /* --- SiegeRoll (bombs / demolitions / barrages) --------------------------------- */
  atomic_captures: G(SiegeRoll, ["#ff9d3d", "#ffd166", "#3a1c12"], GLYPH.atomic_captures, {
    ordering: "octagon", staggerMs: 70, victims: "all", hasLead: true, sound: "atomic",
  }),
  atomic_reaction: G(SiegeRoll, ["#e6432c", "#ffd166", "#3a1c12"], GLYPH.atomic_reaction, {
    ordering: "octagon", staggerMs: 70, victims: "all", hasLead: true, sound: "atomic",
  }),
  detonation_field: G(SiegeRoll, ["#c94a3a", "#ff9d3d", "#2b1218"], GLYPH.detonation_field, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cataclysm",
  }),
  ww_demolition_charge: G(SiegeRoll, ["#7c8a4a", "#ffd166", "#3a3526"], GLYPH.ww_demolition_charge, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "siege",
  }),
  wc_confetti_cannon: G(SiegeRoll, ["#c94ad1", "#ffcf4d", "#3a1030"], GLYPH.wc_confetti_cannon, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "siege",
  }, "confetti"),
  we_firestorm: G(SiegeRoll, ["#ff7a29", "#ffd166", "#3a1c12"], GLYPH.we_firestorm, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cataclysm",
  }),
  giants_maul: G(SiegeRoll, ["#8a94a8", "#ffd166", "#3a3a40"], GLYPH.giants_maul, {
    ordering: "line", staggerMs: 70, victims: "all", mover: "r", hasLead: true, sound: "siege",
  }),
  scorched_middle: G(SiegeRoll, ["#ff7a29", "#ffb454", "#3a1c12"], GLYPH.scorched_middle, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "cataclysm",
  }),

  /* --- WarBanner (protection / musters / holds) -------------------------------------- */
  checkmate_immunity: G(WarBanner, ["#5a8fc0", "#dfe8ff", "#2c3e6b"], GLYPH.checkmate_immunity, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis",
  }),
  iron_reign: G(WarBanner, ["#8a94a8", "#ffd76a", "#3a3a40"], GLYPH.iron_reign, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis", source: "kingSafe",
  }),
  ironclad: G(WarBanner, ["#aab6c8", "#e3e9f2", "#3a4556"], GLYPH.ironclad, {
    ordering: "sweep", staggerMs: 50, victims: "all", hasLead: true, sound: "aegis", source: "shield",
  }),
  ww_iron_bulwark: G(WarBanner, ["#8a94a8", "#c94a3a", "#3a3a40"], GLYPH.ww_iron_bulwark, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", source: "shield",
  }),
  ww_praetorian_guard: G(WarBanner, ["#c9a84c", "#c94a3a", "#4a3a22"], GLYPH.ww_praetorian_guard, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", source: "shield",
  }),
  round_table: G(WarBanner, ["#c9b89a", "#ffd76a", "#5a4a36"], GLYPH.round_table, {
    ordering: "radial", staggerMs: 60, victims: ["n"], hasLead: true, sound: "coronation",
  }),
  ww_bridgehead: G(WarBanner, ["#7c8a4a", "#c94a3a", "#3a3526"], GLYPH.ww_bridgehead, {
    ordering: "radial", staggerMs: 60, victims: ["n", "p"], hasLead: true, sound: "wall", source: "summon",
  }),
  sealed_avenues: G(WarBanner, ["#8a94a8", "#ffd76a", "#5c5c63"], GLYPH.sealed_avenues, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "wall",
  }),

  /* --- Grove (nature / roots / blooms) --------------------------------------------------- */
  dryad_grove: G(Grove, ["#8a6a3a", "#a8e07f", "#3f8f3f"], GLYPH.dryad_grove, {
    ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "cathedral", source: "summon",
  }),
  we_overgrowth: G(Grove, ["#3f8f3f", "#ffd76a", "#1c4a1c"], GLYPH.we_overgrowth, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation",
  }),
  we_rooted: G(Grove, ["#4a3a22", "#a8e07f", "#2f3a26"], GLYPH.we_rooted, {
    ordering: "sweep", staggerMs: 55, victims: ["r", "q"], hasLead: true, sound: "petrifiedforest",
  }),
  we_quagmire: G(Grove, ["#5c5348", "#8faf4a", "#3a3026"], GLYPH.we_quagmire, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "petrifiedforest",
  }),
  thorn_hedge: G(Grove, ["#1c4a1c", "#a8e07f", "#0f2a0f"], GLYPH.thorn_hedge, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "wall",
  }),

  /* --- PhantomParade (spirits / veils / phasings) ------------------------------------------- */
  gossamer_veil: G(PhantomParade, ["#8f6bff", "#e3d0ff", "#3b1a5e"], GLYPH.gossamer_veil, {
    ordering: "sweep", staggerMs: 50, victims: "all", hasLead: true, sound: "aegis", source: "shield",
  }),
  starlight_ward: G(PhantomParade, ["#2c3e6b", "#cdd6ff", "#12122a"], GLYPH.starlight_ward, {
    ordering: "sweep", staggerMs: 50, victims: "all", hasLead: true, sound: "cathedral", source: "shield",
  }),
  spirit_guide: G(PhantomParade, ["#4a6b8f", "#7fd8d8", "#12303a"], GLYPH.spirit_guide, {
    ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "shades", source: "summon",
  }),
  phase_army: G(PhantomParade, ["#5b2b8f", "#e3d0ff", "#2a1030"], GLYPH.phase_army, {
    ordering: "sweep", staggerMs: 55, victims: ["b", "r", "q"], hasLead: true, sound: "shades",
  }),
  ghost_legion: G(PhantomParade, ["#5a6b8f", "#eef8ff", "#2c3e6b"], GLYPH.ghost_legion, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true, sound: "shades",
  }),
  valkyrie: G(PhantomParade, ["#5a6b8f", "#ffd76a", "#2c3e6b"], GLYPH.valkyrie, {
    ordering: "radial", staggerMs: 0, victims: ["q", "r"], hasLead: true, sound: "coronation", source: "summon",
  }),

  /* --- ClockSpire (tempo / stolen hours / lost days) -------------------------------------------- */
  extra_move_repeat: G(ClockSpire, ["#6fe3ff", "#ffd76a", "#1c3a4a"], GLYPH.extra_move_repeat, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "blitz",
  }),
  time_stop_short: G(ClockSpire, ["#3a3766", "#6fe3ff", "#12122a"], GLYPH.time_stop_short, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "clockcage", source: "frozen",
  }, "timestop"),
  time_rewind: G(ClockSpire, ["#5b2b8f", "#6fe3ff", "#2a1030"], GLYPH.time_rewind, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage",
  }, "rewind"),
  lost_days: G(ClockSpire, ["#5a6b8f", "#cdd6ff", "#2c3e6b"], GLYPH.lost_days, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "snooze", source: "stun",
  }),
  wa_stolen_hours: G(ClockSpire, ["#e8c97a", "#6fe3ff", "#4a3a22"], GLYPH.wa_stolen_hours, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "clockcage",
  }),

  /* --- CardRite (drafts / fates / contracts / paperwork) -------------------------------------------- */
  sever: G(CardRite, ["#6b4a8f", "#c94a5a", "#2a1030"], GLYPH.sever, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
  }, "sever"),
  draft_domination: G(CardRite, ["#3a3a45", "#c94a5a", "#1c1c22"], GLYPH.draft_domination, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
  }),
  total_nullify: G(CardRite, ["#5c5c63", "#c94a5a", "#2a2a30"], GLYPH.total_nullify, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
  }),
  favorable_stars: G(CardRite, ["#2c3e6b", "#ffd76a", "#12122a"], GLYPH.favorable_stars, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral",
  }),
  the_tower: G(CardRite, ["#2c3e6b", "#c94a3a", "#12122a"], GLYPH.the_tower, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cataclysm",
  }, "tower"),
  death_arcana: G(CardRite, ["#12081f", "#8f6bff", "#0d0618"], GLYPH.death_arcana, {
    ordering: "radial", staggerMs: 0, victims: ["n", "b", "r", "q"], hasLead: true, sound: "extinction",
  }, "death"),
  chess_diff: G(CardRite, ["#5a6b8f", "#eef1f7", "#2c3e6b"], GLYPH.chess_diff, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation",
  }),
  wa_greed: G(CardRite, ["#8a6a3a", "#ffd76a", "#4a3a22"], GLYPH.wa_greed, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "rampage",
  }),
  riddle_game: G(CardRite, ["#8a6a3a", "#e8dcc0", "#4a3a22"], GLYPH.riddle_game, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "snooze", source: "stun",
  }),
  rehab: G(CardRite, ["#5fc9b0", "#eef1f7", "#1c4a3a"], GLYPH.rehab, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral",
  }),
  parole: G(CardRite, ["#5a6b8f", "#eef1f7", "#2c3e6b"], GLYPH.parole, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral",
  }),
  long_leash: G(CardRite, ["#b58a5a", "#e8dcc0", "#5a4a36"], GLYPH.long_leash, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis",
  }),
  wardens_bribe: G(CardRite, ["#8a6a3a", "#ffd76a", "#4a3a22"], GLYPH.wardens_bribe, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "rampage",
  }),
  iron_will: G(CardRite, ["#8a94a8", "#c9cdd6", "#3a3a40"], GLYPH.iron_will, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis",
  }),
  wc_wrong_way: G(CardRite, ["#c94a5a", "#e8dcc0", "#5a1512"], GLYPH.wc_wrong_way, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "shades",
  }),
  wc_broken_elevator: G(CardRite, ["#8a94a8", "#ffe9b0", "#3a3a40"], GLYPH.wc_broken_elevator, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall",
  }),
  unseelie_bargain: G(CardRite, ["#2a1030", "#8f6bff", "#12081f"], GLYPH.unseelie_bargain, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
  }),

  /* --- ThiefHand (steals / seizures / nullifies) --------------------------------------------------- */
  buff_thief: G(ThiefHand, ["#8f6bff", "#ffd76a", "#2a2a38"], GLYPH.buff_thief, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "rampage",
  }),
  buff_siphon: G(ThiefHand, ["#c94ad1", "#ffd76a", "#1c0f18"], GLYPH.buff_siphon, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "rampage",
  }),
  wa_spelltheft: G(ThiefHand, ["#5b2b8f", "#e3d0ff", "#1c0f2a"], GLYPH.wa_spelltheft, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
  }),
  draft_seize: G(ThiefHand, ["#6b4a8f", "#cdd6ff", "#2a1030"], GLYPH.draft_seize, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "rampage",
  }),
  collapse: G(ThiefHand, ["#8f6bff", "#c9cdd6", "#1c1c2a"], GLYPH.collapse, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "shades",
  }),
  void: G(ThiefHand, ["#5b2b8f", "#b98cff", "#0d0618"], GLYPH.void, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
  }),
  wa_sabotage: G(ThiefHand, ["#5a6b8f", "#cdd6ff", "#1c1c2a"], GLYPH.wa_sabotage, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
  }),
  empty_handed: G(ThiefHand, ["#8a94a8", "#c94a5a", "#2a2a30"], GLYPH.empty_handed, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
  }),

  /* --- CrownForge (promotions / reforgings) --------------------------------------------------------- */
  double_queen: G(CrownForge, ["#ffd76a", "#fff2c9", "#8a6414"], GLYPH.double_queen, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation",
  }, "doublequeen"),
  twin_queens: G(CrownForge, ["#ffd76a", "#ffe9b0", "#7a5b23"], GLYPH.twin_queens, {
    ordering: "radial", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain",
  }),
  promotion_storm: G(CrownForge, ["#c9cdd6", "#ffd76a", "#5a6b8f"], GLYPH.promotion_storm, {
    ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain",
  }),
  mass_promote_minor: G(CrownForge, ["#b58a5a", "#ffd76a", "#5a4a36"], GLYPH.mass_promote_minor, {
    ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "coronation",
  }),
  resurrect_queen: G(CrownForge, ["#6b1a2a", "#ffd76a", "#3a0e1a"], GLYPH.resurrect_queen, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "coronation", source: "summon",
  }),
  legendary_forge: G(CrownForge, ["#ff9d3d", "#ffd166", "#3a1c12"], GLYPH.legendary_forge, {
    ordering: "radial", staggerMs: 0, victims: ["n", "b"], hasLead: true, sound: "colossus",
  }),
  royal_ascension: G(CrownForge, ["#b98cff", "#ffd76a", "#3b1a5e"], GLYPH.royal_ascension, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "coronation",
  }, "ascension"),
  second_king: G(CrownForge, ["#ffd76a", "#ffe9b0", "#8a6a3a"], GLYPH.second_king, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation",
  }),
  wa_leaden_crown: G(CrownForge, ["#6e6e78", "#c9a84c", "#2a2a30"], GLYPH.wa_leaden_crown, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", source: "shield",
  }),
  overclock_major: G(CrownForge, ["#6fe3ff", "#ffd76a", "#1c3a4a"], GLYPH.overclock_major, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz",
  }),
  ascendant_knight: G(CrownForge, ["#b98cff", "#e3d0ff", "#3b1a5e"], GLYPH.ascendant_knight, {
    ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "coronation", source: "shield",
  }),
  nerf_breaker: G(CrownForge, ["#8a94a8", "#ffd166", "#3a3a40"], GLYPH.nerf_breaker, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "colossus",
  }),

  /* --- RiftGate (teleports / conjurings / mirrors) ---------------------------------------------------- */
  fey_step: G(RiftGate, ["#3f8f3f", "#a8e07f", "#1c4a1c"], GLYPH.fey_step, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
  }),
  rift_walker: G(RiftGate, ["#5b2b8f", "#6fe3ff", "#12081f"], GLYPH.rift_walker, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage",
  }),
  mirror_of_souls: G(RiftGate, ["#5a8fc0", "#bfe6ff", "#2c3e6b"], GLYPH.mirror_of_souls, {
    ordering: "radial", staggerMs: 0, victims: ["n", "b"], hasLead: true, sound: "shades",
  }, "mirror"),
  wa_conjure_rook: G(RiftGate, ["#8f6bff", "#e3d0ff", "#2a1030"], GLYPH.wa_conjure_rook, {
    ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "clockcage", source: "summon",
  }),
  wa_twin_familiars: G(RiftGate, ["#7fd8d8", "#e3d0ff", "#12303a"], GLYPH.wa_twin_familiars, {
    ordering: "radial", staggerMs: 60, victims: ["b"], hasLead: true, sound: "shades",
  }),
  ley_line: G(RiftGate, ["#5fc9b0", "#a8e07f", "#1c4a3a"], GLYPH.ley_line, {
    ordering: "file", staggerMs: 50, victims: "all", hasLead: true, sound: "wall",
  }),

  /* --- BeastRush (hunts / mounts / charges) ------------------------------------------------------------- */
  wild_hunt: G(BeastRush, ["#3b1a5e", "#b98cff", "#12081f"], GLYPH.wild_hunt, {
    ordering: "sweep", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "rampage",
  }, "hunt"),
  dragon_mount: G(BeastRush, ["#4a8f5f", "#d6234f", "#1c4a2c"], GLYPH.dragon_mount, {
    ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz",
  }, "dragon"),
  sahur: G(BeastRush, ["#8a6a3a", "#c94a3a", "#4a3a22"], GLYPH.sahur, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz",
  }, "sahur"),
};
