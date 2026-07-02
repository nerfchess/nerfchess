import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";
import { AVATAR_MAX_CHARS } from "@/lib/avatar";

export const dynamic = "force-dynamic";

// The client downscales to a small square and sends a data URL; anything else
// (wrong mime, oversized, not base64) is rejected outright.
const DATA_URL_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export async function POST(request: Request) {
  const token = sessionTokenFromCookieHeader(request.headers.get("cookie"));
  const db = await getDb();
  const user = await userForSession(db, token);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: { avatar?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const avatar = body.avatar ?? null;
  if (avatar !== null) {
    if (typeof avatar !== "string" || avatar.length > AVATAR_MAX_CHARS || !DATA_URL_RE.test(avatar)) {
      return NextResponse.json({ error: "Invalid image." }, { status: 400 });
    }
  }

  await db.prepare("UPDATE users SET avatar = ? WHERE id = ?").bind(avatar, user.id).run();
  return NextResponse.json({ avatar });
}
