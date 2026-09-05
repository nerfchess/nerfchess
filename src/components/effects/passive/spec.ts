// Passive Effect Language: shared vocabulary and pure derivations.
//
// This module is the leaf of the passive-effect module graph. It declares the
// grammar's closed vocabularies (families, primitives, targets, palette roles,
// aura/pulse/exit keys) plus the pure functions that turn a card's tier and
// tuple into concrete render parameters. It imports nothing from the rest of
// the passive engine, so both the generator script and the runtime registry
// can depend on it without a cycle.
//
// Authority: docs/passive-effect-language.md. Any change to a vocabulary here
// must be reflected in that spec and is enforced by
// scripts/test-passive-registry.ts.

// ---------------------------------------------------------------------------
// Families (section 2): the verb, what the passive DOES.
// ---------------------------------------------------------------------------

export const PASSIVE_FAMILIES = [
  "strike",
  "bind",
  "fracture",
  "territory",
  "veil",
  "decree",
  "tempo",
  "summon",
  "blessing",
] as const;
export type PassiveFamily = (typeof PASSIVE_FAMILIES)[number];

// ---------------------------------------------------------------------------
// Primitives (section 3): the reusable vocabulary. Exactly 27.
//
// The last five (slabSlam, quakeRumble, shackleDrop, barCage, crackBloom) are
// the bespoke-nerf physicality wave: rule slabs that slam down and settle with
// a quake, shackles and cages for movement restriction, and a blooming fissure
// for loss-condition rules. They compose exactly like the original 22.
// ---------------------------------------------------------------------------

export const PRIMITIVE_KEYS = [
  "bolt",
  "shockRing",
  "crackLines",
  "crystallize",
  "chainLink",
  "sigilStamp",
  "zoneSweep",
  "edgeBurn",
  "fogRoll",
  "beamVertical",
  "beamHorizontal",
  "dropImpact",
  "riseGlow",
  "moonCircle",
  "gateSlam",
  "cardLift",
  "weightDrop",
  "tickPips",
  "orbitSpark",
  "shatterExit",
  "drainFlow",
  "pulseRing",
  "slabSlam",
  "quakeRumble",
  "shackleDrop",
  "barCage",
  "crackBloom",
] as const;
export type PrimitiveKey = (typeof PRIMITIVE_KEYS)[number];

// ---------------------------------------------------------------------------
// Target taxonomy (section 4): the noun, where it lands. Exactly 12.
// ---------------------------------------------------------------------------

export const PASSIVE_TARGETS = [
  "piece",
  "pieceClass",
  "square",
  "file",
  "rank",
  "zone",
  "board",
  "clock",
  "movement",
  "capture",
  "winCondition",
  "hidden",
] as const;
export type PassiveTargetType = (typeof PASSIVE_TARGETS)[number];

// ---------------------------------------------------------------------------
// Palette roles (section 5). Tier sets intensity, role sets hue.
// ---------------------------------------------------------------------------

export const PALETTE_ROLES = [
  "buff",
  "nerf",
  "lava",
  "fog",
  "moon",
  "lightning",
  "gold",
  "neutral",
] as const;
export type PassivePaletteRole = (typeof PALETTE_ROLES)[number];

// Concrete hues, drawn only from the design-system palette (docs/design-system.md
// section 2 plus the tier ramp). Never more than these; no new colors.
export const PALETTE_HEX: Record<PassivePaletteRole, string> = {
  buff: "#5b9bd4", // buff sky ramp
  nerf: "#c4785f", // nerf terracotta ramp
  lava: "#e05252", // tier-8 blood
  fog: "#d6d0c3", // parchment at low alpha
  moon: "#d6d0c3", // parchment-50
  lightning: "#22d3ee", // tier-10 cyan
  gold: "#f4c430", // tier-9 gold
  neutral: "#d6d0c3", // parchment
};

// ---------------------------------------------------------------------------
// Aura / pulse / exit key vocabularies (section 4 auras, section 7 lifecycle).
// ---------------------------------------------------------------------------

