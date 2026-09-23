import { NextResponse } from "next/server";
import { pgFirst } from "@/lib/server/pg";
import { publicDraftReplayFromColumn } from "@/lib/server/publicDraftRecord";
import { apiError } from "@/lib/server/request";

export const dynamic = "force-dynamic";

// A finished game's archive row never changes once written, so a found game
// can be cached; a miss is not cached (the game may be archived moments later).
const ARCHIVE_CACHE = "public, max-age=300, s-maxage=3600";

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id.trim().toUpperCase();
  // Queue and friend codes avoid 0/O and 1/I, but arena ids are hex and use
  // every digit, so the old [A-Z2-9] pattern refused most arena replays with a
  // 400 (F073).
  if (!/^[A-Z0-9]{4,12}$/.test(id)) {
    return apiError(400, "Bad game id.");
  }
  // The game archive lives on Postgres (OCI, via Hyperdrive), not D1. Select the
  // full draft record too, so an archived draft game replays through the exact
  // spectator engine path (board rewrites reproduced) instead of a truncated
  // moves-only replay.
  const row = await pgFirst<Record<string, unknown>>(
    `SELECT id, white_name, black_name, white_nerf_id, black_nerf_id,
            time_sec, increment_sec, moves, winner, reason, rated, ruleset,
            category, seed, replay_version, draft_record,
            white_rating_before, white_rating_after, black_rating_before, black_rating_after,
            started_at, completed_at
     FROM games WHERE id = ?`,
    [id],
  );
  if (!row) return apiError(404, "Game not found.");
  // Convert the stored draft record into the SAME spectator-safe public action
  // stream a live watcher gets (raw grant/reroll actions are never exposed;
  // draft_record may be a JSON string on D1 or an object from Postgres jsonb).
  const replay = publicDraftReplayFromColumn(row.draft_record);
  // Never leak the raw record (it carries owner-only grant actions).
  delete row.draft_record;
  const game = {
    ...row,
    ...(replay ? { dtActions: replay.dtActions, ...(replay.mode ? { mode: replay.mode } : {}) } : {}),
  };
  return NextResponse.json({ game }, { headers: { "Cache-Control": ARCHIVE_CACHE } });
}
