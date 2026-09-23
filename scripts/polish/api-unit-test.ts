// ---------------------------------------------------------------------------
// Pure-function regression checks behind slice F's API fixes, for the parts
// the HTTP fuzz (scripts/polish/api-fuzz.ts) cannot reach on a dev server:
//
//   F097  arena/end record validation (the route needs a bearer secret)
//   F048  avatar ids are catalogue keys, never prototype members
//   F078  clock bounds match what the game server runs
//   F073  every arena id shape (hex from newId) and DO code shape passes the
//         archive id check
//
//   ./node_modules/.bin/tsx scripts/polish/api-unit-test.ts
//
// Exit code 1 on any failed check.
// ---------------------------------------------------------------------------

import { validArenaEndRecord } from "../../src/lib/server/arenaRecord";
import { avatarIdFor, isAvatarId } from "../../src/lib/avatars";
import { clockWithin, CUSTOM_GAME_CLOCK, TOURNAMENT_CLOCK } from "../../src/lib/clockBounds";
import { newId } from "../../arena-service/pools";
import { HOUSE_ROSTER } from "../../src/lib/server/bots";

let failed = 0;
let passed = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) passed++;
  else {
    failed++;
    console.log(`FAIL ${name}${detail !== undefined ? ` -> ${JSON.stringify(detail)}` : ""}`);
  }
}

// ---- F097 ----
const good = {
  id: "A1B2C3D4",
  mode: "nerf",
  setup: { whiteNerfId: "no_castling", blackNerfId: "no_castling", seed: 12345, timeSec: 180, incrementSec: 2 },
  moves: ["e2e4", "e7e5"],
  bots: { w: HOUSE_ROSTER[0].userId, b: HOUSE_ROSTER[1].userId },
  seats: { w: { name: "Alpha" }, b: { name: "Beta" } },
  result: { winner: "w", reason: "checkmate" },
  startedAt: 1700000000000,
  completedAt: 1700000300000,
};
check("valid arena record passes", validArenaEndRecord(good));
check("aborted (winner null) passes", validArenaEndRecord({ ...good, result: { winner: null, reason: "aborted" } }));
check("draft fields pass", validArenaEndRecord({ ...good, draftSeed: 7, cadence: 3, draftActions: [], replayVersion: 2 }));
const bad: [string, unknown][] = [
  ["missing seats", { ...good, seats: undefined }],
  ["missing black seat", { ...good, seats: { w: { name: "Alpha" } } }],
  ["unknown mode", { ...good, mode: "blitz" }],
  ["prototype mode", { ...good, mode: "__proto__" }],
  ["real user seat", { ...good, bots: { w: HOUSE_ROSTER[0].userId, b: "0123abcd" } }],
  ["non-string move", { ...good, moves: ["e2e4", 5] }],
  ["huge move list", { ...good, moves: Array.from({ length: 5000 }, () => "e2e4") }],
  ["bad winner", { ...good, result: { winner: "x", reason: "r" } }],
  ["missing reason", { ...good, result: { winner: "w" } }],
  ["fractional clock", { ...good, setup: { ...good.setup, timeSec: 1.5 } }],
  ["negative increment", { ...good, setup: { ...good.setup, incrementSec: -1 } }],
  ["id with slash", { ...good, id: "../../x" }],
  ["missing timestamps", { ...good, startedAt: undefined }],
  ["draftActions not array", { ...good, draftActions: {} }],
  ["null", null],
  ["array", []],
];
for (const [name, rec] of bad) check(`arena record refused: ${name}`, !validArenaEndRecord(rec));

// ---- F048 ----
for (const key of ["toString", "constructor", "__proto__", "hasOwnProperty", "valueOf"]) {
  check(`avatar id ${key} refused`, !isAvatarId(key));
  check(`stored avatar ${key} falls back to a default`, avatarIdFor("someone", key) !== key);
}

// ---- F078 / F059 ----
check("7200+0 custom clock allowed", clockWithin(7200, 0, CUSTOM_GAME_CLOCK));
check("0+0 custom clock (untimed) allowed", clockWithin(0, 0, CUSTOM_GAME_CLOCK));
check("10800 base refused for tournaments", !clockWithin(10800, 0, TOURNAMENT_CLOCK));
check("180 increment allowed for tournaments", clockWithin(180, 180, TOURNAMENT_CLOCK));
check("61 increment refused for custom games", !clockWithin(300, 61, CUSTOM_GAME_CLOCK));
check("999999 refused", !clockWithin(999999, 0, CUSTOM_GAME_CLOCK));
check("negative refused", !clockWithin(300, -5, CUSTOM_GAME_CLOCK));
check("fraction refused", !clockWithin(299.5, 0, CUSTOM_GAME_CLOCK));
check("string refused", !clockWithin("300", 0, CUSTOM_GAME_CLOCK));

// ---- F073 ----
// The pattern in src/app/api/games/[id]/route.ts.
const ARCHIVE_ID = /^[A-Z0-9]{4,12}$/;
let arenaMisses = 0;
for (let i = 0; i < 2000; i++) if (!ARCHIVE_ID.test(newId().toUpperCase())) arenaMisses++;
check("every arena newId() passes the archive id check", arenaMisses === 0, arenaMisses);
const oldPattern = /^[A-Z2-9]{4,12}$/;
let oldMisses = 0;
for (let i = 0; i < 2000; i++) if (!oldPattern.test(newId().toUpperCase())) oldMisses++;
check("the old pattern refused most arena ids (documents F073)", oldMisses > 1000, oldMisses);

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
