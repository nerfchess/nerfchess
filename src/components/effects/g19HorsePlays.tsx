// g19HorsePlays — bespoke plays for the 27 knight / leaping-movement cards that
// used to share the generated `knightVault` family (one vault, 27 hue shifts).
//
// MODULE FICTION: THE HORSE AND ITS HANDLERS. Not one card depicts the jump.
// Every scene is about the ANIMAL and the people around it: a farrier's rasp
// running the hoof wall, a mane plaited bunch by bunch, a horse shying at a
// bang and a flat hand settling it, a nosebag lifted and the head coming up, a
// mounting block thumped down and a boot into the iron, a curry comb raising
// dust in strokes, a bit taken and the head tossing, a horse rolling in the
// dust and rising in one shove, a foal's first stagger, two stallions squared
// up nose to nose, a head lifting to scent the wind.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g19HorsePlays.css), transform/opacity animations only, no imports from
// BoardEffects.tsx, only the SigPlugin/SigRole TYPES from sigPlugins.tsx.
//
// STAGING. Every card declares anchor "cast" or "aim", so the scene happens on
// the square the card was played on. Board-scale layers (yard light, edge
// gilt) live inside <BoardFrame>, never at a fixed percentage of the stage.
// The two cards whose fiction genuinely runs along a line (a lead rope going
// bar-taut, wind streaming past a lifted head) use <AimStage> and author their
// art pointing RIGHT.
//
// Every scene runs three beats — tell, strike, settle — in all three roles
// ("lead", "target", "entrance"), and every scene carries at least one animated
// layer driven by the geometry vars (--fx-side arrivals and drift, --fx-ox/oy
// lean, --fx-len rope run, --fx-index/--fx-n sequence). All CSS lives in
// g19HorsePlays.css behind the `g19-` prefix.

import "./g19HorsePlays.css";

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
const rootStyle = (d: number): CSSProperties => ({ "--g19-d": `${d}ms` }) as CSSProperties;

