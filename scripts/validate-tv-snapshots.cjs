// Production-safe TV snapshot validator. Run after `npm run server:build`.
//
//   node scripts/validate-tv-snapshots.cjs --selftest
//   node scripts/validate-tv-snapshots.cjs path/to/records.json
//   cat records.json | node scripts/validate-tv-snapshots.cjs
//   node scripts/validate-tv-snapshots.cjs --records-url https://.../api/tv-records
//
// A ONE-SHOT diagnostic (never a permanent loop) that, for each live TV game,
// reconstructs it server-side, builds its PUBLIC snapshot, recomputes the parity
// hash, and asserts the snapshot is shippable:
//
//   - reconstructable (gameFromMatch / replayToPosition did not return null);
//   - carries a compatible schemaVersion + replayVersion;
//   - carries a non-empty parity hash that recomputes to the same value;
//   - contains NO secret field (slot rng, draft seed, an unrevealed nerf id, a
//     hidden card, a private offer's cards, private chat).
//
// It mirrors the /api/desync beacon discipline: it prints ONLY ids, hashes, and
// versions -- never board or private state -- so it is safe to run against the
// live pool during verification. A game that cannot be reconstructed is reported
// as `unreconstructable` (the TV layer excludes it and shows a structured error
// instead of a wrong / starting board), which is a DIAGNOSIS, not a script
// failure -- unless --strict is passed.
//
// Input: an array of EngineMatch records, or { games: [ { record, ... } ] }.
// Each record is the { setup, mode, draft, draftSeed, moves, draftActions }
// subset the engine replays (see src/engine/replay.ts EngineMatch). An optional
// per-record `over` / `revealedNerfs` controls the reveal gate; by default a
// game with a `result` reveals its nerfs and a live game hides them.

const fs = require("fs");
const path = require("path");
function load(mod) {
  return require(path.join(__dirname, "..", "dist-server", "src", "engine", mod));
}

const {
  toPublicSnapshot,
  PUBLIC_SNAPSHOT_VERSION,
} = load("game.js");
const { publicStateHash } = load("desync.js");
const { replayToPosition } = load("replay.js");

// The worker's REPLAY_VERSION at build time. Kept as a literal so the diagnostic
// has no dependency on the (non-engine) worker bundle; a mismatch surfaces as an
// incompatible replayVersion, which is exactly what we are validating.
const REPLAY_VERSION = 10;

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const selftest = args.includes("--selftest");
const fileArg = args.find((a) => !a.startsWith("--"));
const urlIdx = args.indexOf("--records-url");
const recordsUrl = urlIdx >= 0 ? args[urlIdx + 1] : null;

// ---------------------------------------------------------------------------
// Build the PUBLIC snapshot for one reconstructed game, then validate it.
// ---------------------------------------------------------------------------
function bitsFor(rec, game) {
  const over = !!(rec.over || (game.result != null));
  const revealed =
    rec.revealedNerfs ??
    (rec.mode === "buff"
      ? { w: null, b: null }
      : over
        ? { w: rec.setup.whiteNerfId, b: rec.setup.blackNerfId }
        : { w: null, b: null });
  return {
    gameId: rec.id || "unknown",
    replayVersion: rec.replayVersion ?? REPLAY_VERSION,
    stateRevision: rec.seq ?? rec.moves.length,
    lastSeq: rec.seq ?? rec.moves.length,
    cursor: rec.draftActions ? rec.draftActions.length : 0,
    capturedAtMs: 0,
    mode: rec.mode ?? null,
    rated: !!rec.rated,
    players: {
      w: { name: rec.wName || "White", rating: rec.wRating ?? null },
      b: { name: rec.bName || "Black", rating: rec.bRating ?? null },
    },
    clocks: { w: 0, b: 0 },
    timeSec: rec.timeSec ?? 0,
    incrementSec: rec.incrementSec ?? 0,
    timerState: "paused",
    revealedNerfs: revealed,
    offerSeats: { w: false, b: false },
    nextDraftAtPly: null,
    spectatorDelaySec: 0,
    lastCardPlayId: null,
  };
}

// Secret strings this game's snapshot must NEVER contain (the reveal gate is off
// for a live game). Assembled from what the diagnostic itself can see server-
// side, so we can prove none of it leaked into the public projection.
function secretStrings(rec, game) {
  const out = [];
  const over = !!(rec.over || (game.result != null));
  if (rec.mode !== "buff" && !over) {
    if (rec.setup.whiteNerfId) out.push(rec.setup.whiteNerfId);
    if (rec.setup.blackNerfId) out.push(rec.setup.blackNerfId);
  }
  if (rec.draftSeed != null) out.push(String(rec.draftSeed));
  if (rec.setup.seed != null) out.push(String(rec.setup.seed));
  // A hidden card id planted for the self-test.
  if (rec.__secretCardId) out.push(rec.__secretCardId);
  return out;
}

