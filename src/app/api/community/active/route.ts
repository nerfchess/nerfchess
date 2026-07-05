import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

// Most active players over the last 7 days, ranked by finished games. Public
// data for the community hub; banned accounts are hidden like the leaderboard.
export async function GET() {
  const db = await getDb();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const rows = await db
    .prepare(
      `SELECT u.username, u.avatar, COUNT(*) AS games
       FROM (
         SELECT white_user_id AS user_id FROM games WHERE completed_at > ?
         UNION ALL
         SELECT black_user_id FROM games WHERE completed_at > ?
       ) g
       JOIN users u ON u.id = g.user_id
       WHERE u.banned_until IS NULL OR u.banned_until <= ?
       GROUP BY g.user_id
       ORDER BY games DESC LIMIT 10`,
    )
    .bind(weekAgo, weekAgo, Date.now())
    .all<{ username: string; avatar: string | null; games: number }>();

  return NextResponse.json({ players: rows.results });
}
