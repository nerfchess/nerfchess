// Curse-wave plugin signatures — flagships for the hex expansion batch
// (src/engine/buffs/hexes/wave2.ts). Same registry contract as the other
// plugin modules (see sigPlugins.tsx): self-contained render art, own CSS
// (cursePlays.css), transform/opacity only, no imports from
// BoardEffects.tsx. Every entry must be a bespoke scene or a template +
// per-card flourish with real per-flourish dressing — the animation audit
// (npm run test:animations) fails shared flagships that grow the committed
// baseline.
//
// FIVE TEMPLATES, each parameterised by { palette, glyph } and dressed by a
// per-card flourish key:
//   HexBrand     — a smoking witch-seal slams flat onto the board and sears
//                  a scorch ring outward (marks, contracts, tallies)
//   OmenBell     — a spectral bell descends and rocks; toll ripples wash out
//                  from its mouth (countdowns, rhythms, delayed dooms)
//   BlightGarden — rot spreads tile by tile from a struck point while weeds
//                  sprout from the seams (cursed and remembering ground)
//   ChainWeb     — spectral chains whip across the board and cinch to a
//                  shackle ring (binds, compulsions, ransoms)
//   MidasVeil    — a gilded veil sweeps the ranks and figures gild one by
//                  one where it passes (transferring / accumulating marks)
// plus SIX fully bespoke scenes for the tier 7–8 flagships (Death Knell,
// The Hollow Crown, Tide of Ash, Crown of Thorns, Pauper's Crown, Beacon of
// Woe). The CARD -> TEMPLATE / PALETTE / GLYPH table is the PLAYS registry
// at the bottom of this file.

// STAGING. Every card declares an anchor, so a hex happens where it was
// actually laid. `Stage` is the shared <BoardWideStage>, which clamps itself
// over the board from --fx-anchor-dx/dy; anything that means THE BOARD (the
// curse-light wash) renders inside <BoardFrame> so it stays exact at any
// anchor. Cards that bind or drag NAMED pieces are `anchor: "aim"` and lay a
// travelling chain down the real source -> target vector: <ChainLeg> carries
// AimStage's own `fx-aim` rotation and is the ONLY thing that gets it, because
// an upright subject rotated onto the vector would lie on its side.
//
// Geometry reaches the art through cursePlays.css: cwp-rise climbs out of the
// VICTIM's edge (--fx-side), cwp-pop lands leaning from it, cwp-settle drifts
// away from the board centre (--fx-ox/--fx-oy), cwp-beam and cwp-lash reach by
// --fx-len, and cwp-chain/cwp-chainlink are sized by --fx-len outright.

import "./cursePlays.css";

import type { ComponentType, CSSProperties, ReactNode } from "react";
import type { SigPlugin, SigRole } from "./sigPlugins";
import { LaserStrike, PieceShatter, QUAKE_CLASS, Shockwave, impactVars } from "./impact/impact";
import { BoardFrame, BoardWideStage } from "./stage";

/* =============================================================================
   Shared bits
   ========================================================================== */

type Palette = [string, string, string];

interface TemplateProps {
  palette: Palette;
  glyph: ReactNode;
  lead: boolean;
  role: SigRole;
  delayMs: number;
  /** Per-card structural flourish key: every card using a shared template
   * carries one, and every key has a dedicated dressing block below. */
  flourish?: string;
  /** Set for `anchor: "aim"` cards: drag the chain down the real
   * source -> target vector as well as playing the template's own beats. */
  aim?: boolean;
}

/** hex "#rrggbb" -> rgba() at the given alpha (glow fills, gradients). */
function tint(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const SJ = { strokeLinejoin: "round", strokeLinecap: "round" } as const;

/** The oversized-clipped board-wide stage (the overlay mounts inside ONE
 * square; this canvas is ~14 squares wide, anchored on the cast square and
 * clamping itself over the board — see stage.tsx).
 *
 * FLAGSHIP WAVE: `quakeAtMs` jolts the whole in-scene stage on the working's
 * impact beat (the shared impact vocabulary's QUAKE_CLASS — in-scene only,
 * never the real board crop). Every template and bespoke scene passes its own
 * strike time, so a hex now lands with weight instead of merely appearing. */
function Stage({ children, quakeAtMs }: { children: ReactNode; quakeAtMs?: number }) {
  return (
    <BoardWideStage>
      {quakeAtMs == null ? (
        children
      ) : (
        <span className={`cwp-quakebox ${QUAKE_CLASS} absolute inset-0 block`} style={impactVars(undefined, quakeAtMs / 1000)}>
          {children}
        </span>
      )}
    </BoardWideStage>
  );
}

/** hex "#rrggbb" -> "r g b" (the impact vocabulary's --imp-rgb format). */
function rgbOf(hex: string): string {
  return `${parseInt(hex.slice(1, 3), 16)} ${parseInt(hex.slice(3, 5), 16)} ${parseInt(hex.slice(5, 7), 16)}`;
}

/** FLAGSHIP WAVE: one composed violence cell from the shared impact
 * vocabulary — the descending laser column, the struck piece splitting in
 * half with shard spray, the ground shockwave — parked over the flourish's
 * own action so the hit lands where the card's story happens. The laser leads
 * ~0.4s ahead of the impact beat (see the .cwp-impact rule in cursePlays.css);
 * everything else lands ON the beat, so the composite reads as one strike. */
interface ImpactSpec {
  l: number;
  t: number;
  s: number;
  /** impact-beat offset from the scene's own delayMs, in ms */
  at: number;
  laser?: true;
  /** shatter this chessman in half on the beat */
  man?: keyof typeof CHESSMAN;
  shock?: true;
}
function ImpactCell({ spec, rgb, delayMs }: { spec: ImpactSpec; rgb: string; delayMs: number }) {
  return (
    <span
      className="cwp-impact absolute block"
      style={{ left: `${spec.l}%`, top: `${spec.t}%`, width: `${spec.s}%`, height: `${spec.s}%`, ...impactVars(rgb, (delayMs + spec.at) / 1000) }}
    >
      {spec.laser && <LaserStrike />}
      {spec.man && <PieceShatter glyph={<Man kind={spec.man} fill={`rgb(${rgb})`} stroke="#1c1018" />} />}
      {spec.shock && <Shockwave />}
    </span>
  );
}

/** Per-card impact accents, keyed by flourish. Every template card gets its
 * OWN composition (type, placement, beat) on top of its template signature
 * and flourish, so no two siblings land the same hit: a laser for workings
 * that strike from above, a shatter for workings that break a piece, a bare
 * shockwave for workings that press or bind. Positions sit on each
 * flourish's existing action. */
const FLOURISH_IMPACT: Record<string, ImpactSpec> = {
  /* HexBrand */
  veto: { l: 33, t: 40, s: 12, at: 700, laser: true, shock: true }, // the warding bolt slaps the striker back
  longroad: { l: 60, t: 52, s: 12, at: 1150, shock: true }, // the road's far end thumps as the knight lands
  bloodprice: { l: 44, t: 56, s: 13, at: 680, laser: true, shock: true }, // the collector's due hammers the ledger
  tarnish: { l: 43, t: 14, s: 14, at: 620, laser: true, man: "q", shock: true }, // the fresh queen is lasered and split
  rations: { l: 55, t: 58, s: 12, at: 980, shock: true }, // the refused chit is struck through with a thud
  stacked: { l: 42, t: 34, s: 16, at: 800, shock: true }, // each stacked ring compounds the ground blow
  wrongfoot: { l: 44, t: 54, s: 13, at: 760, shock: true }, // the forced step lands off-balance, hard
  overexert: { l: 44, t: 52, s: 14, at: 820, man: "r", shock: true }, // the overworked rook cracks clean in half
  tollroad: { l: 51, t: 56, s: 12, at: 900, laser: true, shock: true }, // the toll stamp drops like a gate
  bloodlust: { l: 58, t: 54, s: 14, at: 900, man: "p", shock: true }, // the compelled queen's next victim bursts
  exile: { l: 60, t: 44, s: 12, at: 1100, laser: true }, // the far border beam marks the exile line
  debtor: { l: 36, t: 52, s: 13, at: 820, shock: true }, // each tally lands like a dropped weight
  coronationtax: { l: 58, t: 54, s: 12, at: 940, laser: true, shock: true }, // the tax bolt arcs to the frozen piece
  pilgrimage: { l: 60, t: 46, s: 13, at: 780, laser: true }, // shrine light hammers down on the destination
  bounty: { l: 44, t: 50, s: 14, at: 960, man: "r", shock: true }, // the marked hunter shatters under its own price
  feedingfrenzy: { l: 42, t: 40, s: 16, at: 850, shock: true }, // the cinching rings slam tighter
  /* OmenBell */
  omen: { l: 42, t: 20, s: 13, at: 740, shock: true }, // the belfry bursts as the crows explode out
  halfmeasure: { l: 44, t: 60, s: 12, at: 940, shock: true }, // the loud beat of the metronome lands
  midnight: { l: 61, t: 24, s: 15, at: 1240, laser: true, shock: true }, // the midnight strike lasers the clock face
  toil: { l: 61, t: 54, s: 13, at: 880, man: "r", shock: true }, // the overloaded rook buckles and splits
  slowpoison: { l: 54, t: 46, s: 13, at: 1000, shock: true }, // the dose lands with a soft, awful thump
  jammedgate: { l: 51, t: 42, s: 14, at: 900, laser: true, shock: true }, // the portcullis slams down a light-column
  powderkeg: { l: 44, t: 50, s: 16, at: 1080, shock: true }, // the keg's preview blast rocks the ground
  collapse: { l: 44, t: 54, s: 15, at: 780, man: "n", shock: true }, // a piece goes down with the caving floor
  doomedvow: { l: 43, t: 42, s: 13, at: 1000, laser: true }, // the axe-light falls on the condemned
  /* BlightGarden */
  footprints: { l: 47, t: 62, s: 12, at: 920, shock: true }, // each print ices shut with a crack
  creep: { l: 60, t: 44, s: 12, at: 1120, shock: true }, // the outrider tile bites into fresh ground
  gravebloom: { l: 56, t: 52, s: 13, at: 780, laser: true }, // grave-light pillars over the rising mound
  stormwall: { l: 55, t: 22, s: 14, at: 1120, laser: true, shock: true }, // the first lightning column strikes the crest
  sentry: { l: 42, t: 54, s: 13, at: 1020, shock: true }, // the pacing tile stomps its beat
  mire: { l: 44, t: 46, s: 14, at: 900, shock: true }, // the bog's heart gulps with a wet thud
  miasma: { l: 53, t: 50, s: 13, at: 1100, man: "n", shock: true }, // the third dose splits the sickened knight
  maw: { l: 55, t: 50, s: 14, at: 1000, man: "r", shock: true }, // the void's meal is torn in half
  wildfire: { l: 46, t: 46, s: 14, at: 940, laser: true, shock: true }, // the fire-column jumps piece to piece
  effigy: { l: 44, t: 40, s: 14, at: 820, laser: true }, // dread-light hammers the effigy's post
  avalanche: { l: 50, t: 52, s: 16, at: 1060, shock: true }, // the slide slams into the sealed squares
  /* ChainWeb */
  twin: { l: 62, t: 58, s: 13, at: 940, shock: true }, // the sympathetic jerk cracks the far square
  noreins: { l: 62, t: 26, s: 13, at: 960, shock: true }, // the runaway rook blows through its post
  recoil: { l: 46, t: 60, s: 13, at: 920, man: "b", shock: true }, // the recoiling bishop splinters mid-flight
  ransom: { l: 30, t: 62, s: 13, at: 900, laser: true, shock: true }, // the surety chains hammer down on the pawns
  courtlock: { l: 30, t: 55, s: 14, at: 940, laser: true, shock: true }, // the padlock drops in a column of light
  bindingoath: { l: 46, t: 58, s: 13, at: 1060, shock: true }, // the oath-knot cinches with a ground blow
  bloodbond: { l: 62, t: 58, s: 13, at: 1080, shock: true }, // the sympathetic freeze lands on the partner
  sharedfate: { l: 62, t: 58, s: 14, at: 1040, man: "r", shock: true }, // the bound twin shatters where it stands
  kingsguard: { l: 56, t: 54, s: 13, at: 1000, laser: true }, // the guard-light pins the nearest piece
  noretreat: { l: 42, t: 44, s: 13, at: 880, shock: true }, // the taut rein snaps the deserter back HARD
  /* MidasVeil */
  coin: { l: 60, t: 34, s: 13, at: 1100, laser: true, shock: true }, // the cursed coin lands like a meteor
  gilded: { l: 44, t: 42, s: 14, at: 1000, shock: true }, // the gold sickness sets with a heavy pulse
  fifthcolumn: { l: 54, t: 36, s: 13, at: 800, laser: true }, // the turncoat's new colors sear down onto it
  handeddown: { l: 60, t: 36, s: 13, at: 1020, shock: true }, // the inherited curse lands on the next bearer
  mutiny: { l: 34, t: 36, s: 14, at: 940, man: "n", shock: true }, // the mutineer breaks its old allegiance apart
  sleeper: { l: 42, t: 38, s: 13, at: 1020, laser: true, shock: true }, // the wake-signal spears the sleeper cell
  agingblade: { l: 42, t: 36, s: 14, at: 860, man: "q", shock: true }, // the queen's old self shears away in halves
};

/** Full-board curse-light wash. Inside <BoardFrame>, so it is exactly the
 * board at any anchor rather than a fixed slice of a canvas that has moved. */
function Wash({ color, delayMs }: { color: string; delayMs: number }) {
  return (
    <BoardFrame>
      <span className="cwp-wash absolute inset-0 block" style={{ background: color, animationDelay: `${delayMs}ms` }} />
    </BoardFrame>
  );
}

/** The travelling part of an `anchor: "aim"` hex: a spectral chain dragged
 * from the cast square down the real source -> target leg, its reach driven by
 * --fx-len and its shackle cinching onto the victim's square.
 *
 * Authored pointing RIGHT; `fx-aim` (the rotation AimStage applies internally)
 * turns it onto the vector. It is applied HERE rather than by wrapping the
 * chain in <AimStage>, because this already renders inside <Stage>: a second
 * staging box would multiply the 14-cell canvas by 14 again. Nothing upright
 * may go inside it - a subject rotated onto the vector lies on its side. */
function ChainLeg({ color, delayMs }: { color: string; delayMs: number }) {
  return (
    <span className="fx-aim absolute inset-0 block" aria-hidden="true">
      <span
        className="cwp-chain absolute block"
        style={{
          left: "50%",
          top: "49.7%",
          width: "7.15%",
          height: "0.7%",
          background: `repeating-linear-gradient(90deg, ${color} 0 42%, transparent 42% 100%)`,
          transformOrigin: "0% 50%",
          animationDelay: `${delayMs}ms`,
        }}
      />
      <span
        className="cwp-chainlink absolute block rounded-full"
        style={{ left: "49.3%", top: "48.9%", width: "1.4%", height: "1.4%", border: `2px solid ${color}`, animationDelay: `${delayMs + 90}ms` }}
      />
    </span>
  );
}

/** Tell: stray curse-light gathering onto the point the working will claim. */
function Tell({ color, delayMs, left = 40, top = 36 }: { color: string; delayMs: number; left?: number; top?: number }) {
  return (
    <>
      <span
        className="cwp-tellglow absolute block rounded-full"
        style={{ left: `${left}%`, top: `${top}%`, width: "20%", height: "18%", background: color, animationDelay: `${delayMs}ms` }}
      />
      {[
        { dx: "160%", dy: "-40%" },
        { dx: "-150%", dy: "60%" },
        { dx: "40%", dy: "150%" },
      ].map((v, i) => (
        <span
          key={i}
          className="cwp-tellray absolute block"
          style={
            {
              left: `${left + 8}%`,
              top: `${top + 7}%`,
              width: "7%",
              height: "0.7%",
              background: color,
              "--dx": v.dx,
              "--dy": v.dy,
              animationDelay: `${delayMs + i * 30}ms`,
            } as CSSProperties
          }
        />
      ))}
    </>
  );
}

/** Soft round settle fleck. */
function Mote({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <circle cx="5" cy="5" r="3.4" fill={color} />
    </svg>
  );
}

/** Two settle flecks sifting off the scene as it decays. */
function SettlePair({ color, delayMs }: { color: string; delayMs: number }) {
  return (
    <>
      {[
        { l: 40, t: 44, dx: "-60%", dy: "120%", rot: "-110deg", d: 0 },
        { l: 57, t: 40, dx: "70%", dy: "140%", rot: "120deg", d: 90 },
      ].map((v, i) => (
        <span
          key={i}
          className="cwp-settle absolute block"
          style={
            {
              left: `${v.l}%`,
              top: `${v.t}%`,
              width: "1.6%",
              height: "1.6%",
              "--dx": v.dx,
              "--dy": v.dy,
              "--rot": v.rot,
              animationDelay: `${delayMs + v.d}ms`,
            } as CSSProperties
          }
        >
          <Mote color={color} />
        </span>
      ))}
    </>
  );
}

/** Tiny flat chessman silhouettes — the supporting actors of the flourishes. */
const CHESSMAN = {
  p: "M5 1.2 C6.2 1.2 7 2 7 3 C7 3.7 6.6 4.3 6 4.6 L7 8 H3 L4 4.6 C3.4 4.3 3 3.7 3 3 C3 2 3.8 1.2 5 1.2 Z M2.4 8.6 H7.6 V9.6 H2.4 Z",
  r: "M2.6 1.4 H3.8 V2.6 H4.6 V1.4 H5.4 V2.6 H6.2 V1.4 H7.4 V3.8 H6.8 L7.2 7.6 H2.8 L3.2 3.8 H2.6 Z M2.2 8.4 H7.8 V9.6 H2.2 Z",
  n: "M2.8 8.2 C2.8 5.4 3.8 4 5.4 3.2 L5 1.6 L6.4 2.6 L7.2 2.4 C7.9 3 8.1 4 7.7 4.9 L6.6 4.6 L6.2 4 C6.5 5.6 6.4 7 7 8.2 Z M2.4 8.8 H7.6 V9.8 H2.4 Z",
  b: "M5 1 C6.4 2 7 3.4 7 4.6 C7 5.8 6.2 6.6 5 6.6 C3.8 6.6 3 5.8 3 4.6 C3 3.4 3.6 2 5 1 Z M3.4 7.2 H6.6 L7.2 8.2 H2.8 Z M2.2 8.8 H7.8 V9.8 H2.2 Z",
  q: "M2.4 3.2 L3.4 5 L4.2 2.6 L5 4.6 L5.8 2.6 L6.6 5 L7.6 3.2 L7 7.4 H3 Z M2.6 8 H7.4 V9.2 H2.6 Z",
  k: "M4.6 1 H5.4 V2 H6.4 V2.8 H5.4 V3.8 H4.6 V2.8 H3.6 V2 H4.6 Z M3.4 4.4 H6.6 L7.2 8 H2.8 Z M2.4 8.6 H7.6 V9.8 H2.4 Z",
} as const;
function Man({ kind, fill, stroke }: { kind: keyof typeof CHESSMAN; fill: string; stroke: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d={CHESSMAN[kind]} fill={fill} stroke={stroke} strokeWidth="0.45" {...SJ} />
    </svg>
  );
}

/** Compact per-square hit for non-lead ("target") renders: a curse-rune flash,
 * the card's glyph, a closing ring and two flecks. Zone-fed cards mount one
 * overlay per affected square, so this must NOT be board-wide. */
function CurseHit({ palette, glyph, delayMs }: { palette: Palette; glyph: ReactNode; delayMs: number }) {
  const [, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="cwp-tellglow absolute block rounded-full"
        style={{ left: "22%", top: "22%", width: "56%", height: "56%", background: tint(p1, 0.4), animationDelay: `${delayMs}ms` }}
      />
      <span
        className="cwp-tflash absolute block rounded-full"
        style={{ left: "16%", top: "16%", width: "68%", height: "68%", background: tint(p1, 0.45), animationDelay: `${delayMs + 140}ms` }}
      />
      <span className="cwp-pop absolute block" style={{ left: "18%", top: "16%", width: "64%", height: "64%", animationDelay: `${delayMs + 200}ms` }}>
        {glyph}
      </span>
      <span
        className="cwp-tring absolute block rounded-full"
        style={{ left: "10%", top: "10%", width: "80%", height: "80%", border: `2px solid ${tint(p1, 0.9)}`, animationDelay: `${delayMs + 260}ms` }}
      />
      {[
        { l: 36, t: 40, dx: "-60%", dy: "120%", rot: "-100deg", d: 0 },
        { l: 58, t: 36, dx: "60%", dy: "140%", rot: "120deg", d: 80 },
      ].map((v, i) => (
        <span
          key={i}
          className="cwp-settle absolute block"
          style={
            {
              left: `${v.l}%`,
              top: `${v.t}%`,
              width: "12%",
              height: "12%",
              "--dx": v.dx,
              "--dy": v.dy,
              "--rot": v.rot,
              animationDelay: `${delayMs + 520 + v.d}ms`,
            } as CSSProperties
          }
        >
          <Mote color={tint(p2, 0.8)} />
        </span>
      ))}
    </span>
  );
}

/** The ENTRANCE cut: the card arriving in a hand, at ~56% of the crop. Same
 * palette and the play's own central object, three short beats (the curse
 * light gathers, the object sears in, two flecks sift off it), and no board
 * takeover — nothing here leaves the one square it is mounted on. `mark` is
 * the scene's own central object; without one the card's device stands in. */
function EntranceCut({ palette, glyph, delayMs, mark }: { palette: Palette; glyph: ReactNode; delayMs: number; mark?: ReactNode }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {/* tell: the curse light gathers behind the card */}
      <span
        className="cwp-tellglow absolute block rounded-full"
        style={{ left: "18%", top: "18%", width: "64%", height: "64%", background: `radial-gradient(circle, ${tint(p1, 0.45)}, transparent 70%)`, animationDelay: `${delayMs}ms` }}
      />
      {/* strike: the central object sears in */}
      <span className="cwp-rise absolute block" style={{ left: "22%", top: "22%", width: "56%", height: "56%", animationDelay: `${delayMs + 150}ms` }}>
        {mark ?? glyph}
      </span>
      {/* settle: two flecks sift off it */}
      {[
        { l: 30, t: 60, dx: "-70%", dy: "130%", rot: "-100deg", d: 0 },
        { l: 62, t: 30, dx: "70%", dy: "140%", rot: "120deg", d: 90 },
      ].map((v, i) => (
        <span
          key={i}
          className="cwp-settle absolute block"
          style={
            {
              left: `${v.l}%`,
              top: `${v.t}%`,
              width: "10%",
              height: "10%",
              "--dx": v.dx,
              "--dy": v.dy,
              "--rot": v.rot,
              animationDelay: `${delayMs + 460 + v.d}ms`,
            } as CSSProperties
          }
        >
          <Mote color={tint(p2, 0.85)} />
        </span>
      ))}
      <span
        className="cwp-tring absolute block rounded-full"
        style={{ left: "14%", top: "14%", width: "72%", height: "72%", border: `2px solid ${tint(p0, 0.85)}`, animationDelay: `${delayMs + 380}ms` }}
      />
    </span>
  );
}

/** Each shared template's central object, drawn small enough to carry an
 * entrance on its own. Kept beside EntranceCut so the card arriving in a hand
 * and the card being played show the SAME thing. */
const MARK: Record<string, (p: Palette) => ReactNode> = {
  seal: ([p0, p1, p2]) => (
    <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
      <circle cx="10" cy="10" r="7.4" fill={tint(p0, 0.6)} stroke={tint(p1, 0.9)} strokeWidth="0.9" />
      <circle cx="10" cy="10" r="5.4" fill="none" stroke={tint(p2, 0.7)} strokeWidth="0.4" strokeDasharray="1.5 1.1" />
      <path d="M10 1.4 V3 M10 17 V18.6 M1.4 10 H3 M17 10 H18.6" stroke={tint(p2, 0.85)} strokeWidth="0.7" strokeLinecap="round" />
    </svg>
  ),
  bell: ([p0, p1, p2]) => (
    <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
      <path d="M5 14.4 C5 7.6 7 4.6 10 4.6 C13 4.6 15 7.6 15 14.4 Z" fill={tint(p0, 0.72)} stroke={tint(p1, 0.9)} strokeWidth="0.7" {...SJ} />
      <path d="M3.8 15.2 H16.2" stroke={tint(p1, 0.9)} strokeWidth="0.9" strokeLinecap="round" />
      <circle cx="10" cy="17" r="1.1" fill={tint(p2, 0.9)} />
    </svg>
  ),
  blight: ([p0, p1, p2]) => (
    <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
      <rect x="3" y="8.4" width="14" height="8" fill={tint(p0, 0.75)} stroke={tint(p2, 0.8)} strokeWidth="0.6" />
      <path d="M10 8.4 C10 5 8.4 3.4 6.4 2.8 C7.6 4.8 7.6 6.8 10 8.4 Z" fill={tint(p1, 0.85)} />
      <path d="M10 8.4 C10 5.8 11.4 4.4 13.4 4 C12.4 5.6 12.2 7 10 8.4 Z" fill={tint(p1, 0.65)} />
    </svg>
  ),
  shackle: ([p0, p1, p2]) => (
    <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
      <circle cx="10" cy="11.4" r="5" fill="none" stroke={tint(p1, 0.9)} strokeWidth="1.6" />
      <path d="M6.6 6.8 C6.6 3.6 13.4 3.6 13.4 6.8" fill="none" stroke={tint(p2, 0.85)} strokeWidth="1.2" {...SJ} />
      <circle cx="10" cy="11.4" r="1.6" fill={tint(p0, 0.9)} />
    </svg>
  ),
  veil: ([p0, p1, p2]) => (
    <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
      <path d="M2 6 C6 4 14 4 18 6 C17 12 14 16 10 17.4 C6 16 3 12 2 6 Z" fill={tint(p1, 0.55)} stroke={tint(p0, 0.9)} strokeWidth="0.7" {...SJ} />
      <path d="M6 8.4 C8 9.6 12 9.6 14 8.4" fill="none" stroke={tint(p2, 0.85)} strokeWidth="0.7" strokeLinecap="round" />
    </svg>
  ),
};

/* =============================================================================
   Template 1: HexBrand — a smoking witch-seal slams down flat over the board
   and SEARS: the scorch ring (the template's signature beat) runs outward
   from the wax while the card's glyph burns in the seal's heart.
   Flourishes: veto, longroad, bloodprice, tarnish, rations, stacked.
   ========================================================================== */
