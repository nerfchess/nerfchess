import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/social";
import { ALL_NERFS } from "@/engine/nerfs/library";

export const dynamic = "force-dynamic";

// Thumbs up / down on a rule after a game. One vote per player per rule;
// voting again replaces the previous vote. Body: { nerfId, vote, gameId? }.
export async function POST(request: Request) {
  const guard = await requireUser(request);
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;

  let body: { nerfId?: unknown; vote?: unknown; gameId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const nerfId = typeof body.nerfId === "string" ? body.nerfId : "";
  const vote = body.vote === 1 || body.vote === -1 ? body.vote : null;
  const gameId = typeof body.gameId === "string" ? body.gameId.slice(0, 16) : null;
  if (!vote || !ALL_NERFS.some((n) => n.id === nerfId)) {
    return NextResponse.json({ error: "nerfId and vote are required." }, { status: 400 });
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
