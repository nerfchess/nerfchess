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
  /**
   * Lowercased terms; a nerf joins the category when its text contains any of
   * them AT A WORD BOUNDARY. Several are deliberate STEMS ("captur", "promot",
   * "shuffl") and still cover their whole family, because the boundary is only
   * anchored at the front: "captur" matches capture / captures / capturing.
   * The flip side is that a compound needing to match has to be listed itself,
   * which is why "recaptur" sits next to "captur" below.
   */
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
    // "recaptur" is listed on its own because the boundary match anchors at the
    // front of a word: without it "Can't recapture." (turn_other_cheek) would
    // carry no Capturing tag at all.
    keywords: ["captur", "recaptur", "en passant", "take a piece", "takes"],
  },
  {
    id: "Movement",
    label: "Movement",
    keywords: [
      "can't move", "can only move", "must move", "cannot move", "may move",
      "sideways", "backward", "forward", "diagonal", "orthogonal", "advance",
      "retreat", "slide", "shuffl", "step", "squares", "more than", "distance",
      "move like", "move away", "move toward", "make the move",
      // Coverage gaps, unrelated to the boundary fix below: "You can't castle."
      // (no_drawbridge) and "can't make a move that leaves any of your pieces
      // attacked" (no_hanging_pieces) carried no category at all, so neither
      // answered any codex filter chip.
      "castl", "make a move",
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

// Keywords are matched at a word boundary, never as a bare substring. Plain
// `text.includes(k)` found them inside unrelated words and produced 23 phantom
// tags across the 360 nerfs: "spawns" read as Pawns (10 nerfs, because so many
// rules texts mention pieces "a card spawns"), "taking" / "attacking" /
// "checking" / "making" / "breaking" as King, "return" as Timing, "narrow" and
// "crown" and "behalf" and "headlights" as Positioning. Those tags are not
// cosmetic: affectedLine() in src/app/codex/_components/affected.ts turns the
// piece categories into player-facing copy, so 14 nerfs were claiming to affect
// pieces they never touch ("Affects your pawns." on domino, own_half_only,
// velociraptor and friends).
//
// Compiled once at module load: categorize() runs over the whole library to
// build NERF_CATEGORY_MAP below, so the regexes must not be rebuilt per call.
const COMPILED_KEYWORDS: { id: string; patterns: RegExp[] }[] = CATEGORY_DEFS.map((c) => ({
  id: c.id,
  patterns: c.keywords.map((k) => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`)),
}));

/** Classify one nerf. Exported so tooling/tests can exercise it directly. */
export function categorize(nerf: Pick<Nerf, "name" | "description">): string[] {
  const text = `${nerf.name} ${nerf.description}`.toLowerCase();
  return COMPILED_KEYWORDS.filter((c) => c.patterns.some((p) => p.test(text))).map((c) => c.id);
}

// Precomputed id -> category ids, built once from the static library.
export const NERF_CATEGORY_MAP: Record<string, string[]> = Object.fromEntries(
  ALL_NERFS.map((n) => [n.id, categorize(n)]),
);

export function categoriesOf(nerfId: string): string[] {
  return NERF_CATEGORY_MAP[nerfId] ?? [];
}
