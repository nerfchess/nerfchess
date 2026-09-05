// Fantasy-set plugin signatures: bespoke play art for the high-fantasy batch
// (src/engine/buffs/fantasy/*). See sigPlugins.tsx for the contract.
// Self-contained: own SVG, own CSS (fantasyPlays.css), transform/opacity only,
// plus the shared impact vocabulary (impact/impact.tsx) for the hero strikes'
// stage quake + ground shockwave. Do NOT import from BoardEffects.tsx.
//
// EIGHT HERO SCENES (fully bespoke choreography):
//   DragonsBreathScene   - the dragon rears from the caster's edge, inhales,
//                          and rakes a cone of flame down the attack vector
//   SummonDragonScene    - a circle inscribes, downdraft gusts, and a colossal
//                          winged silhouette descends; its eyes ignite
//   ArmyOfTheDeadScene   - headstones tilt up, wisps rise, and a pike-rank of
//                          skeletons marches away from the caster's edge
//   JudgmentDayScene     - the scales of judgment tip, then a pillar of holy
//                          light slams the square; stone-crack rings radiate
//   ExcaliburScene       - lake ripples, the blade is DRAWN upward out of the
//                          stone with a cross-glint and spark fountain
//   PhilosophersStoneScene - an alchemy circle chalks in, three pawns lift,
//                          a gold wave transmutes them; crowns pop
//   DivineInterventionScene - god-rays fan, a ward dome snaps over the king
//                          and the first strike is hurled back down the aim
//   StarfallScene        - crosshair, a growing round shadow, then the meteor
//                          screams in; a rook stands in the smoking crater
//
// NINE THEME-FAMILY TEMPLATES, parameterised by { palette, glyph, variant }:
//   SummonCircleScene  : imp_familiar, phantom_guardian, stone_golem,
//                        summoning_circle
//   BeastPassScene     : wyverns_dive, griffon_rider, direwolf_pack,
//                        roost_of_rocs
//   GazeStoneScene     : basilisk_stare, serpent_brood, withering_touch,
//                        hex_of_stone
//   DivineLightScene   : hallowed_return, divine_mandate, divine_reckoning,
//                        heavens_wrath
//   NecroRiseScene     : undying_thrall, raise_dead, soul_harvest,
//                        lich_phylactery
//   ElementSurgeScene  : frost_wall, sinkhole, chain_lightning, fissure_field,
//                        wall_of_thorns
//   RelicForgeScene    : horn_of_summoning, orb_of_dominion, staff_of_stasis,
//                        aegis_of_ages, banner_of_war
//   CurseSigilScene    : evil_eye, shackle_the_queen, curse_of_frailty,
//                        doom_march, chains_of_binding
//   AscendScene        : metamorphosis, dragon_form, apotheosis, god_king,
//                        celestial_ascension
//
// STAGING (docs/animation-design-brief.md section 0): every card declares an
// anchor inside the set scripts/lib/anchor-rule.ts derives for it (the values
// below are carried over from the cards' previous core SIGNATURES entries,
// which the anchor gate already accepted). The action rides BoardWideStage;
// whole-board layers ride BoardFrame; travelling parts of aim-anchored scenes
// ride AimStage. Directional layers read --fx-side / --fx-ox / --fx-oy /
// --fx-ang / --fx-aim-x/y, so nothing hardcodes "the bottom of the board".

import "./fantasyPlays.css";

import type { ComponentType, CSSProperties, ReactNode } from "react";
import type { SigPlugin, SigRole } from "./sigPlugins";
import { QUAKE_CLASS, Shockwave, impactVars } from "./impact/impact";
import { AimStage, BoardFrame, BoardWideStage } from "./stage";

/* =============================================================================
   Shared bits
   ========================================================================== */

type Palette = [string, string, string]; // core / glow / deep accent

interface SceneProps {
  palette: Palette;
  glyph: ReactNode;
  lead: boolean;
  role?: SigRole;
  delayMs: number;
  /** Per-card structural flourish inside a shared family template. */
  variant?: string;
}

const WARM = "#fff4d6";

