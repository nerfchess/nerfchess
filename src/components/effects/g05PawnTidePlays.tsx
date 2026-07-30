// Bespoke plugin signatures for the g05 PAWN batch: 30 cards that all used to
// share the generated `pawnTide` family. See sigPlugins.tsx for the contract.
// Self-contained: own inline SVG, own CSS (g05PawnTidePlays.css),
// transform/opacity only, no import from BoardEffects.tsx (cycle hazard), and
// only the SigPlugin TYPE imported from sigPlugins.tsx.
//
// MODULE FICTION: THE INFANTRY AS A CROWD WITH A WILL. Every scene is a
// different thing a MASS OF FOOT SOLDIERS does, never an abstract wave. A
// muster roll re-read over three graves; timber gates hauled open; a harvest
// snapping off at the stalk; a border chain thumped into the ground; three
// pawns lifted off their feet; a pawn kneeling to be knighted; a ladder passed
// forward over heads; a hedge of pikes coming up; a drummer setting a new
// step; a trench dug and a rank dropping into it; a reed pipe turning boots
// round; a cloud serpent laying itself along a rank; locusts stripping a rank
// to stubble; a vent splitting the field; a stretcher carried in; a mail
// satchel emptied; a toppled tower sifted for one survivor; a cat crossing the
// line; a bell tolling a line to its knees; a stake driven so no two share a
// furrow; a rocket barge; a tow line hauling the enemy in; a hollow pawn with
// a hatch in its back; a plough sowing ahead of the line; a literal leapfrog;
// a nesting doll splitting; a snuffer coming down and a deserter bolting; a
// mess queue shuffling one place; an officer's helm handed to an understudy;
// and a boomerang thrown down the line and caught.
//
// DIRECTION IS THE POINT. Pawns advance AWAY from their owner's home rank, and
// which way that is on screen depends on who cast the card. Nothing here says
// "up" or "down": every scene declares its own forward as
// `--g05-adv: calc(var(--fx-side, 1) * -1)` and the art rides that. Ranks act
// in the real victim order via `--fx-index` / `--fx-n`, aimed cards scale their
// reach by `--fx-len`, and anything that means THE WHOLE BOARD lives inside
// <BoardFrame> so it is exactly the board at any anchor.
//
// Kept everywhere: three beats (a short tell, the strike, a decaying settle);
// five or more animated layers per lead cut (six on tier 7-8); exactly three
// palette colours per card (core / glow / deep), warm whites and never pure
// white; every card declares anchor "cast" or "aim"; and every scene answers
// all three roles, entrance included.

import "./g05PawnTidePlays.css";

import type { CSSProperties, ReactNode } from "react";
import type { SigPlugin, SigRole } from "./sigPlugins";
import { BoardWideStage, BoardFrame, AimStage } from "./stage";

interface SceneProps {
  lead: boolean;
  role: SigRole;
  delayMs: number;
}

/* =============================================================================
   Shared staging. Positioning and beat plumbing only: every card's central
   object, its strike and its settle are its own art.
   ========================================================================== */

/** Beat delay. Written `d(delayMs, 220)` at every call site. */
const d = (base: number, off = 0): CSSProperties => ({ animationDelay: `${base + off}ms` });

/** The board-wide scene canvas, anchored on the cast square. */
function Wide({ children }: { children: ReactNode }) {
  return (
    <BoardWideStage>
      <span className="g05 absolute inset-0 block">{children}</span>
    </BoardWideStage>
  );
}

/** The same canvas rotated onto the play's own source -> target vector.
 *  Art inside is authored pointing RIGHT (+x). */
function Aim({ children }: { children: ReactNode }) {
  return (
    <AimStage>
      <span className="g05 absolute inset-0 block">{children}</span>
    </AimStage>
  );
}

/** Square-local cut: the per-victim hit and the in-hand arrival. */
function Sq({ children }: { children: ReactNode }) {
  return (
    <span className="g05 pointer-events-none absolute inset-0 z-20 block" aria-hidden="true">
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

/** The ground the whole affair stands on. */
function Field({ tint, delayMs }: { tint: string; delayMs: number }) {
  return (
    <BoardFrame>
      <span
        className="g05-field absolute inset-0 block"
        style={{ background: `radial-gradient(circle at 50% 50%, ${tint}, transparent 70%)`, ...d(delayMs) }}
      />
    </BoardFrame>
  );
}

/** A furrow, a waterline, a mess counter: one band across the whole board. */
function Furrow({
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
        className="g05-furrow absolute block"
        style={{ left: 0, width: "100%", top: `${y - h / 2}%`, height: `${h}%`, background: color, ...d(delayMs) }}
      />
    </BoardFrame>
  );
}

/** The hedge round the field: a hairline on the board's own edge. */
function Fence({ color, delayMs }: { color: string; delayMs: number }) {
  return (
    <BoardFrame>
      <span className="g05-fence absolute inset-0 block" style={{ border: `2px solid ${color}`, ...d(delayMs) }} />
    </BoardFrame>
  );
}

/** Settle chaff crossing the board, blown the way the infantry pushes. */
function Chaff({ color, delayMs, n = 3 }: { color: string; delayMs: number; n?: number }) {
  return (
    <BoardFrame>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className="g05-chaff absolute block"
          style={{
            left: `${14 + i * 24}%`,
            top: `${30 + (i % 3) * 18}%`,
            width: "2.4%",
            height: "2.4%",
            borderRadius: "50%",
            background: color,
            ...d(delayMs + i * 110),
          }}
        />
      ))}
    </BoardFrame>
  );
}

/** One foot soldier, seen from the front. Structure, not a scene. */
const PAWN_D = "M20 5a7.4 7.4 0 0 1 4.8 13l3.6 21H11.6l3.6-21A7.4 7.4 0 0 1 20 5zM8.5 42h23v9h-23z";

function Pawn({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <svg viewBox="0 0 40 60" className="block h-full w-full">
      <path d={PAWN_D} fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

/* =============================================================================
   1. Endless Militia (t8) — THE MUSTER ROLL RE-READ. Tell: the roll's shadow
   creeps over the furrow. Strike: three names are read and three pairs of
   hands push up out of the ground. Settle: the three fall in behind the line,
   toward the caster's own home rank, and the roll curls shut.
   ========================================================================== */

const C_EM = { core: "#d8b06a", glow: "#fff2d4", deep: "#2e2110" };

function EndlessMilitiaScene({ role, delayMs }: SceneProps) {
  const home = { "--g05-home": "var(--fx-side, 1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-hit" style={{ animationDelay: `calc(${delayMs}ms + var(--fx-index, 0) * 70ms)` }}>
          <path d={PAWN_D} fill={C_EM.core} stroke={C_EM.deep} strokeWidth="2.4" transform="translate(10 5) scale(0.5)" />
        </g>
        <g className="g05-hit2" style={d(delayMs, 210)}>
          <path d="M7 33h26" stroke={C_EM.glow} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-arrive" style={d(delayMs)}>
          <rect x="7" y="12" width="26" height="17" fill={C_EM.deep} stroke={C_EM.core} strokeWidth="2.4" />
          <path d="M12 18h16M12 23h11" stroke={C_EM.glow} strokeWidth="2" strokeLinecap="round" />
        </g>
        <g className="g05-em-hand" style={d(delayMs, 240)}>
          <path d="M17 34v-6M23 34v-7" stroke={C_EM.core} strokeWidth="2.6" strokeLinecap="round" />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 430)}>
          <path d="M5 35h30" stroke={C_EM.core} strokeWidth="2" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Field tint="rgba(216,176,106,0.3)" delayMs={delayMs} />
      <Furrow color="rgba(46,33,16,0.5)" delayMs={delayMs + 60} y={58} h={5} />
      <P x={50} y={62} w={26} h={4} cls="g05-tell" style={{ background: C_EM.deep, borderRadius: "50%", ...d(delayMs) }} />
      <P x={50} y={42} w={26} h={11} cls="g05-em-roll" style={d(delayMs, 150)}>
        <svg viewBox="0 0 120 50" className="block h-full w-full">
          <rect x="12" y="6" width="96" height="38" fill={C_EM.glow} stroke={C_EM.deep} strokeWidth="4" />
          <path d="M24 18h72M24 27h54M24 36h36" stroke={C_EM.deep} strokeWidth="4" strokeLinecap="round" />
          <rect x="4" y="2" width="10" height="46" fill={C_EM.core} stroke={C_EM.deep} strokeWidth="4" />
          <rect x="106" y="2" width="10" height="46" fill={C_EM.core} stroke={C_EM.deep} strokeWidth="4" />
        </svg>
      </P>
      {[0, 1, 2].map((i) => (
        <P key={i} x={40 + i * 10} y={60} w={6} h={7} cls="g05-em-hand" style={d(delayMs, 320 + i * 110)}>
          <svg viewBox="0 0 40 46" className="block h-full w-full">
            <path d="M12 46V20a4 4 0 0 1 8 0V8a4 4 0 0 1 8 0v38z" fill={C_EM.core} stroke={C_EM.deep} strokeWidth="4" strokeLinejoin="round" />
          </svg>
        </P>
      ))}
      {[0, 1, 2].map((i) => (
        <P key={i} x={40 + i * 10} y={57} w={7} h={11} cls="g05-em-fallin" style={{ ...home, ...d(delayMs, 660 + i * 90) }}>
          <Pawn fill={C_EM.core} stroke={C_EM.deep} />
        </P>
      ))}
      <Chaff color={C_EM.glow} delayMs={delayMs + 820} />
    </Wide>
  );
}

/* =============================================================================
   2. Menagerie Gates (t8) — THE GATES HAULED OPEN. Tell: the drawbar shudders
   in its brackets. Strike: two timber leaves swing wide on their hinges.
   Settle: three silhouettes walk out through the gap, forward, and the lantern
   over the arch swings itself still.
   ========================================================================== */

const C_MG = { core: "#c8a05a", glow: "#fff0d0", deep: "#2e2010" };
const MG_OUT = [
  { x: 42, path: "M8 44V26c0-9 7-14 12-14l-3-5 8 3c5 3 7 8 7 14v20z" },
  { x: 50, path: "M20 6l9 12-4 4v22H15V22l-4-4z" },
  { x: 58, path: PAWN_D },
];

function MenagerieGatesScene({ role, delayMs }: SceneProps) {
  const adv = { "--g05-adv": "calc(var(--fx-side, 1) * -1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-hit" style={d(delayMs)}>
          <path d="M8 34V16q0-9 12-9t12 9v18" fill="none" stroke={C_MG.core} strokeWidth="3" strokeLinejoin="round" />
          <path d="M20 8v26" stroke={C_MG.deep} strokeWidth="2.4" />
        </g>
        <g className="g05-hit2" style={d(delayMs, 220)}>
          <circle cx="20" cy="14" r="4" fill={C_MG.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-arrive" style={d(delayMs)}>
          <path d="M7 35V16q0-10 13-10t13 10v19" fill={C_MG.deep} stroke={C_MG.core} strokeWidth="2.6" strokeLinejoin="round" />
        </g>
        <g className="g05-mg-gateL" style={d(delayMs, 230)}>
          <rect x="7" y="14" width="12" height="21" fill={C_MG.core} stroke={C_MG.deep} strokeWidth="2" />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 420)}>
          <circle cx="20" cy="10" r="4.4" fill={C_MG.glow} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Field tint="rgba(200,160,90,0.28)" delayMs={delayMs} />
      <P x={50} y={53} w={26} h={3.4} cls="g05-tell" style={{ background: C_MG.deep, ...d(delayMs, 80) }} />
      <P x={43} y={54} w={12} h={20} cls="g05-mg-gateL" style={d(delayMs, 190)}>
        <svg viewBox="0 0 60 100" className="block h-full w-full">
          <rect x="4" y="4" width="52" height="92" fill={C_MG.deep} stroke={C_MG.core} strokeWidth="6" />
          <path d="M8 30h44M8 62h44M12 8l40 84" stroke={C_MG.core} strokeWidth="5" />
        </svg>
      </P>
      <P x={57} y={54} w={12} h={20} cls="g05-mg-gateR" style={d(delayMs, 190)}>
        <svg viewBox="0 0 60 100" className="block h-full w-full">
          <rect x="4" y="4" width="52" height="92" fill={C_MG.deep} stroke={C_MG.core} strokeWidth="6" />
          <path d="M8 30h44M8 62h44M52 8L12 92" stroke={C_MG.core} strokeWidth="5" />
        </svg>
      </P>
      <P x={50} y={38} w={8} h={9} cls="g05-mg-lamp" style={d(delayMs, 380)}>
        <svg viewBox="0 0 40 46" className="block h-full w-full">
          <path d="M20 2v8M8 12h24l-4 30H12z" fill={C_MG.glow} stroke={C_MG.deep} strokeWidth="4" strokeLinejoin="round" />
        </svg>
      </P>
      {MG_OUT.map((o, i) => (
        <P key={i} x={o.x} y={56} w={7} h={11} cls="g05-mg-out" style={{ ...adv, ...d(delayMs, 500 + i * 120) }}>
          <svg viewBox="0 0 40 60" className="block h-full w-full">
            <path d={o.path} fill={C_MG.core} stroke={C_MG.deep} strokeWidth="3" strokeLinejoin="round" />
          </svg>
        </P>
      ))}
      <Chaff color={C_MG.glow} delayMs={delayMs + 780} />
    </Wide>
  );
}

/* =============================================================================
   3. Famine Year (t8) — THE HARVEST FAILS. Tell: the ears of wheat go still
   and the shadow under them shrinks to nothing. Strike: five stalks snap off
   at the base in a run and the grain heads come away empty. Settle: the husks
   blow off the board the way the infantry was meant to march, and the furrow
   cracks open dry.
   ========================================================================== */

const C_FY = { core: "#9aa06a", glow: "#eef0d2", deep: "#262a14" };

