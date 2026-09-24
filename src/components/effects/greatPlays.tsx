// Tier 5-6 plugin signatures — the "great" band: every tier 5-6 card that was
// still riding the generated fallback gets a UNIQUE, name-matched play, one
// notch below the god-tier set (godPlays.tsx). See sigPlugins.tsx for the
// registry contract. Self-contained: own SVG, own CSS (greatPlays.css),
// transform/opacity only. Do NOT import from BoardEffects.tsx.
//
// Every play here is a staged SCENE (bigger than a badge/motif moment, smaller
// than a god manifestation): a distinct entity / object staged board-wide,
// ~1.6-2.2s, no letterboxing-scale drama. Flagship pass: the central figure
// of each scene now sits at ~30-38% of the 14x14 canvas ≈ ~55-65% of the
// visible board (the crop is the central ~57% of the canvas), every template
// lands ONE unique physical SIGNATURE BEAT on top of its strike (the circle
// closing, petrify creep, flash-freeze sheet, hang-time debris, rally horn,
// root ripple, phantom after-images, tower chime, dealt after-images, fumbled
// coin, spark fountain, gate surge, hoof-shock), and cards at tier 6 and up
// read grander than tier 5: a second shock ring + board-edge glow keyed off
// the card's LIVE tier (GrandAccent; tier 5 and below keep ONE shockwave,
// ledger F222). Non-lead
// ("target") renders are compact per-square hits because zone-fed cards mount
// one overlay per affected square.
//
// PER-CARD SCENES. Every card of tier 5 and up in this module (all 97 of
// them, live and retired) plays its own scene: the rule drawn on the pieces
// and squares it names, with a motif of its own name (see "PER-CARD SCENES"
// and the round-2 blocks below the templates). The generic accents (edge
// glow, shock ring, settle motes) are only accents on top.
//
// TEN TEMPLATES remain, and carry only the 18 cards of tier 4 and below,
// each parameterised by { palette, glyph } (SiegeRoll, WarBanner and Grove
// lost their last card in round 2 and were deleted):
//   WitchCircle — a hexwitch's sigil circle settles flat and ignites, candles
//                 popping alight around it (the curse/hex pool)
//   StoneGaze   — a gorgon bust rises mid-board and rakes the crop with a
//                 petrifying gaze beam (the walnut/petrify pool)
//   ColdFront   — a jagged ice front sweeps the whole crop, frost stripes
//                 trailing behind it (the freeze pool)
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
//
// ANCHORING (docs/animation-design-brief.md §0). Every card declares an anchor
// in its config, chosen from what the card actually DOES, not from what stages
// nicely, and checked against the card's own category by
// scripts/lib/anchor-rule.ts:
//   "cast"  the effect lands on one square or one named piece;
//   "aim"   it lands on a few named pieces or squares, so the art reaches down
//           the real source -> victim vector;
//   "board" it covers the whole board, both armies, or it is a rule / draft /
//           clock change with no square to point at. Most of CardRite and
//           ThiefHand are honestly this: a stolen buff and a skipped draft
//           happen nowhere on the board, so centring is the truthful staging
//           rather than the lazy one.
// A scene anchored on the cast square can no longer treat a fixed percentage
// of its 14-cell canvas as "the board", so the two layers that DO mean the
// board — the wash and the tier-6 edge glow — go through <Frame>, which is a
// <BoardFrame> when anchored and the historic central 57% when not.
//
// THE GEOMETRY BEAT. Every template lands one layer (<Reach>) driven by the
// directional vars rather than by the canvas: a rail of the play's own light
// leaving the cast square along --fx-ang and running as far as the play
// travels (--fx-len). The settle tail drifts downwind of the caster
// (--fx-side) and a target hit throws its debris along its own leg, so a
// multi-square play reads as travelling instead of as a row of identical pops.
//
// THREE ROLES. "lead" is the board-scale flourish, "target" the per-square
// hit, and "entrance" the card ARRIVING in a hand: the template's own central
// object at ~56% of the crop, the card's glyph resolving inside it, one short
// arrival beat and a settle. No stage, no board takeover.

import "./greatPlays.css";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import type { SigPlugin, SigRole } from "./sigPlugins";
import { BoardFrame } from "./stage";
import { LaserStrike, PieceShatter, Shockwave, QUAKE_CLASS, impactVars } from "./impact/impact";

/* =============================================================================
   Shared bits
   ========================================================================== */

type Palette = [string, string, string];

interface TemplateProps {
  palette: Palette;
  glyph: ReactNode;
  lead: boolean;
  /** Which beat of the card's life this is: the board-scale lead on the cast
   * square, a per-square target hit, or the card ARRIVING in a hand. */
  role: SigRole;
  /** True when the card declared anchor "cast" / "aim", so its canvas sits on
   * the square the card was played on. Board-scale layers (the wash, the
   * tier-6 edge glow) then need <BoardFrame> to find the board; a scene still
   * at anchor "board" has already been slid to the board centre by Board
   * itself and must NOT use it, or it double-corrects. */
  anchored: boolean;
  delayMs: number;
  /** Optional bespoke-flourish key for marquee cards (extra scene dressing
   * layered on the shared template; never changes the template's core beats). */
  flourish?: string;
  /** The card's live tier (BUFF_BY_ID), bound per entry by `bindTiers`. Drives
   * the tier-6+ accent (GrandAccent) and the short cut for tier 4 and below. */
  tier: number;
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
 * square; this canvas is ~14 squares wide — the board is the central ~57%).
 *
 * An ANCHORED scene adds `fx-stage`, whose transform carries the at-most
 * half-cell clamp that keeps a corner cast's 14-cell canvas over the 8-cell
 * board. A board-anchored scene must not: Board has already centred it. */
function Stage({ anchored, quakeMs, children }: { anchored?: boolean; quakeMs?: number; children: ReactNode }) {
  // FLAGSHIP WAVE: `quakeMs` makes the whole scene stage JOLT on the play's
  // own impact beat (the shared imp-quake wrapper from the impact vocabulary;
  // in-scene only, the real board crop never shakes). The quake rides an
  // INNER wrapper because the outer span's `fx-stage` transform carries the
  // anchor clamp, and imp-quake's keyframed transform would override it
  // mid-jolt (same fix godPlays/gamblingPlays use).
  return (
    <span className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      <span
        className={`${anchored ? "fx-stage " : ""}absolute left-[-650%] top-[-650%] block h-[1400%] w-[1400%]`}
      >
        {quakeMs != null ? (
          <span className={`${QUAKE_CLASS} absolute inset-0 block`} style={impactVars(undefined, quakeMs / 1000)}>
            {children}
          </span>
        ) : (
          children
        )}
      </span>
    </span>
  );
}

/** hex "#rrggbb" -> the space-separated "r g b" triple the impact vocabulary
 * tints with (--imp-rgb). */
function rgbOf(hex: string): string {
  return `${parseInt(hex.slice(1, 3), 16)} ${parseInt(hex.slice(3, 5), 16)} ${parseInt(hex.slice(5, 7), 16)}`;
}

/** FLAGSHIP WAVE: the shared impact vocabulary at scene scale. A positioned
 * box over the strike point carrying an optional laser column, an optional
 * PieceShatter (the struck thing splits in half and sprays shards) and an
 * optional ground shockwave, all tinted with the play's own colour and landing
 * on ONE beat (`atMs`, absolute like every other delay here). The laser leads
 * that beat by 0.4s per the impact.css timing contract, so "laser, then the
 * piece comes apart" reads as one hit. Pair with Stage's `quakeMs` on the same
 * beat so the stage jolt and the strike are one moment of contact. */
function Impact({
  rgb,
  atMs,
  left = 39,
  top = 34,
  size = 22,
  laser = false,
  shock = true,
  shatter,
}: {
  rgb: string;
  atMs: number;
  left?: number;
  top?: number;
  size?: number;
  laser?: boolean;
  shock?: boolean;
  shatter?: ReactNode;
}) {
  return (
    <span
      className="absolute block"
      style={{ left: `${left}%`, top: `${top}%`, width: `${size}%`, height: `${size}%`, ...impactVars(rgb, atMs / 1000) }}
    >
      {laser && <LaserStrike />}
      {shatter != null && <PieceShatter glyph={shatter} />}
      {shock && <Shockwave />}
    </span>
  );
}

/** Exactly the board, for the layers that MEAN the board (the wash, the
 * tier-6 edge glow) rather than the action.
 *
 * Anchored on the cast square only `BoardFrame` knows where the board is. A
 * scene left at anchor "board" has been translated onto the board centre by
 * Board's own lead shift, so for it the board simply IS the central 57% of
 * the canvas, and applying the frame offsets on top would throw the layer up
 * to 3.5 cells off. */
function Frame({ anchored, children }: { anchored?: boolean; children: ReactNode }) {
  if (anchored) return <BoardFrame>{children}</BoardFrame>;
  // The same numbers BoardFrame resolves to at a centred board: one cell is
  // 100/14 of the canvas, the board is 8 of them, and it starts 3 cells in.
  return (
    <span
      className="absolute block"
      style={{ left: "21.428571%", top: "21.428571%", width: "57.142857%", height: "57.142857%" }}
    >
      {children}
    </span>
  );
}

/** Full-board colour wash. */
function Wash({ color, delayMs, anchored }: { color: string; delayMs: number; anchored?: boolean }) {
  return (
    <Frame anchored={anchored}>
      <span className="grp-wash absolute inset-0 block" style={{ background: color, animationDelay: `${delayMs}ms` }} />
    </Frame>
  );
}

/* --- The geometry beat ------------------------------------------------------
   Every template lands ONE layer driven by the play's own geometry rather than
   by the canvas: a rail of the play's light that leaves the cast square along
   the real source -> victim vector (`--fx-ang`) and runs as far as the play
   actually travels (`--fx-len`, in cells; one cell is 100/14 of the 14-cell
   canvas). This is what makes a curse LEAN toward the piece it curses instead
   of blossoming in place. A single-target play reports len 0 and keeps the
   short stub, so the rail reads as a nub on the square rather than vanishing.
   The rotation lives on a static shell so it composes with the keyframed
   scaleX of the animated child instead of fighting it. */
function Reach({
  delayMs,
  color,
  top = 49.2,
  thickness = 1.4,
  minCells = 2.4,
}: {
  delayMs: number;
  color: string;
  top?: number;
  thickness?: number;
  minCells?: number;
}) {
  return (
    <span
      className="absolute block"
      style={{
        left: "50%",
        top: `${top}%`,
        width: `calc((${minCells} + var(--fx-len, 0)) * 7.142857%)`,
        height: `${thickness}%`,
        rotate: "calc(var(--fx-ang, 0) * 1deg)",
        transformOrigin: "0% 50%",
      }}
    >
      <span
        className="grp-reach absolute inset-0 block"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)`, animationDelay: `${delayMs}ms` }}
      />
    </span>
  );
}

/** THE shockwave ring — one per tier-5 play; tier-6 plays earn a second,
 * later ring through GrandAccent below (flagship tier scaling). */
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
              // The tail drifts DOWNWIND of whoever cast the play: `--fx-side`
              // is +1 when the caster sits at the bottom of the screen, so the
              // decay carries away from them rather than in a fixed direction
              // that is wrong for one of the two players.
              "--dy": `calc(${sign * parseFloat(v.dy)}% + var(--fx-side, 1) * -22%)`,
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
      {/* the debris is thrown along THIS square's own leg of the play, so a
          chain reads as travelling rather than as a row of identical pops */}
      {HIT_SPARKS.map((v, i) => (
        <span
          key={i}
          className="grp-spark absolute block"
          style={
            {
              rotate: "calc(var(--fx-ang, 0) * 1deg)",
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

/* --- Tier-scaled weight -----------------------------------------------------
   Cards at tier 6 and above read GRANDER than tier 5 inside the same template:
   a second, later shock ring plus a brief board-edge glow around the strike.
   The weight is read from the card's LIVE tier (BUFF_BY_ID, bound onto each
   entry by `bindTiers` below the registry), never from a table of flourish
   keys: that table went stale as cards were re-tiered, so 38 cards played the
   wrong weight, a tier-8 card played as tier 5 and tier-2 cards played the
   full tier-6 accent (ledger F222). */
function grand(tier: number): boolean {
  return tier >= 6;
}

/** Tier-6+ accent: a board-edge glow frame (the crop is the central ~57% of
 * the canvas) + a second, later shock ring. Renders nothing below tier 6. */
function GrandAccent({
  tier,
  color,
  delayMs,
  anchored,
}: {
  tier: number;
  color: string;
  delayMs: number;
  anchored?: boolean;
}) {
  if (!grand(tier)) return null;
  return (
    <>
      {/* the rim of the BOARD kindles, so this one goes through the Frame */}
      <Frame anchored={anchored}>
        <span
          className="grp-edgeglow absolute inset-0 block"
          style={{ borderRadius: "2px", border: `3px solid ${color}`, animationDelay: `${delayMs}ms` }}
        />
      </Frame>
      <Boom delayMs={delayMs + 90} color={color} thickness={2} />
    </>
  );
}

/* --- The entrance role --------------------------------------------------------
   The card ARRIVING in a hand (draft pick, steal, grant), before it is ever
   played: the template's own central object at ~56% of the crop with the card's
   glyph resolving inside it, one short arrival beat and a settle. No stage, no
   board takeover — this cut is one square's worth of art. */
function EntranceCut({
  palette,
  glyph,
  delayMs,
  motif,
  from = "below",
}: {
  palette: Palette;
  glyph: ReactNode;
  delayMs: number;
  motif: ReactNode;
  from?: "below" | "above";
}) {
  const [p0, p1] = palette;
  const rise = from === "below";
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {/* tell: the card's own light gathers on the slot it is landing in */}
      <span
        className="grp-tellglow absolute block rounded-full"
        style={{ left: "20%", top: "22%", width: "60%", height: "56%", background: tint(p1, 0.34), animationDelay: `${delayMs}ms` }}
      />
      <span
        className={`${rise ? "grp-rise" : "grp-drop"} absolute block`}
        style={{ left: "22%", top: "22%", width: "56%", height: "56%", animationDelay: `${delayMs + 120}ms` }}
      >
        {motif}
      </span>
      <span className="grp-facein absolute block" style={{ left: "34%", top: "34%", width: "32%", height: "32%", animationDelay: `${delayMs + 400}ms` }}>
        {glyph}
      </span>
      <span
        className="grp-tring absolute block rounded-full"
        style={{ left: "16%", top: "16%", width: "68%", height: "68%", border: `2px solid ${tint(p1, 0.8)}`, animationDelay: `${delayMs + 540}ms` }}
      />
      {/* settle: the arrival's own motes, carried off the caster's side */}
      <Settle delayMs={delayMs + 640} dir={rise ? "rise" : "fall"} sizePct={4} render={(i) => <Mote color={tint(i % 2 ? p1 : p0, 0.75)} />} />
    </span>
  );
}

/* =============================================================================
   Template 1: WitchCircle — a hexwitch's sigil circle settles flat over the
   board centre and ignites: rune rings, candles popping alight at the compass
   points, the card's glyph burning at its heart.
   ========================================================================== */
const CANDLES = [
  { l: 30, t: 27, d: 0 },
  { l: 67, t: 27, d: 80 },
  { l: 67, t: 62, d: 160 },
  { l: 30, t: 62, d: 240 },
];
/* SIGNATURE: after the candles take, light runs the circle's square — four
   rim-beams close candle to candle, sealing the working (rotate is the CSS
   property, composing with the keyframed transform). */
const CIRCLE_EDGES = [
  { l: 33, t: 29.5, rot: "0deg", d: 0 },
  { l: 51.5, t: 46, rot: "90deg", d: 90 },
  { l: 33, t: 62.5, rot: "180deg", d: 180 },
  { l: 14.5, t: 46, rot: "270deg", d: 270 },
];
function WitchCircle({ palette, glyph, lead, role, anchored, delayMs, flourish, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance")
    return (
      <EntranceCut
        palette={palette}
        glyph={glyph}
        delayMs={delayMs}
        from="above"
        motif={
          <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="none" stroke={tint(p1, 0.9)} strokeWidth="1.2" />
            <circle cx="12" cy="12" r="7.4" fill="none" stroke={tint(p2, 0.7)} strokeWidth="0.6" strokeDasharray="2 1.6" />
            <path d="M12 3.4 L19.4 16.4 H4.6 Z" fill="none" stroke={tint(p1, 0.55)} strokeWidth="0.8" {...SJ} />
            <path d="M12 0.8 V3 M12 21 V23.2 M0.8 12 H3 M21 12 H23.2" stroke={tint(p2, 0.9)} strokeWidth="1" strokeLinecap="round" />
          </svg>
        }
      />
    );
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 820}>
      <Wash color={tint(p0, 0.26)} delayMs={delayMs} anchored={anchored} />
      {/* tell: stray hex-light gathers to the point the circle will claim */}
      <TellGlow delayMs={delayMs} color={tint(p1, 0.32)} left={40} top={36} w={20} h={18} />
      <TellRays delayMs={delayMs + 20} color={tint(p1, 0.8)} />
      {/* the sigil circle, settling flat out of the air (flagship pass: it
          now spans over half the canvas — the working claims the BOARD) */}
      <span className="grp-sigil absolute block" style={{ left: "23%", top: "20%", width: "54%", height: "54%", animationDelay: `${delayMs + 120}ms` }}>
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
      {/* the circle CLOSES — rim-light runs candle to candle */}
      {CIRCLE_EDGES.map((v, i) => (
        <span
          key={`e${i}`}
          className="grp-beam absolute block"
          style={{
            left: `${v.l}%`,
            top: `${v.t}%`,
            width: "34%",
            height: "0.9%",
            rotate: v.rot,
            background: `linear-gradient(90deg, ${tint(p1, 0.9)}, ${tint(p2, 0.45)})`,
            transformOrigin: "0% 50%",
            animationDelay: `${delayMs + 480 + v.d}ms`,
          }}
        />
      ))}
      {/* candles popping alight around the circle */}
      {CANDLES.map((c, i) => (
        <span key={i} className="grp-candle absolute block" style={{ left: `${c.l}%`, top: `${c.t}%`, width: "5%", height: "8.3%", animationDelay: `${delayMs + 320 + c.d}ms` }}>
          <svg viewBox="0 0 6 10" className="block h-full w-full" aria-hidden="true">
            <path d="M2.2 4.6 H3.8 V9.4 H2.2 Z" fill={tint(p2, 0.9)} />
            <path d="M3 0.6 C4.2 2 4.4 3 3 4.2 C1.6 3 1.8 2 3 0.6 Z" fill={p1} stroke={tint(p0, 0.8)} strokeWidth="0.4" {...SJ} />
          </svg>
        </span>
      ))}
      {/* bespoke: Ball and Chain — the iron ball thuds down, the chain snaps
          taut, and the shackled pawn is yanked back to heel mid-bolt */}
      {/* bespoke: Royal Summons — the writ unrolls overhead and the king is
          dragged to the circle in jerky, protesting steps */}
      {/* bespoke: Palsied Hands — sword and axe rock loose from shaking grips,
          slip, and clatter onto the boards */}
      {/* bespoke: Throne Bound — the queen bolts for the open board and the
          leash of hex-light snaps her back to her king's side */}
      {/* bespoke: Lone Sovereign — hex-pins nail the court to its squares while
          one knight alone hops free of the stillness */}
      {/* bespoke: Peasant Levy — a pitchfork fence plants itself along the
          frontier; the piece stranded beyond it can only rattle */}
      {/* bespoke: Royal Handicap — the king's compass rose loses its diagonal
          arms: they crack off and scatter, the orthogonal cross held intact */}
      {flourish === "nodiag" && (
        <>
          <span className="grp-hold absolute block" style={{ left: "44%", top: "33%", width: "12%", height: "12%", animationDelay: `${delayMs + 560}ms` }}>
            <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
              <path d="M6 1 L7 3.4 H5 Z M6 11 L5 8.6 H7 Z M1 6 L3.4 5 V7 Z M11 6 L8.6 7 V5 Z" fill={tint(p1, 0.95)} />
              <circle cx="6" cy="6" r="1.5" fill="none" stroke={tint(p1, 0.9)} strokeWidth="0.6" />
            </svg>
          </span>
          {[
            { dx: "170%", dy: "-170%", rot: "80deg", l: 53, t: 32 },
            { dx: "-170%", dy: "-170%", rot: "-80deg", l: 45, t: 32 },
            { dx: "170%", dy: "170%", rot: "-70deg", l: 53, t: 41 },
            { dx: "-170%", dy: "170%", rot: "70deg", l: 45, t: 41 },
          ].map((v, i) => (
            <span
              key={i}
              className="grp-spark absolute block"
              style={{ left: `${v.l}%`, top: `${v.t}%`, width: "2.6%", height: "2.6%", "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + 820 + i * 40}ms` } as CSSProperties}
            >
              <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
                <path d="M5 0.8 L8.6 8 H1.4 Z" fill={tint(p2, 0.95)} stroke={p1} strokeWidth="0.6" {...SJ} />
              </svg>
            </span>
          ))}
        </>
      )}
      {/* bespoke: Queen's Handicap — the proud queen is walked over to lean on
          a pawn escort, a binding ring sealing the arrangement */}
      {/* bespoke: Grounded Command — barrier bolts hammer down along the
          frontier and a heavy rook bounces straight off the line */}
      {/* bespoke: Lunar Eclipse — the moon climbs over the circle and the
          shadow disc slides across it, dimming the whole board */}
      {/* bespoke: Hexed Satchel — the cursed bag gulps down the incoming cards
          and the null-stitch stamps them worthless inside */}
      {/* bespoke: Iron Furrow — spikes hammer up one after another along the
          sown rank, and a pawn is caught fast on the last of them */}
      {/* bespoke: Leaden Fields — the plumb weight drops, and the grey-cast
          pawns sink together back into the boards */}
      {/* bespoke: Voodoo Doll — the little stitched double takes the pin, and
          the sympathy lands as a jolt on the far side of the board */}
      {flourish === "voodoo" && (
        <>
          <span className="grp-pop absolute block" style={{ left: "43%", top: "31%", width: "7.5%", height: "12%", animationDelay: `${delayMs + 520}ms` }}>
            <svg viewBox="0 0 8 13" className="block h-full w-full" aria-hidden="true">
              <circle cx="4" cy="2.6" r="2" fill="#c9b89a" stroke="#4a3a22" strokeWidth="0.5" />
              <path d="M2.6 4.6 H5.4 L6 10.6 H2 Z M2.6 6 L0.8 8 M5.4 6 L7.2 8 M2.8 10.6 L2.4 12.4 M5.2 10.6 L5.6 12.4" fill="#c9b89a" stroke="#4a3a22" strokeWidth="0.5" {...SJ} />
              <path d="M3.2 2.2 L3.8 2.8 M4.6 2.2 L5.2 2.8" stroke="#4a3a22" strokeWidth="0.4" strokeLinecap="round" />
            </svg>
          </span>
          <span className="grp-drop absolute block" style={{ left: "48%", top: "23%", width: "3.4%", height: "8%", animationDelay: `${delayMs + 800}ms` }}>
            <svg viewBox="0 0 4 9" className="block h-full w-full" aria-hidden="true">
              <circle cx="2" cy="1.2" r="1" fill={p1} />
              <path d="M2 2.2 L2 8.4" stroke="#c9cdd6" strokeWidth="0.6" strokeLinecap="round" />
            </svg>
          </span>
          <Flash delayMs={delayMs + 1060} color={tint(p1, 0.55)} left={65} top={51} w={9} h={7} />
          <span
            className="grp-tring absolute block rounded-full"
            style={{ left: "64%", top: "49%", width: "11%", height: "10%", border: `2px solid ${tint(p1, 0.85)}`, animationDelay: `${delayMs + 1120}ms` }}
          />
        </>
      )}
      {/* bespoke: Mind Control — the control bar descends, strings hook the
          knight, and it is yanked upright into its new master's colour */}
      {flourish === "puppet" && (
        <>
          <span className="grp-drop absolute block" style={{ left: "42%", top: "15%", width: "16%", height: "4%", animationDelay: `${delayMs + 520}ms` }}>
            <svg viewBox="0 0 16 4" className="block h-full w-full" aria-hidden="true">
              <path d="M1 2 H15 M8 0.6 V3.4" stroke="#8a6a3a" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </span>
          {[45, 49, 53, 56].map((l, i) => (
            <span
              key={l}
              className="grp-ray absolute block"
              style={{
                left: `${l}%`,
                top: "19%",
                width: "0.7%",
                height: "15%",
                background: `linear-gradient(180deg, ${tint(p1, 0.9)}, transparent)`,
                transformOrigin: "50% 0%",
                animationDelay: `${delayMs + 680 + i * 50}ms`,
              }}
            />
          ))}
          <span className="grp-yank absolute block" style={{ left: "46.5%", top: "35%", width: "7%", height: "10.5%", animationDelay: `${delayMs + 760}ms` }}>
            <span className="absolute inset-0 block">
              <Man kind="n" fill={tint(p2, 0.95)} stroke={p1} />
            </span>
            <span className="grp-facein absolute inset-0 block" style={{ animationDelay: `${delayMs + 1200}ms` }}>
              <Man kind="n" fill={p1} stroke={p2} />
            </span>
          </span>
        </>
      )}
      {/* bespoke: Mind Dominion — the iron crown of command descends onto the
          rook and its colours turn beneath it */}
      {/* ignition flare + hex sparks + the curse-wave */}
      <Flash delayMs={delayMs + 720} color={tint(p1, 0.6)} left={42} top={41} w={16} h={11} />
      <Sparks delayMs={delayMs + 760} fill={p1} stroke={p2} cy={46} />
      <Boom delayMs={delayMs + 820} color={tint(p1, 0.85)} />
      {/* FLAGSHIP "Hexfall Column": a pillar of hex-light lasers down onto the
          circle's heart and the stage jolts as the working seals shut. */}
      <Impact rgb={rgbOf(p1)} atMs={delayMs + 820} laser left={40} top={33} size={20} />
      {/* geometry: the working REACHES: hex-light runs off the circle down the real line to the piece it is binding */}
      <Reach delayMs={delayMs + 460} color={tint(p1, 0.85)} top={48.6} thickness={1.2} />
      <GrandAccent tier={tier} color={tint(p1, 0.75)} delayMs={delayMs + 960} anchored={anchored} />
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
function StoneGaze({ palette, glyph, lead, role, anchored, delayMs, flourish, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance")
    return (
      <EntranceCut
        palette={palette}
        glyph={glyph}
        delayMs={delayMs}
        from="below"
        motif={
          <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
            <path d="M8 6.4 C5.4 5 4.6 2.8 6.4 1.4 M12 5.6 C11.2 3.2 12.2 1.4 14.4 0.8 M16 6.4 C18.6 5 19.4 2.8 17.6 1.4" fill="none" stroke={tint(p1, 0.9)} strokeWidth="1" {...SJ} />
            <path d="M7.4 16.6 L8 7.8 C8 5.4 16 5.4 16 7.8 L16.6 16.6 Z" fill={tint(p0, 0.92)} stroke={p2} strokeWidth="1" {...SJ} />
            <path d="M9.6 11 H11.2 M12.8 11 H14.4" stroke={p1} strokeWidth="1.1" strokeLinecap="round" />
            <path d="M5.4 20.4 H18.6 V23.4 H5.4 Z" fill={tint(p2, 0.85)} stroke={tint(p0, 0.8)} strokeWidth="0.7" {...SJ} />
          </svg>
        }
      />
    );
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 780}>
      <Wash color={tint(p0, 0.26)} delayMs={delayMs} anchored={anchored} />
      {/* tell: the boards shadow over and grit shivers where the bust will breach */}
      <TellShadow delayMs={delayMs} color={tint(p2, 0.55)} left={37} top={62} w={26} h={7} />
      <TellGlow delayMs={delayMs + 40} color={tint(p1, 0.3)} left={41} top={30} w={18} h={16} />
      {/* the bust, grinding up out of the boards (flagship pass: a third
          taller — the gorgon now owns the skyline) */}
      <span className="grp-rise absolute block" style={{ left: "33%", top: "15%", width: "34%", height: "60%", animationDelay: `${delayMs + 120}ms` }}>
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
          left: "16%",
          top: "33.5%",
          width: "26%",
          height: "4%",
          background: `linear-gradient(270deg, ${tint(p1, 0.9)}, transparent)`,
          transformOrigin: "100% 50%",
          animationDelay: `${delayMs + 520}ms`,
        }}
      />
      <span
        className="grp-beam absolute block"
        style={{
          left: "58%",
          top: "33.5%",
          width: "26%",
          height: "4%",
          background: `linear-gradient(90deg, ${tint(p1, 0.9)}, transparent)`,
          transformOrigin: "0% 50%",
          animationDelay: `${delayMs + 520}ms`,
        }}
      />
      {/* SIGNATURE: the stone TAKES square by square — a grey creep-band
          clicks across the middle ranks in the gaze's wake */}
      <span
        className="grp-creep absolute block"
        style={{
          left: "26%",
          top: "40%",
          width: "48%",
          height: "24%",
          background: `linear-gradient(90deg, transparent, ${tint("#8d8d94", 0.5)} 40%, ${tint(p0, 0.35)} 55%, ${tint("#8d8d94", 0.5)} 60%, transparent)`,
          animationDelay: `${delayMs + 640}ms`,
        }}
      />
      {/* bespoke: Medusa's Verdict — the queen catches the gaze, stiffens, and
          crunches into a walnut while frost nips her guard */}
      {/* bespoke: Eternal Statue — a laurel wreath is lowered onto the bust and
          the gallery plaque catches the light: chosen once, still for an age */}
      {/* spalling stone chips + the stone-shock */}
      <Flash delayMs={delayMs + 680} color={tint(p1, 0.55)} left={41} top={50} w={18} h={11} />
      <Sparks delayMs={delayMs + 720} fill={tint(p0, 0.95)} stroke={p2} cy={54} />
      <Boom delayMs={delayMs + 780} color={tint(p1, 0.85)} />
      {/* FLAGSHIP "Statue Split": the piece the gaze lands on is already stone,
          and it CRACKS IN HALF on the beat - the halves hinge apart and four
          granite chips spray while the stage jolts. */}
      <Impact
        rgb={rgbOf(p0)}
        atMs={delayMs + 780}
        left={35}
        top={39}
        size={18}
        shatter={<Man kind="n" fill={tint(p0, 0.95)} stroke={p2} />}
      />
      {/* geometry: the gaze does not rake at random: it runs the real line to the piece being taken */}
      <Reach delayMs={delayMs + 520} color={tint(p1, 0.9)} top={33} thickness={2.6} minCells={2.8} />
      <GrandAccent tier={tier} color={tint(p1, 0.75)} delayMs={delayMs + 920} anchored={anchored} />
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
function ColdFront({ palette, glyph, lead, role, anchored, delayMs, flourish, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance")
    return (
      <EntranceCut
        palette={palette}
        glyph={glyph}
        delayMs={delayMs}
        from="above"
        motif={
          <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
            <path d="M3 22 L2 6 L6 11 L7 1.6 L11.4 8.6 L13 3 L17 9.6 L19 4.6 L22 12 L22 22 Z" fill={tint(p0, 0.6)} stroke={tint(p1, 0.9)} strokeWidth="1" {...SJ} />
            <path d="M7 5.6 L7.6 15 M13 7 L13.6 16.4 M19 9 L19 18" fill="none" stroke={tint(p2, 0.6)} strokeWidth="0.7" />
          </svg>
        }
      />
    );
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 1000}>
      <Wash color={tint(p0, 0.26)} delayMs={delayMs} anchored={anchored} />
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
      {/* the ice front itself: a wall of leaning icicles crossing the crop
          (flagship pass: taller and wider — a weather system, not a fence) */}
      <span className="grp-sweep absolute block" style={{ left: "22%", top: "17%", width: "38%", height: "62%", animationDelay: `${delayMs + 100}ms` }}>
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
      {/* bespoke: Total Freeze — every neighbour iced in the same instant: a
          ring of six ice blocks snaps shut around the heart of the board */}
      {/* SIGNATURE: FLASH-FREEZE — behind the front a glassy sheet snaps
          across the mid-board in one take, catching the light along its edge */}
      <span
        className="grp-beam absolute block"
        style={{
          left: "22%",
          top: "30%",
          width: "56%",
          height: "38%",
          background: `linear-gradient(105deg, ${tint(p0, 0.28)}, ${tint(p1, 0.34)} 48%, ${tint(p0, 0.22)} 52%, ${tint(p1, 0.18)})`,
          transformOrigin: "0% 50%",
          animationDelay: `${delayMs + 780}ms`,
        }}
      />
      {/* rime flare + ice sparks + the glacial shock */}
      <Flash delayMs={delayMs + 900} color={tint(p1, 0.6)} left={44} top={42} w={17} h={12} />
      <Sparks delayMs={delayMs + 940} fill={p1} stroke={p2} cy={47} />
      <Boom delayMs={delayMs + 1000} color={tint(p1, 0.85)} />
      {/* FLAGSHIP "Floe Crack": the sheet the front froze splits in half with a
          shard spray on the boom beat (no extra ring - the cold does the
          talking) while the stage judders. */}
      <Impact
        rgb={rgbOf(p0)}
        atMs={delayMs + 1000}
        left={37}
        top={40}
        size={19}
        shock={false}
        shatter={
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <rect x="1" y="1.6" width="8" height="6.8" rx="0.8" fill={tint(p0, 0.7)} stroke={tint(p1, 0.9)} strokeWidth="0.5" />
            <path d="M5 1.6 V8.4 M1.6 3.4 L8.4 6.6" fill="none" stroke={tint(p1, 0.8)} strokeWidth="0.4" />
          </svg>
        }
      />
      {/* geometry: the front runs the play's own line, not a fixed compass bearing */}
      <Reach delayMs={delayMs + 700} color={tint(p1, 0.8)} top={46} thickness={2.2} minCells={3} />
      <GrandAccent tier={tier} color={tint(p1, 0.75)} delayMs={delayMs + 1140} anchored={anchored} />
      <Glint delayMs={delayMs + 1320} color={p1} left={52} top={34} />
      {/* settle: fine snow sifts down in the front's wake */}
      <Afterglow delayMs={delayMs + 1140} color={tint(p1, 0.26)} left={38} top={36} w={26} h={22} />
      <Settle delayMs={delayMs + 1180} dir="fall" sizePct={2} render={() => <Mote color={tint(p1, 0.85)} />} />
    </Stage>
  );
}

/* =============================================================================
   Template 7: PhantomParade — a spectral procession glides across the crop
   behind a floating lantern that carries the card's glyph.
   ========================================================================== */
const GHOSTS = [
  { l: 25, t: 31, w: 14, d: 140 },
  { l: 40, t: 25, w: 17, d: 0 },
  { l: 59, t: 32, w: 14, d: 220 },
];
function PhantomParade({ palette, glyph, lead, role, anchored, delayMs, flourish, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance")
    return (
      <EntranceCut
        palette={palette}
        glyph={glyph}
        delayMs={delayMs}
        from="above"
        motif={
          <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
            <path d="M9.4 6 H14.6 L16 18.4 C16 20.6 8 20.6 8 18.4 Z" fill={tint(p1, 0.5)} stroke={tint(p1, 0.95)} strokeWidth="0.9" {...SJ} />
            <path d="M10.4 6 V3.4 C10.4 1.6 13.6 1.6 13.6 3.4 V6" fill="none" stroke={tint(p2, 0.9)} strokeWidth="0.9" {...SJ} />
            <ellipse cx="12" cy="13.6" rx="2.2" ry="3.2" fill={tint(p1, 0.9)} />
            <path d="M6 22.4 C8 20.6 16 20.6 18 22.4" fill="none" stroke={tint(p0, 0.8)} strokeWidth="0.8" strokeLinecap="round" />
          </svg>
        }
      />
    );
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored}>
      <Wash color={tint(p0, 0.24)} delayMs={delayMs} anchored={anchored} />
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
      {/* SIGNATURE: each phantom trails an AFTER-IMAGE — a fainter echo of
          itself gliding half a step behind */}
      {GHOSTS.map((g, i) => (
        <span key={`echo${i}`} className="absolute block" style={{ left: `${g.l - 5}%`, top: `${g.t + 1.5}%`, width: `${g.w * 0.85}%`, height: `${g.w * 2}%`, opacity: 0.4 }}>
          <span className="grp-sweep absolute inset-0 block" style={{ animationDelay: `${delayMs + g.d + 160}ms` }}>
            <svg viewBox="0 0 12 28" className="block h-full w-full" aria-hidden="true">
              <path d="M6 1 C9.4 1 11 4 11 8 L11 22 L9 20 L7.5 24 L6 21 L4.5 24 L3 20 L1 22 L1 8 C1 4 2.6 1 6 1 Z" fill={tint(p1, 0.45)} {...SJ} />
            </svg>
          </span>
        </span>
      ))}
      {/* the leading lantern, the glyph shining inside it */}
      <span className="grp-sweep absolute block" style={{ left: "65%", top: "24%", width: "12%", height: "26%", animationDelay: `${delayMs + 60}ms` }}>
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
      {/* bespoke: Gossamer Veil — the great web drapes down, and the long
          blade that dives at it sticks fast in the silk */}
      {/* bespoke: Starlight Ward — stars kindle one by one in a ring around
          the king and the pooled light holds as a dome */}
      {flourish === "starward" && (
        <>
          <span className="grp-hold absolute block" style={{ left: "45%", top: "37%", width: "7%", height: "10%", animationDelay: `${delayMs + 560}ms` }}>
            <Man kind="k" fill={tint(p1, 0.9)} stroke={p2} />
          </span>
          {[
            { l: 44, t: 30, d: 0 },
            { l: 53, t: 34, d: 110 },
            { l: 54, t: 44, d: 220 },
            { l: 46, t: 49, d: 330 },
            { l: 39, t: 40, d: 440 },
          ].map((v, i) => (
            <span key={i} className="grp-glint absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "2.8%", height: "2.8%", animationDelay: `${delayMs + 700 + v.d}ms` }}>
              <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
                <path d="M5 0 L6.1 3.9 L10 5 L6.1 6.1 L5 10 L3.9 6.1 L0 5 L3.9 3.9 Z" fill="#fff4d6" />
              </svg>
            </span>
          ))}
          <span
            className="grp-hold absolute block rounded-full"
            style={{ left: "39%", top: "29%", width: "18%", height: "22%", border: `1.6px solid ${tint(p1, 0.65)}`, animationDelay: `${delayMs + 1080}ms` }}
          />
        </>
      )}
      {/* bespoke: Phase Army — the rook ghosts straight THROUGH its own pawn,
          thinning to mist at the pass and firming up beyond */}
      {/* bespoke: Ghost Legion — the pale pawns take running leaps clean over
          their blocker, one after the other */}
      {/* bespoke: Valkyrie — the chooser of the slain stoops out of the sky
          and the fallen knight is borne up and away with her */}
      {/* passing flare + pale sparks + the single spirit-wave */}
      <Flash delayMs={delayMs + 880} color={tint(p1, 0.5)} left={44} top={40} w={15} h={11} />
      <Sparks delayMs={delayMs + 920} fill={p1} stroke={p2} cy={45} />
      <Boom delayMs={delayMs + 980} color={tint(p1, 0.8)} />
      {/* FLAGSHIP "Moonbeam Descent": a cold spectral column lasers down
          through the lantern onto the road - light only, no quake: the parade
          passes without weight, which is the point. */}
      <Impact rgb={rgbOf(p1)} atMs={delayMs + 980} laser left={40} top={36} size={20} />
      {/* geometry: the procession's road, laid down the play's own line */}
      <Reach delayMs={delayMs + 640} color={tint(p1, 0.75)} top={44} thickness={1.4} minCells={3} />
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 1120} anchored={anchored} />
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
function ClockSpire({ palette, glyph, lead, role, anchored, delayMs, flourish, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance")
    return (
      <EntranceCut
        palette={palette}
        glyph={glyph}
        delayMs={delayMs}
        from="below"
        motif={
          <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
            <path d="M7 22 L8.6 7 H15.4 L17 22 Z" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="1" {...SJ} />
            <path d="M12 1.2 L15.4 7 H8.6 Z" fill={tint(p1, 0.8)} stroke={p2} strokeWidth="0.8" {...SJ} />
            <circle cx="12" cy="11.4" r="4.2" fill={tint(p2, 0.85)} stroke={tint(p1, 0.95)} strokeWidth="1" />
            <path d="M12 11.4 V8.4 M12 11.4 L14.4 12.6" stroke={p1} strokeWidth="1" strokeLinecap="round" />
          </svg>
        }
      />
    );
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 1000}>
      <Wash color={tint(p0, 0.24)} delayMs={delayMs} anchored={anchored} />
      {/* tell: the tower's shadow stretches over the square before it rises */}
      <TellShadow delayMs={delayMs} color={tint(p2, 0.55)} left={40} top={64} w={20} h={6} />
      <TellGlow delayMs={delayMs + 40} color={tint(p1, 0.3)} left={42} top={24} w={16} h={16} />
      {/* the spire, rising (flagship pass: it now scrapes the letter of the
          crop, a proper campanile) */}
      <span className="grp-rise absolute block" style={{ left: "39%", top: "11%", width: "22%", height: "60%", animationDelay: `${delayMs + 120}ms` }}>
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
          className="grp-pendulum absolute block"
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
      {/* bespoke: Lost Days — two calendar leaves tear off the tower and blow
          away while the struck days are crossed off the face */}
      {/* bespoke: Stolen Hours — a thieving hand slips across the face, makes
          off with the minute hand itself, and loose seconds spill behind */}
      {/* the toll: flare + sparks + the single time-ring */}
      {/* SIGNATURE: the tower CHIMES — two rings peal off the clock face at
          the pendulum's extremes */}
      {[0, 1].map((i) => (
        <span
          key={`chime${i}`}
          className="grp-tring absolute block rounded-full"
          style={{ left: `${45 - i * 2}%`, top: `${26 - i * 2}%`, width: `${10 + i * 4}%`, height: `${11 + i * 4}%`, border: `${2.5 - i * 0.5}px solid ${tint(p1, 0.85 - i * 0.2)}`, animationDelay: `${delayMs + 720 + i * 240}ms` }}
        />
      ))}
      <Flash delayMs={delayMs + 900} color={tint(p1, 0.6)} left={43} top={32} w={14} h={11} />
      <Sparks delayMs={delayMs + 940} fill={p1} stroke={p2} cy={38} />
      <Boom delayMs={delayMs + 1000} color={tint(p1, 0.85)} />
      {/* FLAGSHIP "Toll Shock": the great bell's strike is a physical blow - a
          second tight ground ring at the spire's base while the whole stage
          jolts on the toll. */}
      <Impact rgb={rgbOf(p1)} atMs={delayMs + 1000} left={41} top={42} size={18} />
      {/* geometry: the spire's shadow falls down the play's own line, onto the clock it is stopping */}
      <Reach delayMs={delayMs + 660} color={tint(p1, 0.85)} top={46} thickness={1.4} />
      <GrandAccent tier={tier} color={tint(p1, 0.75)} delayMs={delayMs + 1140} anchored={anchored} />
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
function CardRite({ palette, glyph, lead, role, anchored, delayMs, flourish, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance")
    return (
      <EntranceCut
        palette={palette}
        glyph={glyph}
        delayMs={delayMs}
        from="above"
        motif={
          <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
            <path d="M5.4 2.4 H18.6 V21.6 H5.4 Z" fill={tint(p0, 0.9)} stroke={tint(p1, 0.95)} strokeWidth="1.1" {...SJ} />
            <path d="M7.6 4.6 H16.4 V19.4 H7.6 Z" fill="none" stroke={tint(p2, 0.7)} strokeWidth="0.6" strokeDasharray="1.8 1.4" />
            <path d="M12 6.6 L14 10.8 L18 12 L14 13.2 L12 17.4 L10 13.2 L6 12 L10 10.8 Z" fill={tint(p1, 0.55)} />
          </svg>
        }
      />
    );
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 880}>
      <Wash color={tint(p0, 0.24)} delayMs={delayMs} anchored={anchored} />
      {/* tell: the card's shadow grows on the boards as it falls */}
      <TellShadow delayMs={delayMs} color={tint(p2, 0.55)} left={40} top={44} w={20} h={22} />
      <TellGlow delayMs={delayMs + 40} color={tint(p1, 0.28)} left={42} top={30} w={16} h={16} />
      {/* SIGNATURE: the deal leaves AFTER-IMAGES — two fainter echoes of the
          card chase it down out of the dealer's arc */}
      {[
        { l: 33, t: 16, o: 0.35, d: 40 },
        { l: 30.5, t: 13, o: 0.2, d: 90 },
      ].map((v, i) => (
        <span key={`ai${i}`} className="absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "28%", height: "54%", opacity: v.o }}>
          <span className="grp-drop absolute inset-0 block" style={{ animationDelay: `${delayMs + 120 + v.d}ms` }}>
            <svg viewBox="0 0 22 46" className="block h-full w-full" aria-hidden="true">
              <rect x="1" y="1" width="20" height="44" rx="2.4" fill={tint(p0, 0.6)} stroke={tint(p1, 0.7)} strokeWidth="1" />
            </svg>
          </span>
        </span>
      ))}
      {/* the great card, dealt down (flagship pass: a quarter bigger) */}
      <span className="grp-drop absolute block" style={{ left: "36%", top: "20%", width: "28%", height: "54%", animationDelay: `${delayMs + 120}ms` }}>
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
      {/* bespoke: The Tower — the bolt itself, hammering the card from above */}
      {flourish === "tower" && (
        <span className="grp-bolt absolute block" style={{ left: "45%", top: "10%", width: "10%", height: "18%", animationDelay: `${delayMs + 700}ms` }}>
          <svg viewBox="0 0 10 18" className="block h-full w-full" aria-hidden="true">
            <path d="M6.4 0.6 L3 8 H5.2 L2.6 15 L8.4 6.6 H5.8 L8 0.6 Z" fill="#ffd166" stroke="#c94a3a" strokeWidth="0.6" {...SJ} />
          </svg>
        </span>
      )}
      {/* bespoke: Draft Domination — the press bar slams onto the card's
          crown and its tier stars are squeezed off the face, falling */}
      {/* bespoke: Total Nullify — the null seal comes down on the face with a
          thud and the card's magic falls away as dead grey flecks */}
      {/* bespoke: Favorable Stars — the houses swing into line: five stars
          kindle in an arc over the deal and the alignment strokes between them */}
      {/* bespoke: Riddle Game — the burning question hangs on the face, then
          the whole wager flips face-down before it answers */}
      {/* bespoke: Rehab — the manacle chain across the card SNAPS, its halves
          spring away, and clean light climbs off the break */}
      {/* bespoke: Parole — the barred cell door on the face swings open and
          the freed pawn steps out into the light */}
      {/* bespoke: Warden's Bribe — a fistful of coins arcs across the deal
          into the warden's ledger, and the cell key drops in trade */}
      {/* bespoke: Iron Will — the mace lands square on the deal and the card
          only rattles: unbowed, unbroken, still standing */}
      {/* bespoke: Wrong Way — the signpost spins its arrows backwards and the
          pawn marches nose-first into the unseen wall */}
      {/* bespoke: Broken Elevator — the cable pays out, the car judders to a
          dead stop between floors, and the fault sparks at the sheave */}
      {/* bespoke: Unseelie Bargain — mortal and fae hands meet over the deal;
          two quick boons flare, then the hollow price hangs dark */}
      {/* bespoke: Chess Diff — a clean little board unrolls over the deal and
          the two bare kings square up for the sidegame */}
      {flourish === "sidegame" && (
        <>
          <span className="grp-facein absolute block" style={{ left: "42%", top: "34%", width: "16%", height: "16%", animationDelay: `${delayMs + 760}ms` }}>
            <svg viewBox="0 0 16 16" className="block h-full w-full" aria-hidden="true">
              <rect x="0.6" y="0.6" width="14.8" height="14.8" fill="#eef1f7" stroke={p2} strokeWidth="0.7" />
              {[0, 1, 2, 3].map((r) =>
                [0, 1, 2, 3].map((c) =>
                  (r + c) % 2 ? <rect key={`${r}${c}`} x={0.6 + c * 3.7} y={0.6 + r * 3.7} width="3.7" height="3.7" fill={tint(p2, 0.8)} /> : null,
                ),
              )}
            </svg>
          </span>
          <span className="grp-pop absolute block" style={{ left: "37%", top: "38%", width: "4.5%", height: "7%", animationDelay: `${delayMs + 1080}ms` }}>
            <Man kind="k" fill="#eef1f7" stroke={p2} />
          </span>
          <span className="grp-pop absolute block" style={{ left: "58.5%", top: "38%", width: "4.5%", height: "7%", animationDelay: `${delayMs + 1180}ms` }}>
            <Man kind="k" fill={tint(p2, 0.95)} stroke="#eef1f7" />
          </span>
        </>
      )}
      {/* the deal lands: flare + sparks + the single fate-wave */}
      <Flash delayMs={delayMs + 780} color={tint(p1, 0.6)} left={42} top={44} w={16} h={12} />
      <Sparks delayMs={delayMs + 820} fill={p1} stroke={p2} cy={49} />
      <Boom delayMs={delayMs + 880} color={tint(p1, 0.85)} />
      {/* FLAGSHIP "Verdict Slap": a column of fate-light lasers down onto the
          dealt card as it hits the table, and the table jumps - laser + quake,
          no extra ring (the deal IS the ring). */}
      <Impact rgb={rgbOf(p1)} atMs={delayMs + 880} laser shock={false} left={39} top={30} size={22} />
      {/* geometry: the deal reaches its mark: the rite runs the real line to the piece it names */}
      <Reach delayMs={delayMs + 560} color={tint(p1, 0.8)} top={50} thickness={1.4} />
      <GrandAccent tier={tier} color={tint(p1, 0.75)} delayMs={delayMs + 1020} anchored={anchored} />
      <Glint delayMs={delayMs + 1200} color={p1} left={54} top={27} />
      {/* settle: paper-fate flecks drift off the deal — Death's rise as souls */}
      <Afterglow delayMs={delayMs + 1020} color={tint(p1, 0.24)} left={40} top={32} w={20} h={22} />
      <Settle
        delayMs={delayMs + 1060}
        dir="fall"
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
function ThiefHand({ palette, glyph, lead, role, anchored, delayMs, flourish, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance")
    return (
      <EntranceCut
        palette={palette}
        glyph={glyph}
        delayMs={delayMs}
        from="above"
        motif={
          <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
            <path d="M4 13.4 C4 11.4 6 10.6 7.4 11.6 L9.6 13 V4.6 C9.6 2.6 12.6 2.6 12.6 4.6 V11.6 L14 5.6 C14.4 3.6 17.4 4.2 17 6.2 L15.6 13 L19.4 11.4 C21 10.8 22 13.2 20.4 14.2 L14.6 18.2 C12 20 8.4 19.4 6.6 17 Z" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="1" {...SJ} />
            <circle cx="19.4" cy="5.4" r="2.2" fill={tint(p1, 0.95)} stroke={p2} strokeWidth="0.6" />
          </svg>
        }
      />
    );
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 920}>
      <Wash color={tint(p2, 0.32)} delayMs={delayMs} anchored={anchored} />
      {/* tell: the prize glimmers awake while a shadow creeps in from the wing */}
      <TellGlow delayMs={delayMs} color={tint(p1, 0.35)} left={40} top={34} w={16} h={16} />
      <TellShadow delayMs={delayMs + 60} color={tint(p2, 0.7)} left={58} top={40} w={24} h={12} />
      {/* the prize, gleaming where it sits */}
      <span className="grp-facein absolute block" style={{ left: "40%", top: "33%", width: "15%", height: "25%", animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 12 20" className="absolute inset-0 block h-full w-full" aria-hidden="true">
          <circle cx="6" cy="10" r="5.4" fill={tint(p1, 0.3)} stroke={tint(p1, 0.9)} strokeWidth="0.8" />
        </svg>
        <span className="absolute block" style={{ left: "22%", top: "33%", width: "56%", height: "34%" }}>{glyph}</span>
      </span>
      {/* the shadow gauntlet, in and out with the goods (flagship pass: the
          arm now spans a third of the canvas) */}
      <span className="grp-grab absolute block" style={{ left: "45%", top: "28%", width: "37%", height: "33%", animationDelay: `${delayMs + 420}ms` }}>
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
      {/* bespoke: Spelltheft — a trade, technically: the prize goes right and
          a dull lowly bauble is lobbed back the other way */}
      {/* bespoke: Draft Seize — both dealt cards are swept off in the fist,
          and the consolation die tumbles back across the table */}
      {/* bespoke: Collapse — the whole line is hauled one square homeward in a
          single synchronised shove */}
      {/* bespoke: Void — the black mouth dilates on the boards, swallows the
          piece whole, and does not close */}
      {/* bespoke: Sabotage — the war-room gears are turning until the thrown
          wrench drops in and the whole works judders dead */}
      {/* bespoke: Empty Handed — the pocket is pulled clean inside out; all
          that leaves it is dust and one indignant moth */}
      {flourish === "emptypockets" && (
        <>
          <span className="grp-flip absolute block" style={{ left: "43%", top: "38%", width: "9%", height: "10%", animationDelay: `${delayMs + 780}ms` }}>
            <svg viewBox="0 0 9 10" className="block h-full w-full" aria-hidden="true">
              <path d="M1 1 H8 L7.4 6 C7.2 8 6 9.2 4.5 9.2 C3 9.2 1.8 8 1.6 6 Z" fill={tint(p2, 0.9)} stroke={tint(p1, 0.8)} strokeWidth="0.6" {...SJ} />
              <path d="M2.2 2.4 L6.8 2.4" stroke={tint(p1, 0.6)} strokeWidth="0.4" strokeDasharray="0.9 0.7" />
            </svg>
          </span>
          {[
            { l: 45, t: 36, d: 0 },
            { l: 50, t: 34, d: 140 },
          ].map((v, i) => (
            <span
              key={i}
              className="grp-settle absolute block"
              style={{ left: `${v.l}%`, top: `${v.t}%`, width: "1.8%", height: "1.8%", "--dx": `${i % 2 ? -40 : 50}%`, "--dy": "-160%", "--rot": "130deg", animationDelay: `${delayMs + 1040 + v.d}ms` } as CSSProperties}
            >
              <Mote color={tint(p1, 0.7)} />
            </span>
          ))}
          <span className="grp-riseslow absolute block" style={{ left: "47%", top: "31%", width: "3%", height: "2.6%", animationDelay: `${delayMs + 1100}ms` }}>
            <svg viewBox="0 0 10 8" className="block h-full w-full" aria-hidden="true">
              <path d="M5 4 C3 1 0.8 1.6 1.4 4 C0.8 6.4 3 7 5 4 Z M5 4 C7 1 9.2 1.6 8.6 4 C9.2 6.4 7 7 5 4 Z" fill={tint(p1, 0.8)} stroke={p2} strokeWidth="0.3" {...SJ} />
            </svg>
          </span>
        </>
      )}
      {/* the snap of the theft: flare + sparks + the single dark wave */}
      {/* SIGNATURE: the thief FUMBLES ONE — a single coin spills from the
          closing fist and bounces away across the boards */}
      <span
        className="grp-arcshot absolute block"
        style={{ left: "52%", top: "42%", width: "3.2%", height: "3.2%", "--dx": "-260%", "--dy": "-140%", animationDelay: `${delayMs + 820}ms` } as CSSProperties}
      >
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <circle cx="5" cy="5" r="4.2" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.7" />
          <path d="M5 2.8 V7.2" stroke="#8a6a3a" strokeWidth="0.6" strokeLinecap="round" />
        </svg>
      </span>
      <Flash delayMs={delayMs + 820} color={tint(p1, 0.55)} left={42} top={38} w={15} h={11} />
      <Sparks delayMs={delayMs + 860} fill={p1} stroke={p0} cy={44} />
      <Boom delayMs={delayMs + 920} color={tint(p1, 0.8)} />
      {/* FLAGSHIP "Prize Rip": the prize is torn in two as the gauntlet wrenches
          it away - the halves hinge apart and spray glinting fragments while
          the stage jolts (no extra ring: this hit is a THEFT, not a blast). */}
      <Impact
        rgb={rgbOf(p1)}
        atMs={delayMs + 920}
        left={38}
        top={36}
        size={18}
        shock={false}
        shatter={
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 1 L8.6 4 L7.2 8.6 H2.8 L1.4 4 Z" fill={tint(p1, 0.85)} stroke={tint(p0, 0.9)} strokeWidth="0.5" {...SJ} />
            <path d="M5 1 L5 8.6 M1.4 4 H8.6" fill="none" stroke={tint(p0, 0.7)} strokeWidth="0.4" />
          </svg>
        }
      />
      {/* geometry: the reach itself: the arm runs the real line out to the prize */}
      <Reach delayMs={delayMs + 560} color={tint(p1, 0.85)} top={42} thickness={1.6} minCells={3} />
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 1060} anchored={anchored} />
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
function CrownForge({ palette, glyph, lead, role, anchored, delayMs, flourish, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance")
    return (
      <EntranceCut
        palette={palette}
        glyph={glyph}
        delayMs={delayMs}
        from="below"
        motif={
          <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
            <path d="M4 12 H20 L17 15.4 H16 V19 H8 V15.4 H7 Z" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="1" {...SJ} />
            <path d="M6 19.6 H18 V22.4 H6 Z" fill={tint(p2, 0.9)} stroke={tint(p0, 0.8)} strokeWidth="0.7" {...SJ} />
            <path d="M6.4 9.6 L7.6 2.6 L10.4 6.4 L12 1.6 L13.6 6.4 L16.4 2.6 L17.6 9.6 Z" fill={tint(p1, 0.92)} stroke={p2} strokeWidth="0.8" {...SJ} />
          </svg>
        }
      />
    );
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 940}>
      <Wash color={tint(p0, 0.24)} delayMs={delayMs} anchored={anchored} />
      {/* tell: forge-heat pools under the boards before the anvil breaches */}
      <TellShadow delayMs={delayMs} color={tint(p2, 0.55)} left={38} top={62} w={24} h={7} />
      <TellGlow delayMs={delayMs + 40} color={tint(p1, 0.35)} left={40} top={44} w={20} h={16} />
      {/* the anvil, grinding up (flagship pass: a quarter bigger) */}
      <span className="grp-rise absolute block" style={{ left: "35%", top: "38%", width: "30%", height: "30%", animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
          <path d="M2 6 H19 C21.4 6 23 7.4 23 9 C20 10.6 17 10.6 15 9.6 L15.5 13 H8.5 L9 9.6 C7 11 4.6 11.4 2 10 Z" fill={tint(p2, 0.95)} stroke={tint(p0, 0.85)} strokeWidth="0.9" {...SJ} />
          <path d="M7 13 H17 L19 19 H5 Z M4 19 H20 V22.6 H4 Z" fill={tint(p2, 0.9)} stroke={tint(p0, 0.85)} strokeWidth="0.8" {...SJ} />
          <path d="M4 7.6 H12" stroke={tint(p1, 0.5)} strokeWidth="0.6" strokeLinecap="round" />
        </svg>
      </span>
      {/* the hammer, falling onto the face */}
      <span className="grp-swing absolute block" style={{ left: "52%", top: "16%", width: "20%", height: "30%", transformOrigin: "88% 88%", animationDelay: `${delayMs + 460}ms` }}>
        <svg viewBox="0 0 16 24" className="block h-full w-full" aria-hidden="true">
          <path d="M13.4 21.6 L4.6 7.4" stroke={tint(p0, 0.95)} strokeWidth="1.6" strokeLinecap="round" />
          <rect x="0.8" y="2" width="9" height="6.4" rx="1" transform="rotate(-14 5.3 5.2)" fill={tint(p2, 0.95)} stroke={tint(p0, 0.85)} strokeWidth="0.8" />
        </svg>
      </span>
      {/* bespoke: Double Queen — the hammer comes down TWICE, and a second
          crown pops out on the off-beat (a proper double-take) */}
      {/* bespoke: Promotion Storm — knight helms rain out of the forge sky
          all along the fifth rank */}
      {/* bespoke: Legendary Forge — the broken knight is laid on the face and
          comes back seamed with gold where the cracks were */}
      {flourish === "reforge" && (
        <>
          <span className="absolute block" style={{ left: "44%", top: "31%", width: "8%", height: "12%" }}>
            <span className="grp-hold absolute inset-0 block" style={{ animationDelay: `${delayMs + 520}ms` }}>
              <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
                <path d={CHESSMAN.n} fill={tint(p2, 0.95)} stroke={p0} strokeWidth="0.45" {...SJ} />
                <path d="M4 4 L5.6 6.4 M6.2 5 L5 7.6" stroke={p0} strokeWidth="0.35" strokeLinecap="round" />
              </svg>
            </span>
            <span className="grp-facein absolute inset-0 block" style={{ animationDelay: `${delayMs + 1080}ms` }}>
              <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
                <path d={CHESSMAN.n} fill={tint(p2, 0.95)} stroke={p1} strokeWidth="0.45" {...SJ} />
                <path d="M4 4 L5.6 6.4 M6.2 5 L5 7.6" stroke="#ffd166" strokeWidth="0.5" strokeLinecap="round" />
              </svg>
            </span>
          </span>
          <Glint delayMs={delayMs + 1400} color="#ffd166" left={50} top={31} sizePct={4} />
        </>
      )}
      {/* bespoke: Second King — the crown comes down on a common pawn, and
          then there are two crowns burning side by side */}
      {/* bespoke: Leaden Crown — the grey crown lands with a THUD; the new
          queen buckles under the weight but nothing can touch her */}
      {/* bespoke: Overclock Major — the forge gauge redlines: the needle slams
          to full and stray voltage strobes off the anvil */}
      {flourish === "overclock" && (
        <>
          <span className="grp-pop absolute block" style={{ left: "42%", top: "24%", width: "12%", height: "8%", animationDelay: `${delayMs + 560}ms` }}>
            <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
              <path d="M1 7.4 C1 3.4 3.2 1 6 1 C8.8 1 11 3.4 11 7.4 Z" fill={tint(p2, 0.9)} stroke={p1} strokeWidth="0.6" {...SJ} />
              <path d="M2.6 5.4 L3.4 4.6 M6 3 V4 M9.4 5.4 L8.6 4.6" stroke={tint(p1, 0.9)} strokeWidth="0.5" strokeLinecap="round" />
            </svg>
            <span className="grp-swing absolute block" style={{ left: "44%", top: "20%", width: "12%", height: "68%", transformOrigin: "50% 92%", animationDelay: `${delayMs + 760}ms` }}>
              <svg viewBox="0 0 2 10" className="block h-full w-full" aria-hidden="true">
                <path d="M1 0.6 V9" stroke={p0} strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </span>
          </span>
          <span className="grp-bolt absolute block" style={{ left: "56%", top: "30%", width: "5%", height: "10%", animationDelay: `${delayMs + 1060}ms` }}>
            <svg viewBox="0 0 10 18" className="block h-full w-full" aria-hidden="true">
              <path d="M6.4 0.6 L3 8 H5.2 L2.6 15 L8.4 6.6 H5.8 L8 0.6 Z" fill={p0} stroke={p2} strokeWidth="0.6" {...SJ} />
            </svg>
          </span>
        </>
      )}
      {/* bespoke: Ascendant Knight — wings snap open at the knight's shoulders
          and he lifts off the anvil inside the ward light */}
      {/* bespoke: Nerf Breaker — the shackle is laid across the anvil and the
          stroke bursts it: halves spring apart, links flying */}
      {/* strike sparks fanning off the anvil face */}
      <Sparks delayMs={delayMs + 760} fill={p1} stroke={p0} cx={50} cy={46} />
      <Flash delayMs={delayMs + 740} color={tint(p1, 0.8)} left={43} top={41} w={14} h={10} />
      {/* the finished work */}
      <span className="grp-facein absolute block" style={{ left: "44%", top: "28%", width: "12%", height: "12%", animationDelay: `${delayMs + 900}ms` }}>{glyph}</span>
      {/* the single forge-wave */}
      {/* SIGNATURE: the stroke fires a FOUNTAIN — four forge sparks straight
          up off the anvil face, hanging weightless at apex before the fall */}
      {[
        { dx: "-220%", dy: "-320%", d: 0 },
        { dx: "-60%", dy: "-440%", d: 45 },
        { dx: "100%", dy: "-420%", d: 90 },
        { dx: "240%", dy: "-300%", d: 135 },
      ].map((v, i) => (
        <span
          key={`ft${i}`}
          className="grp-hang absolute block rounded-full"
          style={{ left: "48.9%", top: "44%", width: "2.2%", height: "2.2%", background: i % 2 ? "#fff4d6" : tint(p1, 0.95), "--dx": v.dx, "--dy": v.dy, animationDelay: `${delayMs + 760 + v.d}ms` } as CSSProperties}
        />
      ))}
      <Boom delayMs={delayMs + 940} color={tint(p1, 0.85)} thickness={4} />
      {/* FLAGSHIP "Anvil Break": the hammer blow splits the old crown clean in
          half on the anvil - halves fall away, sparks fly as shards, the anvil
          ring rolls out and the forge floor jolts, all on one beat. */}
      <Impact
        rgb={rgbOf(p1)}
        atMs={delayMs + 940}
        left={39}
        top={34}
        size={19}
        shatter={
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M1.6 7.8 H8.4 L9 3 L6.9 4.8 L5 2.2 L3.1 4.8 L1 3 Z" fill={tint(p1, 0.9)} stroke={tint(p2, 0.9)} strokeWidth="0.5" {...SJ} />
          </svg>
        }
      />
      {/* geometry: the finished work is carried down the real line to the piece it crowns */}
      <Reach delayMs={delayMs + 620} color={tint(p1, 0.85)} top={50} thickness={1.8} />
      <GrandAccent tier={tier} color={tint(p1, 0.75)} delayMs={delayMs + 1080} anchored={anchored} />
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
function RiftGate({ palette, glyph, lead, role, anchored, delayMs, flourish, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance")
    return (
      <EntranceCut
        palette={palette}
        glyph={glyph}
        delayMs={delayMs}
        from="below"
        motif={
          <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
            <path d="M3.4 22 L4.6 5 H7.4 L8.6 22 Z" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="0.9" {...SJ} />
            <path d="M15.4 22 L16.6 5 H19.4 L20.6 22 Z" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="0.9" {...SJ} />
            <path d="M9.4 6.4 H14.6 V21 H9.4 Z" fill={tint(p1, 0.45)} stroke={tint(p1, 0.95)} strokeWidth="0.9" {...SJ} />
            <path d="M10.6 8.4 V19 M13.4 9.4 V18" fill="none" stroke={tint(p2, 0.75)} strokeWidth="0.7" strokeLinecap="round" />
          </svg>
        }
      />
    );
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 900}>
      <Wash color={tint(p0, 0.24)} delayMs={delayMs} anchored={anchored} />
      {/* tell: stray aurora light converges on the two footings */}
      <TellGlow delayMs={delayMs} color={tint(p1, 0.3)} left={35} top={40} w={10} h={20} />
      <TellGlow delayMs={delayMs + 60} color={tint(p1, 0.3)} left={55} top={40} w={10} h={20} />
      <TellRays delayMs={delayMs + 20} color={tint(p1, 0.7)} />
      {/* the twin obelisks (flagship pass: taller, set wider apart) */}
      {[33, 60].map((l, i) => (
        <span key={i} className="grp-rise absolute block" style={{ left: `${l}%`, top: "21%", width: "7%", height: "46%", animationDelay: `${delayMs + 120 + i * 90}ms` }}>
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
          left: "40.5%",
          top: "25%",
          width: "19%",
          height: "42%",
          background: `linear-gradient(180deg, ${tint(p1, 0.6)}, ${tint(p0, 0.35)} 60%, ${tint(p1, 0.5)})`,
          animationDelay: `${delayMs + 420}ms`,
        }}
      />
      {/* SIGNATURE: the GATE SURGES — a column of aurora light vents straight
          up out of the pane the instant it seals */}
      <span
        className="grp-ray absolute block"
        style={{
          left: "46.5%",
          top: "8%",
          width: "7%",
          height: "18%",
          background: `linear-gradient(0deg, ${tint(p1, 0.85)}, transparent)`,
          transformOrigin: "50% 100%",
          animationDelay: `${delayMs + 700}ms`,
        }}
      />
      {/* the card's glyph, shining through the gate */}
      <span className="grp-facein absolute block" style={{ left: "44.5%", top: "36%", width: "11%", height: "19%", animationDelay: `${delayMs + 620}ms` }}>{glyph}</span>
      {/* bespoke: Mirror of Souls — two reflections trade places THROUGH the
          glass, each dimming as it passes the silvered pane */}
      {/* bespoke: Fey Step — leaves bud along the gateposts, the knight slips
          into the hedge and pops out already behind the far lines */}
      {flourish === "hedgerow" && (
        <>
          {[
            { l: 38, t: 32, d: 0 },
            { l: 60, t: 36, d: 120 },
            { l: 39, t: 52, d: 240 },
          ].map((v, i) => (
            <span key={i} className="grp-pop absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "2.8%", height: "2.8%", animationDelay: `${delayMs + 560 + v.d}ms` }}>
              <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
                <path d="M2 8 C2 4 5 1.6 8.4 1.6 C7.6 5.6 5.4 7.6 2 8 Z" fill="#a8e07f" stroke="#1c4a1c" strokeWidth="0.5" {...SJ} />
              </svg>
            </span>
          ))}
          <span
            className="grp-tug absolute block"
            style={{ left: "30%", top: "42%", width: "6%", height: "9%", "--dx": "260%", "--dy": "-10%", animationDelay: `${delayMs + 700}ms` } as CSSProperties}
          >
            <Man kind="n" fill={tint(p1, 0.9)} stroke={p2} />
          </span>
          <span className="grp-pop absolute block" style={{ left: "62%", top: "24%", width: "6%", height: "9%", animationDelay: `${delayMs + 1240}ms` }}>
            <Man kind="n" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <Glint delayMs={delayMs + 1420} color={p1} left={66} top={23} sizePct={3.4} />
        </>
      )}
      {/* bespoke: Conjured Rook — stray motes are drawn into the pane and a
          spectral rook stands assembled where they met */}
      {/* bespoke: Twin Familiars — two little winged wisps dart out of the
          gate and perch, one on each waiting bishop */}
      {/* bespoke: Ley Line — the old current wakes under one file and the
          piece rides the surge straight up the board through the gate */}
      {flourish === "leyline" && (
        <>
          <span
            className="grp-ray absolute block"
            style={{
              left: "48%",
              top: "20%",
              width: "4%",
              height: "48%",
              background: `linear-gradient(0deg, ${tint(p1, 0.85)}, ${tint(p0, 0.4)}, transparent)`,
              transformOrigin: "50% 100%",
              animationDelay: `${delayMs + 620}ms`,
            }}
          />
          <span className="grp-riseslow absolute block" style={{ left: "47%", top: "46%", width: "6%", height: "9%", animationDelay: `${delayMs + 780}ms` }}>
            <Man kind="b" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <Glint delayMs={delayMs + 1220} color={p1} left={49} top={26} sizePct={3.6} />
          <Glint delayMs={delayMs + 1340} color={p1} left={51} top={38} sizePct={3} />
        </>
      )}
      {/* crossing flare + sparks + the single rift-wave */}
      <Flash delayMs={delayMs + 800} color={tint(p1, 0.6)} left={43} top={42} w={14} h={11} />
      <Sparks delayMs={delayMs + 840} fill={p1} stroke={p2} cy={47} />
      <Boom delayMs={delayMs + 900} color={tint(p1, 0.85)} />
      {/* FLAGSHIP "Aurora Column": the pane's light lasers straight down
          between the obelisks as the gate locks open, ground ring under it,
          stage jolt on the same beat. */}
      <Impact rgb={rgbOf(p1)} atMs={delayMs + 900} laser left={39} top={34} size={21} />
      {/* geometry: the gate opens ONTO somewhere: the current runs the play's real vector */}
      <Reach delayMs={delayMs + 580} color={tint(p1, 0.85)} top={47} thickness={2} minCells={3} />
      <GrandAccent tier={tier} color={tint(p1, 0.75)} delayMs={delayMs + 1040} anchored={anchored} />
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
function BeastRush({ palette, glyph, lead, role, anchored, delayMs, flourish, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  // Comic-timing: the bonk holds its beat before the punchline lands.
  const hold = flourish === "sahur" ? 200 : 0;
  if (role === "entrance")
    return (
      <EntranceCut
        palette={palette}
        glyph={glyph}
        delayMs={delayMs}
        from="below"
        motif={
          <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
            <path d="M5 12.6 C5 8 8.2 5.4 12 5.4 C15.8 5.4 19 8 19 12.6 C19 17.6 16 21 12 21 C8 21 5 17.6 5 12.6 Z" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="1" {...SJ} />
            <path d="M6.6 7.4 C4 5.6 3 3 3.6 1.4 C5.6 2.2 7.4 3.8 8.4 5.8 M17.4 7.4 C20 5.6 21 3 20.4 1.4 C18.4 2.2 16.6 3.8 15.6 5.8" fill="none" stroke={tint(p1, 0.95)} strokeWidth="1.2" {...SJ} />
            <circle cx="9.6" cy="12" r="1.1" fill={p1} />
            <circle cx="14.4" cy="12" r="1.1" fill={p1} />
            <path d="M10 17 H14" stroke={tint(p2, 0.8)} strokeWidth="0.9" strokeLinecap="round" />
          </svg>
        }
      />
    );
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 900 + hold}>
      <Wash color={tint(p0, 0.24)} delayMs={delayMs} anchored={anchored} />
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
      {/* SIGNATURE: HOOF-SHOCK — three dust rings pop along the charge line
          in the beast's wake, marking every stride */}
      {[
        { l: 28, d: 340 },
        { l: 42, d: 490 },
        { l: 56, d: 640 },
      ].map((v, i) => (
        <span
          key={`hoof${i}`}
          className="grp-tring absolute block rounded-full"
          style={{ left: `${v.l}%`, top: "56%", width: "7%", height: "4%", border: `2px solid ${tint(p2, 0.75)}`, animationDelay: `${delayMs + v.d}ms` }}
        />
      ))}
      {/* the beast, at full gallop (flagship pass: a quarter bigger) */}
      <span className="grp-sweep-fast absolute block" style={{ left: "29%", top: "29%", width: "38%", height: "33%", animationDelay: `${delayMs + 140}ms` }}>
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
      {/* FLAGSHIP "Hoofquake": whatever stood at the far wing is simply run
          THROUGH - the trampled pawn splits in half under the hooves, debris
          sprays down the charge line and the stage bucks on the stampede beat. */}
      <Impact
        rgb={rgbOf(p1)}
        atMs={delayMs + 900 + hold}
        left={55}
        top={34}
        size={18}
        shatter={<Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />}
      />
      {/* geometry: the charge line, laid down the real source -> victim vector */}
      <Reach delayMs={delayMs + 560 + hold} color={tint(p1, 0.85)} top={52} thickness={2.4} minCells={3} />
      <GrandAccent tier={tier} color={tint(p1, 0.75)} delayMs={delayMs + 1040 + hold} anchored={anchored} />
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
      <circle cx="5" cy="5" r="0.3" fill="#fff4d6" />
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
      <path d="M2.6 3.4 C3.4 2.4 6.6 2.4 7.4 3.4" fill="none" stroke="#eef8ff" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M1.6 6.2 L2.4 6.2 M2 5.8 L2 6.6" stroke="#9fd8ff" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // a piece frozen mid-step: boot in an ice cube
  frozen_moment: (
    <Gl>
      <path d="M2 3.6 L5 1.6 L8 3.6 L8 7.6 L5 9.4 L2 7.6 Z" fill="#bfe6ff" fillOpacity="0.55" stroke="#4f8fd1" strokeWidth="0.5" {...SJ} />
      <path d="M4 4 H5.6 V6 C6.4 6 7 6.4 7 7.2 H4 Z" fill="#5a6b8f" stroke="#2c3e6b" strokeWidth="0.4" {...SJ} />
      <path d="M2.8 4.4 L4 5.6" stroke="#eef8ff" strokeWidth="0.4" strokeLinecap="round" />
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
      <path d="M5 2 V3.2 M4.5 2.6 H5.5" stroke="#eef8ff" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // total whiteout: the blizzard flake
  total_whiteout: (
    <Gl>
      <path d="M5 0.8 V9.2 M1.4 2.9 L8.6 7.1 M8.6 2.9 L1.4 7.1" stroke="#eef8ff" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M4 1.8 L5 2.8 L6 1.8 M4 8.2 L5 7.2 L6 8.2 M1.9 4.2 L3 3.7 M1.9 5.8 L3 6.3 M8.1 4.2 L7 3.7 M8.1 5.8 L7 6.3" fill="none" stroke="#eef8ff" strokeWidth="0.5" {...SJ} />
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
      <circle cx="5" cy="5" r="1.3" fill="#eef8ff" stroke="#4f8fd1" strokeWidth="0.4" />
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
      <path d="M5 5 L5 2.2 M5 5 L7.2 6.2" stroke="#fff4d6" strokeWidth="0.8" strokeLinecap="round" />
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
      <circle cx="5" cy="6.8" r="0.6" fill="#eef8ff" stroke="#3a5fbf" strokeWidth="0.3" />
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
      <path d="M3.8 3 C4.6 2.4 5.6 2.4 6.4 3.2" fill="none" stroke="#eef8ff" strokeWidth="0.5" strokeLinecap="round" />
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
   PER-CARD SCENES (slice TC-great). The tier 7-8 cards of this band used to
   share a template (a witch circle, a siege cart, a crown forge...) with one
   small flourish of their own; each now plays a scene that draws its rule on
   the squares the rule names. Inside <Frame> 0..100% is exactly the board and
   one square is 12.5%; the cast square sits at (--fx-ox, --fx-oy) cells from
   the board centre, and anything that depends on whose side is whose leans on
   --fx-side (+1 when the caster sits at the bottom of the screen), so the same
   scene is right for either player and for any cast square.
   ========================================================================== */

/** Inline delay for the per-card scenes: the queue's stagger arrives as
 * delayMs, and the scene's own offset scales with --fx-dur. */
function dm(delayMs: number, off: number): string {
  return `calc(${delayMs}ms + ${off}ms * var(--fx-dur, 1))`;
}

/** A box `size` squares wide centred `dx`, `dy` squares from the cast square,
 * in <Frame> percentages. */
function cell(dx: number, dy: number, size = 1): CSSProperties {
  return {
    left: `calc(50% + (var(--fx-ox, 0) + ${dx - size / 2}) * 12.5%)`,
    top: `calc(50% + (var(--fx-oy, 0) + ${dy - size / 2}) * 12.5%)`,
    width: `${size * 12.5}%`,
    height: `${size * 12.5}%`,
  };
}

/** Board rows, as <Frame> percentages, for rule geometry that names ranks. */
const ROW = {
  /** Top of the opponent's back rank. */
  enemyBack: "calc(43.75% - var(--fx-side, 1) * 43.75%)",
  /** Top of the caster's half (four ranks tall). */
  ownHalf: "calc(25% + var(--fx-side, 1) * 25%)",
  /** Top of the opponent's half (four ranks tall). */
  enemyHalf: "calc(25% - var(--fx-side, 1) * 25%)",
  /** Centre line of the caster's back rank. */
  ownEdge: "calc(50% + var(--fx-side, 1) * 43.75%)",
} as const;

/** The eight neighbours of a square, in the order a blast rolls round them. */
const RING8: [number, number][] = [
  [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1],
];

/** Settle flecks that drift off a spot; `dir` 1 sinks, -1 climbs. */
function Flecks({
  delayMs,
  at,
  color,
  dir = 1,
  n = 5,
}: {
  delayMs: number;
  at: CSSProperties;
  color: string;
  dir?: 1 | -1;
  n?: number;
}) {
  return (
    <span className="absolute block" style={at}>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className="grp-settle absolute block"
          style={
            {
              left: `${18 + ((i * 29) % 64)}%`,
              top: `${30 + ((i * 17) % 40)}%`,
              width: "14%",
              height: "14%",
              "--dx": `${(i % 2 ? 1 : -1) * (40 + i * 12)}%`,
              "--dy": `${dir * (120 + i * 30)}%`,
              "--rot": `${90 + i * 40}deg`,
              animationDelay: dm(delayMs, i * 70),
            } as CSSProperties
          }
        >
          <Mote color={color} />
        </span>
      ))}
    </span>
  );
}

/* --- atomic_captures -------------------------------------------------------
   "Whenever one of your pieces captures, every enemy piece on the 8 squares
   around the captured square is also removed, except kings and pawns."
   A crosshair settles on the capture square, the take lands, then the blast
   runs the eight neighbours and nothing else: the 3x3 is ruled off, each of
   the eight cells cracks and kicks outward in turn, and a mushroom cloud
   stands on the captured square. A king and a pawn sit untouched at the rim
   of the blast (the two it spares). Fallout sifts down inside the 3x3. */
function Trefoil({ fill, hole }: { fill: string; hole: string }) {
  return (
    <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
      <circle cx="10" cy="10" r="9.2" fill={hole} />
      {[0, 120, 240].map((a) => (
        <path key={a} d="M10 10 L6.2 3.4 A7.6 7.6 0 0 1 13.8 3.4 Z" fill={fill} transform={`rotate(${a} 10 10)`} />
      ))}
      <circle cx="10" cy="10" r="2.1" fill={fill} stroke={hole} strokeWidth="0.9" />
    </svg>
  );
}
function MushroomCloud({ p0, p1, p2 }: { p0: string; p1: string; p2: string }) {
  return (
    <svg viewBox="0 0 20 24" className="block h-full w-full" aria-hidden="true">
      <path d="M8.4 23.6 C8.8 19 8.6 15.6 7.8 12.6 H12.2 C11.4 15.6 11.2 19 11.6 23.6 Z" fill={p0} stroke={p2} strokeWidth="0.6" />
      <ellipse cx="10" cy="15.2" rx="4.6" ry="1.3" fill="none" stroke={p1} strokeWidth="0.8" />
      <path d="M2 11.4 C0.6 7.6 3.2 3.2 7 3.6 C8 1 12 1 13 3.6 C16.8 3.2 19.4 7.6 18 11.4 C15 13.4 5 13.4 2 11.4 Z" fill={p0} stroke={p2} strokeWidth="0.7" {...SJ} />
      <path d="M4.6 9.6 C6.6 10.8 13.4 10.8 15.4 9.6" fill="none" stroke={p1} strokeWidth="0.9" strokeLinecap="round" />
      <path d="M1.6 23.6 C4.6 21.6 15.4 21.6 18.4 23.6 Z" fill={p2} />
    </svg>
  );
}
function AtomicCapturesScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance")
    return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<MushroomCloud p0={p0} p1={p1} p2={p2} />} />;
  if (!lead) {
    // one removed neighbour: its square cracks and blows outward along its leg
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="grp-flash absolute block" style={{ left: "8%", top: "8%", width: "84%", height: "84%", background: tint(p1, 0.5), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-blast absolute block" style={{ left: "14%", top: "14%", width: "72%", height: "72%", rotate: "calc(var(--fx-ang, 0) * 1deg)", "--tx1": "26%", "--gd": "0.7s", animationDelay: dm(delayMs, 90) } as CSSProperties}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <rect x="0.8" y="0.8" width="8.4" height="8.4" fill="none" stroke={p0} strokeWidth="0.9" />
            <path d="M5 1.2 L4.2 4 L1.4 5 L4.4 5.8 L5 8.8 L5.8 5.8 L8.6 5 L5.8 4 Z" fill={p1} stroke={p2} strokeWidth="0.4" {...SJ} />
          </svg>
        </span>
        <span className="grp-c-pip absolute block" style={{ left: "33%", top: "33%", width: "34%", height: "34%", "--gd": "0.9s", animationDelay: dm(delayMs, 260) } as CSSProperties}>
          <Trefoil fill={p0} hole={p2} />
        </span>
        <Flecks delayMs={delayMs + 420} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p0, 0.8)} n={3} />
      </span>
    );
  }
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 360}>
      <Frame anchored={anchored}>
        {/* tell: the crosshair settles on the capture square */}
        <span className="grp-tellglow absolute block rounded-full" style={{ ...cell(0, 0, 1.6), background: tint(p1, 0.4), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-stamp absolute block" style={{ ...cell(0, 0, 1), "--gd": "0.55s", "--r0": "45deg", animationDelay: dm(delayMs, 60) } as CSSProperties}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <circle cx="5" cy="5" r="3.4" fill="none" stroke={p1} strokeWidth="0.6" />
            <path d="M5 0.4 V3 M5 7 V9.6 M0.4 5 H3 M7 5 H9.6" stroke={p1} strokeWidth="0.7" strokeLinecap="round" />
          </svg>
        </span>
        {/* strike: the take lands on the square */}
        <span className="grp-flash absolute block" style={{ ...cell(0, 0, 1.2), background: tint(p1, 0.7), animationDelay: dm(delayMs, 300) }} />
        {/* the blast zone is ruled off: exactly the 3x3 round the capture */}
        <span className="grp-c-in absolute block" style={{ ...cell(0, 0, 3), "--gd": "1.5s", "--s0": "0.3", animationDelay: dm(delayMs, 330) } as CSSProperties}>
          <svg viewBox="0 0 30 30" className="block h-full w-full" aria-hidden="true">
            <rect x="0.6" y="0.6" width="28.8" height="28.8" fill="none" stroke={p0} strokeWidth="0.9" strokeDasharray="2.4 1.2" />
            <path d="M10 0.6 V29.4 M20 0.6 V29.4 M0.6 10 H29.4 M0.6 20 H29.4" stroke={tint(p0, 0.55)} strokeWidth="0.5" />
          </svg>
        </span>
        {/* each of the eight neighbours cracks and kicks outward in turn */}
        {RING8.map(([dx, dy], i) => (
          <span
            key={i}
            className="grp-c-blast absolute block"
            style={{ ...cell(dx, dy, 0.9), "--tx1": `${dx * 34}%`, "--ty1": `${dy * 34}%`, "--gd": "0.75s", animationDelay: dm(delayMs, 380 + i * 32) } as CSSProperties}
          >
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <rect x="0.6" y="0.6" width="8.8" height="8.8" fill={tint(p0, 0.42)} stroke={p0} strokeWidth="0.6" />
              <path d="M5 0.6 L4 4 L0.6 5 M4 4 L6.2 6.4 L9.4 9.4 M6.2 6.4 L9.4 4.2" fill="none" stroke={p2} strokeWidth="0.55" {...SJ} />
            </svg>
          </span>
        ))}
        {/* the cloud stands on the captured square */}
        <span className="grp-c-up absolute block" style={{ ...cell(0, -0.9, 2.2), top: "calc(50% + max(var(--fx-oy, 0) - 2, -4) * 12.5%)", "--gd": "1.35s", animationDelay: dm(delayMs, 520) } as CSSProperties}>
          <MushroomCloud p0={p0} p1={p1} p2={p2} />
        </span>
        <span className="grp-c-stamp absolute block" style={{ ...cell(0, 0, 0.55), "--gd": "1s", animationDelay: dm(delayMs, 640) } as CSSProperties}>
          <Trefoil fill={p0} hole={p2} />
        </span>
        {/* the two it spares: a king and a pawn stay put at the rim */}
        {(["k", "p"] as const).map((kind, i) => (
          <span key={kind} className="grp-c-pip absolute block" style={{ ...cell(1.9 - i * 3.8, 1.9, 0.6), "--gd": "1.1s", animationDelay: dm(delayMs, 760 + i * 80) } as CSSProperties}>
            <Man kind={kind} fill={tint(p1, 0.95)} stroke={p2} />
          </span>
        ))}
        {/* settle: fallout sifts down inside the zone */}
        <Flecks delayMs={delayMs + 1100} at={cell(0, 0, 3)} color={tint(p0, 0.75)} n={6} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.75)} delayMs={delayMs + 420} anchored={anchored} />
    </Stage>
  );
}

/* --- twin_queens -----------------------------------------------------------
   "Promote two pawns to queens instantly if both are on your 5th rank or
   beyond. Using it spends your next unused reroll." The 5th-rank threshold
   is the middle of the board, so the halfway line is drawn first; a thread
   ties the two named pawns (the cast square and the aimed one), a crown drops
   on each at once and each pawn stands up a queen. Then the price: a reroll
   die at the caster's edge splits in two. */
function Crown({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
      <path d="M1 7 L0.6 2 L3.4 4.4 L6 0.8 L8.6 4.4 L11.4 2 L11 7 Z" fill={fill} stroke={stroke} strokeWidth="0.6" {...SJ} />
    </svg>
  );
}
function Die({ fill, pip }: { fill: string; pip: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <rect x="0.8" y="0.8" width="8.4" height="8.4" fill={fill} stroke={pip} strokeWidth="0.6" />
      {[[3, 3], [7, 3], [5, 5], [3, 7], [7, 7]].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="0.8" fill={pip} />
      ))}
    </svg>
  );
}
/** The aimed pawn: the cast square plus the aim vector, in cells. */
const AIMED = {
  left: "calc(50% + (var(--fx-ox, 0) + var(--fx-aim-x, 0) * var(--fx-len, 0) - 0.5) * 12.5%)",
  top: "calc(50% + (var(--fx-oy, 0) + var(--fx-aim-y, 0) * var(--fx-len, 0) - 0.5) * 12.5%)",
  width: "12.5%",
  height: "12.5%",
} as const;
function TwinQueensScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance")
    return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} from="above" motif={<Crown fill={p0} stroke={p2} />} />;
  if (!lead) {
    // one of the two pawns stands up a queen under its own crown
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="grp-c-in absolute block" style={{ left: "22%", top: "24%", width: "56%", height: "56%", "--gd": "0.55s", "--s0": "1", animationDelay: dm(delayMs, 0) } as CSSProperties}>
          <Man kind="p" fill={tint(p1, 0.9)} stroke={p2} />
        </span>
        <span className="grp-c-stamp absolute block" style={{ left: "24%", top: "-6%", width: "52%", height: "34%", "--gd": "0.9s", animationDelay: dm(delayMs, 160) } as CSSProperties}>
          <Crown fill={p0} stroke={p2} />
        </span>
        <span className="grp-c-up absolute block" style={{ left: "16%", top: "16%", width: "68%", height: "68%", "--gd": "1s", animationDelay: dm(delayMs, 380) } as CSSProperties}>
          <Man kind="q" fill={p0} stroke={p2} />
        </span>
        <Flecks delayMs={delayMs + 700} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p1, 0.85)} dir={-1} n={3} />
      </span>
    );
  }
  const pair = [cell(0, 0), AIMED];
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 420}>
      <Frame anchored={anchored}>
        {/* tell: the 5th-rank threshold, which is the halfway line */}
        <span className="grp-c-draw absolute block" style={{ left: "0%", top: "49%", width: "100%", height: "2%", background: `linear-gradient(90deg, ${tint(p0, 0.3)}, ${p0}, ${tint(p0, 0.3)})`, "--gd": "1.6s", animationDelay: dm(delayMs, 0) } as CSSProperties} />
        {/* the thread that makes them twins: cast pawn to aimed pawn */}
        <span className="absolute block" style={{ ...cell(0, 0, 0), width: "calc(var(--fx-len, 0) * 12.5%)", height: "0.8%", rotate: "calc(var(--fx-ang, 0) * 1deg)", transformOrigin: "0% 50%" }}>
          <span className="grp-c-draw absolute inset-0 block" style={{ background: tint(p0, 0.9), "--gd": "1.2s", animationDelay: dm(delayMs, 140) } as CSSProperties} />
        </span>
        {pair.map((at, i) => (
          <span key={i} className="absolute block" style={at}>
            <span className="grp-tellglow absolute block rounded-full" style={{ left: "-20%", top: "-20%", width: "140%", height: "140%", background: tint(p1, 0.4), animationDelay: dm(delayMs, 60) }} />
            <span className="grp-c-in absolute block" style={{ left: "18%", top: "18%", width: "64%", height: "64%", "--gd": "0.7s", "--s0": "1", animationDelay: dm(delayMs, 120) } as CSSProperties}>
              <Man kind="p" fill={tint(p1, 0.9)} stroke={p2} />
            </span>
            {/* both crowns fall on the same beat: one card, two promotions */}
            <span className="grp-c-stamp absolute block" style={{ left: "-15%", top: "-62%", width: "130%", height: "86%", "--gd": "1.2s", animationDelay: dm(delayMs, 320) } as CSSProperties}>
              <Crown fill={p0} stroke={p2} />
            </span>
            <span className="grp-c-up absolute block" style={{ left: "-10%", top: "-14%", width: "120%", height: "120%", "--gd": "1.3s", animationDelay: dm(delayMs, 480) } as CSSProperties}>
              <Man kind="q" fill={p0} stroke={p2} />
            </span>
          </span>
        ))}
        {/* the price: the next reroll die, at the caster's edge, splits */}
        {[-1, 1].map((s) => (
          <span
            key={s}
            className="grp-c-part absolute block"
            style={{ left: "calc(87.5% - 4%)", top: `calc(${ROW.ownEdge} - 4%)`, width: "8%", height: "8%", clipPath: s < 0 ? "inset(0 50% 0 0)" : "inset(0 0 0 50%)", "--tx1": `${s * 40}%`, "--ty1": "30%", "--r1": `${s * 24}deg`, "--gd": "0.8s", animationDelay: dm(delayMs, 980) } as CSSProperties}
          >
            <Die fill={tint(p1, 0.95)} pip={p2} />
          </span>
        ))}
        <span className="grp-c-in absolute block" style={{ left: "calc(87.5% - 4%)", top: `calc(${ROW.ownEdge} - 4%)`, width: "8%", height: "8%", "--gd": "0.5s", animationDelay: dm(delayMs, 560) } as CSSProperties}>
          <Die fill={tint(p1, 0.95)} pip={p2} />
        </span>
        {/* settle: crown-gold motes climb off both queens */}
        {pair.map((at, i) => (
          <Flecks key={i} delayMs={delayMs + 1150 + i * 60} at={at} color={tint(p1, 0.85)} dir={-1} n={3} />
        ))}
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.75)} delayMs={delayMs + 500} anchored={anchored} />
    </Stage>
  );
}

/* --- threads_of_fate -------------------------------------------------------
   "For your opponent's next 3 captures, you weave an extra move into your
   reply." A spindle turns at the caster's edge and spins three threads up
   across the board, one per capture; shears close on the first thread at the
   halfway line, and the cut end is knotted into a double step that runs back
   down to the caster (the extra move). Three pips on the spindle count the
   captures it will repay. */
function Spindle({ wood, thread }: { wood: string; thread: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M5 0.4 V9.6" stroke={wood} strokeWidth="0.9" strokeLinecap="round" />
      <ellipse cx="5" cy="5" rx="3.4" ry="2.2" fill={thread} stroke={wood} strokeWidth="0.5" />
      <path d="M2 4.2 L8 5.8 M2 5.8 L8 4.2" stroke={wood} strokeWidth="0.35" />
      <circle cx="5" cy="8.6" r="1.1" fill={wood} />
    </svg>
  );
}
const THREAD_X = [37.5, 50, 62.5];
function ThreadsOfFateScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Spindle wood={p2} thread={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  // threads run from the caster's edge toward the opponent's, whichever side
  // of the screen that is
  const up = "calc(-90deg * var(--fx-side, 1))";
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 640}>
      <Frame anchored={anchored}>
        {/* tell: the spindle turns at the caster's edge */}
        <span className="grp-tellglow absolute block rounded-full" style={{ left: "40%", top: `calc(${ROW.ownEdge} - 10%)`, width: "20%", height: "20%", background: tint(p1, 0.4), animationDelay: dm(delayMs, 120) }} />
        <span className="grp-c-spin absolute block" style={{ left: "44%", top: `calc(${ROW.ownEdge} - 6%)`, width: "12%", height: "12%", "--gd": "1.6s", animationDelay: dm(delayMs, 0) } as CSSProperties}>
          <Spindle wood={p2} thread={p1} />
        </span>
        {/* three threads, one per capture it will repay */}
        {THREAD_X.map((x, i) => (
          <span key={x} className="absolute block" style={{ left: `${x}%`, top: ROW.ownEdge, width: "86%", height: "1.1%", rotate: up, transformOrigin: "0% 50%" }}>
            <span className="grp-c-draw absolute inset-0 block" style={{ background: `linear-gradient(90deg, ${tint(p1, 0.95)}, ${tint(p1, 0.35)})`, "--gd": "1.5s", animationDelay: dm(delayMs, 160 + i * 90) } as CSSProperties} />
          </span>
        ))}
        {/* the shears close on the first thread at the halfway line */}
        <span className="grp-c-stamp absolute block" style={{ left: "27%", top: "42%", width: "16%", height: "16%", "--gd": "0.6s", "--r0": "-30deg", animationDelay: dm(delayMs, 560) } as CSSProperties}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M1.4 1.4 L8 7 M1.4 8.6 L8 3" stroke={p0} strokeWidth="0.9" strokeLinecap="round" />
            <circle cx="8.2" cy="7.4" r="1.2" fill="none" stroke={p0} strokeWidth="0.6" />
            <circle cx="8.2" cy="2.6" r="1.2" fill="none" stroke={p0} strokeWidth="0.6" />
          </svg>
        </span>
        {/* the snipped end falls away */}
        <span className="grp-c-part absolute block" style={{ left: "37%", top: "36%", width: "1%", height: "14%", background: tint(p1, 0.9), "--tx1": "-200%", "--ty1": "40%", "--r1": "-40deg", animationDelay: dm(delayMs, 660) } as CSSProperties} />
        {/* the cut is knotted into a double step that runs back to the caster */}
        <span className="grp-c-go absolute block" style={{ left: "31.5%", top: "44%", width: "12%", height: "12%", "--ty1": "calc(var(--fx-side, 1) * 260%)", "--gd": "0.9s", animationDelay: dm(delayMs, 760) } as CSSProperties}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" style={{ transform: "scaleY(var(--fx-side, 1))" }} aria-hidden="true">
            <path d="M2 1.6 L5 4.4 L8 1.6 M2 5.6 L5 8.4 L8 5.6" fill="none" stroke={p1} strokeWidth="1.1" {...SJ} />
          </svg>
        </span>
        {/* three pips on the spindle: three captures repaid */}
        {[0, 1, 2].map((i) => (
          <span key={i} className="grp-c-pip absolute block rounded-full" style={{ left: `${57.5 + i * 3.6}%`, top: `calc(${ROW.ownEdge} - 1.2%)`, width: "2.4%", height: "2.4%", background: i === 0 ? p1 : tint(p1, 0.45), "--gd": "1s", animationDelay: dm(delayMs, 900 + i * 110) } as CSSProperties} />
        ))}
        {/* settle: loose fibres drift off the cut */}
        <Flecks delayMs={delayMs + 1150} at={{ left: "28%", top: "40%", width: "18%", height: "18%" }} color={tint(p1, 0.7)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 700} anchored={anchored} />
    </Stage>
  );
}

/* --- court_in_exile --------------------------------------------------------
   "On your opponent's next 2 turns they may move only their king, and their
   queen is the last to return from exile: she cannot move for 2 further
   turns." The opponent's back rank lights, the court steps down off it and
   walks out to both board edges, and the king is left alone under a ring with two pips (the two
   king-only turns). Last, the queen walks back in from the edge, slowly,
   with two pips of her own (her two further turns). */
const COURT: { kind: "r" | "n" | "b"; col: number }[] = [
  { kind: "r", col: 0 },
  { kind: "n", col: 1 },
  { kind: "b", col: 2 },
  { kind: "b", col: 5 },
  { kind: "n", col: 6 },
  { kind: "r", col: 7 },
];
function CourtInExileScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance")
    return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Man kind="k" fill={p1} stroke={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  // the opponent's king and queen files: e and d, which sit at screen columns
  // 4 and 3 when the caster is at the bottom, and 3 and 4 when at the top
  const kingX = "calc(50% + var(--fx-side, 1) * 6.25%)";
  const queenX = "calc(50% - var(--fx-side, 1) * 6.25%)";
  const back = ROW.enemyBack;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 380}>
      <Frame anchored={anchored}>
        {/* tell: the opponent's back rank is singled out */}
        <span className="grp-c-in absolute block" style={{ left: "0%", top: back, width: "100%", height: "12.5%", background: tint(p0, 0.34), "--gd": "1.8s", "--s0": "1", animationDelay: dm(delayMs, 0) } as CSSProperties} />
        {/* the court walks out to the nearer board edge */}
        {COURT.map((c, i) => (
          <span
            key={c.col}
            className="grp-c-go absolute block"
            style={{ left: `${c.col * 12.5}%`, top: back, width: "12.5%", height: "12.5%", "--tx1": `${c.col < 4 ? -(c.col + 1) * 110 : (8 - c.col) * 110}%`, "--ty1": "calc(var(--fx-side, 1) * 190%)", "--gd": "1.1s", animationDelay: dm(delayMs, 200 + (c.col < 4 ? 2 - c.col : c.col - 5) * 90 + i * 10) } as CSSProperties}
          >
            <Man kind={c.kind} fill={p1} stroke={p2} />
          </span>
        ))}
        {/* the queen leaves first... */}
        <span className="grp-c-go absolute block" style={{ left: `calc(${queenX} - 6.25%)`, top: back, width: "12.5%", height: "12.5%", "--tx1": "calc(var(--fx-side, 1) * -300%)", "--ty1": "calc(var(--fx-side, 1) * 190%)", "--gd": "0.9s", animationDelay: dm(delayMs, 160) } as CSSProperties}>
          <Man kind="q" fill={p1} stroke={p2} />
        </span>
        {/* the king alone keeps the rank: a ring and two turns */}
        <span className="grp-c-stamp absolute block rounded-full" style={{ left: `calc(${kingX} - 6.25%)`, top: back, width: "12.5%", height: "12.5%", border: `2px solid ${p1}`, "--gd": "1.4s", animationDelay: dm(delayMs, 360) } as CSSProperties} />
        <span className="grp-c-in absolute block" style={{ left: `calc(${kingX} - 4.5%)`, top: `calc(${back} + 1.2%)`, width: "9%", height: "10%", "--gd": "1.5s", "--s0": "1.2", animationDelay: dm(delayMs, 380) } as CSSProperties}>
          <Man kind="k" fill={p1} stroke={p2} />
        </span>
        {[0, 1].map((i) => (
          <span key={i} className="grp-c-pip absolute block rounded-full" style={{ left: `calc(${kingX} - 3.4% + ${i * 4}%)`, top: `calc(${back} + 13.5% * var(--fx-side, 1) + 5%)`, width: "2.6%", height: "2.6%", background: p1, "--gd": "1.2s", animationDelay: dm(delayMs, 640 + i * 110) } as CSSProperties} />
        ))}
        {/* ...and is the last to come home, two turns behind the court */}
        <span className="grp-c-go absolute block" style={{ left: `calc(${queenX} - 6.25%)`, top: back, width: "12.5%", height: "12.5%", "--tx0": "calc(var(--fx-side, 1) * -300%)", "--ty0": "calc(var(--fx-side, 1) * 190%)", "--gd": "1.1s", animationDelay: dm(delayMs, 860) } as CSSProperties}>
          <Man kind="q" fill={p1} stroke={p2} />
        </span>
        {[0, 1].map((i) => (
          <span key={i} className="grp-c-pip absolute block rounded-full" style={{ left: `calc(${queenX} - 3.4% + ${i * 4}%)`, top: `calc(${back} + 13.5% * var(--fx-side, 1) + 5%)`, width: "2.6%", height: "2.6%", background: p0, "--gd": "0.9s", animationDelay: dm(delayMs, 1000 + i * 110) } as CSSProperties} />
        ))}
        {/* settle: the dust of the court's road */}
        <Flecks delayMs={delayMs + 1150} at={{ left: "0%", top: back, width: "100%", height: "12.5%" }} color={tint(p1, 0.6)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 420} anchored={anchored} />
    </Stage>
  );
}

/* --- wild_hunt -------------------------------------------------------------
   "Pick any square, and the Hunt rides both diagonals through it, carrying
   off every enemy piece on them. Kings are never taken." A horn sounds on
   the picked square, both of its diagonals are struck across the whole
   board, and a rider of the twilight court gallops the length of each.
   Hoofprints are left along the diagonals as the Hunt passes; each piece it
   takes (target cut) is ridden over and lifted away along its own leg. */
function HuntRider({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <svg viewBox="0 0 16 10" className="block h-full w-full" aria-hidden="true">
      {/* horse at the gallop, rider with antlers, facing right */}
      <path d="M1 5.6 C2.4 4.4 5 4.2 8 4.4 L11.2 3.2 L12.8 3.8 L12 5.4 L10.6 5.8 C10 7 9 7.4 8 7.4 L9.6 9.4 L8.4 9.6 L6.8 7.6 L4.2 7.6 L2.4 9.6 L1.4 9.2 L3 7 C2 6.8 1.4 6.4 1 5.6 Z" fill={fill} stroke={stroke} strokeWidth="0.4" {...SJ} />
      <path d="M7 4.4 L7.6 2 L8.6 2.2 L8.4 4.2 Z" fill={fill} stroke={stroke} strokeWidth="0.35" />
      <path d="M8 2 L7 0.4 M8 2 L8.2 0.2 M8.2 1 L9.4 0.4 M7.4 1.2 L6.2 0.8" stroke={stroke} strokeWidth="0.4" strokeLinecap="round" />
    </svg>
  );
}
function WildHuntScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<HuntRider fill={p0} stroke={p1} />} />;
  if (!lead) {
    // a taken piece: a rider sweeps across its square along its own leg and
    // the square is left empty in the Hunt's wake
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="grp-flash absolute block rounded-full" style={{ left: "10%", top: "10%", width: "80%", height: "80%", background: tint(p1, 0.45), animationDelay: dm(delayMs, 0) }} />
        <span className="absolute block" style={{ left: "0%", top: "20%", width: "100%", height: "60%", rotate: "calc(var(--fx-ang, 0) * 1deg)" }}>
          <span className="grp-c-go absolute block" style={{ left: "10%", top: "0%", width: "80%", height: "100%", "--tx0": "-110%", "--tx1": "110%", "--gd": "0.6s", animationDelay: dm(delayMs, 80) } as CSSProperties}>
            <HuntRider fill={p0} stroke={p1} />
          </span>
        </span>
        <span className="grp-c-go absolute block" style={{ left: "30%", top: "30%", width: "40%", height: "40%", "--ty1": "-160%", "--gd": "0.7s", animationDelay: dm(delayMs, 220) } as CSSProperties}>
          {glyph}
        </span>
        <Flecks delayMs={delayMs + 420} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p1, 0.7)} dir={-1} n={3} />
      </span>
    );
  }
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 520}>
      <Frame anchored={anchored}>
        {/* tell: the horn sounds on the picked square */}
        <span className="grp-tellglow absolute block rounded-full" style={{ ...cell(0, 0, 1.8), background: tint(p1, 0.4), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-stamp absolute block" style={{ ...cell(0, 0, 0.9), "--gd": "0.9s", animationDelay: dm(delayMs, 80) } as CSSProperties}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M1.4 7.4 C3 7 6 5 7.6 1.4 L8.8 2 C8.2 5.6 5 8.4 1.8 8.8 Z" fill={p1} stroke={p2} strokeWidth="0.5" {...SJ} />
          </svg>
        </span>
        {/* both diagonals through it, struck edge to edge, a rider on each */}
        {[45, -45].map((a, i) => (
          <span key={a} className="absolute block" style={{ ...cell(0, 0, 0), width: "150%", height: "1%", marginLeft: "-75%", marginTop: "-0.5%", rotate: `${a}deg` }}>
            <span className="grp-c-draw absolute inset-0 block" style={{ background: `linear-gradient(90deg, transparent, ${tint(p1, 0.85)} 20%, ${tint(p1, 0.85)} 80%, transparent)`, "--gd": "1.5s", animationDelay: dm(delayMs, 200 + i * 60) } as CSSProperties} />
            <span className="grp-c-go absolute block" style={{ left: "44%", top: "-800%", width: "12%", height: "1600%", "--tx0": "-360%", "--tx1": "360%", "--gd": "0.95s", animationDelay: dm(delayMs, 380 + i * 90) } as CSSProperties}>
              <HuntRider fill={p0} stroke={p1} />
            </span>
            {/* hoofprints along the ride */}
            <span className="grp-c-in absolute block" style={{ left: "10%", top: "-150%", width: "80%", height: "400%", "--gd": "1s", "--s0": "1", animationDelay: dm(delayMs, 1080 + i * 60) } as CSSProperties}>
              <svg viewBox="0 0 80 4" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
                {Array.from({ length: 9 }, (_, k) => (
                  <path key={k} d={`M${6 + k * 8.5} 1 a1 1 0 1 1 0 2`} fill="none" stroke={tint(p1, 0.7)} strokeWidth="0.5" />
                ))}
              </svg>
            </span>
          </span>
        ))}
        {/* settle: dusk motes lifted in the Hunt's wake */}
        <Flecks delayMs={delayMs + 1150} at={cell(0, 0, 3)} color={tint(p1, 0.7)} dir={-1} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.75)} delayMs={delayMs + 560} anchored={anchored} />
    </Stage>
  );
}

/* --- ww_iron_bulwark -------------------------------------------------------
   "Choose one of your pieces, your king aside: while it stands in your half
   it cannot be captured, and enemy pieces standing next to it cannot capture
   at all." The caster's half is laid out (the bulwark only holds there), an
   iron tower shield slams onto the chosen square, and each of the eight
   squares round it is struck with a barred blade: nothing standing there can
   take. Rivets are hammered into the ring's corners. */
function TowerShield({ fill, rim }: { fill: string; rim: string }) {
  return (
    <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
      <path d="M1 1 H9 V7 C9 9.4 7 11 5 11.6 C3 11 1 9.4 1 7 Z" fill={fill} stroke={rim} strokeWidth="0.8" {...SJ} />
      <path d="M1.4 4.2 H8.6 M5 1 V11.4" stroke={rim} strokeWidth="0.6" />
      {[[2.4, 2.4], [7.6, 2.4], [2.4, 6], [7.6, 6]].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="0.5" fill={rim} />
      ))}
    </svg>
  );
}
function IronBulwarkScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} from="above" motif={<TowerShield fill={p0} rim={p2} />} />;
  const shield = (at: CSSProperties, off: number) => (
    <span className="grp-c-stamp absolute block" style={{ ...at, "--gd": "1.3s", animationDelay: dm(delayMs, off) } as CSSProperties}>
      <TowerShield fill={p0} rim={p2} />
    </span>
  );
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="grp-tellglow absolute block" style={{ left: "10%", top: "10%", width: "80%", height: "80%", background: tint(p0, 0.4), animationDelay: dm(delayMs, 0) }} />
        {shield({ left: "22%", top: "14%", width: "56%", height: "68%" }, 120)}
        <Flecks delayMs={delayMs + 520} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p1, 0.7)} n={3} />
      </span>
    );
  }
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 200}>
      <Frame anchored={anchored}>
        {/* tell: the caster's half, where the bulwark holds */}
        <span className="grp-c-in absolute block" style={{ left: "0%", top: "calc(25% + var(--fx-side, 1) * 25%)", width: "100%", height: "50%", background: tint(p0, 0.16), "--gd": "1.7s", "--s0": "1", animationDelay: dm(delayMs, 0) } as CSSProperties} />
        <span className="grp-tellshadow absolute block rounded-full" style={{ ...cell(0, 0.3, 1.2), background: tint(p2, 0.5), animationDelay: dm(delayMs, 40) }} />
        {/* strike: the tower shield slams onto the chosen piece */}
        {shield(cell(0, -0.05, 1.05), 180)}
        {/* the ring of eight: each neighbour's blade is barred */}
        <span className="grp-c-in absolute block" style={{ ...cell(0, 0, 3), border: `2px solid ${tint(p0, 0.8)}`, "--gd": "1.3s", "--s0": "1.3", animationDelay: dm(delayMs, 320) } as CSSProperties} />
        {RING8.map(([dx, dy], i) => (
          <span key={i} className="grp-c-stamp absolute block" style={{ ...cell(dx, dy, 0.62), "--gd": "1s", "--r0": "20deg", animationDelay: dm(delayMs, 380 + i * 40) } as CSSProperties}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M2 8 L7.6 2.4 M6.4 2 L8 3.6 M2.8 5.8 L4.2 7.2" stroke={tint(p1, 0.95)} strokeWidth="0.9" strokeLinecap="round" />
              <path d="M1.6 1.6 L8.4 8.4" stroke={p1} strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </span>
        ))}
        {/* rivets hammered into the ring's corners */}
        {[[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]].map(([dx, dy], i) => (
          <span key={i} className="grp-c-pip absolute block rounded-full" style={{ ...cell(dx, dy, 0.22), background: p2, border: `1px solid ${p0}`, "--gd": "0.9s", animationDelay: dm(delayMs, 760 + i * 70) } as CSSProperties} />
        ))}
        {/* settle: sparks from the rivets fall away */}
        <Flecks delayMs={delayMs + 1100} at={cell(0, 0, 3)} color={tint(p1, 0.7)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p0, 0.75)} delayMs={delayMs + 260} anchored={anchored} />
    </Stage>
  );
}

/* --- stone_prelates --------------------------------------------------------
   "For your opponent's next 6 turns, any of their bishops standing in their
   own half may only shuffle one square at a time. Bishops that cross into
   your half move freely." Pews are set across the opponent's half, two
   bishops there turn to stone and each one's long diagonal is drawn and then
   cut back to a single step; a third bishop walks out through the transept
   door on the halfway line and its diagonal runs full length again. Six
   pips on the line are the six turns. */
function Pew({ wood, edge }: { wood: string; edge: string }) {
  return (
    <svg viewBox="0 0 40 6" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
      <rect x="0.5" y="0.5" width="39" height="2.2" fill={wood} stroke={edge} strokeWidth="0.4" />
      <rect x="0.5" y="3.2" width="39" height="1.2" fill={wood} stroke={edge} strokeWidth="0.3" />
      {[2, 13, 27, 38].map((x) => (
        <rect key={x} x={x - 0.6} y="4.4" width="1.2" height="1.6" fill={edge} />
      ))}
    </svg>
  );
}
/** The two stone bishops: column (0..7) and ranks in from the enemy edge. */
const PRELATES = [
  { col: 2, rank: 1, ang: 45 },
  { col: 5, rank: 2, ang: 135 },
];
function StonePrelatesScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Man kind="b" fill={p0} stroke={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  /** Top of the rank `r` squares in from the opponent's edge. */
  const rankTop = (r: number) => `calc(43.75% - var(--fx-side, 1) * ${43.75 - r * 12.5}%)`;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 420}>
      <Frame anchored={anchored}>
        {/* tell: the opponent's half, the only place the curse holds */}
        <span className="grp-c-in absolute block" style={{ left: "0%", top: "calc(25% - var(--fx-side, 1) * 25%)", width: "100%", height: "50%", background: tint(p2, 0.22), "--gd": "1.8s", "--s0": "1", animationDelay: dm(delayMs, 0) } as CSSProperties} />
        <span className="grp-tellglow absolute block rounded-full" style={{ left: "35%", top: "calc(50% - var(--fx-side, 1) * 25% - 12%)", width: "30%", height: "24%", background: tint(p1, 0.3), animationDelay: dm(delayMs, 100) }} />
        {/* the pews are set, row by row */}
        {[0.6, 1.6, 2.6].map((r, i) => (
          <span key={r} className="grp-c-in absolute block" style={{ left: "6%", top: rankTop(r + 0.35), width: "88%", height: "3.6%", "--ty0": "calc(var(--fx-side, 1) * -60%)", "--s0": "1", "--gd": "1.6s", animationDelay: dm(delayMs, 220 + i * 70) } as CSSProperties}>
            <Pew wood={tint(p0, 0.85)} edge={p2} />
          </span>
        ))}
        {PRELATES.map((b, i) => (
          <span key={b.col} className="absolute block" style={{ left: `${b.col * 12.5}%`, top: rankTop(b.rank), width: "12.5%", height: "12.5%" }}>
            {/* the bishop turns to stone */}
            <span className="grp-c-stamp absolute block" style={{ left: "8%", top: "4%", width: "84%", height: "88%", "--gd": "1.4s", "--r0": "0deg", animationDelay: dm(delayMs, 420 + i * 60) } as CSSProperties}>
              <Man kind="b" fill={p0} stroke={p2} />
            </span>
            {/* its long diagonal is drawn, then cut back to one step */}
            <span className="absolute block" style={{ left: "50%", top: "50%", width: "560%", height: "8%", marginTop: "-4%", rotate: `calc(var(--fx-side, 1) * ${b.ang}deg)`, transformOrigin: "0% 50%" }}>
              <span className="grp-c-clip absolute inset-0 block" style={{ background: `linear-gradient(90deg, ${p1}, ${tint(p1, 0.4)})`, "--gk": "0.26", "--gd": "1.5s", animationDelay: dm(delayMs, 560 + i * 80) } as CSSProperties} />
            </span>
          </span>
        ))}
        {/* the transept door on the halfway line, and the one who walks out */}
        <span className="grp-c-up absolute block" style={{ left: "43.75%", top: "calc(50% - 7%)", width: "12.5%", height: "14%", "--gd": "1.4s", animationDelay: dm(delayMs, 700) } as CSSProperties}>
          <svg viewBox="0 0 10 11" className="block h-full w-full" aria-hidden="true">
            <path d="M1 11 V4.4 A4 4 0 0 1 9 4.4 V11" fill="none" stroke={p1} strokeWidth="1" />
            <path d="M3 11 V5 A2 2 0 0 1 7 5 V11" fill="none" stroke={tint(p1, 0.5)} strokeWidth="0.6" />
          </svg>
        </span>
        <span className="grp-c-go absolute block" style={{ left: "44.5%", top: "calc(50% - 5.5%)", width: "11%", height: "11%", "--ty0": "calc(var(--fx-side, 1) * -120%)", "--ty1": "calc(var(--fx-side, 1) * 150%)", "--gd": "1s", animationDelay: dm(delayMs, 820) } as CSSProperties}>
          <Man kind="b" fill={p1} stroke={p2} />
        </span>
        <span className="absolute block" style={{ left: "50%", top: "calc(50% + var(--fx-side, 1) * 12%)", width: "50%", height: "1%", rotate: "calc(var(--fx-side, 1) * 45deg)", transformOrigin: "0% 50%" }}>
          <span className="grp-c-draw absolute inset-0 block" style={{ background: `linear-gradient(90deg, ${p1}, transparent)`, "--gd": "0.9s", animationDelay: dm(delayMs, 1040) } as CSSProperties} />
        </span>
        {/* six turns */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="grp-c-pip absolute block rounded-full" style={{ left: `${6 + i * 3.4}%`, top: "calc(50% - 1.2%)", width: "2.4%", height: "2.4%", background: p0, border: `1px solid ${p2}`, "--gd": "1s", animationDelay: dm(delayMs, 900 + i * 60) } as CSSProperties} />
        ))}
        {/* settle: stone dust sifts off the pews */}
        <Flecks delayMs={delayMs + 1160} at={{ left: "10%", top: "calc(25% - var(--fx-side, 1) * 25%)", width: "80%", height: "40%" }} color={tint(p0, 0.7)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 480} anchored={anchored} />
    </Stage>
  );
}

/* --- total_whiteout --------------------------------------------------------
   "For their next 3 turns, your opponent's pieces can only capture at arm's
   length, exactly one square away." A blizzard front crosses the board;
   three of the opponent's long sightlines (a file, and both diagonals) are
   drawn out toward the caster and the snow buries each one past its first
   square, a drift piling up where it is cut and a bracket marking the one
   square that is left. Three snowflakes are the three turns. */
function Snowflake({ ice }: { ice: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M5 0.6 V9.4 M1.2 2.8 L8.8 7.2 M1.2 7.2 L8.8 2.8 M5 2 L4 1 M5 2 L6 1 M5 8 L4 9 M5 8 L6 9" stroke={ice} strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}
const SIGHTLINES = [
  { col: 1, ang: 90 },
  { col: 4, ang: 45 },
  { col: 6, ang: 135 },
];
function TotalWhiteoutScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} from="above" motif={<Snowflake ice={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  // sightlines start on the opponent's 2nd rank and point at the caster
  const startTop = "calc(50% - var(--fx-side, 1) * 31.25%)";
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 640}>
      <Frame anchored={anchored}>
        {/* tell: the blizzard front crosses the board */}
        <span className="grp-tellglow absolute block rounded-full" style={{ left: "30%", top: `calc(${startTop} - 12%)`, width: "40%", height: "24%", background: tint(p1, 0.35), animationDelay: dm(delayMs, 100) }} />
        {[14, 30, 46, 62, 78].map((y, i) => (
          <span key={y} className="grp-c-go absolute block" style={{ left: "0%", top: `${y}%`, width: "40%", height: "1.4%", background: `linear-gradient(90deg, transparent, ${tint(p1, 0.85)})`, "--tx0": "-100%", "--tx1": "260%", "--gd": "0.9s", animationDelay: dm(delayMs, 40 + i * 60) } as CSSProperties} />
        ))}
        {/* the opponent's pieces the lines start from */}
        {SIGHTLINES.map((l, i) => (
          <span key={l.col} className="grp-c-in absolute block rounded-full" style={{ left: `${l.col * 12.5 + 4.25}%`, top: `calc(${startTop} - 2%)`, width: "4%", height: "4%", background: p2, "--gd": "1.6s", animationDelay: dm(delayMs, 240 + i * 70) } as CSSProperties} />
        ))}
        {SIGHTLINES.map((l, i) => {
          const long = l.ang === 90 ? 62.5 : 70.7;
          const keep = (l.ang === 90 ? 12.5 : 17.7) / long;
          return (
            <span key={`s${l.col}`} className="absolute block" style={{ left: `${l.col * 12.5 + 6.25}%`, top: startTop, width: `${long}%`, height: "1.2%", marginTop: "-0.6%", rotate: `calc(var(--fx-side, 1) * ${l.ang}deg)`, transformOrigin: "0% 50%" }}>
              <span className="grp-c-clip absolute inset-0 block" style={{ background: `linear-gradient(90deg, ${p2}, ${tint(p2, 0.5)})`, "--gk": String(Math.round(keep * 100) / 100), "--gd": "1.6s", animationDelay: dm(delayMs, 300 + i * 80) } as CSSProperties} />
            </span>
          );
        })}
        {/* a drift buries each line just past its one square */}
        {SIGHTLINES.map((l, i) => {
          const ux = l.ang === 90 ? 0 : l.ang === 45 ? 1 : -1;
          return (
            <span
              key={`d${l.col}`}
              className="grp-c-up absolute block"
              style={{ left: `${l.col * 12.5 + 6.25 + ux * 19 - 8}%`, top: `calc(${startTop} + var(--fx-side, 1) * 19% - 6%)`, width: "16%", height: "11%", "--gd": "1.2s", animationDelay: dm(delayMs, 640 + i * 70) } as CSSProperties}
            >
              <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
                <path d="M0.4 7.6 C1.6 3.6 4 2 6 3 C8 1.4 10.8 3.4 11.6 7.6 Z" fill={p0} stroke={p2} strokeWidth="0.5" {...SJ} />
              </svg>
            </span>
          );
        })}
        {/* three snowflakes, three turns */}
        {[0, 1, 2].map((i) => (
          <span key={i} className="grp-c-pip absolute block" style={{ left: `${42 + i * 6}%`, top: "calc(50% - 3%)", width: "5%", height: "5%", "--gd": "1.1s", animationDelay: dm(delayMs, 900 + i * 110) } as CSSProperties}>
            <Snowflake ice={p2} />
          </span>
        ))}
        {/* settle: snow sifts down across the board */}
        <Flecks delayMs={delayMs + 1150} at={{ left: "10%", top: "10%", width: "80%", height: "60%" }} color={tint(p1, 0.9)} n={6} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p2, 0.7)} delayMs={delayMs + 700} anchored={anchored} />
    </Stage>
  );
}

/* --- buff_siphon -----------------------------------------------------------
   "Steal two active buffs from your opponent. Locked-in upgrades stay put."
   The opponent's cards are laid out at their edge, a siphon is run from
   them to the caster's edge and its pump wheel turns; two cards are drawn
   off and carried down the pipe to the caster, while the other two are
   padlocked where they lie (the locked-in upgrades). */
function CardBack({ face, edge }: { face: string; edge: string }) {
  return (
    <svg viewBox="0 0 10 14" className="block h-full w-full" aria-hidden="true">
      <rect x="0.6" y="0.6" width="8.8" height="12.8" fill={face} stroke={edge} strokeWidth="0.7" />
      <path d="M5 3.4 L7.2 7 L5 10.6 L2.8 7 Z" fill="none" stroke={edge} strokeWidth="0.6" />
    </svg>
  );
}
function Padlock({ body, shackle }: { body: string; shackle: string }) {
  return (
    <svg viewBox="0 0 10 11" className="block h-full w-full" aria-hidden="true">
      <path d="M2.6 5 V3.6 A2.4 2.4 0 0 1 7.4 3.6 V5" fill="none" stroke={shackle} strokeWidth="1.1" />
      <rect x="1.2" y="5" width="7.6" height="5.4" fill={body} stroke={shackle} strokeWidth="0.6" />
      <circle cx="5" cy="7.4" r="0.9" fill={shackle} />
    </svg>
  );
}
const SIPHON_CARDS = [
  { x: 20, take: true },
  { x: 36, take: false },
  { x: 52, take: true },
  { x: 68, take: false },
];
function BuffSiphonScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<CardBack face={p0} edge={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const row = "calc(50% - var(--fx-side, 1) * 36% - 7%)";
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 560}>
      <Frame anchored={anchored}>
        {/* tell: the opponent's cards are laid out at their edge */}
        {SIPHON_CARDS.map((c, i) => (
          <span key={c.x} className="grp-c-in absolute block" style={{ left: `${c.x}%`, top: row, width: "12%", height: "14%", "--ty0": "calc(var(--fx-side, 1) * -40%)", "--gd": c.take ? "0.7s" : "1.7s", animationDelay: dm(delayMs, 60 + i * 50) } as CSSProperties}>
            <CardBack face={tint(p0, 0.9)} edge={p1} />
          </span>
        ))}
        {/* the siphon runs from their cards to the caster's edge */}
        <span className="absolute block" style={{ left: "49%", top: "calc(50% - var(--fx-side, 1) * 26%)", width: "60%", height: "2%", rotate: "calc(var(--fx-side, 1) * 90deg)", transformOrigin: "0% 50%" }}>
          <span className="grp-c-draw absolute inset-0 block" style={{ background: `linear-gradient(90deg, ${tint(p0, 0.9)}, ${tint(p1, 0.8)})`, "--gd": "1.5s", animationDelay: dm(delayMs, 280) } as CSSProperties} />
        </span>
        <span className="grp-c-spin absolute block" style={{ left: "44%", top: "44%", width: "12%", height: "12%", "--gd": "1.3s", animationDelay: dm(delayMs, 340) } as CSSProperties}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <circle cx="5" cy="5" r="4" fill={p2} stroke={p1} strokeWidth="0.7" />
            <path d="M5 1 V9 M1 5 H9 M2.2 2.2 L7.8 7.8 M7.8 2.2 L2.2 7.8" stroke={p1} strokeWidth="0.5" />
          </svg>
        </span>
        {SIPHON_CARDS.map((c, i) =>
          c.take ? (
            // two are drawn off, into the pipe and down to the caster
            <span
              key={`t${c.x}`}
              className="grp-c-go absolute block"
              style={{ left: `${c.x}%`, top: row, width: "12%", height: "14%", "--tx1": `${((44 - c.x) / 12) * 100}%`, "--ty1": "calc(var(--fx-side, 1) * 520%)", "--gd": "1s", animationDelay: dm(delayMs, 520 + i * 60) } as CSSProperties}
            >
              <CardBack face={p1} edge={p0} />
            </span>
          ) : (
            // the locked-in ones stay put under a padlock
            <span key={`l${c.x}`} className="grp-c-stamp absolute block" style={{ left: `${c.x + 3}%`, top: `calc(${row} + 3%)`, width: "6%", height: "7%", "--gd": "1.2s", animationDelay: dm(delayMs, 580 + i * 40) } as CSSProperties}>
              <Padlock body={p1} shackle={p2} />
            </span>
          ),
        )}
        {/* the two arrive on the caster's side */}
        {[0, 1].map((i) => (
          <span key={i} className="grp-c-pip absolute block" style={{ left: `${36 + i * 16}%`, top: "calc(50% + var(--fx-side, 1) * 36% - 7%)", width: "12%", height: "14%", "--gd": "0.9s", animationDelay: dm(delayMs, 1000 + i * 90) } as CSSProperties}>
            <CardBack face={p1} edge={p0} />
          </span>
        ))}
        {/* settle: the last drops from the pipe */}
        <Flecks delayMs={delayMs + 1150} at={{ left: "40%", top: "35%", width: "20%", height: "30%" }} color={tint(p0, 0.8)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p0, 0.75)} delayMs={delayMs + 600} anchored={anchored} />
    </Stage>
  );
}

/* --- resurrect_queen -------------------------------------------------------
   "Bring your captured queen back to any empty square, and she cannot be
   captured for your opponent's next turn." A grave slab at the caster's
   corner cracks open, the queen's shade rises from it and glides across the
   board to the chosen square (the path is the real one, from the corner to
   the cast square), stands there whole, and one ward ring with ONE pip holds
   round her: the single turn she cannot be taken. */
function GraveSlab({ stone, crack }: { stone: string; crack: string }) {
  return (
    <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
      <path d="M1 12 V4 A4 4 0 0 1 9 4 V12 Z" fill={stone} stroke={crack} strokeWidth="0.6" />
      <path d="M5 2 V6 M3.6 3.4 H6.4" stroke={crack} strokeWidth="0.6" strokeLinecap="round" />
      <path d="M2.4 7 L4.4 8.6 L3.6 10.4 L5.6 12" fill="none" stroke={crack} strokeWidth="0.5" {...SJ} />
    </svg>
  );
}
function ResurrectQueenScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Man kind="q" fill={p1} stroke={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  // the grave sits on the caster's back rank, at the a-side corner
  const graveAt: CSSProperties = { left: "0%", top: "calc(50% + var(--fx-side, 1) * 43.75% - 6.25%)", width: "12.5%", height: "12.5%" };
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 900}>
      <Frame anchored={anchored}>
        {/* tell: the slab at the caster's corner cracks */}
        <span className="grp-tellshadow absolute block rounded-full" style={{ ...graveAt, background: tint(p2, 0.6), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-stamp absolute block" style={{ ...graveAt, "--gd": "1s", "--r0": "0deg", animationDelay: dm(delayMs, 80) } as CSSProperties}>
          <GraveSlab stone={tint(p0, 0.95)} crack={p1} />
        </span>
        {/* her shade rises from it... */}
        <span className="grp-c-up absolute block" style={{ ...graveAt, "--gd": "0.6s", animationDelay: dm(delayMs, 260) } as CSSProperties}>
          <Man kind="q" fill={tint(p1, 0.55)} stroke={p1} />
        </span>
        {/* ...and glides the real path to the chosen square */}
        <span
          className="grp-c-go absolute block"
          style={{ ...cell(0, 0), "--tx0": "calc((-3.5 - var(--fx-ox, 0)) * 100%)", "--ty0": "calc((var(--fx-side, 1) * 3.5 - var(--fx-oy, 0)) * 100%)", "--gd": "0.75s", animationDelay: dm(delayMs, 400) } as CSSProperties}
        >
          <Man kind="q" fill={tint(p1, 0.55)} stroke={p1} />
        </span>
        {/* strike: she stands whole on the square */}
        <span className="grp-flash absolute block rounded-full" style={{ ...cell(0, 0, 1.4), background: tint(p1, 0.55), animationDelay: dm(delayMs, 880) }} />
        <span className="grp-c-up absolute block" style={{ ...cell(0, -0.05, 1.05), "--gd": "1.1s", animationDelay: dm(delayMs, 900) } as CSSProperties}>
          <Man kind="q" fill={p1} stroke={p0} />
        </span>
        {/* one ward ring and ONE pip: the opponent's next turn only */}
        <span className="grp-c-stamp absolute block rounded-full" style={{ ...cell(0, 0, 1.3), border: `2px solid ${p1}`, "--gd": "1s", animationDelay: dm(delayMs, 1000) } as CSSProperties} />
        <span className="grp-c-pip absolute block rounded-full" style={{ ...cell(0, 0.78, 0.2), background: p1, border: `1px solid ${p0}`, "--gd": "0.9s", animationDelay: dm(delayMs, 1080) } as CSSProperties} />
        {/* settle: grave dust climbs off her */}
        <Flecks delayMs={delayMs + 1150} at={cell(0, 0, 1.6)} color={tint(p0, 0.8)} dir={-1} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 940} anchored={anchored} />
    </Stage>
  );
}

/* --- wc_sticky_floor -------------------------------------------------------
   "The whole floor is flypaper: every one of your opponent's pieces may move
   at most one square for their next 2 turns." Flypaper unrolls over the
   opponent's half, three of their pieces try long moves and are held: each
   one's arrow is cut back to a single square while the piece tugs and cannot
   leave, a one-square box marks the step it is allowed. Two pips, two turns. */
const STUCK = [
  { col: 1, rank: 1, ang: 90, kind: "r" as const, long: 62.5 },
  { col: 3, rank: 1, ang: 45, kind: "b" as const, long: 53 },
  { col: 6, rank: 0, ang: 115, kind: "n" as const, long: 28 },
];
function StickyFloorScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance")
    return (
      <EntranceCut
        palette={palette}
        glyph={glyph}
        delayMs={delayMs}
        motif={
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <rect x="1" y="1" width="8" height="8" fill={p0} stroke={p2} strokeWidth="0.6" />
            <path d="M1 4 L9 2.4 M1 7 L9 5.4" stroke={p1} strokeWidth="0.5" />
          </svg>
        }
      />
    );
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const rankTop = (r: number) => `calc(50% - var(--fx-side, 1) * ${43.75 - r * 12.5}% - 6.25%)`;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 560}>
      <Frame anchored={anchored}>
        {/* tell: the flypaper unrolls over the opponent's half */}
        <span className="grp-c-in absolute block" style={{ left: "0%", top: "calc(25% - var(--fx-side, 1) * 25%)", width: "100%", height: "50%", background: tint(p0, 0.3), "--ty0": "calc(var(--fx-side, 1) * -40%)", "--s0": "1", "--gd": "1.9s", animationDelay: dm(delayMs, 0) } as CSSProperties}>
          <svg viewBox="0 0 40 20" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            {[2, 7, 12, 17].map((y) => (
              <path key={y} d={`M0 ${y} C10 ${y - 1.4} 30 ${y + 1.4} 40 ${y}`} fill="none" stroke={tint(p1, 0.55)} strokeWidth="0.35" />
            ))}
          </svg>
        </span>
        <span className="grp-tellglow absolute block rounded-full" style={{ left: "30%", top: "calc(50% - var(--fx-side, 1) * 25% - 14%)", width: "40%", height: "28%", background: tint(p1, 0.3), animationDelay: dm(delayMs, 120) }} />
        {STUCK.map((m, i) => (
          <span key={m.col} className="absolute block" style={{ left: `${m.col * 12.5}%`, top: rankTop(m.rank), width: "12.5%", height: "12.5%" }}>
            {/* the long move it wanted, cut back to one square */}
            <span className="absolute block" style={{ left: "50%", top: "50%", width: `${(m.long / 12.5) * 100}%`, height: "9%", marginTop: "-4.5%", rotate: `calc(var(--fx-side, 1) * ${m.ang}deg)`, transformOrigin: "0% 50%" }}>
              <span className="grp-c-clip absolute inset-0 block" style={{ background: `linear-gradient(90deg, ${p2}, ${tint(p2, 0.4)})`, "--gk": String(Math.round((12.5 / m.long) * 100) / 100), "--gd": "1.5s", animationDelay: dm(delayMs, 320 + i * 90) } as CSSProperties} />
            </span>
            {/* the piece tugs and cannot leave the paper */}
            <span className="grp-c-stuck absolute block" style={{ left: "10%", top: "8%", width: "80%", height: "84%", "--tx1": `${Math.round(Math.cos((m.ang * Math.PI) / 180) * 30)}%`, "--ty1": `calc(var(--fx-side, 1) * ${Math.round(Math.sin((m.ang * Math.PI) / 180) * 30)}%)`, "--gd": "1.4s", animationDelay: dm(delayMs, 420 + i * 90) } as CSSProperties}>
              <Man kind={m.kind} fill={p1} stroke={p2} />
            </span>
            {/* glue strands hold its foot */}
            <span className="grp-c-in absolute block" style={{ left: "10%", top: "78%", width: "80%", height: "22%", "--s0": "0.4", "--gd": "1.1s", animationDelay: dm(delayMs, 560 + i * 90) } as CSSProperties}>
              <svg viewBox="0 0 10 3" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
                <path d="M1 0 C1.4 1.6 2 2.4 2.4 3 M5 0 C5 1.4 5.2 2.2 5 3 M9 0 C8.6 1.6 8 2.4 7.6 3" fill="none" stroke={p0} strokeWidth="0.5" />
              </svg>
            </span>
          </span>
        ))}
        {/* two turns */}
        {[0, 1].map((i) => (
          <span key={i} className="grp-c-pip absolute block rounded-full" style={{ left: `${46 + i * 5}%`, top: "calc(50% - 1.5%)", width: "3%", height: "3%", background: p1, border: `1px solid ${p2}`, "--gd": "1s", animationDelay: dm(delayMs, 900 + i * 110) } as CSSProperties} />
        ))}
        {/* settle: glue drips off the paper */}
        <Flecks delayMs={delayMs + 1150} at={{ left: "10%", top: "calc(25% - var(--fx-side, 1) * 25%)", width: "80%", height: "40%" }} color={tint(p0, 0.8)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 600} anchored={anchored} />
    </Stage>
  );
}

/* --- wa_greed --------------------------------------------------------------
   "Your next draft offer, you take both cards instead of choosing one." Two
   cards are dealt side by side with the choice bar standing between them;
   the bar snaps, a sack opens under both and both cards drop in. Two gold
   pips: two cards, not one. */
function Sack({ cloth, tie }: { cloth: string; tie: string }) {
  return (
    <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
      <path d="M4 3 L3 1 H9 L8 3 C11 4.6 11.8 8 11 10.4 C10.4 11.6 1.6 11.6 1 10.4 C0.2 8 1 4.6 4 3 Z" fill={cloth} stroke={tie} strokeWidth="0.6" {...SJ} />
      <path d="M3.6 3.2 H8.4" stroke={tie} strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}
function GreedScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Sack cloth={p0} tie={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const cards = [30, 54];
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 560}>
      <Frame anchored={anchored}>
        {/* tell: the offer is dealt, two cards side by side */}
        {cards.map((x, i) => (
          <span key={x} className="grp-c-in absolute block" style={{ left: `${x}%`, top: "22%", width: "16%", height: "22%", "--ty0": "-60%", "--r0": `${i ? 8 : -8}deg`, "--gd": "0.75s", animationDelay: dm(delayMs, 60 + i * 80) } as CSSProperties}>
            <CardBack face={p1} edge={p2} />
          </span>
        ))}
        {/* the choice bar between them, and it snaps */}
        <span className="grp-c-in absolute block" style={{ left: "48.6%", top: "20%", width: "2.8%", height: "26%", background: p2, "--gd": "0.5s", "--s0": "1", animationDelay: dm(delayMs, 200) } as CSSProperties} />
        {[-1, 1].map((s) => (
          <span key={s} className="grp-c-part absolute block" style={{ left: "48.6%", top: s < 0 ? "20%" : "33%", width: "2.8%", height: "13%", background: p2, "--tx1": `${s * 120}%`, "--ty1": `${s * -30 + 60}%`, "--r1": `${s * 35}deg`, "--gd": "0.6s", animationDelay: dm(delayMs, 440) } as CSSProperties} />
        ))}
        {/* strike: the sack opens under both and both drop in */}
        <span className="grp-c-up absolute block" style={{ left: "36%", top: "46%", width: "28%", height: "28%", "--gd": "1.3s", animationDelay: dm(delayMs, 480) } as CSSProperties}>
          <Sack cloth={p0} tie={p1} />
        </span>
        {cards.map((x, i) => (
          <span key={`d${x}`} className="grp-c-go absolute block" style={{ left: `${x}%`, top: "22%", width: "16%", height: "22%", "--tx1": `${((42 - x) / 16) * 100}%`, "--ty1": "130%", "--gd": "0.55s", animationDelay: dm(delayMs, 560 + i * 60) } as CSSProperties}>
            <CardBack face={p1} edge={p2} />
          </span>
        ))}
        {/* two pips: both cards are yours */}
        {[0, 1].map((i) => (
          <span key={i} className="grp-c-pip absolute block rounded-full" style={{ left: `${45 + i * 7}%`, top: "76%", width: "4%", height: "4%", background: p1, border: `1px solid ${p2}`, "--gd": "1s", animationDelay: dm(delayMs, 880 + i * 110) } as CSSProperties} />
        ))}
        {/* settle: gold motes spill from the sack's mouth, off the caster's side */}
        <span className="absolute block" style={{ left: "38%", top: "44%", width: "24%", height: "20%", rotate: "calc((var(--fx-side, 1) - 1) * 90deg)" }}>
          <Flecks delayMs={delayMs + 1150} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p1, 0.85)} dir={-1} n={5} />
        </span>
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 620} anchored={anchored} />
    </Stage>
  );
}

/* =============================================================================
   PER-CARD SCENES, round 2 (slice TC-great): the live tier 6 cards leave their
   templates. Passive cards have no cast square (the stage has nothing to point
   at), so their scenes place the rule on absolute board squares through `sq`,
   which is side-aware: rank 0 is the caster's back rank, rank 7 the
   opponent's, whichever way up the board is. Cards played on a square keep
   using `cell` round the cast square.
   ========================================================================== */

/** A box on board square (col, rank): col 0..7 from the left, rank 0 the
 * caster's back rank and 7 the opponent's, in <Frame> percentages. */
function sq(col: number, rank: number, size = 1): CSSProperties {
  return {
    left: `${(col + 0.5 - size / 2) * 12.5}%`,
    top: `calc(50% + var(--fx-side, 1) * ${(3.5 - rank) * 12.5}% - ${size * 6.25}%)`,
    width: `${size * 12.5}%`,
    height: `${size * 12.5}%`,
  };
}

/** `n` whole ranks centred on rank `c` (for bands like "the opponent's half"). */
function ranks(c: number, n: number): CSSProperties {
  return {
    left: "0%",
    top: `calc(50% + var(--fx-side, 1) * ${(3.5 - c) * 12.5}% - ${n * 6.25}%)`,
    width: "100%",
    height: `${n * 12.5}%`,
  };
}

/** A straight move leaving the centre of a one-square box: `ang` is in the
 * caster-at-the-bottom frame (0 right, 90 toward the caster) and mirrors with
 * --fx-side; `len` is in squares. `verb` is grp-c-draw (the move runs) or
 * grp-c-clip (drawn, then cut back to `keep` squares). */
function Ray({
  at,
  ang,
  len,
  keep = 1,
  verb,
  color,
  delay,
  thick = 7,
}: {
  at: CSSProperties;
  ang: number;
  len: number;
  keep?: number;
  verb: string;
  color: string;
  delay: string;
  thick?: number;
}) {
  return (
    <span className="absolute block" style={at}>
      <span
        className="absolute block"
        style={{ left: "50%", top: "50%", width: `${len * 100}%`, height: `${thick}%`, marginTop: `${-thick / 2}%`, rotate: `calc(var(--fx-side, 1) * ${ang}deg)`, transformOrigin: "0% 50%" }}
      >
        <span
          className={`${verb} absolute inset-0 block`}
          style={{ background: color, "--gk": String(Math.round((keep / len) * 100) / 100), "--gd": "1.5s", animationDelay: delay } as CSSProperties}
        />
      </span>
    </span>
  );
}

/** A row of tally pips (turns), centred on `x` percent. */
function Pips({ n, x, top, fill, rim, delayMs, size = 2.6 }: { n: number; x: number; top: string; fill: string; rim: string; delayMs: number; size?: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className="grp-c-pip absolute block rounded-full"
          style={{ left: `${x + (i - (n - 1) / 2) * size * 1.45 - size / 2}%`, top, width: `${size}%`, height: `${size}%`, background: fill, border: `1px solid ${rim}`, "--gd": "1s", animationDelay: dm(delayMs, i * 70) } as CSSProperties}
        />
      ))}
    </>
  );
}

/** The walnut shell the petrify cards close over a piece. */
function Walnut({ shell, seam }: { shell: string; seam: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M5 1 C8 1 9.2 3.6 9.2 5.6 C9.2 8 7.4 9.4 5 9.4 C2.6 9.4 0.8 8 0.8 5.6 C0.8 3.6 2 1 5 1 Z" fill={shell} stroke={seam} strokeWidth="0.6" />
      <path d="M5 1 C4.2 3 5.8 4.4 5 6 C4.4 7.4 5.4 8.4 5 9.4" fill="none" stroke={seam} strokeWidth="0.6" strokeLinecap="round" />
      <path d="M2.4 4 C3 4.6 3 5.6 2.2 6.4 M7.6 4 C7 4.6 7 5.6 7.8 6.4" fill="none" stroke={seam} strokeWidth="0.45" strokeLinecap="round" />
    </svg>
  );
}

/* --- ball_and_chain --------------------------------------------------------
   "For your opponent's next 5 turns, the piece they just moved must rest a
   turn before moving again." An iron cuff closes round the piece that just
   moved (its move is traced in first), the chain pays out behind it and the
   ball drops; it strains toward its next move and is held, an hourglass
   says it rests a turn, and five pips are the five turns the chain stays on
   whoever moved last (it hops to the next mover: a second cuff snaps on). */
function IronBall({ iron, shine }: { iron: string; shine: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <circle cx="5" cy="5.6" r="4" fill={iron} />
      <path d="M3 4 A2.4 2.4 0 0 1 5 2.8" fill="none" stroke={shine} strokeWidth="0.7" strokeLinecap="round" />
      <circle cx="5" cy="1.2" r="0.9" fill="none" stroke={iron} strokeWidth="0.6" />
    </svg>
  );
}
function Cuff({ iron, bolt }: { iron: string; bolt: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <ellipse cx="5" cy="8.2" rx="4" ry="1.4" fill="none" stroke={iron} strokeWidth="1.1" />
      <circle cx="9" cy="8.2" r="0.7" fill={bolt} />
    </svg>
  );
}
function Hourglass({ glass, sand }: { glass: string; sand: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M2.4 0.8 H7.6 M2.4 9.2 H7.6" stroke={glass} strokeWidth="0.9" strokeLinecap="round" />
      <path d="M3 1 C3 3.6 4.6 4.4 5 5 C5.4 5.6 7 6.4 7 9 H3 C3 6.4 4.6 5.6 5 5 C5.4 4.4 7 3.6 7 1 Z" fill="none" stroke={glass} strokeWidth="0.6" />
      <path d="M3.6 8.8 C4 7.4 6 7.4 6.4 8.8 Z M4.2 2 H5.8 L5 3.2 Z" fill={sand} />
    </svg>
  );
}
function BallAndChainScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<IronBall iron={p0} shine={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  // the opponent's last move: a knight from their back rank to (5, 5)
  const moved = sq(5, 5);
  const next = sq(2, 6);
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 460}>
      <Frame anchored={anchored}>
        {/* tell: the move they just made is traced in */}
        <Ray at={sq(6, 7)} ang={116.6} len={2.24} verb="grp-c-draw" color={tint(p1, 0.8)} delay={dm(delayMs, 0)} />
        <span className="grp-tellshadow absolute block rounded-full" style={{ ...moved, background: tint(p2, 0.55), animationDelay: dm(delayMs, 120) }} />
        <span className="grp-c-in absolute block" style={{ ...moved, "--gd": "1.9s", "--s0": "0.9", animationDelay: dm(delayMs, 160) } as CSSProperties}>
          <Man kind="n" fill={tint(p1, 0.9)} stroke={p2} />
        </span>
        {/* strike: the cuff closes and the ball drops behind it */}
        <span className="grp-c-stamp absolute block" style={{ ...moved, "--gd": "1.6s", "--r0": "0deg", animationDelay: dm(delayMs, 380) } as CSSProperties}>
          <Cuff iron={p0} bolt={p1} />
        </span>
        <Ray at={moved} ang={-90} len={0.95} verb="grp-c-draw" color={p0} thick={5} delay={dm(delayMs, 420)} />
        <span className="grp-c-stamp absolute block" style={{ ...sq(5, 6, 0.62), "--gd": "1.5s", "--r0": "0deg", animationDelay: dm(delayMs, 460) } as CSSProperties}>
          <IronBall iron={p0} shine={p1} />
        </span>
        {/* it strains toward its next move and is held: it rests a turn */}
        <Ray at={moved} ang={63.4} len={2.24} keep={0.3} verb="grp-c-clip" color={p1} delay={dm(delayMs, 600)} />
        <span className="grp-c-stuck absolute block" style={{ ...moved, "--tx1": "-14%", "--ty1": "calc(var(--fx-side, 1) * 24%)", "--gd": "1.2s", animationDelay: dm(delayMs, 640) } as CSSProperties}>
          <Man kind="n" fill={p1} stroke={p2} />
        </span>
        <span className="grp-c-pip absolute block" style={{ ...sq(5.62, 5.62, 0.36), "--gd": "1.2s", animationDelay: dm(delayMs, 760) } as CSSProperties}>
          <Hourglass glass={p1} sand={p0} />
        </span>
        {/* the chain hops to whoever moves next: a second cuff snaps on */}
        <span className="grp-c-stamp absolute block" style={{ ...next, "--gd": "1.1s", "--r0": "0deg", animationDelay: dm(delayMs, 980) } as CSSProperties}>
          <Cuff iron={tint(p0, 0.8)} bolt={p1} />
        </span>
        {/* five turns */}
        <Pips n={5} x={50} top="calc(50% - 1.3%)" fill={p1} rim={p2} delayMs={delayMs + 880} />
        {/* settle: rust flakes off the chain */}
        <Flecks delayMs={delayMs + 1150} at={sq(5, 5.5, 1.4)} color={tint(p0, 0.8)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 480} anchored={anchored} />
    </Stage>
  );
}

/* --- grounded_command ------------------------------------------------------
   "For your opponent's next 4 turns a queen or rook still in their own half
   cannot move onto any square in your half. One already standing in your
   half moves freely." The halfway line is staked down; a rook and the queen
   in the opponent's half each drive a long move toward the caster and are
   stopped dead at the line, an anchor landing where each is cut; a rook
   already over the line runs its whole rank untouched. Four stakes are the
   four turns. */
function Anchor({ iron, rim }: { iron: string; rim: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <circle cx="5" cy="1.8" r="1.1" fill="none" stroke={iron} strokeWidth="0.8" />
      <path d="M5 2.9 V9 M3 4.4 H7 M1.4 6.2 C1.8 8.4 3.4 9.2 5 9.2 C6.6 9.2 8.2 8.4 8.6 6.2" fill="none" stroke={iron} strokeWidth="0.9" strokeLinecap="round" />
      <path d="M1.4 6.2 L0.8 7.2 M8.6 6.2 L9.2 7.2" stroke={rim} strokeWidth="0.6" strokeLinecap="round" />
    </svg>
  );
}
const GROUNDED = [
  { col: 1, rank: 6, kind: "r" as const, ang: 90, len: 6 },
  { col: 4, rank: 7, kind: "q" as const, ang: 135, len: 6.2 },
];
function GroundedCommandScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Anchor iron={p1} rim={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 560}>
      <Frame anchored={anchored}>
        {/* tell: the halfway line is drawn and staked down */}
        <span className="grp-tellglow absolute block" style={{ left: "0%", top: "47%", width: "100%", height: "6%", background: tint(p1, 0.35), animationDelay: dm(delayMs, 0) }} />
        <span className="absolute block" style={{ left: "0%", top: "49.4%", width: "100%", height: "1.2%" }}>
          <span className="grp-c-draw absolute inset-0 block" style={{ background: p1, "--gd": "2s", animationDelay: dm(delayMs, 80) } as CSSProperties} />
        </span>
        {/* the heavy pieces in their own half drive at the caster's half and
            are cut at the line: the rook's file, the queen's diagonal */}
        {GROUNDED.map((g, i) => {
          const keep = ((g.rank - 3.5) * (g.ang === 90 ? 1 : Math.SQRT2));
          return (
            <span key={g.col}>
              <span className="grp-c-in absolute block" style={{ ...sq(g.col, g.rank), "--gd": "1.9s", "--s0": "0.9", animationDelay: dm(delayMs, 160 + i * 80) } as CSSProperties}>
                <Man kind={g.kind} fill={tint(p1, 0.95)} stroke={p2} />
              </span>
              <Ray at={sq(g.col, g.rank)} ang={g.ang} len={g.len} keep={keep} verb="grp-c-clip" color={p0} delay={dm(delayMs, 300 + i * 90)} />
              <span
                className="grp-c-stamp absolute block"
                style={{ ...sq(g.col + (g.ang === 90 ? 0 : -(g.rank - 3.5)), 3.5, 0.6), "--gd": "1.3s", "--r0": "0deg", animationDelay: dm(delayMs, 560 + i * 90) } as CSSProperties}
              >
                <Anchor iron={p1} rim={p2} />
              </span>
            </span>
          );
        })}
        {/* a rook already over the line moves freely along its rank */}
        <span className="grp-c-in absolute block" style={{ ...sq(6, 2), "--gd": "1.6s", "--s0": "0.9", animationDelay: dm(delayMs, 420) } as CSSProperties}>
          <Man kind="r" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        <Ray at={sq(6, 2)} ang={180} len={6} verb="grp-c-draw" color={tint(p1, 0.9)} delay={dm(delayMs, 760)} />
        {/* four stakes on the line: four turns */}
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="grp-c-up absolute block" style={{ left: `${14 + i * 24}%`, top: "calc(50% - 4%)", width: "2%", height: "6%", background: p2, border: `1px solid ${p1}`, "--gd": "1.1s", animationDelay: dm(delayMs, 900 + i * 80) } as CSSProperties} />
        ))}
        {/* settle: grit shaken off the line */}
        <Flecks delayMs={delayMs + 1150} at={{ left: "10%", top: "44%", width: "80%", height: "12%" }} color={tint(p1, 0.7)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 600} anchored={anchored} />
    </Stage>
  );
}

/* --- lunar_eclipse ---------------------------------------------------------
   "Your opponent's rooks and queen cannot move for 3 of their turns, though
   the first of them may slip away with one move before the shadow takes it."
   A pale moon stands over the opponent's back rank and the shadow slides
   across it; one rook slips a single square off the rank before the dark
   reaches it, then a crescent of shadow falls on that rook where it now
   stands, the queen and the other rook. Three phase pips are the three
   turns. */
function Moon({ lit, dark }: { lit: string; dark: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <circle cx="5" cy="5" r="4.4" fill={lit} stroke={dark} strokeWidth="0.4" />
      <circle cx="3.4" cy="3.8" r="0.8" fill={dark} opacity="0.35" />
      <circle cx="6.4" cy="6.2" r="1.1" fill={dark} opacity="0.3" />
    </svg>
  );
}
function Shade({ dark }: { dark: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M5 0.8 A4.2 4.2 0 1 1 5 9.2 A3 4.2 0 1 0 5 0.8 Z" fill={dark} />
    </svg>
  );
}
function LunarEclipseScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} from="above" motif={<Moon lit={p1} dark={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const covered: [number, number, "r" | "q"][] = [
    [0, 6, "r"],
    [3, 7, "q"],
    [7, 7, "r"],
  ];
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 620}>
      <Frame anchored={anchored}>
        {/* tell: the moon stands over their back rank */}
        <span className="grp-c-up absolute block" style={{ ...sq(3.5, 5.4, 2.2), "--gd": "1.9s", animationDelay: dm(delayMs, 0) } as CSSProperties}>
          <Moon lit={tint(p1, 0.95)} dark={p0} />
        </span>
        {/* one rook slips a square off the rank before the dark comes */}
        <span className="grp-c-go absolute block" style={{ ...sq(0, 6), "--ty0": "calc(var(--fx-side, 1) * -100%)", "--gd": "0.55s", animationDelay: dm(delayMs, 200) } as CSSProperties}>
          <Man kind="r" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        {/* the shadow slides across the moon */}
        <span className="grp-c-go absolute block rounded-full" style={{ ...sq(3.5, 5.4, 2.1), background: tint(p2, 0.9), "--tx0": "-120%", "--gd": "0.8s", animationDelay: dm(delayMs, 360) } as CSSProperties} />
        <span className="grp-c-in absolute block rounded-full" style={{ ...sq(3.5, 5.4, 2.1), background: tint(p2, 0.92), "--s0": "1", "--gd": "1.3s", animationDelay: dm(delayMs, 620) } as CSSProperties} />
        {/* strike: a crescent of shadow falls on each heavy piece and holds */}
        {covered.map(([c, r, kind], i) => (
          <span key={`${c}${r}`}>
            <span className="grp-c-in absolute block" style={{ ...sq(c, r), "--gd": "1.6s", "--s0": "1", animationDelay: dm(delayMs, 520 + i * 40) } as CSSProperties}>
              <Man kind={kind} fill={tint(p1, 0.95)} stroke={p2} />
            </span>
            <span className="grp-c-stamp absolute block" style={{ ...sq(c, r, 0.9), "--gd": "1.3s", "--r0": "-40deg", animationDelay: dm(delayMs, 660 + i * 90) } as CSSProperties}>
              <Shade dark={tint(p2, 0.85)} />
            </span>
          </span>
        ))}
        {/* three phases: three turns */}
        {[0, 1, 2].map((i) => (
          <span key={i} className="grp-c-pip absolute block" style={{ left: `${43 + i * 5}%`, top: "calc(50% - 2%)", width: "4%", height: "4%", "--gd": "1s", animationDelay: dm(delayMs, 960 + i * 100) } as CSSProperties}>
            <Shade dark={p1} />
          </span>
        ))}
        {/* settle: star motes rise off the dark */}
        <Flecks delayMs={delayMs + 1150} at={ranks(6.5, 2)} color={tint(p1, 0.85)} dir={-1} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.65)} delayMs={delayMs + 680} anchored={anchored} />
    </Stage>
  );
}

/* --- leaden_fields ---------------------------------------------------------
   "Every advanced enemy pawn first sinks one square back toward home (if
   that square is free), and then their pawns cannot move at all, not even to
   capture, for their next 2 turns." Three advanced enemy pawns turn to lead
   and sink one square back toward their home rank; a fourth has a piece
   behind it and stays where it is. Then a lead weight lands on each pawn
   and its step and both captures are cut to nothing. Two pips, two turns. */
function LeadWeight({ lead, rim }: { lead: string; rim: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M2.4 4 H7.6 L9 9 H1 Z" fill={lead} stroke={rim} strokeWidth="0.6" {...SJ} />
      <path d="M3.8 4 C3.8 2 6.2 2 6.2 4" fill="none" stroke={rim} strokeWidth="0.8" />
      <path d="M3.4 6.8 H6.6" stroke={rim} strokeWidth="0.5" />
    </svg>
  );
}
const LEADEN = [
  { col: 1, rank: 4, sinks: true },
  { col: 3, rank: 3, sinks: true },
  { col: 5, rank: 4, sinks: true },
  { col: 6, rank: 5, sinks: false },
];
function LeadenFieldsScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} from="above" motif={<LeadWeight lead={p0} rim={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 640}>
      <Frame anchored={anchored}>
        {/* tell: the lead pools under their advanced pawns */}
        {LEADEN.map((p, i) => (
          <span key={`t${p.col}`} className="grp-tellshadow absolute block rounded-full" style={{ ...sq(p.col, p.rank, 0.9), background: tint(p0, 0.55), animationDelay: dm(delayMs, i * 50) }} />
        ))}
        {/* the piece that blocks the fourth pawn's way home */}
        <span className="grp-c-in absolute block" style={{ ...sq(6, 6), "--gd": "1.9s", "--s0": "0.9", animationDelay: dm(delayMs, 60) } as CSSProperties}>
          <Man kind="b" fill={tint(p1, 0.9)} stroke={p2} />
        </span>
        {/* each pawn goes grey and sinks one square back toward home, unless
            the square behind it is taken */}
        {LEADEN.map((p, i) =>
          p.sinks ? (
            <span key={p.col} className="grp-c-go absolute block" style={{ ...sq(p.col, p.rank + 1), "--ty0": "calc(var(--fx-side, 1) * 100%)", "--gd": "0.7s", animationDelay: dm(delayMs, 200 + i * 70) } as CSSProperties}>
              <Man kind="p" fill={p0} stroke={p2} />
            </span>
          ) : (
            <span key={p.col} className="grp-c-stuck absolute block" style={{ ...sq(p.col, p.rank), "--tx1": "0%", "--ty1": "calc(var(--fx-side, 1) * -18%)", "--gd": "0.9s", animationDelay: dm(delayMs, 200 + i * 70) } as CSSProperties}>
              <Man kind="p" fill={p0} stroke={p2} />
            </span>
          ),
        )}
        {/* strike: the weight lands on each pawn where it now stands */}
        {LEADEN.map((p, i) => {
          const r = p.sinks ? p.rank + 1 : p.rank;
          return (
            <span key={`w${p.col}`}>
              <span className="grp-c-in absolute block" style={{ ...sq(p.col, r), "--gd": "1.4s", "--s0": "1", animationDelay: dm(delayMs, 600 + i * 40) } as CSSProperties}>
                <Man kind="p" fill={p0} stroke={p2} />
              </span>
              <span className="grp-c-stamp absolute block" style={{ ...sq(p.col, r + 0.28, 0.5), "--gd": "1.2s", "--r0": "0deg", animationDelay: dm(delayMs, 620 + i * 60) } as CSSProperties}>
                <LeadWeight lead={tint(p0, 0.95)} rim={p1} />
              </span>
              {/* its step and both captures, cut to nothing */}
              {[90, 45, 135].map((a, k) => (
                <Ray key={a} at={sq(p.col, r)} ang={a} len={a === 90 ? 1 : 1.41} keep={0.08} verb="grp-c-clip" color={p1} thick={6} delay={dm(delayMs, 700 + i * 60 + k * 20)} />
              ))}
            </span>
          );
        })}
        <Pips n={2} x={50} top="calc(50% - 1.4%)" fill={p1} rim={p2} delayMs={delayMs + 960} size={2.8} />
        {/* settle: lead dust sinks */}
        <Flecks delayMs={delayMs + 1150} at={ranks(4.5, 3)} color={tint(p0, 0.8)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.6)} delayMs={delayMs + 660} anchored={anchored} />
    </Stage>
  );
}

/* --- stone_bastions --------------------------------------------------------
   "Your opponent's rooks turn to walnuts for 2 of their turns, and each stone
   bastion seals its ground: for their next 2 turns your opponent cannot move
   any piece onto the files their petrified rooks stand on." Both enemy rooks
   close into walnut shells and a stone wall runs down each one's whole file;
   an enemy knight's jump onto a sealed file is cut short at the wall. Two
   pips, two turns. Target cut: a rook's square shelled and its file walled. */
const BASTION_COLS = [0, 7];
function StoneBastionsScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Walnut shell={p1} seam={p2} />} />;
  const wall = (at: CSSProperties, off: number) => (
    <span key={off} className="grp-c-up absolute block" style={{ ...at, "--gd": "1.5s", animationDelay: dm(delayMs, off) } as CSSProperties}>
      <svg viewBox="0 0 10 80" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
        <rect x="1.5" y="0" width="7" height="80" fill={tint(p0, 0.42)} stroke={p0} strokeWidth="0.6" />
        {Array.from({ length: 16 }, (_, k) => (
          <path key={k} d={`M1.5 ${k * 5} H8.5 M${k % 2 ? 5 : 3.2} ${k * 5} V${k * 5 + 5}`} stroke={tint(p2, 0.6)} strokeWidth="0.4" />
        ))}
      </svg>
    </span>
  );
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="grp-tellglow absolute block rounded-full" style={{ left: "14%", top: "14%", width: "72%", height: "72%", background: tint(p1, 0.4), animationDelay: dm(delayMs, 0) }} />
        {wall({ left: "34%", top: "0%", width: "32%", height: "100%" }, 80)}
        <span className="grp-c-stamp absolute block" style={{ left: "18%", top: "18%", width: "64%", height: "64%", "--gd": "1.2s", "--r0": "0deg", animationDelay: dm(delayMs, 200) } as CSSProperties}>
          <Walnut shell={p1} seam={p2} />
        </span>
        <Flecks delayMs={delayMs + 560} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p0, 0.8)} n={3} />
      </span>
    );
  }
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 420}>
      <Frame anchored={anchored}>
        {/* tell: their rooks on the back rank */}
        {BASTION_COLS.map((c, i) => (
          <span key={`r${c}`} className="grp-c-in absolute block" style={{ ...sq(c, 7), "--gd": "0.7s", "--s0": "0.9", animationDelay: dm(delayMs, i * 60) } as CSSProperties}>
            <Man kind="r" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
        ))}
        {BASTION_COLS.map((c, i) => (
          <span key={`g${c}`} className="grp-tellglow absolute block rounded-full" style={{ ...sq(c, 7, 1.4), background: tint(p1, 0.4), animationDelay: dm(delayMs, 60 + i * 60) }} />
        ))}
        {/* strike: each shuts into a walnut, and a wall runs down its file */}
        {BASTION_COLS.map((c, i) => (
          <span key={`w${c}`} className="grp-c-stamp absolute block" style={{ ...sq(c, 7, 0.9), "--gd": "1.5s", "--r0": "0deg", animationDelay: dm(delayMs, 380 + i * 80) } as CSSProperties}>
            <Walnut shell={p1} seam={p2} />
          </span>
        ))}
        {BASTION_COLS.map((c, i) => wall({ left: `${c * 12.5 + 3}%`, top: "0%", width: "6.5%", height: "100%" }, 480 + i * 90))}
        {/* an enemy knight's jump onto a sealed file is cut at the wall */}
        <span className="grp-c-in absolute block" style={{ ...sq(2, 4), "--gd": "1.5s", "--s0": "0.9", animationDelay: dm(delayMs, 640) } as CSSProperties}>
          <Man kind="n" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        <Ray at={sq(2, 4)} ang={153.4} len={2.24} keep={1.6} verb="grp-c-clip" color={p1} delay={dm(delayMs, 720)} />
        <span className="grp-c-stamp absolute block" style={{ ...sq(0.9, 3.55, 0.5), "--gd": "1.1s", "--r0": "30deg", animationDelay: dm(delayMs, 900) } as CSSProperties}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M2 2 L8 8 M8 2 L2 8" stroke={p2} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <Pips n={2} x={50} top="calc(50% - 1.4%)" fill={p1} rim={p2} delayMs={delayMs + 980} size={2.8} />
        {/* settle: stone grit falls from the walls */}
        <Flecks delayMs={delayMs + 1150} at={{ left: "0%", top: "20%", width: "100%", height: "50%" }} color={tint(p0, 0.8)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.65)} delayMs={delayMs + 460} anchored={anchored} />
    </Stage>
  );
}

/* --- eternal_statue --------------------------------------------------------
   "Turn one enemy piece you target into a walnut for 6 of their turns: it can
   only shuffle one square at a time. Kings cannot be targeted." A plinth
   rises under the targeted square, the piece sets into a laurelled statue,
   its four long lines are drawn and cut back to one square each, and the
   eight squares round it are the only ones left lit. Six marks are cut into
   the plinth: six turns. */
function Plinth({ stone, edge }: { stone: string; edge: string }) {
  return (
    <svg viewBox="0 0 12 5" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
      <path d="M1 0.5 H11 V1.4 H10 V3.6 H11 V4.6 H1 V3.6 H2 V1.4 H1 Z" fill={stone} stroke={edge} strokeWidth="0.35" />
    </svg>
  );
}
function Laurel({ leaf }: { leaf: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M2 7 C1 5 1.6 2.6 3.6 1.6 M8 7 C9 5 8.4 2.6 6.4 1.6" fill="none" stroke={leaf} strokeWidth="0.6" strokeLinecap="round" />
      {[[1.7, 5.4], [1.9, 3.6], [2.8, 2.2], [8.3, 5.4], [8.1, 3.6], [7.2, 2.2]].map(([x, y]) => (
        <ellipse key={`${x}${y}`} cx={x} cy={y} rx="0.9" ry="0.45" fill={leaf} transform={`rotate(${x < 5 ? -50 : 50} ${x} ${y})`} />
      ))}
    </svg>
  );
}
function EternalStatueScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Laurel leaf={p1} />} />;
  const statue = (at: CSSProperties, off: number) => (
    <>
      <span className="grp-c-up absolute block" style={{ ...at, "--gd": "1.5s", animationDelay: dm(delayMs, off) } as CSSProperties}>
        <Walnut shell={p0} seam={p2} />
      </span>
      <span className="grp-c-stamp absolute block" style={{ ...at, "--gd": "1.3s", "--r0": "0deg", animationDelay: dm(delayMs, off + 160) } as CSSProperties}>
        <Laurel leaf={p1} />
      </span>
    </>
  );
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="grp-tellshadow absolute block rounded-full" style={{ left: "12%", top: "60%", width: "76%", height: "30%", background: tint(p2, 0.5), animationDelay: dm(delayMs, 0) }} />
        {statue({ left: "16%", top: "10%", width: "68%", height: "68%" }, 120)}
        <Flecks delayMs={delayMs + 560} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p0, 0.8)} n={3} />
      </span>
    );
  }
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 380}>
      <Frame anchored={anchored}>
        {/* tell: the ground darkens and the plinth rises under the piece */}
        <span className="grp-tellshadow absolute block rounded-full" style={{ ...cell(0, 0.3, 1.3), background: tint(p2, 0.55), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-up absolute block" style={{ ...cell(0, 0.42, 1.15), height: "4.8%", "--gd": "1.9s", animationDelay: dm(delayMs, 100) } as CSSProperties}>
          <Plinth stone={p0} edge={p2} />
        </span>
        {/* strike: it sets into stone and wears the laurel */}
        {statue(cell(0, -0.08, 0.86), 260)}
        {/* its four long lines are drawn and cut back to a single square */}
        {[0, 90, 180, 270].map((a, i) => (
          <Ray key={a} at={cell(0, 0)} ang={a} len={3} keep={0.9} verb="grp-c-clip" color={p1} delay={dm(delayMs, 480 + i * 40)} />
        ))}
        {/* the eight squares it can still shuffle to */}
        {RING8.map(([dx, dy], i) => (
          <span key={i} className="grp-c-pip absolute block rounded-full" style={{ ...cell(dx, dy, 0.18), background: tint(p1, 0.9), border: `1px solid ${p2}`, "--gd": "1.1s", animationDelay: dm(delayMs, 700 + i * 30) } as CSSProperties} />
        ))}
        {/* six marks cut into the plinth: six turns */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={`m${i}`} className="grp-c-in absolute block" style={{ ...cell(-0.36 + i * 0.144, 0.44, 0.06), height: "2.2%", background: p2, "--gd": "1s", "--s0": "0.2", animationDelay: dm(delayMs, 880 + i * 60) } as CSSProperties} />
        ))}
        {/* settle: chisel chips fall */}
        <Flecks delayMs={delayMs + 1150} at={cell(0, 0, 1.6)} color={tint(p0, 0.85)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.65)} delayMs={delayMs + 420} anchored={anchored} />
    </Stage>
  );
}

/* --- the_big_chill ---------------------------------------------------------
   "Freeze all of your opponent's pieces except their king for one of their
   turns. As the ice lets go, two random survivors turn to walnuts, able to
   shuffle only one square at a time, for one more of their turns." Frost
   runs across the opponent's two home ranks and every piece there is cased
   in ice, all but the king, who stands clear; one pip (one turn). The ice
   cracks off, and on two of the thawed pieces a walnut shell closes instead,
   with one more pip. Target cut: an ice block on that square. */
function IceBlock({ ice, rim }: { ice: string; rim: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M1 2 L3 0.8 H8 L9.2 2.4 V8.4 L7.6 9.4 H2.2 L0.8 8 Z" fill={ice} stroke={rim} strokeWidth="0.5" {...SJ} />
      <path d="M2.6 2.4 L4.4 4 M6.8 6.6 L8 8" stroke={rim} strokeWidth="0.45" strokeLinecap="round" />
    </svg>
  );
}
const CHILL_ROW: [number, number, "r" | "n" | "b" | "q" | "k" | "p"][] = [
  [0, 7, "r"], [1, 7, "n"], [2, 7, "b"], [3, 7, "q"], [4, 7, "k"], [5, 7, "b"], [6, 7, "n"], [7, 7, "r"],
  [1, 6, "p"], [3, 6, "p"], [4, 6, "p"], [6, 6, "p"],
];
function TheBigChillScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<IceBlock ice={tint(p0, 0.7)} rim={p2} />} />;
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="grp-tellglow absolute block" style={{ left: "10%", top: "10%", width: "80%", height: "80%", background: tint(p1, 0.4), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-stamp absolute block" style={{ left: "10%", top: "8%", width: "80%", height: "84%", "--gd": "1.2s", "--r0": "0deg", animationDelay: dm(delayMs, 120) } as CSSProperties}>
          <IceBlock ice={tint(p0, 0.55)} rim={p2} />
        </span>
        <Flecks delayMs={delayMs + 520} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p1, 0.8)} n={3} />
      </span>
    );
  }
  const walnuts = [1, 6];
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 400}>
      <Frame anchored={anchored}>
        {/* tell: frost runs across their two home ranks */}
        <span className="grp-c-draw absolute block" style={{ ...ranks(6.5, 2), background: `linear-gradient(90deg, ${tint(p1, 0.35)}, ${tint(p0, 0.2)})`, "--gd": "1.2s", animationDelay: dm(delayMs, 0) } as CSSProperties} />
        {/* strike: every piece but the king is cased in ice, file by file */}
        {CHILL_ROW.filter(([, , k]) => k !== "k").map(([c, r], i) => (
          <span key={`${c}${r}`} className="grp-c-stamp absolute block" style={{ ...sq(c, r, 0.94), "--gd": "0.95s", "--r0": "0deg", animationDelay: dm(delayMs, 260 + c * 36 + (r === 6 ? 18 : 0)) } as CSSProperties}>
            <IceBlock ice={tint(p0, 0.5)} rim={p2} />
          </span>
        ))}
        {/* the king stands clear of it, shaking the frost off */}
        <span className="grp-c-in absolute block" style={{ ...sq(4, 7), "--gd": "1.4s", "--s0": "0.9", "--ty0": "calc(var(--fx-side, 1) * -24%)", animationDelay: dm(delayMs, 360) } as CSSProperties}>
          <Man kind="k" fill={p1} stroke={p2} />
        </span>
        <Pips n={1} x={50} top="calc(50% - 1.4%)" fill={p1} rim={p2} delayMs={delayMs + 620} size={2.8} />
        {/* the ice cracks off... */}
        {walnuts.map((c, i) => (
          <span key={`c${c}`}>
            {[-1, 1].map((s) => (
              <span key={s} className="grp-c-part absolute block" style={{ ...sq(c + s * 0.22, 7, 0.46), "--tx1": `${s * 70}%`, "--ty1": "90%", "--r1": `${s * 40}deg`, "--gd": "0.6s", animationDelay: dm(delayMs, 1000 + i * 70) } as CSSProperties}>
                <IceBlock ice={tint(p0, 0.5)} rim={p2} />
              </span>
            ))}
            {/* ...and on two of them a walnut shell closes for one more turn */}
            <span className="grp-c-stamp absolute block" style={{ ...sq(c, 7, 0.82), "--gd": "0.9s", "--r0": "0deg", animationDelay: dm(delayMs, 1060 + i * 70) } as CSSProperties}>
              <Walnut shell={tint(p2, 0.95)} seam={p1} />
            </span>
          </span>
        ))}
        <Pips n={1} x={54} top="calc(50% - 1.4%)" fill={p2} rim={p1} delayMs={delayMs + 1180} size={2.8} />
        {/* settle: meltwater drops sink off the thaw */}
        <Flecks delayMs={delayMs + 1200} at={ranks(6.5, 2)} color={tint(p1, 0.85)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 440} anchored={anchored} />
    </Stage>
  );
}

/* --- creeping_frost --------------------------------------------------------
   "Freeze three enemy pieces (not the king) for 2 of their owner's turns. The
   first piece you choose gets one escape move: its freeze sets in only after
   your opponent's next move." Frost creeps along the aim from the first
   chosen piece to the next ones; the two later picks are cased in ice at
   once, while the first takes one step clear and only then does the frost
   catch it on its new square. Two pips, two turns. Target cut: frost ferns
   crawl over the square and it ices over. */
function Fern({ ice }: { ice: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M1 9 C3 7 5 5 9 1" fill="none" stroke={ice} strokeWidth="0.7" strokeLinecap="round" />
      {[[2.6, 7.4], [4.2, 5.8], [5.8, 4.2], [7.4, 2.6]].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y} l-1.4 -0.4 M${x} ${y} l0.4 1.4`} stroke={ice} strokeWidth="0.55" strokeLinecap="round" />
      ))}
    </svg>
  );
}
function CreepingFrostScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Fern ice={p2} />} />;
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        {[0, 90, 180, 270].map((r, i) => (
          <span key={r} className="grp-c-in absolute block" style={{ left: "10%", top: "10%", width: "40%", height: "40%", rotate: `${r}deg`, transformOrigin: "100% 100%", "--gd": "1.1s", "--s0": "0.2", animationDelay: dm(delayMs, i * 60) } as CSSProperties}>
            <Fern ice={p2} />
          </span>
        ))}
        <span className="grp-c-stamp absolute block" style={{ left: "12%", top: "10%", width: "76%", height: "80%", "--gd": "1.1s", "--r0": "0deg", animationDelay: dm(delayMs, 320) } as CSSProperties}>
          <IceBlock ice={tint(p0, 0.5)} rim={p2} />
        </span>
        <Flecks delayMs={delayMs + 560} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p1, 0.8)} n={3} />
      </span>
    );
  }
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 440}>
      <Frame anchored={anchored}>
        {/* tell: frost ferns crawl out from the first chosen piece */}
        <span className="grp-tellglow absolute block rounded-full" style={{ ...cell(0, 0, 1.4), background: tint(p1, 0.4), animationDelay: dm(delayMs, 0) }} />
        {[0, 90, 180, 270].map((r, i) => (
          <span key={r} className="grp-c-in absolute block" style={{ ...cell(0, 0, 0.6), rotate: `${r}deg`, "--gd": "1.2s", "--s0": "0.3", animationDelay: dm(delayMs, 60 + i * 50) } as CSSProperties}>
            <Fern ice={p2} />
          </span>
        ))}
        {/* the frost runs out along the aim to the other picks */}
        <span className="absolute block" style={{ left: "calc(50% + var(--fx-ox, 0) * 12.5%)", top: "calc(50% + var(--fx-oy, 0) * 12.5% - 0.7%)", width: "calc(var(--fx-len, 2) * 12.5%)", height: "1.4%", rotate: "calc(var(--fx-ang, 0) * 1deg)", transformOrigin: "0% 50%" }}>
          <span className="grp-c-draw absolute inset-0 block" style={{ background: `linear-gradient(90deg, ${p2}, ${tint(p1, 0.6)})`, "--gd": "1.5s", animationDelay: dm(delayMs, 200) } as CSSProperties} />
        </span>
        {/* the aimed pick ices over at once */}
        <span className="grp-c-stamp absolute block" style={{ ...AIMED, "--gd": "1.3s", "--r0": "0deg", animationDelay: dm(delayMs, 440) } as CSSProperties}>
          <IceBlock ice={tint(p0, 0.5)} rim={p2} />
        </span>
        {/* the first pick slips one step clear before the frost takes it */}
        <span className="grp-c-go absolute block" style={{ ...cell(0, 0), "--tx1": "100%", "--gd": "0.6s", animationDelay: dm(delayMs, 360) } as CSSProperties}>
          <span className="grp-shiver absolute inset-0 block" style={{ animationDelay: dm(delayMs, 360) }}>
            <Man kind="n" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
        </span>
        <span className="grp-c-stamp absolute block" style={{ ...cell(1, 0, 0.94), "--gd": "1.1s", "--r0": "0deg", animationDelay: dm(delayMs, 860) } as CSSProperties}>
          <IceBlock ice={tint(p0, 0.5)} rim={p2} />
        </span>
        <Pips n={2} x={50} top="calc(50% - 1.4%)" fill={p1} rim={p2} delayMs={delayMs + 980} size={2.8} />
        {/* settle: rime sifts down */}
        <Flecks delayMs={delayMs + 1150} at={cell(0.5, 0, 2)} color={tint(p1, 0.85)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p2, 0.7)} delayMs={delayMs + 480} anchored={anchored} />
    </Stage>
  );
}

/* --- detonation_field ------------------------------------------------------
   "Your next three captures each remove at most one adjacent enemy piece:
   the most valuable non-king beside the captured square, kings aside. The
   blast never chains." A capture lands; the enemy pieces beside the taken
   square are weighed (a pawn, a knight, a rook and their king stand round
   it), and only the rook, the most valuable non-king, is blown off; the
   others stay put and nothing chains on. Three charges sit at the caster's
   side and the first one is spent. */
function Charge({ body, fuse }: { body: string; fuse: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <rect x="2" y="3" width="6" height="6.4" rx="1" fill={body} stroke={fuse} strokeWidth="0.5" />
      <path d="M2 5 H8 M2 7.4 H8" stroke={fuse} strokeWidth="0.4" />
      <path d="M5 3 C5 1.6 6.4 1.6 6.8 0.6" fill="none" stroke={fuse} strokeWidth="0.6" strokeLinecap="round" />
    </svg>
  );
}
const DET_NEIGHBOURS: { dx: number; dy: number; kind: "p" | "n" | "r" | "k"; blown?: boolean }[] = [
  { dx: -1, dy: 0, kind: "p" },
  { dx: 1, dy: -1, kind: "n" },
  { dx: 1, dy: 0, kind: "r", blown: true },
  { dx: -1, dy: -1, kind: "k" },
];
function DetonationFieldScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Charge body={p0} fuse={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  // the capture square, in the opponent's half
  const c = 3;
  const r = 5;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 620}>
      <Frame anchored={anchored}>
        {/* tell: the capture runs in from the caster's side */}
        <Ray at={sq(c - 2, r - 2)} ang={-45} len={2.83} verb="grp-c-draw" color={tint(p1, 0.9)} delay={dm(delayMs, 0)} />
        <span className="grp-tellglow absolute block rounded-full" style={{ ...sq(c, r, 1.3), background: tint(p1, 0.4), animationDelay: dm(delayMs, 120) }} />
        <span className="grp-flash absolute block rounded-full" style={{ ...sq(c, r, 1.1), background: tint(p1, 0.6), animationDelay: dm(delayMs, 320) }} />
        {/* the neighbours are weighed */}
        {DET_NEIGHBOURS.map((n, i) => (
          <span key={n.kind} className="grp-c-in absolute block" style={{ ...sq(c + n.dx, r - n.dy), "--gd": n.blown ? "0.6s" : "1.8s", "--s0": "0.9", animationDelay: dm(delayMs, 160 + i * 50) } as CSSProperties}>
            <Man kind={n.kind} fill={tint(p1, 0.95)} stroke={p2} />
          </span>
        ))}
        {DET_NEIGHBOURS.filter((n) => !n.blown).map((n, i) => (
          <span key={`s${n.kind}`} className="grp-c-stuck absolute block" style={{ ...sq(c + n.dx, r - n.dy, 0.4), "--tx1": "0%", "--ty1": "-20%", "--gd": "0.9s", animationDelay: dm(delayMs, 440 + i * 60) } as CSSProperties}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M1 7 H9 M5 7 V2 M2.4 2 H7.6" stroke={p1} strokeWidth="0.8" strokeLinecap="round" />
            </svg>
          </span>
        ))}
        {/* strike: only the most valuable non-king goes */}
        <span className="grp-c-blast absolute block" style={{ ...sq(c + 1, r), "--tx1": "130%", "--ty1": "calc(var(--fx-side, 1) * -40%)", "--gd": "0.8s", animationDelay: dm(delayMs, 620) } as CSSProperties}>
          <Man kind="r" fill={p0} stroke={p2} />
        </span>
        <span className="grp-c-stamp absolute block" style={{ ...sq(c + 1, r, 0.8), "--gd": "0.9s", "--r0": "20deg", animationDelay: dm(delayMs, 640) } as CSSProperties}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0.6 L6 3.6 L9.2 2.6 L7 5 L9.4 7.4 L6 6.6 L5 9.4 L4 6.6 L0.6 7.4 L3 5 L0.8 2.6 L4 3.6 Z" fill={tint(p1, 0.85)} stroke={p0} strokeWidth="0.5" {...SJ} />
          </svg>
        </span>
        {/* three charges, the first one spent */}
        {[0, 1, 2].map((i) => (
          <span key={i} className={`${i === 0 ? "grp-c-part" : "grp-c-pip"} absolute block`} style={{ ...sq(2.6 + i * 0.9, 0.5, 0.55), "--tx1": "0%", "--ty1": "-60%", "--r1": "25deg", "--gd": i === 0 ? "0.7s" : "1.2s", animationDelay: dm(delayMs, i === 0 ? 700 : 820 + i * 80) } as CSSProperties}>
            <Charge body={p0} fuse={p1} />
          </span>
        ))}
        {/* settle: ash sinks where the rook stood */}
        <Flecks delayMs={delayMs + 1150} at={sq(c + 1, r, 1.4)} color={tint(p0, 0.8)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 660} anchored={anchored} />
    </Stage>
  );
}

/* --- giants_maul -----------------------------------------------------------
   "The maul comes down once: crush one enemy knight, bishop, or rook, and the
   shock leaves every enemy piece beside it (kings aside) frozen for 1 of
   their turns." A giant's maul swings down on the chosen piece and flattens
   it; cracks run out into the eight squares round it and the enemy pieces
   standing there are rimed over, the king beside it untouched. One pip. */
function Maul({ head, haft }: { head: string; haft: string }) {
  return (
    <svg viewBox="0 0 10 30" className="block h-full w-full" aria-hidden="true">
      <rect x="4.3" y="6" width="1.4" height="23" rx="0.6" fill={haft} />
      <rect x="0.6" y="0.6" width="8.8" height="6.4" rx="1" fill={head} stroke={haft} strokeWidth="0.6" />
      <path d="M0.6 2.6 H9.4 M0.6 5 H9.4" stroke={haft} strokeWidth="0.45" />
    </svg>
  );
}
const MAUL_NEAR: { dx: number; dy: number; kind: "p" | "b" | "k" }[] = [
  { dx: -1, dy: 0, kind: "p" },
  { dx: 1, dy: 1, kind: "b" },
  { dx: 1, dy: -1, kind: "k" },
];
function GiantsMaulScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} from="above" motif={<Maul head={p0} haft={p2} />} />;
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="grp-tellglow absolute block" style={{ left: "10%", top: "10%", width: "80%", height: "80%", background: tint(p1, 0.35), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-stamp absolute block" style={{ left: "12%", top: "10%", width: "76%", height: "80%", "--gd": "1.1s", "--r0": "0deg", animationDelay: dm(delayMs, 160) } as CSSProperties}>
          <IceBlock ice={tint(p0, 0.45)} rim={p1} />
        </span>
        <Flecks delayMs={delayMs + 520} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p1, 0.8)} n={3} />
      </span>
    );
  }
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 440}>
      <Frame anchored={anchored}>
        {/* tell: the shadow of the maul head falls on the piece */}
        <span className="grp-tellshadow absolute block rounded-full" style={{ ...cell(0, 0.2, 1.3), background: tint(p2, 0.55), animationDelay: dm(delayMs, 0) }} />
        {/* the maul swings down from the caster's side, pivoting at the grip */}
        <span className="absolute block" style={{ left: "calc(50% + (var(--fx-ox, 0) + 1.45) * 12.5%)", top: "calc(50% + (var(--fx-oy, 0) - 2) * 12.5%)", width: "10%", height: "25%", transformOrigin: "50% 100%", rotate: "-78deg" }}>
          <span className="absolute inset-0 block" style={{ scale: "-1 1", transformOrigin: "50% 100%" }}>
            <span className="grp-swing absolute inset-0 block" style={{ transformOrigin: "50% 100%", animationDelay: dm(delayMs, 60) }}>
              <Maul head={p0} haft={p2} />
            </span>
          </span>
        </span>
        {/* strike: the piece is flattened */}
        <span className="grp-bonk absolute block" style={{ ...cell(0, 0, 0.9), animationDelay: dm(delayMs, 400) }}>
          <Man kind="n" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        <span className="grp-c-blast absolute block" style={{ ...cell(0, 0.3, 1.2), height: "4%", background: tint(p2, 0.6), "--gd": "0.7s", animationDelay: dm(delayMs, 460) } as CSSProperties} />
        {/* cracks run out into all eight neighbours */}
        {RING8.map(([dx, dy], i) => (
          <span key={i} className="absolute block" style={{ ...cell(0, 0), rotate: `${Math.round((Math.atan2(dy, dx) * 180) / Math.PI)}deg` }}>
            <span className="grp-c-draw absolute block" style={{ left: "50%", top: "48%", width: dx && dy ? "141%" : "100%", height: "4%", background: tint(p2, 0.85), "--gd": "1.2s", animationDelay: dm(delayMs, 470 + i * 20) } as CSSProperties} />
          </span>
        ))}
        {/* the enemy pieces beside it are rimed over; the king is not */}
        {MAUL_NEAR.map((n, i) => (
          <span key={n.kind}>
            <span className="grp-c-in absolute block" style={{ ...cell(n.dx, n.dy, 0.9), "--gd": "1.5s", "--s0": "0.9", animationDelay: dm(delayMs, 300 + i * 40) } as CSSProperties}>
              <Man kind={n.kind} fill={tint(p1, 0.95)} stroke={p2} />
            </span>
            {n.kind !== "k" && (
              <span className="grp-c-stamp absolute block" style={{ ...cell(n.dx, n.dy, 0.94), "--gd": "1.1s", "--r0": "0deg", animationDelay: dm(delayMs, 640 + i * 70) } as CSSProperties}>
                <IceBlock ice={tint("#bfe6ff", 0.45)} rim={p1} />
              </span>
            )}
          </span>
        ))}
        <span className="grp-c-pip absolute block rounded-full" style={{ ...cell(0, 0.75, 0.22), background: p1, border: `1px solid ${p2}`, "--gd": "1s", animationDelay: dm(delayMs, 900) } as CSSProperties} />
        {/* settle: splinters and grit sink */}
        <Flecks delayMs={delayMs + 1100} at={cell(0, 0, 2)} color={tint(p0, 0.8)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 460} anchored={anchored} />
    </Stage>
  );
}

/* --- collapse --------------------------------------------------------------
   "Pull every enemy piece except the king one square toward their back rank
   across the whole board, once." The board tips toward the opponent's edge:
   pull-lines run across it, and every enemy piece slides one square back
   toward its home rank at once; the king alone does not move, and a pawn
   whose square behind is taken stays where it is. */
const COLLAPSE: { col: number; rank: number; kind: "p" | "n" | "b" | "r" | "q" | "k"; held?: boolean }[] = [
  { col: 0, rank: 5, kind: "p" },
  { col: 2, rank: 4, kind: "n" },
  { col: 3, rank: 5, kind: "q" },
  { col: 4, rank: 6, kind: "k" },
  { col: 5, rank: 3, kind: "b" },
  { col: 6, rank: 5, kind: "p", held: true },
  { col: 7, rank: 4, kind: "r" },
];
function CollapseScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance")
    return (
      <EntranceCut
        palette={palette}
        glyph={glyph}
        delayMs={delayMs}
        motif={
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M2 7 L5 3 L8 7 M2 9.4 L5 5.4 L8 9.4" fill="none" stroke={p1} strokeWidth="1" {...SJ} />
          </svg>
        }
      />
    );
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 520}>
      <Frame anchored={anchored}>
        {/* tell: pull-lines run toward their back rank, file by file */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((c) => (
          <span key={c} className="grp-c-go absolute block" style={{ ...sq(c, 3, 0.6), height: "3%", marginTop: "3%", "--ty0": "0%", "--ty1": "calc(var(--fx-side, 1) * -1400%)", "--gd": "0.9s", animationDelay: dm(delayMs, (c % 3) * 60) } as CSSProperties}>
            <svg viewBox="0 0 10 4" className="block h-full w-full" aria-hidden="true">
              <path d="M1 3.4 L5 0.6 L9 3.4" fill="none" stroke={tint(p1, 0.8)} strokeWidth="1" {...SJ} />
            </svg>
          </span>
        ))}
        {/* strike: every enemy piece but the king slides one square home */}
        {COLLAPSE.map((m, i) =>
          m.kind === "k" || m.held ? (
            <span key={m.col} className="grp-c-stuck absolute block" style={{ ...sq(m.col, m.rank), "--tx1": "0%", "--ty1": "calc(var(--fx-side, 1) * -16%)", "--gd": "1.5s", animationDelay: dm(delayMs, 380 + i * 30) } as CSSProperties}>
              <Man kind={m.kind} fill={m.kind === "k" ? p1 : tint(p1, 0.9)} stroke={p2} />
            </span>
          ) : (
            <span key={m.col} className="grp-c-go absolute block" style={{ ...sq(m.col, m.rank + 1), "--ty0": "calc(var(--fx-side, 1) * 100%)", "--gd": "0.75s", animationDelay: dm(delayMs, 380 + i * 30) } as CSSProperties}>
              <Man kind={m.kind} fill={tint(p1, 0.95)} stroke={p2} />
            </span>
          ),
        )}
        {/* ...and holds on its new square */}
        {COLLAPSE.filter((m) => m.kind !== "k" && !m.held).map((m, i) => (
          <span key={`h${m.col}`} className="grp-c-in absolute block" style={{ ...sq(m.col, m.rank + 1), "--gd": "1.1s", "--s0": "1", animationDelay: dm(delayMs, 920 + i * 20) } as CSSProperties}>
            <Man kind={m.kind} fill={tint(p1, 0.95)} stroke={p2} />
          </span>
        ))}
        {/* the piece that blocks the held pawn */}
        <span className="grp-c-in absolute block" style={{ ...sq(6, 6), "--gd": "2s", "--s0": "0.9", animationDelay: dm(delayMs, 200) } as CSSProperties}>
          <Man kind="n" fill={tint(p1, 0.9)} stroke={p2} />
        </span>
        {/* the rank the pieces came from, dimmed out behind them */}
        <span className="grp-tellshadow absolute block" style={{ ...ranks(4.5, 3), background: tint(p0, 0.28), animationDelay: dm(delayMs, 420) }} />
        {/* settle: dust drifts off toward their edge */}
        <Flecks delayMs={delayMs + 1150} at={ranks(5.5, 2)} color={tint(p1, 0.7)} dir={-1} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.65)} delayMs={delayMs + 560} anchored={anchored} />
    </Stage>
  );
}

/* --- void ------------------------------------------------------------------
   "The void takes one enemy pawn, knight, or bishop, and the square it stood
   on stays a void that swallows any enemy piece except a king that enters
   it, for the game; the defender gets one bridge, so the first enemy piece
   to enter crosses it safely." The chosen piece sinks into a hole that opens
   under it and the hole stays; a plank bridge is laid over it, the first
   enemy piece walks across and the bridge falls away behind it; the next
   one that steps in is swallowed. */
function VoidScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  const hole = (at: CSSProperties, off: number, gd: string) => (
    <span className="grp-c-in absolute block rounded-full" style={{ ...at, background: `radial-gradient(circle, ${p2} 45%, ${tint(p0, 0.9)} 70%, ${tint(p0, 0)} 72%)`, "--s0": "0.1", "--gd": gd, animationDelay: dm(delayMs, off) } as CSSProperties} />
  );
  if (role === "entrance")
    return (
      <EntranceCut
        palette={palette}
        glyph={glyph}
        delayMs={delayMs}
        motif={
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <circle cx="5" cy="5" r="4.2" fill={p2} stroke={p1} strokeWidth="0.6" />
            <path d="M2.4 5 A2.6 2.6 0 0 1 7.6 5" fill="none" stroke={p0} strokeWidth="0.6" />
          </svg>
        }
      />
    );
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 360}>
      <Frame anchored={anchored}>
        {/* tell: the square darkens under the piece */}
        <span className="grp-tellshadow absolute block rounded-full" style={{ ...cell(0, 0, 1.1), background: tint(p2, 0.6), animationDelay: dm(delayMs, 0) }} />
        {/* strike: the hole opens and the piece goes down */}
        {hole(cell(0, 0, 0.92), 180, "2.1s")}
        <span className="grp-sink absolute block" style={{ ...cell(0, -0.04, 0.8), animationDelay: dm(delayMs, 260) }}>
          <Man kind="b" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        {/* the one bridge is laid over it */}
        <span className="grp-c-draw absolute block" style={{ ...cell(0, 0, 1.2), height: "3.6%", marginTop: "5.7%", background: `repeating-linear-gradient(90deg, ${p1} 0 18%, ${p2} 18% 22%)`, "--gd": "0.8s", animationDelay: dm(delayMs, 600) } as CSSProperties} />
        {/* the first enemy piece crosses it safely... */}
        <span className="grp-c-go absolute block" style={{ ...cell(0, 0, 0.8), "--tx0": "-150%", "--tx1": "150%", "--gd": "0.7s", animationDelay: dm(delayMs, 700) } as CSSProperties}>
          <Man kind="n" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        {/* ...and the bridge falls into the void behind it */}
        {[-1, 1].map((s) => (
          <span key={s} className="grp-c-part absolute block" style={{ ...cell(s * 0.3, 0, 0.6), height: "3.6%", marginTop: "1.95%", background: p1, "--tx1": `${s * 20}%`, "--ty1": "300%", "--r1": `${s * 50}deg`, "--gd": "0.6s", animationDelay: dm(delayMs, 1080) } as CSSProperties} />
        ))}
        {/* the next one that steps in is swallowed */}
        <span className="grp-c-go absolute block" style={{ ...cell(0, 0, 0.8), "--ty0": "calc(var(--fx-side, 1) * -130%)", "--gd": "0.4s", animationDelay: dm(delayMs, 1120) } as CSSProperties}>
          <Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        <span className="grp-sink absolute block" style={{ ...cell(0, -0.04, 0.8), animationDelay: dm(delayMs, 1280) }}>
          <Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        {hole(cell(0, 0, 0.92), 1100, "1.1s")}
        {/* settle: motes are drawn down into it */}
        <Flecks delayMs={delayMs + 1300} at={cell(0, 0, 1.3)} color={tint(p0, 0.8)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p0, 0.75)} delayMs={delayMs + 400} anchored={anchored} />
    </Stage>
  );
}

/* --- sealed_avenues --------------------------------------------------------
   "Your opponent cannot enter any square on the d or e files for their next
   3 turns." Portcullises drop down the whole length of the d and e files, a
   seal is pressed onto each file at the opponent's end, and an enemy
   bishop's diagonal and rook's rank that would cross them are stopped at the
   bars. Three pips, three turns. */
function Portcullis({ iron }: { iron: string }) {
  return (
    <svg viewBox="0 0 10 80" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
      {[1.5, 5, 8.5].map((x) => (
        <path key={x} d={`M${x} 0 V80`} stroke={iron} strokeWidth="0.9" />
      ))}
      {Array.from({ length: 11 }, (_, k) => (
        <path key={k} d={`M0.6 ${4 + k * 7.4} H9.4`} stroke={iron} strokeWidth="0.7" />
      ))}
    </svg>
  );
}
function SealedAvenuesScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} from="above" motif={<Portcullis iron={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 440}>
      <Frame anchored={anchored}>
        {/* tell: the two middle files are marked out */}
        <span className="grp-tellglow absolute block" style={{ left: "37.5%", top: "0%", width: "25%", height: "100%", background: tint(p1, 0.28), animationDelay: dm(delayMs, 0) }} />
        {/* strike: a portcullis drops down each file, from the opponent's end */}
        {[3, 4].map((c, i) => (
          <span key={c} className="grp-c-in absolute block" style={{ left: `${c * 12.5 + 1.5}%`, top: "0%", width: "9.5%", height: "100%", "--ty0": "calc(var(--fx-side, 1) * -40%)", "--s0": "1", "--gd": "1.8s", animationDelay: dm(delayMs, 240 + i * 90) } as CSSProperties}>
            <Portcullis iron={tint(p0, 0.9)} />
          </span>
        ))}
        {/* a seal on each file at their end */}
        {[3, 4].map((c, i) => (
          <span key={`s${c}`} className="grp-c-stamp absolute block rounded-full" style={{ ...sq(c, 7, 0.55), background: p2, border: `2px solid ${p1}`, "--gd": "1.3s", animationDelay: dm(delayMs, 480 + i * 80) } as CSSProperties} />
        ))}
        {/* an enemy bishop's diagonal and a rook's rank stop at the bars */}
        <span className="grp-c-in absolute block" style={{ ...sq(1, 6), "--gd": "1.6s", "--s0": "0.9", animationDelay: dm(delayMs, 300) } as CSSProperties}>
          <Man kind="b" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        <Ray at={sq(1, 6)} ang={45} len={5.66} keep={1.9} verb="grp-c-clip" color={p1} delay={dm(delayMs, 560)} />
        <span className="grp-c-in absolute block" style={{ ...sq(7, 4), "--gd": "1.6s", "--s0": "0.9", animationDelay: dm(delayMs, 340) } as CSSProperties}>
          <Man kind="r" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        <Ray at={sq(7, 4)} ang={180} len={6} keep={2.2} verb="grp-c-clip" color={p1} delay={dm(delayMs, 620)} />
        <Pips n={3} x={50} top={`calc(50% + var(--fx-side, 1) * 43.75% - 1.4%)`} fill={p1} rim={p2} delayMs={delayMs + 900} size={2.8} />
        {/* settle: grit shaken off the bars */}
        <Flecks delayMs={delayMs + 1150} at={{ left: "37.5%", top: "10%", width: "25%", height: "70%" }} color={tint(p0, 0.8)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.65)} delayMs={delayMs + 480} anchored={anchored} />
    </Stage>
  );
}

/* --- thorn_hedge -----------------------------------------------------------
   "Enemy bishops, rooks, and queens cannot cross into your half of the board
   for their next 3 turns." A hedge of black thorns grows along the halfway
   line, bush by bush; an enemy bishop, rook and queen each drive at the
   caster's half and are stopped at the thorns, while a knight, which the
   hedge does not name, jumps clean over it. Three pips. */
function Thorns({ bush, thorn }: { bush: string; thorn: string }) {
  return (
    <svg viewBox="0 0 20 10" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
      <path d="M0 10 C1 5 3 3 5 5 C6 1.6 9 1 10 4 C11.4 1 14.6 1.6 15 5 C17 3 19 5 20 10 Z" fill={bush} />
      {[[3, 5, -1], [7, 2.6, 1], [12, 2.4, -1], [16, 4.4, 1], [9, 6, 1]].map(([x, y, s], i) => (
        <path key={i} d={`M${x} ${y} l${s * 1.4} -1.6`} stroke={thorn} strokeWidth="0.6" strokeLinecap="round" />
      ))}
    </svg>
  );
}
const HEDGE_RAYS: { col: number; rank: number; kind: "b" | "r" | "q"; ang: number; len: number; keep: number }[] = [
  { col: 1, rank: 6, kind: "b", ang: 45, len: 5, keep: 3.5 },
  { col: 4, rank: 7, kind: "r", ang: 90, len: 6, keep: 3.3 },
  { col: 6, rank: 5, kind: "q", ang: 135, len: 4.2, keep: 2.1 },
];
function ThornHedgeScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Thorns bush={p0} thorn={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 560}>
      <Frame anchored={anchored}>
        {/* tell: the ground along the halfway line darkens */}
        <span className="grp-tellshadow absolute block" style={{ left: "0%", top: "45%", width: "100%", height: "10%", background: tint(p2, 0.5), animationDelay: dm(delayMs, 60) }} />
        {/* the hedge grows along the line, bush by bush */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((c) => (
          <span key={c} className="grp-c-up absolute block" style={{ left: `${c * 12.5 - 1}%`, top: "calc(50% - 5%)", width: "14.5%", height: "8%", "--gd": "2s", animationDelay: dm(delayMs, 120 + Math.abs(c - 3.5) * 50) } as CSSProperties}>
            <Thorns bush={p0} thorn={p1} />
          </span>
        ))}
        {/* the sliders drive at the caster's half and are stopped at it */}
        {HEDGE_RAYS.map((h, i) => (
          <span key={h.kind}>
            <span className="grp-c-in absolute block" style={{ ...sq(h.col, h.rank), "--gd": "1.8s", "--s0": "0.9", animationDelay: dm(delayMs, 200 + i * 60) } as CSSProperties}>
              <Man kind={h.kind} fill={tint(p1, 0.95)} stroke={p2} />
            </span>
            <Ray at={sq(h.col, h.rank)} ang={h.ang} len={h.len} keep={h.keep} verb="grp-c-clip" color={p1} delay={dm(delayMs, 420 + i * 80)} />
          </span>
        ))}
        {/* a knight is not named: it jumps clean over */}
        <span className="grp-c-go absolute block" style={{ ...sq(2, 3), "--tx0": "-100%", "--ty0": "calc(var(--fx-side, 1) * -200%)", "--gd": "0.8s", animationDelay: dm(delayMs, 720) } as CSSProperties}>
          <Man kind="n" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        <Pips n={3} x={50} top="calc(50% + var(--fx-side, 1) * 6% - 1.4%)" fill={p1} rim={p2} delayMs={delayMs + 960} size={2.8} />
        {/* settle: leaves fall from the hedge */}
        <Flecks delayMs={delayMs + 1150} at={{ left: "5%", top: "44%", width: "90%", height: "12%" }} color={tint(p0, 0.85)} n={6} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.6)} delayMs={delayMs + 600} anchored={anchored} />
    </Stage>
  );
}

/* --- we_quagmire -----------------------------------------------------------
   "Open two patches of sucking mud on empty squares: any enemy piece except a
   king that steps onto one is stuck fast for its next 3 turns instead of
   removed. The mud stays for the rest of the game." Two mud patches open,
   bubbling; an enemy knight lands in the first and sinks to the knees,
   straining and held (three pips); their king walks across the second
   untouched. */
function Mud({ mud, rim }: { mud: string; rim: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M1 5.4 C1 2.6 3.4 1.4 5.4 1.8 C8 1.8 9.4 3.8 9 5.8 C8.8 8.2 6.4 9 4.6 8.8 C2.4 8.8 1 7.6 1 5.4 Z" fill={mud} stroke={rim} strokeWidth="0.5" />
      <circle cx="3.6" cy="4.4" r="0.7" fill="none" stroke={rim} strokeWidth="0.4" />
      <circle cx="6.4" cy="6.2" r="0.5" fill="none" stroke={rim} strokeWidth="0.4" />
    </svg>
  );
}
function QuagmireScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Mud mud={p0} rim={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const second = AIMED;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 620}>
      <Frame anchored={anchored}>
        {/* tell: the ground goes soft on both squares */}
        <span className="grp-tellshadow absolute block rounded-full" style={{ ...cell(0, 0, 1.1), background: tint(p2, 0.5), animationDelay: dm(delayMs, 0) }} />
        {/* the two patches open, bubbling */}
        <span className="grp-c-in absolute block" style={{ ...cell(0, 0, 0.96), "--s0": "0.2", "--gd": "2.1s", animationDelay: dm(delayMs, 120) } as CSSProperties}>
          <Mud mud={p0} rim={p1} />
        </span>
        <span className="grp-c-in absolute block" style={{ ...second, "--s0": "0.2", "--gd": "1.9s", animationDelay: dm(delayMs, 220) } as CSSProperties}>
          <Mud mud={p0} rim={p1} />
        </span>
        {[0, 1, 2].map((i) => (
          <span key={i} className="grp-c-pip absolute block rounded-full" style={{ ...cell(-0.2 + i * 0.2, 0.1 - (i % 2) * 0.18, 0.12), border: `1px solid ${p1}`, "--gd": "0.6s", animationDelay: dm(delayMs, 300 + i * 110) } as CSSProperties} />
        ))}
        {/* an enemy knight jumps in and sinks to the knees */}
        <span className="grp-c-go absolute block" style={{ ...cell(0, 0, 0.84), "--tx0": "-100%", "--ty0": "calc(var(--fx-side, 1) * -200%)", "--gd": "0.5s", animationDelay: dm(delayMs, 420) } as CSSProperties}>
          <Man kind="n" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        <span className="absolute block overflow-hidden" style={{ ...cell(0, -0.12, 0.84) }}>
          <span className="grp-c-stuck absolute block" style={{ left: "0%", top: "26%", width: "100%", height: "100%", "--tx1": "0%", "--ty1": "-20%", "--gd": "1.4s", animationDelay: dm(delayMs, 620) } as CSSProperties}>
            <Man kind="n" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
        </span>
        {/* stuck three turns */}
        {[0, 1, 2].map((i) => (
          <span key={`t${i}`} className="grp-c-pip absolute block rounded-full" style={{ ...cell(-0.3 + i * 0.3, 0.7, 0.2), background: p1, border: `1px solid ${p2}`, "--gd": "1s", animationDelay: dm(delayMs, 900 + i * 80) } as CSSProperties} />
        ))}
        {/* their king crosses the second patch untouched */}
        <span className="grp-c-go absolute block" style={{ ...second, "--tx0": "-100%", "--tx1": "100%", "--gd": "0.9s", animationDelay: dm(delayMs, 780) } as CSSProperties}>
          <Man kind="k" fill={p1} stroke={p2} />
        </span>
        {/* settle: mud spatters sink */}
        <Flecks delayMs={delayMs + 1150} at={cell(0, 0, 1.4)} color={tint(p0, 0.85)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.6)} delayMs={delayMs + 640} anchored={anchored} />
    </Stage>
  );
}

/* --- ww_praetorian_guard ---------------------------------------------------
   "Choose one of your pieces: for your next 4 turns it cannot be captured and
   may also step one square in any direction like a king." A praetorian
   scutum and crested helmet are set on the chosen piece; the eight king's
   steps round it are laid out; an enemy capture line runs at it and glances
   off the shield short of the square. Four pips, four turns. Target cut: the
   helmet on the square. */
function Scutum({ face, rim }: { face: string; rim: string }) {
  return (
    <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
      <path d="M1.4 1.4 C3.6 0.6 6.4 0.6 8.6 1.4 V10.6 C6.4 11.4 3.6 11.4 1.4 10.6 Z" fill={face} stroke={rim} strokeWidth="0.7" />
      <path d="M5 1 V11 M1.4 6 H8.6" stroke={rim} strokeWidth="0.5" />
      <circle cx="5" cy="6" r="1.2" fill={rim} />
    </svg>
  );
}
function Helmet({ metal, crest }: { metal: string; crest: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M2 4 C3 0.6 7 0.6 8 4" fill="none" stroke={crest} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M2 9 V6 C2 3.6 8 3.6 8 6 V9 H6.4 V7 H3.6 V9 Z" fill={metal} stroke={crest} strokeWidth="0.5" {...SJ} />
    </svg>
  );
}
function PraetorianGuardScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Helmet metal={p0} crest={p1} />} />;
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="grp-tellglow absolute block rounded-full" style={{ left: "14%", top: "14%", width: "72%", height: "72%", background: tint(p0, 0.4), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-stamp absolute block" style={{ left: "26%", top: "8%", width: "48%", height: "48%", "--gd": "1.2s", "--r0": "0deg", animationDelay: dm(delayMs, 140) } as CSSProperties}>
          <Helmet metal={p0} crest={p1} />
        </span>
        <Flecks delayMs={delayMs + 520} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p0, 0.8)} n={3} />
      </span>
    );
  }
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 720}>
      <Frame anchored={anchored}>
        {/* tell: the guard's light gathers on the chosen piece */}
        <span className="grp-tellglow absolute block rounded-full" style={{ ...cell(0, 0, 1.4), background: tint(p0, 0.4), animationDelay: dm(delayMs, 0) }} />
        {/* the helmet is set on it, and the scutum planted in front */}
        <span className="grp-c-stamp absolute block" style={{ ...cell(0, -0.3, 0.55), "--gd": "1.6s", "--r0": "0deg", animationDelay: dm(delayMs, 140) } as CSSProperties}>
          <Helmet metal={p0} crest={p1} />
        </span>
        <span className="grp-c-up absolute block" style={{ ...cell(0, 0.12, 0.62), "--gd": "1.5s", animationDelay: dm(delayMs, 280) } as CSSProperties}>
          <Scutum face={p1} rim={p2} />
        </span>
        {/* the eight king's steps round it */}
        {RING8.map(([dx, dy], i) => (
          <span key={i} className="absolute block" style={{ ...cell(0, 0), rotate: `${Math.round((Math.atan2(dy, dx) * 180) / Math.PI)}deg` }}>
            <span className="grp-c-draw absolute block" style={{ left: "58%", top: "46%", width: dx && dy ? "80%" : "52%", height: "8%", background: `linear-gradient(90deg, ${tint(p0, 0.2)}, ${p0})`, "--gd": "1.3s", animationDelay: dm(delayMs, 420 + i * 30) } as CSSProperties} />
          </span>
        ))}
        {/* an enemy capture runs at it and glances off short of the square */}
        <span className="absolute block" style={{ ...cell(0, 0), rotate: "calc(var(--fx-side, 1) * -60deg)" }}>
          <span className="grp-c-go absolute block" style={{ left: "62%", top: "44%", width: "120%", height: "12%", background: `linear-gradient(90deg, ${p2}, ${tint(p2, 0)})`, "--tx0": "180%", "--tx1": "10%", "--gd": "0.5s", animationDelay: dm(delayMs, 560) } as CSSProperties} />
        </span>
        <span className="grp-c-blast absolute block" style={{ ...cell(0.28, -0.44, 0.35), "--tx1": "140%", "--ty1": "calc(var(--fx-side, 1) * -140%)", "--gd": "0.6s", animationDelay: dm(delayMs, 720) } as CSSProperties}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0.6 L9 5 L5 9.4 L1 5 Z" fill={p1} stroke={p2} strokeWidth="0.7" {...SJ} />
          </svg>
        </span>
        {/* four turns */}
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="grp-c-pip absolute block rounded-full" style={{ ...cell(-0.45 + i * 0.3, 0.72, 0.18), background: p1, border: `1px solid ${p2}`, "--gd": "1s", animationDelay: dm(delayMs, 900 + i * 70) } as CSSProperties} />
        ))}
        {/* settle: bronze glints drift up */}
        <Flecks delayMs={delayMs + 1150} at={cell(0, 0, 1.6)} color={tint(p0, 0.8)} dir={-1} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p0, 0.7)} delayMs={delayMs + 740} anchored={anchored} />
    </Stage>
  );
}

/* --- ww_bridgehead ---------------------------------------------------------
   "Place a new knight on an empty square in your half and a new pawn on an
   empty square on your fourth rank or lower, once." The caster's half is
   marked and a rope is strung along the top of their fourth rank (the pawn's
   limit); a pontoon of planks is laid from the caster's edge, a knight is
   landed on the chosen square and a pawn on the second one below the rope,
   each with a pennant driven in beside it. Target cut: a pennant and the new
   piece dropped on that square. */
function Pennant({ pole, flag }: { pole: string; flag: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M2.4 9.6 V0.6" stroke={pole} strokeWidth="0.8" strokeLinecap="round" />
      <path d="M2.8 1 L9 2.8 L2.8 4.6 Z" fill={flag} stroke={pole} strokeWidth="0.4" {...SJ} />
    </svg>
  );
}
function BridgeheadScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Pennant pole={p2} flag={p1} />} />;
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="grp-tellshadow absolute block rounded-full" style={{ left: "14%", top: "60%", width: "72%", height: "30%", background: tint(p2, 0.5), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-stamp absolute block" style={{ left: "52%", top: "4%", width: "40%", height: "40%", "--gd": "1.2s", "--r0": "0deg", animationDelay: dm(delayMs, 160) } as CSSProperties}>
          <Pennant pole={p2} flag={p1} />
        </span>
        <Flecks delayMs={delayMs + 520} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p0, 0.8)} n={3} />
      </span>
    );
  }
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 560}>
      <Frame anchored={anchored}>
        {/* tell: the caster's half, and the rope along the top of the fourth rank */}
        <span className="grp-c-in absolute block" style={{ ...ranks(1.5, 4), background: tint(p0, 0.16), "--s0": "1", "--gd": "1.9s", animationDelay: dm(delayMs, 0) } as CSSProperties} />
        <span className="absolute block" style={{ left: "0%", top: "calc(50% - 0.5%)", width: "100%", height: "1%" }}>
          <span className="grp-c-draw absolute inset-0 block" style={{ background: `repeating-linear-gradient(90deg, ${p1} 0 3%, ${p2} 3% 4%)`, "--gd": "1.8s", animationDelay: dm(delayMs, 100) } as CSSProperties} />
        </span>
        {/* planks laid from the caster's edge to the knight's square */}
        {[0, 1, 2].map((i) => (
          <span key={i} className="grp-c-up absolute block" style={{ ...cell(0, 0, 0.7), top: `calc(50% + (var(--fx-oy, 0) + var(--fx-side, 1) * ${0.8 + i * 0.7}) * 12.5% - 1.5%)`, height: "3%", background: p1, border: `1px solid ${p2}`, "--gd": "1.3s", animationDelay: dm(delayMs, 360 - i * 80) } as CSSProperties} />
        ))}
        {/* strike: the knight is landed on the chosen square */}
        <span className="grp-c-stamp absolute block" style={{ ...cell(0, 0, 0.9), "--gd": "1.5s", "--r0": "0deg", animationDelay: dm(delayMs, 480) } as CSSProperties}>
          <Man kind="n" fill={p1} stroke={p2} />
        </span>
        <span className="grp-c-up absolute block" style={{ ...cell(0.38, -0.3, 0.45), "--gd": "1.3s", animationDelay: dm(delayMs, 600) } as CSSProperties}>
          <Pennant pole={p2} flag={p0} />
        </span>
        {/* and the pawn below the rope */}
        <span className="grp-c-stamp absolute block" style={{ ...AIMED, "--gd": "1.3s", "--r0": "0deg", animationDelay: dm(delayMs, 700) } as CSSProperties}>
          <Man kind="p" fill={p1} stroke={p2} />
        </span>
        <span className="grp-flash absolute block rounded-full" style={{ ...AIMED, background: tint(p1, 0.45), animationDelay: dm(delayMs, 700) }} />
        {/* settle: sawdust off the planks */}
        <Flecks delayMs={delayMs + 1150} at={cell(0, 1, 1.6)} color={tint(p1, 0.8)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.65)} delayMs={delayMs + 580} anchored={anchored} />
    </Stage>
  );
}

/** A card face carrying `n` tier pips down its middle (the draft scenes). */
function TierCard({ face, edge, pip, n }: { face: string; edge: string; pip: string; n: number }) {
  return (
    <svg viewBox="0 0 10 14" className="block h-full w-full" aria-hidden="true">
      <rect x="0.6" y="0.6" width="8.8" height="12.8" fill={face} stroke={edge} strokeWidth="0.7" />
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={i % 2 ? 6.4 : 3.6} cy={2.6 + Math.floor(i / 2) * 3} r="0.95" fill={pip} />
      ))}
    </svg>
  );
}
/** A heavy diagonal cross, stamped over what a rule takes away. */
function Strike({ ink }: { ink: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M1.6 1.6 L8.4 8.4 M8.4 1.6 L1.6 8.4" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* --- draft_domination ------------------------------------------------------
   "Force your opponent's next draft down to tier 2, so both cards they are
   offered come from a weak tier." Their next offer is dealt on their side of
   the board, two cards each carrying six tier pips; a press comes down on
   both and the pips are knocked off until each card holds just two. */
function DraftDominationScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} from="above" motif={<TierCard face={p0} edge={p2} pip={p1} n={2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const cards = [28, 56];
  const cardTop = "calc(50% - var(--fx-side, 1) * 22% - 11%)";
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 520}>
      <Frame anchored={anchored}>
        {/* tell: their offer is dealt, two tier-6 cards */}
        <span className="grp-tellglow absolute block rounded-full" style={{ left: "24%", top: `calc(${cardTop} - 2%)`, width: "52%", height: "26%", background: tint(p1, 0.3), animationDelay: dm(delayMs, 60) }} />
        {cards.map((x, i) => (
          <span key={x} className="grp-c-in absolute block" style={{ left: `${x}%`, top: cardTop, width: "16%", height: "22%", "--ty0": "calc(var(--fx-side, 1) * -50%)", "--r0": `${i ? 6 : -6}deg`, "--gd": "2s", animationDelay: dm(delayMs, 40 + i * 70) } as CSSProperties}>
            <TierCard face={p0} edge={p2} pip={tint(p1, 0.5)} n={2} />
          </span>
        ))}
        {/* the four upper pips of each, knocked off by the press */}
        {cards.map((x, i) =>
          [0, 1, 2, 3].map((k) => (
            <span
              key={`${x}${k}`}
              className="grp-c-part absolute block rounded-full"
              style={{ left: `calc(${x}% + ${k % 2 ? 9.2 : 4.9}%)`, top: `calc(${cardTop} + ${9.8 + Math.floor(k / 2) * 4.7}%)`, width: "1.9%", height: "1.9%", background: p1, "--tx1": `${(k % 2 ? 1 : -1) * (160 + k * 40)}%`, "--ty1": "520%", "--r1": "0deg", "--gd": "0.7s", animationDelay: dm(delayMs, 520 + i * 40 + k * 30) } as CSSProperties}
            />
          )),
        )}
        {cards.map((x, i) =>
          [0, 1, 2, 3].map((k) => (
            <span
              key={`h${x}${k}`}
              className="grp-c-in absolute block rounded-full"
              style={{ left: `calc(${x}% + ${k % 2 ? 9.2 : 4.9}%)`, top: `calc(${cardTop} + ${9.8 + Math.floor(k / 2) * 4.7}%)`, width: "1.9%", height: "1.9%", background: p1, "--s0": "0.2", "--gd": "0.52s", animationDelay: dm(delayMs, 120 + i * 40) } as CSSProperties}
            />
          )),
        )}
        {/* strike: the press comes down across both */}
        <span className="grp-c-stamp absolute block" style={{ left: "24%", top: `calc(${cardTop} - 5%)`, width: "52%", height: "6%", background: p2, border: `2px solid ${p1}`, "--gd": "1.2s", "--r0": "0deg", animationDelay: dm(delayMs, 460) } as CSSProperties} />
        {/* two pips left on each: tier 2 */}
        {cards.map((x, i) => (
          <span key={`t${x}`} className="grp-c-pip absolute block" style={{ left: `${x + 4}%`, top: `calc(${cardTop} + 23%)`, width: "8%", height: "5%", "--gd": "1.1s", animationDelay: dm(delayMs, 860 + i * 90) } as CSSProperties}>
            <svg viewBox="0 0 10 6" className="block h-full w-full" aria-hidden="true">
              <path d="M3.4 0.6 V5.4 M6.6 0.6 V5.4" stroke={p1} strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </span>
        ))}
        {/* settle: the knocked-off pips fade out below */}
        <Flecks delayMs={delayMs + 1150} at={{ left: "25%", top: "calc(50% - var(--fx-side, 1) * 8% - 10%)", width: "50%", height: "20%" }} color={tint(p1, 0.7)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.65)} delayMs={delayMs + 540} anchored={anchored} />
    </Stage>
  );
}

/* --- total_nullify ---------------------------------------------------------
   "Cancel your opponent's unused and temporary buffs. Locked-in piece
   upgrades resist. Using it spends your next unused reroll, if any." Their
   cards are laid out on their side; a null line sweeps across them and every
   card tears in half and falls, except one with a padlock, which stays.
   Then the price: the reroll die on the caster's side cracks apart. */
function TotalNullifyScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance")
    return (
      <EntranceCut
        palette={palette}
        glyph={glyph}
        delayMs={delayMs}
        motif={
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <circle cx="5" cy="5" r="3.8" fill="none" stroke={p1} strokeWidth="1" />
            <path d="M2.4 7.6 L7.6 2.4" stroke={p1} strokeWidth="1" strokeLinecap="round" />
          </svg>
        }
      />
    );
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const cardTop = "calc(50% - var(--fx-side, 1) * 22% - 9%)";
  const xs = [16, 34, 52, 70];
  const locked = 52;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 560}>
      <Frame anchored={anchored}>
        {/* tell: their cards are laid out */}
        {xs.map((x, i) => (
          <span key={x} className={`${x === locked ? "grp-c-in" : "grp-hold"} absolute block`} style={{ left: `${x}%`, top: cardTop, width: "13%", height: "18%", "--s0": "0.8", "--gd": "2s", animationDelay: dm(delayMs, 40 + i * 50) } as CSSProperties}>
            <CardBack face={x === locked ? p1 : tint(p1, 0.85)} edge={p2} />
          </span>
        ))}
        {/* the null line sweeps across them */}
        <span className="grp-c-go absolute block" style={{ left: "10%", top: `calc(${cardTop} - 2%)`, width: "2%", height: "22%", background: p1, "--tx0": "-100%", "--tx1": "3900%", "--gd": "0.8s", animationDelay: dm(delayMs, 360) } as CSSProperties} />
        {/* strike: every card tears in half and falls... */}
        {xs
          .filter((x) => x !== locked)
          .map((x, i) =>
            [-1, 1].map((s) => (
              <span key={`${x}${s}`} className="grp-c-part absolute block overflow-hidden" style={{ left: `${x + (s > 0 ? 6.5 : 0)}%`, top: cardTop, width: "6.5%", height: "18%", "--tx1": `${s * 60}%`, "--ty1": "90%", "--r1": `${s * 24}deg`, "--gd": "0.75s", animationDelay: dm(delayMs, 520 + i * 70) } as CSSProperties}>
                <span className="absolute block" style={{ left: s > 0 ? "-100%" : "0%", top: "0%", width: "200%", height: "100%" }}>
                  <CardBack face={tint(p1, 0.85)} edge={p2} />
                </span>
              </span>
            )),
          )}
        {/* ...but the locked-in one holds */}
        <span className="grp-c-stamp absolute block" style={{ left: `${locked + 3.5}%`, top: `calc(${cardTop} + 5%)`, width: "6%", height: "7%", "--gd": "1.2s", "--r0": "0deg", animationDelay: dm(delayMs, 600) } as CSSProperties}>
          <Padlock body={p0} shackle={p2} />
        </span>
        {/* the price: the caster's reroll die cracks apart */}
        <span className="grp-c-in absolute block" style={{ ...sq(3.5, 1.2, 0.6), "--gd": "0.9s", "--s0": "0.8", animationDelay: dm(delayMs, 760) } as CSSProperties}>
          <Die fill={p1} pip={p2} />
        </span>
        {[-1, 1].map((s) => (
          <span key={s} className="grp-c-part absolute block overflow-hidden" style={{ ...sq(3.5 + s * 0.15, 1.2, 0.3), height: "7.5%", marginTop: "-2.1%", "--tx1": `${s * 80}%`, "--ty1": "60%", "--r1": `${s * 30}deg`, "--gd": "0.6s", animationDelay: dm(delayMs, 1080) } as CSSProperties}>
            <span className="absolute block" style={{ left: s > 0 ? "-100%" : "0%", top: "0%", width: "200%", height: "100%" }}>
              <Die fill={p1} pip={p2} />
            </span>
          </span>
        ))}
        {/* settle: paper scraps sink */}
        <Flecks delayMs={delayMs + 1150} at={{ left: "14%", top: cardTop, width: "72%", height: "20%" }} color={tint(p1, 0.7)} n={6} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.65)} delayMs={delayMs + 580} anchored={anchored} />
    </Stage>
  );
}

/* --- time_stop_short -------------------------------------------------------
   "Time stops: freeze every enemy piece except the king for 1 turn, then take
   one extra move right now, once. You cannot capture the king during the
   bonus move. Afterward your next draft is skipped." A stopwatch stands over
   the middle of the board and its hand seizes; a pause mark falls on every
   enemy piece but the king; the caster's piece takes its extra move, and a
   line to the enemy king is cut short of him. Last, the caster's next draft
   card is crossed out. */
function Stopwatch({ face, rim }: { face: string; rim: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <circle cx="5" cy="5.6" r="4" fill={face} stroke={rim} strokeWidth="0.7" />
      <path d="M4 0.6 H6 M5 0.6 V1.6" stroke={rim} strokeWidth="0.7" strokeLinecap="round" />
      {[0, 90, 180, 270].map((a) => (
        <path key={a} d="M5 2.2 V2.9" stroke={rim} strokeWidth="0.5" transform={`rotate(${a} 5 5.6)`} />
      ))}
    </svg>
  );
}
function PauseMark({ ink }: { ink: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <rect x="2.4" y="2" width="1.8" height="6" rx="0.4" fill={ink} />
      <rect x="5.8" y="2" width="1.8" height="6" rx="0.4" fill={ink} />
    </svg>
  );
}
const PAUSED: [number, number][] = [[1, 7], [2, 6], [5, 6], [6, 7], [3, 5]];
function TimeStopShortScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Stopwatch face={p0} rim={p1} />} />;
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="grp-tellglow absolute block rounded-full" style={{ left: "16%", top: "16%", width: "68%", height: "68%", background: tint(p1, 0.35), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-stamp absolute block" style={{ left: "24%", top: "24%", width: "52%", height: "52%", "--gd": "1.1s", "--r0": "0deg", animationDelay: dm(delayMs, 140) } as CSSProperties}>
          <PauseMark ink={p1} />
        </span>
        <Flecks delayMs={delayMs + 520} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p1, 0.8)} n={3} />
      </span>
    );
  }
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 420}>
      <Frame anchored={anchored}>
        {/* tell: the stopwatch stands over the board, its hand running... */}
        <span className="grp-c-in absolute block" style={{ left: "40%", top: "40%", width: "20%", height: "20%", "--gd": "1.9s", "--s0": "0.7", animationDelay: dm(delayMs, 0) } as CSSProperties}>
          <Stopwatch face={tint(p0, 0.9)} rim={p1} />
        </span>
        {/* ...and seizing dead mid-sweep */}
        <span className="absolute block" style={{ left: "49.4%", top: "44%", width: "1.2%", height: "7.2%", transformOrigin: "50% 100%" }}>
          <span className="grp-halt absolute inset-0 block" style={{ background: p1, transformOrigin: "50% 100%", animationDelay: dm(delayMs, 80) }} />
        </span>
        {/* strike: a pause mark falls on every enemy piece but the king */}
        {PAUSED.map(([c, r], i) => (
          <span key={`${c}${r}`} className="grp-c-stamp absolute block" style={{ ...sq(c, r, 0.62), "--gd": "1.2s", "--r0": "0deg", animationDelay: dm(delayMs, 400 + i * 40) } as CSSProperties}>
            <PauseMark ink={tint(p1, 0.95)} />
          </span>
        ))}
        <span className="grp-c-in absolute block" style={{ ...sq(4, 7), "--gd": "1.6s", "--s0": "0.9", animationDelay: dm(delayMs, 300) } as CSSProperties}>
          <Man kind="k" fill={p1} stroke={p2} />
        </span>
        {/* the caster's extra move, and a line to their king cut short */}
        <Ray at={sq(2, 1)} ang={-90} len={3} verb="grp-c-draw" color={tint(p1, 0.9)} delay={dm(delayMs, 640)} />
        <Ray at={sq(2, 4)} ang={-33.7} len={3.6} keep={2.6} verb="grp-c-clip" color={p2} delay={dm(delayMs, 820)} />
        {/* the price: the caster's next draft card is crossed out */}
        <span className="grp-c-in absolute block" style={{ ...sq(6.2, 0.9, 0.8), "--gd": "1.1s", "--s0": "0.8", animationDelay: dm(delayMs, 900) } as CSSProperties}>
          <CardBack face={p0} edge={p2} />
        </span>
        <span className="grp-c-stamp absolute block" style={{ ...sq(6.2, 0.9, 0.6), "--gd": "0.9s", "--r0": "20deg", animationDelay: dm(delayMs, 1040) } as CSSProperties}>
          <Strike ink={p2} />
        </span>
        {/* settle: the second hand's ticks drift away */}
        <Flecks delayMs={delayMs + 1150} at={{ left: "36%", top: "36%", width: "28%", height: "28%" }} color={tint(p1, 0.8)} dir={-1} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.65)} delayMs={delayMs + 440} anchored={anchored} />
    </Stage>
  );
}

/* --- lost_days -------------------------------------------------------------
   "Your opponent skips their next turn entirely. On the turn after that,
   they may move only pawns, knights, or their king." A two-leaf calendar
   stands on the opponent's side: the first day's page is torn off and blows
   away (the skipped turn); on the second day only their pawn, knight and
   king are lit, while the bishop, rook and queen are barred. */
function Calendar({ page, ring }: { page: string; ring: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <rect x="1" y="1.6" width="8" height="7.8" fill={page} stroke={ring} strokeWidth="0.6" />
      <path d="M1 3.4 H9" stroke={ring} strokeWidth="0.7" />
      <path d="M3 0.6 V2.4 M7 0.6 V2.4" stroke={ring} strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}
function LostDaysScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Calendar page={p1} ring={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const lit: [number, "p" | "n" | "k"][] = [[1, "n"], [3, "p"], [4, "k"]];
  const barred: [number, "b" | "r" | "q"][] = [[2, "b"], [5, "q"], [7, "r"]];
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 440}>
      <Frame anchored={anchored}>
        {/* tell: the calendar stands on their side, two days showing */}
        <span className="grp-c-in absolute block" style={{ ...sq(3.5, 4.1, 1.8), "--gd": "2s", "--s0": "0.8", animationDelay: dm(delayMs, 0) } as CSSProperties}>
          <Calendar page={p1} ring={p2} />
        </span>
        {/* strike: the first day is torn off and blows away */}
        <span className="grp-c-part absolute block" style={{ ...sq(3.5, 4.1, 1.8), "--tx1": "140%", "--ty1": "calc(var(--fx-side, 1) * -90%)", "--r1": "38deg", "--gd": "0.9s", animationDelay: dm(delayMs, 420) } as CSSProperties}>
          <Calendar page={tint(p0, 0.95)} ring={p2} />
        </span>
        <span className="grp-c-stamp absolute block" style={{ ...sq(3.5, 4.2, 0.9), "--gd": "0.6s", "--r0": "-10deg", animationDelay: dm(delayMs, 300) } as CSSProperties}>
          <Strike ink={p2} />
        </span>
        {/* the second day: only pawns, knights and the king may go */}
        {lit.map(([c, kind], i) => (
          <span key={c} className="grp-c-up absolute block" style={{ ...sq(c, 6), "--gd": "1.3s", animationDelay: dm(delayMs, 760 + i * 60) } as CSSProperties}>
            <Man kind={kind} fill={p1} stroke={p2} />
          </span>
        ))}
        {barred.map(([c, kind], i) => (
          <span key={c}>
            <span className="grp-c-in absolute block" style={{ ...sq(c, 7), "--gd": "1.3s", "--s0": "1", animationDelay: dm(delayMs, 760 + i * 40) } as CSSProperties}>
              <Man kind={kind} fill={tint(p0, 0.8)} stroke={p2} />
            </span>
            <span className="grp-c-stamp absolute block" style={{ ...sq(c, 7, 0.7), "--gd": "1.1s", "--r0": "0deg", animationDelay: dm(delayMs, 880 + i * 60) } as CSSProperties}>
              <Strike ink={tint(p2, 0.9)} />
            </span>
          </span>
        ))}
        {/* settle: the torn page's scraps drift off */}
        <Flecks delayMs={delayMs + 1150} at={sq(4.5, 4.5, 2)} color={tint(p1, 0.8)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.65)} delayMs={delayMs + 460} anchored={anchored} />
    </Stage>
  );
}

/* --- parole ----------------------------------------------------------------
   "Your nerf is removed for good after your next 10 turns." Ten tally marks
   are scored in two gates of five on the caster's side, one by one; when the
   tenth is struck the shackle round the nerf opens and falls apart, for
   good. */
function ParoleScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Cuff iron={p1} bolt={p0} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const gateLeft = (g: number) => 26 + g * 28;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 1020}>
      <Frame anchored={anchored}>
        {/* tell: the shackle on the caster's side */}
        <span className="grp-tellshadow absolute block rounded-full" style={{ ...sq(3.5, 1.4, 1.6), background: tint(p2, 0.45), animationDelay: dm(delayMs, 40) }} />
        <span className="grp-c-in absolute block" style={{ ...sq(3.5, 2.4, 1.3), "--gd": "1.2s", "--s0": "0.8", animationDelay: dm(delayMs, 80) } as CSSProperties}>
          <Cuff iron={p1} bolt={p0} />
        </span>
        {/* ten tallies, two gates of five, scored one by one */}
        {[0, 1].map((g) =>
          [0, 1, 2, 3].map((k) => (
            <span key={`${g}${k}`} className="grp-c-in absolute block" style={{ left: `${gateLeft(g) + k * 4}%`, top: "calc(50% + var(--fx-side, 1) * 25% - 6%)", width: "1.4%", height: "12%", background: p1, "--s0": "0.2", "--gd": "1.5s", animationDelay: dm(delayMs, 200 + (g * 5 + k) * 70) } as CSSProperties} />
          )),
        )}
        {[0, 1].map((g) => (
          <span key={`x${g}`} className="absolute block" style={{ left: `${gateLeft(g) - 2}%`, top: "calc(50% + var(--fx-side, 1) * 25% - 0.8%)", width: "20%", height: "1.6%", rotate: "-24deg" }}>
            <span className="grp-c-draw absolute inset-0 block" style={{ background: p0, "--gd": "1.4s", animationDelay: dm(delayMs, 200 + (g * 5 + 4) * 70) } as CSSProperties} />
          </span>
        ))}
        {/* strike: on the tenth, the shackle opens and falls apart */}
        {[-1, 1].map((s) => (
          <span key={s} className="grp-c-part absolute block" style={{ ...sq(3.5 + s * 0.3, 2.4, 0.7), "--tx1": `${s * 120}%`, "--ty1": "80%", "--r1": `${s * 60}deg`, "--gd": "0.8s", animationDelay: dm(delayMs, 1000) } as CSSProperties}>
            <Cuff iron={p1} bolt={p0} />
          </span>
        ))}
        <span className="grp-flash absolute block rounded-full" style={{ ...sq(3.5, 2.4, 1.4), background: tint(p1, 0.5), animationDelay: dm(delayMs, 1000) }} />
        {/* settle: the dust of the old chain rises and clears */}
        <Flecks delayMs={delayMs + 1150} at={sq(3.5, 2.4, 1.8)} color={tint(p1, 0.8)} dir={-1} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.65)} delayMs={delayMs + 1040} anchored={anchored} />
    </Stage>
  );
}

/* --- promotion_storm -------------------------------------------------------
   "All pawns on your 5th rank or beyond promote to knights." The line of the
   caster's fifth rank is drawn and a storm gathers over the far half; a bolt
   strikes each of the caster's pawns at or past the line and each stands up
   a knight, while a pawn still short of the line is left as it is. */
function StormCloud({ cloud, rim }: { cloud: string; rim: string }) {
  return (
    <svg viewBox="0 0 20 8" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
      <path d="M1 7 C0 4 3 2.4 5 3.4 C6 0.6 11 0.4 12 3 C14 1.6 18 2.4 18.6 5 C20 5.4 20 7 18.6 7 Z" fill={cloud} stroke={rim} strokeWidth="0.4" />
    </svg>
  );
}
const STORM_PAWNS = [
  { col: 1, rank: 4 },
  { col: 3, rank: 5 },
  { col: 6, rank: 4 },
];
function PromotionStormScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} from="above" motif={<StormCloud cloud={p0} rim={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 480}>
      <Frame anchored={anchored}>
        {/* tell: the fifth rank's line, and the storm over the far half */}
        <span className="absolute block" style={{ left: "0%", top: "calc(50% - var(--fx-side, 1) * 0% - 0.5%)", width: "100%", height: "1%" }}>
          <span className="grp-c-draw absolute inset-0 block" style={{ background: p1, "--gd": "1.9s", animationDelay: dm(delayMs, 0) } as CSSProperties} />
        </span>
        <span className="grp-c-in absolute block" style={{ ...ranks(6.4, 1.6), "--ty0": "calc(var(--fx-side, 1) * -30%)", "--s0": "1", "--gd": "1.8s", animationDelay: dm(delayMs, 80) } as CSSProperties}>
          <StormCloud cloud={tint(p0, 0.85)} rim={p2} />
        </span>
        {STORM_PAWNS.map((p, i) => (
          <span key={p.col}>
            {/* the pawn at or past the line... */}
            <span className="grp-c-in absolute block" style={{ ...sq(p.col, p.rank), "--gd": "0.6s", "--s0": "0.9", animationDelay: dm(delayMs, 140 + i * 40) } as CSSProperties}>
              <Man kind="p" fill={p1} stroke={p2} />
            </span>
            {/* ...is struck from the cloud... */}
            <span className="grp-bolt absolute block" style={{ left: `${p.col * 12.5 + 5.5}%`, top: `calc(50% + var(--fx-side, 1) * ${(3.5 - p.rank) * 12.5}% - ${(6.5 - p.rank) * 12.5}%)`, width: "1.6%", height: `${(6.5 - p.rank) * 12.5}%`, background: p1, animationDelay: dm(delayMs, 420 + i * 90) }} />
            {/* ...and stands up a knight */}
            <span className="grp-c-up absolute block" style={{ ...sq(p.col, p.rank), "--gd": "1.3s", animationDelay: dm(delayMs, 480 + i * 90) } as CSSProperties}>
              <Man kind="n" fill={p1} stroke={p0} />
            </span>
          </span>
        ))}
        {/* a pawn short of the line is left a pawn */}
        <span className="grp-c-in absolute block" style={{ ...sq(5, 2), "--gd": "1.8s", "--s0": "0.9", animationDelay: dm(delayMs, 200) } as CSSProperties}>
          <Man kind="p" fill={tint(p1, 0.85)} stroke={p2} />
        </span>
        {/* settle: rain sifts down */}
        <Flecks delayMs={delayMs + 1150} at={ranks(4.5, 3)} color={tint(p0, 0.8)} n={6} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.65)} delayMs={delayMs + 500} anchored={anchored} />
    </Stage>
  );
}

/* --- royal_ascension -------------------------------------------------------
   "Your king gains queen movement permanently, but its added long-range moves
   cannot capture; it still captures as a normal king." A queen's crown
   settles over the caster's king and its eight long lines run out the full
   length of the board; one reaches an enemy piece at range and stops a
   square short of it (no capture at range), while an enemy piece beside the
   king is taken the ordinary way. */
function RoyalAscensionScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} from="above" motif={<Crown fill={p1} stroke={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const king = sq(4, 0);
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 440}>
      <Frame anchored={anchored}>
        {/* tell: the caster's king, and a queen's crown lowering onto it */}
        <span className="grp-tellglow absolute block rounded-full" style={{ ...sq(4, 0, 1.4), background: tint(p1, 0.4), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-in absolute block" style={{ ...king, "--gd": "2s", "--s0": "0.9", animationDelay: dm(delayMs, 40) } as CSSProperties}>
          <Man kind="k" fill={p1} stroke={p2} />
        </span>
        <span className="grp-c-in absolute block" style={{ ...sq(4, 0.62, 0.6), height: "5%", "--ty0": "calc(var(--fx-side, 1) * -160%)", "--s0": "1", "--gd": "1.9s", animationDelay: dm(delayMs, 160) } as CSSProperties}>
          <Crown fill={p1} stroke={p2} />
        </span>
        {/* strike: its queen lines run out the length of the board */}
        {[-90, -45, -135, 0, 180].map((a, i) => (
          <Ray key={a} at={king} ang={a} len={a === -90 ? 4 : a === -45 ? 4.2 : a === 0 ? 3 : a === 180 ? 4 : 5.6} verb="grp-c-draw" color={tint(p0, 0.85)} thick={5} delay={dm(delayMs, 420 + i * 50)} />
        ))}
        {/* at range, it stops a square short of the enemy piece */}
        <span className="grp-c-in absolute block" style={{ ...sq(4, 5), "--gd": "1.7s", "--s0": "0.9", animationDelay: dm(delayMs, 260) } as CSSProperties}>
          <Man kind="b" fill={tint(p2, 0.9)} stroke={p1} />
        </span>
        <Ray at={king} ang={-90} len={5} keep={3.6} verb="grp-c-clip" color={p1} delay={dm(delayMs, 700)} />
        <span className="grp-c-stamp absolute block" style={{ ...sq(4, 4.3, 0.4), "--gd": "1s", "--r0": "0deg", animationDelay: dm(delayMs, 900) } as CSSProperties}>
          <Strike ink={p1} />
        </span>
        {/* beside it, the old king's capture still works */}
        <span className="grp-c-blast absolute block" style={{ ...sq(5, 1), "--tx1": "60%", "--ty1": "calc(var(--fx-side, 1) * -60%)", "--gd": "0.8s", animationDelay: dm(delayMs, 980) } as CSSProperties}>
          <Man kind="n" fill={tint(p2, 0.9)} stroke={p1} />
        </span>
        {/* settle: gold motes climb off the crown */}
        <Flecks delayMs={delayMs + 1150} at={sq(4, 0.6, 1.6)} color={tint(p1, 0.85)} dir={-1} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.65)} delayMs={delayMs + 460} anchored={anchored} />
    </Stage>
  );
}

/* --- second_king -----------------------------------------------------------
   "Choose one of your pawns, on any rank; after your opponent's next move it
   becomes a second king. Your opponent must capture both of your kings to
   win." An hourglass stands over the chosen pawn while the opponent makes
   their move, then a crown drops onto it and it stands up a king; a gold
   cord ties it to the caster's first king, and two marks show both must
   fall. */
function SecondKingScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Man kind="k" fill={p0} stroke={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 700}>
      <Frame anchored={anchored}>
        {/* tell: the chosen pawn, and an hourglass over it */}
        <span className="grp-c-in absolute block" style={{ ...cell(0, 0, 0.9), "--gd": "0.9s", "--s0": "0.9", animationDelay: dm(delayMs, 0) } as CSSProperties}>
          <Man kind="p" fill={p1} stroke={p2} />
        </span>
        <span className="grp-c-pip absolute block" style={{ ...cell(0, -0.7, 0.45), "--gd": "0.9s", animationDelay: dm(delayMs, 80) } as CSSProperties}>
          <Hourglass glass={p1} sand={p0} />
        </span>
        {/* the opponent makes their move */}
        <Ray at={sq(2, 6)} ang={90} len={2} verb="grp-c-draw" color={tint(p2, 0.9)} delay={dm(delayMs, 320)} />
        {/* strike: the crown drops and the pawn stands up a king */}
        <span className="grp-c-in absolute block" style={{ ...cell(0, -0.55, 0.62), height: "5%", "--ty0": "-200%", "--s0": "1", "--gd": "0.6s", animationDelay: dm(delayMs, 620) } as CSSProperties}>
          <Crown fill={p0} stroke={p2} />
        </span>
        <span className="grp-c-up absolute block" style={{ ...cell(0, 0), "--gd": "1.2s", animationDelay: dm(delayMs, 700) } as CSSProperties}>
          <Man kind="k" fill={p0} stroke={p2} />
        </span>
        {/* a cord ties it to the first king on the caster's back rank */}
        <span className="grp-c-in absolute block" style={{ ...sq(4, 0), "--gd": "1.2s", "--s0": "0.9", animationDelay: dm(delayMs, 760) } as CSSProperties}>
          <Man kind="k" fill={p0} stroke={p2} />
        </span>
        <span className="absolute block" style={{ left: "56.25%", top: "calc(50% + var(--fx-side, 1) * 43.75%)", width: "calc(var(--fx-len, 3) * 12.5%)", height: "1%", rotate: "calc(var(--fx-ang, -90) * 1deg)", transformOrigin: "0% 50%" }}>
          <span className="grp-c-draw absolute inset-0 block" style={{ background: p0, "--gd": "1.1s", animationDelay: dm(delayMs, 820) } as CSSProperties} />
        </span>
        {/* two marks: both must fall */}
        {[0, 1].map((i) => (
          <span key={i} className="grp-c-pip absolute block" style={{ ...(i ? sq(4, 0.62, 0.3) : cell(0, -0.62, 0.3)), "--gd": "0.9s", animationDelay: dm(delayMs, 960 + i * 90) } as CSSProperties}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <circle cx="5" cy="5" r="3.6" fill="none" stroke={p1} strokeWidth="1" />
              <path d="M5 0.6 V3 M5 7 V9.4 M0.6 5 H3 M7 5 H9.4" stroke={p1} strokeWidth="0.9" strokeLinecap="round" />
            </svg>
          </span>
        ))}
        {/* settle: gold motes climb off the new king */}
        <Flecks delayMs={delayMs + 1150} at={cell(0, 0, 1.4)} color={tint(p0, 0.85)} dir={-1} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p0, 0.65)} delayMs={delayMs + 720} anchored={anchored} />
    </Stage>
  );
}

/* --- wa_leaden_crown -------------------------------------------------------
   "Turn one of your pawns into a queen, and the leaden crown guards it: that
   new queen cannot be captured for your opponent's next 2 turns." A heavy
   grey crown lowers onto the chosen pawn and it stands up a queen under it;
   an enemy capture line runs at her and is stopped dead at the lead. Two
   pips, two turns. Target cut: the lead crown settles on that square. */
function WaLeadenCrownScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} from="above" motif={<Crown fill={p0} stroke={p1} />} />;
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="grp-tellshadow absolute block rounded-full" style={{ left: "16%", top: "56%", width: "68%", height: "30%", background: tint(p2, 0.5), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-stamp absolute block" style={{ left: "20%", top: "4%", width: "60%", height: "40%", "--gd": "1.2s", "--r0": "0deg", animationDelay: dm(delayMs, 140) } as CSSProperties}>
          <Crown fill={p0} stroke={p1} />
        </span>
        <Flecks delayMs={delayMs + 520} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p0, 0.8)} n={3} />
      </span>
    );
  }
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 520}>
      <Frame anchored={anchored}>
        {/* tell: the lead's shadow pools on the pawn */}
        <span className="grp-tellshadow absolute block rounded-full" style={{ ...cell(0, 0.2, 1.2), background: tint(p2, 0.55), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-in absolute block" style={{ ...cell(0, 0, 0.9), "--gd": "0.7s", "--s0": "0.9", animationDelay: dm(delayMs, 40) } as CSSProperties}>
          <Man kind="p" fill={p1} stroke={p2} />
        </span>
        {/* strike: the leaden crown comes down heavily */}
        <span className="grp-c-stamp absolute block" style={{ ...cell(0, -0.5, 0.7), height: "5.8%", "--gd": "1.8s", "--r0": "0deg", animationDelay: dm(delayMs, 460) } as CSSProperties}>
          <Crown fill={p0} stroke={p1} />
        </span>
        <span className="grp-c-up absolute block" style={{ ...cell(0, 0.05, 0.9), "--gd": "1.6s", animationDelay: dm(delayMs, 540) } as CSSProperties}>
          <Man kind="q" fill={p1} stroke={p2} />
        </span>
        {/* an enemy capture runs at her and stops dead at the lead */}
        <span className="absolute block" style={{ ...cell(0, 0), rotate: "calc(var(--fx-side, 1) * -45deg)" }}>
          <span className="grp-c-go absolute block" style={{ left: "70%", top: "45%", width: "150%", height: "10%", background: `linear-gradient(90deg, ${p2}, ${tint(p2, 0)})`, "--tx0": "120%", "--gd": "0.7s", animationDelay: dm(delayMs, 760) } as CSSProperties} />
        </span>
        <span className="grp-c-stamp absolute block" style={{ ...cell(0.42, -0.42, 0.34), "--gd": "0.8s", "--r0": "0deg", animationDelay: dm(delayMs, 900) } as CSSProperties}>
          <Strike ink={p0} />
        </span>
        {[0, 1].map((i) => (
          <span key={i} className="grp-c-pip absolute block rounded-full" style={{ ...cell(-0.15 + i * 0.3, 0.72, 0.2), background: p0, border: `1px solid ${p1}`, "--gd": "1s", animationDelay: dm(delayMs, 960 + i * 90) } as CSSProperties} />
        ))}
        {/* settle: lead flakes sink */}
        <Flecks delayMs={delayMs + 1150} at={cell(0, 0, 1.4)} color={tint(p0, 0.85)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.6)} delayMs={delayMs + 540} anchored={anchored} />
    </Stage>
  );
}

/* --- valkyrie --------------------------------------------------------------
   "For your opponent's next 3 turns, any knight, bishop, or rook of yours
   they capture is carried home to your pocket instead of being lost for
   good. Drop it back onto an empty square on a later turn. In exchange, you
   skip your next draft." An enemy capture takes one of the caster's knights;
   a winged rider stoops on the square and carries the knight off to a
   pocket at the caster's edge, where it waits. Three wing pips; the
   caster's next draft card is crossed out. */
function Wings({ feather, rim }: { feather: string; rim: string }) {
  return (
    <svg viewBox="0 0 16 8" className="block h-full w-full" aria-hidden="true">
      <path d="M8 6 C6 2 3 0.6 0.4 1.4 C2 3 2.6 5 4 6.4 C5.4 7 7 7 8 6 Z M8 6 C10 2 13 0.6 15.6 1.4 C14 3 13.4 5 12 6.4 C10.6 7 9 7 8 6 Z" fill={feather} stroke={rim} strokeWidth="0.4" {...SJ} />
    </svg>
  );
}
function Pouch({ cloth, tie }: { cloth: string; tie: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M2 3 H8 L9 8 C9 9.2 1 9.2 1 8 Z" fill={cloth} stroke={tie} strokeWidth="0.6" {...SJ} />
      <path d="M1.6 3 C3 4.4 7 4.4 8.4 3" fill="none" stroke={tie} strokeWidth="0.7" />
    </svg>
  );
}
function ValkyrieScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} from="above" motif={<Wings feather={p1} rim={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const taken = sq(3, 4);
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 380}>
      <Frame anchored={anchored}>
        {/* tell: an enemy capture runs at the caster's knight */}
        <span className="grp-c-in absolute block" style={{ ...taken, "--gd": "0.55s", "--s0": "0.9", animationDelay: dm(delayMs, 0) } as CSSProperties}>
          <Man kind="n" fill={p1} stroke={p2} />
        </span>
        <Ray at={sq(6, 7)} ang={135} len={4.24} verb="grp-c-draw" color={tint(p2, 0.9)} delay={dm(delayMs, 100)} />
        <span className="grp-flash absolute block rounded-full" style={{ ...sq(3, 4, 1.1), background: tint(p1, 0.5), animationDelay: dm(delayMs, 380) }} />
        {/* strike: the winged rider stoops on the square... */}
        <span className="grp-c-in absolute block" style={{ ...sq(3, 4.55, 1.2), height: "7%", "--ty0": "calc(var(--fx-side, 1) * -300%)", "--s0": "0.7", "--gd": "0.7s", animationDelay: dm(delayMs, 360) } as CSSProperties}>
          <Wings feather={p1} rim={p2} />
        </span>
        {/* ...and carries the knight home to the caster's pocket */}
        <span className="grp-c-go absolute block" style={{ ...taken, "--tx1": "calc(100% * 3.2)", "--ty1": "calc(var(--fx-side, 1) * 100% * 3.6)", "--gd": "0.8s", animationDelay: dm(delayMs, 560) } as CSSProperties}>
          <Man kind="n" fill={p1} stroke={p2} />
        </span>
        <span className="grp-c-go absolute block" style={{ ...sq(3, 4.55, 1.2), height: "7%", "--tx1": "calc(100% * 3.2)", "--ty1": "calc(var(--fx-side, 1) * 100% * 6.4)", "--gd": "0.8s", animationDelay: dm(delayMs, 560) } as CSSProperties}>
          <Wings feather={p1} rim={p2} />
        </span>
        <span className="grp-c-up absolute block" style={{ ...sq(6.2, 0.4, 0.9), "--gd": "1.4s", animationDelay: dm(delayMs, 540) } as CSSProperties}>
          <Pouch cloth={p0} tie={p1} />
        </span>
        {/* three wing pips: three turns */}
        {[0, 1, 2].map((i) => (
          <span key={i} className="grp-c-pip absolute block" style={{ left: `${42 + i * 6}%`, top: "calc(50% - 1.6%)", width: "5%", height: "3.2%", "--gd": "1s", animationDelay: dm(delayMs, 920 + i * 80) } as CSSProperties}>
            <Wings feather={p1} rim={p2} />
          </span>
        ))}
        {/* the price: the caster's next draft is crossed out */}
        <span className="grp-c-in absolute block" style={{ ...sq(1, 0.9, 0.7), "--gd": "1s", "--s0": "0.8", animationDelay: dm(delayMs, 980) } as CSSProperties}>
          <CardBack face={p0} edge={p2} />
        </span>
        <span className="grp-c-stamp absolute block" style={{ ...sq(1, 0.9, 0.55), "--gd": "0.8s", "--r0": "20deg", animationDelay: dm(delayMs, 1100) } as CSSProperties}>
          <Strike ink={p2} />
        </span>
        {/* settle: feathers drift down */}
        <Flecks delayMs={delayMs + 1150} at={sq(4.5, 2.5, 3)} color={tint(p1, 0.85)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.65)} delayMs={delayMs + 400} anchored={anchored} />
    </Stage>
  );
}

/* --- draft_seize -----------------------------------------------------------
   "Take both cards in your next draft and skip your opponent's next, though
   they gain a reroll in return." Two offer cards are dealt in the middle and
   both slide to the caster's side; the opponent's draft slot is crossed out,
   and a reroll die rolls across to them in return. */
function DraftSeizeScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<CardBack face={p1} edge={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const cards = [30, 54];
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 560}>
      <Frame anchored={anchored}>
        {/* tell: the offer is dealt face down in the middle */}
        {cards.map((x, i) => (
          <span key={x} className="grp-c-in absolute block" style={{ left: `${x}%`, top: "39%", width: "16%", height: "22%", "--s0": "0.7", "--r0": `${i ? 6 : -6}deg`, "--gd": "0.7s", animationDelay: dm(delayMs, 40 + i * 70) } as CSSProperties}>
            <CardBack face={p1} edge={p2} />
          </span>
        ))}
        {/* strike: both slide to the caster's side */}
        {cards.map((x, i) => (
          <span key={`g${x}`} className="grp-c-go absolute block" style={{ left: `${x}%`, top: "39%", width: "16%", height: "22%", "--tx1": `${i ? -20 : 20}%`, "--ty1": "calc(var(--fx-side, 1) * 150%)", "--gd": "0.8s", animationDelay: dm(delayMs, 480 + i * 60) } as CSSProperties}>
            <CardBack face={p1} edge={p2} />
          </span>
        ))}
        {/* the opponent's draft slot is crossed out */}
        <span className="grp-c-in absolute block" style={{ left: "42%", top: "calc(50% - var(--fx-side, 1) * 28% - 8%)", width: "16%", height: "16%", border: `2px dashed ${tint(p1, 0.8)}`, "--s0": "1", "--gd": "1.4s", animationDelay: dm(delayMs, 380) } as CSSProperties} />
        <span className="grp-c-stamp absolute block" style={{ left: "43%", top: "calc(50% - var(--fx-side, 1) * 28% - 7%)", width: "14%", height: "14%", "--gd": "1.1s", "--r0": "20deg", animationDelay: dm(delayMs, 700) } as CSSProperties}>
          <Strike ink={p0} />
        </span>
        {/* and a reroll die rolls across to them in return */}
        <span className="grp-c-go absolute block" style={{ left: "70%", top: "calc(50% - var(--fx-side, 1) * 28% - 3.5%)", width: "7%", height: "7%", "--tx0": "-300%", "--gd": "0.9s", animationDelay: dm(delayMs, 860) } as CSSProperties}>
          <span className="grp-c-spin absolute inset-0 block" style={{ "--r1": "360deg", "--gd": "0.9s", animationDelay: dm(delayMs, 860) } as CSSProperties}>
            <Die fill={p1} pip={p2} />
          </span>
        </span>
        {/* settle: motes trail after the cards */}
        <Flecks delayMs={delayMs + 1150} at={{ left: "30%", top: "calc(50% + var(--fx-side, 1) * 18% - 10%)", width: "40%", height: "20%" }} color={tint(p1, 0.8)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.65)} delayMs={delayMs + 580} anchored={anchored} />
    </Stage>
  );
}

/* =============================================================================
   Round 2, live tier 5 cards: the same rule-first scenes, one notch shorter
   and without the tier-6 accent (GrandAccent renders nothing below tier 6).
   ========================================================================== */

/* --- frozen_moment ---------------------------------------------------------
   "The next piece your opponent moves freezes solid the instant it lands and
   cannot move again for 2 of their turns." An enemy bishop makes its move;
   the instant it lands four shutter corners snap round its square (the
   moment is caught), ice slams over it and it shivers and holds. Two pips. */
function Shutter({ ink }: { ink: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M0.6 3 V0.6 H3 M7 0.6 H9.4 V3 M9.4 7 V9.4 H7 M3 9.4 H0.6 V7" fill="none" stroke={ink} strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}
function FrozenMomentScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Shutter ink={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const land = sq(5, 4);
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 560}>
      <Frame anchored={anchored}>
        {/* tell: the next enemy move, a bishop down its diagonal */}
        <Ray at={sq(2, 7)} ang={45} len={4.24} verb="grp-c-draw" color={tint(p1, 0.8)} delay={dm(delayMs, 0)} />
        <span className="grp-c-go absolute block" style={{ ...land, "--tx0": "-300%", "--ty0": "calc(var(--fx-side, 1) * -300%)", "--gd": "0.6s", animationDelay: dm(delayMs, 100) } as CSSProperties}>
          <Man kind="b" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        {/* strike: the instant it lands the shutter snaps... */}
        <span className="grp-c-stamp absolute block" style={{ ...sq(5, 4, 1.15), "--gd": "1.4s", "--r0": "0deg", animationDelay: dm(delayMs, 520) } as CSSProperties}>
          <Shutter ink={p2} />
        </span>
        <span className="grp-flash absolute block" style={{ ...sq(5, 4, 1.1), background: tint(p1, 0.6), animationDelay: dm(delayMs, 520) }} />
        {/* ...and it is frozen where it stands */}
        <span className="grp-shiver absolute block" style={{ ...land, animationDelay: dm(delayMs, 560) }}>
          <Man kind="b" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        <span className="grp-c-stamp absolute block" style={{ ...sq(5, 4, 0.94), "--gd": "1.1s", "--r0": "0deg", animationDelay: dm(delayMs, 600) } as CSSProperties}>
          <IceBlock ice={tint(p0, 0.5)} rim={p2} />
        </span>
        {[0, 1].map((i) => (
          <span key={i} className="grp-c-pip absolute block rounded-full" style={{ ...sq(5 - 0.15 + i * 0.3, 3.3, 0.2), background: p1, border: `1px solid ${p2}`, "--gd": "0.9s", animationDelay: dm(delayMs, 860 + i * 90) } as CSSProperties} />
        ))}
        {/* settle: rime sifts off */}
        <Flecks delayMs={delayMs + 1050} at={sq(5, 4, 1.4)} color={tint(p1, 0.85)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 560} anchored={anchored} />
    </Stage>
  );
}

/* --- iron_furrow -----------------------------------------------------------
   "Your opponent's pawns cannot advance for their next 4 turns, and any enemy
   pawn that captures during that time is caught on the spikes, unable to move
   for 2 of their turns." A row of iron spikes is sown in front of their
   pawns; each pawn's step forward is cut to nothing; one pawn captures
   diagonally and lands on the spikes, which close round it (two pips of its
   own). Four pips on the furrow. */
function Spikes({ iron }: { iron: string }) {
  return (
    <svg viewBox="0 0 20 6" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
      {[1, 4, 7, 10, 13, 16, 19].map((x) => (
        <path key={x} d={`M${x - 1.2} 6 L${x} 0.6 L${x + 1.2} 6 Z`} fill={iron} />
      ))}
    </svg>
  );
}
function IronFurrowScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Spikes iron={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const pawns = [1, 2, 4, 6];
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 420}>
      <Frame anchored={anchored}>
        {/* tell: their pawn line */}
        {pawns.map((c, i) => (
          <span key={c} className="grp-c-in absolute block" style={{ ...sq(c, 6), "--gd": c === 4 ? "0.7s" : "1.7s", "--s0": "0.9", animationDelay: dm(delayMs, 40 + i * 40) } as CSSProperties}>
            <Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
        ))}
        {/* the spikes are sown in front of them */}
        <span className="grp-c-up absolute block" style={{ ...ranks(5.25, 0.5), "--gd": "1.8s", animationDelay: dm(delayMs, 220) } as CSSProperties}>
          <Spikes iron={p2} />
        </span>
        {/* strike: each forward step is cut to nothing */}
        {pawns
          .filter((c) => c !== 4)
          .map((c, i) => (
            <Ray key={c} at={sq(c, 6)} ang={90} len={1.6} keep={0.12} verb="grp-c-clip" color={p1} delay={dm(delayMs, 420 + i * 60)} />
          ))}
        {/* one pawn captures and lands on the spikes */}
        <span className="grp-c-go absolute block" style={{ ...sq(3, 5), "--tx0": "100%", "--ty0": "calc(var(--fx-side, 1) * -100%)", "--gd": "0.5s", animationDelay: dm(delayMs, 600) } as CSSProperties}>
          <Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        <span className="grp-c-stuck absolute block" style={{ ...sq(3, 5), "--tx1": "0%", "--ty1": "calc(var(--fx-side, 1) * 16%)", "--gd": "1s", animationDelay: dm(delayMs, 860) } as CSSProperties}>
          <Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        <span className="grp-c-stamp absolute block" style={{ ...sq(3, 4.72, 0.9), height: "4%", "--gd": "1s", "--r0": "0deg", animationDelay: dm(delayMs, 880) } as CSSProperties}>
          <Spikes iron={p0} />
        </span>
        {[0, 1].map((i) => (
          <span key={`c${i}`} className="grp-c-pip absolute block rounded-full" style={{ ...sq(3 - 0.14 + i * 0.28, 5.62, 0.18), background: p0, border: `1px solid ${p2}`, "--gd": "0.8s", animationDelay: dm(delayMs, 980 + i * 70) } as CSSProperties} />
        ))}
        <Pips n={4} x={50} top={`calc(50% - var(--fx-side, 1) * 25% - 1.3%)`} fill={p1} rim={p2} delayMs={delayMs + 900} />
        {/* settle: turned earth sinks back */}
        <Flecks delayMs={delayMs + 1050} at={ranks(5.25, 1)} color={tint(p0, 0.8)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 420} anchored={anchored} />
    </Stage>
  );
}

/* --- lone_sovereign --------------------------------------------------------
   "For your opponent's next turn they may move only their king and their
   knights. Every other piece is stuck fast." Their king and both knights
   are lifted and show their moves (a king's step, two knights' jumps); every
   other piece on their side is pinned down with a stake. One pip. */
function Stake({ wood, band }: { wood: string; band: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M4 0.6 H6 V6.4 L5 9.4 L4 6.4 Z" fill={wood} stroke={band} strokeWidth="0.4" {...SJ} />
      <path d="M3.6 2.2 H6.4" stroke={band} strokeWidth="0.8" />
    </svg>
  );
}
function LoneSovereignScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Man kind="k" fill={p1} stroke={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const free: [number, number, "k" | "n"][] = [[4, 6, "k"], [1, 6, "n"], [6, 6, "n"]];
  const stuck: [number, number][] = [[0, 6], [2, 6], [3, 6], [5, 6], [7, 6], [3, 5]];
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 440}>
      <Frame anchored={anchored}>
        {/* tell: their king and knights are lifted */}
        <span className="grp-tellglow absolute block" style={{ ...ranks(6, 2), background: tint(p1, 0.2), animationDelay: dm(delayMs, 40) }} />
        {free.map(([c, r, kind], i) => (
          <span key={c} className="grp-c-up absolute block" style={{ ...sq(c, r), "--gd": "1.7s", animationDelay: dm(delayMs, 60 + i * 60) } as CSSProperties}>
            <Man kind={kind} fill={p1} stroke={p2} />
          </span>
        ))}
        {/* strike: every other piece is staked down */}
        {stuck.map(([c, r], i) => (
          <span key={`${c}${r}`} className="grp-c-stamp absolute block" style={{ ...sq(c, r, 0.62), "--gd": "1.2s", "--r0": "0deg", animationDelay: dm(delayMs, 400 + i * 40) } as CSSProperties}>
            <Stake wood={tint(p0, 0.95)} band={p2} />
          </span>
        ))}
        {/* the moves still open: a king's step and the knights' jumps */}
        <Ray at={sq(4, 6)} ang={90} len={1} verb="grp-c-draw" color={p1} delay={dm(delayMs, 640)} />
        <Ray at={sq(1, 6)} ang={63.4} len={2.24} verb="grp-c-draw" color={p1} delay={dm(delayMs, 700)} />
        <Ray at={sq(6, 6)} ang={116.6} len={2.24} verb="grp-c-draw" color={p1} delay={dm(delayMs, 760)} />
        <Pips n={1} x={50} top="calc(50% - 1.3%)" fill={p1} rim={p2} delayMs={delayMs + 900} />
        {/* settle: dust off the stakes */}
        <Flecks delayMs={delayMs + 1050} at={ranks(6, 2)} color={tint(p0, 0.8)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 440} anchored={anchored} />
    </Stage>
  );
}

/* --- peasant_levy ----------------------------------------------------------
   "For your opponent's next 2 turns they may move only pieces standing in
   their own half of the board. Anything already across the middle is
   stranded." A levy's pitchfork is planted on the halfway line and the
   opponent's half is called up; a piece at home still moves, while two of
   their pieces already over the line in the caster's half are roped where
   they stand. Two pips. */
function Pitchfork({ haft, tine }: { haft: string; tine: string }) {
  return (
    <svg viewBox="0 0 10 20" className="block h-full w-full" aria-hidden="true">
      <path d="M5 19.4 V6" stroke={haft} strokeWidth="1" strokeLinecap="round" />
      <path d="M2 1 V4.6 C2 6 8 6 8 4.6 V1 M5 1 V5.6" fill="none" stroke={tine} strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}
function PeasantLevyScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Pitchfork haft={p0} tine={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const stranded: [number, number, "n" | "b"][] = [[2, 2, "n"], [5, 3, "b"]];
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 380}>
      <Frame anchored={anchored}>
        {/* tell: the pitchfork is planted on the halfway line */}
        <span className="grp-c-up absolute block" style={{ left: "45%", top: "calc(50% - 16%)", width: "10%", height: "18%", "--gd": "1.9s", animationDelay: dm(delayMs, 40) } as CSSProperties}>
          <Pitchfork haft={p0} tine={p1} />
        </span>
        {/* their half is called up */}
        <span className="grp-c-in absolute block" style={{ ...ranks(5.5, 4), background: tint(p1, 0.14), "--s0": "1", "--gd": "1.7s", animationDelay: dm(delayMs, 160) } as CSSProperties} />
        {/* a piece at home still moves */}
        <Ray at={sq(6, 6)} ang={116.6} len={2.24} verb="grp-c-draw" color={p1} delay={dm(delayMs, 420)} />
        {/* strike: those already over the line are roped where they stand */}
        {stranded.map(([c, r, kind], i) => (
          <span key={c}>
            <span className="grp-c-stuck absolute block" style={{ ...sq(c, r), "--tx1": "0%", "--ty1": "calc(var(--fx-side, 1) * -22%)", "--gd": "1.4s", animationDelay: dm(delayMs, 380 + i * 80) } as CSSProperties}>
              <Man kind={kind} fill={tint(p1, 0.95)} stroke={p2} />
            </span>
            <span className="grp-c-stamp absolute block" style={{ ...sq(c, r - 0.3, 0.9), height: "3%", "--gd": "1.2s", "--r0": "0deg", animationDelay: dm(delayMs, 420 + i * 80) } as CSSProperties}>
              <svg viewBox="0 0 20 4" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
                <path d="M0 2 C4 0 6 4 10 2 C14 0 16 4 20 2" fill="none" stroke={p0} strokeWidth="1.2" />
              </svg>
            </span>
            <Ray at={sq(c, r)} ang={-90} len={2} keep={0.1} verb="grp-c-clip" color={p1} delay={dm(delayMs, 500 + i * 80)} />
          </span>
        ))}
        <Pips n={2} x={60} top="calc(50% - 1.3%)" fill={p1} rim={p2} delayMs={delayMs + 880} />
        {/* settle: straw drifts off the field */}
        <Flecks delayMs={delayMs + 1050} at={ranks(2.5, 2)} color={tint(p1, 0.75)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 400} anchored={anchored} />
    </Stage>
  );
}

/* --- throne_bound ----------------------------------------------------------
   "For your opponent's next 3 turns, her every move must end within 2
   squares of their king." A leash runs from their king to their queen, the
   five-by-five yard round the king is ruled off, and the queen's long move
   out of it is cut at the edge of the yard. Three pips. */
function ThroneBoundScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Man kind="q" fill={p1} stroke={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 520}>
      <Frame anchored={anchored}>
        {/* tell: their king and queen */}
        <span className="grp-c-in absolute block" style={{ ...sq(4, 6), "--gd": "1.9s", "--s0": "0.9", animationDelay: dm(delayMs, 40) } as CSSProperties}>
          <Man kind="k" fill={p1} stroke={p2} />
        </span>
        <span className="grp-c-in absolute block" style={{ ...sq(3, 5), "--gd": "1.9s", "--s0": "0.9", animationDelay: dm(delayMs, 100) } as CSSProperties}>
          <Man kind="q" fill={p1} stroke={p2} />
        </span>
        {/* the yard two squares round the king is ruled off */}
        <span className="grp-c-in absolute block" style={{ ...sq(4, 6, 5), border: `2px dashed ${p1}`, background: tint(p0, 0.12), "--s0": "1.2", "--gd": "1.7s", animationDelay: dm(delayMs, 200) } as CSSProperties} />
        {/* the leash, king to queen */}
        <Ray at={sq(4, 6)} ang={45 + 90} len={1.41} verb="grp-c-draw" color={p0} thick={5} delay={dm(delayMs, 320)} />
        {/* strike: her long move is cut at the yard's edge */}
        <Ray at={sq(3, 5)} ang={90} len={5} keep={1.5} verb="grp-c-clip" color={p1} delay={dm(delayMs, 480)} />
        <span className="grp-c-stamp absolute block" style={{ ...sq(3, 3.5, 0.5), "--gd": "1s", "--r0": "0deg", animationDelay: dm(delayMs, 700) } as CSSProperties}>
          <Strike ink={p1} />
        </span>
        <Pips n={3} x={50} top="calc(50% + var(--fx-side, 1) * 18% - 1.3%)" fill={p1} rim={p2} delayMs={delayMs + 860} />
        {/* settle: motes drift back toward the king */}
        <Flecks delayMs={delayMs + 1050} at={sq(4, 6, 2)} color={tint(p1, 0.8)} dir={-1} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 520} anchored={anchored} />
    </Stage>
  );
}

/* --- total_freeze ----------------------------------------------------------
   "After your opponent's next move, freeze every enemy piece except the king
   that stands on a square next to one of your pieces, for 1 turn." They make
   their move (an hourglass, then the move), then frost rings go out one
   square from each of the caster's forward pieces and every enemy piece
   inside a ring is iced; one farther away, and their king beside a ring,
   stay free. Target cut: an ice block on the square. */
const TF_MINE: [number, number][] = [[2, 4], [5, 3]];
const TF_ICED: [number, number, "p" | "n" | "b"][] = [[3, 5, "p"], [1, 5, "n"], [6, 4, "b"]];
function TotalFreezeScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<IceBlock ice={tint(p0, 0.7)} rim={p2} />} />;
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="grp-tellglow absolute block" style={{ left: "10%", top: "10%", width: "80%", height: "80%", background: tint(p1, 0.35), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-stamp absolute block" style={{ left: "10%", top: "8%", width: "80%", height: "84%", "--gd": "1s", "--r0": "0deg", animationDelay: dm(delayMs, 120) } as CSSProperties}>
          <IceBlock ice={tint(p0, 0.5)} rim={p2} />
        </span>
        <Flecks delayMs={delayMs + 480} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p1, 0.8)} n={3} />
      </span>
    );
  }
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 520}>
      <Frame anchored={anchored}>
        {/* tell: their move comes first */}
        <span className="grp-c-pip absolute block" style={{ ...sq(3.5, 6.8, 0.4), "--gd": "0.7s", animationDelay: dm(delayMs, 0) } as CSSProperties}>
          <Hourglass glass={p2} sand={p1} />
        </span>
        <Ray at={sq(7, 6)} ang={90} len={1} verb="grp-c-draw" color={tint(p2, 0.8)} delay={dm(delayMs, 160)} />
        {/* strike: frost rings go out one square round each of the caster's pieces */}
        {TF_MINE.map(([c, r], i) => (
          <span key={`${c}${r}`}>
            <span className="grp-c-in absolute block" style={{ ...sq(c, r), "--gd": "1.6s", "--s0": "0.9", animationDelay: dm(delayMs, 240 + i * 40) } as CSSProperties}>
              <Man kind="n" fill={p0} stroke={p2} />
            </span>
            <span className="grp-c-in absolute block" style={{ ...sq(c, r, 3), border: `2px solid ${tint(p2, 0.85)}`, "--s0": "0.34", "--gd": "1.3s", animationDelay: dm(delayMs, 420 + i * 60) } as CSSProperties} />
          </span>
        ))}
        {/* every enemy piece inside a ring is iced */}
        {TF_ICED.map(([c, r, kind], i) => (
          <span key={`i${c}${r}`}>
            <span className="grp-c-in absolute block" style={{ ...sq(c, r), "--gd": "1.4s", "--s0": "0.9", animationDelay: dm(delayMs, 300 + i * 40) } as CSSProperties}>
              <Man kind={kind} fill={tint(p1, 0.95)} stroke={p2} />
            </span>
            <span className="grp-c-stamp absolute block" style={{ ...sq(c, r, 0.94), "--gd": "1.1s", "--r0": "0deg", animationDelay: dm(delayMs, 560 + i * 60) } as CSSProperties}>
              <IceBlock ice={tint(p0, 0.5)} rim={p2} />
            </span>
          </span>
        ))}
        {/* their king beside a ring, and a piece out of reach, stay free */}
        <span className="grp-c-up absolute block" style={{ ...sq(4, 5), "--gd": "1.4s", animationDelay: dm(delayMs, 620) } as CSSProperties}>
          <Man kind="k" fill={p1} stroke={p2} />
        </span>
        <span className="grp-c-in absolute block" style={{ ...sq(0, 7), "--gd": "1.4s", "--s0": "0.9", animationDelay: dm(delayMs, 620) } as CSSProperties}>
          <Man kind="r" fill={p1} stroke={p2} />
        </span>
        <Pips n={1} x={50} top="calc(50% - 1.3%)" fill={p1} rim={p2} delayMs={delayMs + 880} />
        {/* settle: rime sifts down */}
        <Flecks delayMs={delayMs + 1050} at={ranks(4.5, 3)} color={tint(p1, 0.85)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 520} anchored={anchored} />
    </Stage>
  );
}

/* --- we_frostbite_curse ----------------------------------------------------
   "Your opponent's pieces go numb: for their next turn they cannot make any
   capture, and no piece may move more than 2 squares." Their rook's file and
   queen's diagonal are drawn and frost cuts each back to two squares, a notch
   marking the limit; a pawn's capture reaches its target and freezes short,
   taking nothing. One pip. */
function WeFrostbiteCurseScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Snowflake ice={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const limbs: { c: number; r: number; kind: "r" | "q"; ang: number; len: number; two: number }[] = [
    { c: 0, r: 6, kind: "r", ang: 90, len: 5, two: 2 },
    { c: 5, r: 6, kind: "q", ang: 135, len: 5, two: 2.83 },
  ];
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 460}>
      <Frame anchored={anchored}>
        {/* tell: numbing frost creeps over their side */}
        <span className="grp-tellglow absolute block" style={{ ...ranks(6, 3), background: tint(p1, 0.22), animationDelay: dm(delayMs, 40) }} />
        {limbs.map((l, i) => (
          <span key={l.c}>
            <span className="grp-c-in absolute block" style={{ ...sq(l.c, l.r), "--gd": "1.8s", "--s0": "0.9", animationDelay: dm(delayMs, 80 + i * 60) } as CSSProperties}>
              <Man kind={l.kind} fill={tint(p1, 0.95)} stroke={p2} />
            </span>
            {/* strike: the reach is cut back to two squares */}
            <Ray at={sq(l.c, l.r)} ang={l.ang} len={l.len} keep={l.two} verb="grp-c-clip" color={p2} delay={dm(delayMs, 300 + i * 90)} />
          </span>
        ))}
        {[
          [0, 4],
          [3, 4],
        ].map(([c, r], i) => (
          <span key={`n${c}`} className="grp-c-stamp absolute block" style={{ ...sq(c, r, 0.5), "--gd": "1.1s", "--r0": "0deg", animationDelay: dm(delayMs, 520 + i * 90) } as CSSProperties}>
            <Snowflake ice={p2} />
          </span>
        ))}
        {/* a capture reaches its target and freezes short */}
        <span className="grp-c-in absolute block" style={{ ...sq(6, 5), "--gd": "1.5s", "--s0": "0.9", animationDelay: dm(delayMs, 200) } as CSSProperties}>
          <Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        <Ray at={sq(6, 5)} ang={45} len={1.41} keep={0.7} verb="grp-c-clip" color={p1} delay={dm(delayMs, 560)} />
        <span className="grp-c-stamp absolute block" style={{ ...sq(6.5, 4.5, 0.4), "--gd": "1s", "--r0": "0deg", animationDelay: dm(delayMs, 760) } as CSSProperties}>
          <IceBlock ice={tint(p0, 0.6)} rim={p2} />
        </span>
        <Pips n={1} x={50} top="calc(50% - 1.3%)" fill={p1} rim={p2} delayMs={delayMs + 880} />
        {/* settle: frost motes sink */}
        <Flecks delayMs={delayMs + 1050} at={ranks(5, 3)} color={tint(p1, 0.85)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 460} anchored={anchored} />
    </Stage>
  );
}

/* --- scorched_middle -------------------------------------------------------
   "Your opponent cannot enter the 4th or 5th ranks for their next 3 turns,
   save one bridge: the square on their king's file, on whichever of the two
   ranks sits nearer their own side, stays passable." Fire runs along the two
   middle ranks, square by square, but skips one square on their king's file
   on the rank nearer them, where a bridge is laid; an enemy knight's jump
   into the fire is cut short. Three pips. */
function Flame({ fire, core }: { fire: string; core: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M5 0.8 C6.4 3 8.6 4.2 8.2 6.8 C7.8 9 6 9.6 5 9.6 C4 9.6 2.2 9 1.8 6.8 C1.6 5 3 4.4 3.4 2.8 C4 3.8 4.6 4.4 5 0.8 Z" fill={fire} />
      <path d="M5 4.8 C5.8 6 6.6 6.8 6.2 8 C5.8 9 4.2 9 3.8 8 C3.6 7 4.6 6.4 5 4.8 Z" fill={core} />
    </svg>
  );
}
function ScorchedMiddleScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Flame fire={p0} core={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  // the two middle ranks; the bridge is on their king's file (e), rank nearer them
  const cells: [number, number][] = [];
  for (const r of [3, 4]) for (let c = 0; c < 8; c++) if (!(c === 4 && r === 4)) cells.push([c, r]);
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 420}>
      <Frame anchored={anchored}>
        {/* tell: the two middle ranks darken */}
        <span className="grp-tellshadow absolute block" style={{ ...ranks(3.5, 2), background: tint(p2, 0.45), animationDelay: dm(delayMs, 40) }} />
        {/* strike: fire runs along them square by square */}
        {cells.map(([c, r]) => (
          <span key={`${c}${r}`} className="grp-c-up absolute block" style={{ ...sq(c, r, 0.7), "--gd": "1.5s", animationDelay: dm(delayMs, 260 + Math.abs(c - 3.5) * 40 + (r - 3) * 30) } as CSSProperties}>
            <Flame fire={tint(p0, 0.85)} core={p1} />
          </span>
        ))}
        {/* ...save the one bridge square */}
        <span className="grp-c-stamp absolute block" style={{ ...sq(4, 4, 0.9), height: "5%", marginTop: "3.1%", background: `repeating-linear-gradient(90deg, ${p1} 0 22%, ${p2} 22% 26%)`, "--gd": "1.5s", "--r0": "0deg", animationDelay: dm(delayMs, 460) } as CSSProperties} />
        {/* an enemy knight's jump into the fire is cut short */}
        <span className="grp-c-in absolute block" style={{ ...sq(1, 5), "--gd": "1.5s", "--s0": "0.9", animationDelay: dm(delayMs, 120) } as CSSProperties}>
          <Man kind="n" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        <Ray at={sq(1, 5)} ang={63.4} len={2.24} keep={0.8} verb="grp-c-clip" color={p1} delay={dm(delayMs, 520)} />
        <Pips n={3} x={50} top={`calc(50% - var(--fx-side, 1) * 25% - 1.3%)`} fill={p1} rim={p2} delayMs={delayMs + 880} />
        {/* settle: embers climb off the fire */}
        <Flecks delayMs={delayMs + 1050} at={ranks(3.5, 2)} color={tint(p1, 0.85)} dir={-1} n={6} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 420} anchored={anchored} />
    </Stage>
  );
}

/* --- we_firestorm ----------------------------------------------------------
   "After your opponent replies, a firestorm falls on the crossroads: every
   enemy piece except a king standing on the four center squares (d4, e4, d5,
   e5) is consumed." The four centre squares are marked while the opponent
   replies (an hourglass), then fire falls on exactly those four; the enemy
   pieces there burn away, and their king standing on one of them is left. */
function WeFirestormScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} from="above" motif={<Flame fire={p0} core={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const centre: [number, number, "p" | "n" | "b" | "k"][] = [[3, 3, "n"], [4, 3, "p"], [3, 4, "k"], [4, 4, "b"]];
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 560}>
      <Frame anchored={anchored}>
        {/* tell: the crossroads are marked while they reply */}
        <span className="grp-c-in absolute block" style={{ ...sq(3.5, 3.5, 2), border: `2px solid ${p1}`, background: tint(p0, 0.14), "--s0": "1.3", "--gd": "1.8s", animationDelay: dm(delayMs, 40) } as CSSProperties} />
        <span className="grp-c-pip absolute block" style={{ ...sq(3.5, 5.2, 0.45), "--gd": "0.7s", animationDelay: dm(delayMs, 120) } as CSSProperties}>
          <Hourglass glass={p1} sand={p0} />
        </span>
        {centre.map(([c, r, kind], i) => (
          <span key={`${c}${r}`} className="grp-c-in absolute block" style={{ ...sq(c, r), "--gd": kind === "k" ? "1.9s" : "0.8s", "--s0": "0.9", animationDelay: dm(delayMs, 160 + i * 30) } as CSSProperties}>
            <Man kind={kind} fill={tint(p1, 0.95)} stroke={p2} />
          </span>
        ))}
        {/* strike: fire falls on exactly those four */}
        {centre.map(([c, r], i) => (
          <span key={`b${c}${r}`} className="grp-bolt absolute block" style={{ left: `${c * 12.5 + 3}%`, top: `calc(50% + var(--fx-side, 1) * ${(3.5 - r) * 12.5}% - 30%)`, width: "6.5%", height: "30%", background: `linear-gradient(180deg, ${tint(p0, 0)}, ${p0})`, animationDelay: dm(delayMs, 500 + i * 50) }} />
        ))}
        {/* the enemy pieces there burn away; the king stands */}
        {centre
          .filter(([, , k]) => k !== "k")
          .map(([c, r], i) => (
            <span key={`f${c}${r}`} className="grp-c-blast absolute block" style={{ ...sq(c, r, 0.8), "--tx1": "0%", "--ty1": "calc(var(--fx-side, 1) * -60%)", "--gd": "0.9s", animationDelay: dm(delayMs, 580 + i * 50) } as CSSProperties}>
              <Flame fire={p0} core={p1} />
            </span>
          ))}
        {/* settle: ash climbs off the crossroads */}
        <Flecks delayMs={delayMs + 1050} at={sq(3.5, 3.5, 2)} color={tint(p1, 0.85)} dir={-1} n={6} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 560} anchored={anchored} />
    </Stage>
  );
}

/* --- wc_confetti_cannon ----------------------------------------------------
   "Your next capture goes off like a confetti cannon: every enemy piece other
   than a king within one square of the captured square is blown off the
   board." A party cannon on the caster's side fires down the capture, the
   capture lands, confetti bursts into the eight squares round it, and every
   enemy piece among them is blown off except their king, who stands in the
   streamers. */
function PartyCannon({ barrel, band }: { barrel: string; band: string }) {
  return (
    <svg viewBox="0 0 12 10" className="block h-full w-full" aria-hidden="true">
      <path d="M1 7 L9 2 L11 5 L3 9.4 Z" fill={barrel} stroke={band} strokeWidth="0.5" {...SJ} />
      <path d="M4 5.2 L5.4 7.6 M6.4 3.6 L7.8 6" stroke={band} strokeWidth="0.8" />
      <circle cx="3" cy="9" r="0.9" fill={band} />
    </svg>
  );
}
const CONFETTI = ["#ff9d3d", "#ffd76a", "#8fd1ff", "#c94ad1", "#8faf4a"];
function WcConfettiCannonScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<PartyCannon barrel={p0} band={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const c = 4;
  const r = 5;
  const near: [number, number, "p" | "n" | "b" | "k"][] = [[-1, 0, "p"], [1, 1, "n"], [0, 1, "k"], [1, -1, "b"]];
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 460}>
      <Frame anchored={anchored}>
        {/* tell: the cannon on the caster's side, aimed down the capture */}
        <span className="grp-c-in absolute block" style={{ ...sq(1.2, 1.2, 1.3), "--gd": "1.3s", "--s0": "0.7", animationDelay: dm(delayMs, 40) } as CSSProperties}>
          <PartyCannon barrel={p0} band={p1} />
        </span>
        <Ray at={sq(1.6, 1.6)} ang={-50} len={4.9} verb="grp-c-draw" color={tint(p1, 0.9)} delay={dm(delayMs, 220)} />
        {near.map(([dx, dy, kind], i) => (
          <span key={kind} className="grp-c-in absolute block" style={{ ...sq(c + dx, r + dy), "--gd": kind === "k" ? "1.9s" : "0.66s", "--s0": "0.9", animationDelay: dm(delayMs, 100 + i * 30) } as CSSProperties}>
            <Man kind={kind} fill={tint(p1, 0.95)} stroke={p2} />
          </span>
        ))}
        {/* strike: the capture lands and confetti bursts round it */}
        <span className="grp-flash absolute block rounded-full" style={{ ...sq(c, r, 1.2), background: tint(p1, 0.6), animationDelay: dm(delayMs, 440) }} />
        {RING8.map(([dx, dy], i) => (
          <span key={i} className="grp-c-blast absolute block" style={{ ...sq(c + dx * 0.5, r - dy * 0.5, 0.3), background: CONFETTI[i % CONFETTI.length], "--tx1": `${dx * 360}%`, "--ty1": `calc(var(--fx-side, 1) * ${dy * 360}%)`, "--gd": "0.9s", animationDelay: dm(delayMs, 460 + i * 15) } as CSSProperties} />
        ))}
        {/* every enemy piece round it is blown off, except their king */}
        {near
          .filter(([, , k]) => k !== "k")
          .map(([dx, dy, kind], i) => (
            <span key={`o${dx}${dy}`} className="grp-c-part absolute block" style={{ ...sq(c + dx, r + dy), "--tx1": `${dx * 160}%`, "--ty1": `calc(var(--fx-side, 1) * ${-dy * 160}%)`, "--r1": `${(i % 2 ? 1 : -1) * 120}deg`, "--gd": "0.8s", animationDelay: dm(delayMs, 520 + i * 30) } as CSSProperties}>
              <Man kind={kind} fill={tint(p1, 0.95)} stroke={p2} />
            </span>
          ))}
        <span className="grp-c-stamp absolute block" style={{ ...sq(c, r + 1, 1.1), "--gd": "1.1s", "--r0": "0deg", animationDelay: dm(delayMs, 640) } as CSSProperties}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M1 2 C3 4 2 6 4 8 M9 2 C7 4 8 6 6 8" fill="none" stroke={CONFETTI[2]} strokeWidth="0.6" strokeLinecap="round" />
          </svg>
        </span>
        {/* settle: confetti drifts down */}
        <Flecks delayMs={delayMs + 1000} at={sq(c, r, 3)} color={CONFETTI[1]} n={6} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 460} anchored={anchored} />
    </Stage>
  );
}

/* --- medusas_verdict -------------------------------------------------------
   "After your opponent's next move, their queen turns to a walnut for 4 of
   their turns, and every enemy piece then standing next to her is frozen for
   1 of their turns." An hourglass while they move; then the gorgon's two
   eyes open over their queen, her gaze lands, the queen shuts into a walnut
   and the enemy pieces beside her are iced for a turn. Four pips. Target
   cut: a walnut closes on the square. */
function GorgonEye({ white, iris }: { white: string; iris: string }) {
  return (
    <svg viewBox="0 0 12 6" className="block h-full w-full" aria-hidden="true">
      <path d="M0.6 3 C3 0 9 0 11.4 3 C9 6 3 6 0.6 3 Z" fill={white} stroke={iris} strokeWidth="0.5" />
      <ellipse cx="6" cy="3" rx="0.8" ry="2" fill={iris} />
    </svg>
  );
}
function MedusasVerdictScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<GorgonEye white={p0} iris={p1} />} />;
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="grp-tellglow absolute block rounded-full" style={{ left: "14%", top: "14%", width: "72%", height: "72%", background: tint(p1, 0.4), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-stamp absolute block" style={{ left: "16%", top: "16%", width: "68%", height: "68%", "--gd": "1.1s", "--r0": "0deg", animationDelay: dm(delayMs, 140) } as CSSProperties}>
          <Walnut shell={p0} seam={p2} />
        </span>
        <Flecks delayMs={delayMs + 500} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p0, 0.8)} n={3} />
      </span>
    );
  }
  const queen = sq(3, 5);
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 560}>
      <Frame anchored={anchored}>
        {/* tell: they move first */}
        <span className="grp-c-pip absolute block" style={{ ...sq(1, 5, 0.42), "--gd": "0.7s", animationDelay: dm(delayMs, 0) } as CSSProperties}>
          <Hourglass glass={p1} sand={p0} />
        </span>
        <span className="grp-c-in absolute block" style={{ ...queen, "--gd": "0.75s", "--s0": "0.9", animationDelay: dm(delayMs, 60) } as CSSProperties}>
          <Man kind="q" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        {/* the gorgon's eyes open over her */}
        {[-1, 1].map((s) => (
          <span key={s} className="grp-c-in absolute block" style={{ ...sq(3 + s * 0.55, 3.2, 0.9), height: "5.6%", "--s0": "0.2", "--gd": "1.4s", animationDelay: dm(delayMs, 300) } as CSSProperties}>
            <GorgonEye white={tint(p0, 0.95)} iris={p1} />
          </span>
        ))}
        {/* strike: the gaze lands and she shuts into a walnut */}
        <Ray at={sq(3, 3.2)} ang={-90} len={1.6} verb="grp-c-draw" color={p1} thick={10} delay={dm(delayMs, 440)} />
        <span className="grp-c-stamp absolute block" style={{ ...sq(3, 5, 0.9), "--gd": "1.3s", "--r0": "0deg", animationDelay: dm(delayMs, 560) } as CSSProperties}>
          <Walnut shell={p0} seam={p2} />
        </span>
        {/* the pieces beside her are iced for a turn */}
        {[
          [2, 5],
          [4, 6],
        ].map(([c, r], i) => (
          <span key={c}>
            <span className="grp-c-in absolute block" style={{ ...sq(c, r), "--gd": "1.5s", "--s0": "0.9", animationDelay: dm(delayMs, 200 + i * 40) } as CSSProperties}>
              <Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />
            </span>
            <span className="grp-c-stamp absolute block" style={{ ...sq(c, r, 0.9), "--gd": "1s", "--r0": "0deg", animationDelay: dm(delayMs, 700 + i * 70) } as CSSProperties}>
              <IceBlock ice={tint("#bfe6ff", 0.45)} rim={p2} />
            </span>
          </span>
        ))}
        <Pips n={4} x={37.5} top={`calc(50% - var(--fx-side, 1) * 12.5% - 1.3%)`} fill={p1} rim={p2} delayMs={delayMs + 880} />
        {/* settle: stone dust sinks */}
        <Flecks delayMs={delayMs + 1050} at={sq(3, 5, 1.6)} color={tint(p0, 0.8)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 560} anchored={anchored} />
    </Stage>
  );
}

/* --- double_queen ----------------------------------------------------------
   "Choose any one of your pawns, even mid-board; after your opponent's next
   move it promotes to a queen, unless it has moved or been lost." The
   caster's queen casts her double: a copy of her leaves her square and glides
   to the chosen pawn, and waits over it (an hourglass) while the opponent
   moves; then it settles and the pawn stands up a queen. */
function DoubleQueenScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} from="above" motif={<Man kind="q" fill={p0} stroke={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 760}>
      <Frame anchored={anchored}>
        {/* tell: the chosen pawn, and the caster's queen at home */}
        <span className="grp-c-in absolute block" style={{ ...cell(0, 0, 0.9), "--gd": "1s", "--s0": "0.9", animationDelay: dm(delayMs, 0) } as CSSProperties}>
          <Man kind="p" fill={p1} stroke={p2} />
        </span>
        <span className="grp-tellglow absolute block rounded-full" style={{ ...sq(3, 0, 1.3), background: tint(p0, 0.45), animationDelay: dm(delayMs, 60) }} />
        {/* her double leaves her square and glides to the pawn */}
        <span
          className="grp-c-go absolute block"
          style={{ ...cell(0, 0), "--tx0": "calc((-0.5 - var(--fx-ox, 0)) * 100%)", "--ty0": "calc((var(--fx-side, 1) * 3.5 - var(--fx-oy, 0)) * 100%)", "--gd": "0.7s", animationDelay: dm(delayMs, 200) } as CSSProperties}
        >
          <Man kind="q" fill={tint(p0, 0.55)} stroke={p0} />
        </span>
        {/* it waits over the pawn while the opponent moves */}
        <span className="grp-c-in absolute block" style={{ ...cell(0, 0, 0.9), "--gd": "0.6s", "--s0": "1", animationDelay: dm(delayMs, 540) } as CSSProperties}>
          <Man kind="q" fill={tint(p0, 0.5)} stroke={p0} />
        </span>
        <span className="grp-c-pip absolute block" style={{ ...cell(0.5, -0.5, 0.36), "--gd": "0.8s", animationDelay: dm(delayMs, 520) } as CSSProperties}>
          <Hourglass glass={p0} sand={p1} />
        </span>
        {/* strike: it settles, and the pawn stands up a queen */}
        <span className="grp-flash absolute block rounded-full" style={{ ...cell(0, 0, 1.3), background: tint(p0, 0.55), animationDelay: dm(delayMs, 760) }} />
        <span className="grp-c-up absolute block" style={{ ...cell(0, 0), "--gd": "1.2s", animationDelay: dm(delayMs, 780) } as CSSProperties}>
          <Man kind="q" fill={p0} stroke={p2} />
        </span>
        {/* settle: gold motes climb off her */}
        <Flecks delayMs={delayMs + 1050} at={cell(0, 0, 1.4)} color={tint(p1, 0.85)} dir={-1} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p0, 0.7)} delayMs={delayMs + 760} anchored={anchored} />
    </Stage>
  );
}

/* --- ghost_legion ----------------------------------------------------------
   "All your pawns may jump over a blocker one square ahead, landing two ahead
   where empty, for 2 turns. The jump is use-it-or-lose-it." Blockers stand
   in front of three of the caster's pawns; each pawn goes pale and passes
   up through its blocker to land two squares on, while a pawn whose landing
   square is taken stays put. Two pips. */
function GhostLegionScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Man kind="p" fill={tint(p1, 0.6)} stroke={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const jumps = [1, 3, 6];
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 620}>
      <Frame anchored={anchored}>
        {/* tell: the blockers in front of the pawns */}
        {[...jumps, 4].map((c, i) => (
          <span key={`b${c}`} className="grp-c-in absolute block" style={{ ...sq(c, 3), "--gd": "1.8s", "--s0": "0.9", animationDelay: dm(delayMs, 40 + i * 40) } as CSSProperties}>
            <Man kind={i % 2 ? "n" : "b"} fill={tint(p2, 0.9)} stroke={p1} />
          </span>
        ))}
        <span className="grp-c-in absolute block" style={{ ...sq(4, 4), "--gd": "1.8s", "--s0": "0.9", animationDelay: dm(delayMs, 200) } as CSSProperties}>
          <Man kind="p" fill={tint(p2, 0.9)} stroke={p1} />
        </span>
        {/* strike: each pawn goes pale and passes up through its blocker */}
        {jumps.map((c, i) => (
          <span key={c} className="grp-c-go absolute block" style={{ ...sq(c, 4), "--ty0": "calc(var(--fx-side, 1) * 200%)", "--gd": "0.8s", animationDelay: dm(delayMs, 400 + i * 80) } as CSSProperties}>
            <Man kind="p" fill={tint(p1, 0.5)} stroke={p1} />
          </span>
        ))}
        {jumps.map((c, i) => (
          <span key={`l${c}`} className="grp-c-up absolute block" style={{ ...sq(c, 4), "--gd": "1.1s", animationDelay: dm(delayMs, 900 + i * 60) } as CSSProperties}>
            <Man kind="p" fill={p1} stroke={p2} />
          </span>
        ))}
        {/* the one whose landing square is taken stays */}
        <span className="grp-c-stuck absolute block" style={{ ...sq(4, 2), "--tx1": "0%", "--ty1": "calc(var(--fx-side, 1) * -24%)", "--gd": "1.2s", animationDelay: dm(delayMs, 520) } as CSSProperties}>
          <Man kind="p" fill={p1} stroke={p2} />
        </span>
        <Pips n={2} x={50} top="calc(50% + var(--fx-side, 1) * 31% - 1.3%)" fill={p1} rim={p2} delayMs={delayMs + 960} />
        {/* settle: pale wisps rise off the landings */}
        <Flecks delayMs={delayMs + 1050} at={ranks(4, 1)} color={tint(p1, 0.7)} dir={-1} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 620} anchored={anchored} />
    </Stage>
  );
}

/* --- gossamer_veil ---------------------------------------------------------
   "Your pieces cannot be captured by enemy bishops, rooks, or queens for your
   opponent's next 2 turns. Pawns, knights, and kings still cut through." A
   web of silk is strung over the caster's half; an enemy rook's file and a
   bishop's diagonal run into it and are caught in the threads; an enemy
   knight jumps straight through and the silk tears where it lands. Two
   pips. Target cut: a web strung over the square. */
function Web({ silk }: { silk: string }) {
  return (
    <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
      {[0, 45, 90, 135].map((a) => (
        <path key={a} d="M10 0.6 V19.4" stroke={silk} strokeWidth="0.35" transform={`rotate(${a} 10 10)`} />
      ))}
      {[3, 6, 9].map((r) => (
        <polygon key={r} points={Array.from({ length: 8 }, (_, k) => `${10 + r * Math.cos((k * Math.PI) / 4)},${10 + r * Math.sin((k * Math.PI) / 4)}`).join(" ")} fill="none" stroke={silk} strokeWidth="0.3" />
      ))}
    </svg>
  );
}
function GossamerVeilScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Web silk={p1} />} />;
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="grp-tellglow absolute block rounded-full" style={{ left: "14%", top: "14%", width: "72%", height: "72%", background: tint(p0, 0.35), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-in absolute block" style={{ left: "4%", top: "4%", width: "92%", height: "92%", "--s0": "0.4", "--gd": "1.3s", animationDelay: dm(delayMs, 120) } as CSSProperties}>
          <Web silk={p1} />
        </span>
        <Flecks delayMs={delayMs + 520} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p1, 0.8)} n={3} />
      </span>
    );
  }
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 560}>
      <Frame anchored={anchored}>
        {/* tell: the silk is strung across the caster's half */}
        <span className="grp-c-in absolute block" style={{ ...ranks(1.5, 4), background: tint(p0, 0.12), "--s0": "1", "--gd": "1.9s", animationDelay: dm(delayMs, 40) } as CSSProperties} />
        {[1, 4, 6.5].map((c, i) => (
          <span key={c} className="grp-c-in absolute block" style={{ ...sq(c, 2, 3), "--s0": "0.3", "--r0": `${i * 20}deg`, "--gd": "1.8s", animationDelay: dm(delayMs, 100 + i * 80) } as CSSProperties}>
            <Web silk={tint(p1, 0.85)} />
          </span>
        ))}
        {/* strike: the long blades are caught in the threads */}
        <span className="grp-c-in absolute block" style={{ ...sq(1, 7), "--gd": "1.6s", "--s0": "0.9", animationDelay: dm(delayMs, 200) } as CSSProperties}>
          <Man kind="r" fill={tint(p2, 0.9)} stroke={p1} />
        </span>
        <Ray at={sq(1, 7)} ang={90} len={6} keep={3.4} verb="grp-c-clip" color={p1} delay={dm(delayMs, 360)} />
        <span className="grp-c-in absolute block" style={{ ...sq(7, 6), "--gd": "1.6s", "--s0": "0.9", animationDelay: dm(delayMs, 240) } as CSSProperties}>
          <Man kind="b" fill={tint(p2, 0.9)} stroke={p1} />
        </span>
        <Ray at={sq(7, 6)} ang={135} len={5.6} keep={3.3} verb="grp-c-clip" color={p1} delay={dm(delayMs, 420)} />
        {/* a knight jumps straight through, and the silk tears there */}
        <span className="grp-c-go absolute block" style={{ ...sq(3, 3), "--tx0": "-100%", "--ty0": "calc(var(--fx-side, 1) * -200%)", "--gd": "0.7s", animationDelay: dm(delayMs, 560) } as CSSProperties}>
          <Man kind="n" fill={tint(p2, 0.9)} stroke={p1} />
        </span>
        {[-1, 1].map((s) => (
          <span key={s} className="grp-c-part absolute block" style={{ ...sq(3 + s * 0.25, 3, 0.5), "--tx1": `${s * 80}%`, "--ty1": "80%", "--r1": `${s * 40}deg`, "--gd": "0.7s", animationDelay: dm(delayMs, 900) } as CSSProperties}>
            <Web silk={p1} />
          </span>
        ))}
        <Pips n={2} x={50} top="calc(50% + var(--fx-side, 1) * 6% - 1.3%)" fill={p1} rim={p2} delayMs={delayMs + 900} />
        {/* settle: silk threads drift down */}
        <Flecks delayMs={delayMs + 1050} at={ranks(2, 3)} color={tint(p1, 0.8)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 560} anchored={anchored} />
    </Stage>
  );
}

/* --- granite_ramparts ------------------------------------------------------
   "Your opponent's rooks turn to walnuts for 2 of their turns, and for their
   next 2 turns they cannot move any piece onto their own back two ranks."
   Both enemy rooks close into walnuts; a granite rampart rises along the
   front of their back two ranks, and two of their pieces trying to fall back
   behind it are stopped at the wall. Two pips. Target cut: a rook walnut. */
const GRANITE_BACK: { col: number; rank: number; kind: "b" | "r"; ang: number; len: number; keep: number }[] = [
  { col: 2, rank: 4, kind: "b", ang: -135, len: 2.83, keep: 2 },
  { col: 5, rank: 3, kind: "r", ang: -90, len: 4, keep: 2.4 },
];
function GraniteRampartsScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Walnut shell={p0} seam={p2} />} />;
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="grp-tellshadow absolute block rounded-full" style={{ left: "14%", top: "60%", width: "72%", height: "28%", background: tint(p2, 0.5), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-stamp absolute block" style={{ left: "16%", top: "14%", width: "68%", height: "68%", "--gd": "1.1s", "--r0": "0deg", animationDelay: dm(delayMs, 140) } as CSSProperties}>
          <Walnut shell={p0} seam={p2} />
        </span>
        <Flecks delayMs={delayMs + 500} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p0, 0.8)} n={3} />
      </span>
    );
  }
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 420}>
      <Frame anchored={anchored}>
        {/* tell: their rooks */}
        {[0, 7].map((c, i) => (
          <span key={c} className="grp-c-in absolute block" style={{ ...sq(c, 6), "--gd": "0.6s", "--s0": "0.9", animationDelay: dm(delayMs, 40 + i * 50) } as CSSProperties}>
            <Man kind="r" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
        ))}
        {/* strike: both shut into walnuts */}
        {[0, 7].map((c, i) => (
          <span key={`w${c}`} className="grp-c-stamp absolute block" style={{ ...sq(c, 6, 0.9), "--gd": "1.5s", "--r0": "0deg", animationDelay: dm(delayMs, 380 + i * 60) } as CSSProperties}>
            <Walnut shell={p0} seam={p2} />
          </span>
        ))}
        {/* the rampart rises along the front of their back two ranks */}
        <span className="grp-c-up absolute block" style={{ left: "0%", top: "calc(50% - var(--fx-side, 1) * 25% - 2.5%)", width: "100%", height: "5%", "--gd": "1.6s", animationDelay: dm(delayMs, 460) } as CSSProperties}>
          <svg viewBox="0 0 40 4" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <rect x="0" y="0.4" width="40" height="3.4" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="0.3" />
            {Array.from({ length: 10 }, (_, k) => (
              <path key={k} d={`M${k * 4 + 2} 0.4 V3.8`} stroke={p2} strokeWidth="0.3" />
            ))}
          </svg>
        </span>
        {/* pieces falling back are stopped at the wall */}
        {GRANITE_BACK.map((g, i) => (
          <span key={g.col}>
            <span className="grp-c-in absolute block" style={{ ...sq(g.col, g.rank), "--gd": "1.5s", "--s0": "0.9", animationDelay: dm(delayMs, 300 + i * 40) } as CSSProperties}>
              <Man kind={g.kind} fill={tint(p1, 0.95)} stroke={p2} />
            </span>
            <Ray at={sq(g.col, g.rank)} ang={g.ang} len={g.len} keep={g.keep} verb="grp-c-clip" color={p1} delay={dm(delayMs, 620 + i * 80)} />
          </span>
        ))}
        <Pips n={2} x={50} top="calc(50% - 1.3%)" fill={p1} rim={p2} delayMs={delayMs + 900} />
        {/* settle: granite grit sinks */}
        <Flecks delayMs={delayMs + 1050} at={ranks(5.5, 1)} color={tint(p0, 0.8)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 420} anchored={anchored} />
    </Stage>
  );
}

/* --- ironclad --------------------------------------------------------------
   "Every piece on your back two ranks, your king aside, cannot be captured
   for 2 turns." Iron plate is laid over the caster's back two ranks, square
   by square, riveted down, except on the king's square, which is left bare;
   an enemy capture into the plating strikes sparks and does not go in. Two
   pips. Target cut: a riveted plate on the square. */
function Plate({ iron, rivet }: { iron: string; rivet: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <rect x="0.8" y="0.8" width="8.4" height="8.4" rx="0.8" fill={iron} stroke={rivet} strokeWidth="0.5" />
      {[[2, 2], [8, 2], [2, 8], [8, 8]].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="0.6" fill={rivet} />
      ))}
    </svg>
  );
}
function IroncladScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} from="above" motif={<Plate iron={p0} rivet={p2} />} />;
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="grp-tellglow absolute block" style={{ left: "10%", top: "10%", width: "80%", height: "80%", background: tint(p1, 0.3), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-stamp absolute block" style={{ left: "8%", top: "8%", width: "84%", height: "84%", "--gd": "1.1s", "--r0": "0deg", animationDelay: dm(delayMs, 120) } as CSSProperties}>
          <Plate iron={tint(p0, 0.5)} rivet={p2} />
        </span>
        <Flecks delayMs={delayMs + 480} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p1, 0.8)} n={3} />
      </span>
    );
  }
  const plates: [number, number][] = [];
  for (const r of [0, 1]) for (let c = 0; c < 8; c++) if (!(c === 4 && r === 0)) plates.push([c, r]);
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 460}>
      <Frame anchored={anchored}>
        {/* tell: the back two ranks are marked out */}
        <span className="grp-tellglow absolute block" style={{ ...ranks(0.5, 2), background: tint(p1, 0.25), animationDelay: dm(delayMs, 40) }} />
        {/* strike: plate is riveted over each square but the king's */}
        {plates.map(([c, r]) => (
          <span key={`${c}${r}`} className="grp-c-stamp absolute block" style={{ ...sq(c, r, 0.94), "--gd": "1.4s", "--r0": "0deg", animationDelay: dm(delayMs, 200 + c * 40 + r * 60) } as CSSProperties}>
            <Plate iron={tint(p0, 0.45)} rivet={p2} />
          </span>
        ))}
        <span className="grp-c-in absolute block" style={{ ...sq(4, 0, 1.02), border: `2px dashed ${tint(p1, 0.8)}`, "--s0": "1", "--gd": "1.3s", animationDelay: dm(delayMs, 420) } as CSSProperties} />
        {/* an enemy capture into the plating strikes sparks, and stops */}
        <Ray at={sq(6, 4)} ang={135} len={2.83} keep={2.2} verb="grp-c-clip" color={p1} delay={dm(delayMs, 640)} />
        {[0, 1, 2].map((i) => (
          <span key={i} className="grp-c-blast absolute block" style={{ ...sq(4.4, 2.4, 0.2), background: p1, "--tx1": `${(i - 1) * 180}%`, "--ty1": "calc(var(--fx-side, 1) * -200%)", "--gd": "0.6s", animationDelay: dm(delayMs, 860 + i * 20) } as CSSProperties} />
        ))}
        <Pips n={2} x={50} top="calc(50% + var(--fx-side, 1) * 20% - 1.3%)" fill={p1} rim={p2} delayMs={delayMs + 900} />
        {/* settle: iron filings sink */}
        <Flecks delayMs={delayMs + 1050} at={ranks(0.5, 2)} color={tint(p0, 0.8)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 460} anchored={anchored} />
    </Stage>
  );
}

/* --- mass_promote_minor ----------------------------------------------------
   "Two pawns on your 4th rank or beyond become knights instantly. Using it
   spends your next unused reroll, if any." The caster's fourth-rank line is
   drawn; the two chosen pawns past it each take a horse's head and stand up
   knights, and the reroll die at the caster's edge cracks. */
function MassPromoteMinorScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Man kind="n" fill={p1} stroke={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const pair: CSSProperties[] = [cell(0, 0), AIMED];
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 440}>
      <Frame anchored={anchored}>
        {/* tell: the fourth-rank line */}
        <span className="grp-tellglow absolute block" style={{ ...cell(0, 0, 1.3), background: tint(p1, 0.35), animationDelay: dm(delayMs, 60) }} />
        <span className="absolute block" style={{ left: "0%", top: "calc(50% + var(--fx-side, 1) * 12.5% - 0.5%)", width: "100%", height: "1%" }}>
          <span className="grp-c-draw absolute inset-0 block" style={{ background: p1, "--gd": "1.8s", animationDelay: dm(delayMs, 0) } as CSSProperties} />
        </span>
        {pair.map((at, i) => (
          <span key={i}>
            <span className="grp-c-in absolute block" style={{ ...at, "--gd": "0.6s", "--s0": "0.9", animationDelay: dm(delayMs, 80 + i * 60) } as CSSProperties}>
              <Man kind="p" fill={p1} stroke={p2} />
            </span>
            {/* strike: a horse's head, and a knight stands up */}
            <span className="grp-flash absolute block rounded-full" style={{ ...at, background: tint(p1, 0.5), animationDelay: dm(delayMs, 420 + i * 90) }} />
            <span className="grp-c-up absolute block" style={{ ...at, "--gd": "1.3s", animationDelay: dm(delayMs, 440 + i * 90) } as CSSProperties}>
              <Man kind="n" fill={p1} stroke={p0} />
            </span>
          </span>
        ))}
        {/* the price: the reroll die cracks */}
        {[-1, 1].map((s) => (
          <span key={s} className="grp-c-part absolute block" style={{ ...sq(3.5 + s * 0.16, 0.6, 0.32), "--tx1": `${s * 90}%`, "--ty1": "60%", "--r1": `${s * 30}deg`, "--gd": "0.7s", animationDelay: dm(delayMs, 860) } as CSSProperties}>
            <Die fill={p1} pip={p2} />
          </span>
        ))}
        {/* settle: motes climb off the new knights */}
        <Flecks delayMs={delayMs + 1050} at={cell(0, 0, 1.4)} color={tint(p1, 0.85)} dir={-1} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 440} anchored={anchored} />
    </Stage>
  );
}

/* --- mind_dominion ---------------------------------------------------------
   "Take control of one enemy rook or bishop for the game." A puppeteer's
   cross-bar lowers over the chosen piece and its strings drop onto it; the
   piece jerks, its colour turns over to the caster's, and its first line
   now runs back toward its old army. */
function MindDominionScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  const bar = (
    <svg viewBox="0 0 12 6" className="block h-full w-full" aria-hidden="true">
      <path d="M1 3 H11 M6 0.6 V5.4" stroke={p1} strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} from="above" motif={bar} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 540}>
      <Frame anchored={anchored}>
        {/* tell: the cross-bar lowers over the piece */}
        <span className="grp-c-in absolute block" style={{ ...cell(0, -1.4, 1.1), height: "6%", "--ty0": "-200%", "--s0": "1", "--gd": "1.8s", animationDelay: dm(delayMs, 0) } as CSSProperties}>
          {bar}
        </span>
        <span className="grp-c-in absolute block" style={{ ...cell(0, 0, 0.9), "--gd": "0.75s", "--s0": "0.9", animationDelay: dm(delayMs, 40) } as CSSProperties}>
          <Man kind="r" fill={tint(p2, 0.9)} stroke={p1} />
        </span>
        {/* its strings drop onto the piece */}
        {[-0.3, 0.3].map((dx, i) => (
          <span key={dx} className="absolute block" style={{ ...cell(dx, -1.25, 0.04), height: "13%", transformOrigin: "50% 0%" }}>
            <span className="grp-c-in absolute inset-0 block" style={{ background: p1, "--s0": "0.1", "--gd": "1.5s", animationDelay: dm(delayMs, 240 + i * 60) } as CSSProperties} />
          </span>
        ))}
        {/* strike: it jerks and its colour turns over */}
        <span className="grp-yank absolute block" style={{ ...cell(0, 0, 0.9), animationDelay: dm(delayMs, 520) }}>
          <Man kind="r" fill={p1} stroke={p2} />
        </span>
        <span className="grp-c-up absolute block" style={{ ...cell(0, 0, 0.9), "--gd": "1s", animationDelay: dm(delayMs, 900) } as CSSProperties}>
          <Man kind="r" fill={p1} stroke={p0} />
        </span>
        {/* its line now runs back at its old army */}
        <Ray at={cell(0, 0)} ang={-90} len={2.4} verb="grp-c-draw" color={p1} delay={dm(delayMs, 980)} />
        {/* settle: motes rise along the strings */}
        <Flecks delayMs={delayMs + 1100} at={cell(0, -0.6, 1.2)} color={tint(p1, 0.8)} dir={-1} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 540} anchored={anchored} />
    </Stage>
  );
}

/* --- mirror_of_souls -------------------------------------------------------
   "Name one of your pieces and an enemy piece of the same kind. After your
   opponent's next move, they trade places. Kings cast no reflection." A tall
   glass stands between the two named knights; an hourglass while the
   opponent moves; then each knight passes through the glass to the other's
   square, and the glass goes dark. */
function MirrorOfSoulsScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  const glass = (
    <svg viewBox="0 0 8 14" className="block h-full w-full" aria-hidden="true">
      <path d="M1 13 V4 A3 3 0 0 1 7 4 V13 Z" fill={tint(p1, 0.35)} stroke={p0} strokeWidth="0.7" />
      <path d="M2.4 5 L4 3.4" stroke={p1} strokeWidth="0.5" strokeLinecap="round" />
    </svg>
  );
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={glass} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const half = { left: "calc(50% + (var(--fx-ox, 0) + var(--fx-aim-x, 0) * var(--fx-len, 0) / 2 - 0.4) * 12.5%)", top: "calc(50% + (var(--fx-oy, 0) + var(--fx-aim-y, 0) * var(--fx-len, 0) / 2 - 0.7) * 12.5%)", width: "10%", height: "17.5%" };
  const toAim = { "--tx1": "calc(var(--fx-aim-x, 0) * var(--fx-len, 0) * 100%)", "--ty1": "calc(var(--fx-aim-y, 0) * var(--fx-len, 0) * 100%)" };
  const toCast = { "--tx0": "calc(var(--fx-aim-x, 0) * var(--fx-len, 0) * 100%)", "--ty0": "calc(var(--fx-aim-y, 0) * var(--fx-len, 0) * 100%)" };
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 620}>
      <Frame anchored={anchored}>
        {/* tell: the two named pieces, and the glass between them */}
        <span className="grp-c-in absolute block" style={{ ...cell(0, 0, 0.9), "--gd": "0.7s", "--s0": "0.9", animationDelay: dm(delayMs, 0) } as CSSProperties}>
          <Man kind="n" fill={p1} stroke={p2} />
        </span>
        <span className="grp-c-in absolute block" style={{ ...AIMED, "--gd": "0.7s", "--s0": "0.9", animationDelay: dm(delayMs, 40) } as CSSProperties}>
          <Man kind="n" fill={tint(p2, 0.9)} stroke={p1} />
        </span>
        <span className="grp-c-up absolute block" style={{ ...half, "--gd": "1.8s", animationDelay: dm(delayMs, 120) } as CSSProperties}>
          {glass}
        </span>
        <span className="grp-c-pip absolute block" style={{ ...cell(0.5, -0.6, 0.36), "--gd": "0.7s", animationDelay: dm(delayMs, 260) } as CSSProperties}>
          <Hourglass glass={p1} sand={p0} />
        </span>
        {/* strike: each passes through the glass to the other's square */}
        <span className="grp-c-go absolute block" style={{ ...cell(0, 0, 0.9), ...toAim, "--gd": "0.8s", animationDelay: dm(delayMs, 560) } as CSSProperties}>
          <Man kind="n" fill={p1} stroke={p2} />
        </span>
        <span className="grp-c-go absolute block" style={{ ...cell(0, 0, 0.9), ...toCast, "--gd": "0.8s", animationDelay: dm(delayMs, 560) } as CSSProperties}>
          <Man kind="n" fill={tint(p2, 0.9)} stroke={p1} />
        </span>
        <span className="grp-flash absolute block" style={{ ...half, background: tint(p1, 0.6), animationDelay: dm(delayMs, 760) }} />
        {/* settle: glints fall from the glass */}
        <Flecks delayMs={delayMs + 1100} at={half} color={tint(p1, 0.85)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 620} anchored={anchored} />
    </Stage>
  );
}

/* --- phase_army ------------------------------------------------------------
   "Your bishops, rooks, and queen pass through one friendly piece per move
   for 1 turn." The caster's rook's file runs through the pawn in front of it
   (the pawn goes pale as it passes) and the rook glides on through; the
   bishop's diagonal passes one friendly piece and stops at the second. One
   pip. */
function PhaseArmyScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Man kind="r" fill={tint(p1, 0.6)} stroke={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 560}>
      <Frame anchored={anchored}>
        {/* tell: the rook and the pawn in front of it */}
        <span className="grp-tellglow absolute block rounded-full" style={{ ...sq(0, 0, 1.3), background: tint(p1, 0.4), animationDelay: dm(delayMs, 40) }} />
        {/* the friendly piece goes pale as the line passes through it */}
        <span className="grp-c-in absolute block" style={{ ...sq(0, 1), "--gd": "1.4s", "--s0": "1", animationDelay: dm(delayMs, 260) } as CSSProperties}>
          <Man kind="p" fill={tint(p1, 0.45)} stroke={p1} />
        </span>
        {/* strike: the file runs through, and the rook glides on */}
        <Ray at={sq(0, 0)} ang={-90} len={4} verb="grp-c-draw" color={p1} delay={dm(delayMs, 300)} />
        <span className="grp-c-go absolute block" style={{ ...sq(0, 4), "--ty0": "calc(var(--fx-side, 1) * 400%)", "--gd": "0.8s", animationDelay: dm(delayMs, 480) } as CSSProperties}>
          <Man kind="r" fill={p1} stroke={p2} />
        </span>
        {/* the bishop passes one friendly piece and stops at the second */}
        <span className="grp-c-in absolute block" style={{ ...sq(3, 1), "--gd": "1.3s", "--s0": "1", animationDelay: dm(delayMs, 420) } as CSSProperties}>
          <Man kind="n" fill={tint(p1, 0.45)} stroke={p1} />
        </span>
        <span className="grp-c-in absolute block" style={{ ...sq(5, 3), "--gd": "1.3s", "--s0": "0.9", animationDelay: dm(delayMs, 420) } as CSSProperties}>
          <Man kind="p" fill={p0} stroke={p2} />
        </span>
        <Ray at={sq(2, 0)} ang={-45} len={4.24} keep={2.4} verb="grp-c-clip" color={p1} delay={dm(delayMs, 560)} />
        <Pips n={1} x={50} top="calc(50% - 1.3%)" fill={p1} rim={p2} delayMs={delayMs + 900} />
        {/* settle: pale motes drift up the file */}
        <Flecks delayMs={delayMs + 1050} at={sq(0, 2, 2)} color={tint(p1, 0.7)} dir={-1} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 560} anchored={anchored} />
    </Stage>
  );
}

/* --- spirit_guide ----------------------------------------------------------
   "For your next 4 turns it may also step one square in any direction, and
   it cannot be captured for your opponent's next 3 turns." A wisp drifts
   down and sinks into the chosen piece; eight small footprints are set in
   the squares round it (its new steps), four step pips and three ward pips
   under it. Target cut: the wisp settling onto the square. */
function Wisp({ glow, core }: { glow: string; core: string }) {
  return (
    <svg viewBox="0 0 10 14" className="block h-full w-full" aria-hidden="true">
      <path d="M5 1 C8 3 8.4 7 7 9.4 C6 11 6.4 12.4 5 13.4 C4.6 12 3 11.4 3 9.4 C1.6 7 2 3 5 1 Z" fill={glow} />
      <circle cx="5" cy="6.4" r="1.4" fill={core} />
    </svg>
  );
}
function SpiritGuideScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} from="above" motif={<Wisp glow={tint(p1, 0.7)} core={p0} />} />;
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="grp-tellglow absolute block rounded-full" style={{ left: "14%", top: "14%", width: "72%", height: "72%", background: tint(p1, 0.35), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-go absolute block" style={{ left: "30%", top: "20%", width: "40%", height: "56%", "--ty0": "-80%", "--gd": "1s", animationDelay: dm(delayMs, 120) } as CSSProperties}>
          <Wisp glow={tint(p1, 0.7)} core={p0} />
        </span>
        <Flecks delayMs={delayMs + 520} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p1, 0.8)} dir={-1} n={3} />
      </span>
    );
  }
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 480}>
      <Frame anchored={anchored}>
        {/* tell: the wisp drifts down onto the piece */}
        <span className="grp-tellglow absolute block rounded-full" style={{ ...cell(0, 0, 1.4), background: tint(p1, 0.35), animationDelay: dm(delayMs, 40) }} />
        <span className="grp-c-go absolute block" style={{ ...cell(0, -0.1, 0.6), height: "10%", "--ty0": "calc(var(--fx-side, 1) * -220%)", "--gd": "0.6s", animationDelay: dm(delayMs, 80) } as CSSProperties}>
          <Wisp glow={tint(p1, 0.7)} core={p0} />
        </span>
        {/* strike: it sinks into the piece */}
        <span className="grp-sink absolute block" style={{ ...cell(0, -0.1, 0.6), height: "10%", animationDelay: dm(delayMs, 460) }}>
          <Wisp glow={tint(p1, 0.7)} core={p0} />
        </span>
        <span className="grp-flash absolute block rounded-full" style={{ ...cell(0, 0, 1.2), background: tint(p1, 0.5), animationDelay: dm(delayMs, 480) }} />
        {/* eight footprints: its new steps */}
        {RING8.map(([dx, dy], i) => (
          <span key={i} className="grp-c-pip absolute block" style={{ ...cell(dx, dy, 0.3), rotate: `${Math.round((Math.atan2(dy, dx) * 180) / Math.PI) + 90}deg`, "--gd": "1.1s", animationDelay: dm(delayMs, 600 + i * 35) } as CSSProperties}>
            <svg viewBox="0 0 6 10" className="block h-full w-full" aria-hidden="true">
              <ellipse cx="3" cy="6" rx="2.2" ry="3.4" fill={tint(p1, 0.85)} />
              <circle cx="3" cy="1.4" r="1" fill={tint(p1, 0.85)} />
            </svg>
          </span>
        ))}
        {/* four steps, three turns warded */}
        {[0, 1, 2, 3].map((i) => (
          <span key={`s${i}`} className="grp-c-in absolute block rounded-full" style={{ ...cell(-0.45 + i * 0.3, 0.64, 0.16), background: p1, "--s0": "0.2", "--gd": "1s", animationDelay: dm(delayMs, 880 + i * 50) } as CSSProperties} />
        ))}
        {[0, 1, 2].map((i) => (
          <span key={`w${i}`} className="grp-c-in absolute block rounded-full" style={{ ...cell(-0.3 + i * 0.3, 0.84, 0.16), border: `1.5px solid ${p0}`, "--s0": "0.2", "--gd": "1s", animationDelay: dm(delayMs, 960 + i * 50) } as CSSProperties} />
        ))}
        {/* settle: pale motes rise */}
        <Flecks delayMs={delayMs + 1050} at={cell(0, 0, 1.4)} color={tint(p1, 0.8)} dir={-1} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 480} anchored={anchored} />
    </Stage>
  );
}

/* --- stone_menagerie -------------------------------------------------------
   "Target two enemy minor pieces (knights or bishops). After your opponent's
   next move, both are petrified for 3 of their turns." The two targets are
   tagged like beasts in a collection (a hanging label on each); an hourglass
   while the opponent moves; then each is set on a plinth and shuts into a
   walnut. Three pips. Target cut: a walnut on the square. */
function StoneMenagerieScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Walnut shell={p1} seam={p2} />} />;
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="grp-tellshadow absolute block rounded-full" style={{ left: "14%", top: "60%", width: "72%", height: "28%", background: tint(p2, 0.5), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-stamp absolute block" style={{ left: "16%", top: "14%", width: "68%", height: "68%", "--gd": "1.1s", "--r0": "0deg", animationDelay: dm(delayMs, 140) } as CSSProperties}>
          <Walnut shell={p1} seam={p2} />
        </span>
        <Flecks delayMs={delayMs + 500} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p0, 0.8)} n={3} />
      </span>
    );
  }
  const pair: [CSSProperties, "n" | "b"][] = [
    [cell(0, 0), "n"],
    [AIMED, "b"],
  ];
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 620}>
      <Frame anchored={anchored}>
        {pair.map(([at, kind], i) => (
          <span key={kind}>
            {/* tell: each is tagged */}
            <span className="grp-c-in absolute block" style={{ ...at, "--gd": "0.8s", "--s0": "0.9", "--ty0": "calc(var(--fx-side, 1) * -10%)", animationDelay: dm(delayMs, 40 + i * 60) } as CSSProperties}>
              <Man kind={kind} fill={tint(p2, 0.9)} stroke={p1} />
            </span>
            <span className="grp-c-pip absolute block" style={{ ...at, left: `calc(${at.left} + 7%)`, width: "5%", height: "5%", "--gd": "1.8s", animationDelay: dm(delayMs, 160 + i * 60) } as CSSProperties}>
              <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
                <path d="M1 3 L4 0.8 H9.2 V9.2 H4 L1 7 Z" fill={p1} stroke={p2} strokeWidth="0.6" />
                <circle cx="3.4" cy="5" r="0.8" fill={p2} />
              </svg>
            </span>
            {/* strike: set on a plinth and shut into stone */}
            <span className="grp-c-up absolute block" style={{ ...at, top: `calc(${at.top} + 9.5%)`, height: "4%", "--gd": "1.3s", animationDelay: dm(delayMs, 560 + i * 80) } as CSSProperties}>
              <Plinth stone={p0} edge={p2} />
            </span>
            <span className="grp-c-stamp absolute block" style={{ ...at, "--gd": "1.3s", "--r0": "0deg", animationDelay: dm(delayMs, 620 + i * 80) } as CSSProperties}>
              <Walnut shell={p1} seam={p2} />
            </span>
          </span>
        ))}
        <span className="grp-c-pip absolute block" style={{ ...cell(0.5, -0.6, 0.36), "--gd": "0.7s", animationDelay: dm(delayMs, 300) } as CSSProperties}>
          <Hourglass glass={p1} sand={p0} />
        </span>
        {[0, 1, 2].map((i) => (
          <span key={i} className="grp-c-in absolute block rounded-full" style={{ ...cell(-0.3 + i * 0.3, 0.78, 0.18), background: p1, border: `1px solid ${p2}`, "--s0": "0.2", "--gd": "1s", animationDelay: dm(delayMs, 900 + i * 70) } as CSSProperties} />
        ))}
        {/* settle: stone dust sinks */}
        <Flecks delayMs={delayMs + 1050} at={cell(0, 0, 1.4)} color={tint(p0, 0.8)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 620} anchored={anchored} />
    </Stage>
  );
}

/** Where the opponent's card row sits: the middle of their half, clear of the
 * cast banner that covers their back rank. */
const THEIR_ROW = "calc(50% - var(--fx-side, 1) * 22% - 9%)";
/** And the caster's, the middle of their own half. */
const OUR_ROW = "calc(50% + var(--fx-side, 1) * 22% - 9%)";

/* --- buff_thief ------------------------------------------------------------
   "Steal one active buff of any tier from your opponent. Locked-in upgrades
   stay put. Using it spends your next unused reroll, if any." A long hook
   reaches over from the caster's side, catches one of the opponent's cards
   and reels it home; the padlocked card beside it does not budge. The
   caster's reroll die cracks. */
function Hook({ iron }: { iron: string }) {
  return (
    <svg viewBox="0 0 6 20" className="block h-full w-full" aria-hidden="true">
      <path d="M3 0.6 V14 C3 17.6 0.8 18.4 0.8 15.6" fill="none" stroke={iron} strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}
function BuffThiefScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Hook iron={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 520}>
      <Frame anchored={anchored}>
        {/* tell: their cards, one of them locked */}
        {[30, 56].map((x, i) => (
          <span key={x} className="grp-c-in absolute block" style={{ left: `${x}%`, top: THEIR_ROW, width: "13%", height: "18%", "--gd": i ? "2s" : "0.55s", "--s0": "0.8", animationDelay: dm(delayMs, 40 + i * 60) } as CSSProperties}>
            <CardBack face={tint(p1, 0.9)} edge={p2} />
          </span>
        ))}
        <span className="grp-c-pip absolute block" style={{ left: "59.5%", top: `calc(${THEIR_ROW} + 5%)`, width: "6%", height: "7%", "--gd": "1.9s", animationDelay: dm(delayMs, 160) } as CSSProperties}>
          <Padlock body={p0} shackle={p2} />
        </span>
        {/* the hook reaches over and catches the free one */}
        <span className="grp-c-go absolute block" style={{ left: "35%", top: `calc(${THEIR_ROW} + 4%)`, width: "3%", height: "30%", "--ty0": "calc(var(--fx-side, 1) * 160%)", "--ty1": "calc(var(--fx-side, 1) * 150%)", "--gd": "1.2s", animationDelay: dm(delayMs, 200) } as CSSProperties}>
          <Hook iron={p1} />
        </span>
        {/* strike: it is reeled home */}
        <span className="grp-c-go absolute block" style={{ left: "30%", top: THEIR_ROW, width: "13%", height: "18%", "--ty1": "calc(var(--fx-side, 1) * 245%)", "--gd": "0.8s", animationDelay: dm(delayMs, 520) } as CSSProperties}>
          <CardBack face={tint(p1, 0.9)} edge={p2} />
        </span>
        <span className="grp-c-up absolute block" style={{ left: "30%", top: OUR_ROW, width: "13%", height: "18%", "--gd": "1s", animationDelay: dm(delayMs, 1000) } as CSSProperties}>
          <CardBack face={p1} edge={p0} />
        </span>
        {/* the price: the reroll die cracks */}
        {[-1, 1].map((s) => (
          <span key={s} className="grp-c-part absolute block" style={{ ...sq(5.5 + s * 0.16, 1.2, 0.32), "--tx1": `${s * 90}%`, "--ty1": "60%", "--r1": `${s * 30}deg`, "--gd": "0.7s", animationDelay: dm(delayMs, 900) } as CSSProperties}>
            <Die fill={p1} pip={p2} />
          </span>
        ))}
        {/* settle: motes trail the stolen card */}
        <Flecks delayMs={delayMs + 1050} at={{ left: "28%", top: OUR_ROW, width: "18%", height: "18%" }} color={tint(p1, 0.8)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 520} anchored={anchored} />
    </Stage>
  );
}

/* --- cast_a_nerf -----------------------------------------------------------
   "They cannot capture for their next 2 turns, though the first piece caught
   by the curse may still make one capture. Their next drafted card arrives
   nullified." A foam dart flies into their half; three of their capture
   lines are drawn and each ends in a soft foam bump instead of a take, all
   but the first, whose one capture still goes through. Two pips; the card
   waiting in their draft slot greys over with a null ring. */
function FoamDart({ foam, tip }: { foam: string; tip: string }) {
  return (
    <svg viewBox="0 0 20 6" className="block h-full w-full" aria-hidden="true">
      <rect x="4" y="1.6" width="12" height="2.8" rx="1" fill={foam} />
      <path d="M16 1.2 H19 C19.6 1.2 19.6 4.8 19 4.8 H16 Z" fill={tip} />
      <path d="M4 1.6 L0.6 0.4 V5.6 L4 4.4" fill={tip} />
    </svg>
  );
}
function CastANerfScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<FoamDart foam={p1} tip={p0} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const takes = [
    { col: 1, rank: 5, ang: 45, soft: false },
    { col: 4, rank: 6, ang: 135, soft: true },
    { col: 6, rank: 5, ang: 45, soft: true },
  ];
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 340}>
      <Frame anchored={anchored}>
        {/* tell: the dart flies into their half */}
        <span className="grp-c-go absolute block" style={{ left: "40%", top: "calc(50% - var(--fx-side, 1) * 12% - 2%)", width: "20%", height: "4%", rotate: "calc(var(--fx-side, 1) * -30deg)", "--tx0": "-160%", "--ty0": "calc(var(--fx-side, 1) * 300%)", "--gd": "0.5s", animationDelay: dm(delayMs, 40) } as CSSProperties}>
          <FoamDart foam={p1} tip={p0} />
        </span>
        {/* strike: their captures end in a foam bump, all but the first */}
        {takes.map((t, i) => (
          <span key={t.col}>
            <span className="grp-c-in absolute block" style={{ ...sq(t.col, t.rank), "--gd": "1.6s", "--s0": "0.9", animationDelay: dm(delayMs, 200 + i * 50) } as CSSProperties}>
              <Man kind={i === 1 ? "n" : "p"} fill={tint(p2, 0.9)} stroke={p1} />
            </span>
            <Ray at={sq(t.col, t.rank)} ang={t.soft ? t.ang : t.ang} len={1.41} keep={t.soft ? 0.8 : 1.41} verb={t.soft ? "grp-c-clip" : "grp-c-draw"} color={t.soft ? p1 : p2} delay={dm(delayMs, 360 + i * 80)} />
            {t.soft && (
              <span className="grp-bonk absolute block rounded-full" style={{ ...sq(t.col + (t.ang === 45 ? 0.55 : -0.55), t.rank - 0.55, 0.36), background: p0, animationDelay: dm(delayMs, 560 + i * 80) }} />
            )}
          </span>
        ))}
        <Pips n={2} x={50} top="calc(50% - 1.3%)" fill={p1} rim={p2} delayMs={delayMs + 820} />
        {/* the next card they draft arrives nullified */}
        <span className="grp-c-in absolute block" style={{ left: "70%", top: THEIR_ROW, width: "12%", height: "16%", "--gd": "1.2s", "--s0": "0.8", animationDelay: dm(delayMs, 760) } as CSSProperties}>
          <CardBack face={tint(p2, 0.7)} edge={p1} />
        </span>
        <span className="grp-c-stamp absolute block rounded-full" style={{ left: "71%", top: `calc(${THEIR_ROW} + 3%)`, width: "10%", height: "10%", border: `2px solid ${p0}`, "--gd": "1s", "--r0": "0deg", animationDelay: dm(delayMs, 900) } as CSSProperties} />
        {/* settle: foam flecks drift off */}
        <Flecks delayMs={delayMs + 1050} at={ranks(5.5, 2)} color={tint(p0, 0.75)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 340} anchored={anchored} />
    </Stage>
  );
}

/* --- iron_will -------------------------------------------------------------
   "Whenever your opponent captures one of your pieces, your nerf is
   suspended for your next turn, beginning after your opponent's following
   move." An enemy piece takes one of the caster's; the loss is hammered into
   an iron heart on the caster's side, and after the hourglass of their next
   move the shackle on the caster's nerf springs open for one turn (one pip)
   and closes again. */
function IronHeart({ iron, rim }: { iron: string; rim: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M5 9 C1 6.4 0.6 4 0.8 3 C1 1.2 3.6 0.4 5 2.6 C6.4 0.4 9 1.2 9.2 3 C9.4 4 9 6.4 5 9 Z" fill={iron} stroke={rim} strokeWidth="0.6" />
      <circle cx="3" cy="3.6" r="0.5" fill={rim} />
      <circle cx="7" cy="3.6" r="0.5" fill={rim} />
    </svg>
  );
}
function IronWillScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<IronHeart iron={p0} rim={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 380}>
      <Frame anchored={anchored}>
        {/* tell: an enemy piece takes one of the caster's */}
        <span className="grp-c-in absolute block" style={{ ...sq(4, 3), "--gd": "0.45s", "--s0": "0.9", animationDelay: dm(delayMs, 0) } as CSSProperties}>
          <Man kind="n" fill={p1} stroke={p2} />
        </span>
        <Ray at={sq(6, 5)} ang={135} len={2.83} verb="grp-c-draw" color={tint(p2, 0.9)} delay={dm(delayMs, 60)} />
        <span className="grp-c-blast absolute block" style={{ ...sq(4, 3, 0.7), "--tx1": "0%", "--ty1": "calc(var(--fx-side, 1) * 120%)", "--gd": "0.6s", animationDelay: dm(delayMs, 340) } as CSSProperties}>
          <Man kind="n" fill={p1} stroke={p2} />
        </span>
        {/* strike: the loss is hammered into an iron heart */}
        <span className="grp-c-stamp absolute block" style={{ ...sq(3.5, 1.3, 1.1), "--gd": "1.5s", "--r0": "0deg", animationDelay: dm(delayMs, 400) } as CSSProperties}>
          <IronHeart iron={p0} rim={p1} />
        </span>
        {/* their next move, then the shackle springs for one turn */}
        <span className="grp-c-pip absolute block" style={{ ...sq(5, 1.3, 0.4), "--gd": "0.6s", animationDelay: dm(delayMs, 620) } as CSSProperties}>
          <Hourglass glass={p1} sand={p0} />
        </span>
        {[-1, 1].map((s) => (
          <span key={s} className="grp-c-stuck absolute block" style={{ ...sq(2 + s * 0.2, 1.3, 0.6), "--tx1": `${s * 40}%`, "--ty1": "0%", "--gd": "0.9s", animationDelay: dm(delayMs, 860) } as CSSProperties}>
            <Cuff iron={p1} bolt={p0} />
          </span>
        ))}
        <Pips n={1} x={25} top="calc(50% + var(--fx-side, 1) * 34% - 1.3%)" fill={p1} rim={p2} delayMs={delayMs + 960} />
        {/* settle: sparks from the hammering sink */}
        <Flecks delayMs={delayMs + 1050} at={sq(3.5, 1.3, 1.4)} color={tint(p1, 0.8)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 400} anchored={anchored} />
    </Stage>
  );
}

/* --- rehab -----------------------------------------------------------------
   "Your nerf is suspended permanently for the rest of the game, but your next
   two drafts are skipped." A clinic's cross is hung on the caster's side, the
   shackle on the caster's nerf is unlocked and set down for good (an
   endless loop is stamped where it lay), and the caster's next two draft
   cards are crossed out. */
function RehabScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  const cross = (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M3.6 1 H6.4 V3.6 H9 V6.4 H6.4 V9 H3.6 V6.4 H1 V3.6 H3.6 Z" fill={p0} stroke={p2} strokeWidth="0.5" />
    </svg>
  );
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={cross} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 520}>
      <Frame anchored={anchored}>
        {/* tell: the clinic's cross is hung */}
        <span className="grp-c-in absolute block" style={{ ...sq(1.5, 2.6, 1.1), "--ty0": "-40%", "--gd": "1.9s", "--s0": "0.8", animationDelay: dm(delayMs, 40) } as CSSProperties}>
          {cross}
        </span>
        {/* strike: the shackle is unlocked and set down for good */}
        <span className="grp-c-in absolute block" style={{ ...sq(3.5, 1.4, 1), "--gd": "0.6s", "--s0": "0.9", animationDelay: dm(delayMs, 120) } as CSSProperties}>
          <Cuff iron={p1} bolt={p0} />
        </span>
        {[-1, 1].map((s) => (
          <span key={s} className="grp-c-part absolute block" style={{ ...sq(3.5 + s * 0.25, 1.4, 0.6), "--tx1": `${s * 70}%`, "--ty1": "40%", "--r1": `${s * 40}deg`, "--gd": "0.8s", animationDelay: dm(delayMs, 500) } as CSSProperties}>
            <Cuff iron={p1} bolt={p0} />
          </span>
        ))}
        <span className="grp-c-stamp absolute block" style={{ ...sq(3.5, 1.4, 0.8), height: "5%", marginTop: "3.8%", "--gd": "1.3s", "--r0": "0deg", animationDelay: dm(delayMs, 640) } as CSSProperties}>
          <svg viewBox="0 0 16 8" className="block h-full w-full" aria-hidden="true">
            <path d="M8 4 C6 0.6 1 0.6 1 4 C1 7.4 6 7.4 8 4 C10 0.6 15 0.6 15 4 C15 7.4 10 7.4 8 4 Z" fill="none" stroke={p0} strokeWidth="1.2" />
          </svg>
        </span>
        {/* the price: the next two drafts are crossed out */}
        {[0, 1].map((i) => (
          <span key={i}>
            <span className="grp-c-in absolute block" style={{ ...sq(5.3 + i * 1.1, 1.4, 0.8), "--gd": "1.1s", "--s0": "0.8", animationDelay: dm(delayMs, 760 + i * 80) } as CSSProperties}>
              <CardBack face={p1} edge={p2} />
            </span>
            <span className="grp-c-stamp absolute block" style={{ ...sq(5.3 + i * 1.1, 1.4, 0.6), "--gd": "0.9s", "--r0": "20deg", animationDelay: dm(delayMs, 880 + i * 80) } as CSSProperties}>
              <Strike ink={p2} />
            </span>
          </span>
        ))}
        {/* settle: calm motes rise */}
        <Flecks delayMs={delayMs + 1050} at={sq(3.5, 1.6, 1.8)} color={tint(p0, 0.8)} dir={-1} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p0, 0.7)} delayMs={delayMs + 520} anchored={anchored} />
    </Stage>
  );
}

/* --- sever -----------------------------------------------------------------
   "Permanently disable one enemy buff and block its retrigger." One of their
   cards hangs from a glowing cord to their side; shears close on the cord,
   the card drops grey, and a chain wraps it so it cannot fire again. */
function Shears({ blade, grip }: { blade: string; grip: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M5 5 L9.4 0.8 M5 5 L9.4 3" stroke={blade} strokeWidth="0.9" strokeLinecap="round" />
      <circle cx="2.4" cy="6.4" r="1.6" fill="none" stroke={grip} strokeWidth="0.8" />
      <circle cx="4.4" cy="8.4" r="1.6" fill="none" stroke={grip} strokeWidth="0.8" />
    </svg>
  );
}
function SeverScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Shears blade={p1} grip={p0} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 420}>
      <Frame anchored={anchored}>
        {/* tell: their card hangs from its cord */}
        <span className="absolute block" style={{ left: "49.4%", top: "calc(50% - var(--fx-side, 1) * 34% - 4%)", width: "1.2%", height: "12%" }}>
          <span className="grp-c-in absolute inset-0 block" style={{ background: p1, "--s0": "1", "--gd": "0.5s", animationDelay: dm(delayMs, 40) } as CSSProperties} />
        </span>
        <span className="grp-c-in absolute block" style={{ left: "43.5%", top: THEIR_ROW, width: "13%", height: "18%", "--gd": "0.55s", "--s0": "0.9", animationDelay: dm(delayMs, 80) } as CSSProperties}>
          <CardBack face={p1} edge={p2} />
        </span>
        {/* strike: the shears close on the cord */}
        <span className="grp-c-stamp absolute block" style={{ left: "51%", top: "calc(50% - var(--fx-side, 1) * 34% - 3%)", width: "8%", height: "8%", "--gd": "0.7s", "--r0": "-30deg", animationDelay: dm(delayMs, 300) } as CSSProperties}>
          <Shears blade={p1} grip={p0} />
        </span>
        {/* the card drops grey */}
        <span className="grp-c-go absolute block" style={{ left: "43.5%", top: THEIR_ROW, width: "13%", height: "18%", "--ty1": "calc(var(--fx-side, 1) * 60%)", "--gd": "0.6s", animationDelay: dm(delayMs, 420) } as CSSProperties}>
          <CardBack face={tint(p2, 0.85)} edge={p0} />
        </span>
        <span className="grp-c-in absolute block" style={{ left: "43.5%", top: `calc(${THEIR_ROW} + var(--fx-side, 1) * 11%)`, width: "13%", height: "18%", "--s0": "1", "--gd": "1.1s", animationDelay: dm(delayMs, 900) } as CSSProperties}>
          <CardBack face={tint(p2, 0.85)} edge={p0} />
        </span>
        {/* ...and a chain wraps it: no retrigger */}
        {[-1, 1].map((s, i) => (
          <span key={s} className="absolute block" style={{ left: "41%", top: `calc(${THEIR_ROW} + var(--fx-side, 1) * 11% + 9%)`, width: "18%", height: "1.6%", rotate: `${s * 30}deg` }}>
            <span className="grp-c-draw absolute inset-0 block" style={{ background: `repeating-linear-gradient(90deg, ${p0} 0 8%, transparent 8% 11%)`, "--gd": "1s", animationDelay: dm(delayMs, 760 + i * 80) } as CSSProperties} />
          </span>
        ))}
        {/* settle: the cut cord's fibres drift off */}
        <Flecks delayMs={delayMs + 1050} at={{ left: "40%", top: THEIR_ROW, width: "20%", height: "18%" }} color={tint(p1, 0.8)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 420} anchored={anchored} />
    </Stage>
  );
}

/* --- wa_sabotage -----------------------------------------------------------
   "Your opponent's next draft is skipped, and their reroll token is stolen
   away if they still hold one." A fuse is run from the caster's side into the
   opponent's draft slot and burns along it; the slot blows open, and their
   reroll die is carried off to the caster. */
function WaSabotageScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Charge body={p0} fuse={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 560}>
      <Frame anchored={anchored}>
        {/* tell: the fuse is run to their draft slot */}
        <span className="grp-c-in absolute block" style={{ left: "37%", top: THEIR_ROW, width: "13%", height: "18%", border: `2px dashed ${tint(p1, 0.8)}`, "--s0": "1", "--gd": "0.7s", animationDelay: dm(delayMs, 40) } as CSSProperties} />
        <span className="absolute block" style={{ left: "44%", top: "calc(50% - var(--fx-side, 1) * 4%)", width: "1%", height: "38%", marginTop: "calc(var(--fx-side, 1) * -19% + 0%)" }}>
          <span className="grp-c-in absolute inset-0 block" style={{ background: `repeating-linear-gradient(180deg, ${p0} 0 6%, transparent 6% 9%)`, "--s0": "1", "--gd": "0.9s", animationDelay: dm(delayMs, 100) } as CSSProperties} />
        </span>
        {/* the spark runs up it */}
        <span className="grp-c-go absolute block rounded-full" style={{ left: "43%", top: "calc(50% + var(--fx-side, 1) * 16%)", width: "3%", height: "3%", background: p1, "--ty1": "calc(var(--fx-side, 1) * -900%)", "--gd": "0.5s", animationDelay: dm(delayMs, 200) } as CSSProperties} />
        {/* strike: the slot blows open */}
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="grp-c-blast absolute block" style={{ left: "41.5%", top: `calc(${THEIR_ROW} + 6%)`, width: "4%", height: "5%", background: i % 2 ? p0 : p1, "--tx1": `${(i - 2) * 160}%`, "--ty1": `${-120 + (i % 2) * 60}%`, "--gd": "0.8s", animationDelay: dm(delayMs, 560 + i * 20) } as CSSProperties} />
        ))}
        {/* their reroll die is carried off to the caster */}
        <span className="grp-c-go absolute block" style={{ left: "62%", top: `calc(${THEIR_ROW} + 5%)`, width: "7%", height: "7%", "--ty1": "calc(var(--fx-side, 1) * 620%)", "--gd": "0.9s", animationDelay: dm(delayMs, 700) } as CSSProperties}>
          <Die fill={p1} pip={p2} />
        </span>
        {/* settle: ash sinks where the slot was */}
        <Flecks delayMs={delayMs + 1050} at={{ left: "36%", top: THEIR_ROW, width: "16%", height: "18%" }} color={tint(p0, 0.8)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 560} anchored={anchored} />
    </Stage>
  );
}

/* --- wa_spelltheft ---------------------------------------------------------
   "Steal any one of your opponent's unused buffs, but your own lowest-tier
   unused card goes to them in exchange. Casting it also spends one of your
   draft rerolls." Their strong card (many tier pips) and the caster's weakest
   (one pip) cross in the middle and trade sides; the caster's reroll die
   cracks. */
function WaSpelltheftScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<TierCard face={p1} edge={p2} pip={p0} n={5} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 520}>
      <Frame anchored={anchored}>
        {/* tell: their strong card, the caster's weakest */}
        <span className="grp-tellglow absolute block rounded-full" style={{ left: "30%", top: "30%", width: "40%", height: "40%", background: tint(p1, 0.25), animationDelay: dm(delayMs, 40) }} />
        <span className="grp-c-in absolute block" style={{ left: "43.5%", top: THEIR_ROW, width: "13%", height: "18%", "--gd": "0.55s", "--s0": "0.9", animationDelay: dm(delayMs, 60) } as CSSProperties}>
          <TierCard face={p1} edge={p2} pip={p0} n={6} />
        </span>
        <span className="grp-c-in absolute block" style={{ left: "43.5%", top: OUR_ROW, width: "13%", height: "18%", "--gd": "0.55s", "--s0": "0.9", animationDelay: dm(delayMs, 100) } as CSSProperties}>
          <TierCard face={tint(p1, 0.8)} edge={p2} pip={p0} n={1} />
        </span>
        {/* strike: they cross and trade sides */}
        <span className="grp-c-go absolute block" style={{ left: "43.5%", top: THEIR_ROW, width: "13%", height: "18%", "--tx1": "0%", "--ty1": "calc(var(--fx-side, 1) * 245%)", "--gd": "0.9s", animationDelay: dm(delayMs, 400) } as CSSProperties}>
          <span className="grp-c-spin absolute inset-0 block" style={{ "--r1": "360deg", "--gd": "0.9s", animationDelay: dm(delayMs, 400) } as CSSProperties}>
            <TierCard face={p1} edge={p2} pip={p0} n={6} />
          </span>
        </span>
        <span className="grp-c-go absolute block" style={{ left: "43.5%", top: OUR_ROW, width: "13%", height: "18%", "--ty1": "calc(var(--fx-side, 1) * -245%)", "--gd": "0.9s", animationDelay: dm(delayMs, 400) } as CSSProperties}>
          <TierCard face={tint(p1, 0.8)} edge={p2} pip={p0} n={1} />
        </span>
        <span className="grp-c-up absolute block" style={{ left: "43.5%", top: OUR_ROW, width: "13%", height: "18%", "--gd": "0.9s", animationDelay: dm(delayMs, 1000) } as CSSProperties}>
          <TierCard face={p1} edge={p2} pip={p0} n={6} />
        </span>
        {/* the price: a reroll die cracks */}
        {[-1, 1].map((s) => (
          <span key={s} className="grp-c-part absolute block" style={{ ...sq(6.2 + s * 0.16, 1.2, 0.32), "--tx1": `${s * 90}%`, "--ty1": "60%", "--r1": `${s * 30}deg`, "--gd": "0.7s", animationDelay: dm(delayMs, 860) } as CSSProperties}>
            <Die fill={p1} pip={p2} />
          </span>
        ))}
        {/* settle: motes swirl where they crossed */}
        <Flecks delayMs={delayMs + 1050} at={{ left: "40%", top: "40%", width: "20%", height: "20%" }} color={tint(p1, 0.8)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 520} anchored={anchored} />
    </Stage>
  );
}

/* --- wa_stolen_hours -------------------------------------------------------
   "Steal 20 seconds from your opponent's clock and take one extra move this
   turn. You cannot capture the king on the bonus move." A wedge is cut from
   the opponent's clock face and carried across to the caster's, which grows
   by it; the caster takes the extra move, and a line toward their king is
   cut short of him. */
function ClockFace({ face, rim }: { face: string; rim: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <circle cx="5" cy="5" r="4.3" fill={face} stroke={rim} strokeWidth="0.6" />
      <path d="M5 5 V2.2 M5 5 L7 6" stroke={rim} strokeWidth="0.6" strokeLinecap="round" />
    </svg>
  );
}
function Wedge({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M5 5 L5 0.7 A4.3 4.3 0 0 1 8.7 2.9 Z" fill={fill} />
    </svg>
  );
}
function WaStolenHoursScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<ClockFace face={p0} rim={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const theirs: CSSProperties = { left: "63%", top: "calc(50% - var(--fx-side, 1) * 22% - 8%)", width: "16%", height: "16%" };
  const ours: CSSProperties = { left: "63%", top: "calc(50% + var(--fx-side, 1) * 22% - 8%)", width: "16%", height: "16%" };
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 520}>
      <Frame anchored={anchored}>
        {/* tell: both clocks */}
        <span className="grp-c-in absolute block" style={{ ...theirs, "--gd": "1.9s", "--s0": "0.8", animationDelay: dm(delayMs, 40) } as CSSProperties}>
          <ClockFace face={tint(p0, 0.9)} rim={p2} />
        </span>
        <span className="grp-c-in absolute block" style={{ ...ours, "--gd": "1.9s", "--s0": "0.8", animationDelay: dm(delayMs, 100) } as CSSProperties}>
          <ClockFace face={tint(p0, 0.9)} rim={p2} />
        </span>
        {/* strike: a wedge is cut from theirs and carried to the caster's */}
        <span className="grp-c-go absolute block" style={{ ...theirs, "--ty1": "calc(var(--fx-side, 1) * 275%)", "--gd": "0.8s", animationDelay: dm(delayMs, 360) } as CSSProperties}>
          <Wedge fill={p1} />
        </span>
        <span className="grp-c-stamp absolute block" style={{ ...ours, "--gd": "1.1s", "--r0": "0deg", animationDelay: dm(delayMs, 900) } as CSSProperties}>
          <Wedge fill={p1} />
        </span>
        {/* the extra move, and a line to their king cut short */}
        <span className="grp-tellglow absolute block rounded-full" style={{ ...sq(4, 7, 1.3), background: tint(p2, 0.3), animationDelay: dm(delayMs, 480) }} />
        <Ray at={sq(2, 1)} ang={-90} len={2} verb="grp-c-draw" color={p1} delay={dm(delayMs, 560)} />
        <Ray at={sq(2, 3)} ang={-45} len={2.83} keep={1.9} verb="grp-c-clip" color={p2} delay={dm(delayMs, 760)} />
        {/* settle: the second hand's ticks drift off */}
        <Flecks delayMs={delayMs + 1050} at={ours} color={tint(p1, 0.8)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 520} anchored={anchored} />
    </Stage>
  );
}

/* --- wa_twin_familiars -----------------------------------------------------
   "A familiar perches on each of your bishops: for the rest of the game your
   bishops may also step one square straight (up, down, or sideways) but
   never to capture, finally changing their color." A small owl lands on
   each of the caster's bishops; each takes one straight step, and the square
   it lands on is the other colour, flashed as it arrives. */
function Owl({ body, eye }: { body: string; eye: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M2 3 L3 1 L4 2.4 H6 L7 1 L8 3 C9 6 7.6 9 5 9 C2.4 9 1 6 2 3 Z" fill={body} />
      <circle cx="3.8" cy="4.4" r="1" fill={eye} />
      <circle cx="6.2" cy="4.4" r="1" fill={eye} />
    </svg>
  );
}
function WaTwinFamiliarsScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} from="above" motif={<Owl body={p0} eye={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const bishops: [number, number, number][] = [
    [2, 1, -90],
    [5, 2, 180],
  ];
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 440}>
      <Frame anchored={anchored}>
        <span className="grp-tellglow absolute block" style={{ ...ranks(1.5, 2), background: tint(p1, 0.2), animationDelay: dm(delayMs, 60) }} />
        {bishops.map(([c, r, a], i) => (
          <span key={c}>
            {/* tell: the bishop */}
            <span className="grp-c-in absolute block" style={{ ...sq(c, r), "--gd": "0.7s", "--s0": "0.9", animationDelay: dm(delayMs, 40 + i * 60) } as CSSProperties}>
              <Man kind="b" fill={p1} stroke={p2} />
            </span>
            {/* strike: an owl lands on it */}
            <span className="grp-c-in absolute block" style={{ ...sq(c + 0.2, r + 0.35, 0.45), "--ty0": "calc(var(--fx-side, 1) * -220%)", "--s0": "0.6", "--gd": "1.6s", animationDelay: dm(delayMs, 240 + i * 90) } as CSSProperties}>
              <Owl body={p0} eye={p1} />
            </span>
            {/* one straight step, onto the other colour */}
            <Ray at={sq(c, r)} ang={a} len={1} verb="grp-c-draw" color={p1} delay={dm(delayMs, 560 + i * 90)} />
            <span className="grp-flash absolute block" style={{ ...(a === -90 ? sq(c, r + 1) : sq(c - 1, r)), background: tint((c + r) % 2 ? "#e8dcc0" : "#3a3026", 0.7), animationDelay: dm(delayMs, 720 + i * 90) }} />
            <span className="grp-c-go absolute block" style={{ ...(a === -90 ? sq(c, r + 1) : sq(c - 1, r)), "--tx0": a === -90 ? "0%" : "100%", "--ty0": a === -90 ? "calc(var(--fx-side, 1) * 100%)" : "0%", "--gd": "0.9s", animationDelay: dm(delayMs, 640 + i * 90) } as CSSProperties}>
              <Man kind="b" fill={p1} stroke={p2} />
            </span>
          </span>
        ))}
        {/* settle: feathers drift down */}
        <Flecks delayMs={delayMs + 1050} at={sq(3.5, 2, 3)} color={tint(p0, 0.8)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 440} anchored={anchored} />
    </Stage>
  );
}

/* --- we_overgrowth ---------------------------------------------------------
   "Choose one of your pawns; after your opponent replies it blooms into a
   queen for your next 3 turns, then withers back into a pawn." Vines climb
   the chosen pawn while the opponent replies (an hourglass); it blooms into
   a queen wreathed in leaves, three leaf pips count her turns, and at the end
   petals fall and the pawn's outline is left standing. */
function Vines({ leaf }: { leaf: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M2 9.6 C1 7 3.6 5.6 2.6 3 M8 9.6 C9 7 6.4 5.6 7.4 3" fill="none" stroke={leaf} strokeWidth="0.7" strokeLinecap="round" />
      {[[1.8, 7], [3, 4.6], [8.2, 7], [7, 4.6]].map(([x, y]) => (
        <ellipse key={`${x}${y}`} cx={x} cy={y} rx="0.9" ry="0.5" fill={leaf} />
      ))}
    </svg>
  );
}
function WeOvergrowthScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Vines leaf={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 620}>
      <Frame anchored={anchored}>
        {/* tell: the pawn, vines climbing it, and their reply */}
        <span className="grp-c-in absolute block" style={{ ...cell(0, 0, 0.9), "--gd": "0.75s", "--s0": "0.9", animationDelay: dm(delayMs, 0) } as CSSProperties}>
          <Man kind="p" fill={p1} stroke={p2} />
        </span>
        <span className="grp-c-up absolute block" style={{ ...cell(0, 0), "--gd": "1.8s", animationDelay: dm(delayMs, 100) } as CSSProperties}>
          <Vines leaf={p1} />
        </span>
        <span className="grp-c-pip absolute block" style={{ ...cell(0.55, -0.55, 0.34), "--gd": "0.7s", "--ty0": "calc(var(--fx-side, 1) * -10%)", animationDelay: dm(delayMs, 200) } as CSSProperties}>
          <Hourglass glass={p1} sand={p0} />
        </span>
        {/* strike: it blooms into a queen */}
        <span className="grp-flash absolute block rounded-full" style={{ ...cell(0, 0, 1.3), background: tint(p1, 0.5), animationDelay: dm(delayMs, 600) }} />
        <span className="grp-c-up absolute block" style={{ ...cell(0, 0), "--gd": "1s", animationDelay: dm(delayMs, 620) } as CSSProperties}>
          <Man kind="q" fill={p0} stroke={p2} />
        </span>
        {/* three leaf pips: three turns */}
        {[0, 1, 2].map((i) => (
          <span key={i} className="grp-c-pip absolute block" style={{ ...cell(-0.3 + i * 0.3, 0.72, 0.22), "--gd": "0.9s", animationDelay: dm(delayMs, 760 + i * 70) } as CSSProperties}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M1 9 C1 3 5 1 9 1 C9 6 6 9 1 9 Z" fill={p1} />
            </svg>
          </span>
        ))}
        {/* ...then she withers back: the pawn's outline is left */}
        <span className="grp-c-in absolute block" style={{ ...cell(0, 0, 0.9), "--gd": "0.7s", "--s0": "1", animationDelay: dm(delayMs, 1400) } as CSSProperties}>
          <Man kind="p" fill={tint(p1, 0.25)} stroke={p1} />
        </span>
        {/* settle: petals fall */}
        <Flecks delayMs={delayMs + 1100} at={cell(0, 0, 1.4)} color={tint(p0, 0.85)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 620} anchored={anchored} />
    </Stage>
  );
}

/* --- ww_demolition_charge --------------------------------------------------
   "Rig one of your pieces with charges: each of its next two captures also
   destroys the enemy's least valuable piece standing next to the capture
   square. Kings are never caught in the blast." Two charges are strapped to
   the chosen piece; it makes a capture one square on, and of the two enemy
   pieces beside the captured square only the pawn (the least valuable) is
   blown off, the knight stays. One charge is spent, one is left. */
function WwDemolitionChargeScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Charge body={p0} fuse={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 600}>
      <Frame anchored={anchored}>
        {/* tell: two charges are strapped to the piece */}
        <span className="grp-tellglow absolute block rounded-full" style={{ ...cell(0, 0, 1.3), background: tint(p1, 0.35), animationDelay: dm(delayMs, 40) }} />
        {[-1, 1].map((s, i) => (
          <span key={s} className={`${i === 0 ? "grp-c-part" : "grp-c-stamp"} absolute block`} style={{ ...cell(s * 0.3, 0.2, 0.36), "--tx1": "0%", "--ty1": "-80%", "--r1": "30deg", "--r0": "0deg", "--gd": i === 0 ? "0.7s" : "1.7s", animationDelay: dm(delayMs, i === 0 ? 520 : 140) } as CSSProperties}>
            <Charge body={p0} fuse={p1} />
          </span>
        ))}
        {/* it captures one square on */}
        <Ray at={cell(0, 0)} ang={-45} len={1.41} verb="grp-c-draw" color={p1} delay={dm(delayMs, 320)} />
        <span className="grp-flash absolute block rounded-full" style={{ ...cell(1, -1, 1.1), background: tint(p1, 0.6), animationDelay: dm(delayMs, 560) }} />
        {/* beside the take: a pawn and a knight; only the pawn goes */}
        <span className="grp-c-blast absolute block" style={{ ...cell(2, -1, 0.9), "--tx1": "80%", "--ty1": "-60%", "--gd": "0.8s", animationDelay: dm(delayMs, 600) } as CSSProperties}>
          <Man kind="p" fill={tint(p2, 0.9)} stroke={p1} />
        </span>
        <span className="grp-c-in absolute block" style={{ ...cell(1, -2, 0.9), "--gd": "1.7s", "--s0": "0.9", animationDelay: dm(delayMs, 200) } as CSSProperties}>
          <Man kind="n" fill={tint(p2, 0.9)} stroke={p1} />
        </span>
        <span className="grp-c-stuck absolute block" style={{ ...cell(1, -2, 0.4), "--tx1": "0%", "--ty1": "-24%", "--gd": "0.9s", animationDelay: dm(delayMs, 680) } as CSSProperties}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M1 7 H9 M5 7 V2 M2.4 2 H7.6" stroke={p1} strokeWidth="0.8" strokeLinecap="round" />
          </svg>
        </span>
        {/* settle: smoke climbs off the blast */}
        <Flecks delayMs={delayMs + 1050} at={cell(1.5, -1, 1.6)} color={tint(p0, 0.8)} dir={-1} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 600} anchored={anchored} />
    </Stage>
  );
}

/* =============================================================================
   Round 2, the retired tier 6 cards (still drafted in old games and shown in
   the codex): same treatment.
   ========================================================================== */

/* --- we_rooted -------------------------------------------------------------
   "Roots seize the heavy pieces: your opponent's rooks and queen cannot move
   for their next 2 turns." Roots break the ground under both enemy rooks and
   their queen and climb round each; every line they would move on is drawn
   and cut to nothing. Two pips. */
function Roots({ wood }: { wood: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M1 9.6 C2 7 1 5 2.6 3 M9 9.6 C8 7 9 5 7.4 3 M3.6 9.6 C4.4 7.6 3.4 6.4 4.4 5 M6.4 9.6 C5.6 7.6 6.6 6.4 5.6 5" fill="none" stroke={wood} strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}
function WeRootedScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Roots wood={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const heavy: [number, number, "r" | "q", number][] = [[0, 6, "r", 90], [3, 6, "q", 45], [7, 6, "r", 180]];
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 400}>
      <Frame anchored={anchored}>
        <span className="grp-tellglow absolute block" style={{ ...ranks(6, 1), background: tint(p0, 0.25), animationDelay: dm(delayMs, 60) }} />
        {heavy.map(([c, r, kind, a], i) => (
          <span key={c}>
            {/* tell: the ground cracks under the piece */}
            <span className="grp-tellshadow absolute block rounded-full" style={{ ...sq(c, r - 0.3, 0.9), background: tint(p0, 0.6), animationDelay: dm(delayMs, 40 + i * 50) }} />
            <span className="grp-c-in absolute block" style={{ ...sq(c, r), "--gd": "1.8s", "--s0": "0.9", animationDelay: dm(delayMs, 80 + i * 50) } as CSSProperties}>
              <Man kind={kind} fill={tint(p1, 0.95)} stroke={p2} />
            </span>
            {/* strike: roots climb round it */}
            <span className="grp-c-up absolute block" style={{ ...sq(c, r, 0.95), "--gd": "1.5s", animationDelay: dm(delayMs, 380 + i * 70) } as CSSProperties}>
              <Roots wood={p0} />
            </span>
            {/* and its line is cut to nothing */}
            <Ray at={sq(c, r)} ang={a} len={3} keep={0.1} verb="grp-c-clip" color={p1} delay={dm(delayMs, 520 + i * 70)} />
          </span>
        ))}
        <Pips n={2} x={50} top="calc(50% - 1.3%)" fill={p1} rim={p2} delayMs={delayMs + 900} />
        {/* settle: soil sifts down */}
        <Flecks delayMs={delayMs + 1100} at={ranks(6, 1)} color={tint(p0, 0.8)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 400} anchored={anchored} />
    </Stage>
  );
}

/* --- unseelie_bargain ------------------------------------------------------
   "Free action: strike a bargain with the dark court and take two extra
   moves right now. When the sequence resolves the price comes due and you
   skip your next draft." A ring of toadstools rises round a contract, a
   quill signs it, the caster makes two moves in a row, and then the price:
   the caster's next draft card is crossed out. */
function Toadstool({ cap, stem }: { cap: string; stem: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M4 9.4 V5.6 H6 V9.4 Z" fill={stem} />
      <path d="M1 5.8 C1 2 9 2 9 5.8 Z" fill={cap} />
      <circle cx="3.6" cy="4.4" r="0.6" fill={stem} />
      <circle cx="6.2" cy="3.8" r="0.5" fill={stem} />
    </svg>
  );
}
function UnseelieBargainScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Toadstool cap={p1} stem={p0} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 400}>
      <Frame anchored={anchored}>
        {/* tell: the ring of toadstools rises */}
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className="grp-c-up absolute block" style={{ left: `calc(${50 + 15 * Math.cos((i / 7) * 2 * Math.PI)}% - 3%)`, top: `calc(${50 + 15 * Math.sin((i / 7) * 2 * Math.PI)}% - 3%)`, width: "6%", height: "6%", "--gd": "1.7s", animationDelay: dm(delayMs, 40 + i * 30) } as CSSProperties}>
            <Toadstool cap={p1} stem={tint(p0, 0.9)} />
          </span>
        ))}
        {/* the contract, and the quill signs it */}
        <span className="grp-c-in absolute block" style={{ left: "42%", top: "40%", width: "16%", height: "20%", "--gd": "1.1s", "--s0": "0.8", animationDelay: dm(delayMs, 160) } as CSSProperties}>
          <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
            <rect x="1" y="0.6" width="8" height="10.8" fill={tint(p1, 0.35)} stroke={p1} strokeWidth="0.5" />
            <path d="M2.4 3 H7.6 M2.4 4.8 H7.6 M2.4 6.6 H6" stroke={p1} strokeWidth="0.4" />
          </svg>
        </span>
        <span className="absolute block" style={{ left: "44%", top: "55%", width: "12%", height: "1.2%" }}>
          <span className="grp-c-draw absolute inset-0 block" style={{ background: p1, "--gd": "0.9s", animationDelay: dm(delayMs, 360) } as CSSProperties} />
        </span>
        {/* strike: two moves in a row */}
        <Ray at={sq(1, 1)} ang={-90} len={2} verb="grp-c-draw" color={p1} delay={dm(delayMs, 420)} />
        <Ray at={sq(6, 0)} ang={-116.6} len={2.24} verb="grp-c-draw" color={p1} delay={dm(delayMs, 620)} />
        {/* the price: the next draft card is crossed out */}
        <span className="grp-c-in absolute block" style={{ ...sq(3.5, 0.9, 0.8), "--gd": "1.1s", "--s0": "0.8", animationDelay: dm(delayMs, 880) } as CSSProperties}>
          <CardBack face={p0} edge={p2} />
        </span>
        <span className="grp-c-stamp absolute block" style={{ ...sq(3.5, 0.9, 0.6), "--gd": "0.9s", "--r0": "20deg", animationDelay: dm(delayMs, 1000) } as CSSProperties}>
          <Strike ink={p2} />
        </span>
        {/* settle: spores drift up out of the ring */}
        <Flecks delayMs={delayMs + 1100} at={{ left: "35%", top: "35%", width: "30%", height: "30%" }} color={tint(p1, 0.8)} dir={-1} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 420} anchored={anchored} />
    </Stage>
  );
}

/* --- stone_riders ----------------------------------------------------------
   "After your opponent's next move, their knights turn to walnuts for 3 of
   their turns, and the stone is catching: on each of those turns one random
   enemy piece standing beside a stone rider is petrified for 1 turn too." An
   hourglass while they move; both enemy knights shut into walnuts; a crack
   runs from one into the pawn beside it, which greys for one turn. Three
   pips. Target cut: a walnut closing on the knight's square. */
function StoneRidersScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Man kind="n" fill={p0} stroke={p2} />} />;
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="grp-tellshadow absolute block rounded-full" style={{ left: "14%", top: "60%", width: "72%", height: "28%", background: tint(p2, 0.5), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-stamp absolute block" style={{ left: "16%", top: "14%", width: "68%", height: "68%", "--gd": "1.1s", "--r0": "0deg", animationDelay: dm(delayMs, 140) } as CSSProperties}>
          <Walnut shell={p0} seam={p2} />
        </span>
        <Flecks delayMs={delayMs + 500} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p0, 0.8)} n={3} />
      </span>
    );
  }
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 560}>
      <Frame anchored={anchored}>
        {/* tell: they move first */}
        <span className="grp-c-pip absolute block" style={{ ...sq(3.5, 5.6, 0.42), "--gd": "0.7s", animationDelay: dm(delayMs, 0) } as CSSProperties}>
          <Hourglass glass={p1} sand={p0} />
        </span>
        {[1, 6].map((c, i) => (
          <span key={c}>
            <span className="grp-c-in absolute block" style={{ ...sq(c, 5), "--gd": "0.75s", "--s0": "0.9", "--ty0": "calc(var(--fx-side, 1) * -20%)", animationDelay: dm(delayMs, 100 + i * 50) } as CSSProperties}>
              <Man kind="n" fill={tint(p1, 0.95)} stroke={p2} />
            </span>
            {/* strike: each shuts into a walnut */}
            <span className="grp-c-stamp absolute block" style={{ ...sq(c, 5, 0.9), "--gd": "1.5s", "--r0": "0deg", animationDelay: dm(delayMs, 560 + i * 80) } as CSSProperties}>
              <Walnut shell={p0} seam={p2} />
            </span>
          </span>
        ))}
        {/* the stone catches: a crack runs into the pawn beside one rider */}
        <span className="grp-c-in absolute block" style={{ ...sq(2, 5), "--gd": "1.4s", "--s0": "0.9", animationDelay: dm(delayMs, 200) } as CSSProperties}>
          <Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        <Ray at={sq(1, 5)} ang={0} len={1} verb="grp-c-draw" color={p2} thick={6} delay={dm(delayMs, 760)} />
        <span className="grp-c-stamp absolute block" style={{ ...sq(2, 5), "--gd": "1s", "--r0": "0deg", animationDelay: dm(delayMs, 880) } as CSSProperties}>
          <Man kind="p" fill={p0} stroke={p2} />
        </span>
        <Pips n={3} x={50} top="calc(50% - 1.3%)" fill={p1} rim={p2} delayMs={delayMs + 960} />
        {/* settle: stone dust sinks */}
        <Flecks delayMs={delayMs + 1100} at={ranks(5, 1)} color={tint(p0, 0.8)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 560} anchored={anchored} />
    </Stage>
  );
}

/* --- royal_summons ---------------------------------------------------------
   "For your opponent's next 2 turns, they must move their king if it has a
   legal move." A herald's horn sounds on the caster's side, the summons flies
   to the enemy king, and the king is hauled a step off its square in jerks,
   while the piece beside it that wanted to move is held. Two pips. */
function HeraldHorn({ brass, rim }: { brass: string; rim: string }) {
  return (
    <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
      <path d="M0.6 3.4 H6 L11 0.8 V7.2 L6 4.6 H0.6 Z" fill={brass} stroke={rim} strokeWidth="0.5" {...SJ} />
      <path d="M3 4.6 V6.4" stroke={rim} strokeWidth="0.6" />
    </svg>
  );
}
function RoyalSummonsScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<HeraldHorn brass={p1} rim={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 500}>
      <Frame anchored={anchored}>
        {/* tell: the horn sounds on the caster's side */}
        <span className="grp-c-in absolute block" style={{ ...sq(3.5, 1.3, 1.3), height: "9%", "--gd": "1.2s", "--s0": "0.7", "--r0": "-20deg", animationDelay: dm(delayMs, 40) } as CSSProperties}>
          <HeraldHorn brass={p1} rim={p2} />
        </span>
        {/* the summons flies to their king */}
        <span className="grp-c-go absolute block" style={{ ...sq(4, 6, 0.5), "--ty0": "calc(var(--fx-side, 1) * 900%)", "--tx0": "-100%", "--gd": "0.5s", animationDelay: dm(delayMs, 200) } as CSSProperties}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <rect x="1" y="2" width="8" height="6" fill={tint(p1, 0.9)} stroke={p2} strokeWidth="0.5" />
            <circle cx="5" cy="5" r="1.4" fill={p0} />
          </svg>
        </span>
        {/* strike: the king is hauled a step off its square */}
        <span className="grp-tug absolute block" style={{ ...sq(4, 6), "--dx": "0%", "--dy": "calc(var(--fx-side, 1) * 100%)", animationDelay: dm(delayMs, 480) } as CSSProperties}>
          <Man kind="k" fill={p1} stroke={p2} />
        </span>
        {/* the piece beside it that wanted to move is held */}
        <span className="grp-c-in absolute block" style={{ ...sq(2, 6), "--gd": "1.5s", "--s0": "0.9", animationDelay: dm(delayMs, 120) } as CSSProperties}>
          <Man kind="n" fill={tint(p1, 0.8)} stroke={p2} />
        </span>
        <Ray at={sq(2, 6)} ang={116.6} len={2.24} keep={0.1} verb="grp-c-clip" color={p1} delay={dm(delayMs, 560)} />
        <Pips n={2} x={50} top="calc(50% - 1.3%)" fill={p1} rim={p2} delayMs={delayMs + 900} />
        {/* settle: the horn's notes drift off */}
        <Flecks delayMs={delayMs + 1100} at={sq(4, 5.5, 1.6)} color={tint(p1, 0.8)} dir={-1} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 500} anchored={anchored} />
    </Stage>
  );
}

/* --- nerf_hammer -----------------------------------------------------------
   "Turn one enemy knight, bishop, or rook you target into a walnut for 2 of
   their turns. It can only shuffle one square at a time." A giant foam
   hammer comes down on the target with a squash, a walnut shell closes over
   it, and its long line is cut back to one square. Two pips. Target cut: the
   shell closing on the square. */
function FoamHammer({ foam, grip }: { foam: string; grip: string }) {
  return (
    <svg viewBox="0 0 10 20" className="block h-full w-full" aria-hidden="true">
      <rect x="4.2" y="6" width="1.6" height="13.4" rx="0.8" fill={grip} />
      <rect x="0.6" y="0.6" width="8.8" height="6" rx="2.4" fill={foam} stroke={grip} strokeWidth="0.5" />
    </svg>
  );
}
function NerfHammerScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} from="above" motif={<FoamHammer foam={p1} grip={p0} />} />;
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="grp-tellglow absolute block rounded-full" style={{ left: "14%", top: "14%", width: "72%", height: "72%", background: tint(p1, 0.35), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-stamp absolute block" style={{ left: "16%", top: "16%", width: "68%", height: "68%", "--gd": "1.1s", "--r0": "0deg", animationDelay: dm(delayMs, 140) } as CSSProperties}>
          <Walnut shell={p0} seam={p2} />
        </span>
        <Flecks delayMs={delayMs + 500} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p1, 0.8)} n={3} />
      </span>
    );
  }
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 400}>
      <Frame anchored={anchored}>
        {/* tell: the hammer's shadow on the target */}
        <span className="grp-tellshadow absolute block rounded-full" style={{ ...cell(0, 0.2, 1.2), background: tint(p2, 0.55), animationDelay: dm(delayMs, 0) }} />
        {/* the hammer comes down, pivoting at the grip */}
        <span className="absolute block" style={{ left: "calc(50% + (var(--fx-ox, 0) + 1.1) * 12.5%)", top: "calc(50% + (var(--fx-oy, 0) - 1.6) * 12.5%)", width: "8%", height: "20%", transformOrigin: "50% 100%", rotate: "-80deg" }}>
          <span className="absolute inset-0 block" style={{ scale: "-1 1", transformOrigin: "50% 100%" }}>
            <span className="grp-swing absolute inset-0 block" style={{ transformOrigin: "50% 100%", animationDelay: dm(delayMs, 60) }}>
              <FoamHammer foam={p1} grip={p0} />
            </span>
          </span>
        </span>
        {/* strike: the squash, and the shell closes */}
        <span className="grp-bonk absolute block" style={{ ...cell(0, 0, 0.9), animationDelay: dm(delayMs, 360) }}>
          <Man kind="b" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        <span className="grp-c-stamp absolute block" style={{ ...cell(0, 0, 0.9), "--gd": "1.4s", "--r0": "0deg", animationDelay: dm(delayMs, 560) } as CSSProperties}>
          <Walnut shell={p0} seam={p2} />
        </span>
        {/* its long line cut back to one square */}
        <Ray at={cell(0, 0)} ang={45} len={4} keep={1.3} verb="grp-c-clip" color={p1} delay={dm(delayMs, 640)} />
        {[0, 1].map((i) => (
          <span key={i} className="grp-c-pip absolute block rounded-full" style={{ ...cell(-0.15 + i * 0.3, 0.72, 0.2), background: p1, border: `1px solid ${p2}`, "--gd": "1s", animationDelay: dm(delayMs, 920 + i * 90) } as CSSProperties} />
        ))}
        {/* settle: foam crumbs fall */}
        <Flecks delayMs={delayMs + 1100} at={cell(0, 0, 1.4)} color={tint(p1, 0.8)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 400} anchored={anchored} />
    </Stage>
  );
}

/* --- nerf_breaker ----------------------------------------------------------
   "Suspend your nerf for your next 10 turns." A crowbar wedges into the
   shackle on the caster's nerf and levers it apart; ten pips run out along
   the caster's side, and at the end a faint shackle returns (suspended, not
   removed). */
function Crowbar({ iron }: { iron: string }) {
  return (
    <svg viewBox="0 0 20 6" className="block h-full w-full" aria-hidden="true">
      <path d="M1 5 H16 C18 5 19 4 19 2.4 L17.4 1" fill="none" stroke={iron} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function NerfBreakerScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Crowbar iron={p0} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 440}>
      <Frame anchored={anchored}>
        {/* tell: the shackle, and the bar wedged into it */}
        <span className="grp-c-in absolute block" style={{ ...sq(3.5, 2, 1.3), "--gd": "0.6s", "--s0": "0.8", animationDelay: dm(delayMs, 40) } as CSSProperties}>
          <Cuff iron={p1} bolt={p0} />
        </span>
        <span className="absolute block" style={{ ...sq(3.2, 2.3, 2), height: "6%", transformOrigin: "80% 50%" }}>
          <span className="grp-swing absolute inset-0 block" style={{ transformOrigin: "80% 50%", animationDelay: dm(delayMs, 120) }}>
            <Crowbar iron={p0} />
          </span>
        </span>
        {/* strike: it levers apart */}
        {[-1, 1].map((s) => (
          <span key={s} className="grp-c-part absolute block" style={{ ...sq(3.5 + s * 0.3, 2, 0.8), "--tx1": `${s * 120}%`, "--ty1": "70%", "--r1": `${s * 50}deg`, "--gd": "0.8s", animationDelay: dm(delayMs, 440) } as CSSProperties}>
            <Cuff iron={p1} bolt={p0} />
          </span>
        ))}
        {/* ten turns */}
        <Pips n={10} x={50} top="calc(50% + var(--fx-side, 1) * 25% - 1.2%)" fill={p1} rim={p2} delayMs={delayMs + 600} size={2.4} />
        {/* suspended, not gone: a faint shackle returns at the end */}
        <span className="grp-c-in absolute block" style={{ ...sq(3.5, 2, 1.3), "--s0": "1", "--gd": "0.6s", animationDelay: dm(delayMs, 1400) } as CSSProperties}>
          <Cuff iron={tint(p1, 0.35)} bolt={tint(p0, 0.35)} />
        </span>
        {/* settle: iron flakes sink */}
        <Flecks delayMs={delayMs + 1100} at={sq(3.5, 2, 1.6)} color={tint(p0, 0.8)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 440} anchored={anchored} />
    </Stage>
  );
}

/* --- long_leash ------------------------------------------------------------
   "Suspend your nerf for your next 7 turns." The shackle's chain pays out a
   long way across the caster's side with seven links lit along it, then
   reels back in at the end. */
function LongLeashScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Cuff iron={p1} bolt={p0} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 360}>
      <Frame anchored={anchored}>
        {/* tell: the shackle at the caster's edge */}
        <span className="grp-c-in absolute block" style={{ ...sq(0.6, 1.6, 1.1), "--gd": "1.9s", "--s0": "0.8", animationDelay: dm(delayMs, 40) } as CSSProperties}>
          <Cuff iron={p1} bolt={p0} />
        </span>
        {/* strike: the chain pays out a long way */}
        <span className="absolute block" style={{ left: "12%", top: "calc(50% + var(--fx-side, 1) * 24% - 0.8%)", width: "80%", height: "1.6%" }}>
          <span className="grp-c-draw absolute inset-0 block" style={{ background: `repeating-linear-gradient(90deg, ${p1} 0 3%, transparent 3% 4.4%)`, "--gd": "1.3s", animationDelay: dm(delayMs, 300) } as CSSProperties} />
        </span>
        {/* seven links lit: seven turns */}
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className="grp-c-pip absolute block rounded-full" style={{ left: `${20 + i * 10}%`, top: "calc(50% + var(--fx-side, 1) * 24% - 1.6%)", width: "3.2%", height: "3.2%", border: `2px solid ${p0}`, "--gd": "1s", animationDelay: dm(delayMs, 420 + i * 60) } as CSSProperties} />
        ))}
        {/* ...and it reels back in */}
        <span className="grp-c-go absolute block rounded-full" style={{ left: "88%", top: "calc(50% + var(--fx-side, 1) * 24% - 2%)", width: "4%", height: "4%", background: p0, "--tx1": "-1900%", "--gd": "0.6s", animationDelay: dm(delayMs, 1150) } as CSSProperties} />
        {/* settle: links' glints sink */}
        <Flecks delayMs={delayMs + 1100} at={ranks(1.5, 1)} color={tint(p1, 0.8)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 360} anchored={anchored} />
    </Stage>
  );
}

/* --- favorable_stars -------------------------------------------------------
   "Your next draft is fated to offer tier 6 cards." A chart of the twelve
   houses is drawn over the board, stars light along one line through it, and
   the line points to the caster's next draft card, which turns up carrying
   six tier pips. */
function FavorableStarsScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  const chart = (
    <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
      <circle cx="10" cy="10" r="9.2" fill="none" stroke={p1} strokeWidth="0.4" />
      <circle cx="10" cy="10" r="5" fill="none" stroke={p1} strokeWidth="0.3" />
      {Array.from({ length: 12 }, (_, k) => (
        <path key={k} d="M10 1 V5" stroke={p1} strokeWidth="0.3" transform={`rotate(${k * 30} 10 10)`} />
      ))}
    </svg>
  );
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={chart} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 700}>
      <Frame anchored={anchored}>
        {/* tell: the chart of the houses */}
        <span className="grp-c-spin absolute block" style={{ left: "25%", top: "25%", width: "50%", height: "50%", "--r1": "60deg", "--gd": "1.9s", animationDelay: dm(delayMs, 40) } as CSSProperties}>
          {chart}
        </span>
        {/* stars light along one line, toward the caster */}
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="grp-c-pip absolute block" style={{ left: `${47 - 3 + i * 2}%`, top: `calc(50% - var(--fx-side, 1) * ${18 - i * 12}% - 3%)`, width: "6%", height: "6%", "--gd": "1.2s", animationDelay: dm(delayMs, 300 + i * 90) } as CSSProperties}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.6 L6.2 3.8 L9.4 5 L6.2 6.2 L5 9.4 L3.8 6.2 L0.6 5 L3.8 3.8 Z" fill={p1} />
            </svg>
          </span>
        ))}
        {/* strike: the next draft card turns up with six pips */}
        <span className="grp-flip absolute block" style={{ left: "44%", top: OUR_ROW, width: "12%", height: "17%", animationDelay: dm(delayMs, 700) }}>
          <TierCard face={p0} edge={p1} pip={p1} n={6} />
        </span>
        {/* settle: star dust drifts */}
        <Flecks delayMs={delayMs + 1100} at={{ left: "40%", top: OUR_ROW, width: "20%", height: "18%" }} color={tint(p1, 0.85)} dir={-1} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 700} anchored={anchored} />
    </Stage>
  );
}

/* --- death_arcana ----------------------------------------------------------
   "Choose one enemy piece except a king. It is doomed: after 3 of their turns
   it dies, wherever it has run to. Only being captured first spares it the
   mark." The thirteenth card flips face up; a scythe mark stamps on the
   chosen piece; the piece runs two squares and the mark follows it; three
   pips count down, and the last lands. */
function Scythe({ blade, haft }: { blade: string; haft: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M3 9.6 L6.6 1" stroke={haft} strokeWidth="0.8" strokeLinecap="round" />
      <path d="M6.6 1 C4 0.4 1.4 1.6 0.6 3.6 C2.4 2.6 4.4 2.4 6.2 2.2 Z" fill={blade} />
    </svg>
  );
}
function DeathArcanaScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Scythe blade={p1} haft={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 440}>
      <Frame anchored={anchored}>
        {/* tell: the thirteenth card turns face up */}
        <span className="grp-flip absolute block" style={{ ...sq(3.5, 1.4, 1.2), animationDelay: dm(delayMs, 40) }}>
          <svg viewBox="0 0 10 14" className="block h-full w-full" aria-hidden="true">
            <rect x="0.6" y="0.6" width="8.8" height="12.8" fill={p0} stroke={p1} strokeWidth="0.6" />
            <path d="M3 4 H4.2 V8 M5.4 4 H7 L5.8 6 C7.2 6 7.2 8 5.6 8" fill="none" stroke={p1} strokeWidth="0.6" />
          </svg>
        </span>
        {/* strike: the mark stamps on the chosen piece */}
        <span className="grp-c-in absolute block" style={{ ...cell(0, 0, 0.9), "--gd": "0.7s", "--s0": "0.9", "--ty0": "calc(var(--fx-side, 1) * -10%)", animationDelay: dm(delayMs, 200) } as CSSProperties}>
          <Man kind="r" fill={tint(p1, 0.9)} stroke={p2} />
        </span>
        <span className="grp-c-stamp absolute block" style={{ ...cell(0, -0.5, 0.45), "--gd": "0.6s", "--r0": "-20deg", animationDelay: dm(delayMs, 420) } as CSSProperties}>
          <Scythe blade={p1} haft={p2} />
        </span>
        {/* it runs, and the mark follows */}
        <span className="grp-c-go absolute block" style={{ ...cell(0, 0, 0.9), "--tx1": "200%", "--gd": "0.7s", animationDelay: dm(delayMs, 700) } as CSSProperties}>
          <Man kind="r" fill={tint(p1, 0.9)} stroke={p2} />
        </span>
        <span className="grp-c-go absolute block" style={{ ...cell(0, -0.5, 0.45), "--tx1": "400%", "--gd": "0.7s", animationDelay: dm(delayMs, 740) } as CSSProperties}>
          <Scythe blade={p1} haft={p2} />
        </span>
        {/* three pips count down */}
        {[0, 1, 2].map((i) => (
          <span key={i} className="grp-c-pip absolute block rounded-full" style={{ ...cell(1.7 + i * 0.3, 0.72, 0.2), background: i === 2 ? p1 : tint(p1, 0.5), border: `1px solid ${p2}`, "--gd": "0.8s", animationDelay: dm(delayMs, 980 + i * 90) } as CSSProperties} />
        ))}
        {/* settle: black petals fall where it will fall */}
        <Flecks delayMs={delayMs + 1150} at={cell(2, 0, 1.4)} color={tint(p2, 0.9)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 440} anchored={anchored} />
    </Stage>
  );
}

/* --- atomic_reaction -------------------------------------------------------
   "Your next two captures each detonate: the two enemy pieces immediately
   left and right of the captured square, kings aside, are removed. The blast
   never chains." The capture lands, and the blast runs out sideways only:
   the piece to the left and the piece to the right are blown off along the
   rank, the squares above and below untouched. Two charges, one spent. */
function AtomicReactionScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Trefoil fill={p1} hole={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 440}>
      <Frame anchored={anchored}>
        {/* tell: the capture runs in */}
        <span className="grp-tellglow absolute block rounded-full" style={{ ...cell(0, 0, 1.3), background: tint(p1, 0.4), animationDelay: dm(delayMs, 40) }} />
        {[-1, 1].map((dx, i) => (
          <span key={dx} className="grp-c-in absolute block" style={{ ...cell(dx, 0, 0.9), "--gd": "0.6s", "--s0": "0.9", "--ty0": "calc(var(--fx-side, 1) * -10%)", animationDelay: dm(delayMs, 100 + i * 40) } as CSSProperties}>
            <Man kind={i ? "b" : "n"} fill={tint(p2, 0.9)} stroke={p1} />
          </span>
        ))}
        <span className="grp-c-in absolute block" style={{ ...cell(0, -1, 0.9), "--gd": "1.7s", "--s0": "0.9", animationDelay: dm(delayMs, 160) } as CSSProperties}>
          <Man kind="p" fill={tint(p2, 0.9)} stroke={p1} />
        </span>
        {/* strike: the blast runs out sideways only */}
        <span className="grp-flash absolute block rounded-full" style={{ ...cell(0, 0, 1.2), background: tint(p1, 0.7), animationDelay: dm(delayMs, 420) }} />
        <span className="grp-c-draw absolute block" style={{ ...cell(0, 0, 3), height: "4%", marginTop: "16.75%", background: `linear-gradient(90deg, ${tint(p0, 0)}, ${p0}, ${tint(p0, 0)})`, "--gd": "0.8s", animationDelay: dm(delayMs, 440) } as CSSProperties} />
        {[-1, 1].map((dx, i) => (
          <span key={`b${dx}`} className="grp-c-blast absolute block" style={{ ...cell(dx, 0, 0.9), "--tx1": `${dx * 150}%`, "--ty1": "-20%", "--gd": "0.8s", animationDelay: dm(delayMs, 480 + i * 30) } as CSSProperties}>
            <Man kind={i ? "b" : "n"} fill={p0} stroke={p2} />
          </span>
        ))}
        {/* two charges, one spent */}
        {[0, 1].map((i) => (
          <span key={i} className={`${i === 0 ? "grp-c-part" : "grp-c-pip"} absolute block`} style={{ ...cell(-0.2 + i * 0.4, 0.75, 0.3), "--tx1": "0%", "--ty1": "-60%", "--r1": "25deg", "--gd": i === 0 ? "0.7s" : "1.2s", animationDelay: dm(delayMs, i === 0 ? 700 : 800) } as CSSProperties}>
            <Trefoil fill={p1} hole={p2} />
          </span>
        ))}
        {/* settle: fallout sinks along the rank */}
        <Flecks delayMs={delayMs + 1100} at={cell(0, 0, 3)} color={tint(p0, 0.75)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 440} anchored={anchored} />
    </Stage>
  );
}

/* --- ascendant_knight ------------------------------------------------------
   "One knight moves as an amazon for your next 2 turns." The chosen knight
   takes a crown; its eight knight's jumps are marked and then the queen's
   eight long lines run out of it as well: both at once. Two pips. Target
   cut: a crown settling on the knight. */
function AscendantKnightScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} from="above" motif={<Crown fill={p1} stroke={p2} />} />;
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="grp-tellglow absolute block rounded-full" style={{ left: "14%", top: "14%", width: "72%", height: "72%", background: tint(p1, 0.35), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-stamp absolute block" style={{ left: "22%", top: "6%", width: "56%", height: "36%", "--gd": "1.1s", "--r0": "0deg", animationDelay: dm(delayMs, 140) } as CSSProperties}>
          <Crown fill={p1} stroke={p2} />
        </span>
        <Flecks delayMs={delayMs + 500} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p1, 0.8)} dir={-1} n={3} />
      </span>
    );
  }
  const jumps: [number, number][] = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 440}>
      <Frame anchored={anchored}>
        {/* tell: the knight, and a crown lowering onto it */}
        <span className="grp-c-in absolute block" style={{ ...cell(0, 0, 0.9), "--gd": "1.9s", "--s0": "0.9", animationDelay: dm(delayMs, 0) } as CSSProperties}>
          <Man kind="n" fill={p1} stroke={p2} />
        </span>
        <span className="grp-c-in absolute block" style={{ ...cell(0, -0.5, 0.55), height: "4.5%", "--ty0": "calc(var(--fx-side, 1) * -180%)", "--s0": "1", "--gd": "1.8s", animationDelay: dm(delayMs, 120) } as CSSProperties}>
          <Crown fill={p1} stroke={p2} />
        </span>
        {/* strike: its eight jumps... */}
        {jumps.map(([dx, dy], i) => (
          <span key={i} className="grp-c-pip absolute block rounded-full" style={{ ...cell(dx, dy, 0.24), background: p1, border: `1px solid ${p2}`, "--gd": "1.1s", animationDelay: dm(delayMs, 420 + i * 25) } as CSSProperties} />
        ))}
        {/* ...and the queen's lines as well */}
        {RING8.map(([dx, dy], i) => (
          <span key={`q${i}`} className="absolute block" style={{ ...cell(0, 0), rotate: `${Math.round((Math.atan2(dy, dx) * 180) / Math.PI)}deg` }}>
            <span className="grp-c-draw absolute block" style={{ left: "50%", top: "47%", width: "300%", height: "6%", background: `linear-gradient(90deg, ${p0}, ${tint(p0, 0)})`, "--gd": "1.2s", animationDelay: dm(delayMs, 620 + i * 25) } as CSSProperties} />
          </span>
        ))}
        {[0, 1].map((i) => (
          <span key={`t${i}`} className="grp-c-in absolute block rounded-full" style={{ ...cell(-0.15 + i * 0.3, 0.72, 0.2), background: p1, border: `1px solid ${p2}`, "--s0": "0.2", "--gd": "1s", animationDelay: dm(delayMs, 900 + i * 90) } as CSSProperties} />
        ))}
        {/* settle: gold motes climb */}
        <Flecks delayMs={delayMs + 1100} at={cell(0, 0, 1.4)} color={tint(p1, 0.85)} dir={-1} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 440} anchored={anchored} />
    </Stage>
  );
}

/* --- wc_wrong_way ----------------------------------------------------------
   "After their next move, for the 2 turns that follow none of them may
   retreat toward their own back rank." A signpost on their side spins round
   to point the wrong way; three of their pieces reach back toward home and
   each retreat is cut off, while one pushes forward freely. Two pips. */
function Signpost({ wood, ink }: { wood: string; ink: string }) {
  return (
    <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
      <path d="M4.6 11.6 V2" stroke={wood} strokeWidth="1" />
      <path d="M1 2.4 H7.4 L9 3.8 L7.4 5.2 H1 Z" fill={wood} stroke={ink} strokeWidth="0.4" {...SJ} />
    </svg>
  );
}
function WcWrongWayScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Signpost wood={p0} ink={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const back: [number, number, "r" | "b" | "n", number][] = [[1, 4, "r", -90], [4, 5, "b", -45], [6, 4, "n", -116.6]];
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 480}>
      <Frame anchored={anchored}>
        {/* tell: the signpost, and it spins round */}
        <span className="grp-c-spin absolute block" style={{ ...sq(3.5, 5.5, 1.3), "--r1": "180deg", "--gd": "1.9s", animationDelay: dm(delayMs, 40) } as CSSProperties}>
          <Signpost wood={p0} ink={p1} />
        </span>
        {back.map(([c, r, kind, a], i) => (
          <span key={c}>
            <span className="grp-c-in absolute block" style={{ ...sq(c, r), "--gd": "1.7s", "--s0": "0.9", animationDelay: dm(delayMs, 120 + i * 40) } as CSSProperties}>
              <Man kind={kind} fill={tint(p1, 0.95)} stroke={p2} />
            </span>
            {/* strike: each retreat toward home is cut off */}
            <Ray at={sq(c, r)} ang={a} len={2.24} keep={0.12} verb="grp-c-clip" color={p1} delay={dm(delayMs, 440 + i * 70)} />
          </span>
        ))}
        {/* while a push forward runs free */}
        <Ray at={sq(1, 4)} ang={90} len={2} verb="grp-c-draw" color={tint(p1, 0.8)} delay={dm(delayMs, 760)} />
        <Pips n={2} x={50} top="calc(50% - 1.3%)" fill={p1} rim={p2} delayMs={delayMs + 900} />
        {/* settle: dust off the post */}
        <Flecks delayMs={delayMs + 1050} at={sq(3.5, 5.5, 1.6)} color={tint(p0, 0.8)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 480} anchored={anchored} />
    </Stage>
  );
}

/* --- wc_broken_elevator ----------------------------------------------------
   "For their next 2 turns your opponent cannot move any piece onto either of
   your two back ranks. The first piece turned away still gets to make that
   one move." Lift doors slide shut over the caster's back two ranks with an
   out-of-order bar across them; an enemy rook's line into them is stopped at
   the doors, but the first enemy knight to try slips through before they
   close. Two pips. */
function WcBrokenElevatorScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  const doors = (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <rect x="0.6" y="0.6" width="8.8" height="8.8" fill="none" stroke={p0} strokeWidth="0.7" />
      <path d="M5 0.6 V9.4" stroke={p0} strokeWidth="0.6" />
    </svg>
  );
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={doors} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 600}>
      <Frame anchored={anchored}>
        {/* tell: the first knight slips through before the doors shut */}
        <span className="grp-c-go absolute block" style={{ ...sq(2, 1), "--tx0": "100%", "--ty0": "calc(var(--fx-side, 1) * -200%)", "--gd": "0.55s", animationDelay: dm(delayMs, 40) } as CSSProperties}>
          <Man kind="n" fill={tint(p2, 0.9)} stroke={p1} />
        </span>
        {/* the doors slide shut over the back two ranks */}
        {[-1, 1].map((s) => (
          <span key={s} className="grp-c-in absolute block" style={{ ...ranks(0.5, 2), left: s < 0 ? "0%" : "50%", width: "50%", background: tint(p0, 0.35), border: `2px solid ${p0}`, "--tx0": `${s * 100}%`, "--s0": "1", "--gd": "1.6s", animationDelay: dm(delayMs, 360) } as CSSProperties} />
        ))}
        <span className="grp-c-stamp absolute block" style={{ left: "20%", top: "calc(50% + var(--fx-side, 1) * 37.5% - 2%)", width: "60%", height: "4%", background: `repeating-linear-gradient(45deg, ${p1} 0 6px, ${p2} 6px 12px)`, "--gd": "1.2s", "--r0": "0deg", animationDelay: dm(delayMs, 600) } as CSSProperties} />
        {/* strike: a rook's line into them stops at the doors */}
        <span className="grp-c-in absolute block" style={{ ...sq(6, 6), "--gd": "1.5s", "--s0": "0.9", animationDelay: dm(delayMs, 200) } as CSSProperties}>
          <Man kind="r" fill={tint(p2, 0.9)} stroke={p1} />
        </span>
        <Ray at={sq(6, 6)} ang={90} len={6} keep={3.9} verb="grp-c-clip" color={p1} delay={dm(delayMs, 640)} />
        <Pips n={2} x={50} top="calc(50% - 1.3%)" fill={p1} rim={p2} delayMs={delayMs + 900} />
        {/* settle: dust sifts off the doors */}
        <Flecks delayMs={delayMs + 1050} at={ranks(0.5, 2)} color={tint(p0, 0.8)} n={5} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 600} anchored={anchored} />
    </Stage>
  );
}

/* --- wardens_bribe ---------------------------------------------------------
   "Free action: suspend your nerf for your next 6 turns, used at the moment
   you choose." A coin is slipped to the warden, whose key turns in the
   shackle's lock; the shackle falls open and six pips count the turns it
   stays off. */
function Key({ iron }: { iron: string }) {
  return (
    <svg viewBox="0 0 12 6" className="block h-full w-full" aria-hidden="true">
      <circle cx="2.6" cy="3" r="2" fill="none" stroke={iron} strokeWidth="0.9" />
      <path d="M4.6 3 H11.4 M9.4 3 V5 M11 3 V4.6" stroke={iron} strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}
function WardensBribeScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Key iron={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 520}>
      <Frame anchored={anchored}>
        {/* tell: a coin is slipped across */}
        <span className="grp-c-go absolute block rounded-full" style={{ ...sq(3.5, 2.2, 0.36), background: p1, border: `1px solid ${p2}`, "--tx0": "-400%", "--gd": "0.6s", animationDelay: dm(delayMs, 40) } as CSSProperties} />
        <span className="grp-c-in absolute block" style={{ ...sq(3.5, 1.4, 1.2), "--gd": "1s", "--s0": "0.8", animationDelay: dm(delayMs, 120) } as CSSProperties}>
          <Cuff iron={p0} bolt={p1} />
        </span>
        {/* the key turns in the lock */}
        <span className="grp-c-spin absolute block" style={{ ...sq(4.4, 1.2, 0.7), height: "4.4%", "--r1": "90deg", "--gd": "0.8s", animationDelay: dm(delayMs, 300) } as CSSProperties}>
          <Key iron={p1} />
        </span>
        {/* strike: the shackle falls open */}
        {[-1, 1].map((s) => (
          <span key={s} className="grp-c-part absolute block" style={{ ...sq(3.5 + s * 0.3, 1.4, 0.7), "--tx1": `${s * 100}%`, "--ty1": "60%", "--r1": `${s * 45}deg`, "--gd": "0.8s", animationDelay: dm(delayMs, 520) } as CSSProperties}>
            <Cuff iron={p0} bolt={p1} />
          </span>
        ))}
        {/* six turns */}
        <Pips n={6} x={50} top="calc(50% + var(--fx-side, 1) * 22% - 1.3%)" fill={p1} rim={p2} delayMs={delayMs + 700} />
        {/* settle: glints sink */}
        <Flecks delayMs={delayMs + 1050} at={sq(3.5, 1.4, 1.6)} color={tint(p1, 0.8)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 520} anchored={anchored} />
    </Stage>
  );
}

/* --- wa_conjure_rook -------------------------------------------------------
   "Conjure a spectral rook into your pocket, then spend a later turn to drop
   it onto any empty square. It stays as long as you do." Motes gather into a
   pale rook over the chosen square, it drifts into a pocket at the caster's
   edge, and a dashed outline on an empty square shows where it can be
   dropped later. Target cut: the pale rook forming on the square. */
function WaConjureRookScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Man kind="r" fill={tint(p1, 0.55)} stroke={p1} />} />;
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="grp-tellglow absolute block rounded-full" style={{ left: "14%", top: "14%", width: "72%", height: "72%", background: tint(p1, 0.35), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-up absolute block" style={{ left: "16%", top: "12%", width: "68%", height: "72%", "--gd": "1.1s", animationDelay: dm(delayMs, 140) } as CSSProperties}>
          <Man kind="r" fill={tint(p1, 0.55)} stroke={p1} />
        </span>
        <Flecks delayMs={delayMs + 500} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p1, 0.8)} dir={-1} n={3} />
      </span>
    );
  }
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 420}>
      <Frame anchored={anchored}>
        {/* tell: motes gather */}
        <span className="grp-tellglow absolute block rounded-full" style={{ ...cell(0, 0, 1.4), background: tint(p1, 0.4), animationDelay: dm(delayMs, 40) }} />
        {/* strike: a pale rook forms */}
        <span className="grp-c-up absolute block" style={{ ...cell(0, 0, 0.9), "--gd": "0.7s", animationDelay: dm(delayMs, 360) } as CSSProperties}>
          <Man kind="r" fill={tint(p1, 0.55)} stroke={p1} />
        </span>
        {/* it drifts into the pocket at the caster's edge */}
        <span className="grp-c-go absolute block" style={{ ...cell(0, 0, 0.9), "--tx1": "calc((3 - var(--fx-ox, 0)) * 100%)", "--ty1": "calc((var(--fx-side, 1) * 3.6 - var(--fx-oy, 0)) * 100%)", "--gd": "0.8s", animationDelay: dm(delayMs, 760) } as CSSProperties}>
          <Man kind="r" fill={tint(p1, 0.55)} stroke={p1} />
        </span>
        <span className="grp-c-up absolute block" style={{ ...sq(6.6, 0.3, 0.9), "--gd": "1.2s", animationDelay: dm(delayMs, 700) } as CSSProperties}>
          <Pouch cloth={p0} tie={p1} />
        </span>
        {/* where it can be dropped later */}
        <span className="grp-c-in absolute block" style={{ ...sq(2, 3, 0.9), border: `2px dashed ${tint(p1, 0.8)}`, "--s0": "1", "--gd": "1s", animationDelay: dm(delayMs, 980) } as CSSProperties} />
        {/* settle: motes rise off the pocket */}
        <Flecks delayMs={delayMs + 1050} at={sq(6.6, 0.3, 1.2)} color={tint(p1, 0.8)} dir={-1} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 420} anchored={anchored} />
    </Stage>
  );
}

/* --- round_table -----------------------------------------------------------
   "One sworn knight answers your call and waits in your pocket: spend a later
   turn to drop it onto any empty square." A round table is set, a knight
   rises at it and bows with a raised sword, then walks off into a pocket at
   the caster's edge to wait. */
function RoundTableScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  const table = (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <circle cx="5" cy="5" r="4.2" fill={p0} stroke={p2} strokeWidth="0.6" />
      <circle cx="5" cy="5" r="2.2" fill="none" stroke={p1} strokeWidth="0.4" />
    </svg>
  );
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={table} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 440}>
      <Frame anchored={anchored}>
        {/* tell: the round table is set */}
        <span className="grp-c-in absolute block" style={{ ...cell(0, 0.3, 1.5), "--gd": "1.4s", "--s0": "0.5", animationDelay: dm(delayMs, 40) } as CSSProperties}>
          {table}
        </span>
        {/* strike: the knight rises at it and raises a sword */}
        <span className="grp-c-up absolute block" style={{ ...cell(0, -0.4, 0.8), "--gd": "0.8s", animationDelay: dm(delayMs, 300) } as CSSProperties}>
          <Man kind="n" fill={p1} stroke={p2} />
        </span>
        <span className="absolute block" style={{ ...cell(0.35, -0.6, 0.5), transformOrigin: "50% 100%" }}>
          <span className="grp-swing absolute inset-0 block" style={{ transformOrigin: "50% 100%", animationDelay: dm(delayMs, 360) }}>
            <svg viewBox="0 0 4 10" className="block h-full w-full" aria-hidden="true">
              <path d="M2 0.6 V7.4 M0.6 7.4 H3.4 M2 7.4 V9.4" stroke={p1} strokeWidth="0.7" strokeLinecap="round" />
            </svg>
          </span>
        </span>
        {/* it walks off into the pocket to wait */}
        <span className="grp-c-go absolute block" style={{ ...cell(0, -0.4, 0.8), "--tx1": "calc((3.4 - var(--fx-ox, 0)) * 100%)", "--ty1": "calc((var(--fx-side, 1) * 4 - var(--fx-oy, 0)) * 100%)", "--gd": "0.8s", animationDelay: dm(delayMs, 820) } as CSSProperties}>
          <Man kind="n" fill={p1} stroke={p2} />
        </span>
        <span className="grp-c-up absolute block" style={{ ...sq(6.6, 0.3, 0.9), "--gd": "1.2s", animationDelay: dm(delayMs, 760) } as CSSProperties}>
          <Pouch cloth={p0} tie={p1} />
        </span>
        {/* settle: motes drift off the table */}
        <Flecks delayMs={delayMs + 1050} at={cell(0, 0.3, 1.5)} color={tint(p1, 0.8)} dir={-1} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 440} anchored={anchored} />
    </Stage>
  );
}

/* --- riddle_game -----------------------------------------------------------
   "Your opponent's next two drafts are skipped, but so is your own next one."
   A riddle card flips to a question mark in the middle of the board; then
   two draft cards on their side and one on the caster's are crossed out. */
function RiddleGameScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  const riddle = (
    <svg viewBox="0 0 10 14" className="block h-full w-full" aria-hidden="true">
      <rect x="0.6" y="0.6" width="8.8" height="12.8" fill={p0} stroke={p1} strokeWidth="0.6" />
      <path d="M3.4 4.6 C3.4 2.4 6.6 2.4 6.6 4.6 C6.6 6 5 6.2 5 8" fill="none" stroke={p1} strokeWidth="0.9" strokeLinecap="round" />
      <circle cx="5" cy="10.2" r="0.6" fill={p1} />
    </svg>
  );
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={riddle} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const crossed: [string, number, number][] = [[THEIR_ROW, 30, 0], [THEIR_ROW, 56, 1], [OUR_ROW, 43, 2]];
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 560}>
      <Frame anchored={anchored}>
        {/* tell: the riddle card flips */}
        <span className="grp-flip absolute block" style={{ left: "44%", top: "41%", width: "12%", height: "18%", animationDelay: dm(delayMs, 40) }}>
          {riddle}
        </span>
        {/* strike: two drafts on their side and one on the caster's are crossed */}
        {crossed.map(([top, x, i]) => (
          <span key={`${x}${i}`}>
            <span className="grp-c-in absolute block" style={{ left: `${x}%`, top, width: "13%", height: "18%", "--gd": "1.2s", "--s0": "0.8", animationDelay: dm(delayMs, 420 + i * 90) } as CSSProperties}>
              <CardBack face={tint(p1, 0.85)} edge={p2} />
            </span>
            <span className="grp-c-stamp absolute block" style={{ left: `${x + 1.5}%`, top: `calc(${top} + 3%)`, width: "10%", height: "12%", "--gd": "0.9s", "--r0": "20deg", animationDelay: dm(delayMs, 560 + i * 90) } as CSSProperties}>
              <Strike ink={p2} />
            </span>
          </span>
        ))}
        {/* settle: motes drift off the riddle */}
        <Flecks delayMs={delayMs + 1050} at={{ left: "40%", top: "40%", width: "20%", height: "20%" }} color={tint(p1, 0.8)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 560} anchored={anchored} />
    </Stage>
  );
}

/* --- queens_handicap -------------------------------------------------------
   "For their next 3 turns her every move must end beside another of their
   own pieces. No escort, no move." Their queen tries a long move to an
   empty stretch and it is cut; a shorter move landing beside one of their
   pawns runs through, and a bond ties her to the pawn. Three pips. */
function QueensHandicapScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Man kind="q" fill={p1} stroke={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 520}>
      <Frame anchored={anchored}>
        {/* tell: their queen, and a pawn of theirs nearby */}
        <span className="grp-c-in absolute block" style={{ ...sq(3, 6), "--gd": "1.9s", "--s0": "0.9", "--ty0": "calc(var(--fx-side, 1) * -10%)", animationDelay: dm(delayMs, 40) } as CSSProperties}>
          <Man kind="q" fill={p1} stroke={p2} />
        </span>
        <span className="grp-c-in absolute block" style={{ ...sq(6, 4), "--gd": "1.9s", "--s0": "0.9", animationDelay: dm(delayMs, 100) } as CSSProperties}>
          <Man kind="p" fill={tint(p1, 0.85)} stroke={p2} />
        </span>
        {/* strike: the lone long move is cut */}
        <Ray at={sq(3, 6)} ang={135} len={4.24} keep={0.3} verb="grp-c-clip" color={p1} delay={dm(delayMs, 320)} />
        <span className="grp-c-stamp absolute block" style={{ ...sq(1.2, 4.2, 0.5), "--gd": "1s", "--r0": "0deg", animationDelay: dm(delayMs, 520) } as CSSProperties}>
          <Strike ink={p1} />
        </span>
        {/* the escorted move runs, and a bond ties her to the pawn */}
        <Ray at={sq(3, 6)} ang={45} len={2.83} verb="grp-c-draw" color={p0} delay={dm(delayMs, 640)} />
        <Ray at={sq(5, 4)} ang={0} len={1} verb="grp-c-draw" color={p1} thick={10} delay={dm(delayMs, 860)} />
        <Pips n={3} x={50} top="calc(50% - 1.3%)" fill={p1} rim={p2} delayMs={delayMs + 920} />
        {/* settle: motes drift round the pair */}
        <Flecks delayMs={delayMs + 1050} at={sq(5.5, 4, 2)} color={tint(p1, 0.8)} dir={-1} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 520} anchored={anchored} />
    </Stage>
  );
}

/* --- palsied_hands ---------------------------------------------------------
   "For your opponent's next 5 turns, they cannot capture on two turns in a
   row." One of their captures lands; on the next turn another capture line
   shakes and falls short. Five pips, alternating open and closed. */
function PalsiedHandsScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Man kind="p" fill={p1} stroke={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 360}>
      <Frame anchored={anchored}>
        {/* tell: their first capture lands */}
        <Ray at={sq(2, 5)} ang={45} len={1.41} verb="grp-c-draw" color={p2} delay={dm(delayMs, 40)} />
        <span className="grp-c-blast absolute block" style={{ ...sq(3, 4, 0.7), "--tx1": "60%", "--ty1": "calc(var(--fx-side, 1) * 80%)", "--gd": "0.6s", animationDelay: dm(delayMs, 300) } as CSSProperties}>
          <Man kind="n" fill={p1} stroke={p2} />
        </span>
        {/* strike: the next one shakes and falls short */}
        <span className="grp-shiver absolute block" style={{ ...sq(5, 5), animationDelay: dm(delayMs, 520) }}>
          <Man kind="b" fill={tint(p2, 0.9)} stroke={p1} />
        </span>
        <Ray at={sq(5, 5)} ang={135} len={2.83} keep={0.6} verb="grp-c-clip" color={p1} delay={dm(delayMs, 560)} />
        {/* five turns: capture, rest, capture, rest, capture */}
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="grp-c-pip absolute block rounded-full" style={{ left: `${40 + i * 5}%`, top: "calc(50% - 1.3%)", width: "2.6%", height: "2.6%", background: i % 2 ? "transparent" : p1, border: `1.5px solid ${p0}`, "--gd": "1s", animationDelay: dm(delayMs, 820 + i * 60) } as CSSProperties} />
        ))}
        {/* settle: a tremor of motes */}
        <Flecks delayMs={delayMs + 1050} at={sq(4.5, 4.5, 2)} color={tint(p1, 0.8)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 360} anchored={anchored} />
    </Stage>
  );
}

/* --- iron_reign ------------------------------------------------------------
   "Your king cannot be captured for 1 full turn." An iron crown is set on
   the caster's king and an enemy line that runs at him stops at the iron.
   One pip. Target cut: the iron crown on the king's square. */
function IronReignScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} from="above" motif={<Crown fill={p0} stroke={p2} />} />;
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="grp-tellglow absolute block rounded-full" style={{ left: "14%", top: "14%", width: "72%", height: "72%", background: tint(p1, 0.35), animationDelay: dm(delayMs, 0) }} />
        <span className="grp-c-stamp absolute block" style={{ left: "20%", top: "2%", width: "60%", height: "40%", "--gd": "1.1s", "--r0": "0deg", animationDelay: dm(delayMs, 140) } as CSSProperties}>
          <Crown fill={p0} stroke={p2} />
        </span>
        <Flecks delayMs={delayMs + 500} at={{ left: "0%", top: "0%", width: "100%", height: "100%" }} color={tint(p0, 0.8)} n={3} />
      </span>
    );
  }
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 440}>
      <Frame anchored={anchored}>
        {/* tell: the king */}
        <span className="grp-tellglow absolute block rounded-full" style={{ ...cell(0, 0, 1.4), background: tint(p1, 0.4), animationDelay: dm(delayMs, 40) }} />
        <span className="grp-c-in absolute block" style={{ ...cell(0, 0, 0.9), "--gd": "1.8s", "--s0": "0.9", animationDelay: dm(delayMs, 60) } as CSSProperties}>
          <Man kind="k" fill={p1} stroke={p2} />
        </span>
        {/* strike: the iron crown is set on him */}
        <span className="grp-c-stamp absolute block" style={{ ...cell(0, -0.52, 0.6), height: "5%", "--gd": "1.5s", "--r0": "0deg", animationDelay: dm(delayMs, 360) } as CSSProperties}>
          <Crown fill={p0} stroke={p2} />
        </span>
        {/* an enemy line runs at him and stops at the iron */}
        <span className="absolute block" style={{ ...cell(0, 0), rotate: "calc(var(--fx-side, 1) * -90deg)" }}>
          <span className="grp-c-go absolute block" style={{ left: "62%", top: "45%", width: "180%", height: "10%", background: `linear-gradient(90deg, ${p2}, ${tint(p2, 0)})`, "--tx0": "140%", "--gd": "0.6s", animationDelay: dm(delayMs, 560) } as CSSProperties} />
        </span>
        <span className="grp-c-blast absolute block rounded-full" style={{ ...cell(0, -0.62, 0.22), background: p1, "--tx1": "120%", "--ty1": "-140%", "--gd": "0.6s", animationDelay: dm(delayMs, 760) } as CSSProperties} />
        <span className="grp-c-pip absolute block rounded-full" style={{ ...cell(0, 0.72, 0.2), background: p1, border: `1px solid ${p2}`, "--gd": "1s", animationDelay: dm(delayMs, 900) } as CSSProperties} />
        {/* settle: iron flecks sink */}
        <Flecks delayMs={delayMs + 1050} at={cell(0, 0, 1.4)} color={tint(p0, 0.8)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 440} anchored={anchored} />
    </Stage>
  );
}

/* --- hexed_satchel ---------------------------------------------------------
   "Your opponent's next drafted card arrives nullified and does nothing, and
   in return they gain one draft reroll for a later offer." A satchel sits on
   their side; their next card drops into it and comes back out grey with a
   null ring, and a reroll die pops out after it. */
function HexedSatchelScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Pouch cloth={p0} tie={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const bag: CSSProperties = { left: "42%", top: "calc(50% - var(--fx-side, 1) * 16% - 7%)", width: "16%", height: "16%" };
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 440}>
      <Frame anchored={anchored}>
        {/* tell: the satchel */}
        <span className="grp-c-up absolute block" style={{ ...bag, "--gd": "1.9s", animationDelay: dm(delayMs, 40) } as CSSProperties}>
          <Pouch cloth={p0} tie={p1} />
        </span>
        {/* their next card drops in... */}
        <span className="grp-c-go absolute block" style={{ left: "44%", top: THEIR_ROW, width: "12%", height: "16%", "--ty0": "calc(var(--fx-side, 1) * -80%)", "--ty1": "calc(var(--fx-side, 1) * 50%)", "--gd": "0.6s", animationDelay: dm(delayMs, 160) } as CSSProperties}>
          <CardBack face={p1} edge={p2} />
        </span>
        {/* strike: ...and comes out grey, nulled */}
        <span className="grp-c-go absolute block" style={{ left: "44%", top: THEIR_ROW, width: "12%", height: "16%", "--tx0": "0%", "--ty0": "calc(var(--fx-side, 1) * 50%)", "--tx1": "-160%", "--ty1": "calc(var(--fx-side, 1) * -10%)", "--gd": "1s", animationDelay: dm(delayMs, 440) } as CSSProperties}>
          <CardBack face={tint(p2, 0.8)} edge={p0} />
        </span>
        <span className="grp-c-stamp absolute block rounded-full" style={{ left: "27%", top: `calc(${THEIR_ROW} + 2%)`, width: "10%", height: "10%", border: `2px solid ${p1}`, "--gd": "0.9s", "--r0": "0deg", animationDelay: dm(delayMs, 760) } as CSSProperties} />
        {/* a reroll die pops out after it */}
        <span className="grp-c-go absolute block" style={{ left: "46%", top: "calc(50% - var(--fx-side, 1) * 16% - 3%)", width: "7%", height: "7%", "--tx1": "220%", "--ty1": "calc(var(--fx-side, 1) * -120%)", "--gd": "0.8s", animationDelay: dm(delayMs, 820) } as CSSProperties}>
          <Die fill={p1} pip={p2} />
        </span>
        {/* settle: hex motes sink */}
        <Flecks delayMs={delayMs + 1050} at={bag} color={tint(p1, 0.8)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 440} anchored={anchored} />
    </Stage>
  );
}

/* --- extra_move_repeat -----------------------------------------------------
   "Take two moves in a row on your next full turn. You cannot capture the
   king on the bonus move." The caster's piece moves, then moves again at
   once (two marks, one per move); a line from the second move toward the
   enemy king is cut short of him. */
function ExtraMoveRepeatScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Hourglass glass={p1} sand={p0} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 520}>
      <Frame anchored={anchored}>
        {/* tell: the caster's knight */}
        <span className="grp-tellglow absolute block rounded-full" style={{ ...sq(1, 0, 1.3), background: tint(p1, 0.4), animationDelay: dm(delayMs, 40) }} />
        {/* strike: one move, and a second straight after */}
        <Ray at={sq(1, 0)} ang={-63.4} len={2.24} verb="grp-c-draw" color={p1} delay={dm(delayMs, 200)} />
        <span className="grp-c-go absolute block" style={{ ...sq(2, 2), "--tx0": "-100%", "--ty0": "calc(var(--fx-side, 1) * 200%)", "--gd": "0.5s", animationDelay: dm(delayMs, 260) } as CSSProperties}>
          <Man kind="n" fill={p1} stroke={p2} />
        </span>
        <Ray at={sq(2, 2)} ang={-63.4} len={2.24} verb="grp-c-draw" color={p0} delay={dm(delayMs, 520)} />
        <span className="grp-c-go absolute block" style={{ ...sq(3, 4), "--tx0": "-100%", "--ty0": "calc(var(--fx-side, 1) * 200%)", "--gd": "0.8s", animationDelay: dm(delayMs, 580) } as CSSProperties}>
          <Man kind="n" fill={p1} stroke={p2} />
        </span>
        {[0, 1].map((i) => (
          <span key={i} className="grp-c-pip absolute block rounded-full" style={{ ...sq(1.5 + i, 1 + i * 2, 0.24), background: i ? p0 : p1, border: `1px solid ${p2}`, "--gd": "1.1s", animationDelay: dm(delayMs, 420 + i * 260) } as CSSProperties} />
        ))}
        {/* no capture of the king on the bonus move */}
        <span className="grp-c-in absolute block" style={{ ...sq(4, 6), "--gd": "1.3s", "--s0": "0.9", animationDelay: dm(delayMs, 600) } as CSSProperties}>
          <Man kind="k" fill={tint(p2, 0.9)} stroke={p1} />
        </span>
        <Ray at={sq(3, 4)} ang={-63.4} len={2.24} keep={1.3} verb="grp-c-clip" color={p2} delay={dm(delayMs, 820)} />
        {/* settle: motes trail the double move */}
        <Flecks delayMs={delayMs + 1050} at={sq(2.5, 2.5, 2)} color={tint(p1, 0.8)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 520} anchored={anchored} />
    </Stage>
  );
}

/* --- dryad_grove -----------------------------------------------------------
   "Your bishops may slide through one of your own pawns (never capturing it)
   to the square beyond. This is a single passage." The caster's pawn in the
   bishop's diagonal becomes a sapling; its branches part, the bishop slides
   through to the square beyond, and they close again behind it. One leaf pip
   for the single passage. */
function Sapling({ bark, leaf }: { bark: string; leaf: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M5 9.6 V4.6" stroke={bark} strokeWidth="0.9" />
      <circle cx="5" cy="3.6" r="3" fill={leaf} />
    </svg>
  );
}
function DryadGroveScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Sapling bark={p0} leaf={p1} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 520}>
      <Frame anchored={anchored}>
        {/* tell: the bishop, and its own pawn in the way becoming a sapling */}
        <span className="grp-c-in absolute block" style={{ ...sq(2, 0), "--gd": "0.6s", "--s0": "0.9", animationDelay: dm(delayMs, 40) } as CSSProperties}>
          <Man kind="b" fill={p1} stroke={p2} />
        </span>
        <span className="grp-c-up absolute block" style={{ ...sq(3, 1), "--gd": "0.6s", animationDelay: dm(delayMs, 120) } as CSSProperties}>
          <Sapling bark={p0} leaf={p1} />
        </span>
        {/* strike: the branches part and the bishop slides through */}
        {[-1, 1].map((s) => (
          <span key={s} className="grp-c-stuck absolute block overflow-hidden" style={{ ...sq(3 + s * 0.25, 1, 0.5), "--tx1": `${s * 60}%`, "--ty1": "0%", "--gd": "1.2s", animationDelay: dm(delayMs, 400) } as CSSProperties}>
            <span className="absolute block" style={{ left: s < 0 ? "0%" : "-100%", top: "0%", width: "200%", height: "100%" }}>
              <Sapling bark={p0} leaf={p1} />
            </span>
          </span>
        ))}
        <Ray at={sq(2, 0)} ang={-45} len={2.83} verb="grp-c-draw" color={p1} delay={dm(delayMs, 460)} />
        <span className="grp-c-go absolute block" style={{ ...sq(4, 2), "--tx0": "-200%", "--ty0": "calc(var(--fx-side, 1) * 200%)", "--gd": "1s", animationDelay: dm(delayMs, 520) } as CSSProperties}>
          <Man kind="b" fill={p1} stroke={p2} />
        </span>
        {/* one passage */}
        <span className="grp-c-pip absolute block" style={{ ...sq(3.5, 2.6, 0.3), "--gd": "1s", animationDelay: dm(delayMs, 900) } as CSSProperties}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M1 9 C1 3 5 1 9 1 C9 6 6 9 1 9 Z" fill={p1} />
          </svg>
        </span>
        {/* settle: leaves fall */}
        <Flecks delayMs={delayMs + 1050} at={sq(3, 1, 1.4)} color={tint(p1, 0.85)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p1, 0.7)} delayMs={delayMs + 520} anchored={anchored} />
    </Stage>
  );
}

/* --- checkmate_immunity ----------------------------------------------------
   "The first time your king is checked it is briefly warded ... it only
   blocks capture when your own move left the king in check, once." An enemy
   check runs at the caster's king; a ward snaps round the king and the line
   stops at it; one pip, and the ward cracks and falls away: once only. */
function CheckmateImmunityScene({ palette, glyph, lead, role, anchored, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} motif={<Man kind="k" fill={p1} stroke={p2} />} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage anchored={anchored} quakeMs={delayMs + 440}>
      <Frame anchored={anchored}>
        {/* tell: the king, and the check coming */}
        <span className="grp-c-in absolute block" style={{ ...cell(0, 0, 0.9), "--gd": "1.8s", "--s0": "0.9", animationDelay: dm(delayMs, 40) } as CSSProperties}>
          <Man kind="k" fill={p1} stroke={p2} />
        </span>
        <Ray at={cell(0, 0)} ang={-45} len={4} keep={0.8} verb="grp-c-clip" color={p2} delay={dm(delayMs, 120)} />
        {/* strike: the ward snaps round him */}
        <span className="grp-c-stamp absolute block rounded-full" style={{ ...cell(0, 0, 1.2), border: `3px solid ${p0}`, "--gd": "0.8s", animationDelay: dm(delayMs, 420) } as CSSProperties} />
        <span className="grp-c-pip absolute block rounded-full" style={{ ...cell(0, 0.72, 0.2), background: p0, border: `1px solid ${p2}`, "--gd": "0.8s", animationDelay: dm(delayMs, 560) } as CSSProperties} />
        {/* once only: the ward cracks and falls away */}
        {[-1, 1].map((s) => (
          <span key={s} className="grp-c-part absolute block" style={{ ...cell(s * 0.3, 0, 0.6), border: `3px solid ${p0}`, borderRadius: s < 0 ? "100% 0 0 100%" : "0 100% 100% 0", "--tx1": `${s * 60}%`, "--ty1": "120%", "--r1": `${s * 30}deg`, "--gd": "0.7s", animationDelay: dm(delayMs, 1000) } as CSSProperties} />
        ))}
        {/* settle: ward shards sink */}
        <Flecks delayMs={delayMs + 1050} at={cell(0, 0, 1.4)} color={tint(p0, 0.8)} n={4} />
      </Frame>
      <GrandAccent tier={tier} color={tint(p0, 0.7)} delayMs={delayMs + 440} anchored={anchored} />
    </Stage>
  );
}

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
  // A card that declared anchor "cast" / "aim" plays ON the square it was
  // played on, so its board-scale layers have to go through <BoardFrame> to
  // find the board. One left at "board" is re-centred by Board itself and must
  // not: see the Frame helper at the top of this file.
  const anchored = config.anchor === "cast" || config.anchor === "aim";
  const plugin: SigPlugin = {
    config,
    Render: function GreatPlayRender({ lead, role, delayMs }: { lead: boolean; role: SigRole; delayMs: number }) {
      const tier = TIER_OF.get(plugin) ?? 6;
      const scene = (
        <Template
          palette={palette}
          glyph={glyph}
          lead={lead}
          role={role}
          anchored={anchored}
          delayMs={delayMs}
          flourish={flourish}
          tier={tier}
        />
      );
      // The short cut is for the board-scale lead only: a per-square hit and
      // an arrival are already one square's worth of art.
      const rate = role === "lead" ? tempoFor(tier) : 1;
      return rate === 1 ? scene : <Tempo rate={rate}>{scene}</Tempo>;
    },
  };
  return plugin;
}

/** Live tier per plugin entry, filled by `bindTiers` right after PLAYS is
 * built (G cannot see the card id: the registry audits parse the
 * `G(Template, palette, glyph, config, flourish?)` shape, so it stays). */
const TIER_OF = new WeakMap<SigPlugin, number>();

/** Playback rate for the short cut. The great scenes were written for tiers 5
 * and 6 and run about 2.2 to 2.6s; a card that lives at tier 4 or below
 * should not hold the board that long (the tier ladder, ledger F222 / F227).
 * The whole scene, durations AND delays (Web Animations playbackRate scales
 * the local time), plays faster, so every beat keeps its order. */
function tempoFor(tier: number): number {
  if (tier <= 3) return 1.6;
  if (tier === 4) return 1.3;
  return 1;
}

/** Plays its subtree's CSS animations at `rate`. With animations off the
 * grp-* layers carry `animation: none`, so there is nothing to speed up and
 * the end state is unchanged. */
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
function Tempo({ rate, children }: { rate: number; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof el.getAnimations !== "function") return;
    for (const a of el.getAnimations({ subtree: true })) a.playbackRate = rate;
  }, [rate]);
  return (
    <span ref={ref} className="contents">
      {children}
    </span>
  );
}

export const PLAYS: Record<string, SigPlugin> = {
  /* --- WitchCircle (the hex pool) ---------------------------------------- */
  ball_and_chain: G(BallAndChainScene, ["#6b4a8f", "#c9b0e8", "#2a1030"], GLYPH.ball_and_chain, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades", anchor: "cast",
  }),
  royal_summons: G(RoyalSummonsScene, ["#8f2bbf", "#ffd76a", "#2a1030"], GLYPH.royal_summons, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "shades", anchor: "cast",
  }),
  palsied_hands: G(PalsiedHandsScene, ["#6b4a8f", "#8faf4a", "#2f3a26"], GLYPH.palsied_hands, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades", anchor: "board",
  }),
  throne_bound: G(ThroneBoundScene, ["#5b2b8f", "#c94ad1", "#1c0f18"], GLYPH.throne_bound, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "shades", anchor: "cast",
  }),
  lone_sovereign: G(LoneSovereignScene, ["#5a6b8f", "#cdd6ff", "#1c1c2a"], GLYPH.lone_sovereign, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades", anchor: "board",
  }),
  peasant_levy: G(PeasantLevyScene, ["#8a7a63", "#c9a84c", "#3a3026"], GLYPH.peasant_levy, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades", anchor: "board",
  }),
  court_in_exile: G(CourtInExileScene, ["#6b1a2a", "#e8b04b", "#2b1218"], GLYPH.court_in_exile, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades", anchor: "cast",
  }),
  cast_a_nerf: G(CastANerfScene, ["#8f6bff", "#ff9d3d", "#2a1030"], GLYPH.cast_a_nerf, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades", anchor: "board",
  }),
  royal_handicap: G(WitchCircle, ["#8f2bbf", "#e3d0ff", "#1c0f18"], GLYPH.royal_handicap, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "shades", anchor: "cast",
  }, "nodiag"),
  queens_handicap: G(QueensHandicapScene, ["#c94ad1", "#e3d0ff", "#2a1030"], GLYPH.queens_handicap, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "shades", anchor: "cast",
  }),
  grounded_command: G(GroundedCommandScene, ["#6b4a8f", "#ffd76a", "#1c1c2a"], GLYPH.grounded_command, {
    ordering: "sweep", staggerMs: 55, victims: ["q", "r"], hasLead: true, sound: "shades", anchor: "cast",
  }),
  lunar_eclipse: G(LunarEclipseScene, ["#2c3e6b", "#cdd6ff", "#0d1326"], GLYPH.lunar_eclipse, {
    ordering: "sweep", staggerMs: 55, victims: ["q", "r"], hasLead: true, sound: "shades", anchor: "cast",
  }),
  hexed_satchel: G(HexedSatchelScene, ["#8a6a3a", "#a8e07f", "#2f3a26"], GLYPH.hexed_satchel, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades", anchor: "board",
  }),
  iron_furrow: G(IronFurrowScene, ["#8faf4a", "#c9a84c", "#2f3a26"], GLYPH.iron_furrow, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true, sound: "shades", anchor: "cast",
  }),
  leaden_fields: G(LeadenFieldsScene, ["#6e6e78", "#e8dcc0", "#2a2a30"], GLYPH.leaden_fields, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true, sound: "petrify", anchor: "board",
  }),
  wc_voodoo_doll: G(WitchCircle, ["#6b4a8f", "#c94a5a", "#1c0f18"], GLYPH.wc_voodoo_doll, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades", anchor: "cast",
  }, "voodoo"),
  wc_sticky_floor: G(StickyFloorScene, ["#c9a84c", "#ffd23f", "#4a3a22"], GLYPH.wc_sticky_floor, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "snooze", anchor: "board",
  }),
  threads_of_fate: G(ThreadsOfFateScene, ["#5a6b8f", "#cdd6ff", "#2c3e6b"], GLYPH.threads_of_fate, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "shades", source: "stun", anchor: "cast",
  }),
  mind_control: G(WitchCircle, ["#8f2bbf", "#c94ad1", "#12081f"], GLYPH.mind_control, {
    ordering: "radial", staggerMs: 0, victims: ["n", "b"], hasLead: true, sound: "shades", anchor: "cast",
  }, "puppet"),
  mind_dominion: G(MindDominionScene, ["#5b2b8f", "#8f6bff", "#12081f"], GLYPH.mind_dominion, {
    ordering: "radial", staggerMs: 0, victims: ["r", "b"], hasLead: true, sound: "shades", anchor: "cast",
  }),

  /* --- StoneGaze (the walnut / petrify pool) -------------------------------- */
  medusas_verdict: G(MedusasVerdictScene, ["#8d8d94", "#7fae5a", "#4c4c53"], GLYPH.medusas_verdict, {
    ordering: "radial", staggerMs: 50, victims: "all", hasLead: true, sound: "petrify", source: "walnut", anchor: "cast",
  }),
  granite_ramparts: G(GraniteRampartsScene, ["#8a8478", "#c9b89a", "#4a4036"], GLYPH.granite_ramparts, {
    ordering: "sweep", staggerMs: 60, victims: ["r"], hasLead: true, sound: "petrify", source: "walnut", anchor: "cast",
  }),
  stone_menagerie: G(StoneMenagerieScene, ["#8d8d94", "#c9c9cf", "#3a3a40"], GLYPH.stone_menagerie, {
    ordering: "sweep", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "petrifiedforest", source: "walnut", anchor: "board",
  }),
  stone_curse: G(StoneGaze, ["#8a6a4a", "#c9b89a", "#4a3a2a"], GLYPH.stone_curse, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", source: "walnut", anchor: "cast",
  }),
  stone_riders: G(StoneRidersScene, ["#8d8d94", "#b58a5a", "#4c4c53"], GLYPH.stone_riders, {
    ordering: "sweep", staggerMs: 60, victims: ["n"], hasLead: true, sound: "petrifiedforest", source: "walnut", anchor: "cast",
  }),
  stone_prelates: G(StonePrelatesScene, ["#9a9a9a", "#e8dcc0", "#5c5c63"], GLYPH.stone_prelates, {
    ordering: "sweep", staggerMs: 60, victims: ["b"], hasLead: true, sound: "petrifiedforest", source: "walnut", anchor: "board",
  }),
  stone_bastions: G(StoneBastionsScene, ["#8a94a8", "#c9b89a", "#3a3a40"], GLYPH.stone_bastions, {
    ordering: "sweep", staggerMs: 60, victims: ["r"], hasLead: true, sound: "petrify", source: "walnut", anchor: "cast",
  }),
  queen_of_stone: G(StoneGaze, ["#8d8d94", "#ffd76a", "#4c4c53"], GLYPH.queen_of_stone, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "petrify", source: "walnut", anchor: "cast",
  }, "stoneshoes"),
  eternal_statue: G(EternalStatueScene, ["#c9c9cf", "#7fae5a", "#6e6e74"], GLYPH.eternal_statue, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrifiedforest", source: "walnut", anchor: "cast",
  }),
  nerf_hammer: G(NerfHammerScene, ["#8a6a4a", "#ff9d3d", "#4a3a2a"], GLYPH.nerf_hammer, {
    ordering: "radial", staggerMs: 0, victims: ["n", "b", "r"], hasLead: true, sound: "petrify", source: "walnut", anchor: "cast",
  }),

  /* --- ColdFront (the freeze pool) --------------------------------------------- */
  the_big_chill: G(TheBigChillScene, ["#9fd8ff", "#e8f8ff", "#3f7fb5"], GLYPH.the_big_chill, {
    ordering: "sweep", staggerMs: 45, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen", anchor: "cast",
  }),
  frozen_moment: G(FrozenMomentScene, ["#bfe6ff", "#eef8ff", "#4f8fd1"], GLYPH.frozen_moment, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "cast",
  }),
  creeping_frost: G(CreepingFrostScene, ["#7fd8d8", "#dff7f7", "#3f6f9f"], GLYPH.creeping_frost, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "clockice", source: "frozen", anchor: "aim",
  }),
  glacial_flanks: G(ColdFront, ["#9fd8ff", "#c9cdd6", "#4f8fd1"], GLYPH.glacial_flanks, {
    ordering: "sweep", staggerMs: 50, victims: ["n", "b"], hasLead: true, sound: "massfreeze", source: "frozen", anchor: "cast",
  }, "pincer"),
  total_whiteout: G(TotalWhiteoutScene, ["#e8f8ff", "#eef8ff", "#6fb5e8"], GLYPH.total_whiteout, {
    ordering: "sweep", staggerMs: 45, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen", anchor: "board",
  }),
  we_frostbite_curse: G(WeFrostbiteCurseScene, ["#9fd8ff", "#eef8ff", "#5a8fc0"], GLYPH.we_frostbite_curse, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "clockice", anchor: "board",
  }),
  total_freeze: G(TotalFreezeScene, ["#bfe6ff", "#e8f8ff", "#3f6f9f"], GLYPH.total_freeze, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen", anchor: "board",
  }),

  /* --- bombs / demolitions / barrages (per-card scenes) --------------------------------- */
  atomic_captures: G(AtomicCapturesScene, ["#ff9d3d", "#ffd166", "#3a1c12"], GLYPH.atomic_captures, {
    ordering: "octagon", staggerMs: 70, victims: "all", hasLead: true, sound: "atomic", anchor: "board",
  }),
  atomic_reaction: G(AtomicReactionScene, ["#e6432c", "#ffd166", "#3a1c12"], GLYPH.atomic_reaction, {
    ordering: "octagon", staggerMs: 70, victims: "all", hasLead: true, sound: "atomic", anchor: "aim",
  }),
  detonation_field: G(DetonationFieldScene, ["#c94a3a", "#ff9d3d", "#2b1218"], GLYPH.detonation_field, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cataclysm", anchor: "cast",
  }),
  ww_demolition_charge: G(WwDemolitionChargeScene, ["#7c8a4a", "#ffd166", "#3a3526"], GLYPH.ww_demolition_charge, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "siege", anchor: "cast",
  }),
  wc_confetti_cannon: G(WcConfettiCannonScene, ["#c94ad1", "#ffcf4d", "#3a1030"], GLYPH.wc_confetti_cannon, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "siege", anchor: "board",
  }),
  we_firestorm: G(WeFirestormScene, ["#ff7a29", "#ffd166", "#3a1c12"], GLYPH.we_firestorm, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cataclysm", anchor: "board",
  }),
  giants_maul: G(GiantsMaulScene, ["#8a94a8", "#ffd166", "#3a3a40"], GLYPH.giants_maul, {
    ordering: "line", staggerMs: 70, victims: "all", mover: "r", hasLead: true, sound: "siege", anchor: "board",
  }),
  scorched_middle: G(ScorchedMiddleScene, ["#ff7a29", "#ffb454", "#3a1c12"], GLYPH.scorched_middle, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "cataclysm", anchor: "board",
  }),

  /* --- protection / musters / holds (per-card scenes) -------------------------------------- */
  checkmate_immunity: G(CheckmateImmunityScene, ["#5a8fc0", "#dfe8ff", "#2c3e6b"], GLYPH.checkmate_immunity, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis", anchor: "cast",
  }),
  iron_reign: G(IronReignScene, ["#8a94a8", "#ffd76a", "#3a3a40"], GLYPH.iron_reign, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis", source: "kingSafe", anchor: "cast",
  }),
  ironclad: G(IroncladScene, ["#aab6c8", "#e3e9f2", "#3a4556"], GLYPH.ironclad, {
    ordering: "sweep", staggerMs: 50, victims: "all", hasLead: true, sound: "aegis", source: "shield", anchor: "board",
  }),
  ww_iron_bulwark: G(IronBulwarkScene, ["#8a94a8", "#c94a3a", "#3a3a40"], GLYPH.ww_iron_bulwark, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", source: "shield", anchor: "cast",
  }),
  ww_praetorian_guard: G(PraetorianGuardScene, ["#c9a84c", "#c94a3a", "#4a3a22"], GLYPH.ww_praetorian_guard, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", source: "shield", anchor: "cast",
  }),
  round_table: G(RoundTableScene, ["#c9b89a", "#ffd76a", "#5a4a36"], GLYPH.round_table, {
    ordering: "radial", staggerMs: 60, victims: ["n"], hasLead: true, sound: "coronation", anchor: "cast",
  }),
  ww_bridgehead: G(BridgeheadScene, ["#7c8a4a", "#c94a3a", "#3a3526"], GLYPH.ww_bridgehead, {
    ordering: "radial", staggerMs: 60, victims: ["n", "p"], hasLead: true, sound: "wall", source: "summon", anchor: "cast",
  }),
  sealed_avenues: G(SealedAvenuesScene, ["#8a94a8", "#ffd76a", "#5c5c63"], GLYPH.sealed_avenues, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "wall", anchor: "board",
  }),

  /* --- nature / roots / blooms (per-card scenes) --------------------------------------------------- */
  dryad_grove: G(DryadGroveScene, ["#8a6a3a", "#a8e07f", "#3f8f3f"], GLYPH.dryad_grove, {
    ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "cathedral", source: "summon", anchor: "aim",
  }),
  we_overgrowth: G(WeOvergrowthScene, ["#3f8f3f", "#ffd76a", "#1c4a1c"], GLYPH.we_overgrowth, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", anchor: "cast",
  }),
  we_rooted: G(WeRootedScene, ["#4a3a22", "#a8e07f", "#2f3a26"], GLYPH.we_rooted, {
    ordering: "sweep", staggerMs: 55, victims: ["r", "q"], hasLead: true, sound: "petrifiedforest", anchor: "cast",
  }),
  we_quagmire: G(QuagmireScene, ["#5c5348", "#8faf4a", "#3a3026"], GLYPH.we_quagmire, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "petrifiedforest", anchor: "cast",
  }),
  thorn_hedge: G(ThornHedgeScene, ["#1c4a1c", "#a8e07f", "#0f2a0f"], GLYPH.thorn_hedge, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "wall", anchor: "board",
  }),

  /* --- PhantomParade (spirits / veils / phasings) ------------------------------------------- */
  gossamer_veil: G(GossamerVeilScene, ["#8f6bff", "#e3d0ff", "#3b1a5e"], GLYPH.gossamer_veil, {
    ordering: "sweep", staggerMs: 50, victims: "all", hasLead: true, sound: "aegis", source: "shield", anchor: "cast",
  }),
  starlight_ward: G(PhantomParade, ["#2c3e6b", "#cdd6ff", "#12122a"], GLYPH.starlight_ward, {
    ordering: "sweep", staggerMs: 50, victims: "all", hasLead: true, sound: "cathedral", source: "shield", anchor: "cast",
  }, "starward"),
  spirit_guide: G(SpiritGuideScene, ["#4a6b8f", "#7fd8d8", "#12303a"], GLYPH.spirit_guide, {
    ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "shades", source: "summon", anchor: "cast",
  }),
  phase_army: G(PhaseArmyScene, ["#5b2b8f", "#e3d0ff", "#2a1030"], GLYPH.phase_army, {
    ordering: "sweep", staggerMs: 55, victims: ["b", "r", "q"], hasLead: true, sound: "shades", anchor: "aim",
  }),
  ghost_legion: G(GhostLegionScene, ["#5a6b8f", "#eef8ff", "#2c3e6b"], GLYPH.ghost_legion, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true, sound: "shades", anchor: "aim",
  }),
  valkyrie: G(ValkyrieScene, ["#5a6b8f", "#ffd76a", "#2c3e6b"], GLYPH.valkyrie, {
    ordering: "radial", staggerMs: 0, victims: ["q", "r"], hasLead: true, sound: "coronation", source: "summon", anchor: "cast",
  }),

  /* --- ClockSpire (tempo / stolen hours / lost days) -------------------------------------------- */
  extra_move_repeat: G(ExtraMoveRepeatScene, ["#6fe3ff", "#ffd76a", "#1c3a4a"], GLYPH.extra_move_repeat, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "blitz", anchor: "board",
  }),
  time_stop_short: G(TimeStopShortScene, ["#3a3766", "#6fe3ff", "#12122a"], GLYPH.time_stop_short, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "clockcage", source: "frozen", anchor: "board",
  }),
  time_rewind: G(ClockSpire, ["#5b2b8f", "#6fe3ff", "#2a1030"], GLYPH.time_rewind, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board",
  }, "rewind"),
  lost_days: G(LostDaysScene, ["#5a6b8f", "#cdd6ff", "#2c3e6b"], GLYPH.lost_days, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "snooze", source: "stun", anchor: "board",
  }),
  wa_stolen_hours: G(WaStolenHoursScene, ["#e8c97a", "#6fe3ff", "#4a3a22"], GLYPH.wa_stolen_hours, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "clockcage", anchor: "cast",
  }),

  /* --- CardRite (drafts / fates / contracts / paperwork) -------------------------------------------- */
  sever: G(SeverScene, ["#6b4a8f", "#c94a5a", "#2a1030"], GLYPH.sever, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board",
  }),
  draft_domination: G(DraftDominationScene, ["#3a3a45", "#c94a5a", "#1c1c22"], GLYPH.draft_domination, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board",
  }),
  total_nullify: G(TotalNullifyScene, ["#5c5c63", "#c94a5a", "#2a2a30"], GLYPH.total_nullify, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board",
  }),
  favorable_stars: G(FavorableStarsScene, ["#2c3e6b", "#ffd76a", "#12122a"], GLYPH.favorable_stars, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board",
  }),
  the_tower: G(CardRite, ["#2c3e6b", "#c94a3a", "#12122a"], GLYPH.the_tower, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cataclysm", anchor: "cast",
  }, "tower"),
  death_arcana: G(DeathArcanaScene, ["#12081f", "#8f6bff", "#0d0618"], GLYPH.death_arcana, {
    ordering: "radial", staggerMs: 0, victims: ["n", "b", "r", "q"], hasLead: true, sound: "extinction", anchor: "cast",
  }),
  chess_diff: G(CardRite, ["#5a6b8f", "#eef1f7", "#2c3e6b"], GLYPH.chess_diff, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "board",
  }, "sidegame"),
  wa_greed: G(GreedScene, ["#8a6a3a", "#ffd76a", "#4a3a22"], GLYPH.wa_greed, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "rampage", anchor: "board",
  }),
  riddle_game: G(RiddleGameScene, ["#8a6a3a", "#e8dcc0", "#4a3a22"], GLYPH.riddle_game, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "snooze", source: "stun", anchor: "board",
  }),
  rehab: G(RehabScene, ["#5fc9b0", "#eef1f7", "#1c4a3a"], GLYPH.rehab, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board",
  }),
  parole: G(ParoleScene, ["#5a6b8f", "#eef1f7", "#2c3e6b"], GLYPH.parole, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast",
  }),
  long_leash: G(LongLeashScene, ["#b58a5a", "#e8dcc0", "#5a4a36"], GLYPH.long_leash, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "board",
  }),
  wardens_bribe: G(WardensBribeScene, ["#8a6a3a", "#ffd76a", "#4a3a22"], GLYPH.wardens_bribe, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "rampage", anchor: "board",
  }),
  iron_will: G(IronWillScene, ["#8a94a8", "#c9cdd6", "#3a3a40"], GLYPH.iron_will, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "board",
  }),
  wc_wrong_way: G(WcWrongWayScene, ["#c94a5a", "#e8dcc0", "#5a1512"], GLYPH.wc_wrong_way, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "shades", anchor: "board",
  }),
  wc_broken_elevator: G(WcBrokenElevatorScene, ["#8a94a8", "#ffe9b0", "#3a3a40"], GLYPH.wc_broken_elevator, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "board",
  }),
  unseelie_bargain: G(UnseelieBargainScene, ["#2a1030", "#8f6bff", "#12081f"], GLYPH.unseelie_bargain, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "cast",
  }),

  /* --- ThiefHand (steals / seizures / nullifies) --------------------------------------------------- */
  buff_thief: G(BuffThiefScene, ["#8f6bff", "#ffd76a", "#2a2a38"], GLYPH.buff_thief, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "rampage", anchor: "board",
  }),
  buff_siphon: G(BuffSiphonScene, ["#c94ad1", "#ffd76a", "#1c0f18"], GLYPH.buff_siphon, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "rampage", anchor: "board",
  }),
  wa_spelltheft: G(WaSpelltheftScene, ["#5b2b8f", "#e3d0ff", "#1c0f2a"], GLYPH.wa_spelltheft, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "aim",
  }),
  draft_seize: G(DraftSeizeScene, ["#6b4a8f", "#cdd6ff", "#2a1030"], GLYPH.draft_seize, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "rampage", anchor: "board",
  }),
  collapse: G(CollapseScene, ["#8f6bff", "#c9cdd6", "#1c1c2a"], GLYPH.collapse, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "shades", anchor: "aim",
  }),
  void: G(VoidScene, ["#5b2b8f", "#b98cff", "#0d0618"], GLYPH.void, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "cast",
  }),
  wa_sabotage: G(WaSabotageScene, ["#5a6b8f", "#cdd6ff", "#1c1c2a"], GLYPH.wa_sabotage, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board",
  }),
  empty_handed: G(ThiefHand, ["#8a94a8", "#c94a5a", "#2a2a30"], GLYPH.empty_handed, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board",
  }, "emptypockets"),

  /* --- CrownForge (promotions / reforgings) --------------------------------------------------------- */
  double_queen: G(DoubleQueenScene, ["#ffd76a", "#fff2c9", "#8a6414"], GLYPH.double_queen, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", anchor: "cast",
  }),
  twin_queens: G(TwinQueensScene, ["#ffd76a", "#ffe9b0", "#7a5b23"], GLYPH.twin_queens, {
    // Two named pawns, so the forge reaches for them rather than crowning the
    // whole board: the card promotes exactly two, and CrownForge's anchored
    // branch already frames its board-scale layers and carries the Reach leg.
    ordering: "radial", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain", anchor: "aim",
  }),
  promotion_storm: G(PromotionStormScene, ["#c9cdd6", "#ffd76a", "#5a6b8f"], GLYPH.promotion_storm, {
    ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain", anchor: "board",
  }),
  mass_promote_minor: G(MassPromoteMinorScene, ["#b58a5a", "#ffd76a", "#5a4a36"], GLYPH.mass_promote_minor, {
    // Two pawns again, and the sweep ordering already walks them in order, so
    // the leg has a real vector to run along.
    ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "coronation", anchor: "aim",
  }),
  resurrect_queen: G(ResurrectQueenScene, ["#6b1a2a", "#ffd76a", "#3a0e1a"], GLYPH.resurrect_queen, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "coronation", source: "summon", anchor: "cast",
  }),
  legendary_forge: G(CrownForge, ["#ff9d3d", "#ffd166", "#3a1c12"], GLYPH.legendary_forge, {
    ordering: "radial", staggerMs: 0, victims: ["n", "b"], hasLead: true, sound: "colossus", anchor: "cast",
  }, "reforge"),
  royal_ascension: G(RoyalAscensionScene, ["#b98cff", "#ffd76a", "#3b1a5e"], GLYPH.royal_ascension, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "coronation", anchor: "cast",
  }),
  second_king: G(SecondKingScene, ["#ffd76a", "#ffe9b0", "#8a6a3a"], GLYPH.second_king, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", anchor: "cast",
  }),
  wa_leaden_crown: G(WaLeadenCrownScene, ["#6e6e78", "#c9a84c", "#2a2a30"], GLYPH.wa_leaden_crown, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", source: "shield", anchor: "cast",
  }),
  overclock_major: G(CrownForge, ["#6fe3ff", "#ffd76a", "#1c3a4a"], GLYPH.overclock_major, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz", anchor: "aim",
  }, "overclock"),
  ascendant_knight: G(AscendantKnightScene, ["#b98cff", "#e3d0ff", "#3b1a5e"], GLYPH.ascendant_knight, {
    ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "coronation", source: "shield", anchor: "cast",
  }),
  nerf_breaker: G(NerfBreakerScene, ["#8a94a8", "#ffd166", "#3a3a40"], GLYPH.nerf_breaker, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "colossus", anchor: "board",
  }),

  /* --- RiftGate (teleports / conjurings / mirrors) ---------------------------------------------------- */
  fey_step: G(RiftGate, ["#3f8f3f", "#a8e07f", "#1c4a1c"], GLYPH.fey_step, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "aim",
  }, "hedgerow"),
  rift_walker: G(RiftGate, ["#5b2b8f", "#6fe3ff", "#12081f"], GLYPH.rift_walker, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "aim",
  }),
  mirror_of_souls: G(MirrorOfSoulsScene, ["#5a8fc0", "#bfe6ff", "#2c3e6b"], GLYPH.mirror_of_souls, {
    ordering: "radial", staggerMs: 0, victims: ["n", "b"], hasLead: true, sound: "shades", anchor: "aim",
  }),
  wa_conjure_rook: G(WaConjureRookScene, ["#8f6bff", "#e3d0ff", "#2a1030"], GLYPH.wa_conjure_rook, {
    ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "clockcage", source: "summon", anchor: "cast",
  }),
  wa_twin_familiars: G(WaTwinFamiliarsScene, ["#7fd8d8", "#e3d0ff", "#12303a"], GLYPH.wa_twin_familiars, {
    ordering: "radial", staggerMs: 60, victims: ["b"], hasLead: true, sound: "shades", anchor: "aim",
  }),
  ley_line: G(RiftGate, ["#5fc9b0", "#a8e07f", "#1c4a3a"], GLYPH.ley_line, {
    ordering: "file", staggerMs: 50, victims: "all", hasLead: true, sound: "wall", anchor: "aim",
  }, "leyline"),

  /* --- BeastRush (hunts / mounts / charges) ------------------------------------------------------------- */
  wild_hunt: G(WildHuntScene, ["#3b1a5e", "#b98cff", "#12081f"], GLYPH.wild_hunt, {
    ordering: "sweep", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "rampage", anchor: "board",
  }),
  dragon_mount: G(BeastRush, ["#4a8f5f", "#d6234f", "#1c4a2c"], GLYPH.dragon_mount, {
    ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", anchor: "cast",
  }, "dragon"),
  sahur: G(BeastRush, ["#8a6a3a", "#c94a3a", "#4a3a22"], GLYPH.sahur, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "cast",
  }, "sahur"),
};

/** The live tier bound to an entry (see TIER_OF). Exported so the weight check
 * (docs/polish-pass/evidence/TC-great/check-great-weight.ts) can assert it. */
export function greatPlayTier(id: string): number {
  return TIER_OF.get(PLAYS[id]) ?? 6;
}
function bindTiers(): void {
  for (const [id, plugin] of Object.entries(PLAYS)) TIER_OF.set(plugin, BUFF_BY_ID[id]?.tier ?? 6);
}
bindTiers();
