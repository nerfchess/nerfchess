// g25CourtPlays — bespoke plays for the 20 king / royalty / authority cards
// that used to share the generated `crownGleam` family (one crown, 20 hue
// shifts).
//
// MODULE FICTION: THE COURT AROUND THE THRONE. Nothing here is regalia — the
// sibling batch took the orbs, sceptres, anointing horns, swords of state,
// rings, canopies, dais steps, spurs, standards and great seals, and a wall of
// recoloured crowns is exactly the failure this project exists to fix. Every
// card in this module is a PERSON or a CUSTOM instead: a taster folding at the
// table, a herald calling a name off the roll, a quartermaster slamming his
// shutter, a favourite whispering behind a fan, a petitioner's knees hitting
// the flagstones, a chaperone's arm coming down like a bar, a bow rippling
// down a receiving line, a bedchamber curtain drawn by two hands, a courtier
// backing out of a room without ever turning round, a fool cartwheeling in.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g25CourtPlays.css), transform/opacity animations only, no imports from
// BoardEffects.tsx, only the SigPlugin/SigRole TYPES from sigPlugins.tsx.
//
// STAGING. Every card declares anchor "cast" or "aim", so the scene happens on
// the square the card was played on. Board-scale layers (washes, edge gilt)
// live inside <BoardFrame>, never at a fixed percentage of the stage. The
// cards that cross a room (the stroll, the ivy lunge, the chaperone's arm, the
// backing-out, the handshake that will not let go) are <AimStage> and author
// their art pointing RIGHT.
//
// Every scene runs three beats — tell, strike, settle — in all three roles,
// and every scene carries at least one layer driven by the geometry vars:
// --fx-side for who walks in from where, --fx-ox/oy for the thrown shadow,
// --fx-len for a run that crosses a real distance, and --fx-index/--fx-n for
// the plays that travel down a real line of people (the bow, the courtiers
// stepping back, the averted faces, the laughter). All CSS lives in
// g25CourtPlays.css behind the `g25-` prefix.

import "./g25CourtPlays.css";

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
const rootStyle = (d: number): CSSProperties => ({ "--g25-d": `${d}ms` }) as CSSProperties;

