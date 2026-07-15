// Reproduction harness for the "OG NERFCHESS USERS club shows NO members" bug.
//
//   npx -y tsx scripts/repro-og-club.ts
//
// Builds a local SQLite DB (node:sqlite) with the real users/user_ratings/clubs/
// club_members schema, seeds the house users the way ensureHouseUsers does, ports
// the ensureOgClub seed SQL verbatim, then runs the EXACT members SELECT from the
// club detail route (src/app/api/clubs/[slug]/route.ts). It demonstrates:
//   BEFORE: the one-shot storage-key gate sticks after a partial/empty seed, so
//           ensureOgClub never re-runs and the detail SELECT returns 0 members.
//   AFTER:  a self-healing count gate re-runs ensureOgClub whenever membership is
//           short, so the detail SELECT returns the full ~133 members.
// It also shows the secondary failure mode: club_members rows that reference a
// missing (ghost) users row are dropped by the detail route's INNER JOIN.

import { DatabaseSync } from "node:sqlite";
import {
  HOUSE_ROSTER,
  ogClubMembers,
  OG_CLUB_ID,
  OG_CLUB_SLUG,
  OG_CLUB_NAME,
  houseSeedRating,
  houseSeedRatingForMode,
} from "../src/lib/server/bots";
import { bestLiveRatingSql } from "../src/lib/server/ratingSql";

const OG_CLUB_DESCRIPTION = "veterans";
const OG_CLUB_ICON = "Crown|gold";
const HOUSE_SEED_RD = 60;
const HOUSE_SEED_VOL = 0.06;

