import { NextResponse } from "next/server";
import { guardJsonWrite } from "@/lib/server/request";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";
import { censorText, findProfanity } from "@/lib/profanity";

export const dynamic = "force-dynamic";

const MAX_BIO = 300;

// Sets the signed-in account's profile bio (shown on the public profile,
// like Lichess's "about me"). Profanity is censored, not rejected.
export async function POST(request: Request) {
  // Refuses cross-site browser requests (F046, login CSRF) and anything but
  // a JSON object body under 16 KB (F047: `null` used to crash the field
  // reads below with a 500). Shared with slice F: src/lib/server/request.ts.
  const parsed = await guardJsonWrite(request);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed as { bio?: unknown };

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
