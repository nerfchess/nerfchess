// Card "collections": which thematic set each card was shipped in, derived
// from the source barrels the library spreads together (see buffs/library.ts
// ALL_BUFFS and nerfs/implemented.ts). This is display metadata only, computed
// once from the static libraries, so the codex can offer a "Collection" filter
// (Fantasy, Mystic, Wild, Funny/meta, ...) without tagging every card
// definition by hand. Membership is resolved by id, so it survives the
// moderator-override text mapping the codex applies.

import { FANTASY_CARDS } from "@/engine/buffs/fantasy";
import { MYSTIC_CARDS } from "@/engine/buffs/mystic";
import { WILD_CARDS } from "@/engine/buffs/wild";
import { FUNNY_CARDS } from "@/engine/buffs/funny";
import { PT_CARDS } from "@/engine/buffs/pt";
import { PERSONAL_CARDS, NEWJEANS_CARDS } from "@/engine/buffs/personal";
import { CREATOR_CARDS } from "@/engine/buffs/creators";
import { WILD_NERFS } from "@/engine/nerfs/wild";
import type { Buff } from "@/engine/buff";
import type { Nerf } from "@/engine/nerf";
import type { BuffCollection, NerfCollection } from "./cardCollectionDefs";

export * from "./cardCollectionDefs";


const FANTASY = new Set(FANTASY_CARDS.map((c) => c.id));
const MYSTIC = new Set(MYSTIC_CARDS.map((c) => c.id));
const WILD = new Set(WILD_CARDS.map((c) => c.id));
const FUNNY = new Set([...FUNNY_CARDS, ...PT_CARDS].map((c) => c.id));
const PERSONAL = new Set(PERSONAL_CARDS.map((c) => c.id));
const NEWJEANS = new Set(NEWJEANS_CARDS.map((c) => c.id));
const CREATORS = new Set(CREATOR_CARDS.map((c) => c.id));
const WILD_N = new Set(WILD_NERFS.map((c) => c.id));

/** Which collection a buff (including hexes, boons, items) belongs to. The
 * exotic barrels win first; the rest fall back to Item / Hex by category, then
 * Core for the original tiered set. */
export function buffCollection(b: Pick<Buff, "id" | "category">): BuffCollection {
  if (CREATORS.has(b.id)) return "Creators";
  if (NEWJEANS.has(b.id)) return "NewJeans";
  if (PERSONAL.has(b.id)) return "Personal";
  if (FANTASY.has(b.id)) return "Fantasy";
  if (MYSTIC.has(b.id)) return "Mystic";
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
