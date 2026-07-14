/// <reference types="@cloudflare/workers-types" />

// Server-side answer to "does this account currently hold a top-10 spot on a
// leaderboard?" — the gate for the exclusive Laurelled flair (lib/flair.ts).
// Read-only: it reproduces the exact population and ordering of the
// leaderboard route (src/app/api/leaderboard/route.ts) so a player who can see
// themself in the top 10 is always allowed the flair, and nobody else is.
// No new tables, no stored state: rank is computed from user_ratings on demand.

import { LAUREL_TOP_N } from "../flair";
import { MODE_CATEGORIES } from "../speed";

// House-bot id prefix, escaped for LIKE — keep in sync with the leaderboard
// route and lib/server/bots.ts (HOUSE_ROSTER userId shape).
const HOUSE_ID_MATCH = "hp\\_%";

/** True when the user is currently ranked in the top LAUREL_TOP_N of at least
 *  one mode leaderboard (Nerf or Buff), using the same tie-break the board
 *  displays (rating DESC, then games DESC). */
export async function holdsTopTenRank(db: D1Database, userId: string): Promise<boolean> {
  for (const category of MODE_CATEGORIES) {
    const mine = await db
      .prepare(
        `SELECT rating, games FROM user_ratings
         WHERE user_id = ? AND category = ? AND games > 0`,
      )
      .bind(userId, category)
      .first<{ rating: number; games: number }>();
    if (!mine) continue;

    // Count the players ranked strictly above, against the same population the
    // visible board uses: rated players plus always-listed house bots, banned
    // accounts excluded. Identical to the leaderboard route's viewer-rank query.
    const better = await db
      .prepare(
        `SELECT COUNT(*) AS n FROM user_ratings r JOIN users u ON u.id = r.user_id
         WHERE r.category = ? AND (r.games > 0 OR r.user_id LIKE ? ESCAPE '\\')
           AND (u.banned_until IS NULL OR u.banned_until <= ?)
           AND (r.rating > ? OR (r.rating = ? AND r.games > ?))`,
      )
      .bind(category, HOUSE_ID_MATCH, Date.now(), mine.rating, mine.rating, mine.games)
      .first<{ n: number }>();
    if ((better?.n ?? 0) + 1 <= LAUREL_TOP_N) return true;
  }
  return false;
}
