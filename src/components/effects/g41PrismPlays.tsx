// g41PrismPlays — bespoke plays for 42 cards that used to share four small
// generated families (prismSplit, hexSigil, mirrorShatter, gustSpiral, plus two
// strays), i.e. the same handful of choreographies in forty-two hue shifts.
//
// MODULE FICTION: LIGHT, REFLECTION, AND WHAT BREAKS THEM. Every card is a
// different OPTICAL EVENT and owns its own instrument: a slide projector
// clunking a slide into the gate, a jeweller's loupe swinging down, a
// theodolite sighting a border, a lighthouse's dioptric belts turning, a soap
// film's interference colours crawling until it pops, a burning lens smoking a
// hole, caustics rippling on the bottom of a pool, a mirage peeling the horizon
// up, a shattered mirror where every shard shows a different square, a
// kaleidoscope taking a quarter turn, a prism fanning a spectrum. No two cards
// share a central object; the palette, not the object, is what repeats.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g41PrismPlays.css), transform/opacity animations only, no imports from
// BoardEffects.tsx, only the SigPlugin/SigRole TYPES from sigPlugins.tsx.
//
// STAGING. Every card declares an anchor, and the choice is the one
// scripts/lib/anchor-rule.ts allows for that card's mechanical category rather
// than a taste call: a card that lands on one square or one piece anchors
// "cast" (or "aim" when the vector IS the card), while an information sweep, a
// draft trick or a rule that rewrites the whole board anchors "board", because
// for those centring is the truthful staging and not a compromise.
// Board-scale layers (washes, edge glare, half-board bands, the two central
// ranks) live inside <BoardFrame>, never at a fixed percentage of the stage.
// Cards whose light TRAVELS (a lighthouse sweep, a mirror bounce, a survey
// sight line, a severed fibre) keep the instrument upright on the anchor square
// and put only the beam in <AimStage>, so the theodolite never lies on its side
// to sight a peg.
//
// Every scene runs three beats — tell, strike, settle — in all three roles, and
// every scene carries at least one animated layer driven by the geometry vars
// (--fx-ox/--fx-oy lean, --fx-ang aim, --fx-len run, --fx-side arrival). All
// CSS lives in g41PrismPlays.css behind the `g41-` prefix.

import "./g41PrismPlays.css";

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
const rootStyle = (d: number): CSSProperties => ({ "--g41-d": `${d}ms` }) as CSSProperties;

