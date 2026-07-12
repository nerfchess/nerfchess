import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, getEnvVar } from "@/lib/server/db";
import { isHouseUserId } from "@/lib/server/bots";
import { recordFinishedGame } from "@/lib/server/games";

export const dynamic = "force-dynamic";

// POST /api/arena/end — archive + rate a finished arena (OCI bot-vs-bot) game
// WITHOUT waking the game-server Durable Object (Tier 3 / M1, see
// docs/bot-offload-tier3-direct-arena.md). This is the same recordFinishedGame
// call the DO's /arena/end runs today; the arena switches over by setting
// ARENA_END_URL to this route. Idempotent by game id (recorded_games
// INSERT-OR-IGNORE in games.ts), so arena retries and double-posts during the
// migration window are safe.
//
// Trust boundary (unchanged from /arena/end): the bearer token lets the arena
// move HOUSE-account ratings only — both seats must be house user ids, so a
// forged record can never touch a real user.

// Mirrors the DO's ArenaEndRecord (worker.ts) — the subset of the arena's
// ArenaFinishedRecord this route archives.
type Color = "w" | "b";
type StoredDraftAction =
  | { ply: number; color: Color; a: "pick"; index: number; cards: { id: string; tier: number }[] }
  | { ply: number; color: Color; a: "bank" }
  | { ply: number; color: Color; a: "use"; buffIndex: number; picks: unknown[] };
type ArenaEndRecord = {
  id: string;
  setup: { whiteNerfId: string; blackNerfId: string; seed: number; timeSec: number; incrementSec: number };
  mode: "nerf" | "buff";
  moves: string[];
  bots: Record<Color, string>;
  seats: Record<Color, { name: string }>;
  result: { winner: Color | "draw" | null; reason: string };
  startedAt: number;
  completedAt: number;
  draftSeed?: number;
  cadence?: number;
  draftActions?: StoredDraftAction[];
  replayVersion?: number;
};

// Constant-time-ish comparison so the token cannot be probed byte by byte off
// response timing. Mirrors keysMatch in /api/analytics/summary.
function tokensMatch(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

export async function POST(request: Request) {
  // Deny-by-default auth: no configured token means nobody gets in. Same
  // secret the DO's /arena handler checks (ARENA_INGEST_TOKEN).
  const expected = getEnvVar("ARENA_INGEST_TOKEN");
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!expected || !provided || !tokensMatch(expected, provided)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Same master switch as the DO path, so ingestion ships dark-compatible.
  if (getEnvVar("ARENA_INGEST_ENABLED") !== "true") {
    return NextResponse.json({ ok: false, ingest: false });
  }

  let body: { record?: ArenaEndRecord };
  try {
    body = (await request.json()) as { record?: ArenaEndRecord };
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const rec = body.record;
  if (
    !rec ||
    typeof rec.id !== "string" ||
    !isHouseUserId(rec.bots?.w) ||
    !isHouseUserId(rec.bots?.b) ||
    !rec.setup ||
    !Array.isArray(rec.moves) ||
    !rec.result
  ) {
    return NextResponse.json({ error: "bad_record" }, { status: 400 });
  }

  const db = await getDb();
  const { env } = getCloudflareContext();
  const hyperdrive = (env as { HYPERDRIVE?: Hyperdrive }).HYPERDRIVE;
  try {
    // Same call endMatch and the DO's /arena/end use — applies Glicko to both
    // house accounts and writes the archive row (PG via Hyperdrive, else D1).
    await recordFinishedGame(
      db,
      {
        id: rec.id,
        whiteUserId: rec.bots.w,
        blackUserId: rec.bots.b,
        whiteName: rec.seats.w.name,
        blackName: rec.seats.b.name,
        whiteNerfId: rec.setup.whiteNerfId,
        blackNerfId: rec.setup.blackNerfId,
        seed: rec.setup.seed,
        timeSec: rec.setup.timeSec,
        incrementSec: rec.setup.incrementSec,
        moves: rec.moves,
        winner: rec.result.winner,
        reason: rec.result.reason,
        rated: true,
        ruleset: "draft",
        ratingCategory: rec.mode,
        // Full draft record so the arena game replays from the archive alone
        // (same guard as the DO path: an older arena bundle without draft
        // fields still archives).
        ...(rec.draftSeed !== undefined && rec.draftActions
          ? {
              draftRecord: {
                mode: rec.mode,
                draftSeed: rec.draftSeed,
                ...(rec.cadence !== undefined ? { cadence: rec.cadence } : {}),
                draftActions: rec.draftActions,
              },
            }
          : {}),
        replayVersion: rec.replayVersion,
        startedAt: rec.startedAt,
        completedAt: rec.completedAt,
      },
      hyperdrive?.connectionString,
    );
  } catch (err) {
    console.error("arena end-route record failed", rec.id, err);
    return NextResponse.json({ ok: false, reason: "record_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
