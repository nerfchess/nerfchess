// g15SealPlays — bespoke plays for the 25 rule / edict / contract / decree
// cards that used to share the generated `scrollUnfurl` family (one unrolling
// scroll, 25 hue shifts).
//
// MODULE FICTION: THE MOMENT A DOCUMENT BECOMES BINDING. Never an unrolling
// scroll: the scroll is over before the scene starts. Every card is a
// different physical ACT that makes writing real — a great seal pressed on
// cords and the matrix lifted away, a dedication chiselled into a keystone, a
// lead bulla crimped shut, a docket driven down a file needle, a notary's
// embosser biting a blind stamp, an indenture cut along its wavy line and both
// halves matched, a proclamation nailed to a post, wax poured from a ladle, a
// thumbprint rolled in ink, a tally stick split, a coupon torn along its
// perforation.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g15SealPlays.css), transform/opacity animations only, no imports from
// BoardEffects.tsx, only the SigPlugin/SigRole TYPES from sigPlugins.tsx.
//
// STAGING. Every card declares anchor "cast" or "aim", so the act happens on
// the square the card was played on. Board-scale layers (the lamp wash over
// the desk, the gilt at the board edge) live inside <BoardFrame>, never at a
// fixed percentage of the stage. The cards that travel a ROUTE — a looted
// supply road, a bribed courier, a thrown voice, an augury crossing the sky —
// use <AimStage> and author their art pointing RIGHT.
//
// Every scene runs three beats — tell, strike, settle — in all three roles
// ("lead", "target", "entrance"), and every scene carries at least one animated
// layer driven by the geometry vars (--fx-ox/--fx-oy rake and cast shadow,
// --fx-side for the hand that reaches in from the caster's own edge, --fx-len
// for the road, --fx-aim-x/y for what is carried down it). All CSS lives in
// g15SealPlays.css behind the `g15-` prefix.

import "./g15SealPlays.css";

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
const rootStyle = (d: number): CSSProperties => ({ "--g15-d": `${d}ms` }) as CSSProperties;

