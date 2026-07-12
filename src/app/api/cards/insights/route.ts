import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { getInsightsBlob, type CardStats } from "@/lib/server/cardInsights";
import {
  getCardOverride,
  isCardKind,
  isValidTierOverride,
  listCardOverrideEvents,
  type CardOverrideEvent,
} from "@/lib/server/cardOverrides";
import { BUFF_BY_ID, NERF_BY_ID } from "@/lib/cardCodex";

export const dynamic = "force-dynamic";

// Per-card gameplay insights for the codex detail pages: aggregate stats
// sliced from the cached rollup (see lib/server/cardInsights.ts), the card's
// current override-aware state, and its public moderator-change events. Only
// aggregates and public metadata: no draft_record contents, no draftSeed, no
// per-game rows, no moderator identity.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const id = url.searchParams.get("id") ?? "";
  if (!isCardKind(kind)) {
    return NextResponse.json({ error: "bad kind" }, { status: 400 });
  }
  const def = kind === "nerf" ? NERF_BY_ID[id] : BUFF_BY_ID[id];
  if (!def) {
    return NextResponse.json({ error: "unknown card" }, { status: 404 });
  }

  const db = await getDb();
  const blob = await getInsightsBlob(db);
  const stats: CardStats | null = blob?.cards[`${kind}:${id}`] ?? null;

  // Current override-aware state, so the panel can flag "currently disabled"
  // or a runtime tier move without the static page going stale.
  let override = null;
  try {
    override = await getCardOverride(db, id);
  } catch {}
  if (override && override.kind !== kind) override = null;
  const effective = {
    tier: override && isValidTierOverride(override.tier) ? override.tier : def.tier,
    enabled: override ? override.enabled !== 0 : true,
    renamed: override?.name != null,
  };

  let events: CardOverrideEvent[] = [];
  try {
    events = await listCardOverrideEvents(db, kind, id);
  } catch {}
  // Overrides that predate the audit table left only updated_at behind; a
  // synthetic event keeps those cards' timelines from reading as untouched.
  if (events.length === 0 && override?.updated_at) {
    events = [{ field: "adjusted", old_value: null, new_value: null, at: override.updated_at }];
  }

  return NextResponse.json(
    { id, kind, effective, stats, events, computedAt: blob?.computedAt ?? null },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } },
  );
}
