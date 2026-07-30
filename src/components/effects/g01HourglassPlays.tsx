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
      <svg viewBox="0 0 40 40" className="block h-full w-full">
        {children}
      </svg>
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
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <path d="M20 6v14" stroke={C_CP.core} strokeWidth="2.4" {...SJ} />
          <circle cx="20" cy="26" r="6" fill={C_CP.deep} stroke={C_CP.core} strokeWidth="2.2" />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 210)}>
          <path d="M7 26h6M27 26h6" stroke={C_CP.glow} strokeWidth="3" {...SJ} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <path d="M20 7v14" stroke={C_CP.core} strokeWidth="2.6" {...SJ} />
          <circle cx="20" cy="27" r="7" fill={C_CP.deep} stroke={C_CP.core} strokeWidth="2.4" />
          <circle cx="20" cy="27" r="2.6" fill={C_CP.glow} />
        </g>
        <g className="g01-cp-jaw" style={sv(dm(delayMs, 200), { "--g01-mx": "40%" })}>
          <path d="M4 27h7M29 27h7" stroke={C_CP.glow} strokeWidth="3.4" {...SJ} />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 390)}>
          <circle cx="20" cy="22" r="14" fill="none" stroke={C_CP.core} strokeWidth="1.5" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(143,214,196,0.3)" delayMs={delayMs} />
      <P x={50} y={63} w={19} h={3.4} cls="g01-tell" style={{ background: C_CP.deep, borderRadius: "50%", ...dm(delayMs, 0) }} />
      <P x={50} y={46} w={15} h={27} cls="g01-cp-swing" style={dm(delayMs, 130)}>
        <svg viewBox="0 0 60 108" className="block h-full w-full">
          <path d="M30 4v62" stroke={C_CP.core} strokeWidth="5" {...SJ} />
          <circle cx="30" cy="82" r="17" fill={C_CP.deep} stroke={C_CP.core} strokeWidth="6" />
          <circle cx="30" cy="82" r="6" fill={C_CP.glow} />
        </svg>
      </P>
      <P x={41} y={58} w={8} h={8} cls="g01-cp-jaw" style={sv(dm(delayMs, 360), { "--g01-mx": "62%" })}>
        <svg viewBox="0 0 40 40" className="block h-full w-full">
          <path d="M6 12q12-5 24 2v14q-12 6-24-2z" fill={C_CP.glow} stroke={C_CP.deep} strokeWidth="3" {...SJ} />
        </svg>
      </P>
      <P x={59} y={58} w={8} h={8} cls="g01-cp-jaw" style={sv(dm(delayMs, 360), { "--g01-mx": "-62%" })}>
        <svg viewBox="0 0 40 40" className="block h-full w-full">
          <path d="M34 12q-12-5-24 2v14q12 6 24-2z" fill={C_CP.glow} stroke={C_CP.deep} strokeWidth="3" {...SJ} />
        </svg>
      </P>
      <P
        x={50}
        y={50}
        w={33}
        h={1.4}
        cls="g01-lean"
        style={sv({ background: C_CP.glow, ...dm(delayMs, 620) }, { "--g01-lean": "calc(var(--fx-side, 1) * -260%)" })}
      />
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
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <path d="M6 30q14-6 28 0" fill="none" stroke={C_CJ.deep} strokeWidth="3" {...SJ} />
          <circle cx="24" cy="27" r="4" fill={C_CJ.core} />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <path d="M20 22l3 8-3-2-3 2z" fill={C_CJ.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <path d="M8 32q10-14 24-16" fill="none" stroke={C_CJ.deep} strokeWidth="3.2" {...SJ} />
          <circle cx="30" cy="16" r="4.4" fill={C_CJ.core} />
        </g>
        <g className="g01-flash" style={dm(delayMs, 210)}>
          <circle cx="30" cy="16" r="7" fill="none" stroke={C_CJ.glow} strokeWidth="1.8" />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M12 12l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill={C_CJ.glow} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(255,200,97,0.3)" delayMs={delayMs} />
      <P x={50} y={64} w={30} h={2.4} cls="g01-tell" style={{ background: C_CJ.deep, borderRadius: "999px", ...dm(delayMs, 0) }} />
      <P x={50} y={62} w={30} h={4} cls="g01-cj-fuse" style={dm(delayMs, 140)}>
        <svg viewBox="0 0 200 24" className="block h-full w-full" preserveAspectRatio="none">
          <path d="M2 16q24-12 48 0t48 0 48 0 48 0" fill="none" stroke={C_CJ.core} strokeWidth="6" {...SJ} />
        </svg>
      </P>
      <P x={50} y={61} w={4} h={4} cls="g01-cj-ember" style={{ background: C_CJ.glow, borderRadius: "50%", ...dm(delayMs, 260) }} />
      {CJ_ROCKETS.map((r, i) => (
        <P
          key={i}
          x={r.x}
          y={58}
          w={3}
          h={9}
          cls="g01-fling"
          style={sv(dm(delayMs, 380 + i * 90), { "--g01-mx": r.mx, "--g01-my": r.my, "--g01-mr": r.mr })}
        >
          <svg viewBox="0 0 20 60" className="block h-full w-full">
            <path d="M10 2l6 16v34H4V18z" fill={C_CJ.core} stroke={C_CJ.deep} strokeWidth="3" {...SJ} />
          </svg>
        </P>
      ))}
      <P x={50} y={26} w={11} h={11} cls="g01-cj-catch" style={dm(delayMs, 660)}>
        <svg viewBox="0 0 60 60" className="block h-full w-full">
          <path d="M8 40l4-20 9 9 9-15 9 15 9-9 4 20z" fill={C_CJ.glow} stroke={C_CJ.deep} strokeWidth="4" {...SJ} />
        </svg>
      </P>
      <P
        x={50}
        y={44}
        w={26}
        h={1.6}
        cls="g01-lean"
        style={sv({ background: C_CJ.core, ...dm(delayMs, 760) }, { "--g01-lean": "calc(var(--fx-side, 1) * -300%)" })}
      />
    </Wide>
  );
}

/* =============================================================================
   3. Flag on Their Wall (t8) — THE SUNDIAL. Tell: the shadow trembles at the
   old hour. Strike: a flag is driven in as the gnomon and the shadow SNAPS
   round the dial toward the far rank. Settle: the hour numerals settle, and
   the shadow reaches on down the aim vector.
   ========================================================================== */

const C_FW = { core: "#e0b45c", glow: "#fff4d6", deep: "#33270c" };

function FlagOnTheirWallScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <path d="M14 34V8" stroke={C_FW.core} strokeWidth="3" {...SJ} />
          <path d="M14 9h14l-4 5 4 5H14z" fill={C_FW.core} stroke={C_FW.deep} strokeWidth="1.8" {...SJ} />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <path d="M14 33l16-7" stroke={C_FW.deep} strokeWidth="4" {...SJ} opacity="0.8" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <circle cx="20" cy="24" r="12" fill="none" stroke={C_FW.core} strokeWidth="2.2" />
          <path d="M20 24V10" stroke={C_FW.glow} strokeWidth="2.6" {...SJ} />
        </g>
        <g className="g01-fw-snap" style={dm(delayMs, 220)}>
          <path d="M20 24l10 5" stroke={C_FW.deep} strokeWidth="3.4" {...SJ} />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <circle cx="20" cy="24" r="16" fill="none" stroke={C_FW.core} strokeWidth="1.4" strokeDasharray="3 3" />
        </g>
      </Sq>
    );
  return (
    <Aim>
      <Wash tint="rgba(224,180,92,0.28)" delayMs={delayMs} />
      <P x={50} y={54} w={22} h={22} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <circle cx="50" cy="50" r="44" fill="none" stroke={C_FW.core} strokeWidth="4" />
          <path d="M50 6v8M94 50h-8M50 94v-8M6 50h8" stroke={C_FW.core} strokeWidth="5" {...SJ} />
        </svg>
      </P>
      <P x={50} y={54} w={20} h={4} cls="g01-fw-snap" style={dm(delayMs, 170)}>
        <svg viewBox="0 0 100 20" className="block h-full w-full" preserveAspectRatio="none">
          <path d="M0 4h100v12H0z" fill={C_FW.deep} opacity="0.85" />
        </svg>
      </P>
      <P x={50} y={47} w={7} h={17} cls="g01-fw-flag" style={dm(delayMs, 320)}>
        <svg viewBox="0 0 40 100" className="block h-full w-full">
          <path d="M12 98V6" stroke={C_FW.glow} strokeWidth="6" {...SJ} />
          <path d="M12 8h24l-7 10 7 10H12z" fill={C_FW.core} stroke={C_FW.deep} strokeWidth="4" {...SJ} />
        </svg>
      </P>
      <P
        x={62}
        y={54}
        w={24}
        h={2}
        cls="g01-reach"
        style={sv({ background: C_FW.deep, transformOrigin: "0% 50%", ...dm(delayMs, 520) }, { "--g01-len": "calc(var(--fx-len, 3) / 3)" })}
      />
      <Drift color={C_FW.glow} delayMs={delayMs + 660} n={4} />
    </Aim>
  );
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
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <path d="M20 32L13 8h14z" fill={C_GA.deep} stroke={C_GA.core} strokeWidth="2.2" {...SJ} />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <path d="M6 20h28" stroke={C_GA.glow} strokeWidth="3.4" {...SJ} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <path d="M20 34L12 8h16z" fill={C_GA.deep} stroke={C_GA.core} strokeWidth="2.4" {...SJ} />
        </g>
        <g className="g01-ga-arm" style={dm(delayMs, 210)}>
          <path d="M20 30V9" stroke={C_GA.glow} strokeWidth="2.6" {...SJ} />
          <rect x="17" y="16" width="6" height="4" fill={C_GA.core} />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 390)}>
          <path d="M5 34h30" stroke={C_GA.core} strokeWidth="2" {...SJ} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(159,198,232,0.28)" delayMs={delayMs} />
      <Band color="rgba(20,39,58,0.5)" delayMs={delayMs + 40} y={66} h={5} />
      {[41, 59].map((x, i) => (
        <P key={i} x={x} y={56} w={13} h={20} cls="g01-pop" style={dm(delayMs, 120)}>
          <svg viewBox="0 0 60 100" className="block h-full w-full">
            <path d="M30 6L6 94h48z" fill={C_GA.deep} stroke={C_GA.core} strokeWidth="6" {...SJ} />
          </svg>
        </P>
      ))}
      {[41, 59].map((x, i) => (
        <P
          key={i}
          x={x}
          y={54}
          w={4}
          h={17}
          cls="g01-ga-arm"
          style={sv(dm(delayMs, 200), { "--g01-a": i === 0 ? "17deg" : "-17deg" })}
        >
          <svg viewBox="0 0 20 90" className="block h-full w-full">
            <path d="M10 88V4" stroke={C_GA.glow} strokeWidth="5" {...SJ} />
            <rect x="3" y="26" width="14" height="9" fill={C_GA.core} />
          </svg>
        </P>
      ))}
      <P x={50} y={42} w={34} h={3.4} cls="g01-ga-bar" style={dm(delayMs, 400)}>
        <svg viewBox="0 0 200 20" className="block h-full w-full" preserveAspectRatio="none">
          <rect x="0" y="3" width="200" height="14" fill={C_GA.core} stroke={C_GA.deep} strokeWidth="3" />
        </svg>
      </P>
      <P
        x={50}
        y={50}
        w={30}
        h={1.4}
        cls="g01-lean"
        style={sv({ background: C_GA.glow, ...dm(delayMs, 640) }, { "--g01-lean": "calc(var(--fx-side, 1) * -240%)" })}
      />
      <Drift color={C_GA.glow} delayMs={delayMs + 700} n={4} />
    </Wide>
  );
}

/* =============================================================================
   5. Hundred-Year Lease (t8) — THE WATER CLOCK BUNGED. Tell: the last drip
   swells at the spout. Strike: a stoppered bung on a chain is driven home and
   the drip stops dead. Settle: the held level glows and refuses to fall.
   ========================================================================== */

const C_HL = { core: "#69c3d8", glow: "#eafaff", deep: "#0e2c36" };

function HundredYearLeaseScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <path d="M12 6h16v18a8 8 0 0 1-16 0z" fill={C_HL.deep} stroke={C_HL.core} strokeWidth="2.2" {...SJ} />
          <path d="M13 18h14" stroke={C_HL.core} strokeWidth="2.6" />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 210)}>
          <circle cx="20" cy="33" r="3.2" fill={C_HL.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <path d="M11 5h18v20a9 9 0 0 1-18 0z" fill={C_HL.deep} stroke={C_HL.core} strokeWidth="2.4" {...SJ} />
        </g>
        <g className="g01-hl-plug" style={dm(delayMs, 210)}>
          <rect x="16" y="28" width="8" height="7" fill={C_HL.glow} stroke={C_HL.deep} strokeWidth="1.8" />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M11 20h18" stroke={C_HL.core} strokeWidth="2.4" {...SJ} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(105,195,216,0.28)" delayMs={delayMs} />
      <P x={50} y={62} w={5} h={5} cls="g01-tell" style={{ background: C_HL.glow, borderRadius: "50%", ...dm(delayMs, 0) }} />
      <P x={50} y={50} w={18} h={24} cls="g01-pop" style={dm(delayMs, 130)}>
        <svg viewBox="0 0 80 110" className="block h-full w-full">
          <path d="M12 6h56v66a28 28 0 0 1-56 0z" fill={C_HL.deep} stroke={C_HL.core} strokeWidth="6" {...SJ} />
          <path d="M14 56h52" stroke={C_HL.core} strokeWidth="5" />
        </svg>
      </P>
      <P x={50} y={64} w={6} h={9} cls="g01-hl-plug" style={dm(delayMs, 330)}>
        <svg viewBox="0 0 30 46" className="block h-full w-full">
          <path d="M6 44V12h18v32z" fill={C_HL.glow} stroke={C_HL.deep} strokeWidth="4" {...SJ} />
          <path d="M15 12V2" stroke={C_HL.core} strokeWidth="4" {...SJ} />
        </svg>
      </P>
      <P x={50} y={51} w={16} h={1.8} cls="g01-hl-level" style={{ background: C_HL.core, ...dm(delayMs, 520) }} />
      <P
        x={50}
        y={44}
        w={26}
        h={1.4}
        cls="g01-lean"
        style={sv({ background: C_HL.glow, ...dm(delayMs, 660) }, { "--g01-lean": "calc(var(--fx-side, 1) * -280%)" })}
      />
      <Drift color={C_HL.glow} delayMs={delayMs + 720} n={4} />
    </Wide>
  );
}

/* =============================================================================
   6. Liberator's March (t8) — THE ESCAPEMENT FREED. Tell: the pallet grinds
   against the tooth it is holding. Strike: the pallet lifts clear and the
   escape wheel FREE-RUNS, teeth streaming past down the march vector. Settle:
   the pallet drops back and one last tooth clicks.
   ========================================================================== */

const C_LM = { core: "#d5b978", glow: "#fff4d6", deep: "#2e2410" };

function LiberatorsMarchScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <circle cx="20" cy="20" r="11" fill="none" stroke={C_LM.core} strokeWidth="2.6" strokeDasharray="3 3.4" />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <path d="M20 6l4 6h-8z" fill={C_LM.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <circle cx="20" cy="22" r="12" fill={C_LM.deep} stroke={C_LM.core} strokeWidth="2.4" strokeDasharray="3.4 3.6" />
        </g>
        <g className="g01-lm-pallet" style={dm(delayMs, 210)}>
          <path d="M8 6l8 8-4 5-8-7z" fill={C_LM.glow} stroke={C_LM.deep} strokeWidth="1.6" {...SJ} />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <circle cx="20" cy="22" r="16" fill="none" stroke={C_LM.core} strokeWidth="1.4" />
        </g>
      </Sq>
    );
  return (
    <Aim>
      <Wash tint="rgba(213,185,120,0.26)" delayMs={delayMs} />
      <P x={44} y={52} w={20} h={20} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <circle cx="50" cy="50" r="42" fill={C_LM.deep} stroke={C_LM.core} strokeWidth="5" strokeDasharray="9 8" />
          <circle cx="50" cy="50" r="9" fill={C_LM.core} />
        </svg>
      </P>
      <P x={44} y={52} w={20} h={20} cls="g01-lm-wheel" style={dm(delayMs, 180)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <circle cx="50" cy="50" r="42" fill="none" stroke={C_LM.core} strokeWidth="5" strokeDasharray="9 8" />
          <path d="M50 12v12M88 50H76M50 88V76M12 50h12" stroke={C_LM.glow} strokeWidth="5" {...SJ} />
        </svg>
      </P>
      <P x={44} y={38} w={9} h={9} cls="g01-lm-pallet" style={dm(delayMs, 300)}>
        <svg viewBox="0 0 50 50" className="block h-full w-full">
          <path d="M4 6l22 16-8 12-20-14z" fill={C_LM.glow} stroke={C_LM.deep} strokeWidth="4" {...SJ} />
        </svg>
      </P>
      {[0, 1, 2, 3].map((i) => (
        <P
          key={i}
          x={58}
          y={52}
          w={3.4}
          h={3.4}
          cls="g01-fling"
          style={sv(dm(delayMs, 420 + i * 80), { "--g01-mx": `${200 + i * 90}%`, "--g01-my": "0%", "--g01-mr": "180deg" })}
        >
          <svg viewBox="0 0 20 20" className="block h-full w-full">
            <path d="M10 2l7 16H3z" fill={C_LM.core} stroke={C_LM.deep} strokeWidth="2" {...SJ} />
          </svg>
        </P>
      ))}
      <P
        x={62}
        y={52}
        w={22}
        h={1.6}
        cls="g01-reach"
        style={sv({ background: C_LM.glow, transformOrigin: "0% 50%", ...dm(delayMs, 700) }, { "--g01-len": "calc(var(--fx-len, 3) / 3)" })}
      />
    </Aim>
  );
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
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <path d="M8 14h24c0 11-5 17-12 17S8 25 8 14z" fill={C_MB.core} stroke={C_MB.deep} strokeWidth="2.2" {...SJ} />
          <ellipse cx="15" cy="20" rx="2.6" ry="2" fill={C_MB.deep} />
          <ellipse cx="25" cy="20" rx="2.6" ry="2" fill={C_MB.deep} />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 210)}>
          <path d="M8 34q12 5 24 0" fill="none" stroke={C_MB.glow} strokeWidth="2.6" {...SJ} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <rect x="9" y="10" width="22" height="22" fill={C_MB.deep} stroke={C_MB.core} strokeWidth="2.4" />
          <path d="M20 10v22" stroke={C_MB.core} strokeWidth="2" />
        </g>
        <g className="g01-mb-door" style={dm(delayMs, 210)}>
          <path d="M9 10h11v22H9z" fill={C_MB.core} opacity="0.9" />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M13 21h14c0 6-3 9-7 9s-7-3-7-9z" fill={C_MB.glow} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(197,143,214,0.3)" delayMs={delayMs} />
      <P x={50} y={52} w={22} h={22} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <path d="M50 4l40 26v66H10V30z" fill={C_MB.deep} stroke={C_MB.core} strokeWidth="6" {...SJ} />
        </svg>
      </P>
      <P x={44} y={52} w={9} h={16} cls="g01-mb-door" style={sv(dm(delayMs, 170), { "--g01-a": "-84deg", "--g01-mx": "-52%" })}>
        <svg viewBox="0 0 40 80" className="block h-full w-full">
          <rect x="2" y="2" width="36" height="76" fill={C_MB.core} stroke={C_MB.deep} strokeWidth="4" />
        </svg>
      </P>
      <P x={56} y={52} w={9} h={16} cls="g01-mb-door" style={sv(dm(delayMs, 170), { "--g01-a": "84deg", "--g01-mx": "52%" })}>
        <svg viewBox="0 0 40 80" className="block h-full w-full">
          <rect x="2" y="2" width="36" height="76" fill={C_MB.core} stroke={C_MB.deep} strokeWidth="4" />
        </svg>
      </P>
      <P x={50} y={52} w={16} h={10} cls="g01-mb-turn" style={dm(delayMs, 340)}>
        <svg viewBox="0 0 80 50" className="block h-full w-full">
          <path d="M8 18h26c0 16-6 24-13 24S8 34 8 18z" fill={C_MB.glow} stroke={C_MB.deep} strokeWidth="4" {...SJ} />
          <path d="M46 18h26c0 16-6 24-13 24s-13-8-13-24z" fill={C_MB.core} stroke={C_MB.deep} strokeWidth="4" {...SJ} />
        </svg>
      </P>
      <P
        x={50}
        y={68}
        w={22}
        h={2}
        cls="g01-lean"
        style={sv({ background: C_MB.glow, ...dm(delayMs, 620) }, { "--g01-lean": "calc(var(--fx-side, 1) * -180%)" })}
      />
      <Drift color={C_MB.glow} delayMs={delayMs + 700} n={4} />
    </Wide>
  );
}

/* =============================================================================
   8. The Meek Inherit (t8) — THE DRIVING WEIGHTS. A weight clock only runs
   while a weight still has somewhere to fall. Tell: both chains creak. Strike:
   the LIGHT weight sinks and the train turns; the heavy one is already on the
   floor. Settle: the beam tips level and the train stalls.
   ========================================================================== */

const C_MI = { core: "#a8b8a0", glow: "#f6f2df", deep: "#1f2a1c" };

function MeekInheritScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <path d="M20 4v18" stroke={C_MI.core} strokeWidth="2.2" strokeDasharray="2.4 2.4" />
          <path d="M14 22h12l3 12H11z" fill={C_MI.deep} stroke={C_MI.core} strokeWidth="2" {...SJ} />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 210)}>
          <path d="M6 36h28" stroke={C_MI.glow} strokeWidth="2.6" {...SJ} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <path d="M13 6h14l4 14H9z" fill={C_MI.deep} stroke={C_MI.core} strokeWidth="2.4" {...SJ} />
        </g>
        <g className="g01-mi-weight" style={dm(delayMs, 220)}>
          <path d="M15 20h10l3 13H12z" fill={C_MI.core} stroke={C_MI.deep} strokeWidth="2" {...SJ} />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M7 35h26" stroke={C_MI.glow} strokeWidth="2.2" {...SJ} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(168,184,160,0.26)" delayMs={delayMs} />
      <Band color="rgba(31,42,28,0.5)" delayMs={delayMs + 40} y={70} h={4} />
      <P x={50} y={38} w={26} h={3} cls="g01-tell" style={{ background: C_MI.deep, ...dm(delayMs, 0) }} />
      <P x={42} y={54} w={3} h={30} style={{ background: C_MI.core, opacity: 0.6 }} />
      <P x={58} y={54} w={3} h={30} style={{ background: C_MI.core, opacity: 0.6 }} />
      <P x={42} y={62} w={9} h={11} cls="g01-mi-weight" style={sv(dm(delayMs, 180), { "--g01-dy": "150%" })}>
        <svg viewBox="0 0 44 54" className="block h-full w-full">
          <path d="M10 4h24l8 46H2z" fill={C_MI.glow} stroke={C_MI.deep} strokeWidth="4" {...SJ} />
        </svg>
      </P>
      <P x={58} y={66} w={11} h={13} cls="g01-pop" style={dm(delayMs, 140)}>
        <svg viewBox="0 0 54 64" className="block h-full w-full">
          <path d="M12 4h30l10 56H2z" fill={C_MI.deep} stroke={C_MI.core} strokeWidth="4" {...SJ} />
        </svg>
      </P>
      <P x={50} y={38} w={22} h={22} cls="g01-mi-train" style={dm(delayMs, 380)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <circle cx="50" cy="50" r="34" fill="none" stroke={C_MI.glow} strokeWidth="5" strokeDasharray="7 9" />
          <path d="M50 22v28l18 10" fill="none" stroke={C_MI.core} strokeWidth="5" {...SJ} />
        </svg>
      </P>
      <P
        x={50}
        y={46}
        w={28}
        h={1.4}
        cls="g01-lean"
        style={sv({ background: C_MI.glow, ...dm(delayMs, 640) }, { "--g01-lean": "calc(var(--fx-side, 1) * -220%)" })}
      />
      <Drift color={C_MI.glow} delayMs={delayMs + 700} n={4} />
    </Wide>
  );
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
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <circle cx="20" cy="18" r="8" fill={C_MC.core} stroke={C_MC.deep} strokeWidth="2.2" />
          <path d="M20 13v10" stroke={C_MC.deep} strokeWidth="2.4" {...SJ} />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <path d="M10 32h20" stroke={C_MC.glow} strokeWidth="3" {...SJ} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <rect x="11" y="12" width="18" height="24" fill={C_MC.deep} stroke={C_MC.core} strokeWidth="2.4" />
          <rect x="16" y="16" width="8" height="3" fill={C_MC.core} />
        </g>
        <g className="g01-mc-token" style={dm(delayMs, 210)}>
          <circle cx="20" cy="7" r="5" fill={C_MC.glow} stroke={C_MC.deep} strokeWidth="1.8" />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M13 28h14" stroke={C_MC.core} strokeWidth="2.4" {...SJ} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(242,193,75,0.3)" delayMs={delayMs} />
      <P x={50} y={56} w={17} h={24} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 80 110" className="block h-full w-full">
          <rect x="6" y="10" width="68" height="94" fill={C_MC.deep} stroke={C_MC.core} strokeWidth="6" />
          <rect x="32" y="18" width="16" height="6" fill={C_MC.core} />
        </svg>
      </P>
      <P x={50} y={38} w={5} h={5} cls="g01-mc-token" style={{ background: C_MC.glow, borderRadius: "50%", ...dm(delayMs, 170) }} />
      <P x={50} y={56} w={13} h={13} cls="g01-mc-dial" style={dm(delayMs, 360)}>
        <svg viewBox="0 0 60 60" className="block h-full w-full">
          <circle cx="30" cy="30" r="25" fill="none" stroke={C_MC.glow} strokeWidth="5" />
          <path d="M30 30V9" stroke={C_MC.core} strokeWidth="6" {...SJ} />
        </svg>
      </P>
      {[0, 1].map((i) => (
        <P
          key={i}
          x={50}
          y={68}
          w={6}
          h={4}
          cls="g01-fling"
          style={sv(dm(delayMs, 560 + i * 90), { "--g01-mx": i === 0 ? "-190%" : "190%", "--g01-my": "170%", "--g01-mr": i === 0 ? "-40deg" : "40deg", background: C_MC.deep })}
        />
      ))}
      <P
        x={50}
        y={44}
        w={26}
        h={1.6}
        cls="g01-lean"
        style={sv({ background: C_MC.core, ...dm(delayMs, 700) }, { "--g01-lean": "calc(var(--fx-side, 1) * -250%)" })}
      />
      <Drift color={C_MC.glow} delayMs={delayMs + 760} n={4} />
    </Wide>
  );
}

