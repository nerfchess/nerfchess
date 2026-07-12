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

/** The override row for one card, or null when the card has none. */
export async function getCardOverride(db: D1Database, id: string): Promise<CardOverride | null> {
  return await db
    .prepare(
      `SELECT id, kind, name, description, flavor, tier, enabled, updated_at
       FROM card_overrides WHERE id = ?`,
    )
    .bind(id)
    .first<CardOverride>();
}

// One public audit line from card_override_history (see the migration's
// header: append-only, no actor, shown on the card's codex page).
export interface CardOverrideEvent {
  field: string;
  old_value: string | null;
  new_value: string | null;
  at: number;
}

/** The card's moderator-change events, oldest first. */
export async function listCardOverrideEvents(
  db: D1Database,
  kind: CardKind,
  id: string,
  limit = 50,
): Promise<CardOverrideEvent[]> {
  const { results } = await db
    .prepare(
      `SELECT field, old_value, new_value, at FROM card_override_history
       WHERE kind = ? AND card_id = ? ORDER BY at ASC, seq ASC LIMIT ?`,
    )
    .bind(kind, id, limit)
    .all<CardOverrideEvent>();
  return results ?? [];
}

// The audit trail behind the codex "moderator changes" timeline: one row per
// field that actually changed. Best effort by design: the override write is
// the product action, so an audit failure must never fail it.
async function recordOverrideDiff(
  db: D1Database,
  kind: CardKind,
  id: string,
  prev: CardOverride | null,
  next: { name: string | null; description: string | null; flavor: string | null; tier: number | null; enabled: number },
): Promise<void> {
  try {
    // A missing row means "all code defaults": no overrides, enabled.
    const base = prev ?? { name: null, description: null, flavor: null, tier: null, enabled: 1 };
    const asText = (v: string | number | null): string | null => (v === null ? null : String(v));
    const changes: { field: string; old: string | null; nw: string | null }[] = [];
    for (const field of ["name", "description", "flavor", "tier"] as const) {
      if ((base[field] ?? null) !== (next[field] ?? null)) {
        changes.push({ field, old: asText(base[field] ?? null), nw: asText(next[field]) });
      }
    }
    if ((base.enabled !== 0 ? 1 : 0) !== next.enabled) {
      changes.push({ field: "enabled", old: String(base.enabled !== 0 ? 1 : 0), nw: String(next.enabled) });
    }
    if (changes.length === 0) return;
    const at = Date.now();
    const stmt = db.prepare(
      `INSERT INTO card_override_history (card_id, kind, field, old_value, new_value, at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    await db.batch(changes.map((c) => stmt.bind(id, kind, c.field, c.old, c.nw, at)));
  } catch (err) {
    console.error("card override audit write failed", err);
  }
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
  // Read-before-write so the audit trail records what actually changed.
  let prev: CardOverride | null = null;
  try {
    prev = await getCardOverride(db, override.id);
  } catch {}
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
  await recordOverrideDiff(db, override.kind, override.id, prev, {
    name: override.name,
    description: override.description,
    flavor: override.flavor,
    tier: override.tier,
    enabled: override.enabled ? 1 : 0,
  });
}

/** Remove a card's override row entirely: the card falls back to its code
 * definition (the mod editor's "reset to code"). */
export async function deleteCardOverride(db: D1Database, id: string): Promise<void> {
  let prev: CardOverride | null = null;
  try {
    prev = await getCardOverride(db, id);
  } catch {}
  await db.prepare("DELETE FROM card_overrides WHERE id = ?").bind(id).run();
  if (prev) {
    try {
      await db
        .prepare(
          `INSERT INTO card_override_history (card_id, kind, field, old_value, new_value, at)
           VALUES (?, ?, 'reset', NULL, NULL, ?)`,
        )
        .bind(id, prev.kind, Date.now())
        .run();
    } catch (err) {
      console.error("card override audit write failed", err);
    }
  }
}
