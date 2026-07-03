import { NextResponse } from "next/server";
import { requireMod } from "@/lib/server/mod";

export const dynamic = "force-dynamic";

// GET: player-submitted rule ideas, newest first.
export async function GET(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;

  const rows = await db
    .prepare(
      `SELECT id, name, description, contact, username, created_at
       FROM rule_suggestions ORDER BY created_at DESC LIMIT 200`,
    )
    .all();
  return NextResponse.json({ suggestions: rows.results });
}
