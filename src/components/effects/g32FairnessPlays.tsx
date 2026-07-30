// Bespoke plugin signatures for the g32 FAIRNESS batch: 20 chance / randomness
// cards that all used to share the generated `diceTumble` family. See
// sigPlugins.tsx for the contract. Self-contained: own inline SVG, own CSS
// (g32FairnessPlays.css), transform/opacity only, no import from
// BoardEffects.tsx (cycle hazard), and only the SigPlugin/SigRole TYPES
// imported from sigPlugins.tsx.
//
// MODULE FICTION: THE APPARATUS OF FAIRNESS, AND ITS ABUSE. Every card is a
// different machine built to guarantee an honest outcome, caught in the moment
// it is trusted or rigged. A raffle drum cranked and a ticket dropped through
// the hatch; a spinner arrow ticking past pegs, one of them bent; a
// kleroterion loading bronze tokens and releasing a row; a metronome whose
// bell only speaks on the fifth beat; a shuffling machine pressing two halves
// into each other; an hourglass turned over; a bag of black and white stones
// drawn blind; a capsule machine with the odds taped to the glass; a dice
// tower full of baffles; a lottery blower with balls under a fan; a bingo cage
// and its chute; a foil pack and its printed odds slip; a sealed urn under
// wax; a peg board where the ball goes either way; a tombola tub; a card shoe
// dealing off the BOTTOM; a balance and its certified weight; a loaded die
// settling wrong; a ballot box and the count; a spirit level with a shim
// slipped under one end. No two cards share a central object.
//
// Rules kept everywhere: three beats (a tell of at most ~300ms, the strike,
// then a decaying settle); five or more animated layers in every lead cut, six
// on tier 7-8; exactly three palette colours per card (core / glow / deep),
// warm whites and never pure white; anything that means THE WHOLE BOARD lives
// inside <BoardFrame> so it stays exactly the board at any anchor; at least
// one animated layer per scene is driven by the geometry vars (--fx-side,
// --fx-len, --fx-index); every card declares anchor "cast" or "aim"; and every
// scene answers all three roles, entrance included.
//
// Where the fiction forks between honest and rigged, the SETTLE beat carries
// it: the bent peg, the bottom deal, the shim, the die that creeps back.

import "./g32FairnessPlays.css";

import type { CSSProperties, ReactNode } from "react";
import type { SigPlugin, SigRole } from "./sigPlugins";
import { AimStage, BoardFrame, BoardWideStage } from "./stage";

interface SceneProps {
  lead: boolean;
  role: SigRole;
  delayMs: number;
}

/* =============================================================================
   Shared staging. Everything below is POSITIONING and beat plumbing only: the
   machine at the centre of each card, and how it fails, is that card's own art.
   ========================================================================== */

/** Inline animation-delay: every choreography offset flows through this. */
const d = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

/** Delay plus arbitrary custom properties (throws, lanes, bounce vectors). */
const dv = (ms: number, vars: Record<string, string>): CSSProperties =>
  ({ animationDelay: `${ms}ms`, ...vars }) as CSSProperties;

/** The board-wide scene canvas, anchored on the cast square. */
function Wide({ children }: { children: ReactNode }) {
  return (
    <BoardWideStage>
      <span className="g32 absolute inset-0 block">{children}</span>
    </BoardWideStage>
  );
}

/** The same canvas, rotated onto this play's own source -> target vector.
 *  Art inside is authored pointing RIGHT (+x). */
function Aim({ children }: { children: ReactNode }) {
  return (
    <AimStage>
      <span className="g32 absolute inset-0 block">{children}</span>
    </AimStage>
  );
}

/** Square-local cut: the per-victim hit and the in-hand arrival. */
function Sq({ children }: { children: ReactNode }) {
  return (
    <span className="g32 pointer-events-none absolute inset-0 z-20 block" aria-hidden="true">
      <svg viewBox="0 0 40 40" className="block h-full w-full">
        {children}
      </svg>
    </span>
  );
}

/**
 * A positioned part of a machine. `x`/`y` are its CENTRE and `w`/`h` its size,
 * all in stage percent (the stage is 14 cells across, so one board square is
 * 7.142857% and the cast square's centre is 50% / 50%).
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

/* --- board-wide layers. All four live inside <BoardFrame>, so they mean the
   BOARD and not a percentage of an anchored stage. ------------------------- */

/** The hall light coming up over the whole board: the draw is being watched. */
function Hall({ tint, delayMs }: { tint: string; delayMs: number }) {
  return (
    <BoardFrame>
      <span
        className="g32-hall absolute inset-0 block"
        style={{ background: `radial-gradient(circle at 50% 50%, ${tint}, transparent 70%)`, ...d(delayMs) }}
      />
    </BoardFrame>
  );
}

/** The cordon: a rope drawn round the whole board while the draw is made. */
function Cordon({ color, delayMs }: { color: string; delayMs: number }) {
  return (
    <BoardFrame>
      <span className="g32-cordon absolute inset-0 block" style={{ border: `2px solid ${color}`, ...d(delayMs) }} />
    </BoardFrame>
  );
}

/** A ruled line across the whole board: a counter, a rank, a waterline. */
function Rule({ color, delayMs, y = 50, h = 7 }: { color: string; delayMs: number; y?: number; h?: number }) {
  return (
    <BoardFrame>
      <span
        className="g32-rule absolute block"
        style={{ left: 0, width: "100%", top: `${y - h / 2}%`, height: `${h}%`, background: color, ...d(delayMs) }}
      />
    </BoardFrame>
  );
}

/** Settle chaff over the board: torn ticket stubs, dust, dropped confetti.
 *  Falls AWAY from the caster's own end (--fx-side). */
function Fall({ color, delayMs, n = 3 }: { color: string; delayMs: number; n?: number }) {
  return (
    <BoardFrame>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className="g32-fall absolute block"
          style={{
            left: `${16 + i * 24}%`,
            top: `${28 + (i % 3) * 18}%`,
            width: "2.6%",
            height: "2%",
            background: color,
            ...d(delayMs + i * 100),
          }}
        />
      ))}
    </BoardFrame>
  );
}

/* =============================================================================
   1. Pandemonium Carnival (t8) — THE RAFFLE DRUM. Tell: the trestle takes the
   weight and the ground shadow squashes. Strike: the crank is wound and the
   wire drum tumbles its tickets over and over. Settle: the hatch flaps open,
   one stub drops through, and the barker's bell answers it.
   ========================================================================== */

const C_RD = { core: "#e8613c", glow: "#ffeacb", deep: "#34150e" };

function PandemoniumCarnivalScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g32-hit" style={d(delayMs)}>
          <rect x="9" y="13" width="22" height="13" fill={C_RD.glow} stroke={C_RD.deep} strokeWidth="2" />
          <path d="M14 18h12M14 22h7" stroke={C_RD.deep} strokeWidth="1.8" strokeLinecap="round" />
        </g>
        <g className="g32-hit2" style={d(delayMs + 210)}>
          <circle cx="20" cy="20" r="15" fill="none" stroke={C_RD.core} strokeWidth="2" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g32-rd-turn" style={d(delayMs)}>
          <path d="M20 6l10 6v14l-10 6-10-6V12z" fill={C_RD.deep} stroke={C_RD.core} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M10 12l20 14M30 12L10 26" stroke={C_RD.core} strokeWidth="1.6" />
        </g>
        <g className="g32-arrive-soft" style={d(delayMs + 240)}>
          <path d="M20 32v5h8" fill="none" stroke={C_RD.core} strokeWidth="2.4" strokeLinecap="round" />
        </g>
        <g className="g32-rd-ticket" style={d(delayMs + 420)}>
          <rect x="15" y="27" width="11" height="7" fill={C_RD.glow} stroke={C_RD.deep} strokeWidth="1.6" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Hall tint="rgba(232,97,60,0.3)" delayMs={delayMs} />
      <P x={50} y={70} w={24} h={4} cls="g32-tell" style={{ background: C_RD.deep, borderRadius: "50%", ...d(delayMs + 60) }} />
      <P x={50} y={54} w={24} h={24} cls="g32-rd-turn" style={d(delayMs + 170)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <path d="M50 6l31 19v50L50 94 19 75V25z" fill={C_RD.deep} stroke={C_RD.core} strokeWidth="7" strokeLinejoin="round" />
          <path d="M19 25l62 50M81 25L19 75M50 6v88" stroke={C_RD.core} strokeWidth="4" />
        </svg>
      </P>
      <P x={66} y={56} w={11} h={11} cls="g32-rd-crank" style={d(delayMs + 210)}>
        <svg viewBox="0 0 60 60" className="block h-full w-full">
          <path d="M30 30h18v14" fill="none" stroke={C_RD.core} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="30" cy="30" r="7" fill={C_RD.glow} />
        </svg>
      </P>
      <P x={50} y={67} w={10} h={7} cls="g32-rd-hatch" style={d(delayMs + 430)}>
        <svg viewBox="0 0 60 40" className="block h-full w-full">
          <rect x="5" y="4" width="50" height="30" fill={C_RD.deep} stroke={C_RD.glow} strokeWidth="5" />
        </svg>
      </P>
      <P x={50} y={70} w={8} h={6} cls="g32-rd-ticket" style={d(delayMs + 560)}>
        <svg viewBox="0 0 50 36" className="block h-full w-full">
          <rect x="3" y="3" width="44" height="30" fill={C_RD.glow} stroke={C_RD.deep} strokeWidth="5" />
          <path d="M14 18h22" stroke={C_RD.deep} strokeWidth="5" strokeLinecap="round" />
        </svg>
      </P>
      <P x={33} y={42} w={10} h={11} cls="g32-rd-bell" style={d(delayMs + 700)}>
        <svg viewBox="0 0 60 66" className="block h-full w-full">
          <path d="M12 50V32a18 18 0 0 1 36 0v18z" fill={C_RD.core} stroke={C_RD.deep} strokeWidth="6" strokeLinejoin="round" />
          <circle cx="30" cy="56" r="6" fill={C_RD.glow} />
        </svg>
      </P>
      <Fall color={C_RD.glow} delayMs={delayMs + 800} n={3} />
    </Wide>
  );
}

