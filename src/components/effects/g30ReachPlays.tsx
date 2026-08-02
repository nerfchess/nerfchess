// g30ReachPlays — bespoke plays for the 21 queen / high-power cards that used
// to share the generated `queenRadiance` family (one radiant queen, 21 hue
// shifts). See sigPlugins.tsx for the contract. Self-contained: own inline SVG
// + own g30ReachPlays.css, transform/opacity only, no import from
// BoardEffects.tsx (cycle hazard), only the SigPlugin/SigRole TYPES imported.
//
// MODULE FICTION: REACH IN EVERY DIRECTION AT ONCE. The queen's defining
// property is that she threatens along eight lines at the same moment, so every
// card here is a different THING that radiates, sweeps or commands a whole
// field: a lighthouse's eight-sided lens throwing separate beams, an eight-oared
// galley whose blades catch together, a gilded cage whose bars swing down on
// every bearing, a spider at the hub feeling eight threads, a dandelion clock
// letting go all at once, a compass rose whose points strike in turn, a
// processional wheel lighting spoke by spoke from the nave outward, a parasol
// opening on eight ribs, a belfry throwing its eight louvres. Never twenty-one
// recoloured radiant queens: the OBJECT changes, not the hue.
//
// DIRECTIONAL BY CONSTRUCTION. The reach has to land on the real squares in the
// real order, so the art reads the geometry contract rather than screen
// directions:
//
//   --fx-index  every fan (bars, ribs, spokes, threads, seeds, louvres) leaves
//   --fx-n      in the REAL victim order and scales with how many squares the
//               play actually touched, via rayD().
//   --fx-len    beams, wakes, hooks, arrows and quicksilver runs cover the true
//               source -> target distance: a one-cell body travels
//               translateX(calc(var(--fx-len) * 100%)), a lane is sized
//               calc(var(--fx-len) * 7.142857%) wide, and farEnd() puts art
//               exactly where the line stops.
//   --fx-side   drips, motes, sand and smoke drift away from the CASTER,
//               whichever end of the screen that is. Nothing here says "the
//               bottom of the board".
//   <AimStage>  six cards stage inside it (harbor galley, compass needle,
//               quicksilver, leaky quiver, crane jib, painter's cradle): the art
//               is authored pointing RIGHT and aims itself down the real vector.
//   <BoardFrame> everything that means THE BOARD — washes, edge gilt, the
//               quicksand quarter, the queenside file band. Never a fixed
//               percentage of the stage.
//
// Every scene handles all three roles ("lead", "target", "entrance") and runs
// three beats: tell, strike, settle. Class + keyframe prefix `g30-`.

import "./g30ReachPlays.css";

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

/** Scene root for the square-local cuts (target + entrance). */
const ROOT = "pointer-events-none absolute inset-0 z-30 block";

/** Style escape hatch: scene styles carry CSS custom properties too. */
type Style = CSSProperties & Record<string, unknown>;
const st = (o: Style): CSSProperties => o as CSSProperties;

/** The caller's stagger plus this layer's own beat, in ms. */
const d = (base: number, off: number): CSSProperties => ({ animationDelay: `${base + off}ms` });

/**
 * One arm of a fan. The arm's own place in the ring (`i`) sets its beat, and
 * `--fx-index` rolls the whole fan onto this square's place in the REAL victim
 * order, so a reach that lands on six squares fires in the order the squares
 * were resolved rather than in a decorative loop.
 */
const rayD = (base: number, off: number, i: number, step = 52): CSSProperties => ({
  animationDelay: `calc(${base + off}ms + var(--fx-index, 0) * 16ms + ${i * step}ms)`,
});

/** One board cell as a percentage of the 14-cell stage (see stage.css). */
const CELL = 7.142857;
const cells = (n: number): string => `${(n * CELL).toFixed(3)}%`;

/**
 * A box `w` x `h` CELLS centred on the cast square (the stage's 50%/50%),
 * optionally offset `dx`/`dy` cells. Layers sized in cells read at the same real
 * size on every board, and a one-cell box can travel in --fx-len units.
 */
const box = (w: number, h: number, dx = 0, dy = 0): CSSProperties => ({
  left: `${(50 + (dx - w / 2) * CELL).toFixed(3)}%`,
  top: `${(50 + (dy - h / 2) * CELL).toFixed(3)}%`,
  width: cells(w),
  height: cells(h),
});

/**
 * A lane starting AT the cast square and running the real distance to the
 * victim, `thick` cells thick. Authored pointing right; <AimStage> aims it.
 */
const lane = (thick: number, dy = 0): CSSProperties => ({
  left: "50%",
  top: `${(50 + (dy - thick / 2) * CELL).toFixed(3)}%`,
  width: "calc(var(--fx-len, 3) * 7.142857%)",
  height: cells(thick),
});

/** A box sitting exactly where the source -> target line ENDS. */
const farEnd = (w: number, h: number, dy = 0): CSSProperties => ({
  left: `calc(50% + var(--fx-len, 3) * 7.142857% - ${((w / 2) * CELL).toFixed(3)}%)`,
  top: `${(50 + (dy - h / 2) * CELL).toFixed(3)}%`,
  width: cells(w),
  height: cells(h),
});

/** The eight bearings, and a short fan for the sparser scenes. */
const EIGHT = [0, 1, 2, 3, 4, 5, 6, 7];
const FOUR = [0, 1, 2, 3];

/**
 * A static hub-centred box turned onto one of the eight bearings. It carries no
 * animation of its own, so the arm inside it owns its whole transform.
 */
function Ray({ i, size, children }: { i: number; size: number; children: ReactNode }) {
  return (
    <span className="absolute block" style={st({ ...box(size, size), rotate: `${i * 45}deg` })}>
      {children}
    </span>
  );
}

/** Board-scale atmosphere. Always inside <BoardFrame>, never a stage %. */
function Frame({ base, tone, rim }: { base: number; tone: string; rim?: string }) {
  return (
    <BoardFrame>
      <span
        className="g30-wash absolute inset-0 block"
        style={st({ ...d(base, 60), background: `radial-gradient(circle at 50% 50%, ${tone}, transparent 70%)` })}
      />
      {rim ? (
        <span className="g30-rim absolute inset-0 block" style={st({ ...d(base, 150), boxShadow: `inset 0 0 28px 8px ${rim}` })} />
      ) : null}
    </BoardFrame>
  );
}

/** Cast-anchored lead: the action sits on the cast square. */
function Lead({ frame, d, imp, children }: { frame?: ReactNode; d?: number; imp?: ImpCue; children: ReactNode }) {
  const inner = (
    <>
      {frame}
      {children}
      {imp ? <ImpactHit d={d ?? 0} imp={imp} /> : null}
    </>
  );
  return (
    <BoardWideStage>
      {imp ? (
        <QuakeBox d={d ?? 0} imp={imp}>
          {inner}
        </QuakeBox>
      ) : (
        inner
      )}
    </BoardWideStage>
  );
}

/** Aim-anchored lead: board atmosphere stays square, the art turns. */
function AimLead({ frame, d, imp, children }: { frame?: ReactNode; d?: number; imp?: ImpCue; children: ReactNode }) {
  const inner = (
    <>
      {children}
      {imp ? <ImpactHit d={d ?? 0} imp={imp} /> : null}
    </>
  );
  return (
    <>
      {frame ? <BoardWideStage>{frame}</BoardWideStage> : null}
      <AimStage>
        {imp ? (
          <QuakeBox d={d ?? 0} imp={imp}>
            {inner}
          </QuakeBox>
        ) : (
          inner
        )}
      </AimStage>
    </>
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
   every node rides a `g30-impx` wrapper, covered by this module's prefix
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
    <g style={{ fill: "rgb(var(--imp-rgb, 216 181 110))" }}><path d="M2.6 4.2 3.3 1.8 4.4 3.4 5 1.3l.6 2.1 1.1-1.6.7 2.4zM3.2 10.8 4 4.8h2l.8 6z" /></g>
  </svg>,
  <svg key="b" viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
    <g style={{ fill: "rgb(var(--imp-rgb, 216 181 110))" }}><path d="M5 .8 6 3.6 8.8 2.4 7.4 5 10 6 7.4 7l1.4 2.6L6 8.4 5 11.2 4 8.4 1.2 9.6 2.6 7 0 6l2.6-1L1.2 2.4 4 3.6z" /></g>
  </svg>,
];

/** The whole stage jolts on the cue's beat. Rides an INNER wrapper because the
 * stage canvas carries the anchor-clamp transform, which must never be
 * animated over. In-scene only: the real board crop never shakes. */
function QuakeBox({ d, imp, children }: { d: number; imp: ImpCue; children: ReactNode }) {
  return (
    <span className={`g30-impx ${QUAKE_CLASS} absolute inset-0 block`} style={impactVars(undefined, (d + imp.at) / 1000)}>
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
      className="g30-impx absolute block"
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
        <span className="g30-impx absolute inset-0 block" style={impactVars(imp.rgb, (d + imp.at + 200) / 1000)}>
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
  // Return of the Queen: THE LAMP TAKES - the lens seats with a hammerfall and the dark shatters
  bn4_return_of_the_queen: { at: 1040, x: 50, y: 47, rgb: "242 200 92", laser: true, glyph: 1, boom: true },
  // Harbor Queen: THE PROW STRIKES THE QUAY - the galley runs the water and hits the stones
  bn4_harbor_queen: { at: 1000, rgb: "111 183 200", laser: true, boom: true, rot: -90, far: true },
  // Gilded Cage: THE CAGE DROPS ON HER - the bars slam and the queen's shadow splits
  hx4_gilded_cage: { at: 960, x: 50, y: 49, rgb: "217 174 78", laser: true, glyph: 0 },
  // Glass Case: THE VITRINE SEATS - the panes land together with a double ring
  bn4_glass_case: { at: 900, x: 50, y: 48, rgb: "169 216 230", laser: true, boom: true },
  // Quicksand Quarter: THE CRUST GIVES - the quarter drops an inch, twice
  hx4_quicksand_quarter: { at: 880, x: 51, y: 52, rgb: "217 176 113", boom: true, size: 8.6 },
  // Widow's Veil: THE LACE PINNED - one pale column pins the veil to the crown
  hx4_widows_veil: { at: 860, x: 50, y: 46, rgb: "239 227 208", laser: true },
  // Doting Retinue: THE THREADS SNAP TAUT - the web sets with a double pluck
  hx4_doting_retinue: { at: 840, x: 50, y: 50, rgb: "185 198 216", boom: true },
  // Danger Sense: THE NEEDLE SLAMS THE BEARING - the compass lance strikes the true square
  bn4_danger_sense: { at: 840, rgb: "232 115 74", laser: true, rot: -90, far: true },
  // Slow Procession: THE NOTCH TURN - the wheel advances one tooth with two knocks
  bn4_slow_procession: { at: 820, x: 49, y: 51, rgb: "203 178 122", boom: true },
  // Court Gossip: THE HEAD LETS GO - the clock bursts in one breath, rippling twice
  hx4_court_gossip: { at: 800, x: 50, y: 48, rgb: "207 224 168", boom: true, size: 8 },
  // Quicksilver: THE BEAD BANKS THE CORNER - and slams the channel's end
  ov_quicksilver: { at: 820, rgb: "184 196 204", laser: true, rot: -90, far: true },
  // Homesick Queen: THE HEARTH CALL - the pull lands in her chest as a double beat
  hx4_homesick_queen: { at: 780, x: 50, y: 52, rgb: "231 155 90", boom: true },
  // Leaky Quiver: THE ARROW FALLS SHORT - it lands at the range's true end, tumbling
  hx4_leaky_quiver: { at: 780, rgb: "168 189 125", boom: true, far: true },
  // Slippery Scepter: THE GRIP GOES - the scepter squirts out at a comic angle
  hx4_slippery_scepter: { at: 760, x: 53, y: 50, rgb: "227 192 90", rot: 25 },
  // Matins Bell: THE BELL STROKE - the first stroke, then its echo through the louvres
  hx4_matins_bell: { at: 760, x: 50, y: 47, rgb: "195 178 138", boom: true, size: 8 },
  // Crane Swing: THE LOAD SET DOWN - the jib lands it at the far mark, twice
  op_crane_swing: { at: 760, rgb: "224 168 60", boom: true, far: true },
  // Follow Spot: THE SPOT SNAPS ON - one hot column out of the dark
  op_follow_spot: { at: 740, x: 50, y: 48, rgb: "246 227 154", laser: true },
  // Painter's Lift: THE CRADLE SETTLES - one ring as the ropes take
  op_painters_lift: { at: 720, rgb: "143 178 160", far: true },
  // Parasol Bearer: THE RIBS SNAP OPEN - the canopy pops with a double flutter
  op_parasol_bearer: { at: 740, x: 51, y: 47, rgb: "232 143 162", boom: true },
  // Portrait of a Lady: THE POWDER FLASH - the tray fires a column and the studio jumps
  op_portrait_of_a_lady: { at: 760, x: 50, y: 46, rgb: "201 143 168", laser: true, boom: true },
  // Queen's Holiday: THE DECKCHAIR CLACK - one ring as the chair locks flat
  op_queens_holiday: { at: 720, x: 52, y: 51, rgb: "97 208 168", size: 5.6 },
};


const SJ = { strokeLinejoin: "round", strokeLinecap: "round" } as const;

/* Shared silhouettes: the court the objects belong to. */
const CROWN = "M5.2 7.2l2.6 3.8 2-5.6 2.2 4.6 2.2-4.6 2 5.6 2.6-3.8-1.2 9.4H6.4z";
const CROWN_BASE = "M6.2 17.4h11.6v2.4H6.2z";
const LADY = "M12 3.6a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8zM7.6 20.4l1.6-8.2a2.9 2.9 0 0 1 5.6 0l1.6 8.2z";

/* =============================================================================
   1. Return of the Queen (t8) — THE EIGHT-SIDED LENS. The keeper's shadow
   crosses the darkened lantern room, the octagonal lens seats itself, the lamp
   takes, and eight separate beams go out on eight bearings, each as long as the
   line it has to cover. Settle: warm motes in the lantern glass.
   Palette: #f2c85c / #fff4d6 / #2a1f0c.
   ========================================================================== */
function LighthouseLens({ role, delayMs }: SceneProps) {
  const lens = (
    <g fill="none" stroke="#f2c85c" strokeWidth="1.4" {...SJ}>
      <path d="M12 2.6l6.6 3.8v7.2L12 21.4 5.4 13.6V6.4z" />
      <path d="M12 2.6v18.8M5.4 6.4l13.2 7.2M18.6 6.4L5.4 13.6" />
    </g>
  );
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <svg viewBox="0 0 24 24" className="g30-ent absolute block" style={st({ ...d(delayMs, 60), left: "20%", top: "18%", width: "60%", height: "60%" })}>
          {lens}
        </svg>
        <span className="g30-ent2 absolute block" style={st({ ...d(delayMs, 190), left: "6%", top: "46%", height: "6%", width: "88%", background: "linear-gradient(90deg, transparent, #fff4d6, transparent)" })} />
        <svg viewBox="0 0 24 24" className="g30-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "32%", top: "56%", width: "36%", height: "36%" })}>
          <path d={CROWN} fill="#f2c85c" stroke="#2a1f0c" strokeWidth="1" {...SJ} />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g30-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "44%", height: "10%", width: "92%", background: "linear-gradient(90deg, transparent, #f2c85c, #fff4d6)" })} />
        <svg viewBox="0 0 24 24" className="g30-hit absolute block" style={st({ ...d(delayMs, 200), left: "22%", top: "22%", width: "56%", height: "56%" })}>
          <path d="M12 3l6 3.4v6.8L12 21 6 13.2V6.4z" fill="#2a1f0c" stroke="#f2c85c" strokeWidth="1.4" {...SJ} />
          <circle cx="12" cy="11" r="2.6" fill="#fff4d6" />
        </svg>
        <span className="g30-mote absolute block" style={st({ ...d(delayMs, 400), left: "44%", top: "40%", width: "12%", height: "12%", borderRadius: "50%", background: "#fff4d6" })} />
      </span>
    );
  }
  return (
    <Lead d={delayMs} imp={IMP.bn4_return_of_the_queen} frame={<Frame base={delayMs} tone="rgba(242,200,92,0.3)" rim="rgba(255,244,214,0.32)" />}>
      {/* tell: the keeper's shadow crosses the dark lantern room */}
      <span className="g30-tell absolute block" style={st({ ...d(delayMs, 110), ...box(3.4, 1.1, 0, 1.1), background: "radial-gradient(ellipse, rgba(42,31,12,0.85), transparent 72%)" })} />
      {/* strike: the eight-sided lens seats itself around the lamp */}
      <svg viewBox="0 0 24 24" className="g30-lens absolute block" style={st({ ...d(delayMs, 260), ...box(3.6, 3.6), filter: "drop-shadow(0 0 6px rgba(242,200,92,0.7))" })}>
        {lens}
      </svg>
      {/* eight separate beams, each as long as the line it has to cover */}
      {EIGHT.map((i) => (
        <Ray key={i} i={i} size={11}>
          <span className="g30-beam absolute block" style={st({ ...rayD(delayMs, 360, i, 46), left: "50%", top: "47.4%", width: "46%", height: "5.2%", background: "linear-gradient(90deg, rgba(255,244,214,0.95), rgba(242,200,92,0))" })} />
        </Ray>
      ))}
      {/* the lamp itself takes */}
      <span className="g30-lamp absolute block" style={st({ ...d(delayMs, 470), ...box(1.7, 1.7), borderRadius: "50%", background: "radial-gradient(circle, #fff4d6 30%, rgba(242,200,92,0) 72%)" })} />
      {/* settle: warm motes drifting in the lantern glass, away from the caster */}
      <span className="g30-mote absolute block" style={st({ ...d(delayMs, 650), ...box(0.34, 0.34, -1.2, -0.6), borderRadius: "50%", background: "#fff4d6" })} />
      <span className="g30-mote absolute block" style={st({ ...d(delayMs, 760), ...box(0.28, 0.28, 1.4, 0.3), borderRadius: "50%", background: "#f2c85c" })} />
    </Lead>
  );
}

