// g01HourglassPlays — bespoke plays for the 32 time / tempo / turn-order cards
// that used to share the generated `hourglass` family (one falling sandglass,
// 32 hue shifts).
//
// MODULE FICTION: TIME BEING INTERFERED WITH. Never an hourglass. Every card is
// a different MECHANISM of temporal meddling, caught at the moment somebody
// leans on it: a pendulum seized between two palms; a slow-match fuse burning
// along a timeline; a sundial shadow snapping to a new hour; two metronome arms
// pinned by a dropped bar; a water clock bunged shut; an escapement pallet
// lifted so the wheel free-runs; cuckoo doors opening on masked dancers; a
// weight-driven train that only falls while it is behind; a token bought hour;
// a forced dawn; an orrery arm; a mainspring wound two turns; alarm hammers
// wedged apart by a crown; a war drum notched per check; two candles of unequal
// length; a calendar wheel ratcheted round; a tally stick snapped; a bell rope
// pulled early; a portcullis jamming the hands; a muffled clapper; film
// sprockets skipping a frame; a hammock slung between the hands; a punched
// time card; a pocket watch slipping its shackle; hour-weights on a balance;
// a moon-phase shutter; a tear-off day calendar; numerals dropping off a dial;
// a vault time lock; a tide dial; an appointment ribbon and seal; and an
// ice-locked dial thawing.
//
// PER-CARD RULE SCENES (slice TC-g). The live tier 7 and 8 cards no longer lead
// with a clock mechanism: each plays a scene of its own rule (the ranks,
// pieces, turn counts and drafts it touches), see that section near the end.
// Their old art survives only as the small target and entrance cuts.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g01HourglassPlays.css), transform/opacity animations only, no import
// from BoardEffects.tsx (cycle hazard), and only the SigPlugin / SigRole TYPES
// imported from sigPlugins.tsx.
//
// STAGING. Every card declares anchor "cast" or "aim", so the scene happens on
// the square the card was played on. Anything that means THE WHOLE BOARD (the
// wash, the dial rim, a horizon band, the settle motes) lives inside
// <BoardFrame>, never at a fixed percentage of the anchored stage. The five
// cards whose fiction travels toward the opponent (the sundial shadow, the
// marching escapement, the snapped tally, the bell that rolls at them, the
// stolen frame) use <AimStage> and author their art pointing RIGHT.
//
// Every scene runs three beats — tell, strike, settle — in all three roles
// ("lead", "target", "entrance"), and every lead carries at least one animated
// layer driven by the geometry vars (--fx-side lean, --fx-len reach,
// --fx-index order, --fx-ox/--fx-oy offset). All CSS lives in
// g01HourglassPlays.css behind the `g01-` prefix.

import "./g01HourglassPlays.css";

import type { CSSProperties, ReactNode } from "react";
import type { SigPlugin, SigRole } from "./sigPlugins";
import { AimStage, BoardFrame, BoardWideStage } from "./stage";
import { LaserStrike, PieceShatter, Shockwave, impactVars } from "./impact/impact";

interface SceneProps {
  lead: boolean;
  role: SigRole;
  delayMs: number;
}

/* =============================================================================
   Local machinery. Nothing here draws: it positions, delays and stages. The
   central OBJECT of every card is its own art, below.
   ========================================================================== */

/** Animation delay: the caller's stagger plus this beat's offset, in ms. */
function dm(base: number, off: number): CSSProperties {
  return { animationDelay: `${base + off}ms` };
}

/** A style plus custom properties (throws, lean distances, turn angles). */
function sv(style: CSSProperties, vars: Record<string, string>): CSSProperties {
  return { ...style, ...vars } as CSSProperties;
}

const SJ = { strokeLinejoin: "round", strokeLinecap: "round" } as const;

/** The board-wide scene canvas, anchored on the cast square. */
function Wide({ children }: { children: ReactNode }) {
  return (
    <BoardWideStage>
      <span className="g01 absolute inset-0 block">{children}</span>
    </BoardWideStage>
  );
}

/** The same canvas rotated onto the play's own source -> target vector. Art
 *  inside is authored pointing RIGHT (+x). */
function Aim({ children }: { children: ReactNode }) {
  return (
    <AimStage>
      <span className="g01 absolute inset-0 block">{children}</span>
    </AimStage>
  );
}

/** Square-local cut: the per-victim hit and the in-hand arrival. */
function Sq({ children }: { children: ReactNode }) {
  return (
    <span className="g01 pointer-events-none absolute inset-0 z-20 block" aria-hidden="true">
      <svg viewBox="0 0 40 40" className="block h-full w-full"> {children}</svg>
    </span>
  );
}

/**
 * A positioned prop inside a stage. `x`/`y` are the prop's CENTRE and `w`/`h`
 * its size, all in stage percent (the stage is 14 cells across, so one board
 * square is 7.142857% and the cast square's centre sits at 50% / 50%).
 */
function P({
  x,
  y,
  w,
  h,
  cls,
  style,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  cls?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <span
      className={(cls ? cls + " " : "") + "absolute block"}
      style={{ left: `${x - w / 2}%`, top: `${y - h / 2}%`, width: `${w}%`, height: `${h}%`, ...style }}
    >
      {children}
    </span>
  );
}

/* --- Board-scale layers. All four live inside <BoardFrame>, so they mean the
   BOARD and not a percentage of an anchored stage. ------------------------- */

