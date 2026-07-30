// g26ShieldPlays — bespoke plays for the 32 protection / warding cards that
// used to share the generated `shieldDome` family (one dome, 32 hue shifts).
//
// MODULE FICTION: protection made PHYSICAL. Never a dome. Every card is a
// different protective THING arriving: a cathedral vault closing overhead, a
// portcullis dropping, chalk igniting on the boards, boundary stones thumping
// in, a bell of silence, an ancestor stepping in front, a wax seal hardening,
// a velvet gallery rope clipping across, a wedge kicked under a door.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g26ShieldPlays.css), transform/opacity animations only, no imports from
// BoardEffects.tsx, only the SigPlugin/SigRole TYPES from sigPlugins.tsx.
//
// STAGING. Every card declares anchor "cast" or "aim", so the scene happens on
// the square the card was played on. Board-scale layers (washes, edge gilt,
// horizon rails) live inside <BoardFrame>, never at a fixed percentage of the
// stage. Aim-flavoured cards (a wall running from source to target, a lamp
// beam, a line of cones) use <AimStage> and author their art pointing RIGHT.
//
// Every scene runs three beats — tell, strike, settle — in all three roles
// ("lead", "target", "entrance"), and every lead carries at least one animated
// layer driven by the geometry vars (--fx-ox/--fx-oy lean, --fx-side arrival,
// --fx-len run length), which is what makes the play directional rather than
// decorative. All CSS lives in g26ShieldPlays.css behind the `g26-` prefix.

import "./g26ShieldPlays.css";

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
const rootStyle = (d: number): CSSProperties => ({ "--g26-d": `${d}ms` }) as CSSProperties;

