import { pgAll } from "@/lib/server/pg";
import { categoryForTimeControl } from "@/lib/speed";

// The latest finished games, for the community hub's "Recent games" list. One
// query for both readers: /api/community/recent (the client's load and Retry)
// and the /community server shell's first page (src/app/community/recentGames.ts),
// so the two cannot drift. Rows recorded before the category column existed
// fall back to the time control, same as the profile rating history.

export interface RecentGameRow {
  id: string;
  whiteName: string;
  blackName: string;
  winner: "w" | "b" | "draw" | null;
  reason: string;
  rated: boolean;
  category: string;
  completedAt: number;
}

export const RECENT_GAMES_LIMIT = 12;

export async function queryRecentGames(): Promise<RecentGameRow[]> {
  const games = await pgAll<{
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
     FROM games ORDER BY completed_at DESC LIMIT ${RECENT_GAMES_LIMIT}`,
  );
  return games.map((game) => ({
    id: game.id,
    whiteName: game.white_name,
    blackName: game.black_name,
    winner: game.winner,
    reason: game.reason,
    rated: !!game.rated,
    category: game.category ?? categoryForTimeControl(game.time_sec, game.increment_sec),
    completedAt: game.completed_at,
  }));
}
