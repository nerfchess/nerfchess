// God-tier plugin signatures (tier 7+ spectacle upgrades). See sigPlugins.tsx
// for the contract. Self-contained: own SVG, own CSS (godPlays.css),
// transform/opacity only. Do NOT import from BoardEffects.tsx.
//
// Every play here is a divine EVENT in the LivingGodBurst mould:
//   build-up      — board-wide tinted wash + a fan of god-rays / gathering dark
//   manifestation — a COLOSSAL central SVG entity enters the board
//   climax        — touchdown flare + spark burst + shockwave ring(s) that
//                   sweep past the board edges
//   aftermath     — a brief hanging glint
// Total length stays within ~2.5s (the two APEX tier-9 set pieces below may
// run to ~3.2s). Non-lead ("target") renders are compact
// per-square hits (glyph pop + ring + sparks) because zone-fed cards mount one
// overlay per affected square.
//
// THIRTEEN TEMPLATES, each parameterised by { palette, glyph }:
//   GodDescent    — haloed robed deity descends in a 5-ray god-fan
//   TitanRise     — stone/earth titan shoulders up from below, rubble arcs
//   SkyWrath      — storm-god in a cloud bank hurls a jagged bolt down
//   AbyssMaw      — a vast void maw opens mid-board; motes get pulled in
//   ReaperSweep   — colossal hooded reaper strides, scythe arc across the crop
//   HostMarch     — heraldic war-host marches behind a giant standard
//   CelestialRing — a vast rune ring settles flat out of the sky
//   FrostTitan    — glacial colossus rises amid ice-shard fans + frost panes
//   ForgeColossus — the glyph itself, writ huge, slams the board centre
//   GorgonIdol    — colossal idol head rises, radiating petrifying gaze rings
//   ChronoLord    — hourglass time sovereign + great clock ring with a hand
//   SkullStrike   — APEX (tier 9, culling only): death's bowling night — the
//                   skull glyph writ huge bowls the width of the crop, piece-
//                   pins scatter, STRIKE flare + triple shockwave
//   PlanetAlign   — APEX (tier 9, grand_conjunction only): letterbox bars,
//                   three worlds slide into syzygy and a conjunction beam
//                   pierces the board, triple shockwave
//
// CARD -> TEMPLATE / PALETTE / GLYPH table (69 entries):
//   GodDescent    : draft_tyranny (iron crown), sovereign_draft (twin cards),
//                   draft_supremacy (scepter), divine_legion (queen),
//                   absolute_aegis (heater shield), checkmate_denial (crowned
//                   shield), full_pardon (broken chain), transcendence
//                   (ascending sparks), mind_empire (third eye),
//                   mass_mind_control (twin eyes), throne_and_silence (belled
//                   slash), abdication_edict (falling crown), wa_dominate_major
//                   (marionette cross)
//   TitanRise     : great_divide (twin pillars), sundering (cracked pillars),
//                   fortress_realm (castle keep), molten_heart (molten heart),
//                   salted_earth (tipped urn), unshackled_wrath (shattered
//                   shackle), phoenix_line (phoenix)
//   SkyWrath      : chain_atomic (atom), total_atomic (triple-orbit atom),
//                   scorched_earth (flame brand), rift_storm (jagged rift),
//                   queen_storm (crown over bolt)
//   AbyssMaw      : buff_plunder (grasping hand), total_plunder (overflowing
//                   chest), grand_nullify (null circle), absolute_nullify
//                   (double null)
//   ReaperSweep   : endless_night (crescent), peace_of_the_grave (lily),
//                   withered_hands (withered hand), grand_malediction (hex
//                   star), blighted_furrows (wilted wheat), poisoned_counsel
//                   (venom goblet)
//   HostMarch     : age_of_heroes (laurel), grand_retreat (reversed banner),
//                   noble_rout (fleeing banner), sacked_capital (burning tower)
//   CelestialRing : genesis (sprouting seed), reality_warp (hex portal),
//                   total_warp (spiral), warp_cataclysm (five-dot rift),
//                   warp_sovereign (swap arrows), nerf_reversal (yin-yang
//                   arrows), celestial_alignment (three orbs)
//   FrostTitan    : glacial_tomb (tomb slab), frozen_solid (snowflake),
//                   absolute_zero (zero in crystal), everfrost_shard (shard)
//   ForgeColossus : ban_hammer (moderator gavel — comedic, huge), dragonslayer
//                   (greatsword), world_lock (padlock), sealed_archive (wax
//                   seal stamp), sealed_ramparts (chained portcullis),
//                   leaden_limbs (kettlebell)
//   GorgonIdol    : walnut_court (walnut), obsidian_bastions (dark tower),
//                   statue_garden (statue on plinth), cockatrice_gaze
//                   (cockerel-serpent), chisel_curse (chisel + mallet),
//                   crown_and_castle (crown atop turret)
//   ChronoLord    : full_rewind (ccw arrow),
//                   endless_turn (infinity), lost_fortnight (torn calendar),
//                   sabbatical (hammock)
//   SkullStrike   : culling (skull, writ huge and BOWLED)
//   PlanetAlign   : grand_conjunction (triple star as the syzygy sigil)

import "./godPlays.css";

import type { ComponentType, CSSProperties, ReactNode } from "react";
import type { SigPlugin } from "./sigPlugins";

/* =============================================================================
   Shared bits
   ========================================================================== */

type Palette = [string, string, string];

interface TemplateProps {
  palette: Palette;
  glyph: ReactNode;
  lead: boolean;
  delayMs: number;
  /** Per-card structural flourish key. Cards sharing a template each pass a
   * unique key that arms a card-specific scene addition inside the template
   * (the flagship beat that makes the card's mechanic legible). Exactly one
   * card per template family runs keyless as the baseline scene. */
  flourish?: string;
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
 * square; this canvas is ~14 squares wide — the board is the central ~57%). */
