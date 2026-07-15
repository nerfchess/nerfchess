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

/** Ported verbatim from ensureOgClub (src/lib/server/bots.ts). */
function ensureOgClub(db: DatabaseSync): void {
  const now = Date.now();
  const { owner, members } = ogClubMembers();
  db.prepare(
    `INSERT OR IGNORE INTO clubs (id, slug, name, description, icon, owner_user_id, owner_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(OG_CLUB_ID, OG_CLUB_SLUG, OG_CLUB_NAME, OG_CLUB_DESCRIPTION, OG_CLUB_ICON, owner.userId, owner.name, now);
  const row = db.prepare("SELECT id FROM clubs WHERE id = ?").get(OG_CLUB_ID) as { id: string } | undefined;
  if (!row) return;
  const insM = db.prepare(
    `INSERT OR IGNORE INTO club_members (club_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)`,
  );
  for (const p of members) {
    try {
      insM.run(OG_CLUB_ID, p.userId, p.userId === owner.userId ? "owner" : "member", now);
    } catch {
      // FK violation when the persona has no users row yet — silently skipped,
      // exactly what INSERT OR IGNORE + a failed batch does in production.
    }
  }
}

/** Ported self-healing counter proposed by the fix: club_members rows for the OG
 * club whose user_id resolves to a live users row. */
function countOgClubMembers(db: DatabaseSync): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM club_members cm JOIN users u ON u.id = cm.user_id WHERE cm.club_id = ?`,
    )
    .get(OG_CLUB_ID) as { n: number };
  return row.n;
}

/** The EXACT members SELECT from the club detail route (route.ts GET). */
function detailRouteMembers(db: DatabaseSync): unknown[] {
  return db
    .prepare(
      `SELECT cm.user_id, u.username, u.avatar, ${bestLiveRatingSql("u")} AS rating,
              u.games, cm.role, cm.joined_at
       FROM club_members cm JOIN users u ON u.id = cm.user_id
       WHERE cm.club_id = ?
       ORDER BY rating DESC
       LIMIT 200`,
    )
    .all(OG_CLUB_ID);
}

// Raw club_members count (ignoring whether the user exists) for contrast.
function rawMemberRows(db: DatabaseSync): number {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM club_members WHERE club_id = ?`).get(OG_CLUB_ID) as {
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
