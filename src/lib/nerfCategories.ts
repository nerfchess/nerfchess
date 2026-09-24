// The id -> categories map over the static nerf library. The definitions and
// the classifier live in nerfCategoryDefs.ts, library-free, so client code can
// import them without the library; this module adds the map and re-exports
// the rest, so existing imports keep working.

import { ALL_NERFS } from "@/engine/nerfs/library";
import { categorize } from "./nerfCategoryDefs";

export * from "./nerfCategoryDefs";

// Precomputed id -> category ids, built once from the static library.
export const NERF_CATEGORY_MAP: Record<string, string[]> = Object.fromEntries(
  ALL_NERFS.map((n) => [n.id, categorize(n)]),
);

export function categoriesOf(nerfId: string): string[] {
  return NERF_CATEGORY_MAP[nerfId] ?? [];
}
