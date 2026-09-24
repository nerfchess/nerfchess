import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";
import { isTournamentFormat, isTournamentMode, tournamentPhase, type TournamentPhase } from "@/lib/tournaments";
import { censorText, findProfanity } from "@/lib/profanity";
import { cleanText, codePointLength, TEXT_POLICIES } from "@/lib/textInput";
import { mutedRefusal } from "@/lib/server/social";
import { apiError, guardJsonWrite, rateLimit, tooManyRequests } from "@/lib/server/request";
import { clockWithin, TOURNAMENT_CLOCK } from "@/lib/clockBounds";

export const dynamic = "force-dynamic";

// Creation limits (F060): a handful of new events per account per day, and a
// start time that is plausibly a real schedule.
const CREATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const CREATE_WINDOW_MAX = 5;
const START_PAST_SLACK_MS = 24 * 60 * 60 * 1000;
const START_MAX_AHEAD_MS = 90 * 24 * 60 * 60 * 1000;

// One row in the tournaments directory. `phase` is derived at read time from
// starts_at + duration_min (see src/lib/tournaments.ts), so the sections stay
// live without a status scheduler.
export type TournamentListRow = {
  id: string;
  name: string;
  description: string;
  creator_name: string;
  club_id: string | null;
  club_name: string | null;
  format: string;
  mode: string;
  rated: number;
  clock_time_sec: number;
  clock_increment_sec: number;
  duration_min: number;
  starts_at: number | null;
  max_players: number;
  created_at: number;
  status: string;
  players: number;
  phase: TournamentPhase;
};

type TournamentDbRow = Omit<TournamentListRow, "phase">;

export async function GET() {
  const db = await getDb();
  const rows = await db
    .prepare(
      `SELECT t.id, t.name, t.description, t.creator_name, t.club_id, c.name AS club_name,
              t.format, t.mode, t.rated, t.clock_time_sec, t.clock_increment_sec, t.duration_min,
              t.starts_at, t.max_players, t.created_at, t.status,
              COUNT(te.user_id) AS players
       FROM tournaments t
       LEFT JOIN clubs c ON c.id = t.club_id
       LEFT JOIN tournament_entries te ON te.tournament_id = t.id
       GROUP BY t.id
       ORDER BY COALESCE(t.starts_at, t.created_at) DESC
       LIMIT 100`,
    )
    .all<TournamentDbRow>();

  const now = Date.now();
  // Hide staff testing events ("test"/"testing" in the name) from the public
  // directory; the rows stay in the DB for the people running them.
  const tournaments: TournamentListRow[] = rows.results
    .filter((row) => !/\btest(ing)?\b/i.test(row.name))
    .map((row) => ({
      ...row,
      // A tournament that finished its configured rounds early carries
      // status 'finished' before its duration window closes.
      phase:
        row.status === "finished"
          ? ("finished" as TournamentPhase)
          : tournamentPhase(row.starts_at, row.duration_min, now),
    }));
  return NextResponse.json({ tournaments });
}

