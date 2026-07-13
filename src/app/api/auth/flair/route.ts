import { NextResponse } from "next/server";
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
  let body: { flair?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

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