/** stagger + a beat offset, scaled by the Settings animation-speed var. */
const b = (ms: number): string => `calc(var(--g15-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

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

/** Cast-anchored lead: the act on the cast square, `frame` over the board. */
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

/** The clerk's lamp over the board. Always inside a BoardFrame. */
function Wash({ tone, d = 0 }: { tone: string; d?: number }) {
  return <L c="g15-wash" d={d} st={{ background: `radial-gradient(circle at 50% 48%, ${tone}, transparent 70%)` }} />;
}

/** Gilt at the board edge: the document's ruled border. Inside a BoardFrame. */
function Rim({ tone, d = 160 }: { tone: string; d?: number }) {
  return <L c="g15-rim" d={d} st={{ boxShadow: `inset 0 0 30px 9px ${tone}` }} />;
}

/* Substrates every act binds. Static shapes, dressed per card by its own act. */
const SHEET = "M4.4 2.4h11.2l4 4V21.6H4.4z";
const SHEET_FOLD = "M15.6 2.4v4h4";
const CROWN = "M5 15L3.4 6.4l4.2 3L12 3.6l4.4 5.8 4.2-3L19 15z";
const RAVEN = "M4 13.6c1-4.4 4-6.6 7.6-6.6l3-2.4.6 2.6 4.8 1.8-3.4 1.4c.4 4.4-2.6 7.6-7 7.6-2.4 0-4.4-1.6-5.6-4.4z";
const EYE = "M2.6 12S6.4 5.6 12 5.6 21.4 12 21.4 12 17.6 18.4 12 18.4 2.6 12 2.6 12z";

/* --- 1. Deck of Kings (t8) — THE GREAT SEAL ON ITS CORDS --------------------
   Silk cords are drawn through the fold of the warrant, a disc of wax drops
   onto them, the crowned matrix comes down and bites, then LIFTS AWAY leaving
   the impression standing proud while pounce dust drifts off it.
   Palette: #e8c46a / #fff4d6 / #2a1e0b. */
function DeckOfKingsScene({ role, delayMs }: SceneProps) {
  const matrix = (
    <g {...SJ}>
      <path d="M4 3.4h16v6H4z" fill="#2a1e0b" stroke="#e8c46a" strokeWidth="1.2" />
      <path d="M9 9.4h6v5H9z" fill="#e8c46a" />
      <path d="M5.6 14.4h12.8v5.2H5.6z" fill="#e8c46a" stroke="#2a1e0b" strokeWidth="1.1" />
    </g>
  );
  const impression = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="9.6" fill="#e8c46a" stroke="#2a1e0b" strokeWidth="1.2" />
      <path d={CROWN} fill="#fff4d6" transform="translate(2.4 2.4) scale(0.8)" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g15-gk-cords" l={10} t={54} w={80} h={34} d={40}>
          <path d="M1 12c6-5 16-5 22 0" fill="none" stroke="#e8c46a" strokeWidth="1.8" {...SJ} />
        </V>
        <V c="g15-ent-press" l={26} t={4} w={48} h={56} d={250}>{matrix}</V>
        <V c="g15-impress" l={30} t={40} w={40} h={40} d={470}>{impression}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hitside" l={22} t={6} w={56} h={54} d={0}>{matrix}</V>
        <V c="g15-hit" l={26} t={34} w={48} h={48} d={140}>{impression}</V>
        <L c="g15-hit2" l={34} t={42} w={32} h={32} d={260} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(232,196,106,0.3)" />
          <Rim tone="rgba(255,244,214,0.36)" />
        </>
      }
    >
      <V c="g15-gk-cords" l={38} t={48} w={24} h={12} d={90}>
        <path d="M1 12c6-5 16-5 22 0" fill="none" stroke="#e8c46a" strokeWidth="2" {...SJ} />
      </V>
      <V c="g15-drop" l={44} t={42} w={12} h={12} d={240}>
        <circle cx="12" cy="12" r="9" fill="#e8c46a" opacity="0.85" />
      </V>
      <L c="g15-leanshadow" l={41} t={54} w={18} h={4} d={320} st={{ borderRadius: "999px", background: "rgba(42,30,11,0.6)" }} />
      <V c="g15-press" l={42} t={30} w={16} h={20} d={380}>{matrix}</V>
      <V c="g15-lift" l={42} t={30} w={16} h={20} d={620}>{matrix}</V>
      <V c="g15-impress" l={44.5} t={44} w={11} h={11} d={640}>{impression}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g15-sift" l={43 + i * 6} t={47} w={1.4} h={1.4} d={740 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 2. Triumphal Arch (t8) — THE DEDICATION CUT IN STONE -------------------
   The chisel is set against the keystone face, the mallet strikes three times,
   the letters open up as cut shadow, grit sifts out of them, and the finished
   keystone is levered up into the crown of the arch.
   Palette: #cbb894 / #fff2dc / #2a2418. */
function TriumphalArchScene({ role, delayMs }: SceneProps) {
  const chisel = (
    <g {...SJ}>
      <path d="M11 2.4h2.6v13.2L12.3 21l-1.3-5.4z" fill="#cbb894" stroke="#2a2418" strokeWidth="1.1" />
      <path d="M10.6 6.4h3.4" stroke="#2a2418" strokeWidth="1" />
    </g>
  );
  const letters = (
    <g fill="none" stroke="#fff2dc" strokeWidth="2" {...SJ}>
      <path d="M3 17V7l3.4 6L9.8 7v10" />
      <path d="M13 17V7h3.6c2 0 2 4 0 4H13" />
      <path d="M19.4 7v10" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g15-ent-press" l={26} t={2} w={44} h={54} d={40}>{chisel}</V>
        <V c="g15-ta-letters" l={12} t={44} w={76} h={38} d={260}>{letters}</V>
        <V c="g15-ent-rise" l={22} t={12} w={56} h={40} d={470}>
          <path d="M2 20L12 4l10 16z" fill="#cbb894" stroke="#2a2418" strokeWidth="1.2" {...SJ} />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hitside" l={28} t={2} w={44} h={52} d={0}>{chisel}</V>
        <V c="g15-hit" l={14} t={44} w={72} h={36} d={140}>{letters}</V>
        <L c="g15-hit2" l={30} t={78} w={40} h={4} d={260} st={{ borderRadius: "999px", background: "#cbb894" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(203,184,148,0.28)" />
          <Rim tone="rgba(255,242,220,0.3)" />
        </>
      }
    >
      <V c="g15-ta-chisel" l={41} t={30} w={10} h={18} d={80}>{chisel}</V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g15-strike" l={36} t={24} w={14} h={16} d={220 + i * 130} st={{ transformOrigin: "80% 90%" }}>
          <path d="M4 4h12v6H4z M9 10h2v11H9z" fill="#cbb894" stroke="#2a2418" strokeWidth="1.1" {...SJ} />
        </V>
      ))}
      <V c="g15-ta-letters" l={40} t={45} w={20} h={10} d={420}>{letters}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g15-sift" l={42 + i * 6} t={50} w={1.5} h={1.5} d={520 + i * 90} st={{ borderRadius: "50%", background: "#cbb894" }} />
      ))}
      <V c="g15-ta-keystone" l={43} t={36} w={14} h={14} d={640}>
        <path d="M4 20h16l-3-16H7z" fill="#cbb894" stroke="#2a2418" strokeWidth="1.2" {...SJ} />
      </V>
      <L c="g15-leanshadow" l={40} t={57} w={20} h={4} d={700} st={{ borderRadius: "999px", background: "rgba(42,36,24,0.6)" }} />
    </Lead>
  );
}

/* --- 3. Cartographer's Vault (t8) — THE LEAD BULLA CRIMPED ------------------
   A cord is threaded through the chart, a soft lead blank is dropped onto it,
   the pincers reach in from the caster's own edge and BITE, and the crimped
   bulla hangs there while the map drawer slides shut on the lot.
   Palette: #9fb0c0 / #fff4d6 / #1c2530. */
function CartographersVaultScene({ role, delayMs }: SceneProps) {
  const pincers = (
    <g fill="none" stroke="#9fb0c0" strokeWidth="1.8" {...SJ}>
      <path d="M2 4.6l9 6.4M2 19.4l9-6.4" />
      <path d="M11 9.4h5.4v5.2H11z" stroke="#fff4d6" strokeWidth="1.4" />
    </g>
  );
  const bulla = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="8.4" fill="#9fb0c0" stroke="#1c2530" strokeWidth="1.3" />
      <path d="M6.4 12h11.2M12 6.4v11.2" stroke="#1c2530" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g15-draw" l={8} t={40} w={84} h={20} d={40} st={{ transformOrigin: "0% 50%" }}>
          <path d="M1 12h22" fill="none" stroke="#9fb0c0" strokeWidth="2" {...SJ} />
        </V>
        <V c="g15-bite" l={20} t={20} w={60} h={60} d={260}>{pincers}</V>
        <V c="g15-impress" l={34} t={44} w={32} h={32} d={470}>{bulla}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hitside" l={12} t={16} w={60} h={60} d={0}>{pincers}</V>
        <V c="g15-hit" l={34} t={36} w={40} h={40} d={140}>{bulla}</V>
        <L c="g15-hit2" l={24} t={80} w={52} h={4} d={260} st={{ borderRadius: "999px", background: "#9fb0c0" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(159,176,192,0.28)" />
          <Rim tone="rgba(255,244,214,0.28)" />
        </>
      }
    >
      <V c="g15-draw" l={38} t={44} w={24} h={8} d={90} st={{ transformOrigin: "0% 50%" }}>
        <path d="M1 12h22" fill="none" stroke="#9fb0c0" strokeWidth="2.2" {...SJ} />
      </V>
      <V c="g15-drop" l={45} t={40} w={10} h={10} d={160}>
        <circle cx="12" cy="12" r="7.6" fill="#9fb0c0" opacity="0.9" />
      </V>
      <V c="g15-handin" l={36} t={38} w={20} h={18} d={280}>{pincers}</V>
      <V c="g15-bite" l={41} t={40} w={18} h={16} d={400}>{pincers}</V>
      <V c="g15-impress" l={45} t={44} w={10} h={10} d={560}>{bulla}</V>
      <L c="g15-cv-drawer" l={36} t={52} w={28} h={12} d={700} st={{ background: "linear-gradient(180deg, #1c2530, rgba(28,37,48,0.2))", transformOrigin: "50% 100%" }} />
      <L c="g15-glint" l={53} t={41} w={2.4} h={2.4} d={780} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 4. The Menu (t8) — THE DOCKET DRIVEN DOWN THE FILE NEEDLE --------------
   The brass needle stands up out of its weighted base, three dockets are
   slammed down it one after another, the carbon copy peels off the bottom one
   and drifts away, and the needle is left quivering.
   Palette: #e0a24e / #fff4d6 / #2b1a0c. */
function TheMenuScene({ role, delayMs }: SceneProps) {
  const docket = (
    <g {...SJ}>
      <path d={SHEET} fill="#fff4d6" stroke="#2b1a0c" strokeWidth="1.1" />
      <path d={SHEET_FOLD} fill="none" stroke="#2b1a0c" strokeWidth="0.9" />
      <path d="M7 11h9M7 14h9M7 17h5" stroke="#e0a24e" strokeWidth="1.1" />
    </g>
  );
  const needle = (
    <g {...SJ}>
      <path d="M12 1.6v17.6" stroke="#e0a24e" strokeWidth="2.2" />
      <path d="M6.4 19.2h11.2v2.6H6.4z" fill="#2b1a0c" stroke="#e0a24e" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g15-tm-needle" l={32} t={16} w={36} h={72} d={40}>{needle}</V>
        <V c="g15-jab" l={18} t={18} w={64} h={50} d={260}>{docket}</V>
        <V c="g15-tm-carbon" l={40} t={44} w={44} h={40} d={470}>
          <path d={SHEET} fill="#e0a24e" opacity="0.75" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hit" l={34} t={10} w={32} h={80} d={0}>{needle}</V>
        <V c="g15-hitside" l={20} t={26} w={60} h={46} d={140}>{docket}</V>
        <L c="g15-hit2" l={30} t={80} w={40} h={4} d={260} st={{ borderRadius: "999px", background: "#e0a24e" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(224,162,78,0.3)" />}>
      <V c="g15-tm-needle" l={44} t={34} w={12} h={26} d={80}>{needle}</V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g15-jab" l={39 + i * 3} t={38 + i * 2} w={18} h={14} d={260 + i * 120}>{docket}</V>
      ))}
      <L c="g15-leanshadow" l={40} t={57} w={20} h={4} d={560} st={{ borderRadius: "999px", background: "rgba(43,26,12,0.62)" }} />
      <V c="g15-tm-carbon" l={50} t={42} w={14} h={13} d={620}>
        <path d={SHEET} fill="#e0a24e" opacity="0.7" />
      </V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g15-sift" l={42 + i * 7} t={50} w={1.4} h={1.4} d={700 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
      <L c="g15-glint" l={49} t={35} w={2.2} h={2.2} d={780} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 5. Eye of Ages (t7) — THE NOTARY'S EMBOSSER BITES ----------------------
   The dry-seal jaws open around the corner of the page, close hard, and leave
   no ink at all: a blind emboss. The eye device only becomes readable when the
   lamp rakes across it from the middle of the board.
   Palette: #b8c7d8 / #fff4d6 / #232c38. */
function EyeOfAgesScene({ role, delayMs }: SceneProps) {
  const jaws = (
    <g fill="none" stroke="#b8c7d8" strokeWidth="1.7" {...SJ}>
      <path d="M3 3.4h13.4v5.2H3z" />
      <path d="M3 15.4h13.4v5.2H3z" />
      <path d="M16.4 6h4.6v12h-4.6" />
    </g>
  );
  const device = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="9.2" fill="none" stroke="#b8c7d8" strokeWidth="1.4" strokeDasharray="1.8 1.5" />
      <path d={EYE} fill="none" stroke="#fff4d6" strokeWidth="1.3" transform="translate(3.6 3.6) scale(0.7)" />
      <circle cx="12" cy="12" r="2.2" fill="#fff4d6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g15-eo-jaws" l={10} t={18} w={72} h={64} d={40}>{jaws}</V>
        <V c="g15-bite" l={16} t={22} w={64} h={56} d={260}>{jaws}</V>
        <V c="g15-impress" l={30} t={30} w={40} h={40} d={470}>{device}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hitside" l={12} t={18} w={68} h={62} d={0}>{jaws}</V>
        <V c="g15-hit" l={28} t={28} w={44} h={44} d={140}>{device}</V>
        <L c="g15-hit2" l={16} t={44} w={68} h={3} d={260} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(184,199,216,0.26)" />
          <Rim tone="rgba(255,244,214,0.3)" />
        </>
      }
    >
      <V c="g15-eo-jaws" l={37} t={38} w={26} h={22} d={90}>{jaws}</V>
      <V c="g15-bite" l={39} t={39} w={22} h={20} d={280}>{jaws}</V>
      <V c="g15-impress" l={44} t={43} w={12} h={12} d={460}>{device}</V>
      <L c="g15-rake" l={34} t={41} w={32} h={16} d={600} st={{ background: "linear-gradient(100deg, transparent, rgba(255,244,214,0.75), transparent)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g15-motes" l={43 + i * 6} t={48} w={1.5} h={1.5} d={740 + i * 90} st={{ borderRadius: "50%", background: "#b8c7d8" }} />
      ))}
    </Lead>
  );
}

/* --- 6. Feast of Fools (t7) — THE INDENTURE CUT, BOTH HALVES KEPT -----------
   CHIROGRAPHUM is lettered across the join, the shears run the wavy line, the
   two halves swing apart on their own arcs — and then swing back and MATCH,
   tooth for tooth, which is the only thing that ever made the copy honest.
   Palette: #e07a9a / #fff4d6 / #2e1420. */
const FF_WAVE = "M12 1.6l-3 3 3 3-3 3 3 3-3 3 3 3";

function FeastOfFoolsScene({ role, delayMs }: SceneProps) {
  const half = (flip: boolean) => (
    <g {...SJ} transform={flip ? "scale(-1 1) translate(-24 0)" : undefined}>
      <path d="M2.4 2.4h9.6l-3 3 3 3-3 3 3 3-3 3 3 3H2.4z" fill="#fff4d6" stroke="#2e1420" strokeWidth="1.1" />
      <path d="M4.6 8h5M4.6 12h5M4.6 16h3.4" stroke="#e07a9a" strokeWidth="1.1" />
    </g>
  );
  const shears = (
    <g fill="none" stroke="#e07a9a" strokeWidth="1.7" {...SJ}>
      <path d="M3.6 3.4L14 13.4M3.6 20.6L14 10.6" />
      <circle cx="18" cy="8.4" r="2.6" />
      <circle cx="18" cy="15.6" r="2.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g15-draw" l={8} t={38} w={84} h={22} d={40} st={{ transformOrigin: "0% 50%" }} par="none" vb="0 0 60 20">
          <text x="30" y="14" textAnchor="middle" fontSize="9" fontWeight="700" fill="#e07a9a">CHIROGRAPHUM</text>
        </V>
        <V c="g15-ff-shears" l={22} t={14} w={56} h={56} d={260}>{shears}</V>
        <V c="g15-mate" l={30} t={26} w={40} h={52} d={470}>{half(false)}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hitside" l={6} t={18} w={44} h={62} d={0}>{half(false)}</V>
        <V c="g15-hit" l={50} t={18} w={44} h={62} d={130}>{half(true)}</V>
        <L c="g15-hit2" l={46} t={16} w={8} h={66} d={260} st={{ background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(224,122,154,0.28)" />}>
      <V c="g15-draw" l={38} t={39} w={24} h={7} d={90} st={{ transformOrigin: "0% 50%" }} par="none" vb="0 0 60 20">
        <text x="30" y="14" textAnchor="middle" fontSize="9" fontWeight="700" fill="#e07a9a">CHIROGRAPHUM</text>
      </V>
      <V c="g15-ff-shears" l={42} t={36} w={16} h={16} d={260}>{shears}</V>
      <V c="g15-tearl" l={38} t={41} w={12} h={16} d={440}>{half(false)}</V>
      <V c="g15-tearr" l={50} t={41} w={12} h={16} d={460}>{half(true)}</V>
      <V c="g15-mate" l={44} t={42} w={12} h={15} d={640}>
        <path d={FF_WAVE} fill="none" stroke="#fff4d6" strokeWidth="1.6" {...SJ} />
      </V>
      <L c="g15-leanshadow" l={41} t={58} w={18} h={4} d={700} st={{ borderRadius: "999px", background: "rgba(46,20,32,0.6)" }} />
      <L c="g15-glint" l={49} t={44} w={2.4} h={2.4} d={780} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 7. Broken Supply (t7) — THE SEAL BROKEN ON THE ROAD --------------------
   Aim-staged along the supply road. The intact seal sits on the fold, a
   hairline crack opens across it, the two halves fall away, and a heavy bar of
   ink is struck clean through the order that used to be binding.
   Palette: #c05a3c / #ffe9c8 / #2a1410. */
function BrokenSupplyScene({ role, delayMs }: SceneProps) {
  const sealHalf = (flip: boolean) => (
    <g {...SJ} transform={flip ? "scale(-1 1) translate(-24 0)" : undefined}>
      <path d="M12 2.6A9.4 9.4 0 0 0 12 21.4z" fill="#c05a3c" stroke="#2a1410" strokeWidth="1.2" />
      <path d="M9 8.6L6.4 12l2.6 3.4" fill="none" stroke="#ffe9c8" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g15-bs-seal" l={26} t={22} w={48} h={48} d={40}>
          <circle cx="12" cy="12" r="9.4" fill="#c05a3c" stroke="#2a1410" strokeWidth="1.2" />
          <path d="M7 12h10" stroke="#ffe9c8" strokeWidth="1.4" {...SJ} />
        </V>
        <L c="g15-crack" l={48} t={20} w={4} h={54} d={260} st={{ background: "#ffe9c8" }} />
        <V c="g15-tearl" l={12} t={30} w={40} h={44} d={470}>{sealHalf(false)}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hitside" l={10} t={22} w={40} h={52} d={0}>{sealHalf(false)}</V>
        <V c="g15-hit" l={50} t={22} w={40} h={52} d={130}>{sealHalf(true)}</V>
        <L c="g15-hit2" l={14} t={46} w={72} h={5} d={260} st={{ borderRadius: "999px", background: "#2a1410" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(192,90,60,0.28)" />}>
      <L c="g15-runout" l={46} t={48.4} w={30} h={2.4} d={60} st={{ background: "linear-gradient(90deg, #c05a3c, rgba(192,90,60,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g15-bs-seal" l={44} t={42} w={12} h={12} d={80}>
        <circle cx="12" cy="12" r="9.4" fill="#c05a3c" stroke="#2a1410" strokeWidth="1.2" />
        <path d="M7 12h10" stroke="#ffe9c8" strokeWidth="1.4" {...SJ} />
      </V>
      <L c="g15-crack" l={49.4} t={41} w={1.2} h={14} d={280} st={{ background: "#ffe9c8" }} />
      <V c="g15-tearl" l={42} t={43} w={9} h={11} d={440}>{sealHalf(false)}</V>
      <V c="g15-tearr" l={49} t={43} w={9} h={11} d={460}>{sealHalf(true)}</V>
      <L c="g15-bs-strike" l={40} t={47} w={22} h={2.2} d={600} st={{ background: "#2a1410", transformOrigin: "0% 50%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g15-sift" l={44 + i * 5} t={50} w={1.4} h={1.4} d={720 + i * 80} st={{ borderRadius: "50%", background: "#c05a3c" }} />
      ))}
    </AimLead>
  );
}

/* --- 8. Write the Patch Notes (t7) — THE ERRATUM SLIP PASTED IN -------------
   The old clause is ruled through, a fresh slip flutters down over it, the
   paste roller comes in from the caster's own edge and flattens the edge, and
   a wet initial goes in the margin to say who owns the change.
   Palette: #7fc2a8 / #fff4d6 / #16302a. */
function PatchNotesScene({ role, delayMs }: SceneProps) {
  const slip = (
    <g {...SJ}>
      <path d="M2.6 6.4h18.8v11.2H2.6z" fill="#7fc2a8" stroke="#16302a" strokeWidth="1.1" />
      <path d="M5.4 10.4h13.2M5.4 13.6h9" stroke="#fff4d6" strokeWidth="1.1" />
    </g>
  );
  const roller = (
    <g {...SJ}>
      <path d="M2.6 7h13v6.4h-13z" fill="#7fc2a8" stroke="#16302a" strokeWidth="1.1" />
      <path d="M9 13.4v3.4h7.4V21" fill="none" stroke="#16302a" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g15-draw" l={8} t={30} w={84} h={16} d={40} st={{ transformOrigin: "0% 50%" }}>
          <path d="M1 12h22" fill="none" stroke="#16302a" strokeWidth="2.4" {...SJ} />
        </V>
        <V c="g15-pn-slip" l={16} t={38} w={68} h={40} d={260}>{slip}</V>
        <V c="g15-pn-init" l={54} t={12} w={36} h={36} d={470}>
          <path d="M4 18c3-8 6-10 8-4s5 4 8-4" fill="none" stroke="#fff4d6" strokeWidth="2" {...SJ} />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hitside" l={18} t={30} w={64} h={40} d={0}>{slip}</V>
        <L c="g15-hit2" l={12} t={26} w={76} h={4} d={140} st={{ borderRadius: "999px", background: "#16302a" }} />
        <V c="g15-hit" l={54} t={54} w={34} h={34} d={260}>
          <path d="M4 18c3-8 6-10 8-4s5 4 8-4" fill="none" stroke="#fff4d6" strokeWidth="2" {...SJ} />
        </V>
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(127,194,168,0.26)" />
          <Rim tone="rgba(255,244,214,0.26)" />
        </>
      }
    >
      <V c="g15-draw" l={38} t={40} w={24} h={6} d={90} st={{ transformOrigin: "0% 50%" }}>
        <path d="M1 12h22" fill="none" stroke="#16302a" strokeWidth="2.6" {...SJ} />
      </V>
      <V c="g15-pn-slip" l={39} t={41} w={22} h={12} d={260}>{slip}</V>
      <V c="g15-handin" l={36} t={38} w={14} h={12} d={440}>{roller}</V>
      <V c="g15-pn-init" l={53} t={46} w={11} h={10} d={620}>
        <path d="M4 18c3-8 6-10 8-4s5 4 8-4" fill="none" stroke="#fff4d6" strokeWidth="2.2" {...SJ} />
      </V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g15-motes" l={42 + i * 7} t={49} w={1.5} h={1.5} d={760 + i * 80} st={{ borderRadius: "50%", background: "#7fc2a8" }} />
      ))}
    </Lead>
  );
}

/* --- 9. All-Seeing Spire (t6) — NAILED TO THE POST --------------------------
   The proclamation is slapped flat against the post, four nails are driven in
   at the corners one after another, and the sheet thrums against the wood with
   splinters still coming off it.
   Palette: #9ec8d8 / #fff4d6 / #17262e. */
const SP_NAILS: Array<[number, number]> = [[41, 39], [56, 39], [41, 55], [56, 55]];

function AllSeeingSpireScene({ role, delayMs }: SceneProps) {
  const bill = (
    <g {...SJ}>
      <path d="M3.4 2.6h17.2v18.8H3.4z" fill="#fff4d6" stroke="#17262e" strokeWidth="1.1" />
      <path d="M6.4 7h11.2M6.4 10.4h11.2M6.4 13.8h7.6" stroke="#9ec8d8" strokeWidth="1.1" />
      <path d={EYE} fill="none" stroke="#17262e" strokeWidth="1.1" transform="translate(6 8.4) scale(0.5)" />
    </g>
  );
  const nail = <path d="M12 3.4v13M8.6 3.4h6.8" stroke="#9ec8d8" strokeWidth="2.6" fill="none" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g15-sp-sheet" l={16} t={10} w={68} h={78} d={40}>{bill}</V>
        <V c="g15-nailin" l={18} t={12} w={22} h={26} d={260}>{nail}</V>
        <V c="g15-sp-thrum" l={16} t={10} w={68} h={78} d={470}>{bill}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hitside" l={18} t={10} w={64} h={76} d={0}>{bill}</V>
        <V c="g15-hit" l={20} t={12} w={20} h={24} d={140}>{nail}</V>
        <L c="g15-hit2" l={30} t={82} w={40} h={4} d={260} st={{ borderRadius: "999px", background: "#9ec8d8" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(158,200,216,0.26)" />}>
      <V c="g15-sp-sheet" l={38} t={36} w={24} h={26} d={80}>{bill}</V>
      <V c="g15-strike" l={34} t={26} w={14} h={16} d={220} st={{ transformOrigin: "80% 90%" }}>
        <path d="M4 4h12v6H4z M9 10h2v11H9z" fill="#9ec8d8" stroke="#17262e" strokeWidth="1.1" {...SJ} />
      </V>
      {SP_NAILS.map(([l, t], i) => (
        <V key={i} c="g15-nailin" l={l} t={t} w={5} h={6} d={240 + i * 100}>{nail}</V>
      ))}
      <V c="g15-sp-thrum" l={38} t={36} w={24} h={26} d={620}>{bill}</V>
      <L c="g15-leanshadow" l={39} t={62} w={22} h={4} d={680} st={{ borderRadius: "999px", background: "rgba(23,38,46,0.58)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g15-sift" l={41 + i * 8} t={54} w={1.4} h={1.4} d={740 + i * 80} st={{ borderRadius: "50%", background: "#9ec8d8" }} />
      ))}
    </Lead>
  );
}

/* --- 10. Raven's Court (t6) — THE SIGNET RING TURNED AND PRESSED ------------
   A ring is turned stone-inward on the finger, pressed into a pool of black
   wax, and lifted; the raven device stands up out of the pool and one feather
   comes down after it, drifting away from the caster's own edge.
   Palette: #8f7fb0 / #fff4d6 / #1a1524. */
function RavensCourtScene({ role, delayMs }: SceneProps) {
  const ring = (
    <g {...SJ}>
      <circle cx="12" cy="14.6" r="6.4" fill="none" stroke="#8f7fb0" strokeWidth="2.2" />
      <path d="M8.4 6.4h7.2v4.8H8.4z" fill="#1a1524" stroke="#8f7fb0" strokeWidth="1.3" />
      <path d="M10 8.8h4" stroke="#fff4d6" strokeWidth="1.1" />
    </g>
  );
  const device = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="9.4" fill="#1a1524" stroke="#8f7fb0" strokeWidth="1.3" />
      <path d={RAVEN} fill="#8f7fb0" transform="translate(3.6 3.6) scale(0.7)" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g15-rc-ring" l={26} t={6} w={48} h={56} d={40}>{ring}</V>
        <V c="g15-impress" l={28} t={38} w={44} h={44} d={260}>{device}</V>
        <V c="g15-rc-feather" l={56} t={12} w={30} h={30} d={470}>
          <path d="M4 20c0-8 4.4-14 12-16 1.6 6-.6 13-6.6 17z" fill="#8f7fb0" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hitside" l={28} t={4} w={44} h={52} d={0}>{ring}</V>
        <V c="g15-hit" l={26} t={32} w={48} h={48} d={140}>{device}</V>
        <L c="g15-hit2" l={34} t={40} w={32} h={32} d={260} st={{ borderRadius: "50%", border: "2px solid #8f7fb0" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(143,127,176,0.28)" />
          <Rim tone="rgba(255,244,214,0.24)" />
        </>
      }
    >
      <V c="g15-rc-ring" l={43} t={30} w={14} h={18} d={90}>{ring}</V>
      <V c="g15-press" l={43} t={34} w={14} h={16} d={280}>{ring}</V>
      <V c="g15-lift" l={43} t={32} w={14} h={17} d={480}>{ring}</V>
      <V c="g15-impress" l={44.5} t={43} w={11} h={11} d={500}>{device}</V>
      <V c="g15-rc-feather" l={52} t={38} w={9} h={9} d={660}>
        <path d="M4 20c0-8 4.4-14 12-16 1.6 6-.6 13-6.6 17z" fill="#8f7fb0" />
      </V>
      <L c="g15-glint" l={47} t={41} w={2.4} h={2.4} d={780} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 11. Wax Seal (t6) — THE LADLE POUR ------------------------------------
   The ladle tips over the fold, a thread of molten wax falls and pools, the
   matrix comes down into it, and when it lifts the wax comes with it in
   strings before letting go. A wisp of smoke leaves with them.
   Palette: #d2452f / #ffe4bd / #2c0f0a. */
function WaxSealScene({ role, delayMs }: SceneProps) {
  const ladle = (
    <g {...SJ}>
      <path d="M3 6.4h9.6v5.2c0 2.4-1.8 3.8-4.8 3.8S3 14 3 11.6z" fill="#2c0f0a" stroke="#d2452f" strokeWidth="1.2" />
      <path d="M12.6 8h8.4" stroke="#d2452f" strokeWidth="1.8" />
    </g>
  );
  const matrix = (
    <g {...SJ}>
      <path d="M7 2.6h10v7.4H7z" fill="#2c0f0a" stroke="#ffe4bd" strokeWidth="1.1" />
      <path d="M4.6 10h14.8v5.4H4.6z" fill="#ffe4bd" stroke="#2c0f0a" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g15-ws-ladle" l={6} t={8} w={54} h={44} d={40} st={{ transformOrigin: "20% 60%" }}>{ladle}</V>
        <L c="g15-ws-pour" l={40} t={34} w={7} h={34} d={260} st={{ background: "linear-gradient(180deg, #d2452f, rgba(210,69,47,0.4))", transformOrigin: "50% 0%" }} />
        <V c="g15-impress" l={26} t={50} w={48} h={40} d={470}>
          <circle cx="12" cy="12" r="9.6" fill="#d2452f" stroke="#2c0f0a" strokeWidth="1.2" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hitside" l={26} t={4} w={48} h={44} d={0}>{matrix}</V>
        <V c="g15-hit" l={28} t={40} w={44} h={44} d={140}>
          <circle cx="12" cy="12" r="9.6" fill="#d2452f" stroke="#2c0f0a" strokeWidth="1.2" />
        </V>
        <L c="g15-hit2" l={38} t={50} w={24} h={24} d={260} st={{ borderRadius: "50%", background: "#ffe4bd" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(210,69,47,0.3)" />}>
      <V c="g15-ws-ladle" l={33} t={30} w={16} h={14} d={80} st={{ transformOrigin: "20% 60%" }}>{ladle}</V>
      <L c="g15-ws-pour" l={45} t={38} w={2.4} h={10} d={220} st={{ background: "linear-gradient(180deg, #d2452f, rgba(210,69,47,0.35))", transformOrigin: "50% 0%" }} />
      <V c="g15-press" l={42} t={34} w={16} h={16} d={420}>{matrix}</V>
      <L c="g15-leanshadow" l={41} t={54} w={18} h={4} d={560} st={{ borderRadius: "999px", background: "rgba(44,15,10,0.62)" }} />
      <V c="g15-ws-strings" l={42} t={34} w={16} h={18} d={600}>{matrix}</V>
      <V c="g15-impress" l={44.5} t={44} w={11} h={11} d={640}>
        <circle cx="12" cy="12" r="9.6" fill="#d2452f" stroke="#2c0f0a" strokeWidth="1.2" />
        <path d="M8 12h8M12 8v8" stroke="#ffe4bd" strokeWidth="1.2" {...SJ} />
      </V>
      <L c="g15-curl" l={48} t={40} w={3} h={8} d={740} st={{ borderRadius: "999px", background: "linear-gradient(180deg, rgba(255,228,189,0.7), transparent)" }} />
    </Lead>
  );
}

/* --- 12. Grand Illusionist (t6) — THE THUMBPRINT THAT DOES NOT MATCH -------
   The ink pad slides in, the thumb is rolled across it and rolled again onto
   the page. The print it leaves has the wrong whorl entirely, and slides off
   the edge of the sheet while nobody is looking.
   Palette: #b48fd8 / #fff4d6 / #241635. */
const GI_WHORL = "M12 5.4a6.6 6.6 0 0 1 0 13.2 4.4 4.4 0 0 1 0-8.8 2.2 2.2 0 0 1 0 4.4";

function GrandIllusionistScene({ role, delayMs }: SceneProps) {
  const pad = (
    <g {...SJ}>
      <path d="M2.6 8.4h18.8v7.2H2.6z" fill="#241635" stroke="#b48fd8" strokeWidth="1.2" />
      <path d="M5 11.4h14" stroke="#b48fd8" strokeWidth="1.4" />
    </g>
  );
  const thumb = (
    <g {...SJ}>
      <path d="M9 21.4V13c0-4.6 1.6-9.6 4.4-9.6 2 0 3 1.8 2.4 4.4l-1 4.2h3.4c1.6 0 2.2 1.6 1.4 3l-3 6.4z" fill="#fff4d6" stroke="#241635" strokeWidth="1.1" />
    </g>
  );
  const whorl = <path d={GI_WHORL} fill="none" stroke="#b48fd8" strokeWidth="1.5" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g15-handin" l={8} t={44} w={72} h={40} d={40}>{pad}</V>
        <V c="g15-roll" l={26} t={8} w={44} h={60} d={260}>{thumb}</V>
        <V c="g15-impress" l={32} t={34} w={36} h={36} d={470}>{whorl}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hitside" l={28} t={8} w={44} h={58} d={0}>{thumb}</V>
        <V c="g15-hit" l={30} t={32} w={40} h={40} d={140}>{whorl}</V>
        <L c="g15-hit2" l={22} t={78} w={56} h={4} d={260} st={{ borderRadius: "999px", background: "#b48fd8" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(180,143,216,0.28)" />}>
      <V c="g15-handin" l={36} t={48} w={20} h={10} d={90}>{pad}</V>
      <V c="g15-roll" l={42} t={32} w={12} h={16} d={240}>{thumb}</V>
      <V c="g15-gi-print" l={44} t={40} w={12} h={16} d={420}>{thumb}</V>
      <V c="g15-impress" l={45} t={44} w={10} h={10} d={560}>{whorl}</V>
      <V c="g15-gi-slide" l={45} t={44} w={10} h={10} d={700}>{whorl}</V>
      <L c="g15-glint" l={53} t={42} w={2.4} h={2.4} d={780} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 13. Season Pass (t6) — SWIPED AND VALIDATED ----------------------------
   The reader's lamp blinks awake, the gold pass is swiped through from the
   caster's own side, the mechanism goes ka-chunk, the holographic band walks
   across the face and the validation date prints itself into the stub.
   Palette: #6fd8c0 / #fff4d6 / #10302c. */
function SeasonPassScene({ role, delayMs }: SceneProps) {
  const card = (
    <g {...SJ}>
      <path d="M2.4 6.4h19.2v11.2H2.4z" fill="#6fd8c0" stroke="#10302c" strokeWidth="1.2" />
      <path d="M2.4 9.4h19.2" stroke="#10302c" strokeWidth="1.6" />
      <path d="M5 14h6" stroke="#fff4d6" strokeWidth="1.3" />
    </g>
  );
  const slot = (
    <g {...SJ}>
      <path d="M3 4.6h18v14.8H3z" fill="#10302c" stroke="#6fd8c0" strokeWidth="1.2" />
      <path d="M5.4 9.6h13.2v2.4H5.4z" fill="#6fd8c0" />
      <circle cx="18" cy="16.4" r="1.4" fill="#fff4d6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g15-sp2-slot" l={20} t={18} w={60} h={60} d={40}>{slot}</V>
        <V c="g15-swipe" l={4} t={34} w={62} h={34} d={260}>{card}</V>
        <L c="g15-sp2-holo" l={18} t={36} w={64} h={26} d={470} st={{ background: "linear-gradient(100deg, transparent, rgba(255,244,214,0.8), transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hitside" l={16} t={30} w={68} h={40} d={0}>{card}</V>
        <L c="g15-hit2" l={18} t={34} w={64} h={22} d={140} st={{ background: "linear-gradient(100deg, transparent, rgba(255,244,214,0.75), transparent)" }} />
        <V c="g15-hit" l={34} t={34} w={32} h={32} d={260}>
          <path d="M5 12l4.4 4.6L19 6.4" fill="none" stroke="#6fd8c0" strokeWidth="2.6" {...SJ} />
        </V>
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(111,216,192,0.26)" />
          <Rim tone="rgba(255,244,214,0.26)" />
        </>
      }
    >
      <V c="g15-sp2-slot" l={42} t={38} w={18} h={18} d={80}>{slot}</V>
      <V c="g15-swipe" l={34} t={42} w={20} h={11} d={220}>{card}</V>
      <L c="g15-ka" l={41} t={37} w={20} h={20} d={420} st={{ border: "2px solid #6fd8c0" }} />
      <L c="g15-sp2-holo" l={40} t={42} w={22} h={9} d={560} st={{ background: "linear-gradient(100deg, transparent, rgba(255,244,214,0.8), transparent)" }} />
      <V c="g15-impress" l={45} t={45} w={11} h={9} d={660} par="none" vb="0 0 40 20">
        <text x="20" y="15" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff4d6">VALID</text>
      </V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g15-motes" l={43 + i * 7} t={50} w={1.5} h={1.5} d={780 + i * 80} st={{ borderRadius: "50%", background: "#6fd8c0" }} />
      ))}
    </Lead>
  );
}

/* --- 14. Dead Letter (t5) — RETURNED, UNDELIVERABLE -------------------------
   The letter falls into the pigeonhole from the caster's own side, the hand
   stamp comes down on it, the address is ruled through, and the dead-letter
   drawer shuts on the whole business.
   Palette: #a8564e / #f4e6c8 / #241a16. */
function DeadLetterScene({ role, delayMs }: SceneProps) {
  const letter = (
    <g {...SJ}>
      <path d="M2.6 6.4h18.8v11.2H2.6z" fill="#f4e6c8" stroke="#241a16" strokeWidth="1.1" />
      <path d="M2.6 6.4L12 13l9.4-6.6" fill="none" stroke="#a8564e" strokeWidth="1.2" />
    </g>
  );
  const stamp = (
    <g {...SJ}>
      <path d="M8 2.6h8v7H8z" fill="#241a16" stroke="#a8564e" strokeWidth="1.1" />
      <path d="M4.6 9.6h14.8v4.4H4.6z" fill="#a8564e" stroke="#241a16" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g15-dl-fall" l={14} t={34} w={72} h={44} d={40}>{letter}</V>
        <V c="g15-ent-press" l={26} t={2} w={48} h={48} d={260}>{stamp}</V>
        <V c="g15-impress" l={16} t={38} w={68} h={34} d={470} par="none" vb="0 0 60 20">
          <text x="30" y="15" textAnchor="middle" fontSize="11" fontWeight="700" fill="#a8564e">RETURNED</text>
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hitside" l={16} t={32} w={68} h={40} d={0}>{letter}</V>
        <V c="g15-hit" l={30} t={16} w={40} h={40} d={140}>{stamp}</V>
        <L c="g15-hit2" l={18} t={34} w={64} h={4} d={260} st={{ borderRadius: "999px", background: "#a8564e", rotate: "18deg" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(168,86,78,0.28)" />}>
      <V c="g15-dl-fall" l={39} t={40} w={22} h={13} d={80}>{letter}</V>
      <V c="g15-strike" l={42} t={28} w={16} h={16} d={260} st={{ transformOrigin: "50% 100%" }}>{stamp}</V>
      <V c="g15-impress" l={40} t={42} w={20} h={9} d={340} par="none" vb="0 0 60 20">
        <text x="30" y="15" textAnchor="middle" fontSize="11" fontWeight="700" fill="#a8564e">UNDELIVERABLE</text>
      </V>
      <V c="g15-draw" l={38} t={41} w={24} h={10} d={520} st={{ transformOrigin: "0% 50%" }}>
        <path d="M1 20L23 4" fill="none" stroke="#a8564e" strokeWidth="2.4" {...SJ} />
      </V>
      <L c="g15-shut" l={36} t={50} w={28} h={12} d={680} st={{ background: "linear-gradient(180deg, #241a16, rgba(36,26,22,0.25))", transformOrigin: "50% 100%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g15-sift" l={42 + i * 7} t={49} w={1.4} h={1.4} d={760 + i * 80} st={{ borderRadius: "50%", background: "#a8564e" }} />
      ))}
    </Lead>
  );
}

/* --- 15. Paper Orders (t5) — THE SATCHEL SWAPPED ON THE ROAD ----------------
   Aim-staged down the courier's road. The buckle flips open, the real orders
   slip out, a blank sheet slips in behind them, a coin turns over in a palm,
   and the flap closes as if nothing had happened at all.
   Palette: #b9a06a / #fff2dc / #2a2012. */
function PaperOrdersScene({ role, delayMs }: SceneProps) {
  const buckle = (
    <g fill="none" stroke="#b9a06a" strokeWidth="1.8" {...SJ}>
      <path d="M5 6.4h14v11.2H5z" />
      <path d="M9.4 6.4v11.2M2.6 12H5" />
    </g>
  );
  const orders = (
    <g {...SJ}>
      <path d={SHEET} fill="#fff2dc" stroke="#2a2012" strokeWidth="1.1" />
      <path d="M7 12h9M7 15h6" stroke="#b9a06a" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g15-po-buckle" l={22} t={22} w={56} h={56} d={40}>{buckle}</V>
        <V c="g15-po-out" l={10} t={26} w={48} h={52} d={260}>{orders}</V>
        <L c="g15-po-coin" l={58} t={44} w={20} h={20} d={470} st={{ borderRadius: "50%", background: "#b9a06a" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hitside" l={22} t={20} w={56} h={56} d={0}>{buckle}</V>
        <V c="g15-hit" l={12} t={28} w={44} h={48} d={140}>{orders}</V>
        <L c="g15-hit2" l={62} t={46} w={16} h={16} d={260} st={{ borderRadius: "50%", background: "#b9a06a" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(185,160,106,0.26)" />}>
      <L c="g15-runout" l={46} t={49} w={30} h={2} d={60} st={{ background: "linear-gradient(90deg, #b9a06a, rgba(185,160,106,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g15-po-buckle" l={43} t={40} w={16} h={16} d={100}>{buckle}</V>
      <V c="g15-po-out" l={38} t={41} w={12} h={14} d={280}>{orders}</V>
      <V c="g15-drop" l={50} t={40} w={11} h={13} d={440}>
        <path d={SHEET} fill="#fff2dc" opacity="0.85" />
      </V>
      <L c="g15-po-coin" l={57} t={44} w={5} h={5} d={580} st={{ borderRadius: "50%", background: "#b9a06a" }} />
      <L c="g15-shut" l={42} t={39} w={18} h={8} d={700} st={{ background: "linear-gradient(180deg, #2a2012, rgba(42,32,18,0.3))", transformOrigin: "50% 0%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g15-sift" l={44 + i * 6} t={52} w={1.4} h={1.4} d={780 + i * 70} st={{ borderRadius: "50%", background: "#b9a06a" }} />
      ))}
    </AimLead>
  );
}

/* --- 16. Checkmate Rehearsal (t5) — THE PROMPT BOOK MARKED UP ---------------
   The prompt book falls open, a grease pencil rings the move that has to
   happen, an underline is swept beneath it, the ribbon marker is laid in from
   the caster's side and the book snaps shut on the ribbon.
   Palette: #e0685a / #fff4d6 / #2c1512. */
function CheckmateRehearsalScene({ role, delayMs }: SceneProps) {
  const book = (
    <g {...SJ}>
      <path d="M2.4 4.6h9.6v15.4H2.4zM12 4.6h9.6v15.4H12z" fill="#fff4d6" stroke="#2c1512" strokeWidth="1.1" />
      <path d="M4.6 8.4h5M4.6 11.4h5M14.4 8.4h5M14.4 11.4h5" stroke="#e0685a" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g15-cr-book" l={12} t={22} w={76} h={56} d={40}>{book}</V>
        <V c="g15-cr-ring" l={44} t={30} w={34} h={34} d={260}>
          <ellipse cx="12" cy="12" rx="9.6" ry="7" fill="none" stroke="#e0685a" strokeWidth="2.2" />
        </V>
        <L c="g15-cr-ribbon" l={54} t={20} w={6} h={62} d={470} st={{ background: "linear-gradient(180deg, #e0685a, rgba(224,104,90,0.4))", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hitside" l={14} t={22} w={72} h={54} d={0}>{book}</V>
        <V c="g15-hit" l={46} t={30} w={32} h={32} d={140}>
          <ellipse cx="12" cy="12" rx="9.6" ry="7" fill="none" stroke="#e0685a" strokeWidth="2.4" />
        </V>
        <L c="g15-hit2" l={52} t={24} w={5} h={56} d={260} st={{ background: "#e0685a" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(224,104,90,0.26)" />}>
      <V c="g15-cr-book" l={38} t={38} w={24} h={20} d={80}>{book}</V>
      <V c="g15-cr-ring" l={49} t={41} w={11} h={11} d={260}>
        <ellipse cx="12" cy="12" rx="9.6" ry="7" fill="none" stroke="#e0685a" strokeWidth="2.4" />
      </V>
      <V c="g15-draw" l={48} t={48} w={13} h={5} d={420} st={{ transformOrigin: "0% 50%" }}>
        <path d="M1 12h22" fill="none" stroke="#e0685a" strokeWidth="2.6" {...SJ} />
      </V>
      <L c="g15-cr-ribbon" l={50} t={36} w={2} h={24} d={560} st={{ background: "linear-gradient(180deg, #e0685a, rgba(224,104,90,0.35))", transformOrigin: "50% 0%" }} />
      <L c="g15-shut" l={38} t={44} w={24} h={14} d={700} st={{ background: "linear-gradient(180deg, #2c1512, rgba(44,21,18,0.3))", transformOrigin: "50% 100%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g15-sift" l={41 + i * 7} t={52} w={1.4} h={1.4} d={780 + i * 70} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 17. Upper Shelf (t5) — LACED, SEALED, AND FILED HIGH -------------------
   Three holes are punched down the margin, a needle draws silk lace through
   them, the ends are gathered into a knot, a wax wafer is pressed over the
   knot, and the deed is pushed up onto the top shelf out of easy reach.
   Palette: #7f9ad0 / #fff4d6 / #182238. */
const US_HOLES = [40, 46, 52];

function UpperShelfScene({ role, delayMs }: SceneProps) {
  const deed = (
    <g {...SJ}>
      <path d={SHEET} fill="#fff4d6" stroke="#182238" strokeWidth="1.1" />
      <path d={SHEET_FOLD} fill="none" stroke="#182238" strokeWidth="0.9" />
      <path d="M8 11h8M8 14h8M8 17h5" stroke="#7f9ad0" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g15-us-holes" l={20} t={14} w={60} h={72} d={40}>{deed}</V>
        <V c="g15-thread" l={16} t={40} w={68} h={24} d={260} st={{ transformOrigin: "0% 50%" }}>
          <path d="M1 12h22" fill="none" stroke="#7f9ad0" strokeWidth="2.2" {...SJ} />
        </V>
        <V c="g15-us-knot" l={40} t={38} w={30} h={30} d={470}>
          <path d="M6 6c6 2 6 10 12 12M18 6c-6 2-6 10-12 12" fill="none" stroke="#7f9ad0" strokeWidth="2.2" {...SJ} />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hitside" l={22} t={14} w={56} h={70} d={0}>{deed}</V>
        <V c="g15-hit" l={38} t={36} w={28} h={28} d={140}>
          <path d="M6 6c6 2 6 10 12 12M18 6c-6 2-6 10-12 12" fill="none" stroke="#7f9ad0" strokeWidth="2.4" {...SJ} />
        </V>
        <L c="g15-hit2" l={40} t={40} w={22} h={22} d={260} st={{ borderRadius: "50%", background: "#7f9ad0" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(127,154,208,0.26)" />
          <Rim tone="rgba(255,244,214,0.26)" />
        </>
      }
    >
      <V c="g15-us-holes" l={40} t={36} w={20} h={24} d={80}>{deed}</V>
      {US_HOLES.map((t, i) => (
        <V key={t} c="g15-thread" l={41} t={t} w={16} h={4} d={240 + i * 90} st={{ transformOrigin: "0% 50%" }}>
          <path d="M1 12h22" fill="none" stroke="#7f9ad0" strokeWidth="3" {...SJ} />
        </V>
      ))}
      <V c="g15-us-knot" l={54} t={42} w={9} h={9} d={440}>
        <path d="M6 6c6 2 6 10 12 12M18 6c-6 2-6 10-12 12" fill="none" stroke="#7f9ad0" strokeWidth="2.4" {...SJ} />
      </V>
      <V c="g15-press" l={54.5} t={42.5} w={8} h={8} d={580}>
        <circle cx="12" cy="12" r="9.6" fill="#7f9ad0" stroke="#182238" strokeWidth="1.3" />
      </V>
      <L c="g15-us-shelf" l={36} t={34} w={28} h={3} d={700} st={{ borderRadius: "999px", background: "#182238" }} />
      <L c="g15-glint" l={57} t={41} w={2.4} h={2.4} d={800} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 18. Augur's Flight (t4) — THE WAX TABLET FOLDED AND CORDED -------------
   Aim-staged along the flight. Three birds cross the leg, the stylus scratches
   what they meant into the wax, the two leaves of the diptych fold shut on it,
   the cord is wound round and a blob of wax is pressed on the knot.
   Palette: #9ec4a8 / #fff4d6 / #17281d. */
function AugursFlightScene({ role, delayMs }: SceneProps) {
  const bird = <path d="M2 14c4 1 7-1 9-5 1 3.2 4 4.8 9 4" fill="none" stroke="#9ec4a8" strokeWidth="2" {...SJ} />;
  const tablet = (
    <g {...SJ}>
      <path d="M2.6 4.6h8.8v14.8H2.6zM12.6 4.6h8.8v14.8h-8.8z" fill="#17281d" stroke="#9ec4a8" strokeWidth="1.2" />
      <path d="M4.6 8h4.8M4.6 11h4.8M14.6 8h4.8" stroke="#fff4d6" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g15-af-birds" l={6} t={8} w={44} h={36} d={40}>{bird}</V>
        <V c="g15-af-stylus" l={30} t={4} w={40} h={54} d={260}>
          <path d="M13.4 2.4l3 3-9.4 9.4-4 1 1-4z" fill="#9ec4a8" stroke="#17281d" strokeWidth="1.1" {...SJ} />
        </V>
        <V c="g15-af-fold" l={18} t={40} w={64} h={48} d={470}>{tablet}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hitside" l={18} t={26} w={64} h={48} d={0}>{tablet}</V>
        <V c="g15-hit" l={12} t={8} w={40} h={32} d={140}>{bird}</V>
        <L c="g15-hit2" l={44} t={24} w={12} h={52} d={260} st={{ background: "#9ec4a8" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(158,196,168,0.26)" />}>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g15-af-birds" l={44 + i * 4} t={38 - i * 3} w={9} h={7} d={80 + i * 110}>{bird}</V>
      ))}
      <V c="g15-af-stylus" l={44} t={34} w={12} h={14} d={260}>
        <path d="M13.4 2.4l3 3-9.4 9.4-4 1 1-4z" fill="#9ec4a8" stroke="#17281d" strokeWidth="1.1" {...SJ} />
      </V>
      <V c="g15-af-fold" l={42} t={42} w={18} h={14} d={460}>{tablet}</V>
      <V c="g15-thread" l={43} t={47} w={16} h={4} d={600} st={{ transformOrigin: "0% 50%" }}>
        <path d="M1 12h22" fill="none" stroke="#9ec4a8" strokeWidth="3" {...SJ} />
      </V>
      <V c="g15-press" l={49} t={44} w={8} h={8} d={700}>
        <circle cx="12" cy="12" r="9.6" fill="#9ec4a8" stroke="#17281d" strokeWidth="1.3" />
      </V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g15-motes" l={45 + i * 5} t={50} w={1.4} h={1.4} d={800 + i * 70} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </AimLead>
  );
}

/* --- 19. Season Ticket (t4) — THE CONDUCTOR'S PUNCH -------------------------
   The ticket is fed between the jaws from the caster's edge, the punch bites a
   shaped hole clean through it, the chad drops away, the hole stands there as
   proof, and the counterfoil tears off at the perforation.
   Palette: #d08a4e / #fff4d6 / #2a1608. */
function SeasonTicketScene({ role, delayMs }: SceneProps) {
  const ticket = (
    <g {...SJ}>
      <path d="M2.4 7.4h19.2v9.2H2.4z" fill="#fff4d6" stroke="#2a1608" strokeWidth="1.1" />
      <path d="M15.4 7.4v9.2" stroke="#2a1608" strokeWidth="1" strokeDasharray="1.4 1.4" />
      <path d="M5 11.4h7" stroke="#d08a4e" strokeWidth="1.4" />
    </g>
  );
  const jaws = (
    <g fill="none" stroke="#d08a4e" strokeWidth="1.8" {...SJ}>
      <path d="M4 3.4h10v6.2H4zM4 14.4h10v6.2H4z" />
      <path d="M14 6.4h5.4M14 17.6h5.4" />
    </g>
  );
  const star = <path d="M12 4.4l2.4 5.2 5.6.6-4.2 3.8 1.2 5.6L12 16.8l-5 2.8 1.2-5.6L4 10.2l5.6-.6z" fill="#d08a4e" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g15-handin" l={8} t={34} w={70} h={36} d={40}>{ticket}</V>
        <V c="g15-bite" l={22} t={12} w={56} h={68} d={260}>{jaws}</V>
        <V c="g15-punchout" l={40} t={48} w={30} h={30} d={470}>{star}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hitside" l={12} t={32} w={68} h={36} d={0}>{ticket}</V>
        <V c="g15-hit" l={36} t={32} w={30} h={30} d={140}>{star}</V>
        <L c="g15-hit2" l={70} t={30} w={4} h={40} d={260} st={{ background: "#d08a4e" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(208,138,78,0.26)" />}>
      <V c="g15-handin" l={38} t={44} w={22} h={10} d={90}>{ticket}</V>
      <V c="g15-bite" l={42} t={38} w={16} h={20} d={280}>{jaws}</V>
      <V c="g15-punchout" l={46} t={48} w={8} h={8} d={420}>{star}</V>
      <V c="g15-st-hole" l={46} t={44} w={8} h={8} d={460}>{star}</V>
      <V c="g15-st-tear" l={54} t={43} w={9} h={12} d={640}>
        <path d="M2.4 4.4h9.2v15.2H2.4z" fill="#fff4d6" stroke="#2a1608" strokeWidth="1.2" {...SJ} />
      </V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g15-sift" l={44 + i * 6} t={51} w={1.4} h={1.4} d={780 + i * 70} st={{ borderRadius: "50%", background: "#d08a4e" }} />
      ))}
    </Lead>
  );
}

/* --- 20. Tasting Flight (t4) — THE HOT BRAND -------------------------------
   The iron comes out of the coals already glowing, is held against the cask
   head, and the mark burns in: bright first, then dark and permanent, with the
   smoke leaning away from the caster.
   Palette: #e07a3a / #ffe6c0 / #2a1207. */
function TastingFlightScene({ role, delayMs }: SceneProps) {
  const iron = (
    <g {...SJ}>
      <path d="M2.6 10.4h11v3.2h-11z" fill="#2a1207" stroke="#e07a3a" strokeWidth="1.1" />
      <path d="M13.6 7.4h7.8v9.2h-7.8z" fill="#e07a3a" stroke="#2a1207" strokeWidth="1.1" />
      <path d="M16 10.4h3.2v3.2H16z" fill="#ffe6c0" />
    </g>
  );
  const mark = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="8.6" fill="none" stroke="#e07a3a" strokeWidth="2" />
      <path d="M8 12h8M12 8v8" stroke="#e07a3a" strokeWidth="2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g15-tf-iron" l={6} t={30} w={70} h={40} d={40}>{iron}</V>
        <V c="g15-tf-burn" l={32} t={30} w={40} h={40} d={260}>{mark}</V>
        <L c="g15-curl" l={54} t={8} w={8} h={30} d={470} st={{ borderRadius: "999px", background: "linear-gradient(180deg, rgba(255,230,192,0.7), transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hitside" l={8} t={30} w={64} h={38} d={0}>{iron}</V>
        <V c="g15-hit" l={32} t={30} w={40} h={40} d={140}>{mark}</V>
        <L c="g15-hit2" l={40} t={38} w={24} h={24} d={260} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,230,192,0.8), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(224,122,58,0.28)" />
          <Rim tone="rgba(255,230,192,0.26)" />
        </>
      }
    >
      <V c="g15-tf-iron" l={34} t={41} w={20} h={12} d={80}>{iron}</V>
      <V c="g15-press" l={44} t={41} w={12} h={12} d={280}>{iron}</V>
      <V c="g15-tf-burn" l={45} t={43} w={11} h={11} d={440}>{mark}</V>
      <L c="g15-curl" l={49} t={35} w={3} h={9} d={560} st={{ borderRadius: "999px", background: "linear-gradient(180deg, rgba(255,230,192,0.7), transparent)" }} />
      <V c="g15-lift" l={40} t={39} w={18} h={12} d={660}>{iron}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g15-glint" l={44 + i * 6} t={46 - i * 3} w={2} h={2} d={780 + i * 70} st={{ borderRadius: "50%", background: "#ffe6c0" }} />
      ))}
    </Lead>
  );
}

/* --- 21. Ventriloquist (t4) — THE HAND TRACED OFF A LIGHT BOX ---------------
   Aim-staged at the borrowed knight. The light box glows under the sheet, the
   pen traces someone else's hand exactly, the tracing lifts away, and the
   forged line travels down the leg to land as if that piece had signed it.
   Palette: #7fb6e0 / #fff4d6 / #14243a. */
const VT_SIGN = "M2 17c3.4-8 5.6-9 6.6-3s3 5 4.6-1 3.6-3 4 2c.2 2.6 2 3.4 4.8 1.4";

function VentriloquistScene({ role, delayMs }: SceneProps) {
  const sheet = (
    <g {...SJ}>
      <path d="M2.6 5.4h18.8v13.2H2.6z" fill="rgba(127,182,224,0.35)" stroke="#7fb6e0" strokeWidth="1.2" />
    </g>
  );
  const sign = <path d={VT_SIGN} fill="none" stroke="#fff4d6" strokeWidth="1.8" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g15-vt-box" l={10} t={24} w={80} h={52} d={40}>{sheet}</V>
        <V c="g15-vt-trace" l={14} t={32} w={72} h={40} d={260}>{sign}</V>
        <V c="g15-lift" l={10} t={20} w={80} h={52} d={470}>{sheet}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hitside" l={12} t={26} w={76} h={48} d={0}>{sheet}</V>
        <V c="g15-hit" l={14} t={32} w={72} h={38} d={140}>{sign}</V>
        <L c="g15-hit2" l={30} t={72} w={40} h={4} d={260} st={{ borderRadius: "999px", background: "#7fb6e0" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(127,182,224,0.26)" />}>
      <V c="g15-vt-box" l={40} t={41} w={22} h={13} d={80}>{sheet}</V>
      <V c="g15-vt-trace" l={41} t={43} w={20} h={9} d={260}>{sign}</V>
      <V c="g15-lift" l={40} t={39} w={22} h={13} d={480}>{sheet}</V>
      <V c="g15-carry" l={44} t={44} w={14} h={7} d={600}>{sign}</V>
      <V c="g15-impress" l={57} t={44} w={11} h={7} d={720}>{sign}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g15-motes" l={48 + i * 5} t={49} w={1.4} h={1.4} d={800 + i * 70} st={{ borderRadius: "50%", background: "#7fb6e0" }} />
      ))}
    </AimLead>
  );
}

/* --- 22. Baker's Dozen (t3) — THE TALLY STICK SPLIT -------------------------
   Thirteen notches are cut across the hazel rod, the rod is split lengthwise
   into stock and foil, the two halves swing apart, and then they are held back
   together: the grain matches, so the count is true.
   Palette: #c8a06a / #fff4d6 / #2c1d0e. */
const BD_NOTCHES = [0, 1, 2, 3];

function BakersDozenScene({ role, delayMs }: SceneProps) {
  const rod = (
    <g {...SJ}>
      <path d="M2.4 9.4h19.2v5.2H2.4z" fill="#c8a06a" stroke="#2c1d0e" strokeWidth="1.1" />
      <path d="M6 9.4v5.2M9 9.4v5.2M12 9.4v5.2M15 9.4v5.2M18 9.4v5.2" stroke="#2c1d0e" strokeWidth="1" />
    </g>
  );
  const halfRod = (
    <path d="M2.4 10.4h19.2v3.2H2.4z" fill="#c8a06a" stroke="#2c1d0e" strokeWidth="1.1" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g15-bd-notch" l={8} t={34} w={84} h={32} d={40}>{rod}</V>
        <V c="g15-bd-split" l={8} t={36} w={84} h={28} d={260}>{halfRod}</V>
        <V c="g15-mate" l={8} t={44} w={84} h={28} d={470}>{halfRod}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hitside" l={8} t={32} w={84} h={32} d={0}>{rod}</V>
        <V c="g15-hit" l={8} t={54} w={84} h={26} d={140}>{halfRod}</V>
        <L c="g15-hit2" l={20} t={82} w={60} h={3} d={260} st={{ borderRadius: "999px", background: "#c8a06a" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(200,160,106,0.26)" />}>
      {BD_NOTCHES.map((i) => (
        <V key={i} c="g15-bd-notch" l={40 + i * 5} t={42} w={5} h={12} d={80 + i * 60}>
          <path d="M12 4v16" stroke="#2c1d0e" strokeWidth="3" fill="none" {...SJ} />
        </V>
      ))}
      <V c="g15-bd-split" l={38} t={42} w={24} h={10} d={340}>{rod}</V>
      <V c="g15-tearl" l={38} t={40} w={24} h={7} d={480}>{halfRod}</V>
      <V c="g15-tearr" l={38} t={48} w={24} h={7} d={500}>{halfRod}</V>
      <L c="g15-leanshadow" l={40} t={57} w={20} h={4} d={600} st={{ borderRadius: "999px", background: "rgba(44,29,14,0.6)" }} />
      <V c="g15-mate" l={38} t={44} w={24} h={9} d={660}>{rod}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g15-sift" l={43 + i * 6} t={51} w={1.4} h={1.4} d={780 + i * 70} st={{ borderRadius: "50%", background: "#c8a06a" }} />
      ))}
    </Lead>
  );
}

/* --- 23. Punch Card (t3) — THE CARD IN THE TIME CLOCK -----------------------
   The manila card is pushed into the slot from the caster's own side, the
   machine bites down with one ka-chunk, the inked time prints across the row,
   the bell hops on its stalk and the card is spat back out.
   Palette: #b8c07a / #fff4d6 / #26290f. */
function PunchCardScene({ role, delayMs }: SceneProps) {
  const card = (
    <g {...SJ}>
      <path d="M2.4 5.4h19.2v13.2H2.4z" fill="#b8c07a" stroke="#26290f" strokeWidth="1.1" />
      <path d="M2.4 5.4l3-3h16.2v13.2" fill="none" stroke="#26290f" strokeWidth="0.9" />
      <path d="M5.4 15h4M11 15h4M16.6 15h3" stroke="#26290f" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g15-handin" l={12} t={30} w={72} h={44} d={40}>{card}</V>
        <L c="g15-ka" l={20} t={24} w={60} h={56} d={260} st={{ border: "2px solid #b8c07a" }} />
        <V c="g15-impress" l={24} t={38} w={54} h={26} d={470} par="none" vb="0 0 60 20">
          <text x="30" y="15" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff4d6">07:59</text>
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hitside" l={14} t={30} w={72} h={42} d={0}>{card}</V>
        <L c="g15-hit2" l={20} t={26} w={60} h={50} d={140} st={{ border: "2px solid #b8c07a" }} />
        <V c="g15-hit" l={26} t={38} w={50} h={24} d={260} par="none" vb="0 0 60 20">
          <text x="30" y="15" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff4d6">07:59</text>
        </V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(184,192,122,0.26)" />}>
      <V c="g15-handin" l={38} t={42} w={24} h={14} d={90}>{card}</V>
      <L c="g15-ka" l={40} t={39} w={22} h={20} d={280} st={{ border: "2px solid #b8c07a" }} />
      <V c="g15-impress" l={42} t={44} w={18} h={8} d={420} par="none" vb="0 0 60 20">
        <text x="30" y="15" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff4d6">07:59</text>
      </V>
      <V c="g15-pc-bell" l={55} t={35} w={8} h={8} d={560}>
        <path d="M5 17V11a7 7 0 0 1 14 0v6z" fill="#b8c07a" stroke="#26290f" strokeWidth="1.2" {...SJ} />
      </V>
      <V c="g15-pc-eject" l={38} t={42} w={24} h={14} d={680}>{card}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g15-motes" l={43 + i * 6} t={50} w={1.4} h={1.4} d={780 + i * 70} st={{ borderRadius: "50%", background: "#b8c07a" }} />
      ))}
    </Lead>
  );
}

/* --- 24. Focus Group (t3) — THREE MARKS IN TURN -----------------------------
   The report settles onto the clipboard and three witnesses each put their own
   X on it, one after another. The clerk's brace gathers the three into one
   finding and ticks it off as filed.
   Palette: #9bb8c8 / #fff4d6 / #1c2831. */
const FG_MARKS = [40, 47, 54];

function FocusGroupScene({ role, delayMs }: SceneProps) {
  const report = (
    <g {...SJ}>
      <path d="M3.4 3.4h17.2v17.2H3.4z" fill="#fff4d6" stroke="#1c2831" strokeWidth="1.1" />
      <path d="M8.4 1.6h7.2v3.2H8.4z" fill="#9bb8c8" stroke="#1c2831" strokeWidth="1" />
      <path d="M6.4 9h11.2M6.4 12h11.2M6.4 15h7.6" stroke="#9bb8c8" strokeWidth="1" />
    </g>
  );
  const mark = <path d="M5 5l14 14M19 5L5 19" fill="none" stroke="#1c2831" strokeWidth="2.6" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g15-fg-sheet" l={18} t={12} w={64} h={76} d={40}>{report}</V>
        <V c="g15-fg-mark" l={30} t={38} w={26} h={26} d={260}>{mark}</V>
        <V c="g15-impress" l={54} t={54} w={26} h={26} d={470}>
          <path d="M5 12l4.4 4.6L19 6.4" fill="none" stroke="#9bb8c8" strokeWidth="2.6" {...SJ} />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hitside" l={20} t={12} w={60} h={74} d={0}>{report}</V>
        <V c="g15-hit" l={32} t={36} w={30} h={30} d={140}>{mark}</V>
        <L c="g15-hit2" l={26} t={78} w={48} h={4} d={260} st={{ borderRadius: "999px", background: "#9bb8c8" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(155,184,200,0.26)" />}>
      <V c="g15-fg-sheet" l={39} t={36} w={22} h={24} d={80}>{report}</V>
      {FG_MARKS.map((l, i) => (
        <V key={l} c="g15-fg-mark" l={l} t={44} w={6} h={6} d={240 + i * 120}>{mark}</V>
      ))}
      <V c="g15-draw" l={39} t={50} w={22} h={5} d={600} st={{ transformOrigin: "0% 50%" }}>
        <path d="M1 8v8h22V8" fill="none" stroke="#9bb8c8" strokeWidth="2.4" {...SJ} />
      </V>
      <V c="g15-impress" l={54} t={51} w={8} h={8} d={700}>
        <path d="M5 12l4.4 4.6L19 6.4" fill="none" stroke="#9bb8c8" strokeWidth="3" {...SJ} />
      </V>
      <L c="g15-leanshadow" l={40} t={60} w={20} h={4} d={660} st={{ borderRadius: "999px", background: "rgba(28,40,49,0.58)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g15-sift" l={42 + i * 6} t={55} w={1.4} h={1.4} d={780 + i * 70} st={{ borderRadius: "50%", background: "#9bb8c8" }} />
      ))}
    </Lead>
  );
}

/* --- 25. Coupon Book (t2) — TORN ALONG THE PERFORATION ----------------------
   The dotted line pricks itself into the page, a thumb runs down it to weaken
   the paper, the coupon comes away clean, and the stub left behind in the book
   rocks on its spine with a puff of paper dust.
   Palette: #e8b0c0 / #fff4d6 / #2e1a22. */
function CouponBookScene({ role, delayMs }: SceneProps) {
  const coupon = (
    <g {...SJ}>
      <path d="M2.4 6.4h19.2v11.2H2.4z" fill="#fff4d6" stroke="#2e1a22" strokeWidth="1.1" />
      <path d="M5 10.4h9M5 13.4h6" stroke="#e8b0c0" strokeWidth="1.2" />
      <circle cx="18" cy="12" r="2.4" fill="#e8b0c0" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g15-cb-perf" l={48} t={12} w={4} h={70} d={40} st={{ background: "repeating-linear-gradient(180deg, #2e1a22 0 4px, transparent 4px 9px)" }} />
        <V c="g15-cb-thumb" l={34} t={8} w={34} h={44} d={260}>
          <path d="M9 21.4V13c0-4.6 1.6-9.6 4.4-9.6 2 0 3 1.8 2.4 4.4l-1 4.2h3.4c1.6 0 2.2 1.6 1.4 3l-3 6.4z" fill="#fff4d6" stroke="#2e1a22" strokeWidth="1.1" {...SJ} />
        </V>
        <V c="g15-tearr" l={50} t={34} w={42} h={34} d={470}>{coupon}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g15-hitside" l={10} t={32} w={44} h={36} d={0}>{coupon}</V>
        <V c="g15-hit" l={50} t={34} w={42} h={34} d={140}>{coupon}</V>
        <L c="g15-hit2" l={47} t={22} w={4} h={58} d={260} st={{ background: "#e8b0c0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(232,176,192,0.26)" />}>
      <L c="g15-cb-perf" l={49.4} t={40} w={1.2} h={16} d={80} st={{ background: "repeating-linear-gradient(180deg, #2e1a22 0 3px, transparent 3px 7px)" }} />
      <V c="g15-cb-thumb" l={46} t={34} w={9} h={12} d={240}>
        <path d="M9 21.4V13c0-4.6 1.6-9.6 4.4-9.6 2 0 3 1.8 2.4 4.4l-1 4.2h3.4c1.6 0 2.2 1.6 1.4 3l-3 6.4z" fill="#fff4d6" stroke="#2e1a22" strokeWidth="1.1" {...SJ} />
      </V>
      <V c="g15-tearr" l={50} t={42} w={14} h={11} d={420}>{coupon}</V>
      <V c="g15-cb-stub" l={38} t={42} w={12} h={11} d={560} st={{ transformOrigin: "0% 50%" }}>
        <path d="M2.4 6.4h19.2v11.2H2.4z" fill="#e8b0c0" stroke="#2e1a22" strokeWidth="1.1" {...SJ} />
      </V>
      <L c="g15-leanshadow" l={41} t={57} w={18} h={4} d={660} st={{ borderRadius: "999px", background: "rgba(46,26,34,0.58)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g15-motes" l={44 + i * 6} t={50} w={1.4} h={1.4} d={720 + i * 80} st={{ borderRadius: "50%", background: "#e8b0c0" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   Registry. Every entry declares an anchor; every `sound` is an existing
   SigSoundKey. `source` is deliberately omitted throughout: these cards carry
   no removal diff and decorate no persistent zone, so the play is the cast lead
   on the square it was played on.
   ========================================================================== */

/* =============================================================================
   FLAGSHIP IMPACT PASS — every seal SLAMS DOWN under a column of light.

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

/** A ribboned wax seal: the authority the column drives into the board. */
const impSeal = (fill: string, edge: string): ReactNode => (
  <>
    <circle cx="12" cy="11" r="7" fill={fill} stroke={edge} strokeWidth="1.2" />
    <circle cx="12" cy="11" r="3.4" fill="none" stroke={edge} strokeWidth="1.1" />
    <path d="M8.6 17.4L6.4 22M15.4 17.4l2.2 4.6" stroke={fill} strokeWidth="2.2" strokeLinecap="round" />
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
  bn4_deck_of_kings: S(DeckOfKingsScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "board" }, { rgb: "232 196 106", at: 780, laser: true, glyph: impSeal("#e8c46a", "#2a1e0b"), shock: true, box: [41, 33, 16, 18] }),
  bn4_triumphal_arch: S(TriumphalArchScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast" }, { rgb: "203 184 148", at: 720, laser: true, shock: true, box: [42, 32, 15, 20] }),
  ov_cartographers_vault: S(CartographersVaultScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "vault", anchor: "board" }, { rgb: "159 176 192", at: 740, laser: true, glyph: impSeal("#9fb0c0", "#1c2530"), shock: true, box: [42, 35, 15, 16], rot: 8 }),
  ov_the_menu: S(TheMenuScene, { ordering: "file", staggerMs: 70, victims: "all", hasLead: true, sound: "wall", anchor: "board" }, { rgb: "224 162 78", at: 700, laser: true, shock: true, box: [43, 36, 14, 16] }),
  bn4_eye_of_ages: S(EyeOfAgesScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }, { rgb: "184 199 216", at: 680, laser: true, box: [43, 33, 13, 19] }),
  bn4_feast_of_fools: S(FeastOfFoolsScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", anchor: "board" }, { rgb: "224 122 154", at: 640, glyph: impSeal("#e07a9a", "#2e1420"), shock: true, box: [42, 37, 15, 14] }),
  hx4_broken_supply: S(BrokenSupplyScene, { ordering: "line", staggerMs: 65, victims: "all", hasLead: true, sound: "shades", anchor: "board" }, { rgb: "192 90 60", at: 660, laser: true, shock: true, box: [42, 36, 14, 16], rot: -10 }),
  ov_patch_notes: S(PatchNotesScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }, { rgb: "127 194 168", at: 600, laser: true, box: [44, 35, 12, 17] }),
  bn4_all_seeing_spire: S(AllSeeingSpireScene, { ordering: "octagon", staggerMs: 55, victims: "all", hasLead: true, sound: "wall", anchor: "board" }, { rgb: "158 200 216", at: 640, laser: true, box: [43, 32, 13, 20] }),
  bn4_ravens_court: S(RavensCourtScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board" }, { rgb: "143 127 176", at: 620, laser: true, glyph: impSeal("#8f7fb0", "#1a1524"), box: [42, 36, 14, 15] }),
  hx4_wax_seal: S(WaxSealScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "board" }, { rgb: "210 69 47", at: 680, glyph: impSeal("#d2452f", "#2c0f0a"), shock: true, box: [43, 37, 14, 14] }),
  ov_grand_illusionist: S(GrandIllusionistScene, { ordering: "radial", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "shades", anchor: "cast" }, { rgb: "180 143 216", at: 560, laser: true, box: [44, 36, 12, 16] }),
  ov_season_pass: S(SeasonPassScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }, { rgb: "111 216 192", at: 540, shock: true, box: [44, 39, 12, 12] }),
  hx4_dead_letter: S(DeadLetterScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board" }, { rgb: "168 86 78", at: 580, glyph: impSeal("#a8564e", "#241a16"), box: [43, 38, 13, 13] }),
  hx4_paper_orders: S(PaperOrdersScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "vault", anchor: "board" }, { rgb: "185 160 106", at: 600, laser: true, shock: true, box: [43, 35, 13, 16] }),
  ov_checkmate_rehearsal: S(CheckmateRehearsalScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }, { rgb: "224 104 90", at: 620, shock: true, box: [42, 38, 15, 12] }),
  ov_upper_shelf: S(UpperShelfScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "vault", anchor: "board" }, { rgb: "127 154 208", at: 520, laser: true, box: [44, 34, 12, 17] }),
  bn4_augurs_flight: S(AugursFlightScene, { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }, { rgb: "158 196 168", at: 500, shock: true, box: [44, 39, 12, 11] }),
  bn4_season_ticket: S(SeasonTicketScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }, { rgb: "208 138 78", at: 540, glyph: impSeal("#d08a4e", "#2a1608"), box: [44, 38, 12, 12] }),
  ov_tasting_flight: S(TastingFlightScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "board" }, { rgb: "224 122 58", at: 480, shock: true, box: [45, 40, 11, 11] }),
  ov_ventriloquist: S(VentriloquistScene, { ordering: "line", staggerMs: 60, victims: ["n"], hasLead: true, sound: "shades", anchor: "aim" }, { rgb: "127 182 224", at: 500, laser: true, box: [44, 36, 12, 15], rot: 12 }),
  bn4_bakers_dozen: S(BakersDozenScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "board" }, { rgb: "200 160 106", at: 460, shock: true, box: [44, 40, 12, 11] }),
  bn4_punch_card: S(PunchCardScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }, { rgb: "184 192 122", at: 520, glyph: impSeal("#b8c07a", "#26290f"), box: [43, 38, 13, 12] }),
  ov_focus_group: S(FocusGroupScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "coronation", anchor: "board" }, { rgb: "155 184 200", at: 440, shock: true, box: [45, 39, 11, 11] }),
  bn4_coupon_book: S(CouponBookScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "vault", anchor: "board" }, { rgb: "232 176 192", at: 420, shock: true, box: [45, 40, 10, 10] }),
};
