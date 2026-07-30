// Bespoke plugin signatures for the g31 CHANCE batch: 20 wager / fortune /
// omen cards that all used to share the generated `coinFlip` family. See
// sigPlugins.tsx for the contract. Self-contained: own inline SVG, own CSS
// (g31ChancePlays.css), transform/opacity only, no import from
// BoardEffects.tsx (cycle hazard), and only the SigPlugin TYPE imported from
// sigPlugins.tsx.
//
// MODULE FICTION: THE MOMENT OF CHANCE RESOLVING. Each scene is a different way
// a gamble actually LANDS. A trunk lid thrown open on a lucky dip; a cork
// leaving a bottle; a toll coin skipping the water; a duck hooked off a pond;
// a coin held spinning on its edge; chairs going up at closing time; mist
// parting inside a ball; a hazel rod dipping; a bead pendulum stopping dead; a
// nugget cracked open by the assay hammer; a clover plucked out of parted
// grass; a folded slip drawn from a hat; the last nail driven home; a curtain
// pulled round a booth; a rabbit's foot cast like a knucklebone; dividers
// walked across a chart; a good hat lifted off its peg; tea dregs settling into
// a shape; a wishbone snapping; a penny toppling into a jar. No two cards share
// a central object, and no card is a recoloured coin of another.
//
// Rules kept everywhere: three beats (a tell of at most ~300ms, the strike,
// then a decaying settle); five or more animated layers in every lead cut;
// exactly three palette colours per card (core / glow / deep), warm whites and
// never pure #fff; anything that means THE WHOLE BOARD lives inside
// <BoardFrame> so it stays exactly the board at any anchor; at least one
// animated layer per scene is driven by the geometry vars (--fx-side,
// --fx-len, --fx-index); every card declares anchor "cast" or "aim"; and every
// scene answers all three roles, entrance included.
//
// Where a card's rule forks (the coin-flip openers, the wishbone, the penny),
// the SETTLE beat carries which way it went: one half keeps its light, the
// other greys out and sags.

import "./g31ChancePlays.css";

import type { CSSProperties, ReactNode } from "react";
import type { SigPlugin, SigRole } from "./sigPlugins";
import { BoardWideStage, BoardFrame, AimStage } from "./stage";

interface SceneProps {
  lead: boolean;
  role: SigRole;
  delayMs: number;
}

/* =============================================================================
   Shared staging. The helpers below are POSITIONING and beat plumbing only:
   every card's central object, strike and settle are its own art.
   ========================================================================== */

/** Inline animation-delay: every choreography offset flows through this. */
const d = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });
/** Delay plus arbitrary custom properties (lanes, throws, travel distances). */
const dv = (ms: number, vars: Record<string, string>): CSSProperties =>
  ({ animationDelay: `${ms}ms`, ...vars }) as CSSProperties;

/** The board-wide scene canvas, anchored on the cast square. */
function Wide({ children }: { children: ReactNode }) {
  return (
    <BoardWideStage>
      <span className="g31 absolute inset-0 block">{children}</span>
    </BoardWideStage>
  );
}

/** The same canvas, rotated onto the play's own source -> target vector.
 *  Art inside is authored pointing RIGHT (+x). */
function Aim({ children }: { children: ReactNode }) {
  return (
    <AimStage>
      <span className="g31 absolute inset-0 block">{children}</span>
    </AimStage>
  );
}

/** Square-local cut: the per-victim hit and the in-hand arrival. */
function Sq({ children }: { children: ReactNode }) {
  return (
    <span className="g31 pointer-events-none absolute inset-0 z-20 block" aria-hidden="true">
      <svg viewBox="0 0 40 40" className="block h-full w-full">
        {children}
      </svg>
    </span>
  );
}

/**
 * A positioned prop inside a stage. `x`/`y` are the prop's CENTRE and `w`/`h`
 * its size, all in stage percent (the stage is 14 cells across, so one board
 * square is 7.142857% and the cast square's centre is 50% / 50%).
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

/** The lit table the wager happens on. */
function Felt({ tint, delayMs }: { tint: string; delayMs: number }) {
  return (
    <BoardFrame>
      <span
        className="g31-felt absolute inset-0 block"
        style={{ background: `radial-gradient(circle at 50% 50%, ${tint}, transparent 72%)`, ...d(delayMs) }}
      />
    </BoardFrame>
  );
}

/** The rim of the table: a hairline ring around the whole board. */
function Rail({ color, delayMs }: { color: string; delayMs: number }) {
  return (
    <BoardFrame>
      <span className="g31-rail absolute inset-0 block" style={{ border: `2px solid ${color}`, ...d(delayMs) }} />
    </BoardFrame>
  );
}

/** A band laid across the whole board: the water, the grass line, the counter. */
function Band({ color, delayMs, y = 50, h = 7 }: { color: string; delayMs: number; y?: number; h?: number }) {
  return (
    <BoardFrame>
      <span
        className="g31-band absolute block"
        style={{ left: 0, width: "100%", top: `${y - h / 2}%`, height: `${h}%`, background: color, ...d(delayMs) }}
      />
    </BoardFrame>
  );
}

/** Settle motes crossing the board, leaning AWAY from the caster (--fx-side). */
function Drift({ color, delayMs, n = 4 }: { color: string; delayMs: number; n?: number }) {
  return (
    <BoardFrame>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className="g31-drift absolute block"
          style={{
            left: `${11 + i * 21}%`,
            top: `${26 + (i % 3) * 20}%`,
            width: "2.4%",
            height: "2.4%",
            borderRadius: "50%",
            background: color,
            ...d(delayMs + i * 95),
          }}
        />
      ))}
    </BoardFrame>
  );
}

/* =============================================================================
   1. Costume Trunk (t7) — THE LUCKY DIP. Tell: the lid takes weight and the
   trunk's shadow squashes. Strike: the lid is thrown back and three costumes
   are flung out on separate arcs. Settle: stage dust drifts off the board.
   ========================================================================== */

const C_TK = { core: "#e0a3c8", glow: "#fff0e2", deep: "#3a1430" };
const TK_LOTS = [
  { mx: "-215%", my: "-160%", mr: "-38deg" },
  { mx: "10%", my: "-245%", mr: "14deg" },
  { mx: "220%", my: "-150%", mr: "44deg" },
];

function TkMask({ fill }: { fill: string }) {
  return (
    <svg viewBox="0 0 100 100" className="block h-full w-full">
      <path d="M18 26h64c0 30-12 50-32 50S18 56 18 26z" fill={fill} stroke={C_TK.deep} strokeWidth="6" strokeLinejoin="round" />
      <ellipse cx="36" cy="45" rx="8" ry="5.5" fill={C_TK.deep} />
      <ellipse cx="64" cy="45" rx="8" ry="5.5" fill={C_TK.deep} />
      <path d="M38 63q12 8 24 0" fill="none" stroke={C_TK.deep} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function CostumeTrunkScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g31-hit" style={d(delayMs)}>
          <path d="M8 12h24c0 12-5 20-12 20S8 24 8 12z" fill={C_TK.core} stroke={C_TK.deep} strokeWidth="2" strokeLinejoin="round" />
          <ellipse cx="15" cy="19" rx="2.6" ry="2" fill={C_TK.deep} />
          <ellipse cx="25" cy="19" rx="2.6" ry="2" fill={C_TK.deep} />
        </g>
        <g className="g31-hit2" style={d(delayMs + 210)}>
          <path d="M6 33q14 6 28 0" fill="none" stroke={C_TK.glow} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g31-arrive" style={d(delayMs)}>
          <rect x="6" y="18" width="28" height="16" fill={C_TK.deep} stroke={C_TK.core} strokeWidth="2.4" />
          <rect x="17" y="22" width="6" height="8" fill={C_TK.core} />
        </g>
        <g className="g31-tk-peek" style={d(delayMs + 210)}>
          <path d="M13 17h14c0 6-3 10-7 10s-7-4-7-10z" fill={C_TK.glow} stroke={C_TK.deep} strokeWidth="1.8" />
        </g>
        <g className="g31-arrive-soft" style={d(delayMs + 380)}>
          <path d="M6 18q14-9 28 0" fill="none" stroke={C_TK.core} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Felt tint="rgba(224,163,200,0.34)" delayMs={delayMs} />
      <P x={50} y={63} w={26} h={4.4} cls="g31-tell" style={{ background: C_TK.deep, borderRadius: "50%", ...d(delayMs) }} />
      <P x={50} y={56} w={24} h={13} cls="g31-pop" style={d(delayMs + 130)}>
        <svg viewBox="0 0 100 56" className="block h-full w-full">
          <rect x="5" y="6" width="90" height="44" fill={C_TK.deep} stroke={C_TK.core} strokeWidth="5" />
          <rect x="41" y="18" width="18" height="20" fill={C_TK.core} />
        </svg>
      </P>
      <P x={50} y={47.5} w={24} h={8} cls="g31-tk-lid" style={d(delayMs + 210)}>
        <svg viewBox="0 0 100 34" className="block h-full w-full">
          <path d="M5 32V17q0-14 45-14t45 14v15z" fill={C_TK.deep} stroke={C_TK.core} strokeWidth="5" strokeLinejoin="round" />
        </svg>
      </P>
      {TK_LOTS.map((m, i) => (
        <P
          key={i}
          x={50}
          y={47}
          w={9.5}
          h={9.5}
          cls="g31-tk-fling"
          style={dv(delayMs + 330 + i * 110, { "--g31-mx": m.mx, "--g31-my": m.my, "--g31-mr": m.mr })}
        >
          <TkMask fill={i === 1 ? C_TK.glow : C_TK.core} />
        </P>
      ))}
      <Drift color={C_TK.glow} delayMs={delayMs + 660} n={4} />
    </Wide>
  );
}

