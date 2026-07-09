// Zero-dependency apex/mythic harness. Run after `npm run server:build`.
//
//   npm run test:apex
//
// Exercises EVERY tier-9 apex and tier-10 mythic card end-to-end in a real
// buff-mode game (owner request: "make sure none of the tier tens breaks"):
// acquire, auto-collect its targets exactly like the bot does, activate, then
// play several more plies. Asserts per card:
//   - acquisition, targeting, activation, and follow-up hooks never throw;
//   - the ENEMY KING is never removed by the card (the engine's cardinal rail);
//   - the game never soft-locks: after activation either the game has a
//     result or the side to move still has at least one legal move;
//   - a second activation of the same instance is refused (usedActivation).
// Also drives the bank-at-top draft path across many seeds: the apex offer is
// always two distinct cards, each tier 9 or 10, with the tier-10 rate near
// the configured APEX_MYTHIC_CHANCE, and every offered card resolves to a
// real, implemented apex def that can be picked.

const path = require("path");
function load(mod) {
  return require(path.join(__dirname, "..", "dist-server", "src", "engine", mod));
}

const {
  UNRESTRICTED_NERF,
  acquireBuff,
  activateBuff,
  buffNextTarget,
  enableDraftMode,
  legalMoves,
  newGame,
  playMove,
} = load("game.js");
const { moveToUCI } = load("board.js");
const { rollOffer } = load("draft.js");
const { TIER9, TIER10, APEX_MYTHIC_CHANCE } = load(path.join("buffs", "tier9.js"));
const { BUFF_BY_ID } = load(path.join("buffs", "library.js"));

let failures = 0;
function fail(msg) {
  failures += 1;
  console.error("FAIL: " + msg);
}

function findKingSq(board, color) {
  for (let sq = 0; sq < 64; sq++) {
    const p = board.pieces[sq];
    if (p && p.type === "k" && p.color === color) return sq;
  }
  return null;
}

/** Auto-collect a full pick sequence the way the bot does: first candidate of
 * every square step, first option of every enemy-buff step. */
function collectPicks(game, color, buffIndex) {
  const picks = [];
  for (let step = 0; step < 16; step++) {
    const target = buffNextTarget(game, color, buffIndex, picks);
    if (!target) return picks;
    if (target.kind === "square") {
      if (!target.squares.length) return picks;
      picks.push({ square: target.squares[0] });
    } else {
      if (!target.options.length) return picks;
      picks.push({ buffIndex: target.options[0].index });
    }
  }
  return picks;
}

/** A mid-game position with material on both sides and captures in the pools
 * (so revive-flavored apex cards have something to raise). */
function midGame(seed) {
  const game = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  enableDraftMode(game, seed, { mode: "buff" });
  for (const uci of ["e2e4", "d7d5", "e4d5", "d8d5", "b1c3", "d5e5", "f1e2", "g8f6"]) {
    const mv = legalMoves(game).find((m) => moveToUCI(m) === uci);
    if (!mv) throw new Error("setup move rejected: " + uci);
    playMove(game, mv);
  }
  return game;
}

// --- Part 1: every apex/mythic card end-to-end -------------------------------

const APEX_ALL = [...TIER9, ...TIER10];
console.log(`apex pool: ${TIER9.length} tier-9 + ${TIER10.length} tier-10 = ${APEX_ALL.length} cards`);

for (const def of APEX_ALL) {
  const label = `${def.id} (t${def.tier})`;
  try {
    const game = midGame(1234);
    const me = game.board.turn;
    const opp = me === "w" ? "b" : "w";
    acquireBuff(game, me, def.id, def.tier);
    const idx = game.buffs.players[me].buffs.length - 1;
    const inst = game.buffs.players[me].buffs[idx];
    if (!inst || inst.id !== def.id) {
      fail(`${label}: did not seat in the hand`);
      continue;
    }
    if (def.kind === "activated") {
      const picks = collectPicks(game, me, idx);
      const ok = activateBuff(game, me, idx, picks);
      if (!ok) {
        fail(`${label}: activation refused with auto-collected picks`);
        continue;
      }
      if (activateBuff(game, me, idx, picks)) {
        fail(`${label}: second activation of the same instance was allowed`);
      }
    }
    if (findKingSq(game.board, opp) == null && !game.result) {
      fail(`${label}: enemy king vanished without the game ending`);
    }
    if (!game.result && legalMoves(game).length === 0) {
      fail(`${label}: soft-lock (no result and no legal moves after use)`);
    }
    // Ride the aftermath: several more plies so lingering hooks (Culling
    // charges, Divine Right ticks, Living God explosions) run without throwing.
    for (let ply = 0; ply < 8 && !game.result; ply++) {
      const moves = legalMoves(game);
      if (moves.length === 0) {
        fail(`${label}: soft-lock at aftermath ply ${ply}`);
        break;
      }
      const capture = moves.find((m) => m.captured && m.captured !== "k");
      playMove(game, capture ?? moves[0]);
    }
    if (!game.result && findKingSq(game.board, opp) == null) {
      fail(`${label}: enemy king vanished during the aftermath`);
    }
  } catch (err) {
    fail(`${label}: threw ${err && err.stack ? err.stack.split("\n")[0] : err}`);
  }
}

// --- Part 2: the bank-at-top offer across many seeds --------------------------

let offers = 0;
let mythicSlots = 0;
let slots = 0;
for (let seed = 1; seed <= 1500; seed++) {
  const game = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  enableDraftMode(game, seed, { mode: "buff" });
  const bs = game.buffs;
  bs.players.w.flags.bankBonus = 1;
  const offer = rollOffer(bs, "w", [8, 8], game.board);
  if (!offer) {
    fail(`seed ${seed}: bank-at-top rolled no offer`);
    continue;
  }
  offers += 1;
  if (offer.cards.length !== 2) fail(`seed ${seed}: apex offer has ${offer.cards.length} cards`);
  if (offer.cards.length === 2 && offer.cards[0].id === offer.cards[1].id) {
    fail(`seed ${seed}: apex offer dealt duplicate ${offer.cards[0].id}`);
  }
  for (const c of offer.cards) {
    slots += 1;
    if (c.tier === 10) mythicSlots += 1;
    else if (c.tier !== 9) fail(`seed ${seed}: apex slot rolled tier ${c.tier}`);
    const cardDef = BUFF_BY_ID[c.id];
    if (!cardDef || !cardDef.implemented || !cardDef.special) {
      fail(`seed ${seed}: apex offer contains non-apex card ${c.id}`);
    }
  }
}
const rate = mythicSlots / Math.max(1, slots);
if (Math.abs(rate - APEX_MYTHIC_CHANCE) > 0.03) {
  fail(`mythic rate ${(rate * 100).toFixed(1)}% strays from ${APEX_MYTHIC_CHANCE * 100}%`);
}

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log(
  `OK: apex harness passed (${APEX_ALL.length} apex/mythic cards activated + aftermath, ` +
    `${offers} bank offers, mythic slot rate ${(rate * 100).toFixed(1)}%)`,
);