function FamineYearScene({ role, delayMs }: SceneProps) {
  const adv = { "--g05-adv": "calc(var(--fx-side, 1) * -1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-fy-stalk" style={{ animationDelay: `calc(${delayMs}ms + var(--fx-index, 0) * 80ms)` }}>
          <path d="M20 34V10M20 14l6-4M20 20l6-4M20 14l-6-4M20 20l-6-4" fill="none" stroke={C_FY.core} strokeWidth="2.6" strokeLinecap="round" />
        </g>
        <g className="g05-hit2" style={d(delayMs, 230)}>
          <path d="M8 34h24" stroke={C_FY.deep} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-arrive" style={d(delayMs)}>
          <path d="M20 35V9M20 13l7-5M20 20l7-5M20 13l-7-5M20 20l-7-5" fill="none" stroke={C_FY.core} strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="g05-fy-husk" style={d(delayMs, 250)}>
          <ellipse cx="28" cy="12" rx="3" ry="2" fill={C_FY.glow} />
          <ellipse cx="12" cy="16" rx="2.4" ry="1.6" fill={C_FY.glow} />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 430)}>
          <path d="M6 34h28" stroke={C_FY.deep} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Field tint="rgba(154,160,106,0.26)" delayMs={delayMs} />
      <Furrow color="rgba(38,42,20,0.55)" delayMs={delayMs + 60} y={62} h={5} />
      <P x={50} y={64} w={30} h={3.4} cls="g05-tell" style={{ background: C_FY.deep, borderRadius: "50%", ...d(delayMs, 90) }} />
      {[0, 1, 2, 3, 4].map((i) => (
        <P key={i} x={38 + i * 6} y={54} w={5} h={18} cls="g05-fy-stalk" style={d(delayMs, 180 + i * 90)}>
          <svg viewBox="0 0 30 100" className="block h-full w-full">
            <path d="M15 98V16M15 26l10-8M15 40l10-8M15 26L5 18M15 40L5 32" fill="none" stroke={C_FY.core} strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="15" cy="10" rx="6" ry="9" fill={C_FY.core} />
          </svg>
        </P>
      ))}
      <P x={50} y={62} w={34} h={1.6} cls="g05-fy-crack" style={{ background: C_FY.deep, ...d(delayMs, 640) }} />
      {[0, 1, 2].map((i) => (
        <P key={i} x={44 + i * 6} y={50} w={3.4} h={2.4} cls="g05-fy-husk" style={{ ...adv, background: C_FY.glow, borderRadius: "50%", ...d(delayMs, 700 + i * 90) }} />
      ))}
      <Chaff color={C_FY.core} delayMs={delayMs + 860} />
    </Wide>
  );
}

/* =============================================================================
   4. Pawn Embargo (t8) — THE BORDER CHAIN. Tell: two posts are dropped either
   side of the line and take the ground. Strike: a chain is drawn taut across
   the board's midline. Settle: one pawn ducks under it and crosses; the
   padlock then snaps shut behind it and the chain stops swinging.
   ========================================================================== */

const C_PE = { core: "#6f93c8", glow: "#e2ecff", deep: "#131f33" };

function PawnEmbargoScene({ role, delayMs }: SceneProps) {
  const cross = { "--g05-home": "var(--fx-side, 1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-hit" style={d(delayMs)}>
          <path d="M5 20h30" stroke={C_PE.core} strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="14" cy="20" r="3" fill="none" stroke={C_PE.glow} strokeWidth="2" />
          <circle cx="26" cy="20" r="3" fill="none" stroke={C_PE.glow} strokeWidth="2" />
        </g>
        <g className="g05-hit2" style={d(delayMs, 220)}>
          <rect x="16" y="24" width="8" height="9" fill={C_PE.deep} stroke={C_PE.glow} strokeWidth="2" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-arrive" style={d(delayMs)}>
          <rect x="6" y="10" width="6" height="24" fill={C_PE.deep} stroke={C_PE.core} strokeWidth="2.4" />
          <rect x="28" y="10" width="6" height="24" fill={C_PE.deep} stroke={C_PE.core} strokeWidth="2.4" />
        </g>
        <g className="g05-pe-chain" style={d(delayMs, 250)}>
          <path d="M9 20h22" stroke={C_PE.glow} strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 440)}>
          <rect x="16" y="16" width="8" height="9" fill={C_PE.core} stroke={C_PE.deep} strokeWidth="2" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Furrow color="rgba(19,31,51,0.55)" delayMs={delayMs} y={50} h={4} />
      <P x={38} y={50} w={3.4} h={16} cls="g05-pe-post" style={{ background: C_PE.core, ...d(delayMs, 60) }} />
      <P x={62} y={50} w={3.4} h={16} cls="g05-pe-post" style={{ background: C_PE.core, ...d(delayMs, 130) }} />
      <BoardFrame>
        <span
          className="g05-pe-chain absolute block"
          style={{ left: 0, width: "100%", top: "48.4%", height: "3.2%", background: C_PE.glow, ...d(delayMs, 260) }}
        />
      </BoardFrame>
      <P x={50} y={56} w={7} h={11} cls="g05-pe-slip" style={{ ...cross, ...d(delayMs, 440) }}>
        <Pawn fill={C_PE.core} stroke={C_PE.deep} />
      </P>
      <P x={50} y={50} w={7} h={8} cls="g05-pe-lock" style={d(delayMs, 700)}>
        <svg viewBox="0 0 40 46" className="block h-full w-full">
          <path d="M12 20V13a8 8 0 0 1 16 0v7" fill="none" stroke={C_PE.glow} strokeWidth="5" />
          <rect x="6" y="20" width="28" height="22" fill={C_PE.deep} stroke={C_PE.glow} strokeWidth="5" />
        </svg>
      </P>
      <Fence color="rgba(111,147,200,0.5)" delayMs={delayMs + 800} />
      <Chaff color={C_PE.glow} delayMs={delayMs + 840} />
    </Wide>
  );
}

/* =============================================================================
   5. The Rapture of Pawns (t8) — THREE LIFTED OFF THEIR FEET. Tell: three
   shadows on the ground tighten to points. Strike: three shafts come down and
   three pawns leave the earth, drifting a step forward as they go. Settle:
   new sideways footprints stamp themselves in either side of each, and motes
   fall back through the shafts.
   ========================================================================== */

const C_RP = { core: "#cbb0f0", glow: "#f6efff", deep: "#241a3c" };

function RaptureOfPawnsScene({ role, delayMs }: SceneProps) {
  const adv = { "--g05-adv": "calc(var(--fx-side, 1) * -1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-rp-lift" style={{ ...adv, animationDelay: `calc(${delayMs}ms + var(--fx-index, 0) * 70ms)` }}>
          <path d={PAWN_D} fill={C_RP.core} stroke={C_RP.deep} strokeWidth="2.4" transform="translate(10 4) scale(0.5)" />
        </g>
        <g className="g05-hit2" style={d(delayMs, 240)}>
          <path d="M10 34h20M13 37h14" stroke={C_RP.glow} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-arrive" style={d(delayMs)}>
          <path d={PAWN_D} fill={C_RP.deep} stroke={C_RP.core} strokeWidth="3" transform="translate(9 3) scale(0.55)" />
        </g>
        <g className="g05-rp-beam" style={d(delayMs, 230)}>
          <path d="M14 2h12l4 20H10z" fill={C_RP.glow} opacity="0.7" />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 420)}>
          <ellipse cx="20" cy="35" rx="11" ry="2.6" fill={C_RP.core} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Field tint="rgba(203,176,240,0.3)" delayMs={delayMs} />
      {[0, 1, 2].map((i) => (
        <P key={i} x={41 + i * 9} y={62} w={8} h={2.6} cls="g05-tell" style={{ background: C_RP.deep, borderRadius: "50%", ...d(delayMs, 60) }} />
      ))}
      {[0, 1, 2].map((i) => (
        <P key={i} x={41 + i * 9} y={40} w={7} h={30} cls="g05-rp-beam" style={d(delayMs, 190 + i * 90)}>
          <svg viewBox="0 0 40 160" className="block h-full w-full">
            <path d="M14 0h12l10 156H4z" fill={C_RP.glow} opacity="0.6" />
          </svg>
        </P>
      ))}
      {[0, 1, 2].map((i) => (
        <P key={i} x={41 + i * 9} y={58} w={7} h={11} cls="g05-rp-lift" style={{ ...adv, ...d(delayMs, 380 + i * 100) }}>
          <Pawn fill={C_RP.core} stroke={C_RP.deep} />
        </P>
      ))}
      {[0, 1].map((i) => (
        <P key={i} x={36 + i * 28} y={64} w={4.4} h={2.4} cls="g05-rp-print" style={{ background: C_RP.deep, borderRadius: "50%", ...d(delayMs, 680 + i * 80) }} />
      ))}
      <Chaff color={C_RP.glow} delayMs={delayMs + 820} n={2} />
    </Wide>
  );
}

/* =============================================================================
   6. Changeling Child (t7) — THE KNIGHTING. Tell: the pawn dips and kneels,
   its shadow flattening under it. Strike: a blade comes down to one shoulder,
   then the other. Settle: it stands up taller wearing a crest, and steps one
   square forward into its new rank.
   ========================================================================== */

const C_CC = { core: "#e0b34a", glow: "#fff3cd", deep: "#33260a" };

function ChangelingChildScene({ role, delayMs }: SceneProps) {
  const adv = { "--g05-adv": "calc(var(--fx-side, 1) * -1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-hit" style={d(delayMs)}>
          <path d="M20 6l7 10-3 4v14H16V20l-3-4z" fill={C_CC.core} stroke={C_CC.deep} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <g className="g05-cc-crest" style={d(delayMs, 230)}>
          <path d="M20 3l1.8 4.6 4.6 1.8-4.6 1.8L20 15.8l-1.8-4.6L13.6 9.4l4.6-1.8z" fill={C_CC.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-cc-kneel" style={d(delayMs)}>
          <path d={PAWN_D} fill={C_CC.core} stroke={C_CC.deep} strokeWidth="3" transform="translate(9 4) scale(0.55)" />
        </g>
        <g className="g05-cc-sword" style={d(delayMs, 250)}>
          <path d="M4 8l22 12" stroke={C_CC.glow} strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 440)}>
          <ellipse cx="20" cy="35" rx="11" ry="2.6" fill={C_CC.deep} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Field tint="rgba(224,179,74,0.28)" delayMs={delayMs} />
      <P x={50} y={64} w={20} h={3} cls="g05-tell" style={{ background: C_CC.deep, borderRadius: "50%", ...d(delayMs) }} />
      <P x={50} y={57} w={9} h={13} cls="g05-cc-kneel" style={d(delayMs, 120)}>
        <Pawn fill={C_CC.core} stroke={C_CC.deep} />
      </P>
      <P x={44} y={48} w={22} h={5} cls="g05-cc-sword" style={d(delayMs, 300)}>
        <svg viewBox="0 0 120 26" className="block h-full w-full">
          <path d="M4 13h84l24-7v14L88 13" fill={C_CC.glow} stroke={C_CC.deep} strokeWidth="4" strokeLinejoin="round" />
        </svg>
      </P>
      <P x={56} y={52} w={22} h={5} cls="g05-cc-sword2" style={d(delayMs, 430)}>
        <svg viewBox="0 0 120 26" className="block h-full w-full">
          <path d="M4 13h84l24-7v14L88 13" fill={C_CC.glow} stroke={C_CC.deep} strokeWidth="4" strokeLinejoin="round" />
        </svg>
      </P>
      <P x={50} y={53} w={11} h={16} cls="g05-cc-grow" style={{ ...adv, ...d(delayMs, 600) }}>
        <svg viewBox="0 0 44 64" className="block h-full w-full">
          <path d="M22 4l9 12-4 5v39H17V21l-4-5z" fill={C_CC.core} stroke={C_CC.deep} strokeWidth="3.4" strokeLinejoin="round" />
        </svg>
      </P>
      <P x={50} y={43} w={7} h={7} cls="g05-cc-crest" style={d(delayMs, 760)}>
        <svg viewBox="0 0 40 40" className="block h-full w-full">
          <path d="M20 2l4.4 11.6L36 18l-11.6 4.4L20 34l-4.4-11.6L4 18l11.6-4.4z" fill={C_CC.glow} />
        </svg>
      </P>
      <Chaff color={C_CC.glow} delayMs={delayMs + 860} />
    </Wide>
  );
}

/* =============================================================================
   7. Drawbridge Crew (t7) — THE LADDER PASSED FORWARD. Tell: a row of hands
   goes up along the home rank, one after another. Strike: a long plank travels
   forward over their heads and drops flat with a thump. Settle: three pawns
   climb up and stand on it, and sawdust falls off the join.
   ========================================================================== */

const C_DC = { core: "#b98a52", glow: "#ffeacc", deep: "#2c1c0e" };

function DrawbridgeCrewScene({ role, delayMs }: SceneProps) {
  const adv = { "--g05-adv": "calc(var(--fx-side, 1) * -1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-hit" style={d(delayMs)}>
          <rect x="4" y="17" width="32" height="7" fill={C_DC.core} stroke={C_DC.deep} strokeWidth="2.4" />
        </g>
        <g className="g05-dc-stand" style={d(delayMs, 230)}>
          <path d={PAWN_D} fill={C_DC.glow} stroke={C_DC.deep} strokeWidth="2.4" transform="translate(11 -4) scale(0.45)" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-dc-heads" style={d(delayMs)}>
          <path d="M10 34V24M16 34V21M24 34V21M30 34V24" stroke={C_DC.core} strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="g05-arrive" style={d(delayMs, 240)}>
          <rect x="4" y="12" width="32" height="7" fill={C_DC.deep} stroke={C_DC.core} strokeWidth="2.4" />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 430)}>
          <path d="M6 9h28" stroke={C_DC.glow} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Field tint="rgba(185,138,82,0.26)" delayMs={delayMs} />
      <Furrow color="rgba(44,28,14,0.5)" delayMs={delayMs + 60} y={64} h={5} />
      <P x={50} y={66} w={30} h={3} cls="g05-tell" style={{ background: C_DC.deep, borderRadius: "50%", ...d(delayMs, 90) }} />
      {[0, 1, 2, 3].map((i) => (
        <P key={i} x={39 + i * 7.4} y={60} w={3} h={8} cls="g05-dc-heads" style={{ background: C_DC.core, ...d(delayMs, i * 70) }} />
      ))}
      <P x={50} y={50} w={34} h={4.4} cls="g05-dc-plank" style={{ ...adv, ...d(delayMs, 280) }}>
        <svg viewBox="0 0 180 24" className="block h-full w-full">
          <rect x="2" y="4" width="176" height="16" fill={C_DC.core} stroke={C_DC.deep} strokeWidth="5" />
          <path d="M40 4v16M90 4v16M140 4v16" stroke={C_DC.deep} strokeWidth="4" />
        </svg>
      </P>
      <P x={50} y={56} w={34} h={4} cls="g05-dc-drop" style={{ background: C_DC.deep, ...d(delayMs, 520) }} />
      {[0, 1, 2].map((i) => (
        <P key={i} x={41 + i * 9} y={51} w={7} h={11} cls="g05-dc-stand" style={d(delayMs, 640 + i * 100)}>
          <Pawn fill={C_DC.glow} stroke={C_DC.deep} />
        </P>
      ))}
      <Chaff color={C_DC.glow} delayMs={delayMs + 820} />
    </Wide>
  );
}