/* =============================================================================
   2. Harbor Queen (t7) — THE EIGHT BLADES. A course is called down the water,
   the galley runs the real length of the line, and eight oar blades catch
   together and feather. Settle: two splashes drifting off the caster's side.
   Palette: #6fb7c8 / #fdf0cf / #12303a.
   ========================================================================== */
function HarborOars({ role, delayMs }: SceneProps) {
  const blade = (fill: string) => <path d="M2 12h13l6-2.6v5.2L15 12" fill={fill} stroke="#12303a" strokeWidth="1.1" {...SJ} />;
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <svg viewBox="0 0 24 24" className="g30-ent absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "24%", width: "84%", height: "34%" })}>
          {blade("#6fb7c8")}
        </svg>
        <svg viewBox="0 0 24 24" className="g30-ent2 absolute block" style={st({ ...d(delayMs, 190), left: "10%", top: "50%", width: "80%", height: "34%" })}>
          <path d="M3 16c3.4-2.6 6.6-2.6 9 0 2.4 2.6 5.6 2.6 9 0" fill="none" stroke="#fdf0cf" strokeWidth="1.8" {...SJ} />
        </svg>
        <svg viewBox="0 0 24 24" className="g30-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "34%", top: "4%", width: "32%", height: "32%" })}>
          <path d={CROWN} fill="#6fb7c8" stroke="#12303a" strokeWidth="1" {...SJ} />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g30-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "2%", top: "58%", height: "8%", width: "96%", background: "linear-gradient(90deg, transparent, #6fb7c8, transparent)" })} />
        <svg viewBox="0 0 24 24" className="g30-hitside absolute block" style={st({ ...d(delayMs, 200), left: "10%", top: "24%", width: "80%", height: "44%" })}>
          {blade("#fdf0cf")}
        </svg>
        <span className="g30-sift absolute block" style={st({ ...d(delayMs, 400), left: "40%", top: "52%", width: "20%", height: "20%", borderRadius: "50%", background: "radial-gradient(circle, rgba(253,240,207,0.8), transparent 70%)" })} />
      </span>
    );
  }
  return (
    <AimLead d={delayMs} imp={IMP.bn4_harbor_queen} frame={<Frame base={delayMs} tone="rgba(111,183,200,0.3)" rim="rgba(18,48,58,0.42)" />}>
      {/* tell: the coxswain's course, called down the whole line */}
      <span className="g30-tellline absolute block" style={st({ ...d(delayMs, 110), ...lane(0.16), background: "#fdf0cf" })} />
      {/* strike: the hull runs the real length of the vector */}
      {/* sized to exactly ONE CELL, so translateX(--fx-len * 100%) is cells */}
      <svg viewBox="0 0 24 12" className="g30-run absolute block" style={st({ ...d(delayMs, 250), ...box(1, 0.5), filter: "drop-shadow(0 0 4px rgba(111,183,200,0.8))" })}>
        <path d="M1 4h20l2 2.4-3.4 3.6H4.4z" fill="#12303a" stroke="#6fb7c8" strokeWidth="1.1" {...SJ} />
        <path d="M11.4 4V0.8" stroke="#fdf0cf" strokeWidth="1.2" {...SJ} />
      </svg>
      {/* the eight blades catch together, four a side */}
      {EIGHT.map((i) => (
        <span
          key={i}
          className="g30-oar absolute block"
          style={st({
            ...rayD(delayMs, 330, i % 4, 44),
            ...box(1.5, 0.24, (i % 4) * 1.2 - 1.8, i < 4 ? -0.62 : 0.62),
            background: "linear-gradient(90deg, #12303a, #6fb7c8)",
            transformOrigin: i < 4 ? "10% 100%" : "10% 0%",
          })}
        />
      ))}
      {/* the wake stretches exactly as far as the boat pulled */}
      <span className="g30-wake absolute block" style={st({ ...d(delayMs, 430), ...lane(0.7), background: "linear-gradient(90deg, rgba(253,240,207,0.75), rgba(111,183,200,0))" })} />
      {/* settle: two splashes falling away from the caster */}
      <span className="g30-sift absolute block" style={st({ ...d(delayMs, 640), ...box(1.1, 1.1, -1.4, 0.5), borderRadius: "50%", background: "radial-gradient(circle, rgba(253,240,207,0.7), transparent 70%)" })} />
      <span className="g30-sift absolute block" style={st({ ...d(delayMs, 760), ...box(0.8, 0.8, 1.6, -0.5), borderRadius: "50%", background: "radial-gradient(circle, rgba(111,183,200,0.8), transparent 70%)" })} />
    </AimLead>
  );
}

/* =============================================================================
   3. Gilded Cage (t6) — THE CAGE THAT CLOSES ON EVERY BEARING. Reach inverted:
   the same eight lines, but the gilt bars swing DOWN along them one after
   another, the crown finial drops onto the hoop and a padlock snaps shut.
   Settle: one feather turning over. Palette: #d9ae4e / #fff2d2 / #2b2110.
   ========================================================================== */
function GildedCage({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <svg viewBox="0 0 24 24" className="g30-ent absolute block" style={st({ ...d(delayMs, 60), left: "18%", top: "14%", width: "64%", height: "68%" })}>
          <path d="M12 2.4l5.6 4.4v13H6.4v-13z" fill="none" stroke="#d9ae4e" strokeWidth="1.4" {...SJ} />
          <path d="M9 7v12.8M12 6v13.8M15 7v12.8" stroke="#d9ae4e" strokeWidth="1.1" />
        </svg>
        <span className="g30-ent2 absolute block" style={st({ ...d(delayMs, 190), left: "16%", top: "82%", height: "7%", width: "68%", background: "#2b2110" })} />
        <svg viewBox="0 0 24 24" className="g30-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "36%", top: "40%", width: "28%", height: "28%" })}>
          <path d="M8 11V8.4a4 4 0 0 1 8 0V11" fill="none" stroke="#fff2d2" strokeWidth="1.8" {...SJ} />
          <rect x="6" y="11" width="12" height="9" fill="#d9ae4e" stroke="#2b2110" strokeWidth="1.2" />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g30-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "12%", top: "8%", height: "84%", width: "5%", background: "#d9ae4e" })} />
        <svg viewBox="0 0 24 24" className="g30-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "18%", width: "60%", height: "64%" })}>
          <path d="M12 3l5 4v13H7V7z" fill="rgba(43,33,16,0.85)" stroke="#d9ae4e" strokeWidth="1.4" {...SJ} />
          <path d="M10 8v11.6M14 8v11.6" stroke="#fff2d2" strokeWidth="1.1" />
        </svg>
        <span className="g30-mote absolute block" style={st({ ...d(delayMs, 400), left: "42%", top: "44%", width: "16%", height: "16%", borderRadius: "50%", background: "#fff2d2" })} />
      </span>
    );
  }
  return (
    <Lead d={delayMs} imp={IMP.hx4_gilded_cage} frame={<Frame base={delayMs} tone="rgba(217,174,78,0.26)" rim="rgba(43,33,16,0.5)" />}>
      {/* tell: the shadow of the cage falls before the cage does */}
      <span className="g30-tell absolute block" style={st({ ...d(delayMs, 110), ...box(4.2, 1.3, 0, 1.4), background: "radial-gradient(ellipse, rgba(43,33,16,0.8), transparent 72%)" })} />
      {/* strike: eight gilt bars swing down, one bearing after another */}
      {EIGHT.map((i) => (
        <Ray key={i} i={i} size={7.4}>
          <span
            className="g30-bar absolute block"
            style={st({ ...rayD(delayMs, 250, i, 54), left: "50%", top: "48.2%", width: "44%", height: "3.6%", background: "linear-gradient(90deg, #d9ae4e, #fff2d2)", transformOrigin: "0% 50%" })}
          />
        </Ray>
      ))}
      {/* the finial hoop drops onto the crown of the cage */}
      <svg viewBox="0 0 24 24" className="g30-finial absolute block" style={st({ ...d(delayMs, 470), ...box(2, 2, 0, -0.2) })}>
        <circle cx="12" cy="12" r="8.6" fill="none" stroke="#d9ae4e" strokeWidth="2" />
        <path d={CROWN} fill="#fff2d2" stroke="#2b2110" strokeWidth="1" transform="translate(4.8 4.8) scale(0.6)" {...SJ} />
      </svg>
      {/* the lock snaps: the doors are barred from outside */}
      <svg viewBox="0 0 24 24" className="g30-latch absolute block" style={st({ ...d(delayMs, 590), ...box(1.5, 1.5, 0, 1.5) })}>
        <path d="M8 11V8.6a4 4 0 0 1 8 0V11" fill="none" stroke="#fff2d2" strokeWidth="2" {...SJ} />
        <rect x="5.6" y="11" width="12.8" height="9.4" fill="#d9ae4e" stroke="#2b2110" strokeWidth="1.4" />
      </svg>
      {/* settle: a single feather turning over, away from the caster */}
      <span className="g30-mote absolute block" style={st({ ...d(delayMs, 720), ...box(0.5, 0.32, 1.6, 0.9), borderRadius: "50%", background: "#fff2d2" })} />
    </Lead>
  );
}

