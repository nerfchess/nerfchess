import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/social";

export const dynamic = "force-dynamic";

// Conversation list: the latest message per correspondent plus how many of
// their messages are still unread.
export async function GET(request: Request) {
  const guard = await requireUser(request);
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;

  // One row per correspondent: the newest message in that thread over ALL of
  // the caller's messages. A global newest-N window would drop any thread
  // whose last message fell outside it (an old unread from C behind a long
  // A-B exchange), and undercount its unread.
  const [latest, unreadRows] = await Promise.all([
    db
      .prepare(
        `SELECT m.from_user_id, m.to_user_id, m.text, m.created_at, t.peer_id
         FROM (
           SELECT CASE WHEN from_user_id = ?1 THEN to_user_id ELSE from_user_id END AS peer_id,
                  MAX(created_at) AS last_at
           FROM messages
           WHERE from_user_id = ?1 OR to_user_id = ?1
           GROUP BY peer_id
         ) t
         JOIN messages m
           ON m.created_at = t.last_at
          AND (m.from_user_id = ?1 OR m.to_user_id = ?1)
          AND CASE WHEN m.from_user_id = ?1 THEN m.to_user_id ELSE m.from_user_id END = t.peer_id
         ORDER BY m.created_at DESC
         LIMIT 200`,
      )
      .bind(user.id)
      .all<{ from_user_id: string; to_user_id: string; text: string; created_at: number; peer_id: string }>(),
    db
      .prepare(
        `SELECT from_user_id AS peer_id, COUNT(*) AS unread
         FROM messages WHERE to_user_id = ?1 AND read = 0
         GROUP BY from_user_id`,
      )
      .bind(user.id)
      .all<{ peer_id: string; unread: number }>(),
  ]);
  const unreadByPeer = new Map(unreadRows.results.map((r) => [r.peer_id, Number(r.unread)]));

  const byPeer = new Map<string, { peerId: string; lastText: string; lastAt: number; fromMe: boolean; unread: number }>();
  for (const row of latest.results) {
    // Two messages in one thread can share a timestamp; keep the first (newest
    // ordering ties are arbitrary but stable enough for a preview line).
    if (byPeer.has(row.peer_id)) continue;
    byPeer.set(row.peer_id, {
      peerId: row.peer_id,
      lastText: row.text,
      lastAt: row.created_at,
      fromMe: row.from_user_id === user.id,
      unread: unreadByPeer.get(row.peer_id) ?? 0,
    });
  }

  const peers = [...byPeer.values()];
  const names = new Map<string, { username: string; avatar: string | null }>();
  if (peers.length > 0) {
    const placeholders = peers.map(() => "?").join(",");
    const users = await db
      .prepare(`SELECT id, username, avatar FROM users WHERE id IN (${placeholders})`)
      .bind(...peers.map((p) => p.peerId))
      .all<{ id: string; username: string; avatar: string | null }>();
    for (const u of users.results) names.set(u.id, { username: u.username, avatar: u.avatar });
  }

  return NextResponse.json({
    conversations: peers
      .filter((p) => names.has(p.peerId))
      .map((p) => ({
        username: names.get(p.peerId)!.username,
        avatar: names.get(p.peerId)!.avatar,
        lastText: p.lastText,
        lastAt: p.lastAt,
        fromMe: p.fromMe,
        unread: p.unread,
      })),
  });
}
