import { pgAll } from "@/lib/server/pg";
import { categoryForTimeControl } from "@/lib/speed";
import type { RecentGame } from "./CommunityClient";

// The first page of the community hub's Recent games, read on the server so
// the list paints at its real length (wave 2 review of /community). Before
// this the list loaded after hydration behind a 12-row skeleton, and a feed
// shorter than 12 collapsed the card and pulled the rail up into view on a
// phone (CLS 0.21). Same query and shape as /api/community/recent, which the
// page still uses for Retry and when this read fails.
//
// Bounded: a slow archive must not hold the whole page. Past the budget the
// page renders without the list and the client loads it as before.
const BUDGET_MS = 1200;

export async function readRecentGames(): Promise<RecentGame[] | null> {
  const read = pgAll<{
    id: string;
    white_name: string;
    black_name: string;
    winner: "w" | "b" | "draw" | null;
    reason: string;
    rated: number;
    category: string | null;
    time_sec: number;
    increment_sec: number;
    completed_at: number;
  }>(
    `SELECT id, white_name, black_name, winner, reason, rated, category,
            time_sec, increment_sec, completed_at
     FROM games ORDER BY completed_at DESC LIMIT 12`,
  ).then((games) =>
    games.map((game) => ({
      id: game.id,
      whiteName: game.white_name,
      blackName: game.black_name,
      winner: game.winner,
      reason: game.reason,
      rated: !!game.rated,
      category: game.category ?? categoryForTimeControl(game.time_sec, game.increment_sec),
      completedAt: game.completed_at,
    })),
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), BUDGET_MS);
  });
  try {
    return await Promise.race([read, late]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    read.catch(() => {});
  }
}
