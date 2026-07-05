import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { pgAll } from "@/lib/server/pg";

export const dynamic = "force-dynamic";

// Most active players over the last 7 days, ranked by finished games. Public
// data for the community hub; banned accounts are hidden like the leaderboard.
// The game archive is on Postgres and accounts are on D1, so this is a
// two-step read: aggregate game counts per user in Postgres, then resolve
// usernames/avatars and drop banned accounts in D1. We over-fetch (top 50) so
// the ban filter can't shrink the final list below the 10 we show.
export async function GET() {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const counts = await pgAll<{ user_id: string; games: number }>(
    `SELECT user_id, COUNT(*)::int AS games
     FROM (
       SELECT white_user_id AS user_id FROM games WHERE completed_at > ?
       UNION ALL
       SELECT black_user_id FROM games WHERE completed_at > ?
     ) g
     WHERE user_id IS NOT NULL
     GROUP BY user_id
     ORDER BY games DESC LIMIT 50`,
    [weekAgo, weekAgo],
  );
  if (!counts.length) return NextResponse.json({ players: [] });

  const ids = counts.map((c) => c.user_id);
  const db = await getDb();
  const rows = await db
    .prepare(`SELECT id, username, avatar, banned_until FROM users WHERE id IN (${ids.map(() => "?").join(",")})`)
    .bind(...ids)
    .all<{ id: string; username: string; avatar: string | null; banned_until: number | null }>();

  const now = Date.now();
  const active = new Map(
    rows.results.filter((u) => !u.banned_until || u.banned_until <= now).map((u) => [u.id, u]),
  );

  const players = counts
    .filter((c) => active.has(c.user_id))
    .slice(0, 10)
    .map((c) => {
      const u = active.get(c.user_id)!;
      return { username: u.username, avatar: u.avatar, games: c.games };
    });

  return NextResponse.json({ players });
}
