import { NextResponse } from "next/server";
import { requireMod } from "@/lib/server/mod";

export const dynamic = "force-dynamic";

const KINDS = new Set(["user", "report", "chat_flag", "card", "house", "persona", "setting", "webhook"]);

const PAGE = 100;

// The groups the audit log's filter chips show. The SQL mirrors kindOf() in
// src/components/mod/AuditLogSection.tsx, first match wins.
const GROUP_SQL = `CASE
  WHEN target_kind IN ('report', 'chat_flag') THEN 'queue'
  WHEN target_kind IN ('card', 'house', 'persona', 'setting', 'webhook') OR action = 'rating_set' THEN 'config'
  WHEN lower(action) LIKE '%ban%' THEN 'ban'
  WHEN lower(action) LIKE '%mute%' THEN 'mute'
  WHEN lower(action) LIKE '%warn%' THEN 'warn'
  WHEN lower(action) LIKE '%role%' OR lower(action) LIKE '%name%' THEN 'role'
  ELSE NULL END`;
const GROUPS = new Set(["queue", "config", "ban", "mute", "warn", "role"]);

// GET: the moderation audit log, newest first, one page at a time. Every mod
// write lands here (F116): sanctions, report and flag triage, card overrides,
// house settings, persona and rating edits, the god-panel switch. before_json
// and after_json carry the values an edit replaced and wrote.
//
//   ?kind=<target kind>   rows about one kind of target (indexed)
//   ?group=<chip>         the filter chips: ban, mute, warn, role, queue, config
//   ?q=<text>             moderator, target, action, note or reference contains
//   ?before=<ms>&beforeId=<id>   the page after the one that ended there
//
// The answer carries `next` ({ before, beforeId }) while older rows remain, so
// the whole log can be searched, not just the latest page.
export async function GET(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;

  const params = new URL(request.url).searchParams;
  const where: string[] = [];
  const binds: (string | number)[] = [];

  const kind = params.get("kind");
  if (kind && KINDS.has(kind)) {
    where.push("target_kind = ?");
    binds.push(kind);
  }
  const group = params.get("group");
  if (group && GROUPS.has(group)) {
    where.push(`(${GROUP_SQL}) = ?`);
    binds.push(group);
  }
  const q = (params.get("q") ?? "").trim().toLowerCase().slice(0, 80);
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    where.push(
      `(${["mod_name", "target_name", "action", "note", "target_ref"]
        .map((c) => `lower(coalesce(${c}, '')) LIKE ? ESCAPE '\\'`)
        .join(" OR ")})`,
    );
    for (let i = 0; i < 5; i++) binds.push(like);
  }
  const before = Number(params.get("before"));
  const beforeId = params.get("beforeId") ?? "";
  if (Number.isFinite(before) && before > 0) {
    // id breaks ties, so rows written in the same millisecond are never skipped.
    where.push("(created_at < ? OR (created_at = ? AND id < ?))");
    binds.push(before, before, beforeId);
  }

  const cols = `id, mod_name, target_name, action, expires_at, note, created_at, target_kind, target_ref, before_json, after_json`;
  const sql =
    `SELECT ${cols} FROM mod_actions` +
    (where.length ? ` WHERE ${where.join(" AND ")}` : "") +
    ` ORDER BY created_at DESC, id DESC LIMIT ${PAGE + 1}`;
  const rows = (await db.prepare(sql).bind(...binds).all<{ id: string; created_at: number }>()).results ?? [];
  const page = rows.slice(0, PAGE);
  const last = page[page.length - 1];
  const next = rows.length > PAGE && last ? { before: last.created_at, beforeId: last.id } : null;
  return NextResponse.json({ log: page, next });
}