function Stage({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      <span className="absolute left-[-650%] top-[-650%] block h-[1400%] w-[1400%]">{children}</span>
    </span>
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

/** The five-ray god-fan breaking from the top of the sky (LivingGod lineage).
 * The outer span holds the static fan rotation; the animated gp-ray lives one
 * level in so its keyframed transform never clobbers the rotation. */
const RAYS = [
  { r: "-28deg", d: 0, w: "9%" },
  { r: "-14deg", d: 60, w: "11.5%" },
  { r: "0deg", d: 30, w: "14%" },
  { r: "14deg", d: 90, w: "11.5%" },
  { r: "28deg", d: 120, w: "9%" },
];
function RayFan({ hex, delayMs }: { hex: string; delayMs: number }) {
  return (
    <>
      {RAYS.map((s, i) => (
        <span
          key={i}
          className="absolute block"
          style={{
            left: "50%",
            top: "6%",
            height: "66%",
            width: s.w,
            marginLeft: `calc(${s.w} / -2)`,
            transform: `rotate(${s.r})`,
            transformOrigin: "50% 0%",
          }}
        >
          <span
            className="gp-ray absolute inset-0 block"
            style={{
              background: `linear-gradient(180deg, ${tint(hex, 0.85)}, ${tint(hex, 0.22)} 70%, transparent)`,
              animationDelay: `${delayMs + s.d}ms`,
            }}
          />
        </span>
      ))}
    </>
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

/** Rubble / shard chunks lobbed up on arcs (TitanRise, FrostTitan). */
const LOBS = [
  { dx: "-320%", dy: "-220%", rot: "-160deg", d: 0, l: 43 },
  { dx: "300%", dy: "-260%", rot: "180deg", d: 30, l: 53 },
  { dx: "-180%", dy: "-320%", rot: "-120deg", d: 60, l: 47 },
  { dx: "220%", dy: "-180%", rot: "140deg", d: 15, l: 56 },
  { dx: "90%", dy: "-340%", rot: "100deg", d: 45, l: 50 },
  { dx: "-260%", dy: "-140%", rot: "-100deg", d: 75, l: 40 },
];
function Lobs({
  delayMs,
  fill,
  stroke,
  top = 60,
  sizePct = 6.5,
}: {
  delayMs: number;
  fill: string;
  stroke: string;
  top?: number;
  sizePct?: number;
}) {
  return (
    <>
      {LOBS.map((v, i) => (
        <span
          key={i}
          className="gp-lob absolute block"
          style={
            {
              left: `${v.l}%`,
              top: `${top}%`,
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
            <path d="M2 6 L1 3.4 L4 1 L8 2 L9 5.2 L6.4 9 L3 8.6 Z" fill={fill} stroke={stroke} strokeWidth="0.7" {...SJ} />
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
        style={{ background: "rgba(6,6,12,0.6)", animationDelay: `${delayMs}ms` }}
      />
      <span
        className="gp-rumble absolute block"
        style={{
          left: "18%",
          top: `${Math.min(cy + 9, 68)}%`,
          width: "64%",
          height: "1.1%",
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
    </>
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
 * this must NOT be board-wide. */
const HIT_SPARKS = [
  { dx: "170%", dy: "-150%", rot: "140deg", d: 0 },
  { dx: "-160%", dy: "-120%", rot: "-160deg", d: 18 },
  { dx: "30%", dy: "190%", rot: "90deg", d: 36 },
];
function TargetHit({ palette, glyph, delayMs }: { palette: Palette; glyph: ReactNode; delayMs: number }) {
  const [p0, p1, p2] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {/* tell: a focus ring converges onto the square an instant before the hit */}
      <span
        className="gp-focus absolute block rounded-full"
        style={{ left: "8%", top: "8%", width: "84%", height: "84%", border: `2px solid ${tint(p0, 0.9)}`, animationDelay: `${delayMs}ms` }}
      />
      <span
        className="gp-flash absolute block rounded-full"
        style={{ left: "17%", top: "17%", width: "66%", height: "66%", background: tint(p1, 0.5), animationDelay: `${delayMs + 140}ms` }}
      />
      <span className="gp-pop absolute block" style={{ left: "18%", top: "16%", width: "64%", height: "64%", animationDelay: `${delayMs + 200}ms` }}>
        {glyph}
      </span>
      <span
        className="gp-tring absolute block rounded-full"
        style={{ left: "10%", top: "10%", width: "80%", height: "80%", border: `2px solid ${tint(p1, 0.95)}`, animationDelay: `${delayMs + 280}ms` }}
      />
      {/* settle: a small ember-glow lingers on the struck square */}
      <span
        className="gp-afterglow absolute block rounded-full"
        style={{
          left: "24%",
          top: "28%",
          width: "52%",
          height: "44%",
          background: `radial-gradient(closest-side, ${tint(p1, 0.5)}, transparent)`,
          animationDelay: `${delayMs + 640}ms`,
        }}
      />
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
              "--dx": v.dx,
              "--dy": v.dy,
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
   Template 1: GodDescent — haloed robed deity descends in a 5-ray god-fan,
   the card glyph blazoned on its chest.
   ========================================================================== */
function GodDescent({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.28)} delayMs={delayMs} />
      <Tell hex={p1} delayMs={delayMs} cy={56} />
      <RayFan hex={p1} delayMs={delayMs} />
      {/* the colossal deity, descending into the light */}
      <span className="gp-descend absolute block" style={{ left: "33%", top: "16%", width: "34%", height: "56%", animationDelay: `${delayMs + 180}ms` }}>
        <svg viewBox="0 0 32 44" className="block h-full w-full" aria-hidden="true">
          {/* halo */}
          <circle cx="16" cy="8" r="7.2" fill="none" stroke={p1} strokeWidth="1.4" />
          {/* head + crown of light */}
          <circle cx="16" cy="8" r="3.4" fill={tint(p1, 0.92)} stroke={p2} strokeWidth="0.8" />
          <path d="M12.8 4.6 L13.8 1.8 L15.2 3.8 L16 0.8 L16.8 3.8 L18.2 1.8 L19.2 4.6 Z" fill={p1} stroke={p2} strokeWidth="0.5" {...SJ} />
          {/* robed body, arms spread in benediction */}
          <path
            d="M16 12 C13 12 12 14 11.5 17 L3.5 23.5 L5.5 25.7 L11 21.8 L9 42 H23 L21 21.8 L26.5 25.7 L28.5 23.5 L20.5 17 C20 14 19 12 16 12 Z"
            fill={tint(p0, 0.9)}
            stroke={p2}
            strokeWidth="1"
            strokeLinejoin="round"
          />
          {/* robe folds */}
          <path d="M12.8 26 L12 40 M16 24 V41 M19.2 26 L20 40" stroke={tint(p2, 0.55)} strokeWidth="0.7" fill="none" />
        </svg>
        {/* the card's glyph, blazoned on the chest */}
        <span className="absolute block" style={{ left: "36%", top: "40%", width: "28%", height: "20%" }}>{glyph}</span>
      </span>
      {/* touchdown flare + sparks + divine shockwaves */}
      <span
        className="gp-flash absolute block rounded-full"
        style={{ left: "34%", top: "60%", width: "32%", height: "18%", background: tint(p1, 0.8), animationDelay: `${delayMs + 520}ms` }}
      />
      <Sparks delayMs={delayMs + 560} fill={p1} stroke={p2} sizePct={9} cy={58} />
      <Boom delayMs={delayMs + 600} color={tint(p1, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 720} color={tint(p0, 0.8)} />
      {/* --- per-card flourishes ------------------------------------------- */}
      {/* draft_tyranny: the tyrant's decree — both next card-backs rise beside
          the deity and an iron crown clamps down onto each (the drafts are
          forced to the tyrant's tier). */}
      {flourish === "tier_brand" && (
        <>
          {[36.5, 57].map((l, i) => (
            <span key={i} className="gp-rise absolute block" style={{ left: `${l}%`, top: "40%", width: "6.5%", height: "11%", animationDelay: `${delayMs + 660 + i * 150}ms` }}>
              <svg viewBox="0 0 8 11" className="block h-full w-full" aria-hidden="true">
                <rect x="0.5" y="0.5" width="7" height="10" rx="0.8" fill="#fff7de" stroke={p2} strokeWidth="0.5" />
                <rect x="1.6" y="1.7" width="4.8" height="7.6" rx="0.5" fill="none" stroke={tint(p0, 0.8)} strokeWidth="0.4" />
              </svg>
            </span>
          ))}
          {[36.8, 57.3].map((l, i) => (
            <span key={`c${i}`} className="gp-capdrop absolute block" style={{ left: `${l}%`, top: "38%", width: "5.8%", height: "4.6%", animationDelay: `${delayMs + 900 + i * 150}ms` }}>
              <svg viewBox="0 0 10 8" className="block h-full w-full" aria-hidden="true">
                <path d="M1.4 7 V1.6 L3.5 3.6 L5 0.8 L6.5 3.6 L8.6 1.6 V7 Z" fill={p0} stroke={p2} strokeWidth="0.6" {...SJ} />
              </svg>
            </span>
          ))}
        </>
      )}
      {/* sovereign_draft: both offered cards swoop out of the sky into the
          sovereign's grasp — nothing is left on the table. */}
      {flourish === "twin_claim" && (
        <>
          {[
            { dx: "-430%", dy: "-190%", d: 0 },
            { dx: "460%", dy: "-160%", d: 90 },
          ].map((v, i) => (
            <span
              key={i}
              className="gp-mote absolute block"
              style={{ left: "47.4%", top: "40%", width: "5.2%", height: "7%", "--dx": v.dx, "--dy": v.dy, animationDelay: `${delayMs + 620 + v.d}ms` } as CSSProperties}
            >
              <svg viewBox="0 0 7 9" className="block h-full w-full" aria-hidden="true">
                <rect x="0.5" y="0.5" width="6" height="8" rx="0.7" fill="#fff7de" stroke={p2} strokeWidth="0.5" />
                <path d="M1.8 2.2 H5.2 M1.8 3.6 H5.2 M1.8 5 H4" stroke={tint(p2, 0.7)} strokeWidth="0.4" strokeLinecap="round" />
              </svg>
            </span>
          ))}
          <span
            className="gp-flash absolute block rounded-full"
            style={{ left: "43%", top: "38%", width: "14%", height: "9%", background: tint(p1, 0.85), animationDelay: `${delayMs + 1060}ms` }}
          />
        </>
      )}
      {/* draft_supremacy: a whole fan of cards is swept down to your edge of
          the board while the card the opponent would have drawn is struck
          grey from their hand. */}
      {flourish === "draft_seize" && (
        <>
          {[
            { l: 40, dx: "-90%", dy: "300%", rot: "-30deg", d: 0 },
            { l: 46, dx: "-30%", dy: "340%", rot: "20deg", d: 70 },
            { l: 53, dx: "30%", dy: "330%", rot: "-15deg", d: 140 },
            { l: 59, dx: "90%", dy: "290%", rot: "30deg", d: 210 },
          ].map((v, i) => (
            <span
              key={i}
              className="gp-spark absolute block"
              style={{ left: `${v.l}%`, top: "42%", width: "4.6%", height: "6.2%", "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + 640 + v.d}ms` } as CSSProperties}
            >
              <svg viewBox="0 0 7 9" className="block h-full w-full" aria-hidden="true">
                <rect x="0.5" y="0.5" width="6" height="8" rx="0.7" fill="#fff7de" stroke={p1} strokeWidth="0.5" />
              </svg>
            </span>
          ))}
          <span className="gp-crack absolute block" style={{ left: "46.5%", top: "13%", width: "7%", height: "9%", animationDelay: `${delayMs + 980}ms` }}>
            <svg viewBox="0 0 7 9" className="block h-full w-full" aria-hidden="true">
              <rect x="0.5" y="0.5" width="6" height="8" rx="0.7" fill={tint("#8a94a8", 0.85)} stroke={p1} strokeWidth="0.5" />
              <path d="M1.4 1.4 L5.6 7.6 M5.6 1.4 L1.4 7.6" stroke={p1} strokeWidth="0.8" strokeLinecap="round" />
            </svg>
          </span>
        </>
      )}
      {/* absolute_aegis: a great shield-dome closes over the whole board and
          holds while ward glints run its rim — nothing inside can be taken. */}
      {flourish === "aegis_dome" && (
        <>
          <span className="gp-seal absolute block" style={{ left: "17%", top: "24%", width: "66%", height: "42%", animationDelay: `${delayMs + 680}ms` }}>
            <svg viewBox="0 0 44 28" className="block h-full w-full" aria-hidden="true">
              <path d="M2 27 A20 20 0 0 1 42 27" fill={tint(p0, 0.14)} stroke={tint(p1, 0.95)} strokeWidth="1.1" />
              <path d="M6.5 27 A15.5 15.5 0 0 1 37.5 27" fill="none" stroke={tint(p0, 0.7)} strokeWidth="0.6" strokeDasharray="2.4 1.6" />
            </svg>
          </span>
          <Glint delayMs={delayMs + 880} color={p1} left={26} top={38} sizePct={4.5} />
          <Glint delayMs={delayMs + 1020} color={p0} left={48} top={24} sizePct={5} />
          <Glint delayMs={delayMs + 1160} color={p1} left={70} top={38} sizePct={4.5} />
        </>
      )}
      {/* checkmate_denial: the king stands into a ward ring and the incoming
          blade shatters against it. */}
      {flourish === "king_ward" && (
        <>
          <span className="gp-rise absolute block" style={{ left: "45.5%", top: "44%", width: "9%", height: "15%", animationDelay: `${delayMs + 620}ms` }}>
            <Sil d={SIL.k} fill={tint(p0, 0.95)} stroke={p2} />
          </span>
          <span
            className="gp-gaze absolute block rounded-full"
            style={{ left: "39%", top: "42%", width: "22%", height: "20%", border: `3px solid ${tint(p1, 0.9)}`, animationDelay: `${delayMs + 840}ms` }}
          />
          <span
            className="gp-mote absolute block"
            style={{ left: "47.8%", top: "38%", width: "4.4%", height: "7%", "--dx": "320%", "--dy": "-220%", animationDelay: `${delayMs + 980}ms` } as CSSProperties}
          >
            <svg viewBox="0 0 6 10" className="block h-full w-full" aria-hidden="true">
              <path d="M3 0.4 L3.9 1.6 L3.6 6.4 H2.4 L2.1 1.6 Z M1.4 6.8 H4.6 V7.6 H1.4 Z M2.6 7.6 H3.4 V9.4 H2.6 Z" fill="#c9cdd6" stroke={p2} strokeWidth="0.4" {...SJ} />
            </svg>
          </span>
          <Sparks delayMs={delayMs + 1220} fill={p1} stroke={p2} sizePct={4.5} cx={52} cy={41} />
        </>
      )}
      {/* full_pardon: the sentence-chain stretched across the board SNAPS at
          the middle and its halves are flung away. */}
      {flourish === "chain_snap" && (
        <>
          <span className="gp-crack absolute block" style={{ left: "26%", top: "50%", width: "48%", height: "6%", animationDelay: `${delayMs + 520}ms` }}>
            <svg viewBox="0 0 48 6" className="block h-full w-full" aria-hidden="true">
              {[2, 8, 14, 20, 26, 32, 38, 44].map((x) => (
                <ellipse key={x} cx={x + 2} cy="3" rx="2.6" ry="1.7" fill="none" stroke="#8a94a8" strokeWidth="0.9" />
              ))}
            </svg>
          </span>
          <span
            className="gp-flash absolute block rounded-full"
            style={{ left: "45%", top: "48%", width: "10%", height: "8%", background: tint(p1, 0.9), animationDelay: `${delayMs + 1000}ms` }}
          />
          {[
            { dx: "-240%", dy: "-120%", rot: "-80deg" },
            { dx: "260%", dy: "-90%", rot: "70deg" },
          ].map((v, i) => (
            <span
              key={i}
              className="gp-spark absolute block"
              style={{ left: `${43 + i * 8}%`, top: "50.5%", width: "7%", height: "4.5%", "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + 1040}ms` } as CSSProperties}
            >
              <svg viewBox="0 0 12 6" className="block h-full w-full" aria-hidden="true">
                <ellipse cx="3" cy="3" rx="2.4" ry="1.6" fill="none" stroke="#8a94a8" strokeWidth="0.9" />
                <ellipse cx="8.6" cy="3" rx="2.4" ry="1.6" fill="none" stroke="#8a94a8" strokeWidth="0.9" />
              </svg>
            </span>
          ))}
        </>
      )}
      {/* transcendence: the old burden drops off and the freed spirit climbs
          the god-fan, trailing risen motes. */}
      {flourish === "ascension" && (
        <>
          <span
            className="gp-tinkle absolute block"
            style={{ left: "46%", top: "52%", width: "5%", height: "6%", "--dx": "-50%", animationDelay: `${delayMs + 640}ms` } as CSSProperties}
          >
            <svg viewBox="0 0 8 8" className="block h-full w-full" aria-hidden="true">
              <path d="M2 3 V2.2 A2 2 0 0 1 6 2.2 V3" fill="none" stroke="#3a3a40" strokeWidth="0.9" strokeLinecap="round" />
              <rect x="1.2" y="3" width="5.6" height="4" rx="0.6" fill="#5c5c63" stroke="#2c2c32" strokeWidth="0.5" />
            </svg>
          </span>
          <span className="gp-updrift absolute block" style={{ left: "45%", top: "34%", width: "10%", height: "14%", animationDelay: `${delayMs + 800}ms` }}>
            <Sil d={SIL.p} fill={tint(p2, 0.9)} stroke={p0} />
          </span>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="gp-updrift absolute block rounded-full"
              style={{ left: `${43 + i * 5}%`, top: `${46 - i * 3}%`, width: "2%", height: "2%", background: tint(i === 1 ? p1 : p0, 0.9), "--dx": i % 2 ? "70%" : "-60%", animationDelay: `${delayMs + 940 + i * 130}ms` } as CSSProperties}
            />
          ))}
        </>
      )}
      {/* mind_empire: the third eye's beam pins one piece below — it dims,
          then re-lights in the empire's colours. */}
      {flourish === "mind_seize" && (
        <>
          <span className="absolute block" style={{ left: "47.5%", top: "24%", width: "5%", height: "30%" }}>
            <span
              className="gp-ray absolute inset-0 block"
              style={{ background: `linear-gradient(180deg, ${tint(p0, 0.9)}, ${tint(p1, 0.35)} 70%, transparent)`, animationDelay: `${delayMs + 620}ms` }}
            />
          </span>
          <span className="gp-snooze absolute block" style={{ left: "46%", top: "50%", width: "8%", height: "12%", animationDelay: `${delayMs + 560}ms` }}>
            <Sil d={SIL.n} fill="#2b1218" stroke={tint(p1, 0.7)} />
          </span>
          <span className="gp-pop absolute block" style={{ left: "46%", top: "50%", width: "8%", height: "12%", animationDelay: `${delayMs + 1150}ms` }}>
            <Sil d={SIL.n} fill={tint(p0, 0.9)} stroke={p2} />
          </span>
          <span
            className="gp-gaze absolute block rounded-full"
            style={{ left: "44%", top: "52%", width: "12%", height: "9%", border: `2.5px solid ${tint(p0, 0.85)}`, animationDelay: `${delayMs + 1200}ms` }}
          />
        </>
      )}
      {/* mass_mind_control: TWO thrall-beams fork out of the twin eyes and two
          pieces re-light in thrall colours at once. */}
      {flourish === "twin_thrall" && (
        <>
          {[
            { rot: "-24deg", l: 38 },
            { rot: "24deg", l: 58 },
          ].map((v, i) => (
            <span
              key={i}
              className="absolute block"
              style={{ left: `${v.l}%`, top: "24%", width: "4%", height: "30%", transform: `rotate(${v.rot})`, transformOrigin: "50% 0%" }}
            >
              <span
                className="gp-ray absolute inset-0 block"
                style={{ background: `linear-gradient(180deg, ${tint(p0, 0.9)}, ${tint(p2, 0.3)} 70%, transparent)`, animationDelay: `${delayMs + 620 + i * 110}ms` }}
              />
            </span>
          ))}
          {[
            { l: 30, d: 0, sil: SIL.b },
            { l: 62, d: 140, sil: SIL.r },
          ].map((v, i) => (
            <span key={`t${i}`} className="gp-pop absolute block" style={{ left: `${v.l}%`, top: "50%", width: "8%", height: "12%", animationDelay: `${delayMs + 1060 + v.d}ms` }}>
              <Sil d={v.sil} fill={tint(p0, 0.9)} stroke={p2} />
            </span>
          ))}
          <span
            className="gp-flash absolute block rounded-full"
            style={{ left: "44%", top: "26%", width: "12%", height: "8%", background: tint(p2, 0.6), animationDelay: `${delayMs + 1000}ms` }}
          />
        </>
      )}
      {/* throne_and_silence: the court bell drops in mid-peal and the veil of
          silence slices its rising sound-arcs flat. */}
      {flourish === "hush_veil" && (
        <>
          <span className="gp-capdrop absolute block" style={{ left: "42%", top: "34%", width: "16%", height: "16%", animationDelay: `${delayMs + 600}ms` }}>
            <svg viewBox="0 0 12 12" className="block h-full w-full" aria-hidden="true">
              <path d="M6 1.6 C8.4 1.6 9.2 4 9.2 6.8 L10.2 8.6 H1.8 L2.8 6.8 C2.8 4 3.6 1.6 6 1.6 Z" fill={tint(p1, 0.92)} stroke={p0} strokeWidth="0.6" {...SJ} />
              <circle cx="6" cy="9.8" r="0.8" fill={p2} stroke={p0} strokeWidth="0.4" />
            </svg>
          </span>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="gp-updrift absolute block"
              style={{ left: `${57 + i * 3}%`, top: `${36 - i * 2}%`, width: "3.4%", height: "4.6%", "--dx": "60%", animationDelay: `${delayMs + 780 + i * 120}ms` } as CSSProperties}
            >
              <svg viewBox="0 0 5 7" className="block h-full w-full" aria-hidden="true">
                <path d="M1 1 C3 2.6 3 4.4 1 6" fill="none" stroke={tint(p2, 0.9)} strokeWidth="0.8" strokeLinecap="round" />
              </svg>
            </span>
          ))}
          <span
            className="gp-pane absolute block"
            style={{ left: "30%", top: "39.5%", width: "42%", height: "1.6%", background: `linear-gradient(90deg, ${tint(p0, 0.95)}, ${tint(p2, 0.6)})`, animationDelay: `${delayMs + 1150}ms` }}
          />
        </>
      )}
      {/* abdication_edict: the throne is left standing empty as the crown
          tumbles off it and lands upside-down in the dust. */}
      {flourish === "crown_topple" && (
        <>
          <span className="gp-snooze absolute block" style={{ left: "44%", top: "42%", width: "12%", height: "18%", animationDelay: `${delayMs + 560}ms` }}>
            <svg viewBox="0 0 10 14" className="block h-full w-full" aria-hidden="true">
              <path d="M2 13 V2.4 L3.2 3.6 V8 H6.8 V3.6 L8 2.4 V13 H6.6 V10 H3.4 V13 Z" fill={tint(p2, 0.95)} stroke={tint(p1, 0.6)} strokeWidth="0.5" {...SJ} />
            </svg>
          </span>
          <span
            className="gp-lob absolute block"
            style={{ left: "49%", top: "42%", width: "6.5%", height: "5.5%", "--dx": "260%", "--dy": "-160%", "--rot": "200deg", animationDelay: `${delayMs + 760}ms` } as CSSProperties}
          >
            <svg viewBox="0 0 10 8" className="block h-full w-full" aria-hidden="true">
              <path d="M1.4 7 V1.6 L3.5 3.6 L5 0.8 L6.5 3.6 L8.6 1.6 V7 Z" fill={p1} stroke={p2} strokeWidth="0.5" {...SJ} />
            </svg>
          </span>
          <span className="gp-crack absolute block" style={{ left: "63%", top: "56%", width: "7%", height: "5.5%", animationDelay: `${delayMs + 1360}ms` }}>
            <svg viewBox="0 0 10 8" className="block h-full w-full" aria-hidden="true">
              <path d="M1.4 7 V1.6 L3.5 3.6 L5 0.8 L6.5 3.6 L8.6 1.6 V7 Z" transform="rotate(180 5 4)" fill={tint(p1, 0.9)} stroke={p2} strokeWidth="0.5" {...SJ} />
            </svg>
          </span>
          <Sparks delayMs={delayMs + 1380} fill={p1} stroke={p2} sizePct={3.5} cx={66} cy={60} />
        </>
      )}
      {/* wa_dominate_major: the marionette control-bar lowers, strings drop,
          and the seized rook rises dangling on them. */}
      {flourish === "puppet_strings" && (
        <>
          <span className="gp-capdrop absolute block" style={{ left: "40%", top: "30%", width: "20%", height: "6%", animationDelay: `${delayMs + 640}ms` }}>
            <svg viewBox="0 0 20 6" className="block h-full w-full" aria-hidden="true">
              <path d="M2 3 H18 M10 0.8 V5.2" stroke={p2} strokeWidth="1" strokeLinecap="round" />
              <circle cx="10" cy="3" r="1.1" fill={p1} />
            </svg>
          </span>
          <span className="gp-drape absolute block" style={{ left: "43%", top: "35%", width: "14%", height: "16%", animationDelay: `${delayMs + 860}ms` }}>
            <svg viewBox="0 0 14 16" className="block h-full w-full" aria-hidden="true">
              <path d="M2 0 V15 M7 0 V16 M12 0 V15" stroke={tint(p2, 0.8)} strokeWidth="0.5" />
            </svg>
          </span>
          <span className="gp-pop absolute block" style={{ left: "45.5%", top: "48%", width: "9%", height: "13%", animationDelay: `${delayMs + 1060}ms` }}>
            <Sil d={SIL.r} fill={tint(p0, 0.9)} stroke={p1} />
          </span>
        </>
      )}
      <Glint delayMs={delayMs + 1050} color={p1} />
      <Settle hex={p1} delayMs={delayMs + 1000} cy={58} />
    </Stage>
  );
}

/* =============================================================================
   Template 2: TitanRise — a colossal stone titan shoulders up from below the
   board amid rubble arcs, the glyph branded on its torso.
   ========================================================================== */
function TitanRise({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.26)} delayMs={delayMs} />
      <Tell hex={p1} delayMs={delayMs} cy={60} />
      {/* rubble kicked up as the ground splits */}
      <Lobs delayMs={delayMs + 120} fill={tint(p0, 0.95)} stroke={p2} />
      {/* the titan shouldering up from below */}
      <span className="gp-rise absolute block" style={{ left: "32%", top: "20%", width: "36%", height: "56%", animationDelay: `${delayMs + 160}ms` }}>
        <svg viewBox="0 0 36 44" className="block h-full w-full" aria-hidden="true">
          {/* blocky head, eyes lit */}
          <path d="M14.5 9 L15 3.5 H21 L21.5 9 Z" fill={tint(p0, 0.92)} stroke={p2} strokeWidth="1" {...SJ} />
          <path d="M15.8 5.6 H17.2 M18.8 5.6 H20.2" stroke={p1} strokeWidth="0.9" strokeLinecap="round" />
          {/* massive shoulders + torso */}
          <path d="M4 44 L5 22 L9 14 L15 11 H21 L27 14 L31 22 L32 44 Z" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="1.2" {...SJ} />
          {/* arms braced against the rim */}
          <path d="M5 22 L2 34 L6 36 L9 26 M31 22 L34 34 L30 36 L27 26" fill={tint(p0, 0.85)} stroke={p2} strokeWidth="1" {...SJ} />
          {/* cracks glowing with the card's power */}
          <path d="M12 20 L14 26 L11 32 M24 18 L22 26 L25 33" stroke={tint(p1, 0.8)} strokeWidth="0.8" fill="none" {...SJ} />
        </svg>
        {/* the card's glyph, branded on the torso */}
        <span className="absolute block" style={{ left: "36%", top: "42%", width: "28%", height: "22%" }}>{glyph}</span>
      </span>
      {/* ground-strike flare + sparks + earth-shock rings */}
      <span
        className="gp-flash absolute block rounded-full"
        style={{ left: "34%", top: "62%", width: "32%", height: "16%", background: tint(p1, 0.75), animationDelay: `${delayMs + 600}ms` }}
      />
      <Sparks delayMs={delayMs + 640} fill={p1} stroke={p2} sizePct={8} cy={62} />
      <Boom delayMs={delayMs + 680} color={tint(p1, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 800} color={tint(p0, 0.8)} />
      {/* --- per-card flourishes ------------------------------------------- */}
      {/* great_divide: one full rank turns to a crenellated stone wall that
          rises board-wide and seals with a glowing seam. */}
      {flourish === "rank_wall" && (
        <>
          <span className="gp-rise absolute block" style={{ left: "14%", top: "47%", width: "72%", height: "9%", animationDelay: `${delayMs + 780}ms` }}>
            <svg viewBox="0 0 72 9" className="block h-full w-full" aria-hidden="true">
              <path
                d="M0 9 V2 H4 V0 H8 V2 H14 V0 H18 V2 H24 V0 H28 V2 H34 V0 H38 V2 H44 V0 H48 V2 H54 V0 H58 V2 H64 V0 H68 V2 H72 V9 Z"
                fill={tint(p0, 0.95)}
                stroke={p1}
                strokeWidth="0.6"
                {...SJ}
              />
              <path d="M6 5 H16 M22 7 H32 M40 5 H50 M56 7 H66" stroke={tint(p1, 0.8)} strokeWidth="0.5" />
            </svg>
          </span>
          <span
            className="gp-seal absolute block"
            style={{ left: "14%", top: "55.5%", width: "72%", height: "1.2%", background: `linear-gradient(90deg, transparent, ${tint(p2, 0.9)} 25%, ${tint(p2, 0.9)} 75%, transparent)`, animationDelay: `${delayMs + 1060}ms` }}
          />
          <Sparks delayMs={delayMs + 1000} fill={p2} stroke={p1} sizePct={4} cx={22} cy={54} />
        </>
      )}
      {/* sundering: three jagged fissures split the board top to bottom —
          three whole files torn out of play. */}
      {flourish === "triple_rift" && (
        <>
          {[30, 48, 66].map((l, i) => (
            <span key={i} className="gp-drape absolute block" style={{ left: `${l}%`, top: "22%", width: "4%", height: "54%", animationDelay: `${delayMs + 720 + i * 160}ms` }}>
              <svg viewBox="0 0 4 54" className="block h-full w-full" aria-hidden="true">
                <path d="M2 0 L1.2 9 L2.8 17 L1.4 26 L2.6 35 L1.2 44 L2.2 54" fill="none" stroke={tint(p1, 0.9)} strokeWidth="1" {...SJ} />
                <path d="M2 2 L2.6 10 L1.4 19 L2.6 28 L1.6 38 L2.4 47" fill="none" stroke={tint(p2, 0.5)} strokeWidth="0.4" />
              </svg>
            </span>
          ))}
          {[32, 50, 68].map((l, i) => (
            <Glint key={`g${i}`} delayMs={delayMs + 1050 + i * 160} color={p1} left={l} top={30 + i * 8} sizePct={4} />
          ))}
        </>
      )}
      {/* fortress_realm: battlement walls snap up around the chosen 3x3 zone,
          a keep tower clicking into each corner. */}
      {flourish === "keep_walls" && (
        <>
          <span className="gp-crack absolute block" style={{ left: "35%", top: "36%", width: "30%", height: "30%", animationDelay: `${delayMs + 760}ms` }}>
            <svg viewBox="0 0 30 30" className="block h-full w-full" aria-hidden="true">
              <rect x="1.5" y="1.5" width="27" height="27" fill={tint(p1, 0.12)} stroke={tint(p1, 0.95)} strokeWidth="1.2" />
              <rect x="4.5" y="4.5" width="21" height="21" fill="none" stroke={tint(p2, 0.7)} strokeWidth="0.5" strokeDasharray="2 1.4" />
            </svg>
          </span>
          {[
            { l: 33, t: 34 },
            { l: 62, t: 34 },
            { l: 33, t: 62 },
            { l: 62, t: 62 },
          ].map((v, i) => (
            <span key={i} className="gp-pod absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "5%", height: "6.5%", animationDelay: `${delayMs + 900 + i * 90}ms` }}>
              <svg viewBox="0 0 5 7" className="block h-full w-full" aria-hidden="true">
                <path d="M0.8 7 V2 H1.8 V1 H2.2 V2 H2.8 V1 H3.2 V2 H4.2 V7 Z" fill={tint(p0, 0.95)} stroke={p2} strokeWidth="0.4" {...SJ} />
              </svg>
            </span>
          ))}
        </>
      )}
      {/* molten_heart: lava veins spider out from the titan's chest and the
          heart beats twice, coughing up embers — whatever the fire takes, it
          keeps. */}
      {flourish === "magma_veins" && (
        <>
          <span className="gp-crack absolute block" style={{ left: "28%", top: "40%", width: "44%", height: "28%", animationDelay: `${delayMs + 700}ms` }}>
            <svg viewBox="0 0 44 28" className="block h-full w-full" aria-hidden="true">
              <path
                d="M22 14 L14 10 L6 12 M22 14 L30 9 L38 11 M22 14 L16 21 L8 24 M22 14 L29 20 L37 24 M22 14 L21 6 M22 14 L24 23"
                fill="none"
                stroke={tint(p0, 0.9)}
                strokeWidth="1.1"
                {...SJ}
              />
            </svg>
          </span>
          <span
            className="gp-flash absolute block rounded-full"
            style={{ left: "45%", top: "48%", width: "10%", height: "8%", background: tint(p0, 0.85), animationDelay: `${delayMs + 860}ms` }}
          />
          <span
            className="gp-flash absolute block rounded-full"
            style={{ left: "44%", top: "47%", width: "12%", height: "10%", background: tint(p1, 0.75), animationDelay: `${delayMs + 1140}ms` }}
          />
          {[40, 50, 60].map((l, i) => (
            <span
              key={i}
              className="gp-updrift absolute block rounded-full"
              style={{ left: `${l}%`, top: "46%", width: "1.8%", height: "1.8%", background: i % 2 ? "#ffd166" : p0, "--dx": i % 2 ? "60%" : "-50%", animationDelay: `${delayMs + 1100 + i * 140}ms` } as CSSProperties}
            />
          ))}
        </>
      )}
      <Glint delayMs={delayMs + 1080} color={p1} left={48} top={22} />
      <Settle hex={p1} delayMs={delayMs + 1060} cy={62} />
    </Stage>
  );
}

/* =============================================================================
   Template 3: SkyWrath — a storm-god torso manifests in a cloud bank at the
   top of the sky and hurls a jagged bolt down to a central strike flash.
   ========================================================================== */
function SkyWrath({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.25)} delayMs={delayMs} />
      <Tell hex={p2} delayMs={delayMs} cy={60} />
      {/* the cloud bank + storm-god torso, boiling in at the top */}
      <span className="gp-descend absolute block" style={{ left: "16%", top: "9%", width: "68%", height: "32%", animationDelay: `${delayMs + 100}ms` }}>
        <svg viewBox="0 0 48 22" className="block h-full w-full" aria-hidden="true">
          {/* storm halo */}
          <circle cx="24" cy="8" r="7.4" fill="none" stroke={tint(p2, 0.9)} strokeWidth="1.2" />
          {/* cloud bank */}
          <path
            d="M2 19 Q4 11 10 13 Q12 5 19 8 Q25 1 31 7 Q40 4 42 12 Q47 14 46 19 Z"
            fill={tint(p1, 0.85)}
            stroke={tint(p2, 0.8)}
            strokeWidth="1"
            {...SJ}
          />
          {/* the god's shoulders + head, rising out of the bank */}
          <path d="M15 19 C16.5 11.5 20 9.6 24 9.6 C28 9.6 31.5 11.5 33 19 Z" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="0.8" {...SJ} />
          <circle cx="24" cy="8.4" r="3.4" fill={tint(p0, 0.92)} stroke={p2} strokeWidth="0.7" />
          {/* the hurling arm */}
          <path d="M32 12.5 L41.5 6.5" stroke={tint(p0, 0.9)} strokeWidth="2.6" strokeLinecap="round" />
        </svg>
        {/* the card's glyph, set inside the storm halo */}
        <span className="absolute block" style={{ left: "45%", top: "3%", width: "10%", height: "24%" }}>{glyph}</span>
      </span>
      {/* the jagged bolt, cracking down to the board centre */}
      <span className="gp-bolt absolute block" style={{ left: "43%", top: "30%", width: "14%", height: "36%", animationDelay: `${delayMs + 480}ms` }}>
        <svg viewBox="0 0 12 32" className="block h-full w-full" aria-hidden="true">
          <path
            d="M7 0 L3 12 L6.4 13 L2 24 L5.5 24.8 L3.4 32 L10 18 L6.4 17 L10.5 6 L7.6 5.4 L9 0 Z"
            fill={p2}
            stroke={tint(p2, 0.6)}
            strokeWidth="0.5"
            {...SJ}
          />
        </svg>
      </span>
      {/* strike flash + sparks + thunder-shock rings */}
      <span
        className="gp-flash absolute block rounded-full"
        style={{ left: "37%", top: "56%", width: "26%", height: "16%", background: tint(p2, 0.85), animationDelay: `${delayMs + 620}ms` }}
      />
      <Sparks delayMs={delayMs + 660} fill={p2} stroke={p1} sizePct={8} cy={62} />
      <Boom delayMs={delayMs + 700} color={tint(p2, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 820} color={tint(p0, 0.8)} />
      {/* --- per-card flourishes ------------------------------------------- */}
      {/* scorched_earth: the strike leaves a burning killing-field — a charred
          band sears across the middle ranks, flame licks stand up out of it,
          and char flecks patter down. */}
      {flourish === "firefield" && (
        <>
          <span
            className="gp-pane absolute block"
            style={{
              left: "14%",
              top: "44%",
              width: "72%",
              height: "12%",
              background: `linear-gradient(90deg, ${tint(p0, 0.65)}, ${tint(p1, 0.55)} 55%, ${tint(p0, 0.4)} 85%, transparent)`,
              animationDelay: `${delayMs + 720}ms`,
              animationDuration: "1.1s",
            }}
          />
          {[22, 38, 54, 70].map((l, i) => (
            <span
              key={i}
              className="gp-updrift absolute block"
              style={{ left: `${l}%`, top: "46%", width: "4%", height: "6%", "--dx": i % 2 ? "50%" : "-40%", animationDelay: `${delayMs + 900 + i * 110}ms` } as CSSProperties}
            >
              <svg viewBox="0 0 6 9" className="block h-full w-full" aria-hidden="true">
                <path
                  d="M3 0.6 C4.4 2.4 5.2 3.8 5.2 5.8 C5.2 7.6 4.2 8.6 3 8.6 C1.8 8.6 0.8 7.6 0.8 5.8 C0.8 4.6 1.4 3.6 2 2.8 C2 3.8 2.5 4.4 3 4.6 C2.7 3.2 2.7 1.8 3 0.6 Z"
                  fill={p2}
                  stroke={p1}
                  strokeWidth="0.4"
                  {...SJ}
                />
              </svg>
            </span>
          ))}
          {[30, 48, 64].map((l, i) => (
            <span
              key={`c${i}`}
              className="gp-tinkle absolute block rounded-full"
              style={{ left: `${l}%`, top: "42%", width: "1.4%", height: "1.4%", background: tint(p1, 0.9), "--dx": i % 2 ? "50%" : "-50%", animationDelay: `${delayMs + 1250 + i * 120}ms` } as CSSProperties}
            />
          ))}
        </>
      )}
      {/* queen_storm: three pawns stand into the storm, a crown drops onto
          each, and each flashes into a queen. */}
      {flourish === "crown_rain" && (
        <>
          {[34, 47, 60].map((l, i) => (
            <span key={i} className="gp-snooze absolute block" style={{ left: `${l}%`, top: "48%", width: "7%", height: "11%", animationDelay: `${delayMs + 560 + i * 90}ms` }}>
              <Sil d={SIL.p} fill={tint(p2, 0.9)} stroke={p1} />
            </span>
          ))}
          {[34.8, 47.8, 60.8].map((l, i) => (
            <span key={`c${i}`} className="gp-capdrop absolute block" style={{ left: `${l}%`, top: "45.5%", width: "5.4%", height: "4.2%", animationDelay: `${delayMs + 800 + i * 130}ms` }}>
              <svg viewBox="0 0 10 8" className="block h-full w-full" aria-hidden="true">
                <path d="M1.4 7 V1.6 L3.5 3.6 L5 0.8 L6.5 3.6 L8.6 1.6 V7 Z" fill={p0} stroke={p1} strokeWidth="0.5" {...SJ} />
              </svg>
            </span>
          ))}
          {[34, 47, 60].map((l, i) => (
            <span key={`q${i}`} className="gp-pop absolute block" style={{ left: `${l}%`, top: "47%", width: "7%", height: "12%", animationDelay: `${delayMs + 1150 + i * 130}ms` }}>
              <Sil d={SIL.q} fill={tint(p0, 0.95)} stroke={p1} />
            </span>
          ))}
        </>
      )}
      <Glint delayMs={delayMs + 1080} color={p2} left={47} top={48} />
      <Settle hex={p2} delayMs={delayMs + 1080} cy={60} />
    </Stage>
  );
}

/* =============================================================================
   Template 4: AbyssMaw — darkness wash; a vast void maw opens across the
   board centre with tendrils; motes get pulled in; the glyph glows in the maw.
   ========================================================================== */
const MOTES = [
  { dx: "-420%", dy: "-260%", d: 0, l: 47 },
  { dx: "380%", dy: "-300%", d: 40, l: 52 },
  { dx: "-340%", dy: "240%", d: 80, l: 48 },
  { dx: "420%", dy: "200%", d: 20, l: 51 },
  { dx: "60%", dy: "-420%", d: 60, l: 50 },
  { dx: "-120%", dy: "400%", d: 100, l: 49 },
];
function AbyssMaw({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      {/* gathering darkness instead of light */}
      <Wash color={tint(p2, 0.42)} delayMs={delayMs} />
      <Tell hex={p1} delayMs={delayMs} cy={46} />
      {/* the vast void maw, yawning open mid-board */}
      <span className="gp-maw absolute block" style={{ left: "29%", top: "32%", width: "42%", height: "29%", animationDelay: `${delayMs + 150}ms` }}>
        <svg viewBox="0 0 44 26" className="block h-full w-full" aria-hidden="true">
          {/* tendrils reaching out of the rift */}
          <path
            d="M6 13 C2 10 2 6 4 2 M38 13 C42 10 42 6 40 2 M8 18 C4 21 3 23 4 26 M36 18 C40 21 41 23 40 26"
            stroke={tint(p1, 0.7)}
            strokeWidth="1"
            fill="none"
            {...SJ}
          />
          {/* the maw itself */}
          <path d="M4 13 C12 3 32 3 40 13 C32 23 12 23 4 13 Z" fill={tint(p2, 0.95)} stroke={p1} strokeWidth="1.2" {...SJ} />
          {/* inner glow ring + heart-glow behind the glyph */}
          <ellipse cx="22" cy="13" rx="8.5" ry="6" fill="none" stroke={tint(p0, 0.75)} strokeWidth="0.8" />
          <circle cx="22" cy="13" r="4.5" fill={tint(p0, 0.3)} />
        </svg>
        {/* the card's glyph, glowing in the maw */}
        <span className="absolute block" style={{ left: "41%", top: "32%", width: "18%", height: "36%" }}>{glyph}</span>
      </span>
      {/* motes dragged in from all over the board */}
      {MOTES.map((v, i) => (
        <span
          key={i}
          className="gp-mote absolute block rounded-full"
          style={
            {
              left: `${v.l}%`,
              top: "44%",
              width: "3.2%",
              height: "3.2%",
              background: tint(p0, 0.9),
              "--dx": v.dx,
              "--dy": v.dy,
              animationDelay: `${delayMs + 260 + v.d}ms`,
            } as CSSProperties
          }
        />
      ))}
      {/* implosion pulse + inverse shockwaves */}
      <span
        className="gp-flash absolute block rounded-full"
        style={{ left: "40%", top: "42%", width: "20%", height: "13%", background: tint(p1, 0.7), animationDelay: `${delayMs + 700}ms` }}
      />
      <Sparks delayMs={delayMs + 740} fill={p0} stroke={p1} sizePct={6.5} cy={47} />
      <Boom delayMs={delayMs + 780} color={tint(p1, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 900} color={tint(p0, 0.8)} />
      {/* --- per-card flourishes ------------------------------------------- */}
      {/* grand_nullify: the opponent's hanging buff-sigils are each slashed
          through, and their dead husks are dragged down into the maw. */}
      {flourish === "sigil_snuff" && (
        <>
          {[
            { l: 34, t: 26 },
            { l: 48, t: 22 },
            { l: 62, t: 27 },
          ].map((v, i) => (
            <span key={i} className="gp-crack absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "5.5%", height: "5.5%", animationDelay: `${delayMs + 380 + i * 110}ms` }}>
              <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
                <path d="M5 0.8 L9.2 5 L5 9.2 L0.8 5 Z" fill={tint(p1, 0.25)} stroke={tint(p1, 0.9)} strokeWidth="0.7" {...SJ} />
                <path d="M2.6 7.4 L7.4 2.6" stroke={p0} strokeWidth="0.9" strokeLinecap="round" />
              </svg>
            </span>
          ))}
          {[
            { dx: "-260%", dy: "-330%" },
            { dx: "-30%", dy: "-420%" },
            { dx: "230%", dy: "-310%" },
          ].map((v, i) => (
            <span
              key={`m${i}`}
              className="gp-mote absolute block"
              style={{ left: "48.5%", top: "44%", width: "3%", height: "3%", "--dx": v.dx, "--dy": v.dy, animationDelay: `${delayMs + 900 + i * 120}ms` } as CSSProperties}
            >
              <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
                <path d="M5 0.8 L9.2 5 L5 9.2 L0.8 5 Z" fill={tint(p0, 0.7)} stroke={tint(p1, 0.6)} strokeWidth="0.6" />
              </svg>
            </span>
          ))}
        </>
      )}
      {/* absolute_nullify: a second slashed void-ring clamps down over the
          maw — and the maw spits a single reroll die back out in payment. */}
      {flourish === "double_void" && (
        <>
          <span className="gp-ringset absolute block" style={{ left: "30%", top: "30%", width: "40%", height: "33%", animationDelay: `${delayMs + 480}ms` }}>
            <svg viewBox="0 0 40 33" className="block h-full w-full" aria-hidden="true">
              <ellipse cx="20" cy="16.5" rx="18" ry="14" fill="none" stroke={tint(p1, 0.9)} strokeWidth="1.1" strokeDasharray="4 2.6" />
              <path d="M8 27 L32 6" stroke={tint(p2, 0.8)} strokeWidth="1.1" strokeLinecap="round" />
            </svg>
          </span>
          <span
            className="gp-spark absolute block"
            style={{ left: "47.5%", top: "42%", width: "4.5%", height: "4.5%", "--dx": "120%", "--dy": "-380%", "--rot": "200deg", animationDelay: `${delayMs + 1000}ms`, animationDuration: "0.9s" } as CSSProperties}
          >
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <rect x="1" y="1" width="8" height="8" rx="1.6" fill="#fff7de" stroke={p0} strokeWidth="0.6" />
              <circle cx="3.4" cy="3.4" r="0.8" fill={p0} />
              <circle cx="6.6" cy="6.6" r="0.8" fill={p0} />
              <circle cx="6.6" cy="3.4" r="0.8" fill={p0} />
            </svg>
          </span>
          <Glint delayMs={delayMs + 1500} color={p2} left={57} top={26} sizePct={4} />
        </>
      )}
      <Glint delayMs={delayMs + 1140} color={p0} left={47} top={42} />
      <Settle hex={p1} delayMs={delayMs + 1150} cy={47} />
    </Stage>
  );
}

/* =============================================================================
   Template 5: ReaperSweep — a colossal hooded reaper strides across the whole
   crop sweeping a scythe arc; the glyph hangs as its lantern/pendant.
   ========================================================================== */
function ReaperSweep({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.3)} delayMs={delayMs} />
      <Tell hex={p1} delayMs={delayMs} cy={58} />
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
      {/* harvest flare + sparks + graven shockwaves */}
      <span
        className="gp-flash absolute block rounded-full"
        style={{ left: "36%", top: "58%", width: "28%", height: "16%", background: tint(p1, 0.7), animationDelay: `${delayMs + 720}ms` }}
      />
      <Sparks delayMs={delayMs + 760} fill={p1} stroke={p0} sizePct={6.5} cy={61} />
      <Boom delayMs={delayMs + 800} color={tint(p1, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 920} color={tint(p0, 0.8)} />
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
      {/* grand_malediction: a dashed curse-circle inscribes flat on the crop,
          and the card they would draft next arrives already hexed. */}
      {flourish === "hex_seal" && (
        <>
          <span className="gp-ringset absolute block" style={{ left: "33%", top: "36%", width: "34%", height: "28%", animationDelay: `${delayMs + 520}ms` }}>
            <svg viewBox="0 0 34 28" className="block h-full w-full" aria-hidden="true">
              <ellipse cx="17" cy="14" rx="15" ry="11.5" fill="none" stroke={tint(p1, 0.9)} strokeWidth="0.9" strokeDasharray="3 2" />
              <path d="M17 4.5 L25.5 19 H8.5 Z" fill="none" stroke={tint(p1, 0.8)} strokeWidth="0.7" {...SJ} />
              <path d="M17 23.5 L8.5 9 H25.5 Z" fill="none" stroke={tint(p0, 0.8)} strokeWidth="0.7" {...SJ} />
            </svg>
          </span>
          <span className="gp-capdrop absolute block" style={{ left: "46.5%", top: "20%", width: "7%", height: "9.5%", animationDelay: `${delayMs + 1050}ms` }}>
            <svg viewBox="0 0 7 9" className="block h-full w-full" aria-hidden="true">
              <rect x="0.5" y="0.5" width="6" height="8" rx="0.7" fill={tint(p2, 0.95)} stroke={p1} strokeWidth="0.5" />
              <path d="M3.5 2 L4.2 3.6 L5.8 3.8 L4.6 4.9 L4.9 6.5 L3.5 5.7 L2.1 6.5 L2.4 4.9 L1.2 3.8 L2.8 3.6 Z" fill="none" stroke={tint(p1, 0.9)} strokeWidth="0.4" {...SJ} />
            </svg>
          </span>
          <span
            className="gp-flash absolute block rounded-full"
            style={{ left: "45%", top: "22%", width: "10%", height: "7%", background: tint(p1, 0.6), animationDelay: `${delayMs + 1350}ms` }}
          />
        </>
      )}
      {/* blighted_furrows: the crop itself dies — a row of wheat stalks wilts
          over in the scythe's wake and rot motes lift off the furrows. */}
      {flourish === "crop_rot" && (
        <>
          {[26, 40, 54, 68].map((l, i) => (
            <span
              key={i}
              className="gp-wilt absolute block"
              style={{ left: `${l}%`, top: "50%", width: "4.5%", height: "9%", transformOrigin: "30% 100%", animationDelay: `${delayMs + 700 + i * 150}ms` }}
            >
              <svg viewBox="0 0 6 12" className="block h-full w-full" aria-hidden="true">
                <path d="M3 12 C3.2 8 3.4 5 4.4 2" fill="none" stroke={p1} strokeWidth="0.7" strokeLinecap="round" />
                <ellipse cx="4.6" cy="2" rx="1" ry="0.6" transform="rotate(40 4.6 2)" fill={p0} stroke={p2} strokeWidth="0.3" />
                <ellipse cx="3.8" cy="3.6" rx="0.9" ry="0.5" transform="rotate(55 3.8 3.6)" fill={p0} stroke={p2} strokeWidth="0.3" />
              </svg>
            </span>
          ))}
          {[30, 46, 62].map((l, i) => (
            <span
              key={`r${i}`}
              className="gp-updrift absolute block rounded-full"
              style={{ left: `${l}%`, top: "52%", width: "1.6%", height: "1.6%", background: tint(p2, 0.9), "--dx": i % 2 ? "60%" : "-50%", animationDelay: `${delayMs + 1150 + i * 140}ms` } as CSSProperties}
            />
          ))}
        </>
      )}
      {/* poisoned_counsel: the counsel goblet tips and pours its venom out —
          and one sweetened gold mote drifts back toward your own tent. */}
      {flourish === "venom_pour" && (
        <>
          <span className="gp-wilt absolute block" style={{ left: "40%", top: "30%", width: "9%", height: "11%", transformOrigin: "80% 90%", animationDelay: `${delayMs + 560}ms` }}>
            <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
              <path d="M2 1 H8 L7.3 4.4 C7.1 5.8 6.1 6.6 5 6.6 C3.9 6.6 2.9 5.8 2.7 4.4 Z" fill={tint(p2, 0.9)} stroke={p1} strokeWidth="0.5" {...SJ} />
              <path d="M5 6.6 V9.4 M3.2 10.4 H6.8" stroke={p1} strokeWidth="0.5" strokeLinecap="round" />
              <path d="M2.6 1.8 H7.4" stroke={p0} strokeWidth="0.6" strokeLinecap="round" />
            </svg>
          </span>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="gp-tinkle absolute block rounded-full"
              style={{ left: `${49 + i * 1.6}%`, top: "36%", width: "1.4%", height: "1.9%", background: tint(p0, 0.95), "--dx": i % 2 ? "60%" : "20%", animationDelay: `${delayMs + 820 + i * 130}ms` } as CSSProperties}
            />
          ))}
          <span
            className="gp-updrift absolute block"
            style={{ left: "54%", top: "58%", width: "3.5%", height: "3.5%", "--dx": "80%", animationDelay: `${delayMs + 1300}ms` } as CSSProperties}
          >
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0 L6.1 3.9 L10 5 L6.1 6.1 L5 10 L3.9 6.1 L0 5 L3.9 3.9 Z" fill="#ffd76a" />
            </svg>
          </span>
        </>
      )}
      <Glint delayMs={delayMs + 1160} color={p1} left={44} top={20} />
      <Settle hex={p1} delayMs={delayMs + 1180} cy={61} />
    </Stage>
  );
}

/* =============================================================================
   Template 6: HostMarch — a heraldic war-host (spear rank + banners) marches
   across the board width behind a giant commander standard bearing the glyph.
   ========================================================================== */
function HostMarch({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.25)} delayMs={delayMs} />
      <Tell hex={p1} delayMs={delayMs} cy={62} />
      {/* the war-host, marching across the board width */}
      <span className="gp-march absolute block" style={{ left: "10%", top: "31%", width: "80%", height: "33%", animationDelay: `${delayMs + 100}ms` }}>
        <svg viewBox="0 0 64 26" className="block h-full w-full" aria-hidden="true">
          {/* spear rank */}
          <path d="M4 26 V8 M10 26 V6 M16 26 V9 M46 26 V7 M52 26 V9 M58 26 V8" stroke={tint(p2, 0.9)} strokeWidth="0.9" />
          <path
            d="M4 8 L3 5 L5 5 Z M10 6 L9 3 L11 3 Z M16 9 L15 6 L17 6 Z M46 7 L45 4 L47 4 Z M52 9 L51 6 L53 6 Z M58 8 L57 5 L59 5 Z"
            fill={p1}
            stroke={tint(p2, 0.8)}
            strokeWidth="0.4"
            {...SJ}
          />
          {/* flanking swallow-tail banners */}
          <path d="M15 26 V4 M49 26 V4" stroke={tint(p2, 0.9)} strokeWidth="0.9" />
          <path d="M15 4 H22 L20 7 L22 10 H15 Z M49 4 H42 L44 7 L42 10 H49 Z" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="0.5" {...SJ} />
          {/* the giant commander standard */}
          <path d="M32 26 V1" stroke={p2} strokeWidth="1.4" />
          <circle cx="32" cy="1.1" r="1.2" fill={p1} />
          <path d="M21 2.5 H43 V16 L32 20.5 L21 16 Z" fill={tint(p1, 0.9)} stroke={p2} strokeWidth="0.8" {...SJ} />
          {/* shield row at the host's feet */}
          <path
            d="M2 26 C6 22 10 22 14 26 M14 26 C18 22 22 22 26 26 M38 26 C42 22 46 22 50 26 M50 26 C54 22 58 22 62 26"
            fill={tint(p0, 0.85)}
            stroke={p2}
            strokeWidth="0.7"
          />
        </svg>
        {/* the card's glyph, borne on the commander standard */}
        <span className="absolute block" style={{ left: "38%", top: "13%", width: "24%", height: "48%" }}>{glyph}</span>
      </span>
      {/* dust kicked up by the march */}
      <Sparks delayMs={delayMs + 520} fill={p1} stroke={p2} sizePct={6.5} cx={44} cy={62} />
      {/* the host's war-cry: flare + shockwaves rolling past the edges */}
      <span
        className="gp-flash absolute block rounded-full"
        style={{ left: "40%", top: "40%", width: "22%", height: "15%", background: tint(p1, 0.7), animationDelay: `${delayMs + 820}ms` }}
      />
      <Boom delayMs={delayMs + 880} color={tint(p1, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 1000} color={tint(p0, 0.8)} />
      {/* --- per-card flourishes ------------------------------------------- */}
      {/* grand_retreat: the host does an about-face — knight, bishop and rook
          bob back the way they came while the home rank lights to receive
          them. */}
      {flourish === "about_face" && (
        <>
          {[
            { t: 46, d: 0, sil: SIL.n },
            { t: 53, d: 150, sil: SIL.b },
            { t: 60, d: 300, sil: SIL.r },
          ].map((v, i) => (
            <span key={i} className="absolute block" style={{ left: "34%", top: `${v.t}%`, width: "6%", height: "9%", transform: "scaleX(-1)" }}>
              <span className="gp-flee absolute inset-0 block" style={{ animationDelay: `${delayMs + 600 + v.d}ms` }}>
                <Sil d={v.sil} fill={tint(p0, 0.95)} stroke={p2} />
              </span>
            </span>
          ))}
          <span
            className="gp-seal absolute block"
            style={{
              left: "16%",
              top: "42%",
              width: "2%",
              height: "28%",
              background: `linear-gradient(180deg, transparent, ${tint(p2, 0.85)} 30%, ${tint(p2, 0.85)} 70%, transparent)`,
              animationDelay: `${delayMs + 1150}ms`,
            }}
          />
        </>
      )}
      {/* sacked_capital: the far capital burns behind the host — flames climb
          the tower, a battlement block topples off, smoke rolls away. */}
      {flourish === "city_burn" && (
        <>
          <span className="gp-snooze absolute block" style={{ left: "44%", top: "16%", width: "12%", height: "13%", animationDelay: `${delayMs + 480}ms` }}>
            <svg viewBox="0 0 12 13" className="block h-full w-full" aria-hidden="true">
              <path d="M2 13 V5 H3.2 V6 H4.4 V5 H5.6 V6 H6.8 V5 H8 V6 H9.2 V5 H10 V13 Z" fill={tint(p1, 0.96)} stroke={p2} strokeWidth="0.5" {...SJ} />
              <path d="M5 13 V10 H7 V13" fill={p2} />
            </svg>
          </span>
          {[45, 49.5, 53].map((l, i) => (
            <span
              key={i}
              className="gp-updrift absolute block"
              style={{ left: `${l}%`, top: "16%", width: "3.4%", height: "5%", "--dx": i % 2 ? "50%" : "-40%", animationDelay: `${delayMs + 700 + i * 160}ms` } as CSSProperties}
            >
              <svg viewBox="0 0 6 9" className="block h-full w-full" aria-hidden="true">
                <path
                  d="M3 0.6 C4.4 2.4 5.2 3.8 5.2 5.8 C5.2 7.6 4.2 8.6 3 8.6 C1.8 8.6 0.8 7.6 0.8 5.8 C0.8 4.6 1.4 3.6 2 2.8 C2 3.8 2.5 4.4 3 4.6 C2.7 3.2 2.7 1.8 3 0.6 Z"
                  fill={p0}
                  stroke={p2}
                  strokeWidth="0.4"
                  {...SJ}
                />
              </svg>
            </span>
          ))}
          <span
            className="gp-lob absolute block"
            style={{ left: "53%", top: "18%", width: "3.5%", height: "3.5%", "--dx": "220%", "--dy": "-140%", "--rot": "170deg", animationDelay: `${delayMs + 1050}ms` } as CSSProperties}
          >
            <svg viewBox="0 0 5 5" className="block h-full w-full" aria-hidden="true">
              <rect x="0.6" y="0.6" width="3.8" height="3.8" fill={tint(p1, 0.95)} stroke={p2} strokeWidth="0.4" />
            </svg>
          </span>
          {[46, 51].map((l, i) => (
            <span
              key={`s${i}`}
              className="gp-updrift absolute block rounded-full"
              style={{ left: `${l}%`, top: "14%", width: "2.2%", height: "2.2%", background: "rgba(90,90,100,0.75)", "--dx": i ? "80%" : "-60%", animationDelay: `${delayMs + 1200 + i * 180}ms` } as CSSProperties}
            />
          ))}
        </>
      )}
      <Glint delayMs={delayMs + 1200} color={p1} left={52} top={30} />
      <Settle hex={p1} delayMs={delayMs + 1260} cy={48} />
    </Stage>
  );
}

/* =============================================================================
   Template 7: CelestialRing — a vast rune ring descends flat over the board
   (settling out of the sky), constellation sparks, glyph as the centre sigil.
   ========================================================================== */
const STARS = [
  { l: 34, t: 30, d: 0 },
  { l: 64, t: 32, d: 70 },
  { l: 70, t: 56, d: 140 },
  { l: 30, t: 58, d: 210 },
  { l: 50, t: 24, d: 105 },
  { l: 50, t: 66, d: 175 },
];
function CelestialRing({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.25)} delayMs={delayMs} />
      <Tell hex={p1} delayMs={delayMs} cy={50} />
      {/* the vast rune ring, settling flat out of the sky */}
      <span className="gp-ringset absolute block" style={{ left: "20%", top: "20%", width: "60%", height: "60%", animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="17.5" fill="none" stroke={tint(p1, 0.9)} strokeWidth="1.3" />
          <circle cx="20" cy="20" r="14" fill="none" stroke={tint(p2, 0.7)} strokeWidth="0.6" strokeDasharray="2.6 1.7" />
          <circle cx="20" cy="20" r="9.5" fill="none" stroke={tint(p1, 0.55)} strokeWidth="0.5" />
          {/* rune ticks at the compass points */}
          <path
            d="M20 1.4 V4.2 M20 35.8 V38.6 M1.4 20 H4.2 M35.8 20 H38.6 M6.9 6.9 L8.9 8.9 M33.1 6.9 L31.1 8.9 M6.9 33.1 L8.9 31.1 M33.1 33.1 L31.1 31.1"
            stroke={tint(p1, 0.85)}
            strokeWidth="0.9"
            strokeLinecap="round"
          />
        </svg>
        {/* the card's glyph as the centre sigil */}
        <span className="absolute block" style={{ left: "34%", top: "34%", width: "32%", height: "32%" }}>{glyph}</span>
      </span>
      {/* constellation sparks lighting around the ring */}
      {STARS.map((s, i) => (
        <span key={i} className="gp-glint absolute block" style={{ left: `${s.l}%`, top: `${s.t}%`, width: "5%", height: "5%", animationDelay: `${delayMs + 420 + s.d}ms` }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0 L6.1 3.9 L10 5 L6.1 6.1 L5 10 L3.9 6.1 L0 5 L3.9 3.9 Z" fill={i % 2 ? p2 : p1} />
          </svg>
        </span>
      ))}
      {/* alignment pulse + shockwaves */}
      <span
        className="gp-flash absolute block rounded-full"
        style={{ left: "40%", top: "43%", width: "20%", height: "14%", background: tint(p1, 0.7), animationDelay: `${delayMs + 760}ms` }}
      />
      <Boom delayMs={delayMs + 820} color={tint(p1, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 940} color={tint(p2, 0.8)} />
      {/* --- per-card flourishes ------------------------------------------- */}
      {/* genesis: inside the ring the opening position re-forms — two fresh
          ranks click into place and the first green shoot of the new game
          springs up between them. */}
      {flourish === "board_reborn" && (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="gp-pod absolute block rounded-full"
              style={{ left: `${36 + i * 6}%`, top: "30%", width: "3%", height: "3%", background: tint(p2, 0.9), animationDelay: `${delayMs + 620 + i * 80}ms` }}
            />
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={`b${i}`}
              className="gp-pod absolute block rounded-full"
              style={{ left: `${36 + i * 6}%`, top: "66%", width: "3%", height: "3%", background: tint(p0, 0.9), animationDelay: `${delayMs + 660 + i * 80}ms` }}
            />
          ))}
          <span className="gp-pop absolute block" style={{ left: "46.5%", top: "44%", width: "7%", height: "10%", animationDelay: `${delayMs + 1150}ms` }}>
            <svg viewBox="0 0 8 11" className="block h-full w-full" aria-hidden="true">
              <path d="M4 10.6 V5" fill="none" stroke={p0} strokeWidth="0.8" strokeLinecap="round" />
              <path d="M4 5 C2.4 5 1.4 3.8 1.4 2.4 C3.2 2.6 4.2 3.8 4 5 Z M4 5 C5.6 5 6.6 3.8 6.6 2.4 C4.8 2.6 3.8 3.8 4 5 Z" fill={tint(p0, 0.95)} stroke={p2} strokeWidth="0.4" {...SJ} />
            </svg>
          </span>
        </>
      )}
      {/* reality_warp: two hex portals open under the ring; a pawn dims inside
          each and a queen steps out — matter rewritten in place. */}
      {flourish === "matter_rewrite" && (
        <>
          {[36, 56].map((l, i) => (
            <span key={i} className="gp-crack absolute block" style={{ left: `${l}%`, top: "38%", width: "9%", height: "13%", animationDelay: `${delayMs + 520 + i * 130}ms` }}>
              <svg viewBox="0 0 10 14" className="block h-full w-full" aria-hidden="true">
                <path d="M5 0.8 L9.2 4 V10 L5 13.2 L0.8 10 V4 Z" fill={tint(p0, 0.2)} stroke={tint(p1, 0.9)} strokeWidth="0.7" {...SJ} />
              </svg>
            </span>
          ))}
          {[36.8, 56.8].map((l, i) => (
            <span key={`p${i}`} className="gp-snooze absolute block" style={{ left: `${l}%`, top: "40%", width: "7.4%", height: "9.5%", animationDelay: `${delayMs + 640 + i * 130}ms` }}>
              <Sil d={SIL.p} fill={tint(p2, 0.9)} stroke={p0} />
            </span>
          ))}
          {[36.8, 56.8].map((l, i) => (
            <span key={`q${i}`} className="gp-pop absolute block" style={{ left: `${l}%`, top: "39%", width: "7.4%", height: "10.5%", animationDelay: `${delayMs + 1120 + i * 130}ms` }}>
              <Sil d={SIL.q} fill={tint(p1, 0.95)} stroke={p0} />
            </span>
          ))}
        </>
      )}
      {/* warp_cataclysm: four blink-portals snap open at the ring's compass
          points; motes streak out to each and re-light as arrival glints. */}
      {flourish === "quad_blink" && (
        <>
          {[
            { l: 47, t: 24 },
            { l: 70, t: 47 },
            { l: 47, t: 70 },
            { l: 24, t: 47 },
          ].map((v, i) => (
            <span
              key={i}
              className="gp-tring absolute block rounded-full"
              style={{ left: `${v.l}%`, top: `${v.t}%`, width: "6%", height: "6%", border: `2px solid ${tint(p1, 0.95)}`, animationDelay: `${delayMs + 560 + i * 110}ms` }}
            />
          ))}
          {[
            { dx: "0%", dy: "-320%" },
            { dx: "320%", dy: "0%" },
            { dx: "0%", dy: "320%" },
            { dx: "-320%", dy: "0%" },
          ].map((v, i) => (
            <span
              key={`d${i}`}
              className="gp-spark absolute block rounded-full"
              style={{ left: "48.75%", top: "48.75%", width: "2.5%", height: "2.5%", background: tint(p0, 0.95), "--dx": v.dx, "--dy": v.dy, "--rot": "0deg", animationDelay: `${delayMs + 620 + i * 110}ms`, animationDuration: "0.7s" } as CSSProperties}
            />
          ))}
          {[
            { l: 48.5, t: 25 },
            { l: 71.5, t: 48.5 },
            { l: 48.5, t: 71.5 },
            { l: 25, t: 48.5 },
          ].map((v, i) => (
            <span key={`g${i}`} className="gp-glint absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "3%", height: "3%", animationDelay: `${delayMs + 1150 + i * 110}ms` }}>
              <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
                <path d="M5 0 L6.1 3.9 L10 5 L6.1 6.1 L5 10 L3.9 6.1 L0 5 L3.9 3.9 Z" fill={p2} />
              </svg>
            </span>
          ))}
        </>
      )}
      {/* warp_sovereign: three pairs of crossing swap-arrows inscribe around
          the ring, a settle-dot marking each exchange as it lands. */}
      {flourish === "triple_swap" && (
        <>
          {[
            { l: 30, t: 30, d: 0 },
            { l: 52, t: 42, d: 180 },
            { l: 34, t: 56, d: 360 },
          ].map((v, i) => (
            <span key={i} className="gp-crack absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "14%", height: "10%", animationDelay: `${delayMs + 560 + v.d}ms` }}>
              <svg viewBox="0 0 14 10" className="block h-full w-full" aria-hidden="true">
                <path d="M2 7 C2 3 6 1.4 10.6 2" fill="none" stroke={tint(p1, 0.95)} strokeWidth="0.8" strokeLinecap="round" />
                <path d="M10 0.6 L12.4 2.2 L9.6 3.6 Z" fill={p1} />
                <path d="M12 3 C12 7 8 8.6 3.4 8" fill="none" stroke={tint(p0, 0.95)} strokeWidth="0.8" strokeLinecap="round" />
                <path d="M4 9.4 L1.6 7.8 L4.4 6.4 Z" fill={p0} />
              </svg>
            </span>
          ))}
          {[
            { l: 30, t: 32 },
            { l: 62, t: 44 },
            { l: 46, t: 62 },
          ].map((v, i) => (
            <span
              key={`d${i}`}
              className="gp-glint absolute block rounded-full"
              style={{ left: `${v.l}%`, top: `${v.t}%`, width: "2.4%", height: "2.4%", background: tint(p2, 0.95), animationDelay: `${delayMs + 900 + i * 180}ms` }}
            />
          ))}
        </>
      )}
      {/* nerf_reversal: the nerf-shackle cracks apart at the sigil and its
          bond re-forms inverted — a ward ring blooming around the army. */}
      {flourish === "polarity_flip" && (
        <>
          <span className="gp-crack absolute block" style={{ left: "43%", top: "40%", width: "14%", height: "14%", animationDelay: `${delayMs + 480}ms` }}>
            <svg viewBox="0 0 14 14" className="block h-full w-full" aria-hidden="true">
              <path d="M4.5 4 A4.4 4.4 0 1 0 10.6 4.6" fill="none" stroke={tint(p1, 0.95)} strokeWidth="1.3" strokeLinecap="round" />
              <path d="M5.2 2.6 L4 1 M11.4 3.2 L12.8 2 M12 5.4 L13.6 5.6" stroke={p2} strokeWidth="0.6" strokeLinecap="round" />
            </svg>
          </span>
          {[
            { dx: "-260%", dy: "-140%", rot: "-120deg" },
            { dx: "270%", dy: "-110%", rot: "130deg" },
          ].map((v, i) => (
            <span
              key={i}
              className="gp-spark absolute block"
              style={{ left: `${45 + i * 6}%`, top: "44%", width: "5%", height: "5%", "--dx": v.dx, "--dy": v.dy, "--rot": v.rot, animationDelay: `${delayMs + 980}ms` } as CSSProperties}
            >
              <svg viewBox="0 0 8 8" className="block h-full w-full" aria-hidden="true">
                <path d="M2 6 A3 3 0 0 1 6 2" fill="none" stroke={tint(p1, 0.9)} strokeWidth="1.1" strokeLinecap="round" />
              </svg>
            </span>
          ))}
          <span
            className="gp-gaze absolute block rounded-full"
            style={{ left: "34%", top: "34%", width: "32%", height: "27%", border: `3px solid ${tint(p0, 0.9)}`, animationDelay: `${delayMs + 1100}ms` }}
          />
          <Glint delayMs={delayMs + 1300} color={p0} left={47.5} top={44} sizePct={5} />
        </>
      )}
      {/* celestial_alignment: the stars chart the LIGHT squares — a checker of
          square panes kindles inside the ring and a frost-star seals each. */}
      {flourish === "starlock" && (
        <>
          {[
            { l: 36, t: 36 },
            { l: 50, t: 36 },
            { l: 43, t: 47 },
            { l: 36, t: 58 },
            { l: 50, t: 58 },
          ].map((v, i) => (
            <span key={i} className="gp-crack absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "7%", height: "7%", animationDelay: `${delayMs + 560 + i * 100}ms` }}>
              <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
                <rect x="0.8" y="0.8" width="8.4" height="8.4" fill={tint(p1, 0.3)} stroke={tint(p1, 0.9)} strokeWidth="0.5" />
              </svg>
            </span>
          ))}
          {[
            { l: 37.5, t: 37.5 },
            { l: 51.5, t: 37.5 },
            { l: 44.5, t: 48.5 },
            { l: 37.5, t: 59.5 },
            { l: 51.5, t: 59.5 },
          ].map((v, i) => (
            <span key={`s${i}`} className="gp-glint absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "4%", height: "4%", animationDelay: `${delayMs + 900 + i * 100}ms` }}>
              <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
                <path d="M5 0 L6.1 3.9 L10 5 L6.1 6.1 L5 10 L3.9 6.1 L0 5 L3.9 3.9 Z" fill={p2} />
              </svg>
            </span>
          ))}
        </>
      )}
      <Glint delayMs={delayMs + 1160} color={p1} left={47} top={46} />
      <Settle hex={p1} delayMs={delayMs + 1200} cy={50} />
    </Stage>
  );
}

/* =============================================================================
   Template 8: FrostTitan — a glacial colossus rises amid ice-shard fans while
   frost panes wipe across; the glyph is frozen in an ice crystal on its chest.
   ========================================================================== */
const PANES = [
  { t: 30, d: 0 },
  { t: 46, d: 90 },
  { t: 62, d: 180 },
];
function FrostTitan({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.28)} delayMs={delayMs} />
      <Tell hex={p1} delayMs={delayMs} cy={60} />
      {/* frost panes wiping across the board */}
      {PANES.map((p, i) => (
        <span
          key={i}
          className="gp-pane absolute block"
          style={{
            left: "12%",
            top: `${p.t}%`,
            width: "76%",
            height: "7%",
            background: `linear-gradient(90deg, ${tint(p1, 0.55)}, ${tint(p0, 0.3)} 70%, transparent)`,
            animationDelay: `${delayMs + p.d}ms`,
          }}
        />
      ))}
      {/* ice shards fanning up from the rift */}
      <Lobs delayMs={delayMs + 140} fill={tint(p0, 0.9)} stroke={p2} top={60} sizePct={5} />
      {/* the glacial colossus, rising */}
      <span className="gp-rise absolute block" style={{ left: "32%", top: "20%", width: "36%", height: "56%", animationDelay: `${delayMs + 180}ms` }}>
        <svg viewBox="0 0 36 44" className="block h-full w-full" aria-hidden="true">
          {/* jagged crown of ice */}
          <path d="M13 9 L12 3 L15 6 L18 1 L21 6 L24 3 L23 9 Z" fill={tint(p1, 0.9)} stroke={p2} strokeWidth="0.7" {...SJ} />
          {/* head */}
          <path d="M14 13 L14.6 8.6 H21.4 L22 13 Z" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="0.8" {...SJ} />
          {/* angular torso */}
          <path d="M5 44 L6 24 L10 16 L15 13.5 H21 L26 16 L30 24 L31 44 Z" fill={tint(p0, 0.85)} stroke={p2} strokeWidth="1.1" {...SJ} />
          {/* shard shoulders */}
          <path d="M6 24 L1 18 L8 19 M30 24 L35 18 L28 19" fill={tint(p1, 0.85)} stroke={p2} strokeWidth="0.7" {...SJ} />
          {/* facet lines */}
          <path d="M12 22 L14 30 L11 38 M24 20 L22 30 L25 38" stroke={tint(p2, 0.5)} strokeWidth="0.7" fill="none" />
          {/* the ice crystal that seats the glyph */}
          <path d="M18 21 L24 28.5 L18 36 L12 28.5 Z" fill={tint(p1, 0.55)} stroke={p2} strokeWidth="0.8" {...SJ} />
        </svg>
        {/* the card's glyph, frozen in the crystal */}
        <span className="absolute block" style={{ left: "39%", top: "54%", width: "22%", height: "24%" }}>{glyph}</span>
      </span>
      {/* rime flare + shards + glacial shockwaves */}
      <span
        className="gp-flash absolute block rounded-full"
        style={{ left: "34%", top: "60%", width: "30%", height: "16%", background: tint(p1, 0.75), animationDelay: `${delayMs + 640}ms` }}
      />
      <Sparks delayMs={delayMs + 680} fill={p1} stroke={p2} sizePct={8} cy={62} />
      <Boom delayMs={delayMs + 720} color={tint(p1, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 840} color={tint(p0, 0.8)} />
      {/* --- per-card flourishes ------------------------------------------- */}
      {/* glacial_tomb: the whole army is sealed standing up — three ice
          sarcophagi grind up out of the rift, each with a piece ghosting
          through the blue, already dripping as the melt begins. */}
      {flourish === "ice_tombs" && (
        <>
          {[
            { l: 24, d: 0, sil: SIL.n },
            { l: 47, d: 160, sil: SIL.b },
            { l: 68, d: 320, sil: SIL.r },
          ].map((v, i) => (
            <span key={i} className="gp-rise absolute block" style={{ left: `${v.l}%`, top: "42%", width: "8%", height: "15%", animationDelay: `${delayMs + 640 + v.d}ms` }}>
              <svg viewBox="0 0 8 14" className="block h-full w-full" aria-hidden="true">
                <g transform="translate(1.5 3.6) scale(0.5)">
                  <path d={v.sil} fill={tint(p2, 0.8)} />
                </g>
                <path d="M1 14 V4 C1 1 7 1 7 4 V14 Z" fill={tint(p0, 0.5)} stroke={p2} strokeWidth="0.6" {...SJ} />
                <path d="M2.2 4.4 L3.4 7 L2.6 10 M5.8 5 L5 8" stroke={tint(p1, 0.8)} strokeWidth="0.35" fill="none" />
              </svg>
            </span>
          ))}
          {[27, 50, 71].map((l, i) => (
            <span
              key={`d${i}`}
              className="gp-tinkle absolute block rounded-full"
              style={{ left: `${l}%`, top: "56%", width: "1.3%", height: "1.7%", background: tint(p1, 0.95), "--dx": i % 2 ? "40%" : "-40%", animationDelay: `${delayMs + 1350 + i * 140}ms` } as CSSProperties}
            />
          ))}
        </>
      )}
      {/* everfrost_shard: the shard itself is driven into the board and stays,
          radiating an exclusion ring nothing may step beside. */}
      {flourish === "shard_aura" && (
        <>
          <span className="gp-pod absolute block" style={{ left: "60%", top: "34%", width: "9%", height: "22%", animationDelay: `${delayMs + 620}ms` }}>
            <svg viewBox="0 0 9 22" className="block h-full w-full" aria-hidden="true">
              <path d="M4.5 0.6 L7.8 8 L4.5 21.4 L1.2 8 Z" fill={tint(p0, 0.85)} stroke={p1} strokeWidth="0.6" {...SJ} />
              <path d="M4.5 2.4 V18" stroke={p2} strokeWidth="0.5" strokeLinecap="round" />
            </svg>
          </span>
          <span
            className="gp-seal absolute block rounded-full"
            style={{ left: "52.5%", top: "48%", width: "24%", height: "17%", border: `2px dashed ${tint(p1, 0.9)}`, animationDelay: `${delayMs + 900}ms` }}
          />
          <span
            className="gp-gaze absolute block rounded-full"
            style={{ left: "56%", top: "50%", width: "17%", height: "12%", border: `2px solid ${tint(p0, 0.85)}`, animationDelay: `${delayMs + 1050}ms` }}
          />
          {[58, 66, 71].map((l, i) => (
            <Glint key={i} delayMs={delayMs + 1150 + i * 130} color={i % 2 ? p2 : p0} left={l} top={i % 2 ? 46 : 62} sizePct={3.2} />
          ))}
        </>
      )}
      <Glint delayMs={delayMs + 1100} color={p1} left={48} top={22} />
      <Settle hex={p1} delayMs={delayMs + 1100} cy={61} />
    </Stage>
  );
}

/* =============================================================================
   Template 9: ForgeColossus — a COLOSSAL weapon/implement (the glyph itself,
   writ huge) descends and strikes the board centre: judge's-gavel double
   shockwave + sparks.
   ========================================================================== */
function ForgeColossus({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.26)} delayMs={delayMs} />
      <Tell hex={p2} delayMs={delayMs} cy={56} />
      <RayFan hex={p1} delayMs={delayMs + 40} />
      {/* the colossal implement itself — the glyph, writ huge — slamming down */}
      <span className="gp-slam absolute block" style={{ left: "32%", top: "10%", width: "36%", height: "46%", animationDelay: `${delayMs + 160}ms` }}>
        {glyph}
      </span>
      {/* impact flare + forge sparks */}
      <span
        className="gp-flash absolute block rounded-full"
        style={{ left: "33%", top: "48%", width: "34%", height: "16%", background: tint(p2, 0.85), animationDelay: `${delayMs + 560}ms` }}
      />
      <Sparks delayMs={delayMs + 600} fill={p2} stroke={p1} sizePct={9} cy={58} />
      {/* the judge's-gavel double shockwave */}
      <Boom delayMs={delayMs + 640} color={tint(p2, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 750} color={tint(p0, 0.85)} />
      {/* --- per-card flourishes ------------------------------------------- */}
      {/* world_lock: a border chain is drawn taut across the middle of the
          world and bolts shut with a flash — their half stays theirs. */}
      {flourish === "border_chain" && (
        <>
          <span className="gp-pane absolute block" style={{ left: "14%", top: "49%", width: "72%", height: "4%", animationDelay: `${delayMs + 640}ms` }}>
            <svg viewBox="0 0 72 4" className="block h-full w-full" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <ellipse key={i} cx={4 + i * 8} cy="2" rx="3.4" ry="1.6" fill="none" stroke={tint(p1, 0.95)} strokeWidth="0.9" />
              ))}
            </svg>
          </span>
          <span
            className="gp-flash absolute block rounded-full"
            style={{ left: "45%", top: "46%", width: "10%", height: "9%", background: tint(p2, 0.8), animationDelay: `${delayMs + 1000}ms` }}
          />
          <span
            className="gp-seal absolute block"
            style={{ left: "14%", top: "50.2%", width: "72%", height: "1.4%", background: `linear-gradient(90deg, transparent, ${tint(p2, 0.9)} 20%, ${tint(p2, 0.9)} 80%, transparent)`, animationDelay: `${delayMs + 1050}ms` }}
          />
        </>
      )}
      {/* sealed_archive: the vault is bricked over course by course, and the
          wax seal takes over the last gap. */}
      {flourish === "vault_brick" && (
        <>
          {[
            { l: 40, t: 52 },
            { l: 47, t: 52 },
            { l: 54, t: 52 },
            { l: 43.5, t: 47.5 },
            { l: 50.5, t: 47.5 },
            { l: 47, t: 43 },
          ].map((v, i) => (
            <span key={i} className="gp-pod absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: "6.6%", height: "4.2%", animationDelay: `${delayMs + 640 + i * 110}ms` }}>
              <svg viewBox="0 0 10 6" className="block h-full w-full" aria-hidden="true">
                <rect x="0.5" y="0.5" width="9" height="5" rx="0.4" fill={tint(p0, 0.9)} stroke={p1} strokeWidth="0.5" />
              </svg>
            </span>
          ))}
          <span
            className="gp-seal absolute block rounded-full"
            style={{ left: "46%", top: "46%", width: "8%", height: "7%", background: tint("#c94a3a", 0.9), border: `2px solid ${p1}`, animationDelay: `${delayMs + 1400}ms` }}
          />
        </>
      )}
      {/* sealed_ramparts: a portcullis grid drops over each rook and bolts —
          the towers never open again. */}
      {flourish === "portcullis_drop" && (
        <>
          {[30, 58].map((l, i) => (
            <span key={i} className="gp-snooze absolute block" style={{ left: `${l + 2.5}%`, top: "44%", width: "7%", height: "11%", animationDelay: `${delayMs + 520 + i * 120}ms` }}>
              <Sil d={SIL.r} fill={tint(p1, 0.95)} stroke={p0} />
            </span>
          ))}
          {[30, 58].map((l, i) => (
            <span key={`g${i}`} className="gp-capdrop absolute block" style={{ left: `${l}%`, top: "40%", width: "12%", height: "17%", animationDelay: `${delayMs + 780 + i * 160}ms` }}>
              <svg viewBox="0 0 12 17" className="block h-full w-full" aria-hidden="true">
                <path
                  d="M1.5 0.5 V16 M4.5 0.5 V16.5 M7.5 0.5 V16.5 M10.5 0.5 V16 M0.5 3 H11.5 M0.5 8 H11.5 M0.5 13 H11.5"
                  stroke={tint(p0, 0.95)}
                  strokeWidth="0.7"
                  strokeLinecap="round"
                />
                <path d="M4.5 16.5 L4.5 15 M7.5 16.5 L7.5 15" stroke={p2} strokeWidth="0.8" />
              </svg>
            </span>
          ))}
          {[33, 61].map((l, i) => (
            <Glint key={`b${i}`} delayMs={delayMs + 1250 + i * 160} color={p2} left={l + 3} top={41} sizePct={3} />
          ))}
        </>
      )}
      <Glint delayMs={delayMs + 1050} color={p2} left={47} top={28} />
      <Settle hex={p2} delayMs={delayMs + 1050} cy={57} />
    </Stage>
  );
}

