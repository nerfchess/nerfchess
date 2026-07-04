import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";

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
  players: number;
  max_players: number;
};

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const db = await getDb();
  const club = await db
    .prepare(
      `SELECT id, slug, name, description, owner_user_id, owner_name, created_at
       FROM clubs WHERE slug = ?`,
    )
    .bind(params.slug)
    .first<{
      id: string;
      slug: string;
      name: string;
      description: string;
      owner_user_id: string;
      owner_name: string;
      created_at: number;
    }>();
  if (!club) return NextResponse.json({ error: "Club not found." }, { status: 404 });

  const [members, posts, tournaments] = await Promise.all([
    db
      .prepare(
        `SELECT cm.user_id, u.username, u.avatar, u.rating, u.games, cm.role, cm.joined_at
         FROM club_members cm JOIN users u ON u.id = cm.user_id
         WHERE cm.club_id = ?
         ORDER BY u.rating DESC
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
        `SELECT t.id, t.name, t.status, t.starts_at, t.max_players,
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

  return NextResponse.json({
    club,
    members: members.results,
    posts: posts.results,
    tournaments: tournaments.results,
    myRole,
  });
}
