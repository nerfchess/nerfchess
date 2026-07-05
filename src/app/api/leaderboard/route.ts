import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";
import { isModeCategory, type ModeCategory } from "@/lib/speed";

export const dynamic = "force-dynamic";

const DEFAULT_CATEGORY: ModeCategory = "nerf";

interface LeaderboardRow {
  username: string;
  rating: number;
  rd: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  avatar: string | null;
  flair: string | null;
  guest: number;
}

// Exactly two leaderboards, one per mode bucket (Nerf and Buff); the board is
// selected with ?category=. Requests for anything else (the retired speed
// buckets included) fall back to the default board: speed ratings are frozen
// history and no longer have a leaderboard. Players appear once they have
// played a rated game in that category. If the signed-in viewer is ranked but
// outside the page, their own row (with true rank) is returned separately so
// the UI can pin it.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = url.searchParams.get("category");
  const category: ModeCategory = isModeCategory(requested) ? requested : DEFAULT_CATEGORY;

  const db = await getDb();
  const rows = await db
    .prepare(
      `SELECT u.username, r.rating, r.rd, r.games, r.wins, r.losses, r.draws, u.avatar, u.flair, u.is_guest AS guest
       FROM user_ratings r JOIN users u ON u.id = r.user_id
       WHERE r.category = ? AND r.games > 0
         AND (u.banned_until IS NULL OR u.banned_until <= ?)
       ORDER BY r.rating DESC, r.games DESC LIMIT 100`,
    )
    .bind(category, Date.now())
    .all<LeaderboardRow>();

  const players = rows.results.map((row) => ({ ...row, guest: !!row.guest }));

  // The viewer's own standing in this category, even when outside the top 100.
  let me: (Omit<LeaderboardRow, "guest"> & { guest: boolean; rank: number }) | null = null;
  try {
    const token = sessionTokenFromCookieHeader(request.headers.get("cookie"));
    const viewer = token ? await userForSession(db, token) : null;
    if (viewer) {
      const mine = await db
        .prepare(
          `SELECT rating, rd, games, wins, losses, draws FROM user_ratings
           WHERE user_id = ? AND category = ? AND games > 0`,
        )
        .bind(viewer.id, category)
        .first<{ rating: number; rd: number; games: number; wins: number; losses: number; draws: number }>();
      if (mine) {
        const better = await db
          .prepare(
            `SELECT COUNT(*) AS n FROM user_ratings r JOIN users u ON u.id = r.user_id
             WHERE r.category = ? AND r.games > 0 AND (u.banned_until IS NULL OR u.banned_until <= ?)
               AND (r.rating > ? OR (r.rating = ? AND r.games > ?))`,
          )
          .bind(category, Date.now(), mine.rating, mine.rating, mine.games)
          .first<{ n: number }>();
        me = {
          username: viewer.username,
          avatar: viewer.avatar,
          flair: viewer.flair,
          guest: !!viewer.is_guest,
          rank: (better?.n ?? 0) + 1,
          ...mine,
        };
      }
    }
  } catch {
    // The list itself is still useful without the viewer row.
  }

  return NextResponse.json({ category, players, me });
}