/* =============================================================================
   4. Glass Case (t5) — THE VITRINE. A velvet plinth rises, eight museum panes
   lower on eight bearings and meet, the seams take a hairline flash and the cap
   settles. Settle: two dust motes inside sealed air.
   Palette: #a9d8e6 / #fff4d6 / #1d2a33.
   ========================================================================== */
function GlassVitrine({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g30-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "16%", top: "76%", height: "9%", width: "68%", background: "#1d2a33" })} />
        <svg viewBox="0 0 24 24" className="g30-ent absolute block" style={st({ ...d(delayMs, 190), left: "22%", top: "14%", width: "56%", height: "64%" })}>
          <rect x="4" y="3.4" width="16" height="17" fill="rgba(169,216,230,0.28)" stroke="#a9d8e6" strokeWidth="1.4" />
          <path d={CROWN} fill="#fff4d6" transform="translate(5.6 5.4) scale(0.53)" />
        </svg>
        <span className="g30-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "26%", top: "22%", width: "10%", height: "52%", background: "linear-gradient(180deg, rgba(255,244,214,0.9), transparent)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g30-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "10%", top: "80%", height: "8%", width: "80%", background: "#1d2a33" })} />
        <svg viewBox="0 0 24 24" className="g30-hit absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "14%", width: "64%", height: "68%" })}>
          <rect x="3.6" y="3" width="16.8" height="17.6" fill="rgba(169,216,230,0.3)" stroke="#a9d8e6" strokeWidth="1.5" />
          <path d="M3.6 3l16.8 17.6" stroke="#fff4d6" strokeWidth="1" opacity="0.8" />
        </svg>
        <span className="g30-mote absolute block" style={st({ ...d(delayMs, 400), left: "46%", top: "34%", width: "9%", height: "9%", borderRadius: "50%", background: "#fff4d6" })} />
      </span>
    );
  }
  return (
    <Lead d={delayMs} imp={IMP.bn4_glass_case} frame={<Frame base={delayMs} tone="rgba(169,216,230,0.26)" rim="rgba(255,244,214,0.28)" />}>
      {/* tell: the velvet plinth rises under whatever is about to be protected */}
      <span className="g30-plinth absolute block" style={st({ ...d(delayMs, 120), ...box(3, 0.7, 0, 1.4), background: "linear-gradient(180deg, #1d2a33, rgba(29,42,51,0.2))" })} />
      {/* strike: eight museum panes lower on eight bearings and meet */}
      {EIGHT.map((i) => (
        <Ray key={i} i={i} size={5.6}>
          <span
            className="g30-pane absolute block"
            style={st({ ...rayD(delayMs, 260, i, 46), left: "56%", top: "34%", width: "26%", height: "32%", background: "linear-gradient(120deg, rgba(169,216,230,0.55), rgba(255,244,214,0.16))", border: "1px solid #a9d8e6" })}
          />
        </Ray>
      ))}
      {/* the seams take a hairline flash as the case closes */}
      <span className="g30-seam absolute block" style={st({ ...d(delayMs, 500), ...box(3.4, 3.4), borderRadius: "50%", border: "2px solid rgba(255,244,214,0.9)" })} />
      {/* the cap settles onto the crown of the case */}
      <svg viewBox="0 0 24 24" className="g30-cap absolute block" style={st({ ...d(delayMs, 570), ...box(2.4, 1.2, 0, -1.5) })}>
        <path d="M2 20L12 5l10 15z" fill="#1d2a33" stroke="#a9d8e6" strokeWidth="1.4" {...SJ} />
      </svg>
      {/* settle: sealed air, two motes and nothing else */}
      <span className="g30-mote absolute block" style={st({ ...d(delayMs, 700), ...box(0.3, 0.3, -0.8, 0.2), borderRadius: "50%", background: "#fff4d6" })} />
      <span className="g30-mote absolute block" style={st({ ...d(delayMs, 790), ...box(0.24, 0.24, 0.9, -0.4), borderRadius: "50%", background: "#a9d8e6" })} />
    </Lead>
  );
}

/* =============================================================================
   5. Quicksand Quarter (t5) — THE SAND FOUNTAIN, RUN BACKWARDS. The crust
   cracks, eight dry jets go up on eight bearings and come straight back down,
   the funnel opens at the hub and a boundary post tips in. The affected QUARTER
   is drawn inside <BoardFrame>, so it is the board's quarter and not the
   stage's. Palette: #d9b071 / #fbeccd / #3a2a17.
   ========================================================================== */
function SandFountain({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g30-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "70%", height: "8%", width: "84%", background: "#3a2a17" })} />
        <svg viewBox="0 0 24 24" className="g30-ent absolute block" style={st({ ...d(delayMs, 190), left: "20%", top: "20%", width: "60%", height: "56%" })}>
          <path d="M3 6h18l-9 8 9 8H3l9-8z" fill="none" stroke="#d9b071" strokeWidth="1.5" {...SJ} />
          <path d="M8 18h8l-4-3.6z" fill="#fbeccd" />
        </svg>
        <span className="g30-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "40%", top: "58%", width: "20%", height: "20%", borderRadius: "50%", background: "radial-gradient(circle, #fbeccd, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g30-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "10%", top: "58%", height: "6%", width: "80%", background: "#d9b071" })} />
        <svg viewBox="0 0 24 24" className="g30-hit absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "26%", width: "68%", height: "58%" })}>
          <path d="M1.6 6h20.8L12 21z" fill="rgba(58,42,23,0.8)" stroke="#d9b071" strokeWidth="1.4" {...SJ} />
          <path d="M6 9.4h12L12 17z" fill="#fbeccd" opacity="0.85" />
        </svg>
        <span className="g30-sift absolute block" style={st({ ...d(delayMs, 400), left: "38%", top: "20%", width: "24%", height: "24%", borderRadius: "50%", background: "radial-gradient(circle, rgba(251,236,205,0.75), transparent 70%)" })} />
      </span>
    );
  }
  return (
    <Lead d={delayMs} imp={IMP.hx4_quicksand_quarter}
      frame={
        <BoardFrame>
          <span className="g30-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(217,176,113,0.24), transparent 72%)" })} />
          {/* the quarter itself: half the board's width, half its height, on
              the CASTER's half of the board rather than a fixed screen edge */}
          <span
            className="absolute block"
            style={st({ left: "0%", top: "50%", width: "50%", height: "50%", transform: "translateY(calc((var(--fx-side, 1) - 1) * 50%))" })}
          >
            <span className="g30-quarter absolute inset-0 block" style={st({ ...d(delayMs, 150), background: "repeating-linear-gradient(45deg, rgba(217,176,113,0.45) 0 6px, rgba(58,42,23,0.35) 6px 12px)" })} />
          </span>
        </BoardFrame>
      }
    >
      {/* tell: the dry crust cracks across the hub */}
      <span className="g30-tell absolute block" style={st({ ...d(delayMs, 110), ...box(3.6, 0.9, 0, 0.9), background: "radial-gradient(ellipse, rgba(58,42,23,0.85), transparent 74%)" })} />
      {/* strike: eight dry jets up, and straight back down */}
      {EIGHT.map((i) => (
        <Ray key={i} i={i} size={6.6}>
          <span
            className="g30-jet absolute block"
            style={st({ ...rayD(delayMs, 250, i, 48), left: "50%", top: "46.4%", width: "34%", height: "7.2%", background: "linear-gradient(90deg, #fbeccd, rgba(217,176,113,0))", transformOrigin: "0% 50%" })}
          />
        </Ray>
      ))}
      {/* the funnel opens at the hub and turns */}
      <svg viewBox="0 0 24 24" className="g30-funnel absolute block" style={st({ ...d(delayMs, 470), ...box(2.8, 2.8) })}>
        <path d="M1.4 5.6h21.2L12 21.6z" fill="rgba(58,42,23,0.9)" stroke="#d9b071" strokeWidth="1.5" {...SJ} />
        <path d="M6.4 9h11.2L12 17z" fill="#d9b071" opacity="0.7" />
      </svg>
      {/* a boundary post tips in and goes under */}
      <span className="g30-post absolute block" style={st({ ...d(delayMs, 560), ...box(0.3, 2.2, 1.5, -0.6), background: "linear-gradient(180deg, #fbeccd, #3a2a17)", transformOrigin: "50% 100%" })} />
      {/* settle: grain drifting off, away from the caster */}
      <span className="g30-sift absolute block" style={st({ ...d(delayMs, 700), ...box(4, 1.6, 0, -0.8), borderRadius: "50%", background: "radial-gradient(circle, rgba(251,236,205,0.5), transparent 72%)" })} />
    </Lead>
  );
}

/* =============================================================================
   6. Widow's Veil (t5) — THE MOURNING LACE. A crown dims, eight panels of black
   lace fall outward on eight bearings and close over it, and one jet bead runs
   down the veil. Palette: #6d6482 / #efe3d0 / #17131f.
   ========================================================================== */
function WidowsVeil({ role, delayMs }: SceneProps) {
  const lacePanel = "M0 0h24l-2.6 15.4L12 24 2.6 15.4z";
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <svg viewBox="0 0 24 24" className="g30-ent absolute block" style={st({ ...d(delayMs, 60), left: "22%", top: "16%", width: "56%", height: "56%" })}>
          <path d={CROWN} fill="#6d6482" stroke="#17131f" strokeWidth="1" {...SJ} />
          <path d={CROWN_BASE} fill="#17131f" />
        </svg>
        <svg viewBox="0 0 24 24" className="g30-ent2 absolute block" style={st({ ...d(delayMs, 190), left: "14%", top: "10%", width: "72%", height: "74%" })}>
          <path d={lacePanel} fill="rgba(23,19,31,0.72)" stroke="#6d6482" strokeWidth="1.2" {...SJ} />
        </svg>
        <span className="g30-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "46%", top: "62%", width: "8%", height: "12%", borderRadius: "50%", background: "#efe3d0" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g30-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "8%", top: "12%", height: "6%", width: "84%", background: "#6d6482" })} />
        <svg viewBox="0 0 24 24" className="g30-hit absolute block" style={st({ ...d(delayMs, 200), left: "14%", top: "12%", width: "72%", height: "76%" })}>
          <path d={lacePanel} fill="rgba(23,19,31,0.8)" stroke="#6d6482" strokeWidth="1.3" {...SJ} />
          <path d="M6 6h12M7 10h10" stroke="#efe3d0" strokeWidth="0.9" opacity="0.7" />
        </svg>
        <span className="g30-sift absolute block" style={st({ ...d(delayMs, 400), left: "44%", top: "56%", width: "12%", height: "16%", borderRadius: "50%", background: "#efe3d0" })} />
      </span>
    );
  }
  return (
    <Lead d={delayMs} imp={IMP.hx4_widows_veil} frame={<Frame base={delayMs} tone="rgba(23,19,31,0.6)" rim="rgba(109,100,130,0.4)" />}>
      {/* tell: the crown under the veil goes out */}
      <svg viewBox="0 0 24 24" className="g30-dim absolute block" style={st({ ...d(delayMs, 110), ...box(2.4, 2.4) })}>
        <path d={CROWN} fill="#6d6482" stroke="#17131f" strokeWidth="1.1" {...SJ} />
        <path d={CROWN_BASE} fill="#17131f" />
      </svg>
      {/* strike: eight lace panels fall outward and close over her */}
      {EIGHT.map((i) => (
        <Ray key={i} i={i} size={7}>
          <span
            className="g30-lace absolute block"
            style={st({ ...rayD(delayMs, 260, i, 50), left: "50%", top: "36%", width: "42%", height: "28%", background: "linear-gradient(90deg, rgba(23,19,31,0.9), rgba(109,100,130,0.1))", transformOrigin: "0% 50%" })}
          />
        </Ray>
      ))}
      {/* the hem draws in */}
      <span className="g30-hem absolute block" style={st({ ...d(delayMs, 520), ...box(4.6, 4.6), borderRadius: "50%", border: "2px solid rgba(109,100,130,0.85)" })} />
      {/* one jet bead runs down the lace */}
      <span className="g30-bead absolute block" style={st({ ...d(delayMs, 600), ...box(0.36, 0.5, 0.2, 0.3), borderRadius: "50%", background: "#efe3d0" })} />
      {/* settle: the veil breathes once and stills */}
      <span className="g30-sift absolute block" style={st({ ...d(delayMs, 730), ...box(3.4, 1.6, 0, 1.2), borderRadius: "50%", background: "radial-gradient(circle, rgba(109,100,130,0.5), transparent 72%)" })} />
    </Lead>
  );
}

