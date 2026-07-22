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
  HOUSE_COUNT_MAX,
  HOUSE_ONLINE_COUNT,
  HOUSE_RATING_UPLIFT_MIN,
  HOUSE_RATING_UPLIFT_MAX,
  EXPANSION_SIZE,
  EXPANSION_BIO_COUNT,
  EXPANSION_BIO_POOL_SIZE,
  houseIdentity,
  houseRatingUplift,
  houseSeedRating,
  houseSeedRatingForMode,
  houseStyle,
  isExpansionPersona,
  personaBio,
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
  // Legacy personas carry a /mod-editor location label; the 2026-07 expansion
  // wave deliberately carries NONE (no fictional hometowns for labeled bots).
  if (isExpansionPersona(p.name)) {
    note(p.location === "", `expansion persona has a fictional location: ${p.name}`);
  } else {
    note(!!p.location && p.location.length > 0, `missing location: ${p.name}`);
  }
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

// --- 2026-07 expansion wave invariants --------------------------------------
const expansion = HOUSE_ROSTER.filter((p) => isExpansionPersona(p.name));
note(EXPANSION_SIZE === 300, `expansion size must be exactly 300, got ${EXPANSION_SIZE}`);
note(
  expansion.length === EXPANSION_SIZE,
  `expansion roster slice (${expansion.length}) != EXPANSION_SIZE (${EXPANSION_SIZE})`,
);
note(
  EXPANSION_BIO_COUNT === 150,
  `exactly 150 expansion bots must carry a bio, got ${EXPANSION_BIO_COUNT}`,
);
note(
  EXPANSION_BIO_POOL_SIZE >= 150,
  `expansion bio pool must hold at least 150 unique lines, got ${EXPANSION_BIO_POOL_SIZE}`,
);
const expansionBios = expansion.map((p) => personaBio(p)).filter((b): b is string => !!b);
note(
  expansionBios.length === 150,
  `expansion personas with a bio: ${expansionBios.length}, expected exactly 150`,
);
note(
  new Set(expansionBios).size === expansionBios.length,
  "expansion bios must all be distinct (no repeated templates)",
);
for (const bio of expansionBios) {
  note(!/—|–/.test(bio), `bio contains an em/en dash: ${bio}`);
  note(!/[\u{1F000}-\u{1FAFF}☀-➿]/u.test(bio), `bio contains an emoji: ${bio}`);
  note(bio.length <= 70, `bio too long (${bio.length}): ${bio}`);
}

// Legacy uplift: every legacy persona's deterministic uplift is in [300, 400]
// and stable across calls (the "no re-randomizing" guarantee).
for (const p of HOUSE_ROSTER) {
  if (isExpansionPersona(p.name)) continue;
  const uplift = houseRatingUplift(p.name);
  note(
    uplift >= HOUSE_RATING_UPLIFT_MIN && uplift <= HOUSE_RATING_UPLIFT_MAX,
    `uplift out of [300,400] for ${p.name}: ${uplift}`,
  );
  note(uplift === houseRatingUplift(p.name), `uplift not deterministic for ${p.name}`);
}

// Seed ratings and styles are deterministic (same inputs, same outputs).
for (const p of HOUSE_ROSTER.slice(0, 25)) {
  note(houseSeedRating(p) === houseSeedRating(p), `seed rating unstable: ${p.name}`);
  note(
    houseSeedRatingForMode(p, "buff") === houseSeedRatingForMode(p, "buff"),
    `mode rating unstable: ${p.name}`,
  );
  const s1 = houseStyle(p);
  const s2 = houseStyle(p);
  note(JSON.stringify(s1) === JSON.stringify(s2), `style unstable: ${p.name}`);
  note(s1.tempo >= 0.75 && s1.tempo <= 1.35, `tempo out of range: ${p.name}`);
  note(
    s1.activationChance >= 0.25 && s1.activationChance <= 0.55,
    `activation chance out of range: ${p.name}`,
  );
}

// Availability: never everyone online at once — both windows must sit clearly
// below the roster size, and active stays a subset of online.
note(
  HOUSE_ONLINE_COUNT < HOUSE_ROSTER.length,
  `online window (${HOUSE_ONLINE_COUNT}) must be below the roster size (${HOUSE_ROSTER.length})`,
);
note(
  HOUSE_COUNT_MAX <= HOUSE_ONLINE_COUNT,
  `active window max (${HOUSE_COUNT_MAX}) must not exceed the online window (${HOUSE_ONLINE_COUNT})`,
);

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
