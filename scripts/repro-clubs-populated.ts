// Reproduction / regression harness for "every other club looks dead".
//
//   npx -y tsx scripts/repro-clubs-populated.ts
//
// Builds a local SQLite DB (node:sqlite) with the real users/clubs/club_members
// schema, seeds the house users, creates a mix of clubs (bot-owned, real-owned,
// plus the OG club), then runs the ensureClubsPopulated seed SQL verbatim behind
// the same self-healing gate the worker uses (countUnderpopulatedClubs). It
// asserts:
//   - every non-OG club ends with >= CLUB_FILL_MIN (10) live bot members,
//   - the OG club is left untouched by this seeder,
//   - the seed is idempotent (a second cold start adds nothing),
//   - no club's owner row is duplicated, downgraded, or altered,
//   - a real user's own membership row is never touched.

import { DatabaseSync } from "node:sqlite";
import {
  HOUSE_ROSTER,
  CLUB_FILL_MIN,
  CLUB_FILL_MAX,
  clubBotTargetCount,
  clubBotMembers,
  OG_CLUB_SLUG,
  houseSeedRating,
  houseSeedRatingForMode,
} from "../src/lib/server/bots";

const HOUSE_SEED_RD = 60;
const HOUSE_SEED_VOL = 0.06;

function freshDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec(`PRAGMA foreign_keys = ON;`);
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY, username TEXT NOT NULL, username_lower TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, created_at INTEGER NOT NULL, rating REAL NOT NULL DEFAULT 1500,
      rd REAL NOT NULL DEFAULT 500, vol REAL NOT NULL DEFAULT 0.09, games INTEGER NOT NULL DEFAULT 0,
      avatar TEXT, bio TEXT
    );
    CREATE TABLE user_ratings (
      user_id TEXT NOT NULL REFERENCES users(id), category TEXT NOT NULL, rating REAL NOT NULL DEFAULT 1500,
      rd REAL NOT NULL DEFAULT 500, vol REAL NOT NULL DEFAULT 0.09, peak REAL NOT NULL DEFAULT 1500,
      PRIMARY KEY (user_id, category)
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

function seedHouseUsers(db: DatabaseSync): void {
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
    insU.run(p.userId, p.name, p.name.toLowerCase(), "unusable", now, houseSeedRating(p), p.avatar);
    for (const mode of ["nerf", "buff"] as const) {
      const r = houseSeedRatingForMode(p, mode);
      insR.run(p.userId, mode, r, r);
    }
  }
}

/** Ported verbatim from ensureClubsPopulated (src/lib/server/bots.ts). */
function ensureClubsPopulated(db: DatabaseSync): void {
  const clubs = db.prepare("SELECT id, slug, owner_user_id FROM clubs").all() as Array<{
    id: string;
    slug: string;
    owner_user_id: string;
  }>;
  const now = Date.now();
  const insM = db.prepare(
    `INSERT OR IGNORE INTO club_members (club_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)`,
  );
  for (const club of clubs) {
    if (club.slug === OG_CLUB_SLUG) continue;
    const members = clubBotMembers(club.slug, clubBotTargetCount(club.slug));
    for (const p of members) {
      if (p.userId === club.owner_user_id) continue;
      insM.run(club.id, p.userId, now);
    }
  }
}

/** Ported self-healing gate from countUnderpopulatedClubs. */
function countUnderpopulatedClubs(db: DatabaseSync): number {
  const clubs = db.prepare("SELECT id, slug FROM clubs").all() as Array<{ id: string; slug: string }>;
  const targets = clubs.filter((c) => c.slug !== OG_CLUB_SLUG);
  if (!targets.length) return 0;
  const ids = HOUSE_ROSTER.map((p) => p.userId);
  const placeholders = ids.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT cm.club_id AS club_id, COUNT(*) AS n
       FROM club_members cm JOIN users u ON u.id = cm.user_id
       WHERE cm.user_id IN (${placeholders})
       GROUP BY cm.club_id`,
    )
    .all(...ids) as Array<{ club_id: string; n: number }>;
  const byClub = new Map(rows.map((r) => [r.club_id, r.n]));
  let short = 0;
  for (const club of targets) {
    if ((byClub.get(club.id) ?? 0) < clubBotTargetCount(club.slug)) short++;
  }
  return short;
}

/** Live bot-member count for a club (INNER JOIN users, the detail-route rule). */
function liveBotMembers(db: DatabaseSync, clubId: string): number {
  const ids = HOUSE_ROSTER.map((p) => p.userId);
  const placeholders = ids.map(() => "?").join(",");
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM club_members cm JOIN users u ON u.id = cm.user_id
       WHERE cm.club_id = ? AND cm.user_id IN (${placeholders})`,
    )
    .get(clubId, ...ids) as { n: number };
  return row.n;
}

function ownerRows(db: DatabaseSync, clubId: string): Array<{ user_id: string; role: string }> {
  return db
    .prepare(`SELECT user_id, role FROM club_members WHERE club_id = ? AND role = 'owner'`)
    .all(clubId) as Array<{ user_id: string; role: string }>;
}

// ---------------------------------------------------------------------------
const db = freshDb();
seedHouseUsers(db);
const now = Date.now();

// A real (non-bot) user who owns a club and is its sole member.
db.prepare(
  `INSERT INTO users (id, username, username_lower, password_hash, created_at, rating, avatar, bio)
   VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)`,
).run("u_realowner", "realowner", "realowner", "unusable", now, 1500);

