// Pure filtering + sorting for the Codex. No React, no DOM — just data in,
// data out — so it stays trivially testable and reusable, and the page
// component only worries about presentation and URL state.

import type { Nerf } from "@/engine/nerf";
import { CATEGORY_IDS, categoriesOf, getCategoryLabel } from "@/lib/nerfCategories";
import { COLLECTION_IDS, nerfCollection } from "@/lib/cardCollections";

import { TIER_ROMAN } from "./tiers";
const SORT_IDS: SortId[] = ["az", "za", "easy", "brutal"];

export type SortId = "az" | "za" | "easy" | "brutal";

export const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: "az", label: "Name (A to Z)" },
  { id: "za", label: "Name (Z to A)" },
  { id: "easy", label: "Easiest first" },
  { id: "brutal", label: "Hardest first" },
];

export interface CodexFilters {
  search: string;
  tier: number | null; // 1..8 or null for all
  categories: string[]; // category ids; a nerf must match ALL selected (AND)
  collection: string | null; // thematic set (Fantasy, Wild, Funny...) or null for all
  playableOnly: boolean;
  sort: SortId;
}

export const EMPTY_FILTERS: CodexFilters = {
  search: "",
  tier: null,
  categories: [],
  collection: null,
  playableOnly: false,
  sort: "az",
};

export function hasActiveFilters(f: CodexFilters): boolean {
  return (
    f.search.trim() !== "" ||
    f.tier !== null ||
    f.categories.length > 0 ||
    f.collection !== null ||
    f.playableOnly
  );
}

// --- URL state -------------------------------------------------------------
// Filters round-trip through the query string (tier as a Roman numeral,
// categories as a comma-separated id list), e.g. ?search=queen&tier=II&category=Queen,Movement

export function filtersToQueryString(f: CodexFilters): string {
  const p = new URLSearchParams();
  if (f.search.trim()) p.set("search", f.search.trim());
  if (f.tier !== null) p.set("tier", TIER_ROMAN[f.tier]);
  if (f.categories.length > 0) p.set("category", f.categories.join(","));
  if (f.collection) p.set("collection", f.collection);
  if (f.playableOnly) p.set("playable", "1");
  if (f.sort !== "az") p.set("sort", f.sort);
  return p.toString();
}

export function filtersFromQueryString(qs: string): CodexFilters {
  const p = new URLSearchParams(qs);
  const tierRoman = p.get("tier");
  const tierIdx = tierRoman ? TIER_ROMAN.indexOf(tierRoman.toUpperCase()) : -1;
  const cats = (p.get("category") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((c) => CATEGORY_IDS.includes(c));
  const sort = p.get("sort") as SortId | null;
  const collection = p.get("collection");
  return {
    search: p.get("search") ?? "",
    tier: tierIdx > 0 ? tierIdx : null,
    categories: cats,
    collection: collection && COLLECTION_IDS.includes(collection) ? collection : null,
    playableOnly: p.get("playable") === "1",
    sort: sort && SORT_IDS.includes(sort) ? sort : "az",
  };
}

/** Subsequence test: are all chars of `needle` found in order within `hay`?
 *  Gives light fuzziness ("fgwr" → "fog war") without a heavy dependency. */
function isSubsequence(needle: string, hay: string): boolean {
  let i = 0;
  for (let j = 0; j < hay.length && i < needle.length; j++) {
    if (hay[j] === needle[i]) i++;
  }
  return i === needle.length;
}

/** A nerf matches the query when every whitespace-separated token is a
 *  substring of its searchable text (name + description + flavor + category
 *  labels) OR a fuzzy subsequence of its name. Subsequence is deliberately
 *  restricted to the short name so a rare-letter query can't spuriously thread
 *  itself through a long description. Tokens combine with AND. */
function matchesSearch(haystack: string, name: string, query: string): boolean {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((t) => haystack.includes(t) || (t.length >= 3 && isSubsequence(t, name)));
}

function haystackFor(nerf: Nerf): string {
  const cats = categoriesOf(nerf.id).map(getCategoryLabel).join(" ");
  return `${nerf.name} ${nerf.description} ${nerf.flavor ?? ""} ${cats}`.toLowerCase();
}

export function filterAndSortNerfs(nerfs: Nerf[], f: CodexFilters): Nerf[] {
  const query = f.search.trim();
  const out = nerfs.filter((n) => {
    if (f.tier !== null && n.tier !== f.tier) return false;
    if (f.collection && nerfCollection(n) !== f.collection) return false;
    if (f.playableOnly && !n.implemented) return false;
    if (f.categories.length > 0) {
      const cats = categoriesOf(n.id);
      if (!f.categories.every((c) => cats.includes(c))) return false;
    }
    if (query && !matchesSearch(haystackFor(n), n.name.toLowerCase(), query)) return false;
    return true;
  });

  const byName = (a: Nerf, b: Nerf) => a.name.localeCompare(b.name);
  switch (f.sort) {
    case "az":
      out.sort(byName);
      break;
    case "za":
      out.sort((a, b) => byName(b, a));
      break;
    case "easy":
      out.sort((a, b) => a.tier - b.tier || byName(a, b));
      break;
    case "brutal":
      out.sort((a, b) => b.tier - a.tier || byName(a, b));
      break;
  }
  return out;
}
