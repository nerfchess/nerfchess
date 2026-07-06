import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import {
  isValidTierOverride,
  listCardOverrides,
  type CardOverride,
} from "@/lib/server/cardOverrides";
import { ALL_BUFFS } from "@/engine/buffs/library";
import { ALL_NERFS } from "@/engine/nerfs/library";

export const dynamic = "force-dynamic";

// The public card catalog: every code-defined buff and nerf card, merged with
// any moderator overrides (card_overrides). No auth; short shared cache so
// codex/game surfaces can hydrate cheaply. `overridden` marks cards whose
// displayed metadata differs from the code definition, so clients that
// already ship the code library only need to patch those.
interface PublicCard {
  id: string;
  kind: "buff" | "nerf";
  name: string;
  description: string;
  flavor: string | null;
  tier: number;
  enabled: boolean;
  implemented: boolean;
  category?: string;
  overridden: boolean;
}

function mergeCard(
  kind: "buff" | "nerf",
  def: { id: string; name: string; description: string; flavor?: string; tier: number; implemented: boolean; category?: string },
  override: CardOverride | undefined,
): PublicCard {
  const tier = override && isValidTierOverride(override.tier) ? override.tier : def.tier;
  const overridden =
    !!override &&
    (override.name != null ||
      override.description != null ||
      override.flavor != null ||
      tier !== def.tier ||
      override.enabled === 0);
  return {
    id: def.id,
    kind,
    name: override?.name ?? def.name,
    description: override?.description ?? def.description,
    flavor: override?.flavor ?? def.flavor ?? null,
    tier,
    enabled: override ? override.enabled !== 0 : true,
    implemented: def.implemented,
    ...(def.category ? { category: def.category } : {}),
    overridden,
  };
}

export async function GET() {
  // Overrides are optional dressing: if the read fails the catalog still
  // serves the code definitions.
  let overrides: CardOverride[] = [];
  try {
    overrides = await listCardOverrides(await getDb());
  } catch {}
  const byKey = new Map(overrides.map((o) => [`${o.kind}:${o.id}`, o]));
  const cards: PublicCard[] = [
    ...ALL_NERFS.map((d) => mergeCard("nerf", d, byKey.get(`nerf:${d.id}`))),
    ...ALL_BUFFS.map((b) => mergeCard("buff", b, byKey.get(`buff:${b.id}`))),
  ];
  return NextResponse.json(
    { cards },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
