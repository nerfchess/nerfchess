// g07SupplyPlays — bespoke plays for the 30 pawn-support cards that used to
// share the generated `pawnTide` family (one tide, thirty hue shifts).
//
// MODULE FICTION: CAMP, SUPPLY AND THE QUARTERMASTER. Not a wave of pawns:
// the machinery that keeps an army standing. A ration cart's tailgate drops on
// its chains, a cooper drives a hoop onto a barrel, the sutler's scales level,
// the paymaster counts a coin into a palm, a tent pole goes up and the canvas
// snaps taut, the bread oven is opened and loaves drawn out on the peel, a
// laundry line is strung across the camp, a padlock snaps shut on the stores.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g07SupplyPlays.css), transform/opacity animations only, no imports from
// BoardEffects.tsx, only the SigPlugin/SigRole TYPES from sigPlugins.tsx.
//
// STAGING. Every card declares anchor "cast" or "aim", so the work happens on
// the square the card was played on. Anything that means THE BOARD (a lamplit
// wash, an edge gilt, a canvas veil) lives inside <BoardFrame>, never at a
// fixed percentage of the stage. The eight cards whose fiction runs a line
// across the camp (a yoke carried forward, a picket rope, a laundry line, a
// courier's remount, a capstan cable) stage inside <AimStage> with their art
// authored pointing RIGHT, so they run the real source-to-target vector.
//
// DIRECTION. Nothing here says "up" or "down". Loads are handed in from the
// caster's own side (--fx-side), chaff and steam drift away from that same
// side, tally marks and crates are set down at the victim's real place in the
// issue order (--fx-index / --fx-n), shadows throw away from the board centre
// (--fx-ox / --fx-oy) and runs are as long as the real leg (--fx-len).
//
// Every scene runs three beats (tell, strike, settle) in all three roles.
// All CSS lives in g07SupplyPlays.css behind the `g07-` prefix.

import "./g07SupplyPlays.css";

import type { CSSProperties, ReactNode } from "react";
import type { SigPlugin, SigRole } from "./sigPlugins";
import { AimStage, BoardFrame, BoardWideStage } from "./stage";

interface SceneProps {
  lead: boolean;
  role: SigRole;
  delayMs: number;
}

/* =============================================================================
   Local machinery. Nothing here draws: it positions, delays and stages.
   ========================================================================== */

const ROOT = "pointer-events-none absolute inset-0 z-30 block";

/** The caller's stagger rides a CSS var so beat offsets stay composable. */
const rootStyle = (d: number): CSSProperties => ({ "--g07-d": `${d}ms` }) as CSSProperties;

