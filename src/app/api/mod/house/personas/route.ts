import { NextResponse } from "next/server";
import { requireMod } from "@/lib/server/mod";
import { RESERVED_USERNAMES, validUsername } from "@/lib/server/auth";
import { containsProfanity } from "@/lib/profanity";
import {
  HOUSE_AVATAR_IDS,
  HOUSE_ROSTER,
  houseIdentity,
  housePersona,
  houseSeedRating,
  loadHouseIdentityOverrides,
} from "@/lib/server/bots";

export const dynamic = "force-dynamic";

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
// effective identity, plus the pickable avatar catalog (moderators may view).
export async function GET(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  return NextResponse.json(await personasView(guard.db));
}

// POST { userId, username?, avatar?, reset? }: edit one persona (admin only).
// - username: new display handle; must pass the SAME validation a player
//   registration does (3-20 [A-Za-z0-9_], not reserved, no profanity) and be
//   unused by any other account.
// - avatar: a preset id from the house avatar catalog (HOUSE_AVATAR_IDS).
// - reset: clear the override entirely and restore the baked identity.
// Fields merge onto any existing override; the users row is updated in the
// same request so the change is live everywhere the database is read.
export async function POST(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const { db, mod } = guard;
  if (mod.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let body: { userId?: unknown; username?: unknown; avatar?: unknown; reset?: unknown };
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
  if (!reset && username === null && avatar === null) {
    return NextResponse.json(
      { error: "Provide `username`, `avatar`, and/or `reset: true`." },
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
  if (avatar !== null && !HOUSE_AVATAR_IDS.includes(avatar)) {
    return NextResponse.json({ error: "Unknown avatar id." }, { status: 400 });
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
  } catch {
    return NextResponse.json(
      { error: "Could not save — that username may already be in use." },
      { status: 409 },
    );
  }

  return NextResponse.json(await personasView(db));
}
