import { NextResponse } from "next/server";
import { pgFirst } from "@/lib/server/pg";
import { publicDraftReplayFromColumn } from "@/lib/server/publicDraftRecord";
import { isHouseUserId } from "@/lib/server/bots";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id.trim().toUpperCase();
  if (!/^[A-Z2-9]{4,12}$/.test(id)) {
    return NextResponse.json({ error: "Bad game id." }, { status: 400 });
  }
  // The game archive lives on Postgres (OCI, via Hyperdrive), not D1. Select the
  // full draft record too, so an archived draft game replays through the exact
  // spectator engine path (board rewrites reproduced) instead of a truncated
  // moves-only replay.
  const row = await pgFirst<Record<string, unknown>>(
    `SELECT id, white_name, black_name, white_nerf_id, black_nerf_id,
            time_sec, increment_sec, moves, winner, reason, rated, ruleset,
            category, seed, replay_version, draft_record,
            white_user_id, black_user_id,
            white_rating_before, white_rating_after, black_rating_before, black_rating_after,
            started_at, completed_at
     FROM games WHERE id = ?`,
    [id],
  );
  if (!row) return NextResponse.json({ error: "Game not found." }, { status: 404 });
  // House-bot seats are labeled in replays too; only the boolean leaves the
  // server, never the raw user id.
  const whiteHouseBot = isHouseUserId(row.white_user_id as string | null | undefined);
  const blackHouseBot = isHouseUserId(row.black_user_id as string | null | undefined);
  delete row.white_user_id;
  delete row.black_user_id;
  // Convert the stored draft record into the SAME spectator-safe public action
  // stream a live watcher gets (raw grant/reroll actions are never exposed;
  // draft_record may be a JSON string on D1 or an object from Postgres jsonb).
  const replay = publicDraftReplayFromColumn(row.draft_record);
  // Never leak the raw record (it carries owner-only grant actions).
  delete row.draft_record;
  const game = {
    ...row,
    white_house_bot: whiteHouseBot,
    black_house_bot: blackHouseBot,
    ...(replay ? { dtActions: replay.dtActions, ...(replay.mode ? { mode: replay.mode } : {}) } : {}),
  };
  return NextResponse.json({ game });
}
