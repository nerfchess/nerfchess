// Shared, DOM-free helpers for the codex browser: the unified card entry the
// list rows and the expand-in-place view both read, plus the small pure
// filters (behaviour, available tiers) the browser layers on top of the
// existing nerf/buff filter helpers. Kept React-free so it stays trivially
// testable and the row components import only what they render.

import type { Buff } from "@/engine/buff";
import type { Nerf } from "@/engine/nerf";
import { cardPath, nerfPath } from "@/lib/cardCodex";

// The four browsable families, matching the existing detail routes and the
// codex tabs. Internal ids are kept ("rules" = nerfs) so saved links and the
// per-family filter helpers below keep working; only the tab labels change.
export type Library = "buffs" | "rules" | "hexes" | "boons";

// Order the tabs render in: Buff, Nerf, Hex, Boon (per the design brief). The
// default tab is the first one so a bare /codex opens on Buffs.
export const LIBRARY_TABS: Library[] = ["buffs", "rules", "hexes", "boons"];
export const DEFAULT_TAB: Library = "buffs";

export const TAB_LABEL: Record<Library, string> = {
  buffs: "Buff",
  rules: "Nerf",
  hexes: "Hex",
  boons: "Boon",
};

// The singular noun each tab uses in prose ("42 of 627 buffs", "Search the
// buffs", "No buffs match your filters").
export const LIBRARY_NOUN: Record<Library, string> = {
  buffs: "buff",
  rules: "nerf",
  hexes: "hex",
  boons: "boon",
};

// Proper plural forms ("hex" pluralizes to "hexes", not "hexs"), used anywhere
// the browser talks about the family in the plural.
export const LIBRARY_NOUN_PLURAL: Record<Library, string> = {
  buffs: "buffs",
  rules: "nerfs",
  hexes: "hexes",
  boons: "boons",
};

// A behaviour filter only makes sense for the buff families: nerfs are always
// passive and secret, so the rules tab hides it. Values mirror Buff.kind.
export type Behaviour = "all" | "passive" | "instant" | "activated";
export const BEHAVIOURS: Behaviour[] = ["all", "passive", "instant", "activated"];
export const BEHAVIOUR_LABEL: Record<Behaviour, string> = {
  all: "Any behaviour",
  passive: "Passive",
  instant: "Instant",
  activated: "Activated",
};

// One shape the list rows and the expand view can both consume, so the grid
// does not branch on card kind at every turn.
export type CodexEntry =
  | { kind: "nerf"; card: Nerf }
  | { kind: "buff"; card: Buff };

/** The stable, direct detail URL for an entry (unchanged existing routes). */
export function entryPath(e: CodexEntry): string {
  return e.kind === "nerf" ? nerfPath(e.card.id) : cardPath(e.card);
}

/** The distinct tiers actually present in a list, ascending. Feeds the tier
 * filter so it only ever offers bands the family really has (no faked 9/10
 * options where the data has none). */
export function tiersPresent(cards: { tier: number }[]): number[] {
  const set = new Set<number>();
  for (const c of cards) set.add(c.tier);
  return Array.from(set).sort((a, b) => a - b);
}
