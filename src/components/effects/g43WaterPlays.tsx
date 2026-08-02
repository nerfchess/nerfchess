// g43WaterPlays — bespoke plays for the 42 cards that used to share five
// generated families (tideSweep, kingsDecree, bellToll, quillSign,
// lanternFloat): the same five choreographies, recoloured 42 ways.
//
// MODULE FICTION: WATER, AND WHAT IT CARRIES. Every card is a different thing
// water does or brings, and no two share a central object — a bore running up
// a river against the current, a bank giving way along one file, a weir
// holding a level, a strandline creeping higher up the beach, a chain boom
// drawn across the channel, a message in a bottle grounding on the shingle, a
// net coming up full, a paper lantern set adrift, a pair of sea boots filling
// on the tideline.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g43WaterPlays.css), transform/opacity animations only, no imports from
// BoardEffects.tsx, only the SigPlugin/SigRole TYPES from sigPlugins.tsx.
//
// STAGING. Every card declares an anchor, taken from scripts/lib/anchor-rule
// rather than from taste: a card that lands on a square or a piece anchors
// "cast" (or "aim" when the vector IS the card — the coracle slipping across,
// the gaff coming down the line, the flying fish's glide), while a card that
// changes a rule, empties a clock or fixes a draft has no square to happen on
// and anchors "board". Board-scale layers (washes, edge gilt, the waterline)
// live inside <BoardFrame> either way, never at a fixed percentage of the
// stage, and the travelling part of a scene rides <AimStage> through the `run`
// slot of the shared Lead, authored pointing RIGHT, while the upright subject
// stays square with the board on <BoardWideStage>.
//
// WATER TRAVELS, so the art leans hard on the geometry contract: `.g43-bore`
// carries a wave front the REAL --fx-len cells and arrives, `.g43-run` opens a
// channel to the real leg length, `.g43-carry` drifts flotsam down the real
// aim vector, `.g43-drift` brings the level in over the CASTER's own edge
// (--fx-side, never "the bottom of the board"), and the per-square cuts stand
// their water by --fx-index. Every scene runs three beats — tell, strike,
// settle — in all three roles. All CSS lives in g43WaterPlays.css behind the
// `g43-` prefix.

import "./g43WaterPlays.css";

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
   Local machinery. Nothing here draws: it positions, delays and stages.
   ========================================================================== */

const ROOT = "pointer-events-none absolute inset-0 z-30 block";

/** The caller's stagger rides a CSS var so beat offsets stay composable. */
const rootStyle = (d: number): CSSProperties => ({ "--g43-d": `${d}ms` }) as CSSProperties;