/** stagger + a beat offset, scaled by the Settings animation-speed var. */
const b = (ms: number): string => `calc(var(--g25-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

/** The same, plus this square's place in the REAL victim order: the bow, the
 *  step back and the laughter travel down the line the play actually hits. */
const bi = (ms: number, per: number): string =>
  `calc(var(--g25-d, 0ms) + ${ms}ms * var(--fx-dur, 1) + var(--fx-index, 0) * ${per}ms)`;

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
  /** ms per place in the victim order, when the beat rides the real line. */
  per?: number;
  st?: CSSProperties;
  children?: ReactNode;
}

/** One animated plain layer. */
function L({ c, l = 0, t = 0, w = 100, h = 100, d = 0, per, st, children }: Box) {
  return (
    <span
      className={`${c} absolute block`}
      style={{
        left: `${l}%`,
        top: `${t}%`,
        width: `${w}%`,
        height: `${h}%`,
        animationDelay: per ? bi(d, per) : b(d),
        ...st,
      }}
    >
      {children}
    </span>
  );
}

/** One animated SVG layer. */
function V({
  c, l = 0, t = 0, w = 100, h = 100, d = 0, per, vb = "0 0 24 24", par, st, children,
}: Box & { vb?: string; par?: string }) {
  return (
    <svg
      viewBox={vb}
      preserveAspectRatio={par}
      className={`${c} absolute block`}
      style={{
        left: `${l}%`,
        top: `${t}%`,
        width: `${w}%`,
        height: `${h}%`,
        animationDelay: per ? bi(d, per) : b(d),
        ...st,
      }}
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
  return (
    <L c="g25-wash" d={d} st={{ background: `radial-gradient(circle at 50% 48%, ${tone}, transparent 70%)` }} />
  );
}

/** Board-edge gilt, always inside a BoardFrame. */
function Rim({ tone, d = 160 }: { tone: string; d?: number }) {
  return <L c="g25-rim" d={d} st={{ boxShadow: `inset 0 0 30px 9px ${tone}` }} />;
}

/* The cast of the court. Every card dresses these with its own prop, and no
   two cards share a central OBJECT. */

/** A gowned court figure, upright. */
const FIG = "M12 3a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM7.8 21.6l1.4-9c.3-1.9 1.4-3 2.8-3s2.5 1.1 2.8 3l1.4 9z";
/** The same figure bent from the waist. */
const BOWFIG =
  "M15.6 3.2a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8zM5.4 21.6l1.9-6.4c.6-2.2 2.2-3.7 4.4-4.3l4.6-1.2.6 2.4-4.4 1.2c-1.5.4-2.5 1.3-2.9 2.8l-1.6 5.5z";
/** A kneeling figure, one knee down. */
const KNEELFIG =
  "M12.8 3a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8zM9.2 21.4l.5-7.2c.2-2.4 1.4-3.9 3.3-3.9 1.6 0 2.6 1 2.9 2.9l.9 5h3.2v3.2z";
/** A flat open hand, palm out. */
const HAND =
  "M8 21.4V12.8c0-1.1 1.7-1.1 1.7 0V7.4c0-1.2 1.7-1.2 1.7 0v3.5c0-1.2 1.7-1.2 1.7 0V8.6c0-1.2 1.7-1.2 1.7 0v8c0 2.9-1.7 4.8-4.5 4.8z";
/** A straight-backed chair, seen from the side. */
const CHAIR = "M6 2.2h2.2v19.6H6zM8.2 11.4h9.8v2.2H8.2zM16 13.6h2.2v8.2H16z";

/* --- 1. Royal Food Taster (t5) — THE TASTER FOLDS ---------------------------
   A taster is walked in from the caster's own side, the cloche comes off, he
   takes one spoonful, and folds quietly onto the flagstones while the dish is
   pushed on to the high table. Palette: #d8b25c / #fff4d6 / #241a0d. */
function TasterFoldsScene({ role, delayMs }: SceneProps) {
  const cloche = (
    <g {...SJ}>
      <path d="M2.6 16.2c0-5.2 4.2-9 9.4-9s9.4 3.8 9.4 9z" fill="#d8b25c" stroke="#241a0d" strokeWidth="1.1" />
      <path d="M12 7.2V4.2" stroke="#241a0d" strokeWidth="1.4" />
      <circle cx="12" cy="3.2" r="1.5" fill="#fff4d6" stroke="#241a0d" strokeWidth="0.9" />
    </g>
  );
  const spoon = (
    <g {...SJ}>
      <ellipse cx="7.4" cy="6.4" rx="3.6" ry="4.6" fill="#fff4d6" stroke="#241a0d" strokeWidth="1" />
      <path d="M9.4 10.2 19 20.4" stroke="#d8b25c" strokeWidth="2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g25-tf-cloche" l={12} t={22} w={76} h={44} d={40}>{cloche}</V>
        <V c="g25-ent-pop" l={30} t={44} w={44} h={44} d={260}>{spoon}</V>
        <V c="g25-tf-fold" l={40} t={26} w={30} h={58} d={470}><path d={FIG} fill="#d8b25c" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g25-hitside" l={10} t={20} w={80} h={44} d={0}>{cloche}</V>
        <V c="g25-hit" l={34} t={34} w={38} h={38} d={140}>{spoon}</V>
        <L c="g25-hit2" l={30} t={76} w={40} h={5} d={260} st={{ borderRadius: "999px", background: "#241a0d" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(216,178,92,0.28)" />
          <Rim tone="rgba(255,244,214,0.32)" />
        </>
      }
    >
      <V c="g25-stepin" l={44} t={40} w={9} h={15} d={80}><path d={FIG} fill="#d8b25c" stroke="#241a0d" strokeWidth="0.9" {...SJ} /></V>
      <V c="g25-tf-cloche" l={39} t={35} w={22} h={13} d={220}>{cloche}</V>
      <L c="g25-tf-dish" l={40} t={47} w={20} h={3} d={340} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <V c="g25-tf-spoon" l={51} t={38} w={9} h={9} d={420} st={{ transformOrigin: "80% 90%" }}>{spoon}</V>
      <V c="g25-tf-fold" l={44} t={40} w={9} h={15} d={560} st={{ transformOrigin: "50% 100%" }}>
        <path d={FIG} fill="#d8b25c" stroke="#241a0d" strokeWidth="0.9" {...SJ} />
      </V>
      <L c="g25-leanshadow" l={40} t={56} w={20} h={4} d={640} st={{ borderRadius: "999px", background: "rgba(36,26,13,0.66)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g25-sift" l={42 + i * 7} t={44} w={1.5} h={1.5} d={700 + i * 90} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 2. Squire's Ascension (t5) — THE ROLL IS CALLED ------------------------
   The herald's roll unwinds, a name is read out, and the squire who has been
   kneeling all morning stands up into a shadow that is suddenly a knight's.
   Palette: #e0c06a / #fff2d8 / #2a2110. */
const RC_KNIGHT = "M8.2 19V13c0-3.8 2.5-5.9 4.6-6.5L12 4.2l3 1.2c2 .9 2.9 2.9 2.9 5.9V19z";

function RollCalledScene({ role, delayMs }: SceneProps) {
  const roll = (
    <g {...SJ}>
      <path d="M3.6 5.4h16.8v13.2H3.6z" fill="#fff2d8" stroke="#2a2110" strokeWidth="1.1" />
      <path d="M6.6 9.4h10.8M6.6 12.4h7.6M6.6 15.4h9.2" stroke="#2a2110" strokeWidth="1" />
      <rect x="1.4" y="4" width="2.4" height="16" rx="1" fill="#e0c06a" stroke="#2a2110" strokeWidth="0.9" />
      <rect x="20.2" y="4" width="2.4" height="16" rx="1" fill="#e0c06a" stroke="#2a2110" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g25-rc-unroll" l={6} t={26} w={88} h={46} d={40} st={{ transformOrigin: "50% 50%" }}>{roll}</V>
        <V c="g25-rc-kneel" l={30} t={38} w={40} h={54} d={280}><path d={KNEELFIG} fill="#e0c06a" /></V>
        <V c="g25-ent-pop" l={54} t={12} w={36} h={40} d={470}><path d={RC_KNIGHT} fill="#fff2d8" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g25-hit" l={8} t={22} w={84} h={40} d={0}>{roll}</V>
        <V c="g25-hitside" l={32} t={38} w={36} h={54} d={150}><path d={KNEELFIG} fill="#e0c06a" /></V>
        <L c="g25-hit2" l={34} t={84} w={32} h={4} d={260} st={{ borderRadius: "999px", background: "#2a2110" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(224,192,106,0.26)" />}>
      <V c="g25-rc-kneel" l={44} t={42} w={10} h={14} d={70}><path d={KNEELFIG} fill="#e0c06a" stroke="#2a2110" strokeWidth="0.9" {...SJ} /></V>
      <V c="g25-rc-unroll" l={36} t={30} w={28} h={14} d={200} st={{ transformOrigin: "50% 50%" }}>{roll}</V>
      <L c="g25-rc-name" l={41} t={35} w={18} h={1.6} d={340} st={{ borderRadius: "999px", background: "#fff2d8", transformOrigin: "0% 50%" }} />
      <V c="g25-rc-rise" l={45} t={40} w={9} h={16} d={500}><path d={FIG} fill="#fff2d8" stroke="#2a2110" strokeWidth="0.9" {...SJ} /></V>
      <V c="g25-rc-shadow" l={46} t={50} w={13} h={12} d={620}><path d={RC_KNIGHT} fill="rgba(42,33,16,0.6)" /></V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g25-glint" l={43 + i * 6} t={38 + (i % 2) * 8} w={2.2} h={2.2} d={720 + i * 90} st={{ borderRadius: "50%", background: "#fff2d8" }} />
      ))}
    </Lead>
  );
}

/* --- 3. Royal Taster (t4) — THE CUP GOES ROUND FIRST ------------------------
   Nobody drinks until the cup has been round: it is poured, held, sipped, and
   a chalk tick goes up on the sideboard slate before it is passed on down the
   table. Palette: #cdd8a8 / #fff4d6 / #22281a. */
function CupRoundScene({ role, delayMs }: SceneProps) {
  const cup = (
    <g {...SJ}>
      <path d="M6.4 5h11.2l-1.4 8.6c-.3 1.8-1.6 2.8-4.2 2.8s-3.9-1-4.2-2.8z" fill="#cdd8a8" stroke="#22281a" strokeWidth="1.1" />
      <path d="M12 16.4v3.2M8.4 20.6h7.2" stroke="#22281a" strokeWidth="1.3" />
    </g>
  );
  const jug = (
    <g {...SJ}>
      <path d="M5 4h9.6l1.6 3.4-1.6 3.4v9H5z" fill="#fff4d6" stroke="#22281a" strokeWidth="1.1" />
      <path d="M14.6 8.4c2.6.4 4 2 4 4.4" fill="none" stroke="#cdd8a8" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g25-cr-pour" l={6} t={12} w={48} h={52} d={40} st={{ transformOrigin: "20% 80%" }}>{jug}</V>
        <V c="g25-ent-rise" l={44} t={34} w={44} h={54} d={280}>{cup}</V>
        <L c="g25-cr-tick" l={16} t={72} w={26} h={4} d={470} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g25-hitside" l={28} t={22} w={44} h={56} d={0}>{cup}</V>
        <V c="g25-hit" l={4} t={14} w={38} h={44} d={130} st={{ transformOrigin: "20% 80%" }}>{jug}</V>
        <L c="g25-hit2" l={24} t={80} w={52} h={4} d={250} st={{ borderRadius: "999px", background: "#cdd8a8" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(205,216,168,0.26)" />}>
      <V c="g25-cr-pour" l={36} t={34} w={12} h={14} d={90} st={{ transformOrigin: "20% 80%" }}>{jug}</V>
      <V c="g25-cr-cup" l={47} t={40} w={9} h={12} d={260}>{cup}</V>
      <V c="g25-cr-sip" l={53} t={38} w={9} h={15} d={400} st={{ transformOrigin: "40% 100%" }}>
        <path d={FIG} fill="#cdd8a8" stroke="#22281a" strokeWidth="0.9" {...SJ} />
      </V>
      <L c="g25-cr-tick" l={38} t={31} w={9} h={1.8} d={560} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "0% 50%" }} />
      <L c="g25-cr-pass" l={47} t={46} w={7} h={2} d={650} st={{ borderRadius: "999px", background: "#cdd8a8" }} />
      <L c="g25-leanshadow" l={44} t={55} w={16} h={3} d={720} st={{ borderRadius: "999px", background: "rgba(34,40,26,0.6)" }} />
    </Lead>
  );
}

/* --- 4. The Food Taster (t4) — EVERY DISH REFUSED ---------------------------
   Paranoia at table: the platter is offered and waved away, the chairs scrape
   back one after another, and the place at the head of the table is left with
   nothing in front of it at all. Palette: #9fb0c8 / #fff2dc / #171d29. */
function DishRefusedScene({ role, delayMs }: SceneProps) {
  const platter = (
    <g {...SJ}>
      <path d="M2.4 13.6h19.2c-.8 2.8-4.6 4.4-9.6 4.4s-8.8-1.6-9.6-4.4z" fill="#9fb0c8" stroke="#171d29" strokeWidth="1.1" />
      <path d="M7.6 13.6c.4-2.4 2.2-3.6 4.4-3.6s4 1.2 4.4 3.6z" fill="#fff2dc" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g25-fd-offer" l={4} t={40} w={54} h={44} d={40}>{platter}</V>
        <V c="g25-fd-wave" l={50} t={16} w={42} h={54} d={260}><path d={HAND} fill="#fff2dc" /></V>
        <V c="g25-ent-mote" l={18} t={12} w={30} h={30} d={470}><path d={CHAIR} fill="#9fb0c8" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g25-hitside" l={6} t={44} w={52} h={40} d={0}>{platter}</V>
        <V c="g25-hit" l={48} t={16} w={40} h={52} d={140}><path d={HAND} fill="#fff2dc" /></V>
        <L c="g25-hit2" l={20} t={82} w={60} h={4} d={250} st={{ borderRadius: "999px", background: "#171d29" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <L c="g25-veil" st={{ background: "rgba(10,13,20,0.42)" }} />
          <Wash tone="rgba(159,176,200,0.26)" d={140} />
        </>
      }
    >
      <V c="g25-fd-offer" l={38} t={44} w={14} h={10} d={90}>{platter}</V>
      <V c="g25-fd-wave" l={52} t={38} w={8} h={11} d={260}><path d={HAND} fill="#fff2dc" stroke="#171d29" strokeWidth="0.9" {...SJ} /></V>
      <V c="g25-fd-recoil" l={38} t={44} w={14} h={10} d={420}>{platter}</V>
      {[0, 1].map((i) => (
        <V key={i} c="g25-fd-scrape" l={40 + i * 15} t={48} w={7} h={10} d={520 + i * 110}>
          <path d={CHAIR} fill="#9fb0c8" stroke="#171d29" strokeWidth="0.9" {...SJ} />
        </V>
      ))}
      <L c="g25-fd-gap" l={45} t={44} w={10} h={10} d={640} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(23,29,41,0.85), transparent 72%)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g25-sift" l={43 + i * 6} t={42} w={1.4} h={1.4} d={720 + i * 90} st={{ borderRadius: "50%", background: "#9fb0c8" }} />
      ))}
    </Lead>
  );
}

/* --- 5. Glass Ceiling (t4) — THE HAND ON THE GLASS --------------------------
   A hand comes up out of the crowd reaching for the last step of the career,
   a pane slides across above it, the palm goes flat, and the crack that spiders
   out of the print does not break anything. Palette: #a8dcf0 / #fff4d6 /
   #14262f. */
function GlassCeilingScene({ role, delayMs }: SceneProps) {
  const pane = <path d="M1 6h22v5H1z" fill="rgba(168,220,240,0.5)" stroke="#a8dcf0" strokeWidth="1.1" {...SJ} />;
  const crack = (
    <path d="M12 12 8 7M12 12l4.4-4.6M12 12l-1.4-6M12 12l3-5.6" fill="none" stroke="#fff4d6" strokeWidth="1" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g25-gc-pane" l={4} t={16} w={92} h={30} d={40} par="none">{pane}</V>
        <V c="g25-gc-reach" l={32} t={34} w={36} h={54} d={260}><path d={HAND} fill="#a8dcf0" /></V>
        <V c="g25-ent-pop" l={30} t={10} w={40} h={40} d={470}>{crack}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g25-hit" l={4} t={14} w={92} h={24} d={0} par="none">{pane}</V>
        <V c="g25-hitside" l={32} t={32} w={36} h={56} d={140}><path d={HAND} fill="#a8dcf0" /></V>
        <V c="g25-hit2" l={30} t={8} w={40} h={40} d={260}>{crack}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(168,220,240,0.24)" />}>
      <V c="g25-gc-reach" l={45} t={44} w={9} h={13} d={80}><path d={HAND} fill="#a8dcf0" stroke="#14262f" strokeWidth="0.9" {...SJ} /></V>
      <V c="g25-gc-pane" l={34} t={36} w={32} h={7} d={220} par="none">{pane}</V>
      <V c="g25-gc-palm" l={46} t={38} w={7} h={9} d={420}><path d={HAND} fill="#fff4d6" /></V>
      <L c="g25-gc-print" l={45} t={37} w={10} h={7} d={520} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.72), transparent 70%)" }} />
      <V c="g25-gc-crack" l={42} t={33} w={16} h={14} d={620}>{crack}</V>
      <V c="g25-gc-slip" l={45} t={44} w={9} h={13} d={740}><path d={HAND} fill="#a8dcf0" /></V>
    </Lead>
  );
}

/* --- 6. Iron Quota (t4) — THE QUARTERMASTER SHUTS HIS SHUTTER ---------------
   The royal smithy's hatch bangs down on every request but one: behind the
   counter every peg holds the same crenellated block, and one is pushed across
   with a shrug. Palette: #b08a5a / #ffeed0 / #2b1d10. */
const IQ_BLOCK = "M4 8h2.6V6h2.4v2h2.6V6h2.4v2H17v11H4z";

function IronQuotaScene({ role, delayMs }: SceneProps) {
  const block = (fill: string) => <path d={IQ_BLOCK} fill={fill} stroke="#2b1d10" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g25-iq-shutter" l={6} t={4} w={88} h={40} d={40} st={{ transformOrigin: "50% 0%" }} par="none" vb="0 0 40 14">
          <rect x="0.6" y="0.6" width="38.8" height="12.8" rx="1" fill="#b08a5a" stroke="#2b1d10" strokeWidth="1" />
          <path d="M0.6 4.4h38.8M0.6 8.4h38.8" stroke="#2b1d10" strokeWidth="0.8" />
        </V>
        <V c="g25-ent-rise" l={16} t={48} w={32} h={40} d={280}>{block("#ffeed0")}</V>
        <V c="g25-iq-push" l={54} t={48} w={32} h={40} d={470}>{block("#b08a5a")}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g25-hit" l={8} t={4} w={84} h={34} d={0} st={{ transformOrigin: "50% 0%" }} par="none" vb="0 0 40 14">
          <rect x="0.6" y="0.6" width="38.8" height="12.8" rx="1" fill="#b08a5a" stroke="#2b1d10" strokeWidth="1" />
        </V>
        <V c="g25-hitside" l={30} t={40} w={40} h={48} d={150}>{block("#ffeed0")}</V>
        <L c="g25-hit2" l={22} t={86} w={56} h={4} d={260} st={{ borderRadius: "999px", background: "#2b1d10" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(176,138,90,0.26)" />}>
      <L c="g25-iq-counter" l={36} t={50} w={28} h={2.4} d={80} st={{ borderRadius: "999px", background: "#2b1d10" }} />
      <V c="g25-iq-shutter" l={36} t={31} w={28} h={10} d={220} st={{ transformOrigin: "50% 0%" }} par="none" vb="0 0 40 14">
        <rect x="0.6" y="0.6" width="38.8" height="12.8" rx="1" fill="#b08a5a" stroke="#2b1d10" strokeWidth="1" />
        <path d="M0.6 4.4h38.8M0.6 8.4h38.8" stroke="#2b1d10" strokeWidth="0.8" />
      </V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g25-iq-peg" l={39 + i * 8} t={40} w={6} h={8} d={380 + i * 90}>{block("#ffeed0")}</V>
      ))}
      <V c="g25-iq-push" l={45} t={44} w={7} h={9} d={580}>{block("#b08a5a")}</V>
      <V c="g25-iq-shrug" l={57} t={41} w={8} h={13} d={670}><path d={FIG} fill="#b08a5a" stroke="#2b1d10" strokeWidth="0.9" {...SJ} /></V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g25-sift" l={42 + i * 7} t={51} w={1.4} h={1.4} d={740 + i * 80} st={{ borderRadius: "50%", background: "#ffeed0" }} />
      ))}
    </Lead>
  );
}

/* --- 7. The Quarrel (t4) — THE FAN AND THE TURNED CHAIR ---------------------
   A favourite leans in behind a painted fan, says the wrong small thing, and
   the two chairs at the head of the table turn their backs on each other. The
   folded note that follows is never opened. Palette: #9a6fa8 / #fff2dc /
   #23122c. */
function QuarrelScene({ role, delayMs }: SceneProps) {
  const fan = (
    <g {...SJ}>
      <path d="M12 21.4 3.4 8.6A11 11 0 0 1 20.6 8.6z" fill="#9a6fa8" stroke="#23122c" strokeWidth="1.1" />
      <path d="M12 21.4 7.6 6.6M12 21.4V5.6M12 21.4l4.4-14.8" stroke="#fff2dc" strokeWidth="0.9" />
    </g>
  );
  const note = <path d="M4 6h16v12H4zM4 6l8 6 8-6" fill="#fff2dc" stroke="#23122c" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g25-qr-fan" l={22} t={20} w={56} h={56} d={40} st={{ transformOrigin: "50% 90%" }}>{fan}</V>
        <V c="g25-ent-drop" l={8} t={44} w={36} h={44} d={280}><path d={CHAIR} fill="#9a6fa8" /></V>
        <V c="g25-qr-note" l={54} t={54} w={38} h={32} d={470}>{note}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g25-hit" l={24} t={16} w={52} h={52} d={0} st={{ transformOrigin: "50% 90%" }}>{fan}</V>
        <V c="g25-hitside" l={8} t={40} w={36} h={48} d={140}><path d={CHAIR} fill="#9a6fa8" /></V>
        <V c="g25-hit2" l={56} t={54} w={36} h={30} d={260}>{note}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(154,111,168,0.26)" />}>
      {[0, 1].map((i) => (
        <V key={i} c="g25-qr-chair" l={39 + i * 15} t={41} w={7} h={12} d={90 + i * 70} st={{ transformOrigin: "50% 80%", scale: i ? "-1 1" : undefined }}>
          <path d={CHAIR} fill="#9a6fa8" stroke="#23122c" strokeWidth="0.9" {...SJ} />
        </V>
      ))}
      <V c="g25-qr-fan" l={45} t={35} w={10} h={11} d={280} st={{ transformOrigin: "50% 90%" }}>{fan}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g25-qr-whisper" l={48 + i * 3} t={38} w={1.6} h={1.6} d={420 + i * 80} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      ))}
      <V c="g25-qr-turn" l={39} t={41} w={7} h={12} d={540} st={{ transformOrigin: "50% 80%" }}>
        <path d={CHAIR} fill="#23122c" stroke="#9a6fa8" strokeWidth="0.9" {...SJ} />
      </V>
      <V c="g25-qr-note" l={46} t={48} w={8} h={7} d={660}>{note}</V>
      <L c="g25-leanshadow" l={42} t={56} w={18} h={3} d={730} st={{ borderRadius: "999px", background: "rgba(35,18,44,0.6)" }} />
    </Lead>
  );
}

/* --- 8. Thistle Crown (t4) — KNEES ON THE FLAGSTONES ------------------------
   The petitioner is left to answer for himself: the whole line takes one step
   back in the real victim order, his knees hit the stones, and the thistle
   burrs stay stuck to the sleeves that withdrew. Palette: #9d86c0 / #fff4d6 /
   #1e1730. */
function ThistleCrownScene({ role, delayMs }: SceneProps) {
  const burr = (
    <g {...SJ}>
      <circle cx="12" cy="13" r="4.6" fill="#9d86c0" stroke="#1e1730" strokeWidth="1" />
      <path d="M12 8.4V4.6M7.4 10.4 4.6 7.6M16.6 10.4l2.8-2.8M12 17.6v3.4M7.4 15.6l-2.8 2.8M16.6 15.6l2.8 2.8" stroke="#fff4d6" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g25-tk-back" l={4} t={26} w={34} h={52} d={40}><path d={FIG} fill="#9d86c0" /></V>
        <V c="g25-tk-knees" l={34} t={32} w={40} h={56} d={280}><path d={KNEELFIG} fill="#fff4d6" /></V>
        <V c="g25-ent-pop" l={62} t={12} w={32} h={32} d={470}>{burr}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g25-hitside" l={10} t={20} w={36} h={56} d={0} per={40}><path d={FIG} fill="#9d86c0" /></V>
        <V c="g25-hit" l={40} t={30} w={44} h={58} d={150}><path d={KNEELFIG} fill="#fff4d6" /></V>
        <L c="g25-hit2" l={34} t={84} w={40} h={4} d={260} st={{ borderRadius: "999px", background: "#1e1730" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(157,134,192,0.26)" />}>
      <V c="g25-stepin" l={45} t={40} w={9} h={15} d={80}><path d={FIG} fill="#fff4d6" stroke="#1e1730" strokeWidth="0.9" {...SJ} /></V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g25-tk-back" l={35 + i * 10} t={39} w={8} h={13} d={220 + i * 70} per={45}>
          <path d={FIG} fill="#9d86c0" stroke="#1e1730" strokeWidth="0.9" {...SJ} />
        </V>
      ))}
      <V c="g25-tk-knees" l={45} t={41} w={10} h={14} d={440} st={{ transformOrigin: "50% 100%" }}>
        <path d={KNEELFIG} fill="#fff4d6" stroke="#1e1730" strokeWidth="0.9" {...SJ} />
      </V>
      <L c="g25-tk-dust" l={42} t={53} w={16} h={4} d={530} st={{ borderRadius: "999px", background: "rgba(255,244,214,0.6)" }} />
      {[0, 1].map((i) => (
        <V key={i} c="g25-tk-burr" l={38 + i * 20} t={42} w={5} h={5} d={620 + i * 90}>{burr}</V>
      ))}
      <L c="g25-leanshadow" l={43} t={56} w={16} h={3} d={720} st={{ borderRadius: "999px", background: "rgba(30,23,48,0.62)" }} />
    </Lead>
  );
}

/* --- 9. Wilted Garland (t4) — THE CHAPERONE'S ARM ---------------------------
   An arm comes down like a toll bar between the queen and everyone she wanted
   to stand near, holds at exactly the distance the play measures, and the
   garland on her shoulders goes brown and starts to shed. Palette: #b5a860 /
   #fff2d6 / #2a2712. */
function WiltedGarlandScene({ role, delayMs }: SceneProps) {
  const garland = (
    <g {...SJ}>
      <path d="M2.4 8c4 6 15.2 6 19.2 0" fill="none" stroke="#b5a860" strokeWidth="2.2" />
      <path d="M6 10.4c-.4 2-1.8 3-3.2 3M12 12.8c0 2-1 3.4-2.4 4M18 10.4c.4 2 1.8 3 3.2 3" fill="none" stroke="#fff2d6" strokeWidth="1.2" />
    </g>
  );
  const arm = (
    <g {...SJ}>
      <path d="M1.4 9.6h17.2v4.6H1.4z" fill="#fff2d6" stroke="#2a2712" strokeWidth="1.1" />
      <path d="M18.6 8.4h4v7h-4z" fill="#b5a860" stroke="#2a2712" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g25-wg-lean" l={6} t={22} w={38} h={56} d={40}><path d={FIG} fill="#b5a860" /></V>
        <V c="g25-wg-bar" l={10} t={40} w={84} h={26} d={280} st={{ transformOrigin: "94% 50%" }}>{arm}</V>
        <V c="g25-ent-mote" l={22} t={8} w={54} h={34} d={470}>{garland}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g25-hitside" l={22} t={16} w={40} h={56} d={0}><path d={FIG} fill="#b5a860" /></V>
        <V c="g25-hit" l={8} t={40} w={84} h={24} d={140} st={{ transformOrigin: "94% 50%" }}>{arm}</V>
        <V c="g25-hit2" l={20} t={8} w={56} h={30} d={260}>{garland}</V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(181,168,96,0.26)" />}>
      <V c="g25-wg-lean" l={43} t={41} w={9} h={14} d={90}><path d={FIG} fill="#b5a860" stroke="#2a2712" strokeWidth="0.9" {...SJ} /></V>
      <V c="g25-wg-bar" l={49} t={43} w={16} h={7} d={280} st={{ transformOrigin: "0% 50%" }}>{arm}</V>
      <L c="g25-runout" l={49} t={46} w={26} h={1.6} d={400} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #fff2d6, rgba(181,168,96,0))", transformOrigin: "0% 50%" }} />
      <V c="g25-wg-shed" l={41} t={37} w={13} h={8} d={540}>{garland}</V>
      <V c="g25-wg-push" l={57} t={41} w={9} h={14} d={650}><path d={FIG} fill="#2a2712" stroke="#b5a860" strokeWidth="0.9" {...SJ} /></V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g25-sift" l={43 + i * 5} t={44} w={1.6} h={1.6} d={720 + i * 90} st={{ borderRadius: "50%", background: "#b5a860" }} />
      ))}
    </AimLead>
  );
}

/* --- 10. Ivy Crown (t4) — THE IVY RUNS AHEAD --------------------------------
   The palace ivy shoots along the flags ahead of the king, lights the two
   stones he is allowed, carries him over both in one stride, and then knits
   shut behind him and sleeps. Palette: #8ec87a / #fff4d6 / #17301a. */
function IvyCrownScene({ role, delayMs }: SceneProps) {
  const leaf = <path d="M3.4 19.6C3.4 11 8 5 15 3.4c1.6 5.6-.6 12-6 16z" fill="#8ec87a" stroke="#17301a" strokeWidth="1" {...SJ} />;
  const tendril = (
    <path d="M1 14c4-.6 6-2.6 6.6-5.6.4-2 2-3 4-2.6 2.6.6 3 3.6 6 3.6" fill="none" stroke="#8ec87a" strokeWidth="1.8" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g25-iv-run" l={4} t={40} w={90} h={36} d={40} st={{ transformOrigin: "0% 50%" }}>{tendril}</V>
        <V c="g25-ent-pop" l={26} t={12} w={34} h={34} d={280}>{leaf}</V>
        <V c="g25-iv-stride" l={54} t={30} w={36} h={54} d={470}><path d={FIG} fill="#fff4d6" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g25-hit" l={4} t={42} w={92} h={34} d={0} st={{ transformOrigin: "0% 50%" }}>{tendril}</V>
        <V c="g25-hitside" l={32} t={26} w={38} h={54} d={140}><path d={FIG} fill="#fff4d6" /></V>
        <V c="g25-hit2" l={58} t={54} w={30} h={30} d={260}>{leaf}</V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(142,200,122,0.26)" />}>
      <L c="g25-runout" l={47} t={49} w={26} h={2} d={80} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #8ec87a, rgba(142,200,122,0))", transformOrigin: "0% 50%" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g25-iv-stone" l={51 + i * 7} t={46} w={6} h={6} d={220 + i * 120} st={{ border: "2px solid #fff4d6" }} />
      ))}
      <V c="g25-iv-stride" l={45} t={40} w={9} h={15} d={460}><path d={FIG} fill="#fff4d6" stroke="#17301a" strokeWidth="0.9" {...SJ} /></V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g25-iv-leaf" l={48 + i * 6} t={43 + (i % 2) * 6} w={5} h={5} d={600 + i * 90}>{leaf}</V>
      ))}
      <V c="g25-iv-knit" l={44} t={45} w={10} h={9} d={700} st={{ transformOrigin: "0% 50%" }}>{tendril}</V>
      <L c="g25-leanshadow" l={44} t={55} w={16} h={3} d={760} st={{ borderRadius: "999px", background: "rgba(23,48,26,0.6)" }} />
    </AimLead>
  );
}

/* --- 11. Promotion Paperwork (t3) — THE PAPERS ARE STAMPED ------------------
   A clerk who has done this ten thousand times: the form slides in, two stamps
   land without looking, a signature is scrawled and the whole thing is posted
   into a pigeonhole. Palette: #e09a70 / #fff4d6 / #33200f. */
function PaperworkScene({ role, delayMs }: SceneProps) {
  const form = (
    <g {...SJ}>
      <path d="M4.6 2.6h11L19.4 6v15.4H4.6z" fill="#fff4d6" stroke="#33200f" strokeWidth="1.1" />
      <path d="M7.4 9h9M7.4 12h9M7.4 15h5.4" stroke="#33200f" strokeWidth="0.9" />
    </g>
  );
  const stamp = (
    <g {...SJ}>
      <path d="M8 3.4h8v6H8z" fill="#33200f" stroke="#e09a70" strokeWidth="1" />
      <path d="M5.6 9.4h12.8v4H5.6z" fill="#e09a70" stroke="#33200f" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g25-pp-slide" l={20} t={12} w={54} h={70} d={40}>{form}</V>
        <V c="g25-pp-stamp" l={40} t={6} w={44} h={44} d={280}>{stamp}</V>
        <L c="g25-pp-ink" l={38} t={40} w={30} h={16} d={470} st={{ borderRadius: "50%", border: "2px solid #e09a70" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g25-hitside" l={24} t={12} w={52} h={70} d={0}>{form}</V>
        <V c="g25-hit" l={36} t={20} w={40} h={40} d={140}>{stamp}</V>
        <L c="g25-hit2" l={32} t={44} w={36} h={18} d={250} st={{ borderRadius: "50%", border: "2px solid #e09a70" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(224,154,112,0.26)" />}>
      <V c="g25-pp-slide" l={42} t={38} w={16} h={20} d={80}>{form}</V>
      <V c="g25-pp-stamp" l={44} t={32} w={11} h={11} d={260}>{stamp}</V>
      <V c="g25-pp-stamp2" l={49} t={38} w={9} h={9} d={400}>{stamp}</V>
      <L c="g25-pp-ink" l={44} t={41} w={12} h={7} d={470} st={{ borderRadius: "50%", border: "2px solid #e09a70" }} />
      <L c="g25-pp-scrawl" l={44} t={50} w={13} h={1.6} d={580} st={{ borderRadius: "999px", background: "#fff4d6", transformOrigin: "0% 50%" }} />
      <V c="g25-pp-file" l={42} t={38} w={16} h={20} d={680}>{form}</V>
      <L c="g25-leanshadow" l={42} t={57} w={18} h={3} d={740} st={{ borderRadius: "999px", background: "rgba(51,32,15,0.6)" }} />
    </Lead>
  );
}

/* --- 12. Counterfeit Crown (t3) — THE PLACE CARDS ARE SWAPPED ---------------
   Somebody switches the two folded cards at the head of the table while the
   room is looking elsewhere. The seating is a lie now; nothing else about the
   evening changes. Palette: #86c2c8 / #fff4d6 / #12292c. */
function PlaceCardsScene({ role, delayMs }: SceneProps) {
  const card = (label: string, fill: string) => (
    <g {...SJ}>
      <path d="M2.6 8h18.8v11H2.6z" fill={fill} stroke="#12292c" strokeWidth="1.1" />
      <path d="M2.6 8 12 3.4 21.4 8" fill="rgba(255,244,214,0.55)" stroke="#12292c" strokeWidth="1" />
      <text x="12" y="15.4" textAnchor="middle" fontSize="5.4" fontWeight="700" fill="#12292c">{label}</text>
    </g>
  );
  const sly = <path d={HAND} fill="#86c2c8" stroke="#12292c" strokeWidth="0.9" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g25-pc-card" l={6} t={38} w={42} h={44} d={40}>{card("KING", "#fff4d6")}</V>
        <V c="g25-pc-card" l={52} t={38} w={42} h={44} d={200}>{card("QUEEN", "#86c2c8")}</V>
        <V c="g25-pc-sly" l={28} t={8} w={44} h={50} d={430}>{sly}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g25-hitside" l={6} t={40} w={42} h={44} d={0}>{card("KING", "#fff4d6")}</V>
        <V c="g25-hit" l={52} t={40} w={42} h={44} d={130}>{card("QUEEN", "#86c2c8")}</V>
        <L c="g25-hit2" l={34} t={24} w={32} h={18} d={250} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(134,194,200,0.7), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(134,194,200,0.26)" />}>
      <V c="g25-pc-card" l={39} t={42} w={9} h={10} d={80}>{card("KING", "#fff4d6")}</V>
      <V c="g25-pc-card" l={53} t={42} w={9} h={10} d={150}>{card("QUEEN", "#86c2c8")}</V>
      <V c="g25-pc-sly" l={45} t={30} w={10} h={13} d={280}>{sly}</V>
      <V c="g25-pc-swapa" l={39} t={42} w={9} h={10} d={400}>{card("QUEEN", "#86c2c8")}</V>
      <V c="g25-pc-swapb" l={53} t={42} w={9} h={10} d={400}>{card("KING", "#fff4d6")}</V>
      <L c="g25-glint" l={50} t={38} w={2.6} h={2.6} d={580} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      <V c="g25-pc-squint" l={62} t={41} w={8} h={13} d={660}><path d={FIG} fill="#86c2c8" stroke="#12292c" strokeWidth="0.9" {...SJ} /></V>
    </Lead>
  );
}

/* --- 13. Royal Stroll (t2) — THE BOW RIPPLES DOWN THE LINE ------------------
   Two unhurried paces down the long gallery, and the bow travels ahead of him
   along the receiving line in the real victim order, then everyone straightens
   up again as if nothing happened. Palette: #e8c47a / #fff4d6 / #2d2412. */
function RoyalStrollScene({ role, delayMs }: SceneProps) {
  const bowman = (fill: string) => <path d={BOWFIG} fill={fill} stroke="#2d2412" strokeWidth="0.9" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g25-rs-stride" l={6} t={26} w={38} h={58} d={40}><path d={FIG} fill="#e8c47a" /></V>
        <V c="g25-rs-bow" l={44} t={30} w={38} h={54} d={280} per={60}>{bowman("#fff4d6")}</V>
        <L c="g25-rs-print" l={14} t={82} w={22} h={4} d={470} st={{ borderRadius: "999px", background: "#2d2412" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g25-rs-bow" l={16} t={22} w={54} h={62} d={0} per={70}>{bowman("#e8c47a")}</V>
        <L c="g25-hit2" l={20} t={86} w={52} h={4} d={160} st={{ borderRadius: "999px", background: "#2d2412" }} />
        <V c="g25-hit" l={54} t={30} w={38} h={50} d={280}><path d={FIG} fill="#fff4d6" /></V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(232,196,122,0.26)" />}>
      <L c="g25-runout" l={46} t={53} w={26} h={1.8} d={80} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #e8c47a, rgba(232,196,122,0))", transformOrigin: "0% 50%" }} />
      <V c="g25-rs-stride" l={43} t={40} w={9} h={15} d={140}><path d={FIG} fill="#fff4d6" stroke="#2d2412" strokeWidth="0.9" {...SJ} /></V>
      {[0, 1, 2, 3].map((i) => (
        <V key={i} c="g25-rs-bow" l={50 + i * 6} t={41} w={8} h={13} d={240 + i * 110} per={55}>
          {bowman("#e8c47a")}
        </V>
      ))}
      {[0, 1].map((i) => (
        <L key={i} c="g25-rs-print" l={44 + i * 5} t={54} w={3} h={1.4} d={520 + i * 110} st={{ borderRadius: "999px", background: "rgba(45,36,18,0.7)" }} />
      ))}
      <V c="g25-rs-up" l={50} t={41} w={8} h={13} d={700}><path d={FIG} fill="#e8c47a" stroke="#2d2412" strokeWidth="0.9" {...SJ} /></V>
    </AimLead>
  );
}

/* --- 14. Halo of the Crown (t2) — THE CURTAIN IS DRAWN ----------------------
   Two hands take the bedchamber curtains and walk them shut around the king.
   One hand gets through the last of the gap before it closes; after that the
   seam holds. Palette: #b06a7a / #fff2dc / #2a1018. */
function CurtainDrawnScene({ role, delayMs }: SceneProps) {
  const drape = (flip?: boolean) => (
    <g {...SJ} transform={flip ? "translate(24 0) scale(-1 1)" : undefined}>
      <path d="M1 1.4h9.6c-1.4 7-1.4 14 0 21.2H1z" fill="#b06a7a" stroke="#2a1018" strokeWidth="1.1" />
      <path d="M3.4 1.8c-.8 6.8-.8 13.6 0 20.4M6.6 1.8c-.8 6.8-.8 13.6 0 20.4" fill="none" stroke="#2a1018" strokeWidth="0.8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g25-hc-left" l={2} t={10} w={44} h={78} d={40} st={{ transformOrigin: "0% 50%" }}>{drape()}</V>
        <V c="g25-hc-right" l={54} t={10} w={44} h={78} d={40} st={{ transformOrigin: "100% 50%" }}>{drape(true)}</V>
        <V c="g25-hc-slip" l={36} t={30} w={30} h={40} d={430}><path d={HAND} fill="#fff2dc" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g25-hitside" l={2} t={12} w={42} h={76} d={0} st={{ transformOrigin: "0% 50%" }}>{drape()}</V>
        <V c="g25-hit" l={56} t={12} w={42} h={76} d={120} st={{ transformOrigin: "100% 50%" }}>{drape(true)}</V>
        <L c="g25-hit2" l={47} t={10} w={6} h={80} d={250} st={{ borderRadius: "999px", background: "#fff2dc" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(176,106,122,0.26)" />
          <Rim tone="rgba(255,242,220,0.28)" />
        </>
      }
    >
      {[0, 1].map((i) => (
        <V key={i} c="g25-hc-hand" l={i ? 57 : 38} t={38} w={6} h={8} d={80 + i * 70}>
          <path d={HAND} fill="#fff2dc" stroke="#2a1018" strokeWidth="0.9" {...SJ} />
        </V>
      ))}
      <V c="g25-hc-left" l={34} t={34} w={13} h={26} d={240} st={{ transformOrigin: "0% 50%" }}>{drape()}</V>
      <V c="g25-hc-right" l={53} t={34} w={13} h={26} d={240} st={{ transformOrigin: "100% 50%" }}>{drape(true)}</V>
      <V c="g25-hc-slip" l={46} t={42} w={8} h={10} d={460}><path d={HAND} fill="#fff2dc" /></V>
      <L c="g25-hc-seam" l={49.2} t={34} w={1.6} h={26} d={580} st={{ borderRadius: "999px", background: "#fff2dc" }} />
      <L c="g25-hc-glow" l={44} t={38} w={12} h={18} d={680} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,220,0.6), transparent 70%)" }} />
    </Lead>
  );
}

/* --- 15. Sticky Floorboards (t2) — SOMEBODY WAXED THE THRONE ROOM -----------
   A servant's wax cloth goes over the boards in one long arc; after that every
   boot in the room comes up with a string of wax and goes straight back down.
   One person is grand enough to glide anyway. Palette: #ead9a8 / #fff2dc /
   #35291a. */
function StickyFloorScene({ role, delayMs }: SceneProps) {
  const cloth = (
    <path d="M3 6.4c5-2.4 12-2.6 18 .6-1.6 5-5 8-9.6 8.6C7.2 16.2 4.2 12.6 3 6.4z" fill="#ead9a8" stroke="#35291a" strokeWidth="1.1" {...SJ} />
  );
  const boot = (
    <g {...SJ}>
      <path d="M8 3h4.6v10.6l5.4 2.4v4H8z" fill="#35291a" stroke="#ead9a8" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g25-sf-cloth" l={6} t={26} w={60} h={46} d={40} st={{ transformOrigin: "20% 60%" }}>{cloth}</V>
        <V c="g25-sf-heel" l={54} t={40} w={38} h={48} d={280} st={{ transformOrigin: "50% 100%" }}>{boot}</V>
        <L c="g25-sf-gloss" l={8} t={78} w={84} h={5} d={470} st={{ borderRadius: "999px", background: "linear-gradient(90deg, transparent, #fff2dc, transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g25-hit" l={8} t={20} w={54} h={44} d={0} st={{ transformOrigin: "20% 60%" }}>{cloth}</V>
        <V c="g25-hitside" l={52} t={36} w={40} h={50} d={140} st={{ transformOrigin: "50% 100%" }}>{boot}</V>
        <L c="g25-hit2" l={14} t={84} w={72} h={4} d={250} st={{ borderRadius: "999px", background: "#ead9a8" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(234,217,168,0.26)" />}>
      <V c="g25-sf-cloth" l={38} t={40} w={14} h={12} d={80} st={{ transformOrigin: "20% 60%" }}>{cloth}</V>
      <L c="g25-sf-gloss" l={38} t={51} w={26} h={2.4} d={240} st={{ borderRadius: "999px", background: "linear-gradient(90deg, transparent, #fff2dc, transparent)" }} />
      <V c="g25-sf-heel" l={44} t={42} w={7} h={11} d={420} st={{ transformOrigin: "50% 100%" }}>{boot}</V>
      {[0, 1].map((i) => (
        <V key={i} c="g25-sf-stuck" l={39 + i * 16} t={42} w={8} h={12} d={520 + i * 110} st={{ transformOrigin: "50% 100%" }}>
          <path d={FIG} fill="#ead9a8" stroke="#35291a" strokeWidth="0.9" {...SJ} />
        </V>
      ))}
      <V c="g25-sf-glide" l={50} t={41} w={9} h={13} d={660}><path d={FIG} fill="#fff2dc" stroke="#35291a" strokeWidth="0.9" {...SJ} /></V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g25-sift" l={42 + i * 7} t={50} w={1.4} h={1.4} d={730 + i * 80} st={{ borderRadius: "50%", background: "#ead9a8" }} />
      ))}
    </Lead>
  );
}

/* --- 16. Tilted Crown (t2) — THE CURTSY GOES WRONG --------------------------
   The dip is a shade too deep, the whole thing tips, a hand shoots up to save
   the headdress, and every face in the line turns politely aside in order.
   A hairpin ticks away across the boards. Palette: #d0a0d8 / #fff4d6 /
   #2a1a30. */
function CurtsyScene({ role, delayMs }: SceneProps) {
  const lady = (fill: string) => (
    <g {...SJ}>
      <path d={FIG} fill={fill} stroke="#2a1a30" strokeWidth="0.9" />
      <path d="M6.4 21.6c1.2-3.4 3.2-5 5.6-5s4.4 1.6 5.6 5z" fill={fill} stroke="#2a1a30" strokeWidth="0.9" />
    </g>
  );
  const head = (
    <g {...SJ}>
      <circle cx="12" cy="14" r="4.4" fill="#d0a0d8" stroke="#2a1a30" strokeWidth="1" />
      <path d="M12 9.6V4.4M8.6 10.4 5.4 6.6M15.4 10.4l3.2-3.8" stroke="#fff4d6" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g25-ct-dip" l={26} t={26} w={48} h={62} d={40} st={{ transformOrigin: "50% 100%" }}>{lady("#d0a0d8")}</V>
        <V c="g25-ct-steady" l={58} t={8} w={34} h={40} d={280}><path d={HAND} fill="#fff4d6" /></V>
        <V c="g25-ent-pop" l={10} t={12} w={30} h={30} d={470}>{head}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g25-hitside" l={24} t={24} w={50} h={64} d={0} st={{ transformOrigin: "50% 100%" }}>{lady("#d0a0d8")}</V>
        <V c="g25-hit" l={56} t={10} w={34} h={38} d={140}><path d={HAND} fill="#fff4d6" /></V>
        <L c="g25-hit2" l={20} t={84} w={26} h={3} d={260} st={{ borderRadius: "999px", background: "#2a1a30" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(208,160,216,0.26)" />}>
      <V c="g25-ct-dip" l={44} t={40} w={10} h={15} d={90} st={{ transformOrigin: "50% 100%" }}>{lady("#d0a0d8")}</V>
      <V c="g25-ct-tip" l={44} t={40} w={10} h={15} d={280} st={{ transformOrigin: "50% 100%" }}>{lady("#fff4d6")}</V>
      <V c="g25-ct-steady" l={51} t={34} w={7} h={9} d={420}><path d={HAND} fill="#fff4d6" stroke="#2a1a30" strokeWidth="0.9" {...SJ} /></V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g25-ct-avert" l={36 + i * 10} t={38} w={6} h={6} d={540 + i * 80} per={50}>{head}</V>
      ))}
      <L c="g25-ct-pin" l={47} t={52} w={5} h={1.2} d={680} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      <L c="g25-leanshadow" l={43} t={56} w={16} h={3} d={740} st={{ borderRadius: "999px", background: "rgba(42,26,48,0.6)" }} />
    </Lead>
  );
}

/* --- 17. Crown Indemnity (t2) — BACKING OUT OF THE ROOM ---------------------
   You never turn your back on the throne. He bows at the mark, walks backwards
   the whole length of the floor, and the two who follow him out are never
   touched on the way. Palette: #c0b8a0 / #fff4d6 / #26221a. */
function BackingOutScene({ role, delayMs }: SceneProps) {
  const doorleaf = (
    <g {...SJ}>
      <rect x="4" y="1.6" width="16" height="20.8" rx="1" fill="#c0b8a0" stroke="#26221a" strokeWidth="1.2" />
      <rect x="7" y="5" width="10" height="7" rx="1" fill="none" stroke="#26221a" strokeWidth="0.9" />
      <circle cx="17" cy="15" r="1.1" fill="#fff4d6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g25-bo-bow" l={10} t={24} w={44} h={60} d={40} st={{ transformOrigin: "70% 100%" }}><path d={BOWFIG} fill="#c0b8a0" /></V>
        <V c="g25-bo-back" l={40} t={26} w={40} h={58} d={280}><path d={FIG} fill="#fff4d6" /></V>
        <V c="g25-ent-drop" l={58} t={14} w={36} h={72} d={470}>{doorleaf}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g25-hitside" l={14} t={22} w={44} h={62} d={0} st={{ transformOrigin: "70% 100%" }}><path d={BOWFIG} fill="#c0b8a0" /></V>
        <V c="g25-hit" l={54} t={16} w={38} h={70} d={140}>{doorleaf}</V>
        <L c="g25-hit2" l={18} t={86} w={48} h={4} d={260} st={{ borderRadius: "999px", background: "#26221a" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(192,184,160,0.26)" />}>
      <V c="g25-bo-bow" l={43} t={40} w={9} h={15} d={90} st={{ transformOrigin: "70% 100%" }}>
        <path d={BOWFIG} fill="#fff4d6" stroke="#26221a" strokeWidth="0.9" {...SJ} />
      </V>
      <L c="g25-runout" l={47} t={52} w={24} h={1.6} d={200} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #c0b8a0, rgba(192,184,160,0))", transformOrigin: "0% 50%" }} />
      <V c="g25-bo-back" l={45} t={40} w={9} h={15} d={280}><path d={FIG} fill="#fff4d6" stroke="#26221a" strokeWidth="0.9" {...SJ} /></V>
      {[0, 1].map((i) => (
        <V key={i} c="g25-bo-pass" l={52 + i * 6} t={43} w={6} h={10} d={460 + i * 120}>
          <path d={FIG} fill="#c0b8a0" stroke="#26221a" strokeWidth="0.9" {...SJ} />
        </V>
      ))}
      <V c="g25-bo-door" l={62} t={38} w={9} h={16} d={620} st={{ transformOrigin: "100% 50%" }}>{doorleaf}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g25-sift" l={49 + i * 5} t={50} w={1.4} h={1.4} d={720 + i * 80} st={{ borderRadius: "50%", background: "#c0b8a0" }} />
      ))}
    </AimLead>
  );
}

/* --- 18. Velcro Gloves (t2) — THE HANDSHAKE THAT WILL NOT LET GO ------------
   The receiving line jams: the clasp holds, the guest hauls backwards, the
   glove peels off with a rip and he snaps back to exactly where he was
   standing, holding nothing. Palette: #e08a6a / #fff2dc / #2e1710. */
function VelcroGlovesScene({ role, delayMs }: SceneProps) {
  const clasp = (
    <g {...SJ}>
      <path d="M1.4 10.4h9.2l3 3.2h9v4h-10l-3-3.2H1.4z" fill="#e08a6a" stroke="#2e1710" strokeWidth="1.1" />
      <path d="M8.4 10.4c1.6-2.6 4.4-3.4 7.2-2.2" fill="none" stroke="#fff2dc" strokeWidth="1.2" />
    </g>
  );
  const glove = <path d={HAND} fill="#fff2dc" stroke="#2e1710" strokeWidth="0.9" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g25-vg-clasp" l={8} t={34} w={84} h={40} d={40}>{clasp}</V>
        <V c="g25-vg-rip" l={40} t={20} w={34} h={34} d={280}>
          <path d="M12 2 8.4 7l3.6 4-3.6 5 3.6 6" fill="none" stroke="#fff2dc" strokeWidth="2" {...SJ} />
        </V>
        <V c="g25-ent-pop" l={54} t={46} w={36} h={44} d={470}>{glove}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g25-hit" l={6} t={36} w={88} h={36} d={0}>{clasp}</V>
        <V c="g25-hitside" l={52} t={40} w={40} h={48} d={140}>{glove}</V>
        <L c="g25-hit2" l={20} t={22} w={30} h={4} d={250} st={{ borderRadius: "999px", background: "#e08a6a" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(224,138,106,0.26)" />}>
      <V c="g25-vg-clasp" l={43} t={44} w={16} h={8} d={90}>{clasp}</V>
      <V c="g25-vg-pull" l={54} t={41} w={9} h={14} d={280}><path d={FIG} fill="#e08a6a" stroke="#2e1710" strokeWidth="0.9" {...SJ} /></V>
      <V c="g25-vg-rip" l={50} t={40} w={8} h={8} d={440}>
        <path d="M12 2 8.4 7l3.6 4-3.6 5 3.6 6" fill="none" stroke="#fff2dc" strokeWidth="2" {...SJ} />
      </V>
      <V c="g25-vg-snap" l={54} t={41} w={9} h={14} d={580}><path d={FIG} fill="#fff2dc" stroke="#2e1710" strokeWidth="0.9" {...SJ} /></V>
      <V c="g25-vg-glove" l={45} t={44} w={7} h={9} d={680}>{glove}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g25-sift" l={47 + i * 5} t={46} w={1.4} h={1.4} d={740 + i * 80} st={{ borderRadius: "50%", background: "#e08a6a" }} />
      ))}
    </AimLead>
  );
}

/* --- 19. Paper Crown (t1) — THE FOOL TUMBLES IN -----------------------------
   The fool comes in over his own hands from the caster's side, claps a folded
   paper hat on the king, and the room laughs down the line one mouth at a
   time. A torn scrap comes down after him. Palette: #f0a8c8 / #fff4d6 /
   #2c1424. */
function FoolTumblesScene({ role, delayMs }: SceneProps) {
  const hat = <path d="M3 19.6 12 3.4l9 16.2z" fill="#fff4d6" stroke="#2c1424" strokeWidth="1.2" {...SJ} />;
  const laugh = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="7.6" fill="none" stroke="#f0a8c8" strokeWidth="1.4" />
      <path d="M7.4 13.4c1.2 3 7.4 3 8.6 0z" fill="#fff4d6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g25-fc-tumble" l={8} t={30} w={44} h={54} d={40}><path d={FIG} fill="#f0a8c8" /></V>
        <V c="g25-ent-drop" l={44} t={10} w={44} h={44} d={280}>{hat}</V>
        <V c="g25-fc-laugh" l={56} t={52} w={34} h={34} d={470}>{laugh}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g25-hitside" l={10} t={30} w={44} h={56} d={0}><path d={FIG} fill="#f0a8c8" /></V>
        <V c="g25-hit" l={40} t={8} w={44} h={44} d={140}>{hat}</V>
        <V c="g25-hit2" l={54} t={50} w={34} h={34} d={260}>{laugh}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(240,168,200,0.26)" />}>
      <V c="g25-fc-tumble" l={40} t={40} w={10} h={15} d={80} st={{ transformOrigin: "50% 80%" }}>
        <path d={FIG} fill="#f0a8c8" stroke="#2c1424" strokeWidth="0.9" {...SJ} />
      </V>
      <V c="g25-fc-hat" l={46} t={35} w={9} h={9} d={320}>{hat}</V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g25-fc-laugh" l={38 + i * 10} t={44} w={6} h={6} d={480 + i * 80} per={50}>{laugh}</V>
      ))}
      <L c="g25-fc-bell" l={52} t={39} w={2.6} h={2.6} d={600} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      <L c="g25-fc-scrap" l={44} t={44} w={2.4} h={3} d={700} st={{ background: "#fff4d6" }} />
      <L c="g25-leanshadow" l={42} t={55} w={18} h={3} d={760} st={{ borderRadius: "999px", background: "rgba(44,20,36,0.6)" }} />
    </Lead>
  );
}

/* --- 20. Hedgerow Buds (t1) — THE GARDENER'S PINCH --------------------------
   The palace gardener walks the outer hedge, rolls two buds between finger and
   thumb, picks one, and it opens on the spot. The other stays shut and is left
   for next week. Palette: #a8c86a / #fff4d6 / #1f2a12. */
function HedgerowBudsScene({ role, delayMs }: SceneProps) {
  const bud = (fill: string) => (
    <g {...SJ}>
      <path d="M12 3.4c3.2 2.6 4.8 5.6 4.8 9 0 3.8-2 6.2-4.8 6.2s-4.8-2.4-4.8-6.2c0-3.4 1.6-6.4 4.8-9z" fill={fill} stroke="#1f2a12" strokeWidth="1.1" />
      <path d="M12 19.4v2.4" stroke="#a8c86a" strokeWidth="1.4" />
    </g>
  );
  const bloom = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="2.6" fill="#fff4d6" />
      <path d="M12 9.4V3.6M12 14.6v5.8M9.4 12H3.6M14.6 12h5.8M9.8 9.8 5.6 5.6M14.2 9.8l4.2-4.2M9.8 14.2l-4.2 4.2M14.2 14.2l4.2 4.2" stroke="#a8c86a" strokeWidth="1.5" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g25-hb-hedge" l={4} t={62} w={92} h={9} d={40} st={{ borderRadius: "999px", background: "#1f2a12", transformOrigin: "0% 50%" }} />
        <V c="g25-hb-pinch" l={16} t={22} w={34} h={44} d={280}>{bud("#a8c86a")}</V>
        <V c="g25-ent-pop" l={54} t={18} w={38} h={38} d={470}>{bloom}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g25-hit2" l={4} t={66} w={92} h={7} d={0} st={{ borderRadius: "999px", background: "#1f2a12", transformOrigin: "0% 50%" }} />
        <V c="g25-hitside" l={18} t={24} w={34} h={44} d={130}>{bud("#a8c86a")}</V>
        <V c="g25-hit" l={52} t={20} w={36} h={36} d={260}>{bloom}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(168,200,106,0.26)" />}>
      <V c="g25-stepin" l={38} t={40} w={9} h={14} d={80}><path d={FIG} fill="#a8c86a" stroke="#1f2a12" strokeWidth="0.9" {...SJ} /></V>
      <L c="g25-hb-hedge" l={38} t={51} w={26} h={3} d={200} st={{ borderRadius: "999px", background: "#1f2a12", transformOrigin: "0% 50%" }} />
      {[0, 1].map((i) => (
        <V key={i} c="g25-hb-pinch" l={48 + i * 8} t={43} w={6} h={8} d={380 + i * 90}>{bud("#a8c86a")}</V>
      ))}
      <V c="g25-hb-open" l={48} t={41} w={8} h={8} d={560}>{bloom}</V>
      <V c="g25-hb-shut" l={56} t={43} w={6} h={8} d={630}>{bud("#fff4d6")}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g25-sift" l={46 + i * 6} t={44} w={1.4} h={1.4} d={720 + i * 80} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   Registry. Every entry declares an anchor; every `sound` is an existing
   SigSoundKey. `source` is deliberately omitted throughout: these cards carry
   no removal diff of their own, so the play is the cast lead on the square the
   card was played on, exactly as the generated family resolved before.
   ========================================================================== */

/** Bind one bespoke scene to its config. */
function S(Render: SigPlugin["Render"], config: SigPlugin["config"]): SigPlugin {
  return { config, Render };
}

export const PLAYS: Record<string, SigPlugin> = {
  ov_royal_food_taster: S(TasterFoldsScene, { ordering: "radial", staggerMs: 60, victims: ["q", "p"], hasLead: true, sound: "coronation", anchor: "cast" }),
  ov_squires_ascension: S(RollCalledScene, { ordering: "file", staggerMs: 90, victims: ["p", "n"], hasLead: true, sound: "coronation", anchor: "cast" }),
  bn4_royal_taster: S(CupRoundScene, { ordering: "radial", staggerMs: 60, victims: ["q"], hasLead: true, sound: "coronation", anchor: "cast" }),
  hx4_food_taster: S(DishRefusedScene, { ordering: "octagon", staggerMs: 60, victims: ["q"], hasLead: true, sound: "shades", anchor: "cast" }),
  hx4_glass_ceiling: S(GlassCeilingScene, { ordering: "file", staggerMs: 80, victims: ["p"], hasLead: true, sound: "shades", anchor: "cast" }),
  hx4_iron_quota: S(IronQuotaScene, { ordering: "file", staggerMs: 80, victims: ["p", "r"], hasLead: true, sound: "slots", anchor: "cast" }),
  hx4_the_quarrel: S(QuarrelScene, { ordering: "radial", staggerMs: 70, victims: ["k", "q"], hasLead: true, sound: "shades", anchor: "cast" }),
  hx4_thistle_crown: S(ThistleCrownScene, { ordering: "octagon", staggerMs: 65, victims: ["k"], hasLead: true, sound: "cathedral", anchor: "cast" }),
  hx4_wilted_garland: S(WiltedGarlandScene, { ordering: "line", staggerMs: 70, victims: ["q"], hasLead: true, sound: "shades", anchor: "aim" }),
  ov_ivy_crown: S(IvyCrownScene, { ordering: "line", staggerMs: 60, victims: ["k"], hasLead: true, sound: "coronation", anchor: "aim" }),
  bn4_promotion_paperwork: S(PaperworkScene, { ordering: "file", staggerMs: 80, victims: ["p"], hasLead: true, sound: "slots", anchor: "cast" }),
  ov_counterfeit_crown: S(PlaceCardsScene, { ordering: "radial", staggerMs: 70, victims: ["k", "q"], hasLead: true, sound: "slots", anchor: "cast" }),
  bn4_royal_stroll: S(RoyalStrollScene, { ordering: "line", staggerMs: 70, victims: ["k"], hasLead: true, sound: "coronation", anchor: "aim" }),
  hx4_halo_of_the_crown: S(CurtainDrawnScene, { ordering: "octagon", staggerMs: 55, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast" }),
  hx4_sticky_floorboards: S(StickyFloorScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "snooze", anchor: "cast" }),
  hx4_tilted_crown: S(CurtsyScene, { ordering: "radial", staggerMs: 60, victims: ["q"], hasLead: true, sound: "snooze", anchor: "cast" }),
  op_crown_indemnity: S(BackingOutScene, { ordering: "line", staggerMs: 70, victims: ["p"], hasLead: true, sound: "cathedral", anchor: "aim" }),
  ov_velcro_gloves: S(VelcroGlovesScene, { ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "slots", anchor: "aim" }),
  bn4_paper_crown: S(FoolTumblesScene, { ordering: "radial", staggerMs: 55, victims: ["k"], hasLead: true, sound: "crownrain", anchor: "cast" }),
  op_hedgerow_buds: S(HedgerowBudsScene, { ordering: "file", staggerMs: 90, victims: ["p"], hasLead: true, sound: "snooze", anchor: "cast" }),
};
