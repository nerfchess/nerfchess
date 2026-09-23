import { NextResponse } from "next/server";
import { refuseCrossSite } from "../_lib/sameOrigin";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";
import { censorText, findProfanity } from "@/lib/profanity";

export const dynamic = "force-dynamic";

const MAX_BIO = 300;

// Sets the signed-in account's profile bio (shown on the public profile,
// like Lichess's "about me"). Profanity is censored, not rejected.
export async function POST(request: Request) {
  const refused = refuseCrossSite(request);
  if (refused) return refused;
  let body: { bio?: unknown };
  try {
    body = await request.json();
    // `null`, an array or a bare value parses fine and then crashed the
    // field reads below with a 500 (F047): refuse anything but an object.
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("not an object");
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let bio: string | null = null;
  if (body.bio !== null && body.bio !== undefined && body.bio !== "") {
    if (typeof body.bio !== "string") return NextResponse.json({ error: "Invalid bio." }, { status: 400 });
    const trimmed = body.bio.trim().slice(0, MAX_BIO);
    bio = trimmed ? (findProfanity(trimmed).length ? censorText(trimmed) : trimmed) : null;
  }

  await db.prepare("UPDATE users SET bio = ? WHERE id = ?").bind(bio, user.id).run();
  return NextResponse.json({ ok: true, bio });
}