function HexBrand({ palette, glyph, lead, role, delayMs, flourish, aim }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} mark={MARK.seal(palette)} />;
  if (!lead) return <CurseHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    // FLAGSHIP: the whole stage jolts when the hot seal hammers down
    <Stage quakeAtMs={delayMs + 620}>
      <Wash color={tint(p0, 0.24)} delayMs={delayMs} />
      {aim && <ChainLeg color={tint(p1, 0.9)} delayMs={delayMs + 300} />}
      <Tell color={tint(p1, 0.35)} delayMs={delayMs} />
      {/* per-card impact accent: this flourish's own laser / shatter / blast */}
      {flourish && FLOURISH_IMPACT[flourish] && <ImpactCell spec={FLOURISH_IMPACT[flourish]} rgb={rgbOf(p1)} delayMs={delayMs} />}
      {/* the seal, stamped down like hot wax */}
      <span className="cwp-stamp absolute block" style={{ left: "31%", top: "27%", width: "38%", height: "38%", animationDelay: `${delayMs + 160}ms` }}>
        <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="16.5" fill={tint(p0, 0.55)} stroke={tint(p1, 0.9)} strokeWidth="1.4" />
          <circle cx="20" cy="20" r="12.6" fill="none" stroke={tint(p2, 0.7)} strokeWidth="0.6" strokeDasharray="2.4 1.7" />
          {/* wax drips at the rim */}
          <path d="M6 24 C5 26.5 5.6 28 7 28.4 C7.8 26.8 7.4 25.4 6 24 Z" fill={tint(p1, 0.7)} />
          <path d="M33 13 C34.4 14.6 34.4 16.2 33.2 17 C32.2 15.6 32.2 14.4 33 13 Z" fill={tint(p1, 0.7)} />
          {/* rune ticks */}
          <path d="M20 2.4 V4.8 M20 35.2 V37.6 M2.4 20 H4.8 M35.2 20 H37.6 M8 8 L9.6 9.6 M32 8 L30.4 9.6 M8 32 L9.6 30.4 M32 32 L30.4 30.4" stroke={tint(p2, 0.85)} strokeWidth="0.9" strokeLinecap="round" />
        </svg>
        <span className="cwp-facein absolute block" style={{ left: "33%", top: "33%", width: "34%", height: "34%", animationDelay: `${delayMs + 560}ms` }}>{glyph}</span>
      </span>
      {/* SIGNATURE: the scorch ring searing outward from the brand */}
      <span
        className="cwp-scorch absolute block rounded-full"
        style={{ left: "26%", top: "22%", width: "48%", height: "48%", border: `3px solid ${tint(p1, 0.85)}`, animationDelay: `${delayMs + 620}ms` }}
      />
      {/* smoke curls off the hot wax */}
      {[
        { l: 38, t: 26, dx: "-40%", d: 0 },
        { l: 60, t: 24, dx: "50%", d: 120 },
      ].map((v, i) => (
        <span
          key={i}
          className="cwp-cinder absolute block"
          style={{ left: `${v.l}%`, top: `${v.t}%`, width: "1.8%", height: "1.8%", "--dx": v.dx, animationDelay: `${delayMs + 640 + v.d}ms` } as CSSProperties}
        >
          <Mote color={tint(p2, 0.6)} />
        </span>
      ))}
      {/* bespoke: Witch's Veto — the warded pawn under a raised gauntlet, and
          a striking knight yanked up short of it */}
      {flourish === "veto" && (
        <>
          <span className="cwp-hold absolute block" style={{ left: "56%", top: "44%", width: "5%", height: "7.5%", animationDelay: `${delayMs + 620}ms` }}>
            <Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="cwp-pop absolute block" style={{ left: "54.4%", top: "37%", width: "8%", height: "6%", animationDelay: `${delayMs + 700}ms` }}>
            <svg viewBox="0 0 10 7" className="block h-full w-full" aria-hidden="true">
              <path d="M1.5 6.2 C1.5 3 8.5 3 8.5 6.2" fill="none" stroke={tint(p1, 0.9)} strokeWidth="0.8" strokeLinecap="round" />
              <path d="M3.4 3.6 V1.2 M4.6 3.3 V0.8 M5.8 3.3 V1 M7 3.8 V1.8" stroke={tint(p1, 0.9)} strokeWidth="0.7" strokeLinecap="round" />
            </svg>
          </span>
          <span className="cwp-snapback absolute block" style={{ left: "36%", top: "45%", width: "5.5%", height: "8%", "--dx": "220%", "--dy": "-8%", animationDelay: `${delayMs + 680}ms` } as CSSProperties}>
            <Man kind="n" fill={tint(p2, 0.9)} stroke={p1} />
          </span>
        </>
      )}
      {/* bespoke: The Long Road Home — a dotted road home, and the marked
          knight tugged down it in reluctant jerks */}
      {flourish === "longroad" && (
        <>
          <span className="absolute block" style={{ left: "34%", top: "56.5%", width: "32%", height: "0.9%", rotate: "8deg" }}>
            <span
              className="cwp-beam absolute inset-0 block"
              style={{ background: `repeating-linear-gradient(90deg, ${tint(p1, 0.85)} 0 6px, transparent 6px 11px)`, animationDelay: `${delayMs + 560}ms` }}
            />
          </span>
          <span className="cwp-tug absolute block" style={{ left: "36%", top: "48%", width: "5.5%", height: "8%", "--dx": "420%", "--dy": "55%", animationDelay: `${delayMs + 640}ms` } as CSSProperties}>
            <Man kind="n" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="cwp-glint absolute block" style={{ left: "64%", top: "58%", width: "3.4%", height: "3.4%", animationDelay: `${delayMs + 1240}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.8 L6 4 L9.2 5 L6 6 L5 9.2 L4 6 L0.8 5 L4 4 Z" fill={tint(p1, 0.95)} />
            </svg>
          </span>
        </>
      )}
      {/* bespoke: Blood Price — the collector's coin drops onto an open ledger
          and a red droplet marks the debt line */}
      {flourish === "bloodprice" && (
        <>
          <span className="cwp-facein absolute block" style={{ left: "42%", top: "60%", width: "16%", height: "9%", animationDelay: `${delayMs + 560}ms` }}>
            <svg viewBox="0 0 16 9" className="block h-full w-full" aria-hidden="true">
              <path d="M1 1.6 C4 0.6 6.5 0.8 8 2 C9.5 0.8 12 0.6 15 1.6 V7.4 C12 6.6 9.5 6.8 8 7.8 C6.5 6.8 4 6.6 1 7.4 Z" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
              <path d="M2.6 3.2 H6.4 M2.6 4.6 H6.4 M9.6 3.2 H13.4 M9.6 4.6 H13.4" stroke="#8a6a3a" strokeWidth="0.4" strokeLinecap="round" />
            </svg>
          </span>
          <span className="cwp-settle absolute block" style={{ left: "48.6%", top: "48%", width: "2.8%", height: "2.8%", "--dx": "8%", "--dy": "380%", "--rot": "260deg", animationDelay: `${delayMs + 620}ms` } as CSSProperties}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <circle cx="5" cy="5" r="4" fill="#e8b04b" stroke="#8a6a3a" strokeWidth="0.7" />
              <path d="M5 2.6 V7.4 M3.4 4 H6.6" stroke="#8a6a3a" strokeWidth="0.6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="cwp-glint absolute block" style={{ left: "52%", top: "62.5%", width: "2.2%", height: "2.6%", animationDelay: `${delayMs + 1120}ms` }}>
            <svg viewBox="0 0 8 10" className="block h-full w-full" aria-hidden="true">
              <path d="M4 0.8 C6 3.6 7 5.4 7 6.8 A3 3 0 1 1 1 6.8 C1 5.4 2 3.6 4 0.8 Z" fill="#c94a5a" />
            </svg>
          </span>
        </>
      )}
      {/* bespoke: Tarnished Crown — a fresh crown blackens: tarnish drips run
          down it while rust flecks sift off */}
      {flourish === "tarnish" && (
        <>
          <span className="cwp-pop absolute block" style={{ left: "45%", top: "16%", width: "10%", height: "7.5%", animationDelay: `${delayMs + 560}ms` }}>
            <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
              <path d="M1.4 6.6 V2 L3.8 4 L6 1 L8.2 4 L10.6 2 V6.6 Z" fill="#e8b04b" stroke="#8a6a3a" strokeWidth="0.5" {...SJ} />
              <path d="M3 6.6 C3 5 2.6 4.2 2.2 3.6 M6 6.6 C6 4.8 5.8 3.4 6 2.2 M9 6.6 C9 5.2 9.2 4.4 9.6 3.6" stroke={tint(p2, 0.85)} strokeWidth="0.8" strokeLinecap="round" />
            </svg>
          </span>
          {[
            { l: 46, t: 24, d: 0 },
            { l: 52, t: 25, d: 140 },
          ].map((v, i) => (
            <span
              key={i}
              className="cwp-settle absolute block"
              style={{ left: `${v.l}%`, top: `${v.t}%`, width: "1.4%", height: "1.4%", "--dx": "20%", "--dy": "220%", "--rot": "80deg", animationDelay: `${delayMs + 760 + v.d}ms` } as CSSProperties}
            >
              <Mote color="#8a5a3a" />
            </span>
          ))}
        </>
      )}
      {/* bespoke: War Rations — two requisition chits are stamped out; the
          third is struck through, refused */}
      {flourish === "rations" && (
        <>
          {[0, 1].map((i) => (
            <span key={i} className="cwp-pop absolute block" style={{ left: `${37 + i * 10}%`, top: "62%", width: "8%", height: "5.5%", animationDelay: `${delayMs + 620 + i * 150}ms` }}>
              <svg viewBox="0 0 10 7" className="block h-full w-full" aria-hidden="true">
                <rect x="0.6" y="0.8" width="8.8" height="5.4" rx="0.8" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.4" />
                <circle cx="5" cy="3.5" r="1.6" fill="none" stroke={tint(p1, 0.9)} strokeWidth="0.6" />
                <path d="M4.2 3.5 L4.9 4.2 L6 2.9" fill="none" stroke={tint(p1, 0.9)} strokeWidth="0.6" {...SJ} />
              </svg>
            </span>
          ))}
          <span className="cwp-pop absolute block" style={{ left: "57%", top: "62%", width: "8%", height: "5.5%", animationDelay: `${delayMs + 920}ms` }}>
            <svg viewBox="0 0 10 7" className="block h-full w-full" aria-hidden="true">
              <rect x="0.6" y="0.8" width="8.8" height="5.4" rx="0.8" fill={tint(p0, 0.7)} stroke="#8a6a3a" strokeWidth="0.4" />
              <path d="M2 1.6 L8 5.4 M8 1.6 L2 5.4" stroke="#c94a5a" strokeWidth="0.8" strokeLinecap="round" />
            </svg>
          </span>
        </>
      )}
      {/* bespoke: Compounding Misery — the seal answers the board's other
          curses: extra rings stack outward, one pip lighting per ring */}
      {flourish === "stacked" && (
        <>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="cwp-scorch absolute block rounded-full"
              style={{
                left: `${24 - i * 3}%`,
                top: `${20 - i * 3}%`,
                width: `${52 + i * 6}%`,
                height: `${52 + i * 6}%`,
                border: `2px solid ${tint(i % 2 ? p2 : p1, 0.7)}`,
                animationDelay: `${delayMs + 740 + i * 130}ms`,
              }}
            />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <span key={`p${i}`} className="cwp-glint absolute block" style={{ left: `${41 + i * 5}%`, top: "70%", width: "2.4%", height: "2.4%", animationDelay: `${delayMs + 780 + i * 130}ms` }}>
              <Mote color={tint(p1, 0.95)} />
            </span>
          ))}
        </>
      )}
      {/* wave3 Wrong Foot — a piece forced from a light square onto a dark one */}
      {flourish === "wrongfoot" && (
        <>
          <span className="cwp-hold absolute block" style={{ left: "38%", top: "58%", width: "8%", height: "6%", animationDelay: `${delayMs + 560}ms` }}>
            <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
              <rect x="0.5" y="0.5" width="5" height="7" fill={tint(p2, 0.75)} /><rect x="6" y="0.5" width="5" height="7" fill={tint(p0, 0.9)} />
            </svg>
          </span>
          <span className="cwp-tug absolute block" style={{ left: "40%", top: "58%", width: "5%", height: "7.5%", "--dx": "120%", "--dy": "0%", animationDelay: `${delayMs + 700}ms` } as CSSProperties}>
            <Man kind="n" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
        </>
      )}
      {/* wave3 Overexertion — a piece moved twice running seizes up, frost cuffs it */}
      {flourish === "overexert" && (
        <>
          <span className="cwp-hold absolute block" style={{ left: "46%", top: "56%", width: "6%", height: "9%", animationDelay: `${delayMs + 560}ms` }}>
            <Man kind="r" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          {[0, 1].map((i) => (
            <span key={i} className="cwp-crack absolute block" style={{ left: `${43 + i * 8}%`, top: "58%", width: "4%", height: "5%", animationDelay: `${delayMs + 760 + i * 120}ms` }}>
              <svg viewBox="0 0 8 8" className="block h-full w-full" aria-hidden="true">
                <path d="M4 0.6 L3 3 L5 4.4 L3.4 7.4 M1 4 H7" fill="none" stroke={tint(p2, 0.9)} strokeWidth="0.6" {...SJ} />
              </svg>
            </span>
          ))}
        </>
      )}
      {/* wave3 Toll Road — a border stile stamps a toll on any crossing piece */}
      {flourish === "tollroad" && (
        <>
          <span className="cwp-beam absolute block" style={{ left: "32%", top: "56%", width: "36%", height: "1.4%", background: tint(p1, 0.9), transformOrigin: "0% 50%", animationDelay: `${delayMs + 560}ms` }} />
          <span className="cwp-tug absolute block" style={{ left: "38%", top: "48%", width: "5.5%", height: "8%", "--dx": "160%", "--dy": "60%", animationDelay: `${delayMs + 700}ms` } as CSSProperties}>
            <Man kind="b" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="cwp-pop absolute block" style={{ left: "54%", top: "60%", width: "5%", height: "5%", animationDelay: `${delayMs + 900}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <circle cx="5" cy="5" r="4" fill="#e8b04b" stroke="#8a6a3a" strokeWidth="0.6" /><path d="M5 2.6 V7.4 M3.4 4 H6.6" stroke="#8a6a3a" strokeWidth="0.5" strokeLinecap="round" />
            </svg>
          </span>
        </>
      )}
      {/* wave3 Bloodlust — the killer piece is dragged on to strike again */}
      {flourish === "bloodlust" && (
        <>
          <span className="cwp-tug absolute block" style={{ left: "34%", top: "58%", width: "5.5%", height: "8%", "--dx": "260%", "--dy": "0%", animationDelay: `${delayMs + 620}ms` } as CSSProperties}>
            <Man kind="q" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          {[0, 1].map((i) => (
            <span key={i} className="cwp-glint absolute block" style={{ left: `${52 + i * 9}%`, top: "60%", width: "2.6%", height: "3%", animationDelay: `${delayMs + 900 + i * 150}ms` }}>
              <svg viewBox="0 0 8 10" className="block h-full w-full" aria-hidden="true"><path d="M4 0.8 C6 3.6 7 5.4 7 6.8 A3 3 0 1 1 1 6.8 C1 5.4 2 3.6 4 0.8 Z" fill="#c94a5a" /></svg>
            </span>
          ))}
        </>
      )}
      {/* wave3 Exile's Mark — a marked piece dragged toward the far half or it crumbles */}
      {flourish === "exile" && (
        <>
          <span className="absolute block" style={{ left: "34%", top: "57%", width: "34%", height: "0.9%", rotate: "-6deg" }}>
            <span className="cwp-beam absolute inset-0 block" style={{ background: `repeating-linear-gradient(90deg, ${tint(p1, 0.85)} 0 6px, transparent 6px 11px)`, animationDelay: `${delayMs + 560}ms` }} />
          </span>
          <span className="cwp-tug absolute block" style={{ left: "36%", top: "50%", width: "5.5%", height: "8%", "--dx": "420%", "--dy": "-30%", animationDelay: `${delayMs + 660}ms` } as CSSProperties}>
            <Man kind="r" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
        </>
      )}
      {/* wave3 Debtor's Mark — freeze-debt tallies pile up beside an idle piece */}
      {flourish === "debtor" && (
        <>
          <span className="cwp-hold absolute block" style={{ left: "38%", top: "56%", width: "6%", height: "9%", animationDelay: `${delayMs + 560}ms` }}>
            <Man kind="b" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="cwp-pop absolute block" style={{ left: `${52 + i * 3.4}%`, top: "58%", width: "1.4%", height: "5%", background: tint(p2, 0.85), animationDelay: `${delayMs + 760 + i * 140}ms` }} />
          ))}
        </>
      )}
      {/* wave3 Coronation Tax — a promotion strikes a different piece cold */}
      {flourish === "coronationtax" && (
        <>
          <span className="cwp-pop absolute block" style={{ left: "34%", top: "52%", width: "8%", height: "6%", animationDelay: `${delayMs + 560}ms` }}>
            <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true"><path d="M1.4 6.6 V2 L3.8 4 L6 1 L8.2 4 L10.6 2 V6.6 Z" fill="#e8b04b" stroke="#8a6a3a" strokeWidth="0.5" {...SJ} /></svg>
          </span>
          <span className="absolute block" style={{ left: "42%", top: "58%", width: "18%", height: "0.7%", rotate: "10deg" }}>
            <span className="cwp-beam absolute inset-0 block" style={{ background: tint(p2, 0.85), animationDelay: `${delayMs + 720}ms` }} />
          </span>
          <span className="cwp-hold absolute block" style={{ left: "60%", top: "58%", width: "5.5%", height: "8%", animationDelay: `${delayMs + 880}ms` }}>
            <Man kind="n" fill={tint(p2, 0.85)} stroke={p1} />
          </span>
        </>
      )}
      {/* wave3 Forced Pilgrimage — a marked piece hauled toward a distant shrine */}
      {flourish === "pilgrimage" && (
        <>
          <span className="cwp-pop absolute block" style={{ left: "62%", top: "50%", width: "6%", height: "9%", animationDelay: `${delayMs + 560}ms` }}>
            <svg viewBox="0 0 10 14" className="block h-full w-full" aria-hidden="true"><path d="M5 1 L7.6 5 H2.4 Z M3 5 H7 V13 H3 Z" fill="none" stroke={tint(p1, 0.9)} strokeWidth="0.6" {...SJ} /></svg>
          </span>
          <span className="cwp-tug absolute block" style={{ left: "32%", top: "56%", width: "5.5%", height: "8%", "--dx": "440%", "--dy": "-20%", animationDelay: `${delayMs + 680}ms` } as CSSProperties}>
            <Man kind="b" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
        </>
      )}
      {/* wave3 Bounty Mark — a marked piece freezes itself each time it captures */}
      {flourish === "bounty" && (
        <>
          <span className="cwp-hold absolute block" style={{ left: "46%", top: "54%", width: "6%", height: "9%", animationDelay: `${delayMs + 560}ms` }}>
            <Man kind="r" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="cwp-pop absolute block" style={{ left: "45%", top: "46%", width: "8%", height: "6%", animationDelay: `${delayMs + 720}ms` }}>
            <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
              <path d="M6 0.8 L7 3 L9.4 3 L7.5 4.6 L8.2 7 L6 5.6 L3.8 7 L4.5 4.6 L2.6 3 L5 3 Z" fill="none" stroke={tint(p2, 0.9)} strokeWidth="0.6" {...SJ} />
            </svg>
          </span>
          {[0, 1].map((i) => (
            <span key={i} className="cwp-crack absolute block" style={{ left: `${45 + i * 5}%`, top: "56%", width: "4%", height: "5%", animationDelay: `${delayMs + 900 + i * 120}ms` }}>
              <svg viewBox="0 0 8 8" className="block h-full w-full" aria-hidden="true"><path d="M4 0.6 L3 3 L5 4.4 L3.4 7.4" fill="none" stroke={tint(p2, 0.9)} strokeWidth="0.6" {...SJ} /></svg>
            </span>
          ))}
        </>
      )}
      {/* wave3 Feeding Frenzy — the slider reach cinches tighter per active curse */}
      {flourish === "feedingfrenzy" && (
        <>
          <span className="cwp-hold absolute block" style={{ left: "46%", top: "54%", width: "6%", height: "9%", animationDelay: `${delayMs + 560}ms` }}>
            <Man kind="q" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          {[0, 1, 2].map((i) => (
            <span key={i} className="cwp-scorch absolute block rounded-full" style={{ left: `${34 - i * 3}%`, top: `${42 - i * 3}%`, width: `${32 + i * 6}%`, height: `${32 + i * 6}%`, border: `2px solid ${tint(i % 2 ? p2 : p1, 0.75)}`, animationDelay: `${delayMs + 760 + i * 140}ms` }} />
          ))}
        </>
      )}
      <SettlePair color={tint(p1, 0.7)} delayMs={delayMs + 1150} />
    </Stage>
  );
}

/* =============================================================================
   Template 2: OmenBell — a spectral bell lowers over the board and ROCKS;
   toll ripples (the signature beat) wash out from its mouth while the card's
   glyph glows beneath it.
   Flourishes: omen, halfmeasure, midnight, toil.
   ========================================================================== */
