// g29RallyPlays — bespoke plays for the 24 rally / muster / morale / command
// cards that used to share the generated `bannerRally` family (one banner, 24
// hue shifts).
//
// MODULE FICTION: A SIGNAL GIVEN AND ANSWERED. Never a recoloured banner.
// Every card is a different way an order TRAVELS and is OBEYED: a beacon lit
// and answered by a second beacon further off, semaphore arms swinging through
// their positions, a conductor's baton cutting three movements, a wax-sealed
// dispatch, a siren's lantern dragging a compass needle round, a signal flag
// two-blocked up a halyard, a pointer stick tapping a map table, a wet signal
// rocket that will not catch, a pace-stick opening the interval, moths in the
// colours, a whistle and two spades, a mess triangle, a finger-whistle down a
// lane, a hailing trumpet, a pigeon off the margin of the chart, a lift's floor
// indicator, a bugle and heads turning, a bosun's pipe, a post horn and a
// running courier, an usher's staff rapped on marble, a drumline picking up the
// step, a brass speaking tube, a photographer's flash tray, a dance master's
// count.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g29RallyPlays.css), transform/opacity animations only, no imports from
// BoardEffects.tsx, only the SigPlugin/SigRole TYPES from sigPlugins.tsx.
//
// STAGING. A signal goes FROM somewhere TO somewhere, so most of this module is
// aim-staged: the art is authored pointing RIGHT and <AimStage> turns it down
// the real source-to-target vector, while the run itself is measured by
// --fx-len rather than guessed. Board-scale layers (washes, edge gilt, the war
// room's map sheet, the photographer's flash) live inside <BoardFrame>, never
// at a fixed percentage of the stage. Answers arrive from the caster's own side
// via --fx-side, and travelling props cover --fx-len real cells.
//
// Every scene runs three beats — tell, strike, settle — in all three roles
// ("lead", "target", "entrance"). All CSS lives in g29RallyPlays.css behind the
// `g29-` prefix.

import "./g29RallyPlays.css";

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
const rootStyle = (d: number): CSSProperties => ({ "--g29-d": `${d}ms` }) as CSSProperties;

