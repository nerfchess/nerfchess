// Zero-dependency rule test harness. Run AFTER `npm run server:build` compiles
// the engine to dist-server/. Validates the whole buff library, with extra
// checks on hexes: unique ids, structural sanity, no em dashes, tier coverage.
//
//   npm run test:rules
//
// Exits non-zero on any hard failure so it can gate a PR.

const path = require("path");

function load(mod) {
  return require(path.join(__dirname, "..", "dist-server", "src", "engine", mod));
}

const { ALL_BUFFS, IMPLEMENTED_BUFFS, BUFF_BY_ID } = load("buffs/library.js");
const { PLAYABLE_NERFS } = load("nerfs/library.js");
const game = load("game.js");
const {
  newGameAsColor,
  enableDraftMode,
  acquireBuff,
  buffNextTarget,
  activateBuff,
  legalMoves,
  playMove,
  nerfDisabled,
  UNRESTRICTED_NERF,
} = game;

const EM_DASH = /[—–]/; // em dash, en dash
const errors = [];
const warns = [];

// 1. Unique ids across the ENTIRE buff library (the top risk with parallel
//    authoring of many new cards).
const seen = new Map();
for (const b of ALL_BUFFS) {
  if (seen.has(b.id)) errors.push(`duplicate id "${b.id}"`);
  seen.set(b.id, b);
}

// 2. Structural + text checks on every hex.
const hexes = ALL_BUFFS.filter((b) => b.category === "hex");
for (const h of hexes) {
  if (!h.implemented) errors.push(`hex "${h.id}" is not implemented`);
  if (!(Number.isInteger(h.tier) && h.tier >= 1 && h.tier <= 8))
    errors.push(`hex "${h.id}" has bad tier ${h.tier}`);
  if (!h.name || !h.description) errors.push(`hex "${h.id}" missing name/description`);
  for (const field of ["name", "description", "flavor"]) {
    if (h[field] && EM_DASH.test(h[field]))
      errors.push(`hex "${h.id}" has an em/en dash in ${field}`);
  }
  if (!["passive", "instant", "activated"].includes(h.kind))
    errors.push(`hex "${h.id}" has bad kind ${h.kind}`);
}

// 3. Tier coverage: the design target is 10 to 15 hexes per tier.
const byTier = {};
for (let t = 1; t <= 8; t++) byTier[t] = 0;
for (const h of hexes) byTier[h.tier]++;
for (let t = 1; t <= 8; t++) {
  if (byTier[t] < 10) warns.push(`tier ${t} has only ${byTier[t]} hexes (<10)`);
}

// 4. Sanity: implemented buffs really are the ones with mechanics.
if (IMPLEMENTED_BUFFS.length < 1) errors.push("no implemented buffs found");

// 5. DYNAMIC soft-lock probe. Run each hex in a fresh nerf-mode game where the
//    only active rule is the hex, then confirm the CURSED opponent (black) is
//    never left with zero legal moves in the opening (a clean soft-lock signal,
//    since neither checkmate nor stalemate occurs naturally in a few plies) and
//    that no king is ever frozen or petrified.
function kingIsImmobilized(g) {
  const eff = g.buffs && g.buffs.effects ? g.buffs.effects : [];
  for (const e of eff) {
    if ((e.kind === "freeze" || e.kind === "walnut") && e.turns > 0) {
      const p = g.board.pieces[e.sq];
      if (p && p.type === "k") return true;
    }
  }
  return false;
}

