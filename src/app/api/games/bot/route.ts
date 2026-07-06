import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/social";

export const dynamic = "force-dynamic";

// Bot games are played entirely client-side, so they have no row in `games`.
// The client pings this once per finished bot game and we keep a simple
// counter, which the site-wide "games played" stat folds in. A valid session
// (guest sessions count) is required so the public counter cannot be inflated
// by an anonymous loop of empty POSTs.
export async function POST(request: Request) {
  const guard = await requireUser(request);
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;
  await db
    .prepare(
      `INSERT INTO site_counters (key, value) VALUES ('bot_games', 1)
       ON CONFLICT(key) DO UPDATE SET value = value + 1`,
    )
    .run();
  return NextResponse.json({ ok: true });
}
