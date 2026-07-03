import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const FORMATS = new Set(["swiss", "arena", "single-elim"]);

export async function GET() {
  const db = await getDb();
  const rows = await db
    .prepare(
      `SELECT t.id, t.name, t.description, t.creator_name, t.club_id, c.name AS club_name,
              t.format, t.starts_at, t.status, t.max_players, t.created_at,
              COUNT(te.user_id) AS players
       FROM tournaments t
       LEFT JOIN clubs c ON c.id = t.club_id
       LEFT JOIN tournament_entries te ON te.tournament_id = t.id
       GROUP BY t.id
       ORDER BY COALESCE(t.starts_at, t.created_at) ASC
       LIMIT 50`,
    )
    .all<{
      id: string;
      name: string;
      description: string;
      creator_name: string;
      club_id: string | null;
      club_name: string | null;
      format: string;
      starts_at: number | null;
      status: string;
      max_players: number;
      created_at: number;
      players: number;
    }>();
  return NextResponse.json({ tournaments: rows.results });
}

export async function POST(request: Request) {
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return NextResponse.json({ error: "Sign in to create a tournament." }, { status: 401 });

  let body: {
    name?: unknown;
    description?: unknown;
    format?: unknown;
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
  const format = typeof body.format === "string" && FORMATS.has(body.format) ? body.format : "swiss";
  const maxPlayersRaw = typeof body.maxPlayers === "number" ? body.maxPlayers : 16;
  const maxPlayers = Math.max(2, Math.min(256, Math.round(maxPlayersRaw)));
  const startsAt = typeof body.startsAt === "number" && Number.isFinite(body.startsAt) ? body.startsAt : null;
  const clubId = typeof body.clubId === "string" && body.clubId.trim() ? body.clubId.trim() : null;

  if (name.length < 3) {
    return NextResponse.json({ error: "Tournament name must be at least 3 characters." }, { status: 400 });
  }

  if (clubId) {
    const membership = await db
      .prepare("SELECT role FROM club_members WHERE club_id = ? AND user_id = ?")
      .bind(clubId, user.id)
      .first<{ role: string }>();
    if (!membership) {
      return NextResponse.json({ error: "Join that club before creating its tournaments." }, { status: 403 });
    }
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  await db.batch([
    db
      .prepare(
        `INSERT INTO tournaments (
          id, name, description, creator_user_id, creator_name, club_id,
          format, starts_at, status, max_players, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)`,
      )
      .bind(id, name, description, user.id, user.username, clubId, format, startsAt, maxPlayers, now),
    db
      .prepare("INSERT INTO tournament_entries (tournament_id, user_id, username, joined_at) VALUES (?, ?, ?, ?)")
      .bind(id, user.id, user.username, now),
  ]);

  return NextResponse.json({
    tournament: {
      id,
      name,
      description,
      creator_name: user.username,
      club_id: clubId,
      club_name: null,
      format,
      starts_at: startsAt,
      status: "scheduled",
      max_players: maxPlayers,
      created_at: now,
      players: 1,
    },
  });
}