/** hex "#rrggbb" -> rgba() at the given alpha. */
function tint(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const d = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

const SJ = { strokeLinejoin: "round", strokeLinecap: "round" } as const;

/** The hero stage. `quakeMs` (absolute, like every delay here) jolts the whole
 * 14-cell canvas on the strike beat via the shared impact wrapper - in-scene
 * only, the real board crop never shakes. Quake is a wrapper class (0 animated
 * nodes), so it costs nothing against the 16-node scene cap. */
function Stage({ children, quakeMs }: { children: ReactNode; quakeMs?: number }) {
  return (
    <BoardWideStage>
      {quakeMs != null ? (
        <span className={`${QUAKE_CLASS} absolute inset-0 block`} style={impactVars(undefined, quakeMs / 1000)}>
          {children}
        </span>
      ) : (
        children
      )}
    </BoardWideStage>
  );
}

/** The strike's ground shockwave from the shared impact vocabulary, boxed over
 * the point of contact and tinted with the scene's own hex. */
function Thud({ tone, atMs, left = "34%", top = "34%", size = "32%" }: { tone: string; atMs: number; left?: string; top?: string; size?: string }) {
  const rgb = `${parseInt(tone.slice(1, 3), 16)} ${parseInt(tone.slice(3, 5), 16)} ${parseInt(tone.slice(5, 7), 16)}`;
  return (
    <span className="absolute block" style={{ left, top, width: size, height: size, ...impactVars(rgb, atMs / 1000) }}>
      <Shockwave />
    </span>
  );
}

/** Full-board tinted wash (board-exact at any anchor via BoardFrame). */
function Wash({ color, delayMs }: { color: string; delayMs: number }) {
  return (
    <BoardFrame>
      <span className="ftp-wash absolute inset-0 block" style={{ background: color, ...d(delayMs) }} />
    </BoardFrame>
  );
}

/** The directional omen: a ground shadow raked outward along the cast
 * square's offset from the board centre (--fx-ox / --fx-oy). */
function Rake({ tone, delayMs }: { tone: string; delayMs: number }) {
  return (
    <span
      className="ftp-rake absolute block rounded-full"
      style={{ left: "34%", top: "60%", width: "32%", height: "5%", background: `radial-gradient(closest-side, ${tone}, transparent)`, ...d(delayMs) }}
    />
  );
}

function Flash({ color, delayMs }: { color: string; delayMs: number }) {
  return (
    <span
      className="ftp-flash absolute block rounded-full"
      style={{ left: "38%", top: "38%", width: "24%", height: "24%", background: `radial-gradient(circle, ${color} 0%, transparent 68%)`, ...d(delayMs) }}
    />
  );
}

function Ring({ color, delayMs }: { color: string; delayMs: number }) {
  return (
    <span
      className="ftp-ring absolute block rounded-full"
      style={{ left: "26%", top: "26%", width: "48%", height: "48%", border: `3px solid ${color}`, ...d(delayMs) }}
    />
  );
}

const MOTE_ROWS = [
  { l: 44, t: 52, d: 0 },
  { l: 52, t: 56, d: 140 },
  { l: 48, t: 48, d: 280 },
];
function Motes({ color, delayMs }: { color: string; delayMs: number }) {
  return (
    <>
      {MOTE_ROWS.map((m, i) => (
        <span
          key={i}
          className="ftp-mote absolute block rounded-full"
          style={{ left: `${m.l}%`, top: `${m.t}%`, width: "2.4%", height: "2.4%", background: color, ...d(delayMs + m.d) }}
        />
      ))}
    </>
  );
}

/** Settle wisp trailing back toward the caster's screen edge (--fx-side). */
function Drift({ tone, delayMs }: { tone: string; delayMs: number }) {
  return (
    <span
      className="ftp-drift absolute block rounded-full"
      style={{ left: "42%", top: "44%", width: "16%", height: "12%", background: `radial-gradient(closest-side, ${tint(tone, 0.55)}, transparent)`, ...d(delayMs) }}
    />
  );
}

/** Compact per-square target hit: the leg streak arrives down the real attack
 * vector (--fx-ang), the card's glyph pops, sparks scatter, a mote settles. */
const HIT_SPARKS = [
  { dx: "120%", dy: "-90%", d: 0 },
  { dx: "-110%", dy: "-70%", d: 60 },
];
function TargetHit({ palette, glyph, delayMs }: { palette: Palette; glyph: ReactNode; delayMs: number }) {
  const [core, glow] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-30 block" aria-hidden="true">
      <span className="ftp-leg absolute inset-0 block">
        <span
          className="ftp-legrun absolute block"
          style={{ left: "-60%", top: "44%", width: "70%", height: "12%", background: `linear-gradient(90deg, transparent, ${tint(glow, 0.9)})`, borderRadius: "999px", ...d(delayMs) }}
        />
      </span>
      <span className="ftp-hitpop absolute block" style={{ left: "16%", top: "16%", width: "68%", height: "68%", ...d(delayMs + 120) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">{glyph}</svg>
      </span>
      <span
        className="ftp-ring absolute block rounded-full"
        style={{ left: "12%", top: "12%", width: "76%", height: "76%", border: `2px solid ${tint(glow, 0.9)}`, ...d(delayMs + 170) }}
      />
      {HIT_SPARKS.map((s, i) => (
        <span
          key={i}
          className="ftp-spark absolute block rounded-full"
          style={{ left: "46%", top: "46%", width: "8%", height: "8%", background: core, "--dx": s.dx, "--dy": s.dy, ...d(delayMs + 220 + s.d) } as CSSProperties}
        />
      ))}
      <span
        className="ftp-mote absolute block rounded-full"
        style={{ left: "46%", top: "40%", width: "8%", height: "8%", background: tint(glow, 0.8), ...d(delayMs + 430) }}
      />
    </span>
  );
}

/** The entrance cut: the card arriving in a hand. Its own palette and glyph
 * at ~56% of the crop, rising in from the owner's side. No board takeover. */
function EntranceCut({ palette, glyph, delayMs }: { palette: Palette; glyph: ReactNode; delayMs: number }) {
  const [core, glow] = palette;
  return (
    <span className="pointer-events-none absolute inset-0 z-30 block" aria-hidden="true">
      <span
        className="ftp-entr-ring absolute block rounded-full"
        style={{ left: "20%", top: "20%", width: "60%", height: "60%", border: `2px solid ${tint(glow, 0.9)}`, ...d(delayMs + 40) }}
      />
      <span className="ftp-entr absolute block" style={{ left: "22%", top: "22%", width: "56%", height: "56%", ...d(delayMs + 170) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">{glyph}</svg>
      </span>
      <span
        className="ftp-mote absolute block rounded-full"
        style={{ left: "44%", top: "40%", width: "7%", height: "7%", background: tint(core, 0.9), ...d(delayMs + 620) }}
      />
    </span>
  );
}

/* =============================================================================
   Hero scenes
   ========================================================================== */

/* --- Dragon's Breath: the corridor turns to ash ---------------------------- */
const BREATH_EMBERS = [
  { l: 52, t: 46, dx: "140%", dy: "-60%", d: 0 },
  { l: 58, t: 52, dx: "180%", dy: "20%", d: 90 },
  { l: 55, t: 42, dx: "120%", dy: "-140%", d: 180 },
  { l: 60, t: 48, dx: "200%", dy: "-40%", d: 270 },
];
function DragonsBreathScene({ palette, delayMs }: SceneProps) {
  const [core, glow, deep] = palette;
  return (
    // FLAGSHIP: the flame cone's contact beat jolts the whole stage and rolls
    // a ground shockwave out of the burn (shared impact vocabulary).
    <Stage quakeMs={delayMs + 760}>
      <Wash color={tint(deep, 0.2)} delayMs={delayMs} />
      <Rake tone={tint(core, 0.5)} delayMs={delayMs + 80} />
      {/* the dragon rears in from the CASTER's edge (--fx-side) */}
      <span className="ftp-dragonhead absolute block" style={{ left: "30%", top: "34%", width: "18%", height: "22%", ...d(delayMs + 150) }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <path d="M3 13 Q3 6 9 5 L12 2.4 L12.6 5.4 Q17 6 18 9.6 L12.6 9 L14.4 11.2 L9.6 10.4 Q10.6 13.4 8 15.2 Q4.6 16 3 13 Z" fill={deep} stroke={core} strokeWidth="0.7" {...SJ} />
          <circle cx="9.8" cy="7.6" r="0.9" fill={glow} />
        </svg>
      </span>
      {/* inhale: the throat glow charges before the burn */}
      <span
        className="ftp-throat absolute block rounded-full"
        style={{ left: "34%", top: "44%", width: "9%", height: "8%", background: `radial-gradient(circle, ${glow}, transparent 70%)`, ...d(delayMs + 460) }}
      />
      {/* strike: the flame cone rakes down the real attack vector */}
      <span className="ftp-leg absolute inset-0 block">
        <span
          className="ftp-flame absolute block"
          style={{ left: "44%", top: "42%", width: "42%", height: "16%", background: `linear-gradient(90deg, ${glow}, ${tint(core, 0.9)} 55%, transparent)`, borderRadius: "0 999px 999px 0", ...d(delayMs + 700) }}
        />
      </span>
      <Flash color={tint(glow, 0.95)} delayMs={delayMs + 760} />
      <Thud tone={glow} atMs={delayMs + 760} left="38%" top="36%" />
      <Ring color={tint(core, 0.85)} delayMs={delayMs + 860} />
      {BREATH_EMBERS.map((e, i) => (
        <span
          key={i}
          className="ftp-ember absolute block rounded-full"
          style={{ left: `${e.l}%`, top: `${e.t}%`, width: "1.8%", height: "1.8%", background: glow, "--dx": e.dx, "--dy": e.dy, ...d(delayMs + 1000 + e.d) } as CSSProperties}
        />
      ))}
      <span
        className="ftp-smoke absolute block rounded-full"
        style={{ left: "48%", top: "40%", width: "20%", height: "14%", background: `radial-gradient(closest-side, ${tint(deep, 0.6)}, transparent)`, ...d(delayMs + 1350) }}
      />
      <Drift tone={core} delayMs={delayMs + 1700} />
    </Stage>
  );
}

/* --- Summon Dragon: the oldest thing on the board -------------------------- */
const DOWNDRAFTS = [
  { l: 34, t: 60, d: 0 },
  { l: 48, t: 64, d: 110 },
  { l: 60, t: 60, d: 220 },
];
function SummonDragonScene({ palette, delayMs }: SceneProps) {
  const [core, glow, deep] = palette;
  return (
    // FLAGSHIP: something that big does not land lightly - the touchdown beat
    // jolts the stage and rolls a ground shockwave out of the circle.
    <Stage quakeMs={delayMs + 1250}>
      <Wash color={tint(deep, 0.22)} delayMs={delayMs} />
      <Rake tone={tint(core, 0.5)} delayMs={delayMs + 70} />
      {/* the circle opens where she will land */}
      <span className="ftp-circle absolute block" style={{ left: "36%", top: "50%", width: "28%", height: "16%", ...d(delayMs + 140) }}>
        <svg viewBox="0 0 28 16" className="block h-full w-full" aria-hidden="true">
          <ellipse cx="14" cy="8" rx="12.4" ry="6" fill="none" stroke={glow} strokeWidth="0.9" strokeDasharray="3 2" />
          <ellipse cx="14" cy="8" rx="8" ry="3.6" fill="none" stroke={tint(core, 0.8)} strokeWidth="0.6" />
        </svg>
      </span>
      {/* wingbeats flatten the dust in rings */}
      {DOWNDRAFTS.map((g, i) => (
        <span
          key={i}
          className="ftp-gust absolute block rounded-full"
          style={{ left: `${g.l}%`, top: `${g.t}%`, width: "14%", height: "5%", background: `radial-gradient(closest-side, ${tint(core, 0.45)}, transparent)`, ...d(delayMs + 520 + g.d) }}
        />
      ))}
      {/* the colossal silhouette descends on beating wings */}
      <span className="ftp-wingbeat absolute block" style={{ left: "26%", top: "22%", width: "48%", height: "40%", ...d(delayMs + 640) }}>
        <svg viewBox="0 0 48 40" className="block h-full w-full" aria-hidden="true">
          <path d="M2 12 Q12 2 22 12 L24 8 L26 12 Q36 2 46 12 Q38 16 30 16 L27 30 Q24 34 21 30 L18 16 Q10 16 2 12 Z" fill={deep} stroke={tint(glow, 0.9)} strokeWidth="1" {...SJ} />
          <path d="M22 33 Q24 37 26 33" fill="none" stroke={deep} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
      {/* her eyes ignite */}
      <span className="ftp-eyelight absolute block rounded-full" style={{ left: "46.5%", top: "34%", width: "2.2%", height: "2.2%", background: glow, ...d(delayMs + 1150) }} />
      <Flash color={tint(glow, 0.9)} delayMs={delayMs + 1250} />
      <Thud tone={glow} atMs={delayMs + 1250} left="35%" top="42%" size="30%" />
      <Ring color={tint(core, 0.85)} delayMs={delayMs + 1320} />
      <Motes color={tint(glow, 0.85)} delayMs={delayMs + 1520} />
      <Drift tone={core} delayMs={delayMs + 1750} />
    </Stage>
  );
}

/* --- Army of the Dead: roll call is a very long list ----------------------- */
const HEADSTONES = [
  { l: 34, t: 52, d: 0 },
  { l: 47, t: 56, d: 120 },
  { l: 60, t: 52, d: 240 },
];
const AOTD_WISPS = [
  { l: 38, t: 48, d: 0 },
  { l: 50, t: 52, d: 140 },
  { l: 62, t: 48, d: 280 },
];
function ArmyOfTheDeadScene({ palette, delayMs }: SceneProps) {
  const [core, glow, deep] = palette;
  return (
    <Stage>
      <Wash color={tint(deep, 0.24)} delayMs={delayMs} />
      <Rake tone={tint(core, 0.45)} delayMs={delayMs + 70} />
      {HEADSTONES.map((h, i) => (
        <span key={i} className="ftp-stonetilt absolute block" style={{ left: `${h.l}%`, top: `${h.t}%`, width: "5.4%", height: "7%", ...d(delayMs + 140 + h.d) }}>
          <svg viewBox="0 0 10 13" className="block h-full w-full" aria-hidden="true">
            <path d="M1 13 V5 Q1 1 5 1 Q9 1 9 5 V13 Z" fill={core} stroke={deep} strokeWidth="0.7" />
            <path d="M3.4 6 H6.6 M5 4.4 V7.6" stroke={deep} strokeWidth="0.6" strokeLinecap="round" />
          </svg>
        </span>
      ))}
      {AOTD_WISPS.map((w, i) => (
        <span
          key={i}
          className="ftp-wisp absolute block rounded-full"
          style={{ left: `${w.l}%`, top: `${w.t}%`, width: "3%", height: "4.4%", background: `radial-gradient(circle, ${tint(glow, 0.9)}, transparent 70%)`, ...d(delayMs + 430 + w.d) }}
        />
      ))}
      {/* the raised rank advances away from the caster's edge (--fx-side) */}
      <span className="ftp-march absolute block" style={{ left: "30%", top: "42%", width: "40%", height: "16%", ...d(delayMs + 800) }}>
        <svg viewBox="0 0 40 16" className="block h-full w-full" aria-hidden="true">
          {[3, 12, 21, 30].map((x, i) => (
            <g key={i} transform={`translate(${x} 0)`}>
              <path d={`M3 15 V8 M3 8 Q1.4 7.4 1.6 5.4 Q1.8 3.4 3.6 3.4 Q5.4 3.4 5.6 5.4 Q5.6 7.2 3 8`} fill="none" stroke={glow} strokeWidth="1" {...SJ} />
              <path d="M5.6 15 L7.4 2" stroke={core} strokeWidth="0.8" strokeLinecap="round" />
              <path d="M7.4 2 L8.6 3.6" stroke={core} strokeWidth="0.8" strokeLinecap="round" />
            </g>
          ))}
        </svg>
      </span>
      <Flash color={tint(glow, 0.85)} delayMs={delayMs + 900} />
      <Ring color={tint(core, 0.8)} delayMs={delayMs + 980} />
      <span
        className="ftp-mist absolute block"
        style={{ left: "26%", top: "56%", width: "48%", height: "9%", borderRadius: "999px", background: `linear-gradient(90deg, transparent, ${tint(glow, 0.4)}, transparent)`, ...d(delayMs + 1400) }}
      />
      <Drift tone={core} delayMs={delayMs + 1700} />
    </Stage>
  );
}

/* --- Judgment Day: weighed, measured, found wanting ------------------------ */
const JD_FEATHERS = [
  { l: 42, t: 36, d: 0 },
  { l: 56, t: 40, d: 160 },
];
function JudgmentDayScene({ palette, delayMs }: SceneProps) {
  const [core, glow, deep] = palette;
  return (
    // FLAGSHIP: the pillar's slam is the verdict - the stage jolts on contact
    // and a ground shockwave rolls off the base of the light.
    <Stage quakeMs={delayMs + 780}>
      <Wash color={tint(deep, 0.26)} delayMs={delayMs} />
      <Rake tone={tint(glow, 0.5)} delayMs={delayMs + 80} />
      {/* the scales descend and tip */}
      <span className="ftp-scales absolute block" style={{ left: "40%", top: "26%", width: "20%", height: "18%", ...d(delayMs + 160) }}>
        <svg viewBox="0 0 20 18" className="block h-full w-full" aria-hidden="true">
          <path d="M10 1 V10 M3 4 H17" stroke={core} strokeWidth="1" strokeLinecap="round" />
          <path d="M3 4 L1.4 9 H4.6 Z M17 4 L15.4 9 H18.6 Z" fill="none" stroke={core} strokeWidth="0.8" {...SJ} />
          <circle cx="10" cy="1.6" r="1" fill={glow} />
        </svg>
      </span>
      {/* the pillar of holy light SLAMS the square */}
      <span
        className="ftp-pillar absolute block"
        style={{ left: "44%", top: "12%", width: "12%", height: "44%", background: `linear-gradient(180deg, transparent, ${tint(glow, 0.95)} 30%, ${WARM})`, borderRadius: "999px", ...d(delayMs + 700) }}
      />
      <Flash color={WARM} delayMs={delayMs + 780} />
      <Thud tone={glow} atMs={delayMs + 780} left="37%" top="40%" size="26%" />
      <Ring color={tint(glow, 0.9)} delayMs={delayMs + 860} />
      {/* the two nearest survivors are left as stone: crack webs radiate */}
      <span className="ftp-crack absolute block" style={{ left: "31%", top: "48%", width: "9%", height: "9%", ...d(delayMs + 1050) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 5 L1.5 3 M5 5 L8 1.8 M5 5 L8.5 6.8 M5 5 L3 8.4" stroke={core} strokeWidth="0.7" strokeLinecap="round" />
        </svg>
      </span>
      <span className="ftp-crack absolute block" style={{ left: "60%", top: "46%", width: "9%", height: "9%", ...d(delayMs + 1180) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 5 L2 1.8 M5 5 L8.6 3.4 M5 5 L7.4 8.2 M5 5 L1.6 6.6" stroke={core} strokeWidth="0.7" strokeLinecap="round" />
        </svg>
      </span>
      {JD_FEATHERS.map((f, i) => (
        <span key={i} className="ftp-featherfall absolute block" style={{ left: `${f.l}%`, top: `${f.t}%`, width: "2.6%", height: "3.4%", ...d(delayMs + 1320 + f.d) }}>
          <svg viewBox="0 0 6 8" className="block h-full w-full" aria-hidden="true">
            <path d="M3 0.6 Q5.4 3 3 7.4 Q0.6 3 3 0.6 Z" fill={WARM} stroke={glow} strokeWidth="0.4" />
          </svg>
        </span>
      ))}
      <Drift tone={glow} delayMs={delayMs + 1650} />
    </Stage>
  );
}

/* --- Excalibur: the lake gives up its blade once --------------------------- */
const EX_SPARKS = [
  { dx: "140%", dy: "-120%", d: 0 },
  { dx: "-130%", dy: "-100%", d: 70 },
  { dx: "60%", dy: "-170%", d: 140 },
];
function ExcaliburScene({ palette, delayMs }: SceneProps) {
  const [core, glow, deep] = palette;
  return (
    <Stage>
      <Wash color={tint(deep, 0.2)} delayMs={delayMs} />
      <Rake tone={tint(glow, 0.45)} delayMs={delayMs + 70} />
      {/* the lake stirs: rings walk outward from the stone */}
      <span
        className="ftp-ripple absolute block rounded-full"
        style={{ left: "38%", top: "54%", width: "24%", height: "8%", border: `2px solid ${tint(glow, 0.8)}`, ...d(delayMs + 140) }}
      />
      <span
        className="ftp-ripple absolute block rounded-full"
        style={{ left: "34%", top: "53%", width: "32%", height: "10%", border: `2px solid ${tint(glow, 0.5)}`, ...d(delayMs + 330) }}
      />
      {/* the blade rises from the stone, hilt first slow then DRAWN */}
      <span className="ftp-sworddraw absolute block" style={{ left: "44%", top: "22%", width: "12%", height: "36%", ...d(delayMs + 480) }}>
        <svg viewBox="0 0 12 36" className="block h-full w-full" aria-hidden="true">
          <path d="M6 2 L7.4 6 V22 H4.6 V6 Z" fill={WARM} stroke={core} strokeWidth="0.6" {...SJ} />
          <path d="M2.4 22.6 H9.6 M6 22.6 V27" stroke={glow} strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="6" cy="28.4" r="1.3" fill={glow} />
        </svg>
      </span>
      {/* the cross-glint at the drawn tip */}
      <span className="ftp-glint absolute block" style={{ left: "46.5%", top: "20%", width: "7%", height: "7%", ...d(delayMs + 1060) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">
          <path d="M5 0.6 V9.4 M0.6 5 H9.4" stroke={WARM} strokeWidth="0.9" strokeLinecap="round" />
        </svg>
      </span>
      <Flash color={tint(glow, 0.95)} delayMs={delayMs + 1120} />
      <Ring color={tint(core, 0.85)} delayMs={delayMs + 1180} />
      {EX_SPARKS.map((s, i) => (
        <span
          key={i}
          className="ftp-spark absolute block rounded-full"
          style={{ left: "49%", top: "40%", width: "1.8%", height: "1.8%", background: glow, "--dx": s.dx, "--dy": s.dy, ...d(delayMs + 1220 + s.d) } as CSSProperties}
        />
      ))}
      <Drift tone={glow} delayMs={delayMs + 1650} />
    </Stage>
  );
}

/* --- Philosopher's Stone: base metal to gold -------------------------------- */
const PS_PAWNS = [
  { l: 38, d: 0 },
  { l: 47, d: 130 },
  { l: 56, d: 260 },
];
function PhilosophersStoneScene({ palette, delayMs }: SceneProps) {
  const [core, glow, deep] = palette;
  return (
    <Stage>
      <Wash color={tint(deep, 0.2)} delayMs={delayMs} />
      <Rake tone={tint(glow, 0.5)} delayMs={delayMs + 70} />
      {/* the transmutation circle chalks itself in */}
      <span className="ftp-circle absolute block" style={{ left: "32%", top: "38%", width: "36%", height: "30%", ...d(delayMs + 140) }}>
        <svg viewBox="0 0 36 30" className="block h-full w-full" aria-hidden="true">
          <ellipse cx="18" cy="15" rx="16" ry="12.6" fill="none" stroke={glow} strokeWidth="0.8" strokeDasharray="4 2.4" />
          <path d="M18 4.4 L29.4 23 H6.6 Z" fill="none" stroke={tint(core, 0.85)} strokeWidth="0.7" {...SJ} />
        </svg>
      </span>
      {/* three pawns lift into the working */}
      {PS_PAWNS.map((p, i) => (
        <span key={i} className="ftp-summon absolute block" style={{ left: `${p.l}%`, top: "44%", width: "5.4%", height: "9%", ...d(delayMs + 480 + p.d) }}>
          <svg viewBox="0 0 10 16" className="block h-full w-full" aria-hidden="true">
            <path d="M2 15 Q2.4 10.4 4 9 Q2.6 8 3.2 6 A2.4 2.4 0 1 1 6.8 6 Q7.4 8 6 9 Q7.6 10.4 8 15 Z" fill={core} stroke={deep} strokeWidth="0.7" {...SJ} />
          </svg>
        </span>
      ))}
      {/* the gold wave passes over them */}
      <span
        className="ftp-goldwave absolute block"
        style={{ left: "30%", top: "40%", width: "40%", height: "18%", background: `linear-gradient(90deg, transparent, ${tint(glow, 0.85)}, transparent)`, borderRadius: "999px", ...d(delayMs + 920) }}
      />
      <Flash color={tint(glow, 0.95)} delayMs={delayMs + 1020} />
      <Ring color={tint(core, 0.85)} delayMs={delayMs + 1100} />
      {/* what comes out wears crowns */}
      {PS_PAWNS.map((p, i) => (
        <span key={`c${i}`} className="ftp-crownpop absolute block" style={{ left: `${p.l + 0.6}%`, top: "40%", width: "4.2%", height: "3.6%", ...d(delayMs + 1180 + p.d) }}>
          <svg viewBox="0 0 10 8" className="block h-full w-full" aria-hidden="true">
            <path d="M1 7 V2.4 L3.4 4.4 L5 1 L6.6 4.4 L9 2.4 V7 Z" fill={glow} stroke={deep} strokeWidth="0.5" {...SJ} />
          </svg>
        </span>
      ))}
      <Motes color={tint(glow, 0.9)} delayMs={delayMs + 1500} />
      <Drift tone={glow} delayMs={delayMs + 1750} />
    </Stage>
  );
}

/* --- Divine Intervention: not today, the heavens say ------------------------ */
const DI_RAYS = [
  { r: -22, d: 0 },
  { r: 0, d: 70 },
  { r: 22, d: 140 },
];
function DivineInterventionScene({ palette, delayMs }: SceneProps) {
  const [core, glow, deep] = palette;
  return (
    <Stage>
      <Wash color={tint(deep, 0.18)} delayMs={delayMs} />
      <Rake tone={tint(glow, 0.45)} delayMs={delayMs + 60} />
      {DI_RAYS.map((r, i) => (
        <span
          key={i}
          className="ftp-ray absolute block"
          style={{ left: "47%", top: "10%", width: "6%", height: "38%", background: `linear-gradient(180deg, ${tint(glow, 0.9)}, transparent)`, transform: `rotate(${r.r}deg)`, transformOrigin: "50% 0%", ...d(delayMs + 120 + r.d) }}
        />
      ))}
      {/* the halo settles over the crown */}
      <span
        className="ftp-halo absolute block rounded-full"
        style={{ left: "42%", top: "34%", width: "16%", height: "6%", border: `3px solid ${tint(glow, 0.95)}`, ...d(delayMs + 480) }}
      />
      {/* the ward dome snaps shut over the king */}
      <span
        className="ftp-dome absolute block"
        style={{ left: "38%", top: "38%", width: "24%", height: "16%", borderRadius: "999px 999px 0 0", border: `3px solid ${tint(core, 0.9)}`, borderBottom: "none", background: `linear-gradient(180deg, ${tint(glow, 0.4)}, transparent)`, ...d(delayMs + 720) }}
      />
      <Flash color={WARM} delayMs={delayMs + 920} />
      <Ring color={tint(glow, 0.9)} delayMs={delayMs + 1000} />
      {/* the first strike is hurled straight back out along the aim */}
      <span
        className="ftp-reflect absolute block rounded-full"
        style={{ left: "47%", top: "44%", width: "6%", height: "6%", background: `radial-gradient(circle, ${WARM}, ${tint(core, 0.9)} 70%)`, ...d(delayMs + 1080) }}
      />
      <span className="ftp-featherfall absolute block" style={{ left: "44%", top: "34%", width: "2.6%", height: "3.4%", ...d(delayMs + 1350) }}>
        <svg viewBox="0 0 6 8" className="block h-full w-full" aria-hidden="true">
          <path d="M3 0.6 Q5.4 3 3 7.4 Q0.6 3 3 0.6 Z" fill={WARM} stroke={glow} strokeWidth="0.4" />
        </svg>
      </span>
      <Drift tone={glow} delayMs={delayMs + 1600} />
    </Stage>
  );
}

/* --- Starfall: the crater is still glowing ---------------------------------- */
const SF_EMBERS = [
  { dx: "110%", dy: "-80%", d: 0 },
  { dx: "-120%", dy: "-60%", d: 80 },
  { dx: "40%", dy: "-150%", d: 160 },
];
function StarfallScene({ palette, delayMs }: SceneProps) {
  const [core, glow, deep] = palette;
  return (
    // FLAGSHIP: the meteor's touchdown jolts the whole stage and rolls a
    // crater shockwave out from under the impact (shared impact vocabulary).
    <Stage quakeMs={delayMs + 1180}>
      <Wash color={tint(deep, 0.24)} delayMs={delayMs} />
      {/* the crosshair paints the landing square */}
      <span className="ftp-crosshair absolute block" style={{ left: "42%", top: "42%", width: "16%", height: "16%", ...d(delayMs + 120) }}>
        <svg viewBox="0 0 16 16" className="block h-full w-full" aria-hidden="true">
          <circle cx="8" cy="8" r="6.4" fill="none" stroke={glow} strokeWidth="0.9" />
          <path d="M8 0.8 V4 M8 12 V15.2 M0.8 8 H4 M12 8 H15.2" stroke={glow} strokeWidth="0.9" strokeLinecap="round" />
        </svg>
      </span>
      {/* the round shadow grows under it */}
      <span
        className="ftp-dropshadow absolute block rounded-full"
        style={{ left: "41%", top: "45%", width: "18%", height: "10%", background: `radial-gradient(closest-side, ${tint(deep, 0.85)}, transparent)`, ...d(delayMs + 300) }}
      />
      {/* the star screams in */}
      <span className="ftp-meteor absolute block" style={{ left: "40%", top: "34%", width: "20%", height: "20%", ...d(delayMs + 920) }}>
        <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
          <path d="M18.6 1.4 L8.6 8.4" stroke={tint(glow, 0.9)} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="7" cy="10" r="4.2" fill={core} stroke={glow} strokeWidth="1" />
          <circle cx="5.8" cy="8.8" r="1.2" fill={WARM} />
        </svg>
      </span>
      <Flash color={WARM} delayMs={delayMs + 1180} />
      <Thud tone={glow} atMs={delayMs + 1180} left="36%" top="40%" size="28%" />
      <Ring color={tint(glow, 0.9)} delayMs={delayMs + 1250} />
      <Rake tone={tint(core, 0.55)} delayMs={delayMs + 1250} />
      {/* what cooled in the crater is a tower */}
      <span className="ftp-summon absolute block" style={{ left: "45%", top: "40%", width: "10%", height: "13%", ...d(delayMs + 1420) }}>
        <svg viewBox="0 0 12 16" className="block h-full w-full" aria-hidden="true">
          <path d="M2 15 V6 H3.6 V4 H5 V6 H7 V4 H8.4 V6 H10 V15 Z" fill={core} stroke={deep} strokeWidth="0.7" {...SJ} />
        </svg>
      </span>
      {SF_EMBERS.map((e, i) => (
        <span
          key={i}
          className="ftp-ember absolute block rounded-full"
          style={{ left: "49%", top: "48%", width: "1.8%", height: "1.8%", background: glow, "--dx": e.dx, "--dy": e.dy, ...d(delayMs + 1500 + e.d) } as CSSProperties}
        />
      ))}
      <span
        className="ftp-smoke absolute block rounded-full"
        style={{ left: "44%", top: "40%", width: "14%", height: "10%", background: `radial-gradient(closest-side, ${tint(deep, 0.6)}, transparent)`, ...d(delayMs + 1650) }}
      />
      <Drift tone={core} delayMs={delayMs + 1850} />
    </Stage>
  );
}

/* =============================================================================
   Family templates
   ========================================================================== */

/* --- Summoning circle: something steps through ------------------------------ */
const CIRCLE_RUNES = [
  { l: 36, t: 42, d: 0 },
  { l: 50, t: 36, d: 90 },
  { l: 62, t: 42, d: 180 },
];
function SummonCircleScene({ palette, glyph, variant, delayMs }: SceneProps) {
  const [core, glow, deep] = palette;
  return (
    <Stage>
      <Wash color={tint(deep, 0.2)} delayMs={delayMs} />
      <Rake tone={tint(core, 0.45)} delayMs={delayMs + 60} />
      <span className="ftp-circle absolute block" style={{ left: "35%", top: "48%", width: "30%", height: "17%", ...d(delayMs + 140) }}>
        <svg viewBox="0 0 30 17" className="block h-full w-full" aria-hidden="true">
          <ellipse cx="15" cy="8.5" rx="13.4" ry="6.6" fill="none" stroke={glow} strokeWidth="0.9" strokeDasharray="3.2 2" />
          <ellipse cx="15" cy="8.5" rx="8.6" ry="4" fill="none" stroke={tint(core, 0.8)} strokeWidth="0.6" />
        </svg>
      </span>
      {CIRCLE_RUNES.map((r, i) => (
        <span key={i} className="ftp-rune absolute block" style={{ left: `${r.l}%`, top: `${r.t}%`, width: "3.2%", height: "3.6%", ...d(delayMs + 340 + r.d) }}>
          <svg viewBox="0 0 8 9" className="block h-full w-full" aria-hidden="true">
            <path d={i === 0 ? "M1.4 7.6 L4 1.4 L6.6 7.6 M2.4 5.4 H5.6" : i === 1 ? "M1.6 1.4 H6.4 M4 1.4 V7.6 M2 7.6 H6" : "M1.6 1.6 L6.4 7.4 M6.4 1.6 L1.6 7.4"} fill="none" stroke={glow} strokeWidth="0.8" {...SJ} />
          </svg>
        </span>
      ))}
      <span
        className="ftp-pillar absolute block"
        style={{ left: "45%", top: "18%", width: "10%", height: "36%", background: `linear-gradient(180deg, transparent, ${tint(glow, 0.85)})`, borderRadius: "999px", ...d(delayMs + 660) }}
      />
      <span className="ftp-summon absolute block" style={{ left: "40%", top: "30%", width: "20%", height: "24%", ...d(delayMs + 760) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">{glyph}</svg>
      </span>
      <Flash color={tint(glow, 0.9)} delayMs={delayMs + 840} />
      <Ring color={tint(core, 0.85)} delayMs={delayMs + 920} />
      {variant === "gust" && (
        <span
          className="ftp-gust absolute block rounded-full"
          style={{ left: "38%", top: "52%", width: "24%", height: "7%", background: `radial-gradient(closest-side, ${tint(core, 0.5)}, transparent)`, ...d(delayMs + 900) }}
        />
      )}
      {variant === "stone" && (
        <span
          className="ftp-stonedust absolute block rounded-full"
          style={{ left: "42%", top: "50%", width: "16%", height: "6%", background: `radial-gradient(closest-side, ${tint(core, 0.6)}, transparent)`, ...d(delayMs + 1000) }}
        />
      )}
      <Motes color={tint(glow, 0.85)} delayMs={delayMs + 1250} />
      <Drift tone={core} delayMs={delayMs + 1550} />
    </Stage>
  );
}

/* --- Beast pass: something huge crosses the field --------------------------- */
const BEAST_FEATHERS = [
  { l: 44, t: 40, d: 0 },
  { l: 54, t: 44, d: 150 },
  { l: 49, t: 36, d: 300 },
];
function BeastPassScene({ palette, glyph, variant, delayMs }: SceneProps) {
  const [core, glow, deep] = palette;
  return (
    <>
      <Stage>
        <Wash color={tint(deep, 0.2)} delayMs={delayMs} />
        <Rake tone={tint(core, 0.45)} delayMs={delayMs + 70} />
        {/* the shadow crosses first: the tell overhead */}
        <span
          className="ftp-wingshadow absolute block rounded-full"
          style={{ left: "38%", top: "44%", width: "24%", height: "10%", background: `radial-gradient(closest-side, ${tint(deep, 0.7)}, transparent)`, ...d(delayMs + 160) }}
        />
        <Flash color={tint(glow, 0.9)} delayMs={delayMs + 820} />
        <Ring color={tint(core, 0.85)} delayMs={delayMs + 900} />
        {variant === "pack" && (
          <span
            className="ftp-gust absolute block rounded-full"
            style={{ left: "36%", top: "54%", width: "28%", height: "7%", background: `radial-gradient(closest-side, ${tint(core, 0.5)}, transparent)`, ...d(delayMs + 760) }}
          />
        )}
        {BEAST_FEATHERS.map((f, i) => (
          <span key={i} className="ftp-feather absolute block" style={{ left: `${f.l}%`, top: `${f.t}%`, width: "2.4%", height: "3.2%", ...d(delayMs + 1150 + f.d) }}>
            <svg viewBox="0 0 6 8" className="block h-full w-full" aria-hidden="true">
              <path d="M3 0.6 Q5.4 3 3 7.4 Q0.6 3 3 0.6 Z" fill={tint(glow, 0.9)} stroke={deep} strokeWidth="0.4" />
            </svg>
          </span>
        ))}
        <Drift tone={core} delayMs={delayMs + 1550} />
      </Stage>
      {/* the beast itself travels down the real attack vector */}
      <AimStage>
        <span className="ftp-pass absolute block" style={{ left: "36%", top: "38%", width: "28%", height: "22%", ...d(delayMs + 520) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">{glyph}</svg>
        </span>
        <span
          className="ftp-claw absolute block"
          style={{ left: "46%", top: "46%", width: "16%", height: "8%", background: `repeating-linear-gradient(180deg, ${tint(glow, 0.95)} 0 12%, transparent 12% 44%)`, borderRadius: "999px", ...d(delayMs + 780) }}
        />
      </AimStage>
    </>
  );
}

/* --- Gaze / petrify: do not look back ---------------------------------------- */
const STONE_DUST = [
  { l: 44, t: 52, d: 0 },
  { l: 52, t: 54, d: 130 },
  { l: 48, t: 50, d: 260 },
];
function GazeStoneScene({ palette, glyph, variant, delayMs }: SceneProps) {
  const [core, glow, deep] = palette;
  return (
    <>
      <Stage>
        <Wash color={tint(deep, 0.22)} delayMs={delayMs} />
        <Rake tone={tint(core, 0.45)} delayMs={delayMs + 60} />
        {/* the eye opens */}
        <span className="ftp-eye absolute block" style={{ left: "38%", top: "30%", width: "24%", height: "13%", ...d(delayMs + 160) }}>
          <svg viewBox="0 0 24 13" className="block h-full w-full" aria-hidden="true">
            <path d="M1 6.5 Q12 -1.5 23 6.5 Q12 14.5 1 6.5 Z" fill={tint(deep, 0.9)} stroke={core} strokeWidth="0.8" {...SJ} />
            <circle cx="12" cy="6.5" r="3.2" fill={glow} />
            <path d="M12 3.4 V9.6" stroke={deep} strokeWidth="1.1" strokeLinecap="round" />
          </svg>
        </span>
        <Flash color={tint(glow, 0.85)} delayMs={delayMs + 860} />
        {/* the flesh remembers how to be stone */}
        <span className="ftp-crack absolute block" style={{ left: "40%", top: "42%", width: "20%", height: "20%", ...d(delayMs + 980) }}>
          <svg viewBox="0 0 20 20" className="block h-full w-full" aria-hidden="true">
            <path d="M10 10 L3 6 M10 10 L16 3.6 M10 10 L17 13.6 M10 10 L6 17 M10 10 L2.6 12.6" stroke={core} strokeWidth="0.9" strokeLinecap="round" />
          </svg>
        </span>
        <span className="ftp-hitpop absolute block" style={{ left: "42%", top: "44%", width: "16%", height: "16%", ...d(delayMs + 1040) }}>
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">{glyph}</svg>
        </span>
        <Ring color={tint(core, 0.8)} delayMs={delayMs + 1100} />
        {variant === "creep" && (
          <span
            className="ftp-mist absolute block"
            style={{ left: "30%", top: "56%", width: "40%", height: "8%", borderRadius: "999px", background: `linear-gradient(90deg, transparent, ${tint(core, 0.5)}, transparent)`, ...d(delayMs + 1250) }}
          />
        )}
        {STONE_DUST.map((s, i) => (
          <span
            key={i}
            className="ftp-stonedust absolute block rounded-full"
            style={{ left: `${s.l}%`, top: `${s.t}%`, width: "2.2%", height: "2.2%", background: tint(core, 0.85), ...d(delayMs + 1300 + s.d) }}
          />
        ))}
        <Drift tone={core} delayMs={delayMs + 1600} />
      </Stage>
      {/* the gaze itself sweeps down the aim vector */}
      <AimStage>
        <span
          className="ftp-gaze absolute block"
          style={{ left: "50%", top: "44%", width: "34%", height: "12%", background: `linear-gradient(90deg, ${tint(glow, 0.85)}, transparent)`, clipPath: "polygon(0 42%, 100% 0, 100% 100%, 0 58%)", ...d(delayMs + 540) }}
        />
      </AimStage>
    </>
  );
}

/* --- Divine light: a higher power answers ------------------------------------ */
const DL_RAYS = [
  { r: -24, d: 0 },
  { r: 0, d: 80 },
  { r: 24, d: 160 },
];
const DL_FEATHERS = [
  { l: 43, t: 36, d: 0 },
  { l: 55, t: 40, d: 170 },
];
function DivineLightScene({ palette, glyph, variant, delayMs }: SceneProps) {
  const [core, glow, deep] = palette;
  return (
    <Stage>
      <Wash color={tint(deep, 0.2)} delayMs={delayMs} />
      <Rake tone={tint(glow, 0.45)} delayMs={delayMs + 60} />
      {DL_RAYS.map((r, i) => (
        <span
          key={i}
          className="ftp-ray absolute block"
          style={{ left: "47%", top: "10%", width: "6%", height: "36%", background: `linear-gradient(180deg, ${tint(glow, 0.9)}, transparent)`, transform: `rotate(${r.r}deg)`, transformOrigin: "50% 0%", ...d(delayMs + 120 + r.d) }}
        />
      ))}
      {/* the sigil descends inside its halo */}
      <span
        className="ftp-halo absolute block rounded-full"
        style={{ left: "40%", top: "32%", width: "20%", height: "8%", border: `3px solid ${tint(glow, 0.9)}`, ...d(delayMs + 460) }}
      />
      <span className="ftp-relic absolute block" style={{ left: "41%", top: "34%", width: "18%", height: "20%", ...d(delayMs + 620) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">{glyph}</svg>
      </span>
      <Flash color={WARM} delayMs={delayMs + 860} />
      <Ring color={tint(core, 0.85)} delayMs={delayMs + 940} />
      {variant === "bolt" && (
        <span
          className="ftp-bolt absolute block"
          style={{ left: "48%", top: "16%", width: "4%", height: "30%", background: `linear-gradient(180deg, ${WARM}, ${tint(glow, 0.9)})`, clipPath: "polygon(20% 0, 80% 0, 55% 46%, 90% 46%, 24% 100%, 44% 56%, 10% 56%)", ...d(delayMs + 800) }}
        />
      )}
      {DL_FEATHERS.map((f, i) => (
        <span key={i} className="ftp-featherfall absolute block" style={{ left: `${f.l}%`, top: `${f.t}%`, width: "2.6%", height: "3.4%", ...d(delayMs + 1220 + f.d) }}>
          <svg viewBox="0 0 6 8" className="block h-full w-full" aria-hidden="true">
            <path d="M3 0.6 Q5.4 3 3 7.4 Q0.6 3 3 0.6 Z" fill={WARM} stroke={glow} strokeWidth="0.4" />
          </svg>
        </span>
      ))}
      <Motes color={tint(glow, 0.85)} delayMs={delayMs + 1350} />
      <Drift tone={glow} delayMs={delayMs + 1600} />
    </Stage>
  );
}

/* --- Necromancy rise: death is a doorway ------------------------------------- */
const NR_WISPS = [
  { l: 40, t: 46, d: 0 },
  { l: 52, t: 50, d: 150 },
  { l: 60, t: 44, d: 300 },
];
function NecroRiseScene({ palette, glyph, variant, delayMs }: SceneProps) {
  const [core, glow, deep] = palette;
  return (
    <Stage>
      <Wash color={tint(deep, 0.24)} delayMs={delayMs} />
      <Rake tone={tint(core, 0.45)} delayMs={delayMs + 60} />
      {/* the ground splits with a grave-light seam */}
      <span className="ftp-soil absolute block" style={{ left: "36%", top: "50%", width: "28%", height: "9%", ...d(delayMs + 150) }}>
        <svg viewBox="0 0 28 9" className="block h-full w-full" aria-hidden="true">
          <path d="M1 5 L7 4 L11 6 L15 3.6 L20 5.6 L27 4.4" fill="none" stroke={glow} strokeWidth="1" {...SJ} />
          <path d="M6 5.4 L8 8 M16 4.6 L15 8 M22 5.2 L23.6 8" stroke={tint(glow, 0.7)} strokeWidth="0.7" strokeLinecap="round" />
        </svg>
      </span>
      {NR_WISPS.map((w, i) => (
        <span
          key={i}
          className="ftp-wisp absolute block rounded-full"
          style={{ left: `${w.l}%`, top: `${w.t}%`, width: "2.8%", height: "4%", background: `radial-gradient(circle, ${tint(glow, 0.9)}, transparent 70%)`, ...d(delayMs + 380 + w.d) }}
        />
      ))}
      {/* what was buried claws back up */}
      <span className="ftp-clawup absolute block" style={{ left: "40%", top: "32%", width: "20%", height: "23%", ...d(delayMs + 760) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">{glyph}</svg>
      </span>
      <Flash color={tint(glow, 0.85)} delayMs={delayMs + 860} />
      <Ring color={tint(core, 0.8)} delayMs={delayMs + 940} />
      {variant === "reap" && (
        <span
          className="ftp-gaze absolute block"
          style={{ left: "46%", top: "36%", width: "26%", height: "10%", background: `linear-gradient(90deg, ${tint(core, 0.85)}, transparent)`, clipPath: "polygon(0 40%, 100% 0, 100% 100%, 0 60%)", ...d(delayMs + 900) }}
        />
      )}
      <span
        className="ftp-mist absolute block"
        style={{ left: "30%", top: "55%", width: "40%", height: "8%", borderRadius: "999px", background: `linear-gradient(90deg, transparent, ${tint(glow, 0.4)}, transparent)`, ...d(delayMs + 1300) }}
      />
      <Drift tone={core} delayMs={delayMs + 1600} />
    </Stage>
  );
}

/* --- Elements: raw nature turned to war -------------------------------------- */
const EL_SHARDS = [
  { dx: "90%", dy: "-120%", rot: "50deg", d: 0 },
  { dx: "-100%", dy: "-90%", rot: "-40deg", d: 90 },
  { dx: "30%", dy: "-160%", rot: "20deg", d: 180 },
];
function ElementSurgeScene({ palette, glyph, variant, delayMs }: SceneProps) {
  const [core, glow, deep] = palette;
  return (
    <Stage>
      <Wash color={tint(deep, 0.22)} delayMs={delayMs} />
      <Rake tone={tint(core, 0.45)} delayMs={delayMs + 60} />
      {/* the omen: the air shivers over the spot first */}
      <span
        className="ftp-gust absolute block rounded-full"
        style={{ left: "38%", top: "46%", width: "24%", height: "9%", background: `radial-gradient(closest-side, ${tint(glow, 0.5)}, transparent)`, ...d(delayMs + 140) }}
      />
      {/* the eruption carries the card's element up out of the ground */}
      <span className="ftp-surge absolute block" style={{ left: "38%", top: "30%", width: "24%", height: "26%", ...d(delayMs + 540) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">{glyph}</svg>
      </span>
      {variant === "bolt" && (
        <span
          className="ftp-bolt absolute block"
          style={{ left: "47%", top: "14%", width: "5%", height: "32%", background: `linear-gradient(180deg, ${WARM}, ${tint(glow, 0.95)})`, clipPath: "polygon(20% 0, 80% 0, 55% 46%, 90% 46%, 24% 100%, 44% 56%, 10% 56%)", ...d(delayMs + 620) }}
        />
      )}
      {variant === "sink" && (
        <span
          className="ftp-dropshadow absolute block rounded-full"
          style={{ left: "40%", top: "48%", width: "20%", height: "9%", background: `radial-gradient(closest-side, ${tint(deep, 0.9)}, transparent)`, ...d(delayMs + 620) }}
        />
      )}
      <Flash color={tint(glow, 0.9)} delayMs={delayMs + 780} />
      <Ring color={tint(core, 0.85)} delayMs={delayMs + 860} />
      {EL_SHARDS.map((s, i) => (
        <span
          key={i}
          className="ftp-shard absolute block"
          style={{ left: "48%", top: "44%", width: "2.6%", height: "3.6%", background: core, clipPath: "polygon(50% 0, 100% 100%, 0 100%)", "--dx": s.dx, "--dy": s.dy, "--rot": s.rot, ...d(delayMs + 900 + s.d) } as CSSProperties}
        />
      ))}
      <Motes color={tint(glow, 0.8)} delayMs={delayMs + 1300} />
      <Drift tone={core} delayMs={delayMs + 1600} />
    </Stage>
  );
}

/* --- Artifact forge: relics of a lost age ------------------------------------ */
const RF_SPARKS = [
  { dx: "130%", dy: "-110%", d: 0 },
  { dx: "-120%", dy: "-90%", d: 80 },
  { dx: "50%", dy: "-160%", d: 160 },
];
function RelicForgeScene({ palette, glyph, variant, delayMs }: SceneProps) {
  const [core, glow, deep] = palette;
  return (
    <Stage>
      <Wash color={tint(deep, 0.2)} delayMs={delayMs} />
      <Rake tone={tint(glow, 0.45)} delayMs={delayMs + 60} />
      {/* the reliquary light wakes under it */}
      <span
        className="ftp-ripple absolute block rounded-full"
        style={{ left: "38%", top: "52%", width: "24%", height: "8%", border: `2px solid ${tint(glow, 0.8)}`, ...d(delayMs + 140) }}
      />
      {/* the relic rises to be taken up */}
      <span className="ftp-relic absolute block" style={{ left: "39%", top: "30%", width: "22%", height: "25%", ...d(delayMs + 520) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">{glyph}</svg>
      </span>
      {/* forge-light sweeps its face */}
      <span
        className="ftp-gleam absolute block"
        style={{ left: "40%", top: "32%", width: "6%", height: "22%", background: `linear-gradient(180deg, transparent, ${WARM}, transparent)`, ...d(delayMs + 940) }}
      />
      <Flash color={tint(glow, 0.95)} delayMs={delayMs + 1000} />
      <Ring color={tint(core, 0.85)} delayMs={delayMs + 1080} />
      {variant === "chain" && (
        <span
          className="ftp-chain absolute block"
          style={{ left: "30%", top: "44%", width: "40%", height: "3%", background: `repeating-linear-gradient(90deg, ${tint(core, 0.9)} 0 8%, transparent 8% 14%)`, borderRadius: "999px", ...d(delayMs + 1050) }}
        />
      )}
      {RF_SPARKS.map((s, i) => (
        <span
          key={i}
          className="ftp-spark absolute block rounded-full"
          style={{ left: "49%", top: "46%", width: "1.8%", height: "1.8%", background: glow, "--dx": s.dx, "--dy": s.dy, ...d(delayMs + 1120 + s.d) } as CSSProperties}
        />
      ))}
      <Motes color={tint(glow, 0.85)} delayMs={delayMs + 1400} />
      <Drift tone={glow} delayMs={delayMs + 1650} />
    </Stage>
  );
}

/* --- Curse sigil: malice, inscribed ------------------------------------------ */
const CURSE_DRIPS = [
  { l: 42, d: 0 },
  { l: 50, d: 130 },
  { l: 58, d: 260 },
];
function CurseSigilScene({ palette, glyph, variant, delayMs }: SceneProps) {
  const [core, glow, deep] = palette;
  return (
    <Stage>
      <Wash color={tint(deep, 0.26)} delayMs={delayMs} />
      <Rake tone={tint(core, 0.45)} delayMs={delayMs + 60} />
      {/* the sigil inscribes itself counter-clockwise and settles */}
      <span className="ftp-sigil absolute block" style={{ left: "36%", top: "30%", width: "28%", height: "28%", ...d(delayMs + 180) }}>
        <svg viewBox="0 0 28 28" className="block h-full w-full" aria-hidden="true">
          <circle cx="14" cy="14" r="12" fill="none" stroke={core} strokeWidth="0.9" strokeDasharray="4 2.6" />
          <path d="M14 3.6 L20.4 21.2 L5 10.4 H23 L7.6 21.2 Z" fill="none" stroke={tint(glow, 0.9)} strokeWidth="0.7" {...SJ} />
        </svg>
      </span>
      <span className="ftp-hitpop absolute block" style={{ left: "42%", top: "36%", width: "16%", height: "16%", ...d(delayMs + 560) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">{glyph}</svg>
      </span>
      {/* the shackles clamp shut from both sides */}
      <span
        className="ftp-chain absolute block"
        style={{ left: "30%", top: "43%", width: "40%", height: "3%", background: `repeating-linear-gradient(90deg, ${tint(core, 0.95)} 0 8%, transparent 8% 14%)`, borderRadius: "999px", ...d(delayMs + 740) }}
      />
      <Flash color={tint(glow, 0.8)} delayMs={delayMs + 800} />
      <Ring color={tint(core, 0.8)} delayMs={delayMs + 880} />
      {variant === "march" && (
        <span
          className="ftp-mist absolute block"
          style={{ left: "28%", top: "54%", width: "44%", height: "8%", borderRadius: "999px", background: `linear-gradient(90deg, transparent, ${tint(core, 0.5)}, transparent)`, ...d(delayMs + 980) }}
        />
      )}
      {CURSE_DRIPS.map((v, i) => (
        <span
          key={i}
          className="ftp-drip absolute block"
          style={{ left: `${v.l}%`, top: "56%", width: "1.6%", height: "6%", borderRadius: "999px", background: `linear-gradient(180deg, ${tint(glow, 0.9)}, transparent)`, ...d(delayMs + 1080 + v.d) }}
        />
      ))}
      <Drift tone={core} delayMs={delayMs + 1550} />
    </Stage>
  );
}

/* --- Ascension: reforged into something greater ------------------------------- */
const ASC_STARS = [
  { l: 42, t: 34, d: 0 },
  { l: 58, t: 38, d: 120 },
  { l: 50, t: 28, d: 240 },
];
function AscendScene({ palette, glyph, variant, delayMs }: SceneProps) {
  const [core, glow, deep] = palette;
  return (
    <Stage>
      <Wash color={tint(deep, 0.2)} delayMs={delayMs} />
      <Rake tone={tint(glow, 0.45)} delayMs={delayMs + 60} />
      {/* the cocoon of light winds shut around the old shape */}
      <span
        className="ftp-cocoon absolute block rounded-full"
        style={{ left: "39%", top: "34%", width: "22%", height: "26%", border: `3px solid ${tint(glow, 0.85)}`, background: `radial-gradient(circle, ${tint(core, 0.35)}, transparent 70%)`, ...d(delayMs + 160) }}
      />
      {/* the burst: the change of form is violent and bright */}
      <span
        className="ftp-burst absolute block rounded-full"
        style={{ left: "42%", top: "38%", width: "16%", height: "18%", background: `radial-gradient(circle, ${WARM}, ${tint(glow, 0.7)} 60%, transparent)`, ...d(delayMs + 720) }}
      />
      {/* what stands after is taller */}
      <span className="ftp-summon absolute block" style={{ left: "40%", top: "30%", width: "20%", height: "25%", ...d(delayMs + 800) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">{glyph}</svg>
      </span>
      <Ring color={tint(core, 0.85)} delayMs={delayMs + 880} />
      {variant === "wings" && (
        <span
          className="ftp-gust absolute block rounded-full"
          style={{ left: "36%", top: "50%", width: "28%", height: "8%", background: `radial-gradient(closest-side, ${tint(core, 0.5)}, transparent)`, ...d(delayMs + 900) }}
        />
      )}
      {ASC_STARS.map((s, i) => (
        <span key={i} className="ftp-star absolute block" style={{ left: `${s.l}%`, top: `${s.t}%`, width: "2.6%", height: "2.6%", ...d(delayMs + 1050 + s.d) }}>
          <svg viewBox="0 0 8 8" className="block h-full w-full" aria-hidden="true">
            <path d="M4 0.6 L4.9 3.1 L7.4 4 L4.9 4.9 L4 7.4 L3.1 4.9 L0.6 4 L3.1 3.1 Z" fill={glow} />
          </svg>
        </span>
      ))}
      <Motes color={tint(glow, 0.85)} delayMs={delayMs + 1350} />
      <Drift tone={glow} delayMs={delayMs + 1600} />
    </Stage>
  );
}

/* =============================================================================
   Glyphs (viewBox 0 0 10 10)
   ========================================================================== */


/* =============================================================================
   Mythic ladder scenes (src/engine/buffs/fantasy/mythic.ts): three templates,
   one per card kind, each bent by a per-card variant.
   ========================================================================== */

/* --- Runeforge: a power is hammered onto your own army --------------------- */
const FORGE_SPARKS = [
  { l: 46, t: 38, dx: "-120%", dy: "-160%", d: 0 },
  { l: 52, t: 40, dx: "140%", dy: "-120%", d: 60 },
  { l: 49, t: 36, dx: "20%", dy: "-200%", d: 120 },
  { l: 55, t: 44, dx: "180%", dy: "-40%", d: 180 },
];
function RuneforgeScene({ palette, glyph, variant, delayMs }: SceneProps) {
  const [core, glow, deep] = palette;
  return (
    <Stage quakeMs={delayMs + 980}>
      <Wash color={tint(deep, 0.24)} delayMs={delayMs} />
      <Rake tone={tint(core, 0.4)} delayMs={delayMs + 40} />
      {/* the anvil ring heats up under the work */}
      <span
        className="ftp-anvilring absolute block rounded-full"
        style={{ left: "33%", top: "50%", width: "34%", height: "14%", border: `2px solid ${tint(core, 0.85)}`, boxShadow: `inset 0 0 0 1px ${tint(glow, 0.35)}`, ...d(delayMs + 120) }}
      />
      {/* three hammer blows: the rune jumps on each strike */}
      <span className="ftp-hammer absolute block" style={{ left: "40%", top: "28%", width: "20%", height: "24%", ...d(delayMs + 380) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">{glyph}</svg>
      </span>
      {[0, 300, 600].map((t, i) => (
        <Flash key={i} color={tint(glow, 0.7)} delayMs={delayMs + 440 + t} />
      ))}
      {FORGE_SPARKS.map((v, i) => (
        <span
          key={i}
          className="ftp-spark absolute block rounded-full"
          style={{ left: `${v.l}%`, top: `${v.t}%`, width: "2.4%", height: "2.4%", background: tint(glow, 0.95), "--dx": v.dx, "--dy": v.dy, ...d(delayMs + 460 + v.d) } as CSSProperties}
        />
      ))}
      {variant === "storm" && (
        <span
          className="ftp-bolt absolute block"
          style={{ left: "48%", top: "6%", width: "4%", height: "40%", background: `linear-gradient(180deg, ${tint(glow, 0.95)}, ${tint(core, 0.6)}, transparent)`, ...d(delayMs + 700) }}
        />
      )}
      {variant === "eclipse" && (
        <span
          className="ftp-eclipse absolute block rounded-full"
          style={{ left: "38%", top: "22%", width: "24%", height: "24%", background: deep, boxShadow: `0 0 0 3px ${tint(glow, 0.9)}, 0 0 28px 6px ${tint(core, 0.55)}`, ...d(delayMs + 760) }}
        />
      )}
      {variant === "phoenix" && (
        <span
          className="ftp-wisp absolute block rounded-full"
          style={{ left: "47%", top: "44%", width: "6%", height: "16%", background: `linear-gradient(180deg, ${tint(glow, 0.95)}, ${tint(core, 0.7)}, transparent)`, ...d(delayMs + 820) }}
        />
      )}
      {variant === "moss" && (
        <span
          className="ftp-dome absolute block rounded-full"
          style={{ left: "30%", top: "30%", width: "40%", height: "40%", border: `2px solid ${tint(glow, 0.7)}`, background: `radial-gradient(closest-side, ${tint(core, 0.18)}, transparent)`, ...d(delayMs + 760) }}
        />
      )}
      {variant === "moon" && (
        <span
          className="ftp-halo absolute block rounded-full"
          style={{ left: "58%", top: "14%", width: "14%", height: "14%", background: `radial-gradient(circle at 40% 40%, ${glow}, ${tint(core, 0.6)})`, boxShadow: `0 0 16px 4px ${tint(glow, 0.4)}`, ...d(delayMs + 700) }}
        />
      )}
      {variant === "scale" &&
        [0, 1, 2].map((i) => (
          <span
            key={i}
            className="ftp-relic absolute block"
            style={{ left: `${40 + i * 7}%`, top: `${58 - (i % 2) * 4}%`, width: "6%", height: "8%", background: `linear-gradient(180deg, ${tint(glow, 0.9)}, ${tint(core, 0.6)})`, borderRadius: "0 0 50% 50%", ...d(delayMs + 720 + i * 90) }}
          />
        ))}
      {variant === "blood" &&
        [0, 1].map((i) => (
          <span
            key={i}
            className="ftp-drip absolute block"
            style={{ left: `${45 + i * 8}%`, top: "50%", width: "2.2%", height: "9%", borderRadius: "999px", background: `linear-gradient(180deg, ${tint(core, 0.95)}, ${tint(glow, 0.6)}, transparent)`, ...d(delayMs + 780 + i * 140) }}
          />
        ))}
      {variant === "sun" && (
        <span
          className="ftp-ray absolute block"
          style={{ left: "20%", top: "20%", width: "60%", height: "40%", background: `conic-gradient(from 200deg at 50% 100%, transparent 0 38%, ${tint(glow, 0.35)} 42%, transparent 46%, ${tint(glow, 0.3)} 52%, transparent 56%, ${tint(glow, 0.35)} 60%, transparent 64%)`, ...d(delayMs + 800) }}
        />
      )}
      <Ring color={tint(core, 0.85)} delayMs={delayMs + 1000} />
      <Motes color={tint(glow, 0.8)} delayMs={delayMs + 1200} />
      <Drift tone={core} delayMs={delayMs + 1550} />
    </Stage>
  );
}

/* --- Hexweave: threads draw in from the corners and knot on the victim ------ */
const WEAVE_THREADS = [
  { l: 6, t: 8, ang: 38 },
  { l: 94, t: 8, ang: 142 },
  { l: 6, t: 92, ang: -38 },
  { l: 94, t: 92, ang: -142 },
];
function HexweaveScene({ palette, glyph, variant, delayMs }: SceneProps) {
  const [core, glow, deep] = palette;
  return (
    <Stage>
      <Wash color={tint(deep, 0.3)} delayMs={delayMs} />
      {/* the omen: the ground darkens toward the victim before a thread moves */}
      <Rake tone={tint(core, 0.4)} delayMs={delayMs + 40} />
      {WEAVE_THREADS.map((v, i) => (
        <span
          key={i}
          className="ftp-thread absolute block"
          style={{ left: `${v.l}%`, top: `${v.t}%`, width: "48%", height: "1.2%", background: `linear-gradient(90deg, transparent, ${tint(core, 0.9)} 30%, ${tint(glow, 0.95)})`, transformOrigin: "0 50%", "--ang": `${v.ang}deg`, ...d(delayMs + 120 + i * 90) } as CSSProperties}
        />
      ))}
      {/* the knot pulls tight around the glyph */}
      <span className="ftp-knot absolute block" style={{ left: "41%", top: "37%", width: "18%", height: "22%", ...d(delayMs + 640) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">{glyph}</svg>
      </span>
      <span
        className="ftp-chain absolute block"
        style={{ left: "31%", top: "47%", width: "38%", height: "2.6%", background: `repeating-linear-gradient(90deg, ${tint(core, 0.95)} 0 9%, transparent 9% 15%)`, borderRadius: "999px", ...d(delayMs + 760) }}
      />
      <Flash color={tint(glow, 0.75)} delayMs={delayMs + 820} />
      {variant === "frost" &&
        [0, 1, 2].map((i) => (
          <span
            key={i}
            className="ftp-shard absolute block"
            style={{ left: `${44 + i * 5}%`, top: `${40 + (i % 2) * 8}%`, width: "2.4%", height: "9%", background: `linear-gradient(180deg, ${tint(glow, 0.95)}, ${tint(core, 0.5)})`, ...d(delayMs + 900 + i * 70) }}
          />
        ))}
      {variant === "moat" && (
        <span
          className="ftp-ripple absolute block rounded-full"
          style={{ left: "28%", top: "44%", width: "44%", height: "18%", border: `2px solid ${tint(glow, 0.8)}`, ...d(delayMs + 900) }}
        />
      )}
      {variant === "gaze" && (
        <span className="ftp-eye absolute block" style={{ left: "43%", top: "24%", width: "14%", height: "9%", ...d(delayMs + 880) }}>
          <svg viewBox="0 0 14 9" className="block h-full w-full" aria-hidden="true">
            <path d="M0.8 4.5 Q7 -1 13.2 4.5 Q7 10 0.8 4.5 Z" fill={tint(deep, 0.9)} stroke={glow} strokeWidth="0.6" />
            <circle cx="7" cy="4.5" r="2" fill={core} />
          </svg>
        </span>
      )}
      {variant === "stone" && (
        <span
          className="ftp-stonedust absolute block rounded-full"
          style={{ left: "40%", top: "52%", width: "20%", height: "7%", background: `radial-gradient(closest-side, ${tint(core, 0.6)}, transparent)`, ...d(delayMs + 960) }}
        />
      )}
      {variant === "burr" &&
        [0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="ftp-spark absolute block rounded-full"
            style={{ left: `${46 + (i % 2) * 8}%`, top: `${40 + Math.floor(i / 2) * 10}%`, width: "2%", height: "2%", background: tint(glow, 0.95), "--dx": i % 2 ? "120%" : "-120%", "--dy": i < 2 ? "-110%" : "90%", ...d(delayMs + 900 + i * 50) } as CSSProperties}
          />
        ))}
      {variant === "fog" && (
        <span
          className="ftp-mist absolute block"
          style={{ left: "22%", top: "50%", width: "56%", height: "12%", borderRadius: "999px", background: `linear-gradient(90deg, transparent, ${tint(core, 0.55)}, transparent)`, ...d(delayMs + 880) }}
        />
      )}
      {variant === "thorn" &&
        [0, 1, 2].map((i) => (
          <span
            key={i}
            className="ftp-clawup absolute block"
            style={{ left: `${40 + i * 8}%`, top: "50%", width: "2%", height: "12%", background: `linear-gradient(0deg, ${tint(core, 0.95)}, ${tint(glow, 0.7)})`, borderRadius: "999px 999px 0 0", ...d(delayMs + 860 + i * 80) }}
          />
        ))}
      {variant === "song" &&
        [0, 1, 2].map((i) => (
          <span
            key={i}
            className="ftp-ripple absolute block rounded-full"
            style={{ left: `${44 - i * 6}%`, top: `${46 - i * 4}%`, width: `${12 + i * 12}%`, height: `${8 + i * 8}%`, border: `1.5px solid ${tint(glow, 0.7 - i * 0.15)}`, ...d(delayMs + 860 + i * 140) }}
          />
        ))}
      <Ring color={tint(core, 0.8)} delayMs={delayMs + 960} />
      <Drift tone={core} delayMs={delayMs + 1500} />
    </Stage>
  );
}

/* --- Blessing: a small grace, given quietly --------------------------------- */
const BLESS_PETALS = [
  { l: 44, t: 44, dx: "-90%", dy: "-110%", d: 0 },
  { l: 54, t: 46, dx: "110%", dy: "-90%", d: 100 },
  { l: 49, t: 40, dx: "10%", dy: "-150%", d: 200 },
];
function BlessingScene({ palette, glyph, variant, delayMs }: SceneProps) {
  const [core, glow, deep] = palette;
  return (
    <Stage>
      <Wash color={tint(deep, 0.16)} delayMs={delayMs} />
      <span
        className="ftp-featherfall absolute block rounded-full"
        style={{ left: "47%", top: "10%", width: "5%", height: "12%", background: `linear-gradient(180deg, ${tint(glow, 0.95)}, ${tint(core, 0.6)})`, ...d(delayMs + 120) }}
      />
      <span
        className="ftp-halo absolute block rounded-full"
        style={{ left: "38%", top: "34%", width: "24%", height: "24%", border: `2px solid ${tint(glow, 0.8)}`, boxShadow: `0 0 18px 2px ${tint(core, 0.35)}`, ...d(delayMs + 460) }}
      />
      <span className="ftp-summon absolute block" style={{ left: "41%", top: "36%", width: "18%", height: "22%", ...d(delayMs + 520) }}>
        <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true">{glyph}</svg>
      </span>
      {BLESS_PETALS.map((v, i) => (
        <span
          key={i}
          className="ftp-petal absolute block rounded-full"
          style={{ left: `${v.l}%`, top: `${v.t}%`, width: "3%", height: "4%", background: tint(glow, 0.9), "--dx": v.dx, "--dy": v.dy, ...d(delayMs + 780 + v.d) } as CSSProperties}
        />
      ))}
      {variant === "bread" && (
        <span
          className="ftp-stonedust absolute block rounded-full"
          style={{ left: "42%", top: "54%", width: "16%", height: "6%", background: `radial-gradient(closest-side, ${tint(core, 0.55)}, transparent)`, ...d(delayMs + 860) }}
        />
      )}
      {variant === "road" && (
        <span
          className="ftp-legrun absolute block"
          style={{ left: "22%", top: "56%", width: "56%", height: "1.4%", background: `linear-gradient(90deg, transparent, ${tint(glow, 0.9)}, transparent)`, ...d(delayMs + 880) }}
        />
      )}
      {variant === "heart" && <Ring color={tint(glow, 0.9)} delayMs={delayMs + 1080} />}
      {variant === "lantern" && (
        <span
          className="ftp-gleam absolute block rounded-full"
          style={{ left: "44%", top: "40%", width: "12%", height: "12%", background: `radial-gradient(circle, ${tint(glow, 0.95)}, ${tint(core, 0.4)} 60%, transparent)`, ...d(delayMs + 820) }}
        />
      )}
      {variant === "drop" && (
        <span
          className="ftp-ripple absolute block rounded-full"
          style={{ left: "36%", top: "56%", width: "28%", height: "10%", border: `1.5px solid ${tint(glow, 0.8)}`, ...d(delayMs + 900) }}
        />
      )}
      {variant === "oath" && (
        <span
          className="ftp-relic absolute block"
          style={{ left: "44%", top: "56%", width: "12%", height: "10%", background: `linear-gradient(180deg, ${tint(glow, 0.8)}, ${tint(core, 0.6)})`, clipPath: "polygon(10% 100%, 20% 20%, 50% 0, 80% 20%, 90% 100%)", ...d(delayMs + 880) }}
        />
      )}
      {variant === "wind" &&
        [0, 1].map((i) => (
          <span
            key={i}
            className="ftp-gust absolute block rounded-full"
            style={{ left: "30%", top: `${42 + i * 10}%`, width: "40%", height: "4%", background: `linear-gradient(90deg, transparent, ${tint(glow, 0.7)}, transparent)`, ...d(delayMs + 840 + i * 120) }}
          />
        ))}
      {variant === "bloom" &&
        [0, 1, 2].map((i) => (
          <span
            key={i}
            className="ftp-soil absolute block rounded-full"
            style={{ left: `${43 + i * 5}%`, top: "56%", width: "3%", height: "3%", background: tint(core, 0.85), ...d(delayMs + 860 + i * 90) }}
          />
        ))}
      <Ring color={tint(core, 0.75)} delayMs={delayMs + 940} />
      <Motes color={tint(glow, 0.75)} delayMs={delayMs + 1150} />
      <Drift tone={core} delayMs={delayMs + 1500} />
    </Stage>
  );
}

function Gl({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

const GLYPH: Record<string, ReactNode> = {
  /* --- heroes ---------------------------------------------------------------- */
  dragons_breath: (
    <Gl>
      <path d="M2 6.4 Q2 3 5 2.6 L6.4 1 L6.8 2.8 Q8.8 3.4 9 5.4 L6.6 5 L7.6 6.2 L5.4 5.8 Q5.8 7.6 4.4 8.6 Q2.6 8.4 2 6.4 Z" fill="#7a2f1a" stroke="#ff8a3d" strokeWidth="0.4" {...SJ} />
      <circle cx="5.6" cy="4" r="0.5" fill="#ffd76a" />
    </Gl>
  ),
  summon_dragon: (
    <Gl>
      <path d="M0.8 3.6 Q3 1.4 5 3.6 Q7 1.4 9.2 3.6 Q7.4 5 6 4.8 L5.4 8.2 Q5 9 4.6 8.2 L4 4.8 Q2.6 5 0.8 3.6 Z" fill="#3a1c3a" stroke="#c94ad1" strokeWidth="0.4" {...SJ} />
      <circle cx="5" cy="3.9" r="0.4" fill="#ffd76a" />
    </Gl>
  ),
  army_of_the_dead: (
    <Gl>
      <path d="M5 1 A3.2 3.2 0 0 0 1.8 4.2 Q1.8 6 3 6.8 V8.4 H7 V6.8 Q8.2 6 8.2 4.2 A3.2 3.2 0 0 0 5 1 Z" fill="#d9d2c0" stroke="#5c5348" strokeWidth="0.4" {...SJ} />
      <circle cx="3.8" cy="4.2" r="0.7" fill="#2a2a24" />
      <circle cx="6.2" cy="4.2" r="0.7" fill="#2a2a24" />
      <path d="M4 7.4 V8.2 M5 7.4 V8.2 M6 7.4 V8.2" stroke="#5c5348" strokeWidth="0.35" />
    </Gl>
  ),
  judgment_day: (
    <Gl>
      <path d="M5 1 V6 M2 2.4 H8" stroke="#ffd76a" strokeWidth="0.55" strokeLinecap="round" />
      <path d="M2 2.4 L1.2 5 H2.8 Z M8 2.4 L7.2 5 H8.8 Z" fill="none" stroke="#ffd76a" strokeWidth="0.4" {...SJ} />
      <path d="M3.6 8.6 H6.4" stroke="#e8dcc0" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  excalibur: (
    <Gl>
      <path d="M5 0.8 L5.7 2.4 V6 H4.3 V2.4 Z" fill="#fff4d6" stroke="#8faadc" strokeWidth="0.35" {...SJ} />
      <path d="M3 6.3 H7 M5 6.3 V8.4" stroke="#ffd76a" strokeWidth="0.6" strokeLinecap="round" />
      <circle cx="5" cy="9" r="0.6" fill="#ffd76a" />
    </Gl>
  ),
  philosophers_stone: (
    <Gl>
      <path d="M5 1.2 L8.8 7.8 H1.2 Z" fill="none" stroke="#ffd76a" strokeWidth="0.5" {...SJ} />
      <circle cx="5" cy="5.6" r="1.6" fill="#c9312b" stroke="#ffd76a" strokeWidth="0.4" />
    </Gl>
  ),
  divine_intervention: (
    <Gl>
      <circle cx="5" cy="5" r="2.2" fill="#ffd76a" />
      <path d="M5 0.8 V2 M5 8 V9.2 M0.8 5 H2 M8 5 H9.2 M2 2 L2.9 2.9 M8 2 L7.1 2.9 M2 8 L2.9 7.1 M8 8 L7.1 7.1" stroke="#fff4d6" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  starfall: (
    <Gl>
      <path d="M8.8 1.2 L5.6 4.4" stroke="#ffd76a" strokeWidth="0.6" strokeLinecap="round" />
      <circle cx="4.4" cy="5.6" r="2.4" fill="#c9642b" stroke="#ffd76a" strokeWidth="0.5" />
      <circle cx="3.7" cy="4.9" r="0.7" fill="#fff4d6" />
    </Gl>
  ),

  /* --- beasts ---------------------------------------------------------------- */
  wyverns_dive: (
    <Gl>
      <path d="M1 3 Q3.6 1.4 5 3.4 Q6.4 1.4 9 3 Q7 4.6 5.8 4.4 L5 8.6 L4.2 4.4 Q3 4.6 1 3 Z" fill="#4a5c2f" stroke="#a8c96a" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  griffon_rider: (
    <Gl>
      <path d="M2.6 7.8 Q1.6 4.6 4 3.4 Q4.4 1.6 6.2 1.8 L7.4 2.8 L6.2 3.2 Q7.8 4.6 7.2 6.4 Q6 8.4 2.6 7.8 Z" fill="#c9a84c" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <circle cx="5.8" cy="2.6" r="0.35" fill="#2a2018" />
      <path d="M3.2 5.4 Q4.6 4.4 5.8 5.4" fill="none" stroke="#8a6a3a" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  direwolf_pack: (
    <Gl>
      <path d="M2 8 L2.6 4.4 L1.8 2.2 L3.6 3.4 H5.4 L7.2 2.2 L6.4 4.4 L7 8 L4.5 6.6 Z" fill="#5a6b8f" stroke="#c9cdd6" strokeWidth="0.4" {...SJ} />
      <circle cx="3.7" cy="4.6" r="0.4" fill="#9fd8ff" />
      <circle cx="5.3" cy="4.6" r="0.4" fill="#9fd8ff" />
    </Gl>
  ),
  roost_of_rocs: (
    <Gl>
      <path d="M0.8 4.2 Q3 1.6 5 4 Q7 1.6 9.2 4.2 Q7.2 5.2 6 5 L6.6 8.8 H3.4 L4 5 Q2.8 5.2 0.8 4.2 Z" fill="#8a6a3a" stroke="#e8b04b" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  basilisk_stare: (
    <Gl>
      <path d="M1 5 Q5 1.6 9 5 Q5 8.4 1 5 Z" fill="#2f3a26" stroke="#7fae5a" strokeWidth="0.4" {...SJ} />
      <circle cx="5" cy="5" r="1.4" fill="#e8b04b" />
      <path d="M5 3.8 V6.2" stroke="#2f3a26" strokeWidth="0.55" strokeLinecap="round" />
    </Gl>
  ),
  serpent_brood: (
    <Gl>
      <path d="M2 7.6 Q1 5.6 3 5 Q5.6 4.4 5.4 3 Q5.2 1.8 3.8 2.2 M3 5 Q6.8 5 7.6 6.6 Q8.2 8 6.6 8.2 Q3.4 8.6 2 7.6 Z" fill="none" stroke="#7fae5a" strokeWidth="0.6" {...SJ} />
      <circle cx="3.7" cy="2.1" r="0.4" fill="#e8b04b" />
    </Gl>
  ),

  /* --- divine ---------------------------------------------------------------- */
  hallowed_return: (
    <Gl>
      <path d="M2.4 8.6 V4.6 Q2.4 1.6 5 1.6 Q7.6 1.6 7.6 4.6 V8.6" fill="none" stroke="#ffd76a" strokeWidth="0.55" {...SJ} />
      <path d="M5 4 L5.5 5.3 L6.8 5.8 L5.5 6.3 L5 7.6 L4.5 6.3 L3.2 5.8 L4.5 5.3 Z" fill="#fff4d6" />
    </Gl>
  ),
  divine_mandate: (
    <Gl>
      <path d="M2.6 1.6 H7.4 V7.2 L6.2 8.4 H2.6 Z" fill="#e8dcc0" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <path d="M3.6 3.2 H6.4 M3.6 4.4 H6.4 M3.6 5.6 H5.4" stroke="#8a6a3a" strokeWidth="0.35" strokeLinecap="round" />
      <circle cx="6.6" cy="7.4" r="1" fill="#c9312b" stroke="#ffd76a" strokeWidth="0.3" />
    </Gl>
  ),
  divine_reckoning: (
    <Gl>
      <path d="M5 1.4 L8.4 4.4 H7.2 V8.4 H2.8 V4.4 H1.6 Z" fill="none" stroke="#cdd6ff" strokeWidth="0.5" {...SJ} />
      <path d="M4 6.8 V5.4 H6 V6.8" fill="none" stroke="#cdd6ff" strokeWidth="0.4" />
    </Gl>
  ),
  heavens_wrath: (
    <Gl>
      <path d="M3 0.8 L1.8 4.2 H3 L2 7.4 L4.6 3.8 H3.4 L4.6 0.8 Z" fill="#ffd76a" stroke="#c98a1d" strokeWidth="0.25" {...SJ} />
      <path d="M7 1.6 L6 4.4 H7 L6.2 7 L8.4 4 H7.4 L8.4 1.6 Z" fill="#fff4d6" stroke="#c98a1d" strokeWidth="0.25" {...SJ} />
      <path d="M5.2 5.4 L4.6 7.4 H5.4 L4.8 9.2 L6.6 6.8 H5.8 L6.4 5.4 Z" fill="#ffd76a" stroke="#c98a1d" strokeWidth="0.25" {...SJ} />
    </Gl>
  ),

  /* --- necromancy ------------------------------------------------------------ */
  undying_thrall: (
    <Gl>
      <path d="M2 7.8 L6.6 3.2 A1.3 1.3 0 1 1 8.2 4.4 A1.3 1.3 0 1 1 6.8 6 L3.4 9.2 Z" fill="#d9d2c0" stroke="#5c5348" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  raise_dead: (
    <Gl>
      <path d="M2 8.8 H8" stroke="#5c5348" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M4 8.8 V4.6 M4 4.6 L3 3.2 M4 4.6 L4.4 2.8 M4 4.6 L5.4 3.4 M4 6 L5.8 5.2 M4 6.6 L2.6 5.8" fill="none" stroke="#a8e07f" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  withering_touch: (
    <Gl>
      <path d="M5 8.4 Q1.4 5.8 1.8 3.6 Q2.2 1.8 4 2.4 Q4.8 2.6 5 3.4 Q5.2 2.6 6 2.4 Q7.8 1.8 8.2 3.6 Q8.6 5.8 5 8.4 Z" fill="none" stroke="#c9b0e8" strokeWidth="0.5" {...SJ} />
      <path d="M4 4.2 L6 6.4 M6 4.2 L4 6.4" stroke="#6b4a8f" strokeWidth="0.45" strokeLinecap="round" />
    </Gl>
  ),
  soul_harvest: (
    <Gl>
      <path d="M3 1.2 Q7.4 1.6 8.4 4.4 Q6 3.6 3.8 4.6" fill="none" stroke="#c9cdd6" strokeWidth="0.6" {...SJ} />
      <path d="M3.6 2 L5.4 9" stroke="#8a6a3a" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  lich_phylactery: (
    <Gl>
      <path d="M4 1.4 H6 M5 1.4 V3 M3 8.6 Q1.8 6.2 3.8 4.6 L4.2 3 H5.8 L6.2 4.6 Q8.2 6.2 7 8.6 Z" fill="none" stroke="#8faf4a" strokeWidth="0.5" {...SJ} />
      <circle cx="5" cy="6.4" r="1" fill="#a8e07f" />
    </Gl>
  ),

  /* --- elements ---------------------------------------------------------------- */
  frost_wall: (
    <Gl>
      <path d="M1.4 8.4 V3.2 H8.6 V8.4 Z" fill="none" stroke="#9fd8ff" strokeWidth="0.5" {...SJ} />
      <path d="M1.4 5.8 H8.6 M3.8 3.2 V5.8 M6.2 5.8 V8.4" stroke="#9fd8ff" strokeWidth="0.4" />
      <path d="M4.6 1 L5 2 L6 2.2 L5 2.6 L4.6 3.6 L4.2 2.6 L3.2 2.2 L4.2 2 Z" fill="#e8f8ff" />
    </Gl>
  ),
  sinkhole: (
    <Gl>
      <path d="M5 5 m0 -3.6 a3.6 3.6 0 1 1 -3.6 3.6 a2.8 2.8 0 1 0 2.8 -2.8 a2 2 0 1 1 -2 2" fill="none" stroke="#8a7a63" strokeWidth="0.55" strokeLinecap="round" />
      <circle cx="5" cy="5" r="0.7" fill="#2a2018" />
    </Gl>
  ),
  chain_lightning: (
    <Gl>
      <path d="M5.6 0.8 L3 4.6 H4.8 L3.4 8 L7.2 4 H5.2 L6.8 0.8 Z" fill="#6fe3ff" stroke="#2c3e6b" strokeWidth="0.3" {...SJ} />
      <circle cx="7.6" cy="7.6" r="0.8" fill="none" stroke="#6fe3ff" strokeWidth="0.4" />
    </Gl>
  ),
  fissure_field: (
    <Gl>
      <path d="M1 5.4 L3.4 4.8 L4.6 6 L5.8 4.4 L7 5.6 L9 4.8" fill="none" stroke="#8a7a63" strokeWidth="0.6" {...SJ} />
      <path d="M3 5 L2.4 8 M6.4 5 L7 8.2 M4.9 5.4 L4.6 8.6" stroke="#5c5348" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  wall_of_thorns: (
    <Gl>
      <path d="M1.2 6.8 Q3.4 5.2 5 6.2 Q6.6 7.2 8.8 5.6" fill="none" stroke="#4a5c2f" strokeWidth="0.6" {...SJ} />
      <path d="M2.6 6.2 L2.2 5 M4.2 6 L4.4 4.8 M6 6.6 L6.4 5.4 M7.6 6 L7.4 4.8" stroke="#7fae5a" strokeWidth="0.45" strokeLinecap="round" />
    </Gl>
  ),

  /* --- artifacts ---------------------------------------------------------------- */
  horn_of_summoning: (
    <Gl>
      <path d="M2 7.6 Q1.4 4.2 4.2 3 Q7 1.8 8.6 3.6 Q7 4 6.4 5.2 Q5.6 7.6 3.6 8.2 Q2.4 8.4 2 7.6 Z" fill="#c9a84c" stroke="#8a6a3a" strokeWidth="0.4" {...SJ} />
      <path d="M7.4 2.4 Q8.4 1.6 9.2 2" fill="none" stroke="#ffd76a" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  orb_of_dominion: (
    <Gl>
      <circle cx="5" cy="4.6" r="2.8" fill="#3a1c3a" stroke="#c94ad1" strokeWidth="0.45" />
      <path d="M3.4 4.6 Q5 3 6.6 4.6 Q5 6.2 3.4 4.6 Z" fill="#e3d0ff" />
      <circle cx="5" cy="4.6" r="0.5" fill="#3a1c3a" />
      <path d="M3.4 8.6 H6.6" stroke="#c94ad1" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  staff_of_stasis: (
    <Gl>
      <path d="M4.6 9 L5.4 2.6" stroke="#8a6a3a" strokeWidth="0.55" strokeLinecap="round" />
      <path d="M5.4 2.6 L4.4 1.6 L5.6 0.8 L6.6 1.8 Z" fill="#9fd8ff" stroke="#4f8fd1" strokeWidth="0.35" {...SJ} />
      <circle cx="5.5" cy="1.7" r="1.5" fill="none" stroke="#9fd8ff" strokeWidth="0.3" strokeDasharray="0.8 0.6" />
    </Gl>
  ),
  aegis_of_ages: (
    <Gl>
      <path d="M5 0.9 Q7.4 1.9 8.6 1.9 Q8.6 6.6 5 9.1 Q1.4 6.6 1.4 1.9 Q2.6 1.9 5 0.9 Z" fill="#3f5c50" stroke="#5fc9b0" strokeWidth="0.45" {...SJ} />
      <path d="M5 2.8 V7 M3.2 4.6 H6.8" stroke="#ffd76a" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  banner_of_war: (
    <Gl>
      <path d="M3 9.2 V1" stroke="#8a6a3a" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M3 1.4 H8.4 L7 3 L8.4 4.6 H3 Z" fill="#c94a3a" stroke="#ffd76a" strokeWidth="0.35" {...SJ} />
    </Gl>
  ),

  /* --- curses ---------------------------------------------------------------- */
  evil_eye: (
    <Gl>
      <path d="M1 5 Q5 1.8 9 5 Q5 8.2 1 5 Z" fill="#2a1030" stroke="#8f2bbf" strokeWidth="0.45" {...SJ} />
      <circle cx="5" cy="5" r="1.5" fill="#c9b0e8" />
      <circle cx="5" cy="5" r="0.6" fill="#2a1030" />
    </Gl>
  ),
  shackle_the_queen: (
    <Gl>
      <path d="M2.2 2 V1 L3.4 1.8 L5 0.8 L6.6 1.8 L7.8 1 V2 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.3" {...SJ} />
      <circle cx="5" cy="5.6" r="2.2" fill="none" stroke="#8a94a8" strokeWidth="0.7" />
      <path d="M5 3.4 V2.4" stroke="#8a94a8" strokeWidth="0.6" strokeLinecap="round" />
    </Gl>
  ),
  curse_of_frailty: (
    <Gl>
      <path d="M2 3 Q5 1.4 8 3" fill="none" stroke="#c9b0e8" strokeWidth="0.55" strokeLinecap="round" />
      <path d="M2.6 5 Q5 4 7.4 5" fill="none" stroke="#8f6bff" strokeWidth="0.5" strokeLinecap="round" />
      <path d="M3.4 7 Q5 6.4 6.6 7 M4.2 8.6 Q5 8.3 5.8 8.6" fill="none" stroke="#6b4a8f" strokeWidth="0.45" strokeLinecap="round" />
    </Gl>
  ),
  doom_march: (
    <Gl>
      <path d="M2.6 8.4 Q2 7 3.2 6.6 Q4.2 6.4 4.4 7.6 Q4.4 8.6 3.6 8.8 Z" fill="#8a94a8" />
      <path d="M6 6.2 Q5.4 4.8 6.6 4.4 Q7.6 4.2 7.8 5.4 Q7.8 6.4 7 6.6 Z" fill="#8a94a8" />
      <path d="M3.4 4 Q2.8 2.6 4 2.2 Q5 2 5.2 3.2 Q5.2 4.2 4.4 4.4 Z" fill="#c9cdd6" />
    </Gl>
  ),
  chains_of_binding: (
    <Gl>
      <ellipse cx="3.4" cy="4" rx="1.7" ry="1.2" fill="none" stroke="#8a94a8" strokeWidth="0.6" transform="rotate(-30 3.4 4)" />
      <ellipse cx="6.6" cy="6" rx="1.7" ry="1.2" fill="none" stroke="#c9cdd6" strokeWidth="0.6" transform="rotate(-30 6.6 6)" />
    </Gl>
  ),
  hex_of_stone: (
    <Gl>
      <path d="M5 1.2 L8.4 3.1 V6.9 L5 8.8 L1.6 6.9 V3.1 Z" fill="none" stroke="#8d8d94" strokeWidth="0.5" {...SJ} />
      <path d="M5 3 L6.6 5.9 H3.4 Z" fill="none" stroke="#b0a68f" strokeWidth="0.45" {...SJ} />
    </Gl>
  ),

  /* --- transforms ---------------------------------------------------------------- */
  metamorphosis: (
    <Gl>
      <path d="M5 5 Q3 2.4 1.6 3.4 Q0.8 4.6 2.4 5.6 Q3.8 6.4 5 5 Q6.2 6.4 7.6 5.6 Q9.2 4.6 8.4 3.4 Q7 2.4 5 5 Z" fill="#c94ad1" stroke="#e3d0ff" strokeWidth="0.35" {...SJ} />
      <path d="M5 4.4 V7.6" stroke="#e3d0ff" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  dragon_form: (
    <Gl>
      <path d="M1.6 6.8 Q2 3.4 5 3 L6.4 1.2 L6.8 3.2 Q8.6 3.8 8.6 5.6 L6.4 5.2 L7.2 6.6 L5.2 6.2 Q5 8 3.4 8.4 Q2 8.2 1.6 6.8 Z" fill="#7a2f1a" stroke="#ff8a3d" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  apotheosis: (
    <Gl>
      <path d="M3 8.8 H7 M4 8.8 V7.2 Q1.8 6.4 1.8 3.6 H8.2 Q8.2 6.4 6 7.2 V8.8" fill="none" stroke="#ffd76a" strokeWidth="0.5" {...SJ} />
      <path d="M5 1 L5.5 2.3 L6.8 2.8 L5.5 3.3 L5 4.6 L4.5 3.3 L3.2 2.8 L4.5 2.3 Z" fill="#fff4d6" />
    </Gl>
  ),
  god_king: (
    <Gl>
      <path d="M2 8.6 H8 M2.6 7 H7.4 L7 8.6 H3 Z" fill="none" stroke="#ffd76a" strokeWidth="0.5" {...SJ} />
      <path d="M2.4 5.4 V3 L3.8 4.2 L5 2.2 L6.2 4.2 L7.6 3 V5.4 Z" fill="#ffd76a" stroke="#8a6a3a" strokeWidth="0.35" {...SJ} />
      <path d="M5 0.6 V1.6" stroke="#fff4d6" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  celestial_ascension: (
    <Gl>
      <path d="M3.4 8.6 Q3 5.4 5 3.4 Q7 5.4 6.6 8.6 Z" fill="#8faadc" stroke="#cdd6ff" strokeWidth="0.4" {...SJ} />
      <path d="M5 3.4 V1.8" stroke="#cdd6ff" strokeWidth="0.4" strokeLinecap="round" />
      <path d="M5 0.8 L5.3 1.6 L6.1 1.9 L5.3 2.2 L5 3 L4.7 2.2 L3.9 1.9 L4.7 1.6 Z" fill="#fff4d6" />
    </Gl>
  ),

  /* --- summons ---------------------------------------------------------------- */
  imp_familiar: (
    <Gl>
      <path d="M3 3.4 L2.2 1.4 L4 2.4 M7 3.4 L7.8 1.4 L6 2.4" fill="none" stroke="#c94a3a" strokeWidth="0.5" {...SJ} />
      <circle cx="5" cy="4.6" r="2.4" fill="#7a2f2a" stroke="#c94a3a" strokeWidth="0.4" />
      <circle cx="4.1" cy="4.2" r="0.45" fill="#ffd76a" />
      <circle cx="5.9" cy="4.2" r="0.45" fill="#ffd76a" />
      <path d="M4 5.8 Q5 6.6 6 5.8" fill="none" stroke="#ffd76a" strokeWidth="0.4" strokeLinecap="round" />
      <path d="M6.8 6.8 Q8.4 7.4 8 8.8" fill="none" stroke="#c94a3a" strokeWidth="0.45" strokeLinecap="round" />
    </Gl>
  ),
  phantom_guardian: (
    <Gl>
      <path d="M2.4 8.6 V4.4 Q2.4 1.6 5 1.6 Q7.6 1.6 7.6 4.4 V8.6 L6.4 7.6 L5 8.6 L3.6 7.6 Z" fill="#3f5c66" stroke="#9fd8e8" strokeWidth="0.45" {...SJ} />
      <circle cx="4" cy="4.4" r="0.5" fill="#e8f8ff" />
      <circle cx="6" cy="4.4" r="0.5" fill="#e8f8ff" />
    </Gl>
  ),
  stone_golem: (
    <Gl>
      <path d="M3 8.8 V6.4 H2 V3.4 H3.4 V1.8 H6.6 V3.4 H8 V6.4 H7 V8.8 H5.6 V7 H4.4 V8.8 Z" fill="#6e6e78" stroke="#3a3a40" strokeWidth="0.4" {...SJ} />
      <path d="M4.2 3.4 H5.8" stroke="#ffb454" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  summoning_circle: (
    <Gl>
      <circle cx="5" cy="5" r="3.8" fill="none" stroke="#c94ad1" strokeWidth="0.45" strokeDasharray="1.4 0.8" />
      <path d="M5 1.8 L7.8 6.6 H2.2 Z M5 8.2 L2.2 3.4 H7.8 Z" fill="none" stroke="#e3d0ff" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),

  /* --- mythic ladder ------------------------------------------------------- */
  fm_glowmoss_ward: (
    <Gl>
      <path d="M5 1.2 L8.4 2.8 V5.4 Q8.4 8 5 9.2 Q1.6 8 1.6 5.4 V2.8 Z" fill="#1c4a2c" stroke="#a8e07f" strokeWidth="0.5" {...SJ} />
      <circle cx="5" cy="5" r="1.4" fill="#d6ffb0" />
    </Gl>
  ),
  fm_moonlit_stride: (
    <Gl>
      <path d="M6.4 1.4 A3.8 3.8 0 1 0 8.6 6.6 A3 3 0 0 1 6.4 1.4 Z" fill="#cdd6ff" stroke="#8faadc" strokeWidth="0.4" {...SJ} />
      <path d="M2 8.4 L3.4 6.2 L4.4 7.6 L5.8 5.4" fill="none" stroke="#fff4d6" strokeWidth="0.55" {...SJ} />
    </Gl>
  ),
  fm_wyrmscale_mail: (
    <Gl>
      <path d="M5 1 L8.2 2.6 V5.6 Q8.2 8.2 5 9.2 Q1.8 8.2 1.8 5.6 V2.6 Z" fill="#2a3a22" stroke="#7fae5a" strokeWidth="0.45" {...SJ} />
      <path d="M3 3.6 Q5 5 7 3.6 M3 5.4 Q5 6.8 7 5.4 M3.6 7 Q5 8 6.4 7" fill="none" stroke="#a8e07f" strokeWidth="0.45" {...SJ} />
    </Gl>
  ),
  fm_stormcaller: (
    <Gl>
      <path d="M2 4.6 Q2 2.4 4.2 2.6 Q5 0.8 7 1.6 Q9 2 8.6 4.2 Q9.4 5.6 7.8 6 H3 Q1.6 5.8 2 4.6 Z" fill="#3a3f5e" stroke="#8faadc" strokeWidth="0.4" {...SJ} />
      <path d="M5.6 6 L4.4 8 H5.6 L4.6 9.6" fill="none" stroke="#ffd76a" strokeWidth="0.6" {...SJ} />
    </Gl>
  ),
  fm_phoenix_feather: (
    <Gl>
      <path d="M7.8 1.4 Q3 2.2 2.2 8.6 Q6.8 7.6 7.8 1.4 Z" fill="#e6432c" stroke="#ffd76a" strokeWidth="0.4" {...SJ} />
      <path d="M2.4 8.4 L6.6 2.6" stroke="#ffd76a" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  fm_dragonblood: (
    <Gl>
      <path d="M5 1 Q7.6 4 7.6 6.2 A2.6 2.6 0 1 1 2.4 6.2 Q2.4 4 5 1 Z" fill="#a31d1d" stroke="#ff8a3d" strokeWidth="0.45" {...SJ} />
      <circle cx="5" cy="6.4" r="0.9" fill="#ffd76a" />
    </Gl>
  ),
  fm_sunforge: (
    <Gl>
      <circle cx="5" cy="5" r="2.2" fill="#ffd76a" stroke="#ff9d3d" strokeWidth="0.4" />
      <path d="M5 0.8 V2 M5 8 V9.2 M0.8 5 H2 M8 5 H9.2 M2 2 L2.9 2.9 M8 2 L7.1 2.9 M2 8 L2.9 7.1 M8 8 L7.1 7.1" stroke="#ff9d3d" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  fm_eclipse_crown: (
    <Gl>
      <circle cx="5" cy="5" r="3.2" fill="#ffd76a" />
      <circle cx="5.8" cy="4.6" r="3" fill="#141322" />
      <path d="M2.4 8.6 L3.2 6.6 L4.4 7.8 L5.4 6 L6.4 7.8 L7.6 6.6 L8.2 8.6 Z" fill="#ffd76a" stroke="#fff4d6" strokeWidth="0.3" {...SJ} />
    </Gl>
  ),
  fm_hex_thistledown: (
    <Gl>
      <path d="M5 8.8 V4.6" stroke="#4a5c2f" strokeWidth="0.6" strokeLinecap="round" />
      <circle cx="5" cy="3.4" r="1.9" fill="#8f5fbf" stroke="#c9a2ff" strokeWidth="0.4" />
      <path d="M5 1 V1.6 M3.2 1.8 L3.6 2.3 M6.8 1.8 L6.4 2.3 M2.6 3.4 H3.2 M6.8 3.4 H7.4" stroke="#c9a2ff" strokeWidth="0.45" strokeLinecap="round" />
    </Gl>
  ),
  fm_hex_fogbank: (
    <Gl>
      <path d="M1.4 4.2 Q2.6 2.4 4.6 3.4 Q6 1.6 7.8 3 Q9.2 4 8.4 5.6 H1.8 Q0.8 5 1.4 4.2 Z" fill="#8a94a8" stroke="#d9d2c0" strokeWidth="0.4" {...SJ} />
      <path d="M2 7.2 H8 M3 8.6 H7" stroke="#d9d2c0" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  fm_hex_brambleroot: (
    <Gl>
      <path d="M1.4 8 Q3 6.4 5 7 Q7 7.6 8.6 6" fill="none" stroke="#4a5c2f" strokeWidth="0.6" {...SJ} />
      <path d="M2.8 7.2 L2.4 5.6 M4.6 6.9 L4.9 5.2 M6.6 7.4 L7 5.8" stroke="#7fae5a" strokeWidth="0.45" strokeLinecap="round" />
      <path d="M5 1.6 V4.4 M3.4 2.2 L6.6 3.8 M6.6 2.2 L3.4 3.8" stroke="#8a7a63" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  fm_hex_sirens_call: (
    <Gl>
      <path d="M1.4 6.4 Q3 5 4.6 6.4 Q6.2 7.8 7.8 6.4 Q9 5.4 8.6 4.4" fill="none" stroke="#5fc9b0" strokeWidth="0.6" {...SJ} />
      <path d="M5.2 1.4 Q6.8 2.6 6 4.6 Q5.2 6 3.8 5.2 Q3 4 4 2.8 Z" fill="#1c3a5e" stroke="#8fe8ff" strokeWidth="0.4" {...SJ} />
    </Gl>
  ),
  fm_hex_gorgon_gaze: (
    <Gl>
      <path d="M1 5 Q5 0.6 9 5 Q5 9.4 1 5 Z" fill="#26262c" stroke="#7fae5a" strokeWidth="0.45" {...SJ} />
      <circle cx="5" cy="5" r="1.6" fill="#a8e07f" />
      <circle cx="5" cy="5" r="0.6" fill="#141322" />
    </Gl>
  ),
  fm_hex_iron_maiden: (
    <Gl>
      <path d="M3 1.6 H7 V8.6 H3 Z" fill="#3a3a40" stroke="#c9cdd6" strokeWidth="0.4" {...SJ} />
      <path d="M5 1.6 V8.6 M3 4 H7 M3 6.2 H7" stroke="#c9cdd6" strokeWidth="0.35" />
      <circle cx="5" cy="3" r="0.5" fill="#e05252" />
    </Gl>
  ),
  fm_hex_kings_moat: (
    <Gl>
      <path d="M3.4 3.6 L3.4 1.6 L4.2 2.4 L5 1.4 L5.8 2.4 L6.6 1.6 V3.6 Z" fill="#8faadc" stroke="#cdd6ff" strokeWidth="0.35" {...SJ} />
      <path d="M1 6.2 Q2 5.2 3 6.2 Q4 7.2 5 6.2 Q6 5.2 7 6.2 Q8 7.2 9 6.2 M1 8 Q2 7 3 8 Q4 9 5 8 Q6 7 7 8 Q8 9 9 8" fill="none" stroke="#3a5f8a" strokeWidth="0.55" {...SJ} />
    </Gl>
  ),
  fm_hex_winter_court: (
    <Gl>
      <path d="M5 1 V9 M1.6 3 L8.4 7 M8.4 3 L1.6 7" stroke="#9fd8ff" strokeWidth="0.6" strokeLinecap="round" />
      <path d="M5 2.4 L4.2 3.4 M5 2.4 L5.8 3.4 M5 7.6 L4.2 6.6 M5 7.6 L5.8 6.6" stroke="#e8f8ff" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  fm_boon_lanternlight: (
    <Gl>
      <path d="M3.4 3 H6.6 V7.4 Q5 8.6 3.4 7.4 Z" fill="#3a2c14" stroke="#ffd76a" strokeWidth="0.45" {...SJ} />
      <path d="M5 1.2 V3 M4.2 1.2 H5.8" stroke="#ffd76a" strokeWidth="0.45" strokeLinecap="round" />
      <circle cx="5" cy="5.4" r="1.1" fill="#fff4d6" />
    </Gl>
  ),
  fm_boon_hearthbread: (
    <Gl>
      <path d="M1.4 6.2 Q1.4 3.4 5 3.4 Q8.6 3.4 8.6 6.2 Q8.6 7.6 7 7.6 H3 Q1.4 7.6 1.4 6.2 Z" fill="#c98a4c" stroke="#ffe9b0" strokeWidth="0.4" {...SJ} />
      <path d="M3.4 5.4 L4 6.4 M5 5 L5.6 6.2 M6.6 5.4 L7.2 6.4" stroke="#ffe9b0" strokeWidth="0.4" strokeLinecap="round" />
    </Gl>
  ),
  fm_boon_dewdrop: (
    <Gl>
      <path d="M5 1.2 Q8 4.8 8 6.4 A3 3 0 1 1 2 6.4 Q2 4.8 5 1.2 Z" fill="#5fc9b0" stroke="#dff7ff" strokeWidth="0.4" {...SJ} />
      <circle cx="4" cy="6" r="0.7" fill="#ffffff" fillOpacity="0.8" />
    </Gl>
  ),
  fm_boon_oathstone: (
    <Gl>
      <path d="M2 8.4 L2.8 3 L5 1.4 L7.2 3 L8 8.4 Z" fill="#5c5348" stroke="#d9d2c0" strokeWidth="0.45" {...SJ} />
      <path d="M4 5.2 L5 6.4 L6.4 3.8" fill="none" stroke="#ffd76a" strokeWidth="0.6" {...SJ} />
    </Gl>
  ),
  fm_boon_windrider: (
    <Gl>
      <path d="M1.2 4 Q3.6 2.2 6 4 Q7.8 5.2 8.8 3.6" fill="none" stroke="#9fd8ff" strokeWidth="0.6" {...SJ} />
      <path d="M1.6 6.6 Q4 4.8 6.4 6.6 Q8 7.6 8.8 6.2" fill="none" stroke="#dff7ff" strokeWidth="0.5" {...SJ} />
      <circle cx="7.6" cy="2.2" r="0.8" fill="#fff4d6" />
    </Gl>
  ),
  fm_boon_lifebloom: (
    <Gl>
      <path d="M5 9 V4.6" stroke="#4a5c2f" strokeWidth="0.55" strokeLinecap="round" />
      <path d="M5 4.6 Q3.4 4.6 3 6.2 Q4.6 6.4 5 4.6 Q6.6 4.6 7 6.2 Q5.4 6.4 5 4.6 Z" fill="#7fae5a" />
      <circle cx="5" cy="3" r="1.6" fill="#ff9dd6" stroke="#fff4d6" strokeWidth="0.35" />
    </Gl>
  ),
  fm_boon_royal_road: (
    <Gl>
      <path d="M1 8.6 L4 1.6 H6 L9 8.6 Z" fill="#3a2c14" stroke="#ffd76a" strokeWidth="0.4" {...SJ} />
      <path d="M5 3.4 V4.4 M5 5.6 V6.6 M5 7.6 V8.4" stroke="#ffd76a" strokeWidth="0.5" strokeLinecap="round" />
    </Gl>
  ),
  fm_boon_worldheart: (
    <Gl>
      <path d="M5 8.6 Q1.2 5.8 1.8 3.4 Q2.6 1.4 5 2.8 Q7.4 1.4 8.2 3.4 Q8.8 5.8 5 8.6 Z" fill="#c9312b" stroke="#ffd76a" strokeWidth="0.45" {...SJ} />
      <path d="M3 5.2 H4 L4.6 4.2 L5.4 6.2 L6 5.2 H7" fill="none" stroke="#fff4d6" strokeWidth="0.45" {...SJ} />
    </Gl>
  ),
};

/* =============================================================================
   Registry
   ========================================================================== */

/** Bind a scene + palette + glyph + config (+ per-card variant) into a
 * SigPlugin entry. Entrances route to the shared arrival cut and per-square
 * target hits to the shared leg-aimed hit, both dressed in the card's own
 * palette and glyph, so every role reads as this card. */
function F(
  Scene: ComponentType<SceneProps>,
  palette: Palette,
  glyph: ReactNode,
  config: SigPlugin["config"],
  variant?: string,
): SigPlugin {
  return {
    config,
    Render: function FantasyPlayRender({ lead, role, delayMs }: { lead: boolean; role: SigRole; delayMs: number }) {
      if (role === "entrance") return <EntranceCut palette={palette} glyph={glyph} delayMs={delayMs} />;
      if (!lead) return <TargetHit palette={palette} glyph={glyph} delayMs={delayMs} />;
      return <Scene palette={palette} glyph={glyph} lead={lead} role={role} delayMs={delayMs} variant={variant} />;
    },
  };
}

// Ordering / stagger / victims / mover / source / sound / anchor are carried
// over from the cards' previous core SIGNATURES entries (BoardEffects.tsx),
// so Board sequences targets and voices exactly as before; only the art moved
// into this module. Every anchor is inside the derived allowed set.
export const PLAYS: Record<string, SigPlugin> = {
  /* --- heroes ------------------------------------------------------------- */
  dragons_breath: F(DragonsBreathScene, ["#e6432c", "#ffb454", "#2b1218"], GLYPH.dragons_breath, {
    ordering: "line", staggerMs: 80, victims: "all", mover: "r", hasLead: true, sound: "atomic", anchor: "board",
  }),
  summon_dragon: F(SummonDragonScene, ["#c94ad1", "#ffd76a", "#2a1030"], GLYPH.summon_dragon, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", source: "summon", anchor: "cast",
  }),
  army_of_the_dead: F(ArmyOfTheDeadScene, ["#8a94a8", "#a8e07f", "#1c2418"], GLYPH.army_of_the_dead, {
    ordering: "sweep", staggerMs: 80, victims: "all", hasLead: true, sound: "wall", source: "summon", anchor: "cast",
  }),
  judgment_day: F(JudgmentDayScene, ["#c9cdd6", "#ffd76a", "#2c3e6b"], GLYPH.judgment_day, {
    ordering: "radial", staggerMs: 0, victims: ["n", "b", "r", "q"], hasLead: true, sound: "lightning", anchor: "cast",
  }),
  excalibur: F(ExcaliburScene, ["#8faadc", "#ffd76a", "#1c3a5e"], GLYPH.excalibur, {
    ordering: "radial", staggerMs: 0, victims: ["b"], hasLead: true, sound: "coronation", source: "empower", anchor: "cast",
  }),
  philosophers_stone: F(PhilosophersStoneScene, ["#c9312b", "#ffd76a", "#3a1c12"], GLYPH.philosophers_stone, {
    ordering: "sweep", staggerMs: 140, victims: ["p"], hasLead: true, sound: "coronation", source: "empower", anchor: "cast",
  }),
  divine_intervention: F(DivineInterventionScene, ["#5fc9b0", "#ffd76a", "#2c3e6b"], GLYPH.divine_intervention, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "shades", source: "kingSafe", anchor: "cast",
  }),
  starfall: F(StarfallScene, ["#c9642b", "#ffd76a", "#2b1218"], GLYPH.starfall, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", source: "summon", anchor: "cast",
  }),

  /* --- summoning circle family -------------------------------------------- */
  imp_familiar: F(SummonCircleScene, ["#c94a3a", "#ffd76a", "#2b1218"], GLYPH.imp_familiar, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", source: "summon", anchor: "cast",
  }),
  phantom_guardian: F(SummonCircleScene, ["#5fa8b8", "#9fd8e8", "#16262e"], GLYPH.phantom_guardian, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", source: "summon", anchor: "cast",
  }, "gust"),
  stone_golem: F(SummonCircleScene, ["#8a8a94", "#ffb454", "#2a2a30"], GLYPH.stone_golem, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", source: "summon", anchor: "cast",
  }, "stone"),
  summoning_circle: F(SummonCircleScene, ["#c94ad1", "#e3d0ff", "#2a1030"], GLYPH.summoning_circle, {
    ordering: "sweep", staggerMs: 90, victims: "all", hasLead: true, sound: "wall", source: "summon", anchor: "cast",
  }),

  /* --- beast pass family ---------------------------------------------------- */
  wyverns_dive: F(BeastPassScene, ["#7fae5a", "#d6e8a8", "#2f3a26"], GLYPH.wyverns_dive, {
    ordering: "line", staggerMs: 90, victims: "all", mover: "n", hasLead: true, sound: "rampage", anchor: "cast",
  }),
  griffon_rider: F(BeastPassScene, ["#c9a84c", "#ffe9a8", "#3a2c14"], GLYPH.griffon_rider, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", source: "summon", anchor: "cast",
  }),
  direwolf_pack: F(BeastPassScene, ["#5a6b8f", "#9fd8ff", "#1a2030"], GLYPH.direwolf_pack, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", source: "summon", anchor: "board",
  }, "pack"),
  roost_of_rocs: F(BeastPassScene, ["#8a6a3a", "#e8b04b", "#2b2114"], GLYPH.roost_of_rocs, {
    ordering: "sweep", staggerMs: 100, victims: "all", hasLead: true, sound: "wall", source: "summon", anchor: "board",
  }),

  /* --- gaze / petrify family ------------------------------------------------ */
  basilisk_stare: F(GazeStoneScene, ["#8d8d94", "#e8b04b", "#2f3a26"], GLYPH.basilisk_stare, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", source: "walnut", anchor: "cast",
  }),
  serpent_brood: F(GazeStoneScene, ["#7fae5a", "#d6e8a8", "#22301c"], GLYPH.serpent_brood, {
    ordering: "sweep", staggerMs: 60, victims: ["b"], hasLead: true, sound: "petrify", source: "walnut", anchor: "cast",
  }),
  withering_touch: F(GazeStoneScene, ["#b0a68f", "#c9b0e8", "#2a2030"], GLYPH.withering_touch, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "petrify", source: "walnut", anchor: "cast",
  }),
  hex_of_stone: F(GazeStoneScene, ["#8d8d94", "#c9b89a", "#26262c"], GLYPH.hex_of_stone, {
    ordering: "sweep", staggerMs: 55, victims: ["n", "b"], hasLead: true, sound: "petrify", source: "walnut", anchor: "cast",
  }, "creep"),

  /* --- divine light family --------------------------------------------------- */
  hallowed_return: F(DivineLightScene, ["#e8dcc0", "#ffd76a", "#3a3222"], GLYPH.hallowed_return, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", source: "summon", anchor: "cast",
  }),
  divine_mandate: F(DivineLightScene, ["#c9a84c", "#fff2c9", "#3a2c14"], GLYPH.divine_mandate, {
    ordering: "radial", staggerMs: 0, victims: ["n", "b", "r"], hasLead: true, sound: "aegis", source: "shield", anchor: "cast",
  }),
  divine_reckoning: F(DivineLightScene, ["#8faadc", "#cdd6ff", "#222c44"], GLYPH.divine_reckoning, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "snooze", source: "stun", anchor: "cast",
  }),
  heavens_wrath: F(DivineLightScene, ["#ffd76a", "#fff4d6", "#2c3e6b"], GLYPH.heavens_wrath, {
    ordering: "sweep", staggerMs: 150, victims: ["n", "b", "r", "q"], hasLead: true, sound: "lightning", anchor: "board",
  }, "bolt"),

  /* --- necromancy rise family ------------------------------------------------- */
  undying_thrall: F(NecroRiseScene, ["#d9d2c0", "#a8e07f", "#1c2418"], GLYPH.undying_thrall, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "wall", source: "summon", anchor: "cast",
  }),
  raise_dead: F(NecroRiseScene, ["#8a94a8", "#a8e07f", "#181c24"], GLYPH.raise_dead, {
    ordering: "sweep", staggerMs: 90, victims: "all", hasLead: true, sound: "wall", source: "summon", anchor: "cast",
  }),
  soul_harvest: F(NecroRiseScene, ["#c9cdd6", "#8faf4a", "#1c2418"], GLYPH.soul_harvest, {
    ordering: "line", staggerMs: 95, victims: "all", mover: "q", hasLead: true, sound: "rampage", anchor: "board",
  }, "reap"),
  lich_phylactery: F(NecroRiseScene, ["#8faf4a", "#d6e8a8", "#22301c"], GLYPH.lich_phylactery, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "shades", source: "shield", anchor: "cast",
  }),

  /* --- elements family --------------------------------------------------------- */
  frost_wall: F(ElementSurgeScene, ["#9fd8ff", "#e8f8ff", "#1c3a5e"], GLYPH.frost_wall, {
    ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "wall", source: "blindfold", anchor: "board",
  }),
  sinkhole: F(ElementSurgeScene, ["#8a7a63", "#e8dcc0", "#2b2114"], GLYPH.sinkhole, {
    ordering: "radial", staggerMs: 90, victims: "all", hasLead: true, sound: "cataclysm", source: "blindfold", anchor: "cast",
  }, "sink"),
  chain_lightning: F(ElementSurgeScene, ["#6fe3ff", "#e8f8ff", "#2c3e6b"], GLYPH.chain_lightning, {
    ordering: "line", staggerMs: 110, victims: "all", mover: "b", hasLead: true, sound: "lightning", anchor: "board",
  }, "bolt"),
  fissure_field: F(ElementSurgeScene, ["#8a7a63", "#ffb454", "#241c10"], GLYPH.fissure_field, {
    ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "cataclysm", source: "slow", anchor: "board",
  }),
  wall_of_thorns: F(ElementSurgeScene, ["#7fae5a", "#d6e8a8", "#22301c"], GLYPH.wall_of_thorns, {
    ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "wall", source: "blindfold", anchor: "board",
  }),

  /* --- artifact forge family ----------------------------------------------------- */
  horn_of_summoning: F(RelicForgeScene, ["#c9a84c", "#ffe9a8", "#3a2c14"], GLYPH.horn_of_summoning, {
    ordering: "sweep", staggerMs: 100, victims: "all", hasLead: true, sound: "wall", source: "summon", anchor: "cast",
  }),
  orb_of_dominion: F(RelicForgeScene, ["#c94ad1", "#e3d0ff", "#2a1030"], GLYPH.orb_of_dominion, {
    ordering: "radial", staggerMs: 0, victims: ["r", "q"], hasLead: true, sound: "shades", source: "summon", anchor: "cast",
  }),
  staff_of_stasis: F(RelicForgeScene, ["#9fd8ff", "#e8f8ff", "#1c3a5e"], GLYPH.staff_of_stasis, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen", anchor: "cast",
  }),
  aegis_of_ages: F(RelicForgeScene, ["#5fc9b0", "#e8fff7", "#173430"], GLYPH.aegis_of_ages, {
    ordering: "radial", staggerMs: 35, victims: "all", hasLead: true, sound: "aegis", source: "shield", anchor: "cast",
  }),
  banner_of_war: F(RelicForgeScene, ["#c94a3a", "#ffd76a", "#2b1218"], GLYPH.banner_of_war, {
    ordering: "radial", staggerMs: 60, victims: ["n"], hasLead: true, sound: "blitz", source: "empower", anchor: "board",
  }, "chain"),

  /* --- curse sigil family ---------------------------------------------------------- */
  evil_eye: F(CurseSigilScene, ["#8f2bbf", "#c9b0e8", "#1c0f24"], GLYPH.evil_eye, {
    ordering: "radial", staggerMs: 0, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen", anchor: "cast",
  }),
  shackle_the_queen: F(CurseSigilScene, ["#8a94a8", "#ffd76a", "#1c1c26"], GLYPH.shackle_the_queen, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "clockcage", source: "slow", anchor: "cast",
  }),
  curse_of_frailty: F(CurseSigilScene, ["#6b4a8f", "#c9b0e8", "#1c1424"], GLYPH.curse_of_frailty, {
    ordering: "radial", staggerMs: 45, victims: "all", hasLead: true, sound: "petrify", source: "slow", anchor: "cast",
  }),
  doom_march: F(CurseSigilScene, ["#5a6b8f", "#c9cdd6", "#141a26"], GLYPH.doom_march, {
    ordering: "sweep", staggerMs: 55, victims: "all", hasLead: true, sound: "extinction", source: "slow", anchor: "board",
  }, "march"),
  chains_of_binding: F(CurseSigilScene, ["#8a94a8", "#c9cdd6", "#1c1c22"], GLYPH.chains_of_binding, {
    ordering: "sweep", staggerMs: 70, victims: ["r"], hasLead: true, sound: "petrify", source: "walnut", anchor: "cast",
  }),

  /* --- ascension family --------------------------------------------------------------- */
  metamorphosis: F(AscendScene, ["#c94ad1", "#e3d0ff", "#2a1030"], GLYPH.metamorphosis, {
    ordering: "radial", staggerMs: 0, victims: ["n", "b"], hasLead: true, sound: "colossus", source: "empower", anchor: "board",
  }),
  dragon_form: F(AscendScene, ["#e6432c", "#ffb454", "#2b1218"], GLYPH.dragon_form, {
    ordering: "radial", staggerMs: 0, victims: ["r"], hasLead: true, sound: "colossus", source: "empower", anchor: "cast",
  }, "wings"),
  apotheosis: F(AscendScene, ["#ffd76a", "#fff4d6", "#3a2c14"], GLYPH.apotheosis, {
    ordering: "radial", staggerMs: 0, victims: ["n", "b", "r"], hasLead: true, sound: "coronation", source: "empower", anchor: "cast",
  }),
  god_king: F(AscendScene, ["#ffd76a", "#fff2c9", "#2c2436"], GLYPH.god_king, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "coronation", source: "empower", anchor: "cast",
  }),
  celestial_ascension: F(AscendScene, ["#8faadc", "#cdd6ff", "#222c44"], GLYPH.celestial_ascension, {
    ordering: "sweep", staggerMs: 80, victims: ["b"], hasLead: true, sound: "colossus", source: "empower", anchor: "board",
  }),

  /* --- mythic ladder: buffs (runeforge) ---------------------------------------- */
  fm_glowmoss_ward: F(RuneforgeScene, ["#7fae5a", "#d6ffb0", "#1c4a2c"], GLYPH.fm_glowmoss_ward, {
    ordering: "radial", staggerMs: 40, victims: "all", hasLead: true, sound: "aegis", source: "shield", anchor: "cast",
  }, "moss"),
  fm_moonlit_stride: F(RuneforgeScene, ["#8faadc", "#cdd6ff", "#222c44"], GLYPH.fm_moonlit_stride, {
    ordering: "radial", staggerMs: 60, victims: ["n"], hasLead: true, sound: "coronation", source: "empower", anchor: "cast",
  }, "moon"),
  fm_wyrmscale_mail: F(RuneforgeScene, ["#7fae5a", "#a8e07f", "#2a3a22"], GLYPH.fm_wyrmscale_mail, {
    ordering: "radial", staggerMs: 0, victims: ["p", "n", "b", "r", "q"], hasLead: true, sound: "aegis", source: "shield", anchor: "cast",
  }, "scale"),
  fm_stormcaller: F(RuneforgeScene, ["#8faadc", "#ffd76a", "#3a3f5e"], GLYPH.fm_stormcaller, {
    ordering: "sweep", staggerMs: 70, victims: ["r", "b"], hasLead: true, sound: "lightning", source: "empower", anchor: "cast",
  }, "storm"),
  fm_phoenix_feather: F(RuneforgeScene, ["#e6432c", "#ffd76a", "#2b1218"], GLYPH.fm_phoenix_feather, {
    ordering: "radial", staggerMs: 0, victims: ["n", "b", "r"], hasLead: true, sound: "wall", source: "summon", anchor: "cast",
  }, "phoenix"),
  fm_dragonblood: F(RuneforgeScene, ["#a31d1d", "#ff8a3d", "#2b1218"], GLYPH.fm_dragonblood, {
    ordering: "radial", staggerMs: 0, victims: ["q"], hasLead: true, sound: "colossus", source: "empower", anchor: "cast",
  }, "blood"),
  fm_sunforge: F(RuneforgeScene, ["#ffd76a", "#fff4d6", "#3a2c14"], GLYPH.fm_sunforge, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "coronation", source: "empower", anchor: "cast",
  }, "sun"),
  fm_eclipse_crown: F(RuneforgeScene, ["#ffd76a", "#fff4d6", "#141322"], GLYPH.fm_eclipse_crown, {
    ordering: "radial", staggerMs: 30, victims: "all", hasLead: true, sound: "snooze", source: "stun", anchor: "board",
  }, "eclipse"),

  /* --- mythic ladder: hexes (hexweave) ----------------------------------------- */
  fm_hex_thistledown: F(HexweaveScene, ["#8f5fbf", "#c9a2ff", "#1e1430"], GLYPH.fm_hex_thistledown, {
    ordering: "radial", staggerMs: 60, victims: ["n"], hasLead: true, sound: "siege", anchor: "board",
  }, "burr"),
  fm_hex_fogbank: F(HexweaveScene, ["#8a94a8", "#d9d2c0", "#22262e"], GLYPH.fm_hex_fogbank, {
    ordering: "radial", staggerMs: 60, victims: ["b"], hasLead: true, sound: "shades", anchor: "board",
  }, "fog"),
  fm_hex_brambleroot: F(HexweaveScene, ["#4a5c2f", "#a8e07f", "#1c2418"], GLYPH.fm_hex_brambleroot, {
    ordering: "radial", staggerMs: 60, victims: ["r"], hasLead: true, sound: "wall", anchor: "cast",
  }, "thorn"),
  fm_hex_sirens_call: F(HexweaveScene, ["#5fc9b0", "#8fe8ff", "#1c3a5e"], GLYPH.fm_hex_sirens_call, {
    ordering: "radial", staggerMs: 0, victims: ["n", "b", "r", "q"], hasLead: true, sound: "petrify", source: "walnut", anchor: "cast",
  }, "song"),
  fm_hex_gorgon_gaze: F(HexweaveScene, ["#7fae5a", "#a8e07f", "#26262c"], GLYPH.fm_hex_gorgon_gaze, {
    ordering: "sweep", staggerMs: 90, victims: ["n", "b"], hasLead: true, sound: "petrifiedforest", source: "walnut", anchor: "board",
  }, "gaze"),
  fm_hex_iron_maiden: F(HexweaveScene, ["#c9cdd6", "#e05252", "#3a3a40"], GLYPH.fm_hex_iron_maiden, {
    ordering: "radial", staggerMs: 0, victims: ["p", "n", "b", "r", "q"], hasLead: true, sound: "clockcage", source: "frozen", anchor: "cast",
  }, "stone"),
  fm_hex_kings_moat: F(HexweaveScene, ["#3a5f8a", "#8faadc", "#0e1a2a"], GLYPH.fm_hex_kings_moat, {
    ordering: "radial", staggerMs: 40, victims: "all", hasLead: true, sound: "wall", source: "blindfold", anchor: "board",
  }, "moat"),
  fm_hex_winter_court: F(HexweaveScene, ["#9fd8ff", "#e8f8ff", "#1c3a5e"], GLYPH.fm_hex_winter_court, {
    ordering: "sweep", staggerMs: 60, victims: "all", hasLead: true, sound: "massfreeze", source: "frozen", anchor: "board",
  }, "frost"),

  /* --- mythic ladder: boons (blessing) ----------------------------------------- */
  fm_boon_lanternlight: F(BlessingScene, ["#ffd76a", "#fff4d6", "#3a2c14"], GLYPH.fm_boon_lanternlight, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "cathedral", source: "empower", anchor: "cast",
  }, "lantern"),
  fm_boon_hearthbread: F(BlessingScene, ["#c98a4c", "#ffe9b0", "#3e2f1c"], GLYPH.fm_boon_hearthbread, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall", source: "summon", anchor: "cast",
  }, "bread"),
  fm_boon_dewdrop: F(BlessingScene, ["#5fc9b0", "#dff7ff", "#1c3a3a"], GLYPH.fm_boon_dewdrop, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "aegis", source: "shield", anchor: "cast",
  }, "drop"),
  fm_boon_oathstone: F(BlessingScene, ["#d9d2c0", "#ffd76a", "#3a3026"], GLYPH.fm_boon_oathstone, {
    ordering: "sweep", staggerMs: 60, victims: ["p"], hasLead: true, sound: "aegis", source: "shield", anchor: "board",
  }, "oath"),
  fm_boon_windrider: F(BlessingScene, ["#9fd8ff", "#fff4d6", "#1c3a5e"], GLYPH.fm_boon_windrider, {
    ordering: "radial", staggerMs: 60, victims: ["b"], hasLead: true, sound: "coronation", source: "empower", anchor: "cast",
  }, "wind"),
  fm_boon_lifebloom: F(BlessingScene, ["#7fae5a", "#ff9dd6", "#1c2418"], GLYPH.fm_boon_lifebloom, {
    ordering: "radial", staggerMs: 0, victims: ["p"], hasLead: true, sound: "wall", source: "summon", anchor: "cast",
  }, "bloom"),
  fm_boon_royal_road: F(BlessingScene, ["#ffd76a", "#fff2c9", "#3a2c14"], GLYPH.fm_boon_royal_road, {
    ordering: "radial", staggerMs: 0, victims: ["k"], hasLead: true, sound: "cathedral", source: "empower", anchor: "cast",
  }, "road"),
  fm_boon_worldheart: F(BlessingScene, ["#c9312b", "#ffd76a", "#2b1218"], GLYPH.fm_boon_worldheart, {
    ordering: "radial", staggerMs: 30, victims: "all", hasLead: true, sound: "crownrain", source: "rally", anchor: "cast",
  }, "heart"),
};
