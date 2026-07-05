import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { categoryForTimeControl } from "@/lib/speed";

export const dynamic = "force-dynamic";

// The latest finished games, for the community hub's "Recent games" list.
// Rows recorded before the category column existed fall back to the time
// control, same as the profile rating history.
export async function GET() {
  const db = await getDb();
  const rows = await db
    .prepare(
      `SELECT id, white_name, black_name, winner, reason, rated, category,
              time_sec, increment_sec, completed_at
       FROM games ORDER BY completed_at DESC LIMIT 12`,
    )
    .all<{
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
    }>();

  return NextResponse.json({
    games: rows.results.map((game) => ({
      id: game.id,
      whiteName: game.white_name,
      blackName: game.black_name,
      winner: game.winner,
      reason: game.reason,
      rated: !!game.rated,
      category: game.category ?? categoryForTimeControl(game.time_sec, game.increment_sec),
      completedAt: game.completed_at,
    })),
  });
}
