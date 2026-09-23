import { NextResponse } from "next/server";
import { refuseCrossSite } from "../_lib/sameOrigin";
import { getDb, requestIsSecure } from "@/lib/server/db";
import { deleteSession, sessionCookie, sessionTokenFromCookieHeader } from "@/lib/server/auth";
import { clearWhoCookie } from "../_lib/who";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const refused = refuseCrossSite(request);
  if (refused) return refused;
  const token = sessionTokenFromCookieHeader(request.headers.get("cookie"));
  if (token) {
    const db = await getDb();
    await deleteSession(db, token);
  }
  const response = NextResponse.json({ ok: true });
  const secure = requestIsSecure(request);
  response.headers.append("Set-Cookie", sessionCookie(null, secure));
  response.headers.append("Set-Cookie", clearWhoCookie(secure));
  return response;
}
