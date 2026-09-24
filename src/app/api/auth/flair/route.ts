import { NextResponse } from "next/server";
import { guardJsonWrite } from "@/lib/server/request";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";
import { isFlairEmoji, LAUREL_FLAIR } from "@/lib/flair";
import { holdsTopTenRank } from "@/lib/server/topTen";

export const dynamic = "force-dynamic";

// Sets the signed-in account's emoji flair (shown next to the username,
// like Lichess's flair). Only emoji from the curated allowlist are accepted;
// null clears it. One exception: the exclusive Laurelled flair, which may only
// be claimed while the account currently holds a top-10 leaderboard spot
// (checked here, statelessly, on every claim).
export async function POST(request: Request) {
  // Refuses cross-site browser requests (F046, login CSRF) and anything but
  // a JSON object body under 16 KB (F047: `null` used to crash the field
  // reads below with a 500). Shared with slice F: src/lib/server/request.ts.
  const parsed = await guardJsonWrite(request);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed as { flair?: unknown };

  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let flair: string | null = null;
  if (body.flair !== null && body.flair !== undefined && body.flair !== "") {
    if (body.flair === LAUREL_FLAIR) {
      if (!(await holdsTopTenRank(db, user.id))) {
        return NextResponse.json(
          { error: "The Laurelled flair is reserved for players currently in the top 10 of a leaderboard." },
          { status: 403 },
        );
      }
      flair = LAUREL_FLAIR;
    } else if (!isFlairEmoji(body.flair)) {
      return NextResponse.json({ error: "Invalid flair." }, { status: 400 });
    } else {
      flair = body.flair;
    }
  }

  await db.prepare("UPDATE users SET flair = ? WHERE id = ?").bind(flair, user.id).run();
  return NextResponse.json({ ok: true, flair });
}
