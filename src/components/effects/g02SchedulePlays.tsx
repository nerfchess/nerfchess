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
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <L c="g02-veil" st={{ background: "rgba(9,14,22,0.4)" }} />
          <Wash tone="rgba(159,191,216,0.28)" d={120} />
        </>
      }
    >
      <L c="g02-wr-hook" l={37} t={38} w={26} h={2} d={90} st={{ borderRadius: "999px", background: "#9fbfd8" }} />
      {WR_HOOKS.map((i) => (
        <L key={i} c="g02-wr-peg" l={38 + i * 5} t={40} w={1.4} h={3} d={180 + i * 70} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      ))}
      <V c="g02-wr-ring" l={38} t={41} w={9} h={12} d={420}>{ring}</V>
      <L c="g02-wr-plate" l={54} t={42} w={8} h={5} d={620} st={{ background: "#16202c", border: "1px solid #fff4d6" }} />
      <L c="g02-leanshadow" l={40} t={55} w={20} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(22,32,44,0.7)" }} />
      <L c="g02-glint" l={56} t={40} w={2.2} h={2.2} d={740} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
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
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <L c="g02-veil" st={{ background: "rgba(14,11,6,0.4)" }} />
          <Wash tone="rgba(240,211,138,0.3)" d={120} />
        </>
      }
    >
      <L c="g02-pg-case" l={36} t={35} w={28} h={22} d={70} st={{ background: "rgba(34,28,16,0.72)", border: "1px solid #f0d38a" }} />
      {PG_ROWS.map((i) => (
        <V key={i} c="g02-pg-flap" l={37} t={37 + i * 6} w={26} h={6} d={180 + i * 130} st={{ transformOrigin: "50% 46%" }}>
          {row(i === 2 ? "#fff4d6" : "#f0d38a")}
        </V>
      ))}
      <L c="g02-pg-strike" l={38} t={40} w={24} h={1.4} d={560} st={{ borderRadius: "999px", background: "#221c10", transformOrigin: "0% 50%" }} />
      <L c="g02-pg-land" l={38} t={49} w={24} h={5} d={660} st={{ background: "#fff4d6", border: "1px solid #221c10" }} />
      <L c="g02-shaft" l={45} t={24} w={10} h={26} d={700} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.6), transparent)", transformOrigin: "50% 0%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g02-sift" l={40 + i * 8} t={56} w={1.6} h={1.6} d={740 + i * 90} st={{ borderRadius: "50%", background: "#f0d38a" }} />
      ))}
    </Lead>
  );
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
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(196,152,106,0.26)" />}>
      <L c="g02-leanshadow" l={40} t={54} w={20} h={4} d={80} st={{ borderRadius: "999px", background: "rgba(43,31,18,0.62)" }} />
      <V c="g02-dp-set" l={42} t={40} w={16} h={16} d={140}>{pouch}</V>
      <V c="g02-dp-buckle" l={45} t={44} w={10} h={8} d={330} st={{ transformOrigin: "50% 100%" }}>
        <rect x="6" y="7" width="12" height="10" rx="1" fill="none" stroke="#fff4d6" strokeWidth="2.2" />
      </V>
      <L c="g02-dp-flap" l={42} t={39} w={16} h={5} d={470} st={{ background: "#c4986a", transformOrigin: "50% 0%" }} />
      <L c="g02-dp-slip" l={44} t={30} w={13} h={11} d={620} st={{ background: "#fff4d6", border: "1px solid #2b1f12" }} />
      <L c="g02-shaft" l={46} t={20} w={8} h={22} d={680} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.6), transparent)", transformOrigin: "50% 0%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g02-glint" l={44 + i * 6} t={30 + i * 3} w={1.8} h={1.8} d={720 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
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
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(216,161,92,0.28)" />
          <Rim tone="rgba(255,243,212,0.28)" />
        </>
      }
    >
      <L c="g02-dq-list" l={38} t={42} w={24} h={14} d={80} st={{ background: "#fff3d4", border: "1px solid #2a1a0c" }} />
      <V c="g02-dq-gavel" l={40} t={28} w={16} h={16} d={200} st={{ transformOrigin: "82% 82%" }}>{gavel}</V>
      <L c="g02-dq-block" l={46} t={41} w={10} h={2.6} d={330} st={{ background: "#2a1a0c" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g02-dq-cross" l={39} t={45 + i * 4} w={22} h={1.2} d={470 + i * 120} st={{ borderRadius: "999px", background: "#2a1a0c", transformOrigin: "0% 50%" }} />
      ))}
      <L c="g02-dq-strap" l={38} t={42} w={24} h={14} d={680} st={{ background: "#d8a15c", transformOrigin: "0% 50%" }} />
      <L c="g02-leanshadow" l={38} t={57} w={24} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(42,26,12,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g02-sift" l={42 + i * 7} t={53} w={1.4} h={1.4} d={740 + i * 90} st={{ borderRadius: "50%", background: "#fff3d4" }} />
      ))}
    </Lead>
  );
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
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <L c="g02-veil" st={{ background: "rgba(12,8,20,0.38)" }} />
          <Wash tone="rgba(185,162,208,0.26)" d={110} />
        </>
      }
    >
      <L c="g02-hc-book" l={40} t={40} w={20} h={16} d={90} st={{ background: "#fff4d6", border: "1px solid #1f1730" }} />
      <V c="g02-hc-knife" l={36} t={34} w={16} h={16} d={240}>{knife}</V>
      <L c="g02-hc-leaf" l={50} t={40} w={10} h={16} d={420} st={{ background: "#b9a2d0", transformOrigin: "0% 50%" }} />
      <L c="g02-hc-rule" l={42} t={50} w={16} h={1.2} d={580} st={{ borderRadius: "999px", background: "#1f1730", transformOrigin: "0% 50%" }} />
      <L c="g02-shaft" l={45} t={22} w={10} h={22} d={640} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.6), transparent)", transformOrigin: "50% 0%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g02-hc-riffle" l={41 + i * 6} t={41} w={4} h={14} d={660 + i * 110} st={{ background: "rgba(255,244,214,0.72)", transformOrigin: "0% 50%" }} />
      ))}
    </Lead>
  );
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
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(226,182,200,0.26)" />}>
      <L c="g02-hk-wire" l={49} t={22} w={1.4} h={16} d={70} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <L c="g02-hk-box" l={38} t={38} w={24} h={14} d={180} st={{ background: "rgba(43,21,32,0.75)", border: "1px solid #e2b6c8" }} />
      {HK_FLAGS.map((i) => (
        <L key={i} c="g02-hk-hold" l={39.5 + i * 5.6} t={40} w={3.4} h={5} d={300 + i * 90} st={{ background: "#e2b6c8", transformOrigin: "50% 0%" }} />
      ))}
      <V c="g02-hk-flag" l={45} t={40} w={5} h={7} d={600} st={{ transformOrigin: "50% 6%" }}>
        <path d={QUEEN} fill="#fff4d6" />
      </V>
      <L c="g02-hk-shut" l={44} t={48} w={7} h={2} d={680} st={{ background: "#2b1520", transformOrigin: "0% 50%" }} />
      <L c="g02-leanshadow" l={40} t={54} w={20} h={3} d={720} st={{ borderRadius: "999px", background: "rgba(43,21,32,0.6)" }} />
    </Lead>
  );
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
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(134,183,201,0.26)" />
          <Rim tone="rgba(20,38,46,0.44)" />
        </>
      }
    >
      <L c="g02-lh-bill" l={38} t={36} w={24} h={20} d={90} st={{ background: "#fff3d4", border: "1px solid #14262e" }} />
      {LH_NAILS.map(([l, t], i) => (
        <L key={i} c="g02-lh-nail" l={l} t={t} w={1.8} h={1.8} d={220 + i * 90} st={{ borderRadius: "50%", background: "#14262e" }} />
      ))}
      <V c="g02-lh-hammer" l={52} t={28} w={14} h={16} d={280} st={{ transformOrigin: "36% 88%" }}>{hammer}</V>
      <V c="g02-lh-lock" l={45} t={50} w={10} h={10} d={640}>{lock}</V>
      <L c="g02-leanshadow" l={40} t={58} w={20} h={3} d={690} st={{ borderRadius: "999px", background: "rgba(20,38,46,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g02-sift" l={42 + i * 7} t={54} w={1.4} h={1.4} d={740 + i * 90} st={{ borderRadius: "50%", background: "#86b7c9" }} />
      ))}
    </Lead>
  );
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
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(212,116,106,0.26)" />
          <Rim tone="rgba(255,244,214,0.26)" />
        </>
      }
    >
      <L c="g02-leanshadow" l={41} t={55} w={18} h={3} d={70} st={{ borderRadius: "999px", background: "rgba(44,18,16,0.6)" }} />
      <V c="g02-ms-box" l={42} t={42} w={16} h={13} d={150}>{box}</V>
      <L c="g02-ms-lid" l={42} t={38} w={16} h={5} d={330} st={{ background: "#d4746a", border: "1px solid #2c1210", transformOrigin: "50% 100%" }} />
      <L c="g02-ms-order" l={44} t={32} w={13} h={10} d={480} st={{ background: "#fff4d6", border: "1px solid #2c1210" }} />
      <L c="g02-ms-sign" l={45} t={37} w={11} h={1.2} d={620} st={{ borderRadius: "999px", background: "#2c1210", transformOrigin: "0% 50%" }} />
      <L c="g02-shaft" l={46} t={20} w={8} h={22} d={680} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.6), transparent)", transformOrigin: "50% 0%" }} />
      <L c="g02-glint" l={49} t={44} w={2.2} h={2.2} d={740} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
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
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(168,156,134,0.26)" />}>
      <L c="g02-leanshadow" l={38} t={55} w={24} h={3} d={70} st={{ borderRadius: "999px", background: "rgba(34,30,22,0.6)" }} />
      <V c="g02-ph-pier" l={38} t={40} w={8} h={15} d={160}>{pier("#a89c86")}</V>
      <V c="g02-ph-pier" l={54} t={40} w={8} h={15} d={300}>{pier("#a89c86")}</V>
      <L c="g02-ph-lintel" l={37} t={36} w={26} h={4} d={470} st={{ background: "#fff4d6", border: "1px solid #221e16", transformOrigin: "50% 0%" }} />
      <L c="g02-ph-list" l={41} t={41} w={18} h={12} d={600} st={{ background: "rgba(255,244,214,0.9)", border: "1px solid #221e16" }} />
      <L c="g02-shaft" l={45} t={20} w={10} h={20} d={680} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.66), transparent)", transformOrigin: "50% 0%" }} />
      <L c="g02-glint" l={49} t={36} w={2.4} h={2.4} d={740} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
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
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <L c="g02-veil" st={{ background: "rgba(10,14,8,0.4)" }} />
          <Wash tone="rgba(183,200,168,0.24)" d={120} />
        </>
      }
    >
      <L c="g02-qc-slot" l={38} t={41} w={24} h={7} d={90} st={{ background: "rgba(28,36,24,0.8)", border: "1px solid #b7c8a8" }} />
      <L c="g02-qc-out" l={38.6} t={42} w={11} h={5} d={260} st={{ background: "#b7c8a8" }} />
      <L c="g02-qc-in" l={50.4} t={42} w={11} h={5} d={430} st={{ background: "#fff4d6" }} />
      <L c="g02-qc-line" l={39} t={50} w={22} h={1.2} d={580} st={{ borderRadius: "999px", background: "#b7c8a8", transformOrigin: "0% 50%" }} />
      <L c="g02-callin" l={44} t={33} w={12} h={6} d={650} st={{ background: "rgba(255,244,214,0.86)", border: "1px solid #1c2418" }} />
      <L c="g02-leanshadow" l={40} t={54} w={20} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(28,36,24,0.6)" }} />
      <L c="g02-glint" l={51} t={41} w={2} h={2} d={760} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
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
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(208,154,92,0.26)" />}>
      <V c="g02-rc-drum" l={41} t={41} w={10} h={11} d={110}>{drum}</V>
      <L c="g02-runout" l={45} t={53} w={30} h={1.8} d={220} st={{ background: "linear-gradient(90deg, #fff3d4, rgba(208,154,92,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <L c="g02-rc-roll" l={48} t={44} w={18} h={7} d={380} st={{ background: "#fff3d4", border: "1px solid #2b1c0e", transformOrigin: "0% 50%" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g02-rc-tick" l={50 + i * 6} t={46} w={2.4} h={2.4} d={520 + i * 120} st={{ borderRadius: "50%", background: "#2b1c0e" }} />
      ))}
      <V c="g02-rc-fall" l={53} t={39} w={8} h={11} d={660}><path d={ROOK} fill="#d09a5c" stroke="#2b1c0e" strokeWidth="1" {...SJ} /></V>
      <V c="g02-rc-fall" l={60} t={40} w={7} h={10} d={740}><path d={BISHOP} fill="#fff3d4" stroke="#2b1c0e" strokeWidth="1" {...SJ} /></V>
    </AimLead>
  );
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
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(148,196,189,0.26)" />
          <Rim tone="rgba(255,244,214,0.26)" />
        </>
      }
    >
      <V c="g02-r3-arm" l={42} t={38} w={16} h={16} d={90} st={{ transformOrigin: "50% 50%" }}>{arm}</V>
      {R3_CLICKS.map((i) => (
        <L key={i} c="g02-r3-digit" l={41 + i * 6} t={50} w={5} h={5} d={240 + i * 140} st={{ background: "#fff4d6", border: "1px solid #12292a" }} />
      ))}
      <L c="g02-r3-open" l={39} t={44} w={22} h={2} d={660} st={{ borderRadius: "999px", background: "#12292a", transformOrigin: "100% 50%" }} />
      <L c="g02-r3-chit" l={56} t={41} w={8} h={5} d={700} st={{ background: "#94c4bd", border: "1px solid #12292a" }} />
      <L c="g02-leanshadow" l={40} t={57} w={20} h={3} d={720} st={{ borderRadius: "999px", background: "rgba(18,41,42,0.62)" }} />
      <L c="g02-glint" l={57} t={39} w={2.2} h={2.2} d={780} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
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
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <L c="g02-veil" st={{ background: "rgba(8,10,18,0.42)" }} />
          <Wash tone="rgba(143,162,208,0.26)" d={120} />
        </>
      }
    >
      <L c="g02-sl-rack" l={36} t={37} w={26} h={17} d={80} st={{ background: "rgba(23,27,44,0.78)", border: "1px solid #8fa2d0" }} />
      {SL_HOLES.map(([l, t], i) => (
        <L key={i} c="g02-sl-hole" l={l} t={t} w={5} h={5} d={180 + i * 60} st={{ background: "rgba(143,162,208,0.55)" }} />
      ))}
      <L c="g02-sl-slip" l={45} t={28} w={9} h={8} d={520} st={{ background: "#fff4d6", border: "1px solid #171b2c" }} />
      <L c="g02-sl-stamp" l={51} t={45} w={6} h={4} d={660} st={{ background: "#8fa2d0", border: "1px solid #fff4d6" }} />
      <L c="g02-shaft" l={46} t={18} w={8} h={22} d={700} st={{ background: "linear-gradient(180deg, rgba(255,244,214,0.6), transparent)", transformOrigin: "50% 0%" }} />
      <L c="g02-glint" l={52} t={28} w={2} h={2} d={760} st={{ borderRadius: "50%", background: "#fff4d6" }} />
    </Lead>
  );
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
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(200,160,90,0.26)" />}>
      <L c="g02-tt-post" l={44} t={38} w={2} h={16} d={90} st={{ background: "#2a1e0c" }} />
      <V c="g02-tt-block" l={47} t={40} w={9} h={11} d={260}><path d={ROOK} fill="#fff3d4" stroke="#2a1e0c" strokeWidth="1" {...SJ} /></V>
      <L c="g02-tt-box" l={50} t={50} w={9} h={5} d={420} st={{ background: "#2a1e0c", border: "1px solid #c8a05a" }} />
      <L c="g02-tt-arm" l={45} t={44} w={22} h={2} d={560} st={{ borderRadius: "999px", background: "#c8a05a", transformOrigin: "2% 50%" }} />
      <L c="g02-runout" l={45} t={52} w={28} h={1.4} d={640} st={{ background: "linear-gradient(90deg, #fff3d4, rgba(200,160,90,0))", transformOrigin: "0% 50%", borderRadius: "999px" }} />
      <L c="g02-tt-plate" l={41} t={33} w={8} h={5} d={700} st={{ background: "#2a1e0c", border: "1px solid #fff3d4" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g02-sift" l={49 + i * 5} t={52} w={1.4} h={1.4} d={740 + i * 90} st={{ borderRadius: "50%", background: "#c8a05a" }} />
      ))}
    </AimLead>
  );
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
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <L c="g02-veil" st={{ background: "rgba(8,12,18,0.38)" }} />
          <Wash tone="rgba(160,200,216,0.26)" d={110} />
        </>
      }
    >
      <L c="g02-si-column" l={44} t={34} w={11} h={24} d={80} st={{ background: "#fff3d4", border: "1px solid #142430" }} />
      <V c="g02-si-brush" l={55} t={32} w={8} h={12} d={240}>{brush}</V>
      <L c="g02-si-strip" l={45} t={36} w={9} h={20} d={430} st={{ background: "#a0c8d8", transformOrigin: "50% 0%" }} />
      <L c="g02-si-smooth" l={44} t={38} w={11} h={2} d={580} st={{ background: "linear-gradient(90deg, transparent, #fff3d4, transparent)" }} />
      <L c="g02-si-tear" l={45} t={55} w={9} h={4} d={680} st={{ background: "#fff3d4", border: "1px solid #142430", transformOrigin: "0% 0%" }} />
      <L c="g02-leanshadow" l={42} t={60} w={16} h={3} d={720} st={{ borderRadius: "999px", background: "rgba(20,36,48,0.62)" }} />
    </Lead>
  );
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