export async function POST(request: Request) {
  const body = await guardJsonWrite(request);
  if (body instanceof NextResponse) return body;
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return apiError(401, "Sign in to create a tournament.");
  // Tournaments are public listings: muted players and players whose name a
  // moderator flagged cannot open one (F060).
  const muted = mutedRefusal(user, "create tournaments");
  if (muted) return muted;
  if (user.name_flagged) return apiError(403, "Pick a new username before creating a tournament.");

  const name = cleanText(body.name, TEXT_POLICIES.tournamentName);
  const description = censorText(cleanText(body.description, TEXT_POLICIES.tournamentDescription));
  const format = isTournamentFormat(body.format) ? body.format : "arena";
  const mode = isTournamentMode(body.mode) ? body.mode : "nerf";
  const rated = body.rated === true || body.rated === 1 ? 1 : 0;
  // The clock must be one the game server will run (F078): it refuses a base
  // over 2 hours, so a 3 hour event used to create only void boards. Missing
  // fields keep their defaults; present ones are rounded and checked.
  const clockTimeSec = roundOr(body.clockTimeSec, 180);
  const clockIncrementSec = roundOr(body.clockIncrementSec, 0);
  if (!clockWithin(clockTimeSec, clockIncrementSec, TOURNAMENT_CLOCK)) {
    return apiError(400, "Pick a time control of at most 2 hours plus 3 minutes a move.");
  }
  const durationMin = clampInt(body.durationMin, 5, 720, 60);
  // Configured round count; 0 = as many rounds as fit the duration window
  // (the tournament engine stops pairing when the clock runs out either way).
  const roundsTotal = clampInt(body.roundsTotal, 0, 15, 0);
  const maxPlayers = clampInt(body.maxPlayers, 2, 256, 16);
  let startsAt: number | null = null;
  if (body.startsAt != null) {
    const now = Date.now();
    const at = typeof body.startsAt === "number" && Number.isFinite(body.startsAt) ? Math.round(body.startsAt) : NaN;
    if (!(at >= now - START_PAST_SLACK_MS && at <= now + START_MAX_AHEAD_MS)) {
      return apiError(400, "Pick a start time within the next 90 days.");
    }
    startsAt = at;
  }
  const clubId =
    typeof body.clubId === "string" && body.clubId.trim() && body.clubId.length <= 64 ? body.clubId.trim() : null;

  if (codePointLength(name) < 3) {
    return apiError(400, "Tournament name must be at least 3 characters.");
  }
  if (findProfanity(name).length > 0) return apiError(400, "Pick a different tournament name.");
  if (clockTimeSec === 0 && clockIncrementSec === 0) {
    return apiError(400, "Pick a time control with a clock.");
  }

  let clubName: string | null = null;
  if (clubId) {
    const club = await db
      .prepare(
        `SELECT c.name AS name, cm.role AS role
         FROM clubs c
         LEFT JOIN club_members cm ON cm.club_id = c.id AND cm.user_id = ?
         WHERE c.id = ?`,
      )
      .bind(user.id, clubId)
      .first<{ name: string; role: string | null }>();
    if (!club) return apiError(404, "That club does not exist.");
    if (!club.role) {
      return apiError(403, "Join that club before creating its tournaments.");
    }
    clubName = club.name;
  }

  const limit = await rateLimit(db, `tournament:create:${user.id}`, CREATE_WINDOW_MAX, CREATE_WINDOW_MS);
  if (!limit.ok) return tooManyRequests("You have created a lot of tournaments today. Try again tomorrow.", limit.retryAfterSec);

  const id = crypto.randomUUID();
  const now = Date.now();
  await db.batch([
    db
      .prepare(
        `INSERT INTO tournaments (
          id, name, description, creator_user_id, creator_name, club_id,
          format, mode, rated, clock_time_sec, clock_increment_sec, duration_min,
          rounds_total, starts_at, status, max_players, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)`,
      )
      .bind(
        id,
        name,
        description,
        user.id,
        user.username,
        clubId,
        format,
        mode,
        rated,
        clockTimeSec,
        clockIncrementSec,
        durationMin,
        roundsTotal,
        startsAt,
        maxPlayers,
        now,
      ),
    // The creator is entered automatically, the way lichess seats the host.
    db
      .prepare(
        "INSERT INTO tournament_entries (tournament_id, user_id, username, joined_at) VALUES (?, ?, ?, ?)",
      )
      .bind(id, user.id, user.username, now),
  ]);

  const tournament: TournamentListRow = {
    id,
    name,
    description,
    creator_name: user.username,
    club_id: clubId,
    club_name: clubName,
    format,
    mode,
    rated,
    clock_time_sec: clockTimeSec,
    clock_increment_sec: clockIncrementSec,
    duration_min: durationMin,
    starts_at: startsAt,
    max_players: maxPlayers,
    created_at: now,
    status: "scheduled",
    players: 1,
    phase: tournamentPhase(startsAt, durationMin, now),
  };
  return NextResponse.json({ tournament });
}

/** A present number rounded, a missing one defaulted; anything else is NaN (refused by the caller). */
function roundOr(value: unknown, fallback: number): number {
  if (value === undefined || value === null) return fallback;
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : NaN;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.max(min, Math.min(max, n));
}
