import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

// Bot games are played entirely client-side, so they have no row in `games`.
// The client pings this once per finished bot game and we keep a simple
// counter, which the site-wide "games played" stat folds in.
export async function POST() {
  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO site_counters (key, value) VALUES ('bot_games', 1)
       ON CONFLICT(key) DO UPDATE SET value = value + 1`,
    )
    .run();
  return NextResponse.json({ ok: true });
}