function OmenBell({ palette, glyph, lead, role, delayMs, flourish, aim }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} mark={MARK.bell(palette)} />;
  if (!lead) return <CurseHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    // FLAGSHIP: the stage rocks on the first toll of the bell
    <Stage quakeAtMs={delayMs + 700}>
      <Wash color={tint(p0, 0.24)} delayMs={delayMs} />
      {aim && <ChainLeg color={tint(p1, 0.9)} delayMs={delayMs + 300} />}
      <Tell color={tint(p1, 0.35)} delayMs={delayMs} left={42} top={24} />
      {/* per-card impact accent: this flourish's own laser / shatter / blast */}
      {flourish && FLOURISH_IMPACT[flourish] && <ImpactCell spec={FLOURISH_IMPACT[flourish]} rgb={rgbOf(p1)} delayMs={delayMs} />}
      {/* the bell, descending on its phantom rope, then rocking */}
      <span className="cwp-drop absolute block" style={{ left: "38%", top: "18%", width: "24%", height: "30%", animationDelay: `${delayMs + 140}ms` }}>
        <span className="cwp-swing absolute inset-0 block" style={{ animationDelay: `${delayMs + 620}ms` }}>
          <svg viewBox="0 0 24 30" className="block h-full w-full" aria-hidden="true">
            <path d="M12 1 V4" stroke={tint(p2, 0.8)} strokeWidth="1" strokeLinecap="round" />
            <path d="M6 22 C6 12 8 6 12 4.6 C16 6 18 12 18 22 Z" fill={tint(p0, 0.75)} stroke={tint(p1, 0.95)} strokeWidth="1.1" {...SJ} />
            <path d="M4.6 22 H19.4 L18.6 24.6 H5.4 Z" fill={tint(p1, 0.85)} stroke={tint(p2, 0.6)} strokeWidth="0.5" {...SJ} />
            <circle cx="12" cy="26.6" r="1.5" fill={tint(p2, 0.9)} />
            {/* the crack every curse-bell carries */}
            <path d="M12.6 10 L11.6 13 L12.8 15.5 L11.8 18.5" fill="none" stroke={tint(p2, 0.75)} strokeWidth="0.5" {...SJ} />
          </svg>
        </span>
      </span>
      {/* SIGNATURE: toll ripples washing out of the bell mouth */}
      {[0, 1].map((i) => (
        <span
          key={i}
          className="cwp-ring absolute block rounded-full"
          style={{ left: "34%", top: "36%", width: "32%", height: "22%", border: `2.5px solid ${tint(p1, 0.8)}`, animationDelay: `${delayMs + 700 + i * 180}ms` }}
        />
      ))}
      {/* the card's glyph, lit under the bell */}
      <span className="cwp-facein absolute block" style={{ left: "44.5%", top: "52%", width: "11%", height: "11%", animationDelay: `${delayMs + 760}ms` }}>{glyph}</span>
      {/* bespoke: Bad Omen — three crows burst from the belfry */}
      {flourish === "omen" && (
        <>
          {[
            { l: 40, t: 22, dx: "-260%", dy: "-160%", rot: "-30deg", d: 0 },
            { l: 52, t: 20, dx: "240%", dy: "-190%", rot: "24deg", d: 90 },
            { l: 46, t: 24, dx: "60%", dy: "-260%", rot: "8deg", d: 180 },
          ].map((v, i) => (
            <span
              key={i}
              className="cwp-spark absolute block"
              style={{ left: `${v.l}%`, top: `${v.t}%`, width: "4.5%", height: "3%", "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + 680 + v.d}ms` } as CSSProperties}
            >
              <svg viewBox="0 0 12 6" className="block h-full w-full" aria-hidden="true">
                <path d="M1 3 C3 0.6 5 0.6 6 2.6 C7 0.6 9 0.6 11 3 C9 2.4 7.4 2.8 6 4.4 C4.6 2.8 3 2.4 1 3 Z" fill="#1c1c24" />
              </svg>
            </span>
          ))}
        </>
      )}
      {/* bespoke: Tolling Bell — the metronome of loud and quiet turns: an
          alternating dark/bright ripple pair and a ticking beat-bar */}
      {flourish === "halfmeasure" && (
        <>
          <span
            className="cwp-ring absolute block rounded-full"
            style={{ left: "30%", top: "33%", width: "40%", height: "28%", border: `2px dashed ${tint(p2, 0.8)}`, animationDelay: `${delayMs + 1020}ms` }}
          />
          <span className="cwp-hand absolute block" style={{ left: "49.4%", top: "62%", width: "1.2%", height: "9%", animationDelay: `${delayMs + 700}ms` }}>
            <svg viewBox="0 0 3 20" className="block h-full w-full" aria-hidden="true">
              <path d="M1.5 19 V2" stroke={tint(p1, 0.95)} strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="1.5" cy="2.4" r="1.3" fill={tint(p2, 0.95)} />
            </svg>
          </span>
          {[0, 1, 2].map((i) => (
            <span key={i} className="cwp-glint absolute block" style={{ left: `${42 + i * 7}%`, top: "72%", width: "2%", height: "2%", animationDelay: `${delayMs + 760 + i * 170}ms` }}>
              <Mote color={i % 2 ? tint(p2, 0.9) : tint(p1, 0.9)} />
            </span>
          ))}
        </>
      )}
      {/* bespoke: The Witching Hour — a moon-pale clock face; its hand sweeps
          up to midnight and a cold glint strikes at XII */}
      {flourish === "midnight" && (
        <>
          <span className="cwp-facein absolute block" style={{ left: "62%", top: "26%", width: "13%", height: "13%", animationDelay: `${delayMs + 560}ms` }}>
            <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
              <circle cx="10" cy="10" r="8.6" fill={tint(p0, 0.7)} stroke={tint(p1, 0.9)} strokeWidth="0.9" />
              <path d="M10 2.2 V3.8 M10 16.2 V17.8 M2.2 10 H3.8 M16.2 10 H17.8" stroke={tint(p2, 0.85)} strokeWidth="0.7" strokeLinecap="round" />
            </svg>
          </span>
          <span className="cwp-hand absolute block" style={{ left: "68%", top: "28.5%", width: "1%", height: "5%", animationDelay: `${delayMs + 720}ms` }}>
            <svg viewBox="0 0 3 12" className="block h-full w-full" aria-hidden="true">
              <path d="M1.5 11 V1.5" stroke={tint(p1, 1)} strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <span className="cwp-glint absolute block" style={{ left: "67.2%", top: "23.6%", width: "2.6%", height: "2.6%", animationDelay: `${delayMs + 1260}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.8 L6 4 L9.2 5 L6 6 L5 9.2 L4 6 L0.8 5 L4 4 Z" fill={tint(p1, 0.95)} />
            </svg>
          </span>
        </>
      )}
      {/* bespoke: Weight of Toil — the overworked rook staggers under a grain
          sack while sweat-glints fly off it */}
      {flourish === "toil" && (
        <>
          <span className="cwp-hold absolute block" style={{ left: "63%", top: "56%", width: "6%", height: "9%", animationDelay: `${delayMs + 640}ms` }}>
            <Man kind="r" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="cwp-facein absolute block" style={{ left: "62.4%", top: "50%", width: "7.5%", height: "6%", animationDelay: `${delayMs + 700}ms` }}>
            <svg viewBox="0 0 10 8" className="block h-full w-full" aria-hidden="true">
              <path d="M1.4 6.8 C1 3.4 3 1 5 1 C7 1 9 3.4 8.6 6.8 C6.4 5.8 3.6 5.8 1.4 6.8 Z" fill="#8a6a3a" stroke="#4a3a22" strokeWidth="0.5" {...SJ} />
              <path d="M3.6 3.4 H6.4" stroke="#4a3a22" strokeWidth="0.5" strokeLinecap="round" />
            </svg>
          </span>
          {[
            { l: 61, t: 55, dx: "-140%", dy: "-60%", rot: "-40deg" },
            { l: 70, t: 56, dx: "150%", dy: "-70%", rot: "40deg" },
          ].map((v, i) => (
            <span key={i} className="cwp-spark absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "1.4%", height: "1.4%", "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + 820 + i * 120}ms` } as CSSProperties}>
              <Mote color="#bfe6ff" />
            </span>
          ))}
        </>
      )}
      {/* wave3 Slow Poison — a green drop seeps into a piece that withers a rank down */}
      {flourish === "slowpoison" && (
        <>
          <span className="absolute block" style={{ left: "56%", top: "48%", width: "6%", height: "10%" }}>
            <span className="cwp-hold absolute inset-0 block" style={{ animationDelay: `${delayMs + 620}ms` }}>
              <Man kind="q" fill={tint(p1, 0.9)} stroke={p2} />
            </span>
            <span className="cwp-gild absolute inset-0 block" style={{ animationDelay: `${delayMs + 820}ms` }}>
              <Man kind="b" fill="#6f9a3a" stroke={p0} />
            </span>
          </span>
          {[0, 1, 2].map((i) => (
            <span key={i} className="cwp-settle absolute block" style={{ left: `${57 + i * 1.4}%`, top: `${40 + i * 3}%`, width: "1.6%", height: "1.6%", "--dx": "10%", "--dy": "220%", "--rot": "40deg", animationDelay: `${delayMs + 640 + i * 130}ms` } as CSSProperties}>
              <Mote color="#7fae4a" />
            </span>
          ))}
        </>
      )}
      {/* wave3 Jammed Portcullis — a castled rook is barred in behind a dropped grate */}
      {flourish === "jammedgate" && (
        <>
          <span className="cwp-hold absolute block" style={{ left: "56%", top: "54%", width: "6%", height: "9%", animationDelay: `${delayMs + 620}ms` }}>
            <Man kind="r" fill={tint(p1, 0.9)} stroke={p2} />
          </span>
          <span className="cwp-drop absolute block" style={{ left: "52%", top: "44%", width: "14%", height: "18%", animationDelay: `${delayMs + 780}ms` }}>
            <svg viewBox="0 0 14 18" className="block h-full w-full" aria-hidden="true">
              <path d="M2 1 V17 M5 1 V17 M8 1 V17 M11 1 V17 M2 6 H12 M2 11 H12" fill="none" stroke={tint(p2, 0.9)} strokeWidth="0.7" strokeLinecap="round" />
            </svg>
          </span>
        </>
      )}
      {/* wave3 Powder Keg — a lit keg on an empty square counts down to a blast */}
      {flourish === "powderkeg" && (
        <>
          <span className="cwp-pop absolute block" style={{ left: "46%", top: "54%", width: "8%", height: "9%", animationDelay: `${delayMs + 620}ms` }}>
            <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
              <rect x="1.4" y="3" width="7.2" height="8" rx="1" fill={tint(p0, 0.9)} stroke={tint(p1, 0.9)} strokeWidth="0.6" />
              <path d="M5 3 C5.4 1.6 6.4 1 7 1.6" fill="none" stroke={tint(p2, 0.85)} strokeWidth="0.5" strokeLinecap="round" />
            </svg>
          </span>
          <span className="cwp-flame absolute block" style={{ left: "56%", top: "42%", width: "4%", height: "5%", animationDelay: `${delayMs + 820}ms` }}>
            <svg viewBox="0 0 8 10" className="block h-full w-full" aria-hidden="true"><path d="M4 0.8 C6 3 6.2 4.6 4 8 C1.8 4.6 2 3 4 0.8 Z" fill="#ff9d3d" /></svg>
          </span>
          <span className="cwp-scorch absolute block rounded-full" style={{ left: "38%", top: "48%", width: "24%", height: "24%", border: `2.5px solid ${tint(p1, 0.8)}`, animationDelay: `${delayMs + 1040}ms` }} />
        </>
      )}
      {/* wave3 Collapsing Floor — a chosen rank caves in, freezing what stands on it */}
      {flourish === "collapse" && (
        <>
          <span className="absolute block" style={{ left: "30%", top: "58%", width: "40%", height: "3%" }}>
            <span className="cwp-spreadtile absolute inset-0 block" style={{ background: `repeating-linear-gradient(90deg, ${tint(p0, 0.9)} 0 8px, ${tint(p2, 0.6)} 8px 12px)`, animationDelay: `${delayMs + 620}ms` }} />
          </span>
          {[36, 48, 60].map((l, i) => (
            <span key={l} className="cwp-settle absolute block" style={{ left: `${l}%`, top: "60%", width: "5%", height: "8%", "--dx": "0%", "--dy": "120%", "--rot": "10deg", animationDelay: `${delayMs + 820 + i * 130}ms` } as CSSProperties}>
              <Man kind={(["p", "n", "b"] as const)[i]} fill={tint(p1, 0.9)} stroke={p2} />
            </span>
          ))}
        </>
      )}
      {/* wave3 Doomed Vow — a condemned piece pleads under a falling axe unless the king comes */}
      {flourish === "doomedvow" && (
        <>
          <span className="cwp-hold absolute block" style={{ left: "46%", top: "56%", width: "6%", height: "9%", animationDelay: `${delayMs + 620}ms` }}>
            <Man kind="b" fill={tint(p1, 0.9)} stroke={p2} />
          </span>
          <span className="cwp-drop absolute block" style={{ left: "44%", top: "44%", width: "10%", height: "10%", animationDelay: `${delayMs + 820}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.8 V9" stroke="#8a6a3a" strokeWidth="0.7" strokeLinecap="round" />
              <path d="M5 1 C7 1.2 8.4 2.4 8.6 4 L5 3.4 Z" fill={tint(p2, 0.9)} stroke={p0} strokeWidth="0.4" {...SJ} />
            </svg>
          </span>
          <span className="cwp-glint absolute block" style={{ left: "60%", top: "56%", width: "3%", height: "3%", animationDelay: `${delayMs + 1120}ms` }}>
            <svg viewBox="0 0 8 10" className="block h-full w-full" aria-hidden="true"><path d="M4 0.8 C6 3.6 7 5.4 7 6.8 A3 3 0 1 1 1 6.8 C1 5.4 2 3.6 4 0.8 Z" fill="#c94a5a" /></svg>
          </span>
        </>
      )}
      <SettlePair color={tint(p1, 0.7)} delayMs={delayMs + 1200} />
    </Stage>
  );
}

/* =============================================================================
   Template 3: BlightGarden — rot takes the ground: dark tiles SPREAD one by
   one from the struck point (the signature beat) while weeds sprout from the
   seams and the card's glyph rises at the heart of the patch.
   Flourishes: footprints, creep, gravebloom, stormwall.
   ========================================================================== */
const BLIGHT_TILES = [
  { l: 45, t: 43, d: 0, s: 10 },
  { l: 38, t: 47, d: 130, s: 8.5 },
  { l: 52.5, t: 39, d: 220, s: 8 },
  { l: 47, t: 51.5, d: 310, s: 8.5 },
  { l: 40.5, t: 37, d: 400, s: 7 },
];
function BlightGarden({ palette, glyph, lead, role, delayMs, flourish, aim }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} mark={MARK.blight(palette)} />;
  if (!lead) return <CurseHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    // FLAGSHIP: the ground heaves as the rot takes root
    <Stage quakeAtMs={delayMs + 700}>
      <Wash color={tint(p0, 0.22)} delayMs={delayMs} />
      {aim && <ChainLeg color={tint(p1, 0.9)} delayMs={delayMs + 300} />}
      <Tell color={tint(p1, 0.32)} delayMs={delayMs} left={41} top={41} />
      {/* per-card impact accent: this flourish's own laser / shatter / blast */}
      {flourish && FLOURISH_IMPACT[flourish] && <ImpactCell spec={FLOURISH_IMPACT[flourish]} rgb={rgbOf(p1)} delayMs={delayMs} />}
      {/* SIGNATURE: the rot spreading tile to tile */}
      {BLIGHT_TILES.map((v, i) => (
        <span key={i} className="cwp-spreadtile absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: `${v.s}%`, height: `${v.s * 0.72}%`, animationDelay: `${delayMs + 260 + v.d}ms` }}>
          <svg viewBox="0 0 14 10" className="block h-full w-full" aria-hidden="true">
            <path d="M7 0.6 L13.4 5 L7 9.4 L0.6 5 Z" fill={tint(p0, 0.75)} stroke={tint(p1, 0.8)} strokeWidth="0.6" {...SJ} />
            <path d="M4.5 5 H6 M7.6 3.4 L8.8 4.4 M6.4 6.6 L8 6" stroke={tint(p2, 0.7)} strokeWidth="0.5" strokeLinecap="round" />
          </svg>
        </span>
      ))}
      {/* weeds prying up through the seams */}
      {[
        { l: 42, t: 39, d: 0 },
        { l: 55, t: 43, d: 160 },
        { l: 45, t: 50, d: 320 },
      ].map((v, i) => (
        <span key={`w${i}`} className="cwp-sprout absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "3.4%", height: "6%", animationDelay: `${delayMs + 620 + v.d}ms` }}>
          <svg viewBox="0 0 6 10" className="block h-full w-full" aria-hidden="true">
            <path d="M3 9.6 C3 6 2 4.6 1 3.4 M3 9.6 C3 5.4 4.2 4 5 2.4 M3 9.6 C3 6.6 3 4 3 1.6" fill="none" stroke={tint(p1, 0.9)} strokeWidth="0.7" strokeLinecap="round" />
          </svg>
        </span>
      ))}
      <span className="cwp-pop absolute block" style={{ left: "45.5%", top: "41%", width: "9%", height: "9%", animationDelay: `${delayMs + 700}ms` }}>{glyph}</span>
      {/* bespoke: Cold Footprints — a pawn hurries off and its frozen prints
          ice shut one by one behind it */}
      {flourish === "footprints" && (
        <>
          <span className="cwp-flee absolute block" style={{ left: "30%", top: "60%", width: "4.5%", height: "6.5%", animationDelay: `${delayMs + 560}ms` }}>
            <Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          {[0, 1, 2].map((i) => (
            <span key={i} className="cwp-pop absolute block" style={{ left: `${31 + i * 8}%`, top: "66.5%", width: "3%", height: "2.2%", animationDelay: `${delayMs + 760 + i * 200}ms` }}>
              <svg viewBox="0 0 10 6" className="block h-full w-full" aria-hidden="true">
                <ellipse cx="3" cy="3.6" rx="1.7" ry="2" fill={tint(p2, 0.85)} />
                <ellipse cx="7" cy="2.4" rx="1.7" ry="2" fill={tint(p2, 0.65)} />
              </svg>
            </span>
          ))}
        </>
      )}
      {/* bespoke: Creeping Blight — the rot reaches further: an outrider tile
          crawls beyond the patch on a stretching tendril */}
      {flourish === "creep" && (
        <>
          <span className="absolute block" style={{ left: "53%", top: "46%", width: "12%", height: "0.8%", rotate: "18deg" }}>
            <span className="cwp-beam absolute inset-0 block" style={{ background: `linear-gradient(90deg, ${tint(p1, 0.9)}, ${tint(p2, 0.4)})`, animationDelay: `${delayMs + 820}ms` }} />
          </span>
          <span className="cwp-spreadtile absolute block" style={{ left: "62%", top: "48%", width: "7.5%", height: "5.4%", animationDelay: `${delayMs + 1020}ms` }}>
            <svg viewBox="0 0 14 10" className="block h-full w-full" aria-hidden="true">
              <path d="M7 0.6 L13.4 5 L7 9.4 L0.6 5 Z" fill={tint(p0, 0.8)} stroke={tint(p1, 0.9)} strokeWidth="0.7" {...SJ} />
            </svg>
          </span>
          <span className="cwp-sprout absolute block" style={{ left: "64.6%", top: "43%", width: "2.6%", height: "5%", animationDelay: `${delayMs + 1180}ms` }}>
            <svg viewBox="0 0 6 10" className="block h-full w-full" aria-hidden="true">
              <path d="M3 9.6 C3 5.4 4.2 4 5 2.4 M3 9.6 C3 6.6 2.2 4.6 1.4 3.6" fill="none" stroke={tint(p1, 0.9)} strokeWidth="0.7" strokeLinecap="round" />
            </svg>
          </span>
        </>
      )}
      {/* bespoke: Gravebloom — a burial mound rises off-patch and two long-
          memoried flowers open over it */}
      {flourish === "gravebloom" && (
        <>
          <span className="cwp-rise absolute block" style={{ left: "58%", top: "56%", width: "12%", height: "8%", animationDelay: `${delayMs + 620}ms` }}>
            <svg viewBox="0 0 16 10" className="block h-full w-full" aria-hidden="true">
              <path d="M1 9.4 C1 4.6 4 2 8 2 C12 2 15 4.6 15 9.4 Z" fill={tint(p0, 0.85)} stroke={tint(p1, 0.8)} strokeWidth="0.6" {...SJ} />
              <path d="M8 5.8 V3 M6.8 4 H9.2" stroke={tint(p2, 0.85)} strokeWidth="0.6" strokeLinecap="round" />
            </svg>
          </span>
          {[
            { l: 59.5, t: 51, d: 0 },
            { l: 65, t: 52, d: 180 },
          ].map((v, i) => (
            <span key={i} className="cwp-sprout absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "3%", height: "6.5%", animationDelay: `${delayMs + 860 + v.d}ms` }}>
              <svg viewBox="0 0 6 12" className="block h-full w-full" aria-hidden="true">
                <path d="M3 11.4 V4.6" stroke={tint(p1, 0.85)} strokeWidth="0.6" strokeLinecap="round" />
                <circle cx="3" cy="3" r="1.9" fill="#c94a5a" stroke={tint(p2, 0.8)} strokeWidth="0.4" />
                <circle cx="3" cy="3" r="0.6" fill="#ffd76a" />
              </svg>
            </span>
          ))}
        </>
      )}
      {/* bespoke: Gathering Storm — three storm bands sweep in above the rot,
          each darker than the last, with one lightning glint at the crest */}
      {flourish === "stormwall" && (
        <>
          {[
            { t: 22, a: 0.35, d: 0, tx: "34%" },
            { t: 27, a: 0.5, d: 170, tx: "28%" },
            { t: 32, a: 0.65, d: 340, tx: "22%" },
          ].map((v, i) => (
            <span
              key={i}
              className="cwp-sweep absolute block"
              style={{ left: "20%", top: `${v.t}%`, width: "44%", height: "4.5%", borderRadius: "40%", background: tint(p0, v.a), "--tx": v.tx, animationDelay: `${delayMs + 560 + v.d}ms` } as CSSProperties}
            />
          ))}
          <span className="cwp-glint absolute block" style={{ left: "58%", top: "25%", width: "3.2%", height: "4.5%", animationDelay: `${delayMs + 1080}ms` }}>
            <svg viewBox="0 0 6 10" className="block h-full w-full" aria-hidden="true">
              <path d="M3.6 0.6 L1.4 5 H2.8 L1.8 9.4 L4.8 4.4 H3.2 L4.6 0.6 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.3" {...SJ} />
            </svg>
          </span>
        </>
      )}
      {/* wave3 Wandering Sentry — one barred tile paces a rank, marching its beat */}
      {flourish === "sentry" && (
        <>
          {[0, 1, 2].map((i) => (
            <span key={i} className="cwp-spreadtile absolute block" style={{ left: `${34 + i * 11}%`, top: "58%", width: "8%", height: "5.6%", animationDelay: `${delayMs + 600 + i * 240}ms` }}>
              <svg viewBox="0 0 14 10" className="block h-full w-full" aria-hidden="true"><path d="M7 0.6 L13.4 5 L7 9.4 L0.6 5 Z" fill={tint(p0, 0.8)} stroke={tint(p1, 0.9)} strokeWidth="0.6" {...SJ} /></svg>
            </span>
          ))}
          <span className="cwp-beam absolute block" style={{ left: "34%", top: "64%", width: "30%", height: "0.8%", background: tint(p1, 0.7), transformOrigin: "0% 50%", animationDelay: `${delayMs + 640}ms` }} />
        </>
      )}
      {/* wave3 Sinking Mire — a plus-shaped mire that shrinks one square per turn */}
      {flourish === "mire" && (
        <>
          {[
            { l: 46, t: 44, s: 8, d: 0 },
            { l: 38, t: 50, s: 7, d: 200 },
            { l: 54, t: 50, s: 7, d: 400 },
            { l: 46, t: 56, s: 6, d: 600 },
          ].map((v, i) => (
            <span key={i} className="cwp-spreadtile absolute block rounded-full" style={{ left: `${v.l}%`, top: `${v.t}%`, width: `${v.s}%`, height: `${v.s * 0.72}%`, background: tint(p0, 0.7), border: `1px solid ${tint(p1, 0.7)}`, animationDelay: `${delayMs + 500 + v.d}ms` }} />
          ))}
        </>
      )}
      {/* wave3 Miasma — a piece sickens beside its neighbours; a third dose freezes it */}
      {flourish === "miasma" && (
        <>
          {[38, 50, 60].map((l, i) => (
            <span key={l} className="cwp-tellglow absolute block rounded-full" style={{ left: `${l}%`, top: "50%", width: "8%", height: "8%", background: tint(p1, 0.4), animationDelay: `${delayMs + 620 + i * 170}ms` }} />
          ))}
          <span className="cwp-hold absolute block" style={{ left: "56%", top: "54%", width: "5.5%", height: "8%", animationDelay: `${delayMs + 900}ms` }}>
            <Man kind="n" fill={tint(p1, 0.9)} stroke={p2} />
          </span>
          <span className="cwp-crack absolute block" style={{ left: "56%", top: "54%", width: "5.5%", height: "8%", animationDelay: `${delayMs + 1060}ms` }}>
            <svg viewBox="0 0 8 8" className="block h-full w-full" aria-hidden="true"><path d="M4 0.6 L3 3 L5 4.4 L3.4 7.4" fill="none" stroke={tint(p2, 0.9)} strokeWidth="0.6" {...SJ} /></svg>
          </span>
        </>
      )}
      {/* wave3 Roaming Maw — a void drifts toward the nearest piece and devours it */}
      {flourish === "maw" && (
        <>
          <span className="cwp-tug absolute block rounded-full" style={{ left: "34%", top: "48%", width: "9%", height: "9%", background: `radial-gradient(circle, ${tint(p0, 0.98)}, ${tint(p2, 0.5)})`, "--dx": "220%", "--dy": "40%", animationDelay: `${delayMs + 560}ms` } as CSSProperties} />
          <span className="cwp-hold absolute block" style={{ left: "58%", top: "54%", width: "5.5%", height: "8%", animationDelay: `${delayMs + 620}ms` }}>
            <Man kind="r" fill={tint(p1, 0.9)} stroke={p2} />
          </span>
          <span className="cwp-settle absolute block" style={{ left: "59%", top: "54%", width: "3%", height: "4%", "--dx": "-30%", "--dy": "80%", "--rot": "120deg", animationDelay: `${delayMs + 980}ms` } as CSSProperties}>
            <Mote color={tint(p2, 0.8)} />
          </span>
        </>
      )}
      {/* wave3 Wildfire Rot — rot spreads comrade to comrade along a burning tendril */}
      {flourish === "wildfire" && (
        <>
          {[
            { l: 36, t: 52, d: 0 },
            { l: 48, t: 50, d: 200 },
            { l: 60, t: 52, d: 400 },
          ].map((v, i) => (
            <span key={i} className="absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "5%", height: "7.5%" }}>
              <span className="cwp-hold absolute inset-0 block" style={{ animationDelay: `${delayMs + 560 + v.d}ms` }}>
                <Man kind="p" fill={tint(p1, 0.9)} stroke={p2} />
              </span>
              <span className="cwp-gild absolute inset-0 block" style={{ animationDelay: `${delayMs + 720 + v.d}ms` }}>
                <Man kind="p" fill="#c95a2a" stroke={p0} />
              </span>
            </span>
          ))}
          {[42, 54].map((l, i) => (
            <span key={l} className="cwp-cinder absolute block" style={{ left: `${l}%`, top: "50%", width: "1.6%", height: "1.6%", "--dx": "30%", animationDelay: `${delayMs + 900 + i * 130}ms` } as CSSProperties}>
              <Mote color="#ff9d3d" />
            </span>
          ))}
        </>
      )}
      {/* wave3 Effigy of Dread — a caster's effigy rises and bars the ring around it */}
      {flourish === "effigy" && (
        <>
          <span className="cwp-rise absolute block" style={{ left: "46%", top: "44%", width: "8%", height: "16%", animationDelay: `${delayMs + 560}ms` }}>
            <svg viewBox="0 0 8 16" className="block h-full w-full" aria-hidden="true">
              <path d="M4 3.4 V14.8 M1 5.6 H7" stroke={tint(p2, 0.9)} strokeWidth="1" strokeLinecap="round" />
              <circle cx="4" cy="2.4" r="1.4" fill={tint(p1, 0.9)} stroke={p0} strokeWidth="0.4" />
            </svg>
          </span>
          {[
            { l: 38, t: 40 }, { l: 58, t: 40 }, { l: 38, t: 58 }, { l: 58, t: 58 },
          ].map((v, i) => (
            <span key={i} className="cwp-spreadtile absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "6%", height: "4.4%", animationDelay: `${delayMs + 820 + i * 90}ms` }}>
              <svg viewBox="0 0 14 10" className="block h-full w-full" aria-hidden="true"><path d="M7 0.6 L13.4 5 L7 9.4 L0.6 5 Z" fill={tint(p0, 0.8)} stroke={tint(p1, 0.85)} strokeWidth="0.6" {...SJ} /></svg>
            </span>
          ))}
        </>
      )}
      {/* wave3 Avalanche — after a dormant fuse the empty squares of a half are sealed */}
      {flourish === "avalanche" && (
        <>
          {[
            { t: 24, a: 0.4, d: 0, tx: "30%" },
            { t: 30, a: 0.6, d: 180, tx: "24%" },
            { t: 36, a: 0.8, d: 360, tx: "18%" },
          ].map((v, i) => (
            <span key={i} className="cwp-sweep absolute block" style={{ left: "22%", top: `${v.t}%`, width: "44%", height: "5%", borderRadius: "40%", background: tint(p1, v.a), "--tx": v.tx, animationDelay: `${delayMs + 520 + v.d}ms` } as CSSProperties} />
          ))}
          {[40, 52, 62].map((l, i) => (
            <span key={l} className="cwp-spreadtile absolute block" style={{ left: `${l}%`, top: "56%", width: "6%", height: "4.4%", animationDelay: `${delayMs + 1000 + i * 100}ms` }}>
              <svg viewBox="0 0 14 10" className="block h-full w-full" aria-hidden="true"><path d="M7 0.6 L13.4 5 L7 9.4 L0.6 5 Z" fill={tint(p0, 0.8)} stroke={tint(p2, 0.7)} strokeWidth="0.6" {...SJ} /></svg>
            </span>
          ))}
        </>
      )}
      <SettlePair color={tint(p1, 0.7)} delayMs={delayMs + 1150} />
    </Stage>
  );
}

/* =============================================================================
   Template 4: ChainWeb — two spectral chains WHIP across the board (the lash
   overshoot is the signature beat) and cinch into a shackle ring holding the
   card's glyph.
   Flourishes: twin, noreins, recoil, ransom, courtlock.
   ========================================================================== */
function ChainWeb({ palette, glyph, lead, role, delayMs, flourish, aim }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} mark={MARK.shackle(palette)} />;
  if (!lead) return <CurseHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const chain = (alpha: number) => `repeating-linear-gradient(90deg, ${tint(p1, alpha)} 0 7px, transparent 7px 12px)`;
  return (
    // FLAGSHIP: the stage jolts as the shackle cinches shut
    <Stage quakeAtMs={delayMs + 620}>
      <Wash color={tint(p0, 0.24)} delayMs={delayMs} />
      {aim && <ChainLeg color={tint(p1, 0.9)} delayMs={delayMs + 300} />}
      <Tell color={tint(p1, 0.34)} delayMs={delayMs} left={42} top={40} />
      {/* per-card impact accent: this flourish's own laser / shatter / blast */}
      {flourish && FLOURISH_IMPACT[flourish] && <ImpactCell spec={FLOURISH_IMPACT[flourish]} rgb={rgbOf(p1)} delayMs={delayMs} />}
      {/* SIGNATURE: the two chain lashes, whipped across with overshoot */}
      <span className="absolute block" style={{ left: "22%", top: "38%", width: "56%", height: "1.2%", rotate: "14deg" }}>
        <span className="cwp-lash absolute inset-0 block" style={{ background: chain(0.9), animationDelay: `${delayMs + 260}ms` }} />
      </span>
      <span className="absolute block" style={{ left: "24%", top: "58%", width: "54%", height: "1.2%", rotate: "-12deg" }}>
        <span className="cwp-lash absolute inset-0 block" style={{ background: chain(0.75), animationDelay: `${delayMs + 400}ms` }} />
      </span>
      {/* the shackle cinching shut where the chains cross */}
      <span className="cwp-pop absolute block" style={{ left: "39%", top: "36%", width: "22%", height: "22%", animationDelay: `${delayMs + 620}ms` }}>
        <svg viewBox="0 0 24 24" className="block h-full w-full" aria-hidden="true">
          <circle cx="12" cy="13.4" r="8.6" fill={tint(p0, 0.5)} stroke={tint(p1, 0.95)} strokeWidth="1.6" />
          <path d="M7.6 6.4 C7.6 1.8 16.4 1.8 16.4 6.4" fill="none" stroke={tint(p1, 0.95)} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="12" cy="13.4" r="5.4" fill="none" stroke={tint(p2, 0.6)} strokeWidth="0.5" strokeDasharray="1.8 1.4" />
        </svg>
        <span className="cwp-facein absolute block" style={{ left: "31%", top: "37%", width: "38%", height: "38%", animationDelay: `${delayMs + 780}ms` }}>{glyph}</span>
      </span>
      <span className="cwp-glint absolute block" style={{ left: "48.4%", top: "34%", width: "3.2%", height: "3.2%", animationDelay: `${delayMs + 860}ms` }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 0.8 L6 4 L9.2 5 L6 6 L5 9.2 L4 6 L0.8 5 L4 4 Z" fill={tint(p2, 0.95)} />
        </svg>
      </span>
      {/* bespoke: Twinned Torment — knight and bishop stitched by one thread;
          the knight jerks and the bishop shudders in sympathy */}
      {flourish === "twin" && (
        <>
          <span className="cwp-tug absolute block" style={{ left: "28%", top: "63%", width: "5.5%", height: "8%", "--dx": "90%", "--dy": "-10%", animationDelay: `${delayMs + 720}ms` } as CSSProperties}>
            <Man kind="n" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="absolute block" style={{ left: "34%", top: "66%", width: "30%", height: "0.7%", rotate: "2deg" }}>
            <span className="cwp-beam absolute inset-0 block" style={{ background: `repeating-linear-gradient(90deg, ${tint(p2, 0.9)} 0 4px, transparent 4px 7px)`, animationDelay: `${delayMs + 800}ms` }} />
          </span>
          <span className="cwp-hold absolute block" style={{ left: "64%", top: "62.5%", width: "5.5%", height: "8%", animationDelay: `${delayMs + 880}ms` }}>
            <Man kind="b" fill={tint(p2, 0.95)} stroke={p1} />
          </span>
        </>
      )}
      {/* bespoke: No Reins — the snapped rein whips loose while the runaway
          rook bolts clean across the field */}
      {flourish === "noreins" && (
        <>
          <span className="absolute block" style={{ left: "30%", top: "24%", width: "18%", height: "0.9%", rotate: "-24deg" }}>
            <span className="cwp-lash absolute inset-0 block" style={{ background: `linear-gradient(90deg, #8a6a3a, ${tint(p1, 0.4)})`, animationDelay: `${delayMs + 620}ms` }} />
          </span>
          <span className="cwp-tug absolute block" style={{ left: "27%", top: "27%", width: "6%", height: "8.5%", "--dx": "560%", "--dy": "0%", animationDelay: `${delayMs + 700}ms` } as CSSProperties}>
            <Man kind="r" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          {[0, 1].map((i) => (
            <span key={i} className="cwp-glint absolute block" style={{ left: `${46 + i * 12}%`, top: "31%", width: "1.8%", height: "1.8%", animationDelay: `${delayMs + 900 + i * 150}ms` }}>
              <Mote color={tint(p2, 0.85)} />
            </span>
          ))}
        </>
      )}
      {/* bespoke: Curse of Recoil — the bishop lunges, strikes, and is flung
          straight back to where it started, impact glint left behind */}
      {flourish === "recoil" && (
        <>
          <span className="cwp-snapback absolute block" style={{ left: "30%", top: "64%", width: "5.5%", height: "8%", "--dx": "300%", "--dy": "-6%", animationDelay: `${delayMs + 680}ms` } as CSSProperties}>
            <Man kind="b" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="cwp-glint absolute block" style={{ left: "48%", top: "63%", width: "3.6%", height: "3.6%", animationDelay: `${delayMs + 900}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.6 L6.2 3.8 L9.4 5 L6.2 6.2 L5 9.4 L3.8 6.2 L0.6 5 L3.8 3.8 Z" fill="#ffd76a" />
            </svg>
          </span>
          <span className="cwp-settle absolute block" style={{ left: "50%", top: "66%", width: "1.4%", height: "1.4%", "--dx": "40%", "--dy": "120%", "--rot": "90deg", animationDelay: `${delayMs + 1060}ms` } as CSSProperties}>
            <Mote color={tint(p2, 0.8)} />
          </span>
        </>
      )}
      {/* bespoke: Queen's Ransom — her majesty strides free while two pawns of
          her escort are chained down as surety */}
      {flourish === "ransom" && (
        <>
          <span className="cwp-tug absolute block" style={{ left: "44%", top: "62%", width: "6.5%", height: "9.5%", "--dx": "140%", "--dy": "0%", animationDelay: `${delayMs + 680}ms` } as CSSProperties}>
            <Man kind="q" fill={tint(p2, 0.98)} stroke={p1} />
          </span>
          {[
            { l: 30, t: 66 },
            { l: 37, t: 68 },
          ].map((v, i) => (
            <span key={i}>
              <span className="cwp-hold absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "4.2%", height: "6%", animationDelay: `${delayMs + 760 + i * 120}ms` }}>
                <Man kind="p" fill={tint(p1, 0.9)} stroke={p2} />
              </span>
              <span className="absolute block" style={{ left: `${v.l + 3}%`, top: `${v.t + 5.4}%`, width: "6%", height: "0.6%", rotate: `${i ? -10 : 12}deg` }}>
                <span className="cwp-beam absolute inset-0 block" style={{ background: `repeating-linear-gradient(90deg, ${tint(p1, 0.85)} 0 4px, transparent 4px 7px)`, animationDelay: `${delayMs + 840 + i * 120}ms` }} />
              </span>
            </span>
          ))}
        </>
      )}
      {/* bespoke: Chains of the Court — the minors are locked under one
          padlock, and the key glints far away at the board's center */}
      {flourish === "courtlock" && (
        <>
          {[
            { k: "n" as const, l: 29, t: 64 },
            { k: "b" as const, l: 36, t: 65 },
          ].map((v, i) => (
            <span key={i} className="cwp-hold absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "5%", height: "7%", animationDelay: `${delayMs + 700 + i * 110}ms` }}>
              <Man kind={v.k} fill={tint(p1, 0.9)} stroke={p2} />
            </span>
          ))}
          <span className="cwp-pop absolute block" style={{ left: "31.5%", top: "57%", width: "5.5%", height: "6.5%", animationDelay: `${delayMs + 880}ms` }}>
            <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
              <path d="M3 5 V3.4 C3 0.8 7 0.8 7 3.4 V5" fill="none" stroke={tint(p2, 0.95)} strokeWidth="0.9" strokeLinecap="round" />
              <rect x="1.8" y="5" width="6.4" height="5.6" rx="1" fill={tint(p0, 0.9)} stroke={tint(p2, 0.95)} strokeWidth="0.7" />
              <circle cx="5" cy="7.6" r="0.9" fill={tint(p2, 0.95)} />
            </svg>
          </span>
          <span className="cwp-glint absolute block" style={{ left: "60%", top: "48%", width: "3.4%", height: "3%", animationDelay: `${delayMs + 1080}ms` }}>
            <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
              <circle cx="3" cy="4" r="2.2" fill="none" stroke="#ffd76a" strokeWidth="0.9" />
              <path d="M5.2 4 H10.6 M8.6 4 V6 M10.2 4 V5.6" stroke="#ffd76a" strokeWidth="0.9" strokeLinecap="round" />
            </svg>
          </span>
        </>
      )}
      {/* wave3 Binding Oath — two pieces bound by one thread may not strike while both live */}
      {flourish === "bindingoath" && (
        <>
          <span className="cwp-hold absolute block" style={{ left: "30%", top: "62%", width: "5.5%", height: "8%", animationDelay: `${delayMs + 720}ms` }}>
            <Man kind="n" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="absolute block" style={{ left: "35%", top: "65%", width: "30%", height: "0.7%", rotate: "2deg" }}>
            <span className="cwp-beam absolute inset-0 block" style={{ background: `repeating-linear-gradient(90deg, ${tint(p1, 0.9)} 0 5px, transparent 5px 9px)`, animationDelay: `${delayMs + 820}ms` }} />
          </span>
          <span className="cwp-hold absolute block" style={{ left: "64%", top: "62%", width: "5.5%", height: "8%", animationDelay: `${delayMs + 900}ms` }}>
            <Man kind="r" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="cwp-pop absolute block" style={{ left: "47%", top: "62.5%", width: "5%", height: "5%", animationDelay: `${delayMs + 1020}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true"><path d="M2 5 L5 2 L8 5 L5 8 Z M3.4 5 H6.6" fill="none" stroke="#c94a5a" strokeWidth="0.8" {...SJ} /></svg>
          </span>
        </>
      )}
      {/* wave3 Blood Bond — one bound piece captures, its partner freezes in sympathy */}
      {flourish === "bloodbond" && (
        <>
          <span className="cwp-tug absolute block" style={{ left: "28%", top: "62%", width: "5.5%", height: "8%", "--dx": "80%", "--dy": "-6%", animationDelay: `${delayMs + 720}ms` } as CSSProperties}>
            <Man kind="b" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="absolute block" style={{ left: "34%", top: "65%", width: "30%", height: "0.7%", rotate: "-2deg" }}>
            <span className="cwp-lash absolute inset-0 block" style={{ background: `repeating-linear-gradient(90deg, ${tint(p2, 0.9)} 0 4px, transparent 4px 7px)`, animationDelay: `${delayMs + 820}ms` }} />
          </span>
          <span className="absolute block" style={{ left: "64%", top: "62%", width: "5.5%", height: "8%" }}>
            <span className="cwp-hold absolute inset-0 block" style={{ animationDelay: `${delayMs + 900}ms` }}>
              <Man kind="n" fill={tint(p1, 0.95)} stroke={p2} />
            </span>
            <span className="cwp-gild absolute inset-0 block" style={{ animationDelay: `${delayMs + 1040}ms` }}>
              <Man kind="n" fill="#9fd8ff" stroke={p0} />
            </span>
          </span>
        </>
      )}
      {/* wave3 Shared Fate — capturing one of a bound pair kills the other outright */}
      {flourish === "sharedfate" && (
        <>
          <span className="cwp-snapback absolute block" style={{ left: "28%", top: "62%", width: "5.5%", height: "8%", "--dx": "60%", "--dy": "0%", animationDelay: `${delayMs + 720}ms` } as CSSProperties}>
            <Man kind="r" fill={tint(p2, 0.85)} stroke={p1} />
          </span>
          <span className="absolute block" style={{ left: "34%", top: "65%", width: "30%", height: "0.7%", rotate: "0deg" }}>
            <span className="cwp-beam absolute inset-0 block" style={{ background: `linear-gradient(90deg, ${tint(p1, 0.9)}, #c94a5a)`, animationDelay: `${delayMs + 860}ms` }} />
          </span>
          <span className="cwp-settle absolute block" style={{ left: "64%", top: "62%", width: "5.5%", height: "8%", "--dx": "0%", "--dy": "70%", "--rot": "18deg", animationDelay: `${delayMs + 1000}ms` } as CSSProperties}>
            <Man kind="r" fill={tint(p1, 0.9)} stroke={p2} />
          </span>
        </>
      )}
      {/* wave3 Standing Guard — each king move freezes the piece nearest the king */}
      {flourish === "kingsguard" && (
        <>
          <span className="cwp-tug absolute block" style={{ left: "42%", top: "58%", width: "6%", height: "9%", "--dx": "40%", "--dy": "0%", animationDelay: `${delayMs + 720}ms` } as CSSProperties}>
            <Man kind="k" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="absolute block" style={{ left: "58%", top: "58%", width: "6%", height: "9%" }}>
            <span className="cwp-hold absolute inset-0 block" style={{ animationDelay: `${delayMs + 860}ms` }}>
              <Man kind="b" fill={tint(p1, 0.95)} stroke={p2} />
            </span>
            <span className="cwp-gild absolute inset-0 block" style={{ animationDelay: `${delayMs + 1000}ms` }}>
              <Man kind="b" fill="#9fd8ff" stroke={p0} />
            </span>
          </span>
        </>
      )}
      {/* wave3 No Retreat — a rein snaps taut behind a piece pulled back from its own rank */}
      {flourish === "noretreat" && (
        <>
          <span className="cwp-snapback absolute block" style={{ left: "44%", top: "48%", width: "6%", height: "9%", "--dx": "10%", "--dy": "140%", animationDelay: `${delayMs + 700}ms` } as CSSProperties}>
            <Man kind="r" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="absolute block" style={{ left: "40%", top: "44%", width: "16%", height: "0.9%", rotate: "-70deg" }}>
            <span className="cwp-lash absolute inset-0 block" style={{ background: `repeating-linear-gradient(90deg, ${tint(p1, 0.9)} 0 6px, transparent 6px 10px)`, animationDelay: `${delayMs + 840}ms` }} />
          </span>
        </>
      )}
      <SettlePair color={tint(p1, 0.7)} delayMs={delayMs + 1180} />
    </Stage>
  );
}

/* =============================================================================
   Template 5: MidasVeil — a gilded veil sweeps the ranks; the figures it
   crosses GILD one after another (the signature beat) and the card's glyph
   glows in the veil's wake.
   Flourishes: coin, gilded.
   ========================================================================== */
const VEIL_MEN = [
  { k: "p" as const, l: 34, t: 47, d: 0 },
  { k: "n" as const, l: 44, t: 45, d: 170 },
  { k: "r" as const, l: 54, t: 46, d: 340 },
];
function MidasVeil({ palette, glyph, lead, role, delayMs, flourish, aim }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} mark={MARK.veil(palette)} />;
  if (!lead) return <CurseHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    // FLAGSHIP: the stage shivers as the gold sets across the rank
    <Stage quakeAtMs={delayMs + 880}>
      <Wash color={tint(p0, 0.22)} delayMs={delayMs} />
      {aim && <ChainLeg color={tint(p1, 0.9)} delayMs={delayMs + 300} />}
      <Tell color={tint(p1, 0.35)} delayMs={delayMs} left={30} top={42} />
      {/* per-card impact accent: this flourish's own laser / shatter / blast */}
      {flourish && FLOURISH_IMPACT[flourish] && <ImpactCell spec={FLOURISH_IMPACT[flourish]} rgb={rgbOf(p1)} delayMs={delayMs} />}
      {/* the veil itself, a soft gold curtain crossing the ranks */}
      <span
        className="cwp-sweep absolute block"
        style={{ left: "24%", top: "38%", width: "18%", height: "24%", borderRadius: "45%", background: `linear-gradient(90deg, transparent, ${tint(p1, 0.55)}, transparent)`, "--tx": "180%", animationDelay: `${delayMs + 240}ms` } as CSSProperties}
      />
      {/* SIGNATURE: the rank gilds figure by figure as the veil passes */}
      {VEIL_MEN.map((v, i) => (
        <span key={i} className="absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "5.5%", height: "8%" }}>
          <span className="cwp-hold absolute inset-0 block" style={{ animationDelay: `${delayMs + 420 + v.d}ms` }}>
            <Man kind={v.k} fill={tint(p2, 0.9)} stroke={p0} />
          </span>
          <span className="cwp-gild absolute inset-0 block" style={{ animationDelay: `${delayMs + 560 + v.d}ms` }}>
            <Man kind={v.k} fill={tint(p1, 0.95)} stroke={p0} />
          </span>
        </span>
      ))}
      <span className="cwp-pop absolute block" style={{ left: "44.5%", top: "58%", width: "10%", height: "10%", animationDelay: `${delayMs + 880}ms` }}>{glyph}</span>
      {/* bespoke: Cursed Coin — the coin itself arcs from the gilded holder to
          the comrade who strayed too close, who shivers as it lands */}
      {flourish === "coin" && (
        <>
          <span className="cwp-spark absolute block" style={{ left: "37%", top: "42%", width: "2.8%", height: "2.8%", "--dx": "700%", "--dy": "-90%", "--rot": "540deg", animationDelay: `${delayMs + 760}ms` } as CSSProperties}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <circle cx="5" cy="5" r="4.2" fill="#e8b04b" stroke="#8a6a3a" strokeWidth="0.6" />
              <path d="M5 2.4 C6.6 3.6 6.6 6.4 5 7.6 C3.4 6.4 3.4 3.6 5 2.4 Z" fill="none" stroke="#8a6a3a" strokeWidth="0.5" />
            </svg>
          </span>
          <span className="cwp-hold absolute block" style={{ left: "62%", top: "38%", width: "5.5%", height: "8%", animationDelay: `${delayMs + 1060}ms` }}>
            <Man kind="b" fill={tint(p2, 0.95)} stroke={p0} />
          </span>
          <span className="cwp-glint absolute block" style={{ left: "63.6%", top: "35%", width: "2.4%", height: "2.4%", animationDelay: `${delayMs + 1180}ms` }}>
            <Mote color="#e8b04b" />
          </span>
        </>
      )}
      {/* bespoke: Gilded Rot — the gold is a sickness: rot-flecks bloom on the
          gilded figures and flake off in a golden drizzle */}
      {flourish === "gilded" && (
        <>
          {[
            { l: 36, t: 45, d: 0 },
            { l: 46, t: 43.6, d: 160 },
            { l: 56, t: 45, d: 320 },
          ].map((v, i) => (
            <span key={i} className="cwp-glint absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "1.8%", height: "1.8%", animationDelay: `${delayMs + 900 + v.d}ms` }}>
              <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
                <circle cx="5" cy="5" r="3.6" fill="#6b4a2a" stroke="#e8b04b" strokeWidth="0.8" />
              </svg>
            </span>
          ))}
          {[
            { l: 38, t: 52, dx: "-40%" },
            { l: 50, t: 51, dx: "30%" },
            { l: 58, t: 52.5, dx: "60%" },
          ].map((v, i) => (
            <span key={`f${i}`} className="cwp-settle absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "1.3%", height: "1.3%", "--dx": v.dx, "--dy": "160%", "--rot": "120deg", animationDelay: `${delayMs + 1040 + i * 130}ms` } as CSSProperties}>
              <Mote color="#e8b04b" />
            </span>
          ))}
        </>
      )}
      {/* wave3 Fifth Column — an enemy pawn's coat turns to serve the caster, then reverts */}
      {flourish === "fifthcolumn" && (
        <span className="absolute block" style={{ left: "56%", top: "40%", width: "6%", height: "9%" }}>
          <span className="cwp-swapout absolute inset-0 block" style={{ animationDelay: `${delayMs + 760}ms` }}>
            <Man kind="p" fill="#8a94a8" stroke="#2a2a30" />
          </span>
          <span className="cwp-swapin absolute inset-0 block" style={{ animationDelay: `${delayMs + 760}ms` }}>
            <Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
        </span>
      )}
      {/* wave3 Handed Down — the curse hops off a captured bearer to the nearest comrade */}
      {flourish === "handeddown" && (
        <>
          <span className="cwp-settle absolute block" style={{ left: "37%", top: "44%", width: "5%", height: "7%", "--dx": "10%", "--dy": "90%", "--rot": "20deg", animationDelay: `${delayMs + 760}ms` } as CSSProperties}>
            <Man kind="n" fill={tint(p2, 0.85)} stroke={p0} />
          </span>
          <span className="cwp-spark absolute block" style={{ left: "42%", top: "44%", width: "2.6%", height: "2.6%", "--dx": "520%", "--dy": "-40%", "--rot": "420deg", animationDelay: `${delayMs + 860}ms` } as CSSProperties}>
            <Mote color={tint(p1, 0.95)} />
          </span>
          <span className="absolute block" style={{ left: "62%", top: "40%", width: "5.5%", height: "8%" }}>
            <span className="cwp-hold absolute inset-0 block" style={{ animationDelay: `${delayMs + 980}ms` }}>
              <Man kind="b" fill={tint(p2, 0.9)} stroke={p0} />
            </span>
            <span className="cwp-gild absolute inset-0 block" style={{ animationDelay: `${delayMs + 1120}ms` }}>
              <Man kind="b" fill={tint(p1, 0.95)} stroke={p0} />
            </span>
          </span>
        </>
      )}
      {/* wave3 Mutiny — the first enemy knight to capture defects across the lines */}
      {flourish === "mutiny" && (
        <span className="absolute block" style={{ left: "36%", top: "40%", width: "6.5%", height: "10%" }}>
          <span className="cwp-swapout absolute inset-0 block" style={{ animationDelay: `${delayMs + 760}ms` }}>
            <Man kind="n" fill="#8a94a8" stroke="#2a2a30" />
          </span>
          <span className="cwp-tug absolute inset-0 block" style={{ "--dx": "220%", "--dy": "0%", animationDelay: `${delayMs + 900}ms` } as CSSProperties}>
            <Man kind="n" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
        </span>
      )}
      {/* wave3 Sleeper Cell — a marked minor waits on a fuse, then turns its coat */}
      {flourish === "sleeper" && (
        <>
          <span className="absolute block" style={{ left: "44%", top: "42%", width: "6.5%", height: "10%" }}>
            <span className="cwp-hold absolute inset-0 block" style={{ animationDelay: `${delayMs + 620}ms` }}>
              <Man kind="b" fill="#8a94a8" stroke="#2a2a30" />
            </span>
            <span className="cwp-swapin absolute inset-0 block" style={{ animationDelay: `${delayMs + 980}ms` }}>
              <Man kind="b" fill={tint(p1, 0.95)} stroke={p2} />
            </span>
          </span>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="cwp-glint absolute block" style={{ left: `${44 + i * 3}%`, top: "36%", width: "1.8%", height: "1.8%", animationDelay: `${delayMs + 700 + i * 120}ms` }}>
              <Mote color={tint(p1, 0.9)} />
            </span>
          ))}
        </>
      )}
      {/* wave3 Aging Blade — a heavy piece that captures ages one rank down on the spot */}
      {flourish === "agingblade" && (
        <span className="absolute block" style={{ left: "44%", top: "40%", width: "6.5%", height: "10%" }}>
          <span className="cwp-swapout absolute inset-0 block" style={{ animationDelay: `${delayMs + 820}ms` }}>
            <Man kind="q" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="cwp-swapin absolute inset-0 block" style={{ animationDelay: `${delayMs + 820}ms` }}>
            <Man kind="n" fill={tint(p2, 0.85)} stroke={p0} />
          </span>
        </span>
      )}
      <SettlePair color={tint(p1, 0.75)} delayMs={delayMs + 1240} />
    </Stage>
  );
}

