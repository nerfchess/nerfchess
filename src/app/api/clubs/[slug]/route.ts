import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { isModerator, sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";
import { isValidClubIcon } from "@/lib/clubIcons";
import { bestLiveRatingSql } from "@/lib/server/ratingSql";
import { apiError, guardJsonWrite, PRIVATE_NO_STORE } from "@/lib/server/request";
import { CLUB_ICON_BODY_BYTES, CLUB_ICON_MAX_CHARS, validSlug } from "../limits";

export const dynamic = "force-dynamic";

export type ClubMemberRow = {
  user_id: string;
  username: string;
  avatar: string | null;
  rating: number;
  games: number;
  role: string; // membership role: owner | member
  joined_at: number;
};

export type ClubPostRow = {
  id: string;
  user_id: string;
  username: string;
  avatar: string | null;
  text: string;
  created_at: number;
};

export type ClubTournamentRow = {
  id: string;
  name: string;
  status: string;
  starts_at: number | null;
  duration_min: number;
  players: number;
  max_players: number;
};

export async function GET(request: Request, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  if (!validSlug(params.slug)) return apiError(404, "Club not found.");
  const db = await getDb();
  const club = await db
    .prepare(
      `SELECT id, slug, name, description, icon, owner_user_id, owner_name, created_at
       FROM clubs WHERE slug = ?`,
    )
    .bind(params.slug)
    .first<{
      id: string;
      slug: string;
      name: string;
      description: string;
      icon: string;
      owner_user_id: string;
      owner_name: string;
      created_at: number;
    }>();
  if (!club) return NextResponse.json({ error: "Club not found." }, { status: 404 });

  const [members, posts, tournaments, count] = await Promise.all([
    // Member rating = the best of the player's LIVE mode buckets (the shared
    // display rule in lib/server/ratingSql.ts), never the frozen legacy
    // users.rating column, so the club list agrees with the leaderboard,
    // search, and lobby for the same player at the same moment.
    db
      .prepare(
        `SELECT cm.user_id, u.username, u.avatar, ${bestLiveRatingSql("u")} AS rating,
                u.games, cm.role, cm.joined_at
         FROM club_members cm JOIN users u ON u.id = cm.user_id
         WHERE cm.club_id = ?
         ORDER BY rating DESC
         LIMIT 200`,
      )
      .bind(club.id)
      .all<ClubMemberRow>(),
    db
      .prepare(
        `SELECT p.id, p.user_id, p.username, u.avatar, p.text, p.created_at
         FROM club_posts p LEFT JOIN users u ON u.id = p.user_id
         WHERE p.club_id = ?
         ORDER BY p.created_at DESC
         LIMIT 50`,
      )
      .bind(club.id)
      .all<ClubPostRow>(),
    db
      .prepare(
        `SELECT t.id, t.name, t.status, t.starts_at, t.duration_min, t.max_players,
                COUNT(te.user_id) AS players
         FROM tournaments t
         LEFT JOIN tournament_entries te ON te.tournament_id = t.id
         WHERE t.club_id = ?
         GROUP BY t.id
         ORDER BY t.created_at DESC
         LIMIT 20`,
      )
      .bind(club.id)
      .all<ClubTournamentRow>(),
    // The leaderboard list is capped at 200 rows; the count is the real one,
    // so the header agrees with the /clubs directory for big clubs.
    db
      .prepare("SELECT COUNT(*) AS n FROM club_members WHERE club_id = ?")
      .bind(club.id)
      .first<{ n: number }>(),
  ]);

  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  let myRole: string | null = null;
  if (user) {
    const row = await db
      .prepare("SELECT role FROM club_members WHERE club_id = ? AND user_id = ?")
      .bind(club.id, user.id)
      .first<{ role: string }>();
    myRole = row?.role ?? null;
  }

  // myRole is per viewer, so the response is never shared from a cache.
  return NextResponse.json(
    {
      club,
      members: members.results,
      memberCount: Number(count?.n ?? members.results.length),
      posts: posts.results,
      tournaments: tournaments.results,
      myRole,
    },
    { headers: { "Cache-Control": PRIVATE_NO_STORE } },
  );
}

// Club settings: today just the identity icon, a curated "emoji|colorId"
// pair (see src/lib/clubIcons.ts). Owner-only, with the same moderator
// override the post-delete path uses.
export async function PATCH(request: Request, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const body = await guardJsonWrite(request, { maxBytes: CLUB_ICON_BODY_BYTES });
  if (body instanceof NextResponse) return body;
  if (!validSlug(params.slug)) return apiError(404, "Club not found.");
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const club = await db
    .prepare("SELECT id, owner_user_id FROM clubs WHERE slug = ?")
    .bind(params.slug)
    .first<{ id: string; owner_user_id: string }>();
  if (!club) return NextResponse.json({ error: "Club not found." }, { status: 404 });

  const mayEdit = club.owner_user_id === user.id || isModerator(user);
  if (!mayEdit) return NextResponse.json({ error: "Only the club owner can change the club's icon." }, { status: 403 });

  if (body.icon === undefined) return apiError(400, "Nothing to update.");
  if (typeof body.icon === "string" && body.icon.length > CLUB_ICON_MAX_CHARS) {
    return apiError(413, "That image is too large. Try a smaller picture.");
  }
  // "" clears · "name|colorId" is a curated emblem · a data-URL image is a
  // custom upload (re-validated server-side: MIME, byte-size, and pixel
  // dimensions; client checks are never trusted).
  if (!isValidClubIcon(body.icon)) {
    return NextResponse.json(
      { error: "Pick an emblem from the set, or upload a PNG/JPEG/WebP image (max 1 MB, 1024px)." },
      { status: 400 },
    );
  }

  await db.prepare("UPDATE clubs SET icon = ? WHERE id = ?").bind(body.icon, club.id).run();
  return NextResponse.json({ ok: true, icon: body.icon });
}
