// Arena seat identity checks. Run with:
//   npx -y tsx scripts/test-arena-seat.ts
//
// Pins the fix for "this house bot says 2600 on TV but 2300 on its profile".
//
// Root cause: games simulated on the OCI arena carry a seat rating that is a
// compile-time constant, houseSeedRating(persona), baked from the persona's
// name and skill. The arena service has no database. That constant was shipped
// straight into the lobby and TV payloads, while the profile read user_ratings,
// so the two numbers were unrelated and drifted without bound (a moderator
// override, a roster revision reaching one deploy, or simply playing rated
// games all widen it).
//
// The invariant: whenever the database knows a seat's rating, that is the
// number every surface shows. The arena's claim is a fallback for a cache miss
// and nothing more.

import { resolveArenaSeat } from "../src/lib/server/arenaSeat";
import { HOUSE_SEED_RD } from "../src/lib/server/bots";
import { PROVISIONAL_RD, isProvisional } from "../src/lib/glicko";

let failures = 0;
function check(name: string, ok: boolean, detail: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} - ${detail}`);
  if (!ok) failures++;
}

// The arena's baked claim for a bot whose real rating has since moved.
const claim = { userId: "hp_waterbottle", name: "waterbottle", rating: 2600 };

// --- The reported bug -------------------------------------------------------

{
  const seat = resolveArenaSeat(claim, { rating: 2300, username: "waterbottle" });
  check(
    "database rating wins over the arena constant",
    seat.rating === 2300 && seat.fromDatabase,
    `arena claimed ${claim.rating}, resolved ${seat.rating}`,
  );
}

// --- Fallback when the cache has nothing ------------------------------------

{
  const seat = resolveArenaSeat(claim, undefined);
  check(
    "falls back to the arena claim on a cache miss",
    seat.rating === 2600 && seat.name === "waterbottle" && !seat.fromDatabase,
    `resolved ${seat.rating} / ${seat.name}, fromDatabase ${seat.fromDatabase}`,
  );
}

// --- Renames ----------------------------------------------------------------
// The Durable Object heals renames for its own seats; external replicas had no
// equivalent, so a /mod/house rename never reached an arena game on TV.

{
  const seat = resolveArenaSeat(claim, { rating: 2300, username: "hydrationstation" });
  check(
    "database username wins over the baked persona name",
    seat.name === "hydrationstation",
    `arena claimed "${claim.name}", resolved "${seat.name}"`,
  );
}

// --- Partial cache hits -----------------------------------------------------
// Fallback is per field. A roster entry can have a canonical username but no
// rating row for the mode being played, and vice versa. Falling back wholesale
// would reintroduce the stale rating exactly when the rename had been picked
// up, which is the confusing half-fixed state.

{
  const nameOnly = resolveArenaSeat(claim, { username: "hydrationstation" });
  check(
    "username without a rating row keeps the rename and falls back on rating",
    nameOnly.name === "hydrationstation" && nameOnly.rating === 2600 && !nameOnly.fromDatabase,
    `${nameOnly.name} / ${nameOnly.rating}`,
  );
  const ratingOnly = resolveArenaSeat(claim, { rating: 2300 });
  check(
    "rating without an identity row still corrects the rating",
    ratingOnly.rating === 2300 && ratingOnly.name === "waterbottle" && ratingOnly.fromDatabase,
    `${ratingOnly.name} / ${ratingOnly.rating}`,
  );
}

// --- A rating of exactly 0 must not be treated as absent --------------------

{
  const seat = resolveArenaSeat(claim, { rating: 0 });
  check(
    "a zero rating is a value, not a miss",
    seat.rating === 0 && seat.fromDatabase,
    `resolved ${seat.rating}`,
  );
}

// --- The provisional mark ---------------------------------------------------
// buildExternalMatch hardcoded rd: 150, above PROVISIONAL_RD, so every arena
// bot rendered a "?" beside a rating it had held for hundreds of games. House
// accounts seed settled.

check(
  "house seed RD is not provisional",
  HOUSE_SEED_RD < PROVISIONAL_RD && !isProvisional({ rd: HOUSE_SEED_RD }),
  `HOUSE_SEED_RD ${HOUSE_SEED_RD} < PROVISIONAL_RD ${PROVISIONAL_RD}`,
);
check(
  "the old hardcoded 150 would have been provisional",
  isProvisional({ rd: 150 }),
  "which is why arena bots showed a provisional mark on TV",
);

console.log(
  failures === 0
    ? "\nPASS: arena seat identity OK."
    : `\nFAIL: ${failures} check(s) failed.`,
);
process.exit(failures === 0 ? 0 : 1);
