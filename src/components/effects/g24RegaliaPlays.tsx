// g24RegaliaPlays — bespoke plays for the 20 king / royalty / authority cards
// that used to share the generated `crownGleam` family (one crown, twenty hue
// shifts, one gleam).
//
// MODULE FICTION: THE REGALIA AND THE RITUAL. The gleam is exactly what is
// being replaced, so no card here is a crown lighting up. Each is a different
// OBJECT OF STATE doing its one job: an anointing horn tipped and the oil
// running, a costume trunk thrown open, a crucible pouring lead into a mould,
// a sword of state turned point-down and driven in, a great seal matrix
// parting on two impressions, a charter unrolled under a quill, a cloth of
// estate carried over and lowered, a bier with the crown on its cushion,
// stanchions and the cord of estate, an orb lifted out of one palm and set in
// another, three lesser coronets on a cushion, a marionette control bar,
// spurs buckled onto a heel, three cloches lifted at once, a barge with its
// standard broken out at the masthead, a crown's arches seizing on their
// hinge, a crown put away in a hatbox, a chain of office clipped to a tower,
// a sceptre grounded once on stone, a paste tiara off a props table.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g24RegaliaPlays.css), transform/opacity animations only, no imports from
// BoardEffects.tsx, only the SigPlugin/SigRole TYPES from sigPlugins.tsx.
//
// STAGING. Every card declares anchor "cast" or "aim", so the ritual happens
// on the square the card was played on. Board-scale layers (washes, edge gilt,
// the hall going dark) live inside <BoardFrame>, never at a fixed percentage
// of the stage. Cards whose fiction TRAVELS — the puppet queen marched, the
// king striding, the barge, the escort chain, the spurs — use <AimStage> and
// author their art pointing RIGHT.
//
// Every scene runs three beats — tell, strike, settle — in all three roles
// ("lead", "target", "entrance"), and every lead carries at least one animated
// layer driven by the geometry vars (--fx-ox/--fx-oy lean, --fx-side arrival,
// --fx-len run length), which is what makes the play directional rather than
// decorative. All CSS lives in g24RegaliaPlays.css behind the `g24-` prefix.

import "./g24RegaliaPlays.css";

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
const rootStyle = (d: number): CSSProperties => ({ "--g24-d": `${d}ms` }) as CSSProperties;

