// g12ClockworkPlays — bespoke plays for the 27 tempo / engine cards that used
// to share the generated `clockwork` family (one gear, 27 hue shifts).
//
// MODULE FICTION: MECHANISM DOING WORK. Never a gear on its own. Every card is
// a different piece of machinery engaging and producing an effect: a Geneva
// plate indexing, an escapement pawl slipping back a tooth, a bellows squeezed
// against its relief valve, cam lobes shoving punch rods, a signal-box lever
// frame thrown to danger, a governor throwing its flyballs out, a punch card
// read by dropping pins, a lathe peeling a curl of swarf, a screw press
// extruding, a bucket elevator overtopping, a coin escapement kicking a flag.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g12ClockworkPlays.css), transform/opacity animations only, no imports
// from BoardEffects.tsx, only the SigPlugin/SigRole TYPES from sigPlugins.tsx.
//
// STAGING. Every card declares anchor "cast" or "aim", so the machine runs on
// the square the card was played on. Board-scale layers (the shop-floor wash,
// the edge rail) live inside <BoardFrame>, never at a fixed percentage of the
// stage. Cards whose mechanism TRANSPORTS something (a chain drive, a conveyor,
// a tape run, a line paid out, a bar in a lathe, a pointer) use <AimStage> and
// author their art pointing RIGHT.
//
// Every scene runs three beats — tell, strike, settle — in all three roles
// ("lead", "target", "entrance"), and every lead carries at least one animated
// layer driven by the geometry vars (--fx-len run length, --fx-ox/--fx-oy
// lean, --fx-side feed direction), which is what makes the play directional
// rather than decorative. All CSS lives in g12ClockworkPlays.css behind the
// `g12-` prefix.

import "./g12ClockworkPlays.css";

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
const rootStyle = (d: number): CSSProperties => ({ "--g12-d": `${d}ms` }) as CSSProperties;

