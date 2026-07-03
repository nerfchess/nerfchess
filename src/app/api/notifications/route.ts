import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/social";

export const dynamic = "force-dynamic";

// Recent notifications for the bell, newest first, plus the unread count.
export async function GET(request: Request) {
  const guard = await requireUser(request);
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;

  const rows = await db
    .prepare(
      `SELECT id, type, actor_name, text, href, created_at, read
       FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`,
    )
    .bind(user.id)
    .all<{
      id: string;
      type: string;
      actor_name: string | null;
      text: string;
      href: string | null;
      created_at: number;
      read: number;
    }>();
  const unread = await db
    .prepare(`SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0`)
    .bind(user.id)
    .first<{ n: number }>();

  return NextResponse.json({
    notifications: rows.results.map((n) => ({
      id: n.id,
      type: n.type,
      actorName: n.actor_name,
      text: n.text,
      href: n.href,
      at: n.created_at,
      read: !!n.read,
    })),
    unread: unread?.n ?? 0,
  });
}

// Mark notifications read: { ids: string[] } for specific ones, {} for all.
export async function POST(request: Request) {
  const guard = await requireUser(request);
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;

  let body: { ids?: unknown } = {};
  try {
    body = await request.json();
  } catch {}

  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string").slice(0, 100) : null;
  if (ids && ids.length > 0) {
    const placeholders = ids.map(() => "?").join(",");
    await db
      .prepare(`UPDATE notifications SET read = 1 WHERE user_id = ? AND id IN (${placeholders})`)
      .bind(user.id, ...ids)
      .run();
  } else {
    await db.prepare(`UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0`).bind(user.id).run();
  }
  return NextResponse.json({ ok: true });
}
