import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

// Prefix search over usernames for the player-search box.
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2 || q.length > 20) return NextResponse.json({ players: [] });
  const escaped = q.replace(/[\\%_]/g, (ch) => `\\${ch}`);

  const db = await getDb();
  // Displayed rating = the best of the player's LIVE mode buckets (nerf/buff),
  // the same source the leaderboard and profiles read. The legacy users.rating
  // column is never written after games anymore, so reading it here showed
  // frozen numbers (house bots especially: their buckets move with arena
  // results while the legacy column sits on the seed forever).
  const rows = await db
    .prepare(
      `SELECT u.username,
              COALESCE(
                (SELECT MAX(r.rating) FROM user_ratings r
                  WHERE r.user_id = u.id AND r.category IN ('nerf','buff')),
                u.rating
              ) AS rating,
              u.games
       FROM users u
       WHERE u.username_lower LIKE ? ESCAPE '\\'
       ORDER BY u.games DESC, rating DESC LIMIT 10`,
    )
    .bind(`${escaped}%`)
    .all<{ username: string; rating: number; games: number }>();
  return NextResponse.json({ players: rows.results });
}
