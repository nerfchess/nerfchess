// Entrance resolution: which generic arrival treatment a card gets the moment
// it ENTERS a hand (and which palette that treatment wears).
//
// Resolution is motif-first: a card that declares a CardFx motif (jail /
// muzzle / anchor / blindfold / slow / empower / ward / rally) arrives as that
// motif's own scene — the bars drop, the straps clamp, the weight sinks —
// because the motif is the most specific thing the library knows about a
// card without hand-made art. A card with no motif falls back to its
// category's arrival choreography, and a card with neither (nerfs have no
// BuffCategory at all) lands on the neutral floor. The invariant this module
// exists to keep: resolveEntrance NEVER returns nothing — every card in the
// library, buff or nerf, resolves to a renderable arrival.
//
// Kept as plain TS with type-only engine imports so it can be imported
// headlessly: scripts/vfx-coverage-probe.mts runs THIS resolver over the whole
// library and check-vfx-coverage.cjs asserts the invariant against the real
// code, not a parsed copy that could drift. The matching renderers live in
// cardEntrance.tsx (MOTIF_ARRIVAL / ARRIVAL_BY_CATEGORY / DefaultArrival);
// the checker cross-checks those tables' keys against the kinds emitted here.

import type { BuffCategory, CardFx } from "@/engine/buff";

export type EntranceMotif = CardFx["motif"];

export interface ArrivalTheme {
  color: string;
  soft: string;
  deep: string;
}

/** Same hues as BoardEffects' CAST_THEME (kept local: BoardEffects imports
 * the entrance layer, never the reverse). Record over BuffCategory, so a new
 * category cannot ship without an arrival palette. */
export const ARRIVAL_THEME: Record<BuffCategory, ArrivalTheme> = {
  movement: { color: "#67e8f9", soft: "rgba(103,232,249,0.14)", deep: "#0e4a56" },
  pieces: { color: "#e6bf6a", soft: "rgba(230,191,106,0.14)", deep: "#4a3a12" },
  tempo: { color: "#f4c430", soft: "rgba(244,196,48,0.13)", deep: "#4a3a06" },
  protection: { color: "#7eb59a", soft: "rgba(126,181,154,0.15)", deep: "#1d3a2d" },
  attack: { color: "#e05252", soft: "rgba(224,82,82,0.14)", deep: "#4a1212" },
  info: { color: "#8ba9c4", soft: "rgba(139,169,196,0.14)", deep: "#233242" },
  draft: { color: "#e07ab8", soft: "rgba(224,122,184,0.13)", deep: "#45183a" },
  nerf: { color: "#5eead4", soft: "rgba(94,234,212,0.14)", deep: "#0e4038" },
  hex: { color: "#a877d8", soft: "rgba(168,119,216,0.15)", deep: "#331a4a" },
  item: { color: "#a3d160", soft: "rgba(163,209,96,0.14)", deep: "#2c3a12" },
};

/** Per-motif palettes (core / glow-soft / deep accent, per the house palette
 * discipline). Record over EntranceMotif: adding a motif to CardFx without an
 * arrival flavor is a type error here before it is a coverage failure. */
export const MOTIF_ARRIVAL_THEME: Record<EntranceMotif, ArrivalTheme> = {
  jail: { color: "#aab6c6", soft: "rgba(170,182,198,0.15)", deep: "#242e3a" },
  muzzle: { color: "#c98960", soft: "rgba(201,137,96,0.14)", deep: "#432816" },
  anchor: { color: "#7fa0c8", soft: "rgba(127,160,200,0.14)", deep: "#1b2c42" },
  blindfold: { color: "#9b8fc0", soft: "rgba(155,143,192,0.15)", deep: "#2c2544" },
  slow: { color: "#cfa356", soft: "rgba(207,163,86,0.13)", deep: "#42310e" },
  empower: { color: "#f0c75e", soft: "rgba(240,199,94,0.14)", deep: "#4a380e" },
  ward: { color: "#8fd0b2", soft: "rgba(143,208,178,0.15)", deep: "#173a2c" },
  rally: { color: "#e0784a", soft: "rgba(224,120,74,0.14)", deep: "#421f0e" },
};

/** The neutral floor: warm parchment, deliberately quieter than any category
 * hue, worn by cards outside the buff taxonomy (nerfs). */
export const DEFAULT_ARRIVAL_THEME: ArrivalTheme = {
  color: "#d9cbb0",
  soft: "rgba(217,203,176,0.13)",
  deep: "#39321f",
};

export type EntranceResolution =
  | { kind: "motif"; motif: EntranceMotif; theme: ArrivalTheme }
  | { kind: "category"; category: BuffCategory; theme: ArrivalTheme }
  | { kind: "default"; theme: ArrivalTheme };

export function isEntranceMotif(m: string): m is EntranceMotif {
  return Object.prototype.hasOwnProperty.call(MOTIF_ARRIVAL_THEME, m);
}

export function isArrivalCategory(c: string): c is BuffCategory {
  return Object.prototype.hasOwnProperty.call(ARRIVAL_THEME, c);
}

/** The shape resolveEntrance needs. Fields are loose (plain strings, all
 * optional) on purpose: the resolver must stay total over ANY card record —
 * a Buff, a Nerf (no category, no fx), or a future shape — and answer with
 * a renderable arrival regardless. */
export interface EntranceCardLike {
  category?: string;
  fx?: { motif?: string } | null;
}

/**
 * Motif first, category second, neutral floor last. Total by construction:
 * there is no input for which this returns null/undefined, and the coverage
 * gate (check-vfx-coverage.cjs rule 3) re-asserts that across all ~2,448
 * library cards on every run.
 */
export function resolveEntrance(card: EntranceCardLike): EntranceResolution {
  const motif = card.fx?.motif;
  if (motif && isEntranceMotif(motif)) {
    return { kind: "motif", motif, theme: MOTIF_ARRIVAL_THEME[motif] };
  }
  const category = card.category;
  if (category && isArrivalCategory(category)) {
    return { kind: "category", category, theme: ARRIVAL_THEME[category] };
  }
  return { kind: "default", theme: DEFAULT_ARRIVAL_THEME };
}
