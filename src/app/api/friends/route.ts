import { NextResponse } from "next/server";
import { requireUser, createNotification } from "@/lib/server/social";

export const dynamic = "force-dynamic";

// Friendships are stored as ONE canonical row per pair (user_lo < user_hi by
// id). These helpers order a pair and read the "other" side.
function pair(a: string, b: string): { lo: string; hi: string } {
  return a < b ? { lo: a, hi: b } : { lo: b, hi: a };
}

interface FriendRow {
  id: string;
  username: string;
  rating: number | null;
  avatar: string | null;
  status: "pending" | "accepted";
  // For pending rows: did I send it (outgoing) or receive it (incoming)?
  direction: "incoming" | "outgoing" | null;
  since: number;
}

// GET: the caller's accepted friends plus incoming / outgoing pending requests,
// each with the other user's public card (name, rating, avatar).
export async function GET(request: Request) {
  const guard = await requireUser(request);
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;

  const rows = await db
    .prepare(
      `SELECT f.user_lo, f.user_hi, f.requested_by, f.status, f.created_at,
              u.id AS other_id, u.username AS other_name, u.avatar AS other_avatar,
              COALESCE(
                (SELECT MAX(r.rating) FROM user_ratings r
                  WHERE r.user_id = u.id AND r.category IN ('nerf','buff')),
                u.rating
              ) AS other_rating
       FROM friendships f
       JOIN users u ON u.id = CASE WHEN f.user_lo = ? THEN f.user_hi ELSE f.user_lo END
       WHERE f.user_lo = ? OR f.user_hi = ?
       ORDER BY f.status DESC, f.created_at DESC`,
    )
    .bind(user.id, user.id, user.id)
    .all<{
      requested_by: string;
      status: "pending" | "accepted";
      created_at: number;
      other_id: string;
      other_name: string;
      other_avatar: string | null;
      other_rating: number | null;
    }>();

  const friends: FriendRow[] = [];
  const incoming: FriendRow[] = [];
  const outgoing: FriendRow[] = [];
  for (const r of rows.results) {
    const entry: FriendRow = {
      id: r.other_id,
      username: r.other_name,
      rating: r.other_rating != null ? Math.round(r.other_rating) : null,
      avatar: r.other_avatar,
      status: r.status,
      direction: r.status === "pending" ? (r.requested_by === user.id ? "outgoing" : "incoming") : null,
      since: r.created_at,
    };
    if (r.status === "accepted") friends.push(entry);
    else if (entry.direction === "incoming") incoming.push(entry);
    else outgoing.push(entry);
  }

  return NextResponse.json({ friends, incoming, outgoing });
}

// POST { action, username }:
//   request — send a friend request (or auto-accept if they already asked you)
//   accept  — accept a pending incoming request
//   decline — decline an incoming request / cancel an outgoing one / unfriend
export async function POST(request: Request) {
  const guard = await requireUser(request);
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;

  let body: { action?: unknown; username?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const action = typeof body.action === "string" ? body.action : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  if (!username) return NextResponse.json({ error: "A username is required." }, { status: 400 });

  const target = await db
    .prepare(`SELECT id, username FROM users WHERE username_lower = ?`)
    .bind(username.toLowerCase())
    .first<{ id: string; username: string }>();
  if (!target) return NextResponse.json({ error: "No player with that name." }, { status: 404 });
  if (target.id === user.id) {
    return NextResponse.json({ error: "You cannot friend yourself." }, { status: 400 });
  }

  const { lo, hi } = pair(user.id, target.id);
  const existing = await db
    .prepare(`SELECT requested_by, status FROM friendships WHERE user_lo = ? AND user_hi = ?`)
    .bind(lo, hi)
    .first<{ requested_by: string; status: string }>();

  if (action === "request") {
    if (existing?.status === "accepted") {
      return NextResponse.json({ ok: true, status: "accepted" });
    }
    // They already asked you → accept instead of stacking a reverse request.
    if (existing?.status === "pending" && existing.requested_by === target.id) {
      await db
        .prepare(`UPDATE friendships SET status = 'accepted' WHERE user_lo = ? AND user_hi = ?`)
        .bind(lo, hi)
        .run();
      await notifyFriend(db, target.id, user.username, "accepted your friend request");
      return NextResponse.json({ ok: true, status: "accepted" });
    }
    if (existing?.status === "pending") {
      return NextResponse.json({ ok: true, status: "pending" }); // already sent
    }
    await db
      .prepare(
        `INSERT INTO friendships (user_lo, user_hi, requested_by, status, created_at)
         VALUES (?, ?, ?, 'pending', ?)`,
      )
      .bind(lo, hi, user.id, Date.now())
      .run();
    await notifyFriend(db, target.id, user.username, "sent you a friend request");
    return NextResponse.json({ ok: true, status: "pending" });
  }

  if (action === "accept") {
    // Only the RECIPIENT of a pending request can accept it.
    if (existing?.status === "pending" && existing.requested_by === target.id) {
      await db
        .prepare(`UPDATE friendships SET status = 'accepted' WHERE user_lo = ? AND user_hi = ?`)
        .bind(lo, hi)
        .run();
      await notifyFriend(db, target.id, user.username, "accepted your friend request");
      return NextResponse.json({ ok: true, status: "accepted" });
    }
    return NextResponse.json({ error: "No request to accept." }, { status: 404 });
  }

  if (action === "decline" || action === "remove") {
    // Covers declining an incoming request, cancelling an outgoing one, and
    // unfriending — all just drop the single row.
    await db
      .prepare(`DELETE FROM friendships WHERE user_lo = ? AND user_hi = ?`)
      .bind(lo, hi)
      .run();
    return NextResponse.json({ ok: true, status: "none" });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

async function notifyFriend(
  db: Parameters<typeof createNotification>[0],
  toUserId: string,
  actor: string,
  text: string,
): Promise<void> {
  try {
    await createNotification(db, {
      userId: toUserId,
      type: "message",
      actorName: actor,
      text: `${actor} ${text}`,
      href: "/friend",
    });
  } catch {
    // A missed notification must never fail the friendship write.
  }
}
