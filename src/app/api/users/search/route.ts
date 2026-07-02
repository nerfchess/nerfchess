import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

// Prefix search over usernames for the player-search box.
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2 || q.length > 20) return NextResponse.json({ players: [] });
  const escaped = q.replace(/[\\%_]/g, (ch) => `\\${ch}`);

  const db = await getDb();
  const rows = await db
    .prepare(
      `SELECT username, rating, games FROM users
       WHERE username_lower LIKE ? ESCAPE '\\'
       ORDER BY games DESC, rating DESC LIMIT 10`,
    )
    .bind(`${escaped}%`)
    .all<{ username: string; rating: number; games: number }>();
  return NextResponse.json({ players: rows.results });
}
