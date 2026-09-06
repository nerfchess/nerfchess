import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/social";

export const dynamic = "force-dynamic";

// Recent notifications for the bell, newest first, plus the unread count.
export async function GET(request: Request) {
  const guard = await requireUser(request);
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;

  // LEFT JOIN the actor so the actor's CURRENT username wins over the name that
  // was frozen into `actor_name` / `text` when the notification was sent. A
  // friend (or house bot) who renamed after sending a request must show their
  // new name here, not the stale one. Rows with no actor_user_id (legacy /
  // actorless moderation notices) fall back to the stored text unchanged.
  const rows = await db
    .prepare(
      `SELECT n.id, n.type, n.actor_name, n.text, n.href, n.created_at, n.read,
              u.username AS live_actor_name
       FROM notifications n
       LEFT JOIN users u ON u.id = n.actor_user_id
       WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 30`,
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
      live_actor_name: string | null;
    }>();
  const unread = await db
    .prepare(`SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0`)
    .bind(user.id)
    .first<{ n: number }>();

  return NextResponse.json({
    notifications: rows.results.map((n) => {
      const actorName = n.live_actor_name ?? n.actor_name;
      // Notification text embeds the actor name verbatim at send time. When the
      // live name has since changed, swap the old snapshot for the current one
      // so the bell reads correctly. Only substitutes when we have both a stored
      // snapshot and a live name that actually differs, so nothing else is touched.
      // Only the leading occurrence: the name opens the sentence, and a short
      // name can also be a substring of the copy ("sen" in "sent").
      const text =
        n.live_actor_name && n.actor_name && n.live_actor_name !== n.actor_name && n.text.startsWith(n.actor_name)
          ? n.live_actor_name + n.text.slice(n.actor_name.length)
          : n.text;
      return {
        id: n.id,
        type: n.type,
        actorName,
        text,
        href: n.href,
        at: n.created_at,
        read: !!n.read,
      };
    }),
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
