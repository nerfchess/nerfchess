import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { isModerator, sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

// A player's accepted friends (never pending requests), ordered by rating. The
// list respects friends_visibility: 'public' shows it to anyone, 'private'
// shows it only to the owner and moderators — everyone else gets just the count
// ({ private: true, count }). A signed-in viewer additionally gets `mutual`,
// the accepted friends they share with this player (a mild disclosure that is
// always the viewer's own friends, so it is returned even when the list is
// private).
export async function GET(request: Request, props: { params: Promise<{ username: string }> }) {
  const params = await props.params;
  const username = params.username.trim().toLowerCase();
  const db = await getDb();
  const user = await db
    .prepare(`SELECT id, friends_visibility FROM users WHERE username_lower = ?`)
    .bind(username)
    .first<{ id: string; friends_visibility: string | null }>();
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const viewer = await userForSession(
    db,
    sessionTokenFromCookieHeader(request.headers.get("cookie")),
  );
  const isPrivate = user.friends_visibility === "private";
  const isOwner = !!viewer && viewer.id === user.id;
  const canSeeList = !isPrivate || isOwner || isModerator(viewer);

  // Accepted friends the viewer shares with this player. Always safe to show a
  // signed-in viewer (these are their own friends); empty when signed out.
  let mutual: Array<{ username: string; avatar: string | null }> = [];
  if (viewer && !isOwner) {
    const rows = await db
      .prepare(
        `SELECT u.username, u.avatar FROM users u
         WHERE u.id IN (
                 SELECT CASE WHEN user_lo = ? THEN user_hi ELSE user_lo END
                 FROM friendships
                 WHERE (user_lo = ? OR user_hi = ?) AND status = 'accepted'
               )
           AND u.id IN (
                 SELECT CASE WHEN user_lo = ? THEN user_hi ELSE user_lo END
                 FROM friendships
                 WHERE (user_lo = ? OR user_hi = ?) AND status = 'accepted'
               )
         LIMIT 6`,
      )
      .bind(user.id, user.id, user.id, viewer.id, viewer.id, viewer.id)
      .all<{ username: string; avatar: string | null }>();
    mutual = rows.results;
  }

  const countRow = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM friendships
       WHERE (user_lo = ? OR user_hi = ?) AND status = 'accepted'`,
    )
    .bind(user.id, user.id)
    .first<{ n: number }>();
  const count = countRow?.n ?? 0;

  if (!canSeeList) {
    return NextResponse.json({ private: true, count, mutual });
  }

  // The other side of each accepted friendship, with its public card (name,
  // avatar, best live mode rating), ordered by rating desc.
  const rows = await db
    .prepare(
      `SELECT u.username AS username, u.avatar AS avatar,
              COALESCE(
                (SELECT MAX(r.rating) FROM user_ratings r
                  WHERE r.user_id = u.id AND r.category IN ('nerf','buff')),
                u.rating
              ) AS rating
       FROM friendships f
       JOIN users u ON u.id = CASE WHEN f.user_lo = ? THEN f.user_hi ELSE f.user_lo END
       WHERE (f.user_lo = ? OR f.user_hi = ?) AND f.status = 'accepted'
       ORDER BY rating DESC`,
    )
    .bind(user.id, user.id, user.id)
    .all<{ username: string; avatar: string | null; rating: number | null }>();

  const friends = rows.results.map((r) => ({
    username: r.username,
    avatar: r.avatar,
    rating: r.rating != null ? Math.round(r.rating) : null,
  }));

  return NextResponse.json({ friends, count, mutual });
}
