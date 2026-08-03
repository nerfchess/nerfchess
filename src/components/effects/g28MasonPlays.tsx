// g28MasonPlays — bespoke plays for the 26 petrify / hardening / stone cards
// that used to share the generated `stonecarve` family (one carved block, 26
// hue shifts).
//
// MODULE FICTION: THE MASON'S TRADE. The material is always stone, so the
// material is never the idea. Every card is a different OPERATION performed on
// stone, with its own tool: a lettering chisel cutting V-section serifs, plug
// and feathers split along a drilled line, a line of quarry wedges struck in
// order, a bush hammer pocking a face, a sand-slurry frame saw, the banker
// turntable spun, a claw chisel raking parallel furrows, a point chisel
// roughing out a form, a lewis pin dropped and the block swung away, a bolster
// splitting a slab clean, a joint raked out and pointed with a trowel, a
// profile template run along an arris, nippers nibbling an edge, a rubbing
// stone worked to a sheen, a pointing machine transferring points, a hammer
// tap listening for a hollow ring, a dressed drum rolled on log rollers, grout
// poured into joints, quicklime slaked in a pit, gold leaf laid into a cut,
// a scutch comb stripping the sap-skin, a stone parcelled in straw, a gallet
// pressed into a wet joint, the banker brushed down, molten lead run into a
// cramp chase.
//
// Contract: see the header of sigPlugins.tsx. Self-contained (own inline SVG,
// own g28MasonPlays.css), transform/opacity animations only, no import from
// BoardEffects.tsx (cycle hazard), only the SigPlugin / SigRole TYPES imported.
//
// STAGING. Every card declares an anchor. The operations that genuinely run
// ALONG A LINE — the drilled split, the wedge line, the saw kerf, the claw
// furrows, the bolster cut, the rolled drum — use <AimStage> with art authored
// pointing RIGHT, size their work with --fx-len so it covers the real
// source-to-target distance, and strike their wedges / drill holes in the real
// victim order with --fx-index. Everything that means THE BOARD (washes, grit
// veils) lives inside <BoardFrame>, never at a fixed percentage of the stage.
// Tool shadows lean away from the board centre with --fx-ox / --fx-oy, and the
// brush, the swung block and the rubbing stone work from the CASTER's own side
// via --fx-side. Nothing here says "the bottom of the board".
//
// Every scene runs three beats (tell, strike, settle) in all three roles, and
// every scene carries at least one animated layer driven by the geometry vars.
// All CSS lives in g28MasonPlays.css behind the `g28-` prefix.

import "./g28MasonPlays.css";

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
const rootStyle = (d: number): CSSProperties => ({ "--g28-d": `${d}ms` }) as CSSProperties;

/** stagger + a beat offset, scaled by the Settings animation-speed var. */
const b = (ms: number): string => `calc(var(--g28-d, 0ms) + ${ms}ms * var(--fx-dur, 1))`;

/** Beat delay, optionally stepped by this square's place in the victim order. */
const delayOf = (d: number, o: number, ix?: number): string =>
  ix == null ? b(d + o) : `calc(${b(d + o)} + var(--fx-index, 0) * ${ix}ms)`;

const SJ = { strokeLinejoin: "round", strokeLinecap: "round" } as const;

/** One board cell as a percentage of the 14-cell stage (see stage.css). */
const CELL = 7.142857;
const cells = (n: number): string => `${(n * CELL).toFixed(3)}%`;

/** A box `w` x `h` CELLS centred on the cast square, offset dx/dy cells. */
const box = (w: number, h: number, dx = 0, dy = 0): CSSProperties => ({
  left: `${(50 + (dx - w / 2) * CELL).toFixed(3)}%`,
  top: `${(50 + (dy - h / 2) * CELL).toFixed(3)}%`,
  width: cells(w),
  height: cells(h),
});

/** A lane starting AT the cast square, running the REAL distance to the
 *  victim, `thick` cells thick. Authored pointing right; <AimStage> aims it. */
const lane = (thick: number, dy = 0): CSSProperties => ({
  left: "50%",
  top: `${(50 + (dy - thick / 2) * CELL).toFixed(3)}%`,
  width: "calc(var(--fx-len, 3) * 7.142857%)",
  height: cells(thick),
});

/** A `w` x `h` cell box sitting a fraction `f` of the way down the real leg. */
const at = (w: number, h: number, f: number, dy = 0): CSSProperties => ({
  left: `calc(50% + var(--fx-len, 3) * ${(f * CELL).toFixed(4)}% - ${((w / 2) * CELL).toFixed(3)}%)`,
  top: `${(50 + (dy - h / 2) * CELL).toFixed(3)}%`,
  width: cells(w),
  height: cells(h),
});

/** The same, pinned to the FAR end of the leg. */
const far = (w: number, h: number, dy = 0): CSSProperties => at(w, h, 1, dy);

interface Box {
  /** animation class. */
  c: string;
  l?: number;
  t?: number;
  w?: number;
  h?: number;
  /** beat offset in ms. */
  d?: number;
  /** extra per-element offset in ms (a row struck one after another). */
  o?: number;
  /** ms per victim-order step, when this layer should follow the real order. */
  ix?: number;
  st?: CSSProperties;
  children?: ReactNode;
}

/** One animated plain layer. */
function L({ c, l = 0, t = 0, w = 100, h = 100, d = 0, o = 0, ix, st, children }: Box) {
  return (
    <span
      className={`${c} absolute block`}
      style={{
        left: `${l}%`,
        top: `${t}%`,
        width: `${w}%`,
        height: `${h}%`,
        animationDelay: delayOf(d, o, ix),
        ...st,
      }}
    >
      {children}
    </span>
  );
}

/** One animated SVG layer. */
function V({
  c, l = 0, t = 0, w = 100, h = 100, d = 0, o = 0, ix, vb = "0 0 24 24", par, st, children,
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
        animationDelay: delayOf(d, o, ix),
        ...st,
      }}
    >
      {children}
    </svg>
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

/** Cast-anchored lead: the work on the cast square, `frame` over the board. */
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

/** Aim-anchored lead: `frame` stays square with the board, the work rotates
 *  onto the real source -> target vector. */
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
   every node rides a `g28-impx` wrapper, covered by this module's prefix
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
    <g style={{ fill: "rgb(var(--imp-rgb, 216 181 110))" }}><path d="M1.4 3h7.2v6.4H1.4z" /></g>
  </svg>,
  <svg key="b" viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
    <g style={{ fill: "rgb(var(--imp-rgb, 216 181 110))" }}><path d="M3 2h4l1.6 8H1.4z" /></g>
  </svg>,
];

/** The whole stage jolts on the cue's beat. Rides an INNER wrapper because the
 * stage canvas carries the anchor-clamp transform, which must never be
 * animated over. In-scene only: the real board crop never shakes. */
