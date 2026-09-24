// God-tier plugin signatures (tier 7+ spectacle upgrades). See sigPlugins.tsx
// for the contract. Self-contained: own SVG, own CSS (godPlays.css),
// transform/opacity only. Do NOT import from BoardEffects.tsx.
//
// Every play here is a divine EVENT in the LivingGodBurst mould:
//   build-up      — board-wide tinted wash + a fan of god-rays / gathering dark
//   manifestation — a COLOSSAL central SVG entity enters the board
//   climax        — touchdown flare + spark burst + shockwave ring(s) that
//                   sweep past the board edges, plus ONE physical SIGNATURE
//                   DEVICE unique to each template (flagship pass: ground
//                   split, hanging debris, forked bolts, jaw snap, dark tear,
//                   banner shadows, gyroscoping ring, frost fog, spark
//                   fountain, petrify scan, board-wide clock ghost)
//   aftermath     — afterglow + drifting ash + slow embers with hang-time
// FLAGSHIP UPGRADE WAVE: every lead scene's stage now QUAKES on its own
// impact beat (shared imp-quake wrapper via Stage's quakeMs - in-scene only,
// never the real board crop), and the templates whose mechanic destroys or
// petrifies pieces (ReaperSweep, SkullStrike) play the
// full impact composite per victim square: the piece silhouette is LASERED
// from above, SPLITS IN HALF, sprays shards and rolls a ground shockwave
// (impact/impact.tsx vocabulary, tinted per card).
// Tier-scaled weight: tier-8 plays add a held rim vignette + one extra
// shockwave over tier-7 (see heavy below); the APEX set pieces letterbox.
// Total length: tier 7 ~2.6-2.9s, tier 8 ~3.0s, apex ~3.5s — all fire-and-
// forget overlays that never block input. Non-lead ("target") renders are
// compact per-square hits (glyph pop + ring + sparks) because zone-fed cards
// mount one overlay per affected square.
//
// THREE TEMPLATES are left, each parameterised by { palette, glyph }:
//   ReaperSweep   — colossal hooded reaper strides, scythe arc across the crop
// and the two apex set pieces listed below. The ten other shared templates
// (a descending deity, a titan, a storm god, a maw, a war host, a rune ring,
// a frost titan, a forge colossus, a gorgon idol, a time lord) were deleted in
// round 3 of slice TC-god once no card played them any more.
// STAGING (geometry contract, see docs/animation-design-brief.md §0). Every
// card declares an anchor, and every anchor here is inside the set
// scripts/lib/anchor-rule.ts derives from the card's own category and rule
// text. That lands the split where the mechanic puts it rather than where the
// art would like it: plays that name a few pieces reach for them ("aim"),
// plays that land on a square or a region play there ("cast"), and the ones
// with no board location at all — drafts, clocks, turn skips, nerf relief —
// plus the genuine whole-army events stay centred ("board"), which for those
// cards is the only truthful staging rather than a compromise.
// The action rides `Stage` (BoardWideStage: the 14-cell canvas, anchored and
// self-clamping); the two layers that genuinely mean "the BOARD" rather than
// "the scene" — the rim vignette and the apex letterbox bars — live inside
// `BoardFrame` so they stay square with the board at any anchor. `Rake` is the
// shared directional layer: the god-light hangs over the board centre, so an
// off-centre landing rakes its shadow outward along --fx-ox / --fx-oy, and the
// per-square `TargetHit` fires in the real victim order (--fx-index) along its
// own leg (--fx-ang / --fx-aim-x / --fx-aim-y / --fx-side).
//
//   SkullStrike   — APEX (tier 9, culling only): death's bowling night — the
//                   skull glyph writ huge bowls the width of the crop, piece-
//                   pins scatter, STRIKE flare + triple shockwave
//   PlanetAlign   — APEX (tier 9, grand_conjunction only): letterbox bars,
//                   three worlds slide into syzygy and a conjunction beam
//                   pierces the board, triple shockwave
//
// CARD -> TEMPLATE / PALETTE / GLYPH table (cards still on a shared template):
//   ReaperSweep   : peace_of_the_grave (lily)
//   SkullStrike   : culling (skull, writ huge and BOWLED)
//   PlanetAlign   : grand_conjunction (triple star as the syzygy sigil)
// Every other card in PLAYS has a scene of its own (named <Card>Scene or an
// older bespoke function) and the templates above keep only these entries.
//
// PER-CARD SCENES (slice TC-god; see the section above the glyphs): cards
// split off the shared templates into a scene that draws their own rule:
//   world_lock (the border chained under a padlock), celestial_alignment
//   (stars on the light squares only), walnut_court (the enemy back rank
//   called to order, shells clamped per piece), scorched_earth (their 4th to
//   6th ranks burn), blighted_furrows (your half's furrows rot, a bramble on
//   the border), sealed_ramparts (portcullis per rook and a three-square
//   leash), transcendence (the nerf's brand lifted away, twenty ticks, three
//   cards), mass_mind_control (twin eyes, threads to the marks, marionette
//   bars on each), buff_plunder (two cards carried across, the locked one
//   stays), absolute_nullify (loose cards crack, the locked one holds, the
//   draft is barred, a reroll die), draft_supremacy (two drafts of card
//   pairs, their one card struck), sealed_archive (their draft stack tied
//   and sealed), poisoned_counsel (venom poured on their next card),
//   sacked_capital (the back rank topples, the pawn rank lights),
//   obsidian_bastions (glass cases per rook, forever, with the crack that
//   frees them), reality_warp (a scan line and a queen per chosen piece),
//   abdication_edict (pins in both home ranks, the crown alone lifts),
//   chisel_curse (a crack one square each way, four and two pips),
//   cockatrice_gaze (your half turns to stone, theirs only mirrors it),
//   molten_heart (attacker and victim melt together, two pips),
//   withered_hands (the reaching hand withers, three pips after a move),
//   checkmate_denial (the king hops clear of the mating blade into its own
//   half, once), draft_tyranny (both draft cards branded VII), full_pardon
//   (a writ, the cuff unlocked, a twelve-hour dial, a stored double step),
//   throne_and_silence (the court gagged but for king and queen, their draft
//   struck), wa_dominate_major (a leash down the aim, the piece's standard
//   turns to the caster's colours), unshackled_wrath (the manacle bursts over
//   fourteen links, their hourglass knocked flat), sovereign_draft (both
//   cards sashed and a tier up, a spyglass on their offer's tier),
//   divine_legion (a queen pocketed, empty squares to drop it on later),
//   absolute_aegis (the home ranks warded, the capturer's shield cracks),
//   great_divide (battlements along the chosen rank, yours step off it),
//   grand_malediction (the turn strikes a hex and comes straight back),
//   age_of_heroes (a lyre's song, a queen's stroke per champion), genesis
//   (a tide wipes the lingering marks, the opening ranks stand up),
//   total_warp (the army folds into portals, the king stays, pawns barred
//   from the end ranks), nerf_reversal (the brand turns on itself, ten
//   ticks, the own half warded one turn), glacial_tomb (ice on their home
//   ranks but the king's square, three walnuts stay), frozen_solid (the
//   freeze waits a move under an hourglass, reaches to the neighbour),
//   dragonslayer (the old blade flies and a reroll is spent, the named
//   piece split where it stands), grand_nullify (a wiper leaves their loose
//   cards as outlines, the locked one holds, a reroll rolls away),
//   queen_storm (the 4th-rank line, a queen then a rook, a third crown
//   struck; the target cut reads the victim order), sundering (each chosen
//   file barred its whole length, then it cracks and falls in),
//   statue_garden (ivy sets into a walnut husk, only the first waits a
//   move), everfrost_shard (the shard and no entry on the eight squares
//   round it), endless_turn (a bonus move, no capture, a second waits),
//   warp_cataclysm (four counted rifts, the king set aside), rift_storm (two
//   blinks, two of theirs trade squares), grand_retreat (the army marches
//   home, a blocked piece stays), full_rewind (five pieces play their moves
//   backwards to home), mind_empire (a halo on the taken piece that slips
//   the moment it captures), crown_and_castle (crown and turret shut in
//   walnuts, one short step), fortress_realm (a walled 3x3, three shields,
//   the king struck, then the walls lie flat), warp_sovereign (up to three
//   counted swap loops, the third only dashed).
// ROUND 3 SCENES (the section before the per-card scenes): the eleven cards
// that still laid a flourish over a shared template now draw their rule too:
//   salted_earth (their pawns balk at a salt line, the diagonal stays open,
//   four pips, the salt lifts), phoenix_line (the firebird skims your pawn
//   rank and a pawn stands up in each ash heap, once), chain_atomic (a
//   capture on your trapped pawn blows the capturer and one neighbour, the
//   king is spared, the spark to the next piece dies), total_atomic (a
//   three by three blast, two thrown, a shield holds, the piece outside the
//   grid is untouched, three bombs), total_plunder (three of their cards
//   ticked and carried into a chest, the locked one refuses), noble_rout
//   (after one grace move their nobles hit a bar and turn back, pawn and
//   king step on), absolute_zero (ice on all but king and pawn, two turns,
//   then a one-square box round each thawed piece), ban_hammer (one knight
//   picked, the other knight found, both struck off under a gavel; bishop
//   and rook stay), leaden_limbs (long rays cut to one square under lead
//   weights), lost_fortnight (their next turn's calendar leaf crossed and
//   torn off, a twenty-second wedge drops out of their dial), sabbatical
//   (the nerf card naps in a hammock for ten ticks, the next draft barred).

import "./godPlays.css";

import { useEffect, useLayoutEffect, useRef, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import type { SigPlugin, SigRole } from "./sigPlugins";
import { AimStage, BoardFrame, BoardWideStage } from "./stage";
import { LaserStrike, PieceShatter, Shockwave, QUAKE_CLASS, impactVars } from "./impact/impact";

/* =============================================================================
   Shared bits
   ========================================================================== */

type Palette = [string, string, string];

interface TemplateProps {
  palette: Palette;
  glyph: ReactNode;
  lead: boolean;
  /** Which beat this render is: the board-scale lead, a per-square target hit,
   * or the card arriving in a hand. `lead` stays as the derived alias the
   * templates were written against. */
  role?: SigRole;
  delayMs: number;
  /** Per-card structural flourish key. Cards sharing a template each pass a
   * unique key that arms a card-specific scene addition inside the template
   * (the flagship beat that makes the card's mechanic legible). Exactly one
   * card per template family runs keyless as the baseline scene. */
  flourish?: string;
  /** The card's live tier (BUFF_BY_ID), bound per entry by `bindTiers`. Drives
   * the tier-8 weight (`heavy`) and the short cut for low tiers (`Tempo`). */
  tier: number;
}

/** hex "#rrggbb" -> the space-separated "r g b" triplet the impact vocabulary
 * (--imp-rgb) tints with. */
function rgbOf(hex: string): string {
  return `${parseInt(hex.slice(1, 3), 16)} ${parseInt(hex.slice(3, 5), 16)} ${parseInt(hex.slice(5, 7), 16)}`;
}

/** hex "#rrggbb" -> rgba() at the given alpha (glow fills, gradients). */
function tint(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Linear mix of two "#rrggbb" colours (t = 0 -> a, t = 1 -> b). Drives the
 * radioactive-green ramp on total_atomic's chain hits. */
function mix(a: string, b: string, t: number): string {
  const ch = (i: number) => {
    const av = parseInt(a.slice(i, i + 2), 16);
    const bv = parseInt(b.slice(i, i + 2), 16);
    return Math.round(av + (bv - av) * t)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${ch(1)}${ch(3)}${ch(5)}`;
}

const SJ = { strokeLinejoin: "round", strokeLinecap: "round" } as const;

/** The oversized-clipped board-wide stage (the overlay mounts inside ONE
 * square; this canvas is ~14 squares wide — the board is the central ~57%).
 *
 * This is `BoardWideStage` now rather than a hand-rolled copy of it, which is
 * what makes anchoring safe: the shared stage carries the at-most-half-a-cell
 * clamp (`--fx-anchor-dx/dy`) that keeps a corner cast's canvas over the whole
 * board. Board-anchored cards get the same box, centred, exactly as before. */
function Stage({ children, quakeMs }: { children: ReactNode; quakeMs?: number }) {
  if (quakeMs == null) return <BoardWideStage>{children}</BoardWideStage>;
  // FLAGSHIP PASS: the whole scene stage JOLTS on its own impact beat (the
  // shared imp-quake wrapper from the impact vocabulary; in-scene only, the
  // real board crop never shakes). quakeMs is absolute like every other delay
  // here (delayMs + offset), converted to the seconds --imp-delay contract.
  return (
    <BoardWideStage>
      <span className={`${QUAKE_CLASS} absolute inset-0 block`} style={impactVars(undefined, quakeMs / 1000)}>
        {children}
      </span>
    </BoardWideStage>
  );
}

/** RAKE — the shared directional layer, and the reason these scenes now point
 * at something. The god-light hangs over the middle of the board, so a landing
 * off-centre throws its shadow OUTWARD, away from the centre: the further from
 * the middle the cast square is, the longer and harder the rake. A board-wide
 * marquee scene sits at the centre by construction, so its rake is neutral,
 * which is the honest answer for a scene with nothing to point at.
 *
 * `lean` / `tip` arrive from the caller as --fx-ox / --fx-oy expressions so the
 * geometry is declared where the scene is composed. */
function Rake({
  delayMs,
  tone,
  lean,
  tip,
  cx = 50,
  cy = 62,
  width = 34,
}: {
  delayMs: number;
  tone: string;
  lean: string;
  tip: string;
  cx?: number;
  cy?: number;
  width?: number;
}) {
  return (
    <span
      className="gp-rake absolute block rounded-full"
      style={
        {
          left: `${cx - width / 2}%`,
          top: `${cy}%`,
          width: `${width}%`,
          height: "5.4%",
          background: `radial-gradient(closest-side, ${tone}, transparent)`,
          "--gp-lean": lean,
          "--gp-tip": tip,
          animationDelay: `${delayMs}ms`,
        } as CSSProperties
      }
    />
  );
}

/** Full-board colour wash. */
function Wash({ color, delayMs }: { color: string; delayMs: number }) {
  return <span className="gp-wash absolute inset-0 block" style={{ background: color, animationDelay: `${delayMs}ms` }} />;
}

/** A shockwave ring bloomed from the board centre, sweeping past the edges. */
function Boom({ delayMs, color, thickness = 3 }: { delayMs: number; color: string; thickness?: number }) {
  return (
    <span
      className="gp-boom absolute block rounded-full"
      style={{
        left: "50%",
        top: "50%",
        height: "70%",
        width: "70%",
        marginLeft: "-35%",
        marginTop: "-35%",
        border: `${thickness}px solid ${color}`,
        animationDelay: `${delayMs}ms`,
      }}
    />
  );
}

/** A burst of flat diamond sparks flying out of the touchdown point. */
const BURST = [
  { dx: "230%", dy: "-260%", rot: "160deg", d: 0 },
  { dx: "-210%", dy: "-230%", rot: "-150deg", d: 14 },
  { dx: "260%", dy: "-90%", rot: "200deg", d: 8 },
  { dx: "-240%", dy: "-120%", rot: "-190deg", d: 22 },
  { dx: "40%", dy: "-320%", rot: "120deg", d: 5 },
  { dx: "130%", dy: "220%", rot: "220deg", d: 18 },
  { dx: "-140%", dy: "200%", rot: "-200deg", d: 11 },
];
function Sparks({
  delayMs,
  fill,
  stroke,
  sizePct = 6,
  cx = 50,
  cy = 54,
}: {
  delayMs: number;
  fill: string;
  stroke: string;
  sizePct?: number;
  cx?: number;
  cy?: number;
}) {
  return (
    <>
      {BURST.map((v, i) => (
        <span
          key={i}
          className="gp-spark absolute block"
          style={
            {
              left: `${cx - sizePct / 2}%`,
              top: `${cy - sizePct / 2}%`,
              width: `${sizePct}%`,
              height: `${sizePct}%`,
              "--dx": v.dx,
              "--dy": v.dy,
              "--rot": v.rot,
              animationDelay: `${delayMs + v.d}ms`,
            } as CSSProperties
          }
        >
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0.6 L9 5 L5 9.4 L1 5 Z" fill={fill} stroke={stroke} strokeWidth="0.7" {...SJ} />
          </svg>
        </span>
      ))}
    </>
  );
}

/** The brief aftermath glint: a four-point star hanging where the god stood. */
function Glint({
  delayMs,
  color,
  left = 46,
  top = 15,
  sizePct = 9,
}: {
  delayMs: number;
  color: string;
  left?: number;
  top?: number;
  sizePct?: number;
}) {
  return (
    <span
      className="gp-glint absolute block"
      style={{ left: `${left}%`, top: `${top}%`, width: `${sizePct}%`, height: `${sizePct}%`, animationDelay: `${delayMs}ms` }}
    >
      <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
        <path d="M5 0 L6.1 3.9 L10 5 L6.1 6.1 L5 10 L3.9 6.1 L0 5 L3.9 3.9 Z" fill={color} />
      </svg>
    </span>
  );
}

/** TELL — the pre-strike anticipation beat every apex scene now opens with:
 * the board dims hard, a rumble line shivers across the ground where the
 * event is about to land, and loose energy converges on the centre. Runs in
 * the first ~450ms, under the template's own build-up wash. */
const GATHER = [
  { dx: "-380%", dy: "-160%", d: 0 },
  { dx: "360%", dy: "-220%", d: 45 },
  { dx: "-300%", dy: "200%", d: 90 },
  { dx: "340%", dy: "160%", d: 135 },
];
function Tell({ hex, delayMs, cy = 52 }: { hex: string; delayMs: number; cy?: number }) {
  return (
    <>
      <span
        className="gp-dim absolute inset-0 block"
        style={{ background: "rgba(6,6,12,0.72)", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="gp-rumble absolute block"
        style={{
          left: "14%",
          top: `${Math.min(cy + 9, 68)}%`,
          width: "72%",
          height: "1.3%",
          background: `linear-gradient(90deg, transparent, ${tint(hex, 0.85)} 28%, ${tint(hex, 0.85)} 72%, transparent)`,
          animationDelay: `${delayMs + 40}ms`,
        }}
      />
      {GATHER.map((g, i) => (
        <span
          key={i}
          className="gp-gather absolute block rounded-full"
          style={
            {
              left: "48.9%",
              top: `${cy - 1.1}%`,
              width: "2.2%",
              height: "2.2%",
              background: tint(hex, 0.9),
              "--dx": g.dx,
              "--dy": g.dy,
              animationDelay: `${delayMs + 60 + g.d}ms`,
            } as CSSProperties
          }
        />
      ))}
    </>
  );
}

/** SETTLE — the lingering aftermath every apex scene now closes on: a soft
 * afterglow hangs at the impact point while ash flecks drift down past it. */
const ASH = [
  { l: -11, dx: "-60%", d: 0, s: 1.7 },
  { l: 5, dx: "70%", d: 130, s: 1.3 },
  { l: -3, dx: "30%", d: 260, s: 1.9 },
  { l: 10, dx: "-40%", d: 390, s: 1.2 },
  { l: -14, dx: "80%", d: 520, s: 1.4 },
];
function Settle({
  hex,
  delayMs,
  cx = 50,
  cy = 54,
}: {
  hex: string;
  delayMs: number;
  cx?: number;
  cy?: number;
}) {
  return (
    <>
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{
          left: `${cx - 11}%`,
          top: `${cy - 7}%`,
          width: "22%",
          height: "14%",
          background: `radial-gradient(closest-side, ${tint(hex, 0.55)}, transparent)`,
          animationDelay: `${delayMs}ms`,
        }}
      />
      {ASH.map((v, i) => (
        <span
          key={i}
          className="gp-ash absolute block"
          style={
            {
              left: `${cx + v.l}%`,
              top: `${cy - 9}%`,
              width: `${v.s}%`,
              height: `${v.s}%`,
              "--dx": v.dx,
              animationDelay: `${delayMs + v.d}ms`,
            } as CSSProperties
          }
        >
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 1 L8.6 5 L5 9 L1.4 5 Z" fill={tint(hex, i % 2 ? 0.75 : 0.5)} />
          </svg>
        </span>
      ))}
      {/* flagship pass: three slow embers with hang-time stretch the aftermath
          another ~0.7s, each stalling mid-climb before winking out */}
      {EMBER_HANG.map((v, i) => (
        <span
          key={`e${i}`}
          className="gp-emberhang absolute block rounded-full"
          style={
            {
              left: `${cx + v.l}%`,
              top: `${cy - 2}%`,
              width: "1.6%",
              height: "1.6%",
              background: tint(hex, i % 2 ? 0.9 : 0.65),
              "--dx": v.dx,
              animationDelay: `${delayMs + 260 + v.d}ms`,
            } as CSSProperties
          }
        />
      ))}
    </>
  );
}

const EMBER_HANG = [
  { l: -7, dx: "-90%", d: 0 },
  { l: 6, dx: "110%", d: 220 },
  { l: -1, dx: "40%", d: 440 },
];

/* --- Tier-scaled weight ------------------------------------------------------
   Tier-8+ plays land HEAVIER than tier-7: a held rim vignette plus one extra
   shockwave. The weight is read from the card's LIVE tier (BUFF_BY_ID, bound
   onto each entry by `bindTiers` below the registry), never from a table of
   flourish keys: that table went stale as cards were re-tiered, so seven
   tier-8 cards played at tier-7 weight and six lower cards at tier-8 weight
   (ledger F221). */
function heavy(tier: number): boolean {
  return tier >= 8;
}

/** The tier-8 / apex rim vignette: the board's edges darken and HOLD through
 * the strike (opacity-only inset radial gradient).
 *
 * This one means the BOARD's rim, not the scene's, so it rides `BoardFrame`:
 * anchored on a corner cast the stage slides, and a vignette pinned to the
 * stage would darken the wrong edges. */
function Vignette({ delayMs }: { delayMs: number }) {
  return (
    <BoardFrame>
      <span
        className="gp-vignette absolute inset-0 block"
        style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 46%, rgba(4,4,10,0.85) 82%)", animationDelay: `${delayMs}ms` }}
      />
    </BoardFrame>
  );
}

/** The incoming entity's shadow sweeping the board during the tell (also the
 * old war-host banner shadows). Soft skewed band, transform/opacity only. */
function ShadowPass({ delayMs, top = 40, height = 16, alpha = 0.4 }: { delayMs: number; top?: number; height?: number; alpha?: number }) {
  return (
    <span
      className="gp-shadowpass absolute block rounded-full"
      style={{
        left: "24%",
        top: `${top}%`,
        width: "52%",
        height: `${height}%`,
        background: `rgba(5,5,12,${alpha})`,
        animationDelay: `${delayMs}ms`,
      }}
    />
  );
}

/** Tiny piece silhouettes (0 0 10 10) shared by the per-card flourishes —
 * pawns dubbed queen, rooks strung up as puppets, minors entombed in ice... */
const SIL = {
  p: "M5 1.4 A1.8 1.8 0 0 1 5 5 L6.2 8.2 H7.6 V9.6 H2.4 V8.2 H3.8 L5 5 A1.8 1.8 0 0 1 5 1.4 Z",
  r: "M2.8 2 H4 V3 H4.6 V2 H5.4 V3 H6 V2 H7.2 V4.2 H6.6 L7 9.4 H3 L3.4 4.2 H2.8 Z",
  n: "M5 1.6 C7 1.6 8 3 7.6 4.6 L6.6 5.2 L7.2 6 L6 6.4 L6.8 9.4 H3.2 C3.6 7 3 5.4 2.6 3.8 C2.4 2.6 3.4 1.6 5 1.6 Z",
  b: "M5 1 L6 2.6 L5.6 3 L6.4 5.4 L5.6 6 L6.6 9.4 H3.4 L4.4 6 L3.6 5.4 L4.4 3 L4 2.6 Z",
  q: "M2.6 9 L3.4 5.4 L2.2 2.6 L3.8 4 L5 2 L6.2 4 L7.8 2.6 L6.6 5.4 L7.4 9 Z",
  k: "M4.4 1 H5.6 V2 H6.6 V3.2 H5.6 V4 L6.8 9.4 H3.2 L4.4 4 V3.2 H3.4 V2 H4.4 Z",
} as const;
function Sil({ d, fill, stroke }: { d: string; fill: string; stroke: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d={d} fill={fill} stroke={stroke} strokeWidth="0.5" {...SJ} />
    </svg>
  );
}

/** Compact per-square hit for non-lead ("target") renders: glyph pop + a small
 * shock ring + three palette sparks. Zone-fed cards mount one per square, so
 * this must NOT be board-wide.
 *
 * THIS is where the module's directional geometry does its real work. A lead
 * gets `neutralGeo` (nothing to aim at yet), but every target square carries
 * its own leg, so the hit:
 *   - runs a lance IN along that leg, rotated by --fx-ang and lengthened by
 *     --fx-len, so a multi-victim play visibly travels victim to victim
 *     instead of popping identically on every square;
 *   - throws its sparks down the leg (--fx-aim-x / --fx-aim-y);
 *   - leans its lingering afterglow toward the caster's edge (--fx-side);
 *   - tightens its tell the deeper into the victim order it is (--fx-index),
 *     so the last piece in a cull gets the quickest, meanest cue.
 */
const HIT_SPARKS = [
  { dx: "170%", dy: "-150%", rot: "140deg", d: 0 },
  { dx: "-160%", dy: "-120%", rot: "-160deg", d: 18 },
  { dx: "30%", dy: "190%", rot: "90deg", d: 36 },
];
function TargetHit({
  palette,
  glyph,
  delayMs,
  impact,
}: {
  palette: Palette;
  glyph: ReactNode;
  delayMs: number;
  /** FLAGSHIP PASS: the destructive per-square hit. Templates whose mechanic
   * removes / petrifies / culls the piece opt in, and the square plays the
   * full impact composite instead of the glyph pop: the piece silhouette
   * stands on the square through the tell, a laser column hammers down onto
   * it, and it SPLITS IN HALF - the two halves hinge apart and fall while four
   * shards spray and a ground shockwave rolls out. Same tell / lance / spark /
   * afterglow beats around it, so nothing the plain hit had gets quieter. */
  impact?: boolean;
}) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {/* tell: a focus ring converges onto the square an instant before the
          hit, wound tighter the later this square falls in the order */}
      <span
        className="gp-focus absolute block rounded-full"
        style={
          {
            left: "8%",
            top: "8%",
            width: "84%",
            height: "84%",
            border: `2px solid ${tint(p0, 0.9)}`,
            "--gp-wind": "calc(45deg + var(--fx-index, 0) * 16deg)",
            animationDelay: `${delayMs}ms`,
          } as CSSProperties
        }
      />
      {/* the strike ARRIVES: a lance drawn back down this square's own leg,
          as long as the leg is and pointing the way it came */}
      <span
        className="gp-lance absolute block"
        style={
          {
            left: "50%",
            top: "48%",
            width: "calc(24% + var(--fx-len, 0) * 46%)",
            height: "4%",
            marginTop: "-2%",
            transformOrigin: "0% 50%",
            rotate: "calc(var(--fx-ang, 0) * 1deg)",
            background: `linear-gradient(270deg, ${tint(p1, 0.9)}, ${tint(p0, 0.35)} 55%, transparent)`,
            animationDelay: `${delayMs + 90}ms`,
          } as CSSProperties
        }
      />
      <span
        className="gp-flash absolute block rounded-full"
        style={{ left: "17%", top: "17%", width: "66%", height: "66%", background: tint(p1, 0.5), animationDelay: `${delayMs + 140}ms` }}
      />
      {impact ? (
        /* the piece is LASERED DOWN AND SPLIT: the impact composite rides one
           shared beat (--imp-delay), tinted with this card's glow colour */
        <span className="absolute inset-0 block" style={impactVars(rgbOf(p1), (delayMs + 460) / 1000)}>
          <LaserStrike />
          <PieceShatter
            glyph={<span className="absolute block" style={{ left: "18%", top: "16%", width: "64%", height: "64%" }}>{glyph}</span>}
          />
          <Shockwave />
        </span>
      ) : (
        <>
          <span className="gp-pop absolute block" style={{ left: "18%", top: "16%", width: "64%", height: "64%", animationDelay: `${delayMs + 200}ms` }}>
            {glyph}
          </span>
          <span
            className="gp-tring absolute block rounded-full"
            style={{ left: "10%", top: "10%", width: "80%", height: "80%", border: `2px solid ${tint(p1, 0.95)}`, animationDelay: `${delayMs + 280}ms` }}
          />
        </>
      )}
      {/* settle: a small ember-glow lingers on the struck square and slides
          toward whichever edge the caster is sitting at */}
      <span
        className="gp-afterglow absolute block rounded-full"
        style={
          {
            left: "24%",
            top: "28%",
            width: "52%",
            height: "44%",
            background: `radial-gradient(closest-side, ${tint(p1, 0.5)}, transparent)`,
            "--gp-drift": "calc(var(--fx-side, 1) * 9%)",
            animationDelay: `${delayMs + 640}ms`,
          } as CSSProperties
        }
      />
      {/* the debris keeps going the way the strike was travelling */}
      {HIT_SPARKS.map((v, i) => (
        <span
          key={i}
          className="gp-spark absolute block"
          style={
            {
              left: "39.5%",
              top: "39.5%",
              width: "21%",
              height: "21%",
              "--dx": `calc(${v.dx} + var(--fx-aim-x, 1) * 130%)`,
              "--dy": `calc(${v.dy} + var(--fx-aim-y, 0) * 130%)`,
              "--rot": v.rot,
              animationDelay: `${delayMs + 260 + v.d}ms`,
            } as CSSProperties
          }
        >
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0.6 L9 5 L5 9.4 L1 5 Z" fill={i === 1 ? p0 : p1} stroke={p2} strokeWidth="0.7" {...SJ} />
          </svg>
        </span>
      ))}
    </span>
  );
}

/* =============================================================================
   ENTRANCE — the card ARRIVING in a hand (draft pick, steal, grant), before it
   is ever played. Not the play: no board takeover, no colossus, no letterbox.
   The apex fiction shrunk to a reliquary at ~56% of the crop — the god-light
   opens, the card's own glyph is set into a halo ring, and the light closes
   again. Same three palette colours and the same central object as the play,
   its own short arrival beat.
   ========================================================================== */
function EntranceCut({ palette, glyph, delayMs }: { palette: Palette; glyph: ReactNode; delayMs: number }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {/* tell: the light gathers into a slot before anything is there */}
      <span
        className="gp-entglow absolute block rounded-full"
        style={{ left: "22%", top: "40%", width: "56%", height: "20%", background: `radial-gradient(closest-side, ${tint(p1, 0.75)}, transparent)`, animationDelay: `${delayMs}ms` }}
      />
      {/* strike: the halo ring opens and the glyph is set into it */}
      <span
        className="gp-entring absolute block rounded-full"
        style={{ left: "22%", top: "22%", width: "56%", height: "56%", border: `2px solid ${tint(p0, 0.9)}`, animationDelay: `${delayMs + 190}ms` }}
      />
      <span className="gp-entrise absolute block" style={{ left: "28%", top: "28%", width: "44%", height: "44%", animationDelay: `${delayMs + 280}ms` }}>
        {glyph}
      </span>
      {/* settle: the light closes over it, one mote hanging behind */}
      <span
        className="gp-entseal absolute block rounded-full"
        style={{ left: "30%", top: "30%", width: "40%", height: "40%", border: `1px solid ${tint(p2, 0.85)}`, animationDelay: `${delayMs + 560}ms` }}
      />
      <span
        className="gp-emberhang absolute block rounded-full"
        style={{ left: "48%", top: "56%", width: "3.4%", height: "3.4%", background: tint(p1, 0.9), animationDelay: `${delayMs + 700}ms` }}
      />
    </span>
  );
}

/* =============================================================================
   Template 5: ReaperSweep — a colossal hooded reaper strides across the whole
   crop sweeping a scythe arc; the glyph hangs as its lantern/pendant.
   ========================================================================== */
function ReaperSweep({ palette, glyph, lead, delayMs, flourish, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} impact />;
  return (
    <Stage quakeMs={delayMs + 800}>
      <Wash color={tint(p0, 0.3)} delayMs={delayMs} />
      <Tell hex={p1} delayMs={delayMs} cy={58} />
      {/* the reaper's shadow is RAKED by where this landed: the god-light hangs over
          the middle of the board, so the further out the cast square sits the
          longer the shadow is thrown away from it (--fx-ox / --fx-oy) */}
      <Rake
        delayMs={delayMs + 300}
        tone={tint(p2, 0.55)}
        lean="calc(var(--fx-ox, 0) * 3.1%)"
        tip="calc(var(--fx-oy, 0) * 1.9%)"
        cy={70}
        width={36}
      />
      {/* the reaper's shadow strides the ranks a beat ahead of the reaper */}
      <ShadowPass delayMs={delayMs + 20} top={50} height={16} alpha={0.5} />
      {heavy(tier) && <Vignette delayMs={delayMs + 120} />}
      {/* the reaper, striding across the crop */}
      <span className="gp-stride absolute block" style={{ left: "28%", top: "14%", width: "38%", height: "56%", animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 34 44" className="block h-full w-full" aria-hidden="true">
          {/* scythe shaft */}
          <path d="M6 6 L26 40" stroke={tint(p2, 0.9)} strokeWidth="1.4" strokeLinecap="round" />
          {/* pendant cord off the shaft hand */}
          <path d="M10.8 14.2 L9 19" stroke={tint(p2, 0.8)} strokeWidth="0.6" strokeLinecap="round" />
          {/* hooded head, face a void */}
          <path d="M13 10 C13 5.5 21 5.5 21 10 L20.4 14 H13.6 Z" fill={tint(p0, 0.95)} stroke={p2} strokeWidth="0.9" {...SJ} />
          <path d="M14.6 10.5 C14.6 8.5 19.4 8.5 19.4 10.5 L19 13 H15 Z" fill="rgba(8,8,14,0.9)" />
          {/* cloak sweeping behind the stride */}
          <path
            d="M13.5 14 C9 20 7 28 4 42 L12 38 L16 43 L21 37 L30 42 C26 28 23 20 20.5 14 Z"
            fill={tint(p0, 0.9)}
            stroke={p2}
            strokeWidth="1"
            {...SJ}
          />
          <path d="M14 22 C13 28 12 33 10.5 38 M19.5 22 C20.5 28 21.5 33 23 38" stroke={tint(p2, 0.5)} strokeWidth="0.7" fill="none" />
        </svg>
        {/* the card's glyph, hanging as the reaper's lantern */}
        <span className="absolute block" style={{ left: "16%", top: "44%", width: "20%", height: "18%" }}>{glyph}</span>
      </span>
      {/* the great scythe arc, sweeping the whole crop */}
      <span className="gp-scythe absolute block" style={{ left: "22%", top: "30%", width: "56%", height: "40%", animationDelay: `${delayMs + 460}ms` }}>
        <svg viewBox="0 0 44 32" className="block h-full w-full" aria-hidden="true">
          <path d="M4 22 C16 28 30 28 40 20" stroke={tint(p1, 0.5)} strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M2 26 C14 32 30 32 42 24 C32 28 16 28 6 22 Z" fill={tint(p1, 0.9)} stroke={p2} strokeWidth="0.8" {...SJ} />
        </svg>
      </span>
      {/* SIGNATURE: the sweep leaves a WOUND — a dark tear hangs along the
          scythe's arc, edged in pale light, and only seals as the dust settles */}
      <span className="gp-tear absolute block" style={{ left: "25%", top: "48%", width: "50%", height: "10%", animationDelay: `${delayMs + 720}ms` }}>
        <svg viewBox="0 0 50 10" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
          <path d="M1 4 C14 9.5 36 9.5 49 3 C37 6.5 15 6.5 1 4 Z" fill="rgba(6,4,12,0.95)" stroke={tint(p1, 0.7)} strokeWidth="0.5" {...SJ} />
          <path d="M6 5.2 C18 8 34 8 45 4.4" fill="none" stroke={tint(p2, 0.45)} strokeWidth="0.4" />
        </svg>
      </span>
      {/* harvest flare + sparks + graven shockwaves */}
      <span
        className="gp-flash absolute block rounded-full"
        style={{ left: "36%", top: "58%", width: "28%", height: "16%", background: tint(p1, 0.7), animationDelay: `${delayMs + 720}ms` }}
      />
      <Sparks delayMs={delayMs + 760} fill={p1} stroke={p0} sizePct={6.5} cy={61} />
      <Boom delayMs={delayMs + 800} color={tint(p1, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 920} color={tint(p0, 0.8)} />
      {heavy(tier) && <Boom delayMs={delayMs + 1050} color={tint(p2, 0.7)} thickness={2} />}
      {/* --- per-card flourishes ------------------------------------------- */}
      {/* peace_of_the_grave: the dead enforce the truce — headstones rise in
          a cordon ring around the king and no blade may pass it. */}
      {flourish === "grave_cordon" && (
        <>
          <span className="gp-snooze absolute block" style={{ left: "46%", top: "44%", width: "8%", height: "13%", animationDelay: `${delayMs + 620}ms` }}>
            <Sil d={SIL.k} fill={tint(p0, 0.95)} stroke={p1} />
          </span>
          <span
            className="gp-seal absolute block rounded-full"
            style={{ left: "38%", top: "42%", width: "24%", height: "19%", border: `2px dashed ${tint(p2, 0.9)}`, animationDelay: `${delayMs + 900}ms` }}
          />
          {[
            { l: 36, t: 42 },
            { l: 60, t: 42 },
            { l: 40, t: 57 },
            { l: 56, t: 57 },
          ].map((v, i) => (
            <span key={i} className="gp-rise absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "4.5%", height: "6%", animationDelay: `${delayMs + 1000 + i * 110}ms` }}>
              <svg viewBox="0 0 6 8" className="block h-full w-full" aria-hidden="true">
                <path d="M1 8 V3 C1 0.8 5 0.8 5 3 V8 Z" fill={tint(p1, 0.95)} stroke={p0} strokeWidth="0.4" {...SJ} />
                <path d="M3 3.2 V5.4 M2.2 4 H3.8" stroke={p0} strokeWidth="0.4" strokeLinecap="round" />
              </svg>
            </span>
          ))}
        </>
      )}
      <Glint delayMs={delayMs + 1160} color={p1} left={44} top={20} />
      <Settle hex={p1} delayMs={delayMs + 1180} cy={61} />
    </Stage>
  );
}

/* =============================================================================
   APEX helpers (tier 9/10) — letterbox bars for the two set-piece templates.
   ========================================================================== */
/** A letterbox brackets the SHOT, not the room: these bars stay on the scene
 * canvas so they crop the apex composition itself (SkullStrike's bowling lane,
 * PlanetAlign's syzygy) wherever it is anchored. `BoardFrame` would be right
 * for a rim treatment of the board (see `Vignette`), and wrong here: it would
 * leave culling's lane running outside its own letterbox on an off-centre
 * cast. */
function Bars({ delayMs }: { delayMs: number }) {
  return (
    <>
      <span
        className="gp-bar absolute left-0 right-0 block"
        style={{ top: "21.5%", height: "6%", background: "rgba(8,8,12,0.82)", transformOrigin: "50% 0%", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="gp-bar absolute left-0 right-0 block"
        style={{ top: "72.5%", height: "6%", background: "rgba(8,8,12,0.82)", transformOrigin: "50% 100%", animationDelay: `${delayMs}ms` }}
      />
    </>
  );
}

/* =============================================================================
   Template 12: SkullStrike — APEX set piece (culling, tier 9). DEATH'S
   BOWLING NIGHT: the lane lights up across the crop, the card's skull glyph
   — writ COLOSSAL — bowls the full width of the board, the doomed pieces
   scatter like pins, and the STRIKE lands a flare plus a TRIPLE shockwave.
   ========================================================================== */
const PINS = [
  { l: 46, d: 520, dx: "-140%", dy: "-260%", rot: "-200deg" },
  { l: 52, d: 620, dx: "160%", dy: "-300%", rot: "220deg" },
  { l: 58, d: 720, dx: "-100%", dy: "-340%", rot: "-160deg" },
  { l: 64, d: 820, dx: "200%", dy: "-240%", rot: "260deg" },
  { l: 70, d: 920, dx: "120%", dy: "-360%", rot: "180deg" },
  { l: 76, d: 1020, dx: "240%", dy: "-180%", rot: "300deg" },
];
function SkullStrike({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} impact />;
  return (
    <Stage quakeMs={delayMs + 1820}>
      <Wash color={tint(p1, 0.4)} delayMs={delayMs} />
      <Tell hex={p0} delayMs={delayMs} cy={48} />
      {/* the lane's shadow is RAKED by where this landed: the god-light hangs over
          the middle of the board, so the further out the cast square sits the
          longer the shadow is thrown away from it (--fx-ox / --fx-oy) */}
      <Rake
        delayMs={delayMs + 320}
        tone={tint(p2, 0.55)}
        lean="calc(var(--fx-ox, 0) * 3.1%)"
        tip="calc(var(--fx-oy, 0) * 1.9%)"
        cy={64}
        width={40}
      />
      <Bars delayMs={delayMs} />
      <Vignette delayMs={delayMs + 160} />
      {/* the ball's shadow races the lane a beat ahead of the skull itself */}
      <ShadowPass delayMs={delayMs + 120} top={52} height={9} alpha={0.55} />
      {/* the lane shine, waxed for the occasion */}
      <span
        className="gp-pane absolute block"
        style={{
          left: "12%",
          top: "44%",
          width: "76%",
          height: "14%",
          background: `linear-gradient(90deg, ${tint(p2, 0.5)}, ${tint(p0, 0.25)} 70%, transparent)`,
          animationDelay: `${delayMs + 80}ms`,
          animationDuration: "1.4s",
        }}
      />
      {/* THE SKULL, bowled the full width of the crop */}
      <span className="gp-roll absolute block" style={{ left: "26%", top: "30%", width: "32%", height: "36%", animationDelay: `${delayMs + 240}ms` }}>
        {glyph}
      </span>
      {/* the pins: the marked pieces, scattered as it ploughs through */}
      {PINS.map((v, i) => (
        <span
          key={i}
          className="gp-lob absolute block"
          style={
            {
              left: `${v.l}%`,
              top: "42%",
              width: "5.5%",
              height: "10%",
              "--dx": v.dx,
              "--dy": v.dy,
              "--rot": v.rot,
              animationDelay: `${delayMs + v.d}ms`,
            } as CSSProperties
          }
        >
          <svg viewBox="0 0 10 18" className="block h-full w-full" aria-hidden="true">
            {/* a piece-pin: pawn head on a bowling-pin body */}
            <circle cx="5" cy="3.4" r="2.6" fill={p2} stroke={p1} strokeWidth="0.6" />
            <path d="M3 16.6 C3.4 11 2.6 9 3.6 7 C4 6.2 6 6.2 6.4 7 C7.4 9 6.6 11 7 16.6 Z" fill={p2} stroke={p1} strokeWidth="0.6" {...SJ} />
            <path d="M3.4 8.6 H6.6" stroke={p0} strokeWidth="1" strokeLinecap="round" />
          </svg>
        </span>
      ))}
      {/* STRIKE: flare at the far end + sparks + a TRIPLE graven shockwave */}
      <span
        className="gp-flash absolute block rounded-full"
        style={{ left: "58%", top: "40%", width: "28%", height: "18%", background: tint(p0, 0.75), animationDelay: `${delayMs + 1720}ms` }}
      />
      <Sparks delayMs={delayMs + 1760} fill={p0} stroke={p2} sizePct={8} cx={68} cy={48} />
      <Boom delayMs={delayMs + 1820} color={tint(p0, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 1980} color={tint(p2, 0.85)} thickness={3} />
      <Boom delayMs={delayMs + 2140} color={tint(p1, 0.8)} />
      <Glint delayMs={delayMs + 2420} color={p2} left={64} top={36} />
      <Settle hex={p0} delayMs={delayMs + 2360} cx={66} cy={48} />
    </Stage>
  );
}

/* =============================================================================
   Template 13: PlanetAlign — APEX set piece (grand_conjunction, tier 9). THE
   PLANETS ALIGN: letterbox bars drop, a starfield kindles, three worlds glide
   in from off-crop and SNAP into syzygy over the board's spine, and the
   conjunction beam pierces straight down through all three — flare, sparks,
   TRIPLE shockwave.
   ========================================================================== */
const SKY_STARS = [
  { l: 28, t: 27, d: 0 },
  { l: 70, t: 30, d: 90 },
  { l: 34, t: 62, d: 180 },
  { l: 66, t: 66, d: 270 },
  { l: 24, t: 46, d: 135 },
  { l: 74, t: 48, d: 225 },
];
const WORLDS = [
  { t: 28, s: 10, fx: "-340%", fy: "-80%", d: 300 },
  { t: 39, s: 14, fx: "360%", fy: "60%", d: 400 },
  { t: 51, s: 11, fx: "-300%", fy: "140%", d: 500 },
];
function PlanetAlign({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 1720}>
      <Wash color={tint(p0, 0.42)} delayMs={delayMs} />
      <Tell hex={p1} delayMs={delayMs} cy={44} />
      {/* the syzygy's shadow is RAKED by where this landed: the god-light hangs over
          the middle of the board, so the further out the cast square sits the
          longer the shadow is thrown away from it (--fx-ox / --fx-oy) */}
      <Rake
        delayMs={delayMs + 320}
        tone={tint(p2, 0.55)}
        lean="calc(var(--fx-ox, 0) * 3.1%)"
        tip="calc(var(--fx-oy, 0) * 1.9%)"
        cy={62}
        width={38}
      />
      <Bars delayMs={delayMs} />
      <Vignette delayMs={delayMs + 160} />
      {/* the syzygy line kindles down the board's spine — the rail the three
          worlds are being drawn onto */}
      <span
        className="gp-seal absolute block"
        style={{
          left: "49.4%",
          top: "20%",
          width: "1.2%",
          height: "56%",
          background: `linear-gradient(180deg, transparent, ${tint(p2, 0.6)} 25%, ${tint(p2, 0.6)} 75%, transparent)`,
          animationDelay: `${delayMs + 340}ms`,
        }}
      />
      {/* the starfield kindles */}
      {SKY_STARS.map((s, i) => (
        <span key={i} className="gp-glint absolute block" style={{ left: `${s.l}%`, top: `${s.t}%`, width: "4%", height: "4%", animationDelay: `${delayMs + 160 + s.d}ms` }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0 L6.1 3.9 L10 5 L6.1 6.1 L5 10 L3.9 6.1 L0 5 L3.9 3.9 Z" fill={i % 2 ? p2 : p1} />
          </svg>
        </span>
      ))}
      {/* three worlds glide in and SNAP into syzygy over the board's spine */}
      {WORLDS.map((w, i) => (
        <span
          key={i}
          className="gp-planet absolute block"
          style={
            {
              left: `${50 - w.s / 2}%`,
              top: `${w.t}%`,
              width: `${w.s}%`,
              height: `${w.s}%`,
              "--fx": w.fx,
              "--fy": w.fy,
              animationDelay: `${delayMs + w.d}ms`,
            } as CSSProperties
          }
        >
          <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
            <circle cx="10" cy="10" r="7" fill={tint(i === 1 ? p1 : p0, 0.9)} stroke={p2} strokeWidth="0.9" />
            {i === 1 ? (
              <ellipse cx="10" cy="10" rx="9.4" ry="2.6" transform="rotate(-18 10 10)" fill="none" stroke={p2} strokeWidth="0.8" />
            ) : (
              <path d="M4 8 C7 6.5 13 6.5 16 8 M4.6 12.5 C7.5 14 12.5 14 15.4 12.5" fill="none" stroke={tint(p2, 0.7)} strokeWidth="0.7" strokeLinecap="round" />
            )}
            {i === 2 && <circle cx="6.6" cy="7.4" r="1.2" fill={tint(p2, 0.55)} />}
          </svg>
        </span>
      ))}
      {/* the conjunction beam pierces straight down through all three */}
      <span
        className="absolute block"
        style={{ left: "46.5%", top: "16%", width: "7%", height: "54%" }}
      >
        <span
          className="gp-ray absolute inset-0 block"
          style={{ background: `linear-gradient(180deg, ${tint(p2, 0.95)}, ${tint(p1, 0.4)} 70%, transparent)`, animationDelay: `${delayMs + 1480}ms` }}
        />
      </span>
      {/* the card's sigil blazes at the meeting point */}
      <span className="gp-pop absolute block" style={{ left: "43.5%", top: "39.5%", width: "13%", height: "13%", animationDelay: `${delayMs + 1560}ms` }}>
        {glyph}
      </span>
      {/* syzygy: flare + sparks + TRIPLE shockwave */}
      <span
        className="gp-flash absolute block rounded-full"
        style={{ left: "40%", top: "40%", width: "20%", height: "14%", background: tint(p2, 0.8), animationDelay: `${delayMs + 1620}ms` }}
      />
      <Sparks delayMs={delayMs + 1660} fill={p2} stroke={p1} sizePct={6.5} cy={46} />
      <Boom delayMs={delayMs + 1720} color={tint(p2, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 1880} color={tint(p1, 0.85)} thickness={3} />
      <Boom delayMs={delayMs + 2040} color={tint(p0, 0.8)} />
      <Glint delayMs={delayMs + 2340} color={p2} left={47} top={30} />
      <Settle hex={p1} delayMs={delayMs + 2320} cy={46} />
    </Stage>
  );
}

/* =============================================================================
   BESPOKE SCENES — apex cards whose fiction earned an extra layer on top of
   (or woven through) their family template. Each is a thin wrapper: the base
   template still plays, and a second Stage carries the card-specific beat.
   Same discipline: transform/opacity only, one-shot `both`, ends at opacity 0.
   ========================================================================== */

/** A little mushroom cloud (cap + stem + ground skirt), reused by both atomic
 * scenes at different scales. */
function Shroom({ core, glow, deep }: { core: string; glow: string; deep: string }) {
  return (
    <svg viewBox="0 0 18 24" className="block h-full w-full" aria-hidden="true">
      {/* ground skirt */}
      <ellipse cx="9" cy="21.6" rx="7.2" ry="1.8" fill={tint(deep, 0.55)} />
      {/* stem */}
      <path d="M7.2 12.6 C7.6 16 6.6 18.6 5.6 21.4 H12.4 C11.4 18.6 10.4 16 10.8 12.6 Z" fill={tint(core, 0.9)} stroke={deep} strokeWidth="0.7" {...SJ} />
      {/* cap */}
      <path d="M2 8.6 C2 3.2 16 3.2 16 8.6 C16 11.4 13.2 12.6 11.4 12 L10.8 13.6 H7.2 L6.6 12 C4.8 12.6 2 11.4 2 8.6 Z" fill={tint(glow, 0.92)} stroke={deep} strokeWidth="0.8" {...SJ} />
      {/* heat glow under the cap */}
      <ellipse cx="9" cy="9" rx="4" ry="2.2" fill={tint(core, 0.6)} />
    </svg>
  );
}



/* --- endless_night ---------------------------------------------------------------
   "Your opponent skips their next turn. On the turn they return, up to four
   non-king enemy pieces you choose are frozen for that one turn." Night falls
   over their half and the sun sinks; one moon crosses (the one turn they
   lose). When the light comes back four of their pieces are still asleep
   under nightcaps, with Z's rising off them, and their king, who cannot be
   chosen, is awake. */
const EN_SLEEPERS = [
  { c: 1, t: "r" as const },
  { c: 2, t: "n" as const },
  { c: 5, t: "b" as const },
  { c: 6, t: "q" as const },
];
function EndlessNight({ palette, glyph, lead, delayMs, tier }: TemplateProps) {
  const [p0, p1] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 900}>
      {heavy(tier) && <Vignette delayMs={delayMs + 120} />}
      <BoardFrame>
        {/* night over their half */}
        <span
          className="gp-nightfall absolute block"
          style={{ left: "0%", top: "calc(25% - var(--fx-side, 1) * 25%)", width: "100%", height: "50%", transformOrigin: "50% 50%", background: "linear-gradient(180deg, rgba(9,12,40,0.7), rgba(9,12,40,0.3))", animationDelay: dm(delayMs, 0) }}
        />
        <span
          className="gp-sunset absolute block rounded-full"
          style={{ left: "78%", top: `calc(${RK(6)} - 2%)`, width: "9%", height: "9%", background: `radial-gradient(circle at 50% 38%, #ffe9a8, #ffb454 55%, ${tint("#ff7a29", 0.9)})`, animationDelay: dm(delayMs, 60) }}
        />
        {/* the one turn they lose: a single moon crosses their sky */}
        <span className="gp-en-moon absolute block" style={{ left: "8%", top: `calc(${RK(6)} + 1%)`, width: "7%", height: "9%", animationDelay: dm(delayMs, 320) }}>
          <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
            <path d="M7.8 1.6 C4.4 2.6 2.4 5.4 2.4 8.4 C2.4 9.6 2.7 10.6 3.2 11.4 C1.2 9.8 0.4 7 1.2 4.6 C2 2.2 4.6 0.8 7.8 1.6 Z" fill="#fff4d6" stroke={tint(p1, 0.7)} strokeWidth="0.4" {...SJ} />
          </svg>
        </span>
        {/* their row: the four chosen pieces and the king who wakes */}
        {EN_SLEEPERS.map((v) => (
          <span key={v.c} className="gp-snooze absolute block" style={{ ...sq(v.c, 5, 2), animationDelay: dm(delayMs, 200) }}>
            <Sil d={SIL[v.t]} fill="#141a36" stroke={tint(p1, 0.7)} />
          </span>
        ))}
        <span className="gp-en-king absolute block" style={{ ...sq(4, 5, 2), animationDelay: dm(delayMs, 200) }}>
          <Sil d={SIL.k} fill="#141a36" stroke="#ffd76a" />
        </span>
        {/* the dawn comes back up from the caster's side of their half */}
        <span
          className="gp-en-dawn absolute block"
          style={{ left: "0%", top: RK(4), width: "100%", height: "12.5%", background: "linear-gradient(180deg, rgba(255,215,106,0.32), transparent)", animationDelay: dm(delayMs, 1000) }}
        />
        {/* the chosen four stay asleep for that turn */}
        {EN_SLEEPERS.map((v, i) => (
          <span key={`cap${v.c}`} className="gp-capdrop absolute block" style={{ left: `${v.c * 12.5 + 3}%`, top: `calc(${RK(5)} + 0.5%)`, width: "6.5%", height: "4.5%", animationDelay: dm(delayMs, 1050 + i * 70) }}>
            <svg viewBox="0 0 10 6" className="block h-full w-full" aria-hidden="true">
              <path d="M1.4 5 C2 1.6 5 0.4 8 1.4 L8.8 1 C9.4 1 9.6 2 9 2.2 L8.4 2.2 C7 4.4 4 5.4 1.4 5 Z" fill={p0} stroke={p1} strokeWidth="0.4" {...SJ} />
              <circle cx="9.1" cy="1.6" r="0.7" fill="#fff4d6" />
            </svg>
          </span>
        ))}
        {EN_SLEEPERS.map((v, i) => (
          <span key={`z${v.c}`} className="gp-zrise absolute block" style={{ left: `${v.c * 12.5 + 8}%`, top: `calc(${RK(5)} - 2%)`, width: "3%", height: "3%", animationDelay: dm(delayMs, 1300 + i * 90) }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M2 2 H8 L2 8 H8" fill="none" stroke={p1} strokeWidth="1.3" {...SJ} />
            </svg>
          </span>
        ))}
      </BoardFrame>
    </Stage>
  );
}


/* =============================================================================
   ROUND 3 SCENES (slice TC-god). These eleven cards used to play a shared
   template (a titan, a storm god, a maw, a war host, a colossus, a time lord)
   with a small flourish of their own laid over it. Each now draws its rule on
   the squares the rule names, in the same BoardFrame geometry as the scenes
   below: one square is 12.5%, and RK(r) is the top of a rank counted from the
   caster's back rank (r = 0) to the opponent's (r = 7), for either seat.
   ========================================================================== */

/** Top of rank r (0 = the caster's back rank, 7 = the opponent's), as a
 * BoardFrame percentage that is right from either seat. */
function RK(r: number): string {
  return `calc(43.75% - var(--fx-side, 1) * ${r * 12.5 - 43.75}%)`;
}
/** One square's box: column c from the viewer's left, rank r as in RK. */
function sq(c: number, r: number, inset = 0): CSSProperties {
  return {
    left: `${c * 12.5 + inset}%`,
    top: `calc(${RK(r)} + ${inset}%)`,
    width: `${12.5 - inset * 2}%`,
    height: `${12.5 - inset * 2}%`,
  };
}
/** Enemy pieces are drawn dark, the caster's light, on every round 3 scene. */
const FOE = "#2b1d24";
const OWN = "#fff7de";

/* --- salted_earth ----------------------------------------------------------
   "For your opponent's next 4 turns their pawns cannot advance; they may
   still capture diagonally. After that the salt lifts." A salt cellar is
   dragged along the rank in front of their pawns and leaves a white crust;
   every pawn leans forward and balks at it, two of them are shown the
   diagonal that is still open, four pips count the turns, and the crust
   blows away at the end: the salt lifts. */
const SX_FILES = [0, 1, 2, 3, 4, 5, 6, 7];
const SX_DIAG = [
  { c: 2, dir: 1, d: 980 },
  { c: 5, dir: -1, d: 1100 },
];
const SX_LIFT = [
  { l: 12, d: 1750 },
  { l: 37, d: 1810 },
  { l: 62, d: 1870 },
  { l: 87, d: 1930 },
];
function SaltedEarthScene({ palette, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <SaltHit palette={palette} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 520}>
      <BoardFrame>
        {/* their pawns, one rank short of the salt */}
        {SX_FILES.map((c) => (
          <span key={c} className="gp-sx-pawn absolute block" style={{ ...sq(c, 5, 2), animationDelay: dm(delayMs, 0) }}>
            <span className="gp-sx-balk absolute inset-0 block" style={{ animationDelay: dm(delayMs, 620 + (c % 4) * 50) }}>
              <Sil d={SIL.p} fill={FOE} stroke={p1} />
            </span>
          </span>
        ))}
        {/* the cellar is dragged along the rank in front of them */}
        <span className="gp-sx-cellar absolute block" style={{ left: "-4%", top: `calc(${RK(4)} - 7%)`, width: "8%", height: "10%", animationDelay: dm(delayMs, 60) }}>
          <svg viewBox="0 0 8 10" className="block h-full w-full" aria-hidden="true">
            <path d="M2 2.4 H6 L6.6 9.4 H1.4 Z" fill={p0} stroke={p1} strokeWidth="0.5" {...SJ} />
            <path d="M2.2 2.4 C2.2 0.6 5.8 0.6 5.8 2.4" fill={tint(p1, 0.9)} stroke={p1} strokeWidth="0.5" />
            <circle cx="3.4" cy="1.5" r="0.3" fill={FOE} />
            <circle cx="4.6" cy="1.5" r="0.3" fill={FOE} />
          </svg>
        </span>
        {/* the crust it leaves, drawn left to right behind it */}
        <span
          className="gp-sx-crust absolute block"
          style={{ left: "0%", top: `calc(${RK(4)} + 4%)`, width: "100%", height: "4.5%", background: `linear-gradient(180deg, ${tint(OWN, 0.9)}, ${tint(p0, 0.75)})`, animationDelay: dm(delayMs, 120) }}
        />
        {/* the diagonal is still open: two pawns are shown their capture */}
        {SX_DIAG.map((d) => (
          <span
            key={d.c}
            className="gp-sx-diag absolute block"
            style={{ left: `${(d.c + (d.dir < 0 ? -1 : 0)) * 12.5 + 3}%`, top: `calc(${RK(4.5)} + 1%)`, width: "19%", height: "10.5%", animationDelay: dm(delayMs, d.d) }}
          >
            <svg viewBox="0 0 19 10.5" className="block h-full w-full" style={{ transform: `scale(${d.dir < 0 ? -1 : 1}, var(--fx-side, 1))` }} aria-hidden="true">
              <path d="M3 1.5 L14 8.4 M10.2 8.6 L14 8.4 L13.4 4.8" fill="none" stroke={p2} strokeWidth="1.2" {...SJ} />
            </svg>
          </span>
        ))}
        {/* four turns */}
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="gp-sx-pip absolute block rounded-full" style={{ left: `${43.4 + i * 3.8}%`, top: `calc(${RK(3)} + 5%)`, width: "2.6%", height: "2.6%", background: p0, animationDelay: dm(delayMs, 1180 + i * 90) }} />
        ))}
        {/* settle: the salted rank glows pale while the four turns run */}
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "4%", top: RK(4), width: "92%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(OWN, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1400) }}
        />
        {/* and then the salt lifts: the crust blows off toward their side */}
        {SX_LIFT.map(({ l, d }) => (
          <span
            key={l}
            className="gp-sx-lift absolute block rounded-full"
            style={{ left: `${l - 4}%`, top: `calc(${RK(4)} + 3%)`, width: "8%", height: "6%", background: `radial-gradient(closest-side, ${tint(OWN, 0.8)}, transparent)`, animationDelay: dm(delayMs, d) }}
          />
        ))}
      </BoardFrame>
    </Stage>
  );
}
/** A pawn that tries to step into the salt and is stopped. */
function SaltHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, p1] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span
        className="gp-sx-grains absolute block"
        style={{ left: "6%", top: "calc(50% + var(--fx-side, 1) * 34%)", width: "88%", height: "14%", background: `linear-gradient(180deg, ${tint(OWN, 0.9)}, ${tint(p0, 0.6)})`, animationDelay: dm(delayMs, 0) }}
      />
      <span className="gp-sx-hitpawn absolute block" style={{ left: "22%", top: "18%", width: "56%", height: "56%", animationDelay: dm(delayMs, 0) }}>
        <span className="gp-sx-balk absolute inset-0 block" style={{ animationDelay: dm(delayMs, 120) }}>
          <Sil d={SIL.p} fill={tint(p1, 0.35)} stroke={p0} />
        </span>
      </span>
    </span>
  );
}

/* --- phoenix_line ------------------------------------------------------------
   "Revive all your captured pawns to your 2nd rank, once." The caster's pawn
   rank has gaps where pawns were lost, each gap holds a heap of ash, and the
   firebird skims the rank from one side to the other: every ash heap it
   passes flares and a pawn stands up out of it. One pip: once. */
const PL_GAPS = [1, 4, 6];
const PL_KEPT = [0, 2, 3, 5, 7];
function PhoenixLineScene({ palette, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <RekindleHit palette={palette} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 700}>
      <BoardFrame>
        {PL_KEPT.map((c) => (
          <span key={c} className="gp-pl-kept absolute block" style={{ ...sq(c, 1, 2), animationDelay: dm(delayMs, 0) }}>
            <Sil d={SIL.p} fill={tint(OWN, 0.7)} stroke={p2} />
          </span>
        ))}
        {PL_GAPS.map((c) => (
          <span key={`a${c}`} className="gp-pl-ash absolute block" style={{ left: `${c * 12.5 + 2.5}%`, top: `calc(${RK(1)} + 8%)`, width: "7.5%", height: "3.5%", animationDelay: dm(delayMs, 80) }}>
            <svg viewBox="0 0 8 3.5" className="block h-full w-full" aria-hidden="true">
              <path d="M0.4 3.3 C1.4 0.8 3 0.3 4 0.3 C5 0.3 6.6 0.8 7.6 3.3 Z" fill="#4a3a36" stroke={tint(p0, 0.8)} strokeWidth="0.4" {...SJ} />
            </svg>
          </span>
        ))}
        {/* the firebird skims the rank */}
        <span className="gp-pl-bird absolute block" style={{ left: "-12%", top: `calc(${RK(1.6)} - 2%)`, width: "12%", height: "11%", animationDelay: dm(delayMs, 240) }}>
          <svg viewBox="0 0 22 20" className="block h-full w-full" aria-hidden="true">
            <path d="M12 9 C8 6 4 6 1 9 C4.5 10.2 7.6 10 10 9.8 M12 9 C14 5 17.6 2.6 21 2.4 C19 6 16 8.6 13.4 9.8" fill={p0} stroke={p2} strokeWidth="0.6" {...SJ} />
            <path d="M9.6 9.4 C11 8.2 14 8.4 15.6 10 C14 11.6 11 11.6 9.6 10.4 Z" fill={p1} stroke={p2} strokeWidth="0.5" {...SJ} />
            <circle cx="15.2" cy="9.6" r="0.6" fill={p2} />
            <path d="M9.8 10 C7 11.6 4 14 1 18.6 M10.2 10.6 C8 13 6.6 15.6 5.6 19.4" fill="none" stroke={p0} strokeWidth="0.7" strokeLinecap="round" />
          </svg>
        </span>
        {/* each heap flares as the bird passes, and a pawn stands up in it */}
        {PL_GAPS.map((c) => (
          <span
            key={`f${c}`}
            className="gp-pl-flare absolute block"
            style={{ left: `${c * 12.5 + 2}%`, top: `calc(${RK(1)} + 1%)`, width: "8.5%", height: "10.5%", animationDelay: dm(delayMs, 340 + c * 106) }}
          >
            <svg viewBox="0 0 8 10" className="block h-full w-full" aria-hidden="true">
              <path d="M4 0.6 C5.6 2.6 7.2 4.4 7.2 6.8 C7.2 8.6 5.8 9.6 4 9.6 C2.2 9.6 0.8 8.6 0.8 6.8 C0.8 5.2 1.8 4.4 2.4 3.2 C2.8 4.4 3.4 4.8 3.8 4.8 C3.6 3.4 3.4 2 4 0.6 Z" fill={tint(p0, 0.85)} stroke={p2} strokeWidth="0.4" {...SJ} />
              <path d="M4 4.6 C4.9 5.6 5.6 6.4 5.6 7.4 C5.6 8.4 4.9 8.9 4 8.9 C3.1 8.9 2.4 8.4 2.4 7.4 C2.4 6.4 3.1 5.6 4 4.6 Z" fill={p1} />
            </svg>
          </span>
        ))}
        {PL_GAPS.map((c) => (
          <span key={`p${c}`} className="gp-pl-rise absolute block" style={{ ...sq(c, 1, 2), animationDelay: dm(delayMs, 480 + c * 106) }}>
            <Sil d={SIL.p} fill={p1} stroke={p2} />
          </span>
        ))}
        {/* once */}
        <span className="gp-pl-pip absolute block rounded-full" style={{ left: "48.6%", top: `calc(${RK(2)} + 4%)`, width: "2.8%", height: "2.8%", background: p1, animationDelay: dm(delayMs, 1250) }} />
        {/* settle: the rank smoulders and goes out */}
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "4%", top: RK(1), width: "92%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p0, 0.42)}, transparent)`, animationDelay: dm(delayMs, 1300) }}
        />
      </BoardFrame>
    </Stage>
  );
}
/** A revived pawn standing up out of its ash heap. */
function RekindleHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="gp-pl-flare absolute block" style={{ left: "18%", top: "8%", width: "64%", height: "84%", animationDelay: dm(delayMs, 0) }}>
        <svg viewBox="0 0 8 10" className="block h-full w-full" aria-hidden="true">
          <path d="M4 0.6 C5.6 2.6 7.2 4.4 7.2 6.8 C7.2 8.6 5.8 9.6 4 9.6 C2.2 9.6 0.8 8.6 0.8 6.8 C0.8 5.2 1.8 4.4 2.4 3.2 C2.8 4.4 3.4 4.8 3.8 4.8 C3.6 3.4 3.4 2 4 0.6 Z" fill={tint(p0, 0.8)} stroke={p2} strokeWidth="0.4" {...SJ} />
        </svg>
      </span>
      <span className="gp-pl-rise absolute block" style={{ left: "20%", top: "18%", width: "60%", height: "60%", animationDelay: dm(delayMs, 160) }}>
        <Sil d={SIL.p} fill={p1} stroke={p2} />
      </span>
    </span>
  );
}

/* --- chain_atomic -----------------------------------------------------------
   "For your next 3 turns, whenever a capture involves one of your pieces the
   capturing piece is destroyed, along with up to one enemy piece beside it,
   kings aside. No chains." One of the caster's pawns wears a lit fuse; an
   enemy knight jumps in and takes it, and the square goes up: the knight is
   gone, the bishop beside it goes too, the king beside it is spared, and the
   rook next to the bishop only sees a spark die out on the way (no chains).
   Three pips are the three turns. */
function ChainAtomic({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 760}>
      <BoardFrame>
        {/* the trapped pawn, fuse lit */}
        <span className="gp-cha-bait absolute block" style={{ ...sq(3, 3, 2), animationDelay: dm(delayMs, 0) }}>
          <Sil d={SIL.p} fill={OWN} stroke={p1} />
        </span>
        <span className="gp-cha-fuse absolute block" style={{ left: "46%", top: `calc(${RK(3)} - 2%)`, width: "4%", height: "4%", animationDelay: dm(delayMs, 60) }}>
          <svg viewBox="0 0 4 4" className="block h-full w-full" aria-hidden="true">
            <path d="M2 0.4 L2.5 1.5 L3.6 2 L2.5 2.5 L2 3.6 L1.5 2.5 L0.4 2 L1.5 1.5 Z" fill={p2} />
          </svg>
        </span>
        {/* the knight's jump onto it: two up, one across */}
        <span className="gp-cha-jump absolute block" style={{ ...sq(4, 5, 2), animationDelay: dm(delayMs, 260) }}>
          <Sil d={SIL.n} fill={FOE} stroke={p0} />
        </span>
        {/* the pieces beside the square */}
        <span className="gp-cha-gone absolute block" style={{ ...sq(2, 3, 2), animationDelay: dm(delayMs, 0) }}>
          <Sil d={SIL.b} fill={FOE} stroke={p0} />
        </span>
        <span className="gp-cha-stay absolute block" style={{ ...sq(4, 4, 2), animationDelay: dm(delayMs, 0) }}>
          <Sil d={SIL.k} fill={FOE} stroke={p0} />
        </span>
        <span className="gp-cha-stay absolute block" style={{ ...sq(1, 3, 2), animationDelay: dm(delayMs, 0) }}>
          <Sil d={SIL.r} fill={FOE} stroke={p0} />
        </span>
        {/* the square goes up */}
        <span className="gp-cha-cloud absolute block" style={{ left: "37.5%", top: `calc(${RK(3)} - 12%)`, width: "12.5%", height: "22%", animationDelay: dm(delayMs, 740) }}>
          <Shroom core={p0} glow={p2} deep={p1} />
        </span>
        {/* one neighbour caught: the bishop's square blows out */}
        <span className="gp-cha-pop absolute block rounded-full" style={{ ...sq(2, 3, 1), background: `radial-gradient(closest-side, ${tint(p2, 0.85)}, ${tint(p0, 0.4)} 60%, transparent)`, animationDelay: dm(delayMs, 860) }} />
        {/* the king beside it is spared: a small ward stands over it */}
        <span className="gp-cha-ward absolute block rounded-full" style={{ ...sq(4, 4, 1), border: `2px solid ${tint(OWN, 0.9)}`, animationDelay: dm(delayMs, 840) }} />
        {/* no chains: a spark runs from the bishop toward the rook and dies */}
        <span className="gp-cha-fizzle absolute block" style={{ left: "17%", top: `calc(${RK(3)} + 5%)`, width: "8%", height: "2.5%", animationDelay: dm(delayMs, 1000) }}>
          <svg viewBox="0 0 8 2.5" className="block h-full w-full" aria-hidden="true">
            <path d="M8 1.25 H2.6" stroke={p2} strokeWidth="0.7" strokeDasharray="0.9 0.7" strokeLinecap="round" />
            <path d="M0.6 0.2 L2.6 2.3 M2.6 0.2 L0.6 2.3" stroke={p1} strokeWidth="0.6" strokeLinecap="round" />
          </svg>
        </span>
        {/* three turns */}
        {[0, 1, 2].map((i) => (
          <span key={i} className="gp-cha-pip absolute block rounded-full" style={{ left: `${45.2 + i * 3.6}%`, top: `calc(${RK(2)} + 5%)`, width: "2.4%", height: "2.4%", background: p0, animationDelay: dm(delayMs, 1200 + i * 100) }} />
        ))}
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "25%", top: RK(3), width: "25%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p0, 0.5)}, transparent)`, animationDelay: dm(delayMs, 1300) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- total_atomic -----------------------------------------------------------
   "Your next three captures each detonate one square in every direction,
   destroying up to two adjacent enemy pieces. Shielded pieces resist, and the
   blast never chains." The caster's rook takes in the middle of a crowd; the
   blast is drawn as exactly the three by three block around the capture, two
   enemy pieces in it are thrown out, a shielded one holds, and the piece just
   outside the block is untouched: the edge of the grid is where it stops.
   Three bombs are the three captures, the first one spent. */
const TA_THROWN = [
  { c: 2, r: 4, t: "b" as const, dx: "-120%", dy: "-80%", rot: "-140deg" },
  { c: 4, r: 3, t: "n" as const, dx: "120%", dy: "60%", rot: "160deg" },
];
function TotalAtomic({ palette, glyph, lead, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 640}>
      {heavy(tier) && <Vignette delayMs={delayMs + 120} />}
      <BoardFrame>
        {/* the capture: the rook drives in from the caster's side */}
        <span className="gp-ta-rook absolute block" style={{ ...sq(3, 3, 2), animationDelay: dm(delayMs, 0) }}>
          <Sil d={SIL.r} fill={OWN} stroke={p1} />
        </span>
        {/* the crowd around it */}
        {TA_THROWN.map((v, i) => (
          <span
            key={i}
            className="gp-ta-thrown absolute block"
            style={{ ...sq(v.c, v.r, 2), "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: dm(delayMs, 0) } as CSSProperties}
          >
            <Sil d={SIL[v.t]} fill={FOE} stroke={p0} />
          </span>
        ))}
        <span className="gp-ta-held absolute block" style={{ ...sq(2, 2, 2), animationDelay: dm(delayMs, 0) }}>
          <Sil d={SIL.q} fill={FOE} stroke={p0} />
        </span>
        <span className="gp-ta-outside absolute block" style={{ ...sq(5, 3, 2), animationDelay: dm(delayMs, 0) }}>
          <Sil d={SIL.r} fill={FOE} stroke={p0} />
        </span>
        {/* the blast is exactly one square in every direction */}
        <span
          className="gp-ta-grid absolute block"
          style={{ left: "25%", top: `calc(${RK(3)} - 12.5%)`, width: "37.5%", height: "37.5%", border: `3px solid ${tint(p2, 0.95)}`, background: tint(p0, 0.28), animationDelay: dm(delayMs, 560) }}
        />
        <span className="gp-ta-cloud absolute block" style={{ left: "36.5%", top: `calc(${RK(3)} - 10%)`, width: "14.5%", height: "21%", animationDelay: dm(delayMs, 620) }}>
          <Shroom core={p0} glow={p2} deep={p1} />
        </span>
        {/* the shielded queen resists */}
        <span className="gp-ta-shield absolute block" style={{ ...sq(2, 2, 1.5), animationDelay: dm(delayMs, 640) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0.6 L9 2 V5 C9 7.4 7.2 8.8 5 9.6 C2.8 8.8 1 7.4 1 5 V2 Z" fill="none" stroke={OWN} strokeWidth="0.8" {...SJ} />
          </svg>
        </span>
        {/* three captures, the first spent */}
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`${i === 0 ? "gp-ta-spent" : "gp-ta-bomb"} absolute block`}
            style={{ left: `${43 + i * 5}%`, top: `calc(${RK(1)} + 3%)`, width: "4%", height: "5%", animationDelay: dm(delayMs, 1050 + i * 90) }}
          >
            <svg viewBox="0 0 8 10" className="block h-full w-full" aria-hidden="true">
              <circle cx="4" cy="6" r="3.4" fill={i === 0 ? tint(p1, 0.6) : p1} stroke={p2} strokeWidth="0.5" />
              <path d="M5.4 3 L6.6 1" stroke={p2} strokeWidth="0.6" strokeLinecap="round" />
            </svg>
          </span>
        ))}
        <span
          className="gp-afterglow absolute block"
          style={{ left: "25%", top: `calc(${RK(3)} - 12.5%)`, width: "37.5%", height: "37.5%", background: `radial-gradient(closest-side, ${tint(p0, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1250) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- total_plunder ------------------------------------------------------------
   "Steal up to three of your opponent's active buffs, chosen by you, except
   locked-in upgrades." The opponent's cards stand in a row; the caster's
   pointer ticks three of them, one at a time, the padlocked one shrugs the
   pointer off, and a chest at the caster's edge opens, takes the three and
   slams shut. Three pips are the three picks. */
const TP_ROW = [
  { l: 18, pick: 0 },
  { l: 32, pick: -1 },
  { l: 46, pick: 1 },
  { l: 60, pick: -2 },
  { l: 74, pick: 2 },
];
function TotalPlunderScene({ palette, glyph, lead, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 1080}>
      {heavy(tier) && <Vignette delayMs={delayMs + 120} />}
      <BoardFrame>
        {TP_ROW.map((c) => (
          <span
            key={c.l}
            className={`${c.pick === -2 ? "gp-tp-locked" : "gp-tp-row"} absolute block`}
            style={{ left: `${c.l}%`, top: EDGE.enemy, width: "9%", height: "12.5%", animationDelay: dm(delayMs, 0) }}
          >
            <CardArt face={tint(p2, 0.9)} edge={p0} mark={c.pick >= 0 ? p0 : undefined} locked={c.pick === -2 ? p1 : undefined} />
          </span>
        ))}
        {/* the pointer: chosen by you, one card at a time */}
        {TP_ROW.filter((c) => c.pick >= 0).map((c) => (
          <span key={`k${c.l}`} className="gp-tp-tick absolute block" style={{ left: `${c.l + 5}%`, top: `calc(${EDGE.enemy} - 2%)`, width: "5%", height: "5%", animationDelay: dm(delayMs, 220 + c.pick * 170) }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <circle cx="5" cy="5" r="4.4" fill={p0} stroke={p1} strokeWidth="0.6" />
              <path d="M2.8 5.2 L4.4 6.8 L7.4 3.4" fill="none" stroke={p1} strokeWidth="1" {...SJ} />
            </svg>
          </span>
        ))}
        {/* the chest at the caster's edge */}
        <span className="gp-tp-chest absolute block" style={{ left: "41%", top: `calc(${EDGE.own} + 1%)`, width: "18%", height: "11%", animationDelay: dm(delayMs, 500) }}>
          <svg viewBox="0 0 18 11" className="block h-full w-full" aria-hidden="true">
            <rect x="1" y="4" width="16" height="6.4" rx="0.8" fill="#7a4a24" stroke={p1} strokeWidth="0.5" />
            <path d="M1 6.6 H17 M5 4 V10.4 M13 4 V10.4" stroke={p0} strokeWidth="0.6" />
            <rect x="8" y="5.6" width="2" height="2.4" rx="0.3" fill={p0} />
          </svg>
        </span>
        <span className="gp-tp-lid absolute block" style={{ left: "41%", top: `calc(${EDGE.own} - 2%)`, width: "18%", height: "7%", animationDelay: dm(delayMs, 500) }}>
          <svg viewBox="0 0 18 7" className="block h-full w-full" aria-hidden="true">
            <path d="M1 6.6 V3.4 C1 1 17 1 17 3.4 V6.6 Z" fill="#8a5a2c" stroke={p1} strokeWidth="0.5" {...SJ} />
            <path d="M5 1.6 V6.6 M13 1.6 V6.6" stroke={p0} strokeWidth="0.6" />
          </svg>
        </span>
        {/* the three picked cards dive into it */}
        {TP_ROW.filter((c) => c.pick >= 0).map((c) => (
          <span
            key={`s${c.l}`}
            className="gp-tp-take absolute block"
            style={{ left: `${c.l}%`, top: EDGE.enemy, width: "9%", height: "12.5%", "--gp-dx": `${Math.round((45.5 - c.l) / 0.09)}%`, animationDelay: dm(delayMs, 760 + c.pick * 110) } as CSSProperties}
          >
            <CardArt face={p0} edge={p1} mark={p2} />
          </span>
        ))}
        {[0, 1, 2].map((i) => (
          <span key={i} className="gp-tp-pip absolute block rounded-full" style={{ left: `${45.2 + i * 3.6}%`, top: `calc(${EDGE.own} + 13%)`, width: "2.4%", height: "2.4%", background: p0, animationDelay: dm(delayMs, 1300 + i * 90) }} />
        ))}
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "34%", top: EDGE.own, width: "32%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p0, 0.45)}, transparent)`, animationDelay: dm(delayMs, 1450) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- noble_rout ---------------------------------------------------------------
   "After your opponent's next move, the nobles break and run: for their
   following 3 turns their knights, bishops, rooks and queen cannot move
   toward your side of the board. Only their pawns and king may still
   advance." One hollow pip for the move they still get, then the line of
   their nobles lunges toward the caster, hits a bar and turns back toward
   their own edge; their pawn and king step forward past it. Three pips for
   the three turns. */
const NR_NOBLES = [
  { c: 1, t: "n" as const },
  { c: 2, t: "b" as const },
  { c: 5, t: "r" as const },
  { c: 6, t: "q" as const },
];
const NR_FREE = [
  { c: 3, t: "p" as const },
  { c: 4, t: "k" as const },
];
function NobleRoutScene({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 700}>
      <BoardFrame>
        {/* the one move they still get */}
        <span className="gp-rout-grace absolute block rounded-full" style={{ left: "40%", top: `calc(${RK(3)} + 5%)`, width: "2.6%", height: "2.6%", border: `2px solid ${p2}`, animationDelay: dm(delayMs, 0) }} />
        {/* the bar toward the caster's side */}
        <span className="gp-rout-bar absolute block" style={{ left: "6%", top: `calc(${RK(5)} + 5.65% + var(--fx-side, 1) * 6.25%)`, width: "88%", height: "1.2%", background: tint(p2, 0.9), animationDelay: dm(delayMs, 220) }} />
        {NR_NOBLES.map((v, i) => (
          <span key={v.c} className="gp-rout-noble absolute block" style={{ ...sq(v.c, 5, 2), animationDelay: dm(delayMs, 380 + i * 60) }}>
            <Sil d={SIL[v.t]} fill={p0} stroke={p2} />
          </span>
        ))}
        {/* the way they run: back toward their own edge */}
        {NR_NOBLES.map((v, i) => (
          <span key={`a${v.c}`} className="gp-rout-back absolute block" style={{ left: `${v.c * 12.5 + 3.5}%`, top: `calc(${RK(6)} + 2%)`, width: "5.5%", height: "9%", animationDelay: dm(delayMs, 780 + i * 60) }}>
            <svg viewBox="0 0 6 9" className="block h-full w-full" style={{ transform: "scaleY(var(--fx-side, 1))" }} aria-hidden="true">
              <path d="M3 8.2 V1.4 M0.9 3.4 L3 1 L5.1 3.4" fill="none" stroke={p1} strokeWidth="0.9" {...SJ} />
            </svg>
          </span>
        ))}
        {/* pawns and the king still advance */}
        {NR_FREE.map((v, i) => (
          <span key={v.c} className="gp-rout-free absolute block" style={{ ...sq(v.c, 5, 2), animationDelay: dm(delayMs, 900 + i * 90) }}>
            <Sil d={SIL[v.t]} fill={FOE} stroke={p1} />
          </span>
        ))}
        {[0, 1, 2].map((i) => (
          <span key={i} className="gp-rout-pip absolute block rounded-full" style={{ left: `${45.2 + i * 3.6}%`, top: `calc(${RK(3)} + 5%)`, width: "2.4%", height: "2.4%", background: p2, animationDelay: dm(delayMs, 1150 + i * 100) }} />
        ))}
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "6%", top: RK(6), width: "88%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p2, 0.35)}, transparent)`, animationDelay: dm(delayMs, 1300) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- absolute_zero --------------------------------------------------------------
   "Freeze all of your opponent's pieces except their king and pawns for 2 of
   their turns. The cold outlives the ice: for their next 2 turns after the
   thaw, each of those pieces can only step a single square. Kings and pawns
   move freely throughout." A frost line runs along their rank; ice blocks
   close on the knight, bishop, rook and queen and the king and pawn beside
   them stay warm. Two snowflake pips, then the ice cracks away, each thawed
   piece is left with a one-square box drawn round it, and two more pips come
   up hollow: the cold that outlives the ice. */
const AZ_ROW = [
  { c: 1, t: "r" as const, ice: true },
  { c: 2, t: "n" as const, ice: true },
  { c: 3, t: "q" as const, ice: true },
  { c: 4, t: "k" as const, ice: false },
  { c: 5, t: "b" as const, ice: true },
  { c: 6, t: "p" as const, ice: false },
];
function AbsoluteZero({ palette, lead, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <IceBlockHit palette={palette} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 460}>
      {heavy(tier) && <Vignette delayMs={delayMs + 120} />}
      <BoardFrame>
        {AZ_ROW.map((v) => (
          <span key={v.c} className="gp-az-piece absolute block" style={{ ...sq(v.c, 5, 2), animationDelay: dm(delayMs, 0) }}>
            <Sil d={SIL[v.t]} fill={FOE} stroke={v.ice ? p0 : p1} />
          </span>
        ))}
        <span className="gp-az-line absolute block" style={{ left: "12.5%", top: `calc(${RK(5)} + 11%)`, width: "75%", height: "1.2%", background: `linear-gradient(90deg, ${tint(p1, 0.95)}, ${tint(p0, 0.85)})`, animationDelay: dm(delayMs, 60) }} />
        {AZ_ROW.filter((v) => v.ice).map((v, i) => (
          <span key={`i${v.c}`} className="gp-az-ice absolute block" style={{ ...sq(v.c, 5, 0.8), animationDelay: dm(delayMs, 240 + i * 70) }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M1 1.8 L8.6 0.8 L9.2 8.4 L1.6 9.2 Z" fill={tint(p0, 0.5)} stroke={tint(p1, 0.95)} strokeWidth="0.5" {...SJ} />
              <path d="M2.6 2.8 L4.4 2.5 M7.4 6.4 L6.6 8" stroke={tint(p1, 0.95)} strokeWidth="0.4" strokeLinecap="round" />
            </svg>
          </span>
        ))}
        {/* two turns frozen */}
        {[0, 1].map((i) => (
          <span key={`f${i}`} className="gp-az-flake absolute block" style={{ left: `${43.2 + i * 5}%`, top: `calc(${RK(3)} + 4%)`, width: "3.6%", height: "3.6%", animationDelay: dm(delayMs, 700 + i * 110) }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.6 V9.4 M1.2 2.8 L8.8 7.2 M8.8 2.8 L1.2 7.2" stroke={p0} strokeWidth="1" strokeLinecap="round" />
            </svg>
          </span>
        ))}
        {/* the thaw: the ice cracks off... */}
        {AZ_ROW.filter((v) => v.ice).map((v, i) => (
          <span
            key={`c${v.c}`}
            className="gp-az-shed absolute block"
            style={{ left: `${v.c * 12.5 + 3}%`, top: `calc(${RK(5)} + 3%)`, width: "3%", height: "4%", "--dx": i % 2 ? "140%" : "-140%", animationDelay: dm(delayMs, 1150 + i * 40) } as CSSProperties}
          >
            <svg viewBox="0 0 6 9" className="block h-full w-full" aria-hidden="true">
              <path d="M3 0.5 L5.2 4.5 L3 8.5 L0.8 4.5 Z" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="0.5" {...SJ} />
            </svg>
          </span>
        ))}
        {/* ...and the cold stays: one square in any direction */}
        {AZ_ROW.filter((v) => v.ice).map((v, i) => (
          <span
            key={`b${v.c}`}
            className="gp-az-box absolute block"
            style={{ left: `${(v.c - 1) * 12.5}%`, top: `calc(${RK(5)} - 12.5%)`, width: "37.5%", height: "37.5%", border: `1.5px dashed ${tint(p0, 0.9)}`, animationDelay: dm(delayMs, 1250 + i * 60) }}
          />
        ))}
        {[0, 1].map((i) => (
          <span key={`s${i}`} className="gp-az-pip absolute block rounded-full" style={{ left: `${53.2 + i * 3.6}%`, top: `calc(${RK(3)} + 4.6%)`, width: "2.4%", height: "2.4%", border: `2px solid ${p0}`, animationDelay: dm(delayMs, 1400 + i * 100) }} />
        ))}
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "12.5%", top: RK(5), width: "75%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p0, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1500) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- ban_hammer ----------------------------------------------------------------
   "Point at one enemy knight, bishop, or rook, and up to two enemy pieces of
   that type are permanently banned from the board." A reticle picks one of
   their knights, a thread runs to the other knight (same type), the gavel
   comes down on each in turn and a ban seal stamps the square as the piece
   is struck off. Their bishop and rook, a different type, are left alone. */
const BH_ROW = [
  { c: 1, t: "n" as const, ban: 0 },
  { c: 2, t: "b" as const, ban: -1 },
  { c: 4, t: "r" as const, ban: -1 },
  { c: 6, t: "n" as const, ban: 1 },
];
function BanHammerScene({ palette, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <BanHit palette={palette} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 620}>
      <BoardFrame>
        {BH_ROW.map((v) => (
          <span
            key={v.c}
            className={`${v.ban >= 0 ? "gp-bh-banned" : "gp-bh-spared"} absolute block`}
            style={{ ...sq(v.c, 5, 2), animationDelay: dm(delayMs, v.ban >= 0 ? 620 + v.ban * 360 : 0) }}
          >
            <Sil d={SIL[v.t]} fill={FOE} stroke={p1} />
          </span>
        ))}
        {/* point at one knight */}
        <span className="gp-bh-aim absolute block rounded-full" style={{ ...sq(1, 5, 0.5), border: `2px solid ${tint("#d6234f", 0.9)}`, animationDelay: dm(delayMs, 0) }} />
        {/* the same type elsewhere on the board is found too */}
        <span className="gp-bh-thread absolute block" style={{ left: "18.75%", top: `calc(${RK(5)} + 11%)`, width: "62.5%", height: "1%", background: `repeating-linear-gradient(90deg, ${tint(p0, 0.95)} 0 3%, transparent 3% 5%)`, animationDelay: dm(delayMs, 220) }} />
        {BH_ROW.filter((v) => v.ban >= 0).map((v) => (
          <span key={`g${v.c}`} className="gp-bh-gavel absolute block" style={{ left: `${v.c * 12.5 + 3}%`, top: `calc(${RK(6)} - 2%)`, width: "12%", height: "12%", transformOrigin: "85% 85%", animationDelay: dm(delayMs, 420 + v.ban * 360) }}>
            <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
              <rect x="1" y="1.6" width="6.4" height="3.6" rx="0.8" transform="rotate(-35 4.2 3.4)" fill={p1} stroke={FOE} strokeWidth="0.5" />
              <path d="M5.6 4.4 L10.6 10.6" stroke={p2} strokeWidth="1.1" strokeLinecap="round" />
            </svg>
          </span>
        ))}
        {BH_ROW.filter((v) => v.ban >= 0).map((v) => (
          <span key={`s${v.c}`} className="gp-bh-seal absolute block" style={{ ...sq(v.c, 5, 1), animationDelay: dm(delayMs, 600 + v.ban * 360) }}>
            <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
              <circle cx="10" cy="10" r="8.2" fill="rgba(214,35,79,0.16)" stroke="#d6234f" strokeWidth="1.8" />
              <path d="M4.4 15.6 L15.6 4.4" stroke="#d6234f" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
        ))}
        {/* two banned, no more */}
        {[0, 1].map((i) => (
          <span key={i} className="gp-bh-pip absolute block rounded-full" style={{ left: `${46.6 + i * 3.6}%`, top: `calc(${RK(3)} + 5%)`, width: "2.4%", height: "2.4%", background: "#d6234f", animationDelay: dm(delayMs, 1300 + i * 100) }} />
        ))}
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "6%", top: RK(5), width: "88%", height: "12.5%", background: "radial-gradient(closest-side, rgba(214,35,79,0.3), transparent)", animationDelay: dm(delayMs, 1450) }}
        />
      </BoardFrame>
    </Stage>
  );
}
/** The ban seal stamped on one struck-off piece. */
function BanHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [, p1] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="gp-bh-aim absolute block rounded-full" style={{ left: "6%", top: "6%", width: "88%", height: "88%", border: `2px solid ${tint(p1, 0.9)}`, animationDelay: dm(delayMs, 0) }} />
      <span className="gp-bh-seal absolute block" style={{ left: "10%", top: "10%", width: "80%", height: "80%", animationDelay: dm(delayMs, 160) }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <circle cx="10" cy="10" r="8.2" fill="rgba(214,35,79,0.16)" stroke="#d6234f" strokeWidth="1.8" />
          <path d="M4.4 15.6 L15.6 4.4" stroke="#d6234f" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
    </span>
  );
}

/* --- leaden_limbs ----------------------------------------------------------------
   "Your opponent may move each piece at most one square in any direction for
   their next 2 turns." Their queen, rook and bishop each show their long
   reach as rays, a lead weight drops onto each and the rays are cut back to
   a single square. Two pips for the two turns. */
const LL_PIECES = [
  { c: 1, t: "r" as const, rays: [0, 90, 180] },
  { c: 4, t: "q" as const, rays: [0, 45, 90, 135, 180] },
  { c: 6, t: "b" as const, rays: [45, 135] },
];
function LeadenLimbsScene({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 560}>
      <BoardFrame>
        {LL_PIECES.map((v) => (
          <span key={v.c} className="gp-ll-piece absolute block" style={{ ...sq(v.c, 5, 2), animationDelay: dm(delayMs, 0) }}>
            <Sil d={SIL[v.t]} fill={FOE} stroke={p1} />
          </span>
        ))}
        {/* each piece's long reach, then cut back to one square */}
        {LL_PIECES.flatMap((v) =>
          v.rays.map((a) => (
            <span
              key={`${v.c}-${a}`}
              className="gp-ll-ray absolute block"
              style={
                {
                  left: `${v.c * 12.5 + 6.25}%`,
                  top: `calc(${RK(5)} + 5.75%)`,
                  width: a % 90 ? "53%" : "37.5%",
                  height: "1%",
                  transformOrigin: "0% 50%",
                  rotate: `calc(var(--fx-side, 1) * ${a}deg)`,
                  background: `linear-gradient(90deg, ${tint(p1, 0.9)}, ${tint(p1, 0.2)})`,
                  animationDelay: dm(delayMs, 80),
                } as CSSProperties
              }
            />
          )),
        )}
        {LL_PIECES.map((v, i) => (
          <span key={`w${v.c}`} className="gp-ll-weight absolute block" style={{ left: `${v.c * 12.5 + 3.5}%`, top: `calc(${RK(5)} + 5%)`, width: "5.5%", height: "6.5%", animationDelay: dm(delayMs, 460 + i * 90) }}>
            <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
              <path d="M3.4 4 V3 A1.6 1.6 0 0 1 6.6 3 V4" fill="none" stroke={p2} strokeWidth="1" strokeLinecap="round" />
              <circle cx="5" cy="7.4" r="3.6" fill={p0} stroke={p2} strokeWidth="0.6" />
              <path d="M3.4 6 C3.8 5.3 4.6 5 5.3 5.3" fill="none" stroke={tint(p1, 0.9)} strokeWidth="0.5" strokeLinecap="round" />
            </svg>
          </span>
        ))}
        {/* what is left: one square in any direction */}
        {LL_PIECES.map((v, i) => (
          <span
            key={`b${v.c}`}
            className="gp-ll-box absolute block"
            style={{ left: `${(v.c - 1) * 12.5}%`, top: `calc(${RK(5)} - 12.5%)`, width: "37.5%", height: "37.5%", border: `2px solid ${tint(p1, 0.9)}`, animationDelay: dm(delayMs, 700 + i * 90) }}
          />
        ))}
        {[0, 1].map((i) => (
          <span key={i} className="gp-ll-pip absolute block rounded-full" style={{ left: `${47 + i * 3.6}%`, top: `calc(${RK(3)} + 5%)`, width: "2.4%", height: "2.4%", background: p1, animationDelay: dm(delayMs, 1200 + i * 100) }} />
        ))}
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "6%", top: RK(5), width: "88%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p0, 0.45)}, transparent)`, animationDelay: dm(delayMs, 1350) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- lost_fortnight --------------------------------------------------------------
   "Your opponent skips their next turn, and 20 seconds are struck off their
   clock." On the opponent's side a tear-off calendar shows their next turn;
   the leaf is crossed out and torn away, and beside it their clock face loses
   a twenty-second wedge (a third of the dial), which drops off the board. */
function LostFortnightScene({ palette, glyph, lead, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 700}>
      {heavy(tier) && <Vignette delayMs={delayMs + 120} />}
      <BoardFrame>
        {/* the calendar and the leaf for their next turn */}
        <span className="gp-lf-pad absolute block" style={{ left: "26%", top: `calc(${EDGE.enemy} - 3%)`, width: "15%", height: "18%", animationDelay: dm(delayMs, 0) }}>
          <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
            <rect x="0.6" y="1" width="8.8" height="10.4" rx="0.6" fill={tint(p1, 0.9)} stroke={p0} strokeWidth="0.5" />
            <path d="M0.6 3.4 H9.4" stroke={p0} strokeWidth="0.6" />
          </svg>
        </span>
        <span className="gp-lf-leaf absolute block" style={{ left: "26%", top: `calc(${EDGE.enemy} - 3%)`, width: "15%", height: "18%", transformOrigin: "50% 8%", animationDelay: dm(delayMs, 0) }}>
          <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
            <rect x="0.6" y="1" width="8.8" height="10.4" rx="0.6" fill="#f4f6ff" stroke={p0} strokeWidth="0.5" />
            <path d="M0.6 3.4 H9.4" stroke={p0} strokeWidth="0.6" />
            <path d="M5 5 V9.6 M4 5.8 L5 5" fill="none" stroke={p0} strokeWidth="0.7" strokeLinecap="round" />
          </svg>
          {/* crossed out a beat before it is torn away */}
          <span className="gp-lf-cross absolute block" style={{ left: "10%", top: "24%", width: "80%", height: "66%", animationDelay: dm(delayMs, 360) }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M1 1 L9 9 M9 1 L1 9" stroke="#c94a3a" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </span>
        </span>
        {/* their clock, and the twenty seconds cut out of it */}
        <span className="gp-lf-dial absolute block" style={{ left: "55%", top: `calc(${EDGE.enemy} - 2%)`, width: "16%", height: "16%", animationDelay: dm(delayMs, 100) }}>
          <svg viewBox="0 0 16 16" className="block h-full w-full" aria-hidden="true">
            <circle cx="8" cy="8" r="7.2" fill={tint(p1, 0.85)} stroke={p0} strokeWidth="0.7" />
            <path d="M8 8 V2.4" stroke={p0} strokeWidth="0.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className="gp-lf-wedge absolute block" style={{ left: "55%", top: `calc(${EDGE.enemy} - 2%)`, width: "16%", height: "16%", animationDelay: dm(delayMs, 700) }}>
          <svg viewBox="0 0 16 16" className="block h-full w-full" aria-hidden="true">
            <path d="M8 8 L8 0.8 A7.2 7.2 0 0 1 14.24 11.6 Z" fill={p2} stroke={p0} strokeWidth="0.6" {...SJ} />
          </svg>
        </span>
        <span className="gp-lf-minus absolute block" style={{ left: "72%", top: `calc(${EDGE.enemy} + 1%)`, width: "9%", height: "6%", animationDelay: dm(delayMs, 760) }}>
          <svg viewBox="0 0 12 8" className="block h-full w-full" aria-hidden="true">
            <path d="M0.8 4 H3.2" stroke="#c94a3a" strokeWidth="1" strokeLinecap="round" />
            <text x="7.6" y="6.2" textAnchor="middle" fontSize="6" fontWeight="700" fontFamily="Georgia, serif" fill="#c94a3a">20</text>
          </svg>
        </span>
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "24%", top: EDGE.enemy, width: "52%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p0, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1350) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- sabbatical ------------------------------------------------------------------
   "Free action: suspend your nerf for your next 10 turns, used at the moment
   you choose, but your next draft is skipped." The caster's nerf card is
   laid in a hammock slung across their side and sways there while ten ticks
   fill in round it; then the draft slot beside it gets a bar across it: the
   next draft is the price. */
const TEN_TICKS = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
  return { x: 50 + Math.cos(a) * 19, y: Math.sin(a) * 19 };
});
function SabbaticalScene({ palette, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <HammockHit palette={palette} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 520}>
      <BoardFrame>
        {/* the hammock across the caster's side, the nerf card asleep in it */}
        <span className="gp-sb-sway absolute block" style={{ left: "34%", top: `calc(${EDGE.own} - 2%)`, width: "32%", height: "16%", transformOrigin: "50% 0%", animationDelay: dm(delayMs, 120) }}>
          <svg viewBox="0 0 32 16" className="block h-full w-full" aria-hidden="true">
            <path d="M1.5 1 V15 M30.5 1 V15" stroke={p0} strokeWidth="1.2" strokeLinecap="round" />
            <path d="M1.5 3 C9 13 23 13 30.5 3" fill="none" stroke={p2} strokeWidth="1.1" strokeLinecap="round" />
            <g transform="translate(12 3.2) rotate(-72 4 5.5)">
              <rect x="0.5" y="0.5" width="8" height="11" rx="1" fill={p1} stroke={p0} strokeWidth="0.6" />
              <path d="M4.5 3.4 V8.2 M2.9 6.6 L4.5 8.4 L6.1 6.6" fill="none" stroke={p0} strokeWidth="0.7" {...SJ} />
            </g>
            <path d="M5.5 6 C11 11.4 21 11.4 26.5 6" fill="none" stroke={p2} strokeWidth="0.6" strokeLinecap="round" />
          </svg>
        </span>
        {/* ten turns, ticking in round it */}
        {TEN_TICKS.map((t, i) => (
          <span
            key={i}
            className="gp-sb-tick absolute block rounded-full"
            style={{ left: `${t.x - 1.1}%`, top: `calc(${EDGE.own} + ${6.25 + t.y * 0.6 - 1.1}%)`, width: "2.2%", height: "2.2%", background: p0, animationDelay: dm(delayMs, 320 + i * 55) }}
          />
        ))}
        {[0, 1, 2].map((z) => (
          <span key={z} className="gp-zrise absolute block" style={{ left: `${47 + z * 3.4}%`, top: `calc(${EDGE.own} - ${4 + z * 3}%)`, width: `${3.2 - z * 0.6}%`, height: `${3.2 - z * 0.6}%`, animationDelay: dm(delayMs, 700 + z * 220) }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M2 2 H8 L2 8 H8" fill="none" stroke={p1} strokeWidth="1.3" {...SJ} />
            </svg>
          </span>
        ))}
        {/* the price: the next draft slot is barred */}
        <span className="gp-sb-slot absolute block" style={{ left: "74%", top: EDGE.own, width: "9%", height: "12.5%", animationDelay: dm(delayMs, 900) }}>
          <CardArt face={tint(p1, 0.5)} edge={p0} />
        </span>
        <span className="gp-sb-bar absolute block" style={{ left: "72.5%", top: `calc(${EDGE.own} + 5.6%)`, width: "12%", height: "1.4%", background: "#c94a3a", animationDelay: dm(delayMs, 1250) }} />
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "32%", top: EDGE.own, width: "36%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p2, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1350) }}
        />
      </BoardFrame>
    </Stage>
  );
}
/** The nerf card set down to rest, for a targeted render. */
function HammockHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="gp-sb-sway absolute block" style={{ left: "10%", top: "30%", width: "80%", height: "44%", transformOrigin: "50% 0%", animationDelay: dm(delayMs, 0) }}>
        <svg viewBox="0 0 32 16" className="block h-full w-full" aria-hidden="true">
          <path d="M1.5 3 C9 13 23 13 30.5 3" fill="none" stroke={p2} strokeWidth="1.3" strokeLinecap="round" />
          <rect x="11" y="4" width="10" height="5" rx="0.8" fill={p1} stroke={p0} strokeWidth="0.6" />
        </svg>
      </span>
      <span className="gp-zrise absolute block" style={{ left: "58%", top: "10%", width: "22%", height: "22%", animationDelay: dm(delayMs, 260) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M2 2 H8 L2 8 H8" fill="none" stroke={p1} strokeWidth="1.3" {...SJ} />
        </svg>
      </span>
    </span>
  );
}

/* =============================================================================
   PER-CARD SCENES (slice TC-god). These cards used to share a template (a
   deity, an idol, a colossus) with one small flourish of their own; each now
   plays a scene that draws its rule on the squares the rule names. Board
   geometry rides `BoardFrame` (0..100% is exactly the board, one square is
   12.5%), and anything that depends on whose side is whose leans on
   --fx-side (+1 when the caster sits at the bottom of the screen), so the
   same scene is right for either player.
   ========================================================================== */

/** Inline delay for the per-card scenes: the queue's stagger arrives as
 * delayMs, and the scene's own offset scales with --fx-dur. */
function dm(delayMs: number, off: number): string {
  return `calc(${delayMs}ms + ${off}ms * var(--fx-dur, 1))`;
}

/** Board rows, as BoardFrame percentages, for rule geometry that names ranks. */
const ROW = {
  /** Top of the opponent's back rank. */
  enemyBack: "calc(43.75% - var(--fx-side, 1) * 43.75%)",
  /** Top of the caster's half (four ranks tall). */
  ownHalf: "calc(25% + var(--fx-side, 1) * 25%)",
  /** Top of the opponent's own 4th to 6th ranks (three ranks tall). */
  enemyMid: "calc(31.25% + var(--fx-side, 1) * 6.25%)",
} as const;

/** Light-square centres in an 0 0 8 8 box. The top-left square is light from
 * either player's view (a8 for white, h1 for black), so this is view-proof. */
const LIGHT_SQ: [number, number][] = [];
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 0) LIGHT_SQ.push([c + 0.5, r + 0.5]);
const STAR_PATH = LIGHT_SQ.map(([x, y]) => `M${x} ${y - 0.3} L${x + 0.08} ${y - 0.08} L${x + 0.3} ${y} L${x + 0.08} ${y + 0.08} L${x} ${y + 0.3} L${x - 0.08} ${y + 0.08} L${x - 0.3} ${y} L${x - 0.08} ${y - 0.08} Z`).join(" ");
const FROST_PATH = LIGHT_SQ.map(([x, y]) => `M${x - 0.22} ${y} H${x + 0.22} M${x - 0.11} ${y - 0.19} L${x + 0.11} ${y + 0.19} M${x + 0.11} ${y - 0.19} L${x - 0.11} ${y + 0.19}`).join(" ");
/** The chart's lines: both diagonal families through the light squares. */
const CHART_PATH = (() => {
  const seg: string[] = [];
  for (let k = -6; k <= 6; k += 2) {
    const c0 = Math.max(0, -k);
    const c1 = Math.min(7, 7 - k);
    seg.push(`M${c0 + 0.5} ${c0 + k + 0.5} L${c1 + 0.5} ${c1 + k + 0.5}`);
  }
  for (let k = 2; k <= 12; k += 2) {
    const c0 = Math.max(0, k - 7);
    const c1 = Math.min(7, k);
    seg.push(`M${c0 + 0.5} ${k - c0 + 0.5} L${c1 + 0.5} ${k - c1 + 0.5}`);
  }
  return seg.join(" ");
})();

/** A horizontal run of chain links (side view), stretched to its box. */
function ChainRun({ steel, edge }: { steel: string; edge: string }) {
  return (
    <svg viewBox="0 0 40 7" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
      {[4, 12, 20, 28, 36].map((x) => (
        <ellipse key={x} cx={x} cy="3.5" rx="3.6" ry="2.4" fill="none" stroke={steel} strokeWidth="1.3" />
      ))}
      {[8, 16, 24, 32].map((x) => (
        <rect key={x} x={x - 2.4} y="2.8" width="4.8" height="1.4" rx="0.7" fill={edge} />
      ))}
    </svg>
  );
}

/* --- world_lock ------------------------------------------------------------
   "Your opponent cannot move any piece into your half for their next 3 turns."
   The border between the halves is scored, two chain runs haul in from the
   board edges and meet under a padlock that drops and clicks shut, and the
   enemy's advances run at the chain and are thrown back to their own side.
   Three pips under the lock are the three turns. */
const REPEL_X = [14, 30, 70, 86];
function WorldLockScene({ palette, glyph, lead, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 600}>
      {heavy(tier) && <Vignette delayMs={delayMs + 120} />}
      <BoardFrame>
        <span className="gp-wl-score absolute block" style={{ left: "0%", top: "49.4%", width: "100%", height: "1.2%", background: tint(p2, 0.95), animationDelay: dm(delayMs, 0) }} />
        {[
          { l: 0, from: "-100%" },
          { l: 50, from: "100%" },
        ].map((c, i) => (
          <span
            key={i}
            className="gp-wl-chain absolute block"
            style={{ left: `${c.l}%`, top: "46.6%", width: "50%", height: "6.8%", "--gp-from": c.from, animationDelay: dm(delayMs, 160 + i * 40) } as CSSProperties}
          >
            <ChainRun steel={p0} edge={tint(p1, 0.9)} />
          </span>
        ))}
        {/* the enemy's advances meet the chain and are thrown back */}
        {REPEL_X.map((x, i) => (
          <span
            key={x}
            className="gp-wl-repel absolute block"
            style={{ left: `${x - 3}%`, top: "calc(45% - var(--fx-side, 1) * 11%)", width: "6%", height: "10%", animationDelay: dm(delayMs, 620 + i * 70) }}
          >
            <svg viewBox="0 0 6 10" className="block h-full w-full" style={{ transform: "scaleY(var(--fx-side, 1))" }} aria-hidden="true">
              <path d="M3 0.8 V7 M0.8 5 L3 8.6 L5.2 5" fill="none" stroke={tint(p1, 0.95)} strokeWidth="1.1" {...SJ} />
            </svg>
          </span>
        ))}
        {/* the padlock drops onto the join, then the shackle clicks home */}
        <span className="gp-wl-shackle absolute block" style={{ left: "45.2%", top: "35.2%", width: "9.6%", height: "9%", animationDelay: dm(delayMs, 380) }}>
          <svg viewBox="0 0 10 9" className="block h-full w-full" aria-hidden="true">
            <path d="M1.8 9 V4.6 A3.2 3.2 0 0 1 8.2 4.6 V9" fill="none" stroke={p0} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <span className="gp-wl-lock absolute block" style={{ left: "43%", top: "42%", width: "14%", height: "14%", animationDelay: dm(delayMs, 340) }}>
          <svg viewBox="0 0 14 14" className="block h-full w-full" aria-hidden="true">
            <rect x="1" y="1" width="12" height="12" rx="1.6" fill={p0} stroke={tint(p1, 0.9)} strokeWidth="0.8" />
            <circle cx="7" cy="6" r="1.5" fill={p2} />
            <path d="M7 6.8 V10" stroke={p2} strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </span>
        {/* three turns */}
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="gp-wl-pip absolute block rounded-full"
            style={{ left: `${45.2 + i * 3.6}%`, top: "57.5%", width: "2.4%", height: "2.4%", background: p2, animationDelay: dm(delayMs, 900 + i * 110) }}
          />
        ))}
        {/* settle: a glint runs the length of the chain */}
        <span
          className="gp-wl-glint absolute block"
          style={{ left: "0%", top: "47.5%", width: "10%", height: "5%", background: `linear-gradient(90deg, transparent, ${tint(p2, 0.9)}, transparent)`, animationDelay: dm(delayMs, 1150) }}
        />
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "38%", top: "40%", width: "24%", height: "20%", background: `radial-gradient(closest-side, ${tint(p1, 0.45)}, transparent)`, animationDelay: dm(delayMs, 1300) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- celestial_alignment ---------------------------------------------------
   "Every enemy piece except the king standing on a light square is frozen for
   2 of their turns." Night falls over the board and the moon crosses it; a
   star lands on every LIGHT square and nowhere else, the chart's lines join
   them along both diagonals, and the stars harden into frost marks. Two moon
   pips are the two turns. Each frozen piece gets its own star (target cut). */
function CelestialAlignmentScene({ palette, glyph, lead, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="gp-focus absolute block rounded-full" style={{ left: "10%", top: "10%", width: "80%", height: "80%", border: `2px solid ${tint(p1, 0.9)}`, animationDelay: dm(delayMs, 0) }} />
        <span className="gp-pop absolute block" style={{ left: "26%", top: "22%", width: "48%", height: "48%", animationDelay: dm(delayMs, 180) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0.6 L6 4 L9.4 5 L6 6 L5 9.4 L4 6 L0.6 5 L4 4 Z" fill={p2} stroke={p0} strokeWidth="0.5" {...SJ} />
          </svg>
        </span>
        <span className="gp-ca-frost absolute block" style={{ left: "8%", top: "8%", width: "84%", height: "84%", animationDelay: dm(delayMs, 420) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M1 5 H9 M3 1.5 L7 8.5 M7 1.5 L3 8.5" stroke={tint(p1, 0.9)} strokeWidth="0.5" strokeLinecap="round" />
          </svg>
        </span>
        {[0, 1].map((i) => (
          <span key={i} className="gp-ca-pip absolute block rounded-full" style={{ left: `${36 + i * 18}%`, top: "80%", width: "11%", height: "11%", background: p1, animationDelay: dm(delayMs, 640 + i * 120) }} />
        ))}
      </span>
    );
  }
  return (
    <Stage quakeMs={delayMs + 700}>
      {heavy(tier) && <Vignette delayMs={delayMs + 120} />}
      <BoardFrame>
        <span className="gp-ca-night absolute inset-0 block" style={{ background: tint(p0, 0.42), animationDelay: dm(delayMs, 0) }} />
        {/* the moon crosses the opponent's sky */}
        <span className="gp-ca-moon absolute block" style={{ left: "44%", top: "calc(45% - var(--fx-side, 1) * 38%)", width: "11%", height: "11%", animationDelay: dm(delayMs, 90) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M6.6 1 A4.2 4.2 0 1 0 6.6 9 A3.4 3.4 0 1 1 6.6 1 Z" fill={tint(p1, 0.95)} stroke={p2} strokeWidth="0.4" />
          </svg>
        </span>
        {/* a star on every light square, and only there */}
        <span className="gp-ca-stars absolute inset-0 block" style={{ animationDelay: dm(delayMs, 220) }}>
          <svg viewBox="0 0 8 8" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d={STAR_PATH} fill={p2} />
          </svg>
        </span>
        <span className="gp-ca-lines absolute inset-0 block" style={{ animationDelay: dm(delayMs, 420) }}>
          <svg viewBox="0 0 8 8" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d={CHART_PATH} fill="none" stroke={tint(p1, 0.6)} strokeWidth="0.035" strokeLinecap="round" />
          </svg>
        </span>
        {/* the stars harden into frost marks: the hold */}
        <span className="gp-ca-frost absolute inset-0 block" style={{ animationDelay: dm(delayMs, 760) }}>
          <svg viewBox="0 0 8 8" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d={FROST_PATH} fill="none" stroke={tint(p1, 0.95)} strokeWidth="0.06" strokeLinecap="round" />
          </svg>
        </span>
        {/* two turns */}
        {[0, 1].map((i) => (
          <span
            key={i}
            className="gp-ca-pip absolute block rounded-full"
            style={{ left: `${46 + i * 5}%`, top: "calc(52% - var(--fx-side, 1) * 29%)", width: "3%", height: "3%", background: p2, animationDelay: dm(delayMs, 980 + i * 120) }}
          />
        ))}
        {/* settle: a shimmer runs down the diagonals */}
        <span
          className="gp-ca-sweep absolute block"
          style={{ left: "0%", top: "0%", width: "100%", height: "100%", background: `linear-gradient(135deg, transparent 44%, ${tint(p2, 0.35)} 50%, transparent 56%)`, animationDelay: dm(delayMs, 1200) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- walnut_court ------------------------------------------------------------
   "Every enemy piece except the king still on its own back rank turns into a
   walnut for 3 of their turns." The court is called to order: a wooden bench
   rail runs the opponent's back rank, the gavel falls twice, and the bark
   hardening rolls down that rank a square at a time. Each piece it takes gets
   two shell halves clamped shut on it with a gold seam (target cut). */
const CHIPS = [
  { dx: "-160%", dy: "180%", d: 0 },
  { dx: "40%", dy: "240%", d: 40 },
  { dx: "190%", dy: "150%", d: 80 },
];
function WalnutCourtScene({ palette, glyph, lead, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <ShellClampHit shell={p0} light={p1} seam={p2} delayMs={delayMs} turns={3} />;
  return (
    <Stage quakeMs={delayMs + 660}>
      {heavy(tier) && <Vignette delayMs={delayMs + 120} />}
      <BoardFrame>
        <span
          className="gp-wc-bench absolute block"
          style={{ left: "0%", top: ROW.enemyBack, width: "100%", height: "12.5%", background: `linear-gradient(90deg, ${tint(p0, 0.5)}, ${tint(p1, 0.35)} 50%, ${tint(p0, 0.5)})`, animationDelay: dm(delayMs, 0) }}
        >
          <svg viewBox="0 0 80 10" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d="M0 2 C20 1 40 3 80 2 M0 8 C24 9 50 7 80 8 M0 5 C18 4.4 46 5.8 80 5" fill="none" stroke={tint(p0, 0.95)} strokeWidth="0.5" />
          </svg>
        </span>
        {/* the gavel, struck on the rank's end */}
        <span
          className="gp-wc-gavel absolute block"
          style={{ left: "84%", top: "calc(43.75% - var(--fx-side, 1) * 43.75% - 1%)", width: "14%", height: "14%", transformOrigin: "90% 90%", animationDelay: dm(delayMs, 120) }}
        >
          <svg viewBox="0 0 14 14" className="block h-full w-full" aria-hidden="true">
            <path d="M5.4 6.2 L12.6 13" stroke={p1} strokeWidth="1.4" strokeLinecap="round" />
            <rect x="0.8" y="1.4" width="8" height="4.4" rx="1" transform="rotate(45 4.8 3.6)" fill={p0} stroke={p2} strokeWidth="0.6" />
          </svg>
        </span>
        {CHIPS.map((c, i) => (
          <span
            key={i}
            className="gp-wc-chip absolute block"
            style={{ left: "86%", top: "calc(47% - var(--fx-side, 1) * 43.75%)", width: "2.4%", height: "2.4%", background: p1, "--dx": c.dx, "--dy": `calc(${c.dy} * var(--fx-side, 1))`, animationDelay: dm(delayMs, 660 + c.d) } as CSSProperties}
          />
        ))}
        {/* the hardening rolls along the rank, square by square */}
        <span className="gp-wc-bark absolute block" style={{ left: "0%", top: ROW.enemyBack, width: "12.5%", height: "12.5%", animationDelay: dm(delayMs, 560) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <ellipse cx="5" cy="5.4" rx="3.8" ry="4" fill={tint(p0, 0.85)} stroke={p2} strokeWidth="0.5" />
            <path d="M5 1.6 C4 3.4 6 5.4 5 9.2" fill="none" stroke={p2} strokeWidth="0.5" />
          </svg>
        </span>
        {/* three turns, tallied beside the bench */}
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="gp-wc-pip absolute block rounded-full"
            style={{ left: `${44.5 + i * 4}%`, top: "calc(48.5% - var(--fx-side, 1) * 33%)", width: "3%", height: "3%", background: p0, border: `1px solid ${p2}`, animationDelay: dm(delayMs, 1000 + i * 110) }}
          />
        ))}
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "20%", top: ROW.enemyBack, width: "60%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p2, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1400) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/** Per-square walnut: two shell halves close on the piece, a gold seam flashes
 * down the join, and the turn count sits under the square. `shell` / `light`
 * / `seam` are the card's own three colours. */
function ShellClampHit({ shell, light, seam, delayMs, turns }: { shell: string; light: string; seam: string; delayMs: number; turns: number }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="gp-focus absolute block rounded-full" style={{ left: "8%", top: "8%", width: "84%", height: "84%", border: `2px solid ${tint(seam, 0.85)}`, animationDelay: dm(delayMs, 0) }} />
      {[
        { l: 8, from: "-70%", tilt: "-24deg", d: "M9 1 C3 1 1 4 1 7 C1 10 4 13 9 13 Z" },
        { l: 50, from: "70%", tilt: "24deg", d: "M0 1 C6 1 8 4 8 7 C8 10 5 13 0 13 Z" },
      ].map((h, i) => (
        <span
          key={i}
          className="gp-wc-shell absolute block"
          style={{ left: `${h.l}%`, top: "10%", width: "42%", height: "80%", "--gp-from": h.from, "--gp-tilt": h.tilt, animationDelay: dm(delayMs, 160) } as CSSProperties}
        >
          <svg viewBox="0 0 9 14" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d={h.d} fill={tint(shell, 0.92)} stroke={light} strokeWidth="0.5" {...SJ} />
            <path d={i === 0 ? "M6 3 C4 5 6 8 4 11" : "M3 3 C5 5 3 8 5 11"} fill="none" stroke={tint(light, 0.7)} strokeWidth="0.4" />
          </svg>
        </span>
      ))}
      <span className="gp-wc-seam absolute block" style={{ left: "48%", top: "12%", width: "4%", height: "76%", background: seam, animationDelay: dm(delayMs, 540) }} />
      {Array.from({ length: turns }, (_, i) => (
        <span
          key={i}
          className="gp-wc-pip absolute block rounded-full"
          style={{ left: `${50 - turns * 6 + i * 12 + 1}%`, top: "86%", width: "10%", height: "10%", background: seam, animationDelay: dm(delayMs, 720 + i * 90) }}
        />
      ))}
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{ left: "20%", top: "20%", width: "60%", height: "60%", background: `radial-gradient(closest-side, ${tint(seam, 0.4)}, transparent)`, "--gp-drift": "calc(var(--fx-side, 1) * 6%)", animationDelay: dm(delayMs, 900) } as CSSProperties}
      />
    </span>
  );
}

/* --- scorched_earth ----------------------------------------------------------
   "Your opponent cannot move any piece onto their own 4th, 5th, or 6th ranks
   for their next 3 turns, except the first piece to try." Heat lines mark the
   edges of exactly those three ranks, the band chars, flames stand up along
   it, three brand strokes burn in, and one footprint crosses the band once
   (the first piece's one step) before the ban takes hold. */
const FLAME_X = [4, 20, 36, 52, 68, 84];
const SE_EMBERS = [
  { l: 22, dx: "-60%", d: 0 },
  { l: 50, dx: "40%", d: 90 },
  { l: 76, dx: "-30%", d: 180 },
];
function ScorchedEarthScene({ palette, glyph, lead, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 520}>
      {heavy(tier) && <Vignette delayMs={delayMs + 120} />}
      <BoardFrame>
        {/* tell: the band's two edges shimmer with heat */}
        {["0%", "37.5%"].map((dy, i) => (
          <span
            key={i}
            className="gp-se-heat absolute block"
            style={{ left: "0%", top: `calc(${ROW.enemyMid} + ${dy} - 0.6%)`, width: "100%", height: "1.2%", background: tint(p2, 0.95), animationDelay: dm(delayMs, i * 60) }}
          />
        ))}
        <span
          className="gp-se-char absolute block"
          style={{ left: "0%", top: ROW.enemyMid, width: "100%", height: "37.5%", background: `linear-gradient(180deg, ${tint(p1, 0.55)}, ${tint(p0, 0.28)} 50%, ${tint(p1, 0.55)})`, animationDelay: dm(delayMs, 220) }}
        />
        {FLAME_X.map((x, i) => (
          <span
            key={x}
            className="gp-se-flame absolute block"
            style={{ left: `${x + 1}%`, top: `calc(${ROW.enemyMid} + 21%)`, width: "10%", height: "16%", animationDelay: dm(delayMs, 300 + i * 55) }}
          >
            <svg viewBox="0 0 10 16" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.6 C7.4 4 9.4 6.4 9.2 10 C9 13.6 7 15.4 5 15.4 C3 15.4 1 13.6 0.8 10 C0.8 7.4 2.6 6 3.4 3.6 C4 5.4 4.4 6.2 5.2 6.6 C5.6 4.6 5.4 2.6 5 0.6 Z" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="0.5" {...SJ} />
            </svg>
          </span>
        ))}
        {/* three turns, branded into the band's end */}
        <span className="gp-se-brand absolute block" style={{ left: "88%", top: `calc(${ROW.enemyMid} + 13%)`, width: "10%", height: "11%", animationDelay: dm(delayMs, 560) }}>
          <svg viewBox="0 0 10 11" className="block h-full w-full" aria-hidden="true">
            <path d="M2.2 1.4 V9.6 M5 1.4 V9.6 M7.8 1.4 V9.6" stroke={p2} strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
        {/* the first piece to try steps in once */}
        <span className="gp-se-step absolute block" style={{ left: "8%", top: `calc(${ROW.enemyMid} + 14%)`, width: "6%", height: "9%", animationDelay: dm(delayMs, 900) }}>
          <svg viewBox="0 0 6 9" className="block h-full w-full" aria-hidden="true">
            <path d="M3 0.8 C4.6 0.8 5 2.6 4.8 4.4 C4.6 6 4 7 3 7 C2 7 1.4 6 1.2 4.4 C1 2.6 1.4 0.8 3 0.8 Z M2.2 7.6 H3.8 V8.6 H2.2 Z" fill={tint(p2, 0.9)} />
          </svg>
        </span>
        {SE_EMBERS.map((e, i) => (
          <span
            key={i}
            className="gp-se-ember absolute block rounded-full"
            style={{ left: `${e.l}%`, top: `calc(${ROW.enemyMid} + 26%)`, width: "1.8%", height: "1.8%", background: p2, "--dx": e.dx, animationDelay: dm(delayMs, 1050 + e.d) } as CSSProperties}
          />
        ))}
      </BoardFrame>
    </Stage>
  );
}

/* --- blighted_furrows ---------------------------------------------------------
   "Every enemy pawn standing in your half rots away and is removed, and their
   remaining pawns cannot advance for their next 4 turns, though the first
   pawn to try may make one advance." Furrows are ploughed across YOUR half,
   rot creeps along them and the wheat wilts; a bramble with four knots grows
   along the border to hold the rest back, and one sprout pushes through it
   once. Each rotted pawn sags into the furrow (target cut). */
const WILT = [
  { x: 10, bend: "38deg" },
  { x: 36, bend: "-30deg" },
  { x: 62, bend: "34deg" },
  { x: 88, bend: "-40deg" },
];
const SPORES = [
  { l: 24, dx: "-40%", d: 0 },
  { l: 52, dx: "50%", d: 110 },
  { l: 78, dx: "-20%", d: 220 },
];
function BlightedFurrowsScene({ palette, glyph, lead, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="gp-focus absolute block rounded-full" style={{ left: "8%", top: "8%", width: "84%", height: "84%", border: `2px solid ${tint(p0, 0.85)}`, animationDelay: dm(delayMs, 0) }} />
        <span className="gp-bf-sag absolute block" style={{ left: "20%", top: "14%", width: "60%", height: "70%", animationDelay: dm(delayMs, 140) }}>
          <Sil d={SIL.p} fill={tint(p0, 0.85)} stroke={p2} />
        </span>
        <span className="gp-bf-rot absolute block" style={{ left: "6%", top: "76%", width: "88%", height: "12%", background: tint(p1, 0.7), animationDelay: dm(delayMs, 420) }} />
        {SPORES.slice(0, 2).map((s, i) => (
          <span key={i} className="gp-bf-spore absolute block rounded-full" style={{ left: `${30 + i * 32}%`, top: "60%", width: "9%", height: "9%", background: tint(p0, 0.8), "--dx": s.dx, animationDelay: dm(delayMs, 620 + s.d) } as CSSProperties} />
        ))}
      </span>
    );
  }
  return (
    <Stage quakeMs={delayMs + 560}>
      {heavy(tier) && <Vignette delayMs={delayMs + 120} />}
      <BoardFrame>
        {/* tell: the plough cuts four furrows across your half */}
        <span className="gp-bf-furrow absolute block" style={{ left: "0%", top: ROW.ownHalf, width: "100%", height: "50%", animationDelay: dm(delayMs, 0) }}>
          <svg viewBox="0 0 80 40" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d="M0 6 C20 4.6 60 7.4 80 6 M0 16 C24 17.4 56 14.6 80 16 M0 26 C20 24.6 60 27.4 80 26 M0 36 C24 37.4 56 34.6 80 36" fill="none" stroke={tint(p1, 0.95)} strokeWidth="1.1" />
          </svg>
        </span>
        <span
          className="gp-bf-rot absolute block"
          style={{ left: "0%", top: ROW.ownHalf, width: "100%", height: "50%", background: `linear-gradient(90deg, ${tint(p2, 0.5)}, ${tint(p0, 0.28)})`, animationDelay: dm(delayMs, 300) }}
        />
        {WILT.map((w, i) => (
          <span
            key={i}
            className="gp-bf-wilt absolute block"
            style={{ left: `${w.x - 3}%`, top: `calc(${ROW.ownHalf} + ${8 + i * 10}%)`, width: "6%", height: "12%", "--gp-bend": w.bend, animationDelay: dm(delayMs, 480 + i * 80) } as CSSProperties}
          >
            <svg viewBox="0 0 6 12" className="block h-full w-full" aria-hidden="true">
              <path d="M3 11.6 V3" stroke={p1} strokeWidth="0.7" strokeLinecap="round" />
              <path d="M3 1 C4.2 2 4.2 3.6 3 4.6 C1.8 3.6 1.8 2 3 1 Z M3 4.6 L4.6 5.8 M3 6 L1.4 7.2" fill={p0} stroke={p2} strokeWidth="0.4" {...SJ} />
            </svg>
          </span>
        ))}
        {/* the bramble along the border: their pawns cannot advance (four knots, four turns) */}
        <span className="gp-bf-thorn absolute block" style={{ left: "0%", top: "46%", width: "100%", height: "8%", animationDelay: dm(delayMs, 780) }}>
          <svg viewBox="0 0 80 8" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d="M0 4 L5 1.6 L10 6.4 L15 1.6 L20 6.4 L25 1.6 L30 6.4 L35 1.6 L40 6.4 L45 1.6 L50 6.4 L55 1.6 L60 6.4 L65 1.6 L70 6.4 L75 1.6 L80 4" fill="none" stroke={p2} strokeWidth="0.9" {...SJ} />
            {[12, 32, 48, 68].map((x) => (
              <circle key={x} cx={x} cy="4" r="1.6" fill={p1} stroke={p0} strokeWidth="0.5" />
            ))}
          </svg>
        </span>
        {/* the first pawn to try gets one advance through */}
        <span className="gp-bf-sprout absolute block" style={{ left: "22%", top: "43%", width: "4%", height: "8%", animationDelay: dm(delayMs, 1120) }}>
          <svg viewBox="0 0 4 8" className="block h-full w-full" aria-hidden="true">
            <path d="M2 7.8 V2.4 M2 3.4 C0.6 3 0.4 1.4 1 0.6 C1.8 1 2 2 2 3.4 M2 4.4 C3.4 4 3.6 2.4 3 1.6" fill="none" stroke={p0} strokeWidth="0.6" {...SJ} />
          </svg>
        </span>
        {SPORES.map((s, i) => (
          <span
            key={i}
            className="gp-bf-spore absolute block rounded-full"
            style={{ left: `${s.l}%`, top: `calc(${ROW.ownHalf} + 30%)`, width: "1.8%", height: "1.8%", background: tint(p0, 0.85), "--dx": `calc(${s.dx} * var(--fx-side, 1))`, animationDelay: dm(delayMs, 1000 + s.d) } as CSSProperties}
          />
        ))}
      </BoardFrame>
    </Stage>
  );
}

/* --- sealed_ramparts -----------------------------------------------------------
   "Your opponent's rooks are frozen for their next 2 turns, then for the rest
   of the game each rook may move at most three squares." A winch turns and a
   portcullis slams down; on every rook the bars drop over it with two bolts
   (the two frozen turns) and then its leash is drawn: a cross three squares
   long each way, capped, which is how far that rook may ever move again. */
const SR_DUST = [
  { l: 42, dx: "-120%", d: 0 },
  { l: 50, dx: "20%", d: 40 },
  { l: 58, dx: "130%", d: 80 },
];
function RampartLeash({ color, cap }: { color: string; cap: string }) {
  return (
    <svg viewBox="0 0 7 7" className="block h-full w-full" aria-hidden="true">
      <path d="M0.5 3.5 H6.5 M3.5 0.5 V6.5" stroke={color} strokeWidth="0.12" strokeDasharray="0.3 0.18" />
      <path d="M0.5 3 V4 M6.5 3 V4 M3 0.5 H4 M3 6.5 H4" stroke={cap} strokeWidth="0.22" strokeLinecap="round" />
      {[1.5, 2.5, 4.5, 5.5].map((v) => (
        <g key={v}>
          <circle cx={v} cy="3.5" r="0.1" fill={cap} />
          <circle cx="3.5" cy={v} r="0.1" fill={cap} />
        </g>
      ))}
    </svg>
  );
}
function PortcullisArt({ iron, deep }: { iron: string; deep: string }) {
  return (
    <svg viewBox="0 0 12 14" className="block h-full w-full" aria-hidden="true">
      <path d="M1.6 0.6 V11.6 M4.2 0.6 V12.6 M6.8 0.6 V12.6 M9.4 0.6 V11.6" stroke={iron} strokeWidth="1" strokeLinecap="round" />
      <path d="M0.8 3.4 H11.2 M0.8 7.4 H11.2" stroke={deep} strokeWidth="0.9" strokeLinecap="round" />
      <path d="M1.6 11.6 L1.1 13 M4.2 12.6 L3.8 13.6 M6.8 12.6 L7.2 13.6 M9.4 11.6 L9.9 13" stroke={iron} strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}
function SealedRampartsScene({ palette, lead, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) {
    return (
      <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
        <span className="gp-focus absolute block rounded-full" style={{ left: "8%", top: "8%", width: "84%", height: "84%", border: `2px solid ${tint(p2, 0.85)}`, animationDelay: dm(delayMs, 0) }} />
        <span className="gp-sr-gate absolute block" style={{ left: "12%", top: "4%", width: "76%", height: "88%", animationDelay: dm(delayMs, 120) }}>
          <PortcullisArt iron={p0} deep={p1} />
        </span>
        {[0, 1].map((i) => (
          <span key={i} className="gp-sr-pip absolute block rounded-full" style={{ left: `${34 + i * 22}%`, top: "84%", width: "11%", height: "11%", background: p2, animationDelay: dm(delayMs, 560 + i * 110) }} />
        ))}
        {/* the leash: three squares each way, no further */}
        <span className="gp-sr-reach absolute block" style={{ left: "-300%", top: "-300%", width: "700%", height: "700%", animationDelay: dm(delayMs, 820) }}>
          <RampartLeash color={tint(p2, 0.9)} cap={p2} />
        </span>
      </span>
    );
  }
  return (
    <Stage quakeMs={delayMs + 740}>
      {heavy(tier) && <Vignette delayMs={delayMs + 120} />}
      <Rake delayMs={delayMs + 300} tone={tint(p1, 0.5)} lean="calc(var(--fx-ox, 0) * 2.4%)" tip="calc(var(--fx-oy, 0) * 1.6%)" cy={60} width={26} />
      {/* tell: the winch turns and the chains pay out */}
      <span className="gp-sr-winch absolute block rounded-full" style={{ left: "33%", top: "33%", width: "7%", height: "7%", animationDelay: dm(delayMs, 0) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <circle cx="5" cy="5" r="4.2" fill="none" stroke={p0} strokeWidth="1" />
          <path d="M5 0.8 V9.2 M0.8 5 H9.2 M2 2 L8 8 M8 2 L2 8" stroke={p1} strokeWidth="0.6" strokeLinecap="round" />
        </svg>
      </span>
      <span className="gp-sr-gate absolute block" style={{ left: "40%", top: "36%", width: "20%", height: "24%", animationDelay: dm(delayMs, 200) }}>
        <PortcullisArt iron={p0} deep={p1} />
      </span>
      {SR_DUST.map((s, i) => (
        <span
          key={i}
          className="gp-sr-dust absolute block rounded-full"
          style={{ left: `${s.l - 1.5}%`, top: "57.5%", width: "3%", height: "3%", background: tint(p0, 0.7), "--dx": s.dx, animationDelay: dm(delayMs, 740 + s.d) } as CSSProperties}
        />
      ))}
      {[0, 1].map((i) => (
        <span key={i} className="gp-sr-pip absolute block rounded-full" style={{ left: `${46.5 + i * 4.5}%`, top: "62%", width: "2.6%", height: "2.6%", background: p2, animationDelay: dm(delayMs, 900 + i * 110) }} />
      ))}
      {/* the leash, centred on the cast square: three squares each way */}
      <span className="gp-sr-reach absolute block" style={{ left: "25%", top: "25%", width: "50%", height: "50%", animationDelay: dm(delayMs, 1080) }}>
        <RampartLeash color={tint(p2, 0.85)} cap={p2} />
      </span>
    </Stage>
  );
}

/* --- transcendence -----------------------------------------------------------
   "Suspend your nerf for your next 20 turns, then it returns. Your next draft
   shows three cards." The nerf's brand sits on the caster's edge, a stair of
   light rises from it, the brand lifts off and away across the board (it is
   suspended, not destroyed, so it leaves intact), a ring of twenty ticks
   closes round the board centre, and three cards fan open inside it. */
const TR_SPARKS = [
  { dx: "-220%", dy: "-300%", d: 0 },
  { dx: "60%", dy: "-380%", d: 60 },
  { dx: "260%", dy: "-260%", d: 120 },
];
const TWENTY_TICKS = Array.from({ length: 20 }, (_, i) => {
  const a = (i / 20) * Math.PI * 2;
  const r0 = i % 5 === 0 ? 8.2 : 8.8;
  return `M${(10 + Math.sin(a) * r0).toFixed(2)} ${(10 - Math.cos(a) * r0).toFixed(2)} L${(10 + Math.sin(a) * 9.6).toFixed(2)} ${(10 - Math.cos(a) * 9.6).toFixed(2)}`;
}).join(" ");
function TranscendenceScene({ palette, glyph, lead, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 640}>
      {heavy(tier) && <Vignette delayMs={delayMs + 120} />}
      <BoardFrame>
        {/* a stair of light rises from the caster's edge toward the centre */}
        <span className="gp-tr-stair absolute block" style={{ left: "40%", top: ROW.ownHalf, width: "20%", height: "50%", animationDelay: dm(delayMs, 0) }}>
          <svg viewBox="0 0 10 20" preserveAspectRatio="none" className="block h-full w-full" style={{ transform: "scaleY(var(--fx-side, 1))" }} aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <rect key={i} x={1 + i * 0.6} y={18 - i * 4} width={8 - i * 1.2} height="1.2" fill={tint(p1, 0.35 + i * 0.1)} />
            ))}
          </svg>
        </span>
        {/* the nerf's brand, lifted off the caster's edge and carried away */}
        <span className="gp-tr-lift absolute block" style={{ left: "44%", top: "calc(44% + var(--fx-side, 1) * 36%)", width: "12%", height: "12%", animationDelay: dm(delayMs, 60) }}>
          <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
            <circle cx="6" cy="6" r="5.2" fill="rgba(5,5,12,0.7)" stroke={p0} strokeWidth="0.8" />
            <path d="M6 2.6 V8.6 M3.6 6.4 L6 8.8 L8.4 6.4" fill="none" stroke={p0} strokeWidth="1" {...SJ} />
          </svg>
        </span>
        {/* twenty turns */}
        <span className="gp-tr-ring absolute block" style={{ left: "27%", top: "27%", width: "46%", height: "46%", animationDelay: dm(delayMs, 460) }}>
          <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
            <path d={TWENTY_TICKS} stroke={p1} strokeWidth="0.35" strokeLinecap="round" />
          </svg>
        </span>
        {/* the next draft shows three cards */}
        {["-20deg", "0deg", "20deg"].map((rot, i) => (
          <span
            key={i}
            className="gp-tr-card absolute block"
            style={{ left: "45.5%", top: "40%", width: "9%", height: "13%", "--rot": rot, animationDelay: dm(delayMs, 820 + i * 70) } as CSSProperties}
          >
            <svg viewBox="0 0 9 13" className="block h-full w-full" aria-hidden="true">
              <rect x="0.5" y="0.5" width="8" height="12" rx="1" fill={p2} stroke={p0} strokeWidth="0.6" />
              <path d="M4.5 3.4 L5.3 5.6 L7.4 6.2 L5.3 6.9 L4.5 9.1 L3.7 6.9 L1.6 6.2 L3.7 5.6 Z" fill={p1} />
            </svg>
          </span>
        ))}
        {TR_SPARKS.map((s, i) => (
          <span
            key={i}
            className="gp-tr-shard absolute block rounded-full"
            style={{ left: "49%", top: "49%", width: "2%", height: "2%", background: p1, "--dx": s.dx, "--dy": s.dy, animationDelay: dm(delayMs, 1180 + s.d) } as CSSProperties}
          />
        ))}
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "36%", top: "36%", width: "28%", height: "28%", background: `radial-gradient(closest-side, ${tint(p0, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1350) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- mass_mind_control ----------------------------------------------------------
   "Mark two enemy pieces of any type below queen. After your opponent's next
   move, any of them still in place defect to your side." Two eyes open over
   the cast square, their spiral irises turn, and two mind-threads run down
   the real aim vector to the marks. On each marked piece a marionette control
   bar is lowered on a string, a spiral turns on the piece, and an hourglass
   pip says the defection waits one move (target cut). */
function MindMarkHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, , p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="gp-focus absolute block rounded-full" style={{ left: "8%", top: "8%", width: "84%", height: "84%", border: `2px solid ${tint(p2, 0.85)}`, animationDelay: dm(delayMs, 0) }} />
      <span className="gp-mm-string absolute block" style={{ left: "49%", top: "-160%", width: "2%", height: "190%", background: tint(p2, 0.85), animationDelay: dm(delayMs, 120) }} />
      <span className="gp-mm-cross absolute block" style={{ left: "20%", top: "-178%", width: "60%", height: "30%", animationDelay: dm(delayMs, 120) }}>
        <svg viewBox="0 0 12 6" className="block h-full w-full" aria-hidden="true">
          <path d="M1 3 H11 M6 0.6 V5.4" stroke={p0} strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      </span>
      <span className="gp-mm-spiral absolute block" style={{ left: "18%", top: "18%", width: "64%", height: "64%", animationDelay: dm(delayMs, 360) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 5 C5 4.2 6 4.2 6 5 C6 6.2 4 6.4 3.8 5 C3.6 3.2 6.4 3 7 5 C7.6 7.4 4 8.2 2.8 6.4 C1.6 4.6 2.8 1.8 5.4 1.8 C7.8 1.8 9 4 8.6 6" fill="none" stroke={tint(p0, 0.9)} strokeWidth="0.6" strokeLinecap="round" />
        </svg>
      </span>
      <span className="gp-mm-pip absolute block" style={{ left: "70%", top: "66%", width: "22%", height: "26%", animationDelay: dm(delayMs, 700) }}>
        <svg viewBox="0 0 6 8" className="block h-full w-full" aria-hidden="true">
          <path d="M0.8 0.6 H5.2 M0.8 7.4 H5.2 M1.3 0.6 C1.3 3 4.7 3 4.7 4 C4.7 5 1.3 5 1.3 7.4 M4.7 0.6 C4.7 3 1.3 3 1.3 4 C1.3 5 4.7 5 4.7 7.4" fill="none" stroke={p2} strokeWidth="0.5" strokeLinecap="round" />
        </svg>
      </span>
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{ left: "20%", top: "20%", width: "60%", height: "60%", background: `radial-gradient(closest-side, ${tint(p0, 0.45)}, transparent)`, "--gp-drift": "calc(var(--fx-side, 1) * 8%)", animationDelay: dm(delayMs, 900) } as CSSProperties}
      />
    </span>
  );
}
function MassMindControlScene({ palette, lead, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <MindMarkHit palette={palette} delayMs={delayMs} />;
  return (
    <>
      <Stage quakeMs={delayMs + 560}>
        {heavy(tier) && <Vignette delayMs={delayMs + 120} />}
        {[37, 51].map((l, i) => (
          <span key={l} className="gp-mm-eye absolute block" style={{ left: `${l}%`, top: "45.5%", width: "12%", height: "8.4%", animationDelay: dm(delayMs, i * 50) }}>
            <svg viewBox="0 0 10 7" className="block h-full w-full" aria-hidden="true">
              <path d="M0.6 3.5 C3 0.2 7 0.2 9.4 3.5 C7 6.8 3 6.8 0.6 3.5 Z" fill={tint(p1, 0.9)} stroke={p0} strokeWidth="0.6" {...SJ} />
            </svg>
          </span>
        ))}
        {[37, 51].map((l, i) => (
          <span key={`s${l}`} className="gp-mm-spiral absolute block" style={{ left: `${l + 3.6}%`, top: "46.3%", width: "4.8%", height: "6.8%", animationDelay: dm(delayMs, 160 + i * 50) }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 5 C5 4.2 6 4.2 6 5 C6 6.2 4 6.4 3.8 5 C3.6 3.2 6.4 3 7 5 C7.6 7.4 4 8.2 2.8 6.4 C1.6 4.6 2.8 1.8 5.4 1.8 C7.8 1.8 9 4 8.6 6" fill="none" stroke={p2} strokeWidth="1" strokeLinecap="round" />
            </svg>
          </span>
        ))}
        <span className="gp-mm-cross absolute block" style={{ left: "43%", top: "37%", width: "14%", height: "7%", animationDelay: dm(delayMs, 720) }}>
          <svg viewBox="0 0 12 6" className="block h-full w-full" aria-hidden="true">
            <path d="M1 3 H11 M6 0.6 V5.4" stroke={p0} strokeWidth="1.1" strokeLinecap="round" />
          </svg>
        </span>
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "38%", top: "42%", width: "24%", height: "16%", background: `radial-gradient(closest-side, ${tint(p0, 0.45)}, transparent)`, animationDelay: dm(delayMs, 1200) }}
        />
      </Stage>
      {/* two mind-threads run down the real aim vector, as long as it is */}
      <AimStage>
        {[48.6, 51].map((t, i) => (
          <span
            key={t}
            className="gp-mm-thread absolute block"
            style={{
              left: "50%",
              top: `${t}%`,
              width: "calc(var(--fx-len, 2) * 7.142857%)",
              height: "0.8%",
              background: `repeating-linear-gradient(90deg, ${tint(p2, 0.95)} 0 1.2%, transparent 1.2% 2.2%)`,
              animationDelay: dm(delayMs, 320 + i * 80),
            }}
          />
        ))}
      </AimStage>
    </>
  );
}

/* --- draft and buff-theft cards -------------------------------------------------
   These rules have no square: they move cards between the two players. The
   scenes play them on the two sides of the board (the caster's side is the
   bottom when --fx-side is +1), so the direction of travel says who gains. */
const EDGE = {
  /** Top of a one-square-tall strip on the caster's side, two ranks in from
   * the edge. Not the edge rank itself: the shared cast banner sits across the
   * top ranks and would hide a card drawn there. */
  own: "calc(43.75% + var(--fx-side, 1) * 25%)",
  /** The same strip on the opponent's side. */
  enemy: "calc(43.75% - var(--fx-side, 1) * 25%)",
} as const;

/** A card face in a 0 0 9 12 box. `locked` adds a padlock (a locked-in
 * upgrade), `mark` a star in the middle. */
function CardArt({ face, edge, mark, locked }: { face: string; edge: string; mark?: string; locked?: string }) {
  return (
    <svg viewBox="0 0 9 12" className="block h-full w-full" aria-hidden="true">
      <rect x="0.5" y="0.5" width="8" height="11" rx="1" fill={face} stroke={edge} strokeWidth="0.6" />
      <rect x="1.5" y="1.5" width="6" height="9" rx="0.6" fill="none" stroke={tint(edge, 0.6)} strokeWidth="0.35" />
      {mark && <path d="M4.5 3.4 L5.2 5.4 L7.2 6 L5.2 6.6 L4.5 8.6 L3.8 6.6 L1.8 6 L3.8 5.4 Z" fill={mark} />}
      {locked && (
        <g>
          <path d="M3.3 6 V5 A1.2 1.2 0 0 1 5.7 5 V6" fill="none" stroke={locked} strokeWidth="0.6" />
          <rect x="2.8" y="6" width="3.4" height="2.8" rx="0.4" fill={locked} />
        </g>
      )}
    </svg>
  );
}

/* buff_plunder: "Steal two active buffs from your opponent. Locked-in
   upgrades stay put." A hand reaches across the board to the opponent's
   row of cards, two of them are carried back down to the caster's edge, and
   the padlocked one rattles and stays where it is. */
const BP_COINS = [
  { l: 36, dx: "-80%", d: 0 },
  { l: 50, dx: "20%", d: 50 },
  { l: 62, dx: "90%", d: 100 },
];
function BuffPlunderScene({ palette, glyph, lead, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 900}>
      {heavy(tier) && <Vignette delayMs={delayMs + 120} />}
      <BoardFrame>
        <span className="gp-bp-reach absolute block" style={{ left: "44%", top: EDGE.own, width: "12%", height: "12.5%", animationDelay: dm(delayMs, 0) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" style={{ transform: "scaleY(var(--fx-side, 1))" }} aria-hidden="true">
            <path d="M2.4 9.6 V4.6 C2.4 3.8 3.6 3.8 3.6 4.6 V2 C3.6 1.2 4.8 1.2 4.8 2 V1.4 C4.8 0.6 6 0.6 6 1.4 V2.2 C6 1.4 7.2 1.4 7.2 2.2 V6.6 C7.2 8.4 6.2 9.6 4.8 9.6 Z" fill={tint(p1, 0.85)} stroke={p0} strokeWidth="0.5" {...SJ} />
          </svg>
        </span>
        {[
          { l: 29, locked: false },
          { l: 45.5, locked: true },
          { l: 62, locked: false },
        ].map((c, i) => (
          <span
            key={i}
            className={`${c.locked ? "gp-bp-rattle" : "gp-bp-row"} absolute block`}
            style={{ left: `${c.l}%`, top: EDGE.enemy, width: "9%", height: "12.5%", animationDelay: dm(delayMs, 80 + i * 60) }}
          >
            <CardArt face={tint(p2, 0.9)} edge={p0} mark={c.locked ? undefined : p1} locked={c.locked ? p0 : undefined} />
          </span>
        ))}
        {[29, 62].map((l, i) => (
          <span
            key={l}
            className="gp-bp-steal absolute block"
            style={{ left: `${l}%`, top: EDGE.enemy, width: "9%", height: "12.5%", "--rot": i ? "12deg" : "-12deg", animationDelay: dm(delayMs, 520 + i * 90) } as CSSProperties}
          >
            <CardArt face={p0} edge={p2} mark={p1} />
          </span>
        ))}
        {BP_COINS.map((c, i) => (
          <span
            key={i}
            className="gp-bp-coin absolute block rounded-full"
            style={{ left: `${c.l}%`, top: `calc(${EDGE.own} + 5%)`, width: "2.4%", height: "2.4%", background: p0, "--dx": c.dx, animationDelay: dm(delayMs, 1120 + c.d) } as CSSProperties}
          />
        ))}
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "30%", top: EDGE.own, width: "40%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p0, 0.45)}, transparent)`, animationDelay: dm(delayMs, 1300) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* absolute_nullify: "Cancel your opponent's unused and temporary buffs and
   block their next draft, but they gain a reroll in return. Locked-in
   upgrades resist." A null ring opens over the opponent's cards, the loose
   ones crack and sink, the padlocked one holds, a bar drops across their
   draft slot, and one die tumbles to them: the reroll. */
const AN_SHARDS = [
  { dx: "-140%", dy: "120%", rot: "-120deg", d: 0 },
  { dx: "150%", dy: "90%", rot: "140deg", d: 40 },
  { dx: "20%", dy: "180%", rot: "80deg", d: 80 },
];
function AbsoluteNullifyScene({ palette, glyph, lead, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 460}>
      {heavy(tier) && <Vignette delayMs={delayMs + 120} />}
      <BoardFrame>
        <span className="gp-an-null absolute block" style={{ left: "30%", top: `calc(${EDGE.enemy} - 9%)`, width: "40%", height: "31%", animationDelay: dm(delayMs, 0) }}>
          <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
            <circle cx="10" cy="10" r="8.6" fill="none" stroke={p1} strokeWidth="1" />
            <path d="M4 16 L16 4" stroke={p1} strokeWidth="1" strokeLinecap="round" />
          </svg>
        </span>
        {[33, 58].map((l, i) => (
          <span key={l} className="gp-an-crack absolute block" style={{ left: `${l}%`, top: EDGE.enemy, width: "9%", height: "12.5%", animationDelay: dm(delayMs, 60 + i * 50) }}>
            <CardArt face={tint(p2, 0.9)} edge={p0} mark={p1} />
          </span>
        ))}
        <span className="gp-bp-rattle absolute block" style={{ left: "45.5%", top: EDGE.enemy, width: "9%", height: "12.5%", animationDelay: dm(delayMs, 110) }}>
          <CardArt face={tint(p2, 0.95)} edge={p0} locked={p0} />
        </span>
        {AN_SHARDS.map((s, i) => (
          <span
            key={i}
            className="gp-spark absolute block"
            style={{ left: `${i === 1 ? 61 : 36}%`, top: `calc(${EDGE.enemy} + 5%)`, width: "2.6%", height: "2.6%", "--dx": s.dx, "--dy": s.dy, "--rot": s.rot, animationDelay: dm(delayMs, 520 + s.d) } as CSSProperties}
          >
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.6 L9 5 L5 9.4 L1 5 Z" fill={p2} stroke={p0} strokeWidth="0.7" {...SJ} />
            </svg>
          </span>
        ))}
        {/* their next draft is barred */}
        <span
          className="gp-an-bar absolute block"
          style={{ left: "20%", top: `calc(${EDGE.enemy} + 5.4%)`, width: "60%", height: "1.8%", background: p1, animationDelay: dm(delayMs, 640) }}
        />
        {/* ...and a reroll is thrown to them in return */}
        <span className="gp-an-die absolute block" style={{ left: "74%", top: `calc(${EDGE.enemy} + 3%)`, width: "6%", height: "6%", animationDelay: dm(delayMs, 920) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <rect x="0.8" y="0.8" width="8.4" height="8.4" rx="1.6" fill={p2} stroke={p0} strokeWidth="0.7" />
            <circle cx="3.2" cy="3.2" r="0.9" fill={p0} />
            <circle cx="5" cy="5" r="0.9" fill={p0} />
            <circle cx="6.8" cy="6.8" r="0.9" fill={p0} />
          </svg>
        </span>
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "32%", top: EDGE.enemy, width: "36%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p1, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1250) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* draft_supremacy: "Take both cards in each of your next two drafts while
   your opponent's next draft is skipped." A crown rises at the caster's
   edge, two drafts' worth of card PAIRS fan down into it, and the single
   card on the opponent's side is struck through. */
function DraftSupremacyScene({ palette, glyph, lead, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const pairs = [
    { l: 26, d: 300 },
    { l: 56, d: 520 },
  ];
  return (
    <Stage quakeMs={delayMs + 700}>
      {heavy(tier) && <Vignette delayMs={delayMs + 120} />}
      <BoardFrame>
        <span className="gp-ds-crown absolute block" style={{ left: "44%", top: `calc(${EDGE.own} - var(--fx-side, 1) * 11%)`, width: "12%", height: "9%", animationDelay: dm(delayMs, 0) }}>
          <svg viewBox="0 0 12 9" className="block h-full w-full" aria-hidden="true">
            <path d="M1 8.2 V2.4 L3.6 4.8 L6 1 L8.4 4.8 L11 2.4 V8.2 Z" fill={p0} stroke={p1} strokeWidth="0.6" {...SJ} />
          </svg>
        </span>
        {pairs.flatMap((pr, pi) =>
          ["-10deg", "10deg"].map((rot, ci) => (
            <span
              key={`${pi}${ci}`}
              className="gp-ds-card absolute block"
              style={{ left: `${pr.l + ci * 7}%`, top: EDGE.own, width: "9%", height: "12.5%", "--rot": rot, animationDelay: dm(delayMs, pr.d + ci * 60) } as CSSProperties}
            >
              <CardArt face={p2} edge={p1} mark={p0} />
            </span>
          )),
        )}
        {/* their next draft: one card, struck through */}
        <span className="gp-ds-skip absolute block" style={{ left: "45.5%", top: EDGE.enemy, width: "9%", height: "12.5%", animationDelay: dm(delayMs, 760) }}>
          <svg viewBox="0 0 9 12" className="block h-full w-full" aria-hidden="true">
            <rect x="0.5" y="0.5" width="8" height="11" rx="1" fill={tint(p2, 0.55)} stroke={tint(p1, 0.8)} strokeWidth="0.6" />
            <path d="M1.4 1.6 L7.6 10.4 M7.6 1.6 L1.4 10.4" stroke={p1} strokeWidth="1" strokeLinecap="round" />
          </svg>
        </span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="gp-glint absolute block"
            style={{ left: `${30 + i * 18}%`, top: `calc(${EDGE.own} - var(--fx-side, 1) * 4%)`, width: "4%", height: "4%", animationDelay: dm(delayMs, 1100 + i * 90) }}
          >
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.5 L6 4 L9.5 5 L6 6 L5 9.5 L4 6 L0.5 5 L4 4 Z" fill={p0} />
            </svg>
          </span>
        ))}
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "24%", top: EDGE.own, width: "52%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p0, 0.45)}, transparent)`, animationDelay: dm(delayMs, 1300) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* sealed_archive: "Your opponent's next draft is skipped entirely." Their
   draft stack stands at their edge, a ribbon is drawn round it and a wax seal
   stamps down on the knot; one struck card pip is the one skipped draft. */
const SA_DRIPS = [
  { dx: "-120%", dy: "140%", d: 0 },
  { dx: "10%", dy: "190%", d: 40 },
  { dx: "130%", dy: "130%", d: 80 },
];
function SealedArchiveScene({ palette, glyph, lead, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 480}>
      {heavy(tier) && <Vignette delayMs={delayMs + 120} />}
      <BoardFrame>
        <span className="gp-sa-stack absolute block" style={{ left: "43%", top: `calc(${EDGE.enemy} - 2%)`, width: "14%", height: "16%", animationDelay: dm(delayMs, 0) }}>
          <svg viewBox="0 0 14 16" className="block h-full w-full" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <rect key={i} x={1 + i * 0.8} y={1 + i * 1} width="10" height="13" rx="1" fill={tint(p2, 0.9)} stroke={p1} strokeWidth="0.5" />
            ))}
          </svg>
        </span>
        <span className="gp-sa-ribbon absolute block" style={{ left: "40%", top: `calc(${EDGE.enemy} + 5.2%)`, width: "20%", height: "2.2%", background: p0, animationDelay: dm(delayMs, 260) }} />
        <span className="gp-sa-seal absolute block rounded-full" style={{ left: "46.5%", top: `calc(${EDGE.enemy} + 2.8%)`, width: "7%", height: "7%", animationDelay: dm(delayMs, 460) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0.6 C6.4 1.2 7.8 0.8 8.6 2 C9.4 3.2 9 4.4 9.4 5.6 C9.2 7 8 7.6 7.4 8.6 C6.2 9.4 5 9 3.8 9.4 C2.6 9 1.8 8 1 7.2 C0.6 6 0.8 4.8 0.6 3.6 C1.2 2.4 2.4 1.8 3.4 1 C4 0.8 4.4 0.8 5 0.6 Z" fill={p1} stroke={p0} strokeWidth="0.5" />
            <circle cx="5" cy="5" r="2.2" fill="none" stroke={p0} strokeWidth="0.6" />
          </svg>
        </span>
        {SA_DRIPS.map((s, i) => (
          <span
            key={i}
            className="gp-sa-drip absolute block rounded-full"
            style={{ left: "49%", top: `calc(${EDGE.enemy} + 6%)`, width: "2%", height: "2%", background: p1, "--dx": s.dx, "--dy": s.dy, animationDelay: dm(delayMs, 560 + s.d) } as CSSProperties}
          />
        ))}
        <span className="gp-ds-skip absolute block" style={{ left: "59%", top: `calc(${EDGE.enemy} + 3%)`, width: "5%", height: "6.6%", animationDelay: dm(delayMs, 900) }}>
          <svg viewBox="0 0 9 12" className="block h-full w-full" aria-hidden="true">
            <rect x="0.5" y="0.5" width="8" height="11" rx="1" fill={tint(p2, 0.6)} stroke={p1} strokeWidth="0.6" />
            <path d="M1.4 10.4 L7.6 1.6" stroke={p0} strokeWidth="1" strokeLinecap="round" />
          </svg>
        </span>
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "36%", top: EDGE.enemy, width: "28%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p0, 0.45)}, transparent)`, animationDelay: dm(delayMs, 1200) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* poisoned_counsel: "Your opponent's next drafted card arrives nullified and
   does nothing." Their next card slides into their hand, a goblet tips over
   it, venom pours and stains it, and a null ring closes on it. */
function PoisonedCounselScene({ palette, glyph, lead, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 560}>
      {heavy(tier) && <Vignette delayMs={delayMs + 120} />}
      <BoardFrame>
        <span className="gp-pc-card absolute block" style={{ left: "45.5%", top: EDGE.enemy, width: "9%", height: "12.5%", animationDelay: dm(delayMs, 0) }}>
          <CardArt face={tint(p2, 0.95)} edge={p1} mark={p2} />
        </span>
        <span className="gp-pc-goblet absolute block" style={{ left: "56%", top: `calc(${EDGE.enemy} - 1%)`, width: "8%", height: "10%", animationDelay: dm(delayMs, 120) }}>
          <svg viewBox="0 0 8 10" className="block h-full w-full" aria-hidden="true">
            <path d="M1 0.8 H7 C7 3.4 5.6 4.6 4 4.6 C2.4 4.6 1 3.4 1 0.8 Z M4 4.6 V8.2 M2.2 9.2 H5.8" fill={tint(p1, 0.9)} stroke={p0} strokeWidth="0.6" {...SJ} />
          </svg>
        </span>
        <span className="gp-pc-pour absolute block" style={{ left: "52%", top: EDGE.enemy, width: "1.6%", height: "8%", background: p0, animationDelay: dm(delayMs, 360) }} />
        <span className="gp-pc-stain absolute block" style={{ left: "45.5%", top: EDGE.enemy, width: "9%", height: "12.5%", background: tint(p0, 0.55), animationDelay: dm(delayMs, 520) }} />
        <span className="gp-pc-null absolute block" style={{ left: "43.5%", top: `calc(${EDGE.enemy} + 0.5%)`, width: "13%", height: "11.5%", animationDelay: dm(delayMs, 760) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <circle cx="5" cy="5" r="4.2" fill="none" stroke={p1} strokeWidth="0.8" />
            <path d="M2 8 L8 2" stroke={p1} strokeWidth="0.8" strokeLinecap="round" />
          </svg>
        </span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="gp-pc-bubble absolute block rounded-full"
            style={{ left: `${46 + i * 3.5}%`, top: `calc(${EDGE.enemy} + 6%)`, width: "1.8%", height: "1.8%", background: tint(p0, 0.9), animationDelay: dm(delayMs, 980 + i * 110) }}
          />
        ))}
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "38%", top: EDGE.enemy, width: "24%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p0, 0.4)}, transparent)`, "--gp-drift": "calc(var(--fx-side, 1) * 4%)", animationDelay: dm(delayMs, 1200) } as CSSProperties}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- sacked_capital -------------------------------------------------------------
   "Your opponent skips their next turn and their next draft. On the turn they
   return, they may move only pawns or their king." Smoke fills the opponent's
   back rank (the capital) and its towers topple, flames take it, then their
   pawn rank lights (pawns may still move) with a crown at its end (so may the
   king); an hourglass and a card are struck through: the skipped turn and the
   skipped draft. */
const TOWERS = [
  { x: 6.25, lean: -1 },
  { x: 18.75, lean: -1 },
  { x: 81.25, lean: 1 },
  { x: 93.75, lean: 1 },
];
function SackedCapitalScene({ palette, glyph, lead, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 620}>
      {heavy(tier) && <Vignette delayMs={delayMs + 120} />}
      <BoardFrame>
        <span
          className="gp-sc-smoke absolute block"
          style={{ left: "0%", top: ROW.enemyBack, width: "100%", height: "12.5%", background: `linear-gradient(90deg, ${tint(p1, 0.7)}, ${tint(p1, 0.35)} 50%, ${tint(p1, 0.7)})`, animationDelay: dm(delayMs, 0) }}
        />
        {TOWERS.map((t, i) => (
          <span
            key={t.x}
            className="gp-sc-topple absolute block"
            style={{ left: `${t.x - 4}%`, top: `calc(${ROW.enemyBack} + 1%)`, width: "8%", height: "10.5%", "--gp-lean": t.lean, animationDelay: dm(delayMs, 260 + i * 60) } as CSSProperties}
          >
            <Sil d={SIL.r} fill={tint(p2, 0.9)} stroke={p1} />
          </span>
        ))}
        {[34, 50, 66].map((x, i) => (
          <span key={x} className="gp-sc-flame absolute block" style={{ left: `${x - 4}%`, top: `calc(${ROW.enemyBack} + 1%)`, width: "8%", height: "11%", animationDelay: dm(delayMs, 380 + i * 70) }}>
            <svg viewBox="0 0 10 16" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.6 C7.4 4 9.4 6.4 9.2 10 C9 13.6 7 15.4 5 15.4 C3 15.4 1 13.6 0.8 10 C0.8 7.4 2.6 6 3.4 3.6 C4 5.4 4.4 6.2 5.2 6.6 C5.6 4.6 5.4 2.6 5 0.6 Z" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="0.5" {...SJ} />
            </svg>
          </span>
        ))}
        {/* their pawns (and their king) are all that may move on their return */}
        <span
          className="gp-sc-pawnrow absolute block"
          style={{ left: "0%", top: "calc(43.75% - var(--fx-side, 1) * 31.25% + 5.4%)", width: "100%", height: "1.6%", background: tint(p0, 0.9), animationDelay: dm(delayMs, 760) }}
        />
        <span className="gp-sc-skip absolute block" style={{ left: "88%", top: "calc(43.75% - var(--fx-side, 1) * 31.25% + 1%)", width: "9%", height: "10%", animationDelay: dm(delayMs, 820) }}>
          <svg viewBox="0 0 12 9" className="block h-full w-full" aria-hidden="true">
            <path d="M1 8.2 V2.4 L3.6 4.8 L6 1 L8.4 4.8 L11 2.4 V8.2 Z" fill={p0} stroke={p1} strokeWidth="0.6" {...SJ} />
          </svg>
        </span>
        {/* the skipped turn and the skipped draft */}
        {[
          { l: 40, d: 940, art: "M1.4 0.8 H6.6 M1.4 9.2 H6.6 M1.9 0.8 C1.9 3.6 6.1 3.6 6.1 5 C6.1 6.4 1.9 6.4 1.9 9.2 M6.1 0.8 C6.1 3.6 1.9 3.6 1.9 5 C1.9 6.4 6.1 6.4 6.1 9.2" },
          { l: 53, d: 1030, art: "M1 0.8 H7 V9.2 H1 Z" },
        ].map((k) => (
          <span key={k.l} className="gp-sc-skip absolute block" style={{ left: `${k.l}%`, top: "calc(46% - var(--fx-side, 1) * 14%)", width: "7%", height: "9%", animationDelay: dm(delayMs, k.d) }}>
            <svg viewBox="0 0 8 10" className="block h-full w-full" aria-hidden="true">
              <path d={k.art} fill="none" stroke={p0} strokeWidth="0.7" {...SJ} />
              <path d="M0.6 9.4 L7.4 0.6" stroke={p2} strokeWidth="0.9" strokeLinecap="round" />
            </svg>
          </span>
        ))}
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "20%", top: ROW.enemyBack, width: "60%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p0, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1300) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- obsidian_bastions ------------------------------------------------------------
   "Your opponent's rooks turn to walnuts for the rest of the game, able only
   to shuffle one square at a time. A rook breaks free the instant it makes a
   capture." An obsidian monolith rises at the cast square and a glass lance
   runs down the aim vector; on every rook two faceted glass halves close
   (not the round shells of a walnut court), an infinity pip says it is for
   the rest of the game, and a hairline crack flickers across the glass: the
   capture that would free it. */
function ObsidianHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="gp-focus absolute block rounded-full" style={{ left: "8%", top: "8%", width: "84%", height: "84%", border: `2px solid ${tint(p1, 0.85)}`, animationDelay: dm(delayMs, 0) }} />
      {[
        { l: 8, from: "-70%", tilt: "-18deg", d: "M9 0.6 L3 2 L0.6 7 L3 12 L9 13.4 Z" },
        { l: 50, from: "70%", tilt: "18deg", d: "M0 0.6 L6 2 L8.4 7 L6 12 L0 13.4 Z" },
      ].map((h, i) => (
        <span
          key={i}
          className="gp-wc-shell absolute block"
          style={{ left: `${h.l}%`, top: "10%", width: "42%", height: "80%", "--gp-from": h.from, "--gp-tilt": h.tilt, animationDelay: dm(delayMs, 160) } as CSSProperties}
        >
          <svg viewBox="0 0 9 14" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d={h.d} fill={tint(p0, 0.92)} stroke={p1} strokeWidth="0.5" {...SJ} />
            <path d={i === 0 ? "M9 5 L3 2 M9 9 L0.6 7" : "M0 5 L6 2 M0 9 L8.4 7"} fill="none" stroke={tint(p2, 0.7)} strokeWidth="0.35" />
          </svg>
        </span>
      ))}
      <span className="gp-glint absolute block" style={{ left: "30%", top: "14%", width: "24%", height: "24%", animationDelay: dm(delayMs, 560) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 0.5 L6 4 L9.5 5 L6 6 L5 9.5 L4 6 L0.5 5 L4 4 Z" fill={p1} />
        </svg>
      </span>
      <span className="gp-ob-crack absolute block" style={{ left: "26%", top: "22%", width: "48%", height: "56%", animationDelay: dm(delayMs, 760) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M2 1 L4.4 4 L3.4 5.4 L6.4 8.6 M4.4 4 L7.6 3" fill="none" stroke={p2} strokeWidth="0.45" {...SJ} />
        </svg>
      </span>
      <span className="gp-ob-inf absolute block" style={{ left: "32%", top: "80%", width: "36%", height: "16%", animationDelay: dm(delayMs, 700) }}>
        <svg viewBox="0 0 12 5" className="block h-full w-full" aria-hidden="true">
          <path d="M6 2.5 C4.6 0.6 1.2 0.6 1.2 2.5 C1.2 4.4 4.6 4.4 6 2.5 C7.4 0.6 10.8 0.6 10.8 2.5 C10.8 4.4 7.4 4.4 6 2.5 Z" fill="none" stroke={p1} strokeWidth="0.9" />
        </svg>
      </span>
    </span>
  );
}
function ObsidianBastionsScene({ palette, lead, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <ObsidianHit palette={palette} delayMs={delayMs} />;
  return (
    <>
      <Stage quakeMs={delayMs + 520}>
        {heavy(tier) && <Vignette delayMs={delayMs + 120} />}
        <Rake delayMs={delayMs + 300} tone={tint(p0, 0.6)} lean="calc(var(--fx-ox, 0) * 2.6%)" tip="calc(var(--fx-oy, 0) * 1.8%)" cy={58} width={20} />
        <span className="gp-ob-mono absolute block" style={{ left: "45%", top: "34%", width: "10%", height: "24%", animationDelay: dm(delayMs, 0) }}>
          <svg viewBox="0 0 10 24" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0.6 L8.8 5 L9.4 23.4 H0.6 L1.2 5 Z" fill={p0} stroke={p1} strokeWidth="0.6" {...SJ} />
            <path d="M5 0.6 L5.8 23.4 M1.2 5 L5.8 9 L8.8 5" fill="none" stroke={tint(p2, 0.6)} strokeWidth="0.4" />
          </svg>
        </span>
        {[0, 1].map((i) => (
          <span key={i} className="gp-glint absolute block" style={{ left: `${45.5 + i * 5}%`, top: `${37 + i * 8}%`, width: "4%", height: "4%", animationDelay: dm(delayMs, 420 + i * 160) }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0.5 L6 4 L9.5 5 L6 6 L5 9.5 L4 6 L0.5 5 L4 4 Z" fill={p1} />
            </svg>
          </span>
        ))}
        <span className="gp-ob-inf absolute block" style={{ left: "44.5%", top: "59%", width: "11%", height: "4.6%", animationDelay: dm(delayMs, 980) }}>
          <svg viewBox="0 0 12 5" className="block h-full w-full" aria-hidden="true">
            <path d="M6 2.5 C4.6 0.6 1.2 0.6 1.2 2.5 C1.2 4.4 4.6 4.4 6 2.5 C7.4 0.6 10.8 0.6 10.8 2.5 C10.8 4.4 7.4 4.4 6 2.5 Z" fill="none" stroke={p1} strokeWidth="0.9" />
          </svg>
        </span>
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "40%", top: "44%", width: "20%", height: "16%", background: `radial-gradient(closest-side, ${tint(p1, 0.45)}, transparent)`, animationDelay: dm(delayMs, 1250) }}
        />
      </Stage>
      <AimStage>
        <span
          className="gp-ob-lance absolute block"
          style={{ left: "50%", top: "49.2%", width: "calc(var(--fx-len, 2) * 7.142857%)", height: "1.6%", background: `linear-gradient(90deg, ${tint(p1, 0.9)}, ${tint(p2, 0.5)})`, animationDelay: dm(delayMs, 520) }}
        />
      </AimStage>
    </>
  );
}

/* --- reality_warp -------------------------------------------------------------------
   "Rewrite the rules of matter: any two of your pieces, king aside, become
   queens." The lattice of the board warps round the cast square, a rift
   opens in it, a rune ring turns, two crowns rise out of it (two queens) and
   a rewrite beam runs down the aim vector. On each chosen piece a scan line
   rewrites the square and a queen stands up in it (target cut). */
const RW_MOTES = [
  { dx: "-260%", dy: "-180%", d: 0 },
  { dx: "240%", dy: "-220%", d: 50 },
  { dx: "-40%", dy: "-300%", d: 100 },
];
function RewriteHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="gp-focus absolute block rounded-full" style={{ left: "8%", top: "8%", width: "84%", height: "84%", border: `2px solid ${tint(p1, 0.85)}`, animationDelay: dm(delayMs, 0) }} />
      <span className="gp-rw-scan absolute block" style={{ left: "4%", top: "4%", width: "92%", height: "10%", background: `linear-gradient(180deg, transparent, ${tint(p1, 0.95)}, transparent)`, animationDelay: dm(delayMs, 140) }} />
      <span className="gp-rw-queen absolute block" style={{ left: "18%", top: "12%", width: "64%", height: "72%", animationDelay: dm(delayMs, 460) }}>
        <Sil d={SIL.q} fill={tint(p2, 0.9)} stroke={p0} />
      </span>
      <span className="gp-glint absolute block" style={{ left: "38%", top: "2%", width: "24%", height: "24%", animationDelay: dm(delayMs, 760) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 0.5 L6 4 L9.5 5 L6 6 L5 9.5 L4 6 L0.5 5 L4 4 Z" fill={p1} />
        </svg>
      </span>
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{ left: "20%", top: "20%", width: "60%", height: "60%", background: `radial-gradient(closest-side, ${tint(p0, 0.45)}, transparent)`, "--gp-drift": "calc(var(--fx-side, 1) * 6%)", animationDelay: dm(delayMs, 900) } as CSSProperties}
      />
    </span>
  );
}
function RealityWarpScene({ palette, lead, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <RewriteHit palette={palette} delayMs={delayMs} />;
  return (
    <>
      <Stage quakeMs={delayMs + 560}>
        {heavy(tier) && <Vignette delayMs={delayMs + 120} />}
        {/* the lattice of the board warps round the cast square */}
        <span className="gp-rw-grid absolute block" style={{ left: "32%", top: "32%", width: "36%", height: "36%", animationDelay: dm(delayMs, 0) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path
              d="M0.5 2.5 C3 1.6 7 3.4 9.5 2.5 M0.5 5 C3 6 7 4 9.5 5 M0.5 7.5 C3 6.6 7 8.4 9.5 7.5 M2.5 0.5 C1.6 3 3.4 7 2.5 9.5 M5 0.5 C6 3 4 7 5 9.5 M7.5 0.5 C6.6 3 8.4 7 7.5 9.5"
              fill="none"
              stroke={tint(p1, 0.8)}
              strokeWidth="0.18"
            />
          </svg>
        </span>
        <span className="gp-rw-tear absolute block" style={{ left: "49.2%", top: "38%", width: "1.6%", height: "22%", background: `linear-gradient(180deg, transparent, ${p2}, ${p0}, transparent)`, animationDelay: dm(delayMs, 220) }} />
        <span className="gp-rw-rune absolute block" style={{ left: "40%", top: "40%", width: "20%", height: "20%", animationDelay: dm(delayMs, 300) }}>
          <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
            <circle cx="10" cy="10" r="8.6" fill="none" stroke={p0} strokeWidth="0.5" strokeDasharray="1.4 1" />
            <path d="M10 1.4 L11 3 H9 Z M18.6 10 L17 11 V9 Z M10 18.6 L9 17 H11 Z M1.4 10 L3 9 V11 Z" fill={p1} />
          </svg>
        </span>
        {[43, 51].map((l, i) => (
          <span key={l} className="gp-rw-crown absolute block" style={{ left: `${l}%`, top: "41%", width: "6%", height: "5%", animationDelay: dm(delayMs, 520 + i * 90) }}>
            <svg viewBox="0 0 12 9" className="block h-full w-full" aria-hidden="true">
              <path d="M1 8.2 V2.4 L3.6 4.8 L6 1 L8.4 4.8 L11 2.4 V8.2 Z" fill={p2} stroke={p0} strokeWidth="0.6" {...SJ} />
            </svg>
          </span>
        ))}
        {RW_MOTES.map((m, i) => (
          <span
            key={i}
            className="gp-mote absolute block rounded-full"
            style={{ left: "49%", top: "49%", width: "1.6%", height: "1.6%", background: p1, "--dx": m.dx, "--dy": m.dy, animationDelay: dm(delayMs, 1000 + m.d) } as CSSProperties}
          />
        ))}
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "40%", top: "42%", width: "20%", height: "16%", background: `radial-gradient(closest-side, ${tint(p0, 0.45)}, transparent)`, animationDelay: dm(delayMs, 1250) }}
        />
      </Stage>
      <AimStage>
        <span
          className="gp-rw-beam absolute block"
          style={{ left: "50%", top: "49.2%", width: "calc(var(--fx-len, 2) * 7.142857%)", height: "1.6%", background: `linear-gradient(90deg, ${tint(p2, 0.9)}, ${tint(p0, 0.6)})`, animationDelay: dm(delayMs, 640) }}
        />
      </AimStage>
    </>
  );
}

/* --- abdication_edict --------------------------------------------------------------
   "For your opponent's next turn they may move only their king. For the two
   turns after that, they may also move their single most valuable non-king
   piece; every other piece stays stuck fast." An edict scroll unrolls across
   the opponent's side, iron pins are driven into both of their home ranks,
   and the crown alone lifts free of them. The three pips are the three turns:
   the first carries only the crown, the next two a crown and one more. */
const PIN_PATH = (() => {
  const seg: string[] = [];
  for (let c = 0; c < 8; c++) for (const r of [0, 1]) {
    const x = c + 0.5;
    const y = r + 0.62;
    seg.push(`M${x} ${y - 0.34} V${y + 0.22} M${x - 0.14} ${y - 0.34} H${x + 0.14}`);
  }
  return seg.join(" ");
})();
function AbdicationEdictScene({ palette, glyph, lead, delayMs, tier }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 560}>
      {heavy(tier) && <Vignette delayMs={delayMs + 120} />}
      <BoardFrame>
        <span className="gp-ae-scroll absolute block" style={{ left: "8%", top: "calc(43.75% - var(--fx-side, 1) * 12.5%)", width: "84%", height: "12.5%", animationDelay: dm(delayMs, 0) }}>
          <svg viewBox="0 0 84 12" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <rect x="2" y="1.5" width="80" height="9" fill={tint(p1, 0.28)} stroke={p1} strokeWidth="0.5" />
            <rect x="0.5" y="0.5" width="3" height="11" rx="1.2" fill={p0} />
            <rect x="80.5" y="0.5" width="3" height="11" rx="1.2" fill={p0} />
            <path d="M10 4.5 H74 M10 7.5 H60" stroke={tint(p2, 0.7)} strokeWidth="0.6" strokeDasharray="3 1.4" />
          </svg>
        </span>
        {/* iron pins driven into both of their home ranks: everything stuck fast */}
        <span className="gp-ae-pins absolute block" style={{ left: "0%", top: "calc(37.5% - var(--fx-side, 1) * 37.5%)", width: "100%", height: "25%", animationDelay: dm(delayMs, 300) }}>
          <svg viewBox="0 0 8 2" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d={PIN_PATH} fill="none" stroke={p1} strokeWidth="0.07" strokeLinecap="round" />
          </svg>
        </span>
        {/* ...and the crown alone lifts free */}
        <span className="gp-ae-crown absolute block" style={{ left: "45%", top: "calc(40.5% - var(--fx-side, 1) * 12.5%)", width: "10%", height: "7%", animationDelay: dm(delayMs, 620) }}>
          <svg viewBox="0 0 12 9" className="block h-full w-full" aria-hidden="true">
            <path d="M1 8.2 V2.4 L3.6 4.8 L6 1 L8.4 4.8 L11 2.4 V8.2 Z" fill={p1} stroke={p2} strokeWidth="0.6" {...SJ} />
          </svg>
        </span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="gp-ae-pip absolute block rounded-full"
            style={{ left: `${43 + i * 5.5}%`, top: "calc(46% - var(--fx-side, 1) * 2%)", width: "3%", height: "3%", background: i === 0 ? p1 : p0, border: `1px solid ${p1}`, animationDelay: dm(delayMs, 900 + i * 110) }}
          />
        ))}
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "30%", top: "calc(37.5% - var(--fx-side, 1) * 12.5%)", width: "40%", height: "25%", background: `radial-gradient(closest-side, ${tint(p1, 0.35)}, transparent)`, animationDelay: dm(delayMs, 1250) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- chisel_curse -------------------------------------------------------------------
   "After your opponent's next move, turn the enemy piece you targeted into a
   walnut for 4 of their turns, and the enemy pieces then directly to its left
   and right into walnuts for 2 of their turns each." A mallet drives a chisel
   into the targeted square, a crack runs exactly one square left and one
   right, and three shells form: four pips under the centre, two under each
   side. An hourglass pip says it waits for their next move. The per-square
   cut is the chisel's bite with stone flakes, not a clamped shell. */
const CC_FLAKES = [
  { dx: "-150%", dy: "120%", d: 0 },
  { dx: "140%", dy: "160%", d: 40 },
  { dx: "-30%", dy: "200%", d: 80 },
];
const CELL = 7.142857;
function ChiselBite({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="gp-focus absolute block rounded-full" style={{ left: "8%", top: "8%", width: "84%", height: "84%", border: `2px solid ${tint(p0, 0.85)}`, animationDelay: dm(delayMs, 0) }} />
      <span className="gp-cc-chisel absolute block" style={{ left: "40%", top: "-6%", width: "20%", height: "56%", animationDelay: dm(delayMs, 120) }}>
        <svg viewBox="0 0 4 12" className="block h-full w-full" aria-hidden="true">
          <path d="M1.2 0.4 H2.8 V7.4 L2 11.6 L1.2 7.4 Z" fill={p1} stroke={p2} strokeWidth="0.3" {...SJ} />
        </svg>
      </span>
      <span className="gp-cc-crack absolute block" style={{ left: "10%", top: "48%", width: "80%", height: "8%", animationDelay: dm(delayMs, 420) }}>
        <svg viewBox="0 0 20 2" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
          <path d="M0 1 L4 0.4 L7 1.6 L10 0.6 L13 1.4 L16 0.4 L20 1" fill="none" stroke={p2} strokeWidth="0.5" />
        </svg>
      </span>
      {CC_FLAKES.map((f, i) => (
        <span key={i} className="gp-cc-flake absolute block" style={{ left: "45%", top: "46%", width: "10%", height: "10%", background: p2, "--dx": f.dx, "--dy": f.dy, animationDelay: dm(delayMs, 440 + f.d) } as CSSProperties} />
      ))}
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{ left: "20%", top: "20%", width: "60%", height: "60%", background: `radial-gradient(closest-side, ${tint(p2, 0.4)}, transparent)`, "--gp-drift": "calc(var(--fx-side, 1) * 6%)", animationDelay: dm(delayMs, 760) } as CSSProperties}
      />
    </span>
  );
}
function ChiselCurseScene({ palette, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <ChiselBite palette={palette} delayMs={delayMs} />;
  const nuts = [
    { dx: 0, turns: 4, d: 560 },
    { dx: -CELL, turns: 2, d: 700 },
    { dx: CELL, turns: 2, d: 760 },
  ];
  return (
    <Stage quakeMs={delayMs + 480}>
      <Rake delayMs={delayMs + 300} tone={tint(p1, 0.5)} lean="calc(var(--fx-ox, 0) * 2.2%)" tip="calc(var(--fx-oy, 0) * 1.4%)" cy={54} width={24} />
      {/* the mallet drives the chisel into the targeted square */}
      <span className="gp-cc-mallet absolute block" style={{ left: "52%", top: "36%", width: "8%", height: "8%", animationDelay: dm(delayMs, 0) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M9.4 9.4 L4.2 4.2" stroke={p1} strokeWidth="1" strokeLinecap="round" />
          <rect x="0.6" y="1" width="6" height="3.4" rx="0.8" transform="rotate(45 3.6 2.7)" fill={p0} stroke={p2} strokeWidth="0.5" />
        </svg>
      </span>
      <span className="gp-cc-chisel absolute block" style={{ left: "49%", top: "40%", width: "2%", height: "8%", animationDelay: dm(delayMs, 120) }}>
        <svg viewBox="0 0 4 12" className="block h-full w-full" aria-hidden="true">
          <path d="M1.2 0.4 H2.8 V7.4 L2 11.6 L1.2 7.4 Z" fill={p1} stroke={p2} strokeWidth="0.3" {...SJ} />
        </svg>
      </span>
      {/* the crack runs exactly one square left and one right */}
      <span className="gp-cc-crack absolute block" style={{ left: `${50 - CELL * 1.5}%`, top: "49.4%", width: `${CELL * 3}%`, height: "1.4%", animationDelay: dm(delayMs, 420) }}>
        <svg viewBox="0 0 30 2" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
          <path d="M0 1 L4 0.4 L8 1.6 L12 0.5 L15 1 L18 0.5 L22 1.6 L26 0.4 L30 1" fill="none" stroke={p2} strokeWidth="0.5" />
        </svg>
      </span>
      {CC_FLAKES.map((f, i) => (
        <span key={i} className="gp-cc-flake absolute block" style={{ left: "49.3%", top: "49%", width: "1.4%", height: "1.4%", background: p2, "--dx": f.dx, "--dy": f.dy, animationDelay: dm(delayMs, 460 + f.d) } as CSSProperties} />
      ))}
      {nuts.map((n, i) => (
        <span key={i} className="gp-cc-nut absolute block" style={{ left: `${50 - CELL / 2 + n.dx + CELL * 0.12}%`, top: `${50 - CELL / 2 + CELL * 0.1}%`, width: `${CELL * 0.76}%`, height: `${CELL * 0.8}%`, animationDelay: dm(delayMs, n.d) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <ellipse cx="5" cy="5.2" rx="4.2" ry="4.4" fill={tint(p0, 0.85)} stroke={p1} strokeWidth="0.5" />
            <path d="M5 1 C3.8 3.2 6.2 6 5 9.4" fill="none" stroke={p2} strokeWidth="0.5" />
          </svg>
        </span>
      ))}
      {/* four turns for the target, two for each neighbour */}
      {nuts.flatMap((n, i) =>
        Array.from({ length: n.turns }, (_, k) => (
          <span
            key={`${i}${k}`}
            className="gp-cc-pip absolute block rounded-full"
            style={{ left: `${50 + n.dx - (n.turns * 1.3) / 2 + k * 1.3 + 0.15}%`, top: `${50 + CELL * 0.42}%`, width: "1%", height: "1%", background: p2, animationDelay: dm(delayMs, 900 + i * 60 + k * 50) }}
          />
        )),
      )}
      {/* it waits for their next move */}
      <span className="gp-mm-pip absolute block" style={{ left: `${50 + CELL * 1.6}%`, top: "44%", width: "2.4%", height: "3.4%", animationDelay: dm(delayMs, 1080) }}>
        <svg viewBox="0 0 6 8" className="block h-full w-full" aria-hidden="true">
          <path d="M0.8 0.6 H5.2 M0.8 7.4 H5.2 M1.3 0.6 C1.3 3 4.7 3 4.7 4 C4.7 5 1.3 5 1.3 7.4 M4.7 0.6 C4.7 3 1.3 3 1.3 4 C1.3 5 4.7 5 4.7 7.4" fill="none" stroke={p2} strokeWidth="0.5" strokeLinecap="round" />
        </svg>
      </span>
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{ left: "38%", top: "44%", width: "24%", height: "12%", background: `radial-gradient(closest-side, ${tint(p2, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1250) }}
      />
    </Stage>
  );
}

/* --- cockatrice_gaze ----------------------------------------------------------------
   "Every enemy knight and bishop in your half turns to a walnut for 4 of their
   turns. Minors still in their own half only catch the reflection and are
   frozen for 1 turn." The cockatrice's eye opens at the cast square; its gaze
   floods YOUR half in stone, while the opponent's half only shimmers with a
   mirror of it. Four pips sit on your side, one on theirs. Each piece the
   gaze takes has stone climb it from the base (target cut). */
function StoneClimbHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="gp-focus absolute block rounded-full" style={{ left: "8%", top: "8%", width: "84%", height: "84%", border: `2px solid ${tint(p1, 0.85)}`, animationDelay: dm(delayMs, 0) }} />
      <span className="gp-cg-stone absolute block" style={{ left: "16%", top: "10%", width: "68%", height: "80%", background: `linear-gradient(0deg, ${tint(p2, 0.85)}, ${tint(p0, 0.45)})`, animationDelay: dm(delayMs, 160) }} />
      <span className="gp-cc-crack absolute block" style={{ left: "16%", top: "40%", width: "68%", height: "10%", animationDelay: dm(delayMs, 520) }}>
        <svg viewBox="0 0 20 2" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
          <path d="M0 1 L5 0.4 L9 1.6 L13 0.5 L20 1.2" fill="none" stroke={p1} strokeWidth="0.5" />
        </svg>
      </span>
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{ left: "20%", top: "20%", width: "60%", height: "60%", background: `radial-gradient(closest-side, ${tint(p0, 0.45)}, transparent)`, "--gp-drift": "calc(var(--fx-side, 1) * 6%)", animationDelay: dm(delayMs, 800) } as CSSProperties}
      />
    </span>
  );
}
function CockatriceGazeScene({ palette, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <StoneClimbHit palette={palette} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 520}>
      <BoardFrame>
        {/* the gaze floods YOUR half in stone */}
        <span
          className="gp-cg-gaze absolute block"
          style={{ left: "0%", top: ROW.ownHalf, width: "100%", height: "50%", transformOrigin: "50% calc(50% - var(--fx-side, 1) * 50%)", background: `linear-gradient(180deg, ${tint(p2, 0.45)}, ${tint(p0, 0.3)})`, animationDelay: dm(delayMs, 260) }}
        />
        {/* their half only catches the reflection */}
        <span
          className="gp-cg-mirror absolute block"
          style={{ left: "0%", top: "calc(25% - var(--fx-side, 1) * 25%)", width: "100%", height: "50%", transformOrigin: "50% calc(50% + var(--fx-side, 1) * 50%)", background: `repeating-linear-gradient(135deg, ${tint(p1, 0.3)} 0 3%, transparent 3% 9%)`, animationDelay: dm(delayMs, 420) }}
        />
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="gp-cg-pip absolute block rounded-full" style={{ left: `${41.5 + i * 4.5}%`, top: "calc(47% + var(--fx-side, 1) * 8%)", width: "3%", height: "3%", background: p2, border: `1px solid ${p1}`, animationDelay: dm(delayMs, 900 + i * 90) }} />
        ))}
        <span className="gp-cg-pip absolute block rounded-full" style={{ left: "48.5%", top: "calc(47% - var(--fx-side, 1) * 8%)", width: "3%", height: "3%", background: p1, animationDelay: dm(delayMs, 1260) }} />
      </BoardFrame>
      {/* the cockatrice's eye at the cast square */}
      <span className="gp-cg-eye absolute block" style={{ left: "43%", top: "46%", width: "14%", height: "8%", animationDelay: dm(delayMs, 0) }}>
        <svg viewBox="0 0 14 8" className="block h-full w-full" aria-hidden="true">
          <path d="M0.6 4 C3.4 0.4 10.6 0.4 13.4 4 C10.6 7.6 3.4 7.6 0.6 4 Z" fill={p1} stroke={p2} strokeWidth="0.6" {...SJ} />
          <ellipse cx="7" cy="4" rx="0.9" ry="3" fill={p2} />
        </svg>
      </span>
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{ left: "40%", top: "43%", width: "20%", height: "14%", background: `radial-gradient(closest-side, ${tint(p1, 0.45)}, transparent)`, animationDelay: dm(delayMs, 1200) }}
      />
    </Stage>
  );
}

/* --- molten_heart --------------------------------------------------------------------
   "For your opponent's next 2 captures, the capturing piece is destroyed along
   with its victim. Their single most valuable piece is exempt." A heart of
   magma beats twice at the cast square; a blade strikes a piece and BOTH
   melt into the floor together, the blade dripping; two pips are the two
   captures. */
function MoltenHeartScene({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 560}>
      <Rake delayMs={delayMs + 300} tone={tint(p2, 0.6)} lean="calc(var(--fx-ox, 0) * 2.6%)" tip="calc(var(--fx-oy, 0) * 1.6%)" cy={58} width={26} />
      <span className="gp-mh-beat absolute block" style={{ left: "44%", top: "33%", width: "12%", height: "11%", animationDelay: dm(delayMs, 0) }}>
        <svg viewBox="0 0 12 11" className="block h-full w-full" aria-hidden="true">
          <path d="M6 10.4 C2 7.4 0.6 5.4 0.6 3.4 C0.6 1.6 2 0.6 3.4 0.6 C4.6 0.6 5.4 1.4 6 2.4 C6.6 1.4 7.4 0.6 8.6 0.6 C10 0.6 11.4 1.6 11.4 3.4 C11.4 5.4 10 7.4 6 10.4 Z" fill={p0} stroke={p2} strokeWidth="0.6" />
          <path d="M3 4 L5 5.4 L4.4 7 M8.6 3.6 L7 5.2 L8 6.6" fill="none" stroke={p1} strokeWidth="0.5" />
        </svg>
      </span>
      {/* the capture: attacker and victim melt together */}
      <span className="gp-mh-melt absolute block" style={{ left: "51.5%", top: "47%", width: "6%", height: "9%", animationDelay: dm(delayMs, 360) }}>
        <Sil d={SIL.p} fill={tint(p1, 0.9)} stroke={p2} />
      </span>
      <span className="gp-mh-strike absolute block" style={{ left: "43%", top: "47%", width: "8%", height: "9%", animationDelay: dm(delayMs, 300) }}>
        <svg viewBox="0 0 8 9" className="block h-full w-full" aria-hidden="true">
          <path d="M7.4 1 L3 5.4 L2.2 4.6 L6.6 0.2 Z M3 5.4 L1.4 7 M0.8 5.6 L3.4 8.2" fill={p0} stroke={p2} strokeWidth="0.5" {...SJ} />
        </svg>
      </span>
      {[0, 1, 2].map((i) => (
        <span key={i} className="gp-mh-drip absolute block rounded-full" style={{ left: `${47 + i * 3}%`, top: "55%", width: "1.4%", height: "2.2%", background: p0, animationDelay: dm(delayMs, 760 + i * 80) }} />
      ))}
      {[0, 1].map((i) => (
        <span key={i} className="gp-mh-pip absolute block rounded-full" style={{ left: `${47 + i * 4}%`, top: "60%", width: "2.4%", height: "2.4%", background: p0, border: `1px solid ${p2}`, animationDelay: dm(delayMs, 1000 + i * 110) }} />
      ))}
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{ left: "40%", top: "46%", width: "20%", height: "14%", background: `radial-gradient(closest-side, ${tint(p0, 0.5)}, transparent)`, animationDelay: dm(delayMs, 1250) }}
      />
    </Stage>
  );
}

/* --- withered_hands ------------------------------------------------------------------
   "After your opponent's next move, they cannot capture with any piece for
   their following 3 turns." A gaunt hand reaches for a piece to take it and
   withers before it closes, crumbling to dust; an hourglass says it starts
   after their next move, three pips are the three turns. */
function WitheredHandsScene({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 600}>
      <Rake delayMs={delayMs + 300} tone={tint(p1, 0.5)} lean="calc(var(--fx-ox, 0) * 2.4%)" tip="calc(var(--fx-oy, 0) * 1.5%)" cy={58} width={24} />
      {/* the piece it reaches for */}
      <span className="gp-wh-piece absolute block" style={{ left: "53%", top: "45%", width: "6%", height: "9%", animationDelay: dm(delayMs, 0) }}>
        <Sil d={SIL.n} fill={tint(p2, 0.9)} stroke={p1} />
      </span>
      <span className="gp-wh-reach absolute block" style={{ left: "38%", top: "44%", width: "14%", height: "11%", animationDelay: dm(delayMs, 80) }}>
        <span className="gp-wh-wither absolute inset-0 block" style={{ animationDelay: dm(delayMs, 380) }}>
          <svg viewBox="0 0 14 11" className="block h-full w-full" aria-hidden="true">
            <path d="M0.6 6.4 H5 C6 6.4 6.4 5.6 7.4 5.4 L12.6 4.6 C13.2 4.6 13.2 5.4 12.6 5.6 L8.6 6.4 L13 6.6 C13.6 6.8 13.4 7.6 12.8 7.6 L8.4 7.4 L12.4 8.2 C13 8.4 12.8 9.2 12.2 9.1 L7.4 8.6 C6.4 9.4 5.6 9.6 5 9.6 H0.6" fill={tint(p0, 0.9)} stroke={p1} strokeWidth="0.45" {...SJ} />
          </svg>
        </span>
      </span>
      {[
        { l: 46, dx: "-60%" },
        { l: 49, dx: "30%" },
        { l: 52, dx: "90%" },
      ].map((d, i) => (
        <span key={i} className="gp-wh-dust absolute block rounded-full" style={{ left: `${d.l}%`, top: "52%", width: "1.4%", height: "1.4%", background: p0, "--dx": d.dx, animationDelay: dm(delayMs, 820 + i * 70) } as CSSProperties} />
      ))}
      <span className="gp-mm-pip absolute block" style={{ left: "41%", top: "58%", width: "2.4%", height: "3.4%", animationDelay: dm(delayMs, 940) }}>
        <svg viewBox="0 0 6 8" className="block h-full w-full" aria-hidden="true">
          <path d="M0.8 0.6 H5.2 M0.8 7.4 H5.2 M1.3 0.6 C1.3 3 4.7 3 4.7 4 C4.7 5 1.3 5 1.3 7.4 M4.7 0.6 C4.7 3 1.3 3 1.3 4 C1.3 5 4.7 5 4.7 7.4" fill="none" stroke={p2} strokeWidth="0.5" strokeLinecap="round" />
        </svg>
      </span>
      {[0, 1, 2].map((i) => (
        <span key={i} className="gp-wh-pip absolute block rounded-full" style={{ left: `${45 + i * 4}%`, top: "59%", width: "2.4%", height: "2.4%", background: p1, animationDelay: dm(delayMs, 1040 + i * 100) }} />
      ))}
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{ left: "40%", top: "44%", width: "20%", height: "14%", background: `radial-gradient(closest-side, ${tint(p2, 0.45)}, transparent)`, animationDelay: dm(delayMs, 1300) }}
      />
    </Stage>
  );
}

/* --- round 2 helpers (CELL, one board square inside `Stage`, is above) ------------ */
/** A small hourglass in a 0 0 6 8 box: "after their next move". */
function HourglassArt({ stroke }: { stroke: string }) {
  return (
    <svg viewBox="0 0 6 8" className="block h-full w-full" aria-hidden="true">
      <path d="M0.8 0.6 H5.2 M0.8 7.4 H5.2 M1.3 0.6 C1.3 3 4.7 3 4.7 4 C4.7 5 1.3 5 1.3 7.4 M4.7 0.6 C4.7 3 1.3 3 1.3 4 C1.3 5 4.7 5 4.7 7.4" fill="none" stroke={stroke} strokeWidth="0.5" strokeLinecap="round" />
    </svg>
  );
}
/** The mate sign, "#", in a 0 0 10 10 box, with an optional strike through it. */
function MateSign({ ink, strike }: { ink: string; strike?: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <path d="M3.8 1.4 L3 8.6 M7 1.4 L6.2 8.6 M1.4 3.6 H8.6 M1.2 6.4 H8.4" fill="none" stroke={ink} strokeWidth="1.1" strokeLinecap="round" />
      {strike && <path d="M1 9 L9 1" stroke={strike} strokeWidth="1.2" strokeLinecap="round" />}
    </svg>
  );
}

/* --- checkmate_denial -------------------------------------------------------------
   "Once, when your king would be captured, it survives and is moved to the
   nearest safe square in your own half. No timed immunity." An enemy blade
   drops on the king's square; the king hops one square inward (still in its
   own half) along a dotted arc just before it lands, so the blade bites an empty
   square and the mate sign stamped there is struck through. The landing
   square is marked safe, and one pip says it works once (no hourglass: the
   rule has no timer). */
const CD_SHARDS = [
  { dx: "-190%", dy: "-120%", d: 0 },
  { dx: "160%", dy: "-160%", d: 40 },
  { dx: "40%", dy: "180%", d: 80 },
];
function CheckmateDenialHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="gp-focus absolute block rounded-full" style={{ left: "8%", top: "8%", width: "84%", height: "84%", border: `2px solid ${tint(p1, 0.85)}`, animationDelay: dm(delayMs, 0) }} />
      <span className="gp-cd-mate absolute block" style={{ left: "22%", top: "22%", width: "56%", height: "56%", animationDelay: dm(delayMs, 120) }}>
        <MateSign ink={tint(p2, 0.9)} strike={p1} />
      </span>
      <span className="gp-cd-pip absolute block rounded-full" style={{ left: "70%", top: "70%", width: "18%", height: "18%", background: p1, border: `1px solid ${p0}`, animationDelay: dm(delayMs, 520) }} />
    </span>
  );
}
function CheckmateDenialScene({ palette, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <CheckmateDenialHit palette={palette} delayMs={delayMs} />;
  const home = 50 - CELL / 2;
  // the safe square: one file across and one rank up, still in its own half
  // (the king usually stands on its back rank, so it can only step inward)
  const safeTop = `calc(${home}% - var(--fx-side, 1) * ${CELL}%)`;
  return (
    <Stage quakeMs={delayMs + 560}>
      <Rake delayMs={delayMs + 260} tone={tint(p2, 0.55)} lean="calc(var(--fx-ox, 0) * 2.4%)" tip="calc(var(--fx-oy, 0) * 1.5%)" cy={57} width={22} />
      {/* the dotted arc the king escapes along */}
      <span className="gp-cd-trail absolute block" style={{ left: `${home}%`, top: `calc(${home - CELL / 2}% - var(--fx-side, 1) * ${CELL / 2}%)`, width: `${CELL * 2}%`, height: `${CELL * 2}%`, animationDelay: dm(delayMs, 380) }}>
        <svg viewBox="0 0 2 2" className="block h-full w-full" style={{ transform: "scaleY(calc(var(--fx-side, 1) * -1))" }} aria-hidden="true">
          <path d="M0.5 0.5 C0.8 -0.1 1.5 0.6 1.5 1.5" fill="none" stroke={tint(p1, 0.95)} strokeWidth="0.07" strokeDasharray="0.12 0.1" strokeLinecap="round" />
        </svg>
      </span>
      {/* the safe square it lands on */}
      <span className="gp-cd-safe absolute block" style={{ left: `${home + CELL}%`, top: safeTop, width: `${CELL}%`, height: `${CELL}%`, border: `2px solid ${tint(p1, 0.9)}`, animationDelay: dm(delayMs, 600) }} />
      <span className="gp-cd-king absolute block" style={{ left: `${home + 0.4}%`, top: `${home - 0.6}%`, width: `${CELL - 0.8}%`, height: `${CELL}%`, animationDelay: dm(delayMs, 0) }}>
        <Sil d={SIL.k} fill={tint(p0, 0.95)} stroke={p2} />
      </span>
      {/* the capture that would have mated: it lands on an empty square */}
      <span className="gp-cd-mate absolute block" style={{ left: `${home + 1.2}%`, top: `${home + 1.2}%`, width: `${CELL - 2.4}%`, height: `${CELL - 2.4}%`, animationDelay: dm(delayMs, 520) }}>
        <MateSign ink={tint("#3a1c28", 0.85)} />
      </span>
      <span className="gp-cd-strike absolute block" style={{ left: `${home + 0.6}%`, top: `${home + 0.6}%`, width: `${CELL - 1.2}%`, height: `${CELL - 1.2}%`, animationDelay: dm(delayMs, 780) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M1 9 L9 1" stroke={p1} strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </span>
      <span className="gp-cd-blade absolute block" style={{ left: `${home + 1.6}%`, top: `${home - 1.4}%`, width: `${CELL - 3.2}%`, height: `${CELL + 1}%`, animationDelay: dm(delayMs, 260) }}>
        <svg viewBox="0 0 6 10" className="block h-full w-full" style={{ transform: "scaleY(var(--fx-side, 1))" }} aria-hidden="true">
          <path d="M3 9.6 L3.9 8.4 L3.6 3.6 H2.4 L2.1 8.4 Z M1.4 3.2 H4.6 V2.4 H1.4 Z M2.6 2.4 H3.4 V0.6 H2.6 Z" fill="#c9cdd6" stroke={p2} strokeWidth="0.4" {...SJ} />
        </svg>
      </span>
      {CD_SHARDS.map((s, i) => (
        <span key={i} className="gp-cd-shard absolute block" style={{ left: `${49.2}%`, top: "49.2%", width: "1.6%", height: "1.6%", background: "#c9cdd6", "--dx": s.dx, "--dy": s.dy, animationDelay: dm(delayMs, 800 + s.d) } as CSSProperties} />
      ))}
      {/* once */}
      <span className="gp-cd-pip absolute block rounded-full" style={{ left: `${home + CELL * 1.5 - 1.2}%`, top: `calc(${home + CELL + 0.8}% - var(--fx-side, 1) * ${CELL}%)`, width: "2.4%", height: "2.4%", background: p1, border: `1px solid ${p2}`, animationDelay: dm(delayMs, 1000) }} />
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{ left: `${home + CELL - 3}%`, top: `calc(${home - 3}% - var(--fx-side, 1) * ${CELL}%)`, width: `${CELL + 6}%`, height: `${CELL + 6}%`, background: `radial-gradient(closest-side, ${tint(p1, 0.45)}, transparent)`, animationDelay: dm(delayMs, 1150) }}
      />
    </Stage>
  );
}

/* --- draft_tyranny ------------------------------------------------------------------
   "After your opponent's next move, both cards in your next draft are set to
   tier 7, once." An hourglass on the opponent's side (after their move);
   the caster's two draft cards rise showing low tiers (II, IV); a branding
   iron stamps each in turn, the old numeral is knocked off and VII burns in
   under a small iron crown. One pip: once. */
const DT_CARDS = [
  { l: 33, old: "II", d: 520 },
  { l: 58, old: "IV", d: 780 },
];
function DraftTyrannyScene({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 580}>
      <BoardFrame>
        <span className="gp-dt-wait absolute block" style={{ left: "47.5%", top: `calc(${EDGE.enemy} + 2%)`, width: "5%", height: "8.5%", animationDelay: dm(delayMs, 0) }}>
          <HourglassArt stroke={p1} />
        </span>
        {DT_CARDS.map((c, i) => (
          <span key={c.l} className="gp-dt-card absolute block" style={{ left: `${c.l}%`, top: EDGE.own, width: "9%", height: "12.5%", animationDelay: dm(delayMs, 120 + i * 70) }}>
            <CardArt face="#fff7de" edge={p2} />
          </span>
        ))}
        {DT_CARDS.map((c) => (
          <span key={`o${c.l}`} className="gp-dt-old absolute block" style={{ left: `${c.l}%`, top: `calc(${EDGE.own} + 3.5%)`, width: "9%", height: "5.5%", animationDuration: `calc(${Math.round((c.d - 140) / 0.66)}ms * var(--fx-dur, 1))`, animationDelay: dm(delayMs, 140) }}>
            <svg viewBox="0 0 9 5" className="block h-full w-full" aria-hidden="true">
              <text x="4.5" y="4" textAnchor="middle" fontSize="4" fontWeight="700" fontFamily="Georgia, serif" fill={tint(p2, 0.55)}>{c.old}</text>
            </svg>
          </span>
        ))}
        {DT_CARDS.map((c) => (
          <span key={`b${c.l}`} className="gp-dt-brand absolute block" style={{ left: `${c.l + 1}%`, top: `calc(${EDGE.own} - 9%)`, width: "7%", height: "16%", animationDelay: dm(delayMs, c.d - 340) }}>
            <svg viewBox="0 0 7 16" className="block h-full w-full" aria-hidden="true">
              <path d="M3.5 0.6 V9.6" stroke={p2} strokeWidth="0.9" strokeLinecap="round" />
              <rect x="0.6" y="9.6" width="5.8" height="3.4" rx="0.5" fill={p2} stroke={p0} strokeWidth="0.5" />
              <path d="M1.4 13 H5.6" stroke={p0} strokeWidth="0.9" strokeLinecap="round" />
            </svg>
          </span>
        ))}
        {DT_CARDS.map((c) => (
          <span key={`s${c.l}`} className="gp-dt-seven absolute block" style={{ left: `${c.l}%`, top: `calc(${EDGE.own} + 3.5%)`, width: "9%", height: "5.5%", animationDelay: dm(delayMs, c.d) }}>
            <svg viewBox="0 0 9 5" className="block h-full w-full" aria-hidden="true">
              <text x="4.5" y="4" textAnchor="middle" fontSize="4" fontWeight="700" fontFamily="Georgia, serif" fill={p0} stroke={p2} strokeWidth="0.25">VII</text>
            </svg>
          </span>
        ))}
        {DT_CARDS.map((c) => (
          <span key={`k${c.l}`} className="gp-dt-crown absolute block" style={{ left: `${c.l + 2}%`, top: `calc(${EDGE.own} - 3%)`, width: "5%", height: "4%", animationDelay: dm(delayMs, c.d + 180) }}>
            <svg viewBox="0 0 10 8" className="block h-full w-full" aria-hidden="true">
              <path d="M1.4 7 V1.6 L3.5 3.6 L5 0.8 L6.5 3.6 L8.6 1.6 V7 Z" fill={p0} stroke={p2} strokeWidth="0.6" {...SJ} />
            </svg>
          </span>
        ))}
        {DT_CARDS.map((c) => (
          <span key={`m${c.l}`} className="gp-dt-smoke absolute block rounded-full" style={{ left: `${c.l + 3}%`, top: `calc(${EDGE.own} + 2%)`, width: "3%", height: "3%", background: tint(p2, 0.4), animationDelay: dm(delayMs, c.d + 60) }} />
        ))}
        {/* once */}
        <span className="gp-dt-pip absolute block rounded-full" style={{ left: "48.8%", top: `calc(${EDGE.own} + 5%)`, width: "2.4%", height: "2.4%", background: p0, border: `1px solid ${p1}`, animationDelay: dm(delayMs, 1150) }} />
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "28%", top: EDGE.own, width: "44%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p0, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1300) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- full_pardon ---------------------------------------------------------------------
   "Suspend your nerf for your next 12 turns and store one bonus move: after
   your opponent's next move you take an extra move on your following turn."
   A pardon writ unrolls and is sealed; a key turns in the nerf's cuff on the
   cast square, the cuff swings open and is lifted away (suspended, it comes
   back); a twelve-hour dial closes round the square and its hand makes one
   turn (twelve turns); then the stored move, a double step, is pocketed on
   the caster's side beside an hourglass (after their next move). */
const TWELVE_TICKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2;
  const r0 = i % 3 === 0 ? 7.6 : 8.4;
  return `M${(10 + Math.sin(a) * r0).toFixed(2)} ${(10 - Math.cos(a) * r0).toFixed(2)} L${(10 + Math.sin(a) * 9.6).toFixed(2)} ${(10 - Math.cos(a) * 9.6).toFixed(2)}`;
}).join(" ");
function FullPardonScene({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 620}>
      <Rake delayMs={delayMs + 300} tone={tint(p2, 0.5)} lean="calc(var(--fx-ox, 0) * 2.4%)" tip="calc(var(--fx-oy, 0) * 1.5%)" cy={58} width={24} />
      {/* the writ, and its seal */}
      <span className="gp-fp-writ absolute block" style={{ left: "38%", top: "calc(50% - var(--fx-side, 1) * 11% - 3.5%)", width: "24%", height: "7%", animationDelay: dm(delayMs, 0) }}>
        <svg viewBox="0 0 24 7" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
          <rect x="1" y="0.6" width="22" height="5.8" rx="0.6" fill={p0} stroke={p1} strokeWidth="0.5" />
          <path d="M3.4 2.2 H15 M3.4 3.6 H13 M3.4 5 H11" stroke={tint(p2, 0.7)} strokeWidth="0.45" strokeLinecap="round" />
        </svg>
      </span>
      <span className="gp-fp-seal absolute block rounded-full" style={{ left: "56%", top: "calc(50% - var(--fx-side, 1) * 11% - 1.2%)", width: "3%", height: "3%", background: "#c94a5a", border: `1px solid ${p1}`, animationDelay: dm(delayMs, 320) }} />
      {/* twelve turns: the dial closes and its hand goes round once */}
      <span className="gp-fp-dial absolute block" style={{ left: "38%", top: "38%", width: "24%", height: "24%", animationDelay: dm(delayMs, 480) }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <path d={TWELVE_TICKS} stroke={p1} strokeWidth="0.55" strokeLinecap="round" />
        </svg>
      </span>
      <span className="gp-fp-hand absolute block" style={{ left: "49.6%", top: "40.5%", width: "0.8%", height: "9.5%", background: p1, animationDelay: dm(delayMs, 620) }} />
      {/* the nerf's cuff on the cast square: the key turns, it opens and lifts away */}
      <span className="gp-fp-cuff absolute block" style={{ left: "45.5%", top: "46%", width: "9%", height: "8%", animationDelay: dm(delayMs, 60) }}>
        <svg viewBox="0 0 9 8" className="block h-full w-full" aria-hidden="true">
          <path d="M1 4 A3.5 3.5 0 0 0 8 4" fill="none" stroke="#5c5348" strokeWidth="1.3" strokeLinecap="round" />
          <rect x="3.4" y="5.4" width="2.2" height="2" rx="0.3" fill="#5c5348" />
        </svg>
        <span className="gp-fp-arm absolute block" style={{ left: "0%", top: "0%", width: "100%", height: "55%", animationDelay: dm(delayMs, 420) }}>
          <svg viewBox="0 0 9 4.4" className="block h-full w-full" aria-hidden="true">
            <path d="M1 4.2 A3.5 3.5 0 0 1 8 4.2" fill="none" stroke="#5c5348" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </span>
      </span>
      <span className="gp-fp-key absolute block" style={{ left: "48.6%", top: "51.5%", width: "2.8%", height: "5%", animationDelay: dm(delayMs, 260) }}>
        <svg viewBox="0 0 3 5" className="block h-full w-full" aria-hidden="true">
          <circle cx="1.5" cy="1.2" r="0.9" fill="none" stroke={p1} strokeWidth="0.5" />
          <path d="M1.5 2.1 V4.6 M1.5 3.6 H2.3 M1.5 4.4 H2.1" stroke={p1} strokeWidth="0.5" strokeLinecap="round" />
        </svg>
      </span>
      {/* the stored move: a double step pocketed on the caster's side */}
      <span className="gp-fp-bonus absolute block" style={{ left: "46%", top: "calc(50% + var(--fx-side, 1) * 11% - 3%)", width: "8%", height: "6%", animationDelay: dm(delayMs, 900) }}>
        <svg viewBox="0 0 8 6" className="block h-full w-full" style={{ transform: "scaleY(calc(var(--fx-side, 1) * -1))" }} aria-hidden="true">
          <path d="M1.4 4.6 L4 2.4 L6.6 4.6 M1.4 2.8 L4 0.6 L6.6 2.8" fill="none" stroke={p2} strokeWidth="0.9" {...SJ} />
        </svg>
      </span>
      <span className="gp-fp-wait absolute block" style={{ left: "55.5%", top: "calc(50% + var(--fx-side, 1) * 11% - 2.6%)", width: "2.8%", height: "5.2%", animationDelay: dm(delayMs, 1000) }}>
        <HourglassArt stroke={p2} />
      </span>
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{ left: "40%", top: "40%", width: "20%", height: "20%", background: `radial-gradient(closest-side, ${tint(p1, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1250) }}
      />
    </Stage>
  );
}

/* --- throne_and_silence --------------------------------------------------------------
   "For your opponent's next turn they may move only their king or their
   single most valuable piece, and their next draft is skipped entirely."
   The opponent's court stands in a row on their side; a veil of silence
   sweeps along it and every piece falls quiet, gagged and dimmed, except the
   king, who rises on his throne, and the queen (the most valuable piece),
   who stays lit. Then their next draft card is struck through (the
   messengers scatter with the court); one pip is the one turn. */
const TS_COURT: { t: keyof typeof SIL; free?: boolean }[] = [
  { t: "r" }, { t: "n" }, { t: "b" }, { t: "q", free: true }, { t: "k", free: true }, { t: "b" }, { t: "n" }, { t: "r" },
];
function HushHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="gp-focus absolute block rounded-full" style={{ left: "8%", top: "8%", width: "84%", height: "84%", border: `2px solid ${tint(p2, 0.8)}`, animationDelay: dm(delayMs, 0) }} />
      <span className="gp-ts-hood absolute block" style={{ left: "6%", top: "6%", width: "88%", height: "88%", background: tint(p0, 0.45), animationDelay: dm(delayMs, 80) }} />
      <span className="gp-ts-gag absolute block" style={{ left: "14%", top: "44%", width: "72%", height: "12%", background: p2, border: `1px solid ${p0}`, animationDelay: dm(delayMs, 220) }} />
      <span className="gp-ts-pip absolute block rounded-full" style={{ left: "72%", top: "72%", width: "16%", height: "16%", background: p1, animationDelay: dm(delayMs, 480) }} />
    </span>
  );
}
/** The court's row: the opponent's third rank (rank 6 from the caster's
 * view), clear of their pawns and of the cast banner. */
const TS_ROW = "calc(43.75% - var(--fx-side, 1) * 18.75%)";
function ThroneAndSilenceScene({ palette, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <HushHit palette={palette} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 700}>
      <BoardFrame>
        {/* the throne rises behind the king (column e) */}
        <span className="gp-ts-throne absolute block" style={{ left: "50%", top: `calc(${TS_ROW} - 3%)`, width: "12.5%", height: "16%", animationDelay: dm(delayMs, 500) }}>
          <svg viewBox="0 0 10 13" className="block h-full w-full" aria-hidden="true">
            <path d="M1.6 12.4 V1.6 L3.4 0.6 L5 1.8 L6.6 0.6 L8.4 1.6 V12.4 H7 V8 H3 V12.4 Z" fill={tint(p1, 0.35)} stroke={p1} strokeWidth="0.5" {...SJ} />
          </svg>
        </span>
        {TS_COURT.map((c, i) => (
          <span
            key={i}
            className={`${c.free ? "gp-ts-free" : "gp-ts-mute"} absolute block`}
            style={{ left: `${i * 12.5 + 1.75}%`, top: TS_ROW, width: "9%", height: "12.5%", animationDelay: dm(delayMs, c.free ? 60 : 60 + i * 20) }}
          >
            <Sil d={SIL[c.t]} fill={c.free ? tint(p1, 0.95) : tint(p2, 0.95)} stroke={p0} />
          </span>
        ))}
        {/* the veil of silence sweeps the court */}
        <span className="gp-ts-veil absolute block" style={{ left: "0%", top: TS_ROW, width: "18%", height: "12.5%", background: `linear-gradient(90deg, transparent, ${tint(p0, 0.75)}, transparent)`, animationDelay: dm(delayMs, 260) }} />
        {TS_COURT.map((c, i) =>
          c.free ? null : (
            <span key={`g${i}`} className="gp-ts-gag absolute block" style={{ left: `${i * 12.5 + 3}%`, top: `calc(${TS_ROW} + 5.4%)`, width: "6.5%", height: "1.6%", background: p0, animationDelay: dm(delayMs, 320 + i * 60) }} />
          ),
        )}
        {/* their next draft: struck through, and the one turn */}
        <span className="gp-ts-skip absolute block" style={{ left: "45.5%", top: "calc(43.75% + var(--fx-side, 1) * 6.25%)", width: "9%", height: "12.5%", animationDelay: dm(delayMs, 900) }}>
          <svg viewBox="0 0 9 12" className="block h-full w-full" aria-hidden="true">
            <rect x="0.5" y="0.5" width="8" height="11" rx="1" fill={tint(p2, 0.6)} stroke={tint(p0, 0.9)} strokeWidth="0.6" />
            <path d="M1.4 1.6 L7.6 10.4 M7.6 1.6 L1.4 10.4" stroke={p0} strokeWidth="1" strokeLinecap="round" />
          </svg>
        </span>
        <span className="gp-ts-pip absolute block rounded-full" style={{ left: "57%", top: "calc(48.8% + var(--fx-side, 1) * 6.25%)", width: "2.4%", height: "2.4%", background: p1, border: `1px solid ${p0}`, animationDelay: dm(delayMs, 1080) }} />
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "36%", top: TS_ROW, width: "28%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p1, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1300) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- wa_dominate_major (Grand Dominion) ------------------------------------------------
   "Take control of one enemy rook or queen: it becomes yours, once." The
   cast square is the chosen piece: a leash of dominion is hauled up to it
   from the caster's side, a signet ring stamps it with the caster's crest,
   and the piece's standard turns over from the enemy's colours to the
   caster's. On the piece itself (target cut) the same standard flips. One
   pip: once. */
function Standard({ cloth, pole }: { cloth: string; pole: string }) {
  return (
    <svg viewBox="0 0 8 10" className="block h-full w-full" aria-hidden="true">
      <path d="M1.4 0.6 V9.4" stroke={pole} strokeWidth="0.7" strokeLinecap="round" />
      <path d="M1.8 1 H7.2 L5.8 3 L7.2 5 H1.8 Z" fill={cloth} stroke={pole} strokeWidth="0.4" {...SJ} />
    </svg>
  );
}
function DominionFlip({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, p1] = palette;
  return (
    <>
      <span className="gp-dm-was absolute inset-0 block" style={{ animationDelay: dm(delayMs, 0) }}>
        <Standard cloth="#2a2a38" pole={tint(p1, 0.9)} />
      </span>
      <span className="gp-dm-now absolute inset-0 block" style={{ animationDelay: dm(delayMs, 0) }}>
        <Standard cloth={p0} pole={p1} />
      </span>
    </>
  );
}
function DominionHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, p1] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="gp-focus absolute block rounded-full" style={{ left: "8%", top: "8%", width: "84%", height: "84%", border: `2px solid ${tint(p0, 0.85)}`, animationDelay: dm(delayMs, 0) }} />
      <span className="absolute block" style={{ left: "52%", top: "4%", width: "40%", height: "50%" }}>
        <DominionFlip palette={palette} delayMs={delayMs + 160} />
      </span>
      <span className="gp-dm-pip absolute block rounded-full" style={{ left: "10%", top: "72%", width: "16%", height: "16%", background: p1, animationDelay: dm(delayMs, 620) }} />
    </span>
  );
}
function WaDominateMajorScene({ palette, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <DominionHit palette={palette} delayMs={delayMs} />;
  // The cast square IS the chosen piece. The leash is hauled up from the
  // caster's side to it, and the piece's standard is planted two squares
  // toward the caster, clear of the cast banner that sits over the far ranks.
  const toward = (cells: number) => `calc(${50 - CELL / 2}% + var(--fx-side, 1) * ${cells * CELL}%)`;
  return (
    <Stage quakeMs={delayMs + 420}>
      <Rake delayMs={delayMs + 240} tone={tint(p0, 0.5)} lean="calc(var(--fx-ox, 0) * 2.4%)" tip="calc(var(--fx-oy, 0) * 1.5%)" cy={57} width={22} />
      <span
        className="gp-dm-leash absolute block"
        style={{ left: `${50 - 1.4}%`, top: `calc(${50 - 2 * CELL}% + var(--fx-side, 1) * ${2 * CELL}%)`, width: "2.8%", height: `${4 * CELL}%`, animationDelay: dm(delayMs, 120) }}
      >
        <svg viewBox="0 0 4 40" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
          {[3, 9, 15, 21, 27, 33, 38].map((y, i) => (
            <ellipse key={y} cx="2" cy={y} rx={i % 2 ? 0.7 : 1.5} ry="2.6" fill="none" stroke={p0} strokeWidth="0.7" />
          ))}
        </svg>
      </span>
      <span className="gp-dm-signet absolute block" style={{ left: "45%", top: "44.5%", width: "10%", height: "11%", animationDelay: dm(delayMs, 380) }}>
        <svg viewBox="0 0 10 11" className="block h-full w-full" aria-hidden="true">
          <circle cx="5" cy="7" r="3.2" fill="none" stroke={p1} strokeWidth="1" />
          <path d="M2.6 3.6 H7.4 L8 1.2 L6.4 2.2 L5 0.4 L3.6 2.2 L2 1.2 Z" fill={p0} stroke={p1} strokeWidth="0.5" {...SJ} />
        </svg>
      </span>
      {/* the standard turns over from the enemy's colours to the caster's */}
      <span className="absolute block" style={{ left: `${50 - CELL * 0.35}%`, top: toward(2), width: `${CELL * 0.9}%`, height: `${CELL * 1.1}%` }}>
        <DominionFlip palette={palette} delayMs={delayMs + 560} />
      </span>
      <span className="gp-dm-pip absolute block rounded-full" style={{ left: `${50 + CELL * 0.7}%`, top: `calc(${toward(2)} + ${CELL * 0.7}%)`, width: "2.4%", height: "2.4%", background: p1, border: `1px solid ${p2}`, animationDelay: dm(delayMs, 1060) }} />
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{ left: `${50 - CELL}%`, top: `calc(${50 - CELL}% + var(--fx-side, 1) * ${2 * CELL}%)`, width: `${2 * CELL}%`, height: `${2 * CELL}%`, background: `radial-gradient(closest-side, ${tint(p0, 0.45)}, transparent)`, animationDelay: dm(delayMs, 1200) }}
      />
    </Stage>
  );
}

/* --- unshackled_wrath ------------------------------------------------------------------
   "Suspend your nerf for your next 14 turns, then it returns at full
   strength. Your opponent skips their next turn." The nerf is a manacle on
   the caster's side, chained along their edge by fourteen links (the
   fourteen turns, counted by a glint that runs them). The manacle bursts,
   its halves thrown apart, and drift back together as they fade (it
   returns); the wrath roars across the board and knocks the opponent's
   hourglass flat: their next turn is skipped. */
const UW_FRAGS = [
  { dx: "-220%", dy: "-160%", d: 0 },
  { dx: "200%", dy: "-200%", d: 30 },
  { dx: "-60%", dy: "-260%", d: 60 },
];
const FOURTEEN_LINKS = Array.from({ length: 14 }, (_, i) => i * 6 + 3);
function UnshackledWrathScene({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  // the caster's third rank, just in front of their pawns
  const cuffTop = `calc(${EDGE.own} - var(--fx-side, 1) * 6.25% + 1%)`;
  return (
    <Stage quakeMs={delayMs + 520}>
      <BoardFrame>
        {/* fourteen links: the fourteen turns */}
        <span className="gp-uw-chain absolute block" style={{ left: "8%", top: `calc(${cuffTop} + 3.2%)`, width: "84%", height: "4%", animationDelay: dm(delayMs, 0) }}>
          <svg viewBox="0 0 84 4" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            {FOURTEEN_LINKS.map((x, i) => (
              <ellipse key={x} cx={x} cy="2" rx="2.6" ry={i % 2 ? 0.7 : 1.5} fill="none" stroke={p1} strokeWidth="0.7" />
            ))}
          </svg>
        </span>
        <span className="gp-uw-count absolute block" style={{ left: "8%", top: `calc(${cuffTop} + 2.2%)`, width: "8%", height: "6%", background: `linear-gradient(90deg, transparent, ${tint(p2, 0.9)}, transparent)`, animationDelay: dm(delayMs, 900) }} />
        {/* the manacle bursts: its halves fly apart and come back as they fade */}
        {[
          { l: 41.5, cls: "gp-uw-left", d: "M5 1 A4 4 0 0 0 5 9" },
          { l: 50, cls: "gp-uw-right", d: "M1 1 A4 4 0 0 1 1 9" },
        ].map((h) => (
          <span key={h.cls} className={`${h.cls} absolute block`} style={{ left: `${h.l}%`, top: cuffTop, width: "8.5%", height: "10.5%", animationDelay: dm(delayMs, 60) }}>
            <svg viewBox="0 0 6 10" className="block h-full w-full" aria-hidden="true">
              <path d={h.d} fill="none" stroke={p1} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
        ))}
        {UW_FRAGS.map((f, i) => (
          <span key={i} className="gp-uw-frag absolute block" style={{ left: "49%", top: `calc(${cuffTop} + 4%)`, width: "2%", height: "2%", background: p2, "--dx": f.dx, "--dy": `calc(${f.dy} * var(--fx-side, 1))`, animationDelay: dm(delayMs, 480 + f.d) } as CSSProperties} />
        ))}
        {/* the wrath crosses to their side */}
        <span className="gp-uw-roar absolute block" style={{ left: "46%", top: "31.25%", width: "8%", height: "37.5%", animationDelay: dm(delayMs, 520) }}>
          <svg viewBox="0 0 8 30" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d="M4 0.6 L2 7 L6 12 L2.4 18 L5.6 23 L4 29.4" fill="none" stroke={p0} strokeWidth="1.4" {...SJ} />
          </svg>
        </span>
        {/* their hourglass is knocked flat: the skipped turn */}
        <span className="gp-uw-topple absolute block" style={{ left: "46.5%", top: `calc(${EDGE.enemy} + 1.5%)`, width: "7%", height: "10%", animationDelay: dm(delayMs, 400) }}>
          <HourglassArt stroke={p0} />
        </span>
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "34%", top: cuffTop, width: "32%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p0, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1250) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- sovereign_draft -------------------------------------------------------------------
   "Take both cards in your next draft, that draft rolls one tier higher, and
   you see the tier of your opponent's next offer." Two cards rise on the
   caster's side and a gold sash binds them (both are taken), a chevron climbs
   over each (one tier higher); across the board the opponent's next offer
   lies face down, a spyglass travels over to it, and only its tier tag lifts
   into view. */
function SovereignDraftScene({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const cards = [36, 55];
  return (
    <Stage quakeMs={delayMs + 560}>
      <BoardFrame>
        {cards.map((l, i) => (
          <span key={l} className="gp-sd-card absolute block" style={{ left: `${l}%`, top: EDGE.own, width: "9%", height: "12.5%", animationDelay: dm(delayMs, 80 + i * 80) }}>
            <CardArt face={p1} edge={p2} mark={p0} />
          </span>
        ))}
        <span className="gp-sd-sash absolute block" style={{ left: "34%", top: `calc(${EDGE.own} + 7.6%)`, width: "32%", height: "2.4%", background: `linear-gradient(90deg, ${p2}, ${p0} 50%, ${p2})`, animationDelay: dm(delayMs, 420) }} />
        {cards.map((l, i) => (
          <span key={`u${l}`} className="gp-sd-up absolute block" style={{ left: `${l + 2.5}%`, top: `calc(${EDGE.own} - 5.5%)`, width: "4%", height: "4%", animationDelay: dm(delayMs, 600 + i * 90) }}>
            <svg viewBox="0 0 8 8" className="block h-full w-full" aria-hidden="true">
              <path d="M1 6 L4 2.6 L7 6 M1 3.6 L4 0.4 L7 3.6" fill="none" stroke={p0} strokeWidth="1" {...SJ} />
            </svg>
          </span>
        ))}
        {/* their next offer: face down, only its tier is seen */}
        <span className="gp-sd-back absolute block" style={{ left: "45.5%", top: EDGE.enemy, width: "9%", height: "12.5%", animationDelay: dm(delayMs, 200) }}>
          <svg viewBox="0 0 9 12" className="block h-full w-full" aria-hidden="true">
            <rect x="0.5" y="0.5" width="8" height="11" rx="1" fill="#2a2a38" stroke={p2} strokeWidth="0.6" />
            <path d="M1.6 1.6 L7.4 10.4 M7.4 1.6 L1.6 10.4 M4.5 1.6 V10.4" stroke={tint(p2, 0.45)} strokeWidth="0.35" />
          </svg>
        </span>
        <span className="gp-sd-glass absolute block" style={{ left: "46.5%", top: `calc(${EDGE.enemy} + 2.5%)`, width: "7%", height: "9%", animationDelay: dm(delayMs, 640) }}>
          <svg viewBox="0 0 7 9" className="block h-full w-full" aria-hidden="true">
            <circle cx="3.5" cy="3.5" r="2.8" fill={tint(p1, 0.25)} stroke={p0} strokeWidth="0.7" />
            <path d="M5.4 5.6 L6.6 8.6" stroke={p2} strokeWidth="0.9" strokeLinecap="round" />
          </svg>
        </span>
        <span className="gp-sd-tag absolute block" style={{ left: "46.5%", top: `calc(${EDGE.enemy} + 4% + var(--fx-side, 1) * 10.5%)`, width: "7%", height: "4.6%", animationDelay: dm(delayMs, 1000) }}>
          <svg viewBox="0 0 10 6" className="block h-full w-full" aria-hidden="true">
            <rect x="0.4" y="0.4" width="9.2" height="5.2" rx="1" fill={p1} stroke={p2} strokeWidth="0.5" />
            <text x="5" y="4.5" textAnchor="middle" fontSize="4" fontWeight="700" fontFamily="Georgia, serif" fill={p2}>IV</text>
          </svg>
        </span>
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "30%", top: EDGE.own, width: "40%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p0, 0.45)}, transparent)`, animationDelay: dm(delayMs, 1250) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- divine_legion ---------------------------------------------------------------------
   "Add a queen to your pocket, then spend a later turn to drop it onto any
   empty square." A queen comes down from the middle of the board into a
   pouch on the caster's side and the drawstring pulls tight (it is in your
   pocket); then three empty squares in the middle flicker as places it could
   land, and a dashed ghost of the queen stands in one of them (later). */
const DL_SPOTS = [
  { l: 25, t: 37.5 },
  { l: 50, t: 37.5 },
  { l: 62.5, t: 50 },
];
function DivineLegionScene({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 520}>
      <BoardFrame>
        <span className="gp-dl-pouch absolute block" style={{ left: "44%", top: EDGE.own, width: "12%", height: "12.5%", animationDelay: dm(delayMs, 0) }}>
          <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
            <path d="M3 3.4 C1 5 0.8 10.8 6 11.2 C11.2 10.8 11 5 9 3.4 Z" fill={tint(p2, 0.85)} stroke={p1} strokeWidth="0.6" {...SJ} />
            <path d="M2.6 3.4 H9.4" stroke={p1} strokeWidth="0.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className="gp-dl-queen absolute block" style={{ left: "45.5%", top: `calc(${EDGE.own} - 3%)`, width: "9%", height: "11%", animationDelay: dm(delayMs, 120) }}>
          <Sil d={SIL.q} fill={p0} stroke={p1} />
        </span>
        <span className="gp-dl-tie absolute block" style={{ left: "45.5%", top: `calc(${EDGE.own} + 2.4%)`, width: "9%", height: "2%", background: p1, animationDelay: dm(delayMs, 640) }} />
        {/* later: any empty square will do */}
        {DL_SPOTS.map((s, i) => (
          <span key={i} className="gp-dl-spot absolute block" style={{ left: `${s.l + 1.5}%`, top: `${s.t + 1.5}%`, width: "9.5%", height: "9.5%", border: `2px dashed ${tint(p1, 0.9)}`, animationDelay: dm(delayMs, 860 + i * 110) }} />
        ))}
        <span className="gp-dl-ghost absolute block" style={{ left: "52%", top: "39%", width: "8.5%", height: "9.5%", animationDelay: dm(delayMs, 1180) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d={SIL.q} fill={tint(p0, 0.3)} stroke={p1} strokeWidth="0.5" strokeDasharray="0.8 0.6" {...SJ} />
          </svg>
        </span>
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "38%", top: EDGE.own, width: "24%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p1, 0.45)}, transparent)`, animationDelay: dm(delayMs, 1250) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- absolute_aegis ----------------------------------------------------------------------
   "Every one of your pieces cannot be captured for 2 full turns, and this
   time that includes your king. But each protected piece loses its
   protection once it makes a capture." A ward settles over the caster's home
   ranks, a great shield rises in it with the king's crown on its face (the
   king too), two pips are the two turns; then one knight lunges out to take
   something and its own small shield cracks and falls away. Every piece of
   the caster's gets a small shield and two pips (target cut). */
function AegisHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="gp-aa-mini absolute block" style={{ left: "56%", top: "6%", width: "38%", height: "44%", animationDelay: dm(delayMs, 0) }}>
        <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
          <path d="M5 0.8 L9 2.2 V5.6 C9 8.4 7.2 10.2 5 11.2 C2.8 10.2 1 8.4 1 5.6 V2.2 Z" fill={tint(p0, 0.85)} stroke={p2} strokeWidth="0.7" {...SJ} />
          <circle cx="3.6" cy="6" r="0.9" fill={p1} />
          <circle cx="6.4" cy="6" r="0.9" fill={p1} />
        </svg>
      </span>
    </span>
  );
}
function AbsoluteAegisScene({ palette, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <AegisHit palette={palette} delayMs={delayMs} />;
  const home = "calc(37.5% + var(--fx-side, 1) * 37.5%)";
  return (
    <Stage quakeMs={delayMs + 560}>
      <BoardFrame>
        <span className="gp-aa-ward absolute block" style={{ left: "0%", top: home, width: "100%", height: "25%", background: `linear-gradient(180deg, ${tint(p0, 0.28)}, ${tint(p2, 0.12)})`, animationDelay: dm(delayMs, 0) }} />
        <span className="gp-aa-edge absolute block" style={{ left: "0%", top: `calc(${home} + 12.5% - var(--fx-side, 1) * 12.5%)`, width: "100%", height: "1%", background: tint(p0, 0.95), animationDelay: dm(delayMs, 120) }} />
        <span className="gp-aa-shield absolute block" style={{ left: "42%", top: `calc(${home} + 1%)`, width: "16%", height: "23%", animationDelay: dm(delayMs, 240) }}>
          <svg viewBox="0 0 16 23" className="block h-full w-full" aria-hidden="true">
            <path d="M8 1 L15 3.4 V10 C15 16 11.6 19.8 8 22 C4.4 19.8 1 16 1 10 V3.4 Z" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="0.8" {...SJ} />
            <path d="M4.6 11.4 V7 L6.3 8.8 L8 5.8 L9.7 8.8 L11.4 7 V11.4 Z" fill={p1} stroke={tint(p2, 0.9)} strokeWidth="0.4" {...SJ} />
          </svg>
        </span>
        {[0, 1].map((i) => (
          <span key={i} className="gp-aa-pip absolute block rounded-full" style={{ left: `${46.6 + i * 4}%`, top: `calc(${home} + 16.5%)`, width: "2.4%", height: "2.4%", background: p1, border: `1px solid ${p2}`, animationDelay: dm(delayMs, 760 + i * 110) }} />
        ))}
        {/* the catch: a capture drops that piece's protection */}
        <span className="gp-aa-lunge absolute block" style={{ left: "70.5%", top: `calc(${home} + 12.5% - var(--fx-side, 1) * 6.25%)`, width: "9%", height: "11%", animationDelay: dm(delayMs, 900) }}>
          <Sil d={SIL.n} fill={tint(p2, 0.95)} stroke={p0} />
        </span>
        {[
          { cls: "gp-aa-crackl", d: "M4 0.8 L1 2 V5 C1 7.6 2.4 9 4 10 L3.2 6 L4.4 3.6 Z" },
          { cls: "gp-aa-crackr", d: "M4 0.8 L7 2 V5 C7 7.6 5.6 9 4 10 L3.2 6 L4.4 3.6 Z" },
        ].map((h) => (
          <span key={h.cls} className={`${h.cls} absolute block`} style={{ left: "77.5%", top: `calc(${home} + 12.5% - var(--fx-side, 1) * 6.25% - 2%)`, width: "5%", height: "7%", animationDelay: dm(delayMs, 900) }}>
            <svg viewBox="0 0 8 11" className="block h-full w-full" aria-hidden="true">
              <path d={h.d} fill={tint(p0, 0.9)} stroke={p2} strokeWidth="0.5" {...SJ} />
            </svg>
          </span>
        ))}
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "34%", top: home, width: "32%", height: "25%", background: `radial-gradient(closest-side, ${tint(p0, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1300) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- great_divide ----------------------------------------------------------------------
   "One full rank you pick becomes impassable to enemies for your opponent's
   next 2 turns. Pieces already standing on that rank may still leave it."
   Battlements rise along the whole of the chosen rank (the cast square's), the
   enemy's advances run at it from their side and are thrown back, and one of
   the caster's pieces standing on the rank steps off it toward home, through
   its own wall. Two pips are the two turns. */
const GD_REPEL = [-2.5, 0.5, 2.5];
function GreatDivideScene({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const rankTop = 50 - CELL / 2;
  return (
    <Stage quakeMs={delayMs + 520}>
      <Rake delayMs={delayMs + 280} tone={tint(p1, 0.5)} lean="calc(var(--fx-ox, 0) * 2.4%)" tip="calc(var(--fx-oy, 0) * 1.5%)" cy={56} width={30} />
      <span className="gp-gd-wall absolute block" style={{ left: "0%", top: `${rankTop}%`, width: "100%", height: `${CELL}%`, animationDelay: dm(delayMs, 60) }}>
        <svg viewBox="0 0 140 10" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
          <path
            d={`M0 10 V4 ${Array.from({ length: 14 }, (_, i) => `H${i * 10 + 2} V1 H${i * 10 + 8} V4`).join(" ")} H140 V10 Z`}
            fill={tint(p0, 0.72)}
            stroke={p1}
            strokeWidth="0.5"
          />
          <path d="M0 7 H140" stroke={tint(p1, 0.6)} strokeWidth="0.35" strokeDasharray="3 2" />
        </svg>
      </span>
      {GD_REPEL.map((c, i) => (
        <span
          key={c}
          className="gp-gd-repel absolute block"
          style={{ left: `${50 + c * CELL - 2.4}%`, top: `calc(${rankTop}% - var(--fx-side, 1) * ${CELL * 1.2}% + ${CELL * 0.1}%)`, width: "4.8%", height: `${CELL * 0.8}%`, animationDelay: dm(delayMs, 520 + i * 80) }}
        >
          <svg viewBox="0 0 6 10" className="block h-full w-full" style={{ transform: "scaleY(var(--fx-side, 1))" }} aria-hidden="true">
            <path d="M3 0.8 V7 M0.8 5 L3 8.6 L5.2 5" fill="none" stroke={tint(p2, 0.95)} strokeWidth="1.1" {...SJ} />
          </svg>
        </span>
      ))}
      {/* one of yours already on the rank may still leave it */}
      <span className="gp-gd-leave absolute block" style={{ left: `${50 + 1.5 * CELL + 0.6}%`, top: `${rankTop + 0.2}%`, width: `${CELL - 1.2}%`, height: `${CELL - 0.4}%`, animationDelay: dm(delayMs, 760) }}>
        <Sil d={SIL.p} fill={tint(p2, 0.9)} stroke={p1} />
      </span>
      {[0, 1].map((i) => (
        <span key={i} className="gp-gd-pip absolute block rounded-full" style={{ left: `${47.6 + i * 3.2}%`, top: `calc(${50 - 1.2}% + var(--fx-side, 1) * ${CELL * 0.85}%)`, width: "2.4%", height: "2.4%", background: p2, border: `1px solid ${p1}`, animationDelay: dm(delayMs, 1000 + i * 110) }} />
      ))}
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{ left: "20%", top: `${rankTop - 1}%`, width: "60%", height: `${CELL + 2}%`, background: `radial-gradient(closest-side, ${tint(p2, 0.35)}, transparent)`, animationDelay: dm(delayMs, 1250) }}
      />
    </Stage>
  );
}

/* --- grand_malediction -----------------------------------------------------------------
   "Your opponent skips their next turn." A hex star is drawn on the
   opponent's side round their hourglass; the turn, drawn as an arrow, sets
   off from the middle of the board toward them, strikes the hex, turns right
   round and comes back to the caster (the turn is yours again). One pip. */
/** Centre of the opponent's third rank, below the cast banner. */
const GM_Y = "calc(50% - var(--fx-side, 1) * 18.75%)";
function GrandMaledictionScene({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 640}>
      <BoardFrame>
        <span className="gp-gm-sigil absolute block" style={{ left: "40%", top: `calc(${GM_Y} - 10%)`, width: "20%", height: "20%", animationDelay: dm(delayMs, 0) }}>
          <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
            <circle cx="10" cy="10" r="9.2" fill={tint(p2, 0.35)} stroke={p0} strokeWidth="0.6" />
            <path d="M10 1.6 L17.3 14.2 H2.7 Z" fill="none" stroke={p1} strokeWidth="0.6" {...SJ} />
            <path d="M10 18.4 L2.7 5.8 H17.3 Z" fill="none" stroke={p0} strokeWidth="0.6" {...SJ} />
          </svg>
        </span>
        <span className="gp-gm-glass absolute block" style={{ left: "47.8%", top: `calc(${GM_Y} - 3.5%)`, width: "4.4%", height: "7%", animationDelay: dm(delayMs, 120) }}>
          <HourglassArt stroke={p1} />
        </span>
        {/* the turn goes to them, strikes the hex and comes straight back */}
        <span className="gp-gm-turn absolute block" style={{ left: "46%", top: "44.5%", width: "8%", height: "11%", animationDelay: dm(delayMs, 280) }}>
          <svg viewBox="0 0 6 8" className="block h-full w-full" style={{ transform: "scaleY(var(--fx-side, 1))" }} aria-hidden="true">
            <path d="M3 7.4 V1.4 M0.8 3.6 L3 0.8 L5.2 3.6" fill="none" stroke={p2} strokeWidth="1.8" {...SJ} />
            <path d="M3 7.4 V1.4 M0.8 3.6 L3 0.8 L5.2 3.6" fill="none" stroke={p1} strokeWidth="0.9" {...SJ} />
          </svg>
        </span>
        <span className="gp-gm-zap absolute block rounded-full" style={{ left: "44%", top: `calc(${GM_Y} - 6%)`, width: "12%", height: "12%", border: `2px solid ${tint(p1, 0.9)}`, animationDelay: dm(delayMs, 640) }} />
        <span className="gp-gm-pip absolute block rounded-full" style={{ left: "48.8%", top: `calc(${EDGE.own} + 5%)`, width: "2.4%", height: "2.4%", background: p1, border: `1px solid ${p2}`, animationDelay: dm(delayMs, 1180) }} />
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "38%", top: `calc(${GM_Y} - 6.25%)`, width: "24%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p0, 0.45)}, transparent)`, animationDelay: dm(delayMs, 1250) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- age_of_heroes -----------------------------------------------------------------------
   "The old songs come true for three champions: choose one of your knights,
   one bishop, and one rook. Until each next moves it may also move like a
   queen, a single stroke apiece." A lyre is struck on the first champion and
   three notes rise from it (the song, one per champion) under a laurel. On
   each chosen piece (target cut) a queen's crown hangs over it and the
   queen's eight lines flash out once, with one pip: a single stroke. */
const AH_NOTES = [
  { dx: "-160%", dy: "-230%", d: 0 },
  { dx: "20%", dy: "-300%", d: 90 },
  { dx: "190%", dy: "-220%", d: 180 },
];
const QUEEN_LINES = "M5 0.4 V9.6 M0.4 5 H9.6 M1.6 1.6 L8.4 8.4 M8.4 1.6 L1.6 8.4";
function HeroHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="gp-ah-star absolute block" style={{ left: "-60%", top: "-60%", width: "220%", height: "220%", animationDelay: dm(delayMs, 80) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d={QUEEN_LINES} stroke={tint(p0, 0.95)} strokeWidth="0.32" strokeDasharray="0.6 0.35" strokeLinecap="round" />
        </svg>
      </span>
      <span className="gp-ah-crown absolute block" style={{ left: "20%", top: "-22%", width: "60%", height: "46%", animationDelay: dm(delayMs, 0) }}>
        <Sil d={SIL.q} fill={p0} stroke={p1} />
      </span>
      <span className="gp-ah-pip absolute block rounded-full" style={{ left: "72%", top: "72%", width: "16%", height: "16%", background: p2, border: `1px solid ${p1}`, animationDelay: dm(delayMs, 420) }} />
    </span>
  );
}
function AgeOfHeroesScene({ palette, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <HeroHit palette={palette} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 380}>
      <Rake delayMs={delayMs + 240} tone={tint(p1, 0.45)} lean="calc(var(--fx-ox, 0) * 2.4%)" tip="calc(var(--fx-oy, 0) * 1.5%)" cy={57} width={22} />
      <span className="gp-ah-laurel absolute block" style={{ left: "43%", top: "37%", width: "14%", height: "8%", animationDelay: dm(delayMs, 500) }}>
        <svg viewBox="0 0 14 8" className="block h-full w-full" aria-hidden="true">
          <path d="M1 1 C2 5 4.6 7 7 7 C9.4 7 12 5 13 1" fill="none" stroke={p0} strokeWidth="0.6" strokeLinecap="round" />
          {[2, 3.6, 5.4].map((x) => (
            <g key={x}>
              <ellipse cx={x} cy={x * 0.8 + 0.6} rx="0.9" ry="0.45" transform={`rotate(-40 ${x} ${x * 0.8 + 0.6})`} fill={p0} />
              <ellipse cx={14 - x} cy={x * 0.8 + 0.6} rx="0.9" ry="0.45" transform={`rotate(40 ${14 - x} ${x * 0.8 + 0.6})`} fill={p0} />
            </g>
          ))}
        </svg>
      </span>
      <span className="gp-ah-lyre absolute block" style={{ left: "45.5%", top: "45%", width: "9%", height: "10%", animationDelay: dm(delayMs, 0) }}>
        <svg viewBox="0 0 9 10" className="block h-full w-full" aria-hidden="true">
          <path d="M1.4 1 C0.4 4 1.6 7.6 4.5 8.6 C7.4 7.6 8.6 4 7.6 1 M1.2 2 H7.8" fill="none" stroke={p0} strokeWidth="0.8" {...SJ} />
          <path d="M4.5 8.6 V9.6 M3 9.6 H6" stroke={p0} strokeWidth="0.7" strokeLinecap="round" />
        </svg>
        <span className="gp-ah-strum absolute block" style={{ left: "30%", top: "20%", width: "40%", height: "58%", animationDelay: dm(delayMs, 260) }}>
          <svg viewBox="0 0 4 6" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <path d="M0.6 0 V6 M2 0 V6 M3.4 0 V6" stroke={p2} strokeWidth="0.3" />
          </svg>
        </span>
      </span>
      {AH_NOTES.map((n, i) => (
        <span key={i} className="gp-ah-note absolute block" style={{ left: "48.5%", top: "46%", width: "3%", height: "4.4%", "--dx": n.dx, "--dy": n.dy, animationDelay: dm(delayMs, 320 + n.d) } as CSSProperties}>
          <svg viewBox="0 0 4 6" className="block h-full w-full" aria-hidden="true">
            <ellipse cx="1.4" cy="4.8" rx="1.2" ry="0.9" fill={p1} />
            <path d="M2.5 4.6 V0.6 L3.6 1.4" fill="none" stroke={p1} strokeWidth="0.5" {...SJ} />
          </svg>
        </span>
      ))}
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{ left: "40%", top: "40%", width: "20%", height: "18%", background: `radial-gradient(closest-side, ${tint(p0, 0.45)}, transparent)`, animationDelay: dm(delayMs, 1150) }}
      />
    </Stage>
  );
}

/** A rank of piece silhouettes in a 0 0 80 10 box, one per file; a gap in
 * `types` (null) leaves that file empty. */
const BACK_RANK: (keyof typeof SIL)[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
const PAWN_RANK: (keyof typeof SIL)[] = ["p", "p", "p", "p", "p", "p", "p", "p"];
function RankRow({ types, fill, stroke }: { types: (keyof typeof SIL | null)[]; fill: string; stroke: string }) {
  return (
    <svg viewBox="0 0 80 10" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
      {types.map((t, i) => (t ? <path key={i} d={SIL[t]} transform={`translate(${i * 10} 0)`} fill={fill} stroke={stroke} strokeWidth="0.5" {...SJ} /> : null))}
    </svg>
  );
}
/** Tops of the four home ranks, as BoardFrame percentages: the caster's back
 * and pawn ranks, then the opponent's. */
const HOME = {
  ownBack: "calc(43.75% + var(--fx-side, 1) * 43.75%)",
  ownPawn: "calc(43.75% + var(--fx-side, 1) * 31.25%)",
  enemyPawn: "calc(43.75% - var(--fx-side, 1) * 31.25%)",
  enemyBack: "calc(43.75% - var(--fx-side, 1) * 43.75%)",
} as const;

/* --- genesis ----------------------------------------------------------------------------
   "Reset the entire board to the opening position, once. Every lingering
   effect is washed away." A green tide sweeps the board from the caster's
   edge to the far one; the lingering marks scattered over the board (zone
   tiles, runes) are wiped as it passes, and behind it the four home ranks
   stand up again in the opening order. One pip: once. */
const GN_MARKS = [
  { l: 12.5, t: 50, d: 180 },
  { l: 62.5, t: 62.5, d: 120 },
  { l: 37.5, t: 37.5, d: 300 },
  { l: 75, t: 25, d: 420 },
  { l: 25, t: 25, d: 440 },
];
function GenesisScene({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 600}>
      <BoardFrame>
        {/* lingering effects, wiped as the tide reaches their rank */}
        {GN_MARKS.map((m, i) => (
          <span
            key={i}
            className="gp-gn-mark absolute block"
            style={{ left: `${m.l + 1.5}%`, top: `calc(43.75% + var(--fx-side, 1) * ${m.t - 43.75}% + 1.5%)`, width: "9.5%", height: "9.5%", border: `2px dashed ${tint(p2, 0.85)}`, background: tint(p2, 0.18), animationDelay: dm(delayMs, 0), animationDuration: `calc(${440 + m.d}ms * var(--fx-dur, 1))` }}
          />
        ))}
        <span className="gp-gn-tide absolute block" style={{ left: "0%", top: HOME.ownBack, width: "100%", height: "16%", background: `linear-gradient(calc(90deg - var(--fx-side, 1) * 90deg), transparent, ${tint(p0, 0.2)} 40%, ${tint(p0, 0.75)})`, animationDelay: dm(delayMs, 100) }} />
        {/* the opening position stands up again behind it */}
        {[
          { top: HOME.ownBack, types: BACK_RANK, own: true, d: 260 },
          { top: HOME.ownPawn, types: PAWN_RANK, own: true, d: 320 },
          { top: HOME.enemyPawn, types: PAWN_RANK, own: false, d: 640 },
          { top: HOME.enemyBack, types: BACK_RANK, own: false, d: 700 },
        ].map((r, i) => (
          <span key={i} className="gp-gn-rank absolute block" style={{ left: "1%", top: `calc(${r.top} + 1%)`, width: "98%", height: "10.5%", animationDelay: dm(delayMs, r.d) }}>
            <RankRow types={r.types} fill={r.own ? tint(p1, 0.9) : tint("#2f3a26", 0.85)} stroke={p0} />
          </span>
        ))}
        <span className="gp-gn-pip absolute block rounded-full" style={{ left: "48.8%", top: "48.8%", width: "2.4%", height: "2.4%", background: p2, border: `1px solid ${p0}`, animationDelay: dm(delayMs, 1100) }} />
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "25%", top: "37.5%", width: "50%", height: "25%", background: `radial-gradient(closest-side, ${tint(p0, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1250) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- total_warp --------------------------------------------------------------------------
   "Teleport your whole army except the king anywhere you like, once. Pawns
   stay off the first and last ranks." The caster's home ranks fold into a
   row of portals and vanish, all but the king, who stands fast in a gold
   ring; bars light across the first and last ranks with a struck pawn on
   each (pawns may not land there). Each chosen landing square opens a portal
   and the arrival spins out of it (target cut). */
function WarpHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="gp-tw-gate absolute block rounded-full" style={{ left: "6%", top: "30%", width: "88%", height: "40%", border: `2px solid ${tint(p1, 0.9)}`, background: tint(p0, 0.45), animationDelay: dm(delayMs, 0) }} />
      <span className="gp-tw-spin absolute block" style={{ left: "25%", top: "25%", width: "50%", height: "50%", animationDelay: dm(delayMs, 160) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 5 C5 4.2 6 4.2 6 5 C6 6.2 4 6.4 3.8 5 C3.6 3.2 6.4 3 7 5 C7.6 7.4 4 8.2 2.8 6.4" fill="none" stroke={p2} strokeWidth="0.8" strokeLinecap="round" />
        </svg>
      </span>
    </span>
  );
}
const TW_ARMY: (keyof typeof SIL | null)[] = ["r", "n", "b", "q", null, "b", "n", "r"];
function TotalWarpScene({ palette, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <WarpHit palette={palette} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 520}>
      <Rake delayMs={delayMs + 240} tone={tint(p0, 0.5)} lean="calc(var(--fx-ox, 0) * 2.4%)" tip="calc(var(--fx-oy, 0) * 1.5%)" cy={57} width={26} />
      <BoardFrame>
        {[
          { top: HOME.ownBack, types: TW_ARMY, d: 0 },
          { top: HOME.ownPawn, types: PAWN_RANK, d: 60 },
        ].map((r, i) => (
          <span key={i} className="gp-tw-fold absolute block" style={{ left: "1%", top: `calc(${r.top} + 1%)`, width: "98%", height: "10.5%", animationDelay: dm(delayMs, r.d) }}>
            <RankRow types={r.types} fill={tint(p1, 0.85)} stroke={p0} />
          </span>
        ))}
        {[HOME.ownBack, HOME.ownPawn].map((t, i) => (
          <span key={`g${i}`} className="gp-tw-portals absolute block" style={{ left: "0%", top: `calc(${t} + 4%)`, width: "100%", height: "4.5%", animationDelay: dm(delayMs, 300 + i * 60) }}>
            <svg viewBox="0 0 80 4" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
              {Array.from({ length: 8 }, (_, f) => (i === 0 && f === 4 ? null : <ellipse key={f} cx={f * 10 + 5} cy="2" rx="4" ry="1.6" fill={tint(p0, 0.7)} stroke={p1} strokeWidth="0.4" />))}
            </svg>
          </span>
        ))}
        {/* the king alone stays */}
        <span className="gp-tw-king absolute block" style={{ left: "51%", top: `calc(${HOME.ownBack} + 1%)`, width: "10.5%", height: "10.5%", animationDelay: dm(delayMs, 0) }}>
          <Sil d={SIL.k} fill={p2} stroke={p0} />
        </span>
        <span className="gp-tw-ring absolute block rounded-full" style={{ left: "50.5%", top: `calc(${HOME.ownBack} + 0.5%)`, width: "11.5%", height: "11.5%", border: `2px solid ${p2}`, animationDelay: dm(delayMs, 360) }} />
        {/* pawns may not land on the first or last rank */}
        {[HOME.ownBack, HOME.enemyBack].map((t, i) => (
          <span key={`b${i}`} className="gp-tw-bar absolute block" style={{ left: "0%", top: `calc(${t} + 5.4%)`, width: "100%", height: "1.6%", background: `repeating-linear-gradient(90deg, ${tint(p2, 0.9)} 0 3%, transparent 3% 5%)`, animationDelay: dm(delayMs, 760 + i * 80) }} />
        ))}
        {[HOME.ownBack, HOME.enemyBack].map((t, i) => (
          <span key={`n${i}`} className="gp-tw-nopawn absolute block" style={{ left: "88%", top: `calc(${t} + 1.5%)`, width: "9.5%", height: "9.5%", animationDelay: dm(delayMs, 860 + i * 80) }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d={SIL.p} fill={tint(p1, 0.8)} stroke={p0} strokeWidth="0.5" {...SJ} />
              <circle cx="5" cy="5" r="4.4" fill="none" stroke={p2} strokeWidth="0.8" />
              <path d="M2 8 L8 2" stroke={p2} strokeWidth="0.8" strokeLinecap="round" />
            </svg>
          </span>
        ))}
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "30%", top: HOME.ownPawn, width: "40%", height: "25%", background: `radial-gradient(closest-side, ${tint(p1, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1200) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- nerf_reversal ------------------------------------------------------------------------
   "Turn your nerf against itself: suspend it for your next 10 turns, and
   your pieces in your own half cannot be captured for your opponent's next
   turn." The nerf's brand (a downward arrow in a ring) turns right round
   until it points back at itself and it sinks into its own ring; ten ticks
   are the ten turns; then a ward lights over the caster's half with its edge
   drawn along the border, and one pip is the one turn it holds. */
function NerfReversalScene({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 560}>
      <BoardFrame>
        <span className="gp-nr-brand absolute block" style={{ left: "43%", top: "calc(50% - var(--fx-side, 1) * 12.5% - 7%)", width: "14%", height: "14%", animationDelay: dm(delayMs, 0) }}>
          <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
            <circle cx="6" cy="6" r="5.2" fill="rgba(5,5,12,0.6)" stroke={p1} strokeWidth="0.8" />
          </svg>
          <span className="gp-nr-flip absolute inset-0 block" style={{ animationDelay: dm(delayMs, 220) }}>
            <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
              <path d="M6 2.6 V8.6 M3.6 6.4 L6 8.8 L8.4 6.4" fill="none" stroke={p0} strokeWidth="1.1" {...SJ} />
            </svg>
          </span>
        </span>
        <span className="gp-nr-ticks absolute block" style={{ left: "37.5%", top: "calc(50% - var(--fx-side, 1) * 12.5% + 8%)", width: "25%", height: "3%", animationDelay: dm(delayMs, 520) }}>
          <svg viewBox="0 0 50 6" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <path key={i} d={`M${i * 5 + 2.5} 0.6 V5.4`} stroke={p2} strokeWidth="1.2" strokeLinecap="round" />
            ))}
          </svg>
        </span>
        {/* the caster's half is warded for one turn */}
        <span className="gp-nr-ward absolute block" style={{ left: "0%", top: ROW.ownHalf, width: "100%", height: "50%", background: `linear-gradient(calc(var(--fx-side, 1) * 90deg + 90deg), ${tint(p0, 0.3)}, ${tint(p0, 0.06)})`, animationDelay: dm(delayMs, 760) }} />
        <span className="gp-nr-edge absolute block" style={{ left: "0%", top: "49.4%", width: "100%", height: "1.2%", background: tint(p0, 0.95), animationDelay: dm(delayMs, 800) }} />
        <span className="gp-nr-pip absolute block rounded-full" style={{ left: "48.8%", top: "calc(50% + var(--fx-side, 1) * 6.25% - 1.2%)", width: "2.4%", height: "2.4%", background: p0, border: `1px solid ${p2}`, animationDelay: dm(delayMs, 1080) }} />
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "30%", top: ROW.ownHalf, width: "40%", height: "50%", background: `radial-gradient(closest-side, ${tint(p0, 0.35)}, transparent)`, animationDelay: dm(delayMs, 1250) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- glacial_tomb ---------------------------------------------------------------------
   "Freeze all of your opponent's pieces except their king for 1 of their
   turns. As the ice lifts, only their queen and rooks stay behind as walnuts
   for 1 more turn, able to shuffle only one square at a time." Ice slabs
   seal the opponent's two home ranks with a gap left on the king's square
   (one pip, one turn); the ice lifts away and three walnut shells stay
   behind where the queen and rooks stand, each with a cross of one-square
   arrows and a pip of its own. */
const GT_NUTS = [0, 3, 7];
function GlacialTombScene({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const ice = `linear-gradient(135deg, ${tint(p1, 0.8)}, ${tint(p0, 0.6)})`;
  return (
    <Stage quakeMs={delayMs + 420}>
      <BoardFrame>
        {[
          { l: 0, w: 100, t: HOME.enemyPawn },
          { l: 0, w: 50, t: HOME.enemyBack },
          { l: 62.5, w: 37.5, t: HOME.enemyBack },
        ].map((s, i) => (
          <span key={i} className="gp-gt-ice absolute block" style={{ left: `${s.l}%`, top: s.t, width: `${s.w}%`, height: "12.5%", background: ice, border: `1px solid ${tint(p2, 0.8)}`, animationDelay: dm(delayMs, i * 60) }}>
            <svg viewBox="0 0 40 5" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
              <path d="M2 1 L6 3 L9 1.6 M18 4 L22 2 L25 3.6 M31 1.2 L35 3.4" fill="none" stroke={tint(p2, 0.7)} strokeWidth="0.3" />
            </svg>
          </span>
        ))}
        {/* the king's square stays open */}
        <span className="gp-gt-king absolute block" style={{ left: "51.5%", top: `calc(${HOME.enemyBack} + 1.5%)`, width: "9.5%", height: "9.5%", animationDelay: dm(delayMs, 120) }}>
          <Sil d={SIL.k} fill={tint("#ffd76a", 0.9)} stroke={p2} />
        </span>
        <span className="gp-gt-pip absolute block rounded-full" style={{ left: "48.8%", top: `calc(${HOME.enemyPawn} + 14%)`, width: "2.4%", height: "2.4%", background: p1, border: `1px solid ${p2}`, animationDelay: dm(delayMs, 360) }} />
        {/* as the ice lifts, three walnuts stay behind */}
        {GT_NUTS.map((f, i) => (
          <span key={f} className="gp-gt-nut absolute block" style={{ left: `${f * 12.5 + 1.5}%`, top: `calc(${HOME.enemyBack} + 1.5%)`, width: "9.5%", height: "9.5%", animationDelay: dm(delayMs, 900 + i * 70) }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <ellipse cx="5" cy="5.2" rx="3.8" ry="4.2" fill="#8a6a44" stroke="#4a3520" strokeWidth="0.5" />
              <path d="M5 1 V9.4 M3.2 3 C2.6 4.6 3.6 6 2.8 7.6 M6.8 3 C7.4 4.6 6.4 6 7.2 7.6" fill="none" stroke="#4a3520" strokeWidth="0.4" />
            </svg>
          </span>
        ))}
        {GT_NUTS.map((f, i) => (
          <span key={`s${f}`} className="gp-gt-step absolute block" style={{ left: `${f * 12.5 - 6.25}%`, top: `calc(${HOME.enemyBack} - 6.25%)`, width: "25%", height: "25%", animationDelay: dm(delayMs, 1060 + i * 70) }}>
            <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
              <path d="M10 5.6 V2 M8.6 3.4 L10 2 L11.4 3.4 M10 14.4 V18 M8.6 16.6 L10 18 L11.4 16.6 M5.6 10 H2 M3.4 8.6 L2 10 L3.4 11.4 M14.4 10 H18 M16.6 8.6 L18 10 L16.6 11.4" fill="none" stroke={p1} strokeWidth="0.7" {...SJ} />
            </svg>
          </span>
        ))}
        <span className="gp-gt-pip2 absolute block rounded-full" style={{ left: "48.8%", top: `calc(${HOME.enemyPawn} + 14%)`, width: "2.4%", height: "2.4%", background: "#8a6a44", border: `1px solid ${p1}`, animationDelay: dm(delayMs, 1200) }} />
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "20%", top: HOME.enemyPawn, width: "60%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p0, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1300) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- frozen_solid --------------------------------------------------------------------------
   "Freeze one enemy piece and one enemy piece next to it for 3 of their
   turns each. Kings cannot be chosen. The piece you target freezes only
   after your opponent's next move, and escapes if they move it away." On the
   targeted square four frost corners creep in and stop short, with an
   hourglass beside it (it waits for their move); a dashed arrow leads out of the
   square (moved away, it escapes); frost reaches along both sides toward the
   neighbour; three pips. On each chosen piece an ice block forms with three
   pips (target cut). */
function IceBlockHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="gp-fs-block absolute block" style={{ left: "10%", top: "10%", width: "80%", height: "80%", animationDelay: dm(delayMs, 200) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M1 3 L3 1 H9 V7 L7 9 H1 Z" fill={tint(p0, 0.4)} stroke={p2} strokeWidth="0.5" {...SJ} />
          <path d="M1 3 H7 V9 M7 3 L9 1" fill="none" stroke={tint(p1, 0.9)} strokeWidth="0.4" />
        </svg>
      </span>
      {[0, 1, 2].map((i) => (
        <span key={i} className="gp-fs-pip absolute block rounded-full" style={{ left: `${26 + i * 18}%`, top: "86%", width: "11%", height: "11%", background: p1, border: `1px solid ${p2}`, animationDelay: dm(delayMs, 560 + i * 80) }} />
      ))}
    </span>
  );
}
const FS_CORNERS = [
  { l: 0, t: 0, r: "0deg" },
  { l: 1, t: 0, r: "90deg" },
  { l: 1, t: 1, r: "180deg" },
  { l: 0, t: 1, r: "270deg" },
];
function FrozenSolidScene({ palette, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <IceBlockHit palette={palette} delayMs={delayMs} />;
  const home = 50 - CELL / 2;
  return (
    <Stage quakeMs={delayMs + 600}>
      <Rake delayMs={delayMs + 260} tone={tint(p0, 0.5)} lean="calc(var(--fx-ox, 0) * 2.4%)" tip="calc(var(--fx-oy, 0) * 1.5%)" cy={57} width={22} />
      {FS_CORNERS.map((c, i) => (
        <span key={i} className="absolute block" style={{ left: `${home + c.l * (CELL - 2.6)}%`, top: `${home + c.t * (CELL - 2.6)}%`, width: "2.6%", height: "2.6%", transform: `rotate(${c.r})` }}>
          <span className="gp-fs-corner absolute inset-0 block" style={{ animationDelay: dm(delayMs, 60 + i * 40) }}>
            <svg viewBox="0 0 4 4" className="block h-full w-full" aria-hidden="true">
              <path d="M0.4 3.6 V0.4 H3.6 M0.4 0.4 L2 2" fill="none" stroke={p1} strokeWidth="0.6" {...SJ} />
            </svg>
          </span>
        </span>
      ))}
      <span className="gp-fs-wait absolute block" style={{ left: `${50 + CELL * 0.55}%`, top: `calc(50% + var(--fx-side, 1) * ${CELL * 0.95}% - 2.3%)`, width: "2.8%", height: "4.6%", animationDelay: dm(delayMs, 360) }}>
        <HourglassArt stroke={p1} />
      </span>
      {/* frost reaches both ways toward the neighbour it will take too */}
      {[
        { l: home - CELL * 0.9, o: "100% 50%" },
        { l: home + CELL * 0.9, o: "0% 50%" },
      ].map((b, i) => (
        <span key={i} className="gp-fs-reach absolute block" style={{ left: `${b.l}%`, top: `${50 - 0.6}%`, width: `${CELL}%`, height: "1.2%", background: `linear-gradient(90deg, ${tint(p0, 0.2)}, ${tint(p0, 0.9)}, ${tint(p0, 0.2)})`, transformOrigin: b.o, animationDelay: dm(delayMs, 480 + i * 60) }} />
      ))}
      {/* moved away, it escapes */}
      <span className="gp-fs-escape absolute block" style={{ left: `${50 - 1.4}%`, top: `calc(${home}% + var(--fx-side, 1) * ${CELL}%)`, width: "2.8%", height: `${CELL}%`, animationDelay: dm(delayMs, 700) }}>
        <svg viewBox="0 0 3 8" className="block h-full w-full" style={{ transform: "scaleY(var(--fx-side, 1))" }} aria-hidden="true">
          <path d="M1.5 0.4 V7 M0.4 5.8 L1.5 7.4 L2.6 5.8" fill="none" stroke={p2} strokeWidth="0.45" strokeDasharray="0.7 0.5" {...SJ} />
        </svg>
      </span>
      {[0, 1, 2].map((i) => (
        <span key={i} className="gp-fs-pip absolute block rounded-full" style={{ left: `${50 - CELL * 0.55 - 7.8 + i * 2.8}%`, top: `calc(50% + var(--fx-side, 1) * ${CELL * 0.95}% - 1.1%)`, width: "2.2%", height: "2.2%", background: p1, border: `1px solid ${p2}`, animationDelay: dm(delayMs, 900 + i * 100) }} />
      ))}
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{ left: `${home - 3}%`, top: `${home - 3}%`, width: `${CELL + 6}%`, height: `${CELL + 6}%`, background: `radial-gradient(closest-side, ${tint(p0, 0.45)}, transparent)`, animationDelay: dm(delayMs, 1250) }}
      />
    </Stage>
  );
}

/** A die in a 0 0 10 10 box (a reroll). */
function DieArt({ face, pip }: { face: string; pip: string }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      <rect x="0.8" y="0.8" width="8.4" height="8.4" rx="1.6" fill={face} stroke={pip} strokeWidth="0.7" />
      <circle cx="3.2" cy="3.2" r="0.9" fill={pip} />
      <circle cx="5" cy="5" r="0.9" fill={pip} />
      <circle cx="6.8" cy="6.8" r="0.9" fill={pip} />
    </svg>
  );
}

/* --- dragonslayer ------------------------------------------------------------------------
   "The old blade remembers its work: name one enemy rook or queen and it is
   slain where it stands. Using it consumes your next unused reroll, if you
   have one." The old greatsword lifts off the caster's side and flies at the
   opponent's half point first, and the caster's reroll die is spent (it
   cracks and fades). On the named piece (target cut) the blade drops point
   down onto its square, a scale splits along its seam, and the two halves
   fall away where it stands. */
function SlayHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {[
        { cls: "gp-dg-halfl", d: "M5 0.6 L1 3 V7 L5 9.4 Z" },
        { cls: "gp-dg-halfr", d: "M5 0.6 L9 3 V7 L5 9.4 Z" },
      ].map((h) => (
        <span key={h.cls} className={`${h.cls} absolute block`} style={{ left: "18%", top: "18%", width: "64%", height: "64%", animationDelay: dm(delayMs, 0) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d={h.d} fill={tint(p1, 0.55)} stroke={p1} strokeWidth="0.5" {...SJ} />
          </svg>
        </span>
      ))}
      <span className="gp-dg-drop absolute block" style={{ left: "38%", top: "-40%", width: "24%", height: "110%", animationDelay: dm(delayMs, 0) }}>
        <svg viewBox="0 0 4 18" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
          <path d="M2 17.6 L2.8 15.6 V4.6 H1.2 V15.6 Z" fill={p0} stroke={tint(p2, 0.9)} strokeWidth="0.3" {...SJ} />
          <path d="M0.2 4.2 H3.8 M2 4.2 V1 M1.4 0.6 H2.6" stroke={p2} strokeWidth="0.6" strokeLinecap="round" />
        </svg>
      </span>
    </span>
  );
}
function DragonslayerScene({ palette, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <SlayHit palette={palette} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 480}>
      <BoardFrame>
        <span className="gp-dg-sword absolute block" style={{ left: "46%", top: "calc(50% + var(--fx-side, 1) * 18.75% - 12%)", width: "8%", height: "24%", animationDelay: dm(delayMs, 0) }}>
          <svg viewBox="0 0 4 18" preserveAspectRatio="none" className="block h-full w-full" style={{ transform: "scaleY(calc(var(--fx-side, 1) * -1))" }} aria-hidden="true">
            <path d="M2 17.6 L2.8 15.6 V4.6 H1.2 V15.6 Z" fill={p0} stroke={tint(p2, 0.9)} strokeWidth="0.3" {...SJ} />
            <path d="M0.2 4.2 H3.8 M2 4.2 V1 M1.4 0.6 H2.6" stroke={p2} strokeWidth="0.6" strokeLinecap="round" />
          </svg>
        </span>
        {/* a glint runs the edge as it goes */}
        <span className="gp-dg-edge absolute block" style={{ left: "49.4%", top: "calc(50% + var(--fx-side, 1) * 18.75% - 8%)", width: "1.2%", height: "5%", background: tint("#fff4d6", 0.95), animationDelay: dm(delayMs, 160) }} />
        {/* the reroll it costs */}
        <span className="gp-dg-die absolute block" style={{ left: "70%", top: `calc(${EDGE.own} + 3%)`, width: "6%", height: "6%", animationDelay: dm(delayMs, 360) }}>
          <DieArt face={tint("#fff4d6", 0.95)} pip={p1} />
        </span>
        <span className="gp-dg-x absolute block" style={{ left: "69.5%", top: `calc(${EDGE.own} + 2.5%)`, width: "7%", height: "7%", animationDelay: dm(delayMs, 640) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M1.4 1.4 L8.6 8.6 M8.6 1.4 L1.4 8.6" stroke={p1} strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </span>
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "36%", top: "calc(50% - var(--fx-side, 1) * 18.75% - 8%)", width: "28%", height: "16%", background: `radial-gradient(closest-side, ${tint(p1, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1100) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- grand_nullify -------------------------------------------------------------------------
   "Cancel your opponent's unused and temporary buffs. Locked-in upgrades
   resist. Using it consumes your next unused reroll, if any." The opponent's
   buffs stand in a row: two unused (face down) and one temporary (an
   hourglass badge), with a padlocked upgrade among them. A wiper sweeps the
   row and every card it passes is left as a dashed outline, the padlocked
   one staying whole; the caster's reroll die is rolled away and spent. */
const GNL_CARDS = [
  { l: 22, kind: "unused" },
  { l: 36, kind: "temp" },
  { l: 50, kind: "locked" },
  { l: 64, kind: "unused" },
] as const;
function GrandNullifyScene({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 560}>
      <Rake delayMs={delayMs + 120} tone={tint(p1, 0.45)} lean="calc(var(--fx-ox, 0) * 2.4%)" tip="calc(var(--fx-oy, 0) * 1.5%)" cy={57} width={30} />
      <BoardFrame>
        {GNL_CARDS.map((c, i) =>
          c.kind === "locked" ? (
            <span key={i} className="gp-gnl-keep absolute block" style={{ left: `${c.l}%`, top: EDGE.enemy, width: "9%", height: "12.5%", animationDelay: dm(delayMs, 60 + i * 40) }}>
              <CardArt face={tint(p2, 0.95)} edge={p0} locked={p1} />
            </span>
          ) : (
            <span key={i} className="gp-gnl-card absolute block" style={{ left: `${c.l}%`, top: EDGE.enemy, width: "9%", height: "12.5%", animationDelay: dm(delayMs, 60 + i * 40), animationDuration: `calc(${700 + (c.l - 22) * 14}ms * var(--fx-dur, 1))` }}>
              {c.kind === "unused" ? (
                <svg viewBox="0 0 9 12" className="block h-full w-full" aria-hidden="true">
                  <rect x="0.5" y="0.5" width="8" height="11" rx="1" fill="#2a2a38" stroke={p0} strokeWidth="0.6" />
                  <path d="M1.6 1.6 L7.4 10.4 M7.4 1.6 L1.6 10.4" stroke={tint(p1, 0.6)} strokeWidth="0.35" />
                </svg>
              ) : (
                <svg viewBox="0 0 9 12" className="block h-full w-full" aria-hidden="true">
                  <rect x="0.5" y="0.5" width="8" height="11" rx="1" fill={tint(p2, 0.9)} stroke={p0} strokeWidth="0.6" />
                  <path d="M3 3 H6 M3 9 H6 M3.3 3 C3.3 5 5.7 5 5.7 6 C5.7 7 3.3 7 3.3 9 M5.7 3 C5.7 5 3.3 5 3.3 6 C3.3 7 5.7 7 5.7 9" fill="none" stroke={p1} strokeWidth="0.45" strokeLinecap="round" />
                </svg>
              )}
            </span>
          ),
        )}
        {GNL_CARDS.map((c, i) =>
          c.kind === "locked" ? null : (
            <span key={`o${i}`} className="gp-gnl-ghost absolute block" style={{ left: `${c.l}%`, top: EDGE.enemy, width: "9%", height: "12.5%", animationDelay: dm(delayMs, 700 + (c.l - 22) * 14) }}>
              <svg viewBox="0 0 9 12" className="block h-full w-full" aria-hidden="true">
                <rect x="0.5" y="0.5" width="8" height="11" rx="1" fill="none" stroke={tint(p0, 0.9)} strokeWidth="0.5" strokeDasharray="1 0.8" />
              </svg>
            </span>
          ),
        )}
        <span className="gp-gnl-wiper absolute block" style={{ left: "18%", top: `calc(${EDGE.enemy} - 2%)`, width: "2%", height: "16.5%", background: `linear-gradient(180deg, transparent, ${p1}, transparent)`, animationDelay: dm(delayMs, 600) }} />
        {/* the reroll it costs rolls away */}
        <span className="gp-gnl-die absolute block" style={{ left: "47%", top: `calc(${EDGE.own} + 3%)`, width: "6%", height: "6%", animationDelay: dm(delayMs, 900) }}>
          <DieArt face={tint(p2, 0.95)} pip={p1} />
        </span>
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "46%", top: EDGE.enemy, width: "18%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p1, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1250) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- queen_storm -------------------------------------------------------------------------
   "Promote up to two of your pawns on your 4th rank or beyond: the first
   becomes a queen, the second a rook. No two promotions are alike, so there
   is no mass of queens." A line is scored along the caster's 4th rank and
   the ground beyond it lights (where pawns qualify); over the first pawn a
   storm cloud drops a queen's crown, then a rook's crenel, and a third crown
   is struck out as it falls (no mass of queens). On each chosen pawn (target
   cut) the pawn lifts away and the new piece stands up: a queen for the
   first, a rook for the second, read from the victim order (--fx-index). */
function PromoteHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="gp-qs-pawn absolute block" style={{ left: "15%", top: "10%", width: "70%", height: "80%", animationDelay: dm(delayMs, 0) }}>
        <Sil d={SIL.p} fill={tint(p2, 0.8)} stroke={p1} />
      </span>
      {/* first chosen: a queen; second: a rook */}
      <span className="absolute block" style={{ left: "10%", top: "6%", width: "80%", height: "86%", opacity: "clamp(0, calc(1 - var(--fx-index, 0)), 1)" }}>
        <span className="gp-qs-rise absolute inset-0 block" style={{ animationDelay: dm(delayMs, 260) }}>
          <Sil d={SIL.q} fill={p0} stroke={p1} />
        </span>
      </span>
      <span className="absolute block" style={{ left: "10%", top: "6%", width: "80%", height: "86%", opacity: "clamp(0, var(--fx-index, 0), 1)" }}>
        <span className="gp-qs-rise absolute inset-0 block" style={{ animationDelay: dm(delayMs, 260) }}>
          <Sil d={SIL.r} fill={p0} stroke={p1} />
        </span>
      </span>
    </span>
  );
}
function QueenStormScene({ palette, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <PromoteHit palette={palette} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 520}>
      <BoardFrame>
        {/* the caster's 4th rank, and everything beyond it */}
        <span className="gp-qs-zone absolute block" style={{ left: "0%", top: "calc(18.75% - var(--fx-side, 1) * 18.75%)", width: "100%", height: "62.5%", background: `linear-gradient(calc(90deg + var(--fx-side, 1) * 90deg), ${tint(p1, 0.08)}, ${tint(p1, 0.24)})`, animationDelay: dm(delayMs, 0) }} />
        <span className="gp-qs-line absolute block" style={{ left: "0%", top: "calc(50% + var(--fx-side, 1) * 12.5% - 0.6%)", width: "100%", height: "1.2%", background: tint(p0, 0.95), animationDelay: dm(delayMs, 60) }} />
      </BoardFrame>
      <Rake delayMs={delayMs + 260} tone={tint(p1, 0.5)} lean="calc(var(--fx-ox, 0) * 2.4%)" tip="calc(var(--fx-oy, 0) * 1.5%)" cy={57} width={22} />
      <span className="gp-qs-cloud absolute block" style={{ left: "41%", top: "calc(50% - var(--fx-side, 1) * 9% - 4%)", width: "18%", height: "8%", animationDelay: dm(delayMs, 120) }}>
        <svg viewBox="0 0 18 8" className="block h-full w-full" aria-hidden="true">
          <path d="M3 7.4 C0.8 7.4 0.6 4.4 2.8 4.2 C2.8 1.6 6.4 0.8 7.6 3 C8.6 0.6 13 0.8 13.2 3.6 C15.8 3 17.6 5.4 15.6 7.4 Z" fill={tint(p1, 0.85)} stroke={p0} strokeWidth="0.5" {...SJ} />
        </svg>
      </span>
      {[
        { d: SIL.q, off: 380, cls: "gp-qs-fall" },
        { d: SIL.r, off: 560, cls: "gp-qs-fall" },
        { d: SIL.q, off: 740, cls: "gp-qs-struck" },
      ].map((c, i) => (
        <span key={i} className={`${c.cls} absolute block`} style={{ left: `${43.5 + i * 4.5}%`, top: "calc(50% - var(--fx-side, 1) * 7% - 3%)", width: "4.5%", height: "6%", animationDelay: dm(delayMs, c.off) }}>
          <Sil d={c.d} fill={i === 2 ? tint(p2, 0.6) : p0} stroke={p1} />
        </span>
      ))}
      <span className="gp-qs-x absolute block" style={{ left: "52.5%", top: "calc(50% - var(--fx-side, 1) * 7% - 3.4%)", width: "5.5%", height: "6.8%", animationDelay: dm(delayMs, 900) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M1.4 1.4 L8.6 8.6 M8.6 1.4 L1.4 8.6" stroke="#c94a5a" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </span>
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{ left: "40%", top: "40%", width: "20%", height: "20%", background: `radial-gradient(closest-side, ${tint(p0, 0.45)}, transparent)`, animationDelay: dm(delayMs, 1200) }}
      />
    </Stage>
  );
}

/* --- sundering ----------------------------------------------------------------------------
   "Choose three files: each is barred to your opponent until the end of their
   next turn, then collapses." Each chosen square (target cut) raises a barred
   column the whole length of its file, which holds, then cracks down its
   middle and falls in. The lead is the tell: three rift lines score across the
   board centre under an hourglass (until the end of their next turn). */
function SunderHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {/* the whole file, through this square */}
      <span className="gp-su-file absolute block" style={{ left: "8%", top: "-800%", width: "84%", height: "1700%", animationDelay: dm(delayMs, 0) }}>
        <svg viewBox="0 0 10 170" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
          <rect x="0.5" y="0" width="9" height="170" fill={tint(p0, 0.42)} />
          {Array.from({ length: 17 }, (_, i) => (
            <path key={i} d={`M0.5 ${i * 10 + 5} H9.5`} stroke={tint(p1, 0.8)} strokeWidth="0.8" />
          ))}
          <path d="M0.5 0 V170 M9.5 0 V170" stroke={p2} strokeWidth="0.6" />
        </svg>
      </span>
      <span className="gp-su-crack absolute block" style={{ left: "46%", top: "-800%", width: "8%", height: "1700%", animationDelay: dm(delayMs, 700) }}>
        <svg viewBox="0 0 2 170" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
          <path d={`M1 0 ${Array.from({ length: 17 }, (_, i) => `L${i % 2 ? 1.8 : 0.2} ${i * 10 + 5}`).join(" ")} L1 170`} fill="none" stroke={p1} strokeWidth="0.5" />
        </svg>
      </span>
    </span>
  );
}
function SunderingScene({ palette, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <SunderHit palette={palette} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 620}>
      <BoardFrame>
        {[25, 50, 75].map((x, i) => (
          <span key={x} className="gp-su-rift absolute block" style={{ left: `${x - 1.5}%`, top: "20%", width: "3%", height: "60%", animationDelay: dm(delayMs, i * 90) }}>
            <svg viewBox="0 0 3 60" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
              <path d="M1.5 0 L0.4 10 L2.4 20 L0.6 30 L2.2 40 L0.8 50 L1.5 60" fill="none" stroke={p1} strokeWidth="0.7" />
            </svg>
          </span>
        ))}
        <span className="gp-su-wait absolute block" style={{ left: "46.5%", top: "calc(50% - var(--fx-side, 1) * 12.5% - 5%)", width: "7%", height: "10%", animationDelay: dm(delayMs, 360) }}>
          <HourglassArt stroke={p2} />
        </span>
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "20%", top: "35%", width: "60%", height: "30%", background: `radial-gradient(closest-side, ${tint(p0, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1100) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- statue_garden ---------------------------------------------------------------------------
   "Your opponent's knights and bishops turn to walnuts for 3 of their turns,
   shuffling one square at a time. The first one struck petrifies only after
   your opponent's next move, and escapes if they move it away." A garden
   arch rises at the cast square with ivy running up it and a cross of
   one-square steps under it. On every knight and bishop (target cut) ivy
   climbs the piece and sets into a walnut husk with a leaf, three pips; the
   first one struck (victim order 0) carries an hourglass instead of setting
   at once. */
function GardenHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="gp-sg-ivy absolute block" style={{ left: "16%", top: "8%", width: "68%", height: "84%", animationDelay: dm(delayMs, 0) }}>
        <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
          <path d="M5 11.6 C2 10 7.6 8 4 6.4 C1.6 5.2 7 3.6 5 1" fill="none" stroke={p1} strokeWidth="0.7" strokeLinecap="round" />
          <ellipse cx="3.2" cy="8.6" rx="1" ry="0.6" transform="rotate(-30 3.2 8.6)" fill={p1} />
          <ellipse cx="6.6" cy="4.8" rx="1" ry="0.6" transform="rotate(30 6.6 4.8)" fill={p1} />
        </svg>
      </span>
      <span className="gp-sg-husk absolute block" style={{ left: "20%", top: "16%", width: "60%", height: "70%", animationDelay: dm(delayMs, 420) }}>
        <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
          <ellipse cx="5" cy="6.4" rx="4" ry="5" fill={tint("#8a6a44", 0.9)} stroke={tint(p2, 0.9)} strokeWidth="0.5" />
          <path d="M5 1.4 V11.4" stroke="#4a3520" strokeWidth="0.45" />
          <path d="M5 1.4 C6.6 0 8.4 0.4 8.6 1.2 C7.4 1.8 6 1.8 5 1.4 Z" fill={p1} />
        </svg>
      </span>
      {[0, 1, 2].map((i) => (
        <span key={i} className="gp-sg-pip absolute block rounded-full" style={{ left: `${26 + i * 18}%`, top: "86%", width: "11%", height: "11%", background: p1, border: `1px solid ${p0}`, animationDelay: dm(delayMs, 640 + i * 80) }} />
      ))}
      {/* only the first one waits a move */}
      <span className="absolute block" style={{ left: "70%", top: "4%", width: "24%", height: "32%", opacity: "clamp(0, calc(1 - var(--fx-index, 0)), 1)" }}>
        <span className="gp-sg-wait absolute inset-0 block" style={{ animationDelay: dm(delayMs, 300) }}>
          <HourglassArt stroke={p2} />
        </span>
      </span>
    </span>
  );
}
function StatueGardenScene({ palette, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <GardenHit palette={palette} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 520}>
      <Rake delayMs={delayMs + 240} tone={tint(p1, 0.45)} lean="calc(var(--fx-ox, 0) * 2.4%)" tip="calc(var(--fx-oy, 0) * 1.5%)" cy={57} width={22} />
      <span className="gp-sg-arch absolute block" style={{ left: "43%", top: "41%", width: "14%", height: "15%", animationDelay: dm(delayMs, 0) }}>
        <svg viewBox="0 0 14 15" className="block h-full w-full" aria-hidden="true">
          <path d="M2 14.6 V6 A5 5 0 0 1 12 6 V14.6" fill="none" stroke={p0} strokeWidth="1.3" strokeLinecap="round" />
          <path d="M2 13 C3.4 11 1 9 2.6 7 C3.6 5 5 3 7 2.2 C9 3 10.4 5 11.4 7 C13 9 10.6 11 12 13" fill="none" stroke={p1} strokeWidth="0.6" strokeDasharray="1.2 0.6" />
        </svg>
      </span>
      <span className="gp-sg-step absolute block" style={{ left: "39.3%", top: "39.3%", width: "21.4%", height: "21.4%", animationDelay: dm(delayMs, 600) }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <path d="M10 5.6 V2 M8.6 3.4 L10 2 L11.4 3.4 M10 14.4 V18 M8.6 16.6 L10 18 L11.4 16.6 M5.6 10 H2 M3.4 8.6 L2 10 L3.4 11.4 M14.4 10 H18 M16.6 8.6 L18 10 L16.6 11.4" fill="none" stroke={p2} strokeWidth="0.7" {...SJ} />
        </svg>
      </span>
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{ left: "40%", top: "42%", width: "20%", height: "16%", background: `radial-gradient(closest-side, ${tint(p1, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1100) }}
      />
    </Stage>
  );
}

/* --- everfrost_shard ---------------------------------------------------------------------------
   "Freeze one enemy piece you target for 4 of their turns. The shard
   radiates: for those 4 turns your opponent cannot move any piece onto a
   square beside it. Kings cannot be targeted." A crystal shard drives into
   the targeted square and the cold rings out onto exactly the eight squares
   around it, each marked no-entry; four pips are the four turns. On the
   target itself (target cut) the shard encases the piece. */
const EF_RING: [number, number][] = [
  [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0],
];
function ShardHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="gp-ef-case absolute block" style={{ left: "14%", top: "4%", width: "72%", height: "92%", animationDelay: dm(delayMs, 220) }}>
        <svg viewBox="0 0 8 12" className="block h-full w-full" aria-hidden="true">
          <path d="M4 0.4 L7.4 3.6 L6.4 11.4 H1.6 L0.6 3.6 Z" fill={tint(p0, 0.38)} stroke={p1} strokeWidth="0.45" {...SJ} />
          <path d="M4 0.4 L3.4 11.4 M0.6 3.6 L7.4 3.6" fill="none" stroke={tint(p2, 0.8)} strokeWidth="0.3" />
        </svg>
      </span>
    </span>
  );
}
function EverfrostShardScene({ palette, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <ShardHit palette={palette} delayMs={delayMs} />;
  const home = 50 - CELL / 2;
  return (
    <Stage quakeMs={delayMs + 440}>
      <Rake delayMs={delayMs + 220} tone={tint(p0, 0.5)} lean="calc(var(--fx-ox, 0) * 2.4%)" tip="calc(var(--fx-oy, 0) * 1.5%)" cy={57} width={24} />
      <span className="gp-ef-shard absolute block" style={{ left: `${home + 1.6}%`, top: `${home - 2}%`, width: `${CELL - 3.2}%`, height: `${CELL + 2}%`, animationDelay: dm(delayMs, 0) }}>
        <svg viewBox="0 0 4 9" className="block h-full w-full" aria-hidden="true">
          <path d="M2 8.8 L3.6 3 L2 0.2 L0.4 3 Z" fill={tint(p0, 0.9)} stroke={p1} strokeWidth="0.3" {...SJ} />
          <path d="M2 0.2 V8.8" stroke={p2} strokeWidth="0.2" />
        </svg>
      </span>
      {/* no piece may step onto a square beside it */}
      {EF_RING.map(([dx, dy], i) => (
        <span
          key={i}
          className="gp-ef-no absolute block"
          style={{ left: `${home + dx * CELL + 0.6}%`, top: `${home + dy * CELL + 0.6}%`, width: `${CELL - 1.2}%`, height: `${CELL - 1.2}%`, border: `1.5px solid ${tint(p0, 0.9)}`, background: tint(p0, 0.16), animationDelay: dm(delayMs, 420 + i * 45) }}
        >
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M3 3 L7 7 M7 3 L3 7" stroke={tint(p2, 0.9)} strokeWidth="0.8" strokeLinecap="round" />
          </svg>
        </span>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="gp-ef-pip absolute block rounded-full" style={{ left: `${50 - 5.4 + i * 2.8}%`, top: `calc(50% + var(--fx-side, 1) * ${CELL * 2}% - 1.1%)`, width: "2.2%", height: "2.2%", background: p0, border: `1px solid ${p1}`, animationDelay: dm(delayMs, 900 + i * 90) }} />
      ))}
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{ left: `${home - CELL}%`, top: `${home - CELL}%`, width: `${CELL * 3}%`, height: `${CELL * 3}%`, background: `radial-gradient(closest-side, ${tint(p0, 0.35)}, transparent)`, animationDelay: dm(delayMs, 1200) }}
      />
    </Stage>
  );
}

/* --- endless_turn ----------------------------------------------------------------------------
   "Take exactly one bonus move. If that bonus move does not capture, take one
   more bonus move after your opponent replies." On the caster's side a bonus
   move arrow strides out; a pair of crossed blades over it is struck through
   (it did not capture), and so a second arrow is laid ready behind an
   hourglass (after their reply). */
function EndlessTurnScene({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  const row = `calc(${EDGE.own} + 2%)`;
  return (
    <Stage quakeMs={delayMs + 480}>
      <Rake delayMs={delayMs + 200} tone={tint(p0, 0.5)} lean="calc(var(--fx-ox, 0) * 2.4%)" tip="calc(var(--fx-oy, 0) * 1.5%)" cy={57} width={24} />
      <BoardFrame>
        <span className="gp-et-move absolute block" style={{ left: "26%", top: row, width: "14%", height: "8.5%", animationDelay: dm(delayMs, 0) }}>
          <svg viewBox="0 0 14 8" className="block h-full w-full" aria-hidden="true">
            <path d="M1 4 H11 M8 1 L12.4 4 L8 7" fill="none" stroke={p0} strokeWidth="1.3" {...SJ} />
          </svg>
        </span>
        <span className="gp-et-blades absolute block" style={{ left: "43.5%", top: `calc(${row} - 1%)`, width: "9%", height: "10%", animationDelay: dm(delayMs, 360) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M1.4 8.6 L8 2 M8.6 8.6 L2 2 M6.8 1.4 L8.6 1.4 L8.6 3.2 M3.2 1.4 L1.4 1.4 L1.4 3.2" fill="none" stroke={p2} strokeWidth="0.8" {...SJ} />
          </svg>
        </span>
        <span className="gp-et-strike absolute block" style={{ left: "43%", top: `calc(${row} - 1.5%)`, width: "10%", height: "11%", animationDelay: dm(delayMs, 620) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M1 9 L9 1" stroke={p1} strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </span>
        <span className="gp-et-wait absolute block" style={{ left: "56%", top: row, width: "5%", height: "8.5%", animationDelay: dm(delayMs, 820) }}>
          <HourglassArt stroke={p1} />
        </span>
        <span className="gp-et-second absolute block" style={{ left: "62%", top: row, width: "14%", height: "8.5%", animationDelay: dm(delayMs, 900) }}>
          <svg viewBox="0 0 14 8" className="block h-full w-full" aria-hidden="true">
            <path d="M1 4 H11 M8 1 L12.4 4 L8 7" fill="none" stroke={tint(p0, 0.7)} strokeWidth="1.3" strokeDasharray="1.6 1" {...SJ} />
          </svg>
        </span>
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "26%", top: EDGE.own, width: "48%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p0, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1200) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- warp_cataclysm ------------------------------------------------------------------------
   "Teleport up to four of your pieces, your king aside, each to any empty
   square, once. Pawns stay off the first and last ranks." Four rifts tear
   open one after another round the cast square, counted one to four dots;
   the king is set aside behind a bar; a pawn at the edge is turned back from
   the end rank. On every square the warp touches (target cut) a rift slit
   opens, flashes and seals. */
const WC_RIFTS = [
  { x: -1.4, y: -1.1 },
  { x: 1.4, y: -1.1 },
  { x: 1.4, y: 1.1 },
  { x: -1.4, y: 1.1 },
];
function RiftSlit({ edge, core }: { edge: string; core: string }) {
  return (
    <svg viewBox="0 0 4 10" className="block h-full w-full" aria-hidden="true">
      <path d="M2 0.4 C3.4 3 3.4 7 2 9.6 C0.6 7 0.6 3 2 0.4 Z" fill={core} stroke={edge} strokeWidth="0.4" {...SJ} />
    </svg>
  );
}
function RiftHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="gp-wc-slit absolute block" style={{ left: "34%", top: "6%", width: "32%", height: "88%", animationDelay: dm(delayMs, 0) }}>
        <RiftSlit edge={p0} core={tint(p1, 0.8)} />
      </span>
      <span className="gp-wc-flash absolute block rounded-full" style={{ left: "25%", top: "25%", width: "50%", height: "50%", background: tint(p2, 0.8), animationDelay: dm(delayMs, 260) }} />
    </span>
  );
}
function WarpCataclysmScene({ palette, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <RiftHit palette={palette} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 560}>
      <Rake delayMs={delayMs + 200} tone={tint(p1, 0.5)} lean="calc(var(--fx-ox, 0) * 2.4%)" tip="calc(var(--fx-oy, 0) * 1.5%)" cy={57} width={24} />
      {WC_RIFTS.map((r, i) => (
        <span key={i} className="gp-wc-slit absolute block" style={{ left: `${50 + r.x * CELL - 1.6}%`, top: `${50 + r.y * CELL - 4}%`, width: "3.2%", height: "8%", animationDelay: dm(delayMs, 120 + i * 140) }}>
          <RiftSlit edge={p0} core={tint(p1, 0.85)} />
        </span>
      ))}
      {WC_RIFTS.map((r, i) => (
        <span key={`c${i}`} className="gp-wc-count absolute block" style={{ left: `${50 + r.x * CELL - 2.4}%`, top: `${50 + r.y * CELL + 4.4}%`, width: "4.8%", height: "1.6%", animationDelay: dm(delayMs, 220 + i * 140) }}>
          <svg viewBox="0 0 12 4" className="block h-full w-full" aria-hidden="true">
            {Array.from({ length: i + 1 }, (_, k) => (
              <circle key={k} cx={6 - i * 1.5 + k * 3} cy="2" r="1.1" fill={p2} />
            ))}
          </svg>
        </span>
      ))}
      {/* the king is set aside */}
      <span className="gp-wc-king absolute block" style={{ left: "46.4%", top: "45.4%", width: "7.2%", height: "8%", animationDelay: dm(delayMs, 60) }}>
        <Sil d={SIL.k} fill={tint(p2, 0.9)} stroke={p0} />
      </span>
      <span className="gp-wc-bar absolute block" style={{ left: "45%", top: "49.4%", width: "10%", height: "1.2%", background: p0, animationDelay: dm(delayMs, 300) }} />
      {/* a pawn turned back from the end rank */}
      <span className="gp-wc-pawn absolute block" style={{ left: `${50 + 2.6 * CELL}%`, top: `calc(50% - var(--fx-side, 1) * ${CELL * 2.6}% - 3%)`, width: "4.4%", height: "6%", animationDelay: dm(delayMs, 760) }}>
        <Sil d={SIL.p} fill={tint(p2, 0.85)} stroke={p0} />
      </span>
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{ left: "38%", top: "38%", width: "24%", height: "24%", background: `radial-gradient(closest-side, ${tint(p1, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1150) }}
      />
    </Stage>
  );
}

/* --- rift_storm ---------------------------------------------------------------------------
   "Teleport up to two of your pieces, your king aside, each to any empty
   square, then swap the squares of two enemy pieces caught in the churn,
   once." A storm eye turns at the cast square and throws two blink bolts
   (your two teleports); then out on the opponent's side two of their pieces
   are caught in the churn and trade places along crossing arcs. Each square
   the storm touches (target cut) is struck by a short forked bolt. */
function BoltHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, , p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="gp-rs-bolt absolute block" style={{ left: "30%", top: "-60%", width: "40%", height: "140%", animationDelay: dm(delayMs, 0) }}>
        <svg viewBox="0 0 4 14" preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
          <path d="M2.6 0 L1 6 L2.8 6.4 L1.4 14" fill="none" stroke={p2} strokeWidth="0.6" {...SJ} />
          <path d="M1.8 7 L0.4 9.4" fill="none" stroke={p0} strokeWidth="0.4" strokeLinecap="round" />
        </svg>
      </span>
    </span>
  );
}
function RiftStormScene({ palette, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <BoltHit palette={palette} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 520}>
      <Rake delayMs={delayMs + 200} tone={tint(p0, 0.5)} lean="calc(var(--fx-ox, 0) * 2.4%)" tip="calc(var(--fx-oy, 0) * 1.5%)" cy={57} width={24} />
      <span className="gp-rs-eye absolute block" style={{ left: "43%", top: "43%", width: "14%", height: "14%", animationDelay: dm(delayMs, 0) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 5 C5 4.2 6 4.2 6 5 C6 6.2 4 6.4 3.8 5 C3.6 3.2 6.4 3 7 5 C7.6 7.4 4 8.2 2.8 6.4 C1.6 4.6 2.8 1.8 5.4 1.8 C7.8 1.8 9 4 8.6 6" fill="none" stroke={p0} strokeWidth="0.7" strokeLinecap="round" />
        </svg>
      </span>
      {[
        { dx: "-260%", dy: "-120%", d: 300 },
        { dx: "240%", dy: "-160%", d: 420 },
      ].map((b, i) => (
        <span key={i} className="gp-rs-blink absolute block" style={{ left: "48.5%", top: "46%", width: "3%", height: "8%", "--dx": b.dx, "--dy": b.dy, animationDelay: dm(delayMs, b.d) } as CSSProperties}>
          <svg viewBox="0 0 3 8" className="block h-full w-full" aria-hidden="true">
            <path d="M2 0.2 L0.6 4 L2 4.4 L1 7.8" fill="none" stroke={p2} strokeWidth="0.6" {...SJ} />
          </svg>
        </span>
      ))}
      <BoardFrame>
        {/* two of theirs, caught in the churn, trade squares */}
        {[
          { l: 37.5, cls: "gp-rs-swapa", t: SIL.n },
          { l: 53, cls: "gp-rs-swapb", t: SIL.b },
        ].map((s) => (
          <span key={s.cls} className={`${s.cls} absolute block`} style={{ left: `${s.l + 1.5}%`, top: `calc(${EDGE.enemy} + 1.5%)`, width: "9.5%", height: "9.5%", animationDelay: dm(delayMs, 640) }}>
            <Sil d={s.t} fill={tint(p0, 0.95)} stroke={p2} />
          </span>
        ))}
        <span className="gp-rs-arcs absolute block" style={{ left: "40%", top: `calc(${EDGE.enemy} - 3%)`, width: "22%", height: "18.5%", animationDelay: dm(delayMs, 640) }}>
          <svg viewBox="0 0 22 18" className="block h-full w-full" aria-hidden="true">
            <path d="M4 8 C8 0 14 0 18 8 M4 10 C8 18 14 18 18 10" fill="none" stroke={tint(p2, 0.85)} strokeWidth="0.6" strokeDasharray="1.2 0.8" />
          </svg>
        </span>
      </BoardFrame>
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{ left: "40%", top: "40%", width: "20%", height: "20%", background: `radial-gradient(closest-side, ${tint(p0, 0.45)}, transparent)`, animationDelay: dm(delayMs, 1150) }}
      />
    </Stage>
  );
}

/* --- grand_retreat -------------------------------------------------------------------------
   "Return your army to its free starting squares, once (blocked pieces stay
   put)." The caster's banner turns about, and pieces scattered over the
   board march straight back to their home ranks together; one of them finds
   its home square taken, stops short behind a bar and stays where it is. */
const GR_MARCH = [
  { t: "n" as const, l: 25, top: 37.5, dy: "380%" },
  { t: "b" as const, l: 62.5, top: 50, dy: "280%" },
  { t: "q" as const, l: 37.5, top: 25, dy: "480%" },
  { t: "r" as const, l: 87.5, top: 37.5, dy: "480%" },
];
function GrandRetreatScene({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 600}>
      <Rake delayMs={delayMs + 200} tone={tint(p0, 0.5)} lean="calc(var(--fx-ox, 0) * 2.4%)" tip="calc(var(--fx-oy, 0) * 1.5%)" cy={57} width={30} />
      <BoardFrame>
        <span className="gp-gr-banner absolute block" style={{ left: "4%", top: "calc(50% - 7%)", width: "9%", height: "14%", animationDelay: dm(delayMs, 0) }}>
          <svg viewBox="0 0 8 12" className="block h-full w-full" aria-hidden="true">
            <path d="M1.4 0.6 V11.4" stroke={p1} strokeWidth="0.7" strokeLinecap="round" />
            <path d="M1.8 1 H7.2 L5.8 3 L7.2 5 H1.8 Z" fill={p0} stroke={p1} strokeWidth="0.4" {...SJ} />
          </svg>
        </span>
        {/* the march home: mirrored for the caster at the top */}
        {GR_MARCH.map((m, i) => (
          <span
            key={i}
            className="gp-gr-march absolute block"
            style={{ left: `${m.l + 1.5}%`, top: `calc(43.75% + var(--fx-side, 1) * ${m.top - 43.75}% + 1.5%)`, width: "9.5%", height: "9.5%", "--gp-dy": `calc(var(--fx-side, 1) * ${m.dy})`, animationDelay: dm(delayMs, 220 + i * 50) } as CSSProperties}
          >
            <Sil d={SIL[m.t]} fill={tint(p2, 0.9)} stroke={p0} />
          </span>
        ))}
        {/* blocked: it stays put */}
        <span className="gp-gr-stay absolute block" style={{ left: "14%", top: "calc(43.75% + var(--fx-side, 1) * 18.75% + 1.5%)", width: "9.5%", height: "9.5%", animationDelay: dm(delayMs, 200) }}>
          <Sil d={SIL.n} fill={tint(p2, 0.9)} stroke={p0} />
        </span>
        <span className="gp-gr-block absolute block" style={{ left: "13%", top: "calc(43.75% + var(--fx-side, 1) * 18.75% + 6.25% + var(--fx-side, 1) * 6%)", width: "11.5%", height: "1.6%", background: p1, animationDelay: dm(delayMs, 640) }} />
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "20%", top: HOME.ownPawn, width: "60%", height: "25%", background: `radial-gradient(closest-side, ${tint(p0, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1200) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- full_rewind ------------------------------------------------------------------------------
   "Send up to five of your pieces back to their original home squares,
   once." A dial with five ticks runs backwards at the cast square, and five
   pieces play their moves in reverse: each flickers back through the ghosts
   of where it has been, frame by frame, to its home square. */
const FR_PIECES = [
  { t: "n" as const, l: 12.5 },
  { t: "b" as const, l: 31.25 },
  { t: "q" as const, l: 50 },
  { t: "b" as const, l: 68.75 },
  { t: "r" as const, l: 87.5 },
];
function FullRewindScene({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 560}>
      <Rake delayMs={delayMs + 200} tone={tint(p0, 0.5)} lean="calc(var(--fx-ox, 0) * 2.4%)" tip="calc(var(--fx-oy, 0) * 1.5%)" cy={57} width={24} />
      <span className="gp-fr-dial absolute block" style={{ left: "42%", top: "42%", width: "16%", height: "16%", animationDelay: dm(delayMs, 0) }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <circle cx="10" cy="10" r="8.6" fill={tint(p2, 0.55)} stroke={p0} strokeWidth="0.6" />
          {Array.from({ length: 5 }, (_, i) => {
            const a = (i / 5) * Math.PI * 2;
            return <path key={i} d={`M${(10 + Math.sin(a) * 6.8).toFixed(2)} ${(10 - Math.cos(a) * 6.8).toFixed(2)} L${(10 + Math.sin(a) * 8.4).toFixed(2)} ${(10 - Math.cos(a) * 8.4).toFixed(2)}`} stroke={p1} strokeWidth="0.8" strokeLinecap="round" />;
          })}
        </svg>
      </span>
      <span className="gp-fr-hand absolute block" style={{ left: "49.6%", top: "43%", width: "0.8%", height: "7%", background: p1, animationDelay: dm(delayMs, 120) }} />
      <BoardFrame>
        {FR_PIECES.map((p, i) =>
          [2, 1, 0].map((k) => (
            <span
              key={`${i}${k}`}
              className="gp-fr-frame absolute block"
              style={{ left: `${p.l - 4.75}%`, top: `calc(${HOME.ownBack} + 1.5% - var(--fx-side, 1) * ${k * 12.5}%)`, width: "9.5%", height: "9.5%", animationDelay: dm(delayMs, 300 + i * 60 + (2 - k) * 150), animationDuration: `calc(${k === 0 ? 1200 : 700}ms * var(--fx-dur, 1))` }}
            >
              <Sil d={SIL[p.t]} fill={k === 0 ? p1 : tint(p0, 0.5)} stroke={k === 0 ? p2 : tint(p0, 0.8)} />
            </span>
          )),
        )}
      </BoardFrame>
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{ left: "40%", top: "40%", width: "20%", height: "20%", background: `radial-gradient(closest-side, ${tint(p0, 0.45)}, transparent)`, animationDelay: dm(delayMs, 1200) }}
      />
    </Stage>
  );
}

/* --- mind_empire ------------------------------------------------------------------------------
   "Take control of one enemy piece of any type below queen. Your control ends
   the moment that piece makes a capture, and it returns to your opponent."
   The cast square is the taken piece: a third eye opens on the caster's side
   of it and a halo in the caster's colour settles round the square; then the
   condition plays out as a ghost: a dashed capture stroke leaves the square,
   and the halo snaps and slips back toward their side. Target cut: the halo
   settles. */
function HaloHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, , p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="gp-me-halo absolute block rounded-full" style={{ left: "6%", top: "6%", width: "88%", height: "88%", border: `2px solid ${tint(p0, 0.9)}`, animationDelay: dm(delayMs, 0) }} />
      <span className="gp-me-dot absolute block rounded-full" style={{ left: "42%", top: "2%", width: "16%", height: "16%", background: p2, animationDelay: dm(delayMs, 160) }} />
    </span>
  );
}
function MindEmpireScene({ palette, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <HaloHit palette={palette} delayMs={delayMs} />;
  const home = 50 - CELL / 2;
  return (
    <Stage quakeMs={delayMs + 440}>
      <Rake delayMs={delayMs + 200} tone={tint(p0, 0.5)} lean="calc(var(--fx-ox, 0) * 2.4%)" tip="calc(var(--fx-oy, 0) * 1.5%)" cy={57} width={22} />
      <span className="gp-me-eye absolute block" style={{ left: `${50 - 4.5}%`, top: `calc(50% + var(--fx-side, 1) * ${CELL * 1.1}% - 2.5%)`, width: "9%", height: "5%", animationDelay: dm(delayMs, 0) }}>
        <svg viewBox="0 0 10 5" className="block h-full w-full" aria-hidden="true">
          <path d="M0.6 2.5 C3 -0.2 7 -0.2 9.4 2.5 C7 5.2 3 5.2 0.6 2.5 Z" fill={tint(p1, 0.9)} stroke={p0} strokeWidth="0.5" {...SJ} />
          <circle cx="5" cy="2.5" r="1.2" fill={p0} />
        </svg>
      </span>
      <span className="gp-me-halo absolute block rounded-full" style={{ left: `${home - 0.4}%`, top: `${home - 0.4}%`, width: `${CELL + 0.8}%`, height: `${CELL + 0.8}%`, border: `2px solid ${tint(p0, 0.9)}`, animationDelay: dm(delayMs, 260) }} />
      {/* ...until it captures: a ghost stroke, and the halo slips away */}
      <span className="gp-me-ghost absolute block" style={{ left: `${50}%`, top: `${home - CELL}%`, width: `${CELL * 1.5}%`, height: `${CELL * 1.5}%`, animationDelay: dm(delayMs, 760) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M1 9 L8.6 1.4 M6 1.4 H8.6 V4" fill="none" stroke={p2} strokeWidth="0.7" strokeDasharray="1 0.7" {...SJ} />
        </svg>
      </span>
      <span className="gp-me-slip absolute block rounded-full" style={{ left: `${home - 0.4}%`, top: `${home - 0.4}%`, width: `${CELL + 0.8}%`, height: `${CELL + 0.8}%`, border: `2px dashed ${tint(p0, 0.7)}`, animationDelay: dm(delayMs, 980) }} />
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{ left: `${home - 3}%`, top: `${home - 3}%`, width: `${CELL + 6}%`, height: `${CELL + 6}%`, background: `radial-gradient(closest-side, ${tint(p0, 0.45)}, transparent)`, animationDelay: dm(delayMs, 1150) }}
      />
    </Stage>
  );
}

/* --- crown_and_castle ------------------------------------------------------------------------
   "Your opponent's queen and rooks turn to walnuts for 2 of their turns: a
   walnut is so heavy it can only shuffle one square at a time." On their
   side a crown and a castle turret each drop into an open walnut, the shells
   snap shut on them, and a single short step is all either can make; two
   pips. On each queen and rook (target cut) a carved nut closes with a
   one-square cross and two pips. */
function NutHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="gp-cc-nut absolute block" style={{ left: "16%", top: "12%", width: "68%", height: "76%", animationDelay: dm(delayMs, 0) }}>
        <svg viewBox="0 0 10 11" className="block h-full w-full" aria-hidden="true">
          <ellipse cx="5" cy="5.6" rx="4.2" ry="4.8" fill={tint(p2, 0.95)} stroke={tint(p1, 0.9)} strokeWidth="0.5" />
          <path d="M5 0.8 V10.4 M3 5.6 H7 M5 3.6 V7.6" stroke={p0} strokeWidth="0.45" strokeLinecap="round" />
        </svg>
      </span>
      {[0, 1].map((i) => (
        <span key={i} className="gp-cc-pip absolute block rounded-full" style={{ left: `${36 + i * 18}%`, top: "86%", width: "11%", height: "11%", background: p0, animationDelay: dm(delayMs, 420 + i * 90) }} />
      ))}
    </span>
  );
}
function CrownAndCastleScene({ palette, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <NutHit palette={palette} delayMs={delayMs} />;
  const row = "calc(43.75% - var(--fx-side, 1) * 18.75%)";
  return (
    <Stage quakeMs={delayMs + 460}>
      <Rake delayMs={delayMs + 160} tone={tint(p2, 0.5)} lean="calc(var(--fx-ox, 0) * 2.4%)" tip="calc(var(--fx-oy, 0) * 1.5%)" cy={57} width={24} />
      <BoardFrame>
        {[
          { l: 34, d: "M1.4 7 V1.6 L3.5 3.6 L5 0.8 L6.5 3.6 L8.6 1.6 V7 Z" },
          { l: 56, d: "M1.6 7.6 V1 H3.2 V2.4 H4.2 V1 H5.8 V2.4 H6.8 V1 H8.4 V7.6 Z" },
        ].map((e, i) => (
          <span key={i} className="gp-cc-drop absolute block" style={{ left: `${e.l + 2}%`, top: `calc(${row} + 1%)`, width: "6%", height: "5%", animationDelay: dm(delayMs, 80 + i * 120) }}>
            <svg viewBox="0 0 10 8" className="block h-full w-full" aria-hidden="true">
              <path d={e.d} fill={p0} stroke={p2} strokeWidth="0.5" {...SJ} />
            </svg>
          </span>
        ))}
        {[34, 56].map((l, i) =>
          [
            { cls: "gp-cc-shl", d: "M5 0.6 C2 0.6 0.8 3 0.8 6 C0.8 9 2.6 11 5 11.4 Z" },
            { cls: "gp-cc-shr", d: "M5 0.6 C8 0.6 9.2 3 9.2 6 C9.2 9 7.4 11 5 11.4 Z" },
          ].map((h) => (
            <span key={`${l}${h.cls}`} className={`${h.cls} absolute block`} style={{ left: `${l}%`, top: row, width: "10%", height: "12.5%", animationDelay: dm(delayMs, 360 + i * 120) }}>
              <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
                <path d={h.d} fill={tint(p2, 0.95)} stroke={tint(p1, 0.9)} strokeWidth="0.5" {...SJ} />
              </svg>
            </span>
          )),
        )}
        {[34, 56].map((l, i) => (
          <span key={`s${l}`} className="gp-cc-step absolute block" style={{ left: `${l - 1.25}%`, top: `calc(${row} - 3.75%)`, width: "12.5%", height: "20%", animationDelay: dm(delayMs, 760 + i * 80) }}>
            <svg viewBox="0 0 10 16" className="block h-full w-full" aria-hidden="true">
              <path d="M5 2 V0.6 M4.2 1.4 L5 0.6 L5.8 1.4 M5 14 V15.4 M4.2 14.6 L5 15.4 L5.8 14.6" fill="none" stroke={p0} strokeWidth="0.5" {...SJ} />
            </svg>
          </span>
        ))}
        {[0, 1].map((i) => (
          <span key={`p${i}`} className="gp-cc-pip absolute block rounded-full" style={{ left: `${47.6 + i * 3.2}%`, top: `calc(${row} + 5.5%)`, width: "2.4%", height: "2.4%", background: p0, border: `1px solid ${p1}`, animationDelay: dm(delayMs, 980 + i * 100) }} />
        ))}
        <span
          className="gp-afterglow absolute block rounded-full"
          style={{ left: "30%", top: row, width: "40%", height: "12.5%", background: `radial-gradient(closest-side, ${tint(p0, 0.4)}, transparent)`, animationDelay: dm(delayMs, 1150) }}
        />
      </BoardFrame>
    </Stage>
  );
}

/* --- fortress_realm ----------------------------------------------------------------------------
   "Pick a 3x3 zone: up to three of your pieces there, your king aside,
   cannot be captured for your opponent's next turn, then the zone becomes
   ordinary terrain." Walls rise round exactly the 3x3 block centred on the
   chosen square with a tower at each corner; three cells inside take a
   shield (up to three pieces) while a crown by the wall is struck (the king
   aside); one pip; then the walls lie down flat into the floor. Target
   cut: a small shield. */
const FR_SHIELDS: [number, number][] = [[-1, 0], [0, 1], [1, -1]];
function FortressRealmScene({ palette, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <AegisHit palette={palette} delayMs={delayMs} />;
  const box = 50 - CELL * 1.5;
  return (
    <Stage quakeMs={delayMs + 420}>
      <Rake delayMs={delayMs + 160} tone={tint(p1, 0.45)} lean="calc(var(--fx-ox, 0) * 2.4%)" tip="calc(var(--fx-oy, 0) * 1.5%)" cy={57} width={26} />
      <span className="gp-fk-wall absolute block" style={{ left: `${box}%`, top: `${box}%`, width: `${CELL * 3}%`, height: `${CELL * 3}%`, border: `3px solid ${tint(p0, 0.95)}`, background: tint(p1, 0.12), animationDelay: dm(delayMs, 0) }} />
      {[0, 1].flatMap((cx) =>
        [0, 1].map((cy) => (
          <span key={`${cx}${cy}`} className="gp-fk-tower absolute block" style={{ left: `${box + cx * CELL * 3 - 1.6}%`, top: `${box + cy * CELL * 3 - 1.6}%`, width: "3.2%", height: "3.2%", background: p0, border: `1px solid ${p2}`, animationDelay: dm(delayMs, 120 + (cx + cy) * 40) }} />
        )),
      )}
      {FR_SHIELDS.map(([dx, dy], i) => (
        <span key={i} className="gp-fk-shield absolute block" style={{ left: `${50 + dx * CELL - 1.8}%`, top: `${50 + dy * CELL - 2.2}%`, width: "3.6%", height: "4.4%", animationDelay: dm(delayMs, 360 + i * 90) }}>
          <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0.8 L9 2.2 V5.6 C9 8.4 7.2 10.2 5 11.2 C2.8 10.2 1 8.4 1 5.6 V2.2 Z" fill={tint(p1, 0.9)} stroke={p2} strokeWidth="0.7" {...SJ} />
          </svg>
        </span>
      ))}
      <span className="gp-fk-king absolute block" style={{ left: `${box + CELL * 3 + 0.6}%`, top: `${50 - 2.4}%`, width: "4%", height: "4.8%", animationDelay: dm(delayMs, 520) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d={SIL.k} fill={tint(p2, 0.8)} stroke={p0} strokeWidth="0.5" {...SJ} />
          <path d="M1.4 8.6 L8.6 1.4" stroke="#c94a5a" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </span>
      <span className="gp-fk-pip absolute block rounded-full" style={{ left: `${50 - 1.2}%`, top: `${box + CELL * 3 + 1}%`, width: "2.4%", height: "2.4%", background: p1, border: `1px solid ${p0}`, animationDelay: dm(delayMs, 760) }} />
    </Stage>
  );
}

/* --- warp_sovereign ---------------------------------------------------------------------------
   "Swap up to three pairs of your pieces, once. Stop after any pair." Three
   swap loops open one after another round the cast square, each counted in
   dots; the third is only dashed (up to three, and you may stop after any
   pair). Target cut on each picked square: two small arrows chase round it. */
function SwapHit({ palette, delayMs }: { palette: Palette; delayMs: number }) {
  const [p0, p1] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <span className="gp-ws-loop absolute block" style={{ left: "10%", top: "10%", width: "80%", height: "80%", animationDelay: dm(delayMs, 0) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M2 4 A3.4 3.4 0 0 1 8 3.4 M8 6 A3.4 3.4 0 0 1 2 6.6 M8 3.4 L8.4 1.8 M8 3.4 L6.4 3 M2 6.6 L1.6 8.2 M2 6.6 L3.6 7" fill="none" stroke={p1} strokeWidth="0.7" {...SJ} />
        </svg>
      </span>
      <span className="gp-me-dot absolute block rounded-full" style={{ left: "44%", top: "44%", width: "12%", height: "12%", background: p0, animationDelay: dm(delayMs, 200) }} />
    </span>
  );
}
function WarpSovereignScene({ palette, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <SwapHit palette={palette} delayMs={delayMs} />;
  return (
    <Stage quakeMs={delayMs + 420}>
      <Rake delayMs={delayMs + 160} tone={tint(p0, 0.5)} lean="calc(var(--fx-ox, 0) * 2.4%)" tip="calc(var(--fx-oy, 0) * 1.5%)" cy={57} width={22} />
      {[
        { x: -1.6, dash: false },
        { x: 0, dash: false },
        { x: 1.6, dash: true },
      ].map((p, i) => (
        <span key={i} className="gp-ws-loop absolute block" style={{ left: `${50 + p.x * CELL - 4}%`, top: `calc(50% - var(--fx-side, 1) * ${CELL * 1.3}% - 4%)`, width: "8%", height: "8%", animationDelay: dm(delayMs, 80 + i * 200) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M2 4 A3.4 3.4 0 0 1 8 3.4 M8 6 A3.4 3.4 0 0 1 2 6.6 M8 3.4 L8.4 1.8 M8 3.4 L6.4 3 M2 6.6 L1.6 8.2 M2 6.6 L3.6 7" fill="none" stroke={p.dash ? tint(p1, 0.7) : p1} strokeWidth="0.8" strokeDasharray={p.dash ? "1 0.7" : undefined} {...SJ} />
          </svg>
        </span>
      ))}
      {[0, 1, 2].map((i) => (
        <span key={`c${i}`} className="gp-wc-count absolute block" style={{ left: `${50 + (i - 1) * 1.6 * CELL - 2.4}%`, top: `calc(50% - var(--fx-side, 1) * ${CELL * 1.3}% + 4.6%)`, width: "4.8%", height: "1.6%", animationDelay: dm(delayMs, 200 + i * 200) }}>
          <svg viewBox="0 0 12 4" className="block h-full w-full" aria-hidden="true">
            {Array.from({ length: i + 1 }, (_, k) => (
              <circle key={k} cx={6 - i * 1.5 + k * 3} cy="2" r="1.1" fill={p2} />
            ))}
          </svg>
        </span>
      ))}
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{ left: "40%", top: "40%", width: "20%", height: "20%", background: `radial-gradient(closest-side, ${tint(p0, 0.45)}, transparent)`, animationDelay: dm(delayMs, 900) }}
      />
    </Stage>
  );
}

/* =============================================================================
   Glyphs — one small hand-drawn SVG per card, recognisable at a glance.
   All share a 0 0 10 10 viewBox so every template slot letterboxes them
   without distortion.
   ========================================================================== */
function Gl({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
      {children}
    </svg>
  );
}

const GLYPH: Record<string, ReactNode> = {
  /* --- once GodDescent --------------------------------------------------------- */
  // iron crown
  draft_tyranny: (
    <Gl>
      <path d="M1.2 7.8 V3.4 L3.4 5.2 L5 1.6 L6.6 5.2 L8.8 3.4 V7.8 Z" fill="#d6234f" stroke="#1c0f18" strokeWidth="0.5" {...SJ} />
      <circle cx="5" cy="6.4" r="0.7" fill="#ffd76a" stroke="#1c0f18" strokeWidth="0.3" />
    </Gl>
  ),
  // fanned twin cards
  sovereign_draft: (
    <Gl>
      <rect x="2" y="2" width="3.6" height="5.6" rx="0.5" transform="rotate(-14 3.8 4.8)" fill="#fff7de" stroke="#c9a84c" strokeWidth="0.5" />
      <rect x="4.4" y="2.2" width="3.6" height="5.6" rx="0.5" transform="rotate(12 6.2 5)" fill="#ffd76a" stroke="#c9a84c" strokeWidth="0.5" />
    </Gl>
  ),
  // scepter
  draft_supremacy: (
    <Gl>
      <path d="M5 3.8 V9.2" stroke="#d6234f" strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="5" cy="2.6" r="1.6" fill="#ffd76a" stroke="#d6234f" strokeWidth="0.5" />
      <path d="M3.4 1.4 L5 0.2 L6.6 1.4" fill="none" stroke="#d6234f" strokeWidth="0.5" {...SJ} />
      <circle cx="4.4" cy="2" r="0.4" fill="#fff4d6" />
    </Gl>
  ),
  // queen silhouette
  divine_legion: (
    <Gl>
      <path d="M2.6 9 L3.4 5.4 L2.2 2.6 L3.8 4 L5 2 L6.2 4 L7.8 2.6 L6.6 5.4 L7.4 9 Z" fill="#ffd76a" stroke="#b98cff" strokeWidth="0.5" {...SJ} />
      <circle cx="5" cy="1.6" r="0.5" fill="#fff2c9" />
    </Gl>
  ),
  // great heater shield
  absolute_aegis: (
    <Gl>
      <path d="M5 0.8 L8.6 2 V5 C8.6 7.4 7 8.8 5 9.6 C3 8.8 1.4 7.4 1.4 5 V2 Z" fill="#5fc9b0" stroke="#2f7a66" strokeWidth="0.5" {...SJ} />
      <path d="M5 2.4 V7.4 M3 4.6 H7" stroke="#ffd76a" strokeWidth="0.6" strokeLinecap="round" />
    </Gl>
  ),
  // crowned shield
  checkmate_denial: (
    <Gl>
      <path d="M3.4 2.6 V1 L4.2 1.8 L5 0.8 L5.8 1.8 L6.6 1 V2.6 Z" fill="#ffd76a" stroke="#5a8fc0" strokeWidth="0.4" {...SJ} />
      <path d="M5 3.2 L8.2 4 V6 C8.2 7.8 6.8 8.9 5 9.6 C3.2 8.9 1.8 7.8 1.8 6 V4 Z" fill="#dfe8ff" stroke="#5a8fc0" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // broken chain link
  full_pardon: (
    <Gl>
      <path d="M4 3 A2.2 2.2 0 1 0 4 7" fill="none" stroke="#ffd76a" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M6 3 A2.2 2.2 0 1 1 6 7" fill="none" stroke="#fff4d6" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M4.6 1.6 L5.4 0.6 M4.8 8.4 L5.6 9.4" stroke="#5fc9b0" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // ascending spark trail
  transcendence: (
    <Gl>
      <path d="M2.6 8.2 L3.4 9 L2.6 9.8 L1.8 9 Z" fill="#b98cff" />
      <path d="M4.8 4.6 L6 5.8 L4.8 7 L3.6 5.8 Z" fill="#ffd76a" />
      <path d="M7 0.6 L8.6 2.2 L7 3.8 L5.4 2.2 Z" fill="#fff4d6" stroke="#b98cff" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // third eye
  mind_empire: (
    <Gl>
      <path d="M1 5 C3 2.6 7 2.6 9 5 C7 7.4 3 7.4 1 5 Z" fill="#e3d0ff" stroke="#8f2bbf" strokeWidth="0.5" {...SJ} />
      <circle cx="5" cy="5" r="1.4" fill="#8f2bbf" />
      <circle cx="5" cy="5" r="0.5" fill="#ffd76a" />
      <path d="M2 2.6 C3.4 1.4 6.6 1.4 8 2.6" fill="none" stroke="#8f2bbf" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // twin eyes
  mass_mind_control: (
    <Gl>
      <path d="M0.6 3.4 C1.6 2 3.6 2 4.6 3.4 C3.6 4.8 1.6 4.8 0.6 3.4 Z" fill="#12081f" stroke="#c94ad1" strokeWidth="0.4" {...SJ} />
      <path d="M5.4 6.6 C6.4 5.2 8.4 5.2 9.4 6.6 C8.4 8 6.4 8 5.4 6.6 Z" fill="#12081f" stroke="#c94ad1" strokeWidth="0.4" {...SJ} />
      <circle cx="2.6" cy="3.4" r="0.5" fill="#6fe3ff" />
      <circle cx="7.4" cy="6.6" r="0.5" fill="#6fe3ff" />
    </Gl>
  ),
  // bell with slash
  throne_and_silence: (
    <Gl>
      <path d="M5 1.4 C7 1.4 7.6 3.4 7.6 5.6 L8.4 7 H1.6 L2.4 5.6 C2.4 3.4 3 1.4 5 1.4 Z" fill="#ffd76a" stroke="#5a6b8f" strokeWidth="0.5" {...SJ} />
      <circle cx="5" cy="8" r="0.6" fill="#c9cdd6" stroke="#5a6b8f" strokeWidth="0.3" />
      <path d="M1.4 1.4 L8.6 8.6" stroke="#5a6b8f" strokeWidth="0.8" strokeLinecap="round" />
    </Gl>
  ),
  // inverted falling crown
  abdication_edict: (
    <Gl>
      <path d="M2.4 3 V7.2 L4.2 5.6 L5.4 8.6 L6.6 5.6 L8.4 7.2 V3 Z" transform="rotate(-160 5 5)" fill="#ffd76a" stroke="#2a1030" strokeWidth="0.5" {...SJ} />
      <path d="M2 1.2 L2.6 2.4 M4 0.6 L4.2 1.8" stroke="#6b4a8f" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // marionette cross + strings
  wa_dominate_major: (
    <Gl>
      <path d="M1.6 2.6 L8.4 1.4 M2.6 1 L7.6 3.4" stroke="#8f2bbf" strokeWidth="0.7" strokeLinecap="round" />
      <circle cx="5" cy="2" r="0.6" fill="#ffd76a" />
      <path d="M2.6 2.4 V8.6 M5 2.6 V9 M7.6 2.4 V8.4" stroke="#e3d0ff" strokeWidth="0.4" />
    </Gl>
  ),

  /* --- once TitanRise ----------------------------------------------------------- */
  // twin pillars
  great_divide: (
    <Gl>
      <rect x="1.6" y="2.2" width="1.9" height="6.6" fill="#b0a68f" stroke="#8a7a63" strokeWidth="0.4" />
      <rect x="6.5" y="2.2" width="1.9" height="6.6" fill="#b0a68f" stroke="#8a7a63" strokeWidth="0.4" />
      <rect x="1.2" y="1.2" width="2.7" height="1" fill="#b0a68f" stroke="#8a7a63" strokeWidth="0.4" />
      <rect x="6.1" y="1.2" width="2.7" height="1" fill="#b0a68f" stroke="#8a7a63" strokeWidth="0.4" />
      <path d="M5 1.6 V8.8" stroke="#ffd76a" strokeWidth="0.5" strokeDasharray="0.9 0.7" />
    </Gl>
  ),
  // three cracked pillars
  sundering: (
    <Gl>
      <rect x="0.8" y="2" width="2" height="7" fill="#d9d2c0" stroke="#5c5348" strokeWidth="0.4" />
      <rect x="4" y="1.2" width="2" height="7.8" fill="#d9d2c0" stroke="#5c5348" strokeWidth="0.4" />
      <rect x="7.2" y="2" width="2" height="7" fill="#d9d2c0" stroke="#5c5348" strokeWidth="0.4" />
      <path d="M1.8 3 L1.4 5 L2.2 7 M5 2.2 L4.4 4.6 L5.4 7.4 M8.2 3 L7.8 5.2 L8.6 7.2" stroke="#ff9d3d" strokeWidth="0.5" fill="none" {...SJ} />
    </Gl>
  ),
  // castle keep
  fortress_realm: (
    <Gl>
      <path d="M2.2 9 V3 H3.4 V4 H4.4 V3 H5.6 V4 H6.6 V3 H7.8 V9 Z" fill="#d9d2c0" stroke="#8a94a8" strokeWidth="0.5" {...SJ} />
      <path d="M4.4 9 V6.6 A0.6 0.6 0 0 1 5.6 6.6 V9" fill="#8a94a8" />
      <path d="M5 3 V1.2 L6.6 1.8 L5 2.4" fill="#5fc9b0" stroke="#5fc9b0" strokeWidth="0.3" {...SJ} />
    </Gl>
  ),
  // molten heart
  molten_heart: (
    <Gl>
      <path d="M5 8.8 C1.4 6 0.8 3.4 2.4 2 C3.6 1 4.6 1.6 5 2.6 C5.4 1.6 6.4 1 7.6 2 C9.2 3.4 8.6 6 5 8.8 Z" fill="#e6432c" stroke="#3a1c12" strokeWidth="0.5" {...SJ} />
      <path d="M4.2 3 L5.2 4.6 L4.4 6 L5.6 7.4" stroke="#ff5c1a" strokeWidth="0.6" fill="none" {...SJ} />
    </Gl>
  ),
  // tipped salt urn
  salted_earth: (
    <Gl>
      <path d="M2.4 1.6 L4.6 1 L5.8 2 L6 3.8 L4.6 5 L2.8 4.6 L2 3 Z" transform="rotate(24 4 3)" fill="#e8dcc0" stroke="#b0a68f" strokeWidth="0.5" {...SJ} />
      <circle cx="6.4" cy="5.6" r="0.35" fill="#e8dcc0" />
      <circle cx="7.2" cy="7" r="0.35" fill="#e8dcc0" />
      <circle cx="6" cy="7.6" r="0.35" fill="#e8dcc0" />
      <path d="M2 9 H8.6" stroke="#8faf4a" strokeWidth="0.5" strokeLinecap="round" strokeDasharray="1 0.8" />
    </Gl>
  ),
  // shattered shackle
  unshackled_wrath: (
    <Gl>
      <path d="M3 2.4 A3.4 3.4 0 1 0 7.6 2.8" fill="none" stroke="#3a3a40" strokeWidth="1" strokeLinecap="round" />
      <path d="M3.6 1.4 L2.8 0.4 M8.2 1.8 L9.2 1 M8.6 3.4 L9.6 3.6" stroke="#ffd166" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M5.4 4 L4.6 5.8 L6 5.6 L5 7.6" stroke="#e6432c" strokeWidth="0.6" fill="none" {...SJ} />
    </Gl>
  ),
  // phoenix
  phoenix_line: (
    <Gl>
      <path d="M5 3 C3.6 4.4 3.6 6 5 7.6 C6.4 6 6.4 4.4 5 3 Z" fill="#ff7a29" stroke="#d6234f" strokeWidth="0.4" {...SJ} />
      <path d="M4.2 4.6 C2.6 4 1.4 2.6 1.4 1 C3 1.8 4.2 3 4.6 4.2 M5.8 4.6 C7.4 4 8.6 2.6 8.6 1 C7 1.8 5.8 3 5.4 4.2" fill="#ffd76a" stroke="#d6234f" strokeWidth="0.4" {...SJ} />
      <circle cx="5" cy="2.6" r="0.5" fill="#d6234f" />
      <path d="M5 7.8 L4.4 9.4 M5 7.8 L5.8 9.2" stroke="#ff7a29" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),

  /* --- once SkyWrath ------------------------------------------------------------ */
  // atom orbit
  chain_atomic: (
    <Gl>
      <ellipse cx="5" cy="5" rx="4" ry="1.7" fill="none" stroke="#ff9d3d" strokeWidth="0.5" />
      <ellipse cx="5" cy="5" rx="4" ry="1.7" transform="rotate(60 5 5)" fill="none" stroke="#ff9d3d" strokeWidth="0.5" />
      <circle cx="5" cy="5" r="1" fill="#ffd166" stroke="#e6432c" strokeWidth="0.4" />
    </Gl>
  ),
  // triple-orbit atom
  total_atomic: (
    <Gl>
      <ellipse cx="5" cy="5" rx="4.2" ry="1.6" fill="none" stroke="#e6432c" strokeWidth="0.5" />
      <ellipse cx="5" cy="5" rx="4.2" ry="1.6" transform="rotate(60 5 5)" fill="none" stroke="#e6432c" strokeWidth="0.5" />
      <ellipse cx="5" cy="5" rx="4.2" ry="1.6" transform="rotate(120 5 5)" fill="none" stroke="#e6432c" strokeWidth="0.5" />
      <circle cx="5" cy="5" r="1.1" fill="#ffd166" stroke="#7a1a10" strokeWidth="0.4" />
    </Gl>
  ),
  // flame brand
  scorched_earth: (
    <Gl>
      <path d="M5 0.8 C6.8 2.6 8 4.2 8 6.2 C8 8.2 6.6 9.4 5 9.4 C3.4 9.4 2 8.2 2 6.2 C2 4.8 2.8 3.6 3.6 2.8 C3.6 4 4.2 4.6 5 4.8 C4.6 3.4 4.6 2 5 0.8 Z" fill="#ff7a29" stroke="#3a1c12" strokeWidth="0.5" {...SJ} />
      <path d="M5 6 C5.8 6.8 5.8 8 5 8.6 C4.2 8 4.2 6.8 5 6 Z" fill="#ffb454" />
    </Gl>
  ),
  // jagged rift slash
  rift_storm: (
    <Gl>
      <path d="M7.6 0.6 L4.4 3.6 L5.8 4.2 L2.8 6.8 L4 7.4 L1.6 9.6 L6 6.6 L4.8 6 L7.8 3.4 L6.6 2.8 Z" fill="#12081f" stroke="#8f6bff" strokeWidth="0.5" {...SJ} />
      <path d="M6.4 1.6 L3.8 4 M5 5.4 L3.4 6.8" stroke="#6fe3ff" strokeWidth="0.35" strokeLinecap="round" />
    </Gl>
  ),
  // queen crown over bolt
  queen_storm: (
    <Gl>
      <path d="M2 3.6 V1 L3.5 2.2 L5 0.6 L6.5 2.2 L8 1 V3.6 Z" fill="#ffd76a" stroke="#b98cff" strokeWidth="0.4" {...SJ} />
      <path d="M5.6 4.4 L3.6 7 L5 7.3 L4.2 9.6 L6.6 6.6 L5.2 6.3 L6.4 4.4 Z" fill="#fff4d6" stroke="#b98cff" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),

  /* --- once AbyssMaw ------------------------------------------------------------ */
  // grasping hand
  buff_plunder: (
    <Gl>
      <path
        d="M2.6 9.4 V6.4 C2.6 5 3 4.2 3.2 3.2 C3.4 2.6 4.2 2.6 4.2 3.4 V5 M4.2 4.6 V2 C4.2 1.2 5.2 1.2 5.2 2 V4.6 M5.2 4.6 V2.6 C5.2 1.8 6.2 1.8 6.2 2.6 V4.8 M6.2 4.8 V3.4 C6.2 2.6 7.2 2.6 7.2 3.4 V6.4 C7.2 7.6 7 8.4 6.8 9.4"
        fill="#ffd76a"
        stroke="#2a2a38"
        strokeWidth="0.5"
        {...SJ}
      />
      <path d="M2.6 8 H7" stroke="#8f2bbf" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // overflowing chest
  total_plunder: (
    <Gl>
      <rect x="1.6" y="4.6" width="6.8" height="4" rx="0.4" fill="#c94ad1" stroke="#1c0f18" strokeWidth="0.5" />
      <path d="M1.6 4.6 L2.4 2.6 H7.6 L8.4 4.6" fill="#c94ad1" stroke="#1c0f18" strokeWidth="0.5" {...SJ} />
      <circle cx="3.4" cy="4.2" r="0.5" fill="#ffd76a" />
      <circle cx="5" cy="3.8" r="0.5" fill="#ffd76a" />
      <circle cx="6.6" cy="4.2" r="0.5" fill="#ffd76a" />
      <circle cx="5" cy="6.4" r="0.45" fill="#ffd76a" stroke="#1c0f18" strokeWidth="0.3" />
    </Gl>
  ),
  // null slash circle
  grand_nullify: (
    <Gl>
      <circle cx="5" cy="5" r="3.6" fill="#eef1f7" stroke="#8f6bff" strokeWidth="0.7" />
      <path d="M2.6 7.4 L7.4 2.6" stroke="#8a94a8" strokeWidth="0.8" strokeLinecap="round" />
    </Gl>
  ),
  // double null
  absolute_nullify: (
    <Gl>
      <circle cx="3.6" cy="4" r="2.8" fill="none" stroke="#c94a5a" strokeWidth="0.6" />
      <circle cx="6.4" cy="6" r="2.8" fill="none" stroke="#c9cdd6" strokeWidth="0.6" />
      <path d="M1.8 6 L5.4 2 M4.6 8 L8.2 4" stroke="#3a3a45" strokeWidth="0.6" strokeLinecap="round" />
    </Gl>
  ),

  /* --- ReaperSweep ----------------------------------------------------------- */
  // crescent moon
  endless_night: (
    <Gl>
      <path d="M6.6 1 A4.4 4.4 0 1 0 6.6 9 A3.5 3.5 0 1 1 6.6 1 Z" fill="#cdd6ff" stroke="#2c3e6b" strokeWidth="0.5" {...SJ} />
      <path d="M7.6 3.4 L7.9 4.3 L8.8 4.6 L7.9 4.9 L7.6 5.8 L7.3 4.9 L6.4 4.6 L7.3 4.3 Z" fill="#8a94a8" />
    </Gl>
  ),
  // lily
  peace_of_the_grave: (
    <Gl>
      <path d="M5 5.4 V9.4" stroke="#5fae7f" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M5 5.4 C3.2 4.8 2.6 3 3 1 C4.2 2 4.8 3.2 5 4.6 C5.2 3.2 5.8 2 7 1 C7.4 3 6.8 4.8 5 5.4 Z" fill="#eef1f7" stroke="#8a94a8" strokeWidth="0.4" {...SJ} />
      <path d="M5 5.4 C4 5.8 3 5.6 2.2 4.8 M5 5.4 C6 5.8 7 5.6 7.8 4.8" fill="none" stroke="#8a94a8" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // withered hand
  withered_hands: (
    <Gl>
      <path
        d="M3 9.4 C3 7.6 2.8 6.4 3.2 5.2 L2 3 L2.8 2.6 L4 4.4 L3.8 2 L4.7 1.9 L5.2 4.2 L5.8 1.6 L6.7 1.8 L6.4 4.4 L7.8 2.8 L8.5 3.4 L6.9 5.6 C7.1 6.8 7 7.8 6.8 9.4"
        fill="#c9b0e8"
        stroke="#6b4a8f"
        strokeWidth="0.5"
        {...SJ}
      />
      <path d="M4 6.4 L6 6.2 M4 7.6 L6.2 7.4" stroke="#8a94a8" strokeWidth="0.35" strokeLinecap="round" />
    </Gl>
  ),
  // hex star
  grand_malediction: (
    <Gl>
      <path d="M5 0.8 L8.6 7 H1.4 Z" fill="none" stroke="#8faf4a" strokeWidth="0.6" {...SJ} />
      <path d="M5 9.2 L1.4 3 H8.6 Z" fill="none" stroke="#6b4a8f" strokeWidth="0.6" {...SJ} />
      <circle cx="5" cy="5" r="0.7" fill="#2a1030" />
    </Gl>
  ),
  // wilted wheat stalk
  blighted_furrows: (
    <Gl>
      <path d="M3 9.4 C3.4 6.6 4.2 4.4 6.2 2.6" fill="none" stroke="#5c5348" strokeWidth="0.6" strokeLinecap="round" />
      <ellipse cx="6.8" cy="2.4" rx="1" ry="0.6" transform="rotate(40 6.8 2.4)" fill="#8faf4a" stroke="#2f3a26" strokeWidth="0.3" />
      <ellipse cx="5.4" cy="3.6" rx="0.9" ry="0.55" transform="rotate(55 5.4 3.6)" fill="#8faf4a" stroke="#2f3a26" strokeWidth="0.3" />
      <ellipse cx="4.5" cy="5.2" rx="0.85" ry="0.5" transform="rotate(70 4.5 5.2)" fill="#8faf4a" stroke="#2f3a26" strokeWidth="0.3" />
      <path d="M7.4 3.2 L8.6 4.6" stroke="#2f3a26" strokeWidth="0.35" strokeLinecap="round" />
    </Gl>
  ),
  // skull
  culling: (
    <Gl>
      <path d="M5 1 C7.4 1 8.6 2.6 8.6 4.6 C8.6 6 7.8 6.8 7 7.2 V8.6 H3 V7.2 C2.2 6.8 1.4 6 1.4 4.6 C1.4 2.6 2.6 1 5 1 Z" fill="#eef1f7" stroke="#1c1c22" strokeWidth="0.5" {...SJ} />
      <circle cx="3.7" cy="4.6" r="0.9" fill="#1c1c22" />
      <circle cx="6.3" cy="4.6" r="0.9" fill="#1c1c22" />
      <path d="M4.4 8.6 V7.6 M5.6 8.6 V7.6" stroke="#1c1c22" strokeWidth="0.4" />
      <path d="M4.6 6.4 L5 5.8 L5.4 6.4" fill="none" stroke="#d6234f" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // venom goblet
  poisoned_counsel: (
    <Gl>
      <path d="M2.4 1.4 H7.6 L7 4.2 C6.8 5.4 6 6 5 6 C4 6 3.2 5.4 3 4.2 Z" fill="#c9b0e8" stroke="#2f3a26" strokeWidth="0.5" {...SJ} />
      <path d="M5 6 V8.2 M3.4 8.8 H6.6" stroke="#2f3a26" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M2.8 2.2 H7.2" stroke="#8faf4a" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M7.4 3 C7.9 3.6 7.9 4.2 7.5 4.6" fill="none" stroke="#8faf4a" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),

  /* --- once HostMarch ------------------------------------------------------------- */
  // laurel wreath
  age_of_heroes: (
    <Gl>
      <path d="M2.4 2.4 C1.2 4.4 1.4 6.8 3 8.6 M7.6 2.4 C8.8 4.4 8.6 6.8 7 8.6" fill="none" stroke="#c94a3a" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M2 3.6 L3.2 3.4 M1.8 5 L3 5 M2.2 6.6 L3.4 6.8 M8 3.6 L6.8 3.4 M8.2 5 L7 5 M7.8 6.6 L6.6 6.8" stroke="#ffd76a" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M5 3.4 L5.5 4.6 L6.7 4.7 L5.8 5.5 L6.1 6.7 L5 6.1 L3.9 6.7 L4.2 5.5 L3.3 4.7 L4.5 4.6 Z" fill="#fff2c9" stroke="#c94a3a" strokeWidth="0.3" {...SJ} />
    </Gl>
  ),
  // reversed banner
  grand_retreat: (
    <Gl>
      <path d="M7.4 0.8 V9.2" stroke="#c9cdd6" strokeWidth="0.6" strokeLinecap="round" />
      <circle cx="7.4" cy="0.9" r="0.5" fill="#ffd76a" />
      <path d="M7.4 1.8 H2 L3.6 3.6 L2 5.4 H7.4 Z" fill="#5a8fc0" stroke="#2c4a6b" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  // fleeing banner
  noble_rout: (
    <Gl>
      <path d="M3 1 L6.4 9.4" stroke="#e8b04b" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M3.2 1.6 L8.4 2.6 L7.6 3.4 L8.2 4.4 L7.2 4.6 L7.6 5.8 L4.4 4.6 Z" fill="#6b1a2a" stroke="#e8b04b" strokeWidth="0.4" {...SJ} />
      <path d="M1.6 7.4 L2.6 6.8 M1.2 8.6 L2.4 8.2" stroke="#c9cdd6" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // burning tower
  sacked_capital: (
    <Gl>
      <path d="M3 9.2 V3.6 H3.9 V4.4 H4.7 V3.6 H5.5 V4.4 H6.3 V3.6 H7.2 V9.2 Z" fill="#2b1218" stroke="#c94a3a" strokeWidth="0.4" {...SJ} />
      <path d="M4 3 C3.6 2 4 1.2 4.8 0.6 C4.8 1.4 5.4 1.6 5.6 2.2 C6 1.6 6.6 1.6 6.8 1 C7.4 2 7 3 6.4 3.4 Z" fill="#ff9d3d" stroke="#c94a3a" strokeWidth="0.3" {...SJ} />
      <path d="M4.6 9.2 V7 H5.6 V9.2" fill="#c94a3a" />
    </Gl>
  ),

  /* --- once CelestialRing --------------------------------------------------------- */
  // sprouting seed
  genesis: (
    <Gl>
      <ellipse cx="5" cy="7.6" rx="1.4" ry="1.1" fill="#ffd76a" stroke="#7a9a4e" strokeWidth="0.4" />
      <path d="M5 6.6 V4" fill="none" stroke="#a8e07f" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M5 4 C3.6 4 2.8 3 2.8 1.8 C4.2 1.8 5 2.8 5 4 Z M5 4 C6.4 4 7.2 3 7.2 1.8 C5.8 1.8 5 2.8 5 4 Z" fill="#a8e07f" stroke="#7a9a4e" strokeWidth="0.35" {...SJ} />
      <circle cx="7.6" cy="1" r="0.4" fill="#fff4d6" />
    </Gl>
  ),
  // hex portal
  reality_warp: (
    <Gl>
      <path d="M5 0.8 L8.6 2.9 V7.1 L5 9.2 L1.4 7.1 V2.9 Z" fill="rgba(227,208,255,0.5)" stroke="#c94ad1" strokeWidth="0.6" {...SJ} />
      <path d="M5 2.6 L6.9 3.8 V6.2 L5 7.4 L3.1 6.2 V3.8 Z" fill="none" stroke="#6fe3ff" strokeWidth="0.5" {...SJ} />
    </Gl>
  ),
  // spiral
  total_warp: (
    <Gl>
      <path d="M5 5 C5.8 5 6 4.2 5.4 3.8 C4.4 3.2 3.2 4 3.2 5.2 C3.2 6.8 4.8 7.8 6.4 7.2 C8.2 6.4 8.6 4.2 7.4 2.8 C6 1 3.2 1 1.8 2.8" fill="none" stroke="#6fe3ff" strokeWidth="0.7" strokeLinecap="round" />
      <circle cx="5" cy="5" r="0.5" fill="#ffd76a" />
    </Gl>
  ),
  // five-dot rift
  warp_cataclysm: (
    <Gl>
      <path d="M1.4 8.6 C3 5.4 7 4.6 8.6 1.4" fill="none" stroke="#8f6bff" strokeWidth="0.6" strokeLinecap="round" />
      <circle cx="2" cy="7.6" r="0.55" fill="#6fe3ff" />
      <circle cx="3.4" cy="6" r="0.55" fill="#fff4d6" />
      <circle cx="5" cy="5" r="0.55" fill="#6fe3ff" />
      <circle cx="6.6" cy="4" r="0.55" fill="#fff4d6" />
      <circle cx="8" cy="2.4" r="0.55" fill="#6fe3ff" />
    </Gl>
  ),
  // crossed swap arrows
  warp_sovereign: (
    <Gl>
      <path d="M2 6.6 C2 3.6 4 2 6.6 2.4" fill="none" stroke="#8f6bff" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M6.2 1 L7.8 2.6 L5.9 3.8 Z" fill="#8f6bff" />
      <path d="M8 3.4 C8 6.4 6 8 3.4 7.6" fill="none" stroke="#ffd76a" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M3.8 9 L2.2 7.4 L4.1 6.2 Z" fill="#ffd76a" />
    </Gl>
  ),
  // yin-yang arrows
  nerf_reversal: (
    <Gl>
      <path d="M5 1.2 A3.8 3.8 0 0 1 8.8 5" fill="none" stroke="#a8e07f" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M8.8 5 L9.6 3.6 M8.8 5 L7.4 4.4" stroke="#a8e07f" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M5 8.8 A3.8 3.8 0 0 1 1.2 5" fill="none" stroke="#8f6bff" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M1.2 5 L0.4 6.4 M1.2 5 L2.6 5.6" stroke="#8f6bff" strokeWidth="0.5" strokeLinecap="round" />
      <circle cx="5" cy="5" r="0.6" fill="#fff4d6" />
    </Gl>
  ),
  // three aligned orbs
  celestial_alignment: (
    <Gl>
      <path d="M1.4 8.6 L8.6 1.4" stroke="#2c3e6b" strokeWidth="0.5" strokeLinecap="round" />
      <circle cx="2.4" cy="7.6" r="1" fill="#cdd6ff" stroke="#2c3e6b" strokeWidth="0.4" />
      <circle cx="5" cy="5" r="1.3" fill="#ffd76a" stroke="#2c3e6b" strokeWidth="0.4" />
      <circle cx="7.6" cy="2.4" r="1" fill="#cdd6ff" stroke="#2c3e6b" strokeWidth="0.4" />
    </Gl>
  ),
  // triple star sigil
  grand_conjunction: (
    <Gl>
      <circle cx="5" cy="5.4" r="3.9" fill="none" stroke="#3b1a5e" strokeWidth="0.4" />
      <path d="M5 1 L5.6 2.6 L7.2 3.2 L5.6 3.8 L5 5.4 L4.4 3.8 L2.8 3.2 L4.4 2.6 Z" fill="#ffd76a" />
      <path d="M2.6 5.4 L3 6.4 L4 6.8 L3 7.2 L2.6 8.2 L2.2 7.2 L1.2 6.8 L2.2 6.4 Z" fill="#e3d0ff" />
      <path d="M7.4 5.4 L7.8 6.4 L8.8 6.8 L7.8 7.2 L7.4 8.2 L7 7.2 L6 6.8 L7 6.4 Z" fill="#e3d0ff" />
    </Gl>
  ),

  /* --- once FrostTitan ------------------------------------------------------------ */
  // tomb slab
  glacial_tomb: (
    <Gl>
      <path d="M2.4 9.2 V3.6 C2.4 1.6 7.6 1.6 7.6 3.6 V9.2 Z" fill="#e8f8ff" stroke="#4f8fd1" strokeWidth="0.5" {...SJ} />
      <path d="M5 3.4 V5.6 M4 4.4 H6" stroke="#4f8fd1" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M3.4 6.8 H6.6 M3.4 7.8 H5.8" stroke="#9fd8ff" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // snowflake
  frozen_solid: (
    <Gl>
      <path d="M5 0.8 V9.2 M1.4 2.9 L8.6 7.1 M8.6 2.9 L1.4 7.1" stroke="#6fe3ff" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M4 1.8 L5 2.8 L6 1.8 M4 8.2 L5 7.2 L6 8.2 M1.8 4.4 L2.9 3.8 L2.6 2.6 M8.2 5.6 L7.1 6.2 L7.4 7.4" fill="none" stroke="#6fe3ff" strokeWidth="0.45" {...SJ} />
      <circle cx="5" cy="5" r="0.6" fill="#fff4d6" stroke="#3f7fb5" strokeWidth="0.3" />
    </Gl>
  ),
  // zero in a crystal
  absolute_zero: (
    <Gl>
      <path d="M5 0.6 L9 5 L5 9.4 L1 5 Z" fill="#bfe6ff" stroke="#1c3a5e" strokeWidth="0.5" {...SJ} />
      <ellipse cx="5" cy="5" rx="1.3" ry="1.9" fill="#fff4d6" stroke="#1c3a5e" strokeWidth="0.55" />
    </Gl>
  ),
  // ice shard
  everfrost_shard: (
    <Gl>
      <path d="M5 0.4 L7.2 4.4 L5 9.6 L2.8 4.4 Z" fill="#9fd8ff" stroke="#8f6bff" strokeWidth="0.5" {...SJ} />
      <path d="M5 1.6 V8.2" stroke="#e8f8ff" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),

  /* --- once ForgeColossus (the glyph IS the colossal implement) -------------------- */
  // moderator gavel / ban hammer (comedic, huge)
  ban_hammer: (
    <Gl>
      <path d="M5.4 4.6 L2 8 L2.8 8.8 L6.2 5.4" fill="#8a94a8" stroke="#4a4f5c" strokeWidth="0.4" {...SJ} />
      <rect x="4" y="1" width="4.6" height="3.4" rx="0.7" transform="rotate(45 6.3 2.7)" fill="#4fa3d1" stroke="#2b5a75" strokeWidth="0.5" />
      <circle cx="6.3" cy="2.7" r="1.1" fill="none" stroke="#ffd76a" strokeWidth="0.5" />
      <path d="M5.5 3.5 L7.1 1.9" stroke="#ffd76a" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // greatsword
  dragonslayer: (
    <Gl>
      <path d="M5 0.4 L5.9 1.6 L5.7 6.2 H4.3 L4.1 1.6 Z" fill="#c9cdd6" stroke="#5a5f6b" strokeWidth="0.4" {...SJ} />
      <path d="M2.8 6.4 H7.2 V7.2 H2.8 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.35" />
      <path d="M4.7 7.2 H5.3 V9 H4.7 Z" fill="#5a5f6b" />
      <circle cx="5" cy="9.3" r="0.55" fill="#d6234f" stroke="#5a5f6b" strokeWidth="0.3" />
    </Gl>
  ),
  // padlock
  world_lock: (
    <Gl>
      <path d="M3.2 4.4 V3 A1.8 1.8 0 0 1 6.8 3 V4.4" fill="none" stroke="#4fa3d1" strokeWidth="0.8" strokeLinecap="round" />
      <rect x="2.2" y="4.4" width="5.6" height="4.6" rx="0.7" fill="#8a94a8" stroke="#4a4f5c" strokeWidth="0.5" />
      <circle cx="5" cy="6.4" r="0.7" fill="#ffd76a" />
      <path d="M5 6.8 V7.9" stroke="#ffd76a" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // wax seal stamp
  sealed_archive: (
    <Gl>
      <path d="M4.4 0.8 H5.6 V3.4 H4.4 Z" fill="#c9a84c" stroke="#8a6a3a" strokeWidth="0.4" />
      <path d="M3.6 3.4 H6.4 L6.8 4.6 H3.2 Z" fill="#c9a84c" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <ellipse cx="5" cy="7" rx="3.4" ry="2.2" fill="#c9a84c" stroke="#8a6a3a" strokeWidth="0.5" />
      <path d="M5 5.8 L5.4 6.6 L6.3 6.7 L5.7 7.3 L5.8 8.2 L5 7.8 L4.2 8.2 L4.3 7.3 L3.7 6.7 L4.6 6.6 Z" fill="#e8dcc0" />
    </Gl>
  ),
  // chained portcullis
  sealed_ramparts: (
    <Gl>
      <path d="M2 1.4 V8.6 M4 1.4 V8.6 M6 1.4 V8.6 M8 1.4 V8.6 M1.2 3 H8.8 M1.2 5 H8.8 M1.2 7 H8.8" stroke="#8a94a8" strokeWidth="0.5" strokeLinecap="round" />
      <circle cx="3.4" cy="3.6" r="0.7" fill="none" stroke="#5c5c63" strokeWidth="0.5" />
      <circle cx="4.8" cy="4.8" r="0.7" fill="none" stroke="#5c5c63" strokeWidth="0.5" />
      <circle cx="6.2" cy="6" r="0.7" fill="none" stroke="#5c5c63" strokeWidth="0.5" />
      <circle cx="7.3" cy="7.1" r="0.5" fill="#c94a3a" />
    </Gl>
  ),
  // kettlebell weight
  leaden_limbs: (
    <Gl>
      <path d="M3.4 3.4 V2.6 A1.6 1.6 0 0 1 6.6 2.6 V3.4" fill="none" stroke="#3a3a40" strokeWidth="0.9" strokeLinecap="round" />
      <circle cx="5" cy="6.2" r="3.1" fill="#6e6e78" stroke="#3a3a40" strokeWidth="0.5" />
      <path d="M3.6 5 C4 4.4 4.8 4.2 5.4 4.5" fill="none" stroke="#c9a84c" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),

  /* --- once GorgonIdol ------------------------------------------------------------- */
  // walnut
  walnut_court: (
    <Gl>
      <ellipse cx="5" cy="5.2" rx="3.4" ry="3.9" fill="#c9b89a" stroke="#8a6a4a" strokeWidth="0.5" />
      <path d="M5 1.6 V8.8 M3 2.6 C2.4 4.4 2.4 6.2 3 7.8 M7 2.6 C7.6 4.4 7.6 6.2 7 7.8" fill="none" stroke="#8a6a4a" strokeWidth="0.4" strokeLinecap="round" />
      <path d="M6.8 1.4 C7.6 0.8 8.4 0.8 8.8 1.2" fill="none" stroke="#7fae5a" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // dark tower
  obsidian_bastions: (
    <Gl>
      <path d="M3.4 9.2 L3.8 2.6 H3 L5 0.6 L7 2.6 H6.2 L6.6 9.2 Z" fill="#2a2a35" stroke="#8a94a8" strokeWidth="0.4" {...SJ} />
      <rect x="4.5" y="4" width="1" height="1.4" rx="0.3" fill="#8f6bff" />
      <path d="M4.3 7 H5.7" stroke="#8a94a8" strokeWidth="0.35" />
    </Gl>
  ),
  // statue on plinth
  statue_garden: (
    <Gl>
      <rect x="2.6" y="7.4" width="4.8" height="1.8" fill="#c9c9cf" stroke="#6e6e74" strokeWidth="0.4" />
      <circle cx="5" cy="2.4" r="1" fill="#8d8d94" stroke="#6e6e74" strokeWidth="0.35" />
      <path d="M4 7.4 L4.2 4.6 L3.4 5.6 L2.8 5.2 L4.2 3.6 H5.8 L7.2 5.2 L6.6 5.6 L5.8 4.6 L6 7.4 Z" fill="#8d8d94" stroke="#6e6e74" strokeWidth="0.35" {...SJ} />
      <path d="M2.6 8.2 C3.4 7.6 4 8.4 4.8 8" fill="none" stroke="#7fae5a" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // cockerel-serpent
  cockatrice_gaze: (
    <Gl>
      <path d="M4 2.2 C4 1.2 5.6 1 5.8 2 L6.6 2.6 L5.8 3 C5.8 4.2 4.6 4.4 4 3.8 Z" fill="#7fae5a" stroke="#2f3a26" strokeWidth="0.4" {...SJ} />
      <path d="M4.6 1.6 L4.2 0.6 M5.2 1.5 L5.2 0.4" stroke="#e8b04b" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M4.2 3.6 C2.6 4.8 2.4 6.6 3.8 7.6 C5.4 8.8 7.4 8 7.8 6.4 C8 5.4 7.4 4.6 6.6 4.6" fill="none" stroke="#7fae5a" strokeWidth="0.7" strokeLinecap="round" />
      <circle cx="5" cy="2.4" r="0.35" fill="#2f3a26" />
    </Gl>
  ),
  // chisel + mallet
  chisel_curse: (
    <Gl>
      <path d="M2 1.6 L6.4 6 L7.4 5 L3 0.6 Z" transform="rotate(8 4.7 3.3)" fill="#8d8d94" stroke="#5c5c63" strokeWidth="0.35" {...SJ} />
      <path d="M7 5.4 L8.4 6.8 L7.8 7.4 L6.4 6 Z" fill="#e8dcc0" stroke="#5c5c63" strokeWidth="0.35" {...SJ} />
      <rect x="1" y="6.2" width="3.4" height="2" rx="0.4" transform="rotate(-40 2.7 7.2)" fill="#b0a68f" stroke="#7a6f5a" strokeWidth="0.4" />
      <path d="M3.6 8.2 L6 9.4" stroke="#7a6f5a" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // crown atop turret
  crown_and_castle: (
    <Gl>
      <path d="M3 9.2 V4.6 H3.9 V5.4 H4.7 V4.6 H5.5 V5.4 H6.3 V4.6 H7.2 V9.2 Z" fill="#8d8d94" stroke="#8a6a4a" strokeWidth="0.4" {...SJ} />
      <path d="M3.2 3.8 V1.6 L4.3 2.6 L5.1 1.2 L5.9 2.6 L7 1.6 V3.8 Z" fill="#ffd76a" stroke="#8a6a4a" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),

  /* --- once ChronoLord -------------------------------------------------------------- */
  // counter-clockwise arrow
  full_rewind: (
    <Gl>
      <path d="M7.6 2.8 A3.6 3.6 0 1 0 8.6 5.6" fill="none" stroke="#6fe3ff" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M7.9 0.8 L7.4 3.2 L9.6 2.6 Z" fill="#6fe3ff" />
      <circle cx="5" cy="5" r="0.6" fill="#ffd76a" />
    </Gl>
  ),
  // infinity loop
  endless_turn: (
    <Gl>
      <path d="M5 5 C3.8 3.4 2 3.4 1.4 5 C2 6.6 3.8 6.6 5 5 C6.2 3.4 8 3.4 8.6 5 C8 6.6 6.2 6.6 5 5 Z" fill="none" stroke="#e6432c" strokeWidth="0.8" {...SJ} />
      <circle cx="5" cy="5" r="0.55" fill="#ffd76a" />
    </Gl>
  ),
  // torn calendar page
  lost_fortnight: (
    <Gl>
      <path d="M2.2 2 H7.8 V7 L6.8 7.8 L5.8 7.2 L4.8 8.2 L3.8 7.4 L2.2 8 Z" fill="#cdd6ff" stroke="#5a6b8f" strokeWidth="0.5" {...SJ} />
      <path d="M2.2 2 H7.8 V3.4 H2.2 Z" fill="#5a6b8f" />
      <circle cx="3.6" cy="1.6" r="0.4" fill="#ffd76a" />
      <circle cx="6.4" cy="1.6" r="0.4" fill="#ffd76a" />
      <path d="M3.4 5 H6.6 M3.4 6.2 H5.6" stroke="#5a6b8f" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  // hammock between posts
  sabbatical: (
    <Gl>
      <path d="M1.4 2.6 V8.8 M8.6 2.6 V8.8" stroke="#5fc9b0" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M1.4 3.6 C3 6.8 7 6.8 8.6 3.6" fill="none" stroke="#ffd76a" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M3.2 5.4 C4.2 6.2 5.8 6.2 6.8 5.4" fill="none" stroke="#ffd76a" strokeWidth="0.4" strokeLinecap="round" />
      <circle cx="7.9" cy="1.5" r="0.8" fill="#fff7de" stroke="#5fc9b0" strokeWidth="0.3" />
    </Gl>
  ),
};

/* =============================================================================
   Registry
   ========================================================================== */

/** Live tier per plugin entry, filled by `bindTiers` right after PLAYS is
 * built (G cannot see the card id: the registry audits parse the
 * `G(Template, palette, glyph, config, flourish?)` shape, so it stays). */
const TIER_OF = new WeakMap<SigPlugin, number>();

/** Playback rate for the short cut (ledger F227). The god scenes were written
 * for tiers 7 to 10 and run about 2.6 to 3s; a card that lives at tier 5 or
 * below should not hold the board that long. The whole scene (durations AND
 * delays, since Web Animations playbackRate scales the local time) is played
 * faster, so every beat keeps its order and nothing is cut off. */
function tempoFor(tier: number): number {
  if (tier <= 4) return 1.8;
  if (tier === 5) return 1.35;
  return 1;
}

/** Plays its subtree's CSS animations at `rate`. With animations off the
 * gp-* layers carry `animation: none`, so there is nothing to speed up and the
 * end state is unchanged. */
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
function Tempo({ rate, children }: { rate: number; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof el.getAnimations !== "function") return;
    for (const a of el.getAnimations({ subtree: true })) a.playbackRate = rate;
  }, [rate]);
  return (
    <span ref={ref} className="contents">
      {children}
    </span>
  );
}

/** Bind a template + palette + glyph + config (+ per-card flourish key) into
 * a SigPlugin entry. The flourish string is the card's structural uniqueness
 * marker inside a shared template - see TemplateProps.flourish. */
function G(
  Template: ComponentType<TemplateProps>,
  palette: Palette,
  glyph: ReactNode,
  config: SigPlugin["config"],
  flourish?: string,
): SigPlugin {
  const plugin: SigPlugin = {
    config,
    Render: function GodPlayRender({ lead, role, delayMs }: { lead: boolean; role: SigRole; delayMs: number }) {
      // The card arriving in a hand is NOT the play: every template in this
      // module is a board-scale event, so routing entrances here (rather than
      // branching inside all twenty-five scenes) keeps one arrival beat that
      // cannot accidentally take the board over. It still carries the card's
      // own palette and its own glyph, so it reads as this card.
      if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} />;
      const tier = TIER_OF.get(plugin) ?? 7;
      const scene = <Template palette={palette} glyph={glyph} lead={lead} role={role} delayMs={delayMs} flourish={flourish} tier={tier} />;
      const rate = tempoFor(tier);
      return rate === 1 ? scene : <Tempo rate={rate}>{scene}</Tempo>;
    },
  };
  return plugin;
}

export const PLAYS: Record<string, SigPlugin> = {
  /* --- once GodDescent ------------------------------------------------------- */
  draft_tyranny: G(DraftTyrannyScene, ["#d6234f", "#ffd76a", "#1c0f18"], GLYPH.draft_tyranny, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "coronation", anchor: "board",
  }),
  sovereign_draft: G(SovereignDraftScene, ["#ffd76a", "#fff7de", "#c9a84c"], GLYPH.sovereign_draft, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "coronation", anchor: "board",
  }),
  draft_supremacy: G(DraftSupremacyScene, ["#ffd76a", "#d6234f", "#fff4d6"], GLYPH.draft_supremacy, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "coronation", anchor: "board",
  }),
  divine_legion: G(DivineLegionScene, ["#fff2c9", "#ffd76a", "#b98cff"], GLYPH.divine_legion, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "crownrain", source: "summon", anchor: "cast",
  }),
  absolute_aegis: G(AbsoluteAegisScene, ["#5fc9b0", "#ffd76a", "#e8fff7"], GLYPH.absolute_aegis, {
    ordering: "radial", staggerMs: 40, victims: "all", hasLead: true, sound: "aegis", source: "shield", anchor: "cast",
  }),
  checkmate_denial: G(CheckmateDenialScene, ["#dfe8ff", "#ffd76a", "#5a8fc0"], GLYPH.checkmate_denial, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "shades", source: "kingSafe", anchor: "cast",
  }),
  full_pardon: G(FullPardonScene, ["#fff4d6", "#ffd76a", "#5fc9b0"], GLYPH.full_pardon, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cathedral", anchor: "cast",
  }),
  transcendence: G(TranscendenceScene, ["#b98cff", "#ffd76a", "#fff4d6"], GLYPH.transcendence, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "coronation", anchor: "board",
  }),
  mind_empire: G(MindEmpireScene, ["#8f2bbf", "#e3d0ff", "#ffd76a"], GLYPH.mind_empire, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades", anchor: "aim",
  }),
  mass_mind_control: G(MassMindControlScene, ["#c94ad1", "#12081f", "#6fe3ff"], GLYPH.mass_mind_control, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades", anchor: "aim",
  }),
  throne_and_silence: G(ThroneAndSilenceScene, ["#5a6b8f", "#ffd76a", "#c9cdd6"], GLYPH.throne_and_silence, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "snooze", source: "stun", anchor: "board",
  }),
  abdication_edict: G(AbdicationEdictScene, ["#6b4a8f", "#ffd76a", "#2a1030"], GLYPH.abdication_edict, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "snooze", source: "stun", anchor: "board",
  }),
  wa_dominate_major: G(WaDominateMajorScene, ["#8f2bbf", "#ffd76a", "#e3d0ff"], GLYPH.wa_dominate_major, {
    ordering: "radial", staggerMs: 60, victims: ["r", "q"], hasLead: true, sound: "shades", anchor: "aim",
  }),

  /* --- once TitanRise ---------------------------------------------------------- */
  great_divide: G(GreatDivideScene, ["#b0a68f", "#8a7a63", "#ffd76a"], GLYPH.great_divide, {
    ordering: "sweep", staggerMs: 70, victims: "all", hasLead: true, sound: "wall", source: "blindfold", anchor: "cast",
  }),
  sundering: G(SunderingScene, ["#5c5348", "#ff9d3d", "#d9d2c0"], GLYPH.sundering, {
    ordering: "sweep", staggerMs: 70, victims: "all", hasLead: true, sound: "cataclysm", source: "blindfold", anchor: "board",
  }),
  fortress_realm: G(FortressRealmScene, ["#8a94a8", "#5fc9b0", "#d9d2c0"], GLYPH.fortress_realm, {
    ordering: "radial", staggerMs: 50, victims: "all", hasLead: true, sound: "cathedral", source: "shield", anchor: "cast",
  }),
  molten_heart: G(MoltenHeartScene, ["#ff5c1a", "#e6432c", "#3a1c12"], GLYPH.molten_heart, {
    ordering: "sweep", staggerMs: 70, victims: "all", hasLead: true, sound: "cataclysm", source: "blindfold", anchor: "cast",
  }),
  salted_earth: G(SaltedEarthScene, ["#e8dcc0", "#b0a68f", "#8faf4a"], GLYPH.salted_earth, {
    ordering: "sweep", staggerMs: 70, victims: ["p"], hasLead: true, sound: "extinction", anchor: "board",
  }),
  unshackled_wrath: G(UnshackledWrathScene, ["#e6432c", "#3a3a40", "#ffd166"], GLYPH.unshackled_wrath, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz", source: "stun", anchor: "board",
  }),
  phoenix_line: G(PhoenixLineScene, ["#ff7a29", "#ffd76a", "#d6234f"], GLYPH.phoenix_line, {
    ordering: "sweep", staggerMs: 80, victims: ["p"], hasLead: true, sound: "wall", source: "summon", anchor: "aim",
  }),

  /* --- once SkyWrath ------------------------------------------------------------ */
  chain_atomic: G(ChainAtomic, ["#ff9d3d", "#e6432c", "#ffd166"], GLYPH.chain_atomic, {
    ordering: "octagon", staggerMs: 70, victims: "all", hasLead: true, sound: "atomic", anchor: "cast",
  }),
  total_atomic: G(TotalAtomic, ["#e6432c", "#7a1a10", "#ffd166"], GLYPH.total_atomic, {
    ordering: "octagon", staggerMs: 70, victims: "all", hasLead: true, sound: "atomic", anchor: "board",
  }),
  scorched_earth: G(ScorchedEarthScene, ["#ff7a29", "#3a1c12", "#ffb454"], GLYPH.scorched_earth, {
    ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "cataclysm", source: "blindfold", anchor: "board",
  }),
  rift_storm: G(RiftStormScene, ["#8f6bff", "#12081f", "#6fe3ff"], GLYPH.rift_storm, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "lightning", anchor: "aim",
  }),
  queen_storm: G(QueenStormScene, ["#ffd76a", "#b98cff", "#fff4d6"], GLYPH.queen_storm, {
    ordering: "sweep", staggerMs: 70, victims: ["p"], hasLead: true, sound: "crownrain", anchor: "aim",
  }),

  /* --- once AbyssMaw ------------------------------------------------------------- */
  buff_plunder: G(BuffPlunderScene, ["#ffd76a", "#8f2bbf", "#2a2a38"], GLYPH.buff_plunder, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "rampage", anchor: "board",
  }),
  total_plunder: G(TotalPlunderScene, ["#ffd76a", "#1c0f18", "#c94ad1"], GLYPH.total_plunder, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "rampage", anchor: "board",
  }),
  grand_nullify: G(GrandNullifyScene, ["#8a94a8", "#8f6bff", "#eef1f7"], GLYPH.grand_nullify, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades", anchor: "board",
  }),
  absolute_nullify: G(AbsoluteNullifyScene, ["#3a3a45", "#c94a5a", "#c9cdd6"], GLYPH.absolute_nullify, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades", anchor: "board",
  }),

  /* --- ReaperSweep ------------------------------------------------------------ */
  endless_night: G(EndlessNight, ["#2c3e6b", "#cdd6ff", "#8a94a8"], GLYPH.endless_night, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "shades", source: "slow", anchor: "board",
  }),
  peace_of_the_grave: G(ReaperSweep, ["#eef1f7", "#8a94a8", "#5fae7f"], GLYPH.peace_of_the_grave, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "extinction", anchor: "cast",
  }, "grave_cordon"),
  withered_hands: G(WitheredHandsScene, ["#8a94a8", "#6b4a8f", "#c9b0e8"], GLYPH.withered_hands, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "petrify", anchor: "cast",
  }),
  grand_malediction: G(GrandMaledictionScene, ["#6b4a8f", "#8faf4a", "#2a1030"], GLYPH.grand_malediction, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "shades", source: "slow", anchor: "board",
  }),
  blighted_furrows: G(BlightedFurrowsScene, ["#8faf4a", "#5c5348", "#2f3a26"], GLYPH.blighted_furrows, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true, sound: "extinction", anchor: "board",
  }),
  // APEX (tier 9) — bespoke SkullStrike set piece: death's bowling night.
  culling: G(SkullStrike, ["#d6234f", "#1c1c22", "#eef1f7"], GLYPH.culling, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "extinction", anchor: "cast",
  }),
  poisoned_counsel: G(PoisonedCounselScene, ["#8faf4a", "#2f3a26", "#c9b0e8"], GLYPH.poisoned_counsel, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "petrify", anchor: "board",
  }),

  /* --- once HostMarch --------------------------------------------------------------- */
  age_of_heroes: G(AgeOfHeroesScene, ["#ffd76a", "#c94a3a", "#fff2c9"], GLYPH.age_of_heroes, {
    ordering: "sweep", staggerMs: 60, victims: ["n", "b", "r"], hasLead: true, sound: "blitz", source: "rally", anchor: "aim",
  }),
  grand_retreat: G(GrandRetreatScene, ["#5a8fc0", "#c9cdd6", "#ffd76a"], GLYPH.grand_retreat, {
    ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz", anchor: "cast",
  }),
  noble_rout: G(NobleRoutScene, ["#6b1a2a", "#c9cdd6", "#e8b04b"], GLYPH.noble_rout, {
    ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "rampage", anchor: "cast",
  }),
  sacked_capital: G(SackedCapitalScene, ["#ff9d3d", "#2b1218", "#c94a3a"], GLYPH.sacked_capital, {
    ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "cataclysm", source: "slow", anchor: "board",
  }),

  /* --- once CelestialRing -------------------------------------------------------------- */
  genesis: G(GenesisScene, ["#a8e07f", "#fff4d6", "#ffd76a"], GLYPH.genesis, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cathedral", anchor: "board",
  }),
  reality_warp: G(RealityWarpScene, ["#c94ad1", "#6fe3ff", "#e3d0ff"], GLYPH.reality_warp, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage", anchor: "aim",
  }),
  total_warp: G(TotalWarpScene, ["#5b2b8f", "#6fe3ff", "#ffd76a"], GLYPH.total_warp, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage", anchor: "board",
  }),
  warp_cataclysm: G(WarpCataclysmScene, ["#6fe3ff", "#8f6bff", "#fff4d6"], GLYPH.warp_cataclysm, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage", anchor: "aim",
  }),
  warp_sovereign: G(WarpSovereignScene, ["#8f6bff", "#ffd76a", "#e3d0ff"], GLYPH.warp_sovereign, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage", anchor: "aim",
  }),
  nerf_reversal: G(NerfReversalScene, ["#a8e07f", "#8f6bff", "#fff4d6"], GLYPH.nerf_reversal, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis", anchor: "cast",
  }),
  celestial_alignment: G(CelestialAlignmentScene, ["#2c3e6b", "#cdd6ff", "#ffd76a"], GLYPH.celestial_alignment, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "clockice", source: "frozen", anchor: "board",
  }),
  // APEX (tier 9) — bespoke PlanetAlign set piece: the planets align.
  grand_conjunction: G(PlanetAlign, ["#3b1a5e", "#e3d0ff", "#ffd76a"], GLYPH.grand_conjunction, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "clockice", source: "frozen", anchor: "board",
  }),

  /* --- once FrostTitan ---------------------------------------------------------------- */
  glacial_tomb: G(GlacialTombScene, ["#9fd8ff", "#e8f8ff", "#4f8fd1"], GLYPH.glacial_tomb, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen", anchor: "board",
  }),
  frozen_solid: G(FrozenSolidScene, ["#6fe3ff", "#fff4d6", "#3f7fb5"], GLYPH.frozen_solid, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen", anchor: "aim",
  }),
  absolute_zero: G(AbsoluteZero, ["#bfe6ff", "#fff4d6", "#1c3a5e"], GLYPH.absolute_zero, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen", anchor: "board",
  }),
  everfrost_shard: G(EverfrostShardScene, ["#9fd8ff", "#8f6bff", "#e8f8ff"], GLYPH.everfrost_shard, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen", anchor: "aim",
  }),

  /* --- once ForgeColossus --------------------------------------------------------------- */
  ban_hammer: G(BanHammerScene, ["#4fa3d1", "#8a94a8", "#ffd76a"], GLYPH.ban_hammer, {
    ordering: "sweep", staggerMs: 80, victims: ["n", "b", "r"], hasLead: true, sound: "siege", anchor: "board",
  }),
  dragonslayer: G(DragonslayerScene, ["#c9cdd6", "#d6234f", "#ffd76a"], GLYPH.dragonslayer, {
    ordering: "radial", staggerMs: 0, victims: ["r", "q"], hasLead: true, sound: "siege", anchor: "board",
  }),
  world_lock: G(WorldLockScene, ["#8a94a8", "#4fa3d1", "#ffd76a"], GLYPH.world_lock, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage", anchor: "cast",
  }),
  sealed_archive: G(SealedArchiveScene, ["#c9a84c", "#8a6a3a", "#e8dcc0"], GLYPH.sealed_archive, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "wall", anchor: "board",
  }),
  sealed_ramparts: G(SealedRampartsScene, ["#8a94a8", "#5c5c63", "#c94a3a"], GLYPH.sealed_ramparts, {
    ordering: "sweep", staggerMs: 70, victims: ["r"], hasLead: true, sound: "wall", anchor: "aim",
  }),
  leaden_limbs: G(LeadenLimbsScene, ["#6e6e78", "#c9a84c", "#3a3a40"], GLYPH.leaden_limbs, {
    ordering: "sweep", staggerMs: 70, victims: "all", hasLead: true, sound: "petrify", anchor: "board",
  }),

  /* --- once GorgonIdol ------------------------------------------------------------------ */
  walnut_court: G(WalnutCourtScene, ["#8a6a4a", "#c9b89a", "#7fae5a"], GLYPH.walnut_court, {
    ordering: "sweep", staggerMs: 60, victims: ["r"], hasLead: true, sound: "petrify", source: "walnut", anchor: "aim",
  }),
  obsidian_bastions: G(ObsidianBastionsScene, ["#2a2a35", "#8f6bff", "#8a94a8"], GLYPH.obsidian_bastions, {
    ordering: "sweep", staggerMs: 60, victims: ["r"], hasLead: true, sound: "petrify", source: "walnut", anchor: "aim",
  }),
  statue_garden: G(StatueGardenScene, ["#8d8d94", "#7fae5a", "#c9c9cf"], GLYPH.statue_garden, {
    ordering: "sweep", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "petrifiedforest", source: "walnut", anchor: "aim",
  }),
  cockatrice_gaze: G(CockatriceGazeScene, ["#7fae5a", "#e8b04b", "#2f3a26"], GLYPH.cockatrice_gaze, {
    ordering: "sweep", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "petrify", source: "walnut", anchor: "aim",
  }),
  chisel_curse: G(ChiselCurseScene, ["#b0a68f", "#8d8d94", "#e8dcc0"], GLYPH.chisel_curse, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "petrify", source: "walnut", anchor: "cast",
  }),
  crown_and_castle: G(CrownAndCastleScene, ["#ffd76a", "#8d8d94", "#8a6a4a"], GLYPH.crown_and_castle, {
    ordering: "sweep", staggerMs: 60, victims: ["q", "r"], hasLead: true, sound: "petrifiedforest", source: "walnut", anchor: "aim",
  }),

  /* --- once ChronoLord ------------------------------------------------------------------- */
  full_rewind: G(FullRewindScene, ["#6fe3ff", "#ffd76a", "#2a2a38"], GLYPH.full_rewind, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage", anchor: "aim",
  }),
  endless_turn: G(EndlessTurnScene, ["#e6432c", "#ffd76a", "#fff4d6"], GLYPH.endless_turn, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz", source: "rally", anchor: "cast",
  }),
  lost_fortnight: G(LostFortnightScene, ["#5a6b8f", "#cdd6ff", "#ffd76a"], GLYPH.lost_fortnight, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "snooze", source: "slow", anchor: "board",
  }),
  sabbatical: G(SabbaticalScene, ["#5fc9b0", "#fff7de", "#ffd76a"], GLYPH.sabbatical, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "snooze", anchor: "board",
  }),
};

/** Bind every entry's live tier (see TIER_OF). Exported so the weight check
 * (docs/polish-pass/evidence/TC-god/check-god-weight.ts) can assert it. */
export function godPlayTier(id: string): number {
  return TIER_OF.get(PLAYS[id]) ?? 7;
}
function bindTiers(): void {
  for (const [id, plugin] of Object.entries(PLAYS)) TIER_OF.set(plugin, BUFF_BY_ID[id]?.tier ?? 7);
}
bindTiers();
