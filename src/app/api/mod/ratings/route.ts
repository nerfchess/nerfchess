/// <reference types="@cloudflare/workers-types" />

import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import {
  sessionTokenFromCookieHeader,
  userForSession,
  type SessionUser,
} from "@/lib/server/auth";
import { isRatingEditor } from "@/lib/godPanel";
import { MODE_CATEGORIES } from "@/lib/speed";

export const dynamic = "force-dynamic";

// A hand-set rating must stay in a sane band: a negative or absurdly large
// value would poison the leaderboard sort and is almost always a typo. The
// glicko rating space lives well inside this range with generous headroom.
const MIN_RATING = 0;
const MAX_RATING = 4000;

// rd is pulled down to a settled value so the hand-set number renders clean
// (no provisional "?") on every surface — the same treatment the one-off
// ilovenewjeans rating grants use in schema.ts. Must stay < PROVISIONAL_RD
// (110, lib/glicko.ts) so the display never marks it provisional.
const SETTLED_RD = 90;

// Who may reach this route: ONLY the designated rating editor (ilovenewjeans),
// independent of the moderator role, per the owner's request. The client gate
// in the profile page is UX only; this is the real check and it re-runs on
// every write. Mirrors the house-personas route's role-independent gate.
async function resolveEditor(
  request: Request,
): Promise<{ db: D1Database; user: SessionUser } | NextResponse> {
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!isRatingEditor(user.username)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  return { db, user };
}

// POST { username, rating }: set EVERY rating bucket for one account to a single
// number. ilovenewjeans-only (re-verified above). The write touches three
// stores so the value shows identically everywhere the site reads a rating:
//   1. users.rating  — the legacy shared column (displayRating fallback: lobby
//      online list, player search, club lists, in-game rows).
//   2. every existing user_ratings row — Nerf, Buff, and any legacy speed rows
//      (leaderboards, profile cards, header chip, stats tables).
//   3. the two visible mode buckets (Nerf, Buff) are ensured to exist at the new
//      number even for a player who never played that mode, so their profile
//      card leaves "Unrated" and shows the set value.
// peak only ever rises (MAX) and rd only ever settles (MIN), matching how the
// rating engine treats a genuine result — an edit never inflates deviation.
export async function POST(request: Request) {
  const guard = await resolveEditor(request);
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;

  let body: { username?: unknown; rating?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  if (!username) return NextResponse.json({ error: "Provide a username." }, { status: 400 });

  // Accept a JS number or a non-blank numeric string, and reject everything
  // else (null, arrays, objects, blank/whitespace strings) BEFORE coercion:
  // Number("") / Number("   ") / Number(null) / Number([]) all coerce to 0,
  // which is in-band, so a malformed payload would otherwise silently zero out
  // the target's entire rating profile instead of returning this 400.
  const rawRating = body.rating;
  const ratingNum =
    typeof rawRating === "number"
      ? rawRating
      : typeof rawRating === "string" && rawRating.trim() !== ""
        ? Number(rawRating)
        : NaN;
  if (!Number.isFinite(ratingNum)) {
    return NextResponse.json({ error: "Rating must be a number." }, { status: 400 });
  }
  const rating = Math.round(ratingNum);
  if (rating < MIN_RATING || rating > MAX_RATING) {
    return NextResponse.json(
      { error: `Rating must be between ${MIN_RATING} and ${MAX_RATING}.` },
      { status: 400 },
    );
  }

  const target = await db
    .prepare("SELECT id, username FROM users WHERE username_lower = ?")
    .bind(username)
    .first<{ id: string; username: string }>();
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  // House-bot accounts (id prefix "hp_") are engine-managed: their ratings are
  // seeded per mode and re-synced from the roster (worker.ts syncHouseRatings)
  // on the next version bump, which would silently revert a hand-edit, and the
  // lobby serves their number from a ~60s cache. Editing one here would look
  // like it worked but not stick — reject it. Bot IDENTITY is edited through
  // /api/mod/house instead. Keep this prefix in sync with lib/server/bots.ts.
  if (target.id.startsWith("hp_")) {
    return NextResponse.json(
      { error: "House accounts can't be edited here." },
      { status: 400 },
    );
  }

  // All rating writes go out as one atomic batch — D1 runs a batch inside an
  // implicit transaction, so the legacy column and the per-category rows can
  // never be left disagreeing by a mid-sequence failure. Order matters: the two
  // mode-bucket inserts create any missing Nerf/Buff row, then the sweeping
  // UPDATE overwrites every row (the just-inserted ones plus any pre-existing
  // Nerf / Buff / legacy speed rows) to the new number. peak only rises (MAX)
  // and rd only settles (MIN) — an edit never inflates deviation — and hand_set
  // marks the row so the leaderboard includes a player edited into a mode they
  // never actually played (its population filter otherwise needs games > 0).
  await db.batch([
    // 1) Legacy shared column (displayRating fallback: lobby online list,
    //    player search, club lists, in-game rows for players with no bucket).
    db
      .prepare("UPDATE users SET rating = ?, rd = MIN(rd, ?) WHERE id = ?")
      .bind(rating, SETTLED_RD, target.id),
    // 2) Ensure both visible mode buckets exist at the new number.
    ...MODE_CATEGORIES.map((category) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak, hand_set)
           VALUES (?, ?, ?, ?, 0.09, ?, 1)`,
        )
        .bind(target.id, category, rating, SETTLED_RD, rating),
    ),
    // 3) Overwrite every per-category row to the new number.
    db
      .prepare(
        "UPDATE user_ratings SET rating = ?, rd = MIN(rd, ?), peak = MAX(peak, ?), hand_set = 1 WHERE user_id = ?",
      )
      .bind(rating, SETTLED_RD, rating, target.id),
  ]);

  return NextResponse.json({ ok: true, username: target.username, rating });
}