/** stagger + a beat offset, scaled by the Settings animation-speed var. */
const b = (ms: number): string => `calc(var(--g19-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

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

/** Yard light over the whole board, always inside a BoardFrame. */
function Yard({ tone, d = 0 }: { tone: string; d?: number }) {
  return <L c="g19-wash" d={d} st={{ background: `radial-gradient(circle at 50% 48%, ${tone}, transparent 70%)` }} />;
}

/** Board-edge gilt, always inside a BoardFrame. */
function Rim({ tone, d = 160 }: { tone: string; d?: number }) {
  return <L c="g19-rim" d={d} st={{ boxShadow: `inset 0 0 30px 9px ${tone}` }} />;
}

/* Silhouettes the handlers work on. Every card that reuses one dresses it with
   a different structural element (a half-door, a hood, a rail, a plume). */
const HEAD =
  "M9.6 22.4l.5-6.5c.2-2.7 1.2-4.8 3-6.3L11.4 4l3.3 2.7L17 3.4l.5 4.7c2.3 1.5 3.5 3.6 3.8 6.1l.4 3.3-4-.8-2.2 2.8-3.2.7-.3 2.5z";
const HOOF = "M6.6 6.4h10.8l1 8.4c.3 2.6-2 4.4-6.4 4.4s-6.7-1.8-6.4-4.4z";
const MUZZLE = "M4.2 10.4c0-2.9 3.2-5 8-5 5 0 8.8 2.6 8.8 5.8 0 3.4-3.8 5.6-8.8 5.6-4.8 0-8-2.6-8-6.4z";
const HAND = "M8 21.4v-9c0-1.1 1.7-1.1 1.7 0V7.8c0-1.2 1.8-1.2 1.8 0v3.6c0-1.3 1.8-1.3 1.8 0V9.2c0-1.3 1.8-1.3 1.8 0v7.8c0 2.8-1.7 4.4-4.6 4.4z";

/* --- 1. Overslept Officers (t2) — FLAT OUT IN THE STRAW ----------------------
   The horse is lying stretched out on its side in deep bedding, breathing
   slowly; straw is scuffed over its flank, one ear flicks at the yard noise
   and nothing else moves. Palette: #d8c48a / #fff2d2 / #2a2314. */
function OversleptOfficersScene({ role, delayMs }: SceneProps) {
  const lying = (
    <g {...SJ}>
      <path d="M3.6 16.6c2.2-3 5.6-4.4 9.4-4.4 3.4 0 6.2.9 8.4 2.6l-.8 3.4H4.2z" fill="#d8c48a" stroke="#2a2314" strokeWidth="1.1" />
      <path d="M9.6 13L6.2 8.4 2.4 7" fill="none" stroke="#d8c48a" strokeWidth="2.2" />
      <path d="M14.6 13.6l3.8 3.2M17.8 13.8l3.4 2.6" fill="none" stroke="#2a2314" strokeWidth="1.2" />
    </g>
  );
  const straw = (
    <path d="M2 19h20M4.4 16l4.2 2.6M12.6 16.4l4.8 2.2" fill="none" stroke="#d8c48a" strokeWidth="1.2" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g19-ent-rise" l={6} t={26} w={88} h={54} d={40}>{lying}</V>
        <V c="g19-os-straw" l={4} t={58} w={92} h={34} d={260}>{straw}</V>
        <L c="g19-os-breath" l={6} t={30} w={16} h={16} d={470} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,210,0.8), transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hitside" l={8} t={28} w={84} h={50} d={0}>{lying}</V>
        <V c="g19-hit" l={6} t={58} w={88} h={30} d={130}>{straw}</V>
        <L c="g19-hit2" l={10} t={30} w={12} h={12} d={250} st={{ borderRadius: "50%", background: "#fff2d2" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Yard tone="rgba(216,196,138,0.26)" />}>
      <V c="g19-os-lie" l={38} t={43} w={26} h={16} d={90}>{lying}</V>
      <V c="g19-os-straw" l={37} t={50} w={28} h={10} d={260}>{straw}</V>
      <L c="g19-os-breath" l={37} t={44} w={5} h={5} d={430} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,210,0.85), transparent 70%)" }} />
      <V c="g19-os-ear" l={39.5} t={41} w={4} h={5} d={560} st={{ transformOrigin: "50% 100%" }}>
        <path d="M12 2.4l3 8.4h-6z" fill="#d8c48a" stroke="#2a2314" strokeWidth="1" {...SJ} />
      </V>
      <L c="g19-lean" l={37} t={56} w={26} h={3} d={640} st={{ borderRadius: "999px", background: "rgba(42,35,20,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g19-wisp" l={40 + i * 8} t={52} w={1.6} h={1.6} d={720 + i * 110} st={{ borderRadius: "50%", background: "#d8c48a" }} />
      ))}
    </Lead>
  );
}

/* --- 2. Short Stirrups (t2) — THE LEATHERS COME UP ---------------------------
   A stirrup leather is hauled through the buckle, the punch goes through three
   fresh holes, and the iron rides up short and swings against the flap.
   Palette: #c08a4e / #ffeecd / #2b1b0d. */
function ShortStirrupsScene({ role, delayMs }: SceneProps) {
  const iron = (
    <g {...SJ}>
      <path d="M6 6h12v6.6c0 4-2.6 6.4-6 6.4s-6-2.4-6-6.4z" fill="none" stroke="#c08a4e" strokeWidth="2.4" />
      <path d="M6.4 18.2h11.2" stroke="#ffeecd" strokeWidth="2" />
    </g>
  );
  const leather = (
    <g {...SJ}>
      <path d="M10 1.4h4v21h-4z" fill="#c08a4e" stroke="#2b1b0d" strokeWidth="1" />
      <path d="M12 6.4v.1M12 11v.1M12 15.6v.1" stroke="#2b1b0d" strokeWidth="2.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g19-ent-drop" l={30} t={2} w={40} h={64} d={40}>{leather}</V>
        <V c="g19-st-punch" l={54} t={26} w={34} h={30} d={260}>
          <path d="M12 2v13M9 15h6l-3 6z" fill="#ffeecd" stroke="#2b1b0d" strokeWidth="1.1" {...SJ} />
        </V>
        <V c="g19-st-iron" l={28} t={54} w={44} h={40} d={470}>{iron}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hitside" l={34} t={4} w={32} h={56} d={0}>{leather}</V>
        <V c="g19-hit" l={30} t={50} w={40} h={40} d={130}>{iron}</V>
        <L c="g19-hit2" l={44} t={44} w={12} h={4} d={250} st={{ borderRadius: "999px", background: "#ffeecd" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Yard tone="rgba(192,138,78,0.26)" />}>
      <V c="g19-st-strap" l={45} t={33} w={6} h={22} d={90} st={{ transformOrigin: "50% 0%" }}>{leather}</V>
      <V c="g19-st-punch" l={50} t={38} w={8} h={8} d={280}>
        <path d="M12 2v13M9 15h6l-3 6z" fill="#ffeecd" stroke="#2b1b0d" strokeWidth="1.1" {...SJ} />
      </V>
      <V c="g19-st-iron" l={43.5} t={45} w={9} h={11} d={440} st={{ transformOrigin: "50% 0%" }}>{iron}</V>
      <L c="g19-st-swing" l={41} t={50} w={10} h={1.8} d={600} st={{ borderRadius: "999px", background: "#ffeecd", transformOrigin: "0% 50%" }} />
      <L c="g19-lean" l={40} t={57} w={20} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(43,27,13,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g19-wisp" l={48 + i * 5} t={41} w={1.4} h={1.4} d={720 + i * 100} st={{ borderRadius: "50%", background: "#c08a4e" }} />
      ))}
    </Lead>
  );
}

/* --- 3. No Horses on the Lawn (t2) — OFF THE GRASS ---------------------------
   A hoof is picked up out of the turf, the divot it tore is trodden back flat,
   and the horse is walked off the lawn on a headcollar rope. Palette: #8fbf6a
   / #fff4d6 / #1e2a14. */
function NoHorsesOnLawnScene({ role, delayMs }: SceneProps) {
  const turf = (
    <path d="M2 18h20M4 18c0-2.4.8-3.6 1.6-4.4M9 18c0-3 .8-4.4 1.8-5.4M15 18c0-2.6.6-4 1.6-4.8M20 18c0-2.2-.6-3.4-1.4-4" fill="none" stroke="#8fbf6a" strokeWidth="1.4" {...SJ} />
  );
  const divot = <path d="M3 14c3.4-2.6 7-3.4 11-2.4l6 1.6-2.6 4.4H4.4z" fill="#1e2a14" stroke="#8fbf6a" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g19-lw-hoof" l={26} t={8} w={44} h={50} d={40}><path d={HOOF} fill="#fff4d6" stroke="#1e2a14" strokeWidth="1.2" {...SJ} /></V>
        <V c="g19-lw-divot" l={8} t={50} w={80} h={40} d={260}>{divot}</V>
        <V c="g19-ent-pop" l={6} t={58} w={88} h={34} d={470}>{turf}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hitside" l={28} t={10} w={44} h={48} d={0}><path d={HOOF} fill="#fff4d6" stroke="#1e2a14" strokeWidth="1.2" {...SJ} /></V>
        <V c="g19-hit" l={10} t={52} w={80} h={38} d={130}>{divot}</V>
        <L c="g19-hit2" l={30} t={80} w={40} h={3} d={250} st={{ borderRadius: "999px", background: "#8fbf6a" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Yard tone="rgba(143,191,106,0.26)" />}>
      <V c="g19-lw-hoof" l={44} t={36} w={9} h={11} d={90}><path d={HOOF} fill="#fff4d6" stroke="#1e2a14" strokeWidth="1.2" {...SJ} /></V>
      <V c="g19-lw-divot" l={41} t={47} w={16} h={9} d={280}>{divot}</V>
      <V c="g19-lw-blade" l={38} t={49} w={24} h={9} d={450}>{turf}</V>
      <V c="g19-lw-lead" l={50} t={34} w={16} h={16} d={600}>
        <path d="M2 3c5.6 1.6 10 6 13 13" fill="none" stroke="#fff4d6" strokeWidth="1.6" {...SJ} />
      </V>
      <L c="g19-lean" l={40} t={55} w={20} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(30,42,20,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g19-wisp" l={42 + i * 7} t={47} w={1.5} h={1.5} d={740 + i * 100} st={{ borderRadius: "50%", background: "#8fbf6a" }} />
      ))}
    </Lead>
  );
}

/* --- 4. Old Counselor (t2) — THE OLD GREY ------------------------------------
   A grey muzzle, whiskered and going white, is steadied by a hand on the
   cheekpiece while one stiff forehoof is placed carefully out to the side.
   Palette: #b9bcc4 / #fff2dc / #23262c. */
function OldCounselorScene({ role, delayMs }: SceneProps) {
  const muzzle = (
    <g {...SJ}>
      <path d={MUZZLE} fill="#b9bcc4" stroke="#23262c" strokeWidth="1.1" />
      <path d="M16.6 9.4c1.4 0 1.9 1 1.9 2s-.7 1.6-1.7 1.6" fill="none" stroke="#23262c" strokeWidth="1.1" />
      <path d="M19 14.6l3 1.6M19.4 12.6l3.2.4M18.4 16.4l2.4 2.4" stroke="#fff2dc" strokeWidth="0.8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g19-ent-rise" l={4} t={22} w={72} h={54} d={40}>{muzzle}</V>
        <V c="g19-oc-hand" l={52} t={12} w={40} h={52} d={260}><path d={HAND} fill="#fff2dc" stroke="#23262c" strokeWidth="1" {...SJ} /></V>
        <V c="g19-oc-step" l={30} t={62} w={40} h={34} d={470}><path d={HOOF} fill="#b9bcc4" stroke="#23262c" strokeWidth="1.2" {...SJ} /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hitside" l={6} t={24} w={70} h={48} d={0}>{muzzle}</V>
        <V c="g19-hit" l={56} t={16} w={36} h={44} d={130}><path d={HAND} fill="#fff2dc" {...SJ} /></V>
        <L c="g19-hit2" l={30} t={80} w={40} h={3} d={250} st={{ borderRadius: "999px", background: "#b9bcc4" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Yard tone="rgba(185,188,196,0.26)" />}>
      <V c="g19-oc-muzzle" l={38} t={38} w={18} h={14} d={90}>{muzzle}</V>
      <V c="g19-oc-whisker" l={52} t={40} w={9} h={9} d={280}>
        <path d="M2 4l18 3M2 10l17 6M3 16l14 6" fill="none" stroke="#fff2dc" strokeWidth="1.1" {...SJ} />
      </V>
      <V c="g19-oc-hand" l={36} t={35} w={8} h={10} d={420}><path d={HAND} fill="#fff2dc" stroke="#23262c" strokeWidth="1" {...SJ} /></V>
      <V c="g19-oc-step" l={49} t={49} w={7} h={9} d={580}><path d={HOOF} fill="#b9bcc4" stroke="#23262c" strokeWidth="1.2" {...SJ} /></V>
      <L c="g19-lean" l={41} t={57} w={20} h={3} d={640} st={{ borderRadius: "999px", background: "rgba(35,38,44,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g19-wisp" l={44 + i * 6} t={53} w={1.4} h={1.4} d={720 + i * 110} st={{ borderRadius: "50%", background: "#b9bcc4" }} />
      ))}
    </Lead>
  );
}

/* --- 5. Stable Gate (t2) — THE HALF-DOOR --------------------------------------
   The top bolt is drawn back, the half-door swings wide on its hinge and the
   horse's head comes straight out over the bottom leaf. Palette: #a9743f /
   #ffeec9 / #241608. */
function StableGateScene({ role, delayMs }: SceneProps) {
  const door = (
    <g {...SJ}>
      <path d="M3 3h18v18H3z" fill="#a9743f" stroke="#241608" strokeWidth="1.2" />
      <path d="M3 8.6h18M3 15.4h18" stroke="#241608" strokeWidth="1" />
    </g>
  );
  const bolt = (
    <g {...SJ}>
      <path d="M3 10h16v4H3z" fill="#ffeec9" stroke="#241608" strokeWidth="1.1" />
      <path d="M15 7.4h3.4v9.2H15z" fill="#241608" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g19-sg-bolt" l={16} t={10} w={68} h={26} d={40}>{bolt}</V>
        <V c="g19-sg-door" l={4} t={28} w={54} h={64} d={260} st={{ transformOrigin: "4% 50%" }}>{door}</V>
        <V c="g19-sg-head" l={50} t={18} w={44} h={70} d={470}><path d={HEAD} fill="#ffeec9" stroke="#241608" strokeWidth="1.2" {...SJ} /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hit" l={12} t={12} w={64} h={22} d={0}>{bolt}</V>
        <V c="g19-hitside" l={44} t={22} w={48} h={66} d={130}><path d={HEAD} fill="#ffeec9" stroke="#241608" strokeWidth="1.2" {...SJ} /></V>
        <L c="g19-hit2" l={10} t={78} w={70} h={4} d={250} st={{ borderRadius: "999px", background: "#a9743f" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Yard tone="rgba(169,116,63,0.26)" />}>
      <V c="g19-sg-bolt" l={40} t={36} w={14} h={5} d={90}>{bolt}</V>
      <V c="g19-sg-door" l={36} t={38} w={14} h={18} d={260} st={{ transformOrigin: "4% 50%" }}>{door}</V>
      <V c="g19-sg-head" l={49} t={38} w={11} h={16} d={440}><path d={HEAD} fill="#ffeec9" stroke="#241608" strokeWidth="1.2" {...SJ} /></V>
      <V c="g19-sg-latch" l={46} t={44} w={5} h={5} d={600}>
        <path d="M6 12h12M12 6v12" stroke="#ffeec9" strokeWidth="2" fill="none" {...SJ} />
      </V>
      <L c="g19-lean" l={38} t={56} w={22} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(36,22,8,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g19-wisp" l={41 + i * 7} t={52} w={1.5} h={1.5} d={720 + i * 100} st={{ borderRadius: "50%", background: "#a9743f" }} />
      ))}
    </Lead>
  );
}

/* --- 6. Gum Drop (t1) — THE HOOF PICK STICKS ---------------------------------
   The near fore is lifted between the groom's knees, the pick goes into the
   sole and comes back with a pink strand stretching after it. The hoof will
   not come clean. Palette: #f0a8c8 / #fff4d6 / #331a26. */
function GumDropScene({ role, delayMs }: SceneProps) {
  const hoof = (
    <g {...SJ}>
      <path d={HOOF} fill="#fff4d6" stroke="#331a26" strokeWidth="1.2" />
      <path d="M8.4 14.6h7.2" stroke="#331a26" strokeWidth="1.1" />
    </g>
  );
  const pick = (
    <g {...SJ}>
      <path d="M4 20l10-10" stroke="#331a26" strokeWidth="2.2" fill="none" />
      <path d="M13 9.4l6-6 2.4 2.4-6 6z" fill="#f0a8c8" stroke="#331a26" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g19-gd-hoof" l={24} t={12} w={48} h={52} d={40}>{hoof}</V>
        <V c="g19-gd-pick" l={44} t={38} w={50} h={50} d={260} st={{ transformOrigin: "20% 80%" }}>{pick}</V>
        <L c="g19-gd-strand" l={44} t={56} w={4} h={30} d={470} st={{ borderRadius: "999px", background: "#f0a8c8", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hitside" l={26} t={14} w={48} h={50} d={0}>{hoof}</V>
        <V c="g19-hit" l={46} t={40} w={46} h={46} d={130}>{pick}</V>
        <L c="g19-hit2" l={46} t={60} w={5} h={22} d={250} st={{ borderRadius: "999px", background: "#f0a8c8", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Yard tone="rgba(240,168,200,0.26)" />}>
      <V c="g19-gd-hoof" l={43} t={38} w={11} h={13} d={90}>{hoof}</V>
      <V c="g19-gd-pick" l={50} t={42} w={12} h={12} d={280} st={{ transformOrigin: "20% 80%" }}>{pick}</V>
      <L c="g19-gd-strand" l={48} t={49} w={1.6} h={8} d={470} st={{ borderRadius: "999px", background: "#f0a8c8", transformOrigin: "50% 0%" }} />
      <L c="g19-gd-blob" l={45} t={52} w={7} h={4} d={620} st={{ borderRadius: "50%", background: "#f0a8c8" }} />
      <L c="g19-lean" l={41} t={56} w={19} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(51,26,38,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g19-wisp" l={46 + i * 5} t={45} w={1.4} h={1.4} d={720 + i * 100} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 7. Knight's Errand (t1) — THE FOAL'S FIRST STEP -------------------------
   Four long legs splay, fold, and shove; the foal gets up, wobbles one step
   sideways and is steadied by the mare's muzzle at its shoulder. Palette:
   #e0c9a6 / #fff4d6 / #2d2318. */
function KnightsErrandScene({ role, delayMs }: SceneProps) {
  const foal = (
    <g {...SJ}>
      <path d="M6.4 10.4c1.8-1.8 6.4-2.2 9.2-.8l1.4-4.6 1.6 1.2-.4 4.4c1 .8 1.4 2 1.2 3.2" fill="none" stroke="#e0c9a6" strokeWidth="2" />
      <path d="M7.4 11.4L5.6 21M9.6 11.6L9 21M14.4 11.6l1 9.4M16.6 11.2l2.2 9.6" fill="none" stroke="#e0c9a6" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g19-fl-legs" l={16} t={16} w={68} h={64} d={40}>{foal}</V>
        <V c="g19-fl-nudge" l={56} t={30} w={40} h={40} d={260}><path d={MUZZLE} fill="#fff4d6" stroke="#2d2318" strokeWidth="1.1" {...SJ} /></V>
        <L c="g19-fl-wobble" l={20} t={80} w={60} h={4} d={470} st={{ borderRadius: "999px", background: "#e0c9a6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hitside" l={18} t={14} w={64} h={64} d={0}>{foal}</V>
        <V c="g19-hit" l={56} t={30} w={38} h={38} d={130}><path d={MUZZLE} fill="#fff4d6" {...SJ} /></V>
        <L c="g19-hit2" l={22} t={80} w={56} h={3} d={250} st={{ borderRadius: "999px", background: "#2d2318" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Yard tone="rgba(224,201,166,0.26)" />}>
      <V c="g19-fl-legs" l={41} t={38} w={14} h={16} d={90}>{foal}</V>
      <V c="g19-fl-stand" l={41} t={38} w={14} h={16} d={300}>{foal}</V>
      <V c="g19-fl-nudge" l={53} t={41} w={9} h={9} d={470}><path d={MUZZLE} fill="#fff4d6" stroke="#2d2318" strokeWidth="1.1" {...SJ} /></V>
      <L c="g19-fl-wobble" l={41} t={54} w={14} h={1.8} d={600} st={{ borderRadius: "999px", background: "#e0c9a6" }} />
      <L c="g19-lean" l={40} t={56} w={18} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(45,35,24,0.55)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g19-wisp" l={42 + i * 6} t={53} w={1.4} h={1.4} d={720 + i * 100} st={{ borderRadius: "50%", background: "#e0c9a6" }} />
      ))}
    </Lead>
  );
}

/* --- 8. No Man's Reach (t1) — THE BLINKER HOOD -------------------------------
   A knitted hood is drawn over the ears, the cups settle either side of the
   eye and the throat strap is buckled. The head swings back and sees nothing.
   Palette: #6f7d96 / #ffeece / #161d2b. */
function NoMansReachScene({ role, delayMs }: SceneProps) {
  const hood = (
    <g {...SJ}>
      <path d="M6 5.4c3-2.4 9-2.4 12 0l1.6 9.6c.4 3.2-2.4 5.6-7.6 5.6s-8-2.4-7.6-5.6z" fill="#6f7d96" stroke="#161d2b" strokeWidth="1.2" />
      <path d="M8.4 3.4l1.6-2.2M15.6 3.4L14 1.2" stroke="#6f7d96" strokeWidth="2" />
      <path d="M7.6 11.4h3.2M13.2 11.4h3.2" stroke="#ffeece" strokeWidth="1.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g19-bl-turn" l={24} t={16} w={52} h={68} d={40}><path d={HEAD} fill="#ffeece" stroke="#161d2b" strokeWidth="1.2" {...SJ} /></V>
        <V c="g19-bl-hood" l={20} t={10} w={60} h={62} d={260}>{hood}</V>
        <V c="g19-bl-buckle" l={54} t={62} w={30} h={28} d={470}>
          <path d="M4 8h16v8H4z" fill="none" stroke="#ffeece" strokeWidth="2" {...SJ} />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hitside" l={26} t={18} w={48} h={64} d={0}><path d={HEAD} fill="#ffeece" stroke="#161d2b" strokeWidth="1.2" {...SJ} /></V>
        <V c="g19-hit" l={22} t={12} w={56} h={58} d={130}>{hood}</V>
        <L c="g19-hit2" l={36} t={78} w={28} h={4} d={250} st={{ borderRadius: "999px", background: "#6f7d96" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Yard tone="rgba(111,125,150,0.26)" />}>
      <V c="g19-bl-turn" l={43} t={37} w={12} h={17} d={90}><path d={HEAD} fill="#ffeece" stroke="#161d2b" strokeWidth="1.2" {...SJ} /></V>
      <V c="g19-bl-hood" l={42} t={34} w={14} h={16} d={280}>{hood}</V>
      <V c="g19-bl-buckle" l={49} t={47} w={6} h={6} d={450}>
        <path d="M4 8h16v8H4z" fill="none" stroke="#ffeece" strokeWidth="2.4" {...SJ} />
      </V>
      <L c="g19-bl-blink" l={45} t={41} w={5} h={2} d={600} st={{ borderRadius: "999px", background: "#161d2b" }} />
      <L c="g19-lean" l={41} t={56} w={19} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(22,29,43,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g19-wisp" l={44 + i * 6} t={51} w={1.4} h={1.4} d={720 + i * 100} st={{ borderRadius: "50%", background: "#6f7d96" }} />
      ))}
    </Lead>
  );
}

/* --- 9. Tangled Reins (t1) — THE KNOT PULLS UP -------------------------------
   A loose rein loops itself twice around the noseband, the loop closes into a
   hard knot and the head is drawn up short against it, leather fraying.
   Palette: #a4643c / #ffe9c4 / #2a180c. */
function TangledReinsScene({ role, delayMs }: SceneProps) {
  const loop = (
    <path d="M4 12c0-4.4 3.6-7 8-7s8 2.6 8 7-3.6 7-8 7-8-2.6-8-7z" fill="none" stroke="#a4643c" strokeWidth="2.4" />
  );
  const knot = (
    <g {...SJ}>
      <path d="M6 9.4c3-3.6 9-3.6 12 0M6 14.6c3 3.6 9 3.6 12 0" fill="none" stroke="#a4643c" strokeWidth="2.4" />
      <path d="M9 8.6c2 2.4 2 4.4 0 6.8M15 8.6c-2 2.4-2 4.4 0 6.8" fill="none" stroke="#ffe9c4" strokeWidth="1.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g19-tr-loop" l={10} t={16} w={56} h={56} d={40}>{loop}</V>
        <V c="g19-tr-knot" l={34} t={28} w={52} h={48} d={260}>{knot}</V>
        <L c="g19-tr-pull" l={44} t={4} w={5} h={34} d={470} st={{ borderRadius: "999px", background: "#a4643c", transformOrigin: "50% 100%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hitside" l={12} t={18} w={54} h={54} d={0}>{loop}</V>
        <V c="g19-hit" l={36} t={30} w={50} h={46} d={130}>{knot}</V>
        <L c="g19-hit2" l={44} t={6} w={6} h={28} d={250} st={{ borderRadius: "999px", background: "#a4643c" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Yard tone="rgba(164,100,60,0.26)" />}>
      <V c="g19-tr-loop" l={38} t={38} w={16} h={16} d={90}>{loop}</V>
      <V c="g19-tr-knot" l={45} t={41} w={12} h={11} d={300}>{knot}</V>
      <L c="g19-tr-pull" l={49} t={30} w={1.8} h={12} d={470} st={{ borderRadius: "999px", background: "#a4643c", transformOrigin: "50% 100%" }} />
      <V c="g19-tr-fray" l={52} t={45} w={9} h={8} d={620}>
        <path d="M2 12h9M11 12l8-4M11 12l8 4M11 12l7 8" fill="none" stroke="#ffe9c4" strokeWidth="1.2" {...SJ} />
      </V>
      <L c="g19-lean" l={40} t={56} w={20} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(42,24,12,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g19-wisp" l={43 + i * 6} t={49} w={1.4} h={1.4} d={730 + i * 100} st={{ borderRadius: "50%", background: "#a4643c" }} />
      ))}
    </Lead>
  );
}

/* --- 10. Camel Fair (t1) — PLAITED FOR THE FAIR ------------------------------
   The mane is split into bunches and rolled up one after another along the
   crest, each plait tied off with a ribbon, comb tucked behind. Palette:
   #e8b45c / #fff4d6 / #33220c. */
const PL_BUNCHES = [0, 1, 2, 3];

function CamelFairScene({ role, delayMs }: SceneProps) {
  const plait = (
    <g {...SJ}>
      <path d="M12 2c-2 2.4-2 4 0 6.4-2 2.4-2 4 0 6.4-2 2.4-2 4 0 6.4" fill="none" stroke="#e8b45c" strokeWidth="2.6" />
      <path d="M8.6 5.4h6.8M8.6 11.8h6.8M8.6 18.2h6.8" stroke="#33220c" strokeWidth="1" />
    </g>
  );
  const comb = (
    <g {...SJ}>
      <path d="M3 6h18v4H3z" fill="#fff4d6" stroke="#33220c" strokeWidth="1" />
      <path d="M5 10v6M8 10v6M11 10v6M14 10v6M17 10v6M20 10v6" stroke="#fff4d6" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        {PL_BUNCHES.slice(0, 3).map((i) => (
          <V key={i} c="g19-pl-strand" l={12 + i * 24} t={8} w={22} h={56} d={40 + i * 120}>{plait}</V>
        ))}
        <V c="g19-pl-comb" l={26} t={54} w={48} h={40} d={470}>{comb}</V>
        <L c="g19-pl-ribbon" l={44} t={16} w={12} h={5} d={620} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hitside" l={16} t={10} w={26} h={60} d={0}>{plait}</V>
        <V c="g19-idxpull" l={52} t={12} w={26} h={58} d={130}>{plait}</V>
        <L c="g19-hit2" l={34} t={74} w={32} h={5} d={250} st={{ borderRadius: "999px", background: "#e8b45c" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Yard tone="rgba(232,180,92,0.26)" />}>
      <L c="g19-pl-crest" l={38} t={40} w={24} h={2.4} d={90} st={{ borderRadius: "999px", background: "#33220c", transformOrigin: "0% 50%" }} />
      {PL_BUNCHES.map((i) => (
        <V key={i} c="g19-pl-strand" l={39.5 + i * 5.4} t={41} w={5} h={11} d={200 + i * 130}>{plait}</V>
      ))}
      {PL_BUNCHES.map((i) => (
        <L key={i} c="g19-pl-ribbon" l={40 + i * 5.4} t={43} w={4} h={1.8} d={430 + i * 130} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      ))}
      <V c="g19-pl-comb" l={57} t={45} w={9} h={7} d={680}>{comb}</V>
      <L c="g19-lean" l={39} t={55} w={22} h={3} d={720} st={{ borderRadius: "999px", background: "rgba(51,34,12,0.6)" }} />
    </Lead>
  );
}

/* --- 11. Colt's Gallop (t1) — THE COLT LETS RIP ------------------------------
   A young horse takes off across the paddock with its tail straight up, all
   four feet off the grass, flinging clods behind it away from the caster's
   own rail. Palette: #c9803e / #fff2d2 / #2c1a0c. */
function ColtsGallopScene({ role, delayMs }: SceneProps) {
  const colt = (
    <g {...SJ}>
      <path d="M4.6 12.4c2.6-2.6 8.4-3 12-1.2l2.4-4.6 1.6 1-.8 4.8c1 1 1.4 2.2 1.2 3.6" fill="none" stroke="#c9803e" strokeWidth="2.2" />
      <path d="M5.6 13.2L2 18.6M8 13.6l-1.4 6M15.6 13l4.2 4.6M17.6 12.4l3.4 2" fill="none" stroke="#c9803e" strokeWidth="1.5" />
      <path d="M4.4 11.4C2.6 9.4 1.8 7 2.2 4.4" fill="none" stroke="#fff2d2" strokeWidth="1.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g19-cg-run" l={10} t={18} w={76} h={56} d={40}>{colt}</V>
        <V c="g19-cg-tail" l={2} t={10} w={34} h={44} d={260}>
          <path d="M20 20C14 16 10 10 9 3" fill="none" stroke="#fff2d2" strokeWidth="2" {...SJ} />
        </V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g19-cg-clod" l={8 + i * 12} t={72} w={5} h={5} d={470 + i * 100} st={{ borderRadius: "50%", background: "#2c1a0c" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hitside" l={12} t={20} w={72} h={54} d={0}>{colt}</V>
        <L c="g19-hit" l={14} t={72} w={40} h={4} d={130} st={{ borderRadius: "999px", background: "#c9803e" }} />
        <L c="g19-hit2" l={20} t={62} w={6} h={6} d={250} st={{ borderRadius: "50%", background: "#2c1a0c" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Yard tone="rgba(201,128,62,0.26)" />}>
      <V c="g19-cg-fence" l={34} t={52} w={32} h={6} d={90} par="none" vb="0 0 48 8">
        <path d="M0 2h48M0 6h48" stroke="#2c1a0c" strokeWidth="1.4" fill="none" {...SJ} />
      </V>
      <V c="g19-cg-run" l={40} t={40} w={18} h={14} d={240}>{colt}</V>
      <V c="g19-cg-tail" l={36} t={38} w={9} h={9} d={400}>
        <path d="M20 20C14 16 10 10 9 3" fill="none" stroke="#fff2d2" strokeWidth="2.2" {...SJ} />
      </V>
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g19-cg-clod" l={38 + i * 4} t={50} w={2} h={2} d={520 + i * 90} st={{ borderRadius: "50%", background: "#2c1a0c" }} />
      ))}
      <L c="g19-driftside" l={38} t={46} w={22} h={5} d={660} st={{ background: "linear-gradient(90deg, rgba(255,242,210,0.6), transparent)" }} />
      <L c="g19-lean" l={40} t={55} w={20} h={3} d={720} st={{ borderRadius: "999px", background: "rgba(44,26,12,0.55)" }} />
    </Lead>
  );
}

/* --- 12. Dromedary Post (t1) — TAKING THE BIT --------------------------------
   The bit is warmed in a hand and offered flat on the thumb; the horse mouths
   it in, the head tosses once and the cheekpieces drop into place. Palette:
   #cfd6dd / #ffe6bd / #23252b. */
function DromedaryPostScene({ role, delayMs }: SceneProps) {
  const bit = (
    <g {...SJ}>
      <circle cx="5" cy="12" r="3.4" fill="none" stroke="#cfd6dd" strokeWidth="1.8" />
      <circle cx="19" cy="12" r="3.4" fill="none" stroke="#cfd6dd" strokeWidth="1.8" />
      <path d="M8.4 12h3.2M12.4 12h3.2" stroke="#cfd6dd" strokeWidth="2.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g19-bt-mouth" l={10} t={24} w={56} h={48} d={40}><path d={MUZZLE} fill="#ffe6bd" stroke="#23252b" strokeWidth="1.1" {...SJ} /></V>
        <V c="g19-bt-bit" l={40} t={32} w={52} h={36} d={260}>{bit}</V>
        <V c="g19-bt-toss" l={14} t={8} w={54} h={56} d={470}><path d={HEAD} fill="#ffe6bd" stroke="#23252b" strokeWidth="1.1" {...SJ} /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hitside" l={12} t={26} w={54} h={46} d={0}><path d={MUZZLE} fill="#ffe6bd" stroke="#23252b" strokeWidth="1.1" {...SJ} /></V>
        <V c="g19-hit" l={40} t={34} w={50} h={34} d={130}>{bit}</V>
        <L c="g19-hit2" l={36} t={16} w={5} h={5} d={250} st={{ borderRadius: "50%", background: "#cfd6dd" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Yard tone="rgba(207,214,221,0.26)" />}>
      <V c="g19-bt-mouth" l={40} t={41} w={14} h={12} d={90}><path d={MUZZLE} fill="#ffe6bd" stroke="#23252b" strokeWidth="1.1" {...SJ} /></V>
      <V c="g19-bt-bit" l={45} t={43} w={13} h={9} d={280}>{bit}</V>
      <V c="g19-bt-toss" l={41} t={33} w={12} h={16} d={440}><path d={HEAD} fill="#ffe6bd" stroke="#23252b" strokeWidth="1.1" {...SJ} /></V>
      <V c="g19-bt-cheek" l={44} t={35} w={4} h={12} d={600}>
        <path d="M12 1v22" stroke="#23252b" strokeWidth="3" fill="none" {...SJ} />
      </V>
      <L c="g19-lean" l={41} t={56} w={19} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(35,37,43,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g19-wisp" l={45 + i * 5} t={47} w={1.4} h={1.4} d={720 + i * 100} st={{ borderRadius: "50%", background: "#cfd6dd" }} />
      ))}
    </Lead>
  );
}

/* --- 13. Field Sketch (t1) — THE CHARCOAL HORSE ------------------------------
   A stick of charcoal blocks the barrel in, then the neck, then the legs, one
   stroke after another until the horse stands on the page; the artist's thumb
   smudges the shadow. Palette: #dcd2c2 / #fff4d6 / #24211c. */
const SK_STROKES = [0, 1, 2, 3];

function FieldSketchScene({ role, delayMs }: SceneProps) {
  const outline = (
    <g fill="none" stroke="#24211c" strokeWidth="1.6" {...SJ}>
      <path d="M4.6 12.6c2.8-2.8 9-3.2 12.6-1.2l2.2-4.8 1.8 1.2-.8 5c1 1 1.4 2.2 1.2 3.6" />
      <path d="M5.6 13.4v7.2M8.4 13.8v6.8M15.6 13.4l.8 7.2M18 12.8l1.4 7.6" />
    </g>
  );
  const charcoal = (
    <g {...SJ}>
      <path d="M4 20l11-11 3 3-11 11z" fill="#24211c" stroke="#dcd2c2" strokeWidth="1" />
      <path d="M15 9l4-4 3 3-4 4z" fill="#dcd2c2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g19-sk-page" l={8} t={10} w={84} h={78} d={40} st={{ background: "#fff4d6" }} />
        <V c="g19-sk-line" l={12} t={22} w={76} h={54} d={260}>{outline}</V>
        <V c="g19-sk-hand" l={50} t={40} w={44} h={46} d={470}>{charcoal}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g19-hitside" l={10} t={12} w={80} h={74} d={0} st={{ background: "#fff4d6" }} />
        <V c="g19-hit" l={14} t={24} w={72} h={50} d={130}>{outline}</V>
        <L c="g19-hit2" l={22} t={78} w={54} h={3} d={250} st={{ borderRadius: "999px", background: "#24211c" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Yard tone="rgba(220,210,194,0.26)" />}>
      <L c="g19-sk-page" l={38} t={36} w={24} h={22} d={90} st={{ background: "#fff4d6" }} />
      {SK_STROKES.map((i) => (
        <L key={i} c="g19-sk-stroke" l={40} t={40 + i * 3.6} w={20} h={1.4} d={220 + i * 120} st={{ borderRadius: "999px", background: "#24211c", transformOrigin: "0% 50%" }} />
      ))}
      <V c="g19-sk-line" l={40} t={39} w={20} h={16} d={620}>{outline}</V>
      <V c="g19-sk-hand" l={54} t={44} w={9} h={9} d={680}>{charcoal}</V>
      <L c="g19-lean" l={39} t={57} w={22} h={3} d={740} st={{ borderRadius: "999px", background: "rgba(36,33,28,0.55)" }} />
    </Lead>
  );
}

/* --- 14. Giraffe Keeper (t1) — MEASURED AT THE WITHERS -----------------------
   The measuring standard is stood against the shoulder, the sliding arm is
   brought down to the withers and read off, and the head goes straight up out
   of the keeper's reach. Palette: #b4d4c0 / #fff4d6 / #17302a. */
function GiraffeKeeperScene({ role, delayMs }: SceneProps) {
  const standard = (
    <g {...SJ}>
      <path d="M11 1.6h2v20.8h-2z" fill="#b4d4c0" stroke="#17302a" strokeWidth="1" />
      <path d="M8.4 5h2M8.4 8.4h2M8.4 11.8h2M8.4 15.2h2M8.4 18.6h2" stroke="#17302a" strokeWidth="1" />
    </g>
  );
  const arm = <path d="M2 9h20v4H2z" fill="#fff4d6" stroke="#17302a" strokeWidth="1.2" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g19-ms-stick" l={12} t={4} w={26} h={88} d={40}>{standard}</V>
        <V c="g19-ms-arm" l={20} t={38} w={62} h={22} d={260}>{arm}</V>
        <V c="g19-ms-lift" l={48} t={8} w={46} h={62} d={470}><path d={HEAD} fill="#fff4d6" stroke="#17302a" strokeWidth="1.2" {...SJ} /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hitside" l={14} t={6} w={24} h={84} d={0}>{standard}</V>
        <V c="g19-hit" l={20} t={40} w={60} h={20} d={130}>{arm}</V>
        <L c="g19-hit2" l={60} t={14} w={6} h={6} d={250} st={{ borderRadius: "50%", background: "#b4d4c0" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Yard tone="rgba(180,212,192,0.26)" />}>
      <V c="g19-ms-stick" l={41} t={34} w={5} h={24} d={90}>{standard}</V>
      <V c="g19-ms-arm" l={41} t={42} w={15} h={5} d={280}>{arm}</V>
      <V c="g19-ms-lift" l={49} t={33} w={11} h={16} d={450}><path d={HEAD} fill="#fff4d6" stroke="#17302a" strokeWidth="1.2" {...SJ} /></V>
      <V c="g19-ms-crest" l={46} t={40} w={8} h={8} d={600}><path d={HAND} fill="#b4d4c0" stroke="#17302a" strokeWidth="1" {...SJ} /></V>
      <L c="g19-lean" l={40} t={57} w={20} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(23,48,42,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g19-wisp" l={45 + i * 6} t={38} w={1.4} h={1.4} d={720 + i * 100} st={{ borderRadius: "50%", background: "#b4d4c0" }} />
      ))}
    </Lead>
  );
}

/* --- 15. Green Room (t1) — THE CURRY COMB ------------------------------------
   Circles of the rubber curry go along the barrel, each stroke lifting a puff
   of scurf out of the coat, and the body brush flicks the dust off the end.
   Palette: #7fc4a8 / #fff4d6 / #1a3028. */
const CC_STROKES = [0, 1, 2];

function GreenRoomScene({ role, delayMs }: SceneProps) {
  const curry = (
    <g {...SJ}>
      <path d="M4 7h16v7c0 2.6-2 4-8 4s-8-1.4-8-4z" fill="#7fc4a8" stroke="#1a3028" strokeWidth="1.2" />
      <path d="M8 4.4h8v2.4H8z" fill="#fff4d6" />
    </g>
  );
  const coat = (
    <path d="M2.6 14.4c4-4 14-4.8 19.4-1.6" fill="none" stroke="#7fc4a8" strokeWidth="2.4" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g19-cc-coat" l={4} t={40} w={92} h={40} d={40}>{coat}</V>
        <V c="g19-cc-comb" l={26} t={16} w={48} h={48} d={260}>{curry}</V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g19-cc-motes" l={20 + i * 22} t={54} w={5} h={5} d={470 + i * 110} st={{ borderRadius: "50%", background: "#fff4d6" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hitside" l={6} t={42} w={88} h={36} d={0}>{coat}</V>
        <V c="g19-hit" l={28} t={18} w={44} h={44} d={130}>{curry}</V>
        <L c="g19-hit2" l={42} t={62} w={16} h={16} d={250} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.75), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Yard tone="rgba(127,196,168,0.26)" />}>
      <V c="g19-cc-coat" l={36} t={44} w={28} h={10} d={90}>{coat}</V>
      {CC_STROKES.map((i) => (
        <V key={i} c="g19-cc-stroke" l={40 + i * 6} t={41} w={7} h={8} d={220 + i * 140}>{curry}</V>
      ))}
      {CC_STROKES.map((i) => (
        <L key={i} c="g19-cc-motes" l={41 + i * 6} t={44} w={4} h={4} d={380 + i * 140} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.8), transparent 70%)" }} />
      ))}
      <L c="g19-driftside" l={38} t={40} w={24} h={5} d={700} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.55), transparent)" }} />
      <L c="g19-lean" l={39} t={55} w={22} h={3} d={740} st={{ borderRadius: "999px", background: "rgba(26,48,40,0.55)" }} />
    </Lead>
  );
}

/* --- 16. Hired Muscle (t1) — THE HEAVY HORSE PLANTS --------------------------
   A feathered draught horse drops its weight back, the lead rope goes
   bar-taut along the run and the handler at the far end simply skids. Aim
   staged: the rope runs the real vector. Palette: #9a8ec4 / #ffeed2 /
   #211a33. */
function HiredMuscleScene({ role, delayMs }: SceneProps) {
  const heavy = (
    <g {...SJ}>
      <path d="M3.6 11.6c3-3 10-3.4 13.6-1.4l2-4.6 1.8 1.2-.6 4.8c1 1 1.4 2.2 1.2 3.6" fill="none" stroke="#9a8ec4" strokeWidth="2.8" />
      <path d="M5.4 12.4v7.4M8.8 12.8v7M15.4 12.6v7.2M18.6 12v7.8" fill="none" stroke="#9a8ec4" strokeWidth="2.2" />
      <path d="M4 19.8h3.2M7.4 19.6h3M14 19.8h3M17.2 19.8h3" stroke="#ffeed2" strokeWidth="1.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hm-brace" l={8} t={22} w={70} h={58} d={40}>{heavy}</V>
        <L c="g19-hm-rope" l={60} t={38} w={38} h={4} d={260} st={{ borderRadius: "999px", background: "#ffeed2", transformOrigin: "0% 50%" }} />
        {[0, 1, 2].map((i) => (
          <L key={i} c="g19-hm-skid" l={62 + i * 10} t={70} w={16} h={3} d={470 + i * 110} st={{ borderRadius: "999px", background: "#9a8ec4" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hitside" l={10} t={24} w={66} h={54} d={0}>{heavy}</V>
        <L c="g19-hit" l={58} t={40} w={38} h={4} d={130} st={{ borderRadius: "999px", background: "#ffeed2" }} />
        <L c="g19-hit2" l={60} t={70} w={30} h={3} d={250} st={{ borderRadius: "999px", background: "#9a8ec4" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Yard tone="rgba(154,142,196,0.26)" />}>
      <V c="g19-hm-brace" l={38} t={40} w={16} h={14} d={90}>{heavy}</V>
      <L c="g19-runout" l={52} t={46} w={30} h={1.8} d={280} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #ffeed2, rgba(154,142,196,0))", transformOrigin: "0% 50%" }} />
      <V c="g19-hm-feather" l={39} t={49} w={6} h={7} d={450}>
        <path d="M4 4c1.6 5 1.6 11 0 16M12 4c1.6 5 1.6 11 0 16M20 4c1.6 5 1.6 11 0 16" fill="none" stroke="#ffeed2" strokeWidth="1.6" {...SJ} />
      </V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g19-hm-skid" l={57 + i * 5} t={50} w={5} h={1.4} d={580 + i * 110} st={{ borderRadius: "999px", background: "#9a8ec4" }} />
      ))}
      <L c="g19-lean" l={37} t={55} w={20} h={3} d={720} st={{ borderRadius: "999px", background: "rgba(33,26,51,0.6)" }} />
    </AimLead>
  );
}

/* --- 17. Invitation Only (t1) — HEADS OVER THE RAIL --------------------------
   The yard gate is chained shut and three heads come one after another over
   the top rail to look at whoever is not being let in. Palette: #d0a464 /
   #fff2d2 / #2b1d0c. */
const RL_HEADS = [0, 1, 2];

function InvitationOnlyScene({ role, delayMs }: SceneProps) {
  const chain = (
    <g fill="none" stroke="#fff2d2" strokeWidth="1.6" {...SJ}>
      <circle cx="7" cy="12" r="3" />
      <circle cx="13" cy="12" r="3" />
      <circle cx="19" cy="12" r="3" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g19-rl-rail" l={2} t={54} w={96} h={5} d={40} st={{ borderRadius: "999px", background: "#d0a464", transformOrigin: "0% 50%" }} />
        {RL_HEADS.slice(0, 2).map((i) => (
          <V key={i} c="g19-rl-head" l={12 + i * 40} t={8} w={34} h={52} d={260 + i * 140}><path d={HEAD} fill="#fff2d2" stroke="#2b1d0c" strokeWidth="1.2" {...SJ} /></V>
        ))}
        <V c="g19-rl-chain" l={30} t={62} w={44} h={30} d={560}>{chain}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g19-hit" l={4} t={56} w={92} h={5} d={0} st={{ borderRadius: "999px", background: "#d0a464" }} />
        <V c="g19-hitside" l={28} t={10} w={40} h={52} d={130}><path d={HEAD} fill="#fff2d2" stroke="#2b1d0c" strokeWidth="1.2" {...SJ} /></V>
        <V c="g19-hit2" l={32} t={64} w={38} h={26} d={250}>{chain}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Yard tone="rgba(208,164,100,0.26)" />}>
      <L c="g19-rl-rail" l={36} t={48} w={30} h={1.8} d={90} st={{ borderRadius: "999px", background: "#d0a464", transformOrigin: "0% 50%" }} />
      {RL_HEADS.map((i) => (
        <V key={i} c="g19-rl-head" l={39 + i * 8} t={36} w={9} h={13} d={220 + i * 130}><path d={HEAD} fill="#fff2d2" stroke="#2b1d0c" strokeWidth="1.2" {...SJ} /></V>
      ))}
      <V c="g19-rl-chain" l={44} t={49} w={13} h={7} d={620}>{chain}</V>
      <V c="g19-rl-ear" l={40} t={34} w={4} h={5} d={700} st={{ transformOrigin: "50% 100%" }}>
        <path d="M12 2.4l3 8.4h-6z" fill="#d0a464" stroke="#2b1d0c" strokeWidth="1" {...SJ} />
      </V>
      <L c="g19-lean" l={38} t={55} w={24} h={3} d={740} st={{ borderRadius: "999px", background: "rgba(43,29,12,0.55)" }} />
    </Lead>
  );
}

/* --- 18. Long Jump (t1) — SCENTING THE WIND ----------------------------------
   The head comes up mid-graze, nostrils open, the top lip curls back and the
   whole horse turns into the wind that is streaming its forelock. Aim staged:
   the wind runs the real vector. Palette: #86b7d8 / #fff4d6 / #14283a. */
function LongJumpScene({ role, delayMs }: SceneProps) {
  const flehmen = (
    <g {...SJ}>
      <path d={MUZZLE} fill="#fff4d6" stroke="#14283a" strokeWidth="1.1" />
      <path d="M15.4 8.6c1.6.4 2.2 1.4 2 2.6" fill="none" stroke="#14283a" strokeWidth="1.2" />
      <path d="M6.6 15c3.4 1.6 8.4 1.6 12-.4" fill="none" stroke="#86b7d8" strokeWidth="1.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g19-wd-lift" l={16} t={12} w={54} h={62} d={40}><path d={HEAD} fill="#fff4d6" stroke="#14283a" strokeWidth="1.2" {...SJ} /></V>
        <V c="g19-wd-flare" l={48} t={40} w={44} h={40} d={260}>{flehmen}</V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g19-wd-streak" l={2} t={22 + i * 18} w={44} h={2.6} d={470 + i * 100} st={{ borderRadius: "999px", background: "#86b7d8" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hitside" l={18} t={14} w={52} h={60} d={0}><path d={HEAD} fill="#fff4d6" stroke="#14283a" strokeWidth="1.2" {...SJ} /></V>
        <V c="g19-hit" l={48} t={42} w={44} h={38} d={130}>{flehmen}</V>
        <L c="g19-hit2" l={6} t={30} w={40} h={3} d={250} st={{ borderRadius: "999px", background: "#86b7d8" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Yard tone="rgba(134,183,216,0.26)" />}>
      <V c="g19-wd-lift" l={41} t={35} w={12} h={17} d={90}><path d={HEAD} fill="#fff4d6" stroke="#14283a" strokeWidth="1.2" {...SJ} /></V>
      <V c="g19-wd-flare" l={48} t={40} w={9} h={8} d={280}>{flehmen}</V>
      <L c="g19-runout" l={52} t={43} w={28} h={1.6} d={430} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #86b7d8, rgba(134,183,216,0))", transformOrigin: "0% 50%" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g19-wd-streak" l={50} t={38 + i * 4} w={16} h={0.9} d={520 + i * 100} st={{ borderRadius: "999px", background: "#86b7d8" }} />
      ))}
      <V c="g19-wd-mane" l={40} t={33} w={8} h={9} d={680}>
        <path d="M20 3c-5 3-8 8-9 15" fill="none" stroke="#fff4d6" strokeWidth="2" {...SJ} />
      </V>
      <L c="g19-lean" l={39} t={54} w={20} h={3} d={740} st={{ borderRadius: "999px", background: "rgba(20,40,58,0.55)" }} />
    </AimLead>
  );
}

/* --- 19. Parade Elephant (t1) — PLUME AND BRASSES ----------------------------
   A dyed plume drops into the browband socket, the horse brasses are hung
   along the martingale and swing, and the neck arches up under all of it.
   Palette: #e06a72 / #ffe9c2 / #35131a. */
const PM_BRASSES = [0, 1, 2];

function ParadeElephantScene({ role, delayMs }: SceneProps) {
  const plume = (
    <g {...SJ}>
      <path d="M12 21V11" stroke="#35131a" strokeWidth="2" />
      <path d="M12 11c-3.4-1.6-5-4.6-4.4-8.4 3 .6 4.4 3 4.4 5.4 0-2.4 1.4-4.8 4.4-5.4.6 3.8-1 6.8-4.4 8.4z" fill="#e06a72" stroke="#35131a" strokeWidth="1" />
    </g>
  );
  const brass = <circle cx="12" cy="12" r="7.4" fill="#ffe9c2" stroke="#35131a" strokeWidth="1.4" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g19-pm-arch" l={22} t={26} w={52} h={64} d={40}><path d={HEAD} fill="#ffe9c2" stroke="#35131a" strokeWidth="1.2" {...SJ} /></V>
        <V c="g19-pm-plume" l={32} t={2} w={36} h={44} d={260} st={{ transformOrigin: "50% 100%" }}>{plume}</V>
        {PM_BRASSES.slice(0, 2).map((i) => (
          <V key={i} c="g19-pm-brass" l={18 + i * 34} t={62} w={22} h={22} d={470 + i * 120} st={{ transformOrigin: "50% 0%" }}>{brass}</V>
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hitside" l={24} t={28} w={50} h={60} d={0}><path d={HEAD} fill="#ffe9c2" stroke="#35131a" strokeWidth="1.2" {...SJ} /></V>
        <V c="g19-hit" l={34} t={4} w={32} h={40} d={130}>{plume}</V>
        <V c="g19-hit2" l={40} t={62} w={20} h={20} d={250}>{brass}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Yard tone="rgba(224,106,114,0.26)" />}>
      <V c="g19-pm-arch" l={42} t={38} w={12} h={17} d={90}><path d={HEAD} fill="#ffe9c2" stroke="#35131a" strokeWidth="1.2" {...SJ} /></V>
      <V c="g19-pm-plume" l={44} t={29} w={7} h={11} d={280} st={{ transformOrigin: "50% 100%" }}>{plume}</V>
      {PM_BRASSES.map((i) => (
        <V key={i} c="g19-pm-brass" l={41 + i * 5} t={49} w={4.4} h={4.4} d={430 + i * 120} st={{ transformOrigin: "50% 0%" }}>{brass}</V>
      ))}
      <L c="g19-pm-shine" l={40} t={44} w={20} h={3} d={680} st={{ background: "linear-gradient(90deg, transparent, #ffe9c2, transparent)" }} />
      <L c="g19-lean" l={40} t={56} w={20} h={3} d={720} st={{ borderRadius: "999px", background: "rgba(53,19,26,0.6)" }} />
    </Lead>
  );
}

/* --- 20. Pole Vault (t1) — THE ROLL ------------------------------------------
   The horse buckles at the knees, goes down, rolls right over with its legs
   waving, and comes back up in one heave to shake a cloud of dust out of its
   coat. Palette: #c99a6a / #fff2d2 / #2e1e10. */
function PoleVaultScene({ role, delayMs }: SceneProps) {
  const rolling = (
    <g {...SJ}>
      <path d="M3.4 15c2.6-3 9.4-3.6 13.4-1.6l2.6-2.6 1.4 1.4-1.6 3.2" fill="none" stroke="#c99a6a" strokeWidth="2.6" />
      <path d="M6 13.6l-2 -5.4M9.4 12.8l-1 -5.8M14.4 12.8l2-5.4M17 13.6l3.4-4.2" fill="none" stroke="#c99a6a" strokeWidth="1.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g19-rr-down" l={10} t={22} w={76} h={54} d={40}>{rolling}</V>
        <V c="g19-rr-roll" l={10} t={26} w={76} h={54} d={260}>{rolling}</V>
        <L c="g19-rr-shake" l={8} t={62} w={80} h={26} d={470} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,210,0.6), transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hitside" l={12} t={24} w={72} h={52} d={0}>{rolling}</V>
        <L c="g19-hit" l={16} t={62} w={68} h={22} d={130} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,210,0.6), transparent 70%)" }} />
        <L c="g19-hit2" l={40} t={72} w={20} h={4} d={250} st={{ borderRadius: "999px", background: "#2e1e10" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Yard tone="rgba(201,154,106,0.26)" />}>
      <V c="g19-rr-down" l={40} t={42} w={20} h={14} d={90}>{rolling}</V>
      <V c="g19-rr-roll" l={40} t={42} w={20} h={14} d={280}>{rolling}</V>
      <L c="g19-rr-dust" l={37} t={48} w={26} h={9} d={430} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,210,0.62), transparent 70%)" }} />
      <V c="g19-rr-shove" l={41} t={38} w={18} h={16} d={600}>{rolling}</V>
      <L c="g19-driftside" l={38} t={44} w={24} h={5} d={700} st={{ background: "linear-gradient(90deg, rgba(255,242,210,0.55), transparent)" }} />
      <L c="g19-lean" l={39} t={56} w={22} h={3} d={760} st={{ borderRadius: "999px", background: "rgba(46,30,16,0.55)" }} />
    </Lead>
  );
}

/* --- 21. Signal Rocket (t1) — SHIED, THEN GENTLED ----------------------------
   Something bangs overhead, the horse props and spins away showing the white
   of its eye, and a flat hand goes onto its neck until it stands and blows.
   Palette: #f0c04c / #fff4d6 / #33240a. */
function SignalRocketScene({ role, delayMs }: SceneProps) {
  const bang = (
    <path d="M12 1.6l2.6 6.2 6.4-2.4-4 5.6 5 4.4-6.8.4 1.4 6.6-4.6-5-4.6 5 1.4-6.6-6.8-.4 5-4.4-4-5.6 6.4 2.4z" fill="#f0c04c" stroke="#33240a" strokeWidth="1" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g19-sh-bang" l={30} t={2} w={40} h={40} d={40}>{bang}</V>
        <V c="g19-sh-shy" l={16} t={26} w={52} h={64} d={260} st={{ transformOrigin: "50% 100%" }}><path d={HEAD} fill="#fff4d6" stroke="#33240a" strokeWidth="1.2" {...SJ} /></V>
        <V c="g19-sh-hand" l={54} t={44} w={38} h={44} d={470}><path d={HAND} fill="#f0c04c" stroke="#33240a" strokeWidth="1" {...SJ} /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hit" l={32} t={4} w={36} h={36} d={0}>{bang}</V>
        <V c="g19-hitside" l={18} t={28} w={50} h={60} d={130} st={{ transformOrigin: "50% 100%" }}><path d={HEAD} fill="#fff4d6" stroke="#33240a" strokeWidth="1.2" {...SJ} /></V>
        <L c="g19-hit2" l={60} t={60} w={14} h={14} d={250} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.8), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Yard tone="rgba(240,192,76,0.26)" />}>
      <V c="g19-sh-bang" l={44} t={30} w={12} h={12} d={90}>{bang}</V>
      <V c="g19-sh-shy" l={41} t={38} w={12} h={17} d={260} st={{ transformOrigin: "50% 100%" }}><path d={HEAD} fill="#fff4d6" stroke="#33240a" strokeWidth="1.2" {...SJ} /></V>
      <L c="g19-sh-white" l={45} t={42} w={2.4} h={2.4} d={420} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      <V c="g19-sh-hand" l={51} t={43} w={8} h={9} d={560}><path d={HAND} fill="#f0c04c" stroke="#33240a" strokeWidth="1" {...SJ} /></V>
      <L c="g19-sh-blow" l={40} t={47} w={7} h={5} d={700} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.75), transparent 70%)" }} />
      <L c="g19-lean" l={39} t={56} w={21} h={3} d={740} st={{ borderRadius: "999px", background: "rgba(51,36,10,0.6)" }} />
    </Lead>
  );
}

/* --- 22. Stage Left (t1) — CROSSING OVER -------------------------------------
   Asked from the ground, the horse steps sideways along the rail: the near
   fore crosses over the off fore, hooves scuffing the sand, the handler's hand
   staying at the shoulder. Palette: #b8a0d8 / #ffeed4 / #221a33. */
const CX_STEPS = [0, 1, 2];

function StageLeftScene({ role, delayMs }: SceneProps) {
  const legs = (
    <g fill="none" stroke="#b8a0d8" strokeWidth="2.4" {...SJ}>
      <path d="M8 2.4v12l-3 7" />
      <path d="M16 2.4v12l3 7" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g19-cx-cross" l={20} t={8} w={60} h={70} d={40}>{legs}</V>
        {CX_STEPS.slice(0, 2).map((i) => (
          <L key={i} c="g19-cx-scuff" l={16 + i * 32} t={78} w={26} h={4} d={260 + i * 140} st={{ borderRadius: "999px", background: "#ffeed4" }} />
        ))}
        <V c="g19-cx-hand" l={58} t={20} w={34} h={40} d={560}><path d={HAND} fill="#ffeed4" stroke="#221a33" strokeWidth="1" {...SJ} /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hitside" l={22} t={10} w={56} h={66} d={0}>{legs}</V>
        <L c="g19-hit" l={18} t={78} w={64} h={4} d={130} st={{ borderRadius: "999px", background: "#ffeed4" }} />
        <L c="g19-hit2" l={40} t={68} w={5} h={5} d={250} st={{ borderRadius: "50%", background: "#b8a0d8" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Yard tone="rgba(184,160,216,0.26)" />}>
      <L c="g19-cx-rail" l={34} t={38} w={32} h={1.8} d={90} st={{ borderRadius: "999px", background: "#221a33", transformOrigin: "0% 50%" }} />
      {CX_STEPS.map((i) => (
        <V key={i} c="g19-cx-cross" l={41 + i * 5} t={40} w={9} h={14} d={220 + i * 140}>{legs}</V>
      ))}
      {CX_STEPS.map((i) => (
        <L key={i} c="g19-cx-scuff" l={42 + i * 5} t={53} w={6} h={1.4} d={380 + i * 140} st={{ borderRadius: "999px", background: "#ffeed4" }} />
      ))}
      <V c="g19-cx-hand" l={38} t={41} w={7} h={8} d={700}><path d={HAND} fill="#ffeed4" stroke="#221a33" strokeWidth="1" {...SJ} /></V>
      <L c="g19-lean" l={39} t={56} w={22} h={3} d={760} st={{ borderRadius: "999px", background: "rgba(34,26,51,0.55)" }} />
    </Lead>
  );
}

/* --- 23. Title Deed (t1) — THE FARRIER'S RASP --------------------------------
   The hoof is drawn up between the farrier's knees, the rasp runs the wall in
   long strokes, pale parings curl off it, and the foot is set back down square
   on the stone. Palette: #cbb08a / #fff2d2 / #2a2016. */
const FR_PASSES = [0, 1, 2];

function TitleDeedScene({ role, delayMs }: SceneProps) {
  const rasp = (
    <g {...SJ}>
      <path d="M2 10h17v4H2z" fill="#cbb08a" stroke="#2a2016" strokeWidth="1" />
      <path d="M19 10.6h3.4v2.8H19z" fill="#2a2016" />
      <path d="M4 10.6v2.8M7 10.6v2.8M10 10.6v2.8M13 10.6v2.8M16 10.6v2.8" stroke="#2a2016" strokeWidth="0.8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g19-fr-hoof" l={24} t={20} w={48} h={54} d={40}><path d={HOOF} fill="#fff2d2" stroke="#2a2016" strokeWidth="1.2" {...SJ} /></V>
        <V c="g19-fr-rasp" l={6} t={38} w={72} h={26} d={260}>{rasp}</V>
        {FR_PASSES.slice(0, 2).map((i) => (
          <L key={i} c="g19-fr-paring" l={30 + i * 22} t={64} w={8} h={4} d={470 + i * 120} st={{ borderRadius: "999px", background: "#cbb08a" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hitside" l={26} t={22} w={46} h={52} d={0}><path d={HOOF} fill="#fff2d2" stroke="#2a2016" strokeWidth="1.2" {...SJ} /></V>
        <V c="g19-hit" l={8} t={40} w={68} h={24} d={130}>{rasp}</V>
        <L c="g19-hit2" l={34} t={80} w={34} h={3} d={250} st={{ borderRadius: "999px", background: "#2a2016" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Yard tone="rgba(203,176,138,0.26)" />}>
      <V c="g19-fr-hoof" l={43} t={38} w={11} h={13} d={90}><path d={HOOF} fill="#fff2d2" stroke="#2a2016" strokeWidth="1.2" {...SJ} /></V>
      {FR_PASSES.map((i) => (
        <V key={i} c="g19-fr-rasp" l={36} t={40 + i * 3.4} w={18} h={6} d={230 + i * 130}>{rasp}</V>
      ))}
      {FR_PASSES.map((i) => (
        <L key={i} c="g19-fr-paring" l={44 + i * 4} t={47} w={3} h={1.4} d={380 + i * 130} st={{ borderRadius: "999px", background: "#cbb08a" }} />
      ))}
      <V c="g19-fr-set" l={44} t={49} w={9} h={9} d={700}><path d={HOOF} fill="#cbb08a" stroke="#2a2016" strokeWidth="1.2" {...SJ} /></V>
      <L c="g19-lean" l={40} t={57} w={21} h={3} d={760} st={{ borderRadius: "999px", background: "rgba(42,32,22,0.6)" }} />
    </Lead>
  );
}

/* --- 24. Vaulting Horse (t1) — THE MOUNTING BLOCK ----------------------------
   The block is carried in and set down beside the shoulder, a boot goes into
   the iron, the girth creaks, and the horse stands stone still through all of
   it. Palette: #8ab0c8 / #fff2dc / #16232e. */
function VaultingHorseScene({ role, delayMs }: SceneProps) {
  const block = (
    <g {...SJ}>
      <path d="M2 20h20v3H2z" fill="#8ab0c8" stroke="#16232e" strokeWidth="1" />
      <path d="M5 14h17v6H5z" fill="#8ab0c8" stroke="#16232e" strokeWidth="1" />
      <path d="M8 8h14v6H8z" fill="#8ab0c8" stroke="#16232e" strokeWidth="1" />
    </g>
  );
  const boot = (
    <g {...SJ}>
      <path d="M9 2.4h5.4v11.2l5 4.4v3.6H9z" fill="#16232e" stroke="#fff2dc" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g19-mb-block" l={6} t={40} w={56} h={52} d={40}>{block}</V>
        <V c="g19-mb-boot" l={44} t={8} w={40} h={62} d={260}>{boot}</V>
        <L c="g19-mb-girth" l={12} t={30} w={76} h={3.4} d={470} st={{ borderRadius: "999px", background: "#8ab0c8" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hitside" l={8} t={44} w={52} h={48} d={0}>{block}</V>
        <V c="g19-hit" l={46} t={10} w={38} h={58} d={130}>{boot}</V>
        <L c="g19-hit2" l={16} t={34} w={68} h={3} d={250} st={{ borderRadius: "999px", background: "#fff2dc" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Yard tone="rgba(138,176,200,0.26)" />}>
      <V c="g19-mb-block" l={38} t={44} w={12} h={12} d={90}>{block}</V>
      <V c="g19-mb-boot" l={45} t={36} w={7} h={13} d={280}>{boot}</V>
      <V c="g19-mb-still" l={51} t={38} w={11} h={16} d={440}><path d={HEAD} fill="#fff2dc" stroke="#16232e" strokeWidth="1.2" {...SJ} /></V>
      <L c="g19-mb-girth" l={44} t={46} w={16} h={1.4} d={600} st={{ borderRadius: "999px", background: "#8ab0c8" }} />
      <L c="g19-lean" l={39} t={57} w={22} h={3} d={680} st={{ borderRadius: "999px", background: "rgba(22,35,46,0.6)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g19-wisp" l={42 + i * 6} t={52} w={1.4} h={1.4} d={740 + i * 100} st={{ borderRadius: "50%", background: "#8ab0c8" }} />
      ))}
    </Lead>
  );
}

/* --- 25. Vizier's Errand (t1) — THE NOSEBAG COMES OFF ------------------------
   The strap is lifted over the ears and the bag pulled away; the head comes
   up chewing with chaff all over the muzzle, and the ears swing forward.
   Palette: #d4a86c / #fff4d6 / #2c1f0e. */
function ViziersErrandScene({ role, delayMs }: SceneProps) {
  const bag = (
    <g {...SJ}>
      <path d="M6 7h12l1.6 9.6c.3 2.4-1.8 4-7.6 4s-7.9-1.6-7.6-4z" fill="#d4a86c" stroke="#2c1f0e" strokeWidth="1.2" />
      <path d="M7.4 7L9 1.6M16.6 7L15 1.6" stroke="#2c1f0e" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g19-nb-bag" l={20} t={30} w={56} h={62} d={40}>{bag}</V>
        <V c="g19-nb-lift" l={22} t={6} w={52} h={62} d={260}><path d={HEAD} fill="#fff4d6" stroke="#2c1f0e" strokeWidth="1.2" {...SJ} /></V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g19-nb-chaff" l={26 + i * 20} t={60} w={4} h={4} d={470 + i * 110} st={{ borderRadius: "50%", background: "#d4a86c" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hit" l={22} t={32} w={52} h={58} d={0}>{bag}</V>
        <V c="g19-hitside" l={24} t={8} w={50} h={58} d={130}><path d={HEAD} fill="#fff4d6" stroke="#2c1f0e" strokeWidth="1.2" {...SJ} /></V>
        <L c="g19-hit2" l={44} t={68} w={5} h={5} d={250} st={{ borderRadius: "50%", background: "#d4a86c" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Yard tone="rgba(212,168,108,0.26)" />}>
      <V c="g19-nb-bag" l={43} t={43} w={11} h={13} d={90}>{bag}</V>
      <V c="g19-nb-lift" l={43} t={34} w={12} h={17} d={300}><path d={HEAD} fill="#fff4d6" stroke="#2c1f0e" strokeWidth="1.2" {...SJ} /></V>
      <V c="g19-nb-chew" l={49} t={41} w={7} h={6} d={470}><path d={MUZZLE} fill="#fff4d6" stroke="#2c1f0e" strokeWidth="1.1" {...SJ} /></V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g19-nb-chaff" l={45 + i * 5} t={47} w={1.6} h={1.6} d={600 + i * 110} st={{ borderRadius: "50%", background: "#d4a86c" }} />
      ))}
      <L c="g19-driftside" l={39} t={44} w={22} h={5} d={720} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.5), transparent)" }} />
      <L c="g19-lean" l={40} t={56} w={20} h={3} d={760} st={{ borderRadius: "999px", background: "rgba(44,31,14,0.6)" }} />
    </Lead>
  );
}

/* --- 26. Zebra Crossing (t1) — HEAD TO HEAD ----------------------------------
   Two stallions meet nose to nose over the fence line, blow into each other's
   nostrils, squeal, and one strikes out with a foreleg before both spin away.
   Palette: #e8e2d4 / #fff4d6 / #1d1a14. */
function ZebraCrossingScene({ role, delayMs }: SceneProps) {
  const head = (flip: boolean) => (
    <path d={HEAD} fill={flip ? "#e8e2d4" : "#fff4d6"} stroke="#1d1a14" strokeWidth="1.2" {...SJ} />
  );
  const strike = (
    <path d="M4 3v10l-2 8" fill="none" stroke="#e8e2d4" strokeWidth="2.6" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hh-headl" l={2} t={16} w={46} h={64} d={40}>{head(false)}</V>
        <V c="g19-hh-headr" l={52} t={16} w={46} h={64} d={260} st={{ transform: "scaleX(-1)" }}>{head(true)}</V>
        <L c="g19-hh-squeal" l={36} t={34} w={28} h={28} d={470} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hitside" l={4} t={18} w={44} h={62} d={0}>{head(false)}</V>
        <V c="g19-hit" l={52} t={18} w={44} h={62} d={130} st={{ transform: "scaleX(-1)" }}>{head(true)}</V>
        <L c="g19-hit2" l={38} t={36} w={24} h={24} d={250} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Yard tone="rgba(232,226,212,0.24)" />}>
      <V c="g19-hh-headl" l={36} t={37} w={12} h={17} d={90}>{head(false)}</V>
      <V c="g19-hh-headr" l={52} t={37} w={12} h={17} d={230} st={{ transform: "scaleX(-1)" }}>{head(true)}</V>
      <L c="g19-hh-squeal" l={44} t={40} w={12} h={12} d={430} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      <V c="g19-hh-strike" l={46} t={44} w={8} h={12} d={580} st={{ transformOrigin: "50% 0%" }}>{strike}</V>
      <L c="g19-driftside" l={38} t={50} w={24} h={5} d={700} st={{ background: "linear-gradient(90deg, rgba(232,226,212,0.55), transparent)" }} />
      <L c="g19-lean" l={39} t={56} w={22} h={3} d={760} st={{ borderRadius: "999px", background: "rgba(29,26,20,0.55)" }} />
    </Lead>
  );
}

/* --- 27. Nightlight (t1) — THE LANTERN ON THE NAIL ---------------------------
   A hurricane lamp is hung on its nail and the wick comes up; a moth turns
   round it, the horse's eye catches the flame and a hind hoof cocks over as it
   dozes standing. Palette: #f2d089 / #fff4d6 / #241d10. */
function NightlightScene({ role, delayMs }: SceneProps) {
  const lamp = (
    <g {...SJ}>
      <path d="M9 2.4h6v2.4H9z" fill="#241d10" />
      <path d="M7 5.4h10l1.4 12.4c.2 2-1.6 3.2-6.4 3.2s-6.6-1.2-6.4-3.2z" fill="none" stroke="#f2d089" strokeWidth="1.6" />
      <path d="M12 9.4c1.6 2 2.4 3.4 2.4 4.6a2.4 2.4 0 0 1-4.8 0c0-1.2.8-2.6 2.4-4.6z" fill="#fff4d6" />
    </g>
  );
  const moth = (
    <path d="M12 12c-2.6-2.4-6-3-8.6-1.4C4.6 6.8 8 5 12 6.6c4-1.6 7.4.2 8.6 4-2.6-1.6-6-1-8.6 1.4z" fill="#fff4d6" />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g19-nl-lamp" l={26} t={8} w={48} h={64} d={40} st={{ transformOrigin: "50% 6%" }}>{lamp}</V>
        <V c="g19-nl-moth" l={54} t={38} w={32} h={28} d={260}>{moth}</V>
        <L c="g19-nl-eye" l={10} t={62} w={16} h={9} d={470} st={{ borderRadius: "50%", background: "#f2d089" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g19-hitside" l={28} t={10} w={44} h={60} d={0} st={{ transformOrigin: "50% 6%" }}>{lamp}</V>
        <V c="g19-hit" l={56} t={40} w={30} h={26} d={130}>{moth}</V>
        <L c="g19-hit2" l={12} t={64} w={14} h={8} d={250} st={{ borderRadius: "50%", background: "#f2d089" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <L c="g19-veil" st={{ background: "rgba(10,9,6,0.44)" }} />
          <Rim tone="rgba(242,208,137,0.3)" />
        </>
      }
    >
      <V c="g19-nl-lamp" l={44} t={33} w={11} h={15} d={90} st={{ transformOrigin: "50% 6%" }}>{lamp}</V>
      <L c="g19-nl-glow" l={40} t={35} w={20} h={20} d={280} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.7), transparent 70%)" }} />
      <V c="g19-nl-moth" l={51} t={36} w={6} h={6} d={430}>{moth}</V>
      <L c="g19-nl-eye" l={43} t={46} w={4} h={2.4} d={580} st={{ borderRadius: "50%", background: "#f2d089" }} />
      <V c="g19-nl-cock" l={46} t={50} w={7} h={8} d={680} st={{ transformOrigin: "50% 0%" }}><path d={HOOF} fill="#f2d089" stroke="#241d10" strokeWidth="1.2" {...SJ} /></V>
      <L c="g19-lean" l={40} t={57} w={20} h={3} d={740} st={{ borderRadius: "999px", background: "rgba(36,29,16,0.6)" }} />
    </Lead>
  );
}

/* =============================================================================
   Registry. Every entry declares an anchor; every `sound` is an existing
   SigSoundKey drawn from the horse-yard set this module was given (blitz,
   rampage, siege, snooze, coronation, wall). `source` is deliberately omitted:
   these cards carry no removal diff, so their play is the cast lead on the
   square they were played on.
   ========================================================================== */

/* =============================================================================
   FLAGSHIP IMPACT PASS — the stable answers with HOOFQUAKES; shoes come off and split.

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

/** A cast horseshoe: the stable's own debris. */
const impShoe = (fill: string, edge: string): ReactNode => (
  <>
    <path
      d="M6 20.4V10.6a6 6 0 0 1 12 0v9.8"
      fill="none"
      stroke={fill}
      strokeWidth="3.4"
      strokeLinecap="round"
    />
    <path d="M6 20.4V10.6a6 6 0 0 1 12 0v9.8" fill="none" stroke={edge} strokeWidth="1" strokeLinecap="round" />
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
  hx4_overslept_officers: S(OversleptOfficersScene, { ordering: "radial", staggerMs: 70, victims: ["n", "b"], hasLead: true, sound: "snooze", anchor: "board" }, { rgb: "216 196 138", at: 520, shock: true, box: [42, 38, 15, 12] }),
  hx4_short_stirrups: S(ShortStirrupsScene, { ordering: "octagon", staggerMs: 60, victims: ["n"], hasLead: true, sound: "wall", anchor: "board" }, { rgb: "192 138 78", at: 560, glyph: impShoe("#c08a4e", "#2b1b0d"), shock: true, box: [43, 37, 14, 13] }),
  op_no_horses_on_lawn: S(NoHorsesOnLawnScene, { ordering: "sweep", staggerMs: 65, victims: ["n"], hasLead: true, sound: "rampage", anchor: "cast" }, { rgb: "143 191 106", at: 480, shock: true, box: [43, 39, 14, 11] }),
  op_old_counselor: S(OldCounselorScene, { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "snooze", anchor: "board" }, { rgb: "185 188 196", at: 440, shock: true, box: [44, 39, 12, 11] }),
  op_stable_gate: S(StableGateScene, { ordering: "line", staggerMs: 70, victims: ["r", "n"], hasLead: true, sound: "wall", anchor: "cast" }, { rgb: "169 116 63", at: 540, glyph: impShoe("#a9743f", "#241608"), shock: true, box: [43, 37, 14, 14] }),
  bn4_gum_drop: S(GumDropScene, { ordering: "radial", staggerMs: 0, victims: ["n", "b", "r", "q"], hasLead: true, sound: "snooze", anchor: "cast" }, { rgb: "240 168 200", at: 400, shock: true, box: [45, 39, 11, 11] }),
  bn4_knights_errand: S(KnightsErrandScene, { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", anchor: "cast" }, { rgb: "224 201 166", at: 520, laser: true, shock: true, box: [44, 36, 12, 15] }),
  hx4_no_mans_reach: S(NoMansReachScene, { ordering: "line", staggerMs: 60, victims: ["n"], hasLead: true, sound: "wall", anchor: "cast" }, { rgb: "111 125 150", at: 480, laser: true, box: [44, 35, 12, 16] }),
  hx4_tangled_reins: S(TangledReinsScene, { ordering: "octagon", staggerMs: 55, victims: ["n"], hasLead: true, sound: "rampage", anchor: "cast" }, { rgb: "164 100 60", at: 460, glyph: impShoe("#a4643c", "#2e1c11"), box: [44, 38, 12, 12] }),
  op_camel_fair: S(CamelFairScene, { ordering: "line", staggerMs: 80, victims: ["n"], hasLead: true, sound: "coronation", anchor: "cast" }, { rgb: "232 180 92", at: 460, shock: true, box: [43, 38, 14, 12] }),
  op_colts_gallop: S(ColtsGallopScene, { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "rampage", anchor: "cast" }, { rgb: "201 128 62", at: 500, shock: true, box: [42, 39, 15, 11] }),
  op_dromedary_post: S(DromedaryPostScene, { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", anchor: "cast" }, { rgb: "207 214 221", at: 440, laser: true, box: [44, 36, 12, 15], rot: -8 }),
  op_field_sketch: S(FieldSketchScene, { ordering: "sweep", staggerMs: 70, victims: ["n", "b"], hasLead: true, sound: "siege", anchor: "board" }, { rgb: "220 210 194", at: 380, shock: true, box: [45, 40, 11, 10] }),
  op_giraffe_keeper: S(GiraffeKeeperScene, { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "coronation", anchor: "cast" }, { rgb: "180 212 192", at: 500, laser: true, box: [44, 33, 12, 18] }),
  op_green_room: S(GreenRoomScene, { ordering: "line", staggerMs: 75, victims: ["n"], hasLead: true, sound: "snooze", anchor: "cast" }, { rgb: "127 196 168", at: 420, shock: true, box: [44, 39, 12, 12] }),
  op_hired_muscle: S(HiredMuscleScene, { ordering: "line", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "siege", anchor: "aim" }, { rgb: "154 142 196", at: 540, laser: true, shock: true, box: [43, 36, 13, 15], rot: 10 }),
  op_invitation_only: S(InvitationOnlyScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "wall", anchor: "cast" }, { rgb: "208 164 100", at: 440, glyph: impShoe("#d0a464", "#2b1d0c"), box: [44, 38, 12, 12] }),
  op_long_jump: S(LongJumpScene, { ordering: "line", staggerMs: 60, victims: ["n"], hasLead: true, sound: "blitz", anchor: "aim" }, { rgb: "134 183 216", at: 560, laser: true, shock: true, box: [43, 37, 13, 14], rot: -14 }),
  op_parade_elephant: S(ParadeElephantScene, { ordering: "radial", staggerMs: 60, victims: ["n"], hasLead: true, sound: "coronation", anchor: "cast" }, { rgb: "224 106 114", at: 600, glyph: impShoe("#e06a72", "#35131a"), shock: true, box: [42, 36, 15, 15] }),
  op_pole_vault: S(PoleVaultScene, { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "rampage", anchor: "cast" }, { rgb: "201 154 106", at: 520, laser: true, box: [44, 34, 12, 17] }),
  op_signal_rocket: S(SignalRocketScene, { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "blitz", anchor: "cast" }, { rgb: "240 192 76", at: 580, laser: true, box: [44, 32, 12, 19] }),
  op_stage_left: S(StageLeftScene, { ordering: "sweep", staggerMs: 70, victims: ["n"], hasLead: true, sound: "rampage", anchor: "cast" }, { rgb: "184 160 216", at: 480, glyph: impShoe("#b8a0d8", "#221a33"), box: [43, 38, 13, 12] }),
  op_title_deed: S(TitleDeedScene, { ordering: "radial", staggerMs: 60, victims: ["k", "r"], hasLead: true, sound: "siege", anchor: "board" }, { rgb: "203 176 138", at: 470, shock: true, box: [44, 39, 12, 11] }),
  op_vaulting_horse: S(VaultingHorseScene, { ordering: "line", staggerMs: 65, victims: ["b", "n"], hasLead: true, sound: "wall", anchor: "cast" }, { rgb: "138 176 200", at: 580, glyph: impShoe("#8ab0c8", "#16232e"), shock: true, box: [43, 36, 14, 14] }),
  op_viziers_errand: S(ViziersErrandScene, { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "snooze", anchor: "cast" }, { rgb: "212 168 108", at: 460, laser: true, box: [44, 36, 12, 14] }),
  op_zebra_crossing: S(ZebraCrossingScene, { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "rampage", anchor: "cast" }, { rgb: "232 226 212", at: 430, shock: true, box: [43, 40, 13, 11] }),
  ov_nightlight: S(NightlightScene, { ordering: "octagon", staggerMs: 55, victims: ["n"], hasLead: true, sound: "snooze", anchor: "board" }, { rgb: "242 208 137", at: 410, shock: true, box: [45, 39, 11, 11] }),
};
