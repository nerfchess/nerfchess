import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";
import { isTournamentFormat, isTournamentMode, tournamentPhase, type TournamentPhase } from "@/lib/tournaments";

export const dynamic = "force-dynamic";

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
              t.starts_at, t.max_players, t.created_at,
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
  const tournaments: TournamentListRow[] = rows.results.map((row) => ({
    ...row,
    phase: tournamentPhase(row.starts_at, row.duration_min, now),
  }));
  return NextResponse.json({ tournaments });
}

export async function POST(request: Request) {
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return NextResponse.json({ error: "Sign in to create a tournament." }, { status: 401 });

  let body: {
    name?: unknown;
    description?: unknown;
    format?: unknown;
    mode?: unknown;
    rated?: unknown;
    clockTimeSec?: unknown;
    clockIncrementSec?: unknown;
    durationMin?: unknown;
    startsAt?: unknown;
    maxPlayers?: unknown;
    clubId?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Bad JSON." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 70) : "";
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 280) : "";
  const format = isTournamentFormat(body.format) ? body.format : "arena";
  const mode = isTournamentMode(body.mode) ? body.mode : "nerf";
  const rated = body.rated === true || body.rated === 1 ? 1 : 0;
  const clockTimeSec = clampInt(body.clockTimeSec, 0, 10800, 180);
  const clockIncrementSec = clampInt(body.clockIncrementSec, 0, 180, 0);
  const durationMin = clampInt(body.durationMin, 5, 720, 60);
  const maxPlayers = clampInt(body.maxPlayers, 2, 256, 16);
  const startsAt =
    typeof body.startsAt === "number" && Number.isFinite(body.startsAt) ? Math.round(body.startsAt) : null;
  const clubId = typeof body.clubId === "string" && body.clubId.trim() ? body.clubId.trim() : null;

  if (name.length < 3) {
    return NextResponse.json({ error: "Tournament name must be at least 3 characters." }, { status: 400 });
  }
  if (clockTimeSec === 0 && clockIncrementSec === 0) {
    return NextResponse.json({ error: "Pick a time control with a clock." }, { status: 400 });
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
    if (!club) return NextResponse.json({ error: "That club does not exist." }, { status: 404 });
    if (!club.role) {
      return NextResponse.json({ error: "Join that club before creating its tournaments." }, { status: 403 });
    }
    clubName = club.name;
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  await db.batch([
    db
      .prepare(
        `INSERT INTO tournaments (
          id, name, description, creator_user_id, creator_name, club_id,
          format, mode, rated, clock_time_sec, clock_increment_sec, duration_min,
          starts_at, status, max_players, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)`,
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
    players: 1,
    phase: tournamentPhase(startsAt, durationMin, now),
  };
  return NextResponse.json({ tournament });
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.max(min, Math.min(max, n));
}
