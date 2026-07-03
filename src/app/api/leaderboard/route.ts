import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  // Every account is ranked from day one. Guest accounts are real accounts too,
  // but only show once they have played, so fresh visitors do not flood the list.
  const rows = await db
    .prepare(
      `SELECT username, rating, rd, games, wins, losses, draws, avatar, is_guest AS guest
       FROM users
       WHERE (banned_until IS NULL OR banned_until <= ?) AND (is_guest = 0 OR games > 0)
       ORDER BY rating DESC, games DESC LIMIT 100`,
    )
    .bind(Date.now())
    .all<{
      username: string;
      rating: number;
      rd: number;
      games: number;
      wins: number;
      losses: number;
      draws: number;
      avatar: string | null;
      guest: number;
    }>();

  return NextResponse.json({
    players: rows.results.map((row) => ({ ...row, guest: !!row.guest })),
  });
}
