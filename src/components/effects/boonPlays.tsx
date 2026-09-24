// Boon-wave plugin signatures — flagships for the boon expansion batch
// (src/engine/buffs/boons2.ts). Same registry contract as the other plugin
// modules (see sigPlugins.tsx): self-contained render art, own CSS
// (boonPlays.css), transform/opacity only, no imports from BoardEffects.tsx.
// Every entry must be a bespoke scene or a template + per-card flourish with
// real per-flourish dressing — the animation audit (npm run test:animations)
// fails shared flagships that grow the committed baseline.
//
// FIVE boon-flavored templates carry the tier 1-6 cards, each parameterised
// by { palette, glyph } and dressed per card by a unique flourish block:
//   DawnHalo    — a dawn sun-disc settles over the board and its rays wheel
//                 out (miracles, wards, oaths)
//   Reliquary   — a reliquary chest slides up, the lid swings, light and
//                 treasure climb out (spoils, exchanges, inheritances)
//   AstralAnvil — the alchemist's anvil rises, the hammer falls, the work
//                 is transmuted in the flash (makings and remakings)
//   PactScroll  — a great pact unrolls, the quill signs, the seal thumps
//                 down (bargains, vows, court rules)
//   FalconDash  — a falcon-comet streaks the crop behind speed lines
//                 (raids, escapes, duels)
// Every tier 7 and above card is a bespoke scene registered with S (its own
// Render, no template), and so are a few lower-tier flagships. Every tier 6
// and above card draws the rule itself in the "Rule scenes" block above the
// card devices: the ranks, squares and pieces it touches, placed in
// <BoardFrame> from the caster's side or on the cast square, with no wash,
// shock ring, edge glow or impact composite.

// STAGING. Every card declares an anchor, so the scene happens where the card
// was actually played. `Stage` is the shared <BoardWideStage>, which clamps
// itself over the board from --fx-anchor-dx/dy; anything that means THE BOARD
// (the wash, the edge gilt) renders inside <BoardFrame> so it stays exact at
// any anchor. Aim-anchored cards additionally lay a travelling leg down the
// real source -> target vector: <AimLeg> carries AimStage's own `fx-aim`
// rotation and is the ONLY thing that gets it, because an upright subject
// rotated onto the attack vector would lie on its side.
//
// Geometry reaches the art through boonPlays.css: bwp-rise arrives from the
// caster's own edge (--fx-side), bwp-target leans in from it, bwp-glint's
// settle drifts away from the board centre (--fx-ox/--fx-oy), bwp-rain slants
// with it, bwp-beam reaches by --fx-len, and bwp-leg/bwp-legtip are sized by
// --fx-len outright.

import "./boonPlays.css";

import type { ComponentType, CSSProperties, ReactNode } from "react";
import type { SigPlugin, SigRole } from "./sigPlugins";
import { LaserStrike, PieceShatter, Shockwave, QUAKE_CLASS, impactVars } from "./impact/impact";
import { BoardFrame, BoardWideStage } from "./stage";

/* =============================================================================
   Shared bits (module-local — deliberately NOT imported from other modules)
   ========================================================================== */

type Palette = [string, string, string];

interface TemplateProps {
  palette: Palette;
  glyph: ReactNode;
  lead: boolean;
  role: SigRole;
  delayMs: number;
  /** Per-card structural flourish key: every card on a shared template MUST
   * pass one, and every key below has its own dressing block. */
  flourish?: string;
  /** Set for `anchor: "aim"` cards: lay the travelling leg down the real
   * source -> target vector as well as playing the template's own beats. */
  aim?: boolean;
}

interface SceneProps {
  lead: boolean;
  role: SigRole;
  delayMs: number;
}

/** hex "#rrggbb" -> rgba() at the given alpha. */
function tint(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const SJ = { strokeLinejoin: "round", strokeLinecap: "round" } as const;

/** Oversized-clipped board-wide stage: the overlay mounts inside ONE square;
 * this canvas is ~14 squares wide, anchored on the cast square and clamping
 * itself over the board (see stage.tsx).
 *
 * FLAGSHIP UPGRADE: `quakeMs` (absolute, like every other delay here) makes
 * the whole scene stage JOLT on that card's own impact beat via the shared
 * imp-quake wrapper. The quake rides an INNER span because the BoardWideStage
 * canvas carries the anchor-clamp transform, which must not be animated over.
 * In-scene only: the real board crop never shakes. The bwp- prefix on the
 * wrapper keeps the animations-off kill switch covering the impact subtree. */
function Stage({ children, quakeMs }: { children: ReactNode; quakeMs?: number }) {
  if (quakeMs == null) return <BoardWideStage>{children}</BoardWideStage>;
  return (
    <BoardWideStage>
      <span className={`bwp-quakebox ${QUAKE_CLASS} absolute inset-0 block`} style={impactVars(undefined, quakeMs / 1000)}>
        {children}
      </span>
    </BoardWideStage>
  );
}

/** hex "#rrggbb" -> "r g b" for the impact vocabulary's --imp-rgb channel. */
function rgbOf(hex: string): string {
  return `${parseInt(hex.slice(1, 3), 16)} ${parseInt(hex.slice(3, 5), 16)} ${parseInt(hex.slice(5, 7), 16)}`;
}

/** FLAGSHIP IMPACT: the shared violence vocabulary (impact.css) staged at one
 * point of the 14-cell canvas. The laser column leads the beat by 0.4s, then
 * the shatter halves, shard spray and ground shockwave all land ON `atMs`,
 * the same beat the Stage quake rides, so a composite reads as ONE hit.
 * `left`/`top` are the CENTER of the struck cell, in % of the stage. */
function Impact({
  atMs, left, top, rgb, laser, glyph, size = 7.2,
}: { atMs: number; left: number; top: number; rgb: string; laser?: boolean; glyph?: ReactNode; size?: number }) {
  return (
    <span
      className="bwp-impact absolute block"
      style={{
        left: `${left - size / 2}%`,
        top: `${top - size / 2}%`,
        width: `${size}%`,
        height: `${size}%`,
        ...impactVars(rgbOf(rgb), atMs / 1000),
      }}
      aria-hidden="true"
    >
      {laser && <LaserStrike />}
      {glyph != null && <PieceShatter glyph={glyph} />}
      <Shockwave />
    </span>
  );
}

/** THE IMPACT CUE SHEET: one named moment of physical contact per template
 * card, keyed by the card's unique flourish. Every cue is choreographed onto
 * that flourish's own climax (position, beat and tint all differ per card), so
 * no two cards land the same hit. `man` marks a piece being REMOVED or DENIED:
 * it is lasered down and split in half; cues without one are triumphant
 * ground-slams (shockwave + stage quake only). */
interface ImpactCue {
  /** ms after delayMs: the shared impact beat (quake + shockwave + shatter). */
  at: number;
  /** center of the struck cell, % of the 14-cell stage */
  left: number;
  top: number;
  /** tint override (default: the card's glow colour p1) */
  rgb?: string;
  /** the descending column of light (hostile strips / denials / judgments) */
  laser?: boolean;
  /** silhouette split in half on the beat */
  man?: keyof typeof CHESSMAN;
  size?: number;
}
const CUE: Record<string, ImpactCue> = {
  /* FalconDash */
  // Ancient Custom: THE PASSING TAKE - the bypassed pawn is lasered where it stood and split in passing
  passant: { at: 980, left: 51.5, top: 59, man: "p", laser: true },
  // Hit and Run: THE FAR-POST SMASH - the raid's victim is beamed down at the turn-point before the snap-back
  raid: { at: 940, left: 57, top: 55.5, man: "p", laser: true },
  // Cornered King: THE WALL-BREAK - the L-shaped bolt-path is blasted open at the corner
  cornered: { at: 1060, left: 44, top: 42 },
  // Blood Duel: THE MEETING FLASH - the duel's loser is split in half where the charges collide
  duel: { at: 1000, left: 49, top: 53, man: "b", laser: true, rgb: "#ffb454" },
  // Forced March: THE DOUBLE-STEP THUMP - both pawns land their two-rank spring as one boom
  march2: { at: 900, left: 48, top: 46 },
  // Royal Caper: THE VAULT LANDING - the king's L-jump slams down clear of the check-ray
  caper: { at: 1010, left: 52, top: 46 },
  // Tunnelers: THE BREAKTHROUGH - the rook bursts out the far side of its own pawn screen
  tunnel: { at: 1060, left: 63, top: 54 },
  // Rally to the King: THE MUSTER SLAM - the rallying knight arrives at the king's side like a dropped portcullis
  rally: { at: 1000, left: 56, top: 55.5 },
  // Underdog's Gambit: THE DOUBLE JAB - the flanker on the hard side is jabbed clean apart
  sidejab: { at: 940, left: 57.5, top: 57, man: "p", laser: true },

  /* DawnHalo */
  // Divine Right: THE ROYAL EDICT - the law's red bar stamps a rattling peasant out of existence
  edict: { at: 1020, left: 38.5, top: 59, man: "p", laser: true, rgb: "#d6234f" },
  // Pioneer's Banner: THE POLE PLANT - the frontier standard is driven into the boards
  banner: { at: 880, left: 49.8, top: 51 },
  // Bishop's Blessing: THE WARD REBUKE - the lunging knight is beamed back and broken on the ward
  b3ward: { at: 1000, left: 43, top: 57, man: "n", laser: true },
  // Shield Wall: THE LOCK-BAR - the phalanx bar slams down across both shields
  phalanx3: { at: 960, left: 48.5, top: 56 },
  // King's Shield: THE HALF-SHIELD DROP - the guard plate lands in front of the crown
  kingfront: { at: 920, left: 50, top: 52 },
  // Praetorian: THE CLOSING RING - the guard circle booms shut around the queen
  praetor: { at: 980, left: 50, top: 54 },
  // Vantage Point: THE SUMMIT CLAIM - the high ground is stamped with one clap

  /* Reliquary */
  // Highwayman's Toll: THE STAND-AND-DELIVER - the beam robs the hourglass mid-keel
  toll: { at: 1000, left: 62, top: 47, laser: true },
  // Queen's Testament: THE LAST WILL - the queen herself is taken up in the column and split
  testament: { at: 900, left: 50, top: 39, man: "q", laser: true },
  // First Blood: THE FIRST DROP - the red drop hits the dial like a hammer
  firstblood: { at: 960, left: 48, top: 45, rgb: "#d6234f", laser: true },
  // Postern Gate: THE SIDE-DOOR KICK - the hidden door bangs open off its hinge
  postern: { at: 1000, left: 60, top: 52 },
  // Coronation Bonus: THE CROWN DROP - the crown lands with a clock-jumping boom
  coronclock: { at: 1000, left: 46.5, top: 38 },
  // Plunderer's Ledger: THE COIN SLAM - the take hits the ledger hard enough to flip the die
  ledger: { at: 1050, left: 60.5, top: 47.5 },
  // Eleventh Hour: THE LAST-TICK LIFT - the grave-light cracks the ground open on the final second
  eleventh: { at: 1080, left: 58, top: 54 },
  // Deep Position: THE DEEP PLANT - the flag stakes enemy ground with a shock
  deeptime: { at: 960, left: 43.6, top: 42 },
  // Martyr's Gift: THE GIVING FALL - the martyr splits apart into its own reroll motes
  martyrgift: { at: 920, left: 47, top: 47, man: "n" },

  /* AstralAnvil */
  // Scarecrow: THE POST DRIVE - the strawman's post is hammered into the field
  strawman: { at: 1100, left: 64, top: 48 },
  // Standard Bearer: THE UNFURL SNAP - the standard cracks open at full height
  standard: { at: 1120, left: 66, top: 40 },
  // Heir Apparent: THE INHERITANCE FLASH - the heir's remaking cracks the forge floor
  heir: { at: 1000, left: 63, top: 45 },
  // Field Knighting: THE ACCOLADE - the sword-tap lands like a hammer blow
  knighting: { at: 1040, left: 63, top: 47 },
  // Battlefield Commission: THE MEDAL PIN - the decoration is punched onto the pawn
  commission: { at: 1120, left: 62, top: 44 },
  // Ironwright's Bargain: THE FORGE FEED - the fed pawn is lasered into the coals and split
  ironwright: { at: 960, left: 35.8, top: 44, man: "p", laser: true },
  // Second Face: THE MASK FLIP - the bishop's face cracks off in one snap
  archbishop: { at: 1010, left: 47.5, top: 45.5 },

  /* PactScroll */
  // Ascetic's Bargain: THE REFUSAL SHOVE - the refused card is knocked off the pact with a boom
  fasting: { at: 960, left: 47, top: 34.5 },
  // Blood Price: THE OFFERING - the offered knight is taken in a red column and split
  bloodseal: { at: 840, left: 36, top: 33.5, man: "n", laser: true, rgb: "#d6234f" },
  // Jester's Rule: THE STRUCK TROPHY - the duplicate trophy is lasered off the list in red
  motley: { at: 1120, left: 54.3, top: 59.5, man: "r", laser: true, rgb: "#d6234f" },
  // Home Guard: THE FENCE SLAM - the pickets hammer down along the home rank
  // Double Down: THE CHIP PUSH - the raised stake hits the table felt
  doubledown: { at: 1060, left: 45, top: 57.5 },
  // King's Road: THE MILESTONE STRIKE - the road's final marker is driven home
  kingsroad: { at: 1000, left: 50.2, top: 47 },
  // Futures Market: THE CONTRACT BURN - the losing futures combust on one beat
  futures: { at: 1080, left: 50, top: 30.5 },
  // Castle in the Storm: THE CASTLING BOOM - king and rook slam into the castled rank together
  stormcastle: { at: 960, left: 50, top: 56.5 },
  // Last Muster: THE GRAVE CALL - the mustered rank stamps up out of the ground
  muster: { at: 1010, left: 52.5, top: 54 },
};

/** Full-board colour wash. Inside <BoardFrame>, so it is exactly the board at
 * any anchor rather than a fixed slice of a canvas that has moved. */
function Wash({ color, delayMs }: { color: string; delayMs: number }) {
  return (
    <BoardFrame>
      <span className="bwp-wash absolute inset-0 block" style={{ background: color, animationDelay: `${delayMs}ms` }} />
    </BoardFrame>
  );
}

/** The travelling part of an `anchor: "aim"` play: a lance of light laid from
 * the cast square down the real source -> target leg, its reach driven by
 * --fx-len and its tip riding out to the victim.
 *
 * Authored pointing RIGHT; `fx-aim` (the rotation AimStage applies internally)
 * turns it onto the vector. It is applied HERE rather than by wrapping the leg
 * in <AimStage>, because this already renders inside <Stage>: a second staging
 * box would multiply the 14-cell canvas by 14 again. Nothing upright may go
 * inside it - a subject rotated onto the attack vector lies on its side. */
function AimLeg({ color, delayMs }: { color: string; delayMs: number }) {
  return (
    <span className="fx-aim absolute inset-0 block" aria-hidden="true">
      <span
        className="bwp-leg absolute block"
        style={{
          left: "50%",
          top: "49.7%",
          width: "7.15%",
          height: "0.7%",
          background: `linear-gradient(90deg, ${color}, transparent)`,
          transformOrigin: "0% 50%",
          animationDelay: `${delayMs}ms`,
        }}
      />
      <span
        className="bwp-legtip absolute block rounded-full"
        style={{ left: "49.4%", top: "49%", width: "1.2%", height: "1.2%", background: color, animationDelay: `${delayMs + 90}ms` }}
      />
    </span>
  );
}

/** The shockwave ring; tier 7-8 scenes stack a second, later one. */
function Ring({ delayMs, color, size = 66 }: { delayMs: number; color: string; size?: number }) {
  return (
    <span
      className="bwp-ring absolute block rounded-full"
      style={{
        left: `${50 - size / 2}%`,
        top: `${50 - size / 2}%`,
        width: `${size}%`,
        height: `${size}%`,
        border: `3px solid ${color}`,
        animationDelay: `${delayMs}ms`,
      }}
    />
  );
}

/** A small diamond sparkle. */
function Glint({ delayMs, color, left, top, size = 3.2 }: { delayMs: number; color: string; left: number; top: number; size?: number }) {
  return (
    <span className="bwp-glint absolute block" style={{ left: `${left}%`, top: `${top}%`, width: `${size}%`, height: `${size}%`, animationDelay: `${delayMs}ms` }}>
      <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
        <path d="M5 0 L6.6 5 L5 10 L3.4 5 Z" fill={color} />
        <path d="M0 5 L5 3.4 L10 5 L5 6.6 Z" fill={color} />
      </svg>
    </span>
  );
}

/** A light beam that opens from its left edge (rotate via style). */
function Beam({
  delayMs, color, left, top, w, h = 1, rot = "0deg",
}: { delayMs: number; color: string; left: number; top: number; w: number; h?: number; rot?: string }) {
  return (
    <span
      className="bwp-beam absolute block"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${w}%`,
        height: `${h}%`,
        rotate: rot,
        background: `linear-gradient(90deg, ${color}, transparent)`,
        transformOrigin: "0% 50%",
        animationDelay: `${delayMs}ms`,
      }}
    />
  );
}

/** Board-edge glow — reserved for the tier 7-8 bespoke scenes' grandeur. It
 * means the BOARD's edge, so it lives inside <BoardFrame>. */
function EdgeGlow({ delayMs, color }: { delayMs: number; color: string }) {
  return (
    <BoardFrame>
      <span
        className="bwp-edge absolute inset-0 block"
        style={{ boxShadow: `inset 0 0 26px 9px ${color}`, animationDelay: `${delayMs}ms` }}
      />
    </BoardFrame>
  );
}

/** The anticipation beat: light gathers on the point the play is about to
 * claim, one short breath before the strike. Deliberately ONE node — the tier
 * 7-8 scenes that need it are already near the 16-node ceiling. */
function Tell({ color, delayMs, left = 38, top = 36, size = 24 }: { color: string; delayMs: number; left?: number; top?: number; size?: number }) {
  return (
    <span
      className="bwp-tell absolute block rounded-full"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${size}%`,
        height: `${size}%`,
        background: `radial-gradient(circle, ${color}, transparent 70%)`,
        animationDelay: `${delayMs}ms`,
      }}
    />
  );
}

/* Crude chessman silhouettes — tiny stage props, not portraits. */
const CHESSMAN: Record<string, ReactNode> = {
  p: (
    <>
      <circle cx="5" cy="3.4" r="1.7" />
      <path d="M3.2 10.8 L4.1 6 C4.3 5.4 5.7 5.4 5.9 6 L6.8 10.8 Z" />
    </>
  ),
  n: (
    <>
      <path d="M3 10.8 C3 6.6 4.3 4.6 6.4 4.2 L7.6 5.7 L6.6 6.6 C6.6 8.4 5.8 10.8 4.6 10.8 Z" />
    </>
  ),
  b: (
    <>
      <path d="M5 1.4 C6.6 2.9 6.8 4.5 5 6 C3.2 4.5 3.4 2.9 5 1.4 Z" />
      <path d="M3.4 10.8 L4.4 6.6 H5.6 L6.6 10.8 Z" />
    </>
  ),
  r: (
    <>
      <path d="M3 10.8 V5 H2.6 V2.4 H4 V3.4 H4.6 V2.4 H5.4 V3.4 H6 V2.4 H7.4 V5 H7 V10.8 Z" />
    </>
  ),
  q: (
    <>
      <path d="M2.6 4.2 L3.3 1.8 L4.4 3.4 L5 1.3 L5.6 3.4 L6.7 1.8 L7.4 4.2 Z" />
      <path d="M3.2 10.8 L4 4.8 H6 L6.8 10.8 Z" />
    </>
  ),
  k: (
    <>
      <path d="M4.4 1.5 H5.6 M5 0.9 V2.1" fill="none" strokeWidth="0.7" />
      <path d="M3 4.6 L3.6 2.8 H6.4 L7 4.6 Z" />
      <path d="M3.4 10.8 L4 5 H6 L6.6 10.8 Z" />
    </>
  ),
};

function Man({ kind, fill, stroke }: { kind: keyof typeof CHESSMAN; fill: string; stroke: string }) {
  return (
    <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
      <g fill={fill} stroke={stroke} strokeWidth="0.45" {...SJ}>
        {CHESSMAN[kind]}
      </g>
    </svg>
  );
}

/** Compact per-square hit for non-lead ("target") renders. */
function TargetHit({ palette, glyph, delayMs }: { palette: Palette; glyph: ReactNode; delayMs: number }) {
  const [p0, p1] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      <Ring delayMs={delayMs} color={tint(p1, 0.85)} size={88} />
      <span className="bwp-target absolute block" style={{ left: "22%", top: "22%", width: "56%", height: "56%", animationDelay: `${delayMs + 80}ms` }}>{glyph}</span>
      <Glint delayMs={delayMs + 200} color={tint(p0, 0.9)} left={12} top={14} size={22} />
    </span>
  );
}

/** The ENTRANCE cut: the card arriving in a hand, at ~56% of the crop. Same
 * palette and the play's own central object, three short beats (the light
 * gathers, the object arrives, two glints settle off it), and no board
 * takeover — nothing here leaves the one square it is mounted on. `mark` is
 * the scene's own central object; without one the card's device stands in. */
function EntranceCut({ palette, glyph, delayMs, mark }: { palette: Palette; glyph: ReactNode; delayMs: number; mark?: ReactNode }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      {/* tell: the light gathers behind the card */}
      <span
        className="bwp-facein absolute block rounded-full"
        style={{ left: "18%", top: "18%", width: "64%", height: "64%", background: `radial-gradient(circle, ${tint(p0, 0.55)}, transparent 70%)`, animationDelay: `${delayMs}ms` }}
      />
      {/* strike: the central object rises into the crop */}
      <span className="bwp-rise absolute block" style={{ left: "22%", top: "22%", width: "56%", height: "56%", animationDelay: `${delayMs + 150}ms` }}>
        {mark ?? glyph}
      </span>
      {/* settle: two sparks drift off it */}
      <Glint delayMs={delayMs + 430} color={tint(p1, 0.95)} left={64} top={22} size={12} />
      <Glint delayMs={delayMs + 530} color={tint(p2, 0.9)} left={24} top={66} size={9} />
    </span>
  );
}

/** Each shared template's central object, drawn small enough to carry an
 * entrance on its own. Kept beside EntranceCut so the card arriving in a hand
 * and the card being played show the SAME thing. */
const MARK: Record<string, (p: Palette) => ReactNode> = {
  halo: ([p0, p1, p2]) => (
    <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
      <circle cx="10" cy="10" r="6.4" fill={tint(p0, 0.3)} stroke={tint(p1, 0.95)} strokeWidth="0.9" />
      <circle cx="10" cy="10" r="4.4" fill="none" stroke={tint(p2, 0.7)} strokeWidth="0.4" strokeDasharray="1.4 1" />
      <path d="M10 0.6 V3 M10 17 V19.4 M0.6 10 H3 M17 10 H19.4" stroke={tint(p1, 0.9)} strokeWidth="0.8" {...SJ} />
    </svg>
  ),
  chest: ([p0, p1, p2]) => (
    <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
      <path d="M3.4 9.6 C3.4 6 6.4 4 10 4 C13.6 4 16.6 6 16.6 9.6 Z" fill={tint(p1, 0.7)} stroke={p2} strokeWidth="0.7" {...SJ} />
      <rect x="3.4" y="10.2" width="13.2" height="6" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="0.7" />
      <rect x="9.1" y="10.8" width="1.8" height="2.8" fill={tint(p1, 0.95)} />
    </svg>
  ),
  anvil: ([p0, p1, p2]) => (
    <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
      <path d="M2.6 7.6 H14.4 C16.6 7.6 17.6 8.6 17.8 10.2 L14.6 10.2 C13.6 12 12 12.6 10.4 12.6 H8 V15.4 H12 V17 H5.4 V15.4 H6.6 V12.6 H4.4 C3 12.6 2.6 11.4 2.6 10 Z" fill={tint(p0, 0.92)} stroke={p2} strokeWidth="0.7" {...SJ} />
      <path d="M4.6 5 L9 3" stroke={tint(p1, 0.95)} strokeWidth="1.2" {...SJ} />
    </svg>
  ),
  scroll: ([p0, p1, p2]) => (
    <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
      <rect x="3" y="5.4" width="14" height="9.2" fill="#f4ead2" stroke={p2} strokeWidth="0.6" />
      <path d="M5.4 8 H14 M5.4 10 H12.6 M5.4 12 H11" stroke={tint(p0, 0.85)} strokeWidth="0.55" strokeLinecap="round" />
      <circle cx="14.6" cy="12.6" r="1.9" fill={tint(p1, 0.95)} stroke={p2} strokeWidth="0.5" />
    </svg>
  ),
  falcon: ([p0, p1, p2]) => (
    <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
      <path d="M1.6 12.6 C6.4 13.6 9.8 11.4 11.8 6.6 C13.2 10.4 16.4 12 18.6 11 C15.8 15.6 10.4 18 6 16.8 C3.6 16.2 2 14.8 1.6 12.6 Z" fill={tint(p1, 0.9)} stroke={p2} strokeWidth="0.5" {...SJ} />
      <path d="M2.4 5 H12 M5 7.4 H14.6" stroke={tint(p0, 0.85)} strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  ),
};

/* =============================================================================
   Template 1: DawnHalo — a dawn sun-disc settles over the board centre, eight
   rays wheel out, and the card's device burns in the disc (miracles / wards).
   ========================================================================== */
const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];
function DawnHalo({ palette, glyph, lead, role, delayMs, flourish, aim }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} mark={MARK.halo(palette)} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const cue = flourish ? CUE[flourish] : undefined;
  return (
    <Stage quakeMs={cue ? delayMs + cue.at : undefined}>
      <Wash color={tint(p0, 0.22)} delayMs={delayMs} />
      {aim && <AimLeg color={tint(p1, 0.9)} delayMs={delayMs + 300} />}
      {/* THE HIT: this card's own named impact beat (see CUE) - laser/shatter
          where something is stripped, ground-shock + stage quake where the
          boon slams home */}
      {cue && (
        <Impact
          atMs={delayMs + cue.at}
          left={cue.left}
          top={cue.top}
          rgb={cue.rgb ?? p1}
          laser={cue.laser}
          glyph={cue.man ? <Man kind={cue.man} fill={tint(p1, 0.92)} stroke={p2} /> : undefined}
          size={cue.size}
        />
      )}
      {/* the disc, settling out of the sky */}
      <span className="bwp-drop absolute block" style={{ left: "36%", top: "24%", width: "28%", height: "28%", animationDelay: `${delayMs + 140}ms` }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <circle cx="10" cy="10" r="8.6" fill={tint(p1, 0.28)} stroke={tint(p1, 0.95)} strokeWidth="0.8" />
          <circle cx="10" cy="10" r="6.2" fill="none" stroke={tint(p2, 0.6)} strokeWidth="0.45" strokeDasharray="1.6 1.1" />
        </svg>
        <span className="bwp-facein absolute block" style={{ left: "30%", top: "30%", width: "40%", height: "40%", animationDelay: `${delayMs + 480}ms` }}>{glyph}</span>
      </span>
      {/* the rays wheel out of the disc */}
      {RAYS.map((r, i) => (
        <Beam key={r} delayMs={delayMs + 380 + i * 40} color={tint(p1, 0.75)} left={50} top={37.5} w={17} rot={`${r}deg`} />
      ))}
      <Ring delayMs={delayMs + 620} color={tint(p1, 0.8)} />
      {/* bespoke: Divine Right — the king stands under the disc while two
          peasant pawns rattle at him and the law's red bar stamps them out */}
      {flourish === "edict" && (
        <>
          <span className="bwp-hold absolute block" style={{ left: "46.5%", top: "52%", width: "7%", height: "10.5%", animationDelay: `${delayMs + 560}ms` }}>
            <Man kind="k" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          {[36, 58].map((l, i) => (
            <span key={l} className="absolute block" style={{ left: `${l}%`, top: "56%", width: "5%", height: "7.5%" }}>
              <span className="bwp-shiver absolute inset-0 block" style={{ animationDelay: `${delayMs + 640 + i * 130}ms` }}>
                <Man kind="p" fill={tint(p2, 0.9)} stroke={p0} />
              </span>
              <Beam delayMs={delayMs + 820 + i * 130} color="rgba(214,35,79,0.9)" left={-18} top={44} w={135} h={11} rot="-24deg" />
            </span>
          ))}
        </>
      )}
      {/* bespoke: Pioneer's Banner — the pole plants at the frontier line, the
          pennant snaps open, and a pawn strides across into the far half */}
      {flourish === "banner" && (
        <>
          <span className="bwp-rise absolute block" style={{ left: "49.4%", top: "42%", width: "1.2%", height: "16%", background: tint(p2, 0.95), animationDelay: `${delayMs + 560}ms` }} />
          <Beam delayMs={delayMs + 700} color={tint(p1, 0.95)} left={50.6} top={43} w={9} h={4} />
          <span className="bwp-cross absolute block" style={{ left: "38%", top: "50%", width: "5.5%", height: "8%", "--dx": "170%", animationDelay: `${delayMs + 760}ms` } as CSSProperties}>
            <Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
        </>
      )}
      {/* wave3 Bishop's Blessing — a knight lunges at the warded bishop and is bounced away */}
      {flourish === "b3ward" && (
        <>
          <span className="bwp-hold absolute block" style={{ left: "46.5%", top: "54%", width: "6.5%", height: "10%", animationDelay: `${delayMs + 560}ms` }}>
            <Man kind="b" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="bwp-snapdash absolute block" style={{ left: "30%", top: "55%", width: "5.5%", height: "8%", "--dx": "230%", animationDelay: `${delayMs + 700}ms` } as CSSProperties}>
            <Man kind="n" fill={tint(p2, 0.9)} stroke={p0} />
          </span>
          <Glint delayMs={delayMs + 1040} color={tint(p1, 0.95)} left={44} top={52} />
        </>
      )}
      {/* wave3 Shield Wall — two flanking pawns lock edge to edge under one bar */}
      {flourish === "phalanx3" && (
        <>
          {[42, 51].map((l, i) => (
            <span key={l} className="bwp-rise absolute block" style={{ left: `${l}%`, top: "54%", width: "5%", height: "8%", animationDelay: `${delayMs + 600 + i * 90}ms` }}>
              <Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />
            </span>
          ))}
          <span className="bwp-beam absolute block" style={{ left: "41%", top: "52.5%", width: "15%", height: "1.4%", background: tint(p1, 0.9), transformOrigin: "0% 50%", animationDelay: `${delayMs + 820}ms` }} />
        </>
      )}
      {/* wave3 King's Shield — a half-shield slides in front of the crown */}
      {flourish === "kingfront" && (
        <>
          <span className="bwp-hold absolute block" style={{ left: "47%", top: "56%", width: "6.5%", height: "10%", animationDelay: `${delayMs + 560}ms` }}>
            <Man kind="k" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="bwp-drop absolute block" style={{ left: "45%", top: "48%", width: "10%", height: "8%", animationDelay: `${delayMs + 760}ms` }}>
            <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
              <path d="M1 1 H11 V4 C11 6.4 8.4 7.6 6 7.6 C3.6 7.6 1 6.4 1 4 Z" fill={tint(p1, 0.5)} stroke={tint(p1, 0.95)} strokeWidth="0.6" {...SJ} />
            </svg>
          </span>
        </>
      )}
      {/* wave3 Praetorian — a ring of guards closes around the queen */}
      {flourish === "praetor" && (
        <>
          <span className="bwp-facein absolute block" style={{ left: "46.5%", top: "50%", width: "7%", height: "11%", animationDelay: `${delayMs + 560}ms` }}>
            <Man kind="q" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          {[38, 58].map((l, i) => (
            <span key={l} className="bwp-cross absolute block" style={{ left: `${l}%`, top: "52%", width: "5%", height: "8%", "--dx": i ? "-100%" : "100%", animationDelay: `${delayMs + 720 + i * 90}ms` } as CSSProperties}>
              <Man kind="n" fill={tint(p1, 0.9)} stroke={p2} />
            </span>
          ))}
        </>
      )}
    </Stage>
  );
}

/* =============================================================================
   Template 2: Reliquary — a reliquary chest slides up mid-board, its lid
   swings back, and a column of light carries the card's device out of it.
   ========================================================================== */