/* =============================================================================
   Template 10: GorgonIdol — a colossal gorgon/idol head rises mid-board with
   radiating petrifying gaze rings; the glyph is its crown/brow mark.
   ========================================================================== */
function GorgonIdol({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.26)} delayMs={delayMs} />
      <Tell hex={p1} delayMs={delayMs} cy={58} />
      {/* the idol head, grinding up out of the board */}
      <span className="gp-rise absolute block" style={{ left: "31%", top: "19%", width: "38%", height: "52%", animationDelay: `${delayMs + 150}ms` }}>
        <svg viewBox="0 0 36 40" className="block h-full w-full" aria-hidden="true">
          {/* serpent hair, writhing */}
          <path
            d="M10 12 C4 10 3 5 6 1 M14 9 C11 5 12 2 15 0.5 M22 9 C25 5 24 2 21 0.5 M26 12 C32 10 33 5 30 1 M7 18 C2 18 0.5 14 2 10 M29 18 C34 18 35.5 14 34 10"
            stroke={tint(p1, 0.85)}
            strokeWidth="1.1"
            fill="none"
            {...SJ}
          />
          {/* the stone face */}
          <path
            d="M9 12 C9 6 27 6 27 12 L28 26 C28 34 24 38 18 38 C12 38 8 34 8 26 Z"
            fill={tint(p0, 0.92)}
            stroke={p2}
            strokeWidth="1.1"
            {...SJ}
          />
          {/* the petrifying eyes */}
          <ellipse cx="13.5" cy="20" rx="2.4" ry="1.2" fill={p1} stroke={p2} strokeWidth="0.5" />
          <ellipse cx="22.5" cy="20" rx="2.4" ry="1.2" fill={p1} stroke={p2} strokeWidth="0.5" />
          {/* mouth slab + brow seat */}
          <path d="M14 30 H22" stroke={p2} strokeWidth="0.9" strokeLinecap="round" />
          <path d="M12 13.5 H24" stroke={tint(p2, 0.6)} strokeWidth="0.6" />
        </svg>
        {/* the card's glyph as the idol's brow mark */}
        <span className="absolute block" style={{ left: "38%", top: "23%", width: "24%", height: "18%" }}>{glyph}</span>
      </span>
      {/* the eyes flare... */}
      <span
        className="gp-flash absolute block rounded-full"
        style={{ left: "41%", top: "40%", width: "18%", height: "10%", background: tint(p1, 0.8), animationDelay: `${delayMs + 560}ms` }}
      />
      {/* ...and the petrifying gaze rolls out in rings */}
      {[0, 130, 260].map((d, i) => (
        <span
          key={i}
          className="gp-gaze absolute block rounded-full"
          style={{
            left: "20%",
            top: "15%",
            width: "60%",
            height: "60%",
            border: `${i === 0 ? 4 : 2.5}px solid ${tint(i % 2 ? p2 : p1, 0.85)}`,
            animationDelay: `${delayMs + 600 + d}ms`,
          }}
        />
      ))}
      <Sparks delayMs={delayMs + 680} fill={p1} stroke={p2} sizePct={6.5} cy={52} />
      <Boom delayMs={delayMs + 860} color={tint(p0, 0.85)} />
      {/* --- per-card flourishes ------------------------------------------- */}
      {/* walnut_court: the whole back rank hardens where it sits — a row of
          walnuts thunks down along the far rank, chuffing dust. */}
      {flourish === "court_walnuts" && (
        <>
          {[26, 37, 48, 59, 70].map((l, i) => (
            <span key={i} className="gp-pod absolute block" style={{ left: `${l}%`, top: "24%", width: "5.5%", height: "6.5%", animationDelay: `${delayMs + 620 + i * 110}ms` }}>
              <svg viewBox="0 0 10 11" className="block h-full w-full" aria-hidden="true">
                <ellipse cx="5" cy="5.6" rx="3.6" ry="4.2" fill={p1} stroke={p0} strokeWidth="0.6" />
                <path d="M5 1.8 V9.4 M3 2.8 C2.4 4.6 2.4 6.6 3 8.4 M7 2.8 C7.6 4.6 7.6 6.6 7 8.4" fill="none" stroke={p0} strokeWidth="0.4" strokeLinecap="round" />
              </svg>
            </span>
          ))}
          {[29, 51, 73].map((l, i) => (
            <span
              key={`d${i}`}
              className="gp-spark absolute block rounded-full"
              style={{ left: `${l}%`, top: "30%", width: "2%", height: "2%", background: tint(p1, 0.7), "--dx": i % 2 ? "150%" : "-150%", "--dy": "-50%", "--rot": "0deg", animationDelay: `${delayMs + 800 + i * 110}ms` } as CSSProperties}
            />
          ))}
        </>
      )}
      {/* obsidian_bastions: two towers cool into black glass — dark bastions
          rise flanking the idol, take their shine, and their strike is struck
          out for good. */}
      {flourish === "glass_towers" && (
        <>
          {[26, 64].map((l, i) => (
            <span key={i} className="gp-rise absolute block" style={{ left: `${l}%`, top: "36%", width: "10%", height: "22%", animationDelay: `${delayMs + 560 + i * 150}ms` }}>
              <svg viewBox="0 0 10 22" className="block h-full w-full" aria-hidden="true">
                <path d="M2 22 V4 H3.2 V5.6 H4.4 V4 H5.6 V5.6 H6.8 V4 H8 V22 Z" fill={tint(p0, 0.96)} stroke={p1} strokeWidth="0.5" {...SJ} />
                <path d="M3 8 L5 12 L4 16 M7 9 L6 13" stroke={tint(p1, 0.7)} strokeWidth="0.4" fill="none" />
              </svg>
            </span>
          ))}
          {[28, 66].map((l, i) => (
            <Glint key={`g${i}`} delayMs={delayMs + 1150 + i * 170} color={p1} left={l + 2} top={40} sizePct={4} />
          ))}
          <span className="gp-crack absolute block" style={{ left: "44%", top: "40%", width: "12%", height: "10%", animationDelay: `${delayMs + 1050}ms` }}>
            <svg viewBox="0 0 12 10" className="block h-full w-full" aria-hidden="true">
              <path d="M2.5 1.5 L9.5 8.5 M9.5 1.5 L2.5 8.5" stroke={p2} strokeWidth="0.9" strokeLinecap="round" />
              <circle cx="6" cy="5" r="4.4" fill="none" stroke="#c94a5a" strokeWidth="0.9" />
              <path d="M2.9 8.1 L9.1 1.9" stroke="#c94a5a" strokeWidth="0.9" strokeLinecap="round" />
            </svg>
          </span>
        </>
      )}
      {/* statue_garden: horse and prelate are set among the topiary — two
          statues rise on plinths and the ivy climbs while they stand. */}
      {flourish === "garden_plinths" && (
        <>
          {[30, 58].map((l, i) => (
            <span key={i} className="gp-rise absolute block" style={{ left: `${l}%`, top: "42%", width: "9%", height: "15%", animationDelay: `${delayMs + 600 + i * 160}ms` }}>
              <svg viewBox="0 0 10 16" className="block h-full w-full" aria-hidden="true">
                <rect x="1" y="12.5" width="8" height="3" fill={p2} stroke={p0} strokeWidth="0.4" />
                <g transform="translate(1 2) scale(0.8)">
                  <path d={i ? SIL.b : SIL.n} fill={p0} stroke={p2} strokeWidth="0.5" {...SJ} />
                </g>
              </svg>
            </span>
          ))}
          {[31, 59].map((l, i) => (
            <span key={`v${i}`} className="gp-pop absolute block" style={{ left: `${l}%`, top: "50%", width: "5%", height: "7%", animationDelay: `${delayMs + 1100 + i * 160}ms` }}>
              <svg viewBox="0 0 6 8" className="block h-full w-full" aria-hidden="true">
                <path d="M1 8 C1.6 5.6 1 4 2.6 2 M2.6 2 C2.2 3.4 3.4 3.8 4.6 3.2" fill="none" stroke={p1} strokeWidth="0.6" strokeLinecap="round" />
                <circle cx="4.9" cy="3" r="0.7" fill={p1} />
              </svg>
            </span>
          ))}
          <Glint delayMs={delayMs + 1350} color={p2} left={47} top={46} sizePct={4} />
        </>
      )}
      {/* chisel_curse: the chisel bites the chosen piece and the stone creeps
          outward to the neighbours on either side. */}
      {flourish === "chisel_spread" && (
        <>
          <span className="gp-slam absolute block" style={{ left: "45%", top: "30%", width: "10%", height: "16%", animationDelay: `${delayMs + 560}ms` }}>
            <svg viewBox="0 0 10 16" className="block h-full w-full" aria-hidden="true">
              <path d="M4 0.6 H6 L6.4 9 L5 11 L3.6 9 Z" fill={p1} stroke={p2} strokeWidth="0.5" {...SJ} />
              <rect x="2.6" y="0.4" width="4.8" height="2.4" rx="0.5" fill={p0} stroke={p2} strokeWidth="0.4" />
            </svg>
          </span>
          <span className="gp-snooze absolute block" style={{ left: "46%", top: "46%", width: "8%", height: "12%", animationDelay: `${delayMs + 900}ms` }}>
            <Sil d={SIL.b} fill={p1} stroke={p2} />
          </span>
          {[0, 1].map((i) => (
            <span key={i} className="absolute block" style={{ left: i ? "54%" : "34%", top: "51%", width: "12%", height: "2%", transform: i ? undefined : "scaleX(-1)" }}>
              <span
                className="gp-pane absolute inset-0 block"
                style={{ background: `linear-gradient(90deg, ${tint(p2, 0.9)}, transparent)`, animationDelay: `${delayMs + 1050 + i * 80}ms` }}
              />
            </span>
          ))}
          {[36, 62].map((l, i) => (
            <span key={`n${i}`} className="gp-pop absolute block" style={{ left: `${l}%`, top: "47%", width: "7%", height: "10%", animationDelay: `${delayMs + 1250 + i * 100}ms` }}>
              <Sil d={SIL.p} fill={p1} stroke={p2} />
            </span>
          ))}
        </>
      )}
      {/* crown_and_castle: queen and rooks come down already half-shelled —
          three heavyweights setting like mortar where they land. */}
      {flourish === "heavy_court" && (
        <>
          {[
            { l: 33, sil: SIL.r, d: 0 },
            { l: 46.5, sil: SIL.q, d: 160 },
            { l: 60, sil: SIL.r, d: 320 },
          ].map((v, i) => (
            <span key={i} className="gp-pod absolute block" style={{ left: `${v.l}%`, top: "42%", width: "7.5%", height: "13%", animationDelay: `${delayMs + 600 + v.d}ms` }}>
              <svg viewBox="0 0 10 14" className="block h-full w-full" aria-hidden="true">
                <g transform="translate(0.5 0.5) scale(0.9)">
                  <path d={v.sil} fill={tint(p2, 0.95)} stroke={p1} strokeWidth="0.5" {...SJ} />
                </g>
                <path d="M1.6 9 C1.6 5.6 8.4 5.6 8.4 9 L8 13.4 H2 Z" fill={tint("#c9b89a", 0.85)} stroke={p2} strokeWidth="0.5" {...SJ} />
              </svg>
            </span>
          ))}
          {[36, 63].map((l, i) => (
            <span
              key={`d${i}`}
              className="gp-spark absolute block rounded-full"
              style={{ left: `${l}%`, top: "53%", width: "2.2%", height: "2.2%", background: tint(p1, 0.7), "--dx": i ? "160%" : "-160%", "--dy": "-60%", "--rot": "0deg", animationDelay: `${delayMs + 900 + i * 200}ms` } as CSSProperties}
            />
          ))}
        </>
      )}
      <Glint delayMs={delayMs + 1140} color={p1} left={47} top={24} />
      <Settle hex={p1} delayMs={delayMs + 1130} cy={48} />
    </Stage>
  );
}

