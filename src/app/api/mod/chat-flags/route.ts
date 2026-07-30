import { NextResponse } from "next/server";
import { requireMod } from "@/lib/server/mod";
import { notifyModEvent } from "@/lib/server/modWebhook";

export const dynamic = "force-dynamic";

// GET: chat messages that tripped the profanity filter. Unreviewed by
// default; ?all=1 includes already-reviewed ones.
export async function GET(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;

  const all = new URL(request.url).searchParams.get("all") === "1";
  const rows = await db
    .prepare(
      `SELECT id, match_id, user_id, username, color, text, matched_words, created_at, reviewed
       FROM chat_flags ${all ? "" : "WHERE reviewed = 0"} ORDER BY created_at DESC LIMIT 200`,
    )
    .all();
  return NextResponse.json({ flags: rows.results });
}

// POST { id } or { all: true }: mark flags reviewed.
export async function POST(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;

  let body: { id?: unknown; all?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body.all === true) {
    const cleared = await db.prepare("UPDATE chat_flags SET reviewed = 1 WHERE reviewed = 0").run();
    notifyModEvent({
      kind: "chat_flag_reviewed",
      actor: guard.mod.username,
      target: "all",
      detail: `${cleared.meta.changes ?? 0} flag(s)`,
    });
    return NextResponse.json({ ok: true });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  await db.prepare("UPDATE chat_flags SET reviewed = 1 WHERE id = ?").bind(id).run();
  notifyModEvent({ kind: "chat_flag_reviewed", actor: guard.mod.username, target: id });
  return NextResponse.json({ ok: true });
}