/* =============================================================================
   2. Bottled Courage (t6) — THE CORK. Tell: the bottle quivers under thumb.
   Strike: the cork leaves, away from the caster, trailing spray. Settle: the
   draught spills out over the neighbours and the bottle rocks back down.
   ========================================================================== */

const C_BC = { core: "#ffb45a", glow: "#fff2d2", deep: "#3a2008" };

function BottledCourageScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g31-hit" style={d(delayMs)}>
          <path d="M20 6l3 8v18a5 5 0 0 1-6 0V14z" fill={C_BC.core} stroke={C_BC.deep} strokeWidth="2" strokeLinejoin="round" />
        </g>
        <g className="g31-bc-spill" style={d(delayMs + 190)}>
          <path d="M8 30q12 8 24 0" fill="none" stroke={C_BC.glow} strokeWidth="3" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g31-arrive" style={d(delayMs)}>
          <path d="M20 9l4 9v15a6 6 0 0 1-8 0V18z" fill={C_BC.deep} stroke={C_BC.core} strokeWidth="2.4" strokeLinejoin="round" />
          <rect x="17" y="21" width="6" height="8" fill={C_BC.core} />
        </g>
        <g className="g31-bc-cork" style={d(delayMs + 200)}>
          <rect x="17" y="4" width="6" height="6" fill={C_BC.glow} stroke={C_BC.deep} strokeWidth="1.6" />
        </g>
        <g className="g31-arrive-soft" style={d(delayMs + 400)}>
          <circle cx="20" cy="24" r="11" fill="none" stroke={C_BC.core} strokeWidth="1.8" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Felt tint="rgba(255,180,90,0.32)" delayMs={delayMs} />
      <P x={50} y={57} w={16} h={20} cls="g31-bc-shake" style={d(delayMs)}>
        <svg viewBox="0 0 60 100" className="block h-full w-full">
          <path d="M30 10l9 22v52a14 8 0 0 1-18 0V32z" fill={C_BC.deep} stroke={C_BC.core} strokeWidth="5" strokeLinejoin="round" />
          <rect x="20" y="48" width="20" height="22" fill={C_BC.core} />
        </svg>
      </P>
      <P x={50} y={45} w={5} h={6} cls="g31-bc-cork" style={d(delayMs + 240)}>
        <svg viewBox="0 0 40 46" className="block h-full w-full">
          <rect x="8" y="4" width="24" height="38" fill={C_BC.glow} stroke={C_BC.deep} strokeWidth="4" />
        </svg>
      </P>
      {[0, 1, 2].map((i) => (
        <P
          key={i}
          x={50}
          y={45}
          w={2.6}
          h={2.6}
          cls="g31-bc-spray"
          style={{
            background: C_BC.glow,
            borderRadius: "50%",
            ...dv(delayMs + 300 + i * 70, {
              "--g31-mx": `${[-190, 30, 200][i]}%`,
              "--g31-my": `${[-230, -300, -210][i]}%`,
            }),
          }}
        />
      ))}
      <P
        x={50}
        y={57}
        w={30}
        h={30}
        cls="g31-bc-draught"
        style={{ border: `3px solid ${C_BC.glow}`, borderRadius: "50%", ...d(delayMs + 420) }}
      />
      <P x={50} y={57} w={22} h={22} cls="g31-bc-draught" style={{ border: `2px solid ${C_BC.core}`, borderRadius: "50%", ...d(delayMs + 540) }} />
      <Drift color={C_BC.core} delayMs={delayMs + 700} n={3} />
    </Wide>
  );
}

/* =============================================================================
   3. Ferryman's Coin (t4) — THE TOLL. Tell: the dark water rises across the
   midline. Strike: the coin skips down the crossing vector and drops in.
   Settle: the ripple widens and the road home seals behind it.
   ========================================================================== */

const C_FM = { core: "#7fa8c9", glow: "#e6f2fb", deep: "#101d2e" };

function FerrymansCoinScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g31-hit" style={d(delayMs)}>
          <circle cx="20" cy="18" r="7" fill={C_FM.core} stroke={C_FM.deep} strokeWidth="2" />
          <path d="M17 18h6M20 15v6" stroke={C_FM.deep} strokeWidth="1.6" strokeLinecap="round" />
        </g>
        <g className="g31-fm-ripple" style={d(delayMs + 200)}>
          <ellipse cx="20" cy="28" rx="12" ry="4" fill="none" stroke={C_FM.glow} strokeWidth="2" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g31-arrive" style={d(delayMs)}>
          <circle cx="20" cy="19" r="10" fill={C_FM.deep} stroke={C_FM.core} strokeWidth="2.6" />
          <path d="M20 12v14M15 19h10" stroke={C_FM.glow} strokeWidth="2" strokeLinecap="round" />
        </g>
        <g className="g31-fm-ripple" style={d(delayMs + 240)}>
          <ellipse cx="20" cy="31" rx="13" ry="4.4" fill="none" stroke={C_FM.core} strokeWidth="2" />
        </g>
        <g className="g31-arrive-soft" style={d(delayMs + 400)}>
          <path d="M5 34q7-4 15 0t15 0" fill="none" stroke={C_FM.glow} strokeWidth="1.8" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <>
      <Wide>
        <Band color="rgba(16,29,46,0.62)" delayMs={delayMs} y={50} h={11} />
        <Drift color={C_FM.glow} delayMs={delayMs + 620} n={3} />
      </Wide>
      <Aim>
        <P x={50} y={50} w={4} h={12} cls="g31-tell" style={{ background: C_FM.core, ...d(delayMs) }} />
        <span className="g31-fm-travel absolute inset-0 block" style={d(delayMs + 200)}>
          <P x={50} y={50} w={4.4} h={4.4} style={{ background: C_FM.glow, borderRadius: "50%", border: `2px solid ${C_FM.deep}` }} />
        </span>
        <span className="g31-fm-land absolute inset-0 block" style={d(delayMs + 620)}>
          <P x={50} y={50} w={14} h={5} cls="g31-fm-ripple2" style={{ border: `2px solid ${C_FM.glow}`, borderRadius: "50%" }} />
        </span>
        <P x={50} y={50} w={3} h={16} cls="g31-fm-gate" style={{ background: C_FM.core, ...d(delayMs + 700) }} />
        <P x={50} y={50} w={26} h={2} cls="g31-fm-wake" style={{ background: C_FM.deep, ...d(delayMs + 780) }} />
      </Aim>
    </>
  );
}

/* =============================================================================
   4. Rubber Duck (t2) — HOOK-A-DUCK. Tell: the pond surface quivers. Strike:
   the hook comes down from the caster's side and lifts the duck clear, water
   sheeting off. Settle: the base is turned up to show its mark, drips fall.
   ========================================================================== */

const C_DK = { core: "#ffd45c", glow: "#fff6dd", deep: "#17402f" };

function DkDuck({ w = "100%" }: { w?: string }) {
  return (
    <svg viewBox="0 0 100 80" className="block h-full w-full" style={{ width: w }}>
      <path d="M22 58q-6-16 10-22 4-16 22-16 16 0 18 14l12 4-12 5q2 20-16 24z" fill={C_DK.core} stroke={C_DK.deep} strokeWidth="5" strokeLinejoin="round" />
      <circle cx="60" cy="30" r="3.4" fill={C_DK.deep} />
    </svg>
  );
}

function RubberDuckScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g31-hit" style={d(delayMs)}>
          <path d="M11 27q-3-8 5-11 2-8 11-8t9 7l6 2-6 2.5q1 10-8 12z" fill={C_DK.core} stroke={C_DK.deep} strokeWidth="2" strokeLinejoin="round" />
        </g>
        <g className="g31-dk-drip" style={d(delayMs + 220)}>
          <circle cx="16" cy="31" r="2" fill={C_DK.glow} />
          <circle cx="26" cy="33" r="1.5" fill={C_DK.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g31-dk-bob" style={d(delayMs)}>
          <path d="M11 26q-3-8 5-11 2-8 11-8t9 7l6 2-6 2.5q1 10-8 12z" fill={C_DK.core} stroke={C_DK.deep} strokeWidth="2.2" strokeLinejoin="round" />
        </g>
        <g className="g31-arrive-soft" style={d(delayMs + 220)}>
          <path d="M4 31q6-3 12 0t12 0 8 0" fill="none" stroke={C_DK.deep} strokeWidth="2.4" strokeLinecap="round" />
        </g>
        <g className="g31-hit2" style={d(delayMs + 360)}>
          <path d="M30 10l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4-4.4-1.6 4.4-1.6z" fill={C_DK.glow} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Band color="rgba(23,64,47,0.5)" delayMs={delayMs} y={58} h={9} />
      <Felt tint="rgba(255,212,92,0.24)" delayMs={delayMs + 60} />
      <P x={50} y={58} w={22} h={3} cls="g31-tell" style={{ background: C_DK.glow, borderRadius: "50%", ...d(delayMs) }} />
      <P x={50} y={46} w={4} h={16} cls="g31-dk-hook" style={d(delayMs + 180)}>
        <svg viewBox="0 0 24 90" className="block h-full w-full">
          <path d="M12 0v62q0 14 -8 14t-8-12" fill="none" stroke={C_DK.glow} strokeWidth="6" strokeLinecap="round" />
        </svg>
      </P>
      <P x={50} y={57} w={18} h={14} cls="g31-dk-lift" style={d(delayMs + 300)}>
        <DkDuck />
      </P>
      <P x={50} y={52} w={9} h={9} cls="g31-dk-base" style={d(delayMs + 620)}>
        <svg viewBox="0 0 60 60" className="block h-full w-full">
          <circle cx="30" cy="30" r="24" fill={C_DK.deep} stroke={C_DK.glow} strokeWidth="5" />
          <path d="M30 14l5 14h15l-12 9 5 15-13-9-13 9 5-15-12-9h15z" fill={C_DK.core} />
        </svg>
      </P>
      {[0, 1, 2].map((i) => (
        <P
          key={i}
          x={44 + i * 6}
          y={60}
          w={2.2}
          h={2.2}
          cls="g31-dk-fall"
          style={{ background: C_DK.glow, borderRadius: "50%", ...d(delayMs + 520 + i * 90) }}
        />
      ))}
    </Wide>
  );
}