/* =============================================================================
   2. The Fool (t8) — THE SPINNER AND ITS PEGS. Tell: the arrow is loaded back
   against the first peg. Strike: it whips round, ticking off every peg on the
   ring. Settle: it slows, catches on a peg that has been quietly bent flat,
   and the cap bell over it jingles at whoever was watching.
   ========================================================================== */

const C_SP = { core: "#7ec9b8", glow: "#fff2d8", deep: "#10322c" };
const SP_PEGS = [0, 60, 120, 180, 240, 300];

function TheFoolScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g32-hit" style={d(delayMs)}>
          <circle cx="20" cy="20" r="12" fill="none" stroke={C_SP.core} strokeWidth="2.4" />
          <path d="M20 20l8-6" stroke={C_SP.glow} strokeWidth="3" strokeLinecap="round" />
          <circle cx="20" cy="20" r="3" fill={C_SP.deep} />
        </g>
        <g className="g32-hit2" style={d(delayMs + 210)}>
          <circle cx="30" cy="12" r="3" fill={C_SP.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g32-arrive" style={d(delayMs)}>
          <circle cx="20" cy="21" r="13" fill={C_SP.deep} stroke={C_SP.core} strokeWidth="2.4" />
        </g>
        <g className="g32-sp-arrow" style={d(delayMs + 230)}>
          <path d="M20 21l0-11 4 5-4-5-4 5z" fill={C_SP.glow} stroke={C_SP.glow} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <g className="g32-sp-bent" style={d(delayMs + 420)}>
          <path d="M28 30l6 2" stroke={C_SP.core} strokeWidth="3" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Cordon color="rgba(126,201,184,0.5)" delayMs={delayMs} />
      <P x={50} y={53} w={5} h={5} cls="g32-tell" style={{ background: C_SP.glow, borderRadius: "50%", ...d(delayMs + 60) }} />
      <P x={50} y={53} w={26} h={26} cls="g32-sp-dial" style={d(delayMs + 170)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <circle cx="50" cy="50" r="44" fill={C_SP.deep} stroke={C_SP.core} strokeWidth="6" />
          <circle cx="50" cy="50" r="30" fill="none" stroke={C_SP.core} strokeWidth="2" />
        </svg>
      </P>
      {SP_PEGS.map((a, i) => (
        <P
          key={i}
          x={50}
          y={53}
          w={22}
          h={22}
          cls="g32-sp-peg"
          style={dv(delayMs + 240 + i * 45, { "--g32-mr": `${a}deg` })}
        >
          <svg viewBox="0 0 100 100" className="block h-full w-full">
            <rect x="46" y="2" width="8" height="14" fill={C_SP.glow} />
          </svg>
        </P>
      ))}
      <P x={50} y={53} w={22} h={22} cls="g32-sp-arrow" style={d(delayMs + 330)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <path d="M50 50L50 12l9 12H41l9-12z" fill={C_SP.glow} stroke={C_SP.glow} strokeWidth="7" strokeLinejoin="round" />
          <circle cx="50" cy="50" r="8" fill={C_SP.core} />
        </svg>
      </P>
      <P x={58} y={40} w={6} h={4} cls="g32-sp-bent" style={{ background: C_SP.core, ...d(delayMs + 620) }} />
      <P x={41} y={38} w={9} h={9} cls="g32-sp-cap" style={d(delayMs + 720)}>
        <svg viewBox="0 0 50 50" className="block h-full w-full">
          <path d="M8 40q4-30 17-34 13 4 17 34z" fill={C_SP.core} stroke={C_SP.deep} strokeWidth="5" strokeLinejoin="round" />
          <circle cx="25" cy="44" r="6" fill={C_SP.glow} />
        </svg>
      </P>
      <Fall color={C_SP.glow} delayMs={delayMs + 820} n={3} />
    </Wide>
  );
}

/* =============================================================================
   3. All the King's Men (t7) — THE KLEROTERION. Tell: the stone slab takes its
   weight. Strike: four bronze tokens are pushed home into the column, strongest
   first, and the ball tube is released. Settle: a white ball drops, the chosen
   row lights and slides out, and stone dust falls off the face.
   ========================================================================== */

const C_KL = { core: "#b98f4e", glow: "#ffefcf", deep: "#2a2114" };
const KL_TOKENS = [0, 1, 2, 3];

function AllTheKingsMenScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g32-hit" style={d(delayMs)}>
          <rect x="10" y="12" width="20" height="9" fill={C_KL.core} stroke={C_KL.deep} strokeWidth="2" />
          <rect x="10" y="23" width="20" height="9" fill={C_KL.deep} stroke={C_KL.core} strokeWidth="2" />
        </g>
        <g className="g32-hit2" style={d(delayMs + 210)}>
          <circle cx="20" cy="17" r="3.2" fill={C_KL.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g32-arrive" style={d(delayMs)}>
          <rect x="9" y="7" width="22" height="27" fill={C_KL.deep} stroke={C_KL.core} strokeWidth="2.4" />
          <path d="M9 15h22M9 23h22" stroke={C_KL.core} strokeWidth="1.8" />
        </g>
        <g className="g32-kl-token" style={d(delayMs + 240)}>
          <rect x="12" y="9" width="16" height="5" fill={C_KL.core} />
        </g>
        <g className="g32-kl-ball" style={d(delayMs + 420)}>
          <circle cx="33" cy="26" r="3.4" fill={C_KL.glow} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Hall tint="rgba(185,143,78,0.26)" delayMs={delayMs} />
      <P x={50} y={70} w={26} h={4} cls="g32-tell" style={{ background: C_KL.deep, ...d(delayMs + 60) }} />
      <P x={48} y={52} w={24} h={30} cls="g32-kl-slab" style={d(delayMs + 170)}>
        <svg viewBox="0 0 100 130" className="block h-full w-full">
          <rect x="8" y="6" width="84" height="118" fill={C_KL.deep} stroke={C_KL.core} strokeWidth="7" />
          <path d="M8 34h84M8 62h84M8 90h84" stroke={C_KL.core} strokeWidth="4" />
        </svg>
      </P>
      {KL_TOKENS.map((i) => (
        <P
          key={i}
          x={48}
          y={42 + i * 6.6}
          w={14}
          h={4}
          cls="g32-kl-token"
          style={dv(delayMs + 260 + i * 80, { "--g32-mx": `${-160 - i * 10}%` })}
        >
          <svg viewBox="0 0 80 22" className="block h-full w-full">
            <rect x="2" y="2" width="76" height="18" fill={C_KL.core} stroke={C_KL.deep} strokeWidth="4" />
          </svg>
        </P>
      ))}
      <P x={64} y={52} w={4} h={30} cls="g32-kl-tube" style={{ border: `2px solid ${C_KL.core}`, ...d(delayMs + 320) }} />
      <P x={64} y={40} w={4.4} h={4.4} cls="g32-kl-ball" style={{ background: C_KL.glow, borderRadius: "50%", ...d(delayMs + 560) }} />
      <P x={48} y={42} w={26} h={5} cls="g32-kl-row" style={{ background: C_KL.glow, ...d(delayMs + 700) }} />
      <Fall color={C_KL.core} delayMs={delayMs + 800} n={3} />
    </Wide>
  );
}

/* =============================================================================
   4. Monks of the Fifth Bell (t7) — THE METRONOME. Tell: the case is opened
   and the pallet catches. Strike: the arm swings, four ticks lighting under it
   one at a time, each one silent. Settle: on the fifth the bell is struck, and
   a single step chevron moves one square away from the caster.
   ========================================================================== */

const C_MT = { core: "#6f8fd0", glow: "#fff3dd", deep: "#16203a" };
const MT_TICKS = [0, 1, 2, 3];

function MonksFifthBellScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g32-hit" style={d(delayMs)}>
          <path d="M14 33h12L20 7z" fill={C_MT.deep} stroke={C_MT.core} strokeWidth="2" strokeLinejoin="round" />
          <path d="M20 30V12" stroke={C_MT.glow} strokeWidth="2.4" strokeLinecap="round" />
        </g>
        <g className="g32-mt-bell" style={d(delayMs + 210)}>
          <path d="M12 12V9a8 8 0 0 1 16 0v3z" fill={C_MT.core} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g32-arrive" style={d(delayMs)}>
          <path d="M12 34h16L20 5z" fill={C_MT.deep} stroke={C_MT.core} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <g className="g32-mt-arm" style={d(delayMs + 230)}>
          <path d="M20 33V10" stroke={C_MT.glow} strokeWidth="2.6" strokeLinecap="round" />
          <rect x="17" y="18" width="6" height="5" fill={C_MT.core} />
        </g>
        <g className="g32-mt-bell" style={d(delayMs + 430)}>
          <circle cx="30" cy="10" r="4.4" fill={C_MT.core} stroke={C_MT.glow} strokeWidth="1.6" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Cordon color="rgba(111,143,208,0.45)" delayMs={delayMs} />
      <P x={50} y={70} w={20} h={3.4} cls="g32-tell" style={{ background: C_MT.deep, ...d(delayMs + 60) }} />
      <P x={50} y={55} w={20} h={28} cls="g32-mt-case" style={d(delayMs + 170)}>
        <svg viewBox="0 0 80 116" className="block h-full w-full">
          <path d="M14 110h52L40 8z" fill={C_MT.deep} stroke={C_MT.core} strokeWidth="7" strokeLinejoin="round" />
          <path d="M22 84h36" stroke={C_MT.core} strokeWidth="4" />
        </svg>
      </P>
      <P x={50} y={54} w={5} h={26} cls="g32-mt-arm" style={d(delayMs + 230)}>
        <svg viewBox="0 0 26 110" className="block h-full w-full">
          <path d="M13 108V6" stroke={C_MT.glow} strokeWidth="7" strokeLinecap="round" />
          <rect x="2" y="34" width="22" height="14" fill={C_MT.core} stroke={C_MT.deep} strokeWidth="4" />
        </svg>
      </P>
      {MT_TICKS.map((i) => (
        <P
          key={i}
          x={43 + i * 4.6}
          y={67}
          w={3}
          h={3}
          cls="g32-mt-tick"
          style={{ background: C_MT.core, borderRadius: "50%", ...d(delayMs + 300 + i * 90) }}
        />
      ))}
      <P x={64} y={40} w={10} h={11} cls="g32-mt-bell" style={d(delayMs + 660)}>
        <svg viewBox="0 0 60 66" className="block h-full w-full">
          <path d="M12 48V32a18 18 0 0 1 36 0v16z" fill={C_MT.core} stroke={C_MT.deep} strokeWidth="6" strokeLinejoin="round" />
          <circle cx="30" cy="54" r="6" fill={C_MT.glow} />
        </svg>
      </P>
      <P x={50} y={44} w={9} h={7} cls="g32-mt-step" style={d(delayMs + 780)}>
        <svg viewBox="0 0 50 40" className="block h-full w-full">
          <path d="M6 30l19-20 19 20" fill="none" stroke={C_MT.glow} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </P>
      <Fall color={C_MT.glow} delayMs={delayMs + 840} n={3} />
    </Wide>
  );
}

