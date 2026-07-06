import { NextResponse } from "next/server";
import { requireMod } from "@/lib/server/mod";
import {
  deleteCardOverride,
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
  let body: {
    id?: unknown;
    kind?: unknown;
    name?: unknown;
    description?: unknown;
    flavor?: unknown;
    tier?: unknown;
    enabled?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

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

  if (name === null && description === null && flavor === null && tier === null && enabled) {
    // Nothing overrides the code definition: drop the row instead of keeping
    // a no-op record around.
    await deleteCardOverride(guard.db, id);
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
  return NextResponse.json({ ok: true });
}

// DELETE ?id=<card id>: remove the override, resetting the card to code.
export async function DELETE(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "`id` is required." }, { status: 400 });
  }
  await deleteCardOverride(guard.db, id);
  return NextResponse.json({ ok: true });
}
