import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// TV / spectator telemetry sink. The client beacons here for tune-in health,
// snapshot/version rejects, resyncs, gaps, hash mismatches, failover, and the
// profile live-preview outcome (see src/lib/telemetry/tv.ts). Mirrors the
// /api/desync discipline: we console.warn a single structured line rather than
// writing a row, so a buggy client that loops cannot bloat storage or spike a
// Durable Object. Grep the logs for "TV_TELEMETRY" to see which games / builds
// keep failing to tune or keep resyncing.
//
// Everything is defensively parsed and capped. The payload is PUBLIC by
// construction (the client only ever sends the allowlisted fields), and this
// route re-validates: it copies a fixed set of scalar fields and drops anything
// else, so even a hand-crafted POST cannot get an unexpected blob logged.
const KNOWN_EVENTS = new Set([
  "tv_tune_started",
  "tv_tune_succeeded",
  "tv_tune_failed",
  "tv_snapshot_invalid",
  "tv_snapshot_resync",
  "tv_event_gap",
  "tv_hash_mismatch",
  "tv_candidate_skipped",
  "tv_failover_succeeded",
  "tv_game_switched",
  "profile_live_preview_succeeded",
  "profile_live_preview_failed",
]);

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const str = (v: unknown, cap: number) => (typeof v === "string" ? v.slice(0, cap) : undefined);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

  const event = str(body.event, 48);
  // An unknown event name is dropped quietly so a mis-firing or forged client
  // cannot fill the logs with arbitrary strings.
  if (!event || !KNOWN_EVENTS.has(event)) {
    return NextResponse.json({ ok: true });
  }

  const hashMismatch =
    body.hashMismatch && typeof body.hashMismatch === "object"
      ? {
          expected: str((body.hashMismatch as Record<string, unknown>).expected, 16) ?? "",
          got: str((body.hashMismatch as Record<string, unknown>).got, 16) ?? "",
        }
      : undefined;

  // Fixed, public-only projection. Undefined fields are omitted from the log.
  const record: Record<string, unknown> = {
    event,
    surface: str(body.surface, 16),
    build: str(body.build, 48),
    gameId: str(body.gameId, 24),
    mode: body.mode === "nerf" || body.mode === "buff" ? body.mode : undefined,
    filter: str(body.filter, 16),
    cardId: str(body.cardId, 48),
    schemaVersion: num(body.schemaVersion),
    revision: num(body.revision),
    expectedSeq: num(body.expectedSeq),
    receivedSeq: num(body.receivedSeq),
    snapshotAgeMs: num(body.snapshotAgeMs),
    hashMismatch,
    reason: str(body.reason, 48),
    retryCount: num(body.retryCount),
    candidate: str(body.candidate, 24),
    side: str(body.side, 16),
  };
  for (const key of Object.keys(record)) {
    if (record[key] === undefined) delete record[key];
  }

  console.warn("TV_TELEMETRY " + JSON.stringify(record));
  return NextResponse.json({ ok: true });
}