/* =============================================================================
   5. Colossal Visitor (t6) — THE SHUFFLING MACHINE. Tell: the two halves are
   squared against the guide down the file. Strike: the press drives them into
   each other and the interleave races the whole length of the lane, its reach
   scaled by --fx-len. Settle: two cards come out creased and smoking.
   ========================================================================== */

const C_RF = { core: "#9ad06f", glow: "#fff6da", deep: "#14301a" };

function ColossalVisitorScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g32-hit" style={d(delayMs)}>
          <rect x="6" y="12" width="13" height="17" fill={C_RF.core} stroke={C_RF.deep} strokeWidth="2" />
          <rect x="21" y="12" width="13" height="17" fill={C_RF.glow} stroke={C_RF.deep} strokeWidth="2" />
        </g>
        <g className="g32-hit2" style={d(delayMs + 210)}>
          <path d="M20 8v25" stroke={C_RF.deep} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g32-arrive" style={d(delayMs)}>
          <rect x="7" y="13" width="14" height="18" fill={C_RF.deep} stroke={C_RF.core} strokeWidth="2.2" />
          <rect x="19" y="10" width="14" height="18" fill={C_RF.core} stroke={C_RF.deep} strokeWidth="2.2" />
        </g>
        <g className="g32-rf-teeth" style={d(delayMs + 240)}>
          <path d="M8 34h26" stroke={C_RF.glow} strokeWidth="3" strokeLinecap="round" strokeDasharray="3 3" />
        </g>
        <g className="g32-arrive-soft" style={d(delayMs + 420)}>
          <path d="M6 7h28" stroke={C_RF.core} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <>
      <Wide>
        <Rule color="rgba(20,48,26,0.5)" delayMs={delayMs} y={50} h={11} />
        <Fall color={C_RF.glow} delayMs={delayMs + 800} n={3} />
      </Wide>
      <Aim>
        <P x={50} y={50} w={4} h={16} cls="g32-tell" style={{ background: C_RF.core, ...d(delayMs + 60) }} />
        <P x={42} y={50} w={12} h={17} cls="g32-rf-halfL" style={d(delayMs + 180)}>
          <svg viewBox="0 0 60 90" className="block h-full w-full">
            <rect x="4" y="6" width="52" height="78" fill={C_RF.deep} stroke={C_RF.core} strokeWidth="6" />
            <path d="M4 26h52M4 46h52M4 66h52" stroke={C_RF.core} strokeWidth="4" />
          </svg>
        </P>
        <P x={58} y={50} w={12} h={17} cls="g32-rf-halfR" style={d(delayMs + 180)}>
          <svg viewBox="0 0 60 90" className="block h-full w-full">
            <rect x="4" y="6" width="52" height="78" fill={C_RF.core} stroke={C_RF.deep} strokeWidth="6" />
            <path d="M4 26h52M4 46h52M4 66h52" stroke={C_RF.deep} strokeWidth="4" />
          </svg>
        </P>
        <P x={50} y={38} w={26} h={4} cls="g32-rf-press" style={{ background: C_RF.glow, ...d(delayMs + 380) }} />
        <P
          x={50}
          y={50}
          w={30}
          h={3}
          cls="g32-rf-teeth"
          style={{ background: `repeating-linear-gradient(90deg, ${C_RF.glow} 0 3px, transparent 3px 7px)`, ...d(delayMs + 520) }}
        />
        <P x={62} y={57} w={9} h={11} cls="g32-rf-crease" style={d(delayMs + 700)}>
          <svg viewBox="0 0 50 60" className="block h-full w-full">
            <path d="M6 6h38v48H6z" fill={C_RF.deep} stroke={C_RF.glow} strokeWidth="5" />
            <path d="M10 12l30 36" stroke={C_RF.glow} strokeWidth="5" strokeLinecap="round" />
          </svg>
        </P>
      </Aim>
    </>
  );
}

/* =============================================================================
   6. Grail Quest (t6) — THE HOURGLASS. Tell: a thumb and finger take the two
   caps. Strike: the whole glass is turned over and the sand starts. Settle: the
   thread runs, the pile builds, and the cup rises under the last grain.
   ========================================================================== */

const C_HG = { core: "#e0b45c", glow: "#fff4d6", deep: "#33260e" };

function GrailQuestScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g32-hit" style={d(delayMs)}>
          <path d="M11 7h18l-9 13 9 13H11l9-13z" fill={C_HG.core} stroke={C_HG.deep} strokeWidth="2" strokeLinejoin="round" />
        </g>
        <g className="g32-hit2" style={d(delayMs + 210)}>
          <path d="M20 20v13" stroke={C_HG.glow} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g32-hg-turn" style={d(delayMs)}>
          <path d="M10 6h20l-10 14 10 14H10l10-14z" fill={C_HG.deep} stroke={C_HG.core} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <g className="g32-hg-stream" style={d(delayMs + 250)}>
          <path d="M20 19v10" stroke={C_HG.glow} strokeWidth="2.4" strokeLinecap="round" />
        </g>
        <g className="g32-hg-cup" style={d(delayMs + 430)}>
          <path d="M14 30h12l-3 6h-6z" fill={C_HG.core} stroke={C_HG.deep} strokeWidth="1.6" strokeLinejoin="round" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Hall tint="rgba(224,180,92,0.28)" delayMs={delayMs} />
      <P x={50} y={38} w={16} h={3} cls="g32-tell" style={{ background: C_HG.glow, ...d(delayMs + 60) }} />
      <P x={50} y={53} w={20} h={28} cls="g32-hg-turn" style={d(delayMs + 180)}>
        <svg viewBox="0 0 80 116" className="block h-full w-full">
          <rect x="8" y="4" width="64" height="9" fill={C_HG.core} />
          <rect x="8" y="103" width="64" height="9" fill={C_HG.core} />
          <path d="M16 13h48L40 58l24 45H16l24-45z" fill="none" stroke={C_HG.core} strokeWidth="6" strokeLinejoin="round" />
        </svg>
      </P>
      <P x={50} y={46} w={13} h={9} cls="g32-hg-top" style={{ background: C_HG.core, ...d(delayMs + 400) }} />
      <P x={50} y={53} w={2} h={12} cls="g32-hg-stream" style={{ background: C_HG.glow, ...d(delayMs + 480) }} />
      <P x={50} y={62} w={13} h={7} cls="g32-hg-pile" style={{ background: C_HG.core, ...d(delayMs + 600) }} />
      <P x={50} y={68} w={12} h={12} cls="g32-hg-cup" style={d(delayMs + 760)}>
        <svg viewBox="0 0 60 60" className="block h-full w-full">
          <path d="M14 8h32q0 22-16 22T14 8z" fill={C_HG.glow} stroke={C_HG.deep} strokeWidth="6" strokeLinejoin="round" />
          <path d="M30 30v14M18 46h24" stroke={C_HG.glow} strokeWidth="6" strokeLinecap="round" />
        </svg>
      </P>
      <Fall color={C_HG.core} delayMs={delayMs + 820} n={3} />
    </Wide>
  );
}

/* =============================================================================
   7. Emergency Patch (t5) — THE BAG OF STONES. Tell: the drawstring is loosened
   a finger's width. Strike: a hand goes in blind and the bag deforms as the
   stones are turned over. Settle: one stone comes up out of the neck and is
   held out flat; it is the black one, and that names the slider.
   ========================================================================== */

const C_BS = { core: "#a8adb8", glow: "#fff2e0", deep: "#1c2028" };
const BS_STONES = [
  { x: 46, y: 60 },
  { x: 53, y: 62 },
  { x: 50, y: 57 },
];

function EmergencyPatchScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g32-hit" style={d(delayMs)}>
          <path d="M12 14q8-5 16 0l4 18q-12 6-24 0z" fill={C_BS.core} stroke={C_BS.deep} strokeWidth="2" strokeLinejoin="round" />
        </g>
        <g className="g32-bs-draw" style={d(delayMs + 210)}>
          <circle cx="20" cy="11" r="4.4" fill={C_BS.deep} stroke={C_BS.glow} strokeWidth="1.6" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g32-arrive" style={d(delayMs)}>
          <path d="M12 15q8-6 16 0l4 17q-12 6-24 0z" fill={C_BS.deep} stroke={C_BS.core} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <g className="g32-bs-cinch" style={d(delayMs + 240)}>
          <path d="M11 15h18" stroke={C_BS.glow} strokeWidth="2.6" strokeLinecap="round" />
        </g>
        <g className="g32-bs-draw" style={d(delayMs + 430)}>
          <circle cx="20" cy="9" r="4" fill={C_BS.glow} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Hall tint="rgba(168,173,184,0.24)" delayMs={delayMs} />
      <P x={50} y={45} w={18} h={2.6} cls="g32-tell" style={{ background: C_BS.glow, ...d(delayMs + 60) }} />
      <P x={50} y={60} w={24} h={24} cls="g32-bs-bag" style={d(delayMs + 190)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <path d="M28 20q22-14 44 0l14 52q-36 20-72 0z" fill={C_BS.deep} stroke={C_BS.core} strokeWidth="7" strokeLinejoin="round" />
        </svg>
      </P>
      <P x={50} y={48} w={20} h={3} cls="g32-bs-cinch" style={{ background: C_BS.core, ...d(delayMs + 300) }} />
      {BS_STONES.map((s, i) => (
        <P
          key={i}
          x={s.x}
          y={s.y}
          w={4.4}
          h={4}
          cls="g32-bs-stone"
          style={{ background: i === 1 ? C_BS.glow : C_BS.core, borderRadius: "50%", ...d(delayMs + 380 + i * 90) }}
        />
      ))}
      <P x={50} y={40} w={7} h={6.4} cls="g32-bs-draw" style={{ background: C_BS.deep, border: `2px solid ${C_BS.glow}`, borderRadius: "50%", ...d(delayMs + 620) }} />
      <P x={50} y={40} w={18} h={18} cls="g32-bs-show" style={{ border: `2px solid ${C_BS.glow}`, borderRadius: "50%", ...d(delayMs + 760) }} />
      <Fall color={C_BS.core} delayMs={delayMs + 820} n={3} />
    </Wide>
  );
}

/* =============================================================================
   8. Care Package (t4) — THE CAPSULE MACHINE. Tell: the odds card taped to the
   glass catches the light. Strike: the crank is turned and one capsule drops
   the chute. Settle: the flap kicks it out and the two halves come apart.
   ========================================================================== */

const C_CP = { core: "#f08fb0", glow: "#fff0e6", deep: "#3a1424" };
const CP_LOAD = [
  { x: 45, y: 45 },
  { x: 53, y: 43 },
  { x: 50, y: 50 },
];

function CarePackageScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g32-hit" style={d(delayMs)}>
          <path d="M9 20a11 11 0 0 1 22 0z" fill={C_CP.glow} stroke={C_CP.deep} strokeWidth="2" strokeLinejoin="round" />
          <path d="M9 20a11 11 0 0 0 22 0z" fill={C_CP.core} stroke={C_CP.deep} strokeWidth="2" strokeLinejoin="round" />
        </g>
        <g className="g32-cp-split" style={d(delayMs + 210)}>
          <path d="M6 20h28" stroke={C_CP.glow} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g32-arrive" style={d(delayMs)}>
          <rect x="9" y="8" width="22" height="24" fill={C_CP.deep} stroke={C_CP.core} strokeWidth="2.4" />
          <circle cx="20" cy="17" r="6" fill={C_CP.core} />
        </g>
        <g className="g32-cp-crank" style={d(delayMs + 240)}>
          <path d="M20 27h6v4" fill="none" stroke={C_CP.glow} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g className="g32-cp-drop" style={d(delayMs + 430)}>
          <circle cx="20" cy="30" r="4" fill={C_CP.glow} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Cordon color="rgba(240,143,176,0.45)" delayMs={delayMs} />
      <P x={62} y={46} w={9} h={7} cls="g32-tell" style={{ background: C_CP.glow, ...d(delayMs + 60) }} />
      <P x={50} y={52} w={22} h={30} cls="g32-cp-globe" style={d(delayMs + 180)}>
        <svg viewBox="0 0 90 120" className="block h-full w-full">
          <circle cx="45" cy="42" r="34" fill={C_CP.deep} stroke={C_CP.core} strokeWidth="7" />
          <rect x="16" y="76" width="58" height="38" fill={C_CP.deep} stroke={C_CP.core} strokeWidth="7" />
        </svg>
      </P>
      {CP_LOAD.map((c, i) => (
        <P
          key={i}
          x={c.x}
          y={c.y}
          w={4.6}
          h={4.6}
          cls="g32-cp-load"
          style={{ background: i === 1 ? C_CP.glow : C_CP.core, borderRadius: "50%", ...d(delayMs + 250 + i * 80) }}
        />
      ))}
      <P x={57} y={62} w={9} h={9} cls="g32-cp-crank" style={d(delayMs + 380)}>
        <svg viewBox="0 0 50 50" className="block h-full w-full">
          <circle cx="25" cy="25" r="9" fill={C_CP.core} stroke={C_CP.deep} strokeWidth="4" />
          <path d="M25 25h16" stroke={C_CP.glow} strokeWidth="6" strokeLinecap="round" />
        </svg>
      </P>
      <P x={44} y={66} w={5} h={5} cls="g32-cp-drop" style={{ background: C_CP.glow, borderRadius: "50%", ...d(delayMs + 560) }} />
      <P x={44} y={70} w={9} h={4} cls="g32-cp-flap" style={{ background: C_CP.core, ...d(delayMs + 680) }} />
      <P x={44} y={73} w={11} h={7} cls="g32-cp-split" style={d(delayMs + 780)}>
        <svg viewBox="0 0 60 40" className="block h-full w-full">
          <path d="M6 20a24 24 0 0 1 48 0z" fill={C_CP.glow} stroke={C_CP.deep} strokeWidth="5" strokeLinejoin="round" />
          <path d="M6 24a24 24 0 0 0 48 0z" fill={C_CP.core} stroke={C_CP.deep} strokeWidth="5" strokeLinejoin="round" />
        </svg>
      </P>
      <Fall color={C_CP.glow} delayMs={delayMs + 840} n={3} />
    </Wide>
  );
}

/* =============================================================================
   9. Demolition Derby (t4) — THE DICE TOWER. Tell: the tray under the mouth
   rattles once. Strike: two dice go in the top and knock down the baffles.
   Settle: they meet in the tray, one wrecks the other, and the tray jumps.
   ========================================================================== */

const C_DT = { core: "#8f7ad8", glow: "#fff0e8", deep: "#221a3c" };
const DT_BAFFLES = [0, 1, 2];

function DemolitionDerbyScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g32-hit" style={d(delayMs)}>
          <rect x="10" y="10" width="20" height="20" fill={C_DT.glow} stroke={C_DT.deep} strokeWidth="2" />
          <circle cx="16" cy="16" r="2.4" fill={C_DT.deep} />
          <circle cx="24" cy="24" r="2.4" fill={C_DT.deep} />
        </g>
        <g className="g32-dt-clash" style={d(delayMs + 210)}>
          <path d="M20 4l3 10 10 3-10 3-3 10-3-10-10-3 10-3z" fill={C_DT.core} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g32-arrive" style={d(delayMs)}>
          <path d="M11 6h18v28H11z" fill={C_DT.deep} stroke={C_DT.core} strokeWidth="2.4" />
          <path d="M11 14h11M29 21H18M11 28h11" stroke={C_DT.core} strokeWidth="2.2" />
        </g>
        <g className="g32-dt-die" style={dv(delayMs + 250, { "--g32-my": "150%" })}>
          <rect x="15" y="6" width="10" height="10" fill={C_DT.glow} stroke={C_DT.deep} strokeWidth="1.8" />
        </g>
        <g className="g32-dt-clash" style={d(delayMs + 430)}>
          <circle cx="20" cy="33" r="4" fill={C_DT.core} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Hall tint="rgba(143,122,216,0.28)" delayMs={delayMs} />
      <P x={50} y={72} w={26} h={4} cls="g32-tell" style={{ background: C_DT.deep, ...d(delayMs + 60) }} />
      <P x={50} y={52} w={20} h={30} cls="g32-dt-tower" style={d(delayMs + 180)}>
        <svg viewBox="0 0 80 120" className="block h-full w-full">
          <path d="M10 6h60v108H10z" fill={C_DT.deep} stroke={C_DT.core} strokeWidth="7" />
        </svg>
      </P>
      {DT_BAFFLES.map((i) => (
        <P
          key={i}
          x={i % 2 === 0 ? 45 : 55}
          y={44 + i * 8}
          w={11}
          h={2.6}
          cls="g32-dt-baffle"
          style={{ background: C_DT.core, ...d(delayMs + 260 + i * 90) }}
        />
      ))}
      {[0, 1].map((i) => (
        <P
          key={i}
          x={50}
          y={40}
          w={6}
          h={6}
          cls="g32-dt-die"
          style={dv(delayMs + 400 + i * 110, { "--g32-my": `${300 + i * 40}%`, "--g32-mr": i ? "-420deg" : "480deg" })}
        >
          <svg viewBox="0 0 40 40" className="block h-full w-full">
            <rect x="3" y="3" width="34" height="34" fill={i ? C_DT.core : C_DT.glow} stroke={C_DT.deep} strokeWidth="5" />
            <circle cx="13" cy="13" r="4" fill={C_DT.deep} />
            <circle cx="27" cy="27" r="4" fill={C_DT.deep} />
          </svg>
        </P>
      ))}
      <P x={50} y={69} w={11} h={11} cls="g32-dt-clash" style={d(delayMs + 660)}>
        <svg viewBox="0 0 60 60" className="block h-full w-full">
          <path d="M30 2l6 18 18 6-18 6-6 18-6-18-18-6 18-6z" fill={C_DT.glow} />
        </svg>
      </P>
      <P x={50} y={73} w={28} h={4} cls="g32-dt-tray" style={{ background: C_DT.core, ...d(delayMs + 760) }} />
      <Fall color={C_DT.glow} delayMs={delayMs + 840} n={3} />
    </Wide>
  );
}

/* =============================================================================
   10. Flash Mob (t4) — THE LOTTERY BLOWER. Tell: the fan under the drum starts
   and the first ball lifts off the floor. Strike: four balls thrash round the
   drum. Settle: they are taken up the tube one by one into the rail, where they
   stop dead in a row and hold.
   ========================================================================== */