export const PLAYS: Record<string, SigPlugin> = {
  bn4_uphill_battle: S(UphillBattleScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage", anchor: "cast" }),
  bn4_wardens_retirement: S(WardensRetirementScene, { ordering: "file", staggerMs: 70, victims: "all", hasLead: true, sound: "clockcage", anchor: "cast" }),
  hx4_iron_portcullis: S(IronPortcullisScene, { ordering: "octagon", staggerMs: 55, victims: "all", hasLead: true, sound: "clockice", anchor: "cast" }),
  ov_patient_grift: S(PatientGriftScene, { ordering: "file", staggerMs: 80, victims: "all", hasLead: true, sound: "blitz", anchor: "cast" }),
  bn4_diplomatic_pouch: S(DiplomaticPouchScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "cast" }),
  bn4_double_pardon: S(DoublePardonScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast" }),
  bn4_guards_change: S(GuardsChangeScene, { ordering: "file", staggerMs: 70, victims: "all", hasLead: true, sound: "clockcage", anchor: "cast" }),
  bn4_hidden_clause: S(HiddenClauseScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "cast" }),
  bn4_hollow_crown: S(HollowCrownScene, { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "clockice", anchor: "cast" }),
  bn4_long_holiday: S(LongHolidayScene, { ordering: "octagon", staggerMs: 60, victims: "all", hasLead: true, sound: "snooze", anchor: "cast" }),
  bn4_masons_lodge: S(MasonsLodgeScene, { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "cathedral", anchor: "cast" }),
  bn4_ministers_seal: S(MinistersSealScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "cast" }),
  bn4_out_on_bail: S(OutOnBailScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "blitz", anchor: "cast" }),
  bn4_pillars_of_home: S(PillarsOfHomeScene, { ordering: "line", staggerMs: 80, victims: ["r"], hasLead: true, sound: "cathedral", anchor: "cast" }),
  bn4_quiet_coup: S(QuietCoupScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "cast" }),
  bn4_relief_column: S(ReliefColumnScene, { ordering: "line", staggerMs: 85, victims: ["r", "b", "n"], hasLead: true, sound: "blitz", anchor: "aim" }),
  bn4_rule_of_three: S(RuleOfThreeScene, { ordering: "radial", staggerMs: 65, victims: "all", hasLead: true, sound: "clockcage", anchor: "cast" }),
  bn4_spymasters_leave: S(SpymastersLeaveScene, { ordering: "octagon", staggerMs: 50, victims: "all", hasLead: true, sound: "snooze", anchor: "cast" }),
  bn4_tower_toll: S(TowerTollScene, { ordering: "line", staggerMs: 75, victims: ["r"], hasLead: true, sound: "cathedral", anchor: "aim" }),
  hx4_sleepwalkers: S(SleepwalkersScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "snooze", anchor: "aim" }),
  bn4_gentlemens_agreement: S(GentlemensAgreementScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "cast" }),
  bn4_harvest_and_fallow: S(HarvestAndFallowScene, { ordering: "line", staggerMs: 75, victims: "all", hasLead: true, sound: "snooze", anchor: "aim" }),
  bn4_heavy_price: S(HeavyPriceScene, { ordering: "radial", staggerMs: 60, victims: ["r", "q"], hasLead: true, sound: "clockice", anchor: "cast" }),
  bn4_kings_indulgence: S(KingsIndulgenceScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "cast" }),
  bn4_leave_of_absence: S(LeaveOfAbsenceScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "cast" }),
  bn4_open_season: S(OpenSeasonScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "blitz", anchor: "cast" }),
  bn4_retraining: S(RetrainingScene, { ordering: "radial", staggerMs: 0, victims: ["n", "b"], hasLead: true, sound: "clockice", anchor: "cast" }),
  bn4_royal_household: S(RoyalHouseholdScene, { ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "cathedral", anchor: "cast" }),
  bn4_royal_writ: S(RoyalWritScene, { ordering: "radial", staggerMs: 60, victims: ["k"], hasLead: true, sound: "cathedral", anchor: "cast" }),
  bn4_salt_in_the_wound: S(SaltInTheWoundScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "cast" }),
  bn4_scapegoat: S(ScapegoatScene, { ordering: "line", staggerMs: 70, victims: ["n", "b"], hasLead: true, sound: "clockice", anchor: "aim" }),
  bn4_veterans_pension: S(VeteransPensionScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", anchor: "cast" }),
};