/* =============================================================================
   Bespoke scenes — tier 7–8 flagships, one component per card.
   ========================================================================== */

interface SceneProps {
  lead: boolean;
  role: SigRole;
  delayMs: number;
}

/* --- Death Knell: the great cracked bell descends over the doomed piece,
   tolls four counted strokes, and the numeral IV burns down to I. ---------- */
const KNELL: Palette = ["#2a1030", "#c9b0e8", "#8a94a8"];
function DeathKnellScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = KNELL;
  if (role === "entrance") return <EntranceCut palette={KNELL} glyph={GLYPH.hw2_death_knell} delayMs={delayMs} />;
  if (!lead) return <CurseHit palette={KNELL} glyph={GLYPH.hw2_death_knell} delayMs={delayMs} />;
  return (
    // FLAGSHIP: the stage rocks with the first counted stroke
    <Stage quakeAtMs={delayMs + 700}>
      <Wash color={tint(p0, 0.3)} delayMs={delayMs} />
      <Tell color={tint(p1, 0.35)} delayMs={delayMs} left={41} top={22} />
      {/* the fourth stroke falls as a column of grave-light on the doomed
          queen, and her ghost-preview splits in half — the knell shown true */}
      <ImpactCell spec={{ l: 44, t: 52, s: 12, at: 1270, laser: true, man: "q", shock: true }} rgb="201 176 232" delayMs={delayMs} />
      {/* the doomed one, shivering under the bell's shadow */}
      <span className="cwp-hold absolute block" style={{ left: "46.5%", top: "56%", width: "7%", height: "10%", animationDelay: `${delayMs + 480}ms` }}>
        <Man kind="q" fill={tint(p1, 0.9)} stroke={p0} />
      </span>
      {/* the great bell, filling the sky over the board */}
      <span className="cwp-drop absolute block" style={{ left: "33%", top: "12%", width: "34%", height: "40%", animationDelay: `${delayMs + 140}ms` }}>
        <span className="cwp-swing absolute inset-0 block" style={{ animationDelay: `${delayMs + 640}ms` }}>
          <svg viewBox="0 0 34 40" className="block h-full w-full" aria-hidden="true">
            <path d="M17 1 V5" stroke={tint(p2, 0.85)} strokeWidth="1.4" strokeLinecap="round" />
            <path d="M8 30 C8 15 11 7.5 17 5.6 C23 7.5 26 15 26 30 Z" fill={tint(p0, 0.85)} stroke={tint(p1, 0.95)} strokeWidth="1.4" {...SJ} />
            <path d="M6 30 H28 L26.8 33.6 H7.2 Z" fill={tint(p1, 0.85)} stroke={tint(p2, 0.6)} strokeWidth="0.6" {...SJ} />
            <circle cx="17" cy="36.4" r="2" fill={tint(p2, 0.95)} />
            {/* the long crack that gives the knell its voice */}
            <path d="M18.4 10 L16.6 15 L18.8 19.5 L16.8 25 L18.2 29" fill="none" stroke={tint(p2, 0.85)} strokeWidth="0.7" {...SJ} />
          </svg>
        </span>
      </span>
      {/* four counted strokes: toll rings, one per remaining turn */}
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="cwp-ring absolute block rounded-full"
          style={{ left: "31%", top: "40%", width: "38%", height: "26%", border: `2.5px solid ${tint(p1, 0.85 - i * 0.12)}`, animationDelay: `${delayMs + 700 + i * 190}ms` }}
        />
      ))}
      {/* the numeral counts down: IV flickers, then I burns */}
      <span className="cwp-facein absolute block" style={{ left: "63%", top: "30%", width: "9%", height: "8%", animationDelay: `${delayMs + 760}ms` }}>
        <svg viewBox="0 0 16 10" className="block h-full w-full" aria-hidden="true">
          <path d="M2.5 1.5 V8.5 M5.5 1.5 L7.5 8.5 L9.5 1.5" fill="none" stroke={tint(p1, 0.95)} strokeWidth="1.2" {...SJ} />
        </svg>
      </span>
      <span className="cwp-pop absolute block" style={{ left: "64.6%", top: "40%", width: "4%", height: "7%", animationDelay: `${delayMs + 1120}ms` }}>
        <svg viewBox="0 0 6 10" className="block h-full w-full" aria-hidden="true">
          <path d="M3 1.2 V8.8" stroke="#c94a5a" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
      {/* the bribe clause: a red droplet glints at the bell's lip */}
      <span className="cwp-glint absolute block" style={{ left: "48.8%", top: "48%", width: "2.4%", height: "3%", animationDelay: `${delayMs + 1300}ms` }}>
        <svg viewBox="0 0 8 10" className="block h-full w-full" aria-hidden="true">
          <path d="M4 0.8 C6 3.6 7 5.4 7 6.8 A3 3 0 1 1 1 6.8 C1 5.4 2 3.6 4 0.8 Z" fill="#c94a5a" />
        </svg>
      </span>
      {/* dust shaken off the boards by the tolling */}
      {[
        { l: 36, t: 62, dx: "-70%", d: 0 },
        { l: 60, t: 63, dx: "80%", d: 130 },
        { l: 48, t: 66, dx: "10%", d: 260 },
      ].map((v, i) => (
        <span key={i} className="cwp-settle absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "1.6%", height: "1.6%", "--dx": v.dx, "--dy": "130%", "--rot": "100deg", animationDelay: `${delayMs + 900 + v.d}ms` } as CSSProperties}>
          <Mote color={tint(p2, 0.7)} />
        </span>
      ))}
    </Stage>
  );
}

/* --- The Hollow Crown: a throne rises, the great crown lowers onto it and
   hollows to a shell, and the whole court bows into mourning. -------------- */
