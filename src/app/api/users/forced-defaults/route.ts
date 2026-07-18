import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

// One-time forced-default rollouts, gated per account (see
// src/lib/settings.ts applyForcedDefaults). The client sends the ids of the
// forces it knows about; this returns the subset the account has not been
// through yet and, in the same request, records them as applied. Because the
// claim and the record happen together, only the FIRST device to load for a
// given account gets a force back as pending — every later device (or reload)
// sees it as already applied and leaves the user's current settings alone. That
// is what makes a force fire once per account across all devices rather than
// once per browser.

// Guard rails: the client only ever sends a handful of short ids.
const MAX_IDS = 50;
const MAX_ID_LEN = 80;

export async function POST(request: Request) {
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  // Signed out: no account to gate on. 401 tells the client to fall back to its
  // per-device record (anonymous users still get forced once per browser).
  if (!user) return NextResponse.json({ error: "Sign in to sync settings." }, { status: 401 });

  let body: { ids?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((v): v is string => typeof v === "string" && v.length > 0 && v.length <= MAX_ID_LEN).slice(0, MAX_IDS)
    : [];
  if (ids.length === 0) return NextResponse.json({ pending: [] });

  const row = await db
    .prepare(`SELECT forced_defaults AS forcedDefaults FROM users WHERE id = ?`)
    .bind(user.id)
    .first<{ forcedDefaults: string | null }>();

  let applied: string[] = [];
  try {
    const parsed = row?.forcedDefaults ? JSON.parse(row.forcedDefaults) : [];
    if (Array.isArray(parsed)) applied = parsed.filter((v): v is string => typeof v === "string");
  } catch {
    applied = [];
  }

  const pending = ids.filter((id) => !applied.includes(id));
  if (pending.length === 0) return NextResponse.json({ pending: [] });

  // Claim the pending forces for this account by recording them as applied.
  const next = [...applied, ...pending];
  await db
    .prepare(`UPDATE users SET forced_defaults = ? WHERE id = ?`)
    .bind(JSON.stringify(next), user.id)
    .run();

  return NextResponse.json({ pending });
}
