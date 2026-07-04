import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "club"
  );
}

async function uniqueSlug(db: D1Database, name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  for (let i = 0; i < 20; i++) {
    const existing = await db.prepare("SELECT id FROM clubs WHERE slug = ?").bind(slug).first<{ id: string }>();
    if (!existing) return slug;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function GET(request: Request) {
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  const rows = await db
    .prepare(
      `SELECT c.id, c.slug, c.name, c.description, c.owner_name, c.created_at,
              COUNT(cm.user_id) AS members,
              MAX(CASE WHEN cm.user_id = ? THEN 1 ELSE 0 END) AS joined
       FROM clubs c
       LEFT JOIN club_members cm ON cm.club_id = c.id
       GROUP BY c.id
       ORDER BY members DESC, c.created_at DESC
       LIMIT 50`,
    )
    .bind(user?.id ?? "")
    .all<{
      id: string;
      slug: string;
      name: string;
      description: string;
      owner_name: string;
      created_at: number;
      members: number;
      joined: number;
    }>();
  return NextResponse.json({ clubs: rows.results });
}

export async function POST(request: Request) {
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return NextResponse.json({ error: "Sign in to create a club." }, { status: 401 });

  let body: { name?: unknown; description?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Bad JSON." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 240) : "";
  if (name.length < 3) return NextResponse.json({ error: "Club name must be at least 3 characters." }, { status: 400 });

  const id = crypto.randomUUID();
  const slug = await uniqueSlug(db, name);
  const now = Date.now();
  await db.batch([
    db
      .prepare(
        `INSERT INTO clubs (id, slug, name, description, owner_user_id, owner_name, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, slug, name, description, user.id, user.username, now),
    db
      .prepare("INSERT INTO club_members (club_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)")
      .bind(id, user.id, now),
  ]);

  return NextResponse.json({
    club: { id, slug, name, description, owner_name: user.username, created_at: now, members: 1 },
  });
}
