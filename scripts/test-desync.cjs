// Zero-dependency test harness for the desync-telemetry fingerprint. Run after
// `npm run server:build`.
//
//   npm run test:desync
//
// Verifies the fingerprint is deterministic, order-independent over the legal
// move list, changes when the position changes, and that compareFingerprints
// flags real divergences while passing identical states.

const path = require("path");
function load(mod) {
  return require(path.join(__dirname, "..", "dist-server", "src", "engine", mod));
}

const { newGameAsColor, legalMoves, playMove } = load("game.js");
const { ALL_NERFS } = load("nerfs/library.js");
const {
  desyncFingerprint,
  legalMovesSignature,
  compareFingerprints,
  activeRuleIds,
  fnv1a,
} = load("desync.js");

const errors = [];
function check(cond, msg) {
  if (!cond) errors.push(msg);
}

const nerf = ALL_NERFS.find((n) => n.implemented) || ALL_NERFS[0];
const g0 = newGameAsColor(nerf, "w", 12345);

// 1. Deterministic: same game, same fingerprint.
const fpA = desyncFingerprint(g0);
const fpB = desyncFingerprint(g0);
check(fpA.hash === fpB.hash, "fingerprint not deterministic for the same game");
check(/^[0-9a-f]{8}$/.test(fpA.hash), `hash is not 8 hex chars: ${fpA.hash}`);

// 2. Order-independent legal-move signature: shuffling the move list must not
//    change its signature (the two engines may enumerate in different orders).
const moves = legalMoves(g0);
const shuffled = [...moves].reverse();
check(
  legalMovesSignature(moves) === legalMovesSignature(shuffled),
  "legalMovesSignature is order dependent",
);

// 3. Playing a move changes the fingerprint (position + moves both move on).
const g1 = playMove(g0, moves[0]);
const fp1 = desyncFingerprint(g1);
check(fp1.hash !== fpA.hash, "fingerprint did not change after a move");

// 4. compareFingerprints: identical states agree, divergent states are flagged.
const same = compareFingerprints(fpA, fpB);
check(same.ok === true, "compareFingerprints marked identical states as diverged");
const diff = compareFingerprints(fpA, fp1);
check(diff.ok === false, "compareFingerprints missed a real divergence");
check(diff.diverged.pos === true, "divergence did not flag a position change");

// 5. activeRuleIds names both nerfs, so a report can point at the culprit.
const rules = activeRuleIds(g0);
check(
  rules.some((r) => r.startsWith("w:")) && rules.some((r) => r.startsWith("b:")),
  "activeRuleIds is missing a nerf id",
);

// 6. fnv1a basic sanity: stable and differs on differing input.
check(fnv1a("abc") === fnv1a("abc"), "fnv1a not stable");
check(fnv1a("abc") !== fnv1a("abd"), "fnv1a collided on trivially different input");

if (errors.length) {
  console.error("desync harness FAILED:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(`OK: desync fingerprint harness passed (sample hash ${fpA.hash}, ${rules.length} active rule ids)`);
