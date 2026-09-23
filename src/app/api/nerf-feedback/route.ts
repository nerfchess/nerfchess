import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/social";
import { apiError, guardJsonWrite } from "@/lib/server/request";
import { ALL_NERFS } from "@/engine/nerfs/library";

export const dynamic = "force-dynamic";

// Thumbs up / down on a rule after a game. One vote per player per rule;
// voting again replaces the previous vote. Body: { nerfId, vote, gameId? }.
export async function POST(request: Request) {
  const body = await guardJsonWrite(request);
  if (body instanceof NextResponse) return body;
  const guard = await requireUser(request);
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;

  const nerfId = typeof body.nerfId === "string" ? body.nerfId : "";
  const vote = body.vote === 1 || body.vote === -1 ? body.vote : null;
  const gameId = typeof body.gameId === "string" && /^[A-Za-z0-9_-]{1,16}$/.test(body.gameId) ? body.gameId : null;
  if (!vote || !ALL_NERFS.some((n) => n.id === nerfId)) {
    return apiError(400, "nerfId and vote are required.");
  }

  await db
    .prepare(
      `INSERT OR REPLACE INTO nerf_feedback (id, nerf_id, vote, user_id, username, game_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(`${user.id}:${nerfId}`, nerfId, vote, user.id, user.username, gameId, Date.now())
    .run();
  return NextResponse.json({ ok: true });
}
