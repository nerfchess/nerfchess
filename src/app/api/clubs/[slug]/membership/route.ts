import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";
import { apiError, guardJsonWrite } from "@/lib/server/request";
import { validSlug } from "../../limits";

export const dynamic = "force-dynamic";

export async function POST(request: Request, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const body = await guardJsonWrite(request);
  if (body instanceof NextResponse) return body;
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return apiError(401, "Sign in to join clubs.");

  const action = body.action === "join" || body.action === "leave" ? body.action : null;
  if (!action) return apiError(400, "Unknown action.");
  if (!validSlug(params.slug)) return apiError(404, "Club not found.");

  const club = await db
    .prepare("SELECT id, owner_user_id FROM clubs WHERE slug = ?")
    .bind(params.slug)
    .first<{ id: string; owner_user_id: string }>();
  if (!club) return apiError(404, "Club not found.");

  if (action === "join") {
    await db
      .prepare(
        "INSERT OR IGNORE INTO club_members (club_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)",
      )
      .bind(club.id, user.id, Date.now())
      .run();
    return NextResponse.json({ myRole: club.owner_user_id === user.id ? "owner" : "member" });
  }

  // Leaving: the owner anchors the club and can't walk away from it.
  if (club.owner_user_id === user.id) {
    return apiError(400, "The club owner can't leave their own club.");
  }
  await db
    .prepare("DELETE FROM club_members WHERE club_id = ? AND user_id = ?")
    .bind(club.id, user.id)
    .run();
  return NextResponse.json({ myRole: null });
}