/* =============================================================================
   5. Lucky Coin (t1) — THE SPIN HELD. Tell: the flick mark and the coin's
   shadow tighten. Strike: the coin spins on its edge and starts to wobble
   down. Settle: two brackets snap in and take it before it can land, and a
   reclaim clock starts counting against it.
   ========================================================================== */

const C_LC = { core: "#f0c04a", glow: "#fff3cf", deep: "#3a2a08" };

function LuckyCoinScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g31-lc-spin" style={d(delayMs)}>
          <ellipse cx="20" cy="19" rx="8" ry="8" fill={C_LC.core} stroke={C_LC.deep} strokeWidth="2" />
        </g>
        <g className="g31-hit2" style={d(delayMs + 230)}>
          <path d="M9 30h22" stroke={C_LC.glow} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g31-lc-spin" style={d(delayMs)}>
          <ellipse cx="20" cy="18" rx="9" ry="9" fill={C_LC.core} stroke={C_LC.deep} strokeWidth="2.4" />
          <path d="M20 12v12M16 18h8" stroke={C_LC.deep} strokeWidth="1.8" strokeLinecap="round" />
        </g>
        <g className="g31-arrive-soft" style={d(delayMs + 260)}>
          <ellipse cx="20" cy="31" rx="10" ry="2.6" fill={C_LC.deep} opacity="0.7" />
        </g>
        <g className="g31-hit2" style={d(delayMs + 400)}>
          <path d="M31 9l1.4 4 4 1.4-4 1.4-1.4 4-1.4-4-4-1.4 4-1.4z" fill={C_LC.glow} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Rail color="rgba(240,192,74,0.55)" delayMs={delayMs} />
      <P x={50} y={58} w={16} h={3} cls="g31-tell" style={{ background: C_LC.deep, borderRadius: "50%", ...d(delayMs) }} />
      <P x={50} y={51} w={12} h={12} cls="g31-lc-spin" style={d(delayMs + 150)}>
        <svg viewBox="0 0 60 60" className="block h-full w-full">
          <circle cx="30" cy="30" r="26" fill={C_LC.core} stroke={C_LC.deep} strokeWidth="5" />
          <path d="M30 12v36M16 30h28" stroke={C_LC.deep} strokeWidth="4" strokeLinecap="round" />
        </svg>
      </P>
      <P x={50} y={51} w={14} h={14} cls="g31-lc-wobble" style={{ border: `2px solid ${C_LC.glow}`, borderRadius: "50%", ...d(delayMs + 420) }} />
      <P x={41} y={51} w={5} h={12} cls="g31-lc-grabL" style={d(delayMs + 620)}>
        <svg viewBox="0 0 30 70" className="block h-full w-full">
          <path d="M26 4H8v62h18" fill="none" stroke={C_LC.glow} strokeWidth="7" strokeLinejoin="round" />
        </svg>
      </P>
      <P x={59} y={51} w={5} h={12} cls="g31-lc-grabR" style={d(delayMs + 620)}>
        <svg viewBox="0 0 30 70" className="block h-full w-full">
          <path d="M4 4h18v62H4" fill="none" stroke={C_LC.glow} strokeWidth="7" strokeLinejoin="round" />
        </svg>
      </P>
      {[0, 1, 2].map((i) => (
        <P
          key={i}
          x={50}
          y={44}
          w={1.8}
          h={1.8}
          cls="g31-lc-sand"
          style={{ background: C_LC.glow, borderRadius: "50%", ...d(delayMs + 820 + i * 120) }}
        />
      ))}
    </Wide>
  );
}

/* =============================================================================
   6. Chairs on Tables (t1) — CLOSING TIME. Tell: chair legs scrape once.
   Strike: the chair is swung up and lands legs-up on the table with a dust
   thump. Settle: a mop stroke passes and the CLOSED tag swings on its cord.
   ========================================================================== */

const C_CH = { core: "#c8a06a", glow: "#ffefd6", deep: "#2a1c10" };

function ChairsOnTablesScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g31-hit" style={d(delayMs)}>
          <path d="M11 24h18v3H11zM13 27v8M27 27v8M11 24V11h3v13M26 24V11h3v13" stroke={C_CH.core} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </g>
        <g className="g31-hit2" style={d(delayMs + 210)}>
          <path d="M6 33h28" stroke={C_CH.glow} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g31-ch-flip" style={d(delayMs)}>
          <path d="M12 26h16v3H12zM14 12v14M26 12v14M12 12h16" stroke={C_CH.core} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </g>
        <g className="g31-arrive-soft" style={d(delayMs + 280)}>
          <path d="M5 30h30v3H5z" fill={C_CH.deep} stroke={C_CH.core} strokeWidth="1.6" />
        </g>
        <g className="g31-hit2" style={d(delayMs + 420)}>
          <circle cx="20" cy="8" r="3.4" fill={C_CH.glow} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Felt tint="rgba(200,160,106,0.26)" delayMs={delayMs} />
      <Band color="rgba(42,28,16,0.52)" delayMs={delayMs + 60} y={62} h={6} />
      <P x={50} y={62} w={26} h={3} cls="g31-tell" style={{ background: C_CH.core, ...d(delayMs) }} />
      <P x={50} y={53} w={17} h={17} cls="g31-ch-flip" style={d(delayMs + 200)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <path d="M16 60h68v9H16zM24 69v24M76 69v24M16 60V16h9v44M75 60V16h9v44M16 34h68" stroke={C_CH.core} strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </P>
      {[0, 1, 2].map((i) => (
        <P
          key={i}
          x={44 + i * 6}
          y={62}
          w={4}
          h={4}
          cls="g31-ch-dust"
          style={{ background: C_CH.deep, borderRadius: "50%", ...d(delayMs + 470 + i * 70) }}
        />
      ))}
      <P x={50} y={64} w={40} h={2.4} cls="g31-ch-mop" style={{ background: `linear-gradient(90deg, transparent, ${C_CH.glow}, transparent)`, ...d(delayMs + 620) }} />
      <P x={62} y={41} w={9} h={6} cls="g31-ch-tag" style={d(delayMs + 760)}>
        <svg viewBox="0 0 60 40" className="block h-full w-full">
          <rect x="4" y="10" width="52" height="26" fill={C_CH.deep} stroke={C_CH.glow} strokeWidth="4" />
          <path d="M30 10V0" stroke={C_CH.glow} strokeWidth="4" />
        </svg>
      </P>
    </Wide>
  );
}

/* =============================================================================
   7. Crystal Ball (t1) — THE CLOUDED BALL. Tell: the highlight contracts.
   Strike: two mists churn against each other and an eye opens between them.
   Settle: the eye holds open on one side while the other side fogs back over.
   ========================================================================== */

const C_CB = { core: "#a99cf0", glow: "#f0ecff", deep: "#1c1636" };

function CrystalBallScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g31-hit" style={d(delayMs)}>
          <circle cx="20" cy="18" r="10" fill={C_CB.deep} stroke={C_CB.core} strokeWidth="2.2" />
          <path d="M11 18q9-7 18 0-9 7-18 0z" fill={C_CB.glow} />
          <circle cx="20" cy="18" r="2.6" fill={C_CB.deep} />
        </g>
        <g className="g31-hit2" style={d(delayMs + 220)}>
          <path d="M12 31h16v3H12z" fill={C_CB.core} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g31-arrive" style={d(delayMs)}>
          <circle cx="20" cy="19" r="12" fill={C_CB.deep} stroke={C_CB.core} strokeWidth="2.6" />
        </g>
        <g className="g31-cb-mist" style={d(delayMs + 200)}>
          <path d="M10 20q6-6 12 0t8-3" fill="none" stroke={C_CB.glow} strokeWidth="2.4" strokeLinecap="round" />
        </g>
        <g className="g31-cb-eye" style={d(delayMs + 380)}>
          <path d="M11 19q9-8 18 0-9 8-18 0z" fill={C_CB.glow} />
          <circle cx="20" cy="19" r="3" fill={C_CB.deep} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Rail color="rgba(169,156,240,0.5)" delayMs={delayMs} />
      <P x={50} y={45} w={7} h={7} cls="g31-tell" style={{ background: C_CB.glow, borderRadius: "50%", ...d(delayMs) }} />
      <P x={50} y={52} w={22} h={22} cls="g31-pop" style={d(delayMs + 150)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <circle cx="50" cy="50" r="42" fill={C_CB.deep} stroke={C_CB.core} strokeWidth="6" />
        </svg>
      </P>
      <P x={50} y={52} w={18} h={18} cls="g31-cb-mist" style={d(delayMs + 260)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <path d="M14 52q18-20 36 0t34-10" fill="none" stroke={C_CB.core} strokeWidth="8" strokeLinecap="round" />
        </svg>
      </P>
      <P x={50} y={52} w={18} h={18} cls="g31-cb-mist2" style={d(delayMs + 340)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <path d="M12 62q22 18 40 0t34 8" fill="none" stroke={C_CB.glow} strokeWidth="6" strokeLinecap="round" />
        </svg>
      </P>
      <P x={50} y={52} w={16} h={9} cls="g31-cb-eye" style={d(delayMs + 480)}>
        <svg viewBox="0 0 100 56" className="block h-full w-full">
          <path d="M6 28q44-32 88 0-44 32-88 0z" fill={C_CB.glow} stroke={C_CB.deep} strokeWidth="5" />
          <circle cx="50" cy="28" r="11" fill={C_CB.deep} />
        </svg>
      </P>
      <P x={57} y={52} w={11} h={20} cls="g31-cb-fog" style={{ background: `linear-gradient(90deg, transparent, ${C_CB.core})`, ...d(delayMs + 720) }} />
      <P x={50} y={65} w={16} h={5} cls="g31-hit2" style={{ background: C_CB.deep, ...d(delayMs + 640) }} />
    </Wide>
  );
}

/* =============================================================================
   8. Dowsing Rod (t1) — THE ROD DIPS. Tell: the forked rod is held level and
   quivers. Strike: the far end is yanked down and a ground pulse runs out
   along the aim vector, its reach scaled by --fx-len. Settle: water wells up.
   ========================================================================== */

const C_DR = { core: "#9fd08a", glow: "#eefbe4", deep: "#1d3016" };

function DowsingRodScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g31-hit" style={d(delayMs)}>
          <path d="M8 10l12 10 12-10M20 20v12" fill="none" stroke={C_DR.core} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g className="g31-dr-well" style={d(delayMs + 220)}>
          <ellipse cx="20" cy="33" rx="9" ry="3.4" fill={C_DR.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g31-dr-quiver" style={d(delayMs)}>
          <path d="M7 9l13 11 13-11M20 20v11" fill="none" stroke={C_DR.core} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g className="g31-arrive-soft" style={d(delayMs + 260)}>
          <ellipse cx="20" cy="33" rx="12" ry="3.6" fill="none" stroke={C_DR.deep} strokeWidth="2" />
        </g>
        <g className="g31-dr-well" style={d(delayMs + 400)}>
          <circle cx="20" cy="31" r="3.4" fill={C_DR.glow} />
        </g>
      </Sq>
    );
  return (
    <>
      <Wide>
        <Felt tint="rgba(159,208,138,0.24)" delayMs={delayMs} />
        <Drift color={C_DR.glow} delayMs={delayMs + 640} n={3} />
      </Wide>
      <Aim>
        <P x={46} y={50} w={14} h={14} cls="g31-dr-quiver" style={d(delayMs)}>
          <svg viewBox="0 0 100 100" className="block h-full w-full">
            <path d="M8 14l34 36 34-36" fill="none" stroke={C_DR.core} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </P>
        <P x={56} y={50} w={16} h={4} cls="g31-dr-dip" style={{ background: C_DR.core, ...d(delayMs + 260) }} />
        <span className="g31-dr-pulse absolute inset-0 block" style={d(delayMs + 420)}>
          <P x={50} y={50} w={6} h={12} style={{ border: `3px solid ${C_DR.glow}`, borderRadius: "50%" }} />
        </span>
        <P x={50} y={50} w={30} h={2} cls="g31-dr-seam" style={{ background: C_DR.deep, ...d(delayMs + 500) }} />
        <P x={53} y={53} w={4} h={4} cls="g31-dr-well" style={{ background: C_DR.glow, borderRadius: "50%", ...d(delayMs + 700) }} />
        <P x={47} y={47} w={3} h={3} cls="g31-dr-well" style={{ background: C_DR.core, borderRadius: "50%", ...d(delayMs + 800) }} />
      </Aim>
    </>
  );
}

/* =============================================================================
   9. Evil Eye Bead (t1) — THE PENDULUM. Tell: the cord snaps taut. Strike: the
   bead swings wide across the board and is damped hard to a dead stop.
   Settle: the eye on it opens and a ward blinks round the square it stopped on.
   ========================================================================== */

const C_EB = { core: "#5aa8e0", glow: "#e4f2ff", deep: "#10203a" };

function EvilEyeBeadScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g31-hit" style={d(delayMs)}>
          <circle cx="20" cy="20" r="10" fill={C_EB.core} stroke={C_EB.deep} strokeWidth="2" />
          <circle cx="20" cy="20" r="5.4" fill={C_EB.glow} />
          <circle cx="20" cy="20" r="2.4" fill={C_EB.deep} />
        </g>
        <g className="g31-eb-ward" style={d(delayMs + 220)}>
          <circle cx="20" cy="20" r="15" fill="none" stroke={C_EB.glow} strokeWidth="2" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g31-eb-swing" style={d(delayMs)}>
          <path d="M20 2v13" stroke={C_EB.glow} strokeWidth="2" strokeLinecap="round" />
          <circle cx="20" cy="23" r="9" fill={C_EB.core} stroke={C_EB.deep} strokeWidth="2.2" />
          <circle cx="20" cy="23" r="4.6" fill={C_EB.glow} />
        </g>
        <g className="g31-eb-open" style={d(delayMs + 300)}>
          <circle cx="20" cy="23" r="2.4" fill={C_EB.deep} />
        </g>
        <g className="g31-arrive-soft" style={d(delayMs + 440)}>
          <circle cx="20" cy="23" r="14" fill="none" stroke={C_EB.core} strokeWidth="1.8" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Rail color="rgba(90,168,224,0.5)" delayMs={delayMs} />
      <P x={50} y={40} w={1.6} h={16} cls="g31-tell" style={{ background: C_EB.glow, ...d(delayMs) }} />
      <P x={50} y={34} w={20} h={34} cls="g31-eb-swing" style={d(delayMs + 190)}>
        <svg viewBox="0 0 100 170" className="block h-full w-full">
          <path d="M50 4v104" stroke={C_EB.glow} strokeWidth="5" strokeLinecap="round" />
          <circle cx="50" cy="130" r="24" fill={C_EB.core} stroke={C_EB.deep} strokeWidth="6" />
          <circle cx="50" cy="130" r="12" fill={C_EB.glow} />
        </svg>
      </P>
      <P x={50} y={62} w={5} h={5} cls="g31-eb-open" style={{ background: C_EB.deep, borderRadius: "50%", ...d(delayMs + 640) }} />
      <P x={50} y={62} w={18} h={18} cls="g31-eb-ward" style={{ border: `3px solid ${C_EB.glow}`, borderRadius: "50%", ...d(delayMs + 720) }} />
      <P x={50} y={62} w={26} h={26} cls="g31-eb-ward" style={{ border: `2px solid ${C_EB.core}`, borderRadius: "50%", ...d(delayMs + 830) }} />
      <Drift color={C_EB.glow} delayMs={delayMs + 780} n={3} />
    </Wide>
  );
}

/* =============================================================================
   10. Fool's Gold (t1) — THE ASSAY. Tell: the hammer rises over the nugget.
   Strike: it comes down and the nugget splits in two. Settle: one half keeps
   its gilt and lifts, the other is dross and slumps into grey dust.
   ========================================================================== */

const C_FG = { core: "#d8b24a", glow: "#fff0c8", deep: "#33270c" };

function FoolsGoldScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g31-hit" style={d(delayMs)}>
          <path d="M9 24l4-9 8-3 9 4 2 9-10 6z" fill={C_FG.core} stroke={C_FG.deep} strokeWidth="2" strokeLinejoin="round" />
        </g>
        <g className="g31-fg-chip" style={d(delayMs + 210)}>
          <path d="M27 12l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" fill={C_FG.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g31-fg-hammer" style={d(delayMs)}>
          <path d="M8 6h16v7H8z" fill={C_FG.deep} stroke={C_FG.core} strokeWidth="2" />
          <path d="M16 13v10" stroke={C_FG.core} strokeWidth="2.6" strokeLinecap="round" />
        </g>
        <g className="g31-arrive" style={d(delayMs + 240)}>
          <path d="M10 30l4-8 8-3 9 4 2 8-10 5z" fill={C_FG.core} stroke={C_FG.deep} strokeWidth="2.2" strokeLinejoin="round" />
        </g>
        <g className="g31-hit2" style={d(delayMs + 400)}>
          <path d="M31 20l1.4 4 4 1.4-4 1.4-1.4 4-1.4-4-4-1.4 4-1.4z" fill={C_FG.glow} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Felt tint="rgba(216,178,74,0.28)" delayMs={delayMs} />
      <P x={44} y={40} w={13} h={16} cls="g31-fg-hammer" style={d(delayMs)}>
        <svg viewBox="0 0 70 90" className="block h-full w-full">
          <rect x="6" y="4" width="58" height="24" fill={C_FG.deep} stroke={C_FG.core} strokeWidth="6" />
          <path d="M35 28v58" stroke={C_FG.core} strokeWidth="9" strokeLinecap="round" />
        </svg>
      </P>
      <P x={50} y={57} w={18} h={12} cls="g31-tell" style={d(delayMs + 40)}>
        <svg viewBox="0 0 100 66" className="block h-full w-full">
          <path d="M8 44l8-26 22-10 28 12 6 24-30 18z" fill={C_FG.core} stroke={C_FG.deep} strokeWidth="6" strokeLinejoin="round" />
        </svg>
      </P>
      <P x={45} y={57} w={11} h={12} cls="g31-fg-halfL" style={d(delayMs + 420)}>
        <svg viewBox="0 0 60 66" className="block h-full w-full">
          <path d="M8 44l8-26 22-10 8 4-4 46z" fill={C_FG.glow} stroke={C_FG.deep} strokeWidth="6" strokeLinejoin="round" />
        </svg>
      </P>
      <P x={55} y={57} w={11} h={12} cls="g31-fg-halfR" style={d(delayMs + 420)}>
        <svg viewBox="0 0 60 66" className="block h-full w-full">
          <path d="M18 8l24 12 6 24-30 18z" fill={C_FG.deep} stroke={C_FG.core} strokeWidth="6" strokeLinejoin="round" />
        </svg>
      </P>
      {[0, 1, 2].map((i) => (
        <P
          key={i}
          x={48 + i * 3}
          y={50}
          w={2.4}
          h={2.4}
          cls="g31-fg-chip"
          style={{ background: i === 1 ? C_FG.glow : C_FG.core, borderRadius: "50%", ...d(delayMs + 440 + i * 70) }}
        />
      ))}
      <Drift color={C_FG.deep} delayMs={delayMs + 700} n={3} />
    </Wide>
  );
}