/** stagger + a beat offset, scaled by the Settings animation-speed var. */
const b = (ms: number): string => `calc(var(--g26-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

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
  return <L c="g26-wash" d={d} st={{ background: `radial-gradient(circle at 50% 48%, ${tone}, transparent 70%)` }} />;
}

/** Board-edge gilt, always inside a BoardFrame. */
function Rim({ tone, d = 160 }: { tone: string; d?: number }) {
  return <L c="g26-rim" d={d} st={{ boxShadow: `inset 0 0 30px 9px ${tone}` }} />;
}

/* Piece silhouettes: bystanders the protective object is put around. */
const PAWN = "M12 4.4a2.7 2.7 0 0 1 1.6 4.9l1.8 6.4H8.6l1.8-6.4A2.7 2.7 0 0 1 12 4.4z M7.4 16.8h9.2V19.4H7.4z";
const KING = "M11.1 2.4h1.8v1.5h1.5v1.8h-1.5v1.6h-1.8V5.7H9.6V3.9h1.5zM8 9.2h8l-1.1 7.4H9.1zM7.2 17.6h9.6V20H7.2z";
const KNIGHT = "M8.2 19V13c0-3.8 2.5-5.9 4.6-6.5L12 4.2l3 1.2c2 .9 2.9 2.9 2.9 5.9V19z";
const ROOK = "M7 4.8h2.3v1.6h1.6V4.8h2.2v1.6h1.6V4.8H17v3.6h-1.2v6.8H17V19H7v-3.8h1.2V8.4H7z";
const QUEEN = "M6.4 6l1.3 3.2L9.4 6.6 12 9.4l2.6-2.8 1.7 2.6L17.6 6l-1 10.4H7.4zM7 17.4h10v2.4H7z";

/* --- 1. Age of Peace (t8) — THE PEACE VAULT ---------------------------------
   Four stone ribs swing overhead and interlock, a keystone drops into the
   crown, a dove settles on it and an olive sprig opens while dust sifts from
   the seams. Palette: #f0d089 / #fff4d6 / #2a2415. */
const AO_RIB = "M2 22C2 11.5 6.6 4 12 4s10 7.5 10 18";

function AgeOfPeaceScene({ role, delayMs }: SceneProps) {
  const keystone = <path d="M5 20h14l-2.6-15H7.6z" fill="#fff4d6" stroke="#2a2415" strokeWidth="1.2" {...SJ} />;
  const dove = (
    <path
      d="M3 14.4c4.4 1.2 7.6-.9 9.4-5.3 1.2 3.5 4.4 5.1 9.6 4.1-3.2 4.4-8.4 7.2-13.4 6-3.2-.8-5.4-2.4-5.6-4.8z"
      fill="#fff4d6"
    />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g26-ao-rib" l={10} t={26} w={80} h={58} d={40}><path d={AO_RIB} fill="none" stroke="#f0d089" strokeWidth="2.2" {...SJ} /></V>
        <V c="g26-ao-key" l={40} t={32} w={20} h={20} d={280}>{keystone}</V>
        <V c="g26-ent-mote" l={34} t={10} w={32} h={32} d={470}>{dove}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hit" l={8} t={18} w={84} h={62} d={0}><path d={AO_RIB} fill="none" stroke="#f0d089" strokeWidth="2.4" {...SJ} /></V>
        <V c="g26-hitside" l={38} t={30} w={24} h={24} d={110}>{keystone}</V>
        <L c="g26-hit2" l={46} t={70} w={8} h={8} d={230} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(240,208,137,0.3)" />
          <Rim tone="rgba(255,244,214,0.4)" />
        </>
      }
    >
      {[0, 1, 2, 3].map((i) => (
        <P key={i} l={25} t={25} w={50} h={50} rot={`${i * 90}deg`}>
          <V c="g26-ao-rib" d={120 + i * 80}><path d={AO_RIB} fill="none" stroke="#f0d089" strokeWidth="1.9" {...SJ} /></V>
        </P>
      ))}
      <L c="g26-shaft" l={45} t={20} w={10} h={40} d={520} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.68), transparent)", transformOrigin: "50% 0%" }} />
      <V c="g26-ao-key" l={44.5} t={39} w={11} h={11} d={470}>{keystone}</V>
      <V c="g26-ao-dove" l={45} t={31} w={10} h={10} d={640}>{dove}</V>
      <V c="g26-ao-olive" l={52} t={45} w={12} h={12} d={760}>
        <g fill="none" stroke="#f0d089" strokeWidth="1.5" {...SJ}>
          <path d="M3.5 20.5C8 16 14 12 20.5 11" />
          <path d="M11 15.4c-1.2-2 0-4.2 2.2-4.4M16 12.2c-1.2-2 0-4.2 2.2-4.4" />
        </g>
      </V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g26-sift" l={41 + i * 7} t={43} w={1.5} h={1.5} d={720 + i * 120} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 2. Guardian of the Line (t8) — THE SHIELD WALL -------------------------
   Tower shields slam down in a row along the source-to-target run, overlap
   edge over edge, and a rivet is driven through the seam. Aim-staged: the
   wall runs the real vector. Palette: #8fa6c4 / #fff2dc / #1b2431. */
const GL_TOWER = "M4 3h16v12.5c0 3.4-3.4 5.2-8 6.5-4.6-1.3-8-3.1-8-6.5z";

function GuardianOfTheLineScene({ role, delayMs }: SceneProps) {
  const shield = (fill: string) => <path d={GL_TOWER} fill={fill} stroke="#1b2431" strokeWidth="1.3" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g26-ent-drop" l={10} t={16} w={44} h={62} d={40}>{shield("#8fa6c4")}</V>
        <V c="g26-ent-drop" l={44} t={22} w={44} h={62} d={220}>{shield("#fff2dc")}</V>
        <V c="g26-gl-rivet" l={40} t={44} w={20} h={20} d={430}><circle cx="12" cy="12" r="5" fill="#fff2dc" stroke="#1b2431" strokeWidth="1.6" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hitside" l={14} t={12} w={72} h={76} d={0}>{shield("#8fa6c4")}</V>
        <L c="g26-hit2" l={20} t={54} w={60} h={3} d={160} st={{ borderRadius: "999px", background: "#fff2dc" }} />
        <V c="g26-hit" l={40} t={40} w={20} h={20} d={240}><circle cx="12" cy="12" r="4.4" fill="#fff2dc" /></V>
      </Cut>
    );
  }
  return (
    <AimLead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(143,166,196,0.28)" />
          <Rim tone="rgba(255,242,220,0.3)" />
        </>
      }
    >
      <L c="g26-runout" l={44} t={48.6} w={30} h={2.6} d={80} st={{ background: "linear-gradient(90deg, #fff2dc, rgba(143,166,196,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      {[0, 1, 2, 3].map((i) => (
        <V key={i} c="g26-gl-slam" l={43 + i * 5.2} t={41} w={7.4} h={16} d={140 + i * 110}>
          {shield(i % 2 ? "#fff2dc" : "#8fa6c4")}
        </V>
      ))}
      <V c="g26-gl-rivet" l={45.4} t={46} w={4.4} h={4.4} d={640}><circle cx="12" cy="12" r="6" fill="#fff2dc" stroke="#1b2431" strokeWidth="2.2" /></V>
      <L c="g26-gl-clang" l={42} t={44} w={12} h={12} d={660} st={{ borderRadius: "50%", border: "2px solid #fff2dc" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g26-sift" l={46 + i * 6} t={56} w={1.4} h={1.4} d={720 + i * 90} st={{ borderRadius: "50%", background: "#8fa6c4" }} />
      ))}
    </AimLead>
  );
}

/* --- 3. Saint's Procession (t7) — THE CANOPY --------------------------------
   Hooded bearers carry a reliquary canopy across the run; candle flames lean,
   the censer swings, and the incense they trail hangs behind them. Palette:
   #e6c46a / #fff4d6 / #2b2110. */
function SaintsProcessionScene({ role, delayMs }: SceneProps) {
  const bearer = (
    <g fill="#2b2110" stroke="#e6c46a" strokeWidth="1.1" {...SJ}>
      <path d="M12 4c2.2 0 3.4 1.7 3.4 3.9L15 21H9l-.4-13.1C8.6 5.7 9.8 4 12 4z" />
    </g>
  );
  const canopy = (
    <g {...SJ}>
      <path d="M2 9h20l-2.6-4.5H4.6z" fill="#e6c46a" stroke="#2b2110" strokeWidth="1" />
      <path d="M4 9v11M20 9v11" stroke="#e6c46a" strokeWidth="1.2" />
      <path d="M4 12h16" stroke="#fff4d6" strokeWidth="0.9" strokeDasharray="1.6 1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g26-ent-rise" l={8} t={22} w={84} h={56} d={40}>{canopy}</V>
        <V c="g26-sp-walk" l={38} t={40} w={24} h={44} d={250}>{bearer}</V>
        <V c="g26-ent-pop" l={58} t={16} w={20} h={20} d={440}><path d="M12 3c2 3.4 4 5.2 4 7.8a4 4 0 0 1-8 0C8 8.2 10 6.4 12 3z" fill="#fff4d6" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hit" l={6} t={16} w={88} h={40} d={0}>{canopy}</V>
        <V c="g26-hitside" l={36} t={38} w={28} h={50} d={140}>{bearer}</V>
        <L c="g26-hit2" l={44} t={78} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(230,196,106,0.26)" />}>
      <L c="g26-runout" l={44} t={53} w={30} h={1.8} d={60} st={{ background: "linear-gradient(90deg, #e6c46a, rgba(230,196,106,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g26-sp-canopy" l={41} t={38} w={22} h={12} d={180}>{canopy}</V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g26-sp-walk" l={43.5 + i * 5} t={45} w={5} h={9} d={260 + i * 130}>{bearer}</V>
      ))}
      <V c="g26-sp-censer" l={54} t={44} w={6} h={10} d={520} st={{ transformOrigin: "50% 0%" }}>
        <g {...SJ}>
          <path d="M12 2v7" stroke="#e6c46a" strokeWidth="1.2" />
          <path d="M7 11h10l-1.6 7H8.6z" fill="#fff4d6" stroke="#2b2110" strokeWidth="1.1" />
        </g>
      </V>
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g26-sp-incense" l={42 + i * 4} t={48} w={2} h={2} d={620 + i * 110} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </AimLead>
  );
}

/* --- 4. Warding Circle (t7) — CHALK, THEN FIRE ------------------------------
   A hand-drawn chalk ring is scored onto the boards, four chalked marks thump
   down at the compass points, then the flame runs the whole circumference and
   the chalk dust lifts. Palette: #b8f0e2 / #fff4d6 / #10312c. */
const WC_MARKS = [0, 90, 180, 270];

function WardingCircleScene({ role, delayMs }: SceneProps) {
  const glyph = (
    <path d="M12 3.6l2.2 4.8 5.2.6-3.9 3.5 1.1 5.1L12 15.1 7.4 17.6l1.1-5.1L4.6 9l5.2-.6z" fill="none" stroke="#fff4d6" strokeWidth="1.6" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g26-wc-scribe" l={10} t={10} w={80} h={80} d={40}>
          <circle cx="12" cy="12" r="9.4" fill="none" stroke="#b8f0e2" strokeWidth="1.8" strokeDasharray="3.2 1.6" />
        </V>
        <V c="g26-ent-pop" l={32} t={32} w={36} h={36} d={280}>{glyph}</V>
        <L c="g26-wc-burn" l={12} t={12} w={76} h={76} d={430} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hit" l={12} t={12} w={76} h={76} d={0}><circle cx="12" cy="12" r="9" fill="none" stroke="#b8f0e2" strokeWidth="2" strokeDasharray="2.8 1.6" /></V>
        <V c="g26-hitside" l={30} t={30} w={40} h={40} d={130}>{glyph}</V>
        <L c="g26-hit2" l={22} t={22} w={56} h={56} d={250} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(184,240,226,0.24)" />}>
      <V c="g26-wc-scribe" l={31} t={31} w={38} h={38} d={90}>
        <circle cx="12" cy="12" r="10.4" fill="none" stroke="#b8f0e2" strokeWidth="1.4" strokeDasharray="3 1.5" />
      </V>
      {WC_MARKS.map((a, i) => (
        <P key={a} l={31} t={31} w={38} h={38} rot={`${a}deg`}>
          <V c="g26-wc-mark" w={100} h={100} d={280 + i * 90}>
            <path d="M12 1.6l1.8 3.4h-3.6z" fill="#fff4d6" />
            <path d="M12 6.2v3" stroke="#b8f0e2" strokeWidth="1.2" {...SJ} />
          </V>
        </P>
      ))}
      <L c="g26-wc-burn" l={32} t={32} w={36} h={36} d={620} st={{ borderRadius: "50%", border: "2.5px solid #fff4d6" }} />
      <L c="g26-leanshadow" l={38} t={38} w={24} h={24} d={660} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.75), transparent 70%)" }} />
      <V c="g26-wc-glyph" l={41} t={41} w={18} h={18} d={720}>{glyph}</V>
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g26-sift" l={36 + i * 9} t={40} w={1.4} h={1.4} d={780 + i * 90} st={{ borderRadius: "50%", background: "#b8f0e2" }} />
      ))}
    </Lead>
  );
}

/* --- 5. Plot Armor (t7) — THE SCRIPT INSISTS --------------------------------
   A spotlight snaps on, a script page thumps down over the piece, the clapper
   board snaps shut and a red SURVIVES stamp rolls on. The stunt pad straps
   over the piece as it settles. Palette: #ffb9a0 / #fff4d6 / #331a14. */
function PlotArmorScene({ role, delayMs }: SceneProps) {
  const page = (
    <g {...SJ}>
      <path d="M5 2.5h11l3 3.4V21.5H5z" fill="#fff4d6" stroke="#331a14" strokeWidth="1.1" />
      <path d="M7.4 8h9M7.4 11h9M7.4 14h6" stroke="#331a14" strokeWidth="0.9" />
    </g>
  );
  const clapper = (
    <g {...SJ}>
      <path d="M3 10h18v10H3z" fill="#331a14" stroke="#ffb9a0" strokeWidth="1" />
      <path d="M3 4.6l17-2.2 1 4.4-17 2.2z" fill="#ffb9a0" stroke="#331a14" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g26-ent-drop" l={22} t={12} w={54} h={70} d={40}>{page}</V>
        <V c="g26-pa-clap" l={12} t={54} w={44} h={34} d={260} st={{ transformOrigin: "10% 90%" }}>{clapper}</V>
        <V c="g26-pa-stamp" l={40} t={34} w={44} h={30} d={450} par="none" vb="0 0 40 20">
          <text x="20" y="15" textAnchor="middle" fontSize="11" fontWeight="700" fill="#ffb9a0">SURVIVES</text>
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hitside" l={24} t={10} w={52} h={70} d={0}>{page}</V>
        <V c="g26-hit" l={30} t={38} w={40} h={40} d={140}><path d={PAWN} fill="#ffb9a0" /></V>
        <L c="g26-hit2" l={18} t={44} w={64} h={5} d={250} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <L c="g26-veil" st={{ background: "rgba(12,8,10,0.42)" }} />
          <Wash tone="rgba(255,185,160,0.3)" d={120} />
        </>
      }
    >
      <L c="g26-shaft" l={41} t={16} w={18} h={40} d={60} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.72), transparent)", transformOrigin: "50% 0%" }} />
      <V c="g26-pa-page" l={41} t={38} w={18} h={22} d={240}>{page}</V>
      <V c="g26-pa-clap" l={34} t={52} w={16} h={12} d={430} st={{ transformOrigin: "10% 90%" }}>{clapper}</V>
      <V c="g26-pa-stamp" l={40} t={44} w={20} h={10} d={620} par="none" vb="0 0 40 20">
        <rect x="1" y="2" width="38" height="16" rx="1" fill="none" stroke="#ffb9a0" strokeWidth="1.6" />
        <text x="20" y="14" textAnchor="middle" fontSize="9" fontWeight="700" fill="#ffb9a0">SURVIVES</text>
      </V>
      <V c="g26-pa-pad" l={45} t={45} w={10} h={12} d={760}><path d={PAWN} fill="none" stroke="#fff4d6" strokeWidth="1.6" {...SJ} /></V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g26-glint" l={38 + i * 12} t={38 + (i % 2) * 14} w={2.4} h={2.4} d={700 + i * 110} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 6. Ancestral Shield (t6) — THE ANCESTOR STEPS IN -----------------------
   A portrait frame fades up behind the square, the old one walks out of it,
   plants a heirloom kite shield in front of the piece and dissolves back into
   dust. Palette: #c8b4e0 / #fff4d6 / #221733. */
function AncestralShieldScene({ role, delayMs }: SceneProps) {
  const kite = (
    <g {...SJ}>
      <path d="M12 2.5l8 4v6.6c0 4.4-3.6 7.4-8 8.4-4.4-1-8-4-8-8.4V6.5z" fill="#c8b4e0" stroke="#221733" strokeWidth="1.2" />
      <path d="M12 5.4v13M6.6 9.4h10.8" stroke="#fff4d6" strokeWidth="1" />
    </g>
  );
  const ghost = <path d="M12 3.4c2.6 0 4 2 4 4.6L15.4 22H8.6L8 8c0-2.6 1.4-4.6 4-4.6z" fill="#c8b4e0" opacity="0.8" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g26-as-frame" l={16} t={10} w={68} h={80} d={40}>
          <rect x="2" y="2" width="20" height="20" rx="1" fill="none" stroke="#c8b4e0" strokeWidth="1.6" />
          <rect x="4.4" y="4.4" width="15.2" height="15.2" rx="1" fill="none" stroke="#fff4d6" strokeWidth="0.7" />
        </V>
        <V c="g26-as-step" l={26} t={22} w={48} h={62} d={250}>{ghost}</V>
        <V c="g26-ent-pop" l={30} t={30} w={40} h={48} d={440}>{kite}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hitside" l={22} t={12} w={56} h={70} d={0}>{ghost}</V>
        <V c="g26-hit" l={26} t={26} w={48} h={58} d={150}>{kite}</V>
        <L c="g26-hit2" l={44} t={78} w={12} h={5} d={260} st={{ borderRadius: "999px", background: "#c8b4e0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(200,180,224,0.28)" />}>
      <V c="g26-as-frame" l={40} t={33} w={20} h={26} d={90}>
        <rect x="2" y="2" width="20" height="20" rx="1" fill="rgba(34,23,51,0.55)" stroke="#c8b4e0" strokeWidth="1.4" />
        <rect x="4.4" y="4.4" width="15.2" height="15.2" rx="1" fill="none" stroke="#fff4d6" strokeWidth="0.6" />
      </V>
      <V c="g26-as-step" l={43} t={40} w={10} h={16} d={300}>{ghost}</V>
      <V c="g26-as-plant" l={44.5} t={44} w={11} h={14} d={500}>{kite}</V>
      <L c="g26-leanshadow" l={42} t={56} w={16} h={4} d={560} st={{ borderRadius: "999px", background: "rgba(34,23,51,0.65)" }} />
      <V c="g26-as-fade" l={43} t={40} w={10} h={16} d={700}>{ghost}</V>
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g26-sift" l={41 + i * 6} t={48} w={1.5} h={1.5} d={760 + i * 100} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 7. Shieldmaidens (t6) — SPEARS PLANTED POINT-DOWN ----------------------
   Six round shields and crossed spears drive into the boards in a tight ring
   around the queen, the helm crest tips forward, and the boards kick up
   splinters. Palette: #9fd6c0 / #fff4d6 / #16302a. */
const SM_RING = [0, 60, 120, 180, 240, 300];

function ShieldmaidensScene({ role, delayMs }: SceneProps) {
  const round = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="8.6" fill="#9fd6c0" stroke="#16302a" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="2.6" fill="#fff4d6" />
      <path d="M12 3.4v17.2M3.4 12h17.2" stroke="#16302a" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g26-sm-plant" l={8} t={22} w={40} h={54} d={40}>{round}</V>
        <V c="g26-sm-plant" l={50} t={26} w={40} h={54} d={220}>{round}</V>
        <V c="g26-ent-swing" l={32} t={6} w={36} h={40} d={420} st={{ transformOrigin: "50% 100%" }}>
          <path d="M12 2v18M8 20h8" stroke="#fff4d6" strokeWidth="2" {...SJ} />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hitside" l={18} t={18} w={64} h={64} d={0}>{round}</V>
        <V c="g26-hit" l={44} t={2} w={12} h={70} d={140}><path d="M12 1l2 4-2 16-2-16z" fill="#fff4d6" /></V>
        <L c="g26-hit2" l={34} t={76} w={32} h={4} d={250} st={{ borderRadius: "999px", background: "#16302a" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(159,214,192,0.26)" />}>
      <V c="g26-sm-queen" l={45.5} t={44} w={9} h={12} d={100}><path d={QUEEN} fill="none" stroke="#fff4d6" strokeWidth="1.4" {...SJ} /></V>
      {SM_RING.map((a, i) => (
        <P key={a} l={33} t={33} w={34} h={34} rot={`${a}deg`}>
          <V c="g26-sm-spear" w={100} h={100} d={200 + i * 70} st={{ transformOrigin: "50% 50%" }}>
            <path d="M12 0.6l1.7 3.6L12 9l-1.7-4.8z" fill="#fff4d6" />
            <path d="M12 4.4v5" stroke="#9fd6c0" strokeWidth="1.1" {...SJ} />
          </V>
        </P>
      ))}
      {SM_RING.filter((_, i) => i % 2 === 0).map((a, i) => (
        <P key={a} l={36} t={36} w={28} h={28} rot={`${a}deg`}>
          <V c="g26-sm-plant" w={100} h={100} d={420 + i * 110}>{round}</V>
        </P>
      ))}
      <L c="g26-leanshadow" l={39} t={54} w={22} h={5} d={620} st={{ borderRadius: "999px", background: "rgba(22,48,42,0.62)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g26-sift" l={42 + i * 8} t={55} w={1.6} h={1.6} d={700 + i * 100} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 8. Bodyguard Detail (t5) — FOUR SUITS CLOSE THE BOX --------------------
   Dark silhouettes step in from the caster's own side, plant a square around
   the king, one raises a flat palm and an earpiece coil catches the light.
   Palette: #7f93b8 / #fff4d6 / #10141f. */
const BD_SPOTS: Array<[number, number]> = [[41, 40], [55, 40], [41, 52], [55, 52]];

function BodyguardDetailScene({ role, delayMs }: SceneProps) {
  const suit = (
    <g {...SJ}>
      <circle cx="12" cy="5.4" r="3" fill="#10141f" />
      <path d="M5.4 22V13c0-3 2.8-4.6 6.6-4.6S18.6 10 18.6 13v9z" fill="#10141f" stroke="#7f93b8" strokeWidth="1" />
      <path d="M12 8.6V22" stroke="#7f93b8" strokeWidth="0.8" />
      <path d="M13.8 5.2c1.6.6 2 2 1.4 3.4" stroke="#fff4d6" strokeWidth="0.9" fill="none" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g26-bd-step" l={4} t={20} w={44} h={64} d={40}>{suit}</V>
        <V c="g26-bd-step" l={52} t={20} w={44} h={64} d={200}>{suit}</V>
        <V c="g26-ent-pop" l={34} t={30} w={32} h={32} d={420}>
          <path d="M8 21v-8.6c0-1 1.6-1 1.6 0V8c0-1.1 1.7-1.1 1.7 0v3.4c0-1.2 1.7-1.2 1.7 0V9.2c0-1.2 1.7-1.2 1.7 0V17c0 2.6-1.6 4-4.4 4z" fill="#fff4d6" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hitside" l={12} t={16} w={40} h={70} d={0}>{suit}</V>
        <V c="g26-hitside" l={48} t={16} w={40} h={70} d={110}>{suit}</V>
        <L c="g26-hit2" l={14} t={20} w={72} h={66} d={240} st={{ border: "2px solid #7f93b8" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <L c="g26-veil" st={{ background: "rgba(8,11,18,0.4)" }} />
          <Rim tone="rgba(127,147,184,0.34)" />
        </>
      }
    >
      <V c="g26-bd-king" l={45.5} t={44} w={9} h={12} d={80}><path d={KING} fill="none" stroke="#fff4d6" strokeWidth="1.4" {...SJ} /></V>
      {BD_SPOTS.map(([l, t], i) => (
        <V key={i} c="g26-bd-step" l={l} t={t} w={6} h={9} d={180 + i * 110}>{suit}</V>
      ))}
      <L c="g26-bd-box" l={39} t={37} w={22} h={24} d={620} st={{ border: "2px solid #7f93b8" }} />
      <V c="g26-bd-palm" l={54} t={38} w={7} h={7} d={700}>
        <path d="M8 21v-8.6c0-1 1.6-1 1.6 0V8c0-1.1 1.7-1.1 1.7 0v3.4c0-1.2 1.7-1.2 1.7 0V9.2c0-1.2 1.7-1.2 1.7 0V17c0 2.6-1.6 4-4.4 4z" fill="#fff4d6" />
      </V>
      <L c="g26-glint" l={43} t={39} w={2} h={2} d={760} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 9. Color Guard (t5) — THE COLOURS ARE PLANTED --------------------------
   Two regimental standards drive their pole butts into the second rank, the
   silks snap open, sabres cross overhead and two fresh pawns rise under the
   arch. Palette: #e0a860 / #fff4d6 / #2c1a0e. */
function ColorGuardScene({ role, delayMs }: SceneProps) {
  const standard = (fill: string) => (
    <g {...SJ}>
      <path d="M7 1.6v20.8" stroke="#2c1a0e" strokeWidth="1.6" />
      <path d="M7.8 3h11.4l-2.4 3.4 2.4 3.4H7.8z" fill={fill} stroke="#2c1a0e" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g26-cg-plant" l={6} t={14} w={44} h={70} d={40}>{standard("#e0a860")}</V>
        <V c="g26-cg-plant" l={48} t={18} w={44} h={70} d={230}>{standard("#fff4d6")}</V>
        <V c="g26-ent-pop" l={30} t={38} w={40} h={40} d={440}><path d="M3 20L20 4M4 4l17 16" stroke="#fff4d6" strokeWidth="1.8" fill="none" {...SJ} /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hitside" l={18} t={8} w={64} h={72} d={0}>{standard("#e0a860")}</V>
        <V c="g26-hit" l={38} t={44} w={24} h={40} d={150}><path d={PAWN} fill="#fff4d6" /></V>
        <L c="g26-hit2" l={26} t={82} w={48} h={4} d={260} st={{ borderRadius: "999px", background: "#2c1a0e" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(224,168,96,0.28)" />}>
      <V c="g26-cg-plant" l={38} t={34} w={12} h={20} d={120}>{standard("#e0a860")}</V>
      <V c="g26-cg-plant" l={50} t={34} w={12} h={20} d={280}>{standard("#fff4d6")}</V>
      <V c="g26-cg-sabre" l={41} t={30} w={18} h={18} d={470}><path d="M3 20L20 4M4 4l17 16" stroke="#fff4d6" strokeWidth="1.5" fill="none" {...SJ} /></V>
      <L c="g26-cg-thump" l={39} t={53} w={22} h={4} d={430} st={{ borderRadius: "999px", background: "rgba(44,26,14,0.7)" }} />
      {[0, 1].map((i) => (
        <V key={i} c="g26-guardin" l={43 + i * 9} t={46} w={7} h={10} d={560 + i * 150}><path d={PAWN} fill="#fff4d6" stroke="#2c1a0e" strokeWidth="1" {...SJ} /></V>
      ))}
      {[0, 1, 2].map((i) => (
        <L key={i} c="g26-sift" l={42 + i * 7} t={54} w={1.5} h={1.5} d={700 + i * 100} st={{ borderRadius: "50%", background: "#e0a860" }} />
      ))}
    </Lead>
  );
}

/* --- 10. The Old Guard (t5) — TWO HELMS COME OFF THE RACK -------------------
   A weapons rack fades up, a knight's barbute and a bishop's mitre are lifted
   off their pegs, dust sheets slide away, and both settle onto the boards
   still trailing cobweb. Palette: #b9a889 / #fff4d6 / #2a2216. */
function OldGuardScene({ role, delayMs }: SceneProps) {
  const barbute = (
    <g {...SJ}>
      <path d="M5 20V11a7 7 0 0 1 14 0v9z" fill="#b9a889" stroke="#2a2216" strokeWidth="1.2" />
      <path d="M12 8v9M9.4 13.4h5.2" stroke="#2a2216" strokeWidth="1.3" />
    </g>
  );
  const mitre = (
    <g {...SJ}>
      <path d="M12 2.6c3 3.4 5 7.4 5 11.4v6H7v-6c0-4 2-8 5-11.4z" fill="#fff4d6" stroke="#2a2216" strokeWidth="1.1" />
      <path d="M7 16.6h10" stroke="#b9a889" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g26-og-lift" l={6} t={22} w={44} h={58} d={40}>{barbute}</V>
        <V c="g26-og-lift" l={50} t={18} w={44} h={62} d={230}>{mitre}</V>
        <L c="g26-og-sheet" l={4} t={64} w={92} h={22} d={430} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.65), transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hitside" l={16} t={16} w={68} h={62} d={0}>{barbute}</V>
        <L c="g26-hit2" l={14} t={72} w={72} h={4} d={140} st={{ borderRadius: "999px", background: "#b9a889" }} />
        <L c="g26-hit" l={44} t={12} w={12} h={12} d={250} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(185,168,137,0.26)" />}>
      <V c="g26-og-rack" l={36} t={36} w={28} h={22} d={80}>
        <g fill="none" stroke="#b9a889" strokeWidth="1.4" {...SJ}>
          <path d="M2 6h20M4 6v14M20 6v14" />
          <path d="M7 6V3.4M17 6V3.4" />
        </g>
      </V>
      <L c="g26-og-sheet" l={35} t={44} w={30} h={14} d={220} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.6), transparent)" }} />
      <V c="g26-og-lift" l={40} t={41} w={9} h={11} d={380}>{barbute}</V>
      <V c="g26-og-lift" l={51} t={40} w={9} h={12} d={520}>{mitre}</V>
      <L c="g26-leanshadow" l={39} t={55} w={22} h={4} d={600} st={{ borderRadius: "999px", background: "rgba(42,34,22,0.6)" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g26-sift" l={40 + i * 6} t={50} w={1.4} h={1.4} d={660 + i * 110} st={{ borderRadius: "50%", background: "#b9a889" }} />
      ))}
    </Lead>
  );
}

/* --- 11. Confetti Cannon (t4) — SHADES ON, STRUT ON -------------------------
   A pair of sunglasses slides down onto the piece, the cannon barrel tips up
   and fires streamers, and the piece struts a two-step under falling
   confetti. Palette: #ff8fb4 / #fff4d6 / #2c1424. */
const CC_BITS: Array<[number, number, string]> = [
  [40, 30, "#ff8fb4"], [48, 24, "#fff4d6"], [56, 32, "#ff8fb4"],
  [44, 20, "#fff4d6"], [53, 18, "#ff8fb4"], [37, 26, "#fff4d6"],
];

function ConfettiCannonScene({ role, delayMs }: SceneProps) {
  const shades = (
    <g {...SJ}>
      <path d="M2.4 8h19.2v2.4h-1.4c-.4 3.4-1.8 5-4.4 5s-3.6-1.6-3.8-4.4h-.2c-.2 2.8-1.2 4.4-3.8 4.4s-4-1.6-4.4-5H2.4z" fill="#2c1424" stroke="#fff4d6" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g26-cc-shades" l={12} t={34} w={76} h={36} d={40}>{shades}</V>
        <V c="g26-cc-barrel" l={4} t={54} w={40} h={36} d={240} st={{ transformOrigin: "10% 90%" }}>
          <path d="M2 18h14l6-6-2-3-14 5z" fill="#ff8fb4" stroke="#2c1424" strokeWidth="1" {...SJ} />
        </V>
        {CC_BITS.slice(0, 4).map(([l, t, col], i) => (
          <L key={i} c="g26-cc-bit" l={l} t={t - 12} w={5} h={5} d={430 + i * 90} st={{ background: col }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hit" l={16} t={34} w={68} h={32} d={0}>{shades}</V>
        <V c="g26-hitside" l={34} t={40} w={32} h={50} d={130}><path d={PAWN} fill="#ff8fb4" /></V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g26-hit2" l={26 + i * 22} t={14} w={6} h={6} d={220 + i * 80} st={{ background: "#fff4d6" }} />
        ))}
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(255,143,180,0.28)" />}>
      <V c="g26-cc-barrel" l={36} t={44} w={14} h={12} d={100} st={{ transformOrigin: "10% 90%" }}>
        <path d="M2 18h14l6-6-2-3-14 5z" fill="#ff8fb4" stroke="#2c1424" strokeWidth="1" {...SJ} />
      </V>
      <L c="g26-cc-pop" l={47} t={40} w={10} h={10} d={340} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 68%)" }} />
      <V c="g26-cc-shades" l={44} t={43} w={12} h={6} d={420}>{shades}</V>
      <V c="g26-cc-strut" l={45} t={45} w={10} h={13} d={520}><path d={PAWN} fill="#ff8fb4" stroke="#2c1424" strokeWidth="1" {...SJ} /></V>
      {CC_BITS.map(([l, t, col], i) => (
        <L key={i} c="g26-cc-bit" l={l} t={t} w={1.8} h={2.6} d={400 + i * 80} st={{ background: col }} />
      ))}
      <L c="g26-leanshadow" l={43} t={57} w={14} h={3} d={620} st={{ borderRadius: "999px", background: "rgba(44,20,36,0.6)" }} />
    </Lead>
  );
}

/* --- 12. Quilted Armor (t3) — THE GAMBESON SEWS ITSELF ----------------------
   A needle runs a diagonal seam, the diamond stitching fills in row by row,
   and the padding puffs out with a small burst of lint. Palette: #d8b98a /
   #fff4d6 / #33251a. */
const QA_ROWS = [0, 1, 2];

function QuiltedArmorScene({ role, delayMs }: SceneProps) {
  const quilt = (
    <g fill="none" stroke="#d8b98a" strokeWidth="1.1" strokeDasharray="1.8 1.4" {...SJ}>
      <path d="M2 12L12 2l10 10-10 10z" />
      <path d="M7 12l5-5 5 5-5 5z" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g26-qa-needle" l={4} t={4} w={54} h={54} d={40}><path d="M2 22L20 4M20 4l-1.6 4.4" stroke="#fff4d6" strokeWidth="1.6" fill="none" {...SJ} /></V>
        <V c="g26-qa-stitch" l={16} t={16} w={68} h={68} d={260}>{quilt}</V>
        <L c="g26-qa-puff" l={28} t={28} w={44} h={44} d={450} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.7), transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hitside" l={10} t={10} w={80} h={80} d={0}>{quilt}</V>
        <V c="g26-hit" l={4} t={6} w={44} h={44} d={130}><path d="M2 22L20 4" stroke="#fff4d6" strokeWidth="1.8" fill="none" {...SJ} /></V>
        <L c="g26-hit2" l={30} t={30} w={40} h={40} d={250} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.6), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(216,185,138,0.24)" />}>
      <V c="g26-qa-needle" l={34} t={32} w={16} h={16} d={90}><path d="M2 22L20 4M20 4l-1.6 4.4" stroke="#fff4d6" strokeWidth="1.8" fill="none" {...SJ} /></V>
      {QA_ROWS.map((i) => (
        <V key={i} c="g26-qa-stitch" l={38} t={36 + i * 7} w={24} h={8} d={230 + i * 150} par="none" vb="0 0 48 12">
          <path d="M0 6L6 0l6 6-6 6zM12 6L18 0l6 6-6 6zM24 6L30 0l6 6-6 6zM36 6L42 0l6 6-6 6z" fill="none" stroke="#d8b98a" strokeWidth="1.2" strokeDasharray="2 1.4" />
        </V>
      ))}
      <L c="g26-qa-puff" l={38} t={36} w={24} h={22} d={680} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.6), transparent 70%)" }} />
      <L c="g26-leanshadow" l={40} t={57} w={20} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(51,37,26,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g26-sift" l={41 + i * 8} t={44} w={1.4} h={1.4} d={740 + i * 110} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 13. Boundary Stones (t2) — TWO MARKERS AND A CHAIN ---------------------
   Carved stones thump into the boards at either end of the run, turf sprays,
   and the surveyor's chain snaps taut between them. Aim-staged along the real
   line. Palette: #9fb0a2 / #fff4d6 / #23291f. */
function BoundaryStonesScene({ role, delayMs }: SceneProps) {
  const stone = (
    <g {...SJ}>
      <path d="M6.4 22V8.4C6.4 5 8.6 2.6 12 2.6S17.6 5 17.6 8.4V22z" fill="#9fb0a2" stroke="#23291f" strokeWidth="1.2" />
      <path d="M9.6 9.4h4.8M9.6 13h4.8M9.6 16.6h3.2" stroke="#23291f" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g26-bs-thump" l={6} t={18} w={38} h={64} d={40}>{stone}</V>
        <V c="g26-bs-thump" l={54} t={18} w={38} h={64} d={230}>{stone}</V>
        <L c="g26-bs-chain" l={22} t={54} w={56} h={4} d={430} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hitside" l={28} t={12} w={44} h={72} d={0}>{stone}</V>
        <L c="g26-hit2" l={20} t={78} w={60} h={5} d={140} st={{ borderRadius: "999px", background: "#23291f" }} />
        <L c="g26-hit" l={10} t={50} w={80} h={3} d={250} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(159,176,162,0.24)" />}>
      <V c="g26-bs-thump" l={43} t={43} w={7} h={11} d={110}>{stone}</V>
      <V c="g26-bs-thump" l={56} t={43} w={7} h={11} d={300}>{stone}</V>
      <L c="g26-bs-turf" l={41} t={52} w={11} h={3} d={220} st={{ borderRadius: "999px", background: "rgba(35,41,31,0.65)" }} />
      <L c="g26-bs-turf" l={54} t={52} w={11} h={3} d={400} st={{ borderRadius: "999px", background: "rgba(35,41,31,0.65)" }} />
      <L c="g26-runout" l={48} t={47.4} w={16} h={1.8} d={480} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "0% 50%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g26-sift" l={45 + i * 6} t={50} w={1.4} h={1.4} d={620 + i * 100} st={{ borderRadius: "50%", background: "#9fb0a2" }} />
      ))}
    </AimLead>
  );
}

/* --- 14. Pocket Shield (t2) — IT FOLDS OUT ----------------------------------
   A flat disc is flicked out of a coat pocket, unfolds like a fan into three
   overlapping leaves and locks with a click, the coat flap falling shut
   behind it. Palette: #86c8e0 / #fff4d6 / #14293a. */
const PS_LEAVES = [-38, 0, 38];

function PocketShieldScene({ role, delayMs }: SceneProps) {
  const leaf = (fill: string) => (
    <path d="M12 2.6l5 2.6v7.2c0 3.6-2 6.4-5 8-3-1.6-5-4.4-5-8V5.2z" fill={fill} stroke="#14293a" strokeWidth="1.2" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g26-ps-flick" l={6} t={44} w={34} h={44} d={40}>{leaf("#86c8e0")}</V>
        {PS_LEAVES.map((a, i) => (
          <P key={a} l={26} t={16} w={48} h={62} rot={`${a}deg`}>
            <V c="g26-ps-fan" w={100} h={100} d={240 + i * 100} st={{ transformOrigin: "50% 100%" }}>
              {leaf(i === 1 ? "#fff4d6" : "#86c8e0")}
            </V>
          </P>
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hitside" l={24} t={10} w={52} h={72} d={0}>{leaf("#86c8e0")}</V>
        <V c="g26-hit" l={34} t={22} w={32} h={44} d={140}>{leaf("#fff4d6")}</V>
        <L c="g26-hit2" l={44} t={44} w={12} h={12} d={250} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(134,200,224,0.24)" />}>
      <V c="g26-ps-pocket" l={36} t={48} w={14} h={12} d={70}><path d="M3 6h18v3l-9 4-9-4z" fill="#14293a" stroke="#86c8e0" strokeWidth="1.1" {...SJ} /></V>
      <V c="g26-ps-flick" l={41} t={44} w={9} h={12} d={200}>{leaf("#86c8e0")}</V>
      {PS_LEAVES.map((a, i) => (
        <P key={a} l={43} t={38} w={14} h={18} rot={`${a}deg`}>
          <V c="g26-ps-fan" w={100} h={100} d={380 + i * 110} st={{ transformOrigin: "50% 100%" }}>
            {leaf(i === 1 ? "#fff4d6" : "#86c8e0")}
          </V>
        </P>
      ))}
      <L c="g26-leanshadow" l={44} t={56} w={12} h={3} d={640} st={{ borderRadius: "999px", background: "rgba(20,41,58,0.6)" }} />
      <L c="g26-glint" l={53} t={39} w={2.6} h={2.6} d={700} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 15. Alley Cat (t2) — THE BIN-LID AMBUSH --------------------------------
   A bin lid clatters, the cat arches its back on top of it, fur bristling,
   and a claw swipe scores three lines across the square before it slinks off.
   Palette: #f0a860 / #fff4d6 / #241a12. */
const AC_CLAWS = [0, 1, 2];

function AlleyCatScene({ role, delayMs }: SceneProps) {
  const cat = (
    <path
      d="M3.4 20c0-6.4 3.4-10.6 8.6-10.6 2.6 0 4.6.8 6 2.2l1.6-4 1.4 5.2c.6 1.4 1 3.2 1 5.2l-2.6-1.4-2 1.4-2.4-1.2-2.6 1.4-2.4-1.4-2.6 1.4z"
      fill="#241a12"
      stroke="#f0a860"
      strokeWidth="1.1"
      {...SJ}
    />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g26-ac-lid" l={6} t={58} w={88} h={30} d={40}><path d="M2 16h20l-2.6-5H4.6z" fill="#f0a860" stroke="#241a12" strokeWidth="1.1" {...SJ} /></V>
        <V c="g26-ac-arch" l={16} t={16} w={68} h={54} d={240}>{cat}</V>
        {AC_CLAWS.map((i) => (
          <L key={i} c="g26-ac-claw" l={22 + i * 18} t={20} w={4} h={54} d={450 + i * 70} st={{ background: "#fff4d6", rotate: "16deg" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hitside" l={12} t={26} w={76} h={56} d={0}>{cat}</V>
        {AC_CLAWS.map((i) => (
          <L key={i} c="g26-hit2" l={24 + i * 20} t={14} w={4} h={62} d={140 + i * 70} st={{ background: "#fff4d6", rotate: "16deg" }} />
        ))}
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(240,168,96,0.24)" />}>
      <V c="g26-ac-lid" l={38} t={52} w={24} h={9} d={80}><path d="M2 16h20l-2.6-5H4.6z" fill="#f0a860" stroke="#241a12" strokeWidth="1.1" {...SJ} /></V>
      <V c="g26-ac-arch" l={41} t={40} w={18} h={14} d={260}>{cat}</V>
      <L c="g26-ac-bristle" l={40} t={38} w={20} h={18} d={380} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.5), transparent 70%)" }} />
      {AC_CLAWS.map((i) => (
        <L key={i} c="g26-ac-claw" l={43 + i * 5} t={38} w={1.4} h={16} d={520 + i * 80} st={{ background: "#fff4d6", rotate: "16deg" }} />
      ))}
      <L c="g26-leanshadow" l={42} t={58} w={16} h={3} d={640} st={{ borderRadius: "999px", background: "rgba(36,26,18,0.6)" }} />
    </Lead>
  );
}

/* --- 16. Cloister Bell (t2) — THE BELL OF SILENCE ---------------------------
   The great bell swings twice on its headstock, the clapper strikes, and
   three rings of hush roll out and flatten everything they cross. Palette:
   #cbb98a / #fff4d6 / #241f14. */
const CB_RINGS = [0, 1, 2];

function CloisterBellScene({ role, delayMs }: SceneProps) {
  const bell = (
    <g {...SJ}>
      <path d="M12 2.4c-.9 0-1.6.7-1.6 1.6 0 .4.2.8.4 1C7.6 6.4 6 9.6 6 13.6V18H18v-4.4c0-4-1.6-7.2-4.8-9 .2-.2.4-.6.4-1 0-.9-.7-1.6-1.6-1.6z" fill="#cbb98a" stroke="#241f14" strokeWidth="1.1" />
      <path d="M4.4 18h15.2v2H4.4z" fill="#241f14" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g26-cb-swing" l={20} t={8} w={60} h={70} d={40} st={{ transformOrigin: "50% 6%" }}>{bell}</V>
        <L c="g26-cb-clap" l={46} t={62} w={8} h={12} d={330} st={{ borderRadius: "999px", background: "#fff4d6" }} />
        {CB_RINGS.map((i) => (
          <L key={i} c="g26-cb-hush" l={10} t={10} w={80} h={80} d={430 + i * 130} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hitside" l={22} t={10} w={56} h={64} d={0}>{bell}</V>
        <L c="g26-hit2" l={46} t={58} w={8} h={12} d={150} st={{ borderRadius: "999px", background: "#fff4d6" }} />
        <L c="g26-hit" l={16} t={16} w={68} h={68} d={250} st={{ borderRadius: "50%", border: "2px solid #cbb98a" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(203,185,138,0.26)" />
          <Rim tone="rgba(255,244,214,0.3)" d={520} />
        </>
      }
    >
      <L c="g26-cb-stock" l={42} t={33} w={16} h={2.4} d={80} st={{ borderRadius: "1px", background: "#241f14" }} />
      <V c="g26-cb-swing" l={44} t={34} w={12} h={16} d={180} st={{ transformOrigin: "50% 4%" }}>{bell}</V>
      <L c="g26-cb-clap" l={49} t={46} w={2} h={4} d={430} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      {CB_RINGS.map((i) => (
        <L key={i} c="g26-cb-hush" l={34} t={34} w={32} h={32} d={520 + i * 150} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      ))}
      <L c="g26-shaft" l={46} t={22} w={8} h={26} d={600} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.6), transparent)", transformOrigin: "50% 0%" }} />
    </Lead>
  );
}

/* --- 17. Debutante Ball (t2) — THE FAN SNAPS OPEN ---------------------------
   A gloved hand rises, the lace fan whips open in front of the queen, and the
   chandelier above throws a single hard gleam across the lace. Palette:
   #f0b8cc / #fff4d6 / #2b1622. */
const DB_RIBS = [-34, -17, 0, 17, 34];

function DebutanteBallScene({ role, delayMs }: SceneProps) {
  const glove = (
    <path d="M8 22v-9.4c0-1.2 1.8-1.2 1.8 0V7.4c0-1.3 1.9-1.3 1.9 0v4.4c0-1.3 1.9-1.3 1.9 0V8.6c0-1.3 1.9-1.3 1.9 0V17c0 3-1.8 5-5 5z" fill="#fff4d6" stroke="#2b1622" strokeWidth="1" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g26-db-hand" l={30} t={48} w={40} h={48} d={40}>{glove}</V>
        {DB_RIBS.map((a, i) => (
          <P key={a} l={20} t={10} w={60} h={62} rot={`${a}deg`}>
            <L c="g26-db-rib" l={48} t={0} w={4} h={100} d={220 + i * 70} st={{ borderRadius: "999px", background: i % 2 ? "#fff4d6" : "#f0b8cc", transformOrigin: "50% 100%" }} />
          </P>
        ))}
        <L c="g26-ent-pop" l={40} t={22} w={20} h={20} d={520} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hitside" l={30} t={40} w={40} h={54} d={0}>{glove}</V>
        {DB_RIBS.slice(1, 4).map((a, i) => (
          <P key={a} l={22} t={12} w={56} h={54} rot={`${a}deg`}>
            <L c="g26-hit2" l={47} t={0} w={6} h={100} d={130 + i * 80} st={{ borderRadius: "999px", background: "#f0b8cc", transformOrigin: "50% 100%" }} />
          </P>
        ))}
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(240,184,204,0.26)" />}>
      <V c="g26-db-queen" l={45.5} t={44} w={9} h={12} d={70}><path d={QUEEN} fill="none" stroke="#fff4d6" strokeWidth="1.4" {...SJ} /></V>
      <V c="g26-db-hand" l={44} t={50} w={12} h={14} d={200}>{glove}</V>
      {DB_RIBS.map((a, i) => (
        <P key={a} l={38} t={34} w={24} h={22} rot={`${a}deg`}>
          <L c="g26-db-rib" l={47} t={0} w={6} h={100} d={340 + i * 80} st={{ borderRadius: "999px", background: i % 2 ? "#fff4d6" : "#f0b8cc", transformOrigin: "50% 100%" }} />
        </P>
      ))}
      <L c="g26-shaft" l={46} t={22} w={8} h={22} d={640} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.7), transparent)", transformOrigin: "50% 0%" }} />
      <L c="g26-glint" l={52} t={36} w={2.6} h={2.6} d={720} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 18. First Day Badge (t2) — CLIPPED ON ----------------------------------
   A lanyard drops out of the light, the laminated badge swings on its clip,
   snaps flat, and the plastic sleeve catches one shine as the clip bites.
   Palette: #8fd6a8 / #fff4d6 / #16301f. */
function FirstDayBadgeScene({ role, delayMs }: SceneProps) {
  const badge = (
    <g {...SJ}>
      <rect x="4" y="5" width="16" height="15" rx="1" fill="#fff4d6" stroke="#16301f" strokeWidth="1.1" />
      <rect x="10.6" y="2.4" width="2.8" height="3.4" rx="1" fill="#8fd6a8" stroke="#16301f" strokeWidth="0.8" />
      <path d="M6.6 9.6h6M6.6 12.6h10.8M6.6 15.6h8" stroke="#8fd6a8" strokeWidth="1.3" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g26-fb-cord" l={48} t={0} w={4} h={40} d={40} st={{ borderRadius: "999px", background: "#8fd6a8", transformOrigin: "50% 0%" }} />
        <V c="g26-fb-swing" l={22} t={28} w={56} h={60} d={220} st={{ transformOrigin: "50% 4%" }}>{badge}</V>
        <L c="g26-fb-shine" l={20} t={30} w={60} h={12} d={480} st={{ background: "linear-gradient(90deg, transparent, #fff4d6, transparent)", rotate: "-26deg" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g26-hitside" l={48} t={0} w={4} h={36} d={0} st={{ borderRadius: "999px", background: "#8fd6a8", transformOrigin: "50% 0%" }} />
        <V c="g26-hit" l={24} t={26} w={52} h={58} d={130}>{badge}</V>
        <L c="g26-hit2" l={22} t={34} w={56} h={10} d={250} st={{ background: "linear-gradient(90deg, transparent, #fff4d6, transparent)", rotate: "-26deg" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(143,214,168,0.24)" />}>
      <L c="g26-fb-cord" l={49} t={26} w={2} h={16} d={70} st={{ borderRadius: "999px", background: "#8fd6a8", transformOrigin: "50% 0%" }} />
      <V c="g26-fb-swing" l={43} t={38} w={14} h={16} d={240} st={{ transformOrigin: "50% 4%" }}>{badge}</V>
      <L c="g26-fb-clip" l={47.6} t={37} w={4.8} h={3} d={460} st={{ borderRadius: "1px", background: "#fff4d6" }} />
      <L c="g26-fb-shine" l={42} t={41} w={16} h={4} d={580} st={{ background: "linear-gradient(90deg, transparent, #fff4d6, transparent)", rotate: "-26deg" }} />
      <L c="g26-leanshadow" l={44} t={55} w={12} h={3} d={640} st={{ borderRadius: "999px", background: "rgba(22,48,31,0.6)" }} />
      <L c="g26-glint" l={54} t={40} w={2.4} h={2.4} d={700} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 19. Gallery Docent (t2) — VELVET ROPE ----------------------------------
   Two brass stanchions plant, the velvet rope swags between them, and a small
   DO NOT TOUCH placard tips up on its stand. Palette: #d2a0d0 / #fff4d6 /
   #2a1a2c. */
function GalleryDocentScene({ role, delayMs }: SceneProps) {
  const post = (
    <g {...SJ}>
      <path d="M12 4.4v14" stroke="#fff4d6" strokeWidth="2" />
      <circle cx="12" cy="3.4" r="2" fill="#d2a0d0" stroke="#2a1a2c" strokeWidth="0.8" />
      <path d="M7 21.4h10l-1.4-3H8.4z" fill="#d2a0d0" stroke="#2a1a2c" strokeWidth="0.9" />
    </g>
  );
  const rope = (
    <path d="M0 2C10 14 30 14 40 2" fill="none" stroke="#d2a0d0" strokeWidth="4" strokeLinecap="round" />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g26-gd-post" l={2} t={22} w={34} h={62} d={40}>{post}</V>
        <V c="g26-gd-post" l={64} t={22} w={34} h={62} d={200}>{post}</V>
        <V c="g26-gd-rope" l={14} t={26} w={72} h={30} d={400} par="none" vb="0 0 40 16">{rope}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hitside" l={6} t={20} w={36} h={64} d={0}>{post}</V>
        <V c="g26-hitside" l={58} t={20} w={36} h={64} d={100}>{post}</V>
        <V c="g26-hit" l={16} t={26} w={68} h={28} d={230} par="none" vb="0 0 40 16">{rope}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(210,160,208,0.24)" />}>
      <V c="g26-gd-post" l={38} t={41} w={9} h={16} d={110}>{post}</V>
      <V c="g26-gd-post" l={53} t={41} w={9} h={16} d={280}>{post}</V>
      <V c="g26-gd-rope" l={42} t={44} w={16} h={8} d={460} par="none" vb="0 0 40 16">{rope}</V>
      <V c="g26-gd-card" l={44} t={52} w={12} h={9} d={620} st={{ transformOrigin: "50% 100%" }} par="none" vb="0 0 40 24">
        <rect x="1" y="1" width="38" height="16" rx="1" fill="#fff4d6" stroke="#2a1a2c" strokeWidth="1.2" />
        <text x="20" y="12.4" textAnchor="middle" fontSize="7" fontWeight="700" fill="#2a1a2c">DO NOT TOUCH</text>
      </V>
      <L c="g26-leanshadow" l={40} t={58} w={20} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(42,26,44,0.6)" }} />
      <L c="g26-glint" l={39} t={38} w={2.4} h={2.4} d={720} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 20. Lady in Waiting (t2) — SHE STEPS IN FRONT --------------------------
   A court lady sweeps in from the caster's side, spreads a hooped skirt into
   a screen across the queen and raises one warning hand; a hairpin glints as
   she settles. Palette: #e8c8f0 / #fff4d6 / #2a1c33. */
function LadyInWaitingScene({ role, delayMs }: SceneProps) {
  const lady = (
    <g {...SJ}>
      <circle cx="12" cy="4.4" r="2.4" fill="#fff4d6" />
      <path d="M12 7c2.2 0 3.2 1.8 3.6 4.2L17 15H7l1.4-3.8C8.8 8.8 9.8 7 12 7z" fill="#e8c8f0" stroke="#2a1c33" strokeWidth="0.9" />
    </g>
  );
  const skirt = (
    <path d="M20 2C12 2 2 14 0 22h40C38 14 28 2 20 2z" fill="#e8c8f0" stroke="#2a1c33" strokeWidth="1.2" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g26-lw-sweep" l={28} t={6} w={44} h={48} d={40}>{lady}</V>
        <V c="g26-lw-skirt" l={8} t={42} w={84} h={48} d={250} par="none" vb="0 0 40 24" st={{ transformOrigin: "50% 100%" }}>{skirt}</V>
        <L c="g26-ent-pop" l={62} t={16} w={8} h={8} d={470} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hitside" l={30} t={4} w={40} h={48} d={0}>{lady}</V>
        <V c="g26-hit" l={12} t={42} w={76} h={46} d={140} par="none" vb="0 0 40 24" st={{ transformOrigin: "50% 100%" }}>{skirt}</V>
        <L c="g26-hit2" l={60} t={16} w={8} h={8} d={260} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(232,200,240,0.24)" />}>
      <V c="g26-lw-target" l={45.5} t={43} w={9} h={12} d={70}><path d={QUEEN} fill="none" stroke="#fff4d6" strokeWidth="1.4" {...SJ} /></V>
      <V c="g26-guardin" l={43} t={39} w={11} h={13} d={220}>{lady}</V>
      <V c="g26-lw-skirt" l={38} t={46} w={24} h={13} d={420} par="none" vb="0 0 40 24" st={{ transformOrigin: "50% 100%" }}>{skirt}</V>
      <V c="g26-lw-hand" l={53} t={40} w={6} h={7} d={600}>
        <path d="M9 21v-9.4c0-1.2 1.8-1.2 1.8 0V6.4c0-1.3 1.9-1.3 1.9 0v5.2c0-1.3 1.9-1.3 1.9 0V17c0 2.8-1.8 4-4.8 4z" fill="#fff4d6" />
      </V>
      <L c="g26-glint" l={49} t={38} w={2.2} h={2.2} d={700} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      <L c="g26-leanshadow" l={41} t={58} w={18} h={3} d={720} st={{ borderRadius: "999px", background: "rgba(42,28,51,0.6)" }} />
    </Lead>
  );
}

/* --- 21. Lighthouse Keeper (t2) — THE LAMP COMES ROUND ----------------------
   The tower rises out of the dark, the lamp room kindles, and the beam sweeps
   the run twice before settling on the guarded pawn. Aim-staged: the beam
   runs the real vector. Palette: #7fd0e8 / #fff4d6 / #10222e. */
function LighthouseKeeperScene({ role, delayMs }: SceneProps) {
  const tower = (
    <g {...SJ}>
      <path d="M8.4 22L9.6 9h4.8L15.6 22z" fill="#fff4d6" stroke="#10222e" strokeWidth="1.1" />
      <path d="M9.9 12.6h4.2M9.6 16.4h4.8" stroke="#7fd0e8" strokeWidth="1.4" />
      <path d="M9 9h6l-.6-3.4H9.6z" fill="#7fd0e8" stroke="#10222e" strokeWidth="0.9" />
      <path d="M10.4 5.6h3.2l-.6-2h-2z" fill="#10222e" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g26-lh-rise" l={30} t={16} w={40} h={72} d={40}>{tower}</V>
        <L c="g26-lh-lamp" l={42} t={22} w={16} h={16} d={280} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 70%)" }} />
        <L c="g26-lh-beam" l={50} t={26} w={50} h={10} d={430} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.85), transparent)", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hitside" l={32} t={12} w={36} h={74} d={0}>{tower}</V>
        <L c="g26-hit" l={40} t={16} w={20} h={20} d={140} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 70%)" }} />
        <L c="g26-hit2" l={4} t={44} w={92} h={4} d={250} st={{ borderRadius: "999px", background: "#7fd0e8" }} />
      </Cut>
    );
  }
  return (
    <AimLead
      d={delayMs}
      frame={
        <>
          <L c="g26-veil" st={{ background: "rgba(6,14,22,0.42)" }} />
          <Wash tone="rgba(127,208,232,0.26)" d={140} />
        </>
      }
    >
      <V c="g26-lh-rise" l={43} t={40} w={10} h={16} d={90}>{tower}</V>
      <L c="g26-lh-lamp" l={45.5} t={41} w={5} h={5} d={280} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 68%)" }} />
      <L c="g26-lh-beam" l={49} t={41.5} w={26} h={4} d={380} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.85), transparent)", transformOrigin: "0% 50%" }} />
      <L c="g26-runout" l={49} t={45.6} w={22} h={1.6} d={560} st={{ borderRadius: "999px", background: "#7fd0e8", transformOrigin: "0% 50%" }} />
      <V c="g26-lh-pawn" l={62} t={44} w={7} h={9} d={700}><path d={PAWN} fill="#fff4d6" /></V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g26-sift" l={52 + i * 5} t={48} w={1.4} h={1.4} d={640 + i * 100} st={{ borderRadius: "50%", background: "#7fd0e8" }} />
      ))}
    </AimLead>
  );
}

/* --- 22. Ordination Day (t2) — THE MITRE IS LOWERED -------------------------
   Two hands come down out of the light holding the mitre, set it, and the
   stole falls over the bishop's shoulders as the chrism gleams. Palette:
   #e8dcb0 / #fff4d6 / #2b2414. */
function OrdinationDayScene({ role, delayMs }: SceneProps) {
  const mitre = (
    <g {...SJ}>
      <path d="M12 2.4c3.2 3.6 5.2 7.8 5.2 12v5.4H6.8v-5.4c0-4.2 2-8.4 5.2-12z" fill="#e8dcb0" stroke="#2b2414" strokeWidth="1.1" />
      <path d="M6.8 16.6h10.4M12 6v10.4" stroke="#fff4d6" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g26-od-hands" l={16} t={0} w={68} h={34} d={40} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.65), transparent)" }} />
        <V c="g26-od-set" l={26} t={16} w={48} h={62} d={230}>{mitre}</V>
        <L c="g26-ent-pop" l={40} t={64} w={20} h={20} d={450} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 68%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hitside" l={26} t={8} w={48} h={62} d={0}>{mitre}</V>
        <L c="g26-hit2" l={34} t={62} w={32} h={26} d={150} st={{ background: "linear-gradient(180deg, #e8dcb0, transparent)", transformOrigin: "50% 0%" }} />
        <L c="g26-hit" l={44} t={70} w={12} h={12} d={250} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(232,220,176,0.26)" />}>
      <L c="g26-shaft" l={45} t={22} w={10} h={28} d={70} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.7), transparent)", transformOrigin: "50% 0%" }} />
      <L c="g26-od-hands" l={42} t={30} w={16} h={12} d={200} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.6), transparent)" }} />
      <V c="g26-od-set" l={44} t={38} w={12} h={15} d={330}>{mitre}</V>
      <L c="g26-od-stole" l={45.5} t={49} w={9} h={12} d={540} st={{ background: "linear-gradient(180deg, #e8dcb0, transparent)", transformOrigin: "50% 0%" }} />
      <L c="g26-od-chrism" l={47.5} t={44} w={5} h={5} d={660} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 66%)" }} />
      <L c="g26-glint" l={54} t={40} w={2.4} h={2.4} d={720} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 23. Parade Marshal (t2) — BARRIERS ACROSS THE ROUTE --------------------
   The white baton snaps up, crowd barriers march out along the run and clack
   together, and a whistle puff hangs over the line. Palette: #f0d478 /
   #fff4d6 / #2c2410. */
const PM_BARS = [0, 1, 2];

function ParadeMarshalScene({ role, delayMs }: SceneProps) {
  const barrier = (
    <g {...SJ}>
      <path d="M2 6h36v12H2z" fill="none" stroke="#f0d478" strokeWidth="2" />
      <path d="M2 12h36M12 6v12M28 6v12" stroke="#f0d478" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g26-pm-baton" l={10} t={30} w={44} h={7} d={40} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "0% 50%" }} />
        {PM_BARS.map((i) => (
          <V key={i} c="g26-pm-bar" l={4 + i * 30} t={52} w={30} h={30} d={230 + i * 110} par="none" vb="0 0 40 24">{barrier}</V>
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g26-hitside" l={12} t={26} w={46} h={7} d={0} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "0% 50%" }} />
        <V c="g26-hit" l={10} t={46} w={80} h={40} d={150} par="none" vb="0 0 40 24">{barrier}</V>
        <L c="g26-hit2" l={44} t={12} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(240,212,120,0.24)" />}>
      <L c="g26-pm-baton" l={44} t={44} w={14} h={2.4} d={80} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "0% 50%" }} />
      {PM_BARS.map((i) => (
        <V key={i} c="g26-pm-bar" l={46 + i * 9} t={45} w={9} h={6} d={260 + i * 130} par="none" vb="0 0 40 24">{barrier}</V>
      ))}
      <L c="g26-runout" l={46} t={51} w={22} h={1.6} d={620} st={{ borderRadius: "999px", background: "#f0d478", transformOrigin: "0% 50%" }} />
      <L c="g26-pm-whistle" l={44} t={38} w={7} h={7} d={680} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.8), transparent 68%)" }} />
    </AimLead>
  );
}

/* --- 24. Riding Certificate (t2) — SEALED AND ROSETTED ----------------------
   The certificate unrolls, a horseshoe device is struck into it, and the
   ribbon rosette blooms in the corner with its tails dropping. Palette:
   #c9a2f0 / #fff4d6 / #241a33. */
function RidingCertificateScene({ role, delayMs }: SceneProps) {
  const paper = (
    <g {...SJ}>
      <rect x="1" y="2" width="38" height="20" rx="1" fill="#fff4d6" stroke="#241a33" strokeWidth="1.2" />
      <path d="M5 8h22M5 12h26M5 16h16" stroke="#c9a2f0" strokeWidth="1.4" />
    </g>
  );
  const shoe = (
    <path d="M12 3.4c4 0 6.6 3.2 6.6 7.4 0 3.6-1.6 6.6-3.4 8.4l-2-1.6c1.6-1.6 2.8-4 2.8-6.6 0-2.8-1.6-4.6-4-4.6s-4 1.8-4 4.6c0 2.6 1.2 5 2.8 6.6l-2 1.6c-1.8-1.8-3.4-4.8-3.4-8.4 0-4.2 2.6-7.4 6.6-7.4z" fill="#c9a2f0" stroke="#241a33" strokeWidth="1" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g26-rc-unroll" l={6} t={24} w={88} h={46} d={40} par="none" vb="0 0 40 24" st={{ transformOrigin: "0% 50%" }}>{paper}</V>
        <V c="g26-rc-strike" l={34} t={30} w={32} h={32} d={280}>{shoe}</V>
        <L c="g26-rc-rosette" l={62} t={54} w={22} h={22} d={470} st={{ borderRadius: "50%", background: "#c9a2f0" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hitside" l={8} t={30} w={84} h={40} d={0} par="none" vb="0 0 40 24" st={{ transformOrigin: "0% 50%" }}>{paper}</V>
        <V c="g26-hit" l={34} t={28} w={32} h={40} d={150}>{shoe}</V>
        <L c="g26-hit2" l={62} t={56} w={16} h={16} d={260} st={{ borderRadius: "50%", background: "#c9a2f0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(201,162,240,0.24)" />}>
      <V c="g26-rc-unroll" l={38} t={42} w={26} h={14} d={110} par="none" vb="0 0 40 24" st={{ transformOrigin: "0% 50%" }}>{paper}</V>
      <V c="g26-rc-strike" l={44} t={42} w={10} h={12} d={340}>{shoe}</V>
      <L c="g26-rc-rosette" l={56} t={49} w={7} h={7} d={520} st={{ borderRadius: "50%", background: "#c9a2f0" }} />
      <L c="g26-rc-tail" l={57.6} t={53} w={1.8} h={9} d={620} st={{ borderRadius: "1px", background: "#c9a2f0", transformOrigin: "50% 0%" }} />
      <L c="g26-rc-tail" l={60} t={53} w={1.8} h={9} d={680} st={{ borderRadius: "1px", background: "#fff4d6", transformOrigin: "50% 0%" }} />
      <L c="g26-leanshadow" l={40} t={57} w={22} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(36,26,51,0.6)" }} />
    </Lead>
  );
}

/* --- 25. Stable Groom (t2) — THE BLANKET GOES ON ----------------------------
   The stable bolt slides, a quilted horse blanket is thrown over the knight
   and smoothed down, and loose hay drifts across the boards. Palette: #c8a06a
   / #fff4d6 / #2b1f12. */
const SG_HAY: Array<[number, number, string]> = [[40, 52, "18deg"], [51, 55, "-24deg"], [46, 58, "40deg"]];

function StableGroomScene({ role, delayMs }: SceneProps) {
  const blanket = (
    <g {...SJ}>
      <path d="M2 4h36l-4 18H6z" fill="#c8a06a" stroke="#2b1f12" strokeWidth="1.2" />
      <path d="M6 10h28M8 16h24" stroke="#fff4d6" strokeWidth="1.2" strokeDasharray="3 2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g26-sg-bolt" l={8} t={16} w={44} h={8} d={40} st={{ borderRadius: "1px", background: "#fff4d6" }} />
        <V c="g26-sg-throw" l={10} t={32} w={80} h={48} d={240} par="none" vb="0 0 40 24">{blanket}</V>
        {SG_HAY.map(([l, , rot], i) => (
          <L key={i} c="g26-sg-hay" l={l - 10} t={72 + i * 4} w={16} h={3} d={460 + i * 90} st={{ borderRadius: "999px", background: "#c8a06a", rotate: rot }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hitside" l={22} t={8} w={56} h={56} d={0}><path d={KNIGHT} fill="#fff4d6" /></V>
        <V c="g26-hit" l={10} t={38} w={80} h={44} d={150} par="none" vb="0 0 40 24">{blanket}</V>
        <L c="g26-hit2" l={30} t={80} w={40} h={4} d={260} st={{ borderRadius: "999px", background: "#c8a06a" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(200,160,106,0.24)" />}>
      <L c="g26-sg-bolt" l={40} t={35} w={12} h={2.2} d={70} st={{ borderRadius: "1px", background: "#fff4d6" }} />
      <V c="g26-sg-knight" l={45.5} t={42} w={9} h={12} d={200}><path d={KNIGHT} fill="none" stroke="#fff4d6" strokeWidth="1.4" {...SJ} /></V>
      <V c="g26-sg-throw" l={40} t={41} w={20} h={12} d={340} par="none" vb="0 0 40 24">{blanket}</V>
      <L c="g26-sg-smooth" l={40} t={46} w={20} h={3} d={560} st={{ background: "linear-gradient(90deg, transparent, #fff4d6, transparent)" }} />
      {SG_HAY.map(([l, t, rot], i) => (
        <L key={i} c="g26-sg-hay" l={l} t={t} w={4} h={1.2} d={640 + i * 100} st={{ borderRadius: "999px", background: "#c8a06a", rotate: rot }} />
      ))}
      <L c="g26-leanshadow" l={42} t={57} w={16} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(43,31,18,0.6)" }} />
    </Lead>
  );
}

/* --- 26. Stage Armor (t2) — FLOWN IN FROM THE FLIES -------------------------
   Two ropes drop out of the grid, a prop breastplate lands on the checking
   piece, the footlights flare from below and the curtain edge sways back into
   place. Palette: #e07f7f / #fff4d6 / #2a1414. */
function StageArmorScene({ role, delayMs }: SceneProps) {
  const plate = (
    <g {...SJ}>
      <path d="M5 4l7-1.6L19 4v8.4c0 4-3 7-7 9-4-2-7-5-7-9z" fill="#e07f7f" stroke="#2a1414" strokeWidth="1.2" />
      <path d="M12 4.4v15M8 9h8" stroke="#fff4d6" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        {[36, 60].map((l, i) => (
          <L key={l} c="g26-sa-rope" l={l} t={0} w={2.6} h={40} d={40 + i * 90} st={{ background: "#fff4d6", transformOrigin: "50% 0%" }} />
        ))}
        <V c="g26-sa-fly" l={26} t={26} w={48} h={58} d={250}>{plate}</V>
        <L c="g26-sa-foot" l={6} t={78} w={88} h={16} d={470} st={{ background: "linear-gradient(0deg, rgba(255,244,214,0.8), transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g26-hitside" l={48} t={0} w={4} h={36} d={0} st={{ background: "#fff4d6", transformOrigin: "50% 0%" }} />
        <V c="g26-hit" l={24} t={22} w={52} h={60} d={140}>{plate}</V>
        <L c="g26-hit2" l={10} t={80} w={80} h={12} d={260} st={{ background: "linear-gradient(0deg, rgba(255,244,214,0.8), transparent)" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <L c="g26-veil" st={{ background: "rgba(14,8,10,0.4)" }} />
          <Wash tone="rgba(224,127,127,0.28)" d={140} />
        </>
      }
    >
      {[45, 53].map((l, i) => (
        <L key={l} c="g26-sa-rope" l={l} t={26} w={1} h={20} d={70 + i * 80} st={{ background: "#fff4d6", transformOrigin: "50% 0%" }} />
      ))}
      <V c="g26-sa-fly" l={44} t={40} w={12} h={15} d={260}>{plate}</V>
      <L c="g26-sa-foot" l={36} t={54} w={28} h={7} d={480} st={{ background: "linear-gradient(0deg, rgba(255,244,214,0.85), transparent)" }} />
      <L c="g26-sa-curtain" l={32} t={30} w={9} h={32} d={560} st={{ background: "linear-gradient(90deg, #2a1414, rgba(224,127,127,0.5))", transformOrigin: "0% 0%" }} />
      <L c="g26-leanshadow" l={43} t={56} w={14} h={3} d={640} st={{ borderRadius: "999px", background: "rgba(42,20,20,0.7)" }} />
      <L c="g26-glint" l={54} t={41} w={2.6} h={2.6} d={700} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 27. Tower Inspection (t2) — THE PORTCULLIS DROPS -----------------------
   The gate teeth fall into their sockets with a jolt, the inspector's tick is
   struck across the sheet and a PASSED chalk mark is scrawled on the stone.
   Palette: #a8b8c8 / #fff4d6 / #1c242c. */
const TI_TEETH = [0, 1, 2, 3, 4];

function TowerInspectionScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        {TI_TEETH.map((i) => (
          <L key={i} c="g26-ti-drop" l={10 + i * 17} t={2} w={7} h={72} d={40 + i * 70} st={{ background: "linear-gradient(90deg, #1c242c, #a8b8c8 55%, #1c242c)", transformOrigin: "50% 0%" }} />
        ))}
        <L c="g26-ti-rail" l={6} t={68} w={88} h={6} d={430} st={{ borderRadius: "1px", background: "#a8b8c8" }} />
        <V c="g26-ent-pop" l={34} t={30} w={34} h={34} d={560}><path d="M3.4 12.6l5.2 5.4L20.6 6" fill="none" stroke="#fff4d6" strokeWidth="3" {...SJ} /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        {TI_TEETH.slice(0, 4).map((i) => (
          <L key={i} c="g26-hitside" l={14 + i * 20} t={0} w={7} h={70} d={i * 70} st={{ background: "linear-gradient(90deg, #1c242c, #a8b8c8 55%, #1c242c)", transformOrigin: "50% 0%" }} />
        ))}
        <L c="g26-hit2" l={8} t={66} w={84} h={6} d={300} st={{ borderRadius: "1px", background: "#a8b8c8" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(168,184,200,0.26)" />
          <Rim tone="rgba(168,184,200,0.3)" d={420} />
        </>
      }
    >
      <V c="g26-ti-rook" l={45.5} t={42} w={9} h={13} d={70}><path d={ROOK} fill="none" stroke="#fff4d6" strokeWidth="1.3" {...SJ} /></V>
      {TI_TEETH.map((i) => (
        <L key={i} c="g26-ti-drop" l={40 + i * 4.4} t={32} w={2.2} h={24} d={200 + i * 80} st={{ background: "linear-gradient(90deg, #1c242c, #a8b8c8 55%, #1c242c)", transformOrigin: "50% 0%" }} />
      ))}
      <L c="g26-ti-rail" l={39} t={54} w={22} h={2} d={620} st={{ borderRadius: "1px", background: "#a8b8c8" }} />
      <V c="g26-ti-tick" l={52} t={36} w={9} h={9} d={700}><path d="M3.4 12.6l5.2 5.4L20.6 6" fill="none" stroke="#fff4d6" strokeWidth="3" {...SJ} /></V>
      <L c="g26-leanshadow" l={40} t={57} w={20} h={3} d={740} st={{ borderRadius: "999px", background: "rgba(28,36,44,0.65)" }} />
    </Lead>
  );
}

/* --- 28. Victory Lap (t2) — THROUGH THE TAPE --------------------------------
   The finish tape stretches, breaks across the piece, and the laurel wreath
   drops over it while the two tape ends flutter away. Palette: #a8e07f /
   #fff4d6 / #1d2c14. */
function VictoryLapScene({ role, delayMs }: SceneProps) {
  const laurel = (
    <g fill="none" stroke="#a8e07f" strokeWidth="1.8" {...SJ}>
      <path d="M12 21.4c-5 0-8.6-4-8.6-9S6.4 3.4 11 2.6" />
      <path d="M12 21.4c5 0 8.6-4 8.6-9S17.6 3.4 13 2.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g26-vl-tape" l={0} t={46} w={100} h={6} d={40} st={{ borderRadius: "999px", background: "#fff4d6" }} />
        <L c="g26-vl-endl" l={0} t={46} w={44} h={6} d={280} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "0% 50%" }} />
        <V c="g26-vl-wreath" l={18} t={14} w={64} h={68} d={430}>{laurel}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g26-hitside" l={0} t={48} w={100} h={5} d={0} st={{ borderRadius: "999px", background: "#fff4d6" }} />
        <V c="g26-hit" l={20} t={16} w={60} h={64} d={140}>{laurel}</V>
        <L c="g26-hit2" l={38} t={72} w={24} h={4} d={260} st={{ borderRadius: "999px", background: "#a8e07f" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(168,224,127,0.26)" />}>
      <L c="g26-vl-tape" l={36} t={47} w={28} h={1.8} d={90} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <L c="g26-vl-endl" l={36} t={47} w={13} h={1.8} d={330} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "0% 50%" }} />
      <L c="g26-vl-endr" l={51} t={47} w={13} h={1.8} d={330} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "100% 50%" }} />
      <V c="g26-vl-piece" l={45.5} t={43} w={9} h={12} d={380}><path d={PAWN} fill="#fff4d6" /></V>
      <V c="g26-vl-wreath" l={42} t={39} w={16} h={18} d={520}>{laurel}</V>
      <L c="g26-leanshadow" l={43} t={57} w={14} h={3} d={640} st={{ borderRadius: "999px", background: "rgba(29,44,20,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g26-sift" l={44 + i * 6} t={44} w={1.4} h={1.4} d={700 + i * 100} st={{ borderRadius: "50%", background: "#a8e07f" }} />
      ))}
    </Lead>
  );
}

/* --- 29. Traffic Cone (t2) — CONES DOWN THE FILE ----------------------------
   Three cones bounce down the run one after another, their reflective bands
   catching the light, and a folding CLOSED sign flips upright behind them.
   Aim-staged along the file. Palette: #ff9a52 / #fff4d6 / #2c1a0c. */
const TC_CONES = [0, 1, 2];

function TrafficConeScene({ role, delayMs }: SceneProps) {
  const cone = (
    <g {...SJ}>
      <path d="M12 2.6L18.6 20H5.4z" fill="#ff9a52" stroke="#2c1a0c" strokeWidth="1.1" />
      <path d="M9 12.6h6M8 16.4h8" stroke="#fff4d6" strokeWidth="1.6" />
      <path d="M3.4 20h17.2v2.2H3.4z" fill="#2c1a0c" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        {TC_CONES.map((i) => (
          <V key={i} c="g26-tc-bounce" l={6 + i * 30} t={30} w={30} h={56} d={40 + i * 150}>{cone}</V>
        ))}
        <L c="g26-tc-sign" l={62} t={18} w={30} h={22} d={520} st={{ background: "#fff4d6", transformOrigin: "50% 100%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hitside" l={26} t={16} w={48} h={70} d={0}>{cone}</V>
        <L c="g26-hit2" l={22} t={80} w={56} h={5} d={150} st={{ borderRadius: "999px", background: "#2c1a0c" }} />
        <L c="g26-hit" l={30} t={44} w={40} h={5} d={250} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(255,154,82,0.26)" />}>
      {TC_CONES.map((i) => (
        <V key={i} c="g26-tc-bounce" l={45 + i * 7} t={43} w={7} h={12} d={140 + i * 170}>{cone}</V>
      ))}
      <L c="g26-runout" l={46} t={54} w={22} h={1.6} d={520} st={{ borderRadius: "999px", background: "#ff9a52", transformOrigin: "0% 50%" }} />
      <L c="g26-tc-sign" l={64} t={41} w={9} h={8} d={640} st={{ background: "#fff4d6", transformOrigin: "50% 100%" }} />
      <L c="g26-tc-flash" l={44} t={44} w={26} h={4} d={700} st={{ background: "linear-gradient(90deg, transparent, #fff4d6, transparent)" }} />
    </AimLead>
  );
}

/* --- 30. Doorstop (t1) — THE WEDGE BITES ------------------------------------
   A heavy door swings in from the caster's side, the wooden wedge is kicked
   under it, and the door JAMS dead with a shudder and a puff of splinters.
   Palette: #d09a5a / #fff4d6 / #2b1c0e. */
function DoorstopScene({ role, delayMs }: SceneProps) {
  const door = (
    <g {...SJ}>
      <rect x="3" y="1.6" width="18" height="20.8" rx="1" fill="#d09a5a" stroke="#2b1c0e" strokeWidth="1.2" />
      <rect x="6" y="5" width="12" height="6" rx="1" fill="none" stroke="#2b1c0e" strokeWidth="1" />
      <circle cx="17.6" cy="14" r="1.2" fill="#fff4d6" />
    </g>
  );
  const wedge = <path d="M2 20h20L4 11z" fill="#fff4d6" stroke="#2b1c0e" strokeWidth="1.2" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g26-ds-swing" l={8} t={8} w={60} h={76} d={40} st={{ transformOrigin: "6% 50%" }}>{door}</V>
        <V c="g26-ds-kick" l={54} t={58} w={40} h={30} d={280}>{wedge}</V>
        <L c="g26-ds-jolt" l={52} t={52} w={44} h={6} d={470} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hitside" l={10} t={10} w={56} h={76} d={0} st={{ transformOrigin: "6% 50%" }}>{door}</V>
        <V c="g26-hit" l={54} t={56} w={40} h={30} d={150}>{wedge}</V>
        <L c="g26-hit2" l={50} t={84} w={44} h={4} d={260} st={{ borderRadius: "999px", background: "#2b1c0e" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(208,154,90,0.24)" />}>
      <V c="g26-ds-swing" l={38} t={38} w={16} h={20} d={90} st={{ transformOrigin: "6% 50%" }}>{door}</V>
      <V c="g26-guardin" l={53} t={50} w={9} h={7} d={330}>{wedge}</V>
      <L c="g26-ds-jolt" l={40} t={49} w={22} h={2} d={520} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <L c="g26-leanshadow" l={40} t={57} w={20} h={3} d={580} st={{ borderRadius: "999px", background: "rgba(43,28,14,0.62)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g26-sift" l={52 + i * 4} t={52} w={1.5} h={1.5} d={620 + i * 90} st={{ borderRadius: "50%", background: "#d09a5a" }} />
      ))}
    </Lead>
  );
}

/* --- 31. Guardian Sprite (t1) — THE COIN DECIDES ----------------------------
   A pocket sprite flutters up, flips a coin that tumbles and lands, and
   either lifts a leaf over the pawn or shrugs in a sheepish little flash.
   Palette: #9ce8d0 / #fff4d6 / #143028. */
function GuardianSpriteScene({ role, delayMs }: SceneProps) {
  const sprite = (
    <g {...SJ}>
      <circle cx="12" cy="9" r="3.4" fill="#fff4d6" />
      <path d="M8.6 10.6C6 9.4 4 6.4 4.6 3.6c2.8-.4 5.2 1.6 6 4.2M15.4 10.6c2.6-1.2 4.6-4.2 4-7-2.8-.4-5.2 1.6-6 4.2" fill="#9ce8d0" stroke="#143028" strokeWidth="0.8" />
      <path d="M12 12.4v7" stroke="#9ce8d0" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g26-gs-flit" l={26} t={30} w={48} h={54} d={40}>{sprite}</V>
        <L c="g26-gs-coin" l={40} t={8} w={20} h={20} d={260} st={{ borderRadius: "50%", background: "#fff4d6" }} />
        <V c="g26-ent-pop" l={54} t={46} w={32} h={32} d={480}><path d="M3.4 19.4C3.4 11 8 5 15 3.4c1.6 5.6-.6 12-6 16z" fill="#9ce8d0" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g26-hitside" l={28} t={22} w={44} h={54} d={0}>{sprite}</V>
        <L c="g26-hit" l={42} t={8} w={16} h={16} d={140} st={{ borderRadius: "50%", background: "#fff4d6" }} />
        <L c="g26-hit2" l={30} t={30} w={40} h={40} d={260} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(156,232,208,0.7), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(156,232,208,0.24)" />}>
      <V c="g26-gs-flit" l={43} t={40} w={10} h={13} d={90}>{sprite}</V>
      <L c="g26-gs-coin" l={47} t={30} w={6} h={6} d={280} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      <L c="g26-gs-land" l={46} t={50} w={8} h={2} d={520} st={{ borderRadius: "999px", background: "rgba(20,48,40,0.7)" }} />
      <V c="g26-gs-leaf" l={51} t={42} w={10} h={11} d={600}>
        <path d="M3.4 19.4C3.4 11 8 5 15 3.4c1.6 5.6-.6 12-6 16z" fill="#9ce8d0" stroke="#143028" strokeWidth="1" {...SJ} />
      </V>
      <L c="g26-guardin" l={44} t={45} w={9} h={9} d={660} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.75), transparent 68%)" }} />
      <L c="g26-glint" l={54} t={36} w={2.2} h={2.2} d={720} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 32. Wet Paint (t1) — THE ROLLER GOES OVER IT ---------------------------
   A roller lays one wide glossy stripe across the square, a WET PAINT sign is
   jabbed into the boards, and a single drip runs down off the edge of the
   fresh coat. Palette: #7fb6f0 / #fff4d6 / #14243a. */
function WetPaintScene({ role, delayMs }: SceneProps) {
  const roller = (
    <g {...SJ}>
      <rect x="2" y="6" width="14" height="7" rx="1" fill="#7fb6f0" stroke="#14243a" strokeWidth="1.1" />
      <path d="M9 13v3.4h7.6V21" fill="none" stroke="#14243a" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g26-wp-stripe" l={4} t={44} w={92} h={22} d={40} st={{ background: "linear-gradient(180deg, #7fb6f0, rgba(127,182,240,0.55))", transformOrigin: "0% 50%" }} />
        <V c="g26-wp-roller" l={4} t={28} w={44} h={40} d={40}>{roller}</V>
        <V c="g26-wp-sign" l={56} t={10} w={38} h={40} d={430} st={{ transformOrigin: "50% 100%" }} par="none" vb="0 0 40 24">
          <rect x="1" y="1" width="38" height="16" rx="1" fill="#fff4d6" stroke="#14243a" strokeWidth="1.2" />
          <text x="20" y="12.6" textAnchor="middle" fontSize="8" fontWeight="700" fill="#14243a">WET PAINT</text>
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g26-hitside" l={4} t={42} w={92} h={20} d={0} st={{ background: "linear-gradient(180deg, #7fb6f0, rgba(127,182,240,0.5))", transformOrigin: "0% 50%" }} />
        <V c="g26-hit" l={8} t={26} w={40} h={38} d={130}>{roller}</V>
        <L c="g26-hit2" l={54} t={60} w={5} h={22} d={250} st={{ borderRadius: "999px", background: "#7fb6f0", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(127,182,240,0.24)" />}>
      <L c="g26-wp-stripe" l={38} t={44} w={26} h={8} d={110} st={{ background: "linear-gradient(180deg, #7fb6f0, rgba(127,182,240,0.5))", transformOrigin: "0% 50%" }} />
      <V c="g26-wp-roller" l={37} t={40} w={12} h={11} d={110}>{roller}</V>
      <L c="g26-wp-gloss" l={38} t={45} w={26} h={2} d={430} st={{ background: "linear-gradient(90deg, transparent, #fff4d6, transparent)" }} />
      <V c="g26-wp-sign" l={52} t={35} w={13} h={9} d={540} st={{ transformOrigin: "50% 100%" }} par="none" vb="0 0 40 24">
        <rect x="1" y="1" width="38" height="16" rx="1" fill="#fff4d6" stroke="#14243a" strokeWidth="1.2" />
        <text x="20" y="12.6" textAnchor="middle" fontSize="8" fontWeight="700" fill="#14243a">WET PAINT</text>
      </V>
      <L c="g26-wp-drip" l={44} t={51} w={1.6} h={7} d={680} st={{ borderRadius: "999px", background: "#7fb6f0", transformOrigin: "50% 0%" }} />
      <L c="g26-leanshadow" l={40} t={57} w={22} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(20,36,58,0.55)" }} />
    </Lead>
  );
}

/* =============================================================================
   Registry. Every entry declares an anchor; every `sound` is an existing
   SigSoundKey. `source` is deliberately omitted throughout: these cards carry
   no removal diff, so their play is the cast lead on the square they were
   played on, exactly as the generated family resolved before.
   ========================================================================== */

/** Bind one bespoke scene to its config. */
function S(Render: SigPlugin["Render"], config: SigPlugin["config"]): SigPlugin {
  return { config, Render };
}

export const PLAYS: Record<string, SigPlugin> = {
  bn4_age_of_peace: S(AgeOfPeaceScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast" }),
  bn4_guardian_of_the_line: S(GuardianOfTheLineScene, { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "wall", anchor: "aim" }),
  bn4_saints_procession: S(SaintsProcessionScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "cathedral", anchor: "aim" }),
  bn4_warding_circle: S(WardingCircleScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", anchor: "cast" }),
  ov_plot_armor: S(PlotArmorScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "cast" }),
  bn4_ancestral_shield: S(AncestralShieldScene, { ordering: "radial", staggerMs: 65, victims: "all", hasLead: true, sound: "shades", anchor: "cast" }),
  bn4_shieldmaidens: S(ShieldmaidensScene, { ordering: "octagon", staggerMs: 55, victims: "all", hasLead: true, sound: "wall", anchor: "cast" }),
  bn4_bodyguard_detail: S(BodyguardDetailScene, { ordering: "octagon", staggerMs: 50, victims: ["k", "p", "n", "b", "r", "q"], hasLead: true, sound: "aegis", anchor: "cast" }),
  bn4_color_guard: S(ColorGuardScene, { ordering: "file", staggerMs: 90, victims: ["p"], hasLead: true, sound: "coronation", anchor: "cast" }),
  bn4_old_guard: S(OldGuardScene, { ordering: "file", staggerMs: 110, victims: ["n", "b"], hasLead: true, sound: "vault", anchor: "cast" }),
  bn4_confetti_cannon: S(ConfettiCannonScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain", anchor: "cast" }),
  bn4_quilted_armor: S(QuiltedArmorScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "cast" }),
  bn4_boundary_stones: S(BoundaryStonesScene, { ordering: "line", staggerMs: 90, victims: "all", hasLead: true, sound: "petrify", anchor: "aim" }),
  bn4_pocket_shield: S(PocketShieldScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "cast" }),
  op_alley_cat: S(AlleyCatScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "blitz", anchor: "cast" }),
  op_cloister_bell: S(CloisterBellScene, { ordering: "radial", staggerMs: 70, victims: ["p"], hasLead: true, sound: "cathedral", anchor: "cast" }),
  op_debutante_ball: S(DebutanteBallScene, { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "coronation", anchor: "cast" }),
  op_first_day_badge: S(FirstDayBadgeScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "slots", anchor: "cast" }),
  op_gallery_docent: S(GalleryDocentScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "vault", anchor: "cast" }),
  op_lady_in_waiting: S(LadyInWaitingScene, { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "aegis", anchor: "cast" }),
  op_lighthouse_keeper: S(LighthouseKeeperScene, { ordering: "line", staggerMs: 60, victims: ["p"], hasLead: true, sound: "cathedral", anchor: "aim" }),
  op_ordination_day: S(OrdinationDayScene, { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "cathedral", anchor: "cast" }),
  op_parade_marshal: S(ParadeMarshalScene, { ordering: "line", staggerMs: 70, victims: ["p"], hasLead: true, sound: "siege", anchor: "aim" }),
  op_riding_certificate: S(RidingCertificateScene, { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "vault", anchor: "cast" }),
  op_stable_groom: S(StableGroomScene, { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "snooze", anchor: "cast" }),
  op_stage_armor: S(StageArmorScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "colossus", anchor: "cast" }),
  op_tower_inspection: S(TowerInspectionScene, { ordering: "radial", staggerMs: 60, victims: ["r"], hasLead: true, sound: "wall", anchor: "cast" }),
  op_victory_lap: S(VictoryLapScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "cast" }),
  ov_traffic_cone: S(TrafficConeScene, { ordering: "file", staggerMs: 80, victims: "all", hasLead: true, sound: "wall", anchor: "aim" }),
  bn4_doorstop: S(DoorstopScene, { ordering: "octagon", staggerMs: 60, victims: "all", hasLead: true, sound: "petrify", anchor: "cast" }),
  op_guardian_sprite: S(GuardianSpriteScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coinflip", anchor: "cast" }),
  ov_wet_paint: S(WetPaintScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", anchor: "cast" }),
};
