import { NextResponse } from "next/server";
import { logModEvent, readModBody, requireMod } from "@/lib/server/mod";

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
            handled_by, handled_at, handled_note, created_at
     FROM reports ${where} ORDER BY created_at DESC LIMIT 100`,
  );
  const rows = await (where ? stmt.bind(status) : stmt).all();
  return NextResponse.json({ reports: rows.results });
}

// POST { id, status: "resolved" | "dismissed", note? }: close out an open
// report. A report closes once (F127): a second moderator gets 409 instead of
// silently overwriting who handled it. A moderator cannot close a report filed
// against themselves. The note is kept on the report and in the audit log.
export async function POST(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const { db, mod } = guard;

  const body = await readModBody(request);
  if (body instanceof NextResponse) return body;
  const id = typeof body.id === "string" ? body.id.slice(0, 80) : "";
  const status = body.status === "resolved" || body.status === "dismissed" ? body.status : null;
  if (!id || !status) return NextResponse.json({ error: "id and status are required." }, { status: 400 });
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : null;

  const report = await db
    .prepare("SELECT id, reported_user_id, reported_name, reason, status, handled_by FROM reports WHERE id = ?")
    .bind(id)
    .first<{ id: string; reported_user_id: string; reported_name: string; reason: string; status: string; handled_by: string | null }>();
  if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
  if (report.reported_user_id === mod.id) {
    return NextResponse.json({ error: "A report about you is for another moderator." }, { status: 403 });
  }
  // Conditional on still being open, so two moderators racing on the same card
  // cannot both win.
  const result = await db
    .prepare("UPDATE reports SET status = ?, handled_by = ?, handled_at = ?, handled_note = ? WHERE id = ? AND status = 'open'")
    .bind(status, mod.username, Date.now(), note, id)
    .run();
  if (!result.meta.changes) {
    return NextResponse.json(
      { error: `Already ${report.status}${report.handled_by ? ` by ${report.handled_by}` : ""}.` },
      { status: 409 },
    );
  }
  await logModEvent(
    db,
    mod,
    {
      action: status === "resolved" ? "report_resolved" : "report_dismissed",
      targetKind: "report",
      targetUserId: report.reported_user_id,
      targetName: report.reported_name,
      targetRef: id,
      reason: note,
      before: { status: "open" },
      after: { status, reason: report.reason },
    },
    status === "resolved" ? "report_resolved" : "report_dismissed",
  );
  return NextResponse.json({ ok: true });
}
