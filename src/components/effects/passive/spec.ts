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
// Primitives (section 3): the reusable vocabulary. Exactly 22.
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
// move"). Every one of the 22 primitives appears in at least one pool.
// ---------------------------------------------------------------------------

export const FAMILY_VOCAB: Record<PassiveFamily, PrimitiveKey[]> = {
  strike: ["bolt", "shockRing", "edgeBurn", "drainFlow", "pulseRing"],
  bind: ["chainLink", "weightDrop", "gateSlam", "sigilStamp", "pulseRing"],
  fracture: ["crystallize", "crackLines", "shatterExit", "cardLift", "shockRing"],
  territory: ["zoneSweep", "edgeBurn", "beamVertical", "beamHorizontal", "pulseRing"],
  veil: ["fogRoll", "drainFlow", "moonCircle", "orbitSpark", "pulseRing"],
  decree: ["sigilStamp", "crackLines", "drainFlow", "shockRing", "pulseRing"],
  tempo: ["tickPips", "orbitSpark", "drainFlow", "edgeBurn", "pulseRing"],
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
};

export const PRIMITIVE_MANIFEST: Record<PrimitiveKey, PrimitiveManifestEntry> = Object.fromEntries(
  PRIMITIVE_KEYS.map((key) => [
    key,
    { key, fallback: `${key}-static-fade`, naturalNodes: PRIMITIVE_NATURAL_NODES[key] } as PrimitiveManifestEntry,
  ]),
) as Record<PrimitiveKey, PrimitiveManifestEntry>;

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