/** stagger + a beat offset, scaled by the Settings animation-speed var. */
const b = (ms: number): string => `calc(var(--g12-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

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

/** Cast-anchored lead: the machine on the cast square, `frame` over the board. */
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

/** Board-wide shop-floor wash, always inside a BoardFrame. */
function Wash({ tone, d = 0 }: { tone: string; d?: number }) {
  return <L c="g12-wash" d={d} st={{ background: `radial-gradient(circle at 50% 48%, ${tone}, transparent 70%)` }} />;
}

/** Board-edge machine rail, always inside a BoardFrame. */
function Rail({ tone, d = 150 }: { tone: string; d?: number }) {
  return <L c="g12-rail" d={d} st={{ boxShadow: `inset 0 0 28px 8px ${tone}` }} />;
}

/* Shorthand for the loose grit every one of these machines throws. */
function Grit({ tone, at, top = 56, d = 700 }: { tone: string; at: number[]; top?: number; d?: number }) {
  return (
    <>
      {at.map((x, i) => (
        <L key={x} c="g12-grit" l={x} t={top} w={1.5} h={1.5} d={d + i * 100} st={{ borderRadius: "50%", background: tone }} />
      ))}
    </>
  );
}

/* =============================================================================
   1 - 27. One mechanism per card.
   ========================================================================== */

/* --- 1. Board of Directors (t8) — THE GENEVA INDEX PLATE --------------------
   The driver crank swings its pin into a slot, the four-station plate snaps
   round a quarter turn and stops dead, two of the four department dies drop
   into their sockets, and an inked seal presses the minute.
   Palette: #e8b64c / #fff2cf / #2a2011. */
function BoardOfDirectorsScene({ role, delayMs }: SceneProps) {
  const plate = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="9.4" fill="#2a2011" stroke="#e8b64c" strokeWidth="1.4" />
      <path d="M12 2.8v5M21.2 12h-5M12 21.2v-5M2.8 12h5" stroke="#e8b64c" strokeWidth="2.4" />
      <circle cx="12" cy="12" r="2.4" fill="#e8b64c" />
    </g>
  );
  const driver = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="6" fill="none" stroke="#e8b64c" strokeWidth="1.5" />
      <path d="M12 12h6.2" stroke="#e8b64c" strokeWidth="2" />
      <circle cx="19" cy="12" r="1.9" fill="#fff2cf" />
    </g>
  );
  const die = (
    <g {...SJ}>
      <rect x="3" y="7" width="18" height="10" rx="1" fill="#fff2cf" stroke="#2a2011" strokeWidth="1.2" />
      <path d="M6.4 11h11M6.4 14h7" stroke="#2a2011" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g12-bd-plate" l={16} t={16} w={68} h={68} d={60}>{plate}</V>
        <V c="g12-bd-driver" l={44} t={30} w={42} h={42} d={40}>{driver}</V>
        <V c="g12-ent-drop" l={26} t={34} w={48} h={30} d={420}>{die}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g12-hit" l={14} t={14} w={72} h={72} d={0}>{plate}</V>
        <V c="g12-hitside" l={24} t={36} w={52} h={30} d={150}>{die}</V>
        <L c="g12-hit2" l={44} t={44} w={12} h={12} d={280} st={{ borderRadius: "50%", background: "#fff2cf" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(232,182,76,0.28)" /><Rail tone="rgba(255,242,207,0.34)" /></>}>
      <V c="g12-bd-driver" l={52} t={40} w={13} h={13} d={70}>{driver}</V>
      <V c="g12-bd-plate" l={40} t={38} w={17} h={17} d={260}>{plate}</V>
      {[0, 1].map((i) => (
        <V key={i} c="g12-bd-seat" l={38 + i * 15} t={33 + i * 20} w={12} h={7} d={420 + i * 110}>{die}</V>
      ))}
      <L c="g12-leanshadow" l={40} t={53} w={18} h={3} d={430} st={{ borderRadius: "999px", background: "rgba(42,32,17,0.7)" }} />
      <V c="g12-bd-stamp" l={44} t={42} w={9} h={9} d={640}>
        <g {...SJ}>
          <path d="M8 3h8v6h2.4v4H5.6V9H8z" fill="#e8b64c" stroke="#2a2011" strokeWidth="1.1" />
          <path d="M5 15h14v3.4H5z" fill="#2a2011" stroke="#e8b64c" strokeWidth="1" />
        </g>
      </V>
      <Grit tone="#e8b64c" at={[41, 48, 55]} top={54} d={720} />
    </Lead>
  );
}

/* --- 2. Deja Vu (t8) — THE PAWL SLIPS BACK A TOOTH --------------------------
   The escape wheel runs on, the pawl lifts on its spring, the wheel slips
   BACK one tooth and the pawl drops in again with a click, leaving a ghost
   of the tooth it already counted. Palette: #7fc8e8 / #fff2d8 / #12242e. */
function DejaVuScene({ role, delayMs }: SceneProps) {
  const wheel = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="8.6" fill="none" stroke="#7fc8e8" strokeWidth="3" strokeDasharray="1.8 3" />
      <circle cx="12" cy="12" r="3.2" fill="#12242e" stroke="#7fc8e8" strokeWidth="1.3" />
      <circle cx="12" cy="12" r="1" fill="#fff2d8" />
    </g>
  );
  const pawl = (
    <g {...SJ}>
      <path d="M2.4 5.6l9.6 5.6 2 3.6-3.8-1.4-8-5.4z" fill="#fff2d8" stroke="#12242e" strokeWidth="1" />
      <path d="M2.4 5.6C6 3.4 8 4 9.2 6.2" fill="none" stroke="#7fc8e8" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g12-dv-wheel" l={14} t={14} w={70} h={70} d={50}>{wheel}</V>
        <V c="g12-dv-pawl" l={40} t={6} w={54} h={40} d={280} st={{ transformOrigin: "12% 20%" }}>{pawl}</V>
        <V c="g12-dv-ghost" l={14} t={14} w={70} h={70} d={470}>{wheel}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g12-hit" l={12} t={12} w={76} h={76} d={0}>{wheel}</V>
        <V c="g12-hitside" l={38} t={8} w={56} h={42} d={140} st={{ transformOrigin: "12% 20%" }}>{pawl}</V>
        <V c="g12-dv-ghost" l={12} t={12} w={76} h={76} d={270}>{wheel}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(127,200,232,0.26)" /><Rail tone="rgba(255,242,216,0.28)" /></>}>
      <V c="g12-dv-wheel" l={40} t={38} w={19} h={19} d={90}>{wheel}</V>
      <V c="g12-dv-pawl" l={52} t={32} w={14} h={11} d={300} st={{ transformOrigin: "12% 20%" }}>{pawl}</V>
      <V c="g12-dv-ghost" l={40} t={38} w={19} h={19} d={520}>{wheel}</V>
      <L c="g12-dv-click" l={51} t={41} w={5} h={5} d={540} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,216,0.9), transparent 70%)" }} />
      <L c="g12-drive" l={44} t={49.2} w={26} h={1.6} d={180} st={{ transformOrigin: "0% 50%", borderRadius: "999px", background: "linear-gradient(90deg, #7fc8e8, rgba(127,200,232,0))" }} />
      <V c="g12-dv-tooth" l={45} t={44} w={9} h={9} d={660}>
        <path d="M12 3l2.6 6H9.4z" fill="#fff2d8" />
      </V>
      <Grit tone="#7fc8e8" at={[43, 50, 57]} top={53} d={720} />
    </Lead>
  );
}

/* --- 3. Genie Lamp (t7) — THE BELLOWS AND ITS RELIEF VALVE ------------------
   The bellows is trodden flat, the gauge needle slams round to the peg, the
   relief valve lifts off its seat and vents one hard jet of vapour, then the
   pleats sigh open again. Palette: #6fd6c0 / #fff4d6 / #14312c. */
function GenieLampScene({ role, delayMs }: SceneProps) {
  const bellows = (
    <g {...SJ}>
      <path d="M3.6 6.8l13.4-3.6v17.6L3.6 17.2z" fill="#14312c" stroke="#6fd6c0" strokeWidth="1.3" />
      <path d="M7 6.2v11.6M10.2 5.4v13.2M13.4 4.6v14.8" stroke="#6fd6c0" strokeWidth="0.9" />
      <path d="M17 9.4h4.4v5.2H17z" fill="#6fd6c0" />
    </g>
  );
  const gauge = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="8.4" fill="#14312c" stroke="#6fd6c0" strokeWidth="1.4" />
      <path d="M12 12l5.4-3.6" stroke="#fff4d6" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="1.4" fill="#fff4d6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g12-gn-bellow" l={6} t={26} w={58} h={50} d={60} st={{ transformOrigin: "10% 50%" }}>{bellows}</V>
        <V c="g12-gn-needle" l={56} t={20} w={36} h={36} d={300}>{gauge}</V>
        <V c="g12-gn-jet" l={58} t={54} w={38} h={30} d={470} st={{ transformOrigin: "0% 50%" }}>
          <path d="M1 12l16-6.4v12.8z" fill="#6fd6c0" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g12-hit" l={8} t={24} w={58} h={54} d={0} st={{ transformOrigin: "10% 50%" }}>{bellows}</V>
        <V c="g12-hitside" l={56} t={22} w={38} h={38} d={150}>{gauge}</V>
        <L c="g12-hit2" l={62} t={58} w={14} h={14} d={280} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(111,214,192,0.26)" /><Rail tone="rgba(255,244,214,0.3)" /></>}>
      <V c="g12-gn-bellow" l={38} t={41} w={16} h={13} d={100} st={{ transformOrigin: "10% 50%" }}>{bellows}</V>
      <V c="g12-gn-needle" l={53} t={39} w={10} h={10} d={340}>{gauge}</V>
      <V c="g12-gn-valve" l={45} t={34} w={7} h={7} d={470}>
        <g {...SJ}>
          <path d="M6 14h12l-2.4-6H8.4z" fill="#6fd6c0" stroke="#14312c" strokeWidth="1.1" />
          <path d="M12 8V2.6" stroke="#6fd6c0" strokeWidth="2" />
        </g>
      </V>
      <V c="g12-gn-jet" l={47} t={26} w={12} h={11} d={540} st={{ transformOrigin: "50% 100%" }}>
        <path d="M12 1l6 20H6z" fill="#fff4d6" />
      </V>
      <L c="g12-shaft" l={45} t={20} w={9} h={26} d={560} st={{ transformOrigin: "50% 100%", background: "linear-gradient(0deg, rgba(111,214,192,0.6), transparent)" }} />
      <Grit tone="#fff4d6" at={[45, 51, 57]} top={30} d={700} />
    </Lead>
  );
}

/* --- 4. Chess Boxing (t7) — THE CAM LOBES SHOVE THE PUNCH RODS --------------
   Two lobes on one shaft come round out of phase: the near rod is shoved out
   and returns on its spring, then the far rod lands and the whole frame
   judders. Palette: #ff9a6e / #fff2d6 / #331612. */
function ChessBoxingScene({ role, delayMs }: SceneProps) {
  const cam = (
    <g {...SJ}>
      <path d="M6.6 12a5.4 5.4 0 0 1 5.4-5.4c4.8 0 9 1.5 9 3.5s-4.2 7.3-9 7.3A5.4 5.4 0 0 1 6.6 12z" fill="#331612" stroke="#ff9a6e" strokeWidth="1.3" />
      <circle cx="12" cy="12" r="1.6" fill="#ff9a6e" />
    </g>
  );
  const rod = (
    <g {...SJ}>
      <rect x="1" y="9.4" width="13" height="5.2" rx="1" fill="#331612" stroke="#ff9a6e" strokeWidth="1.1" />
      <circle cx="18" cy="12" r="5" fill="#ff9a6e" stroke="#331612" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g12-cb-cam" l={8} t={26} w={48} h={48} d={60}>{cam}</V>
        <V c="g12-cb-rod" l={38} t={16} w={58} h={34} d={300}>{rod}</V>
        <V c="g12-cb-rod2" l={38} t={52} w={58} h={34} d={480}>{rod}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g12-hit" l={4} t={24} w={52} h={52} d={0}>{cam}</V>
        <V c="g12-hitside" l={34} t={30} w={62} h={38} d={140}>{rod}</V>
        <L c="g12-hit2" l={70} t={38} w={22} h={22} d={280} st={{ borderRadius: "50%", border: "2px solid #fff2d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(255,154,110,0.28)" /><Rail tone="rgba(255,242,214,0.3)" /></>}>
      <V c="g12-cb-cam" l={41} t={39} w={14} h={14} d={90}>{cam}</V>
      <L c="g12-cb-spring" l={38} t={44.6} w={9} h={2.6} d={230} st={{ transformOrigin: "100% 50%", background: "repeating-linear-gradient(90deg, #ff9a6e 0 2px, transparent 2px 4px)" }} />
      <V c="g12-cb-rod" l={50} t={35} w={16} h={9} d={330}>{rod}</V>
      <V c="g12-cb-rod2" l={50} t={47} w={16} h={9} d={520}>{rod}</V>
      <L c="g12-cb-shock" l={57} t={42} w={9} h={9} d={560} st={{ borderRadius: "50%", border: "2px solid #fff2d6" }} />
      <L c="g12-leanshadow" l={40} t={55} w={20} h={3} d={580} st={{ borderRadius: "999px", background: "rgba(51,22,18,0.72)" }} />
      <Grit tone="#ff9a6e" at={[52, 58, 64]} top={52} d={700} />
    </Lead>
  );
}

/* --- 5. Mod Powers (t7) — THE LEVER FRAME GOES TO DANGER --------------------
   Three levers are pulled over in the frame one after another, the
   interlocking bar drops across them so nothing else can be moved, and the
   semaphore arm outside falls to stop. Palette: #e0b23c / #fff4d6 / #1a1a12. */
function ModPowersScene({ role, delayMs }: SceneProps) {
  const lever = (
    <g {...SJ}>
      <path d="M12 21V5" stroke="#e0b23c" strokeWidth="2.8" />
      <path d="M10 3.4h4v3.4h-4z" fill="#fff4d6" stroke="#1a1a12" strokeWidth="1" />
    </g>
  );
  const semaphore = (
    <g {...SJ}>
      <path d="M4 22V2" stroke="#e0b23c" strokeWidth="2.2" />
      <rect x="5" y="4.4" width="15" height="3.6" rx="1" fill="#fff4d6" stroke="#1a1a12" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g12-mp-frame" l={8} t={72} w={84} h={7} d={50} st={{ background: "#1a1a12", borderRadius: "1px", transformOrigin: "0% 50%" }} />
        <V c="g12-mp-lever" l={20} t={22} w={26} h={54} d={260} st={{ transformOrigin: "50% 92%" }}>{lever}</V>
        <V c="g12-mp-arm" l={54} t={12} w={40} h={44} d={470} st={{ transformOrigin: "12% 22%" }}>{semaphore}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g12-hit" l={16} t={18} w={30} h={64} d={0} st={{ transformOrigin: "50% 92%" }}>{lever}</V>
        <V c="g12-hitside" l={48} t={14} w={44} h={48} d={150} st={{ transformOrigin: "12% 22%" }}>{semaphore}</V>
        <L c="g12-hit2" l={40} t={72} w={22} h={4} d={280} st={{ borderRadius: "999px", background: "#e0b23c" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(224,178,60,0.26)" /><Rail tone="rgba(255,244,214,0.3)" /></>}>
      <L c="g12-mp-frame" l={40} t={54} w={22} h={2.4} d={90} st={{ background: "#1a1a12", borderRadius: "1px", transformOrigin: "0% 50%" }} />
      {[0, 1, 2].map((i) => (
        <V key={i} c="g12-mp-lever" l={41 + i * 5} t={42} w={5} h={13} d={260 + i * 130} st={{ transformOrigin: "50% 92%" }}>{lever}</V>
      ))}
      <L c="g12-mp-bar" l={39} t={45} w={24} h={1.6} d={620} st={{ background: "#e0b23c", borderRadius: "999px" }} />
      <V c="g12-mp-arm" l={56} t={34} w={12} h={13} d={660} st={{ transformOrigin: "12% 22%" }}>{semaphore}</V>
      <L c="g12-drive" l={44} t={51} w={24} h={1.4} d={200} st={{ transformOrigin: "0% 50%", borderRadius: "999px", background: "linear-gradient(90deg, #e0b23c, rgba(224,178,60,0))" }} />
      <Grit tone="#e0b23c" at={[42, 48, 55]} top={57} d={720} />
    </Lead>
  );
}

/* --- 6. Relay Baton (t6) — THE CHAIN DRIVE HANDS THE PIN ON -----------------
   A roller chain runs the source-to-target leg over a sprocket; the tensioner
   nods, a link pin is driven out and handed to the next link, and the chain
   runs on. Aim-staged. Palette: #cfd8e0 / #fff1d2 / #1a2129. */
function RelayBatonScene({ role, delayMs }: SceneProps) {
  const sprocket = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="7.4" fill="#1a2129" stroke="#cfd8e0" strokeWidth="2.6" strokeDasharray="2 2.6" />
      <circle cx="12" cy="12" r="2.4" fill="#cfd8e0" />
    </g>
  );
  const link = (
    <g {...SJ}>
      <rect x="2" y="8" width="20" height="8" rx="1" fill="#1a2129" stroke="#cfd8e0" strokeWidth="1.3" />
      <circle cx="7" cy="12" r="2" fill="#cfd8e0" />
      <circle cx="17" cy="12" r="2" fill="#cfd8e0" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g12-rb-sprocket" l={4} t={22} w={50} h={50} d={60}>{sprocket}</V>
        <V c="g12-rb-link" l={40} t={36} w={52} h={22} d={300}>{link}</V>
        <V c="g12-rb-pin" l={62} t={30} w={26} h={26} d={480}>
          <circle cx="12" cy="12" r="6" fill="#fff1d2" stroke="#1a2129" strokeWidth="1.6" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g12-hit" l={8} t={22} w={54} h={54} d={0}>{sprocket}</V>
        <V c="g12-hitside" l={36} t={38} w={58} h={24} d={150}>{link}</V>
        <L c="g12-hit2" l={62} t={42} w={14} h={14} d={280} st={{ borderRadius: "50%", background: "#fff1d2" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(207,216,224,0.24)" /><Rail tone="rgba(255,241,210,0.28)" /></>}>
      <L c="g12-drive" l={44} t={48.4} w={30} h={2.4} d={80} st={{ transformOrigin: "0% 50%", borderRadius: "999px", background: "repeating-linear-gradient(90deg, #cfd8e0 0 4px, rgba(207,216,224,0.15) 4px 8px)" }} />
      <V c="g12-rb-sprocket" l={40} t={43} w={12} h={12} d={220}>{sprocket}</V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g12-rb-link" l={49 + i * 6} t={46} w={7} h={5} d={330 + i * 120}>{link}</V>
      ))}
      <V c="g12-rb-tension" l={45} t={52} w={7} h={7} d={300} st={{ transformOrigin: "50% 100%" }}>
        <circle cx="12" cy="12" r="6.4" fill="none" stroke="#cfd8e0" strokeWidth="2.4" strokeDasharray="2 2.4" />
      </V>
      <V c="g12-rb-pin" l={60} t={45.4} w={4.6} h={4.6} d={660}>
        <circle cx="12" cy="12" r="7" fill="#fff1d2" stroke="#1a2129" strokeWidth="2" />
      </V>
      <Grit tone="#cfd8e0" at={[48, 55, 62]} top={53} d={720} />
    </AimLead>
  );
}

/* --- 7. Democracy (t6) — THE CENTRIFUGAL GOVERNOR ---------------------------
   The spindle is brought up to speed, the flyballs swing out on their arms,
   the sleeve climbs the column and tips the throttle arm over. When the house
   is done the balls fall back in. Palette: #7fc98d / #fff3d4 / #14291a. */
function DemocracyScene({ role, delayMs }: SceneProps) {
  const arms = (
    <g {...SJ}>
      <path d="M12 4L4.6 14M12 4l7.4 10" stroke="#7fc98d" strokeWidth="1.8" />
      <circle cx="4.6" cy="15" r="3" fill="#7fc98d" stroke="#14291a" strokeWidth="1.1" />
      <circle cx="19.4" cy="15" r="3" fill="#7fc98d" stroke="#14291a" strokeWidth="1.1" />
      <path d="M12 2.4v3" stroke="#fff3d4" strokeWidth="2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g12-dm-spindle" l={47} t={16} w={6} h={64} d={50} st={{ background: "linear-gradient(180deg, #7fc98d, #14291a)", borderRadius: "1px" }} />
        <V c="g12-dm-ball" l={16} t={12} w={68} h={54} d={280} st={{ transformOrigin: "50% 16%" }}>{arms}</V>
        <L c="g12-dm-sleeve" l={38} t={56} w={24} h={7} d={480} st={{ background: "#fff3d4", borderRadius: "1px" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g12-hit" l={14} t={10} w={72} h={58} d={0} st={{ transformOrigin: "50% 16%" }}>{arms}</V>
        <L c="g12-hitside" l={36} t={58} w={28} h={8} d={150} st={{ background: "#fff3d4", borderRadius: "1px" }} />
        <L c="g12-hit2" l={44} t={74} w={12} h={12} d={280} st={{ borderRadius: "50%", background: "#7fc98d" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(127,201,141,0.26)" /><Rail tone="rgba(255,243,212,0.3)" /></>}>
      <L c="g12-dm-spindle" l={48.6} t={36} w={2.4} h={20} d={100} st={{ background: "linear-gradient(180deg, #7fc98d, #14291a)", borderRadius: "1px" }} />
      <V c="g12-dm-ball" l={41} t={35} w={18} h={14} d={280} st={{ transformOrigin: "50% 16%" }}>{arms}</V>
      <L c="g12-dm-sleeve" l={46} t={46} w={8} h={2.2} d={470} st={{ background: "#fff3d4", borderRadius: "1px" }} />
      <L c="g12-dm-throttle" l={50} t={47} w={11} h={1.8} d={560} st={{ transformOrigin: "0% 50%", background: "#7fc98d", borderRadius: "999px" }} />
      <L c="g12-leanshadow" l={43} t={55} w={16} h={2.6} d={520} st={{ borderRadius: "999px", background: "rgba(20,41,26,0.7)" }} />
      <Grit tone="#fff3d4" at={[44, 50, 56]} top={52} d={700} />
    </Lead>
  );
}

/* --- 8. Dev Console (t6) — THE PUNCH CARD IS READ ---------------------------
   A card feeds in from the caster's own side, the platen roller drags it under
   the read head, the sensing pins drop and the holes they find light up one
   column at a time. Palette: #6fe0a0 / #fff4d6 / #0f2418. */
function DevConsoleScene({ role, delayMs }: SceneProps) {
  const card = (
    <g {...SJ}>
      <path d="M2 4h16.4L22 7.4V20H2z" fill="#fff4d6" stroke="#0f2418" strokeWidth="1.2" />
      <rect x="5" y="8" width="2.4" height="1.6" fill="#0f2418" />
      <rect x="9" y="8" width="2.4" height="1.6" fill="#0f2418" />
      <rect x="13" y="12" width="2.4" height="1.6" fill="#0f2418" />
      <rect x="5" y="15" width="2.4" height="1.6" fill="#0f2418" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g12-feedin" l={10} t={22} w={72} h={54} d={60}>{card}</V>
        <L c="g12-dc-pin" l={30} t={6} w={3} h={26} d={300} st={{ background: "#6fe0a0", borderRadius: "1px", transformOrigin: "50% 0%" }} />
        <L c="g12-dc-hole" l={44} t={40} w={10} h={7} d={480} st={{ background: "#6fe0a0", borderRadius: "1px" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g12-hitside" l={8} t={20} w={76} h={58} d={0}>{card}</V>
        <L c="g12-hit" l={34} t={10} w={4} h={30} d={150} st={{ background: "#6fe0a0", borderRadius: "1px", transformOrigin: "50% 0%" }} />
        <L c="g12-hit2" l={46} t={44} w={12} h={8} d={280} st={{ background: "#fff4d6", borderRadius: "1px" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(111,224,160,0.26)" /><Rail tone="rgba(255,244,214,0.28)" /></>}>
      <V c="g12-feedin" l={39} t={41} w={20} h={13} d={100}>{card}</V>
      <V c="g12-dc-roll" l={37} t={45} w={6} h={6} d={260}>
        <circle cx="12" cy="12" r="8.4" fill="#0f2418" stroke="#6fe0a0" strokeWidth="2" strokeDasharray="3 3" />
      </V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g12-dc-pin" l={46 + i * 3.6} t={36} w={0.9} h={7} d={370 + i * 110} st={{ background: "#6fe0a0", borderRadius: "1px", transformOrigin: "50% 0%" }} />
      ))}
      <L c="g12-dc-hole" l={46} t={44} w={11} h={1.6} d={620} st={{ background: "#fff4d6", borderRadius: "1px" }} />
      <L c="g12-dc-line" l={42} t={52} w={18} h={1.2} d={700} st={{ background: "linear-gradient(90deg, #6fe0a0, rgba(111,224,160,0))", borderRadius: "999px", transformOrigin: "0% 50%" }} />
      <Grit tone="#6fe0a0" at={[44, 50, 56]} top={56} d={740} />
    </Lead>
  );
}

/* --- 9. NerfChess: The Musical (t6) — THE PINNED BARREL PLUCKS THE COMB -----
   The crank is wound, the pinned barrel turns, and its pins lift and let go
   of the comb tines one after another; the notes float off while the barrel
   coasts to a stop. Palette: #e88ab8 / #fff2d9 / #2a1224. */
function MusicalScene({ role, delayMs }: SceneProps) {
  const barrel = (
    <g {...SJ}>
      <rect x="2" y="7" width="20" height="10" rx="1" fill="#2a1224" stroke="#e88ab8" strokeWidth="1.3" />
      <circle cx="6.4" cy="10" r="1" fill="#e88ab8" />
      <circle cx="11" cy="13.4" r="1" fill="#e88ab8" />
      <circle cx="15.4" cy="9.4" r="1" fill="#e88ab8" />
      <circle cx="19" cy="13" r="1" fill="#e88ab8" />
    </g>
  );
  const comb = (
    <g {...SJ} stroke="#e88ab8">
      <path d="M2 3h20" strokeWidth="2" />
      <path d="M4 3v6M8 3v9M12 3v12M16 3v15M20 3v18" strokeWidth="1.6" />
    </g>
  );
  const note = <path d="M9 3v12.4a3 3 0 1 1-2-2.8V5.6l8-2v9.4a3 3 0 1 1-2-2.8V3z" fill="#fff2d9" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g12-ms-barrel" l={8} t={40} w={70} h={36} d={60}>{barrel}</V>
        <V c="g12-ms-tine" l={20} t={8} w={60} h={34} d={300} st={{ transformOrigin: "50% 0%" }}>{comb}</V>
        <V c="g12-ent-mote" l={56} t={8} w={26} h={26} d={480}>{note}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g12-hit" l={6} t={42} w={76} h={38} d={0}>{barrel}</V>
        <V c="g12-hitside" l={18} t={6} w={64} h={36} d={150} st={{ transformOrigin: "50% 0%" }}>{comb}</V>
        <V c="g12-hit2" l={54} t={8} w={28} h={28} d={280}>{note}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(232,138,184,0.26)" /><Rail tone="rgba(255,242,217,0.3)" /></>}>
      <V c="g12-ms-crank" l={36} t={44} w={6} h={6} d={90} st={{ transformOrigin: "50% 50%" }}>
        <g {...SJ}><circle cx="12" cy="12" r="3" fill="none" stroke="#e88ab8" strokeWidth="1.6" /><path d="M12 12h7.4v4" stroke="#e88ab8" strokeWidth="2" /></g>
      </V>
      <V c="g12-ms-barrel" l={41} t={44} w={18} h={9} d={250}>{barrel}</V>
      <V c="g12-ms-tine" l={43} t={36} w={15} h={8} d={380} st={{ transformOrigin: "50% 0%" }}>{comb}</V>
      <L c="g12-shaft" l={45} t={26} w={10} h={20} d={480} st={{ transformOrigin: "50% 100%", background: "linear-gradient(0deg, rgba(232,138,184,0.6), transparent)" }} />
      {[0, 1, 2].map((i) => (
        <V key={i} c="g12-ms-note" l={44 + i * 5} t={34} w={5} h={6} d={580 + i * 120}>{note}</V>
      ))}
      <Grit tone="#fff2d9" at={[43, 50, 57]} top={38} d={760} />
    </Lead>
  );
}

/* --- 10. Standing Ovation (t6) — THE PANTOGRAPH LIFT ------------------------
   The lazy-tong linkage under the seating unfolds: the base rail takes the
   load, the scissor arms straighten, the deck rises on its strut from the
   caster's own side, and the pin joints flash as they lock.
   Palette: #f0c45c / #fff4d6 / #2b2311. */
function StandingOvationScene({ role, delayMs }: SceneProps) {
  const scissor = (
    <g {...SJ} stroke="#f0c45c" strokeWidth="2.2">
      <path d="M3 21L21 4M21 21L3 4" />
      <circle cx="12" cy="12.5" r="1.6" fill="#2b2311" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g12-so-base" l={10} t={80} w={80} h={6} d={50} st={{ background: "#2b2311", borderRadius: "1px", transformOrigin: "50% 100%" }} />
        <V c="g12-so-scissor" l={22} t={24} w={56} h={56} d={280} st={{ transformOrigin: "50% 100%" }}>{scissor}</V>
        <L c="g12-so-deck" l={14} t={14} w={72} h={8} d={470} st={{ background: "#f0c45c", borderRadius: "1px" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g12-hit" l={20} t={20} w={60} h={62} d={0} st={{ transformOrigin: "50% 100%" }}>{scissor}</V>
        <L c="g12-hitside" l={12} t={10} w={76} h={9} d={150} st={{ background: "#f0c45c", borderRadius: "1px" }} />
        <L c="g12-hit2" l={44} t={44} w={12} h={12} d={280} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(240,196,92,0.26)" /><Rail tone="rgba(255,244,214,0.32)" /></>}>
      <L c="g12-so-base" l={40} t={54} w={20} h={1.8} d={100} st={{ background: "#2b2311", borderRadius: "1px", transformOrigin: "50% 100%" }} />
      <V c="g12-so-scissor" l={43} t={40} w={14} h={15} d={280} st={{ transformOrigin: "50% 100%" }}>{scissor}</V>
      <L c="g12-so-strut" l={49} t={44} w={1.6} h={11} d={330} st={{ background: "#fff4d6", borderRadius: "999px", transformOrigin: "50% 100%" }} />
      <L c="g12-feedin" l={41} t={37} w={18} h={2.6} d={520} st={{ background: "#f0c45c", borderRadius: "1px" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g12-so-pin" l={45 + i * 8} t={43} w={2} h={2} d={620 + i * 110} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
      <Grit tone="#f0c45c" at={[42, 49, 56]} top={51} d={720} />
    </Lead>
  );
}

/* --- 11. The Tutorial (t6) — THE CHART RECORDER -----------------------------
   The paper drum turns, the pen arm swings down onto it and draws the trace
   out along the play's own leg, and the review bell nods every time the arm
   reaches the margin. Palette: #7fd0e8 / #fff4d6 / #16262e. */
function TutorialScene({ role, delayMs }: SceneProps) {
  const drum = (
    <g {...SJ}>
      <rect x="2.4" y="5" width="19.2" height="14" rx="1" fill="#16262e" stroke="#7fd0e8" strokeWidth="1.3" />
      <path d="M5.6 8h13M5.6 11.4h13M5.6 14.8h9" stroke="#7fd0e8" strokeWidth="0.9" />
    </g>
  );
  const pen = (
    <g {...SJ}>
      <path d="M22 3L9.4 12.6" stroke="#7fd0e8" strokeWidth="2.2" />
      <circle cx="8.6" cy="13.4" r="1.8" fill="#fff4d6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g12-tt-drum" l={10} t={30} w={72} h={48} d={60}>{drum}</V>
        <V c="g12-tt-pen" l={30} t={6} w={62} h={54} d={290} st={{ transformOrigin: "92% 8%" }}>{pen}</V>
        <L c="g12-tt-trace" l={22} t={58} w={48} h={2.4} d={470} st={{ background: "#fff4d6", borderRadius: "999px", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g12-hit" l={8} t={28} w={76} h={50} d={0}>{drum}</V>
        <V c="g12-hitside" l={28} t={4} w={66} h={56} d={150} st={{ transformOrigin: "92% 8%" }}>{pen}</V>
        <L c="g12-hit2" l={20} t={58} w={54} h={3} d={280} st={{ background: "#fff4d6", borderRadius: "999px", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(127,208,232,0.26)" /><Rail tone="rgba(255,244,214,0.28)" /></>}>
      <V c="g12-tt-drum" l={39} t={41} w={20} h={13} d={110}>{drum}</V>
      <V c="g12-tt-paper" l={41} t={43} w={16} h={8} d={260} st={{ transformOrigin: "0% 50%" }}>
        <path d="M2 6h20v12H2z" fill="#fff4d6" opacity="0.9" />
      </V>
      <V c="g12-tt-pen" l={48} t={33} w={13} h={13} d={360} st={{ transformOrigin: "92% 8%" }}>{pen}</V>
      <L c="g12-drive" l={44} t={49} w={26} h={1.4} d={480} st={{ background: "linear-gradient(90deg, #fff4d6, rgba(127,208,232,0))", borderRadius: "999px", transformOrigin: "0% 50%" }} />
      <V c="g12-tt-bell" l={57} t={40} w={7} h={7} d={620} st={{ transformOrigin: "50% 8%" }}>
        <path d="M12 3c4 0 6.4 3 6.4 8v5H5.6v-5c0-5 2.4-8 6.4-8z" fill="#7fd0e8" stroke="#16262e" strokeWidth="1.1" {...SJ} />
      </V>
      <Grit tone="#7fd0e8" at={[43, 50, 57]} top={55} d={720} />
    </Lead>
  );
}

/* --- 12. Wish Fish (t6) — THE WINCH DRUM AND ITS DRAG ----------------------
   The line is paid out down the play's own leg, the drum spins under load,
   the drag pawl clicks against the ratchet, and the gaff swings up on the
   catch. Aim-staged. Palette: #6fb8d8 / #fff2d4 / #10262f. */
function WishFishScene({ role, delayMs }: SceneProps) {
  const drum = (
    <g {...SJ}>
      <rect x="4" y="6.6" width="16" height="10.8" rx="1" fill="#10262f" stroke="#6fb8d8" strokeWidth="1.3" />
      <path d="M4 9.4h16M4 12h16M4 14.6h16" stroke="#6fb8d8" strokeWidth="0.9" />
    </g>
  );
  const gaff = <path d="M6 2.4v10.2a6 6 0 0 0 12 0" fill="none" stroke="#6fb8d8" strokeWidth="2.4" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g12-wf-drum" l={8} t={28} w={54} h={44} d={60}>{drum}</V>
        <V c="g12-wf-crank" l={54} t={30} w={34} h={34} d={280} st={{ transformOrigin: "50% 50%" }}>
          <g {...SJ}><circle cx="12" cy="12" r="3" fill="none" stroke="#6fb8d8" strokeWidth="1.6" /><path d="M12 12h7v4" stroke="#6fb8d8" strokeWidth="2" /></g>
        </V>
        <V c="g12-wf-gaff" l={30} t={44} w={40} h={44} d={470} st={{ transformOrigin: "26% 12%" }}>{gaff}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g12-hit" l={6} t={26} w={58} h={46} d={0}>{drum}</V>
        <V c="g12-hitside" l={28} t={40} w={44} h={48} d={150} st={{ transformOrigin: "26% 12%" }}>{gaff}</V>
        <L c="g12-hit2" l={70} t={44} w={14} h={14} d={280} st={{ borderRadius: "50%", background: "#fff2d4" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(111,184,216,0.26)" /><Rail tone="rgba(255,242,212,0.28)" /></>}>
      <L c="g12-drive" l={45} t={48.8} w={30} h={1.2} d={90} st={{ background: "linear-gradient(90deg, #fff2d4, rgba(111,184,216,0))", borderRadius: "999px", transformOrigin: "0% 50%" }} />
      <V c="g12-wf-drum" l={38} t={44} w={12} h={9} d={260}>{drum}</V>
      <V c="g12-wf-crank" l={36} t={45} w={6} h={6} d={300} st={{ transformOrigin: "50% 50%" }}>
        <g {...SJ}><circle cx="12" cy="12" r="3" fill="none" stroke="#6fb8d8" strokeWidth="1.6" /><path d="M12 12h7v4" stroke="#6fb8d8" strokeWidth="2" /></g>
      </V>
      <V c="g12-wf-pawl" l={43} t={41} w={6} h={5} d={430} st={{ transformOrigin: "10% 50%" }}>
        <path d="M2 8l16 4-16 4z" fill="#fff2d4" stroke="#10262f" strokeWidth="1" {...SJ} />
      </V>
      <V c="g12-wf-gaff" l={58} t={42} w={9} h={11} d={620} st={{ transformOrigin: "26% 12%" }}>{gaff}</V>
      <Grit tone="#6fb8d8" at={[52, 58, 64]} top={53} d={720} />
    </AimLead>
  );
}

/* --- 13. Algorithm Boost (t5) — THE CLUTCH PLATE BITES ----------------------
   The release fork pushes, the two friction plates close on each other, the
   driven shaft is dragged from standstill up to speed, the tachometer needle
   sweeps and the burnt-friction dust hangs.
   Palette: #7fe0d0 / #fff2d6 / #12302c. */
function AlgorithmBoostScene({ role, delayMs }: SceneProps) {
  const plate = (fill: string) => (
    <g {...SJ}>
      <circle cx="12" cy="12" r="9" fill={fill} stroke="#12302c" strokeWidth="1.3" />
      <circle cx="12" cy="12" r="4.4" fill="none" stroke="#12302c" strokeWidth="1.1" strokeDasharray="2 2" />
    </g>
  );
  const fork = (
    <g {...SJ} stroke="#7fe0d0" strokeWidth="2.2">
      <path d="M3 4v16M3 12h10" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g12-ab-fork" l={2} t={22} w={44} h={56} d={50} st={{ transformOrigin: "8% 50%" }}>{fork}</V>
        <V c="g12-ab-plate" l={26} t={22} w={54} h={54} d={280}>{plate("#7fe0d0")}</V>
        <V c="g12-ab-shaft" l={38} t={34} w={30} h={30} d={470}>{plate("#fff2d6")}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g12-hit" l={22} t={22} w={58} h={58} d={0}>{plate("#7fe0d0")}</V>
        <V c="g12-hitside" l={34} t={34} w={34} h={34} d={150}>{plate("#fff2d6")}</V>
        <L c="g12-hit2" l={26} t={26} w={50} h={50} d={280} st={{ borderRadius: "50%", border: "2px solid #fff2d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(127,224,208,0.26)" /><Rail tone="rgba(255,242,214,0.28)" /></>}>
      <V c="g12-ab-fork" l={36} t={41} w={8} h={12} d={100} st={{ transformOrigin: "8% 50%" }}>{fork}</V>
      <V c="g12-ab-plate" l={41} t={40} w={13} h={13} d={280}>{plate("#7fe0d0")}</V>
      <V c="g12-ab-shaft" l={44} t={43} w={7} h={7} d={430}>{plate("#fff2d6")}</V>
      <L c="g12-ab-dust" l={39} t={38} w={17} h={17} d={540} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,214,0.5), transparent 68%)" }} />
      <V c="g12-ab-needle" l={54} t={41} w={9} h={9} d={620} st={{ transformOrigin: "50% 50%" }}>
        <g {...SJ}><circle cx="12" cy="12" r="8" fill="#12302c" stroke="#7fe0d0" strokeWidth="1.3" /><path d="M12 12l5-4" stroke="#fff2d6" strokeWidth="1.8" /></g>
      </V>
      <L c="g12-leanshadow" l={41} t={54} w={16} h={2.6} d={560} st={{ borderRadius: "999px", background: "rgba(18,48,44,0.7)" }} />
      <Grit tone="#7fe0d0" at={[42, 48, 55]} top={52} d={720} />
    </Lead>
  );
}

/* --- 14. Coliseum (t5) — THE HYDRAULIC RAM OPENS THE FLOOR ------------------
   Pressure runs up the hose, the ram rod extends, the two trap plates part
   under the sand and the cage comes up through the gap; the sand pours back
   into the slot. Palette: #dc9a52 / #fff1cf / #2b1a10. */
function ColiseumScene({ role, delayMs }: SceneProps) {
  const cyl = (
    <g {...SJ}>
      <rect x="2" y="8" width="11" height="8" rx="1" fill="#2b1a10" stroke="#dc9a52" strokeWidth="1.3" />
      <rect x="13" y="10.4" width="9" height="3.2" rx="1" fill="#dc9a52" />
    </g>
  );
  const cage = (
    <g {...SJ} stroke="#dc9a52" strokeWidth="1.5">
      <path d="M4 21V6h16v15" fill="#2b1a10" />
      <path d="M8 21V7M12 21V7M16 21V7" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g12-cl-hose" l={4} t={62} w={46} h={4} d={50} st={{ background: "#dc9a52", borderRadius: "999px", transformOrigin: "0% 50%" }} />
        <V c="g12-cl-ram" l={12} t={40} w={62} h={34} d={280} st={{ transformOrigin: "10% 50%" }}>{cyl}</V>
        <V c="g12-cl-cage" l={30} t={14} w={44} h={50} d={470}>{cage}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g12-hit" l={12} t={54} w={32} h={7} d={0} st={{ background: "#2b1a10", borderRadius: "1px", transformOrigin: "100% 50%" }} />
        <L c="g12-hitside" l={56} t={54} w={32} h={7} d={0} st={{ background: "#2b1a10", borderRadius: "1px", transformOrigin: "0% 50%" }} />
        <V c="g12-hit2" l={30} t={16} w={40} h={46} d={250}>{cage}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(220,154,82,0.28)" /><Rail tone="rgba(255,241,207,0.3)" /></>}>
      <L c="g12-cl-hose" l={34} t={52} w={14} h={1.4} d={110} st={{ background: "#dc9a52", borderRadius: "999px", transformOrigin: "0% 50%" }} />
      <V c="g12-cl-ram" l={40} t={47} w={14} h={8} d={280} st={{ transformOrigin: "10% 50%" }}>{cyl}</V>
      <L c="g12-cl-plate" l={38} t={50} w={9} h={2.2} d={420} st={{ background: "#2b1a10", borderRadius: "1px", transformOrigin: "100% 50%" }} />
      <L c="g12-cl-plate2" l={52} t={50} w={9} h={2.2} d={420} st={{ background: "#2b1a10", borderRadius: "1px", transformOrigin: "0% 50%" }} />
      <V c="g12-cl-cage" l={45} t={40} w={10} h={12} d={560}>{cage}</V>
      <L c="g12-leanshadow" l={42} t={54} w={17} h={2.8} d={600} st={{ borderRadius: "999px", background: "rgba(43,26,16,0.72)" }} />
      <Grit tone="#dc9a52" at={[44, 50, 56]} top={53} d={740} />
    </Lead>
  );
}
/* --- 15. Fourth Wall Repair Crew (t5) — THE CONVEYOR CARRIES IT OFF ---------
   The belt starts up along the play's own leg, the rollers under it turn, the
   pusher arm sweeps the crate onto the belt and it rides off past the marker
   posts. Aim-staged. Palette: #9fb0c8 / #fff2d8 / #1a2028. */
function FourthWallCrewScene({ role, delayMs }: SceneProps) {
  const crate = (
    <g {...SJ}>
      <rect x="3" y="5" width="18" height="14" rx="1" fill="#1a2028" stroke="#9fb0c8" strokeWidth="1.3" />
      <path d="M3 9.4h18M12 5v14" stroke="#9fb0c8" strokeWidth="1" />
    </g>
  );
  const pusher = (
    <g {...SJ} stroke="#9fb0c8" strokeWidth="2.4">
      <path d="M3 3v18" />
      <path d="M3 12h13" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g12-fw-belt" l={4} t={62} w={88} h={7} d={50} st={{ background: "repeating-linear-gradient(90deg, #9fb0c8 0 5px, rgba(159,176,200,0.2) 5px 10px)", borderRadius: "1px", transformOrigin: "0% 50%" }} />
        <V c="g12-fw-push" l={4} t={20} w={40} h={44} d={280} st={{ transformOrigin: "8% 60%" }}>{pusher}</V>
        <V c="g12-fw-crate" l={38} t={26} w={40} h={38} d={470}>{crate}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g12-hit" l={4} t={62} w={88} h={7} d={0} st={{ background: "repeating-linear-gradient(90deg, #9fb0c8 0 5px, rgba(159,176,200,0.2) 5px 10px)", borderRadius: "1px", transformOrigin: "0% 50%" }} />
        <V c="g12-hitside" l={10} t={22} w={42} h={44} d={150} st={{ transformOrigin: "8% 60%" }}>{pusher}</V>
        <V c="g12-hit2" l={48} t={28} w={40} h={38} d={280}>{crate}</V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(159,176,200,0.24)" /><Rail tone="rgba(255,242,216,0.28)" /></>}>
      <L c="g12-drive" l={44} t={49.6} w={30} h={2} d={90} st={{ background: "repeating-linear-gradient(90deg, #9fb0c8 0 4px, rgba(159,176,200,0.18) 4px 8px)", borderRadius: "1px", transformOrigin: "0% 50%" }} />
      {[0, 1].map((i) => (
        <V key={i} c="g12-fw-roller" l={46 + i * 11} t={50} w={4} h={4} d={260 + i * 110}>
          <circle cx="12" cy="12" r="8.6" fill="#1a2028" stroke="#9fb0c8" strokeWidth="2" strokeDasharray="3 3" />
        </V>
      ))}
      <V c="g12-fw-push" l={40} t={43} w={7} h={9} d={330} st={{ transformOrigin: "8% 60%" }}>{pusher}</V>
      <V c="g12-fw-crate" l={48} t={44} w={8} h={7} d={500}>{crate}</V>
      <L c="g12-fw-post" l={58} t={44} w={1.4} h={7} d={640} st={{ background: "#fff2d8", borderRadius: "1px", transformOrigin: "50% 100%" }} />
      <Grit tone="#9fb0c8" at={[47, 54, 61]} top={54} d={720} />
    </AimLead>
  );
}

/* --- 16. Insider Trading (t5) — THE TICKER PRINTS BEFORE THE BELL -----------
   The glass dome lifts, the type wheel snaps round to the quote, the hammer
   strikes the tape against it, and the printed run pays out along the leg
   toward the mark. Aim-staged. Palette: #e8d08a / #fff4d6 / #241d10. */
function InsiderTradingScene({ role, delayMs }: SceneProps) {
  const wheel = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="8" fill="#241d10" stroke="#e8d08a" strokeWidth="1.4" />
      <path d="M12 4v2.6M20 12h-2.6M12 20v-2.6M4 12h2.6M17.6 6.4l-1.8 1.8M17.6 17.6l-1.8-1.8M6.4 17.6l1.8-1.8M6.4 6.4l1.8 1.8" stroke="#e8d08a" strokeWidth="1.4" />
    </g>
  );
  const dome = <path d="M2.4 21a9.6 9.6 0 0 1 19.2 0z" fill="none" stroke="#fff4d6" strokeWidth="1.4" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g12-it-dome" l={12} t={20} w={76} h={60} d={50} st={{ transformOrigin: "50% 100%" }}>{dome}</V>
        <V c="g12-it-wheel" l={30} t={28} w={40} h={40} d={290}>{wheel}</V>
        <L c="g12-it-tape" l={30} t={70} w={58} h={5} d={470} st={{ background: "#fff4d6", borderRadius: "1px", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g12-hit" l={26} t={24} w={46} h={46} d={0}>{wheel}</V>
        <L c="g12-hitside" l={22} t={70} w={62} h={5} d={150} st={{ background: "#fff4d6", borderRadius: "1px", transformOrigin: "0% 50%" }} />
        <L c="g12-hit2" l={44} t={68} w={5} h={5} d={280} st={{ background: "#241d10", borderRadius: "1px" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(232,208,138,0.26)" /><Rail tone="rgba(255,244,214,0.3)" /></>}>
      <V c="g12-it-dome" l={40} t={39} w={16} h={16} d={110} st={{ transformOrigin: "50% 100%" }}>{dome}</V>
      <V c="g12-it-wheel" l={43} t={42} w={10} h={10} d={300}>{wheel}</V>
      <L c="g12-it-hammer" l={40} t={45} w={5} h={1.8} d={430} st={{ background: "#fff4d6", borderRadius: "999px", transformOrigin: "0% 50%" }} />
      <L c="g12-drive" l={46} t={49.4} w={28} h={1.6} d={500} st={{ background: "linear-gradient(90deg, #fff4d6, rgba(232,208,138,0))", borderRadius: "1px", transformOrigin: "0% 50%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g12-it-mark" l={50 + i * 5} t={49} w={1.8} h={2.2} d={600 + i * 110} st={{ background: "#241d10", borderRadius: "1px" }} />
      ))}
      <Grit tone="#e8d08a" at={[45, 52, 59]} top={53} d={760} />
    </AimLead>
  );
}

/* --- 17. Prophecy Engine (t5) — THE CARRY LEVER TRIPS -----------------------
   Three digit wheels step over, the carry lever is tripped by the tens and
   swings, the sector arm rakes the column, and the answer plate flips up
   facing the mark. Aim-staged. Palette: #b49ae8 / #fff2dc / #1c1630. */
function ProphecyEngineScene({ role, delayMs }: SceneProps) {
  const digit = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="7.6" fill="#1c1630" stroke="#b49ae8" strokeWidth="1.3" />
      <path d="M12 4.4v3M19.6 12h-3M12 19.6v-3M4.4 12h3" stroke="#b49ae8" strokeWidth="1.4" />
    </g>
  );
  const carry = (
    <g {...SJ}>
      <path d="M3.4 19L18 6" stroke="#b49ae8" strokeWidth="2.4" />
      <circle cx="3.4" cy="19" r="2" fill="#fff2dc" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        {[0, 1, 2].map((i) => (
          <V key={i} c="g12-pe-wheel" l={8 + i * 28} t={16} w={30} h={30} d={60 + i * 90}>{digit}</V>
        ))}
        <V c="g12-pe-carry" l={22} t={44} w={56} h={44} d={330} st={{ transformOrigin: "14% 84%" }}>{carry}</V>
        <L c="g12-pe-plate" l={30} t={72} w={40} h={12} d={500} st={{ background: "#fff2dc", borderRadius: "1px", transformOrigin: "50% 100%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g12-hit" l={26} t={12} w={48} h={48} d={0}>{digit}</V>
        <V c="g12-hitside" l={20} t={42} w={58} h={46} d={150} st={{ transformOrigin: "14% 84%" }}>{carry}</V>
        <L c="g12-hit2" l={32} t={74} w={36} h={10} d={280} st={{ background: "#fff2dc", borderRadius: "1px", transformOrigin: "50% 100%" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(180,154,232,0.26)" /><Rail tone="rgba(255,242,220,0.28)" /></>}>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g12-pe-wheel" l={39 + i * 6} t={41} w={6} h={6} d={110 + i * 100}>{digit}</V>
      ))}
      <V c="g12-pe-carry" l={42} t={44} w={11} h={10} d={420} st={{ transformOrigin: "14% 84%" }}>{carry}</V>
      <L c="g12-pe-sector" l={41} t={48} w={13} h={1.6} d={470} st={{ background: "#b49ae8", borderRadius: "999px", transformOrigin: "0% 50%" }} />
      <L c="g12-drive" l={46} t={45} w={28} h={1.4} d={560} st={{ background: "linear-gradient(90deg, #fff2dc, rgba(180,154,232,0))", borderRadius: "999px", transformOrigin: "0% 50%" }} />
      <L c="g12-pe-plate" l={54} t={41} w={7} h={5} d={660} st={{ background: "#fff2dc", borderRadius: "1px", transformOrigin: "50% 100%" }} />
      <Grit tone="#b49ae8" at={[44, 51, 58]} top={53} d={740} />
    </AimLead>
  );
}

/* --- 18. Speedhack (t5) — THE MAINSPRING GOES PAST ITS STOP -----------------
   The winding key is turned, the coil inside the barrel tightens turn by
   turn, the click pawl chatters faster and faster, and the stop-work finger
   is driven past its own stop. Palette: #a6f04c / #fff4d6 / #1c2a10. */
function SpeedhackScene({ role, delayMs }: SceneProps) {
  const coil = (
    <path
      d="M12 12.4a3.2 3.2 0 0 1 3.2-3.2 5.6 5.6 0 0 1 5.6 5.6 8 8 0 0 1-8 8 10.4 10.4 0 0 1-10.4-10.4A12.8 12.8 0 0 1 15.2 0"
      fill="none"
      stroke="#a6f04c"
      strokeWidth="1.6"
      {...SJ}
    />
  );
  const key = (
    <g {...SJ}>
      <path d="M12 21V8" stroke="#a6f04c" strokeWidth="2.4" />
      <path d="M6 4.4h12v4H6z" fill="#fff4d6" stroke="#1c2a10" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g12-sh-barrel" l={12} t={20} w={62} h={62} d={50}>
          <circle cx="12" cy="12" r="10" fill="#1c2a10" stroke="#a6f04c" strokeWidth="1.4" />
        </V>
        <V c="g12-sh-coil" l={16} t={24} w={54} h={54} d={290}>{coil}</V>
        <V c="g12-sh-key" l={56} t={14} w={34} h={54} d={470} st={{ transformOrigin: "50% 84%" }}>{key}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g12-hit" l={14} t={14} w={62} h={62} d={0}>{coil}</V>
        <V c="g12-hitside" l={52} t={12} w={38} h={58} d={150} st={{ transformOrigin: "50% 84%" }}>{key}</V>
        <L c="g12-hit2" l={40} t={40} w={12} h={12} d={280} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(166,240,76,0.26)" /><Rail tone="rgba(255,244,214,0.3)" /></>}>
      <V c="g12-sh-barrel" l={40} t={39} w={16} h={16} d={110}>
        <circle cx="12" cy="12" r="10" fill="#1c2a10" stroke="#a6f04c" strokeWidth="1.4" />
      </V>
      <V c="g12-sh-coil" l={41} t={40} w={14} h={14} d={280}>{coil}</V>
      <V c="g12-sh-key" l={54} t={38} w={7} h={12} d={380} st={{ transformOrigin: "50% 84%" }}>{key}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g12-sh-click" l={44 + i * 4} t={54} w={1.6} h={1.6} d={480 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
      <L c="g12-sh-stop" l={45} t={35} w={7} h={1.6} d={660} st={{ background: "#a6f04c", borderRadius: "999px", transformOrigin: "0% 50%" }} />
      <L c="g12-leanshadow" l={41} t={56} w={16} h={2.6} d={620} st={{ borderRadius: "999px", background: "rgba(28,42,16,0.72)" }} />
    </Lead>
  );
}

/* --- 19. Grandfather Clock (t4) — THE WEIGHT PULLS THE TRAIN ----------------
   The driving weight is let go, the cable pays off the barrel, the count wheel
   lets the hammer off and the gong rod is struck; the rod goes on humming
   after the case is quiet. Palette: #d8a860 / #fff2cf / #241708. */
function GrandfatherClockScene({ role, delayMs }: SceneProps) {
  const weight = (
    <g {...SJ}>
      <path d="M8 3h8v13.4l-1.6 5H9.6L8 16.4z" fill="#d8a860" stroke="#241708" strokeWidth="1.2" />
      <path d="M9.6 7h4.8" stroke="#241708" strokeWidth="1" />
    </g>
  );
  const hammer = (
    <g {...SJ}>
      <path d="M2 6h11" stroke="#d8a860" strokeWidth="2" />
      <circle cx="15" cy="6" r="3.4" fill="#fff2cf" stroke="#241708" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g12-gc-cable" l={30} t={6} w={2.4} h={40} d={50} st={{ background: "#d8a860", borderRadius: "999px", transformOrigin: "50% 0%" }} />
        <V c="g12-gc-weight" l={20} t={34} w={24} h={48} d={280}>{weight}</V>
        <V c="g12-gc-hammer" l={50} t={26} w={44} h={30} d={470} st={{ transformOrigin: "6% 40%" }}>{hammer}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g12-hitside" l={18} t={20} w={30} h={60} d={0}>{weight}</V>
        <V c="g12-hit" l={46} t={26} w={48} h={32} d={150} st={{ transformOrigin: "6% 40%" }}>{hammer}</V>
        <L c="g12-hit2" l={72} t={30} w={20} h={20} d={280} st={{ borderRadius: "50%", border: "2px solid #fff2cf" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(216,168,96,0.26)" /><Rail tone="rgba(255,242,207,0.3)" /></>}>
      <L c="g12-gc-cable" l={43.4} t={34} w={0.9} h={12} d={110} st={{ background: "#d8a860", borderRadius: "999px", transformOrigin: "50% 0%" }} />
      <V c="g12-gc-weight" l={41} t={42} w={6} h={11} d={270}>{weight}</V>
      <V c="g12-gc-count" l={49} t={38} w={7} h={7} d={380}>
        <circle cx="12" cy="12" r="8.6" fill="#241708" stroke="#d8a860" strokeWidth="2.2" strokeDasharray="2.4 3" />
      </V>
      <V c="g12-gc-hammer" l={52} t={43} w={10} h={7} d={520} st={{ transformOrigin: "6% 40%" }}>{hammer}</V>
      <L c="g12-gc-gong" l={57} t={38} w={1.4} h={16} d={600} st={{ background: "#fff2cf", borderRadius: "999px", transformOrigin: "50% 0%" }} />
      <Grit tone="#d8a860" at={[44, 50, 56]} top={55} d={700} />
    </Lead>
  );
}

/* --- 20. Golden Goose (t4) — THE SCREW PRESS ---------------------------------
   The square-thread screw is run down, the frame takes the strain, the platen
   comes onto the comb and gold runs out of the spout a drop at a time.
   Palette: #f0c541 / #fff6dc / #2b2005. */
function GoldenGooseScene({ role, delayMs }: SceneProps) {
  const screw = (
    <g {...SJ} stroke="#f0c541">
      <path d="M12 2v11" strokeWidth="2.6" />
      <path d="M8 4.4h8M8 7h8M8 9.6h8" strokeWidth="1.5" />
    </g>
  );
  const frame = (
    <g {...SJ} stroke="#f0c541" strokeWidth="2">
      <path d="M3 2v20M21 2v20M3 21.4h18" fill="none" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g12-gg-frame" l={10} t={12} w={78} h={72} d={50}>{frame}</V>
        <V c="g12-gg-screw" l={30} t={6} w={40} h={48} d={290}>{screw}</V>
        <L c="g12-gg-platen" l={22} t={54} w={56} h={8} d={470} st={{ background: "#f0c541", borderRadius: "1px" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g12-hit" l={28} t={6} w={44} h={50} d={0}>{screw}</V>
        <L c="g12-hitside" l={20} t={56} w={60} h={9} d={150} st={{ background: "#f0c541", borderRadius: "1px" }} />
        <L c="g12-hit2" l={46} t={70} w={8} h={16} d={280} st={{ background: "#fff6dc", borderRadius: "999px", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(240,197,65,0.28)" /><Rail tone="rgba(255,246,220,0.3)" /></>}>
      <V c="g12-gg-frame" l={40} t={37} w={19} h={19} d={100}>{frame}</V>
      <V c="g12-gg-screw" l={45} t={34} w={9} h={11} d={280}>{screw}</V>
      <L c="g12-gg-platen" l={42} t={46} w={15} h={2} d={430} st={{ background: "#f0c541", borderRadius: "1px" }} />
      <L c="g12-gg-flow" l={48.4} t={48} w={2} h={7} d={560} st={{ background: "linear-gradient(180deg, #fff6dc, rgba(240,197,65,0))", borderRadius: "999px", transformOrigin: "50% 0%" }} />
      <L c="g12-gg-drop" l={48.6} t={54} w={1.8} h={1.8} d={680} st={{ borderRadius: "50%", background: "#fff6dc" }} />
      <L c="g12-leanshadow" l={42} t={56} w={16} h={2.6} d={620} st={{ borderRadius: "999px", background: "rgba(43,32,5,0.72)" }} />
    </Lead>
  );
}

/* --- 21. Midas Gauntlet (t4) — THE LATHE PEELS A CURL OF GOLD ---------------
   The chuck jaws close on the bar, the work spins up, the tool post is fed in
   along the bed and a bright curl of swarf comes off and drops away. Aim-
   staged along the bed. Palette: #ffe08a / #fff4d6 / #33260b. */
function MidasGauntletScene({ role, delayMs }: SceneProps) {
  const chuck = (
    <g {...SJ}>
      <rect x="2" y="4" width="6" height="16" rx="1" fill="#33260b" stroke="#ffe08a" strokeWidth="1.3" />
      <path d="M8 8h3M8 12h3M8 16h3" stroke="#ffe08a" strokeWidth="1.6" />
    </g>
  );
  const tool = <path d="M12 22l4.4-9H7.6z" fill="#fff4d6" stroke="#33260b" strokeWidth="1.1" {...SJ} />;
  const curl = (
    <path d="M4 13c3.4-4.6 8.4-1.6 5.6 2.4-2.4 3.4-8 1.6-6.6-3" fill="none" stroke="#ffe08a" strokeWidth="1.8" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g12-mg-chuck" l={4} t={22} w={34} h={56} d={50}>{chuck}</V>
        <L c="g12-mg-work" l={24} t={42} w={62} h={14} d={280} st={{ background: "linear-gradient(180deg, #ffe08a, #33260b)", borderRadius: "1px" }} />
        <V c="g12-mg-curl" l={44} t={20} w={40} h={40} d={470}>{curl}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g12-hit" l={12} t={44} w={70} h={12} d={0} st={{ background: "linear-gradient(180deg, #ffe08a, #33260b)", borderRadius: "1px" }} />
        <V c="g12-hitside" l={44} t={54} w={30} h={40} d={150}>{tool}</V>
        <V c="g12-hit2" l={40} t={16} w={38} h={38} d={280}>{curl}</V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<><Wash tone="rgba(255,224,138,0.26)" /><Rail tone="rgba(255,244,214,0.3)" /></>}>
      <V c="g12-mg-chuck" l={38} t={44} w={5} h={9} d={100}>{chuck}</V>
      <L c="g12-drive" l={43} t={47.4} w={26} h={3} d={240} st={{ background: "linear-gradient(180deg, #ffe08a, #33260b)", borderRadius: "1px", transformOrigin: "0% 50%" }} />
      <V c="g12-mg-tool" l={51} t={51} w={6} h={8} d={400}>{tool}</V>
      <V c="g12-mg-curl" l={50} t={40} w={9} h={9} d={540}>{curl}</V>
      <L c="g12-mg-fleck" l={54} t={49} w={2} h={2} d={660} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      <Grit tone="#ffe08a" at={[52, 58, 64]} top={53} d={720} />
    </AimLead>
  );
}

/* --- 22. Private Gallery (t4) — THE BOLTWORK RETRACTS -----------------------
   The handwheel is spun, the four radial bolts pull out of the jamb, the door
   swings off its hinge and the gallery light spills onto the floor with the
   one frame that is worth seeing. Palette: #8fb0d8 / #fff2d8 / #131b26. */
function PrivateGalleryScene({ role, delayMs }: SceneProps) {
  const door = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="9.4" fill="#131b26" stroke="#8fb0d8" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4.6" fill="none" stroke="#8fb0d8" strokeWidth="1.2" />
      <path d="M12 3.6v4M12 16.4v4M3.6 12h4M16.4 12h4" stroke="#8fb0d8" strokeWidth="1.6" />
    </g>
  );
  const picture = (
    <g {...SJ}>
      <rect x="3" y="4" width="18" height="14" rx="1" fill="#131b26" stroke="#fff2d8" strokeWidth="1.4" />
      <path d="M5.4 15l4.4-5.4 3 3.4 2.6-2.6 3.2 4.6z" fill="#8fb0d8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g12-pg-wheel" l={16} t={16} w={68} h={68} d={50}>{door}</V>
        <L c="g12-pg-bolt" l={50} t={46} w={38} h={5} d={290} st={{ background: "#8fb0d8", borderRadius: "1px", transformOrigin: "0% 50%" }} />
        <V c="g12-pg-frame" l={26} t={32} w={48} h={38} d={470}>{picture}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g12-hit" l={14} t={14} w={72} h={72} d={0}>{door}</V>
        <L c="g12-hitside" l={50} t={46} w={40} h={5} d={150} st={{ background: "#8fb0d8", borderRadius: "1px", transformOrigin: "0% 50%" }} />
        <V c="g12-hit2" l={28} t={32} w={44} h={36} d={280}>{picture}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(143,176,216,0.26)" /><Rail tone="rgba(255,242,216,0.28)" /></>}>
      <V c="g12-pg-wheel" l={40} t={38} w={18} h={18} d={100}>{door}</V>
      {[0, 90, 180, 270].map((a, i) => (
        <P key={a} l={40} t={38} w={18} h={18} rot={`${a}deg`}>
          <L c="g12-pg-bolt" l={50} t={47} w={16} h={2.2} d={300 + i * 90} st={{ background: "#8fb0d8", borderRadius: "1px", transformOrigin: "0% 50%" }} />
        </P>
      ))}
      <V c="g12-pg-door" l={40} t={38} w={18} h={18} d={520} st={{ transformOrigin: "10% 50%" }}>{door}</V>
      <L c="g12-shaft" l={45} t={30} w={10} h={22} d={600} st={{ transformOrigin: "50% 100%", background: "linear-gradient(0deg, rgba(143,176,216,0.6), transparent)" }} />
      <V c="g12-pg-frame" l={45} t={42} w={9} h={7} d={680}>{picture}</V>
      <Grit tone="#fff2d8" at={[43, 49, 56]} top={54} d={720} />
    </Lead>
  );
}

/* --- 23. Rage Bait (t4) — THE SPRING TRAP GOES OVER -------------------------
   The bait pan tips under the weight, the sear slips off its notch, the bow
   snaps over the base with the coil unwinding behind it, and the whole board
   judders on the floor. Palette: #e8574c / #ffeccb / #24100c. */
function RageBaitScene({ role, delayMs }: SceneProps) {
  const bow = <path d="M3 20a9 9 0 0 1 18 0" fill="none" stroke="#e8574c" strokeWidth="2.6" {...SJ} />;
  const pan = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="5" fill="#ffeccb" stroke="#24100c" strokeWidth="1.2" />
      <path d="M12 17v4" stroke="#24100c" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g12-rg-base" l={10} t={72} w={80} h={9} d={50} st={{ background: "#24100c", borderRadius: "1px" }} />
        <V c="g12-rg-pan" l={34} t={40} w={32} h={32} d={280} st={{ transformOrigin: "50% 90%" }}>{pan}</V>
        <V c="g12-rg-bow" l={12} t={22} w={76} h={54} d={470} st={{ transformOrigin: "50% 100%" }}>{bow}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g12-hit" l={32} t={38} w={36} h={36} d={0} st={{ transformOrigin: "50% 90%" }}>{pan}</V>
        <V c="g12-hitside" l={10} t={20} w={80} h={58} d={150} st={{ transformOrigin: "50% 100%" }}>{bow}</V>
        <L c="g12-hit2" l={12} t={74} w={76} h={6} d={280} st={{ background: "#24100c", borderRadius: "1px" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(232,87,76,0.28)" /><Rail tone="rgba(255,236,203,0.3)" /></>}>
      <L c="g12-rg-base" l={41} t={52} w={19} h={2.4} d={100} st={{ background: "#24100c", borderRadius: "1px" }} />
      <V c="g12-rg-pan" l={46} t={45} w={7} h={7} d={250} st={{ transformOrigin: "50% 90%" }}>{pan}</V>
      <L c="g12-rg-sear" l={56} t={44} w={1.6} h={8} d={380} st={{ background: "#ffeccb", borderRadius: "999px", transformOrigin: "50% 100%" }} />
      <V c="g12-rg-bow" l={41} t={40} w={19} h={13} d={470} st={{ transformOrigin: "50% 100%" }}>{bow}</V>
      <L c="g12-rg-coil" l={39} t={50} w={7} h={2.4} d={520} st={{ background: "repeating-linear-gradient(90deg, #e8574c 0 2px, transparent 2px 4px)", transformOrigin: "100% 50%" }} />
      <L c="g12-leanshadow" l={40} t={55} w={20} h={2.8} d={600} st={{ borderRadius: "999px", background: "rgba(36,16,12,0.75)" }} />
      <Grit tone="#e8574c" at={[42, 49, 56]} top={57} d={700} />
    </Lead>
  );
}

/* --- 24. Stack Overflow (t4) — THE BUCKET ELEVATOR OVERTOPS -----------------
   The bucket chain climbs its casing, the head pulley turns, the top bucket
   goes over full, and everything it was carrying comes back down the return
   leg while the casing judders. Palette: #8f9ce0 / #fff2d8 / #171a2b. */
function StackOverflowScene({ role, delayMs }: SceneProps) {
  const bucket = (
    <g {...SJ}>
      <path d="M3 5h18l-2.4 12H5.4z" fill="#171a2b" stroke="#8f9ce0" strokeWidth="1.3" />
      <path d="M5.6 9h12.8" stroke="#8f9ce0" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g12-sv-casing" l={30} t={6} w={40} h={80} d={50} st={{ border: "2px solid #8f9ce0", borderRadius: "1px" }} />
        <V c="g12-sv-bucket" l={34} t={54} w={32} h={26} d={290}>{bucket}</V>
        <L c="g12-sv-spill" l={44} t={12} w={5} h={5} d={480} st={{ borderRadius: "50%", background: "#fff2d8" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g12-hitside" l={32} t={48} w={36} h={30} d={0}>{bucket}</V>
        <L c="g12-hit" l={28} t={8} w={44} h={44} d={150} st={{ border: "2px solid #8f9ce0", borderRadius: "1px" }} />
        <L c="g12-hit2" l={44} t={14} w={10} h={10} d={280} st={{ borderRadius: "50%", background: "#fff2d8" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(143,156,224,0.26)" /><Rail tone="rgba(255,242,216,0.28)" /></>}>
      <L c="g12-sv-casing" l={45} t={34} w={10} h={22} d={100} st={{ border: "2px solid #8f9ce0", borderRadius: "1px" }} />
      <V c="g12-sv-pulley" l={45.6} t={33} w={8} h={8} d={260}>
        <circle cx="12" cy="12" r="8.6" fill="#171a2b" stroke="#8f9ce0" strokeWidth="2" strokeDasharray="3 3" />
      </V>
      {[0, 1].map((i) => (
        <V key={i} c="g12-feedin" l={46} t={46} w={8} h={6} d={330 + i * 130}>{bucket}</V>
      ))}
      <L c="g12-sv-spill" l={48} t={33} w={2.2} h={2.2} d={560} st={{ borderRadius: "50%", background: "#fff2d8" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g12-sv-fall" l={51 + i * 2} t={36} w={1.6} h={1.6} d={640 + i * 100} st={{ borderRadius: "50%", background: "#8f9ce0" }} />
      ))}
    </Lead>
  );
}

/* --- 25. Vampire Court (t4) — THE PISTON PUMP DRAWS ------------------------
   The handle is rocked over, the piston goes down its barrel, the ball check
   valve seats with a knock, the standpipe fills and the spout runs.
   Palette: #c0405a / #ffe8cf / #1d0a12. */
function VampireCourtScene({ role, delayMs }: SceneProps) {
  const body = (
    <g {...SJ}>
      <rect x="8" y="7" width="8" height="14" rx="1" fill="#1d0a12" stroke="#c0405a" strokeWidth="1.3" />
      <path d="M16 10.4h5l-1.4 4.6" fill="none" stroke="#c0405a" strokeWidth="1.6" />
    </g>
  );
  const handle = <path d="M3 5.4l17 3.2" stroke="#c0405a" strokeWidth="2.8" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g12-vc-body" l={26} t={26} w={48} h={58} d={50}>{body}</V>
        <V c="g12-vc-handle" l={10} t={8} w={60} h={26} d={280} st={{ transformOrigin: "88% 50%" }}>{handle}</V>
        <L c="g12-vc-fill" l={42} t={44} w={9} h={30} d={470} st={{ background: "#c0405a", borderRadius: "1px", transformOrigin: "50% 100%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g12-hit" l={26} t={24} w={50} h={60} d={0}>{body}</V>
        <V c="g12-hitside" l={8} t={6} w={62} h={28} d={150} st={{ transformOrigin: "88% 50%" }}>{handle}</V>
        <L c="g12-hit2" l={44} t={46} w={9} h={30} d={280} st={{ background: "#c0405a", borderRadius: "1px", transformOrigin: "50% 100%" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(192,64,90,0.28)" /><Rail tone="rgba(255,232,207,0.28)" /></>}>
      <V c="g12-vc-body" l={43} t={39} w={13} h={15} d={110}>{body}</V>
      <V c="g12-vc-handle" l={37} t={34} w={12} h={5} d={280} st={{ transformOrigin: "88% 50%" }}>{handle}</V>
      <L c="g12-vc-piston" l={48.4} t={36} w={1.8} h={8} d={400} st={{ background: "#ffe8cf", borderRadius: "1px", transformOrigin: "50% 0%" }} />
      <L c="g12-vc-ball" l={48} t={48} w={2.4} h={2.4} d={520} st={{ borderRadius: "50%", background: "#ffe8cf" }} />
      <L c="g12-vc-fill" l={47.4} t={44} w={3.4} h={9} d={600} st={{ background: "#c0405a", borderRadius: "1px", transformOrigin: "50% 100%" }} />
      <L c="g12-leanshadow" l={43} t={55} w={15} h={2.6} d={640} st={{ borderRadius: "999px", background: "rgba(29,10,18,0.75)" }} />
    </Lead>
  );
}

/* --- 26. Overtime Claim (t4 art, t3 card) — THE COIN ESCAPEMENT KICKS -------
   The coin goes down the slot, trips the escapement, the expired flag drops
   out of the window and the hand jumps forward on the dial.
   Palette: #6fd0b0 / #fff2d6 / #10241e. */
function OvertimeClaimScene({ role, delayMs }: SceneProps) {
  const dial = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="9" fill="#10241e" stroke="#6fd0b0" strokeWidth="1.4" />
      <path d="M12 5.4v6.6l4.4 2.6" stroke="#fff2d6" strokeWidth="1.8" fill="none" />
    </g>
  );
  const flag = (
    <g {...SJ}>
      <path d="M4 5h14l-3 4 3 4H4z" fill="#6fd0b0" stroke="#10241e" strokeWidth="1.2" />
      <path d="M4 5v15" stroke="#6fd0b0" strokeWidth="1.8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g12-oc-coin" l={44} t={4} w={12} h={12} d={50} st={{ borderRadius: "50%", background: "#fff2d6" }} />
        <V c="g12-oc-dial" l={20} t={30} w={52} h={52} d={290}>{dial}</V>
        <V c="g12-oc-flag" l={54} t={14} w={40} h={44} d={470} st={{ transformOrigin: "12% 20%" }}>{flag}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g12-hit2" l={44} t={2} w={14} h={14} d={0} st={{ borderRadius: "50%", background: "#fff2d6" }} />
        <V c="g12-hit" l={18} t={28} w={56} h={56} d={150}>{dial}</V>
        <V c="g12-hitside" l={52} t={12} w={44} h={46} d={280} st={{ transformOrigin: "12% 20%" }}>{flag}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(111,208,176,0.26)" /><Rail tone="rgba(255,242,214,0.28)" /></>}>
      <L c="g12-oc-coin" l={47} t={33} w={3} h={3} d={90} st={{ borderRadius: "50%", background: "#fff2d6" }} />
      <V c="g12-oc-kick" l={43} t={41} w={7} h={7} d={300}>
        <circle cx="12" cy="12" r="8.6" fill="none" stroke="#6fd0b0" strokeWidth="2.6" strokeDasharray="1.8 3" />
      </V>
      <V c="g12-oc-dial" l={41} t={38} w={17} h={17} d={420}>{dial}</V>
      <V c="g12-oc-flag" l={53} t={38} w={9} h={9} d={600} st={{ transformOrigin: "12% 20%" }}>{flag}</V>
      <L c="g12-feedin" l={43} t={53} w={13} h={1.6} d={660} st={{ background: "linear-gradient(90deg, #6fd0b0, rgba(111,208,176,0))", borderRadius: "999px" }} />
    </Lead>
  );
}

/* --- 27. Pocket Metronome (t3) — THE INVERTED PENDULUM BEATS ----------------
   The wedge case is opened, the arm is set going, the bob is slid down the
   scale a notch and the beat quickens until the arm is caught.
   Palette: #e0a878 / #fff2d6 / #2a1a10. */
function PocketMetronomeScene({ role, delayMs }: SceneProps) {
  const caseBody = (
    <g {...SJ}>
      <path d="M12 2l7.4 20H4.6z" fill="#2a1a10" stroke="#e0a878" strokeWidth="1.4" />
      <path d="M8 18h8" stroke="#e0a878" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g12-pm-lid" l={22} t={18} w={56} h={64} d={50} st={{ transformOrigin: "50% 100%" }}>{caseBody}</V>
        <L c="g12-pm-arm" l={48} t={20} w={4} h={56} d={290} st={{ background: "#e0a878", borderRadius: "1px", transformOrigin: "50% 100%" }} />
        <L c="g12-pm-bob" l={42} t={38} w={16} h={9} d={480} st={{ background: "#fff2d6", borderRadius: "1px" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g12-hit" l={20} t={16} w={60} h={68} d={0} st={{ transformOrigin: "50% 100%" }}>{caseBody}</V>
        <L c="g12-hitside" l={47} t={18} w={5} h={58} d={150} st={{ background: "#e0a878", borderRadius: "1px", transformOrigin: "50% 100%" }} />
        <L c="g12-hit2" l={41} t={36} w={18} h={10} d={280} st={{ background: "#fff2d6", borderRadius: "1px" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<><Wash tone="rgba(224,168,120,0.26)" /><Rail tone="rgba(255,242,214,0.28)" /></>}>
      <V c="g12-pm-lid" l={43} t={38} w={14} h={17} d={100} st={{ transformOrigin: "50% 100%" }}>{caseBody}</V>
      <L c="g12-pm-arm" l={49.4} t={36} w={1.2} h={17} d={300} st={{ background: "#e0a878", borderRadius: "1px", transformOrigin: "50% 100%" }} />
      <L c="g12-pm-bob" l={47.6} t={42} w={4.8} h={2.2} d={440} st={{ background: "#fff2d6", borderRadius: "1px" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g12-pm-tick" l={51} t={39 + i * 3} w={2.4} h={0.9} d={560 + i * 90} st={{ background: "#e0a878", borderRadius: "1px" }} />
      ))}
      <L c="g12-leanshadow" l={44} t={55} w={13} h={2.4} d={640} st={{ borderRadius: "999px", background: "rgba(42,26,16,0.72)" }} />
    </Lead>
  );
}

/* =============================================================================
   Registry. Every entry declares an anchor; every `sound` is an existing
   SigSoundKey drawn from the machine-room voices (clockcage, blitz, siege,
   vault, chips). `source` is deliberately omitted throughout: these cards
   carry no removal diff, so their play is the cast lead on the square they
   were played on, exactly as the generated family resolved before.
   ========================================================================== */

/* =============================================================================
   FLAGSHIP IMPACT PASS — the machinery is struck mid-tick and its gears BURST.

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

/** A drive gear: the tooth-wheel the strike knocks out of the train. */
const impGear = (fill: string, edge: string): ReactNode => (
  <>
    <circle cx="12" cy="12" r="6.4" fill={fill} stroke={edge} strokeWidth="1.2" />
    <path
      d="M12 2.6v3M12 18.4v3M2.6 12h3M18.4 12h3M5.4 5.4l2 2M16.6 16.6l2 2M18.6 5.4l-2 2M7.4 16.6l-2 2"
      stroke={edge}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="2" fill={edge} />
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
  ov_board_of_directors: S(BoardOfDirectorsScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "vault", anchor: "cast" }, { rgb: "232 182 76", at: 760, laser: true, glyph: impGear("#e8b64c", "#2a2011"), shock: true, box: [41, 34, 16, 16] }),
  ov_deja_vu: S(DejaVuScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "clockcage", anchor: "cast" }, { rgb: "127 200 232", at: 700, laser: true, glyph: impGear("#7fc8e8", "#12242e"), shock: true, box: [43, 36, 14, 18], rot: 12 }),
  bn4_genie_lamp: S(GenieLampScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege", anchor: "cast" }, { rgb: "111 214 192", at: 640, laser: true, shock: true, box: [42, 36, 15, 15] }),
  ov_chess_boxing: S(ChessBoxingScene, { ordering: "octagon", staggerMs: 60, victims: ["k"], hasLead: true, sound: "siege", anchor: "cast" }, { rgb: "255 154 110", at: 620, glyph: impGear("#ff9a6e", "#331612"), shock: true, box: [43, 37, 14, 14] }),
  ov_mod_powers: S(ModPowersScene, { ordering: "file", staggerMs: 90, victims: "all", hasLead: true, sound: "blitz", anchor: "cast" }, { rgb: "224 178 60", at: 680, laser: true, glyph: impGear("#e0b23c", "#1a1a12"), box: [42, 35, 15, 16] }),
  bn4_relay_baton: S(RelayBatonScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "blitz", anchor: "aim" }, { rgb: "207 216 224", at: 560, shock: true, box: [46, 41, 10, 10] }),
  ov_democracy: S(DemocracyScene, { ordering: "radial", staggerMs: 65, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }, { rgb: "127 201 141", at: 620, laser: true, shock: true, box: [43, 38, 14, 14] }),
  ov_dev_console: S(DevConsoleScene, { ordering: "file", staggerMs: 70, victims: "all", hasLead: true, sound: "chips", anchor: "cast" }, { rgb: "111 224 160", at: 540, laser: true, box: [44, 34, 12, 18] }),
  ov_nerfchess_the_musical: S(MusicalScene, { ordering: "sweep", staggerMs: 80, victims: "all", hasLead: true, sound: "clockcage", anchor: "cast" }, { rgb: "232 138 184", at: 600, shock: true, box: [42, 37, 15, 15] }),
  ov_standing_ovation: S(StandingOvationScene, { ordering: "radial", staggerMs: 55, victims: "all", hasLead: true, sound: "siege", anchor: "board" }, { rgb: "240 196 92", at: 640, glyph: impGear("#f0c45c", "#2b2311"), shock: true, box: [43, 36, 14, 14] }),
  ov_the_tutorial: S(TutorialScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }, { rgb: "127 208 232", at: 580, laser: true, box: [43, 37, 13, 15] }),
  ov_wish_fish: S(WishFishScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "siege", anchor: "board" }, { rgb: "111 184 216", at: 520, shock: true, box: [44, 41, 12, 11] }),
  ov_algorithm_boost: S(AlgorithmBoostScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "board" }, { rgb: "127 224 208", at: 500, laser: true, shock: true, box: [44, 36, 12, 14], rot: 8 }),
  ov_coliseum: S(ColiseumScene, { ordering: "octagon", staggerMs: 60, victims: "all", hasLead: true, sound: "siege", anchor: "board" }, { rgb: "220 154 82", at: 640, shock: true, box: [40, 38, 19, 13] }),
  ov_fourth_wall_crew: S(FourthWallCrewScene, { ordering: "line", staggerMs: 75, victims: "all", hasLead: true, sound: "blitz", anchor: "board" }, { rgb: "159 176 200", at: 560, glyph: impGear("#9fb0c8", "#1a2028"), box: [43, 38, 13, 13] }),
  ov_insider_trading: S(InsiderTradingScene, { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "chips", anchor: "board" }, { rgb: "232 208 138", at: 620, laser: true, box: [44, 35, 12, 16] }),
  ov_prophecy_engine: S(ProphecyEngineScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }, { rgb: "180 154 232", at: 660, laser: true, glyph: impGear("#b49ae8", "#1c1630"), box: [42, 36, 14, 15] }),
  ov_speedhack: S(SpeedhackScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz", anchor: "board" }, { rgb: "166 240 76", at: 460, shock: true, box: [45, 39, 11, 11] }),
  bn4_grandfather_clock: S(GrandfatherClockScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }, { rgb: "216 168 96", at: 680, glyph: impGear("#d8a860", "#241708"), shock: true, box: [43, 33, 14, 18] }),
  ov_golden_goose: S(GoldenGooseScene, { ordering: "radial", staggerMs: 55, victims: ["p"], hasLead: true, sound: "chips", anchor: "cast" }, { rgb: "240 197 65", at: 540, shock: true, box: [44, 40, 12, 12] }),
  ov_midas_gauntlet: S(MidasGauntletScene, { ordering: "line", staggerMs: 65, victims: "all", hasLead: true, sound: "chips", anchor: "aim" }, { rgb: "255 224 138", at: 560, laser: true, box: [43, 36, 13, 15], rot: -12 }),
  ov_private_gallery: S(PrivateGalleryScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "vault", anchor: "board" }, { rgb: "143 176 216", at: 500, shock: true, box: [43, 38, 14, 12] }),
  ov_rage_bait: S(RageBaitScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz", anchor: "board" }, { rgb: "232 87 76", at: 520, glyph: impGear("#e8574c", "#24100c"), box: [44, 38, 12, 13] }),
  ov_stack_overflow: S(StackOverflowScene, { ordering: "file", staggerMs: 70, victims: "all", hasLead: true, sound: "siege", anchor: "board" }, { rgb: "143 156 224", at: 580, laser: true, shock: true, box: [43, 34, 13, 17] }),
  ov_vampire_court: S(VampireCourtScene, { ordering: "octagon", staggerMs: 65, victims: ["n", "b"], hasLead: true, sound: "siege", anchor: "board" }, { rgb: "192 64 90", at: 600, laser: true, box: [42, 35, 14, 17] }),
  bn4_overtime_claim: S(OvertimeClaimScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "chips", anchor: "board" }, { rgb: "111 208 176", at: 480, shock: true, box: [44, 39, 12, 12] }),
  bn4_pocket_metronome: S(PocketMetronomeScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "board" }, { rgb: "224 168 120", at: 440, shock: true, box: [45, 40, 11, 11] }),
};
