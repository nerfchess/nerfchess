// g13GaugePlays — bespoke plays for the 27 tempo / info / draft cards that used
// to share the generated `clockwork` family (one gear-and-hourglass burst, 27
// hue shifts).
//
// MODULE FICTION: THINGS THAT MEASURE, AND THE READING MATTERING. Never a gear
// and never an hourglass. Every card is a different instrument being used in
// earnest: a beam balance settling and the pointer crossing zero, a plumb bob
// hung dead true, calipers closing on a workpiece, a spirit level's bubble
// walking to centre, a litmus strip changing along its length, a tuning fork
// struck and a second one answering, a sounding lead thrown and the marks
// counted off, a theodolite sighted and clamped, a sieve shaken and the fines
// falling through. The strike is always the moment the reading is TAKEN; the
// settle is always the instrument coming to rest on its number.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g13GaugePlays.css), transform/opacity animations only, no imports from
// BoardEffects.tsx, only the SigPlugin/SigRole TYPES from sigPlugins.tsx.
//
// STAGING. Every card declares anchor "cast" or "aim", so the reading is taken
// on the square the card was played on. Board-scale layers (washes, edge gilt)
// live inside <BoardFrame>, never at a fixed percentage of the stage. The five
// instruments that measure a RUN rather than a point (theodolite, measuring
// wheel, steel tape, sounding lead, the banner rule) use <AimStage> and author
// their art pointing RIGHT.
//
// Every scene runs three beats — tell, strike, settle — in all three roles
// ("lead", "target", "entrance"), and every lead carries at least one animated
// layer driven by the geometry vars (--fx-ox/--fx-oy lean, --fx-side arrival,
// --fx-len run length). All CSS lives in g13GaugePlays.css behind `g13-`.

import "./g13GaugePlays.css";

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
const rootStyle = (d: number): CSSProperties => ({ "--g13-d": `${d}ms` }) as CSSProperties;

