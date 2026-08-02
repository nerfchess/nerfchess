// The passive visual registry.
//
// One registry covers BOTH card families: implemented passive nerfs and every
// kind:"passive" buff. Each card is a data tuple (family, 1..3 primitives,
// target, palette role, sigil) authored in compositions.ts; this module expands
// each tuple into a fully resolved PassiveVisual with the render keys and
// lifecycle budgets derived from docs/passive-effect-language.md.
//
// A few ids exist as both a nerf and a passive buff, so entries are addressed
// by a composite key `${cardFamily}:${cardId}` (see passiveKey). The coverage
// test (scripts/test-passive-registry.ts) fails the build on any passive
// without an entry, any duplicate sentence, any over-budget composition, or any
// unknown key.

import { PASSIVE_COMPOSITIONS } from "./compositions";
import {
  auraForTarget,
  deriveSpawnCue,
  exitForFamily,
  nodeBudgetForTier,
  PALETTE_HEX,
  pulseForTarget,
  SPAWN_CUE_OVERRIDES,
  spawnDurationForTier,
  spectatorVisibilityFor,
  type AuraKey,
  type CardFamily,
  type ExitKey,
  type PassiveComposition,
  type PassiveFamily,
  type PassivePaletteRole,
  type PassiveTargetType,
  type PrimitiveKey,
  type PulseKey,
  type ReplayVisibility,
  type SpawnCue,
  type SpectatorVisibility,
} from "./spec";

export type {
  AuraKey,
  CardFamily,
  ExitKey,
  PassiveComposition,
  PassiveFamily,
  PassivePaletteRole,
  PassiveTargetType,
  PrimitiveKey,
  PulseKey,
  ReplayVisibility,
  SpawnCue,
  SpectatorVisibility,
};

/** The reduced-motion fallback contract for a card: a short fade to the static
 *  sigil (docs section 3: "a 160ms fade plus its static sigil"). Every entry
 *  has one; its absence fails the coverage test. */
export interface ReducedMotionFallback {
  fadeMs: number;
  staticSigil: string;
}

/** A fully resolved passive visual. The registry stores exactly these. */
export interface PassiveVisual {
  /** Card id (unique within its family; see cardFamily for the disambiguator). */
  cardId: string;
  /** Which library the card comes from. Part of the registry key. */
  cardFamily: CardFamily;
  /** Library tier (1..10); drives the intensity budgets below. */
  tier: number;
  /** The verb: what the passive DOES (section 2). */
  family: PassiveFamily;
  /** 1..3 primitives, the composition played on spawn (section 3). */
  composition: PrimitiveKey[];
  /** The noun: where the effect lands (section 4). */
  targetType: PassiveTargetType;
  /** Hue role; tier sets intensity, role sets hue (section 5). */
  paletteRole: PassivePaletteRole;
  /** Resolved hex for the palette role (design-system palette only). */
  color: string;
  /** The card's sigil icon (its own icon, or a family default). */
  sigilIcon: string;
  /** Spawn intro budget in ms, from the tier ladder (section 6). */
  spawnDurationMs: number;
  /** Bounded particle node count for this tier (section 3 and 6). */
  maxNodes: number;
  /** Persistent aura implied by the target (section 4). */
  auraKey: AuraKey;
  /** Trigger pulse on rejection/alteration (section 7.4). */
  pulseKey: PulseKey;
  /** Exit treatment (section 7.5). */
  exitKey: ExitKey;
  /** Per-card spawn cue sheet (section 3.1): the bespoke performance layer on
   *  top of the shared primitives. Derived deterministically per card, with
   *  flagship hand-authored overrides. */
  cue: SpawnCue;
  /** Reduced-motion static fallback (section 3, section 10). */
  reducedMotion: ReducedMotionFallback;
  /** Opponent/spectator visibility (section 9). */
  spectatorVisibility: SpectatorVisibility;
  /** Replay/history behavior (section 9). */
  replayVisibility: ReplayVisibility;
  /** Optional sound family cue (section 2). */
  soundCue?: string;
}

/** Composite registry key. A handful of ids exist as both a nerf and a passive
 *  buff, so the family is part of the identity. */
export function passiveKey(cardFamily: CardFamily, cardId: string): string {
  return `${cardFamily}:${cardId}`;
}

function expand(row: PassiveComposition): PassiveVisual {
  const replayVisibility: ReplayVisibility = "onCrossPly";
  // Cue precedence: derived base, then the flagship hand-authored override,
  // then any per-row data override from compositions.ts.
  const cue: SpawnCue = {
    ...deriveSpawnCue(row.cardFamily, row.cardId, row.primitives),
    ...SPAWN_CUE_OVERRIDES[passiveKey(row.cardFamily, row.cardId)],
    ...row.cue,
  };
  return {
    cardId: row.cardId,
    cardFamily: row.cardFamily,
    tier: row.tier,
    family: row.family,
    composition: row.primitives,
    targetType: row.targetType,
    paletteRole: row.paletteRole,
    color: PALETTE_HEX[row.paletteRole],
    sigilIcon: row.sigilIcon,
    spawnDurationMs: spawnDurationForTier(row.tier),
    maxNodes: nodeBudgetForTier(row.tier),
    cue,
    auraKey: auraForTarget(row.targetType),
    pulseKey: pulseForTarget(row.targetType),
    exitKey: exitForFamily(row.family),
    reducedMotion: { fadeMs: 160, staticSigil: row.sigilIcon },
    spectatorVisibility: spectatorVisibilityFor(row.cardFamily, row.targetType, row.paletteRole),
    replayVisibility,
    soundCue: row.soundCue,
  };
}

/** The registry: composite key -> resolved visual. */
export const PASSIVE_REGISTRY: Map<string, PassiveVisual> = new Map(
  PASSIVE_COMPOSITIONS.map((row) => [passiveKey(row.cardFamily, row.cardId), expand(row)]),
);

/** Every resolved visual, in generation order. */
export const PASSIVE_VISUALS: PassiveVisual[] = Array.from(PASSIVE_REGISTRY.values());

/** Look a card's visual up. When the family is unknown at the call site, a nerf
 *  is tried first (nerfs are the secret-handicap default), then a buff. */
export function getPassiveVisual(cardId: string, cardFamily?: CardFamily): PassiveVisual | undefined {
  if (cardFamily) return PASSIVE_REGISTRY.get(passiveKey(cardFamily, cardId));
  return (
    PASSIVE_REGISTRY.get(passiveKey("nerf", cardId)) ??
    PASSIVE_REGISTRY.get(passiveKey("buff", cardId))
  );
}
