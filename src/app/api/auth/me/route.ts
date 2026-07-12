import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";
import { bestLiveRatingSql } from "@/lib/server/ratingSql";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = sessionTokenFromCookieHeader(request.headers.get("cookie"));
  const db = await getDb();
  const user = await userForSession(db, token);
  if (!user) return NextResponse.json({ user: null });
  // The rating the header account chip DISPLAYS. `rating` (below) stays the
  // legacy shared column — some callers use it as the seed-fallback value —
  // but it is never written after games anymore, so displaying it drifts from
  // the leaderboard/profile. displayRating resolves with the shared rule
  // (best live mode bucket, legacy fallback — lib/server/ratingSql.ts), the
  // same number the lobby's online list and player search show.
  let displayRating = user.rating;
  try {
    const live = await db
      .prepare(`SELECT ${bestLiveRatingSql("u")} AS rating FROM users u WHERE u.id = ?`)
      .bind(user.id)
      .first<{ rating: number | null }>();
    if (live?.rating != null) displayRating = live.rating;
  } catch {
    // The chip still renders with the legacy value.
  }
  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      rating: user.rating,
      displayRating,
      rd: user.rd,
      games: user.games,
      wins: user.wins,
      losses: user.losses,
      draws: user.draws,
      avatar: user.avatar,
      role: user.role,
      mutedUntil: user.muted_until && user.muted_until > Date.now() ? user.muted_until : null,
      bio: user.bio,
      flair: user.flair,
      isGuest: !!user.is_guest,
      email: user.email,
    },
  });
}
