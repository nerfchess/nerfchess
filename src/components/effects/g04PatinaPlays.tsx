// g04PatinaPlays — bespoke plays for the 29 relief / respite cards that used to
// share the generated `hourglass` family (one falling sandglass, 29 hue shifts).
//
// MODULE FICTION: WEAR, DECAY AND PRESERVATION. Never an hourglass, never a
// clock of any kind. These cards are time as something that HAPPENS TO MATTER,
// caught at the moment the change becomes visible: verdigris blooming across a
// bronze bell; a wax seal softening and slumping under its matrix; varnish
// yellowing and crazing over an old portrait; a rope fraying strand by strand
// until the loop slips; a blade losing its edge on an oiled stone; a fossil
// pressed into shale and split open; resin closing over a sleeping insect;
// a preserving jar sealing itself; a ledger's iron-gall ink browning to a
// ghost; a coin rubbed featureless in a palm; dry rot creeping through a hall
// beam; a tapestry's dyes leaching out of both banners at once.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g04PatinaPlays.css), transform/opacity animations only, no imports from
// BoardEffects.tsx, only the SigPlugin/SigRole TYPES from sigPlugins.tsx.
//
// STAGING. Every card declares anchor "cast" or "aim", so the decay happens on
// the square the card was played on. Board-scale layers (the damp wash, the
// edge bloom) live inside <BoardFrame>, never at a fixed percentage of the
// stage. Cards whose wear TRAVELS along a line (a trowel cut through strata, a
// rope under tension, a blade drawn down a stone, a bleach line crossing cloth,
// a boot stepping on, a road of milestones) use <AimStage> and author their art
// pointing RIGHT.
//
// Every scene runs three beats — tell, strike, settle — in all three roles
// ("lead", "target", "entrance"), and every lead carries at least one animated
// layer driven by the geometry vars (--fx-ox/--fx-oy creep, --fx-side slump and
// lay-in, --fx-len run), which is what makes the play directional rather than
// decorative. All CSS lives in g04PatinaPlays.css behind the `g04-` prefix.

import "./g04PatinaPlays.css";

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
const rootStyle = (d: number): CSSProperties => ({ "--g04-d": `${d}ms` }) as CSSProperties;

