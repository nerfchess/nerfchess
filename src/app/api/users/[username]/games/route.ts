import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { pgAll } from "@/lib/server/pg";
import { isModeCategory } from "@/lib/speed";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

// A player's finished-game archive with filters and cursor pagination, PG-backed
// (same source as /api/history and the profile's recentGames). Query params:
//   mode=nerf|buff       filter to one mode bucket
//   result=win|loss|draw filter to the player's outcome
//   rated=1|0            filter rated / casual
//   before=<ms>          cursor: only games completed strictly before this ts
//   limit=<n>            page size (default 30, max 50)
// Returns { games, hasMore }. Games carry the same shape as the profile's
// recentGames rows plus a `mode` (nerf/buff, or null for legacy/casual rows
// recorded under a speed bucket). Degrades to an empty page when Postgres is
// unavailable rather than failing the caller.
export async function GET(request: Request, props: { params: Promise<{ username: string }> }) {
  const params = await props.params;
  const username = params.username.trim().toLowerCase();
  const db = await getDb();
  const user = await db
    .prepare(`SELECT id FROM users WHERE username_lower = ?`)
    .bind(username)
    .first<{ id: string }>();
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const url = new URL(request.url);
  const modeParam = url.searchParams.get("mode");
  const mode = isModeCategory(modeParam) ? modeParam : null;
  const resultParam = url.searchParams.get("result");
  const result =
    resultParam === "win" || resultParam === "loss" || resultParam === "draw" ? resultParam : null;
  const ratedParam = url.searchParams.get("rated");
  const rated = ratedParam === "1" ? 1 : ratedParam === "0" ? 0 : null;
  const beforeRaw = Number(url.searchParams.get("before"));
  const before = Number.isFinite(beforeRaw) && beforeRaw > 0 ? beforeRaw : null;
  const limitRaw = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw)
    ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(limitRaw)))
    : DEFAULT_LIMIT;

  // Build the WHERE with `?` placeholders (pgAll rewrites them to $1..$n and
  // falls back to D1 with the same list). The player is white OR black; the
  // result filter resolves to whichever seat they held.
  const clauses: string[] = ["(white_user_id = ? OR black_user_id = ?)"];
  const binds: unknown[] = [user.id, user.id];
  if (mode) {
    clauses.push("category = ?");
    binds.push(mode);
  }
  if (rated != null) {
    clauses.push("rated = ?");
    binds.push(rated);
  }
  if (result === "draw") {
    clauses.push("winner = 'draw'");
  } else if (result === "win") {
    clauses.push("((white_user_id = ? AND winner = 'w') OR (black_user_id = ? AND winner = 'b'))");
    binds.push(user.id, user.id);
  } else if (result === "loss") {
    clauses.push("((white_user_id = ? AND winner = 'b') OR (black_user_id = ? AND winner = 'w'))");
    binds.push(user.id, user.id);
  }
  if (before != null) {
    clauses.push("completed_at < ?");
    binds.push(before);
  }
  // One extra row tells us whether another page exists without a COUNT.
  binds.push(limit + 1);

  type Row = {
    id: string;
    white_name: string;
    black_name: string;
    winner: string | null;
    reason: string;
    rated: number;
    category: string | null;
    ruleset: string | null;
    white_user_id: string | null;
    black_user_id: string | null;
    white_rating_before: number | null;
    white_rating_after: number | null;
    black_rating_before: number | null;
    black_rating_after: number | null;
    time_sec: number;
    increment_sec: number;
    completed_at: number;
  };

  let rows: Row[] = [];
  try {
    rows = await pgAll<Row>(
      `SELECT id, white_name, black_name, winner, reason, rated, category, ruleset,
              white_user_id, black_user_id,
              white_rating_before, white_rating_after, black_rating_before, black_rating_after,
              time_sec, increment_sec, completed_at
       FROM games
       WHERE ${clauses.join(" AND ")}
       ORDER BY completed_at DESC LIMIT ?`,
      binds,
    );
  } catch {
    // Archive unreachable (no Hyperdrive and no D1 fallback): serve empty.
    return NextResponse.json({ games: [], hasMore: false });
  }

  const hasMore = rows.length > limit;
  const games = rows.slice(0, limit).map((row) => ({
    ...row,
    // Explicit mode badge; legacy/casual rows recorded under a speed bucket
    // have no mode and report null.
    mode: isModeCategory(row.category) ? row.category : null,
  }));

  return NextResponse.json({ games, hasMore });
}
