import { queryRecentGames } from "@/lib/server/recentGames";
import type { RecentGame } from "./CommunityClient";

// The first page of the community hub's Recent games, read on the server so
// the list paints at its real length (wave 2 review of /community). Before
// this the list loaded after hydration behind a 12-row skeleton, and a feed
// shorter than 12 collapsed the card and pulled the rail up into view on a
// phone (CLS 0.21). The query is the one /api/community/recent runs
// (src/lib/server/recentGames.ts); the page still uses that route for Retry
// and when this read fails.
//
// Bounded: a slow archive must not hold the whole page. Past the budget the
// page renders without the list and the client loads it as before.
const BUDGET_MS = 1200;

export async function readRecentGames(): Promise<RecentGame[] | null> {
  const read: Promise<RecentGame[]> = queryRecentGames();
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