/* =============================================================================
   7. Doting Retinue (t4) — THE SPIDER AT THE HUB. One thread is cast, then eight
   silks snap taut to the eight neighbours in the real victim order, the body
   settles at the hub and dew beads slide inward. Nobody leaves her side.
   Palette: #b9c6d8 / #fff3d8 / #1a1f2b.
   ========================================================================== */
function ThreadHub({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <svg viewBox="0 0 24 24" className="g30-ent absolute block" style={st({ ...d(delayMs, 60), left: "12%", top: "12%", width: "76%", height: "76%" })}>
          <path d="M12 12L2 6M12 12l10-6M12 12L2 18M12 12l10 6M12 12V1M12 12v11M12 12H1M12 12h11" stroke="#b9c6d8" strokeWidth="0.9" />
        </svg>
        <svg viewBox="0 0 24 24" className="g30-ent2 absolute block" style={st({ ...d(delayMs, 190), left: "34%", top: "34%", width: "32%", height: "32%" })}>
          <ellipse cx="12" cy="13" rx="5.4" ry="6.4" fill="#1a1f2b" stroke="#b9c6d8" strokeWidth="1.2" />
          <circle cx="12" cy="6.4" r="3" fill="#1a1f2b" stroke="#b9c6d8" strokeWidth="1.2" />
        </svg>
        <span className="g30-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "44%", top: "18%", width: "10%", height: "10%", borderRadius: "50%", background: "#fff3d8" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g30-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "0%", top: "48%", height: "3%", width: "100%", background: "#b9c6d8" })} />
        <svg viewBox="0 0 24 24" className="g30-hitside absolute block" style={st({ ...d(delayMs, 200), left: "24%", top: "24%", width: "52%", height: "52%" })}>
          <ellipse cx="12" cy="13" rx="5" ry="6" fill="#1a1f2b" stroke="#b9c6d8" strokeWidth="1.3" />
          <path d="M7 9L2 5M17 9l5-4M7 17l-5 4M17 17l5 4" stroke="#b9c6d8" strokeWidth="1.2" {...SJ} />
        </svg>
        <span className="g30-mote absolute block" style={st({ ...d(delayMs, 400), left: "46%", top: "30%", width: "8%", height: "8%", borderRadius: "50%", background: "#fff3d8" })} />
      </span>
    );
  }
  return (
    <Lead d={delayMs} imp={IMP.hx4_doting_retinue} frame={<Frame base={delayMs} tone="rgba(185,198,216,0.24)" rim="rgba(26,31,43,0.45)" />}>
      {/* tell: the first orb thread is cast */}
      <span className="g30-tellring absolute block" style={st({ ...d(delayMs, 110), ...box(4.4, 4.4), borderRadius: "50%", border: "1px solid rgba(185,198,216,0.9)" })} />
      {/* strike: eight silks snap taut, one per neighbour, in victim order */}
      {EIGHT.map((i) => (
        <Ray key={i} i={i} size={6.4}>
          <span
            className="g30-thread absolute block"
            style={st({ ...rayD(delayMs, 240, i, 46), left: "50%", top: "49.2%", width: "44%", height: "1.6%", background: "linear-gradient(90deg, #fff3d8, rgba(185,198,216,0.15))", transformOrigin: "0% 50%" })}
          />
        </Ray>
      ))}
      {/* the body settles at the hub and feels all eight at once */}
      <svg viewBox="0 0 24 24" className="g30-spider absolute block" style={st({ ...d(delayMs, 480), ...box(2.2, 2.2) })}>
        <ellipse cx="12" cy="13.4" rx="5" ry="6" fill="#1a1f2b" stroke="#b9c6d8" strokeWidth="1.3" />
        <circle cx="12" cy="6.6" r="2.8" fill="#1a1f2b" stroke="#b9c6d8" strokeWidth="1.2" />
        <path d="M12 4.4l-1.4-2M12 4.4l1.4-2" stroke="#fff3d8" strokeWidth="1.1" {...SJ} />
      </svg>
      {/* dew slides back down the silk toward her */}
      {FOUR.map((i) => (
        <span
          key={i}
          className="g30-dew absolute block"
          style={st({ ...rayD(delayMs, 620, i, 70), ...box(0.3, 0.3, i * 1.1 - 1.65, i % 2 ? 1.1 : -1.1), borderRadius: "50%", background: "#fff3d8" })}
        />
      ))}
    </Lead>
  );
}

/* =============================================================================
   8. Danger Sense (t3) — THE COMPASS ROSE. A bearing line is scribed down the
   real vector, the rose's eight points strike in turn, and the needle swings
   past the threat and locks on it at the far end of the line.
   Palette: #e8734a / #ffe9c4 / #2b1206.
   ========================================================================== */
function CompassRose({ role, delayMs }: SceneProps) {
  const point = "M0 12L20 8.6 24 12l-4 3.4z";
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <svg viewBox="0 0 24 24" className="g30-ent absolute block" style={st({ ...d(delayMs, 60), left: "16%", top: "16%", width: "68%", height: "68%" })}>
          <circle cx="12" cy="12" r="10.4" fill="none" stroke="#e8734a" strokeWidth="1.3" />
          <path d="M12 1.6l2.2 8.2L22.4 12l-8.2 2.2L12 22.4l-2.2-8.2L1.6 12l8.2-2.2z" fill="#ffe9c4" />
        </svg>
        <span className="g30-ent2 absolute block" style={st({ ...d(delayMs, 190), left: "8%", top: "48%", height: "4%", width: "84%", background: "#e8734a" })} />
        <span className="g30-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "42%", top: "42%", width: "16%", height: "16%", borderRadius: "50%", background: "#2b1206" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g30-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "6%", top: "46%", height: "8%", width: "88%", background: "linear-gradient(90deg, transparent, #e8734a)" })} />
        <svg viewBox="0 0 24 24" className="g30-hitside absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "20%", width: "60%", height: "60%" })}>
          <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" fill="#ffe9c4" stroke="#2b1206" strokeWidth="1" {...SJ} />
        </svg>
        <span className="g30-mote absolute block" style={st({ ...d(delayMs, 400), left: "44%", top: "44%", width: "12%", height: "12%", borderRadius: "50%", background: "#e8734a" })} />
      </span>
    );
  }
  return (
    <AimLead d={delayMs} imp={IMP.bn4_danger_sense} frame={<Frame base={delayMs} tone="rgba(232,115,74,0.26)" />}>
      {/* tell: the bearing is scribed down the real vector */}
      <span className="g30-tellline absolute block" style={st({ ...d(delayMs, 110), ...lane(0.12), background: "#ffe9c4" })} />
      {/* strike: the rose's eight points strike, one after another */}
      {EIGHT.map((i) => (
        <Ray key={i} i={i} size={5.2}>
          <svg viewBox="0 0 24 24" className="g30-point absolute block" style={st({ ...rayD(delayMs, 240, i, 40), left: "50%", top: "30%", width: "50%", height: "40%" })}>
            <path d={point} fill={i % 2 ? "#e8734a" : "#ffe9c4"} stroke="#2b1206" strokeWidth="0.8" {...SJ} />
          </svg>
        </Ray>
      ))}
      {/* the needle overshoots the threat and settles on it */}
      <span className="g30-needle absolute block" style={st({ ...d(delayMs, 460), ...box(2.6, 0.22, 1.1), background: "linear-gradient(90deg, #2b1206, #e8734a)", transformOrigin: "0% 50%" })} />
      {/* the mark itself, exactly where the line ends */}
      <svg viewBox="0 0 24 24" className="g30-pin absolute block" style={st({ ...d(delayMs, 580), ...farEnd(1.5, 1.5) })}>
        <circle cx="12" cy="12" r="8.4" fill="none" stroke="#e8734a" strokeWidth="2.4" />
        <circle cx="12" cy="12" r="3" fill="#ffe9c4" />
      </svg>
      {/* settle: the warning fades off the caster's side */}
      <span className="g30-mote absolute block" style={st({ ...d(delayMs, 700), ...box(0.4, 0.4, 0.6, -0.9), borderRadius: "50%", background: "#ffe9c4" })} />
    </AimLead>
  );
}

/* =============================================================================
   9. Slow Procession (t3) — THE PROCESSIONAL WHEEL. Reach at a crawl: the nave
   turns one notch, and the light walks OUT along each of the eight spokes in
   turn until the felloe finally takes it. Palette: #cbb27a / #fff2d4 / #241d10.
   ========================================================================== */
function ProcessionWheel({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <svg viewBox="0 0 24 24" className="g30-ent absolute block" style={st({ ...d(delayMs, 60), left: "14%", top: "14%", width: "72%", height: "72%" })}>
          <circle cx="12" cy="12" r="10.2" fill="none" stroke="#cbb27a" strokeWidth="1.6" />
          <path d="M12 1.8v20.4M1.8 12h20.4M4.8 4.8l14.4 14.4M19.2 4.8L4.8 19.2" stroke="#cbb27a" strokeWidth="1" />
        </svg>
        <span className="g30-ent2 absolute block" style={st({ ...d(delayMs, 190), left: "42%", top: "42%", width: "16%", height: "16%", borderRadius: "50%", background: "#fff2d4" })} />
        <span className="g30-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "10%", top: "84%", height: "6%", width: "80%", background: "#241d10" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g30-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "12%", top: "84%", height: "6%", width: "76%", background: "#241d10" })} />
        <svg viewBox="0 0 24 24" className="g30-hit absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "18%", width: "64%", height: "64%" })}>
          <circle cx="12" cy="12" r="9.6" fill="none" stroke="#cbb27a" strokeWidth="2" />
          <path d="M12 2.4v19.2M2.4 12h19.2" stroke="#fff2d4" strokeWidth="1.3" />
        </svg>
        <span className="g30-mote absolute block" style={st({ ...d(delayMs, 400), left: "45%", top: "45%", width: "10%", height: "10%", borderRadius: "50%", background: "#fff2d4" })} />
      </span>
    );
  }
  return (
    <Lead d={delayMs} imp={IMP.bn4_slow_procession} frame={<Frame base={delayMs} tone="rgba(203,178,122,0.26)" rim="rgba(36,29,16,0.42)" />}>
      {/* tell: the wheel's shadow, and a first notch of turn */}
      <span className="g30-tell absolute block" style={st({ ...d(delayMs, 110), ...box(4, 1.2, 0, 1.6), background: "radial-gradient(ellipse, rgba(36,29,16,0.8), transparent 74%)" })} />
      {/* strike: light walks out along each spoke in turn, from the nave */}
      {EIGHT.map((i) => (
        <Ray key={i} i={i} size={6.8}>
          <span
            className="g30-spoke absolute block"
            style={st({ ...rayD(delayMs, 260, i, 62), left: "50%", top: "48.6%", width: "43%", height: "2.8%", background: "linear-gradient(90deg, #fff2d4, #cbb27a)", transformOrigin: "0% 50%" })}
          />
        </Ray>
      ))}
      {/* the nave turns its notch */}
      <svg viewBox="0 0 24 24" className="g30-nave absolute block" style={st({ ...d(delayMs, 430), ...box(1.7, 1.7) })}>
        <circle cx="12" cy="12" r="7.6" fill="#241d10" stroke="#cbb27a" strokeWidth="1.6" />
        <path d="M12 4.4v3.2M12 16.4v3.2M4.4 12h3.2M16.4 12h3.2" stroke="#fff2d4" strokeWidth="1.4" {...SJ} />
      </svg>
      {/* only when every spoke is lit does the felloe take it */}
      <span className="g30-felloe absolute block" style={st({ ...d(delayMs, 660), ...box(6.6, 6.6), borderRadius: "50%", border: "2px solid rgba(203,178,122,0.95)" })} />
      {/* settle: candle smoke off the procession, away from the caster */}
      <span className="g30-mote absolute block" style={st({ ...d(delayMs, 780), ...box(0.44, 0.44, -1.1, 0.7), borderRadius: "50%", background: "#fff2d4" })} />
    </Lead>
  );
}

