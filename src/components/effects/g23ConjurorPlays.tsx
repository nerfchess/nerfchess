// g23ConjurorPlays — bespoke plays for the 21 concealment / misdirection cards
// that used to share the generated `shadowVeil` family (one veil, 21 hue
// shifts).
//
// MODULE FICTION: THE CONJUROR'S METHOD. Not "it got dark" — a TECHNIQUE for
// making someone look at the wrong thing. Every card is a different piece of
// stage apparatus doing the work: cups crossing on a shell board, a false
// bottom dropping out of a box, a mirror raked to forty-five degrees, a
// black-art cloth eating a prop against a black backdrop, a palm and a
// top-change, a thrown ball the eye follows, a cabinet's rear panel swinging,
// a bird folded away into a paper cone, a card forced out of a fan, a puff of
// smoke covering a switch, a servante shelf behind the table skirt, a
// substitution trunk, a reel of invisible thread, a stage trap, a telescoping
// wand, a change bag's lever, a topit sewn into the jacket, a double lift.
//
// Deliberately NOT here (a sibling batch owns the passive-concealment
// vocabulary): dust sheets, lantern shutters, cupped hands, inkdrops, rain
// curtains, cast shadows as subject, fogging mirrors, hoods, sandstorms,
// quilts, snuffers, fog banks, curtains on rails, censor bars, moths, night
// soil, slack bowstrings.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g23ConjurorPlays.css), transform/opacity animations only, no imports
// from BoardEffects.tsx, only the SigPlugin/SigRole TYPES from sigPlugins.tsx.
//
// STAGING. Every card declares an anchor, so the trick happens on the square
// the card was played on. Board-scale layers (the house lights going down, the
// footlight rim) live inside <BoardFrame>, never at a fixed percentage of the
// stage. Cards whose fiction runs along a line — a smoke line down a diagonal,
// a rook slipping through a false bottom, a thread reeling a far reach back —
// use <AimStage> and author their apparatus pointing RIGHT.
//
// Every scene runs three beats (tell, strike, settle) in all three roles, and
// every lead carries a layer driven by the geometry vars: `g23-lean` throws the
// apparatus shadow away from board centre (--fx-ox/--fx-oy), `g23-runline`
// extends along the play's own leg (--fx-len), `g23-fromside` and `g23-tossup`
// bring the conjuror's hand in from the CASTER's edge (--fx-side). All CSS
// lives in g23ConjurorPlays.css behind the `g23-` prefix.

import "./g23ConjurorPlays.css";

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
const rootStyle = (d: number): CSSProperties => ({ "--g23-d": `${d}ms` }) as CSSProperties;