function QuakeBox({ d, imp, children }: { d: number; imp: ImpCue; children: ReactNode }) {
  return (
    <span className={`g28-impx ${QUAKE_CLASS} absolute inset-0 block`} style={impactVars(undefined, (d + imp.at) / 1000)}>
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
      className="g28-impx absolute block"
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
        <span className="g28-impx absolute inset-0 block" style={impactVars(imp.rgb, (d + imp.at + 200) / 1000)}>
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
  // Written in Stone: THE FINAL LETTER STRUCK - the last chisel blow splits the slab face
  bn4_written_in_stone: { at: 1040, x: 50, y: 49, rgb: "216 201 168", laser: true, glyph: 0, boom: true },
  // Gorgon's Court: THE SLAB PARTS - the stone splits clean down the drilled line at its far end
  hx4_gorgons_court: { at: 1020, rgb: "185 194 204", laser: true, glyph: 0, far: true },
  // Hunter's Moon: THE CENTRE PIN - the trammel pin is driven and the template cracks free
  hx4_hunters_moon: { at: 1000, x: 50, y: 47, rgb: "205 214 222", laser: true, glyph: 1, boom: true },
  // No Quarter: THE MAUL'S LAST WEDGE - the split runs the whole line and bursts at its end
  hx4_no_quarter: { at: 1040, rgb: "200 168 110", laser: true, boom: true, rot: -90, far: true },
  // Stone Rain: THE FACE SHEDS - the hammered crust comes off in halves with a double thud
  hx4_stone_rain: { at: 980, x: 50, y: 51, rgb: "168 161 150", glyph: 0, boom: true, size: 8.6 },
  // Castle of Sand: THE KERF COMPLETES - the saw breaks through at the far end of the cut
  hx4_castle_of_sand: { at: 960, rgb: "217 191 138", laser: true, boom: true, far: true },
  // Gorgon Field: THE BANKER THUMP - the block is spun, lands wrong, and splits
  hx4_gorgon_field: { at: 940, x: 51, y: 50, rgb: "159 169 162", glyph: 0, boom: true },
  // Stone Garden: THE CLAW RUNS OUT - the furrow lance exits the far edge with a jolt
  hx4_stone_garden: { at: 960, rgb: "194 179 147", laser: true, boom: true, rot: -90, far: true },
  // Stone Orchard: THE WASTE KNOCKED OFF - the point jabs and the spoil splits away
  hx4_stone_orchard: { at: 940, x: 49, y: 50, rgb: "176 168 148", laser: true, glyph: 0 },
  // Traitor's Gala: THE LEWIS TAKES THE WEIGHT - the pin seats with a column and a double creak
  hx4_traitors_gala: { at: 960, x: 50, y: 46, rgb: "182 188 196", laser: true, boom: true },
  // Brittle Arsenal: THE BOLSTER SPLIT - one blow parts the stone at the line's end
  hx4_brittle_arsenal: { at: 920, rgb: "203 176 137", laser: true, glyph: 0, far: true },
  // Debt Collector: THE RAKE STRIKE - the old mortar is dragged out with interest
  hx4_debt_collector: { at: 900, x: 52, y: 51, rgb: "205 191 164", laser: true, boom: true },
  // The Walnut Crown: THE PROFILE STAMPED - the template slams the arris and the waste drops
  hx4_walnut_crown: { at: 920, x: 50, y: 48, rgb: "232 197 106", glyph: 1, boom: true },
  // Walnut Pinch: THE FLAKE NIPPED OFF - the jaws close and the arris parts
  hx4_walnut_pinch: { at: 880, x: 51, y: 49, rgb: "174 182 191", glyph: 0, size: 6.4 },
  // Stone Cloak: THE BLOCK BEDDED - the rubbing block lands flat, twice
  bn4_stone_cloak: { at: 860, x: 50, y: 50, rgb: "222 211 187", boom: true, size: 8.4 },
  // Gargoyle Perch: THE NEEDLE DROPS - the pointing needle finds its depth in one strike
  hx4_gargoyle_perch: { at: 880, x: 49, y: 47, rgb: "179 188 198", laser: true },
  // Hollow Fanfare: THE SOUNDING TAP - the hammer asks, and the flaw answers twice
  hx4_hollow_fanfare: { at: 840, x: 50, y: 49, rgb: "201 192 171", boom: true },
  // Rolling Boulder: THE DRUM ARRIVES - the dressed drum runs off its rollers into the far stop
  ov_rolling_boulder: { at: 900, rgb: "157 150 138", boom: true, size: 8.6, far: true },
  // Bell Jar: THE JAR SEATS - the glass rim rings the flags twice
  hx4_bell_jar: { at: 820, x: 51, y: 51, rgb: "226 220 198", boom: true },
  // Toad Pond: THE SLAKE BOILS OVER - the pit kicks with two hot rings
  hx4_toad_pond: { at: 840, x: 49, y: 53, rgb: "239 230 207", boom: true, size: 8 },
  // Borrowed Crown: THE LEAF PRESSED - one gold column presses the gilding home
  hx4_borrowed_crown: { at: 800, x: 50, y: 48, rgb: "224 180 85", laser: true, size: 6 },
  // Soft Shells: THE COMB BITES - the soft face combs off in two flakes
  hx4_soft_shells: { at: 820, x: 52, y: 51, rgb: "199 184 160", glyph: 0, size: 6.6 },
  // Gum Wrapper: THE PARCEL CINCHED - the cord snaps tight with a double knock
  hx4_gum_wrapper: { at: 760, x: 50, y: 50, rgb: "214 184 119", boom: true },
  // Pet Rock: THE GALLET TAPPED IN - one small proud tap, slightly askew
  ov_pet_rock: { at: 740, x: 51, y: 52, rgb: "143 154 164", rot: 12, size: 5.6 },
  // Dusty Boots: THE BRUSH THUMP - the broom butt knocks the bench once
  hx4_dusty_boots: { at: 720, x: 50, y: 53, rgb: "203 191 165", size: 6 },
  // Loose Horseshoe: THE LEAD RUN - the ladle tips and the cramp sets with two dull rings
  hx4_loose_horseshoe: { at: 740, x: 49, y: 51, rgb: "154 161 168", boom: true },
};


/** Board-wide wash. Always inside a BoardFrame. */
function Wash({ tone, d = 60 }: { tone: string; d?: number }) {
  return (
    <L c="g28-wash" d={d} st={{ background: `radial-gradient(circle at 50% 50%, ${tone}, transparent 70%)` }} />
  );
}

/** Board-wide grit veil, drifting away from the caster. Inside a BoardFrame. */
function Grit({ tone, d = 140 }: { tone: string; d?: number }) {
  return (
    <L c="g28-grit" d={d} st={{ background: `linear-gradient(180deg, ${tone}, transparent 62%)` }} />
  );
}

const TWO = [0, 1];
const THREE = [0, 1, 2];
const FOUR = [0, 1, 2, 3];
const SIX = [0, 1, 2, 3, 4, 5];

/* =============================================================================
   1. Written in Stone (t8) — INCISED LETTERING. A setting-out line is snapped
   across the slab, the lettering chisel is walked along it under the dummy
   mallet, three V-section strokes open in order, and stone flour drifts off
   the cut. Palette #d8c9a8 / #fff4d6 / #2b2419.
   ========================================================================== */
function LetterCut({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={12} t={72} w={76} h={5} st={{ background: "#2b2419" }} />
        <V c="g28-ent" d={190} l={18} t={20} w={64} h={54}>
          <rect x="2.5" y="4" width="19" height="16" fill="#2b2419" stroke="#d8c9a8" strokeWidth="1.2" />
          <path d="M8 17.5l4-10 4 10M9.6 14h4.8" fill="none" stroke="#fff4d6" strokeWidth="1.7" {...SJ} />
        </V>
        <V c="g28-ent3" d={430} l={54} t={6} w={30} h={46}>
          <path d="M10.6 2h2.8v12l-1.4 6-1.4-6z" fill="#d8c9a8" stroke="#2b2419" strokeWidth="1.1" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={8} t={74} w={84} h={6} st={{ background: "#d8c9a8" }} />
        <V c="g28-hit" d={190} ix={30} l={20} t={18} w={60} h={60}>
          <path d="M12 3.5l6.4 15.5H5.6z" fill="#2b2419" stroke="#d8c9a8" strokeWidth="1.3" />
          <path d="M12 8l3 7.6H9z" fill="#fff4d6" />
        </V>
        <L
          c="g28-hit3"
          d={390}
          l={24}
          t={24}
          w={52}
          h={52}
          st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.6), transparent 70%)" }}
        />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.bn4_written_in_stone} d={delayMs} frame={<Wash tone="rgba(216,201,168,0.3)" d={60} />}>
      <L c="g28-wi-rule" d={90} st={{ ...box(6.4, 0.12), background: "#fff4d6" }} />
      <L
        c="g28-lean"
        d={150}
        st={{ ...box(3.4, 0.9, 0, 1.5), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(43,36,25,0.75), transparent 72%)" }}
      />
      <V c="g28-tap" d={230} st={box(1.9, 3.6, 0, -1.7)}>
        <path d="M8.8 1h6.4l1.2 4.4H7.6z" fill="#d8c9a8" stroke="#2b2419" strokeWidth="1.1" />
        <path d="M10.4 5.4h3.2l-.5 12.4-1.1 4.6-1.1-4.6z" fill="#d8c9a8" stroke="#2b2419" strokeWidth="1.1" />
      </V>
      {THREE.map((i) => (
        <V key={i} c="g28-wi-cut" d={350} o={i * 80} st={box(1.5, 2.1, i * 1.7 - 1.7, 0.5)}>
          <path d="M12 2.5l7 18H5z" fill="#2b2419" />
          <path d="M12 6.5l4 11H8z" fill="#fff4d6" />
        </V>
      ))}
      <L
        c="g28-wi-flour"
        d={540}
        st={{ ...box(4.4, 1.5, 0, 1.3), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(255,244,214,0.6), transparent 74%)" }}
      />
      <L
        c="g28-drift"
        d={700}
        st={{ ...box(5.2, 2.6, 0, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(216,201,168,0.42), transparent 72%)" }}
      />
    </Lead>
  );
}

/* =============================================================================
   2. Gorgon's Court (t8) — PLUG AND FEATHERS. A run of holes is drilled down
   the line in the real victim order, feathers and plugs are set in each, the
   row is struck, and the block splits along the whole run.
   Palette #b9c2cc / #f4ecd4 / #23272e.
   ========================================================================== */
function PlugFeather({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={10} t={70} w={80} h={6} st={{ background: "#23272e" }} />
        <V c="g28-ent" d={190} l={20} t={22} w={60} h={52}>
          <rect x="3" y="6" width="18" height="13" fill="#23272e" stroke="#b9c2cc" strokeWidth="1.2" />
          <path d="M9 6v13M15 6v13" stroke="#b9c2cc" strokeWidth="1.4" />
          <path d="M12 3.5v4" stroke="#f4ecd4" strokeWidth="2.4" {...SJ} />
        </V>
        <L c="g28-ent3" d={420} l={44} t={16} w={12} h={62} st={{ background: "#f4ecd4" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={46} t={6} w={8} h={88} st={{ background: "#23272e" }} />
        <V c="g28-hit" d={200} ix={34} l={22} t={20} w={56} h={56}>
          <path d="M8 3h3l1 15-2.5 4z" fill="#b9c2cc" stroke="#23272e" strokeWidth="1" />
          <path d="M13 3h3l-1.5 19-2-4z" fill="#b9c2cc" stroke="#23272e" strokeWidth="1" />
          <path d="M11 3h2v6h-2z" fill="#f4ecd4" />
        </V>
        <L c="g28-hit3" d={400} l={30} t={30} w={40} h={40} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(244,236,212,0.6), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <AimLead imp={IMP.hx4_gorgons_court}
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(185,194,204,0.28)" d={60} />
          <Grit tone="rgba(35,39,46,0.34)" d={150} />
        </>
      }
    >
      <L c="g28-lane" d={90} st={{ ...lane(0.12), background: "#f4ecd4" }} />
      {FOUR.map((i) => (
        <L
          key={i}
          c="g28-gc-drill"
          d={200}
          o={i * 60}
          ix={18}
          st={{ ...at(0.34, 0.34, 0.16 + i * 0.26), borderRadius: "50%", background: "#23272e" }}
        />
      ))}
      {FOUR.map((i) => (
        <V key={i} c="g28-gc-plug" d={420} o={i * 55} ix={18} st={at(0.7, 1.6, 0.16 + i * 0.26, -0.35)}>
          <path d="M7 2h4l1 16-3 4-3-4z" fill="#b9c2cc" stroke="#23272e" strokeWidth="1.1" />
          <path d="M13 2h4l-2 20-3-4z" fill="#b9c2cc" stroke="#23272e" strokeWidth="1.1" />
        </V>
      ))}
      <L c="g28-gc-split" d={620} st={{ ...lane(0.34), background: "linear-gradient(180deg, #23272e, #f4ecd4 50%, #23272e)" }} />
      <L c="g28-drift" d={760} st={{ ...lane(2.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(185,194,204,0.4), transparent 74%)" }} />
    </AimLead>
  );
}

/* =============================================================================
   3. Hunter's Moon (t8) — THE TEMPLATE SCRIBED ROUND. The trammel's centre pin
   thunks into the slab, the beam swings, a crescent is scribed segment by
   segment, and the scribed moon lifts off the stone.
   Palette #cdd6de / #fff1cf / #1f2630.
   ========================================================================== */
function TrammelArc({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={14} t={72} w={72} h={5} st={{ background: "#1f2630" }} />
        <V c="g28-ent" d={190} l={20} t={18} w={60} h={58}>
          <path d="M15.5 3.4a9 9 0 1 0 5 8.2 7 7 0 0 1-5-8.2z" fill="#cdd6de" stroke="#1f2630" strokeWidth="1.1" />
        </V>
        <V c="g28-ent3" d={430} l={12} t={30} w={66} h={40}>
          <path d="M3 12h18" stroke="#fff1cf" strokeWidth="1.6" {...SJ} />
          <circle cx="3" cy="12" r="1.8" fill="#1f2630" stroke="#cdd6de" strokeWidth="1" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={10} t={72} w={80} h={6} st={{ background: "#cdd6de" }} />
        <V c="g28-hit" d={200} ix={30} l={20} t={20} w={60} h={60}>
          <path d="M14.6 3a9 9 0 1 0 5.4 8.6A7.2 7.2 0 0 1 14.6 3z" fill="#1f2630" stroke="#cdd6de" strokeWidth="1.3" />
          <path d="M9.4 9.6a4.4 4.4 0 0 0 5 6" fill="none" stroke="#fff1cf" strokeWidth="1.3" {...SJ} />
        </V>
        <L c="g28-hit3" d={390} l={28} t={28} w={44} h={44} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,241,207,0.55), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_hunters_moon} d={delayMs} frame={<Wash tone="rgba(205,214,222,0.28)" d={70} />}>
      <L c="g28-hm-pin" d={90} st={{ ...box(0.5, 0.5), borderRadius: "50%", background: "#fff1cf" }} />
      <L
        c="g28-lean"
        d={160}
        st={{ ...box(3.6, 1, 0, 1.6), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(31,38,48,0.7), transparent 72%)" }}
      />
      <L c="g28-hm-arm" d={250} st={{ ...box(3, 0.16, 1.5, 0), background: "linear-gradient(90deg, #cdd6de, #fff1cf)" }} />
      {FOUR.map((i) => (
        <V key={i} c="g28-hm-arc" d={420} o={i * 70} vb="0 0 40 40" st={box(5.4, 5.4)}>
          <path
            d={["M20 2a18 18 0 0 1 12.7 5.3", "M32.7 7.3A18 18 0 0 1 38 20", "M38 20a18 18 0 0 1-5.3 12.7", "M32.7 32.7A18 18 0 0 1 20 38"][i]}
            fill="none"
            stroke="#fff1cf"
            strokeWidth="1.5"
            strokeDasharray="2.4 1.8"
            {...SJ}
          />
        </V>
      ))}
      <V c="g28-hm-moon" d={620} st={box(2.8, 2.8, 0, -0.2)}>
        <path d="M14.8 2.8a9.4 9.4 0 1 0 5.6 9 7.4 7.4 0 0 1-5.6-9z" fill="#cdd6de" stroke="#1f2630" strokeWidth="1.2" />
      </V>
      <L
        c="g28-drift"
        d={760}
        st={{ ...box(5, 2.6, 0, 0.8), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,241,207,0.35), transparent 74%)" }}
      />
    </Lead>
  );
}

/* =============================================================================
   4. No Quarter (t8) — THE QUARRY WEDGE LINE. Wedges are set the length of the
   line, the maul travels the row striking each in the real order, and the
   ground opens along the whole run. Palette #c8a86e / #ffeec6 / #2a2114.
   ========================================================================== */
function WedgeLine({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={10} t={74} w={80} h={5} st={{ background: "#2a2114" }} />
        <V c="g28-ent" d={190} l={24} t={18} w={52} h={58}>
          <path d="M8 2h8l-2.4 16L12 22l-1.6-4z" fill="#c8a86e" stroke="#2a2114" strokeWidth="1.2" />
          <path d="M9.4 5.4h5.2" stroke="#ffeec6" strokeWidth="1.4" />
        </V>
        <L c="g28-ent3" d={420} l={16} t={62} w={68} h={4} st={{ background: "#ffeec6" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={6} t={70} w={88} h={5} st={{ background: "#c8a86e" }} />
        <V c="g28-hit" d={200} ix={36} l={26} t={16} w={48} h={64}>
          <path d="M7 2h10l-3 17-2 3-2-3z" fill="#c8a86e" stroke="#2a2114" strokeWidth="1.3" />
          <path d="M9 4.6h6" stroke="#ffeec6" strokeWidth="1.6" />
        </V>
        <L c="g28-hit3" d={400} l={22} t={54} w={56} h={34} st={{ borderRadius: "50%", background: "radial-gradient(ellipse, rgba(255,238,198,0.55), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <AimLead imp={IMP.hx4_no_quarter}
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(200,168,110,0.28)" d={60} />
          <Grit tone="rgba(42,33,20,0.3)" d={150} />
        </>
      }
    >
      <L c="g28-lane" d={90} st={{ ...lane(0.12), background: "#ffeec6" }} />
      {SIX.map((i) => (
        <V key={i} c="g28-nq-wedge" d={200} o={i * 45} ix={16} st={at(0.6, 1.4, 0.1 + i * 0.17, -0.3)}>
          <path d="M6 1h12l-4 17-2 4-2-4z" fill="#c8a86e" stroke="#2a2114" strokeWidth="1.4" />
        </V>
      ))}
      <V c="g28-run" d={380} st={box(1.6, 1.6, 0, -1.2)}>
        <rect x="3" y="7" width="14" height="8" fill="#2a2114" stroke="#c8a86e" strokeWidth="1.3" />
        <path d="M17 10.4h5v3.2h-5z" fill="#c8a86e" />
      </V>
      <L c="g28-nq-crack" d={560} st={{ ...lane(0.4, 0.5), background: "linear-gradient(180deg, transparent, #2a2114 45%, #ffeec6 60%, transparent)" }} />
      <L c="g28-drift" d={720} st={{ ...lane(2.6, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(200,168,110,0.4), transparent 74%)" }} />
    </AimLead>
  );
}

/* =============================================================================
   5. Stone Rain (t8) — THE BUSH HAMMER. The pyramid-toothed head swings in
   from the caster's own side, a field of pocks rains across the face, and the
   spalls fly. Palette #a8a196 / #f6ecd2 / #262420.
   ========================================================================== */
function BushHammer({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={12} t={72} w={76} h={6} st={{ background: "#262420" }} />
        <V c="g28-ent" d={190} l={22} t={18} w={56} h={56}>
          <rect x="4" y="5" width="16" height="10" fill="#a8a196" stroke="#262420" strokeWidth="1.2" />
          <path d="M6 15h2v2H6zM10 15h2v2h-2zM14 15h2v2h-2zM18 15h-2v2h2z" fill="#f6ecd2" />
        </V>
        <L c="g28-ent3" d={420} l={34} t={56} w={32} h={30} st={{ borderRadius: "50%", background: "radial-gradient(circle, #f6ecd2, transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={10} t={72} w={80} h={6} st={{ background: "#a8a196" }} />
        <V c="g28-hit" d={200} ix={32} l={20} t={20} w={60} h={60}>
          <rect x="2.5" y="2.5" width="19" height="19" fill="#262420" stroke="#a8a196" strokeWidth="1.2" />
          <path d="M7 6l2 3H5zM13 6l2 3h-4zM7 12l2 3H5zM13 12l2 3h-4zM10 16l2 3H8z" fill="#f6ecd2" />
        </V>
        <L c="g28-hit3" d={390} l={26} t={26} w={48} h={48} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(246,236,210,0.55), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_stone_rain} d={delayMs} frame={<Wash tone="rgba(168,161,150,0.3)" d={60} />}>
      <L
        c="g28-lean"
        d={110}
        st={{ ...box(3.6, 1, 0, 1.6), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(38,36,32,0.75), transparent 72%)" }}
      />
      <V c="g28-side" d={230} st={box(3, 2.2, 0, -1.5)}>
        <rect x="2" y="6" width="20" height="9" fill="#262420" stroke="#a8a196" strokeWidth="1.3" />
        <path d="M4 15l1.6 2.6L7.2 15zM8.4 15l1.6 2.6L11.6 15zM12.8 15l1.6 2.6L16 15zM17.2 15l1.6 2.6L20.4 15z" fill="#a8a196" />
      </V>
      {SIX.map((i) => (
        <V key={i} c="g28-sr-pock" d={380} o={i * 40} st={box(0.8, 0.8, (i % 3) * 1.1 - 1.1, Math.floor(i / 3) * 1 + 0.2)}>
          <path d="M12 4l7 15H5z" fill="#262420" />
          <path d="M12 9l3.4 7.4H8.6z" fill="#f6ecd2" />
        </V>
      ))}
      <L
        c="g28-sr-spall"
        d={560}
        st={{ ...box(4.6, 1.6, 0, 1.1), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(246,236,210,0.6), transparent 72%)" }}
      />
      <L
        c="g28-drift"
        d={720}
        st={{ ...box(5.4, 2.8, 0, 0.5), borderRadius: "50%", background: "radial-gradient(circle, rgba(168,161,150,0.42), transparent 74%)" }}
      />
    </Lead>
  );
}

/* =============================================================================
   6. Castle of Sand (t7) — THE SAND-SLURRY FRAME SAW. The kerf is marked, the
   toothless blade strokes it, slurry is fed in, the kerf deepens and the tower
   goes over. Palette #d9bf8a / #fff2d2 / #33291a.
   ========================================================================== */
function SandSaw({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={12} t={74} w={76} h={5} st={{ background: "#33291a" }} />
        <V c="g28-ent" d={190} l={16} t={26} w={68} h={46}>
          <rect x="2" y="9" width="20" height="3" fill="#d9bf8a" stroke="#33291a" strokeWidth="1" />
          <path d="M4 15h16" stroke="#fff2d2" strokeWidth="1.4" strokeDasharray="2 2" />
        </V>
        <L c="g28-ent3" d={430} l={34} t={54} w={32} h={30} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff2d2, transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={8} t={68} w={84} h={6} st={{ background: "#d9bf8a" }} />
        <V c="g28-hit" d={200} ix={32} l={18} t={18} w={64} h={64}>
          <path d="M5 4h4v2.2h2.4V4h4v2.2H18V4h2v5l-1.6 1.4v7L20 20H4l1.6-2.6v-7L4 9V4z" fill="#33291a" stroke="#d9bf8a" strokeWidth="1.1" />
          <path d="M4 14h16" stroke="#fff2d2" strokeWidth="1.4" />
        </V>
        <L c="g28-hit3" d={400} l={22} t={54} w={56} h={34} st={{ borderRadius: "50%", background: "radial-gradient(ellipse, rgba(255,242,210,0.55), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <AimLead imp={IMP.hx4_castle_of_sand} d={delayMs} frame={<Wash tone="rgba(217,191,138,0.3)" d={60} />}>
      <L c="g28-lane" d={90} st={{ ...lane(0.12), background: "#fff2d2" }} />
      <L c="g28-cs-blade" d={220} st={{ ...lane(0.24, -0.4), background: "linear-gradient(90deg, #33291a, #d9bf8a 40%, #fff2d2)" }} />
      {THREE.map((i) => (
        <L
          key={i}
          c="g28-cs-slurry"
          d={380}
          o={i * 60}
          ix={20}
          st={{ ...at(0.5, 1.3, 0.24 + i * 0.28, -0.9), background: "linear-gradient(180deg, #fff2d2, rgba(217,191,138,0))" }}
        />
      ))}
      <L c="g28-cs-kerf" d={520} st={{ ...lane(0.5, 0.2), background: "linear-gradient(180deg, #33291a, rgba(51,41,26,0))" }} />
      <V c="g28-land" d={660} st={far(1.8, 2.4, -0.6)}>
        <path d="M5 4h3.2v2.2h2.6V4H14v2.2h2.6V4H20v5.2l-1.8 1.4v7L20 21H4l1.8-3.4v-7L4 9.2z" fill="#d9bf8a" stroke="#33291a" strokeWidth="1.2" />
      </V>
      <L c="g28-drift" d={800} st={{ ...lane(2.4, 0.5), borderRadius: "50%", background: "radial-gradient(circle, rgba(217,191,138,0.4), transparent 74%)" }} />
    </AimLead>
  );
}

/* =============================================================================
   7. Gorgon Field (t7) — THE BANKER TURNTABLE SPUN. The mason's banker top is
   thumped down, the block on it is spun, and each face in turn is presented to
   the light. Palette #9fa9a2 / #f3ecd6 / #1f2622.
   ========================================================================== */
function BankerTurn({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={14} t={72} w={72} h={6} st={{ background: "#1f2622" }} />
        <V c="g28-ent" d={190} l={22} t={22} w={56} h={52}>
          <rect x="6" y="4" width="12" height="12" fill="#9fa9a2" stroke="#1f2622" strokeWidth="1.2" />
          <ellipse cx="12" cy="18" rx="9" ry="3" fill="#1f2622" stroke="#f3ecd6" strokeWidth="1" />
        </V>
        <L c="g28-ent3" d={430} l={30} t={26} w={40} h={40} st={{ borderRadius: "50%", background: "radial-gradient(circle, #f3ecd6, transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={12} t={74} w={76} h={6} st={{ background: "#9fa9a2" }} />
        <V c="g28-hit" d={200} ix={30} l={20} t={18} w={60} h={60}>
          <rect x="5" y="4" width="14" height="14" fill="#1f2622" stroke="#9fa9a2" strokeWidth="1.3" />
          <path d="M8.4 11a3.6 3.6 0 0 1 7.2 0" fill="none" stroke="#f3ecd6" strokeWidth="1.4" {...SJ} />
          <circle cx="12" cy="11" r="1.3" fill="#f3ecd6" />
        </V>
        <L c="g28-hit3" d={390} l={26} t={26} w={48} h={48} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(243,236,214,0.55), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_gorgon_field} d={delayMs} frame={<Wash tone="rgba(159,169,162,0.3)" d={70} />}>
      <L c="g28-gf-table" d={100} st={{ ...box(4.4, 1.6, 0, 1.1), borderRadius: "50%", background: "radial-gradient(ellipse, #1f2622 40%, rgba(31,38,34,0))" }} />
      <L
        c="g28-lean"
        d={160}
        st={{ ...box(3.4, 1, 0, 1.4), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(31,38,34,0.7), transparent 72%)" }}
      />
      <V c="g28-gf-block" d={260} st={box(2.8, 3, 0, -0.4)}>
        <rect x="4" y="3" width="16" height="16" fill="#9fa9a2" stroke="#1f2622" strokeWidth="1.4" />
        <path d="M4 7h16M4 15h16" stroke="#1f2622" strokeWidth="0.9" />
      </V>
      {FOUR.map((i) => (
        <L
          key={i}
          c="g28-gf-face"
          d={420}
          o={i * 80}
          st={{ ...box(0.9, 2.6, i * 0.9 - 1.35, -0.4), background: "linear-gradient(180deg, rgba(243,236,214,0.85), rgba(243,236,214,0))" }}
        />
      ))}
      <L
        c="g28-drift"
        d={700}
        st={{ ...box(5, 2.6, 0, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(243,236,214,0.36), transparent 74%)" }}
      />
    </Lead>
  );
}

/* =============================================================================
   8. Stone Garden (t7) — THE CLAW CHISEL. The claw travels the line and rakes
   four parallel furrows the real length of the run, throwing stone curls.
   Palette #c2b393 / #ffeecb / #2d271b.
   ========================================================================== */
function ClawRake({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={12} t={72} w={76} h={5} st={{ background: "#2d271b" }} />
        <V c="g28-ent" d={190} l={22} t={16} w={56} h={60}>
          <path d="M10 2h4v14h-4z" fill="#c2b393" stroke="#2d271b" strokeWidth="1.1" />
          <path d="M9.4 16h1.2v5H9.4zM11.4 16h1.2v5h-1.2zM13.4 16h1.2v5h-1.2z" fill="#ffeecb" />
        </V>
        <L c="g28-ent3" d={430} l={18} t={78} w={64} h={4} st={{ background: "#ffeecb" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={8} t={70} w={84} h={6} st={{ background: "#c2b393" }} />
        <V c="g28-hit" d={200} ix={30} l={18} t={20} w={64} h={60}>
          <rect x="3" y="4" width="18" height="16" fill="#2d271b" stroke="#c2b393" strokeWidth="1.2" />
          <path d="M5 8h14M5 12h14M5 16h14" stroke="#ffeecb" strokeWidth="1.3" />
        </V>
        <L c="g28-hit3" d={390} l={26} t={26} w={48} h={48} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,238,203,0.55), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <AimLead imp={IMP.hx4_stone_garden}
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(194,179,147,0.28)" d={60} />
          <Grit tone="rgba(45,39,27,0.3)" d={150} />
        </>
      }
    >
      <L c="g28-lane" d={90} st={{ ...lane(0.12), background: "#ffeecb" }} />
      <V c="g28-run" d={220} st={box(1.4, 2, 0, -0.9)}>
        <path d="M9 1h6v13H9z" fill="#c2b393" stroke="#2d271b" strokeWidth="1.2" />
        <path d="M8.6 14h1.4v8H8.6zM11.3 14h1.4v8h-1.4zM14 14h1.4v8H14z" fill="#2d271b" />
      </V>
      {FOUR.map((i) => (
        <L
          key={i}
          c="g28-sg-furrow"
          d={360}
          o={i * 70}
          ix={18}
          st={{ ...lane(0.16, i * 0.5 - 0.75), background: "linear-gradient(90deg, #2d271b, #ffeecb)" }}
        />
      ))}
      <L
        c="g28-sg-curl"
        d={560}
        st={{ ...at(2.4, 1.2, 0.55, -1.1), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(255,238,203,0.62), transparent 72%)" }}
      />
      <L c="g28-drift" d={720} st={{ ...lane(2.6, 0.3), borderRadius: "50%", background: "radial-gradient(circle, rgba(194,179,147,0.4), transparent 74%)" }} />
    </AimLead>
  );
}

/* =============================================================================
   9. Stone Orchard (t7) — THE POINT CHISEL ROUGHING OUT. The waste line is
   marked, the point jabs the block down, three roughed-out trunks stand out of
   the waste, and the chips fly. Palette #b0a894 / #f7edcf / #282318.
   ========================================================================== */
function PointRough({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={12} t={74} w={76} h={5} st={{ background: "#282318" }} />
        <V c="g28-ent" d={190} l={26} t={14} w={48} h={62}>
          <path d="M10 2h4v13l-2 7-2-7z" fill="#b0a894" stroke="#282318" strokeWidth="1.2" />
          <path d="M11 15h2l-1 5z" fill="#f7edcf" />
        </V>
        <L c="g28-ent3" d={430} l={22} t={62} w={56} h={26} st={{ borderRadius: "50%", background: "radial-gradient(ellipse, #f7edcf, transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={10} t={74} w={80} h={6} st={{ background: "#b0a894" }} />
        <V c="g28-hit" d={200} ix={30} l={22} t={16} w={56} h={64}>
          <path d="M9 21V9a3 3 0 0 1 6 0v12z" fill="#282318" stroke="#b0a894" strokeWidth="1.2" />
          <path d="M12 9V3M12 6l3-2M12 6L9 4" stroke="#f7edcf" strokeWidth="1.3" {...SJ} />
        </V>
        <L c="g28-hit3" d={390} l={28} t={28} w={44} h={44} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(247,237,207,0.55), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_stone_orchard} d={delayMs} frame={<Wash tone="rgba(176,168,148,0.3)" d={60} />}>
      <L c="g28-tell" d={90} st={{ ...box(5.6, 0.14, 0, 1.5), background: "#f7edcf" }} />
      <L
        c="g28-lean"
        d={150}
        st={{ ...box(3.6, 1, 0, 1.7), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(40,35,24,0.72), transparent 72%)" }}
      />
      <V c="g28-so-point" d={240} st={box(1.2, 3.4, 0, -1.8)}>
        <path d="M9.6 1h4.8v14L12 22l-2.4-7z" fill="#b0a894" stroke="#282318" strokeWidth="1.2" />
        <path d="M10.8 15h2.4L12 20z" fill="#f7edcf" />
      </V>
      {THREE.map((i) => (
        <V key={i} c="g28-so-form" d={400} o={i * 90} st={box(1.4, 2.8, i * 1.7 - 1.7, 0.2)}>
          <path d="M8 22V10a4 4 0 0 1 8 0v12z" fill="#282318" stroke="#b0a894" strokeWidth="1.3" />
          <path d="M12 10V3" stroke="#f7edcf" strokeWidth="1.4" {...SJ} />
        </V>
      ))}
      <L
        c="g28-so-chip"
        d={580}
        st={{ ...box(4.6, 1.5, 0, -0.6), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(247,237,207,0.6), transparent 72%)" }}
      />
      <L
        c="g28-drift"
        d={740}
        st={{ ...box(5.4, 2.6, 0, 0.7), borderRadius: "50%", background: "radial-gradient(circle, rgba(176,168,148,0.4), transparent 74%)" }}
      />
    </Lead>
  );
}

/* =============================================================================
   10. Traitor's Gala (t7) — THE LEWIS PIN. A dovetail socket is cut, the
   three-legged lewis drops in and locks, the chain draws taut and two blocks
   swing away over the caster's own side. Palette #b6bcc4 / #f5eed6 / #20242a.
   ========================================================================== */
function LewisLift({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={14} t={74} w={72} h={5} st={{ background: "#20242a" }} />
        <V c="g28-ent" d={190} l={24} t={18} w={52} h={58}>
          <path d="M8 8h8l-1.4 12H9.4z" fill="#20242a" stroke="#b6bcc4" strokeWidth="1.2" />
          <path d="M10.6 2h2.8v6h-2.8z" fill="#b6bcc4" />
          <circle cx="12" cy="3" r="1.8" fill="none" stroke="#f5eed6" strokeWidth="1.1" />
        </V>
        <L c="g28-ent3" d={430} l={30} t={60} w={40} h={26} st={{ borderRadius: "50%", background: "radial-gradient(ellipse, #f5eed6, transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={12} t={74} w={76} h={6} st={{ background: "#b6bcc4" }} />
        <V c="g28-hit" d={200} ix={32} l={22} t={16} w={56} h={62}>
          <rect x="4" y="10" width="16" height="10" fill="#20242a" stroke="#b6bcc4" strokeWidth="1.3" />
          <path d="M9 10V5h6v5M12 5V2" stroke="#f5eed6" strokeWidth="1.4" fill="none" {...SJ} />
        </V>
        <L c="g28-hit3" d={390} l={28} t={28} w={44} h={44} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(245,238,214,0.55), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_traitors_gala} d={delayMs} frame={<Wash tone="rgba(182,188,196,0.28)" d={70} />}>
      <L c="g28-tg-socket" d={90} st={{ ...box(1.5, 0.36, 0, -0.2), background: "#20242a" }} />
      <L
        c="g28-lean"
        d={160}
        st={{ ...box(3.4, 1, 0, 1.5), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(32,36,42,0.72), transparent 72%)" }}
      />
      <V c="g28-tg-lewis" d={220} st={box(1.6, 2.6, 0, -1)}>
        <path d="M7.4 8l1.6 12h6l1.6-12z" fill="#b6bcc4" stroke="#20242a" strokeWidth="1.2" />
        <path d="M11 2h2v6h-2z" fill="#b6bcc4" stroke="#20242a" strokeWidth="1" />
        <circle cx="12" cy="3" r="1.7" fill="none" stroke="#f5eed6" strokeWidth="1.2" />
      </V>
      <L c="g28-tg-hoist" d={360} st={{ ...box(0.18, 4.4, 0, -2.6), background: "linear-gradient(180deg, #f5eed6, #b6bcc4)" }} />
      {TWO.map((i) => (
        <V key={i} c="g28-side" d={500} o={i * 110} st={box(1.8, 1.5, i * 2.2 - 1.1, 0.3)}>
          <rect x="2" y="5" width="20" height="14" fill="#20242a" stroke="#b6bcc4" strokeWidth="1.3" />
          <path d="M2 12h20" stroke="#f5eed6" strokeWidth="1" />
        </V>
      ))}
      <L
        c="g28-drift"
        d={720}
        st={{ ...box(5, 2.4, 0, 0.9), borderRadius: "50%", background: "radial-gradient(circle, rgba(182,188,196,0.38), transparent 74%)" }}
      />
    </Lead>
  );
}

/* =============================================================================
   11. Brittle Arsenal (t6) — THE BOLSTER. The wide bolster chisel is set on the
   scribed line and driven; the slab parts into two clean halves that slide
   apart along the run. Palette #cbb089 / #fff1cd / #2a2416.
   ========================================================================== */
function BolsterSplit({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={12} t={74} w={76} h={5} st={{ background: "#2a2416" }} />
        <V c="g28-ent" d={190} l={26} t={16} w={48} h={60}>
          <path d="M8.6 2h6.8v13H8.6z" fill="#cbb089" stroke="#2a2416" strokeWidth="1.2" />
          <path d="M7.4 15h9.2l-1.4 5H8.8z" fill="#fff1cd" stroke="#2a2416" strokeWidth="1" />
        </V>
        <L c="g28-ent3" d={430} l={16} t={80} w={68} h={4} st={{ background: "#fff1cd" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={46} t={8} w={8} h={84} st={{ background: "#fff1cd" }} />
        <V c="g28-hit" d={200} ix={30} l={18} t={20} w={64} h={60}>
          <path d="M2 5h8v14H2z" fill="#2a2416" stroke="#cbb089" strokeWidth="1.2" />
          <path d="M14 5h8v14h-8z" fill="#2a2416" stroke="#cbb089" strokeWidth="1.2" />
        </V>
        <L c="g28-hit3" d={390} l={26} t={26} w={48} h={48} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,241,205,0.55), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <AimLead imp={IMP.hx4_brittle_arsenal} d={delayMs} frame={<Wash tone="rgba(203,176,137,0.3)" d={60} />}>
      <L c="g28-lane" d={90} st={{ ...lane(0.12), background: "#fff1cd" }} />
      <V c="g28-ba-bolster" d={230} st={box(1.4, 3, 0, -1.6)}>
        <path d="M9 1h6v14H9z" fill="#cbb089" stroke="#2a2416" strokeWidth="1.2" />
        <path d="M6.6 15h10.8l-1.6 6H8.2z" fill="#fff1cd" stroke="#2a2416" strokeWidth="1.1" />
      </V>
      {TWO.map((i) => (
        <L
          key={i}
          c="g28-ba-halves"
          d={400}
          o={i * 60}
          st={{ ...lane(0.9, i === 0 ? -0.62 : 0.62), background: i === 0 ? "linear-gradient(180deg, #cbb089, #2a2416)" : "linear-gradient(180deg, #2a2416, #cbb089)" }}
        />
      ))}
      <L c="g28-ba-line" d={520} st={{ ...lane(0.14), background: "#fff1cd" }} />
      <L c="g28-drift" d={680} st={{ ...lane(2.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(203,176,137,0.4), transparent 74%)" }} />
    </AimLead>
  );
}

/* =============================================================================
   12. Debt Collector (t6) — POINTING THE JOINT. The raker drags the old mortar
   out of the bed joint, the pointing trowel presses the fresh mix in, and the
   finished bead is struck off along the course.
   Palette #cdbfa4 / #f8f0d8 / #302a1e.
   ========================================================================== */
function JointPoint({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={12} t={72} w={76} h={6} st={{ background: "#302a1e" }} />
        <V c="g28-ent" d={190} l={20} t={20} w={60} h={54}>
          <path d="M4 4h16l-8 12z" fill="#cdbfa4" stroke="#302a1e" strokeWidth="1.2" />
          <path d="M11 16h2v6h-2z" fill="#302a1e" />
        </V>
        <L c="g28-ent3" d={430} l={14} t={62} w={72} h={5} st={{ background: "#f8f0d8" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={8} t={46} w={84} h={7} st={{ background: "#f8f0d8" }} />
        <V c="g28-hit" d={200} ix={30} l={18} t={18} w={64} h={64}>
          <rect x="2" y="3" width="20" height="7" fill="#302a1e" stroke="#cdbfa4" strokeWidth="1.2" />
          <rect x="2" y="14" width="20" height="7" fill="#302a1e" stroke="#cdbfa4" strokeWidth="1.2" />
        </V>
        <L c="g28-hit3" d={390} l={26} t={30} w={48} h={40} st={{ borderRadius: "50%", background: "radial-gradient(ellipse, rgba(248,240,216,0.55), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_debt_collector} d={delayMs} frame={<Wash tone="rgba(205,191,164,0.3)" d={70} />}>
      <L c="g28-dc-rake" d={90} st={{ ...box(4.8, 0.3, 0, -0.1), background: "linear-gradient(90deg, #302a1e, rgba(48,42,30,0))" }} />
      <L
        c="g28-lean"
        d={160}
        st={{ ...box(3.4, 1, 0, 1.5), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(48,42,30,0.7), transparent 72%)" }}
      />
      <V c="g28-dc-trowel" d={300} st={box(2.4, 2.6, 0.4, -1.3)}>
        <path d="M2 3h20l-10 14z" fill="#cdbfa4" stroke="#302a1e" strokeWidth="1.3" />
        <path d="M11 17h2v6h-2z" fill="#302a1e" />
      </V>
      {THREE.map((i) => (
        <L
          key={i}
          c="g28-dc-bead"
          d={460}
          o={i * 60}
          st={{ ...box(1.7, 0.34, i * 1.75 - 1.75, -0.1), background: "linear-gradient(180deg, #f8f0d8, #cdbfa4)" }}
        />
      ))}
      <L
        c="g28-drift"
        d={640}
        st={{ ...box(4.8, 2.2, 0, 0.7), borderRadius: "50%", background: "radial-gradient(circle, rgba(205,191,164,0.4), transparent 74%)" }}
      />
    </Lead>
  );
}

/* =============================================================================
   13. The Walnut Crown (t6) — RUNNING A MOULDING. The zinc profile template is
   stamped against the arris, the crown moulding is run along the edge, and the
   finished profile lifts clear. Palette #e8c56a / #fff4d6 / #33260f.
   ========================================================================== */
function CrownMould({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={12} t={74} w={76} h={5} st={{ background: "#33260f" }} />
        <V c="g28-ent" d={190} l={20} t={22} w={60} h={52}>
          <path d="M3 20V9a6 6 0 0 1 6-6h12v4H9a2 2 0 0 0-2 2v11z" fill="#e8c56a" stroke="#33260f" strokeWidth="1.2" />
        </V>
        <V c="g28-ent3" d={430} l={30} t={8} w={40} h={36}>
          <path d="M4 18l2-9 6 5 6-5 2 9z" fill="#fff4d6" stroke="#33260f" strokeWidth="1.1" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={8} t={72} w={84} h={6} st={{ background: "#e8c56a" }} />
        <V c="g28-hit" d={200} ix={30} l={20} t={18} w={60} h={60}>
          <path d="M4 20V10a6 6 0 0 1 6-6h10v4h-9a3 3 0 0 0-3 3v9z" fill="#33260f" stroke="#e8c56a" strokeWidth="1.3" />
          <path d="M13 12h7v8h-7z" fill="#fff4d6" opacity="0.85" />
        </V>
        <L c="g28-hit3" d={390} l={26} t={26} w={48} h={48} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,244,214,0.55), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_walnut_crown} d={delayMs} frame={<Wash tone="rgba(232,197,106,0.28)" d={70} />}>
      <V c="g28-wc-temp" d={100} st={box(2.2, 2.2, -1.6, -0.6)}>
        <path d="M2 22V8a6 6 0 0 1 6-6h14v4H9a3 3 0 0 0-3 3v13z" fill="none" stroke="#fff4d6" strokeWidth="2" {...SJ} />
      </V>
      <L
        c="g28-lean"
        d={160}
        st={{ ...box(3.6, 1, 0, 1.6), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(51,38,15,0.72), transparent 72%)" }}
      />
      <L c="g28-wc-run" d={240} st={{ ...box(5.4, 0.9, 0, 0.2), background: "linear-gradient(180deg, #e8c56a, #33260f 55%, #e8c56a)" }} />
      <V c="g28-wc-crown" d={420} st={box(2.8, 2, 0, -1.5)}>
        <path d="M2 20l2.4-12L12 14l7.6-6L22 20z" fill="#e8c56a" stroke="#33260f" strokeWidth="1.3" />
        <circle cx="12" cy="6" r="1.6" fill="#fff4d6" />
      </V>
      <L
        c="g28-drift"
        d={620}
        st={{ ...box(5, 2.4, 0, 0.8), borderRadius: "50%", background: "radial-gradient(circle, rgba(232,197,106,0.38), transparent 74%)" }}
      />
    </Lead>
  );
}

/* =============================================================================
   14. Walnut Pinch (t6) — THE NIPPERS. Two jaws close on the arris and nibble
   a single flake off the edge, which spins away.
   Palette #aeb6bf / #f4ecd2 / #22262b.
   ========================================================================== */
function NipperPinch({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={14} t={74} w={72} h={5} st={{ background: "#22262b" }} />
        <V c="g28-ent" d={190} l={24} t={16} w={52} h={60}>
          <path d="M8 2l3 9-3 10M16 2l-3 9 3 10" fill="none" stroke="#aeb6bf" strokeWidth="2.4" {...SJ} />
          <circle cx="12" cy="11" r="1.5" fill="#f4ecd2" />
        </V>
        <L c="g28-ent3" d={430} l={36} t={58} w={28} h={26} st={{ borderRadius: "50%", background: "radial-gradient(circle, #f4ecd2, transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={10} t={72} w={80} h={6} st={{ background: "#aeb6bf" }} />
        <V c="g28-hit" d={200} ix={30} l={22} t={20} w={56} h={56}>
          <path d="M4 4h16v16H4z" fill="#22262b" stroke="#aeb6bf" strokeWidth="1.3" />
          <path d="M20 4l-6 0 6 6z" fill="#f4ecd2" />
        </V>
        <L c="g28-hit3" d={390} l={28} t={28} w={44} h={44} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(244,236,210,0.55), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_walnut_pinch} d={delayMs} frame={<Wash tone="rgba(174,182,191,0.28)" d={70} />}>
      <L c="g28-tell" d={90} st={{ ...box(3.6, 0.14, 0, 0.9), background: "#f4ecd2" }} />
      <L
        c="g28-lean"
        d={160}
        st={{ ...box(3.2, 0.9, 0, 1.5), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(34,38,43,0.72), transparent 72%)" }}
      />
      {TWO.map((i) => (
        <V key={i} c="g28-wp-nip" d={240} o={i * 40} st={box(1.5, 3, i === 0 ? -0.85 : 0.85, -1)}>
          <path d={i === 0 ? "M14 1l-4 10 4 11" : "M10 1l4 10-4 11"} fill="none" stroke="#aeb6bf" strokeWidth="3" {...SJ} />
        </V>
      ))}
      <V c="g28-wp-flake" d={400} st={box(1.1, 1.1, 1, 0.6)}>
        <path d="M3 14l7-11 11 5-8 8z" fill="#f4ecd2" stroke="#22262b" strokeWidth="1.2" />
      </V>
      <L
        c="g28-drift"
        d={580}
        st={{ ...box(4.4, 2.2, 0, 0.7), borderRadius: "50%", background: "radial-gradient(circle, rgba(174,182,191,0.38), transparent 74%)" }}
      />
    </Lead>
  );
}

/* =============================================================================
   15. Stone Cloak (t5) — THE RUBBING STONE. Water is thrown on the face, the
   rubbing block is worked back and forth from the caster's own side, and the
   sheen comes up across the finished surface.
   Palette #ded3bb / #fff6dd / #2c2a22.
   ========================================================================== */
function RubbingStone({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={12} t={74} w={76} h={5} st={{ background: "#2c2a22" }} />
        <V c="g28-ent" d={190} l={18} t={26} w={64} h={46}>
          <rect x="3" y="7" width="18" height="8" fill="#ded3bb" stroke="#2c2a22" strokeWidth="1.2" />
          <path d="M3 17h18" stroke="#fff6dd" strokeWidth="1.6" />
        </V>
        <L c="g28-ent3" d={430} l={16} t={30} w={68} h={12} st={{ background: "linear-gradient(90deg, transparent, #fff6dd, transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={10} t={72} w={80} h={6} st={{ background: "#ded3bb" }} />
        <V c="g28-hit" d={200} ix={30} l={20} t={20} w={60} h={60}>
          <rect x="3" y="3" width="18" height="18" fill="#2c2a22" stroke="#ded3bb" strokeWidth="1.3" />
          <path d="M5 17L17 5" stroke="#fff6dd" strokeWidth="2.2" {...SJ} />
        </V>
        <L c="g28-hit3" d={390} l={26} t={26} w={48} h={48} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,246,221,0.55), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.bn4_stone_cloak} d={delayMs} frame={<Wash tone="rgba(222,211,187,0.3)" d={70} />}>
      <L
        c="g28-sc-water"
        d={90}
        st={{ ...box(3.4, 1.4, 0, 0.3), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(255,246,221,0.75), transparent 72%)" }}
      />
      <L
        c="g28-lean"
        d={160}
        st={{ ...box(3.4, 1, 0, 1.5), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(44,42,34,0.7), transparent 72%)" }}
      />
      <V c="g28-sc-rub" d={230} st={box(2.4, 1.4, 0, -0.6)}>
        <rect x="2" y="7" width="20" height="10" fill="#ded3bb" stroke="#2c2a22" strokeWidth="1.3" />
        <path d="M2 12h20" stroke="#2c2a22" strokeWidth="0.9" />
      </V>
      <L c="g28-sc-sheen" d={440} st={{ ...box(4.4, 1.8, 0, 0.4), background: "linear-gradient(90deg, transparent, rgba(255,246,221,0.9), transparent)" }} />
      <L
        c="g28-drift"
        d={620}
        st={{ ...box(4.8, 2.2, 0, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(222,211,187,0.4), transparent 74%)" }}
      />
    </Lead>
  );
}

/* =============================================================================
   16. Gargoyle Perch (t5) — THE POINTING MACHINE. The frame is set over the
   block, the needle is dropped to depth, and three transferred points are
   punched into the roughed-out snout.
   Palette #b3bcc6 / #f2ead0 / #1e232a.
   ========================================================================== */
function PointingMachine({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={14} t={74} w={72} h={5} st={{ background: "#1e232a" }} />
        <V c="g28-ent" d={190} l={20} t={18} w={60} h={58}>
          <path d="M3 3h18v4H3z" fill="#b3bcc6" stroke="#1e232a" strokeWidth="1.1" />
          <path d="M12 7v9l-1.4 5h2.8L12 16" fill="#f2ead0" stroke="#1e232a" strokeWidth="1" />
        </V>
        <L c="g28-ent3" d={430} l={38} t={68} w={24} h={20} st={{ borderRadius: "50%", background: "radial-gradient(circle, #f2ead0, transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={10} t={72} w={80} h={6} st={{ background: "#b3bcc6" }} />
        <V c="g28-hit" d={200} ix={30} l={20} t={18} w={60} h={60}>
          <path d="M4 20V9l5-5h7l4 5v11z" fill="#1e232a" stroke="#b3bcc6" strokeWidth="1.3" />
          <circle cx="9" cy="11" r="1.3" fill="#f2ead0" />
          <path d="M13 13h6l-3 4z" fill="#f2ead0" />
        </V>
        <L c="g28-hit3" d={390} l={28} t={28} w={44} h={44} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(242,234,208,0.55), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_gargoyle_perch} d={delayMs} frame={<Wash tone="rgba(179,188,198,0.28)" d={70} />}>
      <L c="g28-gp-frame" d={90} st={{ ...box(4.4, 0.24, 0, -1.9), background: "#b3bcc6" }} />
      <L
        c="g28-lean"
        d={160}
        st={{ ...box(3.4, 1, 0, 1.5), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(30,35,42,0.72), transparent 72%)" }}
      />
      <L c="g28-gp-needle" d={240} st={{ ...box(0.16, 3.2, 0, -0.4), background: "linear-gradient(180deg, #b3bcc6, #f2ead0)" }} />
      {THREE.map((i) => (
        <L
          key={i}
          c="g28-gp-mark"
          d={400}
          o={i * 70}
          st={{ ...box(0.44, 0.44, i * 1.2 - 1.2, 0.9), borderRadius: "50%", background: "#f2ead0" }}
        />
      ))}
      <L
        c="g28-drift"
        d={600}
        st={{ ...box(4.6, 2.2, 0, 0.9), borderRadius: "50%", background: "radial-gradient(circle, rgba(179,188,198,0.4), transparent 74%)" }}
      />
    </Lead>
  );
}

/* =============================================================================
   17. Hollow Fanfare (t5) — SOUNDING THE STONE. The block is tapped with the
   hammer to hear whether it rings true; three waves spread and go flat, and
   the hidden flaw shows itself. Palette #c9c0ab / #fff2d4 / #2a2620.
   ========================================================================== */
function RingTest({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={12} t={74} w={76} h={5} st={{ background: "#2a2620" }} />
        <V c="g28-ent" d={190} l={22} t={20} w={56} h={54}>
          <rect x="3" y="6" width="18" height="13" fill="#2a2620" stroke="#c9c0ab" strokeWidth="1.2" />
          <path d="M7 12a5 5 0 0 1 10 0" fill="none" stroke="#fff2d4" strokeWidth="1.4" {...SJ} />
        </V>
        <V c="g28-ent3" d={430} l={50} t={4} w={34} h={40}>
          <path d="M4 6h9v4H4z" fill="#c9c0ab" stroke="#2a2620" strokeWidth="1" />
          <path d="M12 7h9v2h-9z" fill="#c9c0ab" />
        </V>
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={10} t={72} w={80} h={6} st={{ background: "#c9c0ab" }} />
        <V c="g28-hit" d={200} ix={30} l={20} t={20} w={60} h={60}>
          <rect x="3" y="4" width="18" height="16" fill="#2a2620" stroke="#c9c0ab" strokeWidth="1.3" />
          <path d="M8 5l3 7-2 7" fill="none" stroke="#fff2d4" strokeWidth="1.5" {...SJ} />
        </V>
        <L c="g28-hit3" d={390} l={26} t={26} w={48} h={48} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,212,0.55), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_hollow_fanfare} d={delayMs} frame={<Wash tone="rgba(201,192,171,0.3)" d={70} />}>
      <L c="g28-tell" d={90} st={{ ...box(3.4, 0.14, 0, 1.3), background: "#fff2d4" }} />
      <V c="g28-hf-tap" d={220} st={box(2.2, 1.6, 0.6, -1.5)}>
        <rect x="2" y="8" width="10" height="6" fill="#2a2620" stroke="#c9c0ab" strokeWidth="1.2" />
        <path d="M12 10h10v2H12z" fill="#c9c0ab" />
      </V>
      {THREE.map((i) => (
        <L
          key={i}
          c="g28-hf-ring"
          d={380}
          o={i * 80}
          st={{ ...box(2.4 + i * 1.2, 2.4 + i * 1.2), borderRadius: "50%", border: "2px solid rgba(255,242,212,0.7)" }}
        />
      ))}
      <L c="g28-hf-flaw" d={540} st={{ ...box(0.22, 2.6, -0.3, 0.2), background: "linear-gradient(180deg, transparent, #2a2620, transparent)" }} />
      <L
        c="g28-drift"
        d={700}
        st={{ ...box(4.8, 2.4, 0, 0.8), borderRadius: "50%", background: "radial-gradient(circle, rgba(201,192,171,0.4), transparent 74%)" }}
      />
    </Lead>
  );
}

/* =============================================================================
   18. Rolling Boulder (t5) — THE DRESSED DRUM ON ROLLERS. Log rollers are laid
   the length of the run, the drum is walked over them the real distance, and
   it beds itself into a crater at the far end.
   Palette #9d968a / #f4e9cc / #221f1a.
   ========================================================================== */
function DrumRoll({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={10} t={76} w={80} h={5} st={{ background: "#221f1a" }} />
        <V c="g28-ent" d={190} l={24} t={20} w={52} h={52}>
          <circle cx="12" cy="12" r="9" fill="#9d968a" stroke="#221f1a" strokeWidth="1.3" />
          <path d="M12 3v18M3 12h18" stroke="#f4e9cc" strokeWidth="1.1" />
        </V>
        <L c="g28-ent3" d={430} l={14} t={68} w={72} h={5} st={{ background: "#f4e9cc" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={8} t={72} w={84} h={6} st={{ background: "#9d968a" }} />
        <V c="g28-hit" d={200} ix={30} l={22} t={18} w={56} h={60}>
          <circle cx="12" cy="10" r="8" fill="#221f1a" stroke="#9d968a" strokeWidth="1.3" />
          <path d="M4 20h16" stroke="#f4e9cc" strokeWidth="2" {...SJ} />
        </V>
        <L c="g28-hit3" d={390} l={20} t={56} w={60} h={32} st={{ borderRadius: "50%", background: "radial-gradient(ellipse, rgba(244,233,204,0.55), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <AimLead imp={IMP.ov_rolling_boulder}
      d={delayMs}
      frame={
        <>
          <Wash tone="rgba(157,150,138,0.3)" d={60} />
          <Grit tone="rgba(34,31,26,0.3)" d={150} />
        </>
      }
    >
      <L c="g28-lane" d={90} st={{ ...lane(0.12), background: "#f4e9cc" }} />
      {FOUR.map((i) => (
        <L
          key={i}
          c="g28-rb-roller"
          d={200}
          o={i * 50}
          ix={16}
          st={{ ...at(0.34, 1.5, 0.16 + i * 0.24), borderRadius: "2px", background: "linear-gradient(90deg, #221f1a, #9d968a)" }}
        />
      ))}
      <V c="g28-run" d={330} st={box(1.8, 1.8, 0, -0.3)}>
        <circle cx="12" cy="12" r="10" fill="#9d968a" stroke="#221f1a" strokeWidth="1.5" />
        <path d="M12 2v20M2 12h20" stroke="#221f1a" strokeWidth="1.1" />
      </V>
      <L
        c="g28-rb-crush"
        d={560}
        st={{ ...far(2.2, 1.2, 0.5), borderRadius: "50%", background: "radial-gradient(ellipse, #221f1a 40%, rgba(34,31,26,0))" }}
      />
      <L c="g28-drift" d={700} st={{ ...lane(2.6, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(157,150,138,0.4), transparent 74%)" }} />
    </AimLead>
  );
}

/* =============================================================================
   19. Bell Jar (t4) — GROUTING UNDER THE BELL. The glass bell is lowered over
   the cluster, grout is poured down the joint, and the joints fill one after
   another until the cluster is one solid piece.
   Palette #e2dcc6 / #fff5da / #2f2c22.
   ========================================================================== */
function GroutPour({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={14} t={76} w={72} h={5} st={{ background: "#2f2c22" }} />
        <V c="g28-ent" d={190} l={22} t={16} w={56} h={60}>
          <path d="M6 21V12a6 6 0 0 1 12 0v9z" fill="none" stroke="#e2dcc6" strokeWidth="1.6" {...SJ} />
          <path d="M11 6h2v2h-2z" fill="#fff5da" />
        </V>
        <L c="g28-ent3" d={430} l={38} t={44} w={24} h={30} st={{ background: "linear-gradient(180deg, #fff5da, transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={12} t={74} w={76} h={6} st={{ background: "#e2dcc6" }} />
        <V c="g28-hit" d={200} ix={30} l={20} t={16} w={60} h={62}>
          <path d="M5 21V12a7 7 0 0 1 14 0v9z" fill="#2f2c22" stroke="#e2dcc6" strokeWidth="1.3" />
          <path d="M9 21v-6h6v6" fill="#fff5da" />
        </V>
        <L c="g28-hit3" d={390} l={28} t={28} w={44} h={44} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,245,218,0.55), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_bell_jar} d={delayMs} frame={<Wash tone="rgba(226,220,198,0.3)" d={70} />}>
      <V c="g28-bj-bell" d={110} st={box(3.6, 3.4, 0, -0.4)}>
        <path d="M4 22V13a8 8 0 0 1 16 0v9z" fill="none" stroke="#e2dcc6" strokeWidth="2" {...SJ} />
        <path d="M11 3h2v3h-2z" fill="#e2dcc6" />
      </V>
      <L
        c="g28-lean"
        d={170}
        st={{ ...box(3.6, 1, 0, 1.6), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(47,44,34,0.7), transparent 72%)" }}
      />
      <L c="g28-bj-pour" d={280} st={{ ...box(0.3, 2.4, 0, -0.6), background: "linear-gradient(180deg, #fff5da, rgba(226,220,198,0))" }} />
      {FOUR.map((i) => (
        <L
          key={i}
          c="g28-bj-fill"
          d={420}
          o={i * 60}
          st={{ ...box(0.9, 0.9, (i % 2) * 1.1 - 0.55, Math.floor(i / 2) * 1 + 0.2), background: "#fff5da" }}
        />
      ))}
      <L
        c="g28-drift"
        d={620}
        st={{ ...box(4.6, 2.2, 0, 0.9), borderRadius: "50%", background: "radial-gradient(circle, rgba(226,220,198,0.4), transparent 74%)" }}
      />
    </Lead>
  );
}

/* =============================================================================
   20. Toad Pond (t4) — SLAKING THE LIME. The pit is boarded out, quicklime and
   water go in, the mix boils, and the steam sheets off it.
   Palette #efe6cf / #fff7e0 / #35301f.
   ========================================================================== */
function LimeSlake({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={12} t={76} w={76} h={5} st={{ background: "#35301f" }} />
        <V c="g28-ent" d={190} l={18} t={30} w={64} h={44}>
          <path d="M2 6h20l-2 13H4z" fill="#35301f" stroke="#efe6cf" strokeWidth="1.2" />
          <path d="M5 10h14" stroke="#fff7e0" strokeWidth="1.6" />
        </V>
        <L c="g28-ent3" d={430} l={32} t={12} w={36} h={34} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff7e0, transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={10} t={76} w={80} h={6} st={{ background: "#efe6cf" }} />
        <V c="g28-hit" d={200} ix={30} l={18} t={22} w={64} h={56}>
          <path d="M2 5h20l-2.4 15H4.4z" fill="#35301f" stroke="#efe6cf" strokeWidth="1.3" />
          <path d="M6 10c2 2 4-2 6 0s4 2 6 0" fill="none" stroke="#fff7e0" strokeWidth="1.5" {...SJ} />
        </V>
        <L c="g28-hit3" d={390} l={26} t={20} w={48} h={48} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,247,224,0.55), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_toad_pond} d={delayMs} frame={<Wash tone="rgba(239,230,207,0.3)" d={70} />}>
      <L c="g28-tp-pit" d={90} st={{ ...box(4, 2, 0, 0.6), border: "2px solid #35301f", background: "rgba(53,48,31,0.55)" }} />
      <L
        c="g28-lean"
        d={160}
        st={{ ...box(3.6, 1, 0, 1.7), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(53,48,31,0.7), transparent 72%)" }}
      />
      {THREE.map((i) => (
        <L
          key={i}
          c="g28-tp-boil"
          d={260}
          o={i * 70}
          st={{ ...box(1.2, 1.2, i * 1.2 - 1.2, 0.5), borderRadius: "50%", background: "radial-gradient(circle, #fff7e0, rgba(239,230,207,0))" }}
        />
      ))}
      <L
        c="g28-tp-steam"
        d={440}
        st={{ ...box(3.4, 3, 0, -1.2), borderRadius: "50%", background: "radial-gradient(ellipse at 50% 100%, rgba(255,247,224,0.75), transparent 70%)" }}
      />
      <L
        c="g28-drift"
        d={620}
        st={{ ...box(5, 2.4, 0, -0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(239,230,207,0.4), transparent 74%)" }}
      />
    </Lead>
  );
}

/* =============================================================================
   21. Borrowed Crown (t3) — GILDING THE CUT. Size is brushed into the incised
   letters, a leaf of gold is laid on with the tip, and the agate burnisher
   brings it up bright. Palette #e0b455 / #fff2cd / #2f2410.
   ========================================================================== */
function LeafGild({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={12} t={74} w={76} h={5} st={{ background: "#2f2410" }} />
        <V c="g28-ent" d={190} l={22} t={22} w={56} h={52}>
          <path d="M3 19l2-11 7 5 7-5 2 11z" fill="#e0b455" stroke="#2f2410" strokeWidth="1.2" />
        </V>
        <L c="g28-ent3" d={430} l={20} t={26} w={60} h={14} st={{ background: "linear-gradient(90deg, transparent, #fff2cd, transparent)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={10} t={74} w={80} h={6} st={{ background: "#e0b455" }} />
        <V c="g28-hit" d={200} ix={30} l={22} t={20} w={56} h={56}>
          <path d="M3 20l2.4-12L12 13l6.6-5L21 20z" fill="#2f2410" stroke="#e0b455" strokeWidth="1.3" />
          <circle cx="12" cy="5.6" r="1.8" fill="#fff2cd" />
        </V>
        <L c="g28-hit3" d={390} l={26} t={26} w={48} h={48} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,205,0.55), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_borrowed_crown} d={delayMs} frame={<Wash tone="rgba(224,180,85,0.28)" d={70} />}>
      <V c="g28-bc-size" d={90} st={box(2.6, 1.6, -0.8, 0.6)}>
        <path d="M2 12h14l6-3v6l-6-3" fill="#2f2410" stroke="#e0b455" strokeWidth="1.2" {...SJ} />
      </V>
      <L
        c="g28-lean"
        d={150}
        st={{ ...box(3.2, 0.9, 0, 1.5), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(47,36,16,0.72), transparent 72%)" }}
      />
      <L c="g28-bc-leaf" d={250} st={{ ...box(2.6, 2.2, 0, -0.2), background: "linear-gradient(135deg, #e0b455, #fff2cd 50%, #e0b455)" }} />
      <L c="g28-bc-burnish" d={430} st={{ ...box(4, 1.5, 0, -0.2), background: "linear-gradient(90deg, transparent, rgba(255,242,205,0.92), transparent)" }} />
      <L
        c="g28-drift"
        d={600}
        st={{ ...box(4.6, 2.2, 0, 0.7), borderRadius: "50%", background: "radial-gradient(circle, rgba(224,180,85,0.38), transparent 74%)" }}
      />
    </Lead>
  );
}

/* =============================================================================
   22. Soft Shells (t3) — THE SCUTCH COMB. The comb is dropped into the scutch
   and dragged across the green face; the soft quarry skin lifts and peels back
   in two sheets. Palette #c7b8a0 / #f9efd2 / #2b2519.
   ========================================================================== */
function ScutchComb({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={12} t={74} w={76} h={5} st={{ background: "#2b2519" }} />
        <V c="g28-ent" d={190} l={22} t={18} w={56} h={58}>
          <rect x="8" y="2" width="8" height="12" fill="#c7b8a0" stroke="#2b2519" strokeWidth="1.1" />
          <path d="M7 14h10v3H7z" fill="#f9efd2" />
          <path d="M8 17v4M11 17v4M14 17v4M16.6 17v4" stroke="#2b2519" strokeWidth="1.1" />
        </V>
        <L c="g28-ent3" d={430} l={18} t={78} w={64} h={4} st={{ background: "#f9efd2" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={10} t={72} w={80} h={6} st={{ background: "#c7b8a0" }} />
        <V c="g28-hit" d={200} ix={30} l={20} t={20} w={60} h={60}>
          <path d="M4 20V8a8 8 0 0 1 16 0v12z" fill="#2b2519" stroke="#c7b8a0" strokeWidth="1.3" />
          <path d="M7 9c3 3 7 3 10 0" fill="none" stroke="#f9efd2" strokeWidth="1.5" {...SJ} />
        </V>
        <L c="g28-hit3" d={390} l={28} t={28} w={44} h={44} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(249,239,210,0.55), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_soft_shells} d={delayMs} frame={<Wash tone="rgba(199,184,160,0.3)" d={70} />}>
      <L c="g28-tell" d={90} st={{ ...box(4.2, 0.14, 0, 1.1), background: "#f9efd2" }} />
      <L
        c="g28-lean"
        d={150}
        st={{ ...box(3.4, 1, 0, 1.5), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(43,37,25,0.7), transparent 72%)" }}
      />
      <V c="g28-ss-comb" d={240} st={box(2, 3, 0, -1.2)}>
        <rect x="8" y="1" width="8" height="12" fill="#c7b8a0" stroke="#2b2519" strokeWidth="1.2" />
        <rect x="6.4" y="13" width="11.2" height="3" fill="#f9efd2" stroke="#2b2519" strokeWidth="1" />
        <path d="M7.6 16v6M10.4 16v6M13.2 16v6M16 16v6" stroke="#2b2519" strokeWidth="1.2" />
      </V>
      {TWO.map((i) => (
        <V key={i} c="g28-ss-peel" d={400} o={i * 90} st={box(2, 1.6, i * 2.2 - 1.1, 0.6)}>
          <path d="M2 18c5-3 10-3 20-10l-2 12H2z" fill="#c7b8a0" stroke="#2b2519" strokeWidth="1.2" />
        </V>
      ))}
      <L
        c="g28-drift"
        d={580}
        st={{ ...box(4.8, 2.2, 0, 0.7), borderRadius: "50%", background: "radial-gradient(circle, rgba(199,184,160,0.4), transparent 74%)" }}
      />
    </Lead>
  );
}

/* =============================================================================
   23. Gum Wrapper (t2) — PARCELLING THE DRESSED STONE. Straw is laid over the
   finished face, hessian is drawn round it, and the ends are twisted off.
   Palette #d6b877 / #fff0c9 / #34291a.
   ========================================================================== */
function StrawParcel({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={12} t={74} w={76} h={5} st={{ background: "#34291a" }} />
        <V c="g28-ent" d={190} l={20} t={24} w={60} h={48}>
          <rect x="5" y="6" width="14" height="12" fill="#d6b877" stroke="#34291a" strokeWidth="1.2" />
          <path d="M2 12l3-3v6zM22 12l-3-3v6z" fill="#fff0c9" />
        </V>
        <L c="g28-ent3" d={430} l={30} t={30} w={40} h={40} st={{ borderRadius: "50%", background: "radial-gradient(circle, #fff0c9, transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={10} t={74} w={80} h={6} st={{ background: "#d6b877" }} />
        <V c="g28-hit" d={200} ix={30} l={18} t={22} w={64} h={56}>
          <rect x="6" y="5" width="12" height="14" fill="#34291a" stroke="#d6b877" strokeWidth="1.3" />
          <path d="M2 12l4-4v8zM22 12l-4-4v8z" fill="#fff0c9" />
        </V>
        <L c="g28-hit3" d={390} l={28} t={28} w={44} h={44} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(255,240,201,0.55), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_gum_wrapper} d={delayMs} frame={<Wash tone="rgba(214,184,119,0.28)" d={70} />}>
      {THREE.map((i) => (
        <L
          key={i}
          c="g28-gw-straw"
          d={90}
          o={i * 40}
          st={{ ...box(3.4, 0.18, 0, i * 0.5 - 0.5), background: "#fff0c9" }}
        />
      ))}
      <L
        c="g28-lean"
        d={160}
        st={{ ...box(3.2, 0.9, 0, 1.4), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(52,41,26,0.7), transparent 72%)" }}
      />
      <L c="g28-gw-wrap" d={260} st={{ ...box(2.6, 2.4, 0, 0), background: "linear-gradient(135deg, #d6b877, #34291a 60%, #d6b877)", border: "1px solid #fff0c9" }} />
      {TWO.map((i) => (
        <V key={i} c="g28-gw-twist" d={430} o={i * 70} st={box(1.4, 1.4, i * 3 - 1.5, 0)}>
          <path d="M2 12l8-6v12zM22 12l-8-6v12z" fill="#d6b877" stroke="#34291a" strokeWidth="1.2" />
        </V>
      ))}
      <L
        c="g28-drift"
        d={600}
        st={{ ...box(4.4, 2.2, 0, 0.7), borderRadius: "50%", background: "radial-gradient(circle, rgba(214,184,119,0.38), transparent 74%)" }}
      />
    </Lead>
  );
}

/* =============================================================================
   24. Pet Rock (t2) — GALLETING. The joint is buttered with mortar, a gallet is
   picked off the spoil heap and pressed into the wet bed, and the squeeze is
   trimmed off. Palette #8f9aa4 / #f0e8ce / #1f242a.
   ========================================================================== */
function Galleting({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={12} t={74} w={76} h={6} st={{ background: "#1f242a" }} />
        <V c="g28-ent" d={190} l={26} t={24} w={48} h={48}>
          <path d="M5 15l3-9 9 2 2 9-7 4z" fill="#8f9aa4" stroke="#1f242a" strokeWidth="1.3" />
          <circle cx="10" cy="11" r="1.2" fill="#f0e8ce" />
        </V>
        <L c="g28-ent3" d={430} l={14} t={62} w={72} h={6} st={{ background: "#f0e8ce" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={8} t={58} w={84} h={7} st={{ background: "#f0e8ce" }} />
        <V c="g28-hit" d={200} ix={30} l={24} t={18} w={52} h={56}>
          <path d="M4 14l4-10 10 2 2 10-8 5z" fill="#1f242a" stroke="#8f9aa4" strokeWidth="1.3" />
          <circle cx="10" cy="10" r="1.4" fill="#f0e8ce" />
        </V>
        <L c="g28-hit3" d={390} l={28} t={28} w={44} h={44} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(240,232,206,0.55), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.ov_pet_rock} d={delayMs} frame={<Wash tone="rgba(143,154,164,0.28)" d={70} />}>
      <L c="g28-pr-mortar" d={90} st={{ ...box(4.4, 0.5, 0, 0.5), background: "linear-gradient(90deg, transparent, #f0e8ce, transparent)" }} />
      <L
        c="g28-lean"
        d={150}
        st={{ ...box(3.2, 0.9, 0, 1.5), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(31,36,42,0.7), transparent 72%)" }}
      />
      <V c="g28-pr-gallet" d={250} st={box(1.4, 1.4, 0, -0.6)}>
        <path d="M4 14l4-10 10 2 2 10-8 5z" fill="#8f9aa4" stroke="#1f242a" strokeWidth="1.4" />
        <circle cx="10" cy="10" r="1.3" fill="#f0e8ce" />
      </V>
      <L c="g28-pr-press" d={420} st={{ ...box(2.4, 0.34, 0, 0.5), background: "#1f242a" }} />
      <L
        c="g28-drift"
        d={580}
        st={{ ...box(4.4, 2.2, 0, 0.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(143,154,164,0.38), transparent 74%)" }}
      />
    </Lead>
  );
}

/* =============================================================================
   25. Dusty Boots (t1) — BRUSHING DOWN THE BANKER. The bench is swept clear of
   the day's stone dust with the dusting brush, working from the caster's own
   side. Palette #cbbfa5 / #fdf1d4 / #2d281c.
   ========================================================================== */
function BankerSweep({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={12} t={76} w={76} h={5} st={{ background: "#2d281c" }} />
        <V c="g28-ent" d={190} l={22} t={20} w={56} h={54}>
          <rect x="6" y="3" width="12" height="6" fill="#cbbfa5" stroke="#2d281c" strokeWidth="1.2" />
          <path d="M7 9v9M10 9v9M13 9v9M16.4 9v9" stroke="#fdf1d4" strokeWidth="1.3" />
        </V>
        <L c="g28-ent3" d={430} l={16} t={64} w={68} h={20} st={{ borderRadius: "50%", background: "radial-gradient(ellipse, #fdf1d4, transparent 72%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={8} t={74} w={84} h={6} st={{ background: "#cbbfa5" }} />
        <V c="g28-hit" d={200} ix={30} l={22} t={18} w={56} h={60}>
          <path d="M8 20V8a4 4 0 0 1 8 0v12z" fill="#2d281c" stroke="#cbbfa5" strokeWidth="1.3" />
          <path d="M6 21h12" stroke="#fdf1d4" strokeWidth="2" {...SJ} />
        </V>
        <L c="g28-hit3" d={390} l={20} t={56} w={60} h={32} st={{ borderRadius: "50%", background: "radial-gradient(ellipse, rgba(253,241,212,0.55), transparent 72%)" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_dusty_boots} d={delayMs} frame={<Wash tone="rgba(203,191,165,0.3)" d={70} />}>
      <L c="g28-tell" d={80} st={{ ...box(4.4, 0.14, 0, 0.9), background: "#fdf1d4" }} />
      <L
        c="g28-lean"
        d={140}
        st={{ ...box(3.4, 1, 0, 1.4), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(45,40,28,0.7), transparent 72%)" }}
      />
      <V c="g28-db-brush" d={220} st={box(2.6, 2, 0, -0.8)}>
        <rect x="4" y="3" width="16" height="7" fill="#cbbfa5" stroke="#2d281c" strokeWidth="1.3" />
        <path d="M5.4 10v10M8.6 10v10M11.8 10v10M15 10v10M18.2 10v10" stroke="#2d281c" strokeWidth="1.3" />
      </V>
      <L
        c="g28-db-cloud"
        d={390}
        st={{ ...box(4.6, 1.8, 0, 0.7), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(253,241,212,0.7), transparent 72%)" }}
      />
      <L
        c="g28-drift"
        d={560}
        st={{ ...box(5.2, 2.4, 0, 0.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(203,191,165,0.4), transparent 74%)" }}
      />
    </Lead>
  );
}

/* =============================================================================
   26. Loose Horseshoe (t1) — RUNNING A CRAMP IN LEAD. The chase is cut across
   the joint, the ladle tips and molten lead runs in, the iron cramp seats, and
   then it works loose. Palette #9aa1a8 / #f5ecd0 / #23262b.
   ========================================================================== */
function LeadCramp({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <Cut d={delayMs}>
        <L c="g28-ent2" d={60} l={12} t={74} w={76} h={5} st={{ background: "#23262b" }} />
        <V c="g28-ent" d={190} l={20} t={26} w={60} h={46}>
          <path d="M4 6v5h16V6M4 11v5h16v-5" fill="none" stroke="#9aa1a8" strokeWidth="2.4" {...SJ} />
        </V>
        <L c="g28-ent3" d={430} l={34} t={16} w={32} h={30} st={{ borderRadius: "50%", background: "radial-gradient(circle, #f5ecd0, transparent 70%)" }} />
      </Cut>
    );
  }
  if (role === "target") {
    return (
      <Cut d={delayMs}>
        <L c="g28-hit2" d={40} l={10} t={72} w={80} h={6} st={{ background: "#9aa1a8" }} />
        <V c="g28-hit" d={200} ix={30} l={20} t={20} w={60} h={60}>
          <path d="M6 20a6 6 0 1 1 12 0h-3.4a2.6 2.6 0 1 0-5.2 0z" fill="#23262b" stroke="#9aa1a8" strokeWidth="1.3" />
          <circle cx="8.4" cy="12" r="1.1" fill="#f5ecd0" />
          <circle cx="15.6" cy="12" r="1.1" fill="#f5ecd0" />
        </V>
        <L c="g28-hit3" d={390} l={28} t={28} w={44} h={44} st={{ borderRadius: "50%", background: "radial-gradient(circle, rgba(245,236,208,0.55), transparent 70%)" }} />
      </Cut>
    );
  }
  return (
    <Lead imp={IMP.hx4_loose_horseshoe} d={delayMs} frame={<Wash tone="rgba(154,161,168,0.28)" d={70} />}>
      <L c="g28-lh-chase" d={90} st={{ ...box(2.6, 0.4, 0, 0.2), background: "#23262b" }} />
      <L
        c="g28-lean"
        d={150}
        st={{ ...box(3.2, 0.9, 0, 1.5), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(35,38,43,0.7), transparent 72%)" }}
      />
      <V c="g28-lh-ladle" d={250} st={box(2.4, 2, -1.2, -1.4)}>
        <path d="M4 6a5 5 0 0 0 10 0z" fill="#9aa1a8" stroke="#23262b" strokeWidth="1.2" />
        <path d="M14 6h8" stroke="#23262b" strokeWidth="1.6" {...SJ} />
        <path d="M9 11l1.4 5H7.6z" fill="#f5ecd0" />
      </V>
      <V c="g28-lh-cramp" d={430} st={box(2.6, 1.2, 0, 0.2)}>
        <path d="M2 4v6h20V4" fill="none" stroke="#9aa1a8" strokeWidth="3" {...SJ} />
      </V>
      <L
        c="g28-drift"
        d={600}
        st={{ ...box(4.4, 2.2, 0, 0.8), borderRadius: "50%", background: "radial-gradient(circle, rgba(154,161,168,0.38), transparent 74%)" }}
      />
    </Lead>
  );
}

/* =============================================================================
   Registry — scene + config per card id.

   `sound` is always an existing SigSoundKey. `source` is named ONLY where the
   card's engine definition really raises that zone AT CAST TIME (checked
   against src/engine/buffs/): the instant and init-time walnut cards, plus the
   two shield-granting protection cards. The delayed / trigger-on-their-move
   curses (Hunter's Moon, Gorgon Field, Debt Collector, Hollow Fanfare, Toad
   Pond, Gum Wrapper, Loose Horseshoe) petrify nothing at cast, so they name no
   zone. Every card declares its anchor.
   ========================================================================== */

function S(Render: SigPlugin["Render"], config: SigPlugin["config"]): SigPlugin {
  return { config, Render };
}

export const PLAYS: Record<string, SigPlugin> = {
  // --- Tier 8 ---
  bn4_written_in_stone: S(LetterCut, {
    ordering: "line", staggerMs: 60, victims: "all", hasLead: true, sound: "petrify", anchor: "board",
  }),
  hx4_gorgons_court: S(PlugFeather, {
    ordering: "line", staggerMs: 70, victims: "all", hasLead: true, sound: "petrifiedforest", source: "walnut", anchor: "aim",
  }),
  hx4_hunters_moon: S(TrammelArc, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockcage", anchor: "cast",
  }),
  hx4_no_quarter: S(WedgeLine, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "siege", source: "walnut", anchor: "aim",
  }),
  hx4_stone_rain: S(BushHammer, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "petrifiedforest", source: "walnut", anchor: "cast",
  }),

  // --- Tier 7 ---
  hx4_castle_of_sand: S(SandSaw, {
    ordering: "line", staggerMs: 65, victims: ["r"], hasLead: true, sound: "siege", source: "walnut", anchor: "board",
  }),
  hx4_gorgon_field: S(BankerTurn, {
    ordering: "octagon", staggerMs: 55, victims: "all", hasLead: true, sound: "petrify", anchor: "cast",
  }),
  hx4_stone_garden: S(ClawRake, {
    ordering: "line", staggerMs: 55, victims: ["n", "b", "r"], hasLead: true, sound: "petrifiedforest", source: "walnut", anchor: "aim",
  }),
  hx4_stone_orchard: S(PointRough, {
    ordering: "file", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "petrifiedforest", source: "walnut", anchor: "cast",
  }),
  hx4_traitors_gala: S(LewisLift, {
    ordering: "radial", staggerMs: 70, victims: ["n", "b"], hasLead: true, sound: "colossus", source: "walnut", anchor: "cast",
  }),

  // --- Tier 6 ---
  hx4_brittle_arsenal: S(BolsterSplit, {
    ordering: "line", staggerMs: 50, victims: ["b", "r", "q"], hasLead: true, sound: "wall", source: "walnut", anchor: "aim",
  }),
  hx4_debt_collector: S(JointPoint, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", anchor: "cast",
  }),
  hx4_walnut_crown: S(CrownMould, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "colossus", source: "walnut", anchor: "cast",
  }),
  hx4_walnut_pinch: S(NipperPinch, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "petrify", source: "walnut", anchor: "cast",
  }),

  // --- Tier 5 ---
  bn4_stone_cloak: S(RubbingStone, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", source: "shield", anchor: "board",
  }),
  hx4_gargoyle_perch: S(PointingMachine, {
    ordering: "radial", staggerMs: 60, victims: ["r"], hasLead: true, sound: "petrify", source: "walnut", anchor: "cast",
  }),
  hx4_hollow_fanfare: S(RingTest, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "clockcage", anchor: "cast",
  }),
  ov_rolling_boulder: S(DrumRoll, {
    ordering: "line", staggerMs: 50, victims: ["p"], hasLead: true, sound: "colossus", anchor: "aim",
  }),

  // --- Tier 4 ---
  hx4_bell_jar: S(GroutPour, {
    ordering: "octagon", staggerMs: 55, victims: "all", hasLead: true, sound: "clockcage", source: "walnut", anchor: "cast",
  }),
  hx4_toad_pond: S(LimeSlake, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", anchor: "cast",
  }),

  // --- Tier 3 ---
  hx4_borrowed_crown: S(LeafGild, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "colossus", source: "walnut", anchor: "cast",
  }),
  hx4_soft_shells: S(ScutchComb, {
    ordering: "file", staggerMs: 65, victims: ["p"], hasLead: true, sound: "petrify", source: "walnut", anchor: "board",
  }),

  // --- Tier 2 ---
  hx4_gum_wrapper: S(StrawParcel, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall", anchor: "cast",
  }),
  ov_pet_rock: S(Galleting, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall", source: "shield", anchor: "cast",
  }),

  // --- Tier 1 ---
  hx4_dusty_boots: S(BankerSweep, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "petrify", source: "walnut", anchor: "cast",
  }),
  hx4_loose_horseshoe: S(LeadCramp, {
    ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "petrify", anchor: "cast",
  }),
};