/* =============================================================================
   10. Court Gossip (t3) — THE DANDELION CLOCK. The stem takes a breath, and the
   whole head lets go at once: eight seeds leave on eight bearings and drift off
   the caster's side, leaving the bare receptacle and one ring of murmur.
   Palette: #cfe0a8 / #fff6dc / #232a17.
   ========================================================================== */
function DandelionClock({ role, delayMs }: SceneProps) {
  const seed = (
    <g stroke="#fff6dc" strokeWidth="1.1" fill="none" {...SJ}>
      <path d="M4 12h11" />
      <path d="M15 12l6-4M15 12l6 4M15 12l6.6 0" />
    </g>
  );
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g30-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "48%", top: "48%", width: "4%", height: "48%", background: "#cfe0a8" })} />
        <svg viewBox="0 0 24 24" className="g30-ent absolute block" style={st({ ...d(delayMs, 190), left: "20%", top: "8%", width: "60%", height: "60%" })}>
          <circle cx="12" cy="12" r="8.4" fill="none" stroke="#fff6dc" strokeWidth="0.9" strokeDasharray="1.6 2.6" />
          <circle cx="12" cy="12" r="2.6" fill="#232a17" stroke="#cfe0a8" strokeWidth="1.1" />
        </svg>
        <svg viewBox="0 0 24 24" className="g30-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "56%", top: "6%", width: "34%", height: "34%" })}>
          {seed}
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g30-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "46%", top: "50%", width: "6%", height: "46%", background: "#cfe0a8" })} />
        <svg viewBox="0 0 24 24" className="g30-hit absolute block" style={st({ ...d(delayMs, 200), left: "18%", top: "10%", width: "64%", height: "64%" })}>
          <circle cx="12" cy="12" r="9" fill="none" stroke="#fff6dc" strokeWidth="1" strokeDasharray="1.4 2.8" />
          <circle cx="12" cy="12" r="2.4" fill="#232a17" />
        </svg>
        <span className="g30-mote absolute block" style={st({ ...d(delayMs, 400), left: "58%", top: "18%", width: "14%", height: "14%", borderRadius: "50%", background: "#fff6dc" })} />
      </span>
    );
  }
  return (
    <Lead d={delayMs} imp={IMP.hx4_court_gossip} frame={<Frame base={delayMs} tone="rgba(207,224,168,0.24)" />}>
      {/* tell: the stem bends, an inhale before the word gets out */}
      <span className="g30-stem absolute block" style={st({ ...d(delayMs, 110), ...box(0.24, 3.2, 0, 1.8), background: "linear-gradient(180deg, #cfe0a8, #232a17)", transformOrigin: "50% 100%" })} />
      {/* strike: the whole head lets go, eight seeds on eight bearings */}
      {EIGHT.map((i) => (
        <Ray key={i} i={i} size={9}>
          <svg viewBox="0 0 24 24" className="g30-seed absolute block" style={st({ ...rayD(delayMs, 250, i, 38), left: "50%", top: "43%", width: "22%", height: "14%" })}>
            {seed}
          </svg>
        </Ray>
      ))}
      {/* the bare receptacle, everything said and gone */}
      <svg viewBox="0 0 24 24" className="g30-head absolute block" style={st({ ...d(delayMs, 430), ...box(1.5, 1.5) })}>
        <circle cx="12" cy="12" r="7.4" fill="none" stroke="#cfe0a8" strokeWidth="1.2" strokeDasharray="1.2 2.4" />
        <circle cx="12" cy="12" r="2.8" fill="#232a17" stroke="#fff6dc" strokeWidth="1.1" />
      </svg>
      {/* settle: one ring of murmur, then nothing */}
      <span className="g30-whisper absolute block" style={st({ ...d(delayMs, 640), ...box(5.4, 5.4), borderRadius: "50%", border: "1px solid rgba(255,246,220,0.8)" })} />
      <span className="g30-mote absolute block" style={st({ ...d(delayMs, 760), ...box(0.3, 0.3, 1.7, -0.9), borderRadius: "50%", background: "#fff6dc" })} />
    </Lead>
  );
}

/* =============================================================================
   11. Quicksilver (t3) — THE BEAD THAT TURNS THE CORNER. A channel is scribed
   the real length of the line, a mercury bead runs it, hits the elbow and goes
   off at ninety degrees, shivering off droplets as it turns.
   Palette: #b8c4cc / #fff4e2 / #1b2126.
   ========================================================================== */
function QuicksilverBead({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g30-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "54%", height: "5%", width: "56%", background: "#b8c4cc" })} />
        <span className="g30-ent absolute block" style={st({ ...d(delayMs, 190), left: "58%", top: "12%", width: "5%", height: "47%", background: "#b8c4cc" })} />
        <span className="g30-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "50%", top: "18%", width: "20%", height: "20%", borderRadius: "50%", background: "radial-gradient(circle at 34% 30%, #fff4e2, #1b2126 82%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g30-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "52%", height: "6%", width: "92%", background: "linear-gradient(90deg, transparent, #b8c4cc)" })} />
        <span className="g30-hitside absolute block" style={st({ ...d(delayMs, 200), left: "36%", top: "34%", width: "28%", height: "28%", borderRadius: "50%", background: "radial-gradient(circle at 34% 30%, #fff4e2, #1b2126 84%)" })} />
        <span className="g30-mote absolute block" style={st({ ...d(delayMs, 400), left: "60%", top: "24%", width: "10%", height: "10%", borderRadius: "50%", background: "#b8c4cc" })} />
      </span>
    );
  }
  return (
    <AimLead d={delayMs} imp={IMP.ov_quicksilver} frame={<Frame base={delayMs} tone="rgba(184,196,204,0.22)" />}>
      {/* tell: the channel is scribed, exactly as far as she may run */}
      <span className="g30-tellline absolute block" style={st({ ...d(delayMs, 110), ...lane(0.2), background: "#b8c4cc" })} />
      {/* strike: the bead runs the real length of the line (one-cell body) */}
      <svg viewBox="0 0 24 24" className="g30-run absolute block" style={st({ ...d(delayMs, 240), ...box(1, 1) })}>
        <circle cx="12" cy="12" r="5.8" fill="#b8c4cc" stroke="#1b2126" strokeWidth="1.1" />
        <circle cx="10.2" cy="9.8" r="1.9" fill="#fff4e2" />
      </svg>
      {/* the elbow: the one ninety-degree turn she is allowed */}
      <span className="g30-elbow absolute block" style={st({ ...d(delayMs, 430), ...farEnd(0.2, 3), background: "linear-gradient(180deg, rgba(184,196,204,0), #b8c4cc, rgba(184,196,204,0))" })} />
      {/* the bead goes on off the corner */}
      <span className="g30-turn absolute block" style={st({ ...d(delayMs, 500), ...farEnd(0.62, 0.62), borderRadius: "50%", background: "radial-gradient(circle at 34% 30%, #fff4e2, #1b2126 84%)" })} />
      {/* droplets shiver off the turn */}
      {FOUR.map((i) => (
        <span
          key={i}
          className="g30-split absolute block"
          style={st({ ...rayD(delayMs, 560, i, 44), ...farEnd(0.24, 0.24, i - 1.5), borderRadius: "50%", background: "#b8c4cc" })}
        />
      ))}
      {/* settle: a hairline of quicksilver left in the channel */}
      <span className="g30-mote absolute block" style={st({ ...d(delayMs, 720), ...box(0.3, 0.3, 0.8, 0.5), borderRadius: "50%", background: "#fff4e2" })} />
    </AimLead>
  );
}

/* =============================================================================
   12. Homesick Queen (t2) — THE HEARTH THAT CALLS HER BACK. Radiance in reverse:
   eight ember trails run out along the eight lines, then every one of them is
   drawn back into the hearth, and the fire swells on what it took.
   Palette: #e79b5a / #ffe6c0 / #2c1608.
   ========================================================================== */
function HearthPull({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <svg viewBox="0 0 24 24" className="g30-ent absolute block" style={st({ ...d(delayMs, 60), left: "18%", top: "18%", width: "64%", height: "64%" })}>
          <path d="M3 21V10.4L12 3l9 7.4V21z" fill="none" stroke="#e79b5a" strokeWidth="1.5" {...SJ} />
          <path d="M9.4 21v-6.2h5.2V21z" fill="#2c1608" stroke="#ffe6c0" strokeWidth="1.1" />
        </svg>
        <span className="g30-ent2 absolute block" style={st({ ...d(delayMs, 190), left: "42%", top: "60%", width: "16%", height: "22%", borderRadius: "50%", background: "radial-gradient(circle, #ffe6c0, transparent 72%)" })} />
        <span className="g30-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "46%", top: "12%", width: "8%", height: "8%", borderRadius: "50%", background: "#e79b5a" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g30-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "10%", top: "80%", height: "8%", width: "80%", background: "#2c1608" })} />
        <svg viewBox="0 0 24 24" className="g30-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "20%", width: "60%", height: "60%" })}>
          <path d="M12 3.4c3.4 3.8 5.4 6.6 5.4 9.6a5.4 5.4 0 0 1-10.8 0c0-3 2-5.8 5.4-9.6z" fill="#e79b5a" stroke="#2c1608" strokeWidth="1.1" {...SJ} />
          <path d="M12 11.4c1.6 1.8 2.4 3 2.4 4.2a2.4 2.4 0 0 1-4.8 0c0-1.2.8-2.4 2.4-4.2z" fill="#ffe6c0" />
        </svg>
        <span className="g30-mote absolute block" style={st({ ...d(delayMs, 400), left: "44%", top: "24%", width: "10%", height: "10%", borderRadius: "50%", background: "#ffe6c0" })} />
      </span>
    );
  }
  return (
    <Lead d={delayMs} imp={IMP.hx4_homesick_queen} frame={<Frame base={delayMs} tone="rgba(231,155,90,0.28)" rim="rgba(44,22,8,0.45)" />}>
      {/* tell: the hearth ring warms before anything moves */}
      <span className="g30-tellring absolute block" style={st({ ...d(delayMs, 110), ...box(3.4, 3.4), borderRadius: "50%", border: "1px solid rgba(255,230,192,0.85)" })} />
      {/* strike: eight ember trails run out, then are hauled straight back */}
      {EIGHT.map((i) => (
        <Ray key={i} i={i} size={8}>
          <span
            className="g30-emberpath absolute block"
            style={st({ ...rayD(delayMs, 250, i, 44), left: "50%", top: "48%", width: "42%", height: "4%", background: "linear-gradient(90deg, rgba(255,230,192,0.95), rgba(231,155,90,0))", transformOrigin: "0% 50%" })}
          />
        </Ray>
      ))}
      {/* the fire swells on what it called home */}
      <svg viewBox="0 0 24 24" className="g30-hearth absolute block" style={st({ ...d(delayMs, 480), ...box(2.4, 2.4) })}>
        <path d="M12 2.6c3.8 4.2 6 7.2 6 10.4a6 6 0 0 1-12 0c0-3.2 2.2-6.2 6-10.4z" fill="#e79b5a" stroke="#2c1608" strokeWidth="1.2" {...SJ} />
        <path d="M12 11c1.8 2 2.6 3.4 2.6 4.6a2.6 2.6 0 0 1-5.2 0C9.4 14.4 10.2 13 12 11z" fill="#ffe6c0" />
      </svg>
      {/* settle: sparks going up off the caster's side */}
      <span className="g30-mote absolute block" style={st({ ...d(delayMs, 660), ...box(0.34, 0.34, -0.9, -0.4), borderRadius: "50%", background: "#ffe6c0" })} />
      <span className="g30-mote absolute block" style={st({ ...d(delayMs, 770), ...box(0.26, 0.26, 1.1, 0.2), borderRadius: "50%", background: "#e79b5a" })} />
    </Lead>
  );
}

/* =============================================================================
   13. Leaky Quiver (t2) — THE ARROW THAT FALLS SHORT. The range is called down
   the real line, the arrow flies it and stops dead at four cells however far the
   line runs, and the split quiver spills the rest on the ground.
   Palette: #a8bd7d / #f6ecc9 / #232a14.
   ========================================================================== */
