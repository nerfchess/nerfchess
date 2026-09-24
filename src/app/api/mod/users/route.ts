import { NextResponse } from "next/server";
import { applyModAction, findUserByName, readModBody, requireMod, MOD_ACTIONS, type ModAction } from "@/lib/server/mod";
import { pgAll } from "@/lib/server/pg";
import { isBotUserId } from "@/lib/server/metrics";

/** LIKE pattern for a name prefix with %, _ and the escape itself escaped
 *  (F120: `_` used to be stripped, so "polish_u" searched "polishu%"). */
function likePrefix(q: string): string {
  return `${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

interface ContextGameRow {
  id: string;
  white_user_id: string | null;
  black_user_id: string | null;
  white_name: string;
  black_name: string;
  winner: string | null;
  reason: string;
  rated: number;
  completed_at: number;
}

// GET ?id=<user id>: everything the player detail shows, for exactly that
// account (F115): mod history, reports against and by them, recent games,
// account age, email on file, last seen.
async function userContext(db: D1Database, id: string) {
  const user = await db
    .prepare(
      `SELECT id, username, role, rating, games, created_at, muted_until, banned_until, is_guest,
              email IS NOT NULL AS has_email, last_seen_at, name_flagged
       FROM users WHERE id = ?`,
    )
    .bind(id)
    .first<Record<string, unknown>>();
  if (!user) return null;
  const [history, reports, reportsBy, games] = await Promise.all([
    db
      .prepare(
        `SELECT mod_name, action, expires_at, note, created_at
         FROM mod_actions WHERE target_user_id = ? ORDER BY created_at DESC LIMIT 20`,
      )
      .bind(id)
      .all(),
    db
      .prepare(
        `SELECT id, reporter_name, reported_name, reason, description, status, created_at
         FROM reports WHERE reported_user_id = ? ORDER BY created_at DESC LIMIT 20`,
      )
      .bind(id)
      .all(),
    db
      .prepare(
        `SELECT id, reporter_name, reported_name, reason, description, status, created_at
         FROM reports WHERE reporter_user_id = ? ORDER BY created_at DESC LIMIT 20`,
      )
      .bind(id)
      .all(),
    pgAll<ContextGameRow>(
      `SELECT * FROM (
         SELECT id, white_user_id, black_user_id, white_name, black_name, winner, reason, rated, completed_at
           FROM games WHERE white_user_id = ? ORDER BY completed_at DESC LIMIT 10
       ) w
       UNION ALL
       SELECT * FROM (
         SELECT id, white_user_id, black_user_id, white_name, black_name, winner, reason, rated, completed_at
           FROM games WHERE black_user_id = ? ORDER BY completed_at DESC LIMIT 10
       ) b`,
      [id, id],
    ).catch(() => [] as ContextGameRow[]),
  ]);
  const recentGames = games
    .sort((a, b) => Number(b.completed_at) - Number(a.completed_at))
    .slice(0, 10)
    .map((g) => {
      const white = g.white_user_id === id;
      const oppId = white ? g.black_user_id : g.white_user_id;
      const result: "win" | "loss" | "draw" =
        g.winner === "draw" || !g.winner ? "draw" : (g.winner === "w") === white ? "win" : "loss";
      return {
        id: g.id,
        opponent: white ? g.black_name : g.white_name,
        opponentIsBot: isBotUserId(oppId),
        result,
        reason: g.reason,
        rated: Number(g.rated) === 1,
        completed_at: Number(g.completed_at),
      };
    });
  return {
    user: { ...user, has_email: !!user.has_email, name_flagged: !!user.name_flagged },
    history: history.results,
    reports: reports.results,
    reportsBy: reportsBy.results,
    recentGames,
  };
}

export const dynamic = "force-dynamic";

// GET ?q=name&filter=members|guests|all: look up players with their moderation
// state. GET ?id=<user id>: that one player's context (see userContext). With no query, the default roster is the most recent
// accounts — members AND guests together (filter=all) unless a narrower
// filter is asked for, so engaged unregistered visitors are visible to mods.
export async function GET(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;

  const url = new URL(request.url);
  const id = (url.searchParams.get("id") ?? "").trim();
  if (id) {
    const ctx = await userContext(db, id.slice(0, 80));
    if (!ctx) return NextResponse.json({ error: "Player not found." }, { status: 404 });
    return NextResponse.json(ctx);
  }
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const filterParam = url.searchParams.get("filter");
  const filter: "members" | "guests" | "all" =
    filterParam === "members" || filterParam === "guests" ? filterParam : "all";
  // Appended to the WHERE clause; guests hold real hashed passwords and UUID
  // ids, so the seed-bot exclusions below never drop them.
  const guestClause =
    filter === "members" ? "AND is_guest = 0" : filter === "guests" ? "AND is_guest = 1" : "";

  if (!q) {
    // Default view: the most recently created accounts, so the panel opens on
    // a browsable roster instead of a blank box. Includes guests by default
    // (is_guest in the payload lets the UI badge them); excludes the seed
    // leaderboard bots. ?filter narrows to members or guests only.
    const recent = await db
      .prepare(
        `SELECT id, username, role, rating, games, created_at, muted_until, banned_until, is_guest
         FROM users
         WHERE id NOT LIKE 'seed\\_%' ESCAPE '\\'
           AND password_hash <> 'unusable'
           ${guestClause}
         ORDER BY created_at DESC LIMIT 30`,
      )
      .all();
    return NextResponse.json({ users: recent.results });
  }

  // Exclude the seeded leaderboard bots (id LIKE 'seed_%' AND/OR
  // password_hash = 'unusable' per migrations/0014_seed_leaderboard.sql).
  // Real registered members and guests keep real UUID ids and hashed
  // passwords, so they are unaffected.
  const users = await db
    .prepare(
      `SELECT id, username, role, rating, games, created_at, muted_until, banned_until, is_guest
       FROM users
       WHERE username_lower LIKE ? ESCAPE '\\'
         AND id NOT LIKE 'seed\\_%' ESCAPE '\\'
         AND password_hash <> 'unusable'
         ${guestClause}
       ORDER BY username_lower LIMIT 10`,
    )
    .bind(likePrefix(q.slice(0, 40)))
    .all();

  // The detail (history, reports, games) is loaded by id on selection; the
  // search answers only the list.
  return NextResponse.json({ users: users.results });
}

// POST { username, action, durationMs?, note?, role? }: apply a moderation
// action (warn / mute / unmute / ban / unban / set_role).
export async function POST(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const { db, mod } = guard;

  const body = await readModBody(request);
  if (body instanceof NextResponse) return body;

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const action = MOD_ACTIONS.includes(body.action as ModAction) ? (body.action as ModAction) : null;
  if (!username || !action) return NextResponse.json({ error: "username and action are required." }, { status: 400 });

  const target = await findUserByName(db, username);
  if (!target) return NextResponse.json({ error: "Player not found." }, { status: 404 });

  const durationMs = typeof body.durationMs === "number" && Number.isFinite(body.durationMs) ? body.durationMs : null;
  const note = typeof body.note === "string" ? body.note.slice(0, 500) : null;
  const role = typeof body.role === "string" ? body.role : undefined;

  const err = await applyModAction(db, mod, target, action, durationMs, note, role);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  return NextResponse.json({ ok: true });
}
