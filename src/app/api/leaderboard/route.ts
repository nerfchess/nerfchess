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
  bio: string | null;
  guest: number;
  bot: number;
}

// Exactly two leaderboards, one per mode bucket (Nerf and Buff); the board is
// selected with ?category=. Requests for anything else (the retired speed
// buckets included) fall back to the default board: speed ratings are frozen
// history and no longer have a leaderboard. Players appear once they have
// played a rated game in that category. If the signed-in viewer is ranked but
// outside the page, their own row (with true rank) is returned separately so
// the UI can pin it.
//
// House players (the engine-driven roster in lib/server/bots.ts) are always
// shown on the board now, ranked alongside human accounts with no viewer-facing
// toggle: they read as ordinary players. They are included with their seeded
// rating even before they have finished a rated game (the OR arm), so every
// active house bot shows even while it sits at 0 games. Their user ids are all
// prefixed "hp_"; real accounts use random hex ids (no 'p'/'_'), so the prefix
// match is collision-free. The underscore is escaped because it is a LIKE
// wildcard. Keep this prefix in sync with bots.ts (HOUSE_ROSTER userId shape).
const HOUSE_ID_MATCH = "hp\\_%";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = url.searchParams.get("category");
  const category: ModeCategory = isModeCategory(requested) ? requested : DEFAULT_CATEGORY;

  // Bots always count toward the board; the same clause is reused verbatim by
  // the viewer-rank subquery below (each use binds one HOUSE_ID_MATCH).
  const houseFilter = `(r.games > 0 OR r.user_id LIKE ? ESCAPE '\\')`;

  const db = await getDb();
  const rows = await db
    .prepare(
      `SELECT u.username, r.rating, r.rd, r.games, r.wins, r.losses, r.draws, u.avatar, u.flair, u.bio, u.is_guest AS guest,
              (r.user_id LIKE ? ESCAPE '\\') AS bot
       FROM user_ratings r JOIN users u ON u.id = r.user_id
       WHERE r.category = ? AND ${houseFilter}
         AND (u.banned_until IS NULL OR u.banned_until <= ?)
       ORDER BY r.rating DESC, r.games DESC LIMIT 100`,
    )
    .bind(HOUSE_ID_MATCH, category, HOUSE_ID_MATCH, Date.now())
    .all<LeaderboardRow>();

  const players = rows.results.map((row) => ({ ...row, guest: !!row.guest, bot: !!row.bot }));

  // The viewer's own standing in this category, even when outside the top 100.
  let me: (Omit<LeaderboardRow, "guest" | "bot"> & { guest: boolean; bot: boolean; rank: number }) | null = null;
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
        // Rank against the same population the visible board uses, so the
        // pinned row's rank matches what the viewer can count on screen.
        const better = await db
          .prepare(
            `SELECT COUNT(*) AS n FROM user_ratings r JOIN users u ON u.id = r.user_id
             WHERE r.category = ? AND ${houseFilter}
               AND (u.banned_until IS NULL OR u.banned_until <= ?)
               AND (r.rating > ? OR (r.rating = ? AND r.games > ?))`,
          )
          .bind(category, HOUSE_ID_MATCH, Date.now(), mine.rating, mine.rating, mine.games)
          .first<{ n: number }>();
        me = {
          username: viewer.username,
          avatar: viewer.avatar,
          flair: viewer.flair,
          bio: viewer.bio,
          guest: !!viewer.is_guest,
          bot: false,
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
