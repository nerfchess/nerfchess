import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

// The most recently finished game, for the home hero: when nothing is being
// played live, the landing board shows the latest archived game instead.
export async function GET() {
  const db = await getDb();
  const game = await db
    .prepare(
      `SELECT g.id, g.white_name, g.black_name,
              g.white_rating_before, g.black_rating_before,
              g.moves, g.winner, g.reason, g.completed_at,
              wu.avatar AS white_avatar, bu.avatar AS black_avatar
       FROM games g
       LEFT JOIN users wu ON wu.id = g.white_user_id
       LEFT JOIN users bu ON bu.id = g.black_user_id
       ORDER BY g.completed_at DESC LIMIT 1`,
    )
    .first<{
      id: string;
      white_name: string;
      black_name: string;
      white_rating_before: number | null;
      black_rating_before: number | null;
      moves: string;
      winner: string | null;
      reason: string;
      completed_at: number;
      white_avatar: string | null;
      black_avatar: string | null;
    }>();

  return NextResponse.json({ game: game ?? null });
}