export const AURA_KEYS = [
  "pieceRing",
  "squareTint",
  "fileWash",
  "rankWash",
  "zoneTint",
  "boardFrame",
  "clockAccent",
  "moveIndicator",
  "captureMarker",
  "hudBadge",
  "none",
] as const;
export type AuraKey = (typeof AURA_KEYS)[number];

export const PULSE_KEYS = ["pulseRing", "none"] as const;
export type PulseKey = (typeof PULSE_KEYS)[number];

export const EXIT_KEYS = [
  "shatterExit",
  "chainFall",
  "emberFade",
  "fogLift",
  "dischargeFade",
  "sealFade",
  "tickFade",
  "sinkFade",
  "glowSink",
  "fadeReverse",
] as const;
export type ExitKey = (typeof EXIT_KEYS)[number];

// ---------------------------------------------------------------------------
// Tier intensity ladder (section 6).
// ---------------------------------------------------------------------------

export type CardFamily = "nerf" | "buff";

/** Spawn duration budget in ms, keyed by tier band. Nothing exceeds 1400ms. */
export function spawnDurationForTier(tier: number): number {
  if (tier <= 2) return 450;
  if (tier <= 4) return 650;
  if (tier <= 6) return 850;
  if (tier <= 8) return 1100;
  return 1400;
}

/** Bounded node count per tier band. Particles are always pooled; max 24. */
export function nodeBudgetForTier(tier: number): number {
  if (tier <= 2) return 8;
  if (tier <= 4) return 12;
  if (tier <= 6) return 16;
  return 24;
}

/** The guidance count of primitives per tier band (section 6). Advisory: the
 *  hard rule enforced by the coverage test is 1..3, but the generator uses this
 *  to size a composition before disambiguation. */
export function primitiveCountForTier(tier: number): 1 | 2 | 3 {
  if (tier <= 2) return 1;
  if (tier <= 6) return 2;
  return 3;
}

// ---------------------------------------------------------------------------
// Derivations from a resolved tuple to render keys.
// ---------------------------------------------------------------------------

/** Persistent aura implied by the target type (section 4 table). */
export function auraForTarget(target: PassiveTargetType): AuraKey {
  switch (target) {
    case "piece":
    case "pieceClass":
      return "pieceRing";
    case "square":
      return "squareTint";
    case "file":
      return "fileWash";
    case "rank":
      return "rankWash";
    case "zone":
      return "zoneTint";
    case "board":
      return "boardFrame";
    case "clock":
      return "clockAccent";
    case "movement":
      return "moveIndicator";
    case "capture":
      return "captureMarker";
    case "winCondition":
      return "hudBadge";
    case "hidden":
      return "none";
  }
}

/** Exit treatment implied by the family (section 7.5). Fracture shatters, bind
 *  falls away, and so on; everything else reverses its aura fade. */
export function exitForFamily(family: PassiveFamily): ExitKey {
  switch (family) {
    case "fracture":
      return "shatterExit";
    case "bind":
      return "chainFall";
    case "territory":
      return "emberFade";
    case "veil":
      return "fogLift";
    case "strike":
      return "dischargeFade";
    case "decree":
      return "sealFade";
    case "tempo":
      return "tickFade";
    case "summon":
      return "sinkFade";
    case "blessing":
      return "glowSink";
  }
}

/** The trigger pulse (section 7.4). Hidden effects have no opponent-facing
 *  pulse; everything else pulses a ring on rejection or alteration. */
export function pulseForTarget(target: PassiveTargetType): PulseKey {
  return target === "hidden" ? "none" : "pulseRing";
}

/** Sound family (section 2). One cue per verb; optional at the call site. */
export const SOUND_CUE_BY_FAMILY: Record<PassiveFamily, string> = {
  strike: "passive/strike",
  bind: "passive/bind",
  fracture: "passive/fracture",
  territory: "passive/territory",
  veil: "passive/veil",
  decree: "passive/decree",
  tempo: "passive/tempo",
  summon: "passive/summon",
  blessing: "passive/blessing",
};

