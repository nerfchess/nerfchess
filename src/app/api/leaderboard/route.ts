import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  // Every account is ranked from day one (fresh accounts sit at the 1500
  // default with a high deviation); banned accounts are dropped entirely.
  const rows = await db
    .prepare(
      `SELECT username, rating, rd, games, wins, losses, draws, avatar
       FROM users WHERE banned_until IS NULL OR banned_until <= ?
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
    }>();
  return NextResponse.json({ players: rows.results });
}
