import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { pgFirst } from "@/lib/server/pg";

export const dynamic = "force-dynamic";

// The most recently finished game, for the home hero and TV fallback: when
// nothing is being played live, the board shows the latest archived game
// instead. `?mode=nerf|buff` narrows to that pool (mode games record their
// mode in the `category` rating bucket column). The game archive is on
// Postgres; player avatars are on D1, so this is a two-step read (no
// cross-database join).
export async function GET(request: Request) {
  const rawMode = new URL(request.url).searchParams.get("mode");
  const mode = rawMode === "nerf" || rawMode === "buff" ? rawMode : null;
  const game = await pgFirst<{
    id: string;
    white_name: string;
    black_name: string;
    white_user_id: string | null;
    black_user_id: string | null;
    white_rating_before: number | null;
    black_rating_before: number | null;
    moves: string;
    winner: string | null;
    reason: string;
    completed_at: number;
  }>(
    `SELECT id, white_name, black_name, white_user_id, black_user_id,
            white_rating_before, black_rating_before,
            moves, winner, reason, completed_at
     FROM games ${mode ? "WHERE category = ?" : ""}
     ORDER BY completed_at DESC LIMIT 1`,
    mode ? [mode] : [],
  );

  if (!game) return NextResponse.json({ game: null });

  const ids = [game.white_user_id, game.black_user_id].filter((id): id is string => !!id);
  const avatars = new Map<string, string | null>();
  if (ids.length) {
    const db = await getDb();
    const rows = await db
      .prepare(`SELECT id, avatar FROM users WHERE id IN (${ids.map(() => "?").join(",")})`)
      .bind(...ids)
      .all<{ id: string; avatar: string | null }>();
    for (const row of rows.results) avatars.set(row.id, row.avatar);
  }

  return NextResponse.json({
    game: {
      id: game.id,
      white_name: game.white_name,
      black_name: game.black_name,
      white_rating_before: game.white_rating_before,
      black_rating_before: game.black_rating_before,
      moves: game.moves,
      winner: game.winner,
      reason: game.reason,
      completed_at: game.completed_at,
      white_avatar: game.white_user_id ? avatars.get(game.white_user_id) ?? null : null,
      black_avatar: game.black_user_id ? avatars.get(game.black_user_id) ?? null : null,
    },
  });
}