/* =============================================================================
   11. Four Leaf Clover (t1) — THE PARTED GRASS. Tell: two blades bend apart.
   Strike: a stem is plucked and turns as it comes up. Settle: the four leaves
   count themselves off one by one and a seed head drifts away from the caster.
   ========================================================================== */

const C_CL = { core: "#6fd07a", glow: "#e8ffe8", deep: "#123a1c" };
const CL_LEAVES = [
  { rx: 0, cx: 50, cy: 34 },
  { rx: 90, cx: 66, cy: 50 },
  { rx: 180, cx: 50, cy: 66 },
  { rx: 270, cx: 34, cy: 50 },
];

function FourLeafCloverScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g31-hit" style={d(delayMs)}>
          <circle cx="20" cy="13" r="5" fill={C_CL.core} />
          <circle cx="27" cy="20" r="5" fill={C_CL.core} />
          <circle cx="20" cy="27" r="5" fill={C_CL.core} />
          <circle cx="13" cy="20" r="5" fill={C_CL.core} />
          <path d="M20 27v9" stroke={C_CL.deep} strokeWidth="2.4" strokeLinecap="round" />
        </g>
        <g className="g31-hit2" style={d(delayMs + 220)}>
          <circle cx="20" cy="20" r="3" fill={C_CL.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g31-cl-pluck" style={d(delayMs)}>
          <circle cx="20" cy="14" r="5.4" fill={C_CL.core} />
          <circle cx="27" cy="21" r="5.4" fill={C_CL.core} />
          <circle cx="20" cy="28" r="5.4" fill={C_CL.core} />
          <circle cx="13" cy="21" r="5.4" fill={C_CL.core} />
          <circle cx="20" cy="21" r="3" fill={C_CL.glow} />
        </g>
        <g className="g31-arrive-soft" style={d(delayMs + 260)}>
          <path d="M5 34q7-5 15-3t15 3" fill="none" stroke={C_CL.deep} strokeWidth="2.4" strokeLinecap="round" />
        </g>
        <g className="g31-cl-fluff" style={d(delayMs + 420)}>
          <circle cx="30" cy="11" r="2.6" fill={C_CL.glow} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Band color="rgba(18,58,28,0.5)" delayMs={delayMs} y={64} h={8} />
      <Felt tint="rgba(111,208,122,0.22)" delayMs={delayMs + 60} />
      <P x={44} y={60} w={4} h={14} cls="g31-cl-bladeL" style={{ background: C_CL.deep, ...d(delayMs) }} />
      <P x={56} y={60} w={4} h={14} cls="g31-cl-bladeR" style={{ background: C_CL.deep, ...d(delayMs) }} />
      <P x={50} y={54} w={2.4} h={16} cls="g31-cl-pluck" style={{ background: C_CL.deep, ...d(delayMs + 240) }} />
      {CL_LEAVES.map((l, i) => (
        <P
          key={i}
          x={50}
          y={47}
          w={16}
          h={16}
          cls="g31-cl-leaf"
          style={dv(delayMs + 420 + i * 110, { "--g31-mr": `${l.rx}deg` })}
        >
          <svg viewBox="0 0 100 100" className="block h-full w-full">
            <path d={`M50 50q-16-4-16-18t16-14 16 14-16 18z`} fill={i === 3 ? C_CL.glow : C_CL.core} stroke={C_CL.deep} strokeWidth="5" strokeLinejoin="round" />
          </svg>
        </P>
      ))}
      <Drift color={C_CL.glow} delayMs={delayMs + 820} n={3} />
    </Wide>
  );
}

/* =============================================================================
   12. Gossip Charm (t1) — THE DRAWN SLIP. Tell: the hat brim tips over. Strike:
   folded slips flutter and one is pulled clear. Settle: it unfolds to a name,
   the rest fall back in, and a whisper ring runs out.
   ========================================================================== */

const C_GC = { core: "#e88fa8", glow: "#fff0f2", deep: "#3a1220" };

function GossipCharmScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g31-hit" style={d(delayMs)}>
          <rect x="9" y="13" width="22" height="15" fill={C_GC.glow} stroke={C_GC.deep} strokeWidth="2" />
          <path d="M13 19h14M13 23h9" stroke={C_GC.deep} strokeWidth="1.8" strokeLinecap="round" />
        </g>
        <g className="g31-gc-whisper" style={d(delayMs + 210)}>
          <circle cx="20" cy="20" r="15" fill="none" stroke={C_GC.core} strokeWidth="2" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g31-arrive" style={d(delayMs)}>
          <path d="M7 30q13-10 26 0z" fill={C_GC.deep} stroke={C_GC.core} strokeWidth="2.2" strokeLinejoin="round" />
          <rect x="5" y="29" width="30" height="5" fill={C_GC.core} />
        </g>
        <g className="g31-gc-draw" style={d(delayMs + 230)}>
          <rect x="15" y="10" width="11" height="13" fill={C_GC.glow} stroke={C_GC.deep} strokeWidth="1.8" />
        </g>
        <g className="g31-gc-whisper" style={d(delayMs + 420)}>
          <circle cx="20" cy="20" r="14" fill="none" stroke={C_GC.core} strokeWidth="1.8" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Felt tint="rgba(232,143,168,0.28)" delayMs={delayMs} />
      <P x={50} y={62} w={24} h={12} cls="g31-tell" style={d(delayMs)}>
        <svg viewBox="0 0 100 56" className="block h-full w-full">
          <path d="M14 40q36-34 72 0z" fill={C_GC.deep} stroke={C_GC.core} strokeWidth="6" strokeLinejoin="round" />
          <rect x="4" y="38" width="92" height="12" fill={C_GC.core} />
        </svg>
      </P>
      {[0, 1].map((i) => (
        <P
          key={i}
          x={44 + i * 12}
          y={55}
          w={6}
          h={7}
          cls="g31-gc-flutter"
          style={dv(delayMs + 220 + i * 90, { "--g31-mr": i ? "34deg" : "-30deg" })}
        >
          <svg viewBox="0 0 40 44" className="block h-full w-full">
            <rect x="4" y="4" width="32" height="36" fill={C_GC.glow} stroke={C_GC.deep} strokeWidth="4" />
          </svg>
        </P>
      ))}
      <P x={50} y={44} w={9} h={11} cls="g31-gc-draw" style={d(delayMs + 400)}>
        <svg viewBox="0 0 50 60" className="block h-full w-full">
          <rect x="5" y="4" width="40" height="52" fill={C_GC.glow} stroke={C_GC.deep} strokeWidth="5" />
        </svg>
      </P>
      <P x={50} y={44} w={13} h={8} cls="g31-gc-unfold" style={d(delayMs + 620)}>
        <svg viewBox="0 0 70 44" className="block h-full w-full">
          <rect x="4" y="4" width="62" height="36" fill={C_GC.glow} stroke={C_GC.deep} strokeWidth="5" />
          <path d="M14 20h42M14 30h26" stroke={C_GC.deep} strokeWidth="5" strokeLinecap="round" />
        </svg>
      </P>
      <P x={50} y={44} w={30} h={30} cls="g31-gc-whisper" style={{ border: `2px solid ${C_GC.core}`, borderRadius: "50%", ...d(delayMs + 760) }} />
    </Wide>
  );
}

/* =============================================================================
   13. Horseshoe Nail (t1) — THE LAST NAIL. Tell: the nail is set and tapped
   once. Strike: the hammer comes down for real and sparks fly off the shoe.
   Settle: the nail seats flush with a recoil and the shoe rings and rocks flat.
   ========================================================================== */

const C_HN = { core: "#c0c6d2", glow: "#fff0d8", deep: "#1b2028" };

function HorseshoeNailScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g31-hit" style={d(delayMs)}>
          <path d="M12 32V22a8 8 0 0 1 16 0v10" fill="none" stroke={C_HN.core} strokeWidth="5" strokeLinecap="round" />
        </g>
        <g className="g31-hn-spark" style={d(delayMs + 200)}>
          <path d="M20 6l1.6 4.4 4.4 1.6-4.4 1.6L20 18l-1.6-4.4-4.4-1.6 4.4-1.6z" fill={C_HN.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g31-arrive" style={d(delayMs)}>
          <path d="M11 33V21a9 9 0 0 1 18 0v12" fill="none" stroke={C_HN.core} strokeWidth="5.4" strokeLinecap="round" />
        </g>
        <g className="g31-hn-drive" style={d(delayMs + 220)}>
          <rect x="18" y="6" width="4" height="12" fill={C_HN.glow} />
          <rect x="15" y="4" width="10" height="4" fill={C_HN.glow} />
        </g>
        <g className="g31-hn-spark" style={d(delayMs + 400)}>
          <path d="M29 15l1.4 4 4 1.4-4 1.4-1.4 4-1.4-4-4-1.4 4-1.4z" fill={C_HN.glow} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Rail color="rgba(255,240,216,0.42)" delayMs={delayMs} />
      <Felt tint="rgba(192,198,210,0.2)" delayMs={delayMs + 50} />
      <P x={50} y={60} w={20} h={18} cls="g31-hn-ring" style={d(delayMs + 40)}>
        <svg viewBox="0 0 100 90" className="block h-full w-full">
          <path d="M20 86V46a30 30 0 0 1 60 0v40" fill="none" stroke={C_HN.core} strokeWidth="14" strokeLinecap="round" />
        </svg>
      </P>
      <P x={50} y={51} w={3} h={11} cls="g31-tell" style={{ background: C_HN.glow, ...d(delayMs) }} />
      <P x={50} y={40} w={14} h={12} cls="g31-hn-drive" style={d(delayMs + 220)}>
        <svg viewBox="0 0 80 70" className="block h-full w-full">
          <rect x="8" y="6" width="64" height="24" fill={C_HN.deep} stroke={C_HN.core} strokeWidth="6" />
          <path d="M40 30v36" stroke={C_HN.core} strokeWidth="9" strokeLinecap="round" />
        </svg>
      </P>
      {[0, 1, 2].map((i) => (
        <P
          key={i}
          x={50}
          y={51}
          w={3.2}
          h={3.2}
          cls="g31-hn-spark"
          style={{
            background: C_HN.glow,
            borderRadius: "50%",
            ...dv(delayMs + 470 + i * 60, {
              "--g31-mx": `${[-260, 40, 250][i]}%`,
              "--g31-my": `${[-190, -280, -170][i]}%`,
            }),
          }}
        />
      ))}
      <P x={50} y={51} w={22} h={22} cls="g31-hn-toll" style={{ border: `2px solid ${C_HN.glow}`, borderRadius: "50%", ...d(delayMs + 520) }} />
    </Wide>
  );
}