type Seeded = { id: string; slug: string; owner: string; kind: string };
const seeded: Seeded[] = [
  { id: "club_a", slug: "berlin-blitzers", owner: HOUSE_ROSTER[3].userId, kind: "bot-owned" },
  { id: "club_b", slug: "endgame-club", owner: HOUSE_ROSTER[50].userId, kind: "bot-owned" },
  { id: "club_c", slug: "gambit-house", owner: "u_realowner", kind: "real-owned (sole member)" },
  { id: "club_d", slug: "night-owls", owner: HOUSE_ROSTER[120].userId, kind: "bot-owned" },
];
for (const c of seeded) {
  const ownerName =
    c.owner === "u_realowner" ? "realowner" : HOUSE_ROSTER.find((p) => p.userId === c.owner)!.name;
  db.prepare(
    `INSERT INTO clubs (id, slug, name, description, icon, owner_user_id, owner_name, created_at)
     VALUES (?, ?, ?, 'desc', 'Crown|gold', ?, ?, ?)`,
  ).run(c.id, c.slug, c.slug, c.owner, ownerName, now);
  db.prepare(`INSERT INTO club_members (club_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)`).run(
    c.id,
    c.owner,
    now,
  );
}
// The OG club (a stand-in) must be left entirely alone by this seeder.
const ogOwner = HOUSE_ROSTER[0].userId;
db.prepare(
  `INSERT INTO clubs (id, slug, name, description, icon, owner_user_id, owner_name, created_at)
   VALUES ('club_og', ?, 'OG', 'desc', 'Crown|gold', ?, ?, ?)`,
).run(OG_CLUB_SLUG, ogOwner, HOUSE_ROSTER[0].name, now);
db.prepare(`INSERT INTO club_members (club_id, user_id, role, joined_at) VALUES ('club_og', ?, 'owner', ?)`).run(
  ogOwner,
  now,
);

console.log(`Roster ${HOUSE_ROSTER.length} | fill band [${CLUB_FILL_MIN}, ${CLUB_FILL_MAX}]`);
console.log("=".repeat(70));
console.log("BEFORE seed (each non-OG club has just its owner):");
for (const c of seeded) console.log(`  ${c.slug.padEnd(18)} live bot members: ${liveBotMembers(db, c.id)}  (${c.kind})`);

// Self-healing gate + seed, run across three cold starts (idempotent).
for (let coldStart = 0; coldStart < 3; coldStart++) {
  if (countUnderpopulatedClubs(db) > 0) ensureClubsPopulated(db);
}

console.log("\nAFTER seed:");
const fails: string[] = [];
for (const c of seeded) {
  const n = liveBotMembers(db, c.id);
  const target = clubBotTargetCount(c.slug);
  const owners = ownerRows(db, c.id);
  console.log(`  ${c.slug.padEnd(18)} live bot members: ${String(n).padStart(2)}  target ${target}  owners ${owners.length}`);
  if (n < CLUB_FILL_MIN) fails.push(`${c.slug}: ${n} bot members < floor ${CLUB_FILL_MIN}`);
  if (n < target) fails.push(`${c.slug}: ${n} < deterministic target ${target}`);
  if (owners.length !== 1) fails.push(`${c.slug}: expected exactly 1 owner, got ${owners.length}`);
  if (owners[0]?.user_id !== c.owner) fails.push(`${c.slug}: owner changed to ${owners[0]?.user_id}`);
}
// The real owner's row must be intact and still 'owner' (never touched).
const realOwnerRow = db
  .prepare(`SELECT role FROM club_members WHERE club_id = 'club_c' AND user_id = 'u_realowner'`)
  .get() as { role: string } | undefined;
if (realOwnerRow?.role !== "owner") fails.push(`real owner row altered: ${realOwnerRow?.role ?? "(missing)"}`);

// The OG club must be untouched by this seeder (still just its owner row).
const ogMembers = db.prepare(`SELECT COUNT(*) AS n FROM club_members WHERE club_id = 'club_og'`).get() as {
  n: number;
};
console.log(`  ${OG_CLUB_SLUG.padEnd(18)} club_members rows: ${ogMembers.n}  (untouched by this seeder)`);
if (ogMembers.n !== 1) fails.push(`OG club touched by ensureClubsPopulated (rows now ${ogMembers.n})`);

// Idempotency: total rows before/after one more seed must match.
const totalBefore = (db.prepare(`SELECT COUNT(*) AS n FROM club_members`).get() as { n: number }).n;
if (countUnderpopulatedClubs(db) > 0) ensureClubsPopulated(db);
const totalAfter = (db.prepare(`SELECT COUNT(*) AS n FROM club_members`).get() as { n: number }).n;
console.log(`\nidempotency: club_members rows ${totalBefore} -> ${totalAfter} after extra cold start`);
if (totalBefore !== totalAfter) fails.push(`not idempotent: ${totalBefore} -> ${totalAfter}`);
if (countUnderpopulatedClubs(db) !== 0) fails.push("gate still reports underpopulated clubs after seeding");

console.log("=".repeat(70));
if (fails.length) {
  console.error(`FAIL:\n  - ${fails.join("\n  - ")}`);
  process.exit(1);
}
console.log(`PASS: every non-OG club filled to >= ${CLUB_FILL_MIN} bot members, owners preserved, OG untouched, idempotent.`);
