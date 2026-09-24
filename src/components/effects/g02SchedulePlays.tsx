// g02SchedulePlays — bespoke plays for the 32 nerf-suspension / draft-timing
// cards that used to share the generated `hourglass` family (one falling-sand
// burst, 32 hue shifts).
//
// MODULE FICTION: THE APPARATUS OF SCHEDULING. Not time itself, but the
// INSTITUTIONS that keep it, being worked by hands. A shift bell rope hauled,
// a duty nail moved down a hook, a key board handed over, a punch-clock lever
// thumped, a departure board flapping to new letters, a counter shutter
// clattering down, a court gavel and the day-book strapped shut, a timetable
// column pasted over, a muster drum and the roll ticked, a toll bar lifted.
// No hourglass, no clock face, no sand anywhere in this module.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g02SchedulePlays.css), transform/opacity animations only, no imports
// from BoardEffects.tsx, only the SigPlugin/SigRole TYPES from sigPlugins.tsx.
//
// STAGING. Every card declares anchor "cast" or "aim", so the apparatus is
// worked on the square the card was played on. Board-scale layers (washes,
// edge gilt, corridor dim) live inside <BoardFrame>, never at a fixed
// percentage of the stage. Cards whose fiction TRAVELS (a relief column
// marching in, a scapegoat sent out, a toll bar across the road, a night
// watch walking its beat) use <AimStage> and author their art pointing RIGHT.
//
// Every scene runs three beats — tell, strike, settle — in all three roles
// ("lead", "target", "entrance"), and every lead carries at least one animated
// layer driven by the geometry vars (--fx-ox lean, --fx-side handover,
// --fx-len run length, --fx-index queue position). All CSS lives in
// g02SchedulePlays.css behind the `g02-` prefix.

import "./g02SchedulePlays.css";

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
const rootStyle = (d: number): CSSProperties => ({ "--g02-d": `${d}ms` }) as CSSProperties;

