// g14BreakdownPlays — bespoke plays for the 27 cards that used to share the
// generated `clockwork` family (one hourglass-and-gear burst, 27 hue shifts).
//
// MODULE FICTION: MACHINES FAILING. Never a gear turning happily. Every card is
// one specific mechanism going wrong in its own specific way: a belt jumping
// its pulley and slapping, a bearing seizing and smoking, a shear pin snapping
// to save the gearbox, a governor hunting and surging, a relief valve
// chattering, a chain jumping a sprocket tooth, a fuse wire melting through
// with a blue flash, a gear stripping a tooth so the stub grinds past, a
// flywheel losing its key and freewheeling off the shaft, a solder joint drying
// out and cracking, a spring going coil-bound and taking a set.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g14BreakdownPlays.css), transform/opacity animations only, no imports
// from BoardEffects.tsx, only the SigPlugin/SigRole TYPES from sigPlugins.tsx.
//
// STAGING. Every card declares "cast" or "aim", so the breakdown happens on the
// square the card was played on. Board-scale layers (oil wash, edge glare, the
// shop going dark) live inside <BoardFrame>, never at a fixed percentage of the
// stage. Cards whose failure RUNS somewhere — a belt slapping down the line, a
// chain skipping along, a seam of rivets unzipping, a runaway slide, a tube
// carrier — use <AimStage> and author their art pointing RIGHT.
//
// Every scene runs three beats — tell (a strain, a wobble, a hairline), strike
// (the actual failure), settle (grit, smoke, a part still rolling) — in all
// three roles, and every lead carries a layer driven by the geometry vars
// (--fx-ox/--fx-oy plume lean, --fx-side debris throw, --fx-len run length),
// which is what makes the breakdown directional rather than decorative. All CSS
// lives in g14BreakdownPlays.css behind the `g14-` prefix.

import "./g14BreakdownPlays.css";

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
const rootStyle = (d: number): CSSProperties => ({ "--g14-d": `${d}ms` }) as CSSProperties;

