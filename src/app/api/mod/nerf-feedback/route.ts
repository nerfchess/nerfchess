import { NextResponse } from "next/server";
import { requireMod } from "@/lib/server/mod";

export const dynamic = "force-dynamic";

// Aggregated rule feedback for the moderation panel: per-rule thumbs up and
// down totals plus the most recent individual votes.
export async function GET(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;

  const totals = await db
    .prepare(
      `SELECT nerf_id,
              SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END) AS up,
              SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END) AS down,
              MAX(created_at) AS last_at
       FROM nerf_feedback GROUP BY nerf_id
       ORDER BY (SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END) + SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END)) DESC
       LIMIT 200`,
    )
    .all<{ nerf_id: string; up: number; down: number; last_at: number }>();

  const recent = await db
    .prepare(
      `SELECT nerf_id, vote, username, game_id, created_at
       FROM nerf_feedback ORDER BY created_at DESC LIMIT 30`,
    )
    .all<{ nerf_id: string; vote: number; username: string | null; game_id: string | null; created_at: number }>();

  return NextResponse.json({ totals: totals.results, recent: recent.results });
}
