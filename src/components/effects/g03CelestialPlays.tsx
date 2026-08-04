// g03CelestialPlays — bespoke plays for the 32 tempo / relief cards that used
// to share the generated `hourglass` family (one falling-sand burst, 32 hue
// shifts).
//
// MODULE FICTION: CELESTIAL TIMEKEEPING. No clock, no sand, no dial. Every card
// is a different SKY EVENT that marks or bends time: totality with the corona
// out, a star crossing a meridian wire, a nova fading to its remnant, a
// heliacal rising clearing the dawn horizon, the analemma kinking, a comet
// coming back to collect, a lunar node crossing, an aurora curtain rippling a
// count, the zodiac band clicking round one house, the solstice shadow
// reaching its carved mark.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g03CelestialPlays.css), transform/opacity animations only, no imports
// from BoardEffects.tsx, only the SigPlugin/SigRole TYPES from sigPlugins.tsx.
//
// STAGING. Every card declares anchor "cast" or "aim", so the event happens in
// the patch of sky over the square the card was played on. Board-scale layers
// (the night wash, the twilight rim, the horizon rail) live inside
// <BoardFrame>, never at a fixed percentage of the stage. The four cards whose
// fiction genuinely travels — a transit across a wire, a pulsar beam, a bolide,
// a returning comet — use <AimStage> and author their art pointing RIGHT.
//
// Every scene runs three beats — tell, strike, settle — in all three roles
// ("lead", "target", "entrance"), and every lead carries at least one animated
// layer driven by the geometry vars (--fx-ox/--fx-oy sky lean, --fx-side for
// the observer's own horizon, --fx-len for how far the light travelled), which
// is what makes the play directional rather than decorative. All CSS lives in
// g03CelestialPlays.css behind the `g03-` prefix.

import "./g03CelestialPlays.css";

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
const rootStyle = (d: number): CSSProperties => ({ "--g03-d": `${d}ms` }) as CSSProperties;

