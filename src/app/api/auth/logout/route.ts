import { NextResponse } from "next/server";
import { getDb, requestIsSecure } from "@/lib/server/db";
import { deleteSession, sessionCookie, sessionTokenFromCookieHeader } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = sessionTokenFromCookieHeader(request.headers.get("cookie"));
  if (token) {
    const db = await getDb();
    await deleteSession(db, token);
  }
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", sessionCookie(null, requestIsSecure(request)));
  return response;
}
