import { NextResponse } from "next/server";
import { queryRecentGames } from "@/lib/server/recentGames";
import { PUBLIC_SHORT_CACHE } from "@/lib/server/request";

export const dynamic = "force-dynamic";

// The latest finished games, for the community hub's "Recent games" list. The
// query is shared with the /community server shell (src/lib/server/recentGames.ts).
export async function GET() {
  const games = await queryRecentGames();
  return NextResponse.json({ games }, { headers: { "Cache-Control": PUBLIC_SHORT_CACHE } });
}