function probeHex(h) {
  let g = newGameAsColor(UNRESTRICTED_NERF, "w", 7);
  enableDraftMode(g, 7, { mode: "nerf" });
  acquireBuff(g, "w", h.id, h.tier);
  const ps = g.buffs.players.w;
  const idx = ps.buffs.length - 1;
  // Resolve an activated hex by greedily taking the first candidate at each step.
  if (h.kind === "activated") {
    const picks = [];
    for (let step = 0; step < 6; step++) {
      const t = buffNextTarget(g, "w", idx, picks);
      if (!t) break;
      if (t.kind === "square") {
        if (!t.squares.length) return; // no valid use from the start; fine
        picks.push({ square: t.squares[0] });
      } else if (t.kind === "enemy-buff") {
        if (!t.options.length) return;
        picks.push({ buffIndex: t.options[0].index });
      } else break;
    }
    activateBuff(g, "w", idx, picks);
  }
  if (kingIsImmobilized(g)) {
    errors.push(`hex "${h.id}" froze/petrified a king`);
    return;
  }
  // Walk a few plies; whoever is to move (with pieces on board) must have moves.
  for (let ply = 0; ply < 6; ply++) {
    if (g.result) break;
    const moves = legalMoves(g);
    if (moves.length === 0) {
      errors.push(`hex "${h.id}" soft-locked ${g.board.turn} (0 legal moves in opening)`);
      return;
    }
    g = playMove(g, moves[0]);
    if (kingIsImmobilized(g)) {
      errors.push(`hex "${h.id}" petrified a king mid-play`);
      return;
    }
  }
}

for (const h of hexes) {
  try {
    probeHex(h);
  } catch (e) {
    errors.push(`hex "${h.id}" threw during probe: ${e && e.message ? e.message : e}`);
  }
}

// 6. BOONS (category "nerf"): relief cards for your OWN nerf. Structural + text
//    checks, plus a dynamic probe: give the player a real nerf, apply the boon,
//    and confirm it does not throw or soft-lock the holder. Instant relief must
//    actually turn the holder's nerf off.
const boons = ALL_BUFFS.filter((b) => b.category === "nerf" && b.implemented);
for (const b of boons) {
  for (const field of ["name", "description", "flavor"]) {
    if (b[field] && EM_DASH.test(b[field]))
      errors.push(`boon "${b.id}" has an em/en dash in ${field}`);
  }
}
const testNerf = PLAYABLE_NERFS.find((n) => n.id !== "lucky") || PLAYABLE_NERFS[0];
function probeBoon(b) {
  let g = newGameAsColor(testNerf, "w", 5);
  enableDraftMode(g, 5, { mode: "nerf" });
  acquireBuff(g, "w", b.id, b.tier);
  const ps = g.buffs.players.w;
  const idx = ps.buffs.length - 1;
  if (b.kind === "activated") {
    const picks = [];
    for (let step = 0; step < 4; step++) {
      const t = buffNextTarget(g, "w", idx, picks);
      if (!t) break;
      if (t.kind === "square") {
        if (!t.squares.length) break;
        picks.push({ square: t.squares[0] });
      } else break;
    }
    activateBuff(g, "w", idx, picks);
  }
  // Instant relief (suspend / break) must disable the holder's nerf right away.
  if (b.kind === "instant" && nerfDisabled && !nerfDisabled(g, "w")) {
    errors.push(`boon "${b.id}" (instant) did not disable the holder's nerf`);
  }
  for (let ply = 0; ply < 4; ply++) {
    if (g.result) break;
    const moves = legalMoves(g);
    if (moves.length === 0) {
      errors.push(`boon "${b.id}" left ${g.board.turn} with 0 legal moves`);
      return;
    }
    g = playMove(g, moves[0]);
  }
}
for (const b of boons) {
  try {
    probeBoon(b);
  } catch (e) {
    errors.push(`boon "${b.id}" threw during probe: ${e && e.message ? e.message : e}`);
  }
}
console.log(`boons (nerf-relief): ${boons.length}`);

console.log(`buffs total: ${ALL_BUFFS.length}, implemented: ${IMPLEMENTED_BUFFS.length}`);
console.log(`hexes: ${hexes.length} -> by tier ${JSON.stringify(byTier)}`);
if (warns.length) {
  console.log("\nWARNINGS:");
  for (const w of warns) console.log("  - " + w);
}
if (errors.length) {
  console.log("\nERRORS:");
  for (const e of errors) console.log("  - " + e);
  console.log(`\nFAIL: ${errors.length} error(s)`);
  process.exit(1);
}
console.log("\nOK: static hex validation passed");
