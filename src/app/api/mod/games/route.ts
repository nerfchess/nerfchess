import { NextResponse } from "next/server";
import { requireMod } from "@/lib/server/mod";
import { pgAll } from "@/lib/server/pg";
import {
  HUMAN_GAME_SQL,
  classifySeat,
  guestIdSet,
  moveCountFromText,
  seatKindFromId,
  type SeatKind,
} from "@/lib/server/modGames";

export const dynamic = "force-dynamic";

// Moderator view of recent HUMAN games: every archived game where at least one
// seat was a person (registered member, guest account, or an anonymous seat) —
// which includes human-vs-house-bot games and excludes pure bot-vs-bot filler.
// Reads the games archive through pgAll, so the same query serves both storage
// paths (Postgres via Hyperdrive in prod, the D1 fallback in dev). Guest /
// member classification always comes from D1, where the users table lives.
//
// GET /api/mod/games?limit=25&before=<completed_at ms>   (limit capped at 100)

interface ArchivedGameRow {
  id: string;
  white_user_id: string | null;
  black_user_id: string | null;
  white_name: string;
  black_name: string;
  time_sec: number;
  increment_sec: number;
  moves: string;
  winner: "w" | "b" | "draw" | null;
  reason: string;
  rated: number;
  category: string | null;
  ruleset: string | null;
  white_rating_before: number | null;
  white_rating_after: number | null;
  black_rating_before: number | null;
  black_rating_after: number | null;
  started_at: number;
  completed_at: number;
}

interface ModGameSeat {
  name: string;
  userId: string | null;
  kind: SeatKind;
  ratingBefore: number | null;
  ratingAfter: number | null;
}

export async function GET(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;

  const params = new URL(request.url).searchParams;
  const rawLimit = Number(params.get("limit") ?? 25);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, Math.floor(rawLimit))) : 25;
  const rawBefore = Number(params.get("before"));
  const before = Number.isFinite(rawBefore) && rawBefore > 0 ? Math.floor(rawBefore) : null;

  const rows = await pgAll<ArchivedGameRow>(
    `SELECT id, white_user_id, black_user_id, white_name, black_name,
            time_sec, increment_sec, moves, winner, reason, rated, category, ruleset,
            white_rating_before, white_rating_after, black_rating_before, black_rating_after,
            started_at, completed_at
     FROM games
     WHERE ${HUMAN_GAME_SQL}${before ? " AND completed_at < ?" : ""}
     ORDER BY completed_at DESC
     LIMIT ?`,
    before ? [before, limit] : [limit],
  );

  // Split guests from members for every seat id whose shape alone (anon /
  // house) doesn't decide it. One chunked D1 lookup for the whole page.
  const needLookup = rows
    .flatMap((row) => [row.white_user_id, row.black_user_id])
    .filter((id): id is string => !!id && seatKindFromId(id) === null);
  const guests = await guestIdSet(db, needLookup);

  const seat = (
    userId: string | null,
    name: string,
    ratingBefore: number | null,
    ratingAfter: number | null,
  ): ModGameSeat => ({
    name,
    userId,
    kind: classifySeat(userId, guests),
    ratingBefore,
    ratingAfter,
  });

  const games = rows.map((row) => {
    const moveCount = moveCountFromText(row.moves);
    return {
      id: row.id,
      white: seat(row.white_user_id, row.white_name, row.white_rating_before, row.white_rating_after),
      black: seat(row.black_user_id, row.black_name, row.black_rating_before, row.black_rating_after),
      winner: row.winner,
      reason: row.reason,
      rated: !!row.rated,
      ruleset: row.ruleset ?? "classic",
      category: row.category,
      timeSec: row.time_sec,
      incrementSec: row.increment_sec,
      moveCount,
      // Games archived without their move text can't be replayed; the list
      // row still renders, the replay link just hides.
      replayable: moveCount > 0,
      durationMs: Math.max(0, row.completed_at - row.started_at),
      startedAt: row.started_at,
      completedAt: row.completed_at,
    };
  });

  return NextResponse.json({
    games,
    // Cursor for the next page: pass back as ?before=. Null when this page
    // came up short, i.e. the archive is exhausted.
    nextBefore: rows.length === limit ? rows[rows.length - 1].completed_at : null,
  });
}
