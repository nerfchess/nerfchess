import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { pgAll } from "@/lib/server/pg";
import { computePlayerStats, type StatsGameRow } from "@/lib/playerStats";

export const dynamic = "force-dynamic";

// Detailed statistics for one player, computed from their recorded games.
export async function GET(_request: Request, { params }: { params: { username: string } }) {
  const username = params.username.trim().toLowerCase();
  // The account lookup stays on D1; the games it computes over are on Postgres.
  const db = await getDb();
  const user = await db
    .prepare(`SELECT id, username FROM users WHERE username_lower = ?`)
    .bind(username)
    .first<{ id: string; username: string }>();
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const games = await pgAll<StatsGameRow>(
    `SELECT id, rated, winner, reason,
            white_user_id, black_user_id, white_name, black_name,
            white_nerf_id, black_nerf_id,
            white_rating_before, black_rating_before,
            white_rating_after, black_rating_after,
            time_sec, increment_sec, started_at, completed_at,
            CASE WHEN moves = '' THEN 0
                 ELSE LENGTH(moves) - LENGTH(REPLACE(moves, ' ', '')) + 1 END AS move_count
     FROM games
     WHERE white_user_id = ? OR black_user_id = ?
     ORDER BY completed_at ASC LIMIT 5000`,
    [user.id, user.id],
  );

  return NextResponse.json({
    username: user.username,
    stats: computePlayerStats(user.id, games),
  });
}
