import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";
import { isFlairEmoji } from "@/lib/flair";

export const dynamic = "force-dynamic";

// Sets the signed-in account's emoji flair (shown next to the username,
// like Lichess's flair). Only emoji from the curated allowlist are accepted;
// null clears it.
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
    if (!isFlairEmoji(body.flair)) {
      return NextResponse.json({ error: "Invalid flair." }, { status: 400 });
    }
    flair = body.flair;
  }

  await db.prepare("UPDATE users SET flair = ? WHERE id = ?").bind(flair, user.id).run();
  return NextResponse.json({ ok: true, flair });
}