const HOLLOW: Palette = ["#2b1218", "#e8b04b", "#8a94a8"];
function HollowCrownScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = HOLLOW;
  if (role === "entrance") return <EntranceCut palette={HOLLOW} glyph={GLYPH.hw2_hollow_crown} delayMs={delayMs} />;
  if (!lead) return <CurseHit palette={HOLLOW} glyph={GLYPH.hw2_hollow_crown} delayMs={delayMs} />;
  return (
    // FLAGSHIP: the hall shudders the instant the crown hollows
    <Stage quakeAtMs={delayMs + 1040}>
      <Wash color={tint(p0, 0.3)} delayMs={delayMs} />
      <Tell color={tint(p1, 0.32)} delayMs={delayMs} left={42} top={30} />
      {/* gold light hammers the empty seat; the blast rolls off the dais */}
      <ImpactCell spec={{ l: 44, t: 26, s: 13, at: 1040, laser: true, shock: true }} rgb="232 176 75" delayMs={delayMs} />
      {/* the throne, shouldering up mid-board */}
      <span className="cwp-rise absolute block" style={{ left: "39%", top: "30%", width: "22%", height: "34%", animationDelay: `${delayMs + 160}ms` }}>
        <svg viewBox="0 0 22 34" className="block h-full w-full" aria-hidden="true">
          <path d="M4 32 V6 L7 9.5 V15 H15 V9.5 L18 6 V32 Z" fill={tint(p0, 0.9)} stroke={tint(p1, 0.85)} strokeWidth="1" {...SJ} />
          <path d="M2 32 H20" stroke={tint(p1, 0.85)} strokeWidth="1.2" strokeLinecap="round" />
          <path d="M7 20 H15 M7 24 H15" stroke={tint(p2, 0.5)} strokeWidth="0.6" strokeLinecap="round" />
        </svg>
      </span>
      {/* the crown lowers onto the empty seat... */}
      <span className="cwp-drop absolute block" style={{ left: "43.5%", top: "22%", width: "13%", height: "10%", animationDelay: `${delayMs + 520}ms` }}>
        <svg viewBox="0 0 14 10" className="block h-full w-full" aria-hidden="true">
          <path d="M1.6 8.4 V2.4 L4.4 4.8 L7 1 L9.6 4.8 L12.4 2.4 V8.4 Z" fill={tint(p1, 0.95)} stroke="#8a6a3a" strokeWidth="0.6" {...SJ} />
          <circle cx="7" cy="6" r="0.9" fill="#c94a5a" />
        </svg>
      </span>
      {/* ...and HOLLOWS: the solid crown gives way to a bare outline */}
      <span className="cwp-facein absolute block" style={{ left: "43.5%", top: "31.5%", width: "13%", height: "10%", animationDelay: `${delayMs + 1040}ms` }}>
        <svg viewBox="0 0 14 10" className="block h-full w-full" aria-hidden="true">
          <path d="M1.6 8.4 V2.4 L4.4 4.8 L7 1 L9.6 4.8 L12.4 2.4 V8.4 Z" fill="none" stroke={tint(p2, 0.9)} strokeWidth="0.7" strokeDasharray="1.6 1.1" {...SJ} />
        </svg>
      </span>
      {/* the court bows low on either side of the throne */}
      {[
        { k: "q" as const, l: 29, t: 52, d: 0, flip: false },
        { k: "b" as const, l: 35, t: 55, d: 130, flip: false },
        { k: "n" as const, l: 62, t: 54, d: 260, flip: true },
        { k: "r" as const, l: 68, t: 52, d: 390, flip: true },
      ].map((v, i) => (
        <span
          key={i}
          className="cwp-bow absolute block"
          style={{ left: `${v.l}%`, top: `${v.t}%`, width: "5.5%", height: "8%", animationDelay: `${delayMs + 820 + v.d}ms`, ...(v.flip ? { scale: "-1 1" } : {}) }}
        >
          <Man kind={v.k} fill={tint(p2, 0.85)} stroke={p0} />
        </span>
      ))}
      {/* mourning veils drift across the hall */}
      {[
        { t: 44, a: 0.3, d: 0, tx: "30%" },
        { t: 50, a: 0.45, d: 220, tx: "24%" },
      ].map((v, i) => (
        <span
          key={`v${i}`}
          className="cwp-sweep absolute block"
          style={{ left: "24%", top: `${v.t}%`, width: "50%", height: "3.5%", borderRadius: "40%", background: tint(p0, v.a), "--tx": v.tx, animationDelay: `${delayMs + 900 + v.d}ms` } as CSSProperties}
        />
      ))}
      <SettlePair color={tint(p1, 0.65)} delayMs={delayMs + 1350} />
    </Stage>
  );
}

/* --- Tide of Ash: the ash wall rolls in from the victim's board edge,
   swallowing rank-bands one by one while a pawn scrambles ahead of it. ----- */
const ASHTIDE: Palette = ["#3a3a40", "#c9c9cf", "#ff9d3d"];
function TideOfAshScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = ASHTIDE;
  if (role === "entrance") return <EntranceCut palette={ASHTIDE} glyph={GLYPH.hw2_tide_of_ash} delayMs={delayMs} />;
  if (!lead) return <CurseHit palette={ASHTIDE} glyph={GLYPH.hw2_tide_of_ash} delayMs={delayMs} />;
  return (
    // FLAGSHIP: the ground trembles under the rolling ash front
    <Stage quakeAtMs={delayMs + 620}>
      <Wash color={tint(p0, 0.3)} delayMs={delayMs} />
      {/* the front slams into the first rank: an ember blast at the wall face */}
      <ImpactCell spec={{ l: 26, t: 42, s: 14, at: 620, shock: true }} rgb="255 157 61" delayMs={delayMs} />
      {/* ...and the rook that waited too long is swallowed and torn apart */}
      <ImpactCell spec={{ l: 26, t: 42, s: 12, at: 1060, man: "r" }} rgb="201 201 207" delayMs={delayMs} />
      {/* the wall itself: a towering ash front rolling in from the left edge */}
      <span
        className="cwp-tidewall absolute block"
        style={{ left: "18%", top: "24%", width: "16%", height: "52%", borderRadius: "0 45% 45% 0", background: `linear-gradient(90deg, ${tint(p0, 0.95)}, ${tint(p0, 0.55)})`, boxShadow: `0 0 0 2px ${tint(p1, 0.35)}`, "--from": "-60%", animationDelay: `${delayMs + 160}ms` } as CSSProperties}
      />
      {/* rank-bands swallowed in order, 1st to 4th */}
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="cwp-spreadtile absolute block"
          style={{ left: `${23 + i * 8}%`, top: "28%", width: "7.5%", height: "44%", borderRadius: "12%", background: tint(p0, 0.72 - i * 0.1), animationDelay: `${delayMs + 520 + i * 230}ms` }}
        />
      ))}
      {/* embers riding the front */}
      {[
        { l: 30, t: 34, dx: "60%", d: 0 },
        { l: 34, t: 52, dx: "80%", d: 140 },
        { l: 28, t: 62, dx: "40%", d: 280 },
      ].map((v, i) => (
        <span key={i} className="cwp-cinder absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "1.6%", height: "1.6%", "--dx": v.dx, animationDelay: `${delayMs + 600 + v.d}ms` } as CSSProperties}>
          <Mote color={tint(p2, 0.9)} />
        </span>
      ))}
      {/* the evicted pawn, scrambling ahead of the tide */}
      <span className="cwp-flee absolute block" style={{ left: "38%", top: "56%", width: "5%", height: "7.5%", animationDelay: `${delayMs + 620}ms` }}>
        <Man kind="p" fill={tint(p1, 0.95)} stroke={p0} />
      </span>
      {/* and a rook that waited too long, held in the ash */}
      <span className="cwp-hold absolute block" style={{ left: "27%", top: "44%", width: "5.5%", height: "8%", animationDelay: `${delayMs + 900}ms` }}>
        <Man kind="r" fill={tint(p0, 0.95)} stroke={p1} />
      </span>
      {/* the receding promise: a far glint where the tide will stop */}
      <span className="cwp-glint absolute block" style={{ left: "56%", top: "48%", width: "3%", height: "3%", animationDelay: `${delayMs + 1320}ms` }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 0.8 L6 4 L9.2 5 L6 6 L5 9.2 L4 6 L0.8 5 L4 4 Z" fill={tint(p1, 0.9)} />
        </svg>
      </span>
      <SettlePair color={tint(p1, 0.6)} delayMs={delayMs + 1300} />
    </Stage>
  );
}

/* --- Crown of Thorns: the briar closes around your king; a reaching enemy
   blade is caught mid-strike and wrapped where it stands. ------------------ */
