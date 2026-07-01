// Metadata layer that classifies every nerf into one or more mechanic-based
// categories. Classification is keyword-driven and computed once from the
// static library, so adding a new nerf needs no manual tagging — and adding a
// new category (or tuning an existing one) is a single edit to CATEGORY_DEFS.
//
// Kept deliberately separate from any UI so the same map can feed search,
// filtering, and (later) other surfaces.

import { ALL_NERFS } from "@/engine/nerfs/library";
import type { Nerf } from "@/engine/nerf";

export interface NerfCategory {
  /** URL-safe, stable identifier (also used as the React key). */
  id: string;
  /** Human label shown on chips. */
  label: string;
  /** Lowercased substrings; a nerf joins the category if its text contains any. */
  keywords: string[];
}

// Order here is the order chips render in. Keywords match against the lowercased
// "name + description". Categories may overlap — a nerf can match several.
export const CATEGORY_DEFS: NerfCategory[] = [
  { id: "King", label: "King", keywords: ["king", "royal", "monarch"] },
  { id: "Queen", label: "Queen", keywords: ["queen"] },
  { id: "Pawns", label: "Pawns", keywords: ["pawn"] },
  { id: "Knights", label: "Knights", keywords: ["knight", "horse"] },
  { id: "Bishops", label: "Bishops", keywords: ["bishop"] },
  { id: "Rooks", label: "Rooks", keywords: ["rook"] },
  {
    id: "Capturing",
    label: "Capturing",
    keywords: ["captur", "en passant", "take a piece", "takes"],
  },
  {
    id: "Movement",
    label: "Movement",
    keywords: [
      "can't move", "can only move", "must move", "cannot move", "may move",
      "sideways", "backward", "forward", "diagonal", "orthogonal", "advance",
      "retreat", "slide", "shuffl", "step", "squares", "more than", "distance",
      "move like", "move away", "move toward", "make the move",
    ],
  },
  { id: "Check", label: "Check", keywords: ["check"] },
  { id: "Promotion", label: "Promotion", keywords: ["promot", "promote", "8th rank", "queening"] },
  {
    id: "Positioning",
    label: "Positioning",
    keywords: [
      "rank", "file", "square", "adjacent", "next to", "edge", "rim", "corner",
      "center", "centre", "home", "half", "column", "row", "dark", "light",
      "same file", "same rank", "border",
    ],
  },
  {
    id: "Random",
    label: "Random",
    keywords: ["random", "randomly", "secretly", "secret", "dice", "coin", "chance", "chosen"],
  },
  {
    id: "WinLoss",
    label: "Win/Loss",
    keywords: ["you lose", "you win", "lose if", "win by", "loses", "defeat", "checkmate", "you can't lose", "game ends", "resign"],
  },
  {
    id: "Board",
    label: "Board Effects",
    keywords: ["water", "rises", "underwater", "duck", "lava", "wall", "tile", "flood", "sink", "terrain", "board"],
  },
  {
    id: "Vision",
    label: "Vision / Info",
    keywords: ["fog", "can't see", "cannot see", "hidden", "invisible", "vision", "reveal", "blind", "unseen", "study"],
  },
  {
    id: "Timing",
    label: "Timing / Turn",
    keywords: [
      "turn", "each move", "every move", "last move", "twice in a row", "previous move",
      "next move", "first move", "in a row", "every turn", "each turn", "per game",
      "on the next", "already moved", "just moved", "consecutive",
    ],
  },
];

export const CATEGORY_IDS = CATEGORY_DEFS.map((c) => c.id);

export function getCategoryLabel(id: string): string {
  return CATEGORY_DEFS.find((c) => c.id === id)?.label ?? id;
}

/** Classify one nerf. Exported so tooling/tests can exercise it directly. */
export function categorize(nerf: Pick<Nerf, "name" | "description">): string[] {
  const text = `${nerf.name} ${nerf.description}`.toLowerCase();
  return CATEGORY_DEFS.filter((c) => c.keywords.some((k) => text.includes(k))).map((c) => c.id);
}

// Precomputed id -> category ids, built once from the static library.
export const NERF_CATEGORY_MAP: Record<string, string[]> = Object.fromEntries(
  ALL_NERFS.map((n) => [n.id, categorize(n)]),
);

export function categoriesOf(nerfId: string): string[] {
  return NERF_CATEGORY_MAP[nerfId] ?? [];
}
