/// <reference types="@cloudflare/workers-types" />

import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import {
  isModerator,
  RESERVED_USERNAMES,
  sessionTokenFromCookieHeader,
  userForSession,
  validUsername,
  type SessionUser,
} from "@/lib/server/auth";
import { censorText, containsProfanity, findProfanity } from "@/lib/profanity";
import { isHouseEditor } from "@/lib/godPanel";
import { validateImageDataUrl } from "@/lib/imageValidate";
import {
  HOUSE_AVATAR_IDS,
  HOUSE_ROSTER,
  HOUSE_SEED_RD,
  houseIdentity,
  housePersona,
  houseSeedRating,
  houseSeedRatingForMode,
  loadHouseIdentityOverrides,
} from "@/lib/server/bots";

export const dynamic = "force-dynamic";

const MAX_BIO = 300;
// A hand-set bot rating must stay in the same sane band the player rating editor
// (/api/mod/ratings) enforces: out-of-range values poison the leaderboard sort.
const MIN_RATING = 0;
const MAX_RATING = 4000;

// Who may reach this route. Any moderator — OR the designated house editor
// (ilovenewjeans), who edits bots inline from their profiles and need not hold
// a mod role — may view and edit. The house-editor gate is a single username
// (isHouseEditor), independent of role, per the owner's request; moderators
// keep their existing /mod/house access. Every op here is a reversible identity
// edit confined to the house roster, so there is no separate admin-only path.
async function resolveActor(
  request: Request,
): Promise<{ db: D1Database; user: SessionUser } | NextResponse> {
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!isModerator(user) && !isHouseEditor(user.username)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  return { db, user };
}

// Editor for the house-bot identities (username + avatar + bio). The roster
// itself is a code constant (lib/server/bots.ts); edits are persisted as
// overrides in house_identity_overrides (migrations/0025 + 0028's bio column)
// and ALSO written to the persona's users row, which is the identity system of
// record for every live surface (profiles, leaderboard, lobby, seat attach —
// the game-server DO re-reads it within its ~60s cache window). Resolution
// everywhere is override ?? baked default, so clearing an override restores the
// code value (bio has no code default — it clears to empty).

type PersonaView = {
  userId: string;
  skill: number;
  seedRating: number;
  location: string;
  defaults: { username: string; avatar: string };
  override: { username: string | null; avatar: string | null; bio: string | null; rating: number | null } | null;
  effective: { username: string; avatar: string; bio: string | null; rating: number };
};

async function personasView(db: Parameters<typeof loadHouseIdentityOverrides>[0]): Promise<{
  personas: PersonaView[];
  avatars: readonly string[];
}> {
  const overrides = await loadHouseIdentityOverrides(db);
  return {
    personas: HOUSE_ROSTER.map((persona) => {
      const override = overrides.get(persona.userId) ?? null;
      const effective = houseIdentity(persona, override);
      // The advertised rating: the hand-set override when present, else the
      // roster seed (the legacy users.rating base; the modes seed within ~100).
      const effectiveRating = override?.rating ?? houseSeedRating(persona);
      return {
        userId: persona.userId,
        skill: persona.skill,
        seedRating: houseSeedRating(persona),
        location: persona.location,
        defaults: { username: persona.name, avatar: persona.avatar },
        override:
          override && (override.username || override.avatar || override.bio || override.rating != null)
            ? override
            : null,
        effective: { username: effective.name, avatar: effective.avatar, bio: effective.bio, rating: effectiveRating },
      };
    }),
    avatars: HOUSE_AVATAR_IDS,
  };
}

// GET: the full roster with baked defaults, stored overrides, and the effective
// identity, plus the pickable avatar catalog. Moderators and the house-editor
// account (ilovenewjeans) may view — the latter so the profile page can tell a
// bot from a real user and fetch its editable identity.
export async function GET(request: Request) {
  const guard = await resolveActor(request);
  if (guard instanceof NextResponse) return guard;
  return NextResponse.json(await personasView(guard.db));
}