/* =============================================================================
   Template 11: ChronoLord — a giant hourglass-and-clock time sovereign
   descends; a great clock ring with a sweeping hand; the glyph sits at the
   12 o'clock seat.
   ========================================================================== */
function ChronoLord({ palette, glyph, lead, delayMs, flourish }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.25)} delayMs={delayMs} />
      <Tell hex={p1} delayMs={delayMs} cy={54} />
      {/* the great clock ring settles over the board */}
      <span className="gp-ringset absolute block" style={{ left: "21%", top: "22%", width: "58%", height: "58%", animationDelay: `${delayMs + 120}ms` }}>
        <svg viewBox="0 0 40 40" className="block h-full w-full" aria-hidden="true">
          <circle cx="20" cy="20" r="17" fill="none" stroke={tint(p1, 0.9)} strokeWidth="1.2" />
          <circle cx="20" cy="20" r="13.5" fill="none" stroke={tint(p2, 0.6)} strokeWidth="0.5" strokeDasharray="2.2 1.6" />
          {/* hour ticks */}
          <path
            d="M20 3 V6 M20 34 V37 M3 20 H6 M34 20 H37 M8 8 L10 10 M32 8 L30 10 M8 32 L10 30 M32 32 L30 30"
            stroke={tint(p1, 0.85)}
            strokeWidth="0.9"
            strokeLinecap="round"
          />
        </svg>
        {/* the card's glyph, seated at 12 o'clock */}
        <span className="absolute block" style={{ left: "42%", top: "1%", width: "16%", height: "16%" }}>{glyph}</span>
      </span>
      {/* the great hand sweeps once around */}
      <span
        className="gp-handsweep absolute block"
        style={{ left: "49%", top: "33%", width: "2%", height: "18%", background: `linear-gradient(180deg, ${tint(p1, 0.95)}, transparent)`, animationDelay: `${delayMs + 420}ms` }}
      />
      {/* the time sovereign, descending above the ring */}
      <span className="gp-descend absolute block" style={{ left: "34%", top: "12%", width: "32%", height: "48%", animationDelay: `${delayMs + 180}ms` }}>
        <svg viewBox="0 0 32 44" className="block h-full w-full" aria-hidden="true">
          {/* crowned clock head */}
          <path d="M12.4 2.8 L13.4 0.6 L15 2.2 L16 0.2 L17 2.2 L18.6 0.6 L19.6 2.8 Z" fill={p1} stroke={p2} strokeWidth="0.4" {...SJ} />
          <circle cx="16" cy="8" r="5.2" fill={tint(p1, 0.9)} stroke={p2} strokeWidth="0.9" />
          <path d="M16 8 V4.8 M16 8 L18.6 9.6" stroke={p2} strokeWidth="0.8" strokeLinecap="round" />
          {/* hourglass torso, sand mid-fall */}
          <path d="M8 14 H24 L17.5 24 L24 34 H8 L14.5 24 Z" fill={tint(p0, 0.88)} stroke={p2} strokeWidth="1" {...SJ} />
          <path d="M12 15.5 H20 L16 21 Z M16 27 L20 32.5 H12 Z" fill={tint(p1, 0.8)} />
          {/* robe base */}
          <path d="M8 34 L6 43 H26 L24 34 Z" fill={tint(p0, 0.85)} stroke={p2} strokeWidth="0.9" {...SJ} />
        </svg>
      </span>
      {/* the stroke of the hour: flare + sparks + shockwaves */}
      <span
        className="gp-flash absolute block rounded-full"
        style={{ left: "40%", top: "48%", width: "20%", height: "14%", background: tint(p1, 0.75), animationDelay: `${delayMs + 800}ms` }}
      />
      <Sparks delayMs={delayMs + 840} fill={p1} stroke={p2} sizePct={6.5} cy={56} />
      <Boom delayMs={delayMs + 880} color={tint(p1, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 1000} color={tint(p0, 0.8)} />
      {/* --- per-card flourishes ------------------------------------------- */}
      {/* full_rewind: the great hand runs BACKWARD (mirrored sweep) and the
          pieces trail back down the board to a home rank that lights to
          receive them. */}
      {flourish === "time_reverse" && (
        <>
          <span className="absolute block" style={{ left: "49%", top: "33%", width: "2%", height: "18%", transform: "scaleX(-1)" }}>
            <span
              className="gp-handsweep absolute inset-0 block"
              style={{ background: `linear-gradient(180deg, ${tint(p0, 0.95)}, transparent)`, animationDelay: `${delayMs + 900}ms` }}
            />
          </span>
          {[
            { l: 32, t: 60, dx: "300%", dy: "-240%", sil: SIL.n },
            { l: 46, t: 63, dx: "60%", dy: "-300%", sil: SIL.p },
            { l: 61, t: 60, dx: "-260%", dy: "-260%", sil: SIL.b },
          ].map((v, i) => (
            <span
              key={i}
              className="gp-mote absolute block"
              style={{ left: `${v.l}%`, top: `${v.t}%`, width: "6%", height: "9%", "--dx": v.dx, "--dy": v.dy, animationDelay: `${delayMs + 1000 + i * 140}ms` } as CSSProperties}
            >
              <Sil d={v.sil} fill={tint(p0, 0.9)} stroke={p2} />
            </span>
          ))}
          <span
            className="gp-seal absolute block"
            style={{ left: "28%", top: "66%", width: "44%", height: "1.4%", background: `linear-gradient(90deg, transparent, ${tint(p1, 0.9)} 25%, ${tint(p1, 0.9)} 75%, transparent)`, animationDelay: `${delayMs + 1250}ms` }}
          />
        </>
      )}
      <Glint delayMs={delayMs + 1220} color={p1} left={47} top={26} />
      <Settle hex={p1} delayMs={delayMs + 1260} cy={54} />
    </Stage>
  );
}