/* =============================================================================
   8. Field of Spears (t7) — THE HEDGE COMES UP. Tell: the butt ends grind on
   the stones. Strike: five pikes swing up out of the ground in a run and lock
   at a forward angle, leaning the way the caster pushes. Settle: light runs
   along the points and the shield line braces behind them.
   ========================================================================== */

const C_FS = { core: "#9fb4c4", glow: "#eaf4fb", deep: "#1a2530" };

function FieldOfSpearsScene({ role, delayMs }: SceneProps) {
  const adv = { "--g05-adv": "calc(var(--fx-side, 1) * -1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-fs-pike" style={{ ...adv, animationDelay: `calc(${delayMs}ms + var(--fx-index, 0) * 70ms)` }}>
          <path d="M20 36V12l4-8 -4-3 -4 3 4 8" fill={C_FS.core} stroke={C_FS.deep} strokeWidth="2.2" strokeLinejoin="round" />
        </g>
        <g className="g05-hit2" style={d(delayMs, 230)}>
          <path d="M8 32h24" stroke={C_FS.glow} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-arrive" style={d(delayMs)}>
          <path d="M14 36V14l6-10 6 10v22" fill="none" stroke={C_FS.core} strokeWidth="3" strokeLinejoin="round" />
        </g>
        <g className="g05-fs-glint" style={d(delayMs, 240)}>
          <path d="M20 3l1.6 4.4 4.4 1.6-4.4 1.6L20 15l-1.6-4.4L14 9l4.4-1.6z" fill={C_FS.glow} />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 430)}>
          <path d="M6 33h28" stroke={C_FS.deep} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Field tint="rgba(159,180,196,0.26)" delayMs={delayMs} />
      <P x={50} y={64} w={30} h={3} cls="g05-tell" style={{ background: C_FS.deep, ...d(delayMs) }} />
      {[0, 1, 2, 3, 4].map((i) => (
        <P key={i} x={38 + i * 6} y={52} w={4} h={22} cls="g05-fs-pike" style={{ ...adv, ...d(delayMs, 160 + i * 90) }}>
          <svg viewBox="0 0 24 120" className="block h-full w-full">
            <path d="M12 118V26" stroke={C_FS.deep} strokeWidth="6" strokeLinecap="round" />
            <path d="M12 2l7 16-7 10-7-10z" fill={C_FS.core} stroke={C_FS.deep} strokeWidth="4" strokeLinejoin="round" />
          </svg>
        </P>
      ))}
      <P x={50} y={40} w={30} h={3} cls="g05-fs-glint" style={{ background: `linear-gradient(90deg, transparent, ${C_FS.glow}, transparent)`, ...d(delayMs, 640) }} />
      <P x={50} y={63} w={28} h={7} cls="g05-fs-brace" style={d(delayMs, 720)}>
        <svg viewBox="0 0 150 36" className="block h-full w-full">
          <path d="M6 4h34v18q0 10-17 10T6 22zM58 4h34v18q0 10-17 10T58 22zM110 4h34v18q0 10-17 10t-17-10z" fill={C_FS.deep} stroke={C_FS.core} strokeWidth="4" strokeLinejoin="round" />
        </svg>
      </P>
      <Chaff color={C_FS.glow} delayMs={delayMs + 840} />
    </Wide>
  );
}

/* =============================================================================
   9. Great Migration (t7) — THE DRUMMER SETS A NEW STEP. Tell: two beaters
   come down on the drum head twice. Strike: five boots leave the ground in
   order and the whole rank slides one square forward. Settle: the dust of the
   step hangs and falls back behind the line.
   ========================================================================== */

const C_GM = { core: "#d76a4a", glow: "#ffe2cf", deep: "#331309" };

function GreatMigrationScene({ role, delayMs }: SceneProps) {
  const adv = { "--g05-adv": "calc(var(--fx-side, 1) * -1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-gm-boot" style={{ ...adv, animationDelay: `calc(${delayMs}ms + var(--fx-index, 0) * 60ms)` }}>
          <path d="M14 10h7v14h11v8H14z" fill={C_GM.core} stroke={C_GM.deep} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <g className="g05-gm-dust" style={d(delayMs, 220)}>
          <circle cx="13" cy="34" r="3" fill={C_GM.glow} />
          <circle cx="26" cy="35" r="2.2" fill={C_GM.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-gm-drum" style={d(delayMs)}>
          <rect x="8" y="16" width="24" height="14" fill={C_GM.deep} stroke={C_GM.core} strokeWidth="2.6" />
          <path d="M8 20h24" stroke={C_GM.glow} strokeWidth="2" />
        </g>
        <g className="g05-gm-beat" style={d(delayMs, 240)}>
          <path d="M6 6l8 8M34 6l-8 8" stroke={C_GM.core} strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 430)}>
          <path d="M5 34h30" stroke={C_GM.glow} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Field tint="rgba(215,106,74,0.26)" delayMs={delayMs} />
      <Furrow color="rgba(51,19,9,0.5)" delayMs={delayMs + 60} y={62} h={5} />
      <P x={50} y={44} w={14} h={10} cls="g05-gm-drum" style={d(delayMs)}>
        <svg viewBox="0 0 80 56" className="block h-full w-full">
          <rect x="6" y="10" width="68" height="38" fill={C_GM.deep} stroke={C_GM.core} strokeWidth="5" />
          <path d="M6 18h68M14 10l14 38M66 10L52 48" stroke={C_GM.core} strokeWidth="4" />
        </svg>
      </P>
      <P x={50} y={38} w={18} h={7} cls="g05-gm-beat" style={d(delayMs, 130)}>
        <svg viewBox="0 0 100 40" className="block h-full w-full">
          <path d="M6 4l30 30M94 4L64 34" stroke={C_GM.glow} strokeWidth="7" strokeLinecap="round" />
        </svg>
      </P>
      {[0, 1, 2, 3, 4].map((i) => (
        <P key={i} x={38 + i * 6} y={60} w={4.4} h={5} cls="g05-gm-boot" style={{ ...adv, ...d(delayMs, 300 + i * 80) }}>
          <svg viewBox="0 0 40 44" className="block h-full w-full">
            <path d="M10 4h11v22h17v14H10z" fill={C_GM.core} stroke={C_GM.deep} strokeWidth="5" strokeLinejoin="round" />
          </svg>
        </P>
      ))}
      <P x={50} y={56} w={32} h={9} cls="g05-gm-rank" style={{ ...adv, ...d(delayMs, 620) }}>
        <svg viewBox="0 0 170 48" className="block h-full w-full">
          <path d="M8 46V22a10 10 0 0 1 20 0v24zM50 46V22a10 10 0 0 1 20 0v24zM92 46V22a10 10 0 0 1 20 0v24zM134 46V22a10 10 0 0 1 20 0v24z" fill={C_GM.deep} stroke={C_GM.core} strokeWidth="4" strokeLinejoin="round" />
        </svg>
      </P>
      <Chaff color={C_GM.glow} delayMs={delayMs + 780} />
    </Wide>
  );
}

/* =============================================================================
   10. Famine (t6) — DIG IN. Tell: a spade scores a line along the ground.
   Strike: the trench opens and the whole rank drops into it out of reach.
   Settle: planks slide over the top and a reaching hand comes across the line,
   finds nothing, and pulls back.
   ========================================================================== */

const C_FA = { core: "#8a7c5a", glow: "#f0e6cc", deep: "#201a10" };

function FamineScene({ role, delayMs }: SceneProps) {
  const adv = { "--g05-adv": "calc(var(--fx-side, 1) * -1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-hit" style={d(delayMs)}>
          <rect x="5" y="20" width="30" height="9" fill={C_FA.deep} stroke={C_FA.core} strokeWidth="2.4" />
        </g>
        <g className="g05-fa-drop" style={d(delayMs, 220)}>
          <path d={PAWN_D} fill={C_FA.core} stroke={C_FA.deep} strokeWidth="2.4" transform="translate(10 -2) scale(0.5)" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-fa-cut" style={d(delayMs)}>
          <path d="M6 22h28" stroke={C_FA.glow} strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="g05-arrive" style={d(delayMs, 240)}>
          <rect x="6" y="22" width="28" height="10" fill={C_FA.deep} stroke={C_FA.core} strokeWidth="2.4" />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 430)}>
          <path d="M6 20h28" stroke={C_FA.core} strokeWidth="3" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Field tint="rgba(138,124,90,0.26)" delayMs={delayMs} />
      <P x={50} y={58} w={34} h={1.8} cls="g05-fa-cut" style={{ background: C_FA.glow, ...d(delayMs) }} />
      <P x={50} y={60} w={34} h={9} cls="g05-fa-trench" style={{ background: C_FA.deep, ...d(delayMs, 200) }} />
      {[0, 1, 2, 3].map((i) => (
        <P key={i} x={39 + i * 7.4} y={54} w={6} h={10} cls="g05-fa-drop" style={d(delayMs, 340 + i * 90)}>
          <Pawn fill={C_FA.core} stroke={C_FA.deep} />
        </P>
      ))}
      <P x={50} y={59} w={34} h={3.4} cls="g05-fa-lid" style={{ ...adv, background: C_FA.core, ...d(delayMs, 650) }} />
      <P x={50} y={46} w={12} h={12} cls="g05-fa-grab" style={{ ...adv, ...d(delayMs, 760) }}>
        <svg viewBox="0 0 60 60" className="block h-full w-full">
          <path d="M18 58V26a5 5 0 0 1 10 0V10a5 5 0 0 1 10 0v16a5 5 0 0 1 10 0v32z" fill={C_FA.glow} stroke={C_FA.deep} strokeWidth="4" strokeLinejoin="round" />
        </svg>
      </P>
      <Chaff color={C_FA.core} delayMs={delayMs + 900} />
    </Wide>
  );
}

/* =============================================================================
   11. Pied Piper, the hex (t6) — THE REED PIPE. Tell: the pipe tilts up and
   the first breath goes into it. Strike: three notes drift out over the line,
   away from the caster. Settle: a row of boots pivots to follow them and a
   thread of sound loops back round the pipe.
   ========================================================================== */

const C_PP = { core: "#7fd0c0", glow: "#e4fff8", deep: "#123029" };

function PiedPiperHexScene({ role, delayMs }: SceneProps) {
  const adv = { "--g05-adv": "calc(var(--fx-side, 1) * -1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-pp-turn" style={{ animationDelay: `calc(${delayMs}ms + var(--fx-index, 0) * 80ms)` }}>
          <path d="M14 12h7v14h11v8H14z" fill={C_PP.core} stroke={C_PP.deep} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <g className="g05-pp-note" style={{ ...adv, ...d(delayMs, 230) }}>
          <circle cx="26" cy="10" r="3.4" fill={C_PP.glow} />
          <path d="M29 10V3" stroke={C_PP.glow} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-pp-pipe" style={d(delayMs)}>
          <path d="M7 28L31 9" stroke={C_PP.core} strokeWidth="5" strokeLinecap="round" />
          <circle cx="13" cy="24" r="1.6" fill={C_PP.deep} />
          <circle cx="19" cy="19" r="1.6" fill={C_PP.deep} />
        </g>
        <g className="g05-pp-note" style={d(delayMs, 250)}>
          <circle cx="31" cy="17" r="3.4" fill={C_PP.glow} />
          <path d="M34 17v-7" stroke={C_PP.glow} strokeWidth="2.2" strokeLinecap="round" />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 440)}>
          <circle cx="20" cy="20" r="14" fill="none" stroke={C_PP.core} strokeWidth="2" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Field tint="rgba(127,208,192,0.26)" delayMs={delayMs} />
      <P x={44} y={46} w={18} h={12} cls="g05-pp-pipe" style={d(delayMs)}>
        <svg viewBox="0 0 100 66" className="block h-full w-full">
          <path d="M6 60L92 10" stroke={C_PP.core} strokeWidth="11" strokeLinecap="round" />
          <circle cx="30" cy="46" r="3.6" fill={C_PP.deep} />
          <circle cx="46" cy="37" r="3.6" fill={C_PP.deep} />
          <circle cx="62" cy="28" r="3.6" fill={C_PP.deep} />
        </svg>
      </P>
      {[0, 1, 2].map((i) => (
        <P key={i} x={56 + i * 5} y={40 - i * 3} w={6} h={7} cls="g05-pp-note" style={{ ...adv, ...d(delayMs, 240 + i * 110) }}>
          <svg viewBox="0 0 40 46" className="block h-full w-full">
            <circle cx="14" cy="34" r="10" fill={C_PP.glow} />
            <path d="M24 34V4l12 6" fill="none" stroke={C_PP.glow} strokeWidth="5" strokeLinecap="round" />
          </svg>
        </P>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <P key={i} x={39 + i * 7.4} y={62} w={5} h={5.4} cls="g05-pp-turn" style={d(delayMs, 560 + i * 90)}>
          <svg viewBox="0 0 40 44" className="block h-full w-full">
            <path d="M10 4h11v22h17v14H10z" fill={C_PP.deep} stroke={C_PP.core} strokeWidth="5" strokeLinejoin="round" />
          </svg>
        </P>
      ))}
      <P x={50} y={50} w={26} h={26} cls="g05-pp-thread" style={{ border: `2px solid ${C_PP.glow}`, borderRadius: "50%", ...d(delayMs, 760) }} />
      <Chaff color={C_PP.glow} delayMs={delayMs + 860} />
    </Wide>
  );
}

/* =============================================================================
   12. Cloud Serpent (t6) — THE COIL LAID ALONG A RANK. Aimed. Tell: vapour
   gathers on the line and thickens. Strike: the body pours in from the far end
   and its reach is the play's own length; the head arrives and turns to face
   back. Settle: one pawn under the coil is crushed flat and the cloud thins.
   ========================================================================== */

