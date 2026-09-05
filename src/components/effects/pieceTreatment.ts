// Per-piece treatments: the card-keyed look a piece WEARS while a card's fx
// runs on it. The motif badge says WHICH card touched the piece; the
// treatment makes the piece itself look changed — rusted under one hex,
// moonlit under one boon, branded by another — per card, not per motif.
// Until this module, every affected piece shared three generic looks
// (piece-frozen / piece-doomed / piece-shielded) and the 939 fx cards had no
// piece-level identity at all.
//
// Deliberately FILTER-ONLY, like the piece-frozen precedent in globals.css:
// a filter reaches both piece sources (the inline Cburnett SVGs and the
// lichess image skins) without touching either's markup. The filter is
// STATIC — never animated (design-system §6); the one-shot arrival pulse is
// a transform keyframe on the same wrapper, parked under data-anim="off"
// while the informative filter stays.
//
// Headless (plain TS, type-only imports): scripts/treatment-coverage-probe.mts
// runs THIS resolver over every fx card and check-treatment-coverage.cjs
// asserts totality and per-family distinctness.

import type { MotifKind } from "./fxZones";

export interface PieceTreatment {
  /** Family name, for debugging and the coverage gate. */
  family: string;
  /** The full static filter string the wrapper wears. */
  filter: string;
  /** Remount key: the treating card's id, so the arrival pulse replays only
   * when a DIFFERENT card takes over the piece. */
  key: string;
}

