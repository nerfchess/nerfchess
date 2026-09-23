import { NextResponse } from "next/server";
import { getDb, requestIsSecure } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";
import { bestLiveRatingSql } from "@/lib/server/ratingSql";
import { cookieFromHeader, parseWho, sameHint, WHO_COOKIE, whoCookieHeader, type SessionHint } from "@/lib/session/who";
import { hintFromRow } from "../_lib/who";

// /me is the authority on who the session belongs to, so it also keeps the
// display cookie honest: whenever the hint the browser sent disagrees with
// the account (renamed, new avatar, promoted, banned, signed out elsewhere,
// or a session from before the cookie existed) the answer carries a fresh one.
function withWho(response: NextResponse, request: Request, hint: SessionHint | null): NextResponse {
  const raw = cookieFromHeader(request.headers.get("cookie"), WHO_COOKIE);
  if (!hint && !raw) return response;
  if (hint && sameHint(parseWho(raw), hint)) return response;
  response.headers.append("Set-Cookie", whoCookieHeader(hint, requestIsSecure(request)));
  return response;
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = sessionTokenFromCookieHeader(request.headers.get("cookie"));
  const db = await getDb();
  const user = await userForSession(db, token);
  if (!user) return withWho(NextResponse.json({ user: null }), request, null);

  // Presence heartbeat: stamp last_seen_at at most once every 5 minutes per
  // user (the guarded UPDATE only writes when the column is null or older than
  // the window, so a chatty client polling /me does not hammer D1). Best
  // effort — a failed write must never break the account chip.
  try {
    const now = Date.now();
    await db
      .prepare(
        `UPDATE users SET last_seen_at = ?
         WHERE id = ? AND (last_seen_at IS NULL OR last_seen_at < ?)`,
      )
      .bind(now, user.id, now - 5 * 60 * 1000)
      .run();
  } catch {
    // Presence is non-essential; the response below is unaffected.
  }
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
  const body = NextResponse.json({
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
      nameFlagged: !!user.name_flagged,
      email: user.email,
    },
  });
  return withWho(body, request, hintFromRow(user));
}
