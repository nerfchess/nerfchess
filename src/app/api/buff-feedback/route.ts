import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/social";
import { ALL_BUFFS } from "@/engine/buffs/library";

export const dynamic = "force-dynamic";

// Thumbs up / down on a buff after a game. One vote per player per buff;
// voting again replaces the previous vote. Body: { buffId, vote, gameId? }.
export async function POST(request: Request) {
  const guard = await requireUser(request);
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;

  let body: { buffId?: unknown; vote?: unknown; gameId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const buffId = typeof body.buffId === "string" ? body.buffId : "";
  const vote = body.vote === 1 || body.vote === -1 ? body.vote : null;
  const gameId = typeof body.gameId === "string" ? body.gameId.slice(0, 16) : null;
  if (!vote || !ALL_BUFFS.some((b) => b.id === buffId)) {
    return NextResponse.json({ error: "buffId and vote are required." }, { status: 400 });
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