/* =============================================================================
   APEX helpers (tier 9/10) — letterbox bars for the two set-piece templates.
   ========================================================================== */
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
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p1, 0.4)} delayMs={delayMs} />
      <Tell hex={p0} delayMs={delayMs} cy={48} />
      <Bars delayMs={delayMs} />
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
    <Stage>
      <Wash color={tint(p0, 0.42)} delayMs={delayMs} />
      <Tell hex={p1} delayMs={delayMs} cy={44} />
      <Bars delayMs={delayMs} />
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

/* --- total_atomic: "every capture detonates... and each removed piece chains
   its own blast". The chain hits run an increasingly RADIOACTIVE-GREEN tint
   ramp as they spread, and the final blast leaves a small mushroom cloud that
   wobbles smugly before dissipating. -------------------------------------- */
const RAD_GREEN = "#7dff3f";
const FALLOUT = [
  { l: 42, dx: "-60%", d: 0 },
  { l: 56, dx: "70%", d: 160 },
  { l: 49, dx: "20%", d: 320 },
];
function TotalAtomic(props: TemplateProps) {
  const { palette, glyph, lead, delayMs } = props;
  const [, p1, p2] = palette;
  if (!lead) {
    // the chain: each successive blast in the spread runs hotter green
    const t = Math.min(1, Math.max(0, delayMs / 900));
    const greened: Palette = [mix(palette[0], RAD_GREEN, 0.7 * t), mix(p1, RAD_GREEN, 0.55 * t), p2];
    return (
      <>
        <span className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
          <span
            className="gp-radglow absolute block rounded-full"
            style={{
              left: "6%",
              top: "6%",
              width: "88%",
              height: "88%",
              background: `radial-gradient(closest-side, ${tint(RAD_GREEN, 0.2 + 0.45 * t)}, transparent)`,
              animationDelay: `${delayMs}ms`,
            }}
          />
        </span>
        <TargetHit palette={greened} glyph={glyph} delayMs={delayMs} />
      </>
    );
  }
  return (
    <>
      <SkyWrath {...props} />
      <Stage>
        {/* the fallout ramp: the whole sky greens as the chain spreads */}
        <span className="gp-radwash absolute inset-0 block" style={{ background: tint(RAD_GREEN, 0.24), animationDelay: `${delayMs + 640}ms` }} />
        {/* the final blast leaves a small mushroom cloud... */}
        <span className="gp-shroom absolute block" style={{ left: "41.5%", top: "38%", width: "17%", height: "23%", animationDelay: `${delayMs + 1000}ms` }}>
          {/* ...that wobbles smugly before dissipating */}
          <span className="gp-smug absolute inset-0 block" style={{ animationDelay: `${delayMs + 1000}ms` }}>
            <Shroom core={mix(p1, RAD_GREEN, 0.4)} glow={mix("#ffd166", RAD_GREEN, 0.35)} deep="#1f3a10" />
          </span>
        </span>
        {/* fallout motes drift up off the cloud */}
        {FALLOUT.map((v, i) => (
          <span
            key={i}
            className="gp-updrift absolute block rounded-full"
            style={
              {
                left: `${v.l}%`,
                top: "44%",
                width: "1.9%",
                height: "1.9%",
                background: tint(RAD_GREEN, 0.85),
                "--dx": v.dx,
                animationDelay: `${delayMs + 1250 + v.d}ms`,
              } as CSSProperties
            }
          />
        ))}
      </Stage>
    </>
  );
}