// ---------------------------------------------------------------------------
// Family primitive vocabularies: the pool a composition (and any collision
// disambiguation) may draw from, so a card never leaves its family's grammar.
// The first entry is the family's signature primitive (section 2 "signature
// move"). Every one of the 27 primitives appears in at least one pool.
// ---------------------------------------------------------------------------

export const FAMILY_VOCAB: Record<PassiveFamily, PrimitiveKey[]> = {
  strike: ["bolt", "shockRing", "edgeBurn", "drainFlow", "pulseRing", "quakeRumble", "crackBloom"],
  bind: ["chainLink", "weightDrop", "gateSlam", "sigilStamp", "pulseRing", "shackleDrop", "barCage"],
  fracture: ["crystallize", "crackLines", "shatterExit", "cardLift", "shockRing", "crackBloom", "quakeRumble"],
  territory: ["zoneSweep", "edgeBurn", "beamVertical", "beamHorizontal", "pulseRing", "crackBloom"],
  veil: ["fogRoll", "drainFlow", "moonCircle", "orbitSpark", "pulseRing"],
  decree: ["sigilStamp", "crackLines", "drainFlow", "shockRing", "pulseRing", "slabSlam", "quakeRumble", "crackBloom"],
  tempo: ["tickPips", "orbitSpark", "drainFlow", "edgeBurn", "pulseRing", "crackBloom"],
  summon: ["dropImpact", "shockRing", "riseGlow", "orbitSpark", "pulseRing"],
  blessing: ["riseGlow", "moonCircle", "orbitSpark", "cardLift", "pulseRing"],
};

// ---------------------------------------------------------------------------
// Primitive manifest: every primitive's reduced-motion fallback plus its
// natural (pre-clamp) node count. Kept here (React- and CSS-free) so the
// coverage test can import it without pulling in the component/CSS chain.
// ---------------------------------------------------------------------------

export interface PrimitiveManifestEntry {
  key: PrimitiveKey;
  /** Static-state fallback identifier: a 160ms fade to the static sigil. */
  fallback: string;
  /** Natural node count; the runtime clamps to the tier budget (max 24). */
  naturalNodes: number;
}

export const PRIMITIVE_NATURAL_NODES: Record<PrimitiveKey, number> = {
  bolt: 1,
  shockRing: 1,
  crackLines: 6,
  crystallize: 8,
  chainLink: 6,
  sigilStamp: 1,
  zoneSweep: 1,
  edgeBurn: 1,
  fogRoll: 4,
  beamVertical: 1,
  beamHorizontal: 1,
  dropImpact: 2,
  riseGlow: 1,
  moonCircle: 1,
  gateSlam: 4,
  cardLift: 1,
  weightDrop: 1,
  tickPips: 6,
  orbitSpark: 2,
  shatterExit: 8,
  drainFlow: 6,
  pulseRing: 1,
  slabSlam: 2,
  quakeRumble: 3,
  shackleDrop: 3,
  barCage: 5,
  crackBloom: 5,
};

export const PRIMITIVE_MANIFEST: Record<PrimitiveKey, PrimitiveManifestEntry> = Object.fromEntries(
  PRIMITIVE_KEYS.map((key) => [
    key,
    { key, fallback: `${key}-static-fade`, naturalNodes: PRIMITIVE_NATURAL_NODES[key] } as PrimitiveManifestEntry,
  ]),
) as Record<PrimitiveKey, PrimitiveManifestEntry>;

// ---------------------------------------------------------------------------
// Spawn cue sheets (section 3.1): per-card bespoke variation, data-driven.
//
// Two cards may share primitives, but no two nerfs may share the full spawn
// PERFORMANCE. The cue sheet is the per-card layer on top of the composition:
// a deterministic seed (node spread geometry), per-layer attack beats, a
// geometry scale accent, and a mirror bit. Every card's cue derives from a
// stable hash of `cardFamily:cardId`, so the registry stays data-driven (no
// hand-written per-card composition explosion) while every reveal reads
// physically distinct from its mechanical siblings. Flagship nerfs may carry a
// hand-authored override (SPAWN_CUE_OVERRIDES), and compositions.ts rows may
// carry a per-card `cue` override in data.
//
// Budget honesty: beats delay a layer's ATTACK, and the runtime shortens that
// layer's play time by the same amount, so every layer still settles inside
// the card's tier duration budget (section 6). Cues never add nodes.
// ---------------------------------------------------------------------------

