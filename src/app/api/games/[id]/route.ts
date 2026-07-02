import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const id = params.id.trim().toUpperCase();
  if (!/^[A-Z2-9]{4,12}$/.test(id)) {
    return NextResponse.json({ error: "Bad game id." }, { status: 400 });
  }
  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT id, white_name, black_name, white_nerf_id, black_nerf_id,
              time_sec, increment_sec, moves, winner, reason, rated,
              white_rating_before, white_rating_after, black_rating_before, black_rating_after,
              started_at, completed_at
       FROM games WHERE id = ?`,
    )
    .bind(id)
    .first();
  if (!row) return NextResponse.json({ error: "Game not found." }, { status: 404 });
  return NextResponse.json({ game: row });
}
