import { NextResponse } from "next/server";
import { logModEvent, readModBody, requireMod } from "@/lib/server/mod";

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

// POST { id } or { ids: [...] }: mark flags reviewed. The bulk form takes the
// ids the moderator was shown (F122); the old { all: true } cleared every
// unreviewed flag, including ones past the 200-row list the moderator never
// saw, and is refused. One audit row per request, with the count.
const MAX_BULK = 200;

export async function POST(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const { db, mod } = guard;
  const body = await readModBody(request);
  if (body instanceof NextResponse) return body;

  let ids: string[] = [];
  if (Array.isArray(body.ids)) {
    ids = [...new Set(body.ids.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length <= 80))];
    if (ids.length === 0 || ids.length > MAX_BULK) {
      return NextResponse.json({ error: `ids must list 1 to ${MAX_BULK} flag ids.` }, { status: 400 });
    }
  } else if (typeof body.id === "string" && body.id) {
    ids = [body.id.slice(0, 80)];
  } else {
    return NextResponse.json({ error: "Send the flag id, or the ids of the flags shown." }, { status: 400 });
  }

  const placeholders = ids.map(() => "?").join(",");
  const rows = await db
    .prepare(`SELECT id, username, user_id FROM chat_flags WHERE reviewed = 0 AND id IN (${placeholders})`)
    .bind(...ids)
    .all<{ id: string; username: string; user_id: string | null }>();
  const found = rows.results;
  if (found.length) {
    await db
      .prepare(`UPDATE chat_flags SET reviewed = 1 WHERE reviewed = 0 AND id IN (${found.map(() => "?").join(",")})`)
      .bind(...found.map((f) => f.id))
      .run();
    const authors = [...new Set(found.map((f) => f.username))];
    await logModEvent(
      db,
      mod,
      {
        action: "chat_flag_reviewed",
        targetKind: "chat_flag",
        targetUserId: found.length === 1 ? found[0].user_id : null,
        targetName: authors.length === 1 ? authors[0] : `${authors.length} players`,
        targetRef: found.length === 1 ? found[0].id : null,
        after: { reviewed: found.length, ids: found.map((f) => f.id).slice(0, 50) },
      },
      "chat_flag_reviewed",
    );
  }
  return NextResponse.json({ ok: true, reviewed: found.length });
}
