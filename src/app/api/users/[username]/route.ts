import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { username: string } }) {
  const username = params.username.trim().toLowerCase();
  const db = await getDb();
  const user = await db
    .prepare(
      `SELECT id, username, rating, rd, games, wins, losses, draws, created_at
       FROM users WHERE username_lower = ?`,
    )
    .bind(username)
    .first<{
      id: string;
      username: string;
      rating: number;
      rd: number;
      games: number;
      wins: number;
      losses: number;
      draws: number;
      created_at: number;
    }>();
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const games = await db
    .prepare(
      `SELECT id, white_name, black_name, winner, reason, rated,
              white_user_id, black_user_id,
              white_rating_before, white_rating_after, black_rating_before, black_rating_after,
              time_sec, increment_sec, completed_at
       FROM games
       WHERE white_user_id = ? OR black_user_id = ?
       ORDER BY completed_at DESC LIMIT 30`,
    )
    .bind(user.id, user.id)
    .all();

  return NextResponse.json({
    user: {
      username: user.username,
      rating: user.rating,
      rd: user.rd,
      games: user.games,
      wins: user.wins,
      losses: user.losses,
      draws: user.draws,
      createdAt: user.created_at,
    },
    games: games.results,
  });
}
