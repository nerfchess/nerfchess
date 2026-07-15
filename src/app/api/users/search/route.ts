import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { bestLiveRatingSql } from "@/lib/server/ratingSql";

export const dynamic = "force-dynamic";

interface Hit {
  username: string;
  username_lower: string;
  rating: number;
  games: number;
  avatar: string | null;
  flair: string | null;
  // Per-mode live ratings for the search rows, NULL when that bucket has no
  // rated games yet (so the row can show "unrated" honestly rather than the
  // legacy fallback). Category ids are compile-time literals from our own
  // registry, never user input.
  nerf_rating: number | null;
  buff_rating: number | null;
}

// The two live mode-bucket rating subqueries, shared by the primary and typo
// SELECTs. NULL when the player has never played that mode rated.
const MODE_RATING_COLUMNS = `
  (SELECT r.rating FROM user_ratings r WHERE r.user_id = u.id AND r.category = 'nerf') AS nerf_rating,
  (SELECT r.rating FROM user_ratings r WHERE r.user_id = u.id AND r.category = 'buff') AS buff_rating`;

// Is `a` reachable from `b` in at most one single-character edit (insert,
// delete, or substitution)? Used for the cheap typo pass over a bounded
// candidate set - never computed over the whole table.
function withinEditDistanceOne(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  if (la === lb) {
    let diffs = 0;
    for (let i = 0; i < la; i++) {
      if (a[i] !== b[i] && ++diffs > 1) return false;
    }
    return true;
  }
  // One string is longer: check it can become the other by removing one char.
  const [short, long] = la < lb ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let skipped = false;
  while (i < short.length && j < long.length) {
    if (short[i] === long[j]) {
      i++;
      j++;
    } else {
      if (skipped) return false;
      skipped = true;
      j++;
    }
  }
  return true;
}

// Player search for the search box. Matches by prefix or substring (prefix
// ranked ahead of a mid-string match), with an exact username always first;
// when that yields fewer than five hits a bounded typo pass (edit distance 1
// over candidates sharing the first letter and near-equal length) fills in.
// Banned accounts are excluded (same rule as the leaderboard). Limit 10.
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2 || q.length > 20) return NextResponse.json({ players: [] });
  const escaped = q.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const now = Date.now();

  const db = await getDb();
  // Displayed rating = the best of the player's LIVE mode buckets (nerf/buff),
  // the same source the leaderboard and profiles read (lib/server/ratingSql.ts);
  // the legacy users.rating column is frozen. Substring LIKE covers prefix and
  // exact matches too; ranking happens in-route below.
  const primary = await db
    .prepare(
      `SELECT u.username, u.username_lower,
              ${bestLiveRatingSql("u")} AS rating,
              u.games, u.avatar, u.flair,${MODE_RATING_COLUMNS}
       FROM users u
       WHERE u.username_lower LIKE ? ESCAPE '\\'
         AND (u.banned_until IS NULL OR u.banned_until <= ?)
       ORDER BY u.games DESC, rating DESC LIMIT 50`,
    )
    .bind(`%${escaped}%`, now)
    .all<Hit>();

  // Rank: exact match, then prefix matches, then remaining substring matches;
  // rows already arrive games/rating-ordered, so the tiers stay stable within.
  const rankOf = (name: string): number => {
    if (name === q) return 0;
    if (name.startsWith(q)) return 1;
    return 2;
  };
  const ranked = [...primary.results].sort((a, b) => rankOf(a.username_lower) - rankOf(b.username_lower));

  const seen = new Set(ranked.map((r) => r.username_lower));
  const hits = ranked.slice(0, 10);

  // Typo pass: only when the direct search is thin. Pull a bounded candidate
  // set (same first letter, length within one) and keep those an edit away.
  if (hits.length < 5) {
    const firstChar = q[0].replace(/[\\%_]/g, (ch) => `\\${ch}`);
    const candidates = await db
      .prepare(
        `SELECT u.username, u.username_lower,
                ${bestLiveRatingSql("u")} AS rating,
                u.games, u.avatar, u.flair,${MODE_RATING_COLUMNS}
         FROM users u
         WHERE u.username_lower LIKE ? ESCAPE '\\'
           AND ABS(LENGTH(u.username_lower) - ?) <= 1
           AND (u.banned_until IS NULL OR u.banned_until <= ?)
         ORDER BY u.games DESC, rating DESC LIMIT 200`,
      )
      .bind(`${firstChar}%`, q.length, now)
      .all<Hit>();
    for (const row of candidates.results) {
      if (hits.length >= 10) break;
      if (seen.has(row.username_lower)) continue;
      if (!withinEditDistanceOne(row.username_lower, q)) continue;
      seen.add(row.username_lower);
      hits.push(row);
    }
  }

  const players = hits.map((h) => ({
    username: h.username,
    rating: h.rating,
    games: h.games,
    avatar: h.avatar,
    flair: h.flair,
    nerfRating: h.nerf_rating != null ? Math.round(h.nerf_rating) : null,
    buffRating: h.buff_rating != null ? Math.round(h.buff_rating) : null,
  }));
  return NextResponse.json({ players });
}
