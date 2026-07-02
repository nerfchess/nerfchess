import { NextResponse } from "next/server";
import { getDb, requestIsSecure } from "@/lib/server/db";
import { createSession, sessionCookie, verifyPassword } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const db = await getDb();
  const user = await db
    .prepare("SELECT id, username, password_hash FROM users WHERE username_lower = ?")
    .bind(username.toLowerCase())
    .first<{ id: string; username: string; password_hash: string }>();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: "Wrong username or password." }, { status: 401 });
  }

  const token = await createSession(db, user.id);
  const response = NextResponse.json({ id: user.id, username: user.username });
  response.headers.set("Set-Cookie", sessionCookie(token, requestIsSecure(request)));
  return response;
}