function LeakyQuiver({ role, delayMs }: SceneProps) {
  const arrow = (
    <g {...SJ}>
      <path d="M1 12h17" stroke="#a8bd7d" strokeWidth="2.2" />
      <path d="M17 8.4L23 12l-6 3.6z" fill="#f6ecc9" stroke="#232a14" strokeWidth="0.9" />
      <path d="M1 12l3.4-3M1 12l3.4 3" stroke="#f6ecc9" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <svg viewBox="0 0 24 24" className="g30-ent absolute block" style={st({ ...d(delayMs, 60), left: "6%", top: "28%", width: "76%", height: "44%" })}>
          {arrow}
        </svg>
        <svg viewBox="0 0 24 24" className="g30-ent2 absolute block" style={st({ ...d(delayMs, 190), left: "56%", top: "40%", width: "40%", height: "52%" })}>
          <path d="M7 3h10l-1.6 18H8.6z" fill="#232a14" stroke="#a8bd7d" strokeWidth="1.3" {...SJ} />
          <path d="M8.4 13.6l7.2 1.4" stroke="#f6ecc9" strokeWidth="1.2" />
        </svg>
        <span className="g30-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "14%", top: "76%", width: "34%", height: "5%", background: "#a8bd7d" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g30-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "48%", height: "5%", width: "92%", background: "linear-gradient(90deg, #a8bd7d, transparent)" })} />
        <svg viewBox="0 0 24 24" className="g30-hitside absolute block" style={st({ ...d(delayMs, 200), left: "10%", top: "26%", width: "76%", height: "48%" })}>
          {arrow}
        </svg>
        <span className="g30-sift absolute block" style={st({ ...d(delayMs, 400), left: "38%", top: "60%", width: "24%", height: "16%", borderRadius: "50%", background: "radial-gradient(circle, rgba(246,236,201,0.7), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <AimLead d={delayMs} imp={IMP.hx4_leaky_quiver} frame={<Frame base={delayMs} tone="rgba(168,189,125,0.24)" />}>
      {/* tell: the range she means to shoot, called the whole way */}
      <span className="g30-tellline absolute block" style={st({ ...d(delayMs, 110), ...lane(0.14), background: "#f6ecc9" })} />
      {/* strike: the arrow flies, and stops at four cells however long the line */}
      <svg viewBox="0 0 24 24" className="g30-short absolute block" style={st({ ...d(delayMs, 250), ...box(1, 0.62), filter: "drop-shadow(0 0 3px rgba(246,236,201,0.7))" })}>
        {arrow}
      </svg>
      {/* the split quiver, seam open */}
      <svg viewBox="0 0 24 24" className="g30-quiver absolute block" style={st({ ...d(delayMs, 400), ...box(1.5, 2.4, -0.6, 0.4) })}>
        <path d="M7 2.4h10l-1.8 19.2H8.8z" fill="#232a14" stroke="#a8bd7d" strokeWidth="1.4" {...SJ} />
        <path d="M8.2 12.6l7.6 1.8" stroke="#f6ecc9" strokeWidth="1.3" />
      </svg>
      {/* the rest spill out on four bearings and lie there */}
      {FOUR.map((i) => (
        <Ray key={i} i={i * 2 + 1} size={4.6}>
          <span
            className="g30-spill absolute block"
            style={st({ ...rayD(delayMs, 480, i, 56), left: "50%", top: "48.6%", width: "36%", height: "2.6%", background: "linear-gradient(90deg, #a8bd7d, rgba(35,42,20,0))", transformOrigin: "0% 50%" })}
          />
        </Ray>
      ))}
      {/* settle: dust where the arrow gave up */}
      <span className="g30-sift absolute block" style={st({ ...d(delayMs, 700), ...box(2.2, 1.2, 1.6, 0.5), borderRadius: "50%", background: "radial-gradient(circle, rgba(246,236,201,0.5), transparent 74%)" })} />
    </AimLead>
  );
}

/* =============================================================================
   14. Slippery Scepter (t2) — THE GRIP THAT GOES. The hand tightens, the scepter
   squirts out of it and tumbles, and its head throws glints away on all eight
   bearings before it clatters flat.
   Palette: #e3c05a / #fff2cf / #2a2109.
   ========================================================================== */
function SlipperyScepter({ role, delayMs }: SceneProps) {
  const scepter = (
    <g {...SJ}>
      <path d="M7 21L17 6" stroke="#e3c05a" strokeWidth="2.6" />
      <circle cx="18" cy="4.6" r="3.2" fill="#fff2cf" stroke="#2a2109" strokeWidth="1.1" />
      <path d="M9.4 17.4l3 2" stroke="#2a2109" strokeWidth="1.4" />
    </g>
  );
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <svg viewBox="0 0 24 24" className="g30-ent absolute block" style={st({ ...d(delayMs, 60), left: "18%", top: "12%", width: "64%", height: "72%" })}>
          {scepter}
        </svg>
        <span className="g30-ent2 absolute block" style={st({ ...d(delayMs, 190), left: "14%", top: "82%", height: "6%", width: "72%", background: "#2a2109" })} />
        <span className="g30-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "62%", top: "6%", width: "22%", height: "22%", borderRadius: "50%", background: "radial-gradient(circle, #fff2cf, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g30-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "16%", top: "84%", height: "6%", width: "68%", background: "#2a2109" })} />
        <svg viewBox="0 0 24 24" className="g30-hit absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "14%", width: "68%", height: "68%" })}>
          {scepter}
        </svg>
        <span className="g30-mote absolute block" style={st({ ...d(delayMs, 400), left: "66%", top: "12%", width: "12%", height: "12%", borderRadius: "50%", background: "#fff2cf" })} />
      </span>
    );
  }
  return (
    <Lead d={delayMs} imp={IMP.hx4_slippery_scepter} frame={<Frame base={delayMs} tone="rgba(227,192,90,0.26)" />}>
      {/* tell: the grip closes on it, one last time */}
      <span className="g30-grip absolute block" style={st({ ...d(delayMs, 110), ...box(1.9, 1.9, -0.5, 0.9), borderRadius: "50%", border: "3px solid rgba(255,242,207,0.8)" })} />
      {/* strike: it squirts out of the hand and tumbles */}
      <svg viewBox="0 0 24 24" className="g30-tumble absolute block" style={st({ ...d(delayMs, 250), ...box(3.2, 3.2, 0.3, -0.3) })}>
        {scepter}
      </svg>
      {/* the head throws glints on every bearing on the way past */}
      {EIGHT.map((i) => (
        <Ray key={i} i={i} size={6}>
          <span
            className="g30-glintfan absolute block"
            style={st({ ...rayD(delayMs, 380, i, 34), left: "52%", top: "48.4%", width: "30%", height: "3.2%", background: "linear-gradient(90deg, #fff2cf, rgba(227,192,90,0))", transformOrigin: "0% 50%" })}
          />
        </Ray>
      ))}
      {/* it clatters flat and stays there for a turn */}
      <span className="g30-clatter absolute block" style={st({ ...d(delayMs, 620), ...box(3, 0.3, 0.2, 1.4), background: "linear-gradient(90deg, rgba(227,192,90,0), #e3c05a, rgba(227,192,90,0))" })} />
      {/* settle: dust off the boards, away from the caster */}
      <span className="g30-sift absolute block" style={st({ ...d(delayMs, 740), ...box(2.6, 1.1, 0.2, 1.5), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,207,0.5), transparent 74%)" })} />
    </Lead>
  );
}

/* =============================================================================
   15. Matins Bell (t1) — THE BELFRY. The rope comes down, the bell swings twice,
   and the eight louvres of the tower fly open in turn so the sound leaves on
   every bearing at once. The queenside files are marked inside <BoardFrame>.
   Palette: #c3b28a / #fdf0d2 / #241f14.
   ========================================================================== */
function MatinsBell({ role, delayMs }: SceneProps) {
  const bell = (
    <g {...SJ}>
      <path d="M5.4 17.4c0-6 1.6-9.6 6.6-9.6s6.6 3.6 6.6 9.6z" fill="#c3b28a" stroke="#241f14" strokeWidth="1.2" />
      <path d="M4.2 17.4h15.6v2H4.2z" fill="#fdf0d2" />
      <circle cx="12" cy="6" r="1.8" fill="#fdf0d2" stroke="#241f14" strokeWidth="1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g30-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "47%", top: "0%", width: "6%", height: "34%", background: "#c3b28a" })} />
        <svg viewBox="0 0 24 24" className="g30-ent absolute block" style={st({ ...d(delayMs, 190), left: "22%", top: "26%", width: "56%", height: "56%" })}>
          {bell}
        </svg>
        <span className="g30-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "26%", top: "30%", width: "48%", height: "48%", borderRadius: "50%", border: "2px solid rgba(253,240,210,0.75)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g30-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "46%", top: "0%", width: "8%", height: "30%", background: "#c3b28a" })} />
        <svg viewBox="0 0 24 24" className="g30-hit absolute block" style={st({ ...d(delayMs, 200), left: "20%", top: "22%", width: "60%", height: "60%" })}>
          {bell}
        </svg>
        <span className="g30-mote absolute block" style={st({ ...d(delayMs, 400), left: "42%", top: "72%", width: "16%", height: "16%", borderRadius: "50%", background: "#fdf0d2" })} />
      </span>
    );
  }
  return (
    <Lead d={delayMs} imp={IMP.hx4_matins_bell}
      frame={
        <BoardFrame>
          <span className="g30-wash absolute inset-0 block" style={st({ ...d(delayMs, 60), background: "radial-gradient(circle at 50% 50%, rgba(195,178,138,0.24), transparent 72%)" })} />
          {/* the queenside files, a to d: half the board's width, full height,
              flipped with the caster so it is never "the left of the screen" */}
          <span
            className="absolute block"
            style={st({ left: "0%", top: "0%", width: "50%", height: "100%", transform: "translateX(calc((1 - var(--fx-side, 1)) * 50%))" })}
          >
            <span className="g30-fileband absolute inset-0 block" style={st({ ...d(delayMs, 150), background: "linear-gradient(90deg, rgba(195,178,138,0.4), transparent)" })} />
          </span>
        </BoardFrame>
      }
    >
      {/* tell: the rope drops through the ceiling */}
      <span className="g30-rope absolute block" style={st({ ...d(delayMs, 110), ...box(0.16, 3.4, 0, -1.9), background: "linear-gradient(180deg, rgba(195,178,138,0), #c3b28a)", transformOrigin: "50% 0%" })} />
      {/* strike: the bell swings, twice, building */}
      <svg viewBox="0 0 24 24" className="g30-swing absolute block" style={st({ ...d(delayMs, 260), ...box(2.6, 2.6, 0, -0.2) })}>
        {bell}
      </svg>
      {/* eight louvres fly open so the sound leaves on every bearing */}
      {EIGHT.map((i) => (
        <Ray key={i} i={i} size={6.2}>
          <span
            className="g30-louvre absolute block"
            style={st({ ...rayD(delayMs, 380, i, 40), left: "54%", top: "44%", width: "28%", height: "12%", background: "linear-gradient(90deg, #fdf0d2, rgba(195,178,138,0))", transformOrigin: "0% 50%" })}
          />
        </Ray>
      ))}
      {/* settle: one toll going out and thinning */}
      <span className="g30-toll absolute block" style={st({ ...d(delayMs, 620), ...box(4.6, 4.6), borderRadius: "50%", border: "2px solid rgba(253,240,210,0.8)" })} />
      <span className="g30-mote absolute block" style={st({ ...d(delayMs, 740), ...box(0.34, 0.34, -1.3, 0.8), borderRadius: "50%", background: "#fdf0d2" })} />
    </Lead>
  );
}

/* =============================================================================
   16. Crane Swing (t1) — THE JIB. The swing radius is scribed, the jib sweeps
   round onto the real vector, the hook runs out the whole length of it and the
   counterweight comes back the other way.
   Palette: #e0a83c / #ffeec6 / #2a1d07.
   ========================================================================== */
function CraneJib({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <svg viewBox="0 0 24 24" className="g30-ent absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "16%", width: "80%", height: "50%" })}>
          <path d="M1 8h22M1 8l4 4M6 8l4 4M11 8l4 4M16 8l4 4" stroke="#e0a83c" strokeWidth="1.4" {...SJ} />
        </svg>
        <span className="g30-ent2 absolute block" style={st({ ...d(delayMs, 190), left: "62%", top: "36%", width: "3%", height: "34%", background: "#ffeec6" })} />
        <svg viewBox="0 0 24 24" className="g30-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "54%", top: "62%", width: "24%", height: "24%" })}>
          <path d="M12 3v9a5 5 0 1 1-6 4.8" fill="none" stroke="#ffeec6" strokeWidth="2.4" {...SJ} />
        </svg>
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g30-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "30%", height: "6%", width: "92%", background: "#e0a83c" })} />
        <svg viewBox="0 0 24 24" className="g30-hitside absolute block" style={st({ ...d(delayMs, 200), left: "28%", top: "26%", width: "44%", height: "60%" })}>
          <path d="M12 2v9a5 5 0 1 1-6 4.6" fill="none" stroke="#ffeec6" strokeWidth="2.6" {...SJ} />
        </svg>
        <span className="g30-sift absolute block" style={st({ ...d(delayMs, 400), left: "36%", top: "72%", width: "28%", height: "16%", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,238,198,0.6), transparent 72%)" })} />
      </span>
    );
  }
  return (
    <AimLead d={delayMs} imp={IMP.op_crane_swing} frame={<Frame base={delayMs} tone="rgba(224,168,60,0.24)" />}>
      {/* tell: the swing radius chalked out to the far end of the line */}
      <span className="g30-tellline absolute block" style={st({ ...d(delayMs, 110), ...lane(0.12), background: "#ffeec6" })} />
      {/* strike: the jib sweeps round onto the vector, lattice and all */}
      <svg viewBox="0 0 48 8" preserveAspectRatio="none" className="g30-jib absolute block" style={st({ ...d(delayMs, 250), ...lane(0.8), transformOrigin: "0% 50%" })}>
        <path d="M0 2h48M0 6h48M0 2l6 4M6 2l6 4M12 2l6 4M18 2l6 4M24 2l6 4M30 2l6 4M36 2l6 4M42 2l6 4" stroke="#e0a83c" strokeWidth="1" {...SJ} />
      </svg>
      {/* the hook runs out the whole length of the jib */}
      <svg viewBox="0 0 24 24" className="g30-hook absolute block" style={st({ ...d(delayMs, 400), ...box(1, 1.8, 0, 0.95) })}>
        <path d="M12 1v10a5 5 0 1 1-6 4.6" fill="none" stroke="#ffeec6" strokeWidth="2.8" {...SJ} />
      </svg>
      {/* the counterweight goes the other way, as it must */}
      <span className="g30-counter absolute block" style={st({ ...d(delayMs, 470), ...box(1.1, 1.1, -1.5), background: "#2a1d07", border: "2px solid #e0a83c" })} />
      {/* settle: the load swings under the hook and steadies */}
      <span className="g30-sift absolute block" style={st({ ...d(delayMs, 660), ...box(1.8, 1, 1.4, 1.6), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,238,198,0.55), transparent 74%)" })} />
    </AimLead>
  );
}

