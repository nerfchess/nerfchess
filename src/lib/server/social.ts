/// <reference types="@cloudflare/workers-types" />

// Shared primitives for the social features: direct messages, notifications,
// and direct challenges. Used by the /api/messages, /api/notifications and
// /api/challenges routes plus the moderation hooks.

import { NextResponse } from "next/server";
import { getDb } from "./db";
import { sessionTokenFromCookieHeader, userForSession, type SessionUser } from "./auth";

// Resolves the signed-in caller or an error response ready to return.
export async function requireUser(
  request: Request,
): Promise<{ db: D1Database; user: SessionUser } | NextResponse> {
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return { db, user };
}

export type NotificationType = "message" | "challenge" | "warn" | "mute" | "ban" | "flag_name";

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

/** Notify about a new message unless an unread message notification from the
 *  same sender is already pending, so a burst of texts rings the bell once. */
export async function notifyMessage(db: D1Database, from: SessionUser, toUserId: string): Promise<void> {
  const existing = await db
    .prepare(
      `SELECT id FROM notifications
       WHERE user_id = ? AND type = 'message' AND actor_name = ? AND read = 0 LIMIT 1`,
    )
    .bind(toUserId, from.username)
    .first<{ id: string }>();
  if (existing) return;
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
