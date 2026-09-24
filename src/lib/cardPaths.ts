// Codex URLs and the display family of a card, with no card library behind
// them. cardCodex.ts re-exports these; client components (the codex browser
// rows, the puzzle runner) import them from here so the full buff and nerf
// libraries stay out of their chunks.

import { isBoon, type Buff } from "@/engine/buff";

/** The display family a card belongs to, matching the codex's tabs. */
export type CardType = "Buff" | "Hex" | "Boon" | "Item" | "Nerf";

export function buffPath(id: string): string {
  return `/codex/buff/${id}`;
}
export function nerfPath(id: string): string {
  return `/codex/nerf/${id}`;
}

/** Canonical codex path for a buff-library card: hexes and boons live in
 * their own URL namespaces (/codex/hex, /codex/boon) matching the codex's
 * tabs; plain buffs and items stay at /codex/buff. The old buff path keeps
 * rendering for every id (never 404 an indexed URL) with its canonical
 * pointing here. */
export function cardPath(b: Buff): string {
  const type = buffType(b);
  if (type === "Hex") return `/codex/hex/${b.id}`;
  if (type === "Boon") return `/codex/boon/${b.id}`;
  return buffPath(b.id);
}

/** Which family a buff reads as, following the codex's four tabs plus items.
 * Hex and (nerf-relief / boon) win over the plain "Buff" label. */
export function buffType(b: Buff): CardType {
  if (b.category === "hex") return "Hex";
  if (b.category === "item") return "Item";
  if (isBoon(b)) return "Boon";
  return "Buff";
}