/** stagger + a beat offset, scaled by the Settings animation-speed var. */
const b = (ms: number): string => `calc(var(--g23-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

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

/** Cast-anchored lead: apparatus on the cast square, `frame` over the board. */
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

/** House lights: a board-wide tone bloom. Always inside a BoardFrame. */
function Wash({ tone, d = 0 }: { tone: string; d?: number }) {
  return <L c="g23-wash" d={d} st={{ background: `radial-gradient(circle at 50% 48%, ${tone}, transparent 70%)` }} />;
}

/** Footlights: the board edge catching the apparatus. Inside a BoardFrame. */
function Rim({ tone, d = 150 }: { tone: string; d?: number }) {
  return <L c="g23-rim" d={d} st={{ boxShadow: `inset 0 0 30px 9px ${tone}` }} />;
}

/** House lights DOWN: the flat dim a stage trick is set under. */
function Dim({ tone, d = 0 }: { tone: string; d?: number }) {
  return <L c="g23-veil" d={d} st={{ background: tone }} />;
}

/* Piece silhouettes: the props the apparatus is worked on. */
const PAWN = "M12 4.4a2.7 2.7 0 0 1 1.6 4.9l1.8 6.4H8.6l1.8-6.4A2.7 2.7 0 0 1 12 4.4z M7.4 16.8h9.2V19.4H7.4z";
const KING = "M11.1 2.4h1.8v1.5h1.5v1.8h-1.5v1.6h-1.8V5.7H9.6V3.9h1.5zM8 9.2h8l-1.1 7.4H9.1zM7.2 17.6h9.6V20H7.2z";
const ROOK = "M7 4.8h2.3v1.6h1.6V4.8h2.2v1.6h1.6V4.8H17v3.6h-1.2v6.8H17V19H7v-3.8h1.2V8.4H7z";
const KNIGHT = "M8.2 19V13c0-3.8 2.5-5.9 4.6-6.5L12 4.2l3 1.2c2 .9 2.9 2.9 2.9 5.9V19z";
const QUEEN = "M6.4 6l1.3 3.2L9.4 6.6 12 9.4l2.6-2.8 1.7 2.6L17.6 6l-1 10.4H7.4zM7 17.4h10v2.4H7z";

/* --- 1. Smoke Line (t4) — THE PUFF THAT COVERS THE SWITCH --------------------
   A signal tube tips up along the diagonal, three puffs march out down the real
   leg, and in the beat the middle puff hides the whole square the conjuror
   swaps one prop for another. Aim-staged. Palette: #b9c6d8 / #fff2dc / #1c222e. */
const SL_PUFFS = [0, 1, 2];

function SmokeLineScene({ role, delayMs }: SceneProps) {
  const tube = (
    <g {...SJ}>
      <path d="M2 15.4h13l6-4.6-1.8-3.2-17.2 5z" fill="#b9c6d8" stroke="#1c222e" strokeWidth="1.1" />
      <path d="M3.4 15.4v5.2" stroke="#1c222e" strokeWidth="1.4" />
    </g>
  );
  const puff = <path d="M5 16.4c-2.4 0-3.4-3.4-1-4.6-.6-3.6 4-5.4 6-2.6 2.6-2.2 6.6.2 5.8 3.4 2.6.6 2.4 3.8-.4 3.8z" fill="#b9c6d8" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g23-sl-tube" l={4} t={44} w={52} h={40} d={40}>{tube}</V>
        <V c="g23-sl-puff" l={40} t={20} w={38} h={38} d={260}>{puff}</V>
        <V c="g23-ent-pop" l={58} t={44} w={30} h={40} d={470}><path d={PAWN} fill="#fff2dc" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g23-hitside" l={16} t={16} w={68} h={62} d={0}>{puff}</V>
        <V c="g23-hit" l={34} t={30} w={32} h={46} d={140}><path d={PAWN} fill="#1c222e" stroke="#b9c6d8" strokeWidth="1.1" {...SJ} /></V>
        <L c="g23-hit2" l={30} t={72} w={40} h={3} d={260} st={{ borderRadius: "999px", background: "#fff2dc" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(185,198,216,0.28)" /><Rim tone="rgba(255,242,220,0.28)" /></>}>
      <V c="g23-sl-tube" l={40} t={44} w={12} h={11} d={80}>{tube}</V>
      <L c="g23-runline" l={46} t={48.4} w={28} h={2} d={180} st={{ background: "linear-gradient(90deg, #b9c6d8, rgba(185,198,216,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      {SL_PUFFS.map((i) => (
        <V key={i} c="g23-sl-puff" l={50 + i * 7} t={41} w={9} h={9} d={260 + i * 130}>{puff}</V>
      ))}
      <V c="g23-sl-switch" l={56.5} t={43.5} w={7} h={9} d={620}><path d={PAWN} fill="#fff2dc" stroke="#1c222e" strokeWidth="1.1" {...SJ} /></V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g23-mote" l={52 + i * 6} t={50} w={1.4} h={1.4} d={720 + i * 100} st={{ borderRadius: "50%", background: "#b9c6d8" }} />
      ))}
    </AimLead>
  );
}

/* --- 2. Solstice Shadow (t4) — THE MIRROR RAKED TO FORTY-FIVE ----------------
   A tall glass is walked in and set on the rake; a sheen runs down it; and the
   whole compartment behind it stops existing while a chalked angle mark holds
   the setting. Palette: #8ea8d6 / #ffeecd / #16192b. */
function SolsticeShadowScene({ role, delayMs }: SceneProps) {
  const pane = (
    <g {...SJ}>
      <path d="M3 2.2h18v19.6H3z" fill="rgba(142,168,214,0.45)" stroke="#8ea8d6" strokeWidth="1.3" />
      <path d="M5.4 19.4L19 4.6" stroke="#ffeecd" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g23-ss-pane" l={14} t={10} w={62} h={76} d={40} st={{ transformOrigin: "10% 100%" }}>{pane}</V>
        <L c="g23-ss-sheen" l={12} t={12} w={66} h={22} d={280} st={{ background: "linear-gradient(120deg, transparent, #ffeecd, transparent)" }} />
        <L c="g23-ss-hide" l={54} t={26} w={40} h={58} d={470} st={{ background: "#16192b" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g23-hitside" l={10} t={12} w={56} h={74} d={0} st={{ transformOrigin: "10% 100%" }}>{pane}</V>
        <L c="g23-hit2" l={56} t={20} w={38} h={62} d={150} st={{ background: "#16192b" }} />
        <L c="g23-hit" l={20} t={40} w={40} h={4} d={270} st={{ borderRadius: "999px", background: "#ffeecd" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Dim tone="rgba(10,12,22,0.4)" /><Wash tone="rgba(142,168,214,0.26)" d={140} /></>}>
      <V c="g23-ss-pane" l={38} t={34} w={16} h={24} d={90} st={{ transformOrigin: "12% 100%" }}>{pane}</V>
      <L c="g23-ss-sheen" l={37} t={36} w={18} h={7} d={330} st={{ background: "linear-gradient(120deg, transparent, #ffeecd, transparent)" }} />
      <L c="g23-ss-hide" l={53} t={38} w={12} h={19} d={470} st={{ background: "#16192b" }} />
      <V c="g23-ss-mark" l={36} t={54} w={9} h={7} d={560} par="none" vb="0 0 24 18">
        <path d="M2 16h20M2 16L16 2" fill="none" stroke="#8ea8d6" strokeWidth="1.6" strokeDasharray="2.4 1.6" {...SJ} />
      </V>
      <L c="g23-lean" l={38} t={57} w={22} h={4} d={620} st={{ borderRadius: "999px", background: "rgba(22,25,43,0.72)" }} />
      <L c="g23-glint" l={51} t={37} w={2.2} h={2.2} d={700} st={{ borderRadius: "50%", background: "#ffeecd" }} />
    </Lead>
  );
}

/* --- 3. Loyal Hound (t3) — THE FINAL LOAD UNDER THE CUP ----------------------
   The conjuror's cup thumps down over an empty square, waits one beat, and is
   lifted to reveal a load far too large to have been there: a hound already
   sitting, tail going. Palette: #c9a2e8 / #fff1d8 / #241633. */
function LoyalHoundScene({ role, delayMs }: SceneProps) {
  const cup = (
    <g {...SJ}>
      <path d="M6 3.4h12l2.4 15.2H3.6z" fill="#241633" stroke="#c9a2e8" strokeWidth="1.2" />
      <path d="M2.8 18.6h18.4v2.6H2.8z" fill="#c9a2e8" />
    </g>
  );
  const hound = (
    <g {...SJ}>
      <path d="M9.6 21v-5.6c0-2.6 1-4.2 2.6-5.1l-.7-3.9 2.6 1.3c1.7.9 2.3 2.4 2.3 4.7V21z" fill="#241633" stroke="#c9a2e8" strokeWidth="1.1" />
      <path d="M11.7 6.6L9 4.2v3.2z" fill="#c9a2e8" />
      <path d="M17 20.4c2-.6 2.6-2.4 2-4.4" fill="none" stroke="#c9a2e8" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g23-lh-cup" l={16} t={8} w={64} h={62} d={40}>{cup}</V>
        <V c="g23-lh-sit" l={24} t={30} w={52} h={58} d={280}>{hound}</V>
        <L c="g23-ent-mote" l={68} t={62} w={16} h={4} d={480} st={{ borderRadius: "999px", background: "#fff1d8" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g23-hitside" l={18} t={6} w={64} h={58} d={0}>{cup}</V>
        <V c="g23-hit" l={26} t={30} w={48} h={56} d={150}>{hound}</V>
        <L c="g23-hit2" l={28} t={84} w={44} h={4} d={260} st={{ borderRadius: "999px", background: "#241633" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(201,162,232,0.28)" /><Rim tone="rgba(255,241,216,0.24)" /></>}>
      <V c="g23-lh-king" l={45.5} t={41} w={9} h={12} d={70}><path d={KING} fill="none" stroke="#fff1d8" strokeWidth="1.4" {...SJ} /></V>
      <V c="g23-lh-cup" l={43} t={44} w={14} h={18} d={200}>{cup}</V>
      <L c="g23-lean" l={42} t={58} w={18} h={4} d={330} st={{ borderRadius: "999px", background: "rgba(36,22,51,0.72)" }} />
      <V c="g23-fromside" l={45} t={46} w={10} h={13} d={520}>{hound}</V>
      <V c="g23-lh-tail" l={53} t={51} w={6} h={6} d={680} st={{ transformOrigin: "10% 90%" }}>
        <path d="M3 20c5-1 7.4-5.4 6-10" fill="none" stroke="#c9a2e8" strokeWidth="2.2" {...SJ} />
      </V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g23-mote" l={44 + i * 6} t={52} w={1.5} h={1.5} d={740 + i * 90} st={{ borderRadius: "50%", background: "#fff1d8" }} />
      ))}
    </Lead>
  );
}

/* --- 4. Wrong Map (t3) — THE FORCE OUT OF A FAN ------------------------------
   A fan of cards spreads, one is riffled proud of the rest and taken, and when
   it turns over every card in the fan was the same card all along: dark square,
   dark square, dark square. Palette: #d8b56a / #fff3d9 / #2c2110. */
const WM_FAN = [-34, -17, 0, 17, 34];

function WrongMapScene({ role, delayMs }: SceneProps) {
  const card = (fill: string) => (
    <g {...SJ}>
      <rect x="5" y="2" width="14" height="20" rx="1" fill={fill} stroke="#2c2110" strokeWidth="1.1" />
      <rect x="8" y="6.4" width="8" height="8" rx="1" fill="#2c2110" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        {[-24, 0, 24].map((a, i) => (
          <P key={a} l={22} t={16} w={56} h={70} rot={`${a}deg`}>
            <V c="g23-wm-fan" d={40 + i * 130}>{card("#d8b56a")}</V>
          </P>
        ))}
        <V c="g23-wm-force" l={30} t={6} w={40} h={56} d={430}>{card("#fff3d9")}</V>
        <L c="g23-ent-mote" l={44} t={78} w={12} h={12} d={560} st={{ borderRadius: "50%", background: "#d8b56a" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g23-hitside" l={22} t={14} w={56} h={70} d={0}>{card("#d8b56a")}</V>
        <V c="g23-hit" l={30} t={30} w={40} h={48} d={150}><path d={KNIGHT} fill="#2c2110" stroke="#fff3d9" strokeWidth="1.1" {...SJ} /></V>
        <L c="g23-hit2" l={34} t={80} w={32} h={4} d={260} st={{ borderRadius: "999px", background: "#fff3d9" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(216,181,106,0.26)" /><Rim tone="rgba(255,243,217,0.26)" /></>}>
      {WM_FAN.map((a, i) => (
        <P key={a} l={40} t={36} w={20} h={26} rot={`${a}deg`}>
          <V c="g23-wm-fan" d={100 + i * 80} st={{ transformOrigin: "50% 92%" }}>{card("#d8b56a")}</V>
        </P>
      ))}
      <V c="g23-wm-force" l={44.5} t={30} w={11} h={15} d={520}>{card("#fff3d9")}</V>
      <V c="g23-wm-flip" l={44.5} t={30} w={11} h={15} d={660}>
        <g {...SJ}>
          <rect x="5" y="2" width="14" height="20" rx="1" fill="#fff3d9" stroke="#2c2110" strokeWidth="1.1" />
          <path d="M8 8h8v8H8z" fill="#2c2110" />
          <path d="M9.4 15.2l5.2-6.4" stroke="#d8b56a" strokeWidth="1.2" />
        </g>
      </V>
      <L c="g23-lean" l={41} t={56} w={20} h={4} d={620} st={{ borderRadius: "999px", background: "rgba(44,33,16,0.7)" }} />
      <L c="g23-glint" l={53} t={33} w={2.4} h={2.4} d={720} st={{ borderRadius: "50%", background: "#fff3d9" }} />
    </Lead>
  );
}

/* --- 5. Night Shift (t3) — THE FALSE BOTTOM DROPS OUT ------------------------
   A plain box is shown, closed, and its hinged false bottom swings away so the
   rook rides straight down the leg and out the far end while the pawns above
   never notice. Aim-staged. Palette: #7fbfae / #fff2dc / #12251f. */
function NightShiftScene({ role, delayMs }: SceneProps) {
  const box = (
    <g {...SJ}>
      <rect x="2.4" y="5" width="19.2" height="13.4" rx="1" fill="#12251f" stroke="#7fbfae" strokeWidth="1.3" />
      <path d="M2.4 9.4h19.2" stroke="#7fbfae" strokeWidth="0.9" strokeDasharray="2 1.6" />
    </g>
  );
  const flap = <path d="M2 3h20l-2.4 5H4.4z" fill="#7fbfae" stroke="#12251f" strokeWidth="1.2" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g23-ns-box" l={10} t={22} w={80} h={50} d={40}>{box}</V>
        <V c="g23-ns-flap" l={16} t={56} w={68} h={26} d={280} st={{ transformOrigin: "6% 30%" }}>{flap}</V>
        <V c="g23-ent-drop" l={36} t={54} w={30} h={40} d={470}><path d={ROOK} fill="#fff2dc" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g23-hitside" l={8} t={22} w={84} h={46} d={0}>{box}</V>
        <V c="g23-hit" l={34} t={30} w={32} h={44} d={150}><path d={ROOK} fill="#7fbfae" /></V>
        <L c="g23-hit2" l={16} t={72} w={68} h={3} d={260} st={{ borderRadius: "999px", background: "#fff2dc" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(127,191,174,0.26)" /><Rim tone="rgba(255,242,220,0.24)" /></>}>
      <V c="g23-ns-box" l={41} t={42} w={16} h={12} d={90}>{box}</V>
      <V c="g23-ns-flap" l={42} t={51} w={14} h={6} d={280} st={{ transformOrigin: "6% 30%" }}>{flap}</V>
      <L c="g23-runline" l={46} t={48.6} w={28} h={2.2} d={380} st={{ background: "linear-gradient(90deg, #7fbfae, rgba(127,191,174,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g23-ns-slip" l={45} t={44} w={9} h={12} d={470}><path d={ROOK} fill="#fff2dc" stroke="#12251f" strokeWidth="1" {...SJ} /></V>
      {[0, 1].map((i) => (
        <V key={i} c="g23-ns-sleep" l={49 + i * 8} t={45} w={7} h={10} d={560 + i * 130}><path d={PAWN} fill="none" stroke="#7fbfae" strokeWidth="1.4" {...SJ} /></V>
      ))}
      <L c="g23-mote" l={62} t={50} w={1.6} h={1.6} d={740} st={{ borderRadius: "50%", background: "#fff2dc" }} />
    </AimLead>
  );
}

/* --- 6. Night Gardener (t2) — THE SERVANTE BEHIND THE SKIRT ------------------
   The table skirt lifts, a hand goes to the hidden shelf sewn behind it, and
   the pawn everyone watched vanish is set back on the boards, still damp.
   Palette: #96d08a / #fff3d6 / #16281a. */
function NightGardenerScene({ role, delayMs }: SceneProps) {
  const table = (
    <g {...SJ}>
      <path d="M1.6 6.6h20.8v2.6H1.6z" fill="#96d08a" stroke="#16281a" strokeWidth="1.1" />
      <path d="M3.4 9.2h17.2l-1.4 12.4H4.8z" fill="#16281a" stroke="#96d08a" strokeWidth="1" />
    </g>
  );
  const shelf = <path d="M3 4h18v3.6H3zM5.4 7.6h13.2v2.6H5.4z" fill="#96d08a" stroke="#16281a" strokeWidth="1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g23-ng-skirt" l={8} t={16} w={84} h={68} d={40}>{table}</V>
        <V c="g23-ng-reach" l={54} t={40} w={38} h={34} d={280}>{shelf}</V>
        <V c="g23-ent-rise" l={30} t={26} w={34} h={44} d={470}><path d={PAWN} fill="#fff3d6" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g23-hitside" l={10} t={18} w={80} h={64} d={0}>{table}</V>
        <V c="g23-hit" l={34} t={20} w={32} h={44} d={150}><path d={PAWN} fill="#96d08a" /></V>
        <L c="g23-hit2" l={26} t={80} w={48} h={4} d={260} st={{ borderRadius: "999px", background: "#fff3d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(150,208,138,0.26)" /><Rim tone="rgba(255,243,214,0.22)" /></>}>
      <V c="g23-ng-skirt" l={38} t={40} w={24} h={20} d={90}>{table}</V>
      <V c="g23-ng-shelf" l={41} t={49} w={18} h={9} d={280}>{shelf}</V>
      <V c="g23-fromside" l={50} t={45} w={9} h={11} d={420}>
        <path d="M8 21v-8.4c0-1 1.6-1 1.6 0V7.8c0-1.2 1.7-1.2 1.7 0v3.4c0-1.2 1.7-1.2 1.7 0V9c0-1.2 1.7-1.2 1.7 0V17c0 2.6-1.7 4-4.4 4z" fill="#fff3d6" stroke="#16281a" strokeWidth="0.9" {...SJ} />
      </V>
      <V c="g23-ng-set" l={44} t={42} w={8} h={11} d={580}><path d={PAWN} fill="#fff3d6" stroke="#16281a" strokeWidth="1" {...SJ} /></V>
      <L c="g23-lean" l={41} t={56} w={20} h={4} d={640} st={{ borderRadius: "999px", background: "rgba(22,40,26,0.7)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g23-mote" l={43 + i * 7} t={51} w={1.5} h={1.5} d={720 + i * 100} st={{ borderRadius: "50%", background: "#96d08a" }} />
      ))}
    </Lead>
  );
}

/* --- 7. Night Watch (t2) — THE SUBSTITUTION TRUNK ----------------------------
   The trunk is walked over the king, the lid comes down, straps are buckled and
   the whole box is turned once. When it opens the king is not the thing inside.
   Palette: #a8b6d8 / #fff2dc / #171b2c. */
const NW_STRAPS = [0, 1];

function NightWatchScene({ role, delayMs }: SceneProps) {
  const trunk = (
    <g {...SJ}>
      <rect x="3" y="8.4" width="18" height="12.6" rx="1" fill="#171b2c" stroke="#a8b6d8" strokeWidth="1.2" />
      <path d="M3 8.4h18M8.4 8.4v12.6M15.6 8.4v12.6" stroke="#a8b6d8" strokeWidth="0.9" />
      <rect x="10.6" y="12.6" width="2.8" height="3.4" rx="1" fill="#fff2dc" />
    </g>
  );
  const lid = <path d="M2.4 9h19.2V5.4c0-2-2-3.4-9.6-3.4S2.4 3.4 2.4 5.4z" fill="#a8b6d8" stroke="#171b2c" strokeWidth="1.2" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g23-nw-body" l={12} t={26} w={76} h={62} d={40}>{trunk}</V>
        <V c="g23-nw-lid" l={12} t={6} w={76} h={40} d={280} st={{ transformOrigin: "50% 100%" }}>{lid}</V>
        <L c="g23-nw-strap" l={34} t={30} w={7} h={56} d={470} st={{ background: "#fff2dc" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g23-hitside" l={12} t={24} w={76} h={62} d={0}>{trunk}</V>
        <V c="g23-hit" l={14} t={4} w={72} h={38} d={150} st={{ transformOrigin: "50% 100%" }}>{lid}</V>
        <L c="g23-hit2" l={36} t={28} w={6} h={54} d={260} st={{ background: "#fff2dc" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Dim tone="rgba(10,12,22,0.36)" /><Wash tone="rgba(168,182,216,0.26)" d={130} /></>}>
      <V c="g23-nw-king" l={45.5} t={41} w={9} h={12} d={70}><path d={KING} fill="none" stroke="#fff2dc" strokeWidth="1.4" {...SJ} /></V>
      <V c="g23-nw-body" l={40} t={43} w={20} h={16} d={210}>{trunk}</V>
      <V c="g23-nw-lid" l={40} t={38} w={20} h={9} d={370} st={{ transformOrigin: "50% 100%" }}>{lid}</V>
      {NW_STRAPS.map((i) => (
        <L key={i} c="g23-nw-strap" l={44 + i * 8} t={43} w={1.8} h={16} d={490 + i * 110} st={{ background: "#fff2dc" }} />
      ))}
      <L c="g23-nw-swap" l={40} t={43} w={20} h={16} d={660} st={{ background: "linear-gradient(90deg, transparent, rgba(255,242,220,0.85), transparent)" }} />
      <L c="g23-lean" l={39} t={58} w={22} h={4} d={700} st={{ borderRadius: "999px", background: "rgba(23,27,44,0.75)" }} />
    </Lead>
  );
}

/* --- 8. Borrowed Lantern (t2) — THE BLACK-ART CLOTH --------------------------
   A cloth exactly the colour of the backdrop is drawn across, and one by one
   the props on the dark half stop being there. Nothing was covered: they simply
   read as background now. Palette: #e0b46a / #fff4d6 / #1a1408. */
const BL_EATEN: Array<[number, number]> = [[52, 41], [58, 46], [52, 51]];

function BorrowedLanternScene({ role, delayMs }: SceneProps) {
  const cloth = (
    <path d="M1.6 3.4c4 1.6 7 1.6 10.4 0 3.4 1.6 6.4 1.6 10.4 0v17c-4 1.6-7 1.6-10.4 0-3.4 1.6-6.4 1.6-10.4 0z" fill="#1a1408" stroke="#e0b46a" strokeWidth="1.1" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g23-bl-cloth" l={2} t={14} w={92} h={68} d={40} st={{ transformOrigin: "0% 50%" }}>{cloth}</V>
        <V c="g23-bl-eat" l={54} t={30} w={32} h={44} d={280}><path d={PAWN} fill="#e0b46a" /></V>
        <L c="g23-bl-edge" l={2} t={14} w={5} h={68} d={470} st={{ background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g23-hitside" l={4} t={16} w={92} h={66} d={0} st={{ transformOrigin: "0% 50%" }}>{cloth}</V>
        <V c="g23-hit" l={32} t={28} w={36} h={48} d={150}><path d={PAWN} fill="#1a1408" stroke="#e0b46a" strokeWidth="1.1" {...SJ} /></V>
        <L c="g23-hit2" l={6} t={18} w={4} h={62} d={260} st={{ background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Dim tone="rgba(9,7,4,0.44)" /><Wash tone="rgba(224,180,106,0.24)" d={150} /></>}>
      <V c="g23-bl-cloth" l={36} t={36} w={28} h={26} d={110} st={{ transformOrigin: "0% 50%" }}>{cloth}</V>
      <L c="g23-bl-edge" l={36} t={36} w={1.6} h={26} d={260} st={{ background: "#fff4d6" }} />
      {BL_EATEN.map(([l, t], i) => (
        <V key={i} c="g23-bl-eat" l={l} t={t} w={7} h={9} d={380 + i * 140}><path d={PAWN} fill="#e0b46a" stroke="#1a1408" strokeWidth="1" {...SJ} /></V>
      ))}
      <L c="g23-lean" l={38} t={58} w={24} h={4} d={640} st={{ borderRadius: "999px", background: "rgba(26,20,8,0.78)" }} />
      <L c="g23-glint" l={37} t={40} w={2.2} h={2.2} d={720} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 9. Dim Torches (t2) — THE REEL OF INVISIBLE THREAD ----------------------
   A spool is palmed, thread runs out along the play's own leg, and whatever
   reaches past the torchlight is quietly yanked home again. Aim-staged, so the
   thread is exactly as long as the real reach. Palette: #e08a5a / #ffeacb /
   #2a150c. */
function DimTorchesScene({ role, delayMs }: SceneProps) {
  const reel = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="8.4" fill="#2a150c" stroke="#e08a5a" strokeWidth="1.3" />
      <circle cx="12" cy="12" r="3" fill="#e08a5a" />
      <path d="M12 3.6v3M12 17.4v3M3.6 12h3M17.4 12h3" stroke="#ffeacb" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g23-dt-reel" l={6} t={26} w={46} h={50} d={40}>{reel}</V>
        <L c="g23-dt-thread" l={30} t={49} w={64} h={2} d={280} st={{ background: "#ffeacb", transformOrigin: "0% 50%", borderRadius: "999px" }} />
        <V c="g23-dt-yank" l={62} t={30} w={32} h={44} d={470}><path d={PAWN} fill="#e08a5a" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g23-hitside" l={26} t={26} w={48} h={48} d={0}>{reel}</V>
        <L c="g23-hit2" l={48} t={49} w={46} h={2} d={150} st={{ background: "#ffeacb", transformOrigin: "0% 50%", borderRadius: "999px" }} />
        <V c="g23-hit" l={62} t={30} w={30} h={42} d={260}><path d={PAWN} fill="#e08a5a" /></V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Dim tone="rgba(12,7,4,0.4)" /><Wash tone="rgba(224,138,90,0.26)" d={140} /></>}>
      <V c="g23-dt-reel" l={42} t={43} w={12} h={13} d={90} st={{ transformOrigin: "50% 50%" }}>{reel}</V>
      <L c="g23-runline" l={48} t={48.7} w={28} h={1.4} d={250} st={{ background: "#ffeacb", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <V c="g23-dt-far" l={64} t={43} w={8} h={11} d={400}><path d={PAWN} fill="none" stroke="#e08a5a" strokeWidth="1.5" {...SJ} /></V>
      <V c="g23-dt-yank" l={64} t={43} w={8} h={11} d={540}><path d={PAWN} fill="#e08a5a" stroke="#2a150c" strokeWidth="1" {...SJ} /></V>
      <L c="g23-dt-snap" l={50} t={46} w={22} h={6} d={640} st={{ background: "linear-gradient(90deg, rgba(255,234,203,0), #ffeacb, rgba(255,234,203,0))" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g23-mote" l={52 + i * 7} t={51} w={1.4} h={1.4} d={720 + i * 90} st={{ borderRadius: "50%", background: "#e08a5a" }} />
      ))}
    </AimLead>
  );
}

/* --- 10. Shadowed Meadow (t2) — THE STAR TRAP IN THE STAGE FLOOR -------------
   The dark half of the boards is not boards at all: hinged leaves give way, the
   void under the stage shows through, and anything that tries to stand there
   goes down with them. Palette: #7fa88c / #fff1d5 / #14231a. */
const SM_LEAVES = [0, 90, 180, 270];

function ShadowedMeadowScene({ role, delayMs }: SceneProps) {
  const leaf = <path d="M12 12L2.6 2.6h18.8z" fill="#14231a" stroke="#7fa88c" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g23-sm-void" l={16} t={16} w={68} h={68} d={40} st={{ background: "radial-gradient(circle, #14231a 40%, transparent 74%)" }} />
        {[0, 180].map((a, i) => (
          <P key={a} l={14} t={14} w={72} h={72} rot={`${a}deg`}>
            <V c="g23-sm-trap" d={240 + i * 160} st={{ transformOrigin: "50% 10%" }}>{leaf}</V>
          </P>
        ))}
        <V c="g23-sm-drop" l={34} t={30} w={32} h={44} d={500}><path d={PAWN} fill="#7fa88c" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g23-hit2" l={18} t={18} w={64} h={64} d={0} st={{ background: "radial-gradient(circle, #14231a 44%, transparent 76%)" }} />
        <V c="g23-hitside" l={16} t={16} w={68} h={68} d={140} st={{ transformOrigin: "50% 10%" }}>{leaf}</V>
        <V c="g23-hit" l={34} t={28} w={32} h={46} d={260}><path d={PAWN} fill="#fff1d5" /></V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Dim tone="rgba(8,14,10,0.42)" /><Rim tone="rgba(127,168,140,0.3)" d={180} /></>}>
      <L c="g23-sm-void" l={39} t={38} w={22} h={22} d={100} st={{ borderRadius: "50%", background: "radial-gradient(circle, #14231a 42%, transparent 74%)" }} />
      {SM_LEAVES.map((a, i) => (
        <P key={a} l={39} t={38} w={22} h={22} rot={`${a}deg`}>
          <V c="g23-sm-trap" d={220 + i * 90} st={{ transformOrigin: "50% 8%" }}>{leaf}</V>
        </P>
      ))}
      <V c="g23-sm-drop" l={45.5} t={41} w={9} h={12} d={580}><path d={PAWN} fill="#7fa88c" stroke="#14231a" strokeWidth="1" {...SJ} /></V>
      <L c="g23-lean" l={39} t={58} w={22} h={4} d={640} st={{ borderRadius: "999px", background: "rgba(20,35,26,0.78)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g23-mote" l={43 + i * 7} t={52} w={1.5} h={1.5} d={720 + i * 100} st={{ borderRadius: "50%", background: "#fff1d5" }} />
      ))}
    </Lead>
  );
}

/* --- 11. Shrunken Shoes (t2) — THE TELESCOPING WAND --------------------------
   The conjuror's wand is held up full length, tapped once, and swallows itself
   section by section until only a stub is left in the fingers. Everything it
   measures gets shorter with it. Palette: #d2a0c0 / #fff2da / #2a1424. */
const SH_SEGS = [0, 1, 2];

function ShrunkenShoesScene({ role, delayMs }: SceneProps) {
  const seg = (w: number, fill: string) => (
    <rect x={(24 - w) / 2} y="2" width={w} height="20" rx="1" fill={fill} stroke="#2a1424" strokeWidth="1.1" />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g23-sh-wand" l={12} t={10} w={26} h={78} d={40} par="none">{seg(10, "#d2a0c0")}</V>
        <V c="g23-sh-collapse" l={40} t={22} w={24} h={62} d={280} par="none">{seg(9, "#fff2da")}</V>
        <V c="g23-sh-stub" l={66} t={44} w={22} h={34} d={480} par="none">{seg(12, "#d2a0c0")}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g23-hitside" l={38} t={6} w={24} h={78} d={0} par="none">{seg(9, "#d2a0c0")}</V>
        <L c="g23-hit2" l={24} t={50} w={52} h={3} d={150} st={{ borderRadius: "999px", background: "#fff2da" }} />
        <V c="g23-hit" l={38} t={46} w={24} h={36} d={260} par="none">{seg(12, "#fff2da")}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(210,160,192,0.26)" /><Rim tone="rgba(255,242,218,0.24)" /></>}>
      <L c="g23-runline" l={50} t={48.6} w={26} h={1.8} d={80} st={{ background: "linear-gradient(90deg, #d2a0c0, rgba(210,160,192,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      {SH_SEGS.map((i) => (
        <V key={i} c="g23-sh-wand" l={46} t={30 + i * 8} w={8} h={11} d={180 + i * 110} par="none" st={{ transformOrigin: "50% 100%" }}>
          {seg(9 - i * 1.4, i % 2 ? "#fff2da" : "#d2a0c0")}
        </V>
      ))}
      <V c="g23-sh-collapse" l={46} t={38} w={8} h={16} d={520} par="none">{seg(8, "#d2a0c0")}</V>
      <V c="g23-sh-stub" l={46.5} t={49} w={7} h={6} d={640} par="none">{seg(13, "#fff2da")}</V>
      <L c="g23-lean" l={42} t={57} w={18} h={4} d={690} st={{ borderRadius: "999px", background: "rgba(42,20,36,0.7)" }} />
    </Lead>
  );
}

/* --- 12. Two Step (t2) — THE CUPS CROSS ON THE SHELL BOARD -------------------
   Three cups, one pea, and a crossing pattern with a deliberate rhythm: long,
   short, long. Follow the wrong beat once and you never find it again.
   Palette: #6fb8c8 / #fff2dc / #10262c. */
const TS_CUPS: Array<[number, number]> = [[40, 42], [46, 42], [52, 42]];

function TwoStepScene({ role, delayMs }: SceneProps) {
  const cup = (fill: string) => (
    <g {...SJ}>
      <path d="M6.4 4h11.2l2.2 14.4H4.2z" fill={fill} stroke="#10262c" strokeWidth="1.2" />
      <path d="M3.4 18.4h17.2v2.4H3.4z" fill="#10262c" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g23-ts-cup" l={4} t={24} w={40} h={54} d={40}>{cup("#6fb8c8")}</V>
        <V c="g23-ts-cross" l={40} t={24} w={40} h={54} d={260}>{cup("#fff2dc")}</V>
        <L c="g23-ts-pea" l={44} t={70} w={12} h={12} d={470} st={{ borderRadius: "50%", background: "#6fb8c8" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g23-hitside" l={10} t={20} w={44} h={58} d={0}>{cup("#6fb8c8")}</V>
        <V c="g23-hit" l={48} t={20} w={44} h={58} d={140}>{cup("#fff2dc")}</V>
        <L c="g23-hit2" l={44} t={78} w={12} h={5} d={260} st={{ borderRadius: "999px", background: "#10262c" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(111,184,200,0.26)" /><Rim tone="rgba(255,242,220,0.24)" /></>}>
      <L c="g23-ts-board" l={37} t={54} w={26} h={3} d={80} st={{ borderRadius: "999px", background: "#10262c" }} />
      {TS_CUPS.map(([l, t], i) => (
        <V key={i} c={i === 1 ? "g23-ts-cross" : "g23-ts-cup"} l={l} t={t} w={8} h={12} d={200 + i * 120}>
          {cup(i === 1 ? "#fff2dc" : "#6fb8c8")}
        </V>
      ))}
      <L c="g23-ts-pea" l={49} t={51} w={2.6} h={2.6} d={560} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      <V c="g23-fromside" l={44} t={36} w={9} h={9} d={640}>
        <path d="M8 21v-8.4c0-1 1.6-1 1.6 0V7.8c0-1.2 1.7-1.2 1.7 0v3.4c0-1.2 1.7-1.2 1.7 0V9c0-1.2 1.7-1.2 1.7 0V17c0 2.6-1.7 4-4.4 4z" fill="#6fb8c8" stroke="#10262c" strokeWidth="0.9" {...SJ} />
      </V>
      <L c="g23-lean" l={40} t={57} w={20} h={4} d={700} st={{ borderRadius: "999px", background: "rgba(16,38,44,0.72)" }} />
    </Lead>
  );
}

/* --- 13. Smoke Ring (t2) — THE CABINET'S REAR PANEL --------------------------
   A four-panel cabinet folds up around the chosen patch, the front is shown
   empty, and behind it the rear panel swings on its silent hinge. Nothing ends
   a move in there because there is no in there. Palette: #9fb0c0 / #fff2dc /
   #1a2027. */
const SR_PANELS = [0, 1, 2];

function SmokeRingScene({ role, delayMs }: SceneProps) {
  const panel = (fill: string) => (
    <g {...SJ}>
      <rect x="4" y="2.4" width="16" height="19.2" rx="1" fill={fill} stroke="#1a2027" strokeWidth="1.2" />
      <rect x="7" y="5.6" width="10" height="12.8" rx="1" fill="none" stroke="#1a2027" strokeWidth="0.8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g23-sr-panel" l={6} t={14} w={40} h={72} d={40} st={{ transformOrigin: "0% 50%" }}>{panel("#9fb0c0")}</V>
        <V c="g23-sr-panel" l={48} t={14} w={40} h={72} d={230} st={{ transformOrigin: "100% 50%" }}>{panel("#fff2dc")}</V>
        <L c="g23-sr-empty" l={26} t={26} w={48} h={48} d={470} st={{ background: "#1a2027" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g23-hitside" l={8} t={14} w={40} h={70} d={0} st={{ transformOrigin: "0% 50%" }}>{panel("#9fb0c0")}</V>
        <V c="g23-hit" l={50} t={14} w={40} h={70} d={140} st={{ transformOrigin: "100% 50%" }}>{panel("#fff2dc")}</V>
        <L c="g23-hit2" l={30} t={30} w={40} h={40} d={260} st={{ background: "#1a2027" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Dim tone="rgba(9,12,16,0.38)" /><Wash tone="rgba(159,176,192,0.26)" d={140} /></>}>
      {SR_PANELS.map((i) => (
        <V key={i} c="g23-sr-panel" l={39 + i * 7.5} t={38} w={8} h={22} d={120 + i * 130} st={{ transformOrigin: i === 2 ? "100% 50%" : "0% 50%" }}>
          {panel(i === 1 ? "#fff2dc" : "#9fb0c0")}
        </V>
      ))}
      <V c="g23-sr-rear" l={45} t={39} w={11} h={20} d={520} st={{ transformOrigin: "8% 50%" }}>{panel("#1a2027")}</V>
      <L c="g23-sr-empty" l={41} t={40} w={18} h={18} d={620} st={{ background: "#1a2027" }} />
      <L c="g23-lean" l={39} t={59} w={22} h={4} d={680} st={{ borderRadius: "999px", background: "rgba(26,32,39,0.76)" }} />
      <L c="g23-glint" l={57} t={41} w={2.4} h={2.4} d={740} st={{ borderRadius: "50%", background: "#fff2dc" }} />
    </Lead>
  );
}

/* --- 14. Hiccups (t1) — THE FRENCH DROP --------------------------------------
   The right hand comes over to take the coin. Everyone watches it leave. It
   opens on nothing, and the coin is exactly where it always was, back in their
   own half. Palette: #e6c07a / #fff4d6 / #2b2110. */
function HiccupsScene({ role, delayMs }: SceneProps) {
  const hand = (fill: string) => (
    <path d="M8 21v-8.4c0-1 1.6-1 1.6 0V7.8c0-1.2 1.7-1.2 1.7 0v3.4c0-1.2 1.7-1.2 1.7 0V9c0-1.2 1.7-1.2 1.7 0V17c0 2.6-1.7 4-4.4 4z" fill={fill} stroke="#2b2110" strokeWidth="0.9" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g23-hc-hand" l={8} t={26} w={44} h={56} d={40}>{hand("#e6c07a")}</V>
        <L c="g23-hc-coin" l={40} t={38} w={20} h={20} d={280} st={{ borderRadius: "50%", background: "#fff4d6" }} />
        <V c="g23-hc-open" l={50} t={22} w={44} h={56} d={470}>{hand("#fff4d6")}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g23-hitside" l={12} t={24} w={44} h={58} d={0}>{hand("#e6c07a")}</V>
        <L c="g23-hit" l={42} t={38} w={18} h={18} d={140} st={{ borderRadius: "50%", background: "#fff4d6" }} />
        <V c="g23-hit2" l={50} t={22} w={42} h={56} d={260}>{hand("#2b2110")}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(230,192,122,0.26)" /><Rim tone="rgba(255,244,214,0.22)" /></>}>
      <V c="g23-hc-hand" l={40} t={42} w={10} h={13} d={90}>{hand("#e6c07a")}</V>
      <L c="g23-hc-coin" l={44} t={45} w={3.6} h={3.6} d={250} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      <V c="g23-fromside" l={50} t={40} w={10} h={13} d={400}>{hand("#fff4d6")}</V>
      <V c="g23-hc-open" l={51} t={38} w={10} h={13} d={560}>{hand("#2b2110")}</V>
      <L c="g23-hc-nope" l={51} t={42} w={9} h={9} d={640} st={{ borderRadius: "50%", border: "2px solid #e6c07a" }} />
      <L c="g23-lean" l={41} t={57} w={20} h={4} d={700} st={{ borderRadius: "999px", background: "rgba(43,33,16,0.7)" }} />
    </Lead>
  );
}

/* --- 15. Pigeon Perch (t1) — THE CONE PRODUCTION -----------------------------
   A sheet of newspaper is rolled to a cone, shown empty end to end, and a
   pigeon is produced out of it onto the king's crown. It declines to be put
   back. Palette: #b8c8e0 / #fff3dc / #1c2230. */
function PigeonPerchScene({ role, delayMs }: SceneProps) {
  const cone = (
    <g {...SJ}>
      <path d="M12 2l7.4 19.4H4.6z" fill="#b8c8e0" stroke="#1c2230" strokeWidth="1.2" />
      <path d="M9 14.4h6" stroke="#1c2230" strokeWidth="0.9" />
    </g>
  );
  const bird = (
    <g {...SJ}>
      <path d="M4.4 15.6c3.4-.6 5-2.6 6.2-6 1 2.8 3.6 4.6 8.4 4.2-2.6 4-6.8 6-11 5.2-2.4-.5-3.6-1.6-3.6-3.4z" fill="#fff3dc" stroke="#1c2230" strokeWidth="0.9" />
      <circle cx="17.4" cy="9.4" r="2.4" fill="#fff3dc" stroke="#1c2230" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g23-pp-cone" l={10} t={12} w={54} h={72} d={40} st={{ transformOrigin: "50% 90%" }}>{cone}</V>
        <V c="g23-pp-bird" l={40} t={16} w={52} h={48} d={300}>{bird}</V>
        <L c="g23-ent-mote" l={30} t={72} w={3} h={3} d={500} st={{ borderRadius: "50%", background: "#b8c8e0" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g23-hitside" l={16} t={14} w={48} h={70} d={0} st={{ transformOrigin: "50% 90%" }}>{cone}</V>
        <V c="g23-hit" l={38} t={16} w={50} h={46} d={150}>{bird}</V>
        <L c="g23-hit2" l={34} t={80} w={34} h={4} d={260} st={{ borderRadius: "999px", background: "#1c2230" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(184,200,224,0.26)" /><Rim tone="rgba(255,243,220,0.22)" /></>}>
      <V c="g23-pp-king" l={45.5} t={42} w={9} h={12} d={70}><path d={KING} fill="none" stroke="#fff3dc" strokeWidth="1.4" {...SJ} /></V>
      <V c="g23-pp-cone" l={39} t={34} w={12} h={18} d={190} st={{ transformOrigin: "50% 92%" }}>{cone}</V>
      <L c="g23-pp-shake" l={39} t={40} w={12} h={7} d={340} st={{ background: "linear-gradient(90deg, transparent, #fff3dc, transparent)" }} />
      <V c="g23-tossup" l={46} t={34} w={11} h={10} d={480}>{bird}</V>
      <V c="g23-pp-settle" l={45} t={38} w={10} h={9} d={640}>{bird}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g23-mote" l={43 + i * 6} t={44} w={1.5} h={1.5} d={720 + i * 90} st={{ borderRadius: "50%", background: "#b8c8e0" }} />
      ))}
    </Lead>
  );
}

/* --- 16. Champion's Shades (t1) — THE TOP-CHANGE -----------------------------
   A flat palm passes over the piece once, at speed, and on the way back the
   thing under it is a different thing. Nobody sees the exchange because nobody
   was told there was one. Palette: #f0a8c0 / #fff2dc / #2a1420. */
function ChampionsShadesScene({ role, delayMs }: SceneProps) {
  const palm = (
    <path d="M3.4 13.6c0-1.4 1.6-2 2.6-1.2l2 1.6V5.4c0-1.4 2-1.4 2 0v5.2c0-1.6 2.1-1.6 2.1 0V5c0-1.5 2.1-1.5 2.1 0v5.8c0-1.4 2-1.4 2 0v6.4c0 2.6-2 4.4-5.2 4.4-3 0-4.4-1-6-3z" fill="#f0a8c0" stroke="#2a1420" strokeWidth="0.9" {...SJ} />
  );
  const shades = (
    <path d="M2.4 8.6h19.2v2.2h-1.4c-.4 3.2-1.8 4.8-4.4 4.8s-3.6-1.6-3.8-4.2h-.2c-.2 2.6-1.2 4.2-3.8 4.2s-4-1.6-4.4-4.8H2.4z" fill="#2a1420" stroke="#fff2dc" strokeWidth="0.9" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g23-cs-palm" l={2} t={20} w={50} h={62} d={40}>{palm}</V>
        <L c="g23-cs-swap" l={26} t={36} w={48} h={10} d={280} st={{ background: "linear-gradient(90deg, transparent, #fff2dc, transparent)" }} />
        <V c="g23-cs-shades" l={22} t={34} w={58} h={34} d={470}>{shades}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g23-hitside" l={6} t={22} w={46} h={58} d={0}>{palm}</V>
        <V c="g23-hit" l={28} t={38} w={44} h={28} d={140}>{shades}</V>
        <L c="g23-hit2" l={30} t={74} w={40} h={4} d={260} st={{ borderRadius: "999px", background: "#f0a8c0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(240,168,192,0.26)" /><Rim tone="rgba(255,242,220,0.24)" /></>}>
      <V c="g23-cs-piece" l={45.5} t={42} w={9} h={12} d={80}><path d={PAWN} fill="none" stroke="#fff2dc" strokeWidth="1.4" {...SJ} /></V>
      <V c="g23-fromside" l={38} t={38} w={11} h={14} d={220}>{palm}</V>
      <L c="g23-cs-swap" l={40} t={44} w={20} h={4} d={400} st={{ background: "linear-gradient(90deg, transparent, #fff2dc, transparent)" }} />
      <V c="g23-cs-palm" l={49} t={36} w={11} h={14} d={470}>{palm}</V>
      <V c="g23-cs-shades" l={43} t={43} w={14} h={7} d={600}>{shades}</V>
      <L c="g23-lean" l={42} t={56} w={18} h={4} d={660} st={{ borderRadius: "999px", background: "rgba(42,20,32,0.7)" }} />
      <L c="g23-glint" l={54} t={44} w={2.4} h={2.4} d={730} st={{ borderRadius: "50%", background: "#fff2dc" }} />
    </Lead>
  );
}

/* --- 17. Night Census (t1) — THE MARKED BACKS -------------------------------
   The stack is riffled once past the lamp. To the room it is a shuffle; to the
   conjuror every back has a pencil code in the corner and the whole deck has
   just been read. Palette: #7fc8b0 / #fff2dc / #10241f. */
const NC_MARKS: Array<[number, number]> = [[41, 39], [55, 41], [44, 53], [57, 52]];

function NightCensusScene({ role, delayMs }: SceneProps) {
  const back = (
    <g {...SJ}>
      <rect x="5" y="2" width="14" height="20" rx="1" fill="#10241f" stroke="#7fc8b0" strokeWidth="1.1" />
      <path d="M7.6 5.4h8.8M7.6 8.4h8.8M7.6 11.4h8.8M7.6 14.4h8.8" stroke="#7fc8b0" strokeWidth="0.7" />
      <circle cx="16.4" cy="19.2" r="1.2" fill="#fff2dc" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g23-nc-riffle" l={14} t={12} w={44} h={72} d={40}>{back}</V>
        <V c="g23-nc-riffle" l={40} t={16} w={44} h={72} d={220}>{back}</V>
        <L c="g23-nc-mark" l={64} t={62} w={14} h={14} d={470} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g23-hitside" l={24} t={12} w={52} h={72} d={0}>{back}</V>
        <L c="g23-hit" l={62} t={62} w={12} h={12} d={140} st={{ borderRadius: "50%", background: "#fff2dc" }} />
        <L c="g23-hit2" l={22} t={22} w={56} h={56} d={260} st={{ border: "2px solid #7fc8b0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Dim tone="rgba(6,14,12,0.36)" /><Wash tone="rgba(127,200,176,0.26)" d={130} /></>}>
      <V c="g23-nc-riffle" l={41} t={38} w={10} h={14} d={100}>{back}</V>
      <V c="g23-nc-riffle" l={49} t={39} w={10} h={14} d={230}>{back}</V>
      <L c="g23-nc-sweep" l={38} t={40} w={26} h={5} d={380} st={{ background: "linear-gradient(90deg, transparent, #fff2dc, transparent)" }} />
      {NC_MARKS.map(([l, t], i) => (
        <L key={i} c="g23-nc-mark" l={l} t={t} w={2.6} h={2.6} d={500 + i * 110} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      ))}
      <L c="g23-nc-tally" l={39} t={57} w={22} h={2} d={700} st={{ borderRadius: "999px", background: "#7fc8b0" }} />
      <L c="g23-lean" l={40} t={59} w={20} h={3.4} d={740} st={{ borderRadius: "999px", background: "rgba(16,36,31,0.7)" }} />
    </Lead>
  );
}

/* --- 18. Night Court (t1) — THE CHANGE BAG SWINGS ---------------------------
   The queen's colours go into the bag on its rod, the lever under the handle
   is thumbed across, and what comes out the other side of the divider is the
   same wardrobe in a much later hour. Palette: #c07fa8 / #fff2dc / #261020. */
function NightCourtScene({ role, delayMs }: SceneProps) {
  const bag = (
    <g {...SJ}>
      <path d="M4.4 8h15.2v9.4c0 2.4-2 4-7.6 4s-7.6-1.6-7.6-4z" fill="#261020" stroke="#c07fa8" strokeWidth="1.2" />
      <path d="M3 6.4h18v2.2H3z" fill="#c07fa8" />
      <path d="M12 2v4.4" stroke="#c07fa8" strokeWidth="1.4" />
    </g>
  );
  const cape = <path d="M12 3.4c4 0 6.4 3 7.4 7l1.2 10.2H3.4L4.6 10.4C5.6 6.4 8 3.4 12 3.4z" fill="#c07fa8" stroke="#261020" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g23-nt-bag" l={16} t={14} w={60} h={68} d={40} st={{ transformOrigin: "50% 4%" }}>{bag}</V>
        <L c="g23-nt-lever" l={62} t={22} w={22} h={7} d={280} st={{ borderRadius: "999px", background: "#fff2dc" }} />
        <V c="g23-nt-cape" l={26} t={34} w={48} h={52} d={470}>{cape}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g23-hitside" l={18} t={12} w={56} h={66} d={0} st={{ transformOrigin: "50% 4%" }}>{bag}</V>
        <V c="g23-hit" l={28} t={32} w={44} h={52} d={150}>{cape}</V>
        <L c="g23-hit2" l={30} t={82} w={40} h={4} d={260} st={{ borderRadius: "999px", background: "#c07fa8" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(192,127,168,0.26)" /><Rim tone="rgba(255,242,220,0.24)" /></>}>
      <V c="g23-nt-queen" l={45.5} t={42} w={9} h={12} d={70}><path d={QUEEN} fill="none" stroke="#fff2dc" strokeWidth="1.4" {...SJ} /></V>
      <V c="g23-nt-bag" l={40} t={34} w={14} h={18} d={200} st={{ transformOrigin: "50% 6%" }}>{bag}</V>
      <L c="g23-nt-lever" l={52} t={38} w={6} h={1.8} d={400} st={{ borderRadius: "999px", background: "#fff2dc" }} />
      <V c="g23-fromside" l={44} t={42} w={11} h={13} d={520}>{cape}</V>
      <L c="g23-nt-hem" l={42} t={54} w={16} h={2} d={640} st={{ borderRadius: "999px", background: "#c07fa8" }} />
      <L c="g23-glint" l={53} t={44} w={2.4} h={2.4} d={720} st={{ borderRadius: "50%", background: "#fff2dc" }} />
    </Lead>
  );
}

/* --- 19. Night Custodian (t1) — THE TOPIT --------------------------------
   The custodian's jacket has a bag sewn behind the lapel. The rook is set down
   in plain view, the lapel gapes for a quarter second, and for one turn there
   is simply nothing on the table to take. Palette: #9aa8c8 / #fff2dc / #181c2a. */
function NightCustodianScene({ role, delayMs }: SceneProps) {
  const lapel = (
    <g {...SJ}>
      <path d="M4.4 2.4h6.2L12 9.4 13.4 2.4h6.2L18 21.6H6z" fill="#181c2a" stroke="#9aa8c8" strokeWidth="1.2" />
      <path d="M10.6 2.4L12 9.4l1.4-7" fill="none" stroke="#fff2dc" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g23-cd-lapel" l={16} t={10} w={64} h={76} d={40}>{lapel}</V>
        <L c="g23-cd-topit" l={38} t={30} w={24} h={7} d={280} st={{ borderRadius: "999px", background: "#9aa8c8" }} />
        <V c="g23-cd-gone" l={34} t={38} w={32} h={44} d={470}><path d={ROOK} fill="#fff2dc" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g23-hitside" l={18} t={12} w={60} h={74} d={0}>{lapel}</V>
        <V c="g23-hit" l={34} t={36} w={32} h={44} d={150}><path d={ROOK} fill="#9aa8c8" /></V>
        <L c="g23-hit2" l={36} t={30} w={28} h={5} d={260} st={{ borderRadius: "999px", background: "#fff2dc" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Dim tone="rgba(8,10,18,0.36)" /><Wash tone="rgba(154,168,200,0.26)" d={130} /></>}>
      <V c="g23-cd-lapel" l={40} t={36} w={20} h={24} d={100}>{lapel}</V>
      <L c="g23-cd-topit" l={45} t={41} w={10} h={2.4} d={280} st={{ borderRadius: "999px", background: "#9aa8c8" }} />
      <V c="g23-tossup" l={46} t={45} w={8} h={11} d={420}><path d={ROOK} fill="#fff2dc" stroke="#181c2a" strokeWidth="1" {...SJ} /></V>
      <V c="g23-cd-gone" l={46} t={42} w={8} h={11} d={560}><path d={ROOK} fill="none" stroke="#9aa8c8" strokeWidth="1.5" {...SJ} /></V>
      <L c="g23-lean" l={41} t={58} w={20} h={4} d={640} st={{ borderRadius: "999px", background: "rgba(24,28,42,0.74)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g23-mote" l={44 + i * 6} t={50} w={1.5} h={1.5} d={720 + i * 90} st={{ borderRadius: "50%", background: "#9aa8c8" }} />
      ))}
    </Lead>
  );
}

/* --- 20. Wrong Game Night (t1) — THE DOUBLE LIFT -----------------------------
   Two are lifted as one. You are shown a draughts man, cleanly, from both
   sides; it goes back on top; and the thing that was under it the whole time is
   a pawn. Palette: #e08a70 / #fff3d8 / #2a1410. */
function WrongGameNightScene({ role, delayMs }: SceneProps) {
  const disc = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="8.6" fill="#e08a70" stroke="#2a1410" strokeWidth="1.3" />
      <circle cx="12" cy="12" r="5.4" fill="none" stroke="#2a1410" strokeWidth="0.9" />
      <circle cx="12" cy="12" r="2.4" fill="#fff3d8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g23-wg-lift" l={12} t={18} w={52} h={52} d={40}>{disc}</V>
        <V c="g23-wg-disc" l={44} t={26} w={46} h={46} d={280}>{disc}</V>
        <V c="g23-wg-reveal" l={30} t={38} w={36} h={48} d={480}><path d={PAWN} fill="#fff3d8" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g23-hitside" l={22} t={16} w={54} h={54} d={0}>{disc}</V>
        <V c="g23-hit" l={32} t={34} w={36} h={50} d={150}><path d={PAWN} fill="#fff3d8" stroke="#2a1410" strokeWidth="1.1" {...SJ} /></V>
        <L c="g23-hit2" l={30} t={82} w={40} h={4} d={260} st={{ borderRadius: "999px", background: "#e08a70" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(224,138,112,0.26)" /><Rim tone="rgba(255,243,216,0.24)" /></>}>
      <V c="g23-wg-stack" l={44} t={45} w={12} h={12} d={80}>{disc}</V>
      <V c="g23-wg-lift" l={44} t={38} w={12} h={12} d={230}>{disc}</V>
      <L c="g23-wg-turn" l={42} t={40} w={16} h={4} d={400} st={{ background: "linear-gradient(90deg, transparent, #fff3d8, transparent)" }} />
      <V c="g23-wg-disc" l={44} t={43} w={12} h={12} d={520}>{disc}</V>
      <V c="g23-wg-reveal" l={45.5} t={41} w={9} h={12} d={640}><path d={PAWN} fill="#fff3d8" stroke="#2a1410" strokeWidth="1" {...SJ} /></V>
      <L c="g23-lean" l={42} t={57} w={18} h={4} d={700} st={{ borderRadius: "999px", background: "rgba(42,20,16,0.7)" }} />
    </Lead>
  );
}

/* --- 21. Polite Cough (t1) — THE BALL THE EYE FOLLOWS ------------------------
   Toss, catch. Toss, catch. On the third the hand goes up and the eyes go with
   it, and while everybody is looking at nothing the clock quietly loses ten
   seconds. Palette: #cbb890 / #fff4d6 / #241f14. */
const PC_TOSSES = [0, 1];

function PoliteCoughScene({ role, delayMs }: SceneProps) {
  const eye = (
    <g {...SJ}>
      <path d="M1.6 12C4.6 7.2 8.2 4.8 12 4.8s7.4 2.4 10.4 7.2c-3 4.8-6.6 7.2-10.4 7.2S4.6 16.8 1.6 12z" fill="none" stroke="#cbb890" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="3.2" fill="#241f14" stroke="#fff4d6" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g23-pc-toss" l={40} t={54} w={20} h={20} d={40} st={{ borderRadius: "50%", background: "#cbb890" }} />
        <V c="g23-pc-gaze" l={22} t={22} w={56} h={40} d={280}>{eye}</V>
        <L c="g23-pc-nothing" l={36} t={12} w={28} h={28} d={480} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g23-hitside" l={42} t={52} w={16} h={16} d={0} st={{ borderRadius: "50%", background: "#cbb890" }} />
        <V c="g23-hit" l={24} t={24} w={52} h={38} d={150}>{eye}</V>
        <L c="g23-hit2" l={38} t={14} w={24} h={24} d={260} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(203,184,144,0.26)" /><Rim tone="rgba(255,244,214,0.22)" /></>}>
      {PC_TOSSES.map((i) => (
        <L key={i} c="g23-pc-toss" l={46 + i * 4} t={48} w={3.4} h={3.4} d={80 + i * 200} st={{ borderRadius: "50%", background: "#cbb890" }} />
      ))}
      <V c="g23-pc-gaze" l={40} t={40} w={12} h={9} d={340}>{eye}</V>
      <L c="g23-tossup" l={49} t={40} w={3.4} h={3.4} d={470} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      <L c="g23-pc-nothing" l={46} t={32} w={9} h={9} d={620} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      <V c="g23-pc-tick" l={52} t={46} w={9} h={9} d={690}>
        <g fill="none" stroke="#cbb890" strokeWidth="1.6" {...SJ}>
          <circle cx="12" cy="12" r="8.6" />
          <path d="M12 7.2V12l3.4 2.4" />
        </g>
      </V>
      <L c="g23-lean" l={42} t={57} w={18} h={4} d={740} st={{ borderRadius: "999px", background: "rgba(36,31,20,0.68)" }} />
    </Lead>
  );
}

/* =============================================================================
   Registry. Every entry declares an anchor and an existing SigSoundKey.

   `source` is set ONLY where the card's own engine definition really raises
   that zone the moment it is cast, checked against src/engine/buffs:
     hx4_smoke_line / hx4_shadowed_meadow  fx motif "blindfold" + pieces "all"
     hx4_hiccups / hx4_two_step            fx motif "slow" + pieces "all"
     ov_night_shift                        fx motif "empower", self, rooks
     bn4_night_watch                       addEffect king_safe at cast
   Every other card either paints no motif at all (bn4_night_gardener, the
   op_* items), names a motif that is not a SigZone (muzzle / anchor / jail),
   or declares a motif with no `pieces` scope and therefore paints nothing
   (hx4_loyal_hound) — so those entries stay on the removal-diff default.
   ========================================================================== */

/** Bind one bespoke scene to its config. */
function S(Render: SigPlugin["Render"], config: SigPlugin["config"]): SigPlugin {
  return { config, Render };
}

export const PLAYS: Record<string, SigPlugin> = {
  hx4_smoke_line: S(SmokeLineScene, { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "shades", source: "blindfold", anchor: "aim" }),
  hx4_solstice_shadow: S(SolsticeShadowScene, { ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "shades", anchor: "cast" }),
  hx4_loyal_hound: S(LoyalHoundScene, { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "gacha", anchor: "cast" }),
  hx4_wrong_map: S(WrongMapScene, { ordering: "radial", staggerMs: 60, victims: ["n"], hasLead: true, sound: "slots", anchor: "cast" }),
  ov_night_shift: S(NightShiftScene, { ordering: "line", staggerMs: 70, victims: ["r"], hasLead: true, sound: "vault", source: "empower", anchor: "aim" }),
  bn4_night_gardener: S(NightGardenerScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "gacha", anchor: "cast" }),
  bn4_night_watch: S(NightWatchScene, { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "vault", source: "kingSafe", anchor: "cast" }),
  hx4_borrowed_lantern: S(BorrowedLanternScene, { ordering: "octagon", staggerMs: 50, victims: "all", hasLead: true, sound: "shades", anchor: "cast" }),
  hx4_dim_torches: S(DimTorchesScene, { ordering: "line", staggerMs: 65, victims: "all", hasLead: true, sound: "snooze", anchor: "aim" }),
  hx4_shadowed_meadow: S(ShadowedMeadowScene, { ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "shades", source: "blindfold", anchor: "board" }),
  hx4_shrunken_shoes: S(ShrunkenShoesScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }),
  hx4_two_step: S(TwoStepScene, { ordering: "radial", staggerMs: 70, victims: "all", hasLead: true, sound: "wheel", source: "slow", anchor: "cast" }),
  ov_smoke_ring: S(SmokeRingScene, { ordering: "octagon", staggerMs: 55, victims: "all", hasLead: true, sound: "shades", anchor: "cast" }),
  hx4_hiccups: S(HiccupsScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "gacha", source: "slow", anchor: "cast" }),
  hx4_pigeon_perch: S(PigeonPerchScene, { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "gacha", anchor: "cast" }),
  op_champions_shades: S(ChampionsShadesScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board" }),
  op_night_census: S(NightCensusScene, { ordering: "sweep", staggerMs: 45, victims: "all", hasLead: true, sound: "slots", anchor: "board" }),
  op_night_court: S(NightCourtScene, { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "wheel", anchor: "board" }),
  op_night_custodian: S(NightCustodianScene, { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "vault", anchor: "cast" }),
  op_wrong_game_night: S(WrongGameNightScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "slots", anchor: "board" }),
  ov_polite_cough: S(PoliteCoughScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wheel", anchor: "board" }),
};