const C_CS = { core: "#a6c6e8", glow: "#eef6ff", deep: "#1b2740" };

function CloudSerpentScene({ role, delayMs }: SceneProps) {
  const reach = { "--g05-reach": "calc(var(--fx-len, 3) / 3)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-hit" style={d(delayMs)}>
          <path d="M3 24q9-14 18 0t16-6" fill="none" stroke={C_CS.core} strokeWidth="6" strokeLinecap="round" />
        </g>
        <g className="g05-cs-crush" style={d(delayMs, 230)}>
          <path d={PAWN_D} fill={C_CS.deep} stroke={C_CS.glow} strokeWidth="2.4" transform="translate(10 6) scale(0.5)" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-arrive" style={d(delayMs)}>
          <path d="M4 28q10-16 19 0t14-10" fill="none" stroke={C_CS.core} strokeWidth="6" strokeLinecap="round" />
        </g>
        <g className="g05-cs-head" style={d(delayMs, 250)}>
          <path d="M28 12l9-4-3 8 4 5-10 2z" fill={C_CS.glow} stroke={C_CS.deep} strokeWidth="2" strokeLinejoin="round" />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 440)}>
          <path d="M4 34q9-5 17 0t15 0" fill="none" stroke={C_CS.glow} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <>
      <Wide>
        <Field tint="rgba(166,198,232,0.26)" delayMs={delayMs} />
        <Chaff color={C_CS.glow} delayMs={delayMs + 820} />
      </Wide>
      <Aim>
        <P x={50} y={50} w={20} h={5} cls="g05-tell" style={{ background: C_CS.glow, borderRadius: "50%", ...d(delayMs) }} />
        <P x={54} y={50} w={40} h={14} cls="g05-cs-coil" style={{ ...reach, ...d(delayMs, 220) }}>
          <svg viewBox="0 0 200 70" className="block h-full w-full">
            <path d="M4 40q24-34 48 0t48 0 48 0 48 0" fill="none" stroke={C_CS.core} strokeWidth="16" strokeLinecap="round" />
          </svg>
        </P>
        <P x={70} y={46} w={12} h={10} cls="g05-cs-head" style={d(delayMs, 460)}>
          <svg viewBox="0 0 60 50" className="block h-full w-full">
            <path d="M4 26l34-18-6 16 12 10-34 8z" fill={C_CS.glow} stroke={C_CS.deep} strokeWidth="5" strokeLinejoin="round" />
            <circle cx="26" cy="18" r="3" fill={C_CS.deep} />
          </svg>
        </P>
        <P x={44} y={57} w={8} h={11} cls="g05-cs-crush" style={d(delayMs, 620)}>
          <Pawn fill={C_CS.deep} stroke={C_CS.glow} />
        </P>
        <P x={54} y={50} w={40} h={16} cls="g05-cs-mist" style={{ background: `linear-gradient(90deg, transparent, ${C_CS.glow}, transparent)`, ...d(delayMs, 700) }} />
      </Aim>
    </>
  );
}

/* =============================================================================
   13. Locust Swarm (t6) — A RANK STRIPPED TO STUBBLE. Aimed. Tell: a dark
   smudge gathers off the end of the rank. Strike: the swarm pours along the
   line, its run scaled by the play's own length, and four locusts break out of
   the mass. Settle: the pawns collapse to stubble and a bare strip is left.
   ========================================================================== */

const C_LS = { core: "#b6c24a", glow: "#f2f6c8", deep: "#2a2e0c" };

function LocustSwarmScene({ role, delayMs }: SceneProps) {
  const reach = { "--g05-reach": "calc(var(--fx-len, 3) / 3)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-hit" style={d(delayMs)}>
          <ellipse cx="20" cy="18" rx="14" ry="9" fill={C_LS.deep} opacity="0.8" />
          <path d="M10 14l5 3M28 12l-5 4M14 24l4-3M26 25l-4-3" stroke={C_LS.core} strokeWidth="2" strokeLinecap="round" />
        </g>
        <g className="g05-ls-stub" style={d(delayMs, 230)}>
          <path d="M11 34v-5M17 34v-7M23 34v-5M29 34v-6" stroke={C_LS.core} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-arrive" style={d(delayMs)}>
          <ellipse cx="20" cy="19" rx="8" ry="5" fill={C_LS.core} stroke={C_LS.deep} strokeWidth="2.2" />
          <path d="M14 15l-6-6M26 15l6-6M15 24l-6 6M25 24l6 6" stroke={C_LS.deep} strokeWidth="2.2" strokeLinecap="round" />
        </g>
        <g className="g05-ls-bug" style={d(delayMs, 250)}>
          <ellipse cx="31" cy="9" rx="3.4" ry="2.2" fill={C_LS.deep} />
          <ellipse cx="8" cy="12" rx="2.8" ry="1.8" fill={C_LS.deep} />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 440)}>
          <path d="M6 34h28" stroke={C_LS.glow} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <>
      <Wide>
        <Furrow color="rgba(42,46,12,0.5)" delayMs={delayMs} y={56} h={7} />
        <Chaff color={C_LS.core} delayMs={delayMs + 840} />
      </Wide>
      <Aim>
        <P x={44} y={50} w={9} h={9} cls="g05-tell" style={{ background: C_LS.deep, borderRadius: "50%", ...d(delayMs) }} />
        <P x={54} y={50} w={40} h={13} cls="g05-ls-cloud" style={{ ...reach, ...d(delayMs, 210) }}>
          <svg viewBox="0 0 200 64" className="block h-full w-full">
            <path d="M10 40q14-24 32-12 10-20 30-8 16-14 34 2 18-8 30 8 16-2 24 14 8 18-14 14H26q-20-2-16-18z" fill={C_LS.deep} opacity="0.85" />
          </svg>
        </P>
        {[0, 1, 2, 3].map((i) => (
          <P key={i} x={48 + i * 8} y={44 + (i % 2) * 10} w={4.4} h={3} cls="g05-ls-bug" style={d(delayMs, 380 + i * 90)}>
            <svg viewBox="0 0 40 26" className="block h-full w-full">
              <ellipse cx="20" cy="14" rx="14" ry="7" fill={C_LS.core} stroke={C_LS.deep} strokeWidth="3" />
              <path d="M10 8L2 2M30 8l8-6" stroke={C_LS.deep} strokeWidth="3" strokeLinecap="round" />
            </svg>
          </P>
        ))}
        <P x={54} y={56} w={34} h={5} cls="g05-ls-stub" style={d(delayMs, 640)}>
          <svg viewBox="0 0 180 26" className="block h-full w-full">
            <path d="M10 24V10M40 24V6M70 24v-12M100 24V8M130 24v-14M160 24V9" stroke={C_LS.core} strokeWidth="7" strokeLinecap="round" />
          </svg>
        </P>
        <P x={54} y={50} w={40} h={3} cls="g05-ls-strip" style={{ background: C_LS.glow, ...d(delayMs, 760) }} />
      </Aim>
    </>
  );
}

/* =============================================================================
   14. Volcanic Vent (t6) — THE FIELD SPLITS. Tell: a hairline crack runs and
   the ground under it glows through. Strike: a cinder cone pushes up and blows
   its plume. Settle: four neighbours are shoved one square outward and the ash
   drifts back down the way the caster faces.
   ========================================================================== */

const C_VV = { core: "#ef7a3a", glow: "#ffe0c0", deep: "#2e0f06" };
const VV_PUSH = [
  { x: 41, y: 50, mx: "-150%", my: "0%" },
  { x: 59, y: 50, mx: "150%", my: "0%" },
  { x: 50, y: 41, mx: "0%", my: "-150%" },
  { x: 50, y: 59, mx: "0%", my: "150%" },
];

function VolcanicVentScene({ role, delayMs }: SceneProps) {
  const adv = { "--g05-adv": "calc(var(--fx-side, 1) * -1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-hit" style={d(delayMs)}>
          <path d="M8 32l12-20 12 20z" fill={C_VV.deep} stroke={C_VV.core} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <g className="g05-vv-blast" style={d(delayMs, 220)}>
          <path d="M20 14V2M13 16L7 7M27 16l6-9" stroke={C_VV.glow} strokeWidth="3" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-vv-crack" style={d(delayMs)}>
          <path d="M6 30l7-4 5 5 6-6 10 4" fill="none" stroke={C_VV.core} strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="g05-arrive" style={d(delayMs, 240)}>
          <path d="M9 31l11-18 11 18z" fill={C_VV.deep} stroke={C_VV.core} strokeWidth="2.6" strokeLinejoin="round" />
        </g>
        <g className="g05-vv-ash" style={d(delayMs, 430)}>
          <circle cx="20" cy="7" r="3" fill={C_VV.glow} />
          <circle cx="29" cy="12" r="2" fill={C_VV.glow} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Field tint="rgba(239,122,58,0.3)" delayMs={delayMs} />
      <P x={50} y={58} w={30} h={2} cls="g05-vv-crack" style={{ background: C_VV.core, ...d(delayMs, 90) }} />
      <P x={50} y={55} w={18} h={13} cls="g05-vv-cone" style={d(delayMs, 200)}>
        <svg viewBox="0 0 100 70" className="block h-full w-full">
          <path d="M6 66l32-56h24l32 56z" fill={C_VV.deep} stroke={C_VV.core} strokeWidth="6" strokeLinejoin="round" />
          <path d="M38 12h24" stroke={C_VV.glow} strokeWidth="6" />
        </svg>
      </P>
      <P x={50} y={42} w={16} h={16} cls="g05-vv-blast" style={d(delayMs, 360)}>
        <svg viewBox="0 0 80 80" className="block h-full w-full">
          <path d="M40 78V22M40 30L18 8M40 30l22-22M14 46L2 34M66 46l12-12" stroke={C_VV.glow} strokeWidth="8" strokeLinecap="round" />
        </svg>
      </P>
      {VV_PUSH.map((v, i) => (
        <P key={i} x={v.x} y={v.y} w={6} h={9} cls="g05-vv-push" style={{ "--g05-mx": v.mx, "--g05-my": v.my, ...d(delayMs, 520 + i * 70) } as CSSProperties}>
          <Pawn fill={C_VV.core} stroke={C_VV.deep} />
        </P>
      ))}
      {[0, 1, 2].map((i) => (
        <P key={i} x={45 + i * 5} y={44} w={3} h={3} cls="g05-vv-ash" style={{ ...adv, background: C_VV.glow, borderRadius: "50%", ...d(delayMs, 720 + i * 90) }} />
      ))}
    </Wide>
  );
}

/* =============================================================================
   15. Field Hospital (t5) — THE STRETCHER. Tell: the tent flap lifts on its
   pole. Strike: a stretcher is carried in from behind the line and set down.
   Settle: the pawn sits up, a bandage winds twice round it, and a lamp steadies.
   ========================================================================== */

const C_FH = { core: "#8fd8b0", glow: "#eafff4", deep: "#123326" };

function FieldHospitalScene({ role, delayMs }: SceneProps) {
  const home = { "--g05-home": "var(--fx-side, 1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-hit" style={d(delayMs)}>
          <path d={PAWN_D} fill={C_FH.core} stroke={C_FH.deep} strokeWidth="2.4" transform="translate(10 4) scale(0.5)" />
        </g>
        <g className="g05-fh-band" style={d(delayMs, 220)}>
          <path d="M11 20h18M13 25h14" stroke={C_FH.glow} strokeWidth="3" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-arrive" style={d(delayMs)}>
          <path d="M6 32l14-22 14 22z" fill={C_FH.deep} stroke={C_FH.core} strokeWidth="2.6" strokeLinejoin="round" />
        </g>
        <g className="g05-fh-tent" style={d(delayMs, 240)}>
          <path d="M20 32V16l7 16z" fill={C_FH.core} />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 430)}>
          <path d="M16 21h8M20 17v8" stroke={C_FH.glow} strokeWidth="3" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Field tint="rgba(143,216,176,0.26)" delayMs={delayMs} />
      <P x={50} y={50} w={26} h={20} cls="g05-fh-tent" style={d(delayMs)}>
        <svg viewBox="0 0 140 110" className="block h-full w-full">
          <path d="M8 104L70 12l62 92z" fill={C_FH.deep} stroke={C_FH.core} strokeWidth="6" strokeLinejoin="round" />
          <path d="M70 104V44l26 60z" fill={C_FH.core} />
        </svg>
      </P>
      <P x={50} y={62} w={24} h={4} cls="g05-fh-stretcher" style={{ ...home, ...d(delayMs, 260) }}>
        <svg viewBox="0 0 140 24" className="block h-full w-full">
          <rect x="10" y="6" width="120" height="12" fill={C_FH.glow} stroke={C_FH.deep} strokeWidth="4" />
          <path d="M2 12h12M126 12h12" stroke={C_FH.core} strokeWidth="6" strokeLinecap="round" />
        </svg>
      </P>
      <P x={50} y={57} w={8} h={11} cls="g05-fh-sit" style={d(delayMs, 460)}>
        <Pawn fill={C_FH.core} stroke={C_FH.deep} />
      </P>
      <P x={50} y={56} w={11} h={6} cls="g05-fh-band" style={d(delayMs, 620)}>
        <svg viewBox="0 0 60 32" className="block h-full w-full">
          <path d="M4 10h52M6 22h48" stroke={C_FH.glow} strokeWidth="8" strokeLinecap="round" />
        </svg>
      </P>
      <P x={62} y={44} w={6} h={8} cls="g05-fh-lamp" style={d(delayMs, 740)}>
        <svg viewBox="0 0 40 50" className="block h-full w-full">
          <path d="M20 2v8M8 12h24l-5 32H13z" fill={C_FH.glow} stroke={C_FH.deep} strokeWidth="4" strokeLinejoin="round" />
        </svg>
      </P>
      <Chaff color={C_FH.glow} delayMs={delayMs + 840} />
    </Wide>
  );
}

/* =============================================================================
   16. Letters Home (t5) — THE SATCHEL EMPTIED. Tell: the buckle strap goes
   slack. Strike: the flap is thrown back and three letters fly out. Settle:
   one unfolds to a written page and two recruits step out of it and march off
   the way the line faces.
   ========================================================================== */

