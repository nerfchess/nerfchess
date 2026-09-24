import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/server/request";
import { getDb, requestIsSecure } from "@/lib/server/db";
import { deleteSession, sessionCookie, sessionTokenFromCookieHeader } from "@/lib/server/auth";
import { clearWhoCookie } from "../_lib/who";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // No body to read, but a cross-site page must not be able to mint a
  // session or end one (F046). Shared rule: src/lib/server/request.ts.
  const refused = assertSameOrigin(request);
  if (refused) return refused;
  const token = sessionTokenFromCookieHeader(request.headers.get("cookie"));
  if (token) {
    const db = await getDb();
    await deleteSession(db, token);
  }
  // A plain HTML form post (no script, or a form elsewhere) gets a page to
  // land on instead of a raw JSON body; fetch callers keep the JSON answer.
  const type = request.headers.get("content-type") ?? "";
  const formPost = /^(application\/x-www-form-urlencoded|multipart\/form-data)/i.test(type);
  const response = formPost
    ? new NextResponse(null, { status: 303, headers: { Location: "/" } })
    : NextResponse.json({ ok: true });
  const secure = requestIsSecure(request);
  response.headers.append("Set-Cookie", sessionCookie(null, secure));
  response.headers.append("Set-Cookie", clearWhoCookie(secure));
  return response;
}
