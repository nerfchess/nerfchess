import { NextResponse } from "next/server";
import { applyModAction, findUserByName, requireMod, MOD_ACTIONS, type ModAction } from "@/lib/server/mod";

export const dynamic = "force-dynamic";

// GET ?q=name: look up players with their moderation state. An exact match
// also returns their recent mod history and reports filed against them.
export async function GET(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().toLowerCase();
  if (!q) return NextResponse.json({ users: [], history: [], reports: [] });

  const users = await db
    .prepare(
      `SELECT id, username, role, rating, games, created_at, muted_until, banned_until
       FROM users WHERE username_lower LIKE ? ORDER BY username_lower LIMIT 10`,
    )
    .bind(`${q.replace(/[%_]/g, "")}%`)
    .all();

  const exact = await findUserByName(db, q);
  let history: unknown[] = [];
  let reports: unknown[] = [];
  if (exact) {
    const h = await db
      .prepare(
        `SELECT mod_name, action, expires_at, note, created_at
         FROM mod_actions WHERE target_user_id = ? ORDER BY created_at DESC LIMIT 20`,
      )
      .bind(exact.id)
      .all();
    history = h.results;
    const r = await db
      .prepare(
        `SELECT reporter_name, reason, description, status, created_at
         FROM reports WHERE reported_user_id = ? ORDER BY created_at DESC LIMIT 20`,
      )
      .bind(exact.id)
      .all();
    reports = r.results;
  }

  return NextResponse.json({ users: users.results, history, reports });
}

// POST { username, action, durationMs?, note?, role? }: apply a moderation
// action (warn / mute / unmute / ban / unban / set_role).
export async function POST(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const { db, mod } = guard;

  let body: { username?: unknown; action?: unknown; durationMs?: unknown; note?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

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
