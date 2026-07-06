/// <reference types="@cloudflare/workers-types" />

// Buff/nerf card metadata overrides (the card_overrides table): the owner can
// rename a card, rewrite its description or flavor, move its tier, or disable
// it without a code deploy. At most one row per card id; a NULL column means
// "no override, use the code value". Card LOGIC always stays in code.
//
// Readers: GET /api/cards (public merged catalog), /api/mod/cards (editor),
// and the game-server Durable Object (cached snapshot applied at offer-roll
// time). The table is tiny (at most one row per card, a few hundred cards),
// so listCardOverrides is one bounded full SELECT that callers cache.

import type { D1Database } from "@cloudflare/workers-types";

export type CardKind = "buff" | "nerf";

export interface CardOverride {
  id: string;
  kind: CardKind;
  name: string | null;
  description: string | null;
  flavor: string | null;
  tier: number | null;
  enabled: number;
  updated_at: number | null;
}

export function isCardKind(value: unknown): value is CardKind {
  return value === "buff" || value === "nerf";
}

// Tiers run 1 (trivial) to 8 (unhinged); see src/engine/nerf.ts.
export function isValidTierOverride(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 8;
}

/** Every override row. One bounded SELECT: the table holds at most one row
 * per card, so a full read stays small; cache the result where it is hot. */
export async function listCardOverrides(db: D1Database): Promise<CardOverride[]> {
  const { results } = await db
    .prepare(
      `SELECT id, kind, name, description, flavor, tier, enabled, updated_at
       FROM card_overrides`,
    )
    .all<CardOverride>();
  return results ?? [];
}

/** Write (or rewrite) the override row for one card. Callers validate the id
 * against the code libraries and the tier via isValidTierOverride first. */
export async function upsertCardOverride(
  db: D1Database,
  override: {
    id: string;
    kind: CardKind;
    name: string | null;
    description: string | null;
    flavor: string | null;
    tier: number | null;
    enabled: boolean;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO card_overrides (id, kind, name, description, flavor, tier, enabled, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         kind = excluded.kind,
         name = excluded.name,
         description = excluded.description,
         flavor = excluded.flavor,
         tier = excluded.tier,
         enabled = excluded.enabled,
         updated_at = excluded.updated_at`,
    )
    .bind(
      override.id,
      override.kind,
      override.name,
      override.description,
      override.flavor,
      override.tier,
      override.enabled ? 1 : 0,
      Date.now(),
    )
    .run();
}

/** Remove a card's override row entirely: the card falls back to its code
 * definition (the mod editor's "reset to code"). */
export async function deleteCardOverride(db: D1Database, id: string): Promise<void> {
  await db.prepare("DELETE FROM card_overrides WHERE id = ?").bind(id).run();
}
