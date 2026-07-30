// g16ArchivePlays — bespoke plays for the 25 rule / edict / record cards that
// used to share the generated `scrollUnfurl` family (one unrolling scroll, 25
// hue shifts).
//
// MODULE FICTION: THE ARCHIVE AND ITS KEEPERS. Never a scroll. Every card is a
// different ACT of filing, finding or destroying a record: a card index drawer
// pulled and one card flagged up, carbon flimsies peeled apart, a rotary card
// wheel spun to a stop, a microfilm reel rewound, a wax tablet smoothed flat
// with the back of a stylus, a pneumatic capsule thumping into its cradle, a
// shredder's teeth taking a duplicate, a palimpsest scraped and rewritten over
// its own ghost, a paper dart flicked down the corridor, a lantern walked along
// a shelf of spines, a page torn out along a straightedge and bound in tape, a
// time clock punching a card, an inkwell going over, a rubber stamp inked and
// slammed, a book chained to its desk, gold leaf laid and burnished, a pulping
// vat and a fresh sheet lifted from the mould, a damp proof peeled off the
// press, a pigeonhole letter pushed through and its seal broken, a bonfire of
// spoiled paper with one page escaping upward, a ledger line ruled and the
// entry struck through twice, a binder's press screwed down, a hold slip laid
// in a reserved volume, a typed gummed label pasted on a spine, and pounce sand
// shaken over a doodle in the margin.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g16ArchivePlays.css), transform/opacity animations only, no imports from
// BoardEffects.tsx, only the SigPlugin/SigRole TYPES from sigPlugins.tsx.
//
// STAGING. Every card declares anchor "cast" or "aim", so the scene happens on
// the square the card was played on. Board-scale layers (the desk-lamp wash,
// the edge gilt, the four centre marks Hearth Blessing lights) live inside
// <BoardFrame>, never at a fixed percentage of the stage. The cards whose
// fiction travels — a broom sweeping a rank, a dart flicked at a pawn, a letter
// pushed through the pigeonholes, a lamp walked along the shelf, a capsule
// arriving — use <AimStage> and author their art pointing RIGHT.
//
// Every scene runs three beats — tell, strike, settle — in all three roles
// ("lead", "target", "entrance"), and every lead carries at least one animated
// layer driven by the geometry vars (--fx-ox/--fx-oy lean, --fx-side arrival
// and drift, --fx-len run length). All CSS lives in g16ArchivePlays.css behind
// the `g16-` prefix.

import "./g16ArchivePlays.css";

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
const rootStyle = (d: number): CSSProperties => ({ "--g16-d": `${d}ms` }) as CSSProperties;