function freshDb(foreignKeys: boolean): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec(`PRAGMA foreign_keys = ${foreignKeys ? "ON" : "OFF"};`);
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY, username TEXT NOT NULL, username_lower TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, created_at INTEGER NOT NULL, rating REAL NOT NULL DEFAULT 1500,
      rd REAL NOT NULL DEFAULT 500, vol REAL NOT NULL DEFAULT 0.09, games INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0, losses INTEGER NOT NULL DEFAULT 0, draws INTEGER NOT NULL DEFAULT 0,
      avatar TEXT, role TEXT NOT NULL DEFAULT 'user', muted_until INTEGER, banned_until INTEGER,
      bio TEXT, is_guest INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE user_ratings (
      user_id TEXT NOT NULL REFERENCES users(id), category TEXT NOT NULL, rating REAL NOT NULL DEFAULT 1500,
      rd REAL NOT NULL DEFAULT 500, vol REAL NOT NULL DEFAULT 0.09, games INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0, losses INTEGER NOT NULL DEFAULT 0, draws INTEGER NOT NULL DEFAULT 0,
      peak REAL NOT NULL DEFAULT 1500, PRIMARY KEY (user_id, category)
    );
    CREATE TABLE clubs (
      id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '', icon TEXT NOT NULL DEFAULT '',
      owner_user_id TEXT NOT NULL REFERENCES users(id), owner_name TEXT NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE TABLE club_members (
      club_id TEXT NOT NULL REFERENCES clubs(id), user_id TEXT NOT NULL REFERENCES users(id),
      role TEXT NOT NULL DEFAULT 'member', joined_at INTEGER NOT NULL, PRIMARY KEY (club_id, user_id)
    );
  `);
  return db;
}

/** Seed house users the way ensureHouseUsers does (INSERT OR IGNORE). `skip`
 * lets us model a roster where some personas have no account yet (the ghost
 * scenario from before the self-healing account fix). */
function seedHouseUsers(db: DatabaseSync, skip: Set<string> = new Set()): void {
  const now = Date.now();
  const insU = db.prepare(
    `INSERT OR IGNORE INTO users (id, username, username_lower, password_hash, created_at, rating, rd, vol, avatar, bio)
     VALUES (?, ?, ?, ?, ?, ?, ${HOUSE_SEED_RD}, ${HOUSE_SEED_VOL}, ?, NULL)`,
  );
  const insR = db.prepare(
    `INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
     VALUES (?, ?, ?, ${HOUSE_SEED_RD}, ${HOUSE_SEED_VOL}, ?)`,
  );
  for (const p of HOUSE_ROSTER) {
    if (skip.has(p.userId)) continue;
    const base = houseSeedRating(p);
    insU.run(p.userId, p.name, p.name.toLowerCase(), "unusable", now, base, p.avatar);
    for (const mode of ["nerf", "buff"] as const) {
      const r = houseSeedRatingForMode(p, mode);
      insR.run(p.userId, mode, r, r);
    }
  }
}

/** The id of whichever club holds OG_CLUB_SLUG (the detail route resolves the
 * club by slug, so every read below does too). undefined if none exists yet. */
function ogClubIdBySlug(db: DatabaseSync): string | undefined {
  const row = db.prepare("SELECT id FROM clubs WHERE slug = ?").get(OG_CLUB_SLUG) as { id: string } | undefined;
  return row?.id;
}

/** Ported verbatim from ensureOgClub (src/lib/server/bots.ts): resolve the club
 * by slug and ADOPT a pre-existing one (a user-made club with the same slug),
 * enrolling the bots as plain members without touching its owner/identity. */
function ensureOgClub(db: DatabaseSync): void {
  const now = Date.now();
  const { owner, members } = ogClubMembers();
  let target = db
    .prepare("SELECT id, owner_user_id FROM clubs WHERE slug = ?")
    .get(OG_CLUB_SLUG) as { id: string; owner_user_id: string } | undefined;
  if (!target) {
    db.prepare(
      `INSERT OR IGNORE INTO clubs (id, slug, name, description, icon, owner_user_id, owner_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(OG_CLUB_ID, OG_CLUB_SLUG, OG_CLUB_NAME, OG_CLUB_DESCRIPTION, OG_CLUB_ICON, owner.userId, owner.name, now);
    target = db
      .prepare("SELECT id, owner_user_id FROM clubs WHERE slug = ?")
      .get(OG_CLUB_SLUG) as { id: string; owner_user_id: string } | undefined;
    if (!target) return;
  }
  const isOurClub = target.id === OG_CLUB_ID && target.owner_user_id === owner.userId;
  const clubId = target.id;
  const clubOwnerId = target.owner_user_id;
  const insM = db.prepare(
    `INSERT OR IGNORE INTO club_members (club_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)`,
  );
  for (const p of members) {
    // Never write a membership row for the adopted club's existing owner.
    if (!isOurClub && p.userId === clubOwnerId) continue;
    try {
      insM.run(clubId, p.userId, isOurClub && p.userId === owner.userId ? "owner" : "member", now);
    } catch {
      // FK violation when the persona has no users row yet — silently skipped,
      // exactly what INSERT OR IGNORE + a failed batch does in production.
    }
  }
}

/** Ported self-healing counter proposed by the fix: club_members rows for the
 * club that HOLDS THE SLUG whose user_id resolves to a live users row. 0 when no
 * club holds the slug yet (so the seed runs and creates it). */