const C_LB = { core: "#58b6e0", glow: "#fff2e2", deep: "#0f2740" };
const LB_BALLS = [
  { mx: "-150%", my: "-120%" },
  { mx: "140%", my: "-160%" },
  { mx: "-110%", my: "130%" },
  { mx: "160%", my: "90%" },
];

function FlashMobScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g32-hit" style={d(delayMs)}>
          <circle cx="20" cy="19" r="10" fill={C_LB.glow} stroke={C_LB.deep} strokeWidth="2" />
          <circle cx="20" cy="19" r="4.4" fill={C_LB.core} />
        </g>
        <g className="g32-hit2" style={d(delayMs + 210)}>
          <path d="M8 32h24" stroke={C_LB.core} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g32-arrive" style={d(delayMs)}>
          <circle cx="20" cy="20" r="13" fill={C_LB.deep} stroke={C_LB.core} strokeWidth="2.4" />
        </g>
        <g className="g32-lb-ball" style={dv(delayMs + 250, { "--g32-mx": "-90%", "--g32-my": "-70%" })}>
          <circle cx="20" cy="20" r="4.4" fill={C_LB.glow} />
        </g>
        <g className="g32-lb-rail" style={d(delayMs + 430)}>
          <path d="M8 34h24" stroke={C_LB.glow} strokeWidth="3" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Cordon color="rgba(88,182,224,0.45)" delayMs={delayMs} />
      <P x={50} y={68} w={16} h={4} cls="g32-tell" style={{ background: C_LB.glow, ...d(delayMs + 60) }} />
      <P x={50} y={52} w={26} h={26} cls="g32-lb-drum" style={d(delayMs + 170)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <circle cx="50" cy="50" r="44" fill={C_LB.deep} stroke={C_LB.core} strokeWidth="7" />
        </svg>
      </P>
      <P x={50} y={68} w={13} h={7} cls="g32-lb-fan" style={d(delayMs + 220)}>
        <svg viewBox="0 0 60 34" className="block h-full w-full">
          <path d="M4 17h52M14 6l32 22M46 6L14 28" stroke={C_LB.core} strokeWidth="6" strokeLinecap="round" />
        </svg>
      </P>
      {LB_BALLS.map((b, i) => (
        <P
          key={i}
          x={50}
          y={52}
          w={5}
          h={5}
          cls="g32-lb-ball"
          style={{
            background: i === 0 ? C_LB.glow : C_LB.core,
            borderRadius: "50%",
            ...dv(delayMs + 300 + i * 60, { "--g32-mx": b.mx, "--g32-my": b.my }),
          }}
        />
      ))}
      <P x={66} y={46} w={3.4} h={20} cls="g32-lb-tube" style={{ border: `2px solid ${C_LB.core}`, ...d(delayMs + 560) }} />
      <P x={66} y={37} w={22} h={5} cls="g32-lb-rail" style={d(delayMs + 720)}>
        <svg viewBox="0 0 120 28" className="block h-full w-full">
          <rect x="2" y="18" width="116" height="8" fill={C_LB.core} />
          <circle cx="20" cy="12" r="10" fill={C_LB.glow} />
          <circle cx="45" cy="12" r="10" fill={C_LB.glow} />
          <circle cx="70" cy="12" r="10" fill={C_LB.glow} />
          <circle cx="95" cy="12" r="10" fill={C_LB.glow} />
        </svg>
      </P>
      <Fall color={C_LB.core} delayMs={delayMs + 800} n={3} />
    </Wide>
  );
}

/* =============================================================================
   11. Will o' Wisps (t3) — THE BINGO CAGE. Tell: the cage rocks on its cradle.
   Strike: it tumbles end over end, the lit balls chasing round the wire.
   Settle: the chute swings down and one ball rolls out and sits there glowing.
   ========================================================================== */

const C_BC = { core: "#7fd0a8", glow: "#fff4e0", deep: "#123028" };
const BC_BALLS = [
  { x: 46, y: 50 },
  { x: 54, y: 53 },
  { x: 50, y: 57 },
];

function WillOWispsScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g32-hit" style={d(delayMs)}>
          <circle cx="20" cy="20" r="11" fill="none" stroke={C_BC.core} strokeWidth="2.4" />
          <path d="M9 20h22M20 9v22" stroke={C_BC.core} strokeWidth="1.6" />
        </g>
        <g className="g32-bc-out" style={d(delayMs + 210)}>
          <circle cx="28" cy="30" r="4" fill={C_BC.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g32-bc-cage" style={d(delayMs)}>
          <circle cx="20" cy="19" r="12" fill="none" stroke={C_BC.core} strokeWidth="2.6" />
          <ellipse cx="20" cy="19" rx="5" ry="12" fill="none" stroke={C_BC.core} strokeWidth="1.8" />
        </g>
        <g className="g32-bc-ball" style={d(delayMs + 250)}>
          <circle cx="17" cy="21" r="3.4" fill={C_BC.glow} />
        </g>
        <g className="g32-arrive-soft" style={d(delayMs + 430)}>
          <path d="M8 34h24" stroke={C_BC.deep} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Hall tint="rgba(127,208,168,0.24)" delayMs={delayMs} />
      <P x={50} y={70} w={20} h={3.4} cls="g32-tell" style={{ background: C_BC.deep, ...d(delayMs + 60) }} />
      <P x={50} y={53} w={26} h={26} cls="g32-bc-cage" style={d(delayMs + 180)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <circle cx="50" cy="50" r="42" fill="none" stroke={C_BC.core} strokeWidth="7" />
          <ellipse cx="50" cy="50" rx="18" ry="42" fill="none" stroke={C_BC.core} strokeWidth="5" />
          <path d="M8 50h84" stroke={C_BC.core} strokeWidth="5" />
        </svg>
      </P>
      {BC_BALLS.map((b, i) => (
        <P
          key={i}
          x={b.x}
          y={b.y}
          w={4.6}
          h={4.6}
          cls="g32-bc-ball"
          style={{ background: i === 2 ? C_BC.glow : C_BC.core, borderRadius: "50%", ...d(delayMs + 300 + i * 80) }}
        />
      ))}
      <P x={62} y={64} w={12} h={4} cls="g32-bc-chute" style={{ background: C_BC.core, ...d(delayMs + 600) }} />
      <P x={68} y={68} w={5.4} h={5.4} cls="g32-bc-out" style={{ background: C_BC.glow, borderRadius: "50%", ...d(delayMs + 740) }} />
      <Fall color={C_BC.glow} delayMs={delayMs + 820} n={3} />
    </Wide>
  );
}

/* =============================================================================
   12. Booster Pack (t3) — THE FOIL AND ITS ODDS SLIP. Tell: the crimped seam is
   pinched. Strike: the foil tears clean across and the cards fan. Settle: one
   is pulled clear and the printed odds leaflet flutters off the board, having
   done its entire job.
   ========================================================================== */

const C_FP = { core: "#d4a63c", glow: "#fff6de", deep: "#2e2410" };
const FP_FAN = [-22, 0, 22];

function BoosterPackScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g32-hit" style={d(delayMs)}>
          <rect x="11" y="8" width="18" height="24" fill={C_FP.core} stroke={C_FP.deep} strokeWidth="2" />
          <path d="M11 14h18" stroke={C_FP.deep} strokeWidth="2" strokeDasharray="3 2" />
        </g>
        <g className="g32-fp-slip" style={d(delayMs + 210)}>
          <rect x="14" y="24" width="12" height="8" fill={C_FP.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g32-arrive" style={d(delayMs)}>
          <rect x="11" y="7" width="18" height="26" fill={C_FP.deep} stroke={C_FP.core} strokeWidth="2.4" />
          <path d="M15 15h10M15 21h6" stroke={C_FP.core} strokeWidth="2" strokeLinecap="round" />
        </g>
        <g className="g32-fp-tear" style={d(delayMs + 240)}>
          <path d="M9 12h22" stroke={C_FP.glow} strokeWidth="2.6" strokeLinecap="round" />
        </g>
        <g className="g32-fp-pull" style={d(delayMs + 430)}>
          <rect x="15" y="4" width="11" height="14" fill={C_FP.glow} stroke={C_FP.deep} strokeWidth="1.6" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Cordon color="rgba(212,166,60,0.45)" delayMs={delayMs} />
      <P x={50} y={44} w={20} h={2.4} cls="g32-tell" style={{ background: C_FP.glow, ...d(delayMs + 60) }} />
      <P x={50} y={57} w={18} h={26} cls="g32-fp-pack" style={d(delayMs + 180)}>
        <svg viewBox="0 0 70 100" className="block h-full w-full">
          <rect x="6" y="6" width="58" height="88" fill={C_FP.deep} stroke={C_FP.core} strokeWidth="7" />
          <path d="M6 24h58" stroke={C_FP.core} strokeWidth="5" strokeDasharray="7 5" />
        </svg>
      </P>
      <P x={50} y={46} w={22} h={3} cls="g32-fp-tear" style={{ background: C_FP.glow, ...d(delayMs + 320) }} />
      {FP_FAN.map((r, i) => (
        <P
          key={i}
          x={50}
          y={55}
          w={10}
          h={15}
          cls="g32-fp-fan"
          style={dv(delayMs + 440 + i * 80, { "--g32-mr": `${r}deg` })}
        >
          <svg viewBox="0 0 50 76" className="block h-full w-full">
            <rect x="4" y="4" width="42" height="68" fill={C_FP.glow} stroke={C_FP.deep} strokeWidth="5" />
          </svg>
        </P>
      ))}
      <P x={50} y={48} w={11} h={16} cls="g32-fp-pull" style={d(delayMs + 660)}>
        <svg viewBox="0 0 50 76" className="block h-full w-full">
          <rect x="4" y="4" width="42" height="68" fill={C_FP.core} stroke={C_FP.deep} strokeWidth="5" />
          <path d="M14 26h22M14 40h14" stroke={C_FP.glow} strokeWidth="5" strokeLinecap="round" />
        </svg>
      </P>
      <P x={62} y={62} w={8} h={6} cls="g32-fp-slip" style={{ background: C_FP.glow, ...d(delayMs + 780) }} />
      <Fall color={C_FP.core} delayMs={delayMs + 840} n={3} />
    </Wide>
  );
}

