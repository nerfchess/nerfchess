import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";
import { isAvatarId } from "@/lib/avatars";

export const dynamic = "force-dynamic";

// Sets the signed-in account's profile picture (a preset id from lib/avatars).
export async function POST(request: Request) {
  let body: { avatar?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const avatar = body.avatar === null ? null : body.avatar;
  if (avatar !== null && !isAvatarId(avatar)) {
    return NextResponse.json({ error: "Unknown avatar." }, { status: 400 });
  }

  await db.prepare("UPDATE users SET avatar = ? WHERE id = ?").bind(avatar, user.id).run();
  return NextResponse.json({ ok: true, avatar });
}