const THORNS: Palette = ["#2f3a26", "#8faf4a", "#c94a5a"];
function CrownOfThornsScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = THORNS;
  if (role === "entrance") return <EntranceCut palette={THORNS} glyph={GLYPH.hw2_crown_of_thorns} delayMs={delayMs} />;
  if (!lead) return <CurseHit palette={THORNS} glyph={GLYPH.hw2_crown_of_thorns} delayMs={delayMs} />;
  return (
    // FLAGSHIP: the stage jolts the instant the briar catches the blade
    <Stage quakeAtMs={delayMs + 1000}>
      <Wash color={tint(p0, 0.28)} delayMs={delayMs} />
      <Tell color={tint(p1, 0.32)} delayMs={delayMs} left={42} top={40} />
      {/* the thorn-snap: a green ground blast where the striker is seized */}
      <ImpactCell spec={{ l: 60, t: 42, s: 13, at: 1000, shock: true }} rgb="143 175 74" delayMs={delayMs} />
      {/* your king, the warded heart of the scene */}
      <span className="cwp-facein absolute block" style={{ left: "45%", top: "42%", width: "10%", height: "15%", animationDelay: `${delayMs + 220}ms` }}>
        <Man kind="k" fill={tint(p1, 0.95)} stroke={p0} />
      </span>
      {/* the briar ring, sprouting up around him from both sides */}
      {[
        { l: 36, t: 38, rot: "-14deg", d: 0, flip: false },
        { l: 56, t: 37, rot: "12deg", d: 150, flip: true },
        { l: 40, t: 55, rot: "-5deg", d: 300, flip: false },
        { l: 53, t: 56, rot: "8deg", d: 450, flip: true },
      ].map((v, i) => (
        <span
          key={i}
          className="cwp-sprout absolute block"
          style={{ left: `${v.l}%`, top: `${v.t}%`, width: "8%", height: "13%", rotate: v.rot, animationDelay: `${delayMs + 420 + v.d}ms`, ...(v.flip ? { scale: "-1 1" } : {}) }}
        >
          <svg viewBox="0 0 10 16" className="block h-full w-full" aria-hidden="true">
            <path d="M5 15.4 C3 11 6.6 9 4.6 5.4 C3.4 3.4 4.4 1.8 5.6 0.8" fill="none" stroke={tint(p1, 0.95)} strokeWidth="1" strokeLinecap="round" />
            <path d="M4.6 12 L2.8 11.4 M5.2 8.4 L7 8 M4.4 4.6 L2.8 4 M5.4 2.4 L7 2" stroke={tint(p1, 0.95)} strokeWidth="0.7" strokeLinecap="round" />
          </svg>
        </span>
      ))}
      {/* one red rose opens at the crown of the briar */}
      <span className="cwp-pop absolute block" style={{ left: "47.6%", top: "34%", width: "4.5%", height: "4.5%", animationDelay: `${delayMs + 1020}ms` }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <circle cx="5" cy="5" r="3.6" fill={p2} stroke={tint(p0, 0.9)} strokeWidth="0.5" />
          <path d="M5 2.4 C6.8 3.4 6.8 6.6 5 7.6 C3.2 6.6 3.2 3.4 5 2.4 Z" fill="none" stroke={tint(p0, 0.7)} strokeWidth="0.5" />
        </svg>
      </span>
      {/* the checking blade lunges in — and the thorns CATCH it */}
      <span className="cwp-snapback absolute block" style={{ left: "66%", top: "44%", width: "6%", height: "9%", "--dx": "-140%", "--dy": "2%", animationDelay: `${delayMs + 760}ms` } as CSSProperties}>
        <Man kind="b" fill={tint(p2, 0.9)} stroke={p0} />
      </span>
      <span className="absolute block" style={{ left: "60%", top: "49%", width: "9%", height: "0.8%", rotate: "-6deg" }}>
        <span className="cwp-lash absolute inset-0 block" style={{ background: `repeating-linear-gradient(90deg, ${tint(p1, 0.95)} 0 5px, transparent 5px 8px)`, animationDelay: `${delayMs + 1000}ms` }} />
      </span>
      <span className="cwp-glint absolute block" style={{ left: "64%", top: "42%", width: "2.6%", height: "2.6%", animationDelay: `${delayMs + 1180}ms` }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 0.8 L6 4 L9.2 5 L6 6 L5 9.2 L4 6 L0.8 5 L4 4 Z" fill="#bfe6ff" />
        </svg>
      </span>
      {/* fallen petals */}
      {[
        { l: 46, t: 40, dx: "-60%", d: 0 },
        { l: 52, t: 39, dx: "70%", d: 160 },
      ].map((v, i) => (
        <span key={i} className="cwp-settle absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "1.4%", height: "1.4%", "--dx": v.dx, "--dy": "170%", "--rot": "140deg", animationDelay: `${delayMs + 1150 + v.d}ms` } as CSSProperties}>
          <Mote color={tint(p2, 0.85)} />
        </span>
      ))}
    </Stage>
  );
}

/* --- Pauper's Crown: the queen's crown lifts off, shatters to shards, and
   rook battlements are stamped onto her brow in its place. ----------------- */
const PAUPER: Palette = ["#1c1c2a", "#c94ad1", "#c9b89a"];
function PauperCrownScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = PAUPER;
  if (role === "entrance") return <EntranceCut palette={PAUPER} glyph={GLYPH.hw2_pauper_crown} delayMs={delayMs} />;
  if (!lead) return <CurseHit palette={PAUPER} glyph={GLYPH.hw2_pauper_crown} delayMs={delayMs} />;
  return (
    // FLAGSHIP: the stage bucks when the battlements are stamped on
    <Stage quakeAtMs={delayMs + 1120}>
      <Wash color={tint(p0, 0.3)} delayMs={delayMs} />
      <Tell color={tint(p1, 0.35)} delayMs={delayMs} left={42} top={30} />
      {/* the deposing bolt: magenta light blasts the crown off her brow */}
      <ImpactCell spec={{ l: 44, t: 28, s: 12, at: 620, laser: true, shock: true }} rgb="201 74 209" delayMs={delayMs} />
      {/* her majesty, center stage and about to be greatly humbled */}
      <span className="cwp-facein absolute block" style={{ left: "42%", top: "36%", width: "16%", height: "24%", animationDelay: `${delayMs + 200}ms` }}>
        <Man kind="q" fill={tint(p1, 0.95)} stroke={p2} />
      </span>
      {/* the crown lifts away from her brow... */}
      <span className="cwp-lift absolute block" style={{ left: "45%", top: "33%", width: "10%", height: "7%", animationDelay: `${delayMs + 560}ms` }}>
        <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
          <path d="M1.4 6.6 V2 L3.8 4 L6 1 L8.2 4 L10.6 2 V6.6 Z" fill="#e8b04b" stroke="#8a6a3a" strokeWidth="0.5" {...SJ} />
        </svg>
      </span>
      {/* ...and shatters into three golden shards */}
      {[
        { l: 47, t: 26, dx: "-220%", dy: "-120%", rot: "-160deg", d: 0 },
        { l: 50, t: 25, dx: "40%", dy: "-220%", rot: "80deg", d: 70 },
        { l: 53, t: 26, dx: "240%", dy: "-100%", rot: "200deg", d: 140 },
      ].map((v, i) => (
        <span key={i} className="cwp-spark absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "2.2%", height: "2.2%", "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + 940 + v.d}ms` } as CSSProperties}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M2 8 L5 1 L8 8 Z" fill="#e8b04b" stroke="#8a6a3a" strokeWidth="0.5" {...SJ} />
          </svg>
        </span>
      ))}
      {/* the battlements stamp down where the crown sat */}
      <span className="cwp-stamp absolute block" style={{ left: "45.5%", top: "33.5%", width: "9%", height: "6%", animationDelay: `${delayMs + 1120}ms` }}>
        <svg viewBox="0 0 12 7" className="block h-full w-full" aria-hidden="true">
          <path d="M1.6 6.4 V1.2 H3.4 V2.8 H4.8 V1.2 H7.2 V2.8 H8.6 V1.2 H10.4 V6.4 Z" fill={tint(p2, 0.95)} stroke="#4a4036" strokeWidth="0.5" {...SJ} />
        </svg>
      </span>
      {/* patched rags: humble stitches fade onto her gown */}
      <span className="cwp-facein absolute block" style={{ left: "45%", top: "48%", width: "10%", height: "7%", animationDelay: `${delayMs + 1220}ms` }}>
        <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
          <rect x="1.5" y="1.5" width="4" height="3.4" rx="0.6" fill="none" stroke={tint(p2, 0.85)} strokeWidth="0.5" strokeDasharray="1 0.7" />
          <rect x="6.8" y="3.4" width="3.6" height="3" rx="0.6" fill="none" stroke={tint(p2, 0.85)} strokeWidth="0.5" strokeDasharray="1 0.7" />
        </svg>
      </span>
      {/* the way back: one red glint — blood buys the crown again */}
      <span className="cwp-glint absolute block" style={{ left: "58%", top: "42%", width: "2.8%", height: "3.2%", animationDelay: `${delayMs + 1380}ms` }}>
        <svg viewBox="0 0 8 10" className="block h-full w-full" aria-hidden="true">
          <path d="M4 0.8 C6 3.6 7 5.4 7 6.8 A3 3 0 1 1 1 6.8 C1 5.4 2 3.6 4 0.8 Z" fill="#c94a5a" />
        </svg>
      </span>
      <SettlePair color={tint(p1, 0.7)} delayMs={delayMs + 1380} />
    </Stage>
  );
}

/* --- Beacon of Woe: the watchtower rises, the doom-flame catches, six
   count-runes ring it, and frost-light plays over the distant army. -------- */
const BEACON: Palette = ["#1c1c24", "#ff9d3d", "#9fd8ff"];
function BeaconOfWoeScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = BEACON;
  if (role === "entrance") return <EntranceCut palette={BEACON} glyph={GLYPH.hw2_beacon_of_woe} delayMs={delayMs} />;
  if (!lead) return <CurseHit palette={BEACON} glyph={GLYPH.hw2_beacon_of_woe} delayMs={delayMs} />;
  return (
    // FLAGSHIP: the hill shakes when the doom-flame catches
    <Stage quakeAtMs={delayMs + 640}>
      <Wash color={tint(p0, 0.32)} delayMs={delayMs} />
      <Tell color={tint(p1, 0.35)} delayMs={delayMs} left={42} top={34} />
      {/* the lighting stroke: a fire-column hammers down onto the beacon cage
          and the ignition blast rolls off the tower top */}
      <ImpactCell spec={{ l: 43, t: 20, s: 14, at: 640, laser: true, shock: true }} rgb="255 157 61" delayMs={delayMs} />
      {/* the watchtower, rising on the hill where everyone can see it */}
      <span className="cwp-rise absolute block" style={{ left: "42%", top: "30%", width: "16%", height: "36%", animationDelay: `${delayMs + 160}ms` }}>
        <svg viewBox="0 0 16 36" className="block h-full w-full" aria-hidden="true">
          <path d="M4 34 L5 10 H11 L12 34 Z" fill={tint(p0, 0.95)} stroke={tint(p2, 0.6)} strokeWidth="0.8" {...SJ} />
          <path d="M3 10 H13 M4.5 6 H11.5 V10 M6.5 6 V3.4 M9.5 6 V3.4" stroke={tint(p2, 0.75)} strokeWidth="0.8" strokeLinecap="round" />
          <path d="M6.5 3.4 H9.5" stroke={tint(p2, 0.75)} strokeWidth="0.8" strokeLinecap="round" />
          <path d="M2 34 H14" stroke={tint(p2, 0.6)} strokeWidth="1" strokeLinecap="round" />
        </svg>
      </span>
      {/* the doom-flame catches and gutters at the top */}
      <span className="cwp-flame absolute block" style={{ left: "45.6%", top: "24%", width: "9%", height: "9%", animationDelay: `${delayMs + 640}ms` }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 0.8 C7.4 3.4 7.8 5.4 5 9.2 C2.2 5.4 2.6 3.4 5 0.8 Z" fill={p1} stroke="#7a4a10" strokeWidth="0.5" {...SJ} />
          <path d="M5 3.4 C6.2 4.8 6.2 6.2 5 7.8 C3.8 6.2 3.8 4.8 5 3.4 Z" fill="#ffd76a" />
        </svg>
      </span>
      {/* six count-runes light around the tower: the six turns of the fuse */}
      {[
        { l: 34, t: 30 },
        { l: 30, t: 42 },
        { l: 34, t: 54 },
        { l: 63, t: 30 },
        { l: 67, t: 42 },
        { l: 63, t: 54 },
      ].map((v, i) => (
        <span key={i} className="cwp-glint absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "2.4%", height: "2.4%", animationDelay: `${delayMs + 760 + i * 110}ms` }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0.8 L6 4 L9.2 5 L6 6 L5 9.2 L4 6 L0.8 5 L4 4 Z" fill={tint(p1, 0.95)} />
          </svg>
        </span>
      ))}
      {/* the promise at the fuse's end: frost-light crosses the far army */}
      {[
        { k: "n" as const, l: 68, t: 62, d: 0 },
        { k: "r" as const, l: 74, t: 61, d: 160 },
      ].map((v, i) => (
        <span key={i} className="absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "4.5%", height: "6.5%" }}>
          <span className="cwp-hold absolute inset-0 block" style={{ animationDelay: `${delayMs + 1060 + v.d}ms` }}>
            <Man kind={v.k} fill={tint(p0, 0.9)} stroke={p2} />
          </span>
          <span className="cwp-gild absolute inset-0 block" style={{ animationDelay: `${delayMs + 1180 + v.d}ms` }}>
            <Man kind={v.k} fill={tint(p2, 0.75)} stroke={p0} />
          </span>
        </span>
      ))}
      {/* embers off the beacon */}
      {[
        { l: 47, t: 26, dx: "-50%", d: 0 },
        { l: 52, t: 25, dx: "60%", d: 140 },
      ].map((v, i) => (
        <span key={`e${i}`} className="cwp-cinder absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "1.5%", height: "1.5%", "--dx": v.dx, animationDelay: `${delayMs + 800 + v.d}ms` } as CSSProperties}>
          <Mote color={tint(p1, 0.9)} />
        </span>
      ))}
    </Stage>
  );
}

/* =============================================================================
   WAVE 3 tier 7-8 bespoke curse scenes.
   ========================================================================== */

/* --- The Enemy Within: a marked heavy piece's own shadow peels away and
   turns its coat to the caster on the third move. ------------------------- */
const ENEMY_WITHIN: Palette = ["#26262e", "#8a94a8", "#c94a5a"];
function EnemyWithinScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = ENEMY_WITHIN;
  if (role === "entrance") return <EntranceCut palette={ENEMY_WITHIN} glyph={GLYPH.hw3_enemy_within} delayMs={delayMs} />;
  if (!lead) return <CurseHit palette={ENEMY_WITHIN} glyph={GLYPH.hw3_enemy_within} delayMs={delayMs} />;
  return (
    // FLAGSHIP: the stage lurches as the shadow tears itself free
    <Stage quakeAtMs={delayMs + 900}>
      <Wash color={tint(p0, 0.32)} delayMs={delayMs} />
      <Tell color={tint(p1, 0.35)} delayMs={delayMs} left={42} top={40} />
      {/* the betrayal made physical: the rook's old body splits in half where
          it stood, shards flying, as the turned coat walks free of it */}
      <ImpactCell spec={{ l: 46, t: 44, s: 12, at: 900, man: "r", shock: true }} rgb="201 74 90" delayMs={delayMs} />
      <span className="cwp-hold absolute block" style={{ left: "46%", top: "44%", width: "8%", height: "13%", animationDelay: `${delayMs + 300}ms` }}>
        <Man kind="r" fill={tint(p1, 0.9)} stroke={p0} />
      </span>
      {[0, 1, 2].map((i) => (
        <span key={i} className="cwp-glint absolute block" style={{ left: `${44 + i * 3}%`, top: "38%", width: "1.8%", height: "1.8%", animationDelay: `${delayMs + 520 + i * 140}ms` }}>
          <Mote color={tint(p2, 0.9)} />
        </span>
      ))}
      <span className="cwp-tug absolute block" style={{ left: "48%", top: "46%", width: "7%", height: "12%", "--dx": "160%", "--dy": "0%", animationDelay: `${delayMs + 820}ms` } as CSSProperties}>
        <span className="cwp-swapout absolute inset-0 block" style={{ animationDelay: `${delayMs + 900}ms` }}>
          <Man kind="r" fill={tint(p0, 0.95)} stroke={p1} />
        </span>
        <span className="cwp-swapin absolute inset-0 block" style={{ animationDelay: `${delayMs + 900}ms` }}>
          <Man kind="r" fill={tint(p2, 0.9)} stroke={p0} />
        </span>
      </span>
      <span className="cwp-ring absolute block rounded-full" style={{ left: "36%", top: "38%", width: "28%", height: "22%", border: `2.5px solid ${tint(p2, 0.8)}`, animationDelay: `${delayMs + 980}ms` }} />
      <SettlePair color={tint(p1, 0.7)} delayMs={delayMs + 1240} />
    </Stage>
  );
}

/* --- The Long Eclipse: a black moon slides across the sun and the diagonal
   court goes dark for the duration. --------------------------------------- */
const ECLIPSE: Palette = ["#12121c", "#ff9d3d", "#c9b0e8"];
function EclipseScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = ECLIPSE;
  if (role === "entrance") return <EntranceCut palette={ECLIPSE} glyph={GLYPH.hw3_eclipse} delayMs={delayMs} />;
  if (!lead) return <CurseHit palette={ECLIPSE} glyph={GLYPH.hw3_eclipse} delayMs={delayMs} />;
  return (
    // FLAGSHIP: totality lands with a physical thud
    <Stage quakeAtMs={delayMs + 900}>
      <Wash color={tint(p0, 0.36)} delayMs={delayMs} />
      <Tell color={tint(p1, 0.35)} delayMs={delayMs} left={44} top={26} />
      {/* the corona blast: the last light blows outward as the moon seats */}
      <ImpactCell spec={{ l: 43, t: 25, s: 14, at: 900, shock: true }} rgb="255 157 61" delayMs={delayMs} />
      <span className="cwp-facein absolute block" style={{ left: "42%", top: "24%", width: "16%", height: "16%", animationDelay: `${delayMs + 240}ms` }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <circle cx="10" cy="10" r="7" fill={tint(p1, 0.85)} />
          <path d="M10 0.6 V2.6 M10 17.4 V19.4 M0.6 10 H2.6 M17.4 10 H19.4 M3.2 3.2 L4.6 4.6 M16.8 3.2 L15.4 4.6 M3.2 16.8 L4.6 15.4 M16.8 16.8 L15.4 15.4" stroke={tint(p1, 0.7)} strokeWidth="0.8" strokeLinecap="round" />
        </svg>
      </span>
      <span className="cwp-sweep absolute block rounded-full" style={{ left: "36%", top: "24%", width: "16%", height: "16%", background: tint(p0, 0.96), "--tx": "60%", animationDelay: `${delayMs + 560}ms` } as CSSProperties} />
      <span className="cwp-ring absolute block rounded-full" style={{ left: "40%", top: "22%", width: "20%", height: "20%", border: `2px solid ${tint(p1, 0.7)}`, animationDelay: `${delayMs + 900}ms` }} />
      {[
        { k: "b" as const, l: 34, t: 56 },
        { k: "q" as const, l: 58, t: 56 },
      ].map((v, i) => (
        <span key={i} className="absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "6%", height: "9%" }}>
          <span className="cwp-hold absolute inset-0 block" style={{ animationDelay: `${delayMs + 760 + i * 120}ms` }}>
            <Man kind={v.k} fill={tint(p2, 0.9)} stroke={p0} />
          </span>
          <span className="cwp-gild absolute inset-0 block" style={{ animationDelay: `${delayMs + 940 + i * 120}ms` }}>
            <Man kind={v.k} fill={tint(p0, 0.9)} stroke={p2} />
          </span>
        </span>
      ))}
      <SettlePair color={tint(p1, 0.6)} delayMs={delayMs + 1300} />
    </Stage>
  );
}

/* --- Hydra Hex: the branded head is struck off and two rise in its place,
   each seizing the nearest piece in frost. -------------------------------- */
const HYDRA: Palette = ["#1c2a1c", "#7fae4a", "#9fd8ff"];
function HydraScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = HYDRA;
  if (role === "entrance") return <EntranceCut palette={HYDRA} glyph={GLYPH.hw3_hydra_hex} delayMs={delayMs} />;
  if (!lead) return <CurseHit palette={HYDRA} glyph={GLYPH.hw3_hydra_hex} delayMs={delayMs} />;
  return (
    // FLAGSHIP: the stage kicks as the head is struck off
    <Stage quakeAtMs={delayMs + 640}>
      <Wash color={tint(p0, 0.32)} delayMs={delayMs} />
      <Tell color={tint(p1, 0.34)} delayMs={delayMs} left={44} top={40} />
      {/* the beheading stroke: a green column severs the branded head, and the
          blast is what wakes the two heads that rise in its place */}
      <ImpactCell spec={{ l: 45, t: 42, s: 12, at: 640, laser: true, shock: true }} rgb="127 174 74" delayMs={delayMs} />
      {/* the leg: the head is branded down the real source -> target vector */}
      <ChainLeg color="rgba(122,201,106,0.85)" delayMs={delayMs + 300} />
      <span className="cwp-settle absolute block" style={{ left: "46%", top: "44%", width: "8%", height: "10%", "--dx": "0%", "--dy": "60%", "--rot": "20deg", animationDelay: `${delayMs + 360}ms` } as CSSProperties}>
        <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
          <path d="M5 1 C7 2.4 7 5 5 6.4 C6.4 7 7 8 6.6 9.4 H3.4 C3 8 3.6 7 5 6.4 C3 5 3 2.4 5 1 Z" fill={tint(p1, 0.9)} stroke={p0} strokeWidth="0.5" {...SJ} />
        </svg>
      </span>
      {[
        { l: 34, t: 34, d: 0 },
        { l: 58, t: 34, d: 160 },
      ].map((v, i) => (
        <span key={i} className="cwp-sprout absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "7%", height: "13%", animationDelay: `${delayMs + 640 + v.d}ms` }}>
          <svg viewBox="0 0 8 14" className="block h-full w-full" aria-hidden="true">
            <path d="M4 13 C2.4 10 3 7 4 4.6 C5 7 5.6 10 4 13 Z M4 4.6 C5 2.4 5 1.4 4 0.8 C3 1.4 3 2.4 4 4.6 Z" fill={tint(p1, 0.9)} stroke={p0} strokeWidth="0.5" {...SJ} />
          </svg>
        </span>
      ))}
      {[
        { l: 30, t: 56 },
        { l: 62, t: 56 },
      ].map((v, i) => (
        <span key={i} className="absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "5.5%", height: "8%" }}>
          <span className="cwp-hold absolute inset-0 block" style={{ animationDelay: `${delayMs + 900 + i * 120}ms` }}>
            <Man kind={i ? "n" : "b"} fill={tint(p1, 0.85)} stroke={p0} />
          </span>
          <span className="cwp-gild absolute inset-0 block" style={{ animationDelay: `${delayMs + 1040 + i * 120}ms` }}>
            <Man kind={i ? "n" : "b"} fill={tint(p2, 0.85)} stroke={p0} />
          </span>
        </span>
      ))}
      <span className="cwp-ring absolute block rounded-full" style={{ left: "34%", top: "36%", width: "32%", height: "24%", border: `2.5px solid ${tint(p1, 0.8)}`, animationDelay: `${delayMs + 980}ms` }} />
      <SettlePair color={tint(p1, 0.7)} delayMs={delayMs + 1300} />
    </Stage>
  );
}

/* --- Pyrrhic Toll: every capture rings a bell and a laurel wilts as some
   bystander piece is caught cold. ----------------------------------------- */
const PYRRHIC: Palette = ["#2f3a26", "#c9b89a", "#9fd8ff"];
function PyrrhicScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = PYRRHIC;
  if (role === "entrance") return <EntranceCut palette={PYRRHIC} glyph={GLYPH.hw3_pyrrhic_toll} delayMs={delayMs} />;
  if (!lead) return <CurseHit palette={PYRRHIC} glyph={GLYPH.hw3_pyrrhic_toll} delayMs={delayMs} />;
  return (
    // FLAGSHIP: the victory bell's toll physically rocks the stage
    <Stage quakeAtMs={delayMs + 720}>
      <Wash color={tint(p0, 0.3)} delayMs={delayMs} />
      <Tell color={tint(p1, 0.34)} delayMs={delayMs} left={44} top={30} />
      {/* the hollow triumph: the toll's pressure blast under the bell mouth */}
      <ImpactCell spec={{ l: 43, t: 36, s: 14, at: 720, shock: true }} rgb="201 184 154" delayMs={delayMs} />
      <span className="cwp-drop absolute block" style={{ left: "42%", top: "22%", width: "16%", height: "20%", animationDelay: `${delayMs + 200}ms` }}>
        <span className="cwp-swing absolute inset-0 block" style={{ animationDelay: `${delayMs + 620}ms` }}>
          <svg viewBox="0 0 16 20" className="block h-full w-full" aria-hidden="true">
            <path d="M8 1 V4" stroke={tint(p1, 0.8)} strokeWidth="0.9" strokeLinecap="round" />
            <path d="M4 15 C4 8 5.4 5 8 3.8 C10.6 5 12 8 12 15 Z" fill={tint(p0, 0.8)} stroke={tint(p1, 0.9)} strokeWidth="1" {...SJ} />
            <path d="M3 15 H13 L12.4 17 H3.6 Z" fill={tint(p1, 0.85)} stroke={tint(p2, 0.6)} strokeWidth="0.5" {...SJ} />
            <circle cx="8" cy="18" r="1" fill={tint(p1, 0.9)} />
          </svg>
        </span>
      </span>
      {[0, 1].map((i) => (
        <span key={i} className="cwp-ring absolute block rounded-full" style={{ left: "34%", top: "38%", width: "32%", height: "22%", border: `2.5px solid ${tint(p1, 0.8)}`, animationDelay: `${delayMs + 720 + i * 180}ms` }} />
      ))}
      <span className="cwp-wilt absolute block" style={{ left: "56%", top: "54%", width: "12%", height: "10%", animationDelay: `${delayMs + 820}ms` }}>
        <svg viewBox="0 0 12 10" className="block h-full w-full" aria-hidden="true">
          <path d="M6 1 C3 2 1.6 4.4 2 7.4 M6 1 C9 2 10.4 4.4 10 7.4" fill="none" stroke={tint(p1, 0.9)} strokeWidth="0.8" strokeLinecap="round" />
          <path d="M3.4 3 L2.2 2.6 M2.6 5 L1.4 5 M8.6 3 L9.8 2.6 M9.4 5 L10.6 5" stroke={tint(p1, 0.8)} strokeWidth="0.6" strokeLinecap="round" />
        </svg>
      </span>
      <span className="absolute block" style={{ left: "30%", top: "56%", width: "5.5%", height: "8%" }}>
        <span className="cwp-hold absolute inset-0 block" style={{ animationDelay: `${delayMs + 900}ms` }}>
          <Man kind="n" fill={tint(p1, 0.85)} stroke={p0} />
        </span>
        <span className="cwp-gild absolute inset-0 block" style={{ animationDelay: `${delayMs + 1040}ms` }}>
          <Man kind="n" fill={tint(p2, 0.85)} stroke={p0} />
        </span>
      </span>
      <SettlePair color={tint(p1, 0.7)} delayMs={delayMs + 1300} />
    </Stage>
  );
}

/* --- Martyr's Crown: the king's briar crown drinks the second check and
   lashes frost around every piece that stands beside him. ----------------- */
const MARTYR: Palette = ["#2a2030", "#8faf4a", "#c94a5a"];
function MartyrCrownScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = MARTYR;
  if (role === "entrance") return <EntranceCut palette={MARTYR} glyph={GLYPH.hw3_martyrs_crown} delayMs={delayMs} />;
  if (!lead) return <CurseHit palette={MARTYR} glyph={GLYPH.hw3_martyrs_crown} delayMs={delayMs} />;
  return (
    // FLAGSHIP: the stage convulses when the crown drinks the second check
    <Stage quakeAtMs={delayMs + 1020}>
      <Wash color={tint(p0, 0.32)} delayMs={delayMs} />
      <Tell color={tint(p1, 0.32)} delayMs={delayMs} left={44} top={40} />
      {/* the frost-lash detonation: the drunk check blasts out of the briar */}
      <ImpactCell spec={{ l: 43, t: 40, s: 14, at: 1020, shock: true }} rgb="201 74 90" delayMs={delayMs} />
      <span className="cwp-facein absolute block" style={{ left: "45%", top: "44%", width: "10%", height: "15%", animationDelay: `${delayMs + 240}ms` }}>
        <Man kind="k" fill={tint(p1, 0.9)} stroke={p0} />
      </span>
      {[
        { l: 38, t: 40, rot: "-14deg", flip: false, d: 0 },
        { l: 56, t: 39, rot: "12deg", flip: true, d: 160 },
      ].map((v, i) => (
        <span key={i} className="cwp-sprout absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "8%", height: "12%", rotate: v.rot, animationDelay: `${delayMs + 420 + v.d}ms`, ...(v.flip ? { scale: "-1 1" } : {}) }}>
          <svg viewBox="0 0 10 14" className="block h-full w-full" aria-hidden="true">
            <path d="M5 13.4 C3 9 6.6 7 4.6 3.4 C3.4 1.8 4.4 0.8 5.6 0.6" fill="none" stroke={tint(p1, 0.95)} strokeWidth="1" strokeLinecap="round" />
            <path d="M4.6 10 L2.8 9.4 M5.2 6.4 L7 6 M4.4 2.6 L2.8 2" stroke={tint(p1, 0.95)} strokeWidth="0.7" strokeLinecap="round" />
          </svg>
        </span>
      ))}
      {[0, 1].map((i) => (
        <span key={i} className="cwp-pop absolute block" style={{ left: `${40 + i * 14}%`, top: "30%", width: "5%", height: "5%", animationDelay: `${delayMs + 620 + i * 220}ms` }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M2 2 L8 8 M8 2 L2 8" stroke="#c94a5a" strokeWidth="1" strokeLinecap="round" />
          </svg>
        </span>
      ))}
      <span className="cwp-ring absolute block rounded-full" style={{ left: "34%", top: "38%", width: "32%", height: "26%", border: `2.5px solid ${tint(p2, 0.8)}`, animationDelay: `${delayMs + 1020}ms` }} />
      {[
        { k: "n" as const, l: 32, t: 56 },
        { k: "b" as const, l: 62, t: 56 },
      ].map((v, i) => (
        <span key={i} className="absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "5.5%", height: "8%" }}>
          <span className="cwp-hold absolute inset-0 block" style={{ animationDelay: `${delayMs + 1000 + i * 120}ms` }}>
            <Man kind={v.k} fill={tint(p1, 0.85)} stroke={p0} />
          </span>
          <span className="cwp-gild absolute inset-0 block" style={{ animationDelay: `${delayMs + 1140 + i * 120}ms` }}>
            <Man kind={v.k} fill="#9fd8ff" stroke={p0} />
          </span>
        </span>
      ))}
      <SettlePair color={tint(p1, 0.7)} delayMs={delayMs + 1360} />
    </Stage>
  );
}

/* --- The Curse Engine: two iron gears grind up the winding, and every third
   turn a cold discharge seizes the strongest piece. ----------------------- */
const CURSE_ENGINE: Palette = ["#2a2a32", "#8a94a8", "#9fd8ff"];
function CurseEngineScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = CURSE_ENGINE;
  if (role === "entrance") return <EntranceCut palette={CURSE_ENGINE} glyph={GLYPH.hw3_curse_engine} delayMs={delayMs} />;
  if (!lead) return <CurseHit palette={CURSE_ENGINE} glyph={GLYPH.hw3_curse_engine} delayMs={delayMs} />;
  const gear = (fill: string) => (
    <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
      <path d="M10 1 L11.4 3.2 L14 2.4 L14.2 5.1 L16.9 5.4 L15.6 7.8 L17.6 9.6 L15.2 10.8 L15.8 13.5 L13.1 13.2 L12.2 15.8 L10 14.2 L7.8 15.8 L6.9 13.2 L4.2 13.5 L4.8 10.8 L2.4 9.6 L4.4 7.8 L3.1 5.4 L5.8 5.1 L6 2.4 L8.6 3.2 Z" fill={fill} stroke={p0} strokeWidth="0.5" {...SJ} />
      <circle cx="10" cy="9" r="3.2" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="0.5" />
    </svg>
  );
  return (
    // FLAGSHIP: the machine's discharge stroke slams through the stage
    <Stage quakeAtMs={delayMs + 960}>
      <Wash color={tint(p0, 0.34)} delayMs={delayMs} />
      <Tell color={tint(p1, 0.34)} delayMs={delayMs} left={42} top={36} />
      {/* the cold discharge: an ice-blue column hammers the strongest piece
          and the frost blast rings out around her */}
      <ImpactCell spec={{ l: 57, t: 56, s: 12, at: 1000, laser: true, shock: true }} rgb="159 216 255" delayMs={delayMs} />
      <span className="cwp-grind absolute block" style={{ left: "34%", top: "34%", width: "18%", height: "18%", animationDelay: `${delayMs + 300}ms` }}>{gear(tint(p1, 0.9))}</span>
      <span className="cwp-grindrev absolute block" style={{ left: "50%", top: "44%", width: "15%", height: "15%", animationDelay: `${delayMs + 420}ms` }}>{gear(tint(p1, 0.7))}</span>
      {[0, 1, 2].map((i) => (
        <span key={i} className="cwp-glint absolute block" style={{ left: `${38 + i * 10}%`, top: "28%", width: "2%", height: "2%", animationDelay: `${delayMs + 620 + i * 150}ms` }}>
          <Mote color={tint(p1, 0.9)} />
        </span>
      ))}
      <span className="absolute block" style={{ left: "36%", top: "62%", width: "8%", height: "8%", rotate: "-90deg" }}>
        <span className="cwp-lash absolute inset-0 block" style={{ background: `linear-gradient(90deg, ${tint(p2, 0.95)}, transparent)`, animationDelay: `${delayMs + 900}ms` }} />
      </span>
      <span className="absolute block" style={{ left: "58%", top: "58%", width: "6.5%", height: "10%" }}>
        <span className="cwp-hold absolute inset-0 block" style={{ animationDelay: `${delayMs + 960}ms` }}>
          <Man kind="q" fill={tint(p1, 0.9)} stroke={p0} />
        </span>
        <span className="cwp-gild absolute inset-0 block" style={{ animationDelay: `${delayMs + 1100}ms` }}>
          <Man kind="q" fill={tint(p2, 0.85)} stroke={p0} />
        </span>
      </span>
      <SettlePair color={tint(p1, 0.7)} delayMs={delayMs + 1360} />
    </Stage>
  );
}

/* --- Blood Tithe: every heavy capture drags one of their own pawns off to
   the tithe-ledger as tribute. -------------------------------------------- */
const BLOOD_TITHE: Palette = ["#2b1218", "#e8b04b", "#c94a5a"];
function BloodTitheScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = BLOOD_TITHE;
  if (role === "entrance") return <EntranceCut palette={BLOOD_TITHE} glyph={GLYPH.hw3_blood_tithe} delayMs={delayMs} />;
  if (!lead) return <CurseHit palette={BLOOD_TITHE} glyph={GLYPH.hw3_blood_tithe} delayMs={delayMs} />;
  return (
    // FLAGSHIP: the tithe is EXACTED — the stage jolts as the pawn is torn away
    <Stage quakeAtMs={delayMs + 700}>
      <Wash color={tint(p0, 0.32)} delayMs={delayMs} />
      <Tell color={tint(p1, 0.34)} delayMs={delayMs} left={42} top={34} />
      {/* the collection stroke: gold light spears the tribute pawn's square
          and the pawn's shell splits as its soul is dragged to the ledger */}
      <ImpactCell spec={{ l: 57, t: 54, s: 12, at: 700, laser: true, man: "p", shock: true }} rgb="232 176 75" delayMs={delayMs} />
      <span className="cwp-facein absolute block" style={{ left: "34%", top: "40%", width: "22%", height: "16%", animationDelay: `${delayMs + 240}ms` }}>
        <svg viewBox="0 0 22 16" className="block h-full w-full" aria-hidden="true">
          <path d="M1 2.4 C5 1 9 1.4 11 3 C13 1.4 17 1 21 2.4 V13.4 C17 12 13 12.4 11 14 C9 12.4 5 12 1 13.4 Z" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.5" {...SJ} />
          <path d="M3.4 5 H9 M3.4 7 H8 M3.4 9 H9 M13 5 H18.6 M13 7 H18 M13 9 H18.6" stroke="#8a6a3a" strokeWidth="0.4" strokeLinecap="round" />
        </svg>
      </span>
      <span className="cwp-tug absolute block" style={{ left: "58%", top: "56%", width: "5%", height: "7.5%", "--dx": "-140%", "--dy": "-30%", animationDelay: `${delayMs + 700}ms` } as CSSProperties}>
        <Man kind="p" fill={tint(p1, 0.9)} stroke={p0} />
      </span>
      <span className="cwp-settle absolute block" style={{ left: "48%", top: "40%", width: "3%", height: "3.6%", "--dx": "6%", "--dy": "320%", "--rot": "220deg", animationDelay: `${delayMs + 860}ms` } as CSSProperties}>
        <svg viewBox="0 0 8 10" className="block h-full w-full" aria-hidden="true"><path d="M4 0.8 C6 3.6 7 5.4 7 6.8 A3 3 0 1 1 1 6.8 C1 5.4 2 3.6 4 0.8 Z" fill={p2} /></svg>
      </span>
      <SettlePair color={tint(p1, 0.7)} delayMs={delayMs + 1240} />
    </Stage>
  );
}

/* --- The Inverted Crown: every promoted pawn's crown flips to a tin knight's
   helm, whatever they chose. ---------------------------------------------- */
const INVERTED: Palette = ["#26262e", "#c9b89a", "#8faf4a"];
function InvertedCrownScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = INVERTED;
  if (role === "entrance") return <EntranceCut palette={INVERTED} glyph={GLYPH.hw3_inverted_crown} delayMs={delayMs} />;
  if (!lead) return <CurseHit palette={INVERTED} glyph={GLYPH.hw3_inverted_crown} delayMs={delayMs} />;
  return (
    // FLAGSHIP: the coronation goes wrong with a physical CRACK
    <Stage quakeAtMs={delayMs + 760}>
      <Wash color={tint(p0, 0.32)} delayMs={delayMs} />
      <Tell color={tint(p1, 0.34)} delayMs={delayMs} left={44} top={30} />
      {/* the queen-that-would-be shatters in half over the promotion square,
          gold shards flying, leaving the tin knight's helm underneath */}
      <ImpactCell spec={{ l: 44, t: 28, s: 12, at: 760, man: "q", shock: true }} rgb="232 176 75" delayMs={delayMs} />
      <span className="cwp-beam absolute block" style={{ left: "30%", top: "58%", width: "40%", height: "1.2%", background: tint(p1, 0.85), transformOrigin: "0% 50%", animationDelay: `${delayMs + 300}ms` }} />
      <span className="cwp-rise absolute block" style={{ left: "46%", top: "46%", width: "6.5%", height: "11%", animationDelay: `${delayMs + 440}ms` }}>
        <Man kind="p" fill={tint(p1, 0.9)} stroke={p0} />
      </span>
      <span className="absolute block" style={{ left: "44.5%", top: "30%", width: "10%", height: "10%" }}>
        <span className="cwp-swapout absolute inset-0 block" style={{ animationDelay: `${delayMs + 760}ms` }}>
          <svg viewBox="0 0 12 10" className="block h-full w-full" aria-hidden="true"><path d="M1.4 8 V2 L3.8 4 L6 1 L8.2 4 L10.6 2 V8 Z" fill="#e8b04b" stroke="#8a6a3a" strokeWidth="0.5" {...SJ} /></svg>
        </span>
        <span className="cwp-swapin absolute inset-0 block" style={{ animationDelay: `${delayMs + 760}ms` }}>
          <Man kind="n" fill={tint(p2, 0.85)} stroke={p0} />
        </span>
      </span>
      {[
        { l: 46, t: 30, dx: "-160%", dy: "-90%", rot: "-120deg" },
        { l: 52, t: 30, dx: "180%", dy: "-70%", rot: "140deg" },
      ].map((v, i) => (
        <span key={i} className="cwp-spark absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "1.8%", height: "1.8%", "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + 940 + i * 90}ms` } as CSSProperties}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true"><path d="M2 8 L5 1 L8 8 Z" fill="#e8b04b" /></svg>
        </span>
      ))}
      <SettlePair color={tint(p1, 0.7)} delayMs={delayMs + 1300} />
    </Stage>
  );
}

/* =============================================================================
   Glyphs — one 10x10 mini-emblem per card, drawn flat.
   ========================================================================== */

function Gl({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      {children}
    </svg>
  );
}