/** The light the meddling happens under. */
function Wash({ tint, delayMs }: { tint: string; delayMs: number }) {
  return (
    <BoardFrame>
      <span
        className="g01-wash absolute inset-0 block"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${tint}, transparent 74%)`,
          animationDelay: `${delayMs}ms`,
        }}
      />
    </BoardFrame>
  );
}

/** A hairline rim around the whole board: the dial the game is played on. */
function Rim({ color, delayMs }: { color: string; delayMs: number }) {
  return (
    <BoardFrame>
      <span
        className="g01-rim absolute inset-0 block"
        style={{ border: `2px solid ${color}`, animationDelay: `${delayMs}ms` }}
      />
    </BoardFrame>
  );
}

/** A band laid across the whole board: a horizon, a water line, a shelf. */
function Band({
  color,
  delayMs,
  y = 50,
  h = 6,
}: {
  color: string;
  delayMs: number;
  y?: number;
  h?: number;
}) {
  return (
    <BoardFrame>
      <span
        className="g01-band absolute block"
        style={{ left: 0, width: "100%", top: `${y - h / 2}%`, height: `${h}%`, background: color, animationDelay: `${delayMs}ms` }}
      />
    </BoardFrame>
  );
}

/** Settle motes crossing the board. */
function Drift({ color, delayMs, n = 4 }: { color: string; delayMs: number; n?: number }) {
  return (
    <BoardFrame>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className="g01-drift absolute block"
          style={{
            left: `${12 + i * 20}%`,
            top: `${24 + (i % 3) * 21}%`,
            width: "2.2%",
            height: "2.2%",
            borderRadius: "50%",
            background: color,
            animationDelay: `${delayMs + i * 90}ms`,
          }}
        />
      ))}
    </BoardFrame>
  );
}

/* =============================================================================
   1. Council of Peace (t8) — THE PENDULUM SEIZED. Tell: the bob's shadow
   squashes as it swings over. Strike: two palms slide in and take the bob
   between them, dead stop. Settle: a line of quiet rolls off away from the
   caster.
   ========================================================================== */

const C_CP = { core: "#8fd6c4", glow: "#fff4d6", deep: "#12302a" };

function CouncilOfPeaceScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><path d="M20 6v14" stroke={C_CP.core} strokeWidth="2.4" {...SJ} /><circle cx="20" cy="26" r="6" fill={C_CP.deep} stroke={C_CP.core} strokeWidth="2.2" /></g>
        <g className="g01-hit2" style={dm(delayMs, 210)}><path d="M7 26h6M27 26h6" stroke={C_CP.glow} strokeWidth="3" {...SJ} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><path d="M20 7v14" stroke={C_CP.core} strokeWidth="2.6" {...SJ} /><circle cx="20" cy="27" r="7" fill={C_CP.deep} stroke={C_CP.core} strokeWidth="2.4" /><circle cx="20" cy="27" r="2.6" fill={C_CP.glow} /></g>
        <g className="g01-cp-jaw" style={sv(dm(delayMs, 200), { "--g01-mx": "40%" })}><path d="M4 27h7M29 27h7" stroke={C_CP.glow} strokeWidth="3.4" {...SJ} /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 390)}><circle cx="20" cy="22" r="14" fill="none" stroke={C_CP.core} strokeWidth="1.5" /></g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(143,214,196,0.3)" delayMs={delayMs} />
      <P x={50} y={63} w={19} h={3.4} cls="g01-tell" style={{ background: C_CP.deep, borderRadius: "50%", ...dm(delayMs, 0) }} />
      <P x={50} y={46} w={15} h={27} cls="g01-cp-swing" style={dm(delayMs, 130)}>
        <svg viewBox="0 0 60 108" className="block h-full w-full"><path d="M30 4v62" stroke={C_CP.core} strokeWidth="5" {...SJ} /><circle cx="30" cy="82" r="17" fill={C_CP.deep} stroke={C_CP.core} strokeWidth="6" /><circle cx="30" cy="82" r="6" fill={C_CP.glow} /></svg>
      </P>
      <P x={41} y={58} w={8} h={8} cls="g01-cp-jaw" style={sv(dm(delayMs, 360), { "--g01-mx": "62%" })}>
        <svg viewBox="0 0 40 40" className="block h-full w-full"><path d="M6 12q12-5 24 2v14q-12 6-24-2z" fill={C_CP.glow} stroke={C_CP.deep} strokeWidth="3" {...SJ} /></svg>
      </P>
      <P x={59} y={58} w={8} h={8} cls="g01-cp-jaw" style={sv(dm(delayMs, 360), { "--g01-mx": "-62%" })}>
        <svg viewBox="0 0 40 40" className="block h-full w-full"><path d="M34 12q-12-5-24 2v14q12 6 24-2z" fill={C_CP.glow} stroke={C_CP.deep} strokeWidth="3" {...SJ} /></svg>
      </P>
      <P x={50} y={50} w={33} h={1.4} cls="g01-lean" style={sv({ background: C_CP.glow, ...dm(delayMs, 620) }, { "--g01-lean": "calc(var(--fx-side, 1) * -260%)" })} />
      <Drift color={C_CP.glow} delayMs={delayMs + 700} n={4} />
    </Wide>
  );
}

/* =============================================================================
   2. Crown Jubilee (t8) — THE SLOW MATCH. A fuse is a clock: it burns at a
   known rate. Tell: the cord's coil twitches as the ember takes. Strike: the
   ember runs the length of the timeline and three rockets go up. Settle: one
   is caught in a gloved hand; the other two fall away as cinders.
   ========================================================================== */

const C_CJ = { core: "#ffc861", glow: "#fff2cf", deep: "#3a2405" };
const CJ_ROCKETS = [
  { x: 42, mx: "-120%", my: "-320%", mr: "-24deg" },
  { x: 50, mx: "0%", my: "-380%", mr: "0deg" },
  { x: 58, mx: "120%", my: "-315%", mr: "24deg" },
];

function CrownJubileeScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><path d="M6 30q14-6 28 0" fill="none" stroke={C_CJ.deep} strokeWidth="3" {...SJ} /><circle cx="24" cy="27" r="4" fill={C_CJ.core} /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><path d="M20 22l3 8-3-2-3 2z" fill={C_CJ.glow} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><path d="M8 32q10-14 24-16" fill="none" stroke={C_CJ.deep} strokeWidth="3.2" {...SJ} /><circle cx="30" cy="16" r="4.4" fill={C_CJ.core} /></g>
        <g className="g01-flash" style={dm(delayMs, 210)}><circle cx="30" cy="16" r="7" fill="none" stroke={C_CJ.glow} strokeWidth="1.8" /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><path d="M12 12l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill={C_CJ.glow} /></g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(255,200,97,0.3)" delayMs={delayMs} />
      <P x={50} y={64} w={30} h={2.4} cls="g01-tell" style={{ background: C_CJ.deep, borderRadius: "999px", ...dm(delayMs, 0) }} />
      <P x={50} y={62} w={30} h={4} cls="g01-cj-fuse" style={dm(delayMs, 140)}>
        <svg viewBox="0 0 200 24" className="block h-full w-full" preserveAspectRatio="none"><path d="M2 16q24-12 48 0t48 0 48 0 48 0" fill="none" stroke={C_CJ.core} strokeWidth="6" {...SJ} /></svg>
      </P>
      <P x={50} y={61} w={4} h={4} cls="g01-cj-ember" style={{ background: C_CJ.glow, borderRadius: "50%", ...dm(delayMs, 260) }} />
      {CJ_ROCKETS.map((r, i) => (
        <P key={i} x={r.x} y={58} w={3} h={9} cls="g01-fling" style={sv(dm(delayMs, 380 + i * 90), { "--g01-mx": r.mx, "--g01-my": r.my, "--g01-mr": r.mr })} ><svg viewBox="0 0 20 60" className="block h-full w-full"><path d="M10 2l6 16v34H4V18z" fill={C_CJ.core} stroke={C_CJ.deep} strokeWidth="3" {...SJ} /></svg></P> ))} <P x={50} y={26} w={11} h={11} cls="g01-cj-catch" style={dm(delayMs, 660)}><svg viewBox="0 0 60 60" className="block h-full w-full"><path d="M8 40l4-20 9 9 9-15 9 15 9-9 4 20z" fill={C_CJ.glow} stroke={C_CJ.deep} strokeWidth="4" {...SJ} /></svg></P><P x={50} y={44} w={26} h={1.6} cls="g01-lean" style={sv({ background: C_CJ.core, ...dm(delayMs, 760) }, { "--g01-lean": "calc(var(--fx-side, 1) * -300%)" })} />
    </Wide>
  );
}

/* =============================================================================
   3. Flag on Their Wall (t8). Registered as FlagOnTheirWallRule (PER-CARD RULE SCENES, below),
   whose lead draws the card's own rule. The target and entrance cuts here are the
   small square-local icons this card has always had.
   ========================================================================== */

const C_FW = { core: "#e0b45c", glow: "#fff4d6", deep: "#33270c" };

function FlagOnTheirWallCuts({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><path d="M14 34V8" stroke={C_FW.core} strokeWidth="3" {...SJ} /><path d="M14 9h14l-4 5 4 5H14z" fill={C_FW.core} stroke={C_FW.deep} strokeWidth="1.8" {...SJ} /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><path d="M14 33l16-7" stroke={C_FW.deep} strokeWidth="4" {...SJ} opacity="0.8" /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><circle cx="20" cy="24" r="12" fill="none" stroke={C_FW.core} strokeWidth="2.2" /><path d="M20 24V10" stroke={C_FW.glow} strokeWidth="2.6" {...SJ} /></g>
        <g className="g01-fw-snap" style={dm(delayMs, 220)}><path d="M20 24l10 5" stroke={C_FW.deep} strokeWidth="3.4" {...SJ} /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><circle cx="20" cy="24" r="16" fill="none" stroke={C_FW.core} strokeWidth="1.4" strokeDasharray="3 3" /></g>
      </Sq>
    );
  return null;
}

/* =============================================================================
   4. The Great Armistice (t8) — TWO METRONOMES PINNED. Tell: both arms tick
   apart, out of phase. Strike: an iron bar drops across the pair and pins the
   arms mid-beat. Settle: the bar rings once and the whole board exhales.
   ========================================================================== */

const C_GA = { core: "#9fc6e8", glow: "#fff4d6", deep: "#14273a" };

function GreatArmisticeScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><path d="M20 32L13 8h14z" fill={C_GA.deep} stroke={C_GA.core} strokeWidth="2.2" {...SJ} /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><path d="M6 20h28" stroke={C_GA.glow} strokeWidth="3.4" {...SJ} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><path d="M20 34L12 8h16z" fill={C_GA.deep} stroke={C_GA.core} strokeWidth="2.4" {...SJ} /></g>
        <g className="g01-ga-arm" style={dm(delayMs, 210)}><path d="M20 30V9" stroke={C_GA.glow} strokeWidth="2.6" {...SJ} /><rect x="17" y="16" width="6" height="4" fill={C_GA.core} /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 390)}><path d="M5 34h30" stroke={C_GA.core} strokeWidth="2" {...SJ} /></g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(159,198,232,0.28)" delayMs={delayMs} />
      <Band color="rgba(20,39,58,0.5)" delayMs={delayMs + 40} y={66} h={5} />
      {[41, 59].map((x, i) => (
        <P key={i} x={x} y={56} w={13} h={20} cls="g01-pop" style={dm(delayMs, 120)}>
          <svg viewBox="0 0 60 100" className="block h-full w-full"><path d="M30 6L6 94h48z" fill={C_GA.deep} stroke={C_GA.core} strokeWidth="6" {...SJ} /></svg>
        </P>
      ))}
      {[41, 59].map((x, i) => (
        <P key={i} x={x} y={54} w={4} h={17} cls="g01-ga-arm" style={sv(dm(delayMs, 200), { "--g01-a": i === 0 ? "17deg" : "-17deg" })} ><svg viewBox="0 0 20 90" className="block h-full w-full"><path d="M10 88V4" stroke={C_GA.glow} strokeWidth="5" {...SJ} /><rect x="3" y="26" width="14" height="9" fill={C_GA.core} /></svg></P> ))} <P x={50} y={42} w={34} h={3.4} cls="g01-ga-bar" style={dm(delayMs, 400)}><svg viewBox="0 0 200 20" className="block h-full w-full" preserveAspectRatio="none"><rect x="0" y="3" width="200" height="14" fill={C_GA.core} stroke={C_GA.deep} strokeWidth="3" /></svg></P><P x={50} y={50} w={30} h={1.4} cls="g01-lean" style={sv({ background: C_GA.glow, ...dm(delayMs, 640) }, { "--g01-lean": "calc(var(--fx-side, 1) * -240%)" })} />
      <Drift color={C_GA.glow} delayMs={delayMs + 700} n={4} />
    </Wide>
  );
}

/* =============================================================================
   5. Hundred-Year Lease (t8). Registered as HundredYearLeaseRule (PER-CARD RULE SCENES, below),
   whose lead draws the card's own rule. The target and entrance cuts here are the
   small square-local icons this card has always had.
   ========================================================================== */

const C_HL = { core: "#69c3d8", glow: "#eafaff", deep: "#0e2c36" };

function HundredYearLeaseCuts({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><path d="M12 6h16v18a8 8 0 0 1-16 0z" fill={C_HL.deep} stroke={C_HL.core} strokeWidth="2.2" {...SJ} /><path d="M13 18h14" stroke={C_HL.core} strokeWidth="2.6" /></g>
        <g className="g01-hit2" style={dm(delayMs, 210)}><circle cx="20" cy="33" r="3.2" fill={C_HL.glow} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><path d="M11 5h18v20a9 9 0 0 1-18 0z" fill={C_HL.deep} stroke={C_HL.core} strokeWidth="2.4" {...SJ} /></g>
        <g className="g01-hl-plug" style={dm(delayMs, 210)}><rect x="16" y="28" width="8" height="7" fill={C_HL.glow} stroke={C_HL.deep} strokeWidth="1.8" /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><path d="M11 20h18" stroke={C_HL.core} strokeWidth="2.4" {...SJ} /></g>
      </Sq>
    );
  return null;
}

/* =============================================================================
   6. Liberator's March (t8). Registered as LiberatorsMarchRule (PER-CARD RULE SCENES, below),
   whose lead draws the card's own rule. The target and entrance cuts here are the
   small square-local icons this card has always had.
   ========================================================================== */

const C_LM = { core: "#d5b978", glow: "#fff4d6", deep: "#2e2410" };

function LiberatorsMarchCuts({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><circle cx="20" cy="20" r="11" fill="none" stroke={C_LM.core} strokeWidth="2.6" strokeDasharray="3 3.4" /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><path d="M20 6l4 6h-8z" fill={C_LM.glow} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><circle cx="20" cy="22" r="12" fill={C_LM.deep} stroke={C_LM.core} strokeWidth="2.4" strokeDasharray="3.4 3.6" /></g>
        <g className="g01-lm-pallet" style={dm(delayMs, 210)}><path d="M8 6l8 8-4 5-8-7z" fill={C_LM.glow} stroke={C_LM.deep} strokeWidth="1.6" {...SJ} /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><circle cx="20" cy="22" r="16" fill="none" stroke={C_LM.core} strokeWidth="1.4" /></g>
      </Sq>
    );
  return null;
}

/* =============================================================================
   7. Masked Ball (t8) — THE CUCKOO DOORS. Tell: the little doors shiver on
   their catch. Strike: they bang open and a turntable of masked dancers swings
   out instead of a bird. Settle: the dancers turn back inside, and a ribbon
   falls.
   ========================================================================== */

const C_MB = { core: "#c58fd6", glow: "#fff0e6", deep: "#2a1236" };

function MaskedBallScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><path d="M8 14h24c0 11-5 17-12 17S8 25 8 14z" fill={C_MB.core} stroke={C_MB.deep} strokeWidth="2.2" {...SJ} /><ellipse cx="15" cy="20" rx="2.6" ry="2" fill={C_MB.deep} /><ellipse cx="25" cy="20" rx="2.6" ry="2" fill={C_MB.deep} /></g>
        <g className="g01-hit2" style={dm(delayMs, 210)}><path d="M8 34q12 5 24 0" fill="none" stroke={C_MB.glow} strokeWidth="2.6" {...SJ} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><rect x="9" y="10" width="22" height="22" fill={C_MB.deep} stroke={C_MB.core} strokeWidth="2.4" /><path d="M20 10v22" stroke={C_MB.core} strokeWidth="2" /></g>
        <g className="g01-mb-door" style={dm(delayMs, 210)}><path d="M9 10h11v22H9z" fill={C_MB.core} opacity="0.9" /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><path d="M13 21h14c0 6-3 9-7 9s-7-3-7-9z" fill={C_MB.glow} /></g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(197,143,214,0.3)" delayMs={delayMs} />
      <P x={50} y={52} w={22} h={22} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full"><path d="M50 4l40 26v66H10V30z" fill={C_MB.deep} stroke={C_MB.core} strokeWidth="6" {...SJ} /></svg>
      </P>
      <P x={44} y={52} w={9} h={16} cls="g01-mb-door" style={sv(dm(delayMs, 170), { "--g01-a": "-84deg", "--g01-mx": "-52%" })}>
        <svg viewBox="0 0 40 80" className="block h-full w-full"><rect x="2" y="2" width="36" height="76" fill={C_MB.core} stroke={C_MB.deep} strokeWidth="4" /></svg>
      </P>
      <P x={56} y={52} w={9} h={16} cls="g01-mb-door" style={sv(dm(delayMs, 170), { "--g01-a": "84deg", "--g01-mx": "52%" })}>
        <svg viewBox="0 0 40 80" className="block h-full w-full"><rect x="2" y="2" width="36" height="76" fill={C_MB.core} stroke={C_MB.deep} strokeWidth="4" /></svg>
      </P>
      <P x={50} y={52} w={16} h={10} cls="g01-mb-turn" style={dm(delayMs, 340)}>
        <svg viewBox="0 0 80 50" className="block h-full w-full"><path d="M8 18h26c0 16-6 24-13 24S8 34 8 18z" fill={C_MB.glow} stroke={C_MB.deep} strokeWidth="4" {...SJ} /><path d="M46 18h26c0 16-6 24-13 24s-13-8-13-24z" fill={C_MB.core} stroke={C_MB.deep} strokeWidth="4" {...SJ} /></svg>
      </P>
      <P x={50} y={68} w={22} h={2} cls="g01-lean" style={sv({ background: C_MB.glow, ...dm(delayMs, 620) }, { "--g01-lean": "calc(var(--fx-side, 1) * -180%)" })} />
      <Drift color={C_MB.glow} delayMs={delayMs + 700} n={4} />
    </Wide>
  );
}

/* =============================================================================
   8. The Meek Inherit (t8). Registered as MeekInheritRule (PER-CARD RULE SCENES, below),
   whose lead draws the card's own rule. The target and entrance cuts here are the
   small square-local icons this card has always had.
   ========================================================================== */

const C_MI = { core: "#a8b8a0", glow: "#f6f2df", deep: "#1f2a1c" };

function MeekInheritCuts({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><path d="M20 4v18" stroke={C_MI.core} strokeWidth="2.2" strokeDasharray="2.4 2.4" /><path d="M14 22h12l3 12H11z" fill={C_MI.deep} stroke={C_MI.core} strokeWidth="2" {...SJ} /></g>
        <g className="g01-hit2" style={dm(delayMs, 210)}><path d="M6 36h28" stroke={C_MI.glow} strokeWidth="2.6" {...SJ} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><path d="M13 6h14l4 14H9z" fill={C_MI.deep} stroke={C_MI.core} strokeWidth="2.4" {...SJ} /></g>
        <g className="g01-mi-weight" style={dm(delayMs, 220)}><path d="M15 20h10l3 13H12z" fill={C_MI.core} stroke={C_MI.deep} strokeWidth="2" {...SJ} /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><path d="M7 35h26" stroke={C_MI.glow} strokeWidth="2.2" {...SJ} /></g>
      </Sq>
    );
  return null;
}

/* =============================================================================
   9. Midas Charter (t8) — THE TOKEN METER. Tell: the slot's shutter clicks
   open. Strike: a gold token drops in and the meter's dial JUMPS a whole band
   higher. Settle: the dial creeps back a hair and two skipped-draft blanks fall
   out of the coin return.
   ========================================================================== */

const C_MC = { core: "#f2c14b", glow: "#fff4d6", deep: "#37280a" };

function MidasCharterScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><circle cx="20" cy="18" r="8" fill={C_MC.core} stroke={C_MC.deep} strokeWidth="2.2" /><path d="M20 13v10" stroke={C_MC.deep} strokeWidth="2.4" {...SJ} /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><path d="M10 32h20" stroke={C_MC.glow} strokeWidth="3" {...SJ} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><rect x="11" y="12" width="18" height="24" fill={C_MC.deep} stroke={C_MC.core} strokeWidth="2.4" /><rect x="16" y="16" width="8" height="3" fill={C_MC.core} /></g>
        <g className="g01-mc-token" style={dm(delayMs, 210)}><circle cx="20" cy="7" r="5" fill={C_MC.glow} stroke={C_MC.deep} strokeWidth="1.8" /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><path d="M13 28h14" stroke={C_MC.core} strokeWidth="2.4" {...SJ} /></g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(242,193,75,0.3)" delayMs={delayMs} />
      <P x={50} y={56} w={17} h={24} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 80 110" className="block h-full w-full"><rect x="6" y="10" width="68" height="94" fill={C_MC.deep} stroke={C_MC.core} strokeWidth="6" /><rect x="32" y="18" width="16" height="6" fill={C_MC.core} /></svg>
      </P>
      <P x={50} y={38} w={5} h={5} cls="g01-mc-token" style={{ background: C_MC.glow, borderRadius: "50%", ...dm(delayMs, 170) }} />
      <P x={50} y={56} w={13} h={13} cls="g01-mc-dial" style={dm(delayMs, 360)}>
        <svg viewBox="0 0 60 60" className="block h-full w-full"><circle cx="30" cy="30" r="25" fill="none" stroke={C_MC.glow} strokeWidth="5" /><path d="M30 30V9" stroke={C_MC.core} strokeWidth="6" {...SJ} /></svg>
      </P>
      {[0, 1].map((i) => (
        <P key={i} x={50} y={68} w={6} h={4} cls="g01-fling" style={sv(dm(delayMs, 560 + i * 90), { "--g01-mx": i === 0 ? "-190%" : "190%", "--g01-my": "170%", "--g01-mr": i === 0 ? "-40deg" : "40deg", background: C_MC.deep })} />
      ))}
      <P x={50} y={44} w={26} h={1.6} cls="g01-lean" style={sv({ background: C_MC.core, ...dm(delayMs, 700) }, { "--g01-lean": "calc(var(--fx-side, 1) * -250%)" })} />
      <Drift color={C_MC.glow} delayMs={delayMs + 760} n={4} />
    </Wide>
  );
}

/* =============================================================================
   10. Pact of the Dawn (t8). Registered as PactOfTheDawnRule (PER-CARD RULE SCENES, below),
   whose lead draws the card's own rule. The target and entrance cuts here are the
   small square-local icons this card has always had.
   ========================================================================== */

const C_PD = { core: "#ffab5e", glow: "#fff3d8", deep: "#2b1a3c" };

function PactOfTheDawnCuts({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><circle cx="20" cy="24" r="9" fill={C_PD.core} /><path d="M6 33h28" stroke={C_PD.deep} strokeWidth="3" {...SJ} /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><path d="M20 8v5M9 12l3 4M31 12l-3 4" stroke={C_PD.glow} strokeWidth="2.6" {...SJ} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><path d="M14 33V13l6-6 4 5 6 2-5 5v14z" fill={C_PD.deep} stroke={C_PD.core} strokeWidth="2.2" {...SJ} /></g>
        <g className="g01-pd-crow" style={dm(delayMs, 210)}><path d="M28 12q6-3 9 1" fill="none" stroke={C_PD.glow} strokeWidth="2.4" {...SJ} /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><circle cx="20" cy="22" r="15" fill="none" stroke={C_PD.core} strokeWidth="1.6" /></g>
      </Sq>
    );
  return null;
}

/* =============================================================================
   11. Queen's Aegis (t8). Registered as QueensAegisRule (PER-CARD RULE SCENES, below),
   whose lead draws the card's own rule. The target and entrance cuts here are the
   small square-local icons this card has always had.
   ========================================================================== */

const C_QA = { core: "#7fb8e6", glow: "#eef6ff", deep: "#132437" };

function QueensAegisCuts({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><circle cx="20" cy="20" r="12" fill="none" stroke={C_QA.core} strokeWidth="2.4" /><circle cx="32" cy="20" r="4" fill={C_QA.glow} /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><circle cx="20" cy="20" r="4.6" fill={C_QA.core} stroke={C_QA.deep} strokeWidth="1.8" /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><ellipse cx="20" cy="22" rx="15" ry="7" fill="none" stroke={C_QA.core} strokeWidth="2.2" /><circle cx="20" cy="22" r="5" fill={C_QA.deep} stroke={C_QA.core} strokeWidth="2" /></g>
        <g className="g01-qa-orbit" style={dm(delayMs, 210)}><circle cx="34" cy="22" r="3.6" fill={C_QA.glow} /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><path d="M13 9l3 5 4-6 4 6 3-5" fill="none" stroke={C_QA.core} strokeWidth="2" {...SJ} /></g>
      </Sq>
    );
  return null;
}

/* =============================================================================
   12. Royal Privilege (t8). Registered as RoyalPrivilegeRule (PER-CARD RULE SCENES, below),
   whose lead draws the card's own rule. The target and entrance cuts here are the
   small square-local icons this card has always had.
   ========================================================================== */

const C_RP = { core: "#d9a3e6", glow: "#fff2e8", deep: "#2b1436" };

function RoyalPrivilegeCuts({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><circle cx="20" cy="20" r="6" fill="none" stroke={C_RP.core} strokeWidth="3" /><path d="M20 26v10M16 32h8" stroke={C_RP.core} strokeWidth="3" {...SJ} /></g>
        <g className="g01-hit2" style={dm(delayMs, 210)}><circle cx="20" cy="20" r="12" fill="none" stroke={C_RP.glow} strokeWidth="2" strokeDasharray="3 4" /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><circle cx="20" cy="14" r="7" fill="none" stroke={C_RP.core} strokeWidth="3" /><path d="M20 21v13M15 29h10" stroke={C_RP.core} strokeWidth="3" {...SJ} /></g>
        <g className="g01-rp-key" style={dm(delayMs, 220)}><circle cx="20" cy="14" r="3" fill={C_RP.glow} /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><circle cx="20" cy="22" r="15" fill="none" stroke={C_RP.core} strokeWidth="1.5" /></g>
      </Sq>
    );
  return null;
}

/* =============================================================================
   13. The Royal We (t8) — THE ALARM SILENCED. Tell: the twin bells shiver as
   the hammer winds back. Strike: a crown is jammed between the hammer and the
   bells, and the strike lands on metal that cannot ring. Settle: the hammer
   quivers against the crown and gives up.
   ========================================================================== */

const C_RW = { core: "#e8c46a", glow: "#fff4d6", deep: "#312409" };

function RoyalWeScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><circle cx="12" cy="10" r="6" fill={C_RW.core} stroke={C_RW.deep} strokeWidth="2" /><circle cx="28" cy="10" r="6" fill={C_RW.core} stroke={C_RW.deep} strokeWidth="2" /><circle cx="20" cy="24" r="10" fill={C_RW.deep} stroke={C_RW.core} strokeWidth="2.2" /></g>
        <g className="g01-hit2" style={dm(delayMs, 210)}><path d="M14 24l3-6 3 4 3-4 3 6z" fill={C_RW.glow} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><circle cx="11" cy="11" r="7" fill={C_RW.deep} stroke={C_RW.core} strokeWidth="2.4" /><circle cx="29" cy="11" r="7" fill={C_RW.deep} stroke={C_RW.core} strokeWidth="2.4" /><circle cx="20" cy="26" r="11" fill={C_RW.deep} stroke={C_RW.core} strokeWidth="2.4" /></g>
        <g className="g01-rw-crown" style={dm(delayMs, 220)}><path d="M13 12l2-6 5 4 5-4 2 6z" fill={C_RW.glow} stroke={C_RW.deep} strokeWidth="1.6" {...SJ} /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><path d="M20 22v-5" stroke={C_RW.core} strokeWidth="2.4" {...SJ} /></g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(232,196,106,0.28)" delayMs={delayMs} />
      <P x={50} y={62} w={20} h={3.4} cls="g01-tell" style={{ background: C_RW.deep, borderRadius: "50%", ...dm(delayMs, 0) }} />
      <P x={42} y={44} w={11} h={11} cls="g01-pop" style={dm(delayMs, 130)}>
        <svg viewBox="0 0 50 50" className="block h-full w-full"><circle cx="25" cy="25" r="21" fill={C_RW.deep} stroke={C_RW.core} strokeWidth="6" /></svg>
      </P>
      <P x={58} y={44} w={11} h={11} cls="g01-pop" style={dm(delayMs, 130)}>
        <svg viewBox="0 0 50 50" className="block h-full w-full"><circle cx="25" cy="25" r="21" fill={C_RW.deep} stroke={C_RW.core} strokeWidth="6" /></svg>
      </P>
      <P x={50} y={41} w={4} h={12} cls="g01-rw-hammer" style={dm(delayMs, 240)}>
        <svg viewBox="0 0 20 60" className="block h-full w-full"><path d="M10 58V16" stroke={C_RW.core} strokeWidth="5" {...SJ} /><circle cx="10" cy="10" r="8" fill={C_RW.core} /></svg>
      </P>
      <P x={50} y={41} w={12} h={9} cls="g01-rw-crown" style={dm(delayMs, 400)}>
        <svg viewBox="0 0 60 44" className="block h-full w-full"><path d="M6 38L10 8l10 10 10-14 10 14 10-10 4 30z" fill={C_RW.glow} stroke={C_RW.deep} strokeWidth="4" {...SJ} /></svg>
      </P>
      <P x={50} y={54} w={26} h={1.6} cls="g01-lean" style={sv({ background: C_RW.glow, ...dm(delayMs, 640) }, { "--g01-lean": "calc(var(--fx-side, 1) * -230%)" })} />
      <Drift color={C_RW.glow} delayMs={delayMs + 700} n={4} />
    </Wide>
  );
}

/* =============================================================================
   14. Siege Mentality (t8). Registered as SiegeMentalityRule (PER-CARD RULE SCENES, below),
   whose lead draws the card's own rule. The target and entrance cuts here are the
   small square-local icons this card has always had.
   ========================================================================== */

const C_SM = { core: "#d98a5a", glow: "#ffe9cf", deep: "#331a0e" };

function SiegeMentalityCuts({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><ellipse cx="20" cy="20" rx="13" ry="8" fill={C_SM.deep} stroke={C_SM.core} strokeWidth="2.4" /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><path d="M12 32l16-20" stroke={C_SM.glow} strokeWidth="3" {...SJ} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><ellipse cx="20" cy="17" rx="14" ry="8" fill={C_SM.deep} stroke={C_SM.core} strokeWidth="2.4" /><path d="M6 17v8a14 8 0 0 0 28 0v-8" fill={C_SM.deep} stroke={C_SM.core} strokeWidth="2.4" {...SJ} /></g>
        <g className="g01-sm-stick" style={dm(delayMs, 210)}><path d="M30 4L18 15" stroke={C_SM.glow} strokeWidth="3.2" {...SJ} /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><ellipse cx="20" cy="17" rx="17" ry="10" fill="none" stroke={C_SM.core} strokeWidth="1.6" /></g>
      </Sq>
    );
  return null;
}

/* =============================================================================
   15. The Unequal Treaty (t8). Registered as UnequalTreatyRule (PER-CARD RULE SCENES, below),
   whose lead draws the card's own rule. The target and entrance cuts here are the
   small square-local icons this card has always had.
   ========================================================================== */

const C_UT = { core: "#f0a05a", glow: "#fff2d2", deep: "#2f1a0c" };

function UnequalTreatyCuts({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><rect x="16" y="14" width="8" height="22" fill={C_UT.glow} stroke={C_UT.deep} strokeWidth="2" /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><path d="M20 12c3-4 0-6 0-8-2 3-4 4-4 6a4 4 0 0 0 8 0" fill={C_UT.core} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><rect x="11" y="12" width="7" height="24" fill={C_UT.glow} stroke={C_UT.deep} strokeWidth="2" /><rect x="23" y="20" width="7" height="16" fill={C_UT.glow} stroke={C_UT.deep} strokeWidth="2" /></g>
        <g className="g01-ut-flame-a" style={dm(delayMs, 210)}><path d="M14.5 11c2-3 0-5 0-6-1 2-3 3-3 5a3 3 0 0 0 6 0" fill={C_UT.core} /><path d="M26.5 19c2-3 0-5 0-6-1 2-3 3-3 5a3 3 0 0 0 6 0" fill={C_UT.core} /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><path d="M6 36h28" stroke={C_UT.core} strokeWidth="2.2" {...SJ} /></g>
      </Sq>
    );
  return null;
}

/* =============================================================================
   16. Year of Jubilee (t8). Registered as YearOfJubileeRule (PER-CARD RULE SCENES, below),
   whose lead draws the card's own rule. The target and entrance cuts here are the
   small square-local icons this card has always had.
   ========================================================================== */

const C_YJ = { core: "#8ed6a0", glow: "#f0ffe8", deep: "#123322" };

function YearOfJubileeCuts({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><circle cx="20" cy="20" r="12" fill="none" stroke={C_YJ.core} strokeWidth="3" strokeDasharray="2.6 4" /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><path d="M20 5v9" stroke={C_YJ.glow} strokeWidth="3.4" {...SJ} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><circle cx="20" cy="22" r="13" fill={C_YJ.deep} stroke={C_YJ.core} strokeWidth="2.6" strokeDasharray="3 4.4" /></g>
        <g className="g01-yj-pawl" style={dm(delayMs, 220)}><path d="M20 4l4 8h-8z" fill={C_YJ.glow} stroke={C_YJ.deep} strokeWidth="1.6" {...SJ} /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><path d="M20 22v-8" stroke={C_YJ.core} strokeWidth="2.4" {...SJ} /></g>
      </Sq>
    );
  return null;
}

/* =============================================================================
   17. Debt of Crowns (t8) — THE TALLY STICK. Tell: the knife scores a fresh
   notch into the hazel rod. Strike: the rod is SNAPPED across the grain and
   the two halves fly apart down the aim vector, stock and foil. Settle: the
   creditor's half sails away toward the debtor, still glowing.
   ========================================================================== */

const C_DC = { core: "#c9a06a", glow: "#ffeccd", deep: "#2c1c0a" };

function DebtOfCrownsScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><rect x="6" y="17" width="28" height="7" fill={C_DC.core} stroke={C_DC.deep} strokeWidth="2" /><path d="M12 17v7M18 17v7M24 17v7" stroke={C_DC.deep} strokeWidth="1.8" /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><path d="M20 10v20" stroke={C_DC.glow} strokeWidth="2.6" {...SJ} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><rect x="5" y="18" width="30" height="8" fill={C_DC.core} stroke={C_DC.deep} strokeWidth="2.2" /></g>
        <g className="g01-dc-notch" style={dm(delayMs, 210)}><path d="M13 18v8M20 18v8M27 18v8" stroke={C_DC.deep} strokeWidth="2.2" /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><path d="M20 8l3 6-3-1-3 1z" fill={C_DC.glow} /></g>
      </Sq>
    );
  return (
    <Aim>
      <Wash tint="rgba(201,160,106,0.26)" delayMs={delayMs} />
      <P x={50} y={52} w={30} h={5} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 200 32" className="block h-full w-full" preserveAspectRatio="none"><rect x="2" y="6" width="196" height="20" fill={C_DC.core} stroke={C_DC.deep} strokeWidth="4" /><path d="M30 6v20M56 6v20M82 6v20M118 6v20M144 6v20M170 6v20" stroke={C_DC.deep} strokeWidth="4" /></svg>
      </P>
      <P x={50} y={46} w={7} h={8} cls="g01-dc-notch" style={dm(delayMs, 160)}>
        <svg viewBox="0 0 40 44" className="block h-full w-full"><path d="M4 4l32 22-6 10L2 14z" fill={C_DC.glow} stroke={C_DC.deep} strokeWidth="4" {...SJ} /></svg>
      </P>
      <P x={38} y={52} w={16} h={5} cls="g01-dc-snap" style={sv(dm(delayMs, 340), { "--g01-mr": "-26deg", "--g01-mx": "-70%" })}>
        <svg viewBox="0 0 100 32" className="block h-full w-full" preserveAspectRatio="none"><path d="M2 6h96l-14 10 14 10H2z" fill={C_DC.core} stroke={C_DC.deep} strokeWidth="4" {...SJ} /></svg>
      </P>
      <P x={62} y={52} w={16} h={5} cls="g01-dc-snap" style={sv(dm(delayMs, 340), { "--g01-mr": "26deg", "--g01-mx": "120%" })}>
        <svg viewBox="0 0 100 32" className="block h-full w-full" preserveAspectRatio="none"><path d="M98 6H2l14 10L2 26h96z" fill={C_DC.glow} stroke={C_DC.deep} strokeWidth="4" {...SJ} /></svg>
      </P>
      <P x={62} y={52} w={22} h={1.6} cls="g01-reach" style={sv({ background: C_DC.glow, transformOrigin: "0% 50%", ...dm(delayMs, 620) }, { "--g01-len": "calc(var(--fx-len, 3) / 3)" })} />
      <Drift color={C_DC.glow} delayMs={delayMs + 700} n={4} />
    </Aim>
  );
}

/* =============================================================================
   18. The Last Toll (t8) — THE ROPE PULLED EARLY. Tell: the sally rope goes
   taut before the hour. Strike: the great bell swings twice and two rings of
   sound roll down the vector at the opponent. Settle: the rope runs slack and
   the bell hangs mouth-open.
   ========================================================================== */

const C_LT = { core: "#c4b48f", glow: "#fff4d6", deep: "#2a2416" };

function LastTollScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><path d="M20 8c7 0 10 6 10 13v7H10v-7c0-7 3-13 10-13z" fill={C_LT.deep} stroke={C_LT.core} strokeWidth="2.2" {...SJ} /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><circle cx="20" cy="31" r="3" fill={C_LT.glow} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><path d="M20 7c8 0 11 7 11 15v8H9v-8C9 14 12 7 20 7z" fill={C_LT.deep} stroke={C_LT.core} strokeWidth="2.4" {...SJ} /></g>
        <g className="g01-lt-clapper" style={dm(delayMs, 210)}><circle cx="20" cy="32" r="3.4" fill={C_LT.glow} /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><path d="M5 35h30" stroke={C_LT.core} strokeWidth="2.2" {...SJ} /></g>
      </Sq>
    );
  return (
    <Aim>
      <Wash tint="rgba(196,180,143,0.28)" delayMs={delayMs} />
      <P x={44} y={40} w={3} h={22} cls="g01-tell" style={{ background: C_LT.core, ...dm(delayMs, 0) }} />
      <P x={44} y={56} w={17} h={16} cls="g01-lt-bell" style={dm(delayMs, 150)}>
        <svg viewBox="0 0 90 84" className="block h-full w-full"><path d="M45 6c26 0 32 22 32 44v26H13V50C13 28 19 6 45 6z" fill={C_LT.deep} stroke={C_LT.core} strokeWidth="6" {...SJ} /><path d="M8 76h74" stroke={C_LT.core} strokeWidth="6" {...SJ} /></svg>
      </P>
      <P x={44} y={68} w={4} h={5} cls="g01-lt-clapper" style={{ background: C_LT.glow, borderRadius: "50%", ...dm(delayMs, 320) }} />
      {[0, 1].map((i) => (
        <P key={i} x={58} y={56} w={16} h={16} cls="g01-lt-wave" style={dm(delayMs, 420 + i * 150)}>
          <svg viewBox="0 0 80 80" className="block h-full w-full"><path d="M18 8q26 32 0 64" fill="none" stroke={C_LT.glow} strokeWidth="6" {...SJ} /><path d="M40 2q34 38 0 76" fill="none" stroke={C_LT.core} strokeWidth="5" {...SJ} /></svg>
        </P>
      ))}
      <P x={64} y={56} w={22} h={1.6} cls="g01-reach" style={sv({ background: C_LT.glow, transformOrigin: "0% 50%", ...dm(delayMs, 680) }, { "--g01-len": "calc(var(--fx-len, 3) / 3)" })} />
      <Drift color={C_LT.glow} delayMs={delayMs + 740} n={4} />
    </Aim>
  );
}

/* =============================================================================
   19. Royal Lockdown (t8) — THE PORTCULLIS ON THE DIAL. Tell: the winch pawl
   is knocked out. Strike: an iron grille drops across the clock face and both
   hands JAM against the bars. Settle: rust dust falls off the bars and the
   hands twitch, going nowhere.
   ========================================================================== */

const C_RL = { core: "#8f9aa8", glow: "#f2f0e2", deep: "#181d26" };

function RoyalLockdownScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><path d="M8 6v28M16 6v28M24 6v28M32 6v28M6 16h28M6 26h28" stroke={C_RL.core} strokeWidth="2.4" /></g>
        <g className="g01-hit2" style={dm(delayMs, 210)}><path d="M20 20V10M20 20l7 5" stroke={C_RL.glow} strokeWidth="2.6" {...SJ} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><circle cx="20" cy="21" r="13" fill={C_RL.deep} stroke={C_RL.core} strokeWidth="2.4" /><path d="M20 21V12M20 21l6 5" stroke={C_RL.glow} strokeWidth="2.4" {...SJ} /></g>
        <g className="g01-rl-gate" style={dm(delayMs, 220)}><path d="M11 5v30M20 5v30M29 5v30" stroke={C_RL.core} strokeWidth="2.6" /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><path d="M5 35h30" stroke={C_RL.glow} strokeWidth="2.4" {...SJ} /></g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(143,154,168,0.3)" delayMs={delayMs} />
      <P x={50} y={52} w={24} h={24} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full"><circle cx="50" cy="50" r="44" fill={C_RL.deep} stroke={C_RL.core} strokeWidth="6" /><path d="M50 12v8M88 50h-8M50 88v-8M12 50h8" stroke={C_RL.core} strokeWidth="5" {...SJ} /></svg>
      </P>
      <P x={50} y={52} w={17} h={17} cls="g01-rl-hand" style={dm(delayMs, 170)}>
        <svg viewBox="0 0 80 80" className="block h-full w-full"><path d="M40 40V14M40 40l20 12" fill="none" stroke={C_RL.glow} strokeWidth="6" {...SJ} /><circle cx="40" cy="40" r="5" fill={C_RL.glow} /></svg>
      </P>
      <P x={50} y={50} w={30} h={30} cls="g01-rl-gate" style={dm(delayMs, 330)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full" preserveAspectRatio="none"><path d="M14 0v100M32 0v100M50 0v100M68 0v100M86 0v100" stroke={C_RL.core} strokeWidth="7" /><path d="M0 26h100M0 62h100" stroke={C_RL.core} strokeWidth="6" /><path d="M14 100l6-10M32 100l6-10M50 100l6-10M68 100l6-10M86 100l6-10" stroke={C_RL.core} strokeWidth="6" {...SJ} /></svg>
      </P>
      <P x={50} y={44} w={26} h={1.4} cls="g01-lean" style={sv({ background: C_RL.glow, ...dm(delayMs, 620) }, { "--g01-lean": "calc(var(--fx-side, 1) * -230%)" })} />
      <Drift color={C_RL.glow} delayMs={delayMs + 700} n={4} />
    </Wide>
  );
}

/* =============================================================================
   20. Tithe of Silence (t8). Registered as TitheOfSilenceRule (PER-CARD RULE SCENES, below),
   whose lead draws the card's own rule. The target and entrance cuts here are the
   small square-local icons this card has always had.
   ========================================================================== */

const C_TS = { core: "#9fb0c9", glow: "#f4f0e4", deep: "#171f2c" };

function TitheOfSilenceCuts({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><path d="M20 9c7 0 10 6 10 13v6H10v-6c0-7 3-13 10-13z" fill={C_TS.deep} stroke={C_TS.core} strokeWidth="2.2" {...SJ} /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><path d="M8 8l24 24" stroke={C_TS.glow} strokeWidth="3" {...SJ} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><path d="M20 6c8 0 12 7 12 16v8H8v-8c0-9 4-16 12-16z" fill={C_TS.deep} stroke={C_TS.core} strokeWidth="2.4" {...SJ} /></g>
        <g className="g01-ts-cloth" style={dm(delayMs, 220)}><path d="M12 28q8 7 16 0l3 5q-11 8-22 0z" fill={C_TS.glow} stroke={C_TS.deep} strokeWidth="1.6" {...SJ} /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><path d="M7 9l26 26" stroke={C_TS.core} strokeWidth="2.2" {...SJ} /></g>
      </Sq>
    );
  return null;
}

/* =============================================================================
   21. Time Heist (t8) — THE STOLEN FRAME. Tell: the sprocket holes shudder as
   the film catches. Strike: one frame is cut clean out of the strip and the
   remaining frames slam together across the gap, down the vector. Settle: the
   stolen frame drifts back in and is spliced on at the tail, six later.
   ========================================================================== */

const C_TH = { core: "#71d6c0", glow: "#eafff9", deep: "#0f2b28" };

function TimeHeistScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><rect x="6" y="12" width="28" height="16" fill={C_TH.deep} stroke={C_TH.core} strokeWidth="2.2" /><path d="M9 15h3M15 15h3M21 15h3M27 15h3" stroke={C_TH.core} strokeWidth="2.4" /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><path d="M20 8v24" stroke={C_TH.glow} strokeWidth="2.6" strokeDasharray="3 3" /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><rect x="5" y="10" width="30" height="20" fill={C_TH.deep} stroke={C_TH.core} strokeWidth="2.4" /><path d="M8 13h3M14 13h3M20 13h3M26 13h3M8 27h3M14 27h3M20 27h3M26 27h3" stroke={C_TH.core} strokeWidth="2.2" /></g>
        <g className="g01-th-slip" style={dm(delayMs, 220)}><rect x="16" y="15" width="9" height="10" fill={C_TH.glow} /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><path d="M5 20h30" stroke={C_TH.glow} strokeWidth="1.8" strokeDasharray="3 4" /></g>
      </Sq>
    );
  return (
    <Aim>
      <Wash tint="rgba(113,214,192,0.28)" delayMs={delayMs} />
      <P x={50} y={52} w={34} h={10} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 200 60" className="block h-full w-full" preserveAspectRatio="none"><rect x="0" y="4" width="200" height="52" fill={C_TH.deep} stroke={C_TH.core} strokeWidth="4" /><path d="M10 10h10M34 10h10M58 10h10M82 10h10M106 10h10M130 10h10M154 10h10M178 10h10" stroke={C_TH.core} strokeWidth="6" /><path d="M10 50h10M34 50h10M58 50h10M82 50h10M106 50h10M130 50h10M154 50h10M178 50h10" stroke={C_TH.core} strokeWidth="6" /></svg>
      </P>
      <P x={50} y={52} w={7} h={7} cls="g01-th-slip" style={sv(dm(delayMs, 180), { "--g01-mx": "-40%" })}>
        <svg viewBox="0 0 40 40" className="block h-full w-full"><rect x="2" y="2" width="36" height="36" fill={C_TH.glow} stroke={C_TH.deep} strokeWidth="4" /></svg>
      </P>
      <P x={40} y={52} w={13} h={7} cls="g01-th-frame" style={sv(dm(delayMs, 340), { "--g01-mx": "34%" })} >
        <svg viewBox="0 0 70 40" className="block h-full w-full" preserveAspectRatio="none"><rect x="2" y="2" width="66" height="36" fill="none" stroke={C_TH.core} strokeWidth="5" /></svg>
      </P>
      <P x={62} y={52} w={13} h={7} cls="g01-th-frame" style={sv(dm(delayMs, 340), { "--g01-mx": "-34%" })}>
        <svg viewBox="0 0 70 40" className="block h-full w-full" preserveAspectRatio="none"><rect x="2" y="2" width="66" height="36" fill="none" stroke={C_TH.core} strokeWidth="5" /></svg>
      </P>
      <P x={66} y={52} w={22} h={1.6} cls="g01-reach" style={sv({ background: C_TH.glow, transformOrigin: "0% 50%", ...dm(delayMs, 620) }, { "--g01-len": "calc(var(--fx-len, 3) / 3)" })} />
      <Drift color={C_TH.glow} delayMs={delayMs + 700} n={4} />
    </Aim>
  );
}

/* =============================================================================
   22. Champion's Rest (t7). Registered as ChampionsRestRule (PER-CARD RULE SCENES, below),
   whose lead draws the card's own rule. The target and entrance cuts here are the
   small square-local icons this card has always had.
   ========================================================================== */

const C_CR = { core: "#86c2a6", glow: "#f4ffe9", deep: "#152e24" };

function ChampionsRestCuts({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><circle cx="20" cy="20" r="12" fill="none" stroke={C_CR.core} strokeWidth="2.4" /><path d="M10 18q10 12 20 0" fill="none" stroke={C_CR.glow} strokeWidth="3" {...SJ} /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><path d="M24 8l4-3M28 12l5-2" stroke={C_CR.glow} strokeWidth="2.4" {...SJ} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><circle cx="20" cy="21" r="13" fill={C_CR.deep} stroke={C_CR.core} strokeWidth="2.4" /></g>
        <g className="g01-cr-sag" style={dm(delayMs, 220)}><path d="M10 17q10 13 20 0" fill="none" stroke={C_CR.glow} strokeWidth="3.2" {...SJ} /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><path d="M26 9q4-4 7-2" fill="none" stroke={C_CR.core} strokeWidth="2.2" {...SJ} /></g>
      </Sq>
    );
  return null;
}

/* =============================================================================
   23. Debtor's Holiday (t7). Registered as DebtorsHolidayRule (PER-CARD RULE SCENES, below),
   whose lead draws the card's own rule. The target and entrance cuts here are the
   small square-local icons this card has always had.
   ========================================================================== */

const C_DH = { core: "#e6d27a", glow: "#fff8dd", deep: "#302a0d" };

function DebtorsHolidayCuts({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><rect x="12" y="6" width="16" height="24" fill={C_DH.glow} stroke={C_DH.deep} strokeWidth="2" /><path d="M15 12h10M15 17h10" stroke={C_DH.deep} strokeWidth="1.8" /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><rect x="15" y="22" width="10" height="5" fill={C_DH.core} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><rect x="8" y="14" width="24" height="20" fill={C_DH.deep} stroke={C_DH.core} strokeWidth="2.4" /><rect x="14" y="18" width="12" height="4" fill={C_DH.core} /></g>
        <g className="g01-dh-card" style={dm(delayMs, 220)}><rect x="15" y="2" width="10" height="14" fill={C_DH.glow} stroke={C_DH.deep} strokeWidth="1.8" /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><path d="M8 36h24" stroke={C_DH.core} strokeWidth="2.2" {...SJ} /></g>
      </Sq>
    );
  return null;
}

/* =============================================================================
   24. Escape Artist (t7). Registered as EscapeArtistRule (PER-CARD RULE SCENES, below),
   whose lead draws the card's own rule. The target and entrance cuts here are the
   small square-local icons this card has always had.
   ========================================================================== */

const C_EA = { core: "#e3a3a3", glow: "#fff0e4", deep: "#31161c" };

function EscapeArtistCuts({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><circle cx="20" cy="22" r="10" fill={C_EA.deep} stroke={C_EA.core} strokeWidth="2.4" /><path d="M20 22v-6" stroke={C_EA.glow} strokeWidth="2.4" {...SJ} /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><path d="M13 8a7 7 0 0 1 14 0" fill="none" stroke={C_EA.core} strokeWidth="3" {...SJ} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><circle cx="20" cy="24" r="11" fill={C_EA.deep} stroke={C_EA.core} strokeWidth="2.4" /><path d="M20 24v-7M20 24l5 3" stroke={C_EA.glow} strokeWidth="2.2" {...SJ} /></g>
        <g className="g01-ea-cuff" style={dm(delayMs, 220)}><path d="M12 9a8 8 0 0 1 16 0" fill="none" stroke={C_EA.glow} strokeWidth="3.4" {...SJ} /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><path d="M20 6V2" stroke={C_EA.core} strokeWidth="2.4" {...SJ} /></g>
      </Sq>
    );
  return null;
}

/* =============================================================================
   25. The Grand Bargain (t7). Registered as GrandBargainRule (PER-CARD RULE SCENES, below),
   whose lead draws the card's own rule. The target and entrance cuts here are the
   small square-local icons this card has always had.
   ========================================================================== */

const C_GB = { core: "#c9b2f0", glow: "#f6f0ff", deep: "#221a3a" };

function GrandBargainCuts({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><path d="M6 14h28M20 14v18" stroke={C_GB.core} strokeWidth="2.6" {...SJ} /><path d="M4 16l6 8H2zM30 16l6 8h-8z" fill={C_GB.deep} stroke={C_GB.core} strokeWidth="1.8" {...SJ} /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><rect x="16" y="6" width="8" height="6" fill={C_GB.glow} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><path d="M6 15h28M20 15v17" stroke={C_GB.core} strokeWidth="2.8" {...SJ} /><path d="M3 17l7 9H-4z" fill={C_GB.deep} stroke={C_GB.core} strokeWidth="1.8" {...SJ} /></g>
        <g className="g01-gb-weight" style={dm(delayMs, 220)}><path d="M14 4h12l3 9H11z" fill={C_GB.glow} stroke={C_GB.deep} strokeWidth="1.8" {...SJ} /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><path d="M12 34h16" stroke={C_GB.core} strokeWidth="2.4" {...SJ} /></g>
      </Sq>
    );
  return null;
}

/* =============================================================================
   26. Half-Moon Charter (t7). Registered as HalfMoonCharterRule (PER-CARD RULE SCENES, below),
   whose lead draws the card's own rule. The target and entrance cuts here are the
   small square-local icons this card has always had.
   ========================================================================== */

const C_HM = { core: "#b9c9e8", glow: "#f6f2e0", deep: "#141a2e" };

function HalfMoonCharterCuts({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><circle cx="20" cy="20" r="11" fill={C_HM.glow} stroke={C_HM.deep} strokeWidth="2" /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><path d="M20 9a11 11 0 0 1 0 22z" fill={C_HM.deep} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><circle cx="20" cy="21" r="12" fill={C_HM.glow} stroke={C_HM.core} strokeWidth="2.2" /></g>
        <g className="g01-hm-shutter" style={dm(delayMs, 220)}><path d="M20 9a12 12 0 0 1 0 24z" fill={C_HM.deep} /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><circle cx="20" cy="21" r="16" fill="none" stroke={C_HM.core} strokeWidth="1.5" strokeDasharray="4 4" /></g>
      </Sq>
    );
  return null;
}

/* =============================================================================
   27. The Hundred Days (t7) — THE TEAR-OFF CALENDAR. Tell: a thumb catches the
   corner of the top leaf. Strike: eleven days are ripped off in one motion and
   go up in a paper flurry. Settle: the block stands thinner, the exposed date
   glows, and the last leaves flutter down past the board.
   ========================================================================== */

const C_HD = { core: "#e58f7a", glow: "#fff1e2", deep: "#331612" };
const HD_LEAVES = [
  { mx: "-230%", my: "-300%", mr: "-52deg" },
  { mx: "-40%", my: "-370%", mr: "18deg" },
  { mx: "180%", my: "-320%", mr: "64deg" },
  { mx: "300%", my: "-190%", mr: "120deg" },
];

function HundredDaysScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><rect x="9" y="10" width="22" height="22" fill={C_HD.glow} stroke={C_HD.deep} strokeWidth="2" /><rect x="9" y="10" width="22" height="6" fill={C_HD.core} /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><path d="M9 22h22" stroke={C_HD.deep} strokeWidth="2.4" strokeDasharray="3 3" /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><rect x="8" y="12" width="24" height="22" fill={C_HD.glow} stroke={C_HD.deep} strokeWidth="2.2" /><rect x="8" y="12" width="24" height="7" fill={C_HD.core} /></g>
        <g className="g01-hd-leaf" style={dm(delayMs, 220)}><rect x="11" y="4" width="18" height="10" fill={C_HD.glow} stroke={C_HD.deep} strokeWidth="1.8" /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><path d="M14 26h12" stroke={C_HD.core} strokeWidth="2.6" {...SJ} /></g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(229,143,122,0.28)" delayMs={delayMs} />
      <P x={50} y={58} w={19} h={19} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full"><rect x="8" y="10" width="84" height="82" fill={C_HD.glow} stroke={C_HD.deep} strokeWidth="6" /><rect x="8" y="10" width="84" height="22" fill={C_HD.core} /><path d="M30 4v12M70 4v12" stroke={C_HD.deep} strokeWidth="6" {...SJ} /></svg>
      </P>
      <P x={50} y={50} w={19} h={7} cls="g01-hd-tear" style={dm(delayMs, 170)}>
        <svg viewBox="0 0 100 36" className="block h-full w-full" preserveAspectRatio="none"><path d="M2 30l10-8 10 8 10-8 10 8 10-8 10 8 10-8 10 8 8-6V2H2z" fill={C_HD.glow} stroke={C_HD.deep} strokeWidth="4" {...SJ} /></svg>
      </P>
      {HD_LEAVES.map((m, i) => (
        <P key={i} x={50} y={50} w={6} h={7} cls="g01-hd-leaf" style={sv(dm(delayMs, 320 + i * 90), { "--g01-mx": m.mx, "--g01-my": m.my, "--g01-mr": m.mr })}>
          <svg viewBox="0 0 30 36" className="block h-full w-full"><rect x="2" y="2" width="26" height="32" fill={C_HD.glow} stroke={C_HD.deep} strokeWidth="3" /></svg>
        </P>
      ))}
      <P x={50} y={62} w={11} h={8} cls="g01-flash" style={dm(delayMs, 620)}>
        <svg viewBox="0 0 60 40" className="block h-full w-full"><path d="M14 34V8l-8 6M34 8h12l-12 26h12" fill="none" stroke={C_HD.core} strokeWidth="5" {...SJ} /></svg>
      </P>
      <P x={50} y={42} w={26} h={1.4} cls="g01-lean" style={sv({ background: C_HD.glow, ...dm(delayMs, 700) }, { "--g01-lean": "calc(var(--fx-side, 1) * -260%)" })} />
    </Wide>
  );
}

/* =============================================================================
   28. Jubilee (t7). Registered as JubileeRule (PER-CARD RULE SCENES, below),
   whose lead draws the card's own rule. The target and entrance cuts here are the
   small square-local icons this card has always had.
   ========================================================================== */

const C_JB = { core: "#f0c96a", glow: "#fff6dd", deep: "#3a2a08" };
const JB_NUMS = [
  { x: 50, y: 40, mx: "-40%", my: "420%" },
  { x: 60, y: 46, mx: "120%", my: "380%" },
  { x: 60, y: 58, mx: "160%", my: "300%" },
  { x: 40, y: 46, mx: "-150%", my: "390%" },
  { x: 40, y: 58, mx: "-180%", my: "310%" },
];

function JubileeCuts({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><circle cx="20" cy="20" r="12" fill="none" stroke={C_JB.core} strokeWidth="2.6" /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><circle cx="20" cy="9" r="2.4" fill={C_JB.glow} /><circle cx="30" cy="24" r="2.4" fill={C_JB.glow} /><circle cx="11" cy="24" r="2.4" fill={C_JB.glow} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><circle cx="20" cy="21" r="13" fill={C_JB.deep} stroke={C_JB.core} strokeWidth="2.4" /></g>
        <g className="g01-jb-numeral" style={sv(dm(delayMs, 220), { "--g01-my": "260%" })}><circle cx="20" cy="10" r="2.8" fill={C_JB.glow} /><circle cx="31" cy="26" r="2.8" fill={C_JB.glow} /><circle cx="9" cy="26" r="2.8" fill={C_JB.glow} /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><circle cx="20" cy="21" r="17" fill="none" stroke={C_JB.core} strokeWidth="1.5" /></g>
      </Sq>
    );
  return null;
}

/* =============================================================================
   29. Keys to the City (t7). Registered as KeysToTheCityRule (PER-CARD RULE SCENES, below),
   whose lead draws the card's own rule. The target and entrance cuts here are the
   small square-local icons this card has always had.
   ========================================================================== */

const C_KC = { core: "#84c9c4", glow: "#eefdf9", deep: "#0f2b2c" };
const KC_BOLTS = [
  { x: 50, y: 36, mx: "0%", my: "-150%" },
  { x: 64, y: 52, mx: "150%", my: "0%" },
  { x: 50, y: 68, mx: "0%", my: "150%" },
  { x: 36, y: 52, mx: "-150%", my: "0%" },
];

function KeysToTheCityCuts({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><circle cx="20" cy="20" r="12" fill={C_KC.deep} stroke={C_KC.core} strokeWidth="2.4" /><circle cx="20" cy="20" r="5" fill="none" stroke={C_KC.glow} strokeWidth="2.2" /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><path d="M20 4v5M36 20h-5M20 36v-5M4 20h5" stroke={C_KC.glow} strokeWidth="3" {...SJ} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><circle cx="20" cy="21" r="13" fill={C_KC.deep} stroke={C_KC.core} strokeWidth="2.4" /></g>
        <g className="g01-kc-ring" style={dm(delayMs, 220)}><circle cx="20" cy="21" r="8" fill="none" stroke={C_KC.glow} strokeWidth="2.6" strokeDasharray="4 4" /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><path d="M20 21h11" stroke={C_KC.core} strokeWidth="2.6" {...SJ} /></g>
      </Sq>
    );
  return null;
}

/* =============================================================================
   30. Moonlit Reprieve (t7). Registered as MoonlitReprieveRule (PER-CARD RULE SCENES, below),
   whose lead draws the card's own rule. The target and entrance cuts here are the
   small square-local icons this card has always had.
   ========================================================================== */

const C_MR = { core: "#8fb6e0", glow: "#eef6ff", deep: "#101c33" };

function MoonlitReprieveCuts({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><circle cx="20" cy="20" r="12" fill={C_MR.deep} stroke={C_MR.core} strokeWidth="2.4" /><path d="M9 24q11 7 22 0v6q-11 7-22 0z" fill={C_MR.core} /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><path d="M26 12a6 6 0 1 0 0 8 5 5 0 0 1 0-8z" fill={C_MR.glow} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><circle cx="20" cy="21" r="13" fill={C_MR.deep} stroke={C_MR.core} strokeWidth="2.4" /></g>
        <g className="g01-mr-tide" style={dm(delayMs, 220)}><path d="M8 24q12 8 24 0v8q-12 8-24 0z" fill={C_MR.core} /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><path d="M27 11a6 6 0 1 0 0 9 5 5 0 0 1 0-9z" fill={C_MR.glow} /></g>
      </Sq>
    );
  return null;
}

/* =============================================================================
   31. Patron's Favor (t7) — THE APPOINTMENT MADE. Tell: the diary's pages
   riffle and stop at an hour somebody else has chosen. Strike: a ribbon is
   laid into the gutter and a wax seal is thumped onto the chosen slot. Settle:
   the following page is struck through, paid for, and the seal cools.
   ========================================================================== */

const C_PF = { core: "#e0788f", glow: "#fff0e8", deep: "#320f1d" };

function PatronsFavorScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><rect x="8" y="9" width="24" height="22" fill={C_PF.glow} stroke={C_PF.deep} strokeWidth="2" /><path d="M20 9v22" stroke={C_PF.deep} strokeWidth="1.8" /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><circle cx="26" cy="24" r="4.4" fill={C_PF.core} stroke={C_PF.deep} strokeWidth="1.6" /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><rect x="7" y="10" width="26" height="22" fill={C_PF.glow} stroke={C_PF.deep} strokeWidth="2.2" /><path d="M20 10v22" stroke={C_PF.deep} strokeWidth="2" /></g>
        <g className="g01-pf-ribbon" style={dm(delayMs, 220)}><path d="M18 4h4v16l-2-3-2 3z" fill={C_PF.core} stroke={C_PF.deep} strokeWidth="1.6" {...SJ} /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><circle cx="27" cy="26" r="5" fill="none" stroke={C_PF.core} strokeWidth="2" /></g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(224,120,143,0.28)" delayMs={delayMs} />
      <P x={50} y={56} w={28} h={18} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 140 90" className="block h-full w-full"><path d="M6 12q32-8 62 0 30-8 66 0v70q-36-8-66 0-30-8-62 0z" fill={C_PF.glow} stroke={C_PF.deep} strokeWidth="6" {...SJ} /><path d="M68 12v70" stroke={C_PF.deep} strokeWidth="5" /></svg>
      </P>
      <P x={62} y={56} w={13} h={16} cls="g01-pf-page" style={sv(dm(delayMs, 170), { "--g01-a": "-58deg" })}>
        <svg viewBox="0 0 70 80" className="block h-full w-full"><path d="M2 4q34-6 66 2v70q-32-8-66-2z" fill={C_PF.glow} stroke={C_PF.deep} strokeWidth="5" {...SJ} /></svg>
      </P>
      <P x={50} y={58} w={4} h={22} cls="g01-pf-ribbon" style={dm(delayMs, 330)}>
        <svg viewBox="0 0 22 110" className="block h-full w-full"><path d="M3 2h16v96l-8-11-8 11z" fill={C_PF.core} stroke={C_PF.deep} strokeWidth="4" {...SJ} /></svg>
      </P>
      <P x={60} y={60} w={9} h={9} cls="g01-pf-seal" style={dm(delayMs, 470)}>
        <svg viewBox="0 0 50 50" className="block h-full w-full"><circle cx="25" cy="25" r="20" fill={C_PF.core} stroke={C_PF.deep} strokeWidth="4" /><path d="M15 20l10 10 10-10" fill="none" stroke={C_PF.glow} strokeWidth="4" {...SJ} /></svg>
      </P>
      <P x={50} y={44} w={26} h={1.4} cls="g01-lean" style={sv({ background: C_PF.glow, ...dm(delayMs, 660) }, { "--g01-lean": "calc(var(--fx-side, 1) * -250%)" })} />
      <Drift color={C_PF.glow} delayMs={delayMs + 720} n={4} />
    </Wide>
  );
}

/* =============================================================================
   32. Second Spring (t7) — THE FROZEN DIAL THAWS. Tell: a hairline crack runs
   across the ice sheeting the clock face. Strike: the ice sheet breaks, the
   icicles hanging off the hands snap away, and green shoots push up through
   the numerals. Settle: meltwater beads run off the rim toward the home rank.
   ========================================================================== */

const C_SS = { core: "#8fdba8", glow: "#eefbf0", deep: "#123024" };
const SS_SHOOTS = [
  { x: 42, y: 58, mr: "-16deg" },
  { x: 50, y: 56, mr: "2deg" },
  { x: 58, y: 58, mr: "17deg" },
];

function SecondSpringScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}><circle cx="20" cy="20" r="12" fill={C_SS.deep} stroke={C_SS.core} strokeWidth="2.4" /><path d="M12 12l16 16M28 12L12 28" stroke={C_SS.glow} strokeWidth="1.8" /></g>
        <g className="g01-hit2" style={dm(delayMs, 200)}><path d="M20 32V20q6 0 6 6t-6 6z" fill={C_SS.core} /></g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}><circle cx="20" cy="20" r="13" fill={C_SS.deep} stroke={C_SS.core} strokeWidth="2.4" /></g>
        <g className="g01-ss-crack" style={dm(delayMs, 220)}><path d="M8 14l7 5-4 6 9 3" fill="none" stroke={C_SS.glow} strokeWidth="2.2" {...SJ} /></g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}><path d="M20 34V22q7 1 6 7t-6 5z" fill={C_SS.core} /></g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(143,219,168,0.28)" delayMs={delayMs} />
      <Rim color="rgba(143,219,168,0.4)" delayMs={delayMs + 60} />
      <P x={50} y={52} w={24} h={24} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full"><circle cx="50" cy="50" r="44" fill={C_SS.deep} stroke={C_SS.core} strokeWidth="6" /><path d="M50 50V24M50 50l17 11" fill="none" stroke={C_SS.glow} strokeWidth="5" {...SJ} /></svg>
      </P>
      <P x={50} y={52} w={24} h={24} cls="g01-ss-crack" style={dm(delayMs, 170)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full"><path d="M10 40l22 10-10 16 26 8M62 14l-8 22 22 8-10 18" fill="none" stroke={C_SS.glow} strokeWidth="4" {...SJ} /></svg>
      </P>
      {[0, 1, 2].map((i) => (
        <P key={i} x={40 + i * 10} y={66} w={3} h={7} cls="g01-fling" style={sv(dm(delayMs, 330 + i * 80), { "--g01-mx": `${(i - 1) * 120}%`, "--g01-my": "230%", "--g01-mr": "40deg", background: C_SS.glow })} />
      ))}
      {SS_SHOOTS.map((s, i) => (
        <P key={i} x={s.x} y={s.y} w={6} h={12} cls="g01-ss-shoot" style={sv(dm(delayMs, 470 + i * 90), { "--g01-mr": s.mr })}>
          <svg viewBox="0 0 30 60" className="block h-full w-full"><path d="M15 58V16" stroke={C_SS.core} strokeWidth="5" {...SJ} /><path d="M15 30q-12-4-12-16 12 0 12 16zM15 22q12-4 12-14-12 0-12 14z" fill={C_SS.core} /></svg>
        </P>
      ))}
      <P x={50} y={68} w={26} h={1.4} cls="g01-lean" style={sv({ background: C_SS.glow, ...dm(delayMs, 680) }, { "--g01-lean": "calc(var(--fx-side, 1) * -180%)" })} />
    </Wide>
  );
}

/* =============================================================================
   PER-CARD RULE SCENES (slice TC-g). The leads below replace the time-machine
   metaphors these cards used to share with the rest of the batch: each one
   draws what its own card does, on the ranks and pieces the rule names. They
   are laid out on <Brd>, whose 0..100% is exactly the board, and read their
   side from --fx-side (+1 when the caster sits at the bottom), so the caster's
   back rank is rank 0 and the opponent's is rank 7 whichever way the board is
   turned. Target and entrance cuts stay square-local, as before.
   ========================================================================== */

/** Chessman silhouettes on a 10 x 10 box, for the pieces a rule names. */
const CHESSMAN = {
  p: "M5 1.2 C6.2 1.2 7 2 7 3 C7 3.7 6.6 4.3 6 4.6 L7 8 H3 L4 4.6 C3.4 4.3 3 3.7 3 3 C3 2 3.8 1.2 5 1.2 Z M2.4 8.6 H7.6 V9.6 H2.4 Z",
  r: "M2.6 1.4 H3.8 V2.6 H4.6 V1.4 H5.4 V2.6 H6.2 V1.4 H7.4 V3.8 H6.8 L7.2 7.6 H2.8 L3.2 3.8 H2.6 Z M2.2 8.4 H7.8 V9.6 H2.2 Z",
  n: "M2.8 8.2 C2.8 5.4 3.8 4 5.4 3.2 L5 1.6 L6.4 2.6 L7.2 2.4 C7.9 3 8.1 4 7.7 4.9 L6.6 4.6 L6.2 4 C6.5 5.6 6.4 7 7 8.2 Z M2.4 8.8 H7.6 V9.8 H2.4 Z",
  b: "M5 1 C6.4 2 7 3.4 7 4.6 C7 5.8 6.2 6.6 5 6.6 C3.8 6.6 3 5.8 3 4.6 C3 3.4 3.6 2 5 1 Z M3.4 7.2 H6.6 L7.2 8.2 H2.8 Z M2.2 8.8 H7.8 V9.8 H2.2 Z",
  q: "M2.4 3.2 L3.4 5 L4.2 2.6 L5 4.6 L5.8 2.6 L6.6 5 L7.6 3.2 L7 7.4 H3 Z M2.6 8 H7.4 V9.2 H2.6 Z",
  k: "M4.6 1 H5.4 V2 H6.4 V2.8 H5.4 V3.8 H4.6 V2.8 H3.6 V2 H4.6 Z M3.4 4.4 H6.6 L7.2 8 H2.8 Z M2.4 8.6 H7.6 V9.8 H2.4 Z",
} as const;
type Kind = keyof typeof CHESSMAN;

function Man({ kind, fill, stroke }: { kind: Kind; fill: string; stroke: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d={CHESSMAN[kind]} fill={fill} stroke={stroke} strokeWidth="0.45" {...SJ} />
    </svg>
  );
}

/** The board-true layer: 0..100% is exactly the board (a BoardFrame inside
 *  the scene canvas, which is what its percentages resolve against). */
function Brd({ children }: { children: ReactNode }) {
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g01 absolute inset-0 block">{children}</span>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Centre of rank `r`, counted from the caster's back rank (0) to the
 *  opponent's (7), as a board percentage. Fractions sit between ranks. */
function rk(r: number): string {
  return `calc(50% + var(--fx-side, 1) * ${(3.5 - r) * 12.5}%)`;
}

/** Centre of screen column `c` (0 is the left edge), as a board percentage. */
function cl(c: number): string {
  return `${(c + 0.5) * 12.5}%`;
}

/** The caster's king and queen files (e and d), whichever way the board is
 *  turned: screen columns 4 and 3 with the caster at the bottom, 3 and 4 when
 *  at the top. */
const KING_X = "calc(50% + var(--fx-side, 1) * 6.25%)";
const QUEEN_X = "calc(50% - var(--fx-side, 1) * 6.25%)";

/** A prop centred on (x, y), `w` x `h` in board percent, starting at
 *  `delayMs`. `v` carries the verb's own custom properties. */
function Q({
  x,
  y,
  w,
  h,
  cls,
  delayMs,
  v,
  style,
  children,
}: {
  x: string;
  y: string;
  w: number;
  h: number;
  cls: string;
  delayMs: number;
  v?: Record<string, string>;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <span
      className={`${cls} absolute block`}
      style={
        {
          left: `calc(${x} - ${w / 2}%)`,
          top: `calc(${y} - ${h / 2}%)`,
          width: `${w}%`,
          height: `${h}%`,
          animationDelay: `${delayMs}ms`,
          ...style,
          ...v,
        } as CSSProperties
      }
    >
      {children}
    </span>
  );
}

/** The nerf itself: an iron cuff on the caster's side that springs open when
 *  the card suspends it. The lid swings about its hinge on the left. */
function NerfCuff({ x, y, c, delayMs, gd = "1.6s" }: { x: string; y: string; c: { core: string; glow: string; deep: string }; delayMs: number; gd?: string }) {
  return (
    <>
      <Q x={x} y={y} w={9} h={9} cls="g01-r-in" delayMs={delayMs} v={{ "--gd": gd, "--s0": "0.8" }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <path d="M4 11a6 6 0 0 0 12 0" fill="none" stroke={c.deep} strokeWidth="4.4" {...SJ} />
          <path d="M4 11a6 6 0 0 0 12 0" fill="none" stroke={c.core} strokeWidth="2.2" {...SJ} />
          <path d="M10 17v2.4" stroke={c.core} strokeWidth="1.6" {...SJ} />
        </svg>
      </Q>
      <Q x={x} y={y} w={9} h={9} cls="g01-r-open" delayMs={delayMs} v={{ "--gd": gd, "--ra": "-70deg" }} style={{ transformOrigin: "20% 55%" }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <path d="M4 11a6 6 0 0 1 12 0" fill="none" stroke={c.deep} strokeWidth="4.4" {...SJ} />
          <path d="M4 11a6 6 0 0 1 12 0" fill="none" stroke={c.core} strokeWidth="2.2" {...SJ} />
          <circle cx="16" cy="11" r="1.4" fill={c.glow} />
        </svg>
      </Q>
    </>
  );
}

/** `n` tally ticks across the board at rank `r`, from `x0`% to `x1`%: one per
 *  turn the rule counts. The run takes about 420ms whatever `n` is. */
function Tally({ n, r, x0 = 14, x1 = 86, color, delayMs, cls = "g01-r-pip", gd = "1.3s", h = 3.4 }: { n: number; r: number; x0?: number; x1?: number; color: string; delayMs: number; cls?: string; gd?: string; h?: number }) {
  const step = n > 1 ? (x1 - x0) / (n - 1) : 0;
  const w = Math.min(2.2, Math.max(0.7, step * 0.45));
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <Q key={i} x={`${n > 1 ? x0 + i * step : (x0 + x1) / 2}%`} y={rk(r)} w={w} h={h} cls={cls} delayMs={delayMs + Math.round((i * 420) / Math.max(1, n - 1))} v={{ "--gd": gd }} style={{ background: color, borderRadius: "1px" }} />
      ))}
    </>
  );
}

/** A turn token (a disc with a play mark) that the rule strikes through: a
 *  turn skipped outright. */
function SkipToken({ x, y, c, delayMs }: { x: string; y: string; c: { core: string; glow: string; deep: string }; delayMs: number }) {
  return (
    <>
      <Q x={x} y={y} w={8} h={8} cls="g01-r-in" delayMs={delayMs} v={{ "--gd": "1.5s" }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <circle cx="10" cy="10" r="8" fill={c.deep} stroke={c.core} strokeWidth="1.6" />
          <path d="M8 6.4l5 3.6-5 3.6z" fill={c.glow} />
        </svg>
      </Q>
      <Q x={x} y={y} w={9} h={1.2} cls="g01-r-draw" delayMs={delayMs + 200} v={{ "--gd": "1.3s" }} style={{ background: c.glow, rotate: "-40deg" }} />
    </>
  );
}

/* --- hx4_tithe_of_silence ----------------------------------------------------
   "Your opponent's next move passes freely. Then, for their following 6
   turns, each of their first 2 checks against your king costs them their
   following turn." A tithe box sits by the caster's king; along the
   opponent's edge one open pip (the free move) and six turn pips are laid;
   two checks are shouted down the board at the king, each one drops a coin in
   the box and costs a turn token on their side. */
function TitheOfSilenceRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <TitheOfSilenceCuts lead={lead} role={role} delayMs={delayMs} />;
  const c = C_TS;
  return (
    <Brd>
      <Q x={KING_X} y={rk(0)} w={10} h={10} cls="g01-r-in" delayMs={delayMs} v={{ "--gd": "2s" }}>
        <Man kind="k" fill={c.glow} stroke={c.deep} />
      </Q>
      <Q x={`calc(${KING_X} + 12.5%)`} y={rk(0.9)} w={10} h={8} cls="g01-r-stamp" delayMs={delayMs + 120} v={{ "--gd": "1.9s" }}>
        <svg viewBox="0 0 24 20" className="block h-full w-full" aria-hidden="true">
          <path d="M3 7h18v11H3z" fill={c.deep} stroke={c.core} strokeWidth="1.8" {...SJ} />
          <path d="M2 5h20v3H2z" fill={c.core} />
          <path d="M9 6.4h6" stroke={c.deep} strokeWidth="1.6" {...SJ} />
        </svg>
      </Q>
      <Q x="14%" y={rk(7.6)} w={2.6} h={2.6} cls="g01-r-pip" delayMs={delayMs + 200} v={{ "--gd": "1.8s" }} style={{ border: `1.5px solid ${c.core}`, borderRadius: "50%" }} />
      <Tally n={6} r={7.6} x0={24} x1={62} color={c.core} delayMs={delayMs + 260} gd="1.7s" h={2.6} />
      {[0, 1].map((i) => (
        <Q key={i} x={cl(i === 0 ? 2 : 6)} y={rk(4)} w={4} h={40} cls="g01-r-shout" delayMs={delayMs + 440 + i * 260} v={{ "--gd": "0.8s" }} style={{ scale: "1 var(--fx-side, 1)" }}>
          <svg viewBox="0 0 10 100" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
            <path d="M5 2v90M1 84l4 12 4-12" fill="none" stroke={c.glow} strokeWidth="2.4" {...SJ} />
          </svg>
        </Q>
      ))}
      {[0, 1].map((i) => (
        <Q key={`c${i}`} x={`calc(${KING_X} + 12.5%)`} y={rk(0.9)} w={3.6} h={3.6} cls="g01-r-go" delayMs={delayMs + 700 + i * 260} v={{ "--gd": "0.7s", "--tx0": "0%", "--ty0": "calc(var(--fx-side, 1) * -240%)", "--tx1": "0%", "--ty1": "0%" }} style={{ background: c.core, border: `1.5px solid ${c.deep}`, borderRadius: "50%" }} />
      ))}
      {[0, 1].map((i) => (
        <SkipToken key={`s${i}`} x={`${74 + i * 12}%`} y={rk(7.4)} c={c} delayMs={delayMs + 760 + i * 260} />
      ))}
      <Q x={`calc(${KING_X} + 12.5%)`} y={rk(1.6)} w={9} h={6} cls="g01-r-lean" delayMs={delayMs + 1150} v={{ "--gd": "0.9s" }}>
        <svg viewBox="0 0 24 16" className="block h-full w-full" aria-hidden="true">
          <circle cx="8" cy="9" r="3.4" fill="none" stroke={C_TS.core} strokeWidth="1.4" /><circle cx="16" cy="6" r="2.4" fill="none" stroke={C_TS.glow} strokeWidth="1.2" />
        </svg>
      </Q>
    </Brd>
  );
}

/* --- bn4_flag_on_their_wall -------------------------------------------------
   "While any piece of yours stands on your opponent's back rank, your nerf is
   suspended." The opponent's back rank is drawn as a battlement; one of the
   caster's pieces climbs to it and plants a flag; the nerf cuff on the
   caster's own rank springs open for as long as the flag flies. */
function FlagOnTheirWallRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <FlagOnTheirWallCuts lead={lead} role={role} delayMs={delayMs} />;
  const c = C_FW;
  return (
    <Brd>
      <Q x="50%" y={rk(7)} w={100} h={12.5} cls="g01-r-draw" delayMs={delayMs} v={{ "--gd": "2s" }}>
        <svg viewBox="0 0 160 20" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <path d={`M0 20V8${Array.from({ length: 8 }, (_, i) => `h10v-6h10v6`).join("")}V20z`} fill="rgba(224,180,92,0.3)" stroke={c.core} strokeWidth="1.6" />
        </svg>
      </Q>
      <Q x={cl(5)} y={rk(7)} w={10} h={10} cls="g01-r-go" delayMs={delayMs + 180} v={{ "--gd": "1.8s", "--tx0": "0%", "--ty0": "calc(var(--fx-side, 1) * 260%)", "--tx1": "0%", "--ty1": "0%" }}>
        <Man kind="r" fill={c.glow} stroke={c.deep} />
      </Q>
      <Q x={`calc(${cl(5)} + 3%)`} y={rk(7.3)} w={8} h={12} cls="g01-r-up" delayMs={delayMs + 480} v={{ "--gd": "1.5s" }}>
        <svg viewBox="0 0 20 36" className="block h-full w-full" aria-hidden="true">
          <path d="M4 35V2" stroke={c.glow} strokeWidth="2.4" {...SJ} />
        </svg>
      </Q>
      <Q x={`calc(${cl(5)} + 5.4%)`} y={rk(7.62)} w={6} h={4.4} cls="g01-r-wave" delayMs={delayMs + 620} v={{ "--gd": "1.35s" }} style={{ transformOrigin: "0% 50%" }}>
        <svg viewBox="0 0 20 14" className="block h-full w-full" aria-hidden="true">
          <path d="M1 1h18l-5 6 5 6H1z" fill={c.core} stroke={c.deep} strokeWidth="1.4" {...SJ} />
        </svg>
      </Q>
      <NerfCuff x={cl(5)} y={rk(0)} c={c} delayMs={delayMs + 620} />
      <Q x={cl(5)} y={rk(3.5)} w={1} h={70} cls="g01-r-in" delayMs={delayMs + 720} v={{ "--gd": "1.2s", "--s0": "1" }} style={{ background: `repeating-linear-gradient(180deg, ${c.core} 0 6px, transparent 6px 12px)` }} />
    </Brd>
  );
}

/* --- bn4_queens_aegis --------------------------------------------------------
   "While your queen stands on the board, your nerf is suspended. Lose her,
   and it returns." The caster's queen rises on her own square and lifts a
   round shield; the nerf cuff under it springs open, chained to her, so it
   holds only as long as she does. */
function QueensAegisRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <QueensAegisCuts lead={lead} role={role} delayMs={delayMs} />;
  const c = C_QA;
  return (
    <Brd>
      <Q x={QUEEN_X} y={rk(0)} w={11} h={11} cls="g01-r-up" delayMs={delayMs} v={{ "--gd": "2s" }}>
        <Man kind="q" fill={c.glow} stroke={c.deep} />
      </Q>
      <Q x={QUEEN_X} y={rk(1.6)} w={20} h={20} cls="g01-r-stamp" delayMs={delayMs + 260} v={{ "--gd": "1.8s" }}>
        <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="17" fill="rgba(127,184,230,0.35)" stroke={c.core} strokeWidth="2.6" />
          <circle cx="20" cy="20" r="11" fill="none" stroke={c.glow} strokeWidth="1.2" />
          <path d="M13 17l2.6 5 2-6 2.4 5 2.4-5 2 6 2.6-5-1.4 8H14.4z" fill={c.glow} stroke={c.deep} strokeWidth="1" {...SJ} />
        </svg>
      </Q>
      <NerfCuff x={`calc(${QUEEN_X} - var(--fx-side, 1) * 25%)`} y={rk(0.5)} c={c} delayMs={delayMs + 520} />
      <Q x={`calc(${QUEEN_X} - var(--fx-side, 1) * 12.5%)`} y={rk(0.5)} w={20} h={1} cls="g01-r-draw" delayMs={delayMs + 440} v={{ "--gd": "1.5s" }} style={{ background: `repeating-linear-gradient(90deg, ${c.core} 0 5px, transparent 5px 9px)` }} />
      <Q x={QUEEN_X} y={rk(1.6)} w={26} h={26} cls="g01-r-lean" delayMs={delayMs + 900} v={{ "--gd": "1s" }}>
        <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
          <path d="M20 2a18 18 0 0 1 18 18" fill="none" stroke={c.glow} strokeWidth="1.4" {...SJ} />
        </svg>
      </Q>
    </Brd>
  );
}

/* --- bn4_meek_inherit ---------------------------------------------------------
   "Beginning after your opponent's next move, your nerf is suspended while
   your opponent has at least as many pieces as you. Pull ahead in material,
   and it wakes." A balance is hung over the halfway line: three meek pawns in
   the caster's pan, four of the opponent's men in the other; the beam tips to
   the heavier side, and the nerf cuff beneath the meek pan springs open. One
   open pip first: it begins after their next move. */
function MeekInheritRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <MeekInheritCuts lead={lead} role={role} delayMs={delayMs} />;
  const c = C_MI;
  const theirs: Kind[] = ["r", "b", "n", "p"];
  return (
    <Brd>
      <Q x="50%" y={rk(3.5)} w={3} h={16} cls="g01-r-in" delayMs={delayMs} v={{ "--gd": "2s", "--s0": "1", "--ty0": "20%" }} style={{ background: c.deep, borderRadius: "1px" }} />
      <Q x="50%" y={rk(4.1)} w={66} h={30} cls="g01-r-tip" delayMs={delayMs + 120} v={{ "--gd": "1.9s", "--ra": "8deg" }} style={{ transformOrigin: "50% 20%" }}>
        <span className="absolute block" style={{ left: 0, top: "18%", width: "100%", height: "4%", background: c.core, borderRadius: "999px" }} />
        <span className="absolute block" style={{ left: "0%", top: "22%", width: "28%", height: "60%" }}>
          <svg viewBox="0 0 30 40" className="block h-full w-full" aria-hidden="true"><path d="M15 0L2 26M15 0l13 26" stroke={c.core} strokeWidth="0.8" /><path d="M1 26h28q-2 8-14 8T1 26z" fill={c.core} stroke={c.deep} strokeWidth="1" /></svg>
        </span>
        <span className="absolute block" style={{ right: "0%", top: "22%", width: "28%", height: "60%" }}>
          <svg viewBox="0 0 30 40" className="block h-full w-full" aria-hidden="true"><path d="M15 0L2 26M15 0l13 26" stroke={c.core} strokeWidth="0.8" /><path d="M1 26h28q-2 8-14 8T1 26z" fill={c.deep} stroke={c.core} strokeWidth="1" /></svg>
        </span>
      </Q>
      {[0, 1, 2].map((i) => (
        <Q key={i} x={`${21 + i * 4}%`} y={rk(4.1)} w={5} h={5} cls="g01-r-in" delayMs={delayMs + 260 + i * 70} v={{ "--gd": "1.7s", "--ty0": "-200%" }}>
          <Man kind="p" fill={c.glow} stroke={c.deep} />
        </Q>
      ))}
      {theirs.map((k, i) => (
        <Q key={k} x={`${71 + i * 4}%`} y={rk(3.6)} w={5} h={5} cls="g01-r-go" delayMs={delayMs + 260 + i * 70} v={{ "--gd": "1.7s", "--tx0": "0%", "--ty0": "-200%", "--tx1": "0%", "--ty1": "40%" }}>
          <Man kind={k} fill={c.deep} stroke={c.core} />
        </Q>
      ))}
      <Q x="14%" y={rk(0.9)} w={2.6} h={2.6} cls="g01-r-pip" delayMs={delayMs + 200} v={{ "--gd": "1.8s" }} style={{ border: `1.5px solid ${c.core}`, borderRadius: "50%" }} />
      <NerfCuff x="25%" y={rk(1.4)} c={c} delayMs={delayMs + 640} />
      <Q x="25%" y={rk(2.2)} w={8} h={5} cls="g01-r-lean" delayMs={delayMs + 1250} v={{ "--gd": "0.9s" }}>
        <svg viewBox="0 0 16 10" className="block h-full w-full" aria-hidden="true">
          <path d="M3 8l5-6 5 6" fill="none" stroke={C_MI.glow} strokeWidth="1.4" {...SJ} />
        </svg>
      </Q>
    </Brd>
  );
}

/* --- bn4_unequal_treaty -------------------------------------------------------
   "Your nerf is suspended for your next 10 turns; your opponent's is
   suspended for their next 3." A treaty is unrolled on the halfway line and
   sealed; both nerf cuffs spring open, one at each edge; ten turns are ticked
   along the caster's rank and only three along the opponent's, and theirs
   run out first. */
function UnequalTreatyRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <UnequalTreatyCuts lead={lead} role={role} delayMs={delayMs} />;
  const c = C_UT;
  return (
    <Brd>
      <Q x="50%" y={rk(3.5)} w={84} h={10} cls="g01-r-draw" delayMs={delayMs} v={{ "--gd": "2s" }}>
        <svg viewBox="0 0 120 14" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <rect x="3" y="2" width="114" height="10" fill={c.glow} stroke={c.core} strokeWidth="1.2" />
          <path d="M12 5.6h40M12 8.6h34M68 5.6h40M72 8.6h36" stroke={c.core} strokeWidth="0.9" />
        </svg>
      </Q>
      <Q x="50%" y={rk(3.5)} w={7} h={7} cls="g01-r-stamp" delayMs={delayMs + 300} v={{ "--gd": "1.7s" }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <circle cx="10" cy="10" r="8.6" fill={c.core} stroke={c.deep} strokeWidth="1.6" />
          <path d="M5 10h10M10 5v10" stroke={c.deep} strokeWidth="1.6" {...SJ} />
        </svg>
      </Q>
      <NerfCuff x="8%" y={rk(1.1)} c={c} delayMs={delayMs + 420} gd="1.7s" />
      <NerfCuff x="8%" y={rk(5.9)} c={c} delayMs={delayMs + 460} gd="1.2s" />
      <Tally n={10} r={1.1} x0={18} x1={88} color={c.core} delayMs={delayMs + 560} gd="1.5s" />
      <Tally n={3} r={5.9} x0={18} x1={32} color={c.core} delayMs={delayMs + 560} cls="g01-r-dim" gd="1.1s" />
      <Q x="50%" y={rk(3.5)} w={10} h={5} cls="g01-r-lean" delayMs={delayMs + 1200} v={{ "--gd": "0.9s" }}>
        <svg viewBox="0 0 20 10" className="block h-full w-full" aria-hidden="true">
          <path d="M8 1l-4 8M12 1l4 8" stroke={C_UT.core} strokeWidth="1.6" {...SJ} />
        </svg>
      </Q>
    </Brd>
  );
}

/** A die: a draft reroll. */
function Die({ c }: { c: { core: string; glow: string; deep: string } }) {
  return (
    <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
      <rect x="3" y="3" width="14" height="14" rx="2" fill={c.glow} stroke={c.deep} strokeWidth="1.6" />
      <circle cx="7" cy="7" r="1.5" fill={c.deep} /><circle cx="13" cy="13" r="1.5" fill={c.deep} /><circle cx="10" cy="10" r="1.5" fill={c.deep} />
    </svg>
  );
}

/** A draft card, face down. */
function DraftCard({ c }: { c: { core: string; glow: string; deep: string } }) {
  return (
    <svg viewBox="0 0 14 20" className="block h-full w-full" aria-hidden="true">
      <rect x="1" y="1" width="12" height="18" rx="2" fill={c.glow} stroke={c.deep} strokeWidth="1.4" />
      <path d="M4 7l3-3 3 3-3 3z" fill={c.core} />
    </svg>
  );
}

/** A vertical run up the board from the caster's side, grown from its
 *  caster-side end whichever way the board is turned. */
const FROM_CASTER = "50% calc(50% + var(--fx-side, 1) * 50%)";

/* --- bn4_hundred_year_lease ---------------------------------------------------
   "After your opponent's next move, the lease begins: your nerf is suspended
   for the 30 turns that follow." A lease deed is laid by the caster's rank
   and sealed; one open pip on the opponent's side is the move the lease
   waits for; then a key turns in the nerf cuff and thirty turns are ruled
   off along the caster's second rank like a surveyor's tape. */
function HundredYearLeaseRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <HundredYearLeaseCuts lead={lead} role={role} delayMs={delayMs} />;
  const c = C_HL;
  return (
    <Brd>
      <Q x="72%" y={rk(0.4)} w={34} h={13} cls="g01-r-draw" delayMs={delayMs} v={{ "--gd": "2.1s" }}>
        <svg viewBox="0 0 60 22" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <rect x="2" y="2" width="56" height="18" fill={c.glow} stroke={c.core} strokeWidth="1.4" />
          <path d="M8 7h34M8 11h40M8 15h26" stroke={c.core} strokeWidth="1" />
        </svg>
      </Q>
      <Q x="84%" y={rk(0.2)} w={5.4} h={5.4} cls="g01-r-stamp" delayMs={delayMs + 260} v={{ "--gd": "1.8s" }} style={{ background: c.core, border: `2px solid ${c.deep}`, borderRadius: "50%" }} />
      <Q x="50%" y={rk(6.5)} w={3} h={3} cls="g01-r-pip" delayMs={delayMs + 200} v={{ "--gd": "1s" }} style={{ border: `2px solid ${c.core}`, borderRadius: "50%" }} />
      <Q x="50%" y={rk(6.5)} w={3} h={3} cls="g01-r-go" delayMs={delayMs + 520} v={{ "--gd": "0.6s", "--tx1": "0%", "--ty1": "calc(var(--fx-side, 1) * 1450%)" }} style={{ background: c.core, borderRadius: "50%" }} />
      <NerfCuff x="22%" y={rk(0.3)} c={c} delayMs={delayMs + 560} gd="1.7s" />
      <Q x="15%" y={rk(0.3)} w={8} h={4} cls="g01-r-turn" delayMs={delayMs + 520} v={{ "--gd": "1.1s" }} style={{ transformOrigin: "100% 50%" }}>
        <svg viewBox="0 0 24 12" className="block h-full w-full" aria-hidden="true">
          <circle cx="5" cy="6" r="4" fill="none" stroke={c.glow} strokeWidth="2" />
          <path d="M9 6h13M18 6v4M21 6v3" stroke={c.glow} strokeWidth="2" {...SJ} />
        </svg>
      </Q>
      <Tally n={30} r={1.3} x0={6} x1={94} color={c.core} delayMs={delayMs + 780} gd="1.3s" h={2.6} />
    </Brd>
  );
}

/* --- bn4_liberators_march -----------------------------------------------------
   "Suspend your nerf for your next 18 turns. Each capture you make while it
   is suspended gains you 1 draft reroll, up to 3." The nerf cuff breaks and
   its chain falls away; a pawn carrying a banner marches up a file and takes
   the piece in its way; that capture drops a die into the first of three
   empty slots at the caster's edge. Eighteen turns are ticked along the rank. */
function LiberatorsMarchRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <LiberatorsMarchCuts lead={lead} role={role} delayMs={delayMs} />;
  const c = C_LM;
  return (
    <Brd>
      <NerfCuff x={cl(1)} y={rk(0.5)} c={c} delayMs={delayMs} gd="1.6s" />
      {[0, 1, 2].map((i) => (
        <Q key={i} x={`calc(${cl(1)} + ${3 + i * 3}%)`} y={rk(0.2)} w={3} h={2} cls="g01-r-part" delayMs={delayMs + 300 + i * 50} v={{ "--gd": "0.8s", "--tx1": `${60 + i * 50}%`, "--ty1": "calc(var(--fx-side, 1) * 220%)", "--r1": `${40 + i * 30}deg` }} style={{ border: `1.6px solid ${c.core}`, borderRadius: "999px" }} />
      ))}
      <Q x={cl(4)} y={rk(1)} w={10} h={10} cls="g01-r-go" delayMs={delayMs + 240} v={{ "--gd": "1.4s", "--tx1": "0%", "--ty1": "calc(var(--fx-side, 1) * -300%)" }}>
        <Man kind="p" fill={c.glow} stroke={c.deep} />
      </Q>
      <Q x={`calc(${cl(4)} + 3%)`} y={rk(1.5)} w={6} h={9} cls="g01-r-go" delayMs={delayMs + 240} v={{ "--gd": "1.4s", "--tx1": "0%", "--ty1": "calc(var(--fx-side, 1) * -333%)" }}>
        <svg viewBox="0 0 14 22" className="block h-full w-full" aria-hidden="true">
          <path d="M2 21V1" stroke={c.deep} strokeWidth="1.6" {...SJ} />
          <path d="M2 2h10v7l-5-2-5 2z" fill={c.core} stroke={c.deep} strokeWidth="1" {...SJ} />
        </svg>
      </Q>
      <Q x={cl(4)} y={rk(4)} w={10} h={10} cls="g01-r-part" delayMs={delayMs + 1000} v={{ "--gd": "0.7s", "--tx1": "140%", "--ty1": "calc(var(--fx-side, 1) * -60%)", "--r1": "60deg" }}>
        <Man kind="b" fill={c.deep} stroke={c.core} />
      </Q>
      {[0, 1, 2].map((i) => (
        <Q key={`s${i}`} x={`${62 + i * 9}%`} y={rk(0.3)} w={6.4} h={6.4} cls="g01-r-in" delayMs={delayMs + 300 + i * 60} v={{ "--gd": "1.7s" }} style={{ border: `1.6px dashed ${c.core}`, borderRadius: "2px" }} />
      ))}
      <Q x="62%" y={rk(0.3)} w={6.4} h={6.4} cls="g01-r-stamp" delayMs={delayMs + 1080} v={{ "--gd": "0.9s" }}>
        <Die c={c} />
      </Q>
      <Tally n={18} r={1.4} x0={10} x1={90} color={c.core} delayMs={delayMs + 420} gd="1.5s" h={2.4} />
    </Brd>
  );
}

/* --- bn4_pact_of_the_dawn -----------------------------------------------------
   "Suspend your nerf for your next 12 turns, and every one of your captured
   pawns returns at once to squares nearest your home rank. The most advanced
   returning pawn cannot move until your opponent replies." The sun comes up
   over the caster's edge and the fallen pawns rise out of it onto the squares
   nearest home; the one furthest forward is pinned by a small lock for one
   reply. The nerf cuff opens and twelve turns are ticked. */
function PactOfTheDawnRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <PactOfTheDawnCuts lead={lead} role={role} delayMs={delayMs} />;
  const c = C_PD;
  const back = [
    { col: 1, r: 1 },
    { col: 3, r: 1 },
    { col: 6, r: 2 },
  ];
  return (
    <Brd>
      <Q x="50%" y={rk(-0.5)} w={60} h={30} cls="g01-r-up" delayMs={delayMs} v={{ "--gd": "2s" }} style={{ transformOrigin: FROM_CASTER }}>
        <svg viewBox="0 0 60 30" className="block h-full w-full" aria-hidden="true">
          <path d="M4 30a26 26 0 0 1 52 0z" fill="rgba(255,171,94,0.42)" stroke={c.core} strokeWidth="1.2" />
        </svg>
      </Q>
      <Q x="50%" y={rk(0.4)} w={70} h={20} cls="g01-r-toll" delayMs={delayMs + 160} v={{ "--gd": "1.2s" }}>
        <svg viewBox="0 0 70 20" className="block h-full w-full" aria-hidden="true">
          <path d="M35 4v-3M15 10l-3-3M55 10l3-3M5 17l-4-1M65 17l4-1" stroke={c.glow} strokeWidth="1.4" {...SJ} />
        </svg>
      </Q>
      {back.map((p, i) => (
        <Q key={i} x={cl(p.col)} y={rk(p.r)} w={10} h={10} cls="g01-r-up" delayMs={delayMs + 300 + i * 110} v={{ "--gd": "1.6s" }} style={{ transformOrigin: FROM_CASTER }}>
          <Man kind="p" fill={c.glow} stroke={c.deep} />
        </Q>
      ))}
      <Q x={`calc(${cl(6)} + 3.4%)`} y={rk(2.3)} w={4.4} h={4.4} cls="g01-r-stamp" delayMs={delayMs + 720} v={{ "--gd": "1.1s" }}>
        <svg viewBox="0 0 16 16" className="block h-full w-full" aria-hidden="true">
          <path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke={c.deep} strokeWidth="1.8" />
          <rect x="3" y="7" width="10" height="8" rx="1" fill={c.core} stroke={c.deep} strokeWidth="1.2" />
        </svg>
      </Q>
      <NerfCuff x={cl(7)} y={rk(0.4)} c={c} delayMs={delayMs + 540} />
      <Tally n={12} r={3.2} x0={12} x1={88} color={c.core} delayMs={delayMs + 820} gd="1.2s" h={2.4} />
      <Q x={cl(3)} y={rk(1.6)} w={20} h={8} cls="g01-r-lean" delayMs={delayMs + 1300} v={{ "--gd": "1s" }}>
        <svg viewBox="0 0 40 16" className="block h-full w-full" aria-hidden="true">
          <circle cx="6" cy="10" r="1.4" fill={C_PD.glow} /><circle cx="20" cy="5" r="1.2" fill={C_PD.core} /><circle cx="33" cy="11" r="1.4" fill={C_PD.glow} />
        </svg>
      </Q>
    </Brd>
  );
}

/* --- bn4_royal_privilege ------------------------------------------------------
   "For the rest of the game, every time you move your queen, your nerf is
   suspended for your next 2 turns. Your next 2 drafts are skipped." The
   caster's queen strides up her file over a royal carpet; as she lands the
   nerf cuff springs open and two turn pips are struck; the price is paid at
   the caster's edge, where the next two draft cards are crossed out. */
function RoyalPrivilegeRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <RoyalPrivilegeCuts lead={lead} role={role} delayMs={delayMs} />;
  const c = C_RP;
  return (
    <Brd>
      <Q x={QUEEN_X} y={rk(2)} w={8} h={50} cls="g01-r-grow" delayMs={delayMs} v={{ "--gd": "1.9s" }} style={{ transformOrigin: FROM_CASTER, background: "rgba(217,163,230,0.3)", borderLeft: `2px solid ${c.core}`, borderRight: `2px solid ${c.core}` }} />
      <Q x={QUEEN_X} y={rk(0)} w={11} h={11} cls="g01-r-go" delayMs={delayMs + 160} v={{ "--gd": "1.6s", "--tx1": "0%", "--ty1": "calc(var(--fx-side, 1) * -300%)" }}>
        <Man kind="q" fill={c.glow} stroke={c.deep} />
      </Q>
      <NerfCuff x={`calc(${QUEEN_X} - var(--fx-side, 1) * 25%)`} y={rk(3)} c={c} delayMs={delayMs + 560} />
      <Tally n={2} r={2.3} x0={20} x1={26} color={c.core} delayMs={delayMs + 700} gd="1.1s" />
      {[0, 1].map((i) => (
        <Q key={i} x={`${70 + i * 12}%`} y={rk(0.3)} w={8} h={11} cls="g01-r-in" delayMs={delayMs + 400 + i * 80} v={{ "--gd": "1.5s" }}>
          <DraftCard c={c} />
        </Q>
      ))}
      {[0, 1].map((i) => (
        <Q key={`x${i}`} x={`${70 + i * 12}%`} y={rk(0.3)} w={11} h={1.2} cls="g01-r-draw" delayMs={delayMs + 780 + i * 90} v={{ "--gd": "1.1s" }} style={{ background: c.deep, rotate: "-56deg" }} />
      ))}
    </Brd>
  );
}

/* --- bn4_siege_mentality ------------------------------------------------------
   "For the rest of the game, whenever your opponent puts your king in check,
   your nerf is suspended for your next 3 turns." A wall goes up round the
   caster's king; a check is loosed at him from the opponent's side and sticks
   in the wall; on the hit the nerf cuff springs open and three turns are
   ticked. */
function SiegeMentalityRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <SiegeMentalityCuts lead={lead} role={role} delayMs={delayMs} />;
  const c = C_SM;
  return (
    <Brd>
      <Q x={KING_X} y={rk(0)} w={10} h={10} cls="g01-r-in" delayMs={delayMs} v={{ "--gd": "2s" }}>
        <Man kind="k" fill={c.glow} stroke={c.deep} />
      </Q>
      <Q x={KING_X} y={rk(0.7)} w={37.5} h={8} cls="g01-r-grow" delayMs={delayMs + 120} v={{ "--gd": "1.9s" }} style={{ transformOrigin: FROM_CASTER }}>
        <svg viewBox="0 0 60 12" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 12V4h6V0h6v4h6V0h6v4h6V0h6v4h6V0h6v4h6V0h6v12z" fill={c.core} stroke={c.deep} strokeWidth="1.2" />
        </svg>
      </Q>
      <Q x={KING_X} y={rk(3)} w={3} h={34} cls="g01-r-shout" delayMs={delayMs + 300} v={{ "--gd": "0.7s" }} style={{ scale: "1 var(--fx-side, 1)" }}>
        <svg viewBox="0 0 8 100" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <path d="M4 4v88" stroke={c.deep} strokeWidth="2" /><path d="M1 84l3 12 3-12z" fill={c.deep} /><path d="M1 4l3 6 3-6" fill="none" stroke={c.core} strokeWidth="1.4" />
        </svg>
      </Q>
      <Q x={KING_X} y={rk(1.3)} w={14} h={4} cls="g01-r-stamp" delayMs={delayMs + 560} v={{ "--gd": "1s" }}>
        <svg viewBox="0 0 30 8" className="block h-full w-full" aria-hidden="true">
          <path d="M4 4l5-3M4 4l5 3M26 4l-5-3M26 4l-5 3M15 1v-1" stroke={c.glow} strokeWidth="1.4" {...SJ} />
        </svg>
      </Q>
      <NerfCuff x={`calc(${KING_X} + var(--fx-side, 1) * 31%)`} y={rk(0.4)} c={c} delayMs={delayMs + 600} />
      <Tally n={3} r={1.5} x0={70} x1={84} color={c.core} delayMs={delayMs + 760} gd="1.1s" />
    </Brd>
  );
}

/* --- bn4_year_of_jubilee ------------------------------------------------------
   "Suspend your nerf for your next 25 turns. When it returns, gain 1 draft
   reroll." A ram's horn is sounded from the caster's edge and the nerf cuff
   springs open; twenty-five turns run out along the rank like a calendar,
   and a die waits at the far end of them: the reroll that comes when the
   nerf does. */
function YearOfJubileeRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <YearOfJubileeCuts lead={lead} role={role} delayMs={delayMs} />;
  const c = C_YJ;
  return (
    <Brd>
      <Q x="14%" y={rk(0.4)} w={18} h={10} cls="g01-r-up" delayMs={delayMs + 60} v={{ "--gd": "2s", "--r0": "-10deg" }} style={{ transformOrigin: "10% 90%" }}>
        <svg viewBox="0 0 40 22" className="block h-full w-full" aria-hidden="true">
          <path d="M3 18c6 2 16 1 24-6 4-3 6-7 9-10l2 2c-2 4-4 9-8 13-8 6-18 7-27 3z" fill={c.core} stroke={c.deep} strokeWidth="1.4" {...SJ} />
          <path d="M9 17.6l1-3M15 16.8l1-3M21 14.6l1-3M26 11l1.4-2.6" stroke={c.deep} strokeWidth="1" />
        </svg>
      </Q>
      {[0, 1, 2].map((i) => (
        <Q key={i} x="31%" y={rk(1.4)} w={10 + i * 5} h={10 + i * 5} cls="g01-r-toll" delayMs={delayMs + 220 + i * 90} v={{ "--gd": "0.8s" }}>
          <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
            <path d="M6 4q6 6 0 12" fill="none" stroke={c.glow} strokeWidth="1.6" {...SJ} />
          </svg>
        </Q>
      ))}
      <NerfCuff x="44%" y={rk(0.5)} c={c} delayMs={delayMs + 380} />
      <Tally n={25} r={2} x0={8} x1={80} color={c.core} delayMs={delayMs + 560} gd="1.6s" h={2.6} />
      <Q x="89%" y={rk(2)} w={7} h={7} cls="g01-r-stamp" delayMs={delayMs + 1040} v={{ "--gd": "1s" }}>
        <Die c={c} />
      </Q>
      <Q x="31%" y={rk(1.4)} w={14} h={14} cls="g01-r-lean" delayMs={delayMs + 1300} v={{ "--gd": "1s" }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <path d="M5 5q6 5 0 10M10 3q7 7 0 14" fill="none" stroke={C_YJ.core} strokeWidth="1.2" {...SJ} />
        </svg>
      </Q>
    </Brd>
  );
}

/** A laurel wreath (a champion's reward). */
function Laurel({ c }: { c: { core: string; glow: string; deep: string } }) {
  return (
    <svg viewBox="0 0 24 20" className="block h-full w-full" aria-hidden="true">
      <path d="M12 18C5 17 2 11 4 4M12 18c7-1 10-7 8-14" fill="none" stroke={c.core} strokeWidth="1.8" {...SJ} />
      <path d="M4 7l-2-1M4.6 11l-2.4 0M6.4 14.4l-2 1M20 7l2-1M19.4 11l2.4 0M17.6 14.4l2 1" stroke={c.core} strokeWidth="2.2" {...SJ} />
    </svg>
  );
}

/* --- bn4_champions_rest -------------------------------------------------------
   "For the rest of the game, every rook or queen you capture suspends your
   nerf for your next 4 turns." An enemy rook and an enemy queen are struck
   off their squares one after the other; each throws a laurel back to the
   caster's edge, where the nerf cuff springs open under the wreath and four
   turns are ticked. */
function ChampionsRestRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <ChampionsRestCuts lead={lead} role={role} delayMs={delayMs} />;
  const c = C_CR;
  return (
    <Brd>
      <Q x={cl(2)} y={rk(5)} w={10} h={10} cls="g01-r-in" delayMs={delayMs + 60} v={{ "--gd": "0.5s" }}>
        <Man kind="r" fill={c.deep} stroke={c.core} />
      </Q>
      <Q x={cl(2)} y={rk(5)} w={10} h={10} cls="g01-r-part" delayMs={delayMs + 300} v={{ "--gd": "0.7s", "--tx1": "-120%", "--ty1": "calc(var(--fx-side, 1) * -80%)", "--r1": "-70deg" }}>
        <Man kind="r" fill={c.deep} stroke={c.core} />
      </Q>
      <Q x={cl(5)} y={rk(5)} w={10} h={10} cls="g01-r-in" delayMs={delayMs + 120} v={{ "--gd": "0.75s" }}>
        <Man kind="q" fill={c.deep} stroke={c.core} />
      </Q>
      <Q x={cl(5)} y={rk(5)} w={10} h={10} cls="g01-r-part" delayMs={delayMs + 560} v={{ "--gd": "0.7s", "--tx1": "120%", "--ty1": "calc(var(--fx-side, 1) * -80%)", "--r1": "70deg" }}>
        <Man kind="q" fill={c.deep} stroke={c.core} />
      </Q>
      {[2, 5].map((col, i) => (
        <Q key={col} x="50%" y={rk(0.9)} w={11} h={9} cls="g01-r-go" delayMs={delayMs + 360 + i * 260} v={{ "--gd": "1.3s", "--tx0": `${(col - 3.5) * 110}%`, "--ty0": "calc(var(--fx-side, 1) * -560%)", "--tx1": "0%", "--ty1": "0%" }}>
          <Laurel c={c} />
        </Q>
      ))}
      <NerfCuff x="50%" y={rk(0.9)} c={c} delayMs={delayMs + 720} />
      <Tally n={4} r={1.9} x0={40} x1={60} color={c.core} delayMs={delayMs + 860} gd="1.1s" />
      <Q x="50%" y={rk(1.4)} w={12} h={6} cls="g01-r-lean" delayMs={delayMs + 1350} v={{ "--gd": "0.9s" }}>
        <svg viewBox="0 0 24 12" className="block h-full w-full" aria-hidden="true"><path d="M6 10l3-6M18 10l-3-6" stroke={c.glow} strokeWidth="1.4" {...SJ} /></svg>
      </Q>
    </Brd>
  );
}

/* --- bn4_debtors_holiday ------------------------------------------------------
   "Suspend your nerf for your next 12 turns, and gain 2 draft rerolls." A
   promissory note lies at the caster's edge and is torn in two; the nerf cuff
   springs open, two dice tumble out of the torn note onto the caster's rank,
   and twelve turns are ticked. */
function DebtorsHolidayRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <DebtorsHolidayCuts lead={lead} role={role} delayMs={delayMs} />;
  const c = C_DH;
  const half = (flip: boolean) => (
    <svg viewBox="0 0 20 24" className="block h-full w-full" aria-hidden="true">
      <path d={flip ? "M0 1h19v22H0l3-4-3-3 3-4-3-4 3-3z" : "M20 1H1v22h19l-3-4 3-3-3-4 3-4-3-3z"} fill={c.glow} stroke={c.core} strokeWidth="1.2" />
      <path d={flip ? "M5 7h10M5 11h8" : "M5 7h10M5 11h8M5 15h6"} stroke={c.deep} strokeWidth="1" />
    </svg>
  );
  return (
    <Brd>
      <Q x="44%" y={rk(1.2)} w={11} h={13} cls="g01-r-in" delayMs={delayMs} v={{ "--gd": "0.55s", "--s0": "1" }}>{half(false)}</Q>
      <Q x="55%" y={rk(1.2)} w={11} h={13} cls="g01-r-in" delayMs={delayMs} v={{ "--gd": "0.55s", "--s0": "1" }}>{half(true)}</Q>
      <Q x="44%" y={rk(1.2)} w={11} h={13} cls="g01-r-part" delayMs={delayMs + 280} v={{ "--gd": "0.8s", "--tx1": "-80%", "--ty1": "30%", "--r1": "-35deg" }}>{half(false)}</Q>
      <Q x="55%" y={rk(1.2)} w={11} h={13} cls="g01-r-part" delayMs={delayMs + 280} v={{ "--gd": "0.8s", "--tx1": "80%", "--ty1": "30%", "--r1": "35deg" }}>{half(true)}</Q>
      {[0, 1].map((i) => (
        <Q key={i} x={`${44 + i * 12}%`} y={rk(0.3)} w={7} h={7} cls="g01-r-go" delayMs={delayMs + 360 + i * 90} v={{ "--gd": "1.3s", "--tx0": `${i ? -80 : 80}%`, "--ty0": "calc(var(--fx-side, 1) * -150%)", "--tx1": "0%", "--ty1": "0%" }}>
          <Die c={c} />
        </Q>
      ))}
      <NerfCuff x="18%" y={rk(0.5)} c={c} delayMs={delayMs + 420} />
      <Tally n={12} r={2.4} x0={14} x1={86} color={c.core} delayMs={delayMs + 640} gd="1.3s" />
      <Q x="50%" y={rk(1.6)} w={16} h={6} cls="g01-r-lean" delayMs={delayMs + 1300} v={{ "--gd": "0.9s" }}>
        <svg viewBox="0 0 32 12" className="block h-full w-full" aria-hidden="true"><path d="M4 8l4-3M14 9l2-5M26 8l-4-3" stroke={c.core} strokeWidth="1.4" {...SJ} /></svg>
      </Q>
    </Brd>
  );
}

/* --- bn4_escape_artist --------------------------------------------------------
   "For the rest of the game, whenever your king steps out of check, your nerf
   is suspended for your next 2 turns." A check runs down the file at the
   caster's king and a rope noose drops round him; he slips out of it and
   steps one square aside, the empty noose falls, and as he lands the nerf
   cuff springs open with two turns ticked. */
function EscapeArtistRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <EscapeArtistCuts lead={lead} role={role} delayMs={delayMs} />;
  const c = C_EA;
  return (
    <Brd>
      <Q x={KING_X} y={rk(3)} w={3} h={40} cls="g01-r-shout" delayMs={delayMs + 80} v={{ "--gd": "0.7s" }} style={{ scale: "1 var(--fx-side, 1)" }}>
        <svg viewBox="0 0 8 100" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <path d="M4 4v88" stroke={c.core} strokeWidth="2" /><path d="M1 84l3 12 3-12z" fill={c.core} />
        </svg>
      </Q>
      <Q x={KING_X} y={rk(0)} w={10} h={10} cls="g01-r-go" delayMs={delayMs + 200} v={{ "--gd": "1.6s", "--tx0": "0%", "--ty0": "0%", "--tx1": "calc(var(--fx-side, 1) * 125%)", "--ty1": "0%" }}>
        <Man kind="k" fill={c.glow} stroke={c.deep} />
      </Q>
      <Q x={KING_X} y={rk(0.1)} w={11} h={8} cls="g01-r-in" delayMs={delayMs + 260} v={{ "--gd": "0.6s", "--ty0": "-120%" }}>
        <svg viewBox="0 0 24 16" className="block h-full w-full" aria-hidden="true"><ellipse cx="12" cy="9" rx="9" ry="4.4" fill="none" stroke={c.core} strokeWidth="2" /><path d="M12 4.6V0" stroke={c.core} strokeWidth="2" {...SJ} /></svg>
      </Q>
      <Q x={KING_X} y={rk(0.1)} w={11} h={8} cls="g01-r-part" delayMs={delayMs + 620} v={{ "--gd": "0.8s", "--tx1": "calc(var(--fx-side, 1) * -60%)", "--ty1": "calc(var(--fx-side, 1) * 120%)", "--r1": "-25deg" }}>
        <svg viewBox="0 0 24 16" className="block h-full w-full" aria-hidden="true"><ellipse cx="12" cy="9" rx="9" ry="4.4" fill="none" stroke={c.core} strokeWidth="2" /></svg>
      </Q>
      <NerfCuff x={`calc(${KING_X} + var(--fx-side, 1) * 31%)`} y={rk(0.5)} c={c} delayMs={delayMs + 700} />
      <Tally n={2} r={1.4} x0={78} x1={84} color={c.core} delayMs={delayMs + 860} gd="1.1s" />
      <Q x={KING_X} y={rk(0.9)} w={12} h={5} cls="g01-r-lean" delayMs={delayMs + 1250} v={{ "--gd": "0.9s" }}>
        <svg viewBox="0 0 24 10" className="block h-full w-full" aria-hidden="true"><path d="M3 6h7M14 4h7" stroke={c.glow} strokeWidth="1.4" {...SJ} /></svg>
      </Q>
    </Brd>
  );
}

/* --- bn4_grand_bargain --------------------------------------------------------
   "Suspend your nerf for your next 14 turns, and your next draft shows three
   cards, of which you keep one." Two hands meet over the halfway line and
   clasp; three draft cards fan out at the caster's edge, two are swept away
   and one is lifted and kept; the nerf cuff springs open and fourteen turns
   are ticked. */
function GrandBargainRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <GrandBargainCuts lead={lead} role={role} delayMs={delayMs} />;
  const c = C_GB;
  const hand = (flip: boolean) => (
    <svg viewBox="0 0 30 16" className="block h-full w-full" aria-hidden="true" style={flip ? { scale: "-1 1" } : undefined}>
      <path d="M0 5h12l6-2 8 3c2 1 2 3 0 3l-6-1 2 3c1 2-1 3-2 2l-4-3H0z" fill={flip ? c.core : c.glow} stroke={c.deep} strokeWidth="1.2" {...SJ} />
    </svg>
  );
  return (
    <Brd>
      <Q x="40%" y={rk(3.5)} w={18} h={10} cls="g01-r-go" delayMs={delayMs} v={{ "--gd": "1.5s", "--tx0": "-120%", "--ty0": "0%", "--tx1": "0%", "--ty1": "0%" }}>{hand(false)}</Q>
      <Q x="60%" y={rk(3.5)} w={18} h={10} cls="g01-r-go" delayMs={delayMs} v={{ "--gd": "1.5s", "--tx0": "120%", "--ty0": "0%", "--tx1": "0%", "--ty1": "0%" }}>{hand(true)}</Q>
      <Q x="50%" y={rk(3.5)} w={8} h={8} cls="g01-r-toll" delayMs={delayMs + 300} v={{ "--gd": "0.7s" }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true"><path d="M10 2v4M10 14v4M2 10h4M14 10h4" stroke={c.glow} strokeWidth="1.6" {...SJ} /></svg>
      </Q>
      {[-1, 0, 1].map((i) => (
        <Q key={i} x={`${50 + i * 12}%`} y={rk(1)} w={9} h={13} cls={i === 0 ? "g01-r-up" : "g01-r-in"} delayMs={delayMs + 380 + (i + 1) * 60} v={{ "--gd": i === 0 ? "1.5s" : "0.8s", "--r0": `${i * 16}deg` }}>
          <DraftCard c={c} />
        </Q>
      ))}
      {[-1, 1].map((i) => (
        <Q key={`p${i}`} x={`${50 + i * 12}%`} y={rk(1)} w={9} h={13} cls="g01-r-part" delayMs={delayMs + 1020} v={{ "--gd": "0.6s", "--tx1": `${i * 140}%`, "--ty1": "calc(var(--fx-side, 1) * 50%)", "--r1": `${i * 40}deg` }}>
          <DraftCard c={c} />
        </Q>
      ))}
      <NerfCuff x="14%" y={rk(0.5)} c={c} delayMs={delayMs + 560} />
      <Tally n={14} r={2.3} x0={14} x1={86} color={c.core} delayMs={delayMs + 700} gd="1.3s" h={2.6} />
    </Brd>
  );
}

/* --- bn4_half_moon_charter ----------------------------------------------------
   "For the rest of the game, your nerf is suspended on every other one of
   your turns, starting with your next. The charter costs you your next two
   drafts, which are skipped." A charter with a half-moon seal is laid on the
   caster's side; the turns ahead are ticked as alternating lit and dark
   marks, lit first; the nerf cuff springs open; and the next two draft cards
   are crossed out. */
function HalfMoonCharterRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <HalfMoonCharterCuts lead={lead} role={role} delayMs={delayMs} />;
  const c = C_HM;
  return (
    <Brd>
      <Q x="34%" y={rk(1.2)} w={30} h={13} cls="g01-r-draw" delayMs={delayMs} v={{ "--gd": "2s" }}>
        <svg viewBox="0 0 50 22" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <rect x="2" y="2" width="46" height="18" fill={c.glow} stroke={c.core} strokeWidth="1.2" />
          <path d="M8 8h26M8 12h22M8 16h16" stroke={c.core} strokeWidth="1" />
        </svg>
      </Q>
      <Q x="43%" y={rk(0.8)} w={6.4} h={6.4} cls="g01-r-stamp" delayMs={delayMs + 240} v={{ "--gd": "1.8s" }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <circle cx="10" cy="10" r="8.6" fill={c.deep} stroke={c.core} strokeWidth="1.4" />
          <path d="M10 3a7 7 0 0 1 0 14z" fill={c.glow} />
        </svg>
      </Q>
      {Array.from({ length: 8 }, (_, i) => (
        <Q key={i} x={`${16 + i * 10}%`} y={rk(2.6)} w={4.4} h={4.4} cls={i % 2 === 0 ? "g01-r-pip" : "g01-r-dim"} delayMs={delayMs + 420 + i * 55} v={{ "--gd": "1.3s" }} style={{ background: i % 2 === 0 ? c.core : c.deep, border: `1.4px solid ${c.core}`, borderRadius: "50%" }} />
      ))}
      <NerfCuff x="12%" y={rk(1.2)} c={c} delayMs={delayMs + 500} />
      {[0, 1].map((i) => (
        <Q key={`d${i}`} x={`${70 + i * 12}%`} y={rk(0.6)} w={8} h={11} cls="g01-r-in" delayMs={delayMs + 300 + i * 80} v={{ "--gd": "1.5s" }}>
          <DraftCard c={c} />
        </Q>
      ))}
      {[0, 1].map((i) => (
        <Q key={`x${i}`} x={`${70 + i * 12}%`} y={rk(0.6)} w={11} h={1.2} cls="g01-r-draw" delayMs={delayMs + 820 + i * 90} v={{ "--gd": "1s" }} style={{ background: c.deep, rotate: "-56deg" }} />
      ))}
      <Q x="43%" y={rk(1.6)} w={8} h={5} cls="g01-r-lean" delayMs={delayMs + 1300} v={{ "--gd": "0.9s" }}>
        <svg viewBox="0 0 16 10" className="block h-full w-full" aria-hidden="true"><path d="M8 1a4 4 0 0 1 0 8" fill="none" stroke={c.glow} strokeWidth="1.4" /></svg>
      </Q>
    </Brd>
  );
}

/* --- bn4_jubilee --------------------------------------------------------------
   "Suspend your nerf for your next 8 turns, and your next draft offer rolls
   one tier higher." Bunting is strung across the caster's side; the nerf cuff
   springs open and eight turns are ticked; the next draft card climbs one
   step and gains a second tier pip. */
function JubileeRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <JubileeCuts lead={lead} role={role} delayMs={delayMs} />;
  const c = C_JB;
  return (
    <Brd>
      <Q x="50%" y={rk(2.3)} w={100} h={9} cls="g01-r-draw" delayMs={delayMs} v={{ "--gd": "2s" }}>
        <svg viewBox="0 0 160 14" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 2q80 8 160 0" fill="none" stroke={c.deep} strokeWidth="1" />
          {Array.from({ length: 10 }, (_, i) => (
            <path key={i} d={`M${6 + i * 16} ${2.6 + Math.sin(((i + 0.5) / 10) * Math.PI) * 3.4}l5 9 5-9z`} fill={i % 2 ? c.core : c.glow} stroke={c.deep} strokeWidth="0.8" />
          ))}
        </svg>
      </Q>
      <NerfCuff x="16%" y={rk(0.6)} c={c} delayMs={delayMs + 300} />
      <Tally n={8} r={1.4} x0={10} x1={50} color={c.core} delayMs={delayMs + 460} gd="1.3s" />
      <Q x="76%" y={rk(1)} w={4} h={11} cls="g01-r-grow" delayMs={delayMs + 380} v={{ "--gd": "1.4s" }} style={{ transformOrigin: FROM_CASTER }}>
        <svg viewBox="0 0 10 30" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true"><path d="M1 29h8V15H1zM1 15h8" fill={c.deep} stroke={c.core} strokeWidth="1" /></svg>
      </Q>
      <Q x="76%" y={rk(0.4)} w={9} h={13} cls="g01-r-go" delayMs={delayMs + 440} v={{ "--gd": "1.5s", "--tx1": "0%", "--ty1": "calc(var(--fx-side, 1) * -70%)" }}>
        <DraftCard c={c} />
      </Q>
      {[0, 1].map((i) => (
        <Q key={i} x={`calc(76% + ${i * 3 - 1.5}%)`} y={rk(1.95)} w={2.4} h={2.4} cls="g01-r-pip" delayMs={delayMs + (i ? 900 : 620)} v={{ "--gd": "1.1s" }} style={{ background: c.core, border: `1px solid ${c.deep}`, borderRadius: "50%" }} />
      ))}
      <Q x="76%" y={rk(2.6)} w={10} h={5} cls="g01-r-lean" delayMs={delayMs + 1250} v={{ "--gd": "0.9s" }}>
        <svg viewBox="0 0 20 10" className="block h-full w-full" aria-hidden="true"><path d="M5 8l5-5 5 5" fill="none" stroke={c.glow} strokeWidth="1.4" {...SJ} /></svg>
      </Q>
    </Brd>
  );
}

/* --- bn4_keys_to_the_city -----------------------------------------------------
   "Free action: suspend your nerf for your next 8 turns, used at the moment
   you choose. While suspended, your pieces ignore the boundaries your nerf
   would impose." A key is held up at the caster's edge; a boundary drawn
   across the board is a pair of city gates, and they swing open; the line
   lifts and a knight rides through it; eight turns are ticked. */
function KeysToTheCityRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <KeysToTheCityCuts lead={lead} role={role} delayMs={delayMs} />;
  const c = C_KC;
  return (
    <Brd>
      <Q x="50%" y={rk(3.5)} w={100} h={1.2} cls="g01-r-dim" delayMs={delayMs + 60} v={{ "--gd": "1.6s" }} style={{ background: `repeating-linear-gradient(90deg, ${c.core} 0 8px, transparent 8px 14px)` }} />
      <Q x="12%" y={rk(0.6)} w={12} h={6} cls="g01-r-turn" delayMs={delayMs} v={{ "--gd": "1.2s" }} style={{ transformOrigin: "20% 50%" }}>
        <svg viewBox="0 0 24 12" className="block h-full w-full" aria-hidden="true">
          <circle cx="5" cy="6" r="4" fill="none" stroke={c.glow} strokeWidth="2" />
          <path d="M9 6h13M18 6v4M21 6v3" stroke={c.glow} strokeWidth="2" {...SJ} />
        </svg>
      </Q>
      <Q x="43.75%" y={rk(3.5)} w={12.5} h={16} cls="g01-r-open" delayMs={delayMs + 200} v={{ "--gd": "1.5s", "--ra": "-75deg" }} style={{ transformOrigin: "0% 50%" }}>
        <svg viewBox="0 0 20 26" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true"><path d="M1 1h18v24H1z" fill={c.deep} stroke={c.core} strokeWidth="1.4" /><path d="M5 1v24M10 1v24M15 1v24" stroke={c.core} strokeWidth="0.8" /></svg>
      </Q>
      <Q x="56.25%" y={rk(3.5)} w={12.5} h={16} cls="g01-r-open" delayMs={delayMs + 200} v={{ "--gd": "1.5s", "--ra": "75deg" }} style={{ transformOrigin: "100% 50%" }}>
        <svg viewBox="0 0 20 26" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true"><path d="M1 1h18v24H1z" fill={c.deep} stroke={c.core} strokeWidth="1.4" /><path d="M5 1v24M10 1v24M15 1v24" stroke={c.core} strokeWidth="0.8" /></svg>
      </Q>
      <Q x="50%" y={rk(2)} w={10} h={10} cls="g01-r-go" delayMs={delayMs + 560} v={{ "--gd": "1.3s", "--tx1": "0%", "--ty1": "calc(var(--fx-side, 1) * -300%)" }}>
        <Man kind="n" fill={c.glow} stroke={c.deep} />
      </Q>
      <NerfCuff x="24%" y={rk(0.6)} c={c} delayMs={delayMs + 380} />
      <Tally n={8} r={1.6} x0={14} x1={46} color={c.core} delayMs={delayMs + 620} gd="1.2s" />
      <Q x="50%" y={rk(5)} w={12} h={6} cls="g01-r-lean" delayMs={delayMs + 1300} v={{ "--gd": "0.9s" }}>
        <svg viewBox="0 0 24 12" className="block h-full w-full" aria-hidden="true"><path d="M6 10l2-6M12 10V3M18 10l-2-6" stroke={c.glow} strokeWidth="1.2" {...SJ} /></svg>
      </Q>
    </Brd>
  );
}

/* --- bn4_moonlit_reprieve -----------------------------------------------------
   "For the rest of the game the moon keeps your schedule: your nerf is
   suspended for 2 of your turns, returns for 2, and so on." A moon crosses
   the sky over the opponent's half; along the caster's side the turns ahead
   are set out as moon phases, two full and two new, again and again; the
   nerf cuff springs open under the first full pair. */
function MoonlitReprieveRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <MoonlitReprieveCuts lead={lead} role={role} delayMs={delayMs} />;
  const c = C_MR;
  return (
    <Brd>
      <Q x="20%" y={rk(5.6)} w={12} h={12} cls="g01-r-go" delayMs={delayMs} v={{ "--gd": "2s", "--tx0": "0%", "--ty0": "calc(var(--fx-side, 1) * 40%)", "--tx1": "450%", "--ty1": "calc(var(--fx-side, 1) * 20%)" }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <circle cx="10" cy="10" r="8" fill={c.glow} stroke={c.core} strokeWidth="1.2" />
          <circle cx="7" cy="8" r="1.6" fill={c.core} opacity="0.5" /><circle cx="12" cy="13" r="1.2" fill={c.core} opacity="0.5" />
        </svg>
      </Q>
      <Q x="20%" y={rk(5.6)} w={16} h={16} cls="g01-r-toll" delayMs={delayMs + 180} v={{ "--gd": "0.8s" }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true"><path d="M10 0v3M10 17v3M0 10h3M17 10h3" stroke={C_MR.glow} strokeWidth="1.2" {...SJ} /></svg>
      </Q>
      {Array.from({ length: 8 }, (_, i) => {
        const full = i % 4 < 2;
        return (
          <Q key={i} x={`${16 + i * 10}%`} y={rk(1.8)} w={5.4} h={5.4} cls={full ? "g01-r-pip" : "g01-r-dim"} delayMs={delayMs + 320 + i * 60} v={{ "--gd": "1.4s" }}>
            <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
              <circle cx="10" cy="10" r="8" fill={full ? c.glow : c.deep} stroke={c.core} strokeWidth="1.6" />
            </svg>
          </Q>
        );
      })}
      <Q x="21%" y={rk(1.1)} w={14} h={1.4} cls="g01-r-draw" delayMs={delayMs + 640} v={{ "--gd": "1.1s" }} style={{ background: c.core }} />
      <NerfCuff x="21%" y={rk(0.4)} c={c} delayMs={delayMs + 560} />
      <Q x="60%" y={rk(5.6)} w={16} h={8} cls="g01-r-lean" delayMs={delayMs + 1300} v={{ "--gd": "0.9s" }}>
        <svg viewBox="0 0 32 16" className="block h-full w-full" aria-hidden="true"><circle cx="6" cy="8" r="1.2" fill={c.glow} /><circle cx="16" cy="4" r="1" fill={c.core} /><circle cx="26" cy="10" r="1.2" fill={c.glow} /></svg>
      </Q>
    </Brd>
  );
}

/* =============================================================================
   Registry. Every `sound` is an existing SigSoundKey, every `source` an
   existing SigZone that the card's own rule really creates, and every card
   declares its anchor.
   ========================================================================== */

function S(Render: SigPlugin["Render"], config: SigPlugin["config"]): SigPlugin {
  return { config, Render };
}

/* =============================================================================
   FLAGSHIP IMPACT WAVE - the module-wide moment of real contact.

   The per-card rule scenes have no entry here: a laser column and a split
   clock dial are not what those cards do. Every other lead lands one
   physical hit from the shared impact vocabulary
   (impact/impact.tsx), layered OVER the card's own scene: a column of borrowed time spears down out of the sky, the mechanism's own dial or bell is split in half, and the hour lands as a ground ring.
   Per card, the IMPACT spec picks the primitive combo, the glyph that is split
   in half, the tint (the card's own core color as an r-g-b triple) and the
   beat, which is synced to that scene's OWN strike rhythm, so no two siblings
   land the same hit. The quake wrapper jolts the whole scene stage on the same
   beat (in-scene only: the real board crop never shakes). Animations-off
   coverage for all of these nodes is at the bottom of g01HourglassPlays.css.
   ========================================================================== */

interface G01Imp {
  /** impact beat, ms after the lead's own delayMs */
  at: number;
  /** the card's core color as an "r g b" triple (drives --imp-rgb) */
  rgb: string;
  laser?: boolean;
  shock?: boolean;
  /** which of the module's shatter glyphs is split in half */
  g?: number;
  /** stage jolt on the beat: "s" soft, "h" hard */
  q?: "s" | "h";
  /** impact centre on the 14-cell stage, in percent (cast square = 50/50) */
  x?: number;
  y?: number;
  /** composite box size, in stage percent (9 is ~1.26 cells) */
  s?: number;
}

const IMP_TINT = "rgb(var(--imp-rgb, 216 181 110) / 0.95)";
const IMP_EDGE = "rgba(247, 241, 227, 0.9)";

/** The module's shatter victims: a clock dial, an hour bell, a pendulum bob. Tinted per card via --imp-rgb. */
const IMP_GLYPHS: ReactNode[] = [
  <svg key="a" viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
    <circle cx="12" cy="12" r="8.6" fill={IMP_TINT} /><path d="M12 12V6.4M12 12l4 2.6" fill="none" stroke={IMP_EDGE} strokeWidth="1.8" strokeLinecap="round" />
  </svg>,
  <svg key="b" viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
    <path d="M12 3.6c4.2 0 6.4 3.4 6.4 8.4v5H5.6v-5c0-5 2.2-8.4 6.4-8.4z" fill={IMP_TINT} /><path d="M4.4 17h15.2v2.4H4.4z" fill={IMP_TINT} /><path d="M12 5.6v3" stroke={IMP_EDGE} strokeWidth="1.6" strokeLinecap="round" />
  </svg>,
  <svg key="c" viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
    <path d="M11 3h2v9h-2z" fill={IMP_TINT} /><circle cx="12" cy="16.4" r="5" fill={IMP_TINT} /><circle cx="12" cy="16.4" r="1.8" fill="none" stroke={IMP_EDGE} strokeWidth="1.4" />
  </svg>,
];

const IMPACT: Record<string, G01Imp> = {
  // Hero hit tuned by hand: the column drops onto the seized bob itself (the
  // pendulum hangs just below stage centre), and the dial-glyph splits there.
  bn4_council_of_peace: { at: 460, rgb: "143 214 196", laser: true, shock: true, g: 2, q: "h", s: 12, y: 53 }, // t8 hero
  bn4_great_armistice: { at: 460, rgb: "159 198 232", laser: true, shock: true, g: 0, q: "h", s: 12 }, // t8 hero
  bn4_royal_we: { at: 570, rgb: "232 196 106", laser: true, shock: true, g: 0, q: "h", s: 12 }, // t8 hero
  hx4_royal_lockdown: { at: 630, rgb: "143 154 168", laser: true, shock: true, g: 2, q: "h", s: 12 }, // t8 hero
  bn4_midas_charter: { at: 500, rgb: "242 193 75", laser: true, shock: true, g: 2, q: "h", s: 12 }, // t8 hero
  bn4_hundred_days: { at: 615, rgb: "229 143 122", laser: true, g: 0, q: "s" },
  bn4_crown_jubilee: { at: 440, rgb: "255 200 97", laser: true, shock: true, g: 0, q: "h", s: 12 }, // t8 hero
  bn4_patrons_favor: { at: 640, rgb: "224 120 143", laser: true, g: 0, q: "s" },
  bn4_masked_ball: { at: 595, rgb: "197 143 214", laser: true, shock: true, g: 0, q: "h", s: 12 }, // t8 hero
  hx4_debt_of_crowns: { at: 675, rgb: "201 160 106", laser: true, shock: true, g: 2, q: "h", s: 12 }, // t8 hero
  hx4_last_toll: { at: 430, rgb: "196 180 143", laser: true, shock: true, g: 0, q: "h", s: 12 }, // t8 hero
  ov_time_heist: { at: 640, rgb: "113 214 192", laser: true, shock: true, g: 0, q: "h", s: 12 }, // t8 hero
};

/** The impact composite: laser column, glyph split in half, ground ring. */
function ImpactRig({ imp, delayMs }: { imp: G01Imp; delayMs: number }) {
  const s = imp.s ?? 9;
  return (
    <BoardWideStage>
      <span
        className="g01-imprig absolute block"
        style={{
          left: `${(imp.x ?? 50) - s / 2}%`,
          top: `${(imp.y ?? 50) - s / 2}%`,
          width: `${s}%`,
          height: `${s}%`,
          ...impactVars(imp.rgb, (delayMs + imp.at) / 1000),
        }}
      >
        {imp.laser ? <LaserStrike /> : null}
        {imp.g != null ? <PieceShatter glyph={IMP_GLYPHS[imp.g]} /> : null}
        {imp.shock ? <Shockwave /> : null}
      </span>
    </BoardWideStage>
  );
}

/** Leads render inside a quake wrapper (the whole stage jolts on the impact
 *  beat) with the rig mounted beside them; target/entrance cuts pass through
 *  untouched. */
function withImpact(Base: SigPlugin["Render"], imp: G01Imp): SigPlugin["Render"] {
  function ImpactLead(props: { lead: boolean; role: SigRole; delayMs: number }) {
    if (props.role !== "lead") return <Base {...props} />;
    const scene = <Base {...props} />;
    return (
      <>
        {imp.q ? (
          <span
            className={`g01-quake-${imp.q} pointer-events-none absolute inset-0 z-30 block`}
            style={impactVars(imp.rgb, (props.delayMs + imp.at) / 1000)}
          >
            {scene}
          </span>
        ) : (
          scene
        )}
        <ImpactRig imp={imp} delayMs={props.delayMs} />
      </>
    );
  }
  return ImpactLead;
}

/* --- bn4_second_spring -------------------------------------------------------------
   "Every one of your captured pawns returns at once, each to the empty square
   nearest your home rank. Your next draft is then skipped." The caster's
   pawn rank greens over; seeds drop onto
   the empty squares nearest the caster's home rank where pawns are missing
   (c2 and f2 here; the play's own cuts sprout on the real squares), and each
   one shoots up and opens into a pawn; then the next draft card is dealt and
   struck through, skipped. */
const C_SSR = { core: "#8fdba8", glow: "#fff4dc", deep: "#12301c" };

function SecondSpringRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <SecondSpringScene lead={lead} role={role} delayMs={delayMs} />;
  const c = C_SSR;
  const d = delayMs;
  const beds = [2, 5];
  return (
    <Brd>
      <Q x="50%" y={rk(1)} w={100} h={12.5} cls="g01-r-in" delayMs={d + 160} v={{ "--gd": "1.5s", "--s0": "1" }} style={{ background: "rgba(143,219,168,0.2)" }} />
      {beds.map((col, i) => (
        <Q key={`s${col}`} x={cl(col)} y={rk(1)} w={2.4} h={2.4} cls="g01-r-go" delayMs={d + 40 + i * 80} v={{ "--gd": "0.6s", "--tx0": "0%", "--ty0": "calc(var(--fx-side, 1) * -600%)", "--tx1": "0%", "--ty1": "0%" }} style={{ background: c.core, borderRadius: "50%" }} />
      ))}
      {beds.map((col, i) => (
        <Q key={`t${col}`} x={cl(col)} y={`calc(${rk(1)} + var(--fx-side, 1) * 2%)`} w={6} h={8} cls="g01-r-up" delayMs={d + 360 + i * 80} v={{ "--gd": "0.8s" }}>
          <svg viewBox="0 0 12 16" className="block h-full w-full" aria-hidden="true">
            <path d="M6 16V6" stroke={c.core} strokeWidth="1.6" {...SJ} />
            <path d="M6 8C3 8 1.6 6 1.6 3.6 4.4 3.6 6 5.4 6 8zM6 6.4c2.6 0 4.4-1.6 4.4-4.2C7.6 2.2 6 4 6 6.4z" fill={c.core} stroke={c.deep} strokeWidth="0.8" {...SJ} />
          </svg>
        </Q>
      ))}
      {beds.map((col, i) => (
        <Q key={`p${col}`} x={cl(col)} y={rk(1)} w={11} h={11} cls="g01-r-up" delayMs={d + 680 + i * 80} v={{ "--gd": "1.2s" }}>
          <Man kind="p" fill={c.glow} stroke={c.deep} />
        </Q>
      ))}
      <Q x="84%" y={rk(3.5)} w={7} h={10} cls="g01-r-in" delayMs={d + 900} v={{ "--gd": "1.3s" }}>
        <DraftCard c={c} />
      </Q>
      <SkipToken x="84%" y={rk(3.5)} c={c} delayMs={d + 1100} />
    </Brd>
  );
}

export const PLAYS: Record<string, SigPlugin> = {
  // --- held mechanisms: something is physically stopped ---
  bn4_council_of_peace: S(CouncilOfPeaceScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true,
    sound: "clockcage", source: "shield", anchor: "cast",
  }),
  bn4_great_armistice: S(GreatArmisticeScene, {
    ordering: "radial", staggerMs: 55, victims: "all", hasLead: true,
    sound: "snooze", source: "shield", anchor: "board",
  }),
  bn4_hundred_year_lease: S(HundredYearLeaseRule, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "clockice", anchor: "board",
  }),
  bn4_royal_we: S(RoyalWeScene, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true,
    sound: "snooze", source: "kingSafe", anchor: "cast",
  }),
  hx4_royal_lockdown: S(RoyalLockdownScene, {
    ordering: "octagon", staggerMs: 60, victims: "all", hasLead: true,
    sound: "clockcage", anchor: "board",
  }),
  hx4_tithe_of_silence: S(TitheOfSilenceRule, {
    ordering: "radial", staggerMs: 55, victims: "all", hasLead: true,
    sound: "clockice", anchor: "board",
  }),

  // --- mechanisms let go: something free-runs ---
  bn4_liberators_march: S(LiberatorsMarchRule, {
    ordering: "line", staggerMs: 55, victims: "all", hasLead: true,
    sound: "blitz", anchor: "board",
  }),
  bn4_escape_artist: S(EscapeArtistRule, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "blitz", anchor: "board",
  }),
  bn4_jubilee: S(JubileeRule, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true,
    sound: "snooze", anchor: "board",
  }),
  bn4_keys_to_the_city: S(KeysToTheCityRule, {
    ordering: "octagon", staggerMs: 50, victims: "all", hasLead: true,
    sound: "clockcage", anchor: "board",
  }),

  // --- mechanisms wound, bought or ratcheted forward ---
  bn4_royal_privilege: S(RoyalPrivilegeRule, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "blitz", anchor: "board",
  }),
  bn4_midas_charter: S(MidasCharterScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "blitz", anchor: "board",
  }),
  bn4_year_of_jubilee: S(YearOfJubileeRule, {
    ordering: "radial", staggerMs: 50, victims: "all", hasLead: true,
    sound: "snooze", anchor: "board",
  }),
  bn4_hundred_days: S(HundredDaysScene, {
    ordering: "sweep", staggerMs: 45, victims: "all", hasLead: true,
    sound: "blitz", anchor: "board",
  }),
  bn4_debtors_holiday: S(DebtorsHolidayRule, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "blitz", anchor: "board",
  }),
  bn4_crown_jubilee: S(CrownJubileeScene, {
    ordering: "radial", staggerMs: 55, victims: "all", hasLead: true,
    sound: "blitz", anchor: "board",
  }),

  // --- mechanisms that measure two sides against each other ---
  bn4_meek_inherit: S(MeekInheritRule, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true,
    sound: "snooze", anchor: "board",
  }),
  bn4_unequal_treaty: S(UnequalTreatyRule, {
    ordering: "line", staggerMs: 55, victims: "all", hasLead: true,
    sound: "clockcage", anchor: "board",
  }),
  bn4_grand_bargain: S(GrandBargainRule, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "clockcage", anchor: "board",
  }),
  bn4_patrons_favor: S(PatronsFavorScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "snooze", anchor: "board",
  }),

  // --- mechanisms tied to a body on the board ---
  bn4_queens_aegis: S(QueensAegisRule, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true,
    sound: "clockice", anchor: "board",
  }),
  bn4_masked_ball: S(MaskedBallScene, {
    ordering: "radial", staggerMs: 60, victims: ["n", "b"], hasLead: true,
    sound: "snooze", source: "shield", anchor: "cast",
  }),
  bn4_flag_on_their_wall: S(FlagOnTheirWallRule, {
    ordering: "line", staggerMs: 55, victims: "all", hasLead: true,
    sound: "clockcage", anchor: "board",
  }),
  bn4_siege_mentality: S(SiegeMentalityRule, {
    ordering: "radial", staggerMs: 50, victims: "all", hasLead: true,
    sound: "clockcage", anchor: "board",
  }),
  bn4_champions_rest: S(ChampionsRestRule, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "snooze", anchor: "board",
  }),

  // --- mechanisms on a cycle: phases, tides, seasons, dawns ---
  bn4_half_moon_charter: S(HalfMoonCharterRule, {
    ordering: "radial", staggerMs: 55, victims: "all", hasLead: true,
    sound: "clockice", anchor: "board",
  }),
  bn4_moonlit_reprieve: S(MoonlitReprieveRule, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true,
    sound: "clockice", anchor: "board",
  }),
  bn4_pact_of_the_dawn: S(PactOfTheDawnRule, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true,
    sound: "snooze", source: "frozen", anchor: "board",
  }),
  bn4_second_spring: S(SecondSpringRule, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true,
    sound: "clockice", anchor: "board",
  }),

  // --- mechanisms turned against the opponent ---
  hx4_debt_of_crowns: S(DebtOfCrownsScene, {
    ordering: "line", staggerMs: 60, victims: "all", hasLead: true,
    sound: "clockcage", anchor: "aim",
  }),
  hx4_last_toll: S(LastTollScene, {
    ordering: "line", staggerMs: 60, victims: "all", hasLead: true,
    sound: "clockcage", anchor: "board",
  }),
  ov_time_heist: S(TimeHeistScene, {
    ordering: "line", staggerMs: 55, victims: "all", hasLead: true,
    sound: "blitz", anchor: "board",
  }),
};

// Graft the per-card impact beat onto every lead scene (additive: the base
// scene renders unchanged inside the quake wrapper).
for (const [id, imp] of Object.entries(IMPACT)) {
  const play = PLAYS[id];
  if (play) play.Render = withImpact(play.Render, imp);
}
