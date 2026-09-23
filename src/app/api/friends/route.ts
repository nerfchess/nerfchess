import { NextResponse } from "next/server";
import {
  requireUser,
  createNotification,
  hasPendingNotification,
  mutedRefusal,
  FRIEND_HREF,
} from "@/lib/server/social";
import { apiError, guardJsonWrite, PRIVATE_NO_STORE, rateLimit, tooManyRequests, usernameParam } from "@/lib/server/request";

export const dynamic = "force-dynamic";

// Friend requests ring another player's bell, so sending them is metered:
// at most this many "request" actions per sender per hour (F058). Accepting,
// declining and unfriending are not limited.
const REQUEST_WINDOW_MS = 60 * 60 * 1000;
const REQUEST_WINDOW_MAX = 20;

const ACTIONS = new Set(["request", "accept", "decline", "remove"]);

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

  return NextResponse.json({ friends, incoming, outgoing }, { headers: { "Cache-Control": PRIVATE_NO_STORE } });
}

// POST { action, username }:
//   request: send a friend request (or auto-accept if they already asked you)
//   accept:  accept a pending incoming request
//   decline: decline an incoming request / cancel an outgoing one / unfriend
export async function POST(request: Request) {
  const body = await guardJsonWrite(request);
  if (body instanceof NextResponse) return body;
  const guard = await requireUser(request);
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;

  const action = typeof body.action === "string" && ACTIONS.has(body.action) ? body.action : "";
  if (!action) return apiError(400, "Unknown action.");
  const username = typeof body.username === "string" ? usernameParam(body.username) : null;
  if (!username) return apiError(400, "A username is required.");

  if (action === "request") {
    // A muted player cannot reach another player's bell (same rule as DMs).
    const muted = mutedRefusal(user, "send friend requests");
    if (muted) return muted;
    const limit = await rateLimit(db, `friendreq:${user.id}`, REQUEST_WINDOW_MAX, REQUEST_WINDOW_MS);
    if (!limit.ok) return tooManyRequests("Too many friend requests. Try again later.", limit.retryAfterSec);
  }

  const target = await db
    .prepare(`SELECT id, username FROM users WHERE username_lower = ?`)
    .bind(username)
    .first<{ id: string; username: string }>();
  if (!target) return apiError(404, "No player with that name.");
  if (target.id === user.id) return apiError(400, "You cannot friend yourself.");

  const { lo, hi } = pair(user.id, target.id);
  const existing = await db
    .prepare(`SELECT requested_by, status FROM friendships WHERE user_lo = ? AND user_hi = ?`)
    .bind(lo, hi)
    .first<{ requested_by: string; status: string }>();

  if (action === "request") {
    if (existing?.status === "accepted") {
      return NextResponse.json({ ok: true, status: "accepted" });
    }
    // They already asked you: accept instead of stacking a reverse request.
    if (existing?.status === "pending" && existing.requested_by === target.id) {
      await db
        .prepare(`UPDATE friendships SET status = 'accepted' WHERE user_lo = ? AND user_hi = ?`)
        .bind(lo, hi)
        .run();
      await notifyFriend(db, target.id, user, "accepted your friend request");
      return NextResponse.json({ ok: true, status: "accepted" });
    }
    if (existing?.status === "pending") {
      return NextResponse.json({ ok: true, status: "pending" }); // already sent
    }
    // ON CONFLICT: two concurrent requests for the same pair used to race the
    // read above and the second INSERT failed on the primary key with a 500.
    const inserted = await db
      .prepare(
        `INSERT INTO friendships (user_lo, user_hi, requested_by, status, created_at)
         VALUES (?, ?, ?, 'pending', ?)
         ON CONFLICT(user_lo, user_hi) DO NOTHING`,
      )
      .bind(lo, hi, user.id, Date.now())
      .run();
    if ((inserted.meta.changes ?? 0) > 0) {
      await notifyFriend(db, target.id, user, "sent you a friend request");
    }
    return NextResponse.json({ ok: true, status: "pending" });
  }

  if (action === "accept") {
    // Only the RECIPIENT of a pending request can accept it.
    if (existing?.status === "pending" && existing.requested_by === target.id) {
      await db
        .prepare(`UPDATE friendships SET status = 'accepted' WHERE user_lo = ? AND user_hi = ?`)
        .bind(lo, hi)
        .run();
      await notifyFriend(db, target.id, user, "accepted your friend request");
      return NextResponse.json({ ok: true, status: "accepted" });
    }
    return apiError(404, "No request to accept.");
  }

  // decline / remove: covers declining an incoming request, cancelling an
  // outgoing one, and unfriending; all just drop the single row.
  await db
    .prepare(`DELETE FROM friendships WHERE user_lo = ? AND user_hi = ?`)
    .bind(lo, hi)
    .run();
  return NextResponse.json({ ok: true, status: "none" });
}

async function notifyFriend(
  db: D1Database,
  toUserId: string,
  actor: { id: string; username: string },
  text: string,
): Promise<void> {
  try {
    // One unread friend entry per actor: a request, cancel, request loop used
    // to ring the bell every time (F058).
    if (await hasPendingNotification(db, toUserId, actor, "message", FRIEND_HREF)) return;
    await createNotification(db, {
      userId: toUserId,
      type: "message",
      actorName: actor.username,
      actorId: actor.id,
      text: `${actor.username} ${text}`,
      href: FRIEND_HREF,
    });
  } catch {
    // A missed notification must never fail the friendship write.
  }
}