function Reliquary({ palette, glyph, lead, role, delayMs, flourish, aim }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} mark={MARK.chest(palette)} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const cue = flourish ? CUE[flourish] : undefined;
  return (
    <Stage quakeMs={cue ? delayMs + cue.at : undefined}>
      <Wash color={tint(p0, 0.22)} delayMs={delayMs} />
      {aim && <AimLeg color={tint(p1, 0.9)} delayMs={delayMs + 300} />}
      {/* THE HIT: this card's own named impact beat (see CUE) */}
      {cue && (
        <Impact
          atMs={delayMs + cue.at}
          left={cue.left}
          top={cue.top}
          rgb={cue.rgb ?? p1}
          laser={cue.laser}
          glyph={cue.man ? <Man kind={cue.man} fill={tint(p1, 0.92)} stroke={p2} /> : undefined}
          size={cue.size}
        />
      )}
      {/* the chest rises */}
      <span className="bwp-rise absolute block" style={{ left: "40%", top: "50%", width: "20%", height: "13%", animationDelay: `${delayMs + 140}ms` }}>
        <svg viewBox="0 0 20 13" className="block h-full w-full" aria-hidden="true">
          <rect x="1" y="4.4" width="18" height="8" rx="1.2" fill={tint(p0, 0.92)} stroke={p2} strokeWidth="0.6" />
          <path d="M1 5.4 H19 M10 5.4 V8.2" stroke={p2} strokeWidth="0.5" strokeLinecap="round" />
          <circle cx="10" cy="8.6" r="0.9" fill={tint(p1, 0.95)} />
        </svg>
        {/* the lid, swinging open */}
        <span className="bwp-lid absolute block" style={{ left: "2%", top: "12%", width: "96%", height: "26%", transformOrigin: "0% 100%", animationDelay: `${delayMs + 460}ms` }}>
          <svg viewBox="0 0 19 4" className="block h-full w-full" aria-hidden="true">
            <path d="M0.6 3.6 C0.6 0.8 18.4 0.8 18.4 3.6 Z" fill={tint(p0, 0.95)} stroke={p2} strokeWidth="0.5" />
          </svg>
        </span>
      </span>
      {/* the light column and the risen device */}
      <span className="bwp-gate absolute block" style={{ left: "45%", top: "30%", width: "10%", height: "22%", transformOrigin: "50% 100%", background: `linear-gradient(180deg, transparent, ${tint(p1, 0.5)})`, animationDelay: `${delayMs + 620}ms` }} />
      <span className="bwp-facein absolute block" style={{ left: "44.5%", top: "27%", width: "11%", height: "11%", animationDelay: `${delayMs + 720}ms` }}>{glyph}</span>
      <Ring delayMs={delayMs + 780} color={tint(p1, 0.8)} />
      {/* bespoke: Highwayman's Toll — coins rain into the open chest while
          the little hourglass keels over, robbed */}
      {flourish === "toll" && (
        <>
          {[44, 49, 54].map((l, i) => (
            <span key={l} className="bwp-rain absolute block rounded-full" style={{ left: `${l}%`, top: "40%", width: "2.6%", height: "2.6%", background: tint(p1, 0.95), border: `1px solid ${p2}`, animationDelay: `${delayMs + 640 + i * 110}ms` }} />
          ))}
          <span className="bwp-tip absolute block" style={{ left: "60%", top: "44%", width: "4.5%", height: "7%", transformOrigin: "50% 90%", animationDelay: `${delayMs + 780}ms` }}>
            <svg viewBox="0 0 6 9" className="block h-full w-full" aria-hidden="true">
              <path d="M1 0.8 H5 L3.4 4.5 L5 8.2 H1 L2.6 4.5 Z" fill="none" stroke={tint(p2, 0.95)} strokeWidth="0.55" {...SJ} />
              <path d="M2 1.6 H4 L3 3.8 Z" fill={tint(p1, 0.9)} />
            </svg>
          </span>
        </>
      )}
      {/* bespoke: Queen's Testament — the queen ascends and fades above the
          chest while her two wards rise below, paid out in full */}
      {flourish === "testament" && (
        <>
          <span className="bwp-ascend absolute block" style={{ left: "46.5%", top: "34%", width: "7%", height: "10.5%", animationDelay: `${delayMs + 620}ms` }}>
            <Man kind="q" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="bwp-rise absolute block" style={{ left: "36%", top: "52%", width: "5.5%", height: "8.5%", animationDelay: `${delayMs + 880}ms` }}>
            <Man kind="n" fill={tint(p1, 0.92)} stroke={p2} />
          </span>
          <span className="bwp-rise absolute block" style={{ left: "58%", top: "52%", width: "5.5%", height: "8.5%", animationDelay: `${delayMs + 980}ms` }}>
            <Man kind="b" fill={tint(p1, 0.92)} stroke={p2} />
          </span>
        </>
      )}
      {/* wave3 First Blood — one red drop falls onto the ticking dial and speeds it */}
      {flourish === "firstblood" && (
        <>
          <span className="bwp-facein absolute block" style={{ left: "43%", top: "40%", width: "10%", height: "10%", animationDelay: `${delayMs + 640}ms` }}>
            <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
              <circle cx="6" cy="6" r="5" fill={tint(p0, 0.7)} stroke={tint(p1, 0.9)} strokeWidth="0.6" />
              <path d="M6 6 V2.8 M6 6 L8.2 7" stroke={tint(p1, 0.95)} strokeWidth="0.7" strokeLinecap="round" />
            </svg>
          </span>
          <span className="bwp-rain absolute block" style={{ left: "48%", top: "28%", width: "3%", height: "4%", animationDelay: `${delayMs + 760}ms` }}>
            <svg viewBox="0 0 8 10" className="block h-full w-full" aria-hidden="true">
              <path d="M4 0.8 C6 3.6 7 5.4 7 6.8 A3 3 0 1 1 1 6.8 C1 5.4 2 3.6 4 0.8 Z" fill="#d6234f" />
            </svg>
          </span>
          <Glint delayMs={delayMs + 1080} color={tint(p1, 0.95)} left={53} top={40} size={2.6} />
        </>
      )}
      {/* wave3 Postern Gate — a small side door swings open in the keep wall */}
      {flourish === "postern" && (
        <>
          <span className="bwp-facein absolute block" style={{ left: "55%", top: "44%", width: "10%", height: "16%", animationDelay: `${delayMs + 640}ms` }}>
            <svg viewBox="0 0 10 16" className="block h-full w-full" aria-hidden="true">
              <path d="M1 15 V3 H9 V15" fill="none" stroke={tint(p1, 0.8)} strokeWidth="0.6" {...SJ} />
            </svg>
          </span>
          <span className="bwp-lid absolute block" style={{ left: "56%", top: "48%", width: "4%", height: "11%", transformOrigin: "0% 50%", animationDelay: `${delayMs + 820}ms` }}>
            <svg viewBox="0 0 4 11" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
              <rect x="0.4" y="0.4" width="3.2" height="10.2" rx="0.5" fill={tint(p0, 0.9)} stroke={tint(p1, 0.9)} strokeWidth="0.4" />
            </svg>
          </span>
          <Glint delayMs={delayMs + 1080} color={tint(p1, 0.9)} left={58} top={52} size={2.4} />
        </>
      )}
      {/* wave3 Coronation Bonus — a crown lands and the clock dial jumps forward */}
      {flourish === "coronclock" && (
        <>
          <span className="bwp-rain absolute block" style={{ left: "42%", top: "34%", width: "9%", height: "7%", animationDelay: `${delayMs + 700}ms` }}>
            <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
              <path d="M1.4 6.6 V2 L3.8 4 L6 1 L8.2 4 L10.6 2 V6.6 Z" fill={tint(p1, 0.95)} stroke="#8a6a3a" strokeWidth="0.5" {...SJ} />
            </svg>
          </span>
          <span className="bwp-facein absolute block" style={{ left: "55%", top: "44%", width: "8%", height: "8%", animationDelay: `${delayMs + 880}ms` }}>
            <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
              <circle cx="6" cy="6" r="5" fill={tint(p0, 0.6)} stroke={tint(p1, 0.9)} strokeWidth="0.6" />
              <path d="M6 6 V2.6 M6 6 L8.4 6" stroke={tint(p1, 0.95)} strokeWidth="0.7" strokeLinecap="round" />
            </svg>
          </span>
          <Glint delayMs={delayMs + 1120} color={tint(p1, 0.95)} left={58} top={42} size={2.6} />
        </>
      )}
      {/* wave3 Plunderer's Ledger — coins drop into a ledger that flips a reroll die */}
      {flourish === "ledger" && (
        <>
          {[42, 47, 52].map((l, i) => (
            <span key={l} className="bwp-rain absolute block rounded-full" style={{ left: `${l}%`, top: "38%", width: "2.6%", height: "2.6%", background: tint(p1, 0.95), border: `1px solid ${p2}`, animationDelay: `${delayMs + 660 + i * 110}ms` }} />
          ))}
          <span className="bwp-facein absolute block" style={{ left: "57%", top: "44%", width: "7%", height: "7%", animationDelay: `${delayMs + 900}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <rect x="0.8" y="0.8" width="8.4" height="8.4" rx="1.2" fill="#e8dcc0" stroke={p2} strokeWidth="0.5" />
              <circle cx="3.4" cy="3.4" r="0.7" fill={p2} />
              <circle cx="6.6" cy="6.6" r="0.7" fill={p2} />
            </svg>
          </span>
        </>
      )}
      {/* wave3 Eleventh Hour — a grave-lantern lifts a fallen piece at the last tick */}
      {flourish === "eleventh" && (
        <>
          <span className="bwp-hold absolute block" style={{ left: "37%", top: "40%", width: "7%", height: "12%", animationDelay: `${delayMs + 620}ms` }}>
            <svg viewBox="0 0 10 14" className="block h-full w-full" aria-hidden="true">
              <path d="M3 2 H7 L6.4 4 H3.6 Z M2.6 4 H7.4 V12 H2.6 Z" fill={tint(p0, 0.85)} stroke={tint(p1, 0.9)} strokeWidth="0.5" {...SJ} />
              <circle cx="5" cy="8" r="2.2" fill={tint(p1, 0.85)} />
            </svg>
          </span>
          <span className="bwp-rise absolute block" style={{ left: "55%", top: "50%", width: "6%", height: "9%", animationDelay: `${delayMs + 900}ms` }}>
            <Man kind="q" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <Glint delayMs={delayMs + 1160} color={tint(p1, 0.95)} left={57} top={48} />
        </>
      )}
      {/* wave3 Deep Position — a flag plants deep in enemy ground, the dial jumps */}
      {flourish === "deeptime" && (
        <>
          <span className="bwp-gate absolute block" style={{ left: "43%", top: "34%", width: "1.2%", height: "16%", transformOrigin: "50% 100%", background: tint(p2, 0.95), animationDelay: `${delayMs + 640}ms` }} />
          <Beam delayMs={delayMs + 800} color={tint(p1, 0.95)} left={44.2} top={35} w={9} h={4} />
          <span className="bwp-facein absolute block" style={{ left: "57%", top: "42%", width: "8%", height: "8%", animationDelay: `${delayMs + 940}ms` }}>
            <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
              <circle cx="6" cy="6" r="5" fill={tint(p0, 0.6)} stroke={tint(p1, 0.9)} strokeWidth="0.6" />
              <path d="M6 6 V2.6 M6 6 L8.2 7.2" stroke={tint(p1, 0.95)} strokeWidth="0.7" strokeLinecap="round" />
            </svg>
          </span>
        </>
      )}
      {/* wave3 Martyr's Gift — a falling piece scatters reroll motes upward */}
      {flourish === "martyrgift" && (
        <>
          <span className="bwp-sink absolute block" style={{ left: "44%", top: "42%", width: "6.5%", height: "10%", animationDelay: `${delayMs + 620}ms` }}>
            <Man kind="n" fill={tint(p1, 0.9)} stroke={p2} />
          </span>
          {[0, 1, 2].map((i) => (
            <span key={i} className="bwp-arc absolute block rounded-full" style={{ left: `${44 + i * 4}%`, top: "48%", width: "1.8%", height: "1.8%", background: tint(p1, 0.95), "--dx": `${(i - 1) * 90}%`, "--dy": "-140%", animationDelay: `${delayMs + 860 + i * 90}ms` } as CSSProperties} />
          ))}
        </>
      )}
    </Stage>
  );
}

/* =============================================================================
   Template 3: AstralAnvil — the alchemist's anvil rises mid-board, the hammer
   falls once, and the work is remade inside the strike flash.
   ========================================================================== */
function AstralAnvil({ palette, glyph, lead, role, delayMs, flourish, aim }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} mark={MARK.anvil(palette)} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const cue = flourish ? CUE[flourish] : undefined;
  return (
    <Stage quakeMs={cue ? delayMs + cue.at : undefined}>
      <Wash color={tint(p0, 0.22)} delayMs={delayMs} />
      {aim && <AimLeg color={tint(p1, 0.9)} delayMs={delayMs + 300} />}
      {/* THE HIT: this card's own named impact beat (see CUE), landing over
          the hammer-strike so forge and impact read as one act */}
      {cue && (
        <Impact
          atMs={delayMs + cue.at}
          left={cue.left}
          top={cue.top}
          rgb={cue.rgb ?? p1}
          laser={cue.laser}
          glyph={cue.man ? <Man kind={cue.man} fill={tint(p1, 0.92)} stroke={p2} /> : undefined}
          size={cue.size}
        />
      )}
      {/* the anvil rises */}
      <span className="bwp-rise absolute block" style={{ left: "39%", top: "48%", width: "22%", height: "13%", animationDelay: `${delayMs + 140}ms` }}>
        <svg viewBox="0 0 22 13" className="block h-full w-full" aria-hidden="true">
          <path d="M2 3 H20 C19 6 15 7.4 12.6 7.4 L13.4 10.6 H8.6 L9.4 7.4 C6 7.4 3 6 2 3 Z" fill={tint(p0, 0.95)} stroke={p2} strokeWidth="0.6" {...SJ} />
          <path d="M6.4 11 H15.6 V12.4 H6.4 Z" fill={tint(p2, 0.9)} />
        </svg>
      </span>
      {/* the hammer falls */}
      <span className="bwp-hammer absolute block" style={{ left: "46%", top: "28%", width: "9%", height: "13%", transformOrigin: "20% 90%", animationDelay: `${delayMs + 480}ms` }}>
        <svg viewBox="0 0 9 13" className="block h-full w-full" aria-hidden="true">
          <path d="M4.1 4 H4.9 V12.4 H4.1 Z" fill="#8a6a3a" stroke="#4a3a22" strokeWidth="0.35" />
          <rect x="1.2" y="0.8" width="6.6" height="3.4" rx="0.8" fill={tint(p2, 0.95)} stroke={p0} strokeWidth="0.45" />
        </svg>
      </span>
      {/* the strike flash carries the card's device */}
      <span className="bwp-stamp absolute block" style={{ left: "43.5%", top: "37%", width: "13%", height: "13%", animationDelay: `${delayMs + 760}ms` }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <circle cx="5" cy="5" r="4.4" fill={tint(p1, 0.4)} stroke={tint(p1, 0.95)} strokeWidth="0.5" />
        </svg>
        <span className="absolute block" style={{ left: "22%", top: "22%", width: "56%", height: "56%" }}>{glyph}</span>
      </span>
      <Glint delayMs={delayMs + 820} color={tint(p1, 0.95)} left={41} top={40} />
      <Glint delayMs={delayMs + 900} color={tint(p1, 0.8)} left={57} top={42} size={2.6} />
      <Ring delayMs={delayMs + 840} color={tint(p1, 0.8)} />
      {/* bespoke: Scarecrow — the strawman is hoisted out of the forge smoke
          and roots crook out of the boards at its post */}
      {flourish === "strawman" && (
        <>
          <span className="bwp-rise absolute block" style={{ left: "60%", top: "40%", width: "8%", height: "16%", animationDelay: `${delayMs + 860}ms` }}>
            <svg viewBox="0 0 8 16" className="block h-full w-full" aria-hidden="true">
              <path d="M4 3.4 V14.8 M1 5.6 H7" stroke="#8a6a3a" strokeWidth="0.9" strokeLinecap="round" />
              <path d="M2.4 3.2 L4 1 L5.6 3.2 Z" fill="#c9a84c" stroke="#4a3a22" strokeWidth="0.4" {...SJ} />
              <circle cx="4" cy="4" r="1" fill="#e8dcc0" stroke="#4a3a22" strokeWidth="0.35" />
            </svg>
          </span>
          <Beam delayMs={delayMs + 1060} color="rgba(63,143,63,0.85)" left={61} top={55.5} w={5} h={1.4} rot="150deg" />
          <Beam delayMs={delayMs + 1140} color="rgba(63,143,63,0.85)" left={66} top={55.5} w={5} h={1.4} rot="30deg" />
        </>
      )}
      {/* bespoke: Standard Bearer — the pawn hoists a pole twice its height
          and the army's standard unfurls above the anvil */}
      {flourish === "standard" && (
        <>
          <span className="bwp-hold absolute block" style={{ left: "59%", top: "45%", width: "5%", height: "8%", animationDelay: `${delayMs + 840}ms` }}>
            <Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="bwp-gate absolute block" style={{ left: "63.4%", top: "30%", width: "0.9%", height: "16%", transformOrigin: "50% 100%", background: tint(p2, 0.95), animationDelay: `${delayMs + 940}ms` }} />
          <Beam delayMs={delayMs + 1080} color={tint(p1, 0.95)} left={64.3} top={31} w={9} h={4.4} />
        </>
      )}
      {/* wave3 Heir Apparent — a pawn crossfades up into the fallen minor's crest */}
      {flourish === "heir" && (
        <span className="absolute block" style={{ left: "60%", top: "40%", width: "6.5%", height: "10%" }}>
          <span className="bwp-swapout absolute inset-0 block" style={{ animationDelay: `${delayMs + 820}ms` }}>
            <Man kind="p" fill={tint(p2, 0.85)} stroke={p0} />
          </span>
          <span className="bwp-swapin absolute inset-0 block" style={{ animationDelay: `${delayMs + 820}ms` }}>
            <Man kind="n" fill={tint(p1, 0.98)} stroke={p2} />
          </span>
        </span>
      )}
      {/* wave3 Field Knighting — a sword taps a kneeling pawn that rises a knight */}
      {flourish === "knighting" && (
        <>
          <span className="bwp-hammer absolute block" style={{ left: "58%", top: "30%", width: "3%", height: "14%", transformOrigin: "50% 90%", animationDelay: `${delayMs + 820}ms` }}>
            <svg viewBox="0 0 3 14" className="block h-full w-full" aria-hidden="true">
              <path d="M1.5 13 V3 M0.4 3 H2.6 M1.5 3 V0.8" stroke={tint(p2, 0.95)} strokeWidth="0.6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="absolute block" style={{ left: "60%", top: "42%", width: "6.5%", height: "10%" }}>
            <span className="bwp-swapout absolute inset-0 block" style={{ animationDelay: `${delayMs + 940}ms` }}>
              <Man kind="p" fill={tint(p2, 0.85)} stroke={p0} />
            </span>
            <span className="bwp-swapin absolute inset-0 block" style={{ animationDelay: `${delayMs + 940}ms` }}>
              <Man kind="n" fill={tint(p1, 0.98)} stroke={p2} />
            </span>
          </span>
        </>
      )}
      {/* wave3 Battlefield Commission — a field medal pins onto an advancing pawn */}
      {flourish === "commission" && (
        <>
          <span className="bwp-arc absolute block" style={{ left: "58%", top: "52%", width: "6%", height: "9.5%", "--dx": "0%", "--dy": "-70%", animationDelay: `${delayMs + 840}ms` } as CSSProperties}>
            <Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="bwp-stamp absolute block" style={{ left: "60%", top: "42%", width: "4%", height: "4%", animationDelay: `${delayMs + 1020}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <circle cx="5" cy="5" r="3.4" fill={tint(p1, 0.9)} stroke={p2} strokeWidth="0.5" />
              <path d="M5 2 L5.9 4.2 L8 4.4 L6.4 5.9 L6.9 8 L5 6.8 L3.1 8 L3.6 5.9 L2 4.4 L4.1 4.2 Z" fill={p2} />
            </svg>
          </span>
        </>
      )}
      {/* wave3 Ironwright's Bargain — a pawn is thrown into the forge, a minor hammered up to a rook */}
      {flourish === "ironwright" && (
        <>
          <span className="bwp-sink absolute block" style={{ left: "33%", top: "40%", width: "5.5%", height: "8.5%", animationDelay: `${delayMs + 820}ms` }}>
            <Man kind="p" fill={tint(p2, 0.85)} stroke={p0} />
          </span>
          <span className="absolute block" style={{ left: "59%", top: "40%", width: "6.5%", height: "10%" }}>
            <span className="bwp-swapout absolute inset-0 block" style={{ animationDelay: `${delayMs + 960}ms` }}>
              <Man kind="b" fill={tint(p1, 0.92)} stroke={p2} />
            </span>
            <span className="bwp-swapin absolute inset-0 block" style={{ animationDelay: `${delayMs + 960}ms` }}>
              <Man kind="r" fill={tint(p1, 0.98)} stroke={p2} />
            </span>
          </span>
        </>
      )}
      {/* wave3 Second Face — a bishop mask flips to reveal a knight crest beneath */}
      {flourish === "archbishop" && (
        <>
          <span className="absolute block" style={{ left: "44%", top: "40%", width: "7%", height: "11%" }}>
            <span className="bwp-swapout absolute inset-0 block" style={{ animationDelay: `${delayMs + 840}ms` }}>
              <Man kind="b" fill={tint(p1, 0.95)} stroke={p2} />
            </span>
            <span className="bwp-swapin absolute inset-0 block" style={{ animationDelay: `${delayMs + 840}ms` }}>
              <Man kind="n" fill={tint(p1, 0.98)} stroke={p2} />
            </span>
          </span>
          <span className="bwp-cross absolute block" style={{ left: "40%", top: "42%", width: "5%", height: "6%", "--dx": "80%", animationDelay: `${delayMs + 1000}ms` } as CSSProperties}>
            <svg viewBox="0 0 8 6" className="block h-full w-full" aria-hidden="true">
              <path d="M0.8 1 C3 0 5 0 7.2 1 C7.2 3.6 5.6 5.4 4 5.4 C2.4 5.4 0.8 3.6 0.8 1 Z" fill={tint(p2, 0.9)} stroke={p1} strokeWidth="0.4" {...SJ} />
            </svg>
          </span>
        </>
      )}
    </Stage>
  );
}

/* =============================================================================
   Template 4: PactScroll — a great pact unrolls across the board, the quill
   flashes its signature, and the wax seal thumps down beside the device.
   ========================================================================== */
function PactScroll({ palette, glyph, lead, role, delayMs, flourish, aim }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} mark={MARK.scroll(palette)} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const cue = flourish ? CUE[flourish] : undefined;
  return (
    <Stage quakeMs={cue ? delayMs + cue.at : undefined}>
      <Wash color={tint(p0, 0.22)} delayMs={delayMs} />
      {aim && <AimLeg color={tint(p1, 0.9)} delayMs={delayMs + 300} />}
      {/* THE HIT: this card's own named impact beat (see CUE) - the pact is
          not merely signed, it is ENFORCED */}
      {cue && (
        <Impact
          atMs={delayMs + cue.at}
          left={cue.left}
          top={cue.top}
          rgb={cue.rgb ?? p1}
          laser={cue.laser}
          glyph={cue.man ? <Man kind={cue.man} fill={tint(p1, 0.92)} stroke={p2} /> : undefined}
          size={cue.size}
        />
      )}
      {/* the scroll unrolls left to right */}
      <span className="bwp-unroll absolute block" style={{ left: "28%", top: "42%", width: "44%", height: "14%", transformOrigin: "0% 50%", animationDelay: `${delayMs + 160}ms` }}>
        <svg viewBox="0 0 44 14" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <rect x="1.4" y="1.2" width="41.2" height="11.6" rx="1.6" fill="#f4ead2" stroke="#8a6a3a" strokeWidth="0.6" />
          <path d="M5 4.6 H27 M5 7 H23 M5 9.4 H18" stroke={tint(p0, 0.75)} strokeWidth="0.7" strokeLinecap="round" />
        </svg>
      </span>
      {/* the device inked on the pact, then the signature flash and the seal */}
      <span className="bwp-facein absolute block" style={{ left: "58%", top: "43.5%", width: "9%", height: "9%", animationDelay: `${delayMs + 620}ms` }}>{glyph}</span>
      <Beam delayMs={delayMs + 720} color={tint(p1, 0.9)} left={33} top={53} w={18} h={0.8} rot="-4deg" />
      <span className="bwp-stamp absolute block" style={{ left: "36%", top: "47%", width: "6%", height: "6%", animationDelay: `${delayMs + 860}ms` }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <circle cx="5" cy="5" r="4" fill={tint(p1, 0.95)} stroke={p2} strokeWidth="0.6" />
          <circle cx="5" cy="5" r="2.1" fill="none" stroke={p2} strokeWidth="0.45" />
        </svg>
      </span>
      <Ring delayMs={delayMs + 900} color={tint(p1, 0.8)} />
      {/* bespoke: Ascetic's Bargain — one dealt card is pushed away off the
          pact, and the richer fan of three rises where it went */}
      {flourish === "fasting" && (
        <>
          <span className="bwp-cross absolute block" style={{ left: "44%", top: "30%", width: "6%", height: "9%", "--dx": "-260%", animationDelay: `${delayMs + 700}ms` } as CSSProperties}>
            <svg viewBox="0 0 6 9" className="block h-full w-full" aria-hidden="true">
              <rect x="0.6" y="0.6" width="4.8" height="7.8" rx="0.8" fill={tint(p0, 0.95)} stroke={p2} strokeWidth="0.4" />
              <path d="M1.6 1.8 L4.4 7.2 M4.4 1.8 L1.6 7.2" stroke={tint(p2, 0.9)} strokeWidth="0.45" strokeLinecap="round" />
            </svg>
          </span>
          {[0, 1, 2].map((i) => (
            <span key={i} className="bwp-rise absolute block" style={{ left: `${48 + i * 4.6}%`, top: "27%", width: "5.5%", height: "8.5%", rotate: `${(i - 1) * 14}deg`, animationDelay: `${delayMs + 940 + i * 90}ms` }}>
              <svg viewBox="0 0 6 9" className="block h-full w-full" aria-hidden="true">
                <rect x="0.6" y="0.6" width="4.8" height="7.8" rx="0.8" fill={tint(p1, 0.95)} stroke={p2} strokeWidth="0.4" />
                <circle cx="3" cy="4.5" r="1.1" fill="none" stroke={p2} strokeWidth="0.4" />
              </svg>
            </span>
          ))}
        </>
      )}
      {/* bespoke: Blood Price — the offered piece dissolves upward into red
          motes that stream down into the hungry seal */}
      {flourish === "bloodseal" && (
        <>
          <span className="bwp-sink absolute block" style={{ left: "33%", top: "29%", width: "6%", height: "9%", animationDelay: `${delayMs + 640}ms` }}>
            <Man kind="n" fill={tint(p1, 0.9)} stroke={p2} />
          </span>
          {[0, 1, 2].map((i) => (
            <span key={i} className="bwp-rain absolute block rounded-full" style={{ left: `${36 + i * 1.6}%`, top: `${38 + i * 2.2}%`, width: "1.6%", height: "1.6%", background: "#d6234f", animationDelay: `${delayMs + 820 + i * 100}ms` }} />
          ))}
          <Glint delayMs={delayMs + 1140} color="#d6234f" left={37.5} top={47.5} />
        </>
      )}
      {/* bespoke: Jester's Rule — the belled cap shakes over the pact while
          the second, identical trophy is struck from the list */}
      {flourish === "motley" && (
        <>
          <span className="bwp-shiver absolute block" style={{ left: "45%", top: "28%", width: "9%", height: "8%", animationDelay: `${delayMs + 680}ms` }}>
            <svg viewBox="0 0 10 8" className="block h-full w-full" aria-hidden="true">
              <path d="M1 6.8 C1.4 3.6 2.6 1.6 3.4 3.8 C4 1 6 1 6.6 3.8 C7.4 1.6 8.6 3.6 9 6.8 Z" fill={tint(p1, 0.95)} stroke={p2} strokeWidth="0.45" {...SJ} />
              <circle cx="1.4" cy="6.4" r="0.6" fill="#ffd76a" />
              <circle cx="5" cy="1.6" r="0.6" fill="#ffd76a" />
              <circle cx="8.6" cy="6.4" r="0.6" fill="#ffd76a" />
            </svg>
          </span>
          {[42, 52].map((l, i) => (
            <span key={l} className="bwp-hold absolute block" style={{ left: `${l}%`, top: "56%", width: "4.6%", height: "7%", animationDelay: `${delayMs + 880 + i * 110}ms` }}>
              <Man kind="r" fill={tint(p2, 0.9)} stroke={p0} />
            </span>
          ))}
          <Beam delayMs={delayMs + 1120} color="rgba(214,35,79,0.9)" left={51} top={59.5} w={7} h={1} rot="-22deg" />
        </>
      )}
      {/* wave3 Double Down — three cards fan out and a stack of chips slides in */}
      {flourish === "doubledown" && (
        <>
          {[0, 1, 2].map((i) => (
            <span key={i} className="bwp-rise absolute block" style={{ left: `${44 + i * 4.6}%`, top: "28%", width: "5.5%", height: "8.5%", rotate: `${(i - 1) * 15}deg`, animationDelay: `${delayMs + 700 + i * 90}ms` }}>
              <svg viewBox="0 0 6 9" className="block h-full w-full" aria-hidden="true">
                <rect x="0.6" y="0.6" width="4.8" height="7.8" rx="0.8" fill={tint(p1, 0.95)} stroke={p2} strokeWidth="0.4" />
                <circle cx="3" cy="4.5" r="1.1" fill="none" stroke={p2} strokeWidth="0.4" />
              </svg>
            </span>
          ))}
          {[40, 44].map((l, i) => (
            <span key={l} className="bwp-cross absolute block rounded-full" style={{ left: `${l}%`, top: "56%", width: "3%", height: "3%", background: tint(p1, 0.95), border: `1px solid ${p2}`, "--dx": "120%", animationDelay: `${delayMs + 900 + i * 100}ms` } as CSSProperties} />
          ))}
        </>
      )}
      {/* wave3 King's Road — a milestone line paints down one file */}
      {flourish === "kingsroad" && (
        <>
          <span className="bwp-gate absolute block" style={{ left: "49.4%", top: "30%", width: "1.6%", height: "34%", transformOrigin: "50% 100%", background: `linear-gradient(180deg, ${tint(p1, 0.9)}, ${tint(p2, 0.5)})`, animationDelay: `${delayMs + 700}ms` }} />
          {[34, 44, 54].map((t, i) => (
            <span key={t} className="bwp-facein absolute block rounded-full" style={{ left: "48.4%", top: `${t}%`, width: "3.4%", height: "2.4%", background: tint(p1, 0.95), animationDelay: `${delayMs + 860 + i * 100}ms` }} />
          ))}
        </>
      )}
      {/* wave3 Futures Market — three cards deal, one glows apex-gold, two burn away */}
      {flourish === "futures" && (
        <>
          <span className="bwp-rise absolute block" style={{ left: "47%", top: "26%", width: "6%", height: "9%", animationDelay: `${delayMs + 820}ms` }}>
            <svg viewBox="0 0 6 9" className="block h-full w-full" aria-hidden="true">
              <rect x="0.5" y="0.5" width="5" height="8" rx="0.8" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.5" />
              <path d="M3 2 L3.7 3.8 L5.6 3.8 L4.1 5 L4.6 6.9 L3 5.8 L1.4 6.9 L1.9 5 L0.4 3.8 L2.3 3.8 Z" fill="#8a6a3a" />
            </svg>
          </span>
          {[36, 58].map((l, i) => (
            <span key={l} className="bwp-cross absolute block" style={{ left: `${l}%`, top: "30%", width: "5%", height: "7.5%", rotate: `${i ? 14 : -14}deg`, "--dx": i ? "160%" : "-160%", animationDelay: `${delayMs + 940 + i * 90}ms` } as CSSProperties}>
              <svg viewBox="0 0 6 9" className="block h-full w-full" aria-hidden="true">
                <rect x="0.6" y="0.6" width="4.8" height="7.8" rx="0.8" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="0.4" />
              </svg>
            </span>
          ))}
          <Glint delayMs={delayMs + 1160} color="#ffd76a" left={49} top={26} />
        </>
      )}
      {/* wave3 Castle in the Storm — king and rook slam into castled rank amid arrows */}
      {flourish === "stormcastle" && (
        <>
          <span className="bwp-cross absolute block" style={{ left: "40%", top: "52%", width: "6%", height: "9.5%", "--dx": "70%", animationDelay: `${delayMs + 780}ms` } as CSSProperties}>
            <Man kind="k" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="bwp-cross absolute block" style={{ left: "56%", top: "52%", width: "5.5%", height: "9%", "--dx": "-80%", animationDelay: `${delayMs + 780}ms` } as CSSProperties}>
            <Man kind="r" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          {[30, 66].map((l, i) => (
            <Beam key={l} delayMs={delayMs + 920 + i * 80} color={tint(p2, 0.85)} left={l} top={40 + i * 4} w={14} h={0.9} rot={i ? "150deg" : "26deg"} />
          ))}
        </>
      )}
      {/* wave3 Last Muster — three faint pawns rise from the ground (they will fade) */}
      {flourish === "muster" && (
        <>
          {[40, 50, 60].map((l, i) => (
            <span key={l} className="bwp-rise absolute block" style={{ left: `${l}%`, top: "50%", width: "5%", height: "8%", opacity: 0.72, animationDelay: `${delayMs + 720 + i * 130}ms` }}>
              <Man kind="p" fill={tint(p1, 0.85)} stroke={p2} />
            </span>
          ))}
          <Glint delayMs={delayMs + 1160} color={tint(p1, 0.9)} left={50} top={46} size={2.4} />
        </>
      )}
    </Stage>
  );
}

/* =============================================================================
   Template 5: FalconDash — speed lines rake the crop and a falcon-comet
   streaks through, the card's device flaring at the strike point.
   ========================================================================== */
function FalconDash({ palette, glyph, lead, role, delayMs, flourish, aim }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} mark={MARK.falcon(palette)} />;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const cue = flourish ? CUE[flourish] : undefined;
  return (
    <Stage quakeMs={cue ? delayMs + cue.at : undefined}>
      <Wash color={tint(p0, 0.2)} delayMs={delayMs} />
      {aim && <AimLeg color={tint(p1, 0.9)} delayMs={delayMs + 300} />}
      {/* THE HIT: this card's own named impact beat (see CUE) at the point
          the dash actually connects */}
      {cue && (
        <Impact
          atMs={delayMs + cue.at}
          left={cue.left}
          top={cue.top}
          rgb={cue.rgb ?? p1}
          laser={cue.laser}
          glyph={cue.man ? <Man kind={cue.man} fill={tint(p1, 0.92)} stroke={p2} /> : undefined}
          size={cue.size}
        />
      )}
      {/* speed lines */}
      {[34, 44, 56].map((t, i) => (
        <Beam key={t} delayMs={delayMs + 120 + i * 70} color={tint(p1, 0.55)} left={26} top={t} w={30 - i * 4} h={0.8} />
      ))}
      {/* the comet crosses the crop */}
      <span className="bwp-cross absolute block" style={{ left: "28%", top: "45%", width: "7%", height: "6%", "--dx": "480%", animationDelay: `${delayMs + 320}ms` } as CSSProperties}>
        <svg viewBox="0 0 10 6" className="block h-full w-full" aria-hidden="true">
          <path d="M0.6 3 C3 1.4 6 1 9.4 3 C6 5 3 4.6 0.6 3 Z" fill={tint(p1, 0.9)} stroke={p2} strokeWidth="0.4" {...SJ} />
          <circle cx="7.6" cy="3" r="0.7" fill={p2} />
        </svg>
      </span>
      <span className="bwp-facein absolute block" style={{ left: "44%", top: "34%", width: "12%", height: "12%", animationDelay: `${delayMs + 640}ms` }}>{glyph}</span>
      <Ring delayMs={delayMs + 720} color={tint(p1, 0.8)} />
      {/* bespoke: Hit and Run — the raider darts out, the strike flashes at
          the far end, and he snaps back to the exact square he left */}
      {flourish === "raid" && (
        <>
          <span className="bwp-snapdash absolute block" style={{ left: "34%", top: "52%", width: "6%", height: "9%", "--dx": "300%", animationDelay: `${delayMs + 620}ms` } as CSSProperties}>
            <Man kind="n" fill={tint(p1, 0.98)} stroke={p2} />
          </span>
          <Glint delayMs={delayMs + 900} color={tint(p1, 0.95)} left={57} top={53} />
          <Glint delayMs={delayMs + 1320} color={tint(p2, 0.9)} left={35} top={52} size={2.6} />
        </>
      )}
      {/* bespoke: Ancient Custom — the pawn slips diagonally PAST its
          neighbour, and the ghost of the bypassed pawn fades where it stood */}
      {flourish === "passant" && (
        <>
          <span className="bwp-arc absolute block" style={{ left: "42%", top: "56%", width: "5.5%", height: "8.5%", "--dx": "130%", "--dy": "-110%", animationDelay: `${delayMs + 640}ms` } as CSSProperties}>
            <Man kind="p" fill={tint(p1, 0.98)} stroke={p2} />
          </span>
          <span className="bwp-sink absolute block" style={{ left: "49%", top: "56%", width: "5.5%", height: "8.5%", animationDelay: `${delayMs + 860}ms` }}>
            <Man kind="p" fill={tint(p2, 0.75)} stroke={p0} />
          </span>
        </>
      )}
      {/* bespoke: Cornered King — the king backed to the board's corner posts
          lights an L-shaped knight path out of the trap */}
      {flourish === "cornered" && (
        <>
          <span className="bwp-hold absolute block" style={{ left: "33%", top: "56%", width: "6.5%", height: "10%", animationDelay: `${delayMs + 620}ms` }}>
            <Man kind="k" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="bwp-gate absolute block" style={{ left: "36%", top: "42%", width: "1.1%", height: "13%", transformOrigin: "50% 100%", background: tint(p1, 0.9), animationDelay: `${delayMs + 800}ms` }} />
          <Beam delayMs={delayMs + 960} color={tint(p1, 0.9)} left={36.5} top={42.5} w={8} h={1.1} />
          <Glint delayMs={delayMs + 1120} color={tint(p1, 0.95)} left={44} top={40} />
        </>
      )}
      {/* bespoke: Blood Duel — the two matched duelists charge from opposite
          wings and meet in one shattering flash */}
      {flourish === "duel" && (
        <>
          <span className="bwp-cross absolute block" style={{ left: "32%", top: "52%", width: "6%", height: "9%", "--dx": "220%", animationDelay: `${delayMs + 620}ms` } as CSSProperties}>
            <Man kind="b" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="bwp-cross absolute block" style={{ left: "62%", top: "52%", width: "6%", height: "9%", "--dx": "-220%", animationDelay: `${delayMs + 620}ms` } as CSSProperties}>
            <Man kind="b" fill={tint(p2, 0.9)} stroke={p0} />
          </span>
          <span className="bwp-stamp absolute block" style={{ left: "46%", top: "50%", width: "8%", height: "8%", animationDelay: `${delayMs + 980}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.8 L6.2 3.8 L9.2 5 L6.2 6.2 L5 9.2 L3.8 6.2 L0.8 5 L3.8 3.8 Z" fill={tint(p1, 0.9)} />
            </svg>
          </span>
          <Glint delayMs={delayMs + 1100} color={tint(p1, 0.9)} left={43} top={47} size={2.8} />
          <Glint delayMs={delayMs + 1160} color={tint(p2, 0.9)} left={55} top={49} size={2.8} />
        </>
      )}
      {/* wave3 Forced March — two pawns spring two ranks forward at once */}
      {flourish === "march2" && (
        <>
          {[40, 56].map((l, i) => (
            <span key={l} className="bwp-arc absolute block" style={{ left: `${l}%`, top: "60%", width: "5%", height: "8%", "--dx": "0%", "--dy": "-150%", animationDelay: `${delayMs + 620 + i * 130}ms` } as CSSProperties}>
              <Man kind="p" fill={tint(p1, 0.98)} stroke={p2} />
            </span>
          ))}
          <Glint delayMs={delayMs + 1020} color={tint(p1, 0.92)} left={42} top={42} size={2.4} />
          <Glint delayMs={delayMs + 1100} color={tint(p1, 0.85)} left={58} top={42} size={2.4} />
        </>
      )}
      {/* wave3 Royal Caper — a check-ray rakes in, the king vaults away in an L */}
      {flourish === "caper" && (
        <>
          <Beam delayMs={delayMs + 560} color="rgba(214,35,79,0.85)" left={24} top={45} w={22} h={1.2} rot="16deg" />
          <span className="bwp-arc absolute block" style={{ left: "40%", top: "58%", width: "6.5%", height: "10%", "--dx": "120%", "--dy": "-120%", animationDelay: `${delayMs + 660}ms` } as CSSProperties}>
            <Man kind="k" fill={tint(p1, 0.98)} stroke={p2} />
          </span>
          <Glint delayMs={delayMs + 1080} color={tint(p1, 0.95)} left={54} top={44} />
        </>
      )}
      {/* wave3 Tunnelers — the rook drills clean through a screen of its own pawns */}
      {flourish === "tunnel" && (
        <>
          {[46, 52, 58].map((l, i) => (
            <span key={l} className="bwp-hold absolute block" style={{ left: `${l}%`, top: "52%", width: "4.5%", height: "7%", animationDelay: `${delayMs + 560 + i * 60}ms` }}>
              <Man kind="p" fill={tint(p2, 0.55)} stroke={p0} />
            </span>
          ))}
          <span className="bwp-cross absolute block" style={{ left: "30%", top: "51%", width: "6%", height: "9%", "--dx": "400%", animationDelay: `${delayMs + 660}ms` } as CSSProperties}>
            <Man kind="r" fill={tint(p1, 0.98)} stroke={p2} />
          </span>
          <Glint delayMs={delayMs + 1120} color={tint(p1, 0.9)} left={64} top={50} size={2.6} />
        </>
      )}
      {/* wave3 Rally to the King — a piece snaps clear across to the king's side */}
      {flourish === "rally" && (
        <>
          <span className="bwp-hold absolute block" style={{ left: "58%", top: "52%", width: "6.5%", height: "10%", animationDelay: `${delayMs + 560}ms` }}>
            <Man kind="k" fill={tint(p1, 0.95)} stroke={p2} />
          </span>
          <span className="bwp-cross absolute block" style={{ left: "28%", top: "53%", width: "5.5%", height: "8.5%", "--dx": "380%", animationDelay: `${delayMs + 640}ms` } as CSSProperties}>
            <Man kind="n" fill={tint(p1, 0.98)} stroke={p2} />
          </span>
          <Glint delayMs={delayMs + 1120} color={tint(p1, 0.95)} left={55} top={50} />
        </>
      )}
      {/* wave3 Underdog's Gambit — the scrappy pawn jabs to both sides at once */}
      {flourish === "sidejab" && (
        <>
          <span className="bwp-hold absolute block" style={{ left: "46%", top: "54%", width: "5.5%", height: "8.5%", animationDelay: `${delayMs + 560}ms` }}>
            <Man kind="p" fill={tint(p1, 0.98)} stroke={p2} />
          </span>
          <Beam delayMs={delayMs + 700} color={tint(p1, 0.9)} left={51} top={57} w={8} h={1.4} />
          <Beam delayMs={delayMs + 780} color={tint(p1, 0.8)} left={41} top={57} w={8} h={1.4} rot="180deg" />
          <Glint delayMs={delayMs + 960} color={tint(p1, 0.95)} left={58} top={55} size={2.6} />
        </>
      )}
    </Stage>
  );
}

/* =============================================================================
   Tier 7-8 bespoke scenes — one Render per card, larger presentation: wash,
   double shock ring, board-edge glow, no shared template machinery.
   ========================================================================== */



/* =============================================================================
   WAVE 3 tier 7-8 bespoke scenes.
   ========================================================================== */

/** Mummers' Dance — the whole minor corps whirls behind carnival masks and
 * every knight trades faces with a bishop. */
function MummersDanceScene({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") return <EntranceCut palette={["#6b4a8f", "#c9b0e8", "#1c0f28"]} glyph={GLYPH.bw3_mummers_dance} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={["#6b4a8f", "#c9b0e8", "#1c0f28"]} glyph={GLYPH.bw3_mummers_dance} delayMs={delayMs} />;
  const corps: { k: keyof typeof CHESSMAN; swap: keyof typeof CHESSMAN; l: number; t: number }[] = [
    { k: "n", swap: "b", l: 33, t: 34 },
    { k: "b", swap: "n", l: 60, t: 34 },
    { k: "n", swap: "b", l: 33, t: 56 },
    { k: "b", swap: "n", l: 60, t: 56 },
  ];
  return (
    <Stage quakeMs={delayMs + 1040}>
      <Wash color="rgba(28,15,40,0.34)" delayMs={delayMs} />
      {/* THE FINAL POSE: the whole whirling corps stamps its landing in
          unison and the dance floor jolts */}
      <Impact atMs={delayMs + 1040} left={46.5} top={48} rgb="#c9b0e8" size={9} />
      <span className="bwp-whirl absolute block" style={{ left: "30%", top: "28%", width: "40%", height: "44%", animationDelay: `${delayMs + 320}ms` }}>
        <svg viewBox="0 0 40 44" className="block h-full w-full" aria-hidden="true">
          <ellipse cx="20" cy="22" rx="18" ry="20" fill="none" stroke="rgba(201,176,232,0.7)" strokeWidth="0.9" strokeDasharray="3 2.2" />
        </svg>
      </span>
      {corps.map((r, i) => (
        <span key={i} className="absolute block" style={{ left: `${r.l}%`, top: `${r.t}%`, width: "6.5%", height: "10%" }}>
          <span className="bwp-swapout absolute inset-0 block" style={{ animationDelay: `${delayMs + 560 + i * 120}ms` }}>
            <Man kind={r.k} fill="#e3d0ff" stroke="#2a1030" />
          </span>
          <span className="bwp-swapin absolute inset-0 block" style={{ animationDelay: `${delayMs + 560 + i * 120}ms` }}>
            <Man kind={r.swap} fill="#c9b0e8" stroke="#5b2b8f" />
          </span>
        </span>
      ))}
      <span className="bwp-facein absolute block" style={{ left: "44%", top: "42%", width: "12%", height: "12%", animationDelay: `${delayMs + 620}ms` }}>{GLYPH.bw3_mummers_dance}</span>
      <Ring delayMs={delayMs + 1040} color="rgba(201,176,232,0.85)" />
      <Ring delayMs={delayMs + 1240} color="rgba(143,74,143,0.5)" size={84} />
      <EdgeGlow delayMs={delayMs + 1100} color="rgba(201,176,232,0.38)" />
    </Stage>
  );
}

/** Last Stand — a shield wall snaps up along the whole front and a dome of
 * king-safety settles over the army. */
function LastStandScene({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") return <EntranceCut palette={["#5a6b8f", "#ffe9b0", "#1c2438"]} glyph={GLYPH.bw3_last_stand} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={["#5a6b8f", "#ffe9b0", "#1c2438"]} glyph={GLYPH.bw3_last_stand} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 640}>
      <Wash color="rgba(28,36,56,0.34)" delayMs={delayMs} />
      {/* THE SHIELD-WALL SLAM: four shields hit the line as one and the
          rampart quake rolls back through the army */}
      <Impact atMs={delayMs + 640} left={50} top={54} rgb="#ffe9b0" size={9} />
      {/* tell: the muster-light gathers along the line before the shields go up */}
      <Tell color="rgba(255,233,176,0.45)" delayMs={delayMs + 220} left={38} top={44} size={26} />
      {[30, 40, 50, 60].map((l, i) => (
        <span key={l} className="bwp-rise absolute block" style={{ left: `${l}%`, top: "50%", width: "8%", height: "13%", animationDelay: `${delayMs + 200 + i * 100}ms` }}>
          <svg viewBox="0 0 8 13" className="block h-full w-full" aria-hidden="true">
            <path d="M1 1 H7 V7 C7 10 4 12 4 12 C4 12 1 10 1 7 Z" fill="rgba(90,107,143,0.6)" stroke="#ffe9b0" strokeWidth="0.5" {...SJ} />
            <path d="M4 1.6 V11" stroke="#ffe9b0" strokeWidth="0.35" strokeLinecap="round" />
          </svg>
        </span>
      ))}
      <span className="bwp-drop absolute block" style={{ left: "26%", top: "34%", width: "48%", height: "24%", animationDelay: `${delayMs + 620}ms` }}>
        <svg viewBox="0 0 48 24" className="block h-full w-full" aria-hidden="true">
          <path d="M1 23 C1 3 47 3 47 23" fill="rgba(90,107,143,0.14)" stroke="rgba(255,233,176,0.9)" strokeWidth="0.6" strokeDasharray="2.4 1.6" />
        </svg>
      </span>
      <span className="bwp-facein absolute block" style={{ left: "45.5%", top: "40%", width: "9%", height: "13%", animationDelay: `${delayMs + 760}ms` }}>
        <Man kind="k" fill="#ffe9b0" stroke="#1c2438" />
      </span>
      {[34, 46, 58].map((l, i) => (
        <Glint key={l} delayMs={delayMs + 980 + i * 90} color="#ffe9b0" left={l} top={38} size={2.4} />
      ))}
      <Ring delayMs={delayMs + 1000} color="rgba(255,233,176,0.85)" />
      <Ring delayMs={delayMs + 1220} color="rgba(90,107,143,0.5)" size={84} />
      <EdgeGlow delayMs={delayMs + 1080} color="rgba(255,233,176,0.36)" />
    </Stage>
  );
}


/** Martyrdom — one friendly minor shatters and its light strikes two enemy
 * minors down in answer. */
function MartyrdomScene({ lead, role, delayMs }: SceneProps) {
  if (role === "entrance") return <EntranceCut palette={["#8a4a5a", "#ffd0d8", "#2b1820"]} glyph={GLYPH.bw3_martyrdom} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={["#8a4a5a", "#ffd0d8", "#2b1820"]} glyph={GLYPH.bw3_martyrdom} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 920}>
      <Wash color="rgba(43,24,32,0.34)" delayMs={delayMs} />
      {/* THE ANSWERED SACRIFICE: the martyr's release column detonates where
          it fell, splitting an enemy minor in the answering blast */}
      <Impact
        atMs={delayMs + 920}
        left={33.5}
        top={47}
        rgb="#ffd0d8"
        laser
        glyph={<Man kind="n" fill="rgba(201,138,152,0.95)" stroke="#2b1820" />}
      />
      {/* the leg: laid down the real source -> target vector, sized by --fx-len */}
      <AimLeg color="rgba(255,208,216,0.85)" delayMs={delayMs + 300} />
      <span className="bwp-shatter absolute block" style={{ left: "45%", top: "44%", width: "8%", height: "12%", animationDelay: `${delayMs + 360}ms` }}>
        <Man kind="n" fill="#ffd0d8" stroke="#2b1820" />
      </span>
      {[
        { l: 30, dx: "-120%" },
        { l: 62, dx: "120%" },
      ].map((v, i) => (
        <span key={i}>
          <Beam delayMs={delayMs + 640 + i * 90} color="rgba(255,208,216,0.85)" left={48} top={49} w={22} h={1} rot={i ? "8deg" : "172deg"} />
          <span className="bwp-shatter absolute block" style={{ left: `${v.l}%`, top: "42%", width: "6.5%", height: "10%", animationDelay: `${delayMs + 900 + i * 120}ms` }}>
            <Man kind={i ? "b" : "n"} fill="#c98a98" stroke="#2b1820" />
          </span>
        </span>
      ))}
      <Ring delayMs={delayMs + 980} color="rgba(255,208,216,0.85)" />
      <Ring delayMs={delayMs + 1200} color="rgba(138,74,90,0.5)" size={84} />
      <EdgeGlow delayMs={delayMs + 1060} color="rgba(255,208,216,0.34)" />
    </Stage>
  );
}






/* =============================================================================
   Rule scenes (slice TC-boon-curse): the play draws the squares and pieces the
   rule touches instead of a template. Board positions live in <BoardFrame>,
   ranks counted from the CASTER's side through --fx-side, and every beat's
   offset is scaled by --fx-dur like the tracks themselves.
   ========================================================================== */

/** Absolute start plus a --fx-dur scaled offset. */
function dm(delayMs: number, off: number): string {
  return `calc(${delayMs}ms + ${off}ms * var(--fx-dur, 1))`;
}

/** Top edge of the caster's rank `r` (1 = their home rank) in BoardFrame %. */
function rankTop(r: number): string {
  return `calc(43.75% + var(--fx-side, 1) * ${43.75 - (r - 1) * 12.5}%)`;
}

/** Top edge of the band over the caster's ranks `lo`..`hi` in BoardFrame %. */
function bandTop(lo: number, hi: number): string {
  const c = (8 - hi + (lo - 1)) * 6.25;
  const d = (8 - hi - (lo - 1)) * 6.25;
  return `calc(${c}% + var(--fx-side, 1) * ${d}%)`;
}

/** One chessman standing on file `f` (0-7) of the caster's rank `r`. */
function manBox(f: number, r: number): CSSProperties {
  return { left: `${f * 12.5 + 1.8}%`, top: `calc(${rankTop(r)} + 0.9%)`, width: "8.9%", height: "10.7%" };
}

/** A whole square: file `f` of the caster's rank `r`. */
function cellBox(f: number, r: number): CSSProperties {
  return { left: `${f * 12.5}%`, top: rankTop(r), width: "12.5%", height: "12.5%" };
}

/** The line between the caster's ranks `r` and `r + 1`, as a top edge for a
 * box `h`% tall that stands on it and points away from the caster (flip the
 * art with FLIP so it points the right way for either player). */
function onRankLine(r: number, h: number): string {
  return `calc(50% + var(--fx-side, 1) * ${50 - r * 12.5}% - ${h / 2}% - var(--fx-side, 1) * ${h / 2}%)`;
}

/** Static mirror for art authored pointing AWAY from the caster (up the
 * screen for the player at the bottom). Not animated. */
const FLIP: CSSProperties = { scale: "1 var(--fx-side, 1)" };

const HEATER = "M5 0.8 L9 2.2 V5.4 C9 8 7.2 9.5 5 10.3 C2.8 9.5 1 8 1 5.4 V2.2 Z";

/** Vantage Point: the opponent's back two ranks are surveyed as the heights,
 * a rook and a knight climb onto them and are warded, an enemy blade glances
 * off, a king up there stays struck out (your king aside), and a bishop that
 * steps back down off the heights loses its ward. */
const VANTAGE: Palette = ["#5a7a8f", "#cde8ff", "#1c2a34"];
function VantagePointScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = VANTAGE;
  if (role === "entrance") return <EntranceCut palette={VANTAGE} glyph={GLYPH.bw3_vantage_point} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={VANTAGE} glyph={GLYPH.bw3_vantage_point} delayMs={delayMs} />;
  return (
    <Stage>
      <BoardFrame>
        {/* tell: the heights, their back two ranks, are staked out */}
        <span
          className="bwp-hold absolute block"
          style={{ left: 0, width: "100%", top: bandTop(7, 8), height: "25%", background: tint(p0, 0.5), border: `3px dashed ${p1}`, animationDelay: dm(delayMs, 0), animationDuration: "calc(1700ms * var(--fx-dur, 1))" }}
        />
        {/* the ridge line along the foot of the heights */}
        <span className="absolute block" style={{ left: 0, width: "100%", top: onRankLine(6, 5), height: "5%", ...FLIP }}>
          <span className="bwp-gate absolute inset-0 block" style={{ transformOrigin: "50% 100%", animationDelay: dm(delayMs, 120), animationDuration: "calc(1500ms * var(--fx-dur, 1))" }}>
            <svg viewBox="0 0 80 5" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
              <path d="M0 5 L6 2 L11 3.4 L18 0.6 L25 3 L31 1.4 L38 3.4 L45 0.7 L52 3 L58 1.2 L65 3.4 L72 0.9 L80 5 Z" fill={tint(p1, 0.7)} stroke={p2} strokeWidth="0.35" {...SJ} />
            </svg>
          </span>
        </span>
        {/* the flag planted on the ridge: this ground is claimed */}
        <span className="absolute block" style={{ left: "44%", top: onRankLine(6, 11), width: "5%", height: "11%", ...FLIP }}>
          <span className="bwp-gate absolute inset-0 block" style={{ transformOrigin: "50% 100%", animationDelay: dm(delayMs, 300), animationDuration: "calc(1400ms * var(--fx-dur, 1))" }}>
            <svg viewBox="0 0 5 11" className="block h-full w-full" aria-hidden="true">
              <path d="M1 10.6 V0.8" stroke={p1} strokeWidth="0.5" strokeLinecap="round" />
              <path d="M1 1 H4.4 L3.4 2.3 L4.4 3.6 H1 Z" fill={p0} stroke={p1} strokeWidth="0.35" {...SJ} />
            </svg>
          </span>
        </span>
        {/* strike: a rook and a knight climb onto the heights */}
        {(["r", "n"] as const).map((k, i) => (
          <span key={k} className="bwp-rise absolute block" style={{ ...manBox(i ? 5 : 2, 7), animationDelay: dm(delayMs, 360 + i * 140), animationDuration: "calc(1500ms * var(--fx-dur, 1))" }}>
            <Man kind={k} fill={tint(p1, 0.95)} stroke={p2} />
          </span>
        ))}
        {/* ...and each is warded where it stands */}
        {[2, 5].map((f, i) => (
          <span key={f} className="bwp-stamp absolute block" style={{ ...cellBox(f, 7), animationDelay: dm(delayMs, 620 + i * 120), animationDuration: "calc(1200ms * var(--fx-dur, 1))" }}>
            <svg viewBox="0 0 10 11" className="block h-full w-full" aria-hidden="true">
              <path d={HEATER} fill={tint(p1, 0.14)} stroke={p1} strokeWidth="0.55" {...SJ} />
            </svg>
          </span>
        ))}
        {/* an enemy blade drives at the rook from their back rank and is thrown off */}
        <span className="absolute block" style={{ ...cellBox(2, 8), ...FLIP }}>
          <span className="bwp-rebuff absolute block" style={{ left: "38%", top: "4%", width: "24%", height: "80%", "--reach": "46%", "--rb-side": 1, animationDelay: dm(delayMs, 760) } as CSSProperties}>
            <svg viewBox="0 0 4 10" className="block h-full w-full" aria-hidden="true">
              <path d="M2 9.6 L2.8 7.6 V1.6 H1.2 V7.6 Z" fill={p2} stroke={p1} strokeWidth="0.3" {...SJ} />
              <path d="M0.4 2.2 H3.6 M2 1.6 V0.4" stroke={p1} strokeWidth="0.45" strokeLinecap="round" />
            </svg>
          </span>
        </span>
        {/* the glance: a spark where the blade meets the ward */}
        <span className="bwp-glint absolute block" style={{ left: "29.2%", top: `calc(${rankTop(7)} + 6.25% - var(--fx-side, 1) * 6.25% - 2%)`, width: "4%", height: "4%", animationDelay: dm(delayMs, 980) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0 L6.6 5 L5 10 L3.4 5 Z M0 5 L5 3.4 L10 5 L5 6.6 Z" fill={p1} />
          </svg>
        </span>
        {/* the king is the exception: on the heights he is still fair game */}
        <span className="bwp-facein absolute block" style={{ ...cellBox(3, 8), animationDelay: dm(delayMs, 1060), animationDuration: "calc(1100ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
            <g fill={tint(p1, 0.85)} stroke={p2} strokeWidth="0.45" {...SJ}>{CHESSMAN.k}</g>
            <path d="M1.4 10.6 L8.6 1.4" stroke={p2} strokeWidth="0.9" strokeLinecap="round" />
          </svg>
        </span>
        {/* settle: a bishop steps back down off the heights and its ward breaks */}
        <span className="bwp-stepoff absolute block" style={{ ...manBox(6, 6), animationDelay: dm(delayMs, 1000) }}>
          <Man kind="b" fill={tint(p1, 0.9)} stroke={p2} />
        </span>
        <span className="bwp-shatter absolute block" style={{ ...cellBox(6, 6), animationDelay: dm(delayMs, 1380) }}>
          <svg viewBox="0 0 10 11" className="block h-full w-full" aria-hidden="true">
            <path d={HEATER} fill="none" stroke={tint(p1, 0.8)} strokeWidth="0.5" strokeDasharray="1.4 1" {...SJ} />
            <path d="M5.4 1.6 L4.4 4.6 L5.8 6.4 L4.6 9.4" fill="none" stroke={p1} strokeWidth="0.45" {...SJ} />
          </svg>
        </span>
      </BoardFrame>
    </Stage>
  );
}

/** Home Guard: the caster's first rank is fenced for good. A palisade stands
 * along its edge, an enemy pawn walking in to promote is turned back at the
 * fence and its crown struck out, a knight's leap onto the rank is thrown
 * back too, and the ward is locked with no turn count (permanent). */
const HOMEGUARD: Palette = ["#6a5a3a", "#e8dcc0", "#2a2216"];
function HomeGuardScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = HOMEGUARD;
  if (role === "entrance") return <EntranceCut palette={HOMEGUARD} glyph={GLYPH.bw3_home_guard} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={HOMEGUARD} glyph={GLYPH.bw3_home_guard} delayMs={delayMs} />;
  return (
    <Stage>
      <BoardFrame>
        {/* tell: the hall, the caster's own first rank, is marked out */}
        <span
          className="bwp-hold absolute block"
          style={{ left: 0, width: "100%", top: rankTop(1), height: "12.5%", background: tint(p0, 0.5), border: `3px dashed ${p1}`, animationDelay: dm(delayMs, 0), animationDuration: "calc(1700ms * var(--fx-dur, 1))" }}
        />
        {/* strike: the palisade stands up along the threshold */}
        <span className="absolute block" style={{ left: 0, width: "100%", top: onRankLine(1, 9), height: "9%", ...FLIP }}>
          <span className="bwp-gate absolute inset-0 block" style={{ transformOrigin: "50% 100%", animationDelay: dm(delayMs, 260), animationDuration: "calc(1500ms * var(--fx-dur, 1))" }}>
            <svg viewBox="0 0 80 7" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <path key={i} d={`M${i * 10 + 3.6} 7 V1.8 L${i * 10 + 5} 0.3 L${i * 10 + 6.4} 1.8 V7 Z`} fill={p1} stroke={p2} strokeWidth="0.35" {...SJ} />
              ))}
            </svg>
          </span>
        </span>
        {/* the rail is drawn across all eight files */}
        <span className="bwp-beam absolute block" style={{ left: 0, width: "100%", top: `calc(${onRankLine(1, 1)} - var(--fx-side, 1) * 3.2%)`, height: "1.4%", background: p0, transformOrigin: "0% 50%", animationDelay: dm(delayMs, 420) }} />
        {/* an enemy pawn walks in to promote and is turned back at the fence */}
        <span className="bwp-rebuff absolute block" style={{ ...manBox(3, 2), "--reach": "52%", animationDelay: dm(delayMs, 560) } as CSSProperties}>
          <Man kind="p" fill={p2} stroke={p1} />
        </span>
        {/* ...so the crown it came for is struck out */}
        <span className="bwp-facein absolute block" style={{ ...cellBox(3, 1), animationDelay: dm(delayMs, 820) }}>
          <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
            <path d="M2.4 8.6 V4 L4.6 6 L6 3 L7.4 6 L9.6 4 V8.6 Z" fill={tint(p1, 0.9)} stroke={p0} strokeWidth="0.45" {...SJ} />
            <path d="M1.8 10.4 L10.2 1.6" stroke={p2} strokeWidth="0.9" strokeLinecap="round" />
          </svg>
        </span>
        {/* a knight's leap onto the rank is thrown back as well */}
        <span className="bwp-rebuff absolute block" style={{ ...manBox(6, 3), "--reach": "150%", animationDelay: dm(delayMs, 700) } as CSSProperties}>
          <Man kind="n" fill={p2} stroke={p1} />
        </span>
        {/* settle: the ward is locked at the end of the rank, with no count */}
        <span className="bwp-stamp absolute block" style={{ ...cellBox(7, 1), animationDelay: dm(delayMs, 1000) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M3.4 4.6 V3.2 C3.4 1.2 6.6 1.2 6.6 3.2 V4.6" fill="none" stroke={p1} strokeWidth="0.7" {...SJ} />
            <rect x="2.4" y="4.4" width="5.2" height="4.2" rx="0.8" fill={p0} stroke={p1} strokeWidth="0.5" />
          </svg>
        </span>
        <span className="bwp-facein absolute block" style={{ ...cellBox(0, 1), animationDelay: dm(delayMs, 1160) }}>
          <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
            <path d="M6 6 C4.6 3.8 2 3.8 2 6 C2 8.2 4.6 8.2 6 6 C7.4 3.8 10 3.8 10 6 C10 8.2 7.4 8.2 6 6 Z" fill="none" stroke={p1} strokeWidth="0.8" {...SJ} />
          </svg>
        </span>
        {/* the fence settles: two glints run along the threshold */}
        {[34, 60].map((l, i) => (
          <span key={l} className="bwp-glint absolute block" style={{ left: `${l}%`, top: `calc(${onRankLine(1, 1)} - var(--fx-side, 1) * 4%)`, width: "3.4%", height: "3.4%", animationDelay: dm(delayMs, 1120 + i * 120) }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0 L6.6 5 L5 10 L3.4 5 Z M0 5 L5 3.4 L10 5 L5 6.6 Z" fill={p1} />
            </svg>
          </span>
        ))}
      </BoardFrame>
    </Stage>
  );
}

/** Drive Them Out: the border between the halves is drawn across the board,
 * the enemy pieces standing in the caster's half are thrown back over it and
 * gone, the caster's own pieces standing in the opponent's half are struck
 * off with them, and both kings stay where they are, warded. */
const DRIVE: Palette = ["#3a5a6a", "#bfe0e8", "#16282e"];
function DriveThemOutScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = DRIVE;
  if (role === "entrance") return <EntranceCut palette={DRIVE} glyph={GLYPH.bw3_drive_them_out} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={DRIVE} glyph={GLYPH.bw3_drive_them_out} delayMs={delayMs} />;
  const invaders = [
    { k: "n" as const, f: 2, r: 3, d: 380, rot: "-24deg" },
    { k: "b" as const, f: 5, r: 4, d: 480, rot: "20deg" },
  ];
  return (
    <Stage>
      <BoardFrame>
        {/* tell: the caster's half, the homeland, is marked out */}
        <span
          className="bwp-hold absolute block"
          style={{ left: 0, width: "100%", top: bandTop(1, 4), height: "50%", background: tint(p0, 0.36), animationDelay: dm(delayMs, 0), animationDuration: "calc(1700ms * var(--fx-dur, 1))" }}
        />
        {/* the border between the halves runs across all eight files */}
        <span className="bwp-beam absolute block" style={{ left: 0, width: "100%", top: "49.4%", height: "1.2%", background: p1, transformOrigin: "0% 50%", animationDelay: dm(delayMs, 140), animationDuration: "calc(1500ms * var(--fx-dur, 1))" }} />
        {/* strike: the invaders in the homeland are thrown back over it */}
        {invaders.map((v) => (
          <span key={v.k} className="bwp-expel absolute block" style={{ ...manBox(v.f, v.r), "--reach": `-${(5 - v.r) * 117 + 60}%`, "--rot": v.rot, animationDelay: dm(delayMs, v.d) } as CSSProperties}>
            <Man kind={v.k} fill={p2} stroke={p1} />
          </span>
        ))}
        {/* ...and the caster's own pieces over the border go with them */}
        <span className="bwp-shatter absolute block" style={{ ...manBox(6, 6), animationDelay: dm(delayMs, 620) }}>
          <Man kind="r" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        <span className="bwp-sink absolute block" style={{ ...manBox(1, 5), animationDelay: dm(delayMs, 720) }}>
          <Man kind="p" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        {/* settle: both kings are spared where they stand, each in a ward */}
        {[
          { f: 3, r: 3, fill: p2, stroke: p1, d: 900 },
          { f: 4, r: 6, fill: tint(p1, 0.95), stroke: p2, d: 1000 },
        ].map((v) => (
          <span key={v.d} className="bwp-facein absolute block" style={{ ...manBox(v.f, v.r), animationDelay: dm(delayMs, v.d) }}>
            <Man kind="k" fill={v.fill} stroke={v.stroke} />
          </span>
        ))}
        {[
          { f: 3, r: 3, d: 1020 },
          { f: 4, r: 6, d: 1120 },
        ].map((v) => (
          <span key={v.d} className="bwp-stamp absolute block" style={{ ...cellBox(v.f, v.r), animationDelay: dm(delayMs, v.d) }}>
            <svg viewBox="0 0 10 11" className="block h-full w-full" aria-hidden="true">
              <path d={HEATER} fill="none" stroke={p1} strokeWidth="0.55" {...SJ} />
            </svg>
          </span>
        ))}
        {[22, 72].map((l, i) => (
          <span key={l} className="bwp-glint absolute block" style={{ left: `${l}%`, top: "48%", width: "4%", height: "4%", animationDelay: dm(delayMs, 1200 + i * 110) }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0 L6.6 5 L5 10 L3.4 5 Z M0 5 L5 3.4 L10 5 L5 6.6 Z" fill={p1} />
            </svg>
          </span>
        ))}
      </BoardFrame>
    </Stage>
  );
}

/** One back rank drawn as a row of chessmen (BoardFrame: 8 files wide, one
 * rank tall), `kinds[f]` per file, null for an empty square. */
function RankRow({ kinds, fill, stroke }: { kinds: (keyof typeof CHESSMAN | null)[]; fill: string; stroke: string }) {
  return (
    <svg viewBox="0 0 80 10" className="block h-full w-full" aria-hidden="true">
      {kinds.map((k, f) => (k == null ? null : (
        <g key={f} transform={`translate(${f * 10 + 1.4} 0.6) scale(0.72 0.74)`} fill={fill} stroke={stroke} strokeWidth="0.55" {...SJ}>
          {CHESSMAN[k]}
        </g>
      )))}
    </svg>
  );
}

/** The Reckoning: the debt falls on the minors alone. Both back ranks are
 * read out, a ledger line strikes through every knight and bishop on each,
 * those minors break apart on both sides at once, and the rooks, queens,
 * kings and pawns stand untouched. */
const RECKON: Palette = ["#3a3a40", "#c9c9cf", "#12121a"];
function ReckoningScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = RECKON;
  if (role === "entrance") return <EntranceCut palette={RECKON} glyph={GLYPH.bw3_the_reckoning} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={RECKON} glyph={GLYPH.bw3_the_reckoning} delayMs={delayMs} />;
  const minors: (keyof typeof CHESSMAN | null)[] = [null, "n", "b", null, null, "b", "n", null];
  const spared: (keyof typeof CHESSMAN | null)[] = ["r", null, null, "q", "k", null, null, "r"];
  const ranks = [
    { r: 1, fill: tint(p1, 0.95), stroke: p2, d: 0 },
    { r: 8, fill: p2, stroke: p1, d: 90 },
  ];
  return (
    <Stage>
      <BoardFrame>
        {/* tell: both back ranks are called to account */}
        {ranks.map((v) => (
          <span key={v.r} className="bwp-hold absolute block" style={{ left: 0, width: "100%", top: rankTop(v.r), height: "12.5%", background: tint(p0, 0.5), border: `3px dashed ${p1}`, animationDelay: dm(delayMs, 60 + v.d), animationDuration: "calc(1700ms * var(--fx-dur, 1))" }} />
        ))}
        {/* strike: the ledger line runs through each rank's minors */}
        {ranks.map((v) => (
          <span key={v.r} className="bwp-beam absolute block" style={{ left: "12.5%", width: "75%", top: `calc(${rankTop(v.r)} + 5.6%)`, height: "1.3%", background: p1, transformOrigin: "0% 50%", animationDelay: dm(delayMs, 360 + v.d) }} />
        ))}
        {/* ...and every knight and bishop on both sides breaks apart */}
        {ranks.map((v) => (
          <span key={v.r} className="bwp-shatter absolute block" style={{ left: 0, width: "100%", top: rankTop(v.r), height: "12.5%", animationDelay: dm(delayMs, 520 + v.d), animationDuration: "calc(1100ms * var(--fx-dur, 1))" }}>
            <RankRow kinds={minors} fill={v.fill} stroke={v.stroke} />
          </span>
        ))}
        {/* settle: rooks, queens and kings stand where they were, untouched */}
        {ranks.map((v) => (
          <span key={v.r} className="bwp-rise absolute block" style={{ left: 0, width: "100%", top: rankTop(v.r), height: "12.5%", animationDelay: dm(delayMs, 880 + v.d), animationDuration: "calc(1300ms * var(--fx-dur, 1))" }}>
            <RankRow kinds={spared} fill={v.fill} stroke={v.stroke} />
          </span>
        ))}
        {/* the account is closed: a paid seal at the centre of the board */}
        <span className="bwp-stamp absolute block" style={{ left: "43.75%", top: "43.75%", width: "12.5%", height: "12.5%", animationDelay: dm(delayMs, 1000) }}>
          <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
            <circle cx="6" cy="6" r="4.8" fill={tint(p0, 0.85)} stroke={p1} strokeWidth="0.6" />
            <path d="M3.6 6.2 L5.3 7.8 L8.6 4.2" fill="none" stroke={p1} strokeWidth="0.9" {...SJ} />
          </svg>
        </span>
        {[28, 70].map((l, i) => (
          <span key={l} className="bwp-glint absolute block" style={{ left: `${l}%`, top: "47%", width: "3.6%", height: "3.6%", animationDelay: dm(delayMs, 1180 + i * 110) }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0 L6.6 5 L5 10 L3.4 5 Z M0 5 L5 3.4 L10 5 L5 6.6 Z" fill={p1} />
            </svg>
          </span>
        ))}
      </BoardFrame>
    </Stage>
  );
}

/** One cell of the 14-cell stage, in stage %. */
const STAGE_CELL = 100 / 14;
/** A box `w` x `h` cells whose centre sits `dx`/`dy` cells off the cast
 * square, in the cast-anchored stage. */
function stageBox(dx: number, dy: number, w: number, h: number): CSSProperties {
  return {
    left: `${50 + dx * STAGE_CELL - (w * STAGE_CELL) / 2}%`,
    top: `${50 + dy * STAGE_CELL - (h * STAGE_CELL) / 2}%`,
    width: `${w * STAGE_CELL}%`,
    height: `${h * STAGE_CELL}%`,
  };
}

/** Pretender to the Throne: the claimant waits in the wings. Two curtains
 * part beside the cast square, a queen steps out and the crown comes down on
 * her, then she goes into the caster's pocket instead of onto the board; a
 * dotted drop line to an empty square with an hourglass says she lands on a
 * later turn, and two draft cards are struck out (the two skipped drafts). */
const PRETENDER: Palette = ["#8a6a2a", "#ffd76a", "#2a1c08"];
function PretenderScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = PRETENDER;
  if (role === "entrance") return <EntranceCut palette={PRETENDER} glyph={GLYPH.bw3_pretender} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={PRETENDER} glyph={GLYPH.bw3_pretender} delayMs={delayMs} />;
  return (
    <Stage>
      {/* tell: the curtains of the wings part */}
      {(["bwp-flapl", "bwp-flapr"] as const).map((cls, i) => (
        <span key={cls} className={`${cls} absolute block`} style={{ ...stageBox(i ? 0.55 : -0.55, -0.6, 0.9, 2), transformOrigin: i ? "100% 0%" : "0% 0%", animationDelay: dm(delayMs, 0), animationDuration: "calc(1500ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 9 20" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d={i ? "M9 0 V20 H2 C4 14 1 8 3 0 Z" : "M0 0 V20 H7 C5 14 8 8 6 0 Z"} fill={tint(p0, 0.9)} stroke={p2} strokeWidth="0.4" {...SJ} />
          </svg>
        </span>
      ))}
      {/* strike: the claimant steps out and the crown comes down on her */}
      <span className="bwp-rise absolute block" style={{ ...stageBox(0, -0.5, 0.9, 1.1), animationDelay: dm(delayMs, 240) }}>
        <Man kind="q" fill={tint(p1, 0.95)} stroke={p2} />
      </span>
      <span className="bwp-drop absolute block" style={{ ...stageBox(0, -1.2, 0.7, 0.45), animationDelay: dm(delayMs, 440) }}>
        <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
          <path d="M1.4 6.6 V2 L3.8 4 L6 1 L8.2 4 L10.6 2 V6.6 Z" fill={p1} stroke={p2} strokeWidth="0.5" {...SJ} />
        </svg>
      </span>
      {/* ...and goes into the pocket, not onto the board */}
      <span className="bwp-stamp absolute block" style={{ ...stageBox(0, 0.75, 1.3, 0.8), animationDelay: dm(delayMs, 700), animationDuration: "calc(1200ms * var(--fx-dur, 1))" }}>
        <svg viewBox="0 0 13 8" className="block h-full w-full" aria-hidden="true">
          <path d="M1 1.4 H12 V4.6 C12 6.6 10 7.4 6.5 7.4 C3 7.4 1 6.6 1 4.6 Z" fill={tint(p2, 0.9)} stroke={p1} strokeWidth="0.5" {...SJ} />
          <path d="M1 1.4 H12" stroke={p1} strokeWidth="0.9" strokeLinecap="round" />
        </svg>
      </span>
      <span className="bwp-sink absolute block" style={{ ...stageBox(0, 0.2, 0.7, 0.85), animationDelay: dm(delayMs, 820) }}>
        <Man kind="q" fill={tint(p1, 0.95)} stroke={p2} />
      </span>
      {/* a dotted drop line to an empty square: she lands on a later turn */}
      <span className="bwp-beam absolute block" style={{ ...stageBox(1.4, 0.75, 1.6, 0.12), transformOrigin: "0% 50%", background: `repeating-linear-gradient(90deg, ${p1} 0 6px, transparent 6px 11px)`, animationDelay: dm(delayMs, 980) }} />
      <span className="bwp-facein absolute block" style={{ ...stageBox(2.45, 0.75, 0.5, 0.6), animationDelay: dm(delayMs, 1060) }}>
        <svg viewBox="0 0 6 8" className="block h-full w-full" aria-hidden="true">
          <path d="M1 0.8 H5 M1 7.2 H5 M1.4 0.8 C1.4 3 4.6 3 4.6 4 C4.6 5 1.4 5 1.4 7.2 M4.6 0.8 C4.6 3 1.4 3 1.4 4 C1.4 5 4.6 5 4.6 7.2" fill="none" stroke={p1} strokeWidth="0.5" {...SJ} />
        </svg>
      </span>
      {/* settle: the price, two draft cards struck out */}
      <span className="bwp-facein absolute block" style={{ ...stageBox(-1.9, 0.6, 1.2, 0.8), animationDelay: dm(delayMs, 1180) }}>
        <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
          {[1, 6.4].map((x) => (
            <g key={x}>
              <rect x={x} y="0.8" width="4.6" height="6.4" rx="0.6" fill={tint(p0, 0.9)} stroke={p1} strokeWidth="0.4" />
              <path d={`M${x + 0.8} 1.8 L${x + 3.8} 6.2 M${x + 3.8} 1.8 L${x + 0.8} 6.2`} stroke={p2} strokeWidth="0.6" strokeLinecap="round" />
            </g>
          ))}
        </svg>
      </span>
      <Glint delayMs={delayMs + 1300} color={p1} left={48} top={36} size={2.4} />
    </Stage>
  );
}

/** Covenant of Return: the covenant is sworn with three charges. A caster's
 * rook out on the field is taken, and at once it is back on its own home
 * rank (the empty square nearest it); one charge of the three is spent. */
const COVENANT: Palette = ["#5b2b8f", "#e3d0ff", "#12081f"];
function CovenantScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = COVENANT;
  if (role === "entrance") return <EntranceCut palette={COVENANT} glyph={GLYPH.bw3_covenant_of_return} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={COVENANT} glyph={GLYPH.bw3_covenant_of_return} delayMs={delayMs} />;
  const pips = [
    { i: 0, d: 200 },
    { i: 1, d: 280 },
    { i: 2, d: 360 },
  ];
  return (
    <Stage>
      <BoardFrame>
        {/* tell: the covenant's loop is sworn on the caster's side */}
        <span className="bwp-spin absolute block" style={{ left: "1%", width: "23%", top: bandTop(3, 4), height: "25%", animationDelay: dm(delayMs, 0), animationDuration: "calc(1800ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 28 32" className="block h-full w-full" aria-hidden="true">
            <path d="M8 16 C8 8 20 8 20 16 C20 24 8 24 8 16 Z" fill={tint(p0, 0.5)} stroke={p1} strokeWidth="1.2" />
            <path d="M14 8 C6 8 6 24 14 24 C22 24 22 8 14 8 Z" fill="none" stroke={p1} strokeWidth="0.7" strokeDasharray="2 1.4" />
          </svg>
        </span>
        {/* three charges: the next three of your pieces to fall */}
        {pips.map((v) => (
          <span key={v.i} className="bwp-facein absolute block rounded-full" style={{ left: `${4 + v.i * 6.5}%`, top: `calc(${rankTop(5)} + 4%)`, width: "4.5%", height: "4.5%", background: p1, border: `2px solid ${p0}`, animationDelay: dm(delayMs, v.d), animationDuration: "calc(1500ms * var(--fx-dur, 1))" }} />
        ))}
        {/* strike: a rook out on the field is taken... */}
        <span className="bwp-shatter absolute block" style={{ ...manBox(5, 5), animationDelay: dm(delayMs, 560) }}>
          <Man kind="r" fill={p1} stroke={p2} />
        </span>
        {/* ...and is carried straight back to its home rank */}
        <span className="bwp-stepoff absolute block" style={{ ...manBox(5, 1), "--steps": 4, animationDelay: dm(delayMs, 760), animationDuration: "calc(1300ms * var(--fx-dur, 1))" } as CSSProperties}>
          <Man kind="r" fill={p1} stroke={p2} />
        </span>
        <span className="bwp-stamp absolute block" style={{ ...cellBox(5, 1), animationDelay: dm(delayMs, 1000) }}>
          <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
            <rect x="0.8" y="0.8" width="10.4" height="10.4" rx="0.8" fill="none" stroke={p1} strokeWidth="0.7" strokeDasharray="1.8 1.2" />
          </svg>
        </span>
        {/* settle: the first charge is spent */}
        <span className="bwp-sink absolute block rounded-full" style={{ left: "4%", top: `calc(${rankTop(5)} + 4%)`, width: "4.5%", height: "4.5%", background: p2, border: `2px solid ${p1}`, animationDelay: dm(delayMs, 1120) }} />
        {[62, 78].map((l, i) => (
          <span key={l} className="bwp-glint absolute block" style={{ left: `${l}%`, top: `calc(${rankTop(1)} + 2%)`, width: "3.6%", height: "3.6%", animationDelay: dm(delayMs, 1180 + i * 110) }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0 L6.6 5 L5 10 L3.4 5 Z M0 5 L5 3.4 L10 5 L5 6.6 Z" fill={p1} />
            </svg>
          </span>
        ))}
      </BoardFrame>
    </Stage>
  );
}

/** The Great Return: the river gives back everything it was paid. It runs
 * across the middle of the board, both home ranks are marked out, the fallen
 * of BOTH sides climb out of it and walk home (yours to your first rank,
 * theirs to their back rank), and your most valuable arrival, the queen, is
 * rooted where she lands for one turn. */
const RETURN: Palette = ["#8f6bff", "#e3d0ff", "#12081f"];
function GreatReturnScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = RETURN;
  if (role === "entrance") return <EntranceCut palette={RETURN} glyph={GLYPH.bw2_great_return} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={RETURN} glyph={GLYPH.bw2_great_return} delayMs={delayMs} />;
  const home = [
    { k: "q" as const, f: 3, r: 1, steps: 3.5, fill: tint(p1, 0.95), stroke: p2, d: 320 },
    { k: "n" as const, f: 6, r: 1, steps: 3.5, fill: tint(p1, 0.95), stroke: p2, d: 440 },
    { k: "r" as const, f: 0, r: 8, steps: -3.5, fill: p2, stroke: p1, d: 380 },
    { k: "b" as const, f: 5, r: 8, steps: -3.5, fill: p2, stroke: p1, d: 500 },
  ];
  return (
    <Stage>
      <BoardFrame>
        {/* tell: the river runs across the middle of the board */}
        <span className="bwp-beam absolute block" style={{ left: 0, width: "100%", top: "46.5%", height: "7%", transformOrigin: "0% 50%", animationDelay: dm(delayMs, 0), animationDuration: "calc(1700ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 80 7" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d="M0 1.6 C5 0.2 10 3 15 1.6 C20 0.2 25 3 30 1.6 C35 0.2 40 3 45 1.6 C50 0.2 55 3 60 1.6 C65 0.2 70 3 75 1.6 L80 1.2 V5.8 C75 7 70 4 65 5.4 C60 6.8 55 4 50 5.4 C45 6.8 40 4 35 5.4 C30 6.8 25 4 20 5.4 C15 6.8 10 4 5 5.4 L0 5.8 Z" fill={tint(p0, 0.55)} stroke={p1} strokeWidth="0.35" {...SJ} />
          </svg>
        </span>
        {/* both home ranks are marked out: where the fallen are owed */}
        {[1, 8].map((r, i) => (
          <span key={r} className="bwp-hold absolute block" style={{ left: 0, width: "100%", top: rankTop(r), height: "12.5%", border: `3px dashed ${p1}`, background: tint(p0, 0.22), animationDelay: dm(delayMs, 120 + i * 60), animationDuration: "calc(1650ms * var(--fx-dur, 1))" }} />
        ))}
        {/* strike: the fallen of both sides climb out of the river and walk home */}
        {home.map((v) => (
          <span key={v.k} className="bwp-stepoff absolute block" style={{ ...manBox(v.f, v.r), "--steps": v.steps, animationDelay: dm(delayMs, v.d), animationDuration: "calc(1350ms * var(--fx-dur, 1))" } as CSSProperties}>
            <Man kind={v.k} fill={v.fill} stroke={v.stroke} />
          </span>
        ))}
        {/* settle: your most valuable arrival is rooted where she lands */}
        <span className="bwp-gate absolute block" style={{ ...cellBox(3, 1), transformOrigin: "50% 100%", animationDelay: dm(delayMs, 1020), animationDuration: "calc(1000ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
            <path d="M3.4 11.6 C2.6 9.6 4.6 8.8 3.8 6.6 M8.6 11.6 C9.4 9.6 7.4 8.8 8.2 6.6 M6 11.6 C5.4 10 6.8 9.2 6.2 7.6 M1.2 11.6 C2.2 10.8 2.6 11 3.4 11.6 M10.8 11.6 C9.8 10.8 9.4 11 8.6 11.6" fill="none" stroke={p0} strokeWidth="0.8" {...SJ} />
          </svg>
        </span>
        {/* ...for one turn: a single stone pip on her square */}
        <span className="bwp-facein absolute block" style={{ left: "46%", top: `calc(${rankTop(1)} + 0.6%)`, width: "4.2%", height: "4.2%", animationDelay: dm(delayMs, 1160) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <circle cx="5" cy="5" r="4.2" fill={p2} stroke={p1} strokeWidth="0.7" />
            <path d="M5 2.6 V7.4" stroke={p1} strokeWidth="1" strokeLinecap="round" />
          </svg>
        </span>
        {[20, 76].map((l, i) => (
          <span key={l} className="bwp-glint absolute block" style={{ left: `${l}%`, top: "48%", width: "3.4%", height: "3.4%", animationDelay: dm(delayMs, 1240 + i * 110) }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0 L6.6 5 L5 10 L3.4 5 Z M0 5 L5 3.4 L10 5 L5 6.6 Z" fill={p1} />
            </svg>
          </span>
        ))}
      </BoardFrame>
    </Stage>
  );
}

/** A sword standing on file `f` in the middle of rank 4 (the caster's, tip
 * toward the border) or rank 5 (theirs, tip toward the caster). */
function truceBlade(f: number, theirs: boolean): CSSProperties {
  const s = theirs ? -1 : 1;
  return {
    left: `${f * 12.5 + 3.25}%`,
    width: "6%",
    top: `calc(50% + ${s} * var(--fx-side, 1) * 6.25% - 5.25%)`,
    height: "10.5%",
    scale: `1 calc(${s} * var(--fx-side, 1))`,
  };
}

/** The Long Truce: every blade is lowered for two turns. The two armies are
 * each put under a dashed ward (no piece of either side can be taken), the
 * swords raised at the border are laid flat, a herald from each side walks
 * out with a white flag and meets at the middle, both kings are warded too,
 * two turn pips stand by the heralds, and on your side your own nerf's
 * shackle falls open for three turns. */
const TRUCE: Palette = ["#5fc9b0", "#e8fff7", "#1c3a32"];
function LongTruceScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = TRUCE;
  if (role === "entrance") return <EntranceCut palette={TRUCE} glyph={GLYPH.bw2_long_truce} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={TRUCE} glyph={GLYPH.bw2_long_truce} delayMs={delayMs} />;
  const blades = [
    { f: 1, theirs: false, lw: "84deg", d: 420 },
    { f: 5, theirs: false, lw: "-84deg", d: 470 },
    { f: 2, theirs: true, lw: "-84deg", d: 450 },
    { f: 6, theirs: true, lw: "84deg", d: 500 },
  ];
  return (
    <Stage>
      <BoardFrame>
        {/* tell: both armies are put under the truce's ward */}
        {[
          { lo: 1, hi: 2 },
          { lo: 7, hi: 8 },
        ].map((v, i) => (
          <span key={v.lo} className="bwp-hold absolute block" style={{ left: 0, width: "100%", top: bandTop(v.lo, v.hi), height: "25%", background: tint(p0, 0.24), border: `3px dashed ${p1}`, animationDelay: dm(delayMs, i * 80), animationDuration: "calc(1750ms * var(--fx-dur, 1))" }} />
        ))}
        {/* the swords raised at the border... */}
        {blades.map((v) => (
          <span key={v.f} className="absolute block" style={truceBlade(v.f, v.theirs)}>
            {/* ...are lowered and laid flat */}
            <span className="bwp-lower absolute inset-0 block" style={{ transformOrigin: "50% 88%", "--lw": v.lw, animationDelay: dm(delayMs, v.d) } as CSSProperties}>
              <svg viewBox="0 0 4 10" className="block h-full w-full" aria-hidden="true">
                <path d="M2 0.4 L2.8 2.4 V7.6 H1.2 V2.4 Z" fill={v.theirs ? p2 : p1} stroke={v.theirs ? p1 : p2} strokeWidth="0.3" {...SJ} />
                <path d="M0.4 7.8 H3.6 M2 7.8 V9.6" stroke={v.theirs ? p1 : p2} strokeWidth="0.5" strokeLinecap="round" />
              </svg>
            </span>
          </span>
        ))}
        {/* strike: a herald from each side walks out to the middle with a white flag */}
        {[
          { f: 3, r: 4, steps: -1.5, fill: tint(p1, 0.95), stroke: p2, d: 260 },
          { f: 4, r: 5, steps: 1.5, fill: p2, stroke: p1, d: 320 },
        ].map((v) => (
          <span key={v.f} className="bwp-stepoff absolute block" style={{ ...manBox(v.f, v.r), "--steps": v.steps, animationDelay: dm(delayMs, v.d), animationDuration: "calc(1350ms * var(--fx-dur, 1))" } as CSSProperties}>
            <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
              <g fill={v.fill} stroke={v.stroke} strokeWidth="0.45" {...SJ}>{CHESSMAN.p}</g>
              <path d="M7.6 11 V1" stroke={v.stroke} strokeWidth="0.5" strokeLinecap="round" />
              <path d="M7.6 1.2 H10 V4.4 H7.6 Z" fill={p1} stroke={p2} strokeWidth="0.35" {...SJ} />
            </svg>
          </span>
        ))}
        {/* kings included: each king is warded where it stands */}
        {[1, 8].map((r, i) => (
          <span key={r} className="bwp-stamp absolute block" style={{ ...cellBox(4, r), animationDelay: dm(delayMs, 760 + i * 110) }}>
            <svg viewBox="0 0 10 11" className="block h-full w-full" aria-hidden="true">
              <path d={HEATER} fill={tint(p0, 0.3)} stroke={p1} strokeWidth="0.55" {...SJ} />
              <path d="M3.4 6.2 V4 L4.3 4.9 L5 3.4 L5.7 4.9 L6.6 4 V6.2 Z" fill={p1} stroke={p2} strokeWidth="0.3" {...SJ} />
            </svg>
          </span>
        ))}
        {/* two turns: two pips by the heralds at the middle */}
        <span className="bwp-facein absolute block" style={{ left: "26%", top: "46.5%", width: "10%", height: "7%", animationDelay: dm(delayMs, 940) }}>
          <svg viewBox="0 0 10 7" className="block h-full w-full" aria-hidden="true">
            {[2.6, 7.4].map((cx) => <circle key={cx} cx={cx} cy="3.5" r="2" fill={p1} stroke={p2} strokeWidth="0.5" />)}
          </svg>
        </span>
        {/* settle: your own nerf's shackle falls open, three pips under it */}
        <span className="bwp-facein absolute block" style={{ ...cellBox(7, 3), animationDelay: dm(delayMs, 1080), animationDuration: "calc(1200ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
            <path d="M3.6 6 V3.6 C3.6 1.2 8.4 1.2 8.4 3.6 V3.8" fill="none" stroke={p1} strokeWidth="0.8" {...SJ} />
            <rect x="2.6" y="5" width="6.8" height="3.8" rx="0.8" fill={p0} stroke={p2} strokeWidth="0.5" />
            {[3.6, 6, 8.4].map((cx) => <circle key={cx} cx={cx} cy="10.6" r="0.8" fill={p1} />)}
          </svg>
        </span>
        {[16, 82].map((l, i) => (
          <span key={l} className="bwp-glint absolute block" style={{ left: `${l}%`, top: "48%", width: "3.4%", height: "3.4%", animationDelay: dm(delayMs, 1240 + i * 110) }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0 L6.6 5 L5 10 L3.4 5 Z M0 5 L5 3.4 L10 5 L5 6.6 Z" fill={p1} />
            </svg>
          </span>
        ))}
      </BoardFrame>
    </Stage>
  );
}

/** Shadow Reserve: the smuggler opens the coat. A knight, a bishop and a
 * rook hang in the lining and slip into the pocket (not onto the board);
 * three dashed shadows on empty squares nearby say each drops on a later
 * turn, and two draft cards are struck and slide away (the two skipped
 * drafts). */
const SHADOW: Palette = ["#3a3a40", "#c9cdd6", "#12081f"];
function ShadowReserveScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = SHADOW;
  if (role === "entrance") return <EntranceCut palette={SHADOW} glyph={GLYPH.bw2_shadow_reserve} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={SHADOW} glyph={GLYPH.bw2_shadow_reserve} delayMs={delayMs} />;
  const wares = [
    { k: "n" as const, dx: -0.5 },
    { k: "b" as const, dx: 0 },
    { k: "r" as const, dx: 0.5 },
  ];
  const drops = [
    { k: "n" as const, dx: -2, dy: 1 },
    { k: "b" as const, dx: 2, dy: 0 },
    { k: "r" as const, dx: 1, dy: 2 },
  ];
  return (
    <Stage>
      {/* tell: the smuggler stands up, hooded, beside the cast square */}
      <span className="bwp-rise absolute block" style={{ ...stageBox(0, -0.8, 2, 3), animationDelay: dm(delayMs, 0), animationDuration: "calc(1650ms * var(--fx-dur, 1))" }}>
        <svg viewBox="0 0 20 30" className="block h-full w-full" aria-hidden="true">
          <path d="M10 1.4 C14 1.4 16 4.6 16 8 L17.4 28.6 H2.6 L4 8 C4 4.6 6 1.4 10 1.4 Z" fill={p0} stroke={p1} strokeWidth="0.6" {...SJ} />
          <path d="M6.6 7.4 C7.6 5 12.4 5 13.4 7.4 C12.4 9 7.6 9 6.6 7.4 Z" fill={p2} />
        </svg>
      </span>
      {/* the coat swings open */}
      {(["bwp-flapl", "bwp-flapr"] as const).map((cls, i) => (
        <span key={cls} className={`${cls} absolute block`} style={{ ...stageBox(i ? 0.32 : -0.32, -0.35, 0.64, 1.9), transformOrigin: i ? "100% 6%" : "0% 6%", animationDelay: dm(delayMs, 300), animationDuration: "calc(1250ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 9 20" className="block h-full w-full" preserveAspectRatio="none" aria-hidden="true">
            <path d={i ? "M8.4 0.6 L0.6 3 L0.6 19.4 L8.4 19.4 Z" : "M0.6 0.6 L8.4 3 L8.4 19.4 L0.6 19.4 Z"} fill={tint(p0, 0.95)} stroke={p1} strokeWidth="0.45" />
          </svg>
        </span>
      ))}
      {/* strike: a knight, a bishop and a rook hang in the lining... */}
      {wares.map((v, i) => (
        <span key={v.k} className="bwp-facein absolute block" style={{ ...stageBox(v.dx, -0.4, 0.5, 0.75), animationDelay: dm(delayMs, 480 + i * 90) }}>
          <Man kind={v.k} fill={p1} stroke={p2} />
        </span>
      ))}
      {/* ...and slip down into the pocket, not onto the board */}
      <span className="bwp-sink absolute block" style={{ ...stageBox(0, 0.25, 1.5, 0.75), animationDelay: dm(delayMs, 880) }}>
        <svg viewBox="0 0 30 12" className="block h-full w-full" aria-hidden="true">
          {wares.map((v, i) => (
            <g key={v.k} transform={`translate(${i * 10} 0)`} fill={p1} stroke={p2} strokeWidth="0.45" {...SJ}>{CHESSMAN[v.k]}</g>
          ))}
        </svg>
      </span>
      {/* each drops onto an empty square on a later turn: three shadows wait */}
      {drops.map((v, i) => (
        <span key={v.k} className="bwp-facein absolute block" style={{ ...stageBox(v.dx, v.dy, 0.9, 1), animationDelay: dm(delayMs, 1040 + i * 90), animationDuration: "calc(1250ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
            <g fill={tint(p0, 0.85)} stroke={p1} strokeWidth="0.65" strokeDasharray="0.9 0.6" {...SJ}>{CHESSMAN[v.k]}</g>
          </svg>
        </span>
      ))}
      {/* settle: the fee, two draft cards struck and slid away */}
      {[0, 1].map((i) => (
        <span key={i} className="bwp-cross absolute block" style={{ ...stageBox(-1.7 - i * 0.35, 1.1 + i * 0.5, 0.65, 0.95), rotate: `${-10 - i * 8}deg`, "--dx": "-160%", animationDelay: dm(delayMs, 1160 + i * 120) } as CSSProperties}>
          <svg viewBox="0 0 6 9" className="block h-full w-full" aria-hidden="true">
            <rect x="0.6" y="0.6" width="4.8" height="7.8" rx="0.8" fill={p0} stroke={p1} strokeWidth="0.4" />
            <path d="M1.6 1.8 L4.4 7.2 M4.4 1.8 L1.6 7.2" stroke={p1} strokeWidth="0.55" strokeLinecap="round" />
          </svg>
        </span>
      ))}
    </Stage>
  );
}

/** The Homecoming: a lamp is lit on two empty squares of the caster's home
 * rank (the empty squares nearest it), the best major (a rook) and the best
 * minor (a knight) walk in along that rank from either side of the board to
 * their lit squares, and the price is paid: two draft cards struck (the two
 * skipped drafts). */
const HOMECOMING: Palette = ["#6a5a3a", "#ffe9b0", "#2a2216"];
function HomecomingScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = HOMECOMING;
  if (role === "entrance") return <EntranceCut palette={HOMECOMING} glyph={GLYPH.bw3_the_homecoming} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={HOMECOMING} glyph={GLYPH.bw3_the_homecoming} delayMs={delayMs} />;
  const walkers = [
    { k: "r" as const, from: -11, dx: "425%", d: 360 },
    { k: "n" as const, from: 102, dx: "-424%", d: 460 },
  ];
  return (
    <Stage>
      <BoardFrame>
        {/* tell: a lamp is lit on each empty square waiting on the home rank */}
        {[2, 5].map((f, i) => (
          <span key={f} className="bwp-hold absolute block" style={{ ...cellBox(f, 1), animationDelay: dm(delayMs, i * 90), animationDuration: "calc(1800ms * var(--fx-dur, 1))" }}>
            <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
              <rect x="0.8" y="0.8" width="10.4" height="10.4" rx="0.8" fill={tint(p0, 0.35)} stroke={p1} strokeWidth="0.55" strokeDasharray="1.6 1.1" />
              <path d="M9.2 1.2 V2.2" stroke={p1} strokeWidth="0.4" strokeLinecap="round" />
              <path d="M8.2 2.2 H10.2 L10 4.6 H8.4 Z" fill={p1} stroke={p2} strokeWidth="0.3" {...SJ} />
            </svg>
          </span>
        ))}
        {/* strike: the major and the minor walk in along the home rank */}
        {walkers.map((v) => (
          <span key={v.k} className="bwp-march absolute block" style={{ ...manBox(0, 1), left: `${v.from}%`, "--dx": v.dx, animationDelay: dm(delayMs, v.d), animationDuration: "calc(1350ms * var(--fx-dur, 1))" } as CSSProperties}>
            <Man kind={v.k} fill={p1} stroke={p2} />
          </span>
        ))}
        {/* ...and are home: each lit square takes its piece */}
        {[2, 5].map((f, i) => (
          <span key={f} className="bwp-stamp absolute block" style={{ ...cellBox(f, 1), animationDelay: dm(delayMs, 1040 + i * 100) }}>
            <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
              <rect x="0.8" y="0.8" width="10.4" height="10.4" rx="0.8" fill="none" stroke={p1} strokeWidth="0.8" />
            </svg>
          </span>
        ))}
        {/* settle: the price, two draft cards struck out */}
        <span className="bwp-facein absolute block" style={{ left: "75%", width: "25%", top: `calc(${rankTop(3)} + 1.5%)`, height: "9.5%", animationDelay: dm(delayMs, 1160), animationDuration: "calc(1150ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
            {[1, 6.4].map((x) => (
              <g key={x}>
                <rect x={x} y="0.8" width="4.6" height="6.4" rx="0.6" fill={tint(p0, 0.9)} stroke={p1} strokeWidth="0.4" />
                <path d={`M${x + 0.8} 1.8 L${x + 3.8} 6.2 M${x + 3.8} 1.8 L${x + 0.8} 6.2`} stroke={p2} strokeWidth="0.6" strokeLinecap="round" />
              </g>
            ))}
          </svg>
        </span>
        {[2, 5].map((f, i) => (
          <span key={f} className="bwp-glint absolute block" style={{ left: `${f * 12.5 + 8.4}%`, top: `calc(${rankTop(1)} + 1%)`, width: "3.4%", height: "3.4%", animationDelay: dm(delayMs, 1260 + i * 110) }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0 L6.6 5 L5 10 L3.4 5 Z M0 5 L5 3.4 L10 5 L5 6.6 Z" fill={p1} />
            </svg>
          </span>
        ))}
      </BoardFrame>
    </Stage>
  );
}

/** A dealt draft card (the offer), `mark` drawn on its face. */
function DraftCard({ fill, stroke, mark }: { fill: string; stroke: string; mark?: ReactNode }) {
  return (
    <svg viewBox="0 0 6 9" className="block h-full w-full" aria-hidden="true">
      <rect x="0.6" y="0.6" width="4.8" height="7.8" rx="0.8" fill={fill} stroke={stroke} strokeWidth="0.4" />
      {mark ?? <circle cx="3" cy="4.5" r="1.1" fill="none" stroke={stroke} strokeWidth="0.4" />}
    </svg>
  );
}

/** A reroll die. */
function RerollDie({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <svg viewBox="0 0 8 8" className="block h-full w-full" aria-hidden="true">
      <rect x="0.6" y="0.6" width="6.8" height="6.8" rx="1.2" fill={fill} stroke={stroke} strokeWidth="0.45" />
      <circle cx="2.6" cy="2.6" r="0.7" fill={stroke} />
      <circle cx="5.4" cy="5.4" r="0.7" fill={stroke} />
    </svg>
  );
}

/** Restitution: the kinds are weighed. Their rooks and bishop stand on their
 * side of a balance, yours on your side: two rooks against one, so the owed
 * rook's empty place is marked and it walks home to your first rank, where it
 * is rooted for one turn; one bishop against one is level, so none returns.
 * The beam, tilted toward them, comes level. */
const RESTITUTION: Palette = ["#c9b89a", "#ffd76a", "#3a3026"];
function RestitutionScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = RESTITUTION;
  if (role === "entrance") return <EntranceCut palette={RESTITUTION} glyph={GLYPH.bw2_restitution} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={RESTITUTION} glyph={GLYPH.bw2_restitution} delayMs={delayMs} />;
  const theirs: (keyof typeof CHESSMAN | null)[] = [null, "r", "r", null, null, "b", null, null];
  const mine: (keyof typeof CHESSMAN | null)[] = [null, "r", null, null, null, "b", null, null];
  return (
    <Stage>
      <BoardFrame>
        {/* tell: the balance beam, tilted toward their side, across the middle */}
        <span className="bwp-tip absolute block" style={{ left: "6%", width: "88%", top: "48.8%", height: "2.4%", transformOrigin: "50% 50%", animationDelay: dm(delayMs, 0), animationDuration: "calc(1700ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 88 3" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <rect x="0.5" y="0.7" width="87" height="1.6" rx="0.8" fill={p0} stroke={p2} strokeWidth="0.3" />
            <circle cx="44" cy="1.5" r="1.3" fill={p1} stroke={p2} strokeWidth="0.3" />
          </svg>
        </span>
        {/* the kinds are counted: theirs on their side, yours on yours */}
        {[
          { r: 6, kinds: theirs, fill: p2, stroke: p0, d: 180 },
          { r: 3, kinds: mine, fill: tint(p1, 0.95), stroke: p2, d: 260 },
        ].map((v) => (
          <span key={v.r} className="bwp-facein absolute block" style={{ left: 0, width: "100%", top: rankTop(v.r), height: "12.5%", animationDelay: dm(delayMs, v.d), animationDuration: "calc(1400ms * var(--fx-dur, 1))" }}>
            <RankRow kinds={v.kinds} fill={v.fill} stroke={v.stroke} />
          </span>
        ))}
        {/* the verdicts: rooks outnumbered, bishops level */}
        <span className="bwp-stamp absolute block" style={{ left: "12.5%", width: "75%", top: "43.75%", height: "12.5%", animationDelay: dm(delayMs, 460), animationDuration: "calc(1100ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 60 10" className="block h-full w-full" aria-hidden="true">
            <path d="M8 2.6 L14 5 L8 7.4" fill="none" stroke={p1} strokeWidth="0.9" {...SJ} />
            <path d="M45 3.8 H51 M45 6.2 H51" stroke={p0} strokeWidth="0.9" strokeLinecap="round" />
          </svg>
        </span>
        {/* strike: the owed rook's empty place is marked... */}
        <span className="bwp-facein absolute block" style={{ ...manBox(2, 3), animationDelay: dm(delayMs, 580) }}>
          <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
            <g fill="none" stroke={p1} strokeWidth="0.55" strokeDasharray="0.9 0.6" {...SJ}>{CHESSMAN.r}</g>
          </svg>
        </span>
        {/* ...and it walks home to your first rank */}
        <span className="bwp-stepoff absolute block" style={{ ...manBox(2, 1), "--steps": 2, animationDelay: dm(delayMs, 740), animationDuration: "calc(1200ms * var(--fx-dur, 1))" } as CSSProperties}>
          <Man kind="r" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        {/* settle: rooted where it lands, one pip for one turn */}
        <span className="bwp-gate absolute block" style={{ ...cellBox(2, 1), transformOrigin: "50% 100%", animationDelay: dm(delayMs, 1080), animationDuration: "calc(950ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
            <path d="M3.4 11.6 C2.6 9.6 4.6 8.8 3.8 6.6 M8.6 11.6 C9.4 9.6 7.4 8.8 8.2 6.6 M1.2 11.6 C2.2 10.8 2.6 11 3.4 11.6 M10.8 11.6 C9.8 10.8 9.4 11 8.6 11.6" fill="none" stroke={p0} strokeWidth="0.8" {...SJ} />
            <circle cx="10" cy="2" r="1.4" fill={p2} stroke={p1} strokeWidth="0.45" />
          </svg>
        </span>
        {[30, 66].map((l, i) => (
          <span key={l} className="bwp-glint absolute block" style={{ left: `${l}%`, top: "47.5%", width: "3.4%", height: "3.4%", animationDelay: dm(delayMs, 1220 + i * 110) }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0 L6.6 5 L5 10 L3.4 5 Z M0 5 L5 3.4 L10 5 L5 6.6 Z" fill={p1} />
            </svg>
          </span>
        ))}
      </BoardFrame>
    </Stage>
  );
}

/** Carnival of Masks: the caster's own army, king aside, is masked and
 * shuffled. Masks come down on five pieces of the first two ranks and each
 * comes up as another kind; the king stays himself, ringed; and a pawn mask
 * that would land on the first rank is struck out (pawns never land there). */
const CARNIVAL: Palette = ["#c94ad1", "#ffd76a", "#2a1030"];
function CarnivalScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = CARNIVAL;
  if (role === "entrance") return <EntranceCut palette={CARNIVAL} glyph={GLYPH.bw2_carnival_of_masks} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={CARNIVAL} glyph={GLYPH.bw2_carnival_of_masks} delayMs={delayMs} />;
  const swaps: { f: number; r: number; k: keyof typeof CHESSMAN; to: keyof typeof CHESSMAN; d: number }[] = [
    { f: 1, r: 1, k: "n", to: "r", d: 200 },
    { f: 2, r: 1, k: "b", to: "q", d: 270 },
    { f: 3, r: 1, k: "q", to: "n", d: 340 },
    { f: 2, r: 2, k: "p", to: "b", d: 410 },
    { f: 6, r: 2, k: "p", to: "p", d: 480 },
  ];
  return (
    <Stage>
      <BoardFrame>
        {/* tell: the caster's army is called to the carnival */}
        <span className="bwp-hold absolute block" style={{ left: 0, width: "100%", top: bandTop(1, 2), height: "25%", background: tint(p0, 0.26), border: `3px dashed ${p1}`, animationDelay: dm(delayMs, 0), animationDuration: "calc(1750ms * var(--fx-dur, 1))" }} />
        {/* a mask comes down on each piece... */}
        {swaps.map((v, i) => (
          <span key={`m${i}`} className="bwp-drop absolute block" style={{ left: `${v.f * 12.5 + 2.5}%`, width: "7.5%", top: `calc(${rankTop(v.r)} + 1.5%)`, height: "4.5%", animationDelay: dm(delayMs, v.d), animationDuration: "calc(900ms * var(--fx-dur, 1))" }}>
            <svg viewBox="0 0 12 6" className="block h-full w-full" aria-hidden="true">
              <path d="M0.6 1.2 C3 0.2 9 0.2 11.4 1.2 C11.4 4 9.6 5.4 7.6 5.2 L6 3.8 L4.4 5.2 C2.4 5.4 0.6 4 0.6 1.2 Z" fill={p0} stroke={p2} strokeWidth="0.4" {...SJ} />
              <ellipse cx="3.6" cy="2.6" rx="1.1" ry="0.7" fill={p2} />
              <ellipse cx="8.4" cy="2.6" rx="1.1" ry="0.7" fill={p2} />
            </svg>
          </span>
        ))}
        {/* strike: ...and it comes up wearing another's powers */}
        {swaps.map((v, i) => (
          <span key={`s${i}`} className="absolute block" style={manBox(v.f, v.r)}>
            <span className="bwp-swapout absolute inset-0 block" style={{ animationDelay: dm(delayMs, v.d + 220) }}>
              <Man kind={v.k} fill={tint(p1, 0.9)} stroke={p2} />
            </span>
            <span className="bwp-swapin absolute inset-0 block" style={{ animationDelay: dm(delayMs, v.d + 220) }}>
              <Man kind={v.to} fill={p0} stroke={p1} />
            </span>
          </span>
        ))}
        {/* the king keeps his own face */}
        <span className="bwp-stamp absolute block" style={{ ...cellBox(4, 1), animationDelay: dm(delayMs, 900) }}>
          <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
            <circle cx="6" cy="6" r="5" fill="none" stroke={p1} strokeWidth="0.7" strokeDasharray="1.6 1" />
          </svg>
        </span>
        {/* settle: a pawn's mask may not land on the first rank: struck out */}
        <span className="bwp-facein absolute block" style={{ ...cellBox(6, 1), animationDelay: dm(delayMs, 1060), animationDuration: "calc(1150ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
            <g fill={tint(p0, 0.7)} stroke={p1} strokeWidth="0.45" {...SJ}>{CHESSMAN.p}</g>
            <path d="M1.4 10.6 L8.6 1.4" stroke={p2} strokeWidth="1" strokeLinecap="round" />
          </svg>
        </span>
        {[20, 74].map((l, i) => (
          <span key={l} className="bwp-glint absolute block" style={{ left: `${l}%`, top: `calc(${rankTop(3)} + 4%)`, width: "3.4%", height: "3.4%", animationDelay: dm(delayMs, 1220 + i * 110) }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0 L6.6 5 L5 10 L3.4 5 Z M0 5 L5 3.4 L10 5 L5 6.6 Z" fill={p1} />
            </svg>
          </span>
        ))}
      </BoardFrame>
    </Stage>
  );
}

/** Kingmaker's Pact: the draft is rigged a tier up. Three offers are dealt
 * across the middle and each is raised one tier (a chevron climbs onto it);
 * your reroll die breaks (forfeit now); four pips on their side count the
 * pact's four turns; and their own reroll die is tied to the pact's seal by a
 * cord that snaps (it ends the moment they reroll). */
const KINGMAKER: Palette = ["#c9a84c", "#ffd76a", "#2a1c08"];
function KingmakerScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = KINGMAKER;
  if (role === "entrance") return <EntranceCut palette={KINGMAKER} glyph={GLYPH.bw2_kingmakers_pact} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={KINGMAKER} glyph={GLYPH.bw2_kingmakers_pact} delayMs={delayMs} />;
  const offers = [
    { f: 2, d: 0 },
    { f: 3.5, d: 90 },
    { f: 5, d: 180 },
  ];
  return (
    <Stage>
      <BoardFrame>
        {/* tell: three offers are dealt across the middle */}
        {offers.map(({ f, d }) => (
          <span key={f} className="bwp-rise absolute block" style={{ left: `${f * 12.5 + 1.5}%`, width: "9.5%", top: "37%", height: "15%", animationDelay: dm(delayMs, d), animationDuration: "calc(1750ms * var(--fx-dur, 1))" }}>
            <DraftCard fill={tint(p0, 0.92)} stroke={p2} />
          </span>
        ))}
        {/* strike: each offer is raised one tier */}
        {offers.map(({ f, d }) => (
          <span key={f} className="bwp-stepoff absolute block" style={{ left: `${f * 12.5 + 3.5}%`, width: "5.5%", top: "31%", height: "5%", "--steps": -0.8, animationDelay: dm(delayMs, d + 380), animationDuration: "calc(1200ms * var(--fx-dur, 1))" } as CSSProperties}>
            <svg viewBox="0 0 8 5" className="block h-full w-full" aria-hidden="true">
              <path d="M1 4.2 L4 1 L7 4.2" fill="none" stroke={p1} strokeWidth="1.1" {...SJ} />
            </svg>
          </span>
        ))}
        {/* your reroll die breaks: forfeited now */}
        <span className="bwp-shatter absolute block" style={{ left: "4%", width: "7%", top: `calc(${rankTop(3)} + 3%)`, height: "7%", animationDelay: dm(delayMs, 640) }}>
          <RerollDie fill={tint(p1, 0.9)} stroke={p2} />
        </span>
        {/* four pips on their side: the pact's four turns */}
        <span className="bwp-facein absolute block" style={{ left: "25%", width: "50%", top: `calc(${rankTop(6)} + 3.5%)`, height: "5.5%", animationDelay: dm(delayMs, 820), animationDuration: "calc(1150ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 40 5" className="block h-full w-full" aria-hidden="true">
            {[5, 15, 25, 35].map((cx) => <circle key={cx} cx={cx} cy="2.5" r="1.8" fill={p1} stroke={p2} strokeWidth="0.4" />)}
          </svg>
        </span>
        {/* settle: their reroll die, tied to the seal: the cord snaps */}
        <span className="bwp-facein absolute block" style={{ left: "88%", width: "7%", top: `calc(${rankTop(6)} + 3%)`, height: "7%", animationDelay: dm(delayMs, 960) }}>
          <RerollDie fill={p2} stroke={p1} />
        </span>
        <span className="bwp-beam absolute block" style={{ left: "81%", width: "7%", top: `calc(${rankTop(6)} + 6%)`, height: "0.9%", background: `repeating-linear-gradient(90deg, ${p1} 0 5px, transparent 5px 8px)`, transformOrigin: "0% 50%", animationDelay: dm(delayMs, 1020) }} />
        <span className="bwp-stamp absolute block" style={{ left: "75%", width: "7%", top: `calc(${rankTop(6)} + 3%)`, height: "7%", animationDelay: dm(delayMs, 1100) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <circle cx="5" cy="5" r="4.2" fill={tint(p0, 0.95)} stroke={p2} strokeWidth="0.5" />
            <path d="M5 1.2 L4.2 4 L5.8 6 L5 8.8" fill="none" stroke={p2} strokeWidth="0.6" {...SJ} />
          </svg>
        </span>
        {[36, 62].map((l, i) => (
          <span key={l} className="bwp-glint absolute block" style={{ left: `${l}%`, top: "32%", width: "3.4%", height: "3.4%", animationDelay: dm(delayMs, 1200 + i * 110) }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0 L6.6 5 L5 10 L3.4 5 Z M0 5 L5 3.4 L10 5 L5 6.6 Z" fill={p1} />
            </svg>
          </span>
        ))}
      </BoardFrame>
    </Stage>
  );
}

/** High Stakes: sweep the table twice. Two drafts' offers are laid out and
 * the house rake sweeps each whole row to the caster (every card kept); a
 * third draft is struck out (skipped); and the reroll dice break under an
 * infinity mark (forfeit forever). */
const STAKES: Palette = ["#8a5a2a", "#ffd76a", "#2a1c08"];
function HighStakesScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = STAKES;
  if (role === "entrance") return <EntranceCut palette={STAKES} glyph={GLYPH.bw3_high_stakes} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={STAKES} glyph={GLYPH.bw3_high_stakes} delayMs={delayMs} />;
  const rows = [
    { r: 6, d: 200 },
    { r: 5, d: 480 },
  ];
  return (
    <Stage>
      <BoardFrame>
        {/* tell: the felt is laid across the middle of the board */}
        <span className="bwp-hold absolute block" style={{ left: "12.5%", width: "75%", top: bandTop(3, 6), height: "50%", background: tint(p0, 0.34), border: `3px dashed ${p1}`, animationDelay: dm(delayMs, 0), animationDuration: "calc(1700ms * var(--fx-dur, 1))" }} />
        {/* strike: each draft's whole row of offers is swept to the caster */}
        {rows.map((v) => (
          <span key={v.r} className="bwp-stepoff absolute block" style={{ left: "25%", width: "50%", top: `calc(${rankTop(v.r)} + 1%)`, height: "10.5%", "--steps": 1.2, animationDelay: dm(delayMs, v.d), animationDuration: "calc(1100ms * var(--fx-dur, 1))" } as CSSProperties}>
            <svg viewBox="0 0 30 9" className="block h-full w-full" aria-hidden="true">
              {[1, 11, 21].map((x) => (
                <g key={x}>
                  <rect x={x + 1} y="0.6" width="5.6" height="7.8" rx="0.8" fill={p1} stroke={p2} strokeWidth="0.4" />
                  <circle cx={x + 3.8} cy="4.5" r="1.1" fill="none" stroke={p2} strokeWidth="0.4" />
                </g>
              ))}
            </svg>
          </span>
        ))}
        {/* ...by the house rake, riding behind each row */}
        {rows.map((v) => (
          <span key={v.r} className="absolute block" style={{ left: "22%", width: "56%", top: `calc(${rankTop(v.r)} + 6.25% - var(--fx-side, 1) * 7%)`, height: "3%" }}>
            <span className="bwp-stepoff absolute inset-0 block" style={{ "--steps": 4.3, animationDelay: dm(delayMs, v.d + 40), animationDuration: "calc(1100ms * var(--fx-dur, 1))" } as CSSProperties}>
              <svg viewBox="0 0 56 3" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
                <path d="M1 2.4 H55 M28 2.4 V0.4" stroke={p1} strokeWidth="0.9" strokeLinecap="round" />
              </svg>
            </span>
          </span>
        ))}
        {/* a third draft is skipped besides: struck out */}
        <span className="bwp-facein absolute block" style={{ left: "37.5%", width: "25%", top: `calc(${rankTop(3)} + 1.5%)`, height: "9.5%", animationDelay: dm(delayMs, 900), animationDuration: "calc(1150ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
            <rect x="3.6" y="0.8" width="4.8" height="6.4" rx="0.6" fill={tint(p0, 0.9)} stroke={p1} strokeWidth="0.4" />
            <path d="M4.4 1.8 L7.6 6.2 M7.6 1.8 L4.4 6.2" stroke={p2} strokeWidth="0.7" strokeLinecap="round" />
          </svg>
        </span>
        {/* settle: the reroll dice break, forfeit forever */}
        {[1, 6].map((f, i) => (
          <span key={f} className="bwp-shatter absolute block" style={{ left: `${f * 12.5 + 3}%`, width: "7%", top: `calc(${rankTop(3)} + 3%)`, height: "7%", animationDelay: dm(delayMs, 1040 + i * 90) }}>
            <RerollDie fill={tint(p1, 0.9)} stroke={p2} />
          </span>
        ))}
        <span className="bwp-facein absolute block" style={{ left: "87%", width: "11%", top: `calc(${rankTop(3)} + 3%)`, height: "6.5%", animationDelay: dm(delayMs, 1180) }}>
          <svg viewBox="0 0 10 5" className="block h-full w-full" aria-hidden="true">
            <path d="M5 2.5 C4 0.8 1.4 0.8 1.4 2.5 C1.4 4.2 4 4.2 5 2.5 C6 0.8 8.6 0.8 8.6 2.5 C8.6 4.2 6 4.2 5 2.5 Z" fill="none" stroke={p1} strokeWidth="0.7" {...SJ} />
          </svg>
        </span>
      </BoardFrame>
    </Stage>
  );
}

/** Spoils of War: the finest captured piece defects. It stands in their
 * revival pool (a tray on their side), its colours turn to yours, and it
 * walks to an empty square on your home rank; an hourglass with a return
 * arrow stays on its empty place in their pool (it rejoins it later), and a
 * reroll die is yours. */
const SPOILS: Palette = ["#8a6a3a", "#ffd76a", "#3a3026"];
function SpoilsOfWarScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = SPOILS;
  if (role === "entrance") return <EntranceCut palette={SPOILS} glyph={GLYPH.bw2_spoils_of_war} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={SPOILS} glyph={GLYPH.bw2_spoils_of_war} delayMs={delayMs} />;
  return (
    <Stage>
      <BoardFrame>
        {/* tell: their revival pool, a tray at the edge of their side */}
        <span className="bwp-hold absolute block" style={{ left: "1%", width: "36%", top: rankTop(6), height: "12.5%", background: tint(p2, 0.7), border: `3px dashed ${p0}`, animationDelay: dm(delayMs, 0), animationDuration: "calc(1700ms * var(--fx-dur, 1))" }} />
        {/* the finest of the taken, a rook, in their colours... */}
        <span className="absolute block" style={manBox(1, 6)}>
          <span className="bwp-swapout absolute inset-0 block" style={{ animationDelay: dm(delayMs, 160), animationDuration: "calc(1000ms * var(--fx-dur, 1))" }}>
            <Man kind="r" fill={p2} stroke={p0} />
          </span>
          {/* strike: ...turns its coat to yours */}
          <span className="bwp-swapin absolute inset-0 block" style={{ animationDelay: dm(delayMs, 160), animationDuration: "calc(1000ms * var(--fx-dur, 1))" }}>
            <Man kind="r" fill={p1} stroke={p2} />
          </span>
        </span>
        {/* and walks to an empty square on your home rank */}
        <span className="bwp-stepoff absolute block" style={{ ...manBox(1, 1), "--steps": 5, animationDelay: dm(delayMs, 560), animationDuration: "calc(1150ms * var(--fx-dur, 1))" } as CSSProperties}>
          <Man kind="r" fill={p1} stroke={p2} />
        </span>
        <span className="bwp-stamp absolute block" style={{ ...cellBox(1, 1), animationDelay: dm(delayMs, 980) }}>
          <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
            <rect x="0.8" y="0.8" width="10.4" height="10.4" rx="0.8" fill="none" stroke={p1} strokeWidth="0.7" strokeDasharray="1.8 1.2" />
          </svg>
        </span>
        {/* its place in their pool waits with an hourglass: it rejoins later */}
        <span className="bwp-facein absolute block" style={{ ...cellBox(1, 6), animationDelay: dm(delayMs, 820), animationDuration: "calc(1250ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
            <path d="M3.4 2 H8.6 M3.4 10 H8.6 M3.8 2 C3.8 4.6 8.2 4.6 8.2 6 C8.2 7.4 3.8 7.4 3.8 10 M8.2 2 C8.2 4.6 3.8 4.6 3.8 6 C3.8 7.4 8.2 7.4 8.2 10" fill="none" stroke={p1} strokeWidth="0.6" {...SJ} />
            <path d="M10.4 8.4 C11.6 6 11 3.2 9.4 2.2 M9.4 2.2 L10.6 2 M9.4 2.2 L9.8 3.4" fill="none" stroke={p0} strokeWidth="0.55" {...SJ} />
          </svg>
        </span>
        {/* settle: one draft reroll is yours */}
        <span className="bwp-facein absolute block" style={{ left: "88%", width: "8%", top: `calc(${rankTop(2)} + 2.5%)`, height: "8%", animationDelay: dm(delayMs, 1120) }}>
          <svg viewBox="0 0 8 8" className="block h-full w-full" aria-hidden="true">
            <rect x="0.6" y="0.6" width="6.8" height="6.8" rx="1.2" fill={p1} stroke={p2} strokeWidth="0.45" />
            <circle cx="2.6" cy="2.6" r="0.7" fill={p2} />
            <circle cx="5.4" cy="5.4" r="0.7" fill={p2} />
          </svg>
        </span>
        <span className="bwp-glint absolute block" style={{ left: "15%", top: `calc(${rankTop(1)} + 1%)`, width: "3.4%", height: "3.4%", animationDelay: dm(delayMs, 1220) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0 L6.6 5 L5 10 L3.4 5 Z M0 5 L5 3.4 L10 5 L5 6.6 Z" fill={p1} />
          </svg>
        </span>
      </BoardFrame>
    </Stage>
  );
}

/** Early Coronation: a modest crowning, once. The line along the foot of
 * their second rank is drawn; a pawn of yours steps onto that rank; the three
 * modest crowns are offered (rook, bishop, knight) with the queen struck out;
 * the pawn comes up a knight; one pip, because it happens once. */
const CORONET: Palette = ["#8a6a3a", "#ffe9b0", "#2a2216"];
function EarlyCoronationScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = CORONET;
  if (role === "entrance") return <EntranceCut palette={CORONET} glyph={GLYPH.bw2_early_coronation} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={CORONET} glyph={GLYPH.bw2_early_coronation} delayMs={delayMs} />;
  const offers = [
    { k: "r" as const, f: 3, d: 520 },
    { k: "b" as const, f: 4, d: 590 },
    { k: "n" as const, f: 5, d: 660 },
  ];
  return (
    <Stage>
      <BoardFrame>
        {/* tell: the crowning line along the foot of their second rank */}
        <span className="bwp-beam absolute block" style={{ left: 0, width: "100%", top: `calc(${onRankLine(6, 1.4)} + var(--fx-side, 1) * 0.7%)`, height: "1.4%", background: `repeating-linear-gradient(90deg, ${p1} 0 8px, transparent 8px 13px)`, transformOrigin: "0% 50%", animationDelay: dm(delayMs, 0), animationDuration: "calc(1650ms * var(--fx-dur, 1))" }} />
        {/* strike: a pawn of yours steps onto their second rank... */}
        <span className="absolute block" style={manBox(6, 7)}>
          <span className="bwp-stepoff absolute inset-0 block" style={{ "--steps": -1, animationDelay: dm(delayMs, 180), animationDuration: "calc(900ms * var(--fx-dur, 1))" } as CSSProperties}>
            <Man kind="p" fill={p1} stroke={p2} />
          </span>
        </span>
        {/* ...and the modest crowns are offered, the queen struck out */}
        {offers.map((v) => (
          <span key={v.k} className="bwp-facein absolute block" style={{ ...manBox(v.f, 6), animationDelay: dm(delayMs, v.d), animationDuration: "calc(1150ms * var(--fx-dur, 1))" }}>
            <Man kind={v.k} fill={tint(p1, 0.9)} stroke={p0} />
          </span>
        ))}
        <span className="bwp-facein absolute block" style={{ ...cellBox(2, 6), animationDelay: dm(delayMs, 730), animationDuration: "calc(1100ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
            <g fill={tint(p0, 0.6)} stroke={p1} strokeWidth="0.45" {...SJ}>{CHESSMAN.q}</g>
            <path d="M1.4 10.6 L8.6 1.4" stroke={p2} strokeWidth="1" strokeLinecap="round" />
          </svg>
        </span>
        {/* the pawn comes up a knight on the spot */}
        <span className="absolute block" style={manBox(6, 7)}>
          <span className="bwp-swapout absolute inset-0 block" style={{ animationDelay: dm(delayMs, 760) }}>
            <Man kind="p" fill={p1} stroke={p2} />
          </span>
          <span className="bwp-swapin absolute inset-0 block" style={{ animationDelay: dm(delayMs, 760) }}>
            <Man kind="n" fill={p1} stroke={p2} />
          </span>
        </span>
        <span className="bwp-drop absolute block" style={{ left: "78%", width: "8%", top: `calc(${rankTop(7)} - 3%)`, height: "5%", animationDelay: dm(delayMs, 980) }}>
          <svg viewBox="0 0 12 7" className="block h-full w-full" aria-hidden="true">
            <path d="M1.6 6 V2.4 L4 4 L6 1.2 L8 4 L10.4 2.4 V6 Z" fill={p1} stroke={p2} strokeWidth="0.45" {...SJ} />
          </svg>
        </span>
        {/* settle: once only, one pip */}
        <span className="bwp-facein absolute block rounded-full" style={{ left: "90%", top: `calc(${rankTop(6)} + 4%)`, width: "4.5%", height: "4.5%", background: p1, border: `2px solid ${p0}`, animationDelay: dm(delayMs, 1160) }} />
      </BoardFrame>
    </Stage>
  );
}

/** Funeral Pyre: one of your own is lit and takes its neighbours. A pyre is
 * laid under your bishop and the eight squares round it are marked; the fire
 * takes the bishop; the enemy knight and pawns beside it burn with it; an
 * enemy rook under a shield and their king beside it both stand. */
const PYRE: Palette = ["#8a3a1a", "#ff9d3d", "#2b1208"];
function FuneralPyreScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = PYRE;
  if (role === "entrance") return <EntranceCut palette={PYRE} glyph={GLYPH.bw3_funeral_pyre} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={PYRE} glyph={GLYPH.bw3_funeral_pyre} delayMs={delayMs} />;
  const burned = [
    { k: "n" as const, f: 2, r: 6, d: 700 },
    { k: "p" as const, f: 4, r: 6, d: 760 },
    { k: "p" as const, f: 4, r: 5, d: 820 },
  ];
  return (
    <Stage>
      <BoardFrame>
        {/* tell: the eight squares round your bishop are marked out */}
        <span className="bwp-hold absolute block" style={{ left: "25%", width: "37.5%", top: bandTop(4, 6), height: "37.5%", background: tint(p0, 0.28), border: `3px dashed ${p1}`, animationDelay: dm(delayMs, 0), animationDuration: "calc(1650ms * var(--fx-dur, 1))" }} />
        {/* the pyre is laid under your bishop */}
        <span className="bwp-rise absolute block" style={{ ...manBox(3, 5), animationDelay: dm(delayMs, 120), animationDuration: "calc(900ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
            <g fill={p1} stroke={p2} strokeWidth="0.45" {...SJ}>{CHESSMAN.b}</g>
            <path d="M1 11 L9 9.6 M1 9.6 L9 11" stroke={p0} strokeWidth="0.9" strokeLinecap="round" />
          </svg>
        </span>
        {/* strike: the fire takes the bishop */}
        <span className="bwp-gate absolute block" style={{ ...cellBox(3, 5), transformOrigin: "50% 100%", animationDelay: dm(delayMs, 460), animationDuration: "calc(950ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
            <path d="M6 0.8 C8.4 3.6 10.4 6 9.6 8.6 C9 10.6 7.6 11.4 6 11.4 C4.4 11.4 3 10.6 2.4 8.6 C1.8 6.6 3.2 5.2 4 3.6 C4.4 5 5 5.8 5.6 6 C5.4 4.2 5.6 2.4 6 0.8 Z" fill={tint(p1, 0.9)} stroke={p0} strokeWidth="0.45" {...SJ} />
            <path d="M6 5.4 C7.4 7 7.6 8.6 7 9.8 C6.4 10.6 5.6 10.6 5 9.8 C4.6 8.8 5.4 7.2 6 5.4 Z" fill={tint(p1, 0.55)} />
          </svg>
        </span>
        {/* ...and the enemy pieces beside it burn with it */}
        {burned.map((v) => (
          <span key={`${v.f}${v.r}`} className="bwp-shatter absolute block" style={{ ...manBox(v.f, v.r), animationDelay: dm(delayMs, v.d) }}>
            <Man kind={v.k} fill={p2} stroke={p1} />
          </span>
        ))}
        {/* a shielded enemy stands */}
        <span className="bwp-stamp absolute block" style={{ ...cellBox(2, 4), animationDelay: dm(delayMs, 860) }}>
          <svg viewBox="0 0 10 11" className="block h-full w-full" aria-hidden="true">
            <path d={HEATER} fill={tint(p2, 0.55)} stroke={p1} strokeWidth="0.55" {...SJ} />
            <g transform="translate(2.5 2.2) scale(0.5)" fill={p2} stroke={p1} strokeWidth="0.8" {...SJ}>{CHESSMAN.r}</g>
          </svg>
        </span>
        {/* and so does their king */}
        <span className="bwp-facein absolute block" style={{ ...cellBox(4, 4), animationDelay: dm(delayMs, 940), animationDuration: "calc(1100ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
            <g fill={p2} stroke={p1} strokeWidth="0.45" {...SJ}>{CHESSMAN.k}</g>
            <circle cx="5" cy="6.2" r="4.6" fill="none" stroke={p1} strokeWidth="0.45" strokeDasharray="1.2 0.9" />
          </svg>
        </span>
        {/* settle: embers drift off the ashes */}
        {[36, 44].map((l, i) => (
          <span key={l} className="bwp-glint absolute block" style={{ left: `${l}%`, top: `calc(${rankTop(5)} + 1%)`, width: "3%", height: "3%", animationDelay: dm(delayMs, 1160 + i * 110) }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0 L6.6 5 L5 10 L3.4 5 Z M0 5 L5 3.4 L10 5 L5 6.6 Z" fill={p1} />
            </svg>
          </span>
        ))}
      </BoardFrame>
    </Stage>
  );
}

/** From the Ashes: the dead rise only as far as even. Their count of
 * non-king pieces stands as a tally on their side and yours, two short,
 * on yours; out of the ash on your home rank a rook rises, then a knight,
 * each adding a mark to your tally; the counts meet, the tallies are sealed
 * level, and the bishop left in the ash stays down. */
const ASHES: Palette = ["#7a3a2a", "#ff9d3d", "#2b1208"];
function FromTheAshesScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = ASHES;
  if (role === "entrance") return <EntranceCut palette={ASHES} glyph={GLYPH.bw3_from_the_ashes} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={ASHES} glyph={GLYPH.bw3_from_the_ashes} delayMs={delayMs} />;
  const tally = (n: number, stroke: string) => (
    <svg viewBox="0 0 30 8" className="block h-full w-full" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <path key={i} d={`M${2 + i * 4} 1 V7`} stroke={stroke} strokeWidth="1.1" strokeLinecap="round" />)}
    </svg>
  );
  const risers = [
    { k: "r" as const, f: 0, d: 380, tick: 22 },
    { k: "n" as const, f: 1, d: 640, tick: 26 },
  ];
  return (
    <Stage>
      <BoardFrame>
        {/* tell: the ash bed along your home rank, and the two tallies */}
        <span className="bwp-hold absolute block" style={{ left: 0, width: "37.5%", top: rankTop(1), height: "12.5%", background: tint(p2, 0.72), border: `3px dashed ${p0}`, animationDelay: dm(delayMs, 0), animationDuration: "calc(1700ms * var(--fx-dur, 1))" }} />
        <span className="bwp-hold absolute block" style={{ left: "58%", width: "40%", top: `calc(${rankTop(5)} + 2%)`, height: "8.5%", animationDelay: dm(delayMs, 100), animationDuration: "calc(1650ms * var(--fx-dur, 1))" }}>{tally(7, p2)}</span>
        <span className="bwp-hold absolute block" style={{ left: "58%", width: "40%", top: `calc(${rankTop(4)} + 2%)`, height: "8.5%", animationDelay: dm(delayMs, 160), animationDuration: "calc(1600ms * var(--fx-dur, 1))" }}>{tally(5, p1)}</span>
        {/* strike: out of the ash, strongest first, one at a time */}
        {risers.map((v) => (
          <span key={v.k} className="bwp-rise absolute block" style={{ ...manBox(v.f, 1), animationDelay: dm(delayMs, v.d), animationDuration: "calc(1150ms * var(--fx-dur, 1))" }}>
            <Man kind={v.k} fill={p1} stroke={p2} />
          </span>
        ))}
        {/* ...each one a mark on your tally */}
        {risers.map((v) => (
          <span key={v.tick} className="bwp-stamp absolute block" style={{ left: `${58 + (v.tick / 30) * 40 - 1}%`, width: "3%", top: `calc(${rankTop(4)} + 2%)`, height: "8.5%", animationDelay: dm(delayMs, v.d + 260) }}>
            <svg viewBox="0 0 3 8" className="block h-full w-full" aria-hidden="true">
              <path d="M1.5 1 V7" stroke={p1} strokeWidth="1.1" strokeLinecap="round" />
            </svg>
          </span>
        ))}
        {/* settle: level; the tallies are sealed and the rest stay in the ash */}
        <span className="bwp-stamp absolute block" style={{ left: "48%", width: "8%", top: `calc(${rankTop(4)} + 7%)`, height: "8%", animationDelay: dm(delayMs, 1100) }}>
          <svg viewBox="0 0 8 8" className="block h-full w-full" aria-hidden="true">
            <path d="M1.6 3 H6.4 M1.6 5 H6.4" stroke={p1} strokeWidth="0.9" strokeLinecap="round" />
          </svg>
        </span>
        <span className="bwp-sink absolute block" style={{ ...manBox(2, 1), animationDelay: dm(delayMs, 1080) }}>
          <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
            <g fill={tint(p0, 0.7)} stroke={p2} strokeWidth="0.45" strokeDasharray="0.9 0.6" {...SJ}>{CHESSMAN.b}</g>
          </svg>
        </span>
        {[6, 18].map((l, i) => (
          <span key={l} className="bwp-glint absolute block" style={{ left: `${l}%`, top: rankTop(2), width: "3%", height: "3%", animationDelay: dm(delayMs, 1180 + i * 110) }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0 L6.6 5 L5 10 L3.4 5 Z M0 5 L5 3.4 L10 5 L5 6.6 Z" fill={p1} />
            </svg>
          </span>
        ))}
      </BoardFrame>
    </Stage>
  );
}

/** King's Sanctuary: the king goes to the quietest corner of his home rank.
 * Two enemy pieces stand near him; the empty home-rank square close to them
 * is struck out, the one furthest from any of them is marked; the king makes
 * the move there and a sanctuary arch comes down over him. */
const SANCTUARY: Palette = ["#5a8fc0", "#dfe8ff", "#1c2a44"];
function KingsSanctuaryScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = SANCTUARY;
  if (role === "entrance") return <EntranceCut palette={SANCTUARY} glyph={GLYPH.bw3_kings_sanctuary} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={SANCTUARY} glyph={GLYPH.bw3_kings_sanctuary} delayMs={delayMs} />;
  return (
    <Stage>
      <BoardFrame>
        {/* tell: the threats near the king are marked */}
        {[
          { k: "n" as const, f: 6, r: 3, d: 0 },
          { k: "b" as const, f: 4, r: 4, d: 80 },
        ].map((v) => (
          <span key={v.k} className="bwp-hold absolute block" style={{ ...manBox(v.f, v.r), animationDelay: dm(delayMs, v.d), animationDuration: "calc(1500ms * var(--fx-dur, 1))" }}>
            <Man kind={v.k} fill={p2} stroke={p1} />
          </span>
        ))}
        {/* the empty home squares are weighed: near them, struck out... */}
        <span className="bwp-facein absolute block" style={{ ...cellBox(6, 1), animationDelay: dm(delayMs, 300) }}>
          <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
            <rect x="0.8" y="0.8" width="10.4" height="10.4" rx="0.8" fill="none" stroke={p1} strokeWidth="0.55" strokeDasharray="1.6 1.1" />
            <path d="M2.6 2.6 L9.4 9.4 M9.4 2.6 L2.6 9.4" stroke={p0} strokeWidth="0.9" strokeLinecap="round" />
          </svg>
        </span>
        {/* ...and the one furthest from them all, marked */}
        <span className="bwp-stamp absolute block" style={{ ...cellBox(0, 1), animationDelay: dm(delayMs, 380), animationDuration: "calc(1100ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
            <rect x="0.8" y="0.8" width="10.4" height="10.4" rx="0.8" fill={tint(p0, 0.3)} stroke={p1} strokeWidth="0.7" />
          </svg>
        </span>
        {/* strike: the king makes the move to it */}
        <span className="bwp-arc absolute block" style={{ ...manBox(5, 2), "--dx": "-702%", "--dy": "calc(var(--fx-side, 1) * 117%)", animationDelay: dm(delayMs, 520), animationDuration: "calc(1100ms * var(--fx-dur, 1))" } as CSSProperties}>
          <Man kind="k" fill={p1} stroke={p2} />
        </span>
        {/* settle: the sanctuary arch comes down over him */}
        <span className="bwp-drop absolute block" style={{ ...cellBox(0, 1), animationDelay: dm(delayMs, 980) }}>
          <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
            <path d="M1.4 11.4 V5.6 C1.4 0.8 10.6 0.8 10.6 5.6 V11.4" fill="none" stroke={p1} strokeWidth="0.7" strokeDasharray="1.6 1" {...SJ} />
          </svg>
        </span>
        <span className="bwp-glint absolute block" style={{ left: "8%", top: rankTop(2), width: "3.4%", height: "3.4%", animationDelay: dm(delayMs, 1180) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0 L6.6 5 L5 10 L3.4 5 Z M0 5 L5 3.4 L10 5 L5 6.6 Z" fill={p1} />
          </svg>
        </span>
      </BoardFrame>
    </Stage>
  );
}

/* --- Round 3: the tier 5 rule scenes ------------------------------------- */

/** A four-point spark (the settle beat), drawn inside a bwp-glint box. */
const SPARK = "M5 0 L6.6 5 L5 10 L3.4 5 Z M0 5 L5 3.4 L10 5 L5 6.6 Z";

/** A row of `n` turn pips, drawn as one svg (viewBox 4n x 4). */
function PipRow({ n, fill, stroke }: { n: number; fill: string; stroke: string }) {
  return (
    <svg viewBox={`0 0 ${n * 4} 4`} className="block h-full w-full" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={i * 4 + 2} cy="2" r="1.5" fill={fill} stroke={stroke} strokeWidth="0.4" />
      ))}
    </svg>
  );
}

/** Bolt Hole: their rook gives check down the open file and your king on d3
 * is caught; the passage's reach, every square within two of the king, is
 * marked out; a secret door opens in the wall under him, he slips through it
 * and comes out on an empty square inside that reach; of the passage's two
 * escapes, the first door crumbles and one is left. */
const BOLT: Palette = ["#5a6b8f", "#cdd6ff", "#1c1c2a"];
function BoltHoleScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = BOLT;
  if (role === "entrance") return <EntranceCut palette={BOLT} glyph={GLYPH.bw2_bolt_hole} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={BOLT} glyph={GLYPH.bw2_bolt_hole} delayMs={delayMs} />;
  const door = (
    <path d="M1.6 11.4 V5 C1.6 1.4 8.4 1.4 8.4 5 V11.4 Z" fill={p2} stroke={p1} strokeWidth="0.6" {...SJ} />
  );
  return (
    <Stage>
      <BoardFrame>
        {/* tell: their rook on the d-file gives check down it */}
        <span className="bwp-hold absolute block" style={{ ...manBox(3, 8), animationDelay: dm(delayMs, 0), animationDuration: "calc(1500ms * var(--fx-dur, 1))" }}>
          <Man kind="r" fill={p2} stroke={p1} />
        </span>
        <span className="absolute block" style={{ left: "42.9%", width: "1.7%", top: bandTop(4, 7), height: "50%", ...FLIP }}>
          <span className="bwp-gate absolute inset-0 block" style={{ transformOrigin: "50% 0%", background: "repeating-linear-gradient(180deg, #d6234f 0 7px, transparent 7px 11px)", animationDelay: dm(delayMs, 120), animationDuration: "calc(1300ms * var(--fx-dur, 1))" }} />
        </span>
        {/* ...and the king on d3 is caught in it */}
        <span className="bwp-shiver absolute block" style={{ ...manBox(3, 3), animationDelay: dm(delayMs, 260) }}>
          <Man kind="k" fill={p1} stroke={p2} />
        </span>
        {/* the passage reaches every square within two of the king */}
        <span className="bwp-hold absolute block" style={{ left: "12.5%", width: "62.5%", top: bandTop(1, 5), height: "62.5%", background: tint(p0, 0.2), border: `3px dashed ${p1}`, animationDelay: dm(delayMs, 380), animationDuration: "calc(1350ms * var(--fx-dur, 1))" }} />
        {/* strike: a secret door opens in the wall under him... */}
        <span className="bwp-stamp absolute block" style={{ ...cellBox(3, 3), animationDelay: dm(delayMs, 560) }}>
          <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
            {door}
            <circle cx="6.6" cy="7.6" r="0.55" fill={p1} />
          </svg>
        </span>
        {/* ...he slips through and comes out on b2, inside the reach */}
        <span className="bwp-arc absolute block" style={{ ...manBox(3, 3), "--dx": "-281%", "--dy": "calc(var(--fx-side, 1) * 117%)", animationDelay: dm(delayMs, 720), animationDuration: "calc(1000ms * var(--fx-dur, 1))" } as CSSProperties}>
          <Man kind="k" fill={p1} stroke={p2} />
        </span>
        <span className="bwp-facein absolute block" style={{ ...cellBox(1, 2), animationDelay: dm(delayMs, 1000) }}>
          <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
            <rect x="0.8" y="0.8" width="10.4" height="10.4" rx="0.8" fill="none" stroke={p1} strokeWidth="0.7" strokeDasharray="1.8 1.2" />
          </svg>
        </span>
        {/* settle: the passage bears two escapes; the first door crumbles */}
        <span className="bwp-facein absolute block" style={{ ...cellBox(7, 2), animationDelay: dm(delayMs, 900), animationDuration: "calc(1150ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 20 12" className="block h-full w-full" aria-hidden="true">
            <g transform="translate(10 0)">{door}</g>
          </svg>
        </span>
        <span className="bwp-shatter absolute block" style={{ left: "87.5%", width: "6.25%", top: rankTop(2), height: "12.5%", animationDelay: dm(delayMs, 1120) }}>
          <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
            {door}
            <path d="M5.4 2.4 L4.2 5.4 L5.8 7.4 L4.6 10.6" fill="none" stroke={p1} strokeWidth="0.55" {...SJ} />
          </svg>
        </span>
        <span className="bwp-glint absolute block" style={{ left: "20%", top: rankTop(3), width: "3.4%", height: "3.4%", animationDelay: dm(delayMs, 1180) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d={SPARK} fill={p1} />
          </svg>
        </span>
      </BoardFrame>
    </Stage>
  );
}

/** The Eternal Keep: your first rank is walled for four of their turns.
 * The rank is marked and a stone rampart rises along it; a ward stands on
 * every square of it but the king's (your king excepted); an enemy bishop's
 * lunge at the rook in the corner is thrown back; four pips count their four
 * turns; and a king crossing the midline breaks it. */
const KEEP: Palette = ["#8a8478", "#e8dcc0", "#3a3026"];
function EternalKeepScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = KEEP;
  if (role === "entrance") return <EntranceCut palette={KEEP} glyph={GLYPH.bw2_eternal_keep} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={KEEP} glyph={GLYPH.bw2_eternal_keep} delayMs={delayMs} />;
  return (
    <Stage>
      <BoardFrame>
        {/* tell: your first rank is marked out */}
        <span className="bwp-hold absolute block" style={{ left: 0, width: "100%", top: rankTop(1), height: "12.5%", background: tint(p0, 0.5), border: `3px dashed ${p1}`, animationDelay: dm(delayMs, 0), animationDuration: "calc(1750ms * var(--fx-dur, 1))" }} />
        {/* strike: the stone rampart rises along it, block on block */}
        <span className="absolute block" style={{ left: 0, width: "100%", top: onRankLine(1, 6), height: "6%", ...FLIP }}>
          <span className="bwp-gate absolute inset-0 block" style={{ transformOrigin: "50% 100%", animationDelay: dm(delayMs, 220), animationDuration: "calc(1500ms * var(--fx-dur, 1))" }}>
            <svg viewBox="0 0 80 6" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
              <path d="M0 6 V2.4 H3 V0.4 H7 V2.4 H13 V0.4 H17 V2.4 H23 V0.4 H27 V2.4 H33 V0.4 H37 V2.4 H43 V0.4 H47 V2.4 H53 V0.4 H57 V2.4 H63 V0.4 H67 V2.4 H73 V0.4 H77 V2.4 H80 V6 Z" fill={p0} stroke={p2} strokeWidth="0.3" {...SJ} />
              <path d="M0 4.2 H80 M10 2.4 V4.2 M30 2.4 V4.2 M50 2.4 V4.2 M70 2.4 V4.2 M20 4.2 V6 M40 4.2 V6 M60 4.2 V6" stroke={p2} strokeWidth="0.25" />
            </svg>
          </span>
        </span>
        {/* a ward on every square of the rank but the king's */}
        <span className="bwp-stamp absolute block" style={{ left: 0, width: "100%", top: rankTop(1), height: "12.5%", animationDelay: dm(delayMs, 480), animationDuration: "calc(1100ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 80 10" className="block h-full w-full" aria-hidden="true">
            {[0, 1, 2, 3, 5, 6, 7].map((f) => (
              <path key={f} transform={`translate(${f * 10 + 2.6} 1.4) scale(0.48 0.7)`} d={HEATER} fill={tint(p1, 0.2)} stroke={p1} strokeWidth="1" {...SJ} />
            ))}
          </svg>
        </span>
        {/* ...the king's own square is left out */}
        <span className="bwp-facein absolute block" style={{ ...cellBox(4, 1), animationDelay: dm(delayMs, 640) }}>
          <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
            <g fill={tint(p1, 0.85)} stroke={p2} strokeWidth="0.45" {...SJ}>{CHESSMAN.k}</g>
            <path d="M1.4 10.6 L8.6 1.4" stroke={p2} strokeWidth="0.9" strokeLinecap="round" />
          </svg>
        </span>
        {/* an enemy bishop lunges at the corner rook and is thrown back */}
        <span className="bwp-rebuff absolute block" style={{ ...manBox(7, 2), "--reach": "56%", animationDelay: dm(delayMs, 700) } as CSSProperties}>
          <Man kind="b" fill={p2} stroke={p1} />
        </span>
        <span className="bwp-glint absolute block" style={{ left: "92%", top: `calc(${rankTop(1)} + 6.25% - var(--fx-side, 1) * 6.25% - 1.7%)`, width: "3.4%", height: "3.4%", animationDelay: dm(delayMs, 900) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d={SPARK} fill={p1} />
          </svg>
        </span>
        {/* settle: four pips, their four turns */}
        <span className="bwp-facein absolute block" style={{ left: "2%", width: "16%", top: `calc(${rankTop(2)} + 4.5%)`, height: "4%", animationDelay: dm(delayMs, 1000), animationDuration: "calc(1100ms * var(--fx-dur, 1))" }}>
          <PipRow n={4} fill={p1} stroke={p2} />
        </span>
        {/* ...and the one way it ends: the king crossing the midline */}
        <span className="bwp-beam absolute block" style={{ left: "25%", width: "50%", top: "49.4%", height: "1.2%", background: `repeating-linear-gradient(90deg, ${p1} 0 7px, transparent 7px 12px)`, transformOrigin: "0% 50%", animationDelay: dm(delayMs, 1060) }} />
        <span className="bwp-shatter absolute block" style={{ left: "45.5%", width: "9%", top: "45%", height: "10%", animationDelay: dm(delayMs, 1200) }}>
          <svg viewBox="0 0 10 11" className="block h-full w-full" aria-hidden="true">
            <path d={HEATER} fill="none" stroke={p1} strokeWidth="0.55" strokeDasharray="1.4 1" {...SJ} />
            <path d="M5.4 1.6 L4.4 4.6 L5.8 6.4 L4.6 9.4" fill="none" stroke={p1} strokeWidth="0.5" {...SJ} />
          </svg>
        </span>
      </BoardFrame>
    </Stage>
  );
}

/** Kingsguard Duel: the guards settle it. The ring round their king on e8
 * and the ring round yours on e1 are marked; crossed blades are raised
 * between the two courts; their knight beside their king falls, and in
 * payment your bishop beside yours falls too; each king is left with an
 * open square beside him. */
const DUEL: Palette = ["#5a6b8f", "#ff9d9d", "#22283a"];
function KingsguardDuelScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = DUEL;
  if (role === "entrance") return <EntranceCut palette={DUEL} glyph={GLYPH.bw3_kingsguard_duel} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={DUEL} glyph={GLYPH.bw3_kingsguard_duel} delayMs={delayMs} />;
  const gap = (
    <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
      <rect x="0.8" y="0.8" width="10.4" height="10.4" rx="0.8" fill="none" stroke={p1} strokeWidth="0.6" strokeDasharray="1.6 1.1" />
    </svg>
  );
  return (
    <Stage>
      <BoardFrame>
        {/* tell: both kings, and the ring of squares beside each */}
        {[
          { r: 8, lo: 7, hi: 8, fill: p2, stroke: p1, d: 0 },
          { r: 1, lo: 1, hi: 2, fill: tint(p1, 0.95), stroke: p2, d: 90 },
        ].map((v) => (
          <span key={v.r}>
            <span className="bwp-hold absolute block" style={{ left: "37.5%", width: "37.5%", top: bandTop(v.lo, v.hi), height: "25%", background: tint(p0, 0.24), border: `3px dashed ${tint(p1, 0.85)}`, animationDelay: dm(delayMs, v.d), animationDuration: "calc(1650ms * var(--fx-dur, 1))" }} />
            <span className="bwp-rise absolute block" style={{ ...manBox(4, v.r), animationDelay: dm(delayMs, v.d + 60), animationDuration: "calc(1550ms * var(--fx-dur, 1))" }}>
              <Man kind="k" fill={v.fill} stroke={v.stroke} />
            </span>
          </span>
        ))}
        {/* strike: the blades cross between the two courts */}
        <span className="bwp-stamp absolute block" style={{ left: "43.75%", width: "12.5%", top: "43.75%", height: "12.5%", animationDelay: dm(delayMs, 420) }}>
          <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
            <path d="M2 10 L9.6 2.4 M2.6 2 L10 9.6" stroke={p1} strokeWidth="0.9" strokeLinecap="round" />
            <path d="M1.4 8 L4 10.6 M8 10.6 L10.6 8" stroke={p2} strokeWidth="0.8" strokeLinecap="round" />
          </svg>
        </span>
        {/* their knight beside their king falls... */}
        <span className="bwp-shatter absolute block" style={{ ...manBox(5, 7), animationDelay: dm(delayMs, 620) }}>
          <Man kind="n" fill={p2} stroke={p1} />
        </span>
        {/* ...and in payment your bishop beside yours */}
        <span className="bwp-shatter absolute block" style={{ ...manBox(3, 2), animationDelay: dm(delayMs, 820) }}>
          <Man kind="b" fill={tint(p1, 0.95)} stroke={p2} />
        </span>
        {/* settle: an open square beside each king */}
        <span className="bwp-facein absolute block" style={{ ...cellBox(5, 7), animationDelay: dm(delayMs, 980) }}>{gap}</span>
        <span className="bwp-facein absolute block" style={{ ...cellBox(3, 2), animationDelay: dm(delayMs, 1080) }}>{gap}</span>
        <span className="bwp-glint absolute block" style={{ left: "48%", top: "48%", width: "4%", height: "4%", animationDelay: dm(delayMs, 1180) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d={SPARK} fill={p1} />
          </svg>
        </span>
      </BoardFrame>
    </Stage>
  );
}

/** Turn the Tide: the line surges at once. A crest runs across your pawns
 * and every pawn with an empty square ahead steps into it together; the d
 * pawn, blocked by the pawn in front of it, holds; the g pawn on the seventh
 * holds too, since the step would reach the last rank, and the crown ahead of
 * it is struck out. */
const TIDE: Palette = ["#3a6b7a", "#a8e0e8", "#16303a"];
function TurnTheTideScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = TIDE;
  if (role === "entrance") return <EntranceCut palette={TIDE} glyph={GLYPH.bw3_turn_the_tide} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={TIDE} glyph={GLYPH.bw3_turn_the_tide} delayMs={delayMs} />;
  return (
    <Stage>
      <BoardFrame>
        {/* tell: the crest runs along the pawn line */}
        <span className="absolute block" style={{ left: 0, width: "100%", top: onRankLine(2, 4), height: "4%", ...FLIP }}>
          <span className="bwp-beam absolute inset-0 block" style={{ transformOrigin: "0% 50%", animationDelay: dm(delayMs, 0), animationDuration: "calc(1100ms * var(--fx-dur, 1))" }}>
            <svg viewBox="0 0 80 4" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
              <path d="M0 3.4 C5 3.4 5 0.6 10 0.6 C15 0.6 15 3.4 20 3.4 C25 3.4 25 0.6 30 0.6 C35 0.6 35 3.4 40 3.4 C45 3.4 45 0.6 50 0.6 C55 0.6 55 3.4 60 3.4 C65 3.4 65 0.6 70 0.6 C75 0.6 75 3.4 80 3.4" fill="none" stroke={p1} strokeWidth="0.7" />
            </svg>
          </span>
        </span>
        {/* strike: every pawn with an empty square ahead steps into it, together */}
        {[0, 1, 2, 4, 5, 7].map((f) => (
          <span key={f} className="bwp-stepoff absolute block" style={{ ...manBox(f, 3), "--steps": -1, animationDelay: dm(delayMs, 320), animationDuration: "calc(1150ms * var(--fx-dur, 1))" } as CSSProperties}>
            <Man kind="p" fill={p1} stroke={p2} />
          </span>
        ))}
        {/* the d pawn is blocked by the pawn in front and holds */}
        <span className="bwp-hold absolute block" style={{ ...manBox(3, 4), animationDelay: dm(delayMs, 280), animationDuration: "calc(1400ms * var(--fx-dur, 1))" }}>
          <Man kind="p" fill={p1} stroke={p2} />
        </span>
        <span className="bwp-hold absolute block" style={{ ...manBox(3, 5), animationDelay: dm(delayMs, 280), animationDuration: "calc(1400ms * var(--fx-dur, 1))" }}>
          <Man kind="p" fill={p2} stroke={p1} />
        </span>
        <span className="bwp-stamp absolute block" style={{ left: "39%", width: "10%", top: `calc(${onRankLine(4, 1.6)} + var(--fx-side, 1) * 0.8%)`, height: "1.6%", background: p0, animationDelay: dm(delayMs, 560) }} />
        {/* the g pawn on the seventh holds: its step would reach the last rank */}
        <span className="bwp-hold absolute block" style={{ ...manBox(6, 7), animationDelay: dm(delayMs, 280), animationDuration: "calc(1400ms * var(--fx-dur, 1))" }}>
          <Man kind="p" fill={p1} stroke={p2} />
        </span>
        <span className="bwp-facein absolute block" style={{ ...cellBox(6, 8), animationDelay: dm(delayMs, 640) }}>
          <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
            <path d="M2.4 8.6 V4 L4.6 6 L6 3 L7.4 6 L9.6 4 V8.6 Z" fill={tint(p1, 0.9)} stroke={p0} strokeWidth="0.45" {...SJ} />
            <path d="M1.8 10.4 L10.2 1.6" stroke={p2} strokeWidth="0.9" strokeLinecap="round" />
          </svg>
        </span>
        {/* settle: foam breaks along the new line */}
        {[
          { l: 16, d: 1060 },
          { l: 62, d: 1160 },
        ].map((v) => (
          <span key={v.l} className="bwp-glint absolute block" style={{ left: `${v.l}%`, top: rankTop(4), width: "3.4%", height: "3.4%", animationDelay: dm(delayMs, v.d) }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d={SPARK} fill={p1} />
            </svg>
          </span>
        ))}
      </BoardFrame>
    </Stage>
  );
}

/** Alchemist's Trade: gold from lead. Your rook on b3 is marked with the sign
 * of gold and comes up a queen; in payment your bishop on f3 is marked with
 * the sign of lead and comes down a pawn, the charge running between them;
 * your first and last ranks are struck out, since no officer there can pay. */
const ALCHEMY: Palette = ["#c9a84c", "#ffd76a", "#4a3a22"];
function AlchemistsTradeScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = ALCHEMY;
  if (role === "entrance") return <EntranceCut palette={ALCHEMY} glyph={GLYPH.bw2_alchemists_trade} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={ALCHEMY} glyph={GLYPH.bw2_alchemists_trade} delayMs={delayMs} />;
  const lead3 = "#8a94a8";
  return (
    <Stage>
      <BoardFrame>
        {/* tell: the first and last ranks cannot pay, and are struck out */}
        {[1, 8].map((r) => (
          <span key={r} className="bwp-hold absolute block" style={{ left: 0, width: "100%", top: rankTop(r), height: "12.5%", background: `repeating-linear-gradient(135deg, ${tint(p2, 0.55)} 0 6px, transparent 6px 14px)`, animationDelay: dm(delayMs, r === 1 ? 0 : 60), animationDuration: "calc(1500ms * var(--fx-dur, 1))" }} />
        ))}
        {/* the signs are set: gold over the rook, lead over the bishop */}
        <span className="bwp-drop absolute block" style={{ left: "15%", width: "7%", top: `calc(${rankTop(4)} + 2%)`, height: "7%", animationDelay: dm(delayMs, 200) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <circle cx="5" cy="5" r="3.8" fill="none" stroke={p1} strokeWidth="0.8" />
            <circle cx="5" cy="5" r="0.9" fill={p1} />
          </svg>
        </span>
        <span className="bwp-drop absolute block" style={{ left: "65%", width: "7%", top: `calc(${rankTop(4)} + 2%)`, height: "7%", animationDelay: dm(delayMs, 280) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M3.6 1 V6.4 M2 2.6 H5.2 M3.6 4.6 C5 3.4 7.6 3.6 7.6 5.8 C7.6 7.4 6 8 6.4 9.2" fill="none" stroke={lead3} strokeWidth="0.8" {...SJ} />
          </svg>
        </span>
        {/* the charge runs from the payer to the prize along the rank */}
        <span className="bwp-beam absolute block" style={{ left: "20%", width: "48%", top: `calc(${rankTop(3)} + 5.6%)`, height: "1.3%", background: `linear-gradient(90deg, ${p1}, ${lead3})`, transformOrigin: "100% 50%", animationDelay: dm(delayMs, 420) }} />
        {/* strike: the rook comes up a queen... */}
        <span className="absolute block" style={manBox(1, 3)}>
          <span className="bwp-swapout absolute inset-0 block" style={{ animationDelay: dm(delayMs, 480), animationDuration: "calc(1150ms * var(--fx-dur, 1))" }}>
            <Man kind="r" fill={tint(p1, 0.9)} stroke={p2} />
          </span>
          <span className="bwp-swapin absolute inset-0 block" style={{ animationDelay: dm(delayMs, 480), animationDuration: "calc(1150ms * var(--fx-dur, 1))" }}>
            <Man kind="q" fill={p1} stroke={p2} />
          </span>
        </span>
        {/* ...and in payment the bishop comes down a pawn */}
        <span className="absolute block" style={manBox(5, 3)}>
          <span className="bwp-swapout absolute inset-0 block" style={{ animationDelay: dm(delayMs, 620), animationDuration: "calc(1150ms * var(--fx-dur, 1))" }}>
            <Man kind="b" fill={tint(p1, 0.9)} stroke={p2} />
          </span>
          <span className="bwp-swapin absolute inset-0 block" style={{ animationDelay: dm(delayMs, 620), animationDuration: "calc(1150ms * var(--fx-dur, 1))" }}>
            <Man kind="p" fill={lead3} stroke={p2} />
          </span>
        </span>
        {/* settle: the gold catches the light */}
        <span className="bwp-glint absolute block" style={{ left: "19%", top: rankTop(3), width: "3.4%", height: "3.4%", animationDelay: dm(delayMs, 1080) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d={SPARK} fill={p1} />
          </svg>
        </span>
      </BoardFrame>
    </Stage>
  );
}

/** Deathless Oath: the oath is sworn on your knight on b5, the sun sign
 * pressed onto it; an enemy bishop takes it and it falls; it comes straight
 * back home down its file to b1, the empty square nearest your home rank;
 * one rebirth, so the sign breaks and the oath is spent. */
const OATH: Palette = ["#ffb454", "#ffe9b0", "#5a4a36"];
function DeathlessOathScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = OATH;
  if (role === "entrance") return <EntranceCut palette={OATH} glyph={GLYPH.bw2_deathless_oath} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={OATH} glyph={GLYPH.bw2_deathless_oath} delayMs={delayMs} />;
  const sun = (
    <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
      <path d="M2 8.4 A4 4 0 0 1 10 8.4 Z" fill={tint(p0, 0.85)} stroke={p2} strokeWidth="0.45" {...SJ} />
      <path d="M6 1.2 V2.8 M2.2 3 L3.2 4.2 M9.8 3 L8.8 4.2 M0.8 6.6 H2.2 M9.8 6.6 H11.2" stroke={p0} strokeWidth="0.6" strokeLinecap="round" />
      <path d="M1 9.6 H11" stroke={p2} strokeWidth="0.5" strokeLinecap="round" />
    </svg>
  );
  return (
    <Stage>
      <BoardFrame>
        {/* tell: your knight on b5 swears; the sun sign is pressed on it */}
        <span className="bwp-hold absolute block" style={{ ...manBox(1, 5), animationDelay: dm(delayMs, 0), animationDuration: "calc(700ms * var(--fx-dur, 1))" }}>
          <Man kind="n" fill={p1} stroke={p2} />
        </span>
        <span className="bwp-stamp absolute block" style={{ left: "15.6%", width: "6%", top: `calc(${rankTop(5)} - 1.5%)`, height: "6%", animationDelay: dm(delayMs, 120) }}>{sun}</span>
        {/* strike: an enemy bishop takes it from c6... */}
        <span className="bwp-arc absolute block" style={{ ...manBox(2, 6), "--dx": "-140%", "--dy": "calc(var(--fx-side, 1) * 117%)", animationDelay: dm(delayMs, 380), animationDuration: "calc(900ms * var(--fx-dur, 1))" } as CSSProperties}>
          <Man kind="b" fill={p2} stroke={p1} />
        </span>
        <span className="bwp-shatter absolute block" style={{ ...manBox(1, 5), animationDelay: dm(delayMs, 740) }}>
          <Man kind="n" fill={p1} stroke={p2} />
        </span>
        {/* ...and it comes straight back home down its file, to b1 */}
        <span className="absolute block" style={{ left: "17.5%", width: "2.5%", top: bandTop(2, 4), height: "37.5%", ...FLIP }}>
          <span className="bwp-gate absolute inset-0 block" style={{ transformOrigin: "50% 0%", background: `repeating-linear-gradient(180deg, ${p1} 0 5px, transparent 5px 10px)`, animationDelay: dm(delayMs, 840) }} />
        </span>
        <span className="bwp-stepoff absolute block" style={{ ...manBox(1, 1), "--steps": 4, animationDelay: dm(delayMs, 900), animationDuration: "calc(1100ms * var(--fx-dur, 1))" } as CSSProperties}>
          <Man kind="n" fill={p1} stroke={p2} />
        </span>
        <span className="bwp-rise absolute block" style={{ ...cellBox(1, 1), animationDelay: dm(delayMs, 1160) }}>{sun}</span>
        {/* settle: one rebirth, so the sign breaks and the oath is spent */}
        <span className="bwp-shatter absolute block" style={{ left: "15.6%", width: "6%", top: `calc(${rankTop(2)} + 1%)`, height: "6%", animationDelay: dm(delayMs, 1380) }}>
          <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
            <path d="M2 8.4 A4 4 0 0 1 10 8.4 Z" fill="none" stroke={p0} strokeWidth="0.6" {...SJ} />
            <path d="M6.4 3.6 L5.4 6 L6.6 8.6" fill="none" stroke={p2} strokeWidth="0.6" {...SJ} />
          </svg>
        </span>
      </BoardFrame>
    </Stage>
  );
}

/** Diplomatic Immunity: an envoy's papers. Their half is marked as foreign
 * soil; the seal is set on your bishop there; their rook's blow at it is
 * turned aside; your own half is struck through (there it is fair game);
 * then the envoy takes a pawn and the seal breaks, since a capture ends it. */
const ENVOY: Palette = ["#5a8fc0", "#dfe8ff", "#2c3e6b"];
function DiplomaticImmunityScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = ENVOY;
  if (role === "entrance") return <EntranceCut palette={ENVOY} glyph={GLYPH.bw2_diplomatic_immunity} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={ENVOY} glyph={GLYPH.bw2_diplomatic_immunity} delayMs={delayMs} />;
  const seal = (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <circle cx="5" cy="4.4" r="3.2" fill={p0} stroke={p1} strokeWidth="0.5" />
      <path d="M3.4 7 L2.6 9.6 L4.2 8.8 M6.6 7 L7.4 9.6 L5.8 8.8" fill="none" stroke={p1} strokeWidth="0.45" {...SJ} />
      <path d="M3.6 4.4 H6.4 M5 3 V5.8" stroke={p1} strokeWidth="0.45" strokeLinecap="round" />
    </svg>
  );
  return (
    <Stage>
      <BoardFrame>
        {/* tell: their half is foreign soil; yours is struck through */}
        <span className="bwp-hold absolute block" style={{ left: 0, width: "100%", top: bandTop(5, 8), height: "50%", background: tint(p0, 0.22), border: `3px dashed ${p1}`, animationDelay: dm(delayMs, 0), animationDuration: "calc(1700ms * var(--fx-dur, 1))" }} />
        <span className="bwp-facein absolute block" style={{ left: 0, width: "100%", top: bandTop(1, 4), height: "50%", background: `repeating-linear-gradient(135deg, ${tint(p2, 0.4)} 0 6px, transparent 6px 16px)`, animationDelay: dm(delayMs, 100), animationDuration: "calc(1500ms * var(--fx-dur, 1))" }} />
        {/* your bishop on d6 is the envoy; the seal is set on it */}
        <span className="bwp-hold absolute block" style={{ ...manBox(3, 6), animationDelay: dm(delayMs, 160), animationDuration: "calc(1000ms * var(--fx-dur, 1))" }}>
          <Man kind="b" fill={p1} stroke={p2} />
        </span>
        <span className="bwp-stamp absolute block" style={{ left: "44%", width: "6%", top: `calc(${rankTop(6)} + 0.5%)`, height: "6%", animationDelay: dm(delayMs, 300) }}>{seal}</span>
        {/* strike: their rook's blow from d8 is turned aside */}
        <span className="bwp-rebuff absolute block" style={{ ...manBox(3, 8), "--reach": "52%", animationDelay: dm(delayMs, 480) } as CSSProperties}>
          <Man kind="r" fill={p2} stroke={p1} />
        </span>
        <span className="bwp-glint absolute block" style={{ left: "42%", top: `calc(${rankTop(6)} + 6.25% - var(--fx-side, 1) * 6.25% - 1.7%)`, width: "3.4%", height: "3.4%", animationDelay: dm(delayMs, 700) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d={SPARK} fill={p1} />
          </svg>
        </span>
        {/* then the envoy takes the pawn on e7... */}
        <span className="bwp-sink absolute block" style={{ ...manBox(4, 7), animationDelay: dm(delayMs, 1100) }}>
          <Man kind="p" fill={p2} stroke={p1} />
        </span>
        <span className="bwp-arc absolute block" style={{ ...manBox(3, 6), "--dx": "140%", "--dy": "calc(var(--fx-side, 1) * -117%)", animationDelay: dm(delayMs, 760), animationDuration: "calc(900ms * var(--fx-dur, 1))" } as CSSProperties}>
          <Man kind="b" fill={p1} stroke={p2} />
        </span>
        {/* settle: ...and its seal breaks */}
        <span className="bwp-shatter absolute block" style={{ left: "56.5%", width: "6%", top: `calc(${rankTop(7)} + 0.5%)`, height: "6%", animationDelay: dm(delayMs, 1280) }}>{seal}</span>
      </BoardFrame>
    </Stage>
  );
}

/** Masquerade: two pieces trade masks where they stand. A mask comes down on
 * your knight on c3 and another on your bishop on f4, a ribbon ties the pair;
 * the knight comes up a bishop and the bishop a knight, on their own squares,
 * and the scale under them stays level (no material changes hands). */
const MASQUE: Palette = ["#6b4a8f", "#b98cff", "#1c0f18"];
function MasqueradeScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = MASQUE;
  if (role === "entrance") return <EntranceCut palette={MASQUE} glyph={GLYPH.bw2_masquerade} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={MASQUE} glyph={GLYPH.bw2_masquerade} delayMs={delayMs} />;
  const mask = (
    <svg viewBox="0 0 10 6" className="block h-full w-full" aria-hidden="true">
      <path d="M0.6 1.4 C3 0.4 7 0.4 9.4 1.4 C9.4 4 7.6 5.4 6 4.4 L5 3.6 L4 4.4 C2.4 5.4 0.6 4 0.6 1.4 Z" fill={p0} stroke={p1} strokeWidth="0.45" {...SJ} />
      <ellipse cx="3" cy="2.4" rx="1" ry="0.7" fill={p2} />
      <ellipse cx="7" cy="2.4" rx="1" ry="0.7" fill={p2} />
    </svg>
  );
  const pair = [
    { f: 2, r: 3, from: "n" as const, to: "b" as const, d: 520 },
    { f: 5, r: 4, from: "b" as const, to: "n" as const, d: 600 },
  ];
  return (
    <Stage>
      <BoardFrame>
        {/* tell: the ribbon ties the two dancers, c3 to f4 */}
        <span className="bwp-facein absolute block" style={{ left: "25%", width: "50%", top: bandTop(3, 4), height: "25%", animationDelay: dm(delayMs, 60), animationDuration: "calc(1600ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 40 20" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true" style={FLIP}>
            <path d="M5 15 C12 6 20 20 27 8 C29 5 32 5 35 5" fill="none" stroke={p1} strokeWidth="0.6" strokeDasharray="1.8 1.2" />
          </svg>
        </span>
        {/* strike: a mask comes down on each */}
        {pair.map((v) => (
          <span key={v.f} className="bwp-drop absolute block" style={{ left: `${v.f * 12.5 + 1.5}%`, width: "9.5%", top: `calc(${rankTop(v.r)} + 1.4%)`, height: "5.6%", animationDelay: dm(delayMs, v.d - 300) }}>{mask}</span>
        ))}
        {/* ...and each comes up as the other, on its own square */}
        {pair.map((v) => (
          <span key={v.to} className="absolute block" style={manBox(v.f, v.r)}>
            <span className="bwp-swapout absolute inset-0 block" style={{ animationDelay: dm(delayMs, v.d), animationDuration: "calc(1150ms * var(--fx-dur, 1))" }}>
              <Man kind={v.from} fill={tint(p1, 0.9)} stroke={p2} />
            </span>
            <span className="bwp-swapin absolute inset-0 block" style={{ animationDelay: dm(delayMs, v.d), animationDuration: "calc(1150ms * var(--fx-dur, 1))" }}>
              <Man kind={v.to} fill={p1} stroke={p2} />
            </span>
          </span>
        ))}
        {/* settle: the scale stays level, the material unchanged */}
        <span className="bwp-rise absolute block" style={{ left: "40%", width: "20%", top: `calc(${rankTop(2)} + 2%)`, height: "8%", animationDelay: dm(delayMs, 1040), animationDuration: "calc(1000ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 20 8" className="block h-full w-full" aria-hidden="true">
            <path d="M10 1 V7.4 M6 7.4 H14 M2 2 H18" stroke={p1} strokeWidth="0.6" strokeLinecap="round" />
            <path d="M0.6 2 L2 5 L3.4 2 M16.6 2 L18 5 L19.4 2" fill="none" stroke={p1} strokeWidth="0.45" {...SJ} />
            <path d="M0.4 5 H3.6 M16.4 5 H19.6" stroke={p1} strokeWidth="0.6" strokeLinecap="round" />
          </svg>
        </span>
        <span className="bwp-glint absolute block" style={{ left: "70%", top: rankTop(4), width: "3.4%", height: "3.4%", animationDelay: dm(delayMs, 1180) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d={SPARK} fill={p1} />
          </svg>
        </span>
      </BoardFrame>
    </Stage>
  );
}

/** Prisoner Exchange: envoys meet at the river. The river runs across the
 * middle of the board and a white flag goes up on each bank; in their
 * holding pen the queen is chosen over the rook (finest first); she crosses
 * the river and walks to d1, the empty square nearest your home rank. */
const PRISONER: Palette = ["#c9b89a", "#ffe9b0", "#4a3a2a"];
function PrisonerExchangeScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = PRISONER;
  if (role === "entrance") return <EntranceCut palette={PRISONER} glyph={GLYPH.bw2_prisoner_exchange} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={PRISONER} glyph={GLYPH.bw2_prisoner_exchange} delayMs={delayMs} />;
  const flag = (
    <svg viewBox="0 0 5 10" className="block h-full w-full" aria-hidden="true">
      <path d="M1 9.6 V0.8" stroke={p0} strokeWidth="0.5" strokeLinecap="round" />
      <path d="M1 1 H4.4 V3.8 H1 Z" fill={p1} stroke={p2} strokeWidth="0.3" {...SJ} />
    </svg>
  );
  return (
    <Stage>
      <BoardFrame>
        {/* tell: the river across the middle */}
        <span className="bwp-beam absolute block" style={{ left: 0, width: "100%", top: "47.5%", height: "5%", transformOrigin: "0% 50%", animationDelay: dm(delayMs, 0), animationDuration: "calc(1650ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 80 5" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d="M0 1 H80 V4 H0 Z" fill="rgba(90,143,192,0.5)" />
            <path d="M0 2.5 C6 1.2 10 3.8 16 2.5 C22 1.2 26 3.8 32 2.5 C38 1.2 42 3.8 48 2.5 C54 1.2 58 3.8 64 2.5 C70 1.2 74 3.8 80 2.5" fill="none" stroke={p1} strokeWidth="0.4" />
          </svg>
        </span>
        {/* a white flag goes up on each bank */}
        {[4, 5].map((r, i) => (
          <span key={r} className="bwp-gate absolute block" style={{ left: i ? "56%" : "40%", width: "4%", top: `calc(${rankTop(r)} + 1.5%)`, height: "9.5%", transformOrigin: "50% 100%", animationDelay: dm(delayMs, 200 + i * 80), animationDuration: "calc(1400ms * var(--fx-dur, 1))" }}>{flag}</span>
        ))}
        {/* their holding pen on their side: the queen is chosen over the rook */}
        <span className="bwp-hold absolute block" style={{ left: "1%", width: "48%", top: rankTop(7), height: "12.5%", background: tint(p2, 0.6), border: `3px dashed ${p0}`, animationDelay: dm(delayMs, 120), animationDuration: "calc(1500ms * var(--fx-dur, 1))" }} />
        <span className="bwp-hold absolute block" style={{ ...manBox(1, 7), animationDelay: dm(delayMs, 160), animationDuration: "calc(1400ms * var(--fx-dur, 1))" }}>
          <Man kind="r" fill={tint(p1, 0.6)} stroke={p2} />
        </span>
        {/* strike: she crosses the river and walks to d1 */}
        <span className="bwp-stepoff absolute block" style={{ ...manBox(3, 1), "--steps": 6, animationDelay: dm(delayMs, 420), animationDuration: "calc(1300ms * var(--fx-dur, 1))" } as CSSProperties}>
          <Man kind="q" fill={p1} stroke={p2} />
        </span>
        <span className="bwp-stamp absolute block" style={{ ...cellBox(3, 1), animationDelay: dm(delayMs, 1080) }}>
          <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
            <rect x="0.8" y="0.8" width="10.4" height="10.4" rx="0.8" fill="none" stroke={p1} strokeWidth="0.7" strokeDasharray="1.8 1.2" />
          </svg>
        </span>
        <span className="bwp-glint absolute block" style={{ left: "42%", top: rankTop(2), width: "3.4%", height: "3.4%", animationDelay: dm(delayMs, 1200) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d={SPARK} fill={p1} />
          </svg>
        </span>
      </BoardFrame>
    </Stage>
  );
}

/** Hallowed Ground: one empty square in your half is consecrated for good.
 * The chalk circle and its cross are drawn on c3; an enemy knight's leap
 * onto it is thrown back; then, with your king in check on g1 along the
 * rank, he steps onto the circle from across the board; an infinity mark,
 * since the ground stays hallowed. */
const HALLOW: Palette = ["#c9b84c", "#fff2c0", "#4a3a1a"];
function HallowedGroundScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = HALLOW;
  if (role === "entrance") return <EntranceCut palette={HALLOW} glyph={GLYPH.bw3_hallowed_ground} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={HALLOW} glyph={GLYPH.bw3_hallowed_ground} delayMs={delayMs} />;
  return (
    <Stage>
      <BoardFrame>
        {/* tell: the chalk circle is drawn on c3, the cross inside it */}
        <span className="bwp-facein absolute block" style={{ ...cellBox(2, 3), animationDelay: dm(delayMs, 0), animationDuration: "calc(1700ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
            <circle cx="6" cy="6" r="5" fill={tint(p1, 0.22)} stroke={p1} strokeWidth="0.7" />
            <circle cx="6" cy="6" r="3.6" fill="none" stroke={p0} strokeWidth="0.35" strokeDasharray="1.2 0.9" />
          </svg>
        </span>
        <span className="bwp-stamp absolute block" style={{ left: "28.5%", width: "5.5%", top: `calc(${rankTop(3)} + 3.5%)`, height: "5.5%", animationDelay: dm(delayMs, 200) }}>
          <svg viewBox="0 0 6 6" className="block h-full w-full" aria-hidden="true">
            <path d="M3 0.4 V5.6 M1 2 H5" stroke={p0} strokeWidth="0.7" strokeLinecap="round" />
          </svg>
        </span>
        {/* strike: an enemy knight's leap onto it is thrown back */}
        <span className="bwp-rebuff absolute block" style={{ ...manBox(2, 5), "--reach": "200%", animationDelay: dm(delayMs, 360) } as CSSProperties}>
          <Man kind="n" fill={p2} stroke={p1} />
        </span>
        {/* your king on g1 is checked along the rank... */}
        <span className="bwp-beam absolute block" style={{ left: "4%", width: "70%", top: `calc(${rankTop(1)} + 5.6%)`, height: "1.3%", background: "repeating-linear-gradient(90deg, #d6234f 0 7px, transparent 7px 11px)", transformOrigin: "0% 50%", animationDelay: dm(delayMs, 560) }} />
        {/* ...and steps onto the circle from across the board */}
        <span className="bwp-arc absolute block" style={{ ...manBox(6, 1), "--dx": "-562%", "--dy": "calc(var(--fx-side, 1) * -234%)", animationDelay: dm(delayMs, 700), animationDuration: "calc(1050ms * var(--fx-dur, 1))" } as CSSProperties}>
          <Man kind="k" fill={p1} stroke={p2} />
        </span>
        {/* settle: the ground stays hallowed, for good */}
        <span className="bwp-rise absolute block" style={{ left: "26%", width: "10%", top: `calc(${rankTop(4)} + 3%)`, height: "6%", animationDelay: dm(delayMs, 1080), animationDuration: "calc(1000ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 12 6" className="block h-full w-full" aria-hidden="true">
            <path d="M6 3 C4.6 0.8 2 0.8 2 3 C2 5.2 4.6 5.2 6 3 C7.4 0.8 10 0.8 10 3 C10 5.2 7.4 5.2 6 3 Z" fill="none" stroke={p1} strokeWidth="0.7" {...SJ} />
          </svg>
        </span>
        <span className="bwp-glint absolute block" style={{ left: "33%", top: rankTop(3), width: "3.4%", height: "3.4%", animationDelay: dm(delayMs, 1180) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d={SPARK} fill={p1} />
          </svg>
        </span>
      </BoardFrame>
    </Stage>
  );
}

/** Watchword: pawns keep watch. Your pawns on a2, c2, f2 and g2 open their
 * eyes and the lines they guard are drawn; five of your pieces stand guarded
 * (queen b3, rook d3, knight e3, bishop g3, pawn h3), so the four most
 * valuable are sheltered and the fifth, the pawn, is left out. */
const WATCH: Palette = ["#5a7a4a", "#cde8a8", "#22301a"];
function WatchwordScene({ lead, role, delayMs }: SceneProps) {
  const [p0, p1, p2] = WATCH;
  if (role === "entrance") return <EntranceCut palette={WATCH} glyph={GLYPH.bw3_watchword} delayMs={delayMs} />;
  if (!lead) return <TargetHit palette={WATCH} glyph={GLYPH.bw3_watchword} delayMs={delayMs} />;
  const sentries = [0, 2, 5, 6];
  const guarded: (keyof typeof CHESSMAN | null)[] = [null, "q", null, "r", "n", null, "b", "p"];
  return (
    <Stage>
      <BoardFrame>
        {/* tell: the sentry pawns on the second rank, eyes open */}
        <span className="bwp-hold absolute block" style={{ left: 0, width: "100%", top: rankTop(2), height: "12.5%", animationDelay: dm(delayMs, 0), animationDuration: "calc(1700ms * var(--fx-dur, 1))" }}>
          <RankRow kinds={[0, 1, 2, 3, 4, 5, 6, 7].map((f) => (sentries.includes(f) ? "p" : null))} fill={p1} stroke={p2} />
        </span>
        <span className="bwp-facein absolute block" style={{ left: 0, width: "100%", top: `calc(${rankTop(2)} + 1%)`, height: "4%", animationDelay: dm(delayMs, 160) }}>
          <svg viewBox="0 0 80 4" className="block h-full w-full" aria-hidden="true">
            {sentries.map((f) => (
              <g key={f}>
                <path d={`M${f * 10 + 2.6} 2 C${f * 10 + 4} 0.4 ${f * 10 + 6} 0.4 ${f * 10 + 7.4} 2 C${f * 10 + 6} 3.6 ${f * 10 + 4} 3.6 ${f * 10 + 2.6} 2 Z`} fill={p1} stroke={p2} strokeWidth="0.3" />
                <circle cx={f * 10 + 5} cy="2" r="0.7" fill={p2} />
              </g>
            ))}
          </svg>
        </span>
        {/* the pieces they guard, one rank ahead */}
        <span className="bwp-rise absolute block" style={{ left: 0, width: "100%", top: rankTop(3), height: "12.5%", animationDelay: dm(delayMs, 220), animationDuration: "calc(1500ms * var(--fx-dur, 1))" }}>
          <RankRow kinds={guarded} fill={tint(p1, 0.95)} stroke={p0} />
        </span>
        {/* strike: the watch lines, each pawn to what it guards */}
        <span className="bwp-gate absolute block" style={{ left: 0, width: "100%", top: bandTop(2, 3), height: "25%", transformOrigin: "50% 50%", animationDelay: dm(delayMs, 420) }}>
          <svg viewBox="0 0 80 20" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true" style={FLIP}>
            <path d="M5 13 L15 5 M25 13 L15 5 M25 13 L35 5 M55 13 L45 5 M55 13 L65 5 M65 13 L75 5" fill="none" stroke={p1} strokeWidth="0.6" strokeDasharray="1.6 1" />
          </svg>
        </span>
        {/* ...and the four most valuable are sheltered */}
        <span className="bwp-stamp absolute block" style={{ left: 0, width: "100%", top: rankTop(3), height: "12.5%", animationDelay: dm(delayMs, 700), animationDuration: "calc(1000ms * var(--fx-dur, 1))" }}>
          <svg viewBox="0 0 80 10" className="block h-full w-full" aria-hidden="true">
            {[1, 3, 4, 6].map((f) => (
              <path key={f} transform={`translate(${f * 10 + 0.6} 0.4) scale(0.88 0.92)`} d={HEATER} fill="none" stroke={p1} strokeWidth="0.6" {...SJ} />
            ))}
          </svg>
        </span>
        {/* settle: the fifth, the pawn on h3, is left out */}
        <span className="bwp-shatter absolute block" style={{ ...cellBox(7, 3), animationDelay: dm(delayMs, 1000) }}>
          <svg viewBox="0 0 10 11" className="block h-full w-full" aria-hidden="true">
            <path d={HEATER} fill="none" stroke={tint(p1, 0.8)} strokeWidth="0.5" strokeDasharray="1.4 1" {...SJ} />
            <path d="M2 9.4 L8 1.6" stroke={p2} strokeWidth="0.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className="bwp-glint absolute block" style={{ left: "16%", top: rankTop(3), width: "3.4%", height: "3.4%", animationDelay: dm(delayMs, 1160) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d={SPARK} fill={p1} />
          </svg>
        </span>
      </BoardFrame>
    </Stage>
  );
}

/* =============================================================================
   Card devices (glyphs) — one per card, drawn tiny inside the templates.
   ========================================================================== */

function Gl({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      {children}
    </svg>
  );
}

const GLYPH: Record<string, ReactNode> = {
  // the old statute, arrow slipping diagonally past
  bw2_ancient_custom: (
    <Gl>
      <rect x="1.6" y="2" width="6.8" height="6" rx="0.8" fill="#f4ead2" stroke="#8a6a3a" strokeWidth="0.5" />
      <path d="M3 6.8 L6.6 3.4 M6.6 3.4 L5 3.6 M6.6 3.4 L6.4 5" fill="none" stroke="#c94a3a" strokeWidth="0.6" {...SJ} />
    </Gl>
  ),
  // the crown above, the pitchfork barred below
  bw2_divine_right: (
    <Gl>
      <path d="M2.6 4.4 L2.2 1.8 L3.6 3 L5 1.2 L6.4 3 L7.8 1.8 L7.4 4.4 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.45" {...SJ} />
      <path d="M5 6 V8.8 M3.6 6 V7.2 M6.4 6 V7.2 M3.6 6 H6.4" fill="none" stroke="#8a94a8" strokeWidth="0.55" strokeLinecap="round" />
      <path d="M2.6 9 L7.4 5.6" stroke="#d6234f" strokeWidth="0.7" strokeLinecap="round" />
    </Gl>
  ),
  // pole, crossbar, straw hat
  bw2_scarecrow: (
    <Gl>
      <path d="M5 2.8 V9.4 M2.6 4.6 H7.4" stroke="#8a6a3a" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M3.4 2.8 L5 0.8 L6.6 2.8 Z" fill="#c9a84c" stroke="#4a3a22" strokeWidth="0.4" {...SJ} />
      <path d="M3.2 9.4 L2.4 8.2 M6.8 9.4 L7.6 8.2" stroke="#3f8f3f" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // the planted pennant
  bw2_pioneers_banner: (
    <Gl>
      <path d="M3.4 1 V9.2" stroke="#4a3a22" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M3.4 1.6 H7.8 L6.4 3.2 L7.8 4.8 H3.4 Z" fill="#c94a3a" stroke="#5a1512" strokeWidth="0.4" {...SJ} />
      <path d="M2 9.2 H4.8" stroke="#4a3a22" strokeWidth="0.6" strokeLinecap="round" />
    </Gl>
  ),
  // the empty bowl, one refused card
  bw2_ascetics_bargain: (
    <Gl>
      <path d="M1.6 5.6 H8.4 C8.2 7.6 6.8 8.8 5 8.8 C3.2 8.8 1.8 7.6 1.6 5.6 Z" fill="#8a6a3a" stroke="#4a3a22" strokeWidth="0.5" {...SJ} />
      <rect x="3.6" y="1" width="2.8" height="3.6" rx="0.5" fill="#e8dcc0" stroke="#4a3a22" strokeWidth="0.4" />
      <path d="M4.2 1.8 L5.8 3.8 M5.8 1.8 L4.2 3.8" stroke="#c94a3a" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // the belled cap
  bw2_jesters_rule: (
    <Gl>
      <path d="M1.6 8 C2 4.4 3.2 2.4 4 4.8 C4.6 1.8 5.4 1.8 6 4.8 C6.8 2.4 8 4.4 8.4 8 Z" fill="#c94ad1" stroke="#5b2b8f" strokeWidth="0.45" {...SJ} />
      <circle cx="1.9" cy="7.6" r="0.6" fill="#ffd76a" />
      <circle cx="5" cy="2.4" r="0.6" fill="#ffd76a" />
      <circle cx="8.1" cy="7.6" r="0.6" fill="#ffd76a" />
    </Gl>
  ),
  // strike out, snap back
  bw2_hit_and_run: (
    <Gl>
      <path d="M1.6 3.4 H7.4 M7.4 3.4 L5.8 2 M7.4 3.4 L5.8 4.8" fill="none" stroke="#ff9d3d" strokeWidth="0.7" {...SJ} />
      <path d="M8.4 6.6 H2.6 M2.6 6.6 L4.2 5.2 M2.6 6.6 L4.2 8" fill="none" stroke="#6fe3ff" strokeWidth="0.7" {...SJ} />
    </Gl>
  ),
  // crown cornered, knight-path out
  bw2_cornered_king: (
    <Gl>
      <path d="M1.4 8.6 L1 6.2 L2.2 7.2 L3 5.8 L3.8 7.2 L5 6.2 L4.6 8.6 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <path d="M5.6 7.6 V3.4 H8.2 M8.2 3.4 L7 2.4 M8.2 3.4 L7 4.4" fill="none" stroke="#6fe3ff" strokeWidth="0.65" {...SJ} />
    </Gl>
  ),
  // the two traded masks
  bw2_masquerade: (
    <Gl>
      <path d="M0.8 2.4 C2.2 1.6 3.8 1.6 5.2 2.4 C5.2 4.6 4 6 3 6 C2 6 0.8 4.6 0.8 2.4 Z" fill="#b98cff" stroke="#5b2b8f" strokeWidth="0.4" {...SJ} />
      <path d="M4.8 5.4 C6.2 4.6 7.8 4.6 9.2 5.4 C9.2 7.6 8 9 7 9 C6 9 4.8 7.6 4.8 5.4 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <path d="M2 3.4 H2.8 M3.4 3.4 H4.2 M6 6.4 H6.8 M7.4 6.4 H8.2" stroke="#12081f" strokeWidth="0.45" strokeLinecap="round" />
    </Gl>
  ),
  // the quill over her crown
  bw2_queens_testament: (
    <Gl>
      <path d="M2.4 8.8 L2 6.2 L3.4 7.4 L4.2 5.8 L5 7.4 L6.4 6.2 L6 8.8 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <path d="M8.6 1.2 C6.8 2 5.8 3.4 5.6 5.2 L6.4 5 C6.8 3.4 7.6 2.2 8.6 1.2 Z" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.35" {...SJ} />
      <path d="M5.4 5.4 L5 6" stroke="#8a6a3a" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // two flags, one changing hands
  bw2_spoils_of_war: (
    <Gl>
      <path d="M2.4 9 V2 L4.6 2.8 L2.4 3.6" fill="none" stroke="#8a94a8" strokeWidth="0.6" {...SJ} />
      <path d="M7.6 9 V2 L5.4 2.8 L7.6 3.6" fill="none" stroke="#ffd76a" strokeWidth="0.6" {...SJ} />
      <path d="M3.6 6.4 H6.4 M6.4 6.4 L5.4 5.6 M6.4 6.4 L5.4 7.2" fill="none" stroke="#a8e07f" strokeWidth="0.55" {...SJ} />
    </Gl>
  ),
  // the alembic, fed a drop of blood
  bw2_blood_price: (
    <Gl>
      <path d="M4 1.4 H6 V3.4 C7.6 4.4 8.4 6 8.2 7.6 C8 8.8 6.8 9.4 5 9.4 C3.2 9.4 2 8.8 1.8 7.6 C1.6 6 2.4 4.4 4 3.4 Z" fill="none" stroke="#b98cff" strokeWidth="0.55" {...SJ} />
      <path d="M5 5.2 C5.9 6.2 6 7 5 7.8 C4 7 4.1 6.2 5 5.2 Z" fill="#d6234f" />
    </Gl>
  ),
  // the letter of passage, sealed
  bw2_diplomatic_immunity: (
    <Gl>
      <rect x="1.6" y="2.4" width="6.8" height="5.2" rx="0.7" fill="#f4ead2" stroke="#8a6a3a" strokeWidth="0.5" />
      <path d="M2.8 4 H6 M2.8 5.4 H5" stroke="#8a6a3a" strokeWidth="0.4" strokeLinecap="round" />
      <circle cx="7.2" cy="6.2" r="1.1" fill="#c94a3a" stroke="#5a1512" strokeWidth="0.3" />
    </Gl>
  ),
  // the sun that comes back over the line
  bw2_deathless_oath: (
    <Gl>
      <path d="M1.4 6.8 H8.6" stroke="#4a3a22" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M2.6 6.6 C2.6 4.4 7.4 4.4 7.4 6.6 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.45" />
      <path d="M5 2 V3.2 M2.4 3.2 L3.2 4 M7.6 3.2 L6.8 4" stroke="#ffd76a" strokeWidth="0.55" strokeLinecap="round" />
    </Gl>
  ),
  // the crossed duelling axes
  bw2_blood_duel: (
    <Gl>
      <path d="M2.2 1.8 L7.8 8.2 M7.8 1.8 L2.2 8.2" stroke="#8a6a3a" strokeWidth="0.65" strokeLinecap="round" />
      <path d="M2.2 1.8 C3.4 1.4 4.2 1.8 4.6 2.8 L3.2 3.4 Z" fill="#c9cdd6" stroke="#5a6b8f" strokeWidth="0.35" {...SJ} />
      <path d="M7.8 1.8 C6.6 1.4 5.8 1.8 5.4 2.8 L6.8 3.4 Z" fill="#c9cdd6" stroke="#5a6b8f" strokeWidth="0.35" {...SJ} />
    </Gl>
  ),
  // the coin purse takes the minutes
  bw2_highwaymans_toll: (
    <Gl>
      <circle cx="3.4" cy="6.6" r="2.2" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.45" />
      <circle cx="6" cy="7.2" r="1.7" fill="#ffe9b0" stroke="#8a6a3a" strokeWidth="0.4" />
      <path d="M6.4 1.2 H8.8 L7.9 3 L8.8 4.8 H6.4 L7.3 3 Z" fill="none" stroke="#8a94a8" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // the level scale
  bw2_prisoner_exchange: (
    <Gl>
      <path d="M5 1.4 V8.6 M2 2.6 H8 M3.4 8.6 H6.6" stroke="#c9b89a" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M1 4.6 C1.4 5.8 2.6 5.8 3 4.6 M2 2.6 V4.6" fill="none" stroke="#c9b89a" strokeWidth="0.5" {...SJ} />
      <path d="M7 4.6 C7.4 5.8 8.6 5.8 9 4.6 M8 2.6 V4.6" fill="none" stroke="#c9b89a" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // the crown come early to the pawn
  bw2_early_coronation: (
    <Gl>
      <path d="M3 3.4 L2.6 1.2 L3.8 2.2 L5 0.8 L6.2 2.2 L7.4 1.2 L7 3.4 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <circle cx="5" cy="5.4" r="1.2" fill="#e8dcc0" stroke="#4a3a22" strokeWidth="0.4" />
      <path d="M3.6 9.4 L4.3 6.6 H5.7 L6.4 9.4 Z" fill="#e8dcc0" stroke="#4a3a22" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // lead and gold trading places
  bw2_alchemists_trade: (
    <Gl>
      <circle cx="3" cy="3" r="1.7" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" />
      <rect x="5.6" y="5.6" width="3" height="3" rx="0.5" fill="#6e6e78" stroke="#3a3a40" strokeWidth="0.4" />
      <path d="M6.4 2.4 C7.6 2.8 8.2 3.6 8.2 4.6 M8.2 4.6 L7.4 4 M8.2 4.6 L8.8 3.8" fill="none" stroke="#a8e07f" strokeWidth="0.5" {...SJ} />
      <path d="M3.6 7.6 C2.4 7.2 1.8 6.4 1.8 5.4 M1.8 5.4 L2.6 6 M1.8 5.4 L1.2 6.2" fill="none" stroke="#a8e07f" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // the standard, taller than its bearer
  bw2_standard_bearer: (
    <Gl>
      <path d="M3.2 0.8 V9.4" stroke="#4a3a22" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M3.2 1.4 H8.2 V4 H3.2 Z" fill="#c94ad1" stroke="#5b2b8f" strokeWidth="0.4" />
      <circle cx="5.4" cy="7.6" r="1" fill="#e8dcc0" stroke="#4a3a22" strokeWidth="0.35" />
      <path d="M4.4 9.6 L4.9 8.4 H5.9 L6.4 9.6 Z" fill="#e8dcc0" stroke="#4a3a22" strokeWidth="0.35" {...SJ} />
    </Gl>
  ),
  // the crown held by the hand behind it
  bw2_kingmakers_pact: (
    <Gl>
      <path d="M2.6 5.4 L2.2 2.6 L3.6 3.8 L5 2 L6.4 3.8 L7.8 2.6 L7.4 5.4 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.45" {...SJ} />
      <path d="M3 9 C3.4 7.4 4 6.6 5 6.6 C6 6.6 6.6 7.4 7 9 M4 7 V6 M5 6.8 V5.8 M6 7 V6" fill="none" stroke="#c9b89a" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // the door in the wall nobody was told about
  bw2_bolt_hole: (
    <Gl>
      <path d="M1.4 9 V2.2 H8.6 V9" fill="none" stroke="#8a94a8" strokeWidth="0.5" {...SJ} />
      <path d="M3.6 9 V5.4 C3.6 3.4 6.4 3.4 6.4 5.4 V9 Z" fill="#12081f" stroke="#8f6bff" strokeWidth="0.5" {...SJ} />
      <circle cx="5.8" cy="6.8" r="0.4" fill="#6fe3ff" />
    </Gl>
  ),
  // the ringmaster's mask, confetti falling
  bw2_carnival_of_masks: (
    <Gl>
      <path d="M1.8 3.2 C3.8 2 6.2 2 8.2 3.2 C8.2 6.4 6.4 8.4 5 8.4 C3.6 8.4 1.8 6.4 1.8 3.2 Z" fill="#c94ad1" stroke="#5b2b8f" strokeWidth="0.45" {...SJ} />
      <circle cx="3.6" cy="4.4" r="0.6" fill="#12081f" />
      <circle cx="6.4" cy="4.4" r="0.6" fill="#12081f" />
      <path d="M1 1 L1.4 1.8 M9 1.2 L8.6 2 M5 0.4 V1.2" stroke="#ffd76a" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // the scale tipped toward the wronged side
  bw2_restitution: (
    <Gl>
      <path d="M5 1.6 V8.8 M3.4 8.8 H6.6" stroke="#c9b89a" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M2.2 2.2 L7.8 3.4" stroke="#c9b89a" strokeWidth="0.55" strokeLinecap="round" />
      <path d="M1.2 4.2 C1.6 5.4 2.8 5.4 3.2 4.2 M2.2 2.2 V4.2" fill="none" stroke="#ffd76a" strokeWidth="0.5" {...SJ} />
      <path d="M6.8 5.4 C7.2 6.6 8.4 6.6 8.8 5.4 M7.8 3.4 V5.4" fill="none" stroke="#c9b89a" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // the dove with the olive sprig
  bw2_long_truce: (
    <Gl>
      <path d="M1.4 5.4 C3.4 3 6 2.8 7.8 4.2 L9 3.6 L8.4 5.2 C6.4 7.2 3.6 7.2 1.4 5.4 Z" fill="#e8fff7" stroke="#1c3a32" strokeWidth="0.45" {...SJ} />
      <path d="M4.6 4 C5.4 2.6 6.6 2.4 7.2 3" fill="none" stroke="#5fc9b0" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M3 8.4 H7" stroke="#5fc9b0" strokeWidth="0.5" strokeDasharray="1 0.8" strokeLinecap="round" />
    </Gl>
  ),
  // the gate standing open both ways
  bw2_great_return: (
    <Gl>
      <path d="M2 9 V3.4 C2 0.8 8 0.8 8 3.4 V9" fill="none" stroke="#8f6bff" strokeWidth="0.6" {...SJ} />
      <path d="M5 9 V2.6" stroke="#e3d0ff" strokeWidth="0.5" strokeDasharray="1 0.8" strokeLinecap="round" />
      <path d="M3.2 6.6 L1.4 6.6 M6.8 6.6 L8.6 6.6 M3.2 6.6 L4 5.8 M3.2 6.6 L4 7.4 M6.8 6.6 L6 5.8 M6.8 6.6 L6 7.4" stroke="#6fe3ff" strokeWidth="0.5" {...SJ} fill="none" />
    </Gl>
  ),
  // the coat, merchandise inside
  bw2_shadow_reserve: (
    <Gl>
      <path d="M2 9.2 L2.8 2.6 C3.4 1.4 6.6 1.4 7.2 2.6 L8 9.2 H6 L5.8 4.6 H4.2 L4 9.2 Z" fill="#26262c" stroke="#8a94a8" strokeWidth="0.45" {...SJ} />
      <circle cx="3.2" cy="6" r="0.5" fill="#c9cdd6" />
      <circle cx="6.8" cy="6" r="0.5" fill="#c9cdd6" />
      <circle cx="3.2" cy="7.8" r="0.5" fill="#c9cdd6" />
    </Gl>
  ),
  // the wall that never falls
  bw2_eternal_keep: (
    <Gl>
      <path d="M1.2 9 V4 H2.6 V2.6 H3.8 V4 H4.4 V2.6 H5.6 V4 H6.2 V2.6 H7.4 V4 H8.8 V9 Z" fill="#8a8478" stroke="#3a3026" strokeWidth="0.5" {...SJ} />
      <path d="M4.4 9 V6.6 C4.4 5.6 5.6 5.6 5.6 6.6 V9 Z" fill="#3a3026" />
      <circle cx="5" cy="1.2" r="0.5" fill="#ffd76a" />
    </Gl>
  ),

  /* --- WAVE 3 boon devices ------------------------------------------------- */
  // a bishop under a warding arc
  bw3_bishops_blessing: (
    <Gl>
      <path d="M1.4 3.4 C3.2 1.6 6.8 1.6 8.6 3.4" fill="none" stroke="#dfe8ff" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M5 4 C6.2 5 6.6 6 5 7 C3.4 6 3.8 5 5 4 Z" fill="#5a8fc0" stroke="#22406b" strokeWidth="0.4" {...SJ} />
      <path d="M3.6 9 H6.4 L5.8 7.4 H4.2 Z" fill="#5a8fc0" stroke="#22406b" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // a red drop over a ticking dial
  bw3_first_blood: (
    <Gl>
      <circle cx="5" cy="6.4" r="2.8" fill="#2b1218" stroke="#ff9d9d" strokeWidth="0.5" />
      <path d="M5 6.4 V4.4 M5 6.4 L6.4 7" stroke="#ff9d9d" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M5 0.8 C6.2 2.4 6.7 3.2 6.7 3.9 A1.7 1.7 0 1 1 3.3 3.9 C3.3 3.2 3.8 2.4 5 0.8 Z" fill="#d6234f" />
    </Gl>
  ),
  // a small door open in a wall
  bw3_postern_gate: (
    <Gl>
      <path d="M1.2 9 V2.4 H8.8 V9" fill="none" stroke="#5a6b8f" strokeWidth="0.5" {...SJ} />
      <path d="M4 9 V4.4 H7 V9 Z" fill="#1c1c2a" stroke="#cdd6ff" strokeWidth="0.5" {...SJ} />
      <circle cx="6.4" cy="6.8" r="0.4" fill="#6fe3ff" />
    </Gl>
  ),
  // a pawn with a rising knight crest
  bw3_heir_apparent: (
    <Gl>
      <circle cx="3.2" cy="6.4" r="1.3" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.4" />
      <path d="M2 9.4 L2.7 7 H3.7 L4.4 9.4 Z" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <path d="M5.4 5.4 C5.4 3 6.6 2 8 1.6 L8.8 2.6 L8 3.4 C8 4.6 7.4 5.4 6.8 5.4 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // two shields locked edge to edge
  bw3_shield_wall: (
    <Gl>
      <path d="M1.2 2 H4.6 V5 C4.6 7 2.9 8.4 2.9 8.4 C2.9 8.4 1.2 7 1.2 5 Z" fill="#bfe6c8" stroke="#1c3a2a" strokeWidth="0.45" {...SJ} />
      <path d="M5.4 2 H8.8 V5 C8.8 7 7.1 8.4 7.1 8.4 C7.1 8.4 5.4 7 5.4 5 Z" fill="#4a7a5a" stroke="#1c3a2a" strokeWidth="0.45" {...SJ} />
    </Gl>
  ),
  // a fence line sealing the home rank
  bw3_home_guard: (
    <Gl>
      <path d="M1 6.6 H9" stroke="#e8dcc0" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M2 8.4 V4.6 M4 8.4 V4 M6 8.4 V4 M8 8.4 V4.6" stroke="#6a5a3a" strokeWidth="0.8" strokeLinecap="round" />
    </Gl>
  ),
  // a shield before a crown
  bw3_kings_shield: (
    <Gl>
      <path d="M3 1.6 L2.6 0.4 M5 1.4 L5 0.2 M7 1.6 L7.4 0.4" stroke="#ffd76a" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M2.8 3.2 L2.4 1.6 L3.8 2.4 L5 1 L6.2 2.4 L7.6 1.6 L7.2 3.2 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <path d="M3 4.4 H7 V6.6 C7 8.4 5 9.4 5 9.4 C5 9.4 3 8.4 3 6.6 Z" fill="#5a6b8f" stroke="#1c2438" strokeWidth="0.45" {...SJ} />
    </Gl>
  ),
  // two pawns and a double-step arrow
  bw3_forced_march: (
    <Gl>
      <path d="M3.4 9 L3.4 3 M3.4 3 L2.2 4.4 M3.4 3 L4.6 4.4" fill="none" stroke="#ffd166" strokeWidth="0.7" {...SJ} />
      <path d="M6.6 9 L6.6 3 M6.6 3 L5.4 4.4 M6.6 3 L7.8 4.4" fill="none" stroke="#7c8a4a" strokeWidth="0.7" {...SJ} />
    </Gl>
  ),
  // two fanned cards and a chip
  bw3_double_down: (
    <Gl>
      <rect x="1.6" y="2.4" width="4" height="5.6" rx="0.6" fill="#ffd76a" stroke="#2a1c0e" strokeWidth="0.4" transform="rotate(-12 3.6 5.2)" />
      <rect x="4.4" y="2.4" width="4" height="5.6" rx="0.6" fill="#e8c86a" stroke="#2a1c0e" strokeWidth="0.4" transform="rotate(12 6.4 5.2)" />
      <circle cx="5" cy="8.4" r="1.2" fill="#8a5a2a" stroke="#2a1c0e" strokeWidth="0.4" />
    </Gl>
  ),
  // a pawn jabbing to both sides
  bw3_underdogs_gambit: (
    <Gl>
      <circle cx="5" cy="3.4" r="1.4" fill="#ff9d3d" stroke="#2b1410" strokeWidth="0.4" />
      <path d="M4.4 9 L5 5 H5 L5.6 9 Z" fill="#ff9d3d" stroke="#2b1410" strokeWidth="0.4" {...SJ} />
      <path d="M6 6 H8.4 M8.4 6 L7.4 5.2 M8.4 6 L7.4 6.8 M4 6 H1.6 M1.6 6 L2.6 5.2 M1.6 6 L2.6 6.8" fill="none" stroke="#ff9d3d" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // a sword tapping a knight's shoulder
  bw3_field_knighting: (
    <Gl>
      <path d="M2.8 8 C2.8 5.4 3.8 4 5.4 3.2 L5 1.6 L6.4 2.6 C7.1 3.2 7.3 4.2 6.9 5.1 L5.8 4.8 C6.1 6.4 6 7 6.6 8 Z" fill="#cdd6ff" stroke="#22304a" strokeWidth="0.4" {...SJ} />
      <path d="M8.6 1 L4.6 5" stroke="#8a94a8" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M8.6 1 L7.6 1.4 L8.2 2 Z" fill="#e8dcc0" stroke="#5a6b8f" strokeWidth="0.3" {...SJ} />
    </Gl>
  ),
  // a queen ringed by escort dots
  bw3_praetorian: (
    <Gl>
      <path d="M3.2 7.6 L2.6 4 L3.9 5.2 L5 3.2 L6.1 5.2 L7.4 4 L6.8 7.6 Z" fill="#e3d0ff" stroke="#2a1030" strokeWidth="0.4" {...SJ} />
      <circle cx="1.4" cy="5" r="0.7" fill="#8f2bbf" />
      <circle cx="8.6" cy="5" r="0.7" fill="#8f2bbf" />
      <circle cx="5" cy="9.2" r="0.7" fill="#8f2bbf" />
    </Gl>
  ),
  // a field medal star
  bw3_battlefield_commission: (
    <Gl>
      <path d="M3.6 1.4 H6.4 L5.6 4 H4.4 Z" fill="#6a7a3a" stroke="#2a3016" strokeWidth="0.4" {...SJ} />
      <path d="M5 3.6 L6 6 L8.4 6 L6.5 7.6 L7.2 10 L5 8.6 L2.8 10 L3.5 7.6 L1.6 6 L4 6 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // a crown with a knight's L escape path
  bw3_royal_caper: (
    <Gl>
      <path d="M2 4.6 L1.6 2 L3 3.2 L4.2 1.2 L5.4 3.2 L6.8 2 L6.4 4.6 Z" fill="#6fe3ff" stroke="#1c1c2a" strokeWidth="0.4" {...SJ} />
      <path d="M4.2 5.2 V8 H8 M8 8 L6.8 7 M8 8 L6.8 9" fill="none" stroke="#6fe3ff" strokeWidth="0.6" {...SJ} />
    </Gl>
  ),
  // coins dropping into a ledger
  bw3_plunderers_ledger: (
    <Gl>
      <rect x="1.4" y="4.4" width="7.2" height="4.8" rx="0.6" fill="#e8dcc0" stroke="#3a2a16" strokeWidth="0.45" />
      <path d="M2.6 6 H7.4 M2.6 7.4 H6" stroke="#8a6a3a" strokeWidth="0.4" strokeLinecap="round" />
      <circle cx="4" cy="2.2" r="1.2" fill="#ffd76a" stroke="#3a2a16" strokeWidth="0.4" />
      <circle cx="6.4" cy="2.8" r="1" fill="#ffe9b0" stroke="#3a2a16" strokeWidth="0.35" />
    </Gl>
  ),
  // a crown landing over a leaping dial
  bw3_coronation_bonus: (
    <Gl>
      <path d="M2.4 3.6 L2 1.4 L3.2 2.4 L4.4 0.8 L5.6 2.4 L6.8 1.4 L6.4 3.6 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <circle cx="6.4" cy="6.6" r="2.6" fill="#2a1c08" stroke="#ffd76a" strokeWidth="0.5" />
      <path d="M6.4 6.6 V4.6 M6.4 6.6 L8 6.6" stroke="#ffd76a" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a grave-lantern lifted at the last tick
  bw3_eleventh_hour: (
    <Gl>
      <path d="M3.4 2.4 H6.6 L6 4 H4 Z M3 4 H7 V9 H3 Z" fill="#1c0f18" stroke="#e3d0ff" strokeWidth="0.5" {...SJ} />
      <circle cx="5" cy="6.4" r="1.8" fill="#e3d0ff" />
      <path d="M5 0.8 V2.2" stroke="#e3d0ff" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a milestone line painted down a file
  bw3_kings_road: (
    <Gl>
      <path d="M5 1 V9" stroke="#ffe9b0" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="1.6 1.2" />
      <rect x="6.6" y="3.4" width="2.2" height="1.8" rx="0.3" fill="#8a7a4a" stroke="#3a3222" strokeWidth="0.3" />
    </Gl>
  ),
  // a minor hammered up to a rook on the anvil
  bw3_ironwrights_bargain: (
    <Gl>
      <path d="M2 6 H8 C7.4 7.4 5.6 8 4.6 8 L5 9.4 H3 L3.4 8 C2.4 8 2.6 7.4 2 6 Z" fill="#4a3a22" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <path d="M3.6 5 H4.6 V3.8 H5.4 V5 H6.2 V3.8 H7 V5 H6.6 L6.4 1.6 H3.8 L3.6 5 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // a rook drilling through a tunnel arch
  bw3_tunnelers: (
    <Gl>
      <path d="M1 9 V4.4 C1 1.8 9 1.8 9 4.4 V9" fill="none" stroke="#9fd8ff" strokeWidth="0.6" {...SJ} />
      <path d="M3.6 9 V4.6 H3.2 V3.2 H4 V3.9 H4.6 V3.2 H5.4 V3.9 H6 V3.2 H6.8 V4.6 H6.4 V9 Z" fill="#5a6b8f" stroke="#1c2438" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // a flag planted deep, a jumping dial
  bw3_deep_position: (
    <Gl>
      <path d="M3 1 V9" stroke="#16302a" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M3 1.4 H7 L6 2.8 L7 4.2 H3 Z" fill="#a8e0c0" stroke="#16302a" strokeWidth="0.4" {...SJ} />
      <circle cx="6.6" cy="7" r="2" fill="#16302a" stroke="#a8e0c0" strokeWidth="0.4" />
      <path d="M6.6 7 V5.6 M6.6 7 L7.8 7" stroke="#a8e0c0" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // a falling piece scattering reroll motes upward
  bw3_martyrs_gift: (
    <Gl>
      <path d="M3.4 9 C3.4 6.6 4.2 5.6 5 5.6 C5.8 5.6 6.6 6.6 6.6 9 Z" fill="#ffd0d8" stroke="#2b1820" strokeWidth="0.4" {...SJ} />
      <circle cx="5" cy="4.6" r="1.1" fill="#ffd0d8" stroke="#2b1820" strokeWidth="0.35" />
      <path d="M2 4 L2.6 2.4 M5 2.6 L5 1 M8 4 L7.4 2.4" stroke="#ff9d9d" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a pawn sentry with a signal light
  bw3_watchword: (
    <Gl>
      <circle cx="4" cy="5" r="1.4" fill="#cde8a8" stroke="#22301a" strokeWidth="0.4" />
      <path d="M2.6 9 L3.3 6.4 H4.7 L5.4 9 Z" fill="#cde8a8" stroke="#22301a" strokeWidth="0.4" {...SJ} />
      <path d="M6 3.4 L8.4 2 M6.4 5 L8.8 4.6 M6.2 6.6 L8.4 7.4" stroke="#a8d878" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a consecration circle with a cross
  bw3_hallowed_ground: (
    <Gl>
      <circle cx="5" cy="5.4" r="3.6" fill="#fff2c0" stroke="#4a3a1a" strokeWidth="0.45" />
      <circle cx="5" cy="5.4" r="2.2" fill="none" stroke="#c9b84c" strokeWidth="0.4" strokeDasharray="1.2 0.9" />
      <path d="M5 3.2 V7.6 M2.8 5.4 H7.2" stroke="#c9b84c" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // half bishop, half knight
  bw3_second_face: (
    <Gl>
      <path d="M5 1 C6.4 2 7 3.4 7 4.6 C7 5.8 6.2 6.6 5 6.6 V1 Z" fill="#c9b0e8" stroke="#1c0f28" strokeWidth="0.4" {...SJ} />
      <path d="M5 6.6 C3.8 6.6 3 5.8 3 4.6 C3 3 4 2 5 1 Z" fill="#6b4a8f" stroke="#1c0f28" strokeWidth="0.4" {...SJ} />
      <path d="M3.4 9 H6.6 L6 7.2 H4 Z" fill="#8f6bc0" stroke="#1c0f28" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // a piece arrow rushing to the crown
  bw3_rally_royal: (
    <Gl>
      <path d="M6.2 2.2 L5.8 0.4 L6.8 1.2 L7.6 0 L8.4 1.2 L9.4 0.4 L9 2.2 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.3" transform="translate(-1.6 1.2)" {...SJ} />
      <path d="M1 6.4 H6.4 M6.4 6.4 L5 5.2 M6.4 6.4 L5 7.6" fill="none" stroke="#ffd76a" strokeWidth="0.7" {...SJ} />
    </Gl>
  ),
  // three cards, one starred apex
  bw3_futures_market: (
    <Gl>
      <rect x="1" y="3" width="2.6" height="4.6" rx="0.5" fill="#2a1c08" stroke="#8a6a2a" strokeWidth="0.35" transform="rotate(-12 2.3 5.3)" />
      <rect x="6.4" y="3" width="2.6" height="4.6" rx="0.5" fill="#2a1c08" stroke="#8a6a2a" strokeWidth="0.35" transform="rotate(12 7.7 5.3)" />
      <rect x="3.6" y="2.4" width="2.8" height="5" rx="0.5" fill="#ffd76a" stroke="#8a6a2a" strokeWidth="0.4" />
      <path d="M5 3.6 L5.5 4.9 L6.9 4.9 L5.8 5.8 L6.2 7.1 L5 6.3 L3.8 7.1 L4.2 5.8 L3.1 4.9 L4.5 4.9 Z" fill="#8a6a2a" />
    </Gl>
  ),
  // a tower under crossing arrows
  bw3_castle_in_the_storm: (
    <Gl>
      <path d="M3.6 9 L4.2 4 H5.8 L6.4 9 Z M3.4 4 H6.6 M4 4 V2.4 H4.8 V3.2 H5.2 V2.4 H6 V4" fill="none" stroke="#cdd6ff" strokeWidth="0.5" {...SJ} />
      <path d="M1 1 L3.2 3.2 M9 1 L6.8 3.2" stroke="#4a5a7a" strokeWidth="0.6" strokeLinecap="round" />
    </Gl>
  ),
  // three faint mustered pawns
  bw3_last_muster: (
    <Gl>
      {[2.4, 5, 7.6].map((cx, i) => (
        <g key={cx} opacity={0.8 - i * 0.12}>
          <circle cx={cx} cy="3.6" r="1.1" fill="#e8dcc0" stroke="#2a2216" strokeWidth="0.35" />
          <path d={`M${cx - 1.2} 9 L${cx - 0.5} 5.6 H${cx + 0.5} L${cx + 1.2} 9 Z`} fill="#e8dcc0" stroke="#2a2216" strokeWidth="0.35" {...SJ} />
        </g>
      ))}
    </Gl>
  ),
  // a pyre flame ringed by a blast
  bw3_funeral_pyre: (
    <Gl>
      <circle cx="5" cy="5.4" r="4.2" fill="none" stroke="#ff9d3d" strokeWidth="0.5" strokeDasharray="1.6 1.1" />
      <path d="M5 1.4 C7 3.8 7.4 5.6 5 8.4 C2.6 5.6 3 3.8 5 1.4 Z" fill="#ff9d3d" stroke="#8a3a1a" strokeWidth="0.4" {...SJ} />
      <path d="M5 3.6 C6 4.8 6 6 5 7.2 C4 6 4 4.8 5 3.6 Z" fill="#ffe9b0" />
    </Gl>
  ),
  // a mountaintop with a claimed flag
  bw3_vantage_point: (
    <Gl>
      <path d="M1 8.6 L4 3.4 L5.6 6 L7 3.8 L9 8.6 Z" fill="#5a7a8f" stroke="#1c2a34" strokeWidth="0.45" {...SJ} />
      <path d="M4 3.4 V1 M4 1.4 H6.4 L5.6 2.4 L6.4 3.4 H4" fill="none" stroke="#cde8ff" strokeWidth="0.45" {...SJ} />
    </Gl>
  ),
  // a carnival mask, two halves
  bw3_mummers_dance: (
    <Gl>
      <path d="M1.4 3 C3 2 5 2 5 3.6 C5 6 3.4 8 2.6 8 C1.8 8 1.4 5.6 1.4 3 Z" fill="#c9b0e8" stroke="#1c0f28" strokeWidth="0.4" {...SJ} />
      <path d="M5 3.6 C5 2 7 2 8.6 3 C8.6 5.6 8.2 8 7.4 8 C6.6 8 5 6 5 3.6 Z" fill="#6b4a8f" stroke="#1c0f28" strokeWidth="0.4" {...SJ} />
      <circle cx="2.8" cy="3.8" r="0.5" fill="#1c0f28" />
      <circle cx="7.2" cy="3.8" r="0.5" fill="#e3d0ff" />
    </Gl>
  ),
  // a shield under a dome of safety
  bw3_last_stand: (
    <Gl>
      <path d="M1.4 3.6 C1.4 1.2 8.6 1.2 8.6 3.6" fill="none" stroke="#ffe9b0" strokeWidth="0.5" strokeDasharray="1.2 0.9" />
      <path d="M3 3.8 H7 V6.4 C7 8.4 5 9.4 5 9.4 C5 9.4 3 8.4 3 6.4 Z" fill="#5a6b8f" stroke="#1c2438" strokeWidth="0.45" {...SJ} />
      <path d="M5 4.4 V8.8" stroke="#ffe9b0" strokeWidth="0.35" strokeLinecap="round" />
    </Gl>
  ),
  // a die and a card, all on the table
  bw3_high_stakes: (
    <Gl>
      <rect x="1.4" y="2.6" width="4.4" height="5.6" rx="0.6" fill="#ffd76a" stroke="#2a1c08" strokeWidth="0.4" transform="rotate(-10 3.6 5.4)" />
      <rect x="5" y="4.4" width="3.6" height="3.6" rx="0.8" fill="#e8dcc0" stroke="#4a3a22" strokeWidth="0.4" transform="rotate(14 6.8 6.2)" />
      <circle cx="6.4" cy="5.8" r="0.5" fill="#4a3a22" />
      <circle cx="7.6" cy="7" r="0.5" fill="#4a3a22" />
    </Gl>
  ),
  // a piece rising from a phoenix flame
  bw3_from_the_ashes: (
    <Gl>
      <path d="M2 8.8 C1.4 5.4 3 2.8 5 2.8 C7 2.8 8.6 5.4 8 8.8 C6 7.6 4 7.6 2 8.8 Z" fill="#7a3a2a" stroke="#ff9d3d" strokeWidth="0.4" {...SJ} />
      <path d="M5 6.4 C6 5 6 3.4 5 1.4 C4 3.4 4 5 5 6.4 Z" fill="#ff9d3d" />
      <path d="M3.4 4 L2.6 2.8 M6.6 4 L7.4 2.8" stroke="#ffb877" strokeWidth="0.45" strokeLinecap="round" />
    </Gl>
  ),
  // crossed guards between two crowns
  bw3_kingsguard_duel: (
    <Gl>
      <path d="M1.2 1.6 L3.6 1.2 L3.2 2.8 Z M8.8 1.6 L6.4 1.2 L6.8 2.8 Z" fill="#5a6b8f" stroke="#22283a" strokeWidth="0.3" {...SJ} />
      <path d="M2.4 4 L7.6 9 M7.6 4 L2.4 9" stroke="#ff9d9d" strokeWidth="0.7" strokeLinecap="round" />
    </Gl>
  ),
  // a crown safe inside a dome
  bw3_kings_sanctuary: (
    <Gl>
      <path d="M1 8.6 C1 3.6 9 3.6 9 8.6" fill="rgba(90,143,192,0.2)" stroke="#dfe8ff" strokeWidth="0.5" {...SJ} />
      <path d="M3 8.6 L2.6 5.4 L3.9 6.6 L5 4.6 L6.1 6.6 L7.4 5.4 L7 8.6 Z" fill="#dfe8ff" stroke="#1c2a44" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // one minor shattering into two answering strikes
  bw3_martyrdom: (
    <Gl>
      <path d="M5 2 L4 4.6 L5 6 L4.4 8.4" fill="none" stroke="#ffd0d8" strokeWidth="0.7" {...SJ} />
      <path d="M1.4 5 L3.4 4.4 M1.6 6.6 L3.6 6.2 M8.6 5 L6.6 4.4 M8.4 6.6 L6.4 6.2" stroke="#c98a98" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // a knight and bishop struck through
  bw3_the_reckoning: (
    <Gl>
      <path d="M1.6 7.4 C1.6 5.2 2.4 4.2 3.6 3.6 L3.2 2.4 L4.4 3.2 C4.9 3.7 5 4.4 4.7 5 L3.8 4.8 C4 6 4 6.6 4.4 7.4 Z" fill="#c9c9cf" stroke="#12121a" strokeWidth="0.35" {...SJ} />
      <path d="M7 2.4 C8 3.4 8.4 4.4 8.4 5.2 C8.4 6.2 7.8 6.8 7 6.8 C6.2 6.8 5.6 6.2 5.6 5.2 C5.6 4.4 6 3.4 7 2.4 Z" fill="#c9c9cf" stroke="#12121a" strokeWidth="0.35" {...SJ} />
      <path d="M1 9 L9 2" stroke="#ff5a5a" strokeWidth="0.7" strokeLinecap="round" />
    </Gl>
  ),
  // an eternal return loop
  bw3_covenant_of_return: (
    <Gl>
      <path d="M3.4 5 C3.4 3 6.6 3 6.6 5 C6.6 7 3.4 7 3.4 5 Z" fill="none" stroke="#e3d0ff" strokeWidth="0.8" />
      <path d="M5 3 C1.6 3 1.6 7 5 7 C8.4 7 8.4 3 5 3 Z" fill="none" stroke="#8f6bff" strokeWidth="0.5" strokeDasharray="1.4 1" />
      <path d="M6.6 4.6 L7.4 4 L7.6 5" fill="none" stroke="#e3d0ff" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // veterans marching home under a tent-banner
  bw3_the_homecoming: (
    <Gl>
      <path d="M1.4 4 L5 1 L8.6 4 Z" fill="#6a5a3a" stroke="#ffe9b0" strokeWidth="0.4" {...SJ} />
      <path d="M2 8.4 H8 M8 8.4 L6.8 7.6 M8 8.4 L6.8 9.2" fill="none" stroke="#ffe9b0" strokeWidth="0.6" {...SJ} />
      <path d="M3 8 L3.4 5.8 H4.4 L4.8 8 Z" fill="#ffe9b0" stroke="#2a2216" strokeWidth="0.35" {...SJ} />
    </Gl>
  ),
  // a wave surging with an up arrow
  bw3_turn_the_tide: (
    <Gl>
      <path d="M1 7 C2.2 5.8 3 5.8 4.2 7 C5.4 8.2 6.2 8.2 7.4 7 C8 6.4 8.6 6.4 9 6.8" fill="none" stroke="#a8e0e8" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M5 5.6 V1 M5 1 L3.4 2.6 M5 1 L6.6 2.6" fill="none" stroke="#a8e0e8" strokeWidth="0.7" {...SJ} />
    </Gl>
  ),
  // a queen crowned in a pillar of light
  bw3_pretender: (
    <Gl>
      <path d="M3.4 1 H6.6 L6 9 H4 Z" fill="rgba(255,215,106,0.35)" stroke="#ffd76a" strokeWidth="0.35" {...SJ} />
      <path d="M3.6 6 L3 3 L4.1 4.2 L5 2.4 L5.9 4.2 L7 3 L6.4 6 Z" fill="#ffd76a" stroke="#8a6a2a" strokeWidth="0.4" {...SJ} />
      <path d="M4 6.4 H6 L6.2 8.6 H3.8 Z" fill="#ffe9b0" stroke="#8a6a2a" strokeWidth="0.35" {...SJ} />
    </Gl>
  ),
  // a river line splitting the board, two eviction arrows
  bw3_drive_them_out: (
    <Gl>
      <path d="M5 0.8 V9.2" stroke="#bfe0e8" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M4 3 H1.4 M1.4 3 L2.6 2.2 M1.4 3 L2.6 3.8" fill="none" stroke="#3a5a6a" strokeWidth="0.6" {...SJ} />
      <path d="M6 7 H8.6 M8.6 7 L7.4 6.2 M8.6 7 L7.4 7.8" fill="none" stroke="#3a5a6a" strokeWidth="0.6" {...SJ} />
    </Gl>
  ),
};

/* =============================================================================
   Registry — one entry per wave-2 boon. Templates carry a unique flourish per
   card; the tier 7-8 flagships are bespoke scenes.
   ========================================================================== */

/** Bind a template + palette + glyph + config into a SigPlugin entry; the
 * trailing `flourish` keys the card's own dressing block in the template. */
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
    Render: function BoonPlayRender({ lead, role, delayMs }: { lead: boolean; role: SigRole; delayMs: number }) {
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

/** Bind a bespoke scene (tier 7-8 flagships) into a SigPlugin entry. */
function S(Scene: ComponentType<SceneProps>, config: SigPlugin["config"]): SigPlugin {
  return {
    config,
    Render: function BoonSceneRender({ lead, role, delayMs }: { lead: boolean; role: SigRole; delayMs: number }) {
      return <Scene lead={lead} role={role} delayMs={delayMs} />;
    },
  };
}

export const PLAYS: Record<string, SigPlugin> = {
  /* --- FalconDash (raids / escapes / duels) ------------------------------- */
  bw2_ancient_custom: G(FalconDash, ["#8a6a3a", "#e8dcc0", "#4a3a22"], GLYPH.bw2_ancient_custom, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "blitz",
    anchor: "cast",
  }, "passant"),
  bw2_hit_and_run: G(FalconDash, ["#ff9d3d", "#ffd166", "#3a1c12"], GLYPH.bw2_hit_and_run, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz",
    anchor: "cast",
  }, "raid"),
  bw2_cornered_king: G(FalconDash, ["#5a6b8f", "#6fe3ff", "#1c1c2a"], GLYPH.bw2_cornered_king, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "blitz",
    anchor: "cast",
  }, "cornered"),
  bw2_blood_duel: G(FalconDash, ["#c94a3a", "#ffb454", "#2b1218"], GLYPH.bw2_blood_duel, {
    ordering: "radial", staggerMs: 60, victims: ["n", "b", "r"], hasLead: true, sound: "siege",
    anchor: "board",
  }, "duel"),

  /* --- DawnHalo (miracles / wards / oaths) -------------------------------- */
  bw2_divine_right: G(DawnHalo, ["#ffd76a", "#ffe9b0", "#4a3a22"], GLYPH.bw2_divine_right, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "cathedral",
    anchor: "board",
  }, "edict"),
  // The banner plants where a piece CROSSES, one piece at a time, so the scene
  // belongs on that square rather than in the middle of the board. Safe to
  // anchor: DawnHalo's only board-scale layer is <Wash>, which is inside
  // <BoardFrame>, and the "banner" flourish is composed about the stage centre.
  bw2_pioneers_banner: G(DawnHalo, ["#7c8a4a", "#ffd166", "#3a3526"], GLYPH.bw2_pioneers_banner, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis",
    anchor: "cast",
  }, "banner"),
  bw2_diplomatic_immunity: S(DiplomaticImmunityScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis",
    anchor: "cast",
  }),
  bw2_deathless_oath: S(DeathlessOathScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral",
    anchor: "cast",
  }),

  /* --- Reliquary (spoils / exchanges / inheritances) ---------------------- */
  bw2_spoils_of_war: S(SpoilsOfWarScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", source: "summon",
    anchor: "cast",
  }),
  bw2_prisoner_exchange: S(PrisonerExchangeScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cathedral", source: "summon",
    anchor: "cast",
  }),
  bw2_highwaymans_toll: G(Reliquary, ["#c9a84c", "#ffd76a", "#2a1c08"], GLYPH.bw2_highwaymans_toll, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation",
    anchor: "board",
  }, "toll"),
  bw2_queens_testament: G(Reliquary, ["#8f2bbf", "#e3d0ff", "#2a1030"], GLYPH.bw2_queens_testament, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "cathedral", source: "summon",
    anchor: "aim",
  }, "testament"),

  /* --- AstralAnvil (makings and remakings) -------------------------------- */
  bw2_scarecrow: G(AstralAnvil, ["#8a7a63", "#c9a84c", "#3a3026"], GLYPH.bw2_scarecrow, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall", source: "summon",
    anchor: "cast",
  }, "strawman"),
  bw2_masquerade: S(MasqueradeScene, {
    ordering: "radial", staggerMs: 60, victims: ["n", "b", "r", "q"], hasLead: true, sound: "shades",
    anchor: "aim",
  }),
  bw2_alchemists_trade: S(AlchemistsTradeScene, {
    ordering: "radial", staggerMs: 60, victims: ["n", "b", "r", "q"], hasLead: true, sound: "coronation",
    anchor: "aim",
  }),
  bw2_early_coronation: S(EarlyCoronationScene, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true, sound: "coronation",
    anchor: "cast",
  }),
  bw2_standard_bearer: G(AstralAnvil, ["#c94ad1", "#e3d0ff", "#5b2b8f"], GLYPH.bw2_standard_bearer, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall",
    anchor: "board",
  }, "standard"),

  /* --- PactScroll (bargains / vows / court rules) ------------------------- */
  bw2_ascetics_bargain: G(PactScroll, ["#8a7a63", "#e8dcc0", "#3a3026"], GLYPH.bw2_ascetics_bargain, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
    anchor: "board",
  }, "fasting"),
  bw2_jesters_rule: G(PactScroll, ["#c94ad1", "#ffd76a", "#2a1030"], GLYPH.bw2_jesters_rule, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
    anchor: "board",
  }, "motley"),
  bw2_blood_price: G(PactScroll, ["#6b1a2a", "#e8b04b", "#2b1218"], GLYPH.bw2_blood_price, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
    anchor: "cast",
  }, "bloodseal"),

  /* --- Tier 7-8 bespoke scenes -------------------------------------------- */
  bw2_kingmakers_pact: S(KingmakerScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain",
    anchor: "board",
  }),
  bw2_bolt_hole: S(BoltHoleScene, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "blitz",
    anchor: "cast",
  }),
  bw2_carnival_of_masks: S(CarnivalScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "nova",
    anchor: "board",
  }),
  bw2_restitution: S(RestitutionScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "colossus", source: "summon",
    anchor: "aim",
  }),
  bw2_long_truce: S(LongTruceScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cathedral", source: "shield",
    anchor: "board",
  }),
  bw2_great_return: S(GreatReturnScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "crownrain", source: "summon",
    anchor: "board",
  }),
  bw2_shadow_reserve: S(ShadowReserveScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
    anchor: "cast",
  }),
  bw2_eternal_keep: S(EternalKeepScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall",
    anchor: "board",
  }),

  /* === WAVE 3 ============================================================== */

  /* --- FalconDash (movement / relocation / footwork) ---------------------- */
  bw3_forced_march: G(FalconDash, ["#7c8a4a", "#ffd166", "#3a3526"], GLYPH.bw3_forced_march, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true, sound: "blitz",
    anchor: "board",
  }, "march2"),
  bw3_royal_caper: G(FalconDash, ["#5a6b8f", "#6fe3ff", "#1c1c2a"], GLYPH.bw3_royal_caper, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "blitz",
    anchor: "cast",
  }, "caper"),
  bw3_tunnelers: G(FalconDash, ["#5a6b8f", "#9fd8ff", "#1c2438"], GLYPH.bw3_tunnelers, {
    ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "blitz",
    anchor: "cast",
  }, "tunnel"),
  bw3_rally_royal: G(FalconDash, ["#5a6b8f", "#ffd76a", "#22304a"], GLYPH.bw3_rally_royal, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz",
    anchor: "aim",
  }, "rally"),
  bw3_underdogs_gambit: G(FalconDash, ["#8a3a2a", "#ff9d3d", "#2b1410"], GLYPH.bw3_underdogs_gambit, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "siege",
    anchor: "board",
  }, "sidejab"),

  /* --- DawnHalo (relational wards / protection) --------------------------- */
  bw3_bishops_blessing: G(DawnHalo, ["#5a8fc0", "#dfe8ff", "#22406b"], GLYPH.bw3_bishops_blessing, {
    ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "aegis", source: "shield",
    anchor: "board",
  }, "b3ward"),
  bw3_shield_wall: G(DawnHalo, ["#4a7a5a", "#bfe6c8", "#1c3a2a"], GLYPH.bw3_shield_wall, {
    ordering: "radial", staggerMs: 60, victims: ["p"], hasLead: true, sound: "aegis", source: "shield",
    anchor: "board",
  }, "phalanx3"),
  bw3_kings_shield: G(DawnHalo, ["#5a6b8f", "#ffd76a", "#1c2438"], GLYPH.bw3_kings_shield, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "aegis", source: "shield",
    anchor: "cast",
  }, "kingfront"),
  bw3_praetorian: G(DawnHalo, ["#8f2bbf", "#e3d0ff", "#2a1030"], GLYPH.bw3_praetorian, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "aegis", source: "shield",
    anchor: "cast",
  }, "praetor"),
  bw3_watchword: S(WatchwordScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis", source: "shield",
    anchor: "aim",
  }),
  bw3_vantage_point: S(VantagePointScene, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "aegis", source: "shield",
    anchor: "board",
  }),
  bw3_hallowed_ground: S(HallowedGroundScene, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "cathedral", source: "kingSafe",
    anchor: "cast",
  }),

  /* --- Reliquary (grants / economy / self-clock payouts) ------------------ */
  bw3_first_blood: G(Reliquary, ["#7a2030", "#ff9d9d", "#2b1218"], GLYPH.bw3_first_blood, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz",
    anchor: "board",
  }, "firstblood"),
  bw3_postern_gate: G(Reliquary, ["#5a6b8f", "#cdd6ff", "#1c1c2a"], GLYPH.bw3_postern_gate, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "aegis",
    anchor: "board",
  }, "postern"),
  bw3_coronation_bonus: G(Reliquary, ["#c9a84c", "#ffd76a", "#2a1c08"], GLYPH.bw3_coronation_bonus, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation",
    anchor: "board",
  }, "coronclock"),
  bw3_plunderers_ledger: G(Reliquary, ["#8a6a3a", "#e8dcc0", "#3a2a16"], GLYPH.bw3_plunderers_ledger, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
    anchor: "board",
  }, "ledger"),
  bw3_eleventh_hour: G(Reliquary, ["#5b2b8f", "#e3d0ff", "#1c0f18"], GLYPH.bw3_eleventh_hour, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "cathedral", source: "summon",
    anchor: "cast",
  }, "eleventh"),
  bw3_deep_position: G(Reliquary, ["#3a6b5a", "#a8e0c0", "#16302a"], GLYPH.bw3_deep_position, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz",
    anchor: "board",
  }, "deeptime"),
  bw3_martyrs_gift: G(Reliquary, ["#8a4a5a", "#ffd0d8", "#2b1820"], GLYPH.bw3_martyrs_gift, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
    anchor: "board",
  }, "martyrgift"),

  /* --- AstralAnvil (transformations / promotions in place) ---------------- */
  bw3_heir_apparent: G(AstralAnvil, ["#8a6a3a", "#ffd76a", "#3a2a16"], GLYPH.bw3_heir_apparent, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", source: "empower",
    anchor: "cast",
  }, "heir"),
  bw3_field_knighting: G(AstralAnvil, ["#5a6b8f", "#cdd6ff", "#22304a"], GLYPH.bw3_field_knighting, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", source: "empower",
    anchor: "cast",
  }, "knighting"),
  bw3_battlefield_commission: G(AstralAnvil, ["#6a7a3a", "#ffd76a", "#2a3016"], GLYPH.bw3_battlefield_commission, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", source: "empower",
    anchor: "cast",
  }, "commission"),
  bw3_ironwrights_bargain: G(AstralAnvil, ["#c9a84c", "#ffd76a", "#4a3a22"], GLYPH.bw3_ironwrights_bargain, {
    ordering: "radial", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "coronation", source: "empower",
    anchor: "board",
  }, "ironwright"),
  bw3_second_face: G(AstralAnvil, ["#6b4a8f", "#c9b0e8", "#1c0f28"], GLYPH.bw3_second_face, {
    ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "coronation", source: "empower",
    anchor: "cast",
  }, "archbishop"),

  /* --- PactScroll (draft bets / decrees / terrain / summons) -------------- */
  bw3_home_guard: S(HomeGuardScene, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "wall",
    anchor: "board",
  }),
  bw3_double_down: G(PactScroll, ["#8a5a2a", "#ffd76a", "#2a1c0e"], GLYPH.bw3_double_down, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "shades",
    anchor: "board",
  }, "doubledown"),
  bw3_kings_road: G(PactScroll, ["#8a7a4a", "#ffe9b0", "#3a3222"], GLYPH.bw3_kings_road, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "wall",
    anchor: "board",
  }, "kingsroad"),
  bw3_futures_market: G(PactScroll, ["#8a6a2a", "#ffd76a", "#2a1c08"], GLYPH.bw3_futures_market, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "crownrain",
    anchor: "board",
  }, "futures"),
  bw3_castle_in_the_storm: G(PactScroll, ["#4a5a7a", "#cdd6ff", "#1c2436"], GLYPH.bw3_castle_in_the_storm, {
    ordering: "radial", staggerMs: 0, victims: ["k", "r"], hasLead: true, sound: "wall",
    anchor: "board",
  }, "stormcastle"),
  bw3_last_muster: G(PactScroll, ["#7a6a4a", "#e8dcc0", "#2a2216"], GLYPH.bw3_last_muster, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true, sound: "wall", source: "summon",
    anchor: "aim",
  }, "muster"),
  bw3_funeral_pyre: S(FuneralPyreScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "atomic",
    anchor: "board",
  }),

  /* --- Tier 7-8 bespoke scenes -------------------------------------------- */
  bw3_mummers_dance: S(MummersDanceScene, {
    ordering: "radial", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "shades", source: "empower",
    anchor: "board",
  }),
  bw3_last_stand: S(LastStandScene, {
    ordering: "radial", staggerMs: 40, victims: "all", hasLead: true, sound: "cathedral", source: "shield",
    anchor: "board",
  }),
  bw3_high_stakes: S(HighStakesScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "blitz",
    anchor: "board",
  }),
  bw3_from_the_ashes: S(FromTheAshesScene, {
    ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "crownrain", source: "summon",
    anchor: "board",
  }),
  bw3_kingsguard_duel: S(KingsguardDuelScene, {
    ordering: "radial", staggerMs: 60, victims: ["n", "b", "p"], hasLead: true, sound: "siege",
    anchor: "aim",
  }),
  bw3_kings_sanctuary: S(KingsSanctuaryScene, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "coronation", source: "kingSafe",
    anchor: "aim",
  }),
  bw3_martyrdom: S(MartyrdomScene, {
    ordering: "radial", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "siege",
    anchor: "aim",
  }),
  bw3_the_reckoning: S(ReckoningScene, {
    ordering: "sweep", staggerMs: 65, victims: ["n", "b"], hasLead: true, sound: "extinction",
    anchor: "board",
  }),
  bw3_covenant_of_return: S(CovenantScene, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cathedral", source: "summon",
    anchor: "board",
  }),
  bw3_the_homecoming: S(HomecomingScene, {
    // Exactly two pieces come back (the best captured major and the best
    // captured minor), so the return is a pair of arrivals rather than a
    // board-wide event. The rule is right about this one.
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "crownrain", source: "summon",
    anchor: "aim",
  }),
  bw3_turn_the_tide: S(TurnTheTideScene, {
    ordering: "sweep", staggerMs: 45, victims: ["p"], hasLead: true, sound: "siege",
    anchor: "board",
  }),
  bw3_pretender: S(PretenderScene, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "coronation", source: "summon",
    anchor: "cast",
  }),
  bw3_drive_them_out: S(DriveThemOutScene, {
    ordering: "sweep", staggerMs: 45, victims: "all", hasLead: true, sound: "rampage",
    anchor: "board",
  }),
};
