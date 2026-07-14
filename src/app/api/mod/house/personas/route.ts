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
import {
  HOUSE_AVATAR_IDS,
  HOUSE_ROSTER,
  houseIdentity,
  housePersona,
  houseSeedRating,
  loadHouseIdentityOverrides,
} from "@/lib/server/bots";

export const dynamic = "force-dynamic";

const MAX_BIO = 300;

// Who may reach this route. Any moderator — OR the designated house editor
// (ilovenewjeans), who edits bots inline from their profiles and need not hold
// a mod role — may VIEW. Editing additionally requires the admin role OR that
// same house-editor account. The house editor gate is a single username
// (isHouseEditor), independent of role, per the owner's request.
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

function canEditIdentities(user: SessionUser): boolean {
  return user.role === "admin" || isHouseEditor(user.username);
}

// Admin editor for the house-bot identities (username + avatar). The roster
// itself is a code constant (lib/server/bots.ts); edits are persisted as
// overrides in house_identity_overrides (migrations/0025) and ALSO written to
// the persona's users row, which is the identity system of record for every
// live surface (profiles, leaderboard, lobby, seat attach — the game-server DO
// re-reads it within its ~60s cache window). Resolution everywhere is
// override ?? baked default, so clearing an override restores the code value.

type PersonaView = {
  userId: string;
  skill: number;
  seedRating: number;
  location: string;
  defaults: { username: string; avatar: string };
  override: { username: string | null; avatar: string | null } | null;
  effective: { username: string; avatar: string };
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
      return {
        userId: persona.userId,
        skill: persona.skill,
        seedRating: houseSeedRating(persona),
        location: persona.location,
        defaults: { username: persona.name, avatar: persona.avatar },
        override: override && (override.username || override.avatar) ? override : null,
        effective: { username: effective.name, avatar: effective.avatar },
      };
    }),
    avatars: HOUSE_AVATAR_IDS,
  };
}

// GET: the full roster with baked defaults, stored overrides, and the
// effective identity, plus the pickable avatar catalog. Moderators and the
// house-editor account (ilovenewjeans) may view — the latter so the profile
// page can tell a bot from a real user and fetch its editable identity.
export async function GET(request: Request) {
  const guard = await resolveActor(request);
  if (guard instanceof NextResponse) return guard;
  return NextResponse.json(await personasView(guard.db));
}

// POST { userId, username?, avatar?, bio?, reset? }: edit one persona. Allowed
// for admins and for the house-editor account (ilovenewjeans).
// - username: new display handle; must pass the SAME validation a player
//   registration does (3-20 [A-Za-z0-9_], not reserved, no profanity) and be
//   unused by any other account.
// - avatar: a preset id from the house avatar catalog (HOUSE_AVATAR_IDS).
// - bio: the profile "about me" line; profanity is censored, not rejected
//   (matches /api/auth/bio). Written straight to the users row (bio is not part
//   of the identity-override table, and syncHouseRatings never clobbers a
//   non-empty bio, so a direct write is durable).
// - reset: clear the username/avatar override entirely and restore the baked
//   identity. Bio is left as-is by a reset (it lives on the users row).
// Username/avatar merge onto any existing override; the users row is updated in
// the same request so the change is live everywhere the database is read.
export async function POST(request: Request) {
  const guard = await resolveActor(request);
  if (guard instanceof NextResponse) return guard;
  const { db, user } = guard;
  if (!canEditIdentities(user)) {
    return NextResponse.json({ error: "Not authorized to edit house identities." }, { status: 403 });
  }

  let body: { userId?: unknown; username?: unknown; avatar?: unknown; bio?: unknown; reset?: unknown };
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
  // bio: present when the key is sent at all (null/"" clears it). `undefined`
  // means "not editing the bio in this request".
  const editingBio = "bio" in body && body.bio !== undefined;
  if (!reset && username === null && avatar === null && !editingBio) {
    return NextResponse.json(
      { error: "Provide `username`, `avatar`, `bio`, and/or `reset: true`." },
      { status: 400 },
    );
  }
  if (editingBio && body.bio !== null && typeof body.bio !== "string") {
    return NextResponse.json({ error: "Invalid bio." }, { status: 400 });
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
  if (avatar !== null && !HOUSE_AVATAR_IDS.includes(avatar)) {
    return NextResponse.json({ error: "Unknown avatar id." }, { status: 400 });
  }

  // Bio (when this request edits it): trim, cap, and censor profanity rather
  // than reject it — the exact treatment /api/auth/bio gives a real account.
  let bioValue: string | null = null;
  if (editingBio && body.bio !== null && body.bio !== "") {
    const trimmed = (body.bio as string).trim().slice(0, MAX_BIO);
    bioValue = trimmed ? (findProfanity(trimmed).length ? censorText(trimmed) : trimmed) : null;
  }

  // Merge onto the stored override (a save of only one field keeps the other),
  // then resolve the effective identity and write both stores.
  const current = (await loadHouseIdentityOverrides(db)).get(persona.userId) ?? null;
  const next = reset
    ? { username: null, avatar: null }
    : {
        username: username ?? current?.username ?? null,
        avatar: avatar ?? current?.avatar ?? null,
      };
  // Storing the baked value is the same as no override; normalize it away so
  // a future roster revision isn't pinned by a no-op row.
  if (next.username === persona.name) next.username = null;
  if (next.avatar === persona.avatar) next.avatar = null;

  const effective = houseIdentity(persona, next);
  try {
    if (next.username === null && next.avatar === null) {
      await db.prepare("DELETE FROM house_identity_overrides WHERE user_id = ?").bind(persona.userId).run();
    } else {
      await db
        .prepare(
          `INSERT INTO house_identity_overrides (user_id, username, avatar, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             username = excluded.username, avatar = excluded.avatar, updated_at = excluded.updated_at`,
        )
        .bind(persona.userId, next.username, next.avatar, Date.now())
        .run();
    }
    // The users row is what every live surface reads. A unique-index collision
    // (someone registered the restored baked name meanwhile) maps to 409.
    await db
      .prepare("UPDATE users SET username = ?, username_lower = ?, avatar = ? WHERE id = ?")
      .bind(effective.name, effective.name.toLowerCase(), effective.avatar, persona.userId)
      .run();
    // Bio lives only on the users row (no override table). syncHouseRatings
    // fills bio only when empty, so a value set here survives a roster resync.
    if (editingBio) {
      await db.prepare("UPDATE users SET bio = ? WHERE id = ?").bind(bioValue, persona.userId).run();
    }
  } catch {
    return NextResponse.json(
      { error: "Could not save — that username may already be in use." },
      { status: 409 },
    );
  }

  // Echo the stored (censored) bio when this request set it, so the caller can
  // reflect exactly what was kept without re-fetching the profile.
  const view = await personasView(db);
  return NextResponse.json(editingBio ? { ...view, bio: bioValue } : view);
}