const C_LH = { core: "#d3707f", glow: "#ffe9ec", deep: "#33121a" };

function LettersHomeScene({ role, delayMs }: SceneProps) {
  const adv = { "--g05-adv": "calc(var(--fx-side, 1) * -1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-hit" style={d(delayMs)}>
          <rect x="7" y="13" width="26" height="17" fill={C_LH.glow} stroke={C_LH.deep} strokeWidth="2.4" />
          <path d="M7 13l13 10 13-10" fill="none" stroke={C_LH.deep} strokeWidth="2.4" />
        </g>
        <g className="g05-hit2" style={d(delayMs, 220)}>
          <circle cx="30" cy="11" r="4" fill={C_LH.core} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-arrive" style={d(delayMs)}>
          <rect x="8" y="16" width="24" height="16" fill={C_LH.deep} stroke={C_LH.core} strokeWidth="2.4" />
          <path d="M8 16q12-8 24 0" fill="none" stroke={C_LH.core} strokeWidth="2.4" />
        </g>
        <g className="g05-lh-letter" style={d(delayMs, 240)}>
          <rect x="14" y="4" width="13" height="10" fill={C_LH.glow} stroke={C_LH.deep} strokeWidth="2" />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 430)}>
          <circle cx="20" cy="24" r="13" fill="none" stroke={C_LH.core} strokeWidth="2" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Field tint="rgba(211,112,127,0.26)" delayMs={delayMs} />
      <P x={50} y={60} w={22} h={13} cls="g05-tell" style={d(delayMs, 90)}>
        <svg viewBox="0 0 120 70" className="block h-full w-full">
          <rect x="8" y="20" width="104" height="44" fill={C_LH.deep} stroke={C_LH.core} strokeWidth="6" />
          <path d="M8 20q52-22 104 0" fill="none" stroke={C_LH.core} strokeWidth="6" />
        </svg>
      </P>
      {[0, 1, 2].map((i) => (
        <P key={i} x={44 + i * 6} y={50} w={8} h={6} cls="g05-lh-letter" style={{ "--g05-mr": `${[-32, 8, 34][i]}deg`, ...d(delayMs, 200 + i * 100) } as CSSProperties}>
          <svg viewBox="0 0 60 44" className="block h-full w-full">
            <rect x="4" y="4" width="52" height="36" fill={C_LH.glow} stroke={C_LH.deep} strokeWidth="4" />
            <path d="M4 4l26 20L56 4" fill="none" stroke={C_LH.deep} strokeWidth="4" />
          </svg>
        </P>
      ))}
      <P x={50} y={44} w={13} h={9} cls="g05-lh-open" style={d(delayMs, 540)}>
        <svg viewBox="0 0 70 48" className="block h-full w-full">
          <rect x="4" y="4" width="62" height="40" fill={C_LH.glow} stroke={C_LH.deep} strokeWidth="5" />
          <path d="M14 18h42M14 28h30" stroke={C_LH.core} strokeWidth="5" strokeLinecap="round" />
        </svg>
      </P>
      {[0, 1].map((i) => (
        <P key={i} x={45 + i * 10} y={52} w={7} h={11} cls="g05-lh-recruit" style={{ ...adv, ...d(delayMs, 680 + i * 110) }}>
          <Pawn fill={C_LH.core} stroke={C_LH.deep} />
        </P>
      ))}
      <Chaff color={C_LH.glow} delayMs={delayMs + 860} />
    </Wide>
  );
}

/* =============================================================================
   17. Small Consolation (t5) — SIFTING THE RUBBLE. Tell: the tower's shadow
   leans before the tower does. Strike: a rook topples and breaks into blocks.
   Settle: a rake drags the rubble over, one small pawn is lifted out of it, and
   the dust settles back down the line.
   ========================================================================== */

const C_SC = { core: "#9b9a94", glow: "#f0eee6", deep: "#23231f" };
const SC_RUBBLE = [
  { x: 43, mx: "-140%", mr: "-40deg" },
  { x: 48, mx: "-40%", mr: "22deg" },
  { x: 53, mx: "60%", mr: "-18deg" },
  { x: 58, mx: "150%", mr: "48deg" },
];

function SmallConsolationScene({ role, delayMs }: SceneProps) {
  const home = { "--g05-home": "var(--fx-side, 1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-sc-tower" style={d(delayMs)}>
          <path d="M11 33V13h4v-4h4v4h2v-4h4v4h4v20z" fill={C_SC.core} stroke={C_SC.deep} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <g className="g05-sc-lift" style={d(delayMs, 230)}>
          <path d={PAWN_D} fill={C_SC.glow} stroke={C_SC.deep} strokeWidth="2.4" transform="translate(12 12) scale(0.4)" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-arrive" style={d(delayMs)}>
          <path d="M10 32V12h5V7h4v5h2V7h4v5h5v20z" fill={C_SC.deep} stroke={C_SC.core} strokeWidth="2.6" strokeLinejoin="round" />
        </g>
        <g className="g05-sc-rubble" style={d(delayMs, 250)}>
          <rect x="6" y="29" width="5" height="5" fill={C_SC.core} />
          <rect x="29" y="30" width="5" height="4" fill={C_SC.core} />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 440)}>
          <path d="M5 35h30" stroke={C_SC.glow} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Field tint="rgba(155,154,148,0.26)" delayMs={delayMs} />
      <P x={54} y={64} w={20} h={3} cls="g05-tell" style={{ background: C_SC.deep, borderRadius: "50%", ...d(delayMs) }} />
      <P x={50} y={53} w={14} h={20} cls="g05-sc-tower" style={d(delayMs, 160)}>
        <svg viewBox="0 0 70 100" className="block h-full w-full">
          <path d="M12 96V30h9V16h9v14h4V16h9v14h9v66z" fill={C_SC.core} stroke={C_SC.deep} strokeWidth="6" strokeLinejoin="round" />
        </svg>
      </P>
      {SC_RUBBLE.map((r, i) => (
        <P key={i} x={r.x} y={62} w={4.4} h={4} cls="g05-sc-rubble" style={{ "--g05-mx": r.mx, "--g05-mr": r.mr, background: C_SC.core, ...d(delayMs, 420 + i * 70) } as CSSProperties} />
      ))}
      <P x={50} y={60} w={22} h={7} cls="g05-sc-sift" style={{ ...home, ...d(delayMs, 620) }}>
        <svg viewBox="0 0 120 40" className="block h-full w-full">
          <path d="M6 6h108M18 6v28M42 6v28M66 6v28M90 6v28M110 6v28" stroke={C_SC.deep} strokeWidth="6" strokeLinecap="round" />
        </svg>
      </P>
      <P x={50} y={54} w={7} h={10} cls="g05-sc-lift" style={d(delayMs, 760)}>
        <Pawn fill={C_SC.glow} stroke={C_SC.deep} />
      </P>
      <Chaff color={C_SC.core} delayMs={delayMs + 880} />
    </Wide>
  );
}

/* =============================================================================
   18. Stray Cat (t5) — SOMETHING WANDERS THROUGH THE LINE. Tell: two eyes open
   in the dark at the edge of the field. Strike: the cat crosses the line at
   its own pace, tail up, coming toward the caster's side. Settle: it curls up
   where it stops and four small hushes fall over the pieces nearest it.
   ========================================================================== */

const C_CT = { core: "#e4b892", glow: "#fff4e6", deep: "#2a2018" };

function StrayCatScene({ role, delayMs }: SceneProps) {
  const home = { "--g05-home": "var(--fx-side, 1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-hit" style={d(delayMs)}>
          <path d="M9 28q0-9 7-11l-2-6 5 4h3l5-4-2 6q7 2 7 11z" fill={C_CT.core} stroke={C_CT.deep} strokeWidth="2.2" strokeLinejoin="round" />
        </g>
        <g className="g05-ct-blink" style={d(delayMs, 220)}>
          <ellipse cx="16" cy="21" rx="1.6" ry="2.2" fill={C_CT.deep} />
          <ellipse cx="24" cy="21" rx="1.6" ry="2.2" fill={C_CT.deep} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-ct-blink" style={d(delayMs)}>
          <ellipse cx="15" cy="17" rx="2.2" ry="3" fill={C_CT.glow} />
          <ellipse cx="25" cy="17" rx="2.2" ry="3" fill={C_CT.glow} />
        </g>
        <g className="g05-arrive" style={d(delayMs, 240)}>
          <path d="M8 32q0-11 8-13l-3-8 6 5h4l6-5-3 8q8 2 8 13z" fill={C_CT.deep} stroke={C_CT.core} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <g className="g05-ct-tail" style={d(delayMs, 430)}>
          <path d="M31 31q7-2 5-11" fill="none" stroke={C_CT.core} strokeWidth="3" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Field tint="rgba(228,184,146,0.24)" delayMs={delayMs} />
      <Furrow color="rgba(42,32,24,0.45)" delayMs={delayMs + 60} y={62} h={5} />
      <P x={38} y={58} w={6} h={3} cls="g05-tell" style={{ background: C_CT.glow, borderRadius: "50%", ...d(delayMs, 90) }} />
      <P x={50} y={57} w={20} h={12} cls="g05-ct-walk" style={{ ...home, ...d(delayMs, 220) }}>
        <svg viewBox="0 0 110 66" className="block h-full w-full">
          <path d="M14 56q2-22 20-24l-6-16 12 9h10l12-9-6 16q20 3 20 24z" fill={C_CT.core} stroke={C_CT.deep} strokeWidth="5" strokeLinejoin="round" />
          <ellipse cx="40" cy="26" rx="3" ry="4" fill={C_CT.deep} />
          <ellipse cx="58" cy="26" rx="3" ry="4" fill={C_CT.deep} />
        </svg>
      </P>
      <P x={62} y={52} w={8} h={10} cls="g05-ct-tail" style={d(delayMs, 420)}>
        <svg viewBox="0 0 40 56" className="block h-full w-full">
          <path d="M6 52q24-6 18-40" fill="none" stroke={C_CT.core} strokeWidth="8" strokeLinecap="round" />
        </svg>
      </P>
      <P x={50} y={60} w={14} h={8} cls="g05-ct-curl" style={d(delayMs, 620)}>
        <svg viewBox="0 0 80 44" className="block h-full w-full">
          <path d="M8 40q-4-30 32-30t32 30z" fill={C_CT.deep} stroke={C_CT.core} strokeWidth="5" strokeLinejoin="round" />
        </svg>
      </P>
      {[0, 1, 2, 3].map((i) => (
        <P key={i} x={38 + i * 8} y={46} w={7} h={7} cls="g05-ct-hush" style={{ border: `2px solid ${C_CT.glow}`, borderRadius: "50%", ...d(delayMs, 720 + i * 80) }} />
      ))}
    </Wide>
  );
}

/* =============================================================================
   19. Echo of Bells (t5) — THE LINE KNEELS. Tell: the bell leans on its
   headstock. Strike: the tongue strikes and two tolls roll out over the board.
   Settle: the whole rank goes down on one knee in order, and something passes
   over their heads unchallenged.
   ========================================================================== */

const C_EB = { core: "#b58fc0", glow: "#f7ecff", deep: "#26183a" };

function EchoOfBellsScene({ role, delayMs }: SceneProps) {
  const adv = { "--g05-adv": "calc(var(--fx-side, 1) * -1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-eb-kneel" style={{ animationDelay: `calc(${delayMs}ms + var(--fx-index, 0) * 80ms)` }}>
          <path d={PAWN_D} fill={C_EB.core} stroke={C_EB.deep} strokeWidth="2.4" transform="translate(10 6) scale(0.5)" />
        </g>
        <g className="g05-hit2" style={d(delayMs, 230)}>
          <circle cx="20" cy="20" r="15" fill="none" stroke={C_EB.glow} strokeWidth="2" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-eb-bell" style={d(delayMs)}>
          <path d="M20 6q10 0 10 16v6H10v-6q0-16 10-16z" fill={C_EB.core} stroke={C_EB.deep} strokeWidth="2.4" strokeLinejoin="round" />
          <rect x="8" y="28" width="24" height="4" fill={C_EB.deep} />
        </g>
        <g className="g05-eb-toll" style={d(delayMs, 250)}>
          <circle cx="20" cy="20" r="16" fill="none" stroke={C_EB.glow} strokeWidth="2.4" />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 440)}>
          <circle cx="20" cy="34" r="2.6" fill={C_EB.glow} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Fence color="rgba(181,143,192,0.5)" delayMs={delayMs} />
      <P x={50} y={42} w={16} h={16} cls="g05-eb-bell" style={d(delayMs)}>
        <svg viewBox="0 0 90 90" className="block h-full w-full">
          <path d="M45 8q26 0 26 44v14H19V52Q19 8 45 8z" fill={C_EB.core} stroke={C_EB.deep} strokeWidth="6" strokeLinejoin="round" />
          <rect x="12" y="66" width="66" height="10" fill={C_EB.deep} />
          <circle cx="45" cy="82" r="7" fill={C_EB.glow} />
        </svg>
      </P>
      <BoardFrame>
        <span
          className="g05-eb-toll absolute block"
          style={{ left: "18%", top: "18%", width: "64%", height: "64%", border: `3px solid ${C_EB.glow}`, borderRadius: "50%", ...d(delayMs, 280) }}
        />
        <span
          className="g05-eb-toll absolute block"
          style={{ left: "18%", top: "18%", width: "64%", height: "64%", border: `2px solid ${C_EB.core}`, borderRadius: "50%", ...d(delayMs, 420) }}
        />
      </BoardFrame>
      {[0, 1, 2, 3, 4].map((i) => (
        <P key={i} x={38 + i * 6} y={60} w={5} h={9} cls="g05-eb-kneel" style={d(delayMs, 500 + i * 90)}>
          <Pawn fill={C_EB.core} stroke={C_EB.deep} />
        </P>
      ))}
      <P x={50} y={54} w={34} h={3} cls="g05-eb-pass" style={{ ...adv, background: `linear-gradient(90deg, transparent, ${C_EB.glow}, transparent)`, ...d(delayMs, 800) }} />
      <Chaff color={C_EB.glow} delayMs={delayMs + 880} />
    </Wide>
  );
}

