// g42ChainPlays — bespoke plays for the 41 cards that used to share five
// generated families (featherBurst, sparkArc, potionFizz, emberfall,
// drumShock): nine stock choreographies under forty-one hue shifts.
//
// MODULE FICTION: REACTIONS THAT RUN AWAY. Every card is a different process
// that starts small and gets out of hand — a match head catching and the flare
// outrunning the hand, a fuse spitting along its length, an arc climbing a
// Jacob's ladder gap by gap, a fermentation lock bubbling faster and faster, a
// kettle boiling dry and lifting its lid, grain dust flashing down a granary,
// dominoes finding a fork, one seed crystal setting a whole flask solid, a
// feather igniting and its ash lifting on its own updraft. No two cards share a
// central object: the OBJECT varies, never merely the hue.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g42ChainPlays.css), transform/opacity animations only, no imports from
// BoardEffects.tsx, only the SigPlugin/SigRole TYPES from sigPlugins.tsx.
//
// STAGING. Every card declares an anchor, and it is the one its own rule text
// can justify (scripts/lib/anchor-rule.ts): 19 cards land on a square and
// anchor "cast"; 10 whose reaction genuinely TRAVELS — a domino run, a beacon
// line, a ladder dropping, a wind sock tearing downwind — anchor "aim" and
// author their art pointing RIGHT inside <AimStage>; 12 have no square at all
// (a clock gain, a draft reroll, a cosmetic, a rule that binds every enemy
// slider) and anchor "board", because centring is the truthful staging for
// those rather than a compromise. Board-scale layers (washes, edge heat) live
// inside <BoardFrame>, never at a fixed percentage of the stage.
//
// RUNAWAY IS SEQUENTIAL, so this module leans on the victim order harder than
// most: .g42-relay reads --fx-index, so the per-square hit arrives BIGGER and
// more skewed the further along the chain the reaction has already run;
// .g42-runup reads --fx-len, .g42-jump reads --fx-aim-x/y, and .g42-updraft /
// .g42-hitside read --fx-side so nothing is authored as "the bottom of the
// board". All CSS lives in g42ChainPlays.css behind the `g42-` prefix.

import "./g42ChainPlays.css";

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
const rootStyle = (d: number): CSSProperties => ({ "--g42-d": `${d}ms` }) as CSSProperties;

