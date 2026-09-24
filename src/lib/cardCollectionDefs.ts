// The library-free half of the card collections: the collection ids, the
// labels and hints the codex filter shows, and the URL-valid id list. Client
// components import these without pulling the card barrels into their chunk;
// the membership lookups (buffCollection, nerfCollection) stay in
// cardCollections.ts, which re-exports everything here.

export type BuffCollection =
  | "Creators"
  | "Core"
  | "Hex"
  | "Funny"
  | "Fantasy"
  | "Mystic"
  | "Wild"
  | "Item"
  | "Personal"
  | "NewJeans";
export type NerfCollection = "Core" | "Wild";

// The collections offered by the codex "Collection" filter, per library. Each
// carries a short hint so the dropdown explains what the set is.
export const BUFF_COLLECTIONS: { id: BuffCollection; label: string; hint: string }[] = [
  { id: "Core", label: "Core", hint: "The original tiered set" },
  { id: "Funny", label: "Funny / meta", hint: "Gags and meta plays, like Computer Virus" },
  { id: "Fantasy", label: "Fantasy", hint: "Mystical, fantasy-themed cards" },
  { id: "Mystic", label: "Mystic", hint: "Prophecy, star signs, tarot, and spirit cards" },
  { id: "Wild", label: "Wild", hint: "Elemental, warfare, arcane, and chaos cards" },
  { id: "Hex", label: "Hexes", hint: "Curses cast on the opponent" },
  { id: "Item", label: "Items", hint: "One-use consumables" },
  { id: "Personal", label: "Personal", hint: "Gym feats, focus, and affection cards" },
  { id: "NewJeans", label: "NewJeans", hint: "The NewJeans K-pop set" },
  { id: "Creators", label: "Creators", hint: "One signature rule per chess creator" },
];
export const NERF_COLLECTIONS: { id: NerfCollection; label: string; hint: string }[] = [
  { id: "Core", label: "Core", hint: "The base handicaps" },
  { id: "Wild", label: "Wild", hint: "The wild expansion nerfs" },
];

/** Every collection id that can appear in a URL, for validation on parse. */
export const COLLECTION_IDS: string[] = ["Core", "Funny", "Fantasy", "Mystic", "Wild", "Hex", "Item", "Personal", "NewJeans", "Creators"];