export interface SpawnCue {
  /** Deterministic 32-bit seed; drives node spread and per-layer rotation. */
  seed: number;
  /** Per-layer attack offsets as fractions of the spawn duration. Layer 0 is
   *  always 0 (the signature primitive leads); later layers land on their own
   *  beat. Values are clamped to 0..0.3 by derivation. */
  beats: number[];
  /** Geometry scale accent, 0.92..1.12, applied only to primitives whose cue
   *  freedom allows scaling. */
  scale: number;
  /** Mirror the performance horizontally for primitives that allow it (a
   *  sweep ignites from the other edge, a bolt slants the other way). */
  mirror: boolean;
}

/** How much per-card cue variation a primitive can physically absorb without
 *  breaking its meaning. Board-aligned primitives (beams, sweeps, washes) hold
 *  their axis; radial primitives rotate freely; gravity primitives never
 *  rotate but may mirror. */
export interface PrimitiveCueFreedom {
  /** Max absolute rotation in degrees (0 = axis-locked). */
  rotateDeg: number;
  /** Whether a horizontal mirror is meaningful and safe. */
  mirror: boolean;
  /** Whether the scale accent applies (full-coverage primitives stay 1). */
  scale: boolean;
}

export const PRIMITIVE_CUE_FREEDOM: Record<PrimitiveKey, PrimitiveCueFreedom> = {
  bolt: { rotateDeg: 14, mirror: true, scale: true },
  shockRing: { rotateDeg: 0, mirror: false, scale: true },
  crackLines: { rotateDeg: 180, mirror: true, scale: true },
  crystallize: { rotateDeg: 180, mirror: true, scale: true },
  chainLink: { rotateDeg: 8, mirror: true, scale: true },
  sigilStamp: { rotateDeg: 10, mirror: false, scale: true },
  zoneSweep: { rotateDeg: 0, mirror: true, scale: false },
  edgeBurn: { rotateDeg: 0, mirror: true, scale: false },
  fogRoll: { rotateDeg: 0, mirror: true, scale: false },
  beamVertical: { rotateDeg: 0, mirror: false, scale: false },
  beamHorizontal: { rotateDeg: 0, mirror: false, scale: false },
  dropImpact: { rotateDeg: 0, mirror: false, scale: true },
  riseGlow: { rotateDeg: 0, mirror: false, scale: true },
  moonCircle: { rotateDeg: 0, mirror: false, scale: true },
  gateSlam: { rotateDeg: 0, mirror: true, scale: true },
  cardLift: { rotateDeg: 8, mirror: true, scale: true },
  weightDrop: { rotateDeg: 0, mirror: false, scale: true },
  tickPips: { rotateDeg: 8, mirror: true, scale: true },
  orbitSpark: { rotateDeg: 180, mirror: true, scale: true },
  shatterExit: { rotateDeg: 180, mirror: true, scale: true },
  drainFlow: { rotateDeg: 180, mirror: true, scale: true },
  pulseRing: { rotateDeg: 0, mirror: false, scale: true },
  slabSlam: { rotateDeg: 6, mirror: true, scale: true },
  quakeRumble: { rotateDeg: 0, mirror: true, scale: true },
  shackleDrop: { rotateDeg: 10, mirror: true, scale: true },
  barCage: { rotateDeg: 0, mirror: true, scale: true },
  crackBloom: { rotateDeg: 40, mirror: true, scale: true },
};

