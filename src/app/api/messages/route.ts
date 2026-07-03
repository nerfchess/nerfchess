import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/social";

export const dynamic = "force-dynamic";

// Conversation list: the latest message per correspondent plus how many of
// their messages are still unread.
export async function GET(request: Request) {
  const guard = await requireUser(request);
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;

  const rows = await db
    .prepare(
      `SELECT m.*,
              CASE WHEN m.from_user_id = ?1 THEN m.to_user_id ELSE m.from_user_id END AS peer_id
       FROM messages m
       WHERE m.id IN (
         SELECT id FROM messages
         WHERE from_user_id = ?1 OR to_user_id = ?1
         ORDER BY created_at DESC LIMIT 400
       )
       ORDER BY m.created_at DESC`,
    )
    .bind(user.id)
    .all<{
      id: string;
      from_user_id: string;
      to_user_id: string;
      text: string;
      created_at: number;
      read: number;
      peer_id: string;
    }>();

  // Reduce to one row per correspondent, newest first.
  const byPeer = new Map<string, { peerId: string; lastText: string; lastAt: number; fromMe: boolean; unread: number }>();
  for (const row of rows.results) {
    const entry = byPeer.get(row.peer_id) ?? {
      peerId: row.peer_id,
      lastText: row.text,
      lastAt: row.created_at,
      fromMe: row.from_user_id === user.id,
      unread: 0,
    };
    if (row.to_user_id === user.id && !row.read) entry.unread++;
    byPeer.set(row.peer_id, entry);
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