/** stagger + a beat offset, scaled by the Settings animation-speed var. */
const b = (ms: number): string => `calc(var(--g14-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

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

/** Cast-anchored lead: the breakdown on the cast square, `frame` over the board. */
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

/** Board-wide oil-light wash, always inside a BoardFrame. */
function Wash({ tone, d = 0 }: { tone: string; d?: number }) {
  return <L c="g14-wash" d={d} st={{ background: `radial-gradient(circle at 50% 48%, ${tone}, transparent 70%)` }} />;
}

/** Board-edge glare, always inside a BoardFrame. */
function Rim({ tone, d = 160 }: { tone: string; d?: number }) {
  return <L c="g14-rim" d={d} st={{ boxShadow: `inset 0 0 30px 9px ${tone}` }} />;
}

/** The shop going dark for a beat, always inside a BoardFrame. */
function Dim({ tone, d = 0 }: { tone: string; d?: number }) {
  return <L c="g14-veil" d={d} st={{ background: tone }} />;
}

/* Hardware the whole shop is built from. Each card dresses these with its own
   failing element, never with a hue shift alone. */
const GEAR =
  "M12 3.1l1.5 1.1 1.8-.6.8 1.7 1.9.2.1 1.9 1.6 1-.6 1.8 1.1 1.5-1.4 1.3.1 1.9-1.9.4-.8 1.7-1.8-.4-1.4 1.3-1.5-1.1-1.8.6-.8-1.7-1.9-.2-.1-1.9-1.6-1 .6-1.8L3.7 11l1.4-1.3-.1-1.9 1.9-.4.8-1.7 1.8.4z";
const HUB = <circle cx="12" cy="12" r="3.1" fill="none" strokeWidth="1.4" />;

/* =============================================================================
   1. First Class Stamp — THE SHEAR PIN DOES ITS JOB
   The franking press comes down on something it should not, and the little
   brass shear pin snaps clean in two so the gearbox behind it survives. The
   crank stops dead mid-stroke. Palette: #d46a4a / #fff2d8 / #2b1410.
   ========================================================================== */
function FirstClassStampScene({ role, delayMs }: SceneProps) {
  const die = (
    <g {...SJ}>
      <path d="M4 2h16v9H4z" fill="#d46a4a" stroke="#2b1410" strokeWidth="1.2" />
      <path d="M8 11h8v4H8z" fill="#2b1410" />
      <path d="M6.5 4.5h11M6.5 7h7" stroke="#fff2d8" strokeWidth="1" />
    </g>
  );
  const pinHalf = <path d="M3 10h13l3 2-3 2H3z" fill="#fff2d8" stroke="#2b1410" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g14-fs-die" l={22} t={6} w={56} h={46} d={40}>{die}</V>
        <V c="g14-fs-pin" l={10} t={54} w={44} h={26} d={260}>{pinHalf}</V>
        <V c="g14-fs-pin" l={50} t={56} w={44} h={26} d={330} st={{ scale: "-1 1" }}>{pinHalf}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hitside" l={18} t={8} w={64} h={48} d={0}>{die}</V>
        <V c="g14-hit" l={12} t={56} w={44} h={26} d={140}>{pinHalf}</V>
        <L c="g14-hit2" l={44} t={62} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#fff2d8" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(212,106,74,0.28)" /><Rim tone="rgba(255,242,216,0.26)" /></>}>
      <V c="g14-stall" l={35} t={36} w={13} h={13} d={90}>
        <path d={GEAR} fill="none" stroke="#d46a4a" strokeWidth="1.5" {...SJ} />
        <g stroke="#fff2d8">{HUB}</g>
      </V>
      <V c="g14-fs-die" l={44} t={31} w={14} h={13} d={280}>{die}</V>
      <V c="g14-fs-pin" l={40} t={45} w={10} h={5} d={460}>{pinHalf}</V>
      <V c="g14-fs-pin" l={51} t={46} w={10} h={5} d={520} st={{ scale: "-1 1" }}>{pinHalf}</V>
      <L c="g14-jolt" l={38} t={44} w={24} h={3} d={470} st={{ borderRadius: "999px", background: "#fff2d8" }} />
      <L c="g14-castoff" l={49} t={47} w={2.2} h={2.2} d={620} st={{ borderRadius: "50%", background: "#d46a4a" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g14-sift" l={42 + i * 7} t={49} w={1.4} h={1.4} d={700 + i * 90} st={{ borderRadius: "50%", background: "#fff2d8" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   2. First Robin — THE SPRING GOES COIL-BOUND AND TAKES A SET
   The return spring is squeezed until coil touches coil, holds there a beat
   with nowhere left to go, and comes back shorter than it went in: it has
   taken a permanent set. Palette: #a8c46a / #fff4d6 / #1e2a12.
   ========================================================================== */
const FR_COILS = [0, 1, 2, 3];

function FirstRobinScene({ role, delayMs }: SceneProps) {
  const coil = (stroke: string) => (
    <path d="M2 6h20M2 12h20M2 18h20" stroke={stroke} strokeWidth="2.4" fill="none" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g14-fr-coil" l={16} t={16} w={68} h={62} d={40} st={{ transformOrigin: "50% 100%" }}>{coil("#a8c46a")}</V>
        <L c="g14-ent-drop" l={22} t={4} w={56} h={9} d={230} st={{ background: "#fff4d6" }} />
        <V c="g14-fr-set" l={16} t={58} w={68} h={30} d={450} st={{ transformOrigin: "50% 100%" }}>{coil("#1e2a12")}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hitside" l={20} t={22} w={60} h={56} d={0} st={{ transformOrigin: "50% 100%" }}>{coil("#a8c46a")}</V>
        <L c="g14-hit" l={24} t={12} w={52} h={7} d={140} st={{ background: "#fff4d6" }} />
        <L c="g14-hit2" l={40} t={80} w={20} h={4} d={260} st={{ borderRadius: "999px", background: "#1e2a12" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(168,196,106,0.26)" />}>
      <L c="g14-strain" l={41} t={33} w={18} h={5} d={90} st={{ background: "#fff4d6", transformOrigin: "50% 100%" }} />
      {FR_COILS.map((i) => (
        <L key={i} c="g14-fr-coil" l={43} t={38 + i * 3.4} w={14} h={1.8} d={140 + i * 60} st={{ borderRadius: "999px", background: "#a8c46a", transformOrigin: "50% 100%" }} />
      ))}
      <L c="g14-jolt" l={40} t={51} w={20} h={2.4} d={430} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <L c="g14-fr-set" l={43} t={45} w={14} h={7} d={620} st={{ background: "linear-gradient(180deg, rgba(168,196,106,0.9), rgba(30,42,18,0.9))", transformOrigin: "50% 100%" }} />
      <L c="g14-lean" l={46} t={40} w={9} h={9} d={680} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.7), transparent 70%)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g14-sift" l={44 + i * 5} t={52} w={1.4} h={1.4} d={740 + i * 90} st={{ borderRadius: "50%", background: "#a8c46a" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   3. Four Winds — THE GOVERNOR HUNTS
   Four flyball arms fling wide, overshoot, snatch back in, overshoot again:
   the governor is hunting, and the sleeve pumps up and down chasing a speed it
   will never hold. Palette: #8fbcd8 / #fff4d6 / #16232e.
   ========================================================================== */
const FW_ARMS = [45, 135, 225, 315];

function FourWindsScene({ role, delayMs }: SceneProps) {
  const ball = (
    <g {...SJ}>
      <path d="M12 4v8" stroke="#8fbcd8" strokeWidth="1.6" />
      <circle cx="12" cy="16" r="4" fill="#8fbcd8" stroke="#16232e" strokeWidth="1.2" />
      <circle cx="10.6" cy="14.6" r="1.1" fill="#fff4d6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g14-fw-hunt" l={6} t={22} w={40} h={56} d={40} st={{ transformOrigin: "50% 0%" }}>{ball}</V>
        <V c="g14-fw-hunt" l={54} t={22} w={40} h={56} d={40} st={{ transformOrigin: "50% 0%", scale: "-1 1" }}>{ball}</V>
        <L c="g14-fw-sleeve" l={36} t={62} w={28} h={9} d={330} st={{ borderRadius: "2px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hitside" l={10} t={18} w={38} h={54} d={0} st={{ transformOrigin: "50% 0%" }}>{ball}</V>
        <V c="g14-hit" l={52} t={18} w={38} h={54} d={130} st={{ transformOrigin: "50% 0%" }}>{ball}</V>
        <L c="g14-hit2" l={34} t={74} w={32} h={7} d={260} st={{ borderRadius: "2px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(143,188,216,0.26)" /><Rim tone="rgba(255,244,214,0.22)" /></>}>
      <V c="g14-freespin" l={45} t={30} w={10} h={10} d={90}>
        <circle cx="12" cy="12" r="9" fill="none" stroke="#8fbcd8" strokeWidth="1.6" strokeDasharray="3 2.4" />
      </V>
      {FW_ARMS.map((a, i) => (
        <P key={a} l={38} t={30} w={24} h={24} rot={`${a}deg`}>
          <V c="g14-fw-hunt" w={100} h={100} d={180 + i * 70} st={{ transformOrigin: "50% 0%" }}>{ball}</V>
        </P>
      ))}
      <L c="g14-fw-sleeve" l={44} t={46} w={12} h={3.4} d={430} st={{ borderRadius: "2px", background: "#fff4d6" }} />
      <L c="g14-jolt" l={41} t={51} w={18} h={2.2} d={560} st={{ borderRadius: "999px", background: "#8fbcd8" }} />
      <L c="g14-lean" l={47} t={34} w={10} h={10} d={640} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.6), transparent 70%)" }} />
      <L c="g14-glint" l={52} t={38} w={2.2} h={2.2} d={720} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* =============================================================================
   4. Foxtrot Slide — THE BELT JUMPS ITS PULLEY
   The flat belt walks to the edge of the crowned pulley, slides off, and the
   loose end whips back down the line and SLAPS the boards twice. The pulley,
   unloaded, spins up free. Aim-staged: the belt runs the real vector.
   Palette: #b98a5a / #ffeecd / #241708.
   ========================================================================== */
function FoxtrotSlideScene({ role, delayMs }: SceneProps) {
  const pulley = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="#b98a5a" strokeWidth="2.4" />
      <circle cx="12" cy="12" r="2.4" fill="#ffeecd" />
      <path d="M12 3v3.4M12 17.6V21M3 12h3.4M17.6 12H21" stroke="#241708" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g14-ent-shake" l={6} t={20} w={52} h={56} d={40}>{pulley}</V>
        <L c="g14-ft-belt" l={20} t={38} w={76} h={7} d={250} st={{ background: "#b98a5a", transformOrigin: "0% 50%" }} />
        <L c="g14-ft-slap" l={26} t={62} w={68} h={6} d={450} st={{ background: "#241708", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hitside" l={10} t={18} w={48} h={54} d={0}>{pulley}</V>
        <L c="g14-hit" l={22} t={42} w={70} h={6} d={140} st={{ background: "#b98a5a" }} />
        <L c="g14-hit2" l={28} t={70} w={60} h={4} d={260} st={{ borderRadius: "999px", background: "#ffeecd" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(185,138,90,0.26)" />}>
      <L c="g14-runout" l={46} t={48.4} w={30} h={2.2} d={90} st={{ background: "linear-gradient(90deg, #b98a5a, rgba(185,138,90,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g14-freespin" l={41} t={42} w={12} h={12} d={300}>{pulley}</V>
      <L c="g14-ft-belt" l={47} t={44} w={22} h={2.6} d={330} st={{ background: "#b98a5a", transformOrigin: "0% 50%" }} />
      <L c="g14-ft-slap" l={47} t={51} w={24} h={2.4} d={520} st={{ background: "#241708", transformOrigin: "0% 50%" }} />
      <L c="g14-puff" l={56} t={50} w={9} h={9} d={620} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,238,205,0.75), transparent 70%)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g14-spark" l={52 + i * 6} t={52} w={1.6} h={1.6} d={660 + i * 90} st={{ borderRadius: "50%", background: "#ffeecd" }} />
      ))}
    </AimLead>
  );
}

/* =============================================================================
   5. Gate Ledger — THE BOLT BACKS ITSELF OUT
   Nobody locked the nut. The bolt unwinds a quarter turn at a time, the washer
   walks off the thread and topples flat, and the hinge plate it was holding
   drops and hangs. Palette: #9aa6b4 / #fff4d6 / #1a2028.
   ========================================================================== */
function GateLedgerScene({ role, delayMs }: SceneProps) {
  const bolt = (
    <g {...SJ}>
      <path d="M5 8.4l3.4-2h7.2l3.4 2v7.2l-3.4 2H8.4L5 15.6z" fill="#9aa6b4" stroke="#1a2028" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="2.6" fill="#1a2028" />
    </g>
  );
  const washer = <circle cx="12" cy="12" r="8.4" fill="none" stroke="#fff4d6" strokeWidth="3.4" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g14-gl-back" l={20} t={12} w={54} h={54} d={40}>{bolt}</V>
        <V c="g14-gl-walk" l={44} t={48} w={44} h={40} d={280}>{washer}</V>
        <L c="g14-gl-drop" l={6} t={30} w={26} h={56} d={460} st={{ background: "#9aa6b4", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hitside" l={22} t={16} w={52} h={52} d={0}>{bolt}</V>
        <V c="g14-hit" l={46} t={50} w={40} h={38} d={140}>{washer}</V>
        <L c="g14-hit2" l={12} t={66} w={30} h={5} d={260} st={{ borderRadius: "999px", background: "#1a2028" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(154,166,180,0.24)" /><Rim tone="rgba(255,244,214,0.2)" /></>}>
      <L c="g14-strain" l={39} t={36} w={22} h={4} d={90} st={{ background: "#fff4d6", transformOrigin: "50% 100%" }} />
      <V c="g14-gl-back" l={44} t={38} w={12} h={12} d={200}>{bolt}</V>
      <V c="g14-gl-walk" l={52} t={45} w={9} h={9} d={430}>{washer}</V>
      <L c="g14-gl-drop" l={36} t={40} w={7} h={16} d={560} st={{ background: "linear-gradient(180deg, #9aa6b4, rgba(26,32,40,0.9))", transformOrigin: "50% 0%" }} />
      <L c="g14-jolt" l={38} t={55} w={20} h={2.2} d={620} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <L c="g14-castoff" l={54} t={50} w={2.4} h={2.4} d={700} st={{ borderRadius: "50%", background: "#9aa6b4" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g14-sift" l={45 + i * 8} t={53} w={1.5} h={1.5} d={740 + i * 100} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   6. Golden Aria — THE DRY JOINT LETS GO
   A gilt solder joint that never properly wetted goes dull and grey, a hairline
   opens right around the collar, and the wire lifts clear of the pad with one
   last thread of rosin smoke. Palette: #e6c25a / #fff4d6 / #2c2410.
   ========================================================================== */
function GoldenAriaScene({ role, delayMs }: SceneProps) {
  const joint = (fill: string) => (
    <g {...SJ}>
      <path d="M6 15c0-4 2.6-6 6-6s6 2 6 6z" fill={fill} stroke="#2c2410" strokeWidth="1.2" />
      <path d="M12 9V2.6" stroke="#e6c25a" strokeWidth="1.8" />
      <path d="M3.4 15h17.2" stroke="#2c2410" strokeWidth="1.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g14-ga-dull" l={16} t={20} w={68} h={62} d={40}>{joint("#e6c25a")}</V>
        <L c="g14-ga-crack" l={26} t={54} w={48} h={2.4} d={280} st={{ borderRadius: "999px", background: "#2c2410" }} />
        <V c="g14-ga-part" l={38} t={6} w={24} h={48} d={470}>
          <path d="M12 2v20" stroke="#fff4d6" strokeWidth="2.6" {...SJ} />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hitside" l={18} t={22} w={64} h={58} d={0}>{joint("#e6c25a")}</V>
        <L c="g14-hit" l={26} t={56} w={48} h={3} d={140} st={{ borderRadius: "999px", background: "#2c2410" }} />
        <L c="g14-hit2" l={44} t={20} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(230,194,90,0.26)" />}>
      <V c="g14-ga-dull" l={43} t={39} w={14} h={14} d={90}>{joint("#e6c25a")}</V>
      <L c="g14-ga-crack" l={43} t={47} w={14} h={1.6} d={330} st={{ borderRadius: "999px", background: "#2c2410" }} />
      <V c="g14-ga-part" l={47} t={32} w={6} h={12} d={520}>
        <path d="M12 2v20" stroke="#fff4d6" strokeWidth="3" {...SJ} />
      </V>
      <L c="g14-glint" l={49} t={45} w={2.4} h={2.4} d={560} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      <L c="g14-lean" l={45} t={36} w={10} h={12} d={640} st={{ background: "linear-gradient(0deg, rgba(255,244,214,0.62), transparent)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g14-sift" l={44 + i * 6} t={50} w={1.4} h={1.4} d={700 + i * 90} st={{ borderRadius: "50%", background: "#e6c25a" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   7. Grandfather's Watch — THE CLICK LETS GO
   The click that holds the barrel skips its ratchet, the whole train runs away,
   the hands blur round the dial in a second and a half, and it stops dead with
   the balance flat. Palette: #d9b46a / #fff2d8 / #2a1f10.
   ========================================================================== */
function GrandfathersWatchScene({ role, delayMs }: SceneProps) {
  const dial = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="9.4" fill="none" stroke="#d9b46a" strokeWidth="1.6" />
      <path d="M12 3.4v2M12 18.6v2M3.4 12h2M18.6 12h2" stroke="#2a1f10" strokeWidth="1.4" />
    </g>
  );
  const hand = <path d="M12 12V4.4" stroke="#fff2d8" strokeWidth="2.2" fill="none" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g14-ent-pop" l={14} t={14} w={72} h={72} d={40}>{dial}</V>
        <V c="g14-gw-race" l={14} t={14} w={72} h={72} d={260} st={{ transformOrigin: "50% 50%" }}>{hand}</V>
        <V c="g14-gw-unwind" l={30} t={30} w={40} h={40} d={450}>
          <circle cx="12" cy="12" r="7" fill="none" stroke="#d9b46a" strokeWidth="1.8" strokeDasharray="4 3" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hitside" l={16} t={16} w={68} h={68} d={0}>{dial}</V>
        <V c="g14-hit" l={16} t={16} w={68} h={68} d={140} st={{ transformOrigin: "50% 50%" }}>{hand}</V>
        <L c="g14-hit2" l={44} t={44} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#fff2d8" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(217,180,106,0.26)" /><Rim tone="rgba(255,242,216,0.22)" /></>}>
      <V c="g14-stall" l={41} t={35} w={18} h={18} d={90}>{dial}</V>
      <V c="g14-gw-unwind" l={44} t={38} w={12} h={12} d={200}>
        <circle cx="12" cy="12" r="7.4" fill="none" stroke="#d9b46a" strokeWidth="2" strokeDasharray="3.4 2.6" />
      </V>
      <V c="g14-gw-race" l={41} t={35} w={18} h={18} d={340} st={{ transformOrigin: "50% 50%" }}>{hand}</V>
      <L c="g14-jolt" l={40} t={53} w={20} h={2.2} d={600} st={{ borderRadius: "999px", background: "#fff2d8" }} />
      <L c="g14-castoff" l={52} t={44} w={2.4} h={2.4} d={660} st={{ borderRadius: "50%", background: "#d9b46a" }} />
      <L c="g14-glint" l={47} t={41} w={2.6} h={2.6} d={720} st={{ borderRadius: "50%", background: "#fff2d8" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g14-sift" l={45 + i * 7} t={52} w={1.4} h={1.4} d={760 + i * 90} st={{ borderRadius: "50%", background: "#d9b46a" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   8. Halo Round the Moon — THE FILAMENT SAGS AND BLOWS
   The lamp runs a shade too hot, the filament droops out of shape, and then it
   parts with a bright cold ring of light around the glass and a black smear up
   the inside. Palette: #b9c6f0 / #fff4d6 / #161a2c.
   ========================================================================== */
function HaloMoonScene({ role, delayMs }: SceneProps) {
  const bulb = (
    <g {...SJ}>
      <path d="M12 2.6a7 7 0 0 1 4.2 12.6V18H7.8v-2.8A7 7 0 0 1 12 2.6z" fill="none" stroke="#b9c6f0" strokeWidth="1.4" />
      <path d="M8.4 18.6h7.2v2.8H8.4z" fill="#161a2c" stroke="#b9c6f0" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g14-ent-rise" l={22} t={8} w={56} h={76} d={40}>{bulb}</V>
        <V c="g14-hm-sag" l={38} t={30} w={24} h={20} d={260}>
          <path d="M4 6c3 8 13 8 16 0" fill="none" stroke="#fff4d6" strokeWidth="2.4" {...SJ} />
        </V>
        <L c="g14-hm-halo" l={18} t={16} w={64} h={64} d={450} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hitside" l={24} t={10} w={52} h={72} d={0}>{bulb}</V>
        <L c="g14-hit" l={36} t={34} w={28} h={12} d={140} st={{ borderRadius: "999px", background: "#fff4d6" }} />
        <L c="g14-hit2" l={22} t={20} w={56} h={56} d={260} st={{ borderRadius: "50%", border: "2px solid #b9c6f0" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={<><Dim tone="rgba(10,12,22,0.44)" /><Wash tone="rgba(185,198,240,0.3)" d={120} /></>}
    >
      <V c="g14-ent-rise" l={44} t={34} w={12} h={18} d={90}>{bulb}</V>
      <V c="g14-hm-sag" l={45.5} t={40} w={9} h={7} d={280}>
        <path d="M4 6c3 8 13 8 16 0" fill="none" stroke="#fff4d6" strokeWidth="2.8" {...SJ} />
      </V>
      <L c="g14-hm-blow" l={44} t={38} w={12} h={12} d={520} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, rgba(185,198,240,0) 70%)" }} />
      <L c="g14-hm-halo" l={38} t={32} w={24} h={24} d={560} st={{ borderRadius: "50%", border: "2px solid #b9c6f0" }} />
      <L c="g14-lean" l={45} t={30} w={10} h={12} d={640} st={{ background: "linear-gradient(0deg, rgba(22,26,44,0.85), transparent)" }} />
      <L c="g14-glint" l={49} t={43} w={2.2} h={2.2} d={720} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* =============================================================================
   9. Hoofbeat Log — THE CHAIN JUMPS A TOOTH
   The chain rides up on a hooked sprocket tooth, hangs there for a beat, and
   drops back down one tooth out of step. The whole run lurches and the count
   is wrong from here on. Aim-staged: the chain runs the real vector.
   Palette: #8f9aa8 / #ffeccc / #191d24.
   ========================================================================== */
const HB_LINKS = [0, 1, 2, 3, 4];

function HoofbeatLogScene({ role, delayMs }: SceneProps) {
  const sprocket = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="7.4" fill="none" stroke="#8f9aa8" strokeWidth="2" />
      <path d="M12 2.6l1.4 2.4h-2.8zM21.4 12l-2.4 1.4v-2.8zM12 21.4l-1.4-2.4h2.8zM2.6 12l2.4-1.4v2.8z" fill="#8f9aa8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hb-sprocket" l={4} t={20} w={52} h={56} d={40}>{sprocket}</V>
        {HB_LINKS.slice(0, 4).map((i) => (
          <L key={i} c="g14-hb-ride" l={40 + i * 14} t={38} w={10} h={8} d={230 + i * 70} st={{ borderRadius: "2px", background: "#ffeccc" }} />
        ))}
        <L c="g14-hb-skip" l={30} t={62} w={60} h={5} d={460} st={{ borderRadius: "999px", background: "#191d24" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hitside" l={8} t={20} w={48} h={54} d={0}>{sprocket}</V>
        <L c="g14-hit" l={50} t={40} w={44} h={7} d={140} st={{ borderRadius: "2px", background: "#ffeccc" }} />
        <L c="g14-hit2" l={46} t={62} w={44} h={4} d={260} st={{ borderRadius: "999px", background: "#8f9aa8" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(143,154,168,0.26)" />}>
      <L c="g14-runout" l={46} t={48} w={28} h={2} d={90} st={{ background: "linear-gradient(90deg, #8f9aa8, rgba(143,154,168,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g14-hb-sprocket" l={40} t={42} w={12} h={12} d={220}>{sprocket}</V>
      {HB_LINKS.map((i) => (
        <L key={i} c="g14-hb-ride" l={51 + i * 4.4} t={44} w={3.4} h={2.4} d={300 + i * 80} st={{ borderRadius: "2px", background: "#ffeccc" }} />
      ))}
      <L c="g14-hb-skip" l={50} t={47.6} w={24} h={2} d={620} st={{ borderRadius: "999px", background: "#191d24", transformOrigin: "0% 50%" }} />
      <L c="g14-jolt" l={40} t={52} w={22} h={2.2} d={640} st={{ borderRadius: "999px", background: "#ffeccc" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g14-spark" l={46 + i * 6} t={50} w={1.6} h={1.6} d={700 + i * 90} st={{ borderRadius: "50%", background: "#ffeccc" }} />
      ))}
    </AimLead>
  );
}

/* =============================================================================
   10. House Lights Up — THE FUSE WIRE MELTS THROUGH
   The wire between the fuse posts glows, necks down in the middle, and goes
   with a hard blue flash; the carrier drops open and the whole run goes dark
   except for the afterimage. Palette: #6fc8f0 / #fff4d6 / #101c2a.
   ========================================================================== */
function HouseLightsUpScene({ role, delayMs }: SceneProps) {
  const posts = (
    <g {...SJ}>
      <path d="M3 6h5v12H3zM16 6h5v12h-5z" fill="#101c2a" stroke="#6fc8f0" strokeWidth="1.2" />
      <path d="M5.4 4.4v-2M18.6 4.4v-2" stroke="#6fc8f0" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g14-ent-drop" l={10} t={22} w={80} h={54} d={40}>{posts}</V>
        <L c="g14-hl-glow" l={32} t={46} w={36} h={4} d={250} st={{ borderRadius: "999px", background: "#fff4d6" }} />
        <L c="g14-hl-arc" l={22} t={26} w={56} h={44} d={450} st={{ borderRadius: "50%", background: "radial-gradient(circle, #6fc8f0, transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hitside" l={12} t={24} w={76} h={52} d={0}>{posts}</V>
        <L c="g14-hit" l={34} t={46} w={32} h={4} d={140} st={{ borderRadius: "999px", background: "#fff4d6" }} />
        <L c="g14-hit2" l={30} t={32} w={40} h={40} d={260} st={{ borderRadius: "50%", background: "radial-gradient(circle, #6fc8f0, transparent 68%)" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={<><Wash tone="rgba(111,200,240,0.3)" /><Dim tone="rgba(6,10,18,0.42)" d={520} /></>}
    >
      <V c="g14-ent-drop" l={41} t={40} w={18} h={12} d={90}>{posts}</V>
      <L c="g14-hl-glow" l={45} t={45} w={10} h={1.6} d={260} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <L c="g14-hl-part" l={49.4} t={44.6} w={1.6} h={2.4} d={480} st={{ borderRadius: "50%", background: "#101c2a" }} />
      <L c="g14-hl-arc" l={42} t={38} w={16} h={16} d={500} st={{ borderRadius: "50%", background: "radial-gradient(circle, #6fc8f0, transparent 70%)" }} />
      <L c="g14-castoff" l={48} t={48} w={2.4} h={2.4} d={620} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g14-sift" l={44 + i * 6} t={49} w={1.4} h={1.4} d={700 + i * 90} st={{ borderRadius: "50%", background: "#6fc8f0" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   11. Housewarming Gift — THE RELIEF VALVE CHATTERS
   Pressure comes up under the seat, the valve cracks open, slams shut, cracks
   again: it is chattering, hammering itself to pieces, and each cycle spits a
   short hard jet of steam. Palette: #e08a4a / #fff2d8 / #2a1408.
   ========================================================================== */
function HousewarmingGiftScene({ role, delayMs }: SceneProps) {
  const valve = (
    <g {...SJ}>
      <path d="M6 20V13l6-4 6 4v7z" fill="#e08a4a" stroke="#2a1408" strokeWidth="1.2" />
      <path d="M12 9V3.4M9 3.4h6" stroke="#2a1408" strokeWidth="1.4" />
      <path d="M4.4 20h15.2" stroke="#fff2d8" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hw-lift" l={20} t={30} w={60} h={58} d={40}>{valve}</V>
        <L c="g14-hw-jet" l={44} t={4} w={12} h={34} d={270} st={{ background: "linear-gradient(0deg, rgba(255,242,216,0.85), transparent)", transformOrigin: "50% 100%" }} />
        <L c="g14-hw-chatter" l={26} t={68} w={48} h={5} d={460} st={{ borderRadius: "999px", background: "#2a1408" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hitside" l={22} t={32} w={56} h={54} d={0}>{valve}</V>
        <L c="g14-hit" l={44} t={8} w={12} h={28} d={140} st={{ background: "linear-gradient(0deg, rgba(255,242,216,0.85), transparent)" }} />
        <L c="g14-hit2" l={34} t={78} w={32} h={4} d={260} st={{ borderRadius: "999px", background: "#e08a4a" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(224,138,74,0.28)" /><Rim tone="rgba(255,242,216,0.24)" /></>}>
      <L c="g14-strain" l={42} t={50} w={16} h={4} d={90} st={{ background: "#e08a4a", transformOrigin: "50% 100%" }} />
      <V c="g14-hw-lift" l={43} t={38} w={14} h={14} d={220}>{valve}</V>
      <L c="g14-hw-jet" l={47} t={26} w={6} h={14} d={380} st={{ background: "linear-gradient(0deg, rgba(255,242,216,0.9), transparent)", transformOrigin: "50% 100%" }} />
      <L c="g14-hw-chatter" l={44} t={44} w={12} h={2} d={480} st={{ borderRadius: "999px", background: "#fff2d8" }} />
      <L c="g14-jolt" l={41} t={52} w={18} h={2.2} d={560} st={{ borderRadius: "999px", background: "#2a1408" }} />
      <L c="g14-lean" l={45} t={28} w={11} h={13} d={660} st={{ background: "linear-gradient(0deg, rgba(255,242,216,0.55), transparent)" }} />
      <L c="g14-glint" l={52} t={40} w={2.2} h={2.2} d={720} st={{ borderRadius: "50%", background: "#fff2d8" }} />
    </Lead>
  );
}

/* =============================================================================
   12. Incident Report — THE BEARING SEIZES
   The journal runs dry, the shaft slows against a rising squeal, the race
   picks up colour and locks solid; blue smoke stands off the housing for a
   long time after. Palette: #ff9a52 / #fff4d6 / #24160c.
   ========================================================================== */
function IncidentReportScene({ role, delayMs }: SceneProps) {
  const race = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="#ff9a52" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4.6" fill="none" stroke="#24160c" strokeWidth="1.6" />
      <circle cx="12" cy="5.2" r="1.5" fill="#fff4d6" />
      <circle cx="18.8" cy="12" r="1.5" fill="#fff4d6" />
      <circle cx="12" cy="18.8" r="1.5" fill="#fff4d6" />
      <circle cx="5.2" cy="12" r="1.5" fill="#fff4d6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g14-ir-race" l={16} t={16} w={68} h={68} d={40}>{race}</V>
        <V c="g14-ir-grind" l={16} t={16} w={68} h={68} d={280}>
          <circle cx="12" cy="12" r="7" fill="none" stroke="#fff4d6" strokeWidth="1.6" strokeDasharray="4 3.4" />
        </V>
        <L c="g14-ir-smoke" l={38} t={2} w={24} h={44} d={460} st={{ background: "linear-gradient(0deg, rgba(255,154,82,0.7), transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hitside" l={18} t={18} w={64} h={64} d={0}>{race}</V>
        <L c="g14-hit" l={40} t={40} w={20} h={20} d={140} st={{ borderRadius: "50%", background: "#ff9a52" }} />
        <L c="g14-hit2" l={38} t={8} w={24} h={34} d={260} st={{ background: "linear-gradient(0deg, rgba(255,244,214,0.7), transparent)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(255,154,82,0.28)" /><Rim tone="rgba(36,22,12,0.5)" /></>}>
      <V c="g14-ir-race" l={42} t={38} w={16} h={16} d={90}>{race}</V>
      <V c="g14-ir-grind" l={44} t={40} w={12} h={12} d={300}>
        <circle cx="12" cy="12" r="7.4" fill="none" stroke="#fff4d6" strokeWidth="2" strokeDasharray="3.4 3" />
      </V>
      <L c="g14-jolt" l={41} t={53} w={18} h={2.2} d={520} st={{ borderRadius: "999px", background: "#24160c" }} />
      <L c="g14-ir-smoke" l={45} t={26} w={10} h={16} d={600} st={{ background: "linear-gradient(0deg, rgba(255,154,82,0.65), transparent)" }} />
      <L c="g14-lean" l={44} t={22} w={12} h={14} d={700} st={{ background: "linear-gradient(0deg, rgba(255,244,214,0.5), transparent)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g14-spark" l={46 + i * 5} t={48} w={1.6} h={1.6} d={640 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   13. King's Road Watch — THE GEAR STRIPS A TOOTH
   Two wheels mesh, one tooth shears off at the root and flies, and from then on
   the bare stub grinds past its opposite number once a revolution with a shock
   through the whole frame. Palette: #c2b28a / #fff4d6 / #262014.
   ========================================================================== */
function KingsRoadWatchScene({ role, delayMs }: SceneProps) {
  const wheel = (stroke: string) => (
    <g {...SJ}>
      <path d={GEAR} fill="none" stroke={stroke} strokeWidth="1.5" />
      <g stroke="#fff4d6">{HUB}</g>
    </g>
  );
  const tooth = <path d="M4 20L12 3l8 17z" fill="#fff4d6" stroke="#262014" strokeWidth="1.2" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g14-kr-mesh" l={2} t={20} w={56} h={56} d={40}>{wheel("#c2b28a")}</V>
        <V c="g14-kr-mesh" l={46} t={26} w={52} h={52} d={40} st={{ animationDirection: "reverse" }}>{wheel("#fff4d6")}</V>
        <V c="g14-kr-strip" l={40} t={54} w={26} h={26} d={300}>{tooth}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hitside" l={10} t={14} w={56} h={56} d={0}>{wheel("#c2b28a")}</V>
        <V c="g14-hit" l={54} t={44} w={34} h={34} d={140}>{tooth}</V>
        <L c="g14-hit2" l={20} t={80} w={56} h={4} d={260} st={{ borderRadius: "999px", background: "#262014" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(194,178,138,0.26)" />}>
      <V c="g14-kr-mesh" l={37} t={38} w={15} h={15} d={90}>{wheel("#c2b28a")}</V>
      <V c="g14-kr-mesh" l={50} t={40} w={13} h={13} d={90} st={{ animationDirection: "reverse" }}>{wheel("#fff4d6")}</V>
      <V c="g14-kr-strip" l={49} t={47} w={6} h={6} d={340}>{tooth}</V>
      <L c="g14-kr-grind" l={47} t={44} w={8} h={2.2} d={520} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <L c="g14-jolt" l={38} t={54} w={22} h={2.4} d={560} st={{ borderRadius: "999px", background: "#262014" }} />
      <L c="g14-castoff" l={52} t={46} w={2.6} h={2.6} d={660} st={{ borderRadius: "50%", background: "#c2b28a" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g14-sift" l={43 + i * 7} t={51} w={1.4} h={1.4} d={720 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   14. Lady's Escort — THE COTTER PIN WORKS OUT
   The split pin shakes its legs together, backs out of the castle nut, and the
   nut walks off the axle; the wheel it was holding goes out of true and
   wobbles worse every turn. Palette: #d7a0b4 / #fff4d6 / #2a1622.
   ========================================================================== */
function LadysEscortScene({ role, delayMs }: SceneProps) {
  const castleNut = (
    <g {...SJ}>
      <path d="M5.6 8.4l3.2-1.8h6.4l3.2 1.8v7.2l-3.2 1.8H8.8l-3.2-1.8z" fill="#d7a0b4" stroke="#2a1622" strokeWidth="1.2" />
      <path d="M8 6.6V4.4M12 6.6V4M16 6.6V4.4" stroke="#2a1622" strokeWidth="1.3" />
    </g>
  );
  const wheelRim = <circle cx="12" cy="12" r="9" fill="none" stroke="#fff4d6" strokeWidth="2.2" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g14-le-back" l={8} t={38} w={44} h={26} d={40}>
          <path d="M2 10h16l4 2-4 2H2z" fill="#fff4d6" stroke="#2a1622" strokeWidth="1.1" {...SJ} />
        </V>
        <V c="g14-le-spin" l={30} t={20} w={44} h={44} d={280}>{castleNut}</V>
        <V c="g14-le-wobble" l={22} t={14} w={60} h={60} d={470}>{wheelRim}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hitside" l={26} t={22} w={48} h={48} d={0}>{castleNut}</V>
        <V c="g14-hit" l={18} t={16} w={64} h={64} d={140}>{wheelRim}</V>
        <L c="g14-hit2" l={44} t={78} w={14} h={4} d={260} st={{ borderRadius: "999px", background: "#2a1622" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(215,160,180,0.26)" />}>
      <V c="g14-le-wobble" l={38} t={35} w={22} h={22} d={90}>{wheelRim}</V>
      <V c="g14-le-back" l={45} t={44} w={9} h={5} d={260}>
        <path d="M2 10h16l4 2-4 2H2z" fill="#fff4d6" stroke="#2a1622" strokeWidth="1.1" {...SJ} />
      </V>
      <V c="g14-le-spin" l={46} t={42} w={9} h={9} d={450}>{castleNut}</V>
      <L c="g14-castoff" l={53} t={47} w={2.6} h={2.6} d={600} st={{ borderRadius: "50%", background: "#d7a0b4" }} />
      <L c="g14-jolt" l={39} t={55} w={22} h={2.2} d={640} st={{ borderRadius: "999px", background: "#2a1622" }} />
      <L c="g14-glint" l={43} t={40} w={2.4} h={2.4} d={700} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g14-sift" l={46 + i * 7} t={53} w={1.4} h={1.4} d={760 + i * 90} st={{ borderRadius: "50%", background: "#d7a0b4" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   15. Morning Constitutional — THE BUSHING KNOCKS
   The bore has worn oval. Every stroke the shaft drops across the slop and
   knocks against the bottom of the bush, once a turn, with a limp you can hear
   from the yard. Palette: #7fa08a / #fff2d8 / #16261e.
   ========================================================================== */
function MorningConstitutionalScene({ role, delayMs }: SceneProps) {
  const bush = (
    <g {...SJ}>
      <path d="M3 8h18v8H3z" fill="none" stroke="#7fa08a" strokeWidth="1.6" />
      <path d="M3 8h18M3 16h18" stroke="#16261e" strokeWidth="1" />
    </g>
  );
  const shaft = <circle cx="12" cy="12" r="5.4" fill="#fff2d8" stroke="#16261e" strokeWidth="1.2" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g14-mc-oval" l={12} t={30} w={76} h={40} d={40}>{bush}</V>
        <V c="g14-mc-knock" l={30} t={26} w={44} h={44} d={280}>{shaft}</V>
        <L c="g14-mc-limp" l={16} t={72} w={68} h={5} d={460} st={{ borderRadius: "999px", background: "#16261e" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hitside" l={14} t={32} w={72} h={36} d={0}>{bush}</V>
        <V c="g14-hit" l={32} t={28} w={40} h={40} d={140}>{shaft}</V>
        <L c="g14-hit2" l={26} t={74} w={48} h={4} d={260} st={{ borderRadius: "999px", background: "#7fa08a" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(127,160,138,0.26)" /><Rim tone="rgba(255,242,216,0.2)" /></>}>
      <V c="g14-mc-oval" l={40} t={42} w={20} h={10} d={90}>{bush}</V>
      <V c="g14-mc-knock" l={45} t={41} w={10} h={10} d={260}>{shaft}</V>
      <L c="g14-mc-limp" l={41} t={51} w={18} h={2} d={480} st={{ borderRadius: "999px", background: "#16261e" }} />
      <L c="g14-jolt" l={39} t={54} w={22} h={2.2} d={560} st={{ borderRadius: "999px", background: "#fff2d8" }} />
      <L c="g14-lean" l={45} t={34} w={10} h={11} d={640} st={{ background: "linear-gradient(0deg, rgba(127,160,138,0.55), transparent)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g14-sift" l={43 + i * 7} t={52} w={1.4} h={1.4} d={700 + i * 90} st={{ borderRadius: "50%", background: "#fff2d8" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   16. Opening Chord — THE SEAM UNZIPS
   One boiler rivet lets go with a crack you feel in your teeth, and its
   neighbours go one after another down the lap seam like a chord being rolled,
   until the plate springs proud of the shell. Aim-staged: the seam runs the
   real vector. Palette: #c86a52 / #fff4d6 / #24120c.
   ========================================================================== */
const OC_RIVETS = [0, 1, 2, 3, 4];

function OpeningChordScene({ role, delayMs }: SceneProps) {
  const rivet = <circle cx="12" cy="12" r="6.4" fill="#c86a52" stroke="#24120c" strokeWidth="1.4" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g14-oc-unzip" l={6} t={44} w={88} h={5} d={40} st={{ borderRadius: "999px", background: "#24120c", transformOrigin: "0% 50%" }} />
        {OC_RIVETS.slice(0, 4).map((i) => (
          <V key={i} c="g14-oc-pop" l={10 + i * 21} t={36} w={18} h={18} d={230 + i * 80}>{rivet}</V>
        ))}
        <L c="g14-oc-plate" l={8} t={54} w={84} h={22} d={470} st={{ background: "linear-gradient(180deg, #c86a52, rgba(36,18,12,0.9))", transformOrigin: "0% 0%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g14-hitside" l={8} t={44} w={84} h={5} d={0} st={{ borderRadius: "999px", background: "#24120c" }} />
        <V c="g14-hit" l={38} t={32} w={24} h={24} d={140}>{rivet}</V>
        <L c="g14-hit2" l={20} t={62} w={60} h={5} d={260} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(200,106,82,0.28)" /><Rim tone="rgba(255,244,214,0.22)" /></>}>
      <L c="g14-runout" l={45} t={48} w={30} h={2} d={90} st={{ background: "linear-gradient(90deg, #24120c, rgba(36,18,12,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      {OC_RIVETS.map((i) => (
        <V key={i} c="g14-oc-pop" l={46 + i * 5.4} t={45} w={4.6} h={4.6} d={240 + i * 90}>{rivet}</V>
      ))}
      <L c="g14-oc-unzip" l={46} t={48.6} w={26} h={1.6} d={300} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "0% 50%" }} />
      <L c="g14-oc-plate" l={46} t={50} w={24} h={6} d={620} st={{ background: "linear-gradient(180deg, #c86a52, rgba(36,18,12,0.9))", transformOrigin: "0% 0%" }} />
      <L c="g14-puff" l={54} t={44} w={9} h={9} d={660} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.7), transparent 70%)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g14-spark" l={50 + i * 6} t={47} w={1.6} h={1.6} d={700 + i * 80} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </AimLead>
  );
}

/* =============================================================================
   17. Plaza Lantern — THE MANTLE CRUMBLES
   The incandescent mantle has gone to ash and one knock is all it takes: it
   collapses in flakes, the flame stops being white and starts guttering
   yellow, and the glass sooties over. Palette: #ffcf8a / #fff4d6 / #2a1c0e.
   ========================================================================== */
const PL_FLAKES = [0, 1, 2, 3];

function PlazaLanternScene({ role, delayMs }: SceneProps) {
  const lamp = (
    <g {...SJ}>
      <path d="M6 8h12v11H6z" fill="none" stroke="#ffcf8a" strokeWidth="1.4" />
      <path d="M4.4 8l2-3.4h11.2l2 3.4M4.4 19.4h15.2" stroke="#2a1c0e" strokeWidth="1.3" />
    </g>
  );
  const mantle = <path d="M9 8h6l1.4 6.4c0 2.4-1.8 3.6-4.4 3.6s-4.4-1.2-4.4-3.6z" fill="#fff4d6" stroke="#2a1c0e" strokeWidth="1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g14-ent-rise" l={16} t={12} w={68} h={72} d={40}>{lamp}</V>
        <V c="g14-pl-crumb" l={32} t={30} w={36} h={40} d={270}>{mantle}</V>
        <L c="g14-pl-gutter" l={42} t={40} w={16} h={26} d={460} st={{ background: "linear-gradient(0deg, #ffcf8a, transparent)", transformOrigin: "50% 100%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hitside" l={18} t={14} w={64} h={68} d={0}>{lamp}</V>
        <V c="g14-hit" l={34} t={32} w={32} h={36} d={140}>{mantle}</V>
        <L c="g14-hit2" l={42} t={62} w={16} h={16} d={260} st={{ borderRadius: "50%", background: "radial-gradient(circle, #ffcf8a, transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Dim tone="rgba(12,10,6,0.4)" /><Wash tone="rgba(255,207,138,0.3)" d={120} /></>}>
      <V c="g14-ent-rise" l={43} t={35} w={14} h={17} d={90}>{lamp}</V>
      <V c="g14-pl-crumb" l={46} t={40} w={8} h={9} d={280}>{mantle}</V>
      <L c="g14-pl-gutter" l={47.4} t={41} w={5} h={9} d={470} st={{ background: "linear-gradient(0deg, #ffcf8a, transparent)", transformOrigin: "50% 100%" }} />
      <L c="g14-pl-soot" l={44} t={34} w={12} h={9} d={620} st={{ background: "linear-gradient(0deg, rgba(42,28,14,0.85), transparent)" }} />
      <L c="g14-lean" l={45} t={28} w={10} h={12} d={680} st={{ background: "linear-gradient(0deg, rgba(255,244,214,0.5), transparent)" }} />
      {PL_FLAKES.map((i) => (
        <L key={i} c="g14-sift" l={44 + i * 4} t={49} w={1.4} h={1.4} d={700 + i * 80} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   18. Postern Watch — THE CABLE PARTS
   The bell cable has been rubbing on the same guide for years. One strand
   springs out, then three, then the whole rope goes with a crack and both ends
   recoil away from the break. Aim-staged: the run is the real vector.
   Palette: #a89078 / #fff2d8 / #221a12.
   ========================================================================== */
const PW_STRANDS = [0, 1, 2];

function PosternWatchScene({ role, delayMs }: SceneProps) {
  const guide = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="7.4" fill="none" stroke="#a89078" strokeWidth="2.2" />
      <circle cx="12" cy="12" r="2" fill="#221a12" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g14-ent-drop" l={4} t={42} w={92} h={6} d={40} st={{ borderRadius: "999px", background: "#a89078" }} />
        {PW_STRANDS.map((i) => (
          <L key={i} c="g14-pw-fray" l={40 + i * 8} t={38} w={16} h={2.4} d={260 + i * 90} st={{ borderRadius: "999px", background: "#fff2d8", transformOrigin: "0% 50%" }} />
        ))}
        <V c="g14-pw-slack" l={62} t={26} w={34} h={34} d={470}>{guide}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g14-hitside" l={6} t={44} w={88} h={5} d={0} st={{ borderRadius: "999px", background: "#a89078" }} />
        <L c="g14-hit" l={38} t={36} w={24} h={3} d={140} st={{ borderRadius: "999px", background: "#fff2d8" }} />
        <V c="g14-hit2" l={58} t={54} w={30} h={30} d={260}>{guide}</V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(168,144,120,0.26)" />}>
      <L c="g14-runout" l={45} t={48} w={30} h={2.4} d={90} st={{ background: "linear-gradient(90deg, #a89078, rgba(168,144,120,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      {PW_STRANDS.map((i) => (
        <L key={i} c="g14-pw-fray" l={52 + i * 4} t={46} w={6} h={1.4} d={280 + i * 90} st={{ borderRadius: "999px", background: "#fff2d8", transformOrigin: "0% 50%" }} />
      ))}
      <L c="g14-pw-part" l={50} t={47.4} w={12} h={2} d={560} st={{ borderRadius: "999px", background: "#221a12", transformOrigin: "100% 50%" }} />
      <V c="g14-pw-slack" l={41} t={43} w={11} h={11} d={620}>{guide}</V>
      <L c="g14-jolt" l={44} t={53} w={20} h={2.2} d={640} st={{ borderRadius: "999px", background: "#fff2d8" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g14-sift" l={50 + i * 6} t={50} w={1.4} h={1.4} d={700 + i * 90} st={{ borderRadius: "50%", background: "#a89078" }} />
      ))}
    </AimLead>
  );
}

/* =============================================================================
   19. Red Sky at Morning — THE WINDINGS COOK
   Overloaded coils come up through dull red, the varnish on the insulation
   smokes, and one turn arcs across to its neighbour and takes the whole
   armature with it. Palette: #e05a4a / #fff2d8 / #2a0e0c.
   ========================================================================== */
const RS_COILS = [0, 1, 2];

function RedSkyMorningScene({ role, delayMs }: SceneProps) {
  const armature = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="#2a0e0c" strokeWidth="1.6" />
      <path d="M12 3v18M4.4 7.6l15.2 8.8M4.4 16.4l15.2-8.8" stroke="#e05a4a" strokeWidth="1.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g14-rs-heat" l={14} t={14} w={72} h={72} d={40}>{armature}</V>
        <L c="g14-rs-short" l={30} t={30} w={40} h={4} d={280} st={{ borderRadius: "999px", background: "#fff2d8" }} />
        <L c="g14-rs-reek" l={34} t={2} w={32} h={44} d={470} st={{ background: "linear-gradient(0deg, rgba(224,90,74,0.7), transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hitside" l={16} t={16} w={68} h={68} d={0}>{armature}</V>
        <L c="g14-hit" l={32} t={44} w={36} h={4} d={140} st={{ borderRadius: "999px", background: "#fff2d8" }} />
        <L c="g14-hit2" l={30} t={30} w={40} h={40} d={260} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(224,90,74,0.8), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Dim tone="rgba(14,6,6,0.4)" /><Wash tone="rgba(224,90,74,0.32)" d={120} /></>}>
      <V c="g14-rs-heat" l={42} t={38} w={16} h={16} d={90}>{armature}</V>
      {RS_COILS.map((i) => (
        <L key={i} c="g14-rs-short" l={45} t={42 + i * 3.4} w={10} h={1.4} d={300 + i * 90} st={{ borderRadius: "999px", background: "#fff2d8" }} />
      ))}
      <L c="g14-spark" l={52} t={44} w={2} h={2} d={560} st={{ borderRadius: "50%", background: "#fff2d8" }} />
      <L c="g14-rs-reek" l={45} t={26} w={10} h={16} d={620} st={{ background: "linear-gradient(0deg, rgba(42,14,12,0.85), transparent)" }} />
      <L c="g14-lean" l={44} t={22} w={12} h={14} d={700} st={{ background: "linear-gradient(0deg, rgba(224,90,74,0.55), transparent)" }} />
    </Lead>
  );
}

/* =============================================================================
   20. Ripe for Picking — THE FLYWHEEL LOSES ITS KEY
   The woodruff key creeps up out of its slot and drops away. Nothing is
   driving the flywheel now: it slows out of step with the shaft, wanders off
   its seat and leans. Palette: #7fbf9a / #fff4d6 / #12281e.
   ========================================================================== */
function RipeForPickingScene({ role, delayMs }: SceneProps) {
  const flywheel = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="9.2" fill="none" stroke="#7fbf9a" strokeWidth="2.6" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="#12281e" strokeWidth="1.6" />
      <path d="M12 3.4v5.4M12 15.2v5.4M3.4 12h5.4M15.2 12h5.4" stroke="#7fbf9a" strokeWidth="1.4" />
    </g>
  );
  const key = <path d="M8 4h8v16H8z" fill="#fff4d6" stroke="#12281e" strokeWidth="1.2" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g14-ent-pop" l={14} t={14} w={72} h={72} d={40}>{flywheel}</V>
        <V c="g14-rp-key" l={42} t={30} w={16} h={40} d={270}>{key}</V>
        <V c="g14-rp-free" l={14} t={14} w={72} h={72} d={460}>
          <circle cx="12" cy="12" r="9.2" fill="none" stroke="#fff4d6" strokeWidth="1.4" strokeDasharray="3.4 3" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hitside" l={16} t={16} w={68} h={68} d={0}>{flywheel}</V>
        <V c="g14-hit" l={44} t={34} w={14} h={34} d={140}>{key}</V>
        <L c="g14-hit2" l={34} t={80} w={32} h={4} d={260} st={{ borderRadius: "999px", background: "#12281e" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(127,191,154,0.26)" /><Rim tone="rgba(255,244,214,0.2)" /></>}>
      <V c="g14-rp-free" l={41} t={36} w={18} h={18} d={90}>{flywheel}</V>
      <V c="g14-rp-key" l={48} t={41} w={4} h={9} d={300}>{key}</V>
      <L c="g14-castoff" l={49} t={50} w={2.6} h={2.6} d={520} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      <V c="g14-rp-walk" l={41} t={36} w={18} h={18} d={600}>
        <circle cx="12" cy="12" r="9.2" fill="none" stroke="#12281e" strokeWidth="1.6" strokeDasharray="4 3.4" />
      </V>
      <L c="g14-jolt" l={39} t={55} w={22} h={2.2} d={640} st={{ borderRadius: "999px", background: "#7fbf9a" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g14-sift" l={44 + i * 6} t={53} w={1.4} h={1.4} d={700 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   21. Stoppage Time — SOMETHING GOT INTO THE TRAIN
   A loose nut drops off the frame, bounces once, and goes straight into the
   mesh. The whole train stops dead against it, the drive bucks, and nothing
   moves again. Palette: #b0b6c0 / #fff4d6 / #1c1f26.
   ========================================================================== */
function StoppageTimeScene({ role, delayMs }: SceneProps) {
  const nut = (
    <path d="M6 8.6l4.6-2.6h2.8L18 8.6v6.8L13.4 18h-2.8L6 15.4z" fill="#fff4d6" stroke="#1c1f26" strokeWidth="1.3" {...SJ} />
  );
  const wheel = (
    <g {...SJ}>
      <path d={GEAR} fill="none" stroke="#b0b6c0" strokeWidth="1.5" />
      <g stroke="#1c1f26">{HUB}</g>
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g14-st-drop" l={38} t={2} w={26} h={34} d={40}>{nut}</V>
        <V c="g14-st-jam" l={8} t={30} w={52} h={52} d={280}>{wheel}</V>
        <L c="g14-st-buck" l={20} t={78} w={62} h={5} d={460} st={{ borderRadius: "999px", background: "#1c1f26" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hitside" l={20} t={20} w={56} h={56} d={0}>{wheel}</V>
        <V c="g14-hit" l={40} t={4} w={22} h={30} d={140}>{nut}</V>
        <L c="g14-hit2" l={28} t={78} w={44} h={4} d={260} st={{ borderRadius: "999px", background: "#b0b6c0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(176,182,192,0.26)" /><Rim tone="rgba(28,31,38,0.42)" /></>}>
      <V c="g14-stall" l={39} t={38} w={15} h={15} d={90}>{wheel}</V>
      <V c="g14-st-drop" l={49} t={28} w={6} h={9} d={260}>{nut}</V>
      <V c="g14-st-jam" l={50} t={39} w={13} h={13} d={470} st={{ animationDirection: "reverse" }}>{wheel}</V>
      <L c="g14-st-buck" l={38} t={53} w={24} h={2.4} d={560} st={{ borderRadius: "999px", background: "#1c1f26" }} />
      <L c="g14-spark" l={50} t={46} w={1.8} h={1.8} d={620} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g14-sift" l={44 + i * 6} t={51} w={1.4} h={1.4} d={700 + i * 90} st={{ borderRadius: "50%", background: "#b0b6c0" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   22. Town Square Sentry — THE SLIDE OVERRUNS
   The limit switch never made, so the carriage keeps going past where it
   should have stopped, hits the hard stop at full speed and rebounds down the
   ways. Aim-staged: it runs the real vector. Palette: #e0b040 / #fff4d6 /
   #2a2010.
   ========================================================================== */
function TownSquareSentryScene({ role, delayMs }: SceneProps) {
  const carriage = (
    <g {...SJ}>
      <path d="M3 8h18v9H3z" fill="#e0b040" stroke="#2a2010" strokeWidth="1.2" />
      <path d="M6 17v3M18 17v3" stroke="#2a2010" strokeWidth="1.4" />
      <path d="M6 11h12" stroke="#fff4d6" strokeWidth="1.2" />
    </g>
  );
  const stop = <path d="M18 3h4v18h-4z" fill="#2a2010" stroke="#fff4d6" strokeWidth="1.2" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g14-ent-drop" l={4} t={62} w={92} h={5} d={40} st={{ borderRadius: "999px", background: "#2a2010" }} />
        <V c="g14-ts-run" l={4} t={26} w={52} h={40} d={260}>{carriage}</V>
        <V c="g14-ts-crash" l={62} t={14} w={34} h={62} d={470}>{stop}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hitside" l={8} t={28} w={52} h={40} d={0}>{carriage}</V>
        <V c="g14-hit" l={62} t={16} w={30} h={58} d={140}>{stop}</V>
        <L c="g14-hit2" l={12} t={72} w={76} h={4} d={260} st={{ borderRadius: "999px", background: "#e0b040" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(224,176,64,0.26)" /><Rim tone="rgba(255,244,214,0.22)" /></>}>
      <L c="g14-runout" l={45} t={50} w={30} h={2} d={90} st={{ background: "linear-gradient(90deg, #2a2010, rgba(42,32,16,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g14-ts-run" l={45} t={42} w={11} h={8} d={280}>{carriage}</V>
      <V c="g14-ts-crash" l={62} t={40} w={6} h={12} d={560}>{stop}</V>
      <L c="g14-ts-rebound" l={54} t={44} w={9} h={2.4} d={640} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <L c="g14-jolt" l={46} t={52} w={22} h={2.2} d={660} st={{ borderRadius: "999px", background: "#e0b040" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g14-spark" l={60 + i * 3} t={46} w={1.6} h={1.6} d={700 + i * 80} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </AimLead>
  );
}

/* =============================================================================
   23. Backwards Hat — THE DOG DROPS INTO REVERSE
   The reversing dog is worn round and slips out of forward. It hangs in
   neutral for one horrible beat, then bites in the other direction and the
   whole line runs backwards. Aim-staged. Palette: #7ea8d8 / #fff2d8 / #14202e.
   ========================================================================== */
function BackwardsHatScene({ role, delayMs }: SceneProps) {
  const dog = (
    <g {...SJ}>
      <path d="M4 9h11l5 3-5 3H4z" fill="#7ea8d8" stroke="#14202e" strokeWidth="1.2" />
      <path d="M7 9V4.4M11 9V4.4" stroke="#14202e" strokeWidth="1.3" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g14-bh-slip" l={10} t={30} w={60} h={40} d={40}>{dog}</V>
        <L c="g14-ent-shake" l={6} t={62} w={88} h={5} d={260} st={{ borderRadius: "999px", background: "#14202e" }} />
        <L c="g14-bh-reverse" l={20} t={16} w={60} h={7} d={460} st={{ borderRadius: "999px", background: "#fff2d8" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hitside" l={14} t={30} w={56} h={40} d={0}>{dog}</V>
        <L c="g14-hit" l={16} t={18} w={64} h={5} d={140} st={{ borderRadius: "999px", background: "#fff2d8" }} />
        <L c="g14-hit2" l={20} t={70} w={56} h={4} d={260} st={{ borderRadius: "999px", background: "#7ea8d8" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(126,168,216,0.26)" />}>
      <L c="g14-runout" l={45} t={51} w={30} h={2} d={90} st={{ background: "linear-gradient(90deg, #7ea8d8, rgba(126,168,216,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g14-bh-slip" l={45} t={42} w={12} h={8} d={280}>{dog}</V>
      <L c="g14-bh-reverse" l={44} t={45} w={22} h={2.4} d={520} st={{ borderRadius: "999px", background: "#fff2d8", transformOrigin: "100% 50%" }} />
      <L c="g14-jolt" l={42} t={54} w={22} h={2.2} d={560} st={{ borderRadius: "999px", background: "#14202e" }} />
      <L c="g14-puff" l={40} t={44} w={9} h={9} d={640} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,216,0.7), transparent 70%)" }} />
      <L c="g14-glint" l={52} t={41} w={2.4} h={2.4} d={720} st={{ borderRadius: "50%", background: "#fff2d8" }} />
    </AimLead>
  );
}

/* =============================================================================
   24. Fresh Socks — THE GLAND PACKING BLOWS
   The stuffing box has been weeping for weeks. The gland nut lets go, the old
   packing rings squirt out in a rope, and a flat sheet of steam comes out
   sideways at the rod. Palette: #cfd6c8 / #fff4d6 / #1e241c.
   ========================================================================== */
const FK_RINGS = [0, 1, 2];

function FreshSocksScene({ role, delayMs }: SceneProps) {
  const box = (
    <g {...SJ}>
      <path d="M4 7h11v10H4z" fill="none" stroke="#cfd6c8" strokeWidth="1.6" />
      <path d="M15 9.4h5v5.2h-5z" fill="#1e241c" stroke="#cfd6c8" strokeWidth="1.2" />
      <path d="M2 12h18" stroke="#fff4d6" strokeWidth="1.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g14-ent-shake" l={10} t={26} w={70} h={48} d={40}>{box}</V>
        {FK_RINGS.map((i) => (
          <L key={i} c="g14-fk-blow" l={56 + i * 10} t={44} w={10} h={10} d={260 + i * 90} st={{ borderRadius: "50%", border: "2px solid #cfd6c8" }} />
        ))}
        <L c="g14-fk-jet" l={44} t={54} w={52} h={12} d={470} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.85), transparent)", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hitside" l={12} t={28} w={66} h={44} d={0}>{box}</V>
        <L c="g14-hit" l={54} t={40} w={16} h={16} d={140} st={{ borderRadius: "50%", border: "2px solid #cfd6c8" }} />
        <L c="g14-hit2" l={44} t={54} w={48} h={8} d={260} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.8), transparent)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(207,214,200,0.26)" /><Rim tone="rgba(30,36,28,0.4)" /></>}>
      <L c="g14-strain" l={41} t={49} w={18} h={3.4} d={90} st={{ background: "#cfd6c8", transformOrigin: "50% 100%" }} />
      <V c="g14-ent-shake" l={40} t={39} w={18} h={12} d={200}>{box}</V>
      {FK_RINGS.map((i) => (
        <L key={i} c="g14-fk-blow" l={55 + i * 3.4} t={43} w={3.4} h={3.4} d={340 + i * 90} st={{ borderRadius: "50%", border: "2px solid #cfd6c8" }} />
      ))}
      <L c="g14-fk-jet" l={54} t={43.6} w={14} h={3.4} d={560} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.9), transparent)", transformOrigin: "0% 50%" }} />
      <L c="g14-lean" l={45} t={30} w={12} h={13} d={660} st={{ background: "linear-gradient(0deg, rgba(255,244,214,0.5), transparent)" }} />
      <L c="g14-jolt" l={40} t={53} w={20} h={2.2} d={620} st={{ borderRadius: "999px", background: "#1e241c" }} />
      <L c="g14-glint" l={52} t={40} w={2.2} h={2.2} d={720} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* =============================================================================
   25. Name Tag — THE CONTACTS WELD SHUT
   One inrush too many. The relay contacts arc, wet, and weld together; the
   armature buzzes against a coil that has already lost the argument, and the
   circuit stays made whatever anyone does. Palette: #ffb35a / #fff4d6 /
   #2a1a0c.
   ========================================================================== */
function NameTagScene({ role, delayMs }: SceneProps) {
  const relay = (
    <g {...SJ}>
      <path d="M3 14h7l4-6" fill="none" stroke="#ffb35a" strokeWidth="1.8" />
      <path d="M14 8h7" stroke="#2a1a0c" strokeWidth="1.8" />
      <path d="M4 17h6v4H4z" fill="#2a1a0c" stroke="#ffb35a" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g14-ent-pop" l={14} t={22} w={72} h={56} d={40}>{relay}</V>
        <L c="g14-nt-arc" l={52} t={26} w={18} h={18} d={270} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 70%)" }} />
        <L c="g14-nt-buzz" l={16} t={68} w={40} h={8} d={460} st={{ borderRadius: "2px", background: "#ffb35a" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hitside" l={16} t={24} w={68} h={54} d={0}>{relay}</V>
        <L c="g14-hit" l={50} t={24} w={22} h={22} d={140} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 68%)" }} />
        <L c="g14-hit2" l={30} t={72} w={40} h={5} d={260} st={{ borderRadius: "999px", background: "#ffb35a" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Dim tone="rgba(12,8,4,0.38)" /><Wash tone="rgba(255,179,90,0.3)" d={120} /></>}>
      <V c="g14-ent-pop" l={42} t={38} w={16} h={14} d={90}>{relay}</V>
      <L c="g14-nt-arc" l={51} t={39} w={7} h={7} d={300} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff4d6, transparent 70%)" }} />
      <L c="g14-nt-weld" l={51} t={41.4} w={5} h={1.6} d={520} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <L c="g14-nt-buzz" l={43} t={47} w={8} h={2.6} d={600} st={{ borderRadius: "2px", background: "#ffb35a" }} />
      <L c="g14-spark" l={54} t={40} w={1.8} h={1.8} d={640} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      <L c="g14-glint" l={46} t={36} w={2.4} h={2.4} d={720} st={{ borderRadius: "50%", background: "#ffb35a" }} />
    </Lead>
  );
}

/* =============================================================================
   26. Pigeon Post — THE CARRIER STICKS IN THE TUBE
   The despatch carrier shoots off down the pneumatic run, hits a dented
   section halfway, and stops with its felt seals squealing while the whole
   line's pressure vents past it. Aim-staged. Palette: #b8a8d0 / #fff4d6 /
   #221c30.
   ========================================================================== */
function PigeonPostScene({ role, delayMs }: SceneProps) {
  const carrier = (
    <g {...SJ}>
      <path d="M3 8h13l5 4-5 4H3z" fill="#b8a8d0" stroke="#221c30" strokeWidth="1.2" />
      <path d="M6 8v8M10 8v8" stroke="#fff4d6" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g14-ent-drop" l={4} t={38} w={92} h={24} d={40} st={{ border: "2px solid #221c30" }} />
        <V c="g14-pp-shoot" l={4} t={40} w={44} h={20} d={260}>{carrier}</V>
        <L c="g14-pp-vent" l={44} t={30} w={52} h={8} d={470} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.85), transparent)", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g14-hitside" l={6} t={40} w={88} h={20} d={0} st={{ border: "2px solid #221c30" }} />
        <V c="g14-hit" l={30} t={42} w={40} h={16} d={140}>{carrier}</V>
        <L c="g14-hit2" l={52} t={30} w={40} h={6} d={260} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.8), transparent)" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(184,168,208,0.26)" />}>
      <L c="g14-runout" l={45} t={46} w={30} h={5} d={90} st={{ border: "2px solid #221c30", transformOrigin: "0% 50%" }} />
      <V c="g14-pp-shoot" l={45} t={45.6} w={9} h={5} d={280}>{carrier}</V>
      <L c="g14-pp-jam" l={57} t={45} w={3} h={6} d={520} st={{ borderRadius: "1px", background: "#221c30" }} />
      <L c="g14-pp-vent" l={58} t={46.4} w={14} h={3} d={600} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.9), transparent)", transformOrigin: "0% 50%" }} />
      <L c="g14-jolt" l={46} t={52} w={22} h={2.2} d={640} st={{ borderRadius: "999px", background: "#b8a8d0" }} />
      <L c="g14-puff" l={54} t={42} w={9} h={9} d={700} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.7), transparent 70%)" }} />
    </AimLead>
  );
}

/* =============================================================================
   27. Spare Button — THE MAIN LEAF CRACKS
   The spring stack flattens under one load too many, the main leaf splits
   across at the centre bolt with a bang, and the whole stack settles onto the
   axle stop an inch lower than it was. Palette: #9fb0b8 / #fff2d8 / #1a2226.
   ========================================================================== */
const SB_LEAVES = [0, 1, 2];

function SpareButtonScene({ role, delayMs }: SceneProps) {
  const leaf = (stroke: string) => (
    <path d="M2 8C7 14 17 14 22 8" fill="none" stroke={stroke} strokeWidth="2.4" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        {SB_LEAVES.map((i) => (
          <V key={i} c="g14-sb-load" l={6} t={22 + i * 12} w={88} h={40} d={40 + i * 70}>{leaf(i ? "#9fb0b8" : "#fff2d8")}</V>
        ))}
        <L c="g14-sb-crack" l={46} t={26} w={5} h={26} d={280} st={{ borderRadius: "1px", background: "#1a2226" }} />
        <L c="g14-sb-settle" l={16} t={70} w={68} h={6} d={470} st={{ borderRadius: "999px", background: "#9fb0b8" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g14-hitside" l={8} t={26} w={84} h={40} d={0}>{leaf("#9fb0b8")}</V>
        <L c="g14-hit" l={46} t={28} w={5} h={24} d={140} st={{ borderRadius: "1px", background: "#fff2d8" }} />
        <L c="g14-hit2" l={22} t={70} w={56} h={4} d={260} st={{ borderRadius: "999px", background: "#1a2226" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(159,176,184,0.26)" /><Rim tone="rgba(255,242,216,0.2)" /></>}>
      {SB_LEAVES.map((i) => (
        <V key={i} c="g14-sb-load" l={38} t={38 + i * 3.4} w={24} h={11} d={90 + i * 70}>{leaf(i ? "#9fb0b8" : "#fff2d8")}</V>
      ))}
      <L c="g14-sb-crack" l={49.4} t={39} w={1.6} h={7} d={420} st={{ borderRadius: "1px", background: "#1a2226" }} />
      <L c="g14-jolt" l={38} t={52} w={24} h={2.4} d={520} st={{ borderRadius: "999px", background: "#fff2d8" }} />
      <L c="g14-sb-settle" l={41} t={49} w={18} h={2.6} d={620} st={{ borderRadius: "999px", background: "#9fb0b8" }} />
      <L c="g14-castoff" l={51} t={45} w={2.4} h={2.4} d={680} st={{ borderRadius: "50%", background: "#9fb0b8" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g14-sift" l={43 + i * 6} t={51} w={1.4} h={1.4} d={720 + i * 90} st={{ borderRadius: "50%", background: "#fff2d8" }} />
      ))}
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
  op_first_class_stamp: S(FirstClassStampScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "bust", anchor: "cast" }),
  op_first_robin: S(FirstRobinScene, { ordering: "file", staggerMs: 70, victims: ["p"], hasLead: true, sound: "clockcage", anchor: "cast" }),
  op_four_winds: S(FourWindsScene, { ordering: "octagon", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage", anchor: "cast" }),
  op_foxtrot_slide: S(FoxtrotSlideScene, { ordering: "line", staggerMs: 60, victims: ["k"], hasLead: true, sound: "blitz", anchor: "aim" }),
  op_gate_ledger: S(GateLedgerScene, { ordering: "radial", staggerMs: 0, victims: ["b", "r", "q"], hasLead: true, sound: "siege", anchor: "cast" }),
  op_golden_aria: S(GoldenAriaScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "clockcage", anchor: "cast" }),
  op_grandfathers_watch: S(GrandfathersWatchScene, { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "blitz", anchor: "cast" }),
  op_halo_moon: S(HaloMoonScene, { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "bust", anchor: "cast" }),
  op_hoofbeat_log: S(HoofbeatLogScene, { ordering: "line", staggerMs: 60, victims: ["n"], hasLead: true, sound: "blitz", anchor: "aim" }),
  op_house_lights_up: S(HouseLightsUpScene, { ordering: "octagon", staggerMs: 50, victims: "all", hasLead: true, sound: "crashrocket", anchor: "cast" }),
  op_housewarming_gift: S(HousewarmingGiftScene, { ordering: "radial", staggerMs: 0, victims: ["k", "r"], hasLead: true, sound: "siege", anchor: "cast" }),
  op_incident_report: S(IncidentReportScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "petrify", anchor: "cast" }),
  op_kings_road_watch: S(KingsRoadWatchScene, { ordering: "file", staggerMs: 70, victims: "all", hasLead: true, sound: "bust", anchor: "cast" }),
  op_ladys_escort: S(LadysEscortScene, { ordering: "octagon", staggerMs: 55, victims: ["q"], hasLead: true, sound: "blitz", anchor: "cast" }),
  op_morning_constitutional: S(MorningConstitutionalScene, { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "clockcage", anchor: "cast" }),
  op_opening_chord: S(OpeningChordScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "siege", anchor: "aim" }),
  op_plaza_lantern: S(PlazaLanternScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "petrify", anchor: "cast" }),
  op_postern_watch: S(PosternWatchScene, { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "bust", anchor: "aim" }),
  op_red_sky_morning: S(RedSkyMorningScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "crashrocket", anchor: "cast" }),
  op_ripe_for_picking: S(RipeForPickingScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz", anchor: "cast" }),
  op_stoppage_time: S(StoppageTimeScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", anchor: "cast" }),
  op_town_square_sentry: S(TownSquareSentryScene, { ordering: "line", staggerMs: 65, victims: "all", hasLead: true, sound: "crashrocket", anchor: "aim" }),
  ov_backwards_hat: S(BackwardsHatScene, { ordering: "line", staggerMs: 60, victims: ["p"], hasLead: true, sound: "clockcage", anchor: "aim" }),
  ov_fresh_socks: S(FreshSocksScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", anchor: "cast" }),
  ov_name_tag: S(NameTagScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", anchor: "cast" }),
  ov_pigeon_post: S(PigeonPostScene, { ordering: "line", staggerMs: 65, victims: "all", hasLead: true, sound: "bust", anchor: "aim" }),
  ov_spare_button: S(SpareButtonScene, { ordering: "file", staggerMs: 70, victims: ["p"], hasLead: true, sound: "bust", anchor: "cast" }),
};
