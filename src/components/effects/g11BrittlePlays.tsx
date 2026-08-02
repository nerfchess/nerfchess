// g11BrittlePlays — bespoke plays for the 28 stasis / binding cards that used
// to share the generated `frostbloom` family (one crystal fan, 28 hue shifts).
//
// MODULE FICTION: BRITTLE THINGS AND HOW THEY GO. Never a snowflake, never a
// generic crystal fan. Every card is a different brittle OBJECT reaching the
// moment it stops being whole: a wine glass ringing itself apart, a windscreen
// crazing outward from one chip, a chandelier's drops chiming and stilling, a
// geode split open, a quartz vein running through stone, a mirror's silver
// crackling, an icicle snapping with the stump left clear, a frozen rope going
// like a glass rod, a lens fogging then starring, a bell cracking on its own
// note. Stasis is shown as the crack ARRIVING and then holding still, which is
// exactly what a freeze is: the thing intact and unusable at the same time.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g11BrittlePlays.css), transform/opacity animations only, no imports from
// BoardEffects.tsx, only the SigPlugin/SigRole TYPES from sigPlugins.tsx.
//
// STAGING. Every card declares anchor "cast" or "aim", so the break happens on
// the square the card was played on. Board-scale layers (the cold wash, the
// edge frost) live inside <BoardFrame>, never at a fixed percentage of the
// stage. Cards whose fiction runs along a line — dew beads on a wire, a
// glazier's score, jam smeared down a rank, a horseshoe caught mid gallop —
// use <AimStage> and author their art pointing RIGHT. A card that REACHES for
// named victims while its subject must stay upright (the puddle-freeze hand
// mirror) keeps the upright <Lead> and rotates one run-out layer only, via
// <Reach>.
//
// Every scene runs three beats — tell, strike, settle — in all three roles
// ("lead", "target", "entrance"): a hairline or a ring or a bead of tension
// first, the break, then shards and dust settling out. Every lead carries at
// least one animated layer driven by the geometry vars (--fx-ox/--fx-oy lean,
// --fx-side arrival, --fx-len run length), which is what makes the break point
// at where it happened. All CSS lives in g11BrittlePlays.css behind `g11-`.

import "./g11BrittlePlays.css";

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
const rootStyle = (d: number): CSSProperties => ({ "--g11-d": `${d}ms` }) as CSSProperties;