/** stagger + a beat offset, scaled by the Settings animation-speed var. */
const b = (ms: number): string => `calc(var(--g03-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

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

/** Cast-anchored lead: the event over the cast square, `frame` over the board. */
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

/** Board-wide sky wash, always inside a BoardFrame. */
function Wash({ tone, d = 0 }: { tone: string; d?: number }) {
  return <L c="g03-wash" d={d} st={{ background: `radial-gradient(circle at 50% 46%, ${tone}, transparent 72%)` }} />;
}

/** Board-edge twilight, always inside a BoardFrame. */
function Rim({ tone, d = 160 }: { tone: string; d?: number }) {
  return <L c="g03-rim" d={d} st={{ boxShadow: `inset 0 0 32px 10px ${tone}` }} />;
}

/** Night falling over the whole board, always inside a BoardFrame. */
function Night({ tone, d = 0 }: { tone: string; d?: number }) {
  return <L c="g03-night" d={d} st={{ background: tone }} />;
}

/* Shared sky glyphs. */
const STAR = "M12 2.2l2.1 7.2 7.2 2.6-7.2 2.6L12 21.8l-2.1-7.2L2.7 12.4l7.2-2.6z";
const SPARKSTAR = "M12 4l1.1 6L19 12l-5.9 2 -1.1 6-1.1-6L5 12l5.9-2z";
const CREST = "M2 20c6.4-.6 11-4.2 13.2-10.2l4.6 1.8C17.2 18.4 10.2 21.4 2 20z";

/* Piece silhouettes, for the cards whose fiction names a piece. */
const PAWN = "M12 4.4a2.7 2.7 0 0 1 1.6 4.9l1.8 6.4H8.6l1.8-6.4A2.7 2.7 0 0 1 12 4.4z M7.4 16.8h9.2V19.4H7.4z";
const KING = "M11.1 2.4h1.8v1.5h1.5v1.8h-1.5v1.6h-1.8V5.7H9.6V3.9h1.5zM8 9.2h8l-1.1 7.4H9.1zM7.2 17.6h9.6V20H7.2z";
const ROOK = "M7 4.8h2.3v1.6h1.6V4.8h2.2v1.6h1.6V4.8H17v3.6h-1.2v6.8H17V19H7v-3.8h1.2V8.4H7z";
const QUEEN = "M6.4 6l1.3 3.2L9.4 6.6 12 9.4l2.6-2.8 1.7 2.6L17.6 6l-1 10.4H7.4zM7 17.4h10v2.4H7z";
const KNIGHT = "M8.2 19V13c0-3.8 2.5-5.9 4.6-6.5L12 4.2l3 1.2c2 .9 2.9 2.9 2.9 5.9V19z";

/* --- 1. The Bell Tolls (t5) — TOTALITY --------------------------------------
   The dark limb slides over the sun, the last bead of light snaps off, the
   corona stands out white-gold and the stars come out at noon. Nothing moves
   until the sun is let go. Palette: #ffcf6e / #fff2cf / #1b1430. */
function TotalityScene({ role, delayMs }: SceneProps) {
  const disc = <circle cx="12" cy="12" r="7.4" fill="#ffcf6e" />;
  const limb = <circle cx="12" cy="12" r="7.6" fill="#1b1430" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g03-ent-pop" l={20} t={20} w={60} h={60} d={40}>{disc}</V>
        <V c="g03-tl-limb" l={18} t={18} w={64} h={64} d={260}>{limb}</V>
        <L c="g03-tl-corona" l={8} t={8} w={84} h={84} d={430} st={{ borderRadius: "50%", background: "radial-gradient(circle, transparent 44%, rgba(255,242,207,0.75) 52%, transparent 74%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g03-hit" l={22} t={22} w={56} h={56} d={0}>{disc}</V>
        <V c="g03-hitside" l={20} t={20} w={60} h={60} d={140}>{limb}</V>
        <L c="g03-hit2" l={10} t={10} w={80} h={80} d={260} st={{ borderRadius: "50%", border: "2px solid #fff2cf" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Night tone="rgba(18,14,40,0.62)" d={200} />
          <Wash tone="rgba(255,207,110,0.24)" />
          <Rim tone="rgba(255,242,207,0.24)" d={520} />
        </>
      }
    >
      <V c="g03-tl-sun" l={43} t={43} w={14} h={14} d={80}>{disc}</V>
      <V c="g03-tl-limb" l={42.4} t={42.4} w={15.2} h={15.2} d={240}>{limb}</V>
      <L c="g03-tl-bead" l={49} t={43.5} w={3} h={3} d={430} st={{ borderRadius: "50%", background: "#fff2cf" }} />
      <L c="g03-tl-corona" l={37} t={37} w={26} h={26} d={470} st={{ borderRadius: "50%", background: "radial-gradient(circle, transparent 40%, rgba(255,242,207,0.8) 49%, transparent 72%)" }} />
      <L c="g03-castshadow" l={40} t={56} w={20} h={4} d={520} st={{ borderRadius: "999px", background: "rgba(27,20,48,0.8)" }} />
      {[0, 1, 2, 3].map((i) => (
        <V key={i} c="g03-twinkle" l={33 + i * 12} t={33 + (i % 2) * 22} w={4} h={4} d={640 + i * 90}>
          <path d={SPARKSTAR} fill="#fff2cf" />
        </V>
      ))}
    </Lead>
  );
}

/* --- 2. Manager's Challenge (t5) — THE MERIDIAN WIRE ------------------------
   The transit reticle drops over the run, a star crosses the wire, and the
   wire calls it: the star is thrown back the way it came, or the call goes the
   other way and the observer's own mark is struck out. Aim-staged along the
   real vector. Palette: #9fd0ff / #fff4d6 / #131e33. */
function MeridianWireScene({ role, delayMs }: SceneProps) {
  const reticle = (
    <g fill="none" stroke="#9fd0ff" strokeWidth="1.2" {...SJ}>
      <circle cx="12" cy="12" r="9.4" />
      <path d="M12 1.4v21.2M1.4 12h21.2" strokeWidth="0.9" />
      <path d="M9 8.6v6.8M15 8.6v6.8" strokeWidth="0.7" strokeDasharray="1.4 1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g03-ent-pop" l={16} t={16} w={68} h={68} d={40}>{reticle}</V>
        <V c="g03-mw-star" l={20} t={40} w={22} h={22} d={250}><path d={STAR} fill="#fff4d6" /></V>
        <L c="g03-mw-wire" l={48} t={8} w={2} h={84} d={430} st={{ background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g03-hit" l={14} t={14} w={72} h={72} d={0}>{reticle}</V>
        <V c="g03-hitside" l={36} t={36} w={28} h={28} d={140}><path d={STAR} fill="#fff4d6" /></V>
        <L c="g03-hit2" l={48} t={12} w={3} h={76} d={250} st={{ background: "#9fd0ff" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(159,208,255,0.24)" />}>
      <L c="g03-runout" l={45} t={49.2} w={30} h={1.6} d={70} st={{ background: "linear-gradient(90deg, #9fd0ff, rgba(159,208,255,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g03-mw-ret" l={40} t={40} w={20} h={20} d={180}>{reticle}</V>
      <L c="g03-mw-wire" l={49.4} t={40} w={1.2} h={20} d={340} st={{ background: "#fff4d6" }} />
      <V c="g03-mw-star" l={41} t={45} w={7} h={7} d={430}><path d={STAR} fill="#fff4d6" /></V>
      <V c="g03-mw-flip" l={52} t={45} w={7} h={7} d={620}><path d={STAR} fill="#9fd0ff" /></V>
      <L c="g03-glint" l={49} t={47} w={3} h={3} d={700} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </AimLead>
  );
}

/* --- 3. Nesting Doll (t5) — THE NOVA AND ITS SHELLS -------------------------
   A star flares white, blows off one shell, then a smaller shell inside it,
   then a smaller one again, until only the hard little remnant is left turning
   in the middle. Palette: #ff9ec4 / #fff4d6 / #2a1030. */
function NovaShellsScene({ role, delayMs }: SceneProps) {
  const shell = (col: string, w: number) => (
    <circle cx="12" cy="12" r="9.6" fill="none" stroke={col} strokeWidth={w} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g03-ent-pop" l={30} t={30} w={40} h={40} d={40}><path d={STAR} fill="#fff4d6" /></V>
        <V c="g03-nv-shell" l={8} t={8} w={84} h={84} d={260}>{shell("#ff9ec4", 1.6)}</V>
        <V c="g03-nv-core" l={36} t={36} w={28} h={28} d={470}><circle cx="12" cy="12" r="6" fill="#fff4d6" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g03-hit" l={28} t={28} w={44} h={44} d={0}><path d={STAR} fill="#fff4d6" /></V>
        <V c="g03-hitside" l={10} t={10} w={80} h={80} d={140}>{shell("#ff9ec4", 2)}</V>
        <L c="g03-hit2" l={40} t={40} w={20} h={20} d={260} st={{ borderRadius: "50%", background: "#ff9ec4" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Night tone="rgba(42,16,48,0.5)" d={120} />
          <Wash tone="rgba(255,158,196,0.3)" />
        </>
      }
    >
      <V c="g03-nv-flare" l={41} t={41} w={18} h={18} d={90}><path d={STAR} fill="#fff4d6" /></V>
      <V c="g03-nv-shell" l={30} t={30} w={40} h={40} d={280}>{shell("#fff4d6", 1.3)}</V>
      <V c="g03-nv-shell" l={35} t={35} w={30} h={30} d={430}>{shell("#ff9ec4", 1.5)}</V>
      <V c="g03-nv-shell" l={40} t={40} w={20} h={20} d={560}>{shell("#fff4d6", 1.8)}</V>
      <V c="g03-nv-core" l={45.5} t={45.5} w={9} h={9} d={680}><circle cx="12" cy="12" r="6.4" fill="#ff9ec4" /></V>
      <L c="g03-castshadow" l={41} t={57} w={18} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(42,16,48,0.7)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g03-mote" l={42 + i * 7} t={50} w={1.6} h={1.6} d={740 + i * 100} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 4. Bread and Salt (t4) — THE HELIACAL RISING ---------------------------
   The guest star clears the dawn horizon for the first time this year. Three
   notches are cut on the horizon rail as it comes up, and the first light
   spills over the boards like grain off a scoop. Palette: #f0c674 / #fff4d6 /
   #33230f. */
function HeliacalRisingScene({ role, delayMs }: SceneProps) {
  const rail = <L c="g03-hr-dawn" l={0} t={62} w={100} h={16} st={{ background: "linear-gradient(180deg, rgba(240,198,116,0.62), transparent)" }} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g03-ent-rise" l={4} t={62} w={92} h={4} d={40} st={{ borderRadius: "999px", background: "#f0c674" }} />
        <V c="g03-hr-star" l={36} t={30} w={28} h={28} d={260}><path d={STAR} fill="#fff4d6" /></V>
        <L c="g03-hr-tick" l={22} t={54} w={4} h={12} d={470} st={{ background: "#f0c674" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g03-hitside" l={6} t={64} w={88} h={4} d={0} st={{ borderRadius: "999px", background: "#f0c674" }} />
        <V c="g03-hit" l={34} t={26} w={32} h={32} d={140}><path d={STAR} fill="#fff4d6" /></V>
        <L c="g03-hit2" l={30} t={54} w={40} h={8} d={250} st={{ background: "radial-gradient(circle, rgba(255,244,214,0.8), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(240,198,116,0.26)" />{rail}</>}>
      <L c="g03-riseside" l={38} t={52} w={24} h={1.8} d={90} st={{ borderRadius: "999px", background: "#f0c674" }} />
      <V c="g03-hr-star" l={45} t={42} w={10} h={10} d={280}><path d={STAR} fill="#fff4d6" /></V>
      <L c="g03-hr-glow" l={40} t={44} w={20} h={12} d={380} st={{ background: "radial-gradient(ellipse at 50% 90%, rgba(255,244,214,0.7), transparent 70%)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g03-hr-tick" l={40 + i * 8} t={51} w={1.4} h={4} d={470 + i * 130} st={{ background: "#f0c674" }} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g03-sift" l={39 + i * 7} t={46} w={1.4} h={1.4} d={640 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 5. Clerical Error (t4) — THE ANALEMMA KINKS ----------------------------
   The sun's year-long figure of eight is pricked out over the square, and this
   noon the sun is in the wrong loop entirely. Three ghost suns hang on the
   wrong crossings before the true one snaps back onto the track. Palette:
   #ffd27a / #fff4d6 / #2c2313. */
const CE_TRACK = "M12 2.6c3.4 0 4.6 3 3 5.6-1.7 2.8-6.4 3.4-6.4 6.6 0 3 2.4 6.6 5.6 6.6s5-2.6 4-5";

function AnalemmaScene({ role, delayMs }: SceneProps) {
  const track = <path d={CE_TRACK} fill="none" stroke="#ffd27a" strokeWidth="1.3" strokeDasharray="2 1.6" {...SJ} />;
  const sun = <circle cx="12" cy="12" r="6.6" fill="#fff4d6" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g03-an-track" l={22} t={8} w={56} h={84} d={40}>{track}</V>
        <V c="g03-an-ghost" l={16} t={22} w={26} h={26} d={260}>{sun}</V>
        <V c="g03-an-sun" l={42} t={44} w={30} h={30} d={470}>{sun}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g03-hit" l={24} t={10} w={52} h={80} d={0}>{track}</V>
        <V c="g03-hitside" l={16} t={26} w={28} h={28} d={140}>{sun}</V>
        <L c="g03-hit2" l={42} t={44} w={20} h={20} d={260} st={{ borderRadius: "50%", background: "#ffd27a" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(255,210,122,0.24)" />}>
      <V c="g03-an-track" l={43} t={36} w={14} h={28} d={100}>{track}</V>
      <L c="g03-skyshaft" l={45} t={22} w={10} h={22} d={200} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.6), transparent)", transformOrigin: "50% 0%" }} />
      {[0, 1, 2].map((i) => (
        <V key={i} c="g03-an-ghost" l={40 + i * 7} t={38 + i * 6} w={6} h={6} d={300 + i * 120}>{sun}</V>
      ))}
      <V c="g03-an-sun" l={46} t={47} w={8} h={8} d={640}>{sun}</V>
      <L c="g03-an-strike" l={41} t={44} w={18} h={2} d={680} st={{ background: "linear-gradient(90deg, transparent, #ffd27a, transparent)" }} />
      <L c="g03-glint" l={49} t={49} w={2.4} h={2.4} d={760} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 6. Coronation Rest (t4) — THE NORTHERN CROWN --------------------------
   The seven stars of the crown light one after another along their arc, the
   brightest gem last, and the finished diadem settles over the promoted pawn.
   Palette: #ffd9a0 / #fff4d6 / #2b1c33. */
const CB_ARC: Array<[number, number]> = [[38, 44], [41, 40], [45, 38], [50, 37.4], [55, 38], [59, 40], [62, 44]];

function NorthernCrownScene({ role, delayMs }: SceneProps) {
  const gem = <path d={SPARKSTAR} fill="#fff4d6" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g03-cb-arc" l={8} t={26} w={84} h={44} d={40}>
          <path d="M2 18C5 8 19 8 22 18" fill="none" stroke="#ffd9a0" strokeWidth="1.4" strokeDasharray="2.4 2" {...SJ} />
        </V>
        {[0, 1, 2].map((i) => (
          <V key={i} c="g03-cb-gem" l={18 + i * 24} t={22 + (i === 1 ? -8 : 0)} w={18} h={18} d={240 + i * 120}>{gem}</V>
        ))}
        <V c="g03-ent-pop" l={36} t={54} w={28} h={34} d={520}><path d={PAWN} fill="#ffd9a0" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g03-hit" l={10} t={24} w={80} h={40} d={0}>
          <path d="M2 18C5 8 19 8 22 18" fill="none" stroke="#ffd9a0" strokeWidth="1.6" {...SJ} />
        </V>
        <V c="g03-hitside" l={34} t={44} w={32} h={44} d={140}><path d={PAWN} fill="#fff4d6" /></V>
        <V c="g03-hit2" l={40} t={12} w={20} h={20} d={260}>{gem}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Night tone="rgba(43,28,51,0.42)" d={80} /><Wash tone="rgba(255,217,160,0.26)" /></>}>
      <V c="g03-cb-arc" l={36} t={34} w={28} h={16} d={90}>
        <path d="M2 18C5 7 19 7 22 18" fill="none" stroke="#ffd9a0" strokeWidth="1.1" strokeDasharray="2.2 1.8" {...SJ} />
      </V>
      {CB_ARC.map(([l, t], i) => (
        <V key={i} c="g03-cb-gem" l={l} t={t} w={4} h={4} d={220 + i * 70}>{gem}</V>
      ))}
      <V c="g03-cb-jewel" l={47} t={35} w={7} h={7} d={640}><path d={STAR} fill="#fff4d6" /></V>
      <V c="g03-riseside" l={45.5} t={46} w={9} h={12} d={560}><path d={PAWN} fill="#ffd9a0" stroke="#2b1c33" strokeWidth="1" {...SJ} /></V>
      <L c="g03-castshadow" l={42} t={58} w={16} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(43,28,51,0.66)" }} />
      <L c="g03-glint" l={50} t={37} w={2.6} h={2.6} d={760} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 7. Furlough (t4) — THE WATCH STAR SETS ---------------------------------
   The star the night watch is kept by leans down to the horizon, smears out
   flat in the thick air at the rim, and is snuffed. The watch is stood down and
   the sky rail keeps its warmth. Palette: #ffb27a / #fff1d4 / #221a2e. */
function WatchStarSetsScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g03-ent-drop" l={34} t={12} w={32} h={32} d={40}><path d={STAR} fill="#fff1d4" /></V>
        <L c="g03-ws-smear" l={24} t={58} w={52} h={7} d={260} st={{ borderRadius: "999px", background: "#ffb27a" }} />
        <L c="g03-ws-snuff" l={40} t={54} w={20} h={20} d={470} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,241,212,0.8), transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g03-hitside" l={32} t={16} w={36} h={36} d={0}><path d={STAR} fill="#fff1d4" /></V>
        <L c="g03-hit" l={20} t={60} w={60} h={6} d={140} st={{ borderRadius: "999px", background: "#ffb27a" }} />
        <L c="g03-hit2" l={42} t={56} w={16} h={16} d={250} st={{ borderRadius: "50%", background: "rgba(255,241,212,0.8)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(255,178,122,0.24)" /><Night tone="rgba(34,26,46,0.4)" d={520} /></>}>
      <L c="g03-ws-rail" l={30} t={53} w={40} h={1.6} d={80} st={{ borderRadius: "999px", background: "linear-gradient(90deg, transparent, #ffb27a, transparent)" }} />
      <V c="g03-ws-set" l={46} t={34} w={8} h={8} d={220}><path d={STAR} fill="#fff1d4" /></V>
      <L c="g03-ws-smear" l={42} t={51.4} w={16} h={2.4} d={470} st={{ borderRadius: "999px", background: "#ffb27a" }} />
      <L c="g03-ws-snuff" l={45} t={49} w={10} h={8} d={600} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,241,212,0.85), transparent 70%)" }} />
      <L c="g03-skyshaft" l={46} t={36} w={8} h={16} d={300} st={{ background: "linear-gradient(180deg, rgba(255,241,212,0.5), transparent)", transformOrigin: "50% 100%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g03-mote" l={43 + i * 7} t={50} w={1.5} h={1.5} d={680 + i * 110} st={{ borderRadius: "50%", background: "#ffb27a" }} />
      ))}
    </Lead>
  );
}

/* --- 8. General Strike (t4) — THE STAR TRAILS STOP --------------------------
   Every circumpolar trail on the sky freezes mid-arc with a crack of cold, and
   one lone star keeps creeping along its arc with nobody else moving. Palette:
   #a8e6ff / #fff2dc / #12283a. */
const GS_ARCS = [0, 1, 2, 3];

function StarTrailsHaltScene({ role, delayMs }: SceneProps) {
  const arc = (r: number, col: string) => (
    <path d={`M${12 - r} 12a${r} ${r} 0 0 1 ${r * 1.6} -${r * 0.75}`} fill="none" stroke={col} strokeWidth="1.3" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g03-st-trail" l={10} t={14} w={80} h={80} d={40}>{arc(9, "#a8e6ff")}</V>
        <V c="g03-st-trail" l={18} t={22} w={64} h={64} d={200}>{arc(9, "#fff2dc")}</V>
        <L c="g03-st-freeze" l={28} t={28} w={44} h={44} d={430} st={{ borderRadius: "50%", border: "2px solid #a8e6ff" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g03-hit" l={12} t={16} w={76} h={76} d={0}>{arc(9, "#a8e6ff")}</V>
        <V c="g03-hitside" l={24} t={26} w={52} h={52} d={140}>{arc(9, "#fff2dc")}</V>
        <L c="g03-hit2" l={44} t={44} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Night tone="rgba(18,40,58,0.46)" d={60} /><Wash tone="rgba(168,230,255,0.24)" /></>}>
      {GS_ARCS.map((i) => (
        <P key={i} l={50 - (10 + i * 3.5)} t={50 - (10 + i * 3.5)} w={(10 + i * 3.5) * 2} h={(10 + i * 3.5) * 2} rot={`${i * 22}deg`}>
          <V c="g03-st-trail" d={120 + i * 110}>{arc(9.4, i % 2 ? "#fff2dc" : "#a8e6ff")}</V>
        </P>
      ))}
      <L c="g03-st-freeze" l={35} t={35} w={30} h={30} d={560} st={{ borderRadius: "50%", border: "2px solid #fff2dc" }} />
      <V c="g03-st-lone" l={57} t={41} w={5} h={5} d={660}><path d={SPARKSTAR} fill="#fff2dc" /></V>
      <L c="g03-castshadow" l={44} t={52} w={12} h={2.6} d={700} st={{ borderRadius: "999px", background: "rgba(18,40,58,0.7)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g03-sift" l={41 + i * 8} t={44} w={1.4} h={1.4} d={720 + i * 100} st={{ borderRadius: "50%", background: "#a8e6ff" }} />
      ))}
    </Lead>
  );
}

/* --- 9. Harvest Rest (t4) — THE HARVEST MOONRISE ----------------------------
   Five nights of rising are notched on the horizon rail almost on the same
   mark, then the big low amber moon hauls itself up over the boards and just
   sits there. Palette: #ffbe5c / #fff3d2 / #2a1f10. */
function HarvestMoonScene({ role, delayMs }: SceneProps) {
  const moon = <circle cx="12" cy="12" r="8.6" fill="#ffbe5c" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g03-ent-slide" l={4} t={64} w={92} h={3} d={40} st={{ borderRadius: "999px", background: "#ffbe5c" }} />
        <V c="g03-hm-moon" l={26} t={22} w={48} h={48} d={260}>{moon}</V>
        <L c="g03-hm-glow" l={16} t={12} w={68} h={68} d={470} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,210,0.6), transparent 68%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g03-hitside" l={26} t={24} w={48} h={48} d={0}>{moon}</V>
        <L c="g03-hit" l={12} t={66} w={76} h={4} d={140} st={{ borderRadius: "999px", background: "#fff3d2" }} />
        <L c="g03-hit2" l={30} t={28} w={40} h={40} d={250} st={{ borderRadius: "50%", background: "rgba(255,243,210,0.55)" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(255,190,92,0.28)" />
          <L c="g03-hm-rail" l={0} t={64} w={100} h={10} d={140} st={{ background: "linear-gradient(180deg, rgba(255,190,92,0.5), transparent)" }} />
        </>
      }
    >
      <L c="g03-riseside" l={38} t={54} w={24} h={1.6} d={90} st={{ borderRadius: "999px", background: "#ffbe5c" }} />
      {[0, 1, 2, 3, 4].map((i) => (
        <L key={i} c="g03-hm-tick" l={41 + i * 4} t={52.4} w={1.2} h={3.4} d={200 + i * 90} st={{ background: "#fff3d2" }} />
      ))}
      <V c="g03-hm-moon" l={43} t={40} w={14} h={14} d={520}>{moon}</V>
      <L c="g03-hm-glow" l={38} t={35} w={24} h={24} d={620} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,210,0.62), transparent 66%)" }} />
      <L c="g03-castshadow" l={41} t={54} w={18} h={3} d={680} st={{ borderRadius: "999px", background: "rgba(42,31,16,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g03-mote" l={42 + i * 8} t={48} w={1.6} h={1.6} d={720 + i * 100} st={{ borderRadius: "50%", background: "#ffbe5c" }} />
      ))}
    </Lead>
  );
}

/* --- 10. Hidden Stair (t4) — THE CIRCUMPOLAR STAIR --------------------------
   A flight of star-steps unfolds down the sky from the pole toward the
   observer's own back rank, and the king takes the quiet way down it. Palette:
   #b9c8ff / #fff4d6 / #1a1c33. */
const HS_STEPS = [0, 1, 2, 3];

function StarStairScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        {HS_STEPS.slice(0, 3).map((i) => (
          <L key={i} c="g03-ss-step" l={14 + i * 22} t={26 + i * 18} w={26} h={5} d={40 + i * 150} st={{ borderRadius: "999px", background: "#b9c8ff" }} />
        ))}
        <V c="g03-ss-drop" l={56} t={54} w={30} h={38} d={520}><path d={KING} fill="#fff4d6" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g03-hit" l={16} t={30} w={30} h={5} d={0} st={{ borderRadius: "999px", background: "#b9c8ff" }} />
        <L c="g03-hit2" l={44} t={52} w={30} h={5} d={140} st={{ borderRadius: "999px", background: "#b9c8ff" }} />
        <V c="g03-hitside" l={38} t={40} w={28} h={40} d={260}><path d={KING} fill="#fff4d6" /></V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Night tone="rgba(26,28,51,0.44)" d={60} /><Wash tone="rgba(185,200,255,0.24)" /></>}>
      <L c="g03-ss-door" l={44} t={30} w={12} h={12} d={90} st={{ background: "radial-gradient(circle, rgba(255,244,214,0.7), transparent 70%)" }} />
      {HS_STEPS.map((i) => (
        <L key={i} c="g03-ss-step" l={44 - i * 2} t={38 + i * 5} w={12 + i * 2} h={1.6} d={220 + i * 110} st={{ borderRadius: "999px", background: i % 2 ? "#fff4d6" : "#b9c8ff" }} />
      ))}
      <V c="g03-ss-drop" l={45} t={44} w={10} h={13} d={620}><path d={KING} fill="#fff4d6" stroke="#1a1c33" strokeWidth="0.9" {...SJ} /></V>
      <L c="g03-riseside" l={42} t={57} w={16} h={2.4} d={680} st={{ borderRadius: "999px", background: "#b9c8ff" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g03-sift" l={43 + i * 6} t={50} w={1.5} h={1.5} d={720 + i * 100} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 11. Hold the Door (t4) — THE EARTH SHADOW IS HELD ----------------------
   The blue-grey wall of the planet's own shadow climbs the sky toward the back
   rank with the rose belt on its crest, and a line of light is set across it
   and holds it there. Palette: #8f9fd0 / #ffd9c0 / #171b2e. */
function EarthShadowScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g03-ent-rise" l={2} t={40} w={96} h={44} d={40} st={{ background: "linear-gradient(180deg, rgba(143,159,208,0.85), rgba(23,27,46,0.9))" }} />
        <L c="g03-ne-belt" l={2} t={36} w={96} h={7} d={260} st={{ background: "linear-gradient(180deg, rgba(255,217,192,0.9), transparent)" }} />
        <L c="g03-ne-hold" l={6} t={34} w={88} h={3} d={470} st={{ borderRadius: "999px", background: "#ffd9c0" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g03-hitside" l={4} t={44} w={92} h={40} d={0} st={{ background: "linear-gradient(180deg, rgba(143,159,208,0.8), rgba(23,27,46,0.85))" }} />
        <L c="g03-hit" l={6} t={40} w={88} h={5} d={140} st={{ background: "#ffd9c0" }} />
        <L c="g03-hit2" l={38} t={30} w={24} h={10} d={250} st={{ borderRadius: "999px", background: "rgba(255,217,192,0.7)" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <L c="g03-ne-band" d={140} st={{ background: "linear-gradient(180deg, transparent 42%, rgba(143,159,208,0.55) 58%, rgba(23,27,46,0.72))", transformOrigin: "50% 100%" }} />
          <Wash tone="rgba(255,217,192,0.2)" />
        </>
      }
    >
      <L c="g03-riseside" l={36} t={54} w={28} h={2} d={80} st={{ borderRadius: "999px", background: "#8f9fd0" }} />
      <L c="g03-ne-belt" l={34} t={45} w={32} h={4} d={280} st={{ background: "linear-gradient(180deg, rgba(255,217,192,0.9), transparent)" }} />
      <L c="g03-ne-hold" l={34} t={43.4} w={32} h={1.6} d={520} st={{ borderRadius: "999px", background: "#ffd9c0" }} />
      <L c="g03-ne-push" l={40} t={40} w={20} h={5} d={620} st={{ background: "linear-gradient(180deg, rgba(255,217,192,0.75), transparent)" }} />
      <L c="g03-castshadow" l={41} t={56} w={18} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(23,27,46,0.72)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g03-mote" l={42 + i * 8} t={48} w={1.5} h={1.5} d={720 + i * 100} st={{ borderRadius: "50%", background: "#ffd9c0" }} />
      ))}
    </Lead>
  );
}

/* --- 12. Home Square (t4) — THE POLE STAR ON ITS PIN ------------------------
   The whole sky wheels; one star does not. The pin goes through it, the
   circumpolar rings turn true around the king's own square, and the moment he
   steps off the pin the rings drag. Palette: #cfe3ff / #fff4d6 / #172033. */
function PoleStarScene({ role, delayMs }: SceneProps) {
  const ring = (col: string) => <circle cx="12" cy="12" r="9.4" fill="none" stroke={col} strokeWidth="0.9" strokeDasharray="2.6 2.2" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g03-pp-wheel" l={8} t={8} w={84} h={84} d={40}>{ring("#cfe3ff")}</V>
        <V c="g03-pp-star" l={38} t={38} w={24} h={24} d={260}><path d={STAR} fill="#fff4d6" /></V>
        <L c="g03-pp-pin" l={48} t={20} w={3} h={38} d={470} st={{ borderRadius: "999px", background: "#cfe3ff" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g03-hit" l={10} t={10} w={80} h={80} d={0}>{ring("#cfe3ff")}</V>
        <V c="g03-hitside" l={36} t={36} w={28} h={28} d={140}><path d={STAR} fill="#fff4d6" /></V>
        <L c="g03-hit2" l={48} t={24} w={3} h={30} d={250} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Night tone="rgba(23,32,51,0.42)" d={80} /><Rim tone="rgba(207,227,255,0.24)" /></>}>
      <V c="g03-pp-wheel" l={32} t={32} w={36} h={36} d={120}>{ring("#cfe3ff")}</V>
      <V c="g03-pp-wheel" l={38} t={38} w={24} h={24} d={280}>{ring("#fff4d6")}</V>
      <L c="g03-pp-pin" l={49.4} t={38} w={1.2} h={16} d={440} st={{ borderRadius: "999px", background: "#cfe3ff" }} />
      <V c="g03-pp-star" l={46.5} t={42.5} w={7} h={7} d={540}><path d={STAR} fill="#fff4d6" /></V>
      <V c="g03-riseside" l={46} t={46} w={8} h={10} d={620}><path d={KING} fill="none" stroke="#cfe3ff" strokeWidth="1.4" {...SJ} /></V>
      <L c="g03-glint" l={49} t={44} w={2.6} h={2.6} d={700} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g03-twinkle" l={40 + i * 10} t={38 + (i % 2) * 16} w={1.8} h={1.8} d={740 + i * 90} st={{ borderRadius: "50%", background: "#cfe3ff" }} />
      ))}
    </Lead>
  );
}

/* --- 13. Listening Post (t4) — THE PULSAR TICKS -----------------------------
   A dead star's beam rakes across the run, and every pass drops a pip onto the
   tally. Read four pips and you know what is coming. Aim-staged: the beam
   sweeps the real vector. Palette: #9ef0d8 / #fff4d6 / #0f2b28. */
const PL_PIPS = [0, 1, 2, 3];

function PulsarTickScene({ role, delayMs }: SceneProps) {
  const core = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="4" fill="#fff4d6" />
      <circle cx="12" cy="12" r="7.4" fill="none" stroke="#9ef0d8" strokeWidth="1" strokeDasharray="2 2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g03-ent-pop" l={30} t={30} w={40} h={40} d={40}>{core}</V>
        <L c="g03-pl-beam" l={48} t={6} w={40} h={12} d={260} st={{ background: "linear-gradient(90deg, #fff4d6, transparent)", transformOrigin: "0% 100%" }} />
        {PL_PIPS.slice(0, 3).map((i) => (
          <L key={i} c="g03-pl-pip" l={20 + i * 22} t={78} w={7} h={7} d={470 + i * 110} st={{ borderRadius: "50%", background: "#9ef0d8" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g03-hit" l={30} t={30} w={40} h={40} d={0}>{core}</V>
        <L c="g03-hitside" l={50} t={44} w={44} h={6} d={140} st={{ background: "linear-gradient(90deg, #fff4d6, transparent)", transformOrigin: "0% 50%" }} />
        <L c="g03-hit2" l={44} t={76} w={10} h={10} d={250} st={{ borderRadius: "50%", background: "#9ef0d8" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Night tone="rgba(15,43,40,0.42)" d={60} /><Wash tone="rgba(158,240,216,0.24)" /></>}>
      <L c="g03-runout" l={46} t={49.2} w={30} h={1.4} d={70} st={{ background: "linear-gradient(90deg, #9ef0d8, rgba(158,240,216,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g03-pl-core" l={45} t={45} w={10} h={10} d={200}>{core}</V>
      <L c="g03-pl-beam" l={50} t={44} w={26} h={12} d={330} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.85), transparent)", transformOrigin: "0% 50%" }} />
      <L c="g03-pl-beam" l={50} t={44} w={26} h={12} d={520} st={{ background: "linear-gradient(90deg, rgba(158,240,216,0.8), transparent)", transformOrigin: "0% 50%" }} />
      {PL_PIPS.map((i) => (
        <L key={i} c="g03-pl-pip" l={47 + i * 5} t={56} w={2.4} h={2.4} d={560 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
      <L c="g03-glint" l={48} t={45} w={3} h={3} d={760} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </AimLead>
  );
}

/* --- 14. Paid Leave (t4) — THE MIDNIGHT SUN --------------------------------
   The sun comes down to the horizon, refuses to set, and skims along the rim
   instead: no night for six turns, just a long amber crawl. Palette: #ffc46a /
   #fff2d0 / #33240f. */
function MidnightSunScene({ role, delayMs }: SceneProps) {
  const sun = <circle cx="12" cy="12" r="7.6" fill="#ffc46a" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g03-ent-slide" l={4} t={62} w={92} h={3} d={40} st={{ borderRadius: "999px", background: "#ffc46a" }} />
        <V c="g03-ms-skim" l={12} t={38} w={40} h={40} d={260}>{sun}</V>
        <L c="g03-ms-band" l={4} t={58} w={92} h={12} d={470} st={{ background: "linear-gradient(180deg, rgba(255,242,208,0.7), transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g03-hitside" l={8} t={64} w={84} h={4} d={0} st={{ borderRadius: "999px", background: "#ffc46a" }} />
        <V c="g03-hit" l={28} t={40} w={44} h={44} d={140}>{sun}</V>
        <L c="g03-hit2" l={20} t={56} w={60} h={10} d={250} st={{ background: "radial-gradient(ellipse at 50% 100%, rgba(255,242,208,0.8), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(255,196,106,0.26)" />
          <L c="g03-ms-band" l={0} t={58} w={100} h={14} d={200} st={{ background: "linear-gradient(180deg, rgba(255,196,106,0.5), transparent)" }} />
        </>
      }
    >
      <L c="g03-riseside" l={36} t={53} w={28} h={1.6} d={90} st={{ borderRadius: "999px", background: "#ffc46a" }} />
      <V c="g03-ms-sun" l={38} t={45} w={12} h={12} d={260}>{sun}</V>
      <L c="g03-ms-skimglow" l={34} t={46} w={32} h={10} d={420} st={{ background: "radial-gradient(ellipse at 50% 100%, rgba(255,242,208,0.7), transparent 72%)" }} />
      <V c="g03-ms-hold" l={54} t={45} w={12} h={12} d={620}>{sun}</V>
      <L c="g03-castshadow" l={40} t={56} w={20} h={3} d={680} st={{ borderRadius: "999px", background: "rgba(51,36,15,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g03-mote" l={42 + i * 8} t={50} w={1.6} h={1.6} d={720 + i * 100} st={{ borderRadius: "50%", background: "#fff2d0" }} />
      ))}
    </Lead>
  );
}

/* --- 15. Scaffold Crane (t4) — THE CULMINATION ------------------------------
   The meridian line is dropped from the zenith, the rook is taken up it to the
   top of its arc, held at culmination, and set down on the observer's own rank.
   Palette: #d8c08c / #fff4d6 / #2a2213. */
function CulminationScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g03-cu-line" l={48} t={4} w={3} h={84} d={40} st={{ background: "linear-gradient(180deg, #d8c08c, transparent)", transformOrigin: "50% 0%" }} />
        <V c="g03-cu-haul" l={32} t={44} w={36} h={44} d={260}><path d={ROOK} fill="#fff4d6" /></V>
        <V c="g03-ent-pop" l={38} t={8} w={24} h={24} d={470}><path d={SPARKSTAR} fill="#d8c08c" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g03-hit" l={48} t={8} w={4} h={70} d={0} st={{ background: "linear-gradient(180deg, #d8c08c, transparent)", transformOrigin: "50% 0%" }} />
        <V c="g03-hitside" l={32} t={40} w={36} h={46} d={140}><path d={ROOK} fill="#fff4d6" /></V>
        <L c="g03-hit2" l={40} t={12} w={20} h={20} d={260} st={{ borderRadius: "50%", background: "rgba(216,192,140,0.8)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(216,192,140,0.24)" />}>
      <L c="g03-cu-line" l={49.4} t={26} w={1.2} h={30} d={90} st={{ background: "linear-gradient(180deg, #d8c08c, transparent)", transformOrigin: "50% 0%" }} />
      <L c="g03-cu-mark" l={44} t={29} w={12} h={1.6} d={230} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <V c="g03-cu-haul" l={45.5} t={46} w={9} h={12} d={340}><path d={ROOK} fill="#fff4d6" stroke="#2a2213" strokeWidth="1" {...SJ} /></V>
      <V c="g03-glint" l={47} t={28} w={6} h={6} d={560}><path d={SPARKSTAR} fill="#d8c08c" /></V>
      <V c="g03-riseside" l={45.5} t={46} w={9} h={12} d={620}><path d={ROOK} fill="none" stroke="#d8c08c" strokeWidth="1.4" {...SJ} /></V>
      <L c="g03-castshadow" l={42} t={58} w={16} h={3} d={680} st={{ borderRadius: "999px", background: "rgba(42,34,19,0.62)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g03-sift" l={43 + i * 6} t={50} w={1.4} h={1.4} d={720 + i * 100} st={{ borderRadius: "50%", background: "#d8c08c" }} />
      ))}
    </Lead>
  );
}

/* --- 16. Second Skin (t4) — THE HALO AND ITS SUNDOGS ------------------------
   Ice in the high air throws a second skin of light around the sun: the ring
   snaps closed, four sundogs kindle on it and a tangent arc caps the whole
   thing. Palette: #bfe2ff / #fff2d8 / #1c2a3c. */
const SS_DOGS = [0, 90, 180, 270];

function HaloSundogsScene({ role, delayMs }: SceneProps) {
  const dog = <path d={SPARKSTAR} fill="#fff2d8" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g03-ha-core" l={36} t={36} w={28} h={28} d={40} st={{ borderRadius: "50%", background: "#fff2d8" }} />
        <L c="g03-ha-ring" l={8} t={8} w={84} h={84} d={260} st={{ borderRadius: "50%", border: "2px solid #bfe2ff" }} />
        <V c="g03-ha-dog" l={2} t={38} w={22} h={22} d={470}>{dog}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g03-hit" l={38} t={38} w={24} h={24} d={0} st={{ borderRadius: "50%", background: "#fff2d8" }} />
        <L c="g03-hitside" l={12} t={12} w={76} h={76} d={140} st={{ borderRadius: "50%", border: "2px solid #bfe2ff" }} />
        <V c="g03-hit2" l={4} t={40} w={20} h={20} d={250}>{dog}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(191,226,255,0.24)" /><Rim tone="rgba(255,242,216,0.2)" d={520} /></>}>
      <L c="g03-ha-core" l={46} t={46} w={8} h={8} d={90} st={{ borderRadius: "50%", background: "#fff2d8" }} />
      <L c="g03-ha-ring" l={34} t={34} w={32} h={32} d={260} st={{ borderRadius: "50%", border: "2px solid #bfe2ff" }} />
      {SS_DOGS.map((a, i) => (
        <P key={a} l={34} t={34} w={32} h={32} rot={`${a}deg`}>
          <V c="g03-ha-dog" l={-6} t={42} w={14} h={14} d={420 + i * 100}>{dog}</V>
        </P>
      ))}
      <V c="g03-ha-arc" l={36} t={29} w={28} h={12} d={640}>
        <path d="M2 20C6 8 18 8 22 20" fill="none" stroke="#fff2d8" strokeWidth="1.4" {...SJ} />
      </V>
      <L c="g03-skyshaft" l={46} t={30} w={8} h={18} d={680} st={{ background: "linear-gradient(180deg, rgba(255,242,216,0.55), transparent)", transformOrigin: "50% 100%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g03-sift" l={42 + i * 7} t={44} w={1.4} h={1.4} d={720 + i * 100} st={{ borderRadius: "50%", background: "#bfe2ff" }} />
      ))}
    </Lead>
  );
}

/* --- 17. Seven League Boots (t4) — THE BOLIDE ------------------------------
   One fireball crosses three houses of sky in a single breath, sheds two
   fragments on the way and leaves a persistent train hanging behind it.
   Aim-staged along the real stride. Palette: #7fe0ff / #fff4d6 / #12283a. */
const BO_GATES = [0, 1, 2];

function BolideScene({ role, delayMs }: SceneProps) {
  const head = <path d={CREST} fill="#fff4d6" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g03-bo-train" l={4} t={46} w={90} h={4} d={40} st={{ borderRadius: "999px", background: "linear-gradient(90deg, transparent, #7fe0ff)", transformOrigin: "0% 50%" }} />
        <V c="g03-bo-streak" l={10} t={30} w={44} h={44} d={200}>{head}</V>
        {BO_GATES.map((i) => (
          <L key={i} c="g03-bo-gate" l={22 + i * 26} t={62} w={3} h={14} d={430 + i * 110} st={{ background: "#7fe0ff" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g03-hitside" l={6} t={48} w={88} h={4} d={0} st={{ borderRadius: "999px", background: "#7fe0ff" }} />
        <V c="g03-hit" l={30} t={30} w={40} h={40} d={140}>{head}</V>
        <L c="g03-hit2" l={40} t={58} w={20} h={5} d={250} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Night tone="rgba(18,40,58,0.4)" d={60} /><Wash tone="rgba(127,224,255,0.24)" /></>}>
      <L c="g03-runout" l={45} t={49.4} w={30} h={1.4} d={80} st={{ background: "linear-gradient(90deg, #7fe0ff, rgba(127,224,255,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      {BO_GATES.map((i) => (
        <L key={i} c="g03-bo-gate" l={49 + i * 7} t={46} w={1.2} h={7} d={220 + i * 120} st={{ background: "#7fe0ff" }} />
      ))}
      <L c="g03-bo-train" l={44} t={48.4} w={26} h={2.4} d={480} st={{ borderRadius: "999px", background: "linear-gradient(90deg, transparent, rgba(255,244,214,0.85))", transformOrigin: "0% 50%" }} />
      <V c="g03-bo-streak" l={44} t={44} w={12} h={12} d={480}>{head}</V>
      <L c="g03-bo-frag" l={56} t={47} w={2} h={2} d={640} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      <L c="g03-bo-frag" l={60} t={50} w={1.6} h={1.6} d={720} st={{ borderRadius: "50%", background: "#7fe0ff" }} />
    </AimLead>
  );
}

/* --- 18. Worry Beads (t4) — THE PLEIADES COUNTED ---------------------------
   The seven sisters are told off one at a time along a thread of nebulosity,
   and every third bead one of them drops off the string entirely. Palette:
   #a9c8ff / #fff4d6 / #1b2140. */
const WB_BEADS: Array<[number, number]> = [[41, 42], [45, 40], [49, 39], [53, 40.6], [56, 43], [51, 45], [46, 45.6]];

function PleiadesScene({ role, delayMs }: SceneProps) {
  const bead = <path d={SPARKSTAR} fill="#fff4d6" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g03-pd-string" l={10} t={48} w={80} h={2.4} d={40} st={{ borderRadius: "999px", background: "#a9c8ff", transformOrigin: "0% 50%" }} />
        {[0, 1, 2].map((i) => (
          <V key={i} c="g03-pd-bead" l={18 + i * 24} t={34} w={18} h={18} d={230 + i * 130}>{bead}</V>
        ))}
        <L c="g03-pd-fall" l={44} t={56} w={7} h={7} d={560} st={{ borderRadius: "50%", background: "#a9c8ff" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g03-hit" l={14} t={50} w={72} h={3} d={0} st={{ borderRadius: "999px", background: "#a9c8ff" }} />
        <V c="g03-hitside" l={34} t={30} w={30} h={30} d={140}>{bead}</V>
        <L c="g03-hit2" l={46} t={62} w={9} h={9} d={250} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Night tone="rgba(27,33,64,0.4)" d={70} /><Wash tone="rgba(169,200,255,0.24)" /></>}>
      <L c="g03-pd-string" l={40} t={44} w={18} h={1.2} d={90} st={{ borderRadius: "999px", background: "#a9c8ff", transformOrigin: "0% 50%" }} />
      {WB_BEADS.map(([l, t], i) => (
        <V key={i} c="g03-pd-bead" l={l} t={t} w={4} h={4} d={200 + i * 70}>{bead}</V>
      ))}
      <L c="g03-pd-fall" l={49} t={48} w={2.6} h={2.6} d={640} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      <L c="g03-castshadow" l={43} t={57} w={14} h={2.6} d={680} st={{ borderRadius: "999px", background: "rgba(27,33,64,0.7)" }} />
      <L c="g03-glint" l={52} t={41} w={2.4} h={2.4} d={740} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 19. Coronation Bill (t4) — THE COMET COMES BACK TO COLLECT ------------
   The omen returns exactly on its period, drags its tail straight across the
   new crown, and the crown goes dim in the wake. Aim-staged: the return runs
   the real vector. Palette: #cfe8a0 / #fff4d6 / #1e2a14. */
function CometReturnScene({ role, delayMs }: SceneProps) {
  const crown = <path d="M4 18h16l1.4-9-4.8 3.4L12 5.6 7.4 12.4 2.6 9z" fill="#cfe8a0" stroke="#1e2a14" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g03-cm-tail" l={2} t={26} w={80} h={8} d={40} st={{ borderRadius: "999px", background: "linear-gradient(90deg, transparent, #cfe8a0)", transformOrigin: "0% 50%" }} />
        <V c="g03-cm-head" l={62} t={16} w={30} h={30} d={230}><circle cx="12" cy="12" r="7" fill="#fff4d6" /></V>
        <V c="g03-cm-crown" l={30} t={52} w={40} h={36} d={470}>{crown}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g03-hitside" l={6} t={30} w={88} h={6} d={0} st={{ borderRadius: "999px", background: "#cfe8a0" }} />
        <V c="g03-hit" l={62} t={20} w={30} h={30} d={140}><circle cx="12" cy="12" r="7" fill="#fff4d6" /></V>
        <V c="g03-hit2" l={30} t={48} w={40} h={36} d={250}>{crown}</V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Night tone="rgba(30,42,20,0.42)" d={80} /><Wash tone="rgba(207,232,160,0.24)" /></>}>
      <L c="g03-runout" l={44} t={44} w={30} h={1.2} d={70} st={{ background: "linear-gradient(90deg, rgba(207,232,160,0.9), rgba(207,232,160,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <L c="g03-cm-tail" l={44} t={45.6} w={26} h={4} d={260} st={{ borderRadius: "999px", background: "linear-gradient(90deg, transparent, rgba(207,232,160,0.85))", transformOrigin: "0% 50%" }} />
      <V c="g03-cm-head" l={64} t={44} w={9} h={9} d={340}><circle cx="12" cy="12" r="7" fill="#fff4d6" /></V>
      <V c="g03-cm-crown" l={45} t={49} w={11} h={9} d={540}>{crown}</V>
      <L c="g03-cm-dim" l={43} t={48} w={16} h={12} d={680} st={{ background: "radial-gradient(circle, rgba(30,42,20,0.8), transparent 72%)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g03-sift" l={50 + i * 6} t={47} w={1.4} h={1.4} d={720 + i * 90} st={{ borderRadius: "50%", background: "#cfe8a0" }} />
      ))}
    </AimLead>
  );
}

/* --- 20. Sleeping Draught (t4) — THE OCCULTATION ---------------------------
   The moon's dark limb creeps up on a bright star and snuffs it without a
   sound; the star stays out behind the limb, and only a soft breath of light
   marks where it went. Palette: #b9a8f0 / #fff2dc / #1d1834. */
function OccultationScene({ role, delayMs }: SceneProps) {
  const limb = <circle cx="12" cy="12" r="11" fill="#1d1834" stroke="#b9a8f0" strokeWidth="1" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g03-oc-star" l={54} t={34} w={28} h={28} d={40}><path d={STAR} fill="#fff2dc" /></V>
        <V c="g03-oc-limb" l={-24} t={16} w={80} h={80} d={240}>{limb}</V>
        <L c="g03-oc-zzz" l={58} t={16} w={22} h={22} d={470} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(185,168,240,0.75), transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g03-hit" l={50} t={32} w={32} h={32} d={0}><path d={STAR} fill="#fff2dc" /></V>
        <V c="g03-hitside" l={-16} t={14} w={76} h={76} d={140}>{limb}</V>
        <L c="g03-hit2" l={56} t={18} w={16} h={16} d={250} st={{ borderRadius: "50%", background: "rgba(185,168,240,0.7)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Night tone="rgba(29,24,52,0.5)" d={100} /><Wash tone="rgba(185,168,240,0.24)" /></>}>
      <V c="g03-oc-star" l={51} t={43} w={8} h={8} d={90}><path d={STAR} fill="#fff2dc" /></V>
      <V c="g03-oc-limb" l={34} t={38} w={20} h={20} d={280}>{limb}</V>
      <L c="g03-oc-snuff" l={49} t={42} w={12} h={10} d={520} st={{ background: "radial-gradient(circle, rgba(255,242,220,0.85), transparent 70%)" }} />
      <V c="g03-riseside" l={44} t={46} w={10} h={12} d={560}><path d={KNIGHT} fill="none" stroke="#b9a8f0" strokeWidth="1.3" {...SJ} /></V>
      <L c="g03-oc-zzz" l={54} t={38} w={7} h={7} d={660} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(185,168,240,0.8), transparent 70%)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g03-mote" l={50 + i * 4} t={40} w={1.4} h={1.4} d={720 + i * 110} st={{ borderRadius: "50%", background: "#b9a8f0" }} />
      ))}
    </Lead>
  );
}

/* --- 21. Bottom of the Well (t3) — THE NOON STAR ---------------------------
   From the bottom of a deep shaft a star is visible at midday. The shaft opens
   over the square, daylight is squeezed to a coin at the top, and the one star
   nobody above can see comes out. Palette: #8fc9ff / #fff4d6 / #101c2c. */
function NoonStarScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g03-wl-shaft" l={26} t={0} w={48} h={92} d={40} st={{ background: "linear-gradient(180deg, rgba(143,201,255,0.65), rgba(16,28,44,0.9))", transformOrigin: "50% 0%" }} />
        <L c="g03-wl-rim" l={32} t={4} w={36} h={14} d={260} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
        <V c="g03-wl-star" l={38} t={50} w={24} h={24} d={470}><path d={STAR} fill="#fff4d6" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g03-hitside" l={30} t={4} w={40} h={84} d={0} st={{ background: "linear-gradient(180deg, rgba(143,201,255,0.6), rgba(16,28,44,0.85))", transformOrigin: "50% 0%" }} />
        <L c="g03-hit" l={36} t={8} w={28} h={12} d={140} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
        <V c="g03-hit2" l={38} t={46} w={24} h={24} d={250}><path d={STAR} fill="#fff4d6" /></V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Night tone="rgba(16,28,44,0.52)" d={140} /><Wash tone="rgba(143,201,255,0.2)" /></>}>
      <L c="g03-wl-shaft" l={44} t={30} w={12} h={26} d={80} st={{ background: "linear-gradient(180deg, rgba(143,201,255,0.6), rgba(16,28,44,0.85))", transformOrigin: "50% 0%" }} />
      <L c="g03-wl-rim" l={44} t={30} w={12} h={5} d={260} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      <L c="g03-skyshaft" l={46} t={31} w={8} h={20} d={360} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.6), transparent)", transformOrigin: "50% 0%" }} />
      <V c="g03-wl-star" l={46.5} t={45} w={7} h={7} d={560}><path d={STAR} fill="#fff4d6" /></V>
      <L c="g03-wl-coin" l={47} t={30} w={6} h={2.4} d={640} st={{ borderRadius: "999px", background: "#8fc9ff" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g03-mote" l={45 + i * 4} t={50} w={1.4} h={1.4} d={700 + i * 110} st={{ borderRadius: "50%", background: "#8fc9ff" }} />
      ))}
    </Lead>
  );
}

/* --- 22. Bribe the Clerk (t3) — THE ZODIAC BAND CLICKS ---------------------
   The band of signs is nudged round one house before its time, and while it
   turns one sign's star is quietly palmed off the rim. Palette: #e0b978 /
   #fff4d6 / #2b2010. */
const ZB_HOUSES = [0, 60, 120, 180, 240, 300];

function ZodiacBandScene({ role, delayMs }: SceneProps) {
  const tick = <path d="M12 1.2v4.4" stroke="#e0b978" strokeWidth="1.6" fill="none" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g03-zb-band" l={8} t={8} w={84} h={84} d={40} st={{ borderRadius: "50%", border: "3px solid #e0b978" }} />
        <V c="g03-zb-click" l={8} t={8} w={84} h={84} d={260}>
          <g>{ZB_HOUSES.map((a) => <g key={a} transform={`rotate(${a} 12 12)`}>{tick}</g>)}</g>
        </V>
        <V c="g03-zb-palm" l={38} t={2} w={24} h={24} d={470}><path d={SPARKSTAR} fill="#fff4d6" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g03-hit" l={10} t={10} w={80} h={80} d={0} st={{ borderRadius: "50%", border: "3px solid #e0b978" }} />
        <V c="g03-hitside" l={10} t={10} w={80} h={80} d={140}>
          <g>{ZB_HOUSES.map((a) => <g key={a} transform={`rotate(${a} 12 12)`}>{tick}</g>)}</g>
        </V>
        <L c="g03-hit2" l={44} t={2} w={12} h={12} d={250} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(224,185,120,0.24)" />}>
      <L c="g03-zb-band" l={34} t={34} w={32} h={32} d={90} st={{ borderRadius: "50%", border: "2px solid #e0b978" }} />
      <V c="g03-zb-click" l={34} t={34} w={32} h={32} d={300}>
        <g>{ZB_HOUSES.map((a) => <g key={a} transform={`rotate(${a} 12 12)`}>{tick}</g>)}</g>
      </V>
      <L c="g03-zb-pawl" l={62} t={47} w={5} h={1.6} d={430} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <V c="g03-zb-palm" l={47} t={31} w={6} h={6} d={600}><path d={SPARKSTAR} fill="#fff4d6" /></V>
      <L c="g03-castshadow" l={42} t={60} w={16} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(43,32,16,0.62)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g03-glint" l={40 + i * 10} t={40 + (i % 2) * 14} w={2.2} h={2.2} d={700 + i * 100} st={{ borderRadius: "50%", background: "#e0b978" }} />
      ))}
    </Lead>
  );
}

/* --- 23. Dragonslayer (t3) — THE NODE IS SPEARED ---------------------------
   The moon's road crosses the sun's road at the dragon's head, which is where
   the sky is eaten. The crossing is found, pinned, and the head goes out.
   Palette: #ff9a72 / #fff2d8 / #2a1120. */
function LunarNodeScene({ role, delayMs }: SceneProps) {
  const drake = (
    <g {...SJ}>
      <path d="M4 15c0-5 4-8 8.6-8 3.6 0 6.4 2 7.4 5l-3 1.4 2.4 2.2-3.6 2.2.6 2.6-4-1.6L8 21z" fill="#ff9a72" stroke="#2a1120" strokeWidth="1.1" />
      <circle cx="15.4" cy="11" r="1.1" fill="#fff2d8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g03-nd-path" l={2} t={48} w={96} h={2.4} d={40} st={{ borderRadius: "999px", background: "#fff2d8", transformOrigin: "0% 50%" }} />
        <L c="g03-nd-path2" l={2} t={48} w={96} h={2.4} d={200} st={{ borderRadius: "999px", background: "#ff9a72", transformOrigin: "0% 50%", rotate: "-22deg" }} />
        <V c="g03-nd-drake" l={28} t={26} w={44} h={44} d={430}>{drake}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g03-hit" l={6} t={50} w={88} h={3} d={0} st={{ borderRadius: "999px", background: "#fff2d8" }} />
        <V c="g03-hitside" l={26} t={24} w={48} h={48} d={140}>{drake}</V>
        <L c="g03-hit2" l={44} t={16} w={4} h={54} d={250} st={{ borderRadius: "999px", background: "#ff9a72" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Night tone="rgba(42,17,32,0.42)" d={80} /><Wash tone="rgba(255,154,114,0.24)" /></>}>
      <L c="g03-nd-path" l={36} t={48} w={28} h={1.2} d={90} st={{ borderRadius: "999px", background: "#fff2d8", transformOrigin: "0% 50%" }} />
      <L c="g03-nd-path2" l={36} t={48} w={28} h={1.2} d={240} st={{ borderRadius: "999px", background: "#ff9a72", transformOrigin: "0% 50%", rotate: "-24deg" }} />
      <V c="g03-nd-drake" l={44} t={40} w={13} h={13} d={400}>{drake}</V>
      <L c="g03-nd-spear" l={49} t={30} w={1.6} h={22} d={580} st={{ borderRadius: "999px", background: "#fff2d8", transformOrigin: "50% 0%" }} />
      <V c="g03-nd-out" l={45} t={41} w={11} h={11} d={680}><path d={QUEEN} fill="none" stroke="#ff9a72" strokeWidth="1.2" {...SJ} /></V>
      <L c="g03-castshadow" l={42} t={57} w={16} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(42,17,32,0.68)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g03-sift" l={44 + i * 6} t={50} w={1.4} h={1.4} d={740 + i * 90} st={{ borderRadius: "50%", background: "#ff9a72" }} />
      ))}
    </Lead>
  );
}

/* --- 24. Forty Winks (t3) — THE WINKING DEMON -----------------------------
   The eclipsing binary dips: three quick winks as its dark companion crosses,
   then one long dim while the light curve is drawn out under it. Palette:
   #d0b4ff / #fff2dc / #1d1734. */
function AlgolWinkScene({ role, delayMs }: SceneProps) {
  const curve = <path d="M1.6 8h5l1.6 8 1.8-8h4l1.6 8 1.8-8h4.2" fill="none" stroke="#d0b4ff" strokeWidth="1.3" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g03-al-star" l={30} t={20} w={40} h={40} d={40}><path d={STAR} fill="#fff2dc" /></V>
        <V c="g03-al-wink" l={44} t={26} w={30} h={30} d={260}><circle cx="12" cy="12" r="9" fill="#1d1734" /></V>
        <V c="g03-al-curve" l={8} t={62} w={84} h={30} d={470} par="none" vb="0 0 24 20">{curve}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g03-hit" l={30} t={26} w={40} h={40} d={0}><path d={STAR} fill="#fff2dc" /></V>
        <V c="g03-hitside" l={42} t={30} w={32} h={32} d={140}><circle cx="12" cy="12" r="9" fill="#1d1734" /></V>
        <L c="g03-hit2" l={26} t={70} w={48} h={3} d={250} st={{ borderRadius: "999px", background: "#d0b4ff" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Night tone="rgba(29,23,52,0.44)" d={90} /><Wash tone="rgba(208,180,255,0.24)" /></>}>
      <V c="g03-al-star" l={44} t={38} w={12} h={12} d={90}><path d={STAR} fill="#fff2dc" /></V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g03-al-wink" l={46} t={40} w={9} h={9} d={240 + i * 120}><circle cx="12" cy="12" r="9" fill="#1d1734" /></V>
      ))}
      <L c="g03-al-dim" l={42} t={36} w={18} h={18} d={600} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(29,23,52,0.85), transparent 70%)" }} />
      <V c="g03-al-curve" l={38} t={52} w={26} h={9} d={660} par="none" vb="0 0 24 20">{curve}</V>
      <L c="g03-castshadow" l={43} t={58} w={14} h={2.6} d={700} st={{ borderRadius: "999px", background: "rgba(29,23,52,0.7)" }} />
      <L c="g03-mote" l={52} t={44} w={1.6} h={1.6} d={760} st={{ borderRadius: "50%", background: "#d0b4ff" }} />
    </Lead>
  );
}

/* --- 25. Hermit's Hour (t3) — THE ZODIACAL LIGHT --------------------------
   The false dawn: a faint leaning cone of dust-light stands up off the horizon
   an hour before anybody else is awake, and goes out when the real sky
   brightens. Palette: #c8b0e8 / #fff2d8 / #1a1630. */
function ZodiacalLightScene({ role, delayMs }: SceneProps) {
  const cone = <path d="M12 1.6L19 22H5z" fill="url(#g03zl)" />;
  const defs = (
    <defs>
      <linearGradient id="g03zl" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#c8b0e8" stopOpacity="0.75" />
        <stop offset="100%" stopColor="#fff2d8" stopOpacity="0" />
      </linearGradient>
    </defs>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g03-ent-rise" l={4} t={70} w={92} h={3} d={40} st={{ borderRadius: "999px", background: "#c8b0e8" }} />
        <V c="g03-zl-cone" l={24} t={10} w={52} h={64} d={260} st={{ transformOrigin: "50% 100%" }}>{defs}{cone}</V>
        <L c="g03-zl-dust" l={46} t={30} w={7} h={7} d={470} st={{ borderRadius: "50%", background: "#fff2d8" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g03-hitside" l={8} t={72} w={84} h={3} d={0} st={{ borderRadius: "999px", background: "#c8b0e8" }} />
        <V c="g03-hit" l={26} t={14} w={48} h={60} d={140} st={{ transformOrigin: "50% 100%" }}>{defs}{cone}</V>
        <L c="g03-hit2" l={46} t={34} w={8} h={8} d={250} st={{ borderRadius: "50%", background: "#fff2d8" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Night tone="rgba(26,22,48,0.5)" d={60} /><Wash tone="rgba(200,176,232,0.2)" /></>}>
      <L c="g03-riseside" l={38} t={56} w={24} h={1.4} d={80} st={{ borderRadius: "999px", background: "#c8b0e8" }} />
      <V c="g03-zl-cone" l={42} t={32} w={16} h={24} d={280} st={{ transformOrigin: "50% 100%" }}>{defs}{cone}</V>
      <V c="g03-zl-hood" l={45} t={46} w={10} h={11} d={480}>
        <path d="M12 4c3.6 0 5.6 2.6 5.6 6.4L16.6 21H7.4L6.4 10.4C6.4 6.6 8.4 4 12 4z" fill="#1a1630" stroke="#c8b0e8" strokeWidth="1.1" {...SJ} />
      </V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g03-zl-dust" l={45 + i * 3} t={38 - i * 2} w={1.6} h={1.6} d={560 + i * 110} st={{ borderRadius: "50%", background: "#fff2d8" }} />
      ))}
      <L c="g03-castshadow" l={43} t={58} w={14} h={2.6} d={700} st={{ borderRadius: "999px", background: "rgba(26,22,48,0.68)" }} />
      <L c="g03-glint" l={49} t={35} w={2.2} h={2.2} d={760} st={{ borderRadius: "50%", background: "#fff2d8" }} />
    </Lead>
  );
}

/* --- 26. Hush Money (t3) — THE GREEN FLASH --------------------------------
   The last limb of the sun goes under and pays out one silent green ray that
   nobody else catches. Twice, and never a sound either time. Palette: #8ff0b4 /
   #ffe9b8 / #12281e. */
function GreenFlashScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g03-ent-slide" l={4} t={62} w={92} h={3} d={40} st={{ borderRadius: "999px", background: "#ffe9b8" }} />
        <L c="g03-gf-limb" l={34} t={48} w={32} h={16} d={260} st={{ borderRadius: "999px", background: "#ffe9b8" }} />
        <L c="g03-gf-flash" l={30} t={44} w={40} h={7} d={470} st={{ borderRadius: "999px", background: "#8ff0b4" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g03-hitside" l={8} t={64} w={84} h={3} d={0} st={{ borderRadius: "999px", background: "#ffe9b8" }} />
        <L c="g03-hit" l={32} t={50} w={36} h={14} d={140} st={{ borderRadius: "999px", background: "#ffe9b8" }} />
        <L c="g03-hit2" l={28} t={44} w={44} h={6} d={250} st={{ borderRadius: "999px", background: "#8ff0b4" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(255,233,184,0.24)" /><Night tone="rgba(18,40,30,0.4)" d={560} /></>}>
      <L c="g03-riseside" l={38} t={53} w={24} h={1.6} d={80} st={{ borderRadius: "999px", background: "#ffe9b8" }} />
      <L c="g03-gf-limb" l={45} t={47} w={10} h={6} d={240} st={{ borderRadius: "999px", background: "#ffe9b8" }} />
      <L c="g03-gf-flash" l={43} t={46} w={14} h={2} d={470} st={{ borderRadius: "999px", background: "#8ff0b4" }} />
      <L c="g03-gf-flash" l={44} t={46.4} w={12} h={1.6} d={620} st={{ borderRadius: "999px", background: "#8ff0b4" }} />
      <L c="g03-gf-coin" l={52} t={49} w={3} h={3} d={680} st={{ borderRadius: "50%", background: "#ffe9b8" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g03-mote" l={44 + i * 6} t={50} w={1.4} h={1.4} d={720 + i * 100} st={{ borderRadius: "50%", background: "#8ff0b4" }} />
      ))}
    </Lead>
  );
}

/* --- 27. Lone Crown (t3) — THE SOLITARY ONE -------------------------------
   One bright star in a field with nothing else in it burns twice as hard; the
   moment a companion kindles nearby, the field is no longer empty and the
   brightness goes. Palette: #ffd08c / #fff4d6 / #221a33. */
const LC_NEAR: Array<[number, number]> = [[38, 40], [60, 52]];

function SolitaryStarScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g03-lo-field" l={6} t={6} w={88} h={88} d={40} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(34,26,51,0.9), transparent 72%)" }} />
        <V c="g03-lo-star" l={32} t={32} w={36} h={36} d={260}><path d={STAR} fill="#fff4d6" /></V>
        <V c="g03-lo-near" l={62} t={58} w={20} h={20} d={470}><path d={SPARKSTAR} fill="#ffd08c" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g03-hit" l={8} t={8} w={84} h={84} d={0} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(34,26,51,0.85), transparent 70%)" }} />
        <V c="g03-hitside" l={32} t={32} w={36} h={36} d={140}><path d={STAR} fill="#fff4d6" /></V>
        <V c="g03-hit2" l={62} t={60} w={18} h={18} d={250}><path d={SPARKSTAR} fill="#ffd08c" /></V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Night tone="rgba(34,26,51,0.48)" d={70} /><Rim tone="rgba(255,208,140,0.22)" d={520} /></>}>
      <L c="g03-lo-field" l={36} t={36} w={28} h={28} d={90} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(34,26,51,0.9), transparent 72%)" }} />
      <V c="g03-lo-star" l={45} t={42} w={10} h={10} d={280}><path d={STAR} fill="#fff4d6" /></V>
      <L c="g03-skyshaft" l={46} t={30} w={8} h={16} d={380} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.55), transparent)", transformOrigin: "50% 100%" }} />
      <V c="g03-lo-crown" l={45.5} t={47} w={9} h={11} d={520}><path d={KING} fill="none" stroke="#ffd08c" strokeWidth="1.3" {...SJ} /></V>
      {LC_NEAR.map(([l, t], i) => (
        <V key={i} c="g03-lo-near" l={l} t={t} w={5} h={5} d={640 + i * 120}><path d={SPARKSTAR} fill="#ffd08c" /></V>
      ))}
      <L c="g03-glint" l={49} t={44} w={2.4} h={2.4} d={760} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 28. Over the Shoulder (t3) — THE RETROGRADE LOOP ---------------------
   The wanderer stops dead in the sky, walks backwards over its own track for a
   while, and everything it already passed is on show again. Palette: #ff9f8c /
   #fff2dc / #2b1520. */
const OS_LOOP = "M2.6 16C7 15 11 12.6 14 9.4c1.8-2 4-1.4 4.6.8.6 2.2-1 4-3.6 4.2-2.6.2-4.6-1.6-4.4-4C10.8 7.6 16 5.6 21.4 5.4";

function RetrogradeScene({ role, delayMs }: SceneProps) {
  const loop = <path d={OS_LOOP} fill="none" stroke="#ff9f8c" strokeWidth="1.3" strokeDasharray="2.2 1.8" {...SJ} />;
  const planet = <circle cx="12" cy="12" r="6.4" fill="#fff2dc" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g03-rg-loop" l={6} t={20} w={88} h={56} d={40}>{loop}</V>
        <V c="g03-rg-planet" l={16} t={44} w={24} h={24} d={260}>{planet}</V>
        <V c="g03-rg-back" l={48} t={30} w={24} h={24} d={470}>{planet}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g03-hit" l={8} t={22} w={84} h={54} d={0}>{loop}</V>
        <V c="g03-hitside" l={20} t={42} w={26} h={26} d={140}>{planet}</V>
        <L c="g03-hit2" l={52} t={36} w={16} h={16} d={250} st={{ borderRadius: "50%", background: "#ff9f8c" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Night tone="rgba(43,21,32,0.4)" d={70} /><Wash tone="rgba(255,159,140,0.24)" /></>}>
      <V c="g03-rg-loop" l={38} t={40} w={26} h={18} d={100}>{loop}</V>
      <V c="g03-rg-planet" l={41} t={45} w={7} h={7} d={280}>{planet}</V>
      <L c="g03-rg-stop" l={49} t={44} w={1.4} h={7} d={430} st={{ borderRadius: "999px", background: "#fff2dc" }} />
      <V c="g03-rg-back" l={50} t={42} w={7} h={7} d={540}>{planet}</V>
      <L c="g03-castshadow" l={42} t={56} w={16} h={2.6} d={660} st={{ borderRadius: "999px", background: "rgba(43,21,32,0.7)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g03-mote" l={44 + i * 5} t={48} w={1.5} h={1.5} d={700 + i * 110} st={{ borderRadius: "50%", background: "#ff9f8c" }} />
      ))}
    </Lead>
  );
}

/* --- 29. Over the Wall (t3) — THE AURORA CURTAIN ---------------------------
   A green curtain hangs down over the far ranks and ripples; the folds count
   themselves off along the hem, and a rose fringe lights at the bottom edge as
   it passes. Palette: #7fe6a8 / #ffd3e0 / #10281f. */
const OW_FOLDS = [0, 1, 2, 3, 4];

function AuroraCurtainScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        {OW_FOLDS.slice(0, 4).map((i) => (
          <L key={i} c="g03-au-fold" l={8 + i * 22} t={8} w={12} h={64} d={40 + i * 130} st={{ background: "linear-gradient(180deg, rgba(127,230,168,0.9), transparent)" }} />
        ))}
        <L c="g03-au-fringe" l={6} t={62} w={88} h={5} d={560} st={{ borderRadius: "999px", background: "#ffd3e0" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g03-hitside" l={14} t={10} w={16} h={62} d={0} st={{ background: "linear-gradient(180deg, rgba(127,230,168,0.9), transparent)" }} />
        <L c="g03-hit" l={44} t={10} w={16} h={62} d={140} st={{ background: "linear-gradient(180deg, rgba(127,230,168,0.9), transparent)" }} />
        <L c="g03-hit2" l={16} t={66} w={64} h={4} d={250} st={{ borderRadius: "999px", background: "#ffd3e0" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Night tone="rgba(16,40,31,0.4)" d={70} />
          <Wash tone="rgba(127,230,168,0.24)" />
        </>
      }
    >
      <L c="g03-riseside" l={38} t={38} w={24} h={1.4} d={80} st={{ borderRadius: "999px", background: "#7fe6a8" }} />
      {OW_FOLDS.map((i) => (
        <L key={i} c="g03-au-fold" l={40 + i * 4.4} t={36} w={3} h={20} d={220 + i * 90} st={{ background: "linear-gradient(180deg, rgba(127,230,168,0.9), transparent)" }} />
      ))}
      <L c="g03-au-ripple" l={38} t={38} w={26} h={16} d={560} st={{ background: "linear-gradient(90deg, transparent, rgba(255,244,214,0.6), transparent)" }} />
      <L c="g03-au-fringe" l={39} t={54} w={24} h={2} d={640} st={{ borderRadius: "999px", background: "#ffd3e0" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g03-mote" l={42 + i * 8} t={48} w={1.5} h={1.5} d={700 + i * 110} st={{ borderRadius: "50%", background: "#7fe6a8" }} />
      ))}
    </Lead>
  );
}

/* --- 30. Pawn's Ransom (t3) — A STAR IS PRISED OUT ------------------------
   One star is worked loose from its own constellation and let fall; the figure
   is left with a hole in it and the remaining lines burn brighter for the
   trade. Palette: #ffcf8c / #fff4d6 / #251a2e. */
const PR_NODES: Array<[number, number]> = [[41, 40], [47, 37], [54, 41], [51, 48], [44, 47]];

function StarRansomScene({ role, delayMs }: SceneProps) {
  const figure = (
    <path d="M4 12L10 5l8 4-2 9-8 1z" fill="none" stroke="#ffcf8c" strokeWidth="1.2" strokeDasharray="2.4 1.6" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g03-pr-line" l={10} t={10} w={80} h={80} d={40}>{figure}</V>
        <V c="g03-pr-pluck" l={30} t={16} w={24} h={24} d={260}><path d={SPARKSTAR} fill="#fff4d6" /></V>
        <L c="g03-pr-gap" l={34} t={20} w={12} h={12} d={470} st={{ borderRadius: "50%", border: "2px solid #ffcf8c" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g03-hit" l={12} t={12} w={76} h={76} d={0}>{figure}</V>
        <V c="g03-hitside" l={34} t={44} w={30} h={38} d={140}><path d={PAWN} fill="#fff4d6" /></V>
        <L c="g03-hit2" l={36} t={22} w={14} h={14} d={250} st={{ borderRadius: "50%", border: "2px solid #ffcf8c" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Night tone="rgba(37,26,46,0.42)" d={70} /><Wash tone="rgba(255,207,140,0.24)" /></>}>
      <V c="g03-pr-line" l={38} t={34} w={22} h={20} d={90}>{figure}</V>
      {PR_NODES.map(([l, t], i) => (
        <V key={i} c="g03-glint" l={l} t={t} w={3.4} h={3.4} d={200 + i * 80}><path d={SPARKSTAR} fill="#ffcf8c" /></V>
      ))}
      <V c="g03-pr-pluck" l={46} t={36} w={6} h={6} d={520}><path d={SPARKSTAR} fill="#fff4d6" /></V>
      <L c="g03-pr-gap" l={46.4} t={36.4} w={5} h={5} d={640} st={{ borderRadius: "50%", border: "2px solid #ffcf8c" }} />
      <L c="g03-castshadow" l={42} t={56} w={16} h={2.8} d={680} st={{ borderRadius: "999px", background: "rgba(37,26,46,0.7)" }} />
      <L c="g03-sift" l={47} t={44} w={1.6} h={1.6} d={740} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 31. Rest Stop (t3) — THE SUN STANDS STILL ----------------------------
   Solstice. The shadow of the year creeps down the stone until its tip touches
   the carved mark, and there it stops: for one long breath nothing on the board
   moves at all. Palette: #ffc98c / #fff4d6 / #2e1f14. */
function SolsticeMarkScene({ role, delayMs }: SceneProps) {
  const mark = (
    <g fill="none" stroke="#fff4d6" strokeWidth="1.4" {...SJ}>
      <path d="M3 12h18" />
      <path d="M12 6.6c3 1.8 4.6 3.6 4.6 5.4S15 15.6 12 17.4 7.4 13.8 7.4 12 9 8.4 12 6.6z" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g03-so-beam" l={10} t={6} w={20} h={70} d={40} st={{ background: "linear-gradient(180deg, rgba(255,201,140,0.85), transparent)", transformOrigin: "50% 0%" }} />
        <V c="g03-so-mark" l={54} t={44} w={36} h={36} d={260}>{mark}</V>
        <L c="g03-so-hold" l={20} t={70} w={64} h={4} d={470} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g03-hitside" l={14} t={8} w={20} h={64} d={0} st={{ background: "linear-gradient(180deg, rgba(255,201,140,0.8), transparent)", transformOrigin: "50% 0%" }} />
        <V c="g03-hit" l={50} t={44} w={36} h={36} d={140}>{mark}</V>
        <L c="g03-hit2" l={22} t={74} w={56} h={4} d={250} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(255,201,140,0.26)" /><Rim tone="rgba(255,244,214,0.2)" d={560} /></>}>
      <L c="g03-skyshaft" l={44} t={28} w={9} h={20} d={90} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.7), transparent)", transformOrigin: "50% 0%" }} />
      <L c="g03-so-beam" l={43} t={38} w={7} h={14} d={260} st={{ background: "linear-gradient(180deg, rgba(255,201,140,0.9), transparent)", transformOrigin: "50% 0%" }} />
      <V c="g03-so-mark" l={49} t={46} w={11} h={11} d={430}>{mark}</V>
      <L c="g03-so-touch" l={48} t={49} w={4} h={4} d={600} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      <L c="g03-so-hold" l={40} t={54} w={20} h={1.6} d={660} st={{ borderRadius: "999px", background: "#ffc98c" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g03-sift" l={43 + i * 6} t={50} w={1.4} h={1.4} d={720 + i * 100} st={{ borderRadius: "50%", background: "#ffc98c" }} />
      ))}
    </Lead>
  );
}

/* --- 32. Sparring Rhythm (t3) — THE RADIANT ------------------------------
   The shower's radiant opens over the square and the meteors come in pairs,
   trading strokes across it: two exchanges counted off, then the last trails
   burn out. Palette: #9ad8ff / #fff4d6 / #14243a. */
const SR_PAIRS = [0, 1];

function RadiantScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g03-rd-radiant" l={36} t={36} w={28} h={28} d={40} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.85), transparent 70%)" }} />
        <L c="g03-rd-streak" l={12} t={16} w={44} h={3} d={260} st={{ borderRadius: "999px", background: "#9ad8ff", transformOrigin: "100% 50%", rotate: "-28deg" }} />
        <L c="g03-rd-pair" l={44} t={62} w={44} h={3} d={470} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "0% 50%", rotate: "-28deg" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g03-hit" l={38} t={38} w={24} h={24} d={0} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.8), transparent 70%)" }} />
        <L c="g03-hitside" l={14} t={20} w={40} h={3} d={140} st={{ borderRadius: "999px", background: "#9ad8ff", transformOrigin: "100% 50%", rotate: "-30deg" }} />
        <L c="g03-hit2" l={46} t={60} w={40} h={3} d={250} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "0% 50%", rotate: "-30deg" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Night tone="rgba(20,36,58,0.4)" d={60} /><Wash tone="rgba(154,216,255,0.24)" /></>}>
      <L c="g03-rd-radiant" l={45} t={44} w={10} h={10} d={90} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.85), transparent 70%)" }} />
      {SR_PAIRS.map((i) => (
        <L key={i} c="g03-rd-streak" l={34 - i * 2} t={38 + i * 4} w={16} h={1.4} d={260 + i * 200} st={{ borderRadius: "999px", background: "#9ad8ff", transformOrigin: "100% 50%", rotate: "-26deg" }} />
      ))}
      {SR_PAIRS.map((i) => (
        <L key={i} c="g03-rd-pair" l={50 + i * 2} t={50 - i * 4} w={16} h={1.4} d={360 + i * 200} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "0% 50%", rotate: "-26deg" }} />
      ))}
      <L c="g03-castshadow" l={43} t={56} w={14} h={2.6} d={660} st={{ borderRadius: "999px", background: "rgba(20,36,58,0.7)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g03-sift" l={44 + i * 6} t={48} w={1.4} h={1.4} d={700 + i * 100} st={{ borderRadius: "50%", background: "#9ad8ff" }} />
      ))}
    </Lead>
  );
}

/* --- 33. Ragnarok Postponed (t9) — THE DOOM THAT AGREED TO WAIT -------------
   The sky event nobody argues with: night comes down, an omen reddens the
   horizon, and the doom-star simply FALLS, trail and all, straight for the
   middle of the world. Then the toll: one great ring, and the star is caught
   dead in the air a hand's breadth over the board, tethered by rune-chains
   from both sides, its own trail still hanging above it. Ten tallies tick
   along the horizon rail: the bell has counted, not cancelled. Settle: slow
   embers sift down from the held fire and the stars come back out.
   Board-anchored: this happens to the whole world or not at all. Palette:
   #ffb366 / #ffe8c2 / #190f2e. */
const DM_TALLY = Array.from({ length: 10 }, (_, i) => i);

function RagnarokPostponedScene({ role, delayMs }: SceneProps) {
  const star = (
    <g {...SJ}>
      <circle cx="12" cy="14" r="6" fill="#ffb366" stroke="#190f2e" strokeWidth="1.1" />
      <path d="M8.4 10.4L4.8 3.6M12 8V1.4M15.6 10.4l3.6-6.8" stroke="#ffe8c2" strokeWidth="1.6" />
    </g>
  );
  const chain = (
    <path d="M2 12h3.6m2.4 0h3.6m2.4 0h3.6m2.4 0H22" stroke="#ffe8c2" strokeWidth="2.2" strokeLinecap="round" />
  );
  if (role === "entrance") return (
    <Cut d={delayMs}>
      <L c="g03-ent-pop" l={18} t={64} w={64} h={5} d={40} st={{ borderRadius: "999px", background: "#190f2e" }} />
      <V c="g03-dm-fall" l={30} t={6} w={40} h={48} d={220}>{star}</V>
      <L c="g03-dm-halt" l={24} t={22} w={52} h={40} d={430} st={{ borderRadius: "50%", border: "2px solid #ffe8c2" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g03-dm-tally" l={30 + i * 15} t={74} w={4} h={12} d={560 + i * 70} st={{ background: "#ffb366" }} />
      ))}
    </Cut>
  );
  if (role === "target") return (
    <Cut d={delayMs}>
      <V c="g03-hit" l={26} t={10} w={48} h={52} d={0}>{star}</V>
      <L c="g03-dm-halt" l={20} t={20} w={60} h={44} d={160} st={{ borderRadius: "50%", border: "2px solid #ffe8c2" }} />
      <L c="g03-hit2" l={12} t={70} w={76} h={4} d={300} st={{ borderRadius: "999px", background: "#ffb366" }} />
    </Cut>
  );
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Night tone="rgba(25,15,46,0.66)" d={0} />
          <Wash tone="rgba(255,179,102,0.2)" d={140} />
          {/* the omen reddening the horizon rail on the CASTER's side */}
          <L c="g03-dm-omen" d={120} l={0} t={0} w={100} h={16} st={{ top: "calc(42% + var(--fx-side, 1) * 42%)", background: "linear-gradient(180deg, rgba(255,179,102,0.5), transparent)" }} />
          {/* the toll: one great ring out over the whole world */}
          <L c="g03-dm-toll" d={560} l={26} t={16} w={48} h={48} st={{ borderRadius: "50%", border: "2px solid #ffe8c2" }} />
          {/* ten tallies tick along the horizon: counted, not cancelled */}
          {DM_TALLY.map((i) => (
            <L key={i} c="g03-dm-tally" d={640 + i * 45} l={7 + i * 9} t={0} w={1.2} h={4.4} st={{ top: "calc(46% + var(--fx-side, 1) * 40%)", background: i === 9 ? "#ffe8c2" : "#ffb366", animationDelay: `calc(var(--g03-d, 0ms) + ${640 + i * 45}ms * var(--fx-dur, 1) + var(--fx-index, 0) * 20ms)` }} />
          ))}
          <Rim tone="rgba(255,232,194,0.2)" d={900} />
        </>
      }
    >
      {/* the doom-star falls for the middle of the world, growing as it comes */}
      <V c="g03-dm-fall" l={46} t={30} w={8} h={8} d={220}>{star}</V>
      {/* its trail, stretched up behind the fall and left hanging by the halt */}
      <L c="g03-dm-trail" d={260} l={49.2} t={18} w={1.6} h={13} st={{ borderRadius: "999px", background: "linear-gradient(180deg, transparent, #ffb366 60%, #ffe8c2)" }} />
      {/* strike: CAUGHT. The halt flash stamps where it stopped. */}
      <L c="g03-dm-halt" d={560} l={44.5} t={35} w={11} h={11} st={{ borderRadius: "50%", border: "2px solid #ffe8c2" }} />
      {/* rune-chains go taut from both sides and hold it there */}
      <V c="g03-dm-chain" d={620} vb="0 0 24 24" par="none" l={33} t={39.5} w={13} h={2} st={{ transformOrigin: "0% 50%" }}>{chain}</V>
      <V c="g03-dm-chain" d={620} vb="0 0 24 24" par="none" l={54} t={39.5} w={13} h={2} st={{ transformOrigin: "100% 50%", rotate: "180deg" }}>{chain}</V>
      {/* the held star breathes where it hangs: fury on a leash */}
      <L c="g03-dm-held" d={760} l={46.5} t={37} w={7} h={7} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,232,194,0.85), rgba(255,179,102,0.4) 55%, transparent 74%)" }} />
      {/* settle: slow embers sift down out of the caught fire */}
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g03-dm-ember" l={45 + i * 3} t={44} w={1.1} h={1.1} d={860 + i * 90} st={{ borderRadius: "50%", background: i % 2 ? "#ffb366" : "#ffe8c2" }} />
      ))}
      {[0, 1].map((i) => (
        <V key={i} c="g03-twinkle" l={38 + i * 22} t={28 + i * 6} w={3.4} h={3.4} d={1000 + i * 110}>
          <path d={SPARKSTAR} fill="#ffe8c2" />
        </V>
      ))}
    </Lead>
  );
}

/* =============================================================================
   Registry. Every entry declares an anchor; every `sound` is an existing
   SigSoundKey drawn from the batch's six voices (clockcage, clockice, snooze,
   blitz, cathedral, crownrain). `source` is deliberately omitted throughout:
   these cards carry no removal diff, so their play is the cast lead on the
   square they were played on, exactly as the generated family resolved before.
   ========================================================================== */

/** Bind one bespoke scene to its config. */
function S(Render: SigPlugin["Render"], config: SigPlugin["config"]): SigPlugin {
  return { config, Render };
}

/* =============================================================================
   FLAGSHIP IMPACT WAVE - the module-wide moment of real contact.

   Every lead now lands one physical hit from the shared impact vocabulary
   (impact/impact.tsx), layered OVER the card's own scene: starfire lances down out of the module's own night sky and the omen (star, moon, comet) is burst apart where it hangs.
   Per card, the IMPACT spec picks the primitive combo, the glyph that is split
   in half, the tint (the card's own core color as an r-g-b triple) and the
   beat, which is synced to that scene's OWN strike rhythm, so no two siblings
   land the same hit. The quake wrapper jolts the whole scene stage on the same
   beat (in-scene only: the real board crop never shakes). Animations-off
   coverage for all of these nodes is at the bottom of g03CelestialPlays.css.
   ========================================================================== */

interface G03Imp {
  /** impact beat, ms after the lead's own delayMs */
  at: number;
  /** the card's core color as an "r g b" triple (drives --imp-rgb) */
  rgb: string;
  laser?: boolean;
  shock?: boolean;
  /** which of the module's shatter glyphs is split in half */
  g?: number;
  /** stage jolt on the beat: "s" soft, "h" hard */
  q?: "s" | "h";
  /** impact centre on the 14-cell stage, in percent (cast square = 50/50) */
  x?: number;
  y?: number;
  /** composite box size, in stage percent (9 is ~1.26 cells) */
  s?: number;
}

const IMP_TINT = "rgb(var(--imp-rgb, 216 181 110) / 0.95)";
const IMP_EDGE = "rgba(247, 241, 227, 0.9)";

/** The module's shatter victims: a five-point star, a crescent moon, a comet head. Tinted per card via --imp-rgb. */
const IMP_GLYPHS: ReactNode[] = [
  <svg key="a" viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
    <path d="M12 2.6l2.2 6.9 7.2 2.5-7.2 2.5L12 21.4l-2.2-6.9-7.2-2.5 7.2-2.5z" fill={IMP_TINT} /><circle cx="12" cy="12" r="1.6" fill={IMP_EDGE} />
  </svg>,
  <svg key="b" viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
    <path d="M15.6 2.8a9.6 9.6 0 1 0 5.6 15.4A10.6 10.6 0 0 1 15.6 2.8z" fill={IMP_TINT} /><circle cx="9.4" cy="9" r="1.1" fill={IMP_EDGE} />
  </svg>,
  <svg key="c" viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
    <circle cx="8.4" cy="15.6" r="5" fill={IMP_TINT} /><path d="M11.6 12.4L21 3l-4.4 10.4z" fill={IMP_TINT} /><circle cx="8.4" cy="15.6" r="1.7" fill={IMP_EDGE} />
  </svg>,
];

const IMPACT: Record<string, G03Imp> = {
  hx4_the_bell_tolls: { at: 420, rgb: "255 207 110", laser: true, g: 0, q: "s" },
  ov_managers_challenge: { at: 460, rgb: "159 208 255", laser: true, shock: true, q: "s" },
  ov_nesting_doll: { at: 520, rgb: "255 158 196", laser: true, g: 1, q: "s" },
  bn4_bread_and_salt: { at: 650, rgb: "240 198 116", shock: true, g: 0, q: "s" },
  bn4_clerical_error: { at: 660, rgb: "255 210 122", laser: true, shock: true, g: 2, q: "h" },
  bn4_coronation_rest: { at: 440, rgb: "255 217 160", laser: true, q: "s" },
  bn4_furlough: { at: 465, rgb: "255 178 122", laser: true, g: 0, q: "s" },
  bn4_general_strike: { at: 565, rgb: "168 230 255", laser: true, shock: true, q: "s" },
  bn4_harvest_rest: { at: 560, rgb: "255 190 92", laser: true, g: 1, q: "s" },
  bn4_hidden_stair: { at: 610, rgb: "185 200 255", shock: true, g: 0, q: "s" },
  bn4_hold_the_door: { at: 510, rgb: "143 159 208", laser: true, shock: true, g: 2, q: "h" },
  bn4_home_square: { at: 505, rgb: "207 227 255", laser: true, q: "s" },
  bn4_listening_post: { at: 550, rgb: "158 240 216", laser: true, g: 0, q: "s" },
  bn4_paid_leave: { at: 605, rgb: "255 196 106", laser: true, shock: true, q: "s" },
  bn4_scaffold_crane: { at: 655, rgb: "216 192 140", laser: true, g: 1, q: "s" },
  bn4_second_skin: { at: 555, rgb: "191 226 255", shock: true, g: 0, q: "s" },
  bn4_seven_league_boots: { at: 470, rgb: "127 224 255", laser: true, shock: true, g: 2, q: "h" },
  bn4_worry_beads: { at: 540, rgb: "169 200 255", laser: true, q: "s" },
  hx4_coronation_bill: { at: 650, rgb: "207 232 160", laser: true, g: 0, q: "s" },
  ov_sleeping_draught: { at: 600, rgb: "185 168 240", laser: true, shock: true, q: "s" },
  bn4_bottom_of_the_well: { at: 600, rgb: "143 201 255", laser: true, g: 1, q: "s" },
  bn4_bribe_the_clerk: { at: 485, rgb: "224 185 120", shock: true, g: 0, q: "s" },
  bn4_dragonslayer: { at: 610, rgb: "255 154 114", laser: true, shock: true, g: 2, q: "h" },
  bn4_forty_winks: { at: 700, rgb: "208 180 255", laser: true, q: "s" },
  bn4_hermits_hour: { at: 705, rgb: "200 176 232", laser: true, g: 0, q: "s" },
  bn4_hush_money: { at: 645, rgb: "143 240 180", laser: true, shock: true, q: "s" },
  bn4_lone_crown: { at: 500, rgb: "255 208 140", laser: true, g: 1, q: "s" },
  bn4_over_the_shoulder: { at: 490, rgb: "255 159 140", shock: true, g: 0, q: "s" },
  bn4_over_the_wall: { at: 585, rgb: "127 230 168", laser: true, shock: true, g: 2, q: "h" },
  bn4_pawns_ransom: { at: 695, rgb: "255 207 140", laser: true, q: "s" },
  bn4_rest_stop: { at: 690, rgb: "255 201 140", laser: true, g: 0, q: "s" },
  bn4_sparring_rhythm: { at: 530, rgb: "154 216 255", laser: true, shock: true, q: "s" },
  // t9 hero: the catch itself is the hit — starfire column onto the held
  // star, the five-point omen burst in half, the whole sky bucking once
  ov_ragnarok_postponed: { at: 560, rgb: "255 179 102", laser: true, shock: true, g: 0, q: "h", s: 12 },
};

/** The impact composite: laser column, glyph split in half, ground ring. */
function ImpactRig({ imp, delayMs }: { imp: G03Imp; delayMs: number }) {
  const s = imp.s ?? 9;
  return (
    <BoardWideStage>
      <span
        className="g03-imprig absolute block"
        style={{
          left: `${(imp.x ?? 50) - s / 2}%`,
          top: `${(imp.y ?? 50) - s / 2}%`,
          width: `${s}%`,
          height: `${s}%`,
          ...impactVars(imp.rgb, (delayMs + imp.at) / 1000),
        }}
      >
        {imp.laser ? <LaserStrike /> : null}
        {imp.g != null ? <PieceShatter glyph={IMP_GLYPHS[imp.g]} /> : null}
        {imp.shock ? <Shockwave /> : null}
      </span>
    </BoardWideStage>
  );
}

/** Leads render inside a quake wrapper (the whole stage jolts on the impact
 *  beat) with the rig mounted beside them; target/entrance cuts pass through
 *  untouched. */
function withImpact(Base: SigPlugin["Render"], imp: G03Imp): SigPlugin["Render"] {
  function ImpactLead(props: { lead: boolean; role: SigRole; delayMs: number }) {
    if (props.role !== "lead") return <Base {...props} />;
    const scene = <Base {...props} />;
    return (
      <>
        {imp.q ? (
          <span
            className={`g03-quake-${imp.q} pointer-events-none absolute inset-0 z-30 block`}
            style={impactVars(imp.rgb, (props.delayMs + imp.at) / 1000)}
          >
            {scene}
          </span>
        ) : (
          scene
        )}
        <ImpactRig imp={imp} delayMs={props.delayMs} />
      </>
    );
  }
  return ImpactLead;
}

export const PLAYS: Record<string, SigPlugin> = {
  hx4_the_bell_tolls: S(TotalityScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }),
  ov_managers_challenge: S(MeridianWireScene, { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }),
  ov_nesting_doll: S(NovaShellsScene, { ordering: "radial", staggerMs: 70, victims: ["q", "r", "b", "p"], hasLead: true, sound: "crownrain", anchor: "cast" }),
  bn4_bread_and_salt: S(HeliacalRisingScene, { ordering: "file", staggerMs: 80, victims: ["p"], hasLead: true, sound: "cathedral", anchor: "cast" }),
  bn4_clerical_error: S(AnalemmaScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }),
  bn4_coronation_rest: S(NorthernCrownScene, { ordering: "radial", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain", anchor: "cast" }),
  bn4_furlough: S(WatchStarSetsScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }),
  bn4_general_strike: S(StarTrailsHaltScene, { ordering: "octagon", staggerMs: 55, victims: "all", hasLead: true, sound: "clockice", anchor: "board" }),
  bn4_harvest_rest: S(HarvestMoonScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }),
  bn4_hidden_stair: S(StarStairScene, { ordering: "line", staggerMs: 70, victims: ["k"], hasLead: true, sound: "clockcage", anchor: "cast" }),
  bn4_hold_the_door: S(EarthShadowScene, { ordering: "line", staggerMs: 65, victims: "all", hasLead: true, sound: "clockice", anchor: "board" }),
  bn4_home_square: S(PoleStarScene, { ordering: "radial", staggerMs: 60, victims: ["k"], hasLead: true, sound: "cathedral", anchor: "board" }),
  bn4_listening_post: S(PulsarTickScene, { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz", anchor: "board" }),
  bn4_paid_leave: S(MidnightSunScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }),
  bn4_scaffold_crane: S(CulminationScene, { ordering: "line", staggerMs: 75, victims: ["r"], hasLead: true, sound: "clockcage", anchor: "cast" }),
  bn4_second_skin: S(HaloSundogsScene, { ordering: "octagon", staggerMs: 55, victims: ["n", "b"], hasLead: true, sound: "clockice", anchor: "cast" }),
  bn4_seven_league_boots: S(BolideScene, { ordering: "line", staggerMs: 65, victims: ["p"], hasLead: true, sound: "blitz", anchor: "aim" }),
  bn4_worry_beads: S(PleiadesScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }),
  hx4_coronation_bill: S(CometReturnScene, { ordering: "line", staggerMs: 70, victims: ["p"], hasLead: true, sound: "clockcage", anchor: "aim" }),
  ov_sleeping_draught: S(OccultationScene, { ordering: "radial", staggerMs: 0, victims: ["n", "b"], hasLead: true, sound: "snooze", anchor: "cast" }),
  bn4_bottom_of_the_well: S(NoonStarScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }),
  bn4_bribe_the_clerk: S(ZodiacBandScene, { ordering: "octagon", staggerMs: 55, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }),
  bn4_dragonslayer: S(LunarNodeScene, { ordering: "radial", staggerMs: 60, victims: ["q"], hasLead: true, sound: "cathedral", anchor: "cast" }),
  bn4_forty_winks: S(AlgolWinkScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }),
  bn4_hermits_hour: S(ZodiacalLightScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }),
  bn4_hush_money: S(GreenFlashScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz", anchor: "board" }),
  bn4_lone_crown: S(SolitaryStarScene, { ordering: "radial", staggerMs: 60, victims: ["k"], hasLead: true, sound: "cathedral", anchor: "cast" }),
  bn4_over_the_shoulder: S(RetrogradeScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }),
  bn4_over_the_wall: S(AuroraCurtainScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "clockice", anchor: "board" }),
  bn4_pawns_ransom: S(StarRansomScene, { ordering: "radial", staggerMs: 60, victims: ["p"], hasLead: true, sound: "crownrain", anchor: "cast" }),
  bn4_rest_stop: S(SolsticeMarkScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }),
  bn4_sparring_rhythm: S(RadiantScene, { ordering: "octagon", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz", anchor: "board" }),
  ov_ragnarok_postponed: S(RagnarokPostponedScene, { ordering: "sweep", staggerMs: 70, victims: ["q", "r", "b", "n"], hasLead: true, sound: "cathedral", anchor: "board" }),
};

// Graft the per-card impact beat onto every lead scene (additive: the base
// scene renders unchanged inside the quake wrapper).
for (const [id, imp] of Object.entries(IMPACT)) {
  const play = PLAYS[id];
  if (play) play.Render = withImpact(play.Render, imp);
}