/** stagger + a beat offset, scaled by the Settings animation-speed var. */
const b = (ms: number): string => `calc(var(--g13-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

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

/** Cast-anchored lead: the reading is taken on the cast square. */
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
  return <L c="g13-wash" d={d} st={{ background: `radial-gradient(circle at 50% 48%, ${tone}, transparent 70%)` }} />;
}

/** Board-edge gilt, always inside a BoardFrame. */
function Rim({ tone, d = 160 }: { tone: string; d?: number }) {
  return <L c="g13-rim" d={d} st={{ boxShadow: `inset 0 0 30px 9px ${tone}` }} />;
}

/* Piece silhouettes: the workpieces an instrument is brought to bear on. */
const PAWN = "M12 4.4a2.7 2.7 0 0 1 1.6 4.9l1.8 6.4H8.6l1.8-6.4A2.7 2.7 0 0 1 12 4.4z M7.4 16.8h9.2V19.4H7.4z";
const ROOK = "M7 4.8h2.3v1.6h1.6V4.8h2.2v1.6h1.6V4.8H17v3.6h-1.2v6.8H17V19H7v-3.8h1.2V8.4H7z";
const QUEEN = "M6.4 6l1.3 3.2L9.4 6.6 12 9.4l2.6-2.8 1.7 2.6L17.6 6l-1 10.4H7.4zM7 17.4h10v2.4H7z";

/* --- 1. Backseat Gamer (t3) — THE PLUMB BOB --------------------------------
   The cord pays out over the suggested line, the brass bob swings twice and
   hangs dead true, its point kisses the board and the true vertical is scored
   in. Palette: #a9d8f0 / #fff2dc / #16283a. */
function BackseatGamerScene({ role, delayMs }: SceneProps) {
  const bob = (
    <g {...SJ}>
      <path d="M12 3v5" stroke="#fff2dc" strokeWidth="1.1" />
      <path d="M9 8h6l-3 13z" fill="#a9d8f0" stroke="#16283a" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g13-pb-cord" l={49} t={2} w={2} h={44} d={40} st={{ background: "#fff2dc", transformOrigin: "50% 0%" }} />
        <V c="g13-pb-swing" l={34} t={20} w={32} h={58} d={240} st={{ transformOrigin: "50% 4%" }}>{bob}</V>
        <L c="g13-ent-pop" l={40} t={78} w={20} h={4} d={470} st={{ borderRadius: "999px", background: "#a9d8f0" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g13-hitside" l={30} t={8} w={40} h={68} d={0}>{bob}</V>
        <L c="g13-hit2" l={44} t={74} w={12} h={12} d={150} st={{ borderRadius: "50%", background: "#fff2dc" }} />
        <L c="g13-hit" l={48} t={10} w={4} h={80} d={250} st={{ background: "#a9d8f0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(169,216,240,0.28)" /><Rim tone="rgba(255,242,220,0.3)" d={200} /></>}>
      <L c="g13-pb-cord" l={49.5} t={22} w={1} h={26} d={80} st={{ background: "#fff2dc", transformOrigin: "50% 0%" }} />
      <V c="g13-pb-swing" l={44} t={26} w={12} h={26} d={260} st={{ transformOrigin: "50% 8%" }}>{bob}</V>
      <L c="g13-leanshadow" l={44} t={53} w={12} h={3} d={520} st={{ borderRadius: "999px", background: "rgba(22,40,58,0.6)" }} />
      <L c="g13-pb-kiss" l={46.5} t={50} w={7} h={7} d={600} st={{ borderRadius: "50%", border: "2px solid #fff2dc" }} />
      <L c="g13-pb-mark" l={49.6} t={30} w={0.8} h={26} d={700} st={{ background: "#a9d8f0", transformOrigin: "50% 100%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g13-sift" l={44 + i * 6} t={52} w={1.4} h={1.4} d={780 + i * 90} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      ))}
    </Lead>
  );
}

/* --- 2. Bake Sale (t3) — THE SPRING DIAL SCALE ------------------------------
   The tray of cookies thumps onto the pan, the pan dips on its spring, the
   needle sweeps the dial, overshoots and settles on the mark while crumbs
   scatter. Palette: #f0b46a / #fff4d6 / #33210f. */
function BakeSaleScene({ role, delayMs }: SceneProps) {
  const dial = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="10" fill="#33210f" stroke="#f0b46a" strokeWidth="1.4" />
      <path d="M12 2.6v2M21.4 12h-2M12 21.4v-2M2.6 12h2M18.6 5.4l-1.4 1.4M18.6 18.6l-1.4-1.4" stroke="#fff4d6" strokeWidth="1" />
    </g>
  );
  const tray = (
    <g {...SJ}>
      <path d="M3 15h18l-1.6 4.6H4.6z" fill="#f0b46a" stroke="#33210f" strokeWidth="1.1" />
      <circle cx="8" cy="12" r="2.4" fill="#fff4d6" />
      <circle cx="13.4" cy="11.4" r="2.4" fill="#fff4d6" />
      <circle cx="17.6" cy="12.6" r="2" fill="#fff4d6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g13-ent-drop" l={16} t={6} w={68} h={44} d={40}>{tray}</V>
        <V c="g13-bs-dial" l={22} t={40} w={56} h={56} d={250}>{dial}</V>
        <L c="g13-bs-needle" l={49} t={50} w={2} h={22} d={450} st={{ background: "#fff4d6", transformOrigin: "50% 100%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g13-hitside" l={18} t={8} w={64} h={44} d={0}>{tray}</V>
        <V c="g13-hit" l={24} t={40} w={52} h={52} d={140}>{dial}</V>
        <L c="g13-hit2" l={48} t={48} w={4} h={20} d={250} st={{ background: "#fff4d6", transformOrigin: "50% 100%" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(240,180,106,0.3)" /><Rim tone="rgba(255,244,214,0.28)" d={200} /></>}>
      <V c="g13-bs-load" l={41} t={28} w={18} h={12} d={90}>{tray}</V>
      <L c="g13-bs-pan" l={40} t={40} w={20} h={2.4} d={260} st={{ borderRadius: "999px", background: "#f0b46a" }} />
      <V c="g13-bs-dial" l={40} t={42} w={20} h={20} d={340}>{dial}</V>
      <L c="g13-bs-needle" l={49.4} t={45} w={1.2} h={7} d={470} st={{ background: "#fff4d6", transformOrigin: "50% 100%" }} />
      <L c="g13-leanshadow" l={42} t={62} w={16} h={3} d={620} st={{ borderRadius: "999px", background: "rgba(51,33,15,0.62)" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g13-sift" l={41 + i * 6} t={44} w={1.6} h={1.6} d={700 + i * 100} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 3. Chat Vote (t3) — THE ANEMOMETER -------------------------------------
   The mast plants, the three cups spin up in the crowd's gust, the dial climbs
   with them and a bracket snaps around the one reading that counts. Palette:
   #8fe0d0 / #fff2dc / #123028. */
const CV_CUPS = [0, 120, 240];

function ChatVoteScene({ role, delayMs }: SceneProps) {
  const cup = (
    <g {...SJ}>
      <path d="M12 2v8" stroke="#8fe0d0" strokeWidth="1.4" />
      <path d="M7.4 1.2a4.6 4.6 0 0 0 9.2 0 4.6 4.6 0 0 1-9.2 0z" fill="#fff2dc" stroke="#123028" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g13-cv-mast" l={48} t={30} w={4} h={56} d={40} st={{ background: "#8fe0d0", transformOrigin: "50% 100%" }} />
        <V c="g13-cv-spin" l={20} t={6} w={60} h={40} d={250} st={{ transformOrigin: "50% 100%" }}>{cup}</V>
        <L c="g13-ent-pop" l={34} t={62} w={32} h={12} d={470} st={{ border: "2px solid #fff2dc" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g13-hitside" l={47} t={34} w={6} h={54} d={0} st={{ background: "#8fe0d0" }} />
        <V c="g13-hit" l={22} t={6} w={56} h={38} d={130} st={{ transformOrigin: "50% 100%" }}>{cup}</V>
        <L c="g13-hit2" l={36} t={54} w={28} h={10} d={250} st={{ border: "2px solid #fff2dc" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(143,224,208,0.3)" />}>
      <L c="g13-cv-gust" l={30} t={40} w={40} h={2} d={70} st={{ background: "linear-gradient(90deg, transparent, #8fe0d0, transparent)" }} />
      <L c="g13-cv-mast" l={49.4} t={44} w={1.2} h={14} d={180} st={{ background: "#8fe0d0", transformOrigin: "50% 100%" }} />
      {CV_CUPS.map((a, i) => (
        <P key={a} l={42} t={36} w={16} h={16} rot={`${a}deg`}>
          <V c="g13-cv-spin" w={100} h={100} d={320 + i * 60} st={{ transformOrigin: "50% 100%" }}>{cup}</V>
        </P>
      ))}
      <L c="g13-cv-dial" l={44} t={53} w={12} h={4} d={540} st={{ background: "#fff2dc", transformOrigin: "0% 50%" }} />
      <L c="g13-cv-lock" l={43} t={51.4} w={14} h={7} d={680} st={{ border: "2px solid #fff2dc" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g13-sift" l={44 + i * 6} t={48} w={1.5} h={1.5} d={760 + i * 90} st={{ borderRadius: "50%", background: "#8fe0d0" }} />
      ))}
    </Lead>
  );
}

/* --- 4. Compound Interest (t3) — THE SLIDE RULE -----------------------------
   The stock lays down, the slide runs out, the cursor hairline walks along and
   stops, and the figure under it lights up. Palette: #e3c987 / #fff4d6 /
   #2a2414. */
function CompoundInterestScene({ role, delayMs }: SceneProps) {
  const scale = (
    <g {...SJ}>
      <path d="M1 4h22v6H1z" fill="#2a2414" stroke="#e3c987" strokeWidth="1" />
      <path d="M4 4v3M7 4v2M10 4v3M13 4v2M16 4v3M19 4v2M22 4v3" stroke="#fff4d6" strokeWidth="0.8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g13-ci-body" l={6} t={26} w={88} h={30} d={40} par="none">{scale}</V>
        <V c="g13-ci-slide" l={14} t={48} w={80} h={28} d={250} par="none">{scale}</V>
        <L c="g13-ci-cursor" l={54} t={20} w={4} h={62} d={460} st={{ border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g13-hit" l={4} t={30} w={92} h={26} d={0} par="none">{scale}</V>
        <V c="g13-hitside" l={12} t={52} w={84} h={26} d={140} par="none">{scale}</V>
        <L c="g13-hit2" l={50} t={22} w={5} h={62} d={250} st={{ border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(227,201,135,0.28)" /><Rim tone="rgba(255,244,214,0.26)" d={220} /></>}>
      <V c="g13-ci-body" l={36} t={44} w={28} h={7} d={90} par="none">{scale}</V>
      <V c="g13-ci-slide" l={38} t={50} w={26} h={7} d={280} par="none">{scale}</V>
      <L c="g13-ci-cursor" l={52} t={42} w={2.4} h={17} d={470} st={{ border: "1px solid #fff4d6" }} />
      <L c="g13-ci-read" l={51} t={36} w={5} h={5} d={620} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      <L c="g13-leanshadow" l={38} t={58} w={24} h={2.6} d={660} st={{ borderRadius: "999px", background: "rgba(42,36,20,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g13-glint" l={44 + i * 7} t={40} w={2} h={2} d={720 + i * 110} st={{ borderRadius: "50%", background: "#e3c987" }} />
      ))}
    </Lead>
  );
}

/* --- 5. Draft Dodger (t3) — THE SIEVE ---------------------------------------
   The riddle shakes on its rails, the mesh flashes, the fines rain through it
   and one lump rides the rim and hops clean out over the caster's own side.
   Palette: #cfe0a0 / #fff2dc / #26301a. */
function DraftDodgerScene({ role, delayMs }: SceneProps) {
  const sieve = (
    <g {...SJ}>
      <path d="M2 6h20v3.4H2z" fill="#cfe0a0" stroke="#26301a" strokeWidth="1.1" />
      <path d="M3.6 9.4h16.8l-2.4 8H6z" fill="none" stroke="#cfe0a0" strokeWidth="1.2" />
    </g>
  );
  const mesh = (
    <g stroke="#fff2dc" strokeWidth="0.7" {...SJ}>
      <path d="M4 10h16M5 13h14M6.4 16h11.2" />
      <path d="M7 9.6v8M12 9.6v8M17 9.6v8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g13-dd-sieve" l={8} t={20} w={84} h={54} d={40}>{sieve}</V>
        <V c="g13-dd-mesh" l={8} t={20} w={84} h={54} d={250}>{mesh}</V>
        <L c="g13-dd-fines" l={46} t={62} w={4} h={4} d={470} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g13-hit" l={6} t={18} w={88} h={52} d={0}>{sieve}</V>
        <V c="g13-hitside" l={6} t={18} w={88} h={52} d={140}>{mesh}</V>
        <L c="g13-hit2" l={44} t={70} w={10} h={10} d={250} st={{ borderRadius: "50%", background: "#cfe0a0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(207,224,160,0.28)" />}>
      <V c="g13-dd-sieve" l={38} t={38} w={24} h={18} d={80}>{sieve}</V>
      <V c="g13-dd-mesh" l={38} t={38} w={24} h={18} d={300}>{mesh}</V>
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g13-dd-fines" l={41 + i * 5.4} t={50} w={1.6} h={1.6} d={420 + i * 90} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      ))}
      <V c="g13-dd-lump" l={57} t={42} w={6} h={6} d={640}><circle cx="12" cy="12" r="8" fill="#cfe0a0" stroke="#26301a" strokeWidth="1.6" /></V>
      <L c="g13-leanshadow" l={40} t={58} w={20} h={3} d={680} st={{ borderRadius: "999px", background: "rgba(38,48,26,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g13-sift" l={43 + i * 7} t={56} w={1.4} h={1.4} d={760 + i * 90} st={{ borderRadius: "50%", background: "#cfe0a0" }} />
      ))}
    </Lead>
  );
}

/* --- 6. Emote Wheel (t3) — THE THEODOLITE -----------------------------------
   Tripod legs plant, the telescope swings onto the line, the crosshair walks
   onto the mark and the clamp screw bites. Aim-staged: it sights down the real
   vector. Palette: #b9c8f0 / #fff4d6 / #1a2038. */
function EmoteWheelScene({ role, delayMs }: SceneProps) {
  const scope = (
    <g {...SJ}>
      <path d="M2 9h16l4 3-4 3H2z" fill="#b9c8f0" stroke="#1a2038" strokeWidth="1.1" />
      <path d="M6 9v6M10 9v6" stroke="#1a2038" strokeWidth="0.9" />
    </g>
  );
  const tripod = (
    <g fill="none" stroke="#b9c8f0" strokeWidth="1.4" {...SJ}>
      <path d="M12 4v8M12 12L5 22M12 12l7 10M12 12v10" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g13-tw-tripod" l={22} t={38} w={56} h={56} d={40}>{tripod}</V>
        <V c="g13-tw-scope" l={16} t={16} w={68} h={30} d={250} st={{ transformOrigin: "20% 50%" }}>{scope}</V>
        <V c="g13-tw-cross" l={56} t={12} w={34} h={34} d={470}>
          <g stroke="#fff4d6" strokeWidth="1.3" {...SJ}><path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="6" fill="none" /></g>
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g13-hitside" l={10} t={30} w={60} h={34} d={0}>{scope}</V>
        <V c="g13-hit" l={30} t={20} w={44} h={44} d={140}>
          <g stroke="#fff4d6" strokeWidth="1.4" {...SJ}><path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="5.4" fill="none" /></g>
        </V>
        <L c="g13-hit2" l={42} t={42} w={14} h={14} d={250} st={{ borderRadius: "50%", border: "2px solid #b9c8f0" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(185,200,240,0.26)" /><Rim tone="rgba(255,244,214,0.26)" d={200} /></>}>
      <L c="g13-runout" l={50} t={49.2} w={30} h={1.4} d={70} st={{ background: "linear-gradient(90deg, #fff4d6, rgba(185,200,240,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g13-tw-tripod" l={44} t={48} w={12} h={12} d={200}>{tripod}</V>
      <V c="g13-tw-scope" l={46} t={44} w={14} h={7} d={360} st={{ transformOrigin: "14% 50%" }}>{scope}</V>
      <V c="g13-tw-cross" l={62} t={44} w={8} h={8} d={540}>
        <g stroke="#fff4d6" strokeWidth="1.5" {...SJ}><path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="6" fill="none" /></g>
      </V>
      <V c="g13-tw-clamp" l={45} t={50} w={5} h={5} d={680}><circle cx="12" cy="12" r="7" fill="none" stroke="#b9c8f0" strokeWidth="3" strokeDasharray="6 4" /></V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g13-glint" l={52 + i * 5} t={46} w={1.8} h={1.8} d={740 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </AimLead>
  );
}

/* --- 7. Gold Rush (t3) — THE TOUCHSTONE -------------------------------------
   The black slab slides in, the nugget drags a streak across it, an acid drop
   falls and spreads, and the streak survives: it really is gold. Palette:
   #f2c04e / #fff4d6 / #241a08. */
function GoldRushScene({ role, delayMs }: SceneProps) {
  const nugget = <path d="M5 13l3-6 5 1.4 5.6-2L21 12l-3 7-7 1.6-5-3z" fill="#f2c04e" stroke="#241a08" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g13-gr-stone" l={10} t={44} w={80} h={30} d={40} st={{ background: "#241a08", border: "1px solid #f2c04e" }} />
        <V c="g13-ent-drop" l={30} t={8} w={40} h={40} d={250}>{nugget}</V>
        <L c="g13-gr-streak" l={18} t={54} w={62} h={6} d={470} st={{ background: "#f2c04e", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g13-hitside" l={8} t={46} w={84} h={28} d={0} st={{ background: "#241a08", border: "1px solid #f2c04e" }} />
        <V c="g13-hit" l={28} t={10} w={44} h={44} d={140}>{nugget}</V>
        <L c="g13-hit2" l={16} t={56} w={66} h={6} d={250} st={{ background: "#f2c04e", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(242,192,78,0.3)" /><Rim tone="rgba(255,244,214,0.28)" d={220} /></>}>
      <L c="g13-gr-stone" l={36} t={46} w={28} h={10} d={80} st={{ background: "#241a08", border: "1px solid #f2c04e" }} />
      <V c="g13-gr-rub" l={38} t={40} w={10} h={10} d={260}>{nugget}</V>
      <L c="g13-gr-streak" l={39} t={49.4} w={22} h={2.4} d={420} st={{ background: "#f2c04e", transformOrigin: "0% 50%" }} />
      <L c="g13-gr-drop" l={50} t={38} w={3} h={3} d={560} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      <L c="g13-gr-verdict" l={38} t={48.6} w={24} h={4} d={700} st={{ borderRadius: "999px", background: "linear-gradient(90deg, rgba(242,192,78,0), #fff4d6, rgba(242,192,78,0))" }} />
      <L c="g13-leanshadow" l={38} t={57} w={24} h={3} d={740} st={{ borderRadius: "999px", background: "rgba(36,26,8,0.62)" }} />
    </Lead>
  );
}

/* --- 8. Royal Wedding (t3) — THE RING GAUGE ---------------------------------
   The stepped mandrel stands up, two rings slide down it from the caster's own
   side and seat, each on its own step, and the size is punched beside them.
   Palette: #f0cfe0 / #fff4d6 / #2e1626. */
function RoyalWeddingScene({ role, delayMs }: SceneProps) {
  const mandrel = (
    <g {...SJ}>
      <path d="M9.6 2h4.8l1.6 6h-8zM8 8h8l1.6 6H6.4zM6.4 14h11.2l1.4 7H5z" fill="#2e1626" stroke="#f0cfe0" strokeWidth="1.1" />
    </g>
  );
  const ring = <ellipse cx="12" cy="12" rx="9.4" ry="3.6" fill="none" stroke="#f0cfe0" strokeWidth="2.4" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g13-ent-rise" l={28} t={10} w={44} h={80} d={40}>{mandrel}</V>
        <V c="g13-rw-ring" l={16} t={34} w={68} h={26} d={250}>{ring}</V>
        <L c="g13-rw-size" l={62} t={56} w={16} h={16} d={470} st={{ border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g13-hit" l={30} t={8} w={40} h={80} d={0}>{mandrel}</V>
        <V c="g13-hitside" l={14} t={38} w={72} h={26} d={140}>{ring}</V>
        <L c="g13-hit2" l={42} t={44} w={16} h={16} d={250} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(240,207,224,0.3)" /><Rim tone="rgba(255,244,214,0.28)" d={200} /></>}>
      <V c="g13-rw-mandrel" l={45} t={36} w={10} h={22} d={90}>{mandrel}</V>
      <V c="g13-rw-ring" l={40} t={40} w={20} h={8} d={280}>{ring}</V>
      <V c="g13-rw-ring" l={41} t={47} w={18} h={7} d={430}>{ring}</V>
      <L c="g13-rw-seat" l={42} t={51} w={16} h={2} d={600} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <L c="g13-rw-size" l={57} t={44} w={5} h={5} d={690} st={{ border: "2px solid #fff4d6" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g13-glint" l={43 + i * 7} t={42} w={2} h={2} d={740 + i * 90} st={{ borderRadius: "50%", background: "#f0cfe0" }} />
      ))}
    </Lead>
  );
}

/* --- 9. Tax Audit (t3) — THE BEAM BALANCE -----------------------------------
   Both pans hang, the assessor's weights thump into the near pan from the
   caster's side, the beam tips and rocks, and the pointer swings across zero
   and stops there. Palette: #d8dce8 / #fff2dc / #1c1f2b. */
function TaxAuditScene({ role, delayMs }: SceneProps) {
  const beam = (
    <g {...SJ}>
      <path d="M2 8h20" stroke="#d8dce8" strokeWidth="2" />
      <path d="M4 8v4M20 8v4M12 8V4" stroke="#d8dce8" strokeWidth="1.2" />
      <path d="M1 12h6l-3 4zM17 12h6l-3 4z" fill="#d8dce8" stroke="#1c1f2b" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g13-ta-beam" l={8} t={20} w={84} h={50} d={40} st={{ transformOrigin: "50% 34%" }}>{beam}</V>
        <V c="g13-ta-weight" l={12} t={8} w={22} h={22} d={250}><rect x="4" y="6" width="16" height="14" rx="1" fill="#fff2dc" /></V>
        <L c="g13-ta-pointer" l={49} t={54} w={2} h={30} d={470} st={{ background: "#fff2dc", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g13-hit" l={6} t={22} w={88} h={46} d={0} st={{ transformOrigin: "50% 34%" }}>{beam}</V>
        <V c="g13-hitside" l={14} t={10} w={20} h={20} d={140}><rect x="4" y="6" width="16" height="14" rx="1" fill="#fff2dc" /></V>
        <L c="g13-hit2" l={48} t={58} w={4} h={26} d={250} st={{ background: "#d8dce8", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(216,220,232,0.26)" /><Rim tone="rgba(255,242,220,0.3)" d={200} /></>}>
      <L c="g13-ta-post" l={49.4} t={34} w={1.2} h={16} d={80} st={{ background: "#d8dce8", transformOrigin: "50% 100%" }} />
      <V c="g13-ta-beam" l={38} t={36} w={24} h={14} d={240} st={{ transformOrigin: "50% 30%" }}>{beam}</V>
      <V c="g13-ta-weight" l={39} t={30} w={6} h={6} d={400}><rect x="4" y="6" width="16" height="14" rx="1" fill="#fff2dc" /></V>
      <L c="g13-ta-pointer" l={49.6} t={49} w={0.8} h={9} d={560} st={{ background: "#fff2dc", transformOrigin: "50% 0%" }} />
      <L c="g13-ta-zero" l={48} t={57} w={4} h={1.4} d={700} st={{ borderRadius: "999px", background: "#fff2dc" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g13-sift" l={42 + i * 8} t={52} w={1.5} h={1.5} d={760 + i * 90} st={{ borderRadius: "50%", background: "#d8dce8" }} />
      ))}
    </Lead>
  );
}

/* --- 10. Egg Timer (t2) — THE THERMOMETER -----------------------------------
   The tube fades up against its scale, the bulb flushes, the column climbs and
   crosses the marked line, which lights. Palette: #f09a86 / #fff2dc / #2c1410. */
function EggTimerScene({ role, delayMs }: SceneProps) {
  const tube = (
    <g {...SJ}>
      <path d="M10 2h4v14h-4z" fill="none" stroke="#f09a86" strokeWidth="1.2" />
      <circle cx="12" cy="19" r="3.6" fill="none" stroke="#f09a86" strokeWidth="1.2" />
      <path d="M15 5h3M15 8h2M15 11h3M15 14h2" stroke="#fff2dc" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g13-ent-rise" l={26} t={6} w={48} h={84} d={40}>{tube}</V>
        <L c="g13-et-column" l={45} t={20} w={5} h={54} d={250} st={{ background: "#f09a86", transformOrigin: "50% 100%" }} />
        <L c="g13-et-mark" l={36} t={26} w={30} h={3} d={470} st={{ background: "#fff2dc" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g13-hitside" l={28} t={6} w={44} h={82} d={0}>{tube}</V>
        <L c="g13-hit" l={46} t={22} w={6} h={50} d={140} st={{ background: "#f09a86", transformOrigin: "50% 100%" }} />
        <L c="g13-hit2" l={34} t={28} w={32} h={4} d={250} st={{ background: "#fff2dc" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(240,154,134,0.28)" />}>
      <V c="g13-et-tube" l={45} t={34} w={10} h={26} d={80}>{tube}</V>
      <L c="g13-et-bulb" l={47} t={54} w={6} h={6} d={260} st={{ borderRadius: "50%", background: "#f09a86" }} />
      <L c="g13-et-column" l={48.6} t={39} w={2.8} h={17} d={400} st={{ background: "#f09a86", transformOrigin: "50% 100%" }} />
      <L c="g13-et-mark" l={45} t={40} w={11} h={1.2} d={620} st={{ background: "#fff2dc" }} />
      <L c="g13-leanshadow" l={44} t={60} w={12} h={2.6} d={660} st={{ borderRadius: "999px", background: "rgba(44,20,16,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g13-glint" l={53 + i * 3} t={38 + i * 4} w={2} h={2} d={720 + i * 100} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      ))}
    </Lead>
  );
}

/* --- 11. Alt Account (t2) — THE LOUPE AND THE HALLMARK ----------------------
   The loupe swings down over the piece, a gloss runs across the lens, and the
   hallmark punched under it resolves out of nothing: whoever this is, it is
   not who it said. Palette: #b8a0e0 / #fff4d6 / #1d1630. */
function AltAccountScene({ role, delayMs }: SceneProps) {
  const loupe = (
    <g {...SJ}>
      <circle cx="10" cy="10" r="7" fill="rgba(29,22,48,0.5)" stroke="#b8a0e0" strokeWidth="1.6" />
      <path d="M15.4 15.4L22 22" stroke="#b8a0e0" strokeWidth="2" />
    </g>
  );
  const hallmark = (
    <g {...SJ}>
      <path d="M12 3l7 4v6.6c0 3.6-3 6.4-7 7.4-4-1-7-3.8-7-7.4V7z" fill="none" stroke="#fff4d6" strokeWidth="1.4" />
      <path d="M9 12l2.4 2.4L16 9.6" stroke="#fff4d6" strokeWidth="1.6" fill="none" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g13-aa-loupe" l={12} t={10} w={70} h={70} d={40} st={{ transformOrigin: "80% 80%" }}>{loupe}</V>
        <V c="g13-aa-mark" l={26} t={22} w={38} h={38} d={250}>{hallmark}</V>
        <L c="g13-aa-lens" l={20} t={18} w={44} h={44} d={460} st={{ borderRadius: "50%", background: "linear-gradient(120deg, transparent, rgba(255,244,214,0.6), transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g13-hitside" l={10} t={10} w={72} h={72} d={0} st={{ transformOrigin: "80% 80%" }}>{loupe}</V>
        <V c="g13-hit" l={24} t={22} w={40} h={40} d={140}>{hallmark}</V>
        <L c="g13-hit2" l={20} t={18} w={48} h={48} d={250} st={{ borderRadius: "50%", border: "2px solid #b8a0e0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(184,160,224,0.28)" /><Rim tone="rgba(255,244,214,0.24)" d={220} /></>}>
      <V c="g13-aa-piece" l={45} t={43} w={10} h={14} d={80}><path d={ROOK} fill="none" stroke="#b8a0e0" strokeWidth="1.4" {...SJ} /></V>
      <V c="g13-aa-loupe" l={40} t={36} w={20} h={20} d={250} st={{ transformOrigin: "80% 80%" }}>{loupe}</V>
      <L c="g13-aa-lens" l={41} t={37} w={14} h={14} d={440} st={{ borderRadius: "50%", background: "linear-gradient(120deg, transparent, rgba(255,244,214,0.6), transparent)" }} />
      <V c="g13-aa-mark" l={44} t={40} w={9} h={9} d={580}>{hallmark}</V>
      <L c="g13-leanshadow" l={42} t={58} w={16} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(29,22,48,0.62)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g13-sift" l={43 + i * 7} t={50} w={1.5} h={1.5} d={740 + i * 90} st={{ borderRadius: "50%", background: "#b8a0e0" }} />
      ))}
    </Lead>
  );
}

/* --- 12. Compost Heap (t2) — THE LITMUS STRIP -------------------------------
   The strip is dipped, the colour walks up the paper a band at a time, the
   reference chart slides in beside it and one patch is bracketed as the match.
   Palette: #a8d878 / #fff2dc / #1e2a12. */
const CH_PATCHES = [0, 1, 2, 3];

function CompostHeapScene({ role, delayMs }: SceneProps) {
  const strip = <rect x="9" y="2" width="6" height="20" rx="1" fill="#fff2dc" stroke="#1e2a12" strokeWidth="1" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g13-ent-drop" l={36} t={6} w={28} h={72} d={40}>{strip}</V>
        <L c="g13-ch-creep" l={42} t={22} w={16} h={50} d={250} st={{ background: "#a8d878", transformOrigin: "50% 100%" }} />
        <L c="g13-ch-chart" l={66} t={24} w={22} h={48} d={460} st={{ background: "linear-gradient(180deg, #a8d878, #1e2a12)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g13-hitside" l={34} t={6} w={32} h={74} d={0}>{strip}</V>
        <L c="g13-hit" l={40} t={24} w={20} h={48} d={140} st={{ background: "#a8d878", transformOrigin: "50% 100%" }} />
        <L c="g13-hit2" l={64} t={28} w={24} h={44} d={250} st={{ background: "linear-gradient(180deg, #a8d878, #1e2a12)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(168,216,120,0.28)" />}>
      <V c="g13-ch-strip" l={44} t={34} w={7} h={26} d={80}>{strip}</V>
      <L c="g13-ch-creep" l={45.4} t={40} w={4} h={18} d={280} st={{ background: "#a8d878", transformOrigin: "50% 100%" }} />
      {CH_PATCHES.map((i) => (
        <L key={i} c="g13-ch-chart" l={55} t={38 + i * 5} w={5} h={4.4} d={420 + i * 80} st={{ background: i === 2 ? "#a8d878" : "rgba(168,216,120,0.4)" }} />
      ))}
      <L c="g13-ch-match" l={54} t={47.4} w={7} h={6} d={700} st={{ border: "2px solid #fff2dc" }} />
      <L c="g13-leanshadow" l={43} t={60} w={16} h={2.6} d={740} st={{ borderRadius: "999px", background: "rgba(30,42,18,0.6)" }} />
    </Lead>
  );
}

/* --- 13. Encore (t2) — THE ANSWERING FORK -----------------------------------
   The mallet swings, the near fork is struck and shivers, the note crosses the
   board, and a second fork nobody touched shivers back all by itself. Palette:
   #9fd0e8 / #fff4d6 / #14252f. */
function EncoreScene({ role, delayMs }: SceneProps) {
  const fork = (
    <g fill="none" stroke="#9fd0e8" strokeWidth="1.8" {...SJ}>
      <path d="M8 2v10a4 4 0 0 0 8 0V2" />
      <path d="M12 16v6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g13-en-strike" l={4} t={30} w={40} h={40} d={40} st={{ transformOrigin: "10% 90%" }}>
          <path d="M4 20L16 8" stroke="#fff4d6" strokeWidth="2.4" {...SJ} /><circle cx="18" cy="6" r="4" fill="#fff4d6" />
        </V>
        <V c="g13-en-fork" l={30} t={12} w={40} h={70} d={250}>{fork}</V>
        <L c="g13-en-ring" l={26} t={22} w={48} h={48} d={470} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g13-hitside" l={28} t={10} w={44} h={72} d={0}>{fork}</V>
        <L c="g13-hit" l={22} t={22} w={56} h={56} d={140} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
        <L c="g13-hit2" l={44} t={44} w={12} h={12} d={250} st={{ borderRadius: "50%", background: "#9fd0e8" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(159,208,232,0.28)" /><Rim tone="rgba(255,244,214,0.26)" d={220} /></>}>
      <V c="g13-en-strike" l={36} t={38} w={10} h={10} d={70} st={{ transformOrigin: "10% 90%" }}>
        <path d="M4 20L16 8" stroke="#fff4d6" strokeWidth="2.4" {...SJ} /><circle cx="18" cy="6" r="4" fill="#fff4d6" />
      </V>
      <V c="g13-en-fork" l={45} t={38} w={9} h={20} d={260}>{fork}</V>
      <L c="g13-en-ring" l={40} t={38} w={20} h={20} d={420} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      <V c="g13-en-answer" l={57} t={39} w={8} h={18} d={600}>{fork}</V>
      <L c="g13-en-hum" l={55} t={44} w={12} h={1.6} d={720} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #9fd0e8, rgba(159,208,232,0))" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g13-glint" l={46 + i * 6} t={36} w={2} h={2} d={760 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 14. Prank Call (t2) — THE CONTINUITY TESTER ----------------------------
   Two crocodile clips bite the line, the wire snaps taut, the test lamp proves
   the circuit live and the buzzer answers. Palette: #f0a8c0 / #fff2dc /
   #2a1220. */
function PrankCallScene({ role, delayMs }: SceneProps) {
  const clip = (
    <g {...SJ}>
      <path d="M3 8l12 3-12 3z" fill="#f0a8c0" stroke="#2a1220" strokeWidth="1" />
      <path d="M15 9h6v4h-6z" fill="#2a1220" stroke="#f0a8c0" strokeWidth="1" />
    </g>
  );
  const bell = (
    <g {...SJ}>
      <path d="M6 17V11a6 6 0 0 1 12 0v6z" fill="#f0a8c0" stroke="#2a1220" strokeWidth="1.1" />
      <path d="M4.6 19h14.8" stroke="#fff2dc" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g13-pc-clip" l={4} t={30} w={44} h={40} d={40} st={{ transformOrigin: "20% 50%" }}>{clip}</V>
        <V c="g13-pc-buzz" l={50} t={22} w={44} h={56} d={250}>{bell}</V>
        <L c="g13-pc-lamp" l={38} t={64} w={16} h={16} d={470} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g13-hitside" l={6} t={30} w={42} h={40} d={0} st={{ transformOrigin: "20% 50%" }}>{clip}</V>
        <V c="g13-hit" l={48} t={20} w={44} h={56} d={140}>{bell}</V>
        <L c="g13-hit2" l={40} t={64} w={14} h={14} d={250} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(240,168,192,0.3)" />}>
      <L c="g13-runout" l={44} t={48.4} w={22} h={1.6} d={70} st={{ background: "linear-gradient(90deg, #f0a8c0, rgba(240,168,192,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g13-pc-clip" l={38} t={44} w={9} h={9} d={240} st={{ transformOrigin: "20% 50%" }}>{clip}</V>
      <L c="g13-pc-wire" l={44} t={48} w={14} h={1.2} d={400} st={{ background: "#fff2dc", transformOrigin: "0% 50%" }} />
      <L c="g13-pc-lamp" l={49} t={41} w={5} h={5} d={540} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      <V c="g13-pc-buzz" l={56} t={43} w={10} h={12} d={660}>{bell}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g13-glint" l={57 + i * 4} t={40 - i * 2} w={2} h={2} d={740 + i * 90} st={{ borderRadius: "50%", background: "#f0a8c0" }} />
      ))}
    </Lead>
  );
}

/* --- 15. Rubber Stamp (t2) — THE GO / NO-GO GAUGE ---------------------------
   The workpiece drops onto the bench, the GO ring slips clean over it, the
   NO-GO ring jams and shudders exactly where it should, and the inspector's
   PASS comes down. Palette: #e08a72 / #fff2dc / #2b1410. */
function RubberStampScene({ role, delayMs }: SceneProps) {
  const gauge = (col: string) => <circle cx="12" cy="12" r="8.6" fill="none" stroke={col} strokeWidth="3" />;
  const press = (
    <g {...SJ}>
      <path d="M9 2h6v5H9z" fill="#e08a72" stroke="#2b1410" strokeWidth="1" />
      <path d="M4.4 8h15.2v5H4.4z" fill="#2b1410" stroke="#e08a72" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g13-rs-go" l={8} t={22} w={44} h={44} d={40}>{gauge("#e08a72")}</V>
        <V c="g13-rs-nogo" l={48} t={26} w={44} h={44} d={250}>{gauge("#fff2dc")}</V>
        <V c="g13-rs-stamp" l={28} t={44} w={44} h={44} d={470}>{press}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g13-hitside" l={10} t={24} w={40} h={40} d={0}>{gauge("#e08a72")}</V>
        <V c="g13-hit" l={50} t={24} w={40} h={40} d={140}>{gauge("#fff2dc")}</V>
        <L c="g13-hit2" l={30} t={62} w={40} h={5} d={250} st={{ borderRadius: "999px", background: "#e08a72" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(224,138,114,0.3)" /><Rim tone="rgba(255,242,220,0.26)" d={220} /></>}>
      <V c="g13-rs-part" l={46} t={44} w={8} h={12} d={80}><path d={PAWN} fill="#fff2dc" stroke="#2b1410" strokeWidth="1" {...SJ} /></V>
      <V c="g13-rs-go" l={44} t={40} w={12} h={12} d={260}>{gauge("#e08a72")}</V>
      <V c="g13-rs-nogo" l={44} t={46} w={12} h={12} d={430}>{gauge("#fff2dc")}</V>
      <V c="g13-rs-stamp" l={45} t={34} w={10} h={12} d={600}>{press}</V>
      <L c="g13-leanshadow" l={43} t={58} w={14} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(43,20,16,0.62)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g13-sift" l={43 + i * 7} t={52} w={1.5} h={1.5} d={740 + i * 90} st={{ borderRadius: "50%", background: "#e08a72" }} />
      ))}
    </Lead>
  );
}

/* --- 16. Rube Goldberg (t2) — THE SPIRIT LEVEL ------------------------------
   The level lands across the square, one end is nudged, and the bubble runs
   the whole vial, bounces off the far line and walks back to dead centre.
   Palette: #a0e0b8 / #fff4d6 / #14301f. */
function RubeGoldbergScene({ role, delayMs }: SceneProps) {
  const body = (
    <g {...SJ}>
      <path d="M1 8h22v8H1z" fill="#14301f" stroke="#a0e0b8" strokeWidth="1.2" />
      <path d="M8 9.4h8v5.2H8z" fill="none" stroke="#a0e0b8" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g13-rg-body" l={4} t={30} w={92} h={40} d={40} par="none">{body}</V>
        <L c="g13-rg-bubble" l={30} t={42} w={12} h={16} d={250} st={{ borderRadius: "50%", background: "#fff4d6" }} />
        <L c="g13-rg-lines" l={44} t={38} w={14} h={24} d={470} st={{ borderLeft: "2px solid #a0e0b8", borderRight: "2px solid #a0e0b8" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g13-hitside" l={2} t={32} w={96} h={36} d={0} par="none">{body}</V>
        <L c="g13-hit" l={40} t={40} w={14} h={20} d={140} st={{ borderRadius: "50%", background: "#fff4d6" }} />
        <L c="g13-hit2" l={42} t={36} w={16} h={28} d={250} st={{ borderLeft: "2px solid #a0e0b8", borderRight: "2px solid #a0e0b8" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(160,224,184,0.28)" />}>
      <V c="g13-rg-body" l={36} t={46} w={28} h={9} d={80} par="none">{body}</V>
      <V c="g13-rg-tip" l={34} t={44} w={8} h={12} d={260} st={{ transformOrigin: "90% 50%" }}>
        <path d="M4 6h6v12H4z" fill="#a0e0b8" stroke="#14301f" strokeWidth="1.1" {...SJ} />
      </V>
      <L c="g13-rg-bubble" l={41} t={48} w={3.4} h={4.6} d={420} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      <L c="g13-rg-lines" l={47.4} t={46.4} w={5} h={8} d={640} st={{ borderLeft: "1px solid #a0e0b8", borderRight: "1px solid #a0e0b8" }} />
      <L c="g13-leanshadow" l={38} t={57} w={24} h={2.6} d={690} st={{ borderRadius: "999px", background: "rgba(20,48,31,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g13-sift" l={42 + i * 7} t={54} w={1.4} h={1.4} d={760 + i * 90} st={{ borderRadius: "50%", background: "#a0e0b8" }} />
      ))}
    </Lead>
  );
}

/* --- 17. Rules Lawyer (t2) — THE VERNIER CALIPER ----------------------------
   Both jaws close on the piece until they just kiss it, the vernier slides to
   its stop, and the one line where the two scales coincide flares. Measured to
   the letter. Palette: #cfd8b0 / #fff2dc / #22281a. */
function RulesLawyerScene({ role, delayMs }: SceneProps) {
  const jaw = (
    <g {...SJ}>
      <path d="M4 2h5v14H4z" fill="#cfd8b0" stroke="#22281a" strokeWidth="1.1" />
      <path d="M4 16h16v4H4z" fill="#22281a" stroke="#cfd8b0" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g13-rl-jaw" l={2} t={20} w={44} h={56} d={40}>{jaw}</V>
        <V c="g13-rl-jaw" l={54} t={20} w={44} h={56} d={220} st={{ transform: "scaleX(-1)" }}>{jaw}</V>
        <L c="g13-rl-coincide" l={46} t={16} w={8} h={66} d={460} st={{ background: "#fff2dc" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g13-hitside" l={4} t={22} w={42} h={54} d={0}>{jaw}</V>
        <V c="g13-hit" l={54} t={22} w={42} h={54} d={140} st={{ transform: "scaleX(-1)" }}>{jaw}</V>
        <L c="g13-hit2" l={46} t={18} w={7} h={62} d={250} st={{ background: "#fff2dc" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(207,216,176,0.26)" /><Rim tone="rgba(255,242,220,0.26)" d={220} /></>}>
      <V c="g13-rl-piece" l={46} t={42} w={8} h={12} d={80}><path d={QUEEN} fill="none" stroke="#fff2dc" strokeWidth="1.3" {...SJ} /></V>
      <V c="g13-rl-jaw" l={36} t={40} w={11} h={14} d={260}>{jaw}</V>
      <V c="g13-rl-jaw" l={53} t={40} w={11} h={14} d={380} st={{ transform: "scaleX(-1)" }}>{jaw}</V>
      <L c="g13-rl-vernier" l={44} t={54} w={16} h={2.4} d={540} st={{ background: "#cfd8b0", transformOrigin: "0% 50%" }} />
      <L c="g13-rl-coincide" l={51} t={52} w={1} h={7} d={700} st={{ background: "#fff2dc" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g13-glint" l={44 + i * 7} t={38} w={2} h={2} d={760 + i * 90} st={{ borderRadius: "50%", background: "#cfd8b0" }} />
      ))}
    </Lead>
  );
}

/* --- 18. Speedrun Timer (t2) — THE MEASURING WHEEL --------------------------
   The surveyor's wheel is set down and run out along the real vector, clicking
   off a mark every revolution, and the counter is read at the far end. Aim
   staged. Palette: #f0d060 / #fff4d6 / #2e2408. */
const ST_CLICKS = [0, 1, 2];

function SpeedrunTimerScene({ role, delayMs }: SceneProps) {
  const wheel = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="9.4" fill="none" stroke="#f0d060" strokeWidth="1.8" />
      <path d="M12 2.6v18.8M2.6 12h18.8M5.4 5.4l13.2 13.2M18.6 5.4L5.4 18.6" stroke="#f0d060" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g13-st-wheel" l={8} t={30} w={56} h={56} d={40}>{wheel}</V>
        <L c="g13-st-handle" l={40} t={10} w={40} h={5} d={250} st={{ background: "#fff4d6", transformOrigin: "0% 50%", rotate: "38deg" }} />
        <L c="g13-st-count" l={62} t={56} w={26} h={20} d={470} st={{ border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g13-hitside" l={20} t={20} w={60} h={60} d={0}>{wheel}</V>
        <L c="g13-hit" l={10} t={78} w={80} h={4} d={140} st={{ borderRadius: "999px", background: "#f0d060" }} />
        <L c="g13-hit2" l={42} t={40} w={16} h={16} d={250} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(240,208,96,0.28)" />}>
      <L c="g13-runout" l={48} t={53.4} w={30} h={1.6} d={70} st={{ background: "linear-gradient(90deg, #fff4d6, rgba(240,208,96,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g13-st-wheel" l={44} t={44} w={11} h={11} d={220}>{wheel}</V>
      <L c="g13-st-handle" l={41} t={38} w={12} h={1.4} d={340} st={{ background: "#fff4d6", transformOrigin: "0% 50%", rotate: "-32deg" }} />
      {ST_CLICKS.map((i) => (
        <L key={i} c="g13-st-click" l={52 + i * 6} t={52} w={1.4} h={4} d={460 + i * 130} st={{ background: "#f0d060" }} />
      ))}
      <L c="g13-st-count" l={62} t={46} w={7} h={5} d={700} st={{ border: "2px solid #fff4d6" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g13-sift" l={46 + i * 6} t={56} w={1.4} h={1.4} d={760 + i * 90} st={{ borderRadius: "50%", background: "#f0d060" }} />
      ))}
    </AimLead>
  );
}

/* --- 19. Sponsored Segment (t2) — THE YARDSTICK -----------------------------
   The brass-tacked measuring rule slaps down along the vector, the banner
   unrolls against it as far as the run is long, the tacks light one by one and
   the shears close on the mark. Palette: #f0a030 / #fff2dc / #2d1a06. */
const SS_TACKS = [0, 1, 2];

function SponsoredSegmentScene({ role, delayMs }: SceneProps) {
  const shears = (
    <g fill="none" stroke="#f0a030" strokeWidth="1.8" {...SJ}>
      <path d="M4 3l12 14M4 21l12-14" />
      <circle cx="19" cy="17.6" r="2.6" />
      <circle cx="19" cy="6.4" r="2.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g13-ss-rule" l={4} t={56} w={90} h={12} d={40} st={{ background: "#2d1a06", borderTop: "2px solid #f0a030", transformOrigin: "0% 50%" }} />
        <L c="g13-ss-banner" l={6} t={22} w={70} h={30} d={250} st={{ background: "linear-gradient(90deg, #f0a030, rgba(240,160,48,0.2))", transformOrigin: "0% 50%" }} />
        <V c="g13-ss-shear" l={58} t={16} w={38} h={38} d={470} st={{ transformOrigin: "80% 50%" }}>{shears}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g13-hitside" l={4} t={58} w={92} h={8} d={0} st={{ background: "#f0a030" }} />
        <L c="g13-hit" l={6} t={26} w={68} h={26} d={140} st={{ background: "linear-gradient(90deg, #f0a030, rgba(240,160,48,0.2))", transformOrigin: "0% 50%" }} />
        <V c="g13-hit2" l={56} t={20} w={40} h={40} d={250}>{shears}</V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(240,160,48,0.28)" /><Rim tone="rgba(255,242,220,0.26)" d={220} /></>}>
      <L c="g13-ss-rule" l={48} t={52} w={30} h={2.4} d={80} st={{ background: "#2d1a06", borderTop: "2px solid #f0a030", transformOrigin: "0% 50%" }} />
      <L c="g13-ss-banner" l={48} t={43} w={12} h={8} d={280} st={{ background: "linear-gradient(90deg, #f0a030, rgba(240,160,48,0.15))", transformOrigin: "0% 50%" }} />
      {SS_TACKS.map((i) => (
        <L key={i} c="g13-ss-tack" l={51 + i * 6} t={51.6} w={1.6} h={1.6} d={440 + i * 120} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      ))}
      <V c="g13-ss-shear" l={64} t={42} w={9} h={9} d={680} st={{ transformOrigin: "80% 50%" }}>{shears}</V>
      <L c="g13-ss-cut" l={66} t={44} w={1.2} h={9} d={760} st={{ background: "#fff2dc" }} />
    </AimLead>
  );
}

/* --- 20. Hairline Crack (t1) — THE DYE PENETRANT TEST -----------------------
   Penetrant is wiped across the piece, developer dusted over it, and the flaw
   nobody could see blooms out along its whole length. Palette: #f26a5a /
   #fff2dc / #2a1010. */
function HairlineCrackScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g13-hc-wipe" l={4} t={26} w={92} h={40} d={40} st={{ background: "linear-gradient(90deg, transparent, #f26a5a, transparent)" }} />
        <L c="g13-hc-dust" l={12} t={20} w={76} h={56} d={250} st={{ background: "rgba(255,242,220,0.4)" }} />
        <L c="g13-hc-bloom" l={16} t={44} w={68} h={4} d={470} st={{ background: "#f26a5a", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g13-hitside" l={6} t={24} w={88} h={44} d={0} st={{ background: "rgba(242,106,90,0.5)" }} />
        <L c="g13-hit" l={14} t={46} w={72} h={4} d={140} st={{ background: "#f26a5a", transformOrigin: "0% 50%" }} />
        <L c="g13-hit2" l={40} t={40} w={16} h={16} d={250} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(242,106,90,0.3)" /><Rim tone="rgba(255,242,220,0.28)" d={220} /></>}>
      <V c="g13-hc-piece" l={45} t={42} w={10} h={14} d={80}><path d={ROOK} fill="none" stroke="#fff2dc" strokeWidth="1.3" {...SJ} /></V>
      <L c="g13-hc-wipe" l={40} t={40} w={20} h={18} d={230} st={{ background: "linear-gradient(90deg, transparent, #f26a5a, transparent)" }} />
      <L c="g13-hc-dust" l={41} t={41} w={18} h={16} d={380} st={{ background: "rgba(255,242,220,0.42)" }} />
      <L c="g13-hc-bloom" l={44} t={47} w={13} h={1.4} d={560} st={{ background: "#f26a5a", transformOrigin: "0% 50%" }} />
      <L c="g13-leanshadow" l={43} t={58} w={14} h={2.6} d={660} st={{ borderRadius: "999px", background: "rgba(42,16,16,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g13-sift" l={44 + i * 6} t={50} w={1.4} h={1.4} d={740 + i * 90} st={{ borderRadius: "50%", background: "#f26a5a" }} />
      ))}
    </Lead>
  );
}

/* --- 21. Pinch of Sand (t1) — THE FLOW CONE ---------------------------------
   A measured pinch is tipped into the flow cone, the stream runs, the pile
   builds under it and stops exactly on the datum mark. Palette: #e8cf9a /
   #fff4d6 / #2a2113. */
function PinchOfSandScene({ role, delayMs }: SceneProps) {
  const cone = (
    <g {...SJ}>
      <path d="M3 4h18l-7 10h-4z" fill="none" stroke="#e8cf9a" strokeWidth="1.6" />
      <path d="M4 4v-2M20 4v-2M12 14v4" stroke="#e8cf9a" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g13-ent-rise" l={16} t={8} w={68} h={54} d={40}>{cone}</V>
        <L c="g13-ps-stream" l={47} t={44} w={5} h={34} d={250} st={{ background: "#e8cf9a", transformOrigin: "50% 0%" }} />
        <L c="g13-ps-pile" l={30} t={66} w={40} h={20} d={470} st={{ background: "#fff4d6", transformOrigin: "50% 100%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g13-hitside" l={18} t={8} w={64} h={52} d={0}>{cone}</V>
        <L c="g13-hit" l={46} t={46} w={7} h={30} d={140} st={{ background: "#e8cf9a", transformOrigin: "50% 0%" }} />
        <L c="g13-hit2" l={32} t={68} w={36} h={16} d={250} st={{ background: "#fff4d6", transformOrigin: "50% 100%" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(232,207,154,0.28)" />}>
      <V c="g13-ps-cone" l={43} t={34} w={14} h={14} d={80}>{cone}</V>
      <L c="g13-ps-stream" l={49.4} t={45} w={1.4} h={9} d={280} st={{ background: "#e8cf9a", transformOrigin: "50% 0%" }} />
      <L c="g13-ps-pile" l={45} t={52} w={10} h={5} d={470} st={{ background: "#fff4d6", transformOrigin: "50% 100%" }} />
      <L c="g13-ps-datum" l={44} t={52} w={12} h={1.2} d={640} st={{ background: "#fff4d6" }} />
      <L c="g13-leanshadow" l={43} t={58} w={14} h={2.6} d={700} st={{ borderRadius: "999px", background: "rgba(42,33,19,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g13-sift" l={45 + i * 5} t={48} w={1.4} h={1.4} d={760 + i * 90} st={{ borderRadius: "50%", background: "#e8cf9a" }} />
      ))}
    </Lead>
  );
}

/* --- 22. Stutter Step (t1) — THE DIVIDERS -----------------------------------
   The rule runs out, the dividers step off two equal paces and prick a tick at
   each, then the leg jams on the third and a bar drops across it: that step is
   not allowed. Palette: #b0c0d8 / #fff2dc / #1a2130. */
const SP_TICKS = [0, 1, 2];

function StutterStepScene({ role, delayMs }: SceneProps) {
  const dividers = (
    <g fill="none" stroke="#b0c0d8" strokeWidth="1.8" {...SJ}>
      <path d="M12 2v5M12 7L6 21M12 7l6 14" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g13-sp-rule" l={4} t={70} w={92} h={6} d={40} st={{ background: "#b0c0d8", transformOrigin: "0% 50%" }} />
        <V c="g13-sp-div" l={20} t={10} w={44} h={62} d={250} st={{ transformOrigin: "50% 8%" }}>{dividers}</V>
        <L c="g13-sp-bar" l={56} t={20} w={8} h={56} d={470} st={{ background: "#fff2dc" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g13-hitside" l={22} t={10} w={44} h={64} d={0} st={{ transformOrigin: "50% 8%" }}>{dividers}</V>
        <L c="g13-hit" l={10} t={74} w={80} h={4} d={140} st={{ background: "#b0c0d8" }} />
        <L c="g13-hit2" l={54} t={22} w={7} h={54} d={250} st={{ background: "#fff2dc" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(176,192,216,0.26)" /><Rim tone="rgba(255,242,220,0.26)" d={220} /></>}>
      <L c="g13-runout" l={44} t={55} w={22} h={1.4} d={70} st={{ background: "linear-gradient(90deg, #b0c0d8, rgba(176,192,216,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g13-sp-div" l={44} t={40} w={10} h={16} d={240} st={{ transformOrigin: "50% 8%" }}>{dividers}</V>
      {SP_TICKS.map((i) => (
        <L key={i} c="g13-sp-tick" l={46 + i * 5} t={53} w={1.2} h={4} d={380 + i * 120} st={{ background: "#fff2dc" }} />
      ))}
      <L c="g13-sp-stick" l={54} t={44} w={6} h={12} d={660} st={{ border: "2px solid #fff2dc" }} />
      <L c="g13-sp-bar" l={56} t={42} w={1.6} h={16} d={740} st={{ background: "#fff2dc" }} />
    </Lead>
  );
}

/* --- 23. Understudy (t1) — THE PROFILE GAUGE --------------------------------
   The contour comb is pressed onto the pawn, its pins take the shape one row
   at a time, and the profile lifts away as a copy that can stand in later.
   Palette: #d8c0f0 / #fff4d6 / #241a33. */
const US_PINS = [0, 1, 2, 3, 4];

function UnderstudyScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g13-us-pawn" l={30} t={26} w={40} h={56} d={40}><path d={PAWN} fill="none" stroke="#d8c0f0" strokeWidth="1.4" {...SJ} /></V>
        {US_PINS.slice(0, 4).map((i) => (
          <L key={i} c="g13-us-pins" l={26 + i * 12} t={8} w={6} h={28} d={250 + i * 70} st={{ background: "#fff4d6", transformOrigin: "50% 0%" }} />
        ))}
        <L c="g13-us-comb" l={20} t={4} w={62} h={8} d={470} st={{ background: "#d8c0f0" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g13-hitside" l={30} t={28} w={40} h={54} d={0}><path d={PAWN} fill="#d8c0f0" /></V>
        <L c="g13-hit" l={22} t={10} w={56} h={8} d={140} st={{ background: "#fff4d6" }} />
        <L c="g13-hit2" l={40} t={20} w={20} h={20} d={250} st={{ borderRadius: "50%", background: "#d8c0f0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(216,192,240,0.28)" />}>
      <V c="g13-us-pawn" l={45} t={43} w={10} h={14} d={80}><path d={PAWN} fill="none" stroke="#fff4d6" strokeWidth="1.4" {...SJ} /></V>
      <L c="g13-us-comb" l={42} t={36} w={16} h={2.4} d={260} st={{ background: "#d8c0f0" }} />
      {US_PINS.map((i) => (
        <L key={i} c="g13-us-pins" l={43 + i * 3} t={38} w={1.2} h={7} d={400 + i * 70} st={{ background: "#d8c0f0", transformOrigin: "50% 0%" }} />
      ))}
      <V c="g13-us-copy" l={55} t={43} w={9} h={13} d={680}><path d={PAWN} fill="#d8c0f0" stroke="#241a33" strokeWidth="1" {...SJ} /></V>
      <L c="g13-leanshadow" l={43} t={58} w={14} h={2.6} d={720} st={{ borderRadius: "999px", background: "rgba(36,26,51,0.6)" }} />
      <L c="g13-glint" l={57} t={40} w={2.2} h={2.2} d={780} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 24. Barometer Falling (t1) — THE ANEROID -------------------------------
   The case fades up, a knuckle taps the glass, and the needle drops away from
   the brass set hand and keeps going, down into the storm sector. Palette:
   #8fb0d0 / #fff2dc / #16222f. */
function BarometerFallingScene({ role, delayMs }: SceneProps) {
  const face = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="10" fill="#16222f" stroke="#8fb0d0" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="7.4" fill="none" stroke="#8fb0d0" strokeWidth="0.7" strokeDasharray="1.4 2.2" />
      <circle cx="12" cy="12" r="1.4" fill="#fff2dc" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g13-bf-case" l={14} t={14} w={72} h={72} d={40}>{face}</V>
        <L c="g13-bf-set" l={49} t={26} w={2} h={26} d={250} st={{ background: "#fff2dc", transformOrigin: "50% 100%" }} />
        <L c="g13-bf-needle" l={49} t={26} w={3} h={26} d={460} st={{ background: "#8fb0d0", transformOrigin: "50% 100%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g13-hit" l={16} t={16} w={68} h={68} d={0}>{face}</V>
        <L c="g13-hitside" l={48} t={28} w={4} h={24} d={140} st={{ background: "#8fb0d0", transformOrigin: "50% 100%" }} />
        <L c="g13-hit2" l={30} t={62} w={40} h={8} d={250} st={{ borderRadius: "999px", background: "#fff2dc" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(143,176,208,0.28)" /><Rim tone="rgba(255,242,220,0.26)" d={220} /></>}>
      <V c="g13-bf-case" l={42} t={38} w={16} h={16} d={80}>{face}</V>
      <L c="g13-bf-tap" l={47} t={34} w={6} h={6} d={240} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      <L c="g13-bf-set" l={49.7} t={42} w={0.8} h={6} d={380} st={{ background: "#fff2dc", transformOrigin: "50% 100%" }} />
      <L c="g13-bf-needle" l={49.6} t={42} w={1.2} h={6} d={540} st={{ background: "#8fb0d0", transformOrigin: "50% 100%" }} />
      <L c="g13-bf-storm" l={43} t={47} w={7} h={5} d={700} st={{ background: "rgba(143,176,208,0.6)" }} />
      <L c="g13-leanshadow" l={42} t={55} w={16} h={3} d={760} st={{ borderRadius: "999px", background: "rgba(22,34,47,0.62)" }} />
    </Lead>
  );
}

/* --- 25. Coach's Whistle (t1) — THE STEEL TAPE ------------------------------
   The case is planted on the square, the blade shoots out down the line as far
   as the run goes, the hook catches the far mark and the lock is thumbed down.
   Aim staged. Palette: #f0e0a0 / #fff4d6 / #2c2810. */
function CoachsWhistleScene({ role, delayMs }: SceneProps) {
  const caseBody = (
    <g {...SJ}>
      <path d="M3 6h18v12H3z" fill="#2c2810" stroke="#f0e0a0" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="#f0e0a0" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g13-ent-drop" l={4} t={30} w={40} h={40} d={40}>{caseBody}</V>
        <L c="g13-cw-blade" l={30} t={44} w={64} h={8} d={250} st={{ background: "#f0e0a0", transformOrigin: "0% 50%" }} />
        <L c="g13-cw-hook" l={84} t={34} w={8} h={28} d={470} st={{ background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g13-hitside" l={6} t={30} w={38} h={38} d={0}>{caseBody}</V>
        <L c="g13-hit" l={30} t={46} w={62} h={6} d={140} st={{ background: "#f0e0a0", transformOrigin: "0% 50%" }} />
        <L c="g13-hit2" l={82} t={36} w={8} h={26} d={250} st={{ background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(240,224,160,0.28)" />}>
      <V c="g13-cw-case" l={44} t={45} w={9} h={9} d={80}>{caseBody}</V>
      <L c="g13-runout" l={51} t={48.6} w={30} h={2} d={260} st={{ background: "linear-gradient(90deg, #f0e0a0, rgba(240,224,160,0.15))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <L c="g13-cw-hook" l={64} t={45} w={1.6} h={9} d={500} st={{ background: "#fff4d6" }} />
      <L c="g13-cw-lock" l={46} t={43} w={4} h={3} d={640} st={{ background: "#fff4d6" }} />
      <L c="g13-cw-mark" l={60} t={40} w={5} h={4} d={720} st={{ border: "2px solid #fff4d6" }} />
      <L c="g13-glint" l={57} t={52} w={2.2} h={2.2} d={780} st={{ borderRadius: "50%", background: "#f0e0a0" }} />
    </AimLead>
  );
}

/* --- 26. Curfew Patrol (t1) — THE SOUNDING LEAD -----------------------------
   The leadsman swings the weight, heaves it out ahead of the boat, the line
   runs out along the vector and the leather marks are counted off as the depth
   is called. Aim staged. Palette: #7fc0c8 / #fff2dc / #10262c. */
const CP_MARKS = [0, 1, 2];

function CurfewPatrolScene({ role, delayMs }: SceneProps) {
  const lead = (
    <g {...SJ}>
      <path d="M12 2v6" stroke="#fff2dc" strokeWidth="1.2" />
      <path d="M8.6 8h6.8l1.2 12H7.4z" fill="#7fc0c8" stroke="#10262c" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g13-cp-swing" l={26} t={10} w={44} h={60} d={40} st={{ transformOrigin: "50% 0%" }}>{lead}</V>
        <L c="g13-cp-line" l={20} t={64} w={64} h={4} d={250} st={{ background: "#fff2dc", transformOrigin: "0% 50%" }} />
        <L c="g13-cp-splash" l={62} t={56} w={28} h={28} d={470} st={{ borderRadius: "50%", border: "2px solid #7fc0c8" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g13-hitside" l={28} t={8} w={42} h={62} d={0} st={{ transformOrigin: "50% 0%" }}>{lead}</V>
        <L c="g13-hit" l={18} t={66} w={66} h={4} d={140} st={{ background: "#fff2dc", transformOrigin: "0% 50%" }} />
        <L c="g13-hit2" l={60} t={56} w={30} h={30} d={250} st={{ borderRadius: "50%", border: "2px solid #7fc0c8" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(127,192,200,0.28)" /><Rim tone="rgba(255,242,220,0.26)" d={220} /></>}>
      <V c="g13-cp-swing" l={44} t={38} w={9} h={14} d={80} st={{ transformOrigin: "50% 0%" }}>{lead}</V>
      <L c="g13-runout" l={50} t={48.6} w={30} h={1.6} d={280} st={{ background: "linear-gradient(90deg, #fff2dc, rgba(127,192,200,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g13-cp-heave" l={60} t={44} w={8} h={12} d={440}>{lead}</V>
      {CP_MARKS.map((i) => (
        <L key={i} c="g13-cp-marks" l={53 + i * 5} t={47} w={1.4} h={4} d={560 + i * 110} st={{ background: "#7fc0c8" }} />
      ))}
      <L c="g13-cp-splash" l={61} t={50} w={9} h={9} d={760} st={{ borderRadius: "50%", border: "2px solid #fff2dc" }} />
    </AimLead>
  );
}

/* --- 27. Early Bird (t1) — THE SUNDIAL --------------------------------------
   The dial plate resolves out of the grey, the gnomon stands, and its shadow
   swings across onto the early hour line, which lights. A lark lifts off the
   plate. Palette: #f0b850 / #fff4d6 / #2b1d08. */
const EB_HOURS = [-60, -30, 0, 30, 60];

function EarlyBirdScene({ role, delayMs }: SceneProps) {
  const lark = (
    <path d="M3 14.4c4.4 1.2 7.6-.9 9.4-5.3 1.2 3.5 4.4 5.1 9.6 4.1-3.2 4.4-8.4 7.2-13.4 6-3.2-.8-5.4-2.4-5.6-4.8z" fill="#fff4d6" />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g13-eb-plate" l={12} t={40} w={76} h={46} d={40} st={{ borderRadius: "50%", border: "2px solid #f0b850" }} />
        <V c="g13-eb-gnomon" l={38} t={22} w={26} h={44} d={250} st={{ transformOrigin: "50% 100%" }}>
          <path d="M4 22L20 4v18z" fill="#f0b850" stroke="#2b1d08" strokeWidth="1.1" {...SJ} />
        </V>
        <V c="g13-ent-mote" l={54} t={6} w={32} h={32} d={470}>{lark}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g13-hit" l={14} t={42} w={72} h={42} d={0} st={{ borderRadius: "50%", border: "2px solid #f0b850" }} />
        <V c="g13-hitside" l={38} t={24} w={24} h={42} d={140} st={{ transformOrigin: "50% 100%" }}>
          <path d="M4 22L20 4v18z" fill="#f0b850" stroke="#2b1d08" strokeWidth="1.1" {...SJ} />
        </V>
        <L c="g13-hit2" l={44} t={60} w={30} h={4} d={250} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(240,184,80,0.3)" />}>
      <L c="g13-eb-plate" l={40} t={44} w={20} h={14} d={80} st={{ borderRadius: "50%", border: "2px solid #f0b850" }} />
      {EB_HOURS.map((a, i) => (
        <P key={a} l={44} t={44} w={12} h={12} rot={`${a}deg`}>
          <L c="g13-eb-hour" w={100} h={100} d={240 + i * 60} st={{ borderTop: "1px solid #f0b850" }} />
        </P>
      ))}
      <V c="g13-eb-gnomon" l={46} t={39} w={8} h={12} d={420} st={{ transformOrigin: "50% 100%" }}>
        <path d="M4 22L20 4v18z" fill="#f0b850" stroke="#2b1d08" strokeWidth="1.1" {...SJ} />
      </V>
      <L c="g13-eb-shadow" l={50} t={50} w={11} h={1.6} d={580} st={{ background: "linear-gradient(90deg, rgba(43,29,8,0.8), transparent)", transformOrigin: "0% 50%" }} />
      <L c="g13-eb-numeral" l={57} t={47} w={4} h={4} d={700} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      <V c="g13-eb-lark" l={52} t={34} w={10} h={10} d={780}>{lark}</V>
    </Lead>
  );
}

/* =============================================================================
   Registry. Keys sit at exactly two spaces of indent (parsed as text by
   scripts/audit-animations.ts and scripts/check-sig-plugins.cjs).
   ========================================================================== */

/* =============================================================================
   FLAGSHIP IMPACT PASS — every gauge BLOWS ITS NEEDLE past the peg.

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

/** A gauge face with its needle hard past the peg: what the blow ruins. */
const impDial = (fill: string, edge: string): ReactNode => (
  <>
    <circle cx="12" cy="12" r="7.6" fill={fill} stroke={edge} strokeWidth="1.3" />
    <path d="M12 12L17.2 6.6M12 12l-3 4.4" stroke={edge} strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="12" cy="12" r="1.4" fill={edge} />
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
  ov_backseat_gamer: S(BackseatGamerScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "cast" }, { rgb: "169 216 240", at: 560, laser: true, shock: true, box: [43, 36, 14, 15], rot: 14 }),
  ov_bake_sale: S(BakeSaleScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "chips", anchor: "board" }, { rgb: "240 180 106", at: 520, shock: true, box: [43, 39, 14, 12] }),
  ov_chat_vote: S(ChatVoteScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "chips", anchor: "cast" }, { rgb: "143 224 208", at: 600, laser: true, box: [44, 35, 12, 16] }),
  ov_compound_interest: S(CompoundInterestScene, { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "vault", anchor: "board" }, { rgb: "227 201 135", at: 640, glyph: impDial("#e3c987", "#2a2414"), shock: true, box: [42, 37, 15, 14] }),
  ov_draft_dodger: S(DraftDodgerScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "chips", anchor: "cast" }, { rgb: "207 224 160", at: 480, shock: true, box: [44, 40, 12, 11] }),
  ov_emote_wheel: S(EmoteWheelScene, { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "siege", anchor: "aim" }, { rgb: "185 200 240", at: 520, laser: true, box: [44, 36, 12, 15], rot: -16 }),
  ov_gold_rush: S(GoldRushScene, { ordering: "radial", staggerMs: 70, victims: "all", hasLead: true, sound: "chips", anchor: "board" }, { rgb: "242 192 78", at: 700, laser: true, glyph: impDial("#f2c04e", "#241a08"), shock: true, box: [41, 34, 17, 17] }),
  ov_royal_wedding: S(RoyalWeddingScene, { ordering: "radial", staggerMs: 60, victims: ["k", "q", "p"], hasLead: true, sound: "vault", anchor: "board" }, { rgb: "240 207 224", at: 620, laser: true, shock: true, box: [43, 37, 14, 15] }),
  ov_tax_audit: S(TaxAuditScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "vault", anchor: "board" }, { rgb: "216 220 232", at: 560, glyph: impDial("#d8dce8", "#1c1f2b"), box: [43, 38, 13, 13] }),
  bn4_egg_timer: S(EggTimerScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }, { rgb: "240 154 134", at: 500, shock: true, box: [44, 39, 12, 12] }),
  ov_alt_account: S(AltAccountScene, { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "vault", anchor: "board" }, { rgb: "184 160 224", at: 460, laser: true, box: [44, 37, 12, 14], rot: 10 }),
  ov_compost_heap: S(CompostHeapScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "clockice", anchor: "cast" }, { rgb: "168 216 120", at: 440, shock: true, box: [43, 41, 13, 11] }),
  ov_encore: S(EncoreScene, { ordering: "radial", staggerMs: 70, victims: "all", hasLead: true, sound: "clockcage", anchor: "cast" }, { rgb: "159 208 232", at: 520, glyph: impDial("#9fd0e8", "#2d3a41"), box: [44, 38, 12, 12] }),
  ov_prank_call: S(PrankCallScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "board" }, { rgb: "240 168 192", at: 420, shock: true, box: [45, 39, 11, 11] }),
  ov_rubber_stamp: S(RubberStampScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "vault", anchor: "board" }, { rgb: "224 138 114", at: 560, glyph: impDial("#e08a72", "#2b1410"), shock: true, box: [43, 38, 14, 13] }),
  ov_rube_goldberg: S(RubeGoldbergScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "blitz", anchor: "cast" }, { rgb: "160 224 184", at: 600, laser: true, shock: true, box: [42, 36, 14, 16], rot: -8 }),
  ov_rules_lawyer: S(RulesLawyerScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }, { rgb: "207 216 176", at: 540, laser: true, box: [44, 36, 12, 15] }),
  ov_speedrun_timer: S(SpeedrunTimerScene, { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }, { rgb: "240 208 96", at: 380, shock: true, box: [45, 40, 10, 10] }),
  ov_sponsored_segment: S(SponsoredSegmentScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "chips", anchor: "board" }, { rgb: "240 160 48", at: 580, laser: true, box: [43, 35, 13, 16] }),
  bn4_hairline_crack: S(HairlineCrackScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockice", anchor: "cast" }, { rgb: "242 106 90", at: 480, glyph: impDial("#f26a5a", "#441e19"), box: [44, 38, 12, 13] }),
  bn4_pinch_of_sand: S(PinchOfSandScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }, { rgb: "232 207 154", at: 400, shock: true, box: [45, 41, 11, 10] }),
  bn4_stutter_step: S(StutterStepScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "blitz", anchor: "board" }, { rgb: "176 192 216", at: 460, shock: true, box: [42, 40, 14, 10] }),
  bn4_understudy: S(UnderstudyScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "vault", anchor: "cast" }, { rgb: "216 192 240", at: 500, laser: true, box: [44, 36, 12, 14] }),
  op_barometer_falling: S(BarometerFallingScene, { ordering: "radial", staggerMs: 60, victims: ["r"], hasLead: true, sound: "clockice", anchor: "board" }, { rgb: "143 176 208", at: 620, glyph: impDial("#8fb0d0", "#16222f"), shock: true, box: [43, 36, 14, 15] }),
  op_coachs_whistle: S(CoachsWhistleScene, { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, { rgb: "240 224 160", at: 430, shock: true, box: [44, 39, 12, 12] }),
  op_curfew_patrol: S(CurfewPatrolScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "siege", anchor: "board" }, { rgb: "127 192 200", at: 470, laser: true, box: [44, 37, 12, 14], rot: -6 }),
  op_early_bird: S(EarlyBirdScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }, { rgb: "240 184 80", at: 450, shock: true, box: [43, 40, 13, 11] }),
};