/** stagger + a beat offset, scaled by the Settings animation-speed var. */
const off = (ms: number): string => `calc(var(--g29-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

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
      style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, animationDelay: off(d), ...st }}
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
      style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, animationDelay: off(d), ...st }}
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

/** Board-wide wash, always inside a BoardFrame. Leans off the board centre. */
function Wash({ tone, d = 0 }: { tone: string; d?: number }) {
  return <L c="g29-wash" d={d} st={{ background: `radial-gradient(circle at 50% 48%, ${tone}, transparent 70%)` }} />;
}

/** Board-edge gilt, always inside a BoardFrame. */
function Rim({ tone, d = 160 }: { tone: string; d?: number }) {
  return <L c="g29-rim" d={d} st={{ boxShadow: `inset 0 0 30px 9px ${tone}` }} />;
}

/* Shared silhouettes: the people and pieces an order is given to. */
const PAWN = "M12 4.4a2.7 2.7 0 0 1 1.6 4.9l1.8 6.4H8.6l1.8-6.4A2.7 2.7 0 0 1 12 4.4z M7.4 16.8h9.2V19.4H7.4z";
const KING = "M11.1 2.4h1.8v1.5h1.5v1.8h-1.5v1.6h-1.8V5.7H9.6V3.9h1.5zM8 9.2h8l-1.1 7.4H9.1zM7.2 17.6h9.6V20H7.2z";
const HELM = "M5 20v-8a7 7 0 0 1 14 0v8zM9 11.4h6v2H9z";
const HEAD = "M12 3.6a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8zM5.6 21v-3.6c0-2.6 2.8-4.2 6.4-4.2s6.4 1.6 6.4 4.2V21z";

/* --- 1. The Elder Wyrm (t8) — THE BEACON IS ANSWERED ------------------------
   An iron brazier catches on the cast square, its flame column leaps, and far
   down the vector a SECOND beacon answers. What answers it is the wyrm: a wing
   sweeps the whole run, the downdraft slams flat, embers rain.
   Palette: #ff9b3d / #ffe9b8 / #2a1508. */
const EW_WING =
  "M1.5 13.6c5.4-.6 8.8-3.4 11-8.6 1.2 4.4 4.2 7 10 7.6-4.2 5.4-9.6 8.4-14.4 7.4-3.6-.8-6-3-6.6-6.4z";
const EW_FLAME = "M12 1.6c1.9 4.2 4.2 5.8 4.2 8.7a4.2 4.2 0 0 1-8.4 0C7.8 7.4 10.1 5.8 12 1.6z";

function ElderWyrmScene({ role, delayMs }: SceneProps) {
  const brazier = (
    <g {...SJ}>
      <path d="M5 8.6h14l-1.8 5.2H6.8z" fill="#2a1508" stroke="#ff9b3d" strokeWidth="1.2" />
      <path d="M9 13.8l-1.4 7M15 13.8l1.4 7M7 20.8h10" stroke="#2a1508" strokeWidth="1.4" fill="none" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g29-ew-brazier" l={26} t={40} w={48} h={48} d={40}>{brazier}</V>
        <V c="g29-ew-flare" l={34} t={8} w={32} h={44} d={220}><path d={EW_FLAME} fill="#ff9b3d" /></V>
        <V c="g29-ent-swoop" l={2} t={16} w={96} h={48} d={430}><path d={EW_WING} fill="#2a1508" stroke="#ffe9b8" strokeWidth="1" {...SJ} /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g29-hitside" l={4} t={14} w={92} h={52} d={0}><path d={EW_WING} fill="#2a1508" stroke="#ff9b3d" strokeWidth="1.2" {...SJ} /></V>
        <L c="g29-hit" l={26} t={40} w={48} h={48} d={140} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,233,184,0.8), transparent 68%)" }} />
        <L c="g29-hit2" l={18} t={78} w={64} h={4} d={250} st={{ borderRadius: "999px", background: "#ff9b3d" }} />
      </Cut>
    );
  }
  return (
    <AimLead
      d={delayMs}
      frame={
        <>
          <L c="g29-veil" st={{ background: "rgba(14,7,4,0.44)" }} />
          <Wash tone="rgba(255,155,61,0.32)" d={140} />
          <Rim tone="rgba(255,233,184,0.34)" d={220} />
        </>
      }
    >
      <V c="g29-ew-brazier" l={44} t={44} w={9} h={12} d={60}>{brazier}</V>
      <V c="g29-ew-flare" l={45.5} t={33} w={6} h={13} d={220}><path d={EW_FLAME} fill="#ff9b3d" /></V>
      <V c="g29-relay" l={45} t={41} w={7} h={9} d={420}><path d={EW_FLAME} fill="#ffe9b8" /></V>
      <V c="g29-ew-wing" l={40} t={34} w={30} h={26} d={560}><path d={EW_WING} fill="#2a1508" stroke="#ff9b3d" strokeWidth="0.9" {...SJ} /></V>
      <L c="g29-ew-down" l={42} t={45} w={20} h={12} d={720} st={{ borderRadius: "50%", border: "2px solid #ffe9b8" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g29-ember" l={46 + i * 7} t={48} w={1.6} h={1.6} d={800 + i * 110} st={{ borderRadius: "50%", background: "#ff9b3d" }} />
      ))}
    </AimLead>
  );
}

/* --- 2. House of Banners (t7) — THE SEMAPHORE SPELLS IT ---------------------
   A signal mast rises on the cast square and two semaphore arms swing through
   their positions, letter by letter. Down the field two helms answer by
   dropping onto the pawns that read them.
   Palette: #ffd166 / #fff4d6 / #2b2010. */
function HouseOfBannersScene({ role, delayMs }: SceneProps) {
  const arm = (fill: string) => <path d="M11 11h11l1.4 2-1.4 2H11z" fill={fill} stroke="#2b2010" strokeWidth="1" {...SJ} />;
  const mast = (
    <g {...SJ}>
      <path d="M12 1.6V22" stroke="#2b2010" strokeWidth="2" />
      <path d="M7.6 22h8.8" stroke="#ffd166" strokeWidth="1.8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g29-hb-post" l={30} t={8} w={40} h={80} d={40}>{mast}</V>
        <V c="g29-hb-arm" l={30} t={20} w={44} h={44} d={240} st={{ transformOrigin: "25% 50%" }}>{arm("#ffd166")}</V>
        <V c="g29-hb-arm2" l={30} t={44} w={44} h={44} d={400} st={{ transformOrigin: "25% 50%" }}>{arm("#fff4d6")}</V>
        <V c="g29-ent-drop" l={54} t={46} w={38} h={40} d={560}><path d={HELM} fill="#ffd166" stroke="#2b2010" strokeWidth="1.1" {...SJ} /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g29-hit" l={30} t={6} w={40} h={60} d={0}>{mast}</V>
        <V c="g29-hitside" l={26} t={34} w={48} h={54} d={130}><path d={HELM} fill="#ffd166" stroke="#2b2010" strokeWidth="1.2" {...SJ} /></V>
        <L c="g29-hit2" l={22} t={84} w={56} h={4} d={250} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(255,209,102,0.28)" /><Rim tone="rgba(255,244,214,0.3)" d={220} /></>}>
      <V c="g29-hb-post" l={45} t={32} w={10} h={26} d={80}>{mast}</V>
      <V c="g29-hb-arm" l={44} t={34} w={12} h={12} d={200} st={{ transformOrigin: "25% 50%" }}>{arm("#ffd166")}</V>
      <V c="g29-hb-arm2" l={44} t={40} w={12} h={12} d={330} st={{ transformOrigin: "25% 50%" }}>{arm("#fff4d6")}</V>
      {[0, 1].map((i) => (
        <V key={i} c="g29-hb-helm" l={39 + i * 15} t={45} w={8} h={10} d={520 + i * 130}>
          <path d={HELM} fill="#ffd166" stroke="#2b2010" strokeWidth="1.1" {...SJ} />
        </V>
      ))}
      <L c="g29-leanshadow" l={38} t={57} w={24} h={3} d={640} st={{ borderRadius: "999px", background: "rgba(43,32,16,0.6)" }} />
      <L c="g29-glint" l={49} t={33} w={2.4} h={2.4} d={760} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 3. Symphony of the Legion (t7) — THE BATON CUTS THREE MOVEMENTS --------
   Three staves rule themselves across the square, the baton lifts and then
   strikes three downbeats; each downbeat lights its own movement pip and a
   swell arc rolls out along the run.
   Palette: #b9c8ff / #fff4d6 / #191a33. */
const SY_SWELL = "M2 18C7 18 9 4 12 4s5 14 10 14";

function SymphonyOfTheLegionScene({ role, delayMs }: SceneProps) {
  const baton = (
    <g {...SJ}>
      <path d="M3.4 20.6L19 5" stroke="#fff4d6" strokeWidth="1.8" />
      <path d="M2.6 21.4l2.8-1.4-1.4-1.4z" fill="#b9c8ff" />
    </g>
  );
  const staves = (
    <g stroke="#b9c8ff" strokeWidth="1" {...SJ}>
      <path d="M2 7h20M2 12h20M2 17h20" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g29-sy-staff" l={6} t={26} w={88} h={48} d={40}>{staves}</V>
        <V c="g29-sy-baton" l={26} t={16} w={48} h={64} d={240} st={{ transformOrigin: "12% 92%" }}>{baton}</V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g29-sy-beat" l={24 + i * 22} t={44} w={8} h={8} d={430 + i * 120} st={{ borderRadius: "50%", background: "#fff4d6" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g29-hit" l={8} t={30} w={84} h={40} d={0}>{staves}</V>
        <V c="g29-hitside" l={28} t={16} w={44} h={60} d={140} st={{ transformOrigin: "12% 92%" }}>{baton}</V>
        <L c="g29-hit2" l={38} t={40} w={24} h={24} d={250} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(185,200,255,0.8), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><L c="g29-veil" st={{ background: "rgba(12,12,28,0.36)" }} /><Wash tone="rgba(185,200,255,0.3)" d={140} /></>}>
      <V c="g29-sy-staff" l={36} t={42} w={28} h={16} d={70}>{staves}</V>
      <V c="g29-sy-baton" l={40} t={32} w={16} h={20} d={200} st={{ transformOrigin: "12% 92%" }}>{baton}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g29-sy-beat" l={43 + i * 6} t={48} w={2.6} h={2.6} d={380 + i * 140} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
      <V c="g29-sy-swell" l={40} t={36} w={22} h={14} d={560}>
        <path d={SY_SWELL} fill="none" stroke="#b9c8ff" strokeWidth="1.4" {...SJ} />
      </V>
      <L c="g29-runout" l={45} t={52.4} w={26} h={1.8} d={300} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #fff4d6, rgba(185,200,255,0))", transformOrigin: "0% 50%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g29-sift" l={44 + i * 7} t={44} w={1.5} h={1.5} d={760 + i * 100} st={{ borderRadius: "50%", background: "#b9c8ff" }} />
      ))}
    </Lead>
  );
}

/* --- 4. Life Insurance (t6) — THE SEALED DISPATCH ---------------------------
   A courier's pouch flap lifts, the policy slides out, a wax seal presses it
   shut, and the carbon copy peels away toward the caster's own side: the order
   is filed where it can be answered later.
   Palette: #e8c98a / #fff2dc / #2a1e10. */
function LifeInsuranceScene({ role, delayMs }: SceneProps) {
  const paper = (
    <g {...SJ}>
      <path d="M5 2.6h10l4 4V21.4H5z" fill="#fff2dc" stroke="#2a1e10" strokeWidth="1.1" />
      <path d="M7.6 9.4h9M7.6 12.4h9M7.6 15.4h6" stroke="#2a1e10" strokeWidth="0.8" />
    </g>
  );
  const pouch = (
    <g {...SJ}>
      <path d="M3.6 9h16.8v11.4H3.6z" fill="#2a1e10" stroke="#e8c98a" strokeWidth="1.2" />
      <path d="M3.6 9l3-5.4h11l3 5.4z" fill="#e8c98a" stroke="#2a1e10" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g29-li-pouch" l={12} t={30} w={56} h={56} d={40} st={{ transformOrigin: "50% 80%" }}>{pouch}</V>
        <V c="g29-ent-rise" l={34} t={12} w={44} h={56} d={250}>{paper}</V>
        <V c="g29-li-seal" l={54} t={40} w={30} h={30} d={470}>
          <circle cx="12" cy="12" r="7.6" fill="#e8c98a" stroke="#2a1e10" strokeWidth="1.4" />
          <path d="M8.4 12h7.2M12 8.4v7.2" stroke="#2a1e10" strokeWidth="1.2" {...SJ} />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g29-hitside" l={22} t={10} w={56} h={70} d={0}>{paper}</V>
        <V c="g29-hit" l={38} t={40} w={26} h={26} d={150}><circle cx="12" cy="12" r="8" fill="#e8c98a" stroke="#2a1e10" strokeWidth="1.6" /></V>
        <L c="g29-hit2" l={26} t={84} w={48} h={4} d={260} st={{ borderRadius: "999px", background: "#fff2dc" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(232,201,138,0.28)" />}>
      <V c="g29-li-pouch" l={41} t={42} w={16} h={16} d={80} st={{ transformOrigin: "50% 80%" }}>{pouch}</V>
      <V c="g29-li-paper" l={44} t={35} w={11} h={14} d={240}>{paper}</V>
      <V c="g29-li-seal" l={46} t={42} w={7} h={7} d={430}>
        <circle cx="12" cy="12" r="8" fill="#e8c98a" stroke="#2a1e10" strokeWidth="1.6" />
        <path d="M8.4 12h7.2M12 8.4v7.2" stroke="#2a1e10" strokeWidth="1.4" {...SJ} />
      </V>
      <V c="g29-stepin" l={51} t={44} w={9} h={11} d={580}>{paper}</V>
      <L c="g29-leanshadow" l={41} t={57} w={20} h={3} d={640} st={{ borderRadius: "999px", background: "rgba(42,30,16,0.6)" }} />
      <L c="g29-glint" l={48} t={41} w={2.2} h={2.2} d={760} st={{ borderRadius: "50%", background: "#fff2dc" }} />
    </Lead>
  );
}

/* --- 5. Siren Song (t6) — THE LANTERN ON THE ROCK ---------------------------
   A green lantern is unhooded on the cast square and its lure runs the whole
   vector. A compass needle swings, hunts, and locks onto it; three sung notes
   drift out and the marked piece leans the way it is being pulled.
   Palette: #7fe0d0 / #fff4d6 / #0e2a2c. */
function SirenSongScene({ role, delayMs }: SceneProps) {
  const lantern = (
    <g {...SJ}>
      <path d="M9 3.4h6v2H9zM7 5.4h10l1.6 12.2H5.4z" fill="#0e2a2c" stroke="#7fe0d0" strokeWidth="1.2" />
      <path d="M9.4 8.4h5.2v6.6H9.4z" fill="#fff4d6" />
      <path d="M6 19.6h12" stroke="#7fe0d0" strokeWidth="1.4" />
    </g>
  );
  const needle = (
    <g {...SJ}>
      <path d="M2.6 12h18.8" stroke="#fff4d6" strokeWidth="1.6" />
      <path d="M21.4 12l-4 2.2v-4.4z" fill="#7fe0d0" />
      <circle cx="9" cy="12" r="2" fill="none" stroke="#7fe0d0" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g29-sn-lantern" l={10} t={20} w={48} h={64} d={40}>{lantern}</V>
        <V c="g29-sn-needle" l={38} t={38} w={56} h={28} d={280} st={{ transformOrigin: "38% 50%" }}>{needle}</V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g29-sn-note" l={54 + i * 12} t={18 + i * 8} w={5} h={5} d={480 + i * 110} st={{ borderRadius: "50%", background: "#7fe0d0" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g29-hit" l={26} t={12} w={48} h={62} d={0}>{lantern}</V>
        <V c="g29-hitside" l={20} t={40} w={60} h={30} d={140} st={{ transformOrigin: "38% 50%" }}>{needle}</V>
        <L c="g29-hit2" l={30} t={30} w={40} h={40} d={260} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(127,224,208,0.7), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><L c="g29-veil" st={{ background: "rgba(6,20,22,0.4)" }} /><Wash tone="rgba(127,224,208,0.28)" d={140} /></>}>
      <V c="g29-sn-lantern" l={43} t={41} w={9} h={13} d={70}>{lantern}</V>
      <L c="g29-runout" l={47} t={48.8} w={26} h={2.2} d={240} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #7fe0d0, rgba(127,224,208,0))", transformOrigin: "0% 50%" }} />
      <V c="g29-sn-needle" l={44} t={44} w={14} h={10} d={420} st={{ transformOrigin: "38% 50%" }}>{needle}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g29-sn-note" l={50 + i * 6} t={44 - i * 3} w={1.8} h={1.8} d={520 + i * 120} st={{ borderRadius: "50%", background: "#7fe0d0" }} />
      ))}
      <V c="g29-carry" l={45} t={44} w={7} h={10} d={700}><path d={PAWN} fill="#fff4d6" stroke="#0e2a2c" strokeWidth="1" {...SJ} /></V>
      <L c="g29-glint" l={46} t={42} w={2.4} h={2.4} d={780} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </AimLead>
  );
}

/* --- 6. Forward Banners (t3) — TWO-BLOCKED -------------------------------
   The halyard snaps taut, the signal flag runs all the way up and slams
   two-blocked at the truck, and the squares it orders forward light one after
   another along the run.
   Palette: #ffcf6b / #fff4d6 / #2c2110. */
function ForwardBannersScene({ role, delayMs }: SceneProps) {
  const flag = (
    <g {...SJ}>
      <path d="M4 2.6h11.6l-2.6 4 2.6 4H4z" fill="#ffcf6b" stroke="#2c2110" strokeWidth="1" />
      <path d="M4 2v10" stroke="#2c2110" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g29-fb-halyard" l={22} t={6} w={2} h={82} d={40} st={{ background: "#fff4d6", transformOrigin: "50% 100%" }} />
        <V c="g29-fb-hoist" l={20} t={12} w={54} h={40} d={220}>{flag}</V>
        <L c="g29-fb-block" l={14} t={8} w={20} h={6} d={470} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g29-hitside" l={20} t={14} w={60} h={44} d={0}>{flag}</V>
        <L c="g29-hit" l={44} t={54} w={12} h={30} d={140} st={{ borderRadius: "999px", background: "#ffcf6b" }} />
        <L c="g29-hit2" l={24} t={82} w={52} h={4} d={250} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(255,207,107,0.28)" />}>
      <L c="g29-fb-halyard" l={44.4} t={34} w={0.9} h={24} d={60} st={{ background: "#fff4d6", transformOrigin: "50% 100%" }} />
      <V c="g29-fb-hoist" l={44} t={34} w={12} h={10} d={180}>{flag}</V>
      <L c="g29-fb-block" l={43} t={33} w={4} h={1.6} d={420} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <L c="g29-runout" l={46} t={51} w={26} h={1.8} d={300} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #ffcf6b, rgba(255,207,107,0))", transformOrigin: "0% 50%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g29-fb-step" l={48 + i * 6} t={45} w={5} h={9} d={520 + i * 110} st={{ border: "1.6px solid #ffcf6b" }} />
      ))}
      {[0, 1, 2].map((i) => (
        <L key={i} c="g29-sift" l={47 + i * 6} t={52} w={1.4} h={1.4} d={720 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </AimLead>
  );
}

/* --- 7. War Room Map (t3) — THE POINTER TAPS -------------------------------
   The staff map unrolls across the entire board, its grid rules itself in, and
   the pointer stick raps down: three pins drop on the pieces nobody is
   covering. Palette: #d8b978 / #fff2dc / #22201a. */
function WarRoomMapScene({ role, delayMs }: SceneProps) {
  const pin = (
    <g {...SJ}>
      <path d="M12 21.4V12" stroke="#22201a" strokeWidth="1.4" />
      <circle cx="12" cy="8" r="5" fill="#d8b978" stroke="#22201a" strokeWidth="1.2" />
    </g>
  );
  const pointer = <path d="M2.6 21.4L20 4M20 4l-4.4.6M20 4l-.6 4.4" fill="none" stroke="#fff2dc" strokeWidth="1.8" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g29-wr-map" l={6} t={24} w={88} h={54} d={40} st={{ background: "linear-gradient(180deg, #d8b978, rgba(216,185,120,0.6))", transformOrigin: "0% 50%" }} />
        <V c="g29-wr-point" l={30} t={10} w={56} h={70} d={260} st={{ transformOrigin: "8% 92%" }}>{pointer}</V>
        <V c="g29-wr-pin" l={18} t={34} w={26} h={40} d={470}>{pin}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g29-hit" l={8} t={30} w={84} h={40} d={0} st={{ background: "linear-gradient(180deg, rgba(216,185,120,0.75), rgba(216,185,120,0.3))" }} />
        <V c="g29-hitside" l={30} t={16} w={40} h={62} d={140}>{pin}</V>
        <L c="g29-hit2" l={30} t={30} w={40} h={40} d={250} st={{ border: "2px solid #fff2dc" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <L c="g29-wr-map" st={{ background: "linear-gradient(180deg, rgba(216,185,120,0.42), rgba(34,32,26,0.5))", transformOrigin: "0% 50%" }} />
          <L c="g29-wr-grid" d={180} st={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,242,220,0.5) 0 1px, transparent 1px 12.5%), repeating-linear-gradient(90deg, rgba(255,242,220,0.5) 0 1px, transparent 1px 12.5%)" }} />
        </>
      }
    >
      <V c="g29-wr-point" l={36} t={28} w={24} h={30} d={320} st={{ transformOrigin: "8% 92%" }}>{pointer}</V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g29-wr-pin" l={43 + i * 6} t={43 + (i % 2) * 6} w={6} h={9} d={480 + i * 120}>{pin}</V>
      ))}
      <L c="g29-leanshadow" l={41} t={57} w={20} h={3} d={640} st={{ borderRadius: "999px", background: "rgba(34,32,26,0.6)" }} />
      <L c="g29-glint" l={50} t={44} w={2.4} h={2.4} d={760} st={{ borderRadius: "50%", background: "#fff2dc" }} />
    </Lead>
  );
}

/* --- 8. Soggy Invaders (t3) — THE SIGNAL ROCKET WILL NOT CATCH --------------
   The launch tube is set, the fuse sparks once and drowns, the rocket lifts a
   hand's breadth and sags back into the tube. What comes out is a dribble of
   wet smoke and three fat drips. Palette: #8fb8d8 / #fff2dc / #16222e. */
function SoggyInvadersScene({ role, delayMs }: SceneProps) {
  const rocket = (
    <g {...SJ}>
      <path d="M12 2.4c2.6 3 4 6.4 4 10.4v6.4H8v-6.4c0-4 1.4-7.4 4-10.4z" fill="#8fb8d8" stroke="#16222e" strokeWidth="1.1" />
      <path d="M8 15.4l-3 4.6h14l-3-4.6" fill="#16222e" />
    </g>
  );
  const tube = <path d="M6 21.4L9.6 5h4.8L18 21.4z" fill="#16222e" stroke="#8fb8d8" strokeWidth="1.2" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g29-si-tube" l={20} t={34} w={54} h={54} d={40} st={{ transformOrigin: "50% 92%" }}>{tube}</V>
        <V c="g29-si-lift" l={30} t={12} w={38} h={50} d={280}>{rocket}</V>
        <L c="g29-si-fizz" l={40} t={8} w={20} h={20} d={480} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,220,0.7), transparent 68%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g29-hitside" l={26} t={20} w={48} h={62} d={0}>{rocket}</V>
        <L c="g29-hit" l={38} t={10} w={24} h={24} d={140} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(143,184,216,0.8), transparent 70%)" }} />
        <L c="g29-hit2" l={44} t={54} w={12} h={30} d={250} st={{ borderRadius: "999px", background: "#8fb8d8", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(143,184,216,0.28)" /><L c="g29-veil" d={220} st={{ background: "rgba(10,18,26,0.34)" }} /></>}>
      <V c="g29-si-tube" l={44} t={43} w={12} h={15} d={70} st={{ transformOrigin: "50% 92%" }}>{tube}</V>
      <L c="g29-si-fuse" l={49} t={40} w={2.4} h={2.4} d={200} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      <V c="g29-si-lift" l={45.5} t={36} w={9} h={12} d={380}>{rocket}</V>
      <L c="g29-si-fizz" l={44} t={36} w={12} h={12} d={560} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,220,0.6), transparent 68%)" }} />
      <L c="g29-leanshadow" l={42} t={57} w={18} h={3} d={620} st={{ borderRadius: "999px", background: "rgba(22,34,46,0.62)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g29-si-drip" l={45 + i * 5} t={50} w={1.4} h={5} d={680 + i * 110} st={{ borderRadius: "999px", background: "#8fb8d8", transformOrigin: "50% 0%" }} />
      ))}
    </Lead>
  );
}

/* --- 9. Elbow Room (t2) — THE PACE-STICK OPENS -----------------------------
   The sergeant's pace-stick snaps open like a pair of dividers, the measured
   interval is laid out along the run, and two ranks are shoved apart to fit
   it. Tick marks settle where they are told to stand.
   Palette: #cfd8e8 / #fff4d6 / #1d2432. */
function ElbowRoomScene({ role, delayMs }: SceneProps) {
  const stick = (
    <g fill="none" stroke="#cfd8e8" strokeWidth="1.8" {...SJ}>
      <path d="M12 3.4L4 20.6M12 3.4l8 17.2" />
      <circle cx="12" cy="3.4" r="1.8" fill="#fff4d6" stroke="none" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g29-er-stick" l={22} t={12} w={56} h={64} d={40} st={{ transformOrigin: "50% 10%" }}>{stick}</V>
        <L c="g29-er-tick" l={16} t={74} w={68} h={3} d={280} st={{ borderRadius: "999px", background: "#fff4d6" }} />
        {[0, 1].map((i) => (
          <V key={i} c="g29-er-shove" l={4 + i * 66} t={40} w={30} h={44} d={450 + i * 130}><path d={PAWN} fill="#cfd8e8" /></V>
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g29-hit" l={24} t={12} w={52} h={60} d={0} st={{ transformOrigin: "50% 10%" }}>{stick}</V>
        <V c="g29-hitside" l={30} t={40} w={40} h={48} d={140}><path d={PAWN} fill="#cfd8e8" /></V>
        <L c="g29-hit2" l={16} t={80} w={68} h={3} d={250} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(207,216,232,0.26)" />}>
      <V c="g29-er-stick" l={42} t={36} w={16} h={20} d={80} st={{ transformOrigin: "50% 10%" }}>{stick}</V>
      <L c="g29-runout" l={46} t={51} w={26} h={1.6} d={260} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #fff4d6, rgba(207,216,232,0))", transformOrigin: "0% 50%" }} />
      {[0, 1].map((i) => (
        <V key={i} c="g29-er-shove" l={46 + i * 12} t={44} w={7} h={10} d={440 + i * 130}><path d={PAWN} fill="#cfd8e8" stroke="#1d2432" strokeWidth="1" {...SJ} /></V>
      ))}
      {[0, 1, 2].map((i) => (
        <L key={i} c="g29-er-tick" l={48 + i * 6} t={53} w={0.9} h={3} d={620 + i * 100} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      ))}
      {[0, 1, 2].map((i) => (
        <L key={i} c="g29-sift" l={47 + i * 7} t={49} w={1.4} h={1.4} d={720 + i * 90} st={{ borderRadius: "50%", background: "#cfd8e8" }} />
      ))}
    </AimLead>
  );
}

/* --- 10. Moths in the Banner (t2) — THE COLOURS ARE ON THE FRAME ------------
   The regimental colour hangs slack on a mending frame. Three moths spiral in,
   a hole opens in the silk, and the needle passes back and forth: no colours
   means no order goes out at all.
   Palette: #c6b58e / #fff2dc / #241f16. */
function MothsInTheBannerScene({ role, delayMs }: SceneProps) {
  const colours = (
    <g {...SJ}>
      <path d="M4 3.4h16v12.2c-3.4 1.4-6.4-1.6-8 .4-1.6 2-4.4.6-8-1z" fill="#c6b58e" stroke="#241f16" strokeWidth="1.1" />
      <path d="M4 3v18.6" stroke="#241f16" strokeWidth="1.6" />
    </g>
  );
  const moth = <path d="M12 8.4c-2.6-4-8-4.4-9.4-1.4C1.2 10 5 13.6 12 15.6c7-2 10.8-5.6 9.4-8.6-1.4-3-6.8-2.6-9.4 1.4z" fill="#fff2dc" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g29-mo-colours" l={10} t={16} w={70} h={62} d={40} st={{ transformOrigin: "10% 50%" }}>{colours}</V>
        {[0, 1, 2].map((i) => (
          <V key={i} c="g29-mo-moth" l={50 + i * 12} t={16 + i * 20} w={22} h={22} d={260 + i * 110}>{moth}</V>
        ))}
        <L c="g29-mo-hole" l={38} t={40} w={16} h={16} d={520} st={{ borderRadius: "50%", background: "#241f16" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g29-hitside" l={12} t={16} w={70} h={62} d={0} st={{ transformOrigin: "10% 50%" }}>{colours}</V>
        <V c="g29-hit" l={44} t={12} w={34} h={34} d={140}>{moth}</V>
        <L c="g29-hit2" l={40} t={42} w={16} h={16} d={260} st={{ borderRadius: "50%", background: "#241f16" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><L c="g29-veil" st={{ background: "rgba(16,14,10,0.36)" }} /><Wash tone="rgba(198,181,142,0.26)" d={140} /></>}>
      <V c="g29-mo-colours" l={41} t={38} w={18} h={18} d={90} st={{ transformOrigin: "10% 50%" }}>{colours}</V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g29-mo-moth" l={44 + i * 7} t={36 + (i % 2) * 8} w={6} h={6} d={250 + i * 110}>{moth}</V>
      ))}
      <L c="g29-mo-hole" l={47} t={43} w={4} h={4} d={520} st={{ borderRadius: "50%", background: "#241f16" }} />
      <V c="g29-mo-needle" l={42} t={38} w={16} h={16} d={640}>
        <path d="M3 20.4L20.4 3M20.4 3l-1.4 4" fill="none" stroke="#fff2dc" strokeWidth="1.6" {...SJ} />
      </V>
      <L c="g29-leanshadow" l={41} t={56} w={20} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(36,31,22,0.62)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g29-sift" l={44 + i * 6} t={48} w={1.4} h={1.4} d={760 + i * 90} st={{ borderRadius: "50%", background: "#c6b58e" }} />
      ))}
    </Lead>
  );
}

/* --- 11. Moat Digger (t2) — THE WHISTLE AND THE SPADES ----------------------
   One blast on the entrenching whistle and two spades bite the boards in
   sequence. The cut runs the length of the leg, and the spoil is thrown clear
   in fat clods. Palette: #a98c5f / #fff2dc / #221a10. */
function MoatDiggerScene({ role, delayMs }: SceneProps) {
  const spade = (
    <g {...SJ}>
      <path d="M12 2.4v9" stroke="#221a10" strokeWidth="1.8" />
      <path d="M9.4 2.4h5.2" stroke="#221a10" strokeWidth="1.6" />
      <path d="M7.4 11.4h9.2l-1.4 9.6H8.8z" fill="#a98c5f" stroke="#221a10" strokeWidth="1.1" />
    </g>
  );
  const whistle = (
    <g {...SJ}>
      <path d="M3 9.6h11.6l5.4 2.4-5.4 2.4H3z" fill="#fff2dc" stroke="#221a10" strokeWidth="1.1" />
      <circle cx="7" cy="12" r="1.6" fill="#221a10" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g29-md-whistle" l={6} t={34} w={52} h={34} d={40}>{whistle}</V>
        {[0, 1].map((i) => (
          <V key={i} c="g29-md-spade" l={40 + i * 26} t={20} w={30} h={60} d={280 + i * 150} st={{ transformOrigin: "50% 10%" }}>{spade}</V>
        ))}
        <L c="g29-md-clod" l={54} t={68} w={8} h={8} d={540} st={{ borderRadius: "50%", background: "#a98c5f" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g29-hitside" l={30} t={8} w={40} h={70} d={0} st={{ transformOrigin: "50% 10%" }}>{spade}</V>
        <L c="g29-hit" l={16} t={62} w={68} h={10} d={150} st={{ borderRadius: "999px", background: "#221a10" }} />
        <L c="g29-hit2" l={38} t={46} w={24} h={10} d={260} st={{ borderRadius: "999px", background: "#a98c5f" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(169,140,95,0.28)" />}>
      <V c="g29-md-whistle" l={42} t={40} w={12} h={8} d={60}>{whistle}</V>
      {[0, 1].map((i) => (
        <V key={i} c="g29-md-spade" l={47 + i * 8} t={38} w={8} h={12} d={240 + i * 150} st={{ transformOrigin: "50% 10%" }}>{spade}</V>
      ))}
      <L c="g29-runout" l={46} t={51} w={24} h={2.6} d={500} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #221a10, rgba(34,26,16,0))", transformOrigin: "0% 50%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g29-md-clod" l={48 + i * 6} t={45} w={2} h={2} d={600 + i * 110} st={{ borderRadius: "50%", background: "#a98c5f" }} />
      ))}
      <L c="g29-leanshadow" l={43} t={56} w={20} h={3} d={680} st={{ borderRadius: "999px", background: "rgba(34,26,16,0.6)" }} />
    </AimLead>
  );
}

/* --- 12. Second Breakfast (t2) — THE MESS TRIANGLE --------------------------
   The cook's iron triangle is rung, the beater goes round the inside of it
   twice, and two rings of that noise roll out. Two boot prints answer in
   single steps and a tin plate goes up.
   Palette: #ffc57a / #fff4d6 / #2c1c0e. */
function SecondBreakfastScene({ role, delayMs }: SceneProps) {
  const triangle = <path d="M12 2.6L21.4 20H2.6z" fill="none" stroke="#ffc57a" strokeWidth="2.2" {...SJ} />;
  const boot = <path d="M6 6h6.4v7.6L18 16v4H6z" fill="#fff4d6" stroke="#2c1c0e" strokeWidth="1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g29-sb-triangle" l={22} t={16} w={56} h={56} d={40}>{triangle}</V>
        <L c="g29-sb-beater" l={44} t={44} w={4} h={22} d={220} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "50% 0%" }} />
        {[0, 1].map((i) => (
          <L key={i} c="g29-sb-ring" l={16 - i * 8} t={12 - i * 8} w={68 + i * 16} h={68 + i * 16} d={380 + i * 150} st={{ borderRadius: "50%", border: "2px solid #ffc57a" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g29-hit" l={22} t={16} w={56} h={56} d={0}>{triangle}</V>
        <V c="g29-hitside" l={32} t={44} w={36} h={40} d={140}>{boot}</V>
        <L c="g29-hit2" l={14} t={12} w={72} h={72} d={250} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(255,197,122,0.28)" />}>
      <V c="g29-sb-triangle" l={42} t={40} w={14} h={14} d={70}>{triangle}</V>
      <L c="g29-sb-beater" l={47} t={45} w={1.2} h={6} d={160} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "50% 0%" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g29-sb-ring" l={40 - i * 5} t={38 - i * 5} w={18 + i * 10} h={18 + i * 10} d={300 + i * 130} st={{ borderRadius: "50%", border: "2px solid #ffc57a" }} />
      ))}
      <V c="g29-carry" l={46} t={46} w={7} h={8} d={520}>{boot}</V>
      <V c="g29-sb-plate" l={52} t={40} w={8} h={8} d={720}>
        <circle cx="12" cy="12" r="9" fill="none" stroke="#fff4d6" strokeWidth="2" />
        <circle cx="12" cy="12" r="4.4" fill="#ffc57a" />
      </V>
    </AimLead>
  );
}

/* --- 13. Bridle Path (t1) — THE FINGER-WHISTLE -----------------------------
   Two fingers, one flat sharp whistle, and the rein comes up taut the whole
   length of the lane. The bit and bridle swing in and two hoofprints are
   stamped down it. Palette: #d9a86a / #fff2dc / #241a0e. */
function BridlePathScene({ role, delayMs }: SceneProps) {
  const hand = (
    <g {...SJ}>
      <path d="M6 21V9.4c0-1.4 2-1.4 2 0V6.4c0-1.6 2.2-1.6 2.2 0v3c0-1.6 2.2-1.6 2.2 0" fill="none" stroke="#fff2dc" strokeWidth="1.6" />
      <path d="M12.4 9.4c1.6-1 4.4.6 4.4 3.4v4.4c0 2.4-1.6 3.8-4.4 3.8H8" fill="none" stroke="#d9a86a" strokeWidth="1.6" />
    </g>
  );
  const bridle = (
    <g fill="none" stroke="#d9a86a" strokeWidth="1.6" {...SJ}>
      <path d="M4 12h16" />
      <circle cx="5.4" cy="12" r="2.6" />
      <circle cx="18.6" cy="12" r="2.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g29-bp-whistle" l={8} t={18} w={44} h={62} d={40}>{hand}</V>
        <L c="g29-bp-rein" l={16} t={48} w={78} h={2.6} d={250} st={{ borderRadius: "999px", background: "#fff2dc", transformOrigin: "0% 50%" }} />
        <V c="g29-bp-bridle" l={48} t={34} w={46} h={38} d={470}>{bridle}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g29-hitside" l={26} t={16} w={48} h={64} d={0}>{hand}</V>
        <L c="g29-hit" l={8} t={50} w={84} h={4} d={140} st={{ borderRadius: "999px", background: "#fff2dc" }} />
        <V c="g29-hit2" l={30} t={36} w={40} h={34} d={250}>{bridle}</V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(217,168,106,0.26)" />}>
      <V c="g29-bp-whistle" l={42} t={40} w={10} h={13} d={60}>{hand}</V>
      <L c="g29-runout" l={47} t={49.4} w={26} h={1.6} d={220} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #fff2dc, rgba(217,168,106,0))", transformOrigin: "0% 50%" }} />
      <V c="g29-bp-bridle" l={50} t={43} w={11} h={9} d={400}>{bridle}</V>
      {[0, 1].map((i) => (
        <L key={i} c="g29-bp-hoof" l={52 + i * 8} t={52} w={3} h={2} d={540 + i * 130} st={{ borderRadius: "999px", background: "#241a0e" }} />
      ))}
      {[0, 1, 2].map((i) => (
        <L key={i} c="g29-sift" l={49 + i * 6} t={47} w={1.4} h={1.4} d={700 + i * 90} st={{ borderRadius: "50%", background: "#d9a86a" }} />
      ))}
    </AimLead>
  );
}

/* --- 14. Drawbridge (t1) — THE HAILING TRUMPET ------------------------------
   The warder raises a hailing trumpet at the gatehouse and blows. The chain
   answers it link by link, the deck swings down along the call, and the far
   end lands in a thump of dust. Palette: #c9a05c / #fff2dc / #241a0e. */
function DrawbridgeInScene({ role, delayMs }: SceneProps) {
  const trumpet = <path d="M2.6 10.6h11L21.4 6v12l-7.8-4.6h-11z" fill="#c9a05c" stroke="#241a0e" strokeWidth="1.1" {...SJ} />;
  const chain = (
    <g fill="none" stroke="#fff2dc" strokeWidth="1.6" {...SJ}>
      <circle cx="5" cy="12" r="3" />
      <circle cx="12" cy="12" r="3" />
      <circle cx="19" cy="12" r="3" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g29-db-trumpet" l={6} t={30} w={54} h={40} d={40}>{trumpet}</V>
        <V c="g29-db-chain" l={30} t={12} w={62} h={26} d={260}>{chain}</V>
        <L c="g29-db-plank" l={34} t={46} w={58} h={12} d={470} st={{ background: "#c9a05c", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g29-hitside" l={20} t={28} w={56} h={44} d={0}>{trumpet}</V>
        <L c="g29-hit" l={12} t={48} w={76} h={10} d={150} st={{ background: "#c9a05c", transformOrigin: "0% 50%" }} />
        <L c="g29-hit2" l={20} t={76} w={60} h={4} d={260} st={{ borderRadius: "999px", background: "#241a0e" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(201,160,92,0.28)" />}>
      <V c="g29-db-trumpet" l={42} t={42} w={12} h={9} d={70}>{trumpet}</V>
      <V c="g29-db-chain" l={47} t={38} w={16} h={6} d={240}>{chain}</V>
      <L c="g29-runout" l={47} t={49.6} w={24} h={1.6} d={300} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #fff2dc, rgba(201,160,92,0))", transformOrigin: "0% 50%" }} />
      <L c="g29-db-plank" l={47} t={46} w={20} h={5} d={420} st={{ background: "linear-gradient(180deg, #c9a05c, rgba(36,26,14,0.75))", transformOrigin: "0% 50%" }} />
      <L c="g29-db-thud" l={62} t={51} w={12} h={3} d={620} st={{ borderRadius: "999px", background: "rgba(36,26,14,0.7)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g29-sift" l={60 + i * 4} t={48} w={1.4} h={1.4} d={700 + i * 90} st={{ borderRadius: "50%", background: "#c9a05c" }} />
      ))}
    </AimLead>
  );
}

/* --- 15. Edge of the Map (t1) — THE PIGEON OFF THE MARGIN -------------------
   A basket lid flips at the very edge of the chart and a pigeon goes up with
   the dispatch tied to its leg, out past where the vellum stops. It is done
   twice, because the errand is run twice.
   Palette: #a8bcd4 / #fff4d6 / #1a2130. */
function EdgeOfTheMapScene({ role, delayMs }: SceneProps) {
  const bird = (
    <g {...SJ}>
      <path d="M2.6 14.4c4.6 1.4 8-.8 9.8-5.4 1.4 3.8 4.6 5.4 9 4.6-3.4 4.6-8.6 7.4-13.4 6.2-3.2-.8-5.2-2.6-5.4-5.4z" fill="#fff4d6" stroke="#1a2130" strokeWidth="0.9" />
      <circle cx="16.6" cy="9" r="1.2" fill="#a8bcd4" />
    </g>
  );
  const basket = (
    <g {...SJ}>
      <path d="M4.6 11h14.8l-1.6 9.6H6.2z" fill="#1a2130" stroke="#a8bcd4" strokeWidth="1.2" />
      <path d="M3.4 11h17.2" stroke="#a8bcd4" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g29-eo-cage" l={10} t={40} w={48} h={48} d={40} st={{ transformOrigin: "50% 90%" }}>{basket}</V>
        <V c="g29-ent-swoop" l={34} t={10} w={52} h={44} d={250}>{bird}</V>
        <L c="g29-eo-chart" l={68} t={6} w={28} h={88} d={470} st={{ background: "linear-gradient(90deg, rgba(168,188,212,0.7), transparent)", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g29-hitside" l={24} t={34} w={52} h={52} d={0} st={{ transformOrigin: "50% 90%" }}>{basket}</V>
        <V c="g29-hit" l={28} t={8} w={48} h={42} d={150}>{bird}</V>
        <L c="g29-hit2" l={38} t={62} w={24} h={4} d={260} st={{ borderRadius: "999px", background: "#a8bcd4" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(168,188,212,0.26)" />}>
      <V c="g29-eo-cage" l={43} t={44} w={10} h={11} d={60} st={{ transformOrigin: "50% 90%" }}>{basket}</V>
      <V c="g29-carry" l={45} t={40} w={7} h={7} d={220}>{bird}</V>
      <L c="g29-eo-chart" l={62} t={38} w={14} h={22} d={340} st={{ background: "linear-gradient(90deg, rgba(168,188,212,0.6), transparent)", transformOrigin: "0% 50%" }} />
      <V c="g29-eo-bird2" l={45} t={43} w={6} h={6} d={480}>{bird}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g29-eo-feather" l={48 + i * 6} t={44 + (i % 2) * 4} w={1.6} h={1.6} d={620 + i * 110} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </AimLead>
  );
}

/* --- 16. Freight Elevator (t1) — THE FLOOR INDICATOR ------------------------
   The call button lights, the brass indicator arrow swings across the floor
   numbers, and the freight cage slides forward straight through a floor. The
   concertina gate rattles open at the far end.
   Palette: #9fb4c8 / #fff2dc / #171d26. */
function FreightElevatorScene({ role, delayMs }: SceneProps) {
  const dial = (
    <g {...SJ}>
      <path d="M2.6 16A9.4 9.4 0 0 1 21.4 16" fill="none" stroke="#9fb4c8" strokeWidth="1.6" />
      <path d="M12 16L18.4 10.4" stroke="#fff2dc" strokeWidth="1.8" />
      <circle cx="12" cy="16" r="1.6" fill="#fff2dc" />
    </g>
  );
  const cage = (
    <g {...SJ}>
      <path d="M3.4 4h17.2v16H3.4z" fill="#171d26" stroke="#9fb4c8" strokeWidth="1.3" />
      <path d="M8 4v16M13 4v16M18 4v16" stroke="#9fb4c8" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g29-fe-call" l={8} t={40} w={14} h={14} d={40} st={{ borderRadius: "50%", background: "#fff2dc" }} />
        <V c="g29-fe-dial" l={26} t={12} w={54} h={44} d={230} st={{ transformOrigin: "50% 68%" }}>{dial}</V>
        <V c="g29-ent-slide" l={30} t={46} w={54} h={44} d={450}>{cage}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g29-hitside" l={20} t={20} w={60} h={56} d={0}>{cage}</V>
        <L c="g29-hit" l={40} t={10} w={20} h={20} d={140} st={{ borderRadius: "50%", background: "#fff2dc" }} />
        <L c="g29-hit2" l={16} t={80} w={68} h={4} d={250} st={{ borderRadius: "999px", background: "#9fb4c8" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(159,180,200,0.26)" />}>
      <L c="g29-fe-call" l={43} t={45} w={3} h={3} d={60} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      <V c="g29-fe-dial" l={42} t={36} w={14} h={11} d={200} st={{ transformOrigin: "50% 68%" }}>{dial}</V>
      <V c="g29-carry" l={45} t={43} w={7} h={11} d={380}>{cage}</V>
      <L c="g29-fe-gate" l={54} t={43} w={9} h={11} d={560} st={{ backgroundImage: "repeating-linear-gradient(90deg, #9fb4c8 0 1px, transparent 1px 4px)", transformOrigin: "0% 50%" }} />
      <L c="g29-fe-clank" l={56} t={46} w={8} h={5} d={700} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,220,0.75), transparent 68%)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g29-sift" l={52 + i * 5} t={51} w={1.4} h={1.4} d={760 + i * 90} st={{ borderRadius: "50%", background: "#9fb4c8" }} />
      ))}
    </AimLead>
  );
}

/* --- 17. Grand March (t1) — THE BUGLE ---------------------------------------
   The bugle goes up and the call travels out in three widening arcs. Two heads
   turn toward it, and the crown covers the two squares the call asked for.
   Palette: #ffcf7a / #fff4d6 / #2a1d0c. */
function GrandMarchScene({ role, delayMs }: SceneProps) {
  const bugle = (
    <g {...SJ}>
      <path d="M3 12h11c2 0 3.4-2 5-2v4c-1.6 0-3-2-5-2H3z" fill="#ffcf7a" stroke="#2a1d0c" strokeWidth="1.1" />
      <path d="M19 7.6v8.8" stroke="#ffcf7a" strokeWidth="2.6" />
    </g>
  );
  const arc = <path d="M6 3.4A12 12 0 0 1 6 20.6" fill="none" stroke="#fff4d6" strokeWidth="2" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g29-gm-bugle" l={6} t={32} w={54} h={36} d={40}>{bugle}</V>
        {[0, 1, 2].map((i) => (
          <V key={i} c="g29-gm-note" l={50 + i * 12} t={22} w={22} h={56} d={240 + i * 110}>{arc}</V>
        ))}
        <V c="g29-ent-turn" l={26} t={48} w={34} h={44} d={520}><path d={HEAD} fill="#ffcf7a" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g29-hit" l={16} t={30} w={56} h={40} d={0}>{bugle}</V>
        <V c="g29-hitside" l={30} t={38} w={40} h={50} d={140}><path d={HEAD} fill="#fff4d6" /></V>
        <V c="g29-hit2" l={60} t={22} w={26} h={56} d={250}>{arc}</V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(255,207,122,0.28)" /><Rim tone="rgba(255,244,214,0.28)" d={240} /></>}>
      <V c="g29-gm-bugle" l={42} t={43} w={12} h={8} d={70}>{bugle}</V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g29-gm-note" l={50 + i * 5} t={41} w={5} h={13} d={220 + i * 100}>{arc}</V>
      ))}
      {[0, 1].map((i) => (
        <V key={i} c="g29-gm-head" l={49 + i * 9} t={45} w={6} h={8} d={480 + i * 110}><path d={HEAD} fill="#ffcf7a" stroke="#2a1d0c" strokeWidth="1" {...SJ} /></V>
      ))}
      <V c="g29-carry" l={45} t={43} w={7} h={10} d={660}><path d={KING} fill="#fff4d6" stroke="#2a1d0c" strokeWidth="0.9" {...SJ} /></V>
      <L c="g29-glint" l={47} t={41} w={2.4} h={2.4} d={780} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </AimLead>
  );
}

/* --- 18. Harbor Walk (t1) — THE BOSUN'S PIPE -------------------------------
   The silver call is piped, its warble drawn out in a wavering line, and the
   mooring line is hauled sideways until the gangplank slides across and
   settles with a ripple. Palette: #7fc6d8 / #fff2dc / #122830. */
function HarborWalkScene({ role, delayMs }: SceneProps) {
  const pipe = (
    <g {...SJ}>
      <path d="M3 16.4h9c4 0 6-2.4 6-5.4" fill="none" stroke="#7fc6d8" strokeWidth="1.8" />
      <circle cx="18" cy="8.4" r="3" fill="#fff2dc" stroke="#122830" strokeWidth="1.1" />
    </g>
  );
  const trill = <path d="M2 12c2.6-6 5.2 6 7.8 0s5.2 6 7.8 0 4-3 4.4-2" fill="none" stroke="#fff2dc" strokeWidth="1.6" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g29-hw-pipe" l={8} t={28} w={48} h={46} d={40}>{pipe}</V>
        <V c="g29-hw-trill" l={30} t={34} w={64} h={30} d={240}>{trill}</V>
        <L c="g29-hw-plank" l={22} t={62} w={62} h={9} d={470} st={{ background: "linear-gradient(90deg, #7fc6d8, rgba(18,40,48,0.8))", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g29-hitside" l={22} t={26} w={52} h={48} d={0}>{pipe}</V>
        <V c="g29-hit" l={14} t={38} w={72} h={26} d={140}>{trill}</V>
        <L c="g29-hit2" l={16} t={74} w={68} h={5} d={250} st={{ borderRadius: "999px", background: "#7fc6d8" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(127,198,216,0.26)" />}>
      <V c="g29-hw-pipe" l={42} t={41} w={12} h={11} d={60}>{pipe}</V>
      <V c="g29-hw-trill" l={47} t={41} w={18} h={8} d={180}>{trill}</V>
      <L c="g29-runout" l={47} t={50.6} w={24} h={1.4} d={340} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #fff2dc, rgba(127,198,216,0))", transformOrigin: "0% 50%" }} />
      <L c="g29-hw-plank" l={47} t={46} w={20} h={4} d={520} st={{ background: "linear-gradient(90deg, #7fc6d8, rgba(18,40,48,0.75))", transformOrigin: "0% 50%" }} />
      <L c="g29-hw-ripple" l={56} t={48} w={14} h={6} d={660} st={{ borderRadius: "50%", border: "2px solid #fff2dc" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g29-sift" l={53 + i * 5} t={52} w={1.4} h={1.4} d={720 + i * 90} st={{ borderRadius: "50%", background: "#7fc6d8" }} />
      ))}
    </AimLead>
  );
}

/* --- 19. Old Post Road (t1) — THE POST HORN AND THE RUNNER ------------------
   The coiled post horn sounds, and the courier is already going: he covers the
   whole leg at a flat sprint, two milestones passing behind him, dust hanging
   in the road afterward. Palette: #d9b06a / #fff2dc / #26190c. */
function OldPostRoadScene({ role, delayMs }: SceneProps) {
  const horn = (
    <g fill="none" stroke="#d9b06a" strokeWidth="1.8" {...SJ}>
      <path d="M20 8.4c-6-4-14-2-14 3.6s7 7 11 4" />
      <path d="M20 5.4v6" />
    </g>
  );
  const runner = (
    <g {...SJ}>
      <circle cx="13" cy="4.6" r="2.6" fill="#fff2dc" />
      <path d="M14 7.4l-3.4 6 4.4 3.4M10.6 13.4l-5 2M14 6.4l5 3" fill="none" stroke="#fff2dc" strokeWidth="1.8" />
      <path d="M15 16.8l1.6 5M10 15.4l-3.6 5" fill="none" stroke="#d9b06a" strokeWidth="1.8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g29-op-horn" l={6} t={26} w={48} h={44} d={40}>{horn}</V>
        <V c="g29-ent-slide" l={36} t={26} w={44} h={58} d={260}>{runner}</V>
        <L c="g29-op-dust" l={20} t={72} w={54} h={6} d={480} st={{ borderRadius: "999px", background: "rgba(217,176,106,0.7)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g29-hitside" l={28} t={16} w={46} h={66} d={0}>{runner}</V>
        <L c="g29-hit" l={8} t={72} w={84} h={5} d={140} st={{ borderRadius: "999px", background: "#d9b06a" }} />
        <V c="g29-hit2" l={54} t={26} w={40} h={40} d={250}>{horn}</V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(217,176,106,0.26)" />}>
      <V c="g29-op-horn" l={42} t={41} w={12} h={11} d={60}>{horn}</V>
      <V c="g29-carry" l={45} t={43} w={7} h={11} d={220}>{runner}</V>
      <L c="g29-runout" l={46} t={52} w={26} h={1.4} d={300} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #26190c, rgba(38,25,12,0))", transformOrigin: "0% 50%" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g29-op-mile" l={51 + i * 8} t={48} w={2} h={4} d={400 + i * 140} st={{ background: "#fff2dc" }} />
      ))}
      <L c="g29-op-dust" l={46} t={52} w={16} h={3} d={620} st={{ borderRadius: "999px", background: "rgba(217,176,106,0.7)" }} />
      <L c="g29-glint" l={44} t={41} w={2.2} h={2.2} d={760} st={{ borderRadius: "50%", background: "#fff2dc" }} />
    </AimLead>
  );
}

/* --- 20. Palace Gate (t1) — THE USHER'S STAFF ------------------------------
   The staff is rapped three times on the marble, the raps ring out, and the
   two leaves of the gate part on the diagonal. A carpet runs out the length of
   the step. Palette: #e8c07a / #fff4d6 / #2b2010. */
function PalaceGateScene({ role, delayMs }: SceneProps) {
  const staff = (
    <g {...SJ}>
      <path d="M12 3.6v18" stroke="#e8c07a" strokeWidth="2" />
      <circle cx="12" cy="3.2" r="2.6" fill="#fff4d6" stroke="#2b2010" strokeWidth="1" />
    </g>
  );
  const door = (fill: string) => (
    <g {...SJ}>
      <path d="M4 3h16v18H4z" fill={fill} stroke="#2b2010" strokeWidth="1.2" />
      <path d="M7 6.4h10M7 10h10M7 13.6h10" stroke="#2b2010" strokeWidth="0.8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g29-pg-staff" l={10} t={12} w={30} h={76} d={40} st={{ transformOrigin: "50% 96%" }}>{staff}</V>
        {[0, 1].map((i) => (
          <L key={i} c="g29-pg-rap" l={4 + i * 4} t={70 + i * 4} w={40 - i * 8} h={20} d={230 + i * 120} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
        ))}
        <V c="g29-pg-door" l={48} t={16} w={44} h={68} d={470} st={{ transformOrigin: "0% 50%" }}>{door("#e8c07a")}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g29-hitside" l={30} t={10} w={40} h={72} d={0} st={{ transformOrigin: "50% 96%" }}>{staff}</V>
        <V c="g29-hit" l={44} t={20} w={44} h={60} d={140} st={{ transformOrigin: "0% 50%" }}>{door("#e8c07a")}</V>
        <L c="g29-hit2" l={14} t={40} w={72} h={30} d={250} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(232,192,122,0.28)" /><Rim tone="rgba(255,244,214,0.28)" d={240} /></>}>
      <V c="g29-pg-staff" l={43} t={38} w={7} h={16} d={70} st={{ transformOrigin: "50% 96%" }}>{staff}</V>
      {[0, 1].map((i) => (
        <L key={i} c="g29-pg-rap" l={40 - i * 3} t={48 - i * 2} w={14 + i * 6} h={7 + i * 3} d={200 + i * 110} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      ))}
      {[0, 1].map((i) => (
        <V key={i} c="g29-pg-door" l={52} t={i ? 47 : 38} w={9} h={9} d={440} st={{ transformOrigin: "0% 50%", rotate: i ? "18deg" : "-18deg" }}>{door(i ? "#fff4d6" : "#e8c07a")}</V>
      ))}
      <L c="g29-runout" l={47} t={50.6} w={24} h={2.4} d={560} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #e8c07a, rgba(232,192,122,0))", transformOrigin: "0% 50%" }} />
      <L c="g29-glint" l={57} t={45} w={2.6} h={2.6} d={700} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </AimLead>
  );
}

/* --- 21. Quickstep (t1) — THE DRUMLINE PICKS UP THE STEP --------------------
   One side drum, two sticks, and the beat is handed down the rank: three
   pulses travelling the leg, each louder than the last, until the boot moves
   two squares on the count. Palette: #ff9f6b / #fff4d6 / #2b170c. */
function QuickstepScene({ role, delayMs }: SceneProps) {
  const drum = (
    <g {...SJ}>
      <path d="M3.6 8h16.8v8H3.6z" fill="#ff9f6b" stroke="#2b170c" strokeWidth="1.2" />
      <path d="M3.6 8l16.8 8M20.4 8L3.6 16" stroke="#fff4d6" strokeWidth="1" />
    </g>
  );
  const stick = <path d="M3 21L20 4" fill="none" stroke="#fff4d6" strokeWidth="2" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g29-qs-drum" l={16} t={36} w={60} h={44} d={40}>{drum}</V>
        <V c="g29-qs-stick" l={22} t={8} w={40} h={44} d={220} st={{ transformOrigin: "90% 10%" }}>{stick}</V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g29-qs-pulse" l={30 + i * 16} t={24} w={8} h={8} d={420 + i * 110} st={{ borderRadius: "50%", background: "#ff9f6b" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g29-hit" l={18} t={34} w={62} h={44} d={0}>{drum}</V>
        <V c="g29-hitside" l={26} t={6} w={44} h={46} d={140} st={{ transformOrigin: "90% 10%" }}>{stick}</V>
        <L c="g29-hit2" l={34} t={44} w={32} h={22} d={250} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(255,159,107,0.28)" />}>
      <V c="g29-qs-drum" l={42} t={43} w={12} h={9} d={60}>{drum}</V>
      {[0, 1].map((i) => (
        <V key={i} c="g29-qs-stick" l={43 + i * 4} t={36} w={7} h={8} d={180 + i * 90} st={{ transformOrigin: "90% 10%" }}>{stick}</V>
      ))}
      {[0, 1, 2].map((i) => (
        <L key={i} c="g29-qs-pulse" l={49 + i * 6} t={46} w={2.6} h={2.6} d={380 + i * 110} st={{ borderRadius: "50%", background: "#ff9f6b" }} />
      ))}
      <V c="g29-carry" l={45} t={45} w={7} h={9} d={640}>
        <path d="M6 6h6.4v7.6L18 16v4H6z" fill="#fff4d6" stroke="#2b170c" strokeWidth="1" {...SJ} />
      </V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g29-sift" l={48 + i * 5} t={52} w={1.4} h={1.4} d={740 + i * 90} st={{ borderRadius: "50%", background: "#ff9f6b" }} />
      ))}
    </AimLead>
  );
}

/* --- 22. Squire's Errand (t1) — THE SPEAKING TUBE ---------------------------
   The whistle cap on the brass speaking tube pops up, the order goes down the
   pipe the whole length of it, and the squire's satchel comes bouncing back
   the other way. Twice, because the errand is run twice.
   Palette: #cbb27f / #fff2dc / #241c12. */
function SquiresErrandScene({ role, delayMs }: SceneProps) {
  const tube = (
    <g {...SJ}>
      <path d="M3 9.4h13.4l4.6 2.6-4.6 2.6H3z" fill="#cbb27f" stroke="#241c12" strokeWidth="1.1" />
      <path d="M3 8.4v7.2" stroke="#241c12" strokeWidth="1.6" />
    </g>
  );
  const satchel = (
    <g {...SJ}>
      <path d="M5.4 9h13.2v11.4H5.4z" fill="#241c12" stroke="#cbb27f" strokeWidth="1.2" />
      <path d="M5.4 9l2.6-4.6h8l2.6 4.6z" fill="#cbb27f" stroke="#241c12" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g29-se-tube" l={6} t={34} w={56} h={34} d={40}>{tube}</V>
        <L c="g29-se-cap" l={8} t={16} w={12} h={12} d={220} st={{ borderRadius: "50%", background: "#fff2dc" }} />
        <V c="g29-ent-slide" l={44} t={38} w={44} h={46} d={450}>{satchel}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g29-hit" l={12} t={34} w={62} h={34} d={0}>{tube}</V>
        <V c="g29-hitside" l={38} t={34} w={44} h={48} d={140}>{satchel}</V>
        <L c="g29-hit2" l={20} t={78} w={60} h={4} d={250} st={{ borderRadius: "999px", background: "#cbb27f" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(203,178,127,0.26)" />}>
      <V c="g29-se-tube" l={42} t={43} w={13} h={8} d={70}>{tube}</V>
      <L c="g29-se-cap" l={43} t={39} w={2.4} h={2.4} d={180} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      <L c="g29-runout" l={47} t={49.4} w={26} h={1.8} d={300} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #fff2dc, rgba(203,178,127,0))", transformOrigin: "0% 50%" }} />
      <V c="g29-carry" l={45} t={44} w={7} h={9} d={480}>{satchel}</V>
      <L c="g29-se-echo" l={44} t={45} w={10} h={7} d={640} st={{ borderRadius: "50%", border: "2px solid #cbb27f" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g29-sift" l={48 + i * 5} t={50} w={1.4} h={1.4} d={720 + i * 90} st={{ borderRadius: "50%", background: "#cbb27f" }} />
      ))}
    </AimLead>
  );
}

/* --- 23. Team Photo (t1) — THE FLASH TRAY ----------------------------------
   The photographer's hand goes up, the plate camera settles on its tripod, and
   the magnesium tray goes off: the whole board is white-hot for one frame. The
   exposed plate slides out and the smoke drifts.
   Palette: #ffe6a8 / #fff4d6 / #241f16. */
function TeamPhotoScene({ role, delayMs }: SceneProps) {
  const camera = (
    <g {...SJ}>
      <path d="M3.6 6.4h11.8v9H3.6z" fill="#241f16" stroke="#ffe6a8" strokeWidth="1.2" />
      <path d="M15.4 8.6l5 -2.2v9l-5-2.2z" fill="#ffe6a8" stroke="#241f16" strokeWidth="1" />
      <path d="M6 15.4l-2.4 6M12.4 15.4l2.4 6M9.4 15.4v6" stroke="#ffe6a8" strokeWidth="1.2" />
    </g>
  );
  const tray = (
    <g {...SJ}>
      <path d="M4 13.4h13v2.6H4z" fill="#241f16" stroke="#ffe6a8" strokeWidth="1.1" />
      <path d="M17 14.6h4" stroke="#ffe6a8" strokeWidth="1.4" />
      <path d="M10.4 4.4c1.4 3 3 4 3 6a3 3 0 0 1-6 0c0-2 1.6-3 3-6z" fill="#fff4d6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g29-tp-tripod" l={16} t={26} w={60} h={62} d={40}>{camera}</V>
        <V c="g29-tp-tray" l={52} t={14} w={44} h={44} d={260}>{tray}</V>
        <L c="g29-tp-flash" l={10} t={10} w={80} h={80} d={470} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.9), transparent 68%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g29-hit" l={14} t={14} w={72} h={72} d={0} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.85), transparent 66%)" }} />
        <V c="g29-hitside" l={30} t={34} w={40} h={52} d={140}><path d={PAWN} fill="#ffe6a8" /></V>
        <L c="g29-hit2" l={24} t={24} w={52} h={52} d={250} st={{ border: "2px solid #ffe6a8" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <L c="g29-tp-flash" d={420} st={{ background: "radial-gradient(circle at 50% 50%, rgba(255,244,214,0.9), rgba(255,230,168,0.35) 55%, transparent 78%)" }} />
          <Rim tone="rgba(255,230,168,0.4)" d={480} />
        </>
      }
    >
      <V c="g29-tp-hand" l={38} t={34} w={9} h={12} d={70} st={{ transformOrigin: "50% 100%" }}>
        <path d="M8 21v-8.6c0-1 1.6-1 1.6 0V8c0-1.1 1.7-1.1 1.7 0v3.4c0-1.2 1.7-1.2 1.7 0V9.2c0-1.2 1.7-1.2 1.7 0V17c0 2.6-1.6 4-4.4 4z" fill="#fff4d6" />
      </V>
      <V c="g29-tp-tripod" l={44} t={40} w={13} h={16} d={140}>{camera}</V>
      <V c="g29-tp-tray" l={53} t={37} w={9} h={9} d={260}>{tray}</V>
      <V c="g29-tp-plate" l={44} t={45} w={10} h={12} d={560}>
        <rect x="3" y="4" width="18" height="16" rx="1" fill="#241f16" stroke="#ffe6a8" strokeWidth="1.2" />
        <path d="M6 16.4l4-5 3 3.4 2.6-2.6L18 16.4z" fill="#ffe6a8" />
      </V>
      <L c="g29-leanshadow" l={41} t={57} w={22} h={3} d={640} st={{ borderRadius: "999px", background: "rgba(36,31,22,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g29-sift" l={50 + i * 5} t={40} w={1.6} h={1.6} d={700 + i * 100} st={{ borderRadius: "50%", background: "#ffe6a8" }} />
      ))}
    </Lead>
  );
}

/* --- 24. Waltz Left (t1) — THE DANCE MASTER COUNTS -------------------------
   Two hands clap, a count of three lights up, the footprint chart turns on the
   floor, and the crown takes the two squares in waltz time.
   Palette: #e2a8d0 / #fff4d6 / #2a1428. */
function WaltzLeftScene({ role, delayMs }: SceneProps) {
  const clap = (
    <g fill="none" stroke="#fff4d6" strokeWidth="1.7" {...SJ}>
      <path d="M9.4 21V10c0-1.4 2-1.4 2 0V6.6c0-1.6 2.2-1.6 2.2 0V10" />
      <path d="M13.6 10.4c1.6-.8 4 .8 4 3.4v3.4c0 2.4-1.6 3.8-4.4 3.8h-4" />
    </g>
  );
  const steps = (
    <g fill="none" stroke="#e2a8d0" strokeWidth="1.5" strokeDasharray="2.4 1.6" {...SJ}>
      <circle cx="12" cy="12" r="9.4" />
      <path d="M12 2.6v18.8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g29-wz-clap" l={20} t={20} w={54} h={58} d={40}>{clap}</V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g29-wz-count" l={22 + i * 22} t={72} w={8} h={8} d={230 + i * 110} st={{ borderRadius: "50%", background: "#e2a8d0" }} />
        ))}
        <V c="g29-ent-turn" l={26} t={22} w={50} h={50} d={520}>{steps}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g29-hit" l={22} t={22} w={56} h={56} d={0}>{steps}</V>
        <V c="g29-hitside" l={30} t={26} w={44} h={48} d={140}>{clap}</V>
        <L c="g29-hit2" l={38} t={40} w={24} h={24} d={250} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(226,168,208,0.75), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(226,168,208,0.28)" />}>
      <V c="g29-wz-clap" l={42} t={40} w={11} h={13} d={60}>{clap}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g29-wz-count" l={46 + i * 5} t={53} w={2.4} h={2.4} d={180 + i * 100} st={{ borderRadius: "50%", background: "#e2a8d0" }} />
      ))}
      <V c="g29-wz-step" l={44} t={41} w={14} h={14} d={480}>{steps}</V>
      <V c="g29-carry" l={45} t={43} w={7} h={10} d={600}><path d={KING} fill="#fff4d6" stroke="#2a1428" strokeWidth="0.9" {...SJ} /></V>
      <L c="g29-glint" l={50} t={42} w={2.4} h={2.4} d={720} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </AimLead>
  );
}

/* =============================================================================
   Registry. Every entry declares an anchor; every `sound` is an existing
   SigSoundKey. `source` is deliberately omitted throughout: these plays carry
   no persistent decoration of their own, so the scene is the cast lead on the
   square the card was played on.
   ========================================================================== */

/** Bind one bespoke scene to its config. */
function S(Render: SigPlugin["Render"], config: SigPlugin["config"]): SigPlugin {
  return { config, Render };
}

export const PLAYS: Record<string, SigPlugin> = {
  ov_elder_wyrm: S(ElderWyrmScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "siege", anchor: "board" }),
  bn4_house_of_banners: S(HouseOfBannersScene, { ordering: "file", staggerMs: 90, victims: ["p"], hasLead: true, sound: "coronation", anchor: "cast" }),
  ov_symphony_of_the_legion: S(SymphonyOfTheLegionScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "coronation", anchor: "cast" }),
  bn4_life_insurance: S(LifeInsuranceScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain", anchor: "cast" }),
  hx4_siren_song: S(SirenSongScene, { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "siege", anchor: "board" }),
  bn4_forward_banners: S(ForwardBannersScene, { ordering: "file", staggerMs: 80, victims: ["p"], hasLead: true, sound: "coronation", anchor: "aim" }),
  bn4_war_room_map: S(WarRoomMapScene, { ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "wall", anchor: "board" }),
  hx4_soggy_invaders: S(SoggyInvadersScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "wall", anchor: "board" }),
  hx4_elbow_room: S(ElbowRoomScene, { ordering: "line", staggerMs: 65, victims: "all", hasLead: true, sound: "wall", anchor: "board" }),
  hx4_moths_in_the_banner: S(MothsInTheBannerScene, { ordering: "radial", staggerMs: 70, victims: ["r"], hasLead: true, sound: "blitz", anchor: "cast" }),
  ov_moat_digger: S(MoatDiggerScene, { ordering: "line", staggerMs: 90, victims: "all", hasLead: true, sound: "siege", anchor: "board" }),
  ov_second_breakfast: S(SecondBreakfastScene, { ordering: "line", staggerMs: 80, victims: ["p"], hasLead: true, sound: "coronation", anchor: "aim" }),
  op_bridle_path: S(BridlePathScene, { ordering: "line", staggerMs: 70, victims: ["p"], hasLead: true, sound: "blitz", anchor: "aim" }),
  op_drawbridge_in: S(DrawbridgeInScene, { ordering: "line", staggerMs: 70, victims: ["p"], hasLead: true, sound: "wall", anchor: "aim" }),
  op_edge_of_the_map: S(EdgeOfTheMapScene, { ordering: "line", staggerMs: 75, victims: ["p"], hasLead: true, sound: "blitz", anchor: "aim" }),
  op_freight_elevator: S(FreightElevatorScene, { ordering: "line", staggerMs: 70, victims: ["r"], hasLead: true, sound: "siege", anchor: "aim" }),
  op_grand_march: S(GrandMarchScene, { ordering: "line", staggerMs: 80, victims: ["k"], hasLead: true, sound: "coronation", anchor: "aim" }),
  op_harbor_walk: S(HarborWalkScene, { ordering: "line", staggerMs: 70, victims: ["p"], hasLead: true, sound: "wall", anchor: "aim" }),
  op_old_post_road: S(OldPostRoadScene, { ordering: "line", staggerMs: 70, victims: ["p"], hasLead: true, sound: "blitz", anchor: "aim" }),
  op_palace_gate: S(PalaceGateScene, { ordering: "line", staggerMs: 70, victims: ["p"], hasLead: true, sound: "coronation", anchor: "aim" }),
  op_quickstep: S(QuickstepScene, { ordering: "line", staggerMs: 65, victims: ["k"], hasLead: true, sound: "blitz", anchor: "aim" }),
  op_squires_errand: S(SquiresErrandScene, { ordering: "line", staggerMs: 75, victims: ["p"], hasLead: true, sound: "wall", anchor: "aim" }),
  op_team_photo: S(TeamPhotoScene, { ordering: "radial", staggerMs: 40, victims: "all", hasLead: true, sound: "crownrain", anchor: "board" }),
  op_waltz_left: S(WaltzLeftScene, { ordering: "line", staggerMs: 80, victims: ["k"], hasLead: true, sound: "coronation", anchor: "aim" }),
};
