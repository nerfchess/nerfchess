import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";
import { apiError, guardJsonWrite, PRIVATE_NO_STORE } from "@/lib/server/request";
import { getEmailPrefs, setEmailSubscribed } from "@/lib/server/emailPrefs";

export const dynamic = "force-dynamic";

// The signed-in player's email preference (settings, brief 17.3). A signed-out
// caller gets 200 with signedIn: false rather than a 401, so the settings page
// does not log a console error for every visitor.
export async function GET(request: Request) {
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  const headers = { "Cache-Control": PRIVATE_NO_STORE };
  if (!user) return NextResponse.json({ signedIn: false, email: null, hasEmail: false, subscribed: false }, { headers });
  const prefs = await getEmailPrefs(db, user.id);
  if (!prefs) return NextResponse.json({ signedIn: false, email: null, hasEmail: false, subscribed: false }, { headers });
  return NextResponse.json({ signedIn: true, guest: !!user.is_guest, ...prefs }, { headers });
}

export async function POST(request: Request) {
  const body = await guardJsonWrite(request, { maxBytes: 1024 });
  if (body instanceof NextResponse) return body;
  if (typeof body.subscribed !== "boolean") return apiError(400, "subscribed must be true or false.");
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return apiError(401, "Sign in first.", { "Cache-Control": PRIVATE_NO_STORE });
  await setEmailSubscribed(db, user.id, body.subscribed);
  const prefs = await getEmailPrefs(db, user.id);
  return NextResponse.json({ signedIn: true, guest: !!user.is_guest, ...prefs }, { headers: { "Cache-Control": PRIVATE_NO_STORE } });
}
