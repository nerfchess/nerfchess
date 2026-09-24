/// <reference types="@cloudflare/workers-types" />

// Shared primitives for the social features: direct messages, notifications,
// and direct challenges. Used by the /api/messages, /api/notifications and
// /api/challenges routes plus the moderation hooks.

import { NextResponse } from "next/server";
import { getDb } from "./db";
import { isMuted, sessionTokenFromCookieHeader, userForSession, type SessionUser } from "./auth";

// Resolves the signed-in caller or an error response ready to return.
export async function requireUser(
  request: Request,
): Promise<{ db: D1Database; user: SessionUser } | NextResponse> {
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return { db, user };
}

/** The 403 a muted player gets from any write that reaches another player
 *  (messages, posts, friend requests, challenges, clubs, tournaments), or null
 *  when the caller may write. */
export function mutedRefusal(user: SessionUser, what: string): NextResponse | null {
  if (!isMuted(user)) return null;
  return NextResponse.json({ error: `You are muted and cannot ${what} right now.` }, { status: 403 });
}

export type NotificationType = "message" | "challenge" | "warn" | "mute" | "ban" | "flag_name";

// Friend requests share the 'message' type with DMs (a dedicated 'friend'
// type is proposal P-notif), so the two are told apart by their link: DM
// entries always point into the inbox, friend entries at /friend.
export const INBOX_HREF_LIKE = "/inbox/%";
export const FRIEND_HREF = "/friend";

export async function createNotification(
  db: D1Database,
  input: {
    userId: string;
    type: NotificationType;
    actorName?: string | null;
    // Stable id of the acting user. Stored so the read path can resolve the
    // actor's CURRENT username live, instead of trusting the frozen actorName
    // snapshotted into `text` at send time (a rename must not leave a stale
    // name in the bell).
    actorId?: string | null;
    text: string;
    href?: string | null;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO notifications (id, user_id, type, actor_name, actor_user_id, text, href, created_at, read)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    )
    .bind(
      crypto.randomUUID(),
      input.userId,
      input.type,
      input.actorName ?? null,
      input.actorId ?? null,
      input.text,
      input.href ?? null,
      Date.now(),
    )
    .run();
}

/** True when `toUserId` already has an unread notification of `type` from
 *  this actor whose link matches `hrefLike` (a LIKE pattern). */
export async function hasPendingNotification(
  db: D1Database,
  toUserId: string,
  from: Pick<SessionUser, "id" | "username">,
  type: NotificationType,
  hrefLike: string,
): Promise<boolean> {
  const existing = await db
    .prepare(
      `SELECT id FROM notifications
       WHERE user_id = ? AND type = ? AND read = 0 AND href LIKE ?
         AND (actor_user_id = ? OR (actor_user_id IS NULL AND actor_name = ?))
       LIMIT 1`,
    )
    .bind(toUserId, type, hrefLike, from.id, from.username)
    .first<{ id: string }>();
  return !!existing;
}

/** Notify about a new message unless an unread message notification from the
 *  same sender is already pending, so a burst of texts rings the bell once.
 *  Only inbox entries count: a pending friend request from the same player
 *  must not swallow the DM's bell entry (F075). */
export async function notifyMessage(db: D1Database, from: SessionUser, toUserId: string): Promise<void> {
  if (await hasPendingNotification(db, toUserId, from, "message", INBOX_HREF_LIKE)) return;
  await createNotification(db, {
    userId: toUserId,
    type: "message",
    actorName: from.username,
    actorId: from.id,
    text: `New message from ${from.username}`,
    href: `/inbox/${encodeURIComponent(from.username)}`,
  });
}

// Challenges older than this are treated as expired; unstarted friend games
// are cleaned up server-side on the same horizon.
export const CHALLENGE_TTL_MS = 30 * 60 * 1000;

/** The exact bell link a direct challenge carries (see /api/challenges): the
 *  invite route (/c/<code>, src/app/c/[code]), which opens the same join flow
 *  in the lobby's Friends tab. */
export function challengeHref(code: string): string {
  return `/c/${encodeURIComponent(code)}`;
}

/** Every bell link a challenge with this code may carry: the current one and
 *  the /friend?code= form stored before the invite route existed (that route
 *  still redirects, so old links keep working). Used to clear the entry. */
export function challengeHrefs(code: string): string[] {
  return [challengeHref(code), `/friend?code=${encodeURIComponent(code)}`];
}