/** stagger + a beat offset, scaled by the Settings animation-speed var. */
const b = (ms: number): string => `calc(var(--g02-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

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
  return <L c="g02-wash" d={d} st={{ background: `radial-gradient(circle at 50% 48%, ${tone}, transparent 70%)` }} />;
}

/** Board-edge gilt, always inside a BoardFrame. */
function Rim({ tone, d = 160 }: { tone: string; d?: number }) {
  return <L c="g02-rim" d={d} st={{ boxShadow: `inset 0 0 30px 9px ${tone}` }} />;
}

/* Piece silhouettes: what the paperwork is actually about. */
const PAWN = "M12 4.4a2.7 2.7 0 0 1 1.6 4.9l1.8 6.4H8.6l1.8-6.4A2.7 2.7 0 0 1 12 4.4z M7.4 16.8h9.2V19.4H7.4z";
const KING = "M11.1 2.4h1.8v1.5h1.5v1.8h-1.5v1.6h-1.8V5.7H9.6V3.9h1.5zM8 9.2h8l-1.1 7.4H9.1zM7.2 17.6h9.6V20H7.2z";
const KNIGHT = "M8.2 19V13c0-3.8 2.5-5.9 4.6-6.5L12 4.2l3 1.2c2 .9 2.9 2.9 2.9 5.9V19z";
const ROOK = "M7 4.8h2.3v1.6h1.6V4.8h2.2v1.6h1.6V4.8H17v3.6h-1.2v6.8H17V19H7v-3.8h1.2V8.4H7z";
const QUEEN = "M6.4 6l1.3 3.2L9.4 6.6 12 9.4l2.6-2.8 1.7 2.6L17.6 6l-1 10.4H7.4zM7 17.4h10v2.4H7z";
const BISHOP = "M12 2.4c1.4 1.4 2.2 2.6 2.2 3.6 0 .8-.4 1.4-1 1.9 2.2 1.6 3.4 3.8 3.4 6.1v3H7.4v-3c0-2.3 1.2-4.5 3.4-6.1-.6-.5-1-1.1-1-1.9 0-1 .8-2.2 2.2-3.6zM7 17.4h10v2.4H7z";

/* =============================================================================
   TIER 7
   ========================================================================== */

/* --- 1. Uphill Battle (t7) — THE SHIFT BELL ROPE HAULED ---------------------
   The rope is taken up and hauled hand over hand against the weight of the
   bell; the sally tuft climbs the fall, the headstock tips over, and when the
   deficit passes the rope pays back out in a slack coil on the boards.
   Palette: #e8c987 / #fff3d4 / #2a2312. */
function UphillBattleScene({ role, delayMs }: SceneProps) {
  const bell = (
    <g {...SJ}>
      <path d="M6 17c0-6.2 1.7-9.4 6-9.4s6 3.2 6 9.4z" fill="#e8c987" stroke="#2a2312" strokeWidth="1.2" />
      <path d="M4.4 17h15.2v2.2H4.4z" fill="#fff3d4" stroke="#2a2312" strokeWidth="1" />
      <path d="M12 4.4v3.2" stroke="#2a2312" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g02-ent-drop" l={20} t={8} w={60} h={48} d={40}>{bell}</V>
        <L c="g02-ub-haul" l={47} t={44} w={6} h={50} d={240} st={{ background: "linear-gradient(180deg, #e8c987, rgba(232,201,135,0.3))", transformOrigin: "50% 0%" }} />
        <L c="g02-ent-pop" l={42} t={64} w={16} h={16} d={460} st={{ borderRadius: "999px", background: "#fff3d4" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hitside" l={46} t={4} w={8} h={64} d={0} st={{ background: "linear-gradient(180deg, #e8c987, rgba(232,201,135,0.25))" }} />
        <V c="g02-hit" l={26} t={44} w={48} h={44} d={140}>{bell}</V>
        <L c="g02-hit2" l={40} t={58} w={20} h={20} d={260} st={{ borderRadius: "50%", border: "2px solid #fff3d4" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(232,201,135,0.28)" />
          <Rim tone="rgba(255,243,212,0.34)" />
        </>
      }
    >
      <L c="g02-shaft" l={45} t={18} w={10} h={38} d={60} st={{ background: "linear-gradient(180deg, rgba(255,243,212,0.66), transparent)", transformOrigin: "50% 0%" }} />
      <V c="g02-ub-bell" l={43} t={26} w={14} h={14} d={160} st={{ transformOrigin: "50% 14%" }}>{bell}</V>
      <L c="g02-ub-haul" l={49.2} t={34} w={1.6} h={22} d={260} st={{ background: "linear-gradient(180deg, #2a2312, #e8c987)", transformOrigin: "50% 0%" }} />
      <L c="g02-ub-sally" l={47.4} t={45} w={5.2} h={4} d={380} st={{ borderRadius: "999px", background: "#fff3d4" }} />
      <L c="g02-ub-slack" l={44} t={54} w={12} h={5} d={620} st={{ borderRadius: "999px", border: "2px solid #e8c987" }} />
      <L c="g02-leanshadow" l={43} t={57} w={14} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(42,35,18,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g02-sift" l={45 + i * 5} t={52} w={1.4} h={1.4} d={720 + i * 100} st={{ borderRadius: "50%", background: "#e8c987" }} />
      ))}
    </Lead>
  );
}

/* --- 2. Warden's Retirement (t7) — THE KEY BOARD HANDED OVER ----------------
   A numbered key board fades up on the guardhouse wall; the warden's ring is
   lifted off its hook, swung across the board and hung on the relief peg,
   and his own duty plate is turned face to the wall.
   Palette: #9fbfd8 / #fff4d6 / #16202c. */
const WR_HOOKS = [0, 1, 2, 3, 4];

function WardensRetirementScene({ role, delayMs }: SceneProps) {
  const ring = (
    <g {...SJ}>
      <circle cx="12" cy="8" r="5" fill="none" stroke="#9fbfd8" strokeWidth="1.8" />
      <path d="M9.4 12.6l-1.6 8M12 13v8.4M14.6 12.6l1.6 8" stroke="#fff4d6" strokeWidth="1.4" />
      <path d="M7.2 18.4h2M14.8 18.4h2" stroke="#fff4d6" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g02-wr-hook" l={8} t={18} w={84} h={30} d={40}>
          <g fill="none" stroke="#9fbfd8" strokeWidth="1.4" {...SJ}>
            <path d="M2 6h20M5 6v3.4M12 6v3.4M19 6v3.4" />
          </g>
        </V>
        <V c="g02-wr-ring" l={26} t={24} w={48} h={56} d={260}>{ring}</V>
        <L c="g02-ent-pop" l={38} t={64} w={24} h={16} d={470} st={{ background: "#16202c", border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g02-hitside" l={24} t={16} w={52} h={60} d={0}>{ring}</V>
        <L c="g02-hit" l={16} t={20} w={68} h={3} d={140} st={{ borderRadius: "999px", background: "#9fbfd8" }} />
        <L c="g02-hit2" l={40} t={62} w={20} h={14} d={260} st={{ background: "#16202c", border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  return null;
}

/* --- 3. Iron Portcullis (t7) — THE COUNTER SHUTTER COMES DOWN ---------------
   The armory issue window slams: the roller shutter clatters down slat by
   slat, a brass CLOSED plate slides across the hours board, and the drop bolt
   falls through the staple with a shudder of dust.
   Palette: #b8b2a2 / #fff2d8 / #1c1a14. */
const IP_SLATS = [0, 1, 2, 3];

function IronPortcullisScene({ role, delayMs }: SceneProps) {
  const hours = (
    <g {...SJ}>
      <rect x="2" y="5" width="20" height="14" rx="1" fill="#1c1a14" stroke="#b8b2a2" strokeWidth="1.2" />
      <path d="M5 10h14M5 13h14M5 16h9" stroke="#b8b2a2" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g02-ent-rise" l={14} t={26} w={72} h={48} d={40}>{hours}</V>
        {IP_SLATS.slice(0, 3).map((i) => (
          <L key={i} c="g02-ip-slat" l={12} t={16 + i * 12} w={76} h={8} d={220 + i * 110} st={{ background: "#b8b2a2", border: "1px solid #1c1a14" }} />
        ))}
        <L c="g02-ent-pop" l={34} t={66} w={32} h={12} d={520} st={{ background: "#fff2d8" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hit" l={14} t={22} w={72} h={9} d={0} st={{ background: "#b8b2a2", border: "1px solid #1c1a14" }} />
        <L c="g02-hitside" l={14} t={36} w={72} h={9} d={130} st={{ background: "#b8b2a2", border: "1px solid #1c1a14" }} />
        <L c="g02-hit2" l={40} t={58} w={20} h={8} d={260} st={{ background: "#fff2d8" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(184,178,162,0.26)" />
          <Rim tone="rgba(28,26,20,0.5)" />
        </>
      }
    >
      <V c="g02-ip-hours" l={39} t={38} w={22} h={14} d={80}>{hours}</V>
      {IP_SLATS.map((i) => (
        <L key={i} c="g02-ip-slat" l={39} t={38 + i * 3.6} w={22} h={3.2} d={200 + i * 110} st={{ background: "#b8b2a2", border: "1px solid #1c1a14" }} />
      ))}
      <L c="g02-ip-plate" l={42} t={45} w={16} h={4} d={640} st={{ background: "#fff2d8", border: "1px solid #1c1a14" }} />
      <L c="g02-ip-bolt" l={49} t={50} w={2} h={7} d={700} st={{ borderRadius: "1px", background: "#1c1a14", transformOrigin: "50% 0%" }} />
      <L c="g02-leanshadow" l={38} t={55} w={24} h={3} d={720} st={{ borderRadius: "999px", background: "rgba(28,26,20,0.68)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g02-sift" l={41 + i * 8} t={52} w={1.4} h={1.4} d={760 + i * 90} st={{ borderRadius: "50%", background: "#b8b2a2" }} />
      ))}
    </Lead>
  );
}

/* --- 4. Patient Grift (t7) — THE DEPARTURE BOARD FLAPS ----------------------
   The split-flap board stutters: two rows riffle through their letters and
   land on CANCELLED, and while the hall groans the bottom row keeps turning
   and settles on a far better departure than the one that was booked.
   Palette: #f0d38a / #fff4d6 / #221c10. */
const PG_ROWS = [0, 1, 2];

function PatientGriftScene({ role, delayMs }: SceneProps) {
  const row = (fill: string) => (
    <g {...SJ}>
      <rect x="1" y="4" width="22" height="7" rx="1" fill={fill} stroke="#221c10" strokeWidth="1" />
      <path d="M1 7.6h22" stroke="#221c10" strokeWidth="0.8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        {PG_ROWS.map((i) => (
          <V key={i} c="g02-pg-flap" l={8} t={16 + i * 22} w={84} h={22} d={40 + i * 150} st={{ transformOrigin: "50% 46%" }}>
            {row(i === 2 ? "#fff4d6" : "#f0d38a")}
          </V>
        ))}
        <L c="g02-ent-pop" l={26} t={62} w={48} h={4} d={520} st={{ borderRadius: "999px", background: "#221c10" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g02-hit" l={10} t={26} w={80} h={22} d={0}>{row("#f0d38a")}</V>
        <V c="g02-hitside" l={10} t={50} w={80} h={22} d={140}>{row("#fff4d6")}</V>
        <L c="g02-hit2" l={22} t={44} w={56} h={3} d={260} st={{ borderRadius: "999px", background: "#221c10" }} />
      </Cut>
    );
  }
  return null;
}

/* =============================================================================
   TIER 6
   ========================================================================== */

/* --- 5. Diplomatic Pouch (t6) — THE COURIER POUCH UNBUCKLED -----------------
   The sealed despatch pouch is set down, the strap is unbuckled, the flap
   falls open and a folded courier schedule is drawn out and held up long
   enough to read the other side's departure times off it.
   Palette: #c4986a / #fff4d6 / #2b1f12. */
function DiplomaticPouchScene({ role, delayMs }: SceneProps) {
  const pouch = (
    <g {...SJ}>
      <path d="M4 8h16v12.4H4z" fill="#2b1f12" stroke="#c4986a" strokeWidth="1.2" />
      <path d="M4 8l3-4h10l3 4z" fill="#c4986a" stroke="#2b1f12" strokeWidth="1" />
      <path d="M11 8v5h2V8z" fill="#fff4d6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g02-ent-rise" l={20} t={26} w={60} h={58} d={40}>{pouch}</V>
        <V c="g02-dp-buckle" l={38} t={38} w={24} h={20} d={260} st={{ transformOrigin: "50% 100%" }}>
          <rect x="6" y="7" width="12" height="10" rx="1" fill="none" stroke="#fff4d6" strokeWidth="2" />
        </V>
        <L c="g02-dp-slip" l={32} t={14} w={36} h={26} d={470} st={{ background: "#fff4d6", border: "1px solid #2b1f12" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g02-hitside" l={22} t={24} w={56} h={56} d={0}>{pouch}</V>
        <L c="g02-hit" l={34} t={12} w={32} h={22} d={140} st={{ background: "#fff4d6", border: "1px solid #2b1f12" }} />
        <L c="g02-hit2" l={44} t={70} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#c4986a" }} />
      </Cut>
    );
  }
  return null;
}

/* --- 6. Double Pardon (t6) — THE GAVEL AND THE DAY-BOOK ---------------------
   The court rises: the gavel comes down twice on its block, two lines of the
   cause list are crossed out, and the day-book slaps shut and takes its strap
   with a puff of dry paper dust.
   Palette: #d8a15c / #fff3d4 / #2a1a0c. */
function DoublePardonScene({ role, delayMs }: SceneProps) {
  const gavel = (
    <g {...SJ}>
      <rect x="4" y="4" width="9" height="6" rx="1" fill="#d8a15c" stroke="#2a1a0c" strokeWidth="1.1" />
      <path d="M12 8.4l8 9.6" stroke="#d8a15c" strokeWidth="2.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g02-dq-gavel" l={12} t={8} w={60} h={52} d={40} st={{ transformOrigin: "82% 82%" }}>{gavel}</V>
        <L c="g02-dq-block" l={16} t={60} w={44} h={10} d={280} st={{ background: "#2a1a0c", border: "1px solid #d8a15c" }} />
        <L c="g02-ent-pop" l={58} t={40} w={34} h={26} d={480} st={{ background: "#fff3d4", border: "1px solid #2a1a0c" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g02-hit" l={14} t={10} w={58} h={52} d={0} st={{ transformOrigin: "82% 82%" }}>{gavel}</V>
        <L c="g02-hitside" l={18} t={62} w={46} h={8} d={140} st={{ background: "#2a1a0c" }} />
        <L c="g02-hit2" l={30} t={50} w={44} h={3} d={260} st={{ borderRadius: "999px", background: "#fff3d4" }} />
      </Cut>
    );
  }
  return null;
}

/* --- 7. Changing of the Guard (t6) — THE NAIL MOVED DOWN A HOOK -------------
   The guardhouse duty board: a rank of hooks with the roster card hanging on
   it. The duty nail is pulled out of its hook, dropped one hook down the
   board, and the card swings on its cord while the relief walks on.
   Palette: #8fb89a / #fff4d6 / #16261b. */
const GC_HOOKS = [0, 1, 2, 3];

function GuardsChangeScene({ role, delayMs }: SceneProps) {
  const card = (
    <g {...SJ}>
      <rect x="5" y="4" width="14" height="16" rx="1" fill="#fff4d6" stroke="#16261b" strokeWidth="1.1" />
      <path d="M8 9h8M8 12h8M8 15h5" stroke="#16261b" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g02-gc-rail" l={8} t={20} w={84} h={3} d={40} st={{ borderRadius: "999px", background: "#8fb89a" }} />
        <V c="g02-gc-card" l={30} t={24} w={40} h={48} d={250} st={{ transformOrigin: "50% 0%" }}>{card}</V>
        <L c="g02-gc-nail" l={64} t={26} w={8} h={22} d={470} st={{ borderRadius: "1px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hit" l={12} t={22} w={76} h={3} d={0} st={{ borderRadius: "999px", background: "#8fb89a" }} />
        <V c="g02-hitside" l={30} t={28} w={40} h={48} d={130} st={{ transformOrigin: "50% 0%" }}>{card}</V>
        <L c="g02-hit2" l={70} t={30} w={6} h={18} d={260} st={{ borderRadius: "1px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(143,184,154,0.26)" />}>
      <L c="g02-gc-rail" l={36} t={38} w={28} h={1.6} d={80} st={{ borderRadius: "999px", background: "#8fb89a" }} />
      {GC_HOOKS.map((i) => (
        <L key={i} c="g02-gc-hook" l={37.5 + i * 6.5} t={39} w={1.4} h={3} d={170 + i * 80} st={{ borderRadius: "999px", background: "#16261b" }} />
      ))}
      <L c="g02-gc-nail" l={44} t={39} w={2.2} h={5} d={440} st={{ borderRadius: "1px", background: "#fff4d6" }} />
      <V c="g02-gc-card" l={49} t={42} w={10} h={13} d={580} st={{ transformOrigin: "50% 0%" }}>{card}</V>
      <L c="g02-callin" l={41} t={46} w={7} h={9} d={640} st={{ background: "rgba(22,38,27,0.72)", border: "1px solid #8fb89a" }} />
      <L c="g02-leanshadow" l={40} t={57} w={20} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(22,38,27,0.6)" }} />
      <L c="g02-glint" l={45} t={39} w={2} h={2} d={760} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 8. Hidden Clause (t6) — THE UNCUT LEAF ---------------------------------
   A bound almanac sits closed. A paper knife runs the fold of a leaf that was
   never opened, the page parts, and the clause buried inside it is ruled
   under while the rest of the block riffles past.
   Palette: #b9a2d0 / #fff4d6 / #1f1730. */
function HiddenClauseScene({ role, delayMs }: SceneProps) {
  const knife = (
    <g {...SJ}>
      <path d="M2 20l14-14 3 3-14 14z" fill="#fff4d6" stroke="#1f1730" strokeWidth="1" />
      <path d="M16 6l2-3 3 3-3 2z" fill="#b9a2d0" stroke="#1f1730" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hc-book" l={16} t={24} w={68} h={52} d={40} st={{ background: "#fff4d6", border: "2px solid #1f1730" }} />
        <V c="g02-hc-knife" l={10} t={14} w={60} h={60} d={260}>{knife}</V>
        <L c="g02-hc-rule" l={24} t={62} w={52} h={2.4} d={470} st={{ borderRadius: "999px", background: "#b9a2d0", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hitside" l={18} t={22} w={64} h={54} d={0} st={{ background: "#fff4d6", border: "2px solid #1f1730" }} />
        <V c="g02-hit" l={16} t={16} w={56} h={56} d={130}>{knife}</V>
        <L c="g02-hit2" l={26} t={62} w={48} h={2.6} d={260} st={{ borderRadius: "999px", background: "#b9a2d0" }} />
      </Cut>
    );
  }
  return null;
}

/* --- 9. Hollow Crown (t6) — THE ANNUNCIATOR FLAG DROPS ----------------------
   The corridor bell-box: a glass case of numbered flags, one per room. The
   wire twitches, the QUEEN flag drops and stays down, and every other flag
   in the box holds up while the shutter clicks over the empty slot.
   Palette: #e2b6c8 / #fff4d6 / #2b1520. */
const HK_FLAGS = [0, 1, 2, 3];

function HollowCrownScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hk-box" l={12} t={24} w={76} h={44} d={40} st={{ background: "rgba(43,21,32,0.75)", border: "2px solid #e2b6c8" }} />
        <L c="g02-hk-wire" l={44} t={4} w={2.6} h={22} d={250} st={{ borderRadius: "999px", background: "#fff4d6" }} />
        <V c="g02-hk-flag" l={34} t={30} w={32} h={32} d={470} st={{ transformOrigin: "50% 10%" }}>
          <path d={QUEEN} fill="#fff4d6" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hitside" l={16} t={26} w={68} h={42} d={0} st={{ background: "rgba(43,21,32,0.72)", border: "2px solid #e2b6c8" }} />
        <L c="g02-hit" l={46} t={6} w={4} h={22} d={140} st={{ borderRadius: "999px", background: "#fff4d6" }} />
        <V c="g02-hit2" l={36} t={34} w={28} h={28} d={260}><path d={QUEEN} fill="#fff4d6" /></V>
      </Cut>
    );
  }
  return null;
}

/* --- 10. Long Holiday (t6) — THE WORKS NOTICE NAILED UP ---------------------
   A printed bill is held against the works door, the hammer taps four nails
   into its corners, and the hasp swings over and takes its padlock. Nothing
   opens again for a long time.
   Palette: #86b7c9 / #fff3d4 / #14262e. */
const LH_NAILS: Array<[number, number]> = [[40, 39], [58, 39], [40, 52], [58, 52]];

function LongHolidayScene({ role, delayMs }: SceneProps) {
  const hammer = (
    <g {...SJ}>
      <path d="M4 4h10v5H4z" fill="#86b7c9" stroke="#14262e" strokeWidth="1.1" />
      <path d="M9 9v12" stroke="#14262e" strokeWidth="2" />
    </g>
  );
  const lock = (
    <g {...SJ}>
      <rect x="6" y="11" width="12" height="9" rx="1" fill="#fff3d4" stroke="#14262e" strokeWidth="1.1" />
      <path d="M8.6 11V8.4a3.4 3.4 0 0 1 6.8 0V11" fill="none" stroke="#86b7c9" strokeWidth="1.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g02-lh-bill" l={20} t={18} w={54} h={54} d={40} st={{ background: "#fff3d4", border: "1px solid #14262e" }} />
        <V c="g02-lh-hammer" l={44} t={4} w={44} h={48} d={260} st={{ transformOrigin: "36% 88%" }}>{hammer}</V>
        <V c="g02-ent-pop" l={54} t={54} w={34} h={34} d={490}>{lock}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hitside" l={22} t={16} w={52} h={54} d={0} st={{ background: "#fff3d4", border: "1px solid #14262e" }} />
        <V c="g02-hit" l={42} t={6} w={40} h={44} d={140} st={{ transformOrigin: "36% 88%" }}>{hammer}</V>
        <L c="g02-hit2" l={44} t={72} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#86b7c9" }} />
      </Cut>
    );
  }
  return null;
}

/* --- 11. Mason's Lodge (t6) — THE LODGE SUMMONS CHALKED ---------------------
   The lodge slate is set on its easel, the summons chalked across it, the
   master's mallet raps the trestle three times, and a fresh dressed rook
   block is lifted onto the bench ready to be set later.
   Palette: #cbb894 / #fff4d6 / #2a2418. */
const ML_RAPS = [0, 1, 2];

function MasonsLodgeScene({ role, delayMs }: SceneProps) {
  const mallet = (
    <g {...SJ}>
      <path d="M6 3h12v7H6z" fill="#cbb894" stroke="#2a2418" strokeWidth="1.1" />
      <path d="M12 10v11" stroke="#2a2418" strokeWidth="2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g02-ml-slate" l={14} t={18} w={72} h={44} d={40} st={{ background: "#2a2418", border: "2px solid #cbb894" }} />
        <L c="g02-ml-chalk" l={20} t={34} w={60} h={3} d={260} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "0% 50%" }} />
        <V c="g02-ml-mallet" l={48} t={44} w={44} h={48} d={480} st={{ transformOrigin: "50% 92%" }}>{mallet}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hitside" l={16} t={20} w={68} h={42} d={0} st={{ background: "#2a2418", border: "2px solid #cbb894" }} />
        <L c="g02-hit" l={22} t={36} w={56} h={3} d={140} st={{ borderRadius: "999px", background: "#fff4d6" }} />
        <V c="g02-hit2" l={36} t={54} w={30} h={34} d={260}><path d={ROOK} fill="#cbb894" /></V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(203,184,148,0.26)" />}>
      <L c="g02-ml-slate" l={38} t={34} w={24} h={18} d={80} st={{ background: "#2a2418", border: "1px solid #cbb894" }} />
      <L c="g02-ml-chalk" l={40} t={40} w={20} h={1.4} d={220} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "0% 50%" }} />
      {ML_RAPS.map((i) => (
        <V key={i} c="g02-ml-mallet" l={52 + i * 0.6} t={40} w={11} h={13} d={380 + i * 130} st={{ transformOrigin: "50% 92%" }}>{mallet}</V>
      ))}
      <L c="g02-ml-bench" l={39} t={53} w={22} h={2.2} d={600} st={{ borderRadius: "999px", background: "#cbb894" }} />
      <V c="g02-callin" l={44} t={45} w={9} h={11} d={660}><path d={ROOK} fill="#fff4d6" stroke="#2a2418" strokeWidth="1" {...SJ} /></V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g02-sift" l={43 + i * 6} t={52} w={1.4} h={1.4} d={720 + i * 100} st={{ borderRadius: "50%", background: "#cbb894" }} />
      ))}
    </Lead>
  );
}

/* --- 12. Minister's Seal (t6) — THE RED BOX OPENS ---------------------------
   The despatch box is set on the desk, the lock turns, the lid comes up and
   the standing order is lifted out and countersigned in one long stroke
   before the lid drops again on the ministry's own timetable.
   Palette: #d4746a / #fff4d6 / #2c1210. */
function MinistersSealScene({ role, delayMs }: SceneProps) {
  const box = (
    <g {...SJ}>
      <rect x="3" y="8" width="18" height="12" rx="1" fill="#d4746a" stroke="#2c1210" strokeWidth="1.2" />
      <rect x="10" y="11" width="4" height="4" rx="1" fill="#fff4d6" stroke="#2c1210" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g02-ent-rise" l={16} t={30} w={68} h={52} d={40}>{box}</V>
        <L c="g02-ms-lid" l={16} t={22} w={68} h={14} d={270} st={{ background: "#d4746a", border: "1px solid #2c1210", transformOrigin: "50% 100%" }} />
        <L c="g02-ms-order" l={28} t={6} w={44} h={30} d={480} st={{ background: "#fff4d6", border: "1px solid #2c1210" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g02-hitside" l={20} t={28} w={60} h={52} d={0}>{box}</V>
        <L c="g02-hit" l={26} t={10} w={48} h={26} d={140} st={{ background: "#fff4d6", border: "1px solid #2c1210" }} />
        <L c="g02-hit2" l={30} t={30} w={40} h={2.6} d={260} st={{ borderRadius: "999px", background: "#d4746a" }} />
      </Cut>
    );
  }
  return null;
}

/* --- 13. Out on Bail (t6) — THE DOCKET SPIKED -------------------------------
   The cell bolt is drawn back, the recognizance is written out with a return
   day on it, and the clerk drives the docket down onto the spike where the
   whole day's business already sits.
   Palette: #a8b3c8 / #fff3d4 / #171c26. */
function OutOnBailScene({ role, delayMs }: SceneProps) {
  const spike = (
    <g {...SJ}>
      <path d="M12 22V3" stroke="#a8b3c8" strokeWidth="2.2" />
      <path d="M7 22h10" stroke="#a8b3c8" strokeWidth="2.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g02-ob-bolt" l={8} t={30} w={44} h={9} d={40} st={{ borderRadius: "999px", background: "#a8b3c8" }} />
        <L c="g02-ob-slip" l={26} t={20} w={46} h={34} d={260} st={{ background: "#fff3d4", border: "1px solid #171c26" }} />
        <V c="g02-ob-spike" l={54} t={40} w={36} h={52} d={480}>{spike}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hit" l={10} t={32} w={40} h={7} d={0} st={{ borderRadius: "999px", background: "#a8b3c8" }} />
        <L c="g02-hitside" l={30} t={22} w={44} h={32} d={140} st={{ background: "#fff3d4", border: "1px solid #171c26" }} />
        <V c="g02-hit2" l={52} t={42} w={34} h={48} d={260}>{spike}</V>
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <L c="g02-veil" st={{ background: "rgba(10,13,20,0.4)" }} />
          <Wash tone="rgba(168,179,200,0.26)" d={110} />
        </>
      }
    >
      <L c="g02-ob-bolt" l={38} t={38} w={12} h={2.4} d={90} st={{ borderRadius: "999px", background: "#a8b3c8" }} />
      <L c="g02-ob-slip" l={41} t={40} w={14} h={11} d={260} st={{ background: "#fff3d4", border: "1px solid #171c26" }} />
      <L c="g02-ob-date" l={43} t={45} w={9} h={1.2} d={420} st={{ borderRadius: "999px", background: "#171c26", transformOrigin: "0% 50%" }} />
      <V c="g02-ob-spike" l={51} t={40} w={9} h={16} d={580}>{spike}</V>
      <L c="g02-callin" l={49} t={44} w={12} h={4} d={660} st={{ background: "rgba(255,243,212,0.85)" }} />
      <L c="g02-leanshadow" l={44} t={56} w={16} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(23,28,38,0.68)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g02-sift" l={45 + i * 6} t={52} w={1.4} h={1.4} d={740 + i * 90} st={{ borderRadius: "50%", background: "#a8b3c8" }} />
      ))}
    </Lead>
  );
}

/* --- 14. Pillars of Home (t6) — THE STANDING ORDER FRAME --------------------
   Two stone piers thump down on either side of the square and a lintel board
   drops across them; the standing timetable is fixed to it and the bracket
   lamp above it is lit. While the piers stand, the board is readable.
   Palette: #a89c86 / #fff4d6 / #221e16. */
function PillarsOfHomeScene({ role, delayMs }: SceneProps) {
  const pier = (fill: string) => (
    <g {...SJ}>
      <rect x="6" y="4" width="12" height="17" rx="1" fill={fill} stroke="#221e16" strokeWidth="1.1" />
      <path d="M6 9h12M6 14h12" stroke="#221e16" strokeWidth="0.8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g02-ph-pier" l={4} t={24} w={34} h={58} d={40}>{pier("#a89c86")}</V>
        <V c="g02-ph-pier" l={62} t={24} w={34} h={58} d={230}>{pier("#a89c86")}</V>
        <L c="g02-ph-lintel" l={10} t={10} w={80} h={14} d={460} st={{ background: "#fff4d6", border: "1px solid #221e16" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g02-hitside" l={8} t={26} w={32} h={56} d={0}>{pier("#a89c86")}</V>
        <V c="g02-hit" l={60} t={26} w={32} h={56} d={130}>{pier("#a89c86")}</V>
        <L c="g02-hit2" l={12} t={14} w={76} h={10} d={260} st={{ background: "#fff4d6" }} />
      </Cut>
    );
  }
  return null;
}

/* --- 15. Quiet Coup (t6) — THE NAMEPLATE SWAPPED IN ITS SLOT ----------------
   No noise at all: the brass slot on the duty door has one plate slid out of
   it and another slid in from the other end, and the roster line behind it
   is quietly re-lettered a grade higher.
   Palette: #b7c8a8 / #fff4d6 / #1c2418. */
function QuietCoupScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g02-qc-slot" l={10} t={34} w={80} h={22} d={40} st={{ background: "rgba(28,36,24,0.8)", border: "2px solid #b7c8a8" }} />
        <L c="g02-qc-out" l={12} t={37} w={40} h={16} d={260} st={{ background: "#b7c8a8" }} />
        <L c="g02-qc-in" l={48} t={37} w={40} h={16} d={470} st={{ background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hit" l={12} t={36} w={76} h={20} d={0} st={{ background: "rgba(28,36,24,0.78)", border: "2px solid #b7c8a8" }} />
        <L c="g02-hitside" l={14} t={39} w={36} h={14} d={140} st={{ background: "#b7c8a8" }} />
        <L c="g02-hit2" l={50} t={39} w={36} h={14} d={260} st={{ background: "#fff4d6" }} />
      </Cut>
    );
  }
  return null;
}

/* --- 16. Relief Column (t6) — THE MUSTER DRUM AND THE ROLL ------------------
   Aim-staged: the relief comes UP the play's own vector. The drum beats, the
   muster roll unrolls along the road, two names are ticked off it and the two
   returning pieces fall in at the head of the column.
   Palette: #d09a5c / #fff3d4 / #2b1c0e. */
function ReliefColumnScene({ role, delayMs }: SceneProps) {
  const drum = (
    <g {...SJ}>
      <rect x="4" y="7" width="16" height="10" rx="1" fill="#d09a5c" stroke="#2b1c0e" strokeWidth="1.2" />
      <path d="M4 9l16 6M20 9L4 15" stroke="#fff3d4" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g02-rc-drum" l={8} t={28} w={48} h={48} d={40}>{drum}</V>
        <L c="g02-rc-roll" l={12} t={64} w={76} h={12} d={270} st={{ background: "#fff3d4", border: "1px solid #2b1c0e", transformOrigin: "0% 50%" }} />
        <V c="g02-ent-pop" l={58} t={22} w={34} h={40} d={480}><path d={ROOK} fill="#d09a5c" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g02-hitside" l={12} t={26} w={44} h={46} d={0}>{drum}</V>
        <L c="g02-hit" l={16} t={62} w={68} h={9} d={140} st={{ background: "#fff3d4", transformOrigin: "0% 50%" }} />
        <V c="g02-hit2" l={56} t={26} w={32} h={40} d={260}><path d={ROOK} fill="#d09a5c" /></V>
      </Cut>
    );
  }
  return null;
}

/* --- 17. Rule of Three (t6) — THE WORKS TURNSTILE ---------------------------
   The counting gate at the yard entrance: the arm is pushed round a click at
   a time, the counter drum rolls 1, 2, 3, and on the third the barrier falls
   away and a chit prints out of the slot.
   Palette: #94c4bd / #fff4d6 / #12292a. */
const R3_CLICKS = [0, 1, 2];

function RuleOfThreeScene({ role, delayMs }: SceneProps) {
  const arm = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="3" fill="#12292a" stroke="#94c4bd" strokeWidth="1.4" />
      <path d="M12 9V2M12 15v7M15 12h7" stroke="#94c4bd" strokeWidth="1.8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g02-r3-arm" l={20} t={16} w={60} h={60} d={40}>{arm}</V>
        <L c="g02-r3-digit" l={30} t={72} w={40} h={16} d={280} st={{ background: "#fff4d6", border: "1px solid #12292a" }} />
        <L c="g02-r3-chit" l={62} t={44} w={30} h={14} d={490} st={{ background: "#94c4bd" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g02-hit" l={22} t={18} w={56} h={56} d={0}>{arm}</V>
        <L c="g02-hitside" l={32} t={72} w={36} h={14} d={140} st={{ background: "#fff4d6" }} />
        <L c="g02-hit2" l={64} t={46} w={26} h={12} d={260} st={{ background: "#94c4bd" }} />
      </Cut>
    );
  }
  return null;
}

/* --- 18. Spymaster's Leave (t6) — THE PIGEONHOLE RACK -----------------------
   The message rack on the back-office wall: slips sit in numbered holes, one
   is drawn out and read, and the spymaster's own leave chit is dropped into
   the empty hole in its place.
   Palette: #8fa2d0 / #fff4d6 / #171b2c. */
const SL_HOLES: Array<[number, number]> = [[38, 39], [45, 39], [52, 39], [38, 46], [45, 46], [52, 46]];

function SpymastersLeaveScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g02-sl-rack" l={10} t={20} w={80} h={52} d={40} st={{ background: "rgba(23,27,44,0.78)", border: "2px solid #8fa2d0" }} />
        <L c="g02-sl-slip" l={26} t={12} w={30} h={26} d={270} st={{ background: "#fff4d6", border: "1px solid #171b2c" }} />
        <L c="g02-sl-stamp" l={54} t={54} w={30} h={20} d={480} st={{ background: "#8fa2d0", border: "1px solid #fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hit" l={14} t={22} w={72} h={48} d={0} st={{ background: "rgba(23,27,44,0.76)", border: "2px solid #8fa2d0" }} />
        <L c="g02-hitside" l={28} t={14} w={28} h={24} d={140} st={{ background: "#fff4d6" }} />
        <L c="g02-hit2" l={56} t={54} w={26} h={18} d={260} st={{ background: "#8fa2d0" }} />
      </Cut>
    );
  }
  return null;
}

/* --- 19. Tower Toll (t6) — THE TOLL BAR LIFTS -------------------------------
   Aim-staged along the road. A rook block is pulled down and dropped into the
   toll box as the fee; the counterweighted bar swings up out of the way and
   the hours plate on the post advances a long way at once.
   Palette: #c8a05a / #fff3d4 / #2a1e0c. */
function TowerTollScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g02-tt-arm" l={6} t={40} w={84} h={8} d={40} st={{ borderRadius: "999px", background: "#c8a05a", transformOrigin: "6% 50%" }} />
        <V c="g02-tt-block" l={30} t={46} w={40} h={44} d={270}><path d={ROOK} fill="#fff3d4" /></V>
        <L c="g02-tt-plate" l={58} t={12} w={34} h={22} d={480} st={{ background: "#2a1e0c", border: "1px solid #fff3d4" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hit" l={8} t={42} w={80} h={7} d={0} st={{ borderRadius: "999px", background: "#c8a05a", transformOrigin: "6% 50%" }} />
        <V c="g02-hitside" l={32} t={48} w={36} h={42} d={140}><path d={ROOK} fill="#fff3d4" /></V>
        <L c="g02-hit2" l={60} t={14} w={30} h={20} d={260} st={{ background: "#2a1e0c", border: "1px solid #fff3d4" }} />
      </Cut>
    );
  }
  return null;
}

/* --- 20. Sleepwalkers (t6) — THE NIGHT WATCH WALKS ITS BEAT -----------------
   Aim-staged. The watchman's rattle spins once, the beat line is chalked
   down the road, and a row of sleepers shuffles along it in step, eyes shut,
   passing the watch bill from hand to hand without waking.
   Palette: #9aa8c8 / #fff4d6 / #141828. */
const SW_WALKERS = [0, 1, 2];

function SleepwalkersScene({ role, delayMs }: SceneProps) {
  const rattle = (
    <g {...SJ}>
      <rect x="7" y="3" width="10" height="9" rx="1" fill="#9aa8c8" stroke="#141828" strokeWidth="1.1" />
      <path d="M12 12v9" stroke="#141828" strokeWidth="2" />
    </g>
  );
  const sleeper = <path d="M12 4c2.4 0 3.6 1.8 3.6 4.2L15.2 21H8.8L8.4 8.2C8.4 5.8 9.6 4 12 4z" fill="#9aa8c8" stroke="#141828" strokeWidth="0.9" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g02-sw-rattle" l={12} t={10} w={40} h={44} d={40} st={{ transformOrigin: "50% 88%" }}>{rattle}</V>
        <L c="g02-sw-beat" l={6} t={62} w={88} h={2.6} d={270} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "0% 50%" }} />
        <V c="g02-sw-walker" l={48} t={30} w={36} h={50} d={480}>{sleeper}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g02-hit" l={14} t={12} w={38} h={42} d={0} st={{ transformOrigin: "50% 88%" }}>{rattle}</V>
        <L c="g02-hitside" l={8} t={64} w={84} h={2.4} d={140} st={{ borderRadius: "999px", background: "#fff4d6" }} />
        <V c="g02-hit2" l={50} t={32} w={34} h={48} d={260}>{sleeper}</V>
      </Cut>
    );
  }
  return (
    <AimLead
      d={delayMs}
      frame={
        <>
          <L c="g02-veil" st={{ background: "rgba(7,9,18,0.46)" }} />
          <Wash tone="rgba(154,168,200,0.24)" d={120} />
        </>
      }
    >
      <V c="g02-sw-rattle" l={41} t={38} w={9} h={11} d={90} st={{ transformOrigin: "50% 88%" }}>{rattle}</V>
      <L c="g02-runout" l={45} t={52} w={30} h={1.4} d={220} st={{ background: "linear-gradient(90deg, #fff4d6, rgba(154,168,200,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      {SW_WALKERS.map((i) => (
        <V key={i} c="g02-sw-walker" l={47 + i * 5} t={43} w={5} h={9} d={340 + i * 140}>{sleeper}</V>
      ))}
      <L c="g02-sw-bill" l={54} t={40} w={7} h={5} d={660} st={{ background: "#fff4d6", border: "1px solid #141828" }} />
      <L c="g02-leanshadow" l={45} t={54} w={20} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(20,24,40,0.66)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g02-glint" l={48 + i * 5} t={36} w={1.8} h={1.8} d={760 + i * 90} st={{ borderRadius: "50%", background: "#9aa8c8" }} />
      ))}
    </AimLead>
  );
}

/* =============================================================================
   TIER 5
   ========================================================================== */

/* --- 21. Gentlemen's Agreement (t5) — THE ENGAGEMENT DIARY ------------------
   One page, two hands. Both nibs sign the same entry, the silk ribbon marker
   is laid into the fold, and the blotter rocks once across the wet ink.
   Palette: #cfa9d8 / #fff4d6 / #251a2c. */
function GentlemensAgreementScene({ role, delayMs }: SceneProps) {
  const nib = <path d="M12 2l3.4 9L12 21 8.6 11z" fill="#fff4d6" stroke="#251a2c" strokeWidth="1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g02-ga-page" l={14} t={22} w={72} h={54} d={40} st={{ background: "#fff4d6", border: "1px solid #251a2c" }} />
        <V c="g02-ga-nib" l={16} t={10} w={30} h={44} d={260}>{nib}</V>
        <L c="g02-ga-ribbon" l={44} t={20} w={7} h={62} d={480} st={{ background: "#cfa9d8", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hitside" l={16} t={24} w={68} h={50} d={0} st={{ background: "#fff4d6", border: "1px solid #251a2c" }} />
        <V c="g02-hit" l={20} t={14} w={26} h={40} d={140}>{nib}</V>
        <L c="g02-hit2" l={46} t={22} w={6} h={54} d={260} st={{ background: "#cfa9d8" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(207,169,216,0.26)" />}>
      <L c="g02-ga-page" l={38} t={38} w={24} h={18} d={80} st={{ background: "#fff4d6", border: "1px solid #251a2c" }} />
      <V c="g02-ga-nib" l={39} t={33} w={7} h={10} d={230}>{nib}</V>
      <V c="g02-ga-nib" l={54} t={33} w={7} h={10} d={370}>{nib}</V>
      <L c="g02-ga-ribbon" l={49} t={36} w={2} h={22} d={540} st={{ background: "#cfa9d8", transformOrigin: "50% 0%" }} />
      <L c="g02-ga-blot" l={41} t={46} w={18} h={6} d={660} st={{ background: "rgba(37,26,44,0.8)", transformOrigin: "50% 100%" }} />
      <L c="g02-leanshadow" l={39} t={57} w={22} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(37,26,44,0.6)" }} />
      <L c="g02-glint" l={51} t={40} w={2.2} h={2.2} d={760} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 22. Harvest and Fallow (t5) — THE FIELD ROTA RAIL ----------------------
   Aim-staged along the strip. Two crop tokens are slid off the season rail
   and pocketed, and a hatched FALLOW shutter is drawn across the slot behind
   them so nothing is dealt from it next season.
   Palette: #c8c060 / #fff3d4 / #2b2a10. */
function HarvestAndFallowScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hf-rail" l={6} t={44} w={88} h={5} d={40} st={{ borderRadius: "999px", background: "#c8c060" }} />
        <L c="g02-hf-token" l={16} t={28} w={22} h={22} d={260} st={{ background: "#fff3d4", border: "1px solid #2b2a10" }} />
        <L c="g02-hf-shut" l={52} t={26} w={36} h={26} d={470} st={{ background: "rgba(43,42,16,0.85)", border: "1px solid #c8c060", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hit" l={8} t={46} w={84} h={4} d={0} st={{ borderRadius: "999px", background: "#c8c060" }} />
        <L c="g02-hitside" l={18} t={28} w={22} h={20} d={140} st={{ background: "#fff3d4" }} />
        <L c="g02-hit2" l={54} t={28} w={32} h={22} d={260} st={{ background: "rgba(43,42,16,0.82)", border: "1px solid #c8c060" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(200,192,96,0.26)" />}>
      <L c="g02-hf-rail" l={42} t={48} w={26} h={1.8} d={90} st={{ borderRadius: "999px", background: "#c8c060" }} />
      <L c="g02-hf-token" l={44} t={42} w={6} h={6} d={250} st={{ background: "#fff3d4", border: "1px solid #2b2a10" }} />
      <L c="g02-hf-token" l={51} t={42} w={6} h={6} d={370} st={{ background: "#fff3d4", border: "1px solid #2b2a10" }} />
      <L c="g02-hf-shut" l={58} t={42} w={9} h={7} d={540} st={{ background: "rgba(43,42,16,0.85)", border: "1px solid #c8c060", transformOrigin: "0% 50%" }} />
      <L c="g02-runout" l={45} t={53} w={26} h={1.4} d={620} st={{ background: "linear-gradient(90deg, #fff3d4, rgba(200,192,96,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g02-sift" l={46 + i * 6} t={51} w={1.4} h={1.4} d={700 + i * 100} st={{ borderRadius: "50%", background: "#c8c060" }} />
      ))}
    </AimLead>
  );
}

/* --- 23. Heavy Price (t5) — THE CHARGE SHEET RULED IN RED -------------------
   The straightedge is laid across the sheet, the ruling pen is charged, and
   one hard red line is drawn through the entry. The ink beads at the end of
   the stroke and bleeds into the paper.
   Palette: #d8605c / #fff3d4 / #2a1010. */
function HeavyPriceScene({ role, delayMs }: SceneProps) {
  const pen = (
    <g {...SJ}>
      <path d="M12 3l2.6 7L12 14l-2.6-4z" fill="#fff3d4" stroke="#2a1010" strokeWidth="1" />
      <path d="M12 14v7" stroke="#d8605c" strokeWidth="2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hp-sheet" l={12} t={22} w={76} h={54} d={40} st={{ background: "#fff3d4", border: "1px solid #2a1010" }} />
        <L c="g02-hp-straight" l={10} t={44} w={80} h={5} d={270} st={{ background: "#2a1010" }} />
        <V c="g02-hp-pen" l={22} t={34} w={30} h={44} d={480}>{pen}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hitside" l={14} t={24} w={72} h={50} d={0} st={{ background: "#fff3d4", border: "1px solid #2a1010" }} />
        <L c="g02-hit" l={16} t={46} w={68} h={4} d={140} st={{ borderRadius: "999px", background: "#d8605c" }} />
        <L c="g02-hit2" l={76} t={42} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#d8605c" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(216,96,92,0.26)" />
          <Rim tone="rgba(42,16,16,0.42)" />
        </>
      }
    >
      <L c="g02-hp-sheet" l={38} t={38} w={24} h={18} d={80} st={{ background: "#fff3d4", border: "1px solid #2a1010" }} />
      <L c="g02-hp-straight" l={37} t={44} w={26} h={1.6} d={220} st={{ background: "#2a1010" }} />
      <V c="g02-hp-pen" l={40} t={34} w={8} h={11} d={370}>{pen}</V>
      <L c="g02-hp-rule" l={39} t={46} w={22} h={1.4} d={520} st={{ borderRadius: "999px", background: "#d8605c", transformOrigin: "0% 50%" }} />
      <L c="g02-hp-bleed" l={59} t={44} w={5} h={5} d={660} st={{ borderRadius: "50%", background: "#d8605c" }} />
      <L c="g02-leanshadow" l={39} t={57} w={22} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(42,16,16,0.6)" }} />
      <L c="g02-glint" l={44} t={40} w={2} h={2} d={760} st={{ borderRadius: "50%", background: "#fff3d4" }} />
    </Lead>
  );
}

/* --- 24. King's Indulgence (t5) — THE TIME RECORDER LEVER -------------------
   The works recorder on the wall: the card goes into the throat, the long
   lever is hauled down against its spring, the head thumps the entry through,
   and the card is spat back out with the hour on it.
   Palette: #e0b45e / #fff4d6 / #2a2110. */
function KingsIndulgenceScene({ role, delayMs }: SceneProps) {
  const body = (
    <g {...SJ}>
      <rect x="3" y="4" width="18" height="14" rx="1" fill="#2a2110" stroke="#e0b45e" strokeWidth="1.2" />
      <path d="M7 18h10v2.4H7z" fill="#e0b45e" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g02-ent-rise" l={14} t={16} w={72} h={54} d={40}>{body}</V>
        <L c="g02-ki-lever" l={70} t={22} w={24} h={7} d={270} st={{ borderRadius: "999px", background: "#e0b45e", transformOrigin: "0% 50%" }} />
        <L c="g02-ki-eject" l={28} t={62} w={40} h={20} d={480} st={{ background: "#fff4d6", border: "1px solid #2a2110" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g02-hitside" l={16} t={16} w={68} h={52} d={0}>{body}</V>
        <L c="g02-hit" l={70} t={24} w={22} h={6} d={140} st={{ borderRadius: "999px", background: "#e0b45e", transformOrigin: "0% 50%" }} />
        <L c="g02-hit2" l={30} t={62} w={36} h={18} d={260} st={{ background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(224,180,94,0.26)" />}>
      <V c="g02-ki-body" l={40} t={36} w={20} h={16} d={80}>{body}</V>
      <L c="g02-ki-card" l={45} t={49} w={9} h={5} d={230} st={{ background: "#fff4d6", border: "1px solid #2a2110" }} />
      <L c="g02-ki-lever" l={58} t={39} w={9} h={2.2} d={370} st={{ borderRadius: "999px", background: "#e0b45e", transformOrigin: "0% 50%" }} />
      <L c="g02-ki-thump" l={42} t={40} w={16} h={8} d={540} st={{ background: "radial-gradient(circle, rgba(255,244,214,0.8), transparent 68%)" }} />
      <L c="g02-ki-eject" l={44} t={51} w={11} h={5} d={640} st={{ background: "#fff4d6", border: "1px solid #2a2110" }} />
      <L c="g02-leanshadow" l={41} t={57} w={18} h={3} d={690} st={{ borderRadius: "999px", background: "rgba(42,33,16,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g02-sift" l={44 + i * 6} t={54} w={1.4} h={1.4} d={740 + i * 90} st={{ borderRadius: "50%", background: "#e0b45e" }} />
      ))}
    </Lead>
  );
}

/* --- 25. Leave of Absence (t5) — THE GATE BOOK SIGNED OUT -------------------
   The porter's flap goes up, the leave pass is slid across the ledge and
   signed out of the gate book, and the barrier chain is unhooked from its
   eye and let fall.
   Palette: #8fc0a8 / #fff4d6 / #16281f. */
function LeaveOfAbsenceScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g02-la-flap" l={10} t={16} w={80} h={22} d={40} st={{ background: "#8fc0a8", border: "1px solid #16281f", transformOrigin: "50% 100%" }} />
        <L c="g02-la-book" l={16} t={44} w={50} h={34} d={270} st={{ background: "#fff4d6", border: "1px solid #16281f" }} />
        <L c="g02-la-pass" l={56} t={54} w={34} h={20} d={480} st={{ background: "#fff4d6", border: "1px solid #16281f" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hit" l={12} t={18} w={76} h={20} d={0} st={{ background: "#8fc0a8", transformOrigin: "50% 100%" }} />
        <L c="g02-hitside" l={18} t={46} w={46} h={30} d={140} st={{ background: "#fff4d6", border: "1px solid #16281f" }} />
        <L c="g02-hit2" l={58} t={54} w={30} h={18} d={260} st={{ background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(143,192,168,0.26)" />
          <Rim tone="rgba(255,244,214,0.24)" />
        </>
      }
    >
      <L c="g02-la-flap" l={38} t={34} w={24} h={7} d={90} st={{ background: "#8fc0a8", border: "1px solid #16281f", transformOrigin: "50% 100%" }} />
      <L c="g02-la-book" l={39} t={42} w={16} h={11} d={250} st={{ background: "#fff4d6", border: "1px solid #16281f" }} />
      <L c="g02-la-pass" l={51} t={44} w={9} h={5} d={410} st={{ background: "#fff4d6", border: "1px solid #16281f" }} />
      <L c="g02-la-sign" l={41} t={48} w={12} h={1.2} d={560} st={{ borderRadius: "999px", background: "#16281f", transformOrigin: "0% 50%" }} />
      <L c="g02-callin" l={44} t={52} w={14} h={2} d={660} st={{ borderRadius: "999px", background: "#8fc0a8" }} />
      <L c="g02-leanshadow" l={40} t={57} w={20} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(22,40,31,0.6)" }} />
      <L c="g02-glint" l={53} t={43} w={2} h={2} d={760} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 26. Open Season (t5) — THE HOURS SIGN FLIPS ----------------------------
   The hanging trade sign swings on its two chains, turns right over to its
   other face, and the hours plate under it lights up. Every capture flips it
   again for another turn.
   Palette: #f09a52 / #fff3d4 / #2c1808. */
function OpenSeasonScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g02-os-chain" l={30} t={6} w={2.6} h={22} d={40} st={{ borderRadius: "999px", background: "#f09a52" }} />
        <L c="g02-os-chain" l={68} t={6} w={2.6} h={22} d={140} st={{ borderRadius: "999px", background: "#f09a52" }} />
        <L c="g02-os-sign" l={18} t={26} w={64} h={36} d={300} st={{ background: "#2c1808", border: "2px solid #fff3d4" }} />
        <L c="g02-ent-pop" l={30} t={66} w={40} h={14} d={520} st={{ background: "#f09a52" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hit" l={32} t={8} w={4} h={20} d={0} st={{ borderRadius: "999px", background: "#f09a52" }} />
        <L c="g02-hitside" l={20} t={28} w={60} h={34} d={140} st={{ background: "#2c1808", border: "2px solid #fff3d4" }} />
        <L c="g02-hit2" l={32} t={66} w={36} h={12} d={260} st={{ background: "#f09a52" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(240,154,82,0.28)" />}>
      <L c="g02-os-bracket" l={40} t={31} w={20} h={1.8} d={70} st={{ borderRadius: "999px", background: "#2c1808" }} />
      <L c="g02-os-chain" l={43} t={32} w={1.2} h={6} d={170} st={{ borderRadius: "999px", background: "#f09a52" }} />
      <L c="g02-os-chain" l={56} t={32} w={1.2} h={6} d={250} st={{ borderRadius: "999px", background: "#f09a52" }} />
      <L c="g02-os-sign" l={40} t={38} w={20} h={11} d={420} st={{ background: "#2c1808", border: "1px solid #fff3d4" }} />
      <L c="g02-os-plate" l={43} t={50} w={14} h={4} d={620} st={{ background: "#f09a52", border: "1px solid #2c1808" }} />
      <L c="g02-shaft" l={45} t={22} w={10} h={20} d={680} st={{ background: "linear-gradient(180deg, rgba(255,243,212,0.62), transparent)", transformOrigin: "50% 0%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g02-glint" l={42 + i * 8} t={44} w={2} h={2} d={740 + i * 90} st={{ borderRadius: "50%", background: "#fff3d4" }} />
      ))}
    </Lead>
  );
}

/* --- 27. Retraining (t5) — THE TRADES BOARD RE-LETTERED ---------------------
   The works trades board: a name is lifted out of the knights' column, the
   letter tiles are pulled off their tracks and re-set, and the name is
   slotted back in under bishops where it now stands.
   Palette: #7fb0d8 / #fff4d6 / #142434. */
const RT_TILES = [0, 1, 2, 3];

function RetrainingScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g02-rt-board" l={10} t={20} w={80} h={52} d={40} st={{ background: "rgba(20,36,52,0.82)", border: "2px solid #7fb0d8" }} />
        <V c="g02-rt-slide" l={16} t={28} w={30} h={38} d={270}><path d={KNIGHT} fill="#fff4d6" /></V>
        <V c="g02-ent-pop" l={56} t={28} w={30} h={38} d={490}><path d={BISHOP} fill="#7fb0d8" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hit" l={12} t={22} w={76} h={48} d={0} st={{ background: "rgba(20,36,52,0.8)", border: "2px solid #7fb0d8" }} />
        <V c="g02-hitside" l={18} t={30} w={28} h={36} d={140}><path d={KNIGHT} fill="#fff4d6" /></V>
        <V c="g02-hit2" l={56} t={30} w={28} h={36} d={260}><path d={BISHOP} fill="#7fb0d8" /></V>
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <L c="g02-veil" st={{ background: "rgba(8,14,22,0.4)" }} />
          <Wash tone="rgba(127,176,216,0.26)" d={120} />
        </>
      }
    >
      <L c="g02-rt-board" l={37} t={37} w={26} h={17} d={80} st={{ background: "rgba(20,36,52,0.82)", border: "1px solid #7fb0d8" }} />
      {RT_TILES.map((i) => (
        <L key={i} c="g02-rt-tile" l={39 + i * 5.4} t={40} w={4.4} h={4.4} d={200 + i * 100} st={{ background: "#fff4d6", transformOrigin: "50% 50%" }} />
      ))}
      <V c="g02-rt-slide" l={40} t={45} w={8} h={9} d={560}><path d={KNIGHT} fill="#7fb0d8" stroke="#142434" strokeWidth="1" {...SJ} /></V>
      <V c="g02-callin" l={53} t={45} w={8} h={9} d={660}><path d={BISHOP} fill="#fff4d6" stroke="#142434" strokeWidth="1" {...SJ} /></V>
      <L c="g02-glint" l={51} t={42} w={2.4} h={2.4} d={740} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 28. Royal Household (t5) — THE ORDER OF THE DAY PINNED -----------------
   Green baize, five brass pins, and the household's printed order of the day
   pushed flat onto it. The queen's line is ticked five times over, once for
   each errand she is excused.
   Palette: #b8a45c / #fff4d6 / #1c2416. */
const RH_PINS: Array<[number, number]> = [[39, 38], [58, 38], [39, 53], [58, 53], [48.5, 45]];

function RoyalHouseholdScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g02-rh-baize" l={8} t={16} w={84} h={60} d={40} st={{ background: "rgba(28,36,22,0.85)", border: "2px solid #b8a45c" }} />
        <L c="g02-rh-order" l={22} t={24} w={56} h={44} d={270} st={{ background: "#fff4d6", border: "1px solid #1c2416" }} />
        <V c="g02-ent-pop" l={38} t={34} w={26} h={30} d={490}><path d={QUEEN} fill="#b8a45c" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hit" l={12} t={18} w={76} h={56} d={0} st={{ background: "rgba(28,36,22,0.82)", border: "2px solid #b8a45c" }} />
        <L c="g02-hitside" l={24} t={26} w={52} h={40} d={140} st={{ background: "#fff4d6" }} />
        <V c="g02-hit2" l={38} t={34} w={24} h={28} d={260}><path d={QUEEN} fill="#b8a45c" /></V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(184,164,92,0.26)" />}>
      <L c="g02-rh-baize" l={36} t={35} w={28} h={22} d={80} st={{ background: "rgba(28,36,22,0.85)", border: "1px solid #b8a45c" }} />
      <L c="g02-rh-order" l={38} t={37} w={24} h={18} d={220} st={{ background: "#fff4d6", border: "1px solid #1c2416" }} />
      {RH_PINS.map(([l, t], i) => (
        <L key={i} c="g02-rh-pin" l={l} t={t} w={2} h={2} d={340 + i * 90} st={{ borderRadius: "50%", background: "#b8a45c" }} />
      ))}
      <V c="g02-rh-queen" l={45} t={41} w={8} h={10} d={640}><path d={QUEEN} fill="#1c2416" stroke="#b8a45c" strokeWidth="1.2" {...SJ} /></V>
      <L c="g02-rh-tick" l={43} t={50} w={12} h={1.4} d={700} st={{ borderRadius: "999px", background: "#b8a45c", transformOrigin: "0% 50%" }} />
      <L c="g02-leanshadow" l={38} t={58} w={24} h={3} d={740} st={{ borderRadius: "999px", background: "rgba(28,36,22,0.6)" }} />
    </Lead>
  );
}

/* --- 29. Royal Writ (t5) — THE USHER'S STAFF STRUCK -------------------------
   The usher's staff comes down three times on the flagstones, the ring of it
   runs out across the floor, the day's list unfurls off the rail and the
   king's cause is called first and cannot be reached.
   Palette: #dcc06a / #fff4d6 / #241c0c. */
const RW_STRIKES = [0, 1, 2];

function RoyalWritScene({ role, delayMs }: SceneProps) {
  const staff = (
    <g {...SJ}>
      <path d="M12 21V6" stroke="#dcc06a" strokeWidth="2.4" />
      <circle cx="12" cy="4" r="2.6" fill="#fff4d6" stroke="#241c0c" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g02-rw-staff" l={20} t={6} w={30} h={70} d={40} st={{ transformOrigin: "50% 96%" }}>{staff}</V>
        <L c="g02-rw-ring" l={12} t={66} w={50} h={22} d={280} st={{ borderRadius: "50%", border: "2px solid #dcc06a" }} />
        <L c="g02-rw-list" l={50} t={18} w={38} h={54} d={490} st={{ background: "#fff4d6", border: "1px solid #241c0c", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g02-hitside" l={22} t={8} w={28} h={66} d={0} st={{ transformOrigin: "50% 96%" }}>{staff}</V>
        <L c="g02-hit" l={14} t={66} w={46} h={20} d={140} st={{ borderRadius: "50%", border: "2px solid #dcc06a" }} />
        <V c="g02-hit2" l={54} t={30} w={30} h={36} d={260}><path d={KING} fill="#fff4d6" /></V>
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(220,192,106,0.26)" />
          <Rim tone="rgba(255,244,214,0.28)" />
        </>
      }
    >
      {RW_STRIKES.map((i) => (
        <V key={i} c="g02-rw-staff" l={41} t={34} w={7} h={20} d={90 + i * 150} st={{ transformOrigin: "50% 96%" }}>{staff}</V>
      ))}
      <L c="g02-rw-ring" l={38} t={50} w={16} h={7} d={480} st={{ borderRadius: "50%", border: "2px solid #dcc06a" }} />
      <L c="g02-rw-list" l={52} t={37} w={10} h={16} d={600} st={{ background: "#fff4d6", border: "1px solid #241c0c", transformOrigin: "50% 0%" }} />
      <V c="g02-callin" l={53.5} t={42} w={7} h={9} d={700}><path d={KING} fill="#241c0c" stroke="#dcc06a" strokeWidth="1.2" {...SJ} /></V>
      <L c="g02-glint" l={44} t={36} w={2.4} h={2.4} d={760} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
}

/* --- 30. Salt in the Wound (t5) — THE COLUMN PASTED OVER --------------------
   The paste brush runs down the timetable column, a long blank strip is laid
   over eighteen entries and smoothed flat, and when it dries a fresh chit is
   torn off the perforated book at the bottom.
   Palette: #a0c8d8 / #fff3d4 / #142430. */
function SaltInTheWoundScene({ role, delayMs }: SceneProps) {
  const brush = (
    <g {...SJ}>
      <rect x="8" y="3" width="8" height="9" rx="1" fill="#a0c8d8" stroke="#142430" strokeWidth="1.1" />
      <path d="M8 12h8l-1.4 8H9.4z" fill="#fff3d4" stroke="#142430" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g02-si-column" l={26} t={12} w={30} h={70} d={40} st={{ background: "#fff3d4", border: "1px solid #142430" }} />
        <V c="g02-si-brush" l={50} t={10} w={34} h={48} d={270}>{brush}</V>
        <L c="g02-si-strip" l={28} t={20} w={26} h={58} d={490} st={{ background: "#a0c8d8", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hitside" l={28} t={14} w={28} h={66} d={0} st={{ background: "#fff3d4", border: "1px solid #142430" }} />
        <V c="g02-hit" l={52} t={12} w={32} h={44} d={140}>{brush}</V>
        <L c="g02-hit2" l={30} t={24} w={24} h={52} d={260} st={{ background: "#a0c8d8", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  return null;
}

/* --- 31. Scapegoat (t5) — THE NAME STRUCK OFF THE ROLL ----------------------
   Aim-staged: the struck name goes OUT along the play's own vector. The nib
   scratches the entry through, the brass name tag is unhooked and pitched
   away down the road, and the column closes up over the gap.
   Palette: #c8886a / #fff3d4 / #2a1810. */
function ScapegoatScene({ role, delayMs }: SceneProps) {
  const tag = (
    <g {...SJ}>
      <rect x="4" y="7" width="16" height="10" rx="1" fill="#c8886a" stroke="#2a1810" strokeWidth="1.1" />
      <circle cx="7.4" cy="12" r="1.4" fill="#fff3d4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g02-sc-roll" l={12} t={22} w={76} h={54} d={40} st={{ background: "#fff3d4", border: "1px solid #2a1810" }} />
        <L c="g02-sc-strike" l={16} t={44} w={68} h={3} d={270} st={{ borderRadius: "999px", background: "#2a1810", transformOrigin: "0% 50%" }} />
        <V c="g02-sc-tag" l={52} t={50} w={40} h={34} d={480}>{tag}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hitside" l={14} t={24} w={72} h={50} d={0} st={{ background: "#fff3d4", border: "1px solid #2a1810" }} />
        <L c="g02-hit" l={18} t={46} w={64} h={3} d={140} st={{ borderRadius: "999px", background: "#2a1810" }} />
        <V c="g02-hit2" l={54} t={52} w={36} h={30} d={260}>{tag}</V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(200,136,106,0.26)" />}>
      <L c="g02-sc-roll" l={38} t={38} w={22} h={18} d={90} st={{ background: "#fff3d4", border: "1px solid #2a1810" }} />
      <L c="g02-sc-nib" l={39} t={41} w={4} h={4} d={240} st={{ background: "#2a1810", transformOrigin: "50% 100%" }} />
      <L c="g02-sc-strike" l={39} t={44} w={20} h={1.4} d={400} st={{ borderRadius: "999px", background: "#2a1810", transformOrigin: "0% 50%" }} />
      <V c="g02-sc-tag" l={56} t={41} w={8} h={7} d={560}>{tag}</V>
      <L c="g02-runout" l={45} t={53} w={28} h={1.4} d={640} st={{ background: "linear-gradient(90deg, #c8886a, rgba(200,136,106,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <L c="g02-sc-close" l={39} t={47} w={20} h={4} d={700} st={{ background: "#fff3d4", transformOrigin: "50% 0%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g02-sift" l={48 + i * 6} t={48} w={1.4} h={1.4} d={760 + i * 90} st={{ borderRadius: "50%", background: "#c8886a" }} />
      ))}
    </AimLead>
  );
}

/* --- 32. Veteran's Pension (t5) — THE PAY WINDOW SHUTTER --------------------
   The wages window shutter is raised on its cords, the pension book is
   stamped through on the counter, and the packet is slid into the man's
   pigeonhole where it will sit until his ten turns come round.
   Palette: #b6a0d0 / #fff4d6 / #1e1830. */
function VeteransPensionScene({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g02-vp-shutter" l={10} t={10} w={80} h={30} d={40} st={{ background: "#b6a0d0", border: "1px solid #1e1830", transformOrigin: "50% 0%" }} />
        <L c="g02-vp-book" l={22} t={48} w={44} h={30} d={270} st={{ background: "#fff4d6", border: "1px solid #1e1830" }} />
        <L c="g02-vp-packet" l={58} t={54} w={30} h={22} d={490} st={{ background: "#fff4d6", border: "1px solid #1e1830" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g02-hit" l={12} t={12} w={76} h={26} d={0} st={{ background: "#b6a0d0", transformOrigin: "50% 0%" }} />
        <L c="g02-hitside" l={24} t={48} w={40} h={28} d={140} st={{ background: "#fff4d6", border: "1px solid #1e1830" }} />
        <L c="g02-hit2" l={60} t={54} w={28} h={20} d={260} st={{ background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(182,160,208,0.26)" />
          <Rim tone="rgba(255,244,214,0.24)" />
        </>
      }
    >
      <L c="g02-vp-shutter" l={38} t={32} w={24} h={9} d={80} st={{ background: "#b6a0d0", border: "1px solid #1e1830", transformOrigin: "50% 0%" }} />
      <L c="g02-vp-counter" l={37} t={47} w={26} h={2} d={230} st={{ borderRadius: "999px", background: "#1e1830" }} />
      <L c="g02-vp-book" l={40} t={41} w={12} h={7} d={370} st={{ background: "#fff4d6", border: "1px solid #1e1830" }} />
      <L c="g02-vp-stamp" l={42} t={38} w={7} h={7} d={520} st={{ background: "#1e1830", transformOrigin: "50% 100%" }} />
      <L c="g02-vp-packet" l={53} t={43} w={8} h={5} d={660} st={{ background: "#fff4d6", border: "1px solid #1e1830" }} />
      <L c="g02-leanshadow" l={40} t={56} w={20} h={3} d={710} st={{ borderRadius: "999px", background: "rgba(30,24,48,0.62)" }} />
      <L c="g02-glint" l={55} t={41} w={2.2} h={2.2} d={770} st={{ borderRadius: "50%", background: "#fff4d6" }} />
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

/* =============================================================================
   FLAGSHIP IMPACT WAVE - the module-wide moment of real contact.

   Every lead now lands one physical hit from the shared impact vocabulary
   (impact/impact.tsx), layered OVER the card's own scene: the roster itself turns violent: duty plates are stamped down hard enough to split, edicts drop as light columns, and every appointment lands with a floor-shock.
   Per card, the IMPACT spec picks the primitive combo, the glyph that is split
   in half, the tint (the card's own core color as an r-g-b triple) and the
   beat, which is synced to that scene's OWN strike rhythm, so no two siblings
   land the same hit. The quake wrapper jolts the whole scene stage on the same
   beat (in-scene only: the real board crop never shakes). Animations-off
   coverage for all of these nodes is at the bottom of g02SchedulePlays.css.
   ========================================================================== */

interface G02Imp {
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

/** The module's shatter victims: a duty plate, a shift bell, a warden's key. Tinted per card via --imp-rgb. */
const IMP_GLYPHS: ReactNode[] = [
  <svg key="a" viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
    <rect x="4" y="5.4" width="16" height="13.2" rx="1.6" fill={IMP_TINT} /><path d="M7 9.4h10M7 12.4h10M7 15.4h6" stroke={IMP_EDGE} strokeWidth="1.5" strokeLinecap="round" />
  </svg>,
  <svg key="b" viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
    <path d="M6.4 16.4c0-6 1.6-9 5.6-9s5.6 3 5.6 9z" fill={IMP_TINT} /><path d="M4.8 16.4h14.4v2.2H4.8z" fill={IMP_TINT} /><path d="M12 4.6v2.8" stroke={IMP_EDGE} strokeWidth="1.6" strokeLinecap="round" />
  </svg>,
  <svg key="c" viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
    <circle cx="8" cy="8" r="4.2" fill="none" stroke={IMP_TINT} strokeWidth="2.6" /><path d="M11 11l7.4 7.4M15.6 15.6l2.4-2.4M17.8 17.8l2-2" stroke={IMP_TINT} strokeWidth="2.6" strokeLinecap="round" /><circle cx="8" cy="8" r="1.4" fill={IMP_EDGE} />
  </svg>,
];

const IMPACT: Record<string, G02Imp> = {
  bn4_uphill_battle: { at: 420, rgb: "232 201 135", shock: true, g: 0, q: "s" },
  hx4_iron_portcullis: { at: 530, rgb: "184 178 162", shock: true, g: 1, q: "h" },
  bn4_guards_change: { at: 500, rgb: "143 184 154", shock: true, g: 0, q: "s" },
  bn4_masons_lodge: { at: 510, rgb: "203 184 148", laser: true, g: 2, q: "s" },
  bn4_out_on_bail: { at: 520, rgb: "168 179 200", shock: true, g: 0, q: "s" },
  hx4_sleepwalkers: { at: 630, rgb: "154 168 200", laser: true, shock: true, q: "s" },
  bn4_gentlemens_agreement: { at: 440, rgb: "207 169 216", shock: true, g: 1, q: "h" },
  bn4_harvest_and_fallow: { at: 555, rgb: "200 192 96", shock: true, q: "s" },
  bn4_heavy_price: { at: 595, rgb: "216 96 92", laser: true, g: 2, q: "s" },
  bn4_kings_indulgence: { at: 660, rgb: "224 180 94", shock: true, g: 2, q: "s" },
  bn4_leave_of_absence: { at: 705, rgb: "143 192 168", shock: true, g: 0, q: "s" },
  bn4_open_season: { at: 600, rgb: "240 154 82", laser: true, shock: true, q: "s" },
  bn4_retraining: { at: 615, rgb: "127 176 216", shock: true, g: 1, q: "h" },
  bn4_royal_household: { at: 540, rgb: "184 164 92", shock: true, q: "s" },
  bn4_royal_writ: { at: 655, rgb: "220 192 106", laser: true, g: 2, q: "s" },
  bn4_scapegoat: { at: 645, rgb: "200 136 106", shock: true, g: 0, q: "s" },
  bn4_veterans_pension: { at: 545, rgb: "182 160 208", laser: true, shock: true, q: "s" },
};

/** The impact composite: laser column, glyph split in half, ground ring. */
function ImpactRig({ imp, delayMs }: { imp: G02Imp; delayMs: number }) {
  const s = imp.s ?? 9;
  return (
    <BoardWideStage>
      <span
        className="g02-imprig absolute block"
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
function withImpact(Base: SigPlugin["Render"], imp: G02Imp): SigPlugin["Render"] {
  function ImpactLead(props: { lead: boolean; role: SigRole; delayMs: number }) {
    if (props.role !== "lead") return <Base {...props} />;
    const scene = <Base {...props} />;
    return (
      <>
        {imp.q ? (
          <span
            className={`g02-quake-${imp.q} pointer-events-none absolute inset-0 z-30 block`}
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

/* =============================================================================
   PER-CARD RULE SCENES (slice TC-g). The cards below lead with a scene of their
   own rule on the real board (the squares, pieces and turn counts it touches)
   instead of the module's prop and the shared impact hit; the old art survives
   only as the small target and entrance cuts. Positions are board percentages
   from the caster's side: rank 0 is the caster's back rank, 7 the opponent's.
   ========================================================================== */

/** Chessman silhouettes on a 10 x 10 box, for the pieces a rule names. */
const MEN = {
  p: "M5 1.2 C6.2 1.2 7 2 7 3 C7 3.7 6.6 4.3 6 4.6 L7 8 H3 L4 4.6 C3.4 4.3 3 3.7 3 3 C3 2 3.8 1.2 5 1.2 Z M2.4 8.6 H7.6 V9.6 H2.4 Z",
  r: "M2.6 1.4 H3.8 V2.6 H4.6 V1.4 H5.4 V2.6 H6.2 V1.4 H7.4 V3.8 H6.8 L7.2 7.6 H2.8 L3.2 3.8 H2.6 Z M2.2 8.4 H7.8 V9.6 H2.2 Z",
  n: "M2.8 8.2 C2.8 5.4 3.8 4 5.4 3.2 L5 1.6 L6.4 2.6 L7.2 2.4 C7.9 3 8.1 4 7.7 4.9 L6.6 4.6 L6.2 4 C6.5 5.6 6.4 7 7 8.2 Z M2.4 8.8 H7.6 V9.8 H2.4 Z",
  b: "M5 1 C6.4 2 7 3.4 7 4.6 C7 5.8 6.2 6.6 5 6.6 C3.8 6.6 3 5.8 3 4.6 C3 3.4 3.6 2 5 1 Z M3.4 7.2 H6.6 L7.2 8.2 H2.8 Z M2.2 8.8 H7.8 V9.8 H2.2 Z",
  q: "M2.4 3.2 L3.4 5 L4.2 2.6 L5 4.6 L5.8 2.6 L6.6 5 L7.6 3.2 L7 7.4 H3 Z M2.6 8 H7.4 V9.2 H2.6 Z",
  k: "M4.6 1 H5.4 V2 H6.4 V2.8 H5.4 V3.8 H4.6 V2.8 H3.6 V2 H4.6 Z M3.4 4.4 H6.6 L7.2 8 H2.8 Z M2.4 8.6 H7.6 V9.8 H2.4 Z",
} as const;

function Man({ kind, fill, stroke }: { kind: keyof typeof MEN; fill: string; stroke: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d={MEN[kind]} fill={fill} stroke={stroke} strokeWidth="0.45" {...SJ} />
    </svg>
  );
}

/** The board-true layer: 0..100% is exactly the board. */
function Brd({ children }: { children: ReactNode }) {
  return (
    <BoardWideStage>
      <BoardFrame>
        <span className="g02-rs absolute inset-0 block">{children}</span>
      </BoardFrame>
    </BoardWideStage>
  );
}

/** Centre of rank `r` from the caster's back rank (0) to the opponent's (7). */
function rk(r: number): string {
  return `calc(50% + var(--fx-side, 1) * ${(3.5 - r) * 12.5}%)`;
}

/** Centre of screen column `c` (0 is the left edge). */
function cl(c: number): string {
  return `${(c + 0.5) * 12.5}%`;
}

/** The king and queen files (e and d) seen from the caster's side. */
const KING_X = "calc(50% + var(--fx-side, 1) * 6.25%)";
const QUEEN_X = "calc(50% - var(--fx-side, 1) * 6.25%)";

/** A prop centred on (x, y), `w` x `h` in board percent, from `delayMs`. */
function Q({ x, y, w, h, cls, delayMs, v, style, children }: { x: string; y: string; w: number; h: number; cls: string; delayMs: number; v?: Record<string, string>; style?: CSSProperties; children?: ReactNode }) {
  return (
    <span
      className={`${cls} absolute block`}
      style={{ left: `calc(${x} - ${w / 2}%)`, top: `calc(${y} - ${h / 2}%)`, width: `${w}%`, height: `${h}%`, animationDelay: `${delayMs}ms`, ...style, ...v } as CSSProperties}
    >
      {children}
    </span>
  );
}

/** A ray drawn out of (x, y) at `angle` (rotation is static; the draw is scaleX). */
function Ray({ x, y, len, angle, color, delayMs, gd = "1.2s" }: { x: string; y: string; len: number; angle: string; color: string; delayMs: number; gd?: string }) {
  return (
    <span
      className="g02-r-draw absolute block"
      style={{ left: x, top: `calc(${y} - 0.45%)`, width: `${len}%`, height: "0.9%", rotate: angle, transformOrigin: "0% 50%", background: `repeating-linear-gradient(90deg, ${color} 0 6px, transparent 6px 10px)`, animationDelay: `${delayMs}ms`, "--gd": gd } as CSSProperties}
    />
  );
}

/** `n` turn pips across rank `r`, from `x0`% to `x1`%: one per turn the rule counts. */
function Pips({ n, r, x0, x1, color, delayMs, gd = "1.3s" }: { n: number; r: number; x0: number; x1: number; color: string; delayMs: number; gd?: string }) {
  const step = n > 1 ? (x1 - x0) / (n - 1) : 0;
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <Q key={i} x={`${x0 + i * step}%`} y={rk(r)} w={1.8} h={3.2} cls="g02-r-pip" delayMs={delayMs + i * 70} v={{ "--gd": gd }} style={{ background: color, borderRadius: "1px" }} />
      ))}
    </>
  );
}

/** A square (or a run of squares) tinted for the length of a beat: the
 *  squares the rule itself touches. */
function Tint({ x, y, w = 12.5, h = 12.5, color, delayMs, gd = "1.6s", cls = "g02-r-in" }: { x: string; y: string; w?: number; h?: number; color: string; delayMs: number; gd?: string; cls?: string }) {
  return <Q x={x} y={y} w={w} h={h} cls={cls} delayMs={delayMs} v={{ "--gd": gd, "--s0": "1" }} style={{ background: color }} />;
}

/** One file (12.5% of the board) in a prop's own width units. */
const fileIn = (w: number): number => Math.round((12.5 / w) * 100);

/** Centre of file `c` counted from the caster's left (0) as the caster sees it. */
function fc(c: number): string {
  return `calc(50% + var(--fx-side, 1) * ${(c - 3.5) * 12.5}%)`;
}

/** A dotted thread from square (c0, r0) to (c1, r1), drawn from its first end.
 *  The angle turns half a circle with the side so the thread still starts at
 *  (c0, r0) when the caster sits at the top. */
function Thread({ c0, r0, c1, r1, color, delayMs, gd = "1.6s" }: { c0: number; r0: number; c1: number; r1: number; color: string; delayMs: number; gd?: string }) {
  const dx = (c1 - c0) * 12.5;
  const dy = -(r1 - r0) * 12.5;
  const len = Math.hypot(dx, dy);
  const deg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
  return <Ray x={fc(c0)} y={rk(r0)} len={len} angle={`calc(${deg}deg + (1 - var(--fx-side, 1)) * 90deg)`} color={color} delayMs={delayMs} gd={gd} />;
}

/** Half a turn when the caster sits at the top, so a pointed prop still points
 *  the way the rule sends it. */
const FLIP = "calc((1 - var(--fx-side, 1)) * 90deg)";

type Pal = { core: string; glow: string; deep: string };

/** The nerf itself: an iron cuff on the caster's side that springs open when
 *  the card suspends it. The lid swings about its hinge on the left. */
function NerfCuff({ x, y, c, delayMs, gd = "1.6s" }: { x: string; y: string; c: Pal; delayMs: number; gd?: string }) {
  return (
    <>
      <Q x={x} y={y} w={9} h={9} cls="g02-r-in" delayMs={delayMs} v={{ "--gd": gd, "--s0": "0.8" }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <path d="M4 11a6 6 0 0 0 12 0" fill="none" stroke={c.deep} strokeWidth="4.4" {...SJ} />
          <path d="M4 11a6 6 0 0 0 12 0" fill="none" stroke={c.core} strokeWidth="2.2" {...SJ} />
          <path d="M10 17v2.4" stroke={c.core} strokeWidth="1.6" {...SJ} />
        </svg>
      </Q>
      <Q x={x} y={y} w={9} h={9} cls="g02-r-open" delayMs={delayMs} v={{ "--gd": gd, "--ra": "-70deg" }} style={{ transformOrigin: "20% 55%" }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <path d="M4 11a6 6 0 0 1 12 0" fill="none" stroke={c.deep} strokeWidth="4.4" {...SJ} />
          <path d="M4 11a6 6 0 0 1 12 0" fill="none" stroke={c.core} strokeWidth="2.2" {...SJ} />
          <circle cx="16" cy="11" r="1.4" fill={c.glow} />
        </svg>
      </Q>
    </>
  );
}

/** `n` tally ticks across rank `r`, from `x0`% to `x1`%: one per turn the rule
 *  counts. The run takes about 420ms whatever `n` is. */
function Tally({ n, r, x0, x1, color, delayMs, gd = "1.3s", cls = "g02-r-pip" }: { n: number; r: number; x0: number; x1: number; color: string; delayMs: number; gd?: string; cls?: string }) {
  const step = n > 1 ? (x1 - x0) / (n - 1) : 0;
  const w = Math.min(2.2, Math.max(0.7, step * 0.45));
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <Q key={i} x={`${x0 + i * step}%`} y={rk(r)} w={w} h={3.4} cls={cls} delayMs={delayMs + Math.round((i * 420) / Math.max(1, n - 1))} v={{ "--gd": gd }} style={{ background: color, borderRadius: "1px" }} />
      ))}
    </>
  );
}

/** A draft card: face down, or face up with a tier mark. */
function DraftCard({ c, tier }: { c: Pal; tier?: string }) {
  return (
    <svg viewBox="0 0 14 20" className="block h-full w-full" aria-hidden="true">
      <rect x="1" y="1" width="12" height="18" rx="2" fill={tier ? c.core : c.glow} stroke={c.deep} strokeWidth="1.4" />
      {tier ? (
        <text x="7" y="12.6" textAnchor="middle" fontSize="6" fontWeight="700" fill={c.deep}>{tier}</text>
      ) : (
        <path d="M4 7l3-3 3 3-3 3z" fill={c.core} />
      )}
    </svg>
  );
}

/* --- bn4_salt_in_the_wound ---------------------------------------------------------
   "Suspend your nerf for your next 12 turns. When it returns, take 20 seconds
   from your opponent's clock." The cuff on the caster's edge springs open and
   twelve ticks run along the caster's rank; at the end of the run the cuff
   shuts again and, at that moment, a salt cellar tips over the opponent's
   clock at their edge: a third of its dial (twenty seconds of the minute) is
   cut out and falls away as grains spill onto it. */
const C_SIW = { core: "#a0c8d8", glow: "#fff3d4", deep: "#142430" };

function SaltInTheWoundRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <SaltInTheWoundScene lead={lead} role={role} delayMs={delayMs} />;
  const c = C_SIW;
  const d = delayMs;
  return (
    <Brd>
      <NerfCuff x="8%" y={rk(1.3)} c={c} delayMs={d + 60} gd="1.3s" />
      <Tally n={12} r={1.3} x0={17} x1={90} color={c.glow} delayMs={d + 280} gd="1.9s" />
      <Q x="8%" y={rk(1.3)} w={9} h={9} cls="g02-r-stamp" delayMs={d + 1100} v={{ "--gd": "1.1s" }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <circle cx="10" cy="11" r="6" fill="none" stroke={c.deep} strokeWidth="4.4" />
          <circle cx="10" cy="11" r="6" fill="none" stroke={c.core} strokeWidth="2.2" />
        </svg>
      </Q>
      <Q x="78%" y={rk(4.9)} w={16} h={16} cls="g02-r-in" delayMs={d + 700} v={{ "--gd": "1.6s" }}>
        <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill={c.glow} stroke={c.deep} strokeWidth="1.6" />
          <path d="M12 12V4.4" stroke={c.deep} strokeWidth="1.6" {...SJ} />
          <path d="M12 2.6v1.6M21.4 12h-1.6M12 21.4v-1.6M2.6 12h1.6" stroke={c.deep} strokeWidth="1.2" {...SJ} />
        </svg>
      </Q>
      <Q x="78%" y={rk(4.9)} w={16} h={16} cls="g02-r-part" delayMs={d + 1320} v={{ "--gd": "0.8s", "--tx1": "calc(var(--fx-side, 1) * 30%)", "--ty1": "calc(var(--fx-side, 1) * -50%)", "--r1": "40deg" }}>
        <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
          <path d="M12 12V2A10 10 0 0 1 20.66 7z" fill={c.core} stroke={c.deep} strokeWidth="1.2" {...SJ} />
        </svg>
      </Q>
      <Q x="86%" y={rk(6.1)} w={7} h={9} cls="g02-r-in" delayMs={d + 1000} v={{ "--gd": "1.1s", "--r0": "0deg" }} style={{ rotate: "150deg" }}>
        <svg viewBox="0 0 14 20" className="block h-full w-full" aria-hidden="true">
          <path d="M3 7q0-4 4-4t4 4v10H3z" fill={c.glow} stroke={c.deep} strokeWidth="1.2" {...SJ} />
          <circle cx="5.6" cy="5" r="0.7" fill={c.deep} /><circle cx="8.4" cy="5" r="0.7" fill={c.deep} /><circle cx="7" cy="3.8" r="0.7" fill={c.deep} />
        </svg>
      </Q>
      {[0, 1, 2, 3, 4].map((i) => (
        <Q key={i} x={`${80 + i * 1.6}%`} y={rk(5.7)} w={0.9} h={0.9} cls="g02-r-go" delayMs={d + 1180 + i * 40} v={{ "--gd": "0.7s", "--tx0": "0%", "--ty0": "0%", "--tx1": `${(i - 2) * 60}%`, "--ty1": "calc(var(--fx-side, 1) * 500%)" }} style={{ background: c.glow, borderRadius: "1px" }} />
      ))}
      <Q x="78%" y={rk(3.6)} w={10} h={4.4} cls="g02-r-stamp" delayMs={d + 1380} v={{ "--gd": "0.9s" }}>
        <svg viewBox="0 0 30 12" className="block h-full w-full" aria-hidden="true">
          <text x="15" y="9.4" textAnchor="middle" fontSize="9" fontWeight="700" fill={c.glow} stroke={c.deep} strokeWidth="0.4">-20s</text>
        </svg>
      </Q>
    </Brd>
  );
}

/* --- bn4_wardens_retirement --------------------------------------------------------
   "Suspend your nerf for your next 4 turns. For your opponent's next 4 turns,
   every capture you make suspends it for 2 more of your turns; this clause
   ends after two such captures." The warden's key ring is hung up on its peg
   at the caster's edge, the cuff springs open and four ticks are struck; then
   a knight takes on e5 and two more ticks are added, a bishop takes on f7 and
   two more again; after the second capture the clause is shut with a bar. */
const C_WRR = { core: "#9fbfd8", glow: "#fff4d6", deep: "#16202c" };

function WardensRetirementRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <WardensRetirementScene lead={lead} role={role} delayMs={delayMs} />;
  const c = C_WRR;
  const d = delayMs;
  return (
    <Brd>
      <Q x="88%" y={rk(0.9)} w={3} h={8} cls="g02-r-up" delayMs={d + 20} v={{ "--gd": "2.2s" }} style={{ background: c.deep, borderRadius: "1px" }} />
      <Q x="88%" y={rk(1.2)} w={9} h={9} cls="g02-r-go" delayMs={d + 80} v={{ "--gd": "2.1s", "--tx0": "-160%", "--ty0": "calc(var(--fx-side, 1) * -120%)", "--tx1": "0%", "--ty1": "0%" }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <circle cx="10" cy="7" r="4.4" fill="none" stroke={c.core} strokeWidth="1.8" />
          <path d="M8 11v7M8 15h2.6M8 17.4h2" stroke={c.glow} strokeWidth="1.4" {...SJ} />
          <path d="M12.4 10.4v6M12.4 14.4h2" stroke={c.core} strokeWidth="1.4" {...SJ} />
        </svg>
      </Q>
      <NerfCuff x="8%" y={rk(1.2)} c={c} delayMs={d + 240} gd="2.1s" />
      <Pips n={4} r={1.2} x0={16} x1={28} color={c.glow} delayMs={d + 420} gd="2s" />
      <Q x={fc(4)} y={rk(4)} w={11} h={11} cls="g02-r-part" delayMs={d + 760} v={{ "--gd": "0.7s", "--tx1": "40%", "--ty1": "calc(var(--fx-side, 1) * -60%)", "--r1": "35deg" }}>
        <Man kind="p" fill={c.deep} stroke={c.core} />
      </Q>
      <Q x={fc(4)} y={rk(4)} w={11} h={11} cls="g02-r-go" delayMs={d + 560} v={{ "--gd": "1.3s", "--tx0": "calc(var(--fx-side, 1) * 100%)", "--ty0": "calc(var(--fx-side, 1) * 200%)", "--tx1": "0%", "--ty1": "0%" }}>
        <Man kind="n" fill={c.glow} stroke={c.deep} />
      </Q>
      <Pips n={2} r={1.2} x0={33} x1={37} color={c.core} delayMs={d + 860} gd="1.5s" />
      <Q x={fc(5)} y={rk(6)} w={11} h={11} cls="g02-r-go" delayMs={d + 900} v={{ "--gd": "1.1s", "--tx0": "calc(var(--fx-side, 1) * -300%)", "--ty0": "calc(var(--fx-side, 1) * 300%)", "--tx1": "0%", "--ty1": "0%" }}>
        <Man kind="b" fill={c.glow} stroke={c.deep} />
      </Q>
      <Pips n={2} r={1.2} x0={42} x1={46} color={c.core} delayMs={d + 1260} gd="1.2s" />
      <Q x="50%" y={rk(1.2)} w={1.4} h={7} cls="g02-r-stamp" delayMs={d + 1440} v={{ "--gd": "1s" }} style={{ background: c.deep, border: `1px solid ${c.glow}` }} />
      <Q x="30%" y={rk(2)} w={32} h={2} cls="g02-r-lean" delayMs={d + 1600} v={{ "--gd": "0.8s" }} style={{ borderRadius: "999px", background: "rgba(159,191,216,0.5)" }} />
    </Brd>
  );
}

/* --- ov_patient_grift --------------------------------------------------------------
   "Fold twice to win the pot: your next 2 drafts are skipped, and the draft
   after them is dealt from tier 8." Three draft hands are dealt face down at
   the caster's edge; the first two are folded (turned over, pushed in and
   dimmed); the pot of chips in the middle slides to the third hand, which
   turns up marked VIII. */
const C_PGR = { core: "#f0d38a", glow: "#fff4d6", deep: "#221c10" };

function PatientGriftRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <PatientGriftScene lead={lead} role={role} delayMs={delayMs} />;
  const c = C_PGR;
  const d = delayMs;
  const xs = [28, 50, 72];
  return (
    <Brd>
      <Tint x="50%" y={rk(1.4)} w={76} h={22} color="rgba(34,28,16,0.5)" delayMs={d + 20} gd="2.3s" />
      {xs.slice(0, 2).map((x, i) => (
        <Q key={i} x={`${x}%`} y={rk(1.4)} w={10} h={14} cls="g02-r-dim" delayMs={d + 80 + i * 90} v={{ "--gd": "1.9s" }}>
          <DraftCard c={c} />
        </Q>
      ))}
      {xs.slice(0, 2).map((x, i) => (
        <Q key={i} x={`${x}%`} y={rk(1.4)} w={9} h={9} cls="g02-r-stamp" delayMs={d + 420 + i * 180} v={{ "--gd": "1.5s" }}>
          <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
            <path d="M4 4l12 12M16 4L4 16" stroke={c.deep} strokeWidth="3.6" {...SJ} />
            <path d="M4 4l12 12M16 4L4 16" stroke={c.core} strokeWidth="1.6" {...SJ} />
          </svg>
        </Q>
      ))}
      <Q x={`${xs[2]}%`} y={rk(1.4)} w={10} h={14} cls="g02-r-in" delayMs={d + 140} v={{ "--gd": "0.9s" }}>
        <DraftCard c={c} />
      </Q>
      {[0, 1, 2, 3].map((i) => (
        <Q key={i} x={`${47 + (i % 2) * 5}%`} y={`calc(${rk(3.4)} - ${i * 1.2}%)`} w={5} h={3} cls="g02-r-go" delayMs={d + 760 + i * 50} v={{ "--gd": "1.3s", "--tx0": "0%", "--ty0": "0%", "--tx1": "440%", "--ty1": "calc(var(--fx-side, 1) * 480%)" }}>
          <svg viewBox="0 0 20 12" className="block h-full w-full" aria-hidden="true">
            <ellipse cx="10" cy="6" rx="9" ry="4.6" fill={c.core} stroke={c.deep} strokeWidth="1.2" />
            <ellipse cx="10" cy="6" rx="4.4" ry="2.2" fill="none" stroke={c.glow} strokeWidth="1" strokeDasharray="1.6 1.2" />
          </svg>
        </Q>
      ))}
      <Q x={`${xs[2]}%`} y={rk(1.4)} w={10} h={14} cls="g02-r-stamp" delayMs={d + 1080} v={{ "--gd": "1.2s" }}>
        <DraftCard c={c} tier="VIII" />
      </Q>
      <Q x={`${xs[2]}%`} y={rk(2.6)} w={16} h={2} cls="g02-r-lean" delayMs={d + 1500} v={{ "--gd": "0.8s" }} style={{ borderRadius: "999px", background: "rgba(240,211,138,0.55)" }} />
    </Brd>
  );
}

/** A die: a draft reroll. */
function Die({ c }: { c: Pal }) {
  return (
    <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
      <rect x="3" y="3" width="14" height="14" rx="2" fill={c.glow} stroke={c.deep} strokeWidth="1.6" />
      <circle cx="7" cy="7" r="1.5" fill={c.deep} /><circle cx="13" cy="13" r="1.5" fill={c.deep} /><circle cx="10" cy="10" r="1.5" fill={c.deep} />
    </svg>
  );
}

/** The king step a rule allows on its last turn: a crowned square with the
 *  eight squares round it, the only reach left. */
function StepMark({ c }: { c: Pal }) {
  return (
    <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" fill="none" stroke={c.glow} strokeWidth="1.2" strokeDasharray="2 1.4" />
      <path d="M8.4 1v22M15.6 1v22M1 8.4h22M1 15.6h22" stroke={c.core} strokeWidth="0.6" />
      <rect x="8.4" y="8.4" width="7.2" height="7.2" fill={c.core} stroke={c.deep} strokeWidth="0.8" />
      <path d="M12 9.6v4.8M10 11.2h4" stroke={c.deep} strokeWidth="1.2" {...SJ} />
    </svg>
  );
}

/** A face-up draft card the caster is allowed to see (an eye on its face). */
function SeenCard({ c }: { c: Pal }) {
  return (
    <svg viewBox="0 0 14 20" className="block h-full w-full" aria-hidden="true">
      <rect x="1" y="1" width="12" height="18" rx="2" fill={c.glow} stroke={c.deep} strokeWidth="1.4" />
      <path d="M2.6 10q4.4-5 8.8 0-4.4 5-8.8 0z" fill="none" stroke={c.deep} strokeWidth="1" {...SJ} />
      <circle cx="7" cy="10" r="1.6" fill={c.core} />
    </svg>
  );
}

/** A crossed-out mark: a draft skipped, a move barred. */
function Cross({ c }: { c: Pal }) {
  return (
    <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
      <path d="M4 4l12 12M16 4L4 16" stroke={c.deep} strokeWidth="3.6" {...SJ} />
      <path d="M4 4l12 12M16 4L4 16" stroke={c.core} strokeWidth="1.6" {...SJ} />
    </svg>
  );
}

/** The rule band: the rank the cuff and its ticks sit on. */
const BAND = 2.3;

/* --- bn4_diplomatic_pouch ----------------------------------------------------------
   "Suspend your nerf for your next 5 turns, and see the cards in your
   opponent's next draft offer." A sealed diplomatic pouch is carried across
   from the opponent's side and set down in the middle; its flap lifts and
   their next two draft cards slide out face up for the caster to read; the
   cuff springs open and five ticks are struck. */
const C_DPR = { core: "#c4986a", glow: "#fff4d6", deep: "#2b1f12" };

function DiplomaticPouchRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <DiplomaticPouchScene lead={lead} role={role} delayMs={delayMs} />;
  const c = C_DPR;
  const d = delayMs;
  return (
    <Brd>
      <Q x="50%" y={rk(3.8)} w={14} h={11} cls="g02-r-go" delayMs={d + 30} v={{ "--gd": "2.1s", "--tx0": "0%", "--ty0": "calc(var(--fx-side, 1) * -160%)", "--tx1": "0%", "--ty1": "0%" }}>
        <svg viewBox="0 0 28 22" className="block h-full w-full" aria-hidden="true">
          <rect x="2" y="6" width="24" height="15" rx="2" fill={c.core} stroke={c.deep} strokeWidth="1.4" />
          <path d="M9 6q5-5 10 0" fill="none" stroke={c.deep} strokeWidth="1.4" {...SJ} />
        </svg>
      </Q>
      <Q x="50%" y={`calc(${rk(3.8)} - 1.6%)`} w={14} h={6} cls="g02-r-open" delayMs={d + 260} v={{ "--gd": "1.9s", "--ra": "-120deg" }} style={{ transformOrigin: "50% 10%" }}>
        <svg viewBox="0 0 28 12" className="block h-full w-full" aria-hidden="true">
          <path d="M2 1h24L14 10z" fill={c.core} stroke={c.deep} strokeWidth="1.3" {...SJ} />
          <circle cx="14" cy="7" r="2.4" fill="#d4746a" stroke={c.deep} strokeWidth="0.8" />
        </svg>
      </Q>
      {[0, 1].map((i) => (
        <Q key={i} x={`${36 + i * 28}%`} y={rk(3.9)} w={9} h={13} cls="g02-r-go" delayMs={d + 520 + i * 90} v={{ "--gd": "1.6s", "--tx0": `${(i ? -1 : 1) * 150}%`, "--ty0": "0%", "--tx1": "0%", "--ty1": "0%" }}>
          <SeenCard c={c} />
        </Q>
      ))}
      <NerfCuff x="8%" y={rk(BAND)} c={c} delayMs={d + 700} gd="1.5s" />
      <Pips n={5} r={BAND} x0={17} x1={33} color={c.glow} delayMs={d + 940} gd="1.3s" />
      <Q x="50%" y={rk(3.1)} w={20} h={2} cls="g02-r-lean" delayMs={d + 1500} v={{ "--gd": "0.8s" }} style={{ borderRadius: "999px", background: "rgba(196,152,106,0.5)" }} />
    </Brd>
  );
}

/* --- bn4_double_pardon -------------------------------------------------------------
   "Both players' nerfs are suspended for their next 6 turns. On the last of
   your 6 turns you may only step one square (a king step)." Two pardons are
   unrolled, one on each side; a cuff springs open on each side and six ticks
   are struck on each; the caster's sixth tick is a king step: a crowned
   square with only the eight squares round it lit. */
const C_DBR = { core: "#d8a15c", glow: "#fff3d4", deep: "#2a1a0c" };

function DoublePardonRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <DoublePardonScene lead={lead} role={role} delayMs={delayMs} />;
  const c = C_DBR;
  const d = delayMs;
  const scroll = (
    <svg viewBox="0 0 40 14" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
      <rect x="3" y="2" width="34" height="10" fill={c.glow} stroke={c.core} strokeWidth="1.2" />
      <path d="M8 5.6h20M8 8.6h14" stroke={c.core} strokeWidth="0.9" />
      <circle cx="33" cy="9" r="2.4" fill={c.core} stroke={c.deep} strokeWidth="0.8" />
    </svg>
  );
  return (
    <Brd>
      <Q x="76%" y={rk(BAND)} w={30} h={8} cls="g02-r-draw" delayMs={d + 20} v={{ "--gd": "2.1s" }}>{scroll}</Q>
      <Q x="76%" y={rk(5.4)} w={30} h={8} cls="g02-r-draw" delayMs={d + 80} v={{ "--gd": "2s" }}>{scroll}</Q>
      <NerfCuff x="8%" y={rk(BAND)} c={c} delayMs={d + 300} gd="1.9s" />
      <NerfCuff x="8%" y={rk(5.4)} c={c} delayMs={d + 340} gd="1.85s" />
      <Pips n={5} r={BAND} x0={17} x1={45} color={c.glow} delayMs={d + 560} gd="1.6s" />
      <Pips n={6} r={5.4} x0={17} x1={52} color={c.core} delayMs={d + 560} gd="1.6s" />
      <Q x="53%" y={rk(BAND)} w={8} h={8} cls="g02-r-stamp" delayMs={d + 1000} v={{ "--gd": "1.2s" }}>
        <StepMark c={c} />
      </Q>
      <Q x="50%" y={rk(3.8)} w={60} h={2} cls="g02-r-lean" delayMs={d + 1500} v={{ "--gd": "0.8s" }} style={{ borderRadius: "999px", background: "rgba(216,161,92,0.45)" }} />
    </Brd>
  );
}

/* --- bn4_hidden_clause -------------------------------------------------------------
   "After your next 8 turns, a buried clause activates: your nerf is suspended
   for the 12 turns that follow." A contract is laid on the caster's side and
   a magnifier slides along its fine print until one buried line lights; eight
   ticks are struck dim (the turns it waits), and only then the cuff springs
   open and twelve bright ticks follow. */
const C_HCR = { core: "#b9a2d0", glow: "#fff4d6", deep: "#1f1730" };

function HiddenClauseRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <HiddenClauseScene lead={lead} role={role} delayMs={delayMs} />;
  const c = C_HCR;
  const d = delayMs;
  return (
    <Brd>
      <Q x="56%" y={rk(3.4)} w={60} h={14} cls="g02-r-draw" delayMs={d + 20} v={{ "--gd": "2.2s" }}>
        <svg viewBox="0 0 80 18" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <rect x="1" y="1" width="78" height="16" fill={c.glow} stroke={c.core} strokeWidth="1.2" />
          <path d="M5 5h60M5 8h66M5 11h54M5 14h62" stroke={c.core} strokeWidth="0.7" />
        </svg>
      </Q>
      <Q x="72%" y={`calc(${rk(3.4)} + 2.4%)`} w={10} h={10} cls="g02-r-go" delayMs={d + 200} v={{ "--gd": "1.6s", "--tx0": "-300%", "--ty0": "0%", "--tx1": "0%", "--ty1": "0%" }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <circle cx="8" cy="8" r="5.6" fill="rgba(255,244,214,0.3)" stroke={c.deep} strokeWidth="1.8" />
          <path d="M12 12l6 6" stroke={c.deep} strokeWidth="2.6" {...SJ} />
        </svg>
      </Q>
      <Q x="59%" y={`calc(${rk(3.4)} + 2.4%)`} w={36} h={1.4} cls="g02-r-draw" delayMs={d + 640} v={{ "--gd": "1.4s" }} style={{ background: c.core }} />
      <Tally n={8} r={BAND} x0={17} x1={45} color={c.core} delayMs={d + 520} gd="1.6s" cls="g02-r-dim" />
      <NerfCuff x="8%" y={rk(1.5)} c={c} delayMs={d + 900} gd="1.3s" />
      <Tally n={12} r={1.5} x0={17} x1={88} color={c.glow} delayMs={d + 1100} gd="1.1s" />
    </Brd>
  );
}

/* --- bn4_hollow_crown --------------------------------------------------------------
   "Beginning after your opponent's next move, your nerf is suspended while
   their queen is off the board." Their queen, out on d5, is ringed and a
   chain runs from her down to the cuff on the caster's side; one open pip first (their
   next move); she is struck off her square, the crown left there goes hollow,
   the chain falls slack and the cuff springs open. */
const C_HOR = { core: "#e2b6c8", glow: "#fff4d6", deep: "#2b1520" };

function HollowCrownRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <HollowCrownScene lead={lead} role={role} delayMs={delayMs} />;
  const c = C_HOR;
  const d = delayMs;
  return (
    <Brd>
      <Q x={fc(3)} y={rk(4)} w={13} h={13} cls="g02-r-pip" delayMs={d + 30} v={{ "--gd": "1s" }} style={{ border: `2.5px solid ${c.core}`, borderRadius: "50%" }} />
      <Thread c0={3} r0={4} c1={0.2} r1={BAND + 0.3} color={c.core} delayMs={d + 120} gd="0.95s" />
      <Q x="50%" y={rk(5.4)} w={3} h={3} cls="g02-r-pip" delayMs={d + 300} v={{ "--gd": "1.2s" }} style={{ border: `1.5px solid ${c.glow}`, borderRadius: "50%" }} />
      <Q x={fc(3)} y={rk(4)} w={11} h={11} cls="g02-r-in" delayMs={d + 40} v={{ "--gd": "0.72s" }}>
        <Man kind="q" fill={c.deep} stroke={c.core} />
      </Q>
      <Q x={fc(3)} y={rk(4)} w={11} h={11} cls="g02-r-part" delayMs={d + 640} v={{ "--gd": "0.8s", "--tx1": "calc(var(--fx-side, 1) * -60%)", "--ty1": "calc(var(--fx-side, 1) * -70%)", "--r1": "-40deg" }}>
        <Man kind="q" fill={c.deep} stroke={c.core} />
      </Q>
      <Q x={fc(3)} y={rk(4)} w={9} h={6} cls="g02-r-stamp" delayMs={d + 900} v={{ "--gd": "1.4s" }}>
        <svg viewBox="0 0 20 12" className="block h-full w-full" aria-hidden="true">
          <path d="M2 10L3 2l4 4 3-5 3 5 4-4 1 8z" fill="none" stroke={c.glow} strokeWidth="1.5" {...SJ} />
        </svg>
      </Q>
      <Q x="25%" y={rk(3.2)} w={24} h={1.2} cls="g02-r-part" delayMs={d + 960} v={{ "--gd": "0.8s", "--tx1": "0%", "--ty1": "calc(var(--fx-side, 1) * 300%)", "--r1": "8deg" }} style={{ background: `repeating-linear-gradient(90deg, ${c.core} 0 6px, transparent 6px 10px)` }} />
      <NerfCuff x={fc(0.2)} y={rk(BAND)} c={c} delayMs={d + 760} gd="1.4s" />
      <Q x={fc(0.2)} y={rk(3.2)} w={14} h={2} cls="g02-r-lean" delayMs={d + 1500} v={{ "--gd": "0.8s" }} style={{ borderRadius: "999px", background: "rgba(226,182,200,0.5)" }} />
    </Brd>
  );
}

/* --- bn4_long_holiday --------------------------------------------------------------
   "After your opponent's next move, your nerf is suspended for your next 8
   turns." One open pip on the opponent's side (their move first); a beach
   parasol is planted on the caster's rank, the cuff springs open under it
   and eight ticks run out along the rank, a little sun over each. */
const C_LHR = { core: "#86b7c9", glow: "#fff3d4", deep: "#14262e" };

function LongHolidayRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <LongHolidayScene lead={lead} role={role} delayMs={delayMs} />;
  const c = C_LHR;
  const d = delayMs;
  return (
    <Brd>
      <Q x="50%" y={rk(5.4)} w={3} h={3} cls="g02-r-pip" delayMs={d + 30} v={{ "--gd": "1.1s" }} style={{ border: `1.5px solid ${c.glow}`, borderRadius: "50%" }} />
      <Q x="10%" y={rk(3)} w={14} h={16} cls="g02-r-up" delayMs={d + 260} v={{ "--gd": "2s", "--r0": "-14deg" }}>
        <svg viewBox="0 0 24 28" className="block h-full w-full" aria-hidden="true">
          <path d="M2 10q10-12 20 0z" fill={c.core} stroke={c.deep} strokeWidth="1.2" {...SJ} />
          <path d="M7 10q2-6 5-8M17 10q-2-6-5-8" fill="none" stroke={c.glow} strokeWidth="1.1" />
          <path d="M12 10v17" stroke={c.deep} strokeWidth="1.6" {...SJ} />
        </svg>
      </Q>
      <NerfCuff x="10%" y={rk(1.7)} c={c} delayMs={d + 520} gd="1.7s" />
      <Pips n={8} r={BAND} x0={22} x1={78} color={c.glow} delayMs={d + 720} gd="1.5s" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <Q key={i} x={`${22 + i * 8}%`} y={rk(BAND + 0.45)} w={2.4} h={2.4} cls="g02-r-pip" delayMs={d + 760 + i * 50} v={{ "--gd": "1.4s" }} style={{ background: "#f2c46a", borderRadius: "50%" }} />
      ))}
      <Q x="50%" y={rk(3.2)} w={50} h={2} cls="g02-r-lean" delayMs={d + 1500} v={{ "--gd": "0.8s" }} style={{ borderRadius: "999px", background: "rgba(134,183,201,0.45)" }} />
    </Brd>
  );
}

/* --- bn4_ministers_seal ------------------------------------------------------------
   "Free action, used at the moment you choose: your nerf is suspended for
   your next 7 turns, beginning after your opponent's next reply." The
   minister's signet comes down on a wax seal at the caster's edge between
   moves (the caster's turn token beside it stays unspent); one open pip on the
   opponent's side for their reply; then the cuff springs open and seven ticks. */
const C_MSE = { core: "#d4746a", glow: "#fff4d6", deep: "#2c1210" };

function MinistersSealRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <MinistersSealScene lead={lead} role={role} delayMs={delayMs} />;
  const c = C_MSE;
  const d = delayMs;
  return (
    <Brd>
      <Q x="50%" y={rk(3.2)} w={9} h={12} cls="g02-r-go" delayMs={d + 20} v={{ "--gd": "1s", "--tx0": "0%", "--ty0": "-120%", "--tx1": "0%", "--ty1": "0%" }}>
        <svg viewBox="0 0 16 22" className="block h-full w-full" aria-hidden="true">
          <path d="M5 2h6v8H5z" fill={c.glow} stroke={c.deep} strokeWidth="1.2" />
          <path d="M2 10h12l-1 10H3z" fill={c.core} stroke={c.deep} strokeWidth="1.2" {...SJ} />
        </svg>
      </Q>
      <Q x="50%" y={rk(BAND)} w={10} h={10} cls="g02-r-stamp" delayMs={d + 320} v={{ "--gd": "2s" }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <path d="M10 1.6l2 2.2 3-.4.6 3 2.6 1.6-1.4 2.6 1.4 2.6-2.6 1.6-.6 3-3-.4-2 2.2-2-2.2-3 .4-.6-3-2.6-1.6 1.4-2.6-1.4-2.6 2.6-1.6.6-3 3 .4z" fill={c.core} stroke={c.deep} strokeWidth="1" {...SJ} />
          <path d="M6.6 10h6.8M10 6.6v6.8" stroke={c.glow} strokeWidth="1.4" {...SJ} />
        </svg>
      </Q>
      <Q x="62%" y={rk(BAND)} w={5} h={5} cls="g02-r-in" delayMs={d + 420} v={{ "--gd": "1.6s" }} style={{ border: `2px solid ${c.glow}`, background: c.deep, borderRadius: "50%" }} />
      <Q x="50%" y={rk(5.4)} w={3} h={3} cls="g02-r-pip" delayMs={d + 620} v={{ "--gd": "1.3s" }} style={{ border: `1.5px solid ${c.glow}`, borderRadius: "50%" }} />
      <NerfCuff x="8%" y={rk(1.4)} c={c} delayMs={d + 820} gd="1.4s" />
      <Pips n={7} r={1.4} x0={17} x1={41} color={c.glow} delayMs={d + 1020} gd="1.2s" />
      <Q x="50%" y={rk(3)} w={14} h={2} cls="g02-r-lean" delayMs={d + 1500} v={{ "--gd": "0.8s" }} style={{ borderRadius: "999px", background: "rgba(212,116,106,0.5)" }} />
    </Brd>
  );
}

/* --- bn4_pillars_of_home -----------------------------------------------------------
   "While at least two of your rooks stand on the board, your nerf is
   suspended." Both of the caster's rooks are ringed on their corner squares
   and a stone pillar rises out of each; a lintel is laid from one to the
   other across the caster's side, and the cuff hanging under it springs open:
   it holds as long as both pillars stand. */
const C_PHR = { core: "#a89c86", glow: "#fff4d6", deep: "#221e16" };

function PillarsOfHomeRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <PillarsOfHomeScene lead={lead} role={role} delayMs={delayMs} />;
  const c = C_PHR;
  const d = delayMs;
  const pillar = (
    <svg viewBox="0 0 12 40" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
      <rect x="1" y="1" width="10" height="3" fill={c.glow} stroke={c.deep} strokeWidth="0.8" />
      <rect x="2.4" y="4" width="7.2" height="32" fill={c.core} stroke={c.deep} strokeWidth="0.8" />
      <path d="M4.6 5v30M7.4 5v30" stroke={c.glow} strokeWidth="0.5" />
      <rect x="1" y="36" width="10" height="3" fill={c.glow} stroke={c.deep} strokeWidth="0.8" />
    </svg>
  );
  return (
    <Brd>
      {[{ col: 0, at: 30 }, { col: 7, at: 90 }].map((p) => (
        <Q key={`r${p.col}`} x={fc(p.col)} y={rk(0)} w={12} h={12} cls="g02-r-pip" delayMs={d + p.at} v={{ "--gd": "2.1s" }} style={{ border: `2.5px solid ${c.glow}`, borderRadius: "2px" }} />
      ))}
      {[0, 7].map((col, i) => (
        <Q key={`p${col}`} x={fc(col)} y={rk(2)} w={7} h={30} cls="g02-r-up" delayMs={d + 200 + i * 60} v={{ "--gd": "1.9s" }} style={{ transformOrigin: "50% calc(50% + var(--fx-side, 1) * 50%)" }}>
          {pillar}
        </Q>
      ))}
      <Q x="50%" y={rk(3.3)} w={96} h={4} cls="g02-r-draw" delayMs={d + 620} v={{ "--gd": "1.6s" }} style={{ background: c.core, border: `1px solid ${c.deep}` }} />
      <NerfCuff x="50%" y={rk(2.5)} c={c} delayMs={d + 820} gd="1.4s" />
      <Q x="50%" y={rk(3.3)} w={6} h={5} cls="g02-r-stamp" delayMs={d + 1000} v={{ "--gd": "1.2s" }}>
        <svg viewBox="0 0 24 12" className="block h-full w-full" aria-hidden="true">
          <path d="M12 6c-2.4-3.4-8-3.4-8 0s5.6 3.4 8 0 8-3.4 8 0-5.6 3.4-8 0z" fill="none" stroke={c.glow} strokeWidth="2" {...SJ} />
        </svg>
      </Q>
      <Q x="50%" y={rk(4)} w={60} h={2} cls="g02-r-lean" delayMs={d + 1500} v={{ "--gd": "0.8s" }} style={{ borderRadius: "999px", background: "rgba(168,156,134,0.5)" }} />
    </Brd>
  );
}

/* --- bn4_quiet_coup ----------------------------------------------------------------
   "Suspend your nerf for your next 6 turns, and your next draft offer rolls
   one tier higher. On the last of those turns you may only step one square
   (a king step)." A crown is lifted quietly off its cushion on the caster's
   flank and set on the next draft card, which climbs a step and gains a tier
   pip; the cuff springs open, six ticks, and the sixth is a king step. */
const C_QCR = { core: "#b7c8a8", glow: "#fff4d6", deep: "#1c2418" };

function QuietCoupRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <QuietCoupScene lead={lead} role={role} delayMs={delayMs} />;
  const c = C_QCR;
  const d = delayMs;
  return (
    <Brd>
      <Q x="70%" y={rk(3.6)} w={12} h={4} cls="g02-r-in" delayMs={d + 20} v={{ "--gd": "2s" }} style={{ background: "#7a4a6a", border: `1px solid ${c.deep}`, borderRadius: "40%" }} />
      <Q x="86%" y={rk(3.9)} w={9} h={13} cls="g02-r-go" delayMs={d + 80} v={{ "--gd": "2s", "--tx0": "0%", "--ty0": "calc(var(--fx-side, 1) * 60%)", "--tx1": "0%", "--ty1": "calc(var(--fx-side, 1) * -30%)" }}>
        <DraftCard c={c} />
      </Q>
      <Q x="86%" y={rk(3.9)} w={8} h={5} cls="g02-r-go" delayMs={d + 300} v={{ "--gd": "1.6s", "--tx0": "-200%", "--ty0": "calc(var(--fx-side, 1) * 60%)", "--tx1": "0%", "--ty1": "calc(var(--fx-side, 1) * -110%)" }}>
        <svg viewBox="0 0 20 12" className="block h-full w-full" aria-hidden="true">
          <path d="M2 10L3 2l4 4 3-5 3 5 4-4 1 8z" fill="#f2c46a" stroke={c.deep} strokeWidth="1.1" {...SJ} />
        </svg>
      </Q>
      {[0, 1].map((i) => (
        <Q key={i} x={`${83 + i * 6}%`} y={rk(4.9)} w={2.4} h={2.4} cls="g02-r-pip" delayMs={d + 700 + i * 120} v={{ "--gd": "1.4s" }} style={{ background: i ? "#f2c46a" : c.core, border: `1px solid ${c.deep}`, borderRadius: "50%" }} />
      ))}
      <NerfCuff x="8%" y={rk(BAND)} c={c} delayMs={d + 560} gd="1.7s" />
      <Pips n={5} r={BAND} x0={17} x1={45} color={c.glow} delayMs={d + 760} gd="1.4s" />
      <Q x="53%" y={rk(BAND)} w={8} h={8} cls="g02-r-stamp" delayMs={d + 1160} v={{ "--gd": "1.1s" }}>
        <StepMark c={c} />
      </Q>
      <Q x="30%" y={rk(3.1)} w={40} h={2} cls="g02-r-lean" delayMs={d + 1500} v={{ "--gd": "0.8s" }} style={{ borderRadius: "999px", background: "rgba(183,200,168,0.5)" }} />
    </Brd>
  );
}

/* --- bn4_relief_column -------------------------------------------------------------
   "Your best captured rook and your best captured minor (a bishop, or else a
   knight) both return to empty squares nearest your home rank. The muster
   costs your next draft, which is skipped." A drummer beats at the caster's
   edge and a column marches in from behind it: a rook to a3 and a bishop to
   c3 (the empty squares nearest home in the opening), each square lit as it
   lands; the next draft card at the flank is crossed out as the price. */
const C_RCR = { core: "#d09a5c", glow: "#fff3d4", deep: "#2b1c0e" };

function ReliefColumnRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <ReliefColumnScene lead={lead} role={role} delayMs={delayMs} />;
  const c = C_RCR;
  const d = delayMs;
  const men: { k: "r" | "b"; col: number }[] = [{ k: "r", col: 0 }, { k: "b", col: 2 }];
  return (
    <Brd>
      <Q x="50%" y={rk(2.4)} w={8} h={7} cls="g02-r-stamp" delayMs={d + 20} v={{ "--gd": "1.8s" }}>
        <svg viewBox="0 0 20 18" className="block h-full w-full" aria-hidden="true">
          <ellipse cx="10" cy="5" rx="8" ry="3" fill={c.glow} stroke={c.deep} strokeWidth="1.2" />
          <path d="M2 5v8q8 5 16 0V5" fill={c.core} stroke={c.deep} strokeWidth="1.2" {...SJ} />
          <path d="M2 7l5 7 3-8 3 8 5-7" fill="none" stroke={c.glow} strokeWidth="0.9" />
        </svg>
      </Q>
      {men.map((m, i) => (
        <Q key={m.k} x={fc(m.col)} y={rk(2)} w={11} h={11} cls="g02-r-go" delayMs={d + 200 + i * 220} v={{ "--gd": "1.8s", "--tx0": "0%", "--ty0": "calc(var(--fx-side, 1) * 260%)", "--tx1": "0%", "--ty1": "0%" }}>
          <Man kind={m.k} fill={c.glow} stroke={c.deep} />
        </Q>
      ))}
      {men.map((m, i) => (
        <Tint key={`t${m.k}`} x={fc(m.col)} y={rk(2)} color="rgba(208,154,92,0.36)" delayMs={d + 620 + i * 220} gd="1.3s" />
      ))}
      <Q x="88%" y={rk(3.4)} w={9} h={13} cls="g02-r-dim" delayMs={d + 700} v={{ "--gd": "1.4s" }}>
        <DraftCard c={c} />
      </Q>
      <Q x="88%" y={rk(3.4)} w={9} h={9} cls="g02-r-stamp" delayMs={d + 1000} v={{ "--gd": "1.1s" }}>
        <Cross c={c} />
      </Q>
      <Q x={fc(1)} y={rk(2.6)} w={24} h={2} cls="g02-r-lean" delayMs={d + 1500} v={{ "--gd": "0.8s" }} style={{ borderRadius: "999px", background: "rgba(208,154,92,0.5)" }} />
    </Brd>
  );
}

/* --- bn4_rule_of_three -------------------------------------------------------------
   "Every 3rd capture you make suspends your nerf for your next 4 turns. Lasts
   the rest of the game." Three captures land one after another on the
   opponent's men (e6, c6, g6), each cutting a stroke into a tally at the
   caster's edge; the third stroke is the gate across the first two, the cuff
   springs open and four ticks are struck; a loop arrow says it comes round
   again. */
const C_ROT = { core: "#94c4bd", glow: "#fff4d6", deep: "#12292a" };

function RuleOfThreeRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <RuleOfThreeScene lead={lead} role={role} delayMs={delayMs} />;
  const c = C_ROT;
  const d = delayMs;
  const hits = [{ col: 4, at: 120 }, { col: 2, at: 340 }, { col: 6, at: 560 }];
  return (
    <Brd>
      {hits.map(({ col, at }, i) => (
        <Q key={`v${col}`} x={fc(col)} y={rk(5)} w={11} h={11} cls="g02-r-part" delayMs={d + at} v={{ "--gd": "0.7s", "--tx1": `${(i - 1) * 30}%`, "--ty1": "calc(var(--fx-side, 1) * -60%)", "--r1": `${(i - 1) * 30 + 15}deg` }}>
          <Man kind="p" fill={c.deep} stroke={c.core} />
        </Q>
      ))}
      {hits.map(({ col, at }) => (
        <Q key={`x${col}`} x={fc(col)} y={rk(5)} w={8} h={8} cls="g02-r-stamp" delayMs={d + at - 20} v={{ "--gd": "1s" }}>
          <Cross c={c} />
        </Q>
      ))}
      {[0, 1].map((i) => (
        <Q key={`s${i}`} x={`${44 + i * 5}%`} y={rk(BAND)} w={1.4} h={7} cls="g02-r-pip" delayMs={d + 160 + i * 220} v={{ "--gd": "1.8s" }} style={{ background: c.glow }} />
      ))}
      <Q x="46.5%" y={rk(BAND)} w={11} h={1.4} cls="g02-r-draw" delayMs={d + 600} v={{ "--gd": "1.4s" }} style={{ background: c.core, rotate: "-24deg" }} />
      <NerfCuff x="8%" y={rk(BAND)} c={c} delayMs={d + 720} gd="1.4s" />
      <Pips n={4} r={BAND} x0={17} x1={29} color={c.glow} delayMs={d + 960} gd="1.2s" />
      <Q x="62%" y={rk(BAND)} w={7} h={7} cls="g02-r-stamp" delayMs={d + 1120} v={{ "--gd": "1s" }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <path d="M15.6 6.4A7 7 0 1 0 17 11" fill="none" stroke={c.core} strokeWidth="2.2" {...SJ} />
          <path d="M16.6 2.4l-.6 4.6-4.4-1" fill="none" stroke={c.core} strokeWidth="2.2" {...SJ} />
        </svg>
      </Q>
    </Brd>
  );
}

/* --- bn4_spymasters_leave ----------------------------------------------------------
   "Suspend your nerf for your next 5 turns, learn the tier of your opponent's
   next draft offer, and gain 2 draft rerolls. On the last of those turns you
   may only step one square (a king step)." A spyglass is raised on the
   caster's flank and its sight line crosses to the opponent's next draft card,
   still face down, over which only its tier (V) shows; two dice drop; the
   cuff springs open and five ticks are struck, the fifth a king step. */
const C_SLR = { core: "#8fa2d0", glow: "#fff4d6", deep: "#171b2c" };

function SpymastersLeaveRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <SpymastersLeaveScene lead={lead} role={role} delayMs={delayMs} />;
  const c = C_SLR;
  const d = delayMs;
  return (
    <Brd>
      <Q x="10%" y={rk(3.6)} w={12} h={6} cls="g02-r-in" delayMs={d + 20} v={{ "--gd": "2.1s", "--r0": "30deg" }} style={{ rotate: "-20deg" }}>
        <svg viewBox="0 0 28 12" className="block h-full w-full" aria-hidden="true">
          <path d="M2 4h8v4H2zM10 3h8v6h-8zM18 2h8v8h-8z" fill={c.core} stroke={c.deep} strokeWidth="1.1" />
          <path d="M26 2v8" stroke={c.glow} strokeWidth="1.4" />
        </svg>
      </Q>
      <Q x="47%" y={rk(4.6)} w={72} h={1} cls="g02-r-draw" delayMs={d + 220} v={{ "--gd": "1.3s" }} style={{ rotate: "-9deg", background: `linear-gradient(90deg, ${c.glow}, rgba(255,244,214,0.2))` }} />
      <Q x="86%" y={rk(5.4)} w={9} h={13} cls="g02-r-in" delayMs={d + 120} v={{ "--gd": "1.9s" }}>
        <DraftCard c={c} />
      </Q>
      <Q x="86%" y={rk(5.4)} w={8} h={8} cls="g02-r-stamp" delayMs={d + 480} v={{ "--gd": "1.5s" }} style={{ background: c.deep, border: `2px solid ${c.glow}`, borderRadius: "50%" }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <text x="10" y="14" textAnchor="middle" fontSize="10" fontWeight="700" fill={c.glow}>V</text>
        </svg>
      </Q>
      {[0, 1].map((i) => (
        <Q key={i} x={`${60 + i * 8}%`} y={rk(BAND)} w={5.4} h={5.4} cls="g02-r-go" delayMs={d + 620 + i * 80} v={{ "--gd": "1.3s", "--tx0": "0%", "--ty0": "calc(var(--fx-side, 1) * -200%)", "--tx1": "0%", "--ty1": "0%" }}>
          <Die c={c} />
        </Q>
      ))}
      <NerfCuff x="8%" y={rk(BAND)} c={c} delayMs={d + 700} gd="1.5s" />
      <Pips n={4} r={BAND} x0={17} x1={35} color={c.glow} delayMs={d + 900} gd="1.3s" />
      <Q x="43%" y={rk(BAND)} w={8} h={8} cls="g02-r-stamp" delayMs={d + 1200} v={{ "--gd": "1s" }}>
        <StepMark c={c} />
      </Q>
    </Brd>
  );
}

/* --- bn4_tower_toll ----------------------------------------------------------------
   "Tear down one of your rooks (it is removed and truly lost): your nerf is
   suspended for your next 14 turns." On the rook the caster picked (the
   target cut, on its real square) the tower is ringed and torn down, its
   stones tumbling off the square and the rook fading out. The lead pays the
   toll: a coin rolls to a barrier arm on the caster's flank, the arm swings
   up, the cuff springs open and fourteen ticks run the length of the rank. */
const C_TTR = { core: "#c8a05a", glow: "#fff3d4", deep: "#2a1e0c" };

function TowerTollRule({ lead, role, delayMs }: SceneProps) {
  const c = C_TTR;
  const d = delayMs;
  if (role === "target") {
    return (
      <Cut d={d}>
        <span className="g02-r-in absolute block" style={{ left: "4%", top: "4%", width: "92%", height: "92%", border: `3px solid ${c.core}`, borderRadius: "3px", animationDelay: `${d}ms`, "--gd": "1s", "--s0": "1.15" } as CSSProperties} />
        <span className="g02-r-dim absolute block" style={{ left: "18%", top: "14%", width: "64%", height: "72%", animationDelay: `${d + 40}ms`, "--gd": "1s" } as CSSProperties}>
          <Man kind="r" fill={c.glow} stroke={c.deep} />
        </span>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="g02-r-part absolute block" style={{ left: `${22 + i * 12}%`, top: `${18 + (i % 2) * 14}%`, width: "16%", height: "13%", background: c.core, border: `1px solid ${c.deep}`, animationDelay: `${d + 300 + i * 40}ms`, "--gd": "0.8s", "--tx1": `${(i - 2) * 120}%`, "--ty1": "320%", "--r1": `${(i - 2) * 40}deg` } as CSSProperties} />
        ))}
      </Cut>
    );
  }
  if (role !== "lead") return <TowerTollScene lead={lead} role={role} delayMs={delayMs} />;
  return (
    <Brd>
      <Q x="50%" y={rk(1.5)} w={4} h={4} cls="g02-r-go" delayMs={d + 300} v={{ "--gd": "1.3s", "--tx0": "0%", "--ty0": "calc(var(--fx-side, 1) * 150%)", "--tx1": "calc(var(--fx-side, 1) * -1000%)", "--ty1": "calc(var(--fx-side, 1) * -220%)" }} style={{ background: "#f2c46a", border: `1px solid ${c.deep}`, borderRadius: "50%" }} />
      <Q x="2%" y={rk(BAND + 0.9)} w={3} h={8} cls="g02-r-in" delayMs={d + 120} v={{ "--gd": "2s", "--s0": "1" }} style={{ background: c.deep }} />
      <Q x="14%" y={rk(BAND + 1.2)} w={24} h={2.4} cls="g02-r-open" delayMs={d + 120} v={{ "--gd": "2s", "--ra": "-55deg" }} style={{ transformOrigin: "0% 50%", background: `repeating-linear-gradient(90deg, ${c.core} 0 8px, ${c.glow} 8px 16px)`, border: `1px solid ${c.deep}` }} />
      <NerfCuff x="8%" y={rk(1.5)} c={c} delayMs={d + 820} gd="1.4s" />
      <Tally n={14} r={1.5} x0={17} x1={82} color={c.glow} delayMs={d + 1020} gd="1.2s" />
    </Brd>
  );
}

export const PLAYS: Record<string, SigPlugin> = {
  bn4_uphill_battle: S(UphillBattleScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }),
  bn4_wardens_retirement: S(WardensRetirementRule, { ordering: "file", staggerMs: 70, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }),
  hx4_iron_portcullis: S(IronPortcullisScene, { ordering: "octagon", staggerMs: 55, victims: "all", hasLead: true, sound: "clockice", anchor: "board" }),
  ov_patient_grift: S(PatientGriftRule, { ordering: "file", staggerMs: 80, victims: "all", hasLead: true, sound: "blitz", anchor: "board" }),
  bn4_diplomatic_pouch: S(DiplomaticPouchRule, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }),
  bn4_double_pardon: S(DoublePardonRule, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cathedral", anchor: "board" }),
  bn4_guards_change: S(GuardsChangeScene, { ordering: "file", staggerMs: 70, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }),
  bn4_hidden_clause: S(HiddenClauseRule, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }),
  bn4_hollow_crown: S(HollowCrownRule, { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "clockice", anchor: "board" }),
  bn4_long_holiday: S(LongHolidayRule, { ordering: "octagon", staggerMs: 60, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }),
  bn4_masons_lodge: S(MasonsLodgeScene, { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "cathedral", anchor: "cast" }),
  bn4_ministers_seal: S(MinistersSealRule, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }),
  bn4_out_on_bail: S(OutOnBailScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "blitz", anchor: "board" }),
  bn4_pillars_of_home: S(PillarsOfHomeRule, { ordering: "line", staggerMs: 80, victims: ["r"], hasLead: true, sound: "cathedral", anchor: "board" }),
  bn4_quiet_coup: S(QuietCoupRule, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "board" }),
  bn4_relief_column: S(ReliefColumnRule, { ordering: "line", staggerMs: 85, victims: ["r", "b", "n"], hasLead: true, sound: "blitz", anchor: "board" }),
  bn4_rule_of_three: S(RuleOfThreeRule, { ordering: "radial", staggerMs: 65, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }),
  bn4_spymasters_leave: S(SpymastersLeaveRule, { ordering: "octagon", staggerMs: 50, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }),
  bn4_tower_toll: S(TowerTollRule, { ordering: "line", staggerMs: 75, victims: ["r"], hasLead: true, sound: "cathedral", anchor: "aim" }),
  hx4_sleepwalkers: S(SleepwalkersScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "snooze", anchor: "aim" }),
  bn4_gentlemens_agreement: S(GentlemensAgreementScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }),
  bn4_harvest_and_fallow: S(HarvestAndFallowScene, { ordering: "line", staggerMs: 75, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }),
  bn4_heavy_price: S(HeavyPriceScene, { ordering: "radial", staggerMs: 60, victims: ["r", "q"], hasLead: true, sound: "clockice", anchor: "board" }),
  bn4_kings_indulgence: S(KingsIndulgenceScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }),
  bn4_leave_of_absence: S(LeaveOfAbsenceScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }),
  bn4_open_season: S(OpenSeasonScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "blitz", anchor: "board" }),
  bn4_retraining: S(RetrainingScene, { ordering: "radial", staggerMs: 0, victims: ["n", "b"], hasLead: true, sound: "clockice", anchor: "cast" }),
  bn4_royal_household: S(RoyalHouseholdScene, { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "cathedral", anchor: "board" }),
  bn4_royal_writ: S(RoyalWritScene, { ordering: "radial", staggerMs: 60, victims: ["k"], hasLead: true, sound: "cathedral", anchor: "cast" }),
  bn4_salt_in_the_wound: S(SaltInTheWoundRule, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }),
  bn4_scapegoat: S(ScapegoatScene, { ordering: "line", staggerMs: 70, victims: ["n", "b"], hasLead: true, sound: "clockice", anchor: "aim" }),
  bn4_veterans_pension: S(VeteransPensionScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "board" }),
};

// Graft the per-card impact beat onto every lead scene (additive: the base
// scene renders unchanged inside the quake wrapper).
for (const [id, imp] of Object.entries(IMPACT)) {
  const play = PLAYS[id];
  if (play) play.Render = withImpact(play.Render, imp);
}
