import { NextResponse } from "next/server";
import { requireUser, notifyMessage } from "@/lib/server/social";
import { censorText } from "@/lib/profanity";

export const dynamic = "force-dynamic";

const MAX_MESSAGE_CHARS = 1000;
// Light flood guard: at most this many messages from one account per minute.
const SEND_WINDOW_MS = 60 * 1000;
const SEND_WINDOW_MAX = 20;

async function findPeer(db: D1Database, username: string) {
  return db
    .prepare(`SELECT id, username, avatar FROM users WHERE username_lower = ?`)
    .bind(username.trim().toLowerCase())
    .first<{ id: string; username: string; avatar: string | null }>();
}

// The thread with one player, oldest first. Fetching it marks their messages
// to you as read.
export async function GET(request: Request, props: { params: Promise<{ username: string }> }) {
  const params = await props.params;
  const guard = await requireUser(request);
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;

  const peer = await findPeer(db, params.username);
  if (!peer) return NextResponse.json({ error: "Player not found." }, { status: 404 });

  const messages = await db
    .prepare(
      `SELECT id, from_user_id, text, created_at FROM messages
       WHERE (from_user_id = ?1 AND to_user_id = ?2) OR (from_user_id = ?2 AND to_user_id = ?1)
       ORDER BY created_at ASC LIMIT 200`,
    )
    .bind(user.id, peer.id)
    .all<{ id: string; from_user_id: string; text: string; created_at: number }>();

  await db
    .prepare(`UPDATE messages SET read = 1 WHERE from_user_id = ? AND to_user_id = ? AND read = 0`)
    .bind(peer.id, user.id)
    .run();
  // Reading the thread also clears its bell entry.
  await db
    .prepare(`UPDATE notifications SET read = 1 WHERE user_id = ? AND type = 'message' AND actor_name = ? AND read = 0`)
    .bind(user.id, peer.username)
    .run();

  return NextResponse.json({
    peer: { username: peer.username, avatar: peer.avatar },
    messages: messages.results.map((m) => ({
      id: m.id,
      fromMe: m.from_user_id === user.id,
      text: m.text,
      at: m.created_at,
    })),
  });
}

// Send a message to one player.
export async function POST(request: Request, props: { params: Promise<{ username: string }> }) {
  const params = await props.params;
  const guard = await requireUser(request);
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;

  if (user.muted_until && user.muted_until > Date.now()) {
    return NextResponse.json({ error: "You are muted and cannot send messages right now." }, { status: 403 });
  }

  const peer = await findPeer(db, params.username);
  if (!peer) return NextResponse.json({ error: "Player not found." }, { status: 404 });
  if (peer.id === user.id) return NextResponse.json({ error: "You cannot message yourself." }, { status: 400 });

  let body: { text?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const text = typeof body.text === "string" ? censorText(body.text.trim()).slice(0, MAX_MESSAGE_CHARS) : "";
  if (!text) return NextResponse.json({ error: "Message is empty." }, { status: 400 });

  const recent = await db
    .prepare(`SELECT COUNT(*) AS n FROM messages WHERE from_user_id = ? AND created_at > ?`)
    .bind(user.id, Date.now() - SEND_WINDOW_MS)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= SEND_WINDOW_MAX) {
    return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  }

  const message = {
    id: crypto.randomUUID(),
    at: Date.now(),
  };
  await db
    .prepare(
      `INSERT INTO messages (id, from_user_id, to_user_id, text, created_at, read)
       VALUES (?, ?, ?, ?, ?, 0)`,
    )
    .bind(message.id, user.id, peer.id, text, message.at)
    .run();
  await notifyMessage(db, user, peer.id);

  return NextResponse.json({ message: { id: message.id, fromMe: true, text, at: message.at } });
}
