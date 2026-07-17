import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { pgAll } from "@/lib/server/pg";

export const dynamic = "force-dynamic";

// The most recently finished games, for the home hero and TV fallback: when
// nothing is being played live, the board reruns archived games instead.
// `?mode=nerf|buff` narrows to that pool (mode games record their mode in the
// `category` rating bucket column). `?limit=N` (1-12, default 1) sizes the
// pool the TV rerun channel draws its random replays from; `game` (the
// newest) stays in the response for older callers. The game archive is on
// Postgres; player avatars are on D1, so this is a two-step read (no
// cross-database join).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawMode = url.searchParams.get("mode");
  const mode = rawMode === "nerf" || rawMode === "buff" ? rawMode : null;
  const rawLimit = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(rawLimit) ? Math.min(12, Math.max(1, Math.floor(rawLimit))) : 1;
  const rows = await pgAll<{
    id: string;
    white_name: string;
    black_name: string;
    white_user_id: string | null;
    black_user_id: string | null;
    white_rating_before: number | null;
    black_rating_before: number | null;
    moves: string;
    category: string | null;
    winner: string | null;
    reason: string;
    completed_at: number;
  }>(
    `SELECT id, white_name, black_name, white_user_id, black_user_id,
            white_rating_before, black_rating_before,
            moves, category, winner, reason, completed_at
     FROM games ${mode ? "WHERE category = ?" : ""}
     ORDER BY completed_at DESC LIMIT ?`,
    mode ? [mode, limit] : [limit],
  );

  if (rows.length === 0) return NextResponse.json({ game: null, games: [] });

  const ids = [
    ...new Set(
      rows
        .flatMap((game) => [game.white_user_id, game.black_user_id])
        .filter((id): id is string => !!id),
    ),
  ];
  const avatars = new Map<string, string | null>();
  if (ids.length) {
    const db = await getDb();
    const users = await db
      .prepare(`SELECT id, avatar FROM users WHERE id IN (${ids.map(() => "?").join(",")})`)
      .bind(...ids)
      .all<{ id: string; avatar: string | null }>();
    for (const row of users.results) avatars.set(row.id, row.avatar);
  }

  const games = rows.map((game) => ({
    id: game.id,
    white_name: game.white_name,
    black_name: game.black_name,
    white_rating_before: game.white_rating_before,
    black_rating_before: game.black_rating_before,
    moves: game.moves,
    category: game.category,
    winner: game.winner,
    reason: game.reason,
    completed_at: game.completed_at,
    white_avatar: game.white_user_id ? avatars.get(game.white_user_id) ?? null : null,
    black_avatar: game.black_user_id ? avatars.get(game.black_user_id) ?? null : null,
  }));

  return NextResponse.json({ game: games[0], games });
}
