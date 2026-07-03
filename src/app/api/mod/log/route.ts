import { NextResponse } from "next/server";
import { requireMod } from "@/lib/server/mod";

export const dynamic = "force-dynamic";

// GET: the moderation audit log, newest first.
export async function GET(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;

  const rows = await db
    .prepare(
      `SELECT mod_name, target_name, action, expires_at, note, created_at
       FROM mod_actions ORDER BY created_at DESC LIMIT 200`,
    )
    .all();
  return NextResponse.json({ log: rows.results });
}
