import { NextResponse } from "next/server";
import { logModEvent, readModBody, requireMod } from "@/lib/server/mod";
import {
  deleteCardOverride,
  getCardOverride,
  isCardKind,
  isValidTierOverride,
  listCardOverrides,
  upsertCardOverride,
} from "@/lib/server/cardOverrides";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import { getNerf } from "@/engine/nerfs/library";

export const dynamic = "force-dynamic";

// Moderator editor for card metadata overrides (card_overrides). Card logic
// stays in code; these routes only manage the name/description/flavor/tier/
// enabled overlay. The game server picks changes up within ~5 minutes (its
// cached snapshot), /api/cards within ~1 minute.

const NAME_MAX = 80;
const DESCRIPTION_MAX = 600;
const FLAVOR_MAX = 300;

// GET: the raw override rows (moderator only).
export async function GET(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const overrides = await listCardOverrides(guard.db);
  return NextResponse.json({ overrides });
}

// Empty or whitespace-only strings mean "no override" and store as NULL.
function cleanText(value: unknown, max: number): string | null | "bad" {
  if (value == null) return null;
  if (typeof value !== "string") return "bad";
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, max);
}

// POST { id, kind, name?, description?, flavor?, tier?, enabled? }: upsert one
// card's override. Omitted/null/empty fields fall through to the code value.
// An override that ends up all-null with enabled=true is a no-op row and is
// deleted instead of stored.
export async function POST(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const body = await readModBody(request);
  if (body instanceof NextResponse) return body;

  if (!isCardKind(body.kind)) {
    return NextResponse.json({ error: "`kind` must be 'buff' or 'nerf'." }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const def = body.kind === "buff" ? BUFF_BY_ID[id] : getNerf(id);
  if (!def) {
    return NextResponse.json({ error: `Unknown ${body.kind} card id.` }, { status: 400 });
  }

  const name = cleanText(body.name, NAME_MAX);
  const description = cleanText(body.description, DESCRIPTION_MAX);
  const flavor = cleanText(body.flavor, FLAVOR_MAX);
  if (name === "bad" || description === "bad" || flavor === "bad") {
    return NextResponse.json({ error: "Text fields must be strings." }, { status: 400 });
  }
  let tier: number | null = null;
  if (body.tier != null) {
    if (!isValidTierOverride(body.tier)) {
      return NextResponse.json({ error: "`tier` must be an integer from 1 to 8." }, { status: 400 });
    }
    // A tier override equal to the code tier is no override at all.
    tier = body.tier === def.tier ? null : body.tier;
  }
  if (body.enabled !== undefined && typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "`enabled` must be a boolean." }, { status: 400 });
  }
  const enabled = body.enabled !== false;
  // The row this write replaces, kept in the audit log so the edit can be
  // read back and undone by hand.
  const before = await getCardOverride(guard.db, id);
  const target = { targetKind: "card" as const, targetName: `${body.kind}:${id}`, targetRef: `${body.kind}:${id}` };

  if (name === null && description === null && flavor === null && tier === null && enabled) {
    // Nothing overrides the code definition: drop the row instead of keeping
    // a no-op record around.
    await deleteCardOverride(guard.db, id);
    if (before) {
      await logModEvent(guard.db, guard.mod, { action: "card_override_cleared", ...target, before, after: null }, "card_override_cleared");
    }
    return NextResponse.json({ ok: true, cleared: true });
  }

  await upsertCardOverride(guard.db, {
    id,
    kind: body.kind,
    name,
    description,
    flavor,
    tier,
    enabled,
  });
  await logModEvent(
    guard.db,
    guard.mod,
    {
      action: "card_override_saved",
      ...target,
      before,
      after: { name, description, flavor, tier, enabled },
    },
    "card_override_saved",
  );
  return NextResponse.json({ ok: true });
}

// DELETE ?id=<card id>[&kind=buff|nerf]: remove the override, resetting the
// card to code. The id must be a real card (F124: any string used to be
// accepted), and the removed row goes to the audit log so it can be restored.
export async function DELETE(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const params = new URL(request.url).searchParams;
  const id = params.get("id")?.trim().slice(0, 120) ?? "";
  const kindParam = params.get("kind");
  if (!id) {
    return NextResponse.json({ error: "`id` is required." }, { status: 400 });
  }
  if (kindParam != null && !isCardKind(kindParam)) {
    return NextResponse.json({ error: "`kind` must be 'buff' or 'nerf'." }, { status: 400 });
  }
  const known = kindParam === "buff" ? !!BUFF_BY_ID[id] : kindParam === "nerf" ? !!getNerf(id) : !!BUFF_BY_ID[id] || !!getNerf(id);
  if (!known) {
    return NextResponse.json({ error: "Unknown card id." }, { status: 400 });
  }
  const before = await getCardOverride(guard.db, id);
  if (!before) return NextResponse.json({ ok: true, cleared: false });
  await deleteCardOverride(guard.db, id);
  await logModEvent(
    guard.db,
    guard.mod,
    {
      action: "card_override_cleared",
      targetKind: "card",
      targetName: `${before.kind}:${id}`,
      targetRef: `${before.kind}:${id}`,
      before,
      after: null,
    },
    "card_override_cleared",
  );
  return NextResponse.json({ ok: true, cleared: true });
}
