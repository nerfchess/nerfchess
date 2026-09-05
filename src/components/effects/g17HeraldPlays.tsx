// g17HeraldPlays — bespoke plays for the 24 rule / edict cards that used to
// share the generated `scrollUnfurl` family (one unrolling scroll, 24 hue
// shifts).
//
// MODULE FICTION: THE HERALD AND THE CROWD. A rule here is never WRITTEN, it is
// ANNOUNCED, and the scene is the moment it reaches people. A town crier's
// handbell and the first three words. A herald's tabard shaken out before he
// speaks. A drum roll cut off dead so the square can go quiet. Three notes off a
// balcony trumpet. A price slate hoisted over the heads at the market cross. A
// proclamation read from horseback, and the horse turning at the end of it. The
// fair-day glove going up its pole. Hats coming off in a wave down a line of
// reapers. A bellman's lantern raised at each corner in turn. Nothing is nailed
// up, sealed, stamped, signed, witnessed, docketed, torn or shredded: the words
// leave a mouth and travel.
//
// Because the whole module is about a message COVERING GROUND, the geometry
// vars do the heavy lifting. Half the cards are aim-staged: the crier stands
// upright on the cast square (a plain <BoardWideStage> layer) while the thing
// that travels — the cry front, the courier's chit, the shutters going down the
// row, the measuring cord — rides <AimStage> and covers --fx-len REAL cells.
// The cast-staged cards use --fx-heard (a cry ring sized by --fx-len), the
// caster's own side (--fx-side) and the lean off the board centre (--fx-ox/oy).
// Every per-square hit reads --fx-index, so a word that is second in the victim
// order visibly arrives from further back than the first.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g17HeraldPlays.css), transform/opacity animations only, no imports from
// BoardEffects.tsx, only the SigPlugin/SigRole TYPES from sigPlugins.tsx.
//
// Every scene runs three beats — tell, strike, settle — in all three roles
// ("lead", "target", "entrance"). All CSS lives in g17HeraldPlays.css behind
// the `g17-` prefix.

import "./g17HeraldPlays.css";

import type { CSSProperties, ReactNode } from "react";
import type { SigPlugin, SigRole } from "./sigPlugins";
import { AimStage, BoardFrame, BoardWideStage } from "./stage";
import { LaserStrike, PieceShatter, Shockwave, QUAKE_CLASS, impactVars } from "./impact/impact";

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
const rootStyle = (d: number): CSSProperties => ({ "--g17-d": `${d}ms` }) as CSSProperties;

