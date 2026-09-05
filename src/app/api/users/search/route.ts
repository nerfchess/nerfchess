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

// House personas carry an 'hp_' user id (lib/server/bots.ts). They are not
// players anyone messages or friends, and there are hundreds of them with deep
// game counts, so left in they swamp every substring query. Same LIKE pattern
// the leaderboard and top-ten use to tell them apart.
const HOUSE_ID_MATCH = "hp\\_%";

// Rows returned to the client. The box shows a short list, so a dozen is
// plenty while still leaving room for the typo pass below.
const RESULT_LIMIT = 12;

// The two live mode-bucket rating subqueries, shared by every SELECT below.
// NULL when the player has never played that mode rated.
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

// Player search for the search box. Ranked BEFORE any row window is applied:
// prefix matches (exact first) come from their own query, ordered by games,
// then substring matches fill in behind them. Ranking after a single windowed
// substring query was the old bug: with hundreds of busy accounts whose names
// merely contain the letters, the 50-row window filled up before the prefix
// match the searcher actually typed could get in. When the direct search is
// thin a bounded typo pass (edit distance 1 over candidates sharing the first
// letter and near-equal length) fills in. Banned accounts and house personas
// are excluded (same rule as the leaderboard). Returns up to RESULT_LIMIT.
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2 || q.length > 20) return NextResponse.json({ players: [] });
  const escaped = q.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const now = Date.now();

  const db = await getDb();
  // Displayed rating = the best of the player's LIVE mode buckets (nerf/buff),
  // the same source the leaderboard and profiles read (lib/server/ratingSql.ts);
  // the legacy users.rating column is frozen.
  const select = `SELECT u.username, u.username_lower,
              ${bestLiveRatingSql("u")} AS rating,
              u.games, u.avatar, u.flair,${MODE_RATING_COLUMNS}
       FROM users u`;
  const eligible = `AND (u.banned_until IS NULL OR u.banned_until <= ?)
         AND u.id NOT LIKE ? ESCAPE '\\'`;

  // Tier 1: names that START with the query, busiest first. Tier 2: names that
  // merely contain it. Each tier is windowed on its own, so a flood of
  // substring matches can never crowd out a prefix match.
  const [prefix, substring] = await Promise.all([
    db
      .prepare(
        `${select}
       WHERE u.username_lower LIKE ? ESCAPE '\\' ${eligible}
       ORDER BY u.games DESC, rating DESC LIMIT 20`,
      )
      .bind(`${escaped}%`, now, HOUSE_ID_MATCH)
      .all<Hit>(),
    db
      .prepare(
        `${select}
       WHERE u.username_lower LIKE ? ESCAPE '\\'
         AND u.username_lower NOT LIKE ? ESCAPE '\\' ${eligible}
       ORDER BY u.games DESC, rating DESC LIMIT 30`,
      )
      .bind(`%${escaped}%`, `${escaped}%`, now, HOUSE_ID_MATCH)
      .all<Hit>(),
  ]);

  // Union in code: exact match, then the prefix tier, then the substring tier;
  // rows arrive games/rating-ordered within each tier, so the order holds.
  const seen = new Set<string>();
  const candidates: Hit[] = [];
  for (const row of [...prefix.results, ...substring.results]) {
    if (seen.has(row.username_lower)) continue;
    seen.add(row.username_lower);
    candidates.push(row);
  }
  const exactAt = candidates.findIndex((r) => r.username_lower === q);
  if (exactAt > 0) candidates.unshift(...candidates.splice(exactAt, 1));

  // Typo pass: only when the direct search is thin. Pull a bounded candidate
  // set (same first letter, length within one) and keep those an edit away,
  // skipping anything the direct tiers already found.
  if (candidates.length < 5) {
    const firstChar = q[0].replace(/[\\%_]/g, (ch) => `\\${ch}`);
    const near = await db
      .prepare(
        `${select}
         WHERE u.username_lower LIKE ? ESCAPE '\\'
           AND ABS(LENGTH(u.username_lower) - ?) <= 1 ${eligible}
         ORDER BY u.games DESC, rating DESC LIMIT 200`,
      )
      .bind(`${firstChar}%`, q.length, now, HOUSE_ID_MATCH)
      .all<Hit>();
    for (const row of near.results) {
      if (candidates.length >= RESULT_LIMIT) break;
      if (seen.has(row.username_lower)) continue;
      if (!withinEditDistanceOne(row.username_lower, q)) continue;
      seen.add(row.username_lower);
      candidates.push(row);
    }
  }

  const players = candidates.slice(0, RESULT_LIMIT).map((h) => ({
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