const GLYPH: Record<string, ReactNode> = {
  // a warding open hand over a small pawn
  hw2_witchs_veto: (
    <Gl>
      <path d="M3 8.8 V5.4 M4.2 8.6 V4.4 M5.4 8.6 V4 M6.6 8.8 V4.8 M3 8.8 C4.4 9.6 5.8 9.6 6.6 8.8" fill="none" stroke="#c9b0e8" strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="5" cy="2.2" r="1.3" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.4" />
    </Gl>
  ),
  // three crows over a cracked moon
  hw2_bad_omen: (
    <Gl>
      <circle cx="5" cy="6" r="3" fill="#cdd6ff" stroke="#5a6b8f" strokeWidth="0.4" />
      <path d="M5 3.2 L4.4 5 L5.6 6.4 L4.8 8.4" fill="none" stroke="#5a6b8f" strokeWidth="0.4" {...SJ} />
      <path d="M1.4 2.4 C2.2 1.4 3 1.4 3.4 2.2 C3.8 1.4 4.6 1.4 5.4 2.4 M5.6 1.6 C6.4 0.6 7.2 0.6 7.6 1.4 C8 0.6 8.8 0.6 9.6 1.6" fill="none" stroke="#1c1c24" strokeWidth="0.6" strokeLinecap="round" />
    </Gl>
  ),
  // a frozen footprint pair
  hw2_cold_footprints: (
    <Gl>
      <ellipse cx="3.4" cy="6.6" rx="1.6" ry="2.2" fill="#9fd8ff" stroke="#3f7fb5" strokeWidth="0.4" />
      <ellipse cx="6.8" cy="3.6" rx="1.6" ry="2.2" fill="#bfe6ff" stroke="#3f7fb5" strokeWidth="0.4" />
      <path d="M2 2 L3 3 M1.4 3.4 H2.8" stroke="#9fd8ff" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a road dwindling to a doorway
  hw2_long_road_home: (
    <Gl>
      <path d="M1 9 C3.4 7 5.4 4.6 6.4 1.6 M2.6 9.2 C4.8 7.2 6.6 5 7.6 2.2" fill="none" stroke="#c9a84c" strokeWidth="0.6" strokeLinecap="round" strokeDasharray="1.2 0.9" />
      <path d="M6.6 1.4 H9 V4 H6.6 Z M7.8 1.4 V4" fill="none" stroke="#8a6a3a" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // a coin over a blood drop
  hw2_blood_price: (
    <Gl>
      <circle cx="5" cy="3.4" r="2.6" fill="#e8b04b" stroke="#8a6a3a" strokeWidth="0.5" />
      <path d="M5 1.8 V5 M3.8 2.8 H6.2" stroke="#8a6a3a" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M5 6 C6.2 7.4 6.7 8.2 6.7 8.9 A1.7 1.7 0 1 1 3.3 8.9 C3.3 8.2 3.8 7.4 5 6 Z" fill="#c94a5a" />
    </Gl>
  ),
  // a crown weeping tarnish
  hw2_tarnished_crown: (
    <Gl>
      <path d="M1.6 6.2 V2 L3.8 3.8 L5 1.2 L6.2 3.8 L8.4 2 V6.2 Z" fill="#e8b04b" stroke="#8a6a3a" strokeWidth="0.5" {...SJ} />
      <path d="M3 6.2 C3 7.4 2.8 8.2 2.4 9 M5 6.2 C5 7.6 5 8.4 5 9.2 M7 6.2 C7 7.4 7.2 8.2 7.6 9" stroke="#3a3a40" strokeWidth="0.7" strokeLinecap="round" />
    </Gl>
  ),
  // the cracked bell, mid-toll
  hw2_tolling_bell: (
    <Gl>
      <path d="M3 7 C3 3.6 3.8 2 5 1.6 C6.2 2 7 3.6 7 7 Z" fill="#6b4a8f" stroke="#c9b0e8" strokeWidth="0.5" {...SJ} />
      <path d="M2.4 7 H7.6 L7.2 8.2 H2.8 Z" fill="#c9b0e8" />
      <circle cx="5" cy="9" r="0.6" fill="#c9b0e8" />
      <path d="M1 4.6 C1.6 4 1.6 3 1 2.4 M9 4.6 C8.4 4 8.4 3 9 2.4" fill="none" stroke="#c9b0e8" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a curled spring under an arrow bent back on itself
  hw2_curse_of_recoil: (
    <Gl>
      <path d="M2 8.6 C4.6 8.6 4.6 6.6 2.6 6.6 C4.6 6.6 4.6 4.6 2.6 4.6 C4.6 4.6 4.6 2.6 2.6 2.6" fill="none" stroke="#8a94a8" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M5 2 H8.4 V5.4 M8.4 2 L5.6 4.8 M5.6 3 V4.8 H7.4" fill="none" stroke="#c94a5a" strokeWidth="0.7" {...SJ} />
    </Gl>
  ),
  // snapped reins
  hw2_no_reins: (
    <Gl>
      <path d="M1.2 7.8 C3 6.6 4 5.2 4.4 3.4" fill="none" stroke="#8a6a3a" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M5.6 3 C6.4 4.6 7.6 5.8 9 6.6" fill="none" stroke="#8a6a3a" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M4.6 2.6 L5.4 2.2 M4.4 1.6 L5 1 M5.8 2.2 L6.2 1.4" stroke="#c9a84c" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // two ration chits
  hw2_war_rations: (
    <Gl>
      <rect x="1" y="2" width="5.4" height="3.4" rx="0.6" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.4" />
      <rect x="3.6" y="4.8" width="5.4" height="3.4" rx="0.6" fill="#c9b89a" stroke="#8a6a3a" strokeWidth="0.4" />
      <path d="M2.4 3.7 H5 M5 6.5 H7.6" stroke="#8a6a3a" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a clock face at one to midnight
  hw2_witching_hour: (
    <Gl>
      <circle cx="5" cy="5" r="4" fill="#2c3e6b" stroke="#cdd6ff" strokeWidth="0.5" />
      <path d="M5 5 V1.8 M5 5 L3.4 3" stroke="#cdd6ff" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M5 0.8 V1.4 M5 8.6 V9.2 M0.8 5 H1.4 M8.6 5 H9.2" stroke="#cdd6ff" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // a sagging grain sack
  hw2_weight_of_toil: (
    <Gl>
      <path d="M2 8.4 C1.6 4.6 3.4 2.4 5 2.4 C6.6 2.4 8.4 4.6 8 8.4 C6 7.4 4 7.4 2 8.4 Z" fill="#8a6a3a" stroke="#4a3a22" strokeWidth="0.5" {...SJ} />
      <path d="M4 2.6 C4.2 1.6 5.8 1.6 6 2.6" fill="none" stroke="#4a3a22" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M3.4 5 H6.6" stroke="#4a3a22" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // three leeches stacked
  hw2_compounding_misery: (
    <Gl>
      <path d="M1.6 3 C3.6 1.6 6.4 1.6 8.4 3" fill="none" stroke="#8f6bff" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M1.6 5.4 C3.6 4 6.4 4 8.4 5.4" fill="none" stroke="#c9b0e8" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M1.6 7.8 C3.6 6.4 6.4 6.4 8.4 7.8" fill="none" stroke="#e3d0ff" strokeWidth="0.9" strokeLinecap="round" />
    </Gl>
  ),
  // two dolls joined by a thread
  hw2_twinned_torment: (
    <Gl>
      <circle cx="2.8" cy="3" r="1.2" fill="#c9b0e8" />
      <path d="M2 4.4 H3.6 L3.9 7.6 H1.7 Z" fill="#c9b0e8" />
      <circle cx="7.2" cy="3" r="1.2" fill="#8a94a8" />
      <path d="M6.4 4.4 H8 L8.3 7.6 H6.1 Z" fill="#8a94a8" />
      <path d="M3.8 5.6 C5 5 5 5 6.2 5.6" fill="none" stroke="#c94a5a" strokeWidth="0.5" strokeDasharray="0.9 0.6" strokeLinecap="round" />
    </Gl>
  ),
  // the cursed coin, marked with its own hex
  hw2_cursed_coin: (
    <Gl>
      <circle cx="5" cy="5" r="3.8" fill="#e8b04b" stroke="#8a6a3a" strokeWidth="0.6" />
      <path d="M5 1.8 L5.8 4.2 L8.2 4.2 L6.2 5.8 L7 8.2 L5 6.8 L3 8.2 L3.8 5.8 L1.8 4.2 L4.2 4.2 Z" fill="none" stroke="#8a6a3a" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // a withered tile sprouting one weed
  hw2_creeping_blight: (
    <Gl>
      <path d="M5 3.4 L8.8 6 L5 8.6 L1.2 6 Z" fill="#3a3a40" stroke="#8faf4a" strokeWidth="0.5" {...SJ} />
      <path d="M5 5.8 C5 3.6 4.2 2.6 3.4 1.8 M5 5.8 C5 3.8 5.8 2.8 6.4 1.4" fill="none" stroke="#8faf4a" strokeWidth="0.6" strokeLinecap="round" />
    </Gl>
  ),
  // a crown above two shackled pawns
  hw2_queens_ransom: (
    <Gl>
      <path d="M2.6 3.4 V1.4 L4 2.4 L5 0.8 L6 2.4 L7.4 1.4 V3.4 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <circle cx="3" cy="6" r="1" fill="#c9b0e8" />
      <circle cx="7" cy="6" r="1" fill="#c9b0e8" />
      <path d="M2.2 8.6 C3.4 7.8 4.4 7.8 5 8.4 C5.6 7.8 6.6 7.8 7.8 8.6" fill="none" stroke="#8a94a8" strokeWidth="0.6" strokeDasharray="0.9 0.6" strokeLinecap="round" />
    </Gl>
  ),
  // a padlock with a centered keyhole
  hw2_bound_court: (
    <Gl>
      <path d="M3.2 4.4 V3 C3.2 0.8 6.8 0.8 6.8 3 V4.4" fill="none" stroke="#8a94a8" strokeWidth="0.8" strokeLinecap="round" />
      <rect x="2" y="4.4" width="6" height="4.8" rx="0.9" fill="#3a3a40" stroke="#8a94a8" strokeWidth="0.6" />
      <circle cx="5" cy="6.4" r="0.9" fill="#ffd76a" />
      <path d="M5 6.8 V8.2" stroke="#ffd76a" strokeWidth="0.6" strokeLinecap="round" />
    </Gl>
  ),
  // a storm cloud over a shrinking army row
  hw2_gathering_storm: (
    <Gl>
      <path d="M2 4.4 C1 4.4 0.8 3 1.8 2.6 C1.8 1.2 3.6 0.8 4.2 1.8 C4.8 0.8 6.8 1 6.8 2.4 C8 2.2 8.6 3.8 7.4 4.4 Z" fill="#5a6b8f" stroke="#2c3e6b" strokeWidth="0.4" {...SJ} />
      <path d="M4.4 5 L3.4 7 H4.6 L3.8 9" fill="none" stroke="#ffd76a" strokeWidth="0.6" {...SJ} />
      <path d="M6.2 5.4 L6.2 6.8 M7.6 5.2 L7.6 6.2 M8.8 5 L8.8 5.8" stroke="#9fd8ff" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a flower rising from a grave mound
  hw2_gravebloom: (
    <Gl>
      <path d="M1.4 9 C1.4 6.4 3 5 5 5 C7 5 8.6 6.4 8.6 9 Z" fill="#3a3a40" stroke="#8faf4a" strokeWidth="0.4" {...SJ} />
      <path d="M5 5.6 V2.6" stroke="#8faf4a" strokeWidth="0.6" strokeLinecap="round" />
      <circle cx="5" cy="1.8" r="1.3" fill="#c94a5a" stroke="#8a2a3a" strokeWidth="0.4" />
      <circle cx="5" cy="1.8" r="0.4" fill="#ffd76a" />
    </Gl>
  ),
  // a gilded hand, fingers dripping gold
  hw2_gilded_rot: (
    <Gl>
      <path d="M3 7.6 V4.2 M4.2 7.4 V3.2 M5.4 7.4 V2.8 M6.6 7.6 V3.6 M3 7.6 C4.4 8.4 5.8 8.4 6.6 7.6" fill="none" stroke="#e8b04b" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M3 8.8 C3 9.4 3.8 9.4 3.8 8.8 M5.8 9 C5.8 9.6 6.6 9.6 6.6 9" fill="none" stroke="#e8b04b" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // the bell with a IV countdown
  hw2_death_knell: (
    <Gl>
      <path d="M2.6 6.4 C2.6 3.2 3.6 1.6 5 1.2 C6.4 1.6 7.4 3.2 7.4 6.4 Z" fill="#2a1030" stroke="#c9b0e8" strokeWidth="0.5" {...SJ} />
      <path d="M2 6.4 H8 L7.6 7.6 H2.4 Z" fill="#c9b0e8" />
      <path d="M3.4 8.4 V9.6 M4.6 8.4 L5.2 9.6 L5.8 8.4" fill="none" stroke="#c94a5a" strokeWidth="0.5" {...SJ} />
      <path d="M5.4 3 L4.8 4.4 L5.6 5.6" fill="none" stroke="#8a94a8" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // the hollow crown: an outline only, over a mourning band
  hw2_hollow_crown: (
    <Gl>
      <path d="M1.6 6 V1.8 L3.8 3.6 L5 1 L6.2 3.6 L8.4 1.8 V6 Z" fill="none" stroke="#e8b04b" strokeWidth="0.6" strokeDasharray="1.3 0.9" {...SJ} />
      <path d="M1.6 7.6 H8.4 V8.8 H1.6 Z" fill="#2b1218" stroke="#8a94a8" strokeWidth="0.4" />
    </Gl>
  ),
  // an ash wave curling over a small tower
  hw2_tide_of_ash: (
    <Gl>
      <path d="M1 8.8 C1 5 2.6 2.6 5.4 2.2 C4 3.6 4.4 5.2 6 5.6 C4.8 6.4 4.8 7.6 6.2 8.8 Z" fill="#3a3a40" stroke="#c9c9cf" strokeWidth="0.5" {...SJ} />
      <path d="M7 8.8 L7.3 5.6 H8.7 L9 8.8 Z M6.8 5.6 H9.2 M7.3 4.4 H8.7 V5.6" fill="none" stroke="#c9c9cf" strokeWidth="0.5" {...SJ} />
      <circle cx="7.4" cy="2.6" r="0.5" fill="#ff9d3d" />
    </Gl>
  ),
  // a crown wrapped in briars
  hw2_crown_of_thorns: (
    <Gl>
      <path d="M4.6 2.2 H5.4 V3 H6.2 V3.8 H5.4 V4.6 H4.6 V3.8 H3.8 V3 H4.6 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.3" />
      <path d="M1.2 6.6 C3.6 5 6.4 5 8.8 6.6" fill="none" stroke="#8faf4a" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M2.6 5.8 L2.2 4.8 M4.4 5.3 L4.2 4.2 M6 5.3 L6.2 4.2 M7.6 5.9 L8 4.9" stroke="#8faf4a" strokeWidth="0.5" strokeLinecap="round" />
      <circle cx="5" cy="8.2" r="0.9" fill="#c94a5a" />
    </Gl>
  ),
  // a queen's gown wearing a rook's head
  hw2_pauper_crown: (
    <Gl>
      <path d="M2.8 2.8 H3.8 V1.6 H4.5 V2.8 H5.5 V1.6 H6.2 V2.8 H7.2 V4.4 H2.8 Z" fill="#c9b89a" stroke="#4a4036" strokeWidth="0.4" {...SJ} />
      <path d="M3 5 H7 L7.8 8.8 H2.2 Z" fill="#c94ad1" stroke="#6b1a5e" strokeWidth="0.5" {...SJ} />
      <path d="M4 6.2 L6 7.6 M6 6.2 L4 7.6" stroke="#e3d0ff" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // the lit beacon tower
  hw2_beacon_of_woe: (
    <Gl>
      <path d="M3.6 9.2 L4.2 4 H5.8 L6.4 9.2 Z" fill="#1c1c24" stroke="#9fd8ff" strokeWidth="0.5" {...SJ} />
      <path d="M3.4 4 H6.6" stroke="#9fd8ff" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M5 0.6 C6.2 1.8 6.3 2.8 5 3.6 C3.7 2.8 3.8 1.8 5 0.6 Z" fill="#ff9d3d" stroke="#7a4a10" strokeWidth="0.4" {...SJ} />
      <path d="M1.6 2.6 L2.6 3.2 M8.4 2.6 L7.4 3.2" stroke="#ff9d3d" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),

  /* --- WAVE 3 curse devices ------------------------------------------------ */
  // a light and a dark square with a forced step between
  hw3_wrong_foot: (
    <Gl>
      <rect x="1" y="1" width="4" height="4" fill="#c9b0e8" /><rect x="5" y="5" width="4" height="4" fill="#3a3346" />
      <path d="M4.4 4.4 L5.6 5.6 M5.6 5.6 L4.6 5.6 M5.6 5.6 L5.6 4.6" fill="none" stroke="#c94a5a" strokeWidth="0.6" {...SJ} />
    </Gl>
  ),
  // a barred back rank with a blocked retreat arrow
  hw3_no_retreat: (
    <Gl>
      <path d="M1 8.2 H9" stroke="#c9a84c" strokeWidth="1" strokeLinecap="round" />
      <path d="M5 6.6 V2.4 M5 6.6 L3.8 5.4 M5 6.6 L6.2 5.4" fill="none" stroke="#8a94a8" strokeWidth="0.7" {...SJ} />
      <path d="M2.8 2 L7.2 4" stroke="#c94a5a" strokeWidth="0.7" strokeLinecap="round" />
    </Gl>
  ),
  // a piece with a jammed cog seizing it
  hw3_overexertion: (
    <Gl>
      <circle cx="5" cy="5" r="2.6" fill="none" stroke="#8a94a8" strokeWidth="0.7" />
      <path d="M5 1.6 V2.8 M5 7.2 V8.4 M1.6 5 H2.8 M7.2 5 H8.4 M2.6 2.6 L3.5 3.5 M7.4 2.6 L6.5 3.5 M2.6 7.4 L3.5 6.5 M7.4 7.4 L6.5 6.5" stroke="#8a94a8" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M4 4 L6 6 M6 4 L4 6" stroke="#c94a5a" strokeWidth="0.6" strokeLinecap="round" />
    </Gl>
  ),
  // a toll gate with a coin
  hw3_toll_road: (
    <Gl>
      <path d="M2 9 V3 M8 9 V3 M1.4 3 H8.6" fill="none" stroke="#8a94a8" strokeWidth="0.7" strokeLinecap="round" />
      <circle cx="5" cy="6" r="1.8" fill="#e8b04b" stroke="#8a6a3a" strokeWidth="0.5" />
      <path d="M5 4.6 V7.4 M4 5.4 H6" stroke="#8a6a3a" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a pawn split half-friend half-foe
  hw3_fifth_column: (
    <Gl>
      <path d="M5 1.4 C6.2 1.4 7 2.2 7 3.2 C7 3.9 6.6 4.5 6 4.8 L7 8.4 H5 Z M5 8.8 H7.6 V9.8 H5 Z" fill="#8f6bff" stroke="#2a1030" strokeWidth="0.35" {...SJ} />
      <path d="M5 1.4 C3.8 1.4 3 2.2 3 3.2 C3 3.9 3.4 4.5 4 4.8 L3 8.4 H5 Z M5 8.8 H2.4 V9.8 H5 Z" fill="#8a94a8" stroke="#2a2a30" strokeWidth="0.35" {...SJ} />
    </Gl>
  ),
  // two rings knotted by one thread
  hw3_binding_oath: (
    <Gl>
      <circle cx="3" cy="5" r="2.2" fill="none" stroke="#c9b0e8" strokeWidth="0.8" />
      <circle cx="7" cy="5" r="2.2" fill="none" stroke="#c9b0e8" strokeWidth="0.8" />
      <path d="M4.8 3.6 L5.2 6.4" stroke="#c94a5a" strokeWidth="0.6" strokeLinecap="round" />
    </Gl>
  ),
  // a phial dripping green over a rank line
  hw3_slow_poison: (
    <Gl>
      <path d="M4 1.4 H6 V3.4 C7.4 4.4 8 5.8 7.8 7.2 C7.6 8.4 6.6 9 5 9 C3.4 9 2.4 8.4 2.2 7.2 C2 5.8 2.6 4.4 4 3.4 Z" fill="none" stroke="#7fae4a" strokeWidth="0.55" {...SJ} />
      <path d="M5 5.2 C5.9 6.2 6 7 5 7.8 C4 7 4.1 6.2 5 5.2 Z" fill="#7fae4a" />
    </Gl>
  ),
  // a fanged mouth over two red drops
  hw3_bloodlust: (
    <Gl>
      <path d="M1.6 2.4 C3.6 4 6.4 4 8.4 2.4 C8.4 2.4 7.4 1.4 5 1.4 C2.6 1.4 1.6 2.4 1.6 2.4 Z M3 2.8 L3.6 4 L4.2 2.8 M5.8 2.8 L6.4 4 L7 2.8" fill="#7a1a24" stroke="#c94a5a" strokeWidth="0.35" {...SJ} />
      <path d="M4 6 C5 7.2 5.4 8 5.4 8.6 A1.4 1.4 0 1 1 2.6 8.6 C2.6 8 3 7.2 4 6 Z M7 6.4 C7.8 7.4 8.1 8 8.1 8.5 A1.1 1.1 0 1 1 5.9 8.5 C5.9 8 6.2 7.4 7 6.4 Z" fill="#c94a5a" />
    </Gl>
  ),
  // a hobbled figure passing a hex-mark on
  hw3_curse_hop: (
    <Gl>
      <circle cx="3" cy="4" r="1.8" fill="none" stroke="#e8b04b" strokeWidth="0.7" />
      <circle cx="7" cy="6" r="1.8" fill="none" stroke="#c9cdd6" strokeWidth="0.7" />
      <path d="M4.4 4.6 C5.2 4.4 5.8 5 6 5.6 M5.6 4.6 L6.2 5 L6 5.7" fill="none" stroke="#c94a5a" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // a barred tile with a patrol arrow
  hw3_wandering_sentry: (
    <Gl>
      <path d="M5 2 L8.6 5 L5 8 L1.4 5 Z" fill="#3a3a40" stroke="#8a94a8" strokeWidth="0.5" {...SJ} />
      <path d="M3.4 5 H6.6 M6.6 5 L5.8 4.4 M6.6 5 L5.8 5.6" fill="none" stroke="#c9cdd6" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // two hearts joined, one frosted
  hw3_bloodbond: (
    <Gl>
      <path d="M3 3.4 C3 2.4 4.2 2.4 4.2 3.4 C4.2 2.4 5.4 2.4 5.4 3.4 C5.4 4.6 4.2 5.6 4.2 5.6 C4.2 5.6 3 4.6 3 3.4 Z" fill="#c94a5a" />
      <path d="M5 6 C5 5 6.2 5 6.2 6 C6.2 5 7.4 5 7.4 6 C7.4 7.2 6.2 8.2 6.2 8.2 C6.2 8.2 5 7.2 5 6 Z" fill="#9fd8ff" />
      <path d="M4.2 4.6 L6 6" stroke="#8a94a8" strokeWidth="0.5" strokeDasharray="0.8 0.6" strokeLinecap="round" />
    </Gl>
  ),
  // a marked piece and a road out of the border
  hw3_exiles_mark: (
    <Gl>
      <path d="M2.6 8 C2.6 5.4 3.6 4 5.2 3.2 L4.8 1.6 L6.2 2.6 C6.9 3.2 7.1 4.2 6.7 5.1 L5.6 4.8 C5.8 6.4 5.8 7 6.4 8 Z" fill="#5a6b8f" stroke="#2b2218" strokeWidth="0.35" {...SJ} />
      <path d="M1 9 C3 8 5 6.6 6 4" fill="none" stroke="#c9a84c" strokeWidth="0.5" strokeDasharray="1.1 0.8" strokeLinecap="round" />
    </Gl>
  ),
  // a piece with a debt-tally growing beside it
  hw3_debtors_mark: (
    <Gl>
      <path d="M2 8.4 C1.6 5 3 3 4.4 3 L4 1.6 L5.4 2.6 C6.1 3.2 6 4 5.6 4.8 C6 6 6 7.2 6.4 8.4 Z" fill="#c9a84c" stroke="#3a2a16" strokeWidth="0.35" {...SJ} />
      <path d="M7 8.4 V3.4 M7.9 8.4 V4.4 M8.8 8.4 V5.4" stroke="#8a94a8" strokeWidth="0.7" strokeLinecap="round" />
    </Gl>
  ),
  // a portcullis dropped over a rook
  hw3_jammed_castle: (
    <Gl>
      <path d="M2 1.2 V8.8 M4 1.2 V8.8 M6 1.2 V8.8 M8 1.2 V8.8 M2 4 H8 M2 6.4 H8" fill="none" stroke="#8a94a8" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M3.4 8.8 V6.6 H6.6 V8.8" fill="#5a6b8f" stroke="#2c3e6b" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // a crown taxing a frosted piece
  hw3_coronation_tax: (
    <Gl>
      <path d="M1.6 4 L1.2 1.6 L2.6 2.8 L3.8 1 L5 2.8 L6.2 1.4 L5.8 4 Z" fill="#e8b04b" stroke="#8a6a3a" strokeWidth="0.4" transform="translate(0.6 0)" {...SJ} />
      <circle cx="7" cy="6.8" r="1.8" fill="#2c3e6b" stroke="#9fd8ff" strokeWidth="0.4" />
      <path d="M7 5.4 L7 8.2 M5.8 6.8 H8.2 M6.2 6 L7.8 7.6 M7.8 6 L6.2 7.6" stroke="#9fd8ff" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // a knight turning its coat
  hw3_mutiny: (
    <Gl>
      <path d="M2.6 8 C2.6 5.4 3.6 4 5.2 3.2 L4.8 1.6 L6.2 2.6 C6.9 3.2 7.1 4.2 6.7 5.1 L5.6 4.8 C5.8 6.4 5.8 7 6.4 8 Z M2.2 8.6 H7.4 V9.6 H2.2 Z" fill="#8f6bff" stroke="#2a1030" strokeWidth="0.35" {...SJ} />
      <path d="M8 3 H9 M8.6 2.2 L9.2 3.6" stroke="#c94a5a" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a plus-shaped mire shrinking
  hw3_sinking_mire: (
    <Gl>
      <path d="M4 2 H6 V4 H8 V6 H6 V8 H4 V6 H2 V4 H4 Z" fill="#3a3a40" stroke="#6f8a4a" strokeWidth="0.4" {...SJ} />
      <path d="M4.2 5 H5.8" stroke="#6f8a4a" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a powder keg with a lit fuse
  hw3_time_bomb: (
    <Gl>
      <rect x="2.2" y="3.4" width="5.6" height="5.2" rx="1" fill="#3a3a40" stroke="#c9cdd6" strokeWidth="0.5" />
      <path d="M6 3.4 C6.4 1.8 7.6 1.2 8.2 1.8" fill="none" stroke="#8a6a3a" strokeWidth="0.5" strokeLinecap="round" />
      <circle cx="8.4" cy="1.6" r="0.8" fill="#ff9d3d" />
    </Gl>
  ),
  // a shrine with a pilgrim's road
  hw3_pilgrimage: (
    <Gl>
      <path d="M5 1 L8 4.4 H2 Z M2.6 4.4 H7.4 V9 H2.6 Z" fill="none" stroke="#c9b0e8" strokeWidth="0.5" {...SJ} />
      <path d="M4.6 9 V6.4 H5.4 V9" fill="none" stroke="#c9b0e8" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // a blade rusting with age
  hw3_aging_blade: (
    <Gl>
      <path d="M6.6 1 L3 6 L4.2 7 L8 2 Z" fill="#c9cdd6" stroke="#5a6b8f" strokeWidth="0.4" {...SJ} />
      <path d="M2.4 6.6 L4.6 8.4 M2 8.8 L3.4 7.4" stroke="#8a6a3a" strokeWidth="0.6" strokeLinecap="round" />
      <circle cx="5" cy="4" r="0.5" fill="#8a5a3a" /><circle cx="6.2" cy="2.6" r="0.4" fill="#8a5a3a" />
    </Gl>
  ),
  // a piece clouded by sickly vapor
  hw3_miasma: (
    <Gl>
      <path d="M2 4 C1 4 0.8 2.6 1.8 2.2 C1.8 0.8 3.6 0.6 4.2 1.6 C4.8 0.6 6.8 0.8 6.8 2.2 C8 2 8.6 3.6 7.4 4 Z" fill="#6f8a4a" stroke="#2f3a26" strokeWidth="0.35" {...SJ} />
      <circle cx="5" cy="6.8" r="1.9" fill="none" stroke="#8faf4a" strokeWidth="0.6" />
      <path d="M4 6 L6 7.6 M6 6 L4 7.6" stroke="#c94a5a" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a sleeper minor over a lit fuse
  hw3_defectors_mark: (
    <Gl>
      <path d="M2.6 7 C2.6 4.8 3.6 3.6 5.2 3 L4.8 1.6 L6.2 2.4 C6.9 3 7.1 3.8 6.7 4.6 L5.6 4.4 C5.8 5.8 5.8 6.2 6.4 7 Z" fill="#8f6bff" stroke="#2a1030" strokeWidth="0.35" {...SJ} />
      <path d="M2 8.6 C3.6 8.6 3.6 9.4 5 9.4 C6.4 9.4 6.4 8.6 8 8.6" fill="none" stroke="#ff9d3d" strokeWidth="0.6" strokeLinecap="round" />
      <circle cx="8.2" cy="8.6" r="0.6" fill="#ff9d3d" />
    </Gl>
  ),
  // a hungry void drifting
  hw3_roaming_void: (
    <Gl>
      <circle cx="5" cy="5" r="3.4" fill="#12081f" stroke="#5b2b8f" strokeWidth="0.6" />
      <path d="M5 1.6 C5 1.6 6 3.4 6 5 C6 6.6 5 8.4 5 8.4" fill="none" stroke="#8f6bff" strokeWidth="0.4" strokeDasharray="0.8 0.7" />
      <path d="M8.4 5 H9.6 M8.4 5 L7.8 4.4 M8.4 5 L7.8 5.6" fill="none" stroke="#8f6bff" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // two figures sharing one fate-cut
  hw3_shared_fate: (
    <Gl>
      <circle cx="3" cy="4" r="1.6" fill="#c9b0e8" /><circle cx="7" cy="4" r="1.6" fill="#8a94a8" />
      <path d="M1.4 9 L8.6 5.4" stroke="#c94a5a" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M4.4 5 L5.6 6" stroke="#c94a5a" strokeWidth="0.5" strokeDasharray="0.7 0.6" strokeLinecap="round" />
    </Gl>
  ),
  // a rank of tiles caving in
  hw3_collapsing_floor: (
    <Gl>
      <path d="M1 3.4 H9 V4.6 H1 Z" fill="#3a3a40" stroke="#8a94a8" strokeWidth="0.4" />
      <path d="M2 4.6 L1.6 8 M4 4.6 L4.4 8.4 M6 4.6 L5.6 8 M8 4.6 L8.4 8.4" stroke="#8a94a8" strokeWidth="0.5" strokeLinecap="round" strokeDasharray="1 0.8" />
    </Gl>
  ),
  // a bounty target with a frost cuff
  hw3_bounty_mark: (
    <Gl>
      <circle cx="5" cy="5" r="3.6" fill="none" stroke="#c94a5a" strokeWidth="0.7" />
      <circle cx="5" cy="5" r="1.8" fill="none" stroke="#c94a5a" strokeWidth="0.6" />
      <circle cx="5" cy="5" r="0.6" fill="#c94a5a" />
      <path d="M5 0.6 V2 M5 8 V9.4 M0.6 5 H2 M8 5 H9.4" stroke="#9fd8ff" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a flame spreading along a chain of figures
  hw3_wildfire: (
    <Gl>
      <path d="M3 8.6 C1.6 6.6 2.4 4.6 3.2 5.4 C3 3.6 4.2 2.4 4 4 C4.8 2.6 5.6 4 5 5 C6 4.6 6 6.4 5 7 C6 7.4 5.6 8.6 4 8.6 Z" fill="#c95a2a" stroke="#7a2a10" strokeWidth="0.35" {...SJ} />
      <path d="M6.4 6 H8.4 M8.4 6 L7.6 5.4 M8.4 6 L7.6 6.6" fill="none" stroke="#ff9d3d" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // a scarecrow effigy over barred ground
  hw3_effigy_of_dread: (
    <Gl>
      <path d="M5 3 V8.4 M2.6 4.6 H7.4" stroke="#8faf4a" strokeWidth="0.7" strokeLinecap="round" />
      <circle cx="5" cy="2.2" r="1.2" fill="#3a3a40" stroke="#8faf4a" strokeWidth="0.4" />
      <path d="M1.4 9 L2.4 8 M8.6 9 L7.6 8 M1.4 8 L2.4 9 M8.6 8 L7.6 9" stroke="#6f8a4a" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // a snow shelf breaking over sealed squares
  hw3_avalanche: (
    <Gl>
      <path d="M1 2.6 C3 1.6 7 1.6 9 3 C7 3 5 3.4 3 4 C2 3.6 1.4 3.2 1 2.6 Z" fill="#c9cdd6" stroke="#8a94a8" strokeWidth="0.4" {...SJ} />
      <path d="M2 6 L3.2 7.2 M4.2 5.6 L5.4 6.8 M6.4 6 L7.6 7.2" stroke="#8a94a8" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M2.4 8.6 L3.2 7.8 M5 8.8 L5.8 8 M7.4 8.6 L8.2 7.8" stroke="#5a6b8f" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a crown that freezes its nearest guard
  hw3_kings_guard: (
    <Gl>
      <path d="M2.4 4 L2 1.6 L3.4 2.8 L4.6 1 L5.8 2.8 L7.2 1.6 L6.8 4 Z" fill="#c9a84c" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <circle cx="7" cy="7" r="1.8" fill="#2c3e6b" stroke="#9fd8ff" strokeWidth="0.4" />
      <path d="M6.2 6.2 L7.8 7.8 M7.8 6.2 L6.2 7.8" stroke="#9fd8ff" strokeWidth="0.45" strokeLinecap="round" />
    </Gl>
  ),
  // rings tightening around a slider
  hw3_feeding_frenzy: (
    <Gl>
      <circle cx="5" cy="5" r="3.8" fill="none" stroke="#8f6bff" strokeWidth="0.5" />
      <circle cx="5" cy="5" r="2.6" fill="none" stroke="#c9b0e8" strokeWidth="0.5" />
      <circle cx="5" cy="5" r="1.4" fill="none" stroke="#c94a5a" strokeWidth="0.6" />
    </Gl>
  ),
  // a condemned piece under an hourglass axe
  hw3_doomed_vow: (
    <Gl>
      <path d="M3 1.4 H7 L4.2 5 L7 8.6 H3 L5.8 5 Z" fill="none" stroke="#c9b0e8" strokeWidth="0.55" {...SJ} />
      <path d="M4.2 5 H5.8 L5 6.2 Z" fill="#c94a5a" />
    </Gl>
  ),
  // a piece with a peeling turncoat shadow
  hw3_enemy_within: (
    <Gl>
      <path d="M2.4 8.4 L3.2 3.4 H5.4 L6.2 8.4 Z M2 8.8 H6.6 V9.8 H2 Z" fill="#8a94a8" stroke="#2a2a30" strokeWidth="0.35" {...SJ} />
      <path d="M4.8 8.4 L5.6 3.4 H7 L7.8 8.4 Z" fill="#c94a5a" opacity="0.75" />
    </Gl>
  ),
  // a black moon crossing the sun
  hw3_eclipse: (
    <Gl>
      <circle cx="5" cy="5" r="3.4" fill="#ff9d3d" />
      <circle cx="6.4" cy="4.2" r="3" fill="#12121c" />
      <path d="M5 0.6 V1.6 M5 8.4 V9.4 M0.6 5 H1.6 M8.4 5 H9.4" stroke="#ff9d3d" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // one severed head, two rising
  hw3_hydra_hex: (
    <Gl>
      <path d="M3 9 C2.4 7 3 5.4 4 4 C4 5.4 4.4 6.8 3 9 Z M7 9 C7.6 7 7 5.4 6 4 C6 5.4 5.6 6.8 7 9 Z" fill="#7fae4a" stroke="#1c2a1c" strokeWidth="0.4" {...SJ} />
      <path d="M4 4 C4 2.4 6 2.4 6 4 M5 2.8 V1.4" fill="none" stroke="#7fae4a" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M4.4 1.4 L5 0.6 L5.6 1.4" fill="#c94a5a" stroke="#1c2a1c" strokeWidth="0.3" {...SJ} />
    </Gl>
  ),
  // a wilting laurel over a bell
  hw3_pyrrhic_toll: (
    <Gl>
      <path d="M5 5 C2.6 5.4 1.6 3.4 2 1.4 M5 5 C7.4 5.4 8.4 3.4 8 1.4" fill="none" stroke="#c9b89a" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M3.6 7 C3.6 5.8 4.2 5.2 5 5 C5.8 5.2 6.4 5.8 6.4 7 Z M3 7 H7 L6.6 7.8 H3.4 Z" fill="#9fd8ff" stroke="#5a6b8f" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // a briar crown drawing a checkmark
  hw3_martyrs_crown: (
    <Gl>
      <path d="M1.6 6 C3.6 4.4 6.4 4.4 8.4 6" fill="none" stroke="#8faf4a" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M3 5.2 L2.6 4.2 M5 4.8 L5 3.8 M7 5.2 L7.4 4.2" stroke="#8faf4a" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M3.4 8 L4.6 9.2 L7 6.4" fill="none" stroke="#c94a5a" strokeWidth="0.7" {...SJ} />
    </Gl>
  ),
  // two grinding gears with a cold spark
  hw3_curse_engine: (
    <Gl>
      <circle cx="3.6" cy="4" r="1.8" fill="none" stroke="#8a94a8" strokeWidth="0.7" />
      <path d="M3.6 1.6 V2.4 M3.6 5.6 V6.4 M1.2 4 H2 M5.2 4 H6" stroke="#8a94a8" strokeWidth="0.6" strokeLinecap="round" />
      <circle cx="6.8" cy="6.4" r="1.5" fill="none" stroke="#8a94a8" strokeWidth="0.6" />
      <path d="M6.8 4.6 V5.2 M6.8 7.6 V8.2 M5 6.4 H5.6 M8 6.4 H8.6" stroke="#8a94a8" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M4.4 8 L5.6 9.2" stroke="#9fd8ff" strokeWidth="0.6" strokeLinecap="round" />
    </Gl>
  ),
  // a ledger claiming a pawn as tribute
  hw3_blood_tithe: (
    <Gl>
      <path d="M1.2 2.4 C3.2 1.4 4.6 1.6 5 2.6 C5.4 1.6 6.8 1.4 8.8 2.4 V7.4 C6.8 6.4 5.4 6.6 5 7.6 C4.6 6.6 3.2 6.4 1.2 7.4 Z" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <path d="M2.4 3.6 H4.4 M2.4 4.8 H4 M6 3.6 H8 M6 4.8 H7.6" stroke="#8a6a3a" strokeWidth="0.35" strokeLinecap="round" />
      <path d="M5 8 C5.9 9 6 9.5 6 9.9 A1 1 0 1 1 4 9.9 C4 9.5 4.1 9 5 8 Z" fill="#c94a5a" />
    </Gl>
  ),
  // a crown flipped to a tin knight helm
  hw3_inverted_crown: (
    <Gl>
      <path d="M1.6 3.4 V7.6 L3.8 5.8 L5 8.4 L6.2 5.8 L8.4 7.6 V3.4 Z" fill="#c9b89a" stroke="#5a4a36" strokeWidth="0.45" {...SJ} />
      <path d="M4 3 L5 1 L6 3" fill="none" stroke="#8faf4a" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
};

/* =============================================================================
   Registry — CARD -> TEMPLATE / PALETTE / GLYPH (+ flourish), or a bespoke
   scene for the tier 7–8 flagships. `source` names an fx zone only where the
   card reliably paints it at play time.
   ========================================================================== */

/** Bind a template + palette + glyph + config into a SigPlugin entry. The
 * trailing `flourish` keys that card's dedicated dressing block inside the
 * template (rendering only — the config object is untouched). */
function G(
  Template: ComponentType<TemplateProps>,
  palette: Palette,
  glyph: ReactNode,
  config: SigPlugin["config"],
  flourish?: string,
): SigPlugin {
  const aim = config.anchor === "aim";
  return {
    config,
    Render: function CursePlayRender({ lead, role, delayMs }: { lead: boolean; role: SigRole; delayMs: number }) {
      return (
        <Template
          palette={palette}
          glyph={glyph}
          lead={lead}
          role={role}
          delayMs={delayMs}
          flourish={flourish}
          aim={aim}
        />
      );
    },
  };
}

/** Bind a fully bespoke scene component into a SigPlugin entry. */
function S(Scene: ComponentType<SceneProps>, config: SigPlugin["config"]): SigPlugin {
  return {
    config,
    Render: function CurseSceneRender({ lead, role, delayMs }: { lead: boolean; role: SigRole; delayMs: number }) {
      return <Scene lead={lead} role={role} delayMs={delayMs} />;
    },
  };
}

export const PLAYS: Record<string, SigPlugin> = {
  /* --- HexBrand (marks, contracts, tallies) ------------------------------- */
  hw2_witchs_veto: G(HexBrand, ["#6b4a8f", "#c9b0e8", "#2a1030"], GLYPH.hw2_witchs_veto, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
    anchor: "cast",
  }, "veto"),
  hw2_long_road_home: G(HexBrand, ["#5a6b8f", "#c9a84c", "#2b2218"], GLYPH.hw2_long_road_home, {
    ordering: "radial", staggerMs: 0, victims: ["n", "b", "r"], hasLead: true, sound: "shades",
    anchor: "aim",
  }, "longroad"),
  hw2_blood_price: G(HexBrand, ["#6b1a2a", "#e8b04b", "#2b1218"], GLYPH.hw2_blood_price, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
    anchor: "board",
  }, "bloodprice"),
  // The tarnish takes each promoting pawn one at a time, on the promotion
  // square, so the seal is stamped there. HexBrand's only board-scale layer is
  // <Wash> (inside <BoardFrame>); everything else is composed about the stage
  // centre, so it travels to a corner cast intact.
  hw2_tarnished_crown: G(HexBrand, ["#4a3a22", "#e8b04b", "#2a2a30"], GLYPH.hw2_tarnished_crown, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true, sound: "clockice",
    anchor: "board",
  }, "tarnish"),
  hw2_war_rations: G(HexBrand, ["#8a7a63", "#e8dcc0", "#3a3026"], GLYPH.hw2_war_rations, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
    anchor: "board",
  }, "rations"),
  hw2_compounding_misery: G(HexBrand, ["#5b2b8f", "#8f6bff", "#12081f"], GLYPH.hw2_compounding_misery, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen",
    anchor: "board",
  }, "stacked"),

  /* --- OmenBell (countdowns, rhythms, delayed dooms) ----------------------- */
  hw2_bad_omen: G(OmenBell, ["#2c3e6b", "#cdd6ff", "#0d1326"], GLYPH.hw2_bad_omen, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
    anchor: "board",
  }, "omen"),
  hw2_tolling_bell: G(OmenBell, ["#6b4a8f", "#c9b0e8", "#1c0f18"], GLYPH.hw2_tolling_bell, {
    ordering: "sweep", staggerMs: 55, victims: ["b", "r", "q"], hasLead: true, sound: "cathedral",
    anchor: "board",
  }, "halfmeasure"),
  hw2_witching_hour: G(OmenBell, ["#1c1c2a", "#9fd8ff", "#2c3e6b"], GLYPH.hw2_witching_hour, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage",
    anchor: "board",
  }, "midnight"),
  // One overworked piece collapses at a time, where it stands. OmenBell hangs
  // its bell, ripples and glyph about the stage centre and puts nothing
  // board-scale outside <BoardFrame>, so the bell simply tolls over the cast
  // square instead of the middle of the board.
  hw2_weight_of_toil: G(OmenBell, ["#8a7a63", "#c9a84c", "#3a3026"], GLYPH.hw2_weight_of_toil, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "petrify",
    anchor: "cast",
  }, "toil"),

  /* --- BlightGarden (cursed and remembering ground) ------------------------ */
  // The ice takes the SQUARE a piece just left — a single square per trigger —
  // so the rot spreads from the cast square outward. BlightGarden's tiles,
  // weeds and glyph all sit about the stage centre; only <Wash> is board-scale
  // and it is already inside <BoardFrame>.
  hw2_cold_footprints: G(BlightGarden, ["#2c3e6b", "#9fd8ff", "#e8f8ff"], GLYPH.hw2_cold_footprints, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "clockice",
    anchor: "cast",
  }, "footprints"),
  hw2_creeping_blight: G(BlightGarden, ["#2f3a26", "#8faf4a", "#c9d69a"], GLYPH.hw2_creeping_blight, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
    anchor: "board",
  }, "creep"),
  hw2_gravebloom: G(BlightGarden, ["#1c241c", "#7fae5a", "#c94a5a"], GLYPH.hw2_gravebloom, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "petrifiedforest",
    anchor: "board",
  }, "gravebloom"),
  hw2_gathering_storm: G(BlightGarden, ["#2c3e6b", "#5a6b8f", "#9fd8ff"], GLYPH.hw2_gathering_storm, {
    ordering: "sweep", staggerMs: 45, victims: "all", hasLead: true, sound: "shades",
    anchor: "board",
  }, "stormwall"),

  /* --- ChainWeb (binds, compulsions, ransoms) ------------------------------ */
  hw2_twinned_torment: G(ChainWeb, ["#5b2b8f", "#c9b0e8", "#c94a5a"], GLYPH.hw2_twinned_torment, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice",
    anchor: "aim",
  }, "twin"),
  hw2_no_reins: G(ChainWeb, ["#3a3026", "#c9a84c", "#8a6a3a"], GLYPH.hw2_no_reins, {
    ordering: "sweep", staggerMs: 55, victims: ["b", "r", "q"], hasLead: true, sound: "blitz",
    anchor: "board",
  }, "noreins"),
  hw2_curse_of_recoil: G(ChainWeb, ["#4a3a2a", "#ff9d3d", "#c9cdd6"], GLYPH.hw2_curse_of_recoil, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "siege",
    anchor: "board",
  }, "recoil"),
  hw2_queens_ransom: G(ChainWeb, ["#5b2b8f", "#ffd76a", "#1c0f18"], GLYPH.hw2_queens_ransom, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "clockice",
    anchor: "board",
  }, "ransom"),
  hw2_bound_court: G(ChainWeb, ["#3a3a40", "#8a94a8", "#ffd76a"], GLYPH.hw2_bound_court, {
    ordering: "sweep", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "petrify", source: "walnut",
    anchor: "board",
  }, "courtlock"),

  /* --- MidasVeil (transferring / accumulating marks) ----------------------- */
  hw2_cursed_coin: G(MidasVeil, ["#3a3026", "#e8b04b", "#c9cdd6"], GLYPH.hw2_cursed_coin, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
    anchor: "aim",
  }, "coin"),
  hw2_gilded_rot: G(MidasVeil, ["#2a2a30", "#e8b04b", "#c9b89a"], GLYPH.hw2_gilded_rot, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "coronation",
    anchor: "board",
  }, "gilded"),

  /* --- Bespoke scenes (tier 7–8 flagships) --------------------------------- */
  hw2_death_knell: S(DeathKnellScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral",
    anchor: "cast",
  }),
  hw2_hollow_crown: S(HollowCrownScene, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "coronation",
    anchor: "board",
  }),
  hw2_tide_of_ash: S(TideOfAshScene, {
    ordering: "sweep", staggerMs: 45, victims: "all", hasLead: true, sound: "cataclysm",
    anchor: "board",
  }),
  hw2_crown_of_thorns: S(CrownOfThornsScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis",
    anchor: "cast",
  }),
  hw2_pauper_crown: S(PauperCrownScene, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "crownrain",
    anchor: "cast",
  }),
  hw2_beacon_of_woe: S(BeaconOfWoeScene, {
    ordering: "radial", staggerMs: 60, victims: ["n", "b", "r", "q"], hasLead: true, sound: "nova",
    anchor: "board",
  }),

  /* === WAVE 3 ============================================================== */

  /* --- HexBrand (marks / contracts / taxes / tallies) --------------------- */
  hw3_wrong_foot: G(HexBrand, ["#6b4a8f", "#c9b0e8", "#2a1030"], GLYPH.hw3_wrong_foot, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "shades",
    anchor: "board",
  }, "wrongfoot"),
  // The seizure takes ONE piece — the one moved twice running — and freezes it
  // where it stands, so the brand is stamped on that square. Anchor-safe:
  // HexBrand keeps <Wash> in <BoardFrame> and nothing else claims the board.
  hw3_overexertion: G(HexBrand, ["#3a3a44", "#8a94a8", "#12121a"], GLYPH.hw3_overexertion, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen",
    anchor: "cast",
  }, "overexert"),
  hw3_toll_road: G(HexBrand, ["#5a6b8f", "#c9a84c", "#2b2218"], GLYPH.hw3_toll_road, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
    anchor: "board",
  }, "tollroad"),
  // The frenzy COMPELS a piece onto its next victim, so the play is a vector,
  // not a bloom: "aim" gives HexBrand its <ChainLeg>, which reaches from the
  // branded square down the real source -> target leg by --fx-len. The
  // "bloodlust" flourish already drags its queen rightward, the authored-right
  // convention the leg's `fx-aim` rotation assumes; the queen herself stays
  // upright (only the leg is rotated), and <Wash> stays in <BoardFrame>.
  hw3_bloodlust: G(HexBrand, ["#6b1a2a", "#e8b04b", "#2b1218"], GLYPH.hw3_bloodlust, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
    anchor: "aim",
  }, "bloodlust"),
  hw3_exiles_mark: G(HexBrand, ["#5a6b8f", "#c9a84c", "#1c2418"], GLYPH.hw3_exiles_mark, {
    ordering: "radial", staggerMs: 0, victims: ["n", "b", "r"], hasLead: true, sound: "shades",
    anchor: "aim",
  }, "exile"),
  hw3_debtors_mark: G(HexBrand, ["#4a3a22", "#c9a84c", "#2a2a30"], GLYPH.hw3_debtors_mark, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen",
    anchor: "cast",
  }, "debtor"),
  // Each coronation freezes ONE other piece, on its own square, so the tax is
  // levied there rather than over the whole board. Anchor-safe for the same
  // reason as its HexBrand siblings: only <Wash> means "the board", and it is
  // inside <BoardFrame>.
  hw3_coronation_tax: G(HexBrand, ["#4a3a22", "#e8b04b", "#2c3e6b"], GLYPH.hw3_coronation_tax, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true, sound: "clockice", source: "frozen",
    anchor: "cast",
  }, "coronationtax"),
  hw3_pilgrimage: G(HexBrand, ["#5b2b8f", "#c9b0e8", "#1c0f18"], GLYPH.hw3_pilgrimage, {
    ordering: "radial", staggerMs: 0, victims: ["n", "b", "r"], hasLead: true, sound: "shades",
    anchor: "aim",
  }, "pilgrimage"),
  hw3_bounty_mark: G(HexBrand, ["#6b1a2a", "#c94a5a", "#2b1218"], GLYPH.hw3_bounty_mark, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen",
    anchor: "cast",
  }, "bounty"),
  hw3_feeding_frenzy: G(HexBrand, ["#5b2b8f", "#8f6bff", "#12081f"], GLYPH.hw3_feeding_frenzy, {
    ordering: "radial", staggerMs: 0, victims: ["b", "r", "q"], hasLead: true, sound: "shades",
    anchor: "board",
  }, "feedingfrenzy"),

  /* --- OmenBell (countdowns / fuses / delayed dooms) ---------------------- */
  hw3_slow_poison: G(OmenBell, ["#2f3a26", "#7fae4a", "#1c241c"], GLYPH.hw3_slow_poison, {
    ordering: "radial", staggerMs: 0, victims: ["b", "r", "q"], hasLead: true, sound: "shades",
    anchor: "cast",
  }, "slowpoison"),
  hw3_jammed_castle: G(OmenBell, ["#3a3a40", "#8a94a8", "#1c1c24"], GLYPH.hw3_jammed_castle, {
    ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "clockice", source: "frozen",
    anchor: "cast",
  }, "jammedgate"),
  hw3_time_bomb: G(OmenBell, ["#3a3a40", "#ff9d3d", "#1c1c24"], GLYPH.hw3_time_bomb, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "siege",
    anchor: "board",
  }, "powderkeg"),
  hw3_collapsing_floor: G(OmenBell, ["#4a4a52", "#c9cdd6", "#1c1c24"], GLYPH.hw3_collapsing_floor, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "clockice", source: "frozen",
    anchor: "board",
  }, "collapse"),
  hw3_doomed_vow: G(OmenBell, ["#2a1030", "#c9b0e8", "#8a94a8"], GLYPH.hw3_doomed_vow, {
    ordering: "radial", staggerMs: 0, victims: ["b", "r", "q"], hasLead: true, sound: "cathedral",
    anchor: "cast",
  }, "doomedvow"),

  /* --- BlightGarden (hazards / contagion / terrain) ----------------------- */
  hw3_wandering_sentry: G(BlightGarden, ["#2f3a26", "#8faf4a", "#c9d69a"], GLYPH.hw3_wandering_sentry, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
    anchor: "board",
  }, "sentry"),
  hw3_sinking_mire: G(BlightGarden, ["#2f3a26", "#6f8a4a", "#1c241c"], GLYPH.hw3_sinking_mire, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
    anchor: "board",
  }, "mire"),
  // The miasma is breathed in by the one piece that crowds a neighbour, and it
  // is that piece's square that rots. BlightGarden spreads its tiles from the
  // stage centre outward, so the rot now spreads from the cast square; <Wash>
  // is the only board-scale layer and lives in <BoardFrame>.
  hw3_miasma: G(BlightGarden, ["#2f3a26", "#8faf4a", "#6f9a3a"], GLYPH.hw3_miasma, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "petrifiedforest",
    anchor: "cast",
  }, "miasma"),
  hw3_roaming_void: G(BlightGarden, ["#12081f", "#8f6bff", "#5b2b8f"], GLYPH.hw3_roaming_void, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
    anchor: "board",
  }, "maw"),
  hw3_wildfire: G(BlightGarden, ["#2b1208", "#ff9d3d", "#7a2a10"], GLYPH.hw3_wildfire, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "shades",
    anchor: "aim",
  }, "wildfire"),
  hw3_effigy_of_dread: G(BlightGarden, ["#1c2a1c", "#8faf4a", "#3a3a40"], GLYPH.hw3_effigy_of_dread, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "petrifiedforest", source: "summon",
    anchor: "board",
  }, "effigy"),
  hw3_avalanche: G(BlightGarden, ["#3a3a40", "#c9cdd6", "#8a94a8"], GLYPH.hw3_avalanche, {
    ordering: "sweep", staggerMs: 45, victims: "all", hasLead: true, sound: "shades",
    anchor: "board",
  }, "avalanche"),

  /* --- ChainWeb (binds / leashes / sympathetic links) --------------------- */
  hw3_binding_oath: G(ChainWeb, ["#3a3a40", "#8a94a8", "#c94a5a"], GLYPH.hw3_binding_oath, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
    anchor: "aim",
  }, "bindingoath"),
  hw3_bloodbond: G(ChainWeb, ["#5b2b8f", "#c9b0e8", "#9fd8ff"], GLYPH.hw3_bloodbond, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen",
    anchor: "aim",
  }, "bloodbond"),
  hw3_shared_fate: G(ChainWeb, ["#3a2630", "#c9b0e8", "#c94a5a"], GLYPH.hw3_shared_fate, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
    anchor: "board",
  }, "sharedfate"),
  hw3_kings_guard: G(ChainWeb, ["#2c3e6b", "#8a94a8", "#9fd8ff"], GLYPH.hw3_kings_guard, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "clockice", source: "frozen",
    anchor: "board",
  }, "kingsguard"),
  hw3_no_retreat: G(ChainWeb, ["#3a3026", "#c9a84c", "#8a6a3a"], GLYPH.hw3_no_retreat, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "shades",
    anchor: "board",
  }, "noretreat"),

  /* --- MidasVeil (possession / transferring marks) ------------------------ */
  hw3_fifth_column: G(MidasVeil, ["#3a2a4a", "#8f6bff", "#1c1024"], GLYPH.hw3_fifth_column, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "shades",
    anchor: "cast",
  }, "fifthcolumn"),
  hw3_curse_hop: G(MidasVeil, ["#3a3026", "#e8b04b", "#c9cdd6"], GLYPH.hw3_curse_hop, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
    anchor: "board",
  }, "handeddown"),
  // ONE knight turns its coat, on the spot, the first time it captures — a
  // single square, not a board state. MidasVeil's curtain sweep, gilded rank
  // and glyph are all composed about the stage centre, and its only
  // board-scale layer, <Wash>, is inside <BoardFrame>.
  hw3_mutiny: G(MidasVeil, ["#42264a", "#a07bff", "#1c1024"], GLYPH.hw3_mutiny, {
    ordering: "radial", staggerMs: 0, victims: ["n"], hasLead: true, sound: "shades",
    anchor: "cast",
  }, "mutiny"),
  hw3_defectors_mark: G(MidasVeil, ["#32284a", "#8f6bff", "#160f24"], GLYPH.hw3_defectors_mark, {
    ordering: "radial", staggerMs: 0, victims: ["n", "b"], hasLead: true, sound: "shades",
    anchor: "cast",
  }, "sleeper"),
  // The blade ages the capturing piece "on the spot" — one piece, one square,
  // per trigger — so the veil passes over that square. Anchor-safe: <Wash> is
  // the only layer that means the board and it is inside <BoardFrame>.
  hw3_aging_blade: G(MidasVeil, ["#3a3026", "#c9cdd6", "#5a6b8f"], GLYPH.hw3_aging_blade, {
    ordering: "radial", staggerMs: 60, victims: ["b", "r", "q"], hasLead: true, sound: "shades",
    anchor: "cast",
  }, "agingblade"),

  /* --- Tier 7-8 bespoke scenes -------------------------------------------- */
  hw3_enemy_within: S(EnemyWithinScene, {
    ordering: "radial", staggerMs: 0, victims: ["r", "q"], hasLead: true, sound: "shades",
    anchor: "cast",
  }),
  hw3_eclipse: S(EclipseScene, {
    ordering: "radial", staggerMs: 0, victims: ["b", "q"], hasLead: true, sound: "shades",
    anchor: "board",
  }),
  hw3_hydra_hex: S(HydraScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "petrify", source: "frozen",
    anchor: "aim",
  }),
  hw3_pyrrhic_toll: S(PyrrhicScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cathedral", source: "frozen",
    anchor: "board",
  }),
  hw3_martyrs_crown: S(MartyrCrownScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", source: "frozen",
    anchor: "board",
  }),
  hw3_curse_engine: S(CurseEngineScene, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "clockcage", source: "frozen",
    anchor: "board",
  }),
  hw3_blood_tithe: S(BloodTitheScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "rampage",
    anchor: "board",
  }),
  hw3_inverted_crown: S(InvertedCrownScene, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true, sound: "shades",
    anchor: "board",
  }),
};
