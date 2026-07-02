import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  const rows = await db
    .prepare(
      `SELECT username, rating, rd, games, wins, losses, draws
       FROM users WHERE games > 0
       ORDER BY rating DESC LIMIT 100`,
    )
    .all<{
      username: string;
      rating: number;
      rd: number;
      games: number;
      wins: number;
      losses: number;
      draws: number;
    }>();
  return NextResponse.json({ players: rows.results });
}
