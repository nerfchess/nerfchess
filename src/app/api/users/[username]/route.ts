import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { pgAll } from "@/lib/server/pg";
import { categoryForTimeControl } from "@/lib/speed";
import { isModerator, sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

// Friendships are one canonical row per pair (user_lo < user_hi by id).
function pair(a: string, b: string): { lo: string; hi: string } {
  return a < b ? { lo: a, hi: b } : { lo: b, hi: a };
}

type Relationship = "self" | "none" | "friends" | "incoming" | "outgoing";

export async function GET(request: Request, props: { params: Promise<{ username: string }> }) {
  const params = await props.params;
  const username = params.username.trim().toLowerCase();
  // Account + per-category ratings stay on D1; the game archive is on Postgres.
  const db = await getDb();
  const user = await db
    .prepare(
      `SELECT id, username, rating, rd, games, wins, losses, draws, avatar, created_at, role, bio, flair,
              friends_visibility, show_online, last_seen_at
       FROM users WHERE username_lower = ?`,
    )
    .bind(username)
    .first<{
      id: string;
      username: string;
      rating: number;
      rd: number;
      games: number;
      wins: number;
      losses: number;
      draws: number;
      avatar: string | null;
      created_at: number;
      role: string;
      bio: string | null;
      flair: string | null;
      friends_visibility: string | null;
      show_online: number | null;
      last_seen_at: number | null;
    }>();
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  // The signed-in viewer (if any), resolved with the same helpers /api/friends
  // uses, drives the relationship state and mutual-friends disclosure below.
  const viewer = await userForSession(
    db,
    sessionTokenFromCookieHeader(request.headers.get("cookie")),
  );

  const friendsVisibility = user.friends_visibility === "private" ? "private" : "public";
  const showOnline = user.show_online == null ? true : !!user.show_online;

  // Accepted-friendships count (cheap indexed D1 read).
  const friendCountRow = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM friendships
       WHERE (user_lo = ? OR user_hi = ?) AND status = 'accepted'`,
    )
    .bind(user.id, user.id)
    .first<{ n: number }>();
  const friendCount = friendCountRow?.n ?? 0;

  // relationship: null when signed out, else the viewer's tie to this profile.
  let relationship: Relationship | null = null;
  if (viewer) {
    if (viewer.id === user.id) {
      relationship = "self";
    } else {
      const { lo, hi } = pair(viewer.id, user.id);
      const link = await db
        .prepare(`SELECT requested_by, status FROM friendships WHERE user_lo = ? AND user_hi = ?`)
        .bind(lo, hi)
        .first<{ requested_by: string; status: string }>();
      if (!link) relationship = "none";
      else if (link.status === "accepted") relationship = "friends";
      else relationship = link.requested_by === viewer.id ? "outgoing" : "incoming";
    }
  }

  // mutualFriends (cap 6): accepted friends shared by the viewer and this
  // profile. Only when a viewer is signed in AND may see this player's friends
  // (public list, or the viewer is the owner or a moderator).
  const canSeeFriends =
    relationship === "self" || friendsVisibility === "public" || isModerator(viewer);
  let mutualFriends: Array<{ username: string; avatar: string | null }> = [];
  if (viewer && relationship !== "self" && canSeeFriends) {
    const mutual = await db
      .prepare(
        `SELECT u.username, u.avatar FROM users u
         WHERE u.id IN (
                 SELECT CASE WHEN user_lo = ? THEN user_hi ELSE user_lo END
                 FROM friendships
                 WHERE (user_lo = ? OR user_hi = ?) AND status = 'accepted'
               )
           AND u.id IN (
                 SELECT CASE WHEN user_lo = ? THEN user_hi ELSE user_lo END
                 FROM friendships
                 WHERE (user_lo = ? OR user_hi = ?) AND status = 'accepted'
               )
         LIMIT 6`,
      )
      .bind(user.id, user.id, user.id, viewer.id, viewer.id, viewer.id)
      .all<{ username: string; avatar: string | null }>();
    mutualFriends = mutual.results;
  }

  // Independent per-time-control ratings; buckets a user never played show
  // as null so the UI can label them provisional/unrated.
  const categoryRows = await db
    .prepare(
      `SELECT category, rating, rd, games, wins, losses, draws, peak
       FROM user_ratings WHERE user_id = ?`,
    )
    .bind(user.id)
    .all<{
      category: string;
      rating: number;
      rd: number;
      games: number;
      wins: number;
      losses: number;
      draws: number;
      peak: number;
    }>();
  const ratings: Record<string, (typeof categoryRows.results)[number]> = {};
  for (const row of categoryRows.results) ratings[row.category] = row;

  const recentGames = await pgAll(
    `SELECT id, white_name, black_name, winner, reason, rated, category, ruleset,
            white_user_id, black_user_id,
            white_rating_before, white_rating_after, black_rating_before, black_rating_after,
            time_sec, increment_sec, completed_at
     FROM games
     WHERE white_user_id = ? OR black_user_id = ?
     ORDER BY completed_at DESC LIMIT 30`,
    [user.id, user.id],
  );

  // Rating after each rated game, oldest first — powers the profile's
  // rating-history graph (a la Lichess). Each point carries its speed
  // category so the chart can show one bucket at a time; rows recorded
  // before the category column existed fall back to the time control.
  const ratingHistory = await pgAll<{
    at: number;
    category: string | null;
    time_sec: number;
    increment_sec: number;
    rating: number | null;
  }>(
    `SELECT completed_at AS at, category, time_sec, increment_sec,
            CASE WHEN white_user_id = ? THEN white_rating_after ELSE black_rating_after END AS rating
     FROM games
     WHERE (white_user_id = ? OR black_user_id = ?) AND rated = 1
     ORDER BY completed_at ASC LIMIT 300`,
    [user.id, user.id, user.id],
  );

  return NextResponse.json({
    user: {
      username: user.username,
      rating: user.rating,
      rd: user.rd,
      games: user.games,
      wins: user.wins,
      losses: user.losses,
      draws: user.draws,
      avatar: user.avatar,
      createdAt: user.created_at,
      role: user.role,
      bio: user.bio,
      flair: user.flair,
      // last-seen is suppressed entirely when the player hides their presence.
      lastSeenAt: showOnline ? (user.last_seen_at ?? null) : null,
      showOnline,
      friendsVisibility,
      friendCount,
    },
    relationship,
    mutualFriends,
    games: recentGames,
    ratings,
    ratingHistory: ratingHistory
      .filter((p) => p.rating != null)
      .map((p) => ({
        at: p.at,
        rating: p.rating,
        category: p.category ?? categoryForTimeControl(p.time_sec, p.increment_sec),
      })),
  });
}
