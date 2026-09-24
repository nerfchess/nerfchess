import { NextResponse } from "next/server";
import { requireMod } from "@/lib/server/mod";
import { getOnlineNow, getSiteMetrics } from "@/lib/server/metrics";
import { PRIVATE_NO_STORE } from "@/lib/server/request";

export const dynamic = "force-dynamic";

// GET: the site's user and game counts for moderators, each with its written
// definition (src/lib/server/metrics.ts is the single source of truth). The
// database part is reused for up to a minute; the online figures are live.
export async function GET(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const [metrics, online] = await Promise.all([getSiteMetrics(guard.db), getOnlineNow()]);
  return NextResponse.json({ ...metrics, online }, { headers: { "cache-control": PRIVATE_NO_STORE } });
}
