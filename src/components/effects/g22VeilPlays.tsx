// Bespoke plugin signatures for the g22 VEIL batch: 21 concealment / blindness
// / fog / misdirection cards that all used to share the generated `shadowVeil`
// family (one purple veil, 21 hue shifts). See sigPlugins.tsx for the contract.
// Self-contained: own inline SVG, own CSS (g22VeilPlays.css), transform and
// opacity only, no import from BoardEffects.tsx (cycle hazard), and only the
// SigPlugin / SigRole TYPES imported from sigPlugins.tsx.
//
// MODULE FICTION: SIGHT BEING TAKEN AWAY. Every card is a different way that
// something stops being visible, and the veil itself never appears twice. A
// domino mask lowered over a ballroom floor whose dark tiles go out; a paper
// dunce hood pulled down past the eyes; the sun occulted and its umbra racing
// across the board; a ceiling coming down in dust; a glass floor crazing to
// milk; a taper burning down inside a shrinking ring of light; a quilt drawn up
// over the heavy pieces; sand falling through an hourglass on a throne arm; a
// black cloth laid over a ledger; a fog bank rolling in behind a parley flag;
// a smoke plume swallowing a work crew; a thumb sliding over a watch dial; a
// folding screen closing round the bench; a stage curtain drawing along its
// rail; a mirror fogging with breath; an inkwell going over on a ruled page; a
// lantern shutter closing to a slit; a redaction bar brushed down a file;
// moths eating the dark out of a glove; a barrow of muck tipped over a rank;
// and a bowstring going slack under a hand cupped over the archer's eye.
//
// Rules kept everywhere: three beats (a tell of at most ~300ms, the strike,
// then a decaying settle); five or more animated layers in every lead cut, six
// or more for tier 7-8; exactly three palette colours per card (core / glow /
// deep accent), warm whites and never pure #fff; anything that means THE WHOLE
// BOARD lives inside <BoardFrame> so it stays exactly the board at any anchor;
// at least one animated layer per scene is driven by the geometry vars
// (--fx-side, --fx-ox/--fx-oy, --fx-len); every card declares anchor "cast" or
// "aim"; and every scene answers all three roles, entrance included.
//
// `source` is declared only where the card really does decorate pieces that
// STAY on the board and the zone exists: motif "blindfold" and motif "slow"
// cards name their motif zone, The Big Nap names "frozen" (it lays real freeze
// effects on the heavy pieces). Cards whose fx motif is muzzle / jail / anchor,
// and the clock buffs, have no matching zone and omit it rather than guess.

import "./g22VeilPlays.css";

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
const rootStyle = (d: number): CSSProperties => ({ "--g22-d": `${d}ms` }) as CSSProperties;