/* =============================================================================
   17. Follow Spot (t1) — THE LANTERN. The house goes down, eight iris blades
   crank open, the cone snaps out onto the square and the pool lands. Settle:
   dust turning over inside the beam. Palette: #f6e39a / #fff8e2 / #191712.
   ========================================================================== */
function FollowSpot({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <svg viewBox="0 0 24 24" className="g30-ent absolute block" style={st({ ...d(delayMs, 60), left: "10%", top: "10%", width: "50%", height: "50%" })}>
          <rect x="4" y="6" width="14" height="12" fill="#191712" stroke="#f6e39a" strokeWidth="1.4" />
          <path d="M18 8.4l4-2.4v12l-4-2.4z" fill="#f6e39a" />
        </svg>
        <span className="g30-ent2 absolute block" style={st({ ...d(delayMs, 190), left: "40%", top: "36%", width: "56%", height: "34%", background: "linear-gradient(100deg, rgba(255,248,226,0.85), transparent 76%)" })} />
        <span className="g30-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "56%", top: "70%", width: "34%", height: "18%", borderRadius: "50%", background: "radial-gradient(ellipse, #fff8e2, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g30-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "20%", top: "0%", width: "60%", height: "56%", background: "linear-gradient(180deg, rgba(246,227,154,0.75), transparent)" })} />
        <span className="g30-hit absolute block" style={st({ ...d(delayMs, 200), left: "22%", top: "52%", width: "56%", height: "30%", borderRadius: "50%", background: "radial-gradient(ellipse, #fff8e2, rgba(246,227,154,0) 72%)" })} />
        <span className="g30-mote absolute block" style={st({ ...d(delayMs, 400), left: "46%", top: "40%", width: "8%", height: "8%", borderRadius: "50%", background: "#fff8e2" })} />
      </span>
    );
  }
  return (
    <Lead d={delayMs} imp={IMP.op_follow_spot} frame={<Frame base={delayMs} tone="rgba(25,23,18,0.62)" rim="rgba(246,227,154,0.3)" />}>
      {/* tell: eight iris blades crank open around the lamp */}
      {EIGHT.map((i) => (
        <Ray key={i} i={i} size={3.2}>
          <span
            className="g30-blade absolute block"
            style={st({ ...rayD(delayMs, 100, i, 22), left: "44%", top: "40%", width: "34%", height: "20%", background: "#191712", border: "1px solid #f6e39a", transformOrigin: "0% 50%" })}
          />
        </Ray>
      ))}
      {/* strike: the cone snaps out and finds her */}
      <span className="g30-cone absolute block" style={st({ ...d(delayMs, 330), ...box(4.4, 5, 0, -2), background: "linear-gradient(180deg, rgba(255,248,226,0.85), rgba(246,227,154,0))", clipPath: "polygon(42% 0%, 58% 0%, 100% 100%, 0% 100%)", transformOrigin: "50% 0%" })} />
      {/* the pool lands on the boards */}
      <span className="g30-pool absolute block" style={st({ ...d(delayMs, 430), ...box(3.2, 1.6, 0, 0.6), borderRadius: "50%", background: "radial-gradient(ellipse, rgba(255,248,226,0.9), rgba(246,227,154,0) 72%)" })} />
      {/* the gobo edge sharpens once */}
      <span className="g30-gobo absolute block" style={st({ ...d(delayMs, 560), ...box(3.4, 1.7, 0, 0.6), borderRadius: "50%", border: "2px solid rgba(246,227,154,0.9)" })} />
      {/* settle: dust turning over inside the beam */}
      <span className="g30-mote absolute block" style={st({ ...d(delayMs, 700), ...box(0.28, 0.28, -0.6, -0.5), borderRadius: "50%", background: "#fff8e2" })} />
      <span className="g30-mote absolute block" style={st({ ...d(delayMs, 790), ...box(0.22, 0.22, 0.7, -1), borderRadius: "50%", background: "#f6e39a" })} />
    </Lead>
  );
}

/* =============================================================================
   18. Painter's Lift (t1) — THE CRADLE. A plumb line drops the length of the
   run, the rope pays out, the cradle rides straight up the vector past whatever
   is in the way, and the brush flicks off a few drops.
   Palette: #8fb2a0 / #fdf2d6 / #1a2620.
   ========================================================================== */
function PaintersLift({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <span className="g30-ent2 absolute block" style={st({ ...d(delayMs, 60), left: "48%", top: "2%", width: "4%", height: "56%", background: "#8fb2a0" })} />
        <svg viewBox="0 0 24 24" className="g30-ent absolute block" style={st({ ...d(delayMs, 190), left: "18%", top: "50%", width: "64%", height: "36%" })}>
          <path d="M2 8h20v10H2z" fill="#1a2620" stroke="#8fb2a0" strokeWidth="1.4" />
          <path d="M6 8V3M18 8V3" stroke="#fdf2d6" strokeWidth="1.2" {...SJ} />
        </svg>
        <span className="g30-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "62%", top: "76%", width: "12%", height: "16%", borderRadius: "50%", background: "#fdf2d6" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g30-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "4%", top: "48%", height: "4%", width: "92%", background: "#8fb2a0" })} />
        <svg viewBox="0 0 24 24" className="g30-hitside absolute block" style={st({ ...d(delayMs, 200), left: "16%", top: "28%", width: "68%", height: "44%" })}>
          <path d="M2 8h20v9H2z" fill="#1a2620" stroke="#8fb2a0" strokeWidth="1.5" />
          <path d="M6 8V2.6M18 8V2.6" stroke="#fdf2d6" strokeWidth="1.3" {...SJ} />
        </svg>
        <span className="g30-mote absolute block" style={st({ ...d(delayMs, 400), left: "46%", top: "72%", width: "10%", height: "14%", borderRadius: "50%", background: "#fdf2d6" })} />
      </span>
    );
  }
  return (
    <AimLead d={delayMs} imp={IMP.op_painters_lift} frame={<Frame base={delayMs} tone="rgba(143,178,160,0.24)" />}>
      {/* tell: the plumb line, dropped the whole length of the run */}
      <span className="g30-tellline absolute block" style={st({ ...d(delayMs, 110), ...lane(0.1), background: "#fdf2d6" })} />
      {/* the rope pays out exactly as far as she is going */}
      <span className="g30-rope2 absolute block" style={st({ ...d(delayMs, 220), ...lane(0.22, -0.5), background: "linear-gradient(90deg, #8fb2a0, rgba(143,178,160,0.2))" })} />
      {/* strike: the cradle rides the vector, straight past the obstruction */}
      <svg viewBox="0 0 24 24" className="g30-run absolute block" style={st({ ...d(delayMs, 300), ...box(1, 0.74) })}>
        <path d="M1.6 8.4h20.8v9.2H1.6z" fill="#1a2620" stroke="#8fb2a0" strokeWidth="1.4" />
        <path d="M5.4 8.4V2M18.6 8.4V2" stroke="#fdf2d6" strokeWidth="1.3" {...SJ} />
      </svg>
      {/* the brush flicks off four bearings of paint */}
      {FOUR.map((i) => (
        <Ray key={i} i={i * 2} size={4}>
          <span
            className="g30-flick absolute block"
            style={st({ ...rayD(delayMs, 470, i, 50), left: "52%", top: "47%", width: "26%", height: "6%", background: "linear-gradient(90deg, #fdf2d6, rgba(143,178,160,0))", transformOrigin: "0% 50%" })}
          />
        </Ray>
      ))}
      {/* settle: one drip going the way gravity says, away from the caster */}
      <span className="g30-sift absolute block" style={st({ ...d(delayMs, 690), ...box(0.4, 0.9, 0.8, 1), borderRadius: "50%", background: "#fdf2d6" })} />
    </AimLead>
  );
}

/* =============================================================================
   19. Parasol Bearer (t1) — THE PARASOL. The bearer's shadow arrives, the eight
   ribs snap open one after another, the canopy tautens over her and the rain
   runs off the rim away from the caster.
   Palette: #e88fa2 / #fff1dd / #2c1520.
   ========================================================================== */
function ParasolRibs({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <svg viewBox="0 0 24 24" className="g30-ent absolute block" style={st({ ...d(delayMs, 60), left: "12%", top: "18%", width: "76%", height: "48%" })}>
          <path d="M1.4 14C1.4 7.4 6.2 3 12 3s10.6 4.4 10.6 11z" fill="#e88fa2" stroke="#2c1520" strokeWidth="1.2" {...SJ} />
          <path d="M1.4 14c2.6-2.4 5.2-2.4 7.6 0 2.4-2.4 4.6-2.4 6.6 0 2-2.4 4.4-2.4 7 0" fill="none" stroke="#fff1dd" strokeWidth="1.1" />
        </svg>
        <span className="g30-ent2 absolute block" style={st({ ...d(delayMs, 190), left: "48%", top: "48%", width: "4%", height: "44%", background: "#2c1520" })} />
        <span className="g30-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "18%", top: "70%", width: "8%", height: "12%", borderRadius: "50%", background: "#fff1dd" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g30-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "46%", top: "46%", width: "8%", height: "50%", background: "#2c1520" })} />
        <svg viewBox="0 0 24 24" className="g30-hit absolute block" style={st({ ...d(delayMs, 200), left: "8%", top: "16%", width: "84%", height: "50%" })}>
          <path d="M1 14C1 7 6 2.4 12 2.4S23 7 23 14z" fill="#e88fa2" stroke="#2c1520" strokeWidth="1.3" {...SJ} />
          <path d="M1 14c2.8-2.6 5.4-2.6 8 0 2.6-2.6 5-2.6 7 0" fill="none" stroke="#fff1dd" strokeWidth="1.2" />
        </svg>
        <span className="g30-sift absolute block" style={st({ ...d(delayMs, 400), left: "16%", top: "62%", width: "10%", height: "16%", borderRadius: "50%", background: "#fff1dd" })} />
      </span>
    );
  }
  return (
    <Lead d={delayMs} imp={IMP.op_parasol_bearer} frame={<Frame base={delayMs} tone="rgba(232,143,162,0.26)" />}>
      {/* tell: the bearer's shadow reaches the square first */}
      <span className="g30-tell absolute block" style={st({ ...d(delayMs, 110), ...box(3.2, 1, 0, 1.5), background: "radial-gradient(ellipse, rgba(44,21,32,0.8), transparent 72%)" })} />
      {/* strike: the eight ribs snap open, one after another */}
      {EIGHT.map((i) => (
        <Ray key={i} i={i} size={5.4}>
          <span
            className="g30-rib absolute block"
            style={st({ ...rayD(delayMs, 240, i, 40), left: "50%", top: "48.4%", width: "44%", height: "3.2%", background: "linear-gradient(90deg, #2c1520, #e88fa2)", transformOrigin: "0% 50%" })}
          />
        </Ray>
      ))}
      {/* the canopy tautens over her */}
      <svg viewBox="0 0 24 24" className="g30-canopy absolute block" style={st({ ...d(delayMs, 450), ...box(5.2, 3, 0, -0.5) })}>
        <path d="M0.6 16C0.6 7.6 5.8 2.6 12 2.6S23.4 7.6 23.4 16z" fill="rgba(232,143,162,0.85)" stroke="#2c1520" strokeWidth="1.2" {...SJ} />
        <path d="M0.6 16c3-2.8 5.8-2.8 8.4 0 2.6-2.8 5.4-2.8 7.8 0 2.4-2.8 4.6-2.8 6.6 0" fill="none" stroke="#fff1dd" strokeWidth="1.1" />
      </svg>
      {/* the shaft plants */}
      <span className="g30-shaft absolute block" style={st({ ...d(delayMs, 560), ...box(0.2, 2.4, 0, 1.1), background: "#2c1520", transformOrigin: "50% 0%" })} />
      {/* settle: three drips running off the rim, away from the caster */}
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="g30-sift absolute block"
          style={st({ ...rayD(delayMs, 680, i, 70), ...box(0.24, 0.5, i * 2.2 - 2.2, 0.6), borderRadius: "50%", background: "#fff1dd" })}
        />
      ))}
    </Lead>
  );
}