/* =============================================================================
   10. Pact of the Dawn (t8) — DAWN CALLED EARLY. Tell: the weathervane
   cockerel turns into the wind. Strike: the night band is dragged off the
   board and the sun disc is forced up over the horizon. Settle: the crow rolls
   out in rings and the first light leans away from the caster.
   ========================================================================== */

const C_PD = { core: "#ffab5e", glow: "#fff3d8", deep: "#2b1a3c" };

function PactOfTheDawnScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <circle cx="20" cy="24" r="9" fill={C_PD.core} />
          <path d="M6 33h28" stroke={C_PD.deep} strokeWidth="3" {...SJ} />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <path d="M20 8v5M9 12l3 4M31 12l-3 4" stroke={C_PD.glow} strokeWidth="2.6" {...SJ} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <path d="M14 33V13l6-6 4 5 6 2-5 5v14z" fill={C_PD.deep} stroke={C_PD.core} strokeWidth="2.2" {...SJ} />
        </g>
        <g className="g01-pd-crow" style={dm(delayMs, 210)}>
          <path d="M28 12q6-3 9 1" fill="none" stroke={C_PD.glow} strokeWidth="2.4" {...SJ} />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <circle cx="20" cy="22" r="15" fill="none" stroke={C_PD.core} strokeWidth="1.6" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(255,171,94,0.3)" delayMs={delayMs} />
      <BoardFrame>
        <span
          className="g01-pd-night absolute block"
          style={{ left: 0, top: 0, width: "100%", height: "56%", background: "rgba(43,26,60,0.72)", animationDelay: `${delayMs}ms` }}
        />
      </BoardFrame>
      <Band color="rgba(255,171,94,0.55)" delayMs={delayMs + 120} y={54} h={2.4} />
      <P x={50} y={41} w={11} h={20} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 54 100" className="block h-full w-full">
          <path d="M22 96V34L34 8l6 16 12 6-14 10v56z" fill={C_PD.deep} stroke={C_PD.core} strokeWidth="5" {...SJ} />
        </svg>
      </P>
      <P x={50} y={56} w={19} h={19} cls="g01-pd-sun" style={dm(delayMs, 260)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <circle cx="50" cy="50" r="30" fill={C_PD.core} stroke={C_PD.glow} strokeWidth="5" />
        </svg>
      </P>
      <P x={50} y={41} w={26} h={12} cls="g01-pd-crow" style={dm(delayMs, 420)}>
        <svg viewBox="0 0 120 56" className="block h-full w-full">
          <path d="M18 28q22-18 44 0t44 0" fill="none" stroke={C_PD.glow} strokeWidth="5" {...SJ} />
        </svg>
      </P>
      <P
        x={50}
        y={62}
        w={30}
        h={1.6}
        cls="g01-lean"
        style={sv({ background: C_PD.glow, ...dm(delayMs, 660) }, { "--g01-lean": "calc(var(--fx-side, 1) * -300%)" })}
      />
      <Drift color={C_PD.glow} delayMs={delayMs + 720} n={4} />
    </Wide>
  );
}

/* =============================================================================
   11. Queen's Aegis (t8) — THE ORRERY. Tell: the brass arm shudders on its
   collar. Strike: the queen-planet swings a full orbit and the gear train
   under it turns with her. Settle: she is locked into the ring, and while she
   sits in it the whole train holds its rhythm.
   ========================================================================== */

const C_QA = { core: "#7fb8e6", glow: "#eef6ff", deep: "#132437" };

function QueensAegisScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <circle cx="20" cy="20" r="12" fill="none" stroke={C_QA.core} strokeWidth="2.4" />
          <circle cx="32" cy="20" r="4" fill={C_QA.glow} />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <circle cx="20" cy="20" r="4.6" fill={C_QA.core} stroke={C_QA.deep} strokeWidth="1.8" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <ellipse cx="20" cy="22" rx="15" ry="7" fill="none" stroke={C_QA.core} strokeWidth="2.2" />
          <circle cx="20" cy="22" r="5" fill={C_QA.deep} stroke={C_QA.core} strokeWidth="2" />
        </g>
        <g className="g01-qa-orbit" style={dm(delayMs, 210)}>
          <circle cx="34" cy="22" r="3.6" fill={C_QA.glow} />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M13 9l3 5 4-6 4 6 3-5" fill="none" stroke={C_QA.core} strokeWidth="2" {...SJ} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(127,184,230,0.28)" delayMs={delayMs} />
      <Rim color="rgba(127,184,230,0.5)" delayMs={delayMs + 60} />
      <P x={50} y={52} w={26} h={13} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 130 66" className="block h-full w-full">
          <ellipse cx="65" cy="33" rx="60" ry="27" fill="none" stroke={C_QA.core} strokeWidth="5" />
        </svg>
      </P>
      <P x={50} y={52} w={9} h={9} cls="g01-pop" style={dm(delayMs, 150)}>
        <svg viewBox="0 0 50 50" className="block h-full w-full">
          <circle cx="25" cy="25" r="18" fill={C_QA.deep} stroke={C_QA.core} strokeWidth="5" />
          <path d="M12 20l4 8 9-12 9 12 4-8" fill="none" stroke={C_QA.glow} strokeWidth="4" {...SJ} />
        </svg>
      </P>
      <P x={50} y={52} w={26} h={13} cls="g01-qa-orbit" style={dm(delayMs, 300)}>
        <span className="absolute block" style={{ left: "92%", top: "34%", width: "16%", height: "32%", borderRadius: "50%", background: C_QA.glow }} />
      </P>
      <P x={38} y={64} w={10} h={10} cls="g01-qa-gear" style={dm(delayMs, 460)}>
        <svg viewBox="0 0 50 50" className="block h-full w-full">
          <circle cx="25" cy="25" r="19" fill="none" stroke={C_QA.core} strokeWidth="6" strokeDasharray="6 6" />
        </svg>
      </P>
      <P x={62} y={64} w={8} h={8} cls="g01-qa-gear" style={dm(delayMs, 540)}>
        <svg viewBox="0 0 50 50" className="block h-full w-full">
          <circle cx="25" cy="25" r="19" fill="none" stroke={C_QA.glow} strokeWidth="6" strokeDasharray="6 6" />
        </svg>
      </P>
      <P
        x={50}
        y={44}
        w={24}
        h={1.4}
        cls="g01-lean"
        style={sv({ background: C_QA.glow, ...dm(delayMs, 680) }, { "--g01-lean": "calc(var(--fx-side, 1) * -240%)" })}
      />
    </Wide>
  );
}

/* =============================================================================
   12. Royal Privilege (t8) — THE WINDING KEY. Tell: the key seats itself on
   the square arbor. Strike: two hard turns, and the mainspring coil visibly
   tightens under them. Settle: the ratchet clicks back a tooth and the two
   bought turns glow on the barrel.
   ========================================================================== */

const C_RP = { core: "#d9a3e6", glow: "#fff2e8", deep: "#2b1436" };

function RoyalPrivilegeScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <circle cx="20" cy="20" r="6" fill="none" stroke={C_RP.core} strokeWidth="3" />
          <path d="M20 26v10M16 32h8" stroke={C_RP.core} strokeWidth="3" {...SJ} />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 210)}>
          <circle cx="20" cy="20" r="12" fill="none" stroke={C_RP.glow} strokeWidth="2" strokeDasharray="3 4" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <circle cx="20" cy="14" r="7" fill="none" stroke={C_RP.core} strokeWidth="3" />
          <path d="M20 21v13M15 29h10" stroke={C_RP.core} strokeWidth="3" {...SJ} />
        </g>
        <g className="g01-rp-key" style={dm(delayMs, 220)}>
          <circle cx="20" cy="14" r="3" fill={C_RP.glow} />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <circle cx="20" cy="22" r="15" fill="none" stroke={C_RP.core} strokeWidth="1.5" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(217,163,230,0.28)" delayMs={delayMs} />
      <P x={50} y={52} w={22} h={22} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <circle cx="50" cy="50" r="44" fill={C_RP.deep} stroke={C_RP.core} strokeWidth="5" />
        </svg>
      </P>
      <P x={50} y={52} w={18} h={18} cls="g01-rp-coil" style={dm(delayMs, 180)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <path
            d="M50 12a38 38 0 1 1-26 66 30 30 0 1 0 20-52 22 22 0 1 1 14 40"
            fill="none"
            stroke={C_RP.glow}
            strokeWidth="5"
            {...SJ}
          />
        </svg>
      </P>
      <P x={50} y={52} w={10} h={16} cls="g01-rp-key" style={dm(delayMs, 340)}>
        <svg viewBox="0 0 50 80" className="block h-full w-full">
          <circle cx="25" cy="20" r="14" fill="none" stroke={C_RP.core} strokeWidth="7" />
          <path d="M25 34v40M14 62h22" stroke={C_RP.core} strokeWidth="7" {...SJ} />
        </svg>
      </P>
      {[0, 1].map((i) => (
        <P
          key={i}
          x={50}
          y={52}
          w={4}
          h={4}
          cls="g01-fling"
          style={sv(dm(delayMs, 540 + i * 110), { "--g01-mx": i === 0 ? "-330%" : "330%", "--g01-my": "-190%", "--g01-mr": "180deg", background: C_RP.glow, borderRadius: "50%" })}
        />
      ))}
      <P
        x={50}
        y={44}
        w={24}
        h={1.4}
        cls="g01-lean"
        style={sv({ background: C_RP.core, ...dm(delayMs, 700) }, { "--g01-lean": "calc(var(--fx-side, 1) * -260%)" })}
      />
    </Wide>
  );
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
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <circle cx="12" cy="10" r="6" fill={C_RW.core} stroke={C_RW.deep} strokeWidth="2" />
          <circle cx="28" cy="10" r="6" fill={C_RW.core} stroke={C_RW.deep} strokeWidth="2" />
          <circle cx="20" cy="24" r="10" fill={C_RW.deep} stroke={C_RW.core} strokeWidth="2.2" />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 210)}>
          <path d="M14 24l3-6 3 4 3-4 3 6z" fill={C_RW.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <circle cx="11" cy="11" r="7" fill={C_RW.deep} stroke={C_RW.core} strokeWidth="2.4" />
          <circle cx="29" cy="11" r="7" fill={C_RW.deep} stroke={C_RW.core} strokeWidth="2.4" />
          <circle cx="20" cy="26" r="11" fill={C_RW.deep} stroke={C_RW.core} strokeWidth="2.4" />
        </g>
        <g className="g01-rw-crown" style={dm(delayMs, 220)}>
          <path d="M13 12l2-6 5 4 5-4 2 6z" fill={C_RW.glow} stroke={C_RW.deep} strokeWidth="1.6" {...SJ} />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M20 22v-5" stroke={C_RW.core} strokeWidth="2.4" {...SJ} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(232,196,106,0.28)" delayMs={delayMs} />
      <P x={50} y={62} w={20} h={3.4} cls="g01-tell" style={{ background: C_RW.deep, borderRadius: "50%", ...dm(delayMs, 0) }} />
      <P x={42} y={44} w={11} h={11} cls="g01-pop" style={dm(delayMs, 130)}>
        <svg viewBox="0 0 50 50" className="block h-full w-full">
          <circle cx="25" cy="25" r="21" fill={C_RW.deep} stroke={C_RW.core} strokeWidth="6" />
        </svg>
      </P>
      <P x={58} y={44} w={11} h={11} cls="g01-pop" style={dm(delayMs, 130)}>
        <svg viewBox="0 0 50 50" className="block h-full w-full">
          <circle cx="25" cy="25" r="21" fill={C_RW.deep} stroke={C_RW.core} strokeWidth="6" />
        </svg>
      </P>
      <P x={50} y={41} w={4} h={12} cls="g01-rw-hammer" style={dm(delayMs, 240)}>
        <svg viewBox="0 0 20 60" className="block h-full w-full">
          <path d="M10 58V16" stroke={C_RW.core} strokeWidth="5" {...SJ} />
          <circle cx="10" cy="10" r="8" fill={C_RW.core} />
        </svg>
      </P>
      <P x={50} y={41} w={12} h={9} cls="g01-rw-crown" style={dm(delayMs, 400)}>
        <svg viewBox="0 0 60 44" className="block h-full w-full">
          <path d="M6 38L10 8l10 10 10-14 10 14 10-10 4 30z" fill={C_RW.glow} stroke={C_RW.deep} strokeWidth="4" {...SJ} />
        </svg>
      </P>
      <P
        x={50}
        y={54}
        w={26}
        h={1.6}
        cls="g01-lean"
        style={sv({ background: C_RW.glow, ...dm(delayMs, 640) }, { "--g01-lean": "calc(var(--fx-side, 1) * -230%)" })}
      />
      <Drift color={C_RW.glow} delayMs={delayMs + 700} n={4} />
    </Wide>
  );
}