/** stagger + a beat offset, scaled by the Settings animation-speed var. */
const b = (ms: number): string => `calc(var(--g04-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

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

/** Board-wide damp, always inside a BoardFrame. */
function Wash({ tone, d = 0 }: { tone: string; d?: number }) {
  return <L c="g04-wash" d={d} st={{ background: `radial-gradient(circle at 50% 48%, ${tone}, transparent 70%)` }} />;
}

/** Board-edge bloom, always inside a BoardFrame. */
function Rim({ tone, d = 150 }: { tone: string; d?: number }) {
  return <L c="g04-rim" d={d} st={{ boxShadow: `inset 0 0 28px 8px ${tone}` }} />;
}

/** Falling flakes, powder, grit: the settle beat almost every card wants. */
function Sift({ col, l = 42, t = 50, d = 700, n = 3, step = 6 }: {
  col: string; l?: number; t?: number; d?: number; n?: number; step?: number;
}) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <L key={i} c="g04-sift" l={l + i * step} t={t} w={1.5} h={1.5} d={d + i * 110} st={{ borderRadius: "50%", background: col }} />
      ))}
    </>
  );
}

/* --- 1. Visor Down (t3) — THE RUSTED VISOR ----------------------------------
   The pivot rivet has worn round and orange, the visor slams shut of its own
   weight, and the rust scale that held it cracks off in plates. Palette:
   #c9762f / #ffe9c2 / #2b1a10. */
const VD_HELM = "M4 12a8 8 0 0 1 16 0v8H4z";

function VisorDownScene({ role, delayMs }: SceneProps) {
  const helm = <path d={VD_HELM} fill="#2b1a10" stroke="#c9762f" strokeWidth="1.3" {...SJ} />;
  const visor = (
    <g {...SJ}>
      <path d="M4 5h16v9H4z" fill="#c9762f" stroke="#2b1a10" strokeWidth="1.2" />
      <path d="M5.6 8.6h12.8M5.6 11.2h12.8" stroke="#2b1a10" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-rise" l={16} t={34} w={68} h={56} d={40}>{helm}</V>
        <V c="g04-vd-visor" l={18} t={16} w={64} h={44} d={260} st={{ transformOrigin: "50% 6%" }}>{visor}</V>
        <V c="g04-ent-bloom" l={62} t={12} w={26} h={26} d={470}>
          <circle cx="12" cy="12" r="6" fill="#ffe9c2" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={18} t={30} w={64} h={56} d={0}>{helm}</V>
        <V c="g04-hit" l={20} t={16} w={60} h={40} d={140} st={{ transformOrigin: "50% 6%" }}>{visor}</V>
        <L c="g04-hit2" l={44} t={70} w={12} h={4} d={260} st={{ borderRadius: "999px", background: "#c9762f" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(201,118,47,0.28)" />
          <Rim tone="rgba(255,233,194,0.3)" />
        </>
      }
    >
      <L c="g04-creep" l={39} t={38} w={22} h={22} d={90} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(201,118,47,0.7), transparent 68%)" }} />
      <V c="g04-vd-rivet" l={41.6} t={41} w={4} h={4} d={220}>
        <circle cx="12" cy="12" r="8" fill="#c9762f" stroke="#2b1a10" strokeWidth="2.4" />
      </V>
      <V c="g04-vd-helm" l={43} t={43} w={14} h={16} d={300}>{helm}</V>
      <V c="g04-vd-visor" l={43} t={40} w={14} h={11} d={470} st={{ transformOrigin: "50% 6%" }}>{visor}</V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g04-vd-scale" l={40 + i * 8} t={46} w={4} h={4} d={600 + i * 90}>
          <path d="M3 6h18l-4 12H7z" fill="#c9762f" />
        </V>
      ))}
      <Sift col="#ffe9c2" l={41} t={52} d={700} n={3} />
    </Lead>
  );
}

/* --- 2. Angelus Bell (t2) — VERDIGRIS ON BRONZE -----------------------------
   Green patina blooms out from the crown of a bronze bell, the bell tips once
   to toll, and a shell of verdigris cracks off the lip. Palette: #6fc9a8 /
   #fff1cf / #14322a. */
const AB_BELL = "M12 3c4 0 6.4 3.4 6.4 8V17H5.6v-6c0-4.6 2.4-8 6.4-8z";

function AngelusBellScene({ role, delayMs }: SceneProps) {
  const bell = (
    <g {...SJ}>
      <path d={AB_BELL} fill="#14322a" stroke="#6fc9a8" strokeWidth="1.3" />
      <path d="M4 17h16v2.4H4z" fill="#6fc9a8" />
      <path d="M12 1.4v2" stroke="#6fc9a8" strokeWidth="1.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-rise" l={20} t={16} w={60} h={64} d={40}>{bell}</V>
        <L c="g04-ab-patina" l={24} t={22} w={52} h={52} d={280} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(111,201,168,0.85), transparent 66%)" }} />
        <V c="g04-ent-mote" l={54} t={56} w={22} h={22} d={480}>
          <path d="M3 6h18l-4 12H7z" fill="#6fc9a8" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={22} t={16} w={56} h={62} d={0}>{bell}</V>
        <L c="g04-hit2" l={26} t={22} w={48} h={48} d={150} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(111,201,168,0.8), transparent 66%)" }} />
        <L c="g04-hit" l={44} t={78} w={12} h={4} d={260} st={{ borderRadius: "999px", background: "#fff1cf" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(111,201,168,0.26)" />
          <Rim tone="rgba(255,241,207,0.26)" />
        </>
      }
    >
      <V c="g04-ab-bell" l={43} t={38} w={14} h={18} d={110} st={{ transformOrigin: "50% 4%" }}>{bell}</V>
      <L c="g04-creep" l={38} t={35} w={24} h={24} d={280} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(111,201,168,0.72), transparent 64%)" }} />
      <L c="g04-ab-toll" l={40} t={37} w={20} h={20} d={470} st={{ borderRadius: "50%", border: "2px solid #fff1cf" }} />
      {[0, 1, 2].map((i) => (
        <V key={i} c="g04-ab-flake" l={42 + i * 7} t={53} w={3.4} h={3.4} d={580 + i * 100}>
          <path d="M4 5l16 2-3 12-13-4z" fill="#6fc9a8" />
        </V>
      ))}
      <Sift col="#fff1cf" l={43} t={55} d={720} n={3} step={5} />
    </Lead>
  );
}

/* --- 3. Bartered Calm (t2) — THE SEAL SOFTENS -------------------------------
   A blob of oxblood wax slumps warm on the fold, the matrix comes down and
   presses it flat, and the ribbon is drawn out through the cooling seal.
   Palette: #c8503f / #ffdfae / #2c120e. */
function BarterCalmScene({ role, delayMs }: SceneProps) {
  const matrix = (
    <g {...SJ}>
      <path d="M9 2h6v9H9z" fill="#2c120e" stroke="#ffdfae" strokeWidth="1.1" />
      <path d="M6 11h12v4H6z" fill="#ffdfae" stroke="#2c120e" strokeWidth="1.1" />
    </g>
  );
  const seal = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="8.6" fill="#c8503f" stroke="#2c120e" strokeWidth="1.1" />
      <circle cx="12" cy="12" r="4.6" fill="none" stroke="#ffdfae" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-bc-blob" l={26} t={40} w={48} h={48} d={40}>{seal}</V>
        <V c="g04-bc-press" l={30} t={4} w={40} h={62} d={260}>{matrix}</V>
        <L c="g04-ent-mote" l={16} t={58} w={40} h={3} d={470} st={{ borderRadius: "999px", background: "#ffdfae" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hit" l={26} t={30} w={48} h={48} d={0}>{seal}</V>
        <V c="g04-hitside" l={30} t={4} w={40} h={50} d={140}>{matrix}</V>
        <L c="g04-hit2" l={20} t={54} w={60} h={3} d={260} st={{ borderRadius: "999px", background: "#ffdfae" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(200,80,63,0.26)" />}>
      <L c="g04-slump" l={42} t={45} w={16} h={9} d={100} st={{ borderRadius: "999px", background: "#c8503f" }} />
      <V c="g04-bc-press" l={44} t={30} w={12} h={18} d={280}>{matrix}</V>
      <V c="g04-bc-blob" l={43.5} t={43} w={13} h={13} d={430}>{seal}</V>
      <L c="g04-bc-thread" l={40} t={51} w={22} h={1.6} d={600} st={{ borderRadius: "999px", background: "#ffdfae", transformOrigin: "0% 50%" }} />
      <L c="g04-bc-cool" l={42} t={42} w={16} h={16} d={680} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,223,174,0.65), transparent 68%)" }} />
      <Sift col="#c8503f" l={44} t={50} d={720} n={3} step={5} />
    </Lead>
  );
}

/* --- 4. Cold Compress (t2) — THE ICE HOUSE ----------------------------------
   A block of winter ice is lowered into the pit, straw is forked over it, and
   the one drip that escapes falls into the dark. Palette: #a9d8e6 / #fff3d4 /
   #1c2c34. */
function ColdCompressScene({ role, delayMs }: SceneProps) {
  const block = (
    <g {...SJ}>
      <path d="M4 6h16v13H4z" fill="#a9d8e6" stroke="#1c2c34" strokeWidth="1.2" />
      <path d="M4 6l4-3h16l-4 3M20 6v13l-4 3" fill="none" stroke="#1c2c34" strokeWidth="1" />
    </g>
  );
  const straw = (
    <g fill="none" stroke="#fff3d4" strokeWidth="1.2" {...SJ}>
      <path d="M2 14L16 8M5 18L21 11M3 9l12-5" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-drop" l={22} t={20} w={56} h={52} d={40}>{block}</V>
        <V c="g04-cc-straw" l={8} t={54} w={84} h={38} d={280}>{straw}</V>
        <L c="g04-cc-drip" l={48} t={72} w={3} h={16} d={480} st={{ borderRadius: "999px", background: "#a9d8e6", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={20} t={22} w={60} h={52} d={0}>{block}</V>
        <V c="g04-hit" l={10} t={52} w={80} h={36} d={150}>{straw}</V>
        <L c="g04-hit2" l={48} t={74} w={4} h={12} d={260} st={{ borderRadius: "999px", background: "#a9d8e6" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(169,216,230,0.24)" />
          <Rim tone="rgba(28,44,52,0.5)" />
        </>
      }
    >
      <L c="g04-cc-pit" l={40} t={44} w={20} h={12} d={90} st={{ background: "rgba(28,44,52,0.72)" }} />
      <V c="g04-slump" l={43} t={38} w={14} h={16} d={260}>{block}</V>
      <V c="g04-cc-straw" l={38} t={44} w={24} h={14} d={430}>{straw}</V>
      <L c="g04-cc-drip" l={47} t={55} w={1.4} h={6} d={620} st={{ borderRadius: "999px", background: "#a9d8e6", transformOrigin: "50% 0%" }} />
      <L c="g04-cc-chill" l={41} t={41} w={18} h={18} d={680} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,212,0.6), transparent 70%)" }} />
      <Sift col="#fff3d4" l={42} t={50} d={700} n={3} />
    </Lead>
  );
}

/* --- 5. Dowager's Patience (t2) — THE VARNISH CRAZES ------------------------
   Her portrait goes amber under old varnish, a net of craze lines opens across
   the face, and a cotton swab wipes one clean lane back through it. Palette:
   #d9a84f / #fff0c9 / #33230f. */
const DP_CRAZE = "M2 8h20M2 15h20M7 2v20M15 2v20M2 2l20 20M22 2L2 22";

function DowagersPatienceScene({ role, delayMs }: SceneProps) {
  const portrait = (
    <g {...SJ}>
      <rect x="2" y="2" width="20" height="20" rx="1" fill="#33230f" stroke="#d9a84f" strokeWidth="1.4" />
      <circle cx="12" cy="9.6" r="3.4" fill="#fff0c9" />
      <path d="M6.6 20c0-3.6 2.4-5.6 5.4-5.6s5.4 2 5.4 5.6z" fill="#fff0c9" />
    </g>
  );
  const craze = <path d={DP_CRAZE} fill="none" stroke="#33230f" strokeWidth="0.7" strokeDasharray="2.2 1.6" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-rise" l={18} t={14} w={64} h={70} d={40}>{portrait}</V>
        <V c="g04-dp-craze" l={20} t={16} w={60} h={66} d={280}>{craze}</V>
        <L c="g04-dp-swab" l={10} t={40} w={80} h={9} d={470} st={{ background: "linear-gradient(90deg, transparent, #fff0c9, transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={18} t={14} w={64} h={70} d={0}>{portrait}</V>
        <V c="g04-hit" l={20} t={16} w={60} h={66} d={150}>{craze}</V>
        <L c="g04-hit2" l={12} t={44} w={76} h={7} d={260} st={{ background: "linear-gradient(90deg, transparent, #fff0c9, transparent)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(217,168,79,0.3)" />}>
      <V c="g04-dp-portrait" l={42} t={38} w={16} h={20} d={100}>{portrait}</V>
      <L c="g04-creep" l={41} t={37} w={18} h={22} d={280} st={{ background: "linear-gradient(180deg, rgba(217,168,79,0.68), rgba(217,168,79,0.2))" }} />
      <V c="g04-dp-craze" l={42} t={38} w={16} h={20} d={450}>{craze}</V>
      <L c="g04-dp-swab" l={39} t={45} w={22} h={3.4} d={620} st={{ background: "linear-gradient(90deg, transparent, #fff0c9, transparent)" }} />
      <L c="g04-dp-lane" l={42} t={45} w={16} h={2} d={700} st={{ background: "#fff0c9" }} />
      <Sift col="#d9a84f" l={43} t={56} d={740} n={3} />
    </Lead>
  );
}

/* --- 6. Ear to the Ground (t2) — THE TROWEL CUT -----------------------------
   Soil strata are cut back layer by layer along the run, a buried sherd stands
   proud of the section, and the spoil sifts off the blade. Aim-staged.
   Palette: #a9793f / #f6dfae / #2b1c10. */
const EG_BANDS = [0, 1, 2];

function EarToTheGroundScene({ role, delayMs }: SceneProps) {
  const trowel = (
    <g {...SJ}>
      <path d="M3 12l9-5 3 5-3 5z" fill="#f6dfae" stroke="#2b1c10" strokeWidth="1.1" />
      <path d="M15 12h6" stroke="#2b1c10" strokeWidth="2" />
    </g>
  );
  const sherd = <path d="M5 18c0-6 3-10 7-10 2.4 0 4 1.4 4 3.4 0 3-2.6 3-2.6 6.6z" fill="#f6dfae" stroke="#2b1c10" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        {EG_BANDS.map((i) => (
          <L key={i} c="g04-eg-band" l={6} t={34 + i * 16} w={88} h={12} d={40 + i * 130} st={{ background: i % 2 ? "#a9793f" : "#2b1c10", transformOrigin: "0% 50%" }} />
        ))}
        <V c="g04-eg-trowel" l={4} t={30} w={44} h={40} d={300}>{trowel}</V>
        <V c="g04-ent-bloom" l={56} t={44} w={30} h={34} d={490}>{sherd}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g04-hitside" l={8} t={40} w={84} h={26} d={0} st={{ background: "#a9793f" }} />
        <V c="g04-hit" l={10} t={26} w={44} h={40} d={150}>{trowel}</V>
        <V c="g04-hit2" l={56} t={40} w={30} h={40} d={270}>{sherd}</V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(169,121,63,0.26)" />}>
      {EG_BANDS.map((i) => (
        <L key={i} c="g04-eg-band" l={44} t={45 + i * 4} w={24} h={3.2} d={90 + i * 120} st={{ background: i % 2 ? "#a9793f" : "#2b1c10", transformOrigin: "0% 50%" }} />
      ))}
      <L c="g04-runout" l={44} t={44.4} w={26} h={1.6} d={300} st={{ borderRadius: "999px", background: "#f6dfae", transformOrigin: "0% 50%" }} />
      <V c="g04-eg-trowel" l={44} t={41} w={12} h={12} d={430}>{trowel}</V>
      <V c="g04-eg-sherd" l={57} t={45} w={7} h={9} d={620}>{sherd}</V>
      <Sift col="#f6dfae" l={48} t={50} d={700} n={3} step={5} />
    </AimLead>
  );
}

/* --- 7. Hourglass Flip (t2) — THE PRESERVING JAR ----------------------------
   Thirty seconds is put up in brine: the fruit goes down, the rubber ring
   compresses under the lid, the last bubble rises and the jar seals with a
   dull click. Palette: #9fc659 / #fff2cd / #23300f. */
function HourglassFlipScene({ role, delayMs }: SceneProps) {
  const jar = (
    <g {...SJ}>
      <path d="M6 6h12v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" fill="rgba(159,198,89,0.34)" stroke="#9fc659" strokeWidth="1.3" />
      <path d="M6 6c0-1.8 1-2.6 6-2.6s6 .8 6 2.6" fill="none" stroke="#9fc659" strokeWidth="1.2" />
    </g>
  );
  const lid = (
    <g {...SJ}>
      <path d="M4 4h16v4H4z" fill="#fff2cd" stroke="#23300f" strokeWidth="1.2" />
      <path d="M6 8h12v2.4H6z" fill="#9fc659" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-rise" l={24} t={26} w={52} h={64} d={40}>{jar}</V>
        <V c="g04-hf-lid" l={22} t={4} w={56} h={30} d={280}>{lid}</V>
        <L c="g04-hf-bubble" l={44} t={54} w={9} h={9} d={480} st={{ borderRadius: "50%", background: "#fff2cd" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={24} t={22} w={52} h={66} d={0}>{jar}</V>
        <V c="g04-hit" l={22} t={8} w={56} h={26} d={150}>{lid}</V>
        <L c="g04-hit2" l={46} t={50} w={8} h={8} d={270} st={{ borderRadius: "50%", background: "#fff2cd" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(159,198,89,0.24)" />
          <Rim tone="rgba(255,242,205,0.26)" />
        </>
      }
    >
      <V c="g04-hf-jar" l={44} t={40} w={12} h={18} d={90}>{jar}</V>
      <L c="g04-hf-brine" l={45} t={47} w={10} h={9} d={260} st={{ background: "rgba(159,198,89,0.55)", transformOrigin: "50% 100%" }} />
      <V c="g04-layin" l={43.4} t={36} w={13} h={7} d={420}>{lid}</V>
      <L c="g04-hf-ring" l={44.6} t={40.6} w={10.8} h={1.8} d={560} st={{ borderRadius: "999px", background: "#23300f" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g04-hf-bubble" l={46 + i * 3} t={50} w={1.5} h={1.5} d={620 + i * 110} st={{ borderRadius: "50%", background: "#fff2cd" }} />
      ))}
      <L c="g04-hf-seal" l={43} t={38} w={14} h={5} d={760} st={{ borderRadius: "999px", background: "radial-gradient(circle, rgba(255,242,205,0.75), transparent 70%)" }} />
    </Lead>
  );
}

/* --- 8. Knight's Vigil (t2) — MAIL IN THE SAND BARREL -----------------------
   The rusted hauberk goes into a barrel of sand and vinegar, the barrel rocks
   three times, and the rust comes off it as a cloud of orange grit while the
   links come up bright. Palette: #9aa7b4 / #ffeccb / #241a12. */
function KnightsVigilScene({ role, delayMs }: SceneProps) {
  const barrel = (
    <g {...SJ}>
      <path d="M6 4h12c1.4 4 1.4 12 0 16H6c-1.4-4-1.4-12 0-16z" fill="#241a12" stroke="#ffeccb" strokeWidth="1.2" />
      <path d="M5.2 9h13.6M5.2 15h13.6" stroke="#ffeccb" strokeWidth="1" />
    </g>
  );
  const mail = (
    <g {...SJ}>
      <path d="M7 5h10v13l-5 3-5-3z" fill="#9aa7b4" stroke="#241a12" strokeWidth="1.1" />
      <path d="M9 8h1.6M13.4 8H15M9 11.4h1.6M13.4 11.4H15M11 9.6h2M11 13h2" stroke="#241a12" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-rise" l={20} t={22} w={60} h={64} d={40}>{barrel}</V>
        <V c="g04-kv-mail" l={30} t={12} w={40} h={52} d={280}>{mail}</V>
        <L c="g04-ent-mote" l={54} t={54} w={10} h={10} d={470} st={{ borderRadius: "50%", background: "#ffeccb" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={22} t={20} w={56} h={64} d={0}>{barrel}</V>
        <V c="g04-hit" l={32} t={26} w={36} h={48} d={150}>{mail}</V>
        <L c="g04-hit2" l={42} t={76} w={16} h={4} d={270} st={{ borderRadius: "999px", background: "#9aa7b4" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(154,167,180,0.24)" />}>
      <V c="g04-kv-barrel" l={43} t={40} w={14} h={18} d={100} st={{ transformOrigin: "50% 92%" }}>{barrel}</V>
      <L c="g04-creep" l={41} t={39} w={18} h={18} d={270} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(201,118,47,0.55), transparent 66%)" }} />
      <V c="g04-kv-mail" l={45} t={41} w={10} h={14} d={430}>{mail}</V>
      <L c="g04-kv-shine" l={43} t={44} w={14} h={2.4} d={620} st={{ background: "linear-gradient(90deg, transparent, #ffeccb, transparent)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g04-kv-grit" l={44 + i * 5} t={48} w={1.6} h={1.6} d={660 + i * 90} st={{ borderRadius: "50%", background: "#ffeccb" }} />
      ))}
      <Sift col="#9aa7b4" l={42} t={55} d={740} n={3} step={7} />
    </Lead>
  );
}

/* --- 9. Measured Breath (t2) — THE PALIMPSEST -------------------------------
   Pumice is worked across old vellum, the previous hand ghosts away under it,
   and one fresh ruling line is drawn on the cleared skin. Palette: #d8c39a /
   #fff4d6 / #322818. */
function MeasuredBreathScene({ role, delayMs }: SceneProps) {
  const leaf = (
    <g {...SJ}>
      <path d="M4 2.6h16v18.8H4z" fill="#d8c39a" stroke="#322818" strokeWidth="1.2" />
      <path d="M4 2.6c2 1.4 2 17.4 0 18.8" fill="none" stroke="#322818" strokeWidth="0.9" />
    </g>
  );
  const oldHand = <path d="M6.6 7h11M6.6 10h9M6.6 13h11M6.6 16h7" stroke="#322818" strokeWidth="1.1" fill="none" {...SJ} />;
  const pumice = <path d="M4 13c0-4 3-7 7.4-7 4 0 6.6 2.4 6.6 5.6 0 4-3 6.4-7 6.4S4 16 4 13z" fill="#fff4d6" stroke="#322818" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-rise" l={16} t={12} w={68} h={74} d={40}>{leaf}</V>
        <V c="g04-mb-ghost" l={20} t={18} w={60} h={60} d={260}>{oldHand}</V>
        <V c="g04-mb-pumice" l={10} t={40} w={40} h={36} d={470}>{pumice}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={16} t={12} w={68} h={74} d={0}>{leaf}</V>
        <V c="g04-hit" l={12} t={38} w={38} h={34} d={150}>{pumice}</V>
        <L c="g04-hit2" l={22} t={62} w={56} h={2.6} d={270} st={{ borderRadius: "999px", background: "#322818" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(216,195,154,0.26)" />}>
      <V c="g04-mb-leaf" l={42} t={38} w={16} h={20} d={90}>{leaf}</V>
      <V c="g04-mb-ghost" l={43} t={40} w={14} h={16} d={260}>{oldHand}</V>
      <V c="g04-mb-pumice" l={40} t={42} w={9} h={8} d={420}>{pumice}</V>
      <L c="g04-creep" l={42} t={40} w={16} h={16} d={560} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.72), transparent)" }} />
      <L c="g04-mb-rule" l={43} t={50} w={14} h={1.4} d={680} st={{ borderRadius: "999px", background: "#322818", transformOrigin: "0% 50%" }} />
      <Sift col="#fff4d6" l={43} t={54} d={720} n={3} />
    </Lead>
  );
}

/* --- 10. Pawn's Lullaby (t2) — WAX ON THE CRADLE RAIL -----------------------
   A block of beeswax is rubbed along a rail worn pale by small hands, the grain
   drinks it and darkens, a cloth buffs it up, and the cradle rocks itself back
   to still. Palette: #e0b45c / #fff2cd / #33240e. */
function PawnsLullabyScene({ role, delayMs }: SceneProps) {
  const cradle = (
    <g {...SJ}>
      <path d="M3 7h18v8c0 3-3 5-9 5s-9-2-9-5z" fill="#33240e" stroke="#e0b45c" strokeWidth="1.2" />
      <path d="M3 10.4h18" stroke="#e0b45c" strokeWidth="1" />
    </g>
  );
  const wax = <path d="M5 8h14v9H5z" fill="#e0b45c" stroke="#33240e" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-pl-rock" l={12} t={30} w={76} h={54} d={40} st={{ transformOrigin: "50% 100%" }}>{cradle}</V>
        <V c="g04-pl-wax" l={10} t={22} w={34} h={30} d={270}>{wax}</V>
        <L c="g04-ent-mote" l={26} t={40} w={48} h={5} d={470} st={{ borderRadius: "999px", background: "#fff2cd" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={12} t={30} w={76} h={54} d={0} st={{ transformOrigin: "50% 100%" }}>{cradle}</V>
        <V c="g04-hit" l={14} t={20} w={32} h={28} d={150}>{wax}</V>
        <L c="g04-hit2" l={16} t={44} w={68} h={4} d={270} st={{ borderRadius: "999px", background: "#fff2cd" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(224,180,92,0.26)" />}>
      <V c="g04-pl-rock" l={40} t={42} w={20} h={14} d={100} st={{ transformOrigin: "50% 100%" }}>{cradle}</V>
      <V c="g04-pl-wax" l={39} t={39} w={7} h={6} d={290}>{wax}</V>
      <L c="g04-slump" l={41} t={45} w={18} h={3} d={450} st={{ borderRadius: "999px", background: "#e0b45c" }} />
      <L c="g04-pl-sheen" l={40} t={44} w={20} h={2.2} d={600} st={{ background: "linear-gradient(90deg, transparent, #fff2cd, transparent)" }} />
      <L c="g04-pl-hush" l={42} t={40} w={16} h={16} d={700} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,205,0.6), transparent 70%)" }} />
      <Sift col="#e0b45c" l={43} t={52} d={740} n={3} />
    </Lead>
  );
}

/* --- 11. Saint's Day (t2) — THE WINDOW IS RELEADED --------------------------
   The saint's panel has bellied out: the old cames sag, the glass is pitted
   frosty, a fresh lead strip is laid into the joint and the light comes back
   through. Palette: #7aa8e0 / #ffe9b8 / #1a2136. */
const SD_PANES: Array<[number, number]> = [[41, 38], [50, 38], [41, 47], [50, 47]];

function SaintsDayScene({ role, delayMs }: SceneProps) {
  const panel = (
    <g {...SJ}>
      <path d="M4 21V9a8 8 0 0 1 16 0v12z" fill="rgba(122,168,224,0.45)" stroke="#1a2136" strokeWidth="1.4" />
      <path d="M12 2v19M4 12h16" stroke="#1a2136" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-rise" l={18} t={12} w={64} h={72} d={40}>{panel}</V>
        <V c="g04-sd-came" l={20} t={44} w={60} h={10} d={280} st={{ transformOrigin: "50% 0%" }}>
          <path d="M0 4h24v3H0z" fill="#1a2136" />
        </V>
        <L c="g04-sd-light" l={30} t={20} w={40} h={60} d={480} st={{ background: "linear-gradient(180deg, rgba(255,233,184,0.7), transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={18} t={12} w={64} h={72} d={0}>{panel}</V>
        <L c="g04-hit" l={22} t={44} w={56} h={4} d={150} st={{ borderRadius: "999px", background: "#1a2136" }} />
        <L c="g04-hit2" l={32} t={24} w={36} h={52} d={270} st={{ background: "linear-gradient(180deg, rgba(255,233,184,0.66), transparent)" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(122,168,224,0.26)" />
          <Rim tone="rgba(26,33,54,0.44)" />
        </>
      }
    >
      <V c="g04-sd-glass" l={42} t={36} w={16} h={22} d={90}>{panel}</V>
      {SD_PANES.map(([l, t], i) => (
        <L key={i} c="g04-creep" l={l} t={t} w={7} h={8} d={230 + i * 80} st={{ background: "rgba(255,233,184,0.34)" }} />
      ))}
      <V c="g04-sd-came" l={42} t={46} w={16} h={3} d={470} st={{ transformOrigin: "50% 0%" }}>
        <path d="M0 4h24v3H0z" fill="#1a2136" />
      </V>
      <L c="g04-sd-pit" l={44} t={40} w={12} h={12} d={600} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(122,168,224,0.7), transparent 68%)" }} />
      <L c="g04-sd-light" l={44} t={34} w={12} h={26} d={700} st={{ background: "linear-gradient(180deg, rgba(255,233,184,0.68), transparent)", transformOrigin: "50% 0%" }} />
      <L c="g04-glint" l={49} t={43} w={2.2} h={2.2} d={760} st={{ borderRadius: "50%", background: "#ffe9b8" }} />
    </Lead>
  );
}

/* --- 12. Sleepy Dust (t2) — AMBER CLOSES OVER IT ----------------------------
   A resin bead runs down the bark, catches a dozing insect mid-step, swells
   over it and hardens with one bubble caught inside. Palette: #f0a93c /
   #ffeab8 / #2e1a06. */
function SleepyDustScene({ role, delayMs }: SceneProps) {
  const bug = (
    <g {...SJ}>
      <ellipse cx="12" cy="13" rx="4.4" ry="6" fill="#2e1a06" stroke="#ffeab8" strokeWidth="0.9" />
      <path d="M7.6 9L3 5M16.4 9L21 5M7.6 13H3M16.4 13H21M8.4 17.6L5 21M15.6 17.6L19 21" stroke="#2e1a06" strokeWidth="1.1" />
      <path d="M12 7.4V19" stroke="#ffeab8" strokeWidth="0.8" />
    </g>
  );
  const bead = <path d="M12 2.6c4.2 5 6.4 8.4 6.4 11.4A6.4 6.4 0 0 1 5.6 14c0-3 2.2-6.4 6.4-11.4z" fill="rgba(240,169,60,0.72)" stroke="#f0a93c" strokeWidth="1.2" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-rise" l={26} t={40} w={48} h={48} d={40}>{bug}</V>
        <V c="g04-sl-resin" l={22} t={4} w={56} h={62} d={280} st={{ transformOrigin: "50% 0%" }}>{bead}</V>
        <L c="g04-sl-bubble" l={46} t={48} w={9} h={9} d={480} st={{ borderRadius: "50%", background: "#ffeab8" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={26} t={38} w={48} h={48} d={0}>{bug}</V>
        <V c="g04-hit" l={20} t={12} w={60} h={64} d={150} st={{ transformOrigin: "50% 0%" }}>{bead}</V>
        <L c="g04-hit2" l={46} t={44} w={8} h={8} d={270} st={{ borderRadius: "50%", background: "#ffeab8" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(240,169,60,0.28)" />}>
      <L c="g04-sl-bark" l={45} t={30} w={4} h={26} d={80} st={{ background: "linear-gradient(180deg, #2e1a06, rgba(46,26,6,0.2))", transformOrigin: "50% 0%" }} />
      <V c="g04-sl-bug" l={45} t={45} w={10} h={10} d={230}>{bug}</V>
      <V c="g04-slump" l={43} t={36} w={14} h={18} d={400} st={{ transformOrigin: "50% 0%" }}>{bead}</V>
      <L c="g04-sl-set" l={43} t={40} w={14} h={14} d={600} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,234,184,0.62), transparent 70%)" }} />
      <L c="g04-sl-bubble" l={48} t={46} w={2.4} h={2.4} d={700} st={{ borderRadius: "50%", background: "#ffeab8" }} />
      <L c="g04-glint" l={51} t={41} w={2.2} h={2.2} d={760} st={{ borderRadius: "50%", background: "#ffeab8" }} />
    </Lead>
  );
}

/* --- 13. Slipped Collar (t2) — THE ROPE GIVES -------------------------------
   A hemp rope under load frays strand by strand along the run, the last strand
   parts with a snap, and the loop it held opens and drops away. Aim-staged.
   Palette: #c8a874 / #fff0c8 / #2a2013. */
const SC_FRAY = [0, 1, 2, 3];

function SlippedCollarScene({ role, delayMs }: SceneProps) {
  const loop = <circle cx="12" cy="12" r="8.4" fill="none" stroke="#c8a874" strokeWidth="2.6" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g04-sc-rope" l={4} t={46} w={92} h={7} d={40} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #2a2013, #c8a874, #2a2013)", transformOrigin: "0% 50%" }} />
        {SC_FRAY.slice(0, 3).map((i) => (
          <L key={i} c="g04-sc-fray" l={40 + i * 8} t={44} w={16} h={2} d={280 + i * 110} st={{ borderRadius: "999px", background: "#fff0c8", transformOrigin: "0% 50%" }} />
        ))}
        <V c="g04-ent-bloom" l={58} t={30} w={34} h={40} d={490}>{loop}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g04-hitside" l={6} t={46} w={88} h={6} d={0} st={{ borderRadius: "999px", background: "#c8a874" }} />
        <L c="g04-hit" l={34} t={38} w={30} h={3} d={150} st={{ borderRadius: "999px", background: "#fff0c8" }} />
        <V c="g04-hit2" l={54} t={32} w={34} h={40} d={270}>{loop}</V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(200,168,116,0.24)" />}>
      <L c="g04-sc-rope" l={44} t={47.4} w={26} h={2.6} d={90} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #2a2013, #c8a874, #2a2013)", transformOrigin: "0% 50%" }} />
      <L c="g04-runout" l={44} t={49.6} w={26} h={1.2} d={240} st={{ borderRadius: "999px", background: "#fff0c8", transformOrigin: "0% 50%" }} />
      {SC_FRAY.map((i) => (
        <L key={i} c="g04-sc-fray" l={48 + i * 4} t={46.4} w={6} h={0.9} d={380 + i * 90} st={{ borderRadius: "999px", background: "#fff0c8", transformOrigin: "0% 50%" }} />
      ))}
      <L c="g04-sc-part" l={57} t={45} w={4} h={7} d={620} st={{ background: "linear-gradient(180deg, transparent, #fff0c8, transparent)" }} />
      <V c="g04-sc-loop" l={58} t={44} w={9} h={9} d={700}>{loop}</V>
      <Sift col="#c8a874" l={52} t={50} d={740} n={3} step={5} />
    </AimLead>
  );
}

/* --- 14. Spring in the Step (t2) — THE BOOT IS GREASED ----------------------
   Dubbin is worked into a boot cracked white across the vamp, the leather
   drinks it and closes, and the boot takes one square forward. Aim-staged.
   Palette: #a05f34 / #ffe4b6 / #2a1409. */
function SpringInTheStepScene({ role, delayMs }: SceneProps) {
  const boot = (
    <g {...SJ}>
      <path d="M6 3h5v9c0 2 1.4 3 4 3.6l4 1c1.4.4 2 1.2 2 2.4v2H6z" fill="#a05f34" stroke="#2a1409" strokeWidth="1.2" />
      <path d="M6 18h15" stroke="#2a1409" strokeWidth="1.2" />
    </g>
  );
  const crack = <path d="M7 6l2 3-1.6 2.6M10 5.6l1.6 3.4-1 2.4" fill="none" stroke="#ffe4b6" strokeWidth="1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-rise" l={16} t={22} w={68} h={62} d={40}>{boot}</V>
        <V c="g04-ss-crack" l={18} t={26} w={64} h={54} d={280}>{crack}</V>
        <L c="g04-ss-grease" l={20} t={40} w={60} h={9} d={480} st={{ background: "linear-gradient(90deg, transparent, #ffe4b6, transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={16} t={22} w={68} h={62} d={0}>{boot}</V>
        <V c="g04-hit" l={18} t={26} w={64} h={54} d={150}>{crack}</V>
        <L c="g04-hit2" l={14} t={80} w={72} h={4} d={270} st={{ borderRadius: "999px", background: "#2a1409" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(160,95,52,0.26)" />}>
      <V c="g04-ss-boot" l={43} t={41} w={13} h={15} d={100}>{boot}</V>
      <V c="g04-ss-crack" l={43} t={41} w={13} h={15} d={250}>{crack}</V>
      <L c="g04-ss-grease" l={42} t={45} w={16} h={3} d={420} st={{ background: "linear-gradient(90deg, transparent, #ffe4b6, transparent)" }} />
      <L c="g04-runout" l={44} t={54} w={22} h={1.6} d={560} st={{ borderRadius: "999px", background: "#a05f34", transformOrigin: "0% 50%" }} />
      <V c="g04-ss-step" l={50} t={41} w={13} h={15} d={660}>{boot}</V>
      <Sift col="#ffe4b6" l={48} t={54} d={720} n={3} step={5} />
    </AimLead>
  );
}

/* --- 15. Steady Hands (t2) — THE EDGE COMES OFF -----------------------------
   The blade is drawn down an oiled stone the full length of the run, the wire
   burr peels away in swarf, and what comes up is a safe, dull, honest edge.
   Aim-staged. Palette: #8e9a86 / #fff1cd / #22271e. */
function SteadyHandsScene({ role, delayMs }: SceneProps) {
  const stone = (
    <g {...SJ}>
      <path d="M2 9h20v7H2z" fill="#8e9a86" stroke="#22271e" strokeWidth="1.2" />
      <path d="M2 9l2-2.4h20L22 9" fill="#22271e" />
    </g>
  );
  const blade = (
    <g {...SJ}>
      <path d="M3 12l14-4v8z" fill="#fff1cd" stroke="#22271e" strokeWidth="1.1" />
      <path d="M17 9.4h4v5.2h-4z" fill="#22271e" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-rise" l={8} t={50} w={84} h={36} d={40}>{stone}</V>
        <V c="g04-sh-blade" l={6} t={22} w={70} h={34} d={280}>{blade}</V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g04-sh-swarf" l={40 + i * 14} t={44} w={5} h={2} d={470 + i * 110} st={{ borderRadius: "999px", background: "#fff1cd" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={8} t={50} w={84} h={34} d={0}>{stone}</V>
        <V c="g04-hit" l={10} t={22} w={66} h={32} d={150}>{blade}</V>
        <L c="g04-hit2" l={20} t={46} w={60} h={2.4} d={270} st={{ borderRadius: "999px", background: "#fff1cd" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(142,154,134,0.24)" />}>
      <V c="g04-sh-stone" l={43} t={48} w={24} h={7} d={90}>{stone}</V>
      <L c="g04-sh-oil" l={44} t={49} w={22} h={2.4} d={230} st={{ background: "linear-gradient(90deg, rgba(255,241,205,0.7), transparent)" }} />
      <V c="g04-sh-blade" l={43} t={42} w={18} h={8} d={380}>{blade}</V>
      <L c="g04-runout" l={44} t={51.6} w={24} h={1.2} d={540} st={{ borderRadius: "999px", background: "#fff1cd", transformOrigin: "0% 50%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g04-sh-swarf" l={48 + i * 5} t={47} w={2} h={0.9} d={620 + i * 100} st={{ borderRadius: "999px", background: "#fff1cd" }} />
      ))}
      <L c="g04-glint" l={56} t={45} w={2.4} h={2.4} d={740} st={{ borderRadius: "50%", background: "#fff1cd" }} />
    </AimLead>
  );
}

/* --- 16. Trophy Rest (t2) — THE WREATH DRIES --------------------------------
   The victory laurel is taken down still green, its leaves curl and go brittle
   brown, two boards close on it, and one dried leaf snaps off on the way in.
   Palette: #93a552 / #ffeec4 / #2c2a12. */
const TR_LEAVES = [-38, -12, 14, 40];

function TrophyRestScene({ role, delayMs }: SceneProps) {
  const leaf = <path d="M12 2c5 4 6.6 9 4.4 14C13 20.6 9 18.6 8 13.4 7.2 9.2 8.6 5.2 12 2z" fill="#93a552" stroke="#2c2a12" strokeWidth="1.1" {...SJ} />;
  const board = <path d="M2 8h20v8H2z" fill="#2c2a12" stroke="#ffeec4" strokeWidth="1.2" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-rise" l={26} t={22} w={48} h={52} d={40}>{leaf}</V>
        <V c="g04-tr-curl" l={12} t={34} w={40} h={44} d={270}>{leaf}</V>
        <V c="g04-tr-press" l={8} t={62} w={84} h={30} d={470}>{board}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={24} t={20} w={52} h={54} d={0}>{leaf}</V>
        <V c="g04-hit" l={16} t={54} w={68} h={30} d={150}>{board}</V>
        <L c="g04-hit2" l={44} t={80} w={12} h={4} d={270} st={{ borderRadius: "999px", background: "#93a552" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(147,165,82,0.26)" />}>
      {TR_LEAVES.map((a, i) => (
        <P key={a} l={41} t={39} w={18} h={18} rot={`${a}deg`}>
          <V c="g04-tr-wreath" w={100} h={100} d={90 + i * 90}>{leaf}</V>
        </P>
      ))}
      <L c="g04-creep" l={41} t={39} w={18} h={18} d={340} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(176,138,58,0.6), transparent 66%)" }} />
      <V c="g04-tr-curl" l={44} t={42} w={11} h={12} d={470}>{leaf}</V>
      <V c="g04-slump" l={40} t={46} w={20} h={7} d={600}>{board}</V>
      <V c="g04-tr-snap" l={53} t={45} w={6} h={7} d={700}>{leaf}</V>
      <Sift col="#ffeec4" l={43} t={52} d={740} n={3} />
    </Lead>
  );
}

/* --- 17. Loan Shark (t2) — THE LEDGER FADES ---------------------------------
   Iron-gall entries brown out of the page one line at a time, a fresh tally is
   ruled across the bottom of the column, and a blot spreads under the pen where
   it rested too long. Palette: #7a5a2e / #ffe7bd / #241a10. */
const LS_LINES = [0, 1, 2, 3];

function LoanSharkScene({ role, delayMs }: SceneProps) {
  const page = (
    <g {...SJ}>
      <path d="M3 2.4h18v19.2H3z" fill="#ffe7bd" stroke="#241a10" strokeWidth="1.2" />
      <path d="M16.4 2.4v19.2" stroke="#7a5a2e" strokeWidth="0.9" />
    </g>
  );
  const quill = <path d="M4 21C6 13 11 6.6 20 3c1 8-3.4 14.6-10 17z" fill="#ffe7bd" stroke="#241a10" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-rise" l={16} t={10} w={68} h={76} d={40}>{page}</V>
        {LS_LINES.slice(0, 3).map((i) => (
          <L key={i} c="g04-ls-fade" l={24} t={28 + i * 12} w={44} h={3} d={260 + i * 120} st={{ borderRadius: "999px", background: "#7a5a2e" }} />
        ))}
        <V c="g04-ent-mote" l={54} t={52} w={34} h={38} d={490}>{quill}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={16} t={10} w={68} h={76} d={0}>{page}</V>
        <L c="g04-hit" l={24} t={40} w={48} h={3.4} d={150} st={{ borderRadius: "999px", background: "#7a5a2e" }} />
        <L c="g04-hit2" l={38} t={60} w={16} h={16} d={270} st={{ borderRadius: "50%", background: "#241a10" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(122,90,46,0.26)" />}>
      <V c="g04-ls-ledger" l={42} t={37} w={16} h={22} d={90}>{page}</V>
      {LS_LINES.map((i) => (
        <L key={i} c="g04-ls-fade" l={44} t={41 + i * 4} w={11} h={1.1} d={240 + i * 100} st={{ borderRadius: "999px", background: "#7a5a2e" }} />
      ))}
      <L c="g04-creep" l={43} t={39} w={14} h={18} d={480} st={{ background: "linear-gradient(180deg, rgba(122,90,46,0.55), transparent)" }} />
      <L c="g04-ls-rule" l={44} t={56} w={12} h={1.2} d={620} st={{ borderRadius: "999px", background: "#241a10", transformOrigin: "0% 50%" }} />
      <L c="g04-ls-blot" l={53} t={53} w={5} h={5} d={700} st={{ borderRadius: "50%", background: "#241a10" }} />
      <Sift col="#ffe7bd" l={44} t={58} d={740} n={3} />
    </Lead>
  );
}

/* --- 18. Castle Quiet (t1) — DRY ROT IN THE BEAM ----------------------------
   The hall beam has gone light as balsa: cubical cracking runs along it, the
   powder sifts down through the quiet, and a fresh post is wedged under the
   sag. Palette: #b98a5e / #ffe6bb / #2b1c12. */
const CQ_CRACKS = [0, 1, 2, 3];

function CastleQuietScene({ role, delayMs }: SceneProps) {
  const beam = <path d="M1 8h22v8H1z" fill="#b98a5e" stroke="#2b1c12" strokeWidth="1.2" {...SJ} />;
  const post = (
    <g {...SJ}>
      <path d="M9 4h6v18H9z" fill="#b98a5e" stroke="#2b1c12" strokeWidth="1.2" />
      <path d="M6 2h12v2.6H6z" fill="#ffe6bb" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-rise" l={4} t={30} w={92} h={30} d={40}>{beam}</V>
        {CQ_CRACKS.slice(0, 3).map((i) => (
          <L key={i} c="g04-cq-rot" l={16 + i * 22} t={32} w={3} h={24} d={270 + i * 110} st={{ background: "#2b1c12" }} />
        ))}
        <V c="g04-cq-post" l={38} t={54} w={26} h={40} d={480}>{post}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={6} t={32} w={88} h={28} d={0}>{beam}</V>
        <L c="g04-hit" l={40} t={34} w={4} h={24} d={150} st={{ background: "#2b1c12" }} />
        <L c="g04-hit2" l={30} t={66} w={40} h={4} d={270} st={{ borderRadius: "999px", background: "#ffe6bb" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(185,138,94,0.24)" />
          <Rim tone="rgba(43,28,18,0.44)" />
        </>
      }
    >
      <V c="g04-cq-beam" l={38} t={42} w={26} h={8} d={90}>{beam}</V>
      {CQ_CRACKS.map((i) => (
        <L key={i} c="g04-cq-rot" l={42 + i * 5} t={43} w={1.2} h={6} d={230 + i * 100} st={{ background: "#2b1c12" }} />
      ))}
      <L c="g04-creep" l={40} t={41} w={22} h={10} d={520} st={{ background: "linear-gradient(90deg, rgba(185,138,94,0.6), transparent)" }} />
      <V c="g04-layin" l={47} t={48} w={7} h={11} d={620}>{post}</V>
      <Sift col="#ffe6bb" l={42} t={50} d={700} n={4} step={5} />
    </Lead>
  );
}

/* --- 19. Check Valve (t1) — THE SCALE CRACKS OFF ----------------------------
   Years of hard water have furred the brass valve solid. The handle strains,
   the limescale crust splits off in plates, and one clean drop finally falls.
   Palette: #c9a94e / #f6f2dc / #2a2413. */
function CheckValveScene({ role, delayMs }: SceneProps) {
  const valve = (
    <g {...SJ}>
      <path d="M4 10h16v5H4z" fill="#c9a94e" stroke="#2a2413" strokeWidth="1.2" />
      <path d="M10 4h4v6h-4z" fill="#c9a94e" stroke="#2a2413" strokeWidth="1.1" />
      <path d="M7 2.4h10v2.4H7z" fill="#2a2413" />
      <path d="M9.4 15h5.2v6H9.4z" fill="#c9a94e" stroke="#2a2413" strokeWidth="1.1" />
    </g>
  );
  const plate = <path d="M4 6l14-2 3 11-12 5z" fill="#f6f2dc" stroke="#2a2413" strokeWidth="1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-rise" l={22} t={14} w={56} h={68} d={40}>{valve}</V>
        <L c="g04-cv-scale" l={24} t={30} w={52} h={38} d={270} st={{ background: "radial-gradient(circle, rgba(246,242,220,0.85), transparent 68%)" }} />
        <V c="g04-cv-crack" l={54} t={54} w={30} h={30} d={480}>{plate}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={24} t={14} w={52} h={66} d={0}>{valve}</V>
        <L c="g04-hit" l={26} t={30} w={48} h={36} d={150} st={{ background: "radial-gradient(circle, rgba(246,242,220,0.8), transparent 66%)" }} />
        <L c="g04-hit2" l={47} t={76} w={5} h={12} d={270} st={{ borderRadius: "999px", background: "#f6f2dc" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(201,169,78,0.24)" />}>
      <V c="g04-cv-valve" l={44} t={39} w={12} h={17} d={90}>{valve}</V>
      <L c="g04-creep" l={42} t={41} w={16} h={13} d={250} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(246,242,220,0.8), transparent 66%)" }} />
      <V c="g04-cv-turn" l={45.4} t={36} w={9} h={6} d={420} st={{ transformOrigin: "50% 100%" }}>
        <path d="M2 9h20v6H2z" fill="#2a2413" stroke="#f6f2dc" strokeWidth="1.2" {...SJ} />
      </V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g04-cv-crack" l={41 + i * 7} t={46} w={4} h={4} d={580 + i * 100}>{plate}</V>
      ))}
      <L c="g04-cv-drip" l={49.4} t={55} w={1.4} h={5} d={700} st={{ borderRadius: "999px", background: "#f6f2dc", transformOrigin: "50% 0%" }} />
      <L c="g04-glint" l={52} t={41} w={2.2} h={2.2} d={760} st={{ borderRadius: "50%", background: "#f6f2dc" }} />
    </Lead>
  );
}

/* --- 20. Crowned Calm (t1) — THE CROWN IS RE-GILT ---------------------------
   The old gilding has worn through to red bole on the high points. A leaf of
   gold floats down onto the size, the agate burnisher sweeps it and the crown
   comes up bright again. Palette: #e8c565 / #fff4d6 / #35240c. */
const GD_CROWN = "M4 18h16l1.6-11-5 3.4L12 4 7.4 10.4l-5-3.4z";

function CrownedCalmScene({ role, delayMs }: SceneProps) {
  const crown = <path d={GD_CROWN} fill="#35240c" stroke="#e8c565" strokeWidth="1.3" {...SJ} />;
  const leaf = <path d="M3 4h18v16H3z" fill="#e8c565" stroke="#fff4d6" strokeWidth="0.8" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-rise" l={16} t={30} w={68} h={52} d={40}>{crown}</V>
        <V c="g04-gd-leaf" l={30} t={4} w={40} h={40} d={280}>{leaf}</V>
        <L c="g04-gd-burnish" l={12} t={40} w={76} h={7} d={480} st={{ background: "linear-gradient(90deg, transparent, #fff4d6, transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={16} t={28} w={68} h={54} d={0}>{crown}</V>
        <V c="g04-hit" l={32} t={12} w={36} h={36} d={150}>{leaf}</V>
        <L c="g04-hit2" l={16} t={44} w={68} h={5} d={270} st={{ background: "linear-gradient(90deg, transparent, #fff4d6, transparent)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(232,197,101,0.26)" />}>
      <V c="g04-gd-crown" l={43} t={42} w={14} h={13} d={90}>{crown}</V>
      <L c="g04-creep" l={44} t={43} w={12} h={5} d={240} st={{ background: "linear-gradient(90deg, rgba(200,80,63,0.7), transparent)" }} />
      <V c="g04-gd-leaf" l={45} t={33} w={10} h={10} d={420}>{leaf}</V>
      <L c="g04-gd-burnish" l={41} t={44} w={18} h={2.6} d={600} st={{ background: "linear-gradient(90deg, transparent, #fff4d6, transparent)" }} />
      <L c="g04-gd-bright" l={43} t={41} w={14} h={14} d={700} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.7), transparent 68%)" }} />
      <L c="g04-glint" l={50} t={40} w={2.4} h={2.4} d={760} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 21. First Light (t1) — THE BLEACH LINE ---------------------------------
   Cloth left folded on the sill: the light crosses it and takes the indigo out
   of everything it touches, leaving the fold line dark. Then the fold opens.
   Aim-staged. Palette: #6f86b8 / #ffeecb / #1e2438. */
function FirstLightScene({ role, delayMs }: SceneProps) {
  const cloth = (
    <g {...SJ}>
      <path d="M2 5h20v14H2z" fill="#6f86b8" stroke="#1e2438" strokeWidth="1.2" />
      <path d="M2 8.4c3 1.4 3 8 0 9.4M22 8.4c-3 1.4-3 8 0 9.4" fill="none" stroke="#1e2438" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-rise" l={8} t={26} w={84} h={50} d={40}>{cloth}</V>
        <L c="g04-fl-bleach" l={8} t={28} w={84} h={46} d={280} st={{ background: "linear-gradient(90deg, rgba(255,238,203,0.85), transparent)", transformOrigin: "0% 50%" }} />
        <L c="g04-fl-fold" l={48} t={24} w={3} h={54} d={480} st={{ background: "#1e2438" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={8} t={26} w={84} h={50} d={0}>{cloth}</V>
        <L c="g04-hit" l={10} t={28} w={80} h={46} d={150} st={{ background: "linear-gradient(90deg, rgba(255,238,203,0.8), transparent)", transformOrigin: "0% 50%" }} />
        <L c="g04-hit2" l={48} t={24} w={3} h={54} d={270} st={{ background: "#1e2438" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(111,134,184,0.26)" />}>
      <V c="g04-fl-cloth" l={43} t={43} w={22} h={12} d={90}>{cloth}</V>
      <L c="g04-runout" l={44} t={48.6} w={24} h={1.4} d={240} st={{ borderRadius: "999px", background: "#ffeecb", transformOrigin: "0% 50%" }} />
      <L c="g04-fl-bleach" l={44} t={44} w={22} h={10} d={420} st={{ background: "linear-gradient(90deg, rgba(255,238,203,0.8), transparent)", transformOrigin: "0% 50%" }} />
      <L c="g04-fl-fold" l={52} t={43} w={1.4} h={12} d={580} st={{ background: "#1e2438" }} />
      <V c="g04-fl-open" l={43} t={43} w={22} h={12} d={680} st={{ transformOrigin: "38% 50%" }}>{cloth}</V>
      <L c="g04-glint" l={57} t={45} w={2.4} h={2.4} d={760} st={{ borderRadius: "50%", background: "#ffeecb" }} />
    </AimLead>
  );
}

/* --- 22. Grace Note (t1) — TARNISH WIPED OFF SILVER -------------------------
   A silver tuning fork has gone plum-black in its case. The cloth takes one
   bright lane down the tine, the fork is struck, and it quivers clean.
   Palette: #b9bfd0 / #fff2d8 / #232634. */
function GraceNoteScene({ role, delayMs }: SceneProps) {
  const fork = (
    <g {...SJ}>
      <path d="M8 2v11M16 2v11" stroke="#b9bfd0" strokeWidth="2.4" />
      <path d="M8 13c0 2.4 1.6 3.4 4 3.4s4-1 4-3.4" fill="none" stroke="#b9bfd0" strokeWidth="2.4" />
      <path d="M12 16.4V22" stroke="#b9bfd0" strokeWidth="2.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-rise" l={26} t={12} w={48} h={72} d={40}>{fork}</V>
        <L c="g04-gn-tarnish" l={24} t={14} w={52} h={56} d={270} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(35,38,52,0.85), transparent 68%)" }} />
        <L c="g04-gn-cloth" l={10} t={30} w={80} h={9} d={480} st={{ background: "linear-gradient(90deg, transparent, #fff2d8, transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={26} t={12} w={48} h={72} d={0}>{fork}</V>
        <L c="g04-hit" l={24} t={16} w={52} h={50} d={150} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(35,38,52,0.8), transparent 66%)" }} />
        <L c="g04-hit2" l={12} t={34} w={76} h={6} d={270} st={{ background: "linear-gradient(90deg, transparent, #fff2d8, transparent)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(185,191,208,0.24)" />}>
      <V c="g04-gn-fork" l={45} t={38} w={10} h={20} d={90}>{fork}</V>
      <L c="g04-creep" l={43} t={38} w={14} h={14} d={250} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(35,38,52,0.8), transparent 68%)" }} />
      <L c="g04-gn-cloth" l={41} t={41} w={18} h={2.6} d={430} st={{ background: "linear-gradient(90deg, transparent, #fff2d8, transparent)" }} />
      <L c="g04-gn-lane" l={46} t={38} w={1.6} h={12} d={580} st={{ borderRadius: "999px", background: "#fff2d8" }} />
      <V c="g04-gn-ring" l={45} t={38} w={10} h={20} d={680}>{fork}</V>
      <L c="g04-glint" l={52} t={40} w={2.4} h={2.4} d={760} st={{ borderRadius: "50%", background: "#fff2d8" }} />
    </Lead>
  );
}

/* --- 23. Kind Omen (t1) — SEA GLASS -----------------------------------------
   A broken shard goes into the shingle sharp and comes back frosted, rounded
   and kind, landing in an open palm. Palette: #74c2b4 / #ffefcd / #17332e. */
const KO_SHINGLE = [0, 1, 2, 3, 4];

function KindOmenScene({ role, delayMs }: SceneProps) {
  const shard = <path d="M4 20L9 3l11 6-4 11z" fill="rgba(116,194,180,0.8)" stroke="#17332e" strokeWidth="1.1" {...SJ} />;
  const smooth = <path d="M12 4c5 0 8 3.4 8 8s-3.4 8-8 8-8-3.4-8-8 3-8 8-8z" fill="rgba(116,194,180,0.7)" stroke="#ffefcd" strokeWidth="1.2" {...SJ} />;
  const palm = <path d="M4 12c0-2 2-2.6 3.4-1.4L11 13V4.4c0-2 3-2 3 0V13l3.4-2.6C18.8 9.2 20.8 10 20.8 12c0 5-3.4 9-8.4 9S4 17 4 12z" fill="none" stroke="#ffefcd" strokeWidth="1.2" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-rise" l={28} t={16} w={44} h={48} d={40}>{shard}</V>
        {KO_SHINGLE.slice(0, 4).map((i) => (
          <L key={i} c="g04-ko-tumble" l={16 + i * 18} t={58} w={11} h={9} d={270 + i * 100} st={{ borderRadius: "50%", background: "#17332e" }} />
        ))}
        <V c="g04-ent-bloom" l={30} t={46} w={42} h={44} d={490}>{smooth}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={28} t={14} w={44} h={46} d={0}>{shard}</V>
        <L c="g04-hit" l={20} t={58} w={60} h={12} d={150} st={{ borderRadius: "999px", background: "#17332e" }} />
        <V c="g04-hit2" l={30} t={42} w={40} h={42} d={270}>{smooth}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(116,194,180,0.24)" />}>
      <V c="g04-ko-shard" l={45} t={38} w={10} h={11} d={90}>{shard}</V>
      {KO_SHINGLE.map((i) => (
        <L key={i} c="g04-ko-tumble" l={41 + i * 4} t={50} w={3} h={2.4} d={240 + i * 90} st={{ borderRadius: "50%", background: "#17332e" }} />
      ))}
      <V c="g04-ko-frost" l={45} t={43} w={10} h={10} d={520}>{smooth}</V>
      <V c="g04-layin" l={43} t={46} w={14} h={14} d={640}>{palm}</V>
      <L c="g04-glint" l={51} t={44} w={2.4} h={2.4} d={740} st={{ borderRadius: "50%", background: "#ffefcd" }} />
      <Sift col="#ffefcd" l={43} t={54} d={760} n={3} step={5} />
    </Lead>
  );
}

/* --- 24. Morning Stretch (t1) — THE SOAP WEARS THROUGH ----------------------
   The bar thins under the water until it is a sliver, the lather lifts off it,
   and the sliver is pressed onto a fresh bar so nothing is wasted. Palette:
   #d9dcc0 / #fff5da / #2c3122. */
function MorningStretchScene({ role, delayMs }: SceneProps) {
  const bar = <path d="M3 8c0-2.4 2-3.4 9-3.4S21 5.6 21 8v8c0 2.4-2 3.4-9 3.4S3 18.4 3 16z" fill="#d9dcc0" stroke="#2c3122" strokeWidth="1.2" {...SJ} />;
  const sliver = <path d="M4 11c0-1.4 2-2 8-2s8 .6 8 2-2 2-8 2-8-.6-8-2z" fill="#fff5da" stroke="#2c3122" strokeWidth="1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-rise" l={14} t={30} w={72} h={44} d={40}>{bar}</V>
        <L c="g04-ms-water" l={10} t={20} w={80} h={12} d={270} st={{ background: "linear-gradient(180deg, rgba(255,245,218,0.8), transparent)" }} />
        <V c="g04-ms-sliver" l={22} t={54} w={56} h={26} d={480}>{sliver}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={14} t={30} w={72} h={44} d={0}>{bar}</V>
        <L c="g04-hit" l={26} t={22} w={48} h={20} d={150} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,245,218,0.8), transparent 68%)" }} />
        <V c="g04-hit2" l={24} t={56} w={52} h={24} d={270}>{sliver}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(217,220,192,0.24)" />}>
      <V c="g04-ms-bar" l={42} t={42} w={16} h={10} d={90}>{bar}</V>
      <L c="g04-ms-water" l={43} t={36} w={14} h={7} d={250} st={{ background: "linear-gradient(180deg, rgba(255,245,218,0.75), transparent)", transformOrigin: "50% 0%" }} />
      <L c="g04-slump" l={43} t={46} w={14} h={4} d={420} st={{ borderRadius: "999px", background: "#d9dcc0" }} />
      <L c="g04-ms-lather" l={41} t={40} w={18} h={12} d={580} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,245,218,0.7), transparent 68%)" }} />
      <V c="g04-ms-sliver" l={44} t={48} w={12} h={6} d={680}>{sliver}</V>
      <Sift col="#fff5da" l={43} t={52} d={740} n={3} />
    </Lead>
  );
}

/* --- 25. Promise of Rest (t1) — LICHEN ON THE MILESTONE ---------------------
   The far milestone has gone soft under fifty years of lichen: rosettes open
   across the face, the carved letters round away, and moss cushions the base.
   Aim-staged down the road. Palette: #b7c46a / #fff0c6 / #26301a. */
const PR_ROSETTES: Array<[number, number]> = [[46, 42], [51, 45], [48, 48], [54, 43]];

function PromiseOfRestScene({ role, delayMs }: SceneProps) {
  const stone = (
    <g {...SJ}>
      <path d="M6 22V9a6 6 0 0 1 12 0v13z" fill="#26301a" stroke="#fff0c6" strokeWidth="1.2" />
      <path d="M9 11h6M9 14.4h6M9 17.8h4" stroke="#fff0c6" strokeWidth="1.1" />
    </g>
  );
  const rosette = (
    <g fill="#b7c46a">
      <circle cx="12" cy="12" r="5" />
      <circle cx="6" cy="9" r="2.6" />
      <circle cx="18" cy="14" r="3" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-rise" l={26} t={16} w={48} h={66} d={40}>{stone}</V>
        <V c="g04-pr-lichen" l={22} t={30} w={40} h={40} d={280}>{rosette}</V>
        <L c="g04-pr-moss" l={16} t={72} w={68} h={14} d={480} st={{ borderRadius: "999px", background: "#b7c46a" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={26} t={16} w={48} h={66} d={0}>{stone}</V>
        <V c="g04-hit" l={24} t={32} w={40} h={40} d={150}>{rosette}</V>
        <L c="g04-hit2" l={20} t={74} w={60} h={10} d={270} st={{ borderRadius: "999px", background: "#b7c46a" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(183,196,106,0.24)" />}>
      <L c="g04-runout" l={44} t={52} w={26} h={1.6} d={90} st={{ borderRadius: "999px", background: "#26301a", transformOrigin: "0% 50%" }} />
      <V c="g04-pr-stone" l={45} t={40} w={10} h={14} d={250}>{stone}</V>
      {PR_ROSETTES.map(([l, t], i) => (
        <V key={i} c="g04-pr-lichen" l={l} t={t} w={4} h={4} d={400 + i * 90}>{rosette}</V>
      ))}
      <L c="g04-pr-letters" l={46} t={45} w={8} h={5} d={620} st={{ background: "linear-gradient(180deg, rgba(255,240,198,0.7), transparent)" }} />
      <L c="g04-pr-moss" l={44} t={52} w={12} h={2.4} d={700} st={{ borderRadius: "999px", background: "#b7c46a" }} />
      <Sift col="#fff0c6" l={45} t={50} d={740} n={3} step={5} />
    </AimLead>
  );
}

/* --- 26. The Quiet After (t1) — THE FOSSIL SPLITS OPEN ----------------------
   She is not gone, she is bedded: a queen-shaped impression in shale. The
   hammer taps, the slab parts along her, and the grit falls away from the
   negative. Palette: #7d8a92 / #f4e3bb / #1d2428. */
const QA_QUEEN = "M6.4 6l1.3 3.2L9.4 6.6 12 9.4l2.6-2.8 1.7 2.6L17.6 6l-1 10.4H7.4zM7 17.4h10v2.4H7z";

function QuietAfterScene({ role, delayMs }: SceneProps) {
  const slab = <path d="M2 6h20v12H2z" fill="#7d8a92" stroke="#1d2428" strokeWidth="1.2" {...SJ} />;
  const print = <path d={QA_QUEEN} fill="#1d2428" stroke="#f4e3bb" strokeWidth="0.9" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-rise" l={6} t={30} w={88} h={40} d={40}>{slab}</V>
        <V c="g04-qa-split" l={6} t={26} w={88} h={26} d={280} st={{ transformOrigin: "50% 100%" }}>{slab}</V>
        <V c="g04-ent-bloom" l={34} t={40} w={32} h={44} d={490}>{print}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={8} t={32} w={84} h={38} d={0}>{slab}</V>
        <V c="g04-hit" l={34} t={30} w={32} h={44} d={150}>{print}</V>
        <L c="g04-hit2" l={26} t={72} w={48} h={4} d={270} st={{ borderRadius: "999px", background: "#1d2428" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(125,138,146,0.26)" />
          <Rim tone="rgba(29,36,40,0.44)" />
        </>
      }
    >
      <V c="g04-qa-slab" l={40} t={43} w={22} h={11} d={90}>{slab}</V>
      <L c="g04-qa-tap" l={49} t={36} w={4} h={7} d={250} st={{ background: "#f4e3bb", transformOrigin: "50% 100%" }} />
      <V c="g04-slump" l={40} t={38} w={22} h={8} d={420} st={{ transformOrigin: "50% 100%" }}>{slab}</V>
      <V c="g04-qa-print" l={45} t={43} w={10} h={12} d={580}>{print}</V>
      <L c="g04-qa-dust" l={41} t={49} w={20} h={5} d={680} st={{ background: "linear-gradient(180deg, rgba(244,227,187,0.6), transparent)" }} />
      <Sift col="#7d8a92" l={43} t={52} d={740} n={3} />
    </Lead>
  );
}

/* --- 27. Shared Silence (t1) — BOTH TAPESTRIES GO ---------------------------
   Two hanging banners, one from each side, lose their dyes at the same rate
   until neither can be told from the other, and the bare warp shows through.
   Palette: #c39a86 / #ffeece / #33221c. */
function SharedSilenceScene({ role, delayMs }: SceneProps) {
  const banner = (fill: string) => (
    <g {...SJ}>
      <path d="M5 2h14v16l-7 4-7-4z" fill={fill} stroke="#33221c" strokeWidth="1.2" />
      <path d="M8 6h8M8 9.6h8M8 13.2h5" stroke="#33221c" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-drop" l={8} t={16} w={40} h={64} d={40}>{banner("#c39a86")}</V>
        <V c="g04-ent-drop" l={52} t={20} w={40} h={64} d={240}>{banner("#ffeece")}</V>
        <L c="g04-tp-fade" l={6} t={18} w={88} h={62} d={470} st={{ background: "linear-gradient(180deg, rgba(255,238,206,0.7), transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={12} t={16} w={40} h={64} d={0}>{banner("#c39a86")}</V>
        <V c="g04-hit" l={50} t={16} w={40} h={64} d={140}>{banner("#ffeece")}</V>
        <L c="g04-hit2" l={10} t={70} w={80} h={4} d={260} st={{ borderRadius: "999px", background: "#33221c" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(195,154,134,0.26)" />}>
      <V c="g04-tp-left" l={38} t={38} w={11} h={17} d={100} st={{ transformOrigin: "50% 0%" }}>{banner("#c39a86")}</V>
      <V c="g04-tp-right" l={51} t={38} w={11} h={17} d={260} st={{ transformOrigin: "50% 0%" }}>{banner("#ffeece")}</V>
      <L c="g04-creep" l={37} t={38} w={26} h={18} d={440} st={{ background: "linear-gradient(180deg, rgba(255,238,206,0.62), transparent)" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g04-tp-weft" l={39 + i * 6} t={40} w={0.9} h={13} d={580 + i * 90} st={{ background: "#33221c" }} />
      ))}
      <L c="g04-tp-hush" l={41} t={40} w={18} h={16} d={700} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,238,206,0.55), transparent 70%)" }} />
      <Sift col="#c39a86" l={42} t={54} d={740} n={3} />
    </Lead>
  );
}

/* --- 28. Small Ritual (t1) — THE COIN GOES SMOOTH ---------------------------
   The same coin, touched three times for luck: the thumb crosses it, the relief
   flattens a little more each pass, and what is left is a warm blank disc.
   Palette: #cdb886 / #fff2d2 / #2e2716. */
const CN_TOUCH = [0, 1, 2];

function SmallRitualScene({ role, delayMs }: SceneProps) {
  const coin = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="9" fill="#cdb886" stroke="#2e2716" strokeWidth="1.2" />
      <path d="M12 6.4l1.7 3.6 3.9.4-3 2.6.9 3.8L12 15l-3.5 1.8.9-3.8-3-2.6 3.9-.4z" fill="#2e2716" />
    </g>
  );
  const thumb = <path d="M3 16c0-2.6 2-4 4.4-4h4L9 7.4C8 5.4 10.6 4 11.8 6l3 5.6h4c1.6 0 2.6 1 2.6 2.6 0 3.4-2.8 5.8-7 5.8H8c-3 0-5-1.6-5-4z" fill="none" stroke="#fff2d2" strokeWidth="1.2" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-rise" l={26} t={22} w={48} h={52} d={40}>{coin}</V>
        <V c="g04-cn-thumb" l={10} t={34} w={54} h={48} d={270}>{thumb}</V>
        <L c="g04-cn-shine" l={22} t={40} w={56} h={7} d={480} st={{ background: "linear-gradient(90deg, transparent, #fff2d2, transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={26} t={22} w={48} h={52} d={0}>{coin}</V>
        <V c="g04-hit" l={14} t={34} w={50} h={46} d={150}>{thumb}</V>
        <L c="g04-hit2" l={30} t={44} w={40} h={5} d={270} st={{ background: "linear-gradient(90deg, transparent, #fff2d2, transparent)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(205,184,134,0.24)" />}>
      <V c="g04-cn-coin" l={45} t={43} w={10} h={10} d={90}>{coin}</V>
      {CN_TOUCH.map((i) => (
        <V key={i} c="g04-cn-thumb" l={38} t={42} w={12} h={11} d={230 + i * 130}>{thumb}</V>
      ))}
      <L c="g04-layin" l={44} t={42} w={12} h={12} d={560} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(205,184,134,0.85), transparent 66%)" }} />
      <L c="g04-cn-shine" l={42} t={46} w={16} h={2.4} d={660} st={{ background: "linear-gradient(90deg, transparent, #fff2d2, transparent)" }} />
      <L c="g04-glint" l={51} t={44} w={2.4} h={2.4} d={740} st={{ borderRadius: "50%", background: "#fff2d2" }} />
    </Lead>
  );
}

/* --- 29. Two Breaths (t1) — THE FOXED LEAVES --------------------------------
   Two open leaves speckle over with foxing, a silverfish bolts out of the
   gutter, and the boards close and press them flat again for another century.
   Palette: #d6c39b / #fff6de / #4a2f18. */
const TB_SPOTS: Array<[number, number]> = [[43, 42], [47, 45], [52, 41], [55, 47], [45, 49]];

function TwoBreathsScene({ role, delayMs }: SceneProps) {
  const leaves = (
    <g {...SJ}>
      <path d="M12 5C9 3 5.4 2.6 2.4 3.4v15C5.4 17.6 9 18 12 20z" fill="#fff6de" stroke="#4a2f18" strokeWidth="1.1" />
      <path d="M12 5c3-2 6.6-2.4 9.6-1.6v15c-3-.8-6.6-.4-9.6 1.6z" fill="#d6c39b" stroke="#4a2f18" strokeWidth="1.1" />
    </g>
  );
  const bug = <path d="M6 12h12M8 9l-3-3M8 15l-3 3M18 12l3-2M18 12l3 2" fill="none" stroke="#4a2f18" strokeWidth="1.3" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g04-ent-rise" l={8} t={22} w={84} h={56} d={40}>{leaves}</V>
        {TB_SPOTS.slice(0, 4).map(([l], i) => (
          <L key={i} c="g04-tb-fox" l={l - 20 + i * 12} t={40} w={6} h={5} d={280 + i * 100} st={{ borderRadius: "50%", background: "#4a2f18" }} />
        ))}
        <V c="g04-ent-mote" l={58} t={62} w={30} h={22} d={500}>{bug}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g04-hitside" l={8} t={22} w={84} h={56} d={0}>{leaves}</V>
        <L c="g04-hit" l={40} t={40} w={16} h={14} d={150} st={{ borderRadius: "50%", background: "#4a2f18" }} />
        <V c="g04-hit2" l={56} t={58} w={30} h={22} d={270}>{bug}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(214,195,155,0.26)" />}>
      <V c="g04-tb-leaf" l={40} t={40} w={20} h={14} d={90}>{leaves}</V>
      {TB_SPOTS.map(([l, t], i) => (
        <L key={i} c="g04-tb-fox" l={l} t={t} w={1.8} h={1.6} d={250 + i * 80} st={{ borderRadius: "50%", background: "#4a2f18" }} />
      ))}
      <V c="g04-tb-bug" l={54} t={48} w={8} h={5} d={520}>{bug}</V>
      <V c="g04-tb-close" l={40} t={40} w={20} h={14} d={620} st={{ transformOrigin: "50% 50%" }}>{leaves}</V>
      <L c="g04-slump" l={39} t={38} w={22} h={4} d={700} st={{ background: "#4a2f18" }} />
      <Sift col="#fff6de" l={42} t={52} d={760} n={3} />
    </Lead>
  );
}

/* =============================================================================
   Registry. Every entry declares an anchor; every `sound` is an existing
   SigSoundKey. `source` is deliberately omitted throughout: these cards leave
   no decorated piece behind on the board, so their play is the cast lead on the
   square they were played on, exactly as the generated family resolved before.
   ========================================================================== */

/** Bind one bespoke scene to its config. */
function S(Render: SigPlugin["Render"], config: SigPlugin["config"]): SigPlugin {
  return { config, Render };
}

/* =============================================================================
   FLAGSHIP IMPACT WAVE - the module-wide moment of real contact.

   Every lead now lands one physical hit from the shared impact vocabulary
   (impact/impact.tsx), layered OVER the card's own scene: centuries land at once: no sky-fire, just masonry and bronze CRUMBLING apart in place with a dust-shock where the weight settles.
   Per card, the IMPACT spec picks the primitive combo, the glyph that is split
   in half, the tint (the card's own core color as an r-g-b triple) and the
   beat, which is synced to that scene's OWN strike rhythm, so no two siblings
   land the same hit. The quake wrapper jolts the whole scene stage on the same
   beat (in-scene only: the real board crop never shakes). Animations-off
   coverage for all of these nodes is at the bottom of g04PatinaPlays.css.
   ========================================================================== */

interface G04Imp {
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

/** The module's shatter victims: a chipped slab, a verdigris helm, a broken column drum. Tinted per card via --imp-rgb. */
const IMP_GLYPHS: ReactNode[] = [
  <svg key="a" viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
    <path d="M4.4 5.6h13.2l2 2.4v10.4H4.4z" fill={IMP_TINT} /><path d="M7 9.2l3 2.8M14 12l2.6 2.6" stroke={IMP_EDGE} strokeWidth="1.4" strokeLinecap="round" />
  </svg>,
  <svg key="b" viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
    <path d="M4.6 12.4a7.4 7.4 0 0 1 14.8 0v6.8H4.6z" fill={IMP_TINT} /><path d="M8 12.2v4M16 12.2v4" stroke={IMP_EDGE} strokeWidth="1.5" strokeLinecap="round" />
  </svg>,
  <svg key="c" viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
    <path d="M6 4.4h12v6.8l-3 1.6-3-1.8-3 1.8-3-1.4z" fill={IMP_TINT} /><path d="M6.8 14.2h10.4v5.4H6.8z" fill={IMP_TINT} /><path d="M9.4 6.6v3M14.6 6.6v3" stroke={IMP_EDGE} strokeWidth="1.4" strokeLinecap="round" />
  </svg>,
];

const IMPACT: Record<string, G04Imp> = {
  bn4_visor_down: { at: 420, rgb: "201 118 47", shock: true, g: 0, q: "s" },
  bn4_angelus_bell: { at: 470, rgb: "111 201 168", g: 1, q: "s" },
  bn4_barter_calm: { at: 530, rgb: "200 80 63", shock: true, g: 2, q: "s" },
  bn4_cold_compress: { at: 570, rgb: "169 216 230", g: 0, q: "s" },
  bn4_dowagers_patience: { at: 650, rgb: "217 168 79", shock: true, g: 1, q: "h" },
  bn4_ear_to_the_ground: { at: 465, rgb: "169 121 63", g: 2, q: "s" },
  bn4_hourglass_flip: { at: 500, rgb: "159 198 89", shock: true, g: 0, q: "s" },
  bn4_knights_vigil: { at: 540, rgb: "154 167 180", g: 1, q: "s" },
  bn4_measured_breath: { at: 580, rgb: "216 195 154", shock: true, g: 2, q: "s" },
  bn4_pawns_lullaby: { at: 695, rgb: "224 180 92", g: 0, q: "s" },
  bn4_saints_day: { at: 440, rgb: "122 168 224", shock: true, g: 1, q: "h" },
  bn4_sleepy_dust: { at: 545, rgb: "240 169 60", g: 2, q: "s" },
  bn4_slipped_collar: { at: 585, rgb: "200 168 116", shock: true, g: 0, q: "s" },
  bn4_spring_in_the_step: { at: 625, rgb: "160 95 52", g: 1, q: "s" },
  bn4_steady_hands: { at: 740, rgb: "142 154 134", shock: true, g: 2, q: "s" },
  bn4_trophy_rest: { at: 430, rgb: "147 165 82", g: 0, q: "s" },
  ov_loan_shark: { at: 480, rgb: "122 90 46", shock: true, g: 1, q: "h" },
  bn4_castle_quiet: { at: 520, rgb: "185 138 94", g: 2, q: "s" },
  bn4_check_valve: { at: 610, rgb: "201 169 78", shock: true, g: 0, q: "s" },
  bn4_crowned_calm: { at: 660, rgb: "232 197 101", g: 1, q: "s" },
  bn4_first_light: { at: 485, rgb: "111 134 184", shock: true, g: 2, q: "s" },
  bn4_grace_note: { at: 590, rgb: "185 191 208", g: 0, q: "s" },
  bn4_kind_omen: { at: 550, rgb: "116 194 180", shock: true, g: 1, q: "h" },
  bn4_morning_stretch: { at: 590, rgb: "217 220 192", g: 2, q: "s" },
  bn4_promise_of_rest: { at: 785, rgb: "183 196 106", shock: true, g: 0, q: "s" },
  bn4_quiet_after: { at: 475, rgb: "125 138 146", g: 1, q: "s" },
  bn4_shared_silence: { at: 525, rgb: "195 154 134", shock: true, g: 2, q: "s" },
  bn4_small_ritual: { at: 630, rgb: "205 184 134", g: 0, q: "s" },
  bn4_two_breaths: { at: 655, rgb: "214 195 155", shock: true, g: 1, q: "h" },
};

/** The impact composite: laser column, glyph split in half, ground ring. */
function ImpactRig({ imp, delayMs }: { imp: G04Imp; delayMs: number }) {
  const s = imp.s ?? 9;
  return (
    <BoardWideStage>
      <span
        className="g04-imprig absolute block"
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
function withImpact(Base: SigPlugin["Render"], imp: G04Imp): SigPlugin["Render"] {
  function ImpactLead(props: { lead: boolean; role: SigRole; delayMs: number }) {
    if (props.role !== "lead") return <Base {...props} />;
    const scene = <Base {...props} />;
    return (
      <>
        {imp.q ? (
          <span
            className={`g04-quake-${imp.q} pointer-events-none absolute inset-0 z-30 block`}
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
  bn4_visor_down: S(VisorDownScene, { ordering: "octagon", staggerMs: 55, victims: ["k"], hasLead: true, sound: "clockcage", anchor: "board" }),
  bn4_angelus_bell: S(AngelusBellScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }),
  bn4_barter_calm: S(BarterCalmScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", anchor: "board" }),
  bn4_cold_compress: S(ColdCompressScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "cast" }),
  bn4_dowagers_patience: S(DowagersPatienceScene, { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "shades", anchor: "board" }),
  bn4_ear_to_the_ground: S(EarToTheGroundScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "petrifiedforest", anchor: "board" }),
  bn4_hourglass_flip: S(HourglassFlipScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "board" }),
  bn4_knights_vigil: S(KnightsVigilScene, { ordering: "octagon", staggerMs: 60, victims: ["n"], hasLead: true, sound: "clockcage", anchor: "board" }),
  bn4_measured_breath: S(MeasuredBreathScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board" }),
  bn4_pawns_lullaby: S(PawnsLullabyScene, { ordering: "file", staggerMs: 80, victims: ["p"], hasLead: true, sound: "snooze", anchor: "board" }),
  bn4_saints_day: S(SaintsDayScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "clockice", anchor: "board" }),
  bn4_sleepy_dust: S(SleepyDustScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "cast" }),
  bn4_slipped_collar: S(SlippedCollarScene, { ordering: "line", staggerMs: 60, victims: ["q"], hasLead: true, sound: "petrifiedforest", anchor: "aim" }),
  bn4_spring_in_the_step: S(SpringInTheStepScene, { ordering: "line", staggerMs: 70, victims: ["p"], hasLead: true, sound: "petrifiedforest", anchor: "board" }),
  bn4_steady_hands: S(SteadyHandsScene, { ordering: "line", staggerMs: 60, victims: ["p"], hasLead: true, sound: "petrify", anchor: "board" }),
  bn4_trophy_rest: S(TrophyRestScene, { ordering: "radial", staggerMs: 60, victims: ["n", "b", "r", "q"], hasLead: true, sound: "petrifiedforest", anchor: "cast" }),
  ov_loan_shark: S(LoanSharkScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades", anchor: "board" }),
  bn4_castle_quiet: S(CastleQuietScene, { ordering: "octagon", staggerMs: 55, victims: ["k", "r"], hasLead: true, sound: "petrifiedforest", anchor: "board" }),
  bn4_check_valve: S(CheckValveScene, { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "petrify", anchor: "board" }),
  bn4_crowned_calm: S(CrownedCalmScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "clockcage", anchor: "cast" }),
  bn4_first_light: S(FirstLightScene, { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "shades", anchor: "board" }),
  bn4_grace_note: S(GraceNoteScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }),
  bn4_kind_omen: S(KindOmenScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "cast" }),
  bn4_morning_stretch: S(MorningStretchScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }),
  bn4_promise_of_rest: S(PromiseOfRestScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "petrify", anchor: "board" }),
  bn4_quiet_after: S(QuietAfterScene, { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "petrify", anchor: "board" }),
  bn4_shared_silence: S(SharedSilenceScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "shades", anchor: "board" }),
  bn4_small_ritual: S(SmallRitualScene, { ordering: "octagon", staggerMs: 60, victims: ["k"], hasLead: true, sound: "clockcage", anchor: "board" }),
  bn4_two_breaths: S(TwoBreathsScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }),
};

// Graft the per-card impact beat onto every lead scene (additive: the base
// scene renders unchanged inside the quake wrapper).
for (const [id, imp] of Object.entries(IMPACT)) {
  const play = PLAYS[id];
  if (play) play.Render = withImpact(play.Render, imp);
}
