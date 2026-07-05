import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

// The signed-in player's own game archive, newest first. This is the
// account-backed replacement for the device-local history: online and friend
// games are recorded server-side (see recordFinishedGame), so they follow the
// account across devices. Anonymous callers get authenticated:false and the
// client falls back to localStorage.
export async function GET(request: Request) {
  const db = await getDb();
  const user = await userForSession(
    db,
    sessionTokenFromCookieHeader(request.headers.get("cookie")),
  );
  if (!user) return NextResponse.json({ authenticated: false, games: [] });

  const rows = await db
    .prepare(
      `SELECT id, white_name, black_name, white_user_id, black_user_id,
              white_nerf_id, black_nerf_id, winner, reason, rated,
              white_rating_before, white_rating_after,
              black_rating_before, black_rating_after,
              time_sec, increment_sec, moves, completed_at
       FROM games
       WHERE white_user_id = ? OR black_user_id = ?
       ORDER BY completed_at DESC LIMIT 100`,
    )
    .bind(user.id, user.id)
    .all();

  return NextResponse.json({ authenticated: true, userId: user.id, games: rows.results });
}
