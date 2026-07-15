// House-bot roster audit. Run with:
//
//   npx -y tsx scripts/audit-house-bots.ts
//
// Asserts the three properties a healthy roster needs so every persona's
// profile/leaderboard entry resolves and looks right:
//   1. UNIQUE pfps — no two personas share a profile picture.
//   2. FULL PROFILE COVERAGE — every persona has the expected fields, a unique
//      user id + username, and an avatar that resolves to a real served asset.
//   3. Every house-pfp avatar maps to an SVG file that exists on disk.
// Exits non-zero (with a report) if any assertion fails.

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  HOUSE_ROSTER,
  HOUSE_AVATAR_IDS,
  houseIdentity,
  houseSeedRating,
  ogClubMembers,
  OG_CLUB_NAME,
} from "../src/lib/server/bots";
import { HOUSE_PFP_NAMES, housePfpSrc, isHousePfp } from "../src/lib/avatars";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

const problems: string[] = [];
const note = (cond: boolean, msg: string) => {
  if (!cond) problems.push(msg);
};

// --- 1. Unique pfps across the whole roster --------------------------------
const avatarCounts = new Map<string, string[]>();
for (const p of HOUSE_ROSTER) {
  (avatarCounts.get(p.avatar) ?? avatarCounts.set(p.avatar, []).get(p.avatar)!).push(p.name);
}
const dupes = [...avatarCounts.entries()].filter(([, names]) => names.length > 1);
note(
  dupes.length === 0,
  `duplicate pfps: ${dupes.map(([a, n]) => `${a} <- ${n.join(", ")}`).join(" | ")}`,
);

// --- 2. Full profile coverage ----------------------------------------------
const ids = new Set<string>();
const names = new Set<string>();
for (const p of HOUSE_ROSTER) {
  const id = houseIdentity(p, null);
  note(!!p.userId && p.userId.startsWith("hp_"), `bad userId: ${p.name}`);
  note(!ids.has(p.userId), `duplicate userId: ${p.userId}`);
  ids.add(p.userId);
  note(!names.has(p.name.toLowerCase()), `duplicate username: ${p.name}`);
  names.add(p.name.toLowerCase());
  note(typeof p.skill === "number" && p.skill > 0, `bad skill: ${p.name}`);
  note(houseSeedRating(p) >= 100, `bad seed rating: ${p.name}`);
  note(!!p.location && p.location.length > 0, `missing location: ${p.name}`);
  note(!!p.avatar, `missing avatar: ${p.name}`);
  // Avatar must be a house-space id (a house pfp or a flower/other house id).
  const known = isHousePfp(p.avatar) || HOUSE_AVATAR_IDS.includes(p.avatar);
  note(known, `avatar not in house space: ${p.name} -> ${p.avatar}`);
  note(!!id.name, `empty effective name: ${p.name}`);
}

// --- 3. Every house-pfp avatar resolves to a served file --------------------
let missingFiles = 0;
for (const p of HOUSE_ROSTER) {
  if (!isHousePfp(p.avatar)) continue;
  const file = join(PUBLIC, housePfpSrc(p.avatar));
  if (!existsSync(file)) {
    missingFiles++;
    problems.push(`missing pfp file for ${p.name}: ${housePfpSrc(p.avatar)}`);
  }
}
// Also assert the catalog itself is fully backed by files (not just the
// currently-assigned slice), so future re-assignments stay safe.
let missingCatalog = 0;
for (const name of HOUSE_PFP_NAMES) {
  if (!existsSync(join(PUBLIC, "house-pfp", `${name}.svg`))) {
    missingCatalog++;
    problems.push(`catalog pfp has no file: ${name}.svg`);
  }
}

// --- OG club membership (informational + sanity) ---------------------------
const og = ogClubMembers();
const ogShare = Math.round((og.members.length / HOUSE_ROSTER.length) * 100);
note(og.members.some((m) => m.userId === og.owner.userId), "OG club owner not among members");
note(ogShare >= 55 && ogShare <= 75, `OG club share out of target 55-75%: ${ogShare}%`);
const ogIds = new Set(og.members.map((m) => m.userId));
note(ogIds.size === og.members.length, "OG club has duplicate members");

// --- Report ----------------------------------------------------------------
const uniquePfps = new Set(HOUSE_ROSTER.map((p) => p.avatar)).size;
console.log("House-bot roster audit");
console.log("======================");
console.log(`Personas:            ${HOUSE_ROSTER.length}`);
console.log(`Unique pfps in use:  ${uniquePfps} / ${HOUSE_ROSTER.length}`);
console.log(`Pfp catalog size:    ${HOUSE_PFP_NAMES.length}`);
console.log(`Unique user ids:     ${ids.size}`);
console.log(`Unique usernames:    ${names.size}`);
console.log(`Missing pfp files:   ${missingFiles}`);
console.log(`Catalog files gaps:  ${missingCatalog}`);
console.log(`"${OG_CLUB_NAME}":  ${og.members.length} members (${ogShare}% of roster), owner ${og.owner.name}`);
console.log("");

if (problems.length) {
  console.error(`FAIL: ${problems.length} problem(s):`);
  for (const p of problems.slice(0, 40)) console.error(`  - ${p}`);
  if (problems.length > 40) console.error(`  ... and ${problems.length - 40} more`);
  process.exit(1);
}
console.log("PASS: unique pfps, full profile coverage, all assets present.");