/* =============================================================================
   14. Siege Mentality (t8) — THE WATCH DRUM. Tell: the drumhead trembles under
   the raised stick. Strike: the stick comes down, and three notches are burned
   into the rim, one per turn bought back. Settle: the head rings itself flat
   and the notches cool.
   ========================================================================== */

const C_SM = { core: "#d98a5a", glow: "#ffe9cf", deep: "#331a0e" };

function SiegeMentalityScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <ellipse cx="20" cy="20" rx="13" ry="8" fill={C_SM.deep} stroke={C_SM.core} strokeWidth="2.4" />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <path d="M12 32l16-20" stroke={C_SM.glow} strokeWidth="3" {...SJ} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <ellipse cx="20" cy="17" rx="14" ry="8" fill={C_SM.deep} stroke={C_SM.core} strokeWidth="2.4" />
          <path d="M6 17v8a14 8 0 0 0 28 0v-8" fill={C_SM.deep} stroke={C_SM.core} strokeWidth="2.4" {...SJ} />
        </g>
        <g className="g01-sm-stick" style={dm(delayMs, 210)}>
          <path d="M30 4L18 15" stroke={C_SM.glow} strokeWidth="3.2" {...SJ} />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <ellipse cx="20" cy="17" rx="17" ry="10" fill="none" stroke={C_SM.core} strokeWidth="1.6" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(217,138,90,0.28)" delayMs={delayMs} />
      <P x={50} y={58} w={24} h={16} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 120 80" className="block h-full w-full">
          <ellipse cx="60" cy="24" rx="54" ry="20" fill={C_SM.deep} stroke={C_SM.core} strokeWidth="6" />
          <path d="M6 24v28a54 20 0 0 0 108 0V24" fill={C_SM.deep} stroke={C_SM.core} strokeWidth="6" {...SJ} />
          <path d="M14 30l18 26M46 22l18 32M78 22l18 30" stroke={C_SM.core} strokeWidth="4" {...SJ} />
        </svg>
      </P>
      <P x={62} y={40} w={18} h={16} cls="g01-sm-stick" style={dm(delayMs, 160)}>
        <svg viewBox="0 0 90 80" className="block h-full w-full">
          <path d="M84 6L22 66" stroke={C_SM.glow} strokeWidth="8" {...SJ} />
          <circle cx="20" cy="68" r="9" fill={C_SM.glow} />
        </svg>
      </P>
      {[0, 1, 2].map((i) => (
        <P
          key={i}
          x={42 + i * 8}
          y={52}
          w={2.6}
          h={5}
          cls="g01-sm-notch"
          style={{ background: C_SM.glow, animationDelay: `calc(${delayMs + 380}ms + var(--fx-index, 0) * 40ms + ${i * 90}ms)` }}
        />
      ))}
      <P x={50} y={58} w={30} h={20} cls="g01-flash" style={dm(delayMs, 360)}>
        <svg viewBox="0 0 140 90" className="block h-full w-full">
          <ellipse cx="70" cy="30" rx="64" ry="24" fill="none" stroke={C_SM.glow} strokeWidth="5" />
        </svg>
      </P>
      <Drift color={C_SM.glow} delayMs={delayMs + 660} n={4} />
    </Wide>
  );
}

/* =============================================================================
   15. The Unequal Treaty (t8) — TWO CANDLE CLOCKS. Tell: both wicks catch at
   once, honestly enough. Strike: the flames take, and the near candle is a
   head taller than the far one — ten hours against three. Settle: the short
   one gutters out first and its wax sags over the shelf.
   ========================================================================== */

const C_UT = { core: "#f0a05a", glow: "#fff2d2", deep: "#2f1a0c" };

function UnequalTreatyScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <rect x="16" y="14" width="8" height="22" fill={C_UT.glow} stroke={C_UT.deep} strokeWidth="2" />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <path d="M20 12c3-4 0-6 0-8-2 3-4 4-4 6a4 4 0 0 0 8 0" fill={C_UT.core} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <rect x="11" y="12" width="7" height="24" fill={C_UT.glow} stroke={C_UT.deep} strokeWidth="2" />
          <rect x="23" y="20" width="7" height="16" fill={C_UT.glow} stroke={C_UT.deep} strokeWidth="2" />
        </g>
        <g className="g01-ut-flame-a" style={dm(delayMs, 210)}>
          <path d="M14.5 11c2-3 0-5 0-6-1 2-3 3-3 5a3 3 0 0 0 6 0" fill={C_UT.core} />
          <path d="M26.5 19c2-3 0-5 0-6-1 2-3 3-3 5a3 3 0 0 0 6 0" fill={C_UT.core} />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M6 36h28" stroke={C_UT.core} strokeWidth="2.2" {...SJ} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(240,160,90,0.3)" delayMs={delayMs} />
      <Band color="rgba(47,26,12,0.6)" delayMs={delayMs + 40} y={68} h={3.4} />
      <P x={43} y={56} w={7} h={24} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 34 110" className="block h-full w-full">
          <rect x="4" y="6" width="26" height="100" fill={C_UT.glow} stroke={C_UT.deep} strokeWidth="5" />
          <path d="M8 30h22M8 52h22M8 74h22" stroke={C_UT.deep} strokeWidth="3" />
        </svg>
      </P>
      <P x={57} y={62} w={7} h={13} cls="g01-pop" style={dm(delayMs, 120)}>
        <svg viewBox="0 0 34 62" className="block h-full w-full">
          <rect x="4" y="6" width="26" height="52" fill={C_UT.glow} stroke={C_UT.deep} strokeWidth="5" />
          <path d="M8 26h22" stroke={C_UT.deep} strokeWidth="3" />
        </svg>
      </P>
      <P x={43} y={42} w={4.6} h={6} cls="g01-ut-flame-a" style={dm(delayMs, 230)}>
        <svg viewBox="0 0 24 32" className="block h-full w-full">
          <path d="M12 2c6 8 2 11 2 14a6 6 0 0 1-12 0c0-5 6-6 10-14z" fill={C_UT.core} />
        </svg>
      </P>
      <P x={57} y={53} w={4.6} h={6} cls="g01-ut-flame-b" style={dm(delayMs, 300)}>
        <svg viewBox="0 0 24 32" className="block h-full w-full">
          <path d="M12 2c6 8 2 11 2 14a6 6 0 0 1-12 0c0-5 6-6 10-14z" fill={C_UT.core} />
        </svg>
      </P>
      <P
        x={57}
        y={68}
        w={9}
        h={3}
        cls="g01-lean"
        style={sv({ background: C_UT.glow, borderRadius: "50%", ...dm(delayMs, 640) }, { "--g01-lean": "calc(var(--fx-side, 1) * -120%)" })}
      />
      <Drift color={C_UT.glow} delayMs={delayMs + 700} n={4} />
    </Wide>
  );
}

/* =============================================================================
   16. Year of Jubilee (t8) — THE CALENDAR WHEEL. Tell: the pawl lifts off the
   toothed rim. Settle it and nothing moves; lift it and the wheel is free.
   Strike: eighteen notches ratchet past under a ribbon marker. Settle: the
   pawl drops back into a new tooth and the ribbon lies down.
   ========================================================================== */

const C_YJ = { core: "#8ed6a0", glow: "#f0ffe8", deep: "#123322" };

function YearOfJubileeScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <circle cx="20" cy="20" r="12" fill="none" stroke={C_YJ.core} strokeWidth="3" strokeDasharray="2.6 4" />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <path d="M20 5v9" stroke={C_YJ.glow} strokeWidth="3.4" {...SJ} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <circle cx="20" cy="22" r="13" fill={C_YJ.deep} stroke={C_YJ.core} strokeWidth="2.6" strokeDasharray="3 4.4" />
        </g>
        <g className="g01-yj-pawl" style={dm(delayMs, 220)}>
          <path d="M20 4l4 8h-8z" fill={C_YJ.glow} stroke={C_YJ.deep} strokeWidth="1.6" {...SJ} />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M20 22v-8" stroke={C_YJ.core} strokeWidth="2.4" {...SJ} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(142,214,160,0.28)" delayMs={delayMs} />
      <Rim color="rgba(142,214,160,0.45)" delayMs={delayMs + 60} />
      <P x={50} y={54} w={24} h={24} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <circle cx="50" cy="50" r="44" fill={C_YJ.deep} stroke={C_YJ.core} strokeWidth="5" strokeDasharray="6 9" />
        </svg>
      </P>
      <P x={50} y={54} w={20} h={20} cls="g01-yj-wheel" style={dm(delayMs, 170)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <circle cx="50" cy="50" r="38" fill="none" stroke={C_YJ.glow} strokeWidth="5" strokeDasharray="5 8" />
          <path d="M50 14v18M86 50H68M50 86V68M14 50h18" stroke={C_YJ.core} strokeWidth="5" {...SJ} />
        </svg>
      </P>
      <P x={50} y={38} w={7} h={8} cls="g01-yj-pawl" style={dm(delayMs, 300)}>
        <svg viewBox="0 0 40 44" className="block h-full w-full">
          <path d="M20 42L6 8h28z" fill={C_YJ.glow} stroke={C_YJ.deep} strokeWidth="4" {...SJ} />
        </svg>
      </P>
      <P x={50} y={54} w={5} h={22} cls="g01-yj-ribbon" style={dm(delayMs, 460)}>
        <svg viewBox="0 0 26 110" className="block h-full w-full">
          <path d="M4 2h18v88l-9-10-9 10z" fill={C_YJ.core} stroke={C_YJ.deep} strokeWidth="4" {...SJ} />
        </svg>
      </P>
      <P
        x={50}
        y={44}
        w={26}
        h={1.4}
        cls="g01-lean"
        style={sv({ background: C_YJ.glow, ...dm(delayMs, 660) }, { "--g01-lean": "calc(var(--fx-side, 1) * -250%)" })}
      />
    </Wide>
  );
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
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <rect x="6" y="17" width="28" height="7" fill={C_DC.core} stroke={C_DC.deep} strokeWidth="2" />
          <path d="M12 17v7M18 17v7M24 17v7" stroke={C_DC.deep} strokeWidth="1.8" />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <path d="M20 10v20" stroke={C_DC.glow} strokeWidth="2.6" {...SJ} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <rect x="5" y="18" width="30" height="8" fill={C_DC.core} stroke={C_DC.deep} strokeWidth="2.2" />
        </g>
        <g className="g01-dc-notch" style={dm(delayMs, 210)}>
          <path d="M13 18v8M20 18v8M27 18v8" stroke={C_DC.deep} strokeWidth="2.2" />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M20 8l3 6-3-1-3 1z" fill={C_DC.glow} />
        </g>
      </Sq>
    );
  return (
    <Aim>
      <Wash tint="rgba(201,160,106,0.26)" delayMs={delayMs} />
      <P x={50} y={52} w={30} h={5} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 200 32" className="block h-full w-full" preserveAspectRatio="none">
          <rect x="2" y="6" width="196" height="20" fill={C_DC.core} stroke={C_DC.deep} strokeWidth="4" />
          <path d="M30 6v20M56 6v20M82 6v20M118 6v20M144 6v20M170 6v20" stroke={C_DC.deep} strokeWidth="4" />
        </svg>
      </P>
      <P x={50} y={46} w={7} h={8} cls="g01-dc-notch" style={dm(delayMs, 160)}>
        <svg viewBox="0 0 40 44" className="block h-full w-full">
          <path d="M4 4l32 22-6 10L2 14z" fill={C_DC.glow} stroke={C_DC.deep} strokeWidth="4" {...SJ} />
        </svg>
      </P>
      <P x={38} y={52} w={16} h={5} cls="g01-dc-snap" style={sv(dm(delayMs, 340), { "--g01-mr": "-26deg", "--g01-mx": "-70%" })}>
        <svg viewBox="0 0 100 32" className="block h-full w-full" preserveAspectRatio="none">
          <path d="M2 6h96l-14 10 14 10H2z" fill={C_DC.core} stroke={C_DC.deep} strokeWidth="4" {...SJ} />
        </svg>
      </P>
      <P x={62} y={52} w={16} h={5} cls="g01-dc-snap" style={sv(dm(delayMs, 340), { "--g01-mr": "26deg", "--g01-mx": "120%" })}>
        <svg viewBox="0 0 100 32" className="block h-full w-full" preserveAspectRatio="none">
          <path d="M98 6H2l14 10L2 26h96z" fill={C_DC.glow} stroke={C_DC.deep} strokeWidth="4" {...SJ} />
        </svg>
      </P>
      <P
        x={62}
        y={52}
        w={22}
        h={1.6}
        cls="g01-reach"
        style={sv({ background: C_DC.glow, transformOrigin: "0% 50%", ...dm(delayMs, 620) }, { "--g01-len": "calc(var(--fx-len, 3) / 3)" })}
      />
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
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <path d="M20 8c7 0 10 6 10 13v7H10v-7c0-7 3-13 10-13z" fill={C_LT.deep} stroke={C_LT.core} strokeWidth="2.2" {...SJ} />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <circle cx="20" cy="31" r="3" fill={C_LT.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <path d="M20 7c8 0 11 7 11 15v8H9v-8C9 14 12 7 20 7z" fill={C_LT.deep} stroke={C_LT.core} strokeWidth="2.4" {...SJ} />
        </g>
        <g className="g01-lt-clapper" style={dm(delayMs, 210)}>
          <circle cx="20" cy="32" r="3.4" fill={C_LT.glow} />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M5 35h30" stroke={C_LT.core} strokeWidth="2.2" {...SJ} />
        </g>
      </Sq>
    );
  return (
    <Aim>
      <Wash tint="rgba(196,180,143,0.28)" delayMs={delayMs} />
      <P x={44} y={40} w={3} h={22} cls="g01-tell" style={{ background: C_LT.core, ...dm(delayMs, 0) }} />
      <P x={44} y={56} w={17} h={16} cls="g01-lt-bell" style={dm(delayMs, 150)}>
        <svg viewBox="0 0 90 84" className="block h-full w-full">
          <path d="M45 6c26 0 32 22 32 44v26H13V50C13 28 19 6 45 6z" fill={C_LT.deep} stroke={C_LT.core} strokeWidth="6" {...SJ} />
          <path d="M8 76h74" stroke={C_LT.core} strokeWidth="6" {...SJ} />
        </svg>
      </P>
      <P x={44} y={68} w={4} h={5} cls="g01-lt-clapper" style={{ background: C_LT.glow, borderRadius: "50%", ...dm(delayMs, 320) }} />
      {[0, 1].map((i) => (
        <P key={i} x={58} y={56} w={16} h={16} cls="g01-lt-wave" style={dm(delayMs, 420 + i * 150)}>
          <svg viewBox="0 0 80 80" className="block h-full w-full">
            <path d="M18 8q26 32 0 64" fill="none" stroke={C_LT.glow} strokeWidth="6" {...SJ} />
            <path d="M40 2q34 38 0 76" fill="none" stroke={C_LT.core} strokeWidth="5" {...SJ} />
          </svg>
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
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <path d="M8 6v28M16 6v28M24 6v28M32 6v28M6 16h28M6 26h28" stroke={C_RL.core} strokeWidth="2.4" />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 210)}>
          <path d="M20 20V10M20 20l7 5" stroke={C_RL.glow} strokeWidth="2.6" {...SJ} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <circle cx="20" cy="21" r="13" fill={C_RL.deep} stroke={C_RL.core} strokeWidth="2.4" />
          <path d="M20 21V12M20 21l6 5" stroke={C_RL.glow} strokeWidth="2.4" {...SJ} />
        </g>
        <g className="g01-rl-gate" style={dm(delayMs, 220)}>
          <path d="M11 5v30M20 5v30M29 5v30" stroke={C_RL.core} strokeWidth="2.6" />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M5 35h30" stroke={C_RL.glow} strokeWidth="2.4" {...SJ} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(143,154,168,0.3)" delayMs={delayMs} />
      <P x={50} y={52} w={24} h={24} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <circle cx="50" cy="50" r="44" fill={C_RL.deep} stroke={C_RL.core} strokeWidth="6" />
          <path d="M50 12v8M88 50h-8M50 88v-8M12 50h8" stroke={C_RL.core} strokeWidth="5" {...SJ} />
        </svg>
      </P>
      <P x={50} y={52} w={17} h={17} cls="g01-rl-hand" style={dm(delayMs, 170)}>
        <svg viewBox="0 0 80 80" className="block h-full w-full">
          <path d="M40 40V14M40 40l20 12" fill="none" stroke={C_RL.glow} strokeWidth="6" {...SJ} />
          <circle cx="40" cy="40" r="5" fill={C_RL.glow} />
        </svg>
      </P>
      <P x={50} y={50} w={30} h={30} cls="g01-rl-gate" style={dm(delayMs, 330)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full" preserveAspectRatio="none">
          <path d="M14 0v100M32 0v100M50 0v100M68 0v100M86 0v100" stroke={C_RL.core} strokeWidth="7" />
          <path d="M0 26h100M0 62h100" stroke={C_RL.core} strokeWidth="6" />
          <path d="M14 100l6-10M32 100l6-10M50 100l6-10M68 100l6-10M86 100l6-10" stroke={C_RL.core} strokeWidth="6" {...SJ} />
        </svg>
      </P>
      <P x={50} y={44} w={26} h={1.4} cls="g01-lean" style={sv({ background: C_RL.glow, ...dm(delayMs, 620) }, { "--g01-lean": "calc(var(--fx-side, 1) * -230%)" })} />
      <Drift color={C_RL.glow} delayMs={delayMs + 700} n={4} />
    </Wide>
  );
}

/* =============================================================================
   20. Tithe of Silence (t8) — THE MUFFLED CLAPPER. Tell: the clapper draws
   back to strike. Strike: a wrapped cloth is bound round it and the blow lands
   on wool: the bell shakes hard and nothing comes out. Settle: two taxed
   shouts leave as flattened, silent rings.
   ========================================================================== */

const C_TS = { core: "#9fb0c9", glow: "#f4f0e4", deep: "#171f2c" };

function TitheOfSilenceScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <path d="M20 9c7 0 10 6 10 13v6H10v-6c0-7 3-13 10-13z" fill={C_TS.deep} stroke={C_TS.core} strokeWidth="2.2" {...SJ} />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <path d="M8 8l24 24" stroke={C_TS.glow} strokeWidth="3" {...SJ} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <path d="M20 6c8 0 12 7 12 16v8H8v-8c0-9 4-16 12-16z" fill={C_TS.deep} stroke={C_TS.core} strokeWidth="2.4" {...SJ} />
        </g>
        <g className="g01-ts-cloth" style={dm(delayMs, 220)}>
          <path d="M12 28q8 7 16 0l3 5q-11 8-22 0z" fill={C_TS.glow} stroke={C_TS.deep} strokeWidth="1.6" {...SJ} />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M7 9l26 26" stroke={C_TS.core} strokeWidth="2.2" {...SJ} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(159,176,201,0.3)" delayMs={delayMs} />
      <P x={50} y={50} w={19} h={19} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 90 90" className="block h-full w-full">
          <path d="M45 8c24 0 30 20 30 42v24H15V50C15 28 21 8 45 8z" fill={C_TS.deep} stroke={C_TS.core} strokeWidth="6" {...SJ} />
        </svg>
      </P>
      <P x={50} y={60} w={5} h={9} cls="g01-ts-shake" style={dm(delayMs, 160)}>
        <svg viewBox="0 0 26 46" className="block h-full w-full">
          <path d="M13 2v26" stroke={C_TS.core} strokeWidth="5" {...SJ} />
          <circle cx="13" cy="36" r="8" fill={C_TS.core} />
        </svg>
      </P>
      <P x={50} y={62} w={13} h={7} cls="g01-ts-cloth" style={dm(delayMs, 340)}>
        <svg viewBox="0 0 70 36" className="block h-full w-full">
          <path d="M6 8q29 16 58 0l6 14q-35 20-70 0z" fill={C_TS.glow} stroke={C_TS.deep} strokeWidth="4" {...SJ} />
        </svg>
      </P>
      {[0, 1].map((i) => (
        <P key={i} x={50} y={50} w={26} h={8} cls="g01-ts-mute" style={dm(delayMs, 500 + i * 130)}>
          <svg viewBox="0 0 130 40" className="block h-full w-full" preserveAspectRatio="none">
            <ellipse cx="65" cy="20" rx="62" ry="16" fill="none" stroke={C_TS.glow} strokeWidth="4" strokeDasharray="8 10" />
          </svg>
        </P>
      ))}
      <P x={50} y={42} w={24} h={1.4} cls="g01-lean" style={sv({ background: C_TS.glow, ...dm(delayMs, 700) }, { "--g01-lean": "calc(var(--fx-side, 1) * -260%)" })} />
    </Wide>
  );
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
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <rect x="6" y="12" width="28" height="16" fill={C_TH.deep} stroke={C_TH.core} strokeWidth="2.2" />
          <path d="M9 15h3M15 15h3M21 15h3M27 15h3" stroke={C_TH.core} strokeWidth="2.4" />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <path d="M20 8v24" stroke={C_TH.glow} strokeWidth="2.6" strokeDasharray="3 3" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <rect x="5" y="10" width="30" height="20" fill={C_TH.deep} stroke={C_TH.core} strokeWidth="2.4" />
          <path d="M8 13h3M14 13h3M20 13h3M26 13h3M8 27h3M14 27h3M20 27h3M26 27h3" stroke={C_TH.core} strokeWidth="2.2" />
        </g>
        <g className="g01-th-slip" style={dm(delayMs, 220)}>
          <rect x="16" y="15" width="9" height="10" fill={C_TH.glow} />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M5 20h30" stroke={C_TH.glow} strokeWidth="1.8" strokeDasharray="3 4" />
        </g>
      </Sq>
    );
  return (
    <Aim>
      <Wash tint="rgba(113,214,192,0.28)" delayMs={delayMs} />
      <P x={50} y={52} w={34} h={10} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 200 60" className="block h-full w-full" preserveAspectRatio="none">
          <rect x="0" y="4" width="200" height="52" fill={C_TH.deep} stroke={C_TH.core} strokeWidth="4" />
          <path d="M10 10h10M34 10h10M58 10h10M82 10h10M106 10h10M130 10h10M154 10h10M178 10h10" stroke={C_TH.core} strokeWidth="6" />
          <path d="M10 50h10M34 50h10M58 50h10M82 50h10M106 50h10M130 50h10M154 50h10M178 50h10" stroke={C_TH.core} strokeWidth="6" />
        </svg>
      </P>
      <P x={50} y={52} w={7} h={7} cls="g01-th-slip" style={sv(dm(delayMs, 180), { "--g01-mx": "-40%" })}>
        <svg viewBox="0 0 40 40" className="block h-full w-full">
          <rect x="2" y="2" width="36" height="36" fill={C_TH.glow} stroke={C_TH.deep} strokeWidth="4" />
        </svg>
      </P>
      <P x={40} y={52} w={13} h={7} cls="g01-th-frame" style={sv(dm(delayMs, 340), { "--g01-mx": "34%" })} >
        <svg viewBox="0 0 70 40" className="block h-full w-full" preserveAspectRatio="none">
          <rect x="2" y="2" width="66" height="36" fill="none" stroke={C_TH.core} strokeWidth="5" />
        </svg>
      </P>
      <P x={62} y={52} w={13} h={7} cls="g01-th-frame" style={sv(dm(delayMs, 340), { "--g01-mx": "-34%" })}>
        <svg viewBox="0 0 70 40" className="block h-full w-full" preserveAspectRatio="none">
          <rect x="2" y="2" width="66" height="36" fill="none" stroke={C_TH.core} strokeWidth="5" />
        </svg>
      </P>
      <P x={66} y={52} w={22} h={1.6} cls="g01-reach" style={sv({ background: C_TH.glow, transformOrigin: "0% 50%", ...dm(delayMs, 620) }, { "--g01-len": "calc(var(--fx-len, 3) / 3)" })} />
      <Drift color={C_TH.glow} delayMs={delayMs + 700} n={4} />
    </Aim>
  );
}