// POST { userId, username?, avatar?, bio?, rating?, reset? }: edit one persona.
// Allowed for any moderator and for the house-editor account (ilovenewjeans).
// - username: new display handle; must pass the SAME validation a player
//   registration does (3-20 [A-Za-z0-9_], not reserved, no profanity) and be
//   unused by any other account.
// - avatar: a preset id from the house avatar catalog (HOUSE_AVATAR_IDS) OR a
//   custom uploaded image as a data URL (re-validated by imageValidate).
// - bio: a profile bio (<= 300 chars, profanity censored like /api/auth/bio);
//   an empty string clears it.
// - rating: a hand-set rating in [0, 4000] that overrides the roster seed for
//   BOTH modes and the legacy column; null clears it back to the seed. Stored in
//   the override so syncHouseRatings never reverts it. This is the bot-side of
//   the player rating editor, folded into the same House bot menu.
// - reset: clear the override entirely and restore the baked identity.
// Fields merge onto any existing override; the users row is updated in the
// same request so the change is live everywhere the database is read.
export async function POST(request: Request) {
  const guard = await resolveActor(request);
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;

  let body: {
    userId?: unknown;
    username?: unknown;
    avatar?: unknown;
    bio?: unknown;
    rating?: unknown;
    reset?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId : "";
  const persona = housePersona(userId);
  if (!persona) return NextResponse.json({ error: "Unknown house persona." }, { status: 404 });

  const reset = body.reset === true;
  const username = typeof body.username === "string" ? body.username.trim() : null;
  const avatar = typeof body.avatar === "string" ? body.avatar : null;
  // rating: `undefined` = field omitted (leave as-is); `null` = explicit clear
  // (restore the roster seed); a number or non-blank numeric string is validated
  // and rounded like the player rating editor. `false` = invalid input sentinel.
  let rating: number | null | undefined;
  if (body.rating === null) {
    rating = null;
  } else if (body.rating === undefined) {
    rating = undefined;
  } else {
    const raw = body.rating;
    const num =
      typeof raw === "number"
        ? raw
        : typeof raw === "string" && raw.trim() !== ""
          ? Number(raw)
          : NaN;
    if (!Number.isFinite(num)) {
      return NextResponse.json({ error: "Rating must be a number." }, { status: 400 });
    }
    const rounded = Math.round(num);
    if (rounded < MIN_RATING || rounded > MAX_RATING) {
      return NextResponse.json(
        { error: `Rating must be between ${MIN_RATING} and ${MAX_RATING}.` },
        { status: 400 },
      );
    }
    rating = rounded;
  }
  // bio: `undefined` = field omitted (leave as-is); `null` = explicit clear; a
  // string is trimmed, capped, and profanity-censored (never rejected) like the
  // player-facing /api/auth/bio route, then normalized to null when empty.
  let bio: string | null | undefined;
  if (typeof body.bio === "string") {
    const trimmed = body.bio.trim().slice(0, MAX_BIO);
    bio = trimmed ? (findProfanity(trimmed).length ? censorText(trimmed) : trimmed) : null;
  } else if (body.bio === null) {
    bio = null;
  } else {
    bio = undefined;
  }
  if (!reset && username === null && avatar === null && bio === undefined && rating === undefined) {
    return NextResponse.json(
      { error: "Provide `username`, `avatar`, `bio`, `rating`, and/or `reset: true`." },
      { status: 400 },
    );
  }

  if (username !== null && username.toLowerCase() !== persona.name.toLowerCase()) {
    // Same gauntlet a player registration/rename runs.
    if (!validUsername(username)) {
      return NextResponse.json(
        { error: "Username must be 3-20 characters: letters, digits, underscores." },
        { status: 400 },
      );
    }
    if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
      return NextResponse.json({ error: "That username is reserved." }, { status: 400 });
    }
    if (containsProfanity(username)) {
      return NextResponse.json({ error: "Please pick a different username." }, { status: 400 });
    }
    const taken = await db
      .prepare("SELECT id FROM users WHERE username_lower = ? AND id <> ?")
      .bind(username.toLowerCase(), persona.userId)
      .first<{ id: string }>();
    if (taken) return NextResponse.json({ error: "That username is taken." }, { status: 409 });
  }
  // avatar may be a preset from the house catalog OR a custom uploaded image
  // (a data URL). The upload is re-validated server-side (MIME, byte-size, and
  // pixel dimensions via imageValidate) — client checks are never trusted.
  if (avatar !== null && !HOUSE_AVATAR_IDS.includes(avatar)) {
    const img = validateImageDataUrl(avatar);
    if (!img.ok) {
      return NextResponse.json(
        { error: `Unknown avatar id. ${img.error}` },
        { status: 400 },
      );
    }
  }

  // Merge onto the stored override (a save of only one field keeps the others),
  // then resolve the effective identity and write both stores.
  const current = (await loadHouseIdentityOverrides(db)).get(persona.userId) ?? null;
  const next = reset
    ? { username: null, avatar: null, bio: null, rating: null }
    : {
        username: username ?? current?.username ?? null,
        avatar: avatar ?? current?.avatar ?? null,
        bio: bio !== undefined ? bio : current?.bio ?? null,
        rating: rating !== undefined ? rating : current?.rating ?? null,
      };
  // Storing the baked value is the same as no override; normalize it away so
  // a future roster revision isn't pinned by a no-op row. (Bio has no baked
  // value, so an empty bio is already normalized to null above. Rating has no
  // single baked value — the modes seed apart — so it stays explicit.)
  if (next.username === persona.name) next.username = null;
  if (next.avatar === persona.avatar) next.avatar = null;

  const effective = houseIdentity(persona, next);
  // Only touch the rating stores when this request actually changed the rating
  // (a value was provided, or a reset). An identity-only save (name/avatar/bio)
  // must leave user_ratings alone — a bot's mode ratings drift through filler
  // games, and rewriting them to the seed as a side effect would revert that.
  const ratingTouched = reset || rating !== undefined;
  // The rating to write when touched: the override when set, else the roster
  // seed (so a clear/reset restores the seeded number).
  const effectiveRating = next.rating ?? houseSeedRating(persona);
  try {
    if (next.username === null && next.avatar === null && next.bio === null && next.rating === null) {
      await db.prepare("DELETE FROM house_identity_overrides WHERE user_id = ?").bind(persona.userId).run();
    } else {
      await db
        .prepare(
          `INSERT INTO house_identity_overrides (user_id, username, avatar, bio, rating, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             username = excluded.username, avatar = excluded.avatar, bio = excluded.bio,
             rating = excluded.rating, updated_at = excluded.updated_at`,
        )
        .bind(persona.userId, next.username, next.avatar, next.bio, next.rating, Date.now())
        .run();
    }
    // The users row is what every live surface reads for identity. A unique-index
    // collision on a restored baked name maps to 409.
    await db
      .prepare("UPDATE users SET username = ?, username_lower = ?, avatar = ?, bio = ? WHERE id = ?")
      .bind(effective.name, effective.name.toLowerCase(), effective.avatar, effective.bio, persona.userId)
      .run();
    if (ratingTouched) {
      // Legacy shared column, then both mode buckets. A rating edit shows
      // immediately (the DO's house-ratings cache still refreshes it within
      // ~60s). rd settles to the house seed (non-provisional) and peak only
      // ratchets up, matching syncHouseRatings.
      await db
        .prepare("UPDATE users SET rating = ?, rd = MIN(rd, ?) WHERE id = ?")
        .bind(effectiveRating, HOUSE_SEED_RD, persona.userId)
        .run();
      for (const mode of ["nerf", "buff"] as const) {
        // The override collapses both modes to one number; a clear restores each
        // mode's own seed. INSERT-OR-IGNORE guards the rare missing-row case.
        const r = next.rating ?? houseSeedRatingForMode(persona, mode);
        await db
          .prepare(
            `INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
             VALUES (?, ?, ?, ?, 0.09, ?)`,
          )
          .bind(persona.userId, mode, r, HOUSE_SEED_RD, r)
          .run();
        await db
          .prepare(
            "UPDATE user_ratings SET rating = ?, rd = MIN(rd, ?), peak = MAX(peak, ?) WHERE user_id = ? AND category = ?",
          )
          .bind(r, HOUSE_SEED_RD, r, persona.userId, mode)
          .run();
      }
    }
  } catch {
    return NextResponse.json(
      { error: "Could not save. That username may already be in use." },
      { status: 409 },
    );
  }

  return NextResponse.json(await personasView(db));
}
