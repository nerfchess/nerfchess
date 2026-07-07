// Card "collections": which thematic set each card was shipped in, derived
// from the source barrels the library spreads together (see buffs/library.ts
// ALL_BUFFS and nerfs/implemented.ts). This is display metadata only, computed
// once from the static libraries, so the codex can offer a "Collection" filter
// (Fantasy, Wild, Funny/meta, ...) without tagging every card definition by
// hand. Membership is resolved by id, so it survives the moderator-override
// text mapping the codex applies.

import { FANTASY_CARDS } from "@/engine/buffs/fantasy";
import { WILD_CARDS } from "@/engine/buffs/wild";
import { FUNNY_CARDS } from "@/engine/buffs/funny";
import { WILD_NERFS } from "@/engine/nerfs/wild";
import type { Buff } from "@/engine/buff";
import type { Nerf } from "@/engine/nerf";

export type BuffCollection = "Core" | "Hex" | "Funny" | "Fantasy" | "Wild" | "Item";
export type NerfCollection = "Core" | "Wild";

const FANTASY = new Set(FANTASY_CARDS.map((c) => c.id));
const WILD = new Set(WILD_CARDS.map((c) => c.id));
const FUNNY = new Set(FUNNY_CARDS.map((c) => c.id));
const WILD_N = new Set(WILD_NERFS.map((c) => c.id));

/** Which collection a buff (including hexes, boons, items) belongs to. The
 * exotic barrels win first; the rest fall back to Item / Hex by category, then
 * Core for the original tiered set. */
export function buffCollection(b: Pick<Buff, "id" | "category">): BuffCollection {
  if (FANTASY.has(b.id)) return "Fantasy";
  if (WILD.has(b.id)) return "Wild";
  if (FUNNY.has(b.id)) return "Funny";
  if (b.category === "item") return "Item";
  if (b.category === "hex") return "Hex";
  return "Core";
}

/** Which collection a nerf belongs to: the wild expansion set or the base. */
export function nerfCollection(n: Pick<Nerf, "id">): NerfCollection {
  return WILD_N.has(n.id) ? "Wild" : "Core";
}

// The collections offered by the codex "Collection" filter, per library. Each
// carries a short hint so the dropdown explains what the set is.
export const BUFF_COLLECTIONS: { id: BuffCollection; label: string; hint: string }[] = [
  { id: "Core", label: "Core", hint: "The original tiered set" },
  { id: "Funny", label: "Funny / meta", hint: "Gags and meta plays, like Computer Virus" },
  { id: "Fantasy", label: "Fantasy", hint: "Mystical, fantasy-themed cards" },
  { id: "Wild", label: "Wild", hint: "Elemental, warfare, arcane, and chaos cards" },
  { id: "Hex", label: "Hexes", hint: "Curses cast on the opponent" },
  { id: "Item", label: "Items", hint: "One-use consumables" },
];
export const NERF_COLLECTIONS: { id: NerfCollection; label: string; hint: string }[] = [
  { id: "Core", label: "Core", hint: "The base handicaps" },
  { id: "Wild", label: "Wild", hint: "The wild expansion nerfs" },
];

/** Every collection id that can appear in a URL, for validation on parse. */
export const COLLECTION_IDS: string[] = ["Core", "Funny", "Fantasy", "Wild", "Hex", "Item"];