/** stagger + a beat offset, scaled by the Settings animation-speed var. */
const b = (ms: number): string => `calc(var(--g24-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

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
  return <L c="g24-wash" d={d} st={{ background: `radial-gradient(circle at 50% 48%, ${tone}, transparent 70%)` }} />;
}

/** Board-edge gilt, always inside a BoardFrame. */
function Rim({ tone, d = 160 }: { tone: string; d?: number }) {
  return <L c="g24-rim" d={d} st={{ boxShadow: `inset 0 0 30px 9px ${tone}` }} />;
}

/* Piece silhouettes: the bodies the regalia is used ON. */
const PAWN = "M12 4.4a2.7 2.7 0 0 1 1.6 4.9l1.8 6.4H8.6l1.8-6.4A2.7 2.7 0 0 1 12 4.4z M7.4 16.8h9.2V19.4H7.4z";
const KING = "M11.1 2.4h1.8v1.5h1.5v1.8h-1.5v1.6h-1.8V5.7H9.6V3.9h1.5zM8 9.2h8l-1.1 7.4H9.1zM7.2 17.6h9.6V20H7.2z";
const KNIGHT = "M8.4 20.4v-6.2c0-3.8 2.4-5.9 4.4-6.5l-.7-2.3 2.9 1.2c1.9.9 2.8 2.9 2.8 5.8v8z";
const QUEEN = "M6.4 6l1.3 3.2L9.4 6.6 12 9.4l2.6-2.8 1.7 2.6L17.6 6l-1 10.4H7.4zM7 17.4h10v2.4H7z";
const TOWER = "M7 4.8h2.3v1.6h1.6V4.8h2.2v1.6h1.6V4.8H17v3.6h-1.2v6.8H17V19H7v-3.8h1.2V8.4H7z";
const HOOD = "M12 3.6c2.6 0 4.2 2.2 4.2 5L15.6 21H8.4L7.8 8.6c0-2.8 1.6-5 4.2-5z";

/** The open coronet, used only where a card genuinely handles a crown. */
const CORONET = "M3 17.6l-1.2-9.6 4.9 3.4L12 4.8l5.3 6.6 4.9-3.4-1.2 9.6z";
const CORONET_BAND = "M3.4 18.4h17.2v2.6H3.4z";

/* --- 1. Ascension of the Small (t8) — THE ANOINTING HORN --------------------
   The ampulla tips over the little piece, the oil runs down it in one thread,
   the piece straightens out of its own crouch and a coronet closes over the
   wet head while the last drops sift off. Palette: #e8c46a / #fff4d6 /
   #2a2010. */
const AS_HORN = "M2.6 10.2c3.6-3.6 9.4-5.2 16-4.6l2.8 4.6-2.8 4.6c-6.6.6-12.4-1-16-4.6z";

function AscensionSmallScene({ role, delayMs }: SceneProps) {
  const horn = (
    <g {...SJ}>
      <path d={AS_HORN} fill="#e8c46a" stroke="#2a2010" strokeWidth="1.2" />
      <path d="M6 8.2c3.4-1.4 7.6-1.8 11.6-1.2" stroke="#fff4d6" strokeWidth="1" fill="none" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g24-as-horn" l={6} t={14} w={62} h={34} d={60} st={{ transformOrigin: "88% 60%" }}>{horn}</V>
        <L c="g24-as-oil" l={46} t={40} w={7} h={38} d={330} st={{ background: "linear-gradient(180deg, #fff4d6, rgba(232,196,106,0))", transformOrigin: "50% 0%" }} />
        <V c="g24-ent-pop" l={28} t={44} w={44} h={44} d={620}>
          <path d={CORONET} fill="#e8c46a" stroke="#2a2010" strokeWidth="1.1" {...SJ} />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g24-hit" l={10} t={10} w={56} h={34} d={0} st={{ transformOrigin: "88% 60%" }}>{horn}</V>
        <L c="g24-hit2" l={46} t={36} w={8} h={40} d={150} st={{ background: "linear-gradient(180deg, #fff4d6, rgba(232,196,106,0))" }} />
        <V c="g24-hitside" l={32} t={44} w={38} h={46} d={260}><path d={KNIGHT} fill="#e8c46a" /></V>
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(232,196,106,0.3)" />
          <Rim tone="rgba(255,244,214,0.34)" />
        </>
      }
    >
      <L c="g24-shaft" l={45} t={20} w={10} h={38} d={60} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.7), transparent)", transformOrigin: "50% 0%" }} />
      <V c="g24-as-horn" l={35} t={31} w={17} h={10} d={180} st={{ transformOrigin: "86% 60%" }}>{horn}</V>
      <L c="g24-as-oil" l={47.4} t={38} w={2.6} h={13} d={380} st={{ background: "linear-gradient(180deg, #fff4d6, rgba(232,196,106,0))", transformOrigin: "50% 0%" }} />
      <V c="g24-as-rise" l={44.5} t={42} w={11} h={14} d={520}>
        <path d={KNIGHT} fill="#e8c46a" stroke="#2a2010" strokeWidth="1.1" {...SJ} />
      </V>
      <V c="g24-as-coronet" l={44} t={36} w={12} h={9} d={700}>
        <path d={CORONET} fill="#fff4d6" stroke="#2a2010" strokeWidth="1.2" {...SJ} />
        <path d={CORONET_BAND} fill="#e8c46a" />
      </V>
      <L c="g24-leanshadow" l={42} t={56} w={18} h={3} d={740} st={{ borderRadius: "999px", background: "rgba(42,32,16,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g24-sift" l={44 + i * 5} t={48} w={1.4} h={1.4} d={780 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 2. Crown of Masks (t8) — THE COSTUME TRUNK -----------------------------
   The carnival trunk lands, its lid slams back on the hinge, and the masks
   come out of it on their ribbons and settle over the whole company. Palette:
   #cf6bb8 / #ffe9c8 / #2b1030. */
const CM_MASKS: Array<[number, number]> = [[36, 34], [50, 30], [58, 40], [42, 27]];

function CrownOfMasksScene({ role, delayMs }: SceneProps) {
  const mask = (fill: string) => (
    <g {...SJ}>
      <path d="M3 6.2h18v5.4c0 4.6-4 9.4-9 9.4s-9-4.8-9-9.4z" fill={fill} stroke="#2b1030" strokeWidth="1.1" />
      <path d="M7.4 11.4c.8-1.4 2.6-1.4 3.4 0M13.2 11.4c.8-1.4 2.6-1.4 3.4 0" stroke="#2b1030" strokeWidth="1.2" fill="none" />
    </g>
  );
  const trunk = (
    <g {...SJ}>
      <path d="M3 10h18v10H3z" fill="#2b1030" stroke="#cf6bb8" strokeWidth="1.2" />
      <path d="M8 10v10M16 10v10" stroke="#cf6bb8" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g24-cm-trunk" l={16} t={44} w={68} h={44} d={70}>{trunk}</V>
        <V c="g24-cm-lid" l={16} t={20} w={68} h={30} d={280} st={{ transformOrigin: "50% 100%" }}>
          <path d="M3 16C3 8 7 4 12 4s9 4 9 12z" fill="#cf6bb8" stroke="#2b1030" strokeWidth="1.2" {...SJ} />
        </V>
        <V c="g24-cm-mask" l={30} t={10} w={40} h={40} d={520}>{mask("#ffe9c8")}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g24-hitside" l={22} t={16} w={56} h={56} d={0}>{mask("#cf6bb8")}</V>
        <L c="g24-hit2" l={18} t={70} w={64} h={3} d={150} st={{ borderRadius: "999px", background: "#ffe9c8" }} />
        <L c="g24-hit" l={44} t={38} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#ffe9c8" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(207,107,184,0.3)" />}>
      <V c="g24-cm-trunk" l={42} t={44} w={16} h={12} d={90}>{trunk}</V>
      <V c="g24-cm-lid" l={42} t={35} w={16} h={10} d={280} st={{ transformOrigin: "50% 100%" }}>
        <path d="M3 16C3 8 7 4 12 4s9 4 9 12z" fill="#cf6bb8" stroke="#2b1030" strokeWidth="1.2" {...SJ} />
      </V>
      {CM_MASKS.map(([l, t], i) => (
        <V key={i} c="g24-cm-mask" l={l} t={t} w={8} h={8} d={420 + i * 90}>{mask(i % 2 ? "#ffe9c8" : "#cf6bb8")}</V>
      ))}
      <L c="g24-cm-ribbon" l={44} t={40} w={16} h={1.6} d={560} st={{ background: "linear-gradient(90deg, transparent, #ffe9c8, transparent)" }} />
      <L c="g24-leanshadow" l={41} t={56} w={20} h={3} d={680} st={{ borderRadius: "999px", background: "rgba(43,16,48,0.62)" }} />
      <L c="g24-glint" l={52} t={34} w={2.4} h={2.4} d={760} st={{ borderRadius: "50%", background: "#ffe9c8" }} />
    </Lead>
  );
}

/* --- 3. Crown of Lead (t8) — THE CRUCIBLE POURS -----------------------------
   A crucible tips over the mould, grey lead runs into it in one thick rope,
   the finished crown is lowered onto the head and keeps going down; the
   boards take the weight and a paper cone is set on top of it. Palette:
   #9aa2ac / #ffeccd / #191c22. */
function CrownOfLeadScene({ role, delayMs }: SceneProps) {
  const crucible = (
    <g {...SJ}>
      <path d="M3.4 5h15.2l-2.6 9H6z" fill="#191c22" stroke="#9aa2ac" strokeWidth="1.3" />
      <path d="M18.6 5.6c2.4.4 2.8 3 .6 3.8" fill="none" stroke="#9aa2ac" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g24-cl-tip" l={8} t={10} w={54} h={38} d={70} st={{ transformOrigin: "22% 80%" }}>{crucible}</V>
        <L c="g24-cl-pour" l={40} t={40} w={9} h={34} d={330} st={{ background: "linear-gradient(180deg, #ffeccd, #9aa2ac)", transformOrigin: "50% 0%" }} />
        <V c="g24-cl-sink" l={26} t={56} w={48} h={34} d={620}>
          <path d={CORONET} fill="#9aa2ac" stroke="#191c22" strokeWidth="1.2" {...SJ} />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g24-hit" l={12} t={8} w={48} h={34} d={0} st={{ transformOrigin: "22% 80%" }}>{crucible}</V>
        <L c="g24-hit2" l={42} t={36} w={9} h={34} d={140} st={{ background: "linear-gradient(180deg, #ffeccd, #9aa2ac)" }} />
        <V c="g24-hitside" l={28} t={52} w={44} h={34} d={260}>
          <path d={CORONET} fill="#9aa2ac" stroke="#191c22" strokeWidth="1.2" {...SJ} />
        </V>
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <L c="g24-veil" st={{ background: "rgba(10,12,16,0.44)" }} />
          <Wash tone="rgba(154,162,172,0.3)" d={120} />
        </>
      }
    >
      <V c="g24-cl-tip" l={34} t={28} w={16} h={12} d={120} st={{ transformOrigin: "20% 82%" }}>{crucible}</V>
      <L c="g24-cl-pour" l={45.6} t={37} w={3} h={11} d={320} st={{ background: "linear-gradient(180deg, #ffeccd, #9aa2ac)", transformOrigin: "50% 0%" }} />
      <V c="g24-cl-sink" l={44} t={42} w={12} h={10} d={560}>
        <path d={CORONET} fill="#9aa2ac" stroke="#191c22" strokeWidth="1.3" {...SJ} />
        <path d={CORONET_BAND} fill="#191c22" />
      </V>
      <L c="g24-leanshadow" l={41} t={55} w={20} h={4} d={640} st={{ borderRadius: "999px", background: "rgba(25,28,34,0.72)" }} />
      <V c="g24-cl-cone" l={46} t={33} w={8} h={11} d={720}>
        <path d="M12 2.4L18 20H6z" fill="#ffeccd" stroke="#191c22" strokeWidth="1.1" {...SJ} />
      </V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g24-sift" l={43 + i * 6} t={49} w={1.6} h={1.6} d={780 + i * 90} st={{ borderRadius: "50%", background: "#9aa2ac" }} />
      ))}
    </Lead>
  );
}

/* --- 4. Crown of the Undying (t8) — THE SWORD OF STATE, POINT-DOWN ----------
   The sword of state turns over in the air and is driven point-down through
   the boards beside the king; the shock throws everything standing next to
   him off its feet, and the crown on the pommel keeps burning. Palette:
   #e0596a / #fff2d8 / #2a0f16. */
const CU_SPOKES = [30, 110, 200, 290];

function CrownOfTheUndyingScene({ role, delayMs }: SceneProps) {
  const sword = (
    <g {...SJ}>
      <path d="M12 1.6l2.2 4.2v10.6L12 22.4l-2.2-6V5.8z" fill="#fff2d8" stroke="#2a0f16" strokeWidth="1.1" />
      <path d="M4.4 6.2h15.2" stroke="#e0596a" strokeWidth="2.2" />
      <circle cx="12" cy="3.4" r="1.6" fill="#e0596a" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g24-cu-turn" l={30} t={4} w={40} h={80} d={70} st={{ transformOrigin: "50% 40%" }}>{sword}</V>
        <L c="g24-cu-shock" l={18} t={54} w={64} h={30} d={420} st={{ borderRadius: "50%", border: "2px solid #e0596a" }} />
        <V c="g24-ent-pop" l={38} t={2} w={24} h={24} d={600}>
          <path d={CORONET} fill="#fff2d8" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g24-hit" l={34} t={2} w={32} h={72} d={0}>{sword}</V>
        <L c="g24-hit2" l={16} t={58} w={68} h={26} d={150} st={{ borderRadius: "50%", border: "2px solid #e0596a" }} />
        <V c="g24-hitside" l={54} t={44} w={30} h={40} d={250}><path d={PAWN} fill="#e0596a" /></V>
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(224,89,106,0.3)" />
          <Rim tone="rgba(255,242,216,0.32)" />
        </>
      }
    >
      <L c="g24-shaft" l={45.5} t={18} w={9} h={38} d={60} st={{ background: "linear-gradient(180deg, rgba(255,242,216,0.66), transparent)", transformOrigin: "50% 0%" }} />
      <V c="g24-cu-turn" l={45} t={30} w={10} h={26} d={160} st={{ transformOrigin: "50% 46%" }}>{sword}</V>
      <L c="g24-cu-shock" l={38} t={45} w={24} h={16} d={520} st={{ borderRadius: "50%", border: "2px solid #e0596a" }} />
      {CU_SPOKES.map((a, i) => (
        <P key={a} l={38} t={38} w={24} h={24} rot={`${a}deg`}>
          <V c="g24-cu-sweep" w={100} h={100} d={560 + i * 70}><path d={PAWN} fill="#e0596a" opacity="0.9" /></V>
        </P>
      ))}
      <V c="g24-cu-flame" l={46.5} t={28} w={7} h={7} d={640}>
        <path d={CORONET} fill="#fff2d8" stroke="#2a0f16" strokeWidth="1.1" {...SJ} />
      </V>
      <L c="g24-leanshadow" l={42} t={56} w={18} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(42,15,22,0.66)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g24-sift" l={44 + i * 6} t={50} w={1.5} h={1.5} d={780 + i * 90} st={{ borderRadius: "50%", background: "#fff2d8" }} />
      ))}
    </Lead>
  );
}

/* --- 5. Crown Commission (t7) — THE GREAT SEAL MATRIX -----------------------
   Two halves of the great seal close on a blob of wax, and when they part
   there are TWO impressions on the cord, not one. Palette: #d4553c /
   #ffe7c4 / #2c1410. */
function CrownCommissionScene({ role, delayMs }: SceneProps) {
  const matrix = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="9.4" fill="#2c1410" stroke="#d4553c" strokeWidth="1.4" />
      <path d="M6.4 12h11.2M12 6.4v11.2" stroke="#d4553c" strokeWidth="1.1" />
    </g>
  );
  const impression = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="8.6" fill="#d4553c" stroke="#2c1410" strokeWidth="1.2" />
      <path d="M5.8 13.4l-.6-5 2.8 1.8L12 6.2l4 4 2.8-1.8-.6 5z" fill="#ffe7c4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g24-cc-press" l={2} t={26} w={46} h={46} d={70}>{matrix}</V>
        <V c="g24-cc-press" l={52} t={26} w={46} h={46} d={70} st={{ transform: "scaleX(-1)" }}>{matrix}</V>
        <V c="g24-cc-twin" l={28} t={30} w={44} h={44} d={480}>{impression}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g24-hitside" l={26} t={22} w={48} h={48} d={0}>{matrix}</V>
        <L c="g24-hit2" l={38} t={38} w={24} h={24} d={150} st={{ borderRadius: "50%", background: "#ffe7c4" }} />
        <V c="g24-hit" l={28} t={26} w={44} h={44} d={250}>{impression}</V>
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(212,85,60,0.28)" />
          <Rim tone="rgba(255,231,196,0.3)" />
        </>
      }
    >
      <L c="g24-shaft" l={46} t={22} w={8} h={34} d={70} st={{ background: "linear-gradient(180deg, rgba(255,231,196,0.6), transparent)", transformOrigin: "50% 0%" }} />
      <V c="g24-cc-press" l={38} t={41} w={11} h={11} d={200}>{matrix}</V>
      <V c="g24-cc-press" l={51} t={41} w={11} h={11} d={200} st={{ transform: "scaleX(-1)" }}>{matrix}</V>
      <L c="g24-cc-wax" l={46} t={44} w={8} h={5} d={400} st={{ borderRadius: "50%", background: "#d4553c" }} />
      <V c="g24-cc-twin" l={40} t={44} w={9} h={9} d={620}>{impression}</V>
      <V c="g24-cc-twin" l={51} t={44} w={9} h={9} d={700}>{impression}</V>
      <L c="g24-cc-cord" l={44} t={52} w={13} h={1.6} d={760} st={{ borderRadius: "999px", background: "#ffe7c4", transformOrigin: "0% 50%" }} />
      <L c="g24-leanshadow" l={42} t={57} w={17} h={3} d={780} st={{ borderRadius: "999px", background: "rgba(44,20,16,0.6)" }} />
    </Lead>
  );
}

/* --- 6. Promotion Charter (t7) — THE CHARTER UNROLLED -----------------------
   The vellum runs open across the boards, its ruled lines fill in, a quill
   crosses it once, and the pendant seal drops off the edge and swings on its
   cord. Palette: #6f9fd8 / #fff4d6 / #14203a. */
function PromotionCharterScene({ role, delayMs }: SceneProps) {
  const quill = (
    <path d="M3 21C6 13 12 6.4 20.6 3c.8 8.4-4.4 15-12.4 17.4z" fill="#fff4d6" stroke="#14203a" strokeWidth="1.1" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g24-pc-unroll" l={6} t={34} w={88} h={34} d={70} st={{ background: "linear-gradient(180deg, #fff4d6, rgba(111,159,216,0.5))", transformOrigin: "0% 50%" }} />
        <V c="g24-pc-quill" l={20} t={12} w={44} h={52} d={330}>{quill}</V>
        <V c="g24-pc-pendant" l={62} t={54} w={26} h={34} d={600} st={{ transformOrigin: "50% 0%" }}>
          <circle cx="12" cy="16" r="6.4" fill="#6f9fd8" stroke="#14203a" strokeWidth="1.2" />
          <path d="M12 2v8" stroke="#fff4d6" strokeWidth="1.4" {...SJ} />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g24-hitside" l={8} t={38} w={84} h={26} d={0} st={{ background: "linear-gradient(180deg, #fff4d6, rgba(111,159,216,0.5))" }} />
        <V c="g24-hit" l={22} t={14} w={40} h={46} d={140}>{quill}</V>
        <V c="g24-hit2" l={38} t={54} w={26} h={34} d={250}><path d={PAWN} fill="#6f9fd8" /></V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(111,159,216,0.28)" />}>
      <L c="g24-shaft" l={46} t={22} w={8} h={30} d={60} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.6), transparent)", transformOrigin: "50% 0%" }} />
      <L c="g24-pc-unroll" l={36} t={42} w={28} h={12} d={160} st={{ background: "linear-gradient(180deg, #fff4d6, rgba(111,159,216,0.55))", transformOrigin: "0% 50%" }} />
      <L c="g24-pc-lines" l={38} t={45} w={24} h={6} d={380} st={{ background: "repeating-linear-gradient(180deg, rgba(20,32,58,0.7) 0 1px, transparent 1px 3px)" }} />
      <V c="g24-pc-quill" l={44} t={33} w={12} h={14} d={520}>{quill}</V>
      <V c="g24-pc-pendant" l={57} t={50} w={7} h={10} d={680} st={{ transformOrigin: "50% 0%" }}>
        <circle cx="12" cy="16" r="6.4" fill="#6f9fd8" stroke="#14203a" strokeWidth="1.2" />
        <path d="M12 2v8" stroke="#fff4d6" strokeWidth="1.4" {...SJ} />
      </V>
      <L c="g24-leanshadow" l={40} t={56} w={22} h={3} d={740} st={{ borderRadius: "999px", background: "rgba(20,32,58,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g24-pc-ink" l={45 + i * 5} t={48} w={1.4} h={1.4} d={700 + i * 90} st={{ borderRadius: "50%", background: "#14203a" }} />
      ))}
    </Lead>
  );
}

/* --- 7. Crown Malaise (t7) — THE CLOTH OF ESTATE LOWERED --------------------
   Bearers walk the cloth of estate in from the caster's own side, lower it
   over the queen until it is a sickbed curtain, and the poles droop where
   they stand. Palette: #a8c07a / #fff0cf / #1e2614. */
function CrownMalaiseScene({ role, delayMs }: SceneProps) {
  const valance = (
    <g {...SJ}>
      <path d="M1.6 4h20.8v6.4l-2.6-2-2.6 2-2.6-2-2.6 2-2.6-2-2.6 2-2.6-2z" fill="#a8c07a" stroke="#1e2614" strokeWidth="1" />
      <path d="M3.4 4V1.6h17.2V4" fill="none" stroke="#fff0cf" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g24-ml-lower" l={6} t={12} w={88} h={38} d={70}>{valance}</V>
        <V c="g24-ent-rise" l={34} t={44} w={32} h={44} d={330}><path d={QUEEN} fill="#a8c07a" /></V>
        <L c="g24-ml-curtain" l={10} t={40} w={30} h={50} d={600} st={{ background: "linear-gradient(90deg, #1e2614, rgba(30,38,20,0))", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g24-hit" l={8} t={14} w={84} h={30} d={0}>{valance}</V>
        <V c="g24-hitside" l={34} t={40} w={32} h={46} d={140}><path d={QUEEN} fill="#a8c07a" /></V>
        <L c="g24-hit2" l={20} t={44} w={60} h={40} d={250} st={{ background: "rgba(30,38,20,0.55)" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <L c="g24-veil" st={{ background: "rgba(14,18,10,0.4)" }} />
          <Wash tone="rgba(168,192,122,0.26)" d={140} />
        </>
      }
    >
      {[0, 1].map((i) => (
        <V key={i} c="g24-borne" l={40 + i * 15} t={44} w={6} h={10} d={120 + i * 90}><path d={HOOD} fill="#1e2614" stroke="#a8c07a" strokeWidth="1.1" {...SJ} /></V>
      ))}
      <V c="g24-ml-lower" l={38} t={33} w={24} h={11} d={360}>{valance}</V>
      {[0, 1].map((i) => (
        <L key={i} c="g24-ml-droop" l={39 + i * 21} t={38} w={1.6} h={16} d={560 + i * 80} st={{ background: "#a8c07a", transformOrigin: "50% 0%" }} />
      ))}
      <L c="g24-ml-curtain" l={39} t={40} w={22} h={16} d={680} st={{ background: "linear-gradient(180deg, rgba(30,38,20,0.15), rgba(30,38,20,0.8))", transformOrigin: "50% 0%" }} />
      <V c="g24-ml-dim" l={45} t={44} w={10} h={13} d={740}><path d={QUEEN} fill="#fff0cf" opacity="0.8" /></V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g24-sift" l={43 + i * 6} t={52} w={1.4} h={1.4} d={780 + i * 90} st={{ borderRadius: "50%", background: "#a8c07a" }} />
      ))}
    </Lead>
  );
}

/* --- 8. Grim Procession (t7) — THE BIER AND THE CUSHION ---------------------
   A passing bell, then the bier slides through carrying the crown on its
   velvet cushion, and the hooded ranks close in on it from every side rather
   than let it out of reach. Palette: #8f7fc0 / #fff2d8 / #1b1630. */
const GP_MOURNERS = [20, 105, 195, 285];

function GrimProcessionScene({ role, delayMs }: SceneProps) {
  const cushion = (
    <g {...SJ}>
      <path d="M2.6 9.4h18.8l-1.8 8H4.4z" fill="#8f7fc0" stroke="#1b1630" strokeWidth="1.1" />
      <path d="M3.4 17.4l-1.4 3M20.6 17.4l1.4 3" stroke="#fff2d8" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g24-gp-toll" l={22} t={22} w={56} h={56} d={70} st={{ borderRadius: "50%", border: "2px solid #8f7fc0" }} />
        <V c="g24-gp-bier" l={10} t={50} w={80} h={34} d={300}>{cushion}</V>
        <V c="g24-gp-cushion" l={32} t={22} w={36} h={34} d={620}>
          <path d={CORONET} fill="#fff2d8" stroke="#1b1630" strokeWidth="1.2" {...SJ} />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g24-hitside" l={20} t={18} w={60} h={56} d={0}><path d={HOOD} fill="#8f7fc0" /></V>
        <L c="g24-hit2" l={16} t={70} w={68} h={3} d={150} st={{ borderRadius: "999px", background: "#fff2d8" }} />
        <L c="g24-hit" l={30} t={30} w={40} h={40} d={250} st={{ borderRadius: "50%", border: "2px solid #fff2d8" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <L c="g24-veil" st={{ background: "rgba(10,8,20,0.44)" }} />
          <Wash tone="rgba(143,127,192,0.28)" d={120} />
        </>
      }
    >
      <L c="g24-gp-toll" l={36} t={36} w={28} h={28} d={80} st={{ borderRadius: "50%", border: "2px solid #8f7fc0" }} />
      <V c="g24-gp-bier" l={40} t={46} w={20} h={10} d={200}>{cushion}</V>
      <V c="g24-gp-cushion" l={45} t={39} w={10} h={9} d={360}>
        <path d={CORONET} fill="#fff2d8" stroke="#1b1630" strokeWidth="1.2" {...SJ} />
        <path d={CORONET_BAND} fill="#8f7fc0" />
      </V>
      {GP_MOURNERS.map((a, i) => (
        <P key={a} l={35} t={35} w={30} h={30} rot={`${a}deg`}>
          <V c="g24-gp-mourn" w={100} h={100} d={480 + i * 80}><path d={HOOD} fill="#1b1630" stroke="#8f7fc0" strokeWidth="1.1" {...SJ} /></V>
        </P>
      ))}
      <L c="g24-leanshadow" l={41} t={56} w={20} h={3} d={680} st={{ borderRadius: "999px", background: "rgba(27,22,48,0.68)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g24-sift" l={44 + i * 5} t={50} w={1.4} h={1.4} d={740 + i * 90} st={{ borderRadius: "50%", background: "#fff2d8" }} />
      ))}
    </Lead>
  );
}

/* --- 9. Royal Quarantine (t7) — STANCHIONS AND THE CORD ---------------------
   Four brass stanchions are thumped into the boards around the king, the cord
   of estate is clipped across them, and a warrant plaque is hung on it while
   his own people back off. Palette: #e08a3c / #fff2d8 / #2c1608. */
const RQ_POSTS: Array<[number, number]> = [[39, 39], [58, 39], [39, 55], [58, 55]];

function RoyalQuarantineScene({ role, delayMs }: SceneProps) {
  const post = (
    <g {...SJ}>
      <circle cx="12" cy="3.6" r="2.6" fill="#e08a3c" stroke="#2c1608" strokeWidth="1" />
      <path d="M12 6.2v13" stroke="#e08a3c" strokeWidth="2" />
      <path d="M7 21.4h10" stroke="#2c1608" strokeWidth="2.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g24-rq-post" l={4} t={16} w={34} h={68} d={70}>{post}</V>
        <V c="g24-rq-post" l={62} t={16} w={34} h={68} d={200}>{post}</V>
        <L c="g24-rq-cord" l={16} t={32} w={68} h={4} d={470} st={{ borderRadius: "999px", background: "#e08a3c", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g24-hitside" l={30} t={12} w={40} h={70} d={0}>{post}</V>
        <L c="g24-hit2" l={10} t={30} w={80} h={4} d={150} st={{ borderRadius: "999px", background: "#e08a3c" }} />
        <L c="g24-hit" l={40} t={54} w={20} h={20} d={250} st={{ borderRadius: "50%", background: "#fff2d8" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(224,138,60,0.28)" />}>
      <V c="g24-rq-king" l={45.5} t={44} w={9} h={12} d={80}><path d={KING} fill="none" stroke="#fff2d8" strokeWidth="1.4" {...SJ} /></V>
      {RQ_POSTS.map(([l, t], i) => (
        <V key={i} c="g24-rq-post" l={l} t={t} w={5} h={9} d={180 + i * 90}>{post}</V>
      ))}
      <L c="g24-rq-cord" l={40} t={41} w={21} h={1.6} d={520} st={{ borderRadius: "999px", background: "#e08a3c", transformOrigin: "0% 50%" }} />
      <V c="g24-rq-plaque" l={47} t={41} w={9} h={7} d={640} st={{ transformOrigin: "50% 0%" }} par="none" vb="0 0 40 24">
        <rect x="1" y="4" width="38" height="18" rx="1" fill="#2c1608" stroke="#e08a3c" strokeWidth="1.6" />
        <path d="M8 13h24" stroke="#fff2d8" strokeWidth="2.4" />
      </V>
      {[0, 1].map((i) => (
        <V key={i} c="g24-rq-back" l={35 + i * 28} t={47} w={6} h={9} d={700 + i * 80}><path d={PAWN} fill="#e08a3c" /></V>
      ))}
      <L c="g24-leanshadow" l={41} t={58} w={20} h={3} d={760} st={{ borderRadius: "999px", background: "rgba(44,22,8,0.6)" }} />
    </Lead>
  );
}

/* --- 10. Coup d'Etat (t7) — THE ORB CHANGES HANDS ---------------------------
   The king's fingers open, the orb lifts clear of them, a second palm comes
   up from the caster's own side to take it, and the sceptre follows after it
   without being asked. Palette: #b48ce0 / #fff4d6 / #221338. */
const CD_PALM = "M7.4 21.6v-9c0-1.1 1.7-1.1 1.7 0V7.4c0-1.2 1.8-1.2 1.8 0v4.2c0-1.3 1.8-1.3 1.8 0V8.2c0-1.3 1.8-1.3 1.8 0v8.4c0 3-1.8 5-4.6 5z";

function CoupDetatScene({ role, delayMs }: SceneProps) {
  const orb = (
    <g {...SJ}>
      <circle cx="12" cy="14.4" r="7" fill="#b48ce0" stroke="#221338" strokeWidth="1.2" />
      <path d="M5.4 13.4h13.2" stroke="#fff4d6" strokeWidth="1.1" />
      <path d="M12 1.6v5.6M9.6 4h4.8" stroke="#fff4d6" strokeWidth="1.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g24-cd-give" l={4} t={40} w={40} h={50} d={70}><path d={CD_PALM} fill="#221338" stroke="#b48ce0" strokeWidth="1.2" {...SJ} /></V>
        <V c="g24-cd-orb" l={32} t={16} w={36} h={44} d={330}>{orb}</V>
        <V c="g24-borne" l={56} t={40} w={40} h={50} d={600} st={{ transform: "scaleX(-1)" }}><path d={CD_PALM} fill="#221338" stroke="#fff4d6" strokeWidth="1.2" {...SJ} /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g24-hitside" l={24} t={38} w={40} h={52} d={0}><path d={CD_PALM} fill="#221338" stroke="#b48ce0" strokeWidth="1.2" {...SJ} /></V>
        <V c="g24-hit" l={32} t={12} w={38} h={44} d={150}>{orb}</V>
        <L c="g24-hit2" l={40} t={20} w={20} h={20} d={260} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.8), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(180,140,224,0.3)" />
          <Rim tone="rgba(255,244,214,0.3)" />
        </>
      }
    >
      <L c="g24-shaft" l={46} t={22} w={8} h={32} d={60} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.62), transparent)", transformOrigin: "50% 0%" }} />
      <V c="g24-cd-give" l={38} t={44} w={9} h={12} d={180}><path d={CD_PALM} fill="#221338" stroke="#b48ce0" strokeWidth="1.2" {...SJ} /></V>
      <V c="g24-cd-orb" l={43} t={36} w={9} h={11} d={340}>{orb}</V>
      <V c="g24-borne" l={52} t={44} w={9} h={12} d={420} st={{ transform: "scaleX(-1)" }}><path d={CD_PALM} fill="#221338" stroke="#fff4d6" strokeWidth="1.2" {...SJ} /></V>
      <L c="g24-cd-settle" l={52} t={40} w={9} h={9} d={620} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.85), transparent 68%)" }} />
      <V c="g24-cd-sceptre" l={49} t={33} w={5} h={16} d={720}>
        <path d="M12 22V8" stroke="#b48ce0" strokeWidth="2.2" {...SJ} />
        <path d="M12 1.8l3.2 3.6L12 9 8.8 5.4z" fill="#fff4d6" stroke="#221338" strokeWidth="1" {...SJ} />
      </V>
      <L c="g24-glint" l={54} t={38} w={2.4} h={2.4} d={780} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 11. Promotion Jubilee (t7) — THREE LESSER CORONETS ---------------------
   The cushion is carried out from the caster's own back rank bearing a rook's
   mural crown, a mitre and a knight's crest; one of the three is taken and
   the other two are covered again. Palette: #e8a08a / #fff2d8 / #2e1a14. */
function PromotionJubileeScene({ role, delayMs }: SceneProps) {
  const mural = (
    <path d="M3.6 20V8h2.6V5h3v3h2.8V5h3v3h2.6v12z" fill="#e8a08a" stroke="#2e1a14" strokeWidth="1.1" {...SJ} />
  );
  const mitre = (
    <path d="M12 2.6c3 3.4 5 7.4 5 11.4v6H7v-6c0-4 2-8 5-11.4z" fill="#fff2d8" stroke="#2e1a14" strokeWidth="1.1" {...SJ} />
  );
  const crest = (
    <path d="M5 20v-6c0-3.6 2.6-6.4 5.4-7.4l-.8-2.8 3.4 1.4c2.4 1 3.6 3.4 3.6 6.8V20z" fill="#e8a08a" stroke="#2e1a14" strokeWidth="1.1" {...SJ} />
  );
  const three = [mural, mitre, crest];
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g24-borne" l={10} t={46} w={80} h={40} d={70}>
          <path d="M2.6 9.4h18.8l-1.8 8H4.4z" fill="#2e1a14" stroke="#e8a08a" strokeWidth="1.2" {...SJ} />
        </V>
        <V c="g24-pj-set" l={12} t={12} w={30} h={40} d={330}>{mural}</V>
        <V c="g24-pj-lift" l={54} t={8} w={32} h={44} d={620}>{mitre}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g24-hitside" l={26} t={40} w={48} h={40} d={0}>
          <path d="M2.6 9.4h18.8l-1.8 8H4.4z" fill="#2e1a14" stroke="#e8a08a" strokeWidth="1.2" {...SJ} />
        </V>
        <V c="g24-hit" l={30} t={8} w={40} h={44} d={150}>{crest}</V>
        <L c="g24-hit2" l={44} t={70} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#fff2d8" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(232,160,138,0.28)" />}>
      <V c="g24-borne" l={39} t={46} w={22} h={10} d={120}>
        <path d="M2.6 9.4h18.8l-1.8 8H4.4z" fill="#2e1a14" stroke="#e8a08a" strokeWidth="1.2" {...SJ} />
        <path d="M3.4 17.4l-1.4 3M20.6 17.4l1.4 3" stroke="#fff2d8" strokeWidth="1.2" {...SJ} />
      </V>
      {three.map((art, i) => (
        <V key={i} c="g24-pj-set" l={41 + i * 7} t={39} w={7} h={9} d={300 + i * 110}>{art}</V>
      ))}
      <V c="g24-pj-lift" l={48} t={31} w={8} h={10} d={620}>{mitre}</V>
      <L c="g24-pj-dim" l={40} t={38} w={8} h={11} d={700} st={{ background: "rgba(46,26,20,0.68)" }} />
      <L c="g24-pj-tassel" l={40} t={53} w={1.6} h={6} d={740} st={{ background: "#fff2d8", transformOrigin: "50% 0%" }} />
      <L c="g24-glint" l={52} t={34} w={2.4} h={2.4} d={780} st={{ borderRadius: "50%", background: "#fff2d8" }} />
    </Lead>
  );
}

/* --- 12. Puppet Coronation (t7) — THE CONTROL BAR ---------------------------
   A marionette control bar comes down over the enemy queen, three strings go
   taut, a paper crown is dropped on her and she is walked sideways down the
   chosen line before the strings go slack again. Aim-staged. Palette:
   #b8c8d8 / #fff4d6 / #1c2430. */
function PuppetCoronationScene({ role, delayMs }: SceneProps) {
  const bar = (
    <g {...SJ}>
      <path d="M2 8h20" stroke="#b8c8d8" strokeWidth="2.6" />
      <path d="M12 4v9" stroke="#b8c8d8" strokeWidth="2.2" />
      <circle cx="12" cy="3.4" r="1.8" fill="#fff4d6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g24-pk-bar" l={16} t={6} w={68} h={34} d={70}>{bar}</V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g24-pk-string" l={30 + i * 20} t={34} w={1.6} h={34} d={300 + i * 70} st={{ background: "#b8c8d8", transformOrigin: "50% 0%" }} />
        ))}
        <V c="g24-pk-crown" l={32} t={54} w={36} h={30} d={620}>
          <path d={CORONET} fill="#fff4d6" stroke="#1c2430" strokeWidth="1.2" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g24-hit" l={20} t={2} w={60} h={32} d={0}>{bar}</V>
        <L c="g24-hit2" l={48} t={26} w={2} h={38} d={150} st={{ background: "#b8c8d8" }} />
        <V c="g24-hitside" l={34} t={48} w={32} h={42} d={250}><path d={QUEEN} fill="#b8c8d8" /></V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(184,200,216,0.26)" />}>
      <L c="g24-runout" l={45} t={51} w={30} h={1.8} d={100} st={{ background: "linear-gradient(90deg, #b8c8d8, rgba(184,200,216,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g24-pk-bar" l={41} t={30} w={16} h={9} d={200}>{bar}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g24-pk-string" l={44 + i * 4} t={37} w={0.8} h={11} d={300 + i * 70} st={{ background: "#b8c8d8", transformOrigin: "50% 0%" }} />
      ))}
      <V c="g24-pk-crown" l={45} t={40} w={9} h={7} d={460}>
        <path d={CORONET} fill="#fff4d6" stroke="#1c2430" strokeWidth="1.2" {...SJ} />
      </V>
      <V c="g24-pk-march" l={45} t={44} w={10} h={13} d={620}><path d={QUEEN} fill="#b8c8d8" stroke="#1c2430" strokeWidth="1" {...SJ} /></V>
      <L c="g24-pk-slack" l={47} t={37} w={0.8} h={11} d={760} st={{ background: "#fff4d6", transformOrigin: "50% 0%" }} />
    </AimLead>
  );
}

/* --- 13. Crowned Strider (t6) — THE SPURS BUCKLED ON ------------------------
   A boot is set forward, the golden spur is strapped to the heel, the rowel
   spins once, and two long prints are left down the line he means to take.
   Aim-staged. Palette: #c98a4a / #ffeccd / #2a1a0e. */
function CrownedStriderScene({ role, delayMs }: SceneProps) {
  const boot = (
    <g {...SJ}>
      <path d="M6 2.6h6.4v11.8H20V21H6z" fill="#2a1a0e" stroke="#c98a4a" strokeWidth="1.2" />
      <path d="M6 15.4h6.4" stroke="#c98a4a" strokeWidth="1" />
    </g>
  );
  const rowel = (
    <path d="M12 3l2 5.4 5.4-1.4-3.6 4.4 3.6 4.4-5.4-1.4L12 21l-2-5.6-5.4 1.4L8.2 12 4.6 7.6 10 9z" fill="#ffeccd" stroke="#2a1a0e" strokeWidth="1" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g24-cs-boot" l={8} t={26} w={54} h={54} d={70}>{boot}</V>
        <L c="g24-cs-strap" l={12} t={54} w={44} h={5} d={330} st={{ borderRadius: "999px", background: "#c98a4a", transformOrigin: "0% 50%" }} />
        <V c="g24-cs-rowel" l={58} t={50} w={34} h={34} d={600}>{rowel}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g24-hitside" l={14} t={22} w={50} h={54} d={0}>{boot}</V>
        <V c="g24-hit" l={56} t={46} w={32} h={32} d={150}>{rowel}</V>
        <L c="g24-hit2" l={10} t={80} w={70} h={4} d={250} st={{ borderRadius: "999px", background: "#c98a4a" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(201,138,74,0.26)" />}>
      <L c="g24-runout" l={45} t={53} w={30} h={2.2} d={90} st={{ background: "linear-gradient(90deg, #c98a4a, rgba(201,138,74,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g24-cs-boot" l={41} t={41} w={11} h={14} d={180}>{boot}</V>
      <L c="g24-cs-strap" l={41} t={49} w={11} h={1.6} d={360} st={{ borderRadius: "999px", background: "#c98a4a", transformOrigin: "0% 50%" }} />
      <V c="g24-cs-rowel" l={50} t={47} w={6} h={6} d={520}>{rowel}</V>
      {[0, 1].map((i) => (
        <L key={i} c="g24-cs-stride" l={54 + i * 8} t={52} w={5} h={2} d={620 + i * 140} st={{ borderRadius: "999px", background: "rgba(42,26,14,0.66)" }} />
      ))}
      {[0, 1, 2].map((i) => (
        <L key={i} c="g24-sift" l={52 + i * 6} t={50} w={1.4} h={1.4} d={760 + i * 80} st={{ borderRadius: "50%", background: "#ffeccd" }} />
      ))}
    </AimLead>
  );
}

/* --- 14. Royal Banquet (t6) — THREE CLOCHES ---------------------------------
   The cloth snaps out over the boards, three covered dishes are set down in a
   row, and all three lids come off together with the steam still rising off
   what is under them. Palette: #cfd6dd / #fff4d6 / #241a20. */
const RB_SPOTS = [40, 48.5, 57];

function RoyalBanquetScene({ role, delayMs }: SceneProps) {
  const dome = (
    <g {...SJ}>
      <path d="M2.6 19.4C2.6 12.4 6.8 7 12 7s9.4 5.4 9.4 12.4z" fill="#cfd6dd" stroke="#241a20" strokeWidth="1.1" />
      <circle cx="12" cy="4.8" r="1.8" fill="#fff4d6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g24-rb-cloth" l={4} t={56} w={92} h={26} d={70} st={{ background: "linear-gradient(180deg, #fff4d6, rgba(207,214,221,0.4))", transformOrigin: "0% 50%" }} />
        <V c="g24-rb-set" l={26} t={22} w={48} h={44} d={330}>{dome}</V>
        <L c="g24-rb-steam" l={46} t={4} w={5} h={20} d={620} st={{ borderRadius: "999px", background: "linear-gradient(180deg, transparent, #fff4d6)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g24-hitside" l={6} t={62} w={88} h={12} d={0} st={{ background: "linear-gradient(180deg, #fff4d6, rgba(207,214,221,0.4))" }} />
        <V c="g24-hit" l={28} t={22} w={44} h={44} d={150}>{dome}</V>
        <L c="g24-hit2" l={46} t={6} w={6} h={18} d={260} st={{ borderRadius: "999px", background: "linear-gradient(180deg, transparent, #fff4d6)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(207,214,221,0.26)" />}>
      <L c="g24-rb-cloth" l={37} t={50} w={28} h={5} d={100} st={{ background: "linear-gradient(180deg, #fff4d6, rgba(207,214,221,0.4))", transformOrigin: "0% 50%" }} />
      {RB_SPOTS.map((l, i) => (
        <V key={i} c="g24-rb-set" l={l} t={42} w={7} h={9} d={260 + i * 110}>{dome}</V>
      ))}
      {RB_SPOTS.map((l, i) => (
        <V key={i} c="g24-rb-lift" l={l} t={40} w={7} h={7} d={520 + i * 90}>
          <path d="M2.6 19.4C2.6 12.4 6.8 7 12 7s9.4 5.4 9.4 12.4z" fill="#fff4d6" stroke="#241a20" strokeWidth="1.1" {...SJ} />
        </V>
      ))}
      {RB_SPOTS.map((l, i) => (
        <L key={i} c="g24-rb-steam" l={l + 2.6} t={35} w={1.6} h={8} d={680 + i * 90} st={{ borderRadius: "999px", background: "linear-gradient(180deg, transparent, #fff4d6)" }} />
      ))}
      <L c="g24-leanshadow" l={38} t={54} w={26} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(36,26,32,0.6)" }} />
      <L c="g24-glint" l={53} t={38} w={2.4} h={2.4} d={760} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 15. Royal Barge (t6) — THE STANDARD BROKEN OUT -------------------------
   The gilded barge slides in along the water, the oars dip together, the
   royal standard is broken out at the masthead and the boarding plank comes
   down on the far bank. Aim-staged. Palette: #6fc0a8 / #fff4d6 / #12302a. */
function RoyalBargeScene({ role, delayMs }: SceneProps) {
  const hull = (
    <g {...SJ}>
      <path d="M1.6 13h20.8l-3.4 6.4H5z" fill="#6fc0a8" stroke="#12302a" strokeWidth="1.2" />
      <path d="M12 13V3.4" stroke="#12302a" strokeWidth="1.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g24-bg-glide" l={6} t={40} w={72} h={44} d={70}>{hull}</V>
        <V c="g24-bg-standard" l={44} t={6} w={40} h={30} d={330} st={{ transformOrigin: "0% 50%" }}>
          <path d="M2 3h18l-3.6 5.4L20 14H2z" fill="#fff4d6" stroke="#12302a" strokeWidth="1.1" />
        </V>
        <L c="g24-bg-wake" l={4} t={78} w={80} h={4} d={620} st={{ borderRadius: "999px", background: "linear-gradient(90deg, transparent, #6fc0a8)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g24-hitside" l={12} t={38} w={70} h={44} d={0}>{hull}</V>
        <L c="g24-hit2" l={8} t={76} w={80} h={4} d={150} st={{ borderRadius: "999px", background: "#6fc0a8" }} />
        <V c="g24-hit" l={38} t={8} w={40} h={30} d={250}>
          <path d="M2 3h18l-3.6 5.4L20 14H2z" fill="#fff4d6" />
        </V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(111,192,168,0.26)" />}>
      <L c="g24-runout" l={44} t={54} w={30} h={2} d={80} st={{ background: "linear-gradient(90deg, #6fc0a8, rgba(111,192,168,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g24-bg-glide" l={40} t={44} w={18} h={12} d={200}>{hull}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g24-bg-oar" l={42 + i * 5} t={50} w={4.4} h={1.4} d={340 + i * 80} st={{ borderRadius: "999px", background: "#12302a", transformOrigin: "0% 50%" }} />
      ))}
      <V c="g24-bg-standard" l={48} t={35} w={8} h={6} d={560} st={{ transformOrigin: "0% 50%" }}>
        <path d="M2 3h18l-3.6 5.4L20 14H2z" fill="#fff4d6" stroke="#12302a" strokeWidth="1.1" {...SJ} />
      </V>
      <L c="g24-bg-plank" l={57} t={51} w={9} h={1.8} d={680} st={{ background: "#fff4d6", transformOrigin: "0% 50%" }} />
      <L c="g24-bg-wake" l={36} t={56} w={22} h={1.6} d={740} st={{ borderRadius: "999px", background: "linear-gradient(90deg, transparent, #6fc0a8)" }} />
    </AimLead>
  );
}

/* --- 16. Rusted Crown (t6) — THE ARCHES SEIZE -------------------------------
   The arches try to close over the cap, rust blooms out along the band, the
   hinge grinds exactly one notch and stops dead; a drop of oil arrives far
   too late. Palette: #a35f34 / #ffe7c4 / #241208. */
function RustedCrownScene({ role, delayMs }: SceneProps) {
  const arches = (
    <g fill="none" stroke="#a35f34" strokeWidth="2" {...SJ}>
      <path d="M3 20C3 11 7 5 12 5s9 6 9 15" />
      <path d="M12 5V1.8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g24-rc-arch" l={14} t={10} w={72} h={54} d={70}>{arches}</V>
        <L c="g24-rc-rust" l={14} t={58} w={72} h={10} d={330} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #a35f34, #ffe7c4)", transformOrigin: "0% 50%" }} />
        <L c="g24-rc-flake" l={46} t={72} w={5} h={5} d={620} st={{ background: "#a35f34" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g24-hit" l={16} t={12} w={68} h={52} d={0}>{arches}</V>
        <L c="g24-hitside" l={16} t={60} w={68} h={8} d={150} st={{ borderRadius: "999px", background: "#a35f34" }} />
        <L c="g24-hit2" l={44} t={72} w={6} h={6} d={260} st={{ background: "#ffe7c4" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(163,95,52,0.28)" />}>
      <V c="g24-rc-arch" l={43} t={35} w={14} h={12} d={120}>{arches}</V>
      <L c="g24-rc-rust" l={43} t={46} w={14} h={2.6} d={320} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #a35f34, #ffe7c4)", transformOrigin: "0% 50%" }} />
      <V c="g24-rc-notch" l={45} t={41} w={10} h={10} d={500} st={{ transformOrigin: "50% 90%" }}>
        <path d="M12 3.6l1.6 3.2 3.6.4-2.6 2.6.8 3.6L12 11.6 8.6 13.4l.8-3.6L6.8 7.2l3.6-.4z" fill="#ffe7c4" />
      </V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g24-rc-flake" l={44 + i * 5} t={49} w={1.8} h={1.4} d={620 + i * 80} st={{ background: "#a35f34" }} />
      ))}
      <L c="g24-rc-drip" l={52} t={33} w={1.6} h={7} d={720} st={{ borderRadius: "999px", background: "#ffe7c4", transformOrigin: "50% 0%" }} />
      <L c="g24-leanshadow" l={42} t={54} w={18} h={3} d={760} st={{ borderRadius: "999px", background: "rgba(36,18,8,0.62)" }} />
    </Lead>
  );
}

/* --- 17. Royal Incognito (t5) — THE CROWN GOES IN THE HATBOX ----------------
   The crown is lifted off, dropped in the box and the lid put on; smoked
   glasses slide down, a travelling brim tips forward, and his own people bow
   anyway from behind him. Palette: #5f7fa8 / #fff4d6 / #131c2a. */
function RoyalIncognitoScene({ role, delayMs }: SceneProps) {
  const shades = (
    <path d="M2.4 8.4h19.2v2.2h-1.4c-.4 3.4-1.8 5-4.4 5s-3.6-1.6-3.8-4.4h-.2c-.2 2.8-1.2 4.4-3.8 4.4s-4-1.6-4.4-5H2.4z" fill="#131c2a" stroke="#fff4d6" strokeWidth="0.9" {...SJ} />
  );
  const box = (
    <g {...SJ}>
      <path d="M4 10h16v10H4z" fill="#5f7fa8" stroke="#131c2a" strokeWidth="1.2" />
      <path d="M3 7.6h18V10H3z" fill="#fff4d6" stroke="#131c2a" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g24-ri-doff" l={28} t={6} w={44} h={36} d={70}>
          <path d={CORONET} fill="#5f7fa8" stroke="#131c2a" strokeWidth="1.2" {...SJ} />
        </V>
        <V c="g24-ri-box" l={22} t={44} w={56} h={44} d={330}>{box}</V>
        <V c="g24-ri-shades" l={20} t={24} w={60} h={30} d={620}>{shades}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g24-hit" l={24} t={28} w={52} h={28} d={0}>{shades}</V>
        <V c="g24-hitside" l={30} t={44} w={40} h={44} d={150}><path d={KING} fill="#5f7fa8" /></V>
        <L c="g24-hit2" l={40} t={20} w={20} h={5} d={260} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(95,127,168,0.26)" />}>
      <V c="g24-ri-doff" l={45} t={31} w={10} h={9} d={120}>
        <path d={CORONET} fill="#5f7fa8" stroke="#131c2a" strokeWidth="1.2" {...SJ} />
      </V>
      <V c="g24-ri-box" l={51} t={44} w={11} h={10} d={340}>{box}</V>
      <V c="g24-ri-shades" l={43} t={41} w={11} h={6} d={520}>{shades}</V>
      <L c="g24-ri-brim" l={41} t={38} w={15} h={2.2} d={640} st={{ borderRadius: "999px", background: "#131c2a", transformOrigin: "50% 100%" }} />
      {[0, 1].map((i) => (
        <V key={i} c="g24-borne" l={37 + i * 24} t={47} w={6} h={9} d={720 + i * 70}><path d={PAWN} fill="#5f7fa8" /></V>
      ))}
      <L c="g24-glint" l={50} t={42} w={2.2} h={2.2} d={780} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 18. Royal Escort (t5) — THE CHAIN OF OFFICE CLIPPED --------------------
   Links are laid out between the queen and the nearest tower, the clip closes
   on the tower's ring, and the first time she walks too far the chain comes
   up taut and pulls her back. Aim-staged. Palette: #d8b45a / #fff4d6 /
   #14241c. */
function RoyalEscortScene({ role, delayMs }: SceneProps) {
  const link = <circle cx="12" cy="12" r="7.4" fill="none" stroke="#d8b45a" strokeWidth="3.4" />;
  const halberd = (
    <g {...SJ}>
      <path d="M12 22V4" stroke="#14241c" strokeWidth="1.8" />
      <path d="M12 2.4l4.4 3.2-4.4 3.2z" fill="#fff4d6" stroke="#14241c" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        {[0, 1, 2].map((i) => (
          <V key={i} c="g24-re-link" l={10 + i * 24} t={38} w={26} h={26} d={70 + i * 120}>{link}</V>
        ))}
        <V c="g24-re-clip" l={64} t={30} w={34} h={40} d={430}><path d={TOWER} fill="#d8b45a" stroke="#14241c" strokeWidth="1" {...SJ} /></V>
        <V c="g24-re-halberd" l={2} t={16} w={26} h={70} d={640}>{halberd}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g24-hitside" l={8} t={34} w={34} h={34} d={0}>{link}</V>
        <V c="g24-hit" l={52} t={26} w={40} h={48} d={150}><path d={TOWER} fill="#d8b45a" /></V>
        <L c="g24-hit2" l={16} t={48} w={64} h={3} d={260} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(216,180,90,0.26)" />}>
      <L c="g24-runout" l={45} t={48.8} w={30} h={2} d={90} st={{ background: "linear-gradient(90deg, #d8b45a, rgba(216,180,90,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      {[0, 1, 2, 3].map((i) => (
        <V key={i} c="g24-re-link" l={46 + i * 4.4} t={46} w={5} h={5} d={240 + i * 70}>{link}</V>
      ))}
      <V c="g24-re-clip" l={63} t={43} w={9} h={11} d={480}><path d={TOWER} fill="#d8b45a" stroke="#14241c" strokeWidth="1" {...SJ} /></V>
      <V c="g24-re-tug" l={42} t={43} w={10} h={13} d={620}><path d={QUEEN} fill="#fff4d6" stroke="#14241c" strokeWidth="1" {...SJ} /></V>
      <V c="g24-re-halberd" l={39} t={38} w={6} h={16} d={720}>{halberd}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g24-sift" l={48 + i * 6} t={52} w={1.4} h={1.4} d={780 + i * 80} st={{ borderRadius: "50%", background: "#d8b45a" }} />
      ))}
    </AimLead>
  );
}

/* --- 19. Summons to Court (t5) — THE SCEPTRE GROUNDED ONCE ------------------
   The sceptre is lifted and grounded once on the flagstone. The stone takes
   it, the ring of it runs out through the floor, and every courtier in the
   hall stops exactly where they stand. Palette: #b8b0a0 / #fff4d6 / #22201a. */
const SC_STILL = [40, 130, 220, 310];

function SummonsToCourtScene({ role, delayMs }: SceneProps) {
  const sceptre = (
    <g {...SJ}>
      <path d="M12 22V8.4" stroke="#b8b0a0" strokeWidth="2.4" />
      <path d="M12 1.4l3.4 3.8L12 9 8.6 5.2z" fill="#fff4d6" stroke="#22201a" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g24-sc-strike" l={34} t={4} w={32} h={72} d={70} st={{ transformOrigin: "50% 100%" }}>{sceptre}</V>
        <L c="g24-sc-stone" l={16} t={72} w={68} h={12} d={330} st={{ background: "#b8b0a0" }} />
        <L c="g24-sc-shock" l={20} t={62} w={60} h={26} d={620} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g24-hit" l={36} t={4} w={28} h={66} d={0}>{sceptre}</V>
        <L c="g24-hit2" l={18} t={62} w={64} h={24} d={150} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
        <V c="g24-hitside" l={54} t={44} w={32} h={44} d={250}><path d={PAWN} fill="#b8b0a0" /></V>
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(184,176,160,0.26)" />
          <Rim tone="rgba(255,244,214,0.3)" />
        </>
      }
    >
      <L c="g24-shaft" l={46} t={20} w={8} h={34} d={60} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.6), transparent)", transformOrigin: "50% 0%" }} />
      <V c="g24-sc-strike" l={45} t={32} w={7} h={20} d={160} st={{ transformOrigin: "50% 100%" }}>{sceptre}</V>
      <L c="g24-sc-stone" l={42} t={51} w={16} h={4} d={460} st={{ background: "#b8b0a0" }} />
      <L c="g24-sc-shock" l={38} t={46} w={24} h={14} d={520} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      {SC_STILL.map((a, i) => (
        <P key={a} l={36} t={36} w={28} h={28} rot={`${a}deg`}>
          <V c="g24-sc-still" w={100} h={100} d={600 + i * 70}><path d={PAWN} fill="#b8b0a0" /></V>
        </P>
      ))}
      <L c="g24-leanshadow" l={42} t={56} w={18} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(34,32,26,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g24-sift" l={44 + i * 6} t={50} w={1.4} h={1.4} d={760 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 20. Off-Broadway Queen (t5) — THE PASTE TIARA --------------------------
   House lights out, one work light on, a taped X on the deck. The understudy
   stands on her mark, the paste tiara is pinned on out of the props tray, and
   the curtain edge twitches. Palette: #ff9fc0 / #fff2d8 / #2c1424. */
function OffBroadwayQueenScene({ role, delayMs }: SceneProps) {
  const tiara = (
    <g {...SJ}>
      <path d="M3.4 18.6l-1-8 4.6 3L12 6.4l5 7.2 4.6-3-1 8z" fill="#ff9fc0" stroke="#2c1424" strokeWidth="1.1" />
      <circle cx="12" cy="10.6" r="1.4" fill="#fff2d8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g24-ob-tape" l={30} t={58} w={40} h={26} d={70} st={{ background: "linear-gradient(90deg, transparent 44%, #fff2d8 44% 56%, transparent 56%)" }} />
        <V c="g24-ob-tiara" l={28} t={16} w={44} h={40} d={330}>{tiara}</V>
        <L c="g24-ob-curtain" l={0} t={0} w={26} h={100} d={620} st={{ background: "linear-gradient(90deg, #2c1424, rgba(44,20,36,0))", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g24-hit" l={30} t={14} w={40} h={36} d={0}>{tiara}</V>
        <V c="g24-hitside" l={34} t={42} w={32} h={46} d={150}><path d={PAWN} fill="#ff9fc0" /></V>
        <L c="g24-hit2" l={32} t={78} w={36} h={4} d={260} st={{ background: "#fff2d8" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <L c="g24-veil" st={{ background: "rgba(12,6,14,0.46)" }} />
          <Wash tone="rgba(255,159,192,0.26)" d={140} />
        </>
      }
    >
      <L c="g24-shaft" l={43} t={18} w={14} h={40} d={80} st={{ background: "linear-gradient(180deg, rgba(255,242,216,0.7), transparent)", transformOrigin: "50% 0%" }} />
      <L c="g24-ob-tape" l={44} t={52} w={12} h={5} d={220} st={{ background: "linear-gradient(90deg, transparent 42%, #fff2d8 42% 58%, transparent 58%)" }} />
      <V c="g24-ob-tiara" l={45} t={36} w={10} h={8} d={420}>{tiara}</V>
      <V c="g24-ob-stand" l={45} t={42} w={10} h={13} d={580}><path d={QUEEN} fill="#ff9fc0" stroke="#2c1424" strokeWidth="1" {...SJ} /></V>
      <L c="g24-ob-curtain" l={33} t={30} w={9} h={30} d={700} st={{ background: "linear-gradient(90deg, #2c1424, rgba(44,20,36,0))", transformOrigin: "0% 50%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g24-sift" l={44 + i * 5} t={38} w={1.4} h={1.4} d={760 + i * 80} st={{ borderRadius: "50%", background: "#fff2d8" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   Registry. Every entry declares an anchor; every `sound` is an existing
   SigSoundKey. `source` is deliberately omitted throughout: these plays leave
   their persistent state to the card's own zone overlay, so the scene is the
   cast lead on the square it was played on.
   ========================================================================== */

/** Bind one bespoke scene to its config. */
function S(Render: SigPlugin["Render"], config: SigPlugin["config"]): SigPlugin {
  return { config, Render };
}

export const PLAYS: Record<string, SigPlugin> = {
  bn4_ascension_small: S(AscensionSmallScene, { ordering: "radial", staggerMs: 0, victims: ["n", "b"], hasLead: true, sound: "coronation", anchor: "cast" }),
  bn4_crown_of_masks: S(CrownOfMasksScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "crownrain", anchor: "board" }),
  hx4_crown_of_lead: S(CrownOfLeadScene, { ordering: "radial", staggerMs: 60, victims: ["k"], hasLead: true, sound: "colossus", anchor: "board" }),
  ov_crown_of_the_undying: S(CrownOfTheUndyingScene, { ordering: "octagon", staggerMs: 55, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }),
  bn4_crown_commission: S(CrownCommissionScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "vault", anchor: "board" }),
  bn4_promotion_charter: S(PromotionCharterScene, { ordering: "file", staggerMs: 80, victims: ["p"], hasLead: true, sound: "coronation", anchor: "cast" }),
  hx4_crown_malaise: S(CrownMalaiseScene, { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "cathedral", anchor: "board" }),
  hx4_grim_procession: S(GrimProcessionScene, { ordering: "radial", staggerMs: 70, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }),
  hx4_royal_quarantine: S(RoyalQuarantineScene, { ordering: "octagon", staggerMs: 60, victims: ["k"], hasLead: true, sound: "wall", anchor: "board" }),
  ov_coup_detat: S(CoupDetatScene, { ordering: "radial", staggerMs: 0, victims: ["k", "q"], hasLead: true, sound: "coronation", anchor: "cast" }),
  ov_promotion_jubilee: S(PromotionJubileeScene, { ordering: "file", staggerMs: 90, victims: ["p"], hasLead: true, sound: "crownrain", anchor: "cast" }),
  ov_puppet_coronation: S(PuppetCoronationScene, { ordering: "line", staggerMs: 60, victims: ["q"], hasLead: true, sound: "coronation", anchor: "aim" }),
  bn4_crowned_strider: S(CrownedStriderScene, { ordering: "line", staggerMs: 70, victims: ["k"], hasLead: true, sound: "colossus", anchor: "aim" }),
  bn4_royal_banquet: S(RoyalBanquetScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain", anchor: "board" }),
  bn4_royal_barge: S(RoyalBargeScene, { ordering: "line", staggerMs: 60, victims: ["q"], hasLead: true, sound: "coronation", anchor: "aim" }),
  hx4_rusted_crown: S(RustedCrownScene, { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "wall", anchor: "board" }),
  bn4_royal_incognito: S(RoyalIncognitoScene, { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "vault", anchor: "cast" }),
  hx4_royal_escort: S(RoyalEscortScene, { ordering: "line", staggerMs: 65, victims: ["q", "r"], hasLead: true, sound: "wall", anchor: "aim" }),
  hx4_summons_to_court: S(SummonsToCourtScene, { ordering: "radial", staggerMs: 65, victims: "all", hasLead: true, sound: "colossus", anchor: "board" }),
  ov_off_broadway_queen: S(OffBroadwayQueenScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "crownrain", anchor: "cast" }),
};
