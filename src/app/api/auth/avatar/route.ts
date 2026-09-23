import { NextResponse } from "next/server";
import { guardJsonWrite } from "@/lib/server/request";
import { getDb, requestIsSecure } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";
import { isAvatarId, isCustomAvatar } from "@/lib/avatars";
import { whoCookieHeader } from "@/lib/session/who";
import { hintFromRow } from "../_lib/who";

export const dynamic = "force-dynamic";

// Sets the signed-in account's profile picture: a preset id from lib/avatars,
// or an uploaded image as a small data URL (client-side cropped to 96px).
export async function POST(request: Request) {
  // Refuses cross-site browser requests (F046, login CSRF) and anything but
  // a JSON object body under 16 KB (F047: `null` used to crash the field
  // reads below with a 500). Shared with slice F: src/lib/server/request.ts.
  const parsed = await guardJsonWrite(request);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed as { avatar?: unknown };

  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const avatar = body.avatar === null ? null : body.avatar;
  if (avatar !== null && !isAvatarId(avatar) && !isCustomAvatar(avatar)) {
    return NextResponse.json({ error: "Unknown avatar." }, { status: 400 });
  }

  await db.prepare("UPDATE users SET avatar = ? WHERE id = ?").bind(avatar, user.id).run();
  const response = NextResponse.json({ ok: true, avatar });
  response.headers.append("Set-Cookie", whoCookieHeader(hintFromRow({ ...user, avatar }), requestIsSecure(request)));
  return response;
}
