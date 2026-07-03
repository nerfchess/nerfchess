import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

// Site-wide counters for the home page.
export async function GET() {
  const db = await getDb();
  const row = await db.prepare("SELECT COUNT(*) AS n FROM games").first<{ n: number }>();
  return NextResponse.json({ gamesPlayed: row?.n ?? 0 });
}