/** stagger + a beat offset, scaled by the Settings animation-speed var. */
const b = (ms: number): string => `calc(var(--g41-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

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

/**
 * Instrument upright on the cast square, beam aimed down the real vector.
 *
 * A theodolite does not lie on its side to sight a peg, so the optics that
 * TRAVEL go in `aim` and everything that stands stays in `cast`.
 */
function SplitLead({
  d, frame, cast, aim,
}: { d: number; frame?: ReactNode; cast: ReactNode; aim: ReactNode }) {
  return (
    <span className={ROOT} style={rootStyle(d)} aria-hidden="true">
      <BoardWideStage>
        {frame ? <BoardFrame>{frame}</BoardFrame> : null}
        {cast}
      </BoardWideStage>
      <AimStage>{aim}</AimStage>
    </span>
  );
}

/** Board-wide bloom, always inside a BoardFrame. */
function Wash({ tone, d = 0 }: { tone: string; d?: number }) {
  return <L c="g41-wash" d={d} st={{ background: `radial-gradient(circle at 50% 50%, ${tone}, transparent 72%)` }} />;
}

/** Board-edge glare, always inside a BoardFrame. */
function Rim({ tone, d = 200 }: { tone: string; d?: number }) {
  return <L c="g41-rim" d={d} st={{ boxShadow: `inset 0 0 34px 10px ${tone}` }} />;
}

/** The caster's own half of the board, lit. Flips sides on --fx-side. */
function Half({ tone, d = 140 }: { tone: string; d?: number }) {
  return (
    <L c="g41-halfband" l={0} t={50} w={100} h={50} d={d}
      st={{ background: `linear-gradient(180deg, ${tone}, transparent)` }} />
  );
}

/** The two central ranks of the board, as a band. */
function MidBand({ tone, d = 140 }: { tone: string; d?: number }) {
  return <L c="g41-midband" l={0} t={37.5} w={100} h={25} d={d} st={{ background: tone }} />;
}

/* Piece silhouettes: the bystanders the optics are pointed at. */
const PAWN = "M12 4.4a2.7 2.7 0 0 1 1.6 4.9l1.8 6.4H8.6l1.8-6.4A2.7 2.7 0 0 1 12 4.4z M7.4 16.8h9.2V19.4H7.4z";
const KING = "M11.1 2.4h1.8v1.5h1.5v1.8h-1.5v1.6h-1.8V5.7H9.6V3.9h1.5zM8 9.2h8l-1.1 7.4H9.1zM7.2 17.6h9.6V20H7.2z";
const KNIGHT = "M8.2 19V13c0-3.8 2.5-5.9 4.6-6.5L12 4.2l3 1.2c2 .9 2.9 2.9 2.9 5.9V19z";
const ROOK = "M7 4.8h2.3v1.6h1.6V4.8h2.2v1.6h1.6V4.8H17v3.6h-1.2v6.8H17V19H7v-3.8h1.2V8.4H7z";
const QUEEN = "M6.4 6l1.3 3.2L9.4 6.6 12 9.4l2.6-2.8 1.7 2.6L17.6 6l-1 10.4H7.4zM7 17.4h10v2.4H7z";

/* --- 1. Loading Screen Tip (t2) — THE SLIDE PROJECTOR ------------------------
   A carousel projector ticks one notch, drops a glass slide into the gate with
   a clunk, and throws a caption of light across the boards. Dust drifts in the
   cone. Palette: #f0c56a / #fff2d2 / #221a10. */
function LoadingTipScene({ role, delayMs }: SceneProps) {
  const body = (
    <g {...SJ}>
      <path d="M3 9h13v9H3z" fill="#221a10" stroke="#f0c56a" strokeWidth="1.2" />
      <path d="M16 11.4l5 -2.2v9.4l-5-2.2z" fill="#f0c56a" />
      <circle cx="9.5" cy="6.4" r="3.4" fill="none" stroke="#f0c56a" strokeWidth="1.3" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-ent-rise" l={10} t={30} w={68} h={46} d={40}>{body}</V>
        <L c="g41-slp-slide" l={30} t={16} w={13} h={20} d={230} st={{ background: "#fff2d2", border: "2px solid #221a10" }} />
        <L c="g41-slp-cap" l={44} t={54} w={48} h={7} d={470} st={{ background: "linear-gradient(90deg, #fff2d2, rgba(240,197,106,0))", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g41-slp-slide" l={40} t={8} w={20} h={26} d={0} st={{ background: "#fff2d2", border: "2px solid #221a10" }} />
        <L c="g41-hitside" l={10} t={44} w={80} h={9} d={150} st={{ background: "linear-gradient(90deg, transparent, #f0c56a, transparent)" }} />
        <L c="g41-hit2" l={44} t={62} w={12} h={12} d={280} st={{ borderRadius: "50%", background: "#fff2d2" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(240,197,106,0.24)" /><Rim tone="rgba(255,242,210,0.24)" d={520} /></>}>
      <V c="g41-slp-drum" l={40} t={33} w={9} h={9} d={70} st={{ transformOrigin: "50% 50%" }}>
        <circle cx="12" cy="12" r="9" fill="none" stroke="#f0c56a" strokeWidth="2" strokeDasharray="3 2.4" />
      </V>
      <L c="g41-slp-slide" l={42.4} t={35} w={4.2} h={6} d={190} st={{ background: "#fff2d2", border: "1px solid #221a10" }} />
      <V c="g41-slp-body" l={37} t={41} w={16} h={11} d={260}>{body}</V>
      <L c="g41-ray" l={51} t={42} w={26} h={9} d={360} st={{ background: "linear-gradient(90deg, rgba(255,242,210,0.75), transparent)", transformOrigin: "0% 50%" }} />
      <L c="g41-slp-cap" l={54} t={51} w={30} h={4} d={520} st={{ background: "linear-gradient(90deg, #fff2d2, rgba(240,197,106,0))", transformOrigin: "0% 50%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g41-slp-mote" l={56 + i * 7} t={45 + i * 2} w={1.3} h={1.3} d={640 + i * 120} st={{ borderRadius: "50%", background: "#fff2d2" }} />
      ))}
    </Lead>
  );
}

/* --- 2. Second Opinion (t2) — THE JEWELLER'S LOUPE ---------------------------
   A loupe swings down on its hinge, the rim catches, a hard circle of focus
   opens under it and hairline crosshairs snap across the examined piece. Breath
   fog clears off the glass. Palette: #d9b26a / #fff3dc / #241c12. */
function SecondOpinionScene({ role, delayMs }: SceneProps) {
  const loupe = (
    <g {...SJ}>
      <circle cx="12" cy="13" r="8" fill="rgba(255,243,220,0.18)" stroke="#d9b26a" strokeWidth="2" />
      <path d="M12 5V1.6M8.6 2.4h6.8" stroke="#d9b26a" strokeWidth="1.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-lpe-swing" l={16} t={12} w={68} h={68} d={40} st={{ transformOrigin: "50% 4%" }}>{loupe}</V>
        <L c="g41-lpe-focus" l={30} t={30} w={40} h={40} d={280} st={{ borderRadius: "50%", border: "2px solid #fff3dc" }} />
        <L c="g41-glint" l={58} t={24} w={9} h={9} d={480} st={{ borderRadius: "50%", background: "#fff3dc" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hitside" l={14} t={12} w={72} h={72} d={0}>{loupe}</V>
        <L c="g41-lpe-focus" l={32} t={32} w={36} h={36} d={150} st={{ borderRadius: "50%", border: "2px solid #fff3dc" }} />
        <L c="g41-hit2" l={46} t={46} w={8} h={8} d={280} st={{ borderRadius: "50%", background: "#d9b26a" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(217,178,106,0.22)" />}>
      <L c="g41-castshadow" l={42} t={54} w={18} h={3} d={80} st={{ borderRadius: "999px", background: "rgba(36,28,18,0.6)" }} />
      <V c="g41-lpe-swing" l={40} t={34} w={20} h={20} d={140} st={{ transformOrigin: "50% 4%" }}>{loupe}</V>
      <L c="g41-lpe-focus" l={43} t={41} w={14} h={14} d={330} st={{ borderRadius: "50%", border: "2px solid #fff3dc" }} />
      <V c="g41-lpe-cross" l={42} t={40} w={16} h={16} d={430}>
        <path d="M12 2v20M2 12h20" stroke="#fff3dc" strokeWidth="0.7" strokeDasharray="2 1.6" />
      </V>
      <V c="g41-lpe-mark" l={45.5} t={43.5} w={9} h={9} d={560}><path d={PAWN} fill="#d9b26a" /></V>
      <L c="g41-lpe-fog" l={42} t={40} w={16} h={16} d={700} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,220,0.6), transparent 68%)" }} />
    </Lead>
  );
}

/* --- 3. Border Survey (t4) — THE THEODOLITE ----------------------------------
   A tripod plants its feet, the level bubble rolls centre, and the scope sights
   a line of survey pegs out along the real vector. Palette: #8fd6c0 / #fff3dc /
   #14312b. */
function BorderSurveyScene({ role, delayMs }: SceneProps) {
  const scope = (
    <g {...SJ}>
      <path d="M4 16l8-9 8 9" fill="none" stroke="#8fd6c0" strokeWidth="1.5" />
      <path d="M6.6 7.4h10.8v3.6H6.6z" fill="#14312b" stroke="#8fd6c0" strokeWidth="1.2" />
      <path d="M17.4 8.6h3.4v1.2h-3.4z" fill="#fff3dc" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-ent-rise" l={16} t={22} w={68} h={62} d={40}>{scope}</V>
        <L c="g41-thd-bubble" l={38} t={30} w={24} h={7} d={260} st={{ borderRadius: "999px", border: "2px solid #8fd6c0" }} />
        <L c="g41-thd-peg" l={64} t={54} w={5} h={26} d={470} st={{ background: "#fff3dc" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g41-thd-peg" l={46} t={20} w={8} h={54} d={0} st={{ background: "linear-gradient(180deg, #fff3dc, #8fd6c0)" }} />
        <L c="g41-hitside" l={22} t={62} w={56} h={5} d={160} st={{ background: "#8fd6c0" }} />
        <L c="g41-hit2" l={44} t={12} w={12} h={12} d={290} st={{ borderRadius: "50%", background: "#fff3dc" }} />
      </Cut>
    );
  }
  return (
    <SplitLead
      d={delayMs}
      frame={<><Wash tone="rgba(143,214,192,0.2)" /><Rim tone="rgba(255,243,220,0.2)" d={560} /></>}
      cast={
        <>
          <L c="g41-castshadow" l={42} t={54} w={18} h={3} d={80} st={{ borderRadius: "999px", background: "rgba(20,49,43,0.6)" }} />
          <V c="g41-thd-plant" l={42} t={38} w={16} h={16} d={150}>{scope}</V>
          <L c="g41-thd-bubble" l={44.6} t={40} w={11} h={3} d={330} st={{ borderRadius: "999px", border: "1px solid #8fd6c0" }} />
        </>
      }
      aim={
        <>
          <L c="g41-throw" l={50} t={49.2} w={30} h={1.6} d={420} st={{ background: "linear-gradient(90deg, #fff3dc, rgba(143,214,192,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
          {[0, 1, 2].map((i) => (
            <L key={i} c="g41-thd-peg" l={55 + i * 8} t={45} w={1} h={9} d={560 + i * 110} st={{ background: "#8fd6c0" }} />
          ))}
          <L c="g41-glint" l={78} t={47} w={4} h={4} d={800} st={{ borderRadius: "50%", background: "#fff3dc" }} />
        </>
      }
    />
  );
}

/* --- 4. Wallhack Goggles (t4) — THE POLARIZED VISOR --------------------------
   Twin lens barrels snap over the eyes, the coating goes from opaque amber to
   dead clear, and the sliders' lines show straight through the blockers as
   ghost rails. Palette: #b6a6f0 / #fff2dc / #1d1733. */
function WallhackGogglesScene({ role, delayMs }: SceneProps) {
  const goggles = (
    <g {...SJ}>
      <path d="M2.5 8.5h19v7.4a2 2 0 0 1-2 2h-4.4l-1.6-2.6h-2l-1.6 2.6H4.5a2 2 0 0 1-2-2z" fill="#1d1733" stroke="#b6a6f0" strokeWidth="1.2" />
      <circle cx="7.4" cy="12.2" r="2.6" fill="#b6a6f0" />
      <circle cx="16.6" cy="12.2" r="2.6" fill="#b6a6f0" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-ent-drop" l={10} t={26} w={80} h={48} d={40}>{goggles}</V>
        <L c="g41-ggl-clear" l={20} t={38} w={60} h={22} d={250} st={{ background: "linear-gradient(90deg, rgba(182,166,240,0.85), rgba(255,242,220,0.2))" }} />
        <L c="g41-ggl-rail" l={6} t={62} w={88} h={2} d={480} st={{ background: "#fff2dc" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g41-ggl-rail" l={-10} t={48} w={120} h={3} d={0} st={{ background: "linear-gradient(90deg, transparent, #b6a6f0, transparent)" }} />
        <V c="g41-hitside" l={20} t={26} w={60} h={48} d={150}>{goggles}</V>
        <L c="g41-hit2" l={44} t={44} w={12} h={12} d={290} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(182,166,240,0.22)" /><Rim tone="rgba(255,242,220,0.22)" d={540} /></>}>
      <V c="g41-ggl-snap" l={40} t={41} w={20} h={13} d={110}>{goggles}</V>
      <L c="g41-ggl-clear" l={43} t={44} w={14} h={6} d={280} st={{ background: "linear-gradient(90deg, rgba(182,166,240,0.9), rgba(255,242,220,0.15))" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g41-ggl-rail" l={20} t={40 + i * 7} w={60} h={0.9} d={420 + i * 110}
          st={{ background: "linear-gradient(90deg, transparent, #fff2dc, transparent)" }} />
      ))}
      <L c="g41-ray" l={52} t={46} w={24} h={4} d={600} st={{ background: "linear-gradient(90deg, rgba(182,166,240,0.7), transparent)", transformOrigin: "0% 50%" }} />
      <V c="g41-ggl-ghost" l={62} t={42} w={9} h={9} d={720}><path d={ROOK} fill="none" stroke="#b6a6f0" strokeWidth="1.4" /></V>
    </Lead>
  );
}

/* --- 5. Weather Balloon (t4) — THE ICE HALO ----------------------------------
   A sonde balloon lifts off the cast square, and as it climbs a 22 degree halo
   opens around it with a sun dog burning on either side. Palette: #9fd0f0 /
   #fff4d6 / #16283a. */
function WeatherBalloonScene({ role, delayMs }: SceneProps) {
  const balloon = (
    <g {...SJ}>
      <path d="M12 2.4c4 0 6.6 3.2 6.6 6.8 0 3.4-2.6 5.6-4.4 6.6h-4.4C8 14.8 5.4 12.6 5.4 9.2 5.4 5.6 8 2.4 12 2.4z" fill="rgba(159,208,240,0.4)" stroke="#9fd0f0" strokeWidth="1.3" />
      <path d="M11 16l1 3 1-3M12 19v3" stroke="#9fd0f0" strokeWidth="1.1" />
      <path d="M9.6 20.6h4.8v2.6H9.6z" fill="#16283a" stroke="#fff4d6" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hlo-lift" l={26} t={20} w={48} h={68} d={40}>{balloon}</V>
        <L c="g41-hlo-ring" l={12} t={12} w={76} h={76} d={280} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
        <L c="g41-hlo-dog" l={6} t={40} w={10} h={10} d={490} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hitside" l={28} t={16} w={44} h={62} d={0}>{balloon}</V>
        <L c="g41-hlo-ring" l={14} t={14} w={72} h={72} d={160} st={{ borderRadius: "50%", border: "2px solid #9fd0f0" }} />
        <L c="g41-hit2" l={44} t={44} w={12} h={12} d={280} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(159,208,240,0.22)" /><Rim tone="rgba(255,244,214,0.2)" d={620} /></>}>
      <L c="g41-castshadow" l={44} t={55} w={14} h={2.6} d={70} st={{ borderRadius: "999px", background: "rgba(22,40,58,0.6)" }} />
      <V c="g41-hlo-lift" l={45} t={38} w={11} h={16} d={170}>{balloon}</V>
      <L c="g41-hlo-ring" l={35} t={31} w={30} h={30} d={360} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      <L c="g41-hlo-dog" l={32} t={43} w={5} h={5} d={520} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      <L c="g41-hlo-dog" l={63} t={43} w={5} h={5} d={600} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      <L c="g41-hlo-arc" l={38} t={26} w={24} h={10} d={720} st={{ borderRadius: "999px", borderTop: "2px solid #9fd0f0" }} />
    </Lead>
  );
}

/* --- 6. Circling Vultures (t4) — THE WHEELING SHADOWS ------------------------
   Nothing lands: it is the SHADOWS that arrive. Wings cross a low sun and their
   shapes wheel over the square, tightening, while the light between them dims.
   Palette: #d8b98a / #fff3dc / #1a140c. */
const VLT_WING = "M2 13.6c4.6-1.4 7.4-4 9.8-8.2 1.6 4.6 5 7 10.2 6.4-3.4 5-8.8 8.2-14 7-2.8-.6-5.4-2.6-6-5.2z";

function CirclingVulturesScene({ role, delayMs }: SceneProps) {
  const wing = (fill: string) => <path d={VLT_WING} fill={fill} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g41-vlt-dim" l={0} t={0} w={100} h={100} d={40} st={{ background: "radial-gradient(circle at 50% 40%, rgba(26,20,12,0.6), transparent 72%)" }} />
        <V c="g41-vlt-wheel" l={16} t={24} w={44} h={30} d={230}>{wing("#1a140c")}</V>
        <V c="g41-ent-mote" l={48} t={50} w={34} h={24} d={470}>{wing("#d8b98a")}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g41-vlt-dim" l={8} t={8} w={84} h={84} d={0} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(26,20,12,0.7), transparent 70%)" }} />
        <V c="g41-hitside" l={16} t={26} w={68} h={44} d={150}>{wing("#1a140c")}</V>
        <L c="g41-hit2" l={44} t={44} w={12} h={12} d={290} st={{ borderRadius: "50%", background: "#d8b98a" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(216,185,138,0.2)" /><Rim tone="rgba(26,20,12,0.34)" d={560} /></>}>
      <L c="g41-vlt-dim" l={34} t={34} w={32} h={32} d={90} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(26,20,12,0.62), transparent 72%)" }} />
      {[0, 1, 2].map((i) => (
        <P key={i} l={34} t={34} w={32} h={32} rot={`${i * 120}deg`}>
          <V c="g41-vlt-wheel" l={4} t={12} w={40} h={26} d={240 + i * 130}>{wing("#1a140c")}</V>
        </P>
      ))}
      <L c="g41-ray" l={52} t={44} w={22} h={6} d={520} st={{ background: "linear-gradient(90deg, rgba(255,243,220,0.5), transparent)", transformOrigin: "0% 50%" }} />
      <V c="g41-vlt-close" l={42} t={42} w={16} h={16} d={660}>
        <circle cx="12" cy="12" r="9.6" fill="none" stroke="#d8b98a" strokeWidth="1.6" strokeDasharray="3.4 3" />
      </V>
      <V c="g41-vlt-perch" l={46} t={46} w={8} h={8} d={780}>{wing("#d8b98a")}</V>
    </Lead>
  );
}

/* --- 7. Lighthouse Beam (t5) — THE DIOPTRIC BELTS ----------------------------
   The tower stands on the cast square; the Fresnel belts stack and catch, the
   lamp strikes, and the wedge sweeps out down the real vector. Palette:
   #ffd28c / #fff4d6 / #1b2436. */
function LighthouseBeamScene({ role, delayMs }: SceneProps) {
  const tower = (
    <g {...SJ}>
      <path d="M8.6 22V10h6.8v12z" fill="#1b2436" stroke="#ffd28c" strokeWidth="1.2" />
      <path d="M7.4 10h9.2l-1.2-2.6H8.6z" fill="#ffd28c" />
      <path d="M9.4 3.4h5.2v4.2H9.4z" fill="#fff4d6" stroke="#1b2436" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-ent-rise" l={30} t={14} w={40} h={72} d={40}>{tower}</V>
        <L c="g41-lgh-belt" l={30} t={26} w={40} h={4} d={250} st={{ borderRadius: "999px", background: "#ffd28c" }} />
        <L c="g41-lgh-sweep" l={50} t={26} w={46} h={16} d={470} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.8), transparent)", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g41-lgh-belt" l={24} t={40} w={52} h={5} d={0} st={{ borderRadius: "999px", background: "#ffd28c" }} />
        <L c="g41-hitside" l={-6} t={44} w={112} h={10} d={150} st={{ background: "linear-gradient(90deg, transparent, #fff4d6, transparent)" }} />
        <L c="g41-hit2" l={44} t={42} w={12} h={12} d={290} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <SplitLead
      d={delayMs}
      frame={<><Wash tone="rgba(255,210,140,0.22)" /><Rim tone="rgba(255,244,214,0.26)" d={600} /></>}
      cast={
        <>
          <L c="g41-castshadow" l={42} t={55} w={18} h={3} d={80} st={{ borderRadius: "999px", background: "rgba(27,36,54,0.6)" }} />
          <V c="g41-lgh-tower" l={45} t={36} w={10} h={18} d={160}>{tower}</V>
          {[0, 1].map((i) => (
            <L key={i} c="g41-lgh-belt" l={44.4} t={39 + i * 2} w={11.2} h={1.4} d={300 + i * 120}
              st={{ borderRadius: "999px", background: "#ffd28c" }} />
          ))}
          <L c="g41-lgh-lamp" l={47.4} t={38} w={5} h={5} d={520} st={{ borderRadius: "50%", background: "#fff4d6" }} />
        </>
      }
      aim={
        <>
          <L c="g41-lgh-sweep" l={50} t={44} w={30} h={12} d={560} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.75), transparent)", transformOrigin: "0% 50%" }} />
          <L c="g41-throw" l={50} t={49.4} w={30} h={1.2} d={700} st={{ background: "linear-gradient(90deg, #ffd28c, rgba(255,210,140,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
        </>
      }
    />
  );
}

/* --- 8. Queen's Gambol (t5) — THE STROBE EXPOSURE ----------------------------
   A flash head charges and fires three times: the queen's leap is frozen as
   three overlapping exposures, the last one solid, with the plate's afterglow
   bleeding off. Palette: #f0a6c8 / #fff2dc / #2a1424. */
function QueensGambolScene({ role, delayMs }: SceneProps) {
  const q = (op: string) => <path d={QUEEN} fill="#f0a6c8" opacity={op} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g41-stb-charge" l={30} t={30} w={40} h={40} d={40} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(240,166,200,0.8), transparent 70%)" }} />
        <V c="g41-stb-freeze" l={18} t={22} w={40} h={56} d={250}>{q("0.5")}</V>
        <V c="g41-ent-pop" l={44} t={26} w={40} h={56} d={470}>{q("1")}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g41-stb-charge" l={26} t={26} w={48} h={48} d={0} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,220,0.85), transparent 68%)" }} />
        <V c="g41-hitside" l={24} t={18} w={52} h={64} d={150}>{q("1")}</V>
        <L c="g41-hit2" l={40} t={70} w={20} h={4} d={290} st={{ borderRadius: "999px", background: "#f0a6c8" }} />
      </Cut>
    );
  }
  return (
    <SplitLead
      d={delayMs}
      frame={<><Wash tone="rgba(240,166,200,0.22)" /><Rim tone="rgba(255,242,220,0.2)" d={620} /></>}
      cast={
        <>
          <L c="g41-stb-charge" l={40} t={38} w={20} h={20} d={90} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,220,0.75), transparent 68%)" }} />
          <V c="g41-stb-head" l={44} t={40} w={12} h={12} d={230}>
            <path d="M4 8h16v8H4z" fill="#2a1424" stroke="#f0a6c8" strokeWidth="1.4" />
            <path d="M20 10.6l2.6-1.4v5.6L20 13.4z" fill="#fff2dc" />
          </V>
        </>
      }
      aim={
        <>
          {[0, 1, 2].map((i) => (
            <V key={i} c="g41-stb-freeze" l={49 + i * 8} t={44 + (i % 2 ? -4 : 3)} w={7} h={9} d={340 + i * 150}>
              {q(`${0.4 + i * 0.3}`)}
            </V>
          ))}
          <L c="g41-throw" l={50} t={49.4} w={30} h={1} d={700} st={{ background: "linear-gradient(90deg, #fff2dc, rgba(240,166,200,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
          <L c="g41-stb-plate" l={72} t={43} w={10} h={12} d={800} st={{ background: "rgba(240,166,200,0.5)" }} />
        </>
      }
    />
  );
}

/* --- 9. Raven Parliament (t5) — THE CATCHLIGHTS ------------------------------
   A rail settles across the square, ravens land on it as flat silhouettes, and
   one by one a single specular catchlight opens in each eye. Palette: #a8b8d0 /
   #fff3dc / #12141c. */
const RVN_BIRD = "M4 19c0-4.4 2-8.4 5-10.2l-1.6-3 4 1.6c3.4 0 6.4 2.6 7.6 6.2L22 14l-3.4 1.4c-.6 2.2-2 3.6-4 3.6z";

function RavenParliamentScene({ role, delayMs }: SceneProps) {
  const raven = <path d={RVN_BIRD} fill="#12141c" stroke="#a8b8d0" strokeWidth="0.9" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g41-rvn-rail" l={6} t={64} w={88} h={4} d={40} st={{ background: "#a8b8d0", transformOrigin: "0% 50%" }} />
        <V c="g41-rvn-land" l={22} t={26} w={52} h={44} d={260}>{raven}</V>
        <L c="g41-rvn-eye" l={54} t={40} w={7} h={7} d={480} st={{ borderRadius: "50%", background: "#fff3dc" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g41-rvn-rail" l={4} t={70} w={92} h={4} d={0} st={{ background: "#a8b8d0", transformOrigin: "0% 50%" }} />
        <V c="g41-hitside" l={18} t={22} w={64} h={52} d={150}>{raven}</V>
        <L c="g41-rvn-eye" l={54} t={38} w={9} h={9} d={290} st={{ borderRadius: "50%", background: "#fff3dc" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(168,184,208,0.2)" /><Rim tone="rgba(18,20,28,0.34)" d={600} /></>}>
      <L c="g41-rvn-rail" l={30} t={52} w={40} h={1.4} d={90} st={{ background: "#a8b8d0", transformOrigin: "0% 50%" }} />
      {[0, 1, 2, 3].map((i) => (
        <V key={i} c="g41-rvn-land" l={32 + i * 9.4} t={43} w={8} h={9} d={220 + i * 120}>{raven}</V>
      ))}
      <L c="g41-castshadow" l={32} t={54} w={36} h={2} d={520} st={{ borderRadius: "999px", background: "rgba(18,20,28,0.55)" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g41-rvn-eye" l={36.6 + i * 9.4} t={45.4} w={1.5} h={1.5} d={640 + i * 90} st={{ borderRadius: "50%", background: "#fff3dc" }} />
      ))}
      <V c="g41-rvn-caw" l={44} t={34} w={12} h={8} d={820}>
        <path d="M3 12h6l3-4 3 4h6" fill="none" stroke="#fff3dc" strokeWidth="1.4" {...SJ} />
      </V>
    </Lead>
  );
}

/* --- 10. Auditor's Ledger (t6) — THE LIGHT TABLE -----------------------------
   A ground-glass light table warms up under the boards, a ledger page is laid
   on it, and every entry that was written on the back shows straight through.
   Palette: #eddc9a / #fff4d6 / #221d10. */
function AuditorsLedgerScene({ role, delayMs }: SceneProps) {
  const page = (
    <g {...SJ}>
      <path d="M4 2.5h16v19H4z" fill="rgba(255,244,214,0.9)" stroke="#221d10" strokeWidth="1.1" />
      <path d="M6.6 7h10.8M6.6 10.4h10.8M6.6 13.8h7.4" stroke="#221d10" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g41-ltb-warm" l={8} t={20} w={84} h={60} d={40} st={{ background: "linear-gradient(180deg, rgba(237,220,154,0.85), rgba(237,220,154,0.15))" }} />
        <V c="g41-ent-drop" l={22} t={14} w={56} h={72} d={250}>{page}</V>
        <L c="g41-ltb-tick" l={62} t={40} w={12} h={12} d={480} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g41-ltb-warm" l={10} t={14} w={80} h={72} d={0} st={{ background: "rgba(237,220,154,0.55)" }} />
        <V c="g41-hitside" l={22} t={12} w={56} h={76} d={150}>{page}</V>
        <L c="g41-ltb-tick" l={58} t={54} w={14} h={14} d={290} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(237,220,154,0.26)" /><Rim tone="rgba(255,244,214,0.24)" d={620} /></>}>
      <L c="g41-ltb-warm" l={38} t={36} w={24} h={28} d={100} st={{ background: "linear-gradient(180deg, rgba(237,220,154,0.9), rgba(237,220,154,0.2))" }} />
      <V c="g41-ltb-lay" l={41} t={37} w={18} h={26} d={240} st={{ transformOrigin: "50% 100%" }}>{page}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g41-ltb-line" l={43} t={43 + i * 5} w={14} h={0.9} d={400 + i * 120} st={{ background: "#221d10", transformOrigin: "0% 50%" }} />
      ))}
      <L c="g41-ray" l={58} t={44} w={20} h={5} d={620} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.6), transparent)", transformOrigin: "0% 50%" }} />
      <L c="g41-ltb-tick" l={53} t={53} w={4} h={4} d={760} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 11. Court Procession (t6) — THE INDEX-MATCHED PANES ---------------------
   Three glass panes stand in the queen's road. Oil floods each one, its index
   matches, the pane goes invisible and the beam walks straight through where a
   moment ago it was refracted. Palette: #b7e4ee / #fff4d6 / #10262e. */
function CourtProcessionScene({ role, delayMs }: SceneProps) {
  const pane = (op: number) => (
    <g {...SJ} opacity={op}>
      <path d="M5 2.6h14v18.8H5z" fill="rgba(183,228,238,0.35)" stroke="#b7e4ee" strokeWidth="1.4" />
      <path d="M7.4 5.6l9 12.6" stroke="#fff4d6" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-ent-rise" l={12} t={16} w={36} h={68} d={40}>{pane(1)}</V>
        <V c="g41-gpn-vanish" l={46} t={16} w={36} h={68} d={260}>{pane(0.9)}</V>
        <L c="g41-gpn-pass" l={4} t={46} w={92} h={4} d={480} st={{ background: "linear-gradient(90deg, transparent, #fff4d6, transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-gpn-vanish" l={26} t={12} w={48} h={76} d={0}>{pane(1)}</V>
        <L c="g41-hitside" l={-4} t={46} w={108} h={4} d={150} st={{ background: "linear-gradient(90deg, transparent, #b7e4ee, transparent)" }} />
        <L c="g41-hit2" l={44} t={42} w={12} h={12} d={290} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(183,228,238,0.2)" /><Rim tone="rgba(255,244,214,0.2)" d={640} /></>}>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g41-gpn-stand" l={38 + i * 9} t={39} w={7} h={20} d={100 + i * 90}>{pane(1)}</V>
      ))}
      {[0, 1, 2].map((i) => (
        <V key={i} c="g41-gpn-vanish" l={38 + i * 9} t={39} w={7} h={20} d={360 + i * 120}>{pane(0.9)}</V>
      ))}
      <L c="g41-gpn-pass" l={34} t={48} w={38} h={1.6} d={640} st={{ background: "linear-gradient(90deg, transparent, #fff4d6, transparent)" }} />
      <V c="g41-gpn-queen" l={44} t={41} w={11} h={15} d={720}><path d={QUEEN} fill="#b7e4ee" /></V>
      <L c="g41-castshadow" l={38} t={58} w={24} h={2.4} d={800} st={{ borderRadius: "999px", background: "rgba(16,38,46,0.55)" }} />
    </Lead>
  );
}

/* --- 12. Shepherd's Watch (t6) — THE CAT'S EYES ------------------------------
   Retroreflective studs are pressed into the boards around the flock. When the
   light finds them they throw it straight back at whoever aimed it, and a low
   verge line joins them up. Palette: #b6f0a8 / #fff4d6 / #10240f. */
function ShepherdsWatchScene({ role, delayMs }: SceneProps) {
  const stud = (
    <g {...SJ}>
      <path d="M3 15.6c0-3 4-5.6 9-5.6s9 2.6 9 5.6v2.8H3z" fill="#10240f" stroke="#b6f0a8" strokeWidth="1.2" />
      <circle cx="8" cy="14.4" r="2" fill="#fff4d6" />
      <circle cx="16" cy="14.4" r="2" fill="#fff4d6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-ent-drop" l={20} t={30} w={60} h={44} d={40}>{stud}</V>
        <L c="g41-cye-back" l={30} t={40} w={40} h={8} d={260} st={{ background: "linear-gradient(90deg, #fff4d6, transparent)", transformOrigin: "0% 50%" }} />
        <L c="g41-cye-verge" l={6} t={76} w={88} h={2.6} d={480} st={{ background: "#b6f0a8", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hitside" l={22} t={34} w={56} h={40} d={0}>{stud}</V>
        <L c="g41-cye-back" l={50} t={44} w={44} h={6} d={150} st={{ background: "linear-gradient(90deg, #fff4d6, transparent)", transformOrigin: "0% 50%" }} />
        <L c="g41-hit2" l={44} t={70} w={12} h={12} d={290} st={{ borderRadius: "50%", background: "#b6f0a8" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(182,240,168,0.2)" /><Rim tone="rgba(255,244,214,0.2)" d={640} /></>}>
      <L c="g41-cye-verge" l={32} t={53} w={36} h={1} d={90} st={{ background: "#b6f0a8", transformOrigin: "0% 50%" }} />
      {[0, 1, 2, 3].map((i) => (
        <V key={i} c="g41-cye-press" l={33 + i * 9} t={48} w={6} h={6} d={220 + i * 110}>{stud}</V>
      ))}
      <L c="g41-ray" l={54} t={45} w={22} h={4} d={560} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.6), transparent)", transformOrigin: "0% 50%" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g41-cye-back" l={34.4 + i * 9} t={49.2} w={9} h={1.6} d={680 + i * 80} st={{ background: "linear-gradient(90deg, #fff4d6, transparent)", transformOrigin: "0% 50%" }} />
      ))}
      <V c="g41-cye-flock" l={43} t={41} w={9} h={9} d={840}><path d={PAWN} fill="#b6f0a8" /></V>
    </Lead>
  );
}

/* --- 13. King's Leap Year (t7) — THE GNOMON AND THE ANALEMMA -----------------
   A gnomon is set on the cast square; its bright spot walks the figure-of-eight
   a year makes, and one extra mark is chiselled in for the day that only comes
   round every fourth turn. Palette: #f5c76a / #fff4d6 / #251c0e. */
const GNO_DOTS = [
  [46, 40], [50, 37], [54, 40], [51, 44], [47, 48], [44, 52], [48, 55], [53, 52],
];

function KingsLeapYearScene({ role, delayMs }: SceneProps) {
  const gnomon = (
    <g {...SJ}>
      <path d="M4 21L19 4v17z" fill="#251c0e" stroke="#f5c76a" strokeWidth="1.3" />
      <path d="M4 21h16" stroke="#f5c76a" strokeWidth="1.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-ent-rise" l={18} t={26} w={56} h={52} d={40}>{gnomon}</V>
        <L c="g41-gno-spot" l={62} t={54} w={10} h={10} d={250} st={{ borderRadius: "50%", background: "#fff4d6" }} />
        <L c="g41-gno-cut" l={30} t={72} w={30} h={4} d={480} st={{ background: "#f5c76a", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hitside" l={20} t={24} w={56} h={54} d={0}>{gnomon}</V>
        <L c="g41-gno-spot" l={58} t={58} w={12} h={12} d={150} st={{ borderRadius: "50%", background: "#fff4d6" }} />
        <L c="g41-hit2" l={30} t={74} w={40} h={4} d={290} st={{ borderRadius: "999px", background: "#f5c76a" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(245,199,106,0.24)" /><Rim tone="rgba(255,244,214,0.24)" d={680} /></>}>
      <L c="g41-castshadow" l={42} t={54} w={20} h={3} d={80} st={{ borderRadius: "999px", background: "rgba(37,28,14,0.6)" }} />
      <V c="g41-gno-set" l={43} t={38} w={14} h={16} d={170}>{gnomon}</V>
      <L c="g41-ray" l={52} t={41} w={22} h={7} d={300} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.6), transparent)", transformOrigin: "0% 50%" }} />
      {GNO_DOTS.map(([x, y], i) => (
        <L key={i} c="g41-gno-spot" l={x} t={y} w={1.5} h={1.5} d={420 + i * 55} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
      <L c="g41-gno-cut" l={45} t={57} w={11} h={1.2} d={780} st={{ background: "#f5c76a", transformOrigin: "0% 50%" }} />
      <V c="g41-gno-king" l={45.5} t={45} w={9} h={9} d={840}><path d={KING} fill="#f5c76a" /></V>
      <L c="g41-glint" l={49} t={49} w={4} h={4} d={900} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 14. Borrowed Boots (t1) — THE CROSSED POLARIZERS ------------------------
   Two polarizing discs slide together over the square. While their axes agree
   the light runs; the second disc turns forty-five degrees and every diagonal
   path goes black. Palette: #9ab4d8 / #fff2dc / #141c2a. */
function BorrowedBootsScene({ role, delayMs }: SceneProps) {
  const disc = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="9.6" fill="rgba(154,180,216,0.25)" stroke="#9ab4d8" strokeWidth="1.4" />
      <path d="M5 12h14M7 8h10M7 16h10" stroke="#9ab4d8" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-ent-rise" l={8} t={22} w={54} h={54} d={40}>{disc}</V>
        <V c="g41-pol-turn" l={38} t={26} w={54} h={54} d={260} st={{ transformOrigin: "50% 50%" }}>{disc}</V>
        <L c="g41-pol-black" l={30} t={30} w={44} h={44} d={480} st={{ borderRadius: "50%", background: "rgba(20,28,42,0.85)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hitside" l={14} t={14} w={72} h={72} d={0}>{disc}</V>
        <V c="g41-pol-turn" l={16} t={16} w={68} h={68} d={150} st={{ transformOrigin: "50% 50%" }}>{disc}</V>
        <L c="g41-pol-black" l={24} t={24} w={52} h={52} d={290} st={{ borderRadius: "50%", background: "rgba(20,28,42,0.85)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(154,180,216,0.2)" /><Rim tone="rgba(20,28,42,0.3)" d={560} /></>}>
      <V c="g41-pol-slide" l={38} t={38} w={16} h={16} d={90}>{disc}</V>
      <V c="g41-pol-turn" l={44} t={40} w={16} h={16} d={280} st={{ transformOrigin: "50% 50%" }}>{disc}</V>
      <L c="g41-ray" l={54} t={45} w={20} h={4} d={400} st={{ background: "linear-gradient(90deg, rgba(255,242,220,0.65), transparent)", transformOrigin: "0% 50%" }} />
      <L c="g41-pol-black" l={44} t={40} w={16} h={16} d={560} st={{ borderRadius: "50%", background: "rgba(20,28,42,0.86)" }} />
      <V c="g41-pol-boot" l={46} t={43} w={11} h={11} d={680}><path d={KING} fill="#fff2dc" /></V>
      <L c="g41-glint" l={51} t={45} w={3.4} h={3.4} d={780} st={{ borderRadius: "50%", background: "#fff2dc" }} />
    </Lead>
  );
}

/* --- 15. The Puddle (t1) — THE STILL WATER MIRROR ----------------------------
   A shallow pool spreads over the chosen square, holds a perfect upside-down
   sky for a moment, then one drop lands and the reflection folds into rings.
   Palette: #8fc9e8 / #fff2dc / #0e2230. */
function PuddleScene({ role, delayMs }: SceneProps) {
  const pool = (
    <path d="M2 13.4c0-3.4 4.4-5.6 10-5.6s10 2.2 10 5.6-4.4 5.8-10 5.8-10-2.4-10-5.8z"
      fill="rgba(143,201,232,0.5)" stroke="#8fc9e8" strokeWidth="1.2" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g41-pud-drop" l={46} t={4} w={8} h={14} d={40} st={{ borderRadius: "50%", background: "#fff2dc" }} />
        <V c="g41-pud-spread" l={10} t={38} w={80} h={46} d={250}>{pool}</V>
        <V c="g41-pud-flip" l={26} t={44} w={48} h={34} d={470}><path d={PAWN} fill="rgba(255,242,220,0.75)" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-pud-spread" l={8} t={36} w={84} h={48} d={0}>{pool}</V>
        <V c="g41-hitside" l={30} t={42} w={40} h={34} d={150}><path d={PAWN} fill="rgba(255,242,220,0.8)" /></V>
        <L c="g41-pud-ring" l={26} t={48} w={48} h={26} d={290} st={{ borderRadius: "50%", border: "2px solid #fff2dc" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(143,201,232,0.22)" /><Rim tone="rgba(14,34,48,0.28)" d={600} /></>}>
      <L c="g41-pud-drop" l={48} t={26} w={2.6} h={5} d={90} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      <V c="g41-pud-spread" l={38} t={44} w={24} h={14} d={240}>{pool}</V>
      <V c="g41-pud-flip" l={44} t={46} w={12} h={11} d={400}><path d={PAWN} fill="rgba(255,242,220,0.8)" /></V>
      <L c="g41-castshadow" l={40} t={53} w={20} h={2.4} d={520} st={{ borderRadius: "999px", background: "rgba(14,34,48,0.55)" }} />
      <L c="g41-pud-ring" l={40} t={45} w={20} h={11} d={660} st={{ borderRadius: "50%", border: "2px solid #fff2dc" }} />
      <L c="g41-pud-ring" l={43} t={46.4} w={14} h={8} d={780} st={{ borderRadius: "50%", border: "1px solid #8fc9e8" }} />
    </Lead>
  );
}

/* --- 16. Flinching Blades (t2) — THE DAZZLE GLINT ----------------------------
   A blade tips a hair, catches the light and throws a hard four-point dazzle
   straight into the eye; a green afterimage floats where the edge was and the
   hand pulls back. Palette: #f2e07a / #fff4d6 / #1e2410. */
function FlinchingBladesScene({ role, delayMs }: SceneProps) {
  const blade = (
    <g {...SJ}>
      <path d="M18.6 2.6L9 15.4l-2.4-1.8L16.4 1.6z" fill="#fff4d6" stroke="#1e2410" strokeWidth="1" />
      <path d="M8.4 15.8l-3 4.2 4.6-2.4z" fill="#f2e07a" />
    </g>
  );
  const star = (
    <path d="M12 1.4l1.9 8.7 8.7 1.9-8.7 1.9-1.9 8.7-1.9-8.7L1.4 12l8.7-1.9z" fill="#fff4d6" />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-gln-tip" l={18} t={16} w={58} h={58} d={40} st={{ transformOrigin: "80% 20%" }}>{blade}</V>
        <V c="g41-gln-star" l={24} t={22} w={52} h={52} d={260}>{star}</V>
        <L c="g41-gln-after" l={36} t={34} w={28} h={28} d={480} st={{ borderRadius: "50%", background: "rgba(242,224,122,0.5)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hitside" l={16} t={14} w={64} h={64} d={0}>{blade}</V>
        <V c="g41-gln-star" l={20} t={18} w={60} h={60} d={150}>{star}</V>
        <L c="g41-gln-after" l={34} t={32} w={32} h={32} d={290} st={{ borderRadius: "50%", background: "rgba(242,224,122,0.45)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(242,224,122,0.24)" /><Rim tone="rgba(255,244,214,0.26)" d={520} /></>}>
      <V c="g41-gln-tip" l={42} t={38} w={16} h={16} d={90} st={{ transformOrigin: "80% 20%" }}>{blade}</V>
      <V c="g41-gln-star" l={38} t={34} w={24} h={24} d={280}>{star}</V>
      <L c="g41-ray" l={53} t={44} w={24} h={5} d={380} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.75), transparent)", transformOrigin: "0% 50%" }} />
      <L c="g41-gln-after" l={44} t={42} w={12} h={12} d={560} st={{ borderRadius: "50%", background: "rgba(242,224,122,0.5)" }} />
      <V c="g41-gln-flinch" l={46} t={45} w={11} h={11} d={680}><path d={KNIGHT} fill="#f2e07a" /></V>
      <L c="g41-glint" l={40} t={50} w={3} h={3} d={780} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 17. Cold Shoulder (t3) — THE MIRROR TURNS ITS BACK ----------------------
   A standing mirror pivots on its post until only grey unsilvered backing faces
   the king. Whatever he brings up to it gets no reflection at all. Palette:
   #a9c6d4 / #fff2dc / #182530. */
function ColdShoulderScene({ role, delayMs }: SceneProps) {
  const face = (
    <g {...SJ}>
      <path d="M6 2.6h12v18.8H6z" fill="rgba(169,198,212,0.5)" stroke="#a9c6d4" strokeWidth="1.4" />
      <path d="M8.4 5.6l7.2 10.4" stroke="#fff2dc" strokeWidth="1" />
    </g>
  );
  const back = (
    <g {...SJ}>
      <path d="M6 2.6h12v18.8H6z" fill="#182530" stroke="#a9c6d4" strokeWidth="1.4" />
      <path d="M8 6h8M8 9h8M8 12h5" stroke="#a9c6d4" strokeWidth="0.8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-ent-rise" l={26} t={12} w={48} h={70} d={40}>{face}</V>
        <V c="g41-mbk-pivot" l={26} t={12} w={48} h={70} d={260} st={{ transformOrigin: "50% 50%" }}>{back}</V>
        <L c="g41-mbk-cold" l={16} t={70} w={68} h={12} d={480} st={{ background: "linear-gradient(180deg, rgba(169,198,212,0.6), transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hitside" l={28} t={10} w={44} h={72} d={0}>{face}</V>
        <V c="g41-mbk-pivot" l={28} t={10} w={44} h={72} d={150} st={{ transformOrigin: "50% 50%" }}>{back}</V>
        <L c="g41-hit2" l={44} t={44} w={12} h={12} d={290} st={{ borderRadius: "50%", background: "#a9c6d4" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(169,198,212,0.2)" /><Rim tone="rgba(24,37,48,0.32)" d={580} /></>}>
      <L c="g41-castshadow" l={41} t={56} w={20} h={2.6} d={80} st={{ borderRadius: "999px", background: "rgba(24,37,48,0.6)" }} />
      <V c="g41-mbk-stand" l={44} t={36} w={12} h={20} d={160}>{face}</V>
      <V c="g41-mbk-echo" l={46} t={40} w={8} h={11} d={300}><path d={KING} fill="rgba(255,242,220,0.7)" /></V>
      <V c="g41-mbk-pivot" l={44} t={36} w={12} h={20} d={460} st={{ transformOrigin: "50% 50%" }}>{back}</V>
      <L c="g41-mbk-cold" l={36} t={52} w={28} h={7} d={640} st={{ background: "linear-gradient(180deg, rgba(169,198,212,0.55), transparent)" }} />
      <V c="g41-mbk-turn" l={38} t={41} w={8} h={11} d={760}><path d={KING} fill="#a9c6d4" /></V>
    </Lead>
  );
}

/* --- 18. Shifting Floor (t3) — THE POOL CAUSTICS -----------------------------
   The rank the king stands on floods, and the net of caustics that rides the
   bottom of a pool crawls across it. Nothing solid: only bright seams that will
   not hold a foot. Palette: #8ee0d6 / #fff3dc / #0f2c2c. */
function ShiftingFloorScene({ role, delayMs }: SceneProps) {
  const net = (
    <g fill="none" stroke="#8ee0d6" strokeWidth="1.1" {...SJ}>
      <path d="M1 8c3-3.4 6-3.4 9 0s6 3.4 9 0 4-3.4 5 0" />
      <path d="M1 14c3-3.4 6-3.4 9 0s6 3.4 9 0 4-3.4 5 0" />
      <path d="M1 20c3-3.4 6-3.4 9 0s6 3.4 9 0 4-3.4 5 0" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g41-cau-flood" l={4} t={44} w={92} h={40} d={40} st={{ background: "linear-gradient(180deg, rgba(142,224,214,0.55), transparent)" }} />
        <V c="g41-cau-crawl" l={0} t={40} w={100} h={50} d={260} par="none">{net}</V>
        <L c="g41-cau-seam" l={14} t={72} w={72} h={2.4} d={480} st={{ background: "#fff3dc" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g41-cau-flood" l={0} t={30} w={100} h={50} d={0} st={{ background: "rgba(142,224,214,0.4)" }} />
        <V c="g41-hitside" l={0} t={30} w={100} h={50} d={150} par="none">{net}</V>
        <L c="g41-cau-seam" l={10} t={62} w={80} h={2.4} d={290} st={{ background: "#fff3dc" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(142,224,214,0.2)" />
          <L c="g41-cau-flood" l={0} t={37.5} w={100} h={12.5} d={120} st={{ background: "linear-gradient(180deg, rgba(142,224,214,0.5), rgba(142,224,214,0.12))" }} />
          <Rim tone="rgba(15,44,44,0.3)" d={620} />
        </>
      }
    >
      <V c="g41-cau-crawl" l={26} t={42} w={48} h={16} d={260} par="none">{net}</V>
      <L c="g41-cau-seam" l={30} t={49} w={40} h={0.9} d={420} st={{ background: "#fff3dc" }} />
      <L c="g41-ray" l={54} t={45} w={22} h={4} d={520} st={{ background: "linear-gradient(90deg, rgba(255,243,220,0.6), transparent)", transformOrigin: "0% 50%" }} />
      <V c="g41-cau-slip" l={45} t={42} w={10} h={13} d={660}><path d={ROOK} fill="#8ee0d6" /></V>
      <L c="g41-cau-glim" l={41} t={52} w={2} h={2} d={780} st={{ borderRadius: "50%", background: "#fff3dc" }} />
    </Lead>
  );
}

/* --- 19. Broken Compass (t4) — THE KALEIDOSCOPE ------------------------------
   Three mirrors meet at sixty degrees; the tube takes one quarter turn and the
   whole quadrant reshuffles. Whatever you were pointing at is now somewhere
   else. Palette: #e5a8f0 / #fff2dc / #26113a. */
function BrokenCompassScene({ role, delayMs }: SceneProps) {
  const wedge = (fill: string) => <path d="M12 12L2 3.6h20z" fill={fill} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-kal-tube" l={20} t={20} w={60} h={60} d={40}>
          <path d="M12 2.4L21.4 19H2.6z" fill="none" stroke="#e5a8f0" strokeWidth="1.8" />
        </V>
        <V c="g41-kal-turn" l={22} t={22} w={56} h={56} d={260} st={{ transformOrigin: "50% 50%" }}>{wedge("#e5a8f0")}</V>
        <L c="g41-kal-shuffle" l={34} t={34} w={32} h={32} d={480} st={{ background: "rgba(255,242,220,0.6)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hitside" l={18} t={18} w={64} h={64} d={0}>
          <path d="M12 2.4L21.4 19H2.6z" fill="none" stroke="#e5a8f0" strokeWidth="2" />
        </V>
        <V c="g41-kal-turn" l={24} t={24} w={52} h={52} d={150} st={{ transformOrigin: "50% 50%" }}>{wedge("#fff2dc")}</V>
        <L c="g41-hit2" l={44} t={44} w={12} h={12} d={290} st={{ borderRadius: "50%", background: "#e5a8f0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(229,168,240,0.22)" /><Rim tone="rgba(255,242,220,0.2)" d={620} /></>}>
      <V c="g41-kal-tube" l={40} t={40} w={20} h={20} d={100}>
        <path d="M12 2.4L21.4 19H2.6z" fill="none" stroke="#e5a8f0" strokeWidth="1.6" />
      </V>
      {[0, 1, 2, 3].map((i) => (
        <P key={i} l={38} t={38} w={24} h={24} rot={`${i * 90}deg`}>
          <V c="g41-kal-turn" w={100} h={100} d={280 + i * 90} st={{ transformOrigin: "50% 50%" }}>
            {wedge(i % 2 ? "#e5a8f0" : "rgba(255,242,220,0.75)")}
          </V>
        </P>
      ))}
      <L c="g41-kal-shuffle" l={42} t={42} w={16} h={16} d={620} st={{ background: "rgba(255,242,220,0.5)" }} />
      <L c="g41-ray" l={56} t={45} w={20} h={4} d={700} st={{ background: "linear-gradient(90deg, rgba(229,168,240,0.7), transparent)", transformOrigin: "0% 50%" }} />
      <V c="g41-kal-lost" l={46} t={45} w={9} h={9} d={800}><path d={KNIGHT} fill="#fff2dc" /></V>
    </Lead>
  );
}

/* --- 20. Moth Plague (t4) — THE BARE FILAMENT --------------------------------
   A naked bulb drops on its flex, the filament comes up orange, and every moth
   on the board is dragged into orbit around it, ticking off the glass. Palette:
   #ffca7a / #fff4d6 / #2a1c0c. */
function MothPlagueScene({ role, delayMs }: SceneProps) {
  const bulb = (
    <g {...SJ}>
      <path d="M12 2.6c3.6 0 6 2.8 6 6.2 0 2.6-1.6 4-2.6 5.4H8.6C7.6 12.8 6 11.4 6 8.8c0-3.4 2.4-6.2 6-6.2z" fill="rgba(255,202,122,0.35)" stroke="#ffca7a" strokeWidth="1.3" />
      <path d="M9.6 15.4h4.8v3.2H9.6z" fill="#2a1c0c" stroke="#ffca7a" strokeWidth="1" />
      <path d="M10 10.8l2-3.4 2 3.4" fill="none" stroke="#fff4d6" strokeWidth="1.2" />
    </g>
  );
  const moth = <path d="M12 12L4 6.6 6.6 12 4 17.4zM12 12l8-5.4L17.4 12 20 17.4z" fill="#2a1c0c" stroke="#ffca7a" strokeWidth="0.8" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-blb-drop" l={30} t={8} w={40} h={56} d={40} st={{ transformOrigin: "50% 0%" }}>{bulb}</V>
        <L c="g41-blb-fil" l={40} t={30} w={20} h={20} d={260} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 70%)" }} />
        <V c="g41-blb-orbit" l={54} t={54} w={30} h={30} d={480}>{moth}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hitside" l={30} t={10} w={40} h={58} d={0}>{bulb}</V>
        <L c="g41-blb-fil" l={38} t={28} w={24} h={24} d={150} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 70%)" }} />
        <V c="g41-blb-orbit" l={24} t={48} w={34} h={34} d={290}>{moth}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(255,202,122,0.24)" /><Rim tone="rgba(42,28,12,0.3)" d={620} /></>}>
      <L c="g41-blb-flex" l={49.4} t={26} w={0.8} h={14} d={90} st={{ background: "#ffca7a", transformOrigin: "50% 0%" }} />
      <V c="g41-blb-drop" l={45} t={38} w={10} h={14} d={200} st={{ transformOrigin: "50% 0%" }}>{bulb}</V>
      <L c="g41-blb-fil" l={45} t={39} w={10} h={10} d={360} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 68%)" }} />
      {[0, 1, 2].map((i) => (
        <P key={i} l={38} t={36} w={24} h={24} rot={`${i * 120}deg`}>
          <V c="g41-blb-orbit" l={0} t={38} w={26} h={26} d={480 + i * 120}>{moth}</V>
        </P>
      ))}
      <L c="g41-ray" l={54} t={44} w={20} h={6} d={700} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.5), transparent)", transformOrigin: "0% 50%" }} />
      <L c="g41-blb-tick" l={47} t={44} w={3} h={3} d={800} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 21. Waste Not (t5) — THE IRIS DIAPHRAGM ---------------------------------
   A meter needle swings, reads the scene, and the aperture blades walk shut
   until only the smallest, cheapest opening is left. Palette: #cfe07a /
   #fff4d6 / #1f2a10. */
const IRS_BLADES = [0, 60, 120, 180, 240, 300];

function WasteNotScene({ role, delayMs }: SceneProps) {
  const blade = <path d="M12 12L2.6 6.6 12 1.2z" fill="#cfe07a" stroke="#1f2a10" strokeWidth="0.7" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-irs-needle" l={20} t={20} w={60} h={60} d={40} st={{ transformOrigin: "50% 90%" }}>
          <path d="M12 22V5" stroke="#cfe07a" strokeWidth="2" {...SJ} />
        </V>
        <V c="g41-irs-close" l={24} t={24} w={52} h={52} d={260} st={{ transformOrigin: "50% 50%" }}>{blade}</V>
        <L c="g41-irs-stop" l={42} t={42} w={16} h={16} d={480} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hitside" l={18} t={18} w={64} h={64} d={0}><circle cx="12" cy="12" r="9.6" fill="none" stroke="#cfe07a" strokeWidth="2" /></V>
        <V c="g41-irs-close" l={22} t={22} w={56} h={56} d={150} st={{ transformOrigin: "50% 50%" }}>{blade}</V>
        <L c="g41-irs-stop" l={44} t={44} w={12} h={12} d={290} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(207,224,122,0.22)" /><Rim tone="rgba(255,244,214,0.2)" d={640} /></>}>
      <V c="g41-irs-needle" l={41} t={34} w={18} h={18} d={100} st={{ transformOrigin: "50% 90%" }}>
        <path d="M12 22V5" stroke="#cfe07a" strokeWidth="2" {...SJ} />
        <path d="M3 22h18" stroke="#1f2a10" strokeWidth="1.4" {...SJ} />
      </V>
      {IRS_BLADES.map((a, i) => (
        <P key={a} l={40} t={38} w={20} h={20} rot={`${a}deg`}>
          <V c="g41-irs-close" w={100} h={100} d={280 + i * 70} st={{ transformOrigin: "50% 50%" }}>{blade}</V>
        </P>
      ))}
      <L c="g41-ray" l={56} t={45} w={18} h={3} d={620} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.7), transparent)", transformOrigin: "0% 50%" }} />
      <L c="g41-irs-stop" l={48} t={46} w={4} h={4} d={720} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      <V c="g41-irs-cheap" l={46} t={49} w={8} h={8} d={820}><path d={PAWN} fill="#cfe07a" /></V>
    </Lead>
  );
}

/* --- 22. Quagmire March (t6) — THE MIRAGE LAYER ------------------------------
   Hot air lies over your half in a slab. The horizon peels up off it, an
   inverted band of board floats above the real one, and everything that walks
   in wades through the shimmer. Palette: #e0b66e / #fff3dc / #2d1f0c. */
function QuagmireMarchScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g41-mrg-slab" l={0} t={54} w={100} h={22} d={40} st={{ background: "linear-gradient(180deg, rgba(224,182,110,0.7), transparent)" }} />
        <L c="g41-mrg-peel" l={6} t={40} w={88} h={16} d={260} st={{ background: "linear-gradient(180deg, transparent, rgba(255,243,220,0.75))" }} />
        <V c="g41-mrg-wade" l={34} t={52} w={32} h={40} d={480}><path d={PAWN} fill="#2d1f0c" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g41-mrg-slab" l={0} t={48} w={100} h={30} d={0} st={{ background: "linear-gradient(180deg, rgba(224,182,110,0.6), transparent)" }} />
        <V c="g41-hitside" l={30} t={30} w={40} h={48} d={150}><path d={PAWN} fill="#2d1f0c" /></V>
        <L c="g41-mrg-peel" l={8} t={26} w={84} h={14} d={290} st={{ background: "linear-gradient(180deg, transparent, rgba(255,243,220,0.7))" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(224,182,110,0.2)" />
          <Half tone="rgba(224,182,110,0.34)" d={110} />
          <Rim tone="rgba(45,31,12,0.28)" d={640} />
        </>
      }
    >
      <L c="g41-mrg-slab" l={26} t={48} w={48} h={12} d={220} st={{ background: "linear-gradient(180deg, rgba(224,182,110,0.7), transparent)" }} />
      <L c="g41-mrg-peel" l={28} t={41} w={44} h={7} d={380} st={{ background: "linear-gradient(180deg, transparent, rgba(255,243,220,0.7))" }} />
      <L c="g41-ray" l={54} t={46} w={22} h={4} d={500} st={{ background: "linear-gradient(90deg, rgba(255,243,220,0.55), transparent)", transformOrigin: "0% 50%" }} />
      <V c="g41-mrg-wade" l={44} t={44} w={11} h={14} d={640}><path d={ROOK} fill="#2d1f0c" /></V>
      <L c="g41-mrg-drag" l={40} t={56} w={20} h={2} d={780} st={{ borderRadius: "999px", background: "rgba(45,31,12,0.6)" }} />
    </Lead>
  );
}

/* --- 23. Veil of Moths (t7) — THE SOAP FILM ----------------------------------
   A film is drawn across your half on a wire loop. Interference bands crawl
   down it as it thins, the black spot opens at the top, and then it pops and
   the whole veil goes at once. Palette: #b8e0f0 / #fff3dc / #201638. */
function VeilOfMothsScene({ role, delayMs }: SceneProps) {
  const bands = "linear-gradient(180deg, rgba(184,224,240,0.7), rgba(255,243,220,0.5), rgba(32,22,56,0.5), rgba(184,224,240,0.6))";
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-sfm-loop" l={16} t={16} w={68} h={68} d={40}>
          <circle cx="12" cy="12" r="9.6" fill="none" stroke="#b8e0f0" strokeWidth="1.8" />
        </V>
        <L c="g41-sfm-band" l={22} t={22} w={56} h={56} d={260} st={{ borderRadius: "50%", background: bands }} />
        <L c="g41-sfm-pop" l={30} t={30} w={40} h={40} d={480} st={{ borderRadius: "50%", border: "2px solid #fff3dc" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g41-sfm-band" l={14} t={14} w={72} h={72} d={0} st={{ borderRadius: "50%", background: bands }} />
        <V c="g41-hitside" l={16} t={16} w={68} h={68} d={150}>
          <circle cx="12" cy="12" r="9.6" fill="none" stroke="#b8e0f0" strokeWidth="2" />
        </V>
        <L c="g41-sfm-pop" l={28} t={28} w={44} h={44} d={290} st={{ borderRadius: "50%", border: "2px solid #fff3dc" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(184,224,240,0.2)" />
          <Half tone="rgba(184,224,240,0.3)" d={120} />
          <Rim tone="rgba(32,22,56,0.3)" d={720} />
        </>
      }
    >
      <V c="g41-sfm-loop" l={36} t={34} w={28} h={28} d={180}>
        <circle cx="12" cy="12" r="10" fill="none" stroke="#b8e0f0" strokeWidth="1.4" />
      </V>
      <L c="g41-sfm-band" l={38} t={36} w={24} h={24} d={320} st={{ borderRadius: "50%", background: bands }} />
      <L c="g41-sfm-black" l={44} t={36} w={12} h={6} d={480} st={{ borderRadius: "999px", background: "rgba(32,22,56,0.8)" }} />
      <V c="g41-sfm-moth" l={44} t={42} w={10} h={10} d={600}>
        <path d="M12 12L4 6.6 6.6 12 4 17.4zM12 12l8-5.4L17.4 12 20 17.4z" fill="#201638" stroke="#b8e0f0" strokeWidth="0.8" {...SJ} />
      </V>
      <L c="g41-sfm-pop" l={34} t={32} w={32} h={32} d={760} st={{ borderRadius: "50%", border: "2px solid #fff3dc" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g41-sfm-drop" l={40 + i * 8} t={50} w={1.6} h={1.6} d={840 + i * 90} st={{ borderRadius: "50%", background: "#fff3dc" }} />
      ))}
    </Lead>
  );
}

/* --- 24. Sated Blades (t8) — THE BURNING LENS --------------------------------
   A plano-convex lens is racked down until the cone comes to a point. The point
   chars, smokes, and burns one hole clean through; then the lens is lifted and
   nothing is hot any more. Palette: #ff9a52 / #fff4d6 / #2a1206. */
function SatedBladesScene({ role, delayMs }: SceneProps) {
  const lens = (
    <path d="M2 12c4-5.6 16-5.6 20 0-4 5.6-16 5.6-20 0z" fill="rgba(255,244,214,0.35)" stroke="#ff9a52" strokeWidth="1.4" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-ent-drop" l={12} t={16} w={76} h={34} d={40}>{lens}</V>
        <L c="g41-brn-cone" l={30} t={38} w={40} h={34} d={260} st={{ background: "linear-gradient(180deg, rgba(255,154,82,0.6), rgba(255,244,214,0.9))", clipPath: "polygon(0 0, 100% 0, 56% 100%, 44% 100%)" }} />
        <L c="g41-brn-char" l={42} t={70} w={16} h={16} d={480} st={{ borderRadius: "50%", background: "#2a1206" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hitside" l={10} t={14} w={80} h={30} d={0}>{lens}</V>
        <L c="g41-brn-cone" l={28} t={34} w={44} h={38} d={150} st={{ background: "linear-gradient(180deg, rgba(255,154,82,0.55), rgba(255,244,214,0.9))", clipPath: "polygon(0 0, 100% 0, 56% 100%, 44% 100%)" }} />
        <L c="g41-brn-char" l={42} t={68} w={16} h={16} d={290} st={{ borderRadius: "50%", background: "#2a1206" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(255,154,82,0.26)" /><Rim tone="rgba(42,18,6,0.34)" d={780} /></>}>
      <L c="g41-castshadow" l={40} t={54} w={22} h={3} d={80} st={{ borderRadius: "999px", background: "rgba(42,18,6,0.6)" }} />
      <V c="g41-brn-rack" l={40} t={33} w={20} h={9} d={190}>{lens}</V>
      <L c="g41-brn-cone" l={43} t={39} w={14} h={13} d={340} st={{ background: "linear-gradient(180deg, rgba(255,154,82,0.55), rgba(255,244,214,0.95))", clipPath: "polygon(0 0, 100% 0, 54% 100%, 46% 100%)" }} />
      <L c="g41-brn-point" l={48.6} t={50} w={2.8} h={2.8} d={520} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      <L c="g41-brn-char" l={47} t={50.6} w={6} h={2.4} d={640} st={{ borderRadius: "50%", background: "#2a1206" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g41-brn-smoke" l={48 + i * 1.6} t={48} w={2.2} h={2.2} d={760 + i * 130} st={{ borderRadius: "50%", background: "rgba(42,18,6,0.7)" }} />
      ))}
      <V c="g41-brn-spent" l={45} t={44} w={9} h={9} d={900}><path d={KNIGHT} fill="#ff9a52" /></V>
    </Lead>
  );
}

/* --- 25. Severed Lines (t8) — THE CUT FIBRE BUNDLE ---------------------------
   A bundle of light pipes runs the enemy's supply road. Shears close on it, the
   glass parts, and the light that was travelling inside sprays out of both raw
   ends and dies. Palette: #7ce8c4 / #fff3dc / #0d2c26. */
function SeveredLinesScene({ role, delayMs }: SceneProps) {
  const shears = (
    <g fill="none" stroke="#7ce8c4" strokeWidth="1.7" {...SJ}>
      <path d="M4 3.4l12 12.4M20 3.4L8 15.8" />
      <circle cx="6.4" cy="19" r="2.6" />
      <circle cx="17.6" cy="19" r="2.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g41-fbr-pipe" l={4} t={44} w={92} h={5} d={40} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #0d2c26, #7ce8c4, #0d2c26)" }} />
        <V c="g41-fbr-shear" l={26} t={12} w={48} h={62} d={260}>{shears}</V>
        <L c="g41-fbr-spray" l={44} t={40} w={14} h={14} d={480} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff3dc, transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g41-fbr-pipe" l={-4} t={46} w={108} h={6} d={0} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #0d2c26, #7ce8c4, #0d2c26)" }} />
        <V c="g41-hitside" l={26} t={14} w={48} h={60} d={150}>{shears}</V>
        <L c="g41-fbr-spray" l={42} t={40} w={16} h={16} d={290} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff3dc, transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <SplitLead
      d={delayMs}
      frame={<><Wash tone="rgba(124,232,196,0.2)" /><Rim tone="rgba(13,44,38,0.34)" d={780} /></>}
      cast={
        <>
          <V c="g41-fbr-shear" l={43} t={33} w={14} h={18} d={210}>{shears}</V>
          <L c="g41-fbr-spray" l={46} t={45} w={8} h={8} d={520} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff3dc, transparent 68%)" }} />
          <L c="g41-castshadow" l={42} t={55} w={18} h={2.6} d={860} st={{ borderRadius: "999px", background: "rgba(13,44,38,0.6)" }} />
        </>
      }
      aim={
        <>
          {[0, 1, 2].map((i) => (
            <L key={i} c="g41-fbr-pipe" l={22} t={47.4 + i * 1.8} w={56} h={0.9} d={90 + i * 90}
              st={{ borderRadius: "999px", background: "linear-gradient(90deg, rgba(124,232,196,0), #7ce8c4, rgba(124,232,196,0))" }} />
          ))}
          <L c="g41-throw" l={50} t={49.4} w={28} h={1.2} d={400} st={{ background: "linear-gradient(90deg, #fff3dc, rgba(124,232,196,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
          <L c="g41-fbr-bleed" l={52} t={46} w={6} h={6} d={660} st={{ borderRadius: "50%", background: "#fff3dc" }} />
          <L c="g41-fbr-dark" l={58} t={46} w={22} h={5} d={800} st={{ background: "linear-gradient(90deg, rgba(13,44,38,0.8), transparent)", transformOrigin: "0% 50%" }} />
        </>
      }
    />
  );
}

/* --- 26. Carbon Copy (t1) — PEPPER'S GHOST -----------------------------------
   A half-silvered pane tips up at forty-five degrees, and a card that is not
   there at all stands up in it: the reflection of what is hidden below the
   stage. Palette: #cfd8f0 / #fff2dc / #1a1c30. */
function CarbonCopyScene({ role, delayMs }: SceneProps) {
  const card = (fill: string, op: number) => (
    <g {...SJ} opacity={op}>
      <path d="M6 2.6h12v18.8H6z" fill={fill} stroke="#1a1c30" strokeWidth="1.2" />
      <path d="M8.4 6.4h7.2M8.4 9.6h7.2M8.4 12.8h4.6" stroke="#1a1c30" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g41-ppr-pane" l={16} t={20} w={68} h={54} d={40} st={{ background: "linear-gradient(135deg, rgba(207,216,240,0.45), rgba(255,242,220,0.12))" }} />
        <V c="g41-ent-rise" l={12} t={30} w={38} h={56} d={260}>{card("#cfd8f0", 1)}</V>
        <V c="g41-ppr-ghost" l={50} t={22} w={38} h={56} d={480}>{card("#fff2dc", 0.6)}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g41-ppr-pane" l={12} t={16} w={76} h={64} d={0} st={{ background: "linear-gradient(135deg, rgba(207,216,240,0.45), rgba(255,242,220,0.12))" }} />
        <V c="g41-hitside" l={22} t={18} w={44} h={62} d={150}>{card("#cfd8f0", 1)}</V>
        <V c="g41-ppr-ghost" l={44} t={22} w={40} h={58} d={290}>{card("#fff2dc", 0.55)}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(207,216,240,0.2)" /><Rim tone="rgba(26,28,48,0.3)" d={560} /></>}>
      <L c="g41-ppr-pane" l={40} t={36} w={22} h={22} d={100} st={{ background: "linear-gradient(135deg, rgba(207,216,240,0.4), rgba(255,242,220,0.1))", transformOrigin: "50% 100%" }} />
      <V c="g41-ppr-hidden" l={42} t={50} w={10} h={13} d={260}>{card("#cfd8f0", 1)}</V>
      <L c="g41-ray" l={52} t={45} w={20} h={3} d={380} st={{ background: "linear-gradient(90deg, rgba(255,242,220,0.6), transparent)", transformOrigin: "0% 50%" }} />
      <V c="g41-ppr-ghost" l={49} t={37} w={10} h={13} d={520}>{card("#fff2dc", 0.6)}</V>
      <L c="g41-glint" l={57} t={38} w={3.4} h={3.4} d={680} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      <L c="g41-castshadow" l={40} t={60} w={20} h={2.4} d={760} st={{ borderRadius: "999px", background: "rgba(26,28,48,0.6)" }} />
    </Lead>
  );
}

/* --- 27. Mirror Shield (t1) — THE BEAM ROUND THE CORNER ----------------------
   A flat mirror is set at an angle on the cast square. The blow comes in, meets
   the silver, and leaves again at exactly the angle it arrived, going somewhere
   nobody aimed. Palette: #a6e8ff / #fff4d6 / #12283a. */
function MirrorShieldScene({ role, delayMs }: SceneProps) {
  const plate = (
    <g {...SJ}>
      <path d="M3.4 20.6L20.6 3.4l2.4 2.4L5.8 23z" fill="rgba(166,232,255,0.55)" stroke="#a6e8ff" strokeWidth="1.3" />
      <path d="M6.8 17.2l9.6-9.6" stroke="#fff4d6" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-ent-rise" l={20} t={20} w={60} h={60} d={40}>{plate}</V>
        <L c="g41-msh-in" l={4} t={26} w={44} h={4} d={260} st={{ background: "linear-gradient(90deg, transparent, #fff4d6)", transformOrigin: "100% 50%" }} />
        <L c="g41-msh-out" l={52} t={62} w={44} h={4} d={480} st={{ background: "linear-gradient(90deg, #fff4d6, transparent)", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hitside" l={18} t={18} w={64} h={64} d={0}>{plate}</V>
        <L c="g41-msh-in" l={0} t={22} w={50} h={5} d={150} st={{ background: "linear-gradient(90deg, transparent, #fff4d6)", transformOrigin: "100% 50%" }} />
        <L c="g41-msh-out" l={50} t={66} w={50} h={5} d={290} st={{ background: "linear-gradient(90deg, #fff4d6, transparent)", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  return (
    <SplitLead
      d={delayMs}
      frame={<><Wash tone="rgba(166,232,255,0.22)" /><Rim tone="rgba(255,244,214,0.22)" d={620} /></>}
      cast={
        <>
          <V c="g41-msh-set" l={43} t={39} w={14} h={14} d={110}>{plate}</V>
          <L c="g41-msh-flash" l={45} t={41} w={10} h={10} d={480} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 68%)" }} />
          <L c="g41-castshadow" l={42} t={55} w={18} h={2.6} d={780} st={{ borderRadius: "999px", background: "rgba(18,40,58,0.6)" }} />
        </>
      }
      aim={
        <>
          <L c="g41-msh-in" l={22} t={48.6} w={28} h={2} d={280} st={{ background: "linear-gradient(90deg, transparent, #fff4d6)", transformOrigin: "100% 50%", borderRadius: "999px" }} />
          <L c="g41-throw" l={50} t={44} w={28} h={1.6} d={560} st={{ background: "linear-gradient(90deg, #a6e8ff, rgba(166,232,255,0))", transformOrigin: "0% 50%", borderRadius: "999px", rotate: "-38deg" }} />
          <L c="g41-msh-out" l={50} t={53} w={26} h={1.6} d={700} st={{ background: "linear-gradient(90deg, #fff4d6, rgba(166,232,255,0))", transformOrigin: "0% 50%", borderRadius: "999px", rotate: "34deg" }} />
        </>
      }
    />
  );
}

/* --- 28. Mirror Manners (t2) — THE HAND MIRROR -------------------------------
   A mirror on a handle is held up in front of them. Everything they raise, the
   image raises back, left for right; when they reach for the same move twice
   the glass simply refuses to copy it. Palette: #f0c8d8 / #fff2dc / #2a1622. */
function MirrorMannersScene({ role, delayMs }: SceneProps) {
  const hand = (
    <g {...SJ}>
      <ellipse cx="12" cy="8.6" rx="6.6" ry="6.4" fill="rgba(240,200,216,0.45)" stroke="#f0c8d8" strokeWidth="1.4" />
      <path d="M10.6 15.2h2.8V22h-2.8z" fill="#f0c8d8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hmr-raise" l={22} t={12} w={56} h={70} d={40} st={{ transformOrigin: "50% 96%" }}>{hand}</V>
        <V c="g41-hmr-copy" l={34} t={22} w={32} h={32} d={260}><path d={KNIGHT} fill="#fff2dc" /></V>
        <L c="g41-hmr-refuse" l={30} t={22} w={40} h={4} d={480} st={{ background: "#2a1622", transformOrigin: "50% 50%", rotate: "-24deg" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hitside" l={20} t={10} w={60} h={74} d={0}>{hand}</V>
        <V c="g41-hmr-copy" l={32} t={20} w={36} h={36} d={150}><path d={KNIGHT} fill="#fff2dc" /></V>
        <L c="g41-hmr-refuse" l={26} t={30} w={48} h={4} d={290} st={{ background: "#2a1622", transformOrigin: "50% 50%", rotate: "-24deg" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(240,200,216,0.22)" /><Rim tone="rgba(42,22,34,0.3)" d={560} /></>}>
      <V c="g41-hmr-raise" l={43} t={36} w={14} h={20} d={110} st={{ transformOrigin: "50% 96%" }}>{hand}</V>
      <V c="g41-hmr-real" l={36} t={42} w={9} h={9} d={280}><path d={KNIGHT} fill="#f0c8d8" /></V>
      <V c="g41-hmr-copy" l={45.6} t={39} w={9} h={9} d={420}><path d={KNIGHT} fill="#fff2dc" /></V>
      <L c="g41-ray" l={54} t={45} w={18} h={3} d={520} st={{ background: "linear-gradient(90deg, rgba(255,242,220,0.6), transparent)", transformOrigin: "0% 50%" }} />
      <L c="g41-hmr-refuse" l={44} t={41} w={12} h={1.4} d={680} st={{ background: "#2a1622", transformOrigin: "50% 50%", rotate: "-28deg" }} />
      <L c="g41-glint" l={53} t={38} w={3} h={3} d={780} st={{ borderRadius: "50%", background: "#fff2dc" }} />
    </Lead>
  );
}

/* --- 29. Twin Buttons (t4) — THE BEAMSPLITTER CUBE ---------------------------
   One beam goes into a cemented cube and two come out, identical, at right
   angles to each other. Each one lands as a pawn you can pocket. Palette:
   #96e0ff / #fff4d6 / #14283c. */
function TwinButtonsScene({ role, delayMs }: SceneProps) {
  const cube = (
    <g {...SJ}>
      <path d="M4 4h16v16H4z" fill="rgba(150,224,255,0.28)" stroke="#96e0ff" strokeWidth="1.4" />
      <path d="M4 20L20 4" stroke="#fff4d6" strokeWidth="1.3" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-ent-rise" l={26} t={26} w={48} h={48} d={40}>{cube}</V>
        <L c="g41-bsp-split" l={70} t={46} w={28} h={4} d={260} st={{ background: "linear-gradient(90deg, #fff4d6, transparent)", transformOrigin: "0% 50%" }} />
        <V c="g41-bsp-pawn" l={38} t={62} w={24} h={30} d={480}><path d={PAWN} fill="#96e0ff" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hitside" l={28} t={28} w={44} h={44} d={0}>{cube}</V>
        <L c="g41-bsp-split" l={68} t={46} w={32} h={4} d={150} st={{ background: "linear-gradient(90deg, #fff4d6, transparent)", transformOrigin: "0% 50%" }} />
        <V c="g41-bsp-pawn" l={36} t={64} w={28} h={32} d={290}><path d={PAWN} fill="#96e0ff" /></V>
      </Cut>
    );
  }
  return (
    <SplitLead
      d={delayMs}
      frame={<><Wash tone="rgba(150,224,255,0.22)" /><Rim tone="rgba(255,244,214,0.2)" d={620} /></>}
      cast={
        <>
          <V c="g41-bsp-cube" l={44} t={42} w={12} h={12} d={140}>{cube}</V>
          <V c="g41-bsp-pawn" l={41} t={52} w={7} h={9} d={620}><path d={PAWN} fill="#96e0ff" /></V>
          <V c="g41-bsp-pawn" l={52} t={52} w={7} h={9} d={740}><path d={PAWN} fill="#fff4d6" /></V>
        </>
      }
      aim={
        <>
          <L c="g41-throw" l={26} t={49.2} w={24} h={1.6} d={80} st={{ background: "linear-gradient(90deg, rgba(150,224,255,0), #fff4d6)", transformOrigin: "100% 50%", borderRadius: "999px" }} />
          <L c="g41-bsp-split" l={50} t={49.2} w={24} h={1.4} d={340} st={{ background: "linear-gradient(90deg, #fff4d6, rgba(150,224,255,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
          <L c="g41-bsp-split" l={50} t={49.2} w={24} h={1.4} d={460} st={{ background: "linear-gradient(90deg, #96e0ff, rgba(150,224,255,0))", transformOrigin: "0% 50%", borderRadius: "999px", rotate: "62deg" }} />
        </>
      }
    />
  );
}

/* --- 30. Hall of Mirrors, buff (t4) — THE INFINITE CORRIDOR ------------------
   Two mirrors face each other across the rank. The rook's image recedes down
   the corridor, gets smaller for ever, and steps out of the far end of the
   board where it went into this one. Palette: #c9b0f0 / #fff3dc / #1b1436. */
function HallOfMirrorsBuffScene({ role, delayMs }: SceneProps) {
  const frame = (op: number) => (
    <path d="M4 3.6h16v16.8H4z" fill="none" stroke="#c9b0f0" strokeWidth="1.5" opacity={op} {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-ent-rise" l={10} t={16} w={80} h={68} d={40}>{frame(1)}</V>
        <V c="g41-inf-recede" l={24} t={26} w={52} h={48} d={260}>{frame(0.7)}</V>
        <V c="g41-inf-emerge" l={54} t={40} w={34} h={34} d={480}><path d={ROOK} fill="#fff3dc" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hitside" l={12} t={14} w={76} h={72} d={0}>{frame(1)}</V>
        <V c="g41-inf-recede" l={26} t={26} w={48} h={48} d={150}>{frame(0.6)}</V>
        <V c="g41-inf-emerge" l={34} t={34} w={32} h={32} d={290}><path d={ROOK} fill="#fff3dc" /></V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(201,176,240,0.2)" /><Rim tone="rgba(255,243,220,0.24)" d={640} /></>}>
      <L c="g41-inf-wall" l={30} t={40} w={1.6} h={18} d={100} st={{ background: "linear-gradient(180deg, #c9b0f0, rgba(201,176,240,0.2))" }} />
      <L c="g41-inf-wall" l={68.4} t={40} w={1.6} h={18} d={200} st={{ background: "linear-gradient(180deg, #c9b0f0, rgba(201,176,240,0.2))" }} />
      {[0, 1, 2, 3].map((i) => (
        <V key={i} c="g41-inf-recede" l={44 - i * 1.6} t={42 - i * 1.2} w={12 + i * 3} h={14 + i * 3} d={320 + i * 100}>
          {frame(0.85 - i * 0.18)}
        </V>
      ))}
      <L c="g41-ray" l={56} t={46} w={16} h={3} d={700} st={{ background: "linear-gradient(90deg, rgba(255,243,220,0.6), transparent)", transformOrigin: "0% 50%" }} />
      <V c="g41-inf-emerge" l={66} t={44} w={9} h={11} d={800}><path d={ROOK} fill="#fff3dc" /></V>
    </Lead>
  );
}

/* --- 31. Duplicate Glitch (t5) — THE CHROMATIC FRINGE ------------------------
   The optic goes uncorrected: the card's image separates into its red, green
   and blue copies, each landing a fraction off the last, and one of them
   refuses to converge back. Palette: #ff7a9c / #7ae0ff / #221430. */
function DuplicateGlitchScene({ role, delayMs }: SceneProps) {
  const card = (fill: string) => (
    <path d="M5 2.6h14v18.8H5z" fill={fill} stroke="#221430" strokeWidth="1.1" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-ent-rise" l={26} t={16} w={48} h={68} d={40}>{card("#ff7a9c")}</V>
        <V c="g41-chr-red" l={20} t={18} w={48} h={68} d={260}>{card("rgba(255,122,156,0.7)")}</V>
        <V c="g41-chr-blue" l={32} t={14} w={48} h={68} d={480}>{card("rgba(122,224,255,0.7)")}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hitside" l={26} t={14} w={48} h={72} d={0}>{card("#ff7a9c")}</V>
        <V c="g41-chr-red" l={20} t={16} w={48} h={70} d={150}>{card("rgba(255,122,156,0.65)")}</V>
        <V c="g41-chr-blue" l={32} t={12} w={48} h={70} d={290}>{card("rgba(122,224,255,0.65)")}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(255,122,156,0.2)" /><Rim tone="rgba(122,224,255,0.2)" d={620} /></>}>
      <L c="g41-chr-lens" l={40} t={38} w={20} h={20} d={110} st={{ borderRadius: "50%", border: "2px solid rgba(122,224,255,0.7)" }} />
      <V c="g41-chr-core" l={45} t={41} w={10} h={14} d={280}>{card("#ff7a9c")}</V>
      <V c="g41-chr-red" l={43.4} t={42} w={10} h={14} d={420}>{card("rgba(255,122,156,0.65)")}</V>
      <V c="g41-chr-blue" l={46.6} t={40} w={10} h={14} d={540}>{card("rgba(122,224,255,0.65)")}</V>
      <L c="g41-ray" l={56} t={46} w={18} h={3} d={660} st={{ background: "linear-gradient(90deg, rgba(122,224,255,0.7), transparent)", transformOrigin: "0% 50%" }} />
      <L c="g41-chr-fringe" l={42} t={56} w={16} h={1.6} d={780} st={{ background: "linear-gradient(90deg, #ff7a9c, #7ae0ff)" }} />
    </Lead>
  );
}

/* --- 32. Ironglass Mirror (t5) — THE STRESS FRINGES --------------------------
   Every square you attack is cast into a slab of glass, and under crossed
   polars the strain in it blooms as coloured photoelastic fringes. The piece
   inside can be seen perfectly and cannot move at all. Palette: #7ad8f0 /
   #ffd88c / #16283a. */
function IronglassMirrorScene({ role, delayMs }: SceneProps) {
  const slab = (
    <g {...SJ}>
      <path d="M4 3h16v18H4z" fill="rgba(122,216,240,0.3)" stroke="#7ad8f0" strokeWidth="1.4" />
      <path d="M6.4 5.4l11.2 13.2" stroke="#ffd88c" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-ent-drop" l={22} t={14} w={56} h={72} d={40}>{slab}</V>
        <L c="g41-pht-fringe" l={30} t={30} w={40} h={40} d={260} st={{ borderRadius: "50%", background: "conic-gradient(#7ad8f0, #ffd88c, #16283a, #7ad8f0)" }} />
        <V c="g41-pht-lock" l={36} t={36} w={28} h={28} d={480}><path d={PAWN} fill="#ffd88c" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hitside" l={20} t={12} w={60} h={76} d={0}>{slab}</V>
        <L c="g41-pht-fringe" l={28} t={30} w={44} h={44} d={150} st={{ borderRadius: "50%", background: "conic-gradient(#7ad8f0, #ffd88c, #16283a, #7ad8f0)" }} />
        <V c="g41-pht-lock" l={36} t={36} w={28} h={28} d={290}><path d={PAWN} fill="#ffd88c" /></V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(122,216,240,0.22)" /><Rim tone="rgba(255,216,140,0.2)" d={640} /></>}>
      <L c="g41-pht-polar" l={38} t={36} w={24} h={24} d={110} st={{ background: "linear-gradient(45deg, rgba(22,40,58,0.6), transparent)" }} />
      <V c="g41-pht-cast" l={43} t={38} w={14} h={20} d={260}>{slab}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g41-pht-fringe" l={44 + i * 1.6} t={40 + i * 2} w={12 - i * 3} h={16 - i * 4} d={420 + i * 110}
          st={{ borderRadius: "50%", background: "conic-gradient(#7ad8f0, #ffd88c, #16283a, #7ad8f0)" }} />
      ))}
      <L c="g41-ray" l={57} t={46} w={17} h={3} d={720} st={{ background: "linear-gradient(90deg, rgba(255,216,140,0.7), transparent)", transformOrigin: "0% 50%" }} />
      <V c="g41-pht-lock" l={46} t={44} w={8} h={10} d={820}><path d={PAWN} fill="#ffd88c" /></V>
    </Lead>
  );
}

/* --- 33. Hall of Mirrors, hex (t6) — THE SHATTERED GLASS ---------------------
   One mirror breaks into a mosaic and every shard holds a DIFFERENT square. A
   knight looking for its own colour finds no shard anywhere that shows it.
   Palette: #d8e4f0 / #fff2dc / #1c2230. */
const SHD_SHARDS = [
  { l: 36, t: 34, w: 12, h: 14, r: -18 },
  { l: 50, t: 32, w: 10, h: 16, r: 12 },
  { l: 41, t: 46, w: 14, h: 12, r: 26 },
  { l: 56, t: 45, w: 9, h: 13, r: -30 },
  { l: 32, t: 47, w: 8, h: 11, r: 8 },
];

function HallOfMirrorsHexScene({ role, delayMs }: SceneProps) {
  const shard = (fill: string) => <path d="M3 21L9 2l12 6-5 13z" fill={fill} stroke="#1c2230" strokeWidth="1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g41-shd-crack" l={20} t={16} w={60} h={68} d={40} st={{ background: "linear-gradient(120deg, transparent 46%, #fff2dc 48%, transparent 52%)" }} />
        <V c="g41-shd-fly" l={16} t={22} w={40} h={52} d={260}>{shard("#d8e4f0")}</V>
        <V c="g41-shd-fly" l={48} t={30} w={34} h={46} d={480}>{shard("#fff2dc")}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g41-shd-crack" l={14} t={12} w={72} h={76} d={0} st={{ background: "linear-gradient(120deg, transparent 46%, #fff2dc 48%, transparent 52%)" }} />
        <V c="g41-hitside" l={18} t={20} w={44} h={56} d={150}>{shard("#d8e4f0")}</V>
        <V c="g41-shd-fly" l={48} t={30} w={36} h={48} d={290}>{shard("#fff2dc")}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(216,228,240,0.2)" /><Rim tone="rgba(28,34,48,0.32)" d={680} /></>}>
      <L c="g41-shd-plate" l={38} t={34} w={24} h={26} d={100} st={{ background: "linear-gradient(140deg, rgba(216,228,240,0.5), rgba(255,242,220,0.12))" }} />
      <L c="g41-shd-crack" l={38} t={34} w={24} h={26} d={240} st={{ background: "linear-gradient(120deg, transparent 45%, #fff2dc 47%, transparent 51%)" }} />
      {SHD_SHARDS.map((s, i) => (
        <P key={i} l={s.l} t={s.t} w={s.w} h={s.h} rot={`${s.r}deg`}>
          <V c="g41-shd-fly" w={100} h={100} d={380 + i * 90}>{shard(i % 2 ? "#d8e4f0" : "rgba(255,242,220,0.85)")}</V>
        </P>
      ))}
      <L c="g41-ray" l={58} t={46} w={16} h={3} d={780} st={{ background: "linear-gradient(90deg, rgba(255,242,220,0.6), transparent)", transformOrigin: "0% 50%" }} />
      <V c="g41-shd-stuck" l={45} t={44} w={9} h={11} d={860}><path d={KNIGHT} fill="#d8e4f0" /></V>
    </Lead>
  );
}

/* --- 34. Third Wind (t2) — THE HELIOGRAPH ------------------------------------
   A tripod mirror is trained on the far hill and the shutter louvres clack:
   three long flashes, and the order to stand down is read off the hillside.
   Palette: #ffe08a / #fff4d6 / #2b2410. */
function ThirdWindScene({ role, delayMs }: SceneProps) {
  const rig = (
    <g {...SJ}>
      <circle cx="9" cy="8" r="5.6" fill="rgba(255,224,138,0.4)" stroke="#ffe08a" strokeWidth="1.3" />
      <path d="M9 13.6V22M4 22h10" stroke="#ffe08a" strokeWidth="1.3" />
      <path d="M16.4 3.4h3.2v9.2h-3.2z" fill="#2b2410" stroke="#ffe08a" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-ent-rise" l={16} t={18} w={64} h={64} d={40}>{rig}</V>
        <L c="g41-hgr-shutter" l={58} t={22} w={10} h={40} d={260} st={{ background: "#ffe08a", transformOrigin: "0% 50%" }} />
        <L c="g41-hgr-flash" l={62} t={34} w={30} h={12} d={480} st={{ background: "linear-gradient(90deg, #fff4d6, transparent)", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hitside" l={14} t={16} w={64} h={68} d={0}>{rig}</V>
        <L c="g41-hgr-shutter" l={56} t={20} w={12} h={44} d={150} st={{ background: "#ffe08a", transformOrigin: "0% 50%" }} />
        <L c="g41-hgr-flash" l={58} t={36} w={42} h={10} d={290} st={{ background: "linear-gradient(90deg, #fff4d6, transparent)", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  return (
    <SplitLead
      d={delayMs}
      frame={<><Wash tone="rgba(255,224,138,0.24)" /><Rim tone="rgba(255,244,214,0.22)" d={620} /></>}
      cast={
        <>
          <V c="g41-hgr-rig" l={43} t={38} w={14} h={17} d={100}>{rig}</V>
          <L c="g41-hgr-shutter" l={53} t={41} w={2.4} h={8} d={260} st={{ background: "#ffe08a", transformOrigin: "0% 50%" }} />
          <L c="g41-castshadow" l={42} t={55} w={18} h={2.4} d={800} st={{ borderRadius: "999px", background: "rgba(43,36,16,0.6)" }} />
        </>
      }
      aim={
        <>
          {[0, 1, 2].map((i) => (
            <L key={i} c="g41-hgr-flash" l={52} t={47 + i * 1.4} w={26} h={1.4} d={380 + i * 150}
              st={{ background: "linear-gradient(90deg, #fff4d6, rgba(255,224,138,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
          ))}
          <L c="g41-throw" l={50} t={49.4} w={28} h={1} d={760} st={{ background: "linear-gradient(90deg, #ffe08a, rgba(255,224,138,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
        </>
      }
    />
  );
}

/* --- 35. Tornado (t5) — THE DUST COLUMN IN THE SHAFT -------------------------
   A shaft of light comes down the file and a whirl of dust makes it VISIBLE:
   the beam is only a beam because of what it has picked up, and everything it
   picks up leaves the ground. Palette: #d9c6a0 / #fff3dc / #241c10. */
function TornadoScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g41-dst-shaft" l={26} t={2} w={48} h={80} d={40} st={{ background: "linear-gradient(180deg, rgba(255,243,220,0.7), rgba(217,198,160,0.1))", clipPath: "polygon(38% 0, 62% 0, 92% 100%, 8% 100%)" }} />
        <L c="g41-dst-whirl" l={30} t={40} w={40} h={40} d={260} st={{ borderRadius: "50%", border: "2px solid #d9c6a0" }} />
        <V c="g41-dst-lift" l={38} t={54} w={26} h={34} d={480}><path d={PAWN} fill="#241c10" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g41-dst-shaft" l={22} t={0} w={56} h={88} d={0} st={{ background: "linear-gradient(180deg, rgba(255,243,220,0.65), rgba(217,198,160,0.1))", clipPath: "polygon(38% 0, 62% 0, 92% 100%, 8% 100%)" }} />
        <V c="g41-hitside" l={32} t={40} w={36} h={46} d={150}><path d={PAWN} fill="#241c10" /></V>
        <L c="g41-dst-whirl" l={26} t={54} w={48} h={26} d={290} st={{ borderRadius: "50%", border: "2px solid #d9c6a0" }} />
      </Cut>
    );
  }
  return (
    <SplitLead
      d={delayMs}
      frame={<><Wash tone="rgba(217,198,160,0.22)" /><Rim tone="rgba(36,28,16,0.3)" d={640} /></>}
      cast={
        <>
          <L c="g41-dst-shaft" l={44} t={24} w={12} h={30} d={120} st={{ background: "linear-gradient(180deg, rgba(255,243,220,0.7), rgba(217,198,160,0.08))", clipPath: "polygon(40% 0, 60% 0, 92% 100%, 8% 100%)" }} />
          <L c="g41-dst-whirl" l={43} t={47} w={14} h={7} d={300} st={{ borderRadius: "50%", border: "2px solid #d9c6a0" }} />
          <V c="g41-dst-lift" l={46} t={44} w={9} h={11} d={520}><path d={PAWN} fill="#241c10" /></V>
        </>
      }
      aim={
        <>
          <L c="g41-throw" l={50} t={49.4} w={28} h={2} d={420} st={{ background: "linear-gradient(90deg, rgba(255,243,220,0.7), rgba(217,198,160,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
          {[0, 1, 2].map((i) => (
            <L key={i} c="g41-dst-grit" l={56 + i * 7} t={45 + i * 2} w={1.6} h={1.6} d={640 + i * 120}
              st={{ borderRadius: "50%", background: "#fff3dc" }} />
          ))}
          <L c="g41-dst-tail" l={62} t={47} w={18} h={4} d={820} st={{ background: "linear-gradient(90deg, rgba(217,198,160,0.7), transparent)", transformOrigin: "0% 50%" }} />
        </>
      }
    />
  );
}

/* --- 36. Wind-Up Knight (t6) — THE ZOETROPE ----------------------------------
   A slotted drum is set down and wound. Through the slits a painted horse
   gallops: not a piece, a persistence of vision, running until the spring
   unwinds. Palette: #e8b45c / #fff4d6 / #2a1d0c. */
function WindUpKnightScene({ role, delayMs }: SceneProps) {
  const drum = (
    <g {...SJ}>
      <path d="M3 7h18v11H3z" fill="#2a1d0c" stroke="#e8b45c" strokeWidth="1.3" />
      <path d="M6.6 7v11M11 7v11M15.4 7v11M19 7v11" stroke="#e8b45c" strokeWidth="1" />
      <path d="M3 7h18" stroke="#e8b45c" strokeWidth="1.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-ent-drop" l={12} t={26} w={76} h={48} d={40}>{drum}</V>
        <V c="g41-zoe-key" l={72} t={40} w={24} h={24} d={260} st={{ transformOrigin: "50% 50%" }}>
          <path d="M12 4v16M4 12h16" stroke="#e8b45c" strokeWidth="2.4" {...SJ} />
        </V>
        <V c="g41-zoe-gallop" l={34} t={38} w={32} h={30} d={480}><path d={KNIGHT} fill="#fff4d6" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hitside" l={10} t={28} w={80} h={46} d={0}>{drum}</V>
        <V c="g41-zoe-gallop" l={32} t={36} w={36} h={34} d={150}><path d={KNIGHT} fill="#fff4d6" /></V>
        <L c="g41-hit2" l={44} t={70} w={12} h={12} d={290} st={{ borderRadius: "50%", background: "#e8b45c" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(232,180,92,0.24)" /><Rim tone="rgba(255,244,214,0.22)" d={660} /></>}>
      <L c="g41-castshadow" l={40} t={55} w={22} h={3} d={80} st={{ borderRadius: "999px", background: "rgba(42,29,12,0.6)" }} />
      <V c="g41-zoe-drum" l={41} t={40} w={18} h={13} d={180}>{drum}</V>
      <V c="g41-zoe-key" l={57} t={43} w={7} h={7} d={330} st={{ transformOrigin: "50% 50%" }}>
        <path d="M12 4v16M4 12h16" stroke="#e8b45c" strokeWidth="2.6" {...SJ} />
      </V>
      <L c="g41-zoe-slit" l={42} t={41} w={16} h={9} d={470} st={{ background: "repeating-linear-gradient(90deg, rgba(42,29,12,0.85) 0 2px, transparent 2px 6px)" }} />
      <V c="g41-zoe-gallop" l={45} t={42} w={10} h={10} d={600}><path d={KNIGHT} fill="#fff4d6" /></V>
      <L c="g41-ray" l={58} t={45} w={16} h={4} d={760} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.55), transparent)", transformOrigin: "0% 50%" }} />
    </Lead>
  );
}

/* --- 37. Feng Shui Plot (t6) — THE LATTICE WINDOW ----------------------------
   A shoji lattice swings open above the square and lays a clean quadrant of
   daylight on the floor: four panes of light, and everything standing in them
   moves easier. Palette: #f0dca8 / #fff4d6 / #2b2312. */
function FengShuiPlotScene({ role, delayMs }: SceneProps) {
  const lattice = (
    <g fill="none" stroke="#f0dca8" strokeWidth="1.4" {...SJ}>
      <path d="M3 3h18v18H3z" />
      <path d="M12 3v18M3 12h18" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-shj-open" l={14} t={12} w={72} h={56} d={40} st={{ transformOrigin: "0% 50%" }}>{lattice}</V>
        <L c="g41-shj-quad" l={24} t={52} w={52} h={34} d={260} st={{ background: "rgba(255,244,214,0.65)" }} />
        <L c="g41-shj-bar" l={48} t={52} w={2.6} h={34} d={480} st={{ background: "#2b2312" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hitside" l={16} t={10} w={68} h={54} d={0}>{lattice}</V>
        <L c="g41-shj-quad" l={20} t={46} w={60} h={40} d={150} st={{ background: "rgba(255,244,214,0.6)" }} />
        <L c="g41-shj-bar" l={48} t={46} w={3} h={40} d={290} st={{ background: "#2b2312" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(240,220,168,0.22)" /><Rim tone="rgba(255,244,214,0.2)" d={660} /></>}>
      <V c="g41-shj-open" l={40} t={30} w={20} h={16} d={110} st={{ transformOrigin: "0% 50%" }}>{lattice}</V>
      <L c="g41-ray" l={52} t={38} w={20} h={10} d={280} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.55), transparent)", transformOrigin: "0% 50%" }} />
      <L c="g41-shj-quad" l={42} t={42} w={16} h={16} d={420} st={{ background: "rgba(255,244,214,0.55)" }} />
      <L c="g41-shj-bar" l={49.4} t={42} w={0.9} h={16} d={560} st={{ background: "#2b2312" }} />
      <L c="g41-shj-bar" l={42} t={49.4} w={16} h={0.9} d={640} st={{ background: "#2b2312" }} />
      <V c="g41-shj-step" l={44} t={44} w={8} h={10} d={780}><path d={PAWN} fill="#f0dca8" /></V>
    </Lead>
  );
}

/* --- 38. Hostile Takeover (t6) — THE PERISCOPE -------------------------------
   A tube rises out of the cast square with a mirror at each end. The top one
   swivels, finds the piece that thought it was out of sight, and the order is
   already written. Palette: #8fb8a0 / #fff3dc / #15241c. */
function HostileTakeoverScene({ role, delayMs }: SceneProps) {
  const tube = (
    <g {...SJ}>
      <path d="M9 22V5h9v4.4h-4.6V22z" fill="#15241c" stroke="#8fb8a0" strokeWidth="1.3" />
      <path d="M10.4 6.4l6.2 2.6" stroke="#fff3dc" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-per-rise" l={26} t={16} w={48} h={68} d={40}>{tube}</V>
        <V c="g41-per-swivel" l={54} t={16} w={30} h={30} d={260} st={{ transformOrigin: "10% 50%" }}>
          <path d="M3 12h18" stroke="#8fb8a0" strokeWidth="2.6" {...SJ} />
        </V>
        <L c="g41-per-mark" l={62} t={54} w={20} h={20} d={480} st={{ borderRadius: "50%", border: "2px solid #fff3dc" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hitside" l={28} t={14} w={44} h={70} d={0}>{tube}</V>
        <L c="g41-per-look" l={44} t={20} w={54} h={4} d={150} st={{ background: "linear-gradient(90deg, #fff3dc, transparent)", transformOrigin: "0% 50%" }} />
        <L c="g41-per-mark" l={58} t={50} w={26} h={26} d={290} st={{ borderRadius: "50%", border: "2px solid #fff3dc" }} />
      </Cut>
    );
  }
  return (
    <SplitLead
      d={delayMs}
      frame={<><Wash tone="rgba(143,184,160,0.2)" /><Rim tone="rgba(21,36,28,0.32)" d={680} /></>}
      cast={
        <>
          <L c="g41-castshadow" l={43} t={55} w={16} h={2.6} d={90} st={{ borderRadius: "999px", background: "rgba(21,36,28,0.6)" }} />
          <V c="g41-per-rise" l={45} t={37} w={11} h={17} d={200}>{tube}</V>
          <V c="g41-per-swivel" l={51} t={37} w={8} h={8} d={380} st={{ transformOrigin: "10% 50%" }}>
            <path d="M3 12h18" stroke="#8fb8a0" strokeWidth="3" {...SJ} />
          </V>
        </>
      }
      aim={
        <>
          <L c="g41-per-look" l={52} t={46} w={26} h={1.6} d={540} st={{ background: "linear-gradient(90deg, #fff3dc, rgba(143,184,160,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
          <L c="g41-throw" l={50} t={49.6} w={28} h={1} d={680} st={{ background: "linear-gradient(90deg, #8fb8a0, rgba(143,184,160,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
          <L c="g41-per-mark" l={72} t={45} w={8} h={8} d={820} st={{ borderRadius: "50%", border: "2px solid #fff3dc" }} />
        </>
      }
    />
  );
}

/* --- 39. Dead Calm (t6) — THE LAMP CHIMNEY -----------------------------------
   A hurricane lamp is set down and the air stops. The flame goes dead vertical
   inside the glass chimney, and the light it throws no longer reaches: it stops
   one square out and stands there. Palette: #ffcf8a / #fff4d6 / #241a10. */
function DeadCalmScene({ role, delayMs }: SceneProps) {
  const lamp = (
    <g {...SJ}>
      <path d="M7 21h10v2H7z" fill="#241a10" stroke="#ffcf8a" strokeWidth="1" />
      <path d="M8 8.6h8V21H8z" fill="rgba(255,207,138,0.22)" stroke="#ffcf8a" strokeWidth="1.3" />
      <path d="M7 6.4h10v2.2H7z" fill="#241a10" stroke="#ffcf8a" strokeWidth="1" />
      <path d="M12 2.6v3.4" stroke="#ffcf8a" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-ent-rise" l={26} t={14} w={48} h={70} d={40}>{lamp}</V>
        <L c="g41-lmp-flame" l={45} t={44} w={10} h={20} d={260} st={{ borderRadius: "50%", background: "linear-gradient(180deg, #fff4d6, #ffcf8a)", transformOrigin: "50% 100%" }} />
        <L c="g41-lmp-stop" l={20} t={78} w={60} h={4} d={480} st={{ background: "#ffcf8a" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hitside" l={28} t={12} w={44} h={72} d={0}>{lamp}</V>
        <L c="g41-lmp-flame" l={45} t={42} w={10} h={22} d={150} st={{ borderRadius: "50%", background: "linear-gradient(180deg, #fff4d6, #ffcf8a)", transformOrigin: "50% 100%" }} />
        <L c="g41-lmp-stop" l={16} t={80} w={68} h={4} d={290} st={{ background: "#ffcf8a" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(255,207,138,0.22)" /><Rim tone="rgba(36,26,16,0.3)" d={640} /></>}>
      <L c="g41-castshadow" l={42} t={56} w={18} h={2.6} d={80} st={{ borderRadius: "999px", background: "rgba(36,26,16,0.6)" }} />
      <V c="g41-lmp-set" l={44} t={37} w={12} h={19} d={170}>{lamp}</V>
      <L c="g41-lmp-flame" l={48.6} t={44} w={2.8} h={6} d={330} st={{ borderRadius: "50%", background: "linear-gradient(180deg, #fff4d6, #ffcf8a)", transformOrigin: "50% 100%" }} />
      <L c="g41-ray" l={52} t={46} w={13} h={5} d={480} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.6), transparent)", transformOrigin: "0% 50%" }} />
      <L c="g41-lmp-stop" l={63} t={44} w={1.4} h={10} d={640} st={{ background: "#ffcf8a" }} />
      <L c="g41-lmp-still" l={41} t={52} w={2} h={2} d={780} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 40. Living Board (t7) — THE ANAMORPHIC CYLINDER -------------------------
   A smeared, unreadable stain is painted over two patches of board; a mirrored
   cylinder is stood in the middle and the smear resolves into two tidy squares
   that have swapped places. Palette: #f0b0e0 / #fff3dc / #241436. */
function LivingBoardScene({ role, delayMs }: SceneProps) {
  const smear = (
    <path d="M2 16c5-9 9-3 12-8 2.4-4 6-1 8 2" fill="none" stroke="#f0b0e0" strokeWidth="3.4" strokeLinecap="round" />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-anm-smear" l={8} t={26} w={84} h={50} d={40}>{smear}</V>
        <L c="g41-anm-cyl" l={40} t={22} w={20} h={56} d={260} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #241436, #fff3dc, #241436)" }} />
        <L c="g41-anm-tile" l={56} t={38} w={24} h={24} d={480} st={{ background: "rgba(240,176,224,0.75)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hitside" l={6} t={28} w={88} h={46} d={0}>{smear}</V>
        <L c="g41-anm-cyl" l={42} t={18} w={16} h={64} d={150} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #241436, #fff3dc, #241436)" }} />
        <L c="g41-anm-tile" l={54} t={38} w={26} h={26} d={290} st={{ background: "rgba(240,176,224,0.75)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(240,176,224,0.22)" /><Rim tone="rgba(36,20,54,0.32)" d={700} /></>}>
      <V c="g41-anm-smear" l={34} t={38} w={32} h={20} d={110}>{smear}</V>
      <L c="g41-anm-cyl" l={47} t={34} w={6} h={22} d={260} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #241436, #fff3dc, #241436)" }} />
      <L c="g41-anm-tile" l={38} t={40} w={8} h={8} d={420} st={{ background: "rgba(240,176,224,0.8)" }} />
      <L c="g41-anm-tile" l={54} t={48} w={8} h={8} d={520} st={{ background: "rgba(255,243,220,0.8)" }} />
      <L c="g41-anm-swap" l={38} t={40} w={24} h={16} d={640} st={{ border: "1px solid #f0b0e0" }} />
      <L c="g41-ray" l={57} t={45} w={17} h={3} d={760} st={{ background: "linear-gradient(90deg, rgba(255,243,220,0.6), transparent)", transformOrigin: "0% 50%" }} />
      <V c="g41-anm-step" l={44} t={50} w={8} h={10} d={860}><path d={PAWN} fill="#f0b0e0" /></V>
    </Lead>
  );
}

/* --- 41. Tidal Wall (t7) — SNELL'S WINDOW ------------------------------------
   Seen from under water the whole sky is squeezed into one bright circle and
   everything outside it is a mirror. The central ranks go silver: no way up,
   except through the one window left open. Palette: #6fc8e0 / #fff3dc /
   #0d2436. */
function TidalWallScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g41-snl-surface" l={0} t={34} w={100} h={6} d={40} st={{ background: "linear-gradient(180deg, #fff3dc, rgba(111,200,224,0.2))" }} />
        <L c="g41-snl-window" l={30} t={22} w={40} h={40} d={260} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff3dc, rgba(111,200,224,0.15) 70%)" }} />
        <L c="g41-snl-silver" l={4} t={44} w={92} h={36} d={480} st={{ background: "linear-gradient(180deg, rgba(111,200,224,0.8), rgba(13,36,54,0.5))" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g41-snl-surface" l={0} t={30} w={100} h={6} d={0} st={{ background: "linear-gradient(180deg, #fff3dc, rgba(111,200,224,0.2))" }} />
        <L c="g41-hitside" l={26} t={16} w={48} h={48} d={150} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff3dc, rgba(111,200,224,0.1) 70%)" }} />
        <L c="g41-snl-silver" l={0} t={44} w={100} h={44} d={290} st={{ background: "linear-gradient(180deg, rgba(111,200,224,0.75), rgba(13,36,54,0.5))" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(111,200,224,0.2)" />
          <MidBand tone="linear-gradient(180deg, rgba(111,200,224,0.55), rgba(13,36,54,0.4))" d={160} />
          <Rim tone="rgba(13,36,54,0.34)" d={720} />
        </>
      }
    >
      <L c="g41-snl-surface" l={26} t={40} w={48} h={2} d={110} st={{ background: "linear-gradient(90deg, transparent, #fff3dc, transparent)" }} />
      <L c="g41-snl-window" l={42} t={38} w={16} h={16} d={280} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff3dc, rgba(111,200,224,0.12) 70%)" }} />
      <L c="g41-snl-silver" l={28} t={46} w={44} h={9} d={430} st={{ background: "linear-gradient(180deg, rgba(111,200,224,0.75), rgba(13,36,54,0.45))" }} />
      <L c="g41-ray" l={56} t={44} w={18} h={4} d={560} st={{ background: "linear-gradient(90deg, rgba(255,243,220,0.6), transparent)", transformOrigin: "0% 50%" }} />
      <L c="g41-snl-bounce" l={34} t={45} w={16} h={1.6} d={700} st={{ background: "linear-gradient(90deg, #6fc8e0, transparent)", transformOrigin: "0% 50%", rotate: "-26deg" }} />
      <V c="g41-snl-bridge" l={46} t={41} w={9} h={11} d={820}><path d={KING} fill="#fff3dc" /></V>
    </Lead>
  );
}

/* --- 42. The Ninth Rank (t8) — THE PRISM -------------------------------------
   A heavy triangular prism is set down on the back rank. White light goes in
   flat and comes out fanned: eight coloured bands laid across the boards, and
   then a ninth that has no business existing. Palette: #ffd9a0 / #b088f0 /
   #1a1230. */
const PRS_BANDS = ["#ffd9a0", "#ffbf7a", "#f0e08a", "#a8e8a0", "#8fd8f0", "#8fa8f0", "#b088f0", "#d89ae8"];

function NinthRankScene({ role, delayMs }: SceneProps) {
  const prism = (
    <g {...SJ}>
      <path d="M12 2.6L22 20.4H2z" fill="rgba(255,217,160,0.28)" stroke="#ffd9a0" strokeWidth="1.5" />
      <path d="M12 6.4L18.4 18.4H5.6z" fill="none" stroke="#b088f0" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g41-ent-drop" l={22} t={16} w={56} h={54} d={40}>{prism}</V>
        <L c="g41-prs-in" l={0} t={44} w={34} h={4} d={260} st={{ background: "linear-gradient(90deg, transparent, #ffd9a0)", transformOrigin: "100% 50%" }} />
        {PRS_BANDS.slice(0, 5).map((c, i) => (
          <L key={c} c="g41-prs-fan" l={66} t={40 + i * 6} w={32} h={4} d={470 + i * 60}
            st={{ background: `linear-gradient(90deg, ${c}, transparent)`, transformOrigin: "0% 50%" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g41-hitside" l={24} t={18} w={52} h={52} d={0}>{prism}</V>
        <L c="g41-prs-in" l={-6} t={44} w={38} h={4} d={150} st={{ background: "linear-gradient(90deg, transparent, #ffd9a0)", transformOrigin: "100% 50%" }} />
        {PRS_BANDS.slice(0, 4).map((c, i) => (
          <L key={c} c="g41-prs-fan" l={62} t={38 + i * 8} w={40} h={5} d={290 + i * 70}
            st={{ background: `linear-gradient(90deg, ${c}, transparent)`, transformOrigin: "0% 50%" }} />
        ))}
      </Cut>
    );
  }
  return (
    <SplitLead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(255,217,160,0.24)" />
          <Half tone="rgba(176,136,240,0.24)" d={140} />
          <Rim tone="rgba(26,18,48,0.34)" d={860} />
        </>
      }
      cast={
        <>
          <L c="g41-castshadow" l={42} t={55} w={20} h={3} d={90} st={{ borderRadius: "999px", background: "rgba(26,18,48,0.6)" }} />
          <V c="g41-prs-set" l={43} t={38} w={14} h={17} d={220}>{prism}</V>
          <L c="g41-prs-ninth" l={44} t={57} w={14} h={1.4} d={880} st={{ background: "#b088f0", transformOrigin: "0% 50%" }} />
        </>
      }
      aim={
        <>
          <L c="g41-prs-in" l={24} t={49.2} w={26} h={1.6} d={340} st={{ background: "linear-gradient(90deg, rgba(255,217,160,0), #ffd9a0)", transformOrigin: "100% 50%", borderRadius: "999px" }} />
          {PRS_BANDS.map((c, i) => (
            <L key={c} c="g41-prs-fan" l={50} t={45.6 + i * 1.1} w={28} h={0.9} d={500 + i * 45}
              st={{ background: `linear-gradient(90deg, ${c}, rgba(26,18,48,0))`, transformOrigin: "0% 50%" }} />
          ))}
          <L c="g41-throw" l={50} t={49.4} w={28} h={0.9} d={820} st={{ background: "linear-gradient(90deg, #b088f0, rgba(176,136,240,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
        </>
      }
    />
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
  ov_loading_screen_tip: S(LoadingTipScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "slots", anchor: "board" }),
  ov_second_opinion: S(SecondOpinionScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockice", anchor: "board" }),
  bn4_border_survey: S(BorderSurveyScene, { ordering: "line", staggerMs: 55, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }),
  ov_wallhack_goggles: S(WallhackGogglesScene, { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "clockice", anchor: "board" }),
  ov_weather_balloon: S(WeatherBalloonScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "aegis", anchor: "board" }),
  hx4_circling_vultures: S(CirclingVulturesScene, { ordering: "octagon", staggerMs: 60, victims: "all", hasLead: true, sound: "shades", anchor: "cast" }),
  bn4_lighthouse_beam: S(LighthouseBeamScene, { ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }),
  bn4_queens_gambol: S(QueensGambolScene, { ordering: "line", staggerMs: 60, victims: ["q"], hasLead: true, sound: "blitz", anchor: "aim" }),
  ov_raven_parliament: S(RavenParliamentScene, { ordering: "file", staggerMs: 70, victims: "all", hasLead: true, sound: "shades", anchor: "cast" }),
  bn4_auditors_ledger: S(AuditorsLedgerScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "vault", anchor: "board" }),
  bn4_court_procession: S(CourtProcessionScene, { ordering: "line", staggerMs: 65, victims: ["q"], hasLead: true, sound: "coronation", anchor: "cast" }),
  bn4_shepherds_watch: S(ShepherdsWatchScene, { ordering: "file", staggerMs: 70, victims: ["p"], hasLead: true, sound: "aegis", anchor: "board" }),
  bn4_kings_leap_year: S(KingsLeapYearScene, { ordering: "radial", staggerMs: 60, victims: ["k"], hasLead: true, sound: "clockcage", anchor: "cast" }),
  hx4_borrowed_boots: S(BorrowedBootsScene, { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "petrify", anchor: "cast" }),
  hx4_puddle: S(PuddleScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "massfreeze", anchor: "board" }),
  hx4_flinching_blades: S(FlinchingBladesScene, { ordering: "octagon", staggerMs: 55, victims: "all", hasLead: true, sound: "lightning", anchor: "board" }),
  hx4_cold_shoulder: S(ColdShoulderScene, { ordering: "octagon", staggerMs: 60, victims: ["k"], hasLead: true, sound: "shades", anchor: "board" }),
  hx4_shifting_floor: S(ShiftingFloorScene, { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "massfreeze", anchor: "board" }),
  hx4_broken_compass: S(BrokenCompassScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "wheel", anchor: "cast" }),
  hx4_moth_plague: S(MothPlagueScene, { ordering: "radial", staggerMs: 70, victims: ["p", "n", "b", "r", "q"], hasLead: true, sound: "petrifiedforest", anchor: "cast" }),
  hx4_waste_not: S(WasteNotScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }),
  hx4_quagmire_march: S(QuagmireMarchScene, { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "petrifiedforest", anchor: "board" }),
  hx4_veil_of_moths: S(VeilOfMothsScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "massfreeze", anchor: "board" }),
  hx4_sated_blades: S(SatedBladesScene, { ordering: "radial", staggerMs: 65, victims: "all", hasLead: true, sound: "atomic", anchor: "board" }),
  hx4_severed_lines: S(SeveredLinesScene, { ordering: "line", staggerMs: 55, victims: "all", hasLead: true, sound: "extinction", anchor: "board" }),
  op_carbon_copy: S(CarbonCopyScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "gacha", anchor: "board" }),
  ov_mirror_shield: S(MirrorShieldScene, { ordering: "radial", staggerMs: 0, victims: ["n", "b"], hasLead: true, sound: "aegis", anchor: "aim" }),
  hx4_mirror_manners: S(MirrorMannersScene, { ordering: "octagon", staggerMs: 55, victims: "all", hasLead: true, sound: "coinflip", anchor: "cast" }),
  bn4_twin_buttons: S(TwinButtonsScene, { ordering: "radial", staggerMs: 60, victims: ["p"], hasLead: true, sound: "chips", anchor: "board" }),
  ov_hall_of_mirrors: S(HallOfMirrorsBuffScene, { ordering: "line", staggerMs: 65, victims: ["r"], hasLead: true, sound: "vault", anchor: "board" }),
  ov_duplicate_glitch: S(DuplicateGlitchScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "bust", anchor: "board" }),
  hx4_ironglass_mirror: S(IronglassMirrorScene, { ordering: "octagon", staggerMs: 60, victims: "all", hasLead: true, sound: "massfreeze", anchor: "cast" }),
  hx4_hall_of_mirrors: S(HallOfMirrorsHexScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cataclysm", anchor: "board" }),
  bn4_third_wind: S(ThirdWindScene, { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz", anchor: "board" }),
  ov_tornado: S(TornadoScene, { ordering: "line", staggerMs: 55, victims: "all", hasLead: true, sound: "rampage", anchor: "board" }),
  bn4_wind_up_knight: S(WindUpKnightScene, { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "wheel", anchor: "cast" }),
  ov_feng_shui_plot: S(FengShuiPlotScene, { ordering: "octagon", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", anchor: "cast" }),
  ov_hostile_takeover: S(HostileTakeoverScene, { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "siege", anchor: "aim" }),
  hx4_dead_calm: S(DeadCalmScene, { ordering: "radial", staggerMs: 60, victims: ["b", "r", "q"], hasLead: true, sound: "snooze", anchor: "board" }),
  ov_living_board: S(LivingBoardScene, { ordering: "octagon", staggerMs: 60, victims: "all", hasLead: true, sound: "nova", anchor: "cast" }),
  hx4_tidal_wall: S(TidalWallScene, { ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "wall", anchor: "board" }),
  ov_ninth_rank: S(NinthRankScene, { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "nova", anchor: "aim" }),
};

/* =============================================================================
   FLAGSHIP IMPACT WAVE. Every lead now LANDS: a per-card impact beat from the
   shared violence vocabulary (impact/impact.tsx). This is the PRISM module,
   so the signature move is REFRACTION - the strike arrives as a fan of thin
   tinted beams (each a narrow LaserStrike box in one of the card's own three
   palette colours) splitting around the main hit, mirrors shatter in half,
   and wet cards crash with flattened ripple rings instead of dry blast rings.
   The whole scene rides a cell-scale quake wrapper (g41-quakecell,
   g41PrismPlays.css) on the same --imp-delay beat. Additive only: the
   original scenes render unchanged underneath.

   Node cost per lead: quake 1 + a 2-3 beam fan (4-6) + shock 1, or laser 2 +
   shatter 6 + shock 1 - every combo stays inside the 16-node budget.
   ========================================================================== */

interface ImpBeam {
  /** offset from the hit point, in cells (aim stage: down the vector) */
  dx: number;
  /** extra ms after the main beat: the fan splits, it does not chord */
  ms: number;
  /** refraction tint (defaults to the card tint) */
  tint?: string;
}

interface Imp {
  /** the impact beat, ms after delayMs - synced to the scene's own strike */
  at: number;
  /** "#rrggbb" tint for the impact vocabulary (one of the card's 3 colours) */
  tint: string;
  /** the main column of light */
  laser?: boolean;
  /** ground ring; "wet" flattens it into a low water-crash ellipse */
  shock?: boolean | "wet";
  /** shatter silhouette: the struck thing splits in half and sprays chips */
  glyph?: ReactNode;
  /** the refraction fan: extra THIN beams around the hit */
  beams?: ImpBeam[];
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

/** Shatter silhouettes, painted in the card's own palette. */
function impGlyph(path: string, fill: string, stroke: string): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
      <path d={path} fill={fill} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
const IG_ORB = "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z";
const IG_PANE = "M7 2.6h10v18.8H7z";
const IG_SLAB = "M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z";

/** The impact composite: main hit plus the refraction fan. */
function ImpactBeat({ imp, delayMs }: { imp: Imp; delayMs: number }) {
  const s = imp.s ?? 7.2;
  const x = imp.x ?? 50;
  const y = imp.y ?? 50;
  const lenShift = imp.len ? " + var(--fx-len, 3) * 7.142857%" : "";
  const inner = (
    <span className="g41-impactbed absolute inset-0 block">
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
        {imp.shock === true && <Shockwave />}
      </span>
      {imp.shock === "wet" && (
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
      {imp.beams?.map((b, i) => (
        <span
          key={i}
          className="absolute block"
          style={{
            left: `calc(${x + b.dx * 7.142857 - s * 0.2}%${lenShift})`,
            top: `${y - s / 2}%`,
            width: `${s * 0.4}%`,
            height: `${s}%`,
            ...impactVars(impRgb(b.tint ?? imp.tint), (delayMs + imp.at + b.ms) / 1000),
          }}
        >
          <LaserStrike />
        </span>
      ))}
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
        className="g41-quakecell absolute inset-0 block"
        style={impactVars(impRgb(imp.tint), (props.delayMs + imp.at) / 1000)}
      >
        <Render {...props} />
        <ImpactBeat imp={imp} delayMs={props.delayMs} />
      </span>
    );
  }
  return ImpactLead;
}

/* Per-card cue sheet: every hit lands on ITS scene's strike beat, in ITS
   palette, with ITS refraction - no two siblings share a beat + combo. */
const IMPACTS: Record<string, Imp> = {
  // the tip pops up: the hint beam splits into a two-tone fan
  ov_loading_screen_tip: { at: 520, tint: "#f0c56a", shock: true, beams: [{ dx: -0.7, ms: 0 }, { dx: 0.7, ms: 90, tint: "#fff2d2" }] },
  // two opinions, two beams: they land a half-beat apart and disagree
  ov_second_opinion: { at: 560, tint: "#d9b26a", shock: true, beams: [{ dx: -0.9, ms: 0 }, { dx: 0.9, ms: 140, tint: "#fff3dc" }] },
  // the survey stakes both borders: beam left, beam right, chain boom
  bn4_border_survey: { at: 560, tint: "#8fd6c0", shock: true, beams: [{ dx: -1.6, ms: 0 }, { dx: 1.6, ms: 110 }] },
  // the goggles burn through: an x-ray fan splits around the wall
  ov_wallhack_goggles: { at: 540, tint: "#b6a6f0", shock: true, beams: [{ dx: -1, ms: 0 }, { dx: 0, ms: 80, tint: "#fff2dc" }, { dx: 1, ms: 160 }] },
  // the balloon's sounding line drops from altitude: sky column + ring
  ov_weather_balloon: { at: 600, tint: "#9fd0f0", laser: true, shock: true, y: 42, s: 6.4 },
  // the vulture STOOPS: dive column and carcass thump
  hx4_circling_vultures: { at: 660, tint: "#d8b98a", laser: true, shock: true, y: 56, s: 8 },
  // the lighthouse grounds its sweep: main beam + two refracted panes
  bn4_lighthouse_beam: { at: 560, tint: "#ffd28c", laser: true, shock: true, beams: [{ dx: -1.2, ms: 120, tint: "#fff4d6" }, { dx: 1.2, ms: 200 }] },
  // the gambol lands at the queen's own square, down the vector
  bn4_queens_gambol: { at: 700, tint: "#f0a6c8", laser: true, shock: true, aim: true, len: true, s: 6.4 },
  // the parliament rules: the verdict caw spikes down into the yard
  ov_raven_parliament: { at: 640, tint: "#a8b8d0", laser: true, shock: true, y: 52 },
  // the ledger balances: the audit stamp comes down like a piledriver
  bn4_auditors_ledger: { at: 620, tint: "#e0c184", laser: true, shock: true, y: 54, s: 7.8 },
  // the procession halts: the herald's light plants at the head
  bn4_court_procession: { at: 720, tint: "#b7e4ee", laser: true, shock: true, y: 48, s: 6.4 },
  // the shepherd's crook stakes the fold: staff column + fold ring
  bn4_shepherds_watch: { at: 640, tint: "#b6f0a8", laser: true, shock: true, y: 55, s: 6.8 },
  // the leap-day is struck into the calendar: date-stamp boom
  bn4_kings_leap_year: { at: 780, tint: "#f5c76a", laser: true, shock: true, y: 50, s: 7 },
  // the boots thump down at the wrong feet: heel boom
  hx4_borrowed_boots: { at: 560, tint: "#9ab4d8", laser: true, shock: true, y: 58, s: 6.6 },
  // the PUDDLE takes the hit: wet crash, no dry ring on standing water
  hx4_puddle: { at: 600, tint: "#8fc9e8", laser: true, shock: "wet", y: 56 },
  // every blade glints at once: a three-beam flinch fan
  hx4_flinching_blades: { at: 560, tint: "#f2e07a", shock: true, beams: [{ dx: -1.3, ms: 0 }, { dx: 0.2, ms: 70, tint: "#fff4d6" }, { dx: 1.5, ms: 150 }] },
  // the shoulder turns: a cold column drops where the greeting died
  hx4_cold_shoulder: { at: 580, tint: "#a9c6d4", laser: true, shock: true, y: 50, s: 6.2 },
  // the floor shifts under them: a tile is levered up and SPLIT
  hx4_shifting_floor: { at: 620, tint: "#8ee0d6", glyph: impGlyph(IG_SLAB, "#8ee0d6", "#123028"), shock: true, y: 54 },
  // the compass face SHATTERS: glass halves, needle spinning off
  hx4_broken_compass: { at: 700, tint: "#e5a8f0", glyph: impGlyph(IG_ORB, "#e5a8f0", "#2a1636"), shock: true, y: 50 },
  // the lamp columns come on and the swarm slams them: twin moth-beams
  hx4_moth_plague: { at: 620, tint: "#ffca7a", shock: true, beams: [{ dx: -0.9, ms: 0 }, { dx: 0.9, ms: 120, tint: "#fff4d6" }] },
  // the tally is enforced: the reclaim beam stamps the hoard
  hx4_waste_not: { at: 640, tint: "#cfe07a", laser: true, shock: true, y: 52, s: 6.8 },
  // the quagmire takes hold: a MUD crash, low and wet, no clean ring
  hx4_quagmire_march: { at: 500, tint: "#8a734a", laser: true, shock: "wet", y: 56, s: 8 },
  // the veil closes: dusty wing-beams shear down through the lattice
  hx4_veil_of_moths: { at: 600, tint: "#b8e0f0", shock: true, beams: [{ dx: -1.1, ms: 0, tint: "#fff3dc" }, { dx: 1.1, ms: 130 }] },
  // the sated blade is DISARMED: the fed sword snaps in half
  hx4_sated_blades: { at: 640, tint: "#ff9a52", glyph: impGlyph(IG_PANE, "#ff9a52", "#2a1206"), shock: true, y: 50 },
  // the supply line is severed: the cut point detonates
  hx4_severed_lines: { at: 660, tint: "#7ce8c4", laser: true, shock: true, y: 50, s: 7.6 },
  // the copy presses through: original beam, then the carbon beam under it
  op_carbon_copy: { at: 560, tint: "#cfd8f0", shock: true, beams: [{ dx: -0.5, ms: 0, tint: "#fff2dc" }, { dx: 0.8, ms: 160 }] },
  // the mirror shield returns to sender: the bounce lands at --fx-len
  ov_mirror_shield: { at: 620, tint: "#a6e8ff", laser: true, shock: true, aim: true, len: true, s: 6.2 },
  // manners break: the etiquette mirror SHATTERS in half
  hx4_mirror_manners: { at: 560, tint: "#f0c8d8", glyph: impGlyph(IG_PANE, "#f0c8d8", "#2a1622"), shock: true, y: 50 },
  // both buttons are pressed at once: twin beams, one per button
  bn4_twin_buttons: { at: 620, tint: "#96e0ff", shock: true, beams: [{ dx: -0.8, ms: 0 }, { dx: 0.8, ms: 60, tint: "#fff4d6" }] },
  // the hall multiplies the hit: a three-way refraction fan
  ov_hall_of_mirrors: { at: 640, tint: "#c9b0f0", shock: true, beams: [{ dx: -1.4, ms: 0 }, { dx: 0, ms: 90, tint: "#fff3dc" }, { dx: 1.4, ms: 180 }] },
  // the glitch doubles: two beams in two WRONG colours, a frame apart
  ov_duplicate_glitch: { at: 540, tint: "#ff7a9c", shock: true, beams: [{ dx: -0.6, ms: 0 }, { dx: 0.6, ms: 60, tint: "#7ae0ff" }] },
  // ironglass takes the blow and the reflection cracks instead
  hx4_ironglass_mirror: { at: 640, tint: "#7ad8f0", glyph: impGlyph(IG_PANE, "#7ad8f0", "#16283a"), shock: true, y: 50 },
  // the hex hall turns every pane hostile: fan plus a floor boom
  hx4_hall_of_mirrors: { at: 680, tint: "#d8e4f0", shock: true, beams: [{ dx: -1.6, ms: 0 }, { dx: -0.2, ms: 90, tint: "#fff2dc" }, { dx: 1.3, ms: 170 }] },
  // the third wind hits the sails: mast column + deck boom
  bn4_third_wind: { at: 620, tint: "#ffe08a", laser: true, shock: true, y: 48, s: 7 },
  // the tornado touches down: the funnel's ground strike, wide and violent
  ov_tornado: { at: 520, tint: "#d9c6a0", laser: true, shock: true, y: 54, s: 9.6 },
  // the wind-up knight's spring RELEASES: escapement boom
  bn4_wind_up_knight: { at: 600, tint: "#e8b45c", laser: true, shock: true, y: 52, s: 6.4 },
  // the plot aligns: the qi beam grounds itself in the garden's heart
  ov_feng_shui_plot: { at: 560, tint: "#f0dca8", laser: true, shock: true, y: 50, s: 6.6 },
  // the takeover lands on the target's own boardroom, down the vector
  ov_hostile_takeover: { at: 540, tint: "#8fb8a0", laser: true, shock: true, aim: true, len: true, s: 6.6 },
  // dead calm falls like a weight: one soft-gold column, then stillness
  hx4_dead_calm: { at: 480, tint: "#ffcf8a", laser: true, shock: true, y: 50, s: 6 },
  // the living board bites back: a flagstone rears up and SPLITS
  ov_living_board: { at: 640, tint: "#f0b0e0", glyph: impGlyph(IG_SLAB, "#f0b0e0", "#241436"), shock: true, y: 54 },
  // the tidal wall breaks: a WIDE wet crash along the rampart line
  hx4_tidal_wall: { at: 560, tint: "#6fc8e0", laser: true, shock: "wet", y: 52, s: 9 },
  // the ninth rank opens: twin gate-beams land at the promotion square
  ov_ninth_rank: { at: 820, tint: "#ffd9a0", shock: true, aim: true, len: true, beams: [{ dx: -0.5, ms: 0 }, { dx: 0.5, ms: 80, tint: "#b088f0" }] },
};

for (const [id, imp] of Object.entries(IMPACTS)) {
  const play = PLAYS[id];
  if (play) PLAYS[id] = { config: play.config, Render: withImpact(play.Render, imp) };
}
