import { NextResponse } from "next/server";
import { requireMod } from "@/lib/server/mod";

export const dynamic = "force-dynamic";

// GET: report queue for moderators, newest first. ?status=open (default),
// resolved, dismissed, or all.
export async function GET(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;

  const status = new URL(request.url).searchParams.get("status") ?? "open";
  const where = ["open", "resolved", "dismissed"].includes(status) ? "WHERE status = ?" : "";
  const stmt = db.prepare(
    `SELECT id, reporter_name, reported_user_id, reported_name, reason, description, game_id, status,
            handled_by, handled_at, created_at
     FROM reports ${where} ORDER BY created_at DESC LIMIT 100`,
  );
  const rows = await (where ? stmt.bind(status) : stmt).all();
  return NextResponse.json({ reports: rows.results });
}

// POST { id, status: "resolved" | "dismissed" }: close out a report.
export async function POST(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const { db, mod } = guard;

  let body: { id?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  const status = body.status === "resolved" || body.status === "dismissed" ? body.status : null;
  if (!id || !status) return NextResponse.json({ error: "id and status are required." }, { status: 400 });

  const result = await db
    .prepare("UPDATE reports SET status = ?, handled_by = ?, handled_at = ? WHERE id = ?")
    .bind(status, mod.username, Date.now(), id)
    .run();
  if (!result.meta.changes) return NextResponse.json({ error: "Report not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