/** stagger + a beat offset, scaled by the Settings animation-speed var. */
const b = (ms: number): string => `calc(var(--g07-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

const SJ = { strokeLinejoin: "round", strokeLinecap: "round" } as const;

interface Box {
  /** animation class (plus any extra classes). */
  c: string;
  l?: number;
  t?: number;
  w?: number;
  h?: number;
  /** beat offset in ms. */
  d?: number;
  st?: CSSProperties;
  children?: ReactNode;
}

/** One animated plain layer. */
function L({ c, l = 0, t = 0, w = 100, h = 100, d = 0, st, children }: Box) {
  return (
    <span
      className={`${c} absolute block`}
      style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, animationDelay: b(d), ...st }}
    >
      {children}
    </span>
  );
}

/** One animated SVG layer. */
function V({
  c, l = 0, t = 0, w = 100, h = 100, d = 0, vb = "0 0 24 24", par, st, children,
}: Box & { vb?: string; par?: string }) {
  return (
    <svg
      viewBox={vb}
      preserveAspectRatio={par}
      className={`${c} absolute block`}
      style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, animationDelay: b(d), ...st }}
    >
      {children}
    </svg>
  );
}

/** Static shell carrying a rotation the animated child must not fight over. */
function P({
  l, t, w, h, rot, children,
}: { l: number; t: number; w: number; h: number; rot?: string; children: ReactNode }) {
  return (
    <span
      className="absolute block"
      style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, rotate: rot }}
    >
      {children}
    </span>
  );
}

/** The local (one-square / one-crop) cut: entrance and per-square target. */
function Cut({ d, children }: { d: number; children: ReactNode }) {
  return (
    <span className={ROOT} style={rootStyle(d)} aria-hidden="true">
      {children}
    </span>
  );
}

/** Cast-anchored lead: work on the cast square, `frame` over the board. */
function Lead({ d, frame, children }: { d: number; frame?: ReactNode; children: ReactNode }) {
  return (
    <span className={ROOT} style={rootStyle(d)} aria-hidden="true">
      <BoardWideStage>
        {frame ? <BoardFrame>{frame}</BoardFrame> : null}
        {children}
      </BoardWideStage>
    </span>
  );
}

/** Aim-anchored lead: `frame` stays square with the board, the art rotates. */
function AimLead({ d, frame, children }: { d: number; frame?: ReactNode; children: ReactNode }) {
  return (
    <span className={ROOT} style={rootStyle(d)} aria-hidden="true">
      {frame ? (
        <BoardWideStage>
          <BoardFrame>{frame}</BoardFrame>
        </BoardWideStage>
      ) : null}
      <AimStage>{children}</AimStage>
    </span>
  );
}

/** Lamplight over the whole camp. Always inside a BoardFrame. */
function Wash({ tone, d = 0 }: { tone: string; d?: number }) {
  return <L c="g07-wash" d={d} st={{ background: `radial-gradient(circle at 50% 48%, ${tone}, transparent 70%)` }} />;
}

/** Board-edge gilt, always inside a BoardFrame. */
function Rim({ tone, d = 160 }: { tone: string; d?: number }) {
  return <L c="g07-rim" d={d} st={{ boxShadow: `inset 0 0 30px 9px ${tone}` }} />;
}

/* Stores silhouettes reused as dressing, never as a card's central object. */
const SACK =
  "M8.6 6.4c-.7-1.5.3-2.8 1.4-3.2h4c1.1.4 2.1 1.7 1.4 3.2-.8 1.8.7 2.7 1.7 4.7 1 2 1.1 4.7.5 6.7-.7 2-2.7 3.2-5.6 3.2s-4.9-1.2-5.6-3.2c-.6-2-.5-4.7.5-6.7 1-2 2.5-2.9 1.7-4.7z";
const CRATE = "M3.5 6.5h17v13h-17z";
const PAWN = "M12 4.4a2.7 2.7 0 0 1 1.6 4.9l1.8 6.4H8.6l1.8-6.4A2.7 2.7 0 0 1 12 4.4z M7.4 16.8h9.2V19.4H7.4z";

/* =============================================================================
   1. Homestead Clause (t2) — THE RATION CART TAILGATE
   The chains snap taut, the tailgate swings clear on them, a sack is handed in
   over the caster's own shoulder, a crate is set down at this square's place in
   the issue order and the chalk tick goes on the board. Chaff drifts off.
   Palette: #d9b06a / #fff2d2 / #2a1d10.
   ========================================================================== */
function RationCartScene({ role, delayMs }: SceneProps) {
  const gate = (
    <g {...SJ}>
      <path d="M2 4h20v14H2z" fill="#2a1d10" stroke="#d9b06a" strokeWidth="1.3" />
      <path d="M2 8.6h20M2 13.2h20" stroke="#d9b06a" strokeWidth="0.9" />
    </g>
  );
  const sack = <path d={SACK} fill="#d9b06a" stroke="#2a1d10" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-rc-gate" l={12} t={16} w={76} h={44} d={40} st={{ transformOrigin: "50% 0%" }}>{gate}</V>
        <V c="g07-issue" l={30} t={40} w={40} h={48} d={260}>{sack}</V>
        <L c="g07-rc-chalk" l={16} t={84} w={44} h={4} d={470} st={{ background: "#fff2d2", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hitside" l={26} t={22} w={48} h={56} d={0}>{sack}</V>
        <V c="g07-hit" l={14} t={54} w={72} h={34} d={140}><path d={CRATE} fill="#2a1d10" stroke="#d9b06a" strokeWidth="1.4" /></V>
        <L c="g07-hit2" l={30} t={82} w={40} h={4} d={270} st={{ borderRadius: "999px", background: "#fff2d2" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={<><Wash tone="rgba(217,176,106,0.28)" /><Rim tone="rgba(255,242,210,0.28)" /></>}
    >
      <L c="g07-rc-chain" l={41.4} t={38} w={1} h={10} d={90} st={{ background: "linear-gradient(180deg, #d9b06a, rgba(217,176,106,0))", transformOrigin: "50% 0%" }} />
      <V c="g07-rc-gate" l={40} t={40} w={19} h={12} d={230} st={{ transformOrigin: "50% 0%" }}>{gate}</V>
      <V c="g07-issue" l={45} t={40} w={8} h={10} d={410}>{sack}</V>
      <V c="g07-place" l={52} t={45} w={8} h={9} d={540}><path d={CRATE} fill="#2a1d10" stroke="#d9b06a" strokeWidth="1.5" /></V>
      <L c="g07-rc-chalk" l={38} t={57} w={10} h={1.4} d={650} st={{ background: "#fff2d2", transformOrigin: "0% 50%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g07-drift" l={43 + i * 6} t={54} w={1.4} h={1.4} d={710 + i * 90} st={{ borderRadius: "50%", background: "#d9b06a" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   2. Leapfrog Lesson (t2) — THE COOPER HEADS A BARREL
   Staves are gathered inside the truss hoop, the cooper's hammer drives the
   hoop home, the head is seated, and the finished barrel rolls over its chock
   and lands beyond it. Aim-staged: the roll runs the real leg.
   Palette: #c98f4e / #ffeecb / #2b1a0d.
   ========================================================================== */
function CooperBarrelScene({ role, delayMs }: SceneProps) {
  const barrel = (
    <g {...SJ}>
      <path d="M6.4 3.2h11.2c1.6 3.4 1.6 14.2 0 17.6H6.4c-1.6-3.4-1.6-14.2 0-17.6z" fill="#c98f4e" stroke="#2b1a0d" strokeWidth="1.2" />
      <path d="M4.9 8.2h14.2M4.9 15.8h14.2" stroke="#2b1a0d" strokeWidth="1.4" />
    </g>
  );
  const hammer = (
    <g {...SJ}>
      <path d="M3 12.6l9-9 2.4 2.4-9 9z" fill="#2b1a0d" stroke="#c98f4e" strokeWidth="1" />
      <path d="M12.6 2.4l6.6 6.6-3 3-6.6-6.6z" fill="#ffeecb" stroke="#2b1a0d" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-ent-rise" l={24} t={16} w={52} h={68} d={40}>{barrel}</V>
        <V c="g07-cb-hammer" l={46} t={6} w={44} h={44} d={250} st={{ transformOrigin: "20% 80%" }}>{hammer}</V>
        <L c="g07-cb-hoop" l={20} t={44} w={60} h={5} d={450} st={{ borderRadius: "999px", background: "#ffeecb" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hitside" l={24} t={16} w={52} h={66} d={0}>{barrel}</V>
        <L c="g07-hit2" l={18} t={44} w={64} h={5} d={140} st={{ borderRadius: "999px", background: "#ffeecb" }} />
        <V c="g07-hit" l={38} t={68} w={24} h={22} d={260}><path d="M3 18h18l-9-12z" fill="#2b1a0d" /></V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(201,143,78,0.26)" />}>
      <L c="g07-runout" l={45} t={53.4} w={28} h={1.8} d={70} st={{ background: "linear-gradient(90deg, #c98f4e, rgba(201,143,78,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g07-cb-hammer" l={41} t={33} w={11} h={11} d={200} st={{ transformOrigin: "20% 80%" }}>{hammer}</V>
      <L c="g07-cb-hoop" l={43.5} t={45} w={9} h={1.6} d={360} st={{ borderRadius: "999px", background: "#ffeecb" }} />
      <V c="g07-cb-roll" l={43} t={42} w={9} h={12} d={470}>{barrel}</V>
      <V c="g07-cb-chock" l={52} t={51} w={5} h={5} d={430}><path d="M3 18h18l-9-12z" fill="#2b1a0d" stroke="#c98f4e" strokeWidth="1.2" {...SJ} /></V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g07-drift" l={44 + i * 5} t={52} w={1.4} h={1.4} d={700 + i * 90} st={{ borderRadius: "50%", background: "#ffeecb" }} />
      ))}
    </AimLead>
  );
}

/* =============================================================================
   3. Market Dog (t2) — THE SUTLER'S SCALES
   The beam is unhooked and swings, a brass weight thumps into the far pan, the
   pans hunt and settle level, and the sutler's ticket is stamped. Brass dust
   drifts off the counter away from the caster.
   Palette: #d2a63c / #fff3d4 / #26200f.
   ========================================================================== */
function SutlerScalesScene({ role, delayMs }: SceneProps) {
  const beam = (
    <g {...SJ}>
      <path d="M12 2.6v4.2M3 7h18" stroke="#d2a63c" strokeWidth="1.6" fill="none" />
      <path d="M3 7l-2.2 4.4h4.4zM21 7l-2.2 4.4h4.4z" fill="#fff3d4" stroke="#26200f" strokeWidth="0.9" />
    </g>
  );
  const weight = <path d="M8 8h8l1.6 11H6.4z" fill="#26200f" stroke="#d2a63c" strokeWidth="1.2" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-ss-beam" l={8} t={18} w={84} h={54} d={40} st={{ transformOrigin: "50% 26%" }}>{beam}</V>
        <V c="g07-ent-drop" l={58} t={40} w={30} h={40} d={250}>{weight}</V>
        <L c="g07-ss-tick" l={22} t={80} w={38} h={4} d={460} st={{ background: "#fff3d4", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hit" l={10} t={22} w={80} h={48} d={0}>{beam}</V>
        <V c="g07-hitside" l={56} t={44} w={30} h={40} d={130}>{weight}</V>
        <L c="g07-hit2" l={26} t={80} w={30} h={4} d={260} st={{ borderRadius: "999px", background: "#d2a63c" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(210,166,60,0.26)" />}>
      <L c="g07-shaft" l={46} t={22} w={8} h={26} d={80} st={{ background: "linear-gradient(180deg, rgba(255,243,212,0.66), transparent)", transformOrigin: "50% 0%" }} />
      <V c="g07-ss-beam" l={39} t={36} w={22} h={16} d={220} st={{ transformOrigin: "50% 26%" }}>{beam}</V>
      <V c="g07-ss-weight" l={53} t={42} w={6} h={8} d={380}>{weight}</V>
      <V c="g07-ss-level" l={40} t={44} w={7} h={7} d={520}><path d="M3 6.6l9 5 9-5v3.2l-9 5-9-5z" fill="#d2a63c" /></V>
      <L c="g07-ss-tick" l={41} t={57} w={11} h={1.4} d={640} st={{ background: "#fff3d4", transformOrigin: "0% 50%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g07-drift" l={44 + i * 5} t={54} w={1.3} h={1.3} d={700 + i * 95} st={{ borderRadius: "50%", background: "#d2a63c" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   4. Sandbag Hurdle (t2) — THE FORAGE STACK
   A pitchfork swings in, a truss of hay goes up onto the stack, the stack takes
   a second course, and the chaff it throws off drifts away from the caster.
   Palette: #cfae5c / #fff1cf / #2e2712.
   ========================================================================== */
function ForageStackScene({ role, delayMs }: SceneProps) {
  const fork = (
    <g fill="none" stroke="#cfae5c" strokeWidth="1.5" {...SJ}>
      <path d="M12 22V9" />
      <path d="M7 9V2.6M12 9V2M17 9V2.6M7 9h10" />
    </g>
  );
  const truss = (
    <g {...SJ}>
      <path d="M3 16.5l9-9 9 9v4H3z" fill="#cfae5c" stroke="#2e2712" strokeWidth="1.1" />
      <path d="M6.5 16l5.5-5 5.5 5" stroke="#fff1cf" strokeWidth="0.9" fill="none" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-fs-fork" l={8} t={8} w={44} h={62} d={40} st={{ transformOrigin: "50% 100%" }}>{fork}</V>
        <V c="g07-ent-rise" l={34} t={38} w={58} h={48} d={260}>{truss}</V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g07-drift" l={30 + i * 18} t={30} w={5} h={5} d={470 + i * 90} st={{ borderRadius: "50%", background: "#fff1cf" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hitside" l={22} t={30} w={56} h={50} d={0}>{truss}</V>
        <V c="g07-hit" l={34} t={6} w={32} h={54} d={140}>{fork}</V>
        <L c="g07-hit2" l={28} t={82} w={44} h={4} d={260} st={{ borderRadius: "999px", background: "#cfae5c" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(207,174,92,0.26)" /><Rim tone="rgba(255,241,207,0.24)" /></>}>
      <V c="g07-fs-fork" l={38} t={30} w={12} h={20} d={100} st={{ transformOrigin: "50% 100%" }}>{fork}</V>
      <V c="g07-fs-toss" l={44} t={40} w={12} h={10} d={280}>{truss}</V>
      <V c="g07-place" l={46} t={47} w={13} h={10} d={430}>{truss}</V>
      <L c="g07-leanshadow" l={42} t={56} w={20} h={3.4} d={520} st={{ borderRadius: "999px", background: "rgba(46,39,18,0.6)" }} />
      <V c="g07-fs-settle" l={45} t={51} w={14} h={8} d={600}><path d="M2 20h20l-3-4H5z" fill="#cfae5c" stroke="#2e2712" strokeWidth="1" {...SJ} /></V>
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g07-drift" l={42 + i * 5} t={49} w={1.4} h={1.4} d={680 + i * 85} st={{ borderRadius: "50%", background: "#fff1cf" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   5. Threshold Blessing (t2) — THE ISSUE BLANKET
   The stores chest lid is thrown back, a folded blanket is lifted clear, and it
   is shaken open so it falls over the piece. Lint hangs in the lamplight.
   Palette: #a9743f / #ffeed0 / #241a12.
   ========================================================================== */
function IssueBlanketScene({ role, delayMs }: SceneProps) {
  const lid = (
    <g {...SJ}>
      <path d="M2.5 6h19v5h-19z" fill="#a9743f" stroke="#241a12" strokeWidth="1.2" />
      <path d="M10 6h4v5h-4z" fill="#ffeed0" />
    </g>
  );
  const fold = (
    <g {...SJ}>
      <path d="M3 7h18v10H3z" fill="#ffeed0" stroke="#241a12" strokeWidth="1.1" />
      <path d="M3 10.4h18M3 13.8h18" stroke="#a9743f" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-ib-lid" l={10} t={40} w={80} h={34} d={40} st={{ transformOrigin: "50% 100%" }}>{lid}</V>
        <V c="g07-ent-rise" l={20} t={16} w={60} h={44} d={250}>{fold}</V>
        <L c="g07-ib-shake" l={16} t={54} w={68} h={26} d={450} st={{ background: "linear-gradient(180deg, rgba(255,238,208,0.7), transparent)", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hit" l={14} t={22} w={72} h={38} d={0}>{fold}</V>
        <V c="g07-hitside" l={34} t={44} w={32} h={44} d={140}><path d={PAWN} fill="#a9743f" /></V>
        <L c="g07-hit2" l={20} t={54} w={60} h={5} d={260} st={{ borderRadius: "999px", background: "#ffeed0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(169,116,63,0.28)" />}>
      <V c="g07-ib-lid" l={40} t={44} w={20} h={9} d={100} st={{ transformOrigin: "50% 100%" }}>{lid}</V>
      <V c="g07-issue" l={44} t={36} w={12} h={10} d={280}>{fold}</V>
      <L c="g07-ib-shake" l={40} t={43} w={20} h={12} d={450} st={{ background: "linear-gradient(180deg, rgba(255,238,208,0.72), transparent)", transformOrigin: "50% 0%" }} />
      <V c="g07-ib-tuck" l={45.5} t={45} w={9} h={12} d={590}><path d={PAWN} fill="none" stroke="#ffeed0" strokeWidth="1.6" {...SJ} /></V>
      <L c="g07-leanshadow" l={42} t={57} w={17} h={3} d={640} st={{ borderRadius: "999px", background: "rgba(36,26,18,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g07-drift" l={43 + i * 6} t={50} w={1.3} h={1.3} d={700 + i * 95} st={{ borderRadius: "50%", background: "#ffeed0" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   6. Trellis (t2) — THE LAUNDRY LINE
   A line is thrown between two poles and drawn taut down the camp, shirts are
   pegged along it in the real issue order, and the wind bellies them out.
   Aim-staged: the line runs the real leg.
   Palette: #93c3b0 / #fff4da / #1b2b26.
   ========================================================================== */
function LaundryLineScene({ role, delayMs }: SceneProps) {
  const shirt = (
    <g {...SJ}>
      <path d="M8 4l-5 2.6 1.6 3.4L7 9v11h10V9l2.4 1 1.6-3.4L16 4l-2 1.6h-4z" fill="#fff4da" stroke="#1b2b26" strokeWidth="1.1" />
    </g>
  );
  const peg = <path d="M9.4 3h5.2v18h-5.2z" fill="#93c3b0" stroke="#1b2b26" strokeWidth="1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g07-ll-line" l={4} t={26} w={92} h={2} d={40} st={{ borderRadius: "999px", background: "#93c3b0", transformOrigin: "0% 50%" }} />
        <V c="g07-ent-drop" l={26} t={28} w={48} h={50} d={250}>{shirt}</V>
        <V c="g07-ll-peg" l={44} t={20} w={12} h={16} d={450}>{peg}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g07-hit2" l={6} t={26} w={88} h={3} d={0} st={{ borderRadius: "999px", background: "#93c3b0" }} />
        <V c="g07-hitside" l={26} t={30} w={48} h={52} d={130}>{shirt}</V>
        <V c="g07-hit" l={44} t={18} w={12} h={16} d={260}>{peg}</V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(147,195,176,0.24)" /><Rim tone="rgba(255,244,218,0.24)" /></>}>
      <L c="g07-runout" l={45} t={41} w={28} h={1.4} d={80} st={{ background: "linear-gradient(90deg, #93c3b0, rgba(147,195,176,0.15))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <L c="g07-ll-line" l={45} t={42.4} w={22} h={1} d={230} st={{ borderRadius: "999px", background: "#fff4da", transformOrigin: "0% 50%" }} />
      {[0, 1, 2].map((i) => (
        <V key={i} c="g07-ll-belly" l={47 + i * 6} t={43} w={6} h={9} d={380 + i * 120} st={{ transformOrigin: "50% 0%" }}>{shirt}</V>
      ))}
      <V c="g07-ll-peg" l={49} t={41} w={2.6} h={3.4} d={620}>{peg}</V>
      <L c="g07-leanshadow" l={46} t={55} w={18} h={2.6} d={660} st={{ borderRadius: "999px", background: "rgba(27,43,38,0.55)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g07-drift" l={48 + i * 5} t={51} w={1.3} h={1.3} d={720 + i * 90} st={{ borderRadius: "50%", background: "#fff4da" }} />
      ))}
    </AimLead>
  );
}

/* =============================================================================
   7. Masterclass (t2) — THE PAYMASTER'S TABLE
   The ledger falls open, the pen rules a line, a coin is counted out and set
   into a waiting palm, and the thumb-print goes in the book beside it.
   Palette: #e0bb52 / #fff5d8 / #2b2413.
   ========================================================================== */
function PaymasterScene({ role, delayMs }: SceneProps) {
  const ledger = (
    <g {...SJ}>
      <path d="M2.5 6h19v13h-19z" fill="#fff5d8" stroke="#2b2413" strokeWidth="1.2" />
      <path d="M12 6v13" stroke="#2b2413" strokeWidth="1" />
      <path d="M4.6 10h5.6M4.6 13h5.6M13.8 10h5.6" stroke="#e0bb52" strokeWidth="0.9" />
    </g>
  );
  const coin = (
    <g>
      <circle cx="12" cy="12" r="8" fill="#e0bb52" stroke="#2b2413" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff5d8" strokeWidth="1" />
    </g>
  );
  const palm = (
    <path d="M7 21v-9c0-1.1 1.7-1.1 1.7 0V7.2c0-1.2 1.8-1.2 1.8 0v3.6c0-1.3 1.8-1.3 1.8 0V8.4c0-1.3 1.8-1.3 1.8 0V17c0 2.8-1.7 4-4.6 4z" fill="#fff5d8" />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-pm-ledger" l={10} t={26} w={80} h={54} d={40} st={{ transformOrigin: "50% 100%" }}>{ledger}</V>
        <V c="g07-pm-coin" l={36} t={8} w={28} h={28} d={250}>{coin}</V>
        <V c="g07-ent-rise" l={54} t={46} w={34} h={40} d={460}>{palm}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hitside" l={30} t={44} w={40} h={46} d={0}>{palm}</V>
        <V c="g07-hit" l={34} t={12} w={32} h={32} d={140}>{coin}</V>
        <L c="g07-hit2" l={30} t={84} w={40} h={4} d={260} st={{ borderRadius: "999px", background: "#e0bb52" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(224,187,82,0.28)" />}>
      <V c="g07-pm-ledger" l={38} t={41} w={20} h={14} d={90} st={{ transformOrigin: "50% 100%" }}>{ledger}</V>
      <L c="g07-pm-rule" l={39.5} t={48} w={9} h={1} d={260} st={{ background: "#2b2413", transformOrigin: "0% 50%" }} />
      <V c="g07-issue" l={52} t={43} w={7} h={7} d={380}>{palm}</V>
      <V c="g07-pm-coin" l={53} t={39} w={5} h={5} d={490}>{coin}</V>
      <V c="g07-place" l={44} t={44} w={4} h={4} d={600}><circle cx="12" cy="12" r="7" fill="#2b2413" /></V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g07-glint" l={41 + i * 8} t={40 + (i % 2) * 10} w={1.8} h={1.8} d={680 + i * 95} st={{ borderRadius: "50%", background: "#fff5d8" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   8. Sock Slide (t2) — THE BOOT-MENDER'S LAST
   The boot is dropped onto the iron last, hobnails are tapped through the sole
   in a row, and the finished boot slides one step off the bench. Leather dust.
   Palette: #b07a52 / #ffeed2 / #2a1c12.
   ========================================================================== */
function BootLastScene({ role, delayMs }: SceneProps) {
  const boot = (
    <g {...SJ}>
      <path d="M8 2.5h5.2v11.2c0 1.6 1.4 2.2 3.6 2.6 2.2.4 3.2 1.4 3.2 3.2H8z" fill="#b07a52" stroke="#2a1c12" strokeWidth="1.2" />
      <path d="M8 15.4h9.4" stroke="#ffeed2" strokeWidth="1" />
    </g>
  );
  const last = <path d="M4 20h16v2H4zM6 20V9.6c0-3 2.6-4.6 6-4.6v15z" fill="#2a1c12" stroke="#b07a52" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-ent-rise" l={18} t={38} w={64} h={50} d={40}>{last}</V>
        <V c="g07-ent-drop" l={22} t={10} w={56} h={56} d={250}>{boot}</V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g07-bl-nail" l={30 + i * 14} t={72} w={4} h={9} d={450 + i * 90} st={{ background: "#ffeed2" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hitside" l={22} t={12} w={56} h={62} d={0}>{boot}</V>
        <L c="g07-hit2" l={20} t={74} w={60} h={4} d={140} st={{ borderRadius: "999px", background: "#2a1c12" }} />
        <L c="g07-hit" l={40} t={78} w={20} h={6} d={260} st={{ borderRadius: "999px", background: "#ffeed2" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(176,122,82,0.26)" />}>
      <V c="g07-bl-last" l={42} t={44} w={14} h={13} d={90}>{last}</V>
      <V c="g07-bl-boot" l={43} t={38} w={12} h={13} d={250}>{boot}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g07-bl-nail" l={44.5 + i * 3.4} t={51} w={1} h={2.4} d={400 + i * 100} st={{ background: "#ffeed2" }} />
      ))}
      <V c="g07-bl-slide" l={45} t={45} w={11} h={12} d={620}>{boot}</V>
      <L c="g07-leanshadow" l={43} t={57} w={16} h={2.8} d={660} st={{ borderRadius: "999px", background: "rgba(42,28,18,0.6)" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g07-drift" l={45 + i * 7} t={53} w={1.4} h={1.4} d={710 + i * 100} st={{ borderRadius: "50%", background: "#b07a52" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   9. Tandem Bike (t2) — THE SHOULDER YOKE
   The yoke is settled across the shoulders, a full bucket hooks on either end,
   and both swing forward together as one stride is taken. Water slops out.
   Aim-staged: the carry runs the real leg.
   Palette: #7fa9c6 / #fff2dc / #14232f.
   ========================================================================== */
function ShoulderYokeScene({ role, delayMs }: SceneProps) {
  const bucket = (
    <g {...SJ}>
      <path d="M5.5 7h13l-1.6 12H7.1z" fill="#7fa9c6" stroke="#14232f" strokeWidth="1.2" />
      <path d="M5.5 4.4c2.6 2 10.4 2 13 0" fill="none" stroke="#14232f" strokeWidth="1.1" />
    </g>
  );
  const yoke = <path d="M2 11c3-5 17-5 20 0l-1.4 1.6C18 8.6 6 8.6 3.4 12.6z" fill="#fff2dc" stroke="#14232f" strokeWidth="1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-sy-yoke" l={8} t={20} w={84} h={34} d={40}>{yoke}</V>
        <V c="g07-ent-drop" l={8} t={44} w={38} h={44} d={250}>{bucket}</V>
        <V c="g07-ent-drop" l={54} t={44} w={38} h={44} d={380}>{bucket}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hit" l={10} t={22} w={80} h={28} d={0}>{yoke}</V>
        <V c="g07-hitside" l={12} t={44} w={34} h={42} d={140}>{bucket}</V>
        <V c="g07-hitside" l={54} t={44} w={34} h={42} d={260}>{bucket}</V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(127,169,198,0.26)" />}>
      <L c="g07-runout" l={45} t={53} w={28} h={1.6} d={70} st={{ background: "linear-gradient(90deg, #7fa9c6, rgba(127,169,198,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g07-sy-yoke" l={43} t={40} w={16} h={6} d={230}>{yoke}</V>
      <V c="g07-sy-swing" l={43.5} t={43} w={6} h={8} d={380} st={{ transformOrigin: "50% 0%" }}>{bucket}</V>
      <V c="g07-sy-swing" l={52} t={43} w={6} h={8} d={430} st={{ transformOrigin: "50% 0%" }}>{bucket}</V>
      <L c="g07-leanshadow" l={44} t={56} w={16} h={2.6} d={560} st={{ borderRadius: "999px", background: "rgba(20,35,47,0.6)" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g07-sy-slop" l={45 + i * 4} t={50} w={1.3} h={1.8} d={620 + i * 90} st={{ borderRadius: "999px", background: "#fff2dc" }} />
      ))}
    </AimLead>
  );
}

/* =============================================================================
   10. Wheelbarrow (t2) — THE WATER BOWSER
   The bowser is trundled up on its iron wheel, the brake chocked, the tap turned
   and the canteens fill in the real issue order, one after the other.
   Palette: #6fb3ad / #fff3dd / #14282a.
   ========================================================================== */
function WaterBowserScene({ role, delayMs }: SceneProps) {
  const tank = (
    <g {...SJ}>
      <path d="M3 6.5h18v9H3z" fill="#6fb3ad" stroke="#14282a" strokeWidth="1.2" />
      <path d="M3 10h18" stroke="#14282a" strokeWidth="0.9" />
      <path d="M11 15.5v3h2.6" fill="none" stroke="#fff3dd" strokeWidth="1.4" />
    </g>
  );
  const canteen = (
    <g {...SJ}>
      <path d="M6.5 8.5c0-2.6 2.4-4 5.5-4s5.5 1.4 5.5 4v6c0 2.6-2.4 4.4-5.5 4.4S6.5 17.1 6.5 14.5z" fill="#fff3dd" stroke="#14282a" strokeWidth="1.1" />
      <path d="M10 4.5h4v2h-4z" fill="#6fb3ad" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-wb-roll" l={8} t={16} w={70} h={44} d={40}>{tank}</V>
        <L c="g07-wb-pour" l={50} t={52} w={3} h={22} d={250} st={{ background: "linear-gradient(180deg, #6fb3ad, rgba(111,179,173,0))", transformOrigin: "50% 0%" }} />
        <V c="g07-ent-rise" l={38} t={58} w={30} h={36} d={450}>{canteen}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hitside" l={28} t={30} w={44} h={54} d={0}>{canteen}</V>
        <L c="g07-hit2" l={47} t={6} w={6} h={30} d={140} st={{ background: "#6fb3ad", transformOrigin: "50% 0%" }} />
        <L c="g07-hit" l={38} t={78} w={24} h={8} d={260} st={{ borderRadius: "50%", background: "#fff3dd" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(111,179,173,0.26)" /><Rim tone="rgba(255,243,221,0.22)" /></>}>
      <V c="g07-wb-roll" l={38} t={38} w={20} h={12} d={100}>{tank}</V>
      <L c="g07-wb-chock" l={38} t={49} w={4} h={2.2} d={260} st={{ background: "#14282a", transformOrigin: "0% 100%" }} />
      <L c="g07-wb-pour" l={49.4} t={48} w={1.4} h={8} d={390} st={{ background: "linear-gradient(180deg, #6fb3ad, rgba(111,179,173,0))", transformOrigin: "50% 0%" }} />
      <V c="g07-place" l={47} t={50} w={6} h={8} d={520}>{canteen}</V>
      <L c="g07-wb-brim" l={46} t={55} w={9} h={2.4} d={640} st={{ borderRadius: "50%", background: "#fff3dd" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g07-drift" l={45 + i * 5} t={53} w={1.3} h={1.3} d={700 + i * 90} st={{ borderRadius: "50%", background: "#fff3dd" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   11. Whittle (t2) — THE WHITTLING KNIFE
   The billet is turned over in the hand, the knife takes long strokes off it,
   the shavings curl away, and what is left is a tent peg driven flush with one
   mallet tap. Palette: #cbbf9a / #fff3d6 / #23200f.
   ========================================================================== */
function WhittleScene({ role, delayMs }: SceneProps) {
  const knife = (
    <g {...SJ}>
      <path d="M2.5 15.5l11-11 3 3-11 11z" fill="#fff3d6" stroke="#23200f" strokeWidth="1" />
      <path d="M15 3.4l5.6 5.6-2 2-5.6-5.6z" fill="#23200f" />
    </g>
  );
  const peg = <path d="M9.6 2.5h4.8v14L12 21.5 9.6 16.5z" fill="#cbbf9a" stroke="#23200f" strokeWidth="1.1" {...SJ} />;
  const curl = <path d="M3 12c4-6 10-6 12 0-4-3-8-3-12 0z" fill="#cbbf9a" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-ent-rise" l={34} t={12} w={32} h={70} d={40}>{peg}</V>
        <V c="g07-wh-cut" l={4} t={20} w={54} h={54} d={250}>{knife}</V>
        {[0, 1, 2].map((i) => (
          <V key={i} c="g07-wh-curl" l={54 + i * 8} t={40 + i * 12} w={26} h={20} d={450 + i * 90}>{curl}</V>
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hitside" l={34} t={10} w={32} h={70} d={0}>{peg}</V>
        <V c="g07-hit" l={8} t={22} w={48} h={48} d={140}>{knife}</V>
        <V c="g07-hit2" l={54} t={54} w={30} h={24} d={260}>{curl}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(203,191,154,0.26)" />}>
      <V c="g07-wh-billet" l={45} t={38} w={8} h={16} d={100}>{peg}</V>
      <V c="g07-wh-cut" l={38} t={36} w={13} h={13} d={260}>{knife}</V>
      {[0, 1, 2, 3].map((i) => (
        <V key={i} c="g07-wh-curl" l={52 + (i % 2) * 4} t={40 + i * 3.4} w={6} h={4.6} d={400 + i * 90}>{curl}</V>
      ))}
      <V c="g07-wh-drive" l={45.6} t={44} w={6.4} h={12} d={640}>{peg}</V>
      <L c="g07-leanshadow" l={43} t={56} w={14} h={2.6} d={690} st={{ borderRadius: "999px", background: "rgba(35,32,15,0.6)" }} />
      <L c="g07-drift" l={48} t={53} w={1.5} h={1.5} d={740} st={{ borderRadius: "50%", background: "#fff3d6" }} />
    </Lead>
  );
}

/* =============================================================================
   12. Muddy Boots (t1) — THE PICKET LINE
   A rope is run post to post across the horse lines, halter rings are clipped
   along it, and a hurricane lantern is hung at each post so the whole line
   lights up. Nothing on it goes anywhere. Aim-staged.
   Palette: #b98c46 / #fff0cc / #241b0f.
   ========================================================================== */
function PicketLineScene({ role, delayMs }: SceneProps) {
  const post = (
    <g {...SJ}>
      <path d="M10 3h4v18h-4z" fill="#b98c46" stroke="#241b0f" strokeWidth="1.1" />
      <path d="M6 21h12" stroke="#241b0f" strokeWidth="1.4" />
    </g>
  );
  const lantern = (
    <g {...SJ}>
      <path d="M8 8h8v10H8z" fill="#241b0f" stroke="#b98c46" strokeWidth="1.1" />
      <path d="M10.4 10.6h3.2v4.8h-3.2z" fill="#fff0cc" />
      <path d="M9 8V6.2c0-1.8 6-1.8 6 0V8" fill="none" stroke="#b98c46" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-pl-post" l={6} t={20} w={26} h={64} d={40}>{post}</V>
        <L c="g07-pl-rope" l={16} t={34} w={70} h={2.4} d={250} st={{ borderRadius: "999px", background: "#b98c46", transformOrigin: "0% 50%" }} />
        <V c="g07-pl-lamp" l={54} t={30} w={34} h={40} d={450} st={{ transformOrigin: "50% 0%" }}>{lantern}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g07-hit2" l={4} t={34} w={92} h={3} d={0} st={{ borderRadius: "999px", background: "#b98c46" }} />
        <V c="g07-hitside" l={32} t={36} w={36} h={48} d={140}>{lantern}</V>
        <V c="g07-hit" l={8} t={22} w={20} h={60} d={260}>{post}</V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(185,140,70,0.26)" /><Rim tone="rgba(255,240,204,0.22)" /></>}>
      <V c="g07-pl-post" l={43} t={40} w={4} h={14} d={90}>{post}</V>
      <L c="g07-runout" l={45} t={44} w={28} h={1.4} d={230} st={{ background: "linear-gradient(90deg, #b98c46, rgba(185,140,70,0.2))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      {[0, 1, 2].map((i) => (
        <V key={i} c="g07-pl-lamp" l={48 + i * 6} t={44} w={4.4} h={6} d={380 + i * 120} st={{ transformOrigin: "50% 0%" }}>{lantern}</V>
      ))}
      <L c="g07-pl-rope" l={45} t={46} w={22} h={0.9} d={330} st={{ borderRadius: "999px", background: "#fff0cc", transformOrigin: "0% 50%" }} />
      <L c="g07-leanshadow" l={45} t={55} w={20} h={2.6} d={660} st={{ borderRadius: "999px", background: "rgba(36,27,15,0.55)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g07-drift" l={47 + i * 6} t={52} w={1.3} h={1.3} d={710 + i * 90} st={{ borderRadius: "50%", background: "#fff0cc" }} />
      ))}
    </AimLead>
  );
}

/* =============================================================================
   13. Pawn Umbrella (t1) — THE TENT GOES UP
   Guy-ropes are flung out to the four corners, the pegs are thumped home, the
   king pole is walked upright and the canvas snaps taut overhead.
   Palette: #d8cba6 / #fff4d9 / #26210f.
   ========================================================================== */
const TENT_GUYS = [-34, -12, 12, 34];

function TentRaisedScene({ role, delayMs }: SceneProps) {
  const canvas = <path d="M12 3L22 20H2z" fill="#d8cba6" stroke="#26210f" strokeWidth="1.2" {...SJ} />;
  const pegHead = <path d="M9.6 4h4.8v13l-2.4 3.4L9.6 17z" fill="#26210f" stroke="#d8cba6" strokeWidth="1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        {TENT_GUYS.slice(0, 2).map((a, i) => (
          <P key={a} l={30} t={20} w={40} h={70} rot={`${a}deg`}>
            <L c="g07-tr-guy" w={100} h={100} d={40 + i * 110} st={{ background: "linear-gradient(180deg, #d8cba6, rgba(216,203,166,0))", transformOrigin: "50% 0%" }} />
          </P>
        ))}
        <V c="g07-ent-rise" l={18} t={22} w={64} h={62} d={280}>{canvas}</V>
        <V c="g07-tr-peg" l={40} t={70} w={20} h={26} d={470}>{pegHead}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hitside" l={16} t={16} w={68} h={64} d={0}>{canvas}</V>
        <V c="g07-hit" l={42} t={62} w={16} h={26} d={140}>{pegHead}</V>
        <L c="g07-hit2" l={22} t={80} w={56} h={4} d={260} st={{ borderRadius: "999px", background: "#26210f" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(216,203,166,0.28)" /><Rim tone="rgba(255,244,217,0.26)" /></>}>
      {TENT_GUYS.map((a, i) => (
        <P key={a} l={44} t={42} w={12} h={18} rot={`${a}deg`}>
          <L c="g07-tr-guy" w={100} h={100} d={90 + i * 80} st={{ background: "linear-gradient(180deg, #d8cba6, rgba(216,203,166,0))", transformOrigin: "50% 0%" }} />
        </P>
      ))}
      {[0, 1].map((i) => (
        <V key={i} c="g07-tr-peg" l={40 + i * 18} t={54} w={3.4} h={4.6} d={330 + i * 90}>{pegHead}</V>
      ))}
      <L c="g07-tr-pole" l={49.4} t={38} w={1.2} h={16} d={480} st={{ background: "#26210f", transformOrigin: "50% 100%" }} />
      <V c="g07-tr-snap" l={41} t={37} w={18} h={19} d={600}>{canvas}</V>
      <L c="g07-leanshadow" l={42} t={56} w={17} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(38,33,15,0.58)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g07-drift" l={44 + i * 6} t={51} w={1.4} h={1.4} d={720 + i * 90} st={{ borderRadius: "50%", background: "#fff4d9" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   14. Shoelace Knot (t1) — THE SACK MOUTH TIED
   The neck of the grain sack is gathered, the twine is whipped round it three
   times and pulled tight, and a lead seal is crimped onto the ends. Nothing
   comes out of it now. Palette: #a89b6d / #fff2d0 / #262311.
   ========================================================================== */
function SackTieScene({ role, delayMs }: SceneProps) {
  const sack = <path d={SACK} fill="#a89b6d" stroke="#262311" strokeWidth="1.1" {...SJ} />;
  const seal = (
    <g>
      <circle cx="12" cy="12" r="7" fill="#262311" stroke="#fff2d0" strokeWidth="1.3" />
      <path d="M8.6 12h6.8" stroke="#a89b6d" strokeWidth="1.4" {...SJ} />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-ent-rise" l={22} t={18} w={56} h={68} d={40}>{sack}</V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g07-st-whip" l={28} t={28 + i * 6} w={44} h={3} d={250 + i * 90} st={{ borderRadius: "999px", background: "#fff2d0", transformOrigin: "0% 50%" }} />
        ))}
        <V c="g07-ent-pop" l={56} t={18} w={26} h={26} d={520}>{seal}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hitside" l={24} t={20} w={52} h={64} d={0}>{sack}</V>
        <L c="g07-hit2" l={26} t={30} w={48} h={4} d={140} st={{ borderRadius: "999px", background: "#fff2d0" }} />
        <V c="g07-hit" l={38} t={20} w={24} h={24} d={260}>{seal}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(168,155,109,0.26)" />}>
      <V c="g07-st-sack" l={44} t={41} w={11} h={14} d={90}>{sack}</V>
      <L c="g07-st-gather" l={45.4} t={42.4} w={8} h={2.2} d={250} st={{ borderRadius: "999px", background: "#262311" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g07-st-whip" l={45} t={42 + i * 1.2} w={9} h={0.9} d={380 + i * 90} st={{ borderRadius: "999px", background: "#fff2d0", transformOrigin: "0% 50%" }} />
      ))}
      <V c="g07-place" l={51} t={41} w={4} h={4} d={620}>{seal}</V>
      <L c="g07-leanshadow" l={43} t={56} w={14} h={2.6} d={670} st={{ borderRadius: "999px", background: "rgba(38,35,17,0.6)" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g07-drift" l={45 + i * 7} t={52} w={1.4} h={1.4} d={720 + i * 100} st={{ borderRadius: "50%", background: "#a89b6d" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   15. Cold Porridge (t1) — THE KETTLE ON ITS TRIPOD
   The tripod legs are set, the lid is lifted off the great kettle, and the
   ladle stands straight up in porridge gone solid. The ash under it has not
   been raked since. Palette: #8f9aa6 / #fff1d2 / #1a1d21.
   ========================================================================== */
function ColdKettleScene({ role, delayMs }: SceneProps) {
  const kettle = (
    <g {...SJ}>
      <path d="M4 9h16c0 7-2.4 11-8 11S4 16 4 9z" fill="#1a1d21" stroke="#8f9aa6" strokeWidth="1.3" />
      <path d="M3 9h18" stroke="#8f9aa6" strokeWidth="1.4" />
    </g>
  );
  const tripod = (
    <g fill="none" stroke="#8f9aa6" strokeWidth="1.4" {...SJ}>
      <path d="M12 2v6M4 21L12 6l8 15" />
    </g>
  );
  const ladle = (
    <g {...SJ}>
      <path d="M12 2v13" stroke="#fff1d2" strokeWidth="1.6" fill="none" />
      <path d="M8 15h8c0 3.4-1.6 5.4-4 5.4S8 18.4 8 15z" fill="#fff1d2" stroke="#1a1d21" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-ent-rise" l={12} t={12} w={76} h={72} d={40}>{tripod}</V>
        <V c="g07-ck-lid" l={24} t={30} w={52} h={22} d={250} st={{ transformOrigin: "50% 100%" }}>
          <path d="M2 16h20l-3-6H5z" fill="#8f9aa6" stroke="#1a1d21" strokeWidth="1.1" {...SJ} />
        </V>
        <V c="g07-ck-ladle" l={38} t={34} w={26} h={50} d={460}>{ladle}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hitside" l={16} t={30} w={68} h={54} d={0}>{kettle}</V>
        <V c="g07-hit" l={38} t={10} w={24} h={62} d={140}>{ladle}</V>
        <L c="g07-hit2" l={26} t={82} w={48} h={4} d={260} st={{ borderRadius: "999px", background: "#8f9aa6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><L c="g07-veil" st={{ background: "rgba(10,12,16,0.36)" }} /><Wash tone="rgba(143,154,166,0.26)" d={140} /></>}>
      <V c="g07-ck-tripod" l={42} t={34} w={16} h={22} d={90}>{tripod}</V>
      <V c="g07-ck-lid" l={43} t={40} w={14} h={7} d={260} st={{ transformOrigin: "50% 100%" }}>
        <path d="M2 16h20l-3-6H5z" fill="#8f9aa6" stroke="#1a1d21" strokeWidth="1.1" {...SJ} />
      </V>
      <V c="g07-ck-pot" l={43} t={43} w={14} h={12} d={380}>{kettle}</V>
      <V c="g07-ck-ladle" l={48} t={38} w={5} h={13} d={520}>{ladle}</V>
      <L c="g07-leanshadow" l={42} t={56} w={16} h={2.8} d={600} st={{ borderRadius: "999px", background: "rgba(26,29,33,0.66)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g07-ck-ash" l={44 + i * 5} t={54} w={1.5} h={1.5} d={660 + i * 100} st={{ borderRadius: "50%", background: "#8f9aa6" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   16. Heavy Pockets (t1) — THE OVERPACKED HAVERSACK
   The flap is forced back, tins and ball go in until nothing more will fit, the
   buckle is dragged onto the last hole and the strap creaks under the load.
   Palette: #9a7f5f / #fff0ce / #221a12.
   ========================================================================== */
function HaversackScene({ role, delayMs }: SceneProps) {
  const bag = (
    <g {...SJ}>
      <path d="M4 8h16v12H4z" fill="#9a7f5f" stroke="#221a12" strokeWidth="1.2" />
      <path d="M4 8l2-4h12l2 4z" fill="#221a12" stroke="#9a7f5f" strokeWidth="1" />
      <path d="M10.4 12h3.2v4h-3.2z" fill="#fff0ce" />
    </g>
  );
  const tin = <path d="M6.5 8h11v9h-11z" fill="#fff0ce" stroke="#221a12" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-ent-rise" l={18} t={26} w={64} h={58} d={40}>{bag}</V>
        <V c="g07-hp-load" l={34} t={4} w={32} h={30} d={250}>{tin}</V>
        <L c="g07-hp-strap" l={16} t={62} w={68} h={5} d={460} st={{ borderRadius: "999px", background: "#221a12", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hitside" l={18} t={26} w={64} h={58} d={0}>{bag}</V>
        <V c="g07-hit" l={36} t={6} w={28} h={28} d={140}>{tin}</V>
        <L c="g07-hit2" l={20} t={82} w={60} h={4} d={260} st={{ borderRadius: "999px", background: "#9a7f5f" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(154,127,95,0.28)" />}>
      <V c="g07-hp-bag" l={43} t={40} w={14} h={14} d={100}>{bag}</V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g07-hp-load" l={45 + i * 3} t={35} w={4} h={5} d={250 + i * 100}>{tin}</V>
      ))}
      <L c="g07-hp-strap" l={42} t={47} w={16} h={1.4} d={540} st={{ borderRadius: "999px", background: "#221a12", transformOrigin: "0% 50%" }} />
      <V c="g07-hp-sag" l={44} t={49} w={12} h={9} d={620}><path d="M2 6h20c0 9-4 14-10 14S2 15 2 6z" fill="#9a7f5f" stroke="#221a12" strokeWidth="1.1" {...SJ} /></V>
      <L c="g07-leanshadow" l={42} t={57} w={17} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(34,26,18,0.6)" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g07-drift" l={46 + i * 6} t={53} w={1.4} h={1.4} d={720 + i * 100} st={{ borderRadius: "50%", background: "#fff0ce" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   17. Hopscotch (t1) — THE CHALK ISSUE-BOARD
   Numbered chalk squares are scored onto the stores door, a chalk stub bounces
   from one to the next in the real issue order, and the duster takes the first
   one out again. Palette: #cfd6de / #fff2d6 / #1e2733.
   ========================================================================== */
const HS_CELLS = [0, 1, 2, 3];

function ChalkBoardScene({ role, delayMs }: SceneProps) {
  const stub = <path d="M9 4h6v13l-3 4-3-4z" fill="#fff2d6" stroke="#1e2733" strokeWidth="1" {...SJ} />;
  const duster = (
    <g {...SJ}>
      <path d="M3 9h18v6H3z" fill="#1e2733" stroke="#cfd6de" strokeWidth="1.1" />
      <path d="M3 15h18v3H3z" fill="#cfd6de" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        {HS_CELLS.slice(0, 3).map((i) => (
          <L key={i} c="g07-hs-cell" l={10 + i * 28} t={40} w={22} h={26} d={40 + i * 110} st={{ border: "2px solid #cfd6de" }} />
        ))}
        <V c="g07-hs-stub" l={38} t={8} w={24} h={30} d={400}>{stub}</V>
        <V c="g07-hs-wipe" l={12} t={70} w={44} h={22} d={540}>{duster}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g07-hit2" l={18} t={20} w={64} h={60} d={0} st={{ border: "2px solid #cfd6de" }} />
        <V c="g07-hitside" l={36} t={26} w={28} h={40} d={140}>{stub}</V>
        <V c="g07-hit" l={24} t={66} w={52} h={22} d={260}>{duster}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><L c="g07-veil" st={{ background: "rgba(12,16,22,0.34)" }} /><Wash tone="rgba(207,214,222,0.24)" d={130} /></>}>
      {HS_CELLS.map((i) => (
        <L key={i} c="g07-hs-cell" l={41 + i * 5} t={41 + (i % 2) * 5} w={4.4} h={4.4} d={110 + i * 90} st={{ border: "1.6px solid #cfd6de" }} />
      ))}
      <V c="g07-place" l={43} t={40} w={4} h={5.4} d={470}>{stub}</V>
      <V c="g07-hs-stub" l={50} t={45} w={4} h={5.4} d={560}>{stub}</V>
      <V c="g07-hs-wipe" l={39} t={45} w={7} h={3.4} d={660}>{duster}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g07-drift" l={42 + i * 5} t={52} w={1.3} h={1.3} d={700 + i * 95} st={{ borderRadius: "50%", background: "#fff2d6" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   18. Polite Infantry (t1) — THE STORES COUNTER FLAP
   The counter bell is struck, the hinged flap swings down and closes one half
   of the counter, and the tally board is turned over to face the queue.
   Palette: #b8894f / #fff1cf / #2a1d10.
   ========================================================================== */
function CounterFlapScene({ role, delayMs }: SceneProps) {
  const bell = (
    <g {...SJ}>
      <path d="M5 17c0-6 3-9 7-9s7 3 7 9z" fill="#b8894f" stroke="#2a1d10" strokeWidth="1.2" />
      <path d="M3.4 17h17.2" stroke="#2a1d10" strokeWidth="1.4" />
      <path d="M12 8V5.4" stroke="#fff1cf" strokeWidth="1.4" />
    </g>
  );
  const board = (
    <g {...SJ}>
      <path d="M3 5h18v14H3z" fill="#2a1d10" stroke="#b8894f" strokeWidth="1.2" />
      <path d="M6 9.4h12M6 13h8" stroke="#fff1cf" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-cf-bell" l={30} t={12} w={40} h={40} d={40}>{bell}</V>
        <L c="g07-cf-flap" l={6} t={54} w={88} h={12} d={250} st={{ background: "#b8894f", transformOrigin: "0% 50%" }} />
        <V c="g07-cf-board" l={26} t={62} w={48} h={32} d={470}>{board}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hit" l={30} t={10} w={40} h={40} d={0}>{bell}</V>
        <L c="g07-hitside" l={10} t={52} w={80} h={8} d={140} st={{ background: "#b8894f" }} />
        <V c="g07-hit2" l={28} t={62} w={44} h={28} d={260}>{board}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(184,137,79,0.26)" /><Rim tone="rgba(255,241,207,0.24)" /></>}>
      <V c="g07-cf-bell" l={45} t={35} w={9} h={9} d={100}>{bell}</V>
      <L c="g07-cf-ring" l={43} t={33} w={13} h={13} d={230} st={{ borderRadius: "50%", border: "2px solid #fff1cf" }} />
      <L c="g07-cf-flap" l={41} t={45} w={18} h={2.6} d={370} st={{ background: "#b8894f", transformOrigin: "0% 50%" }} />
      <V c="g07-place" l={49} t={47} w={8} h={7} d={510}>{board}</V>
      <L c="g07-leanshadow" l={42} t={56} w={17} h={2.8} d={620} st={{ borderRadius: "999px", background: "rgba(42,29,16,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g07-drift" l={44 + i * 6} t={52} w={1.3} h={1.3} d={690 + i * 95} st={{ borderRadius: "50%", background: "#fff1cf" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   19. Airmail (t1) — THE PIGEON LOFT
   The loft trap is dropped, a message capsule is clipped to the leg, and the
   bird is thrown clear down the line with one clatter of feathers.
   Aim-staged: the flight runs the real leg.
   Palette: #a8b8c8 / #fff3d8 / #1d2530.
   ========================================================================== */
function PigeonLoftScene({ role, delayMs }: SceneProps) {
  const loft = (
    <g {...SJ}>
      <path d="M3 8h18v13H3z" fill="#1d2530" stroke="#a8b8c8" strokeWidth="1.2" />
      <path d="M2 8l10-5 10 5" fill="none" stroke="#a8b8c8" strokeWidth="1.3" />
      <path d="M9.6 12h4.8v6H9.6z" fill="#fff3d8" />
    </g>
  );
  const bird = (
    <path d="M2.6 13.6c4.4 1.2 7.6-.9 9.4-5.3 1.2 3.5 4.4 5.1 9.6 4.1-3.2 4.4-8.4 7.2-13.4 6-3.2-.8-5.4-2.4-5.6-4.8z" fill="#fff3d8" stroke="#1d2530" strokeWidth="0.9" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-ent-rise" l={16} t={16} w={68} h={56} d={40}>{loft}</V>
        <L c="g07-pg-trap" l={34} t={56} w={32} h={22} d={250} st={{ background: "#a8b8c8", transformOrigin: "50% 0%" }} />
        <V c="g07-pg-fly" l={38} t={28} w={44} h={36} d={460}>{bird}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hitside" l={22} t={26} w={56} h={44} d={0}>{bird}</V>
        <L c="g07-hit2" l={40} t={62} w={20} h={12} d={140} st={{ background: "#a8b8c8" }} />
        <L c="g07-hit" l={44} t={22} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#fff3d8" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(168,184,200,0.24)" />}>
      <V c="g07-pg-loft" l={40} t={38} w={13} h={13} d={90}>{loft}</V>
      <L c="g07-pg-trap" l={44} t={48} w={6} h={4} d={250} st={{ background: "#a8b8c8", transformOrigin: "50% 0%" }} />
      <L c="g07-runout" l={46} t={45.6} w={26} h={1.2} d={340} st={{ background: "linear-gradient(90deg, #a8b8c8, rgba(168,184,200,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g07-pg-fly" l={46} t={42} w={9} h={8} d={450}>{bird}</V>
      <L c="g07-pg-capsule" l={49} t={46} w={2} h={3.4} d={520} st={{ borderRadius: "999px", background: "#fff3d8" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g07-drift" l={45 + i * 4} t={48} w={1.3} h={1.8} d={640 + i * 90} st={{ borderRadius: "999px", background: "#fff3d8" }} />
      ))}
    </AimLead>
  );
}

/* =============================================================================
   20. Back Alley (t1) — THE HURRICANE LAMP BETWEEN THE TENTS
   Two tent walls lean together, a lamp is hooked on the guy between them, the
   wick is trimmed and the whole gap gets one square of light to slip along.
   Palette: #e0a84c / #fff2d0 / #241a10.
   ========================================================================== */
function HurricaneLampScene({ role, delayMs }: SceneProps) {
  const lamp = (
    <g {...SJ}>
      <path d="M7.4 8.6h9.2l1.2 9.4H6.2z" fill="#fff2d0" stroke="#241a10" strokeWidth="1.1" />
      <path d="M6 18h12v2.6H6zM8.6 8.6V6.4c0-2 6.8-2 6.8 0v2.2" fill="none" stroke="#e0a84c" strokeWidth="1.2" />
      <path d="M12 11.4c1 1.6 1.8 2.4 1.8 3.4a1.8 1.8 0 0 1-3.6 0c0-1 .8-1.8 1.8-3.4z" fill="#e0a84c" />
    </g>
  );
  const wall = <path d="M2 22L10 2h4v20z" fill="#241a10" stroke="#e0a84c" strokeWidth="1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hl-wall" l={0} t={10} w={34} h={80} d={40}>{wall}</V>
        <V c="g07-hl-wall" l={66} t={10} w={34} h={80} d={160} st={{ transform: "scaleX(-1)" }}>{wall}</V>
        <V c="g07-hl-lamp" l={32} t={24} w={36} h={48} d={380} st={{ transformOrigin: "50% 0%" }}>{lamp}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hitside" l={30} t={20} w={40} h={54} d={0}>{lamp}</V>
        <L c="g07-hit2" l={26} t={70} w={48} h={16} d={140} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(224,168,76,0.8), transparent 70%)" }} />
        <L c="g07-hit" l={44} t={8} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#fff2d0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><L c="g07-veil" st={{ background: "rgba(10,8,6,0.42)" }} /><Wash tone="rgba(224,168,76,0.3)" d={140} /></>}>
      <V c="g07-hl-wall" l={36} t={36} w={9} h={22} d={90}>{wall}</V>
      <V c="g07-hl-wall" l={55} t={36} w={9} h={22} d={190} st={{ transform: "scaleX(-1)" }}>{wall}</V>
      <L c="g07-hl-hook" l={44} t={35} w={12} h={0.9} d={310} st={{ borderRadius: "999px", background: "#e0a84c" }} />
      <V c="g07-hl-lamp" l={46} t={36} w={8} h={11} d={430} st={{ transformOrigin: "50% 0%" }}>{lamp}</V>
      <L c="g07-shaft" l={45} t={44} w={10} h={16} d={560} st={{ background: "linear-gradient(180deg, rgba(255,242,208,0.6), transparent)", transformOrigin: "50% 0%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g07-drift" l={46 + i * 4} t={50} w={1.4} h={1.4} d={680 + i * 95} st={{ borderRadius: "50%", background: "#e0a84c" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   21. Bread for the Table (t1) — THE OVEN AND THE PEEL
   The oven door swings open on its hinge, the long peel goes in and comes back
   loaded, and the loaves are tipped onto the board with a puff of flour.
   Palette: #d99a44 / #fff3d2 / #2b1a0c.
   ========================================================================== */
function BreadOvenScene({ role, delayMs }: SceneProps) {
  const door = (
    <g {...SJ}>
      <path d="M3 4h18v16H3z" fill="#2b1a0c" stroke="#d99a44" strokeWidth="1.3" />
      <path d="M17.6 12h2.2" stroke="#d99a44" strokeWidth="1.6" />
    </g>
  );
  const peel = (
    <g {...SJ}>
      <path d="M2 12.6h11" stroke="#d99a44" strokeWidth="1.6" fill="none" />
      <path d="M12 7.4h10v10H12z" fill="#fff3d2" stroke="#2b1a0c" strokeWidth="1" />
    </g>
  );
  const loaf = (
    <g {...SJ}>
      <path d="M3.5 16c0-5 3.4-8 8.5-8s8.5 3 8.5 8z" fill="#d99a44" stroke="#2b1a0c" strokeWidth="1.1" />
      <path d="M7.4 12.6l2-2M11 11.6l2-2M14.6 12.4l2-2" stroke="#fff3d2" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-bo-door" l={10} t={16} w={54} h={62} d={40} st={{ transformOrigin: "100% 50%" }}>{door}</V>
        <V c="g07-bo-peel" l={22} t={38} w={70} h={38} d={260}>{peel}</V>
        <V c="g07-ent-pop" l={52} t={54} w={36} h={30} d={470}>{loaf}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hit" l={14} t={18} w={50} h={58} d={0}>{door}</V>
        <V c="g07-hitside" l={30} t={50} w={44} h={36} d={140}>{loaf}</V>
        <L c="g07-hit2" l={30} t={82} w={44} h={4} d={260} st={{ borderRadius: "999px", background: "#fff3d2" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(217,154,68,0.3)" /><Rim tone="rgba(255,243,210,0.26)" /></>}>
      <V c="g07-bo-door" l={38} t={38} w={14} h={16} d={100} st={{ transformOrigin: "100% 50%" }}>{door}</V>
      <L c="g07-shaft" l={45} t={40} w={9} h={14} d={250} st={{ background: "linear-gradient(180deg, rgba(255,243,210,0.7), transparent)", transformOrigin: "50% 0%" }} />
      <V c="g07-bo-peel" l={43} t={43} w={18} h={8} d={390}>{peel}</V>
      <V c="g07-place" l={51} t={46} w={7} h={6} d={530}>{loaf}</V>
      <L c="g07-bo-flour" l={46} t={50} w={12} h={5} d={640} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,210,0.8), transparent 70%)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g07-drift" l={45 + i * 5} t={52} w={1.4} h={1.4} d={700 + i * 90} st={{ borderRadius: "50%", background: "#fff3d2" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   22. Bricklayer (t1) — THE PACKING CASE
   Boards are laid up into a case, the nails are driven along the lid, the lid
   is pressed down and the broad arrow is stencilled on. Straw spills out.
   Palette: #c0a173 / #fff1d0 / #29200f.
   ========================================================================== */
function PackingCaseScene({ role, delayMs }: SceneProps) {
  const caseBody = (
    <g {...SJ}>
      <path d={CRATE} fill="#c0a173" stroke="#29200f" strokeWidth="1.2" />
      <path d="M3.5 11h17M3.5 15h17" stroke="#29200f" strokeWidth="0.8" />
    </g>
  );
  const arrow = <path d="M12 4l7 16h-4.6L12 13.6 9.6 20H5z" fill="#29200f" stroke="#fff1d0" strokeWidth="1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-ent-rise" l={14} t={26} w={72} h={56} d={40}>{caseBody}</V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g07-pc-nail" l={22 + i * 22} t={20} w={5} h={12} d={250 + i * 90} st={{ background: "#fff1d0" }} />
        ))}
        <V c="g07-pc-stencil" l={36} t={40} w={30} h={34} d={540}>{arrow}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hitside" l={14} t={28} w={72} h={52} d={0}>{caseBody}</V>
        <L c="g07-hit2" l={16} t={24} w={68} h={5} d={140} st={{ background: "#29200f" }} />
        <V c="g07-hit" l={36} t={38} w={28} h={34} d={260}>{arrow}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(192,161,115,0.26)" />}>
      <V c="g07-pc-body" l={42} t={42} w={16} h={13} d={100}>{caseBody}</V>
      <L c="g07-pc-lid" l={41.6} t={41} w={17} h={2.4} d={260} st={{ background: "#c0a173", transformOrigin: "0% 100%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g07-pc-nail" l={44 + i * 4.4} t={40} w={1.1} h={2.6} d={380 + i * 90} st={{ background: "#fff1d0" }} />
      ))}
      <V c="g07-pc-stencil" l={47} t={45} w={6} h={7} d={620}>{arrow}</V>
      <L c="g07-leanshadow" l={42} t={56} w={17} h={2.8} d={670} st={{ borderRadius: "999px", background: "rgba(41,32,15,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g07-drift" l={44 + i * 6} t={52} w={1.4} h={1.4} d={720 + i * 90} st={{ borderRadius: "999px", background: "#fff1d0" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   23. Bulk Postage (t1) — THE MAIL SACK AND THE FRANKING STAMP
   The sack mouth is gaped on its hoop, a whole tray of letters is tipped in,
   and the franking stamp thumps a row of marks along the docket without ever
   lifting between them. Aim-staged: the row runs the real leg.
   Palette: #c66a5e / #fff2d4 / #2a1512.
   ========================================================================== */
function MailSackScene({ role, delayMs }: SceneProps) {
  const sackMouth = (
    <g {...SJ}>
      <path d="M5 8h14l-2 12H7z" fill="#c66a5e" stroke="#2a1512" strokeWidth="1.2" />
      <path d="M4 8c2.4-2.4 13.6-2.4 16 0" fill="none" stroke="#2a1512" strokeWidth="1.3" />
    </g>
  );
  const stamp = (
    <g {...SJ}>
      <path d="M9.4 2.6h5.2v7H9.4z" fill="#2a1512" />
      <path d="M5 9.6h14v5H5z" fill="#fff2d4" stroke="#2a1512" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-ent-rise" l={20} t={30} w={60} h={58} d={40}>{sackMouth}</V>
        <V c="g07-ms-stamp" l={30} t={2} w={40} h={44} d={260} st={{ transformOrigin: "50% 100%" }}>{stamp}</V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g07-ms-mark" l={18 + i * 24} t={72} w={14} h={6} d={470 + i * 90} st={{ background: "#c66a5e" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hitside" l={24} t={26} w={52} h={58} d={0}>{sackMouth}</V>
        <V c="g07-hit" l={30} t={4} w={40} h={44} d={140}>{stamp}</V>
        <L c="g07-hit2" l={26} t={78} w={48} h={6} d={260} st={{ background: "#c66a5e" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(198,106,94,0.26)" />}>
      <L c="g07-runout" l={45} t={52} w={28} h={1.6} d={80} st={{ background: "linear-gradient(90deg, #c66a5e, rgba(198,106,94,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g07-ms-sack" l={42} t={41} w={11} h={13} d={230}>{sackMouth}</V>
      <V c="g07-ms-stamp" l={48} t={36} w={7} h={9} d={380} st={{ transformOrigin: "50% 100%" }}>{stamp}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g07-ms-mark" l={50 + i * 5} t={46} w={3.4} h={1.6} d={480 + i * 100} st={{ background: "#fff2d4" }} />
      ))}
      <L c="g07-leanshadow" l={44} t={56} w={16} h={2.6} d={660} st={{ borderRadius: "999px", background: "rgba(42,21,18,0.6)" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g07-drift" l={46 + i * 6} t={52} w={1.4} h={1.4} d={720 + i * 100} st={{ borderRadius: "50%", background: "#fff2d4" }} />
      ))}
    </AimLead>
  );
}

/* =============================================================================
   24. Cellar Hatch (t1) — THE STORES CELLAR
   The two hatch leaves are thrown back on their rings, a lantern is lowered on
   a cord into the dark, and a sack is passed down to the hands waiting below.
   Palette: #8c6f4a / #ffeecd / #191309.
   ========================================================================== */
function CellarHatchScene({ role, delayMs }: SceneProps) {
  const leaf = (
    <g {...SJ}>
      <path d="M3 6h18v12H3z" fill="#8c6f4a" stroke="#191309" strokeWidth="1.2" />
      <circle cx="18" cy="12" r="2" fill="none" stroke="#ffeecd" strokeWidth="1.2" />
    </g>
  );
  const lantern = (
    <g {...SJ}>
      <path d="M8 8h8v10H8z" fill="#191309" stroke="#8c6f4a" strokeWidth="1.1" />
      <path d="M10.4 10.6h3.2v4.8h-3.2z" fill="#ffeecd" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-ch-leaf" l={2} t={34} w={46} h={34} d={40} st={{ transformOrigin: "0% 50%" }}>{leaf}</V>
        <V c="g07-ch-leaf" l={52} t={34} w={46} h={34} d={170} st={{ transformOrigin: "100% 50%" }}>{leaf}</V>
        <V c="g07-ch-drop" l={36} t={26} w={28} h={44} d={400}>{lantern}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g07-hit2" l={16} t={30} w={68} h={40} d={0} st={{ background: "#191309" }} />
        <V c="g07-hitside" l={34} t={20} w={32} h={46} d={140}>{lantern}</V>
        <V c="g07-hit" l={22} t={62} w={40} h={28} d={260}><path d={SACK} fill="#8c6f4a" /></V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><L c="g07-veil" st={{ background: "rgba(8,7,5,0.42)" }} /><Wash tone="rgba(140,111,74,0.28)" d={140} /></>}>
      <V c="g07-ch-leaf" l={38} t={44} w={11} h={8} d={100} st={{ transformOrigin: "0% 50%" }}>{leaf}</V>
      <V c="g07-ch-leaf" l={51} t={44} w={11} h={8} d={220} st={{ transformOrigin: "100% 50%" }}>{leaf}</V>
      <L c="g07-ch-cord" l={49.6} t={38} w={0.8} h={10} d={370} st={{ background: "#ffeecd", transformOrigin: "50% 0%" }} />
      <V c="g07-ch-drop" l={47} t={44} w={6} h={9} d={470}>{lantern}</V>
      <V c="g07-issue" l={42} t={45} w={7} h={9} d={600}><path d={SACK} fill="#8c6f4a" stroke="#191309" strokeWidth="1.1" {...SJ} /></V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g07-drift" l={44 + i * 5} t={53} w={1.3} h={1.3} d={700 + i * 95} st={{ borderRadius: "50%", background: "#ffeecd" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   25. Certified Letter (t1) — THE DESPATCH TIN AND ITS TWO KEYS
   Two keys go into the japanned despatch tin and are turned together, the lid
   comes up on its stay, and a signed receipt slip is lifted out of it.
   Palette: #8e9b7c / #fff2d2 / #1b1f16.
   ========================================================================== */
function DespatchTinScene({ role, delayMs }: SceneProps) {
  const tin = (
    <g {...SJ}>
      <path d="M3 8h18v11H3z" fill="#1b1f16" stroke="#8e9b7c" strokeWidth="1.3" />
      <path d="M9 12h6v4H9z" fill="#8e9b7c" />
    </g>
  );
  const key = (
    <g {...SJ}>
      <circle cx="6" cy="12" r="3.4" fill="none" stroke="#fff2d2" strokeWidth="1.6" />
      <path d="M9.4 12h10v2.6M15.4 12v2.6" fill="none" stroke="#fff2d2" strokeWidth="1.5" />
    </g>
  );
  const slip = (
    <g {...SJ}>
      <path d="M5 4h14v16H5z" fill="#fff2d2" stroke="#1b1f16" strokeWidth="1.1" />
      <path d="M7.6 9h8.8M7.6 12.4h8.8M7.6 15.8h5" stroke="#8e9b7c" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-ent-rise" l={12} t={34} w={76} h={50} d={40}>{tin}</V>
        <V c="g07-dt-key" l={20} t={40} w={30} h={28} d={250} st={{ transformOrigin: "22% 50%" }}>{key}</V>
        <V c="g07-dt-slip" l={50} t={8} w={34} h={46} d={470}>{slip}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hitside" l={14} t={32} w={72} h={48} d={0}>{tin}</V>
        <V c="g07-hit" l={22} t={38} w={30} h={26} d={140} st={{ transformOrigin: "22% 50%" }}>{key}</V>
        <V c="g07-hit2" l={52} t={14} w={30} h={42} d={260}>{slip}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(142,155,124,0.26)" />}>
      <V c="g07-dt-tin" l={42} t={43} w={16} h={12} d={100}>{tin}</V>
      <V c="g07-dt-key" l={44} t={45} w={6} h={5} d={260} st={{ transformOrigin: "22% 50%" }}>{key}</V>
      <V c="g07-dt-key" l={51} t={45} w={6} h={5} d={350} st={{ transformOrigin: "22% 50%" }}>{key}</V>
      <L c="g07-dt-lid" l={41.6} t={42} w={17} h={2.4} d={470} st={{ background: "#8e9b7c", transformOrigin: "0% 100%" }} />
      <V c="g07-dt-slip" l={47} t={37} w={7} h={9} d={590}>{slip}</V>
      <L c="g07-leanshadow" l={42} t={56} w={17} h={2.8} d={650} st={{ borderRadius: "999px", background: "rgba(27,31,22,0.6)" }} />
      <L c="g07-glint" l={50} t={44} w={2} h={2} d={710} st={{ borderRadius: "50%", background: "#fff2d2" }} />
    </Lead>
  );
}

/* =============================================================================
   26. Cloister Step (t1) — THE FOLDING FIELD CHEST
   The chaplain's chest unfolds into an altar: the leaves swing out, the cloth
   is laid over, a candle is lit and the cup set down beside it.
   Palette: #b8a2d0 / #fff3d8 / #201936.
   ========================================================================== */
function FieldChestScene({ role, delayMs }: SceneProps) {
  const chest = (
    <g {...SJ}>
      <path d="M3 9h18v11H3z" fill="#201936" stroke="#b8a2d0" strokeWidth="1.2" />
      <path d="M3 9l3-4h12l3 4" fill="none" stroke="#b8a2d0" strokeWidth="1.1" />
    </g>
  );
  const cup = (
    <g {...SJ}>
      <path d="M7.4 4h9.2c0 5-2.4 7.6-3.6 8.2V18h3v2.4H8V18h3v-5.8C9.8 11.6 7.4 9 7.4 4z" fill="#b8a2d0" stroke="#201936" strokeWidth="1" />
    </g>
  );
  const flame = <path d="M12 3.4c2 3.4 3.4 5.2 3.4 7.4a3.4 3.4 0 0 1-6.8 0c0-2.2 1.4-4 3.4-7.4z" fill="#fff3d8" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-ent-rise" l={16} t={34} w={68} h={52} d={40}>{chest}</V>
        <V c="g07-fc-cup" l={36} t={40} w={28} h={44} d={260}>{cup}</V>
        <V c="g07-fc-flame" l={58} t={12} w={26} h={30} d={470}>{flame}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hitside" l={18} t={34} w={64} h={50} d={0}>{chest}</V>
        <V c="g07-hit" l={36} t={30} w={28} h={46} d={140}>{cup}</V>
        <V c="g07-hit2" l={54} t={10} w={22} h={26} d={260}>{flame}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><L c="g07-veil" st={{ background: "rgba(10,8,18,0.36)" }} /><Wash tone="rgba(184,162,208,0.28)" d={140} /></>}>
      <V c="g07-fc-chest" l={42} t={43} w={16} h={12} d={100}>{chest}</V>
      <L c="g07-fc-cloth" l={41} t={44} w={18} h={3.4} d={270} st={{ background: "linear-gradient(180deg, #fff3d8, rgba(255,243,216,0.25))", transformOrigin: "50% 0%" }} />
      <L c="g07-fc-candle" l={45.6} t={38} w={1} h={7} d={400} st={{ background: "#fff3d8", transformOrigin: "50% 100%" }} />
      <V c="g07-fc-flame" l={44.8} t={36} w={2.6} h={3.4} d={510}>{flame}</V>
      <V c="g07-place" l={51} t={41} w={5} h={8} d={620}>{cup}</V>
      <L c="g07-shaft" l={45} t={30} w={9} h={18} d={680} st={{ background: "linear-gradient(180deg, rgba(255,243,216,0.55), transparent)", transformOrigin: "50% 0%" }} />
    </Lead>
  );
}

/* =============================================================================
   27. Dead Letter Office (t1) — THE PIGEONHOLE RACK
   A letter is pushed into its hole in the rack, the shutter drops over the
   front of it and the little brass turn-button is closed. Nothing comes back
   out of that one. Palette: #7d8794 / #fff1d4 / #171b21.
   ========================================================================== */
const DLO_HOLES: Array<[number, number]> = [[41, 40], [46.6, 40], [52.2, 40], [41, 46], [46.6, 46], [52.2, 46]];

function PigeonholeScene({ role, delayMs }: SceneProps) {
  const letter = (
    <g {...SJ}>
      <path d="M3 6.5h18v11H3z" fill="#fff1d4" stroke="#171b21" strokeWidth="1.1" />
      <path d="M3 6.5l9 6 9-6" fill="none" stroke="#7d8794" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        {[0, 1, 2, 3].map((i) => (
          <L key={i} c="g07-ph-hole" l={10 + (i % 2) * 42} t={16 + Math.floor(i / 2) * 38} w={38} h={32} d={40 + i * 80} st={{ border: "2px solid #7d8794" }} />
        ))}
        <V c="g07-ph-push" l={26} t={22} w={34} h={24} d={400}>{letter}</V>
        <L c="g07-ph-shutter" l={10} t={16} w={38} h={32} d={540} st={{ background: "#171b21", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g07-hit2" l={16} t={20} w={68} h={58} d={0} st={{ border: "2px solid #7d8794" }} />
        <V c="g07-hitside" l={28} t={32} w={44} h={32} d={140}>{letter}</V>
        <L c="g07-hit" l={18} t={22} w={64} h={54} d={260} st={{ background: "rgba(23,27,33,0.8)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><L c="g07-veil" st={{ background: "rgba(9,11,14,0.4)" }} /><Wash tone="rgba(125,135,148,0.24)" d={140} /></>}>
      {DLO_HOLES.map(([l, t], i) => (
        <L key={i} c="g07-ph-hole" l={l} t={t} w={5} h={5.4} d={100 + i * 60} st={{ border: "1.4px solid #7d8794" }} />
      ))}
      <V c="g07-ph-push" l={45} t={41} w={6} h={4} d={470}>{letter}</V>
      <L c="g07-ph-shutter" l={46.6} t={40} w={5} h={5.4} d={590} st={{ background: "#171b21", transformOrigin: "50% 0%" }} />
      <V c="g07-place" l={48.4} t={42} w={1.8} h={1.8} d={660}><circle cx="12" cy="12" r="9" fill="#fff1d4" /></V>
      <L c="g07-leanshadow" l={42} t={54} w={17} h={2.8} d={700} st={{ borderRadius: "999px", background: "rgba(23,27,33,0.66)" }} />
    </Lead>
  );
}

/* =============================================================================
   28. Doorman (t1) — THE STORES PADLOCK
   The hasp is swung over the staple, the padlock hooked through it and pressed
   until the shackle snaps home, and the key goes into the quartermaster's own
   pocket. Palette: #cfa93f / #fff3d6 / #241f10.
   ========================================================================== */
function PadlockScene({ role, delayMs }: SceneProps) {
  const lock = (
    <g {...SJ}>
      <path d="M4.6 10.6h14.8V21H4.6z" fill="#cfa93f" stroke="#241f10" strokeWidth="1.2" />
      <path d="M7.6 10.6V7.4a4.4 4.4 0 0 1 8.8 0v3.2" fill="none" stroke="#fff3d6" strokeWidth="1.8" />
      <path d="M10.6 14.6h2.8v3.4h-2.8z" fill="#241f10" />
    </g>
  );
  const hasp = (
    <g {...SJ}>
      <path d="M3 9.4h14a3.6 3.6 0 0 1 0 5.2H3z" fill="#241f10" stroke="#cfa93f" strokeWidth="1.1" />
      <circle cx="15" cy="12" r="1.8" fill="#fff3d6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-pd-hasp" l={6} t={38} w={64} h={28} d={40} st={{ transformOrigin: "8% 50%" }}>{hasp}</V>
        <V c="g07-ent-drop" l={38} t={16} w={44} h={56} d={260}>{lock}</V>
        <L c="g07-pd-snap" l={44} t={30} w={22} h={22} d={470} st={{ borderRadius: "50%", border: "2px solid #fff3d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hitside" l={28} t={18} w={44} h={58} d={0}>{lock}</V>
        <V c="g07-hit" l={8} t={40} w={56} h={26} d={140} st={{ transformOrigin: "8% 50%" }}>{hasp}</V>
        <L c="g07-hit2" l={34} t={30} w={32} h={32} d={260} st={{ borderRadius: "50%", border: "2px solid #fff3d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(207,169,63,0.26)" /><Rim tone="rgba(255,243,214,0.26)" /></>}>
      <V c="g07-pd-hasp" l={38} t={44} w={16} h={7} d={100} st={{ transformOrigin: "8% 50%" }}>{hasp}</V>
      <V c="g07-issue" l={48} t={40} w={8} h={11} d={280}>{lock}</V>
      <L c="g07-pd-snap" l={46} t={40} w={12} h={12} d={450} st={{ borderRadius: "50%", border: "2px solid #fff3d6" }} />
      <V c="g07-pd-key" l={40} t={47} w={7} h={5} d={560}>
        <g {...SJ}>
          <circle cx="6" cy="12" r="3.4" fill="none" stroke="#cfa93f" strokeWidth="1.8" />
          <path d="M9.4 12h10v2.8M15.4 12v2.8" fill="none" stroke="#cfa93f" strokeWidth="1.7" />
        </g>
      </V>
      <L c="g07-leanshadow" l={43} t={56} w={15} h={2.8} d={640} st={{ borderRadius: "999px", background: "rgba(36,31,16,0.6)" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g07-glint" l={47 + i * 6} t={43} w={2} h={2} d={700 + i * 100} st={{ borderRadius: "50%", background: "#fff3d6" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   29. Express Courier (t1) — THE REMOUNT AT THE RELAY POST
   The saddle comes off the block and onto a fresh back, the girth is hauled
   through the buckle in two pulls, the satchel is clipped on and the whole
   thing is gone. Aim-staged: the remount runs the real leg.
   Palette: #b45f3e / #fff0cf / #26150d.
   ========================================================================== */
function RemountScene({ role, delayMs }: SceneProps) {
  const saddle = (
    <g {...SJ}>
      <path d="M3 10.4c4-3.4 14-3.4 18 0 0 5-3.2 8-9 8s-9-3-9-8z" fill="#b45f3e" stroke="#26150d" strokeWidth="1.2" />
      <path d="M8 6.4c2-2 6-2 8 0" fill="none" stroke="#fff0cf" strokeWidth="1.2" />
    </g>
  );
  const satchel = (
    <g {...SJ}>
      <path d="M5.5 9h13v10h-13z" fill="#26150d" stroke="#b45f3e" strokeWidth="1.1" />
      <path d="M5.5 9l2-4h9l2 4z" fill="#b45f3e" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-ent-drop" l={16} t={20} w={68} h={44} d={40}>{saddle}</V>
        <L c="g07-rm-girth" l={22} t={56} w={56} h={5} d={250} st={{ borderRadius: "999px", background: "#26150d", transformOrigin: "0% 50%" }} />
        <V c="g07-rm-clip" l={52} t={58} w={34} h={34} d={460}>{satchel}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hitside" l={18} t={22} w={64} h={42} d={0}>{saddle}</V>
        <L c="g07-hit2" l={22} t={58} w={56} h={5} d={140} st={{ borderRadius: "999px", background: "#26150d" }} />
        <V c="g07-hit" l={36} t={60} w={30} h={30} d={260}>{satchel}</V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(180,95,62,0.26)" />}>
      <L c="g07-runout" l={45} t={53} w={28} h={1.8} d={80} st={{ background: "linear-gradient(90deg, #b45f3e, rgba(180,95,62,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g07-rm-saddle" l={43} t={41} w={13} h={9} d={230}>{saddle}</V>
      <L c="g07-rm-girth" l={44} t={47} w={11} h={1.4} d={370} st={{ borderRadius: "999px", background: "#26150d", transformOrigin: "0% 50%" }} />
      <V c="g07-rm-clip" l={51} t={44} w={6} h={7} d={490}>{satchel}</V>
      <L c="g07-rm-dash" l={45} t={49} w={16} h={1} d={610} st={{ background: "linear-gradient(90deg, rgba(255,240,207,0), #fff0cf)", borderRadius: "999px" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g07-drift" l={44 + i * 4} t={51} w={1.4} h={1.4} d={690 + i * 90} st={{ borderRadius: "50%", background: "#fff0cf" }} />
      ))}
    </AimLead>
  );
}

/* =============================================================================
   30. Ferry Crossing (t1) — THE CAPSTAN
   Two bars are shipped into the capstan head and walked round, the pawl clacks
   over its ratchet twice, and the cable hauls the load in by exactly that much.
   Aim-staged: the cable runs the real leg.
   Palette: #6f96a8 / #fff2d6 / #16232b.
   ========================================================================== */
function CapstanScene({ role, delayMs }: SceneProps) {
  const head = (
    <g {...SJ}>
      <path d="M7 5h10l1.6 14H5.4z" fill="#6f96a8" stroke="#16232b" strokeWidth="1.2" />
      <path d="M5.4 9.4h13.2" stroke="#16232b" strokeWidth="1.1" />
    </g>
  );
  const pawl = <path d="M3 12h11l6-4v8l-6-4" fill="#16232b" stroke="#fff2d6" strokeWidth="1.2" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g07-ent-rise" l={28} t={26} w={44} h={58} d={40}>{head}</V>
        <L c="g07-cp-bar" l={6} t={44} w={88} h={4} d={250} st={{ borderRadius: "999px", background: "#fff2d6" }} />
        <V c="g07-cp-pawl" l={54} t={58} w={36} h={26} d={460} st={{ transformOrigin: "10% 50%" }}>{pawl}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g07-hitside" l={30} t={24} w={40} h={56} d={0}>{head}</V>
        <L c="g07-hit2" l={8} t={44} w={84} h={4} d={140} st={{ borderRadius: "999px", background: "#fff2d6" }} />
        <V c="g07-hit" l={50} t={56} w={36} h={28} d={260} st={{ transformOrigin: "10% 50%" }}>{pawl}</V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(111,150,168,0.26)" /><Rim tone="rgba(255,242,214,0.22)" /></>}>
      <V c="g07-cp-head" l={42} t={41} w={9} h={12} d={90}>{head}</V>
      <L c="g07-cp-bar" l={39} t={45.6} w={16} h={1.2} d={240} st={{ borderRadius: "999px", background: "#fff2d6" }} />
      <V c="g07-cp-pawl" l={48} t={47} w={6} h={4.4} d={380} st={{ transformOrigin: "10% 50%" }}>{pawl}</V>
      <L c="g07-runout" l={46} t={45.6} w={26} h={1} d={470} st={{ background: "linear-gradient(90deg, #6f96a8, rgba(111,150,168,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <L c="g07-cp-haul" l={52} t={44} w={7} h={4} d={600} st={{ background: "#16232b", borderRadius: "1px" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g07-drift" l={45 + i * 5} t={50} w={1.4} h={1.4} d={690 + i * 95} st={{ borderRadius: "50%", background: "#fff2d6" }} />
      ))}
    </AimLead>
  );
}

/* =============================================================================
   Registry. Every entry declares an anchor; every `sound` is an existing
   SigSoundKey. `source` is omitted throughout: these cards carry no removal
   diff, so the play is the cast lead on the square it was played on.
   ========================================================================== */

/** Bind one bespoke scene to its config. */
function S(Render: SigPlugin["Render"], config: SigPlugin["config"]): SigPlugin {
  return { config, Render };
}

export const PLAYS: Record<string, SigPlugin> = {
  op_homestead_clause: S(RationCartScene, { ordering: "file", staggerMs: 70, victims: ["p"], hasLead: true, sound: "vault", anchor: "board" }),
  op_leapfrog_lesson: S(CooperBarrelScene, { ordering: "line", staggerMs: 60, victims: ["p", "b"], hasLead: true, sound: "wall", anchor: "aim" }),
  op_market_dog: S(SutlerScalesScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "chips", anchor: "cast" }),
  op_sandbag_hurdle: S(ForageStackScene, { ordering: "line", staggerMs: 70, victims: ["p", "r"], hasLead: true, sound: "siege", anchor: "cast" }),
  op_threshold_blessing: S(IssueBlanketScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "vault", anchor: "board" }),
  op_trellis: S(LaundryLineScene, { ordering: "line", staggerMs: 80, victims: ["p"], hasLead: true, sound: "aegis", anchor: "aim" }),
  ov_masterclass: S(PaymasterScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coinflip", anchor: "board" }),
  ov_sock_slide: S(BootLastScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "blitz", anchor: "cast" }),
  ov_tandem_bike: S(ShoulderYokeScene, { ordering: "line", staggerMs: 60, victims: ["p"], hasLead: true, sound: "wall", anchor: "aim" }),
  ov_wheelbarrow: S(WaterBowserScene, { ordering: "file", staggerMs: 70, victims: ["p"], hasLead: true, sound: "aegis", anchor: "cast" }),
  ov_whittle: S(WhittleScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "shades", anchor: "cast" }),
  bn4_muddy_boots: S(PicketLineScene, { ordering: "line", staggerMs: 55, victims: ["p"], hasLead: true, sound: "clockcage", anchor: "board" }),
  bn4_pawn_umbrella: S(TentRaisedScene, { ordering: "radial", staggerMs: 55, victims: ["p"], hasLead: true, sound: "aegis", anchor: "board" }),
  bn4_shoelace_knot: S(SackTieScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "clockcage", anchor: "cast" }),
  hx4_cold_porridge: S(ColdKettleScene, { ordering: "radial", staggerMs: 60, victims: ["p"], hasLead: true, sound: "snooze", anchor: "board" }),
  hx4_heavy_pockets: S(HaversackScene, { ordering: "file", staggerMs: 60, victims: ["p"], hasLead: true, sound: "colossus", anchor: "board" }),
  hx4_hopscotch: S(ChalkBoardScene, { ordering: "octagon", staggerMs: 55, victims: ["p"], hasLead: true, sound: "dice", anchor: "cast" }),
  hx4_polite_infantry: S(CounterFlapScene, { ordering: "file", staggerMs: 65, victims: ["p"], hasLead: true, sound: "petrify", anchor: "board" }),
  op_airmail: S(PigeonLoftScene, { ordering: "line", staggerMs: 50, victims: "all", hasLead: true, sound: "blitz", anchor: "board" }),
  op_back_alley: S(HurricaneLampScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "shades", anchor: "cast" }),
  op_bread_for_the_table: S(BreadOvenScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "crownrain", anchor: "cast" }),
  op_bricklayer: S(PackingCaseScene, { ordering: "file", staggerMs: 70, victims: ["p"], hasLead: true, sound: "wall", anchor: "cast" }),
  op_bulk_postage: S(MailSackScene, { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "slots", anchor: "board" }),
  op_cellar_hatch: S(CellarHatchScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "vault", anchor: "cast" }),
  op_certified_letter: S(DespatchTinScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "gacha", anchor: "board" }),
  op_cloister_step: S(FieldChestScene, { ordering: "radial", staggerMs: 60, victims: ["p", "b"], hasLead: true, sound: "cathedral", anchor: "cast" }),
  op_dead_letter_office: S(PigeonholeScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", anchor: "cast" }),
  op_doorman: S(PadlockScene, { ordering: "octagon", staggerMs: 55, victims: ["p"], hasLead: true, sound: "vault", anchor: "cast" }),
  op_express_courier: S(RemountScene, { ordering: "line", staggerMs: 55, victims: "all", hasLead: true, sound: "blitz", anchor: "board" }),
  op_ferry_crossing: S(CapstanScene, { ordering: "line", staggerMs: 65, victims: ["p"], hasLead: true, sound: "siege", anchor: "board" }),
};
