import { NextResponse } from "next/server";
import {
  requireUser,
  createNotification,
  challengeHref,
  mutedRefusal,
  CHALLENGE_TTL_MS,
} from "@/lib/server/social";
import { apiError, guardJsonWrite, PRIVATE_NO_STORE, rateLimit, tooManyRequests, usernameParam } from "@/lib/server/request";
import { clockWithin, CUSTOM_GAME_CLOCK } from "@/lib/clockBounds";

export const dynamic = "force-dynamic";

// Every challenge rings the target's bell, so sending is metered twice
// (F059): per sender overall, and per sender and target pair so one player
// cannot be singled out with a stream of invitations.
const SEND_WINDOW_MS = 10 * 60 * 1000;
const SEND_MAX_PER_SENDER = 12;
const SEND_MAX_PER_PAIR = 5;

// Pending challenges addressed to the caller (for the header dropdown).
export async function GET(request: Request) {
  const guard = await requireUser(request);
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;

  const rows = await db
    .prepare(
      `SELECT id, from_name, time_sec, increment_sec, rated, created_at
       FROM challenges
       WHERE to_user_id = ? AND status = 'pending' AND created_at > ?
       ORDER BY created_at DESC LIMIT 20`,
    )
    .bind(user.id, Date.now() - CHALLENGE_TTL_MS)
    .all<{ id: string; from_name: string; time_sec: number; increment_sec: number; rated: number; created_at: number }>();

  return NextResponse.json(
    {
      challenges: rows.results.map((c) => ({
        id: c.id,
        from: c.from_name,
        timeSec: c.time_sec,
        incrementSec: c.increment_sec,
        rated: !!c.rated,
        at: c.created_at,
      })),
    },
    { headers: { "Cache-Control": PRIVATE_NO_STORE } },
  );
}

// Register a direct challenge. The challenger has already created the friend
// game over the websocket; this records the code for the target and rings
// their bell. Body: { to, code, timeSec, incrementSec, rated? }.
export async function POST(request: Request) {
  const body = await guardJsonWrite(request);
  if (body instanceof NextResponse) return body;
  const guard = await requireUser(request);
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;

  const to = typeof body.to === "string" ? usernameParam(body.to) : null;
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!to || !/^[A-Z0-9]{4,10}$/.test(code)) {
    return apiError(400, "to and code are required.");
  }
  // Missing clock fields keep their old meaning (no clock); anything present
  // must be a time control the game server would actually run.
  const timeSec = body.timeSec ?? 0;
  const incrementSec = body.incrementSec ?? 0;
  if (!clockWithin(timeSec, incrementSec, CUSTOM_GAME_CLOCK)) {
    return apiError(400, "Unsupported time control.");
  }
  const rated = body.rated === true;

  const muted = mutedRefusal(user, "send challenges");
  if (muted) return muted;

  const target = await db
    .prepare(`SELECT id, username FROM users WHERE username_lower = ?`)
    .bind(to)
    .first<{ id: string; username: string }>();
  if (!target) return apiError(404, "Player not found.");
  if (target.id === user.id) return apiError(400, "You cannot challenge yourself.");

  const perSender = await rateLimit(db, `challenge:${user.id}`, SEND_MAX_PER_SENDER, SEND_WINDOW_MS);
  if (!perSender.ok) return tooManyRequests("You have sent a lot of challenges. Try again in a few minutes.", perSender.retryAfterSec);
  const perPair = await rateLimit(db, `challenge:${user.id}:${target.id}`, SEND_MAX_PER_PAIR, SEND_WINDOW_MS);
  if (!perPair.ok) return tooManyRequests(`You have challenged ${target.username} a lot already. Try again in a few minutes.`, perPair.retryAfterSec);

  // The challenge id is the client-supplied game code. INSERT OR REPLACE would
  // otherwise let a caller overwrite someone else's pending challenge row by
  // reusing their code (an IDOR clobber). Reject a code already owned by a
  // different player; a surviving row can only be the caller's own to refresh.
  const existing = await db
    .prepare(`SELECT from_user_id FROM challenges WHERE id = ?`)
    .bind(code)
    .first<{ from_user_id: string }>();
  if (existing && existing.from_user_id !== user.id) {
    return apiError(409, "That code is already in use.");
  }

  await db
    .prepare(
      `INSERT OR REPLACE INTO challenges (id, from_user_id, from_name, to_user_id, time_sec, increment_sec, rated, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .bind(code, user.id, user.username, target.id, timeSec, incrementSec, rated ? 1 : 0, Date.now())
    .run();

  const clock = (timeSec as number) > 0 ? `${Math.round((timeSec as number) / 60)}+${incrementSec}` : "no clock";
  await createNotification(db, {
    userId: target.id,
    type: "challenge",
    actorName: user.username,
    actorId: user.id,
    text: `${user.username} challenges you to a ${rated ? "rated" : "casual"} ${clock} game`,
    href: challengeHref(code),
  });

  return NextResponse.json({ ok: true });
}