/* =============================================================================
   22. Champion's Rest (t7) — THE HAMMOCK ON THE HANDS. Tell: the hands take
   the first sag of a weight they were never built for. Strike: a hammock is
   slung between hour and minute, someone gets in, and both hands bow down and
   stop. Settle: the whole rig sways twice and dozes.
   ========================================================================== */

const C_CR = { core: "#86c2a6", glow: "#f4ffe9", deep: "#152e24" };

function ChampionsRestScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <circle cx="20" cy="20" r="12" fill="none" stroke={C_CR.core} strokeWidth="2.4" />
          <path d="M10 18q10 12 20 0" fill="none" stroke={C_CR.glow} strokeWidth="3" {...SJ} />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <path d="M24 8l4-3M28 12l5-2" stroke={C_CR.glow} strokeWidth="2.4" {...SJ} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <circle cx="20" cy="21" r="13" fill={C_CR.deep} stroke={C_CR.core} strokeWidth="2.4" />
        </g>
        <g className="g01-cr-sag" style={dm(delayMs, 220)}>
          <path d="M10 17q10 13 20 0" fill="none" stroke={C_CR.glow} strokeWidth="3.2" {...SJ} />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M26 9q4-4 7-2" fill="none" stroke={C_CR.core} strokeWidth="2.2" {...SJ} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(134,194,166,0.28)" delayMs={delayMs} />
      <Rim color="rgba(134,194,166,0.42)" delayMs={delayMs + 60} />
      <P x={50} y={52} w={24} h={24} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <circle cx="50" cy="50" r="44" fill={C_CR.deep} stroke={C_CR.core} strokeWidth="5" />
          <path d="M50 10v7M90 50h-7M50 90v-7M10 50h7" stroke={C_CR.core} strokeWidth="5" {...SJ} />
        </svg>
      </P>
      <P x={50} y={52} w={19} h={19} cls="g01-cr-hands" style={dm(delayMs, 150)}>
        <svg viewBox="0 0 90 90" className="block h-full w-full">
          <path d="M45 45L20 34M45 45l26-9" fill="none" stroke={C_CR.glow} strokeWidth="6" {...SJ} />
          <circle cx="45" cy="45" r="5" fill={C_CR.glow} />
        </svg>
      </P>
      <P x={50} y={50} w={20} h={9} cls="g01-cr-sag" style={dm(delayMs, 320)}>
        <svg viewBox="0 0 100 46" className="block h-full w-full">
          <path d="M4 6q46 44 92 0" fill="none" stroke={C_CR.glow} strokeWidth="7" {...SJ} />
          <path d="M22 22q24 16 48-2" fill="none" stroke={C_CR.core} strokeWidth="5" {...SJ} />
        </svg>
      </P>
      <P x={58} y={40} w={7} h={7} cls="g01-flash" style={dm(delayMs, 520)}>
        <svg viewBox="0 0 40 40" className="block h-full w-full">
          <path d="M8 30h14L8 14h14" fill="none" stroke={C_CR.glow} strokeWidth="4" {...SJ} />
        </svg>
      </P>
      <P x={50} y={64} w={26} h={1.4} cls="g01-lean" style={sv({ background: C_CR.glow, ...dm(delayMs, 660) }, { "--g01-lean": "calc(var(--fx-side, 1) * -200%)" })} />
    </Wide>
  );
}

/* =============================================================================
   23. Debtor's Holiday (t7) — CLOCKING OFF. Tell: the time card is squared up
   against the slot. Strike: the punch clock BITES, stamps the hour, and the
   card is pulled clean out of the rack. Settle: the empty slot is left dark
   and two paper chads drift down.
   ========================================================================== */

const C_DH = { core: "#e6d27a", glow: "#fff8dd", deep: "#302a0d" };

function DebtorsHolidayScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <rect x="12" y="6" width="16" height="24" fill={C_DH.glow} stroke={C_DH.deep} strokeWidth="2" />
          <path d="M15 12h10M15 17h10" stroke={C_DH.deep} strokeWidth="1.8" />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <rect x="15" y="22" width="10" height="5" fill={C_DH.core} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <rect x="8" y="14" width="24" height="20" fill={C_DH.deep} stroke={C_DH.core} strokeWidth="2.4" />
          <rect x="14" y="18" width="12" height="4" fill={C_DH.core} />
        </g>
        <g className="g01-dh-card" style={dm(delayMs, 220)}>
          <rect x="15" y="2" width="10" height="14" fill={C_DH.glow} stroke={C_DH.deep} strokeWidth="1.8" />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M8 36h24" stroke={C_DH.core} strokeWidth="2.2" {...SJ} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(230,210,122,0.28)" delayMs={delayMs} />
      <P x={50} y={58} w={20} h={17} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 100 84" className="block h-full w-full">
          <rect x="6" y="10" width="88" height="68" fill={C_DH.deep} stroke={C_DH.core} strokeWidth="6" />
          <rect x="34" y="18" width="32" height="8" fill={C_DH.core} />
          <circle cx="50" cy="52" r="14" fill="none" stroke={C_DH.core} strokeWidth="5" />
        </svg>
      </P>
      <P x={50} y={42} w={9} h={14} cls="g01-dh-card" style={dm(delayMs, 170)}>
        <svg viewBox="0 0 46 70" className="block h-full w-full">
          <rect x="3" y="3" width="40" height="64" fill={C_DH.glow} stroke={C_DH.deep} strokeWidth="4" />
          <path d="M9 16h28M9 26h28M9 36h28" stroke={C_DH.deep} strokeWidth="3" />
        </svg>
      </P>
      <P x={50} y={51} w={13} h={5} cls="g01-dh-punch" style={dm(delayMs, 340)}>
        <svg viewBox="0 0 70 26" className="block h-full w-full" preserveAspectRatio="none">
          <rect x="2" y="2" width="66" height="22" fill={C_DH.core} stroke={C_DH.deep} strokeWidth="4" />
        </svg>
      </P>
      {[0, 1].map((i) => (
        <P key={i} x={46 + i * 8} y={56} w={2.4} h={2.4} cls="g01-fling" style={sv(dm(delayMs, 520 + i * 100), { "--g01-mx": i === 0 ? "-150%" : "160%", "--g01-my": "260%", "--g01-mr": "140deg", background: C_DH.glow })} />
      ))}
      <P x={50} y={44} w={24} h={1.4} cls="g01-lean" style={sv({ background: C_DH.glow, ...dm(delayMs, 680) }, { "--g01-lean": "calc(var(--fx-side, 1) * -240%)" })} />
    </Wide>
  );
}

/* =============================================================================
   24. Escape Artist (t7) — THE WATCH SLIPS ITS CUFF. Tell: the shackle
   tightens on the case and the chain snaps straight. Strike: the pocket watch
   twists free of the cuff and drops, swinging on its own chain. Settle: the
   empty cuff spins shut on nothing and the watch keeps ticking.
   ========================================================================== */

const C_EA = { core: "#e3a3a3", glow: "#fff0e4", deep: "#31161c" };

function EscapeArtistScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <circle cx="20" cy="22" r="10" fill={C_EA.deep} stroke={C_EA.core} strokeWidth="2.4" />
          <path d="M20 22v-6" stroke={C_EA.glow} strokeWidth="2.4" {...SJ} />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <path d="M13 8a7 7 0 0 1 14 0" fill="none" stroke={C_EA.core} strokeWidth="3" {...SJ} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <circle cx="20" cy="24" r="11" fill={C_EA.deep} stroke={C_EA.core} strokeWidth="2.4" />
          <path d="M20 24v-7M20 24l5 3" stroke={C_EA.glow} strokeWidth="2.2" {...SJ} />
        </g>
        <g className="g01-ea-cuff" style={dm(delayMs, 220)}>
          <path d="M12 9a8 8 0 0 1 16 0" fill="none" stroke={C_EA.glow} strokeWidth="3.4" {...SJ} />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M20 6V2" stroke={C_EA.core} strokeWidth="2.4" {...SJ} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(227,163,163,0.28)" delayMs={delayMs} />
      <P x={50} y={36} w={3} h={13} cls="g01-tell" style={{ background: C_EA.core, ...dm(delayMs, 0) }} />
      <P x={50} y={44} w={11} h={7} cls="g01-ea-cuff" style={dm(delayMs, 160)}>
        <svg viewBox="0 0 56 36" className="block h-full w-full">
          <path d="M6 32a22 22 0 0 1 44 0" fill="none" stroke={C_EA.glow} strokeWidth="8" {...SJ} />
        </svg>
      </P>
      <P x={50} y={56} w={15} h={15} cls="g01-ea-slip" style={dm(delayMs, 300)}>
        <svg viewBox="0 0 70 70" className="block h-full w-full">
          <circle cx="35" cy="38" r="28" fill={C_EA.deep} stroke={C_EA.core} strokeWidth="6" />
          <path d="M35 38V20M35 38l13 8" fill="none" stroke={C_EA.glow} strokeWidth="5" {...SJ} />
          <rect x="30" y="2" width="10" height="8" fill={C_EA.core} />
        </svg>
      </P>
      <P x={50} y={44} w={12} h={7} cls="g01-flash" style={dm(delayMs, 460)}>
        <svg viewBox="0 0 60 36" className="block h-full w-full">
          <path d="M8 30a22 22 0 0 1 44 0" fill="none" stroke={C_EA.core} strokeWidth="6" strokeDasharray="7 8" {...SJ} />
        </svg>
      </P>
      <P x={50} y={68} w={24} h={1.4} cls="g01-lean" style={sv({ background: C_EA.glow, ...dm(delayMs, 640) }, { "--g01-lean": "calc(var(--fx-side, 1) * -220%)" })} />
      <Drift color={C_EA.glow} delayMs={delayMs + 700} n={4} />
    </Wide>
  );
}

/* =============================================================================
   25. The Grand Bargain (t7) — HOURS ON THE SCALES. Tell: the beam rocks as
   the first weight is set down. Strike: fourteen stamped hour-weights are
   stacked into the near pan until the beam slams over. Settle: three cards are
   fanned into the far pan and one is lifted out.
   ========================================================================== */

const C_GB = { core: "#c9b2f0", glow: "#f6f0ff", deep: "#221a3a" };

function GrandBargainScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <path d="M6 14h28M20 14v18" stroke={C_GB.core} strokeWidth="2.6" {...SJ} />
          <path d="M4 16l6 8H2zM30 16l6 8h-8z" fill={C_GB.deep} stroke={C_GB.core} strokeWidth="1.8" {...SJ} />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <rect x="16" y="6" width="8" height="6" fill={C_GB.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <path d="M6 15h28M20 15v17" stroke={C_GB.core} strokeWidth="2.8" {...SJ} />
          <path d="M3 17l7 9H-4z" fill={C_GB.deep} stroke={C_GB.core} strokeWidth="1.8" {...SJ} />
        </g>
        <g className="g01-gb-weight" style={dm(delayMs, 220)}>
          <path d="M14 4h12l3 9H11z" fill={C_GB.glow} stroke={C_GB.deep} strokeWidth="1.8" {...SJ} />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M12 34h16" stroke={C_GB.core} strokeWidth="2.4" {...SJ} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(201,178,240,0.28)" delayMs={delayMs} />
      <P x={50} y={58} w={4} h={18} style={{ background: C_GB.core, opacity: 0.7 }} />
      <P x={50} y={44} w={32} h={3} cls="g01-gb-tip" style={{ background: C_GB.core, ...dm(delayMs, 160), transformOrigin: "50% 50%" }} />
      <P x={50} y={50} w={30} h={4} cls="g01-tell" style={{ background: C_GB.deep, borderRadius: "999px", ...dm(delayMs, 0) }} />
      {[0, 1, 2].map((i) => (
        <P key={i} x={36} y={42 - i * 4} w={8} h={4} cls="g01-gb-weight" style={sv(dm(delayMs, 280 + i * 110), { "--g01-dy": "-260%" })}>
          <svg viewBox="0 0 40 20" className="block h-full w-full" preserveAspectRatio="none">
            <path d="M8 2h24l6 16H2z" fill={C_GB.glow} stroke={C_GB.deep} strokeWidth="3" {...SJ} />
          </svg>
        </P>
      ))}
      <P x={64} y={54} w={16} h={11} cls="g01-gb-keep" style={dm(delayMs, 600)}>
        <svg viewBox="0 0 80 56" className="block h-full w-full">
          <rect x="4" y="14" width="22" height="34" rx="1" fill={C_GB.deep} stroke={C_GB.core} strokeWidth="4" transform="rotate(-14 15 31)" />
          <rect x="29" y="10" width="22" height="34" rx="1" fill={C_GB.glow} stroke={C_GB.deep} strokeWidth="4" />
          <rect x="54" y="14" width="22" height="34" rx="1" fill={C_GB.deep} stroke={C_GB.core} strokeWidth="4" transform="rotate(14 65 31)" />
        </svg>
      </P>
      <P x={50} y={68} w={26} h={1.4} cls="g01-lean" style={sv({ background: C_GB.glow, ...dm(delayMs, 720) }, { "--g01-lean": "calc(var(--fx-side, 1) * -210%)" })} />
    </Wide>
  );
}