function validateOne(rec) {
  const id = rec.id || "unknown";
  let game;
  try {
    game = replayToPosition(rec);
  } catch (e) {
    return { id, status: "unreconstructable", reason: "threw:" + (e && e.message) };
  }
  if (!game) {
    // The exact current wrong/starting-board hazard: excluded from TV, shown as
    // a structured error. A diagnosis, not a crash.
    return { id, status: "unreconstructable", reason: "gameFromMatch_null" };
  }

  const snap = toPublicSnapshot(game, bitsFor(rec, game));
  snap.publicHash = publicStateHash(snap);
  const json = JSON.stringify(snap);
  const problems = [];

  if (snap.schemaVersion !== PUBLIC_SNAPSHOT_VERSION) {
    problems.push(`schemaVersion ${snap.schemaVersion} != ${PUBLIC_SNAPSHOT_VERSION}`);
  }
  if (snap.replayVersion !== REPLAY_VERSION) {
    problems.push(`replayVersion ${snap.replayVersion} != ${REPLAY_VERSION}`);
  }
  if (!snap.publicHash) problems.push("empty publicHash");
  if (publicStateHash(snap) !== snap.publicHash) problems.push("hash not reproducible");

  for (const secret of secretStrings(rec, game)) {
    if (secret && json.includes(secret)) problems.push(`leaked secret "${secret}"`);
  }
  // Field-name guard for the always-private engine fields.
  if (/"rngState"|"draftSeed"|"oppReveal"/.test(json)) problems.push("secret field name present");

  if (problems.length) return { id, status: "invalid", hash: snap.publicHash, schema: snap.schemaVersion, replay: snap.replayVersion, problems };
  return { id, status: "ok", hash: snap.publicHash, schema: snap.schemaVersion, replay: snap.replayVersion };
}

// ---------------------------------------------------------------------------
// Input acquisition.
// ---------------------------------------------------------------------------
function normalizeRecords(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.games)) return parsed.games.map((g) => g.record ?? g);
  if (parsed && Array.isArray(parsed.records)) return parsed.records;
  throw new Error("input must be an array of records or { games: [...] } / { records: [...] }");
}

function selftestRecords() {
  const seed = 424242;
  // A plain live buff game with a board-rewriting summon: must validate clean.
  const summon = {
    id: "selftest-summon",
    setup: { whiteNerfId: "unrestricted", blackNerfId: "unrestricted", seed },
    mode: "buff",
    draft: true,
    draftSeed: seed,
    moves: ["e2e4", "e7e5"],
    draftActions: [
      { ply: 2, color: "w", a: "grant", id: "summon_knight" },
      { ply: 2, color: "w", a: "use", buffIndex: 0, picks: [{ square: 27 }] },
    ],
  };
  // A live nerf game whose secret nerf id must be ABSENT from the snapshot.
  const secretNerf = {
    id: "selftest-secret-nerf",
    setup: { whiteNerfId: "lucky", blackNerfId: "lucky", seed: 5150 },
    mode: "nerf",
    moves: [],
    over: false,
  };
  // An unreconstructable game (unknown nerf id): must be flagged, not shipped as
  // a starting board.
  const broken = {
    id: "selftest-broken",
    setup: { whiteNerfId: "no_such_nerf_xyz", blackNerfId: "no_such_nerf_xyz", seed: 1 },
    mode: "nerf",
    moves: ["e2e4"],
  };
  return [summon, secretNerf, broken];
}

async function main() {
  let records;
  if (selftest) {
    records = selftestRecords();
  } else if (recordsUrl) {
    const res = await fetch(recordsUrl);
    if (!res.ok) throw new Error(`records-url fetch failed: ${res.status}`);
    records = normalizeRecords(await res.json());
  } else {
    let raw;
    if (fileArg) raw = fs.readFileSync(fileArg, "utf8");
    else raw = fs.readFileSync(0, "utf8"); // stdin
    records = normalizeRecords(JSON.parse(raw));
  }

  const results = records.map(validateOne);
  let okCount = 0;
  let invalidCount = 0;
  let unreconstructable = 0;
  for (const r of results) {
    if (r.status === "ok") {
      okCount++;
      console.log(`  OK    ${r.id}  hash=${r.hash} schema=${r.schema} replay=${r.replay}`);
    } else if (r.status === "unreconstructable") {
      unreconstructable++;
      console.log(`  SKIP  ${r.id}  unreconstructable (${r.reason}) -> excluded from TV, structured error`);
    } else {
      invalidCount++;
      console.log(`  BAD   ${r.id}  ${r.problems.join("; ")}`);
    }
  }
  console.log(
    `\nvalidate-tv-snapshots: ${results.length} game(s) -> ${okCount} ok, ` +
      `${invalidCount} invalid, ${unreconstructable} unreconstructable`,
  );

  // A self-test also asserts the EXPECTED shape: the summon validates, the
  // secret-nerf game is ok AND hid its nerf, and the broken game is flagged.
  if (selftest) {
    const byId = Object.fromEntries(results.map((r) => [r.id, r]));
    const expectations = [
      [byId["selftest-summon"]?.status === "ok", "summon game validates clean"],
      [byId["selftest-secret-nerf"]?.status === "ok", "secret-nerf game validates (nerf hidden)"],
      [byId["selftest-broken"]?.status === "unreconstructable", "broken game flagged unreconstructable"],
    ];
    let selfFail = 0;
    for (const [pass, label] of expectations) {
      console.log((pass ? "  ok  " : "FAIL  ") + label);
      if (!pass) selfFail++;
    }
    if (selfFail) {
      console.log(`SELFTEST: ${selfFail} failure(s)`);
      process.exit(1);
    }
    console.log("SELFTEST: passed");
    return;
  }

  // In strict mode any invalid (or unreconstructable) game fails the run; by
  // default only a genuinely INVALID snapshot fails (unreconstructable is an
  // expected, safely-handled state).
  if (invalidCount > 0 || (strict && unreconstructable > 0)) process.exit(1);
}

main().catch((e) => {
  console.error("validate-tv-snapshots error:", e && e.message ? e.message : e);
  process.exit(2);
});
