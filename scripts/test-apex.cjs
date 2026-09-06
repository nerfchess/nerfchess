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
const { rollOffer, bankOffer, rerollOffer } = load("draft.js");
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
  // The apex offer is GATED (owner rule): it is the reward for BANKING an
  // offer that contained a tier-8 card. bankOffer sets bankedTier8 from the
  // skipped offer's cards; the harness sets it directly alongside bankBonus so
  // the top-tier bank promotes into an apex pull.
  bs.players.w.flags.bankBonus = 1;
  bs.players.w.flags.bankedTier8 = true;
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

// --- Part 2b: the reward does not depend on the next round's shared roll ------
// Banking an offer that contained a tier-8 card GUARANTEES the apex pull. The
// promotion must not hinge on what rollSharedTiers deals for the next round:
// that is a fresh, independent draw (curve plus jitter) that usually lands
// below 8. A banked tier-8 must still promote to a two-card, tier 9/10 apex
// offer at EVERY shared pair, not just [8, 8].
let lowRollMiss = 0;
let lowRollOffers = 0;
for (let seed = 1; seed <= 300; seed++) {
  for (const pair of [[1, 1], [3, 4], [5, 6], [6, 7], [7, 7]]) {
    const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
    enableDraftMode(g, seed, { mode: "buff" });
    g.buffs.players.w.flags.bankBonus = 1;
    g.buffs.players.w.flags.bankedTier8 = true;
    const offer = rollOffer(g.buffs, "w", pair, g.board);
    lowRollOffers += 1;
    const isApex =
      offer &&
      offer.cards.length === 2 &&
      offer.cards.every((c) => c.tier === 9 || c.tier === 10);
    if (!isApex) lowRollMiss += 1;
  }
}
if (lowRollMiss > 0) {
  fail(
    `banked tier-8 failed to promote to apex ${lowRollMiss}/${lowRollOffers} time(s) ` +
      `at non-top shared rolls`,
  );
}

// --- Part 3: the apex gate actually gates -----------------------------------
// Banking a top-tier roll WITHOUT having skipped a tier-8 must NOT promote to
// an apex offer: it deals a normal tier-8 offer instead (bankBonus set,
// bankedTier8 unset). Conversely, bankOffer must arm the gate only when the
// skipped offer contained a tier-8. Both checked across several seeds.
let ungatedApex = 0;
let gateArmedWrong = 0;
for (let seed = 1; seed <= 200; seed++) {
  // Ungated bank at the top: no bankedTier8 -> a normal, non-apex offer.
  const g1 = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  enableDraftMode(g1, seed, { mode: "buff" });
  g1.buffs.players.w.flags.bankBonus = 1;
  const plain = rollOffer(g1.buffs, "w", [8, 8], g1.board);
  if (plain && plain.cards.some((c) => c.tier === 9 || c.tier === 10)) ungatedApex += 1;

  // bankOffer arms the gate iff the skipped offer held a tier-8.
  const withT8 = { cards: [{ id: "x", tier: 8 }], index: 1 };
  const noT8 = { cards: [{ id: "x", tier: 5 }, { id: "y", tier: 7 }], index: 1 };
  const p1 = { offer: withT8, flags: {} };
  const p2 = { offer: noT8, flags: {} };
  bankOffer(p1);
  bankOffer(p2);
  if (p1.flags.bankedTier8 !== true) gateArmedWrong += 1;
  if (p2.flags.bankedTier8 === true) gateArmedWrong += 1;
}
if (ungatedApex > 0) {
  fail(`apex gate leaked: ${ungatedApex} ungated top-tier banks still rolled apex`);
}
if (gateArmedWrong > 0) {
  fail(`bankOffer armed the apex gate incorrectly ${gateArmedWrong} time(s)`);
}

// --- Part 4: a reroll always changes the cards on the table ------------------
// Rerolling must GUARANTEE a fresh set: no card currently offered may reappear
// in the reroll (it may only re-deal a card the player is NOT looking at). The
// normal-pool path and the apex path are both checked across many seeds and
// tiers.
let rerollOverlap = 0;
let rerollsRun = 0;
for (let seed = 1; seed <= 800; seed++) {
  const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  enableDraftMode(g, seed, { mode: "buff" });
  const ps = g.buffs.players.w;
  // Normal-pool rerolls across the tier curve.
  for (const pair of [[2, 3], [5, 5], [7, 8]]) {
    const offer = rollOffer(g.buffs, "w", pair, g.board);
    if (!offer) continue;
    const before = new Set(offer.cards.map((c) => c.id));
    ps.rerollsLeft = 1;
    if (!rerollOffer(g.buffs, "w", g.board)) continue;
    rerollsRun += 1;
    for (const c of ps.offer.cards) if (before.has(c.id)) rerollOverlap += 1;
  }
  // Apex reroll: a banked tier-8 promotes to apex; its reroll must also swap.
  ps.flags.bankBonus = 1;
  ps.flags.bankedTier8 = true;
  const apex = rollOffer(g.buffs, "w", [8, 8], g.board);
  if (apex) {
    const before = new Set(apex.cards.map((c) => c.id));
    ps.rerollsLeft = 1;
    if (rerollOffer(g.buffs, "w", g.board)) {
      rerollsRun += 1;
      for (const c of ps.offer.cards) if (before.has(c.id)) rerollOverlap += 1;
    }
  }
}
if (rerollOverlap > 0) {
  fail(`reroll re-dealt an on-table card ${rerollOverlap} time(s) across ${rerollsRun} rerolls`);
}

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log(
  `OK: apex harness passed (${APEX_ALL.length} apex/mythic cards activated + aftermath, ` +
    `${offers} bank offers, mythic slot rate ${(rate * 100).toFixed(1)}%, ` +
    `${rerollsRun} rerolls all distinct)`,
);
