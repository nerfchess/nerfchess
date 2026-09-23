import { NextResponse } from "next/server";
import { requireUser, challengeHrefs, CHALLENGE_TTL_MS } from "@/lib/server/social";
import { apiError, guardJsonWrite } from "@/lib/server/request";

export const dynamic = "force-dynamic";

// Update one challenge: the target may accept or decline, the challenger may
// cancel. Body: { action: "accepted" | "declined" | "cancelled" }.
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const body = await guardJsonWrite(request);
  if (body instanceof NextResponse) return body;
  const guard = await requireUser(request);
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;

  const action = body.action;
  if (action !== "accepted" && action !== "declined" && action !== "cancelled") {
    return apiError(400, "Unknown action.");
  }

  const id = params.id.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,10}$/.test(id)) return apiError(404, "Challenge not found.");
  const challenge = await db
    .prepare(`SELECT id, from_user_id, from_name, to_user_id, status, created_at FROM challenges WHERE id = ?`)
    .bind(id)
    .first<{ id: string; from_user_id: string; from_name: string; to_user_id: string; status: string; created_at: number }>();
  if (!challenge) return apiError(404, "Challenge not found.");

  const isTarget = challenge.to_user_id === user.id;
  const isChallenger = challenge.from_user_id === user.id;
  const allowed =
    (action === "cancelled" && isChallenger) || ((action === "accepted" || action === "declined") && isTarget);
  if (!allowed) return apiError(403, "Not your challenge.");

  if (challenge.status !== "pending") {
    if (action === "accepted" && challenge.status === "accepted") {
      return NextResponse.json({ ok: true, from: challenge.from_name, alreadyHandled: true });
    }
    return NextResponse.json(
      { error: "This challenge has already been handled.", status: challenge.status },
      { status: 409 },
    );
  }

  // The header list already hides challenges past the TTL, and the friend
  // game behind them is cleaned up on the same horizon; accepting one used to
  // succeed anyway and send the player into a game that no longer exists
  // (F096). Declining or cancelling a stale one still just closes it.
  if (action === "accepted" && Date.now() - challenge.created_at > CHALLENGE_TTL_MS) {
    await markBellRead(db, challenge.to_user_id, id);
    return apiError(410, "This challenge has expired.");
  }

  await db.prepare(`UPDATE challenges SET status = ? WHERE id = ?`).bind(action, id).run();
  // A resolved challenge no longer needs its bell entry.
  await markBellRead(db, challenge.to_user_id, id);

  return NextResponse.json({ ok: true, from: challenge.from_name });
}

// Exact link match: the old LIKE '%code=ID%' also cleared the bell entry of
// any other challenge whose code started with this one (F096).
async function markBellRead(db: D1Database, userId: string, code: string): Promise<void> {
  const hrefs = challengeHrefs(code);
  await db
    .prepare(
      `UPDATE notifications SET read = 1 WHERE user_id = ? AND type = 'challenge' AND href IN (${hrefs.map(() => "?").join(", ")})`,
    )
    .bind(userId, ...hrefs)
    .run();
}