/* --- chain_atomic: "every capture explodes and chains" — a domino ripple of
   SHRINKING mushroom clouds skitters outward from the strike, left and right,
   each pop smaller and later than the last. ------------------------------- */
const SKITTER = [
  { l: 45.5, t: 44, s: 9, d: 0 },
  { l: 55, t: 46, s: 7.4, d: 140 },
  { l: 38, t: 47, s: 7.4, d: 220 },
  { l: 63, t: 48.5, s: 5.9, d: 360 },
  { l: 31, t: 49.5, s: 5.9, d: 440 },
  { l: 70, t: 51, s: 4.6, d: 580 },
  { l: 25, t: 52, s: 4.6, d: 660 },
];
function ChainAtomic(props: TemplateProps) {
  const { palette, glyph, lead, delayMs } = props;
  const [p0, p1, p2] = palette;
  if (!lead) {
    return (
      <>
        <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />
        {/* each struck square coughs up its own tiny mushroom puff */}
        <span className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
          <span className="gp-shroomlet absolute block" style={{ left: "30%", top: "6%", width: "40%", height: "56%", animationDelay: `${delayMs + 360}ms` }}>
            <Shroom core={p0} glow={p2} deep={p1} />
          </span>
        </span>
      </>
    );
  }
  return (
    <>
      <SkyWrath {...props} />
      <Stage>
        {/* the domino ripple: shrinking mushroom clouds skitter outward */}
        {SKITTER.map((v, i) => (
          <span
            key={i}
            className="gp-shroomlet absolute block"
            style={{ left: `${v.l - v.s / 2}%`, top: `${v.t - v.s * 1.15}%`, width: `${v.s}%`, height: `${v.s * 1.33}%`, animationDelay: `${delayMs + 680 + v.d}ms` }}
          >
            <Shroom core={p0} glow={p2} deep={p1} />
          </span>
        ))}
      </Stage>
    </>
  );
}

/* --- endless_night: "your opponent skips their next 2 turns... only their
   king may move" — the sun visibly SETS (a warm disc sinks while the sky band
   darkens), stars wink on, and nightcaps drop onto dozing piece silhouettes
   with Z's rising off them. ------------------------------------------------ */
