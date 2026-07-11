import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { isModerator, sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";
import { censorText } from "@/lib/profanity";

export const dynamic = "force-dynamic";

const MAX_POST_CHARS = 500;

export async function POST(request: Request, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return NextResponse.json({ error: "Sign in to post." }, { status: 401 });
  if (user.muted_until && user.muted_until > Date.now()) {
    return NextResponse.json({ error: "You are muted and cannot post right now." }, { status: 403 });
  }

  const club = await db
    .prepare("SELECT id FROM clubs WHERE slug = ?")
    .bind(params.slug)
    .first<{ id: string }>();
  if (!club) return NextResponse.json({ error: "Club not found." }, { status: 404 });

  const membership = await db
    .prepare("SELECT role FROM club_members WHERE club_id = ? AND user_id = ?")
    .bind(club.id, user.id)
    .first<{ role: string }>();
  if (!membership) return NextResponse.json({ error: "Join the club to post on its board." }, { status: 403 });

  let body: { text?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Bad JSON." }, { status: 400 });
  }
  const text = typeof body.text === "string" ? censorText(body.text.trim()).slice(0, MAX_POST_CHARS) : "";
  if (!text) return NextResponse.json({ error: "Write something first." }, { status: 400 });

  const id = crypto.randomUUID();
  const now = Date.now();
  await db
    .prepare("INSERT INTO club_posts (id, club_id, user_id, username, text, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, club.id, user.id, user.username, text, now)
    .run();

  return NextResponse.json({
    post: { id, user_id: user.id, username: user.username, avatar: user.avatar ?? null, text, created_at: now },
  });
}

export async function DELETE(request: Request, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing post id." }, { status: 400 });

  const club = await db
    .prepare("SELECT id, owner_user_id FROM clubs WHERE slug = ?")
    .bind(params.slug)
    .first<{ id: string; owner_user_id: string }>();
  if (!club) return NextResponse.json({ error: "Club not found." }, { status: 404 });

  const post = await db
    .prepare("SELECT user_id FROM club_posts WHERE id = ? AND club_id = ?")
    .bind(id, club.id)
    .first<{ user_id: string }>();
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  const mayDelete = post.user_id === user.id || club.owner_user_id === user.id || isModerator(user);
  if (!mayDelete) return NextResponse.json({ error: "You can't delete that post." }, { status: 403 });

  await db.prepare("DELETE FROM club_posts WHERE id = ?").bind(id).run();
  return NextResponse.json({ ok: true });
}