/** stagger + a beat offset, scaled by the Settings animation-speed var. */
const b = (ms: number): string => `calc(var(--g43-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

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

/**
 * The lead cut.
 *
 * `frame` is the board-scale atmosphere and goes in <BoardFrame>, so it is
 * exactly the board at any anchor. `children` is the upright subject, square
 * with the board on the cast square. `run` is the TRAVELLING part and rides
 * <AimStage>: author it pointing right and it aims itself down the real
 * source-to-target vector, which is what makes a bore arrive at the victim
 * rather than at a fixed screen angle.
 */
function Lead({
  d, frame, run, children,
}: { d: number; frame?: ReactNode; run?: ReactNode; children: ReactNode }) {
  return (
    <span className={ROOT} style={rootStyle(d)} aria-hidden="true">
      <BoardWideStage>
        {frame ? <BoardFrame>{frame}</BoardFrame> : null}
        {children}
      </BoardWideStage>
      {run ? <AimStage>{run}</AimStage> : null}
    </span>
  );
}

/** Board-wide wash, always inside a BoardFrame. */
function Wash({ tone, d = 0 }: { tone: string; d?: number }) {
  return <L c="g43-wash" d={d} st={{ background: `radial-gradient(circle at 50% 50%, ${tone}, transparent 70%)` }} />;
}

/** Board-edge gilt, always inside a BoardFrame. */
function Rim({ tone, d = 150 }: { tone: string; d?: number }) {
  return <L c="g43-rim" d={d} st={{ boxShadow: `inset 0 0 30px 9px ${tone}` }} />;
}

/** The board's own waterline, standing off the CASTER's edge (--fx-side). */
function Tide({ tone, d = 90 }: { tone: string; d?: number }) {
  return (
    <L
      c="g43-tideline"
      t={44}
      h={12}
      d={d}
      st={{ background: `linear-gradient(180deg, ${tone}, transparent)`, transformOrigin: "50% 100%" }}
    />
  );
}

/* Water shapes reused as dressing across the module (never as the subject). */
const RIPPLE = "M1 12c3-3.4 5.6-3.4 8.6 0s5.6 3.4 8.6 0 5.6-3.4 4.8 0";
const DROP = "M12 3.4c3.4 4.6 5.6 7.4 5.6 10a5.6 5.6 0 0 1-11.2 0c0-2.6 2.2-5.4 5.6-10z";

/* =============================================================================
   THE SCENES. One per card, in the order of the PLAYS table at the bottom.
   ========================================================================== */

/* --- 1. River Breakup (t1) — THE ICE RAFT -----------------------------------
   The thaw brings the winter's ice down: the sheet splits along one hairline,
   slabs tilt and grind past one another, and the last floe shoves through
   leaving open black water. Palette: #cfe7f2 / #fff4d6 / #16303f. */
const RB_FLOE = "M2.4 14.6l4.6-7.2 8.4-1.6 6.2 4.4-2.6 8.4-12.4 1.2z";

function RiverBreakupScene({ role, delayMs }: SceneProps) {
  const floe = (f: string) => <path d={RB_FLOE} fill={f} stroke="#16303f" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-ent-drop" l={6} t={22} w={54} h={48} d={40}>{floe("#cfe7f2")}</V>
      <V c="g43-rb-floe" l={40} t={38} w={52} h={46} d={250}>{floe("#fff4d6")}</V>
      <L c="g43-ent-pop" l={26} t={76} w={48} h={4} d={440} st={{ borderRadius: "999px", background: "#16303f" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={10} t={14} w={80} h={62} d={0}>{floe("#cfe7f2")}</V>
      <L c="g43-hitwave" l={8} t={62} w={84} h={5} d={140} st={{ borderRadius: "999px", background: "#16303f" }} />
      <L c="g43-hit2" l={44} t={36} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(207,231,242,0.3)" /><Rim tone="rgba(255,244,214,0.26)" /><Tide tone="rgba(22,48,63,0.5)" /></>}>
      <L c="g43-rb-crack" l={41} t={49.4} w={20} h={0.9} d={80} st={{ background: "#16303f", transformOrigin: "0% 50%" }} />
      {[0, 1, 2].map((i) => (
        <V key={i} c="g43-rb-floe" l={41 + i * 6} t={42 + (i % 2) * 6} w={8.4} h={8.4} d={240 + i * 110}>{floe(i % 2 ? "#fff4d6" : "#cfe7f2")}</V>
      ))}
      <V c="g43-rb-shove" l={45} t={47} w={11} h={10} d={560}>{floe("#cfe7f2")}</V>
      <L c="g43-foam" l={45} t={53} w={9} h={4} d={640} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.62)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={44 + i * 5} t={55} w={1.2} h={1.2} d={700} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 2. Water Break (t1) — THE SPRING IN THE SAND ---------------------------
   A sand boil: the bed domes, grains dance on the swell, and clean water wells
   up through it and spreads. Palette: #7fc6d8 / #fff4d6 / #4a3a1e. */
const SW_BED = "M1 20.5c3.6-6.4 6.8-9 11-9s7.4 2.6 11 9z";

function WaterBreakScene({ role, delayMs }: SceneProps) {
  const bed = <path d={SW_BED} fill="#4a3a1e" stroke="#fff4d6" strokeWidth="0.8" {...SJ} />;
  const well = <path d={RIPPLE} fill="none" stroke="#7fc6d8" strokeWidth="2.2" {...SJ} />;
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-ent-rise" l={8} t={44} w={84} h={46} d={40}>{bed}</V>
      <V c="g43-sw-well" l={26} t={30} w={48} h={34} d={250} st={{ transformOrigin: "50% 100%" }}>{well}</V>
      <L c="g43-sw-boil" l={42} t={46} w={16} h={16} d={440} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={12} t={44} w={76} h={44} d={0}>{bed}</V>
      <L c="g43-hitwave" l={30} t={50} w={40} h={5} d={140} st={{ borderRadius: "999px", background: "#7fc6d8" }} />
      <L c="g43-hit2" l={44} t={42} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(127,198,216,0.26)" /><Tide tone="rgba(74,58,30,0.42)" /></>}>
      <V c="g43-lean" l={40} t={50} w={20} h={9} d={80} st={{ transformOrigin: "50% 0%" }}>
        <path d={SW_BED} fill="rgba(74,58,30,0.6)" />
      </V>
      <L c="g43-sw-boil" l={45.5} t={46.5} w={9} h={9} d={230} st={{ borderRadius: "50%", background: "#4a3a1e", boxShadow: "0 0 0 2px rgba(255,244,214,0.5)" }} />
      <V c="g43-sw-well" l={42} t={40} w={16} h={12} d={380} st={{ transformOrigin: "50% 100%" }}>{well}</V>
      <L c="g43-foam" l={44} t={48} w={12} h={6} d={520} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.5)" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g43-sw-grain" l={43 + i * 3.4} t={49} w={1.1} h={1.1} d={620} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
      <L c="g43-motes" l={49} t={44} w={1.6} h={1.6} d={700} st={{ borderRadius: "50%", background: "#7fc6d8" }} />
    </Lead>
  );
}

/* --- 3. Rain Check (t1) — THE RAIN GAUGE ------------------------------------
   The cloud pays out later, so the gauge does the waiting: a funnel tips into
   the tube, the graduations fill one mark at a time, and a bead runs down the
   outside of the glass. Palette: #9ec9e8 / #fff4d6 / #22374d. */
const RC_TUBE = "M8.4 5h7.2v16.4H8.4z";

function RainCheckScene({ role, delayMs }: SceneProps) {
  const tube = (
    <g {...SJ}>
      <path d={RC_TUBE} fill="rgba(158,201,232,0.25)" stroke="#22374d" strokeWidth="1.3" />
      <path d="M9.6 9h3M9.6 12.6h3M9.6 16.2h3" stroke="#fff4d6" strokeWidth="0.9" />
    </g>
  );
  const funnel = <path d="M3 3h18l-6.6 7.4H9.6z" fill="#9ec9e8" stroke="#22374d" strokeWidth="1.2" {...SJ} />;
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-rc-funnel" l={22} t={6} w={56} h={38} d={40}>{funnel}</V>
      <V c="g43-ent-rise" l={28} t={30} w={44} h={62} d={250}>{tube}</V>
      <L c="g43-rc-fill" l={38} t={54} w={24} h={32} d={440} st={{ background: "#9ec9e8", transformOrigin: "50% 100%" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={30} t={12} w={40} h={70} d={0}>{tube}</V>
      <L c="g43-hitwave" l={36} t={56} w={28} h={22} d={140} st={{ background: "#9ec9e8", transformOrigin: "50% 100%" }} />
      <L c="g43-hit2" l={46} t={16} w={8} h={8} d={260} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(158,201,232,0.26)" /><Rim tone="rgba(255,244,214,0.22)" /></>}>
      <L c="g43-lean" l={44} t={57} w={13} h={2.4} d={80} st={{ borderRadius: "999px", background: "rgba(34,55,77,0.55)" }} />
      <V c="g43-rc-funnel" l={44} t={38} w={12} h={9} d={220}>{funnel}</V>
      <V c="g43-ent-rise" l={45.6} t={43} w={9} h={15} d={340}>{tube}</V>
      <L c="g43-rc-fill" l={47.4} t={49} w={5.2} h={8} d={480} st={{ background: "#9ec9e8", transformOrigin: "50% 100%" }} />
      <L c="g43-rc-bead" l={53} t={47} w={1.4} h={2.4} d={620} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-drip" l={43 + i * 7} t={34} w={1.2} h={4} d={700} st={{ borderRadius: "999px", background: "rgba(158,201,232,0.85)" }} />
      ))}
    </Lead>
  );
}

/* --- 4. Leaking Boats (t3) — THE BAILING SCOOP ------------------------------
   Nobody fights while the boat is filling: the seam weeps, the wooden bailer
   swings and swings, and the water it throws goes over the side in an arc.
   Palette: #8fb6c8 / #fff4d6 / #2b2118. */
const LB_SCOOP = "M5 5.6h14l-2.4 11.4a3 3 0 0 1-3 2.4h-3.2a3 3 0 0 1-3-2.4z";

function LeakingBoatsScene({ role, delayMs }: SceneProps) {
  const scoop = (
    <g {...SJ}>
      <path d={LB_SCOOP} fill="#8fb6c8" stroke="#2b2118" strokeWidth="1.3" />
      <path d="M8.6 5.6V2.8h6.8v2.8" fill="none" stroke="#2b2118" strokeWidth="1.3" />
    </g>
  );
  const water = <path d={DROP} fill="#fff4d6" opacity="0.85" />;
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-lb-scoop" l={24} t={22} w={52} h={58} d={40} st={{ transformOrigin: "50% 12%" }}>{scoop}</V>
      <V c="g43-lb-fling" l={54} t={16} w={22} h={24} d={250}>{water}</V>
      <L c="g43-lb-seep" l={10} t={78} w={56} h={4} d={440} st={{ borderRadius: "999px", background: "#8fb6c8", transformOrigin: "0% 50%" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={22} t={14} w={56} h={62} d={0}>{scoop}</V>
      <L c="g43-hitwave" l={10} t={70} w={80} h={5} d={140} st={{ borderRadius: "999px", background: "#8fb6c8" }} />
      <V c="g43-hit2" l={58} t={22} w={20} h={20} d={260}>{water}</V>
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(143,182,200,0.26)" /><Tide tone="rgba(43,33,24,0.5)" /></>}>
      <L c="g43-lb-seep" l={40} t={52} w={20} h={1.8} d={80} st={{ borderRadius: "999px", background: "#8fb6c8", transformOrigin: "0% 50%" }} />
      <V c="g43-lb-scoop" l={43} t={40} w={11} h={13} d={230} st={{ transformOrigin: "50% 10%" }}>{scoop}</V>
      <V c="g43-lb-fling" l={50} t={38} w={6} h={6} d={370}>{water}</V>
      <V c="g43-lb-fling" l={49} t={41} w={4.4} h={4.4} d={470}>{water}</V>
      <L c="g43-lean" l={41} t={54} w={18} h={2.6} d={560} st={{ borderRadius: "999px", background: "rgba(43,33,24,0.5)" }} />
      <L c="g43-foam" l={45} t={51} w={9} h={4} d={640} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.55)" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g43-drip" l={46 + i * 6} t={53} w={1.2} h={3.4} d={700} st={{ borderRadius: "999px", background: "#8fb6c8" }} />
      ))}
    </Lead>
  );
}

/* --- 5. Rogue River (t4) — THE BANK GIVES WAY -------------------------------
   A turf block slumps off the bank, the water finds the gap and cuts a brand
   new channel down the file, and a fan of spill spreads where the field used
   to be. Palette: #6fb9d6 / #fff4d6 / #4a3320. */
const RR_TURF = "M2 7.4h20v12.6H2z";

function RogueRiverScene({ role, delayMs }: SceneProps) {
  const turf = (
    <g {...SJ}>
      <path d={RR_TURF} fill="#4a3320" stroke="#fff4d6" strokeWidth="0.9" />
      <path d="M2 7.4c3-2 5-2 8 0s5 2 8 0 3-1.6 4 0" fill="none" stroke="#6fb9d6" strokeWidth="1.6" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-ent-drop" l={8} t={20} w={50} h={44} d={40}>{turf}</V>
      <V c="g43-rr-slump" l={40} t={34} w={48} h={44} d={250}>{turf}</V>
      <L c="g43-rr-cut" l={12} t={72} w={76} h={8} d={440} st={{ background: "linear-gradient(90deg, #6fb9d6, rgba(111,185,214,0.2))", transformOrigin: "0% 50%" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={14} t={16} w={72} h={54} d={0}>{turf}</V>
      <L c="g43-hitwave" l={8} t={66} w={84} h={7} d={140} st={{ background: "#6fb9d6", transformOrigin: "0% 50%" }} />
      <L c="g43-hit2" l={42} t={54} w={16} h={16} d={260} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.8)" }} />
    </Cut>
  );
  return (
    <Lead
      d={delayMs}
      frame={<><Wash tone="rgba(111,185,214,0.28)" /><Rim tone="rgba(74,51,32,0.34)" /></>}
      run={<L c="g43-run" l={50} t={48.4} w={30} h={2.8} d={300} st={{ background: "linear-gradient(90deg, #6fb9d6, rgba(111,185,214,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />}
    >
      <L c="g43-lean" l={42} t={53} w={16} h={2.4} d={80} st={{ borderRadius: "999px", background: "rgba(74,51,32,0.6)" }} />
      <V c="g43-rr-slump" l={43} t={43} w={10} h={9} d={220}>{turf}</V>
      <V c="g43-rr-slump" l={49} t={45} w={8} h={7} d={330}>{turf}</V>
      <L c="g43-rr-cut" l={44} t={48.6} w={14} h={2} d={430} st={{ background: "#6fb9d6", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <L c="g43-rr-spill" l={44} t={49} w={13} h={7} d={560} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(111,185,214,0.75), transparent 70%)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={45 + i * 4} t={52} w={1.3} h={1.3} d={680} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 6. Holy Water (t5) — THE ASPERGILLUM -----------------------------------
   The stoup is set down, the perforated head is dipped, and the blessing goes
   out in three flicked arcs that each land as a bead of light on a piece.
   Palette: #f0d089 / #fff4d6 / #1e2c3a. */
const HW_STOUP = "M5 7.4h14l-1.8 9.2a4 4 0 0 1-3.9 3.2h-2.6a4 4 0 0 1-3.9-3.2z";

function HolyWaterScene({ role, delayMs }: SceneProps) {
  const stoup = (
    <g {...SJ}>
      <path d={HW_STOUP} fill="#1e2c3a" stroke="#f0d089" strokeWidth="1.3" />
      <path d="M6.6 9.4h10.8" stroke="#fff4d6" strokeWidth="1.4" />
    </g>
  );
  const rod = (
    <g {...SJ}>
      <path d="M12 21V9.4" stroke="#f0d089" strokeWidth="1.8" />
      <circle cx="12" cy="6.4" r="4" fill="#fff4d6" stroke="#1e2c3a" strokeWidth="1.2" />
      <path d="M10 5.2h.01M13.6 5.4h.01M11.6 8h.01" stroke="#1e2c3a" strokeWidth="1.6" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-hw-stoup" l={8} t={44} w={44} h={48} d={40}>{stoup}</V>
      <V c="g43-hw-flick" l={40} t={10} w={44} h={68} d={250} st={{ transformOrigin: "50% 90%" }}>{rod}</V>
      <V c="g43-hw-bless" l={62} t={20} w={16} h={16} d={440}><path d={DROP} fill="#fff4d6" /></V>
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={26} t={10} w={48} h={64} d={0}>{rod}</V>
      <V c="g43-hit2" l={40} t={52} w={20} h={20} d={140}><path d={DROP} fill="#fff4d6" /></V>
      <L c="g43-hitwave" l={22} t={76} w={56} h={4} d={260} st={{ borderRadius: "999px", background: "#f0d089" }} />
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(240,208,137,0.26)" /><Rim tone="rgba(255,244,214,0.28)" /></>}>
      <L c="g43-lean" l={43} t={55} w={14} h={2.2} d={80} st={{ borderRadius: "999px", background: "rgba(30,44,58,0.55)" }} />
      <V c="g43-hw-stoup" l={41} t={47} w={9} h={10} d={220}>{stoup}</V>
      <V c="g43-hw-flick" l={48} t={39} w={9} h={16} d={340} st={{ transformOrigin: "50% 88%" }}>{rod}</V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g43-hw-bless" l={51 + i * 2} t={42 + i * 2} w={3.6} h={3.6} d={470 + i * 90}><path d={DROP} fill="#fff4d6" /></V>
      ))}
      <L c="g43-foam" l={46} t={50} w={10} h={10} d={620} st={{ borderRadius: "50%", border: "2px solid rgba(240,208,137,0.7)" }} />
      <L c="g43-motes" l={53} t={46} w={1.6} h={1.6} d={700} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 7. Logjam (t5) — THE BAULKS LOCK ---------------------------------------
   Timber coming down the river meets the bend: one baulk turns broadside, the
   next two ride up on it, the jam shudders tight and the water backs up behind
   it. Palette: #b58a52 / #fff4d6 / #23301f. */
const LJ_LOG = "M3 8.4h18v7.2H3z";

function LogjamScene({ role, delayMs }: SceneProps) {
  const log = (
    <g {...SJ}>
      <path d={LJ_LOG} fill="#b58a52" stroke="#23301f" strokeWidth="1.2" />
      <path d="M21 8.4v7.2" stroke="#fff4d6" strokeWidth="1.6" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-lj-baulk" l={6} t={26} w={80} h={26} d={40}>{log}</V>
      <V c="g43-lj-baulk" l={14} t={44} w={80} h={26} d={250} st={{ rotate: "-14deg" }}>{log}</V>
      <L c="g43-lj-back" l={10} t={72} w={80} h={14} d={440} st={{ background: "linear-gradient(180deg, transparent, #23301f)", transformOrigin: "50% 100%" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={8} t={26} w={84} h={26} d={0}>{log}</V>
      <V c="g43-hit" l={14} t={48} w={72} h={24} d={140} st={{ rotate: "12deg" }}>{log}</V>
      <L c="g43-hitwave" l={8} t={74} w={84} h={5} d={260} st={{ borderRadius: "999px", background: "#23301f" }} />
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(181,138,82,0.26)" /><Tide tone="rgba(35,48,31,0.55)" /></>}>
      <L c="g43-lj-back" l={38} t={44} w={24} h={7} d={80} st={{ background: "linear-gradient(180deg, transparent, rgba(35,48,31,0.75))", transformOrigin: "50% 100%" }} />
      {[0, 1, 2].map((i) => (
        <P key={i} l={42} t={45 + i * 3} w={16} h={4} rot={`${i * 16 - 16}deg`}>
          <V c="g43-lj-baulk" d={230 + i * 110}>{log}</V>
        </P>
      ))}
      <V c="g43-lj-lock" l={45} t={45} w={11} h={11} d={560}>
        <path d="M4 12h16M12 4v16" stroke="#fff4d6" strokeWidth="1.6" {...SJ} />
      </V>
      <L c="g43-foam" l={44} t={49} w={12} h={5} d={640} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.5)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={44 + i * 5} t={51} w={1.2} h={1.2} d={700} st={{ borderRadius: "50%", background: "#b58a52" }} />
      ))}
    </Lead>
  );
}

/* --- 8. High Water (t5) — THE WEIR HOLDS THE LEVEL --------------------------
   The sill drops in, the whole width of the river folds over the crest in one
   glassy sheet, and below it the white boil says nothing heavy gets past.
   Palette: #7fc8d8 / #fff4d6 / #1c2f36. */
function HighWaterScene({ role, delayMs }: SceneProps) {
  const sill = (
    <g {...SJ}>
      <path d="M1 8h22v5H1z" fill="#1c2f36" stroke="#fff4d6" strokeWidth="0.9" />
      <path d="M5 8V4.4M12 8V4.4M19 8V4.4" stroke="#7fc8d8" strokeWidth="1.6" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-hg-sill" l={6} t={26} w={88} h={30} d={40}>{sill}</V>
      <L c="g43-hg-nappe" l={14} t={48} w={72} h={30} d={250} st={{ background: "linear-gradient(180deg, #7fc8d8, rgba(127,200,216,0.15))", transformOrigin: "50% 0%" }} />
      <L c="g43-hg-boil" l={32} t={74} w={36} h={12} d={440} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.7)" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={8} t={20} w={84} h={34} d={0}>{sill}</V>
      <L c="g43-hitwave" l={16} t={48} w={68} h={26} d={140} st={{ background: "linear-gradient(180deg, #7fc8d8, transparent)", transformOrigin: "50% 0%" }} />
      <L c="g43-hit2" l={38} t={70} w={24} h={10} d={260} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.7)" }} />
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(127,200,216,0.28)" /><Rim tone="rgba(28,47,54,0.34)" /><Tide tone="rgba(127,200,216,0.5)" /></>}>
      <L c="g43-lean" l={40} t={51} w={20} h={2.2} d={80} st={{ borderRadius: "999px", background: "rgba(28,47,54,0.55)" }} />
      <V c="g43-hg-sill" l={40} t={44} w={20} h={7} d={230}>{sill}</V>
      <L c="g43-hg-nappe" l={41.5} t={48} w={17} h={6.5} d={360} st={{ background: "linear-gradient(180deg, #7fc8d8, rgba(127,200,216,0.1))", transformOrigin: "50% 0%" }} />
      <L c="g43-hg-boil" l={43} t={53} w={14} h={5} d={500} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.62)" }} />
      <L c="g43-foam" l={45} t={54} w={10} h={4} d={620} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.4)" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g43-motes" l={43 + i * 4} t={55} w={1.2} h={1.2} d={700} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 9. River Watch (t5) — THE CHAIN BOOM -----------------------------------
   A chain strung on floats is drawn across the channel: the buoys roll up, the
   slack comes out of it link by link, and the last link snaps taut with a
   shiver. Palette: #9fb0bd / #fff4d6 / #1a2a33. */
function RiverWatchScene({ role, delayMs }: SceneProps) {
  const chain = (
    <g fill="none" stroke="#9fb0bd" strokeWidth="2.4" {...SJ}>
      <path d="M2 12h4M9 12h6M18 12h4" />
      <path d="M6 9.4h3v5.2H6zM15 9.4h3v5.2h-3z" stroke="#fff4d6" strokeWidth="1.4" />
    </g>
  );
  const buoy = (
    <g {...SJ}>
      <path d="M12 4l5 7.4-5 8.6-5-8.6z" fill="#9fb0bd" stroke="#1a2a33" strokeWidth="1.2" />
      <path d="M7.6 11.4h8.8" stroke="#fff4d6" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-rw-boom" l={4} t={40} w={92} h={20} d={40} st={{ transformOrigin: "0% 50%" }}>{chain}</V>
      <V c="g43-rw-buoy" l={30} t={26} w={40} h={48} d={250}>{buoy}</V>
      <L c="g43-rw-link" l={40} t={72} w={20} h={4} d={440} st={{ borderRadius: "999px", background: "#fff4d6" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={26} t={16} w={48} h={56} d={0}>{buoy}</V>
      <V c="g43-hitwave" l={2} t={44} w={96} h={16} d={140} st={{ transformOrigin: "0% 50%" }}>{chain}</V>
      <L c="g43-hit2" l={44} t={72} w={12} h={6} d={260} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.7)" }} />
    </Cut>
  );
  return (
    <Lead
      d={delayMs}
      frame={<><Wash tone="rgba(159,176,189,0.24)" /><Tide tone="rgba(26,42,51,0.5)" /></>}
      run={<V c="g43-rw-boom" l={50} t={47} w={26} h={6} d={240} st={{ transformOrigin: "0% 50%" }}>{chain}</V>}
    >
      <L c="g43-lean" l={44} t={53} w={13} h={2} d={80} st={{ borderRadius: "999px", background: "rgba(26,42,51,0.55)" }} />
      {[0, 1, 2].map((i) => (
        <V key={i} c="g43-rw-buoy" l={44 + i * 6} t={44} w={6} h={9} d={360 + i * 100}>{buoy}</V>
      ))}
      <L c="g43-rw-link" l={46} t={48} w={10} h={1.6} d={580} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <L c="g43-foam" l={46} t={51} w={9} h={4} d={640} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.45)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={45 + i * 5} t={52} w={1.2} h={1.2} d={700} st={{ borderRadius: "50%", background: "#9fb0bd" }} />
      ))}
    </Lead>
  );
}

/* --- 10. The Great Flood (t6) — THE BORE ------------------------------------
   The one card in the batch where the water itself is the subject: a bore runs
   UP the river against the current, one standing wall of water that travels
   the real distance to its victims, slaps the bank and drags a backwash home.
   Palette: #6fc4de / #fff4d6 / #123241. */
const GF_CREST = "M0 18c3-1 4.6-9 8-12s6.6 1 9 3.4 5.6 3.6 7 2.2V22H0z";

function TheGreatFloodScene({ role, delayMs }: SceneProps) {
  const crest = (
    <g {...SJ}>
      <path d={GF_CREST} fill="#6fc4de" stroke="#123241" strokeWidth="1" />
      <path d="M2 15.6c3 .6 5-1 6.6-3.4" fill="none" stroke="#fff4d6" strokeWidth="1.5" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-ent-flow" l={2} t={36} w={72} h={48} d={40} par="none">{crest}</V>
      <V c="g43-gf-crest" l={34} t={28} w={64} h={54} d={250} st={{ transformOrigin: "50% 100%" }} par="none">{crest}</V>
      <L c="g43-gf-slap" l={62} t={22} w={22} h={22} d={440} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.75)" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={0} t={30} w={100} h={52} d={0} par="none">{crest}</V>
      <L c="g43-hitwave" l={4} t={70} w={92} h={6} d={140} st={{ borderRadius: "999px", background: "#123241" }} />
      <L c="g43-hit2" l={40} t={38} w={20} h={20} d={260} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.8)" }} />
    </Cut>
  );
  return (
    <Lead
      d={delayMs}
      frame={<><Wash tone="rgba(111,196,222,0.32)" /><Rim tone="rgba(18,50,65,0.4)" /><Tide tone="rgba(111,196,222,0.55)" /></>}
      run={
        <>
          <V c="g43-bore" l={50} t={44} w={7.2} h={8} d={280} par="none" st={{ transformOrigin: "0% 100%" }}>{crest}</V>
          <L c="g43-run" l={50} t={50} w={30} h={1.8} d={140} st={{ background: "linear-gradient(90deg, #fff4d6, rgba(111,196,222,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
        </>
      }
    >
      <L c="g43-lean" l={42} t={54} w={16} h={2.4} d={80} st={{ borderRadius: "999px", background: "rgba(18,50,65,0.6)" }} />
      <V c="g43-gf-crest" l={42} t={42} w={16} h={10} d={300} st={{ transformOrigin: "50% 100%" }} par="none">{crest}</V>
      <L c="g43-gf-back" l={40} t={50} w={20} h={3} d={520} st={{ background: "linear-gradient(270deg, rgba(111,196,222,0.8), transparent)", borderRadius: "999px" }} />
      <L c="g43-gf-slap" l={47} t={45} w={7} h={7} d={620} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.7)" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g43-motes" l={43 + i * 4} t={52} w={1.3} h={1.3} d={720} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 11. High Water Mark (t6) — THE FLOOD BOARD -----------------------------
   The board on the mill wall where every flood is recorded: it is planted, the
   year is stamped on, and a fresh chalk line is scored higher than any line
   already there. Palette: #d8c9a6 / #fff4d6 / #35302a. */
function HighWaterMarkScene({ role, delayMs }: SceneProps) {
  const board = (
    <g {...SJ}>
      <path d="M6 2.4h12v19.2H6z" fill="#d8c9a6" stroke="#35302a" strokeWidth="1.2" />
      <path d="M7.6 16.6h8.8M7.6 13h6.6M7.6 9.4h8" stroke="#35302a" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-hm-board" l={26} t={8} w={48} h={78} d={40}>{board}</V>
      <L c="g43-hm-chalk" l={30} t={40} w={40} h={2.6} d={250} st={{ background: "#fff4d6", transformOrigin: "0% 50%" }} />
      <V c="g43-hm-year" l={36} t={24} w={28} h={20} d={440}>
        <path d="M4 6h16v12H4z" fill="none" stroke="#fff4d6" strokeWidth="1.8" />
      </V>
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={30} t={10} w={40} h={72} d={0}>{board}</V>
      <L c="g43-hitwave" l={16} t={54} w={68} h={3} d={140} st={{ background: "#fff4d6", transformOrigin: "0% 50%" }} />
      <L c="g43-hit2" l={44} t={72} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#d8c9a6" }} />
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(216,201,166,0.26)" /><Tide tone="rgba(53,48,42,0.45)" /></>}>
      <L c="g43-lean" l={44} t={55} w={12} h={2} d={80} st={{ borderRadius: "999px", background: "rgba(53,48,42,0.6)" }} />
      <V c="g43-hm-board" l={45} t={42} w={10} h={16} d={220}>{board}</V>
      <L c="g43-hm-chalk" l={45.6} t={49} w={8.8} h={0.9} d={380} st={{ background: "#fff4d6", transformOrigin: "0% 50%" }} />
      <V c="g43-hm-year" l={46} t={43.4} w={8} h={5} d={520}>
        <path d="M3 7h18v10H3z" fill="none" stroke="#fff4d6" strokeWidth="2" />
      </V>
      <L c="g43-drift" l={41} t={51} w={18} h={4} d={600} st={{ background: "linear-gradient(180deg, rgba(216,201,166,0.7), transparent)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={45 + i * 4} t={53} w={1.2} h={1.2} d={700} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 12. Tar Flood (t6) — THE TAR KETTLE ------------------------------------
   The caulkers' kettle is tipped off its fire: a fat bubble swells and bursts
   on the surface, and a black tongue of pitch creeps out over the boards far
   slower than water ever would. Palette: #d8963f / #fff4d6 / #14100c. */
function TarFloodScene({ role, delayMs }: SceneProps) {
  const kettle = (
    <g {...SJ}>
      <path d="M4 8h16l-2 10.4a3.4 3.4 0 0 1-3.4 2.6h-5.2A3.4 3.4 0 0 1 6 18.4z" fill="#14100c" stroke="#d8963f" strokeWidth="1.3" />
      <path d="M4 8c2.6-2 13.4-2 16 0" fill="none" stroke="#fff4d6" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-tf-kettle" l={16} t={12} w={54} h={54} d={40} st={{ transformOrigin: "80% 90%" }}>{kettle}</V>
      <L c="g43-tf-creep" l={10} t={64} w={80} h={18} d={250} st={{ background: "linear-gradient(90deg, #14100c, rgba(20,16,12,0.35))", transformOrigin: "0% 50%" }} />
      <L c="g43-tf-bubble" l={44} t={62} w={14} h={14} d={440} st={{ borderRadius: "50%", background: "#d8963f" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <L c="g43-hitwave" l={6} t={54} w={88} h={26} d={0} st={{ background: "#14100c", transformOrigin: "0% 50%" }} />
      <V c="g43-hitside" l={22} t={10} w={52} h={50} d={140}>{kettle}</V>
      <L c="g43-hit2" l={44} t={56} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#d8963f" }} />
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(216,150,63,0.24)" /><Rim tone="rgba(20,16,12,0.45)" /></>}>
      <L c="g43-lean" l={42} t={53} w={16} h={2.4} d={80} st={{ borderRadius: "999px", background: "rgba(20,16,12,0.7)" }} />
      <V c="g43-tf-kettle" l={41} t={41} w={11} h={12} d={230} st={{ transformOrigin: "80% 88%" }}>{kettle}</V>
      <L c="g43-tf-creep" l={45} t={50} w={16} h={4.4} d={380} st={{ background: "linear-gradient(90deg, #14100c, rgba(20,16,12,0.3))", transformOrigin: "0% 50%" }} />
      <L c="g43-tf-bubble" l={49} t={50} w={5} h={5} d={520} st={{ borderRadius: "50%", background: "#d8963f" }} />
      <L c="g43-tf-bubble" l={53} t={51} w={3.4} h={3.4} d={620} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-drip" l={46 + i * 5} t={53} w={1.3} h={3.4} d={700} st={{ borderRadius: "999px", background: "#14100c" }} />
      ))}
    </Lead>
  );
}

/* --- 13. Flooded Flanks (t7) — THE MARSH CREEKS -----------------------------
   Both edges of the board are saltmarsh: the winding creeks fill from the
   bottom up, the samphire sways as the water reaches it, and the brim slides
   over the last dry lip. Palette: #86c8a0 / #fff4d6 / #1d3a34. */
const FF_CREEK = "M4 22c1-5 5-6 6-9.6S7.6 6.4 9 2";

function FloodedFlanksScene({ role, delayMs }: SceneProps) {
  const creek = <path d={FF_CREEK} fill="none" stroke="#1d3a34" strokeWidth="4" {...SJ} />;
  const samphire = (
    <g fill="none" stroke="#86c8a0" strokeWidth="1.6" {...SJ}>
      <path d="M12 22V9M12 15l-3.4-3M12 12.6l3.4-3.2M12 18l-3-2.6" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-ff-creek" l={12} t={10} w={36} h={80} d={40} st={{ transformOrigin: "50% 100%" }}>{creek}</V>
      <V c="g43-ff-samphire" l={54} t={30} w={34} h={56} d={250} st={{ transformOrigin: "50% 100%" }}>{samphire}</V>
      <L c="g43-ff-brim" l={8} t={72} w={84} h={5} d={440} st={{ borderRadius: "999px", background: "#86c8a0" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={26} t={8} w={48} h={78} d={0} st={{ transformOrigin: "50% 100%" }}>{creek}</V>
      <L c="g43-hitwave" l={8} t={64} w={84} h={6} d={140} st={{ borderRadius: "999px", background: "#86c8a0" }} />
      <V c="g43-hit2" l={56} t={40} w={30} h={44} d={260}>{samphire}</V>
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(134,200,160,0.24)" /><Rim tone="rgba(29,58,52,0.4)" /><Tide tone="rgba(134,200,160,0.5)" /></>}>
      <L c="g43-lean" l={42} t={54} w={16} h={2} d={80} st={{ borderRadius: "999px", background: "rgba(29,58,52,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <V key={i} c="g43-ff-creek" l={41 + i * 6} t={42} w={7} h={13} d={230 + i * 110} st={{ transformOrigin: "50% 100%" }}>{creek}</V>
      ))}
      <V c="g43-ff-samphire" l={47} t={45} w={6} h={9} d={480} st={{ transformOrigin: "50% 100%" }}>{samphire}</V>
      <L c="g43-ff-brim" l={42} t={52.4} w={17} h={1.6} d={580} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <L c="g43-foam" l={45} t={51} w={10} h={4} d={640} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.45)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={44 + i * 5} t={53} w={1.2} h={1.2} d={710} st={{ borderRadius: "50%", background: "#86c8a0" }} />
      ))}
    </Lead>
  );
}

/* --- 14. Treacle Tide (t7) — THE LADLE --------------------------------------
   Everything here is slow on purpose: the ladle comes up out of the vat, a
   rope of treacle stretches and thins behind it without ever breaking, and the
   pool below spreads at its own pace. Palette: #c98b30 / #fff4d6 / #2a1608. */
function TreacleTideScene({ role, delayMs }: SceneProps) {
  const ladle = (
    <g {...SJ}>
      <path d="M12 2.4v9.2" stroke="#2a1608" strokeWidth="1.8" />
      <path d="M5.6 11.6h12.8l-2 6.4a4.6 4.6 0 0 1-8.8 0z" fill="#c98b30" stroke="#2a1608" strokeWidth="1.3" />
      <path d="M7.4 13.4h9.2" stroke="#fff4d6" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-tt-ladle" l={26} t={4} w={48} h={62} d={40}>{ladle}</V>
      <L c="g43-tt-rope" l={47} t={54} w={6} h={30} d={250} st={{ background: "linear-gradient(180deg, #c98b30, rgba(201,139,48,0.4))", transformOrigin: "50% 0%" }} />
      <L c="g43-tt-pool" l={26} t={78} w={48} h={12} d={440} st={{ borderRadius: "50%", background: "#2a1608" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={28} t={6} w={44} h={58} d={0}>{ladle}</V>
      <L c="g43-hitwave" l={46} t={52} w={8} h={26} d={140} st={{ background: "#c98b30", transformOrigin: "50% 0%" }} />
      <L c="g43-hit2" l={32} t={74} w={36} h={10} d={260} st={{ borderRadius: "50%", background: "#2a1608" }} />
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(201,139,48,0.26)" /><Rim tone="rgba(42,22,8,0.42)" /></>}>
      <L c="g43-lean" l={43} t={55} w={14} h={2.2} d={80} st={{ borderRadius: "999px", background: "rgba(42,22,8,0.6)" }} />
      <V c="g43-tt-ladle" l={45} t={38} w={10} h={13} d={240}>{ladle}</V>
      <L c="g43-tt-rope" l={49.2} t={48} w={1.8} h={7} d={380} st={{ background: "linear-gradient(180deg, #c98b30, rgba(201,139,48,0.35))", transformOrigin: "50% 0%" }} />
      <L c="g43-tt-pool" l={44} t={52} w={12} h={4} d={520} st={{ borderRadius: "50%", background: "#2a1608" }} />
      <L c="g43-drift" l={41} t={51} w={18} h={4} d={620} st={{ background: "linear-gradient(180deg, rgba(201,139,48,0.6), transparent)" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g43-drip" l={48 + i * 4} t={51} w={1.4} h={3.6} d={700} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 15. Tide of Pawns (t8) — THE STRANDLINE --------------------------------
   Each pawn is a reach of the flood tide: a wash runs up the shingle, lays a
   line of wrack a little higher than the last one, drags back, and leaves a
   shell behind on the new mark. Palette: #c8b48a / #fff4d6 / #2c3a3f. */
const TP_WRACK = "M1 12c3.4-2 5-2 7.4 0s5 2 7.4 0 4-1.4 7.2 0";

function TideOfPawnsScene({ role, delayMs }: SceneProps) {
  const wrack = <path d={TP_WRACK} fill="none" stroke="#c8b48a" strokeWidth="3" {...SJ} />;
  const shell = (
    <g {...SJ}>
      <path d="M12 20C6.4 18 4 13.4 5.2 8.4 6.4 3.6 17.6 3.6 18.8 8.4 20 13.4 17.6 18 12 20z" fill="#fff4d6" stroke="#2c3a3f" strokeWidth="1.1" />
      <path d="M12 19V7M8.4 18.2l1.4-11M15.6 18.2l-1.4-11" stroke="#2c3a3f" strokeWidth="0.8" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-tp-wrack" l={4} t={44} w={92} h={22} d={40} st={{ transformOrigin: "0% 50%" }}>{wrack}</V>
      <L c="g43-tp-reach" l={6} t={58} w={88} h={20} d={250} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.75), transparent)", transformOrigin: "50% 100%" }} />
      <V c="g43-tp-shell" l={42} t={30} w={22} h={22} d={440}>{shell}</V>
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <L c="g43-hitwave" l={4} t={56} w={92} h={16} d={0} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.8), transparent)", transformOrigin: "50% 100%" }} />
      <V c="g43-hitside" l={6} t={40} w={88} h={22} d={140} st={{ transformOrigin: "0% 50%" }}>{wrack}</V>
      <V c="g43-hit2" l={40} t={22} w={20} h={20} d={260}>{shell}</V>
    </Cut>
  );
  return (
    <Lead
      d={delayMs}
      frame={<><Wash tone="rgba(200,180,138,0.26)" /><Rim tone="rgba(44,58,63,0.36)" /><Tide tone="rgba(255,244,214,0.42)" /></>}
      run={<L c="g43-run" l={50} t={49} w={30} h={2.2} d={160} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.85), transparent)", transformOrigin: "0% 50%", borderRadius: "999px" }} />}
    >
      <L c="g43-lean" l={42} t={55} w={16} h={2} d={80} st={{ borderRadius: "999px", background: "rgba(44,58,63,0.5)" }} />
      {[0, 1, 2, 3].map((i) => (
        <V key={i} c="g43-tp-wrack" l={40} t={51 - i * 2} w={20} h={3} d={240 + i * 100} st={{ transformOrigin: "0% 50%" }}>{wrack}</V>
      ))}
      <L c="g43-tp-reach" l={40} t={48} w={20} h={7} d={560} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.6), transparent)", transformOrigin: "50% 100%" }} />
      <V c="g43-tp-shell" l={48} t={45} w={5} h={5} d={660}>{shell}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={44 + i * 5} t={52} w={1.2} h={1.2} d={720} st={{ borderRadius: "50%", background: "#c8b48a" }} />
      ))}
    </Lead>
  );
}

/* --- 16. One Thousand Ducks (t8) — THE FLOTILLA -----------------------------
   The container went over the side years ago and the flotilla is still coming
   in: ducks bob up one after another, bills tilting, and one squeaks a ring
   out across the water. Palette: #f2c53d / #fff4d6 / #1d3a4a. */
const TD_BODY = "M9 21c-3.6 0-6-2.2-6-5.2 0-3.6 3-6 7-6.4 1-2.4 2.6-3.6 5-3.6 3 0 4.6 2 4.6 4.6 0 5.4-4.6 10.6-10.6 10.6z";

function ThousandDucksScene({ role, delayMs }: SceneProps) {
  const duck = (
    <g {...SJ}>
      <path d={TD_BODY} fill="#f2c53d" stroke="#1d3a4a" strokeWidth="1.1" />
      <path d="M19.6 9.6h3.4l-1.6 2.6h-2.6z" fill="#fff4d6" stroke="#1d3a4a" strokeWidth="0.9" />
      <circle cx="17.6" cy="8.6" r="1" fill="#1d3a4a" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-td-duck" l={8} t={26} w={52} h={52} d={40}>{duck}</V>
      <V c="g43-td-bill" l={50} t={40} w={40} h={40} d={250}>{duck}</V>
      <L c="g43-td-squeak" l={30} t={62} w={40} h={20} d={440} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={16} t={14} w={68} h={64} d={0}>{duck}</V>
      <L c="g43-hitwave" l={8} t={72} w={84} h={5} d={140} st={{ borderRadius: "999px", background: "#1d3a4a" }} />
      <L c="g43-hit2" l={34} t={58} w={32} h={16} d={260} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
    </Cut>
  );
  return (
    <Lead
      d={delayMs}
      frame={<><Wash tone="rgba(242,197,61,0.24)" /><Rim tone="rgba(29,58,74,0.4)" /><Tide tone="rgba(29,58,74,0.5)" /></>}
      run={<L c="g43-carry" l={49} t={47} w={7} h={7} d={420} st={{ borderRadius: "50%", background: "radial-gradient(circle, #f2c53d, transparent 70%)" }} />}
    >
      <L c="g43-lean" l={41} t={54} w={18} h={2.2} d={80} st={{ borderRadius: "999px", background: "rgba(29,58,74,0.55)" }} />
      {[0, 1, 2, 3].map((i) => (
        <V key={i} c="g43-td-duck" l={41 + i * 5.4} t={44 + (i % 2) * 3.4} w={7} h={7} d={230 + i * 90}>{duck}</V>
      ))}
      <V c="g43-td-bill" l={52} t={45} w={6} h={6} d={560}>{duck}</V>
      <L c="g43-td-squeak" l={45} t={47} w={11} h={11} d={640} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={44 + i * 5} t={52} w={1.3} h={1.3} d={710} st={{ borderRadius: "50%", background: "#f2c53d" }} />
      ))}
    </Lead>
  );
}

/* --- 17. Walking Pace, Please (t1) — THE PUNT POLE --------------------------
   No charging up the river: the pole goes down into the bed, the boat checks
   against it and settles, and one lazy eddy turns off the shaft.
   Palette: #cbb185 / #fff4d6 / #1f3b46. */
function WalkingPaceScene({ role, delayMs }: SceneProps) {
  const pole = (
    <g {...SJ}>
      <path d="M13.6 2L9 22" stroke="#cbb185" strokeWidth="2.6" />
      <path d="M7 20.4h4.4" stroke="#1f3b46" strokeWidth="2.2" />
    </g>
  );
  const punt = <path d="M2 13.6h20l-2.4 5.6H4.4z" fill="#1f3b46" stroke="#fff4d6" strokeWidth="1" {...SJ} />;
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-wp-pole" l={24} t={4} w={52} h={76} d={40} st={{ transformOrigin: "40% 96%" }}>{pole}</V>
      <V c="g43-wp-check" l={10} t={54} w={80} h={34} d={250}>{punt}</V>
      <L c="g43-wp-eddy" l={38} t={72} w={24} h={12} d={440} st={{ borderRadius: "50%", border: "2px solid #cbb185" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={26} t={6} w={48} h={72} d={0} st={{ transformOrigin: "40% 96%" }}>{pole}</V>
      <L c="g43-hitwave" l={10} t={66} w={80} h={5} d={140} st={{ borderRadius: "999px", background: "#1f3b46" }} />
      <L c="g43-hit2" l={38} t={58} w={24} h={12} d={260} st={{ borderRadius: "50%", border: "2px solid #cbb185" }} />
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(203,177,133,0.24)" /><Tide tone="rgba(31,59,70,0.5)" /></>}>
      <L c="g43-lean" l={43} t={54} w={14} h={2} d={80} st={{ borderRadius: "999px", background: "rgba(31,59,70,0.6)" }} />
      <V c="g43-wp-pole" l={45} t={38} w={9} h={17} d={230} st={{ transformOrigin: "40% 94%" }}>{pole}</V>
      <V c="g43-wp-check" l={40} t={48} w={17} h={6} d={370}>{punt}</V>
      <L c="g43-wp-eddy" l={46} t={51} w={8} h={4} d={520} st={{ borderRadius: "50%", border: "2px solid #cbb185" }} />
      <L c="g43-foam" l={45} t={52} w={9} h={3.4} d={620} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.5)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={45 + i * 4} t={53} w={1.2} h={1.2} d={700} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 18. No Easy Pickings (t4) — THE CREEL ----------------------------------
   A withy lobster pot on the bottom. The escape hoop is legal size, so the
   small undefended ones simply swim out again and only what is properly held
   stays inside. Palette: #c9a86a / #fff4d6 / #223a3f. */
function NoEasyPickingsScene({ role, delayMs }: SceneProps) {
  const creel = (
    <g {...SJ}>
      <path d="M3 20V13c0-4.4 4-7.4 9-7.4s9 3 9 7.4v7z" fill="none" stroke="#c9a86a" strokeWidth="1.6" />
      <path d="M3 15.4h18M7.6 6.6V20M16.4 6.6V20" stroke="#c9a86a" strokeWidth="1.1" />
      <path d="M2 20h20" stroke="#223a3f" strokeWidth="2" />
    </g>
  );
  const fish = <path d="M3 12c3.6-4 9.4-4 13 0-3.6 4-9.4 4-13 0zM16 12l5-3.4v6.8z" fill="#fff4d6" {...SJ} />;
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-np-creel" l={14} t={22} w={72} h={62} d={40}>{creel}</V>
      <V c="g43-np-hoop" l={38} t={44} w={26} h={26} d={250}>
        <circle cx="12" cy="12" r="8.4" fill="none" stroke="#fff4d6" strokeWidth="2.2" />
      </V>
      <V c="g43-np-slip" l={54} t={40} w={30} h={20} d={440}>{fish}</V>
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={16} t={20} w={68} h={60} d={0}>{creel}</V>
      <V c="g43-hit2" l={40} t={42} w={22} h={22} d={140}>
        <circle cx="12" cy="12" r="8" fill="none" stroke="#fff4d6" strokeWidth="2.4" />
      </V>
      <L c="g43-hitwave" l={12} t={78} w={76} h={4} d={260} st={{ borderRadius: "999px", background: "#c9a86a" }} />
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(201,168,106,0.24)" /><Rim tone="rgba(34,58,63,0.4)" /></>}>
      <L c="g43-lean" l={43} t={55} w={14} h={2.2} d={80} st={{ borderRadius: "999px", background: "rgba(34,58,63,0.6)" }} />
      <V c="g43-np-creel" l={43} t={43} w={14} h={12} d={230}>{creel}</V>
      <V c="g43-np-hoop" l={47.4} t={47} w={5.2} h={5.2} d={380}>
        <circle cx="12" cy="12" r="8.4" fill="none" stroke="#fff4d6" strokeWidth="2.4" />
      </V>
      <V c="g43-np-slip" l={51} t={46} w={5} h={3.4} d={500}>{fish}</V>
      <V c="g43-np-slip" l={50} t={49} w={4} h={2.8} d={600}>{fish}</V>
      <L c="g43-foam" l={45} t={52} w={10} h={4} d={660} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.42)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={44 + i * 5} t={53} w={1.2} h={1.2} d={720} st={{ borderRadius: "50%", background: "#c9a86a" }} />
      ))}
    </Lead>
  );
}

/* --- 19. Fisherman King (t6) — THE CORACLE ----------------------------------
   The king does not march, he slips: a one-man coracle rocks off the bank, a
   single paddle stroke sculls it sideways across the current, and it is gone
   before the wake closes. Palette: #b9895a / #fff4d6 / #1b3340. */
function FishermanKingScene({ role, delayMs }: SceneProps) {
  const coracle = (
    <g {...SJ}>
      <path d="M2.6 11.4h18.8c0 5.6-4.2 9-9.4 9s-9.4-3.4-9.4-9z" fill="#b9895a" stroke="#1b3340" strokeWidth="1.3" />
      <path d="M2.6 11.4h18.8" stroke="#fff4d6" strokeWidth="1.4" />
      <path d="M11.2 3.4h1.6v1.4h1.4v1.6h-1.4v4.8h-1.6V6.4H9.8V4.8h1.4z" fill="#fff4d6" />
    </g>
  );
  const paddle = (
    <g {...SJ}>
      <path d="M12 3v11" stroke="#b9895a" strokeWidth="2" />
      <path d="M9 14h6l-1.4 6.6h-3.2z" fill="#fff4d6" stroke="#1b3340" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-fk-hull" l={16} t={30} w={62} h={54} d={40}>{coracle}</V>
      <V c="g43-fk-paddle" l={56} t={16} w={34} h={62} d={250} st={{ transformOrigin: "50% 20%" }}>{paddle}</V>
      <L c="g43-fk-wake" l={6} t={78} w={62} h={4} d={440} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "100% 50%" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={18} t={26} w={64} h={52} d={0}>{coracle}</V>
      <V c="g43-hit2" l={58} t={12} w={30} h={56} d={140} st={{ transformOrigin: "50% 20%" }}>{paddle}</V>
      <L c="g43-hitwave" l={10} t={76} w={80} h={4} d={260} st={{ borderRadius: "999px", background: "#1b3340" }} />
    </Cut>
  );
  return (
    <Lead
      d={delayMs}
      frame={<><Wash tone="rgba(185,137,90,0.24)" /><Tide tone="rgba(27,51,64,0.5)" /></>}
      run={<L c="g43-carry" l={49} t={47.4} w={6} h={6} d={400} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.8), transparent 70%)" }} />}
    >
      <L c="g43-lean" l={43} t={54} w={14} h={2.2} d={80} st={{ borderRadius: "999px", background: "rgba(27,51,64,0.55)" }} />
      <V c="g43-fk-hull" l={43} t={44} w={12} h={11} d={240}>{coracle}</V>
      <V c="g43-fk-paddle" l={51} t={41} w={7} h={13} d={360} st={{ transformOrigin: "50% 18%" }}>{paddle}</V>
      <L c="g43-fk-wake" l={38} t={51} w={12} h={1.6} d={520} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "100% 50%" }} />
      <L c="g43-foam" l={45} t={52} w={9} h={3.6} d={620} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.5)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={44 + i * 5} t={53} w={1.2} h={1.2} d={700} st={{ borderRadius: "50%", background: "#b9895a" }} />
      ))}
    </Lead>
  );
}

/* --- 20. Checkers Law (t6) — THE GAFF ---------------------------------------
   If it is there to be taken, it gets taken: the gaff is held back a moment,
   comes down the line in one committed swing, the hook bites, and the splash
   goes up after it. Palette: #cfd8de / #fff4d6 / #22303a. */
function CheckersLawScene({ role, delayMs }: SceneProps) {
  const gaff = (
    <g {...SJ}>
      <path d="M4 3.6L14 15" stroke="#22303a" strokeWidth="2.4" />
      <path d="M14 15c2.6 1.6 5 1 5.6-1.6" fill="none" stroke="#cfd8de" strokeWidth="2.6" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-cl-gaff" l={10} t={6} w={72} h={72} d={40} st={{ transformOrigin: "14% 12%" }}>{gaff}</V>
      <V c="g43-cl-hook" l={52} t={46} w={34} h={34} d={250}>
        <path d="M6 6c4 4 9 5 12 1" fill="none" stroke="#cfd8de" strokeWidth="3" {...SJ} />
      </V>
      <L c="g43-cl-splash" l={44} t={62} w={18} h={18} d={440} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.8)" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={10} t={8} w={72} h={68} d={0} st={{ transformOrigin: "14% 12%" }}>{gaff}</V>
      <L c="g43-hit2" l={40} t={58} w={20} h={20} d={140} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.8)" }} />
      <L c="g43-hitwave" l={10} t={80} w={80} h={4} d={260} st={{ borderRadius: "999px", background: "#22303a" }} />
    </Cut>
  );
  return (
    <Lead
      d={delayMs}
      frame={<><Wash tone="rgba(207,216,222,0.24)" /><Rim tone="rgba(34,48,58,0.4)" /></>}
      run={<L c="g43-run" l={50} t={49} w={30} h={1.6} d={140} st={{ background: "linear-gradient(90deg, #cfd8de, rgba(207,216,222,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />}
    >
      <L c="g43-lean" l={43} t={55} w={14} h={2} d={80} st={{ borderRadius: "999px", background: "rgba(34,48,58,0.55)" }} />
      <V c="g43-cl-gaff" l={40} t={38} w={16} h={16} d={280} st={{ transformOrigin: "14% 12%" }}>{gaff}</V>
      <V c="g43-cl-hook" l={49} t={46} w={7} h={7} d={430}>
        <path d="M6 6c4 4 9 5 12 1" fill="none" stroke="#cfd8de" strokeWidth="3.2" {...SJ} />
      </V>
      <L c="g43-cl-splash" l={47} t={48} w={7} h={7} d={560} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.78)" }} />
      <L c="g43-foam" l={45} t={51} w={10} h={4} d={640} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.4)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={45 + i * 4} t={52} w={1.2} h={1.2} d={710} st={{ borderRadius: "50%", background: "#cfd8de" }} />
      ))}
    </Lead>
  );
}

/* --- 21. Dockmaster's Fee (t6) — THE TALLY BOARD ----------------------------
   Nothing leaves the quay untaxed: the dues board swings out on its hook, a
   brass token spins down onto it, and a fresh notch is cut in the tally beside
   your name. Palette: #e0b64a / #fff4d6 / #2b2418. */
function DockmastersFeeScene({ role, delayMs }: SceneProps) {
  const board = (
    <g {...SJ}>
      <path d="M4 5h16v14H4z" fill="#2b2418" stroke="#e0b64a" strokeWidth="1.3" />
      <path d="M6.6 9h6M6.6 12.4h9M6.6 15.8h4.4" stroke="#fff4d6" strokeWidth="1.1" />
    </g>
  );
  const token = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="8" fill="#e0b64a" stroke="#2b2418" strokeWidth="1.3" />
      <path d="M8.6 12h6.8M12 8.6v6.8" stroke="#2b2418" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-df-board" l={12} t={16} w={58} h={64} d={40} st={{ transformOrigin: "50% 6%" }}>{board}</V>
      <V c="g43-df-token" l={54} t={20} w={32} h={32} d={250}>{token}</V>
      <L c="g43-df-notch" l={20} t={66} w={44} h={3} d={440} st={{ background: "#fff4d6", transformOrigin: "0% 50%" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={20} t={14} w={60} h={62} d={0} st={{ transformOrigin: "50% 6%" }}>{board}</V>
      <V c="g43-hit2" l={54} t={44} w={28} h={28} d={140}>{token}</V>
      <L c="g43-hitwave" l={22} t={78} w={56} h={3} d={260} st={{ background: "#fff4d6", transformOrigin: "0% 50%" }} />
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(224,182,74,0.24)" /><Rim tone="rgba(43,36,24,0.42)" /></>}>
      <L c="g43-lean" l={43} t={55} w={14} h={2} d={80} st={{ borderRadius: "999px", background: "rgba(43,36,24,0.6)" }} />
      <V c="g43-df-board" l={43} t={42} w={12} h={13} d={230} st={{ transformOrigin: "50% 5%" }}>{board}</V>
      <V c="g43-df-token" l={49} t={44} w={6} h={6} d={380}>{token}</V>
      <L c="g43-df-notch" l={44.4} t={50.4} w={9} h={0.9} d={520} st={{ background: "#fff4d6", transformOrigin: "0% 50%" }} />
      <L c="g43-drift" l={41} t={52} w={18} h={4} d={620} st={{ background: "linear-gradient(180deg, rgba(224,182,74,0.55), transparent)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={45 + i * 4} t={53} w={1.2} h={1.2} d={700} st={{ borderRadius: "50%", background: "#e0b64a" }} />
      ))}
    </Lead>
  );
}

/* --- 22. The Old Laws (t6) — THE STANDARD MEASURE ---------------------------
   The sealed gallon kept at the quay, the one every other measure is checked
   against: it is set down, the strickle sweeps the top dead level, and the old
   seal is stamped on the rim. Palette: #b8b0a0 / #fff4d6 / #2a2c2e. */
function TheOldLawsScene({ role, delayMs }: SceneProps) {
  const measure = (
    <g {...SJ}>
      <path d="M5 6.6h14l-1.6 13.8H6.6z" fill="#b8b0a0" stroke="#2a2c2e" strokeWidth="1.3" />
      <path d="M4 6.6h16" stroke="#fff4d6" strokeWidth="1.6" />
      <path d="M7.6 10.6h8.8M8 14.4h8" stroke="#2a2c2e" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-ol-measure" l={22} t={20} w={56} h={64} d={40}>{measure}</V>
      <L c="g43-ol-strike" l={10} t={34} w={54} h={4} d={250} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <V c="g43-ol-seal" l={54} t={54} w={30} h={30} d={440}>
        <circle cx="12" cy="12" r="8" fill="none" stroke="#b8b0a0" strokeWidth="2.6" />
      </V>
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={26} t={16} w={48} h={62} d={0}>{measure}</V>
      <L c="g43-hitwave" l={12} t={32} w={76} h={4} d={140} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <V c="g43-hit2" l={38} t={54} w={24} h={24} d={260}>
        <circle cx="12" cy="12" r="8" fill="none" stroke="#b8b0a0" strokeWidth="2.8" />
      </V>
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(184,176,160,0.24)" /><Rim tone="rgba(42,44,46,0.42)" /></>}>
      <L c="g43-lean" l={43} t={55} w={14} h={2} d={80} st={{ borderRadius: "999px", background: "rgba(42,44,46,0.6)" }} />
      <V c="g43-ol-measure" l={44} t={43} w={12} h={13} d={230}>{measure}</V>
      <L c="g43-ol-strike" l={41} t={44.4} w={13} h={1.2} d={380} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <V c="g43-ol-seal" l={47} t={46} w={6} h={6} d={520}>
        <circle cx="12" cy="12" r="8" fill="none" stroke="#b8b0a0" strokeWidth="2.8" />
      </V>
      <L c="g43-drift" l={41} t={52} w={18} h={4} d={620} st={{ background: "linear-gradient(180deg, rgba(184,176,160,0.5), transparent)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={45 + i * 4} t={53} w={1.2} h={1.2} d={700} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 23. Command Paralysis (t7) — BECALMED ----------------------------------
   Orders stop arriving because nothing is moving: the sail loses its belly and
   hangs, the burgee at the masthead drops dead, and the water goes to glass.
   Palette: #e6ddc6 / #fff4d6 / #26333c. */
function CommandParalysisScene({ role, delayMs }: SceneProps) {
  const sail = (
    <g {...SJ}>
      <path d="M11.6 2v20" stroke="#26333c" strokeWidth="1.8" />
      <path d="M11.6 3.4C17 7 19.6 12.6 19 19.4H11.6z" fill="#e6ddc6" stroke="#26333c" strokeWidth="1.1" />
    </g>
  );
  const burgee = <path d="M4 3.4L20 6.6 4 10z" fill="#fff4d6" stroke="#26333c" strokeWidth="1" {...SJ} />;
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-cp-sail" l={20} t={10} w={60} h={70} d={40} st={{ transformOrigin: "20% 50%" }}>{sail}</V>
      <V c="g43-cp-burgee" l={40} t={4} w={40} h={20} d={250} st={{ transformOrigin: "8% 50%" }}>{burgee}</V>
      <L c="g43-cp-glass" l={6} t={76} w={88} h={10} d={440} st={{ background: "linear-gradient(180deg, rgba(230,221,198,0.7), transparent)", transformOrigin: "50% 0%" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={24} t={8} w={54} h={70} d={0} st={{ transformOrigin: "20% 50%" }}>{sail}</V>
      <V c="g43-hit2" l={44} t={2} w={36} h={18} d={140} st={{ transformOrigin: "8% 50%" }}>{burgee}</V>
      <L c="g43-hitwave" l={8} t={78} w={84} h={5} d={260} st={{ borderRadius: "999px", background: "#26333c" }} />
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(230,221,198,0.24)" /><Rim tone="rgba(38,51,60,0.42)" /><Tide tone="rgba(38,51,60,0.42)" /></>}>
      <L c="g43-lean" l={43} t={55} w={14} h={2} d={80} st={{ borderRadius: "999px", background: "rgba(38,51,60,0.55)" }} />
      <V c="g43-cp-sail" l={44} t={38} w={13} h={17} d={230} st={{ transformOrigin: "20% 50%" }}>{sail}</V>
      <V c="g43-cp-burgee" l={47} t={37} w={8} h={4} d={380} st={{ transformOrigin: "8% 50%" }}>{burgee}</V>
      <L c="g43-cp-glass" l={38} t={51} w={24} h={4} d={520} st={{ background: "linear-gradient(180deg, rgba(230,221,198,0.6), transparent)", transformOrigin: "50% 0%" }} />
      <L c="g43-drift" l={40} t={52} w={20} h={3} d={620} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.4), transparent)" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g43-motes" l={43 + i * 4} t={53} w={1.1} h={1.1} d={700} st={{ borderRadius: "50%", background: "#e6ddc6" }} />
      ))}
    </Lead>
  );
}

/* --- 24. Haven Law (t8) — THE BREAKWATER ------------------------------------
   Granite blocks are dropped one after another until the arm reaches out past
   your half; the sea bursts white on the outside of it and inside the water
   goes flat. Palette: #9aa8ae / #fff4d6 / #16303c. */
function HavenLawScene({ role, delayMs }: SceneProps) {
  const block = <path d="M2.6 6h18.8v12H2.6z" fill="#9aa8ae" stroke="#16303c" strokeWidth="1.3" {...SJ} />;
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-hl-block" l={8} t={40} w={40} h={30} d={40}>{block}</V>
      <V c="g43-hl-block" l={46} t={46} w={40} h={30} d={250}>{block}</V>
      <L c="g43-hl-burst" l={20} t={12} w={56} h={34} d={440} st={{ background: "radial-gradient(circle at 50% 100%, rgba(255,244,214,0.9), transparent 70%)", transformOrigin: "50% 100%" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={14} t={40} w={72} h={34} d={0}>{block}</V>
      <L c="g43-hit2" l={26} t={12} w={48} h={30} d={140} st={{ background: "radial-gradient(circle at 50% 100%, rgba(255,244,214,0.85), transparent 70%)" }} />
      <L c="g43-hitwave" l={10} t={76} w={80} h={4} d={260} st={{ borderRadius: "999px", background: "#16303c" }} />
    </Cut>
  );
  return (
    <Lead
      d={delayMs}
      frame={<><Wash tone="rgba(154,168,174,0.26)" /><Rim tone="rgba(22,48,60,0.45)" /><Tide tone="rgba(22,48,60,0.5)" /></>}
      run={<L c="g43-run" l={50} t={48.6} w={30} h={2.6} d={160} st={{ background: "linear-gradient(90deg, #9aa8ae, rgba(154,168,174,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />}
    >
      <L c="g43-lean" l={42} t={54} w={16} h={2.2} d={80} st={{ borderRadius: "999px", background: "rgba(22,48,60,0.6)" }} />
      {[0, 1, 2, 3].map((i) => (
        <V key={i} c="g43-hl-block" l={43 + i * 4.6} t={46} w={5} h={4} d={240 + i * 100}>{block}</V>
      ))}
      <L c="g43-hl-burst" l={45} t={40} w={14} h={7} d={580} st={{ background: "radial-gradient(circle at 50% 100%, rgba(255,244,214,0.85), transparent 70%)", transformOrigin: "50% 100%" }} />
      <L c="g43-hl-calm" l={40} t={51} w={20} h={3.4} d={660} st={{ background: "linear-gradient(180deg, rgba(154,168,174,0.6), transparent)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={45 + i * 4} t={53} w={1.2} h={1.2} d={720} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 25. The King's Champion (t8) — THE FIGUREHEAD --------------------------
   One piece is carved into the ship's figurehead: gilded, lashed under the
   bowsprit, riding the prow through the sea it splits and taking the spray so
   nothing else has to. Palette: #e6c46a / #fff4d6 / #1e2a36. */
function KingsChampionScene({ role, delayMs }: SceneProps) {
  const head = (
    <g {...SJ}>
      <path d="M8 21c-1.4-4.6-1-8.6 1.6-12.4C11.4 6 13.6 4.4 16.6 3.4l1.8 3.2c-2.4 1-3.8 2.4-4.6 4.4 2.4.2 3.8 1.4 4.2 3.6L12 21z" fill="#e6c46a" stroke="#1e2a36" strokeWidth="1.2" />
      <circle cx="14.6" cy="8.2" r="1" fill="#1e2a36" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-kc-head" l={18} t={14} w={60} h={64} d={40}>{head}</V>
      <L c="g43-kc-prow" l={6} t={62} w={70} h={5} d={250} st={{ borderRadius: "999px", background: "#1e2a36", transformOrigin: "100% 50%" }} />
      <V c="g43-kc-spray" l={54} t={38} w={26} h={26} d={440}><path d={DROP} fill="#fff4d6" /></V>
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={20} t={12} w={58} h={62} d={0}>{head}</V>
      <L c="g43-hitwave" l={8} t={72} w={84} h={5} d={140} st={{ borderRadius: "999px", background: "#1e2a36" }} />
      <V c="g43-hit2" l={56} t={40} w={22} h={22} d={260}><path d={DROP} fill="#fff4d6" /></V>
    </Cut>
  );
  return (
    <Lead
      d={delayMs}
      frame={<><Wash tone="rgba(230,196,106,0.26)" /><Rim tone="rgba(255,244,214,0.28)" /><Tide tone="rgba(30,42,54,0.5)" /></>}
      run={<L c="g43-carry" l={49} t={47.4} w={6} h={6} d={460} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(230,196,106,0.9), transparent 70%)" }} />}
    >
      <L c="g43-lean" l={42} t={54} w={16} h={2.2} d={80} st={{ borderRadius: "999px", background: "rgba(30,42,54,0.55)" }} />
      <L c="g43-kc-prow" l={38} t={50} w={16} h={1.8} d={240} st={{ borderRadius: "999px", background: "#1e2a36", transformOrigin: "100% 50%" }} />
      <V c="g43-kc-head" l={45} t={41} w={11} h={12} d={340}>{head}</V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g43-kc-spray" l={51 + i * 2} t={44 + i} w={3.4} h={3.4} d={520 + i * 90}><path d={DROP} fill="#fff4d6" /></V>
      ))}
      <L c="g43-foam" l={45} t={51} w={11} h={4} d={660} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.45)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={44 + i * 5} t={53} w={1.3} h={1.3} d={720} st={{ borderRadius: "50%", background: "#e6c46a" }} />
      ))}
    </Lead>
  );
}

/* --- 26. The King's Own Wings (t8) — THE FLYING FISH ------------------------
   The king leaves the water entirely: a flying fish breaks the surface, throws
   its pectorals out into wings and glides the whole leg, tail ticking the
   crests, before it drops back in. Palette: #9fd2e8 / #fff4d6 / #143240. */
function KingsOwnWingsScene({ role, delayMs }: SceneProps) {
  const fish = (
    <g {...SJ}>
      <path d="M3 12.6c4-4.6 10.4-5.6 15-3.2l4 3.2-4 3.2c-4.6 2.4-11 1.4-15-3.2z" fill="#9fd2e8" stroke="#143240" strokeWidth="1.1" />
      <circle cx="18" cy="11.4" r="0.9" fill="#143240" />
    </g>
  );
  const fin = <path d="M2 4c6 .6 11 3.4 15 8.4-5.6 1.6-10.6-1-15-8.4z" fill="#fff4d6" stroke="#143240" strokeWidth="1" {...SJ} />;
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-kw-leap" l={12} t={30} w={60} h={44} d={40}>{fish}</V>
      <V c="g43-kw-fin" l={30} t={12} w={46} h={34} d={250} st={{ transformOrigin: "10% 90%" }}>{fin}</V>
      <L c="g43-kw-skip" l={16} t={74} w={30} h={8} d={440} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.75)" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={12} t={26} w={68} h={46} d={0}>{fish}</V>
      <V c="g43-hit2" l={30} t={8} w={44} h={34} d={140} st={{ transformOrigin: "10% 90%" }}>{fin}</V>
      <L c="g43-hitwave" l={10} t={74} w={80} h={5} d={260} st={{ borderRadius: "999px", background: "#143240" }} />
    </Cut>
  );
  return (
    <Lead
      d={delayMs}
      frame={<><Wash tone="rgba(159,210,232,0.26)" /><Rim tone="rgba(20,50,64,0.4)" /><Tide tone="rgba(20,50,64,0.5)" /></>}
      run={
        <>
          <V c="g43-kw-leap" l={49} t={44} w={8} h={6} d={280}>{fish}</V>
          <L c="g43-run" l={50} t={49.4} w={30} h={1.4} d={150} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.8), transparent)", transformOrigin: "0% 50%", borderRadius: "999px" }} />
        </>
      }
    >
      <L c="g43-lean" l={43} t={54} w={14} h={2} d={80} st={{ borderRadius: "999px", background: "rgba(20,50,64,0.55)" }} />
      <V c="g43-kw-fin" l={46} t={40} w={9} h={7} d={380} st={{ transformOrigin: "10% 90%" }}>{fin}</V>
      <L c="g43-kw-skip" l={44} t={50} w={7} h={2.4} d={520} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.7)" }} />
      <L c="g43-kw-skip" l={51} t={50.4} w={5} h={2} d={600} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.6)" }} />
      <L c="g43-foam" l={45} t={51.4} w={10} h={3.6} d={660} st={{ borderRadius: "50%", background: "rgba(159,210,232,0.55)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={44 + i * 5} t={53} w={1.2} h={1.2} d={720} st={{ borderRadius: "50%", background: "#9fd2e8" }} />
      ))}
    </Lead>
  );
}

/* --- 27. Burden of Command (t8) — THE ANCHOR --------------------------------
   The weight of the thing: the anchor is let go, the chain roars out of the
   locker after it, the fluke bites the bottom and everything above stops dead
   in a cloud of silt. Palette: #98a6b2 / #fff4d6 / #12232e. */
const BC_ANCHOR = "M12 3.2a2.2 2.2 0 0 1 1 4.1V10h3v2h-3v6.4c2.6-.5 4.4-2.3 4.8-5.2l2.2.5C19.4 18 16.2 21 12 21s-7.4-3-8-7.3l2.2-.5c.4 2.9 2.2 4.7 4.8 5.2V12H8v-2h3V7.3a2.2 2.2 0 0 1 1-4.1z";

function BurdenOfCommandScene({ role, delayMs }: SceneProps) {
  const anchor = <path d={BC_ANCHOR} fill="#98a6b2" stroke="#12232e" strokeWidth="1" {...SJ} />;
  const chain = (
    <g fill="none" stroke="#98a6b2" strokeWidth="2.6" {...SJ}>
      <path d="M12 1v5M12 8v5M12 15v5" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <L c="g43-bc-chain" l={44} t={0} w={12} h={44} d={40} st={{ background: "repeating-linear-gradient(180deg, #98a6b2 0 5px, transparent 5px 9px)", transformOrigin: "50% 0%" }} />
      <V c="g43-bc-anchor" l={22} t={26} w={56} h={62} d={250}>{anchor}</V>
      <L c="g43-bc-bite" l={28} t={70} w={44} h={16} d={440} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.6)" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={24} t={12} w={52} h={64} d={0}>{anchor}</V>
      <V c="g43-hitwave" l={44} t={0} w={12} h={40} d={140} st={{ transformOrigin: "50% 0%" }}>{chain}</V>
      <L c="g43-hit2" l={32} t={70} w={36} h={14} d={260} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.6)" }} />
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(152,166,178,0.26)" /><Rim tone="rgba(18,35,46,0.45)" /><Tide tone="rgba(18,35,46,0.5)" /></>}>
      <L c="g43-lean" l={43} t={55} w={14} h={2.2} d={80} st={{ borderRadius: "999px", background: "rgba(18,35,46,0.65)" }} />
      <L c="g43-bc-chain" l={48.6} t={34} w={2.8} h={14} d={220} st={{ background: "repeating-linear-gradient(180deg, #98a6b2 0 4px, transparent 4px 7px)", transformOrigin: "50% 0%" }} />
      <V c="g43-bc-anchor" l={45} t={42} w={11} h={12} d={360}>{anchor}</V>
      <L c="g43-bc-bite" l={44} t={51} w={13} h={5} d={520} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.5)" }} />
      <L c="g43-drift" l={41} t={52} w={18} h={4} d={620} st={{ background: "linear-gradient(180deg, rgba(152,166,178,0.55), transparent)" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g43-motes" l={43 + i * 4} t={54} w={1.3} h={1.3} d={710} st={{ borderRadius: "50%", background: "#98a6b2" }} />
      ))}
    </Lead>
  );
}

/* --- 28. Harbor Horn (t1) — THE FOGHORN -------------------------------------
   The horn on the pierhead is swung up and let go: one flat blast rolls out
   over the water and shoulders the fog apart ahead of it.
   Palette: #d9a441 / #fff4d6 / #1d3040. */
function HarborHornScene({ role, delayMs }: SceneProps) {
  const horn = (
    <g {...SJ}>
      <path d="M3 9.6h6l11-5.4v15.6L9 14.4H3z" fill="#d9a441" stroke="#1d3040" strokeWidth="1.3" />
      <path d="M9 9.6v4.8" stroke="#fff4d6" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-hh-horn" l={6} t={26} w={62} h={48} d={40} st={{ transformOrigin: "12% 50%" }}>{horn}</V>
      <L c="g43-hh-blast" l={60} t={38} w={34} h={24} d={250} st={{ borderRadius: "50%", background: "radial-gradient(circle at 0% 50%, rgba(255,244,214,0.9), transparent 70%)", transformOrigin: "0% 50%" }} />
      <L c="g43-hh-fog" l={40} t={12} w={58} h={16} d={440} st={{ background: "linear-gradient(90deg, transparent, rgba(29,48,64,0.7))" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={8} t={24} w={62} h={50} d={0} st={{ transformOrigin: "12% 50%" }}>{horn}</V>
      <L c="g43-hitwave" l={56} t={36} w={40} h={24} d={140} st={{ borderRadius: "50%", background: "radial-gradient(circle at 0% 50%, rgba(255,244,214,0.85), transparent 70%)", transformOrigin: "0% 50%" }} />
      <L c="g43-hit2" l={40} t={72} w={20} h={8} d={260} st={{ borderRadius: "999px", background: "#d9a441" }} />
    </Cut>
  );
  return (
    <Lead
      d={delayMs}
      frame={<><Wash tone="rgba(217,164,65,0.24)" /><Rim tone="rgba(29,48,64,0.42)" /></>}
      run={<L c="g43-hh-blast" l={50} t={45} w={16} h={9} d={380} st={{ borderRadius: "50%", background: "radial-gradient(circle at 0% 50%, rgba(255,244,214,0.85), transparent 70%)", transformOrigin: "0% 50%" }} />}
    >
      <L c="g43-lean" l={43} t={54} w={14} h={2} d={80} st={{ borderRadius: "999px", background: "rgba(29,48,64,0.6)" }} />
      <V c="g43-hh-horn" l={42} t={44} w={13} h={9} d={240} st={{ transformOrigin: "12% 50%" }}>{horn}</V>
      <L c="g43-hh-fog" l={38} t={40} w={24} h={6} d={520} st={{ background: "linear-gradient(90deg, transparent, rgba(29,48,64,0.65))" }} />
      <L c="g43-foam" l={45} t={50} w={11} h={4} d={620} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.42)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={45 + i * 4} t={52} w={1.2} h={1.2} d={700} st={{ borderRadius: "50%", background: "#d9a441" }} />
      ))}
    </Lead>
  );
}

/* --- 29. Curfew Horn (t1) — THE BELL BUOY -----------------------------------
   A bell buoy at the harbour entrance. The swell rolls it, the clapper finds
   the bell on its own, and the sound says the same thing every night: nothing
   comes past this after dark. Palette: #c85f3a / #fff4d6 / #1a2c3a. */
function CurfewHornScene({ role, delayMs }: SceneProps) {
  const buoy = (
    <g {...SJ}>
      <path d="M6 14h12l-1.4 6.6H7.4z" fill="#c85f3a" stroke="#1a2c3a" strokeWidth="1.2" />
      <path d="M8 14V9.6h8V14" fill="none" stroke="#1a2c3a" strokeWidth="1.2" />
    </g>
  );
  const bell = (
    <g {...SJ}>
      <path d="M7 15c0-4.4 1.6-7.2 5-7.2s5 2.8 5 7.2z" fill="#fff4d6" stroke="#1a2c3a" strokeWidth="1.2" />
      <path d="M6 15h12" stroke="#c85f3a" strokeWidth="1.8" />
      <circle cx="12" cy="17.4" r="1.6" fill="#1a2c3a" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-ch-buoy" l={22} t={40} w={56} h={50} d={40}>{buoy}</V>
      <V c="g43-ch-clang" l={28} t={6} w={44} h={44} d={250} st={{ transformOrigin: "50% 6%" }}>{bell}</V>
      <L c="g43-ch-swell" l={4} t={78} w={92} h={6} d={440} st={{ borderRadius: "999px", background: "#1a2c3a" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={26} t={38} w={48} h={46} d={0}>{buoy}</V>
      <V c="g43-hit" l={30} t={6} w={40} h={40} d={140} st={{ transformOrigin: "50% 6%" }}>{bell}</V>
      <L c="g43-hitwave" l={8} t={80} w={84} h={4} d={260} st={{ borderRadius: "999px", background: "#c85f3a" }} />
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(200,95,58,0.22)" /><Rim tone="rgba(26,44,58,0.44)" /><Tide tone="rgba(26,44,58,0.5)" /></>}>
      <L c="g43-lean" l={43} t={54} w={14} h={2} d={80} st={{ borderRadius: "999px", background: "rgba(26,44,58,0.6)" }} />
      <V c="g43-ch-buoy" l={45} t={45} w={10} h={10} d={230}>{buoy}</V>
      <V c="g43-ch-clang" l={46} t={39} w={8} h={8} d={370} st={{ transformOrigin: "50% 6%" }}>{bell}</V>
      <L c="g43-ch-swell" l={38} t={51} w={24} h={2.4} d={520} st={{ borderRadius: "999px", background: "rgba(255,244,214,0.55)" }} />
      <L c="g43-foam" l={45} t={50} w={11} h={11} d={620} st={{ borderRadius: "50%", border: "2px solid rgba(255,244,214,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={45 + i * 4} t={53} w={1.2} h={1.2} d={700} st={{ borderRadius: "50%", background: "#c85f3a" }} />
      ))}
    </Lead>
  );
}

/* --- 30. Parade Polish (t2) — VARNISH ON THE BRIGHTWORK ---------------------
   One long stroke of varnish is laid down the rail, the gloss runs away along
   the grain, and a single bead gathers under the edge and hangs there.
   Palette: #e2b455 / #fff4d6 / #2b1d10. */
function ParadePolishScene({ role, delayMs }: SceneProps) {
  const brush = (
    <g {...SJ}>
      <path d="M9.4 2h5.2v9H9.4z" fill="#2b1d10" stroke="#e2b455" strokeWidth="1.1" />
      <path d="M8 11h8l-1 8.6H9z" fill="#e2b455" stroke="#2b1d10" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <L c="g43-pp-gloss" l={4} t={54} w={92} h={12} d={40} st={{ background: "linear-gradient(90deg, #e2b455, rgba(226,180,85,0.25))", transformOrigin: "0% 50%" }} />
      <V c="g43-pp-brush" l={4} t={14} w={40} h={54} d={250}>{brush}</V>
      <L c="g43-pp-bead" l={60} t={64} w={5} h={9} d={440} st={{ borderRadius: "999px", background: "#fff4d6" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <L c="g43-hitwave" l={4} t={52} w={92} h={12} d={0} st={{ background: "linear-gradient(90deg, #e2b455, rgba(226,180,85,0.2))", transformOrigin: "0% 50%" }} />
      <V c="g43-hitside" l={16} t={12} w={40} h={54} d={140}>{brush}</V>
      <L c="g43-hit2" l={62} t={62} w={5} h={10} d={260} st={{ borderRadius: "999px", background: "#fff4d6" }} />
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(226,180,85,0.24)" /><Rim tone="rgba(255,244,214,0.26)" /></>}>
      <L c="g43-lean" l={42} t={53} w={16} h={2} d={80} st={{ borderRadius: "999px", background: "rgba(43,29,16,0.6)" }} />
      <L c="g43-pp-gloss" l={40} t={48} w={22} h={3} d={230} st={{ background: "linear-gradient(90deg, #e2b455, rgba(226,180,85,0.2))", transformOrigin: "0% 50%" }} />
      <V c="g43-pp-brush" l={40} t={42} w={8} h={10} d={330}>{brush}</V>
      <L c="g43-pp-bead" l={52} t={51} w={1.4} h={2.6} d={520} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <L c="g43-drift" l={41} t={50} w={18} h={3} d={620} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.5), transparent)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={44 + i * 5} t={52} w={1.2} h={1.2} d={700} st={{ borderRadius: "50%", background: "#e2b455" }} />
      ))}
    </Lead>
  );
}

/* --- 31. Green Recruit (t3) — THE WILLOW WITHY ------------------------------
   A cut willow rod is driven into the wet bank and left alone. For two turns
   it is only a stick; then the roots go down, the bark splits and a first leaf
   opens. Palette: #96c86a / #fff4d6 / #24361f. */
function GreenRecruitScene({ role, delayMs }: SceneProps) {
  const withy = <path d="M12.6 2C11 8 10.6 14.4 11.4 21" fill="none" stroke="#24361f" strokeWidth="2.6" {...SJ} />;
  const roots = (
    <g fill="none" stroke="#96c86a" strokeWidth="1.6" {...SJ}>
      <path d="M12 2v8M12 6l-5 6M12 7.6l5 6M12 11l-2.6 9M12 12l3 8" />
    </g>
  );
  const leaf = <path d="M4 18C4 10 10 4 20 4c0 9-6 14-16 14z" fill="#96c86a" stroke="#24361f" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-gr-withy" l={30} t={4} w={40} h={64} d={40} st={{ transformOrigin: "50% 100%" }}>{withy}</V>
      <V c="g43-gr-root" l={26} t={54} w={48} h={38} d={250} st={{ transformOrigin: "50% 0%" }}>{roots}</V>
      <V c="g43-gr-bud" l={52} t={16} w={28} h={28} d={440} st={{ transformOrigin: "20% 80%" }}>{leaf}</V>
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={32} t={8} w={36} h={62} d={0} st={{ transformOrigin: "50% 100%" }}>{withy}</V>
      <V c="g43-hitwave" l={28} t={56} w={44} h={34} d={140} st={{ transformOrigin: "50% 0%" }}>{roots}</V>
      <V c="g43-hit2" l={52} t={20} w={26} h={26} d={260}>{leaf}</V>
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(150,200,106,0.24)" /><Tide tone="rgba(36,54,31,0.45)" /></>}>
      <L c="g43-lean" l={43} t={53} w={14} h={2} d={80} st={{ borderRadius: "999px", background: "rgba(36,54,31,0.6)" }} />
      <V c="g43-gr-withy" l={46} t={40} w={8} h={13} d={230} st={{ transformOrigin: "50% 100%" }}>{withy}</V>
      <V c="g43-gr-root" l={44} t={51} w={12} h={7} d={380} st={{ transformOrigin: "50% 0%" }}>{roots}</V>
      <V c="g43-gr-bud" l={51} t={41} w={5} h={5} d={520} st={{ transformOrigin: "20% 80%" }}>{leaf}</V>
      <L c="g43-foam" l={45} t={51} w={10} h={4} d={620} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.42)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={45 + i * 4} t={48} w={1.2} h={1.2} d={700} st={{ borderRadius: "50%", background: "#96c86a" }} />
      ))}
    </Lead>
  );
}

/* --- 32. Milkman's Round (t3) — THE YOKE AND PAILS --------------------------
   The water carrier's round: the yoke settles onto the shoulders, both pails
   swing and steady, and a little slops over the rim of the one that is
   delivered first. Palette: #b6c6cf / #fff4d6 / #2b3138. */
function MilkmansRoundScene({ role, delayMs }: SceneProps) {
  const yoke = (
    <g fill="none" stroke="#2b3138" strokeWidth="2.4" {...SJ}>
      <path d="M2 8c4-4 16-4 20 0" />
      <path d="M3 8v4M21 8v4" stroke="#b6c6cf" strokeWidth="1.6" />
    </g>
  );
  const pail = (
    <g {...SJ}>
      <path d="M5.6 8h12.8l-1.8 11.4H7.4z" fill="#b6c6cf" stroke="#2b3138" strokeWidth="1.2" />
      <path d="M6 10.6h12" stroke="#fff4d6" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-mr-yoke" l={8} t={16} w={84} h={30} d={40}>{yoke}</V>
      <V c="g43-mr-pail" l={10} t={40} w={36} h={44} d={250} st={{ transformOrigin: "50% -20%" }}>{pail}</V>
      <V c="g43-mr-slop" l={54} t={44} w={18} h={18} d={440}><path d={DROP} fill="#fff4d6" /></V>
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={28} t={26} w={44} h={54} d={0} st={{ transformOrigin: "50% -20%" }}>{pail}</V>
      <V c="g43-hitwave" l={10} t={8} w={80} h={26} d={140}>{yoke}</V>
      <V c="g43-hit2" l={40} t={62} w={20} h={20} d={260}><path d={DROP} fill="#fff4d6" /></V>
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(182,198,207,0.24)" /><Rim tone="rgba(43,49,56,0.4)" /></>}>
      <L c="g43-lean" l={42} t={55} w={16} h={2} d={80} st={{ borderRadius: "999px", background: "rgba(43,49,56,0.6)" }} />
      <V c="g43-mr-yoke" l={41} t={40} w={18} h={6} d={230}>{yoke}</V>
      <V c="g43-mr-pail" l={41} t={44} w={7} h={9} d={360} st={{ transformOrigin: "50% -22%" }}>{pail}</V>
      <V c="g43-mr-pail" l={52} t={44} w={7} h={9} d={460} st={{ transformOrigin: "50% -22%" }}>{pail}</V>
      <V c="g43-mr-slop" l={44} t={48} w={3.4} h={3.4} d={600}><path d={DROP} fill="#fff4d6" /></V>
      <L c="g43-foam" l={45} t={52} w={10} h={3.6} d={660} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.4)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={45 + i * 4} t={53} w={1.2} h={1.2} d={720} st={{ borderRadius: "50%", background: "#b6c6cf" }} />
      ))}
    </Lead>
  );
}

/* --- 33. Muster of Silence (t7) — THE DIVING BELL ---------------------------
   The bell goes down over the muster with the air trapped under it: the water
   climbs the inside, the pocket squeezes smaller and smaller, and every sound
   above is simply cut off. Palette: #a8b6a0 / #fff4d6 / #12262c. */
function MusterSilenceScene({ role, delayMs }: SceneProps) {
  const dbell = (
    <g {...SJ}>
      <path d="M4 21V13c0-4.6 3.4-8 8-8s8 3.4 8 8v8z" fill="none" stroke="#a8b6a0" strokeWidth="2" />
      <path d="M12 5V2.4" stroke="#a8b6a0" strokeWidth="2" />
      <path d="M8 21v-6.6h8V21" fill="none" stroke="#12262c" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-ms-bell" l={18} t={8} w={64} h={64} d={40}>{dbell}</V>
      <L c="g43-ms-air" l={34} t={44} w={32} h={26} d={250} st={{ background: "rgba(255,244,214,0.6)", transformOrigin: "50% 0%" }} />
      <L c="g43-ms-hush" l={26} t={54} w={48} h={30} d={440} st={{ borderRadius: "50%", border: "2px solid #a8b6a0" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={20} t={8} w={60} h={64} d={0}>{dbell}</V>
      <L c="g43-hitwave" l={36} t={42} w={28} h={26} d={140} st={{ background: "rgba(255,244,214,0.55)", transformOrigin: "50% 0%" }} />
      <L c="g43-hit2" l={30} t={56} w={40} h={24} d={260} st={{ borderRadius: "50%", border: "2px solid #a8b6a0" }} />
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(168,182,160,0.24)" /><Rim tone="rgba(18,38,44,0.46)" /><Tide tone="rgba(18,38,44,0.5)" /></>}>
      <L c="g43-lean" l={43} t={55} w={14} h={2} d={80} st={{ borderRadius: "999px", background: "rgba(18,38,44,0.65)" }} />
      <V c="g43-ms-bell" l={44} t={40} w={12} h={14} d={240}>{dbell}</V>
      <L c="g43-ms-air" l={46.6} t={46} w={6.8} h={5} d={380} st={{ background: "rgba(255,244,214,0.6)", transformOrigin: "50% 0%" }} />
      <L c="g43-ms-hush" l={43} t={45} w={14} h={14} d={520} st={{ borderRadius: "50%", border: "2px solid #a8b6a0" }} />
      <L c="g43-drift" l={41} t={52} w={18} h={4} d={620} st={{ background: "linear-gradient(180deg, rgba(168,182,160,0.55), transparent)" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g43-motes" l={43 + i * 4} t={50} w={1.3} h={1.3} d={710} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 34. Cornucopia (t8) — THE NET COMES UP ---------------------------------
   The seine is hauled: the bag lifts clear of the water heavy and dripping,
   the catch works inside it, and what will not fit spills back over the cork
   line in silver. Palette: #cbd8dd / #fff4d6 / #1a3038. */
function CornucopiaScene({ role, delayMs }: SceneProps) {
  const net = (
    <g fill="none" stroke="#cbd8dd" strokeWidth="1.3" {...SJ}>
      <path d="M3 5c3.4 9 5.4 14 9 17 3.6-3 5.6-8 9-17z" />
      <path d="M5.4 9.4h13.2M7.4 14h9.2M9 4.6l3 17M15 4.6l-3 17" />
    </g>
  );
  const fish = <path d="M3 12c3.6-4 9.4-4 13 0-3.6 4-9.4 4-13 0zM16 12l5-3.4v6.8z" fill="#fff4d6" stroke="#1a3038" strokeWidth="0.9" {...SJ} />;
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-co-net" l={16} t={8} w={68} h={76} d={40}>{net}</V>
      <V c="g43-co-catch" l={34} t={38} w={34} h={24} d={250}>{fish}</V>
      <V c="g43-co-spill" l={58} t={54} w={26} h={18} d={440}>{fish}</V>
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={18} t={8} w={64} h={74} d={0}>{net}</V>
      <V c="g43-hit2" l={34} t={36} w={32} h={22} d={140}>{fish}</V>
      <L c="g43-hitwave" l={10} t={80} w={80} h={4} d={260} st={{ borderRadius: "999px", background: "#1a3038" }} />
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(203,216,221,0.26)" /><Rim tone="rgba(26,48,56,0.42)" /><Tide tone="rgba(26,48,56,0.5)" /></>}>
      <L c="g43-lean" l={42} t={55} w={16} h={2.2} d={80} st={{ borderRadius: "999px", background: "rgba(26,48,56,0.6)" }} />
      <V c="g43-co-net" l={43} t={38} w={14} h={17} d={240}>{net}</V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g43-co-catch" l={45 + i * 3.4} t={44 + (i % 2) * 3} w={5} h={3.4} d={380 + i * 90}>{fish}</V>
      ))}
      <V c="g43-co-spill" l={52} t={48} w={4.4} h={3} d={600}>{fish}</V>
      <L c="g43-foam" l={44} t={52} w={12} h={4} d={660} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.45)" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g43-drip" l={44 + i * 4} t={52} w={1.2} h={3.4} d={720} st={{ borderRadius: "999px", background: "#cbd8dd" }} />
      ))}
    </Lead>
  );
}

/* --- 35. Wet Floor Sign (t1) — THE MOP -------------------------------------
   A free action, so it is the cheapest possible one: a mop head goes back and
   forth across the square, leaves a slick nobody will risk, and the galvanised
   pail rocks where it was set down. Palette: #7fb6d0 / #fff4d6 / #223244. */
function WetFloorSignScene({ role, delayMs }: SceneProps) {
  const mop = (
    <g {...SJ}>
      <path d="M12.6 2L11 12" stroke="#223244" strokeWidth="2.2" />
      <path d="M5.6 12h12l-1.6 5.4a2.6 2.6 0 0 1-2.6 1.8h-3.6a2.6 2.6 0 0 1-2.6-1.8z" fill="#7fb6d0" stroke="#223244" strokeWidth="1.1" />
    </g>
  );
  const pail = (
    <g {...SJ}>
      <path d="M6 9h12l-1.6 10.6H7.6z" fill="#7fb6d0" stroke="#223244" strokeWidth="1.2" />
      <path d="M6 11.6h12" stroke="#fff4d6" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <L c="g43-wf-slick" l={8} t={58} w={82} h={22} d={40} st={{ borderRadius: "50%", background: "radial-gradient(ellipse at 50% 50%, rgba(127,182,208,0.8), transparent 70%)" }} />
      <V c="g43-wf-mop" l={6} t={14} w={48} h={60} d={250} st={{ transformOrigin: "50% 6%" }}>{mop}</V>
      <V c="g43-wf-pail" l={58} t={44} w={34} h={44} d={440}>{pail}</V>
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <L c="g43-hitwave" l={10} t={58} w={80} h={20} d={0} st={{ borderRadius: "50%", background: "radial-gradient(ellipse at 50% 50%, rgba(127,182,208,0.8), transparent 70%)" }} />
      <V c="g43-hitside" l={16} t={12} w={46} h={58} d={140}>{mop}</V>
      <L c="g43-hit2" l={44} t={64} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(127,182,208,0.24)" /><Rim tone="rgba(34,50,68,0.4)" /></>}>
      <L c="g43-lean" l={42} t={54} w={16} h={2} d={80} st={{ borderRadius: "999px", background: "rgba(34,50,68,0.6)" }} />
      <L c="g43-wf-slick" l={41} t={48} w={18} h={7} d={220} st={{ borderRadius: "50%", background: "radial-gradient(ellipse at 50% 50%, rgba(127,182,208,0.75), transparent 70%)" }} />
      <V c="g43-wf-mop" l={40} t={40} w={9} h={12} d={340} st={{ transformOrigin: "50% 6%" }}>{mop}</V>
      <V c="g43-wf-pail" l={53} t={45} w={7} h={9} d={500}>{pail}</V>
      <L c="g43-foam" l={45} t={51} w={10} h={4} d={620} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.45)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={45 + i * 4} t={52} w={1.2} h={1.2} d={700} st={{ borderRadius: "50%", background: "#7fb6d0" }} />
      ))}
    </Lead>
  );
}

/* --- 36. Trade Secret (t3) — THE BOTTLE GROUNDS -----------------------------
   Something written down a long way away arrives on its own schedule: a sealed
   bottle rolls up the shingle, settles, and the note inside unrolls against
   the glass. Palette: #8fc9a8 / #fff4d6 / #2c3324. */
function TradeSecretScene({ role, delayMs }: SceneProps) {
  const bottle = (
    <g {...SJ}>
      <path d="M2.6 9.4h14.8c2.4 0 4 1.2 4 2.6s-1.6 2.6-4 2.6H2.6z" fill="rgba(143,201,168,0.5)" stroke="#2c3324" strokeWidth="1.2" />
      <path d="M21.4 10.4h1.4v3.2h-1.4z" fill="#8fc9a8" stroke="#2c3324" strokeWidth="1" />
    </g>
  );
  const note = <path d="M4 8h13v8H4z" fill="#fff4d6" stroke="#2c3324" strokeWidth="1" {...SJ} />;
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-ts-bottle" l={6} t={34} w={80} h={40} d={40}>{bottle}</V>
      <V c="g43-ts-note" l={22} t={40} w={40} h={26} d={250} st={{ transformOrigin: "0% 50%" }}>{note}</V>
      <V c="g43-ts-cork" l={70} t={40} w={20} h={20} d={440}>
        <circle cx="12" cy="12" r="6" fill="#8fc9a8" stroke="#2c3324" strokeWidth="1.4" />
      </V>
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={8} t={34} w={76} h={38} d={0}>{bottle}</V>
      <V c="g43-hitwave" l={22} t={40} w={38} h={24} d={140} st={{ transformOrigin: "0% 50%" }}>{note}</V>
      <L c="g43-hit2" l={10} t={74} w={76} h={4} d={260} st={{ borderRadius: "999px", background: "#2c3324" }} />
    </Cut>
  );
  return (
    <Lead
      d={delayMs}
      frame={<><Wash tone="rgba(143,201,168,0.24)" /><Tide tone="rgba(44,51,36,0.45)" /></>}
      run={<L c="g43-carry" l={49} t={47.4} w={6} h={5} d={300} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(143,201,168,0.85), transparent 70%)" }} />}
    >
      <L c="g43-lean" l={42} t={53} w={16} h={2} d={80} st={{ borderRadius: "999px", background: "rgba(44,51,36,0.6)" }} />
      <V c="g43-ts-bottle" l={42} t={45} w={16} h={8} d={240}>{bottle}</V>
      <V c="g43-ts-note" l={45} t={46.4} w={8} h={5} d={420} st={{ transformOrigin: "0% 50%" }}>{note}</V>
      <V c="g43-ts-cork" l={55} t={46} w={4} h={4} d={540}>
        <circle cx="12" cy="12" r="6" fill="#8fc9a8" stroke="#2c3324" strokeWidth="1.6" />
      </V>
      <L c="g43-foam" l={44} t={50} w={12} h={4} d={640} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.45)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={44 + i * 5} t={52} w={1.2} h={1.2} d={700} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 37. Pawnbroker's Deal (t4) — THE CHANDLER'S SCALES ---------------------
   Over the counter at the ship chandler's: the beam tips as the pawn goes into
   one pan, the brass weight thumps into the other, and the trade balances at
   exactly one knight. Palette: #d9b45a / #fff4d6 / #241c12. */
function PawnbrokersDealScene({ role, delayMs }: SceneProps) {
  const beam = (
    <g {...SJ}>
      <path d="M12 3v4M3 7h18" stroke="#d9b45a" strokeWidth="2.2" />
      <path d="M4 7v4M20 7v4" stroke="#241c12" strokeWidth="1.2" />
    </g>
  );
  const pan = <path d="M2 8h20c0 5-4.4 8-10 8S2 13 2 8z" fill="#d9b45a" stroke="#241c12" strokeWidth="1.2" {...SJ} />;
  const weight = <path d="M8 7h8l2.4 12H5.6z" fill="#fff4d6" stroke="#241c12" strokeWidth="1.2" {...SJ} />;
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-pd-beam" l={16} t={10} w={68} h={44} d={40} st={{ transformOrigin: "50% 30%" }}>{beam}</V>
      <V c="g43-pd-pan" l={10} t={40} w={38} h={30} d={250}>{pan}</V>
      <V c="g43-pd-weight" l={56} t={38} w={30} h={38} d={440}>{weight}</V>
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={18} t={8} w={64} h={44} d={0} st={{ transformOrigin: "50% 30%" }}>{beam}</V>
      <V c="g43-hitwave" l={12} t={42} w={36} h={28} d={140}>{pan}</V>
      <V c="g43-hit2" l={56} t={40} w={28} h={36} d={260}>{weight}</V>
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(217,180,90,0.24)" /><Rim tone="rgba(36,28,18,0.42)" /></>}>
      <L c="g43-lean" l={43} t={55} w={14} h={2} d={80} st={{ borderRadius: "999px", background: "rgba(36,28,18,0.6)" }} />
      <V c="g43-pd-beam" l={43} t={39} w={15} h={10} d={230} st={{ transformOrigin: "50% 30%" }}>{beam}</V>
      <V c="g43-pd-pan" l={41} t={45} w={8} h={6} d={370}>{pan}</V>
      <V c="g43-pd-weight" l={52} t={44} w={6} h={8} d={500}>{weight}</V>
      <L c="g43-drift" l={41} t={51} w={18} h={4} d={620} st={{ background: "linear-gradient(180deg, rgba(217,180,90,0.55), transparent)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={45 + i * 4} t={53} w={1.2} h={1.2} d={700} st={{ borderRadius: "50%", background: "#d9b45a" }} />
      ))}
    </Lead>
  );
}

/* --- 38. Private Auction (t4) — THE GAVEL ON THE WET SLATE ------------------
   The quayside sale: the lot is chalked on a slate still wet from the fish,
   the gavel comes down once, and the knock rings out over the boxes.
   Palette: #b0722f / #fff4d6 / #22282a. */
function PrivateAuctionScene({ role, delayMs }: SceneProps) {
  const gavel = (
    <g {...SJ}>
      <path d="M4 18L13 9" stroke="#b0722f" strokeWidth="2.4" />
      <path d="M12.4 4.6l6.8 6.8-3 3-6.8-6.8z" fill="#b0722f" stroke="#22282a" strokeWidth="1.2" />
    </g>
  );
  const slate = (
    <g {...SJ}>
      <path d="M3 5h18v14H3z" fill="#22282a" stroke="#b0722f" strokeWidth="1.3" />
      <path d="M6 9.6h9M6 13.2h12M6 16h6" stroke="#fff4d6" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-pa-slate" l={12} t={26} w={62} h={58} d={40}>{slate}</V>
      <V c="g43-pa-gavel" l={44} t={6} w={50} h={52} d={250} st={{ transformOrigin: "16% 84%" }}>{gavel}</V>
      <L c="g43-pa-knock" l={34} t={54} w={36} h={22} d={440} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={16} t={24} w={58} h={56} d={0}>{slate}</V>
      <V c="g43-hit" l={44} t={8} w={48} h={48} d={140} st={{ transformOrigin: "16% 84%" }}>{gavel}</V>
      <L c="g43-hitwave" l={30} t={58} w={40} h={16} d={260} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(176,114,47,0.24)" /><Rim tone="rgba(34,40,42,0.44)" /></>}>
      <L c="g43-lean" l={43} t={55} w={14} h={2} d={80} st={{ borderRadius: "999px", background: "rgba(34,40,42,0.6)" }} />
      <V c="g43-pa-slate" l={43} t={43} w={14} h={12} d={230}>{slate}</V>
      <V c="g43-pa-gavel" l={49} t={38} w={11} h={11} d={380} st={{ transformOrigin: "16% 84%" }}>{gavel}</V>
      <L c="g43-pa-knock" l={45} t={46} w={11} h={11} d={520} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      <L c="g43-drift" l={41} t={51} w={18} h={4} d={620} st={{ background: "linear-gradient(180deg, rgba(176,114,47,0.5), transparent)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={45 + i * 4} t={53} w={1.2} h={1.2} d={700} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 39. Velvet Queue (t5) — THE GANGWAY ------------------------------------
   You board before anyone else: the brow is lowered onto the quay, the
   stanchions are planted, and the velvet side rope is clipped across behind
   you. Palette: #b2415a / #fff4d6 / #201a24. */
function VelvetQueueScene({ role, delayMs }: SceneProps) {
  const brow = (
    <g {...SJ}>
      <path d="M2 12h20v4H2z" fill="#201a24" stroke="#fff4d6" strokeWidth="1.1" />
      <path d="M5 12v-2.4M10 12V9.6M15 12V9.6M20 12V9.6" stroke="#fff4d6" strokeWidth="1" />
    </g>
  );
  const stanchion = (
    <g {...SJ}>
      <path d="M12 20V7" stroke="#fff4d6" strokeWidth="2.2" />
      <circle cx="12" cy="5" r="2.6" fill="#b2415a" stroke="#201a24" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-vq-brow" l={8} t={40} w={84} h={30} d={40} st={{ transformOrigin: "6% 50%" }}>{brow}</V>
      <V c="g43-vq-stanchion" l={16} t={12} w={26} h={54} d={250}>{stanchion}</V>
      <L c="g43-vq-rope" l={24} t={26} w={56} h={5} d={440} st={{ borderRadius: "999px", background: "#b2415a", transformOrigin: "0% 50%" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={10} t={44} w={80} h={28} d={0} st={{ transformOrigin: "6% 50%" }}>{brow}</V>
      <V c="g43-hit2" l={18} t={14} w={24} h={50} d={140}>{stanchion}</V>
      <L c="g43-hitwave" l={26} t={28} w={52} h={5} d={260} st={{ borderRadius: "999px", background: "#b2415a", transformOrigin: "0% 50%" }} />
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(178,65,90,0.22)" /><Rim tone="rgba(255,244,214,0.24)" /></>}>
      <L c="g43-lean" l={42} t={55} w={16} h={2} d={80} st={{ borderRadius: "999px", background: "rgba(32,26,36,0.6)" }} />
      <V c="g43-vq-brow" l={41} t={47} w={18} h={7} d={230} st={{ transformOrigin: "6% 50%" }}>{brow}</V>
      {[0, 1].map((i) => (
        <V key={i} c="g43-vq-stanchion" l={42 + i * 13} t={41} w={5} h={10} d={370 + i * 100}>{stanchion}</V>
      ))}
      <L c="g43-vq-rope" l={44} t={44} w={13} h={1.4} d={560} st={{ borderRadius: "999px", background: "#b2415a", transformOrigin: "0% 50%" }} />
      <L c="g43-drift" l={41} t={51} w={18} h={4} d={640} st={{ background: "linear-gradient(180deg, rgba(178,65,90,0.5), transparent)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={45 + i * 4} t={53} w={1.2} h={1.2} d={710} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 40. Dead Man's Boots (t4) — THE BOOTS ON THE TIDELINE ------------------
   A pair of sea boots left standing exactly where somebody was lost. The tide
   fills them to the top and the prints behind them fill in too, so the ground
   itself is spoken for. Palette: #6e7c84 / #fff4d6 / #14222a. */
function DeadMansBootsScene({ role, delayMs }: SceneProps) {
  const boot = (
    <g {...SJ}>
      <path d="M8 3h6v11.6l6 3.6V21H8z" fill="#6e7c84" stroke="#14222a" strokeWidth="1.2" />
      <path d="M8 6.6h6" stroke="#fff4d6" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-db-boot" l={10} t={16} w={46} h={64} d={40}>{boot}</V>
      <V c="g43-db-boot" l={46} t={22} w={46} h={64} d={250}>{boot}</V>
      <L c="g43-db-fill" l={20} t={56} w={60} h={22} d={440} st={{ background: "linear-gradient(180deg, rgba(110,124,132,0.85), rgba(20,34,42,0.9))", transformOrigin: "50% 100%" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={16} t={14} w={50} h={64} d={0}>{boot}</V>
      <L c="g43-hitwave" l={20} t={52} w={56} h={24} d={140} st={{ background: "linear-gradient(180deg, rgba(110,124,132,0.8), rgba(20,34,42,0.9))", transformOrigin: "50% 100%" }} />
      <L c="g43-hit2" l={56} t={70} w={26} h={10} d={260} st={{ borderRadius: "50%", background: "rgba(20,34,42,0.7)" }} />
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(110,124,132,0.24)" /><Rim tone="rgba(20,34,42,0.46)" /><Tide tone="rgba(20,34,42,0.5)" /></>}>
      <L c="g43-lean" l={43} t={55} w={14} h={2} d={80} st={{ borderRadius: "999px", background: "rgba(20,34,42,0.65)" }} />
      <V c="g43-db-boot" l={43} t={42} w={7} h={13} d={230}>{boot}</V>
      <V c="g43-db-boot" l={50} t={43} w={7} h={13} d={330}>{boot}</V>
      <L c="g43-db-fill" l={44} t={48} w={12} h={6} d={480} st={{ background: "linear-gradient(180deg, rgba(110,124,132,0.8), rgba(20,34,42,0.9))", transformOrigin: "50% 100%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-db-print" l={38 - i * 4} t={53 + i} w={3.4} h={2} d={600} st={{ borderRadius: "50%", background: "rgba(20,34,42,0.7)" }} />
      ))}
      <L c="g43-motes" l={49} t={50} w={1.4} h={1.4} d={700} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 41. Lantern Festival (t5) — THE LANTERNS ARE SET ADRIFT ----------------
   Each returning pawn is a paper lantern pushed out from the bank: the frame
   settles on the surface, the flame gutters and steadies, and the glow lies
   flat on the water under it. Palette: #f0a24a / #fff4d6 / #16283a. */
function LanternFestivalScene({ role, delayMs }: SceneProps) {
  const lantern = (
    <g {...SJ}>
      <path d="M5.6 8h12.8v8.6a2 2 0 0 1-2 2H7.6a2 2 0 0 1-2-2z" fill="#f0a24a" stroke="#16283a" strokeWidth="1.2" />
      <path d="M4.6 8h14.8M8.6 8v10.6M15.4 8v10.6" stroke="#16283a" strokeWidth="1" />
    </g>
  );
  const flame = <path d="M12 5.4c1.8 2.8 3 4.4 3 6.2a3 3 0 0 1-6 0c0-1.8 1.2-3.4 3-6.2z" fill="#fff4d6" />;
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-lf-lantern" l={22} t={26} w={56} h={54} d={40}>{lantern}</V>
      <V c="g43-lf-flame" l={38} t={30} w={24} h={26} d={250} st={{ transformOrigin: "50% 100%" }}>{flame}</V>
      <L c="g43-lf-glow" l={20} t={72} w={60} h={12} d={440} st={{ borderRadius: "50%", background: "radial-gradient(ellipse, rgba(240,162,74,0.8), transparent 70%)" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={26} t={22} w={48} h={52} d={0}>{lantern}</V>
      <V c="g43-hit2" l={40} t={26} w={20} h={22} d={140} st={{ transformOrigin: "50% 100%" }}>{flame}</V>
      <L c="g43-hitwave" l={20} t={70} w={60} h={10} d={260} st={{ borderRadius: "50%", background: "radial-gradient(ellipse, rgba(240,162,74,0.75), transparent 70%)" }} />
    </Cut>
  );
  return (
    <Lead
      d={delayMs}
      frame={<><Wash tone="rgba(240,162,74,0.26)" /><Rim tone="rgba(22,40,58,0.44)" /><Tide tone="rgba(22,40,58,0.5)" /></>}
      run={<L c="g43-carry" l={49} t={47} w={6} h={6} d={480} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(240,162,74,0.9), transparent 70%)" }} />}
    >
      <L c="g43-lean" l={42} t={55} w={16} h={2} d={80} st={{ borderRadius: "999px", background: "rgba(22,40,58,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <V key={i} c="g43-lf-lantern" l={42 + i * 6} t={43 + (i % 2) * 3} w={7} h={8} d={230 + i * 110}>{lantern}</V>
      ))}
      <V c="g43-lf-flame" l={44.6} t={44} w={3.4} h={4} d={520} st={{ transformOrigin: "50% 100%" }}>{flame}</V>
      <L c="g43-lf-glow" l={41} t={51} w={19} h={4} d={620} st={{ borderRadius: "50%", background: "radial-gradient(ellipse, rgba(240,162,74,0.7), transparent 70%)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={44 + i * 5} t={50} w={1.3} h={1.3} d={710} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 42. Ancestral Audience (t6) — THE SCRYING BOWL -------------------------
   A shallow bowl of still water is set on the square, one drop is let fall, and
   as the ring goes out a face comes up through the surface to be asked.
   Palette: #a9d8d0 / #fff4d6 / #1c2c3a. */
function AncestralAudienceScene({ role, delayMs }: SceneProps) {
  const bowl = (
    <g {...SJ}>
      <path d="M2 9.6h20c0 6.4-4.4 10-10 10s-10-3.6-10-10z" fill="#1c2c3a" stroke="#a9d8d0" strokeWidth="1.3" />
      <path d="M3.4 12h17.2" stroke="#a9d8d0" strokeWidth="1.2" />
    </g>
  );
  const face = (
    <g fill="none" stroke="#a9d8d0" strokeWidth="1.4" {...SJ}>
      <path d="M12 4.6c3.4 0 5.4 2.4 5.4 6.4S15 19 12 19s-5.4-4-5.4-8 2-6.4 5.4-6.4z" />
      <path d="M9.8 10.4h.01M14.2 10.4h.01M10 14.6c1.4 1 2.6 1 4 0" />
    </g>
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <V c="g43-aa-bowl" l={10} t={38} w={80} h={50} d={40}>{bowl}</V>
      <V c="g43-aa-face" l={32} t={16} w={36} h={46} d={250}>{face}</V>
      <L c="g43-aa-ring" l={30} t={58} w={40} h={14} d={440} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g43-hitside" l={14} t={36} w={72} h={48} d={0}>{bowl}</V>
      <V c="g43-hit2" l={34} t={14} w={32} h={44} d={140}>{face}</V>
      <L c="g43-hitwave" l={28} t={56} w={44} h={14} d={260} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
    </Cut>
  );
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(169,216,208,0.24)" /><Rim tone="rgba(28,44,58,0.44)" /><Tide tone="rgba(28,44,58,0.48)" /></>}>
      <L c="g43-lean" l={43} t={55} w={14} h={2} d={80} st={{ borderRadius: "999px", background: "rgba(28,44,58,0.62)" }} />
      <V c="g43-aa-bowl" l={42} t={46} w={16} h={9} d={230}>{bowl}</V>
      <L c="g43-drip" l={49.4} t={38} w={1.4} h={4} d={340} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <V c="g43-aa-face" l={45} t={40} w={10} h={12} d={470}>{face}</V>
      <L c="g43-aa-ring" l={44} t={49} w={12} h={5} d={580} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      <L c="g43-aa-ring" l={42} t={48.4} w={16} h={6} d={660} st={{ borderRadius: "50%", border: "2px solid rgba(169,216,208,0.7)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g43-motes" l={45 + i * 4} t={46} w={1.2} h={1.2} d={720} st={{ borderRadius: "50%", background: "#a9d8d0" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   Registry. Every entry declares an anchor; every `sound` is an existing
   SigSoundKey. `source` is deliberately omitted throughout: these cards carry
   no removal diff, so their play is the cast lead on the square they were
   played on, exactly as the generated families resolved before.
   ========================================================================== */

/** Bind one bespoke scene to its config. */
function S(Render: SigPlugin["Render"], config: SigPlugin["config"]): SigPlugin {
  return { config, Render };
}

export const PLAYS: Record<string, SigPlugin> = {
  op_river_breakup: S(RiverBreakupScene, { ordering: "line", staggerMs: 70, victims: ["p"], hasLead: true, sound: "massfreeze", anchor: "cast" }),
  op_second_wind_sip: S(WaterBreakScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "board" }),
  ov_rain_check: S(RainCheckScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }),
  hx4_leaking_boats: S(LeakingBoatsScene, { ordering: "file", staggerMs: 80, victims: "all", hasLead: true, sound: "shades", anchor: "cast" }),
  hx4_rogue_river: S(RogueRiverScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "cataclysm", anchor: "cast" }),
  bn4_holy_water: S(HolyWaterScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast" }),
  bn4_logjam: S(LogjamScene, { ordering: "line", staggerMs: 80, victims: "all", hasLead: true, sound: "wall", anchor: "board" }),
  hx4_high_water: S(HighWaterScene, { ordering: "sweep", staggerMs: 70, victims: ["r", "q"], hasLead: true, sound: "colossus", anchor: "cast" }),
  hx4_river_watch: S(RiverWatchScene, { ordering: "line", staggerMs: 70, victims: ["r"], hasLead: true, sound: "siege", anchor: "board" }),
  ov_great_flood: S(TheGreatFloodScene, { ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "cataclysm", anchor: "cast" }),
  ov_high_water_mark: S(HighWaterMarkScene, { ordering: "sweep", staggerMs: 70, victims: ["b", "r", "q"], hasLead: true, sound: "vault", anchor: "cast" }),
  hx4_tar_flood: S(TarFloodScene, { ordering: "sweep", staggerMs: 70, victims: "all", hasLead: true, sound: "extinction", anchor: "cast" }),
  hx4_flooded_flanks: S(FloodedFlanksScene, { ordering: "file", staggerMs: 60, victims: "all", hasLead: true, sound: "cataclysm", anchor: "cast" }),
  hx4_treacle_tide: S(TreacleTideScene, { ordering: "radial", staggerMs: 70, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }),
  bn4_tide_of_pawns: S(TideOfPawnsScene, { ordering: "line", staggerMs: 60, victims: ["p"], hasLead: true, sound: "rampage", anchor: "board" }),
  ov_thousand_ducks: S(ThousandDucksScene, { ordering: "radial", staggerMs: 60, victims: ["p"], hasLead: true, sound: "gacha", anchor: "board" }),
  op_walking_pace: S(WalkingPaceScene, { ordering: "file", staggerMs: 70, victims: ["p"], hasLead: true, sound: "snooze", anchor: "board" }),
  hx4_no_easy_pickings: S(NoEasyPickingsScene, { ordering: "octagon", staggerMs: 60, victims: "all", hasLead: true, sound: "vault", anchor: "cast" }),
  bn4_fisherman_king: S(FishermanKingScene, { ordering: "line", staggerMs: 60, victims: ["k"], hasLead: true, sound: "blitz", anchor: "aim" }),
  hx4_checkers_law: S(CheckersLawScene, { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "lightning", anchor: "aim" }),
  hx4_dockmasters_fee: S(DockmastersFeeScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "chips", anchor: "board" }),
  hx4_old_laws: S(TheOldLawsScene, { ordering: "radial", staggerMs: 70, victims: "all", hasLead: true, sound: "coronation", anchor: "board" }),
  hx4_command_paralysis: S(CommandParalysisScene, { ordering: "radial", staggerMs: 70, victims: "all", hasLead: true, sound: "clockice", anchor: "board" }),
  bn4_haven_law: S(HavenLawScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "wall", anchor: "board" }),
  bn4_kings_champion: S(KingsChampionScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "cast" }),
  bn4_kings_own_wings: S(KingsOwnWingsScene, { ordering: "line", staggerMs: 60, victims: ["k"], hasLead: true, sound: "blitz", anchor: "aim" }),
  hx4_burden_of_command: S(BurdenOfCommandScene, { ordering: "radial", staggerMs: 60, victims: ["q"], hasLead: true, sound: "colossus", anchor: "board" }),
  op_harbor_horn: S(HarborHornScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast" }),
  hx4_curfew_horn: S(CurfewHornScene, { ordering: "sweep", staggerMs: 70, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast" }),
  bn4_parade_polish: S(ParadePolishScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "vault", anchor: "cast" }),
  bn4_green_recruit: S(GreenRecruitScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "aegis", anchor: "cast" }),
  ov_milkmans_round: S(MilkmansRoundScene, { ordering: "radial", staggerMs: 60, victims: ["p"], hasLead: true, sound: "dice", anchor: "cast" }),
  hx4_muster_silence: S(MusterSilenceScene, { ordering: "octagon", staggerMs: 60, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }),
  bn4_cornucopia: S(CornucopiaScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "crownrain", anchor: "board" }),
  op_wet_floor_sign: S(WetFloorSignScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "slots", anchor: "cast" }),
  bn4_trade_secret: S(TradeSecretScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coinflip", anchor: "board" }),
  bn4_pawnbrokers_deal: S(PawnbrokersDealScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "chips", anchor: "cast" }),
  bn4_private_auction: S(PrivateAuctionScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "vault", anchor: "board" }),
  bn4_velvet_queue: S(VelvetQueueScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "board" }),
  hx4_dead_mans_boots: S(DeadMansBootsScene, { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "shades", anchor: "cast" }),
  ov_lantern_festival: S(LanternFestivalScene, { ordering: "line", staggerMs: 70, victims: ["p"], hasLead: true, sound: "cathedral", anchor: "aim" }),
  ov_ancestral_audience: S(AncestralAudienceScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades", anchor: "cast" }),
};

/* =============================================================================
   FLAGSHIP IMPACT WAVE. Every lead now LANDS: a per-card impact beat from the
   shared violence vocabulary (impact/impact.tsx). This is the WATER module,
   so every hit is a WET CRASH: the shockwave ring is flattened into a low
   ripple ellipse (never a dry blast ring), the laser reads as a spout or a
   light-column into the surface, and the splash cards shatter a droplet
   silhouette into spray. The whole scene rides a cell-scale quake wrapper
   (g43-quakecell, g43WaterPlays.css) on the same --imp-delay beat. Additive
   only: the original scenes render unchanged underneath.

   Node cost per lead: quake 1, laser 2, ripple 1, shatter 6 - the combos
   below stay inside the 16-animated-node scene budget.
   ========================================================================== */

interface Imp {
  /** the impact beat, ms after delayMs - synced to the scene's own strike */
  at: number;
  /** "#rrggbb" tint for the impact vocabulary (one of the card's 3 colours) */
  tint: string;
  /** the spout: a column of light hammering the surface */
  laser?: boolean;
  /** the wet crash: a flattened ripple ellipse (never a dry ring) */
  wet?: boolean;
  /** splash silhouette: a droplet (or the card's own device) blown in half */
  glyph?: ReactNode;
  /** placement in stage percent (one cell = 7.142857; cast centre = 50) */
  x?: number;
  y?: number;
  s?: number;
  /** stage the beat on the aim vector (art points +x) instead of upright */
  aim?: boolean;
  /** slide the beat to the victim's distance along the vector (--fx-len) */
  len?: boolean;
}

/** hex "#rrggbb" -> the "r g b" triple --imp-rgb wants. */
function impRgb(hex: string): string {
  return `${parseInt(hex.slice(1, 3), 16)} ${parseInt(hex.slice(3, 5), 16)} ${parseInt(hex.slice(5, 7), 16)}`;
}

/** Splash silhouettes, painted in the card's own palette. */
function impGlyph(path: string, fill: string, stroke: string): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
      <path d={path} fill={fill} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** The impact composite: spout + wet crash, staged on the card's surface. */
function ImpactBeat({ imp, delayMs }: { imp: Imp; delayMs: number }) {
  const s = imp.s ?? 7.2;
  const x = imp.x ?? 50;
  const y = imp.y ?? 50;
  const lenShift = imp.len ? " + var(--fx-len, 3) * 7.142857%" : "";
  const inner = (
    <span className="g43-impactbed absolute inset-0 block">
      <span
        className="absolute block"
        style={{
          left: `calc(${x - s / 2}%${lenShift})`,
          top: `${y - s / 2}%`,
          width: `${s}%`,
          height: `${s}%`,
        }}
      >
        {imp.laser && <LaserStrike />}
        {imp.glyph != null && <PieceShatter glyph={imp.glyph} />}
      </span>
      {imp.wet && (
        <span
          className="absolute block"
          style={{
            left: `calc(${x - s}%${lenShift})`,
            top: `${y - s * 0.2}%`,
            width: `${s * 2}%`,
            height: `${s * 0.8}%`,
          }}
        >
          <Shockwave />
        </span>
      )}
    </span>
  );
  return imp.aim ? <AimStage>{inner}</AimStage> : <BoardWideStage>{inner}</BoardWideStage>;
}

/** Wrap a card's Render: leads gain the quake wrapper plus the impact beat. */
function withImpact(Render: SigPlugin["Render"], imp: Imp): SigPlugin["Render"] {
  function ImpactLead(props: { lead: boolean; role: SigRole; delayMs: number }) {
    if (props.role !== "lead") return <Render {...props} />;
    return (
      <span
        className="g43-quakecell absolute inset-0 block"
        style={impactVars(impRgb(imp.tint), (props.delayMs + imp.at) / 1000)}
      >
        <Render {...props} />
        <ImpactBeat imp={imp} delayMs={props.delayMs} />
      </span>
    );
  }
  return ImpactLead;
}

/* Per-card cue sheet: each crash lands on ITS scene's strike beat, at ITS
   waterline, in ITS palette - no two siblings share a beat + combo. */
const IMPACTS: Record<string, Imp> = {
  // the ice lets go: a floe is blown in half, spray and slush
  op_river_breakup: { at: 560, tint: "#cfe7f2", glyph: impGlyph(RB_FLOE, "#cfe7f2", "#16303f"), wet: true, y: 52 },
  // the sip lands: the water-break droplet bursts on the tongue of the line
  op_second_wind_sip: { at: 520, tint: "#7fc6d8", glyph: impGlyph(DROP, "#7fc6d8", "#4a3a1e"), wet: true, y: 52 },
  // the rain check is CASHED: the first sheet of rain slams down
  ov_rain_check: { at: 480, tint: "#9ec9e8", laser: true, wet: true, y: 50 },
  // another seam opens: the bilge droplet blows apart at the waterline
  hx4_leaking_boats: { at: 470, tint: "#8fb6c8", glyph: impGlyph(DROP, "#8fb6c8", "#2b2118"), wet: true, y: 55 },
  // the rogue river takes the bank: a wide, violent wet crash
  hx4_rogue_river: { at: 430, tint: "#6fb9d6", laser: true, wet: true, y: 54, s: 8.6 },
  // the blessing column strikes the stoup and the water leaps
  bn4_holy_water: { at: 470, tint: "#f0d089", laser: true, wet: true, y: 50, s: 6.4 },
  // the jam BREAKS: the key log is snapped in half, spray everywhere
  bn4_logjam: { at: 560, tint: "#b58a52", glyph: impGlyph(LJ_LOG, "#b58a52", "#23301f"), wet: true, y: 52 },
  // high water slams the mark: crest boom along the gauge
  hx4_high_water: { at: 500, tint: "#7fc8d8", laser: true, wet: true, y: 48, s: 8.8 },
  // the watch bell hits the river: patrol splash at the crossing
  hx4_river_watch: { at: 580, tint: "#9fb0bd", laser: true, wet: true, y: 52, s: 6.4 },
  // THE CREST LANDS: the great flood's wall comes down full-weight
  ov_great_flood: { at: 520, tint: "#6fc4de", laser: true, wet: true, y: 52, s: 10 },
  // the mark is painted by force: the survey slap at the high line
  ov_high_water_mark: { at: 520, tint: "#d8c9a6", laser: true, wet: true, y: 46, s: 6.6 },
  // the tar front slaps down: a heavy, black-gold wet crash
  hx4_tar_flood: { at: 520, tint: "#d8963f", laser: true, wet: true, y: 54, s: 9 },
  // both flanks go under at once: the channel crash between them
  hx4_flooded_flanks: { at: 480, tint: "#86c8a0", laser: true, wet: true, y: 52, s: 8 },
  // the treacle lands THICK: a slow, wide, syrup boom
  hx4_treacle_tide: { at: 520, tint: "#c98b30", laser: true, wet: true, y: 54, s: 8.4 },
  // the pawn tide hits the beach: rank-wide wet crash
  bn4_tide_of_pawns: { at: 560, tint: "#c8b48a", laser: true, wet: true, y: 54, s: 9 },
  // a thousand ducks hit the pond: the lead decoy bursts the surface
  ov_thousand_ducks: { at: 560, tint: "#f2c53d", glyph: impGlyph(TD_BODY, "#f2c53d", "#1d3a4a"), wet: true, y: 54 },
  // the pace is set: the ford droplet bursts underfoot
  op_walking_pace: { at: 520, tint: "#cbb185", glyph: impGlyph(DROP, "#cbb185", "#1f3b46"), wet: true, y: 55 },
  // the net comes up empty and SLAMS the water flat
  hx4_no_easy_pickings: { at: 500, tint: "#c9a86a", laser: true, wet: true, y: 52, s: 7.6 },
  // the cast lands ON the king's square: line-strike at --fx-len
  bn4_fisherman_king: { at: 520, tint: "#b9895a", laser: true, wet: true, aim: true, len: true, s: 6 },
  // kinged by force: the double-stack SLAMS down the jump line
  hx4_checkers_law: { at: 560, tint: "#cfd8de", laser: true, wet: true, aim: true, len: true, s: 6.4 },
  // the fee chest hits the dock: coin-heavy wet boom
  hx4_dockmasters_fee: { at: 520, tint: "#e0b64a", laser: true, wet: true, y: 54, s: 7 },
  // the old law is read: the tablet column strikes the shallows
  hx4_old_laws: { at: 520, tint: "#b8b0a0", laser: true, wet: true, y: 50, s: 6.8 },
  // the order freezes mid-signal: the flag hits the water instead
  hx4_command_paralysis: { at: 520, tint: "#e6ddc6", laser: true, wet: true, y: 52, s: 6.2 },
  // the haven chain drops across the mouth: harbor-bar crash
  bn4_haven_law: { at: 580, tint: "#9aa8ae", laser: true, wet: true, y: 52, s: 8.2 },
  // the champion vaults the rail and lands in the surf, sword down
  bn4_kings_champion: { at: 460, tint: "#e6c46a", laser: true, wet: true, y: 54, s: 7.8 },
  // the king's wings skim and STRIKE at the escort point
  bn4_kings_own_wings: { at: 520, tint: "#9fd2e8", laser: true, wet: true, aim: true, len: true, s: 6 },
  // the anchor of command is dropped ON the queen: iron splash
  hx4_burden_of_command: { at: 520, tint: "#98a6b2", glyph: impGlyph(BC_ANCHOR, "#98a6b2", "#12232e"), wet: true, y: 52 },
  // the horn blast flattens the harbor: sound-slap on the water
  op_harbor_horn: { at: 520, tint: "#d9a441", laser: true, wet: true, y: 50, s: 7.4 },
  // curfew sounds: the last wake is slapped flat at the quay
  hx4_curfew_horn: { at: 520, tint: "#c85f3a", laser: true, wet: true, y: 48, s: 6.8 },
  // the polish bucket tips: the parade ground gets its mirror coat
  bn4_parade_polish: { at: 520, tint: "#e2b455", laser: true, wet: true, y: 54, s: 6.4 },
  // the recruit is dunked: the initiation droplet bursts overhead
  bn4_green_recruit: { at: 520, tint: "#96c86a", glyph: impGlyph(DROP, "#96c86a", "#24361f"), wet: true, y: 50 },
  // the milk churn tips off the cart: a white crash on the step
  ov_milkmans_round: { at: 460, tint: "#b6c6cf", laser: true, wet: true, y: 54, s: 7 },
  // the muster is silenced: the signal drum hits the wet ground
  hx4_muster_silence: { at: 520, tint: "#a8b6a0", laser: true, wet: true, y: 52, s: 6.6 },
  // the cornucopia UPENDS: the horn's flood hits the table
  bn4_cornucopia: { at: 600, tint: "#cbd8dd", laser: true, wet: true, y: 52, s: 8 },
  // the sign goes down and SO DOES SOMEONE: slapstick wet crash
  op_wet_floor_sign: { at: 500, tint: "#7fb6d0", glyph: impGlyph(DROP, "#7fb6d0", "#223244"), wet: true, y: 56 },
  // the secret changes hands mid-stream: the drop point splashes
  bn4_trade_secret: { at: 540, tint: "#8fc9a8", laser: true, wet: true, y: 52, s: 6 },
  // three balls and a deal: the pledge chest splashes into the till
  bn4_pawnbrokers_deal: { at: 500, tint: "#d9b45a", laser: true, wet: true, y: 52, s: 6.6 },
  // the gavel falls on the private lot: dockside boom
  bn4_private_auction: { at: 520, tint: "#b0722f", laser: true, wet: true, y: 50, s: 7.2 },
  // the velvet rope drops its brass end into the puddle
  bn4_velvet_queue: { at: 560, tint: "#b2415a", laser: true, wet: true, y: 54, s: 6.2 },
  // the dead man's boots hit the deck, heels together
  hx4_dead_mans_boots: { at: 480, tint: "#6e7c84", laser: true, wet: true, y: 55, s: 6.8 },
  // the lantern sets down on the water at the pawn's reach
  ov_lantern_festival: { at: 520, tint: "#f0a24a", laser: true, wet: true, aim: true, len: true, s: 6 },
  // the ancestors answer: the offering bowl overturns in the shallows
  ov_ancestral_audience: { at: 470, tint: "#a9d8d0", laser: true, wet: true, y: 52, s: 6.6 },
};

for (const [id, imp] of Object.entries(IMPACTS)) {
  const play = PLAYS[id];
  if (play) PLAYS[id] = { config: play.config, Render: withImpact(play.Render, imp) };
}
