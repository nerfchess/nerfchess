import { NextResponse } from "next/server";
import { requireUser, notifyMessage, INBOX_HREF_LIKE } from "@/lib/server/social";
import { censorText } from "@/lib/profanity";
import { cleanText, TEXT_POLICIES } from "@/lib/textInput";
import { apiError, guardJsonWrite, PRIVATE_NO_STORE, usernameParam } from "@/lib/server/request";

export const dynamic = "force-dynamic";

// How many messages one thread read returns: the NEWEST this many, oldest
// first. (Paging further back is proposal P-msg-page.)
const THREAD_WINDOW = 200;
// Light flood guard: at most this many messages from one account per minute.
const SEND_WINDOW_MS = 60 * 1000;
const SEND_WINDOW_MAX = 20;

async function findPeer(db: D1Database, rawName: string) {
  const name = usernameParam(rawName);
  if (!name) return null;
  return db
    .prepare(`SELECT id, username, avatar FROM users WHERE username_lower = ?`)
    .bind(name)
    .first<{ id: string; username: string; avatar: string | null }>();
}

// The thread with one player: the newest THREAD_WINDOW messages, returned
// oldest first. Fetching it marks their messages to you as read.
export async function GET(request: Request, props: { params: Promise<{ username: string }> }) {
  const params = await props.params;
  const guard = await requireUser(request);
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;

  const peer = await findPeer(db, params.username);
  if (!peer) return apiError(404, "Player not found.", { "Cache-Control": PRIVATE_NO_STORE });

  // Newest first with the window applied, then reversed: the old ASC LIMIT
  // kept the OLDEST 200, so in a long thread new messages never appeared
  // while this same read marked them read (F072).
  const newestFirst = await db
    .prepare(
      `SELECT id, from_user_id, text, created_at FROM messages
       WHERE (from_user_id = ?1 AND to_user_id = ?2) OR (from_user_id = ?2 AND to_user_id = ?1)
       ORDER BY created_at DESC, id DESC LIMIT ${THREAD_WINDOW}`,
    )
    .bind(user.id, peer.id)
    .all<{ id: string; from_user_id: string; text: string; created_at: number }>();
  const messages = newestFirst.results.reverse();

  // The inbox page polls this every few seconds; only write when something is
  // actually unread (F108). One indexed read decides, instead of two UPDATEs
  // on every poll.
  const pending = await db
    .prepare(
      `SELECT EXISTS (
                SELECT 1 FROM messages WHERE from_user_id = ?1 AND to_user_id = ?2 AND read = 0
              ) AS unread_messages,
              EXISTS (
                SELECT 1 FROM notifications
                WHERE user_id = ?2 AND type = 'message' AND read = 0 AND href LIKE ?3
                  AND (actor_user_id = ?1 OR (actor_user_id IS NULL AND actor_name = ?4))
              ) AS unread_bell`,
    )
    .bind(peer.id, user.id, INBOX_HREF_LIKE, peer.username)
    .first<{ unread_messages: number; unread_bell: number }>();
  const hasUnread = !!pending?.unread_messages || !!pending?.unread_bell;
  if (hasUnread) {
    await db.batch([
      db
        .prepare(`UPDATE messages SET read = 1 WHERE from_user_id = ? AND to_user_id = ? AND read = 0`)
        .bind(peer.id, user.id),
      // Reading the thread also clears its bell entry, and only that entry: a
      // friend request from the same player (also stored with type 'message')
      // stays lit until it is handled (F075). Matched on the actor's id so a
      // renamed sender still matches; legacy rows without an id match on name.
      db
        .prepare(
          `UPDATE notifications SET read = 1
           WHERE user_id = ? AND type = 'message' AND read = 0 AND href LIKE ?
             AND (actor_user_id = ? OR (actor_user_id IS NULL AND actor_name = ?))`,
        )
        .bind(user.id, INBOX_HREF_LIKE, peer.id, peer.username),
    ]);
  }

  return NextResponse.json(
    {
      peer: { username: peer.username, avatar: peer.avatar },
      messages: messages.map((m) => ({
        id: m.id,
        fromMe: m.from_user_id === user.id,
        text: m.text,
        at: m.created_at,
      })),
    },
    { headers: { "Cache-Control": PRIVATE_NO_STORE } },
  );
}

// Send a message to one player.
export async function POST(request: Request, props: { params: Promise<{ username: string }> }) {
  const params = await props.params;
  const body = await guardJsonWrite(request);
  if (body instanceof NextResponse) return body;
  const guard = await requireUser(request);
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;

  if (user.muted_until && user.muted_until > Date.now()) {
    return apiError(403, "You are muted and cannot send messages right now.");
  }

  const peer = await findPeer(db, params.username);
  if (!peer) return apiError(404, "Player not found.");
  if (peer.id === user.id) return apiError(400, "You cannot message yourself.");

  // Normalise first (invisible characters, bidi overrides, code-point cap),
  // then censor, so a zero-width space cannot split a word past the filter.
  const text = censorText(cleanText(body.text, TEXT_POLICIES.directMessage));
  if (!text) return apiError(400, "Message is empty.");

  const recent = await db
    .prepare(`SELECT COUNT(*) AS n FROM messages WHERE from_user_id = ? AND created_at > ?`)
    .bind(user.id, Date.now() - SEND_WINDOW_MS)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= SEND_WINDOW_MAX) {
    return apiError(429, "Slow down a little.", { "Retry-After": "60" });
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
