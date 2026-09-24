import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/social";
import { apiError, guardJsonWrite } from "@/lib/server/request";
import { ALL_BUFFS } from "@/engine/buffs/library";

export const dynamic = "force-dynamic";

// Thumbs up / down on a buff after a game. One vote per player per buff;
// voting again replaces the previous vote. Body: { buffId, vote, gameId? }.
export async function POST(request: Request) {
  const body = await guardJsonWrite(request);
  if (body instanceof NextResponse) return body;
  const guard = await requireUser(request);
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;

  const buffId = typeof body.buffId === "string" ? body.buffId : "";
  const vote = body.vote === 1 || body.vote === -1 ? body.vote : null;
  const gameId = typeof body.gameId === "string" && /^[A-Za-z0-9_-]{1,16}$/.test(body.gameId) ? body.gameId : null;
  if (!vote || !ALL_BUFFS.some((b) => b.id === buffId)) {
    return apiError(400, "buffId and vote are required.");
  }

  await db
    .prepare(
      `INSERT OR REPLACE INTO buff_feedback (id, buff_id, vote, user_id, username, game_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(`${user.id}:${buffId}`, buffId, vote, user.id, user.username, gameId, Date.now())
    .run();
  return NextResponse.json({ ok: true });
}