/** stagger + a beat offset, scaled by the Settings animation-speed var. */
const b = (ms: number): string => `calc(var(--g22-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

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
function Lead({ d, frame, imp, children }: { d: number; frame?: ReactNode; imp?: ImpCue; children: ReactNode }) {
  const inner = (
    <>
      {frame ? <BoardFrame>{frame}</BoardFrame> : null}
      {children}
      {imp ? <ImpactHit d={d} imp={imp} /> : null}
    </>
  );
  return (
    <span className={ROOT} style={rootStyle(d)} aria-hidden="true">
      <BoardWideStage>
        {imp ? (
          <QuakeBox d={d} imp={imp}>
            {inner}
          </QuakeBox>
        ) : (
          inner
        )}
      </BoardWideStage>
    </span>
  );
}

/** Aim-anchored lead: `frame` stays square with the board, the art rotates. */
function AimLead({ d, frame, imp, children }: { d: number; frame?: ReactNode; imp?: ImpCue; children: ReactNode }) {
  const inner = (
    <>
      {children}
      {imp ? <ImpactHit d={d} imp={imp} /> : null}
    </>
  );
  return (
    <span className={ROOT} style={rootStyle(d)} aria-hidden="true">
      {frame ? (
        <BoardWideStage>
          <BoardFrame>{frame}</BoardFrame>
        </BoardWideStage>
      ) : null}
      <AimStage>
        {imp ? (
          <QuakeBox d={d} imp={imp}>
            {inner}
          </QuakeBox>
        ) : (
          inner
        )}
      </AimStage>
    </span>
  );
}

/* =============================================================================
   FLAGSHIP IMPACT LAYER - the shared violence vocabulary (impact/impact.tsx)
   staged per card. Each lead names ONE cue in IMP: the moment its own action
   physically LANDS. The laser leads the beat by 0.4s; the shatter halves,
   shard spray, ground shockwave and the whole-stage quake all land ON `at`,
   so the composite reads as one hit. `x`/`y` are % of the 14-cell stage
   (`far` parks the hit at the aim lane's far end instead), `rot` turns the
   whole composite so a column can strike along the lane or up from the ground,
   and `rgb` stays inside the card's own three-colour palette. Kill switch:
   every node rides a `g22-impx` wrapper, covered by this module's prefix
   rule; the imp-* internals are covered by the global data-anim gate.
   ========================================================================== */
interface ImpCue {
  /** ms after the lead's own delay: the impact beat. */
  at: number;
  /** centre of the struck cell, % of the stage (ignored when `far`). */
  x?: number;
  y?: number;
  /** "r g b" tint, from the card's own palette. */
  rgb: string;
  /** the descending column of light. */
  laser?: boolean;
  /** index into IMPACT_GLYPHS: silhouette split in half on the beat. */
  glyph?: number;
  /** a second, later shockwave: the double boom. */
  boom?: boolean;
  /** static rotation of the whole composite, deg. */
  rot?: number;
  /** box size, % of the stage. */
  size?: number;
  /** park the hit at the far end of the real aim lane. */
  far?: boolean;
}

const IMPACT_GLYPHS: ReactNode[] = [
  <svg key="a" viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
    <g style={{ fill: "rgb(var(--imp-rgb, 216 181 110))" }}><path d="M2 1h6v7.5l-1 1-1-1-1 1.4-1-1.2-1 .9-1-1z" /></g>
  </svg>,
  <svg key="b" viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
    <g style={{ fill: "rgb(var(--imp-rgb, 216 181 110))" }}><path d="M2.5 1h5v1.6L5.4 6l2.1 3.4V11h-5V9.4L4.6 6 2.5 2.6z" /></g>
  </svg>,
];

/** The whole stage jolts on the cue's beat. Rides an INNER wrapper because the
 * stage canvas carries the anchor-clamp transform, which must never be
 * animated over. In-scene only: the real board crop never shakes. */
function QuakeBox({ d, imp, children }: { d: number; imp: ImpCue; children: ReactNode }) {
  return (
    <span className={`g22-impx ${QUAKE_CLASS} absolute inset-0 block`} style={impactVars(undefined, (d + imp.at) / 1000)}>
      {children}
    </span>
  );
}

/** The composite hit itself: laser column, split silhouette, shockwave(s). */
function ImpactHit({ d, imp }: { d: number; imp: ImpCue }) {
  const size = imp.size ?? 7.2;
  const pos = imp.far
    ? { left: `calc(50% + var(--fx-len, 3) * 7.142857% - ${(size / 2).toFixed(3)}%)`, top: `${((imp.y ?? 50) - size / 2).toFixed(3)}%` }
    : { left: `${((imp.x ?? 50) - size / 2).toFixed(3)}%`, top: `${((imp.y ?? 50) - size / 2).toFixed(3)}%` };
  return (
    <span
      className="g22-impx absolute block"
      style={{
        ...pos,
        width: `${size}%`,
        height: `${size}%`,
        ...(imp.rot ? { transform: `rotate(${imp.rot}deg)` } : null),
        ...impactVars(imp.rgb, (d + imp.at) / 1000),
      }}
    >
      {imp.laser ? <LaserStrike /> : null}
      {imp.glyph != null ? <PieceShatter glyph={IMPACT_GLYPHS[imp.glyph]} /> : null}
      <Shockwave />
      {imp.boom ? (
        <span className="g22-impx absolute inset-0 block" style={impactVars(imp.rgb, (d + imp.at + 200) / 1000)}>
          <Shockwave />
        </span>
      ) : null}
    </span>
  );
}

/** THE IMPACT CUE SHEET: one named moment of physical contact per card,
 * choreographed onto that card's own climax - position, beat, tint and
 * primitive combo all differ per card, so no two siblings land the same hit. */
const IMP: Record<string, ImpCue> = {
  // Great Waltz: THE VEIL TORN MID-TURN - a light seam splits the curtain and the ballroom jolts
  hx4_great_waltz: { at: 1050, x: 50, y: 47, rgb: "201 162 216", laser: true, glyph: 0, boom: true },
  // Donkey Ears: THE HOOD YANKED - the veil is torn off in two halves under a light shaft
  hx4_donkey_ears: { at: 980, x: 52, y: 44, rgb: "232 201 138", laser: true, glyph: 0 },
  // Eclipse: THE CORONA SNAP - totality lands as a column with a double ground ring
  hx4_eclipse: { at: 1000, x: 50, y: 42, rgb: "255 176 102", laser: true, boom: true },
  // Falling Rubble: THE CEILING LETS GO - the slab bursts apart where it lands
  hx4_falling_rubble: { at: 940, x: 49, y: 55, rgb: "168 154 134", glyph: 0, boom: true, size: 8 },
  // The Long Night: THE LAST LAMP SPIKED - the final light is driven down into the dark
  hx4_the_long_night: { at: 1020, x: 50, y: 45, rgb: "255 210 138", laser: true, boom: true },
  // Hourglass Throne: THE GLASS TURNED AND SPLIT - the hourglass cracks along the waist
  bn4_hourglass_throne: { at: 940, x: 50, y: 49, rgb: "227 182 97", laser: true, glyph: 1 },
  // Tithe of Time: THE COLLECTION STRIKE - the tithe is exacted with a beam and a double toll
  bn4_tithe_of_time: { at: 900, x: 53, y: 47, rgb: "169 180 188", laser: true, boom: true },
  // White Flag Hour: THE POLE PLANT - the flag staff is driven in at a lean
  hx4_white_flag_hour: { at: 880, x: 50, y: 44, rgb: "207 216 210", laser: true, rot: 8 },
  // Smoke Break Union: THE SHIFT WHISTLE SHAFT - one light shaft cuts the smoke
  bn4_smoke_break_union: { at: 860, x: 47, y: 50, rgb: "214 160 90", laser: true },
  // Stolen Hour: THE HOUR SNAPPED IN HALF - the stolen glass breaks in the thief's grip
  bn4_stolen_hour: { at: 920, x: 52, y: 48, rgb: "224 160 138", glyph: 1, boom: true },
  // Court in Session: THE SESSION GAVEL - the opening strike lands as a verdict column
  hx4_court_in_session: { at: 900, x: 50, y: 46, rgb: "163 122 78", laser: true, boom: true },
  // Drawn Curtain: THE CURTAIN TEARS ON THE SEAM - light splits the drape top to hem
  hx4_drawn_curtain: { at: 940, x: 50, y: 50, rgb: "176 56 79", laser: true, glyph: 0 },
  // Lockstep: THE DOUBLE STAMP - both files stamp on the same beat, twice
  hx4_lockstep: { at: 880, x: 50, y: 53, rgb: "154 166 184", boom: true, size: 8 },
  // Night Ledger: THE ENTRY RULED OFF - one bright rule strikes the page shut
  hx4_night_ledger: { at: 860, x: 54, y: 48, rgb: "125 147 196", laser: true },
  // Night Watch Rota: THE ROUND'S END - the watch beam stabs the far post of the route
  hx4_night_watch_rota: { at: 900, rgb: "159 208 192", laser: true, far: true },
  // Censor's Ink: THE STRIKE-THROUGH - the redaction bar slams down at a pen angle
  hx4_censors_ink: { at: 840, x: 51, y: 49, rgb: "201 194 180", laser: true, rot: 12 },
  // Moth-Eaten Gloves: THE GLOVE COMES APART - the veil-cloth splits into ragged halves
  hx4_moth_eaten_gloves: { at: 860, x: 49, y: 51, rgb: "180 148 168", glyph: 0 },
  // Night Soil: THE CART DUMP - the load lands with an unglamorous double thud
  hx4_night_soil: { at: 820, x: 52, y: 56, rgb: "143 138 74", boom: true },
  // Slack Bowstrings: THE UNSTRUNG SNAP - the loosed string whips down the lane into the far post
  hx4_slack_bowstrings: { at: 880, rgb: "159 184 126", laser: true, rot: -90, far: true },
};


/** The light going out of the board. Always inside a <BoardFrame>. */
function Gloom({ tone, d = 0 }: { tone: string; d?: number }) {
  return (
    <L c="g22-gloom" d={d} st={{ background: `radial-gradient(circle at 50% 50%, ${tone}, transparent 74%)` }} />
  );
}

/** The dark rolling over the board from the CASTER's own side. BoardFrame. */
function Nightfall({ tone, d = 130 }: { tone: string; d?: number }) {
  return <L c="g22-nightfall" d={d} st={{ background: `linear-gradient(180deg, ${tone}, transparent 78%)` }} />;
}

/** Sight closing in at the board margins. BoardFrame. */
function Vignette({ tone, d = 170 }: { tone: string; d?: number }) {
  return <L c="g22-vignette" d={d} st={{ boxShadow: `inset 0 0 34px 13px ${tone}` }} />;
}

/* Piece silhouettes: the things that stop being visible. */
const PAWN = "M12 4.4a2.7 2.7 0 0 1 1.6 4.9l1.8 6.4H8.6l1.8-6.4A2.7 2.7 0 0 1 12 4.4z M7.4 16.8h9.2V19.4H7.4z";
const KING = "M11.1 2.4h1.8v1.5h1.5v1.8h-1.5v1.6h-1.8V5.7H9.6V3.9h1.5zM8 9.2h8l-1.1 7.4H9.1zM7.2 17.6h9.6V20H7.2z";
const KNIGHT = "M8.2 19V13c0-3.8 2.5-5.9 4.6-6.5L12 4.2l3 1.2c2 .9 2.9 2.9 2.9 5.9V19z";
const ROOK = "M7 4.8h2.3v1.6h1.6V4.8h2.2v1.6h1.6V4.8H17v3.6h-1.2v6.8H17V19H7v-3.8h1.2V8.4H7z";
const QUEEN = "M6.4 6l1.3 3.2L9.4 6.6 12 9.4l2.6-2.8 1.7 2.6L17.6 6l-1 10.4H7.4zM7 17.4h10v2.4H7z";

/* --- 1. The Great Waltz (t8) — THE MASQUE ------------------------------------
   A domino mask on its stick is lowered over the floor, the dark tiles of the
   ballroom go out one two three, and a masked pair turns once through the
   shadow with their hem sweeping the boards. Palette: #c9a2d8 / #fff2dc /
   #241a30. */
const GW_TILES: Array<[number, number]> = [[38, 40], [52, 46], [45, 54]];

function GreatWaltzScene({ role, delayMs }: SceneProps) {
  const mask = (
    <g {...SJ}>
      <path
        d="M2 9.4c0-2.7 3.6-3.8 10-3.8s10 1.1 10 3.8c0 3.5-2.5 6.6-5.6 6.6-1.9 0-3.1-1.1-3.7-2.6h-1.4c-.6 1.5-1.8 2.6-3.7 2.6C4.5 16 2 12.9 2 9.4z"
        fill="#c9a2d8"
        stroke="#241a30"
        strokeWidth="1.1"
      />
      <path d="M5.6 9.6c1.4-1.2 3.4-1.2 4.8 0-1.4 1.3-3.4 1.3-4.8 0zM13.6 9.6c1.4-1.2 3.4-1.2 4.8 0-1.4 1.3-3.4 1.3-4.8 0z" fill="#241a30" />
      <path d="M12 16v6.4" stroke="#241a30" strokeWidth="1.3" />
    </g>
  );
  const pair = (
    <g {...SJ}>
      <path d={PAWN} fill="#241a30" />
      <path d="M14.6 6.6c1.9 0 2.9 1.4 2.9 3.4L17 20h-4.2l-.4-9.8c0-2 1-3.6 2.2-3.6z" fill="#c9a2d8" opacity="0.85" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g22-ent-drop" l={10} t={20} w={80} h={48} d={40}>{mask}</V>
        {GW_TILES.map((_, i) => (
          <L key={i} c="g22-gw-tile" l={8 + i * 30} t={64} w={22} h={22} d={240 + i * 90} st={{ background: "#241a30" }} />
        ))}
        <V c="g22-ent-pop" l={34} t={30} w={34} h={44} d={470}>{pair}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g22-hitside" l={10} t={10} w={80} h={80} d={0} st={{ background: "#241a30" }} />
        <V c="g22-hit" l={16} t={26} w={68} h={44} d={150}>{mask}</V>
        <L c="g22-hit2" l={40} t={72} w={20} h={5} d={260} st={{ borderRadius: "999px", background: "#c9a2d8" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_great_waltz}
      d={delayMs}
      frame={
        <>
          <Gloom tone="rgba(201,162,216,0.3)" />
          <Nightfall tone="rgba(36,26,48,0.62)" />
        </>
      }
    >
      {GW_TILES.map(([l, t], i) => (
        <L key={i} c="g22-gw-tile" l={l} t={t} w={7} h={7} d={90 + i * 110} st={{ background: "#241a30" }} />
      ))}
      <V c="g22-gw-mask" l={41} t={33} w={18} h={16} d={240}>{mask}</V>
      <V c="g22-gw-turn" l={45} t={42} w={10} h={13} d={430}>{pair}</V>
      <L c="g22-gw-hem" l={39} t={52} w={22} h={6} d={560} st={{ borderRadius: "999px", background: "linear-gradient(90deg, transparent, #c9a2d8, transparent)" }} />
      <L c="g22-lean" l={42} t={56} w={16} h={3} d={640} st={{ borderRadius: "999px", background: "rgba(36,26,48,0.7)" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g22-drift" l={43 + i * 9} t={48} w={1.6} h={1.6} d={700 + i * 110} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      ))}
    </Lead>
  );
}

/* --- 2. Donkey Ears (t7) — THE HOOD COMES DOWN -------------------------------
   The crown is lifted off, a paper dunce hood is pulled down past the brow,
   and two long ears flop forward across the eye slit until nothing is looking
   out of it. Palette: #e8c98a / #fff4d6 / #3a2a12. */
function DonkeyEarsScene({ role, delayMs }: SceneProps) {
  const hood = (
    <path d="M12 2.2 19.4 21H4.6z" fill="#e8c98a" stroke="#3a2a12" strokeWidth="1.2" {...SJ} />
  );
  const ear = (
    <path d="M12 21c-3.4-2-4.8-6-4.6-11.2C7.6 5.4 9.4 3 12 3s4.4 2.4 4.6 6.8C16.8 15 15.4 19 12 21z" fill="#e8c98a" stroke="#3a2a12" strokeWidth="1.1" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g22-de-cap" l={26} t={8} w={48} h={56} d={40}>{hood}</V>
        <V c="g22-de-ear" l={6} t={30} w={30} h={56} d={260} st={{ transformOrigin: "70% 10%" }}>{ear}</V>
        <V c="g22-de-ear" l={64} t={30} w={30} h={56} d={380} st={{ transformOrigin: "30% 10%" }}>{ear}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g22-hitside" l={28} t={6} w={44} h={54} d={0}>{hood}</V>
        <V c="g22-hit" l={12} t={34} w={30} h={54} d={140}>{ear}</V>
        <L c="g22-hit2" l={30} t={56} w={40} h={4} d={250} st={{ borderRadius: "999px", background: "#3a2a12" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_donkey_ears}
      d={delayMs}
      frame={
        <>
          <Gloom tone="rgba(232,201,138,0.26)" />
          <Vignette tone="rgba(58,42,18,0.42)" />
        </>
      }
    >
      <V c="g22-de-crown" l={45} t={33} w={10} h={10} d={80}><path d={KING} fill="none" stroke="#fff4d6" strokeWidth="1.5" {...SJ} /></V>
      <V c="g22-de-cap" l={43} t={36} w={14} h={16} d={260}>{hood}</V>
      <V c="g22-de-ear" l={37} t={38} w={8} h={16} d={420} st={{ transformOrigin: "80% 12%" }}>{ear}</V>
      <V c="g22-de-ear" l={55} t={38} w={8} h={16} d={520} st={{ transformOrigin: "20% 12%" }}>{ear}</V>
      <L c="g22-de-slit" l={44} t={45} w={12} h={1.6} d={640} st={{ borderRadius: "999px", background: "#3a2a12" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g22-grit" l={42 + i * 7} t={44} w={1.8} h={2.4} d={700 + i * 100} st={{ background: "#fff4d6" }} />
      ))}
    </Lead>
  );
}

/* --- 3. Eclipse (t7) — THE SUN GOES OUT --------------------------------------
   A low sun stands over the enemy camp, a black disc slides in across it from
   the caster's side, the corona flares once, and the umbra runs the whole
   board while cold stars prick out. Palette: #ffb066 / #fff2dc / #1a1408. */
function EclipseScene({ role, delayMs }: SceneProps) {
  const sun = (
    <g {...SJ}>
      <circle cx="12" cy="12" r="6.4" fill="#ffb066" />
      <path d="M12 1.4v3M12 19.6v3M1.4 12h3M19.6 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M19.4 4.6l-2.1 2.1M6.7 17.3l-2.1 2.1" stroke="#ffb066" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g22-ent-pop" l={20} t={20} w={60} h={60} d={40}>{sun}</V>
        <L c="g22-ec-occult" l={22} t={22} w={56} h={56} d={260} st={{ borderRadius: "50%", background: "#1a1408" }} />
        <L c="g22-ec-corona" l={14} t={14} w={72} h={72} d={470} st={{ borderRadius: "50%", border: "2px solid #fff2dc" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g22-hit" l={18} t={18} w={64} h={64} d={0}>{sun}</V>
        <L c="g22-hitside" l={20} t={20} w={60} h={60} d={130} st={{ borderRadius: "50%", background: "#1a1408" }} />
        <V c="g22-hit2" l={36} t={34} w={28} h={40} d={260}><path d={PAWN} fill="#ffb066" /></V>
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_eclipse}
      d={delayMs}
      frame={
        <>
          <Gloom tone="rgba(255,176,102,0.28)" />
          <L c="g22-ec-umbra" d={300} st={{ background: "linear-gradient(180deg, rgba(26,20,8,0.86), rgba(26,20,8,0.2))" }} />
        </>
      }
    >
      <V c="g22-ec-sun" l={41} t={35} w={18} h={18} d={80}>{sun}</V>
      <L c="g22-ec-occult" l={42} t={36} w={16} h={16} d={260} st={{ borderRadius: "50%", background: "#1a1408" }} />
      <L c="g22-ec-corona" l={38} t={32} w={24} h={24} d={460} st={{ borderRadius: "50%", border: "2px solid #fff2dc" }} />
      <V c="g22-ec-dim" l={45} t={52} w={10} h={13} d={640}><path d={PAWN} fill="none" stroke="#ffb066" strokeWidth="1.4" {...SJ} /></V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g22-glint" l={36 + i * 13} t={30 + (i % 2) * 12} w={1.8} h={1.8} d={700 + i * 90} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      ))}
    </Lead>
  );
}

/* --- 4. Falling Rubble (t7) — THE CEILING COMES DOWN --------------------------
   A hairline crack runs across the vault, four blocks of masonry let go and
   tumble, and the dust that comes up behind them takes the square out of the
   game entirely. Palette: #a89a86 / #fff0d4 / #2b241a. */
const FR_BLOCKS: Array<[number, number]> = [[40, 30], [50, 26], [45, 22], [55, 32]];

function FallingRubbleScene({ role, delayMs }: SceneProps) {
  const block = (
    <g {...SJ}>
      <path d="M3 6h18v12H3z" fill="#a89a86" stroke="#2b241a" strokeWidth="1.2" />
      <path d="M3 12h18M9 6v6M15 12v6" stroke="#2b241a" strokeWidth="0.9" />
    </g>
  );
  const crack = (
    <path d="M1 8l5 3-3 3 6 1-2 4 5-2 2 5 3-6 5 2" fill="none" stroke="#fff0d4" strokeWidth="1.3" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g22-fr-crack" l={4} t={12} w={92} h={34} d={40}>{crack}</V>
        <V c="g22-fr-block" l={18} t={30} w={34} h={34} d={260}>{block}</V>
        <V c="g22-fr-block" l={52} t={38} w={34} h={34} d={380}>{block}</V>
        <L c="g22-fr-plume" l={10} t={54} w={80} h={40} d={520} st={{ background: "radial-gradient(circle at 50% 80%, rgba(168,154,134,0.9), transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g22-hit" l={10} t={8} w={80} h={30} d={0}>{crack}</V>
        <V c="g22-hitside" l={28} t={26} w={44} h={44} d={140}>{block}</V>
        <L c="g22-hit2" l={12} t={54} w={76} h={40} d={260} st={{ background: "radial-gradient(circle at 50% 80%, rgba(168,154,134,0.85), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_falling_rubble}
      d={delayMs}
      frame={
        <>
          <Gloom tone="rgba(168,154,134,0.3)" />
          <Nightfall tone="rgba(43,36,26,0.6)" />
        </>
      }
    >
      <V c="g22-fr-crack" l={34} t={30} w={32} h={12} d={90}>{crack}</V>
      {FR_BLOCKS.map(([l, t], i) => (
        <V key={i} c="g22-fr-block" l={l} t={t} w={7} h={7} d={260 + i * 90}>{block}</V>
      ))}
      <L c="g22-fr-plume" l={36} t={40} w={28} h={22} d={520} st={{ background: "radial-gradient(circle at 50% 80%, rgba(168,154,134,0.9), transparent 70%)" }} />
      <V c="g22-fr-heap" l={39} t={49} w={22} h={9} d={620}>
        <path d="M1 20h22l-4-5-3 2-4-6-4 6-3-2z" fill="#a89a86" stroke="#2b241a" strokeWidth="1.1" {...SJ} />
      </V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g22-grit" l={41 + i * 8} t={42} w={1.6} h={2.2} d={690 + i * 100} st={{ background: "#fff0d4" }} />
      ))}
    </Lead>
  );
}

/* --- 5. Glass Floor (t7) — THE PANE GOES TO MILK ------------------------------
   A sheen runs across the dark squares to show they are glass now, a star of
   crazing opens under the weight, the whole pane clouds to milk, and whatever
   was standing on it is simply not there to see. Palette: #bfe4ee / #fff4e2 /
   #16323a. */
function GlassFloorScene({ role, delayMs }: SceneProps) {
  const craze = (
    <g fill="none" stroke="#bfe4ee" strokeWidth="1.1" {...SJ}>
      <path d="M12 12 3 5M12 12l9-6M12 12l-8 8M12 12l7 9M12 12l-11 1M12 12l11 2" />
      <path d="M7.6 8.4 6 15.4M16.4 8 19 14.6" strokeWidth="0.8" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g22-gf-sheen" l={4} t={30} w={92} h={40} d={40} st={{ background: "linear-gradient(105deg, transparent, #fff4e2, transparent)" }} />
        <V c="g22-gf-craze" l={14} t={14} w={72} h={72} d={260}>{craze}</V>
        <L c="g22-gf-milk" l={12} t={12} w={76} h={76} d={470} st={{ background: "radial-gradient(circle, rgba(191,228,238,0.92), rgba(191,228,238,0.3))" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g22-hit" l={12} t={12} w={76} h={76} d={0}>{craze}</V>
        <L c="g22-hitside" l={14} t={14} w={72} h={72} d={140} st={{ background: "radial-gradient(circle, rgba(191,228,238,0.9), rgba(191,228,238,0.25))" }} />
        <L c="g22-hit2" l={44} t={44} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#fff4e2" }} />
      </Cut>
    );
  }
  return null;
}

/* --- 6. The Long Night (t7) — THE TAPER BURNS DOWN ----------------------------
   One taper is all the light there is. It gutters down to a stub, the ring it
   can reach closes to a single square, a snuffer cap comes over it, and the
   dark takes the rest of the board. Palette: #ffd28a / #fff2dc / #14121e. */
function TheLongNightScene({ role, delayMs }: SceneProps) {
  const taper = (
    <g {...SJ}>
      <path d="M9.6 9h4.8v12H9.6z" fill="#fff2dc" stroke="#14121e" strokeWidth="1.1" />
      <path d="M7.4 21h9.2" stroke="#14121e" strokeWidth="1.4" />
    </g>
  );
  const flame = <path d="M12 2.6c2.2 3.8 4.2 5.8 4.2 8.6a4.2 4.2 0 0 1-8.4 0c0-2.8 2-4.8 4.2-8.6z" fill="#ffd28a" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g22-ent-rise" l={32} t={34} w={36} h={56} d={40}>{taper}</V>
        <V c="g22-ln-flame" l={36} t={6} w={28} h={34} d={250} st={{ transformOrigin: "50% 100%" }}>{flame}</V>
        <L c="g22-ln-ring" l={14} t={20} w={72} h={72} d={460} st={{ borderRadius: "50%", border: "2px solid #ffd28a" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g22-hitside" l={34} t={30} w={32} h={56} d={0}>{taper}</V>
        <V c="g22-hit" l={38} t={4} w={24} h={30} d={140} st={{ transformOrigin: "50% 100%" }}>{flame}</V>
        <L c="g22-hit2" l={18} t={18} w={64} h={64} d={260} st={{ borderRadius: "50%", border: "2px solid #ffd28a" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_the_long_night}
      d={delayMs}
      frame={
        <>
          <Gloom tone="rgba(255,210,138,0.24)" />
          <Nightfall tone="rgba(20,18,30,0.82)" />
        </>
      }
    >
      <V c="g22-ln-candle" l={45} t={42} w={10} h={16} d={80}>{taper}</V>
      <V c="g22-ln-flame" l={46} t={36} w={8} h={9} d={240} st={{ transformOrigin: "50% 100%" }}>{flame}</V>
      <L c="g22-ln-ring" l={30} t={30} w={40} h={40} d={420} st={{ borderRadius: "50%", border: "2px solid #ffd28a" }} />
      <V c="g22-ln-snuff" l={45} t={30} w={10} h={11} d={560}>
        <path d="M12 3 20 20H4z" fill="#14121e" stroke="#ffd28a" strokeWidth="1.2" {...SJ} />
      </V>
      <L c="g22-ln-smoke" l={48} t={34} w={2} h={10} d={680} st={{ borderRadius: "999px", background: "linear-gradient(180deg, transparent, #fff2dc)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g22-glint" l={36 + i * 14} t={28 + (i % 2) * 16} w={1.6} h={1.6} d={720 + i * 90} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      ))}
    </Lead>
  );
}

/* --- 7. The Big Nap (t7) — THE QUILT GOES OVER --------------------------------
   Night falls on the heavy pieces: a quilt is drawn up over them from the
   caster's side, a nightcap tips onto the tallest one, and the Zs come off the
   whole row. Palette: #8fa0d8 / #fff2dc / #1a1c30. */
function BigNapScene({ role, delayMs }: SceneProps) {
  const cap = (
    <g {...SJ}>
      <path d="M4 15c0-6 3.6-10 8-10 2 0 3.2 1.4 3.2 3.4 0 3.4-2.6 5-2.6 6.6z" fill="#8fa0d8" stroke="#1a1c30" strokeWidth="1.1" />
      <circle cx="14.4" cy="16.6" r="2.4" fill="#fff2dc" />
      <path d="M3 15h10.4v2.6H3z" fill="#fff2dc" stroke="#1a1c30" strokeWidth="0.9" />
    </g>
  );
  const zzz = (
    <g fill="none" stroke="#fff2dc" strokeWidth="1.5" {...SJ}>
      <path d="M4 6h5l-5 5h5M12 12h4l-4 4h4M18 2h3.4l-3.4 3.4h3.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g22-bn-piece" l={30} t={22} w={40} h={54} d={40}><path d={QUEEN} fill="#8fa0d8" /></V>
        <L c="g22-bn-quilt" l={4} t={54} w={92} h={40} d={250} st={{ background: "linear-gradient(180deg, #8fa0d8, #1a1c30)", transformOrigin: "50% 100%" }} />
        <V c="g22-ent-pop" l={50} t={6} w={40} h={40} d={470}>{zzz}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g22-hitside" l={32} t={18} w={36} h={52} d={0}><path d={KNIGHT} fill="#8fa0d8" /></V>
        <L c="g22-hit2" l={6} t={52} w={88} h={34} d={140} st={{ background: "linear-gradient(180deg, #8fa0d8, #1a1c30)", transformOrigin: "50% 100%" }} />
        <V c="g22-hit" l={44} t={6} w={44} h={34} d={260}>{zzz}</V>
      </Cut>
    );
  }
  return null;
}

/* --- 8. Hourglass Throne (t6) — THE GLASS ON THE ARMREST ----------------------
   The hourglass is set down on the throne arm and turned. Sand leaves their
   bulb toward the caster's own side, the emptied glass frosts over, and the
   heap grows where nobody can read the time off it. Palette: #e3b661 /
   #fff4d6 / #2e2210. */
function HourglassThroneScene({ role, delayMs }: SceneProps) {
  const glass = (
    <g {...SJ}>
      <path d="M5 2.4h14M5 21.6h14" stroke="#e3b661" strokeWidth="1.6" />
      <path d="M6.6 2.4h10.8L12 12l5.4 9.6H6.6L12 12z" fill="none" stroke="#e3b661" strokeWidth="1.3" />
    </g>
  );
  const throne = (
    <g fill="none" stroke="#2e2210" strokeWidth="1.4" {...SJ}>
      <path d="M4 22V6.4l4-3.4 4 3.4 4-3.4 4 3.4V22" />
      <path d="M4 14h16" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g22-ent-rise" l={12} t={26} w={76} h={64} d={40}>{throne}</V>
        <V c="g22-ht-glass" l={28} t={16} w={44} h={64} d={260}>{glass}</V>
        <L c="g22-ht-stream" l={48} t={44} w={4} h={30} d={470} st={{ background: "#e3b661", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g22-hitside" l={26} t={10} w={48} h={70} d={0}>{glass}</V>
        <L c="g22-hit2" l={47} t={40} w={6} h={30} d={150} st={{ background: "#e3b661", transformOrigin: "50% 0%" }} />
        <L c="g22-hit" l={34} t={74} w={32} h={9} d={260} st={{ borderRadius: "999px", background: "#2e2210" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.bn4_hourglass_throne}
      d={delayMs}
      frame={
        <>
          <Gloom tone="rgba(227,182,97,0.26)" />
          <Vignette tone="rgba(46,34,16,0.44)" />
        </>
      }
    >
      <V c="g22-ht-throne" l={38} t={32} w={24} h={26} d={80}>{throne}</V>
      <V c="g22-ht-glass" l={44} t={35} w={12} h={20} d={250}>{glass}</V>
      <L c="g22-ht-stream" l={49.2} t={44} w={1.6} h={9} d={430} st={{ background: "#e3b661", transformOrigin: "50% 0%" }} />
      <L c="g22-ht-drain" l={45} t={36} w={10} h={8} d={560} st={{ background: "linear-gradient(180deg, rgba(46,34,16,0.85), transparent)" }} />
      <L c="g22-ht-pile" l={45} t={52} w={10} h={3} d={660} st={{ borderRadius: "999px", background: "#fff4d6" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g22-grit" l={47 + i * 3} t={47} w={1.3} h={1.7} d={720 + i * 90} st={{ background: "#e3b661" }} />
      ))}
    </Lead>
  );
}

/* --- 9. Tithe of Time (t6) — THE CLOTH OVER THE LEDGER ------------------------
   The collection plate goes round, a minute is dropped into it as a coin, and
   then a black cloth is laid across the ledger so the column that was owed can
   no longer be read. Palette: #a9b4bc / #fff2dc / #1b2126. */
function TitheOfTimeScene({ role, delayMs }: SceneProps) {
  const plate = (
    <g {...SJ}>
      <path d="M2 12c0 3.4 4.4 5.6 10 5.6S22 15.4 22 12z" fill="#a9b4bc" stroke="#1b2126" strokeWidth="1.2" />
      <path d="M2 12c0-1.8 4.4-3 10-3s10 1.2 10 3" fill="none" stroke="#fff2dc" strokeWidth="1" />
    </g>
  );
  const tally = (
    <g fill="none" stroke="#1b2126" strokeWidth="1.4" {...SJ}>
      <path d="M5 5v14M9 5v14M13 5v14M17 5v14M3 15 19 9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g22-ent-rise" l={14} t={40} w={72} h={44} d={40}>{plate}</V>
        <L c="g22-tt-coin" l={44} t={4} w={14} h={14} d={260} st={{ borderRadius: "50%", background: "#fff2dc" }} />
        <L c="g22-tt-cloth" l={4} t={20} w={92} h={34} d={470} st={{ background: "linear-gradient(90deg, #1b2126, rgba(27,33,38,0.5))", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g22-hit" l={16} t={16} w={68} h={54} d={0}>{tally}</V>
        <L c="g22-hitside" l={8} t={30} w={84} h={26} d={140} st={{ background: "linear-gradient(90deg, #1b2126, rgba(27,33,38,0.55))", transformOrigin: "0% 50%" }} />
        <L c="g22-hit2" l={44} t={60} w={12} h={12} d={260} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.bn4_tithe_of_time}
      d={delayMs}
      frame={
        <>
          <Gloom tone="rgba(169,180,188,0.26)" />
          <Vignette tone="rgba(27,33,38,0.46)" />
        </>
      }
    >
      <V c="g22-tt-plate" l={41} t={45} w={18} h={11} d={80}>{plate}</V>
      <L c="g22-tt-coin" l={48} t={33} w={4} h={4} d={260} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      <V c="g22-tt-tally" l={40} t={36} w={20} h={14} d={420}>{tally}</V>
      <L c="g22-tt-cloth" l={37} t={35} w={26} h={16} d={540} st={{ background: "linear-gradient(90deg, #1b2126, rgba(27,33,38,0.55))", transformOrigin: "0% 50%" }} />
      <V c="g22-tt-seal" l={53} t={44} w={8} h={8} d={660}>
        <circle cx="12" cy="12" r="8.4" fill="#a9b4bc" stroke="#1b2126" strokeWidth="1.4" />
        <path d="M8 12h8M12 8v8" stroke="#1b2126" strokeWidth="1.3" {...SJ} />
      </V>
      {[0, 1].map((i) => (
        <L key={i} c="g22-drift" l={44 + i * 9} t={44} w={1.6} h={1.6} d={720 + i * 100} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      ))}
    </Lead>
  );
}

/* --- 10. White Flag Hour (t6) — THE PARLEY FOG --------------------------------
   The pole goes up, the white flag shakes out, and the fog that always comes
   with a truce rolls over the board from the caster's line until no one can
   find anyone to fight. Palette: #cfd8d2 / #fff4e0 / #2c3630. */
function WhiteFlagHourScene({ role, delayMs }: SceneProps) {
  const flag = (
    <g {...SJ}>
      <path d="M6 2v20" stroke="#2c3630" strokeWidth="1.6" />
      <path d="M6.8 3.4h12.6l-2.6 3.8 2.6 3.8H6.8z" fill="#fff4e0" stroke="#2c3630" strokeWidth="1" />
    </g>
  );
  const blade = (
    <g {...SJ}>
      <path d="M12 2v14M8.6 16h6.8M12 16v5" stroke="#cfd8d2" strokeWidth="1.8" fill="none" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g22-wf-pole" l={16} t={10} w={4} h={78} d={40} st={{ background: "#2c3630", transformOrigin: "50% 100%" }} />
        <V c="g22-wf-flag" l={18} t={14} w={64} h={34} d={250} st={{ transformOrigin: "0% 50%" }}>{flag}</V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g22-wf-wisp" l={2 + i * 26} t={56 + i * 8} w={44} h={9} d={460 + i * 100} st={{ borderRadius: "999px", background: "linear-gradient(90deg, transparent, #cfd8d2, transparent)" }} />
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g22-hitside" l={16} t={6} w={56} h={70} d={0}>{flag}</V>
        <V c="g22-hit" l={54} t={30} w={34} h={54} d={140}>{blade}</V>
        <L c="g22-hit2" l={4} t={62} w={92} h={12} d={260} st={{ borderRadius: "999px", background: "linear-gradient(90deg, transparent, #cfd8d2, transparent)" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_white_flag_hour}
      d={delayMs}
      frame={
        <>
          <Gloom tone="rgba(207,216,210,0.3)" />
          <L c="g22-wf-fog" d={280} st={{ background: "linear-gradient(180deg, rgba(207,216,210,0.9), rgba(207,216,210,0.18))" }} />
        </>
      }
    >
      <L c="g22-wf-pole" l={43} t={32} w={1.6} h={24} d={80} st={{ background: "#2c3630", transformOrigin: "50% 100%" }} />
      <V c="g22-wf-flag" l={44} t={33} w={16} h={9} d={240} st={{ transformOrigin: "0% 50%" }}>{flag}</V>
      <V c="g22-wf-blade" l={53} t={44} w={9} h={13} d={470}>{blade}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g22-wf-wisp" l={34 + i * 8} t={47 + i * 4} w={26} h={3} d={580 + i * 110} st={{ borderRadius: "999px", background: "linear-gradient(90deg, transparent, #cfd8d2, transparent)" }} />
      ))}
      <L c="g22-lean" l={41} t={57} w={20} h={3} d={720} st={{ borderRadius: "999px", background: "rgba(44,54,48,0.6)" }} />
    </Lead>
  );
}

/* --- 11. Smoke Break Union (t5) — THE CREW DOWNS TOOLS ------------------------
   The hard hat tips back, a match flares, the tool goes down on the boards,
   and the plume that comes off the break swallows the square whole. Palette:
   #d6a05a / #fff2dc / #241c14. */
function SmokeBreakScene({ role, delayMs }: SceneProps) {
  const hat = (
    <g {...SJ}>
      <path d="M5 15c0-4.4 3.2-7.6 7-7.6s7 3.2 7 7.6z" fill="#d6a05a" stroke="#241c14" strokeWidth="1.2" />
      <path d="M2.4 15h19.2v2.4H2.4z" fill="#d6a05a" stroke="#241c14" strokeWidth="1" />
      <path d="M12 7.4V15" stroke="#241c14" strokeWidth="1" />
    </g>
  );
  const tool = (
    <g {...SJ}>
      <path d="M4 20 16 8" stroke="#241c14" strokeWidth="2" />
      <path d="M14 4.4l5.6 5.6-3 3-5.6-5.6z" fill="#d6a05a" stroke="#241c14" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g22-sb-hat" l={22} t={20} w={56} h={44} d={40} st={{ transformOrigin: "50% 100%" }}>{hat}</V>
        <L c="g22-sb-match" l={56} t={44} w={16} h={16} d={250} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff2dc, transparent 68%)" }} />
        <L c="g22-sb-plume" l={16} t={30} w={68} h={62} d={460} st={{ background: "radial-gradient(circle at 50% 80%, rgba(214,160,90,0.85), transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g22-hitside" l={24} t={16} w={52} h={44} d={0} st={{ transformOrigin: "50% 100%" }}>{hat}</V>
        <V c="g22-hit" l={16} t={44} w={44} h={44} d={140}>{tool}</V>
        <L c="g22-hit2" l={18} t={24} w={64} h={60} d={260} st={{ background: "radial-gradient(circle at 50% 80%, rgba(214,160,90,0.8), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.bn4_smoke_break_union}
      d={delayMs}
      frame={
        <>
          <Gloom tone="rgba(214,160,90,0.28)" />
          <Nightfall tone="rgba(36,28,20,0.6)" />
        </>
      }
    >
      <V c="g22-sb-hat" l={42} t={36} w={13} h={10} d={80} st={{ transformOrigin: "50% 100%" }}>{hat}</V>
      <L c="g22-sb-match" l={55} t={40} w={6} h={6} d={240} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff2dc, transparent 68%)" }} />
      <L c="g22-sb-plume" l={36} t={32} w={28} h={26} d={420} st={{ background: "radial-gradient(circle at 50% 80%, rgba(214,160,90,0.88), transparent 70%)" }} />
      <V c="g22-sb-tool" l={39} t={46} w={11} h={11} d={560} st={{ transformOrigin: "20% 90%" }}>{tool}</V>
      <L c="g22-lean" l={40} t={56} w={22} h={3} d={640} st={{ borderRadius: "999px", background: "rgba(36,28,20,0.66)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g22-grit" l={42 + i * 7} t={40} w={1.5} h={1.9} d={700 + i * 100} st={{ background: "#fff2dc" }} />
      ))}
    </Lead>
  );
}

/* --- 12. Stolen Hour (t5) — THE THUMB OVER THE DIAL ---------------------------
   The pocket watch swings in on its chain, the hand runs backward half a turn,
   and a thumb slides across the dial so the half hour it just lost cannot be
   checked. Palette: #e0a08a / #fff2dc / #2a1a18. */
function StolenHourScene({ role, delayMs }: SceneProps) {
  const watch = (
    <g {...SJ}>
      <circle cx="12" cy="13.4" r="8" fill="#2a1a18" stroke="#e0a08a" strokeWidth="1.4" />
      <path d="M10.6 2.6h2.8v3h-2.8z" fill="#e0a08a" stroke="#2a1a18" strokeWidth="0.9" />
      <path d="M12 8.4v5l3 2" stroke="#fff2dc" strokeWidth="1.3" fill="none" />
    </g>
  );
  const thumb = (
    <path d="M3 20.4V11c0-1.6 2-2.2 3.2-1.2l3.4 2.8V4.6c0-2 3-2 3 0v6.6l5.4 1.2c1.6.4 2.4 1.6 2 3.2l-1.2 4.8z" fill="#e0a08a" stroke="#2a1a18" strokeWidth="1.1" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g22-sh-chain" l={48} t={0} w={3} h={30} d={40} st={{ background: "#e0a08a", transformOrigin: "50% 0%" }} />
        <V c="g22-sh-watch" l={22} t={22} w={56} h={62} d={250} st={{ transformOrigin: "50% 0%" }}>{watch}</V>
        <V c="g22-sh-thumb" l={34} t={38} w={52} h={52} d={470}>{thumb}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g22-hitside" l={20} t={14} w={60} h={70} d={0}>{watch}</V>
        <V c="g22-hit" l={32} t={34} w={54} h={54} d={150}>{thumb}</V>
        <L c="g22-hit2" l={30} t={34} w={40} h={40} d={260} st={{ borderRadius: "50%", background: "#2a1a18" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.bn4_stolen_hour}
      d={delayMs}
      frame={
        <>
          <Gloom tone="rgba(224,160,138,0.26)" />
          <Vignette tone="rgba(42,26,24,0.44)" />
        </>
      }
    >
      <L c="g22-sh-chain" l={49.2} t={28} w={1.4} h={12} d={70} st={{ background: "#e0a08a", transformOrigin: "50% 0%" }} />
      <V c="g22-sh-watch" l={43} t={36} w={14} h={18} d={200} st={{ transformOrigin: "50% 0%" }}>{watch}</V>
      <V c="g22-sh-hand" l={46} t={41} w={8} h={8} d={360}>
        <path d="M12 12V5M12 12l4 3" stroke="#fff2dc" strokeWidth="1.6" fill="none" {...SJ} />
      </V>
      <V c="g22-sh-thumb" l={44} t={39} w={16} h={16} d={520}>{thumb}</V>
      <L c="g22-sh-blank" l={45.5} t={41} w={9} h={9} d={640} st={{ borderRadius: "50%", background: "#2a1a18" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g22-drift" l={44 + i * 10} t={40} w={1.6} h={1.6} d={710 + i * 110} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      ))}
    </Lead>
  );
}

/* --- 13. Court in Session (t5) — THE SCREEN ROUND THE BENCH -------------------
   The gavel comes down, and three panels of a folding screen swing shut around
   the king so that nobody standing next to him can see what to do. Palette:
   #a37a4e / #fff2dc / #241608. */
const CS_PANELS: Array<[number, number, string]> = [[36, 36, "-24deg"], [45, 34, "0deg"], [54, 36, "24deg"]];

function CourtInSessionScene({ role, delayMs }: SceneProps) {
  const gavel = (
    <g {...SJ}>
      <path d="M3 21 12 12" stroke="#241608" strokeWidth="2" />
      <path d="M11 6.6l6.4 6.4-3 3-6.4-6.4z" fill="#a37a4e" stroke="#241608" strokeWidth="1.1" />
    </g>
  );
  const panel = (
    <g {...SJ}>
      <path d="M6 2.4h12v19.2H6z" fill="#a37a4e" stroke="#241608" strokeWidth="1.2" />
      <path d="M8.4 5.6h7.2v6H8.4z" fill="none" stroke="#fff2dc" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g22-cs-gavel" l={8} t={8} w={48} h={48} d={40} st={{ transformOrigin: "20% 80%" }}>{gavel}</V>
        <V c="g22-cs-panel" l={26} t={30} w={26} h={58} d={260} st={{ transformOrigin: "100% 50%" }}>{panel}</V>
        <V c="g22-cs-panel" l={50} t={30} w={26} h={58} d={410} st={{ transformOrigin: "0% 50%" }}>{panel}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g22-hitside" l={10} t={8} w={48} h={48} d={0} st={{ transformOrigin: "20% 80%" }}>{gavel}</V>
        <L c="g22-hit2" l={12} t={54} w={76} h={4} d={140} st={{ borderRadius: "999px", background: "#fff2dc" }} />
        <V c="g22-hit" l={30} t={26} w={40} h={60} d={260}>{panel}</V>
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_court_in_session}
      d={delayMs}
      frame={
        <>
          <Gloom tone="rgba(163,122,78,0.26)" />
          <Vignette tone="rgba(36,22,8,0.46)" />
        </>
      }
    >
      <V c="g22-cs-gavel" l={35} t={30} w={13} h={13} d={90} st={{ transformOrigin: "20% 80%" }}>{gavel}</V>
      <L c="g22-cs-rap" l={36} t={43} w={26} h={2} d={250} st={{ borderRadius: "999px", background: "#fff2dc" }} />
      {CS_PANELS.map(([l, t, rot], i) => (
        <P key={i} l={l} t={t} w={9} h={20} rot={rot}>
          <V c="g22-cs-panel" w={100} h={100} d={360 + i * 90} st={{ transformOrigin: i === 0 ? "100% 50%" : i === 2 ? "0% 50%" : "50% 100%" }}>{panel}</V>
        </P>
      ))}
      <V c="g22-cs-king" l={45.5} t={42} w={9} h={12} d={620}><path d={KING} fill="none" stroke="#fff2dc" strokeWidth="1.4" {...SJ} /></V>
      {[0, 1].map((i) => (
        <L key={i} c="g22-drift" l={43 + i * 10} t={46} w={1.6} h={1.6} d={700 + i * 110} st={{ borderRadius: "50%", background: "#a37a4e" }} />
      ))}
    </Lead>
  );
}

/* --- 14. Drawn Curtain (t5) — THE RAIL AND THE DRAPE --------------------------
   Rings run along the rail over the chosen rank, the heavy drape follows them
   across the whole board, the tassel swings once, and the footlights under it
   go out. Palette: #b0384f / #ffe9c8 / #2a0f16. */
function DrawnCurtainScene({ role, delayMs }: SceneProps) {
  const tassel = (
    <g {...SJ}>
      <path d="M12 2v9" stroke="#ffe9c8" strokeWidth="1.4" />
      <path d="M8.4 11h7.2l-1.6 8H10z" fill="#b0384f" stroke="#2a0f16" strokeWidth="1.1" />
      <path d="M10 19v3M12 19v3M14 19v3" stroke="#b0384f" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g22-dc-rail" l={4} t={14} w={92} h={3} d={40} st={{ borderRadius: "999px", background: "#ffe9c8" }} />
        {[0, 1, 2, 3].map((i) => (
          <L key={i} c="g22-dc-ring" l={8 + i * 22} t={10} w={9} h={9} d={200 + i * 70} st={{ borderRadius: "50%", border: "2px solid #ffe9c8" }} />
        ))}
        <L c="g22-dc-drape" l={4} t={18} w={92} h={70} d={420} st={{ background: "linear-gradient(90deg, #b0384f, #2a0f16)", transformOrigin: "0% 50%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g22-hit2" l={6} t={10} w={88} h={3} d={0} st={{ borderRadius: "999px", background: "#ffe9c8" }} />
        <L c="g22-hitside" l={6} t={14} w={88} h={72} d={140} st={{ background: "linear-gradient(90deg, #b0384f, #2a0f16)", transformOrigin: "0% 50%" }} />
        <V c="g22-hit" l={62} t={20} w={26} h={54} d={260}>{tassel}</V>
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_drawn_curtain}
      d={delayMs}
      frame={
        <>
          <Gloom tone="rgba(176,56,79,0.26)" />
          <L c="g22-dc-rail" t={43} h={1.6} d={90} st={{ borderRadius: "999px", background: "#ffe9c8" }} />
          <L c="g22-dc-drape" t={44} h={13} d={330} st={{ background: "linear-gradient(90deg, #b0384f, rgba(42,15,22,0.92))", transformOrigin: "0% 50%" }} />
        </>
      }
    >
      {[0, 1, 2, 3].map((i) => (
        <L key={i} c="g22-dc-ring" l={38 + i * 7} t={42} w={3} h={3} d={140 + i * 80} st={{ borderRadius: "50%", border: "1px solid #ffe9c8" }} />
      ))}
      <V c="g22-dc-tassel" l={57} t={44} w={7} h={13} d={560} st={{ transformOrigin: "50% 0%" }}>{tassel}</V>
      <L c="g22-dc-foot" l={36} t={57} w={28} h={3} d={660} st={{ borderRadius: "999px", background: "linear-gradient(90deg, transparent, #ffe9c8, transparent)" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g22-drift" l={42 + i * 11} t={50} w={1.6} h={1.6} d={720 + i * 100} st={{ borderRadius: "50%", background: "#ffe9c8" }} />
      ))}
    </Lead>
  );
}

/* --- 15. Lockstep (t5) — THE MIRROR FOGS --------------------------------------
   A standing mirror shows their piece the move you just made. Then breath
   blooms across the glass, and all they have left to copy is the length of the
   step, measured off the run you already took. Palette: #9aa6b8 / #fff4e2 /
   #1c2a2c. */
function LockstepScene({ role, delayMs }: SceneProps) {
  const mirror = (
    <g {...SJ}>
      <path d="M4 21V9a8 8 0 0 1 16 0v12z" fill="rgba(154,166,184,0.4)" stroke="#9aa6b8" strokeWidth="1.4" />
      <path d="M7 20V9.6a5 5 0 0 1 3.4-4.8" fill="none" stroke="#fff4e2" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g22-ent-rise" l={16} t={10} w={68} h={78} d={40}>{mirror}</V>
        <V c="g22-lk-echo" l={34} t={32} w={32} h={46} d={260}><path d={PAWN} fill="#9aa6b8" /></V>
        <L c="g22-lk-fog" l={22} t={22} w={56} h={56} d={470} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,226,0.9), transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g22-hitside" l={18} t={8} w={64} h={78} d={0}>{mirror}</V>
        <V c="g22-hit" l={36} t={30} w={28} h={44} d={150}><path d={PAWN} fill="#9aa6b8" /></V>
        <L c="g22-hit2" l={24} t={24} w={52} h={52} d={260} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,226,0.85), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_lockstep}
      d={delayMs}
      frame={
        <>
          <Gloom tone="rgba(154,166,184,0.26)" />
          <Vignette tone="rgba(28,42,44,0.44)" />
        </>
      }
    >
      <V c="g22-lk-frame" l={42} t={34} w={16} h={22} d={80}>{mirror}</V>
      <V c="g22-lk-echo" l={45} t={40} w={10} h={13} d={250}><path d={PAWN} fill="#9aa6b8" stroke="#1c2a2c" strokeWidth="1" {...SJ} /></V>
      <L c="g22-lk-span" l={50} t={49} w={22} h={1.8} d={400} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #fff4e2, transparent)", transformOrigin: "0% 50%" }} />
      <L c="g22-lk-fog" l={41} t={35} w={18} h={18} d={540} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,226,0.92), transparent 72%)" }} />
      <L c="g22-lk-drip" l={48} t={44} w={1.4} h={8} d={660} st={{ borderRadius: "999px", background: "#fff4e2", transformOrigin: "50% 0%" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g22-glint" l={44 + i * 9} t={38} w={2} h={2} d={720 + i * 100} st={{ borderRadius: "50%", background: "#fff4e2" }} />
      ))}
    </Lead>
  );
}

/* --- 16. Night Ledger (t5) — THE INKWELL GOES OVER ----------------------------
   The quiet moves are struck from the book: the quill rules a line through the
   row, the inkwell tips, and the blot spreads until the heavy pieces cannot
   find their own entry. Palette: #7d93c4 / #f6e7c4 / #141a2c. */
function NightLedgerScene({ role, delayMs }: SceneProps) {
  const page = (
    <g {...SJ}>
      <path d="M3 3h18v18H3z" fill="#f6e7c4" stroke="#141a2c" strokeWidth="1.2" />
      <path d="M5.4 7.6h13.2M5.4 11h13.2M5.4 14.4h13.2M5.4 17.8h9" stroke="#7d93c4" strokeWidth="0.9" />
    </g>
  );
  const well = (
    <g {...SJ}>
      <path d="M6 10h12l-1.6 9H7.6z" fill="#141a2c" stroke="#7d93c4" strokeWidth="1.2" />
      <path d="M4.6 10h14.8" stroke="#7d93c4" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g22-ent-rise" l={12} t={12} w={70} h={70} d={40}>{page}</V>
        <V c="g22-nl-well" l={54} t={40} w={40} h={40} d={260} st={{ transformOrigin: "40% 90%" }}>{well}</V>
        <L c="g22-nl-blot" l={26} t={38} w={48} h={40} d={470} st={{ borderRadius: "50%", background: "radial-gradient(circle, #141a2c, rgba(20,26,44,0.15) 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g22-hitside" l={10} t={10} w={72} h={72} d={0}>{page}</V>
        <L c="g22-hit2" l={14} t={44} w={68} h={4} d={140} st={{ borderRadius: "999px", background: "#141a2c" }} />
        <L c="g22-hit" l={30} t={30} w={44} h={44} d={260} st={{ borderRadius: "50%", background: "radial-gradient(circle, #141a2c, rgba(20,26,44,0.12) 72%)" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_night_ledger}
      d={delayMs}
      frame={
        <>
          <Gloom tone="rgba(125,147,196,0.26)" />
          <Vignette tone="rgba(20,26,44,0.46)" />
        </>
      }
    >
      <V c="g22-nl-page" l={39} t={36} w={22} h={22} d={80}>{page}</V>
      <V c="g22-nl-quill" l={36} t={32} w={16} h={16} d={240}>
        <path d="M2 22C6 12 12 5 22 2c0 10-6 16-14 18z" fill="#f6e7c4" stroke="#141a2c" strokeWidth="1.1" {...SJ} />
      </V>
      <L c="g22-nl-row" l={41} t={45} w={18} h={1.4} d={380} st={{ borderRadius: "999px", background: "#141a2c", transformOrigin: "0% 50%" }} />
      <V c="g22-nl-well" l={55} t={40} w={9} h={9} d={500} st={{ transformOrigin: "40% 90%" }}>{well}</V>
      <L c="g22-nl-blot" l={42} t={40} w={18} h={16} d={600} st={{ borderRadius: "50%", background: "radial-gradient(circle, #141a2c, rgba(20,26,44,0.12) 72%)" }} />
      {[0, 1, 2].map((i) => (
        <L key={i} c="g22-grit" l={44 + i * 6} t={48} w={1.4} h={1.8} d={700 + i * 100} st={{ background: "#7d93c4" }} />
      ))}
    </Lead>
  );
}

/* --- 17. Night Watch Rota (t5) — THE SHUTTER CLOSES TO A SLIT -----------------
   The duty pegs turn over on the rota board, then the watchman's lantern is
   shuttered down the line of march until the beam is a slit no knight or
   bishop can be read by. Aim staged. Palette: #9fd0c0 / #fff4d6 / #12241f. */
function NightWatchRotaScene({ role, delayMs }: SceneProps) {
  const lamp = (
    <g {...SJ}>
      <path d="M8 6h8v12H8z" fill="rgba(159,208,192,0.5)" stroke="#9fd0c0" strokeWidth="1.3" />
      <path d="M6.4 6h11.2M6.4 18h11.2" stroke="#12241f" strokeWidth="1.6" />
      <path d="M12 2.4v3.4" stroke="#9fd0c0" strokeWidth="1.3" />
    </g>
  );
  const board = (
    <g {...SJ}>
      <path d="M3 4h18v16H3z" fill="#12241f" stroke="#9fd0c0" strokeWidth="1.2" />
      <path d="M6 8.4h12M6 12h12M6 15.6h8" stroke="#9fd0c0" strokeWidth="0.9" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g22-ent-rise" l={8} t={16} w={54} h={62} d={40}>{board}</V>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g22-nw-peg" l={16 + i * 14} t={62} w={8} h={8} d={230 + i * 80} st={{ borderRadius: "50%", background: "#fff4d6" }} />
        ))}
        <V c="g22-nw-lamp" l={58} t={24} w={36} h={52} d={470}>{lamp}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g22-hitside" l={30} t={16} w={40} h={62} d={0}>{lamp}</V>
        <L c="g22-hit2" l={8} t={44} w={84} h={10} d={140} st={{ background: "linear-gradient(90deg, #fff4d6, transparent)", transformOrigin: "0% 50%" }} />
        <V c="g22-hit" l={38} t={32} w={26} h={38} d={260}><path d={KNIGHT} fill="#12241f" /></V>
      </Cut>
    );
  }
  return (
    <AimLead imp={IMP.hx4_night_watch_rota}
      d={delayMs}
      frame={
        <>
          <Gloom tone="rgba(159,208,192,0.26)" />
          <Nightfall tone="rgba(18,36,31,0.66)" />
        </>
      }
    >
      <V c="g22-nw-board" l={36} t={36} w={16} h={16} d={80}>{board}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g22-nw-peg" l={38 + i * 5} t={46} w={2.4} h={2.4} d={200 + i * 80} st={{ borderRadius: "50%", background: "#fff4d6" }} />
      ))}
      <V c="g22-nw-lamp" l={45} t={42} w={9} h={12} d={420}>{lamp}</V>
      <L c="g22-nw-beam" l={53} t={45} w={26} h={6} d={560} st={{ background: "linear-gradient(90deg, rgba(255,244,214,0.85), transparent)", transformOrigin: "0% 50%" }} />
      <L c="g22-nw-shutter" l={53} t={45} w={26} h={6} d={640} st={{ background: "rgba(18,36,31,0.92)", transformOrigin: "50% 50%" }} />
      <V c="g22-nw-moth" l={57} t={38} w={6} h={6} d={720}>
        <path d="M12 12c-3.4-4.6-9-6.6-9.6-2.6-.4 3 3.4 5.6 9.6 6.4 6.2-.8 10-3.4 9.6-6.4-.6-4-6.2-2-9.6 2.6z" fill="#fff4d6" />
      </V>
    </AimLead>
  );
}

/* --- 18. Censor's Ink (t4) — THE BAR GOES DOWN THE FILE ------------------------
   Three lines of the position are set in type, a loaded brush drags a black
   bar down the file, and the CENSORED stamp lands on top of it, dripping.
   Palette: #c9c2b4 / #fff2dc / #14121a. */
function CensorsInkScene({ role, delayMs }: SceneProps) {
  const brush = (
    <g {...SJ}>
      <path d="M10 2.4h4v11h-4z" fill="#c9c2b4" stroke="#14121a" strokeWidth="1.1" />
      <path d="M8.6 13.4h6.8l-1.4 8h-4z" fill="#14121a" />
    </g>
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        {[0, 1, 2].map((i) => (
          <L key={i} c="g22-ci-type" l={16} t={20 + i * 20} w={68} h={7} d={40 + i * 60} st={{ borderRadius: "1px", background: "#c9c2b4" }} />
        ))}
        <V c="g22-ci-brush" l={30} t={2} w={40} h={54} d={300}>{brush}</V>
        <L c="g22-ci-bar" l={16} t={18} w={68} h={44} d={470} st={{ background: "#14121a", transformOrigin: "50% 0%" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g22-hit2" l={14} t={22} w={72} h={8} d={0} st={{ borderRadius: "1px", background: "#c9c2b4" }} />
        <L c="g22-hitside" l={14} t={20} w={72} h={52} d={140} st={{ background: "#14121a", transformOrigin: "50% 0%" }} />
        <V c="g22-hit" l={26} t={32} w={48} h={30} d={260} par="none" vb="0 0 40 20">
          <text x="20" y="14" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff2dc">CENSORED</text>
        </V>
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_censors_ink}
      d={delayMs}
      frame={
        <>
          <Gloom tone="rgba(201,194,180,0.24)" />
          <Vignette tone="rgba(20,18,26,0.48)" />
        </>
      }
    >
      {[0, 1, 2].map((i) => (
        <L key={i} c="g22-ci-type" l={41} t={38 + i * 7} w={18} h={2} d={80 + i * 60} st={{ borderRadius: "1px", background: "#c9c2b4" }} />
      ))}
      <V c="g22-ci-brush" l={44} t={26} w={11} h={15} d={300}>{brush}</V>
      <L c="g22-ci-bar" l={42} t={36} w={16} h={20} d={440} st={{ background: "#14121a", transformOrigin: "50% 0%" }} />
      <V c="g22-ci-stamp" l={40} t={42} w={20} h={10} d={580} par="none" vb="0 0 40 20">
        <rect x="1" y="2" width="38" height="16" rx="1" fill="none" stroke="#fff2dc" strokeWidth="1.6" />
        <text x="20" y="14" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff2dc">CENSORED</text>
      </V>
      {[0, 1].map((i) => (
        <L key={i} c="g22-ci-drip" l={45 + i * 8} t={55} w={1.4} h={6} d={680 + i * 100} st={{ borderRadius: "999px", background: "#14121a", transformOrigin: "50% 0%" }} />
      ))}
    </Lead>
  );
}

/* --- 19. Moth Eaten Gloves (t4) — THE MOTHS EAT THE DARK ----------------------
   The queen's dark glove hangs under a lamp. Moths come in off the light and
   chew, holes open right through the palm, and the wool dust that comes off it
   drifts down. Palette: #b494a8 / #fff2dc / #241a22. */
const MG_HOLES: Array<[number, number, number]> = [[45, 42, 2.6], [50, 46, 1.9], [46.5, 48, 1.4]];

function MothGlovesScene({ role, delayMs }: SceneProps) {
  const glove = (
    <g {...SJ}>
      <path d="M5.4 21V10.4c0-1.8 2.2-2.4 3.4-1.2l1.6 1.6V4.4c0-2 3-2 3 0v5.2c0-2 3-2 3 0v1.6c0-1.8 2.8-1.8 2.8.2v7c0 1.8-1.2 2.6-3 2.6z" fill="#b494a8" stroke="#241a22" strokeWidth="1.1" />
    </g>
  );
  const moth = (
    <path d="M12 12c-3.4-4.6-9-6.6-9.6-2.6-.4 3 3.4 5.6 9.6 6.4 6.2-.8 10-3.4 9.6-6.4-.6-4-6.2-2-9.6 2.6z" fill="#fff2dc" stroke="#241a22" strokeWidth="0.8" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g22-ent-rise" l={22} t={16} w={56} h={70} d={40}>{glove}</V>
        <V c="g22-mg-moth" l={6} t={20} w={30} h={30} d={280}>{moth}</V>
        <V c="g22-mg-moth" l={62} t={34} w={30} h={30} d={420}>{moth}</V>
        <L c="g22-mg-hole" l={40} t={44} w={16} h={16} d={560} st={{ borderRadius: "50%", background: "#241a22" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g22-hitside" l={24} t={14} w={52} h={68} d={0}>{glove}</V>
        <V c="g22-hit" l={8} t={26} w={30} h={30} d={150}>{moth}</V>
        <L c="g22-hit2" l={42} t={44} w={18} h={18} d={260} st={{ borderRadius: "50%", background: "#241a22" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_moth_eaten_gloves}
      d={delayMs}
      frame={
        <>
          <Gloom tone="rgba(180,148,168,0.26)" />
          <Vignette tone="rgba(36,26,34,0.44)" />
        </>
      }
    >
      <V c="g22-mg-glove" l={43} t={38} w={14} h={18} d={90}>{glove}</V>
      <L c="g22-mg-lamp" l={44} t={28} w={12} h={12} d={240} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,220,0.9), transparent 68%)" }} />
      {[0, 1, 2].map((i) => (
        <V key={i} c="g22-mg-moth" l={38 + i * 9} t={30 + (i % 2) * 8} w={6} h={6} d={340 + i * 90}>{moth}</V>
      ))}
      {MG_HOLES.map(([l, t, s], i) => (
        <L key={i} c="g22-mg-hole" l={l} t={t} w={s} h={s} d={560 + i * 70} st={{ borderRadius: "50%", background: "#241a22" }} />
      ))}
      {[0, 1].map((i) => (
        <L key={i} c="g22-drift" l={45 + i * 8} t={50} w={1.5} h={1.5} d={700 + i * 110} st={{ borderRadius: "50%", background: "#fff2dc" }} />
      ))}
    </Lead>
  );
}

/* --- 20. Night Soil (t4) — THE BARROW GOES OVER -------------------------------
   The barrow tips and the whole first rank is dressed in muck. Steam comes up
   off it, flies find it inside a second, and the fork is left standing in the
   heap. Palette: #8f8a4a / #f4e6bc / #241f0e. */
function NightSoilScene({ role, delayMs }: SceneProps) {
  const barrow = (
    <g {...SJ}>
      <path d="M3 6h13l3 7H5z" fill="#8f8a4a" stroke="#241f0e" strokeWidth="1.2" />
      <path d="M5 13 3.4 20M19 13l1.4 4" stroke="#241f0e" strokeWidth="1.3" />
      <circle cx="8.6" cy="19" r="2.6" fill="none" stroke="#241f0e" strokeWidth="1.3" />
    </g>
  );
  const fly = <circle cx="12" cy="12" r="4.6" fill="#241f0e" />;
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g22-ns-barrow" l={10} t={12} w={56} h={56} d={40} st={{ transformOrigin: "20% 90%" }}>{barrow}</V>
        <L c="g22-ns-heap" l={8} t={62} w={80} h={24} d={280} st={{ borderRadius: "999px", background: "#8f8a4a", transformOrigin: "20% 100%" }} />
        {[0, 1, 2].map((i) => (
          <V key={i} c="g22-ns-fly" l={30 + i * 20} t={34 + (i % 2) * 12} w={9} h={9} d={470 + i * 90}>{fly}</V>
        ))}
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g22-hitside" l={12} t={10} w={50} h={52} d={0} st={{ transformOrigin: "20% 90%" }}>{barrow}</V>
        <L c="g22-hit2" l={10} t={60} w={76} h={22} d={140} st={{ borderRadius: "999px", background: "#8f8a4a", transformOrigin: "20% 100%" }} />
        <V c="g22-hit" l={54} t={26} w={12} h={12} d={260}>{fly}</V>
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_night_soil}
      d={delayMs}
      frame={
        <>
          <Gloom tone="rgba(143,138,74,0.28)" />
          <L c="g22-ns-rank" t={44} h={12} d={280} st={{ background: "linear-gradient(180deg, rgba(143,138,74,0.9), rgba(36,31,14,0.5))", transformOrigin: "0% 50%" }} />
        </>
      }
    >
      <V c="g22-ns-barrow" l={35} t={34} w={16} h={16} d={90} st={{ transformOrigin: "20% 90%" }}>{barrow}</V>
      <L c="g22-ns-heap" l={38} t={48} w={24} h={7} d={280} st={{ borderRadius: "999px", background: "#8f8a4a", transformOrigin: "20% 100%" }} />
      {[0, 1].map((i) => (
        <L key={i} c="g22-ns-steam" l={43 + i * 9} t={42} w={2.4} h={9} d={440 + i * 90} st={{ borderRadius: "999px", background: "linear-gradient(180deg, transparent, #f4e6bc)" }} />
      ))}
      {[0, 1, 2].map((i) => (
        <V key={i} c="g22-ns-fly" l={40 + i * 8} t={40 + (i % 2) * 6} w={3} h={3} d={560 + i * 70}>{fly}</V>
      ))}
      <V c="g22-ns-fork" l={55} t={38} w={9} h={16} d={680}>
        <g fill="none" stroke="#f4e6bc" strokeWidth="1.5" {...SJ}>
          <path d="M12 22V9M7 9V3M12 9V3M17 9V3M6 9h12" />
        </g>
      </V>
    </Lead>
  );
}

/* --- 21. Slack Bowstrings (t4) — THE STRING GOES SLACK ------------------------
   Aimed down the shot they were about to take: the bow is drawn, the string
   sags dead off the nock, the arrow noses over into the boards, and a hand
   comes over the archer's eye. Palette: #9fb87e / #fff2dc / #22280f. */
function SlackBowstringsScene({ role, delayMs }: SceneProps) {
  const bow = (
    <path d="M18 2C8 6 6 10 6 12s2 6 12 10" fill="none" stroke="#9fb87e" strokeWidth="2.4" {...SJ} />
  );
  const arrow = (
    <g {...SJ}>
      <path d="M2 12h17M19 12l-4-3.4M19 12l-4 3.4" stroke="#fff2dc" strokeWidth="1.6" fill="none" />
    </g>
  );
  const eye = (
    <path d="M3 20.4V11c0-1.8 2.4-2.4 3.4-1l3.2 4V4.6c0-2 3-2 3 0v6.6l5.4 1.2c1.6.4 2.4 1.6 2 3.2l-1.2 4.8z" fill="#9fb87e" stroke="#22280f" strokeWidth="1.1" {...SJ} />
  );
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <V c="g22-ent-rise" l={10} t={8} w={50} h={80} d={40}>{bow}</V>
        <V c="g22-sl-arrow" l={30} t={38} w={62} h={24} d={260}>{arrow}</V>
        <V c="g22-sl-blind" l={44} t={22} w={48} h={48} d={470}>{eye}</V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <V c="g22-hitside" l={14} t={10} w={44} h={76} d={0}>{bow}</V>
        <V c="g22-hit" l={34} t={38} w={58} h={24} d={150}>{arrow}</V>
        <L c="g22-hit2" l={30} t={72} w={44} h={4} d={260} st={{ borderRadius: "999px", background: "#22280f" }} />
      </Cut>
    );
  }
  return (
    <AimLead imp={IMP.hx4_slack_bowstrings} d={delayMs} frame={<Gloom tone="rgba(159,184,126,0.26)" />}>
      <L c="g22-runout" l={46} t={49} w={28} h={1.6} d={90} st={{ borderRadius: "999px", background: "linear-gradient(90deg, #9fb87e, transparent)", transformOrigin: "0% 50%" }} />
      <V c="g22-sl-bow" l={40} t={40} w={10} h={16} d={230}>{bow}</V>
      <L c="g22-sl-string" l={44} t={41} w={1.4} h={14} d={380} st={{ background: "#fff2dc", transformOrigin: "50% 50%" }} />
      <V c="g22-sl-arrow" l={46} t={44} w={16} h={7} d={500} st={{ transformOrigin: "10% 50%" }}>{arrow}</V>
      <V c="g22-sl-blind" l={35} t={38} w={11} h={11} d={620}>{eye}</V>
      {[0, 1, 2].map((i) => (
        <L key={i} c="g22-grit" l={48 + i * 6} t={52} w={1.4} h={1.8} d={700 + i * 90} st={{ background: "#22280f" }} />
      ))}
    </AimLead>
  );
}

/* =============================================================================
   Registry. Every entry declares an anchor and an existing SigSoundKey.
   `source` names a zone only where the card really does decorate pieces that
   STAY on the board: motif "blindfold" and motif "slow" cards name their own
   motif zone, and The Big Nap names "frozen" because it lays real freeze
   effects on the heavy pieces. The muzzle / jail / anchor motif cards and the
   clock buffs have no matching zone, so they omit it and play off the cast
   square as the generated family did.
   ========================================================================== */

/** Bind one bespoke scene to its config. */
function S(Render: SigPlugin["Render"], config: SigPlugin["config"]): SigPlugin {
  return { config, Render };
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
        <span className="g22-rs absolute inset-0 block">{children}</span>
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
      className="g22-r-draw absolute block"
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
        <Q key={i} x={`${x0 + i * step}%`} y={rk(r)} w={1.8} h={3.2} cls="g22-r-pip" delayMs={delayMs + i * 70} v={{ "--gd": gd }} style={{ background: color, borderRadius: "1px" }} />
      ))}
    </>
  );
}

/** A square (or a run of squares) tinted for the length of a beat: the
 *  squares the rule itself touches. */
function Tint({ x, y, w = 12.5, h = 12.5, color, delayMs, gd = "1.6s", cls = "g22-r-in" }: { x: string; y: string; w?: number; h?: number; color: string; delayMs: number; gd?: string; cls?: string }) {
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

/** Every dark square of the board at once, whichever way it is turned (a8 and
 *  h1 are both light, so the top-left square is always light). */
const DARK_SQUARES = (color: string): CSSProperties => ({
  background: `repeating-conic-gradient(${color} 0 25%, transparent 0 50%)`,
  backgroundSize: "25% 25%",
});

/* --- hx4_glass_floor ---------------------------------------------------------------
   "Every dark square becomes thin glass: for your opponent's next 2 turns
   their pieces may not stop on dark squares. Their king is exempt." All 32
   dark squares glaze over at once and a sheen runs across the pane; their
   g8 knight tries f6 (a dark square), the glass stars under it and the move
   is barred; the b8 knight's c6 (a light square) holds and it lands; their
   king is ringed and walks free; two turn pips. */
const C_GFR = { core: "#bfe4ee", glow: "#fff4e2", deep: "#16323a" };

function GlassFloorRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <GlassFloorScene lead={lead} role={role} delayMs={delayMs} />;
  const c = C_GFR;
  const d = delayMs;
  return (
    <Brd>
      <Q x="50%" y="50%" w={100} h={100} cls="g22-r-in" delayMs={d + 20} v={{ "--gd": "2.3s", "--s0": "1" }} style={DARK_SQUARES("rgba(191,228,238,0.6)")} />
      <Q x="50%" y="50%" w={14} h={140} cls="g22-r-go" delayMs={d + 160} v={{ "--gd": "1s", "--tx0": "-420%", "--ty0": "0%", "--tx1": "420%", "--ty1": "0%" }} style={{ rotate: "30deg", background: "linear-gradient(90deg, rgba(255,244,226,0), rgba(255,244,226,0.5), rgba(255,244,226,0))" }} />
      <Q x={fc(5)} y={rk(5)} w={11} h={11} cls="g22-r-dim" delayMs={d + 520} v={{ "--gd": "1.3s" }}>
        <Man kind="n" fill={c.deep} stroke={c.core} />
      </Q>
      <Q x={fc(5)} y={rk(5)} w={12.5} h={12.5} cls="g22-r-stamp" delayMs={d + 700} v={{ "--gd": "1.4s" }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <path d="M10 10L2 4M10 10l8-7M10 10l9 4M10 10l-3 9M10 10l5 8M10 10L1 12" stroke={c.glow} strokeWidth="0.9" {...SJ} />
          <path d="M5 7l1.6 2.6M14 6l-1 3M15 13.6l-2.4-1M7.6 15l1-2.6" stroke={c.core} strokeWidth="0.8" {...SJ} />
        </svg>
      </Q>
      <Q x={fc(5)} y={rk(5)} w={7} h={7} cls="g22-r-stamp" delayMs={d + 860} v={{ "--gd": "1.2s" }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <path d="M4 4l12 12M16 4L4 16" stroke={c.deep} strokeWidth="3.4" {...SJ} />
          <path d="M4 4l12 12M16 4L4 16" stroke={c.glow} strokeWidth="1.4" {...SJ} />
        </svg>
      </Q>
      <Q x={fc(2)} y={rk(5)} w={11} h={11} cls="g22-r-go" delayMs={d + 940} v={{ "--gd": "1.3s", "--tx0": "calc(var(--fx-side, 1) * -100%)", "--ty0": "calc(var(--fx-side, 1) * -200%)", "--tx1": "0%", "--ty1": "0%" }}>
        <Man kind="n" fill={c.deep} stroke={c.glow} />
      </Q>
      <Q x={KING_X} y={rk(7)} w={11} h={11} cls="g22-r-in" delayMs={d + 820} v={{ "--gd": "1.5s" }} style={{ border: `2px dashed ${c.glow}`, borderRadius: "50%" }} />
      <Pips n={2} r={3.5} x0={47} x1={53} color={c.glow} delayMs={d + 1100} gd="1.2s" />
      <Q x={fc(5)} y={rk(4.4)} w={16} h={2} cls="g22-r-lean" delayMs={d + 1560} v={{ "--gd": "0.8s" }} style={{ borderRadius: "999px", background: "rgba(191,228,238,0.5)" }} />
    </Brd>
  );
}

/* --- ov_big_nap --------------------------------------------------------------------
   "Night falls: every knight, bishop, rook and queen on the board (both sides)
   sleeps and cannot move for 1 turn of its owner. Kings and pawns keep
   watch." A moon rises and night draws over both back ranks; every officer's
   square on both sides darkens and a Z drifts up off it; the two kings each
   hold up a lantern and both pawn ranks stay lit; one turn pip per side. */
const C_BNR = { core: "#8fa0d8", glow: "#fff2dc", deep: "#1a1c30" };
const BN_OFFICERS = [0, 1, 2, 3, 5, 6, 7];

function BigNapRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <BigNapScene lead={lead} role={role} delayMs={delayMs} />;
  const c = C_BNR;
  const d = delayMs;
  const lantern = (
    <svg viewBox="0 0 14 20" className="block h-full w-full" aria-hidden="true">
      <path d="M7 1v3" stroke={c.deep} strokeWidth="1.4" {...SJ} />
      <rect x="3" y="4" width="8" height="11" rx="2" fill={c.glow} stroke={c.deep} strokeWidth="1.4" />
      <path d="M5 15h4l-1 3H6z" fill={c.deep} />
    </svg>
  );
  return (
    <Brd>
      <Q x="7%" y={rk(3.5)} w={10} h={10} cls="g22-r-up" delayMs={d + 20} v={{ "--gd": "2.2s" }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <path d="M13 2a8.4 8.4 0 1 0 5 15A7 7 0 0 1 13 2z" fill={c.glow} stroke={c.deep} strokeWidth="1.2" {...SJ} />
        </svg>
      </Q>
      {[0, 7].map((r) => (
        <Tint key={`a${r}`} x={fc(1.5)} y={rk(r)} w={50} color="rgba(26,28,48,0.6)" delayMs={d + 200 + (r ? 60 : 0)} gd="2s" />
      ))}
      {[0, 7].map((r) => (
        <Tint key={`b${r}`} x={fc(6)} y={rk(r)} w={37.5} color="rgba(26,28,48,0.6)" delayMs={d + 200 + (r ? 60 : 0)} gd="2s" />
      ))}
      {[0, 7].flatMap((r) =>
        BN_OFFICERS.map((col, i) => (
          <Q key={`z${r}-${col}`} x={`calc(${fc(col)} + 3%)`} y={`calc(${rk(r)} - 3%)`} w={4} h={4} cls="g22-r-lean" delayMs={d + 520 + i * 60 + (r ? 30 : 0)} v={{ "--gd": "1.4s" }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M2 2h6L2 8h6" fill="none" stroke={c.glow} strokeWidth="1.6" {...SJ} />
            </svg>
          </Q>
        )),
      )}
      {[0, 7].map((r) => (
        <Q key={`k${r}`} x={`calc(${KING_X} + 4%)`} y={rk(r)} w={4.4} h={6.4} cls="g22-r-up" delayMs={d + 760 + (r ? 60 : 0)} v={{ "--gd": "1.5s" }}>
          {lantern}
        </Q>
      ))}
      {[1, 6].map((r) => (
        <Tint key={`p${r}`} x="50%" y={rk(r)} w={100} color="rgba(255,242,220,0.16)" delayMs={d + 820} gd="1.4s" />
      ))}
      <Q x="50%" y={rk(2.3)} w={2.6} h={2.6} cls="g22-r-pip" delayMs={d + 1080} v={{ "--gd": "1.2s" }} style={{ background: c.core, borderRadius: "50%" }} />
      <Q x="50%" y={rk(4.7)} w={2.6} h={2.6} cls="g22-r-pip" delayMs={d + 1120} v={{ "--gd": "1.2s" }} style={{ background: c.core, borderRadius: "50%" }} />
    </Brd>
  );
}

/** A clock face with one hand, and a short time label beside a prop. */
function Dial({ c }: { c: { core: string; glow: string; deep: string } }) {
  return (
    <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
      <circle cx="10" cy="10" r="8" fill={c.deep} stroke={c.core} strokeWidth="1.6" />
      <path d="M10 4.4V10l3.6 2.2" fill="none" stroke={c.glow} strokeWidth="1.6" {...SJ} />
    </svg>
  );
}

function Label({ text, c }: { text: string; c: { glow: string; deep: string } }) {
  return (
    <svg viewBox="0 0 40 16" className="block h-full w-full" aria-hidden="true">
      <rect x="1" y="1" width="38" height="14" rx="3" fill={c.deep} />
      <text x="20" y="12" textAnchor="middle" fontSize="11" fontWeight="700" fill={c.glow}>{text}</text>
    </svg>
  );
}

/* --- bn4_hourglass_throne ----------------------------------------------------------
   "Add 60 seconds to your clock and steal 30 more from your opponent's. In
   untimed games nothing changes hands." A throne-backed hourglass stands up
   in front of the caster's king and its lower bulb fills a first measure
   (+1:00); a dial opens in front of their king, drops to -0:30, and a stream
   of sand runs down the board out of it into the throne, which fills a
   second measure (+0:30). */
const C_HTR = { core: "#e3b661", glow: "#fff4dc", deep: "#2e2210" };
const HT_GRAINS = [0, 1, 2, 3, 4, 5];

function HourglassThroneRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <HourglassThroneScene lead={lead} role={role} delayMs={delayMs} />;
  const c = C_HTR;
  const d = delayMs;
  return (
    <Brd>
      <Q x={fc(4)} y={rk(2.5)} w={16} h={24} cls="g22-r-up" delayMs={d + 30} v={{ "--gd": "2.3s" }}>
        <svg viewBox="0 0 24 36" className="block h-full w-full" aria-hidden="true">
          <path d="M3 34V9l4.5-5 4.5 4 4.5-4 4.5 5v25" fill="none" stroke={c.deep} strokeWidth="3.2" {...SJ} />
          <path d="M3 34V9l4.5-5 4.5 4 4.5-4 4.5 5v25" fill="none" stroke={c.core} strokeWidth="1.4" {...SJ} />
          <path d="M6.5 11h11L12 21l5.5 10h-11L12 21z" fill="rgba(46,34,16,0.55)" stroke={c.glow} strokeWidth="1.2" {...SJ} />
          <path d="M5 11h14M5 31h14" stroke={c.core} strokeWidth="1.8" {...SJ} />
        </svg>
      </Q>
      <Q x={fc(4)} y={`calc(${rk(2.5)} + var(--fx-side, 1) * 6.4%)`} w={7} h={3.4} cls="g22-r-grow" delayMs={d + 260} v={{ "--gd": "2s" }} style={{ background: c.core, clipPath: "polygon(0 100%, 100% 100%, 64% 0, 36% 0)", transformOrigin: "50% calc(50% + var(--fx-side, 1) * 50%)" }} />
      <Q x={`calc(${fc(4)} + var(--fx-side, 1) * 14%)`} y={rk(2)} w={10} h={4} cls="g22-r-in" delayMs={d + 300} v={{ "--gd": "1.1s" }}>
        <Label text="+1:00" c={c} />
      </Q>
      <Q x={fc(4)} y={rk(5)} w={9} h={9} cls="g22-r-in" delayMs={d + 420} v={{ "--gd": "1.6s" }}>
        <Dial c={c} />
      </Q>
      <Q x={`calc(${fc(4)} + var(--fx-side, 1) * 12%)`} y={rk(5)} w={10} h={4} cls="g22-r-stamp" delayMs={d + 560} v={{ "--gd": "1.3s" }}>
        <Label text="-0:30" c={c} />
      </Q>
      {HT_GRAINS.map((i) => (
        <Q key={i} x={fc(4)} y={rk(4.5)} w={1.6} h={1.6} cls="g22-r-go" delayMs={d + 640 + i * 70} v={{ "--gd": "0.7s", "--tx0": "0%", "--ty0": "0%", "--tx1": "0%", "--ty1": `calc(var(--fx-side, 1) * ${Math.round(1.1 * fileIn(1.6))}%)` }} style={{ background: c.core, borderRadius: "50%" }} />
      ))}
      <Q x={fc(4)} y={`calc(${rk(2.5)} + var(--fx-side, 1) * 4.2%)`} w={4.6} h={2} cls="g22-r-grow" delayMs={d + 1000} v={{ "--gd": "1.3s" }} style={{ background: c.glow, clipPath: "polygon(0 100%, 100% 100%, 70% 0, 30% 0)", transformOrigin: "50% calc(50% + var(--fx-side, 1) * 50%)" }} />
      <Q x={`calc(${fc(4)} + var(--fx-side, 1) * 14%)`} y={rk(3)} w={10} h={4} cls="g22-r-in" delayMs={d + 1060} v={{ "--gd": "1.1s" }}>
        <Label text="+0:30" c={c} />
      </Q>
      <Q x={fc(4)} y={rk(3.8)} w={10} h={2} cls="g22-r-lean" delayMs={d + 1500} v={{ "--gd": "0.8s" }} style={{ borderRadius: "999px", background: "rgba(227,182,97,0.4)" }} />
    </Brd>
  );
}

/* --- bn4_tithe_of_time -------------------------------------------------------------
   "Suspend your nerf for your next 9 turns, and steal 20 seconds from your
   opponent's clock. In untimed games only the suspension applies." A
   padlock on the caster's king (the nerf) springs open and nine tally
   strokes are scored across the caster's side, one per suspended turn; a
   tithe plate is passed up the board to a dial in front of their king,
   which gives up -0:20, and the plate comes back carrying a coin marked 20. */
const C_TTR = { core: "#a9b4bc", glow: "#fff4e2", deep: "#1b2026" };

function TitheOfTimeRule({ lead, role, delayMs }: SceneProps) {
  if (role !== "lead") return <TitheOfTimeScene lead={lead} role={role} delayMs={delayMs} />;
  const c = C_TTR;
  const d = delayMs;
  const plate = (coin: boolean) => (
    <svg viewBox="0 0 24 14" className="block h-full w-full" aria-hidden="true">
      <ellipse cx="12" cy="9" rx="10" ry="3.6" fill={c.core} stroke={c.deep} strokeWidth="1.4" />
      {coin ? (
        <>
          <circle cx="12" cy="6" r="4.6" fill={c.glow} stroke={c.deep} strokeWidth="1.2" />
          <text x="12" y="8" textAnchor="middle" fontSize="5.4" fontWeight="700" fill={c.deep}>20</text>
        </>
      ) : null}
    </svg>
  );
  return (
    <Brd>
      <Q x={`calc(${fc(4)} + 3%)`} y={`calc(${rk(0)} - 1.2%)`} w={6} h={5} cls="g22-r-in" delayMs={d + 40} v={{ "--gd": "1.9s", "--s0": "1.3" }}>
        <svg viewBox="0 0 20 16" className="block h-full w-full" aria-hidden="true">
          <rect x="3" y="3" width="14" height="12" rx="2" fill={c.core} stroke={c.deep} strokeWidth="1.6" />
          <circle cx="10" cy="9" r="1.8" fill={c.deep} />
        </svg>
      </Q>
      <Q x={`calc(${fc(4)} + 3%)`} y={`calc(${rk(0)} - 4.4%)`} w={4.4} h={4} cls="g22-r-open" delayMs={d + 40} v={{ "--gd": "1.9s", "--ra": "-80deg" }} style={{ transformOrigin: "10% 100%" }}>
        <svg viewBox="0 0 14 12" className="block h-full w-full" aria-hidden="true">
          <path d="M2 12V6a5 5 0 0 1 10 0v6" fill="none" stroke={c.deep} strokeWidth="3.4" {...SJ} />
          <path d="M2 12V6a5 5 0 0 1 10 0v6" fill="none" stroke={c.glow} strokeWidth="1.5" {...SJ} />
        </svg>
      </Q>
      {Array.from({ length: 9 }, (_, i) => (
        <Q key={`t${i}`} x={`${30 + i * 5 + (i > 3 ? 2 : 0)}%`} y={rk(2.5)} w={1.1} h={5} cls="g22-r-pip" delayMs={d + 360 + i * 45} v={{ "--gd": "1.8s" }} style={{ background: c.glow, borderRadius: "1px", rotate: i === 4 ? "58deg" : "8deg" }} />
      ))}
      <Q x={fc(4)} y={rk(5)} w={9} h={9} cls="g22-r-in" delayMs={d + 480} v={{ "--gd": "1.6s" }}>
        <Dial c={c} />
      </Q>
      <Q x={fc(3)} y={rk(1.6)} w={9} h={5.4} cls="g22-r-go" delayMs={d + 520} v={{ "--gd": "0.8s", "--tx0": "0%", "--ty0": "0%", "--tx1": "0%", "--ty1": `calc(var(--fx-side, 1) * ${-3 * fileIn(5.4)}%)` }}>
        {plate(false)}
      </Q>
      <Q x={`calc(${fc(4)} + var(--fx-side, 1) * 12%)`} y={rk(5)} w={10} h={4} cls="g22-r-stamp" delayMs={d + 860} v={{ "--gd": "1.2s" }}>
        <Label text="-0:20" c={c} />
      </Q>
      <Q x={fc(3)} y={rk(4.6)} w={9} h={5.4} cls="g22-r-go" delayMs={d + 1000} v={{ "--gd": "0.9s", "--tx0": "0%", "--ty0": "0%", "--tx1": "0%", "--ty1": `calc(var(--fx-side, 1) * ${3 * fileIn(5.4)}%)` }}>
        {plate(true)}
      </Q>
      <Q x={fc(3)} y={rk(1.3)} w={8} h={2} cls="g22-r-lean" delayMs={d + 1560} v={{ "--gd": "0.8s" }} style={{ borderRadius: "999px", background: "rgba(169,180,188,0.45)" }} />
    </Brd>
  );
}

export const PLAYS: Record<string, SigPlugin> = {
  hx4_great_waltz: S(GreatWaltzScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true,
    sound: "shades", source: "slow", anchor: "board",
  }),
  hx4_donkey_ears: S(DonkeyEarsScene, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true,
    sound: "snooze", anchor: "cast",
  }),
  hx4_eclipse: S(EclipseScene, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true,
    sound: "shades", source: "slow", anchor: "board",
  }),
  hx4_falling_rubble: S(FallingRubbleScene, {
    ordering: "octagon", staggerMs: 70, victims: "all", hasLead: true,
    sound: "wall", source: "blindfold", anchor: "cast",
  }),
  hx4_glass_floor: S(GlassFloorRule, {
    ordering: "sweep", staggerMs: 45, victims: "all", hasLead: true,
    sound: "clockice", source: "blindfold", anchor: "cast",
  }),
  hx4_the_long_night: S(TheLongNightScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true,
    sound: "shades", anchor: "board",
  }),
  ov_big_nap: S(BigNapRule, {
    ordering: "radial", staggerMs: 70, victims: ["n", "b", "r", "q"], hasLead: true,
    sound: "snooze", source: "frozen", anchor: "board",
  }),
  bn4_hourglass_throne: S(HourglassThroneRule, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "clockice", anchor: "board",
  }),
  bn4_tithe_of_time: S(TitheOfTimeRule, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "shades", anchor: "board",
  }),
  hx4_white_flag_hour: S(WhiteFlagHourScene, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true,
    sound: "wall", anchor: "cast",
  }),
  bn4_smoke_break_union: S(SmokeBreakScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "shades", anchor: "board",
  }),
  bn4_stolen_hour: S(StolenHourScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "clockice", anchor: "board",
  }),
  hx4_court_in_session: S(CourtInSessionScene, {
    ordering: "octagon", staggerMs: 60, victims: "all", hasLead: true,
    sound: "wall", anchor: "board",
  }),
  hx4_drawn_curtain: S(DrawnCurtainScene, {
    ordering: "line", staggerMs: 70, victims: "all", hasLead: true,
    sound: "wall", source: "blindfold", anchor: "board",
  }),
  hx4_lockstep: S(LockstepScene, {
    ordering: "radial", staggerMs: 55, victims: "all", hasLead: true,
    sound: "clockice", source: "slow", anchor: "board",
  }),
  hx4_night_ledger: S(NightLedgerScene, {
    ordering: "file", staggerMs: 80, victims: ["r", "q"], hasLead: true,
    sound: "shades", anchor: "board",
  }),
  hx4_night_watch_rota: S(NightWatchRotaScene, {
    ordering: "radial", staggerMs: 70, victims: ["n", "b"], hasLead: true,
    sound: "clockice", source: "slow", anchor: "board",
  }),
  hx4_censors_ink: S(CensorsInkScene, {
    ordering: "file", staggerMs: 60, victims: "all", hasLead: true,
    sound: "shades", source: "blindfold", anchor: "cast",
  }),
  hx4_moth_eaten_gloves: S(MothGlovesScene, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true,
    sound: "snooze", anchor: "board",
  }),
  hx4_night_soil: S(NightSoilScene, {
    ordering: "line", staggerMs: 70, victims: "all", hasLead: true,
    sound: "wall", source: "blindfold", anchor: "cast",
  }),
  hx4_slack_bowstrings: S(SlackBowstringsScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true,
    sound: "snooze", anchor: "aim",
  }),
};