/* =============================================================================
   13. Dragon Egg (t3) — THE SEALED URN. Tell: the urn is set down and the cord
   is passed twice round its neck. Strike: the wax is struck with the seal and
   the whole thing is witnessed. Settle: a hairline crack walks up through the
   seal from the inside, and the light behind it does not go out.
   ========================================================================== */

const C_SU = { core: "#b0563c", glow: "#ffe8cc", deep: "#2c1410" };

function DragonEggScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g32-hit" style={d(delayMs)}>
          <path d="M13 12h14l3 14q0 8-10 8t-10-8z" fill={C_SU.core} stroke={C_SU.deep} strokeWidth="2" strokeLinejoin="round" />
        </g>
        <g className="g32-su-crack" style={d(delayMs + 210)}>
          <path d="M20 10v10" stroke={C_SU.glow} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g32-arrive" style={d(delayMs)}>
          <path d="M12 13h16l3 13q0 9-11 9t-11-9z" fill={C_SU.deep} stroke={C_SU.core} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <g className="g32-su-wax" style={d(delayMs + 240)}>
          <circle cx="20" cy="11" r="5" fill={C_SU.core} stroke={C_SU.glow} strokeWidth="1.8" />
        </g>
        <g className="g32-su-glow" style={d(delayMs + 430)}>
          <circle cx="20" cy="25" r="5" fill={C_SU.glow} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Hall tint="rgba(176,86,60,0.28)" delayMs={delayMs} />
      <P x={50} y={71} w={22} h={4} cls="g32-tell" style={{ background: C_SU.deep, borderRadius: "50%", ...d(delayMs + 60) }} />
      <P x={50} y={56} w={22} h={26} cls="g32-su-urn" style={d(delayMs + 180)}>
        <svg viewBox="0 0 90 110" className="block h-full w-full">
          <path d="M30 12h30l12 52q0 34-27 34T18 64z" fill={C_SU.deep} stroke={C_SU.core} strokeWidth="7" strokeLinejoin="round" />
        </svg>
      </P>
      <P x={50} y={48} w={17} h={3} cls="g32-su-cord" style={{ background: C_SU.core, ...d(delayMs + 320) }} />
      <P x={50} y={43} w={9} h={9} cls="g32-su-wax" style={d(delayMs + 460)}>
        <svg viewBox="0 0 50 50" className="block h-full w-full">
          <circle cx="25" cy="25" r="20" fill={C_SU.core} stroke={C_SU.deep} strokeWidth="5" />
          <path d="M25 12l4 11h11l-9 7 4 11-10-7-10 7 4-11-9-7h11z" fill={C_SU.glow} />
        </svg>
      </P>
      <P x={50} y={45} w={1.8} h={12} cls="g32-su-crack" style={{ background: C_SU.glow, ...d(delayMs + 640) }} />
      <P x={50} y={60} w={12} h={12} cls="g32-su-glow" style={{ background: `radial-gradient(circle, ${C_SU.glow}, transparent 70%)`, ...d(delayMs + 760) }} />
      <Fall color={C_SU.core} delayMs={delayMs + 830} n={3} />
    </Wide>
  );
}

/* =============================================================================
   14. Glass Bridge (t3) — THE PEG BOARD. Tell: the chosen rank is ruled off
   across the whole board. Strike: a ball is released at the top and knocked
   left and right down four rows of pegs. Settle: it drops into one of the two
   slots; the other one is a hole, and it stays open.
   ========================================================================== */

const C_PB = { core: "#6fc0d8", glow: "#fff2e2", deep: "#14283a" };
const PB_PEGS = [
  { x: 46, y: 46 },
  { x: 54, y: 46 },
  { x: 42, y: 53 },
  { x: 50, y: 53 },
  { x: 58, y: 53 },
];

function GlassBridgeScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g32-hit" style={d(delayMs)}>
          <rect x="8" y="12" width="24" height="16" fill="none" stroke={C_PB.core} strokeWidth="2.4" />
          <circle cx="15" cy="18" r="2.2" fill={C_PB.core} />
          <circle cx="25" cy="18" r="2.2" fill={C_PB.core} />
        </g>
        <g className="g32-pb-slot" style={d(delayMs + 210)}>
          <rect x="12" y="28" width="7" height="7" fill={C_PB.deep} />
          <rect x="21" y="28" width="7" height="7" fill={C_PB.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g32-arrive" style={d(delayMs)}>
          <rect x="8" y="8" width="24" height="22" fill={C_PB.deep} stroke={C_PB.core} strokeWidth="2.4" />
          <circle cx="16" cy="16" r="2.2" fill={C_PB.core} />
          <circle cx="24" cy="16" r="2.2" fill={C_PB.core} />
        </g>
        <g className="g32-pb-ball" style={d(delayMs + 250)}>
          <circle cx="20" cy="10" r="3.4" fill={C_PB.glow} />
        </g>
        <g className="g32-pb-slot" style={d(delayMs + 430)}>
          <rect x="22" y="30" width="8" height="6" fill={C_PB.glow} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Rule color="rgba(111,192,216,0.42)" delayMs={delayMs} y={50} h={12} />
      <P x={50} y={40} w={5} h={5} cls="g32-tell" style={{ background: C_PB.glow, borderRadius: "50%", ...d(delayMs + 60) }} />
      <P x={50} y={53} w={26} h={26} cls="g32-pb-frame" style={d(delayMs + 180)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <rect x="6" y="6" width="88" height="88" fill="none" stroke={C_PB.core} strokeWidth="7" />
        </svg>
      </P>
      {PB_PEGS.map((p, i) => (
        <P
          key={i}
          x={p.x}
          y={p.y}
          w={2.6}
          h={2.6}
          cls="g32-pb-peg"
          style={{ background: C_PB.core, borderRadius: "50%", ...d(delayMs + 260 + i * 60) }}
        />
      ))}
      <P x={50} y={42} w={4.4} h={4.4} cls="g32-pb-ball" style={{ background: C_PB.glow, borderRadius: "50%", ...d(delayMs + 500) }} />
      <P x={44} y={63} w={9} h={8} cls="g32-pb-slot" style={{ background: C_PB.deep, border: `2px solid ${C_PB.core}`, ...d(delayMs + 700) }} />
      <P x={56} y={63} w={9} h={8} cls="g32-pb-lit" style={{ background: C_PB.glow, ...d(delayMs + 780) }} />
      <Fall color={C_PB.core} delayMs={delayMs + 840} n={3} />
    </Wide>
  );
}

/* =============================================================================
   15. Petting Zoo (t3) — THE TOMBOLA TUB. Tell: the skirt round the tub lifts
   in the draught. Strike: an arm goes in to the elbow and turns the tickets
   over. Settle: three folded tickets come up, are pegged on the line, and
   unfold into a goat, a duck and a sheep.
   ========================================================================== */

const C_TB = { core: "#c88fd0", glow: "#fff0e4", deep: "#2c1636" };
const TB_TICKETS = [42, 50, 58];

function PettingZooScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g32-hit" style={d(delayMs)}>
          <path d="M9 16h22l-3 16H12z" fill={C_TB.core} stroke={C_TB.deep} strokeWidth="2" strokeLinejoin="round" />
        </g>
        <g className="g32-tb-ticket" style={d(delayMs + 210)}>
          <rect x="15" y="6" width="11" height="9" fill={C_TB.glow} stroke={C_TB.deep} strokeWidth="1.6" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g32-arrive" style={d(delayMs)}>
          <path d="M8 15h24l-4 18H12z" fill={C_TB.deep} stroke={C_TB.core} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <g className="g32-tb-arm" style={d(delayMs + 240)}>
          <path d="M20 4v13" stroke={C_TB.glow} strokeWidth="3.4" strokeLinecap="round" />
        </g>
        <g className="g32-tb-ticket" style={d(delayMs + 430)}>
          <rect x="15" y="7" width="11" height="8" fill={C_TB.glow} stroke={C_TB.deep} strokeWidth="1.6" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Hall tint="rgba(200,143,208,0.26)" delayMs={delayMs} />
      <P x={50} y={72} w={26} h={4} cls="g32-tell" style={{ background: C_TB.deep, borderRadius: "50%", ...d(delayMs + 60) }} />
      <P x={50} y={62} w={28} h={18} cls="g32-tb-tub" style={d(delayMs + 180)}>
        <svg viewBox="0 0 110 70" className="block h-full w-full">
          <path d="M8 8h94l-12 56H20z" fill={C_TB.deep} stroke={C_TB.core} strokeWidth="7" strokeLinejoin="round" />
        </svg>
      </P>
      <P x={50} y={71} w={30} h={6} cls="g32-tb-skirt" style={{ background: C_TB.core, ...d(delayMs + 260) }} />
      <P x={50} y={48} w={5} h={20} cls="g32-tb-arm" style={{ background: C_TB.glow, ...d(delayMs + 380) }} />
      {TB_TICKETS.map((x, i) => (
        <P
          key={i}
          x={x}
          y={44}
          w={7}
          h={6}
          cls="g32-tb-ticket"
          style={dv(delayMs + 560 + i * 90, { "--g32-mr": `${(i - 1) * 16}deg` })}
        >
          <svg viewBox="0 0 40 34" className="block h-full w-full">
            <rect x="3" y="3" width="34" height="28" fill={C_TB.glow} stroke={C_TB.deep} strokeWidth="4" />
            <path d="M11 17h18" stroke={C_TB.deep} strokeWidth="4" strokeLinecap="round" />
          </svg>
        </P>
      ))}
      <P x={50} y={38} w={30} h={2} cls="g32-tb-line" style={{ background: C_TB.core, ...d(delayMs + 780) }} />
      <Fall color={C_TB.glow} delayMs={delayMs + 840} n={3} />
    </Wide>
  );
}

