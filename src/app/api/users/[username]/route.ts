import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { categoryForTimeControl } from "@/lib/speed";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { username: string } }) {
  const username = params.username.trim().toLowerCase();
  const db = await getDb();
  const user = await db
    .prepare(
      `SELECT id, username, rating, rd, games, wins, losses, draws, avatar, created_at, role, bio, flair
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
    }>();
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

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

  const games = await db
    .prepare(
      `SELECT id, white_name, black_name, winner, reason, rated, category, ruleset,
              white_user_id, black_user_id,
              white_rating_before, white_rating_after, black_rating_before, black_rating_after,
              time_sec, increment_sec, completed_at
       FROM games
       WHERE white_user_id = ? OR black_user_id = ?
       ORDER BY completed_at DESC LIMIT 30`,
    )
    .bind(user.id, user.id)
    .all();

  // Rating after each rated game, oldest first — powers the profile's
  // rating-history graph (a la Lichess). Each point carries its speed
  // category so the chart can show one bucket at a time; rows recorded
  // before the category column existed fall back to the time control.
  const ratingHistory = await db
    .prepare(
      `SELECT completed_at AS at, category, time_sec, increment_sec,
              CASE WHEN white_user_id = ? THEN white_rating_after ELSE black_rating_after END AS rating
       FROM games
       WHERE (white_user_id = ? OR black_user_id = ?) AND rated = 1
       ORDER BY completed_at ASC LIMIT 300`,
    )
    .bind(user.id, user.id, user.id)
    .all<{ at: number; category: string | null; time_sec: number; increment_sec: number; rating: number | null }>();

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
    },
    games: games.results,
    ratings,
    ratingHistory: ratingHistory.results
      .filter((p) => p.rating != null)
      .map((p) => ({
        at: p.at,
        rating: p.rating,
        category: p.category ?? categoryForTimeControl(p.time_sec, p.increment_sec),
      })),
  });
}