/** FNV-1a 32-bit hash: the stable per-card cue seed. */
export function cueHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic [0,1) from a 32-bit seed plus a stream index. */
export function cueRand(seed: number, n: number): number {
  let x = (seed + Math.imul(n + 1, 0x9e3779b9)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

/** Derive a card's spawn cue sheet from its stable identity. Pure and
 *  deterministic: the same card always performs the same reveal. */
export function deriveSpawnCue(
  cardFamily: CardFamily,
  cardId: string,
  primitives: PrimitiveKey[],
): SpawnCue {
  const seed = cueHash(`${cardFamily}:${cardId}`);
  const beats: number[] = [0];
  for (let i = 1; i < primitives.length; i++) {
    // Each later layer attacks on its own beat, 8%..30% into the spawn.
    beats.push(Math.round((0.08 + 0.22 * cueRand(seed, 40 + i)) * 100) / 100);
  }
  return {
    seed,
    beats,
    scale: Math.round((0.92 + 0.2 * cueRand(seed, 7)) * 100) / 100,
    mirror: cueRand(seed, 11) < 0.5,
  };
}

/** Hand-authored cue sheets for flagship nerfs (the canonical compositions of
 *  section 8 plus a few marquee rules). These tune the derived cue the way the
 *  flagship card waves used per-card cue sheets; everything not listed keeps
 *  its derived performance. Keys are `cardFamily:cardId`. */
export const SPAWN_CUE_OVERRIDES: Record<string, Partial<SpawnCue>> = {
  // Lightning hits early and hard: second layer almost on top of the first.
  "nerf:bottled_lightning": { beats: [0, 0.06], scale: 1.1, mirror: false },
  // One clean crystalline note, then the reflective ring well after.
  "nerf:glass_king": { beats: [0, 0.28], scale: 1.04 },
  // The golden chain draws unhurried and heavy.
  "nerf:hoarder": { scale: 1.08, mirror: false },
  // The leaden crown drops dead-center, no flourish.
  "nerf:hobbled_queen": { scale: 1.06, mirror: false },
  // The frontier ignites from the queenside edge.
  "nerf:hold_them_back": { mirror: false },
  // Fog banks roll in staggered, off-beat.
  "nerf:fog_of_war": { beats: [0, 0.18, 0.26] },
  // The ghost arrows crack apart just off the stamp's landing.
  "nerf:flat_footed": { beats: [0, 0.12] },
  // Portcullis reads big and square-on.
  "nerf:no_drawbridge": { scale: 1.1, mirror: false },
  // The duck simply arrives. It is a duck.
  "nerf:untitled_duck": { scale: 1.0, mirror: false },
  // Parchment light holds the file's axis exactly.
  "nerf:sacred_file": { mirror: false },
  // Dark-square energy wraps in from the kingside.
  "nerf:shadow_queen": { mirror: true },
  // March pips step in strict left-to-right file order.
  "nerf:march_or_die": { mirror: false },
  // Both bishops stamped a half-beat apart.
  "nerf:crippled_clergy": { beats: [0, 0.14] },
};

// Visibility (section 9). Nerfs are secret handicaps and stay opponent-hidden
// until the reveal moment, except board-visible physics (lava/fog/duck/etc.);
// buffs and public physics are always public.
export type SpectatorVisibility = "public" | "hiddenUntilReveal";
export type ReplayVisibility = "onCrossPly";

/** A resolved visual tuple for one card: the data compositions.ts stores and
 *  the registry expands into a PassiveVisual. This is exactly the "sentence"
 *  the coverage test enforces uniqueness over (family, primitives, target,
 *  sigil). */
export interface PassiveComposition {
  cardId: string;
  cardFamily: CardFamily;
  tier: number;
  family: PassiveFamily;
  primitives: PrimitiveKey[];
  targetType: PassiveTargetType;
  paletteRole: PassivePaletteRole;
  sigilIcon: string;
  soundCue?: string;
  /** Optional per-card cue-sheet override (section 3.1). Wins over both the
   *  derived cue and SPAWN_CUE_OVERRIDES; most rows omit it and rely on the
   *  deterministic derivation. */
  cue?: Partial<SpawnCue>;
}

export function spectatorVisibilityFor(
  cardFamily: CardFamily,
  target: PassiveTargetType,
  palette: PassivePaletteRole,
): SpectatorVisibility {
  if (target === "hidden") return "hiddenUntilReveal";
  // Board-visible physics read the same for everyone.
  if (palette !== "nerf" && palette !== "buff") return "public";
  if (cardFamily === "buff") return "public";
  return "hiddenUntilReveal";
}