/** stagger + a beat offset, scaled by the Settings animation-speed var. */
const off = (ms: number): string => `calc(var(--g17-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

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
      style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, animationDelay: off(d), ...st }}
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
      style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, animationDelay: off(d), ...st }}
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

/** Cast-anchored lead: action on the cast square, `frame` over the board. */
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

/**
 * Aim-anchored lead for an announcement: the person stays UPRIGHT on the cast
 * square, the message travels.
 *
 * `frame` is board-scale and lives in <BoardFrame>. `upright` stages on the
 * cast square without the aim rotation, so a crier, a bell yoke or a pair of
 * raised hands never lies on its side. `children` ride <AimStage> and are
 * authored pointing RIGHT, so the cry front, the courier and the row of
 * shutters run down the real source -> target vector.
 */
function CryLead({
  d, frame, upright, children,
}: { d: number; frame?: ReactNode; upright?: ReactNode; children: ReactNode }) {
  return (
    <span className={ROOT} style={rootStyle(d)} aria-hidden="true">
      <BoardWideStage>
        {frame ? <BoardFrame>{frame}</BoardFrame> : null}
        {upright}
      </BoardWideStage>
      <AimStage>{children}</AimStage>
    </span>
  );
}

/** Board-wide wash, always inside a BoardFrame. Drifts off the board centre. */
function Wash({ tone, d = 0 }: { tone: string; d?: number }) {
  return <L c="g17-wash" d={d} st={{ background: `radial-gradient(circle at 50% 48%, ${tone}, transparent 70%)` }} />;
}

/** Board-edge gilt, always inside a BoardFrame. */
function Rim({ tone, d = 160 }: { tone: string; d?: number }) {
  return <L c="g17-rim" d={d} st={{ boxShadow: `inset 0 0 30px 9px ${tone}` }} />;
}

/* Shared silhouettes: the people an announcement is made TO. Every card dresses
   them with a different central object, never with a different hue alone. */
const HEAD = "M12 4a3.3 3.3 0 1 1 0 6.6A3.3 3.3 0 0 1 12 4zM5.6 21.4v-3.1c0-2.6 2.9-4.2 6.4-4.2s6.4 1.6 6.4 4.2v3.1z";
const HAT = "M3.6 17.4h16.8v2.2H3.6zM7.2 17.4V9.4c0-2.7 1.9-4.5 4.8-4.5s4.8 1.8 4.8 4.5v8z";
const HAND =
  "M8.4 21.6V11.2c0-1.4 2.1-1.4 2.1 0V6c0-1.5 2.2-1.5 2.2 0v5.2c0-1.4 2.1-1.4 2.1 0V9c0-1.4 2.1-1.4 2.1 0v7c0 3.4-2 5.6-5.2 5.6z";
const CRIER =
  "M12 2.6a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2zM6.6 21.4l1.1-9c.3-2.2 2-3.4 4.3-3.4s4 1.2 4.3 3.4l1.1 9z";

/* --- 1. Market Lane (t1) — THE MEASURE CALLED AT THE MARKET CROSS -----------
   The stone cross of the market takes the square, the brass ell-rod is struck
   flat against its standard, and the price boards flip face-out down the lane
   in the order the lane runs. Palette: #d8b45c / #fff2d2 / #2a2313. */
function MarketLaneScene({ role, delayMs }: SceneProps) {
  const cross = (
    <g {...SJ}>
      <path d="M10.4 22V8.2H5.8L12 1.8l6.2 6.4h-4.6V22z" fill="#d8b45c" stroke="#2a2313" strokeWidth="1.1" />
      <path d="M5.2 21.6h13.6v2.2H5.2z" fill="#2a2313" />
    </g>
  );
  const rod = (
    <g stroke="#fff2d2" {...SJ} fill="none">
      <path d="M1.6 12h20.8" strokeWidth="1.8" />
      <path d="M7 9.8v4.4M12 9.8v4.4M17 9.8v4.4" strokeWidth="1.1" />
    </g>
  );
  const board = (
    <g {...SJ}>
      <path d="M4 5.6h16v12H4z" fill="#2a2313" stroke="#d8b45c" strokeWidth="1.3" />
      <path d="M7 9.6h10M7 13h6" stroke="#fff2d2" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g17-ml-cross" l={26} t={8} w={48} h={72} d={40}>{cross}</V>
        <V c="g17-ml-rod" l={8} t={40} w={84} h={26} d={240}>{rod}</V>
        <V c="g17-ent-drop" l={30} t={44} w={40} h={40} d={470}>{board}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hitorder" l={20} t={20} w={60} h={56} d={0}>{board}</V>
        <V c="g17-hit" l={6} t={44} w={88} h={22} d={150}>{rod}</V>
        <L c="g17-hit2" l={46} t={74} w={8} h={8} d={260} st={{ borderRadius: "50%", background: "#fff2d2" }} />
      </Cut>
    );
  }
  return (
    <CryLead
      d={delayMs}
      frame={<><Wash tone="rgba(216,180,92,0.28)" /><Rim tone="rgba(255,242,210,0.3)" d={200} /></>}
      upright={
        <>
          <V c="g17-ml-cross" l={44} t={35} w={12} h={20} d={60}>{cross}</V>
          <V c="g17-ml-rod" l={40} t={44} w={20} h={7} d={240}>{rod}</V>
          <L c="g17-leanshadow" l={41} t={55} w={18} h={3} d={640} st={{ borderRadius: "999px", background: "rgba(42,35,19,0.6)" }} />
        </>
      }
    >
      <L c="g17-cry" l={50} t={49} w={30} h={1.8} d={380} st={{ background: "linear-gradient(90deg, #fff2d2, rgba(216,180,92,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      {[0, 1, 2].map((i) => (
        <V key={i} c="g17-ml-board" l={52 + i * 6} t={44} w={5} h={6} d={470 + i * 130}>{board}</V>
      ))}
      <L c="g17-glint" l={53} t={42} w={2.2} h={2.2} d={760} st={{ borderRadius: "50%", background: "#fff2d2" }} />
    </CryLead>
  );
}

/* --- 2. Meet Kevin (t1) — OYEZ, AND A NAME -----------------------------------
   The crier's handbell swings twice, three word-bars land in the order they are
   spoken, and the name board comes up over his head while one listener steps in
   from the caster's own side. Palette: #ffcf5c / #fff4d6 / #2f2410. */
function MeetKevinScene({ role, delayMs }: SceneProps) {
  const bell = (
    <g {...SJ}>
      <path d="M12 3.2a1.7 1.7 0 0 1 1.7 1.7v.9c2.6 1.1 4.3 3.7 4.3 7.1v4.3H6v-4.3c0-3.4 1.7-6 4.3-7.1v-.9A1.7 1.7 0 0 1 12 3.2z" fill="#ffcf5c" stroke="#2f2410" strokeWidth="1.1" />
      <path d="M4.8 17.2h14.4v2.1H4.8z" fill="#2f2410" />
      <path d="M12 19.6v2.4" stroke="#fff4d6" strokeWidth="1.5" />
    </g>
  );
  const nameBoard = (
    <g {...SJ}>
      <path d="M2.4 6.4h19.2v11.2H2.4z" fill="#2f2410" stroke="#ffcf5c" strokeWidth="1.3" />
      <path d="M5.6 11h12.8M5.6 14.2h8.4" stroke="#fff4d6" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g17-mk-bell" l={28} t={6} w={44} h={58} d={40} st={{ transformOrigin: "50% 12%" }}>{bell}</V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g17-mk-oyez" l={14 + i * 24} t={70} w={18} h={5} d={250 + i * 110} st={{ borderRadius: "999px", background: "#ffcf5c" }} />
        ))}
        <V c="g17-ent-pop" l={18} t={30} w={64} h={34} d={540}>{nameBoard}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hitorder" l={22} t={10} w={56} h={58} d={0} st={{ transformOrigin: "50% 12%" }}>{bell}</V>
        <L c="g17-hit2" l={20} t={74} w={60} h={5} d={150} st={{ borderRadius: "999px", background: "#ffcf5c" }} />
        <V c="g17-hit" l={24} t={34} w={52} h={26} d={260}>{nameBoard}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(255,207,92,0.28)" /><Rim tone="rgba(255,244,214,0.3)" d={200} /></>}>
      <V c="g17-mk-bell" l={44} t={36} w={12} h={16} d={60} st={{ transformOrigin: "50% 12%" }}>{bell}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g17-mk-oyez" l={44 + i * 5} t={53} w={4} h={1.8} d={230 + i * 120} st={{ borderRadius: "999px", background: "#ffcf5c" }} />
      ))}
      <V c="g17-mk-name" l={42} t={30} w={16} h={9} d={510}>{nameBoard}</V>
      <V c="g17-sideturn" l={37} t={44} w={7} h={10} d={620}><path d={HEAD} fill="#fff4d6" /></V>
      <L c="g17-glint" l={55} t={38} w={2.2} h={2.2} d={740} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 3. Nesting Doll (t1) — THE CRY REPEATED, SMALLER AND FURTHER ------------
   One crier calls it, a second crier further down the run repeats it a beat
   later at half the size, and a third smaller still answers from the far end of
   the real distance. Palette: #e08a6a / #ffe8cf / #331a12. */
function NestingDollScene({ role, delayMs }: SceneProps) {
  const crier = (tone: string) => (
    <g {...SJ}>
      <path d={CRIER} fill={tone} stroke="#331a12" strokeWidth="1.1" />
      <path d="M15.4 9.6c2.4 1 3.6 2.8 3.6 5.4" fill="none" stroke="#ffe8cf" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g17-nd-near" l={6} t={16} w={44} h={66} d={40}>{crier("#e08a6a")}</V>
        <V c="g17-nd-mid" l={46} t={28} w={32} h={48} d={260}>{crier("#ffe8cf")}</V>
        <V c="g17-ent-pop" l={76} t={40} w={20} h={30} d={480}>{crier("#e08a6a")}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hitorder" l={14} t={14} w={50} h={66} d={0}>{crier("#e08a6a")}</V>
        <V c="g17-hit" l={54} t={30} w={34} h={46} d={150}>{crier("#ffe8cf")}</V>
        <L c="g17-hit2" l={44} t={80} w={12} h={5} d={270} st={{ borderRadius: "999px", background: "#331a12" }} />
      </Cut>
    );
  }
  return (
    <CryLead
      d={delayMs}
      frame={<Wash tone="rgba(224,138,106,0.28)" />}
      upright={<V c="g17-nd-near" l={44} t={40} w={11} h={15} d={70}>{crier("#e08a6a")}</V>}
    >
      <L c="g17-cry" l={50} t={48} w={30} h={1.6} d={230} st={{ background: "linear-gradient(90deg, #ffe8cf, rgba(224,138,106,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g17-nd-mid" l={55} t={43} w={7} h={10} d={400}>{crier("#ffe8cf")}</V>
      <V c="g17-relayfar" l={50} t={45} w={5} h={7} d={580}>{crier("#e08a6a")}</V>
      <L c="g17-mote" l={57} t={44} w={1.8} h={1.8} d={720} st={{ borderRadius: "50%", background: "#ffe8cf" }} />
      <L c="g17-glint" l={52} t={41} w={2.2} h={2.2} d={820} st={{ borderRadius: "50%", background: "#ffe8cf" }} />
    </CryLead>
  );
}

/* --- 4. Opposition Research (t1) — THE EAR TRUMPET AT THE BACK ---------------
   The words go out over the crowd as three flat dashes; at the back of it a
   hooded figure tips an ear trumpet up to catch them and writes the answer in a
   pocket book. Palette: #9fc0d8 / #f7ead2 / #16232e. */
function OppositionResearchScene({ role, delayMs }: SceneProps) {
  const trumpet = (
    <g {...SJ}>
      <path d="M2.6 12.4l10-5.6v10.8z" fill="#9fc0d8" stroke="#16232e" strokeWidth="1.1" />
      <path d="M12.6 9.4h6.2a2.6 2.6 0 0 1 0 5.2h-6.2z" fill="#16232e" stroke="#9fc0d8" strokeWidth="1" />
    </g>
  );
  const hooded = (
    <g {...SJ}>
      <path d="M12 2.8c3.4 0 5.4 2.4 5.4 5.6L16.6 21.4H7.4L6.6 8.4c0-3.2 2-5.6 5.4-5.6z" fill="#16232e" stroke="#9fc0d8" strokeWidth="1.1" />
      <path d="M9.4 8.6h5.2" stroke="#f7ead2" strokeWidth="1.1" />
    </g>
  );
  const book = (
    <g {...SJ}>
      <path d="M3.4 5.6h17.2v13H3.4z" fill="#f7ead2" stroke="#16232e" strokeWidth="1.1" />
      <path d="M12 5.6v13M6.4 9.4h3.4M14.4 9.4h3.4M6.4 12.6h3.4" stroke="#16232e" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g17-er-hood" l={8} t={14} w={44} h={70} d={40}>{hooded}</V>
        <V c="g17-er-ear" l={44} t={20} w={48} h={38} d={250} st={{ transformOrigin: "12% 60%" }}>{trumpet}</V>
        <V c="g17-ent-drop" l={48} t={54} w={44} h={34} d={470}>{book}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hitorder" l={10} t={26} w={62} h={44} d={0} st={{ transformOrigin: "12% 60%" }}>{trumpet}</V>
        <V c="g17-hitside" l={28} t={16} w={44} h={68} d={150}>{hooded}</V>
        <L c="g17-hit2" l={46} t={76} w={8} h={8} d={270} st={{ borderRadius: "50%", background: "#f7ead2" }} />
      </Cut>
    );
  }
  return (
    <CryLead
      d={delayMs}
      frame={<><Wash tone="rgba(159,192,216,0.26)" /><Rim tone="rgba(247,234,210,0.28)" d={220} /></>}
      upright={
        <>
          <V c="g17-er-hood" l={43} t={40} w={10} h={14} d={70}>{hooded}</V>
          <V c="g17-er-ear" l={51} t={39} w={11} h={8} d={280} st={{ transformOrigin: "12% 60%" }}>{trumpet}</V>
          <V c="g17-er-book" l={53} t={49} w={9} h={7} d={620}>{book}</V>
        </>
      }
    >
      {[0, 1, 2].map((i) => (
        <L key={i} c="g17-carryfar" l={50} t={45 + i * 3} w={7} h={1.4} d={380 + i * 120} st={{ borderRadius: "999px", background: "#f7ead2" }} />
      ))}
      <L c="g17-mote" l={54} t={44} w={1.8} h={1.8} d={760} st={{ borderRadius: "50%", background: "#9fc0d8" }} />
    </CryLead>
  );
}

/* --- 5. Penny Slots (t1) — THE HAWKER'S RATTLE -------------------------------
   A wooden fairground rattle is whirled round its handle, the two blades clack
   over the ratchet, the pitch goes out in three short bars and one onlooker
   drifts in from the caster's side. Palette: #e6a23c / #fff0cc / #2b1c0c. */
function PennySlotsScene({ role, delayMs }: SceneProps) {
  const ratchet = (
    <g {...SJ}>
      <path d="M11 12.6h2v9.4h-2z" fill="#2b1c0c" />
      <path d="M12 3.4l2.2 1.6 2.4-.8.6 2.5 2.3 1.1-1.4 2.1 1.4 2.1-2.3 1.1-.6 2.5-2.4-.8L12 18.5l-2.2-1.6-2.4.8-.6-2.5L4.5 14l1.4-2.1L4.5 9.8l2.3-1.1.6-2.5 2.4.8z" fill="#e6a23c" stroke="#2b1c0c" strokeWidth="1" />
      <circle cx="12" cy="11.9" r="2.4" fill="#fff0cc" />
    </g>
  );
  const blade = <path d="M2.4 8.4h17.2l2.2 3.4-2.2 3.4H2.4z" fill="#fff0cc" stroke="#2b1c0c" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g17-ra-whirl" l={24} t={12} w={52} h={60} d={40}>{ratchet}</V>
        <V c="g17-ra-blade" l={10} t={44} w={44} h={26} d={260} st={{ transformOrigin: "88% 50%" }}>{blade}</V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g17-ra-call" l={16 + i * 24} t={78} w={16} h={5} d={470 + i * 110} st={{ borderRadius: "999px", background: "#e6a23c" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hitorder" l={20} t={16} w={60} h={60} d={0}>{ratchet}</V>
        <V c="g17-hit" l={8} t={44} w={48} h={26} d={150} st={{ transformOrigin: "88% 50%" }}>{blade}</V>
        <L c="g17-hit2" l={26} t={80} w={48} h={4} d={270} st={{ borderRadius: "999px", background: "#fff0cc" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(230,162,60,0.28)" /><Rim tone="rgba(255,240,204,0.3)" d={200} /></>}>
      <V c="g17-ra-whirl" l={44} t={37} w={12} h={16} d={60}>{ratchet}</V>
      <V c="g17-ra-blade" l={37} t={44} w={10} h={6} d={250} st={{ transformOrigin: "88% 50%" }}>{blade}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g17-ra-call" l={44 + i * 5} t={55} w={4} h={1.8} d={420 + i * 120} st={{ borderRadius: "999px", background: "#e6a23c" }} />
      ))}
      <L c="g17-heardfar" l={41} t={38} w={18} h={18} d={560} st={{ borderRadius: "50%", border: "2px solid #fff0cc" }} />
      <V c="g17-sideturn" l={56} t={44} w={7} h={10} d={660}><path d={HEAD} fill="#fff0cc" /></V>
      <L c="g17-glint" l={49} t={36} w={2.2} h={2.2} d={780} st={{ borderRadius: "50%", background: "#fff0cc" }} />
    </Lead>
  );
}

/* --- 6. Plush Pony (t1) — READ FROM HORSEBACK, AND THE HORSE TURNS -----------
   A hoof stamps the boards, the rider carries the reading the whole real length
   of the run with the scroll held out at arm's length, and at the far end the
   horse turns on the spot. Palette: #d9a2b8 / #fff1de / #33202a. */
function PlushPonyScene({ role, delayMs }: SceneProps) {
  const horse = (
    <g {...SJ}>
      <path d="M3.4 20.6l1.6-7.4c.6-2.8 2.8-4.4 6-4.4h3l3.4-4.4 1.6 1.2-1.8 3.9c1.8.9 2.6 2.4 2.6 4.4v6.7h-2.4v-5.2h-8.6l-1 5.2z" fill="#d9a2b8" stroke="#33202a" strokeWidth="1.1" />
      <path d="M17.4 7.6l1.4-2.4" stroke="#fff1de" strokeWidth="1.1" />
    </g>
  );
  const rider = (
    <g {...SJ}>
      <path d="M12 3a2.4 2.4 0 1 1 0 4.8A2.4 2.4 0 0 1 12 3zM8.4 18.6l1-8c.2-1.8 1.4-2.8 2.8-2.8s2.6 1 2.8 2.8l1 8z" fill="#33202a" stroke="#fff1de" strokeWidth="1" />
    </g>
  );
  const scroll = (
    <g {...SJ}>
      <path d="M4.6 6.4h14.8v11.2H4.6z" fill="#fff1de" stroke="#33202a" strokeWidth="1.1" />
      <path d="M7.6 10h8.8M7.6 13.2h6" stroke="#33202a" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g17-pp-horse" l={4} t={34} w={62} h={54} d={40}>{horse}</V>
        <V c="g17-ent-rise" l={26} t={6} w={34} h={44} d={250}>{rider}</V>
        <V c="g17-pp-scroll" l={56} t={30} w={40} h={36} d={470}>{scroll}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hitorder" l={6} t={30} w={70} h={54} d={0}>{horse}</V>
        <V c="g17-hit" l={40} t={20} w={44} h={40} d={150}>{scroll}</V>
        <L c="g17-hit2" l={20} t={82} w={56} h={4} d={270} st={{ borderRadius: "999px", background: "#33202a" }} />
      </Cut>
    );
  }
  return (
    <CryLead
      d={delayMs}
      frame={<Wash tone="rgba(217,162,184,0.28)" />}
      upright={
        <>
          <L c="g17-pp-dust" l={42} t={54} w={16} h={3.4} d={60} st={{ borderRadius: "999px", background: "rgba(51,32,42,0.65)" }} />
          <V c="g17-pp-scroll" l={52} t={36} w={9} h={8} d={520}>{scroll}</V>
        </>
      }
    >
      <V c="g17-carryfar" l={46} t={42} w={9} h={12} d={230}>{horse}</V>
      <V c="g17-pp-ride" l={47.5} t={36} w={6} h={8} d={260}>{rider}</V>
      <V c="g17-relayfar" l={50} t={42} w={7} h={10} d={640}>{horse}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g17-sift" l={48 + i * 5} t={52} w={1.6} h={1.6} d={720 + i * 100} st={{ borderRadius: "50%", background: "#fff1de" }} />
      ))}
    </CryLead>
  );
}

/* --- 7. Price Check (t1) — THE SLATE HOISTED OVER THE HEADS ------------------
   Two hands walk a slate up its pole above the crowd, the figures come up on it
   a stroke at a time, and three heads tip back to read them.
   Palette: #a9c8a0 / #fdf3d8 / #1d2a1a. */
function PriceCheckScene({ role, delayMs }: SceneProps) {
  const slate = (
    <g {...SJ}>
      <path d="M2.6 4.4h18.8v13.2H2.6z" fill="#1d2a1a" stroke="#a9c8a0" strokeWidth="1.3" />
      <path d="M4.8 6.6h14.4v8.8H4.8z" fill="none" stroke="#a9c8a0" strokeWidth="0.8" />
    </g>
  );
  const figures = (
    <g stroke="#fdf3d8" strokeWidth="1.8" fill="none" {...SJ}>
      <path d="M5.4 8.6v6.8M9.6 8.6h3.4v3.4H9.6v3.4h3.4M17 8.6v6.8M15.4 12h3.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g17-pc-pole" l={47} t={16} w={5} h={74} d={40} st={{ background: "#a9c8a0", transformOrigin: "50% 100%" }} />
        <V c="g17-pc-slate" l={12} t={12} w={76} h={50} d={250}>{slate}</V>
        <V c="g17-ent-pop" l={18} t={20} w={64} h={34} d={480}>{figures}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hitorder" l={14} t={16} w={72} h={46} d={0}>{slate}</V>
        <V c="g17-hit" l={20} t={24} w={60} h={30} d={150}>{figures}</V>
        <L c="g17-hit2" l={44} t={72} w={12} h={12} d={270} st={{ borderRadius: "50%", background: "#a9c8a0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(169,200,160,0.26)" /><Rim tone="rgba(253,243,216,0.28)" d={200} /></>}>
      <L c="g17-pc-pole" l={49.2} t={36} w={1.6} h={20} d={60} st={{ background: "#a9c8a0", transformOrigin: "50% 100%" }} />
      <V c="g17-pc-slate" l={42} t={32} w={16} h={11} d={240}>{slate}</V>
      <V c="g17-pc-fig" l={43.5} t={34} w={13} h={7} d={430}>{figures}</V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g17-pc-tip" l={41 + i * 8} t={48} w={7} h={10} d={560 + i * 120} st={{ transformOrigin: "50% 90%" }}>
          <path d={HEAD} fill="#fdf3d8" />
        </V>
      ))}
      <L c="g17-leanshadow" l={42} t={58} w={17} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(29,42,26,0.6)" }} />
    </Lead>
  );
}

/* --- 8. Prophecy Fulfilled (t1) — THREE NOTES OFF THE BALCONY ----------------
   The balustrade lights along its balusters, a straight herald's trumpet with
   its pennon comes up over the rail, and it blows three notes that go out to
   the real distance one after another. Palette: #ffd27a / #fff4d6 / #2c2208. */
function ProphecyFulfilledScene({ role, delayMs }: SceneProps) {
  const rail = (
    <g {...SJ}>
      <path d="M1.6 6.4h20.8v2.4H1.6zM1.6 18.4h20.8v2.6H1.6z" fill="#ffd27a" stroke="#2c2208" strokeWidth="0.9" />
      <path d="M5 8.8v9.6M9.6 8.8v9.6M14.4 8.8v9.6M19 8.8v9.6" stroke="#ffd27a" strokeWidth="1.4" />
    </g>
  );
  const trumpet = (
    <g {...SJ}>
      <path d="M1.8 10.6h13.4l5.8-3.4v9.6l-5.8-3.4H1.8z" fill="#ffd27a" stroke="#2c2208" strokeWidth="1.1" />
      <path d="M8.4 12.6h7.2v6.6l-3.6-2-3.6 2z" fill="#fff4d6" stroke="#2c2208" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g17-pf-rail" l={4} t={54} w={92} h={40} d={40}>{rail}</V>
        <V c="g17-pf-horn" l={10} t={16} w={80} h={44} d={250} st={{ transformOrigin: "8% 70%" }}>{trumpet}</V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g17-pf-note" l={62 + i * 11} t={26} w={7} h={7} d={470 + i * 110} st={{ borderRadius: "50%", background: "#fff4d6" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hitorder" l={8} t={26} w={80} h={44} d={0} st={{ transformOrigin: "8% 70%" }}>{trumpet}</V>
        <V c="g17-hit" l={6} t={62} w={88} h={32} d={150}>{rail}</V>
        <L c="g17-hit2" l={44} t={16} w={12} h={12} d={270} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <CryLead
      d={delayMs}
      frame={<><Wash tone="rgba(255,210,122,0.28)" /><Rim tone="rgba(255,244,214,0.32)" d={200} /></>}
      upright={
        <>
          <V c="g17-pf-rail" l={40} t={49} w={22} h={9} d={60}>{rail}</V>
          <V c="g17-pf-horn" l={43} t={38} w={16} h={9} d={250} st={{ transformOrigin: "8% 70%" }}>{trumpet}</V>
        </>
      }
    >
      <L c="g17-cry" l={50} t={45} w={30} h={1.6} d={430} st={{ background: "linear-gradient(90deg, #fff4d6, rgba(255,210,122,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g17-pf-note" l={51} t={43} w={2.6} h={2.6} d={470 + i * 130} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
      <L c="g17-glint" l={57} t={41} w={2.4} h={2.4} d={780} st={{ borderRadius: "50%", background: "#ffd27a" }} />
    </CryLead>
  );
}

/* --- 9. Regina Dossier (t1) — THE NAME CALLED AT THE DOOR --------------------
   Two hall doors swing wide, the name goes up on the announcing board, and
   every head in the room turns toward it in the order they hear it. A small
   crown mark settles on the name. Palette: #c8a8e0 / #ffeedd / #251a33. */
function ReginaDossierScene({ role, delayMs }: SceneProps) {
  const leaf = (
    <g {...SJ}>
      <path d="M4 2.6h16v18.8H4z" fill="#251a33" stroke="#c8a8e0" strokeWidth="1.3" />
      <path d="M7 6h10v5.4H7zM7 13.4h10v4.6H7z" fill="none" stroke="#c8a8e0" strokeWidth="0.8" />
    </g>
  );
  const crown = <path d="M4.4 17.4l-1.8-9 5 3.6L12 4.6l4.4 7.4 5-3.6-1.8 9z" fill="#ffeedd" stroke="#251a33" strokeWidth="1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g17-rd-door" l={4} t={12} w={44} h={72} d={40} st={{ transformOrigin: "6% 50%" }}>{leaf}</V>
        <V c="g17-rd-door" l={52} t={12} w={44} h={72} d={40} st={{ transformOrigin: "94% 50%" }}>{leaf}</V>
        <V c="g17-ent-pop" l={30} t={30} w={40} h={40} d={330}>{crown}</V>
        <L c="g17-rd-name" l={16} t={72} w={68} h={7} d={520} st={{ borderRadius: "999px", background: "#c8a8e0" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hitorder" l={10} t={14} w={40} h={66} d={0} st={{ transformOrigin: "6% 50%" }}>{leaf}</V>
        <V c="g17-hit" l={30} t={30} w={40} h={40} d={150}>{crown}</V>
        <L c="g17-hit2" l={22} t={80} w={56} h={5} d={270} st={{ borderRadius: "999px", background: "#c8a8e0" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={<><L c="g17-veil" st={{ background: "rgba(14,10,22,0.4)" }} /><Wash tone="rgba(200,168,224,0.3)" d={140} /></>}
    >
      <V c="g17-rd-door" l={38} t={36} w={12} h={20} d={60} st={{ transformOrigin: "6% 50%" }}>{leaf}</V>
      <V c="g17-rd-door" l={50} t={36} w={12} h={20} d={60} st={{ transformOrigin: "94% 50%" }}>{leaf}</V>
      <L c="g17-rd-name" l={42} t={33} w={16} h={2.4} d={330} st={{ borderRadius: "999px", background: "#c8a8e0" }} />
      <V c="g17-rd-crown" l={46} t={28} w={8} h={7} d={470}>{crown}</V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g17-rd-turn" l={39 + i * 8} t={52} w={7} h={9} d={560 + i * 120}>
          <path d={HEAD} fill="#ffeedd" />
        </V>
      ))}
      <L c="g17-leanshadow" l={41} t={60} w={18} h={3} d={720} st={{ borderRadius: "999px", background: "rgba(37,26,51,0.66)" }} />
    </Lead>
  );
}

/* --- 10. Roof Pigeon (t1) — THE CRY OFF THE ROOFTOP --------------------------
   The ridge of a roof comes up under the crier's boots, he cups both hands and
   shouts it over the street, and the birds go off the eaves one after another.
   Palette: #9db4c8 / #fff0d8 / #1e2630. */
function RoofPigeonScene({ role, delayMs }: SceneProps) {
  const roof = (
    <g {...SJ}>
      <path d="M12 4.6L22.4 15H1.6z" fill="#1e2630" stroke="#9db4c8" strokeWidth="1.2" />
      <path d="M4.6 15h14.8M6.8 12.4h10.4M9 9.8h6" stroke="#9db4c8" strokeWidth="0.9" />
      <path d="M1.6 15h20.8v2.4H1.6z" fill="#9db4c8" />
    </g>
  );
  const bird = <path d="M2.6 13.2c4.2.8 7-1 8.8-5 1.2 3.4 4 4.8 9 4-3 4.2-7.8 6.6-12.2 5.4-2.8-.8-4.8-2.4-5.6-4.4z" fill="#fff0d8" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g17-rp-roof" l={4} t={46} w={92} h={48} d={40}>{roof}</V>
        <V c="g17-rp-crier" l={34} t={12} w={32} h={44} d={250}>
          <path d={CRIER} fill="#9db4c8" stroke="#1e2630" strokeWidth="1.1" {...SJ} />
        </V>
        {[0, 1].map((i) => (
          <V key={i} c="g17-rp-bird" l={6 + i * 60} t={16} w={28} h={24} d={480 + i * 130}>{bird}</V>
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hitorder" l={8} t={40} w={84} h={48} d={0}>{roof}</V>
        <V c="g17-hitside" l={30} t={10} w={40} h={44} d={150}>
          <path d={CRIER} fill="#9db4c8" stroke="#1e2630" strokeWidth="1.1" {...SJ} />
        </V>
        <V c="g17-hit" l={54} t={6} w={34} h={28} d={270}>{bird}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(157,180,200,0.26)" /><Rim tone="rgba(255,240,216,0.28)" d={200} /></>}>
      <V c="g17-rp-roof" l={40} t={46} w={22} h={12} d={60}>{roof}</V>
      <V c="g17-rp-crier" l={45} t={35} w={9} h={13} d={240}>
        <path d={CRIER} fill="#9db4c8" stroke="#1e2630" strokeWidth="1.1" {...SJ} />
      </V>
      <L c="g17-heardfar" l={41} t={34} w={18} h={18} d={420} st={{ borderRadius: "50%", border: "2px solid #fff0d8" }} />
      {[0, 1, 2].map((i) => (
        <V key={i} c="g17-rp-bird" l={38 + i * 10} t={38} w={8} h={7} d={520 + i * 130}>{bird}</V>
      ))}
      <L c="g17-leanshadow" l={41} t={57} w={19} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(30,38,48,0.64)" }} />
      <L c="g17-mote" l={53} t={36} w={1.8} h={1.8} d={780} st={{ borderRadius: "50%", background: "#fff0d8" }} />
    </Lead>
  );
}

/* --- 11. Sampler Platter (t1) — THE FAIR GLOVE GOES UP -----------------------
   The market glove is hoisted to the top of its pole, which is the sign that
   the fair is open, and three stall awnings snap out in turn underneath it.
   Palette: #f0c05a / #fff2d6 / #33260f. */
function SamplerPlatterScene({ role, delayMs }: SceneProps) {
  const glove = (
    <g {...SJ}>
      <path d={HAND} fill="#fff2d6" stroke="#33260f" strokeWidth="1.1" />
    </g>
  );
  const awning = (
    <g {...SJ}>
      <path d="M2.4 6.4h19.2l1.4 7.2H1z" fill="#f0c05a" stroke="#33260f" strokeWidth="1.1" />
      <path d="M6.4 6.6l-1 7M12 6.6v7M17.6 6.6l1 7" stroke="#33260f" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g17-fg-pole" l={47.4} t={8} w={5.2} h={82} d={40} st={{ background: "#f0c05a", transformOrigin: "50% 100%" }} />
        <V c="g17-fg-glove" l={30} t={6} w={40} h={48} d={260}>{glove}</V>
        <V c="g17-ent-drop" l={16} t={58} w={68} h={32} d={490}>{awning}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hitorder" l={28} t={8} w={44} h={56} d={0}>{glove}</V>
        <V c="g17-hit" l={12} t={56} w={76} h={32} d={150}>{awning}</V>
        <L c="g17-hit2" l={46} t={80} w={8} h={8} d={270} st={{ borderRadius: "50%", background: "#fff2d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(240,192,90,0.28)" /><Rim tone="rgba(255,242,214,0.3)" d={200} /></>}>
      <L c="g17-fg-pole" l={49.2} t={32} w={1.6} h={24} d={60} st={{ background: "#f0c05a", transformOrigin: "50% 100%" }} />
      <V c="g17-fg-glove" l={45} t={30} w={10} h={12} d={250}>{glove}</V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g17-fg-awn" l={39 + i * 8} t={48} w={9} h={6} d={430 + i * 130} st={{ transformOrigin: "50% 0%" }}>{awning}</V>
      ))}
      <L c="g17-heardfar" l={42} t={36} w={16} h={16} d={620} st={{ borderRadius: "50%", border: "2px solid #fff2d6" }} />
      <L c="g17-glint" l={53} t={32} w={2.4} h={2.4} d={760} st={{ borderRadius: "50%", background: "#fff2d6" }} />
    </Lead>
  );
}

/* --- 12. Second Harvest (t1) — THE LAST SHEAF, AND HATS OFF ------------------
   The last sheaf is lifted on a pitchfork over the stubble, the word runs down
   the line of reapers, and their hats come off one after another all the way to
   the far end of it. Palette: #e0b878 / #fff3d4 / #2e2412. */
function SecondHarvestScene({ role, delayMs }: SceneProps) {
  const fork = (
    <g stroke="#fff3d4" fill="none" {...SJ}>
      <path d="M12 22V9.6" strokeWidth="1.8" />
      <path d="M6.6 9.6V2.6M12 9.6V1.6M17.4 9.6V2.6M6.6 9.6h10.8" strokeWidth="1.3" />
    </g>
  );
  const sheaf = (
    <g {...SJ}>
      <path d="M12 1.8c3 4.4 4.6 8.6 4.6 12.4 0 4-1.6 6.6-4.6 7.8-3-1.2-4.6-3.8-4.6-7.8 0-3.8 1.6-8 4.6-12.4z" fill="#e0b878" stroke="#2e2412" strokeWidth="1.1" />
      <path d="M5.6 13.4h12.8M6.4 16.6h11.2" stroke="#2e2412" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g17-sh-fork" l={8} t={16} w={40} h={72} d={40} st={{ transformOrigin: "50% 92%" }}>{fork}</V>
        <V c="g17-sh-sheaf" l={34} t={8} w={44} h={58} d={260}>{sheaf}</V>
        {[0, 1, 2].map((i) => (
          <V key={i} c="g17-sh-hat" l={12 + i * 26} t={62} w={24} h={26} d={490 + i * 120}>
            <path d={HAT} fill="#fff3d4" />
          </V>
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hitorder" l={22} t={10} w={56} h={62} d={0}>{sheaf}</V>
        <V c="g17-hit" l={10} t={18} w={36} h={66} d={150} st={{ transformOrigin: "50% 92%" }}>{fork}</V>
        <V c="g17-hitside" l={34} t={62} w={32} h={30} d={270}><path d={HAT} fill="#fff3d4" /></V>
      </Cut>
    );
  }
  return (
    <CryLead
      d={delayMs}
      frame={<Wash tone="rgba(224,184,120,0.28)" />}
      upright={
        <>
          <V c="g17-sh-fork" l={41} t={36} w={10} h={20} d={60} st={{ transformOrigin: "50% 92%" }}>{fork}</V>
          <V c="g17-sh-sheaf" l={43} t={32} w={11} h={14} d={250}>{sheaf}</V>
        </>
      }
    >
      <L c="g17-cry" l={50} t={49} w={30} h={1.6} d={400} st={{ background: "linear-gradient(90deg, #fff3d4, rgba(224,184,120,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      {[0, 1, 2].map((i) => (
        <V key={i} c="g17-sh-hat" l={52 + i * 6} t={44} w={6} h={8} d={470 + i * 130}>
          <path d={HAT} fill="#fff3d4" />
        </V>
      ))}
      {[0, 1, 2].map((i) => (
        <L key={i} c="g17-sift" l={53 + i * 5} t={52} w={1.6} h={1.6} d={720 + i * 100} st={{ borderRadius: "50%", background: "#e0b878" }} />
      ))}
    </CryLead>
  );
}

/* --- 13. Special Order (t1) — THE TABARD SHAKEN OUT --------------------------
   Before a word is said the herald snaps his tabard open, both sleeve panels
   drop square, the blazon comes up on the chest, and only THEN does he speak:
   three breath arcs. Palette: #cf6f5a / #ffe9cf / #2e1410. */
function SpecialOrderScene({ role, delayMs }: SceneProps) {
  const tabard = (
    <g {...SJ}>
      <path d="M7.6 3.4h8.8l1.6 3.4-2.4 1.6.8 12.8H8.6l.8-12.8-2.4-1.6z" fill="#cf6f5a" stroke="#2e1410" strokeWidth="1.2" />
    </g>
  );
  const sleeve = <path d="M2.6 4.4h6.8l1 12.4H3.6z" fill="#cf6f5a" stroke="#2e1410" strokeWidth="1.1" {...SJ} />;
  const blazon = (
    <g {...SJ}>
      <path d="M12 3.4l7 3v6.2c0 4.2-3.4 7-7 8-3.6-1-7-3.8-7-8V6.4z" fill="#ffe9cf" stroke="#2e1410" strokeWidth="1.1" />
      <path d="M12 7l1.7 3.4 3.7.5-2.7 2.6.6 3.7-3.3-1.8-3.3 1.8.6-3.7-2.7-2.6 3.7-.5z" fill="#cf6f5a" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hb-tabard" l={26} t={8} w={48} h={76} d={40}>{tabard}</V>
        <V c="g17-hb-sleeve" l={2} t={24} w={30} h={48} d={260} st={{ transformOrigin: "100% 20%" }}>{sleeve}</V>
        <V c="g17-ent-pop" l={30} t={30} w={40} h={40} d={490}>{blazon}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hitorder" l={24} t={10} w={52} h={74} d={0}>{tabard}</V>
        <V c="g17-hit" l={30} t={28} w={40} h={44} d={150}>{blazon}</V>
        <L c="g17-hit2" l={44} t={80} w={12} h={5} d={270} st={{ borderRadius: "999px", background: "#2e1410" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(207,111,90,0.28)" /><Rim tone="rgba(255,233,207,0.3)" d={200} /></>}>
      <V c="g17-hb-tabard" l={44} t={36} w={12} h={18} d={60}>{tabard}</V>
      <V c="g17-hb-sleeve" l={38} t={39} w={7} h={11} d={230} st={{ transformOrigin: "100% 20%" }}>{sleeve}</V>
      <V c="g17-hb-sleeve" l={55} t={39} w={7} h={11} d={300} st={{ transformOrigin: "0% 20%" }}>{sleeve}</V>
      <V c="g17-hb-blazon" l={45.5} t={39} w={9} h={10} d={460}>{blazon}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g17-hb-breath" l={56} t={40 + i * 3} w={5} h={1.6} d={600 + i * 110} st={{ borderRadius: "999px", background: "#ffe9cf", transformOrigin: "0% 50%" }} />
      ))}
      <V c="g17-sideturn" l={35} t={45} w={7} h={10} d={700}><path d={HEAD} fill="#ffe9cf" /></V>
    </Lead>
  );
}

/* --- 14. Store Credit (t1) — THE CHIT PASSED HAND TO HAND --------------------
   Four hands go up along the run in the order they are reached, a paper chit
   travels the whole real distance across them, and at the far end a tally
   stroke is added. Palette: #9ecfae / #fdf1d6 / #16281d. */
function StoreCreditScene({ role, delayMs }: SceneProps) {
  const chit = (
    <g {...SJ}>
      <path d="M3.4 7h17.2v10H3.4z" fill="#fdf1d6" stroke="#16281d" strokeWidth="1.1" />
      <path d="M6.4 10.4h11.2M6.4 13.4h7" stroke="#16281d" strokeWidth="1" />
    </g>
  );
  const tally = (
    <g stroke="#9ecfae" strokeWidth="2" fill="none" {...SJ}>
      <path d="M6 5.4v13M10.4 5.4v13M14.8 5.4v13M3.6 17.4l14-11.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        {[0, 1, 2].map((i) => (
          <V key={i} c="g17-sc-hand" l={6 + i * 30} t={44} w={26} h={48} d={40 + i * 110}>
            <path d={HAND} fill="#9ecfae" stroke="#16281d" strokeWidth="1" {...SJ} />
          </V>
        ))}
        <V c="g17-ent-slide" l={22} t={10} w={54} h={38} d={430}>{chit}</V>
        <V c="g17-ent-pop" l={62} t={52} w={32} h={36} d={620}>{tally}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hitorder" l={16} t={26} w={68} h={40} d={0}>{chit}</V>
        <V c="g17-hitside" l={30} t={44} w={40} h={48} d={150}>
          <path d={HAND} fill="#9ecfae" stroke="#16281d" strokeWidth="1" {...SJ} />
        </V>
        <L c="g17-hit2" l={46} t={12} w={8} h={8} d={270} st={{ borderRadius: "50%", background: "#fdf1d6" }} />
      </Cut>
    );
  }
  return (
    <CryLead
      d={delayMs}
      frame={<><Wash tone="rgba(158,207,174,0.26)" /><Rim tone="rgba(253,241,214,0.28)" d={220} /></>}
      upright={
        <>
          {[0, 1, 2, 3].map((i) => (
            <V key={i} c="g17-sc-hand" l={40 + i * 6} t={47} w={6} h={9} d={60 + i * 120}>
              <path d={HAND} fill="#9ecfae" stroke="#16281d" strokeWidth="1" {...SJ} />
            </V>
          ))}
        </>
      }
    >
      <L c="g17-cry" l={50} t={46} w={30} h={1.4} d={300} st={{ background: "linear-gradient(90deg, #fdf1d6, rgba(158,207,174,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g17-carryfar" l={46} t={41} w={7} h={6} d={420}>{chit}</V>
      <V c="g17-relayfar" l={50} t={42} w={6} h={8} d={660}>{tally}</V>
      <L c="g17-glint" l={52} t={40} w={2.2} h={2.2} d={780} st={{ borderRadius: "50%", background: "#fdf1d6" }} />
    </CryLead>
  );
}

/* --- 15. Tango Dip (t1) — THE CROWD OPENS A LANE -----------------------------
   Cupped hands call the figure, and the two ranks of onlookers step apart in
   order down the run until there is a clear lane the whole real length of it.
   Palette: #e2839b / #ffeadb / #2d1520. */
function TangoDipScene({ role, delayMs }: SceneProps) {
  const caller = (
    <g {...SJ}>
      <path d={HEAD} fill="#e2839b" stroke="#2d1520" strokeWidth="1" />
      <path d="M3.6 12.6c1.6-2.6 3.4-3.8 5.4-3.6M20.4 12.6c-1.6-2.6-3.4-3.8-5.4-3.6" fill="none" stroke="#ffeadb" strokeWidth="1.5" />
    </g>
  );
  const onlooker = <path d={HEAD} fill="#ffeadb" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g17-td-call" l={30} t={6} w={40} h={44} d={40}>{caller}</V>
        {[0, 1, 2].map((i) => (
          <V key={i} c="g17-td-up" l={8 + i * 28} t={50} w={22} h={26} d={250 + i * 110}>{onlooker}</V>
        ))}
        {[0, 1, 2].map((i) => (
          <V key={i} c="g17-td-down" l={8 + i * 28} t={70} w={22} h={26} d={430 + i * 110}>{onlooker}</V>
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hitorder" l={30} t={8} w={40} h={44} d={0}>{caller}</V>
        <V c="g17-hitside" l={10} t={52} w={26} h={30} d={150}>{onlooker}</V>
        <L c="g17-hit2" l={20} t={86} w={60} h={4} d={270} st={{ borderRadius: "999px", background: "#e2839b" }} />
      </Cut>
    );
  }
  return (
    <CryLead
      d={delayMs}
      frame={<Wash tone="rgba(226,131,155,0.28)" />}
      upright={<V c="g17-td-call" l={44} t={35} w={11} h={14} d={60}>{caller}</V>}
    >
      <L c="g17-runlane" l={50} t={48.4} w={30} h={2.6} d={260} st={{ background: "linear-gradient(90deg, rgba(255,234,219,0.85), rgba(226,131,155,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      {[0, 1, 2].map((i) => (
        <V key={i} c="g17-td-up" l={51 + i * 6} t={43} w={5} h={7} d={380 + i * 120}>{onlooker}</V>
      ))}
      {[0, 1, 2].map((i) => (
        <V key={i} c="g17-td-down" l={51 + i * 6} t={51} w={5} h={7} d={470 + i * 120}>{onlooker}</V>
      ))}
      {[0, 1, 2].map((i) => (
        <L key={i} c="g17-sift" l={53 + i * 5} t={50} w={1.6} h={1.6} d={720 + i * 100} st={{ borderRadius: "50%", background: "#ffeadb" }} />
      ))}
    </CryLead>
  );
}

/* --- 16. Transfer Window (t1) — THE MOOT HORN, AND THE SHUTTERS --------------
   One long note off a curved ox horn closes the hour, and the shutters come
   down along the row in the order the horn reaches them, all the way to the
   last stall. Palette: #86a8b8 / #fdefd2 / #17242c. */
function TransferWindowScene({ role, delayMs }: SceneProps) {
  const horn = (
    <g {...SJ}>
      <path d="M2.6 16.6c6.6 2.8 12.6 1 17.8-5.6-1.4 6.6-5.8 11-11.8 11.4-3.4.2-5.6-2-6-5.8z" fill="#86a8b8" stroke="#17242c" strokeWidth="1.1" />
      <path d="M19.4 8.6l2.4-3" stroke="#fdefd2" strokeWidth="1.4" />
    </g>
  );
  const shutter = (
    <g {...SJ}>
      <path d="M3.4 3.4h17.2v15.2H3.4z" fill="#17242c" stroke="#86a8b8" strokeWidth="1.2" />
      <path d="M5.4 7h13.2M5.4 10.4h13.2M5.4 13.8h13.2" stroke="#86a8b8" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hn-horn" l={6} t={24} w={54} h={50} d={40}>{horn}</V>
        <L c="g17-hn-blast" l={50} t={34} w={44} h={30} d={250} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(253,239,210,0.7), transparent 70%)", transformOrigin: "0% 50%" }} />
        {[0, 1].map((i) => (
          <V key={i} c="g17-hn-shut" l={54 + i * 22} t={44} w={20} h={40} d={470 + i * 130} st={{ transformOrigin: "50% 0%" }}>{shutter}</V>
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hitorder" l={22} t={10} w={56} h={54} d={0} st={{ transformOrigin: "50% 0%" }}>{shutter}</V>
        <V c="g17-hit" l={14} t={44} w={54} h={44} d={150}>{horn}</V>
        <L c="g17-hit2" l={22} t={82} w={56} h={4} d={270} st={{ borderRadius: "999px", background: "#86a8b8" }} />
      </Cut>
    );
  }
  return (
    <CryLead
      d={delayMs}
      frame={<><Wash tone="rgba(134,168,184,0.26)" /><Rim tone="rgba(253,239,210,0.28)" d={220} /></>}
      upright={<V c="g17-hn-horn" l={42} t={40} w={13} h={12} d={60}>{horn}</V>}
    >
      <L c="g17-hn-blast" l={50} t={43} w={12} h={12} d={250} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(253,239,210,0.72), transparent 70%)", transformOrigin: "0% 50%" }} />
      {[0, 1, 2].map((i) => (
        <V key={i} c="g17-hn-shut" l={52 + i * 6} t={42} w={5} h={8} d={430 + i * 130} st={{ transformOrigin: "50% 0%" }}>{shutter}</V>
      ))}
      <V c="g17-relayfar" l={50} t={43} w={5} h={7} d={680} st={{ transformOrigin: "50% 0%" }}>{shutter}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g17-sift" l={53 + i * 5} t={50} w={1.6} h={1.6} d={760 + i * 100} st={{ borderRadius: "50%", background: "#86a8b8" }} />
      ))}
    </CryLead>
  );
}

/* --- 17. Tripwire Bell (t1) — THE ROPE, THE YOKE, THE FAR END ----------------
   The rope is hauled once as a tell, the yoke tips and the tower bell swings
   over, and the note travels the real distance until someone at the far end of
   it turns round. Palette: #c9b06a / #fff2d0 / #262010. */
function TripwireBellScene({ role, delayMs }: SceneProps) {
  const bell = (
    <g {...SJ}>
      <path d="M4.6 18c0-6.2 2.6-9.8 7.4-11 4.8 1.2 7.4 4.8 7.4 11z" fill="#c9b06a" stroke="#262010" strokeWidth="1.2" />
      <path d="M3 18h18v2.4H3z" fill="#262010" />
      <path d="M12 20.4v2.2" stroke="#fff2d0" strokeWidth="1.5" />
    </g>
  );
  const yoke = (
    <g {...SJ}>
      <path d="M4.4 5.4h15.2v3.6H4.4z" fill="#262010" stroke="#c9b06a" strokeWidth="1.1" />
      <path d="M2 7.2h2.4M19.6 7.2H22" stroke="#c9b06a" strokeWidth="1.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g17-tb-rope" l={47} t={2} w={4} h={46} d={40} st={{ background: "#fff2d0", transformOrigin: "50% 0%" }} />
        <V c="g17-tb-yoke" l={22} t={22} w={56} h={26} d={230}>{yoke}</V>
        <V c="g17-tb-swing" l={22} t={38} w={56} h={52} d={420} st={{ transformOrigin: "50% 0%" }}>{bell}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hitorder" l={20} t={30} w={60} h={56} d={0} st={{ transformOrigin: "50% 0%" }}>{bell}</V>
        <V c="g17-hit" l={22} t={12} w={56} h={26} d={150}>{yoke}</V>
        <L c="g17-hit2" l={44} t={78} w={12} h={12} d={270} st={{ borderRadius: "50%", background: "#fff2d0" }} />
      </Cut>
    );
  }
  return (
    <CryLead
      d={delayMs}
      frame={<><Wash tone="rgba(201,176,106,0.28)" /><Rim tone="rgba(255,242,208,0.3)" d={200} /></>}
      upright={
        <>
          <L c="g17-tb-rope" l={49.4} t={26} w={1.2} h={14} d={60} st={{ background: "#fff2d0", transformOrigin: "50% 0%" }} />
          <V c="g17-tb-yoke" l={44} t={36} w={12} h={6} d={230}>{yoke}</V>
          <V c="g17-tb-swing" l={44} t={40} w={12} h={14} d={370} st={{ transformOrigin: "50% 0%" }}>{bell}</V>
        </>
      }
    >
      <L c="g17-cry" l={50} t={47} w={30} h={1.8} d={520} st={{ background: "linear-gradient(90deg, #fff2d0, rgba(201,176,106,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g17-relayfar" l={50} t={44} w={6} h={9} d={660}><path d={HEAD} fill="#fff2d0" /></V>
      <L c="g17-glint" l={52} t={42} w={2.4} h={2.4} d={780} st={{ borderRadius: "50%", background: "#fff2d0" }} />
    </CryLead>
  );
}

/* --- 18. Understudy List (t1) — THE CALL BOARD AT THE STAGE DOOR -------------
   The call board comes up, the reading lamp swings over it, and the name slips
   flip face-out one at a time as they are read. The last slot has no slip in
   it, and that empty slot is the point. Palette: #b9a2d4 / #fbeeda / #221b33. */
function UnderstudyListScene({ role, delayMs }: SceneProps) {
  const board = (
    <g {...SJ}>
      <path d="M2.4 3.4h19.2v17.2H2.4z" fill="#221b33" stroke="#b9a2d4" strokeWidth="1.3" />
      <path d="M4.6 6.4h14.8M4.6 10.4h14.8M4.6 14.4h14.8M4.6 18h14.8" stroke="#b9a2d4" strokeWidth="0.8" />
    </g>
  );
  const slip = (
    <g {...SJ}>
      <path d="M2.6 8h18.8v8H2.6z" fill="#fbeeda" stroke="#221b33" strokeWidth="1" />
      <path d="M5.4 12h13.2" stroke="#221b33" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g17-ul-board" l={8} t={8} w={84} h={78} d={40}>{board}</V>
        <L c="g17-ul-read" l={14} t={18} w={72} h={12} d={250} st={{ background: "linear-gradient(90deg, rgba(251,238,218,0.75), transparent)" }} />
        {[0, 1].map((i) => (
          <V key={i} c="g17-ul-slip" l={16} t={38 + i * 22} w={68} h={16} d={450 + i * 130} st={{ transformOrigin: "10% 50%" }}>{slip}</V>
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hitorder" l={10} t={12} w={80} h={72} d={0}>{board}</V>
        <V c="g17-hit" l={16} t={36} w={68} h={20} d={150} st={{ transformOrigin: "10% 50%" }}>{slip}</V>
        <L c="g17-hit2" l={18} t={62} w={64} h={8} d={270} st={{ border: "2px solid #b9a2d4" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><L c="g17-veil" st={{ background: "rgba(14,11,24,0.36)" }} /><Wash tone="rgba(185,162,212,0.28)" d={140} /></>}>
      <V c="g17-ul-board" l={41} t={35} w={18} h={22} d={60}>{board}</V>
      <L c="g17-ul-read" l={42} t={37} w={16} h={4} d={230} st={{ background: "linear-gradient(90deg, rgba(251,238,218,0.75), transparent)" }} />
      {[0, 1, 2].map((i) => (
        <V key={i} c="g17-ul-slip" l={43} t={40 + i * 4} w={14} h={3.4} d={400 + i * 130} st={{ transformOrigin: "10% 50%" }}>{slip}</V>
      ))}
      <L c="g17-ul-empty" l={43} t={52} w={14} h={3.4} d={720} st={{ border: "2px solid #b9a2d4" }} />
      <L c="g17-heardfar" l={42} t={38} w={16} h={16} d={620} st={{ borderRadius: "50%", border: "2px solid #fbeeda" }} />
    </Lead>
  );
}

/* --- 19. Coupon (t1) — LARGESSE THROWN TO THE CROWD --------------------------
   The reading is done, the herald's arm goes over in a full sweep, and the
   tokens go out over the heads; the hands come up from the caster's own side to
   take them. Palette: #ffb84d / #fff2cf / #33210c. */
const CP_TOKENS: Array<[number, number]> = [[54, 34], [60, 40], [50, 30], [58, 46]];

function CouponScene({ role, delayMs }: SceneProps) {
  const arm = (
    <g {...SJ}>
      <path d="M4.4 20.6l2-9.4c.5-2.4 2.2-3.6 4.4-3.6 2 0 3.4.8 4.4 2.4l4.4 7-2.4 1.6-4-5.4-1.6 7.4z" fill="#ffb84d" stroke="#33210c" strokeWidth="1.1" />
    </g>
  );
  const token = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="8.6" fill="#ffb84d" stroke="#33210c" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="4" fill="#fff2cf" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g17-cp-fling" l={6} t={30} w={54} h={54} d={40} st={{ transformOrigin: "16% 84%" }}>{arm}</V>
        {[0, 1, 2].map((i) => (
          <V key={i} c="g17-cp-token" l={48 + i * 16} t={12 + i * 14} w={18} h={18} d={260 + i * 110}>{token}</V>
        ))}
        <V c="g17-ent-rise" l={26} t={58} w={30} h={38} d={560}>
          <path d={HAND} fill="#fff2cf" stroke="#33210c" strokeWidth="1" {...SJ} />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hitorder" l={26} t={26} w={48} h={48} d={0}>{token}</V>
        <V c="g17-hitside" l={30} t={40} w={40} h={52} d={150}>
          <path d={HAND} fill="#fff2cf" stroke="#33210c" strokeWidth="1" {...SJ} />
        </V>
        <L c="g17-hit2" l={40} t={10} w={20} h={20} d={270} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,184,77,0.8), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(255,184,77,0.28)" /><Rim tone="rgba(255,242,207,0.3)" d={200} /></>}>
      <V c="g17-cp-fling" l={40} t={38} w={13} h={16} d={60} st={{ transformOrigin: "16% 84%" }}>{arm}</V>
      {CP_TOKENS.map(([l, t], i) => (
        <V key={i} c="g17-cp-token" l={l} t={t} w={4.4} h={4.4} d={300 + i * 110}>{token}</V>
      ))}
      <V c="g17-cp-hands" l={52} t={48} w={8} h={11} d={560}>
        <path d={HAND} fill="#fff2cf" stroke="#33210c" strokeWidth="1" {...SJ} />
      </V>
      <V c="g17-sideturn" l={38} t={49} w={7} h={10} d={660}><path d={HEAD} fill="#fff2cf" /></V>
      <L c="g17-glint" l={57} t={36} w={2.4} h={2.4} d={780} st={{ borderRadius: "50%", background: "#fff2cf" }} />
    </Lead>
  );
}

/* --- 20. Group Photo (t1) — THE DRUM ROLL CUT OFF DEAD -----------------------
   The side drum rolls, the buzz lines shiver over the head, and then the sticks
   are stopped in mid-air: dead silence, and the whole crowd held still in it
   for one beat. Palette: #b4c0d8 / #fdf0d6 / #1b1f2e. */
function GroupPhotoScene({ role, delayMs }: SceneProps) {
  const drum = (
    <g {...SJ}>
      <path d="M3.4 8h17.2v8H3.4z" fill="#1b1f2e" stroke="#b4c0d8" strokeWidth="1.2" />
      <path d="M3.4 8l17.2 2.6M20.6 8L3.4 10.6" stroke="#b4c0d8" strokeWidth="0.9" />
      <path d="M3.4 16h17.2v1.8H3.4z" fill="#b4c0d8" />
    </g>
  );
  const sticks = (
    <g stroke="#fdf0d6" strokeWidth="1.8" fill="none" {...SJ}>
      <path d="M4.4 20.6L14 6M10.4 21.4L20 6.8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g17-gp-drum" l={12} t={44} w={76} h={40} d={40}>{drum}</V>
        <V c="g17-gp-stick" l={20} t={6} w={60} h={56} d={230} st={{ transformOrigin: "20% 90%" }}>{sticks}</V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g17-gp-buzz" l={16 + i * 24} t={34} w={16} h={3} d={430 + i * 110} st={{ borderRadius: "999px", background: "#b4c0d8" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hitorder" l={14} t={40} w={72} h={44} d={0}>{drum}</V>
        <V c="g17-hit" l={24} t={8} w={56} h={54} d={150} st={{ transformOrigin: "20% 90%" }}>{sticks}</V>
        <L c="g17-hit2" l={20} t={30} w={60} h={4} d={270} st={{ borderRadius: "999px", background: "#fdf0d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><L c="g17-veil" st={{ background: "rgba(10,12,20,0.42)" }} /><Wash tone="rgba(180,192,216,0.28)" d={140} /></>}>
      <V c="g17-gp-drum" l={43} t={42} w={14} h={9} d={60}>{drum}</V>
      <V c="g17-gp-stick" l={44} t={33} w={12} h={12} d={220} st={{ transformOrigin: "20% 90%" }}>{sticks}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g17-gp-buzz" l={43 + i * 5} t={38} w={4} h={1.4} d={340 + i * 100} st={{ borderRadius: "999px", background: "#b4c0d8" }} />
      ))}
      {[0, 1, 2].map((i) => (
        <V key={i} c="g17-gp-still" l={38 + i * 9} t={51} w={7} h={10} d={560 + i * 90}>
          <path d={HEAD} fill="#fdf0d6" />
        </V>
      ))}
      <L c="g17-leanshadow" l={40} t={60} w={20} h={3} d={720} st={{ borderRadius: "999px", background: "rgba(27,31,46,0.68)" }} />
    </Lead>
  );
}

/* --- 21. Left Foot First (t1) — THE WORD OF COMMAND --------------------------
   The command is shouted, the chalk start line takes it, and the boots come
   down the run left foot first in the order they hear it.
   Palette: #b08f68 / #fdefd0 / #2a1f14. */
function LeftFootFirstScene({ role, delayMs }: SceneProps) {
  const shout = (
    <g {...SJ}>
      <path d={HEAD} fill="#b08f68" stroke="#2a1f14" strokeWidth="1" />
      <path d="M16.4 6.4c2.6 1.6 3.8 3.6 3.6 6M18.8 4c3.4 2.2 5 5 4.8 8.4" fill="none" stroke="#fdefd0" strokeWidth="1.3" />
    </g>
  );
  const boot = (
    <g {...SJ}>
      <path d="M6.4 3.4h5.4v9.2l7.8 3.4v4.6H6.4z" fill="#2a1f14" stroke="#b08f68" strokeWidth="1.1" />
      <path d="M6.4 18h13.2" stroke="#fdefd0" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g17-lf-shout" l={6} t={10} w={40} h={46} d={40}>{shout}</V>
        <L c="g17-lf-line" l={6} t={62} w={88} h={3} d={250} st={{ borderRadius: "999px", background: "#fdefd0", transformOrigin: "0% 50%" }} />
        {[0, 1, 2].map((i) => (
          <V key={i} c="g17-lf-boot" l={20 + i * 24} t={66} w={22} h={28} d={450 + i * 120}>{boot}</V>
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hitorder" l={26} t={30} w={48} h={54} d={0}>{boot}</V>
        <V c="g17-hitside" l={22} t={6} w={40} h={44} d={150}>{shout}</V>
        <L c="g17-hit2" l={16} t={84} w={68} h={4} d={270} st={{ borderRadius: "999px", background: "#b08f68" }} />
      </Cut>
    );
  }
  return (
    <CryLead
      d={delayMs}
      frame={<><Wash tone="rgba(176,143,104,0.26)" /><Rim tone="rgba(253,239,208,0.28)" d={220} /></>}
      upright={<V c="g17-lf-shout" l={43} t={36} w={11} h={14} d={60}>{shout}</V>}
    >
      <L c="g17-lf-line" l={50} t={53} w={16} h={1.4} d={250} st={{ borderRadius: "999px", background: "#fdefd0", transformOrigin: "0% 50%" }} />
      <L c="g17-cry" l={50} t={47} w={30} h={1.6} d={380} st={{ background: "linear-gradient(90deg, #fdefd0, rgba(176,143,104,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      {[0, 1, 2].map((i) => (
        <V key={i} c="g17-lf-boot" l={51 + i * 6} t={47} w={5} h={7} d={470 + i * 130}>{boot}</V>
      ))}
      {[0, 1, 2].map((i) => (
        <L key={i} c="g17-sift" l={53 + i * 5} t={53} w={1.6} h={1.6} d={740 + i * 100} st={{ borderRadius: "50%", background: "#b08f68" }} />
      ))}
    </CryLead>
  );
}

/* --- 22. Squeaky Shoes (t1) — THE BELLMAN'S LANTERN AT EACH CORNER -----------
   The watch calls the hour, and the lantern goes up at one corner, then the
   next, then the next, until the light finds the one print that squeaked.
   Palette: #ffd98f / #fff4d6 / #2b2312. */
const SQ_CORNERS: Array<[number, number]> = [[38, 36], [56, 36], [56, 54], [38, 54]];

function SqueakyShoesScene({ role, delayMs }: SceneProps) {
  const lantern = (
    <g {...SJ}>
      <path d="M8.4 6.6h7.2l1.6 11.4H6.8z" fill="#2b2312" stroke="#ffd98f" strokeWidth="1.1" />
      <path d="M10.2 9.4h3.6v6h-3.6z" fill="#fff4d6" />
      <path d="M9.6 6.6V4.4a2.4 2.4 0 0 1 4.8 0v2.2M6.4 18h11.2v2H6.4z" fill="none" stroke="#ffd98f" strokeWidth="1.1" />
    </g>
  );
  const print = (
    <g {...SJ}>
      <path d="M8.6 3.4c2.6 0 4.2 2 4.2 5s-1 5-1 7.4-.8 3.6-3.2 3.6-3.4-1.6-3.4-4c0-2.6 1-4 1-6.6 0-3.4.8-5.4 2.4-5.4z" fill="#ffd98f" />
      <path d="M16.6 14.4c1.8 0 2.8 1.2 2.8 3s-1 3-2.8 3-2.8-1.2-2.8-3 1-3 2.8-3z" fill="#ffd98f" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g17-sq-lift" l={8} t={14} w={38} h={56} d={40}>{lantern}</V>
        <L c="g17-sq-pool" l={4} t={56} w={46} h={30} d={250} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.7), transparent 70%)" }} />
        <V c="g17-ent-pop" l={54} t={40} w={38} h={48} d={480}>{print}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hitorder" l={24} t={8} w={52} h={58} d={0}>{lantern}</V>
        <L c="g17-hit2" l={20} t={54} w={60} h={36} d={150} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.7), transparent 70%)" }} />
        <V c="g17-hit" l={34} t={52} w={32} h={40} d={270}>{print}</V>
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={<><L c="g17-veil" st={{ background: "rgba(14,11,6,0.42)" }} /><Wash tone="rgba(255,217,143,0.28)" d={140} /><Rim tone="rgba(255,244,214,0.3)" d={260} /></>}
    >
      {SQ_CORNERS.map(([l, t], i) => (
        <V key={i} c="g17-sq-lift" l={l} t={t} w={6} h={9} d={80 + i * 130}>{lantern}</V>
      ))}
      <L c="g17-sq-pool" l={40} t={40} w={20} h={16} d={520} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.65), transparent 70%)" }} />
      <V c="g17-sq-print" l={46} t={44} w={8} h={10} d={640}>{print}</V>
      <L c="g17-heardfar" l={42} t={38} w={16} h={16} d={700} st={{ borderRadius: "50%", border: "2px solid #ffd98f" }} />
    </Lead>
  );
}

/* --- 23. Warm-Up Stretch (t1) — THE CALL TO THE LISTS ------------------------
   The herald names the ground, and the knotted measuring cord is paid out down
   the run, knot by knot, until the far peg is driven in at the real distance.
   Palette: #8fc2b0 / #fdf0d4 / #163027. */
function WarmupStretchScene({ role, delayMs }: SceneProps) {
  const herald = (
    <g {...SJ}>
      <path d={CRIER} fill="#8fc2b0" stroke="#163027" strokeWidth="1.1" />
      <path d="M15.6 10.4l5.6-2.6v4.8l-5.6-2.2z" fill="#fdf0d4" stroke="#163027" strokeWidth="0.9" />
    </g>
  );
  const peg = (
    <g {...SJ}>
      <path d="M9.4 2.6h5.2l-1 14.6-1.6 3.6-1.6-3.6z" fill="#fdf0d4" stroke="#163027" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g17-ws-crier" l={6} t={16} w={44} h={68} d={40}>{herald}</V>
        <L c="g17-ws-cord" l={12} t={56} w={82} h={3} d={250} st={{ borderRadius: "999px", background: "#8fc2b0", transformOrigin: "0% 50%" }} />
        {[0, 1, 2].map((i) => (
          <L key={i} c="g17-ws-knot" l={34 + i * 20} t={52} w={8} h={8} d={450 + i * 120} st={{ borderRadius: "50%", background: "#fdf0d4" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hitorder" l={18} t={14} w={52} h={66} d={0}>{herald}</V>
        <L c="g17-hit2" l={10} t={56} w={80} h={4} d={150} st={{ borderRadius: "999px", background: "#8fc2b0" }} />
        <V c="g17-hit" l={62} t={40} w={26} h={44} d={270}>{peg}</V>
      </Cut>
    );
  }
  return (
    <CryLead
      d={delayMs}
      frame={<Wash tone="rgba(143,194,176,0.26)" />}
      upright={<V c="g17-ws-crier" l={43} t={38} w={11} h={15} d={60}>{herald}</V>}
    >
      <L c="g17-ws-cord" l={50} t={49} w={30} h={1.4} d={280} st={{ borderRadius: "999px", background: "#8fc2b0", transformOrigin: "0% 50%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g17-ws-knot" l={53 + i * 6} t={47.6} w={2.4} h={2.4} d={430 + i * 130} st={{ borderRadius: "50%", background: "#fdf0d4" }} />
      ))}
      <V c="g17-relayfar" l={50} t={44} w={5} h={9} d={660}>{peg}</V>
      <L c="g17-mote" l={54} t={45} w={1.8} h={1.8} d={780} st={{ borderRadius: "50%", background: "#fdf0d4" }} />
    </CryLead>
  );
}

/* --- 24. Window Shopping (t1) — "WHAT D'YE LACK?" ----------------------------
   The stall awning rolls out over the boards, the stall-holder's cry goes up in
   short bars, and the tray comes over the counter with the goods held up one at
   a time. Palette: #6fb3c9 / #fdf1d8 / #12262e. */
function WindowShoppingScene({ role, delayMs }: SceneProps) {
  const awning = (
    <g {...SJ}>
      <path d="M1.4 5.4h21.2v6.2H1.4z" fill="#6fb3c9" stroke="#12262e" strokeWidth="1.1" />
      <path d="M1.4 11.6l3.6 3.6 3.6-3.6 3.4 3.6 3.6-3.6 3.4 3.6 3.6-3.6" fill="none" stroke="#fdf1d8" strokeWidth="1.2" />
    </g>
  );
  const tray = (
    <g {...SJ}>
      <path d="M3.4 12.6h17.2l-1.6 5.4H5z" fill="#12262e" stroke="#6fb3c9" strokeWidth="1.2" />
      <path d="M3.4 12.6h17.2" stroke="#fdf1d8" strokeWidth="1.2" />
    </g>
  );
  const good = <circle cx="12" cy="12" r="7.6" fill="#fdf1d8" stroke="#12262e" strokeWidth="1.2" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g17-wn-awn" l={4} t={8} w={92} h={40} d={40} st={{ transformOrigin: "50% 0%" }}>{awning}</V>
        <V c="g17-wn-tray" l={16} t={54} w={68} h={34} d={260}>{tray}</V>
        {[0, 1, 2].map((i) => (
          <V key={i} c="g17-wn-good" l={22 + i * 22} t={40} w={16} h={16} d={480 + i * 120}>{good}</V>
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g17-hitorder" l={8} t={8} w={84} h={38} d={0} st={{ transformOrigin: "50% 0%" }}>{awning}</V>
        <V c="g17-hitside" l={18} t={50} w={64} h={36} d={150}>{tray}</V>
        <V c="g17-hit" l={40} t={38} w={20} h={20} d={270}>{good}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(111,179,201,0.26)" /><Rim tone="rgba(253,241,216,0.28)" d={200} /></>}>
      <V c="g17-wn-awn" l={39} t={33} w={22} h={9} d={60} st={{ transformOrigin: "50% 0%" }}>{awning}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g17-wn-cry" l={56} t={38 + i * 3} w={5} h={1.6} d={230 + i * 110} st={{ borderRadius: "999px", background: "#fdf1d8", transformOrigin: "0% 50%" }} />
      ))}
      <V c="g17-wn-tray" l={42} t={47} w={16} h={8} d={430}>{tray}</V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g17-wn-good" l={44 + i * 5} t={42} w={4.4} h={4.4} d={560 + i * 120}>{good}</V>
      ))}
      <L c="g17-heardfar" l={42} t={38} w={16} h={16} d={700} st={{ borderRadius: "50%", border: "2px solid #6fb3c9" }} />
    </Lead>
  );
}

/* =============================================================================
   Registry. Every entry declares an anchor; every `sound` is an existing
   SigSoundKey. `source` is deliberately omitted throughout: an announcement
   leaves no decoration on the board, so the scene is the cast lead on the
   square the card was played on plus the per-square hits it reaches.
   ========================================================================== */

/* =============================================================================
   FLAGSHIP IMPACT PASS — every proclamation lands as a TRUMPET-BLAST shockwave.

   Layered OVER each scene's own signature from the shared impact vocabulary
   (impact/impact.tsx): a descending laser column, the struck thing splitting
   in half and spraying shards, a ground shockwave, and the whole stage
   jolting on the same beat. Each PLAYS entry declares its own combination,
   impact beat, tint, landing box and tilt below, so every card in the module
   lands a hit its siblings do not. The quake rides an inner wrapper (the
   stage's own transform is the anchor clamp and must not be overridden) and
   stays inside this scene's stage — the real board crop never shakes. The
   whole composite is transform/opacity only, one-shot, scaled by --fx-dur,
   and dark under html[data-anim="off"] via the global animation gate.
   ========================================================================== */

/** Per-card impact spec. `at` is the impact beat in ms after the lead's
 * stagger; the laser (when present) LEADS that beat by 0.4s per the shared
 * impact-timing contract, so the column reads as the CAUSE of the hit. */
interface Imp {
  /** Impact tint: the "r g b" triple --imp-rgb expects (the card's core). */
  rgb: string;
  /** The impact beat, ms into the lead. */
  at: number;
  laser?: boolean;
  shock?: boolean;
  /** Shatter glyph (24x24 viewBox): the struck thing, split in half. */
  glyph?: ReactNode;
  /** Landing box, % of the scene canvas. Defaults to the cast square. */
  box?: [number, number, number, number];
  /** Static tilt of the whole composite, in degrees (angled columns). */
  rot?: number;
}

/** A crier's hand bell: the loudest thing on the lane, and the first casualty. */
const impBell = (fill: string, edge: string): ReactNode => (
  <>
    <path
      d="M12 3c3.6 0 5.6 2.6 5.6 6.2v4.6l2.2 3.4H4.2l2.2-3.4V9.2C6.4 5.6 8.4 3 12 3z"
      fill={fill}
      stroke={edge}
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="19.6" r="1.6" fill={edge} />
  </>
);

/** The composite itself, staged over the scene's canvas on the impact beat. */
function ImpactHit({ s, delayMs }: { s: Imp; delayMs: number }) {
  const [l, t, w, h] = s.box ?? [43, 38, 14, 14];
  return (
    <span className="pointer-events-none absolute inset-0 z-30 block" aria-hidden="true">
      <BoardWideStage>
        <span
          className="absolute block"
          style={{
            left: `${l}%`,
            top: `${t}%`,
            width: `${w}%`,
            height: `${h}%`,
            rotate: s.rot ? `${s.rot}deg` : undefined,
            ...impactVars(s.rgb, (delayMs + s.at) / 1000),
          }}
        >
          {s.laser ? <LaserStrike /> : null}
          {s.glyph ? (
            <PieceShatter
              glyph={
                <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
                  {s.glyph}
                </svg>
              }
            />
          ) : null}
          {s.shock ? <Shockwave /> : null}
        </span>
      </BoardWideStage>
    </span>
  );
}

/** Bind one bespoke scene to its config, landing its per-card impact over the
 * lead. Target and entrance cuts keep the scene's own art unchanged. */
function S(Render: SigPlugin["Render"], config: SigPlugin["config"], imp?: Imp): SigPlugin {
  if (!imp) return { config, Render };
  function FlagshipHit(p: { lead: boolean; role: SigRole; delayMs: number }) {
    if (p.role !== "lead") return <Render {...p} />;
    return (
      <span className="pointer-events-none absolute inset-0 block" aria-hidden="true">
        <span
          className={`${QUAKE_CLASS} absolute inset-0 block`}
          style={impactVars(imp!.rgb, (p.delayMs + imp!.at) / 1000)}
        >
          <Render {...p} />
        </span>
        <ImpactHit s={imp!} delayMs={p.delayMs} />
      </span>
    );
  }
  return { config, Render: FlagshipHit };
}


export const PLAYS: Record<string, SigPlugin> = {
  op_market_lane: S(MarketLaneScene, { ordering: "line", staggerMs: 70, victims: ["p"], hasLead: true, sound: "wall", anchor: "aim" }, { rgb: "216 180 92", at: 520, laser: true, shock: true, box: [44, 37, 12, 14], rot: -12 }),
  op_meet_kevin: S(MeetKevinScene, { ordering: "radial", staggerMs: 60, victims: ["p"], hasLead: true, sound: "coronation", anchor: "board" }, { rgb: "255 207 92", at: 640, laser: true, glyph: impBell("#ffcf5c", "#2f2410"), shock: true, box: [42, 35, 15, 16] }),
  op_nesting_doll: S(NestingDollScene, { ordering: "line", staggerMs: 80, victims: ["p"], hasLead: true, sound: "cathedral", anchor: "board" }, { rgb: "224 138 106", at: 480, glyph: impBell("#e08a6a", "#331a12"), box: [44, 38, 12, 13] }),
  op_opposition_research: S(OppositionResearchScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "siege", anchor: "board" }, { rgb: "159 192 216", at: 540, laser: true, box: [44, 35, 12, 16] }),
  op_penny_slots: S(PennySlotsScene, { ordering: "radial", staggerMs: 60, victims: ["p"], hasLead: true, sound: "blitz", anchor: "board" }, { rgb: "230 162 60", at: 440, shock: true, box: [44, 39, 12, 12] }),
  op_plush_pony: S(PlushPonyScene, { ordering: "line", staggerMs: 75, victims: ["n"], hasLead: true, sound: "siege", anchor: "board" }, { rgb: "217 162 184", at: 400, shock: true, box: [45, 39, 11, 12] }),
  op_price_check: S(PriceCheckScene, { ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "wall", anchor: "board" }, { rgb: "169 200 160", at: 460, shock: true, box: [42, 38, 15, 12] }),
  op_prophecy_fulfilled: S(ProphecyFulfilledScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "coronation", anchor: "board" }, { rgb: "255 210 122", at: 580, laser: true, box: [43, 34, 13, 17] }),
  op_regina_dossier: S(ReginaDossierScene, { ordering: "radial", staggerMs: 60, victims: ["q"], hasLead: true, sound: "coronation", anchor: "board" }, { rgb: "200 168 224", at: 560, laser: true, glyph: impBell("#c8a8e0", "#251a33"), box: [43, 36, 13, 15] }),
  op_roof_pigeon: S(RoofPigeonScene, { ordering: "radial", staggerMs: 65, victims: ["r"], hasLead: true, sound: "blitz", anchor: "board" }, { rgb: "157 180 200", at: 420, shock: true, box: [45, 38, 11, 12] }),
  op_sampler_platter: S(SamplerPlatterScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "crownrain", anchor: "board" }, { rgb: "240 192 90", at: 380, shock: true, box: [45, 40, 11, 10] }),
  op_second_harvest: S(SecondHarvestScene, { ordering: "line", staggerMs: 80, victims: ["p"], hasLead: true, sound: "crownrain", anchor: "board" }, { rgb: "224 184 120", at: 500, glyph: impBell("#e0b878", "#2e2412"), box: [43, 38, 13, 12] }),
  op_special_order: S(SpecialOrderScene, { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "coronation", anchor: "board" }, { rgb: "207 111 90", at: 540, glyph: impBell("#cf6f5a", "#2e1410"), shock: true, box: [43, 37, 14, 13] }),
  op_store_credit: S(StoreCreditScene, { ordering: "line", staggerMs: 75, victims: "all", hasLead: true, sound: "crownrain", anchor: "board" }, { rgb: "158 207 174", at: 360, shock: true, box: [45, 40, 10, 10] }),
  op_tango_dip: S(TangoDipScene, { ordering: "line", staggerMs: 80, victims: ["k"], hasLead: true, sound: "blitz", anchor: "aim" }, { rgb: "226 131 155", at: 500, laser: true, shock: true, box: [44, 36, 12, 14], rot: 14 }),
  op_transfer_window: S(TransferWindowScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "wall", anchor: "board" }, { rgb: "134 168 184", at: 460, laser: true, box: [44, 35, 12, 16] }),
  op_tripwire_bell: S(TripwireBellScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "siege", anchor: "board" }, { rgb: "201 176 106", at: 560, glyph: impBell("#c9b06a", "#262010"), shock: true, box: [43, 36, 14, 14] }),
  op_understudy_list: S(UnderstudyListScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }, { rgb: "185 162 212", at: 440, glyph: impBell("#b9a2d4", "#221b33"), box: [44, 38, 12, 12] }),
  ov_coupon: S(CouponScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "crownrain", anchor: "board" }, { rgb: "255 184 77", at: 340, shock: true, box: [46, 40, 10, 10] }),
  ov_group_photo: S(GroupPhotoScene, { ordering: "sweep", staggerMs: 50, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast" }, { rgb: "180 192 216", at: 480, shock: true, box: [43, 37, 14, 13] }),
  ov_left_foot_first: S(LeftFootFirstScene, { ordering: "line", staggerMs: 75, victims: ["k"], hasLead: true, sound: "blitz", anchor: "aim" }, { rgb: "176 143 104", at: 460, laser: true, shock: true, box: [44, 38, 12, 13], rot: -8 }),
  ov_squeaky_shoes: S(SqueakyShoesScene, { ordering: "octagon", staggerMs: 65, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast" }, { rgb: "255 217 143", at: 410, shock: true, box: [44, 39, 12, 11] }),
  ov_warmup_stretch: S(WarmupStretchScene, { ordering: "line", staggerMs: 70, victims: ["n"], hasLead: true, sound: "blitz", anchor: "aim" }, { rgb: "143 194 176", at: 430, laser: true, box: [44, 36, 12, 15], rot: 6 }),
  ov_window_shopping: S(WindowShoppingScene, { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "wall", anchor: "board" }, { rgb: "111 179 201", at: 600, laser: true, shock: true, box: [43, 35, 13, 16] }),
};