/* =============================================================================
   20. Portrait of a Lady (t1) — THE FLASH. The gilt oval swings in, the powder
   tray takes, and an eight-point star flare goes off her all at once. Settle:
   magnesium smoke lifting off the caster's side.
   Palette: #c98fa8 / #fff2e0 / #241722.
   ========================================================================== */
function PortraitFlash({ role, delayMs }: SceneProps) {
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <svg viewBox="0 0 24 24" className="g30-ent absolute block" style={st({ ...d(delayMs, 60), left: "22%", top: "12%", width: "56%", height: "72%" })}>
          <ellipse cx="12" cy="12" rx="9.6" ry="11.2" fill="#241722" stroke="#c98fa8" strokeWidth="1.8" />
          <path d={LADY} fill="#fff2e0" transform="translate(4.2 3.6) scale(0.66)" />
        </svg>
        <span className="g30-ent2 absolute block" style={st({ ...d(delayMs, 190), left: "6%", top: "22%", width: "18%", height: "12%", background: "#c98fa8" })} />
        <span className="g30-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "8%", top: "10%", width: "22%", height: "22%", borderRadius: "50%", background: "radial-gradient(circle, #fff2e0, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g30-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "8%", top: "8%", width: "84%", height: "84%", border: "3px solid #c98fa8" })} />
        <svg viewBox="0 0 24 24" className="g30-hit absolute block" style={st({ ...d(delayMs, 200), left: "24%", top: "16%", width: "52%", height: "68%" })}>
          <path d={LADY} fill="#fff2e0" stroke="#241722" strokeWidth="0.9" {...SJ} />
        </svg>
        <span className="g30-mote absolute block" style={st({ ...d(delayMs, 400), left: "12%", top: "14%", width: "16%", height: "16%", borderRadius: "50%", background: "#c98fa8" })} />
      </span>
    );
  }
  return (
    <Lead d={delayMs} imp={IMP.op_portrait_of_a_lady} frame={<Frame base={delayMs} tone="rgba(201,143,168,0.26)" rim="rgba(36,23,34,0.5)" />}>
      {/* tell: the gilt oval swings in on its wire */}
      <svg viewBox="0 0 24 24" className="g30-oval absolute block" style={st({ ...d(delayMs, 110), ...box(3.4, 4) })}>
        <ellipse cx="12" cy="12" rx="10" ry="11.4" fill="rgba(36,23,34,0.9)" stroke="#c98fa8" strokeWidth="2" />
        <path d={LADY} fill="#fff2e0" transform="translate(4.2 3.4) scale(0.66)" />
      </svg>
      {/* the powder tray takes */}
      <span className="g30-pan absolute block" style={st({ ...d(delayMs, 320), ...box(1.2, 0.4, -2.2, -1.4), background: "linear-gradient(90deg, #241722, #c98fa8)" })} />
      {/* strike: the flare goes off her on all eight bearings at once */}
      {EIGHT.map((i) => (
        <Ray key={i} i={i} size={7.6}>
          <span
            className="g30-flare absolute block"
            style={st({ ...rayD(delayMs, 400, i, 12), left: "50%", top: "48.8%", width: "48%", height: "2.4%", background: "linear-gradient(90deg, #fff2e0, rgba(201,143,168,0))", transformOrigin: "0% 50%" })}
          />
        </Ray>
      ))}
      {/* settle: magnesium smoke lifting off the caster's side */}
      <span className="g30-smoke absolute block" style={st({ ...d(delayMs, 640), ...box(2.6, 1.6, -2, -1.4), borderRadius: "50%", background: "radial-gradient(circle, rgba(255,242,224,0.55), transparent 72%)" })} />
      <span className="g30-mote absolute block" style={st({ ...d(delayMs, 760), ...box(0.3, 0.3, -1.4, -2), borderRadius: "50%", background: "#c98fa8" })} />
    </Lead>
  );
}

/* =============================================================================
   21. Queen's Holiday (t1) — THE SUNGLASSES. A deckchair unfolds, the shades
   come down on her nose, eight rays of glorious consequence crank out on eight
   bearings, and then droop, because this changes nothing at all.
   Palette: #61d0a8 / #fff6d4 / #143026.
   ========================================================================== */
function HolidayShades({ role, delayMs }: SceneProps) {
  const shades = (
    <g {...SJ}>
      <path d="M1.6 8.4h20.8v2.2H1.6z" fill="#143026" />
      <path d="M2.6 10.6h8.2l-1 5.4H5.2zM13.2 10.6h8.2l-2 5.4h-4.6z" fill="#61d0a8" stroke="#143026" strokeWidth="1.1" />
    </g>
  );
  if (role === "entrance") {
    return (
      <span className={ROOT}>
        <svg viewBox="0 0 24 24" className="g30-ent absolute block" style={st({ ...d(delayMs, 60), left: "8%", top: "30%", width: "84%", height: "40%" })}>
          {shades}
        </svg>
        <span className="g30-ent2 absolute block" style={st({ ...d(delayMs, 190), left: "14%", top: "74%", height: "6%", width: "72%", background: "#143026" })} />
        <span className="g30-ent3 absolute block" style={st({ ...d(delayMs, 430), left: "38%", top: "6%", width: "24%", height: "24%", borderRadius: "50%", background: "radial-gradient(circle, #fff6d4, transparent 70%)" })} />
      </span>
    );
  }
  if (role === "target") {
    return (
      <span className={ROOT}>
        <span className="g30-hit2 absolute block" style={st({ ...d(delayMs, 40), left: "10%", top: "76%", height: "7%", width: "80%", background: "#143026" })} />
        <svg viewBox="0 0 24 24" className="g30-hit absolute block" style={st({ ...d(delayMs, 200), left: "8%", top: "28%", width: "84%", height: "44%" })}>
          {shades}
        </svg>
        <span className="g30-mote absolute block" style={st({ ...d(delayMs, 400), left: "44%", top: "16%", width: "12%", height: "12%", borderRadius: "50%", background: "#fff6d4" })} />
      </span>
    );
  }
  return (
    <Lead d={delayMs} imp={IMP.op_queens_holiday} frame={<Frame base={delayMs} tone="rgba(97,208,168,0.24)" />}>
      {/* tell: the deckchair unfolds, which takes a moment */}
      <svg viewBox="0 0 24 24" className="g30-chair absolute block" style={st({ ...d(delayMs, 110), ...box(2.6, 2.2, -1.9, 1.2) })}>
        <path d="M3 21L9 5M21 21L11 9M6 13h12" fill="none" stroke="#143026" strokeWidth="2.2" {...SJ} />
        <path d="M8.6 6.4l10 8.4" stroke="#61d0a8" strokeWidth="2.6" {...SJ} />
      </svg>
      {/* strike: the shades come down on her nose */}
      <svg viewBox="0 0 24 24" className="g30-shades absolute block" style={st({ ...d(delayMs, 270), ...box(3.6, 1.8) })}>
        {shades}
      </svg>
      {/* eight rays of glorious consequence go out on eight bearings */}
      {EIGHT.map((i) => (
        <Ray key={i} i={i} size={7.2}>
          <span
            className="g30-sunray absolute block"
            style={st({ ...rayD(delayMs, 380, i, 30), left: "52%", top: "48%", width: "40%", height: "4%", background: "linear-gradient(90deg, #fff6d4, rgba(97,208,168,0))", transformOrigin: "0% 50%" })}
          />
        </Ray>
      ))}
      {/* and then sag, because nothing at all has happened */}
      <span className="g30-fizz absolute block" style={st({ ...d(delayMs, 640), ...box(4.4, 4.4), borderRadius: "50%", border: "2px solid rgba(97,208,168,0.7)" })} />
      {/* settle: one very relaxed mote */}
      <span className="g30-mote absolute block" style={st({ ...d(delayMs, 770), ...box(0.34, 0.34, 1.5, 0.4), borderRadius: "50%", background: "#fff6d4" })} />
    </Lead>
  );
}

/* =============================================================================
   Registry — scene + config per card id. Every `sound` is an existing
   SigSoundKey, `source` is named only on the one card that really does leave a
   shield zone on a piece that stays on the board, and every card declares its
   anchor.
   ========================================================================== */

function S(Render: SigPlugin["Render"], config: SigPlugin["config"]): SigPlugin {
  return { config, Render };
}

export const PLAYS: Record<string, SigPlugin> = {
  // --- Tier 8 ---
  bn4_return_of_the_queen: S(LighthouseLens, {
    ordering: "octagon", staggerMs: 60, victims: "all", hasLead: true, sound: "coronation", anchor: "cast",
  }),

  // --- Tier 7 ---
  bn4_harbor_queen: S(HarborOars, {
    ordering: "line", staggerMs: 55, victims: ["q"], hasLead: true, sound: "colossus", anchor: "aim",
  }),

  // --- Tier 6 ---
  hx4_gilded_cage: S(GildedCage, {
    ordering: "octagon", staggerMs: 60, victims: ["q"], hasLead: true, sound: "siege", anchor: "board",
  }),

  // --- Tier 5 ---
  bn4_glass_case: S(GlassVitrine, {
    ordering: "octagon", staggerMs: 55, victims: ["q"], hasLead: true, sound: "cathedral", source: "shield", anchor: "cast",
  }),
  hx4_quicksand_quarter: S(SandFountain, {
    ordering: "sweep", staggerMs: 50, victims: "all", hasLead: true, sound: "siege", anchor: "cast",
  }),
  hx4_widows_veil: S(WidowsVeil, {
    ordering: "radial", staggerMs: 60, victims: ["q"], hasLead: true, sound: "cathedral", anchor: "cast",
  }),

  // --- Tier 4 ---
  hx4_doting_retinue: S(ThreadHub, {
    ordering: "octagon", staggerMs: 55, victims: "all", hasLead: true, sound: "siege", anchor: "cast",
  }),

  // --- Tier 3 ---
  bn4_danger_sense: S(CompassRose, {
    ordering: "line", staggerMs: 45, victims: "all", hasLead: true, sound: "blitz", anchor: "board",
  }),
  bn4_slow_procession: S(ProcessionWheel, {
    ordering: "radial", staggerMs: 70, victims: ["q"], hasLead: true, sound: "cathedral", anchor: "board",
  }),
  hx4_court_gossip: S(DandelionClock, {
    ordering: "octagon", staggerMs: 45, victims: "all", hasLead: true, sound: "blitz", anchor: "board",
  }),
  ov_quicksilver: S(QuicksilverBead, {
    ordering: "line", staggerMs: 50, victims: ["q"], hasLead: true, sound: "blitz", anchor: "aim",
  }),

  // --- Tier 2 ---
  hx4_homesick_queen: S(HearthPull, {
    ordering: "radial", staggerMs: 55, victims: ["q"], hasLead: true, sound: "cathedral", anchor: "cast",
  }),
  hx4_leaky_quiver: S(LeakyQuiver, {
    ordering: "line", staggerMs: 50, victims: ["q"], hasLead: true, sound: "siege", anchor: "board",
  }),
  hx4_slippery_scepter: S(SlipperyScepter, {
    ordering: "radial", staggerMs: 55, victims: ["q"], hasLead: true, sound: "crownrain", anchor: "cast",
  }),

  // --- Tier 1 ---
  hx4_matins_bell: S(MatinsBell, {
    ordering: "sweep", staggerMs: 50, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast",
  }),
  op_crane_swing: S(CraneJib, {
    ordering: "line", staggerMs: 50, victims: ["q"], hasLead: true, sound: "siege", anchor: "aim",
  }),
  op_follow_spot: S(FollowSpot, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "blitz", anchor: "board",
  }),
  op_painters_lift: S(PaintersLift, {
    ordering: "line", staggerMs: 50, victims: ["q"], hasLead: true, sound: "siege", anchor: "aim",
  }),
  op_parasol_bearer: S(ParasolRibs, {
    ordering: "octagon", staggerMs: 50, victims: ["q"], hasLead: true, sound: "crownrain", anchor: "cast",
  }),
  op_portrait_of_a_lady: S(PortraitFlash, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "blitz", anchor: "board",
  }),
  op_queens_holiday: S(HolidayShades, {
    ordering: "radial", staggerMs: 45, victims: ["q"], hasLead: true, sound: "blitz", anchor: "board",
  }),
};