/* =============================================================================
   20. No Doubling (t5) — ONE MAN PER FURROW. Tell: a file line is scratched
   down the board. Strike: a stake is driven into it and a second pawn trying
   to share the file is shoved aside. Settle: a crossbar snaps down over the
   file it may not enter, and the loose earth falls back.
   ========================================================================== */

const C_ND = { core: "#e0c04a", glow: "#fff5cc", deep: "#33290a" };

function NoDoublingScene({ role, delayMs }: SceneProps) {
  const adv = { "--g05-adv": "calc(var(--fx-side, 1) * -1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-hit" style={d(delayMs)}>
          <path d="M20 4v30M15 34h10" stroke={C_ND.core} strokeWidth="3.4" strokeLinecap="round" />
        </g>
        <g className="g05-nd-shove" style={d(delayMs, 220)}>
          <path d={PAWN_D} fill={C_ND.glow} stroke={C_ND.deep} strokeWidth="2.4" transform="translate(18 8) scale(0.42)" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-nd-file" style={d(delayMs)}>
          <path d="M20 3v34" stroke={C_ND.core} strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="g05-arrive" style={d(delayMs, 240)}>
          <path d="M20 8l5 8-5 22-5-22z" fill={C_ND.deep} stroke={C_ND.core} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 430)}>
          <path d="M8 16h24" stroke={C_ND.glow} strokeWidth="3" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <BoardFrame>
        <span
          className="g05-nd-file absolute block"
          style={{ left: "46%", top: 0, width: "8%", height: "100%", background: `linear-gradient(180deg, transparent, ${C_ND.core}, transparent)`, ...d(delayMs) }}
        />
      </BoardFrame>
      <Furrow color="rgba(51,41,10,0.45)" delayMs={delayMs + 80} y={62} h={5} />
      <P x={50} y={52} w={5} h={20} cls="g05-nd-stake" style={{ ...adv, ...d(delayMs, 240) }}>
        <svg viewBox="0 0 30 110" className="block h-full w-full">
          <path d="M15 4l9 16-9 86-9-86z" fill={C_ND.core} stroke={C_ND.deep} strokeWidth="5" strokeLinejoin="round" />
        </svg>
      </P>
      <P x={50} y={58} w={8} h={11} cls="g05-nd-hold" style={d(delayMs, 400)}>
        <Pawn fill={C_ND.core} stroke={C_ND.deep} />
      </P>
      <P x={50} y={58} w={8} h={11} cls="g05-nd-shove" style={d(delayMs, 520)}>
        <Pawn fill={C_ND.glow} stroke={C_ND.deep} />
      </P>
      <P x={50} y={46} w={20} h={3.4} cls="g05-nd-bar" style={{ background: C_ND.deep, ...d(delayMs, 680) }} />
      <Chaff color={C_ND.glow} delayMs={delayMs + 820} />
    </Wide>
  );
}

/* =============================================================================
   21. Fireworks Barge (t5) — THE ROCKETS GO OFF. Tell: the hull rocks once at
   its mooring. Strike: the fuse runs the length of the deck and three rockets
   leave the tubes the way the line faces. Settle: the burst opens overhead and
   the pieces under it are shoved a square outward.
   ========================================================================== */

const C_FB = { core: "#ff8fb0", glow: "#fff0f4", deep: "#33101f" };

function FireworksBargeScene({ role, delayMs }: SceneProps) {
  const adv = { "--g05-adv": "calc(var(--fx-side, 1) * -1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-hit" style={d(delayMs)}>
          <path d="M20 4l4 12-4 6-4-6z" fill={C_FB.core} stroke={C_FB.deep} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M20 22v10" stroke={C_FB.glow} strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="g05-fb-burst" style={d(delayMs, 220)}>
          <path d="M20 20L8 8M20 20l12-12M20 20L6 26M20 20l14 6" stroke={C_FB.glow} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-arrive" style={d(delayMs)}>
          <path d="M5 24h30l-5 9H10z" fill={C_FB.deep} stroke={C_FB.core} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <g className="g05-fb-fuse" style={d(delayMs, 240)}>
          <path d="M10 22h20" stroke={C_FB.glow} strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="g05-fb-burst" style={d(delayMs, 430)}>
          <path d="M20 12V3M13 14L7 8M27 14l6-6" stroke={C_FB.core} strokeWidth="3" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Furrow color="rgba(51,16,31,0.5)" delayMs={delayMs} y={64} h={7} />
      <P x={50} y={62} w={28} h={7} cls="g05-tell" style={d(delayMs)}>
        <svg viewBox="0 0 150 36" className="block h-full w-full">
          <path d="M6 8h138l-14 24H20z" fill={C_FB.deep} stroke={C_FB.core} strokeWidth="5" strokeLinejoin="round" />
        </svg>
      </P>
      <P x={50} y={58} w={28} h={2.4} cls="g05-fb-fuse" style={{ background: `linear-gradient(90deg, ${C_FB.glow}, ${C_FB.core})`, ...d(delayMs, 180) }} />
      {[0, 1, 2].map((i) => (
        <P key={i} x={44 + i * 6} y={54} w={4} h={9} cls="g05-fb-rocket" style={{ ...adv, ...d(delayMs, 330 + i * 90) }}>
          <svg viewBox="0 0 24 54" className="block h-full w-full">
            <path d="M12 2l7 16-7 10-7-10z" fill={C_FB.core} stroke={C_FB.deep} strokeWidth="4" strokeLinejoin="round" />
            <path d="M12 28v22" stroke={C_FB.glow} strokeWidth="5" strokeLinecap="round" />
          </svg>
        </P>
      ))}
      <P x={50} y={40} w={22} h={22} cls="g05-fb-burst" style={d(delayMs, 620)}>
        <svg viewBox="0 0 100 100" className="block h-full w-full">
          <path d="M50 50L18 18M50 50l32-32M50 50L14 62M50 50l36 12M50 50L38 88M50 50l14 38" stroke={C_FB.glow} strokeWidth="6" strokeLinecap="round" />
        </svg>
      </P>
      {[0, 1, 2, 3].map((i) => (
        <P key={i} x={i < 2 ? 43 : 57} y={i % 2 ? 57 : 43} w={6} h={9} cls="g05-fb-push" style={{ "--g05-mx": i < 2 ? "-130%" : "130%", "--g05-my": i % 2 ? "110%" : "-110%", ...d(delayMs, 740 + i * 60) } as CSSProperties}>
          <Pawn fill={C_FB.core} stroke={C_FB.deep} />
        </P>
      ))}
    </Wide>
  );
}

/* =============================================================================
   22. Pied Piper, the lure (t5) — THE TOW LINE. Aimed. Tell: the coil is
   gathered and swung once. Strike: a hooked line is thrown the whole length of
   the play and catches round a pawn. Settle: the pawn is hauled one square
   back toward the caster, leaving drag marks in the earth.
   ========================================================================== */

const C_TP = { core: "#c8a870", glow: "#fff2d8", deep: "#2c2210" };

function PiedPiperLureScene({ role, delayMs }: SceneProps) {
  const reach = { "--g05-reach": "calc(var(--fx-len, 3) / 3)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-hit" style={d(delayMs)}>
          <path d="M4 14h20q6 0 6 6t-6 6" fill="none" stroke={C_TP.core} strokeWidth="3.4" strokeLinecap="round" />
        </g>
        <g className="g05-tp-haul" style={d(delayMs, 220)}>
          <path d={PAWN_D} fill={C_TP.glow} stroke={C_TP.deep} strokeWidth="2.4" transform="translate(11 8) scale(0.46)" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-tp-coil" style={d(delayMs)}>
          <circle cx="20" cy="20" r="11" fill="none" stroke={C_TP.core} strokeWidth="3" />
          <circle cx="20" cy="20" r="6" fill="none" stroke={C_TP.core} strokeWidth="2.4" />
        </g>
        <g className="g05-tp-hook" style={d(delayMs, 250)}>
          <path d="M20 9V4q6 0 6 5t-6 5" fill="none" stroke={C_TP.glow} strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 440)}>
          <path d="M6 34h28" stroke={C_TP.deep} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <>
      <Wide>
        <Field tint="rgba(200,168,112,0.24)" delayMs={delayMs} />
        <Chaff color={C_TP.glow} delayMs={delayMs + 840} />
      </Wide>
      <Aim>
        <P x={44} y={50} w={10} h={10} cls="g05-tp-coil" style={{ border: `3px solid ${C_TP.core}`, borderRadius: "50%", ...d(delayMs) }} />
        <P x={56} y={50} w={34} h={2.4} cls="g05-tp-hook" style={{ ...reach, background: C_TP.core, ...d(delayMs, 220) }} />
        <P x={70} y={50} w={7} h={9} cls="g05-tp-catch" style={d(delayMs, 420)}>
          <svg viewBox="0 0 40 50" className="block h-full w-full">
            <path d="M6 6h16q12 0 12 16T22 42" fill="none" stroke={C_TP.glow} strokeWidth="7" strokeLinecap="round" />
          </svg>
        </P>
        <P x={64} y={50} w={8} h={11} cls="g05-tp-haul" style={d(delayMs, 560)}>
          <Pawn fill={C_TP.glow} stroke={C_TP.deep} />
        </P>
        <P x={62} y={57} w={22} h={2} cls="g05-tp-drag" style={{ background: C_TP.deep, ...d(delayMs, 720) }} />
      </Aim>
    </>
  );
}

/* =============================================================================
   23. Trojan Pawn (t5) — THE HOLLOW MAN. Tell: a seam lights up down the back
   of an ordinary pawn. Strike: the hatch swings open. Settle: two soldiers
   leap out onto the squares either side and the empty shell falls in on itself.
   ========================================================================== */

const C_TJ = { core: "#7f9a5a", glow: "#eef8d8", deep: "#1c2a12" };

function TrojanPawnScene({ role, delayMs }: SceneProps) {
  const adv = { "--g05-adv": "calc(var(--fx-side, 1) * -1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-hit" style={d(delayMs)}>
          <path d={PAWN_D} fill={C_TJ.core} stroke={C_TJ.deep} strokeWidth="2.4" transform="translate(10 4) scale(0.5)" />
          <path d="M20 12v20" stroke={C_TJ.glow} strokeWidth="2" strokeDasharray="3 2" />
        </g>
        <g className="g05-tj-leap" style={{ ...adv, ...d(delayMs, 220) } as CSSProperties}>
          <circle cx="10" cy="16" r="4" fill={C_TJ.glow} />
          <circle cx="30" cy="16" r="4" fill={C_TJ.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-arrive" style={d(delayMs)}>
          <path d={PAWN_D} fill={C_TJ.deep} stroke={C_TJ.core} strokeWidth="3" transform="translate(9 3) scale(0.55)" />
        </g>
        <g className="g05-tj-shell" style={d(delayMs, 240)}>
          <path d="M20 10v24" stroke={C_TJ.glow} strokeWidth="2.4" strokeDasharray="3 2.4" />
        </g>
        <g className="g05-tj-hatch" style={d(delayMs, 430)}>
          <path d="M20 14h9v14h-9z" fill={C_TJ.core} stroke={C_TJ.glow} strokeWidth="2" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Field tint="rgba(127,154,90,0.26)" delayMs={delayMs} />
      <P x={50} y={56} w={13} h={19} cls="g05-tj-shell" style={d(delayMs)}>
        <Pawn fill={C_TJ.core} stroke={C_TJ.deep} />
      </P>
      <P x={50} y={56} w={2} h={14} cls="g05-tell" style={{ background: C_TJ.glow, ...d(delayMs, 120) }} />
      <P x={54} y={56} w={7} h={13} cls="g05-tj-hatch" style={d(delayMs, 300)}>
        <svg viewBox="0 0 40 70" className="block h-full w-full">
          <rect x="4" y="4" width="32" height="62" fill={C_TJ.deep} stroke={C_TJ.glow} strokeWidth="5" />
        </svg>
      </P>
      {[0, 1].map((i) => (
        <P key={i} x={50} y={56} w={7} h={11} cls="g05-tj-leap" style={{ ...adv, "--g05-mx": i ? "160%" : "-160%", ...d(delayMs, 460 + i * 110) } as CSSProperties}>
          <Pawn fill={C_TJ.glow} stroke={C_TJ.deep} />
        </P>
      ))}
      <P x={50} y={60} w={13} h={9} cls="g05-tj-husk" style={d(delayMs, 700)}>
        <svg viewBox="0 0 70 50" className="block h-full w-full">
          <path d="M6 46q10-30 29-30t29 30z" fill="none" stroke={C_TJ.core} strokeWidth="6" strokeLinejoin="round" />
        </svg>
      </P>
      <Chaff color={C_TJ.glow} delayMs={delayMs + 840} />
    </Wide>
  );
}

/* =============================================================================
   24. Florist's Trick (t4) — SOWN AHEAD OF THE LINE. Tell: the plough blade
   catches on the sod. Strike: a furrow is cut forward, ahead of where the line
   stands, and three seeds drop into it. Settle: one opens into a bloom that
   straightens up into a pawn already halfway down the road.
   ========================================================================== */

const C_FT = { core: "#8fd06a", glow: "#eeffdc", deep: "#16300f" };

function FloristsTrickScene({ role, delayMs }: SceneProps) {
  const adv = { "--g05-adv": "calc(var(--fx-side, 1) * -1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-hit" style={d(delayMs)}>
          <path d="M20 34V18" stroke={C_FT.deep} strokeWidth="3" strokeLinecap="round" />
          <circle cx="20" cy="13" r="6" fill={C_FT.core} stroke={C_FT.deep} strokeWidth="2.2" />
        </g>
        <g className="g05-ft-bloom" style={d(delayMs, 220)}>
          <circle cx="13" cy="12" r="4" fill={C_FT.glow} />
          <circle cx="27" cy="12" r="4" fill={C_FT.glow} />
          <circle cx="20" cy="6" r="4" fill={C_FT.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-ft-plough" style={d(delayMs)}>
          <path d="M6 28l10-10 8 8" fill="none" stroke={C_FT.core} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g className="g05-arrive" style={d(delayMs, 240)}>
          <path d="M20 34V16" stroke={C_FT.deep} strokeWidth="3" strokeLinecap="round" />
          <circle cx="20" cy="11" r="7" fill={C_FT.core} stroke={C_FT.deep} strokeWidth="2.4" />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 430)}>
          <path d="M6 34h28" stroke={C_FT.glow} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Furrow color="rgba(22,48,15,0.5)" delayMs={delayMs} y={58} h={6} />
      <P x={44} y={54} w={12} h={12} cls="g05-ft-plough" style={{ ...adv, ...d(delayMs) }}>
        <svg viewBox="0 0 60 60" className="block h-full w-full">
          <path d="M6 54l22-24 20 16" fill="none" stroke={C_FT.core} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M28 30V6" stroke={C_FT.deep} strokeWidth="7" strokeLinecap="round" />
        </svg>
      </P>
      <P x={54} y={58} w={26} h={2.4} cls="g05-ft-cut" style={{ ...adv, background: C_FT.deep, ...d(delayMs, 220) }} />
      {[0, 1, 2].map((i) => (
        <P key={i} x={48 + i * 6} y={54} w={2.6} h={2.6} cls="g05-ft-seed" style={{ background: C_FT.glow, borderRadius: "50%", ...d(delayMs, 360 + i * 90) }} />
      ))}
      <P x={54} y={52} w={13} h={13} cls="g05-ft-bloom" style={d(delayMs, 600)}>
        <svg viewBox="0 0 70 70" className="block h-full w-full">
          <circle cx="35" cy="20" r="12" fill={C_FT.glow} />
          <circle cx="19" cy="34" r="12" fill={C_FT.glow} />
          <circle cx="51" cy="34" r="12" fill={C_FT.glow} />
          <circle cx="35" cy="30" r="8" fill={C_FT.core} />
          <path d="M35 40v26" stroke={C_FT.deep} strokeWidth="7" strokeLinecap="round" />
        </svg>
      </P>
      <P x={54} y={54} w={8} h={12} cls="g05-ft-stand" style={d(delayMs, 760)}>
        <Pawn fill={C_FT.core} stroke={C_FT.deep} />
      </P>
      <Chaff color={C_FT.glow} delayMs={delayMs + 880} />
    </Wide>
  );
}

