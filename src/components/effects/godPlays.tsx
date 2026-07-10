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
  /** Legacy boost knob (kept for future upgrades): >0 arms a template's extra
   * beat — ReaperSweep's third shockwave, CelestialRing's ray pass. The two
   * tier-9 cards that used it (culling, grand_conjunction) now run their own
   * bespoke APEX templates instead. */
  extra?: number;
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
  { r: "-28deg", d: 0, w: "7%" },
  { r: "-14deg", d: 60, w: "9%" },
  { r: "0deg", d: 30, w: "11%" },
  { r: "14deg", d: 90, w: "9%" },
  { r: "28deg", d: 120, w: "7%" },
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
            height: "60%",
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
  top = 57,
  sizePct = 5,
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
  sizePct = 7,
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
      <span
        className="gp-flash absolute block rounded-full"
        style={{ left: "20%", top: "20%", width: "60%", height: "60%", background: tint(p1, 0.5), animationDelay: `${delayMs}ms` }}
      />
      <span className="gp-pop absolute block" style={{ left: "22%", top: "20%", width: "56%", height: "56%", animationDelay: `${delayMs + 60}ms` }}>
        {glyph}
      </span>
      <span
        className="gp-tring absolute block rounded-full"
        style={{ left: "14%", top: "14%", width: "72%", height: "72%", border: `2px solid ${tint(p1, 0.95)}`, animationDelay: `${delayMs + 140}ms` }}
      />
      {HIT_SPARKS.map((v, i) => (
        <span
          key={i}
          className="gp-spark absolute block"
          style={
            {
              left: "41%",
              top: "41%",
              width: "18%",
              height: "18%",
              "--dx": v.dx,
              "--dy": v.dy,
              "--rot": v.rot,
              animationDelay: `${delayMs + 120 + v.d}ms`,
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
function GodDescent({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.28)} delayMs={delayMs} />
      <RayFan hex={p1} delayMs={delayMs} />
      {/* the colossal deity, descending into the light */}
      <span className="gp-descend absolute block" style={{ left: "36%", top: "21%", width: "28%", height: "46%", animationDelay: `${delayMs + 180}ms` }}>
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
        style={{ left: "38%", top: "55%", width: "24%", height: "16%", background: tint(p1, 0.8), animationDelay: `${delayMs + 520}ms` }}
      />
      <Sparks delayMs={delayMs + 560} fill={p1} stroke={p2} sizePct={7} />
      <Boom delayMs={delayMs + 600} color={tint(p1, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 720} color={tint(p0, 0.8)} />
      <Glint delayMs={delayMs + 1050} color={p1} />
    </Stage>
  );
}

/* =============================================================================
   Template 2: TitanRise — a colossal stone titan shoulders up from below the
   board amid rubble arcs, the glyph branded on its torso.
   ========================================================================== */
function TitanRise({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.26)} delayMs={delayMs} />
      {/* rubble kicked up as the ground splits */}
      <Lobs delayMs={delayMs + 120} fill={tint(p0, 0.95)} stroke={p2} />
      {/* the titan shouldering up from below */}
      <span className="gp-rise absolute block" style={{ left: "35%", top: "26%", width: "30%", height: "46%", animationDelay: `${delayMs + 160}ms` }}>
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
        style={{ left: "37%", top: "56%", width: "26%", height: "14%", background: tint(p1, 0.75), animationDelay: `${delayMs + 600}ms` }}
      />
      <Sparks delayMs={delayMs + 640} fill={p1} stroke={p2} sizePct={6} cy={58} />
      <Boom delayMs={delayMs + 680} color={tint(p1, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 800} color={tint(p0, 0.8)} />
      <Glint delayMs={delayMs + 1080} color={p1} left={48} top={22} />
    </Stage>
  );
}

/* =============================================================================
   Template 3: SkyWrath — a storm-god torso manifests in a cloud bank at the
   top of the sky and hurls a jagged bolt down to a central strike flash.
   ========================================================================== */
function SkyWrath({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.25)} delayMs={delayMs} />
      {/* the cloud bank + storm-god torso, boiling in at the top */}
      <span className="gp-descend absolute block" style={{ left: "24%", top: "5%", width: "52%", height: "22%", animationDelay: `${delayMs + 100}ms` }}>
        <svg viewBox="0 0 48 22" className="block h-full w-full" aria-hidden="true">
          {/* storm halo */}
          <circle cx="24" cy="8" r="6.4" fill="none" stroke={tint(p2, 0.9)} strokeWidth="1" />
          {/* cloud bank */}
          <path
            d="M2 19 Q4 11 10 13 Q12 5 19 8 Q25 1 31 7 Q40 4 42 12 Q47 14 46 19 Z"
            fill={tint(p1, 0.85)}
            stroke={tint(p2, 0.8)}
            strokeWidth="1"
            {...SJ}
          />
          {/* the god's shoulders + head, rising out of the bank */}
          <path d="M17 19 C18 13 20.5 11.5 24 11.5 C27.5 11.5 30 13 31 19 Z" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="0.8" {...SJ} />
          <circle cx="24" cy="8.6" r="2.6" fill={tint(p0, 0.92)} stroke={p2} strokeWidth="0.7" />
          {/* the hurling arm */}
          <path d="M30 13.5 L38.5 8.5" stroke={tint(p0, 0.9)} strokeWidth="2" strokeLinecap="round" />
        </svg>
        {/* the card's glyph, set inside the storm halo */}
        <span className="absolute block" style={{ left: "46%", top: "4%", width: "8%", height: "22%" }}>{glyph}</span>
      </span>
      {/* the jagged bolt, cracking down to the board centre */}
      <span className="gp-bolt absolute block" style={{ left: "44%", top: "24%", width: "12%", height: "32%", animationDelay: `${delayMs + 480}ms` }}>
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
        style={{ left: "40%", top: "50%", width: "20%", height: "14%", background: tint(p2, 0.85), animationDelay: `${delayMs + 620}ms` }}
      />
      <Sparks delayMs={delayMs + 660} fill={p2} stroke={p1} sizePct={6} cy={56} />
      <Boom delayMs={delayMs + 700} color={tint(p2, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 820} color={tint(p0, 0.8)} />
      <Glint delayMs={delayMs + 1080} color={p2} left={47} top={44} />
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
function AbyssMaw({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      {/* gathering darkness instead of light */}
      <Wash color={tint(p2, 0.42)} delayMs={delayMs} />
      {/* the vast void maw, yawning open mid-board */}
      <span className="gp-maw absolute block" style={{ left: "31%", top: "30%", width: "38%", height: "26%", animationDelay: `${delayMs + 150}ms` }}>
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
              top: "41%",
              width: "2.5%",
              height: "2.5%",
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
        style={{ left: "42%", top: "37%", width: "16%", height: "11%", background: tint(p1, 0.7), animationDelay: `${delayMs + 700}ms` }}
      />
      <Sparks delayMs={delayMs + 740} fill={p0} stroke={p1} sizePct={5} cy={42} />
      <Boom delayMs={delayMs + 780} color={tint(p1, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 900} color={tint(p0, 0.8)} />
      <Glint delayMs={delayMs + 1140} color={p0} left={47} top={38} />
    </Stage>
  );
}

/* =============================================================================
   Template 5: ReaperSweep — a colossal hooded reaper strides across the whole
   crop sweeping a scythe arc; the glyph hangs as its lantern/pendant.
   ========================================================================== */
function ReaperSweep({ palette, glyph, lead, delayMs, extra = 0 }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.3)} delayMs={delayMs} />
      {/* the reaper, striding across the crop */}
      <span className="gp-stride absolute block" style={{ left: "31%", top: "22%", width: "32%", height: "46%", animationDelay: `${delayMs + 120}ms` }}>
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
      <span className="gp-scythe absolute block" style={{ left: "28%", top: "28%", width: "44%", height: "32%", animationDelay: `${delayMs + 460}ms` }}>
        <svg viewBox="0 0 44 32" className="block h-full w-full" aria-hidden="true">
          <path d="M4 22 C16 28 30 28 40 20" stroke={tint(p1, 0.5)} strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M2 26 C14 32 30 32 42 24 C32 28 16 28 6 22 Z" fill={tint(p1, 0.9)} stroke={p2} strokeWidth="0.8" {...SJ} />
        </svg>
      </span>
      {/* harvest flare + sparks + graven shockwaves */}
      <span
        className="gp-flash absolute block rounded-full"
        style={{ left: "39%", top: "52%", width: "22%", height: "13%", background: tint(p1, 0.7), animationDelay: `${delayMs + 720}ms` }}
      />
      <Sparks delayMs={delayMs + 760} fill={p1} stroke={p0} sizePct={5} cy={56} />
      <Boom delayMs={delayMs + 800} color={tint(p1, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 920} color={tint(p0, 0.8)} />
      {/* tier-9 boost (culling): a third wave rolls out */}
      {extra > 0 && <Boom delayMs={delayMs + 1040} color={tint(p2, 0.85)} thickness={2} />}
      <Glint delayMs={delayMs + 1160} color={p1} left={44} top={20} />
    </Stage>
  );
}

/* =============================================================================
   Template 6: HostMarch — a heraldic war-host (spear rank + banners) marches
   across the board width behind a giant commander standard bearing the glyph.
   ========================================================================== */
function HostMarch({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.25)} delayMs={delayMs} />
      {/* the war-host, marching across the board width */}
      <span className="gp-march absolute block" style={{ left: "18%", top: "34%", width: "64%", height: "26%", animationDelay: `${delayMs + 100}ms` }}>
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
          <path d="M20 26 V4 M44 26 V4" stroke={tint(p2, 0.9)} strokeWidth="0.9" />
          <path d="M20 4 H27 L25 7 L27 10 H20 Z M44 4 H37 L39 7 L37 10 H44 Z" fill={tint(p0, 0.9)} stroke={p2} strokeWidth="0.5" {...SJ} />
          {/* the giant commander standard */}
          <path d="M32 26 V1.5" stroke={p2} strokeWidth="1.2" />
          <circle cx="32" cy="1.6" r="1" fill={p1} />
          <path d="M25.5 3.5 H38.5 V14 L32 17 L25.5 14 Z" fill={tint(p1, 0.9)} stroke={p2} strokeWidth="0.8" {...SJ} />
          {/* shield row at the host's feet */}
          <path
            d="M2 26 C6 22 10 22 14 26 M14 26 C18 22 22 22 26 26 M38 26 C42 22 46 22 50 26 M50 26 C54 22 58 22 62 26"
            fill={tint(p0, 0.85)}
            stroke={p2}
            strokeWidth="0.7"
          />
        </svg>
        {/* the card's glyph, borne on the commander standard */}
        <span className="absolute block" style={{ left: "43%", top: "15%", width: "14%", height: "36%" }}>{glyph}</span>
      </span>
      {/* dust kicked up by the march */}
      <Sparks delayMs={delayMs + 520} fill={p1} stroke={p2} sizePct={5} cx={44} cy={60} />
      {/* the host's war-cry: flare + shockwaves rolling past the edges */}
      <span
        className="gp-flash absolute block rounded-full"
        style={{ left: "42%", top: "42%", width: "18%", height: "13%", background: tint(p1, 0.7), animationDelay: `${delayMs + 820}ms` }}
      />
      <Boom delayMs={delayMs + 880} color={tint(p1, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 1000} color={tint(p0, 0.8)} />
      <Glint delayMs={delayMs + 1200} color={p1} left={52} top={30} />
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
function CelestialRing({ palette, glyph, lead, delayMs, extra = 0 }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.25)} delayMs={delayMs} />
      {/* tier-9 boost (grand conjunction): a god-fan breaks with the ring */}
      {extra > 0 && <RayFan hex={p1} delayMs={delayMs + 60} />}
      {/* the vast rune ring, settling flat out of the sky */}
      <span className="gp-ringset absolute block" style={{ left: "22%", top: "22%", width: "56%", height: "56%", animationDelay: `${delayMs + 120}ms` }}>
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
        <span className="absolute block" style={{ left: "36%", top: "36%", width: "28%", height: "28%" }}>{glyph}</span>
      </span>
      {/* constellation sparks lighting around the ring */}
      {STARS.map((s, i) => (
        <span key={i} className="gp-glint absolute block" style={{ left: `${s.l}%`, top: `${s.t}%`, width: "4%", height: "4%", animationDelay: `${delayMs + 420 + s.d}ms` }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
            <path d="M5 0 L6.1 3.9 L10 5 L6.1 6.1 L5 10 L3.9 6.1 L0 5 L3.9 3.9 Z" fill={i % 2 ? p2 : p1} />
          </svg>
        </span>
      ))}
      {/* alignment pulse + shockwaves */}
      <span
        className="gp-flash absolute block rounded-full"
        style={{ left: "42%", top: "44%", width: "16%", height: "12%", background: tint(p1, 0.7), animationDelay: `${delayMs + 760}ms` }}
      />
      <Boom delayMs={delayMs + 820} color={tint(p1, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 940} color={tint(p2, 0.8)} />
      <Glint delayMs={delayMs + 1160} color={p1} left={47} top={46} />
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
function FrostTitan({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.28)} delayMs={delayMs} />
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
      <Lobs delayMs={delayMs + 140} fill={tint(p0, 0.9)} stroke={p2} top={56} sizePct={4} />
      {/* the glacial colossus, rising */}
      <span className="gp-rise absolute block" style={{ left: "35%", top: "26%", width: "30%", height: "46%", animationDelay: `${delayMs + 180}ms` }}>
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
        style={{ left: "38%", top: "55%", width: "24%", height: "14%", background: tint(p1, 0.75), animationDelay: `${delayMs + 640}ms` }}
      />
      <Sparks delayMs={delayMs + 680} fill={p1} stroke={p2} sizePct={6} cy={57} />
      <Boom delayMs={delayMs + 720} color={tint(p1, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 840} color={tint(p0, 0.8)} />
      <Glint delayMs={delayMs + 1100} color={p1} left={48} top={22} />
    </Stage>
  );
}

/* =============================================================================
   Template 9: ForgeColossus — a COLOSSAL weapon/implement (the glyph itself,
   writ huge) descends and strikes the board centre: judge's-gavel double
   shockwave + sparks.
   ========================================================================== */
function ForgeColossus({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.26)} delayMs={delayMs} />
      <RayFan hex={p1} delayMs={delayMs + 40} />
      {/* the colossal implement itself — the glyph, writ huge — slamming down */}
      <span className="gp-slam absolute block" style={{ left: "33%", top: "12%", width: "34%", height: "44%", animationDelay: `${delayMs + 160}ms` }}>
        {glyph}
      </span>
      {/* impact flare + forge sparks */}
      <span
        className="gp-flash absolute block rounded-full"
        style={{ left: "36%", top: "52%", width: "28%", height: "16%", background: tint(p2, 0.85), animationDelay: `${delayMs + 560}ms` }}
      />
      <Sparks delayMs={delayMs + 600} fill={p2} stroke={p1} sizePct={7} cy={58} />
      {/* the judge's-gavel double shockwave */}
      <Boom delayMs={delayMs + 640} color={tint(p2, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 750} color={tint(p0, 0.85)} />
      <Glint delayMs={delayMs + 1050} color={p2} left={47} top={28} />
    </Stage>
  );
}

/* =============================================================================
   Template 10: GorgonIdol — a colossal gorgon/idol head rises mid-board with
   radiating petrifying gaze rings; the glyph is its crown/brow mark.
   ========================================================================== */
function GorgonIdol({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.26)} delayMs={delayMs} />
      {/* the idol head, grinding up out of the board */}
      <span className="gp-rise absolute block" style={{ left: "34%", top: "26%", width: "30%", height: "42%", animationDelay: `${delayMs + 150}ms` }}>
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
        style={{ left: "43%", top: "42%", width: "14%", height: "8%", background: tint(p1, 0.8), animationDelay: `${delayMs + 560}ms` }}
      />
      {/* ...and the petrifying gaze rolls out in rings */}
      {[0, 130, 260].map((d, i) => (
        <span
          key={i}
          className="gp-gaze absolute block rounded-full"
          style={{
            left: "24%",
            top: "21%",
            width: "52%",
            height: "52%",
            border: `${i === 0 ? 4 : 2.5}px solid ${tint(i % 2 ? p2 : p1, 0.85)}`,
            animationDelay: `${delayMs + 600 + d}ms`,
          }}
        />
      ))}
      <Sparks delayMs={delayMs + 680} fill={p1} stroke={p2} sizePct={5} cy={50} />
      <Boom delayMs={delayMs + 860} color={tint(p0, 0.85)} />
      <Glint delayMs={delayMs + 1140} color={p1} left={47} top={24} />
    </Stage>
  );
}

/* =============================================================================
   Template 11: ChronoLord — a giant hourglass-and-clock time sovereign
   descends; a great clock ring with a sweeping hand; the glyph sits at the
   12 o'clock seat.
   ========================================================================== */
function ChronoLord({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.25)} delayMs={delayMs} />
      {/* the great clock ring settles over the board */}
      <span className="gp-ringset absolute block" style={{ left: "25%", top: "30%", width: "50%", height: "50%", animationDelay: `${delayMs + 120}ms` }}>
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
        style={{ left: "49.25%", top: "41%", width: "1.5%", height: "14%", background: `linear-gradient(180deg, ${tint(p1, 0.95)}, transparent)`, animationDelay: `${delayMs + 420}ms` }}
      />
      {/* the time sovereign, descending above the ring */}
      <span className="gp-descend absolute block" style={{ left: "37%", top: "13%", width: "26%", height: "40%", animationDelay: `${delayMs + 180}ms` }}>
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
        style={{ left: "42%", top: "50%", width: "16%", height: "11%", background: tint(p1, 0.75), animationDelay: `${delayMs + 800}ms` }}
      />
      <Sparks delayMs={delayMs + 840} fill={p1} stroke={p2} sizePct={5} cy={54} />
      <Boom delayMs={delayMs + 880} color={tint(p1, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 1000} color={tint(p0, 0.8)} />
      <Glint delayMs={delayMs + 1220} color={p1} left={47} top={26} />
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
      <Bars delayMs={delayMs} />
      {/* the lane shine, waxed for the occasion */}
      <span
        className="gp-pane absolute block"
        style={{
          left: "12%",
          top: "46%",
          width: "76%",
          height: "11%",
          background: `linear-gradient(90deg, ${tint(p2, 0.5)}, ${tint(p0, 0.25)} 70%, transparent)`,
          animationDelay: `${delayMs + 80}ms`,
          animationDuration: "1.4s",
        }}
      />
      {/* THE SKULL, bowled the full width of the crop */}
      <span className="gp-roll absolute block" style={{ left: "31%", top: "37%", width: "17%", height: "22%", animationDelay: `${delayMs + 240}ms` }}>
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
              top: "44%",
              width: "4.5%",
              height: "8%",
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
        style={{ left: "60%", top: "42%", width: "22%", height: "14%", background: tint(p0, 0.75), animationDelay: `${delayMs + 1720}ms` }}
      />
      <Sparks delayMs={delayMs + 1760} fill={p0} stroke={p2} sizePct={6} cx={68} cy={48} />
      <Boom delayMs={delayMs + 1820} color={tint(p0, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 1980} color={tint(p2, 0.85)} thickness={3} />
      <Boom delayMs={delayMs + 2140} color={tint(p1, 0.8)} />
      <Glint delayMs={delayMs + 2420} color={p2} left={64} top={36} />
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
  { t: 26, s: 7, fx: "-340%", fy: "-80%", d: 300 },
  { t: 37, s: 10, fx: "360%", fy: "60%", d: 400 },
  { t: 51, s: 8, fx: "-300%", fy: "140%", d: 500 },
];
function PlanetAlign({ palette, glyph, lead, delayMs }: TemplateProps) {
  const [p0, p1, p2] = palette;
  if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
  return (
    <Stage>
      <Wash color={tint(p0, 0.42)} delayMs={delayMs} />
      <Bars delayMs={delayMs} />
      {/* the starfield kindles */}
      {SKY_STARS.map((s, i) => (
        <span key={i} className="gp-glint absolute block" style={{ left: `${s.l}%`, top: `${s.t}%`, width: "3%", height: "3%", animationDelay: `${delayMs + 160 + s.d}ms` }}>
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
        style={{ left: "47.5%", top: "20%", width: "5%", height: "48%" }}
      >
        <span
          className="gp-ray absolute inset-0 block"
          style={{ background: `linear-gradient(180deg, ${tint(p2, 0.95)}, ${tint(p1, 0.4)} 70%, transparent)`, animationDelay: `${delayMs + 1480}ms` }}
        />
      </span>
      {/* the card's sigil blazes at the meeting point */}
      <span className="gp-pop absolute block" style={{ left: "45%", top: "40%", width: "10%", height: "10%", animationDelay: `${delayMs + 1560}ms` }}>
        {glyph}
      </span>
      {/* syzygy: flare + sparks + TRIPLE shockwave */}
      <span
        className="gp-flash absolute block rounded-full"
        style={{ left: "42%", top: "40%", width: "16%", height: "11%", background: tint(p2, 0.8), animationDelay: `${delayMs + 1620}ms` }}
      />
      <Sparks delayMs={delayMs + 1660} fill={p2} stroke={p1} sizePct={5} cy={45} />
      <Boom delayMs={delayMs + 1720} color={tint(p2, 0.9)} thickness={4} />
      <Boom delayMs={delayMs + 1880} color={tint(p1, 0.85)} thickness={3} />
      <Boom delayMs={delayMs + 2040} color={tint(p0, 0.8)} />
      <Glint delayMs={delayMs + 2340} color={p2} left={47} top={30} />
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

/** Bind a template + palette + glyph + config into a SigPlugin entry. */
function G(
  Template: ComponentType<TemplateProps>,
  palette: Palette,
  glyph: ReactNode,
  config: SigPlugin["config"],
  extra = 0,
): SigPlugin {
  return {
    config,
    Render: function GodPlayRender({ lead, delayMs }: { lead: boolean; delayMs: number }) {
      return <Template palette={palette} glyph={glyph} lead={lead} delayMs={delayMs} extra={extra} />;
    },
  };
}

export const PLAYS: Record<string, SigPlugin> = {
  /* --- GodDescent ------------------------------------------------------- */
  draft_tyranny: G(GodDescent, ["#d6234f", "#ffd76a", "#1c0f18"], GLYPH.draft_tyranny, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "coronation",
  }),
  sovereign_draft: G(GodDescent, ["#ffd76a", "#fff7de", "#c9a84c"], GLYPH.sovereign_draft, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "coronation",
  }),
  draft_supremacy: G(GodDescent, ["#ffd76a", "#d6234f", "#ffffff"], GLYPH.draft_supremacy, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "coronation",
  }),
  divine_legion: G(GodDescent, ["#fff2c9", "#ffd76a", "#b98cff"], GLYPH.divine_legion, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "crownrain", source: "summon",
  }),
  absolute_aegis: G(GodDescent, ["#5fc9b0", "#ffd76a", "#e8fff7"], GLYPH.absolute_aegis, {
    ordering: "radial", staggerMs: 40, victims: "all", hasLead: true, sound: "aegis", source: "shield",
  }),
  checkmate_denial: G(GodDescent, ["#dfe8ff", "#ffd76a", "#5a8fc0"], GLYPH.checkmate_denial, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "shades", source: "kingSafe",
  }),
  full_pardon: G(GodDescent, ["#ffffff", "#ffd76a", "#5fc9b0"], GLYPH.full_pardon, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cathedral",
  }),
  transcendence: G(GodDescent, ["#b98cff", "#ffd76a", "#ffffff"], GLYPH.transcendence, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "coronation",
  }),
  mind_empire: G(GodDescent, ["#8f2bbf", "#e3d0ff", "#ffd76a"], GLYPH.mind_empire, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
  }),
  mass_mind_control: G(GodDescent, ["#c94ad1", "#12081f", "#6fe3ff"], GLYPH.mass_mind_control, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
  }),
  throne_and_silence: G(GodDescent, ["#5a6b8f", "#ffd76a", "#c9cdd6"], GLYPH.throne_and_silence, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "snooze", source: "stun",
  }),
  abdication_edict: G(GodDescent, ["#6b4a8f", "#ffd76a", "#2a1030"], GLYPH.abdication_edict, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "snooze", source: "stun",
  }),
  wa_dominate_major: G(GodDescent, ["#8f2bbf", "#ffd76a", "#e3d0ff"], GLYPH.wa_dominate_major, {
    ordering: "radial", staggerMs: 60, victims: ["r", "q"], hasLead: true, sound: "shades",
  }),

  /* --- TitanRise ---------------------------------------------------------- */
  great_divide: G(TitanRise, ["#b0a68f", "#8a7a63", "#ffd76a"], GLYPH.great_divide, {
    ordering: "sweep", staggerMs: 70, victims: "all", hasLead: true, sound: "wall", source: "blindfold",
  }),
  sundering: G(TitanRise, ["#5c5348", "#ff9d3d", "#d9d2c0"], GLYPH.sundering, {
    ordering: "sweep", staggerMs: 70, victims: "all", hasLead: true, sound: "cataclysm", source: "blindfold",
  }),
  fortress_realm: G(TitanRise, ["#8a94a8", "#5fc9b0", "#d9d2c0"], GLYPH.fortress_realm, {
    ordering: "radial", staggerMs: 50, victims: "all", hasLead: true, sound: "cathedral", source: "shield",
  }),
  molten_heart: G(TitanRise, ["#ff5c1a", "#e6432c", "#3a1c12"], GLYPH.molten_heart, {
    ordering: "sweep", staggerMs: 70, victims: "all", hasLead: true, sound: "cataclysm", source: "blindfold",
  }),
  salted_earth: G(TitanRise, ["#e8dcc0", "#b0a68f", "#8faf4a"], GLYPH.salted_earth, {
    ordering: "sweep", staggerMs: 70, victims: ["p"], hasLead: true, sound: "extinction",
  }),
  unshackled_wrath: G(TitanRise, ["#e6432c", "#3a3a40", "#ffd166"], GLYPH.unshackled_wrath, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz", source: "stun",
  }),
  phoenix_line: G(TitanRise, ["#ff7a29", "#ffd76a", "#d6234f"], GLYPH.phoenix_line, {
    ordering: "sweep", staggerMs: 80, victims: ["p"], hasLead: true, sound: "wall", source: "summon",
  }),

  /* --- SkyWrath ------------------------------------------------------------ */
  chain_atomic: G(SkyWrath, ["#ff9d3d", "#e6432c", "#ffd166"], GLYPH.chain_atomic, {
    ordering: "octagon", staggerMs: 70, victims: "all", hasLead: true, sound: "atomic",
  }),
  total_atomic: G(SkyWrath, ["#e6432c", "#7a1a10", "#ffd166"], GLYPH.total_atomic, {
    ordering: "octagon", staggerMs: 70, victims: "all", hasLead: true, sound: "atomic",
  }),
  scorched_earth: G(SkyWrath, ["#ff7a29", "#3a1c12", "#ffb454"], GLYPH.scorched_earth, {
    ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "cataclysm", source: "blindfold",
  }),
  rift_storm: G(SkyWrath, ["#8f6bff", "#12081f", "#6fe3ff"], GLYPH.rift_storm, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "lightning",
  }),
  queen_storm: G(SkyWrath, ["#ffd76a", "#b98cff", "#ffffff"], GLYPH.queen_storm, {
    ordering: "sweep", staggerMs: 70, victims: ["p"], hasLead: true, sound: "crownrain",
  }),

  /* --- AbyssMaw ------------------------------------------------------------- */
  buff_plunder: G(AbyssMaw, ["#ffd76a", "#8f2bbf", "#2a2a38"], GLYPH.buff_plunder, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "rampage",
  }),
  total_plunder: G(AbyssMaw, ["#ffd76a", "#1c0f18", "#c94ad1"], GLYPH.total_plunder, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "rampage",
  }),
  grand_nullify: G(AbyssMaw, ["#8a94a8", "#8f6bff", "#eef1f7"], GLYPH.grand_nullify, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
  }),
  absolute_nullify: G(AbyssMaw, ["#3a3a45", "#c94a5a", "#c9cdd6"], GLYPH.absolute_nullify, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "shades",
  }),

  /* --- ReaperSweep ------------------------------------------------------------ */
  endless_night: G(ReaperSweep, ["#2c3e6b", "#cdd6ff", "#8a94a8"], GLYPH.endless_night, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "shades", source: "slow",
  }),
  peace_of_the_grave: G(ReaperSweep, ["#eef1f7", "#8a94a8", "#5fae7f"], GLYPH.peace_of_the_grave, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "extinction",
  }),
  withered_hands: G(ReaperSweep, ["#8a94a8", "#6b4a8f", "#c9b0e8"], GLYPH.withered_hands, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "petrify",
  }),
  grand_malediction: G(ReaperSweep, ["#6b4a8f", "#8faf4a", "#2a1030"], GLYPH.grand_malediction, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "shades", source: "slow",
  }),
  blighted_furrows: G(ReaperSweep, ["#8faf4a", "#5c5348", "#2f3a26"], GLYPH.blighted_furrows, {
    ordering: "sweep", staggerMs: 55, victims: ["p"], hasLead: true, sound: "extinction",
  }),
  // APEX (tier 9) — bespoke SkullStrike set piece: death's bowling night.
  culling: G(SkullStrike, ["#d6234f", "#1c1c22", "#eef1f7"], GLYPH.culling, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "extinction",
  }),
  poisoned_counsel: G(ReaperSweep, ["#8faf4a", "#2f3a26", "#c9b0e8"], GLYPH.poisoned_counsel, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "petrify",
  }),

  /* --- HostMarch --------------------------------------------------------------- */
  age_of_heroes: G(HostMarch, ["#ffd76a", "#c94a3a", "#fff2c9"], GLYPH.age_of_heroes, {
    ordering: "sweep", staggerMs: 60, victims: ["n", "b", "r"], hasLead: true, sound: "blitz", source: "rally",
  }),
  grand_retreat: G(HostMarch, ["#5a8fc0", "#c9cdd6", "#ffd76a"], GLYPH.grand_retreat, {
    ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz",
  }),
  noble_rout: G(HostMarch, ["#6b1a2a", "#c9cdd6", "#e8b04b"], GLYPH.noble_rout, {
    ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "rampage",
  }),
  sacked_capital: G(HostMarch, ["#ff9d3d", "#2b1218", "#c94a3a"], GLYPH.sacked_capital, {
    ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "cataclysm", source: "slow",
  }),

  /* --- CelestialRing -------------------------------------------------------------- */
  genesis: G(CelestialRing, ["#a8e07f", "#ffffff", "#ffd76a"], GLYPH.genesis, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "cathedral",
  }),
  reality_warp: G(CelestialRing, ["#c94ad1", "#6fe3ff", "#e3d0ff"], GLYPH.reality_warp, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage",
  }),
  total_warp: G(CelestialRing, ["#5b2b8f", "#6fe3ff", "#ffd76a"], GLYPH.total_warp, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage",
  }),
  warp_cataclysm: G(CelestialRing, ["#6fe3ff", "#8f6bff", "#ffffff"], GLYPH.warp_cataclysm, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage",
  }),
  warp_sovereign: G(CelestialRing, ["#8f6bff", "#ffd76a", "#e3d0ff"], GLYPH.warp_sovereign, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage",
  }),
  nerf_reversal: G(CelestialRing, ["#a8e07f", "#8f6bff", "#ffffff"], GLYPH.nerf_reversal, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "aegis",
  }),
  celestial_alignment: G(CelestialRing, ["#2c3e6b", "#cdd6ff", "#ffd76a"], GLYPH.celestial_alignment, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "clockice", source: "frozen",
  }),
  // APEX (tier 9) — bespoke PlanetAlign set piece: the planets align.
  grand_conjunction: G(PlanetAlign, ["#3b1a5e", "#e3d0ff", "#ffd76a"], GLYPH.grand_conjunction, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "clockice", source: "frozen",
  }),

  /* --- FrostTitan ---------------------------------------------------------------- */
  glacial_tomb: G(FrostTitan, ["#9fd8ff", "#e8f8ff", "#4f8fd1"], GLYPH.glacial_tomb, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen",
  }),
  frozen_solid: G(FrostTitan, ["#6fe3ff", "#ffffff", "#3f7fb5"], GLYPH.frozen_solid, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen",
  }),
  absolute_zero: G(FrostTitan, ["#bfe6ff", "#ffffff", "#1c3a5e"], GLYPH.absolute_zero, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen",
  }),
  everfrost_shard: G(FrostTitan, ["#9fd8ff", "#8f6bff", "#e8f8ff"], GLYPH.everfrost_shard, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen",
  }),

  /* --- ForgeColossus --------------------------------------------------------------- */
  ban_hammer: G(ForgeColossus, ["#4fa3d1", "#8a94a8", "#ffd76a"], GLYPH.ban_hammer, {
    ordering: "sweep", staggerMs: 80, victims: ["n", "b", "r"], hasLead: true, sound: "siege",
  }),
  dragonslayer: G(ForgeColossus, ["#c9cdd6", "#d6234f", "#ffd76a"], GLYPH.dragonslayer, {
    ordering: "radial", staggerMs: 0, victims: ["r", "q"], hasLead: true, sound: "siege",
  }),
  world_lock: G(ForgeColossus, ["#8a94a8", "#4fa3d1", "#ffd76a"], GLYPH.world_lock, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage",
  }),
  sealed_archive: G(ForgeColossus, ["#c9a84c", "#8a6a3a", "#e8dcc0"], GLYPH.sealed_archive, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "wall",
  }),
  sealed_ramparts: G(ForgeColossus, ["#8a94a8", "#5c5c63", "#c94a3a"], GLYPH.sealed_ramparts, {
    ordering: "sweep", staggerMs: 70, victims: ["r"], hasLead: true, sound: "wall",
  }),
  leaden_limbs: G(ForgeColossus, ["#6e6e78", "#c9a84c", "#3a3a40"], GLYPH.leaden_limbs, {
    ordering: "sweep", staggerMs: 70, victims: "all", hasLead: true, sound: "petrify",
  }),

  /* --- GorgonIdol ------------------------------------------------------------------ */
  walnut_court: G(GorgonIdol, ["#8a6a4a", "#c9b89a", "#7fae5a"], GLYPH.walnut_court, {
    ordering: "sweep", staggerMs: 60, victims: ["r"], hasLead: true, sound: "petrify", source: "walnut",
  }),
  obsidian_bastions: G(GorgonIdol, ["#2a2a35", "#8f6bff", "#8a94a8"], GLYPH.obsidian_bastions, {
    ordering: "sweep", staggerMs: 60, victims: ["r"], hasLead: true, sound: "petrify", source: "walnut",
  }),
  statue_garden: G(GorgonIdol, ["#8d8d94", "#7fae5a", "#c9c9cf"], GLYPH.statue_garden, {
    ordering: "sweep", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "petrifiedforest", source: "walnut",
  }),
  cockatrice_gaze: G(GorgonIdol, ["#7fae5a", "#e8b04b", "#2f3a26"], GLYPH.cockatrice_gaze, {
    ordering: "sweep", staggerMs: 60, victims: ["n", "b"], hasLead: true, sound: "petrify", source: "walnut",
  }),
  chisel_curse: G(GorgonIdol, ["#b0a68f", "#8d8d94", "#e8dcc0"], GLYPH.chisel_curse, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "petrify", source: "walnut",
  }),
  crown_and_castle: G(GorgonIdol, ["#ffd76a", "#8d8d94", "#8a6a4a"], GLYPH.crown_and_castle, {
    ordering: "sweep", staggerMs: 60, victims: ["q", "r"], hasLead: true, sound: "petrifiedforest", source: "walnut",
  }),

  /* --- ChronoLord ------------------------------------------------------------------- */
  full_rewind: G(ChronoLord, ["#6fe3ff", "#ffd76a", "#2a2a38"], GLYPH.full_rewind, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "clockcage",
  }),
  endless_turn: G(ChronoLord, ["#e6432c", "#ffd76a", "#ffffff"], GLYPH.endless_turn, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "blitz", source: "rally",
  }),
  lost_fortnight: G(ChronoLord, ["#5a6b8f", "#cdd6ff", "#ffd76a"], GLYPH.lost_fortnight, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "snooze", source: "slow",
  }),
  sabbatical: G(ChronoLord, ["#5fc9b0", "#fff7de", "#ffd76a"], GLYPH.sabbatical, {
    ordering: "radial", staggerMs: 60, victims: "all", hasLead: true, sound: "snooze",
  }),
};
