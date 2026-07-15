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
    .prepare(
      `SELECT settings, settings_updated_at AS updatedAt, friends_visibility, show_online
       FROM users WHERE id = ?`,
    )
    .bind(user.id)
    .first<{
      settings: string | null;
      updatedAt: number | null;
      friends_visibility: string | null;
      show_online: number | null;
    }>();
  let settings: unknown = null;
  try {
    settings = row?.settings ? JSON.parse(row.settings) : null;
  } catch {
    settings = null;
  }
  return NextResponse.json({
    settings,
    updatedAt: row?.updatedAt ?? null,
    // Privacy toggles live in their own columns (see /profile/edit) rather than
    // the free-form settings blob.
    friendsVisibility: row?.friends_visibility === "private" ? "private" : "public",
    showOnline: row?.show_online == null ? true : !!row.show_online,
  });
}

// Privacy toggles: friends-list visibility and online/last-seen presence. These
// are dedicated columns (not part of the device-synced settings blob PUT
// handles) so the profile and friends endpoints can enforce them cheaply.
export async function POST(request: Request) {
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return NextResponse.json({ error: "Sign in to change privacy." }, { status: 401 });

  let body: { friendsVisibility?: unknown; showOnline?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const sets: string[] = [];
  const binds: unknown[] = [];
  if (body.friendsVisibility !== undefined) {
    if (body.friendsVisibility !== "public" && body.friendsVisibility !== "private") {
      return NextResponse.json({ error: "Invalid friends visibility." }, { status: 400 });
    }
    sets.push("friends_visibility = ?");
    binds.push(body.friendsVisibility);
  }
  if (body.showOnline !== undefined) {
    if (typeof body.showOnline !== "boolean") {
      return NextResponse.json({ error: "Invalid online setting." }, { status: 400 });
    }
    sets.push("show_online = ?");
    binds.push(body.showOnline ? 1 : 0);
  }
  if (sets.length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  binds.push(user.id);
  await db
    .prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...binds)
    .run();
  return NextResponse.json({ ok: true });
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
