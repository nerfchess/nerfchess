// Zero-dependency test harness for the expanded nerf library. Run after
// `npm run server:build`. Validates ids/structure/em-dashes across all nerfs,
// then runs each EXPANDED nerf as White's handicap from the opening and asserts
// it never leaves White with zero legal moves (an instant self-stalemate bug)
// and never throws.
//
//   npm run test:nerfs

const path = require("path");
function load(mod) {
  return require(path.join(__dirname, "..", "dist-server", "src", "engine", mod));
}

const { ALL_NERFS } = load("nerfs/library.js");
const { EXPANDED_NERFS } = load("nerfs/expanded/index.js");
const { newGameAsColor, legalMoves, playMove } = load("game.js");

const EM_DASH = /[—–]/;
const errors = [];

// 1. Unique ids across ALL nerfs (expanded must not collide with existing).
const seen = new Map();
for (const n of ALL_NERFS) {
  if (seen.has(n.id)) errors.push(`duplicate nerf id "${n.id}"`);
  seen.set(n.id, n);
}

// 2. Structural + text checks on the expanded nerfs.
for (const n of EXPANDED_NERFS) {
  if (!n.implemented) errors.push(`nerf "${n.id}" is not implemented`);
  if (!(Number.isInteger(n.tier) && n.tier >= 1 && n.tier <= 8))
    errors.push(`nerf "${n.id}" bad tier ${n.tier}`);
  if (!n.name || !n.description) errors.push(`nerf "${n.id}" missing name/description`);
  for (const f of ["name", "description", "flavor"]) {
    if (n[f] && EM_DASH.test(n[f])) errors.push(`nerf "${n.id}" em/en dash in ${f}`);
  }
}

// 3. Soft-lock probe: play a short opening with the nerf on White and confirm
//    White always has a legal move on its turn. Neither checkmate nor stalemate
//    happens naturally this early, so 0 legal moves means the nerf over-filtered.
function probe(n) {
  let g = newGameAsColor(n, "w", 9);
  for (let ply = 0; ply < 8; ply++) {
    if (g.result) break;
    const whiteToMove = g.board.turn === "w";
    const moves = legalMoves(g);
    if (moves.length === 0) {
      if (whiteToMove) errors.push(`nerf "${n.id}" soft-locked White (0 legal moves in opening)`);
      break;
    }
    g = playMove(g, moves[0]);
  }
}
for (const n of EXPANDED_NERFS) {
  try {
    probe(n);
  } catch (e) {
    errors.push(`nerf "${n.id}" threw during probe: ${e && e.message ? e.message : e}`);
  }
}

// Tier coverage report.
const byTier = {};
for (let t = 1; t <= 8; t++) byTier[t] = 0;
for (const n of EXPANDED_NERFS) byTier[n.tier]++;

console.log(`nerfs total: ${ALL_NERFS.length}, implemented: ${ALL_NERFS.filter((n) => n.implemented).length}`);
console.log(`expanded nerfs: ${EXPANDED_NERFS.length} -> by tier ${JSON.stringify(byTier)}`);
if (errors.length) {
  console.log("\nERRORS:");
  for (const e of errors) console.log("  - " + e);
  console.log(`\nFAIL: ${errors.length} error(s)`);
  process.exit(1);
}
console.log("\nOK: expanded nerf validation passed");