/* =============================================================================
   26. Half-Moon Charter (t7) — THE PHASE SHUTTER. Tell: the silvered disc
   behind the aperture starts to creep. Strike: the shutter swings and takes
   exactly half the moon away; light, dark, light, dark, on alternate turns.
   Settle: the terminator line holds dead centre and the charter's two skipped
   drafts drop out as dark coins.
   ========================================================================== */

const C_HM = { core: "#b9c9e8", glow: "#f6f2e0", deep: "#141a2e" };

function HalfMoonCharterScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <circle cx="20" cy="20" r="11" fill={C_HM.glow} stroke={C_HM.deep} strokeWidth="2" />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <path d="M20 9a11 11 0 0 1 0 22z" fill={C_HM.deep} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <circle cx="20" cy="21" r="12" fill={C_HM.glow} stroke={C_HM.core} strokeWidth="2.2" />
        </g>
        <g className="g01-hm-shutter" style={dm(delayMs, 220)}>
          <path d="M20 9a12 12 0 0 1 0 24z" fill={C_HM.deep} />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <circle cx="20" cy="21" r="16" fill="none" stroke={C_HM.core} strokeWidth="1.5" strokeDasharray="4 4" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(185,201,232,0.28)" delayMs={delayMs} />
      <Rim color="rgba(185,201,232,0.4)" delayMs={delayMs + 60} />
      <P x={50} y={52} w={22} h={22} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full"><circle cx="50" cy="50" r="42" fill={C_HM.glow} stroke={C_HM.core} strokeWidth="5" /></svg>
      </P>
      <P x={50} y={52} w={22} h={22} cls="g01-hm-shutter" style={dm(delayMs, 190)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full"><path d="M50 8a42 42 0 0 1 0 84z" fill={C_HM.deep} /></svg>
      </P>
      <P x={50} y={52} w={1.8} h={22} cls="g01-hm-phase" style={{ background: C_HM.core, ...dm(delayMs, 360) }} />
      {[0, 1].map((i) => (
        <P key={i} x={42 + i * 16} y={68} w={6} h={6} cls="g01-fling" style={sv(dm(delayMs, 520 + i * 110), { "--g01-mx": i === 0 ? "-130%" : "140%", "--g01-my": "220%", "--g01-mr": "160deg", background: C_HM.deep, borderRadius: "50%" })} />
      ))}
      <P x={50} y={40} w={26} h={1.4} cls="g01-lean" style={sv({ background: C_HM.glow, ...dm(delayMs, 680) }, { "--g01-lean": "calc(var(--fx-side, 1) * -240%)" })} />
    </Wide>
  );
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
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <rect x="9" y="10" width="22" height="22" fill={C_HD.glow} stroke={C_HD.deep} strokeWidth="2" />
          <rect x="9" y="10" width="22" height="6" fill={C_HD.core} />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <path d="M9 22h22" stroke={C_HD.deep} strokeWidth="2.4" strokeDasharray="3 3" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <rect x="8" y="12" width="24" height="22" fill={C_HD.glow} stroke={C_HD.deep} strokeWidth="2.2" />
          <rect x="8" y="12" width="24" height="7" fill={C_HD.core} />
        </g>
        <g className="g01-hd-leaf" style={dm(delayMs, 220)}>
          <rect x="11" y="4" width="18" height="10" fill={C_HD.glow} stroke={C_HD.deep} strokeWidth="1.8" />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M14 26h12" stroke={C_HD.core} strokeWidth="2.6" {...SJ} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(229,143,122,0.28)" delayMs={delayMs} />
      <P x={50} y={58} w={19} h={19} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <rect x="8" y="10" width="84" height="82" fill={C_HD.glow} stroke={C_HD.deep} strokeWidth="6" />
          <rect x="8" y="10" width="84" height="22" fill={C_HD.core} />
          <path d="M30 4v12M70 4v12" stroke={C_HD.deep} strokeWidth="6" {...SJ} />
        </svg>
      </P>
      <P x={50} y={50} w={19} h={7} cls="g01-hd-tear" style={dm(delayMs, 170)}>
        <svg viewBox="0 0 100 36" className="block h-full w-full" preserveAspectRatio="none">
          <path d="M2 30l10-8 10 8 10-8 10 8 10-8 10 8 10-8 10 8 8-6V2H2z" fill={C_HD.glow} stroke={C_HD.deep} strokeWidth="4" {...SJ} />
        </svg>
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
   28. Jubilee (t7) — THE DIAL LETS GO. Tell: the numerals rattle in their
   settings. Strike: all twelve drop off the face like coins and the bare dial
   spins free with nothing left to point at. Settle: the numerals bounce once
   on the board and lie still, and the empty face keeps turning slowly.
   ========================================================================== */

const C_JB = { core: "#f0c96a", glow: "#fff6dd", deep: "#3a2a08" };
const JB_NUMS = [
  { x: 50, y: 40, mx: "-40%", my: "420%" },
  { x: 60, y: 46, mx: "120%", my: "380%" },
  { x: 60, y: 58, mx: "160%", my: "300%" },
  { x: 40, y: 46, mx: "-150%", my: "390%" },
  { x: 40, y: 58, mx: "-180%", my: "310%" },
];

function JubileeScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <circle cx="20" cy="20" r="12" fill="none" stroke={C_JB.core} strokeWidth="2.6" />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <circle cx="20" cy="9" r="2.4" fill={C_JB.glow} />
          <circle cx="30" cy="24" r="2.4" fill={C_JB.glow} />
          <circle cx="11" cy="24" r="2.4" fill={C_JB.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <circle cx="20" cy="21" r="13" fill={C_JB.deep} stroke={C_JB.core} strokeWidth="2.4" />
        </g>
        <g className="g01-jb-numeral" style={sv(dm(delayMs, 220), { "--g01-my": "260%" })}>
          <circle cx="20" cy="10" r="2.8" fill={C_JB.glow} />
          <circle cx="31" cy="26" r="2.8" fill={C_JB.glow} />
          <circle cx="9" cy="26" r="2.8" fill={C_JB.glow} />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <circle cx="20" cy="21" r="17" fill="none" stroke={C_JB.core} strokeWidth="1.5" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(240,201,106,0.3)" delayMs={delayMs} />
      <P x={50} y={50} w={24} h={24} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <circle cx="50" cy="50" r="44" fill={C_JB.deep} stroke={C_JB.core} strokeWidth="6" />
          <path d="M50 44V22" stroke={C_JB.glow} strokeWidth="5" {...SJ} />
        </svg>
      </P>
      {JB_NUMS.map((m, i) => (
        <P key={i} x={m.x} y={m.y} w={4} h={4} cls="g01-jb-numeral" style={sv(dm(delayMs, 190 + i * 70), { "--g01-mx": m.mx, "--g01-my": m.my, background: C_JB.glow, borderRadius: "50%" })} />
      ))}
      <P x={50} y={50} w={20} h={20} cls="g01-jb-spin" style={dm(delayMs, 470)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <circle cx="50" cy="50" r="38" fill="none" stroke={C_JB.glow} strokeWidth="5" />
          <path d="M50 50V20M50 50l16 12" fill="none" stroke={C_JB.core} strokeWidth="5" {...SJ} />
        </svg>
      </P>
      <P x={50} y={64} w={28} h={2} cls="g01-lean" style={sv({ background: C_JB.core, ...dm(delayMs, 680) }, { "--g01-lean": "calc(var(--fx-side, 1) * -190%)" })} />
      <Drift color={C_JB.glow} delayMs={delayMs + 740} n={4} />
    </Wide>
  );
}

/* =============================================================================
   29. Keys to the City (t7) — THE VAULT TIME LOCK. Tell: the outer ring
   creeps a degree and stops. Strike: the key is turned and both dial rings
   roll to their marks; four bolts withdraw at once. Settle: the door stands
   open on its own schedule, boundaries and all.
   ========================================================================== */

const C_KC = { core: "#84c9c4", glow: "#eefdf9", deep: "#0f2b2c" };
const KC_BOLTS = [
  { x: 50, y: 36, mx: "0%", my: "-150%" },
  { x: 64, y: 52, mx: "150%", my: "0%" },
  { x: 50, y: 68, mx: "0%", my: "150%" },
  { x: 36, y: 52, mx: "-150%", my: "0%" },
];

function KeysToTheCityScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <circle cx="20" cy="20" r="12" fill={C_KC.deep} stroke={C_KC.core} strokeWidth="2.4" />
          <circle cx="20" cy="20" r="5" fill="none" stroke={C_KC.glow} strokeWidth="2.2" />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <path d="M20 4v5M36 20h-5M20 36v-5M4 20h5" stroke={C_KC.glow} strokeWidth="3" {...SJ} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <circle cx="20" cy="21" r="13" fill={C_KC.deep} stroke={C_KC.core} strokeWidth="2.4" />
        </g>
        <g className="g01-kc-ring" style={dm(delayMs, 220)}>
          <circle cx="20" cy="21" r="8" fill="none" stroke={C_KC.glow} strokeWidth="2.6" strokeDasharray="4 4" />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M20 21h11" stroke={C_KC.core} strokeWidth="2.6" {...SJ} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(132,201,196,0.28)" delayMs={delayMs} />
      <P x={50} y={52} w={24} h={24} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full"><circle cx="50" cy="50" r="44" fill={C_KC.deep} stroke={C_KC.core} strokeWidth="6" /></svg>
      </P>
      <P x={50} y={52} w={19} h={19} cls="g01-kc-ring" style={sv(dm(delayMs, 170), { "--g01-a": "150deg" })}>
        <svg viewBox="0 0 100 100" className="block h-full w-full"><circle cx="50" cy="50" r="42" fill="none" stroke={C_KC.core} strokeWidth="7" strokeDasharray="12 10" /></svg>
      </P>
      <P x={50} y={52} w={12} h={12} cls="g01-kc-inner" style={sv(dm(delayMs, 300), { "--g01-a": "-210deg" })}>
        <svg viewBox="0 0 100 100" className="block h-full w-full"><circle cx="50" cy="50" r="40" fill="none" stroke={C_KC.glow} strokeWidth="9" strokeDasharray="9 12" /></svg>
      </P>
      {KC_BOLTS.map((b, i) => (
        <P key={i} x={b.x} y={b.y} w={4} h={4} cls="g01-fling" style={sv(dm(delayMs, 460 + i * 70), { "--g01-mx": b.mx, "--g01-my": b.my, "--g01-mr": "0deg", background: C_KC.glow })} />
      ))}
      <P x={50} y={52} w={26} h={1.6} cls="g01-lean" style={sv({ background: C_KC.core, ...dm(delayMs, 680) }, { "--g01-lean": "calc(var(--fx-side, 1) * -230%)" })} />
    </Wide>
  );
}

/* =============================================================================
   30. Moonlit Reprieve (t7) — THE TIDE DIAL. Tell: the water at the dial's
   foot draws back and holds. Strike: the tide climbs the face two marks, the
   little boat lifts with it, and the moon pointer rides the rim. Settle: the
   water falls two marks again, and the mark it leaves stays wet.
   ========================================================================== */

const C_MR = { core: "#8fb6e0", glow: "#eef6ff", deep: "#101c33" };

function MoonlitReprieveScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <circle cx="20" cy="20" r="12" fill={C_MR.deep} stroke={C_MR.core} strokeWidth="2.4" />
          <path d="M9 24q11 7 22 0v6q-11 7-22 0z" fill={C_MR.core} />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <path d="M26 12a6 6 0 1 0 0 8 5 5 0 0 1 0-8z" fill={C_MR.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <circle cx="20" cy="21" r="13" fill={C_MR.deep} stroke={C_MR.core} strokeWidth="2.4" />
        </g>
        <g className="g01-mr-tide" style={dm(delayMs, 220)}>
          <path d="M8 24q12 8 24 0v8q-12 8-24 0z" fill={C_MR.core} />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M27 11a6 6 0 1 0 0 9 5 5 0 0 1 0-9z" fill={C_MR.glow} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(143,182,224,0.28)" delayMs={delayMs} />
      <P x={50} y={52} w={24} h={24} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <circle cx="50" cy="50" r="44" fill={C_MR.deep} stroke={C_MR.core} strokeWidth="6" />
          <path d="M50 8v8M92 50h-8M50 92v-8M8 50h8" stroke={C_MR.core} strokeWidth="5" {...SJ} />
        </svg>
      </P>
      <P x={50} y={62} w={22} h={13} cls="g01-mr-tide" style={dm(delayMs, 180)}>
        <svg viewBox="0 0 110 64" className="block h-full w-full" preserveAspectRatio="none">
          <path d="M0 16q14 12 28 0t28 0 28 0 28 0v48H0z" fill={C_MR.core} opacity="0.9" />
        </svg>
      </P>
      <P x={50} y={54} w={9} h={7} cls="g01-mr-boat" style={dm(delayMs, 320)}>
        <svg viewBox="0 0 50 36" className="block h-full w-full">
          <path d="M4 22h42l-8 12H12z" fill={C_MR.glow} stroke={C_MR.deep} strokeWidth="3" {...SJ} />
          <path d="M25 22V2l14 14z" fill={C_MR.glow} stroke={C_MR.deep} strokeWidth="3" {...SJ} />
        </svg>
      </P>
      <P x={50} y={52} w={26} h={26} cls="g01-mr-moon" style={dm(delayMs, 460)}>
        <span className="absolute block" style={{ left: "84%", top: "42%", width: "12%", height: "12%", borderRadius: "50%", background: C_MR.glow }} />
      </P>
      <P x={50} y={40} w={24} h={1.4} cls="g01-lean" style={sv({ background: C_MR.glow, ...dm(delayMs, 660) }, { "--g01-lean": "calc(var(--fx-side, 1) * -230%)" })} />
      <Drift color={C_MR.glow} delayMs={delayMs + 720} n={4} />
    </Wide>
  );
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
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <rect x="8" y="9" width="24" height="22" fill={C_PF.glow} stroke={C_PF.deep} strokeWidth="2" />
          <path d="M20 9v22" stroke={C_PF.deep} strokeWidth="1.8" />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <circle cx="26" cy="24" r="4.4" fill={C_PF.core} stroke={C_PF.deep} strokeWidth="1.6" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <rect x="7" y="10" width="26" height="22" fill={C_PF.glow} stroke={C_PF.deep} strokeWidth="2.2" />
          <path d="M20 10v22" stroke={C_PF.deep} strokeWidth="2" />
        </g>
        <g className="g01-pf-ribbon" style={dm(delayMs, 220)}>
          <path d="M18 4h4v16l-2-3-2 3z" fill={C_PF.core} stroke={C_PF.deep} strokeWidth="1.6" {...SJ} />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <circle cx="27" cy="26" r="5" fill="none" stroke={C_PF.core} strokeWidth="2" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(224,120,143,0.28)" delayMs={delayMs} />
      <P x={50} y={56} w={28} h={18} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 140 90" className="block h-full w-full">
          <path d="M6 12q32-8 62 0 30-8 66 0v70q-36-8-66 0-30-8-62 0z" fill={C_PF.glow} stroke={C_PF.deep} strokeWidth="6" {...SJ} />
          <path d="M68 12v70" stroke={C_PF.deep} strokeWidth="5" />
        </svg>
      </P>
      <P x={62} y={56} w={13} h={16} cls="g01-pf-page" style={sv(dm(delayMs, 170), { "--g01-a": "-58deg" })}>
        <svg viewBox="0 0 70 80" className="block h-full w-full"><path d="M2 4q34-6 66 2v70q-32-8-66-2z" fill={C_PF.glow} stroke={C_PF.deep} strokeWidth="5" {...SJ} /></svg>
      </P>
      <P x={50} y={58} w={4} h={22} cls="g01-pf-ribbon" style={dm(delayMs, 330)}>
        <svg viewBox="0 0 22 110" className="block h-full w-full"><path d="M3 2h16v96l-8-11-8 11z" fill={C_PF.core} stroke={C_PF.deep} strokeWidth="4" {...SJ} /></svg>
      </P>
      <P x={60} y={60} w={9} h={9} cls="g01-pf-seal" style={dm(delayMs, 470)}>
        <svg viewBox="0 0 50 50" className="block h-full w-full">
          <circle cx="25" cy="25" r="20" fill={C_PF.core} stroke={C_PF.deep} strokeWidth="4" />
          <path d="M15 20l10 10 10-10" fill="none" stroke={C_PF.glow} strokeWidth="4" {...SJ} />
        </svg>
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
        <g className="g01-hit" style={dm(delayMs, 0)}>
          <circle cx="20" cy="20" r="12" fill={C_SS.deep} stroke={C_SS.core} strokeWidth="2.4" />
          <path d="M12 12l16 16M28 12L12 28" stroke={C_SS.glow} strokeWidth="1.8" />
        </g>
        <g className="g01-hit2" style={dm(delayMs, 200)}>
          <path d="M20 32V20q6 0 6 6t-6 6z" fill={C_SS.core} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g01-arrive" style={dm(delayMs, 0)}>
          <circle cx="20" cy="20" r="13" fill={C_SS.deep} stroke={C_SS.core} strokeWidth="2.4" />
        </g>
        <g className="g01-ss-crack" style={dm(delayMs, 220)}>
          <path d="M8 14l7 5-4 6 9 3" fill="none" stroke={C_SS.glow} strokeWidth="2.2" {...SJ} />
        </g>
        <g className="g01-arrive-soft" style={dm(delayMs, 400)}>
          <path d="M20 34V22q7 1 6 7t-6 5z" fill={C_SS.core} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Wash tint="rgba(143,219,168,0.28)" delayMs={delayMs} />
      <Rim color="rgba(143,219,168,0.4)" delayMs={delayMs + 60} />
      <P x={50} y={52} w={24} h={24} cls="g01-tell" style={dm(delayMs, 0)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <circle cx="50" cy="50" r="44" fill={C_SS.deep} stroke={C_SS.core} strokeWidth="6" />
          <path d="M50 50V24M50 50l17 11" fill="none" stroke={C_SS.glow} strokeWidth="5" {...SJ} />
        </svg>
      </P>
      <P x={50} y={52} w={24} h={24} cls="g01-ss-crack" style={dm(delayMs, 170)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <path d="M10 40l22 10-10 16 26 8M62 14l-8 22 22 8-10 18" fill="none" stroke={C_SS.glow} strokeWidth="4" {...SJ} />
        </svg>
      </P>
      {[0, 1, 2].map((i) => (
        <P key={i} x={40 + i * 10} y={66} w={3} h={7} cls="g01-fling" style={sv(dm(delayMs, 330 + i * 80), { "--g01-mx": `${(i - 1) * 120}%`, "--g01-my": "230%", "--g01-mr": "40deg", background: C_SS.glow })} />
      ))}
      {SS_SHOOTS.map((s, i) => (
        <P key={i} x={s.x} y={s.y} w={6} h={12} cls="g01-ss-shoot" style={sv(dm(delayMs, 470 + i * 90), { "--g01-mr": s.mr })}>
          <svg viewBox="0 0 30 60" className="block h-full w-full">
            <path d="M15 58V16" stroke={C_SS.core} strokeWidth="5" {...SJ} />
            <path d="M15 30q-12-4-12-16 12 0 12 16zM15 22q12-4 12-14-12 0-12 14z" fill={C_SS.core} />
          </svg>
        </P>
      ))}
      <P x={50} y={68} w={26} h={1.4} cls="g01-lean" style={sv({ background: C_SS.glow, ...dm(delayMs, 680) }, { "--g01-lean": "calc(var(--fx-side, 1) * -180%)" })} />
    </Wide>
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

export const PLAYS: Record<string, SigPlugin> = {
  // --- held mechanisms: something is physically stopped ---
  bn4_council_of_peace: S(CouncilOfPeaceScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true,
    sound: "clockcage", source: "shield", anchor: "cast",
  }),
  bn4_great_armistice: S(GreatArmisticeScene, {
    ordering: "radial", staggerMs: 55, victims: "all", hasLead: true,
    sound: "snooze", source: "shield", anchor: "cast",
  }),
  bn4_hundred_year_lease: S(HundredYearLeaseScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "clockice", anchor: "cast",
  }),
  bn4_royal_we: S(RoyalWeScene, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true,
    sound: "snooze", source: "kingSafe", anchor: "cast",
  }),
  hx4_royal_lockdown: S(RoyalLockdownScene, {
    ordering: "octagon", staggerMs: 60, victims: "all", hasLead: true,
    sound: "clockcage", anchor: "cast",
  }),
  hx4_tithe_of_silence: S(TitheOfSilenceScene, {
    ordering: "radial", staggerMs: 55, victims: "all", hasLead: true,
    sound: "clockice", anchor: "cast",
  }),

  // --- mechanisms let go: something free-runs ---
  bn4_liberators_march: S(LiberatorsMarchScene, {
    ordering: "line", staggerMs: 55, victims: "all", hasLead: true,
    sound: "blitz", anchor: "aim",
  }),
  bn4_escape_artist: S(EscapeArtistScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "blitz", anchor: "cast",
  }),
  bn4_jubilee: S(JubileeScene, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true,
    sound: "snooze", anchor: "cast",
  }),
  bn4_keys_to_the_city: S(KeysToTheCityScene, {
    ordering: "octagon", staggerMs: 50, victims: "all", hasLead: true,
    sound: "clockcage", anchor: "cast",
  }),

  // --- mechanisms wound, bought or ratcheted forward ---
  bn4_royal_privilege: S(RoyalPrivilegeScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "blitz", anchor: "cast",
  }),
  bn4_midas_charter: S(MidasCharterScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "blitz", anchor: "cast",
  }),
  bn4_year_of_jubilee: S(YearOfJubileeScene, {
    ordering: "radial", staggerMs: 50, victims: "all", hasLead: true,
    sound: "snooze", anchor: "cast",
  }),
  bn4_hundred_days: S(HundredDaysScene, {
    ordering: "sweep", staggerMs: 45, victims: "all", hasLead: true,
    sound: "blitz", anchor: "cast",
  }),
  bn4_debtors_holiday: S(DebtorsHolidayScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "blitz", anchor: "cast",
  }),
  bn4_crown_jubilee: S(CrownJubileeScene, {
    ordering: "radial", staggerMs: 55, victims: "all", hasLead: true,
    sound: "blitz", anchor: "cast",
  }),

  // --- mechanisms that measure two sides against each other ---
  bn4_meek_inherit: S(MeekInheritScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true,
    sound: "snooze", anchor: "cast",
  }),
  bn4_unequal_treaty: S(UnequalTreatyScene, {
    ordering: "line", staggerMs: 55, victims: "all", hasLead: true,
    sound: "clockcage", anchor: "cast",
  }),
  bn4_grand_bargain: S(GrandBargainScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "clockcage", anchor: "cast",
  }),
  bn4_patrons_favor: S(PatronsFavorScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "snooze", anchor: "cast",
  }),

  // --- mechanisms tied to a body on the board ---
  bn4_queens_aegis: S(QueensAegisScene, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true,
    sound: "clockice", anchor: "cast",
  }),
  bn4_masked_ball: S(MaskedBallScene, {
    ordering: "radial", staggerMs: 60, victims: ["n", "b"], hasLead: true,
    sound: "snooze", source: "shield", anchor: "cast",
  }),
  bn4_flag_on_their_wall: S(FlagOnTheirWallScene, {
    ordering: "line", staggerMs: 55, victims: "all", hasLead: true,
    sound: "clockcage", anchor: "aim",
  }),
  bn4_siege_mentality: S(SiegeMentalityScene, {
    ordering: "radial", staggerMs: 50, victims: "all", hasLead: true,
    sound: "clockcage", anchor: "cast",
  }),
  bn4_champions_rest: S(ChampionsRestScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "snooze", anchor: "cast",
  }),

  // --- mechanisms on a cycle: phases, tides, seasons, dawns ---
  bn4_half_moon_charter: S(HalfMoonCharterScene, {
    ordering: "radial", staggerMs: 55, victims: "all", hasLead: true,
    sound: "clockice", anchor: "cast",
  }),
  bn4_moonlit_reprieve: S(MoonlitReprieveScene, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true,
    sound: "clockice", anchor: "cast",
  }),
  bn4_pact_of_the_dawn: S(PactOfTheDawnScene, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true,
    sound: "snooze", source: "frozen", anchor: "cast",
  }),
  bn4_second_spring: S(SecondSpringScene, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true,
    sound: "clockice", anchor: "cast",
  }),

  // --- mechanisms turned against the opponent ---
  hx4_debt_of_crowns: S(DebtOfCrownsScene, {
    ordering: "line", staggerMs: 60, victims: "all", hasLead: true,
    sound: "clockcage", anchor: "aim",
  }),
  hx4_last_toll: S(LastTollScene, {
    ordering: "line", staggerMs: 60, victims: "all", hasLead: true,
    sound: "clockcage", anchor: "aim",
  }),
  ov_time_heist: S(TimeHeistScene, {
    ordering: "line", staggerMs: 55, victims: "all", hasLead: true,
    sound: "blitz", anchor: "aim",
  }),
};
