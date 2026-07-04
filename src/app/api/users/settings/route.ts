import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

// Per-account settings blob: the client saves locally first and mirrors here,
// so preferences follow the user across devices after signing in. Last write
// wins by the client-supplied timestamp.
export async function GET(request: Request) {
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return NextResponse.json({ settings: null, updatedAt: null }, { status: 401 });
  const row = await db
    .prepare("SELECT settings, settings_updated_at AS updatedAt FROM users WHERE id = ?")
    .bind(user.id)
    .first<{ settings: string | null; updatedAt: number | null }>();
  let settings: unknown = null;
  try {
    settings = row?.settings ? JSON.parse(row.settings) : null;
  } catch {
    settings = null;
  }
  return NextResponse.json({ settings, updatedAt: row?.updatedAt ?? null });
}

export async function PUT(request: Request) {
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return NextResponse.json({ error: "Sign in to sync settings." }, { status: 401 });

  let body: { settings?: unknown; updatedAt?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!body.settings || typeof body.settings !== "object") {
    return NextResponse.json({ error: "Missing settings." }, { status: 400 });
  }
  const serialized = JSON.stringify(body.settings);
  if (serialized.length > 8192) {
    return NextResponse.json({ error: "Settings too large." }, { status: 413 });
  }
  const updatedAt = typeof body.updatedAt === "number" ? body.updatedAt : Date.now();

  // Only move forward: never let a stale device clobber newer settings.
  await db
    .prepare(
      `UPDATE users SET settings = ?, settings_updated_at = ?
       WHERE id = ? AND (settings_updated_at IS NULL OR settings_updated_at <= ?)`,
    )
    .bind(serialized, updatedAt, user.id, updatedAt)
    .run();
  return NextResponse.json({ ok: true });
}
