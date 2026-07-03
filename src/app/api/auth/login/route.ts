import { NextResponse } from "next/server";
import { getDb, getEnvVar, requestIsSecure } from "@/lib/server/db";
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
    .prepare("SELECT id, username, password_hash, role, banned_until FROM users WHERE username_lower = ?")
    .bind(username.toLowerCase())
    .first<{ id: string; username: string; password_hash: string; role: string; banned_until: number | null }>();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: "Wrong username or password." }, { status: 401 });
  }

  if (user.banned_until && user.banned_until > Date.now()) {
    return NextResponse.json({ error: "This account has been closed by moderation." }, { status: 403 });
  }

  // Deploy-time admin bootstrap: usernames listed in the ADMIN_USERNAMES var
  // (comma-separated) are promoted on login, so the first admin never needs
  // manual SQL. Admins can then grant `mod` from the moderation panel.
  const adminList = (getEnvVar("ADMIN_USERNAMES") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (user.role !== "admin" && adminList.includes(user.username.toLowerCase())) {
    await db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").bind(user.id).run();
  }

  const token = await createSession(db, user.id);
  const response = NextResponse.json({ id: user.id, username: user.username });
  response.headers.set("Set-Cookie", sessionCookie(token, requestIsSecure(request)));
  return response;
}
