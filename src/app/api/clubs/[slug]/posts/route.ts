import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { isModerator, sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";
import { censorText } from "@/lib/profanity";
import { cleanText, TEXT_POLICIES } from "@/lib/textInput";
import { mutedRefusal } from "@/lib/server/social";
import { apiError, assertSameOrigin, guardJsonWrite, rateLimit, tooManyRequests } from "@/lib/server/request";
import { validSlug } from "../../limits";

export const dynamic = "force-dynamic";

// Board flood guard (F061): at most this many posts per account per minute.
const POST_WINDOW_MS = 60 * 1000;
const POST_WINDOW_MAX = 8;

export async function POST(request: Request, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const body = await guardJsonWrite(request);
  if (body instanceof NextResponse) return body;
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return apiError(401, "Sign in to post.");
  const muted = mutedRefusal(user, "post");
  if (muted) return muted;
  if (!validSlug(params.slug)) return apiError(404, "Club not found.");

  const club = await db
    .prepare("SELECT id FROM clubs WHERE slug = ?")
    .bind(params.slug)
    .first<{ id: string }>();
  if (!club) return apiError(404, "Club not found.");

  const membership = await db
    .prepare("SELECT role FROM club_members WHERE club_id = ? AND user_id = ?")
    .bind(club.id, user.id)
    .first<{ role: string }>();
  if (!membership) return apiError(403, "Join the club to post on its board.");

  // Normalise (invisible characters, overrides, code-point cap), then censor.
  const text = censorText(cleanText(body.text, TEXT_POLICIES.clubPost));
  if (!text) return apiError(400, "Write something first.");

  const limit = await rateLimit(db, `clubpost:${user.id}`, POST_WINDOW_MAX, POST_WINDOW_MS);
  if (!limit.ok) return tooManyRequests("Slow down a little.", limit.retryAfterSec);

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
  const refused = assertSameOrigin(request);
  if (refused) return refused;
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return apiError(401, "Sign in first.");

  const id = new URL(request.url).searchParams.get("id");
  if (!id || id.length > 64) return apiError(400, "Missing post id.");
  if (!validSlug(params.slug)) return apiError(404, "Club not found.");

  const club = await db
    .prepare("SELECT id, owner_user_id FROM clubs WHERE slug = ?")
    .bind(params.slug)
    .first<{ id: string; owner_user_id: string }>();
  if (!club) return apiError(404, "Club not found.");

  const post = await db
    .prepare("SELECT user_id FROM club_posts WHERE id = ? AND club_id = ?")
    .bind(id, club.id)
    .first<{ user_id: string }>();
  if (!post) return apiError(404, "Post not found.");

  const mayDelete = post.user_id === user.id || club.owner_user_id === user.id || isModerator(user);
  if (!mayDelete) return apiError(403, "You can't delete that post.");

  await db.prepare("DELETE FROM club_posts WHERE id = ?").bind(id).run();
  return NextResponse.json({ ok: true });
}
