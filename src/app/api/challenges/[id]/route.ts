import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/social";

export const dynamic = "force-dynamic";

// Update one challenge: the target may accept or decline, the challenger may
// cancel. Body: { action: "accepted" | "declined" | "cancelled" }.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const guard = await requireUser(request);
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;

  let body: { action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const action = body.action;
  if (action !== "accepted" && action !== "declined" && action !== "cancelled") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const id = params.id.trim().toUpperCase();
  const challenge = await db
    .prepare(`SELECT id, from_user_id, to_user_id, status FROM challenges WHERE id = ?`)
    .bind(id)
    .first<{ id: string; from_user_id: string; to_user_id: string; status: string }>();
  if (!challenge) return NextResponse.json({ error: "Challenge not found." }, { status: 404 });

  const isTarget = challenge.to_user_id === user.id;
  const isChallenger = challenge.from_user_id === user.id;
  const allowed =
    (action === "cancelled" && isChallenger) || ((action === "accepted" || action === "declined") && isTarget);
  if (!allowed) return NextResponse.json({ error: "Not your challenge." }, { status: 403 });

  if (challenge.status === "pending") {
    await db.prepare(`UPDATE challenges SET status = ? WHERE id = ?`).bind(action, id).run();
    // A resolved challenge no longer needs its bell entry.
    await db
      .prepare(`UPDATE notifications SET read = 1 WHERE user_id = ? AND type = 'challenge' AND href LIKE ?`)
      .bind(challenge.to_user_id, `%code=${encodeURIComponent(id)}%`)
      .run();
  }
  return NextResponse.json({ ok: true });
}