/** stagger + a beat offset, scaled by the Settings animation-speed var. */
const b = (ms: number): string => `calc(var(--g16-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

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

/** Board-wide wash: the reading-room lamp coming up over the whole board. */
function Wash({ tone, d = 0 }: { tone: string; d?: number }) {
  return <L c="g16-wash" d={d} st={{ background: `radial-gradient(circle at 50% 48%, ${tone}, transparent 70%)` }} />;
}

/** Board-edge gilt: the gilt edge of a closed volume. */
function Rim({ tone, d = 160 }: { tone: string; d?: number }) {
  return <L c="g16-rim" d={d} st={{ boxShadow: `inset 0 0 30px 9px ${tone}` }} />;
}

/* Shared archive furniture. Each card dresses these with its own structure. */
const SHEET = "M5.4 2.4h8.6L18.6 7v14.6H5.4z";
const SHEET_FOLD = "M14 2.4V7h4.6";
const RULED = "M7.8 10.2h8.4M7.8 12.8h8.4M7.8 15.4h5.6";

/** A plain filing card, ruled once at the head. */
function IndexCard({ fill, ink }: { fill: string; ink: string }) {
  return (
    <g {...SJ}>
      <rect x="2.4" y="4.4" width="19.2" height="15.2" rx="1" fill={fill} stroke={ink} strokeWidth="1.1" />
      <path d="M4.6 8.6h14.8" stroke={ink} strokeWidth="0.9" />
      <path d="M4.6 12h11.4M4.6 15h8.4" stroke={ink} strokeWidth="0.7" opacity="0.7" />
    </g>
  );
}

/* --- 1. Window Shopping (t2) — THE INDEX DRAWER ------------------------------
   The catalogue drawer is hauled out on its runner, the cards riffle back under
   a thumb, one is tipped up and shown, and a paper flag is dropped into the gap
   it left. Palette: #d8c08a / #fff4d6 / #2a2113. */
function WindowShoppingScene({ role, delayMs }: SceneProps) {
  const drawer = (
    <g {...SJ}>
      <rect x="1.6" y="5.6" width="20.8" height="14" rx="1" fill="#2a2113" stroke="#d8c08a" strokeWidth="1.3" />
      <rect x="3.6" y="7.6" width="16.8" height="9" rx="1" fill="#d8c08a" opacity="0.32" />
      <circle cx="12" cy="18.2" r="1.5" fill="#fff4d6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g16-ws-drawer" l={6} t={30} w={88} h={54} d={40}>{drawer}</V>
        <V c="g16-ws-riffle" l={24} t={14} w={52} h={44} d={280}><IndexCard fill="#fff4d6" ink="#2a2113" /></V>
        <V c="g16-ws-lift" l={30} t={8} w={44} h={40} d={470}><IndexCard fill="#d8c08a" ink="#2a2113" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g16-hitside" l={10} t={40} w={80} h={46} d={0}>{drawer}</V>
        <V c="g16-hit" l={26} t={14} w={48} h={40} d={140}><IndexCard fill="#fff4d6" ink="#2a2113" /></V>
        <L c="g16-hit2" l={44} t={6} w={10} h={16} d={250} st={{ background: "#d8c08a" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(216,192,138,0.28)" />}>
      <V c="g16-ws-drawer" l={38} t={46} w={26} h={16} d={90}>{drawer}</V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g16-ws-riffle" l={41 + i * 4} t={40} w={13} h={12} d={280 + i * 90}>
          <IndexCard fill="#fff4d6" ink="#2a2113" />
        </V>
      ))}
      <V c="g16-ws-lift" l={45} t={33} w={13} h={12} d={560}><IndexCard fill="#d8c08a" ink="#2a2113" /></V>
      <L c="g16-ws-tab" l={49} t={38} w={2.4} h={6} d={680} st={{ background: "#fff4d6", transformOrigin: "50% 100%" }} />
      <L c="g16-leanshadow" l={38} t={60} w={26} h={3} d={620} st={{ borderRadius: "999px", background: "rgba(42,33,19,0.62)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g16-sift" l={42 + i * 7} t={48} w={1.4} h={1.4} d={700 + i * 100} st={{ borderRadius: "50%", background: "#d8c08a" }} />
      ))}
    </Lead>
  );
}

/* --- 2. Bumper Crop (t2) — THE CARBON COPIES ---------------------------------
   The clerk's pen bears down on the top form, and the interleaved carbons peel
   away one by one until three flimsies stand where two were expected. Palette:
   #9fb8d8 / #fff4d6 / #1d2433. */
function BumperCropScene({ role, delayMs }: SceneProps) {
  const form = (fill: string) => (
    <g {...SJ}>
      <path d={SHEET} fill={fill} stroke="#1d2433" strokeWidth="1.1" />
      <path d={SHEET_FOLD} fill="none" stroke="#1d2433" strokeWidth="1" />
      <path d={RULED} stroke="#1d2433" strokeWidth="0.8" opacity="0.7" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g16-bc-press" l={26} t={10} w={48} h={62} d={40}>{form("#fff4d6")}</V>
        <V c="g16-bc-peel" l={12} t={22} w={44} h={58} d={280}>{form("#9fb8d8")}</V>
        <V c="g16-bc-peel" l={48} t={26} w={44} h={58} d={470}>{form("#9fb8d8")}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g16-hitside" l={28} t={12} w={44} h={60} d={0}>{form("#fff4d6")}</V>
        <V c="g16-hit" l={12} t={26} w={40} h={54} d={140}>{form("#9fb8d8")}</V>
        <L c="g16-hit2" l={24} t={80} w={52} h={3} d={250} st={{ borderRadius: "999px", background: "#1d2433" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(159,184,216,0.26)" />}>
      <V c="g16-bc-nib" l={49} t={32} w={9} h={11} d={80}>
        <path d="M12 2.4l3.4 9.6L12 21l-3.4-9z" fill="#fff4d6" stroke="#1d2433" strokeWidth="1" {...SJ} />
      </V>
      <V c="g16-bc-press" l={44} t={40} w={13} h={16} d={260}>{form("#fff4d6")}</V>
      <V c="g16-bc-peel" l={38} t={42} w={12} h={15} d={430}>{form("#9fb8d8")}</V>
      <V c="g16-bc-peel" l={52} t={43} w={12} h={15} d={560}>{form("#9fb8d8")}</V>
      <L c="g16-bc-carbon" l={40} t={55} w={22} h={2} d={640} st={{ background: "linear-gradient(90deg, transparent, #1d2433, transparent)" }} />
      <L c="g16-leanshadow" l={41} t={58} w={20} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(29,36,51,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g16-drift" l={43 + i * 6} t={46} w={1.4} h={1.4} d={720 + i * 100} st={{ borderRadius: "50%", background: "#9fb8d8" }} />
      ))}
    </Lead>
  );
}

/* --- 3. Sunwise Turn (t2) — THE ROTARY CARD WHEEL -----------------------------
   The desk wheel is knocked sunwise, the cards clatter round past the knuckle
   guard, the drum slows tick by tick and stops with one card standing upright
   under the finder. Palette: #d2a45e / #fff2dc / #2c1e10. */
function SunwiseTurnScene({ role, delayMs }: SceneProps) {
  const drum = (
    <g {...SJ}>
      <path d="M2.6 18.4a9.4 9.4 0 0 1 18.8 0z" fill="#2c1e10" stroke="#d2a45e" strokeWidth="1.3" />
      <path d="M2.6 18.4h18.8" stroke="#d2a45e" strokeWidth="1.4" />
      <circle cx="12" cy="18.4" r="1.6" fill="#fff2dc" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g16-st-wheel" l={10} t={34} w={80} h={56} d={40}>{drum}</V>
        <V c="g16-st-flick" l={34} t={12} w={32} h={42} d={280}><IndexCard fill="#fff2dc" ink="#2c1e10" /></V>
        <V c="g16-st-stop" l={30} t={6} w={40} h={44} d={470}><IndexCard fill="#d2a45e" ink="#2c1e10" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g16-hitside" l={16} t={44} w={68} h={44} d={0}>{drum}</V>
        <V c="g16-hit" l={32} t={16} w={36} h={38} d={140}><IndexCard fill="#fff2dc" ink="#2c1e10" /></V>
        <L c="g16-hit2" l={46} t={10} w={8} h={8} d={250} st={{ borderRadius: "50%", background: "#d2a45e" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(210,164,94,0.26)" />}>
      <V c="g16-st-wheel" l={40} t={46} w={22} h={16} d={90}>{drum}</V>
      {[0, 1, 2, 3].map((i) => (
        <P key={i} l={44} t={38} w={14} h={14} rot={`${-24 + i * 16}deg`}>
          <V c="g16-st-flick" w={100} h={100} d={260 + i * 90}><IndexCard fill="#fff2dc" ink="#2c1e10" /></V>
        </P>
      ))}
      <V c="g16-st-stop" l={45} t={34} w={12} h={13} d={620}><IndexCard fill="#d2a45e" ink="#2c1e10" /></V>
      <L c="g16-glint" l={54} t={36} w={2.4} h={2.4} d={720} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      <L c="g16-leanshadow" l={40} t={60} w={22} h={3} d={680} st={{ borderRadius: "999px", background: "rgba(44,30,16,0.6)" }} />
    </Lead>
  );
}

/* --- 4. Widdershins (t2) — THE REEL RUNS BACK --------------------------------
   The microfilm spool is thrown into reverse, the strip pulls back across the
   glass with its sprocket holes stuttering, and one frame catches square in the
   reader's lit window. Palette: #8fc8d8 / #fff4d6 / #14282e. */
function WiddershinsScene({ role, delayMs }: SceneProps) {
  const reel = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="9.4" fill="none" stroke="#8fc8d8" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.6" fill="#14282e" stroke="#8fc8d8" strokeWidth="1.1" />
      <path d="M12 2.6v5M12 16.4v5M2.6 12h5M16.4 12h5" stroke="#8fc8d8" strokeWidth="1.2" />
    </g>
  );
  const strip = (
    <g {...SJ}>
      <rect x="1" y="7" width="22" height="10" rx="1" fill="#14282e" stroke="#8fc8d8" strokeWidth="1" />
      <path d="M3.4 9h1.6M7.4 9H9M11.4 9H13M15.4 9H17M19.4 9H21" stroke="#fff4d6" strokeWidth="1.2" />
      <path d="M3.4 15h1.6M7.4 15H9M11.4 15H13M15.4 15H17M19.4 15H21" stroke="#fff4d6" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g16-wd-reel" l={24} t={10} w={52} h={52} d={40}>{reel}</V>
        <V c="g16-wd-strip" l={2} t={58} w={96} h={30} d={280}>{strip}</V>
        <L c="g16-wd-frame" l={38} t={60} w={24} h={24} d={470} st={{ border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g16-hit" l={26} t={8} w={48} h={48} d={0}>{reel}</V>
        <V c="g16-hitside" l={4} t={56} w={92} h={30} d={140}>{strip}</V>
        <L c="g16-hit2" l={40} t={58} w={20} h={26} d={250} st={{ border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(143,200,216,0.26)" />}>
      <V c="g16-wd-reel" l={40} t={32} w={16} h={16} d={90}>{reel}</V>
      <V c="g16-wd-strip" l={34} t={47} w={34} h={9} d={300}>{strip}</V>
      <L c="g16-wd-frame" l={47} t={47} w={7} h={9} d={560} st={{ border: "2px solid #fff4d6" }} />
      <L c="g16-wd-glow" l={45} t={45} w={11} h={13} d={620} st={{ background: "radial-gradient(circle, rgba(255,244,214,0.8), transparent 70%)" }} />
      <L c="g16-leanshadow" l={40} t={58} w={22} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(20,40,46,0.62)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g16-drift" l={42 + i * 7} t={44} w={1.4} h={1.4} d={720 + i * 100} st={{ borderRadius: "50%", background: "#8fc8d8" }} />
      ))}
    </Lead>
  );
}

/* --- 5. Broom Sweep (t2) — THE WAX TABLET SMOOTHED ----------------------------
   The stylus is turned over and its flat end is dragged down the rank; the
   scratched letters vanish ahead of it and the shaved wax rolls off in curls.
   Aim-staged: the smoothing runs the real vector. Palette: #c9b48f / #fff4d6 /
   #2f2716. */
function BroomSweepScene({ role, delayMs }: SceneProps) {
  const stylus = (
    <g {...SJ}>
      <path d="M2.6 14.4L17 4.6l3.4 4.4L6.6 19.4z" fill="#c9b48f" stroke="#2f2716" strokeWidth="1.1" />
      <path d="M2.6 14.4L6.6 19.4" stroke="#fff4d6" strokeWidth="1.6" />
    </g>
  );
  const letters = (
    <g fill="none" stroke="#2f2716" strokeWidth="1.4" {...SJ}>
      <path d="M3 9h4M3 13h6M11 9h3M11 13h5M18 9h3M18 13h2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g16-bs-tablet" l={6} t={34} w={88} h={40} d={40} st={{ background: "linear-gradient(180deg, #c9b48f, rgba(201,180,143,0.6))" }} />
        <V c="g16-bs-smooth" l={8} t={36} w={84} h={34} d={280} par="none" vb="0 0 24 20">{letters}</V>
        <V c="g16-bs-stylus" l={4} t={18} w={54} h={48} d={470}>{stylus}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g16-hitside" l={8} t={38} w={84} h={30} d={0} st={{ background: "linear-gradient(180deg, #c9b48f, rgba(201,180,143,0.55))" }} />
        <V c="g16-hit" l={10} t={40} w={80} h={26} d={140} par="none" vb="0 0 24 20">{letters}</V>
        <L c="g16-hit2" l={30} t={66} w={40} h={5} d={250} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(201,180,143,0.26)" />}>
      <L c="g16-runout" l={45} t={45} w={30} h={9} d={80} st={{ background: "linear-gradient(90deg, #c9b48f, rgba(201,180,143,0.25))", transformOrigin: "0% 50%" }} />
      <V c="g16-bs-smooth" l={46} t={46} w={26} h={7} d={280} par="none" vb="0 0 24 20">{letters}</V>
      <V c="g16-bs-stylus" l={43} t={40} w={14} h={16} d={330}>{stylus}</V>
      <L c="g16-bs-sheen" l={45} t={45} w={26} h={3} d={560} st={{ background: "linear-gradient(90deg, transparent, #fff4d6, transparent)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g16-bs-curl" l={50 + i * 6} t={51} w={2.4} h={2.4} d={620 + i * 110} st={{ borderRadius: "50%", background: "#c9b48f" }} />
      ))}
      <L c="g16-leanshadow" l={45} t={54} w={26} h={2.6} d={700} st={{ borderRadius: "999px", background: "rgba(47,39,22,0.55)" }} />
    </AimLead>
  );
}

/* --- 6. Free Sample (t2) — THE CAPSULE ARRIVES EARLY --------------------------
   The dispatch tube shudders, a brass carrier thumps into the cradle ahead of
   the hour, its cap unscrews and a docket slip flutters free. Aim-staged: the
   tube runs the real vector. Palette: #b8a2d8 / #fff4d6 / #221a33. */
function FreeSampleScene({ role, delayMs }: SceneProps) {
  const capsule = (
    <g {...SJ}>
      <rect x="2" y="8" width="20" height="8" rx="1" fill="#b8a2d8" stroke="#221a33" strokeWidth="1.2" />
      <path d="M17 8v8" stroke="#221a33" strokeWidth="1.2" />
      <path d="M5 11h8" stroke="#fff4d6" strokeWidth="1.2" />
    </g>
  );
  const slip = <path d={SHEET} fill="#fff4d6" stroke="#221a33" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g16-fs-tube" l={2} t={40} w={96} h={20} d={40} st={{ borderRadius: "999px", background: "linear-gradient(180deg, rgba(184,162,216,0.5), rgba(34,26,51,0.6))" }} />
        <V c="g16-fs-cap" l={10} t={38} w={60} h={26} d={280}>{capsule}</V>
        <V c="g16-fs-slip" l={54} t={12} w={36} h={48} d={470}>{slip}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g16-hit2" l={4} t={42} w={92} h={16} d={0} st={{ borderRadius: "999px", background: "rgba(184,162,216,0.45)" }} />
        <V c="g16-hitside" l={16} t={36} w={56} h={26} d={140}>{capsule}</V>
        <V c="g16-hit" l={56} t={16} w={32} h={44} d={250}>{slip}</V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(184,162,216,0.26)" />}>
      <L c="g16-runout" l={45} t={47} w={30} h={4} d={80} st={{ borderRadius: "999px", background: "linear-gradient(90deg, rgba(184,162,216,0.7), rgba(184,162,216,0))", transformOrigin: "0% 50%" }} />
      <V c="g16-fs-shoot" l={46} t={44} w={16} h={10} d={280}>{capsule}</V>
      <L c="g16-fs-thump" l={57} t={44} w={9} h={9} d={520} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      <V c="g16-fs-slip" l={57} t={36} w={9} h={12} d={600}>{slip}</V>
      <L c="g16-leanshadow" l={46} t={53} w={22} h={2.6} d={640} st={{ borderRadius: "999px", background: "rgba(34,26,51,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g16-drift" l={52 + i * 5} t={44} w={1.5} h={1.5} d={700 + i * 100} st={{ borderRadius: "50%", background: "#b8a2d8" }} />
      ))}
    </AimLead>
  );
}

/* --- 7. Loot Filter (t2) — THE SHREDDER TAKES THE DUPLICATE -------------------
   Two identical dockets come down the chute, the flag arm kicks one aside, and
   the teeth take the other and hand it back as ribbon. Palette: #a8c0a0 /
   #fff4d6 / #1c2a1c. */
function LootFilterScene({ role, delayMs }: SceneProps) {
  const docket = (fill: string) => (
    <g {...SJ}>
      <path d={SHEET} fill={fill} stroke="#1c2a1c" strokeWidth="1.1" />
      <path d={RULED} stroke="#1c2a1c" strokeWidth="0.8" opacity="0.7" />
    </g>
  );
  const teeth = (
    <g {...SJ}>
      <rect x="1.6" y="8" width="20.8" height="7" rx="1" fill="#1c2a1c" stroke="#a8c0a0" strokeWidth="1.2" />
      <path d="M3.4 15l1.6 3 1.6-3 1.6 3 1.6-3 1.6 3 1.6-3 1.6 3 1.6-3 1.6 3 1.6-3" fill="none" stroke="#fff4d6" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g16-lf-feed" l={16} t={4} w={40} h={52} d={40}>{docket("#fff4d6")}</V>
        <V c="g16-lf-teeth" l={6} t={44} w={88} h={34} d={280}>{teeth}</V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g16-lf-ribbon" l={22 + i * 20} t={70} w={4} h={24} d={470 + i * 90} st={{ background: "#a8c0a0", transformOrigin: "50% 0%" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g16-hit" l={26} t={4} w={44} h={48} d={0}>{docket("#fff4d6")}</V>
        <V c="g16-hitside" l={10} t={44} w={80} h={30} d={140}>{teeth}</V>
        <L c="g16-hit2" l={44} t={70} w={5} h={22} d={250} st={{ background: "#a8c0a0", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(168,192,160,0.26)" />}>
      <V c="g16-lf-feed" l={44} t={30} w={11} h={14} d={100}>{docket("#fff4d6")}</V>
      <V c="g16-lf-kick" l={53} t={32} w={11} h={14} d={260}>{docket("#a8c0a0")}</V>
      <V c="g16-lf-teeth" l={39} t={44} w={22} h={9} d={420}>{teeth}</V>
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g16-lf-ribbon" l={42 + i * 4.5} t={52} w={1.4} h={7} d={560 + i * 90} st={{ background: "#a8c0a0", transformOrigin: "50% 0%" }} />
      ))}
      <L c="g16-leanshadow" l={40} t={58} w={20} h={3} d={680} st={{ borderRadius: "999px", background: "rgba(28,42,28,0.6)" }} />
      <L c="g16-glint" l={57} t={46} w={2.2} h={2.2} d={720} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 8. Molting Season (t2) — THE PALIMPSEST ----------------------------------
   The old hand is scraped off the skin with a curved knife, the ghost of it
   still showing, and a new hand is written straight over the top while the
   shavings drift off. Palette: #e0cfa0 / #fff4d6 / #2b2016. */
function MoltingSeasonScene({ role, delayMs }: SceneProps) {
  const knife = (
    <g {...SJ}>
      <path d="M3 17c4-6 9.6-9.4 16.4-10.4l1.6 3.4C15 12.4 10 15.4 6.4 20z" fill="#e0cfa0" stroke="#2b2016" strokeWidth="1.1" />
      <path d="M3 17l3.4 3" stroke="#fff4d6" strokeWidth="1.6" />
    </g>
  );
  const oldHand = <path d="M4 8c2.6-2 4 1.4 6.4 0S15 6 17 8.4M4 14.4c2.6-2 4 1.4 6.4 0s4.6-2 6.6.4" fill="none" stroke="#2b2016" strokeWidth="1.3" {...SJ} />;
  const newHand = <path d="M3.4 11c3-4 5 2 8 .4s6-3.4 8.6-.6" fill="none" stroke="#fff4d6" strokeWidth="2" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g16-ms-ghost" l={8} t={20} w={84} h={40} d={40}>{oldHand}</V>
        <V c="g16-ms-scrape" l={4} t={14} w={56} h={56} d={280}>{knife}</V>
        <V c="g16-ms-write" l={10} t={44} w={80} h={40} d={470}>{newHand}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g16-hit2" l={10} t={16} w={80} h={36} d={0}>{oldHand}</V>
        <V c="g16-hitside" l={8} t={22} w={52} h={52} d={140}>{knife}</V>
        <V c="g16-hit" l={12} t={50} w={76} h={36} d={250}>{newHand}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(224,207,160,0.26)" />}>
      <L c="g16-ms-skin" l={38} t={38} w={24} h={22} d={70} st={{ background: "linear-gradient(180deg, rgba(224,207,160,0.85), rgba(224,207,160,0.4))" }} />
      <V c="g16-ms-ghost" l={39} t={40} w={22} h={9} d={220}>{oldHand}</V>
      <V c="g16-ms-scrape" l={37} t={36} w={15} h={16} d={340}>{knife}</V>
      <V c="g16-ms-write" l={39} t={48} w={22} h={9} d={580}>{newHand}</V>
      <L c="g16-leanshadow" l={39} t={59} w={22} h={3} d={640} st={{ borderRadius: "999px", background: "rgba(43,32,22,0.6)" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g16-drift" l={41 + i * 6} t={44} w={1.5} h={1.5} d={700 + i * 90} st={{ borderRadius: "50%", background: "#e0cfa0" }} />
      ))}
    </Lead>
  );
}

/* --- 9. Slingshot (t2) — THE PAPER DART ---------------------------------------
   A memo is creased into a dart on the counter, held a beat, and flicked down
   the corridor to spike a filing card clean off its rail. Aim-staged. Palette:
   #f0d089 / #fff4d6 / #2a2415. */
function SlingshotScene({ role, delayMs }: SceneProps) {
  const dart = (
    <g {...SJ}>
      <path d="M1.6 12L22 6.4l-6.6 6L22 18.4z" fill="#fff4d6" stroke="#2a2415" strokeWidth="1.1" />
      <path d="M15.4 12.4L1.6 12" stroke="#f0d089" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g16-sl-fold" l={10} t={26} w={60} h={44} d={40}>{dart}</V>
        <V c="g16-sl-fly" l={30} t={30} w={54} h={38} d={280}>{dart}</V>
        <V c="g16-sl-punch" l={62} t={22} w={34} h={48} d={470}><IndexCard fill="#f0d089" ink="#2a2415" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g16-hitside" l={4} t={30} w={54} h={40} d={0}>{dart}</V>
        <V c="g16-hit" l={44} t={20} w={48} h={52} d={140}><IndexCard fill="#f0d089" ink="#2a2415" /></V>
        <L c="g16-hit2" l={54} t={40} w={22} h={22} d={250} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(240,208,137,0.24)" />}>
      <V c="g16-sl-fold" l={43} t={43} w={12} h={10} d={90}>{dart}</V>
      <L c="g16-runout" l={46} t={47.4} w={28} h={1.6} d={260} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #fff4d6, rgba(240,208,137,0))", transformOrigin: "0% 50%" }} />
      <V c="g16-sl-fly" l={45} t={43} w={12} h={10} d={330}>{dart}</V>
      <V c="g16-sl-punch" l={58} t={41} w={11} h={13} d={580}><IndexCard fill="#f0d089" ink="#2a2415" /></V>
      <L c="g16-sl-spike" l={58} t={43} w={10} h={10} d={620} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g16-drift" l={59 + i * 3} t={46} w={1.5} h={1.5} d={700 + i * 90} st={{ borderRadius: "50%", background: "#f0d089" }} />
      ))}
    </AimLead>
  );
}

/* --- 10. Watchman's Lantern (t1) — THE LAMP ALONG THE SHELF -------------------
   The night keeper carries a lantern down the stack; the gilt shelf marks catch
   it one after another and the last one keeps burning after he passes.
   Aim-staged along the run. Palette: #f2c66a / #fff4d6 / #241a0c. */
function WatchmansLanternScene({ role, delayMs }: SceneProps) {
  const lantern = (
    <g {...SJ}>
      <path d="M9 3.4h6v2.2H9z" fill="#241a0c" stroke="#f2c66a" strokeWidth="1" />
      <path d="M7 5.6h10l1.6 12H5.4z" fill="#241a0c" stroke="#f2c66a" strokeWidth="1.2" />
      <path d="M12 8.4c1.4 2.2 2.4 3.4 2.4 4.8a2.4 2.4 0 0 1-4.8 0c0-1.4 1-2.6 2.4-4.8z" fill="#fff4d6" />
      <path d="M12 1.4v2" stroke="#f2c66a" strokeWidth="1.2" />
    </g>
  );
  const spines = (
    <g {...SJ}>
      <rect x="2" y="3" width="4" height="18" rx="1" fill="#241a0c" stroke="#f2c66a" strokeWidth="1" />
      <rect x="7.4" y="4.4" width="4" height="16.6" rx="1" fill="#241a0c" stroke="#f2c66a" strokeWidth="1" />
      <rect x="12.8" y="3" width="4" height="18" rx="1" fill="#241a0c" stroke="#f2c66a" strokeWidth="1" />
      <rect x="18.2" y="5" width="4" height="16" rx="1" fill="#241a0c" stroke="#f2c66a" strokeWidth="1" />
      <path d="M3 8h2M8.4 9.4h2M13.8 8h2M19.2 10h2" stroke="#fff4d6" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g16-wl-shelf" l={6} t={34} w={88} h={54} d={40}>{spines}</V>
        <V c="g16-wl-lamp" l={26} t={4} w={48} h={52} d={280}>{lantern}</V>
        <L c="g16-wl-mark" l={30} t={44} w={40} h={10} d={470} st={{ background: "linear-gradient(90deg, transparent, #fff4d6, transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g16-hitside" l={10} t={30} w={80} h={56} d={0}>{spines}</V>
        <V c="g16-hit" l={30} t={6} w={40} h={44} d={140}>{lantern}</V>
        <L c="g16-hit2" l={24} t={46} w={52} h={6} d={250} st={{ background: "linear-gradient(90deg, transparent, #fff4d6, transparent)" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(242,198,106,0.24)" />}>
      <V c="g16-wl-shelf" l={42} t={42} w={30} h={16} d={80}>{spines}</V>
      <V c="g16-wl-lamp" l={44} t={34} w={10} h={12} d={240}>{lantern}</V>
      <L c="g16-runout" l={45} t={49} w={28} h={2} d={300} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #f2c66a, rgba(242,198,106,0))", transformOrigin: "0% 50%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g16-wl-mark" l={48 + i * 7} t={43} w={2.6} h={7} d={420 + i * 130} st={{ background: "#fff4d6" }} />
      ))}
      <L c="g16-leanshadow" l={43} t={57} w={26} h={3} d={680} st={{ borderRadius: "999px", background: "rgba(36,26,12,0.6)" }} />
      <L c="g16-glint" l={64} t={44} w={2.6} h={2.6} d={740} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </AimLead>
  );
}

/* --- 11. Red Tape (t1) — THE PAGE TORN OUT AND MISFILED -----------------------
   A steel straightedge is laid down the gutter, the page comes away clean, red
   tape is wound twice round the stump and the whole bundle is shoved into the
   wrong drawer, which slams. Palette: #e0645a / #fff4d6 / #2a1512. */
function RedTapeScene({ role, delayMs }: SceneProps) {
  const page = (
    <g {...SJ}>
      <path d={SHEET} fill="#fff4d6" stroke="#2a1512" strokeWidth="1.1" />
      <path d={RULED} stroke="#2a1512" strokeWidth="0.8" opacity="0.7" />
    </g>
  );
  const rule = <path d="M2 10.4h20v3.2H2z" fill="#e0645a" stroke="#2a1512" strokeWidth="1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g16-rt-rule" l={2} t={44} w={96} h={16} d={40}>{rule}</V>
        <V c="g16-rt-tear" l={20} t={8} w={56} h={62} d={280}>{page}</V>
        <L c="g16-rt-wind" l={22} t={40} w={56} h={8} d={470} st={{ background: "#e0645a", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g16-hit2" l={4} t={46} w={92} h={12} d={0}>{rule}</V>
        <V c="g16-hitside" l={24} t={10} w={52} h={58} d={140}>{page}</V>
        <L c="g16-hit" l={26} t={40} w={48} h={7} d={250} st={{ background: "#e0645a" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(224,100,90,0.24)" />}>
      <V c="g16-rt-rule" l={36} t={45} w={28} h={5} d={80}>{rule}</V>
      <V c="g16-rt-tear" l={42} t={36} w={13} h={16} d={280}>{page}</V>
      <L c="g16-rt-wind" l={41} t={44} w={16} h={2.4} d={470} st={{ background: "#e0645a", transformOrigin: "0% 50%" }} />
      <L c="g16-rt-wind" l={41} t={47} w={16} h={2.4} d={560} st={{ background: "#e0645a", transformOrigin: "0% 50%" }} />
      <L c="g16-rt-slam" l={36} t={52} w={26} h={9} d={640} st={{ background: "linear-gradient(180deg, rgba(42,21,18,0.9), rgba(224,100,90,0.4))" }} />
      <L c="g16-leanshadow" l={37} t={60} w={24} h={3} d={680} st={{ borderRadius: "999px", background: "rgba(42,21,18,0.62)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g16-sift" l={40 + i * 8} t={50} w={1.5} h={1.5} d={720 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 12. Alarm Lantern (t1) — THE TIME CLOCK PUNCHES --------------------------
   A blank card is pushed into the slot, the lever comes down, the hour is
   bitten into it in red and the bell on top rings itself out. Palette:
   #e08a5a / #fff4d6 / #2a180e. */
function AlarmLanternScene({ role, delayMs }: SceneProps) {
  const clock = (
    <g {...SJ}>
      <rect x="3" y="5" width="18" height="15" rx="1" fill="#2a180e" stroke="#e08a5a" strokeWidth="1.3" />
      <circle cx="12" cy="11.4" r="3.6" fill="none" stroke="#fff4d6" strokeWidth="1.2" />
      <path d="M12 9v2.6l1.8 1" stroke="#fff4d6" strokeWidth="1.1" fill="none" />
      <path d="M6 17.4h12" stroke="#e08a5a" strokeWidth="1.4" />
      <path d="M9.6 5V3.4h4.8V5" fill="none" stroke="#e08a5a" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g16-al-body" l={18} t={16} w={64} h={62} d={40}>{clock}</V>
        <V c="g16-al-slot" l={26} t={56} w={48} h={36} d={280}><IndexCard fill="#fff4d6" ink="#2a180e" /></V>
        <L c="g16-al-bell" l={38} t={4} w={24} h={24} d={470} st={{ borderRadius: "50%", border: "2px solid #e08a5a" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g16-hitside" l={20} t={14} w={60} h={58} d={0}>{clock}</V>
        <V c="g16-hit" l={28} t={52} w={44} h={34} d={140}><IndexCard fill="#fff4d6" ink="#2a180e" /></V>
        <L c="g16-hit2" l={34} t={44} w={32} h={7} d={250} st={{ background: "#e08a5a" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(224,138,90,0.26)" />}>
      <V c="g16-al-body" l={41} t={36} w={18} h={20} d={90}>{clock}</V>
      <V c="g16-al-slot" l={43} t={48} w={14} h={10} d={280}><IndexCard fill="#fff4d6" ink="#2a180e" /></V>
      <L c="g16-al-punch" l={45} t={46} w={10} h={3} d={470} st={{ background: "#e08a5a" }} />
      <L c="g16-al-bell" l={43} t={30} w={14} h={14} d={560} st={{ borderRadius: "50%", border: "2px solid #e08a5a" }} />
      <L c="g16-leanshadow" l={41} t={58} w={20} h={3} d={620} st={{ borderRadius: "999px", background: "rgba(42,24,14,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g16-drift" l={44 + i * 6} t={44} w={1.5} h={1.5} d={700 + i * 100} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 13. Back to School (t1) — THE INKWELL GOES OVER --------------------------
   The elbow catches the well, ink walks across the fair copy in a spreading
   blot, and the blotting paper is pressed on and peeled off carrying the shame
   in mirror image. Palette: #6f8fd0 / #fff4d6 / #161d33. */
function BackToSchoolScene({ role, delayMs }: SceneProps) {
  const well = (
    <g {...SJ}>
      <path d="M6 9h12l-1.4 9.4H7.4z" fill="#161d33" stroke="#6f8fd0" strokeWidth="1.2" />
      <path d="M5 9h14" stroke="#6f8fd0" strokeWidth="1.4" />
      <path d="M9.4 6.4h5.2V9H9.4z" fill="#6f8fd0" />
    </g>
  );
  const copy = (
    <g {...SJ}>
      <path d={SHEET} fill="#fff4d6" stroke="#161d33" strokeWidth="1.1" />
      <path d={RULED} stroke="#161d33" strokeWidth="0.8" opacity="0.7" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g16-bt-copy" l={22} t={14} w={54} h={64} d={40}>{copy}</V>
        <V c="g16-bt-tip" l={8} t={10} w={44} h={44} d={280} st={{ transformOrigin: "80% 90%" }}>{well}</V>
        <L c="g16-bt-blot" l={34} t={40} w={34} h={34} d={470} st={{ borderRadius: "50%", background: "radial-gradient(circle, #161d33 60%, rgba(111,143,208,0.4))" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g16-hitside" l={24} t={12} w={52} h={62} d={0}>{copy}</V>
        <L c="g16-hit" l={32} t={38} w={36} h={36} d={140} st={{ borderRadius: "50%", background: "#161d33" }} />
        <L c="g16-hit2" l={26} t={30} w={48} h={48} d={250} st={{ borderRadius: "50%", border: "2px solid #6f8fd0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(111,143,208,0.26)" />}>
      <V c="g16-bt-copy" l={42} t={38} w={16} h={20} d={90}>{copy}</V>
      <V c="g16-bt-tip" l={36} t={34} w={12} h={13} d={260} st={{ transformOrigin: "80% 90%" }}>{well}</V>
      <L c="g16-bt-blot" l={44} t={45} w={11} h={11} d={430} st={{ borderRadius: "50%", background: "radial-gradient(circle, #161d33 58%, rgba(111,143,208,0.35))" }} />
      <L c="g16-bt-press" l={41} t={42} w={18} h={16} d={600} st={{ background: "rgba(255,244,214,0.75)" }} />
      <L c="g16-leanshadow" l={41} t={59} w={20} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(22,29,51,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g16-sift" l={43 + i * 6} t={48} w={1.6} h={1.6} d={700 + i * 100} st={{ borderRadius: "50%", background: "#6f8fd0" }} />
      ))}
    </Lead>
  );
}

/* --- 14. Border Stamp (t1) — THE RUBBER STAMP --------------------------------
   The stamp is rocked on the pad until it is properly charged, held up, and
   brought down hard enough to make the desk jump; the ink bleeds outward into
   the paper. Palette: #d8564e / #fff4d6 / #2b1310. */
function BorderStampScene({ role, delayMs }: SceneProps) {
  const stamp = (
    <g {...SJ}>
      <rect x="8" y="2.6" width="8" height="6" rx="1" fill="#2b1310" stroke="#d8564e" strokeWidth="1.1" />
      <rect x="5.6" y="8.6" width="12.8" height="4" rx="1" fill="#d8564e" stroke="#2b1310" strokeWidth="1" />
      <rect x="4.4" y="12.6" width="15.2" height="4.4" rx="1" fill="#2b1310" stroke="#d8564e" strokeWidth="1.1" />
    </g>
  );
  const pad = (
    <g {...SJ}>
      <rect x="2.6" y="9" width="18.8" height="7" rx="1" fill="#2b1310" stroke="#d8564e" strokeWidth="1.1" />
      <rect x="4.6" y="10.6" width="14.8" height="3.8" rx="1" fill="#d8564e" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g16-bd-ink" l={6} t={52} w={50} h={38} d={40}>{pad}</V>
        <V c="g16-bd-slam" l={26} t={4} w={52} h={60} d={280}>{stamp}</V>
        <L c="g16-bd-bleed" l={28} t={54} w={44} h={30} d={470} st={{ border: "2px solid #d8564e" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g16-hitside" l={22} t={6} w={56} h={58} d={0}>{stamp}</V>
        <L c="g16-hit" l={26} t={56} w={48} h={26} d={140} st={{ border: "2px solid #d8564e" }} />
        <L c="g16-hit2" l={18} t={50} w={64} h={38} d={250} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(216,86,78,0.55), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(216,86,78,0.26)" />}>
      <V c="g16-bd-ink" l={36} t={48} w={14} h={11} d={90}>{pad}</V>
      <V c="g16-bd-slam" l={44} t={30} w={13} h={16} d={280}>{stamp}</V>
      <L c="g16-bd-print" l={45} t={46} w={11} h={7} d={520} st={{ border: "2px solid #d8564e" }} />
      <L c="g16-bd-bleed" l={41} t={42} w={19} h={15} d={580} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(216,86,78,0.5), transparent 70%)" }} />
      <L c="g16-leanshadow" l={41} t={57} w={20} h={3} d={620} st={{ borderRadius: "999px", background: "rgba(43,19,16,0.62)" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g16-drift" l={42 + i * 5} t={44} w={1.5} h={1.5} d={680 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 15. Chaperone (t1) — THE BOOK CHAINED TO ITS DESK ------------------------
   The volume is laid on the lectern, a chain pays out link by link from the
   staple, the ring is closed on the fore edge and the slack snaps taut when the
   book tries to leave. Palette: #a8b0c0 / #fff4d6 / #1b2028. */
function ChaperoneScene({ role, delayMs }: SceneProps) {
  const book = (
    <g {...SJ}>
      <path d="M3 5.4c3-1.6 6-1.6 9 0v13c-3-1.6-6-1.6-9 0z" fill="#1b2028" stroke="#a8b0c0" strokeWidth="1.2" />
      <path d="M21 5.4c-3-1.6-6-1.6-9 0v13c3-1.6 6-1.6 9 0z" fill="#1b2028" stroke="#a8b0c0" strokeWidth="1.2" />
      <path d="M12 5.4v13" stroke="#fff4d6" strokeWidth="1.1" />
    </g>
  );
  const link = <ellipse cx="12" cy="12" rx="7.4" ry="4.4" fill="none" stroke="#a8b0c0" strokeWidth="2.6" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g16-cp-book" l={14} t={12} w={72} h={54} d={40}>{book}</V>
        {[0, 1, 2].map((i) => (
          <V key={i} c="g16-cp-chain" l={16 + i * 24} t={62} w={26} h={22} d={280 + i * 90}>{link}</V>
        ))}
        <L c="g16-cp-lock" l={70} t={60} w={22} h={22} d={470} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g16-hitside" l={18} t={14} w={64} h={50} d={0}>{book}</V>
        <V c="g16-hit" l={20} t={60} w={60} h={24} d={140}>{link}</V>
        <L c="g16-hit2" l={40} t={58} w={20} h={20} d={250} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(168,176,192,0.26)" />}>
      <V c="g16-cp-book" l={42} t={38} w={18} h={15} d={90}>{book}</V>
      {[0, 1, 2, 3].map((i) => (
        <V key={i} c="g16-cp-chain" l={40 - i * 5} t={50} w={7} h={6} d={260 + i * 90}>{link}</V>
      ))}
      <L c="g16-cp-taut" l={22} t={52} w={26} h={1.6} d={620} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "100% 50%" }} />
      <L c="g16-cp-lock" l={44} t={45} w={7} h={7} d={660} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      <L c="g16-leanshadow" l={41} t={55} w={20} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(27,32,40,0.62)" }} />
    </Lead>
  );
}

/* --- 16. Choir Wings (t1) — THE GOLD LEAF -------------------------------------
   Size is laid in the shape of a wing, a leaf of gold is floated onto it and
   breathed flat, then the agate burnisher goes over until it glows and the
   waste is brushed off. Changes nothing; looks magnificent. Palette: #f0cd6a /
   #fff4d6 / #2c220c. */
function ChoirWingsScene({ role, delayMs }: SceneProps) {
  const wing = (
    <path
      d="M2.6 18.4c1.6-7 6.4-12 13-13.4 1.2 2.6.4 5.2-1.6 7 2 .2 3.4 1.2 4.4 3-3.4 3-8.4 4.6-15.8 3.4z"
      fill="#f0cd6a"
      stroke="#2c220c"
      strokeWidth="1.1"
      {...SJ}
    />
  );
  const burnisher = (
    <g {...SJ}>
      <path d="M4 20l9.4-9.4" stroke="#2c220c" strokeWidth="2.4" />
      <path d="M13.4 10.6l4-4a2.6 2.6 0 0 1 3.6 3.6l-4 4z" fill="#fff4d6" stroke="#2c220c" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g16-cw-size" l={16} t={26} w={68} h={48} d={40} st={{ background: "radial-gradient(circle, rgba(240,205,106,0.5), transparent 70%)" }} />
        <V c="g16-cw-leaf" l={12} t={20} w={76} h={56} d={280}>{wing}</V>
        <V c="g16-cw-burnish" l={30} t={22} w={52} h={52} d={470}>{burnisher}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g16-hitside" l={10} t={24} w={80} h={52} d={0}>{wing}</V>
        <L c="g16-hit" l={20} t={30} w={60} h={40} d={140} st={{ background: "linear-gradient(90deg, transparent, #fff4d6, transparent)" }} />
        <L c="g16-hit2" l={34} t={36} w={32} h={32} d={250} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(240,205,106,0.6), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(240,205,106,0.26)" />}>
      <L c="g16-cw-size" l={41} t={40} w={18} h={16} d={80} st={{ background: "radial-gradient(circle, rgba(240,205,106,0.45), transparent 70%)" }} />
      <V c="g16-cw-leaf" l={38} t={38} w={16} h={16} d={260}>{wing}</V>
      <V c="g16-cw-leaf2" l={49} t={38} w={16} h={16} d={340}>{wing}</V>
      <V c="g16-cw-burnish" l={42} t={36} w={14} h={14} d={520}>{burnisher}</V>
      <L c="g16-cw-shine" l={38} t={44} w={26} h={3} d={620} st={{ background: "linear-gradient(90deg, transparent, #fff4d6, transparent)" }} />
      <L c="g16-leanshadow" l={41} t={56} w={20} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(44,34,12,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g16-drift" l={43 + i * 6} t={42} w={1.4} h={1.4} d={720 + i * 90} st={{ borderRadius: "50%", background: "#f0cd6a" }} />
      ))}
    </Lead>
  );
}

/* --- 17. Future Compost (t1) — THE PULPING VAT --------------------------------
   Condemned paper goes over the lip into the vat, the beater churns it to slush
   and the mould is dipped and lifted with one clean new sheet draining on it.
   Palette: #8fc088 / #fff4d6 / #16281a. */
function CompostHeapScene({ role, delayMs }: SceneProps) {
  const vat = (
    <g {...SJ}>
      <path d="M3 7h18l-2.2 12.4H5.2z" fill="#16281a" stroke="#8fc088" strokeWidth="1.3" />
      <path d="M4.4 10.4c3 1.6 5.4-1.4 8 0s5.2 1.4 7.2 0" fill="none" stroke="#8fc088" strokeWidth="1.2" />
    </g>
  );
  const mould = (
    <g {...SJ}>
      <rect x="2.6" y="7.4" width="18.8" height="10" rx="1" fill="#fff4d6" stroke="#16281a" strokeWidth="1.2" />
      <path d="M5 10.4h14M5 13.4h14" stroke="#16281a" strokeWidth="0.7" opacity="0.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g16-ch-drop" l={30} t={2} w={40} h={44} d={40}><path d={SHEET} fill="#fff4d6" stroke="#16281a" strokeWidth="1.1" {...SJ} /></V>
        <V c="g16-ch-churn" l={10} t={38} w={80} h={54} d={280}>{vat}</V>
        <V c="g16-ch-lift" l={22} t={26} w={56} h={40} d={470}>{mould}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g16-hit2" l={32} t={2} w={36} h={40} d={0}><path d={SHEET} fill="#fff4d6" stroke="#16281a" strokeWidth="1.1" {...SJ} /></V>
        <V c="g16-hitside" l={14} t={40} w={72} h={50} d={140}>{vat}</V>
        <V c="g16-hit" l={26} t={30} w={48} h={34} d={250}>{mould}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(143,192,136,0.26)" />}>
      <V c="g16-ch-drop" l={45} t={28} w={11} h={13} d={90}><path d={SHEET} fill="#fff4d6" stroke="#16281a" strokeWidth="1.1" {...SJ} /></V>
      <V c="g16-ch-churn" l={39} t={44} w={22} h={16} d={300}>{vat}</V>
      <L c="g16-ch-splash" l={41} t={42} w={18} h={6} d={430} st={{ borderRadius: "999px", background: "rgba(143,192,136,0.7)" }} />
      <V c="g16-ch-lift" l={41} t={38} w={18} h={12} d={580}>{mould}</V>
      <L c="g16-leanshadow" l={40} t={59} w={22} h={3} d={640} st={{ borderRadius: "999px", background: "rgba(22,40,26,0.6)" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g16-drift" l={42 + i * 5} t={48} w={1.5} h={1.5} d={700 + i * 90} st={{ borderRadius: "50%", background: "#8fc088" }} />
      ))}
    </Lead>
  );
}

/* --- 18. Early Sprout (t1) — THE PROOF PULLED EARLY ---------------------------
   The bar is hauled over, the platen kisses the forme, and the damp proof is
   peeled back before the ink has set so one line can be read ahead of time.
   Palette: #7fd0b4 / #fff4d6 / #12302a. */
function EarlySproutScene({ role, delayMs }: SceneProps) {
  const press = (
    <g {...SJ}>
      <rect x="3" y="10" width="18" height="9" rx="1" fill="#12302a" stroke="#7fd0b4" strokeWidth="1.3" />
      <path d="M4.4 10V5.4h15.2V10" fill="none" stroke="#7fd0b4" strokeWidth="1.2" />
      <path d="M12 5.4V2" stroke="#7fd0b4" strokeWidth="1.4" />
    </g>
  );
  const proof = (
    <g {...SJ}>
      <path d={SHEET} fill="#fff4d6" stroke="#12302a" strokeWidth="1.1" />
      <path d="M7.8 10.4h8.4M7.8 13.4h8.4" stroke="#12302a" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g16-es-press" l={10} t={30} w={80} h={56} d={40}>{press}</V>
        <L c="g16-es-lever" l={44} t={6} w={40} h={5} d={280} st={{ borderRadius: "999px", background: "#7fd0b4", transformOrigin: "0% 50%" }} />
        <V c="g16-es-peel" l={26} t={20} w={48} h={58} d={470}>{proof}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g16-hitside" l={14} t={32} w={72} h={52} d={0}>{press}</V>
        <L c="g16-hit2" l={46} t={10} w={36} h={5} d={140} st={{ borderRadius: "999px", background: "#7fd0b4", transformOrigin: "0% 50%" }} />
        <V c="g16-hit" l={28} t={22} w={44} h={54} d={250}>{proof}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(127,208,180,0.26)" />}>
      <V c="g16-es-press" l={39} t={42} w={22} h={16} d={90}>{press}</V>
      <L c="g16-es-lever" l={50} t={33} w={14} h={2} d={260} st={{ borderRadius: "999px", background: "#7fd0b4", transformOrigin: "0% 50%" }} />
      <L c="g16-es-kiss" l={40} t={45} w={20} h={4} d={430} st={{ background: "linear-gradient(90deg, transparent, #fff4d6, transparent)" }} />
      <V c="g16-es-peel" l={43} t={35} w={14} h={17} d={560}>{proof}</V>
      <L c="g16-leanshadow" l={40} t={58} w={22} h={3} d={640} st={{ borderRadius: "999px", background: "rgba(18,48,42,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g16-sift" l={43 + i * 7} t={46} w={1.5} h={1.5} d={700 + i * 100} st={{ borderRadius: "50%", background: "#7fd0b4" }} />
      ))}
    </Lead>
  );
}

/* --- 19. General Delivery (t1) — THE LETTER PUSHED THROUGH --------------------
   A wall of pigeonholes; one letter is pushed all the way through its box and
   out the far side, where a thumb breaks the seal and the flap lifts.
   Aim-staged. Palette: #d8a8b4 / #fff4d6 / #2c1620. */
function GeneralDeliveryScene({ role, delayMs }: SceneProps) {
  const holes = (
    <g fill="none" stroke="#d8a8b4" strokeWidth="1.2" {...SJ}>
      <rect x="1.6" y="3" width="20.8" height="18" rx="1" />
      <path d="M1.6 9h20.8M1.6 15h20.8M8.6 3v18M15.6 3v18" />
    </g>
  );
  const letter = (
    <g {...SJ}>
      <rect x="2.6" y="6.4" width="18.8" height="11.2" rx="1" fill="#fff4d6" stroke="#2c1620" strokeWidth="1.1" />
      <path d="M2.6 6.4L12 13l9.4-6.6" fill="none" stroke="#2c1620" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g16-gd-wall" l={6} t={10} w={88} h={72} d={40}>{holes}</V>
        <V c="g16-gd-push" l={22} t={30} w={56} h={36} d={280}>{letter}</V>
        <L c="g16-gd-seal" l={42} t={40} w={18} h={18} d={470} st={{ borderRadius: "50%", background: "#d8a8b4" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g16-hit2" l={8} t={12} w={84} h={68} d={0}>{holes}</V>
        <V c="g16-hitside" l={20} t={32} w={60} h={36} d={140}>{letter}</V>
        <L c="g16-hit" l={44} t={42} w={16} h={16} d={250} st={{ borderRadius: "50%", background: "#d8a8b4" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(216,168,180,0.26)" />}>
      <V c="g16-gd-wall" l={38} t={38} w={26} h={22} d={80}>{holes}</V>
      <L c="g16-runout" l={46} t={48} w={26} h={2} d={260} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #fff4d6, rgba(216,168,180,0))", transformOrigin: "0% 50%" }} />
      <V c="g16-gd-push" l={44} t={44} w={16} h={10} d={330}>{letter}</V>
      <L c="g16-gd-seal" l={57} t={46} w={5} h={5} d={560} st={{ borderRadius: "50%", background: "#d8a8b4" }} />
      <L c="g16-gd-flap" l={54} t={42} w={11} h={7} d={640} st={{ background: "rgba(255,244,214,0.8)", transformOrigin: "50% 0%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g16-drift" l={58 + i * 3} t={44} w={1.5} h={1.5} d={700 + i * 90} st={{ borderRadius: "50%", background: "#d8a8b4" }} />
      ))}
    </AimLead>
  );
}

/* --- 20. Hearth Blessing (t1) — THE BONFIRE OF SPOILED PAPER ------------------
   The day's spoiled drafts are tipped into the grate and take; one page rides
   the updraught still legible, and the four hearth squares at the middle of the
   board glow while it burns. The centre marks are BoardFrame layers, so they sit
   on the real centre wherever the card was cast. Palette: #f09a4a / #fff4d6 /
   #2e1608. */
const HB_CENTRE: Array<[number, number]> = [[37.5, 37.5], [50, 37.5], [37.5, 50], [50, 50]];

function HearthBlessingScene({ role, delayMs }: SceneProps) {
  const grate = (
    <g {...SJ}>
      <path d="M3 18.6h18M4.4 18.6V21M19.6 18.6V21" stroke="#2e1608" strokeWidth="1.6" fill="none" />
      <path d="M5 18.6V12M9 18.6V11M13 18.6V11M17 18.6V12" stroke="#f09a4a" strokeWidth="1.3" fill="none" />
    </g>
  );
  const flame = <path d="M12 2.6c3.4 5 6 7.6 6 11.4a6 6 0 0 1-12 0c0-3.8 2.6-6.4 6-11.4z" fill="#f09a4a" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g16-hb-grate" l={8} t={48} w={84} h={44} d={40}>{grate}</V>
        <V c="g16-hb-flame" l={30} t={22} w={40} h={50} d={280}>{flame}</V>
        <V c="g16-hb-escape" l={54} t={4} w={30} h={40} d={470}>
          <path d={SHEET} fill="#fff4d6" stroke="#2e1608" strokeWidth="1.1" {...SJ} />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g16-hitside" l={12} t={50} w={76} h={40} d={0}>{grate}</V>
        <V c="g16-hit" l={32} t={26} w={36} h={44} d={140}>{flame}</V>
        <L c="g16-hit2" l={46} t={6} w={8} h={12} d={250} st={{ background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(240,154,74,0.3)" />
          {HB_CENTRE.map(([l, t], i) => (
            <L key={i} c="g16-hb-mark" l={l} t={t} w={12.5} h={12.5} d={420 + i * 90} st={{ border: "2px solid #fff4d6" }} />
          ))}
        </>
      }
    >
      <V c="g16-hb-grate" l={40} t={48} w={22} h={14} d={90}>{grate}</V>
      <L c="g16-hb-curl" l={43} t={44} w={16} h={7} d={240} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.85), rgba(46,22,8,0.5))" }} />
      <V c="g16-hb-flame" l={44} t={38} w={13} h={15} d={380}>{flame}</V>
      <V c="g16-hb-escape" l={51} t={30} w={9} h={11} d={600}>
        <path d={SHEET} fill="#fff4d6" stroke="#2e1608" strokeWidth="1.1" {...SJ} />
      </V>
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g16-drift" l={43 + i * 5} t={42} w={1.6} h={1.6} d={680 + i * 90} st={{ borderRadius: "50%", background: "#f09a4a" }} />
      ))}
    </Lead>
  );
}

/* --- 21. Intermission (t1) — RULED, THEN STRUCK THROUGH TWICE -----------------
   The straightedge lays a fresh line in the day book, the nib runs the entry
   out, and then two firm strokes cancel it: one use, then the other. Palette:
   #c8b0e0 / #fff4d6 / #221a2e. */
function IntermissionScene({ role, delayMs }: SceneProps) {
  const ledger = (
    <g {...SJ}>
      <rect x="2.4" y="3.4" width="19.2" height="17.2" rx="1" fill="#fff4d6" stroke="#221a2e" strokeWidth="1.1" />
      <path d="M4.6 8h14.8M4.6 12h14.8M4.6 16h14.8" stroke="#221a2e" strokeWidth="0.7" opacity="0.6" />
      <path d="M8 3.4v17.2" stroke="#c8b0e0" strokeWidth="1" />
    </g>
  );
  const nib = <path d="M12 2.4l3.4 9.6L12 21l-3.4-9z" fill="#c8b0e0" stroke="#221a2e" strokeWidth="1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g16-im-book" l={12} t={12} w={76} h={68} d={40}>{ledger}</V>
        <V c="g16-im-nib" l={56} t={16} w={30} h={40} d={280}>{nib}</V>
        <L c="g16-im-strike" l={18} t={44} w={64} h={4} d={470} st={{ background: "#221a2e", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g16-hitside" l={14} t={14} w={72} h={64} d={0}>{ledger}</V>
        <L c="g16-hit" l={20} t={42} w={60} h={4} d={140} st={{ background: "#221a2e", transformOrigin: "0% 50%" }} />
        <L c="g16-hit2" l={20} t={52} w={60} h={4} d={250} st={{ background: "#221a2e", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(200,176,224,0.26)" />}>
      <V c="g16-im-book" l={40} t={38} w={22} h={20} d={90}>{ledger}</V>
      <L c="g16-im-rule" l={42} t={45} w={18} h={1.4} d={260} st={{ background: "#c8b0e0", transformOrigin: "0% 50%" }} />
      <V c="g16-im-nib" l={57} t={38} w={8} h={10} d={330}>{nib}</V>
      <L c="g16-im-strike" l={42} t={46} w={18} h={1.6} d={520} st={{ background: "#221a2e", transformOrigin: "0% 50%" }} />
      <L c="g16-im-strike" l={42} t={49} w={18} h={1.6} d={640} st={{ background: "#221a2e", transformOrigin: "0% 50%" }} />
      <L c="g16-leanshadow" l={41} t={58} w={20} h={3} d={680} st={{ borderRadius: "999px", background: "rgba(34,26,46,0.6)" }} />
      <L c="g16-im-blot" l={57} t={47} w={3.4} h={3.4} d={720} st={{ borderRadius: "50%", background: "#221a2e" }} />
    </Lead>
  );
}

/* --- 22. Late Bloom (t1) — THE BINDER'S PRESS ---------------------------------
   The gathering is squared up, the press screws are wound down until the spine
   is solid, and the hot wheel runs a gilt band along it, long after the text
   was written. Palette: #e8c05a / #fff4d6 / #2b220e. */
function LateBloomScene({ role, delayMs }: SceneProps) {
  const press = (
    <g {...SJ}>
      <rect x="2.6" y="6.4" width="18.8" height="4" rx="1" fill="#2b220e" stroke="#e8c05a" strokeWidth="1.1" />
      <rect x="2.6" y="14" width="18.8" height="4" rx="1" fill="#2b220e" stroke="#e8c05a" strokeWidth="1.1" />
      <path d="M6 4.4v3M18 4.4v3" stroke="#e8c05a" strokeWidth="1.6" />
    </g>
  );
  const gathering = (
    <g {...SJ}>
      <rect x="4" y="9.4" width="16" height="5.4" rx="1" fill="#fff4d6" stroke="#2b220e" strokeWidth="1" />
      <path d="M4 11.4h16M4 13h16" stroke="#2b220e" strokeWidth="0.6" opacity="0.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g16-lb-gather" l={12} t={30} w={76} h={44} d={40}>{gathering}</V>
        <V c="g16-lb-screw" l={8} t={16} w={84} h={68} d={280}>{press}</V>
        <L c="g16-lb-tool" l={18} t={48} w={64} h={5} d={470} st={{ borderRadius: "999px", background: "#e8c05a" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g16-hit2" l={16} t={32} w={68} h={40} d={0}>{gathering}</V>
        <V c="g16-hitside" l={10} t={18} w={80} h={64} d={140}>{press}</V>
        <L c="g16-hit" l={22} t={48} w={56} h={5} d={250} st={{ borderRadius: "999px", background: "#e8c05a" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(232,192,90,0.26)" />
          <Rim tone="rgba(232,192,90,0.34)" />
        </>
      }
    >
      <V c="g16-lb-gather" l={40} t={42} w={20} h={13} d={90}>{gathering}</V>
      <V c="g16-lb-screw" l={38} t={36} w={24} h={22} d={280}>{press}</V>
      <L c="g16-lb-clamp" l={40} t={47} w={20} h={2} d={480} st={{ background: "rgba(43,34,14,0.8)" }} />
      <L c="g16-lb-tool" l={40} t={46} w={20} h={2.4} d={600} st={{ borderRadius: "999px", background: "#e8c05a", transformOrigin: "0% 50%" }} />
      <L c="g16-leanshadow" l={39} t={58} w={22} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(43,34,14,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g16-glint" l={44 + i * 7} t={45} w={2.2} h={2.2} d={700 + i * 100} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 23. Layaway Plan (t1) — THE HOLD SLIP -------------------------------------
   A slip is filled in and laid into the fore edge so it stands proud, and the
   volume is carried to the reserve shelf where a small brass plate is dropped
   into its slot. Palette: #8fb0d8 / #fff4d6 / #16202e. */
function LayawayPlanScene({ role, delayMs }: SceneProps) {
  const volume = (
    <g {...SJ}>
      <rect x="4" y="3.4" width="16" height="17.2" rx="1" fill="#16202e" stroke="#8fb0d8" strokeWidth="1.2" />
      <path d="M7.4 3.4v17.2" stroke="#8fb0d8" strokeWidth="1.1" />
      <path d="M10.4 8h7M10.4 11h5" stroke="#fff4d6" strokeWidth="1" />
    </g>
  );
  const plate = (
    <g {...SJ}>
      <rect x="3" y="9" width="18" height="6" rx="1" fill="#8fb0d8" stroke="#16202e" strokeWidth="1.1" />
      <path d="M6 12h12" stroke="#16202e" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g16-lp-vol" l={22} t={12} w={56} h={62} d={40}>{volume}</V>
        <L c="g16-lp-slip" l={54} t={20} w={12} h={44} d={280} st={{ background: "#fff4d6", transformOrigin: "50% 100%" }} />
        <V c="g16-lp-plate" l={26} t={62} w={48} h={30} d={470}>{plate}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g16-hitside" l={24} t={10} w={52} h={60} d={0}>{volume}</V>
        <L c="g16-hit" l={56} t={18} w={10} h={40} d={140} st={{ background: "#fff4d6", transformOrigin: "50% 100%" }} />
        <V c="g16-hit2" l={28} t={64} w={44} h={26} d={250}>{plate}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(143,176,216,0.26)" />}>
      <V c="g16-lp-vol" l={42} t={36} w={16} h={20} d={90}>{volume}</V>
      <L c="g16-lp-slip" l={53} t={34} w={3.4} h={13} d={280} st={{ background: "#fff4d6", transformOrigin: "50% 100%" }} />
      <L c="g16-lp-shelf" l={36} t={55} w={28} h={2.4} d={430} st={{ borderRadius: "999px", background: "#8fb0d8" }} />
      <V c="g16-lp-slide" l={41} t={36} w={16} h={20} d={520}>{volume}</V>
      <V c="g16-lp-plate" l={44} t={52} w={12} h={7} d={640}>{plate}</V>
      <L c="g16-leanshadow" l={40} t={58} w={22} h={3} d={680} st={{ borderRadius: "999px", background: "rgba(22,32,46,0.6)" }} />
    </Lead>
  );
}

/* --- 24. Locker Room Nickname (t1) — THE LABEL TYPED AND PASTED ---------------
   Typebars strike a gummed label one letter at a time, the carriage throws
   itself back with a ding, and the label is licked and thumbed onto the spine
   for good. Palette: #f0a0c0 / #fff4d6 / #2e1622. */
function LockerNicknameScene({ role, delayMs }: SceneProps) {
  const machine = (
    <g {...SJ}>
      <path d="M3 19.4l1.6-7.4h14.8l1.6 7.4z" fill="#2e1622" stroke="#f0a0c0" strokeWidth="1.2" />
      <path d="M6 15.4h12" stroke="#f0a0c0" strokeWidth="1.2" />
      <rect x="6.4" y="5" width="11.2" height="6" rx="1" fill="none" stroke="#f0a0c0" strokeWidth="1.1" />
    </g>
  );
  const label = (
    <g {...SJ}>
      <rect x="3" y="8.4" width="18" height="7.2" rx="1" fill="#fff4d6" stroke="#2e1622" strokeWidth="1.1" />
      <path d="M5.6 12.4h12.8" stroke="#2e1622" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g16-ln-machine" l={12} t={30} w={76} h={58} d={40}>{machine}</V>
        <V c="g16-ln-label" l={22} t={12} w={56} h={34} d={280}>{label}</V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g16-ln-type" l={30 + i * 16} t={22} w={5} h={5} d={470 + i * 90} st={{ borderRadius: "50%", background: "#f0a0c0" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g16-hitside" l={14} t={34} w={72} h={54} d={0}>{machine}</V>
        <V c="g16-hit" l={24} t={14} w={52} h={30} d={140}>{label}</V>
        <L c="g16-hit2" l={34} t={20} w={32} h={4} d={250} st={{ background: "#2e1622" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(240,160,192,0.26)" />}>
      <V c="g16-ln-machine" l={39} t={44} w={22} h={16} d={90}>{machine}</V>
      <V c="g16-ln-label" l={43} t={36} w={15} h={9} d={260}>{label}</V>
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g16-ln-type" l={45 + i * 3} t={39} w={1.8} h={1.8} d={380 + i * 90} st={{ borderRadius: "50%", background: "#f0a0c0" }} />
      ))}
      <L c="g16-ln-carriage" l={41} t={35} w={20} h={1.8} d={600} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <L c="g16-ln-paste" l={44} t={37} w={13} h={8} d={680} st={{ background: "rgba(255,244,214,0.9)" }} />
      <L c="g16-leanshadow" l={40} t={59} w={22} h={3} d={720} st={{ borderRadius: "999px", background: "rgba(46,22,34,0.6)" }} />
    </Lead>
  );
}

/* --- 25. Lucky Stirrup (t1) — THE POUNCE POT ----------------------------------
   A bored hand draws a small horse in the margin of the register, then shakes
   pounce sand over the wet ink and tips it off, leaving the doodle dry and
   permanent. Palette: #d8c070 / #fff4d6 / #2a2410. */
function LuckyStirrupScene({ role, delayMs }: SceneProps) {
  const pony = (
    <path
      d="M7.4 20V13.4c0-3.6 2.4-5.6 4.4-6.2L11.2 4.6l2.8 1.1c1.9.9 2.8 2.8 2.8 5.6V20z"
      fill="#d8c070"
      stroke="#2a2410"
      strokeWidth="1.2"
      {...SJ}
    />
  );
  const pot = (
    <g {...SJ}>
      <path d="M7 4.4h10l-1.4 4.4H8.4z" fill="#2a2410" stroke="#d8c070" strokeWidth="1.1" />
      <path d="M8.4 8.8h7.2l1.4 9.6H7z" fill="#d8c070" stroke="#2a2410" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g16-ls-doodle" l={26} t={30} w={48} h={56} d={40}>{pony}</V>
        <V c="g16-ls-pot" l={4} t={4} w={44} h={44} d={280} st={{ transformOrigin: "50% 10%" }}>{pot}</V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g16-ls-sand" l={30 + i * 14} t={30} w={4} h={4} d={470 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g16-hitside" l={28} t={28} w={44} h={54} d={0}>{pony}</V>
        <V c="g16-hit" l={8} t={6} w={40} h={40} d={140} st={{ transformOrigin: "50% 10%" }}>{pot}</V>
        <L c="g16-hit2" l={26} t={70} w={48} h={5} d={250} st={{ borderRadius: "999px", background: "#d8c070" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(216,192,112,0.26)" />}>
      <L c="g16-ls-margin" l={38} t={38} w={24} h={22} d={70} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.7), rgba(216,192,112,0.25))" }} />
      <V c="g16-ls-doodle" l={45} t={41} w={11} h={14} d={260}>{pony}</V>
      <V c="g16-ls-pot" l={38} t={30} w={12} h={13} d={430} st={{ transformOrigin: "50% 10%" }}>{pot}</V>
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g16-ls-sand" l={43 + i * 4} t={40} w={1.6} h={1.6} d={560 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
      <L c="g16-ls-pour" l={42} t={54} w={18} h={2.4} d={700} st={{ borderRadius: "999px", background: "#d8c070" }} />
      <L c="g16-leanshadow" l={41} t={58} w={20} h={3} d={740} st={{ borderRadius: "999px", background: "rgba(42,36,16,0.6)" }} />
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
  bn4_window_shopping: S(WindowShoppingScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "vault", anchor: "board" }),
  op_bumper_crop: S(BumperCropScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board" }),
  op_sunwise_turn: S(SunwiseTurnScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }),
  op_widdershins: S(WiddershinsScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }),
  ov_broom_sweep: S(BroomSweepScene, { ordering: "line", staggerMs: 70, victims: ["p"], hasLead: true, sound: "wall", anchor: "aim" }),
  ov_free_sample: S(FreeSampleScene, { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "shades", anchor: "board" }),
  ov_loot_filter: S(LootFilterScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "board" }),
  ov_molting_season: S(MoltingSeasonScene, { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "shades", anchor: "cast" }),
  ov_slingshot: S(SlingshotScene, { ordering: "line", staggerMs: 60, victims: ["p"], hasLead: true, sound: "shades", anchor: "board" }),
  bn4_watchmans_lantern: S(WatchmansLanternScene, { ordering: "line", staggerMs: 65, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }),
  hx4_red_tape: S(RedTapeScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }),
  op_alarm_lantern: S(AlarmLanternScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage", anchor: "cast" }),
  op_back_to_school: S(BackToSchoolScene, { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "snooze", anchor: "board" }),
  op_border_stamp: S(BorderStampScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "vault", anchor: "board" }),
  op_chaperone: S(ChaperoneScene, { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "vault", anchor: "cast" }),
  op_choir_wings: S(ChoirWingsScene, { ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "cathedral", anchor: "board" }),
  op_compost_heap: S(CompostHeapScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }),
  op_early_sprout: S(EarlySproutScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "board" }),
  op_general_delivery: S(GeneralDeliveryScene, { ordering: "line", staggerMs: 60, victims: ["p"], hasLead: true, sound: "shades", anchor: "board" }),
  op_hearth_blessing: S(HearthBlessingScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }),
  op_intermission: S(IntermissionScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }),
  op_late_bloom: S(LateBloomScene, { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "vault", anchor: "board" }),
  op_layaway_plan: S(LayawayPlanScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }),
  op_locker_room_nickname: S(LockerNicknameScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "cast" }),
  op_lucky_stirrup: S(LuckyStirrupScene, { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "snooze", anchor: "board" }),
};