/* =============================================================================
   16. Poltergeist (t2) — THE BOTTOM DEAL. Tell: the top card of the shoe lifts
   a hair and does not go anywhere. Strike: a card comes out from UNDERNEATH
   instead and skids down the lane, its run scaled by --fx-len. Settle: a
   finger mark is left on the baize where nobody was standing.
   ========================================================================== */

const C_CS = { core: "#4f7a52", glow: "#ffefd4", deep: "#101c12" };

function PoltergeistScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g32-hit" style={d(delayMs)}>
          <rect x="9" y="14" width="22" height="14" fill={C_CS.core} stroke={C_CS.deep} strokeWidth="2" />
          <path d="M9 24h22" stroke={C_CS.glow} strokeWidth="2.2" />
        </g>
        <g className="g32-cs-skid" style={d(delayMs + 210)}>
          <path d="M6 31h28" stroke={C_CS.glow} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g32-arrive" style={d(delayMs)}>
          <path d="M8 12h24l-3 16H8z" fill={C_CS.deep} stroke={C_CS.core} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <g className="g32-cs-slide" style={d(delayMs + 250)}>
          <rect x="10" y="24" width="16" height="9" fill={C_CS.glow} stroke={C_CS.deep} strokeWidth="1.6" />
        </g>
        <g className="g32-cs-skid" style={d(delayMs + 430)}>
          <path d="M6 36h28" stroke={C_CS.core} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <>
      <Wide>
        <Hall tint="rgba(79,122,82,0.28)" delayMs={delayMs} />
        <Fall color={C_CS.glow} delayMs={delayMs + 800} n={3} />
      </Wide>
      <Aim>
        <P x={42} y={46} w={16} h={3} cls="g32-tell" style={{ background: C_CS.glow, ...d(delayMs + 60) }} />
        <P x={42} y={52} w={20} h={16} cls="g32-cs-shoe" style={d(delayMs + 190)}>
          <svg viewBox="0 0 90 70" className="block h-full w-full">
            <path d="M8 8h74l-14 54H8z" fill={C_CS.deep} stroke={C_CS.core} strokeWidth="7" strokeLinejoin="round" />
          </svg>
        </P>
        <P x={42} y={59} w={7} h={4} cls="g32-cs-finger" style={{ background: C_CS.core, borderRadius: "50%", ...d(delayMs + 340) }} />
        <span className="g32-cs-under absolute inset-0 block" style={d(delayMs + 480)}>
          <P x={50} y={58} w={10} h={6} style={{ background: C_CS.glow, border: `2px solid ${C_CS.deep}` }} />
        </span>
        <P x={50} y={62} w={28} h={2} cls="g32-cs-skid" style={{ background: C_CS.core, ...d(delayMs + 700) }} />
      </Aim>
    </>
  );
}

/* =============================================================================
   17. Honor Roll (t1) — THE CERTIFIED WEIGHT. Tell: the beam is unlocked and
   sags a degree. Strike: the sealed weight is lowered onto the far pan and the
   two swing against each other. Settle: they come level, hold, and the gilt
   mark is struck on the near pan.
   ========================================================================== */

const C_BL = { core: "#cbb26a", glow: "#fff4d6", deep: "#2a2210" };

function HonorRollScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g32-hit" style={d(delayMs)}>
          <path d="M20 8v22M8 14h24" stroke={C_BL.core} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M4 20h10l-5 6z" fill={C_BL.glow} />
          <path d="M26 20h10l-5 6z" fill={C_BL.glow} />
        </g>
        <g className="g32-hit2" style={d(delayMs + 210)}>
          <circle cx="20" cy="33" r="3.4" fill={C_BL.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g32-arrive" style={d(delayMs)}>
          <path d="M20 7v24M8 31h24" stroke={C_BL.core} strokeWidth="2.6" strokeLinecap="round" />
        </g>
        <g className="g32-bl-beam" style={d(delayMs + 240)}>
          <path d="M7 13h26" stroke={C_BL.glow} strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="g32-bl-gilt" style={d(delayMs + 430)}>
          <path d="M20 16l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill={C_BL.glow} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Cordon color="rgba(203,178,106,0.45)" delayMs={delayMs} />
      <P x={50} y={50} w={3} h={24} cls="g32-tell" style={{ background: C_BL.deep, ...d(delayMs + 60) }} />
      <P x={50} y={41} w={30} h={3} cls="g32-bl-beam" style={{ background: C_BL.core, ...d(delayMs + 190) }} />
      <P x={38} y={52} w={13} h={9} cls="g32-bl-panL" style={d(delayMs + 300)}>
        <svg viewBox="0 0 70 50" className="block h-full w-full">
          <path d="M4 8h62l-16 34H20z" fill="none" stroke={C_BL.core} strokeWidth="6" strokeLinejoin="round" />
        </svg>
      </P>
      <P x={62} y={52} w={13} h={9} cls="g32-bl-panR" style={d(delayMs + 300)}>
        <svg viewBox="0 0 70 50" className="block h-full w-full">
          <path d="M4 8h62l-16 34H20z" fill="none" stroke={C_BL.core} strokeWidth="6" strokeLinejoin="round" />
        </svg>
      </P>
      <P x={62} y={46} w={8} h={8} cls="g32-bl-weight" style={d(delayMs + 480)}>
        <svg viewBox="0 0 40 40" className="block h-full w-full">
          <path d="M9 34l3-24h16l3 24z" fill={C_BL.deep} stroke={C_BL.core} strokeWidth="5" strokeLinejoin="round" />
        </svg>
      </P>
      <P x={38} y={51} w={9} h={9} cls="g32-bl-gilt" style={d(delayMs + 720)}>
        <svg viewBox="0 0 40 40" className="block h-full w-full">
          <path d="M20 3l4 11 11 4-11 4-4 11-4-11-11-4 11-4z" fill={C_BL.glow} />
        </svg>
      </P>
      <Fall color={C_BL.core} delayMs={delayMs + 800} n={3} />
    </Wide>
  );
}

/* =============================================================================
   18. Late Spring (t1) — THE LOADED DIE. Tell: the die is set on its corner.
   Strike: it is rolled out and tumbles honestly for exactly as long as it can.
   Settle: it rocks onto the wrong face, creeps back a degree under its own
   weight, and the floor payout slides in from the caster's own end.
   ========================================================================== */

const C_LD = { core: "#e0d8c8", glow: "#fff6e2", deep: "#2e2a20" };

function LateSpringScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g32-hit" style={d(delayMs)}>
          <rect x="10" y="10" width="20" height="20" fill={C_LD.core} stroke={C_LD.deep} strokeWidth="2" />
          <circle cx="20" cy="20" r="3" fill={C_LD.deep} />
        </g>
        <g className="g32-ld-floor" style={d(delayMs + 210)}>
          <path d="M6 34h28" stroke={C_LD.glow} strokeWidth="2.8" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g32-ld-roll" style={d(delayMs)}>
          <rect x="11" y="11" width="19" height="19" fill={C_LD.deep} stroke={C_LD.core} strokeWidth="2.4" />
          <circle cx="16" cy="16" r="2.4" fill={C_LD.glow} />
          <circle cx="25" cy="25" r="2.4" fill={C_LD.glow} />
        </g>
        <g className="g32-ld-lean" style={d(delayMs + 250)}>
          <path d="M9 33h22" stroke={C_LD.core} strokeWidth="2.6" strokeLinecap="round" />
        </g>
        <g className="g32-ld-pip" style={d(delayMs + 430)}>
          <circle cx="25" cy="16" r="2.6" fill={C_LD.glow} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Hall tint="rgba(224,216,200,0.22)" delayMs={delayMs} />
      <P x={50} y={68} w={20} h={3.4} cls="g32-tell" style={{ background: C_LD.deep, borderRadius: "50%", ...d(delayMs + 60) }} />
      <P x={50} y={56} w={18} h={18} cls="g32-ld-roll" style={d(delayMs + 190)}>
        <svg viewBox="0 0 80 80" className="block h-full w-full">
          <rect x="6" y="6" width="68" height="68" fill={C_LD.core} stroke={C_LD.deep} strokeWidth="7" />
          <circle cx="24" cy="24" r="7" fill={C_LD.deep} />
          <circle cx="56" cy="56" r="7" fill={C_LD.deep} />
          <circle cx="40" cy="40" r="7" fill={C_LD.deep} />
        </svg>
      </P>
      <P x={50} y={56} w={18} h={18} cls="g32-ld-lean" style={{ border: `2px solid ${C_LD.glow}`, ...d(delayMs + 460) }} />
      <P x={54} y={53} w={4.4} h={4.4} cls="g32-ld-pip" style={{ background: C_LD.glow, borderRadius: "50%", ...d(delayMs + 620) }} />
      <P x={50} y={68} w={24} h={4} cls="g32-ld-floor" style={{ background: C_LD.glow, ...d(delayMs + 760) }} />
      <Fall color={C_LD.core} delayMs={delayMs + 820} n={3} />
    </Wide>
  );
}

/* =============================================================================
   19. Roll Call (t1) — THE BALLOT BOX. Tell: the slot in the lid catches the
   light. Strike: four slips go in one after another and the seal is broken.
   Settle: the tally is struck across the face, four strokes and a line, and
   absolutely nothing else happens.
   ========================================================================== */

const C_BB = { core: "#7a8fa8", glow: "#ffeedd", deep: "#182230" };
const BB_SLIPS = [0, 1, 2, 3];

function RollCallScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g32-hit" style={d(delayMs)}>
          <rect x="9" y="14" width="22" height="18" fill={C_BB.core} stroke={C_BB.deep} strokeWidth="2" />
          <rect x="15" y="11" width="10" height="3" fill={C_BB.deep} />
        </g>
        <g className="g32-bb-count" style={d(delayMs + 210)}>
          <path d="M12 22h4M18 22h4M24 22h4" stroke={C_BB.glow} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g32-arrive" style={d(delayMs)}>
          <rect x="8" y="13" width="24" height="20" fill={C_BB.deep} stroke={C_BB.core} strokeWidth="2.4" />
          <rect x="15" y="10" width="10" height="3.4" fill={C_BB.core} />
        </g>
        <g className="g32-bb-slip" style={d(delayMs + 240)}>
          <rect x="16" y="3" width="8" height="8" fill={C_BB.glow} stroke={C_BB.deep} strokeWidth="1.6" />
        </g>
        <g className="g32-bb-count" style={d(delayMs + 430)}>
          <path d="M13 24h14" stroke={C_BB.glow} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Cordon color="rgba(122,143,168,0.45)" delayMs={delayMs} />
      <P x={50} y={49} w={12} h={2.4} cls="g32-tell" style={{ background: C_BB.glow, ...d(delayMs + 60) }} />
      <P x={50} y={60} w={26} h={20} cls="g32-bb-box" style={d(delayMs + 180)}>
        <svg viewBox="0 0 110 84" className="block h-full w-full">
          <rect x="6" y="14" width="98" height="64" fill={C_BB.deep} stroke={C_BB.core} strokeWidth="7" />
          <rect x="38" y="6" width="34" height="9" fill={C_BB.core} />
        </svg>
      </P>
      {BB_SLIPS.map((i) => (
        <P
          key={i}
          x={50}
          y={44}
          w={6}
          h={6}
          cls="g32-bb-slip"
          style={dv(delayMs + 280 + i * 90, { "--g32-mx": `${(i - 1.5) * 60}%` })}
        >
          <svg viewBox="0 0 34 34" className="block h-full w-full">
            <rect x="3" y="3" width="28" height="28" fill={C_BB.glow} stroke={C_BB.deep} strokeWidth="4" />
          </svg>
        </P>
      ))}
      <P x={50} y={53} w={11} h={7} cls="g32-bb-lock" style={d(delayMs + 620)}>
        <svg viewBox="0 0 60 40" className="block h-full w-full">
          <rect x="8" y="16" width="44" height="20" fill={C_BB.core} stroke={C_BB.deep} strokeWidth="5" />
          <path d="M18 16V10a12 12 0 0 1 24 0v6" fill="none" stroke={C_BB.glow} strokeWidth="5" />
        </svg>
      </P>
      <P x={50} y={64} w={20} h={7} cls="g32-bb-count" style={d(delayMs + 760)}>
        <svg viewBox="0 0 100 34" className="block h-full w-full">
          <path d="M14 6v22M30 6v22M46 6v22M62 6v22M8 28l60-22" stroke={C_BB.glow} strokeWidth="6" strokeLinecap="round" />
        </svg>
      </P>
      <Fall color={C_BB.core} delayMs={delayMs + 830} n={3} />
    </Wide>
  );
}

/* =============================================================================
   20. Sap Run (t1) — THE LEVEL AND THE SHIM. Tell: the vial is wiped and the
   bubble is read. Strike: a wedge is tapped in under the far end and the whole
   level tips. Settle: the bubble walks off centre and a bead runs the length of
   the tool, its travel scaled by --fx-len.
   ========================================================================== */

const C_SL = { core: "#e8b33c", glow: "#fff4d8", deep: "#2e2208" };

function SapRunScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g32-hit" style={d(delayMs)}>
          <rect x="5" y="16" width="30" height="9" fill={C_SL.core} stroke={C_SL.deep} strokeWidth="2" />
          <rect x="16" y="18" width="9" height="5" fill={C_SL.glow} />
        </g>
        <g className="g32-sl-drip" style={d(delayMs + 210)}>
          <circle cx="28" cy="30" r="3" fill={C_SL.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g32-arrive" style={d(delayMs)}>
          <rect x="5" y="15" width="30" height="10" fill={C_SL.deep} stroke={C_SL.core} strokeWidth="2.4" />
        </g>
        <g className="g32-sl-bubble" style={d(delayMs + 240)}>
          <circle cx="20" cy="20" r="3.4" fill={C_SL.glow} />
        </g>
        <g className="g32-sl-shim" style={d(delayMs + 430)}>
          <path d="M28 27h9l-9 5z" fill={C_SL.core} stroke={C_SL.deep} strokeWidth="1.6" strokeLinejoin="round" />
        </g>
      </Sq>
    );
  return (
    <>
      <Wide>
        <Rule color="rgba(232,179,60,0.3)" delayMs={delayMs} y={58} h={8} />
        <Fall color={C_SL.glow} delayMs={delayMs + 820} n={3} />
      </Wide>
      <Aim>
        <P x={50} y={44} w={20} h={2.6} cls="g32-tell" style={{ background: C_SL.glow, ...d(delayMs + 60) }} />
        <P x={50} y={52} w={34} h={8} cls="g32-sl-body" style={d(delayMs + 190)}>
          <svg viewBox="0 0 170 40" className="block h-full w-full">
            <rect x="4" y="6" width="162" height="28" fill={C_SL.deep} stroke={C_SL.core} strokeWidth="6" />
            <rect x="66" y="12" width="38" height="16" fill={C_SL.core} />
          </svg>
        </P>
        <P x={50} y={52} w={4} h={4} cls="g32-sl-bubble" style={{ background: C_SL.glow, borderRadius: "50%", ...d(delayMs + 380) }} />
        <P x={64} y={58} w={8} h={5} cls="g32-sl-shim" style={d(delayMs + 560)}>
          <svg viewBox="0 0 44 26" className="block h-full w-full">
            <path d="M2 4h40L2 24z" fill={C_SL.core} stroke={C_SL.deep} strokeWidth="4" strokeLinejoin="round" />
          </svg>
        </P>
        <span className="g32-sl-run absolute inset-0 block" style={d(delayMs + 720)}>
          <P x={50} y={56} w={3.4} h={3.4} style={{ background: C_SL.glow, borderRadius: "50%" }} />
        </span>
      </Aim>
    </>
  );
}

/* =============================================================================
   Registry. Every `sound` is an existing SigSoundKey and every card declares
   its anchor: "cast" for a machine standing on the cast square, "aim" for the
   four that run down the play's own vector.
   ========================================================================== */

function S(Render: SigPlugin["Render"], config: SigPlugin["config"]): SigPlugin {
  return { config, Render };
}

export const PLAYS: Record<string, SigPlugin> = {
  // --- the big machines: a raffle drum and a spinner ---
  ov_pandemonium_carnival: S(PandemoniumCarnivalScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true,
    sound: "gacha", anchor: "cast",
  }),
  ov_the_fool: S(TheFoolScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "wheel", anchor: "cast",
  }),

  // --- allotment and tempo: the kleroterion and the fifth bell ---
  ov_all_the_kings_men: S(AllTheKingsMenScene, {
    ordering: "radial", staggerMs: 70, victims: "all", hasLead: true,
    sound: "chips", anchor: "cast",
  }),
  ov_monks_of_the_fifth_bell: S(MonksFifthBellScene, {
    ordering: "line", staggerMs: 60, victims: ["p"], hasLead: true,
    sound: "wheel", anchor: "cast",
  }),

  // --- the machines that run down a line ---
  ov_colossal_visitor: S(ColossalVisitorScene, {
    ordering: "line", staggerMs: 55, victims: "all", hasLead: true,
    sound: "slots", anchor: "aim",
  }),
  ov_grail_quest: S(GrailQuestScene, {
    ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true,
    sound: "vault", anchor: "cast",
  }),

  // --- draws made blind ---
  ov_emergency_patch: S(EmergencyPatchScene, {
    ordering: "radial", staggerMs: 50, victims: ["b", "r", "q"], hasLead: true,
    sound: "chips", anchor: "cast",
  }),
  bn4_care_package: S(CarePackageScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "gacha", anchor: "cast",
  }),
  ov_demolition_derby: S(DemolitionDerbyScene, {
    ordering: "radial", staggerMs: 55, victims: "all", hasLead: true,
    sound: "dice", anchor: "cast",
  }),
  ov_flash_mob: S(FlashMobScene, {
    ordering: "line", staggerMs: 60, victims: ["p"], hasLead: true,
    sound: "slots", anchor: "cast",
  }),

  // --- the small honest machines ---
  hx4_will_o_wisps: S(WillOWispsScene, {
    ordering: "radial", staggerMs: 55, victims: "all", hasLead: true,
    sound: "gacha", anchor: "cast",
  }),
  ov_booster_pack: S(BoosterPackScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "slots", anchor: "cast",
  }),
  ov_dragon_egg: S(DragonEggScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "vault", source: "summon", anchor: "cast",
  }),
  ov_glass_bridge: S(GlassBridgeScene, {
    ordering: "line", staggerMs: 55, victims: "all", hasLead: true,
    sound: "bust", anchor: "cast",
  }),
  ov_petting_zoo: S(PettingZooScene, {
    ordering: "radial", staggerMs: 65, victims: ["p"], hasLead: true,
    sound: "chips", source: "summon", anchor: "cast",
  }),

  // --- and the machines with a thumb on them ---
  ov_poltergeist: S(PoltergeistScene, {
    ordering: "line", staggerMs: 0, victims: ["p"], hasLead: true,
    sound: "bust", anchor: "aim",
  }),
  op_honor_roll: S(HonorRollScene, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true,
    sound: "chips", anchor: "cast",
  }),
  op_late_spring: S(LateSpringScene, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true,
    sound: "dice", anchor: "cast",
  }),
  op_roll_call: S(RollCallScene, {
    ordering: "line", staggerMs: 55, victims: "all", hasLead: true,
    sound: "vault", anchor: "cast",
  }),
  op_sap_run: S(SapRunScene, {
    ordering: "line", staggerMs: 0, victims: ["p"], hasLead: true,
    sound: "bust", anchor: "aim",
  }),
};
