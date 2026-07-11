import { NextResponse } from "next/server";
import { pgFirst } from "@/lib/server/pg";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id.trim().toUpperCase();
  if (!/^[A-Z2-9]{4,12}$/.test(id)) {
    return NextResponse.json({ error: "Bad game id." }, { status: 400 });
  }
  // The game archive lives on Postgres (OCI, via Hyperdrive), not D1.
  const row = await pgFirst(
    `SELECT id, white_name, black_name, white_nerf_id, black_nerf_id,
            time_sec, increment_sec, moves, winner, reason, rated, ruleset,
            white_rating_before, white_rating_after, black_rating_before, black_rating_after,
            started_at, completed_at
     FROM games WHERE id = ?`,
    [id],
  );
  if (!row) return NextResponse.json({ error: "Game not found." }, { status: 404 });
  return NextResponse.json({ game: row });
}