/** FNV-1a (the shared per-card hash idiom). */
function fnv1a(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A treatment family: builds the filter from the card's hash-derived knobs.
 * `hue` is a small in-family hue swing (deg), `str` a 0..1 strength. */
type Family = { name: string; build: (hue: number, str: number) => string };

/** Constraint families: the piece is diminished — drained, bound, corroded.
 * Every build keeps the piece clearly legible (min brightness/saturation
 * floors): a treatment may never make a piece unreadable. */
const CONSTRAINT_FAMILIES: Family[] = [
  {
    name: "rust",
    build: (h, s) =>
      `sepia(${0.35 + s * 0.2}) saturate(${0.75 - s * 0.15}) hue-rotate(${-18 + h}deg) brightness(${0.94 - s * 0.05}) drop-shadow(0 1px 3px rgba(122, 62, 24, 0.55))`,
  },
  {
    name: "shackle",
    build: (h, s) =>
      `saturate(${0.55 - s * 0.1}) contrast(${1.04 + s * 0.05}) brightness(${0.9 - s * 0.04}) hue-rotate(${h}deg) drop-shadow(0 0 4px rgba(120, 130, 148, 0.7))`,
  },
  {
    name: "frostbind",
    build: (h, s) =>
      `saturate(${0.5 - s * 0.1}) brightness(${1.06 + s * 0.06}) hue-rotate(${170 + h}deg) drop-shadow(0 0 4px rgba(140, 200, 235, 0.65))`,
  },
  {
    name: "gloom",
    build: (h, s) =>
      `saturate(${0.6 - s * 0.12}) brightness(${0.86 - s * 0.04}) hue-rotate(${230 + h}deg) drop-shadow(0 0 5px rgba(90, 70, 140, 0.6))`,
  },
  {
    name: "tarnish",
    build: (h, s) =>
      `sepia(${0.25 + s * 0.15}) saturate(${0.7 - s * 0.1}) brightness(${0.92}) hue-rotate(${35 + h}deg) drop-shadow(0 1px 3px rgba(96, 84, 40, 0.6))`,
  },
  {
    name: "petrify",
    build: (h, s) =>
      `grayscale(${0.55 + s * 0.25}) contrast(${1.06}) brightness(${0.97}) hue-rotate(${h}deg) drop-shadow(0 1px 2px rgba(70, 70, 74, 0.7))`,
  },
  {
    name: "murk",
    build: (h, s) =>
      `saturate(${0.65 - s * 0.1}) brightness(${0.9}) hue-rotate(${120 + h}deg) drop-shadow(0 0 5px rgba(56, 96, 70, 0.6))`,
  },
  {
    name: "brand",
    build: (h, s) =>
      `saturate(${0.85}) contrast(${1.05 + s * 0.05}) brightness(${0.93}) hue-rotate(${-8 + h}deg) drop-shadow(0 0 4px rgba(190, 70, 48, ${0.5 + s * 0.2}))`,
  },
];

/** Empowerment families: the piece is enriched — lit, gilded, charged. */
const EMPOWER_FAMILIES: Family[] = [
  {
    name: "gild",
    build: (h, s) =>
      `saturate(${1.15 + s * 0.15}) brightness(${1.06 + s * 0.05}) hue-rotate(${h}deg) drop-shadow(0 0 3px rgba(240, 199, 94, 0.9)) drop-shadow(0 0 8px rgba(230, 180, 80, ${0.4 + s * 0.2}))`,
  },
  {
    name: "ember",
    build: (h, s) =>
      `saturate(${1.2 + s * 0.1}) brightness(${1.04}) hue-rotate(${-12 + h}deg) drop-shadow(0 0 4px rgba(255, 140, 66, 0.85)) drop-shadow(0 1px 9px rgba(224, 90, 40, ${0.4 + s * 0.15}))`,
  },
  {
    name: "prism",
    build: (h, s) =>
      `saturate(${1.25 + s * 0.15}) brightness(${1.08}) hue-rotate(${h * 3}deg) drop-shadow(0 0 4px rgba(150, 210, 255, 0.8)) drop-shadow(0 0 9px rgba(190, 150, 255, ${0.35 + s * 0.2}))`,
  },
  {
    name: "verdant",
    build: (h, s) =>
      `saturate(${1.15}) brightness(${1.05}) hue-rotate(${80 + h}deg) drop-shadow(0 0 4px rgba(126, 200, 150, 0.8)) drop-shadow(0 0 8px rgba(90, 170, 120, ${0.4 + s * 0.15}))`,
  },
  {
    name: "moonlit",
    build: (h, s) =>
      `saturate(${0.95}) brightness(${1.12 + s * 0.05}) hue-rotate(${200 + h}deg) drop-shadow(0 0 4px rgba(190, 210, 255, 0.85)) drop-shadow(0 0 9px rgba(150, 170, 235, ${0.35 + s * 0.15}))`,
  },
  {
    name: "radiant",
    build: (h, s) =>
      `saturate(${1.1}) brightness(${1.12 + s * 0.06}) hue-rotate(${h}deg) drop-shadow(0 0 3px rgba(255, 244, 214, 0.95)) drop-shadow(0 0 10px rgba(244, 196, 48, ${0.4 + s * 0.2}))`,
  },
  {
    name: "storm",
    build: (h, s) =>
      `saturate(${1.2}) contrast(${1.05}) brightness(${1.05}) hue-rotate(${185 + h}deg) drop-shadow(0 0 4px rgba(130, 200, 245, 0.85)) drop-shadow(0 0 9px rgba(94, 160, 234, ${0.4 + s * 0.15}))`,
  },
  {
    name: "royal",
    build: (h, s) =>
      `saturate(${1.18}) brightness(${1.07}) hue-rotate(${265 + h}deg) drop-shadow(0 0 4px rgba(210, 160, 255, 0.85)) drop-shadow(0 0 9px rgba(168, 119, 216, ${0.4 + s * 0.18}))`,
  },
];

const EMPOWER_MOTIFS: ReadonlySet<string> = new Set(["empower", "ward", "rally"]);

/** Family rosters, exported for the coverage gate (polarity sanity check). */
export const CONSTRAINT_FAMILY_NAMES = CONSTRAINT_FAMILIES.map((f) => f.name);
export const EMPOWER_FAMILY_NAMES = EMPOWER_FAMILIES.map((f) => f.name);

export interface TreatmentMarkLike {
  id: string;
  motif: MotifKind | string;
  tier?: number;
}

/**
 * Total over any mark a motif card paints: constraint motifs draw from the
 * diminished families, empowerment motifs from the enriched ones; the card's
 * hash picks the family and bends its knobs, and the tier feeds strength so
 * a tier-8 curse sits heavier than a tier-2 one. Deterministic and pure —
 * both game surfaces and the coverage probe get identical answers.
 */
export function resolvePieceTreatment(mark: TreatmentMarkLike): PieceTreatment {
  const h = fnv1a(`treat:${mark.id}`);
  const empower = EMPOWER_MOTIFS.has(mark.motif);
  const pool = empower ? EMPOWER_FAMILIES : CONSTRAINT_FAMILIES;
  const fam = pool[h % pool.length];
  // Fine-grained knobs (0.1deg hue, 0.01 strength steps): with ~60-120
  // cards per family the space must be wide enough that no two cards ever
  // compose the same filter — the coverage gate ratchets collisions at zero.
  const hue = (((h >>> 5) % 401) - 200) / 20; // -10.00..10.00 deg in 0.05 steps
  const tier = mark.tier ?? 4;
  // No clamping: a floor + open-ended jitter keeps the whole [0.12, 0.89]
  // band reachable and, crucially, never collapses two low-tier cards onto
  // the same clamped endpoint (the exact collision the gate once caught).
  const str = 0.12 + (tier - 1) * 0.075 + ((h >>> 13) % 21) * 0.004 + ((h >>> 27) % 5) * 0.0008;
  return { family: fam.name, filter: fam.build(hue, str), key: mark.id };
}