/* =============================================================================
   14. Private Booth (t1) — THE CURTAIN DRAWN. Tell: the brass rail catches the
   light. Strike: the velvet sweeps closed, leaning away from the caster.
   Settle: a RESERVED card thunks onto the table and the hem sways twice.
   ========================================================================== */

const C_PB = { core: "#b0304a", glow: "#ffe6d6", deep: "#2a0a14" };

function PrivateBoothScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g31-hit" style={d(delayMs)}>
          <path d="M6 8h28v26q-7-4-14 0T6 34z" fill={C_PB.core} stroke={C_PB.deep} strokeWidth="2" strokeLinejoin="round" />
        </g>
        <g className="g31-hit2" style={d(delayMs + 210)}>
          <path d="M4 8h32" stroke={C_PB.glow} strokeWidth="3" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g31-pb-draw" style={d(delayMs)}>
          <path d="M7 7h13v27q-4-3-8 0t-5 0z" fill={C_PB.core} stroke={C_PB.deep} strokeWidth="2" strokeLinejoin="round" />
          <path d="M20 7h13v27q-1-3-5 0t-8 0z" fill={C_PB.core} stroke={C_PB.deep} strokeWidth="2" strokeLinejoin="round" />
        </g>
        <g className="g31-arrive-soft" style={d(delayMs + 250)}>
          <path d="M4 7h32" stroke={C_PB.glow} strokeWidth="3.4" strokeLinecap="round" />
        </g>
        <g className="g31-hit2" style={d(delayMs + 420)}>
          <rect x="13" y="24" width="14" height="9" fill={C_PB.glow} stroke={C_PB.deep} strokeWidth="1.6" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Felt tint="rgba(176,48,74,0.3)" delayMs={delayMs} />
      <P x={50} y={38} w={34} h={2} cls="g31-tell" style={{ background: C_PB.glow, ...d(delayMs) }} />
      <P x={41} y={54} w={18} h={32} cls="g31-pb-drawL" style={d(delayMs + 180)}>
        <svg viewBox="0 0 90 160" className="block h-full w-full">
          <path d="M6 4h78v140q-20-12-40 0T6 144z" fill={C_PB.core} stroke={C_PB.deep} strokeWidth="7" strokeLinejoin="round" />
        </svg>
      </P>
      <P x={59} y={54} w={18} h={32} cls="g31-pb-drawR" style={d(delayMs + 180)}>
        <svg viewBox="0 0 90 160" className="block h-full w-full">
          <path d="M6 4h78v140q-20-12-40 0T6 144z" fill={C_PB.core} stroke={C_PB.deep} strokeWidth="7" strokeLinejoin="round" />
        </svg>
      </P>
      <P x={50} y={53} w={16} h={16} cls="g31-pb-lamp" style={{ background: `radial-gradient(circle, ${C_PB.glow}, transparent 70%)`, ...d(delayMs + 460) }} />
      <P x={50} y={58} w={14} h={9} cls="g31-pb-card" style={d(delayMs + 600)}>
        <svg viewBox="0 0 70 46" className="block h-full w-full">
          <rect x="4" y="4" width="62" height="38" fill={C_PB.glow} stroke={C_PB.deep} strokeWidth="5" />
          <path d="M14 18h42M14 30h28" stroke={C_PB.deep} strokeWidth="5" strokeLinecap="round" />
        </svg>
      </P>
      <P x={50} y={70} w={30} h={3} cls="g31-pb-hem" style={{ background: C_PB.deep, ...d(delayMs + 720) }} />
    </Wide>
  );
}

/* =============================================================================
   15. Rabbit's Foot (t1) — THE CAST FOOT. Tell: the fur is rubbed and a shine
   runs down it. Strike: the foot is thrown like a knucklebone, tumbling away
   from the caster. Settle: it lands, bounces twice, and stamps a print.
   ========================================================================== */

const C_RF = { core: "#d9c3a0", glow: "#fff4e2", deep: "#33261a" };

function RabbitsFootScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g31-hit" style={d(delayMs)}>
          <ellipse cx="20" cy="24" rx="8" ry="6" fill={C_RF.core} />
          <circle cx="13" cy="14" r="3" fill={C_RF.core} />
          <circle cx="20" cy="11" r="3" fill={C_RF.core} />
          <circle cx="27" cy="14" r="3" fill={C_RF.core} />
        </g>
        <g className="g31-hit2" style={d(delayMs + 210)}>
          <ellipse cx="20" cy="24" rx="13" ry="9" fill="none" stroke={C_RF.glow} strokeWidth="2" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g31-rf-toss" style={d(delayMs)}>
          <path d="M17 8h6l3 14q0 8-6 8t-6-8z" fill={C_RF.core} stroke={C_RF.deep} strokeWidth="2" strokeLinejoin="round" />
          <rect x="16" y="4" width="8" height="5" fill={C_RF.glow} />
        </g>
        <g className="g31-arrive-soft" style={d(delayMs + 300)}>
          <ellipse cx="20" cy="33" rx="11" ry="3" fill={C_RF.deep} opacity="0.75" />
        </g>
        <g className="g31-rf-wisp" style={d(delayMs + 420)}>
          <circle cx="28" cy="14" r="2.4" fill={C_RF.glow} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Felt tint="rgba(217,195,160,0.26)" delayMs={delayMs} />
      <P x={50} y={52} w={18} h={4} cls="g31-tell" style={{ background: `linear-gradient(90deg, transparent, ${C_RF.glow}, transparent)`, ...d(delayMs) }} />
      <P x={50} y={52} w={11} h={20} cls="g31-rf-toss" style={d(delayMs + 200)}>
        <svg viewBox="0 0 60 110" className="block h-full w-full">
          <rect x="20" y="4" width="20" height="14" fill={C_RF.glow} stroke={C_RF.deep} strokeWidth="5" />
          <path d="M18 18h24l8 52q0 30-20 30t-20-30z" fill={C_RF.core} stroke={C_RF.deep} strokeWidth="6" strokeLinejoin="round" />
        </svg>
      </P>
      <P x={50} y={64} w={20} h={4} cls="g31-rf-land" style={{ background: C_RF.deep, borderRadius: "50%", ...d(delayMs + 640) }} />
      <P x={50} y={62} w={13} h={11} cls="g31-rf-print" style={d(delayMs + 720)}>
        <svg viewBox="0 0 70 60" className="block h-full w-full">
          <ellipse cx="35" cy="42" rx="18" ry="14" fill={C_RF.deep} />
          <circle cx="17" cy="16" r="7" fill={C_RF.deep} />
          <circle cx="35" cy="10" r="7" fill={C_RF.deep} />
          <circle cx="53" cy="16" r="7" fill={C_RF.deep} />
        </svg>
      </P>
      {[0, 1, 2].map((i) => (
        <P
          key={i}
          x={45 + i * 5}
          y={57}
          w={2.2}
          h={2.2}
          cls="g31-rf-wisp"
          style={{ background: C_RF.glow, borderRadius: "50%", ...d(delayMs + 760 + i * 90) }}
        />
      ))}
    </Wide>
  );
}

/* =============================================================================
   16. Starboard Chart (t1) — THE DIVIDERS WALK. Tell: the chart's rhumb grid
   fades up over the whole board. Strike: the chart unrolls down the aim vector
   (its reach scaled by --fx-len) and the dividers step twice along it.
   Settle: two pins drop and the compass needle quivers to rest.
   ========================================================================== */

const C_SC = { core: "#d8c48a", glow: "#fff6de", deep: "#12243a" };

function StarboardChartScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g31-hit" style={d(delayMs)}>
          <path d="M20 6l4 12 12 2-12 2-4 12-4-12-12-2 12-2z" fill={C_SC.core} stroke={C_SC.deep} strokeWidth="1.6" strokeLinejoin="round" />
        </g>
        <g className="g31-sc-pin" style={d(delayMs + 210)}>
          <path d="M20 22v12" stroke={C_SC.glow} strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="20" cy="22" r="3" fill={C_SC.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g31-sc-unroll" style={d(delayMs)}>
          <rect x="5" y="11" width="30" height="20" fill={C_SC.glow} stroke={C_SC.deep} strokeWidth="2" />
          <path d="M5 21h30M20 11v20" stroke={C_SC.core} strokeWidth="1.6" />
        </g>
        <g className="g31-sc-walk" style={d(delayMs + 260)}>
          <path d="M20 8l-6 14M20 8l6 14" fill="none" stroke={C_SC.deep} strokeWidth="2.6" strokeLinecap="round" />
        </g>
        <g className="g31-sc-pin" style={d(delayMs + 420)}>
          <circle cx="27" cy="24" r="3" fill={C_SC.core} />
        </g>
      </Sq>
    );
  return (
    <>
      <Wide>
        <BoardFrame>
          <span className="g31-sc-grid absolute inset-0 block" style={{ border: `2px solid ${C_SC.core}`, ...d(delayMs) }} />
        </BoardFrame>
        <Drift color={C_SC.glow} delayMs={delayMs + 700} n={3} />
      </Wide>
      <Aim>
        <P
          x={70}
          y={50}
          w={40}
          h={16}
          cls="g31-sc-unroll"
          style={{ background: C_SC.glow, border: `2px solid ${C_SC.deep}`, ...d(delayMs + 160) }}
        />
        <P x={48} y={46} w={10} h={13} cls="g31-sc-walk" style={d(delayMs + 380)}>
          <svg viewBox="0 0 60 80" className="block h-full w-full">
            <path d="M30 6L12 74M30 6l18 68" fill="none" stroke={C_SC.deep} strokeWidth="8" strokeLinecap="round" />
            <circle cx="30" cy="6" r="6" fill={C_SC.deep} />
          </svg>
        </P>
        <span className="g31-sc-reach absolute inset-0 block" style={d(delayMs + 560)}>
          <P x={50} y={50} w={3.4} h={3.4} style={{ background: C_SC.deep, borderRadius: "50%" }} />
        </span>
        <P x={46} y={53} w={3} h={3} cls="g31-sc-pin" style={{ background: C_SC.deep, borderRadius: "50%", ...d(delayMs + 640) }} />
        <P x={50} y={58} w={10} h={10} cls="g31-sc-rose" style={d(delayMs + 760)}>
          <svg viewBox="0 0 60 60" className="block h-full w-full">
            <circle cx="30" cy="30" r="24" fill="none" stroke={C_SC.core} strokeWidth="5" />
            <path d="M30 8l5 20 20 2-20 2-5 20-5-20-20-2 20-2z" fill={C_SC.core} />
          </svg>
        </P>
      </Aim>
    </>
  );
}

/* =============================================================================
   17. Sunday Best (t1) — THE GOOD HAT. Tell: the hat hangs on its peg and the
   dust under it squashes. Strike: it is lifted, brushed twice, and dropped
   onto the crown. Settle: what looked like confetti turns out to be dust, and
   one small proud glint is the entire payoff.
   ========================================================================== */

const C_SB = { core: "#8fa8c8", glow: "#fff2de", deep: "#1b2438" };

function SundayBestScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g31-hit" style={d(delayMs)}>
          <path d="M13 22V13a7 7 0 0 1 14 0v9z" fill={C_SB.deep} stroke={C_SB.core} strokeWidth="2" strokeLinejoin="round" />
          <rect x="6" y="22" width="28" height="4" fill={C_SB.core} />
        </g>
        <g className="g31-hit2" style={d(delayMs + 210)}>
          <path d="M28 9l1.4 4 4 1.4-4 1.4-1.4 4-1.4-4-4-1.4 4-1.4z" fill={C_SB.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g31-sb-lift" style={d(delayMs)}>
          <path d="M13 21V12a7 7 0 0 1 14 0v9z" fill={C_SB.deep} stroke={C_SB.core} strokeWidth="2.2" strokeLinejoin="round" />
          <rect x="6" y="21" width="28" height="4.4" fill={C_SB.core} />
        </g>
        <g className="g31-sb-brush" style={d(delayMs + 240)}>
          <path d="M8 16h24" stroke={C_SB.glow} strokeWidth="2.6" strokeLinecap="round" />
        </g>
        <g className="g31-sb-dust" style={d(delayMs + 420)}>
          <circle cx="30" cy="28" r="2.2" fill={C_SB.core} />
          <circle cx="12" cy="30" r="1.8" fill={C_SB.core} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Felt tint="rgba(143,168,200,0.24)" delayMs={delayMs} />
      <P x={50} y={62} w={18} h={3} cls="g31-tell" style={{ background: C_SB.deep, borderRadius: "50%", ...d(delayMs) }} />
      <P x={50} y={49} w={20} h={14} cls="g31-sb-lift" style={d(delayMs + 180)}>
        <svg viewBox="0 0 100 70" className="block h-full w-full">
          <path d="M28 46V22a22 22 0 0 1 44 0v24z" fill={C_SB.deep} stroke={C_SB.core} strokeWidth="6" strokeLinejoin="round" />
          <rect x="6" y="46" width="88" height="12" fill={C_SB.core} />
          <rect x="28" y="36" width="44" height="7" fill={C_SB.glow} />
        </svg>
      </P>
      <P x={50} y={47} w={26} h={3} cls="g31-sb-brush" style={{ background: `linear-gradient(90deg, transparent, ${C_SB.glow}, transparent)`, ...d(delayMs + 380) }} />
      <P x={50} y={58} w={16} h={13} cls="g31-sb-set" style={d(delayMs + 600)}>
        <svg viewBox="0 0 80 66" className="block h-full w-full">
          <path d="M12 58l-4-38 14 12 18-24 18 24 14-12-4 38z" fill={C_SB.glow} stroke={C_SB.deep} strokeWidth="6" strokeLinejoin="round" />
        </svg>
      </P>
      {[0, 1, 2].map((i) => (
        <P
          key={i}
          x={44 + i * 6}
          y={53}
          w={2.4}
          h={2.4}
          cls="g31-sb-dust"
          style={{ background: C_SB.core, borderRadius: "50%", ...d(delayMs + 700 + i * 100) }}
        />
      ))}
      <P x={60} y={45} w={6} h={6} cls="g31-hit2" style={d(delayMs + 900)}>
        <svg viewBox="0 0 40 40" className="block h-full w-full">
          <path d="M20 3l3 12 12 3-12 3-3 12-3-12-12-3 12-3z" fill={C_SB.glow} />
        </svg>
      </P>
    </Wide>
  );
}

/* =============================================================================
   18. Tea Leaves (t1) — THE DREGS. Tell: one steam wisp lifts off the cup.
   Strike: the cup is swirled, then turned over and set down. Settle: the
   leaves crawl into a shape at the bottom and the shape glows once.
   ========================================================================== */

const C_TL = { core: "#b8834a", glow: "#ffeccb", deep: "#2a1a0e" };
const TL_LEAF = [
  { x: 44, y: 55 },
  { x: 55, y: 58 },
  { x: 49, y: 62 },
];

function TeaLeavesScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g31-hit" style={d(delayMs)}>
          <path d="M10 14h20v9a10 10 0 0 1-20 0z" fill={C_TL.glow} stroke={C_TL.deep} strokeWidth="2" strokeLinejoin="round" />
          <path d="M30 17h4a4 4 0 0 1 0 8h-4" fill="none" stroke={C_TL.deep} strokeWidth="2" />
        </g>
        <g className="g31-tl-settle" style={d(delayMs + 210)}>
          <circle cx="17" cy="28" r="2.2" fill={C_TL.core} />
          <circle cx="23" cy="29" r="1.8" fill={C_TL.core} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g31-tl-steam" style={d(delayMs)}>
          <path d="M18 12q4-4 0-8M24 12q4-4 0-8" fill="none" stroke={C_TL.glow} strokeWidth="2" strokeLinecap="round" />
        </g>
        <g className="g31-arrive" style={d(delayMs + 180)}>
          <path d="M10 15h21v9a10.5 10.5 0 0 1-21 0z" fill={C_TL.glow} stroke={C_TL.deep} strokeWidth="2.2" strokeLinejoin="round" />
          <ellipse cx="20.5" cy="33" rx="12" ry="3" fill={C_TL.core} />
        </g>
        <g className="g31-tl-settle" style={d(delayMs + 400)}>
          <circle cx="20" cy="24" r="3" fill={C_TL.core} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Felt tint="rgba(184,131,74,0.28)" delayMs={delayMs} />
      <P x={50} y={40} w={7} h={10} cls="g31-tl-steam" style={d(delayMs)}>
        <svg viewBox="0 0 40 60" className="block h-full w-full">
          <path d="M14 56q10-12 0-24t0-26" fill="none" stroke={C_TL.glow} strokeWidth="5" strokeLinecap="round" />
        </svg>
      </P>
      <P x={50} y={53} w={20} h={16} cls="g31-tl-swirl" style={d(delayMs + 200)}>
        <svg viewBox="0 0 100 80" className="block h-full w-full">
          <path d="M14 16h60v26a30 30 0 0 1-60 0z" fill={C_TL.glow} stroke={C_TL.deep} strokeWidth="6" strokeLinejoin="round" />
          <path d="M74 24h8a10 10 0 0 1 0 20h-8" fill="none" stroke={C_TL.deep} strokeWidth="6" />
        </svg>
      </P>
      <P x={50} y={59} w={22} h={5} cls="g31-tl-invert" style={{ background: C_TL.core, borderRadius: "50%", ...d(delayMs + 480) }} />
      {TL_LEAF.map((l, i) => (
        <P
          key={i}
          x={l.x}
          y={l.y}
          w={3.2}
          h={3.2}
          cls="g31-tl-settle"
          style={{ background: C_TL.deep, borderRadius: "50%", ...d(delayMs + 640 + i * 100) }}
        />
      ))}
      <P x={50} y={58} w={14} h={14} cls="g31-tl-read" style={{ border: `2px solid ${C_TL.glow}`, borderRadius: "50%", ...d(delayMs + 860) }} />
    </Wide>
  );
}

/* =============================================================================
   19. Wishbone (t1) — THE SNAP. Tell: both arms are gripped and the bone
   flexes. Strike: a hairline crack races up the fork and it goes. Settle: the
   long half is held up toward the caster while the short half tumbles off.
   ========================================================================== */