/* =============================================================================
   25. Leapfrog (t4) — OVER THE BACK. Aimed. Tell: the front man plants his
   hands and bends. Strike: the one behind vaults over him, the arc as long as
   the play itself. Settle: he lands, both straighten, and the dust of the
   push-off falls back.
   ========================================================================== */

const C_LF = { core: "#7fc4f0", glow: "#e8f7ff", deep: "#0f2a3c" };

function LeapfrogScene({ role, delayMs }: SceneProps) {
  const reach = { "--g05-reach": "calc(var(--fx-len, 2) / 2)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-hit" style={d(delayMs)}>
          <path d="M6 30q8-10 16 0" fill="none" stroke={C_LF.core} strokeWidth="3.4" strokeLinecap="round" />
        </g>
        <g className="g05-lf-vault" style={d(delayMs, 220)}>
          <path d={PAWN_D} fill={C_LF.glow} stroke={C_LF.deep} strokeWidth="2.4" transform="translate(16 2) scale(0.44)" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-lf-bend" style={d(delayMs)}>
          <path d="M8 32q10-14 22 0" fill="none" stroke={C_LF.core} strokeWidth="4" strokeLinecap="round" />
        </g>
        <g className="g05-arrive" style={d(delayMs, 240)}>
          <path d={PAWN_D} fill={C_LF.glow} stroke={C_LF.deep} strokeWidth="3" transform="translate(11 -2) scale(0.46)" />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 430)}>
          <path d="M6 35h28" stroke={C_LF.deep} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <>
      <Wide>
        <Field tint="rgba(127,196,240,0.24)" delayMs={delayMs} />
        <Chaff color={C_LF.glow} delayMs={delayMs + 820} />
      </Wide>
      <Aim>
        <P x={46} y={56} w={14} h={9} cls="g05-lf-bend" style={d(delayMs)}>
          <svg viewBox="0 0 80 50" className="block h-full w-full">
            <path d="M6 46q34-42 68 0z" fill={C_LF.core} stroke={C_LF.deep} strokeWidth="6" strokeLinejoin="round" />
          </svg>
        </P>
        <P x={46} y={62} w={16} h={3} cls="g05-lf-hands" style={{ background: C_LF.deep, borderRadius: "50%", ...d(delayMs, 160) }} />
        <P x={54} y={46} w={8} h={12} cls="g05-lf-vault" style={{ ...reach, ...d(delayMs, 320) }}>
          <Pawn fill={C_LF.glow} stroke={C_LF.deep} />
        </P>
        <P x={62} y={60} w={12} h={4} cls="g05-lf-land" style={{ background: C_LF.core, borderRadius: "50%", ...d(delayMs, 600) }} />
        <P x={46} y={50} w={9} h={13} cls="g05-lf-up" style={d(delayMs, 720)}>
          <Pawn fill={C_LF.core} stroke={C_LF.deep} />
        </P>
      </Aim>
    </>
  );
}

/* =============================================================================
   26. Matryoshka Surprise (t4) — THE SPLIT. Tell: a brush paints the face on
   in one stroke. Strike: the doll parts at the waist and the top half lifts
   away. Settle: two smaller dolls pop out and wobble themselves to a stop.
   ========================================================================== */

const C_MS = { core: "#d84a4a", glow: "#ffe4d8", deep: "#330e0e" };

function MatryoshkaScene({ role, delayMs }: SceneProps) {
  const adv = { "--g05-adv": "calc(var(--fx-side, 1) * -1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-hit" style={d(delayMs)}>
          <path d="M20 5q9 0 9 12t-3 17H14q-3-5-3-17T20 5z" fill={C_MS.core} stroke={C_MS.deep} strokeWidth="2.4" strokeLinejoin="round" />
          <circle cx="20" cy="14" r="5" fill={C_MS.glow} />
        </g>
        <g className="g05-ms-pop" style={{ ...adv, ...d(delayMs, 220) } as CSSProperties}>
          <circle cx="10" cy="28" r="5" fill={C_MS.glow} stroke={C_MS.deep} strokeWidth="2" />
          <circle cx="30" cy="28" r="5" fill={C_MS.glow} stroke={C_MS.deep} strokeWidth="2" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-ms-paint" style={d(delayMs)}>
          <path d="M8 8l10 10" stroke={C_MS.glow} strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="g05-arrive" style={d(delayMs, 240)}>
          <path d="M20 4q10 0 10 13t-3 18H13q-3-6-3-18T20 4z" fill={C_MS.core} stroke={C_MS.deep} strokeWidth="2.6" strokeLinejoin="round" />
          <circle cx="20" cy="14" r="5.4" fill={C_MS.glow} />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 430)}>
          <path d="M11 25h18" stroke={C_MS.deep} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Field tint="rgba(216,74,74,0.26)" delayMs={delayMs} />
      <P x={50} y={54} w={16} h={20} cls="g05-tell" style={d(delayMs)}>
        <svg viewBox="0 0 80 100" className="block h-full w-full">
          <path d="M40 6q22 0 22 30t-7 58H25q-7-28-7-58T40 6z" fill={C_MS.core} stroke={C_MS.deep} strokeWidth="6" strokeLinejoin="round" />
          <circle cx="40" cy="32" r="13" fill={C_MS.glow} />
        </svg>
      </P>
      <P x={44} y={40} w={12} h={5} cls="g05-ms-paint" style={{ background: C_MS.glow, ...d(delayMs, 150) }} />
      <P x={50} y={47} w={16} h={11} cls="g05-ms-split" style={d(delayMs, 320)}>
        <svg viewBox="0 0 80 56" className="block h-full w-full">
          <path d="M40 6q22 0 22 30v18H18V36q0-30 22-30z" fill={C_MS.core} stroke={C_MS.deep} strokeWidth="6" strokeLinejoin="round" />
          <circle cx="40" cy="30" r="13" fill={C_MS.glow} />
        </svg>
      </P>
      {[0, 1].map((i) => (
        <P key={i} x={50} y={57} w={8} h={11} cls="g05-ms-pop" style={{ ...adv, "--g05-mx": i ? "150%" : "-150%", ...d(delayMs, 480 + i * 110) } as CSSProperties}>
          <svg viewBox="0 0 40 56" className="block h-full w-full">
            <path d="M20 4q11 0 11 16t-4 32H13q-4-16-4-32T20 4z" fill={C_MS.glow} stroke={C_MS.deep} strokeWidth="4" strokeLinejoin="round" />
            <circle cx="20" cy="18" r="6" fill={C_MS.core} />
          </svg>
        </P>
      ))}
      <P x={50} y={62} w={20} h={3} cls="g05-ms-wobble" style={{ background: C_MS.deep, borderRadius: "50%", ...d(delayMs, 720) }} />
      <Chaff color={C_MS.glow} delayMs={delayMs + 840} />
    </Wide>
  );
}

/* =============================================================================
   27. Candle Curfew (t4) — LIGHTS OUT, AND ONE BOLTS. Tell: the flame gutters
   twice. Strike: the snuffer comes down over it and the whole board dims.
   Settle: one figure breaks ranks in the dark and bolts forward, and a shutter
   bangs down behind him.
   ========================================================================== */

const C_CF = { core: "#f0c060", glow: "#fff4d0", deep: "#241a0a" };

function CandleCurfewScene({ role, delayMs }: SceneProps) {
  const adv = { "--g05-adv": "calc(var(--fx-side, 1) * -1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-cf-flame" style={d(delayMs)}>
          <path d="M20 6q6 6 6 11a6 6 0 0 1-12 0c0-5 6-11 6-11z" fill={C_CF.core} />
        </g>
        <g className="g05-cf-snuff" style={d(delayMs, 220)}>
          <path d="M10 20l10-12 10 12z" fill={C_CF.deep} stroke={C_CF.glow} strokeWidth="2.2" strokeLinejoin="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-arrive" style={d(delayMs)}>
          <rect x="16" y="16" width="8" height="18" fill={C_CF.glow} stroke={C_CF.deep} strokeWidth="2.2" />
        </g>
        <g className="g05-cf-flame" style={d(delayMs, 240)}>
          <path d="M20 4q6 6 6 10a6 6 0 0 1-12 0c0-4 6-10 6-10z" fill={C_CF.core} />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 430)}>
          <circle cx="20" cy="18" r="14" fill="none" stroke={C_CF.core} strokeWidth="2" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <P x={50} y={58} w={7} h={18} cls="g05-tell" style={{ background: C_CF.glow, ...d(delayMs) }} />
      <P x={50} y={44} w={7} h={10} cls="g05-cf-flame" style={d(delayMs, 100)}>
        <svg viewBox="0 0 40 56" className="block h-full w-full">
          <path d="M20 2q14 16 14 28a14 14 0 0 1-28 0C6 18 20 2 20 2z" fill={C_CF.core} />
          <path d="M20 16q6 8 6 14a6 6 0 0 1-12 0c0-6 6-14 6-14z" fill={C_CF.glow} />
        </svg>
      </P>
      <P x={50} y={42} w={11} h={12} cls="g05-cf-snuff" style={d(delayMs, 280)}>
        <svg viewBox="0 0 60 64" className="block h-full w-full">
          <path d="M6 58L30 6l24 52z" fill={C_CF.deep} stroke={C_CF.core} strokeWidth="5" strokeLinejoin="round" />
        </svg>
      </P>
      <BoardFrame>
        <span className="g05-cf-dark absolute inset-0 block" style={{ background: C_CF.deep, ...d(delayMs, 460) }} />
      </BoardFrame>
      <P x={50} y={57} w={8} h={12} cls="g05-cf-bolt" style={{ ...adv, ...d(delayMs, 600) }}>
        <Pawn fill={C_CF.core} stroke={C_CF.deep} />
      </P>
      <P x={50} y={48} w={26} h={5} cls="g05-cf-shutter" style={{ background: C_CF.deep, ...d(delayMs, 780) }} />
      <Chaff color={C_CF.glow} delayMs={delayMs + 860} />
    </Wide>
  );
}

/* =============================================================================
   28. One Ladle Each (t4) — THE MESS LINE. Tell: the cauldron swings on its
   chain. Strike: the ladle dips and pours one measure into one bowl. Settle:
   the queue shuffles up one place in order and the ladle is turned over empty.
   ========================================================================== */

const C_OL = { core: "#cf8a4a", glow: "#ffe8ca", deep: "#2e1a0a" };

function OneLadleEachScene({ role, delayMs }: SceneProps) {
  const adv = { "--g05-adv": "calc(var(--fx-side, 1) * -1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-ol-queue" style={{ ...adv, animationDelay: `calc(${delayMs}ms + var(--fx-index, 0) * 80ms)` } as CSSProperties}>
          <path d={PAWN_D} fill={C_OL.core} stroke={C_OL.deep} strokeWidth="2.4" transform="translate(10 4) scale(0.5)" />
        </g>
        <g className="g05-ol-flip" style={d(delayMs, 220)}>
          <path d="M6 12h9a6 6 0 0 1 0 12" fill="none" stroke={C_OL.glow} strokeWidth="3" strokeLinecap="round" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-arrive" style={d(delayMs)}>
          <path d="M8 16h24l-4 16H12z" fill={C_OL.deep} stroke={C_OL.core} strokeWidth="2.4" strokeLinejoin="round" />
        </g>
        <g className="g05-ol-ladle" style={d(delayMs, 240)}>
          <path d="M30 6v12a5 5 0 0 1-10 0" fill="none" stroke={C_OL.glow} strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 430)}>
          <path d="M8 16h24" stroke={C_OL.core} strokeWidth="3" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Furrow color="rgba(46,26,10,0.5)" delayMs={delayMs} y={60} h={5} />
      <P x={44} y={48} w={16} h={13} cls="g05-tell" style={d(delayMs)}>
        <svg viewBox="0 0 90 70" className="block h-full w-full">
          <path d="M8 18h74l-9 46H17z" fill={C_OL.deep} stroke={C_OL.core} strokeWidth="6" strokeLinejoin="round" />
          <path d="M4 18h82" stroke={C_OL.core} strokeWidth="7" strokeLinecap="round" />
        </svg>
      </P>
      <P x={52} y={42} w={9} h={16} cls="g05-ol-ladle" style={d(delayMs, 200)}>
        <svg viewBox="0 0 50 90" className="block h-full w-full">
          <path d="M34 4v52a14 14 0 0 1-28 0" fill="none" stroke={C_OL.glow} strokeWidth="8" strokeLinecap="round" />
        </svg>
      </P>
      <P x={58} y={57} w={9} h={6} cls="g05-ol-bowl" style={d(delayMs, 400)}>
        <svg viewBox="0 0 50 32" className="block h-full w-full">
          <path d="M4 8h42l-7 20H11z" fill={C_OL.core} stroke={C_OL.deep} strokeWidth="4" strokeLinejoin="round" />
        </svg>
      </P>
      {[0, 1, 2, 3].map((i) => (
        <P key={i} x={40 + i * 7} y={60} w={6} h={10} cls="g05-ol-queue" style={{ ...adv, ...d(delayMs, 520 + i * 90) }}>
          <Pawn fill={C_OL.core} stroke={C_OL.deep} />
        </P>
      ))}
      <P x={52} y={44} w={9} h={16} cls="g05-ol-flip" style={d(delayMs, 800)}>
        <svg viewBox="0 0 50 90" className="block h-full w-full">
          <path d="M16 86V34a14 14 0 0 1 28 0" fill="none" stroke={C_OL.glow} strokeWidth="8" strokeLinecap="round" />
        </svg>
      </P>
      <Chaff color={C_OL.glow} delayMs={delayMs + 880} />
    </Wide>
  );
}

