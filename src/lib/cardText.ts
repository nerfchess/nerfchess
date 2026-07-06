// Client-side card text overrides: a tiny hydratable overlay of moderator
// card edits (name, description, flavor, tier) fetched once per page load
// from GET /api/cards. Code definitions are always the fallback: before the
// fetch lands (or if it fails) every card shows its code text, so surfaces
// that never hydrate keep working unchanged. Card LOGIC never comes from
// here; this is presentation metadata only.

import type { Tier } from "@/engine/nerf";

// Mirrors CardKind in src/lib/server/cardOverrides.ts (kept local so this
// client module never references server code).
export type CardKind = "buff" | "nerf";

export type CardTextOverride = {
  name?: string;
  description?: string;
  flavor?: string;
  tier?: Tier;
};

// Keyed "kind:id" because the buff and nerf libraries are separate id spaces.
const overrides = new Map<string, CardTextOverride>();
let hydration: Promise<boolean> | null = null;

function isTier(value: unknown): value is Tier {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 8;
}

/** Fetch the merged catalog once and keep only the overridden cards. Returns
 * true when at least one override landed (so callers know to re-render);
 * false on an empty overlay or any fetch failure. Safe to call repeatedly:
 * every caller shares the single in-flight fetch. */
export function hydrateCardText(): Promise<boolean> {
  if (!hydration) {
    hydration = fetch("/api/cards")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const cards = (data as { cards?: unknown } | null)?.cards;
        if (!Array.isArray(cards)) return false;
        for (const card of cards as Array<Record<string, unknown>>) {
          if (!card || card.overridden !== true) continue;
          if (typeof card.id !== "string" || (card.kind !== "buff" && card.kind !== "nerf")) continue;
          overrides.set(`${card.kind}:${card.id}`, {
            ...(typeof card.name === "string" ? { name: card.name } : {}),
            ...(typeof card.description === "string" ? { description: card.description } : {}),
            ...(typeof card.flavor === "string" ? { flavor: card.flavor } : {}),
            ...(isTier(card.tier) ? { tier: card.tier } : {}),
          });
        }
        return overrides.size > 0;
      })
      .catch(() => false);
  }
  return hydration;
}

/** The card definition with any hydrated text overrides applied: a merged
 * copy when an override exists, the definition itself otherwise. */
export function cardText<
  T extends { id: string; name: string; description: string; flavor?: string; tier: Tier },
>(kind: CardKind, def: T): T {
  const o = overrides.get(`${kind}:${def.id}`);
  if (!o) return def;
  return {
    ...def,
    ...(o.name ? { name: o.name } : {}),
    ...(o.description ? { description: o.description } : {}),
    ...(o.flavor ? { flavor: o.flavor } : {}),
    ...(o.tier ? { tier: o.tier } : {}),
  };
}
