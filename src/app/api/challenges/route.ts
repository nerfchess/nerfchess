import { NextResponse } from "next/server";
import { requireUser, createNotification, CHALLENGE_TTL_MS } from "@/lib/server/social";

export const dynamic = "force-dynamic";

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

  return NextResponse.json({
    challenges: rows.results.map((c) => ({
      id: c.id,
      from: c.from_name,
      timeSec: c.time_sec,
      incrementSec: c.increment_sec,
      rated: !!c.rated,
      at: c.created_at,
    })),
  });
}

// Register a direct challenge. The challenger has already created the friend
// game over the websocket; this records the code for the target and rings
// their bell. Body: { to, code, timeSec, incrementSec }.
export async function POST(request: Request) {
  const guard = await requireUser(request);
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;

  let body: { to?: unknown; code?: unknown; timeSec?: unknown; incrementSec?: unknown; rated?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const timeSec = Number.isInteger(body.timeSec) ? Number(body.timeSec) : 0;
  const incrementSec = Number.isInteger(body.incrementSec) ? Number(body.incrementSec) : 0;
  const rated = body.rated === true;
  if (!to || !/^[A-Z0-9]{4,10}$/.test(code)) {
    return NextResponse.json({ error: "to and code are required." }, { status: 400 });
  }

  const target = await db
    .prepare(`SELECT id, username FROM users WHERE username_lower = ?`)
    .bind(to.toLowerCase())
    .first<{ id: string; username: string }>();
  if (!target) return NextResponse.json({ error: "Player not found." }, { status: 404 });
  if (target.id === user.id) return NextResponse.json({ error: "You cannot challenge yourself." }, { status: 400 });

  // The challenge id is the client-supplied game code. INSERT OR REPLACE would
  // otherwise let a caller overwrite someone else's pending challenge row by
  // reusing their code (an IDOR clobber). Reject a code already owned by a
  // different player; a surviving row can only be the caller's own to refresh.
  const existing = await db
    .prepare(`SELECT from_user_id FROM challenges WHERE id = ?`)
    .bind(code)
    .first<{ from_user_id: string }>();
  if (existing && existing.from_user_id !== user.id) {
    return NextResponse.json({ error: "That code is already in use." }, { status: 409 });
  }

  await db
    .prepare(
      `INSERT OR REPLACE INTO challenges (id, from_user_id, from_name, to_user_id, time_sec, increment_sec, rated, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .bind(code, user.id, user.username, target.id, timeSec, incrementSec, rated ? 1 : 0, Date.now())
    .run();

  const clock = timeSec > 0 ? `${Math.round(timeSec / 60)}+${incrementSec}` : "no clock";
  await createNotification(db, {
    userId: target.id,
    type: "challenge",
    actorName: user.username,
    actorId: user.id,
    text: `${user.username} challenges you to a ${rated ? "rated" : "casual"} ${clock} game`,
    href: `/friend?code=${encodeURIComponent(code)}`,
  });

  return NextResponse.json({ ok: true });
}