/* =============================================================================
   29. Understudy Rule (t4) — THE HELM HANDED DOWN. Tell: the call-board card
   flips over to a new name. Strike: an officer's plumed helm is handed down
   the line and a pawn takes it. Settle: a spotlight slides onto him and the
   curtain sweeps shut behind the officer.
   ========================================================================== */

const C_UR = { core: "#c04a6a", glow: "#ffe0e8", deep: "#2a0e1a" };

function UnderstudyRuleScene({ role, delayMs }: SceneProps) {
  const adv = { "--g05-adv": "calc(var(--fx-side, 1) * -1)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-hit" style={d(delayMs)}>
          <path d="M11 30V18a9 9 0 0 1 18 0v12z" fill={C_UR.core} stroke={C_UR.deep} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M20 9V4M14 12L9 7M26 12l5-5" stroke={C_UR.glow} strokeWidth="2.4" strokeLinecap="round" />
        </g>
        <g className="g05-ur-spot" style={d(delayMs, 220)}>
          <ellipse cx="20" cy="34" rx="13" ry="4" fill={C_UR.glow} />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-ur-board" style={d(delayMs)}>
          <rect x="8" y="12" width="24" height="17" fill={C_UR.deep} stroke={C_UR.core} strokeWidth="2.4" />
          <path d="M13 19h14M13 24h9" stroke={C_UR.glow} strokeWidth="2" strokeLinecap="round" />
        </g>
        <g className="g05-ur-helm" style={d(delayMs, 240)}>
          <path d="M13 32V22a7 7 0 0 1 14 0v10z" fill={C_UR.core} stroke={C_UR.deep} strokeWidth="2.2" strokeLinejoin="round" />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 430)}>
          <ellipse cx="20" cy="35" rx="12" ry="3" fill={C_UR.glow} />
        </g>
      </Sq>
    );
  return (
    <Wide>
      <Field tint="rgba(192,74,106,0.26)" delayMs={delayMs} />
      <P x={40} y={44} w={12} h={9} cls="g05-ur-board" style={d(delayMs)}>
        <svg viewBox="0 0 70 50" className="block h-full w-full">
          <rect x="4" y="4" width="62" height="42" fill={C_UR.deep} stroke={C_UR.core} strokeWidth="5" />
          <path d="M14 20h42M14 32h26" stroke={C_UR.glow} strokeWidth="5" strokeLinecap="round" />
        </svg>
      </P>
      <P x={52} y={48} w={11} h={11} cls="g05-ur-helm" style={{ ...adv, ...d(delayMs, 240) }}>
        <svg viewBox="0 0 60 60" className="block h-full w-full">
          <path d="M10 56V32a20 20 0 0 1 40 0v24z" fill={C_UR.core} stroke={C_UR.deep} strokeWidth="5" strokeLinejoin="round" />
          <path d="M30 12V2M18 18L8 8M42 18l10-10" stroke={C_UR.glow} strokeWidth="6" strokeLinecap="round" />
        </svg>
      </P>
      <P x={56} y={58} w={9} h={13} cls="g05-ur-take" style={d(delayMs, 440)}>
        <Pawn fill={C_UR.glow} stroke={C_UR.deep} />
      </P>
      <P x={56} y={64} w={16} h={4.4} cls="g05-ur-spot" style={{ ...adv, background: C_UR.glow, borderRadius: "50%", ...d(delayMs, 620) }} />
      <P x={38} y={50} w={16} h={26} cls="g05-ur-curtain" style={{ background: `linear-gradient(90deg, ${C_UR.deep}, transparent)`, ...d(delayMs, 760) }} />
      <Chaff color={C_UR.glow} delayMs={delayMs + 860} />
    </Wide>
  );
}

/* =============================================================================
   30. Boomerang (t4) — THROWN AND CAUGHT. Aimed. Tell: the arm cocks back and
   the stick's shadow swings. Strike: it flies out the full length of the play,
   spinning, and clips the pawn at the far end. Settle: it comes back down the
   same line and the catch jolts whoever is standing in front.
   ========================================================================== */

const C_BM = { core: "#6fbfa0", glow: "#e6fff2", deep: "#123028" };

function BoomerangScene({ role, delayMs }: SceneProps) {
  const reach = { "--g05-reach": "calc(var(--fx-len, 3) / 3)" } as CSSProperties;
  if (role === "target")
    return (
      <Sq>
        <g className="g05-bm-spin" style={d(delayMs)}>
          <path d="M8 30q0-20 20-22-6 8-6 12t6 12q-14 2-20-2z" fill={C_BM.core} stroke={C_BM.deep} strokeWidth="2.2" strokeLinejoin="round" />
        </g>
        <g className="g05-bm-clip" style={d(delayMs, 220)}>
          <path d={PAWN_D} fill={C_BM.glow} stroke={C_BM.deep} strokeWidth="2.4" transform="translate(11 8) scale(0.46)" />
        </g>
      </Sq>
    );
  if (role === "entrance")
    return (
      <Sq>
        <g className="g05-arrive" style={d(delayMs)}>
          <path d="M7 32q0-22 22-24-7 9-7 13t7 13q-15 2-22-2z" fill={C_BM.core} stroke={C_BM.deep} strokeWidth="2.6" strokeLinejoin="round" />
        </g>
        <g className="g05-bm-spin" style={d(delayMs, 250)}>
          <circle cx="20" cy="20" r="15" fill="none" stroke={C_BM.glow} strokeWidth="2" strokeDasharray="4 4" />
        </g>
        <g className="g05-arrive-soft" style={d(delayMs, 440)}>
          <path d="M6 35h28" stroke={C_BM.deep} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </Sq>
    );
  return (
    <>
      <Wide>
        <Field tint="rgba(111,191,160,0.24)" delayMs={delayMs} />
        <Chaff color={C_BM.glow} delayMs={delayMs + 860} />
      </Wide>
      <Aim>
        <P x={44} y={54} w={14} h={3} cls="g05-tell" style={{ background: C_BM.deep, borderRadius: "50%", ...d(delayMs) }} />
        <span className="g05-bm-throw absolute inset-0 block" style={{ ...reach, ...d(delayMs, 190) }}>
          <P x={50} y={50} w={9} h={9} cls="g05-bm-spin">
            <svg viewBox="0 0 50 50" className="block h-full w-full">
              <path d="M6 46q0-34 36-42-12 14-12 21t12 21q-24 4-36 0z" fill={C_BM.core} stroke={C_BM.deep} strokeWidth="5" strokeLinejoin="round" />
            </svg>
          </P>
        </span>
        <P x={68} y={50} w={8} h={11} cls="g05-bm-clip" style={d(delayMs, 480)}>
          <Pawn fill={C_BM.glow} stroke={C_BM.deep} />
        </P>
        <span className="g05-bm-return absolute inset-0 block" style={{ ...reach, ...d(delayMs, 600) }}>
          <P x={50} y={50} w={8} h={8} style={{ border: `3px solid ${C_BM.core}`, borderRadius: "50%" }} />
        </span>
        <P x={46} y={50} w={12} h={12} cls="g05-bm-catch" style={{ border: `3px solid ${C_BM.glow}`, borderRadius: "50%", ...d(delayMs, 820) }} />
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
  // --- the reserves: rolls, gates, satchels, stretchers ---
  bn4_endless_militia: S(EndlessMilitiaScene, {
    ordering: "line", staggerMs: 70, victims: ["p"], hasLead: true,
    sound: "crownrain", source: "summon", anchor: "cast",
  }),
  bn4_menagerie_gates: S(MenagerieGatesScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true,
    sound: "vault", anchor: "cast",
  }),
  bn4_drawbridge_crew: S(DrawbridgeCrewScene, {
    ordering: "line", staggerMs: 80, victims: ["p"], hasLead: true,
    sound: "siege", source: "summon", anchor: "cast",
  }),
  bn4_field_hospital: S(FieldHospitalScene, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true,
    sound: "aegis", source: "shield", anchor: "cast",
  }),
  bn4_letters_home: S(LettersHomeScene, {
    ordering: "radial", staggerMs: 60, victims: ["p"], hasLead: true,
    sound: "gacha", anchor: "cast",
  }),
  bn4_small_consolation: S(SmallConsolationScene, {
    ordering: "radial", staggerMs: 0, victims: ["r", "q"], hasLead: true,
    sound: "coinflip", anchor: "cast",
  }),
  bn4_stray_cat: S(StrayCatScene, {
    ordering: "radial", staggerMs: 50, victims: "all", hasLead: true,
    sound: "snooze", source: "shield", anchor: "cast",
  }),
  bn4_florists_trick: S(FloristsTrickScene, {
    ordering: "line", staggerMs: 0, victims: ["p"], hasLead: true,
    sound: "crownrain", source: "summon", anchor: "cast",
  }),

  // --- the line changes shape: knighting, pikes, ladders, leapfrog ---
  bn4_changeling_child: S(ChangelingChildScene, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true,
    sound: "coronation", source: "empower", anchor: "cast",
  }),
  hx4_field_of_spears: S(FieldOfSpearsScene, {
    ordering: "line", staggerMs: 80, victims: ["p"], hasLead: true,
    sound: "petrify", anchor: "cast",
  }),
  bn4_leapfrog: S(LeapfrogScene, {
    ordering: "line", staggerMs: 0, victims: ["p"], hasLead: true,
    sound: "blitz", anchor: "aim",
  }),
  ov_rapture_of_pawns: S(RaptureOfPawnsScene, {
    ordering: "line", staggerMs: 90, victims: ["p"], hasLead: true,
    sound: "cathedral", source: "empower", anchor: "cast",
  }),
  bn4_matryoshka_surprise: S(MatryoshkaScene, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true,
    sound: "gacha", source: "empower", anchor: "cast",
  }),
  ov_trojan_pawn: S(TrojanPawnScene, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true,
    sound: "vault", source: "empower", anchor: "cast",
  }),

  // --- the whole rank moves at once ---
  ov_great_migration: S(GreatMigrationScene, {
    ordering: "line", staggerMs: 70, victims: ["p"], hasLead: true,
    sound: "rampage", anchor: "cast",
  }),

  // --- the line is held, starved or dug in ---
  hx4_famine_year: S(FamineYearScene, {
    ordering: "line", staggerMs: 80, victims: ["p"], hasLead: true,
    sound: "petrifiedforest", source: "slow", anchor: "cast",
  }),
  hx4_pawn_embargo: S(PawnEmbargoScene, {
    ordering: "line", staggerMs: 70, victims: ["p"], hasLead: true,
    sound: "wall", source: "slow", anchor: "cast",
  }),
  hx4_famine: S(FamineScene, {
    ordering: "line", staggerMs: 60, victims: ["p"], hasLead: true,
    sound: "aegis", source: "shield", anchor: "cast",
  }),
  hx4_no_doubling: S(NoDoublingScene, {
    ordering: "line", staggerMs: 60, victims: ["p"], hasLead: true,
    sound: "wall", source: "slow", anchor: "cast",
  }),
  hx4_one_ladle_each: S(OneLadleEachScene, {
    ordering: "line", staggerMs: 70, victims: ["p"], hasLead: true,
    sound: "chips", source: "slow", anchor: "cast",
  }),

  // --- the line is told what to do ---
  hx4_pied_piper: S(PiedPiperHexScene, {
    ordering: "radial", staggerMs: 60, victims: ["p"], hasLead: true,
    sound: "shades", source: "blindfold", anchor: "cast",
  }),
  hx4_echo_of_bells: S(EchoOfBellsScene, {
    ordering: "line", staggerMs: 80, victims: "all", hasLead: true,
    sound: "cathedral", source: "blindfold", anchor: "cast",
  }),
  hx4_candle_curfew: S(CandleCurfewScene, {
    ordering: "radial", staggerMs: 50, victims: "all", hasLead: true,
    sound: "snooze", source: "blindfold", anchor: "cast",
  }),
  hx4_understudy_rule: S(UnderstudyRuleScene, {
    ordering: "radial", staggerMs: 60, victims: ["n", "b", "r", "q"], hasLead: true,
    sound: "slots", source: "blindfold", anchor: "cast",
  }),
  ov_pied_piper: S(PiedPiperLureScene, {
    ordering: "line", staggerMs: 70, victims: ["p"], hasLead: true,
    sound: "shades", anchor: "aim",
  }),

  // --- the line is broken by something bigger ---
  ov_cloud_serpent: S(CloudSerpentScene, {
    ordering: "line", staggerMs: 60, victims: "all", hasLead: true,
    sound: "colossus", anchor: "aim",
  }),
  ov_locust_swarm: S(LocustSwarmScene, {
    ordering: "line", staggerMs: 55, victims: ["p"], hasLead: true,
    sound: "extinction", anchor: "aim",
  }),
  ov_volcanic_vent: S(VolcanicVentScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true,
    sound: "atomic", anchor: "cast",
  }),
  ov_fireworks_barge: S(FireworksBargeScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true,
    sound: "crashrocket", anchor: "cast",
  }),
  ov_boomerang: S(BoomerangScene, {
    ordering: "line", staggerMs: 0, victims: ["p"], hasLead: true,
    sound: "wheel", anchor: "aim",
  }),
};
