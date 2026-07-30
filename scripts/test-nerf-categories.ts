// Guards the keyword matchers in src/lib/nerfCategories.ts (the codex filter
// chips and the "Affects your ..." line) and scripts/audit-cards.ts (the dedupe
// fingerprint) against the bug they both shipped with: matching a keyword as a
// bare SUBSTRING, so it fires inside an unrelated word.
//
// That found "pawn" inside "spawns", "king" inside "taking" / "attacking" /
// "checking", "turn" inside "return", "row" inside "narrow" and "crown", "half"
// inside "behalf", "light" inside "headlights". 23 phantom tags across the 360
// nerfs, and because affectedLine() turns the piece categories into player-
// facing copy, 14 nerfs claimed to affect pieces they never touch.
//
// Both modules now anchor each term at a word boundary. The boundary is only at
// the FRONT, so deliberate stems still cover their family ("captur" matches
// capture / captures / capturing) while compounds that must match need their own
// entry ("recaptur", "asleep", "nightrook"). This test pins both halves of that
// trade: no phantom fires, and no legitimate match was lost.
//
// Run: npx -y tsx scripts/test-nerf-categories.ts

import { ALL_NERFS } from "../src/engine/nerfs/library";
import { categorize, categoriesOf, CATEGORY_DEFS } from "../src/lib/nerfCategories";
import { affectedLine } from "../src/app/codex/_components/affected";

let failures = 0;

function check(ok: boolean, what: string) {
  if (!ok) {
    console.error(`  FAIL  ${what}`);
    failures++;
  }
}

const nerf = (id: string) => {
  const n = ALL_NERFS.find((x) => x.id === id);
  if (!n) throw new Error(`test refers to a nerf that no longer exists: ${id}`);
  return n;
};

// --- 1. Phantom tags stay gone ----------------------------------------------
// Each pair is a real nerf plus a category it was wrongly given, with the word
// the keyword was hiding in.

const PHANTOMS: [string, string, string][] = [
  ["domino", "Pawns", "spawned"],
  ["own_half_only", "Pawns", "spawned"],
  ["velociraptor", "Pawns", "spawns"],
  ["exclusivity_clause", "Pawns", "spawns"],
  ["devil_on_shoulder", "Pawns", "spawns"],
  ["taking_turns", "Pawns", "spawns"],
  ["taking_turns", "King", "taking"],
  ["blinded_by_sun", "King", "attacking"],
  ["fair_fight", "King", "making"],
  ["compulsory_capture", "King", "checking"],
  ["crossing_the_rubicon", "Timing", "return"],
  ["anchored_rooks", "Timing", "return"],
  ["guerilla_tactics", "Timing", "return"],
  ["straight_and_narrow", "Positioning", "narrow"],
  ["restless_crown", "Positioning", "crown"],
  ["total_pacifism", "Positioning", "behalf"],
  ["deer_in_headlights", "Positioning", "headlights"],
];

for (const [id, cat, hidingIn] of PHANTOMS) {
  check(
    !categoriesOf(id).includes(cat),
    `${id} must not be tagged ${cat} (the keyword hides inside "${hidingIn}")`,
  );
}

// --- 2. Real tags survive the boundary anchor -------------------------------

const KEPT: [string, string][] = [
  // The compound that needs its own keyword: the whole card is "Can't recapture."
  ["turn_other_cheek", "Capturing"],
  ["paranoid", "King"],
  ["rook_on_seventh", "Rooks"],
  ["wn_deadline_queen", "Queen"],
  ["nw2_metronome", "King"],
  ["nw2_metronome", "Knights"],
  ["stay_at_home_mom", "Queen"],
  ["knight_parade", "Knights"],
  // Coverage gaps closed alongside the fix: both were tagless, so neither
  // answered any filter chip.
  ["no_drawbridge", "Movement"],
  ["no_hanging_pieces", "Movement"],
];

for (const [id, cat] of KEPT) {
  check(categoriesOf(id).includes(cat), `${id} must still be tagged ${cat}`);
}

// --- 3. Nothing collapsed --------------------------------------------------

const emptyCats = CATEGORY_DEFS.filter((c) => !ALL_NERFS.some((n) => categorize(n).includes(c.id)));
check(
  emptyCats.length === 0,
  `every filter chip must still match something (empty: ${emptyCats.map((c) => c.id).join(", ")})`,
);

// "You have no nerf" is the one nerf with genuinely no mechanic to categorise.
const tagless = ALL_NERFS.filter((n) => categorize(n).length === 0).map((n) => n.id);
check(
  tagless.length === 1 && tagless[0] === "lucky",
  `only "lucky" may be uncategorised (got: ${tagless.join(", ") || "none"})`,
);

// --- 4. The player-facing line is honest -----------------------------------
// affectedLine() only claims pieces when the card really names them, and says
// nothing at all otherwise.

const NO_LINE = [
  "blinded_by_sun",
  "exclusivity_clause",
  "devil_on_shoulder",
  "taking_turns",
  "velociraptor",
  "domino",
  "fair_fight",
  "compulsory_capture",
  "own_half_only",
  "wn_equalizer",
];
for (const id of NO_LINE) {
  const line = affectedLine("nerf", nerf(id));
  check(line === null, `${id} must render no affected-pieces line (got ${JSON.stringify(line)})`);
}

const LINES: [string, string][] = [
  ["paranoid", "Affects your kings."],
  ["rook_on_seventh", "Affects your rooks."],
  ["wn_deadline_queen", "Affects your queens."],
];
for (const [id, expected] of LINES) {
  const line = affectedLine("nerf", nerf(id));
  check(line === expected, `${id} line must be ${JSON.stringify(expected)} (got ${JSON.stringify(line)})`);
}

// --- 5. No keyword can match inside a word anywhere in the library ----------
// The structural version of check 1: if someone reintroduces `includes`, or adds
// a keyword short enough to hide in ordinary prose, this catches it across all
// 360 nerfs rather than only the cases listed above.

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const n of ALL_NERFS) {
  const text = `${n.name} ${n.description}`.toLowerCase();
  const tags = new Set(categorize(n));
  for (const c of CATEGORY_DEFS) {
    if (!tags.has(c.id)) continue;
    // The tag must be justified by at least one boundary-anchored hit, not only
    // by a mid-word one.
    const justified = c.keywords.some((k) => new RegExp(`\\b${escapeRe(k)}`).test(text));
    check(justified, `${n.id} is tagged ${c.id} with no word-boundary keyword hit`);
  }
}

if (failures) {
  console.error(`\n[test-nerf-categories] ${failures} failure(s).`);
  process.exit(1);
}
console.log(
  `[test-nerf-categories] OK: ${ALL_NERFS.length} nerfs, ${CATEGORY_DEFS.length} categories, ` +
    `${PHANTOMS.length} phantom tags gone, ${KEPT.length} real tags kept, affected-pieces copy honest.`,
);