/** stagger + a beat offset, scaled by the Settings animation-speed var. */
const b = (ms: number): string => `calc(var(--g42-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

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

/** Board-wide wash, always inside a BoardFrame. */
function Wash({ tone, d = 0 }: { tone: string; d?: number }) {
  return <L c="g42-wash" d={d} st={{ background: `radial-gradient(circle at 50% 48%, ${tone}, transparent 70%)` }} />;
}

/** Board-edge heat, always inside a BoardFrame. */
function Rim({ tone, d = 150 }: { tone: string; d?: number }) {
  return <L c="g42-rim" d={d} st={{ boxShadow: `inset 0 0 30px 9px ${tone}` }} />;
}

/* Bystander silhouettes the reaction runs over or around. */
const PAWN = "M12 4.4a2.7 2.7 0 0 1 1.6 4.9l1.8 6.4H8.6l1.8-6.4A2.7 2.7 0 0 1 12 4.4z M7.4 16.8h9.2V19.4H7.4z";
const KING = "M11.1 2.4h1.8v1.5h1.5v1.8h-1.5v1.6h-1.8V5.7H9.6V3.9h1.5zM8 9.2h8l-1.1 7.4H9.1zM7.2 17.6h9.6V20H7.2z";
const QUEEN = "M6.4 6l1.3 3.2L9.4 6.6 12 9.4l2.6-2.8 1.7 2.6L17.6 6l-1 10.4H7.4zM7 17.4h10v2.4H7z";
const KNIGHT = "M8.2 19V13c0-3.8 2.5-5.9 4.6-6.5L12 4.2l3 1.2c2 .9 2.9 2.9 2.9 5.9V19z";

/* --- 1. Border Report (t1) — THE BEACON CHAIN --------------------------------
   One hilltop brazier catches, and its light lights the next, and the next,
   until the whole border line is burning and nobody meant it to go that far.
   Palette: #ffc46b / #fff4d6 / #2a1a0c. */
const BR_HILLS = [0, 1, 2, 3];

function BorderReportScene({ role, delayMs }: SceneProps) {
  const brazier = (
    <g {...SJ}>
      <path d="M6 10h12l-2 9H8z" fill="#2a1a0c" stroke="#ffc46b" strokeWidth="1.2" />
      <path d="M12 2.6c2.4 3.2 3.6 5 3.6 6.6a3.6 3.6 0 0 1-7.2 0c0-1.6 1.2-3.4 3.6-6.6z" fill="#ffc46b" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-rise" l={26} t={26} w={48} h={56} d={40}>{brazier}</V>
        <V c="g42-br-light" l={34} t={10} w={32} h={34} d={280} st={{ transformOrigin: "50% 100%" }}>
          <path d="M12 2.6c2.4 3.2 3.6 5 3.6 6.6a3.6 3.6 0 0 1-7.2 0c0-1.6 1.2-3.4 3.6-6.6z" fill="#fff4d6" />
        </V>
        <L c="g42-ent-pop" l={44} t={6} w={12} h={12} d={480} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-relay" l={26} t={20} w={48} h={56} d={0}>{brazier}</V>
        <L c="g42-hit2" l={38} t={4} w={24} h={24} d={150} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 68%)" }} />
        <L c="g42-spit" l={48} t={16} w={3} h={3} d={280} st={{ borderRadius: "50%", background: "#ffc46b" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(255,196,107,0.28)" /><Rim tone="rgba(255,244,214,0.3)" /></>}>
      <L c="g42-runup" l={44} t={53} w={30} h={2} d={70} st={{ background: "linear-gradient(90deg, #ffc46b, rgba(255,196,107,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      {BR_HILLS.map((i) => (
        <V key={i} c="g42-br-light" l={43 + i * 5.4} t={42} w={6} h={11} d={160 + i * 130} st={{ transformOrigin: "50% 90%" }}>{brazier}</V>
      ))}
      <L c="g42-br-smoke" l={45} t={30} w={4} h={16} d={520} st={{ background: "linear-gradient(0deg, rgba(255,244,214,0.6), transparent)", transformOrigin: "50% 100%" }} />
      <L c="g42-updraft" l={57} t={40} w={3} h={3} d={640} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-ember" l={46 + i * 6} t={44} w={1.6} h={1.6} d={700 + i * 100} st={{ borderRadius: "50%", background: "#ffc46b" }} />
      ))}
    </AimLead>
  );
}

/* --- 2. Day Census (t1) — THE TALLY GETS AWAY FROM THE CLERK -----------------
   Chalk strokes score themselves onto a slate, four then the fifth slashed
   across, and the counting keeps going until the marks run off the edge.
   Palette: #cfe6ff / #fff4d6 / #16202e. */
const DC_MARKS = [0, 1, 2, 3];

function DayCensusScene({ role, delayMs }: SceneProps) {
  const slate = (
    <g {...SJ}>
      <rect x="2" y="3" width="20" height="18" rx="1" fill="#16202e" stroke="#cfe6ff" strokeWidth="1.3" />
      <path d="M4.6 6.4h14.8" stroke="#cfe6ff" strokeWidth="0.8" />
    </g>
  );
  const stroke = <path d="M12 3v18" stroke="#fff4d6" strokeWidth="2.4" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-drop" l={12} t={16} w={76} h={64} d={40}>{slate}</V>
        <V c="g42-dc-mark" l={30} t={26} w={12} h={46} d={260} st={{ transformOrigin: "50% 100%" }}>{stroke}</V>
        <V c="g42-dc-slash" l={26} t={24} w={44} h={50} d={470}><path d="M3 20L21 4" stroke="#cfe6ff" strokeWidth="2.6" {...SJ} /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hit" l={16} t={16} w={68} h={62} d={0}>{slate}</V>
        <V c="g42-relay" l={34} t={24} w={14} h={48} d={130} st={{ transformOrigin: "50% 100%" }}>{stroke}</V>
        <L c="g42-hit2" l={26} t={76} w={48} h={3} d={260} st={{ borderRadius: "999px", background: "#cfe6ff" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(207,230,255,0.24)" />}>
      <V c="g42-dc-slate" l={38} t={38} w={24} h={20} d={90}>{slate}</V>
      {DC_MARKS.map((i) => (
        <V key={i} c="g42-dc-mark" l={41 + i * 3.4} t={41} w={3} h={13} d={230 + i * 90} st={{ transformOrigin: "50% 100%" }}>{stroke}</V>
      ))}
      <V c="g42-dc-slash" l={40} t={41} w={16} h={13} d={590}><path d="M3 20L21 4" stroke="#cfe6ff" strokeWidth="2.6" {...SJ} /></V>
      <V c="g42-dc-spill" l={55} t={42} w={9} h={11} d={660}>
        <g stroke="#fff4d6" strokeWidth="2.2" {...SJ}><path d="M6 4v16M12 4v16M18 4v16" /></g>
      </V>
      <L c="g42-lean" l={38} t={56} w={24} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(22,32,46,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-sift" l={42 + i * 7} t={57} w={1.5} h={1.5} d={740 + i * 90} st={{ borderRadius: "50%", background: "#cfe6ff" }} />
      ))}
    </Lead>
  );
}

/* --- 3. Left Bank Atlas (t1) — THE INK TAKES THE RIVER -----------------------
   A blot lands on the atlas, finds the river line, runs it, and every tributary
   fills behind it until the whole left bank is drowned in ink.
   Palette: #6fa8d8 / #fff4d6 / #10243a. */
const LB_BRANCH = [0, 1, 2];

function LeftBankAtlasScene({ role, delayMs }: SceneProps) {
  const page = (
    <g {...SJ}>
      <rect x="2" y="3" width="20" height="18" rx="1" fill="#fff4d6" stroke="#10243a" strokeWidth="1.1" />
      <path d="M4.6 15c3.6-1 5-4.4 8.4-5.6 2.6-1 4 .4 6.4-.6" fill="none" stroke="#6fa8d8" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-rise" l={10} t={18} w={80} h={62} d={40}>{page}</V>
        <L c="g42-lb-drop" l={40} t={22} w={14} h={14} d={280} st={{ borderRadius: "50%", background: "#10243a" }} />
        <L c="g42-lb-flood" l={8} t={54} w={54} h={26} d={470} st={{ background: "linear-gradient(90deg, #6fa8d8, rgba(111,168,216,0))", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hit" l={12} t={16} w={76} h={62} d={0}>{page}</V>
        <L c="g42-relay" l={38} t={34} w={22} h={22} d={140} st={{ borderRadius: "50%", background: "#10243a" }} />
        <L c="g42-hit2" l={18} t={62} w={64} h={8} d={260} st={{ background: "linear-gradient(90deg, #6fa8d8, rgba(111,168,216,0))" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(111,168,216,0.26)" />}>
      <V c="g42-lb-page" l={38} t={38} w={26} h={22} d={80}>{page}</V>
      <L c="g42-lb-drop" l={45} t={44} w={4} h={4} d={230} st={{ borderRadius: "50%", background: "#10243a" }} />
      <L c="g42-runup" l={46} t={48} w={28} h={1.8} d={330} st={{ background: "linear-gradient(90deg, #10243a, rgba(16,36,58,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      {LB_BRANCH.map((i) => (
        <L key={i} c="g42-lb-branch" l={49 + i * 6} t={44 + i * 3} w={7} h={1.4} d={430 + i * 120} st={{ background: "#6fa8d8", transformOrigin: "0% 50%", rotate: `${-28 + i * 26}deg` }} />
      ))}
      <L c="g42-lb-flood" l={38} t={44} w={18} h={12} d={700} st={{ background: "linear-gradient(90deg, rgba(16,36,58,0.75), rgba(111,168,216,0))" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-sift" l={44 + i * 7} t={54} w={1.5} h={1.5} d={760 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </AimLead>
  );
}

/* --- 4. Palace Floor Plan (t1) — THE HOUSE OF CARDS GOES ROOM BY ROOM --------
   The plan is drawn in standing cards. One leans, its neighbour takes the
   weight, and the collapse walks the whole floor plan wing to wing.
   Palette: #e8d3a8 / #fff4d6 / #2b2114. */
const PF_CARDS = [0, 1, 2, 3];

function PalaceFloorPlanScene({ role, delayMs }: SceneProps) {
  const tent = (
    <g {...SJ}>
      <path d="M12 3L5 21h3.2L12 8.6 15.8 21H19z" fill="#e8d3a8" stroke="#2b2114" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-rise" l={8} t={22} w={40} h={58} d={40}>{tent}</V>
        <V c="g42-pf-card" l={44} t={22} w={40} h={58} d={250} st={{ transformOrigin: "50% 100%" }}>{tent}</V>
        <L c="g42-ent-pop" l={20} t={78} w={60} h={4} d={470} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-relay" l={12} t={20} w={44} h={60} d={0} st={{ transformOrigin: "50% 100%" }}>{tent}</V>
        <V c="g42-hitside" l={48} t={22} w={44} h={58} d={140} st={{ transformOrigin: "50% 100%" }}>{tent}</V>
        <L c="g42-hit2" l={16} t={80} w={68} h={3} d={270} st={{ borderRadius: "999px", background: "#e8d3a8" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(232,211,168,0.26)" />}>
      <L c="g42-pf-plan" l={37} t={37} w={26} h={24} d={80} st={{ border: "1px solid #e8d3a8" }} />
      {PF_CARDS.map((i) => (
        <V key={i} c="g42-pf-card" l={39 + i * 5.6} t={40} w={6} h={13} d={220 + i * 120} st={{ transformOrigin: "50% 100%" }}>{tent}</V>
      ))}
      <V c="g42-pf-fall" l={58} t={44} w={8} h={10} d={680}>
        <path d="M2 20h20l-2-5H4z" fill="#e8d3a8" stroke="#2b2114" strokeWidth="1" {...SJ} />
      </V>
      <L c="g42-lean" l={38} t={54} w={24} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(43,33,20,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-sift" l={43 + i * 6} t={52} w={1.5} h={1.5} d={740 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 5. Pep Talk (t1) — THE KETTLE BOILS OVER --------------------------------
   A friendly word under the kettle. It rocks, the lid starts to chatter, and by
   the third beat it is climbing off the hob on its own steam.
   Palette: #ffb066 / #fff4d6 / #2a1608. */
const PT_BUBBLES = [0, 1, 2];

function PepTalkScene({ role, delayMs }: SceneProps) {
  const kettle = (
    <g {...SJ}>
      <path d="M5 11h14v5.4c0 2.6-2 4.6-5.4 4.6h-3.2C7 21 5 19 5 16.4z" fill="#ffb066" stroke="#2a1608" strokeWidth="1.2" />
      <path d="M19 12.6c2.2.6 2.6 3.4.6 4.4" fill="none" stroke="#2a1608" strokeWidth="1.2" />
      <path d="M8.4 11c0-2.6 1.4-4 3.6-4s3.6 1.4 3.6 4" fill="none" stroke="#2a1608" strokeWidth="1.2" />
    </g>
  );
  const lid = <path d="M6 8.6h12v2.2H6zM11 5.6h2v3h-2z" fill="#fff4d6" stroke="#2a1608" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-pt-kettle" l={20} t={34} w={60} h={52} d={40}>{kettle}</V>
        <V c="g42-pt-lid" l={26} t={14} w={48} h={34} d={280} st={{ transformOrigin: "50% 100%" }}>{lid}</V>
        <L c="g42-ent-pop" l={42} t={4} w={16} h={16} d={470} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 66%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hit" l={24} t={34} w={52} h={50} d={0}>{kettle}</V>
        <V c="g42-hitside" l={30} t={12} w={40} h={30} d={140} st={{ transformOrigin: "50% 100%" }}>{lid}</V>
        <L c="g42-hit2" l={44} t={2} w={12} h={12} d={270} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(255,176,102,0.28)" /><Rim tone="rgba(255,244,214,0.24)" /></>}>
      <V c="g42-pt-kettle" l={43} t={43} w={14} h={13} d={90}>{kettle}</V>
      {PT_BUBBLES.map((i) => (
        <L key={i} c="g42-pt-bubble" l={45 + i * 3.4} t={47} w={2.2} h={2.2} d={250 + i * 110} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
      <V c="g42-pt-lid" l={44} t={38} w={12} h={7} d={560} st={{ transformOrigin: "50% 100%" }}>{lid}</V>
      <L c="g42-updraft" l={48} t={36} w={5} h={5} d={640} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.8), transparent 66%)" }} />
      <V c="g42-pt-king" l={45.5} t={45} w={9} h={12} d={700}><path d={KING} fill="none" stroke="#fff4d6" strokeWidth="1.4" {...SJ} /></V>
      <L c="g42-glint" l={53} t={40} w={2.2} h={2.2} d={760} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 6. Threat Ledger (t1) — THE RED STRING PULLS ITSELF TAUT ----------------
   Index cards go up, red string is run card to card, and then the string draws
   tight on its own and starts firing the pins out of the cork.
   Palette: #ff7a6b / #fff4d6 / #241318. */
const TL_PINS = [0, 1, 2];

function ThreatLedgerScene({ role, delayMs }: SceneProps) {
  const card = (
    <g {...SJ}>
      <rect x="3" y="5" width="18" height="14" rx="1" fill="#fff4d6" stroke="#241318" strokeWidth="1.1" />
      <path d="M6 10h12M6 13.4h8" stroke="#241318" strokeWidth="0.9" />
    </g>
  );
  const pin = <g><circle cx="12" cy="9" r="4.4" fill="#ff7a6b" /><path d="M12 13v8" stroke="#241318" strokeWidth="1.6" {...SJ} /></g>;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-drop" l={6} t={18} w={44} h={44} d={40}>{card}</V>
        <V c="g42-tl-card" l={50} t={30} w={44} h={44} d={250}>{card}</V>
        <L c="g42-tl-taut" l={20} t={44} w={58} h={2} d={470} st={{ background: "#ff7a6b", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hit" l={16} t={18} w={56} h={48} d={0}>{card}</V>
        <V c="g42-relay" l={54} t={38} w={30} h={40} d={140}>{pin}</V>
        <L c="g42-hit2" l={14} t={70} w={68} h={2.4} d={270} st={{ background: "#ff7a6b", borderRadius: "999px" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(255,122,107,0.26)" />}>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g42-tl-card" l={38 + i * 9} t={38 + (i % 2) * 8} w={11} h={9} d={100 + i * 110}>{card}</V>
      ))}
      <L c="g42-runup" l={44} t={47} w={26} h={1.4} d={420} st={{ background: "linear-gradient(90deg, #ff7a6b, rgba(255,122,107,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <L c="g42-tl-taut" l={39} t={44} w={22} h={1.6} d={520} st={{ background: "#ff7a6b", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      {TL_PINS.map((i) => (
        <V key={i} c="g42-tl-pin" l={40 + i * 8} t={41 + (i % 2) * 7} w={4} h={5} d={600 + i * 110}>{pin}</V>
      ))}
      <L c="g42-sift" l={52} t={52} w={1.6} h={1.6} d={780} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 7. Ticker Tape (t1) — THE REEL RUNS AWAY WITH ITSELF --------------------
   The glass dome ticks once, politely. Then the reel spins up, the tape comes
   out faster than anyone can read it, and it piles up over the square.
   Palette: #a8e6c0 / #fff4d6 / #12271d. */
const TT_TAPE = [0, 1, 2];

function TickerTapeScene({ role, delayMs }: SceneProps) {
  const dome = (
    <g {...SJ}>
      <path d="M4 21V13a8 8 0 0 1 16 0v8z" fill="none" stroke="#a8e6c0" strokeWidth="1.4" />
      <rect x="8" y="12" width="8" height="8" rx="1" fill="#12271d" stroke="#a8e6c0" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-rise" l={22} t={22} w={56} h={56} d={40}>{dome}</V>
        <V c="g42-tt-reel" l={36} t={36} w={28} h={28} d={270}><circle cx="12" cy="12" r="8" fill="none" stroke="#fff4d6" strokeWidth="2" strokeDasharray="4 3" /></V>
        <L c="g42-tt-tape" l={10} t={64} w={80} h={5} d={470} st={{ background: "#fff4d6", transformOrigin: "100% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hit" l={22} t={16} w={56} h={54} d={0}>{dome}</V>
        <L c="g42-relay" l={16} t={62} w={68} h={5} d={140} st={{ background: "#fff4d6", transformOrigin: "100% 50%" }} />
        <L c="g42-hit2" l={40} t={74} w={20} h={6} d={270} st={{ background: "#a8e6c0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(168,230,192,0.24)" />}>
      <V c="g42-tt-dome" l={42} t={38} w={16} h={16} d={90}>{dome}</V>
      <V c="g42-tt-reel" l={45} t={41} w={10} h={10} d={240}><circle cx="12" cy="12" r="8" fill="none" stroke="#fff4d6" strokeWidth="2.4" strokeDasharray="4 3" /></V>
      {TT_TAPE.map((i) => (
        <L key={i} c="g42-tt-tape" l={36 - i * 3} t={50 + i * 2.6} w={20 + i * 5} h={1.8} d={340 + i * 120} st={{ background: "#fff4d6", transformOrigin: "100% 50%" }} />
      ))}
      <L c="g42-tt-pile" l={36} t={56} w={22} h={4} d={660} st={{ background: "linear-gradient(180deg, #fff4d6, rgba(168,230,192,0.3))", borderRadius: "2px" }} />
      <L c="g42-updraft" l={54} t={44} w={3} h={3} d={700} st={{ borderRadius: "50%", background: "#a8e6c0" }} />
      <L c="g42-glint" l={41} t={36} w={2.2} h={2.2} d={760} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 8. Sugar Glider (t1) — THE CARAMEL COMES OVER THE RIM -------------------
   Sugar slumps, colours, and then the whole pan foams up at once and runs down
   the outside in three sticky tongues. Palette: #e8a94a / #fff4d6 / #2e1b06. */
const SG_RUNS = [0, 1, 2];

function SugarGliderScene({ role, delayMs }: SceneProps) {
  const pan = (
    <g {...SJ}>
      <path d="M4 9h13v6.4c0 2.8-2 4.6-5 4.6h-3c-3 0-5-1.8-5-4.6z" fill="#2e1b06" stroke="#e8a94a" strokeWidth="1.2" />
      <path d="M17 10.4h4.4" stroke="#e8a94a" strokeWidth="1.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-rise" l={16} t={30} w={68} h={54} d={40}>{pan}</V>
        <V c="g42-sg-cube" l={34} t={22} w={26} h={26} d={260}><rect x="4" y="4" width="16" height="16" rx="1" fill="#fff4d6" /></V>
        <L c="g42-sg-foam" l={26} t={26} w={44} h={26} d={470} st={{ borderRadius: "999px", background: "#e8a94a", transformOrigin: "50% 100%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hit" l={18} t={30} w={64} h={50} d={0}>{pan}</V>
        <L c="g42-relay" l={26} t={26} w={44} h={20} d={140} st={{ borderRadius: "999px", background: "#e8a94a", transformOrigin: "50% 100%" }} />
        <L c="g42-hit2" l={40} t={70} w={6} h={20} d={270} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(232,169,74,0.28)" />}>
      <V c="g42-sg-pan" l={42} t={43} w={16} h={13} d={90}>{pan}</V>
      <V c="g42-sg-cube" l={46} t={41} w={6} h={6} d={230}><rect x="4" y="4" width="16" height="16" rx="1" fill="#fff4d6" /></V>
      <L c="g42-sg-foam" l={43} t={40} w={14} h={7} d={400} st={{ borderRadius: "999px", background: "#e8a94a", transformOrigin: "50% 100%" }} />
      {SG_RUNS.map((i) => (
        <L key={i} c="g42-sg-run" l={44 + i * 5} t={50} w={1.8} h={6} d={520 + i * 110} st={{ borderRadius: "999px", background: "#e8a94a", transformOrigin: "50% 0%" }} />
      ))}
      <L c="g42-updraft" l={48} t={38} w={5} h={5} d={680} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.8), transparent 68%)" }} />
      <L c="g42-glint" l={53} t={42} w={2.2} h={2.2} d={760} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 9. Do-Si-Do (t2) — THE SWING GOES OVER THE BAR --------------------------
   A sideways step, then another, each one a little bigger, until the swing
   loops the top bar and the chains go slack in mid-air.
   Palette: #b9d6ff / #fff4d6 / #16223a. */
function DoSiDoScene({ role, delayMs }: SceneProps) {
  const swing = (
    <g {...SJ}>
      <path d="M7 2v13M17 2v13" stroke="#b9d6ff" strokeWidth="1.4" />
      <rect x="4.6" y="15" width="14.8" height="3.4" rx="1" fill="#fff4d6" stroke="#16223a" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-rise" l={14} t={8} w={72} h={40} d={40}><path d="M2 20L12 4l10 16" fill="none" stroke="#b9d6ff" strokeWidth="1.8" {...SJ} /></V>
        <V c="g42-ds-swing" l={28} t={22} w={44} h={56} d={270} st={{ transformOrigin: "50% 0%" }}>{swing}</V>
        <L c="g42-ds-slack" l={40} t={12} w={22} h={3} d={480} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hitside" l={26} t={16} w={48} h={58} d={0} st={{ transformOrigin: "50% 0%" }}>{swing}</V>
        <L c="g42-relay" l={34} t={70} w={32} h={4} d={140} st={{ borderRadius: "999px", background: "#b9d6ff" }} />
        <L c="g42-hit2" l={44} t={6} w={12} h={12} d={270} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(185,214,255,0.26)" />}>
      <V c="g42-ds-frame" l={40} t={33} w={20} h={20} d={80}><path d="M2 20L12 4l10 16" fill="none" stroke="#b9d6ff" strokeWidth="1.6" {...SJ} /></V>
      <V c="g42-ds-swing" l={44} t={38} w={12} h={16} d={220} st={{ transformOrigin: "50% 0%" }}>{swing}</V>
      <L c="g42-ds-slack" l={49} t={37} w={9} h={1.4} d={470} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "0% 50%" }} />
      <L c="g42-jump" l={47} t={45} w={6} h={6} d={560} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 68%)" }} />
      <L c="g42-lean" l={42} t={55} w={18} h={3} d={640} st={{ borderRadius: "999px", background: "rgba(22,34,58,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-sift" l={45 + i * 6} t={53} w={1.5} h={1.5} d={700 + i * 100} st={{ borderRadius: "50%", background: "#b9d6ff" }} />
      ))}
    </AimLead>
  );
}

/* --- 10. Party Hat (t3) — THE TRICK CANDLE WILL NOT GO OUT -------------------
   Blow it out and it comes back bigger, three times over, until the wax is
   running down the cone and the brim is smouldering.
   Palette: #ff8fd0 / #fff4d6 / #33122a. */
const PH_RELIGHT = [0, 1, 2];

function PartyHatScene({ role, delayMs }: SceneProps) {
  const hat = (
    <g {...SJ}>
      <path d="M12 3l6 16H6z" fill="#ff8fd0" stroke="#33122a" strokeWidth="1.2" />
      <path d="M8 14h8M9.4 10h5.2" stroke="#fff4d6" strokeWidth="1" />
    </g>
  );
  const flame = <path d="M12 3c2.2 3.4 3.4 5 3.4 6.8a3.4 3.4 0 0 1-6.8 0C8.6 8 9.8 6.4 12 3z" fill="#fff4d6" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-drop" l={24} t={26} w={52} h={58} d={40}>{hat}</V>
        <V c="g42-ph-flame" l={38} t={4} w={24} h={26} d={280} st={{ transformOrigin: "50% 100%" }}>{flame}</V>
        <L c="g42-ph-puff" l={40} t={2} w={20} h={20} d={480} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,143,208,0.7), transparent 68%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hitside" l={26} t={26} w={48} h={56} d={0}>{hat}</V>
        <V c="g42-relay" l={40} t={4} w={20} h={24} d={140} st={{ transformOrigin: "50% 100%" }}>{flame}</V>
        <L c="g42-hit2" l={44} t={68} w={12} h={12} d={270} st={{ borderRadius: "50%", background: "#ff8fd0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(255,143,208,0.28)" /><Rim tone="rgba(255,244,214,0.22)" /></>}>
      <V c="g42-ph-hat" l={44} t={41} w={12} h={15} d={90}>{hat}</V>
      {PH_RELIGHT.map((i) => (
        <V key={i} c="g42-ph-flame" l={47.4 - i * 0.6} t={37 - i * 1.6} w={5 + i * 1.2} h={6 + i * 1.6} d={230 + i * 140} st={{ transformOrigin: "50% 100%" }}>{flame}</V>
      ))}
      <L c="g42-ph-wax" l={46} t={46} w={1.6} h={6} d={620} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "50% 0%" }} />
      <L c="g42-ph-puff" l={44} t={34} w={10} h={10} d={660} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,143,208,0.65), transparent 70%)" }} />
      <L c="g42-updraft" l={52} t={40} w={3} h={3} d={720} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      <L c="g42-glint" l={41} t={44} w={2.2} h={2.2} d={780} st={{ borderRadius: "50%", background: "#ff8fd0" }} />
    </Lead>
  );
}

/* --- 11. Gryphon Rider (t6) — THE FEATHER LIGHTS ITS OWN UPDRAFT -------------
   One barb catches at the quill. The fire runs the vane barb by barb, and the
   ash it makes lifts on the heat it made. Palette: #ffd48a / #fff4d6 / #2b1c08. */
const GR_BARBS = [0, 1, 2, 3];

function GryphonRiderScene({ role, delayMs }: SceneProps) {
  const feather = (
    <g {...SJ}>
      <path d="M3.4 20.6C4 12 9 5 19.4 3.4c1.2 9.6-3.4 15.6-11.6 17.2z" fill="none" stroke="#ffd48a" strokeWidth="1.4" />
      <path d="M3.4 20.6L18 5.4" stroke="#ffd48a" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-rise" l={12} t={12} w={72} h={72} d={40}>{feather}</V>
        <V c="g42-gr-barb" l={44} t={26} w={26} h={26} d={280} st={{ transformOrigin: "0% 100%" }}>
          <path d="M12 4c2 3 3 4.6 3 6.2a3 3 0 0 1-6 0C9 8.6 10 7 12 4z" fill="#fff4d6" />
        </V>
        <L c="g42-updraft" l={46} t={20} w={9} h={9} d={480} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,212,138,0.8), transparent 68%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hit" l={14} t={14} w={68} h={68} d={0}>{feather}</V>
        <V c="g42-relay" l={38} t={30} w={30} h={30} d={140} st={{ transformOrigin: "0% 100%" }}>
          <path d="M12 4c2 3 3 4.6 3 6.2a3 3 0 0 1-6 0C9 8.6 10 7 12 4z" fill="#fff4d6" />
        </V>
        <L c="g42-hit2" l={42} t={6} w={14} h={14} d={280} st={{ borderRadius: "50%", background: "radial-gradient(circle, #ffd48a, transparent 68%)" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(255,212,138,0.3)" /><Rim tone="rgba(255,244,214,0.28)" /></>}>
      <V c="g42-gr-feather" l={40} t={38} w={22} h={22} d={90}>{feather}</V>
      {GR_BARBS.map((i) => (
        <V key={i} c="g42-gr-barb" l={43 + i * 4.4} t={44 - i * 1.6} w={5} h={6} d={220 + i * 120} st={{ transformOrigin: "50% 100%" }}>
          <path d="M12 4c2 3 3 4.6 3 6.2a3 3 0 0 1-6 0C9 8.6 10 7 12 4z" fill="#fff4d6" />
        </V>
      ))}
      <L c="g42-runup" l={44} t={52} w={28} h={2} d={520} st={{ background: "linear-gradient(90deg, #ffd48a, rgba(255,212,138,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <L c="g42-updraft" l={48} t={40} w={6} h={6} d={620} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.75), transparent 68%)" }} />
      <L c="g42-lean" l={42} t={55} w={18} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(43,28,8,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-ember" l={45 + i * 6} t={46} w={1.6} h={1.6} d={720 + i * 100} st={{ borderRadius: "50%", background: "#ffd48a" }} />
      ))}
    </AimLead>
  );
}

/* --- 12. Puppeteer's Gala (t6) — THE STRINGS TAKE EACH OTHER -----------------
   One string is pulled. It fouls the next control bar, which pulls the next,
   and by the end the puppeteer is the one being worked.
   Palette: #d8b0f0 / #fff4d6 / #221436. */
const PG_STRINGS = [0, 1, 2];

function PuppeteersGalaScene({ role, delayMs }: SceneProps) {
  const bar = <path d="M2 5h20M12 5v4" stroke="#d8b0f0" strokeWidth="2" fill="none" {...SJ} />;
  const puppet = (
    <g {...SJ}>
      <circle cx="12" cy="5" r="2.6" fill="#fff4d6" />
      <path d="M12 7.6v7M12 9.4L7 12M12 9.4l5 2.6M12 14.6L9 21M12 14.6L15 21" stroke="#fff4d6" strokeWidth="1.4" fill="none" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-drop" l={16} t={8} w={68} h={24} d={40}>{bar}</V>
        <V c="g42-pg-puppet" l={30} t={30} w={40} h={54} d={270}>{puppet}</V>
        <L c="g42-pg-string" l={48} t={22} w={2} h={26} d={470} st={{ background: "#d8b0f0", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hitside" l={14} t={8} w={72} h={22} d={0}>{bar}</V>
        <V c="g42-relay" l={30} t={28} w={40} h={56} d={140}>{puppet}</V>
        <L c="g42-hit2" l={48} t={24} w={2.4} h={22} d={280} st={{ background: "#fff4d6", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(216,176,240,0.26)" />}>
      <V c="g42-pg-bar" l={40} t={33} w={20} h={7} d={90} st={{ transformOrigin: "20% 50%" }}>{bar}</V>
      {PG_STRINGS.map((i) => (
        <L key={i} c="g42-pg-string" l={44 + i * 5} t={37} w={1.2} h={9} d={230 + i * 130} st={{ background: "#d8b0f0", transformOrigin: "50% 0%" }} />
      ))}
      <V c="g42-pg-puppet" l={43} t={44} w={8} h={12} d={480}>{puppet}</V>
      <V c="g42-pg-puppet" l={52} t={45} w={8} h={12} d={600}>{puppet}</V>
      <L c="g42-jump" l={47} t={44} w={6} h={6} d={660} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.8), transparent 68%)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-sift" l={44 + i * 6} t={56} w={1.5} h={1.5} d={720 + i * 100} st={{ borderRadius: "50%", background: "#d8b0f0" }} />
      ))}
    </AimLead>
  );
}

/* --- 13. Hall of Doors (t8) — THE DOMINOES FIND A FORK -----------------------
   A tile is nudged. The run walks the hall, reaches a fork, and takes BOTH
   branches, which is the moment it stops being a trick and becomes a problem.
   Palette: #ffe0a0 / #fff4d6 / #241a0e. */
const HD_RUN = [0, 1, 2, 3, 4];
const HD_FORKS = [-1, 1];

function HallOfDoorsScene({ role, delayMs }: SceneProps) {
  const tile = (
    <g {...SJ}>
      <rect x="7" y="2" width="10" height="20" rx="1" fill="#ffe0a0" stroke="#241a0e" strokeWidth="1.2" />
      <path d="M8.4 12h7.2" stroke="#241a0e" strokeWidth="1" />
      <circle cx="12" cy="7" r="1.4" fill="#241a0e" />
      <circle cx="12" cy="17" r="1.4" fill="#241a0e" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-rise" l={8} t={20} w={30} h={60} d={40}>{tile}</V>
        <V c="g42-hd-fall" l={34} t={20} w={30} h={60} d={260} st={{ transformOrigin: "50% 100%" }}>{tile}</V>
        <V c="g42-hd-branch" l={60} t={22} w={30} h={58} d={470} st={{ transformOrigin: "50% 100%" }}>{tile}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-relay" l={16} t={16} w={32} h={64} d={0} st={{ transformOrigin: "50% 100%" }}>{tile}</V>
        <V c="g42-hitside" l={52} t={18} w={32} h={62} d={150} st={{ transformOrigin: "50% 100%" }}>{tile}</V>
        <L c="g42-hit2" l={18} t={82} w={64} h={3} d={280} st={{ borderRadius: "999px", background: "#ffe0a0" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(255,224,160,0.3)" /><Rim tone="rgba(255,244,214,0.3)" /></>}>
      <L c="g42-hd-set" l={44} t={52} w={22} h={1.6} d={70} st={{ background: "#ffe0a0", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      {HD_RUN.map((i) => (
        <V key={i} c="g42-hd-fall" l={43.5 + i * 3.2} t={44} w={3} h={9} d={180 + i * 105} st={{ transformOrigin: "50% 100%" }}>{tile}</V>
      ))}
      <V c="g42-hd-fork" l={59} t={44} w={3.4} h={9} d={720} st={{ transformOrigin: "50% 100%" }}>{tile}</V>
      {HD_FORKS.map((s, i) => (
        <L key={i} c="g42-hd-branch" l={61} t={48} w={12} h={1.6} d={760 + i * 70} st={{ background: "linear-gradient(90deg, #fff4d6, rgba(255,224,160,0))", transformOrigin: "0% 50%", rotate: `${s * 26}deg`, borderRadius: "999px" }} />
      ))}
      <L c="g42-runup" l={44} t={49} w={30} h={1.4} d={620} st={{ background: "linear-gradient(90deg, #ffe0a0, rgba(255,224,160,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <L c="g42-lean" l={44} t={55} w={22} h={3} d={800} st={{ borderRadius: "999px", background: "rgba(36,26,14,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-sift" l={48 + i * 7} t={53} w={1.6} h={1.6} d={840 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </AimLead>
  );
}

/* --- 14. Distant Thunder (t1) — THE ANVIL HEAD LIGHTS FROM INSIDE ------------
   A flicker deep in the cloud, then two, then the whole anvil glows from within
   and the sound arrives late. Palette: #8fb4e0 / #fff4d6 / #14203a. */
const DT_FLASH = [0, 1, 2];

function DistantThunderScene({ role, delayMs }: SceneProps) {
  const cloud = (
    <path
      d="M3 17c-1.4-3.4 1-6.2 4-6.2C7.6 6.4 11 4 14.4 5c2.8.8 4 3.2 3.8 5.6 2.6.2 3.8 2.4 2.8 4.6z"
      fill="#14203a"
      stroke="#8fb4e0"
      strokeWidth="1.2"
      {...SJ}
    />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-drop" l={10} t={18} w={80} h={48} d={40}>{cloud}</V>
        <L c="g42-dt-flash" l={34} t={30} w={32} h={20} d={280} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 66%)" }} />
        <L c="g42-dt-rumble" l={20} t={56} w={60} h={20} d={480} st={{ borderRadius: "50%", border: "2px solid #8fb4e0" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hitside" l={12} t={16} w={76} h={46} d={0}>{cloud}</V>
        <L c="g42-relay" l={36} t={28} w={28} h={18} d={140} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 66%)" }} />
        <L c="g42-hit2" l={26} t={58} w={48} h={16} d={280} st={{ borderRadius: "50%", border: "2px solid #8fb4e0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(143,180,224,0.26)" /><Rim tone="rgba(255,244,214,0.2)" /></>}>
      <V c="g42-dt-cloud" l={38} t={34} w={26} h={18} d={90}>{cloud}</V>
      {DT_FLASH.map((i) => (
        <L key={i} c="g42-dt-flash" l={42 + i * 4} t={38} w={7 + i * 2} h={7} d={240 + i * 130} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 66%)" }} />
      ))}
      <L c="g42-dt-rumble" l={38} t={40} w={26} h={16} d={640} st={{ borderRadius: "50%", border: "2px solid #8fb4e0" }} />
      <L c="g42-updraft" l={49} t={32} w={5} h={5} d={700} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.7)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-sift" l={43 + i * 7} t={52} w={1.4} h={3.4} d={740 + i * 90} st={{ borderRadius: "999px", background: "#8fb4e0" }} />
      ))}
    </Lead>
  );
}

/* --- 15. Static Cling (t1) — THE ARC CLIMBS THE LADDER -----------------------
   Two rails, a hair's gap at the bottom. The arc strikes, is carried up by its
   own heat, and each rung it climbs is wider and louder than the last.
   Palette: #9fe0ff / #fff4d6 / #0e1c2c. */
const SC_RUNGS = [0, 1, 2, 3];

function StaticClingScene({ role, delayMs }: SceneProps) {
  const rails = (
    <g fill="none" stroke="#9fe0ff" strokeWidth="1.6" {...SJ}>
      <path d="M9.4 21V9L4.6 3" />
      <path d="M14.6 21V9l4.8-6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-rise" l={22} t={16} w={56} h={68} d={40}>{rails}</V>
        <L c="g42-sc-arc" l={40} t={52} w={20} h={3} d={280} st={{ borderRadius: "999px", background: "#fff4d6" }} />
        <L c="g42-sc-arc" l={32} t={30} w={36} h={4} d={470} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hit" l={24} t={16} w={52} h={66} d={0}>{rails}</V>
        <L c="g42-relay" l={34} t={40} w={32} h={4} d={140} st={{ borderRadius: "999px", background: "#fff4d6" }} />
        <L c="g42-spit" l={50} t={26} w={3} h={3} d={280} st={{ borderRadius: "50%", background: "#9fe0ff" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(159,224,255,0.26)" /><Rim tone="rgba(255,244,214,0.24)" /></>}>
      <V c="g42-sc-rail" l={43} t={38} w={14} h={18} d={80}>{rails}</V>
      {SC_RUNGS.map((i) => (
        <L key={i} c="g42-sc-arc" l={47 - i * 1.2} t={51 - i * 2.6} w={5 + i * 2.4} h={1.2} d={210 + i * 120} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      ))}
      <L c="g42-jump" l={48} t={40} w={5} h={5} d={640} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 66%)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-spit" l={46 + i * 5} t={40 - i * 2} w={1.6} h={1.6} d={700 + i * 100} st={{ borderRadius: "50%", background: "#9fe0ff" }} />
      ))}
      <L c="g42-glint" l={52} t={36} w={2.4} h={2.4} d={780} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 16. Storm Door (t2) — THE WIND SOCK TEARS OFF ---------------------------
   Three gusts, each fuller than the last, and on the third the collar splits
   and the sock goes streaming off downwind on its own.
   Palette: #ffb45c / #fff4d6 / #2a1a0a. */
const SD_GUSTS = [0, 1, 2];

function StormDoorScene({ role, delayMs }: SceneProps) {
  const sock = (
    <g {...SJ}>
      <path d="M3 7.4h4l13 3.2-13 3.2H3z" fill="#ffb45c" stroke="#2a1a0a" strokeWidth="1.1" />
      <path d="M9 8.6v5.6M13.4 9.6v3.6" stroke="#fff4d6" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-rise" l={6} t={14} w={16} h={70} d={40}><path d="M12 2v20" stroke="#fff4d6" strokeWidth="3" {...SJ} /></V>
        <V c="g42-sd-gust" l={16} t={30} w={72} h={40} d={280} st={{ transformOrigin: "0% 50%" }}>{sock}</V>
        <L c="g42-sd-tear" l={20} t={40} w={10} h={4} d={480} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-relay" l={12} t={30} w={76} h={40} d={0} st={{ transformOrigin: "0% 50%" }}>{sock}</V>
        <L c="g42-hitside" l={8} t={16} w={6} h={68} d={140} st={{ borderRadius: "999px", background: "#fff4d6" }} />
        <L c="g42-hit2" l={62} t={44} w={22} h={3} d={280} st={{ borderRadius: "999px", background: "#ffb45c" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(255,180,92,0.26)" />}>
      <L c="g42-sd-pole" l={44} t={40} w={1.6} h={16} d={80} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "50% 100%" }} />
      {SD_GUSTS.map((i) => (
        <V key={i} c="g42-sd-gust" l={45} t={43 - i * 0.6} w={12 + i * 3} h={7 + i * 1.4} d={220 + i * 130} st={{ transformOrigin: "0% 50%" }}>{sock}</V>
      ))}
      <L c="g42-sd-tear" l={45} t={45} w={3} h={1.6} d={620} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <L c="g42-jump" l={50} t={44} w={7} h={4} d={680} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #ffb45c, rgba(255,180,92,0))" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-sift" l={52 + i * 5} t={42 + i * 3} w={1.5} h={1.5} d={740 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </AimLead>
  );
}

/* --- 17. Thunderstorm (t3) — ONE STONE, THEN THE BARRAGE --------------------
   A single hailstone knocks on the shingles. Four more answer it, one splits on
   impact, and the roof stops being audible. Palette: #cfe4ff / #fff4d6 / #101c30. */
const TS_HAIL = [0, 1, 2, 3];

function ThunderstormScene({ role, delayMs }: SceneProps) {
  const stone = <circle cx="12" cy="12" r="7.4" fill="#cfe4ff" stroke="#101c30" strokeWidth="1.2" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-drop" l={36} t={4} w={28} h={28} d={40}>{stone}</V>
        <L c="g42-ts-roof" l={8} t={64} w={84} h={3} d={280} st={{ borderRadius: "999px", background: "#fff4d6" }} />
        <V c="g42-ts-split" l={30} t={54} w={40} h={30} d={480}>
          <path d="M4 20l6-8 4 5 6-9" fill="none" stroke="#cfe4ff" strokeWidth="2" {...SJ} />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-relay" l={34} t={10} w={32} h={32} d={0}>{stone}</V>
        <L c="g42-hitside" l={16} t={66} w={68} h={3} d={140} st={{ borderRadius: "999px", background: "#fff4d6" }} />
        <L c="g42-hit2" l={40} t={56} w={20} h={20} d={280} st={{ borderRadius: "50%", background: "radial-gradient(circle, #cfe4ff, transparent 68%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(207,228,255,0.26)" /><Rim tone="rgba(255,244,214,0.2)" /></>}>
      <L c="g42-ts-roof" l={38} t={54} w={26} h={1.8} d={80} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <V c="g42-ts-first" l={47} t={30} w={5} h={5} d={200}>{stone}</V>
      {TS_HAIL.map((i) => (
        <V key={i} c="g42-ts-hail" l={40 + i * 5.4} t={26 + (i % 2) * 4} w={4} h={4} d={330 + i * 110}>{stone}</V>
      ))}
      <V c="g42-ts-split" l={44} t={48} w={9} h={7} d={700}>
        <path d="M4 20l6-8 4 5 6-9" fill="none" stroke="#cfe4ff" strokeWidth="2" {...SJ} />
      </V>
      <L c="g42-lean" l={40} t={57} w={22} h={3} d={720} st={{ borderRadius: "999px", background: "rgba(16,28,48,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-sift" l={44 + i * 6} t={55} w={1.5} h={1.5} d={760 + i * 90} st={{ borderRadius: "50%", background: "#cfe4ff" }} />
      ))}
    </Lead>
  );
}

/* --- 18. Lightning Rod (t4) — THE STRAP STARTS CRAWLING ----------------------
   A copper rod is bolted on and earthed. Then the charge starts walking DOWN
   the strap, bolt head to bolt head, and the earth plate glows.
   Palette: #ffcf7a / #fff4d6 / #241606. */
const LR_CRAWL = [0, 1, 2];

function LightningRodScene({ role, delayMs }: SceneProps) {
  const rod = (
    <g {...SJ}>
      <path d="M12 2v15" stroke="#ffcf7a" strokeWidth="2.4" />
      <path d="M12 2l1.8 3h-3.6z" fill="#fff4d6" />
      <rect x="8.6" y="16.6" width="6.8" height="3.4" rx="1" fill="#241606" stroke="#ffcf7a" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-drop" l={30} t={8} w={40} h={62} d={40}>{rod}</V>
        <L c="g42-lr-strap" l={48} t={54} w={3} h={34} d={270} st={{ background: "#ffcf7a", transformOrigin: "50% 0%" }} />
        <L c="g42-lr-earth" l={30} t={84} w={40} h={5} d={480} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hitside" l={32} t={10} w={36} h={60} d={0}>{rod}</V>
        <L c="g42-relay" l={47} t={54} w={4} h={30} d={140} st={{ background: "#fff4d6", transformOrigin: "50% 0%" }} />
        <L c="g42-hit2" l={34} t={82} w={32} h={4} d={280} st={{ borderRadius: "999px", background: "#ffcf7a" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(255,207,122,0.28)" /><Rim tone="rgba(255,244,214,0.24)" /></>}>
      <V c="g42-lr-rod" l={45} t={36} w={10} h={16} d={90}>{rod}</V>
      <L c="g42-lr-strap" l={49.4} t={50} w={1.4} h={9} d={260} st={{ background: "#ffcf7a", transformOrigin: "50% 0%" }} />
      {LR_CRAWL.map((i) => (
        <L key={i} c="g42-lr-crawl" l={48.6} t={50 + i * 2.6} w={3} h={2} d={380 + i * 120} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      ))}
      <L c="g42-lr-earth" l={45} t={58} w={10} h={2} d={700} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <L c="g42-updraft" l={52} t={44} w={4} h={4} d={720} st={{ borderRadius: "50%", background: "rgba(255,207,122,0.8)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-spit" l={46 + i * 5} t={46} w={1.6} h={1.6} d={760 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 19. Blood Moon (t5) — THE UMBRA GETS GREEDY -----------------------------
   The shadow takes a bite, then half, then all of it in a rush, and what is
   left of the moon comes back the wrong colour.
   Palette: #ff6b6b / #fff4d6 / #2a0c14. */
function BloodMoonScene({ role, delayMs }: SceneProps) {
  const disc = <circle cx="12" cy="12" r="9" fill="#fff4d6" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-rise" l={24} t={20} w={52} h={52} d={40}>{disc}</V>
        <L c="g42-bm-umbra" l={22} t={18} w={56} h={56} d={280} st={{ borderRadius: "50%", background: "#2a0c14" }} />
        <L c="g42-bm-flush" l={24} t={20} w={52} h={52} d={480} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,107,107,0.85), transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hit" l={26} t={22} w={48} h={48} d={0}>{disc}</V>
        <L c="g42-relay" l={22} t={18} w={56} h={56} d={140} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,107,107,0.9), transparent 68%)" }} />
        <L c="g42-hit2" l={18} t={14} w={64} h={64} d={280} st={{ borderRadius: "50%", border: "2px solid #ff6b6b" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(255,107,107,0.3)" /><Rim tone="rgba(42,12,20,0.5)" /></>}>
      <V c="g42-bm-moon" l={44} t={40} w={12} h={12} d={90}>{disc}</V>
      <L c="g42-bm-umbra" l={43} t={39} w={14} h={14} d={250} st={{ borderRadius: "50%", background: "#2a0c14" }} />
      <L c="g42-bm-flush" l={43} t={39} w={14} h={14} d={470} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,107,107,0.9), transparent 70%)" }} />
      <L c="g42-bm-halo" l={39} t={35} w={22} h={22} d={600} st={{ borderRadius: "50%", border: "2px solid #ff6b6b" }} />
      <L c="g42-updraft" l={52} t={42} w={4} h={4} d={680} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.75)" }} />
      <L c="g42-glint" l={41} t={38} w={2.4} h={2.4} d={760} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 20. Sandstorm (t5) — GRAIN DUST DOWN THE GRANARY ------------------------
   The chute pours, the air thickens with flour dust, and one spark takes the
   whole aisle in three flashes, each one further down the store.
   Palette: #e0c184 / #fff4d6 / #2a2010. */
const SS_FLASH = [0, 1, 2];

function SandstormScene({ role, delayMs }: SceneProps) {
  const chute = (
    <g {...SJ}>
      <path d="M4 3h12l-3 7H7z" fill="#2a2010" stroke="#e0c184" strokeWidth="1.2" />
      <path d="M8.4 10.6c.6 3 1 6 .6 9.4M11.6 10.6c-.4 3.4 0 6.6.8 9.4" fill="none" stroke="#e0c184" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-drop" l={16} t={10} w={52} h={62} d={40}>{chute}</V>
        <L c="g42-ss-dust" l={10} t={48} w={80} h={36} d={270} st={{ borderRadius: "999px", background: "radial-gradient(circle, rgba(224,193,132,0.75), transparent 70%)" }} />
        <L c="g42-ss-flash" l={26} t={44} w={48} h={30} d={480} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 66%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g42-hitside" l={12} t={44} w={76} h={34} d={0} st={{ borderRadius: "999px", background: "radial-gradient(circle, rgba(224,193,132,0.7), transparent 70%)" }} />
        <L c="g42-relay" l={28} t={38} w={44} h={34} d={150} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 66%)" }} />
        <L c="g42-hit2" l={44} t={26} w={12} h={12} d={280} st={{ borderRadius: "50%", background: "#e0c184" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(224,193,132,0.3)" /><Rim tone="rgba(255,244,214,0.22)" /></>}>
      <V c="g42-ss-chute" l={42} t={36} w={10} h={14} d={80}>{chute}</V>
      <L c="g42-ss-dust" l={41} t={44} w={20} h={10} d={230} st={{ borderRadius: "999px", background: "radial-gradient(circle, rgba(224,193,132,0.7), transparent 70%)" }} />
      {SS_FLASH.map((i) => (
        <L key={i} c="g42-ss-flash" l={45 + i * 5} t={44 - i} w={7 + i * 2} h={7 + i * 2} d={370 + i * 130} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 66%)" }} />
      ))}
      <L c="g42-runup" l={44} t={49} w={30} h={2.4} d={640} st={{ background: "linear-gradient(90deg, #fff4d6, rgba(224,193,132,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-ember" l={48 + i * 6} t={45} w={1.6} h={1.6} d={720 + i * 90} st={{ borderRadius: "50%", background: "#e0c184" }} />
      ))}
      <L c="g42-sift" l={44} t={54} w={1.8} h={1.8} d={800} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 21. Lightning Rod (t7) — THE JAR BANK GIVES IT BACK ---------------------
   Three Leyden jars charge in turn, foil climbing each one, and the moment
   somebody touches the knob the whole bank returns the favour at once.
   Palette: #a0e8ff / #fff4d6 / #0c1e30. */
const LJ_JARS = [0, 1, 2];

function LeydenBankScene({ role, delayMs }: SceneProps) {
  const jar = (
    <g {...SJ}>
      <rect x="6" y="7" width="12" height="14" rx="1" fill="none" stroke="#a0e8ff" strokeWidth="1.3" />
      <path d="M12 7V2.6M9.4 3.4h5.2" stroke="#a0e8ff" strokeWidth="1.4" />
      <rect x="7.6" y="14" width="8.8" height="6" rx="1" fill="#a0e8ff" opacity="0.7" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-rise" l={10} t={20} w={38} h={60} d={40}>{jar}</V>
        <V c="g42-lj-jar" l={50} t={22} w={38} h={58} d={270}>{jar}</V>
        <L c="g42-lj-back" l={30} t={12} w={40} h={4} d={480} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hitside" l={20} t={18} w={44} h={60} d={0}>{jar}</V>
        <L c="g42-relay" l={26} t={40} w={48} h={4} d={140} st={{ borderRadius: "999px", background: "#fff4d6" }} />
        <L c="g42-spit" l={64} t={30} w={4} h={4} d={280} st={{ borderRadius: "50%", background: "#a0e8ff" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(160,232,255,0.28)" /><Rim tone="rgba(255,244,214,0.26)" /></>}>
      <L c="g42-lj-bench" l={39} t={53} w={24} h={2} d={70} st={{ borderRadius: "2px", background: "#a0e8ff" }} />
      {LJ_JARS.map((i) => (
        <V key={i} c="g42-lj-jar" l={41 + i * 7} t={41} w={7} h={12} d={190 + i * 130} st={{ transformOrigin: "50% 100%" }}>{jar}</V>
      ))}
      <V c="g42-lj-knob" l={54} t={38} w={6} h={6} d={580}><circle cx="12" cy="12" r="6.6" fill="#fff4d6" /></V>
      <L c="g42-lj-back" l={40} t={40} w={18} h={1.8} d={660} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "100% 50%" }} />
      <L c="g42-updraft" l={49} t={40} w={5} h={5} d={720} st={{ borderRadius: "50%", background: "rgba(160,232,255,0.8)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-spit" l={44 + i * 6} t={44} w={1.6} h={1.6} d={760 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 22. Stormcrossing (t7) — ST ELMO'S FIRE RUNS THE RIGGING ----------------
   Corona beads bead up on the shrouds and run the line hand over hand, straight
   THROUGH the yard, until the masthead is standing in cold fire.
   Palette: #b9f0e0 / #fff4d6 / #0e2630. */
const SE_BEADS = [0, 1, 2, 3];

function StormcrossingScene({ role, delayMs }: SceneProps) {
  const mast = (
    <g fill="none" stroke="#b9f0e0" strokeWidth="1.4" {...SJ}>
      <path d="M12 2v20" />
      <path d="M4.6 8h14.8" />
      <path d="M12 2L5 21M12 2l7 19" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-rise" l={20} t={12} w={60} h={72} d={40}>{mast}</V>
        <L c="g42-se-bead" l={44} t={54} w={7} h={7} d={280} st={{ borderRadius: "50%", background: "#fff4d6" }} />
        <L c="g42-se-truck" l={42} t={6} w={16} h={16} d={480} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 66%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hit" l={22} t={12} w={56} h={70} d={0}>{mast}</V>
        <L c="g42-relay" l={42} t={34} w={16} h={16} d={140} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 66%)" }} />
        <L c="g42-hit2" l={26} t={26} w={48} h={3} d={280} st={{ borderRadius: "999px", background: "#b9f0e0" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(185,240,224,0.28)" /><Rim tone="rgba(255,244,214,0.24)" /></>}>
      <V c="g42-se-mast" l={42} t={36} w={16} h={20} d={80}>{mast}</V>
      {SE_BEADS.map((i) => (
        <L key={i} c="g42-se-bead" l={44 + i * 3.6} t={50 - i * 2.4} w={2.4} h={2.4} d={200 + i * 120} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
      <L c="g42-se-yard" l={43} t={42} w={14} h={1.6} d={620} st={{ borderRadius: "999px", background: "#b9f0e0" }} />
      <L c="g42-se-truck" l={47} t={34} w={6} h={6} d={700} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 66%)" }} />
      <L c="g42-runup" l={44} t={48} w={28} h={1.6} d={560} st={{ background: "linear-gradient(90deg, #b9f0e0, rgba(185,240,224,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <L c="g42-glint" l={54} t={38} w={2.4} h={2.4} d={780} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </AimLead>
  );
}

/* --- 23. Olympus Voicemail (t7) — THE TUBE FILLS UP --------------------------
   Messages stack in the throat of a bronze speaking tube, each louder than the
   last, until the mouth spits a bolt down the line rather than take another.
   Palette: #ffd98f / #fff4d6 / #2b1e08. */
const VM_RINGS = [0, 1, 2];

function OlympusVoicemailScene({ role, delayMs }: SceneProps) {
  const horn = (
    <g {...SJ}>
      <path d="M3 9.4h7l10-5.4v16l-10-5.4H3z" fill="#2b1e08" stroke="#ffd98f" strokeWidth="1.2" />
      <path d="M20 8.6c2 1.4 2 5.4 0 6.8" fill="none" stroke="#ffd98f" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-rise" l={10} t={26} w={76} h={48} d={40}>{horn}</V>
        <L c="g42-vm-ring" l={54} t={34} w={22} h={32} d={280} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
        <L c="g42-vm-spit" l={62} t={44} w={30} h={5} d={480} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hitside" l={12} t={26} w={72} h={48} d={0}>{horn}</V>
        <L c="g42-relay" l={44} t={34} w={34} h={32} d={140} st={{ borderRadius: "50%", border: "2px solid #ffd98f" }} />
        <L c="g42-spit" l={72} t={46} w={4} h={4} d={280} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(255,217,143,0.28)" /><Rim tone="rgba(255,244,214,0.24)" /></>}>
      <V c="g42-vm-horn" l={40} t={42} w={20} h={12} d={80}>{horn}</V>
      {VM_RINGS.map((i) => (
        <L key={i} c="g42-vm-ring" l={50 + i * 2} t={43 - i} w={5 + i * 2} h={10 + i * 2} d={220 + i * 130} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      ))}
      <L c="g42-vm-spit" l={58} t={47} w={12} h={1.8} d={620} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "0% 50%" }} />
      <L c="g42-jump" l={60} t={46} w={5} h={5} d={680} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 66%)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-spit" l={58 + i * 5} t={44 + i * 2} w={1.6} h={1.6} d={740 + i * 90} st={{ borderRadius: "50%", background: "#ffd98f" }} />
      ))}
      <L c="g42-glint" l={44} t={40} w={2.4} h={2.4} d={800} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 24. Menagerie Stampede (t8) — THE LATCH LETS GO -------------------------
   One latch pops. The gate swings, and four sets of hooves find the gap and
   drum away up the files with a dust front out in front of them.
   Palette: #e8a05a / #fff4d6 / #2a1608. */
const MS_HOOVES = [0, 1, 2, 3];

function MenagerieStampedeScene({ role, delayMs }: SceneProps) {
  const gate = (
    <g fill="none" stroke="#e8a05a" strokeWidth="1.5" {...SJ}>
      <path d="M4 4v16M20 4v16M4 8h16M4 16h16M4 4l16 16" />
    </g>
  );
  const hoof = <path d="M8 4c3-1.4 5-1.4 8 0 1 4.6.4 9.4-4 13.4-4.4-4-5-8.8-4-13.4z" fill="#2a1608" stroke="#e8a05a" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-swing" l={10} t={18} w={56} h={62} d={40} st={{ transformOrigin: "0% 50%" }}>{gate}</V>
        <V c="g42-ms-hoof" l={54} t={40} w={30} h={40} d={280}>{hoof}</V>
        <L c="g42-ms-latch" l={58} t={16} w={22} h={5} d={480} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-relay" l={26} t={22} w={48} h={54} d={0}>{hoof}</V>
        <L c="g42-hitside" l={12} t={72} w={76} h={4} d={150} st={{ borderRadius: "999px", background: "#e8a05a" }} />
        <L c="g42-hit2" l={38} t={60} w={24} h={16} d={280} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.8), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(232,160,90,0.3)" /><Rim tone="rgba(255,244,214,0.28)" /></>}>
      <V c="g42-ms-gate" l={40} t={38} w={14} h={18} d={80} st={{ transformOrigin: "0% 50%" }}>{gate}</V>
      <L c="g42-ms-latch" l={52} t={44} w={4} h={1.6} d={200} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      {MS_HOOVES.map((i) => (
        <V key={i} c="g42-ms-hoof" l={47 + i * 4.6} t={45 + (i % 2) * 3} w={4} h={5} d={310 + i * 110}>{hoof}</V>
      ))}
      <L c="g42-runup" l={44} t={51} w={30} h={3} d={620} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.85), rgba(232,160,90,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <L c="g42-lean" l={44} t={55} w={22} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(42,22,8,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-sift" l={50 + i * 6} t={47} w={1.8} h={1.8} d={760 + i * 90} st={{ borderRadius: "50%", background: "#e8a05a" }} />
      ))}
    </Lead>
  );
}

/* --- 25. Closed for Cleaning (t1) — THE BUCKET WILL NOT STOP FOAMING ---------
   Too much soap. The suds climb the mop, come over the rim in three heads, and
   the square is closed for rather longer than planned.
   Palette: #8fe0d0 / #fff4d6 / #0e2a26. */
const CC_HEADS = [0, 1, 2];

function ClosedForCleaningScene({ role, delayMs }: SceneProps) {
  const bucket = (
    <g {...SJ}>
      <path d="M5 8h14l-1.6 12H6.6z" fill="#0e2a26" stroke="#8fe0d0" strokeWidth="1.2" />
      <path d="M6 8c1.4-3 10.6-3 12 0" fill="none" stroke="#8fe0d0" strokeWidth="1.1" />
    </g>
  );
  const mop = (
    <g {...SJ}>
      <path d="M12 2v11" stroke="#fff4d6" strokeWidth="1.8" />
      <path d="M7.4 13h9.2l-1.8 7H9.2z" fill="#8fe0d0" stroke="#0e2a26" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-rise" l={22} t={34} w={56} h={52} d={40}>{bucket}</V>
        <V c="g42-cc-mop" l={34} t={4} w={32} h={62} d={270} st={{ transformOrigin: "50% 100%" }}>{mop}</V>
        <L c="g42-cc-suds" l={24} t={28} w={52} h={26} d={480} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hit" l={24} t={34} w={52} h={50} d={0}>{bucket}</V>
        <L c="g42-relay" l={26} t={22} w={48} h={26} d={140} st={{ borderRadius: "999px", background: "#fff4d6" }} />
        <L c="g42-hit2" l={20} t={72} w={60} h={8} d={280} st={{ borderRadius: "999px", background: "#8fe0d0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(143,224,208,0.26)" />}>
      <V c="g42-cc-bucket" l={43} t={43} w={14} h={13} d={90}>{bucket}</V>
      <V c="g42-cc-mop" l={45} t={33} w={9} h={16} d={230} st={{ transformOrigin: "50% 100%" }}>{mop}</V>
      {CC_HEADS.map((i) => (
        <L key={i} c="g42-cc-suds" l={43 - i} t={42 - i * 1.4} w={6 + i * 2} h={4 + i} d={360 + i * 120} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      ))}
      <L c="g42-cc-spill" l={41} t={52} w={18} h={3} d={680} st={{ borderRadius: "999px", background: "#8fe0d0" }} />
      <L c="g42-lean" l={41} t={56} w={20} h={3} d={720} st={{ borderRadius: "999px", background: "rgba(14,42,38,0.55)" }} />
      <L c="g42-glint" l={53} t={40} w={2.2} h={2.2} d={780} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 26. Do Not Disturb (t1) — THE AIRLOCK PICKS UP THE PACE -----------------
   Leave it alone, says the sign. The fermentation lock bubbles once, twice,
   then faster than you can count, and the bung lifts clean out of the neck.
   Palette: #c8e06a / #fff4d6 / #1c2a0e. */
const DD_BUBBLES = [0, 1, 2, 3];

function DoNotDisturbScene({ role, delayMs }: SceneProps) {
  const carboy = (
    <g {...SJ}>
      <path d="M9.4 3h5.2v4.4c2.6 1.6 4.4 4.4 4.4 7.6V21H5v-6c0-3.2 1.8-6 4.4-7.6z" fill="none" stroke="#c8e06a" strokeWidth="1.3" />
      <path d="M6.6 15.4c3.4-1.4 7.4-1.4 10.8 0V21H6.6z" fill="#c8e06a" opacity="0.55" />
    </g>
  );
  const lock = <path d="M12 2v6a3 3 0 0 0 6 0" fill="none" stroke="#fff4d6" strokeWidth="1.8" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-rise" l={24} t={22} w={52} h={62} d={40}>{carboy}</V>
        <V c="g42-dd-lock" l={44} t={2} w={34} h={34} d={270}>{lock}</V>
        <L c="g42-dd-bubble" l={44} t={40} w={12} h={12} d={480} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hit" l={26} t={22} w={48} h={60} d={0}>{carboy}</V>
        <L c="g42-relay" l={42} t={38} w={16} h={16} d={140} st={{ borderRadius: "50%", background: "#fff4d6" }} />
        <L c="g42-hit2" l={44} t={6} w={12} h={12} d={280} st={{ borderRadius: "50%", background: "#c8e06a" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(200,224,106,0.26)" />}>
      <V c="g42-dd-jar" l={44} t={41} w={12} h={16} d={80}>{carboy}</V>
      <V c="g42-dd-lock" l={49} t={35} w={8} h={8} d={210}>{lock}</V>
      {DD_BUBBLES.map((i) => (
        <L key={i} c="g42-dd-bubble" l={47 + (i % 2) * 2} t={49 - i * 0.6} w={1.6 + i * 0.3} h={1.6 + i * 0.3} d={300 + i * 110} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
      <L c="g42-dd-bung" l={48.4} t={36} w={3} h={2.4} d={680} st={{ borderRadius: "2px", background: "#c8e06a" }} />
      <L c="g42-updraft" l={51} t={34} w={4} h={4} d={720} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.75)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-sift" l={44 + i * 6} t={54} w={1.5} h={1.5} d={760 + i * 90} st={{ borderRadius: "50%", background: "#c8e06a" }} />
      ))}
    </Lead>
  );
}

/* --- 27. Margin Notes (t1) — THE TABS TAKE THE BOOK --------------------------
   One flag in the margin. Then a fringe of them, then the annotation runs down
   the edge faster than the text it was meant to serve.
   Palette: #ffd06b / #fff4d6 / #2a2008. */
const MN_TABS = [0, 1, 2, 3];

function MarginNotesScene({ role, delayMs }: SceneProps) {
  const book = (
    <g {...SJ}>
      <path d="M4 3h9.4c2 0 3.6 1.2 3.6 3v15H7.6C5.6 21 4 19.8 4 18z" fill="#fff4d6" stroke="#2a2008" strokeWidth="1.1" />
      <path d="M7 8h7M7 11.4h7M7 14.8h4.4" stroke="#2a2008" strokeWidth="0.9" />
    </g>
  );
  const tab = <rect x="4" y="9" width="16" height="6" rx="1" fill="#ffd06b" stroke="#2a2008" strokeWidth="1" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-rise" l={14} t={16} w={62} h={66} d={40}>{book}</V>
        <V c="g42-mn-first" l={54} t={34} w={34} h={16} d={270}>{tab}</V>
        <V c="g42-mn-tab" l={54} t={52} w={34} h={16} d={480}>{tab}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hit" l={16} t={16} w={58} h={64} d={0}>{book}</V>
        <V c="g42-relay" l={52} t={36} w={36} h={18} d={140}>{tab}</V>
        <L c="g42-hit2" l={54} t={62} w={30} h={2.6} d={280} st={{ borderRadius: "999px", background: "#ffd06b" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(255,208,107,0.26)" />}>
      <V c="g42-mn-book" l={40} t={39} w={16} h={18} d={90}>{book}</V>
      <V c="g42-mn-first" l={53} t={43} w={7} h={3.4} d={230}>{tab}</V>
      {MN_TABS.map((i) => (
        <V key={i} c="g42-mn-tab" l={53} t={41 + i * 3.2} w={6 + i} h={2.8} d={340 + i * 110}>{tab}</V>
      ))}
      <L c="g42-mn-scrawl" l={57} t={42} w={5} h={12} d={700} st={{ background: "linear-gradient(180deg, #ffd06b, rgba(255,208,107,0))", transformOrigin: "50% 0%" }} />
      <L c="g42-lean" l={40} t={57} w={20} h={3} d={720} st={{ borderRadius: "999px", background: "rgba(42,32,8,0.55)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-sift" l={46 + i * 6} t={55} w={1.5} h={1.5} d={760 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 28. Reserved Table (t1) — THE COUPE TOWER OVERFLOWS ---------------------
   One pour into the top glass. It fills, spills to the two below, they spill to
   the four below, and the tablecloth is a write-off.
   Palette: #ffd9c0 / #fff4d6 / #2e1a14. */
const RT_TIERS = [0, 1, 2];

function ReservedTableScene({ role, delayMs }: SceneProps) {
  const coupe = (
    <g {...SJ}>
      <path d="M5 5h14c0 4.6-2.6 7-5.6 7.4V18h3.4v2H7.2v-2h3.4v-5.6C7.6 12 5 9.6 5 5z" fill="none" stroke="#ffd9c0" strokeWidth="1.3" />
      <path d="M6.6 6.6h10.8c-.6 2.8-2.6 4.4-5.4 4.4S7.2 9.4 6.6 6.6z" fill="#fff4d6" opacity="0.75" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-rise" l={30} t={16} w={40} h={50} d={40}>{coupe}</V>
        <L c="g42-rt-pour" l={48} t={0} w={3} h={26} d={270} st={{ background: "#fff4d6", transformOrigin: "50% 0%" }} />
        <L c="g42-rt-flood" l={16} t={74} w={68} h={6} d={480} st={{ borderRadius: "999px", background: "#ffd9c0" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hit" l={30} t={20} w={40} h={48} d={0}>{coupe}</V>
        <L c="g42-relay" l={44} t={4} w={12} h={26} d={140} st={{ background: "#fff4d6", transformOrigin: "50% 0%" }} />
        <L c="g42-hit2" l={22} t={70} w={56} h={5} d={280} st={{ borderRadius: "999px", background: "#ffd9c0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(255,217,192,0.26)" />}>
      <L c="g42-rt-tower" l={43} t={38} w={14} h={18} d={80} st={{ background: "linear-gradient(180deg, rgba(255,217,192,0.4), transparent)" }} />
      <L c="g42-rt-pour" l={49.4} t={32} w={1.4} h={8} d={220} st={{ background: "#fff4d6", transformOrigin: "50% 0%" }} />
      {RT_TIERS.map((i) => (
        <V key={i} c="g42-rt-tier" l={47 - i * 3} t={39 + i * 4.4} w={6 + i * 3} h={6} d={320 + i * 130} st={{ transformOrigin: "50% 0%" }}>{coupe}</V>
      ))}
      <L c="g42-rt-flood" l={41} t={54} w={20} h={2.6} d={700} st={{ borderRadius: "999px", background: "#ffd9c0" }} />
      <L c="g42-updraft" l={52} t={42} w={3} h={3} d={720} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      <L c="g42-glint" l={45} t={38} w={2.2} h={2.2} d={780} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 29. Ribbon Cutting (t1) — THE CUT RUNS THE WHOLE RIBBON -----------------
   The shears close on one point of the ribbon and the split keeps going by
   itself, the whole length parting and both ends whipping loose.
   Palette: #ff8f9c / #fff4d6 / #2c1018. */
const RC_WHIP = [-1, 1];

function RibbonCuttingScene({ role, delayMs }: SceneProps) {
  const shears = (
    <g fill="none" stroke="#fff4d6" strokeWidth="1.6" {...SJ}>
      <path d="M4 3l12 13M4 21L16 8" />
      <circle cx="19" cy="6" r="2.4" />
      <circle cx="19" cy="18" r="2.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g42-rc-ribbon" l={4} t={46} w={92} h={7} d={40} st={{ background: "#ff8f9c", transformOrigin: "0% 50%" }} />
        <V c="g42-rc-shear" l={30} t={22} w={40} h={56} d={270}>{shears}</V>
        <L c="g42-rc-whip" l={56} t={44} w={34} h={5} d={480} st={{ background: "#ff8f9c", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g42-hitside" l={6} t={46} w={88} h={6} d={0} st={{ background: "#ff8f9c" }} />
        <V c="g42-relay" l={32} t={24} w={36} h={52} d={140}>{shears}</V>
        <L c="g42-hit2" l={40} t={40} w={20} h={20} d={280} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 68%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(255,143,156,0.26)" />}>
      <L c="g42-rc-ribbon" l={40} t={48} w={26} h={2.6} d={70} st={{ background: "#ff8f9c", transformOrigin: "0% 50%" }} />
      <V c="g42-rc-shear" l={44} t={43} w={11} h={12} d={230}>{shears}</V>
      <L c="g42-runup" l={48} t={48.6} w={26} h={1.4} d={380} st={{ background: "linear-gradient(90deg, #fff4d6, rgba(255,143,156,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      {RC_WHIP.map((s, i) => (
        <L key={i} c="g42-rc-whip" l={50} t={47 + s * 1.4} w={12} h={1.6} d={560 + i * 110} st={{ background: "#ff8f9c", transformOrigin: "0% 50%", rotate: `${s * 16}deg`, borderRadius: "999px" }} />
      ))}
      <L c="g42-glint" l={47} t={44} w={2.4} h={2.4} d={700} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-sift" l={46 + i * 6} t={52} w={1.6} h={2.4} d={760 + i * 90} st={{ borderRadius: "1px", background: "#ff8f9c" }} />
      ))}
    </Lead>
  );
}

/* --- 30. The Management (t1) — THE ENGRAVING WILL NOT STOP -------------------
   A burin cuts the first letter into the brass plate. The cut keeps running,
   off the end of the plate, and the swarf curls up behind it.
   Palette: #d8a860 / #fff4d6 / #241c0c. */
const MG_SWARF = [0, 1, 2];

function TheManagementScene({ role, delayMs }: SceneProps) {
  const burin = (
    <g {...SJ}>
      <path d="M20 3l-9.4 9.4-3.6 6.8 6.8-3.6L23.2 6z" fill="#d8a860" stroke="#241c0c" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-drop" l={10} t={36} w={80} h={30} d={40} par="none" vb="0 0 60 20">
          <rect x="1" y="1" width="58" height="18" rx="1" fill="#d8a860" stroke="#241c0c" strokeWidth="1.2" />
          <text x="30" y="14" textAnchor="middle" fontSize="9" fontWeight="700" fill="#241c0c">THE MANAGEMENT</text>
        </V>
        <V c="g42-mg-burin" l={20} t={16} w={40} h={44} d={280}>{burin}</V>
        <L c="g42-mg-cut" l={16} t={52} w={64} h={3} d={480} st={{ background: "#fff4d6", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g42-hitside" l={12} t={40} w={76} h={22} d={0} st={{ background: "#d8a860", borderRadius: "1px" }} />
        <V c="g42-relay" l={24} t={16} w={40} h={44} d={140}>{burin}</V>
        <L c="g42-hit2" l={16} t={58} w={68} h={2.6} d={280} st={{ background: "#fff4d6", borderRadius: "999px" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(216,168,96,0.26)" />}>
      <V c="g42-mg-plate" l={38} t={44} w={24} h={8} d={90} par="none" vb="0 0 60 20">
        <rect x="1" y="1" width="58" height="18" rx="1" fill="#d8a860" stroke="#241c0c" strokeWidth="1.2" />
        <text x="30" y="14" textAnchor="middle" fontSize="9" fontWeight="700" fill="#241c0c">THE MANAGEMENT</text>
      </V>
      <V c="g42-mg-burin" l={41} t={38} w={9} h={10} d={250}>{burin}</V>
      <L c="g42-mg-cut" l={40} t={48} w={22} h={1.2} d={400} st={{ background: "#fff4d6", transformOrigin: "0% 50%" }} />
      {MG_SWARF.map((i) => (
        <L key={i} c="g42-mg-swarf" l={44 + i * 5} t={46} w={2} h={2} d={540 + i * 120} st={{ borderRadius: "50%", background: "#d8a860" }} />
      ))}
      <L c="g42-lean" l={39} t={54} w={22} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(36,28,12,0.55)" }} />
      <L c="g42-glint" l={57} t={45} w={2.4} h={2.4} d={780} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 31. Kazoo Fanfare (t1) — THE CORK LEAVES FIRST --------------------------
   A polite shake. The cork goes up like a rocket, the foam follows it in a
   column and the confetti never had a chance.
   Palette: #ffd36b / #fff4d6 / #2a1a06. */
const KF_BITS = [0, 1, 2];

function KazooFanfareScene({ role, delayMs }: SceneProps) {
  const bottle = (
    <g {...SJ}>
      <path d="M10 2h4v5.4c2.2 1.6 3.4 4 3.4 6.6V21H6.6v-7c0-2.6 1.2-5 3.4-6.6z" fill="#2a1a06" stroke="#ffd36b" strokeWidth="1.2" />
      <path d="M7.6 14.6h8.8" stroke="#ffd36b" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-swing" l={26} t={28} w={48} h={58} d={40} st={{ transformOrigin: "50% 100%" }}>{bottle}</V>
        <L c="g42-kf-cork" l={44} t={12} w={12} h={16} d={280} st={{ borderRadius: "2px", background: "#ffd36b" }} />
        <L c="g42-kf-plume" l={38} t={4} w={24} h={38} d={470} st={{ borderRadius: "999px", background: "linear-gradient(0deg, rgba(255,244,214,0.85), transparent)", transformOrigin: "50% 100%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hitside" l={28} t={28} w={44} h={56} d={0}>{bottle}</V>
        <L c="g42-relay" l={42} t={4} w={16} h={30} d={140} st={{ borderRadius: "999px", background: "linear-gradient(0deg, #fff4d6, transparent)", transformOrigin: "50% 100%" }} />
        <L c="g42-hit2" l={44} t={0} w={12} h={12} d={280} st={{ borderRadius: "2px", background: "#ffd36b" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(255,211,107,0.28)" /><Rim tone="rgba(255,244,214,0.22)" /></>}>
      <V c="g42-kf-bottle" l={44} t={42} w={12} h={15} d={90} st={{ transformOrigin: "50% 100%" }}>{bottle}</V>
      <L c="g42-kf-cork" l={48.4} t={38} w={3} h={4} d={250} st={{ borderRadius: "2px", background: "#ffd36b" }} />
      <L c="g42-kf-plume" l={46} t={30} w={7} h={13} d={380} st={{ borderRadius: "999px", background: "linear-gradient(0deg, rgba(255,244,214,0.85), transparent)", transformOrigin: "50% 100%" }} />
      {KF_BITS.map((i) => (
        <L key={i} c="g42-kf-bit" l={44 + i * 5} t={36 - i * 2} w={1.8} h={2.6} d={520 + i * 110} st={{ borderRadius: "1px", background: "#ffd36b" }} />
      ))}
      <L c="g42-updraft" l={49} t={34} w={5} h={5} d={700} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.75)" }} />
      <L c="g42-glint" l={42} t={40} w={2.4} h={2.4} d={780} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 32. Left on Read (t2) — THE DOTS MULTIPLY ------------------------------
   Three dots. Then a second row of them, then a third, spilling out of a bubble
   that was only ever meant to hold three. Nothing is ever sent.
   Palette: #9fc8ff / #fff4d6 / #121e30. */
const LO_DOTS = [0, 1, 2];
const LO_ROWS = [0, 1, 2];

function LeftOnReadScene({ role, delayMs }: SceneProps) {
  const bubble = (
    <path d="M3 6.6c0-2 1.6-3.6 3.6-3.6h10.8c2 0 3.6 1.6 3.6 3.6v6.8c0 2-1.6 3.6-3.6 3.6H9L4.4 21v-4H6.6C4.6 17 3 15.4 3 13.4z" fill="#121e30" stroke="#9fc8ff" strokeWidth="1.2" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-rise" l={12} t={22} w={76} h={56} d={40}>{bubble}</V>
        <L c="g42-lo-dot" l={34} t={40} w={9} h={9} d={280} st={{ borderRadius: "50%", background: "#fff4d6" }} />
        <L c="g42-lo-dot" l={50} t={40} w={9} h={9} d={430} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hit" l={14} t={22} w={72} h={54} d={0}>{bubble}</V>
        <L c="g42-relay" l={40} t={40} w={20} h={12} d={140} st={{ borderRadius: "999px", background: "#9fc8ff" }} />
        <L c="g42-hit2" l={44} t={62} w={12} h={4} d={280} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(159,200,255,0.24)" />}>
      <V c="g42-lo-bubble" l={40} t={39} w={22} h={17} d={90}>{bubble}</V>
      {LO_DOTS.map((i) => (
        <L key={i} c="g42-lo-dot" l={45 + i * 3.4} t={45} w={2.2} h={2.2} d={230 + i * 110} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
      {LO_ROWS.map((i) => (
        <L key={i} c="g42-lo-row" l={44 + i * 2} t={49 + i * 2.4} w={12 - i * 2} h={1.8} d={480 + i * 120} st={{ borderRadius: "999px", background: "#9fc8ff" }} />
      ))}
      <L c="g42-lo-burst" l={39} t={38} w={24} h={19} d={720} st={{ borderRadius: "2px", border: "1px solid #9fc8ff" }} />
      <L c="g42-lean" l={41} t={57} w={20} h={3} d={740} st={{ borderRadius: "999px", background: "rgba(18,30,48,0.55)" }} />
      <L c="g42-sift" l={56} t={53} w={1.6} h={1.6} d={800} st={{ borderRadius: "50%", background: "#9fc8ff" }} />
    </Lead>
  );
}

/* --- 33. Growth Potion (t4) — ONE SEED SETS THE WHOLE FLASK ------------------
   A single crystal is dropped into a supersaturated flask. Spikes race out from
   the nucleation point and the entire liquid goes solid between one beat and
   the next. Palette: #a0f0c8 / #fff4d6 / #0e2a1e. */
const GP_SPIKES = [0, 90, 180, 270];

function GrowthPotionScene({ role, delayMs }: SceneProps) {
  const flask = (
    <g {...SJ}>
      <path d="M9.6 2.6h4.8v6.2l5 9.4c.8 1.6-.2 3.2-2 3.2H6.6c-1.8 0-2.8-1.6-2-3.2l5-9.4z" fill="none" stroke="#a0f0c8" strokeWidth="1.3" />
      <path d="M7 15.4h10l1.4 3H5.6z" fill="#a0f0c8" opacity="0.6" />
    </g>
  );
  const spike = <path d="M12 2l2.4 9L12 22l-2.4-11z" fill="#fff4d6" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-rise" l={22} t={18} w={56} h={64} d={40}>{flask}</V>
        <L c="g42-gp-seed" l={46} t={30} w={8} h={8} d={280} st={{ borderRadius: "50%", background: "#fff4d6" }} />
        <V c="g42-gp-solid" l={26} t={38} w={48} h={44} d={480}>{spike}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hit" l={24} t={18} w={52} h={62} d={0}>{flask}</V>
        <V c="g42-relay" l={34} t={34} w={32} h={44} d={140}>{spike}</V>
        <L c="g42-hit2" l={40} t={30} w={20} h={20} d={280} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 68%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(160,240,200,0.28)" /><Rim tone="rgba(255,244,214,0.22)" /></>}>
      <V c="g42-gp-flask" l={43} t={39} w={14} h={18} d={90}>{flask}</V>
      <L c="g42-gp-seed" l={48.6} t={44} w={2.4} h={2.4} d={230} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      {GP_SPIKES.map((a, i) => (
        <P key={a} l={42} t={38} w={16} h={16} rot={`${a}deg`}>
          <V c="g42-gp-spike" w={100} h={100} d={340 + i * 110}>{spike}</V>
        </P>
      ))}
      <L c="g42-gp-solid" l={44} t={44} w={12} h={11} d={700} st={{ background: "linear-gradient(180deg, rgba(160,240,200,0.8), rgba(14,42,30,0.2))", borderRadius: "2px" }} />
      <V c="g42-lean" l={45} t={45} w={9} h={12} d={720}><path d={KNIGHT} fill="none" stroke="#fff4d6" strokeWidth="1.4" {...SJ} /></V>
      <L c="g42-glint" l={54} t={40} w={2.4} h={2.4} d={780} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 34. Fire Escape (t1) — THE LADDER KEEPS UNFOLDING -----------------------
   The counterweight lets go and the ladder drops one section, then another, and
   another, well past the ground it was measured for.
   Palette: #ffa860 / #fff4d6 / #241408. */
const FE_RUNGS = [0, 1, 2, 3];

function FireEscapeScene({ role, delayMs }: SceneProps) {
  const section = (
    <g fill="none" stroke="#ffa860" strokeWidth="1.8" {...SJ}>
      <path d="M4 3v18M20 3v18M4 8h16M4 16h16" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-drop" l={16} t={10} w={68} h={34} d={40}>{section}</V>
        <V c="g42-fe-rung" l={16} t={44} w={68} h={34} d={280} st={{ transformOrigin: "50% 0%" }}>{section}</V>
        <L c="g42-fe-slam" l={20} t={80} w={60} h={4} d={480} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-relay" l={18} t={12} w={64} h={40} d={0} st={{ transformOrigin: "50% 0%" }}>{section}</V>
        <V c="g42-hitside" l={30} t={48} w={40} h={40} d={140}><path d={PAWN} fill="#ffa860" /></V>
        <L c="g42-hit2" l={22} t={84} w={56} h={3} d={280} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(255,168,96,0.26)" />}>
      <L c="g42-fe-rail" l={44} t={47} w={4} h={5} d={80} st={{ borderRadius: "1px", background: "#fff4d6" }} />
      {FE_RUNGS.map((i) => (
        <V key={i} c="g42-fe-rung" l={46 + i * 5.4} t={45} w={6} h={9} d={200 + i * 120} st={{ transformOrigin: "0% 50%" }}>{section}</V>
      ))}
      <L c="g42-runup" l={44} t={51} w={30} h={1.6} d={620} st={{ background: "linear-gradient(90deg, #ffa860, rgba(255,168,96,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <L c="g42-fe-slam" l={64} t={50} w={9} h={2} d={700} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-sift" l={60 + i * 5} t={48} w={1.6} h={1.6} d={740 + i * 90} st={{ borderRadius: "50%", background: "#ffa860" }} />
      ))}
      <L c="g42-glint" l={45} t={44} w={2.2} h={2.2} d={800} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </AimLead>
  );
}

/* --- 35. Beneath Her Dignity (t1) — THE DROPPED GLOVE SMOULDERS --------------
   She will not touch it. The glove she threw down catches at one fingertip and
   the curl runs finger to finger until the cuff lifts on its own heat.
   Palette: #ffcf9f / #fff4d6 / #2a1410. */
const BD_FINGERS = [0, 1, 2, 3];

function BeneathHerDignityScene({ role, delayMs }: SceneProps) {
  const glove = (
    <g {...SJ}>
      <path d="M7 21v-8.6c0-1.2 1.8-1.2 1.8 0V7.4c0-1.3 1.9-1.3 1.9 0v4.4c0-1.4 1.9-1.4 1.9 0V8.6c0-1.4 2-1.4 2 0v8.8c0 2.4-1.6 3.6-4.4 3.6z" fill="#fff4d6" stroke="#2a1410" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-drop" l={24} t={20} w={52} h={64} d={40}>{glove}</V>
        <L c="g42-bd-curl" l={38} t={30} w={10} h={10} d={280} st={{ borderRadius: "50%", background: "#ffcf9f" }} />
        <L c="g42-updraft" l={44} t={22} w={14} h={14} d={480} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,207,159,0.8), transparent 68%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hitside" l={26} t={22} w={48} h={60} d={0}>{glove}</V>
        <L c="g42-relay" l={36} t={30} w={28} h={28} d={140} st={{ borderRadius: "50%", background: "radial-gradient(circle, #ffcf9f, transparent 68%)" }} />
        <L c="g42-hit2" l={46} t={12} w={8} h={8} d={280} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(255,207,159,0.26)" /><Rim tone="rgba(42,20,16,0.4)" /></>}>
      <V c="g42-bd-glove" l={44} t={42} w={12} h={15} d={90}>{glove}</V>
      {BD_FINGERS.map((i) => (
        <L key={i} c="g42-bd-curl" l={45 + i * 2.6} t={44} w={2 + i * 0.4} h={2 + i * 0.4} d={230 + i * 120} st={{ borderRadius: "50%", background: "#ffcf9f" }} />
      ))}
      <L c="g42-bd-char" l={44} t={50} w={12} h={3} d={640} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #2a1410, rgba(255,207,159,0.4))" }} />
      <L c="g42-updraft" l={49} t={40} w={5} h={5} d={700} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.7)" }} />
      <V c="g42-lean" l={54} t={44} w={9} h={12} d={720}><path d={QUEEN} fill="none" stroke="#fff4d6" strokeWidth="1.3" {...SJ} /></V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-ember" l={45 + i * 5} t={46} w={1.6} h={1.6} d={760 + i * 90} st={{ borderRadius: "50%", background: "#ffcf9f" }} />
      ))}
    </Lead>
  );
}

/* --- 36. Royal Name Tag (t1) — THE TAG BURNS THROUGH -------------------------
   HELLO MY NAME IS, and then the indignity starts scorching outward from the S
   until the letters are holes and the clip droops off the sash.
   Palette: #ff9f6b / #fff4d6 / #2a1206. */
const NT_SCORCH = [0, 1, 2];

function RoyalNameTagScene({ role, delayMs }: SceneProps) {
  const tag = (
    <>
      <rect x="1" y="1" width="58" height="22" rx="1" fill="#fff4d6" stroke="#2a1206" strokeWidth="1.2" />
      <rect x="1" y="1" width="58" height="6.4" rx="1" fill="#ff9f6b" />
      <text x="30" y="19" textAnchor="middle" fontSize="11" fontWeight="700" fill="#2a1206">SUSAN</text>
    </>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-drop" l={8} t={30} w={84} h={36} d={40} par="none" vb="0 0 60 24">{tag}</V>
        <L c="g42-nt-scorch" l={40} t={40} w={18} h={18} d={280} st={{ borderRadius: "50%", background: "radial-gradient(circle, #2a1206, transparent 70%)" }} />
        <L c="g42-nt-clip" l={44} t={22} w={14} h={10} d={480} st={{ borderRadius: "1px", background: "#ff9f6b", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hitside" l={10} t={30} w={80} h={34} d={0} par="none" vb="0 0 60 24">{tag}</V>
        <L c="g42-relay" l={36} t={38} w={28} h={22} d={140} st={{ borderRadius: "50%", background: "radial-gradient(circle, #2a1206, transparent 70%)" }} />
        <L c="g42-hit2" l={46} t={66} w={10} h={10} d={280} st={{ borderRadius: "50%", background: "#ff9f6b" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(255,159,107,0.26)" />}>
      <V c="g42-nt-tag" l={38} t={44} w={24} h={9} d={90} par="none" vb="0 0 60 24">{tag}</V>
      <L c="g42-nt-word" l={44} t={47} w={12} h={3} d={230} st={{ borderRadius: "1px", background: "rgba(42,18,6,0.7)" }} />
      {NT_SCORCH.map((i) => (
        <L key={i} c="g42-nt-scorch" l={45 + i * 4} t={46} w={3 + i} h={3 + i} d={340 + i * 130} st={{ borderRadius: "50%", background: "radial-gradient(circle, #2a1206, transparent 70%)" }} />
      ))}
      <L c="g42-nt-clip" l={48} t={41} w={4} h={3} d={680} st={{ borderRadius: "1px", background: "#ff9f6b", transformOrigin: "50% 0%" }} />
      <L c="g42-lean" l={39} t={54} w={22} h={3} d={720} st={{ borderRadius: "999px", background: "rgba(42,18,6,0.55)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-ember" l={46 + i * 5} t={44} w={1.6} h={1.6} d={760 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 37. Slow Burn (t2) — THE FUSE SPITS ALL THE WAY -------------------------
   The spark walks the cord at a lazy pace, throwing off little spits sideways,
   and then finds the dry length and stops being slow at all.
   Palette: #ffb03c / #fff4d6 / #2a1404. */
const SB_SPITS = [0, 1, 2];

function SlowBurnScene({ role, delayMs }: SceneProps) {
  const cord = (
    <path d="M2 16c4-6 8 4 12-2 3-4.4 6-1.4 8-.6" fill="none" stroke="#2a1404" strokeWidth="2.6" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-rise" l={6} t={30} w={88} h={40} d={40}>{cord}</V>
        <L c="g42-sb-spark" l={20} t={44} w={12} h={12} d={280} st={{ borderRadius: "50%", background: "#fff4d6" }} />
        <L c="g42-sb-spit" l={38} t={34} w={5} h={5} d={480} st={{ borderRadius: "50%", background: "#ffb03c" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hitside" l={8} t={30} w={84} h={40} d={0}>{cord}</V>
        <L c="g42-relay" l={34} t={38} w={24} h={24} d={140} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 66%)" }} />
        <L c="g42-hit2" l={56} t={30} w={5} h={5} d={280} st={{ borderRadius: "50%", background: "#ffb03c" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(255,176,60,0.28)" /><Rim tone="rgba(255,244,214,0.2)" /></>}>
      <V c="g42-sb-cord" l={42} t={44} w={30} h={12} d={70}>{cord}</V>
      <L c="g42-runup" l={44} t={49} w={28} h={1.6} d={200} st={{ background: "linear-gradient(90deg, #2a1404, rgba(42,20,4,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <L c="g42-sb-spark" l={45} t={47} w={4} h={4} d={330} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 66%)" }} />
      {SB_SPITS.map((i) => (
        <L key={i} c="g42-sb-spit" l={48 + i * 5} t={46} w={1.8} h={1.8} d={430 + i * 130} st={{ borderRadius: "50%", background: "#ffb03c" }} />
      ))}
      <L c="g42-lean" l={44} t={54} w={22} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(42,20,4,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-ember" l={52 + i * 5} t={45} w={1.6} h={1.6} d={740 + i * 90} st={{ borderRadius: "50%", background: "#ffb03c" }} />
      ))}
    </Lead>
  );
}

/* --- 38. Fire Drill (t3) — THE HEADS GO OFF IN ORDER -------------------------
   One glass bulb bursts on the ceiling main, and the next, and the next, and
   the orderly evacuation is conducted entirely in the rain.
   Palette: #8fd0ff / #fff4d6 / #10202e. */
const FD_HEADS = [0, 1, 2, 3];

function FireDrillScene({ role, delayMs }: SceneProps) {
  const head = (
    <g {...SJ}>
      <path d="M12 2v6" stroke="#8fd0ff" strokeWidth="2" />
      <path d="M7.4 8h9.2l-2.2 4h-4.8z" fill="#fff4d6" stroke="#10202e" strokeWidth="1" />
      <path d="M12 12v4" stroke="#8fd0ff" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g42-ent-drop" l={6} t={14} w={88} h={5} d={40} st={{ borderRadius: "999px", background: "#8fd0ff" }} />
        <V c="g42-fd-head" l={34} t={18} w={32} h={38} d={280}>{head}</V>
        <L c="g42-fd-spray" l={26} t={48} w={48} h={34} d={480} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.7), transparent)", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-relay" l={32} t={10} w={36} h={44} d={0}>{head}</V>
        <L c="g42-hitside" l={24} t={48} w={52} h={34} d={140} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.65), transparent)", transformOrigin: "50% 0%" }} />
        <L c="g42-hit2" l={42} t={78} w={16} h={4} d={280} st={{ borderRadius: "999px", background: "#8fd0ff" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(143,208,255,0.26)" />}>
      <L c="g42-fd-pipe" l={44} t={42} w={26} h={1.8} d={70} st={{ borderRadius: "999px", background: "#8fd0ff", transformOrigin: "0% 50%" }} />
      {FD_HEADS.map((i) => (
        <V key={i} c="g42-fd-head" l={45 + i * 5.4} t={43} w={4} h={6} d={190 + i * 120} st={{ transformOrigin: "50% 0%" }}>{head}</V>
      ))}
      <L c="g42-fd-spray" l={45} t={47} w={22} h={9} d={620} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.6), transparent)", transformOrigin: "50% 0%" }} />
      <L c="g42-runup" l={44} t={51} w={28} h={1.4} d={680} st={{ background: "linear-gradient(90deg, #8fd0ff, rgba(143,208,255,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-sift" l={48 + i * 6} t={53} w={1.4} h={3} d={740 + i * 90} st={{ borderRadius: "999px", background: "#8fd0ff" }} />
      ))}
      <L c="g42-glint" l={45} t={40} w={2.2} h={2.2} d={800} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </AimLead>
  );
}

/* --- 39. Scorched Diagonal (t7) — THE FLARE OUTRUNS THE HAND -----------------
   Scratch, catch, and then the head flares and the fire runs down the stick
   faster than the fingers can let go of it. The whole long diagonal is lit.
   Palette: #ffb867 / #fff4d6 / #2a1204. */
const SX_RUN = [0, 1, 2];

function ScorchedDiagonalScene({ role, delayMs }: SceneProps) {
  const hand = (
    <g {...SJ}>
      <path d="M3 18.6V12c0-1.2 1.8-1.2 1.8 0V8c0-1.3 1.9-1.3 1.9 0v3c0-1.4 1.9-1.4 1.9 0V9.6c0-1.4 2-1.4 2 0v7.6c0 2.6-1.8 4-4.6 4z" fill="#2a1204" stroke="#ffb867" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g42-sx-strip" l={8} t={62} w={84} h={7} d={40} st={{ borderRadius: "1px", background: "#2a1204" }} />
        <L c="g42-sx-scratch" l={20} t={54} w={44} h={4} d={270} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "0% 50%" }} />
        <V c="g42-sx-head" l={50} t={22} w={30} h={34} d={480}>
          <path d="M12 3c2.6 3.8 4 5.8 4 7.8a4 4 0 0 1-8 0c0-2 1.4-4 4-7.8z" fill="#fff4d6" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g42-hitside" l={10} t={60} w={80} h={5} d={0} st={{ borderRadius: "1px", background: "#2a1204" }} />
        <V c="g42-relay" l={36} t={22} w={30} h={38} d={140}>
          <path d="M12 3c2.6 3.8 4 5.8 4 7.8a4 4 0 0 1-8 0c0-2 1.4-4 4-7.8z" fill="#fff4d6" />
        </V>
        <L c="g42-hit2" l={30} t={40} w={42} h={4} d={280} st={{ borderRadius: "999px", background: "#ffb867" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(255,184,103,0.3)" /><Rim tone="rgba(255,244,214,0.28)" /></>}>
      <L c="g42-sx-strip" l={43} t={51} w={20} h={1.8} d={60} st={{ borderRadius: "1px", background: "#2a1204", transformOrigin: "0% 50%" }} />
      <L c="g42-sx-scratch" l={44} t={50} w={10} h={1.2} d={180} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "0% 50%" }} />
      <V c="g42-sx-head" l={46} t={44} w={5} h={6} d={300}>
        <path d="M12 3c2.6 3.8 4 5.8 4 7.8a4 4 0 0 1-8 0c0-2 1.4-4 4-7.8z" fill="#fff4d6" />
      </V>
      {SX_RUN.map((i) => (
        <L key={i} c="g42-sx-flare" l={48 + i * 5} t={46 - i} w={4 + i * 1.6} h={4 + i * 1.6} d={420 + i * 130} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 66%)" }} />
      ))}
      <V c="g42-sx-hand" l={40} t={46} w={8} h={10} d={620}>{hand}</V>
      <L c="g42-runup" l={44} t={52} w={30} h={2} d={680} st={{ background: "linear-gradient(90deg, #ffb867, rgba(255,184,103,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-ember" l={54 + i * 5} t={44} w={1.8} h={1.8} d={760 + i * 90} st={{ borderRadius: "50%", background: "#ffb867" }} />
      ))}
    </Lead>
  );
}

/* --- 40. Barn Door (t2) — THE SLAM SHAKES THE LOFT DOWN ----------------------
   The door goes over, the drop bar falls into its brackets, and then the loft
   answers: three waves of dust come off the beams, each bigger than the last.
   Palette: #e08a5a / #fff4d6 / #26140a. */
const BN_WAVES = [0, 1, 2];

function BarnDoorScene({ role, delayMs }: SceneProps) {
  const door = (
    <g {...SJ}>
      <rect x="3" y="3" width="18" height="18" rx="1" fill="#26140a" stroke="#e08a5a" strokeWidth="1.3" />
      <path d="M3 3l18 18M21 3L3 21" stroke="#e08a5a" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-swing" l={16} t={16} w={68} h={68} d={40} st={{ transformOrigin: "0% 50%" }}>{door}</V>
        <L c="g42-bn-bar" l={12} t={50} w={76} h={7} d={280} st={{ borderRadius: "1px", background: "#fff4d6" }} />
        <L c="g42-bn-dust" l={10} t={70} w={80} h={16} d={480} st={{ borderRadius: "999px", background: "radial-gradient(circle, rgba(224,138,90,0.7), transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hitside" l={18} t={16} w={64} h={66} d={0}>{door}</V>
        <L c="g42-relay" l={14} t={48} w={72} h={5} d={140} st={{ borderRadius: "1px", background: "#fff4d6" }} />
        <L c="g42-hit2" l={24} t={74} w={52} h={10} d={280} st={{ borderRadius: "999px", background: "radial-gradient(circle, rgba(224,138,90,0.7), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(224,138,90,0.28)" /><Rim tone="rgba(255,244,214,0.22)" /></>}>
      <V c="g42-bn-door" l={42} t={38} w={16} h={18} d={80} st={{ transformOrigin: "0% 50%" }}>{door}</V>
      <L c="g42-bn-bar" l={41} t={47} w={18} h={1.8} d={280} st={{ borderRadius: "1px", background: "#fff4d6" }} />
      {BN_WAVES.map((i) => (
        <L key={i} c="g42-bn-dust" l={40 - i * 2} t={52 + i} w={20 + i * 4} h={3 + i} d={400 + i * 120} st={{ borderRadius: "999px", background: "radial-gradient(circle, rgba(224,138,90,0.65), transparent 70%)" }} />
      ))}
      <L c="g42-bn-boom" l={38} t={36} w={24} h={24} d={640} st={{ borderRadius: "50%", border: "2px solid #e08a5a" }} />
      <L c="g42-lean" l={40} t={57} w={22} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(38,20,10,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-sift" l={44 + i * 6} t={54} w={1.6} h={1.6} d={760 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 41. Split the Timeline (t8) — ONE TRAP, THEN TWO, THEN FOUR -------------
   A ball drops on a cocked trap. It throws two more balls, which trip two more
   traps, and the room doubles itself until there is no room left.
   Palette: #b0e0ff / #fff4d6 / #101c30. */
const ST_FAN = [0, 1, 2, 3];
const ST_ARCS = [-1, 1];

function SplitTimelineScene({ role, delayMs }: SceneProps) {
  const trap = (
    <g {...SJ}>
      <rect x="3" y="12" width="18" height="8" rx="1" fill="#101c30" stroke="#b0e0ff" strokeWidth="1.2" />
      <path d="M4.6 12V6.6h14.8" fill="none" stroke="#fff4d6" strokeWidth="1.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g42-ent-rise" l={18} t={38} w={64} h={46} d={40}>{trap}</V>
        <L c="g42-st-ball" l={44} t={6} w={14} h={14} d={280} st={{ borderRadius: "50%", background: "#fff4d6" }} />
        <V c="g42-st-throw" l={22} t={30} w={56} h={40} d={480} st={{ transformOrigin: "10% 100%" }}>{trap}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g42-hitside" l={20} t={38} w={60} h={44} d={0}>{trap}</V>
        <L c="g42-relay" l={40} t={16} w={20} h={20} d={140} st={{ borderRadius: "50%", background: "#fff4d6" }} />
        <L c="g42-hit2" l={30} t={30} w={40} h={40} d={280} st={{ borderRadius: "50%", border: "2px solid #b0e0ff" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(176,224,255,0.3)" /><Rim tone="rgba(255,244,214,0.3)" /></>}>
      <V c="g42-st-trap" l={44} t={46} w={12} h={9} d={80} st={{ transformOrigin: "10% 100%" }}>{trap}</V>
      <L c="g42-st-ball" l={48.6} t={36} w={3} h={3} d={200} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      {ST_FAN.map((i) => (
        <V key={i} c="g42-st-throw" l={40 + i * 5.6} t={45 + (i % 2) * 4} w={9} h={7} d={330 + i * 115} st={{ transformOrigin: "10% 100%" }}>{trap}</V>
      ))}
      {ST_ARCS.map((s, i) => (
        <L key={i} c="g42-st-arc" l={48} t={42} w={3} h={3} d={620 + i * 100} st={{ borderRadius: "50%", background: "#b0e0ff", rotate: `${s * 30}deg` }} />
      ))}
      <L c="g42-updraft" l={49} t={40} w={5} h={5} d={720} st={{ borderRadius: "50%", background: "rgba(255,244,214,0.7)" }} />
      <L c="g42-lean" l={42} t={56} w={20} h={3} d={760} st={{ borderRadius: "999px", background: "rgba(16,28,48,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g42-sift" l={45 + i * 6} t={53} w={1.6} h={1.6} d={800 + i * 90} st={{ borderRadius: "50%", background: "#b0e0ff" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   Registry. Every entry declares an anchor; every `sound` is an existing
   SigSoundKey. `ordering` and `staggerMs` are chosen so the reaction PROPAGATES
   through the real victim order: chain cards sort "line" or "sweep" with a
   generous stagger, so --fx-index means something on every square it reaches.
   ========================================================================== */

/** Bind one bespoke scene to its config. */
function S(Render: SigPlugin["Render"], config: SigPlugin["config"]): SigPlugin {
  return { config, Render };
}

export const PLAYS: Record<string, SigPlugin> = {
  op_border_report: S(BorderReportScene, { ordering: "line", staggerMs: 80, victims: "all", hasLead: true, sound: "siege", anchor: "aim" }),
  op_day_census: S(DayCensusScene, { ordering: "sweep", staggerMs: 70, victims: "all", hasLead: true, sound: "slots", anchor: "cast" }),
  op_left_bank_atlas: S(LeftBankAtlasScene, { ordering: "line", staggerMs: 75, victims: "all", hasLead: true, sound: "shades", anchor: "aim" }),
  op_palace_floor_plan: S(PalaceFloorPlanScene, { ordering: "octagon", staggerMs: 70, victims: "all", hasLead: true, sound: "chips", anchor: "cast" }),
  op_pep_talk: S(PepTalkScene, { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "colossus", anchor: "board" }),
  op_threat_ledger: S(ThreatLedgerScene, { ordering: "radial", staggerMs: 65, victims: "all", hasLead: true, sound: "blitz", anchor: "cast" }),
  op_ticker_tape: S(TickerTapeScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wheel", anchor: "board" }),
  ov_sugar_glider: S(SugarGliderScene, { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "crownrain", anchor: "cast" }),
  op_do_si_do: S(DoSiDoScene, { ordering: "line", staggerMs: 70, victims: ["k"], hasLead: true, sound: "coinflip", anchor: "aim" }),
  bn4_party_hat: S(PartyHatScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain", anchor: "cast" }),
  bn4_gryphon_rider: S(GryphonRiderScene, { ordering: "line", staggerMs: 70, victims: ["n"], hasLead: true, sound: "rampage", anchor: "aim" }),
  ov_puppeteers_gala: S(PuppeteersGalaScene, { ordering: "line", staggerMs: 90, victims: ["n", "b"], hasLead: true, sound: "shades", anchor: "aim" }),
  bn4_hall_of_doors: S(HallOfDoorsScene, { ordering: "line", staggerMs: 85, victims: "all", hasLead: true, sound: "colossus", anchor: "aim" }),
  op_distant_thunder: S(DistantThunderScene, { ordering: "radial", staggerMs: 60, victims: ["k"], hasLead: true, sound: "lightning", anchor: "board" }),
  ov_static_cling: S(StaticClingScene, { ordering: "line", staggerMs: 65, victims: "all", hasLead: true, sound: "lightning", anchor: "cast" }),
  op_storm_door: S(StormDoorScene, { ordering: "line", staggerMs: 70, victims: ["p"], hasLead: true, sound: "rampage", anchor: "aim" }),
  ov_thunderstorm: S(ThunderstormScene, { ordering: "sweep", staggerMs: 80, victims: ["p"], hasLead: true, sound: "lightning", anchor: "board" }),
  ov_lightning_rod: S(LightningRodScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "lightning", anchor: "cast" }),
  ov_blood_moon: S(BloodMoonScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades", anchor: "cast" }),
  hx4_sandstorm: S(SandstormScene, { ordering: "line", staggerMs: 80, victims: ["b", "r", "q"], hasLead: true, sound: "rampage", anchor: "board" }),
  bn4_lightning_rod: S(LeydenBankScene, { ordering: "radial", staggerMs: 70, victims: "all", hasLead: true, sound: "lightning", anchor: "cast" }),
  bn4_stormcrossing: S(StormcrossingScene, { ordering: "line", staggerMs: 75, victims: ["b", "r", "q"], hasLead: true, sound: "lightning", anchor: "aim" }),
  ov_olympus_voicemail: S(OlympusVoicemailScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "lightning", anchor: "cast" }),
  ov_menagerie_stampede: S(MenagerieStampedeScene, { ordering: "line", staggerMs: 80, victims: "all", hasLead: true, sound: "rampage", anchor: "cast" }),
  op_closed_for_cleaning: S(ClosedForCleaningScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "cast" }),
  op_do_not_disturb: S(DoNotDisturbScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "cast" }),
  op_margin_notes: S(MarginNotesScene, { ordering: "sweep", staggerMs: 70, victims: "all", hasLead: true, sound: "vault", anchor: "cast" }),
  op_reserved_table: S(ReservedTableScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "cast" }),
  op_ribbon_cutting: S(RibbonCuttingScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "coronation", anchor: "board" }),
  op_the_management: S(TheManagementScene, { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "vault", anchor: "board" }),
  ov_kazoo_fanfare: S(KazooFanfareScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crashrocket", anchor: "board" }),
  ov_left_on_read: S(LeftOnReadScene, { ordering: "radial", staggerMs: 60, victims: ["k"], hasLead: true, sound: "clockcage", anchor: "board" }),
  ov_growth_potion: S(GrowthPotionScene, { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "massfreeze", anchor: "cast" }),
  op_fire_escape: S(FireEscapeScene, { ordering: "line", staggerMs: 70, victims: ["p"], hasLead: true, sound: "wall", anchor: "aim" }),
  hx4_beneath_her_dignity: S(BeneathHerDignityScene, { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "atomic", anchor: "cast" }),
  hx4_royal_nametag: S(RoyalNameTagScene, { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "atomic", anchor: "cast" }),
  op_slow_burn: S(SlowBurnScene, { ordering: "line", staggerMs: 90, victims: "all", hasLead: true, sound: "atomic", anchor: "board" }),
  ov_fire_drill: S(FireDrillScene, { ordering: "line", staggerMs: 75, victims: "all", hasLead: true, sound: "wall", anchor: "aim" }),
  hx4_scorched_diagonal: S(ScorchedDiagonalScene, { ordering: "line", staggerMs: 85, victims: "all", hasLead: true, sound: "atomic", anchor: "board" }),
  ov_barn_door: S(BarnDoorScene, { ordering: "file", staggerMs: 70, victims: "all", hasLead: true, sound: "colossus", anchor: "board" }),
  ov_split_timeline: S(SplitTimelineScene, { ordering: "radial", staggerMs: 65, victims: "all", hasLead: true, sound: "cataclysm", anchor: "cast" }),
};
