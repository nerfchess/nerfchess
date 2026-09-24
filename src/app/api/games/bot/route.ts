import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/social";
import { assertSameOrigin, rateLimit } from "@/lib/server/request";

export const dynamic = "force-dynamic";

// A bot game takes minutes; more pings than this from one account in an hour
// are a loop inflating the public counter, not games (F070).
const WINDOW_MS = 60 * 60 * 1000;
const WINDOW_MAX = 30;

// Bot games are played entirely client-side, so they have no row in `games`.
// The client pings this once per finished bot game and we keep a simple
// counter, which the site-wide "games played" stat folds in. A valid session
// (guest sessions count) is required so the public counter cannot be inflated
// by an anonymous loop of empty POSTs, and each account is metered.
export async function POST(request: Request) {
  const refused = assertSameOrigin(request);
  if (refused) return refused;
  const guard = await requireUser(request);
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;
  const limit = await rateLimit(db, `botgame:${user.id}`, WINDOW_MAX, WINDOW_MS);
  // Over the limit the ping is acknowledged but not counted; the client
  // ignores the answer either way.
  if (!limit.ok) return NextResponse.json({ ok: false, counted: false }, { status: 429 });
  await db
    .prepare(
      `INSERT INTO site_counters (key, value) VALUES ('bot_games', 1)
       ON CONFLICT(key) DO UPDATE SET value = value + 1`,
    )
    .run();
  return NextResponse.json({ ok: true });
}
