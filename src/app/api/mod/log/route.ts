import { NextResponse } from "next/server";
import { requireMod } from "@/lib/server/mod";

export const dynamic = "force-dynamic";

const KINDS = new Set(["user", "report", "chat_flag", "card", "house", "persona", "setting", "webhook"]);

// GET ?kind=<target kind>: the moderation audit log, newest first. Every mod
// write lands here (F116): sanctions, report and flag triage, card overrides,
// house settings, persona and rating edits, the god-panel switch. before_json
// and after_json carry the values an edit replaced and wrote.
export async function GET(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;

  const kind = new URL(request.url).searchParams.get("kind");
  const cols = `mod_name, target_name, action, expires_at, note, created_at, target_kind, target_ref, before_json, after_json`;
  const stmt =
    kind && KINDS.has(kind)
      ? db.prepare(`SELECT ${cols} FROM mod_actions WHERE target_kind = ? ORDER BY created_at DESC LIMIT 200`).bind(kind)
      : db.prepare(`SELECT ${cols} FROM mod_actions ORDER BY created_at DESC LIMIT 200`);
  const rows = await stmt.all();
  return NextResponse.json({ log: rows.results });
}