const NIGHT_STARS = [
  { l: 30, t: 24, d: 0 },
  { l: 44, t: 20, d: 110 },
  { l: 58, t: 23, d: 220 },
  { l: 70, t: 27, d: 330 },
  { l: 36, t: 30, d: 440 },
];
const SLEEPERS = [
  { l: 33, d: 0 },
  { l: 47, d: 150 },
  { l: 61, d: 300 },
];
function EndlessNight(props: TemplateProps) {
  const { palette, lead, delayMs } = props;
  const [, p1] = palette;
  if (!lead) return <ReaperSweep {...props} />;
  return (
    <>
      <ReaperSweep {...props} />
      <Stage>
        {/* the sky band darkens as the sun goes down */}
        <span
          className="gp-nightfall absolute block"
          style={{
            left: "12%",
            top: "17%",
            width: "76%",
            height: "30%",
            background: "linear-gradient(180deg, rgba(9,12,40,0.92), rgba(9,12,40,0.35) 70%, transparent)",
            animationDelay: `${delayMs + 60}ms`,
          }}
        />
        {/* the warm disc sinks below the field */}
        <span
          className="gp-sunset absolute block rounded-full"
          style={{
            left: "59%",
            top: "27%",
            width: "9%",
            height: "9%",
            background: `radial-gradient(circle at 50% 38%, #ffe9a8, #ffb454 55%, ${tint("#ff7a29", 0.9)})`,
            animationDelay: `${delayMs + 80}ms`,
          }}
        />
        {/* stars wink on */}
        {NIGHT_STARS.map((s, i) => (
          <span key={i} className="gp-glint absolute block" style={{ left: `${s.l}%`, top: `${s.t}%`, width: "3.4%", height: "3.4%", animationDelay: `${delayMs + 900 + s.d}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0 L6.1 3.9 L10 5 L6.1 6.1 L5 10 L3.9 6.1 L0 5 L3.9 3.9 Z" fill={i % 2 ? "#fff4d6" : p1} />
            </svg>
          </span>
        ))}
        {/* the court nods off: silhouettes, dropping nightcaps, rising Z's */}
        {SLEEPERS.map((v, i) => (
          <span key={i} className="absolute block" style={{ left: `${v.l}%`, top: "50%", width: "7%", height: "16%" }}>
            {/* dozing pawn silhouette */}
            <span className="gp-snooze absolute block" style={{ left: "10%", top: "26%", width: "80%", height: "74%", animationDelay: `${delayMs + 950 + v.d}ms` }}>
              <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
                <path d="M5 0.8 A2 2 0 0 1 5 4.8 L6.4 9.4 H8 V11.4 H2 V9.4 H3.6 L5 4.8 A2 2 0 0 1 5 0.8 Z" fill="#141a36" stroke={tint(p1, 0.55)} strokeWidth="0.5" {...SJ} />
              </svg>
            </span>
            {/* the nightcap drops on */}
            <span className="gp-capdrop absolute block" style={{ left: "18%", top: "0%", width: "64%", height: "34%", animationDelay: `${delayMs + 1250 + v.d}ms` }}>
              <svg viewBox="0 0 10 6" className="block h-full w-full" aria-hidden="true">
                <path d="M1.4 5 C2 1.6 5 0.4 8 1.4 L8.8 1 C9.4 1 9.6 2 9 2.2 L8.4 2.2 C7 4.4 4 5.4 1.4 5 Z" fill="#3b4c8f" stroke="#cdd6ff" strokeWidth="0.4" {...SJ} />
                <circle cx="9.1" cy="1.6" r="0.7" fill="#fff4d6" />
              </svg>
            </span>
            {/* Z's rise */}
            {[0, 1].map((z) => (
              <span key={z} className="gp-zrise absolute block" style={{ left: `${58 + z * 18}%`, top: `${8 - z * 10}%`, width: `${20 - z * 6}%`, height: `${18 - z * 5}%`, animationDelay: `${delayMs + 1500 + v.d + z * 260}ms` }}>
                <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
                  <path d="M2 2 H8 L2 8 H8" fill="none" stroke="#cdd6ff" strokeWidth="1.3" {...SJ} />
                </svg>
              </span>
            ))}
          </span>
        ))}
      </Stage>
    </>
  );
}

/* --- absolute_zero: "the cold outlives the ice" — a frost-line RACES across
   the board, and the titan's breath-cloud freezes solid mid-air, then tinkles
   down in shards. ---------------------------------------------------------- */
const TINKLE = [
  { l: 20, dx: "-70%", d: 0 },
  { l: 42, dx: "30%", d: 110 },
  { l: 62, dx: "-30%", d: 220 },
  { l: 80, dx: "80%", d: 330 },
];
function AbsoluteZero(props: TemplateProps) {
  const { palette, lead, delayMs } = props;
  const [p0, p1, p2] = palette;
  if (!lead) return <FrostTitan {...props} />;
  return (
    <>
      <FrostTitan {...props} />
      <Stage>
        {/* the frost-line races across the board */}
        <span
          className="gp-frostrace absolute block"
          style={{
            left: "14%",
            top: "51.5%",
            width: "72%",
            height: "1.2%",
            background: `linear-gradient(90deg, ${tint(p1, 0.95)}, ${tint(p0, 0.8)} 60%, ${tint(p1, 0.5)})`,
            animationDelay: `${delayMs + 80}ms`,
          }}
        />
        {/* rime crystals snap up in its wake */}
        {[24, 41, 58, 75].map((l, i) => (
          <span key={i} className="gp-glint absolute block" style={{ left: `${l}%`, top: "49.4%", width: "2.8%", height: "2.8%", animationDelay: `${delayMs + 220 + i * 90}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M5 0 L6.1 3.9 L10 5 L6.1 6.1 L5 10 L3.9 6.1 L0 5 L3.9 3.9 Z" fill={i % 2 ? "#ffffff" : p1} />
            </svg>
          </span>
        ))}
        {/* the breath-cloud puffs out... */}
        <span className="gp-breath absolute block" style={{ left: "43%", top: "33%", width: "14%", height: "9%", animationDelay: `${delayMs + 760}ms` }}>
          <svg viewBox="0 0 16 9" className="block h-full w-full" aria-hidden="true">
            <path d="M1.5 6.5 Q2 3.5 4.5 4 Q5.5 1 8.5 2.2 Q11.5 0.8 13 3.4 Q15.2 3.8 14.6 6.2 Q12 8.4 8 8 Q4 8.6 1.5 6.5 Z" fill="rgba(255,255,255,0.85)" stroke={tint(p0, 0.9)} strokeWidth="0.5" {...SJ} />
          </svg>
        </span>
        {/* ...freezes SOLID... */}
        <span className="gp-crack absolute block" style={{ left: "43%", top: "33%", width: "14%", height: "9%", animationDelay: `${delayMs + 1240}ms` }}>
          <svg viewBox="0 0 16 9" className="block h-full w-full" aria-hidden="true">
            <path d="M1.5 6.5 L4 3.6 L7 1.8 L10.5 1.6 L13.6 3 L14.6 6.2 L11 8.2 L5 8.3 Z" fill={tint(p0, 0.85)} stroke={p2} strokeWidth="0.7" {...SJ} />
            <path d="M4.5 6.8 L8 3 M8.4 7.6 L11.6 3.2" stroke="#ffffff" strokeWidth="0.4" strokeLinecap="round" />
          </svg>
        </span>
        {/* ...and tinkles down in shards */}
        {TINKLE.map((v, i) => (
          <span
            key={i}
            className="gp-tinkle absolute block"
            style={
              {
                left: `${44 + (v.l / 100) * 12}%`,
                top: "40%",
                width: "1.8%",
                height: "2.6%",
                "--dx": v.dx,
                animationDelay: `${delayMs + 1650 + v.d}ms`,
              } as CSSProperties
            }
          >
            <svg viewBox="0 0 6 9" className="block h-full w-full" aria-hidden="true">
              <path d="M3 0.5 L5.2 4.5 L3 8.5 L0.8 4.5 Z" fill={tint(p1, 0.9)} stroke={p2} strokeWidth="0.5" {...SJ} />
            </svg>
          </span>
        ))}
      </Stage>
    </>
  );
}

/* --- sabbatical: "suspend your nerf for 10 turns" — the hammock itself gets
   strung up mid-board and SWAYS, Z's drifting off the napping pawn. -------- */
function SabbaticalScene(props: TemplateProps) {
  const { palette, lead, delayMs } = props;
  const [p0, , p2] = palette;
  if (!lead) return <ChronoLord {...props} />;
  return (
    <>
      <ChronoLord {...props} />
      <Stage>
        {/* the hammock, swinging lazily under the great clock */}
        <span className="gp-sway absolute block" style={{ left: "36%", top: "52%", width: "28%", height: "17%", transformOrigin: "50% 0%", animationDelay: `${delayMs + 620}ms` }}>
          <svg viewBox="0 0 28 17" className="block h-full w-full" aria-hidden="true">
            {/* posts */}
            <path d="M2 2 V15.5 M26 2 V15.5" stroke={p0} strokeWidth="1.4" strokeLinecap="round" />
            {/* net */}
            <path d="M2 4 C8 12.5 20 12.5 26 4" fill="none" stroke={p2} strokeWidth="1.2" strokeLinecap="round" />
            <path d="M6.5 6.8 C10 10.4 18 10.4 21.5 6.8" fill="none" stroke={p2} strokeWidth="0.6" strokeLinecap="round" />
            {/* the napping pawn, tucked in */}
            <circle cx="12" cy="7.2" r="2" fill="#fff7de" stroke={p0} strokeWidth="0.6" />
            <path d="M10.4 6.9 C10.9 6.5 11.5 6.5 12 6.9" fill="none" stroke={p0} strokeWidth="0.5" strokeLinecap="round" />
            <path d="M13.5 8.6 C16.5 7.4 19 8 20.5 9.2" fill="none" stroke={p2} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        {/* Z's drift up off the nap */}
        {[0, 1, 2].map((z) => (
          <span key={z} className="gp-zrise absolute block" style={{ left: `${46 + z * 4}%`, top: `${48 - z * 4}%`, width: `${3.4 - z * 0.7}%`, height: `${3.4 - z * 0.7}%`, animationDelay: `${delayMs + 1050 + z * 260}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d="M2 2 H8 L2 8 H8" fill="none" stroke="#fff4d6" strokeWidth="1.3" {...SJ} />
            </svg>
          </span>
        ))}
      </Stage>
    </>
  );
}

/* --- ban_hammer: the moderator's verdict — a red circle-slash BAN seal
   stamps over the impact, and panicked chat bubbles scatter. --------------- */
const BUBBLES = [
  { dx: "220%", dy: "-180%", rot: "40deg", d: 0, l: 56 },
  { dx: "-240%", dy: "-140%", rot: "-50deg", d: 60, l: 42 },
  { dx: "120%", dy: "-260%", rot: "24deg", d: 120, l: 50 },
];
function BanHammerScene(props: TemplateProps) {
  const { lead, delayMs } = props;
  if (!lead) return <ForgeColossus {...props} />;
  return (
    <>
      <ForgeColossus {...props} />
      <Stage>
        {/* the BAN seal stamps over the point of impact */}
        <span className="gp-seal absolute block" style={{ left: "39%", top: "40%", width: "22%", height: "22%", animationDelay: `${delayMs + 700}ms` }}>
          <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
            <circle cx="10" cy="10" r="8.2" fill="rgba(214,35,79,0.18)" stroke="#d6234f" strokeWidth="1.8" />
            <path d="M4.4 15.6 L15.6 4.4" stroke="#d6234f" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        {/* the chat scatters */}
        {BUBBLES.map((v, i) => (
          <span
            key={i}
            className="gp-spark absolute block"
            style={
              {
                left: `${v.l}%`,
                top: "50%",
                width: "4.6%",
                height: "3.8%",
                "--dx": v.dx,
                "--dy": v.dy,
                "--rot": v.rot,
                animationDelay: `${delayMs + 780 + v.d}ms`,
              } as CSSProperties
            }
          >
            <svg viewBox="0 0 12 10" className="block h-full w-full" aria-hidden="true">
              <path d="M1.5 1 H10.5 A1 1 0 0 1 11.5 2 V6 A1 1 0 0 1 10.5 7 H5 L2.5 9.4 L3 7 H1.5 A1 1 0 0 1 0.5 6 V2 A1 1 0 0 1 1.5 1 Z" fill="#fff7de" stroke="#4fa3d1" strokeWidth="0.5" {...SJ} />
              <path d="M3 4 H9" stroke="#d6234f" strokeWidth="0.8" strokeLinecap="round" />
            </svg>
          </span>
        ))}
      </Stage>
    </>
  );
}

/* --- salted_earth: "pawns can never advance again" — the great urn pours a
   curtain of salt grains over the furrows, and the last green sprout WILTS. */
const SALT = [
  { l: 44, d: 0 },
  { l: 47, d: 90 },
  { l: 50, d: 40 },
  { l: 53, d: 130 },
  { l: 56, d: 70 },
  { l: 48.5, d: 180 },
];
function SaltedEarthScene(props: TemplateProps) {
  const { lead, delayMs } = props;
  if (!lead) return <TitanRise {...props} />;
  return (
    <>
      <TitanRise {...props} />
      <Stage>
        {/* salt grains pour and patter down */}
        {SALT.map((v, i) => (
          <span
            key={i}
            className="gp-tinkle absolute block rounded-full"
            style={
              {
                left: `${v.l}%`,
                top: "40%",
                width: "1.3%",
                height: "1.3%",
                background: "#f2ead2",
                "--dx": i % 2 ? "40%" : "-40%",
                animationDelay: `${delayMs + 520 + v.d}ms`,
              } as CSSProperties
            }
          />
        ))}
        {/* the last sprout wilts where the salt lands */}
        <span className="gp-wilt absolute block" style={{ left: "56%", top: "56%", width: "5%", height: "8%", transformOrigin: "20% 100%", animationDelay: `${delayMs + 1050}ms` }}>
          <svg viewBox="0 0 10 16" className="block h-full w-full" aria-hidden="true">
            <path d="M3 15.5 C3.5 10 4 6 5.5 2" fill="none" stroke="#7a9a4e" strokeWidth="1" strokeLinecap="round" />
            <path d="M5 5 C3.4 4.6 2.4 3.4 2.4 2 C4 2.2 5 3.2 5.2 4.6 Z M5.6 3.4 C7 3 7.8 1.8 7.8 0.6 C6.2 0.8 5.4 1.8 5.3 3 Z" fill="#8faf4a" stroke="#5c7038" strokeWidth="0.4" {...SJ} />
          </svg>
        </span>
      </Stage>
    </>
  );
}

/* --- phoenix_line: "revive all your captured pawns" — the firebird itself
   climbs out of the ground-strike trailing embers on its way up. ----------- */
const EMBERS = [
  { l: 44, dx: "-50%", d: 0 },
  { l: 52, dx: "60%", d: 140 },
  { l: 48, dx: "20%", d: 280 },
  { l: 56, dx: "-30%", d: 420 },
];
function PhoenixLineScene(props: TemplateProps) {
  const { lead, delayMs } = props;
  if (!lead) return <TitanRise {...props} />;
  return (
    <>
      <TitanRise {...props} />
      <Stage>
        {/* the phoenix climbs out of the strike */}
        <span className="gp-phoenix absolute block" style={{ left: "39%", top: "34%", width: "22%", height: "22%", animationDelay: `${delayMs + 720}ms` }}>
          <svg viewBox="0 0 22 22" className="block h-full w-full" aria-hidden="true">
            {/* wings, swept up */}
            <path d="M11 10 C7 8 3.5 8.5 1 12 C4.5 12.5 7.5 11.5 9.6 10.8 M11 10 C15 8 18.5 8.5 21 12 C17.5 12.5 14.5 11.5 12.4 10.8" fill="#ff9d3d" stroke="#d6234f" strokeWidth="0.6" {...SJ} />
            {/* body + head */}
            <path d="M11 8.4 C9.6 10 9.6 12 11 13.8 C12.4 12 12.4 10 11 8.4 Z" fill="#ffd76a" stroke="#d6234f" strokeWidth="0.5" {...SJ} />
            <circle cx="11" cy="7.6" r="1" fill="#d6234f" />
            <path d="M11 6.6 L11.4 5.4 L11.9 6.5 Z" fill="#ffd76a" />
            {/* tail streamers */}
            <path d="M10.4 13.8 C9.6 16.4 9.8 18.6 10.6 21 M11.6 13.8 C12.4 16.2 12.2 18.4 11.4 20.6" fill="none" stroke="#ff7a29" strokeWidth="0.7" strokeLinecap="round" />
          </svg>
        </span>
        {/* embers stream up in its wake */}
        {EMBERS.map((v, i) => (
          <span
            key={i}
            className="gp-updrift absolute block rounded-full"
            style={
              {
                left: `${v.l}%`,
                top: "58%",
                width: "1.7%",
                height: "1.7%",
                background: i % 2 ? "#ffd166" : "#ff7a29",
                "--dx": v.dx,
                animationDelay: `${delayMs + 860 + v.d}ms`,
              } as CSSProperties
            }
          />
        ))}
      </Stage>
    </>
  );
}

/* --- lost_fortnight: "skips their next turn... 20 seconds struck off" — the
   torn calendar sheds its pages, which flutter away over the board. -------- */
const PAGES = [
  { l: 46, t: 38, dx: "260%", dy: "-160%", rot: "70deg", d: 0 },
  { l: 50, t: 42, dx: "320%", dy: "-40%", rot: "-50deg", d: 160 },
  { l: 44, t: 46, dx: "280%", dy: "90%", rot: "100deg", d: 320 },
];
function LostFortnightScene(props: TemplateProps) {
  const { lead, delayMs } = props;
  if (!lead) return <ChronoLord {...props} />;
  return (
    <>
      <ChronoLord {...props} />
      <Stage>
        {PAGES.map((v, i) => (
          <span
            key={i}
            className="gp-flutter absolute block"
            style={
              {
                left: `${v.l}%`,
                top: `${v.t}%`,
                width: "4.4%",
                height: "5%",
                "--dx": v.dx,
                "--dy": v.dy,
                "--rot": v.rot,
                animationDelay: `${delayMs + 760 + v.d}ms`,
              } as CSSProperties
            }
          >
            <svg viewBox="0 0 9 10" className="block h-full w-full" aria-hidden="true">
              <rect x="0.6" y="0.6" width="7.8" height="8.8" rx="0.6" fill="#f4f6ff" stroke="#5a6b8f" strokeWidth="0.5" />
              <path d="M0.6 3 H8.4" stroke="#5a6b8f" strokeWidth="0.5" />
              <path d="M2.2 5 H6.8 M2.2 6.8 H5.6" stroke="#8a94a8" strokeWidth="0.4" strokeLinecap="round" />
            </svg>
          </span>
        ))}
      </Stage>
    </>
  );
}

/* --- noble_rout: "the nobles break and run" — noble silhouettes sprint for
   their own edge of the board, kicking up dust as they go. ----------------- */
const FLEE = [
  { t: 52, s: 6.5, d: 0, piece: "M5 1.6 C7 1.6 8 3 7.6 4.6 L6.6 5.2 L7.2 6 L6 6.4 L6.8 9.4 H3.2 C3.6 7 3 5.4 2.6 3.8 C2.4 2.6 3.4 1.6 5 1.6 Z" },
  { t: 58, s: 5.8, d: 170, piece: "M5 1 L6 2.6 L5.6 3 L6.4 5.4 L5.6 6 L6.6 9.4 H3.4 L4.4 6 L3.6 5.4 L4.4 3 L4 2.6 Z" },
  { t: 63, s: 6.2, d: 340, piece: "M2.8 2 H4 V3 H4.6 V2 H5.4 V3 H6 V2 H7.2 V4.2 H6.6 L7 9.4 H3 L3.4 4.2 H2.8 Z" },
];
function NobleRoutScene(props: TemplateProps) {
  const { palette, lead, delayMs } = props;
  const [, , p2] = palette;
  if (!lead) return <HostMarch {...props} />;
  return (
    <>
      <HostMarch {...props} />
      <Stage>
        {FLEE.map((v, i) => (
          <span key={i} className="gp-flee absolute block" style={{ left: "40%", top: `${v.t}%`, width: `${v.s}%`, height: `${v.s * 1.5}%`, animationDelay: `${delayMs + 620 + v.d}ms` }}>
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <path d={v.piece} fill="#2b1218" stroke={p2} strokeWidth="0.4" {...SJ} />
            </svg>
          </span>
        ))}
        {/* skid dust behind the rout */}
        {FLEE.map((v, i) => (
          <span
            key={`d${i}`}
            className="gp-spark absolute block rounded-full"
            style={
              {
                left: "39%",
                top: `${v.t + 6}%`,
                width: "2.2%",
                height: "2.2%",
                background: tint(p2, 0.6),
                "--dx": "-160%",
                "--dy": "-40%",
                "--rot": "0deg",
                animationDelay: `${delayMs + 700 + v.d}ms`,
              } as CSSProperties
            }
          />
        ))}
      </Stage>
    </>
  );
}

/* --- total_plunder: "steal ALL your opponent's active buffs" — a fountain of
   gold coins is sucked up off the board into the maw, which gulps. --------- */
const COINS = [
  { dx: "-260%", dy: "420%", d: 0 },
  { dx: "180%", dy: "460%", d: 70 },
  { dx: "-80%", dy: "500%", d: 140 },
  { dx: "300%", dy: "380%", d: 210 },
  { dx: "40%", dy: "540%", d: 280 },
  { dx: "-340%", dy: "360%", d: 350 },
  { dx: "220%", dy: "520%", d: 420 },
];
function TotalPlunderScene(props: TemplateProps) {
  const { lead, delayMs } = props;
  if (!lead) return <AbyssMaw {...props} />;
  return (
    <>
      <AbyssMaw {...props} />
      <Stage>
        {/* the hoard, hoovered up into the maw */}
        {COINS.map((v, i) => (
          <span
            key={i}
            className="gp-mote absolute block"
            style={
              {
                left: "48.7%",
                top: "44%",
                width: "2.6%",
                height: "2.6%",
                "--dx": v.dx,
                "--dy": v.dy,
                animationDelay: `${delayMs + 380 + v.d}ms`,
              } as CSSProperties
            }
          >
            <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
              <circle cx="5" cy="5" r="4.2" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.7" />
              <path d="M5 2.8 V7.2 M3.4 4 H6.6" stroke="#8a6a3a" strokeWidth="0.6" strokeLinecap="round" />
            </svg>
          </span>
        ))}
        {/* the maw's satisfied gulp */}
        <span
          className="gp-flash absolute block rounded-full"
          style={{ left: "44%", top: "42.5%", width: "12%", height: "8%", background: tint("#ffd76a", 0.75), animationDelay: `${delayMs + 1080}ms` }}
        />
      </Stage>
    </>
  );
}

/* --- leaden_limbs: "at most one square in any direction" — great iron
   kettlebell weights drop onto the ranks and SIT there, heavy. ------------- */
const WEIGHTS = [
  { l: 31, t: 40, s: 8, d: 0 },
  { l: 47, t: 37, s: 10, d: 200 },
  { l: 64, t: 41, s: 8, d: 400 },
];
function LeadenLimbsScene(props: TemplateProps) {
  const { palette, lead, delayMs } = props;
  const [, p1] = palette;
  if (!lead) return <ForgeColossus {...props} />;
  return (
    <>
      <ForgeColossus {...props} />
      <Stage>
        {WEIGHTS.map((v, i) => (
          <span key={i} className="gp-pod absolute block" style={{ left: `${v.l}%`, top: `${v.t}%`, width: `${v.s}%`, height: `${v.s * 1.2}%`, animationDelay: `${delayMs + 520 + v.d}ms` }}>
            <svg viewBox="0 0 10 12" className="block h-full w-full" aria-hidden="true">
              <path d="M3.4 4 V3 A1.6 1.6 0 0 1 6.6 3 V4" fill="none" stroke="#2c2c32" strokeWidth="1" strokeLinecap="round" />
              <circle cx="5" cy="7.4" r="3.6" fill="#6e6e78" stroke="#2c2c32" strokeWidth="0.6" />
              <path d="M3.4 6 C3.8 5.3 4.6 5 5.3 5.3" fill="none" stroke={tint(p1, 0.9)} strokeWidth="0.5" strokeLinecap="round" />
            </svg>
          </span>
        ))}
        {/* dust chuffs out where each one lands */}
        {WEIGHTS.map((v, i) => (
          <span
            key={`d${i}`}
            className="gp-spark absolute block rounded-full"
            style={
              {
                left: `${v.l + v.s / 2}%`,
                top: `${v.t + v.s}%`,
                width: "2.4%",
                height: "2.4%",
                background: "rgba(200,200,210,0.6)",
                "--dx": i % 2 ? "180%" : "-180%",
                "--dy": "-60%",
                "--rot": "0deg",
                animationDelay: `${delayMs + 900 + v.d}ms`,
              } as CSSProperties
            }
          />
        ))}
      </Stage>
    </>
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
  /* --- GodDescent --------------------------------------------------------- */
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
      <circle cx="4.4" cy="2" r="0.4" fill="#ffffff" />
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
      <path d="M6 3 A2.2 2.2 0 1 1 6 7" fill="none" stroke="#ffffff" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M4.6 1.6 L5.4 0.6 M4.8 8.4 L5.6 9.4" stroke="#5fc9b0" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  // ascending spark trail
  transcendence: (
    <Gl>
      <path d="M2.6 8.2 L3.4 9 L2.6 9.8 L1.8 9 Z" fill="#b98cff" />
      <path d="M4.8 4.6 L6 5.8 L4.8 7 L3.6 5.8 Z" fill="#ffd76a" />
      <path d="M7 0.6 L8.6 2.2 L7 3.8 L5.4 2.2 Z" fill="#ffffff" stroke="#b98cff" strokeWidth="0.4" {...SJ} />
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

  /* --- TitanRise ----------------------------------------------------------- */
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

  /* --- SkyWrath ------------------------------------------------------------ */
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
      <path d="M5.6 4.4 L3.6 7 L5 7.3 L4.2 9.6 L6.6 6.6 L5.2 6.3 L6.4 4.4 Z" fill="#ffffff" stroke="#b98cff" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),

  /* --- AbyssMaw ------------------------------------------------------------ */
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

  /* --- HostMarch ------------------------------------------------------------- */
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

  /* --- CelestialRing --------------------------------------------------------- */
  // sprouting seed
  genesis: (
    <Gl>
      <ellipse cx="5" cy="7.6" rx="1.4" ry="1.1" fill="#ffd76a" stroke="#7a9a4e" strokeWidth="0.4" />
      <path d="M5 6.6 V4" fill="none" stroke="#a8e07f" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M5 4 C3.6 4 2.8 3 2.8 1.8 C4.2 1.8 5 2.8 5 4 Z M5 4 C6.4 4 7.2 3 7.2 1.8 C5.8 1.8 5 2.8 5 4 Z" fill="#a8e07f" stroke="#7a9a4e" strokeWidth="0.35" {...SJ} />
      <circle cx="7.6" cy="1" r="0.4" fill="#ffffff" />
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
      <circle cx="3.4" cy="6" r="0.55" fill="#ffffff" />
      <circle cx="5" cy="5" r="0.55" fill="#6fe3ff" />
      <circle cx="6.6" cy="4" r="0.55" fill="#ffffff" />
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
      <circle cx="5" cy="5" r="0.6" fill="#ffffff" />
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

  /* --- FrostTitan ------------------------------------------------------------ */
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
      <circle cx="5" cy="5" r="0.6" fill="#ffffff" stroke="#3f7fb5" strokeWidth="0.3" />
    </Gl>
  ),
  // zero in a crystal
  absolute_zero: (
    <Gl>
      <path d="M5 0.6 L9 5 L5 9.4 L1 5 Z" fill="#bfe6ff" stroke="#1c3a5e" strokeWidth="0.5" {...SJ} />
      <ellipse cx="5" cy="5" rx="1.3" ry="1.9" fill="#ffffff" stroke="#1c3a5e" strokeWidth="0.55" />
    </Gl>
  ),
  // ice shard
  everfrost_shard: (
    <Gl>
      <path d="M5 0.4 L7.2 4.4 L5 9.6 L2.8 4.4 Z" fill="#9fd8ff" stroke="#8f6bff" strokeWidth="0.5" {...SJ} />
      <path d="M5 1.6 V8.2" stroke="#e8f8ff" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),

  /* --- ForgeColossus (the glyph IS the colossal implement) -------------------- */
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

  /* --- GorgonIdol ------------------------------------------------------------- */
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

  /* --- ChronoLord -------------------------------------------------------------- */
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

/** Bind a template + palette + glyph + config (+ per-card flourish key) into
 * a SigPlugin entry. The flourish string is the card's structural uniqueness
 * marker inside a shared template — see TemplateProps.flourish. */
function G(
  Template: ComponentType<TemplateProps>,
  palette: Palette,
  glyph: ReactNode,
  config: SigPlugin["config"],
  flourish?: string,
): SigPlugin {
  return {
    config,
    Render: function GodPlayRender({ lead, delayMs }: { lead: boolean; delayMs: number }) {
      return <Template palette={palette} glyph={glyph} lead={lead} delayMs={delayMs} flourish={flourish} />;
    },
  };
}

export const PLAYS: Record<string, SigPlugin> = {
  /* --- GodDescent ------------------------------------------------------- */
  draft_tyranny: G(GodDescent, ["#d6234f", "#ffd76a", "#1c0f18"], GLYPH.draft_tyranny, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "coronation",
  }, "tier_brand"),
  sovereign_draft: G(GodDescent, ["#ffd76a", "#fff7de", "#c9a84c"], GLYPH.sovereign_draft, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "coronation",
  }, "twin_claim"),
  draft_supremacy: G(GodDescent, ["#ffd76a", "#d6234f", "#ffffff"], GLYPH.draft_supremacy, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "coronation",
  }, "draft_seize"),
  divine_legion: G(GodDescent, ["#fff2c9", "#ffd76a", "#b98cff"], GLYPH.divine_legion, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "crownrain", source: "summon",
  }),
  absolute_aegis: G(GodDescent, ["#5fc9b0", "#ffd76a", "#e8fff7"], GLYPH.absolute_aegis, {
    ordering: "radial", staggerMs: 40, victims: "all", hasLead: true, sound: "aegis", source: "shield",
  }, "aegis_dome"),
  checkmate_denial: G(GodDescent, ["#dfe8ff", "#ffd76a", "#5a8fc0"], GLYPH.checkmate_denial, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "shades", source: "kingSafe",
  }, "king_ward"),
  full_pardon: G(GodDescent, ["#ffffff", "#ffd76a", "#5fc9b0"], GLYPH.full_pardon, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cathedral",
  }, "chain_snap"),
  transcendence: G(GodDescent, ["#b98cff", "#ffd76a", "#ffffff"], GLYPH.transcendence, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "coronation",
  }, "ascension"),
  mind_empire: G(GodDescent, ["#8f2bbf", "#e3d0ff", "#ffd76a"], GLYPH.mind_empire, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
  }, "mind_seize"),
  mass_mind_control: G(GodDescent, ["#c94ad1", "#12081f", "#6fe3ff"], GLYPH.mass_mind_control, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
  }, "twin_thrall"),
  throne_and_silence: G(GodDescent, ["#5a6b8f", "#ffd76a", "#c9cdd6"], GLYPH.throne_and_silence, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "snooze", source: "stun",
  }, "hush_veil"),
  abdication_edict: G(GodDescent, ["#6b4a8f", "#ffd76a", "#2a1030"], GLYPH.abdication_edict, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "snooze", source: "stun",
  }, "crown_topple"),
  wa_dominate_major: G(GodDescent, ["#8f2bbf", "#ffd76a", "#e3d0ff"], GLYPH.wa_dominate_major, {
    ordering: "radial", staggerMs: 60, victims: ["r", "q"], hasLead: true, sound: "shades",
  }, "puppet_strings"),

  /* --- TitanRise ---------------------------------------------------------- */
  great_divide: G(TitanRise, ["#b0a68f", "#8a7a63", "#ffd76a"], GLYPH.great_divide, {
    ordering: "sweep", staggerMs: 70, victims: "all", hasLead: true, sound: "wall", source: "blindfold",
  }, "rank_wall"),
  sundering: G(TitanRise, ["#5c5348", "#ff9d3d", "#d9d2c0"], GLYPH.sundering, {
    ordering: "sweep", staggerMs: 70, victims: "all", hasLead: true, sound: "cataclysm", source: "blindfold",
  }, "triple_rift"),
  fortress_realm: G(TitanRise, ["#8a94a8", "#5fc9b0", "#d9d2c0"], GLYPH.fortress_realm, {
    ordering: "radial", staggerMs: 50, victims: "all", hasLead: true, sound: "cathedral", source: "shield",
  }, "keep_walls"),
  molten_heart: G(TitanRise, ["#ff5c1a", "#e6432c", "#3a1c12"], GLYPH.molten_heart, {
    ordering: "sweep", staggerMs: 70, victims: "all", hasLead: true, sound: "cataclysm", source: "blindfold",
  }, "magma_veins"),
  salted_earth: G(SaltedEarthScene, ["#e8dcc0", "#b0a68f", "#8faf4a"], GLYPH.salted_earth, {
    ordering: "sweep", staggerMs: 70, victims: ["p"], hasLead: true, sound: "extinction",
  }),
  unshackled_wrath: G(TitanRise, ["#e6432c", "#3a3a40", "#ffd166"], GLYPH.unshackled_wrath, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz", source: "stun",
  }),
  phoenix_line: G(PhoenixLineScene, ["#ff7a29", "#ffd76a", "#d6234f"], GLYPH.phoenix_line, {
    ordering: "sweep", staggerMs: 80, victims: ["p"], hasLead: true, sound: "wall", source: "summon",
  }),

  /* --- SkyWrath ------------------------------------------------------------ */
  chain_atomic: G(ChainAtomic, ["#ff9d3d", "#e6432c", "#ffd166"], GLYPH.chain_atomic, {
    ordering: "octagon", staggerMs: 70, victims: "all", hasLead: true, sound: "atomic",
  }),
  total_atomic: G(TotalAtomic, ["#e6432c", "#7a1a10", "#ffd166"], GLYPH.total_atomic, {
    ordering: "octagon", staggerMs: 70, victims: "all", hasLead: true, sound: "atomic",
  }),
  scorched_earth: G(SkyWrath, ["#ff7a29", "#3a1c12", "#ffb454"], GLYPH.scorched_earth, {
    ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "cataclysm", source: "blindfold",
  }, "firefield"),
  rift_storm: G(SkyWrath, ["#8f6bff", "#12081f", "#6fe3ff"], GLYPH.rift_storm, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "lightning",
  }),
  queen_storm: G(SkyWrath, ["#ffd76a", "#b98cff", "#ffffff"], GLYPH.queen_storm, {
    ordering: "sweep", staggerMs: 70, victims: ["p"], hasLead: true, sound: "crownrain",
  }, "crown_rain"),

  /* --- AbyssMaw ------------------------------------------------------------- */
  buff_plunder: G(AbyssMaw, ["#ffd76a", "#8f2bbf", "#2a2a38"], GLYPH.buff_plunder, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "rampage",
  }),
  total_plunder: G(TotalPlunderScene, ["#ffd76a", "#1c0f18", "#c94ad1"], GLYPH.total_plunder, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "rampage",
  }),
  grand_nullify: G(AbyssMaw, ["#8a94a8", "#8f6bff", "#eef1f7"], GLYPH.grand_nullify, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
  }, "sigil_snuff"),
  absolute_nullify: G(AbyssMaw, ["#3a3a45", "#c94a5a", "#c9cdd6"], GLYPH.absolute_nullify, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
  }, "double_void"),

  /* --- ReaperSweep ------------------------------------------------------------ */
  endless_night: G(EndlessNight, ["#2c3e6b", "#cdd6ff", "#8a94a8"], GLYPH.endless_night, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "shades", source: "slow",
  }),
  peace_of_the_grave: G(ReaperSweep, ["#eef1f7", "#8a94a8", "#5fae7f"], GLYPH.peace_of_the_grave, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "extinction",
  }, "grave_cordon"),
  withered_hands: G(ReaperSweep, ["#8a94a8", "#6b4a8f", "#c9b0e8"], GLYPH.withered_hands, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "petrify",
  }),
  grand_malediction: G(ReaperSweep, ["#6b4a8f", "#8faf4a", "#2a1030"], GLYPH.grand_malediction, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "shades", source: "slow",
  }, "hex_seal"),
  blighted_furrows: G(ReaperSweep, ["#8faf4a", "#5c5348", "#2f3a26"], GLYPH.blighted_furrows, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true, sound: "extinction",
  }, "crop_rot"),
  // APEX (tier 9) — bespoke SkullStrike set piece: death's bowling night.
  culling: G(SkullStrike, ["#d6234f", "#1c1c22", "#eef1f7"], GLYPH.culling, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "extinction",
  }),
  poisoned_counsel: G(ReaperSweep, ["#8faf4a", "#2f3a26", "#c9b0e8"], GLYPH.poisoned_counsel, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "petrify",
  }, "venom_pour"),

  /* --- HostMarch --------------------------------------------------------------- */
  age_of_heroes: G(HostMarch, ["#ffd76a", "#c94a3a", "#fff2c9"], GLYPH.age_of_heroes, {
    ordering: "sweep", staggerMs: 60, victims: ["n", "b", "r"], hasLead: true, sound: "blitz", source: "rally",
  }),
  grand_retreat: G(HostMarch, ["#5a8fc0", "#c9cdd6", "#ffd76a"], GLYPH.grand_retreat, {
    ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz",
  }, "about_face"),
  noble_rout: G(NobleRoutScene, ["#6b1a2a", "#c9cdd6", "#e8b04b"], GLYPH.noble_rout, {
    ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "rampage",
  }),
  sacked_capital: G(HostMarch, ["#ff9d3d", "#2b1218", "#c94a3a"], GLYPH.sacked_capital, {
    ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "cataclysm", source: "slow",
  }, "city_burn"),

  /* --- CelestialRing -------------------------------------------------------------- */
  genesis: G(CelestialRing, ["#a8e07f", "#ffffff", "#ffd76a"], GLYPH.genesis, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cathedral",
  }, "board_reborn"),
  reality_warp: G(CelestialRing, ["#c94ad1", "#6fe3ff", "#e3d0ff"], GLYPH.reality_warp, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage",
  }, "matter_rewrite"),
  total_warp: G(CelestialRing, ["#5b2b8f", "#6fe3ff", "#ffd76a"], GLYPH.total_warp, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage",
  }),
  warp_cataclysm: G(CelestialRing, ["#6fe3ff", "#8f6bff", "#ffffff"], GLYPH.warp_cataclysm, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage",
  }, "quad_blink"),
  warp_sovereign: G(CelestialRing, ["#8f6bff", "#ffd76a", "#e3d0ff"], GLYPH.warp_sovereign, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage",
  }, "triple_swap"),
  nerf_reversal: G(CelestialRing, ["#a8e07f", "#8f6bff", "#ffffff"], GLYPH.nerf_reversal, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis",
  }, "polarity_flip"),
  celestial_alignment: G(CelestialRing, ["#2c3e6b", "#cdd6ff", "#ffd76a"], GLYPH.celestial_alignment, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "clockice", source: "frozen",
  }, "starlock"),
  // APEX (tier 9) — bespoke PlanetAlign set piece: the planets align.
  grand_conjunction: G(PlanetAlign, ["#3b1a5e", "#e3d0ff", "#ffd76a"], GLYPH.grand_conjunction, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "clockice", source: "frozen",
  }),

  /* --- FrostTitan ---------------------------------------------------------------- */
  glacial_tomb: G(FrostTitan, ["#9fd8ff", "#e8f8ff", "#4f8fd1"], GLYPH.glacial_tomb, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen",
  }, "ice_tombs"),
  frozen_solid: G(FrostTitan, ["#6fe3ff", "#ffffff", "#3f7fb5"], GLYPH.frozen_solid, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen",
  }),
  absolute_zero: G(AbsoluteZero, ["#bfe6ff", "#ffffff", "#1c3a5e"], GLYPH.absolute_zero, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen",
  }),
  everfrost_shard: G(FrostTitan, ["#9fd8ff", "#8f6bff", "#e8f8ff"], GLYPH.everfrost_shard, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen",
  }, "shard_aura"),

  /* --- ForgeColossus --------------------------------------------------------------- */
  ban_hammer: G(BanHammerScene, ["#4fa3d1", "#8a94a8", "#ffd76a"], GLYPH.ban_hammer, {
    ordering: "sweep", staggerMs: 80, victims: ["n", "b", "r"], hasLead: true, sound: "siege",
  }),
  dragonslayer: G(ForgeColossus, ["#c9cdd6", "#d6234f", "#ffd76a"], GLYPH.dragonslayer, {
    ordering: "radial", staggerMs: 0, victims: ["r", "q"], hasLead: true, sound: "siege",
  }),
  world_lock: G(ForgeColossus, ["#8a94a8", "#4fa3d1", "#ffd76a"], GLYPH.world_lock, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage",
  }, "border_chain"),
  sealed_archive: G(ForgeColossus, ["#c9a84c", "#8a6a3a", "#e8dcc0"], GLYPH.sealed_archive, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "wall",
  }, "vault_brick"),
  sealed_ramparts: G(ForgeColossus, ["#8a94a8", "#5c5c63", "#c94a3a"], GLYPH.sealed_ramparts, {
    ordering: "sweep", staggerMs: 70, victims: ["r"], hasLead: true, sound: "wall",
  }, "portcullis_drop"),
  leaden_limbs: G(LeadenLimbsScene, ["#6e6e78", "#c9a84c", "#3a3a40"], GLYPH.leaden_limbs, {
    ordering: "sweep", staggerMs: 70, victims: "all", hasLead: true, sound: "petrify",
  }),

  /* --- GorgonIdol ------------------------------------------------------------------ */
  walnut_court: G(GorgonIdol, ["#8a6a4a", "#c9b89a", "#7fae5a"], GLYPH.walnut_court, {
    ordering: "sweep", staggerMs: 60, victims: ["r"], hasLead: true, sound: "petrify", source: "walnut",
  }, "court_walnuts"),
  obsidian_bastions: G(GorgonIdol, ["#2a2a35", "#8f6bff", "#8a94a8"], GLYPH.obsidian_bastions, {
    ordering: "sweep", staggerMs: 60, victims: ["r"], hasLead: true, sound: "petrify", source: "walnut",
  }, "glass_towers"),
  statue_garden: G(GorgonIdol, ["#8d8d94", "#7fae5a", "#c9c9cf"], GLYPH.statue_garden, {
    ordering: "sweep", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "petrifiedforest", source: "walnut",
  }, "garden_plinths"),
  cockatrice_gaze: G(GorgonIdol, ["#7fae5a", "#e8b04b", "#2f3a26"], GLYPH.cockatrice_gaze, {
    ordering: "sweep", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "petrify", source: "walnut",
  }),
  chisel_curse: G(GorgonIdol, ["#b0a68f", "#8d8d94", "#e8dcc0"], GLYPH.chisel_curse, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "petrify", source: "walnut",
  }, "chisel_spread"),
  crown_and_castle: G(GorgonIdol, ["#ffd76a", "#8d8d94", "#8a6a4a"], GLYPH.crown_and_castle, {
    ordering: "sweep", staggerMs: 60, victims: ["q", "r"], hasLead: true, sound: "petrifiedforest", source: "walnut",
  }, "heavy_court"),

  /* --- ChronoLord ------------------------------------------------------------------- */
  full_rewind: G(ChronoLord, ["#6fe3ff", "#ffd76a", "#2a2a38"], GLYPH.full_rewind, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage",
  }, "time_reverse"),
  endless_turn: G(ChronoLord, ["#e6432c", "#ffd76a", "#ffffff"], GLYPH.endless_turn, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz", source: "rally",
  }),
  lost_fortnight: G(LostFortnightScene, ["#5a6b8f", "#cdd6ff", "#ffd76a"], GLYPH.lost_fortnight, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "snooze", source: "slow",
  }),
  sabbatical: G(SabbaticalScene, ["#5fc9b0", "#fff7de", "#ffd76a"], GLYPH.sabbatical, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "snooze",
  }),
};