function countOgClubMembers(db: DatabaseSync): number {
  const clubId = ogClubIdBySlug(db);
  if (!clubId) return 0;
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM club_members cm JOIN users u ON u.id = cm.user_id WHERE cm.club_id = ?`,
    )
    .get(clubId) as { n: number };
  return row.n;
}

/** The EXACT members SELECT from the club detail route (route.ts GET): resolve
 * the club by slug, then select its members. */
function detailRouteMembers(db: DatabaseSync): unknown[] {
  const clubId = ogClubIdBySlug(db);
  if (!clubId) return [];
  return db
    .prepare(
      `SELECT cm.user_id, u.username, u.avatar, ${bestLiveRatingSql("u")} AS rating,
              u.games, cm.role, cm.joined_at
       FROM club_members cm JOIN users u ON u.id = cm.user_id
       WHERE cm.club_id = ?
       ORDER BY rating DESC
       LIMIT 200`,
    )
    .all(clubId);
}

// Raw club_members count (ignoring whether the user exists) for contrast.
function rawMemberRows(db: DatabaseSync): number {
  const clubId = ogClubIdBySlug(db);
  if (!clubId) return 0;
  const row = db.prepare(`SELECT COUNT(*) AS n FROM club_members WHERE club_id = ?`).get(clubId) as {
    n: number;
  };
  return row.n;
}

const expected = ogClubMembers().members.length;
console.log(`Roster size: ${HOUSE_ROSTER.length}  |  Expected OG members: ${expected}`);
console.log("=".repeat(70));

// ---------------------------------------------------------------------------
// BEFORE THE FIX — one-shot storage key gate.
// Simulate a prior deploy that created the club row + set the key, but where the
// membership batch never landed (partial seed / roster ids differed at the time).
// The gate then sticks: ensureOgClub never re-runs.
// ---------------------------------------------------------------------------
{
  console.log("\nBEFORE FIX  (gate = one-shot key `hp:og-club:v1`)");
  const db = freshDb(true);
  seedHouseUsers(db);
  const storage: Record<string, number> = {};

  // First cold start: club created but membership DID NOT land (model the empty
  // partial seed), yet the one-shot key still got written.
  db.prepare(
    `INSERT OR IGNORE INTO clubs (id, slug, name, description, icon, owner_user_id, owner_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(OG_CLUB_ID, OG_CLUB_SLUG, OG_CLUB_NAME, OG_CLUB_DESCRIPTION, OG_CLUB_ICON, ogClubMembers().owner.userId, ogClubMembers().owner.name, Date.now());
  storage["hp:og-club:v1"] = Date.now(); // key set even though 0 members landed

  // Every subsequent cold start runs the OLD worker gate:
  for (let coldStart = 0; coldStart < 3; coldStart++) {
    if (!storage["hp:og-club:v1"]) {
      ensureOgClub(db);
      storage["hp:og-club:v1"] = Date.now();
    }
  }
  console.log(`  raw club_members rows:        ${rawMemberRows(db)}`);
  console.log(`  detail-route SELECT members:  ${detailRouteMembers(db).length}   <-- live site shows this`);
}

// ---------------------------------------------------------------------------
// SECONDARY failure — ghost users + INNER JOIN drop.
// Even if membership rows exist, if the referenced users row is missing (the
// pre-51a28f4 ghost-account bug), the detail route's `JOIN users` drops them.
// ---------------------------------------------------------------------------
{
  console.log("\nSECONDARY  (member rows exist but reference ghost users, FK off)");
  const db = freshDb(false); // FK off: orphan club_members rows are allowed to insert
  const half = new Set(HOUSE_ROSTER.slice(0, Math.floor(HOUSE_ROSTER.length / 2)).map((p) => p.userId));
  seedHouseUsers(db, half); // skip half the roster's accounts (ghosts)
  ensureOgClub(db);
  console.log(`  raw club_members rows:        ${rawMemberRows(db)}`);
  console.log(`  detail-route SELECT members:  ${detailRouteMembers(db).length}   <-- ghosts dropped by JOIN`);
  console.log(`  self-healing count (JOIN):    ${countOgClubMembers(db)}  (< ${expected} -> would re-run)`);
}

// ---------------------------------------------------------------------------
// AFTER THE FIX — self-healing count gate.
// The gate re-runs ensureOgClub whenever countOgClubMembers < expected. Users
// exist (ensureHouseUsers is already self-healing and runs first), so the seed
// completes and the detail SELECT returns the full membership.
// ---------------------------------------------------------------------------
{
  console.log("\nAFTER FIX  (gate = countOgClubMembers < ogClubMembers().length)");
  const db = freshDb(true);
  seedHouseUsers(db);
  // Model the stuck state carried over from before: club row present, 0 members.
  db.prepare(
    `INSERT OR IGNORE INTO clubs (id, slug, name, description, icon, owner_user_id, owner_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(OG_CLUB_ID, OG_CLUB_SLUG, OG_CLUB_NAME, OG_CLUB_DESCRIPTION, OG_CLUB_ICON, ogClubMembers().owner.userId, ogClubMembers().owner.name, Date.now());

  for (let coldStart = 0; coldStart < 3; coldStart++) {
    if (countOgClubMembers(db) < expected) {
      ensureOgClub(db);
    }
  }
  const members = detailRouteMembers(db) as Array<{ role: string; rating: number }>;
  console.log(`  raw club_members rows:        ${rawMemberRows(db)}`);
  console.log(`  detail-route SELECT members:  ${members.length}   <-- live site shows this`);
  console.log(`  owners in membership:         ${members.filter((m) => m.role === "owner").length}`);
  console.log(`  ratings sorted desc:          ${members.slice(0, 3).map((m) => m.rating).join(", ")} ...`);
  // Idempotency: a further cold start must not duplicate or grow the set.
  if (countOgClubMembers(db) < expected) ensureOgClub(db);
  console.log(`  after extra cold start:       ${detailRouteMembers(db).length} (idempotent)`);
}

// ---------------------------------------------------------------------------
// ADOPT A USER-MADE CLUB — the real live bug.
// A REAL USER created a club named "OG NERFCHESS USERS" with slug
// "og-nerfchess-users" but a DIFFERENT id and their own (non-bot) owner, BEFORE
// the seed ever ran. Because clubs.slug is NOT NULL UNIQUE, the old seed's
// INSERT OR IGNORE by OG_CLUB_ID conflicted on the slug and was ignored, its
// own id never got a row, and no bots were ever enrolled. The fix ADOPTS the
// club that holds the slug: bots join IT as plain members, its owner row is
// preserved (not duplicated, not downgraded), and the whole thing is idempotent.
// ---------------------------------------------------------------------------
{
  console.log("\nADOPT USER-MADE CLUB  (different id + real owner, same slug)");
  const db = freshDb(true);
  seedHouseUsers(db);
  const now = Date.now();

  // The real user and their club, created exactly as the POST /api/clubs route
  // does: a random id, a non-bot owner, and an 'owner' club_members row.
  const realOwnerId = "u_ilovenewjeans";
  db.prepare(
    `INSERT INTO users (id, username, username_lower, password_hash, created_at, rating, rd, vol, avatar, bio)
     VALUES (?, ?, ?, ?, ?, ?, ${HOUSE_SEED_RD}, ${HOUSE_SEED_VOL}, NULL, NULL)`,
  ).run(realOwnerId, "ilovenewjeans", "ilovenewjeans", "unusable", now, 1500);
  const userClubId = "club_user_made_abc123"; // different from OG_CLUB_ID
  db.prepare(
    `INSERT INTO clubs (id, slug, name, description, icon, owner_user_id, owner_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(userClubId, OG_CLUB_SLUG, OG_CLUB_NAME, ":) before the game goes viral", "", realOwnerId, "ilovenewjeans", now);
  db.prepare(
    `INSERT INTO club_members (club_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)`,
  ).run(userClubId, realOwnerId, now);

  const ownerPersonaId = ogClubMembers().owner.userId; // apexpawn

  const before = detailRouteMembers(db).length;
  // Self-healing gate, run every cold start.
  for (let coldStart = 0; coldStart < 3; coldStart++) {
    if (countOgClubMembers(db) < expected) ensureOgClub(db);
  }
  const rows = detailRouteMembers(db) as Array<{ user_id: string; role: string }>;
  const adoptedId = ogClubIdBySlug(db);
  const ownerRows = rows.filter((m) => m.role === "owner");
  const realOwnerRows = rows.filter((m) => m.user_id === realOwnerId);
  const apexRows = rows.filter((m) => m.user_id === ownerPersonaId);

  console.log(`  club holding the slug:        ${adoptedId}  (user-made, id preserved)`);
  console.log(`  members before heal:          ${before}   (just the real owner)`);
  console.log(`  detail-route SELECT members:  ${rows.length}   <-- live site shows this`);
  console.log(`  owner rows (must stay 1):     ${ownerRows.length}  -> ${ownerRows.map((m) => m.user_id).join(", ")}`);
  console.log(`  apexpawn joined as:           ${apexRows.map((m) => m.role).join(", ") || "(absent)"}`);
  // Idempotency: another cold start must not grow or duplicate.
  if (countOgClubMembers(db) < expected) ensureOgClub(db);
  const afterExtra = detailRouteMembers(db).length;
  console.log(`  after extra cold start:       ${afterExtra} (idempotent)`);

  const fails: string[] = [];
  if (adoptedId !== userClubId) fails.push(`bots enrolled into the wrong club (${adoptedId}), not the user's (${userClubId})`);
  if (before !== 1) fails.push(`expected 1 member (the real owner) before heal, got ${before}`);
  if (rows.length !== expected + 1) fails.push(`expected ${expected + 1} members (real owner + ${expected} bots) after heal, got ${rows.length}`);
  if (ownerRows.length !== 1) fails.push(`expected exactly 1 owner, got ${ownerRows.length}`);
  if (realOwnerRows.length !== 1) fails.push(`real owner row missing or duplicated (${realOwnerRows.length})`);
  if (ownerRows[0]?.user_id !== realOwnerId) fails.push(`owner is not the real owner (${ownerRows[0]?.user_id})`);
  if (apexRows.length !== 1 || apexRows[0]?.role !== "member") fails.push(`apexpawn must be a plain member, got ${apexRows.map((m) => m.role).join(",") || "(absent)"}`);
  if (afterExtra !== expected + 1) fails.push(`re-run was not idempotent (${afterExtra})`);
  if (fails.length) {
    console.error(`FAIL (adopt user club):\n  - ${fails.join("\n  - ")}`);
    process.exit(1);
  }
  console.log(`  PASS: bots adopted the user-made club (1 -> ${expected + 1}), owner preserved, idempotent.`);
}

// ---------------------------------------------------------------------------
// Assertions — this harness doubles as a regression test for the self-healing
// gate. Exits non-zero if the AFTER-fix behaviour ever regresses.
// ---------------------------------------------------------------------------
{
  const db = freshDb(true);
  seedHouseUsers(db);
  // Stuck state carried in from a partial one-shot seed: club row, 0 members.
  db.prepare(
    `INSERT OR IGNORE INTO clubs (id, slug, name, description, icon, owner_user_id, owner_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(OG_CLUB_ID, OG_CLUB_SLUG, OG_CLUB_NAME, OG_CLUB_DESCRIPTION, OG_CLUB_ICON, ogClubMembers().owner.userId, ogClubMembers().owner.name, Date.now());

  const before = detailRouteMembers(db).length;
  if (countOgClubMembers(db) < expected) ensureOgClub(db); // the self-healing gate
  const after = detailRouteMembers(db).length;
  const owners = (detailRouteMembers(db) as Array<{ role: string }>).filter((m) => m.role === "owner").length;

  const fails: string[] = [];
  if (before !== 0) fails.push(`expected 0 members before heal, got ${before}`);
  if (after !== expected) fails.push(`expected ${expected} members after heal, got ${after}`);
  if (owners !== 1) fails.push(`expected exactly 1 owner, got ${owners}`);
  if (countOgClubMembers(db) < expected) ensureOgClub(db);
  if (detailRouteMembers(db).length !== expected) fails.push("re-run was not idempotent");

  console.log("\n" + "=".repeat(70));
  if (fails.length) {
    console.error(`FAIL:\n  - ${fails.join("\n  - ")}`);
    process.exit(1);
  }
  console.log(`PASS: self-healing gate heals 0 -> ${expected} members and is idempotent.`);
}