const C_WB = { core: "#f0e0c0", glow: "#fff6e4", deep: "#3a2a1a" };

function WishboneScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g31-hit" style={d(delayMs)}>
          <path d="M9 33q3-16 11-22 8 6 11 22" fill="none" stroke={C_WB.core} strokeWidth="4" strokeLinecap="round" />
        </g>
        <g className="g31-wb-crack" style={d(delayMs + 200)}>
          <path d="M20 11v9" stroke={C_WB.glow} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g31-wb-flex" style={d(delayMs)}>
          <path d="M9 34q3-17 11-23 8 6 11 23" fill="none" stroke={C_WB.core} strokeWidth="4.4" strokeLinecap="round" />
        </g>
        <g className="g31-wb-crack" style={d(delayMs + 260)}>
          <path d="M20 9v10" stroke={C_WB.glow} strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="g31-arrive-soft" style={d(delayMs + 420)}>
          <circle cx="20" cy="12" r="3" fill={C_WB.glow} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Rail color="rgba(240,224,192,0.45)" delayMs={delayMs} />
      <P x={50} y={54} w={20} h={20} cls="g31-wb-flex" style={d(delayMs)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <path d="M14 92q10-56 36-76 26 20 36 76" fill="none" stroke={C_WB.core} strokeWidth="11" strokeLinecap="round" />
        </svg>
      </P>
      <P x={50} y={45} w={1.6} h={9} cls="g31-wb-crack" style={{ background: C_WB.glow, ...d(delayMs + 240) }} />
      <P x={44} y={56} w={11} h={18} cls="g31-wb-long" style={d(delayMs + 440)}>
        <svg viewBox="0 0 60 100" className="block h-full w-full">
          <path d="M10 94q8-54 40-84" fill="none" stroke={C_WB.glow} strokeWidth="11" strokeLinecap="round" />
        </svg>
      </P>
      <P x={57} y={56} w={9} h={13} cls="g31-wb-short" style={d(delayMs + 440)}>
        <svg viewBox="0 0 50 80" className="block h-full w-full">
          <path d="M40 74q-6-38-26-60" fill="none" stroke={C_WB.core} strokeWidth="11" strokeLinecap="round" />
        </svg>
      </P>
      {[0, 1, 2].map((i) => (
        <P
          key={i}
          x={48 + i * 2.5}
          y={46}
          w={2}
          h={2}
          cls="g31-wb-dust"
          style={{ background: C_WB.glow, borderRadius: "50%", ...d(delayMs + 520 + i * 80) }}
        />
      ))}
      <P x={50} y={66} w={20} h={3} cls="g31-hit2" style={{ background: C_WB.deep, borderRadius: "50%", ...d(delayMs + 780) }} />
    </Wide>
  );
}

/* =============================================================================
   20. Lucky Penny (t1) — THE PENNY AND THE JAR. Tell: the thumb loads under
   the coin. Strike: the penny is flicked up, spins, lands and topples.
   Settle: the jackpot half is a step down the aim vector; the banked half is
   the penny dropping into the jar and rocking it.
   ========================================================================== */

const C_LP = { core: "#d98a5a", glow: "#ffe4c6", deep: "#331a0e" };

function LuckyPennyScene({ role, delayMs }: SceneProps) {
  if (role === "target")
    return (
      <Sq>
        <g className="g31-hit" style={d(delayMs)}>
          <circle cx="20" cy="18" r="8" fill={C_LP.core} stroke={C_LP.deep} strokeWidth="2" />
          <path d="M20 12v12" stroke={C_LP.deep} strokeWidth="2" strokeLinecap="round" />
        </g>
        <g className="g31-lp-topple" style={d(delayMs + 210)}>
          <ellipse cx="20" cy="31" rx="10" ry="3" fill={C_LP.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g31-lp-flick" style={d(delayMs)}>
          <circle cx="20" cy="16" r="8.4" fill={C_LP.core} stroke={C_LP.deep} strokeWidth="2.2" />
          <path d="M20 9v14M14 16h12" stroke={C_LP.deep} strokeWidth="1.8" strokeLinecap="round" />
        </g>
        <g className="g31-arrive-soft" style={d(delayMs + 280)}>
          <path d="M10 27h20v8H10z" fill="none" stroke={C_LP.glow} strokeWidth="2.4" />
        </g>
        <g className="g31-lp-clink" style={d(delayMs + 430)}>
          <circle cx="20" cy="31" r="3" fill={C_LP.glow} />
        </g>
      </Sq>
    );
  return (
    <>
      <Wide>
        <Felt tint="rgba(217,138,90,0.28)" delayMs={delayMs} />
        <P x={50} y={58} w={12} h={3} cls="g31-tell" style={{ background: C_LP.deep, borderRadius: "50%", ...d(delayMs) }} />
        <P x={50} y={50} w={10} h={10} cls="g31-lp-flick" style={d(delayMs + 170)}>
          <svg viewBox="0 0 60 60" className="block h-full w-full">
            <circle cx="30" cy="30" r="26" fill={C_LP.core} stroke={C_LP.deep} strokeWidth="5" />
            <path d="M30 10v40" stroke={C_LP.deep} strokeWidth="5" strokeLinecap="round" />
          </svg>
        </P>
        <P x={50} y={58} w={11} h={4} cls="g31-lp-topple" style={{ background: C_LP.glow, borderRadius: "50%", ...d(delayMs + 560) }} />
        <P x={62} y={57} w={13} h={16} cls="g31-lp-jar" style={d(delayMs + 700)}>
          <svg viewBox="0 0 70 90" className="block h-full w-full">
            <path d="M14 22h42v58a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" fill="none" stroke={C_LP.glow} strokeWidth="6" />
            <rect x="10" y="10" width="50" height="12" fill={C_LP.glow} />
            <circle cx="27" cy="66" r="8" fill={C_LP.core} />
            <circle cx="45" cy="70" r="7" fill={C_LP.core} />
          </svg>
        </P>
      </Wide>
      <Aim>
        <span className="g31-lp-step absolute inset-0 block" style={d(delayMs + 620)}>
          <P x={50} y={50} w={9} h={5} style={{ background: C_LP.glow }} />
        </span>
        <P x={50} y={50} w={26} h={1.8} cls="g31-lp-lane" style={{ background: C_LP.core, ...d(delayMs + 660) }} />
      </Aim>
    </>
  );
}

/* =============================================================================
   Registry. Every `sound` is an existing SigSoundKey, every `source` an
   existing SigZone, and every card declares its anchor.
   ========================================================================== */

function S(Render: SigPlugin["Render"], config: SigPlugin["config"]): SigPlugin {
  return { config, Render };
}

export const PLAYS: Record<string, SigPlugin> = {
  // --- the big lots: a trunk and a bottle ---
  bn4_costume_trunk: S(CostumeTrunkScene, {
    ordering: "radial", staggerMs: 70, victims: "all", hasLead: true,
    sound: "vault", source: "shield", anchor: "cast",
  }),
  bn4_bottled_courage: S(BottledCourageScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true,
    sound: "crashrocket", source: "kingSafe", anchor: "cast",
  }),

  // --- tolls, ponds and held spins ---
  hx4_ferrymans_coin: S(FerrymansCoinScene, {
    ordering: "line", staggerMs: 60, victims: "all", hasLead: true,
    sound: "coinflip", anchor: "aim",
  }),
  bn4_rubber_duck: S(RubberDuckScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "gacha", source: "shield", anchor: "cast",
  }),
  bn4_lucky_coin: S(LuckyCoinScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "coinflip", anchor: "cast",
  }),

  // --- the openers: eleven different ways to ask the world a question ---
  op_chairs_on_tables: S(ChairsOnTablesScene, {
    ordering: "radial", staggerMs: 50, victims: "all", hasLead: true,
    sound: "bust", anchor: "cast",
  }),
  op_crystal_ball: S(CrystalBallScene, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true,
    sound: "gacha", anchor: "cast",
  }),
  op_dowsing_rod: S(DowsingRodScene, {
    ordering: "line", staggerMs: 55, victims: "all", hasLead: true,
    sound: "dice", anchor: "aim",
  }),
  op_evil_eye_bead: S(EvilEyeBeadScene, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true,
    sound: "wheel", source: "shield", anchor: "cast",
  }),
  op_fools_gold: S(FoolsGoldScene, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true,
    sound: "chips", anchor: "cast",
  }),
  op_four_leaf_clover: S(FourLeafCloverScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "coinflip", anchor: "cast",
  }),
  op_gossip_charm: S(GossipCharmScene, {
    ordering: "radial", staggerMs: 40, victims: "all", hasLead: true,
    sound: "slots", anchor: "cast",
  }),
  op_horseshoe_nail: S(HorseshoeNailScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "chips", anchor: "cast",
  }),
  op_private_booth: S(PrivateBoothScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "vault", anchor: "cast",
  }),
  op_rabbits_foot: S(RabbitsFootScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "dice", anchor: "cast",
  }),
  op_starboard_chart: S(StarboardChartScene, {
    ordering: "line", staggerMs: 55, victims: "all", hasLead: true,
    sound: "wheel", anchor: "aim",
  }),
  op_sunday_best: S(SundayBestScene, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true,
    sound: "bust", anchor: "cast",
  }),
  op_tea_leaves: S(TeaLeavesScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "wheel", anchor: "cast",
  }),
  op_wishbone: S(WishboneScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "coinflip", anchor: "cast",
  }),

  // --- the wager on a single pawn ---
  ov_lucky_penny: S(LuckyPennyScene, {
    ordering: "line", staggerMs: 0, victims: ["p"], hasLead: true,
    sound: "coinflip", anchor: "aim",
  }),
};