/** stagger + a beat offset, scaled by the Settings animation-speed var. */
const b = (ms: number): string => `calc(var(--g11-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

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

/** Cast-anchored lead: the break on the cast square, `frame` over the board. */
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

/**
 * ONE reaching layer inside a cast-anchored <Lead>.
 *
 * `fx-aim` is the same rotation <AimStage> applies internally, so art authored
 * pointing RIGHT is turned onto the real source -> target vector and can run
 * out to the victim by --fx-len. It is applied to a single layer rather than
 * by swapping the whole scene to <AimLead> because everything upright in the
 * scene — a hand mirror, a lantern, a bottle — would otherwise be laid on its
 * side. The rotation pivots on the stage centre, which IS the cast square, so
 * the run starts where the card was played. Only ONE of these per scene: a
 * second staging box would multiply the 14-cell canvas by 14 again.
 */
function Reach({ children }: { children: ReactNode }) {
  return (
    <span className="fx-aim absolute inset-0 block" aria-hidden="true">
      {children}
    </span>
  );
}

/** Board-wide cold wash, always inside a BoardFrame. */
function Wash({ tone, d = 0 }: { tone: string; d?: number }) {
  return <L c="g11-wash" d={d} st={{ background: `radial-gradient(circle at 50% 48%, ${tone}, transparent 70%)` }} />;
}

/** Frost creeping in from the board edge, always inside a BoardFrame. */
function Rim({ tone, d = 150 }: { tone: string; d?: number }) {
  return <L c="g11-rim" d={d} st={{ boxShadow: `inset 0 0 28px 8px ${tone}` }} />;
}

/* Piece silhouettes: the bystanders a brittle thing closes over. */
const PAWN = "M12 4.4a2.7 2.7 0 0 1 1.6 4.9l1.8 6.4H8.6l1.8-6.4A2.7 2.7 0 0 1 12 4.4z M7.4 16.8h9.2V19.4H7.4z";
const KING = "M11.1 2.4h1.8v1.5h1.5v1.8h-1.5v1.6h-1.8V5.7H9.6V3.9h1.5zM8 9.2h8l-1.1 7.4H9.1zM7.2 17.6h9.6V20H7.2z";
const KNIGHT = "M8.2 19V13c0-3.8 2.5-5.9 4.6-6.5L12 4.2l3 1.2c2 .9 2.9 2.9 2.9 5.9V19z";
const ROOK = "M7 4.8h2.3v1.6h1.6V4.8h2.2v1.6h1.6V4.8H17v3.6h-1.2v6.8H17V19H7v-3.8h1.2V8.4H7z";
const BISHOP = "M12 3.2c2.6 3 4.4 6.2 4.4 9.6V17H7.6v-4.2C7.6 9.4 9.4 6.2 12 3.2zM7 18.4h10V20.8H7z";

/* A hairline and a three-way fork. Reused, but every card scores them into a
   different surface at a different angle, which is the whole card. */
const HAIRLINE = "M1 12h22";
const FORK = "M1 12h9l5-4M10 12l5 4M15 8h7M15 16h6";
const STAR5 = "M12 12L4 5M12 12l8-6M12 12l-7 8M12 12l7 7M12 12l-8 2";

/* =============================================================================
   1. Cold Snap (t4) — THE WINE GLASS RINGING ITSELF APART
   A wet fingertip rides the rim, the note climbs until the bowl cannot hold it
   any more, and the glass bursts into a ring of shards that stop where they
   stop. Palette: #a8dced / #fff3dd / #10222e.
   ========================================================================== */
const CS_BOWL = "M6.4 2.6h11.2l-1.1 6.6a4.8 4.8 0 0 1-9 0zM12 13.6v6M8.6 19.8h6.8";

function ColdSnapScene({ role, delayMs }: SceneProps) {
  const goblet = (
    <g fill="none" stroke="#a8dced" strokeWidth="1.4" {...SJ}>
      <path d={CS_BOWL} />
      <path d="M7.6 6.2h8.8" stroke="#fff3dd" strokeWidth="0.9" />
    </g>
  );
  const shard = <path d="M12 2l4 7-4 5-4-5z" fill="#a8dced" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-ent-rise" l={26} t={12} w={48} h={70} d={40}>{goblet}</V>
        <L c="g11-cs-tone" l={16} t={16} w={68} h={68} d={240} st={{ borderRadius: "50%", border: "2px solid #fff3dd" }} />
        <V c="g11-ent-pop" l={54} t={22} w={26} h={26} d={430}>{shard}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hitside" l={28} t={10} w={44} h={72} d={0}>{goblet}</V>
        <L c="g11-hit2" l={22} t={22} w={56} h={56} d={130} st={{ borderRadius: "50%", border: "2px solid #fff3dd" }} />
        <V c="g11-hit" l={38} t={34} w={24} h={24} d={250}>{shard}</V>
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(168,220,237,0.3)" />
          <Rim tone="rgba(255,243,221,0.34)" />
        </>
      }
    >
      <L c="g11-cs-wet" l={45.4} t={37} w={2.2} h={2.2} d={90} st={{ borderRadius: "50%", background: "#fff3dd" }} />
      <V c="g11-cs-sing" l={43} t={36} w={14} h={24} d={200}>{goblet}</V>
      <L c="g11-cs-tone" l={40} t={33} w={20} h={20} d={380} st={{ borderRadius: "50%", border: "2px solid #fff3dd" }} />
      <L c="g11-cs-tone" l={37} t={30} w={26} h={26} d={470} st={{ borderRadius: "50%", border: "1px solid #a8dced" }} />
      {[0, 1, 2, 3].map((i) => (
        <P key={i} l={44} t={35} w={12} h={12} rot={`${i * 90 + 24}deg`}>
          <V c="g11-shard" w={100} h={100} d={560 + i * 60}>{shard}</V>
        </P>
      ))}
      <L c="g11-lean" l={43} t={56} w={14} h={3} d={620} st={{ borderRadius: "999px", background: "rgba(16,34,46,0.7)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-mote" l={43 + i * 6} t={46} w={1.4} h={1.4} d={700 + i * 90} st={{ borderRadius: "50%", background: "#fff3dd" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   2. Bounty Posted (t4) — THE TALLY PLATE AND THE CRACK THAT JUMPS
   A coin is driven into an etched glass tally plate; the plate stars around
   the strike, and then the crack LEAPS the gap to the next plate along, which
   is what a posted bounty does. Palette: #e8c07a / #fff4d6 / #2c2011.
   ========================================================================== */
function BountyPostedScene({ role, delayMs }: SceneProps) {
  const plate = (
    <g {...SJ}>
      <rect x="2.5" y="3.5" width="19" height="17" fill="rgba(44,32,17,0.5)" stroke="#e8c07a" strokeWidth="1.3" />
      <path d="M6 8.5h5M6 12h9M6 15.5h7" stroke="#e8c07a" strokeWidth="1" />
    </g>
  );
  const coin = <circle cx="12" cy="12" r="6.4" fill="#e8c07a" stroke="#2c2011" strokeWidth="1.4" />;
  const star = <path d={STAR5} stroke="#fff4d6" strokeWidth="1.4" fill="none" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-ent-drop" l={12} t={16} w={54} h={60} d={40}>{plate}</V>
        <V c="g11-bp-coin" l={48} t={26} w={30} h={30} d={240}>{coin}</V>
        <V c="g11-ent-pop" l={30} t={30} w={44} h={44} d={430}>{star}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hitside" l={14} t={16} w={56} h={56} d={0}>{plate}</V>
        <V c="g11-hit" l={44} t={34} w={30} h={30} d={130}>{coin}</V>
        <V c="g11-hit2" l={24} t={24} w={52} h={52} d={250}>{star}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(232,192,122,0.26)" />}>
      <V c="g11-bp-plate" l={36} t={38} w={16} h={16} d={90}>{plate}</V>
      <V c="g11-bp-coin" l={40.5} t={41} w={7} h={7} d={240}>{coin}</V>
      <V c="g11-bp-star" l={35} t={37} w={18} h={18} d={400}>{star}</V>
      <L c="g11-runout" l={51} t={45.4} w={12} h={1.6} d={520} st={{ transformOrigin: "0% 50%", background: "linear-gradient(90deg, #fff4d6, rgba(232,192,122,0))" }} />
      <V c="g11-bp-jump" l={57} t={40} w={11} h={11} d={640}>{plate}</V>
      <L c="g11-lean" l={38} t={54} w={16} h={3} d={680} st={{ borderRadius: "999px", background: "rgba(44,32,17,0.66)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-dust" l={40 + i * 7} t={50} w={1.5} h={1.5} d={740 + i * 90} st={{ borderRadius: "50%", background: "#e8c07a" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   3. Caught Mid Stride (t4) — THE WINDSCREEN CRAZING FROM ONE CHIP
   A stone pit appears and does nothing at all for a moment, then the craze
   runs out in forks and stops dead halfway. Aim-staged: the chip arrives from
   the direction of the play. Palette: #b9c8de / #fff3dc / #141c28.
   ========================================================================== */
function CaughtMidStrideScene({ role, delayMs }: SceneProps) {
  const pit = (
    <g>
      <circle cx="12" cy="12" r="3.4" fill="#fff3dc" />
      <circle cx="12" cy="12" r="6.2" fill="none" stroke="#b9c8de" strokeWidth="1.2" />
    </g>
  );
  const craze = <path d={FORK} fill="none" stroke="#b9c8de" strokeWidth="1.3" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-ent-pop" l={32} t={32} w={36} h={36} d={40}>{pit}</V>
        <V c="g11-cm-fork" l={6} t={26} w={88} h={48} d={240}>{craze}</V>
        <L c="g11-ent-tilt" l={18} t={18} w={64} h={64} d={430} st={{ border: "1px solid #b9c8de" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hit" l={34} t={34} w={32} h={32} d={0}>{pit}</V>
        <V c="g11-hitside" l={8} t={28} w={84} h={44} d={130}>{craze}</V>
        <L c="g11-hit2" l={26} t={26} w={48} h={48} d={250} st={{ border: "1px solid #fff3dc" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(185,200,222,0.28)" />}>
      <L c="g11-cm-sheet" l={34} t={34} w={32} h={32} d={80} st={{ background: "linear-gradient(126deg, rgba(185,200,222,0.24), rgba(20,28,40,0.34))" }} />
      <V c="g11-cm-chip" l={45.5} t={45.5} w={9} h={9} d={220}>{pit}</V>
      <V c="g11-cm-fork" l={44} t={40} w={26} h={20} d={400}>{craze}</V>
      <V c="g11-cm-fork" l={30} t={41} w={22} h={18} d={480} st={{ rotate: "180deg" }}>{craze}</V>
      <L c="g11-runout" l={49} t={49.2} w={16} h={1.4} d={560} st={{ transformOrigin: "0% 50%", background: "linear-gradient(90deg, #fff3dc, rgba(185,200,222,0))" }} />
      <L c="g11-cm-halt" l={41} t={41} w={18} h={18} d={680} st={{ border: "2px solid #fff3dc" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-dust" l={46 + i * 5} t={52} w={1.4} h={1.4} d={760 + i * 90} st={{ borderRadius: "50%", background: "#b9c8de" }} />
      ))}
    </AimLead>
  );
}

/* =============================================================================
   4. Creaking Gallows (t4) — THE FROZEN ROPE GOES LIKE A GLASS ROD
   The rope hangs stiff and glassy and creaks through a small swing twice; on
   the third it does not stretch, it snaps, and both ends ring.
   Palette: #cfd6c2 / #fff3d8 / #241f14.
   ========================================================================== */
function CreakingGallowsScene({ role, delayMs }: SceneProps) {
  const rope = (
    <g fill="none" stroke="#cfd6c2" strokeWidth="1.6" {...SJ}>
      <path d="M12 1v14" />
      <path d="M12 15a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z" strokeWidth="1.4" />
      <path d="M9.4 5.4h5.2M9.4 9h5.2" stroke="#fff3d8" strokeWidth="0.9" />
    </g>
  );
  const stub = <path d="M12 2l5 9-5 11-5-11z" fill="#cfd6c2" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-cg-creak" l={30} t={6} w={40} h={80} d={40} st={{ transformOrigin: "50% 0%" }}>{rope}</V>
        <L c="g11-cg-hair" l={26} t={44} w={48} h={2} d={240} st={{ background: "#fff3d8", transformOrigin: "0% 50%" }} />
        <V c="g11-ent-pop" l={20} t={56} w={26} h={26} d={430}>{stub}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hitside" l={30} t={4} w={40} h={80} d={0}>{rope}</V>
        <L c="g11-hit2" l={22} t={46} w={56} h={2.4} d={130} st={{ background: "#fff3d8", transformOrigin: "0% 50%" }} />
        <V c="g11-hit" l={36} t={52} w={28} h={28} d={250}>{stub}</V>
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(207,214,194,0.24)" />
          <Rim tone="rgba(255,243,216,0.28)" />
        </>
      }
    >
      <V c="g11-cg-beam" l={38} t={30} w={24} h={5} d={80} par="none" vb="0 0 40 8">
        <path d="M1 3h38" stroke="#cfd6c2" strokeWidth="3" {...SJ} />
      </V>
      <V c="g11-cg-creak" l={44} t={33} w={12} h={22} d={210} st={{ transformOrigin: "50% 0%" }}>{rope}</V>
      <L c="g11-cg-hair" l={45} t={42.6} w={10} h={1.2} d={400} st={{ background: "#fff3d8", transformOrigin: "0% 50%" }} />
      <V c="g11-cg-snap" l={44} t={43} w={12} h={13} d={540}>
        <path d="M12 1v9M12 12.4a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z" fill="none" stroke="#cfd6c2" strokeWidth="1.5" {...SJ} />
      </V>
      <L c="g11-lean" l={43} t={57} w={14} h={3} d={620} st={{ borderRadius: "999px", background: "rgba(36,31,20,0.7)" }} />
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g11-mote" l={42 + i * 5} t={48} w={1.5} h={1.5} d={700 + i * 80} st={{ borderRadius: "50%", background: "#fff3d8" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   5. Pawnbroker's Lien (t4) — THE DISPLAY CASE LATCHES OVER THE COLLATERAL
   A pawnshop case drops around the pawn, the latch throws, a ticket swings on
   its wire, and the front pane goes to crackled opal, so the piece is visible
   and gone at once. Palette: #d8b98a / #fff4d6 / #2a1e10.
   ========================================================================== */
function PawnbrokersLienScene({ role, delayMs }: SceneProps) {
  const glassCase = (
    <g {...SJ}>
      <rect x="3" y="4" width="18" height="16" fill="rgba(42,30,16,0.4)" stroke="#d8b98a" strokeWidth="1.4" />
      <path d="M3 8h18" stroke="#d8b98a" strokeWidth="1" />
    </g>
  );
  const ticket = (
    <g {...SJ}>
      <path d="M12 1v6" stroke="#d8b98a" strokeWidth="1.1" />
      <path d="M6.4 7.4h11.2v9H6.4z" fill="#fff4d6" stroke="#2a1e10" strokeWidth="1" />
      <path d="M8.6 11h6.8M8.6 13.6h4.6" stroke="#2a1e10" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-ent-drop" l={14} t={16} w={62} h={58} d={40}>{glassCase}</V>
        <V c="g11-pl-tag" l={54} t={30} w={34} h={48} d={240} st={{ transformOrigin: "50% 0%" }}>{ticket}</V>
        <L c="g11-pl-opal" l={18} t={26} w={54} h={44} d={430} st={{ background: "linear-gradient(140deg, rgba(216,185,138,0.6), rgba(255,244,214,0.2))" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hitside" l={16} t={18} w={62} h={58} d={0}>{glassCase}</V>
        <V c="g11-hit" l={36} t={36} w={30} h={40} d={130}><path d={PAWN} fill="#d8b98a" /></V>
        <L c="g11-hit2" l={20} t={26} w={56} h={44} d={250} st={{ background: "rgba(255,244,214,0.5)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(216,185,138,0.26)" />}>
      <V c="g11-pl-piece" l={45.5} t={44} w={9} h={12} d={90}><path d={PAWN} fill="none" stroke="#fff4d6" strokeWidth="1.4" {...SJ} /></V>
      <V c="g11-pl-case" l={42} t={38} w={16} h={20} d={230}>{glassCase}</V>
      <V c="g11-pl-latch" l={49} t={45} w={5} h={5} d={420}>
        <path d="M5 12h14M9 8v8" stroke="#fff4d6" strokeWidth="2.4" {...SJ} />
      </V>
      <V c="g11-pl-tag" l={55} t={40} w={7} h={11} d={540} st={{ transformOrigin: "50% 0%" }}>{ticket}</V>
      <L c="g11-pl-opal" l={42.5} t={39} w={15} h={18} d={640} st={{ background: "linear-gradient(140deg, rgba(216,185,138,0.7), rgba(255,244,214,0.24))" }} />
      <L c="g11-lean" l={41} t={58} w={18} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(42,30,16,0.68)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-dust" l={43 + i * 6} t={53} w={1.4} h={1.4} d={760 + i * 90} st={{ borderRadius: "50%", background: "#d8b98a" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   6. Sagging Shelves (t4) — THE GLASS SHELF BOWS, THEN STARS
   A long glass shelf with two officers still standing on it sags under its own
   weight, a hairline walks the whole length, and it stars at the middle
   without ever coming down. Palette: #96d8c4 / #fff3da / #10302a.
   ========================================================================== */
function SaggingShelvesScene({ role, delayMs }: SceneProps) {
  const shelf = (
    <g {...SJ}>
      <path d="M1 4h38v3H1z" fill="rgba(150,216,196,0.5)" stroke="#96d8c4" strokeWidth="1" />
      <path d="M4 7v3M36 7v3" stroke="#96d8c4" strokeWidth="1" />
    </g>
  );
  const star = <path d="M12 12L4 6M12 12l8-5M12 12l-6 8M12 12l7 7" stroke="#fff3da" strokeWidth="1.5" fill="none" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-ss-bow" l={4} t={46} w={92} h={26} d={40} par="none" vb="0 0 40 12">{shelf}</V>
        <V c="g11-ent-rise" l={20} t={12} w={26} h={40} d={240}><path d={KNIGHT} fill="#96d8c4" /></V>
        <L c="g11-ss-hair" l={6} t={52} w={88} h={2} d={430} st={{ background: "#fff3da", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hitside" l={22} t={12} w={40} h={52} d={0}><path d={KNIGHT} fill="#96d8c4" /></V>
        <L c="g11-hit2" l={8} t={62} w={84} h={3} d={130} st={{ background: "#fff3da" }} />
        <V c="g11-hit" l={38} t={54} w={26} h={26} d={250}>{star}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(150,216,196,0.26)" />}>
      <V c="g11-ss-bow" l={32} t={46} w={36} h={9} d={90} par="none" vb="0 0 40 12">{shelf}</V>
      <V c="g11-ss-load" l={38} t={38} w={8} h={10} d={230}><path d={KNIGHT} fill="none" stroke="#fff3da" strokeWidth="1.4" {...SJ} /></V>
      <V c="g11-ss-load" l={53} t={38} w={8} h={10} d={330}><path d={BISHOP} fill="none" stroke="#fff3da" strokeWidth="1.4" {...SJ} /></V>
      <L c="g11-ss-hair" l={33} t={49.4} w={34} h={1.2} d={470} st={{ background: "#fff3da", transformOrigin: "0% 50%" }} />
      <V c="g11-ss-star" l={44} t={44} w={13} h={13} d={620}>{star}</V>
      <L c="g11-lean" l={40} t={57} w={20} h={3} d={680} st={{ borderRadius: "999px", background: "rgba(16,48,42,0.7)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-dust" l={44 + i * 6} t={53} w={1.4} h={1.4} d={740 + i * 90} st={{ borderRadius: "50%", background: "#96d8c4" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   7. Second Frost (t4) — THE GEODE SPLIT OPEN
   A dull grey ball takes the chisel, the halves part, and a SECOND generation
   of crystal blooms inside the first: the cold doubling down exactly where it
   already was. Palette: #b9a8e4 / #fff2e2 / #1e1832.
   ========================================================================== */
function SecondFrostScene({ role, delayMs }: SceneProps) {
  const half = (flip: boolean) => (
    <g {...SJ} style={flip ? { transform: "scaleX(-1)", transformOrigin: "50% 50%" } : undefined}>
      <path d="M20 2.4A10.4 10.4 0 0 0 20 21.6c-6.4-2.4-10-6-10-9.6s3.6-7.2 10-9.6z" fill="#1e1832" stroke="#b9a8e4" strokeWidth="1.3" />
      <path d="M18 5.6c-3.6 1.6-5.6 3.8-5.6 6.4s2 4.8 5.6 6.4" fill="none" stroke="#fff2e2" strokeWidth="0.9" />
    </g>
  );
  const spike = <path d="M12 2l3 8-3 12-3-12z" fill="#b9a8e4" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-sf-part" l={4} t={20} w={44} h={60} d={40}>{half(false)}</V>
        <V c="g11-sf-part2" l={52} t={20} w={44} h={60} d={40}>{half(true)}</V>
        <V c="g11-ent-pop" l={36} t={26} w={28} h={48} d={300}>{spike}</V>
        <L c="g11-glint" l={44} t={40} w={12} h={12} d={480} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,226,0.85), transparent 68%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hitside" l={10} t={20} w={40} h={58} d={0}>{half(false)}</V>
        <V c="g11-hit" l={40} t={22} w={22} h={54} d={130}>{spike}</V>
        <L c="g11-hit2" l={30} t={34} w={40} h={40} d={250} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,226,0.8), transparent 66%)" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(185,168,228,0.3)" />
          <Rim tone="rgba(255,242,226,0.3)" />
        </>
      }
    >
      <V c="g11-sf-chisel" l={46} t={26} w={8} h={14} d={90}>
        <path d="M12 1v14l-3 6h6l-3-6z" fill="#fff2e2" stroke="#1e1832" strokeWidth="1.1" {...SJ} />
      </V>
      <V c="g11-sf-part" l={38} t={40} w={12} h={16} d={260}>{half(false)}</V>
      <V c="g11-sf-part2" l={50} t={40} w={12} h={16} d={260}>{half(true)}</V>
      {[0, 1, 2, 3].map((i) => (
        <P key={i} l={45} t={41} w={10} h={14} rot={`${-36 + i * 24}deg`}>
          <V c="g11-sf-grow" w={100} h={100} d={430 + i * 70}>{spike}</V>
        </P>
      ))}
      <V c="g11-sf-inner" l={46.5} t={44} w={7} h={9} d={660}>{spike}</V>
      <L c="g11-lean" l={43} t={57} w={14} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(30,24,50,0.7)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-mote" l={44 + i * 5} t={49} w={1.4} h={1.4} d={760 + i * 90} st={{ borderRadius: "50%", background: "#fff2e2" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   8. Glass of Water (t3) — THE TUMBLER RIGHTED, THE CRACK RETREATING
   The one card here where the brittle thing UN-breaks: a crack retreats back
   down the tumbler, the water line climbs after it, and one bubble goes up and
   lets go. Palette: #a6dbe8 / #fff3dd / #123038.
   ========================================================================== */
function GlassOfWaterScene({ role, delayMs }: SceneProps) {
  const tumbler = (
    <g fill="none" stroke="#a6dbe8" strokeWidth="1.4" {...SJ}>
      <path d="M6.6 3h10.8l-1.4 18H8z" />
      <path d="M7.4 8.4h9.2" stroke="#fff3dd" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-ent-rise" l={28} t={10} w={44} h={72} d={40}>{tumbler}</V>
        <L c="g11-gw-fill" l={34} t={44} w={32} h={30} d={240} st={{ background: "rgba(166,219,232,0.6)", transformOrigin: "50% 100%" }} />
        <L c="g11-gw-bubble" l={48} t={44} w={5} h={5} d={430} st={{ borderRadius: "50%", background: "#fff3dd" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hitside" l={30} t={10} w={40} h={72} d={0}>{tumbler}</V>
        <L c="g11-hit2" l={36} t={46} w={28} h={28} d={130} st={{ background: "rgba(166,219,232,0.6)", transformOrigin: "50% 100%" }} />
        <L c="g11-hit" l={46} t={40} w={8} h={8} d={250} st={{ borderRadius: "50%", background: "#fff3dd" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(166,219,232,0.26)" />}>
      <L c="g11-gw-heal" l={47} t={38} w={1.4} h={16} d={90} st={{ background: "#fff3dd", transformOrigin: "50% 0%" }} />
      <V c="g11-gw-glass" l={44} t={38} w={12} h={19} d={230}>{tumbler}</V>
      <L c="g11-gw-fill" l={45.2} t={45} w={9.6} h={10} d={400} st={{ background: "rgba(166,219,232,0.62)", transformOrigin: "50% 100%" }} />
      <L c="g11-gw-bubble" l={49} t={46} w={1.8} h={1.8} d={540} st={{ borderRadius: "50%", background: "#fff3dd" }} />
      <L c="g11-tiltin" l={44} t={44} w={12} h={2} d={620} st={{ background: "linear-gradient(90deg, transparent, rgba(255,243,221,0.9), transparent)" }} />
      <L c="g11-lean" l={44} t={57} w={12} h={3} d={680} st={{ borderRadius: "999px", background: "rgba(18,48,56,0.66)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-mote" l={45 + i * 5} t={40} w={1.3} h={1.3} d={740 + i * 90} st={{ borderRadius: "50%", background: "#a6dbe8" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   9. Kettle On (t3) — THE FROSTED PADLOCK SHATTERS OFF ITS CHAIN
   Everything being held lets go at once: a padlock gone white with frost takes
   one knock, its shackle parts like sugar, and the chain drops link by link.
   Palette: #cfe4ee / #fff4d6 / #16262e.
   ========================================================================== */
function KettleOnScene({ role, delayMs }: SceneProps) {
  const padlock = (
    <g {...SJ}>
      <path d="M7.6 10V7.4a4.4 4.4 0 0 1 8.8 0V10" fill="none" stroke="#cfe4ee" strokeWidth="1.8" />
      <rect x="4.6" y="10" width="14.8" height="11" fill="#16262e" stroke="#cfe4ee" strokeWidth="1.3" />
      <circle cx="12" cy="15.4" r="1.8" fill="#fff4d6" />
    </g>
  );
  const link = <ellipse cx="12" cy="12" rx="4.6" ry="7.6" fill="none" stroke="#cfe4ee" strokeWidth="2" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-ent-drop" l={26} t={14} w={48} h={56} d={40}>{padlock}</V>
        <V c="g11-ko-link" l={8} t={54} w={26} h={34} d={240}>{link}</V>
        <V c="g11-ko-link" l={62} t={56} w={26} h={34} d={380}>{link}</V>
        <L c="g11-ent-pop" l={30} t={26} w={40} h={40} d={470} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hitside" l={26} t={16} w={48} h={54} d={0}>{padlock}</V>
        <L c="g11-hit2" l={28} t={26} w={44} h={44} d={130} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
        <V c="g11-hit" l={38} t={54} w={24} h={30} d={250}>{link}</V>
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(207,228,238,0.26)" />
          <Rim tone="rgba(255,244,214,0.3)" />
        </>
      }
    >
      <V c="g11-ko-lock" l={44} t={38} w={12} h={16} d={90}>{padlock}</V>
      <V c="g11-ko-knock" l={39} t={34} w={9} h={9} d={230}>
        <path d="M4 20L20 4M14 4h6v6" stroke="#fff4d6" strokeWidth="2" fill="none" {...SJ} />
      </V>
      <V c="g11-ko-shackle" l={45} t={35} w={10} h={8} d={410}>
        <path d="M4 20V8a8 8 0 0 1 16 0v12" fill="none" stroke="#cfe4ee" strokeWidth="2.2" {...SJ} />
      </V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g11-ko-link" l={40 + i * 8} t={49} w={5} h={7} d={520 + i * 90}>{link}</V>
      ))}
      <L c="g11-sidein" l={43} t={44} w={14} h={2} d={640} st={{ background: "linear-gradient(90deg, transparent, rgba(255,244,214,0.9), transparent)" }} />
      <L c="g11-lean" l={42} t={58} w={16} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(22,38,46,0.68)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-mote" l={44 + i * 5} t={53} w={1.4} h={1.4} d={760 + i * 90} st={{ borderRadius: "50%", background: "#cfe4ee" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   10. Puddle Freeze (t3) — THE MIRROR'S SILVER CRACKLING
   A hand mirror; the silvering behind the glass blooms black crackle from two
   points, two hairlines run out to meet, and the reflection locks half a beat
   after the face does. Palette: #b7c6e0 / #fff2de / #171b2a.

   AIM. The card names its two victims ("two enemy pawns of your choice"), so
   the lead reaches for them: a hairline leaves the cast square and runs out by
   --fx-len inside <Reach>, which carries the --fx-ang rotation alone. The
   mirror stays in the upright <Lead> stage — a hand mirror rotated onto the
   attack vector would lie on its side — and the wash stays inside
   <BoardFrame>, so it remains exactly the board at any anchor.
   ========================================================================== */
function PuddleFreezeScene({ role, delayMs }: SceneProps) {
  const mirror = (
    <g {...SJ}>
      <ellipse cx="12" cy="9.4" rx="7.4" ry="7.8" fill="rgba(183,198,224,0.35)" stroke="#b7c6e0" strokeWidth="1.4" />
      <path d="M12 17.2v5.2M9.4 22.4h5.2" stroke="#b7c6e0" strokeWidth="1.4" />
      <path d="M8.6 6.4c1.4-1.6 3-2.4 4.8-2.4" fill="none" stroke="#fff2de" strokeWidth="1" />
    </g>
  );
  const hair = <path d={HAIRLINE} stroke="#fff2de" strokeWidth="1.4" fill="none" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-ent-rise" l={22} t={8} w={56} h={78} d={40}>{mirror}</V>
        <L c="g11-pf-tarnish" l={34} t={20} w={20} h={20} d={240} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(23,27,42,0.9), transparent 70%)" }} />
        <V c="g11-pf-hair" l={26} t={22} w={48} h={34} d={430}>{hair}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hitside" l={24} t={8} w={52} h={76} d={0}>{mirror}</V>
        <L c="g11-hit2" l={34} t={18} w={26} h={26} d={130} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(23,27,42,0.9), transparent 68%)" }} />
        <V c="g11-hit" l={22} t={22} w={56} h={30} d={250}>{hair}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(183,198,224,0.28)" />}>
      <Reach>
        <L c="g11-runout" l={50} t={49.3} w={24} h={1.4} d={60} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #fff2de, rgba(255,242,222,0))", transformOrigin: "0% 50%" }} />
      </Reach>
      <V c="g11-pf-glass" l={43} t={36} w={14} h={22} d={90}>{mirror}</V>
      {[0, 1].map((i) => (
        <L key={i} c="g11-pf-tarnish" l={45 + i * 6} t={39 + i * 3} w={5} h={5} d={230 + i * 120} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(23,27,42,0.92), transparent 70%)" }} />
      ))}
      <V c="g11-pf-hair" l={43} t={40} w={14} h={6} d={450}>{hair}</V>
      <V c="g11-pf-hair" l={43} t={44} w={14} h={6} d={540} st={{ rotate: "18deg" }}>{hair}</V>
      <L c="g11-tiltin" l={44} t={38} w={12} h={12} d={640} st={{ background: "linear-gradient(120deg, transparent, rgba(255,242,222,0.7), transparent)" }} />
      <L c="g11-lean" l={43} t={58} w={14} h={3} d={690} st={{ borderRadius: "999px", background: "rgba(23,27,42,0.7)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-dust" l={44 + i * 6} t={52} w={1.4} h={1.4} d={750 + i * 90} st={{ borderRadius: "50%", background: "#b7c6e0" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   11. Carrion Crows (t3) — THE LEADED BIRD-PANE BURSTS INWARD
   A window of glass crows takes a strike from OUTSIDE: the lead cames buckle,
   the birds break loose one whole piece each and hang in the air where the
   flock would be. Palette: #8c9bb0 / #fff3dc / #121722.
   ========================================================================== */
const CC_BIRD = "M2 13.6c4.4 1.4 7.6-.8 9.6-5.2 1.2 3.6 4.4 5.2 9.6 4.2-3.2 4.4-8.4 7.2-13.4 6-3.2-.8-5.6-2.4-5.8-5z";

function CarrionCrowsScene({ role, delayMs }: SceneProps) {
  const pane = (
    <g {...SJ}>
      <path d="M4 21V9a8 8 0 0 1 16 0v12z" fill="rgba(140,155,176,0.28)" stroke="#8c9bb0" strokeWidth="1.4" />
      <path d="M12 2.2V21M4.6 12h14.8" stroke="#8c9bb0" strokeWidth="1.2" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-ent-rise" l={24} t={10} w={52} h={74} d={40}>{pane}</V>
        <V c="g11-cc-fly" l={10} t={30} w={40} h={30} d={280}><path d={CC_BIRD} fill="#121722" /></V>
        <V c="g11-cc-fly" l={52} t={38} w={36} h={28} d={430}><path d={CC_BIRD} fill="#8c9bb0" /></V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hitside" l={26} t={10} w={48} h={72} d={0}>{pane}</V>
        <V c="g11-hit" l={20} t={32} w={40} h={30} d={130}><path d={CC_BIRD} fill="#121722" /></V>
        <L c="g11-hit2" l={38} t={38} w={24} h={24} d={250} st={{ borderRadius: "50%", border: "2px solid #fff3dc" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(140,155,176,0.28)" />
          <Rim tone="rgba(255,243,220,0.26)" />
        </>
      }
    >
      <V c="g11-cc-pane" l={43} t={34} w={14} h={22} d={90}>{pane}</V>
      <L c="g11-cc-strike" l={47} t={40} w={6} h={6} d={250} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,220,0.95), transparent 68%)" }} />
      <V c="g11-cc-came" l={43} t={34} w={14} h={22} d={380}>
        <path d="M12 2.2V21M4.6 12h14.8M7 5.4L17 18" stroke="#fff3dc" strokeWidth="1.1" fill="none" {...SJ} />
      </V>
      {[0, 1, 2].map((i) => (
        <V key={i} c="g11-cc-fly" l={38 + i * 9} t={40 - i * 3} w={9} h={7} d={470 + i * 100}>
          <path d={CC_BIRD} fill={i === 1 ? "#8c9bb0" : "#121722"} />
        </V>
      ))}
      <L c="g11-lean" l={42} t={58} w={16} h={3} d={680} st={{ borderRadius: "999px", background: "rgba(18,23,34,0.7)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-shard" l={44 + i * 5} t={48} w={1.6} h={2.4} d={730 + i * 90} st={{ background: "#8c9bb0" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   12. Heavy Dew (t3) — THE BEADS ON THE WIRE GO SOLID
   A wire pulled taut across the forward camp beads with dew; each bead sets to
   glass in turn along the run and the wire stops moving. Aim-staged, so the
   run is the play's own leg. Palette: #a9d9d0 / #fff3da / #10302c.
   ========================================================================== */
function HeavyDewScene({ role, delayMs }: SceneProps) {
  const bead = <circle cx="12" cy="12" r="7.4" fill="rgba(169,217,208,0.6)" stroke="#fff3da" strokeWidth="1.4" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g11-hd-wire" l={4} t={48} w={92} h={2} d={40} st={{ background: "#a9d9d0", transformOrigin: "0% 50%" }} />
        <V c="g11-hd-set" l={18} t={32} w={26} h={26} d={240}>{bead}</V>
        <V c="g11-hd-set" l={52} t={34} w={24} h={24} d={430}>{bead}</V>
        <L c="g11-glint" l={40} t={20} w={16} h={16} d={560} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,218,0.85), transparent 68%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g11-hit2" l={6} t={50} w={88} h={2.4} d={0} st={{ background: "#a9d9d0", transformOrigin: "0% 50%" }} />
        <V c="g11-hitside" l={30} t={26} w={40} h={40} d={130}>{bead}</V>
        <L c="g11-hit" l={40} t={36} w={20} h={20} d={250} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,218,0.9), transparent 66%)" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(169,217,208,0.26)" />}>
      <L c="g11-hd-wire" l={45} t={49.4} w={26} h={1.2} d={90} st={{ background: "#a9d9d0", transformOrigin: "0% 50%" }} />
      <L c="g11-runout" l={45} t={48} w={22} h={4} d={230} st={{ transformOrigin: "0% 50%", background: "linear-gradient(90deg, rgba(255,243,218,0.7), transparent)" }} />
      {[0, 1, 2, 3].map((i) => (
        <V key={i} c="g11-hd-set" l={46 + i * 5.4} t={47} w={4.6} h={4.6} d={380 + i * 90}>{bead}</V>
      ))}
      <L c="g11-hd-taut" l={44} t={47} w={28} h={5} d={660} st={{ background: "linear-gradient(90deg, transparent, rgba(255,243,218,0.55), transparent)" }} />
      <L c="g11-lean" l={43} t={56} w={16} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(16,48,44,0.66)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-mote" l={47 + i * 6} t={52} w={1.4} h={1.4} d={760 + i * 90} st={{ borderRadius: "50%", background: "#fff3da" }} />
      ))}
    </AimLead>
  );
}

/* =============================================================================
   13. Jam on the Row (t3) — THE PRESERVE JAR GOES OVER
   The jar tips, the base ring cracks off in one clean disc, and what comes out
   sets to a hard glassy smear the length of the rank. Aim-staged: the smear
   runs the play's own leg. Palette: #e08aa0 / #fff2e0 / #33131e.
   ========================================================================== */
function JamOnTheRowScene({ role, delayMs }: SceneProps) {
  const jar = (
    <g {...SJ}>
      <path d="M7.4 5h9.2v14a2 2 0 0 1-2 2H9.4a2 2 0 0 1-2-2z" fill="rgba(224,138,160,0.45)" stroke="#e08aa0" strokeWidth="1.3" />
      <path d="M6.6 2.6h10.8V5H6.6z" fill="#fff2e0" stroke="#33131e" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-jr-tip" l={28} t={10} w={44} h={64} d={40} st={{ transformOrigin: "50% 100%" }}>{jar}</V>
        <L c="g11-jr-smear" l={8} t={70} w={84} h={9} d={280} st={{ background: "linear-gradient(90deg, #e08aa0, rgba(224,138,160,0))", transformOrigin: "0% 50%" }} />
        <L c="g11-ent-pop" l={30} t={62} w={40} h={12} d={470} st={{ borderRadius: "999px", border: "2px solid #fff2e0" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hitside" l={30} t={10} w={40} h={62} d={0}>{jar}</V>
        <L c="g11-hit2" l={12} t={70} w={76} h={7} d={130} st={{ background: "linear-gradient(90deg, #e08aa0, rgba(224,138,160,0))", transformOrigin: "0% 50%" }} />
        <L c="g11-hit" l={34} t={62} w={32} h={12} d={250} st={{ borderRadius: "999px", border: "2px solid #fff2e0" }} />
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(224,138,160,0.26)" />}>
      <V c="g11-jr-tip" l={43} t={35} w={12} h={17} d={90} st={{ transformOrigin: "50% 100%" }}>{jar}</V>
      <L c="g11-jr-ring" l={43} t={50} w={12} h={4} d={280} st={{ borderRadius: "999px", border: "2px solid #fff2e0" }} />
      <L c="g11-runout" l={48} t={51} w={22} h={2.6} d={420} st={{ transformOrigin: "0% 50%", background: "linear-gradient(90deg, #fff2e0, rgba(224,138,160,0))" }} />
      <L c="g11-jr-smear" l={48} t={49.5} w={24} h={5} d={520} st={{ background: "linear-gradient(90deg, rgba(224,138,160,0.9), rgba(224,138,160,0))", transformOrigin: "0% 50%" }} />
      <L c="g11-jr-set" l={49} t={49} w={22} h={6} d={660} st={{ background: "linear-gradient(90deg, transparent, rgba(255,242,224,0.6), transparent)" }} />
      <L c="g11-lean" l={43} t={57} w={16} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(51,19,30,0.68)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-shard" l={50 + i * 6} t={53} w={1.6} h={2.2} d={760 + i * 90} st={{ background: "#e08aa0" }} />
      ))}
    </AimLead>
  );
}

/* =============================================================================
   14. The Ides (t3) — THE BELL CRACKS ON ITS OWN NOTE
   The bell swings, tolls, swings again, and on the appointed stroke the crack
   opens up its lip from the rim and the note dies flat in the air.
   Palette: #d2b463 / #fff4d6 / #2a2110.
   ========================================================================== */
function TheIdesScene({ role, delayMs }: SceneProps) {
  const bell = (
    <g {...SJ}>
      <path d="M12 3c4 0 6.4 3.6 6.4 8.4V17h1.6v2.4H4V17h1.6v-5.6C5.6 6.6 8 3 12 3z" fill="rgba(210,180,99,0.5)" stroke="#d2b463" strokeWidth="1.3" />
      <path d="M12 19.4v2.4" stroke="#d2b463" strokeWidth="1.4" />
    </g>
  );
  const lipCrack = <path d="M12 22V15l-3-4 3-4V2" stroke="#fff4d6" strokeWidth="1.7" fill="none" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-id-swing" l={24} t={10} w={52} h={64} d={40} st={{ transformOrigin: "50% 0%" }}>{bell}</V>
        <L c="g11-id-toll" l={18} t={22} w={64} h={64} d={240} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
        <V c="g11-id-crack" l={36} t={36} w={30} h={44} d={470}>{lipCrack}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hitside" l={26} t={12} w={48} h={62} d={0}>{bell}</V>
        <L c="g11-hit2" l={22} t={24} w={56} h={56} d={130} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
        <V c="g11-hit" l={38} t={38} w={26} h={40} d={250}>{lipCrack}</V>
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(210,180,99,0.26)" />
          <Rim tone="rgba(255,244,214,0.3)" />
        </>
      }
    >
      <V c="g11-id-yoke" l={42} t={32} w={16} h={4} d={90} par="none" vb="0 0 40 8">
        <path d="M2 4h36" stroke="#d2b463" strokeWidth="3" {...SJ} />
      </V>
      <V c="g11-id-swing" l={44} t={34} w={12} h={17} d={220} st={{ transformOrigin: "50% 0%" }}>{bell}</V>
      <L c="g11-id-toll" l={40} t={35} w={20} h={20} d={400} st={{ borderRadius: "50%", border: "2px solid #fff4d6" }} />
      <L c="g11-id-toll" l={37} t={32} w={26} h={26} d={480} st={{ borderRadius: "50%", border: "1px solid #d2b463" }} />
      <V c="g11-id-crack" l={46} t={38} w={8} h={13} d={620}>{lipCrack}</V>
      <L c="g11-lean" l={43} t={57} w={14} h={3} d={680} st={{ borderRadius: "999px", background: "rgba(42,33,16,0.7)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-dust" l={44 + i * 6} t={52} w={1.4} h={1.4} d={740 + i * 90} st={{ borderRadius: "50%", background: "#d2b463" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   15. Winded Destrier (t3) — THE GLASS HORSESHOE FLOODS WITH WEB
   The shoe strikes the boards mid gallop, rings once, and the web crack floods
   it heel to heel before the stride can finish. Aim-staged along the charge.
   Palette: #9fb6cc / #fff3dc / #16202c.
   ========================================================================== */
function WindedDestrierScene({ role, delayMs }: SceneProps) {
  const shoe = (
    <g fill="none" stroke="#9fb6cc" strokeWidth="2.4" {...SJ}>
      <path d="M6 21V13a6 6 0 0 1 12 0v8" />
      <path d="M6 21h2.6M15.4 21H18" strokeWidth="2" />
    </g>
  );
  const web = (
    <path d="M12 12L4 7M12 12l8-4M12 12l-6 8M12 12l6 8M12 12l-9 3M12 12l9 2" stroke="#fff3dc" strokeWidth="1.2" fill="none" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-ent-drop" l={22} t={16} w={56} h={58} d={40}>{shoe}</V>
        <L c="g11-wd-ring" l={20} t={24} w={60} h={60} d={240} st={{ borderRadius: "50%", border: "2px solid #fff3dc" }} />
        <V c="g11-wd-web" l={28} t={28} w={44} h={44} d={430}>{web}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hitside" l={24} t={16} w={52} h={58} d={0}>{shoe}</V>
        <L c="g11-hit2" l={26} t={26} w={48} h={48} d={130} st={{ borderRadius: "50%", border: "2px solid #fff3dc" }} />
        <V c="g11-hit" l={30} t={30} w={40} h={40} d={250}>{web}</V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(159,182,204,0.26)" />}>
      <L c="g11-runout" l={40} t={49} w={26} h={2} d={90} st={{ transformOrigin: "0% 50%", background: "linear-gradient(90deg, rgba(159,182,204,0), #fff3dc)" }} />
      <V c="g11-wd-strike" l={45} t={41} w={11} h={14} d={240}>{shoe}</V>
      <L c="g11-wd-ring" l={42} t={39} w={17} h={17} d={400} st={{ borderRadius: "50%", border: "2px solid #fff3dc" }} />
      <V c="g11-wd-web" l={44} t={41} w={13} h={13} d={520}>{web}</V>
      <V c="g11-wd-halt" l={49} t={40} w={11} h={14} d={640}>
        <path d={KNIGHT} fill="none" stroke="#9fb6cc" strokeWidth="1.4" {...SJ} />
      </V>
      <L c="g11-lean" l={43} t={56} w={15} h={3} d={690} st={{ borderRadius: "999px", background: "rgba(22,32,44,0.68)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-shard" l={46 + i * 5} t={52} w={1.5} h={2.2} d={750 + i * 90} st={{ background: "#9fb6cc" }} />
      ))}
    </AimLead>
  );
}

/* =============================================================================
   16. Warm Soup (t2) — THE ICICLE SNAPS FREE
   One hairline crosses the shaft, the icicle lets go and drops away, and the
   stump left on the beam is clear glass again.
   Palette: #b6e0ea / #fff3dd / #123240.
   ========================================================================== */
function WarmSoupScene({ role, delayMs }: SceneProps) {
  const spike = <path d="M12 1l3.4 6-1.6 15L12 23l-1.8-1-1.6-15z" fill="rgba(182,224,234,0.7)" stroke="#b6e0ea" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-ent-drop" l={32} t={8} w={36} h={70} d={40}>{spike}</V>
        <L c="g11-ws-line" l={26} t={40} w={48} h={2} d={240} st={{ background: "#fff3dd", transformOrigin: "0% 50%" }} />
        <V c="g11-ws-fall" l={34} t={44} w={32} h={44} d={430}>{spike}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hitside" l={34} t={6} w={32} h={68} d={0}>{spike}</V>
        <L c="g11-hit2" l={28} t={40} w={44} h={2.4} d={130} st={{ background: "#fff3dd", transformOrigin: "0% 50%" }} />
        <L c="g11-hit" l={44} t={72} w={12} h={12} d={250} st={{ borderRadius: "50%", background: "#b6e0ea" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(182,224,234,0.26)" />}>
      <V c="g11-ws-beam" l={40} t={33} w={20} h={4} d={90} par="none" vb="0 0 40 8">
        <path d="M1 4h38" stroke="#b6e0ea" strokeWidth="3" {...SJ} />
      </V>
      <V c="g11-ws-hang" l={46} t={35} w={8} h={16} d={220}>{spike}</V>
      <L c="g11-ws-line" l={45} t={41} w={10} h={1.2} d={400} st={{ background: "#fff3dd", transformOrigin: "0% 50%" }} />
      <V c="g11-ws-fall" l={46} t={41} w={8} h={12} d={540}>{spike}</V>
      <V c="g11-ws-stump" l={47} t={35} w={6} h={6} d={640}>
        <path d="M12 2l3 6-3 6-3-6z" fill="#fff3dd" />
      </V>
      <L c="g11-lean" l={44} t={57} w={12} h={3} d={690} st={{ borderRadius: "999px", background: "rgba(18,50,64,0.66)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-mote" l={45 + i * 5} t={52} w={1.3} h={1.3} d={750 + i * 90} st={{ borderRadius: "50%", background: "#b6e0ea" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   17. Cold Start (t2) — THE PORCELAIN INSULATOR CRACKS THROUGH ITS SKIRTS
   Cold and load in the same instant: the ribbed insulator on its post takes
   the first pull and the crack walks straight down through every skirt.
   Palette: #dfe4ea / #fff4d6 / #1a2028.
   ========================================================================== */
function ColdStartScene({ role, delayMs }: SceneProps) {
  const insulator = (
    <g {...SJ}>
      <path d="M10.4 2h3.2v20h-3.2z" fill="#1a2028" stroke="#dfe4ea" strokeWidth="1" />
      <path d="M5 7h14l-2.4 2.6H7.4zM5.6 12h12.8L16 14.6H8zM6.4 17h11.2L15.4 19.6H8.6z" fill="rgba(223,228,234,0.75)" stroke="#dfe4ea" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-ent-rise" l={26} t={8} w={48} h={76} d={40}>{insulator}</V>
        <L c="g11-co-pull" l={16} t={30} w={68} h={2} d={240} st={{ background: "#dfe4ea", transformOrigin: "100% 50%" }} />
        <L c="g11-co-split" l={49} t={20} w={2} h={56} d={430} st={{ background: "#fff4d6", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hitside" l={28} t={8} w={44} h={74} d={0}>{insulator}</V>
        <L c="g11-hit2" l={49} t={16} w={2.4} h={60} d={130} st={{ background: "#fff4d6", transformOrigin: "50% 0%" }} />
        <V c="g11-hit" l={36} t={36} w={28} h={28} d={250}>
          <path d="M12 12l-8-4M12 12l8-3M12 12l-6 8" stroke="#fff4d6" strokeWidth="1.6" fill="none" {...SJ} />
        </V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(223,228,234,0.26)" />}>
      <V c="g11-co-post" l={45} t={35} w={10} h={20} d={90}>{insulator}</V>
      <L c="g11-co-pull" l={34} t={41} w={16} h={1.4} d={230} st={{ background: "#dfe4ea", transformOrigin: "100% 50%" }} />
      <L c="g11-co-jolt" l={44} t={40} w={12} h={12} d={400} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.85), transparent 68%)" }} />
      <L c="g11-co-split" l={49.4} t={36} w={1.2} h={18} d={540} st={{ background: "#fff4d6", transformOrigin: "50% 0%" }} />
      <V c="g11-co-shed" l={44} t={46} w={12} h={6} d={660}>
        <path d="M2 6h20l-3 5H5z" fill="#dfe4ea" />
      </V>
      <L c="g11-lean" l={44} t={57} w={12} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(26,32,40,0.68)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-dust" l={45 + i * 5} t={53} w={1.4} h={1.4} d={760 + i * 90} st={{ borderRadius: "50%", background: "#dfe4ea" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   18. Frost Footprints (t2) — THE GLAZIER'S DIAMOND SCORES THE SHEET
   The wheel runs a score across the sheet with that dry singing noise, the
   glazier taps underneath, and the sheet parts along the line: everything past
   the score belongs to nobody. Aim-staged along the score.
   Palette: #c3d4e2 / #fff3dc / #182430.
   ========================================================================== */
function FrostFootprintsScene({ role, delayMs }: SceneProps) {
  const diamond = (
    <g {...SJ}>
      <path d="M9 2h6v11H9z" fill="#182430" stroke="#c3d4e2" strokeWidth="1.2" />
      <path d="M12 13l3 4-3 5-3-5z" fill="#fff3dc" stroke="#182430" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g11-ff-sheet" l={6} t={20} w={88} h={60} d={40} st={{ background: "linear-gradient(130deg, rgba(195,212,226,0.3), rgba(24,36,48,0.34))" }} />
        <V c="g11-ff-wheel" l={12} t={18} w={30} h={44} d={240}>{diamond}</V>
        <L c="g11-ff-score" l={10} t={52} w={80} h={2} d={430} st={{ background: "#fff3dc", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g11-hitside" l={12} t={22} w={76} h={56} d={0} st={{ background: "linear-gradient(130deg, rgba(195,212,226,0.34), rgba(24,36,48,0.4))" }} />
        <L c="g11-hit2" l={8} t={52} w={84} h={2.4} d={130} st={{ background: "#fff3dc", transformOrigin: "0% 50%" }} />
        <V c="g11-hit" l={36} t={30} w={28} h={40} d={250}>{diamond}</V>
      </Cut>
    );
  }
  return (
    <AimLead d={delayMs} frame={<Wash tone="rgba(195,212,226,0.26)" />}>
      <L c="g11-ff-sheet" l={40} t={40} w={26} h={20} d={90} st={{ background: "linear-gradient(130deg, rgba(195,212,226,0.28), rgba(24,36,48,0.3))" }} />
      <V c="g11-ff-wheel" l={43} t={42} w={7} h={11} d={230}>{diamond}</V>
      <L c="g11-runout" l={45} t={49.4} w={22} h={1.2} d={400} st={{ transformOrigin: "0% 50%", background: "linear-gradient(90deg, #fff3dc, rgba(195,212,226,0))" }} />
      <L c="g11-ff-score" l={45} t={49.2} w={22} h={1.6} d={520} st={{ background: "#fff3dc", transformOrigin: "0% 50%" }} />
      <L c="g11-ff-part" l={45} t={42} w={22} h={7} d={660} st={{ background: "linear-gradient(180deg, rgba(195,212,226,0.5), transparent)" }} />
      <L c="g11-lean" l={43} t={57} w={16} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(24,36,48,0.68)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-dust" l={48 + i * 6} t={53} w={1.4} h={1.4} d={760 + i * 90} st={{ borderRadius: "50%", background: "#c3d4e2" }} />
      ))}
    </AimLead>
  );
}

/* =============================================================================
   19. Hand Cramp (t2) — THE QUARTZ VEIN RUNS THROUGH THE STONE
   A dark block; a white vein floods through it from one corner, forks once,
   and the block is one solid unusable thing. Rook-shaped, because it is.
   Palette: #d8dcea / #fff4d6 / #1c2030.
   ========================================================================== */
function HandCrampScene({ role, delayMs }: SceneProps) {
  const block = (
    <g {...SJ}>
      <rect x="3" y="4" width="18" height="17" fill="#1c2030" stroke="#d8dcea" strokeWidth="1.2" />
      <path d="M3 9.4h18M3 15h18" stroke="rgba(216,220,234,0.4)" strokeWidth="0.8" />
    </g>
  );
  const vein = <path d="M2 4c5 3 6 6 5 9-1 3 2 5 6 7M7 13l6-2" stroke="#fff4d6" strokeWidth="1.5" fill="none" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-ent-rise" l={16} t={16} w={68} h={64} d={40}>{block}</V>
        <V c="g11-hc-vein" l={20} t={18} w={60} h={60} d={280}>{vein}</V>
        <L c="g11-glint" l={38} t={38} w={24} h={24} d={470} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.8), transparent 68%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hitside" l={18} t={18} w={64} h={60} d={0}>{block}</V>
        <V c="g11-hit" l={22} t={20} w={56} h={56} d={130}>{vein}</V>
        <L c="g11-hit2" l={34} t={34} w={32} h={32} d={250} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.8), transparent 66%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(216,220,234,0.26)" />}>
      <V c="g11-hc-rook" l={45} t={42} w={10} h={13} d={90}><path d={ROOK} fill="none" stroke="#fff4d6" strokeWidth="1.3" {...SJ} /></V>
      <V c="g11-hc-block" l={42} t={39} w={16} h={18} d={240}>{block}</V>
      <V c="g11-hc-vein" l={42} t={39} w={16} h={18} d={420}>{vein}</V>
      <V c="g11-hc-fork" l={46} t={44} w={10} h={10} d={560}>
        <path d="M4 4c3 4 7 5 16 4" stroke="#d8dcea" strokeWidth="1.4" fill="none" {...SJ} />
      </V>
      <L c="g11-tiltin" l={42} t={40} w={16} h={16} d={660} st={{ background: "linear-gradient(120deg, transparent, rgba(255,244,214,0.55), transparent)" }} />
      <L c="g11-lean" l={42} t={58} w={16} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(28,32,48,0.7)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-dust" l={44 + i * 6} t={53} w={1.4} h={1.4} d={760 + i * 90} st={{ borderRadius: "50%", background: "#d8dcea" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   20. Pebble in the Shoe (t2) — THE SPALL POPS OUT OF THE PLATE
   One small flint lands on a glass plate and does nothing at all, then a
   shallow cone of glass pops clean out from underneath it and the plate is a
   plate with a hole in it. Palette: #c8bfa6 / #fff3dc / #2a2618.
   ========================================================================== */
function PebbleInTheShoeScene({ role, delayMs }: SceneProps) {
  const pebble = <path d="M6 14c-1-4 2-7 6-7s7 3 6 7-4 5-6 5-5-1-6-5z" fill="#c8bfa6" stroke="#2a2618" strokeWidth="1.1" {...SJ} />;
  const cone = <path d="M4 4h16l-8 15z" fill="rgba(255,243,220,0.85)" stroke="#c8bfa6" strokeWidth="1" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g11-pb-plate" l={10} t={40} w={80} h={24} d={40} st={{ background: "linear-gradient(180deg, rgba(200,191,166,0.4), rgba(42,38,24,0.3))" }} />
        <V c="g11-ent-drop" l={38} t={8} w={26} h={34} d={240}>{pebble}</V>
        <V c="g11-pb-spall" l={34} t={56} w={32} h={34} d={430}>{cone}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g11-hitside" l={12} t={42} w={76} h={20} d={0} st={{ background: "linear-gradient(180deg, rgba(200,191,166,0.44), rgba(42,38,24,0.34))" }} />
        <V c="g11-hit" l={38} t={22} w={26} h={30} d={130}>{pebble}</V>
        <V c="g11-hit2" l={36} t={56} w={28} h={30} d={250}>{cone}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(200,191,166,0.26)" />}>
      <L c="g11-pb-plate" l={38} t={44} w={24} h={8} d={90} st={{ background: "linear-gradient(180deg, rgba(200,191,166,0.42), rgba(42,38,24,0.3))" }} />
      <V c="g11-pb-drop" l={46.5} t={34} w={7} h={9} d={230}>{pebble}</V>
      <L c="g11-pb-tick" l={46} t={44} w={8} h={3} d={400} st={{ borderRadius: "999px", background: "rgba(255,243,220,0.9)" }} />
      <V c="g11-pb-spall" l={45.5} t={47} w={9} h={9} d={540}>{cone}</V>
      <L c="g11-pb-hole" l={47} t={45} w={6} h={3} d={660} st={{ borderRadius: "50%", background: "rgba(42,38,24,0.85)" }} />
      <L c="g11-lean" l={43} t={55} w={14} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(42,38,24,0.66)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-shard" l={45 + i * 5} t={50} w={1.5} h={2} d={760 + i * 90} st={{ background: "#c8bfa6" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   21. Court Jester (t1) — THE CHANDELIER'S DROPS CHIME, THEN STILL
   Cut-glass drops on a little frame swing against each other, all bells and
   nonsense, and then every one of them stops at the same instant, mid bow.
   Palette: #e6c8f0 / #fff2e4 / #241634.
   ========================================================================== */
const CJ_DROP = "M12 2l4 6-4 14-4-14z";

function CourtJesterScene({ role, delayMs }: SceneProps) {
  const rail = (
    <g fill="none" stroke="#e6c8f0" strokeWidth="1.4" {...SJ}>
      <path d="M12 1v4M3 5h18" />
      <path d="M5 5v3M12 5v3M19 5v3" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-ent-drop" l={14} t={8} w={72} h={40} d={40}>{rail}</V>
        {[0, 1, 2].map((i) => (
          <V key={i} c="g11-cj-chime" l={20 + i * 24} t={38} w={16} h={44} d={240 + i * 110} st={{ transformOrigin: "50% 0%" }}>
            <path d={CJ_DROP} fill="#e6c8f0" />
          </V>
        ))}
        <L c="g11-cj-still" l={30} t={44} w={40} h={30} d={560} st={{ background: "radial-gradient(circle, rgba(255,242,228,0.7), transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hitside" l={24} t={16} w={52} h={30} d={0}>{rail}</V>
        <V c="g11-hit" l={38} t={38} w={24} h={44} d={130}><path d={CJ_DROP} fill="#e6c8f0" /></V>
        <L c="g11-hit2" l={34} t={46} w={32} h={26} d={250} st={{ background: "radial-gradient(circle, rgba(255,242,228,0.7), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(230,200,240,0.26)" />}>
      <V c="g11-cj-rail" l={41} t={33} w={18} h={9} d={90}>{rail}</V>
      {[0, 1, 2, 3].map((i) => (
        <V key={i} c="g11-cj-chime" l={42.5 + i * 4.4} t={39} w={3.6} h={9} d={240 + i * 90} st={{ transformOrigin: "50% 0%" }}>
          <path d={CJ_DROP} fill="#e6c8f0" />
        </V>
      ))}
      <L c="g11-cj-ting" l={44} t={42} w={12} h={12} d={520} st={{ borderRadius: "50%", border: "1px solid #fff2e4" }} />
      <L c="g11-cj-still" l={42} t={40} w={16} h={14} d={640} st={{ background: "radial-gradient(circle, rgba(255,242,228,0.7), transparent 70%)" }} />
      <L c="g11-lean" l={43} t={56} w={14} h={3} d={690} st={{ borderRadius: "999px", background: "rgba(36,22,52,0.68)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-mote" l={44 + i * 5} t={50} w={1.3} h={1.3} d={750 + i * 90} st={{ borderRadius: "50%", background: "#fff2e4" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   22. Dunce Detail (t1) — THE GLASS CONE COMES DOWN
   A tall clear cone drops over the officer, its tip stars against the boards,
   and one hairline turns down the outside. Nothing gets out and everybody can
   see in. Palette: #f0c98a / #fff4d6 / #2e2211.
   ========================================================================== */
function DunceDetailScene({ role, delayMs }: SceneProps) {
  const cone = (
    <g {...SJ}>
      <path d="M12 2l7.4 19H4.6z" fill="rgba(240,201,138,0.32)" stroke="#f0c98a" strokeWidth="1.3" />
      <path d="M9 13.6h6" stroke="#f0c98a" strokeWidth="0.9" />
    </g>
  );
  const tipStar = <path d="M12 12l-6-5M12 12l7-4M12 12l-4 7" stroke="#fff4d6" strokeWidth="1.7" fill="none" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-ent-drop" l={22} t={8} w={56} h={72} d={40}>{cone}</V>
        <V c="g11-dd-tip" l={40} t={4} w={20} h={20} d={280}>{tipStar}</V>
        <L c="g11-dd-spiral" l={30} t={50} w={40} h={26} d={470} st={{ border: "1px solid #fff4d6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hitside" l={24} t={8} w={52} h={70} d={0}>{cone}</V>
        <V c="g11-hit" l={34} t={40} w={32} h={40} d={130}><path d={BISHOP} fill="#f0c98a" /></V>
        <L c="g11-hit2" l={28} t={70} w={44} h={5} d={250} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(240,201,138,0.26)" />}>
      <V c="g11-dd-piece" l={45.5} t={44} w={9} h={12} d={90}><path d={BISHOP} fill="none" stroke="#fff4d6" strokeWidth="1.3" {...SJ} /></V>
      <V c="g11-dd-cone" l={43} t={36} w={14} h={21} d={240}>{cone}</V>
      <V c="g11-dd-tip" l={46} t={33} w={8} h={8} d={430}>{tipStar}</V>
      <L c="g11-dd-spiral" l={44} t={44} w={12} h={11} d={560} st={{ border: "1px solid #fff4d6" }} />
      <L c="g11-lean" l={42} t={57} w={16} h={3} d={660} st={{ borderRadius: "999px", background: "rgba(46,34,17,0.68)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-dust" l={44 + i * 6} t={52} w={1.4} h={1.4} d={740 + i * 90} st={{ borderRadius: "50%", background: "#f0c98a" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   23. Early Frost (t1) — THE PANE WITH ONE HOLE PUNCHED IN IT
   A sheet is laid over the furrow with a single clean round hole; one pawn
   goes through, and then the hole grows shut with crystal and the sheet is
   solid all the way across. Palette: #a7cfe0 / #fff3dd / #12252f.
   ========================================================================== */
function EarlyFrostScene({ role, delayMs }: SceneProps) {
  const holedPane = (
    <g {...SJ}>
      <rect x="2" y="5" width="20" height="14" fill="rgba(167,207,224,0.28)" stroke="#a7cfe0" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="4.4" fill="rgba(18,37,47,0.85)" stroke="#fff3dd" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-ent-drop" l={8} t={22} w={84} h={54} d={40}>{holedPane}</V>
        <V c="g11-ef-slip" l={38} t={26} w={24} h={44} d={240}><path d={PAWN} fill="#fff3dd" /></V>
        <L c="g11-ef-seal" l={38} t={38} w={24} h={24} d={470} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(167,207,224,0.9), transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hitside" l={10} t={24} w={80} h={50} d={0}>{holedPane}</V>
        <V c="g11-hit" l={38} t={30} w={24} h={40} d={130}><path d={PAWN} fill="#fff3dd" /></V>
        <L c="g11-hit2" l={38} t={38} w={24} h={24} d={250} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(167,207,224,0.9), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(167,207,224,0.28)" />
          <Rim tone="rgba(255,243,221,0.28)" />
        </>
      }
    >
      <V c="g11-ef-lay" l={39} t={41} w={22} h={14} d={90}>{holedPane}</V>
      <V c="g11-ef-slip" l={46} t={38} w={8} h={11} d={250}><path d={PAWN} fill="none" stroke="#fff3dd" strokeWidth="1.4" {...SJ} /></V>
      <L c="g11-sidein" l={44} t={44} w={12} h={2} d={400} st={{ background: "linear-gradient(90deg, transparent, rgba(255,243,221,0.9), transparent)" }} />
      <L c="g11-ef-seal" l={47} t={45} w={6} h={6} d={540} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(167,207,224,0.92), transparent 72%)" }} />
      <V c="g11-ef-knit" l={45} t={43} w={10} h={10} d={660}>
        <path d="M12 3v18M4 8l16 8M20 8L4 16" stroke="#fff3dd" strokeWidth="1.2" fill="none" {...SJ} />
      </V>
      <L c="g11-lean" l={42} t={56} w={16} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(18,37,47,0.66)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-mote" l={44 + i * 6} t={51} w={1.3} h={1.3} d={760 + i * 90} st={{ borderRadius: "50%", background: "#a7cfe0" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   24. Mild Sting (t1) — THE WASP UNDER THE UPTURNED TUMBLER
   A tumbler comes down over the wasp, it does two furious laps of the inside,
   and where it finally hits the glass a small star blooms and stays.
   Palette: #edc860 / #fff4d6 / #2c2210.
   ========================================================================== */
function MildStingScene({ role, delayMs }: SceneProps) {
  const dome = (
    <g fill="none" stroke="#edc860" strokeWidth="1.4" {...SJ}>
      <path d="M5.4 21V9.4a6.6 6.6 0 0 1 13.2 0V21z" />
      <path d="M4 21h16" strokeWidth="1.2" />
    </g>
  );
  const wasp = (
    <g {...SJ}>
      <ellipse cx="12" cy="13" rx="3.4" ry="5" fill="#edc860" stroke="#2c2210" strokeWidth="1" />
      <path d="M9 11.4h6M9 14h6" stroke="#2c2210" strokeWidth="1" />
      <path d="M9.4 8.6L5 5M14.6 8.6L19 5" stroke="#fff4d6" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-ent-drop" l={18} t={12} w={64} h={68} d={40}>{dome}</V>
        <V c="g11-ms-lap" l={34} t={34} w={32} h={40} d={240}>{wasp}</V>
        <V c="g11-ms-star" l={44} t={26} w={26} h={26} d={470}>
          <path d="M12 12l-6-4M12 12l6-3M12 12l-3 7M12 12l4 6" stroke="#fff4d6" strokeWidth="1.5" fill="none" {...SJ} />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hitside" l={20} t={14} w={60} h={64} d={0}>{dome}</V>
        <V c="g11-hit" l={36} t={36} w={28} h={36} d={130}>{wasp}</V>
        <V c="g11-hit2" l={44} t={26} w={26} h={26} d={250}>
          <path d="M12 12l-6-4M12 12l6-3M12 12l-3 7" stroke="#fff4d6" strokeWidth="1.6" fill="none" {...SJ} />
        </V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(237,200,96,0.26)" />}>
      <V c="g11-ms-buzz" l={49} t={35} w={7} h={9} d={90}>{wasp}</V>
      <V c="g11-ms-dome" l={43} t={37} w={14} h={20} d={230}>{dome}</V>
      <V c="g11-ms-lap" l={46} t={42} w={7} h={9} d={410}>{wasp}</V>
      <V c="g11-ms-star" l={49} t={39} w={8} h={8} d={560}>
        <path d="M12 12l-6-4M12 12l6-3M12 12l-3 7M12 12l4 6" stroke="#fff4d6" strokeWidth="1.6" fill="none" {...SJ} />
      </V>
      <L c="g11-tiltin" l={43} t={40} w={14} h={12} d={660} st={{ background: "linear-gradient(120deg, transparent, rgba(255,244,214,0.6), transparent)" }} />
      <L c="g11-lean" l={43} t={57} w={14} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(44,34,16,0.66)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-dust" l={45 + i * 5} t={52} w={1.3} h={1.3} d={760 + i * 90} st={{ borderRadius: "50%", background: "#edc860" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   25. Sleepy Sentry (t1) — THE LENS FOGS, THEN STARS
   The watch glass over the post clouds slowly from the edge inward, the view
   goes soft, and then a star-crack blooms dead centre and everything behind it
   holds still. Palette: #9fb0c8 / #fff3dc / #151c28.
   ========================================================================== */
function SleepySentryScene({ role, delayMs }: SceneProps) {
  const lens = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="9.2" fill="rgba(159,176,200,0.22)" stroke="#9fb0c8" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6.4" fill="none" stroke="#9fb0c8" strokeWidth="0.8" />
    </g>
  );
  const starCrack = <path d={STAR5} stroke="#fff3dc" strokeWidth="1.4" fill="none" {...SJ} />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-ent-rise" l={16} t={16} w={68} h={68} d={40}>{lens}</V>
        <L c="g11-sy-fog" l={20} t={20} w={60} h={60} d={240} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,220,0.16), rgba(159,176,200,0.6) 76%)" }} />
        <V c="g11-sy-star" l={28} t={28} w={44} h={44} d={470}>{starCrack}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hitside" l={18} t={18} w={64} h={64} d={0}>{lens}</V>
        <L c="g11-hit2" l={22} t={22} w={56} h={56} d={130} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,220,0.14), rgba(159,176,200,0.58) 76%)" }} />
        <V c="g11-hit" l={30} t={30} w={40} h={40} d={250}>{starCrack}</V>
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(159,176,200,0.26)" />}>
      <V c="g11-sy-glass" l={43} t={38} w={14} h={19} d={90}>{lens}</V>
      <V c="g11-sy-post" l={46} t={41} w={8} h={11} d={230}><path d={PAWN} fill="none" stroke="#fff3dc" strokeWidth="1.3" {...SJ} /></V>
      <L c="g11-sy-fog" l={43.5} t={39} w={13} h={17} d={400} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,220,0.16), rgba(159,176,200,0.62) 76%)" }} />
      <V c="g11-sy-star" l={45} t={41} w={10} h={13} d={560}>{starCrack}</V>
      <L c="g11-sidein" l={43} t={45} w={14} h={2} d={660} st={{ background: "linear-gradient(90deg, transparent, rgba(255,243,220,0.85), transparent)" }} />
      <L c="g11-lean" l={43} t={57} w={14} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(21,28,40,0.68)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-mote" l={45 + i * 5} t={52} w={1.3} h={1.3} d={760 + i * 90} st={{ borderRadius: "50%", background: "#9fb0c8" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   26. Thin Ice Patch (t1) — TWO PANES, AND THE HAIRLINES MEET
   Two square panes are set down side by side at the entry squares; each takes
   a hairline of its own, and the two lines walk toward the seam until they
   touch. Listen for it. Palette: #bcd8e4 / #fff3dd / #142832.
   ========================================================================== */
function ThinIcePatchScene({ role, delayMs }: SceneProps) {
  const slab = (
    <g {...SJ}>
      <rect x="2.5" y="2.5" width="19" height="19" fill="rgba(188,216,228,0.26)" stroke="#bcd8e4" strokeWidth="1.4" />
      <path d="M5 6.4h8" stroke="rgba(255,243,221,0.5)" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-ent-drop" l={6} t={22} w={42} h={52} d={40}>{slab}</V>
        <V c="g11-ent-drop" l={52} t={22} w={42} h={52} d={190}>{slab}</V>
        <L c="g11-ti-run" l={12} t={48} w={34} h={2} d={430} st={{ background: "#fff3dd", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hitside" l={16} t={16} w={68} h={68} d={0}>{slab}</V>
        <L c="g11-hit2" l={18} t={50} w={64} h={2.4} d={130} st={{ background: "#fff3dd", transformOrigin: "0% 50%" }} />
        <L c="g11-hit" l={44} t={44} w={12} h={12} d={250} st={{ borderRadius: "50%", background: "rgba(255,243,221,0.9)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(188,216,228,0.26)" />}>
      <V c="g11-ti-set" l={39} t={41} w={11} h={11} d={90}>{slab}</V>
      <V c="g11-ti-set" l={50} t={41} w={11} h={11} d={220}>{slab}</V>
      <L c="g11-ti-run" l={40} t={46} w={9} h={1.2} d={400} st={{ background: "#fff3dd", transformOrigin: "0% 50%" }} />
      <L c="g11-ti-run" l={51} t={47.4} w={9} h={1.2} d={490} st={{ background: "#fff3dd", transformOrigin: "100% 50%" }} />
      <L c="g11-ti-meet" l={48} t={44} w={4} h={6} d={640} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,221,0.95), transparent 70%)" }} />
      <L c="g11-lean" l={42} t={56} w={16} h={3} d={690} st={{ borderRadius: "999px", background: "rgba(20,40,50,0.66)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-dust" l={44 + i * 6} t={52} w={1.3} h={1.3} d={750 + i * 90} st={{ borderRadius: "50%", background: "#bcd8e4" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   27. First Frost (t1) — THE OMEN STAR ETCHES ITSELF ON THE PANE
   A pane stands over the king's square and a six-armed crystal star writes
   itself onto it arm by arm, then the pane rings once and holds until it is
   answered. Palette: #b0d8ea / #fff3dd / #13293a.
   ========================================================================== */
const FF_ARMS = [0, 60, 120, 180, 240, 300];

function FirstFrostScene({ role, delayMs }: SceneProps) {
  const arm = (
    <g fill="none" stroke="#b0d8ea" strokeWidth="1.5" {...SJ}>
      <path d="M12 12V2" />
      <path d="M12 6.4l3 2M12 6.4l-3 2" strokeWidth="1.1" />
    </g>
  );
  const pane = <rect x="2.5" y="2.5" width="19" height="19" fill="rgba(176,216,234,0.2)" stroke="#b0d8ea" strokeWidth="1.4" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-ent-rise" l={14} t={14} w={72} h={72} d={40}>{pane}</V>
        {[0, 1, 2].map((i) => (
          <P key={i} l={22} t={22} w={56} h={56} rot={`${i * 120}deg`}>
            <V c="g11-om-arm" w={100} h={100} d={240 + i * 110}>{arm}</V>
          </P>
        ))}
        <L c="g11-om-ring" l={26} t={26} w={48} h={48} d={580} st={{ borderRadius: "50%", border: "2px solid #fff3dd" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hitside" l={18} t={18} w={64} h={64} d={0}>{pane}</V>
        <V c="g11-hit" l={30} t={30} w={40} h={40} d={130}>{arm}</V>
        <L c="g11-hit2" l={28} t={28} w={44} h={44} d={250} st={{ borderRadius: "50%", border: "2px solid #fff3dd" }} />
      </Cut>
    );
  }
  return (
    <Lead
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(176,216,234,0.28)" />
          <Rim tone="rgba(255,243,221,0.3)" />
        </>
      }
    >
      <V c="g11-om-king" l={45.5} t={44} w={9} h={12} d={90}><path d={KING} fill="none" stroke="#fff3dd" strokeWidth="1.3" {...SJ} /></V>
      <V c="g11-om-pane" l={42} t={38} w={16} h={18} d={230}>{pane}</V>
      {FF_ARMS.map((a, i) => (
        <P key={a} l={44} t={40} w={12} h={12} rot={`${a}deg`}>
          <V c="g11-om-arm" w={100} h={100} d={380 + i * 60}>{arm}</V>
        </P>
      ))}
      <L c="g11-om-ring" l={43} t={39} w={14} h={14} d={660} st={{ borderRadius: "50%", border: "2px solid #fff3dd" }} />
      <L c="g11-lean" l={43} t={57} w={14} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(19,41,58,0.66)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-mote" l={45 + i * 5} t={51} w={1.3} h={1.3} d={760 + i * 90} st={{ borderRadius: "50%", background: "#fff3dd" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   28. Snowdrop (t1) — THE BLOWN-GLASS FLOWER OPENS
   A glass snowdrop straightens on its stem and opens its bell one petal at a
   time, and the pawn under it takes the square in front. The stem leans away
   from the caster's own edge, which is the direction a pawn goes.
   Palette: #cfe8d8 / #fff3dd / #14301f.
   ========================================================================== */
function SnowdropScene({ role, delayMs }: SceneProps) {
  const petal = <path d="M12 3c3 3.4 4.4 7 4.4 10.4S14.4 20 12 20s-4.4-3.2-4.4-6.6S9 6.4 12 3z" fill="rgba(207,232,216,0.7)" stroke="#cfe8d8" strokeWidth="1.1" {...SJ} />;
  const stem = (
    <g fill="none" stroke="#cfe8d8" strokeWidth="1.5" {...SJ}>
      <path d="M12 22V6" />
      <path d="M12 13c-2.6-1-4-3-4-5.6" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g11-ent-rise" l={30} t={26} w={40} h={62} d={40}>{stem}</V>
        {[0, 1, 2].map((i) => (
          <P key={i} l={28} t={6} w={44} h={44} rot={`${-30 + i * 30}deg`}>
            <V c="g11-sd-open" w={100} h={100} d={260 + i * 110}>{petal}</V>
          </P>
        ))}
        <L c="g11-glint" l={40} t={16} w={20} h={20} d={600} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,221,0.8), transparent 68%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g11-hitside" l={32} t={26} w={36} h={60} d={0}>{stem}</V>
        <V c="g11-hit" l={30} t={10} w={40} h={44} d={130}>{petal}</V>
        <L c="g11-hit2" l={40} t={16} w={20} h={20} d={250} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,243,221,0.8), transparent 68%)" }} />
      </Cut>
    );
  }
  return (
    <Lead d={delayMs} frame={<Wash tone="rgba(207,232,216,0.26)" />}>
      <V c="g11-sd-stem" l={46} t={42} w={8} h={16} d={90}>{stem}</V>
      {[0, 1, 2].map((i) => (
        <P key={i} l={44} t={35} w={12} h={12} rot={`${-28 + i * 28}deg`}>
          <V c="g11-sd-open" w={100} h={100} d={260 + i * 100}>{petal}</V>
        </P>
      ))}
      <L c="g11-sd-chime" l={44} t={35} w={12} h={12} d={580} st={{ borderRadius: "50%", border: "1px solid #fff3dd" }} />
      <V c="g11-sidein" l={46} t={46} w={8} h={11} d={660}><path d={PAWN} fill="none" stroke="#fff3dd" strokeWidth="1.4" {...SJ} /></V>
      <L c="g11-lean" l={44} t={58} w={12} h={3} d={700} st={{ borderRadius: "999px", background: "rgba(20,48,31,0.66)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g11-mote" l={45 + i * 5} t={40} w={1.3} h={1.3} d={760 + i * 90} st={{ borderRadius: "50%", background: "#cfe8d8" }} />
      ))}
    </Lead>
  );
}

/* =============================================================================
   FLAGSHIP IMPACT PASS — brittle things get LASERED, SHATTERED and RUNG.

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

/** A jagged pane shard: the module's brittle victim, ready to split. */
const impShard = (fill: string, edge: string): ReactNode => (
  <path
    d="M12 2.4l6.8 5.4-2.6 8.8-8 5-4.4-10.6z"
    fill={fill}
    stroke={edge}
    strokeWidth="1.2"
    strokeLinejoin="round"
  />
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

/* =============================================================================
   The table. Keys sit at exactly two spaces of indent: the animation audit and
   check-sig-plugins.cjs parse this block as TEXT.
   ========================================================================== */

export const PLAYS: Record<string, SigPlugin> = {
  bn4_cold_snap: S(ColdSnapScene, { ordering: "radial", staggerMs: 90, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen", anchor: "cast" }, { rgb: "168 220 237", at: 560, glyph: impShard("#a8dced", "#2f3e42"), shock: true, box: [43, 35, 14, 16] }),
  hx4_bounty_posted: S(BountyPostedScene, { ordering: "radial", staggerMs: 70, victims: "all", hasLead: true, sound: "petrify", source: "frozen", anchor: "cast" }, { rgb: "232 192 122", at: 640, laser: true, glyph: impShard("#e8c07a", "#2c2011"), box: [40, 36, 13, 13] }),
  hx4_caught_mid_stride: S(CaughtMidStrideScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen", anchor: "aim" }, { rgb: "255 243 220", at: 520, laser: true, shock: true, box: [44, 38, 12, 12], rot: -14 }),
  hx4_creaking_gallows: S(CreakingGallowsScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", source: "frozen", anchor: "cast" }, { rgb: "207 214 194", at: 600, glyph: impShard("#cfd6c2", "#3a3c36"), shock: true, box: [43, 40, 13, 15] }),
  hx4_pawnbrokers_lien: S(PawnbrokersLienScene, { ordering: "file", staggerMs: 80, victims: ["p"], hasLead: true, sound: "petrify", source: "frozen", anchor: "board" }, { rgb: "216 185 138", at: 700, laser: true, shock: true, box: [42, 38, 15, 15] }),
  hx4_sagging_shelves: S(SaggingShelvesScene, { ordering: "sweep", staggerMs: 90, victims: ["n", "b"], hasLead: true, sound: "wall", source: "frozen", anchor: "board" }, { rgb: "150 216 196", at: 620, shock: true, box: [36, 42, 26, 10] }),
  hx4_second_frost: S(SecondFrostScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "petrifiedforest", anchor: "board" }, { rgb: "185 168 228", at: 660, laser: true, glyph: impShard("#b9a8e4", "#1e1832"), shock: true, box: [43, 39, 13, 14] }),
  bn4_glass_of_water: S(GlassOfWaterScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "cast" }, { rgb: "166 219 232", at: 480, shock: true, box: [44, 40, 12, 12] }),
  bn4_kettle_on: S(KettleOnScene, { ordering: "radial", staggerMs: 70, victims: "all", hasLead: true, sound: "wall", anchor: "board" }, { rgb: "207 228 238", at: 540, glyph: impShard("#cfe4ee", "#16262e"), box: [44, 37, 12, 14] }),
  // Two NAMED enemy pawns, so the play lasers them down rather than blooming
  // on the caster's own square: see PuddleFreezeScene's <Reach>.
  bn4_puddle_freeze: S(PuddleFreezeScene, { ordering: "radial", staggerMs: 90, victims: ["p"], hasLead: true, sound: "massfreeze", source: "frozen", anchor: "aim" }, { rgb: "183 198 224", at: 500, laser: true, box: [43, 36, 14, 20] }),
  hx4_carrion_crows: S(CarrionCrowsScene, { ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "wall", source: "frozen", anchor: "cast" }, { rgb: "140 155 176", at: 580, glyph: impShard("#8c9bb0", "#121722"), shock: true, box: [42, 33, 15, 17] }),
  hx4_heavy_dew: S(HeavyDewScene, { ordering: "sweep", staggerMs: 80, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen", anchor: "board" }, { rgb: "255 243 218", at: 520, shock: true, box: [45, 42, 11, 11] }),
  hx4_jam_on_the_row: S(JamOnTheRowScene, { ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "wall", source: "frozen", anchor: "board" }, { rgb: "224 138 160", at: 560, glyph: impShard("#e08aa0", "#33131e"), box: [43, 41, 13, 13] }),
  hx4_the_ides: S(TheIdesScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", source: "frozen", anchor: "cast" }, { rgb: "210 180 99", at: 640, laser: true, shock: true, box: [42, 34, 15, 18] }),
  hx4_winded_destrier: S(WindedDestrierScene, { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "petrify", source: "frozen", anchor: "aim" }, { rgb: "159 182 204", at: 590, glyph: impShard("#9fb6cc", "#2d3339"), shock: true, box: [44, 39, 12, 13], rot: 10 }),
  bn4_warm_soup: S(WarmSoupScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", anchor: "cast" }, { rgb: "182 224 234", at: 460, glyph: impShard("#b6e0ea", "#333f42"), box: [45, 34, 10, 16] }),
  hx4_cold_start: S(ColdStartScene, { ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "wall", source: "frozen", anchor: "cast" }, { rgb: "223 228 234", at: 500, shock: true, box: [43, 38, 13, 13] }),
  hx4_frost_footprints: S(FrostFootprintsScene, { ordering: "sweep", staggerMs: 80, victims: "all", hasLead: true, sound: "petrify", anchor: "board" }, { rgb: "195 212 226", at: 540, laser: true, box: [44, 37, 12, 15], rot: -8 }),
  hx4_hand_cramp: S(HandCrampScene, { ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "petrifiedforest", source: "frozen", anchor: "cast" }, { rgb: "216 220 234", at: 440, shock: true, box: [44, 40, 12, 12] }),
  hx4_pebble_in_the_shoe: S(PebbleInTheShoeScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "petrify", source: "frozen", anchor: "cast" }, { rgb: "200 191 166", at: 520, glyph: impShard("#c8bfa6", "#2a2618"), box: [45, 41, 11, 11] }),
  hx4_court_jester: S(CourtJesterScene, { ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen", anchor: "cast" }, { rgb: "230 200 240", at: 420, shock: true, box: [43, 36, 13, 15] }),
  hx4_dunce_detail: S(DunceDetailScene, { ordering: "radial", staggerMs: 0, victims: ["n", "b"], hasLead: true, sound: "petrify", source: "frozen", anchor: "cast" }, { rgb: "240 201 138", at: 460, laser: true, box: [44, 34, 12, 18] }),
  hx4_early_frost: S(EarlyFrostScene, { ordering: "sweep", staggerMs: 70, victims: ["p"], hasLead: true, sound: "massfreeze", anchor: "cast" }, { rgb: "167 207 224", at: 480, glyph: impShard("#a7cfe0", "#2f3a3f"), box: [44, 38, 12, 12] }),
  hx4_mild_sting: S(MildStingScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "petrify", source: "frozen", anchor: "cast" }, { rgb: "237 200 96", at: 400, shock: true, box: [45, 40, 10, 10] }),
  hx4_sleepy_sentry: S(SleepySentryScene, { ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "clockice", source: "frozen", anchor: "cast" }, { rgb: "159 176 200", at: 440, laser: true, box: [44, 36, 12, 14] }),
  hx4_thin_ice_patch: S(ThinIcePatchScene, { ordering: "file", staggerMs: 90, victims: "all", hasLead: true, sound: "wall", anchor: "cast" }, { rgb: "188 216 228", at: 530, shock: true, box: [41, 39, 17, 11] }),
  op_first_frost: S(FirstFrostScene, { ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "clockice", anchor: "board" }, { rgb: "176 216 234", at: 560, laser: true, shock: true, box: [43, 35, 14, 16] }),
  op_snowdrop: S(SnowdropScene, { ordering: "file", staggerMs: 80, victims: ["p"], hasLead: true, sound: "massfreeze", anchor: "cast" }, { rgb: "207 232 216", at: 430, shock: true, box: [44, 39, 12, 12] }),
};
