// PT set: THE CASINO. A batch of real-gamble cards, each modeled on a game you
// would actually find on a casino floor (slots, roulette, blackjack, scratch
// tickets, a let-it-ride coin streak, a loot box, and a high-stakes poker
// bluff). Every card is a genuine wager: a meaningful upside AND a meaningful
// downside, with the outcome decided ENTIRELY by the seeded deterministic RNG
// (api.rng), never Math.random, so both clients replay the identical result.
//
// The whole file is additive and needs no new engine surface. It reuses
// primitives that already ship:
//   - api.rng, the seeded RNG the existing gambles (gamble / jackpot) draw from.
//   - grantInventory (pocket a piece to drop on a later turn) for the payouts,
//     so no payout ever needs a target step.
//   - api.place / api.removePiece for board-facing prizes and the house's cut.
//   - api.adjustClock (addSelfSec / subOppSec) for the time payouts.
//   - short_leash (the Berserker cooldown) and self blockedDrafts as the
//     "pay the house" costs, both of which the engine already guards.
//   - grantRandomTier9 (helpers) for the loot box's legendary pull.
//
// Safety notes: no card here freezes, petrifies, removes, or targets a king. No
// move filter is used, so no card can ever empty a side's legal-move list
// (removing an enemy non-king piece is safe: the enemy king always has moves in
// this no-check ruleset). Every card is an instant that resolves atomically off
// api.rng and stores a human result line in inst.state.outcome, exactly like the
// shipped gambling cards. No card uses an em dash or en dash anywhere.

import {
  Buff,
  BuffApi,
  Color,
  PieceType,
  Square,
  card,
  instant,
  addEffect,
  mySquares,
  grantInventory,
} from "../funny/shared";
import { grantRandomTier9 } from "../helpers";

// ---------------------------------------------------------------------------
// Shared house helpers.
// ---------------------------------------------------------------------------

const PIECE_VALUE: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 99 };

/** The lowest-value non-king piece the given side owns, chosen deterministically
 * (value ascending, then square index ascending, so every replica settles the
 * house's cut on the identical piece). `types` optionally restricts the pool
 * (e.g. only pawns), falling back to the whole army when that pool is empty. */
function weakestOwn(api: BuffApi, color: Color, types?: PieceType[]): Square | null {
  const all = mySquares(api.board, color).filter((sq) => api.board.pieces[sq]!.type !== "k");
  const pool = types
    ? all.filter((sq) => types.includes(api.board.pieces[sq]!.type))
    : all;
  const use = pool.length ? pool : all;
  if (use.length === 0) return null;
  let best = use[0];
  for (const sq of use) {
    const better =
      PIECE_VALUE[api.board.pieces[sq]!.type] < PIECE_VALUE[api.board.pieces[best]!.type];
    if (better) best = sq;
  }
  return best;
}

/** The house takes its cut: remove one of my pieces (weakest by default). This
 * counts as a real loss (captured by the opponent), which is the whole point of
 * a losing bet. Returns a short label for the outcome banner. */
function payTheHouse(api: BuffApi, types?: PieceType[]): string {
  const sq = weakestOwn(api, api.me, types);
  if (sq == null) return "the house forgives the debt (nothing to pay)";
  const type = api.board.pieces[sq]!.type;
  const names: Record<PieceType, string> = {
    p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king",
  };
  api.removePiece(sq);
  return `the house takes your ${names[type]}`;
}

/** A short self cooldown: for your next `turns` turns every piece may step only
 * one square (the Berserker hangover). Used as the "sweating it out" cost. */
function cooldown(api: BuffApi, turns: number) {
  addEffect(api, { kind: "short_leash", owner: api.me, turns });
}

/** Rake an enemy non-king piece into your pot, chosen off the seeded RNG so
 * both replicas take the identical chip. The enemy king is never eligible, so
 * the opponent always keeps a legal move. Returns a short label. */
function rakeEnemyChip(api: BuffApi): string {
  const chips = mySquares(api.board, api.opp).filter((sq) => api.board.pieces[sq]!.type !== "k");
  if (chips.length === 0) return "the pot is empty";
  const sq = chips[api.rng.int(chips.length)];
  const type = api.board.pieces[sq]!.type;
  const names: Record<PieceType, string> = {
    p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king",
  };
  api.removePiece(sq);
  return `you rake their ${names[type]} into the pot`;
}

export const PT_CASINO_CARDS: Buff[] = [
  // #C1 Slot Machine -------------------------------------------------------
  // Three reels of four symbols each. Three-of-a-kind (1 in 16) hits the
  // jackpot; any pair (about 9 in 16) pays a small prize; three different
  // symbols (about 6 in 16) means you feed the machine one of your pieces.
  card(
    {
      id: "cs_slot_machine",
      icon: "Cherry",
      name: "Slot Machine",
      description:
        "Pull the arm and watch three reels spin. Match all three symbols for the jackpot: a rook and a knight drop into your pocket to place later, plus 45 seconds. Match two for a knight in your pocket. Match none and the machine eats your weakest piece.",
      tier: 3,
      category: "pieces",
      flavor: "One more pull, it is due to hit.",
    },
    instant((inst, api) => {
      const a = api.rng.int(4);
      const b = api.rng.int(4);
      const c = api.rng.int(4);
      if (a === b && b === c) {
        grantInventory(api, "r", 1);
        grantInventory(api, "n", 1);
        api.adjustClock({ addSelfSec: 45 });
        inst.state.outcome = "JACKPOT: a rook and a knight to your pocket, plus 45 seconds";
      } else if (a === b || b === c || a === c) {
        grantInventory(api, "n", 1);
        inst.state.outcome = "Two of a kind: a knight drops into your pocket";
      } else {
        const took = payTheHouse(api);
        inst.state.outcome = `No match: ${took}`;
      }
    }),
  ),

  // #C2 Roulette Wheel -----------------------------------------------------
  // The house lets you bet its lucky red. The ball settles on 0 to 36. Red
  // (18 of 37) pays out; black (18 of 37) costs you a piece; the green zero
  // (1 of 37) is the house edge, and it stings.
  card(
    {
      id: "cs_roulette",
      icon: "Target",
      name: "Roulette Wheel",
      description:
        "You put it all on red and the croupier spins. Land red for a knight in your pocket and 30 seconds. Land black and you lose your weakest piece. Land the green zero and the house cleans you out: lose your weakest piece and your next draft is skipped.",
      tier: 3,
      category: "pieces",
      flavor: "Red comes up. It has to, eventually.",
    },
    instant((inst, api) => {
      const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
      const n = api.rng.int(37);
      if (n === 0) {
        const took = payTheHouse(api);
        api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 1;
        inst.state.outcome = `Green zero: ${took}, and your next draft is skipped`;
      } else if (REDS.has(n)) {
        grantInventory(api, "n", 1);
        api.adjustClock({ addSelfSec: 30 });
        inst.state.outcome = `Red ${n}: a knight to your pocket, plus 30 seconds`;
      } else {
        const took = payTheHouse(api);
        inst.state.outcome = `Black ${n}: ${took}`;
      }
    }),
  ),

  // #C3 Blackjack ----------------------------------------------------------
  // Press your luck against the bust threshold. The shoe deals cards worth 2
  // to 11 until your hand reaches 17 or more, then you stand. Land on 21 for a
  // rook; stand on 17 to 20 for a minor piece; go over 21 and you bust.
  card(
    {
      id: "cs_blackjack",
      icon: "Spade",
      name: "Blackjack",
      description:
        "The dealer feeds you cards until your hand reaches seventeen, then you stand. Hit twenty one for a rook in your pocket and 45 seconds. Stand on seventeen to twenty for a minor piece in your pocket. Bust over twenty one and the house takes your weakest piece while you cool off for two turns.",
      tier: 4,
      category: "pieces",
      flavor: "Hit me. No, once more.",
    },
    instant((inst, api) => {
      let total = 0;
      while (total < 17) total += 2 + api.rng.int(10); // card values 2 to 11
      if (total > 21) {
        const took = payTheHouse(api);
        cooldown(api, 2);
        inst.state.outcome = `Bust on ${total}: ${took}, and two turns to cool off`;
      } else if (total === 21) {
        grantInventory(api, "r", 1);
        api.adjustClock({ addSelfSec: 45 });
        inst.state.outcome = "Twenty one: a rook to your pocket, plus 45 seconds";
      } else if (total >= 19) {
        grantInventory(api, "b", 1);
        api.adjustClock({ addSelfSec: 20 });
        inst.state.outcome = `Stand on ${total}: a bishop to your pocket, plus 20 seconds`;
      } else {
        grantInventory(api, "n", 1);
        inst.state.outcome = `Stand on ${total}: a knight to your pocket`;
      }
    }),
  ),

  // #C4 Scratch Card -------------------------------------------------------
  // Low-stakes tier 3. Scratch three panels of three symbols. All three match
  // (about 1 in 9) for a knight; any pair (about 6 in 9) for a little clock;
  // three blanks (about 2 in 9) and the ticket is a dud that costs a pawn.
  card(
    {
      id: "cs_scratch_card",
      icon: "Ticket",
      name: "Scratch Card",
      description:
        "Scratch off three panels with the edge of a coin. Match all three for a knight in your pocket. Match two for 30 seconds. Three blanks and the dud ticket costs you your weakest pawn.",
      tier: 3,
      category: "pieces",
      flavor: "This is the lucky one, I can feel it.",
    },
    instant((inst, api) => {
      const a = api.rng.int(3);
      const b = api.rng.int(3);
      const c = api.rng.int(3);
      if (a === b && b === c) {
        grantInventory(api, "n", 1);
        inst.state.outcome = "Three matching symbols: a knight to your pocket";
      } else if (a === b || b === c || a === c) {
        api.adjustClock({ addSelfSec: 30 });
        inst.state.outcome = "Two matching symbols: 30 seconds";
      } else {
        const took = payTheHouse(api, ["p"]);
        inst.state.outcome = `Dud ticket: ${took}`;
      }
    }),
  ),

  // #C5 Let It Ride --------------------------------------------------------
  // A coin-flip streak doubler. You flip and let it ride: each heads bumps the
  // prize and you flip again, up to three heads. The first tails cashes you out
  // at whatever you have banked, but a tails on the very first flip loses the
  // ante (your weakest pawn).
  card(
    {
      id: "cs_let_it_ride",
      icon: "CircleDollarSign",
      name: "Let It Ride",
      description:
        "Flip a coin and let your winnings ride. Each heads bumps the prize and flips again, up to three. One heads pays 40 seconds. Two heads pays a knight in your pocket. Three heads pays a knight and a bishop plus 20 seconds. Tails on the first flip loses the ante, your weakest pawn.",
      tier: 2,
      category: "pieces",
      flavor: "Let it ride, let it ride.",
    },
    instant((inst, api) => {
      let streak = 0;
      while (streak < 3 && api.rng.int(2) === 0) streak += 1; // leading heads, capped at 3
      if (streak === 0) {
        const took = payTheHouse(api, ["p"]);
        inst.state.outcome = `Tails on the first flip: ${took}`;
      } else if (streak === 1) {
        api.adjustClock({ addSelfSec: 40 });
        inst.state.outcome = "One heads then tails: 40 seconds banked";
      } else if (streak === 2) {
        grantInventory(api, "n", 1);
        inst.state.outcome = "Two heads then tails: a knight to your pocket";
      } else {
        grantInventory(api, "n", 1);
        grantInventory(api, "b", 1);
        api.adjustClock({ addSelfSec: 20 });
        inst.state.outcome = "Three heads: a knight and a bishop to your pocket, plus 20 seconds";
      }
    }),
  ),

  // #C6 Loot Box -----------------------------------------------------------
  // A weighted crate. Most of the time it pays a piece, but almost one time in
  // three it is a mimic that bites (the house edge), and about one time in
  // thirty-three it drops a legendary: a random apex card, one of the game's
  // most powerful. That apex tail is what puts this at tier 7.
  card(
    {
      id: "cs_loot_box",
      icon: "Package",
      name: "Loot Box",
      description:
        "Pay to crack the crate and pray to the drop table. Legendary (rare) grants a random apex card. Epic grants a bishop and 30 seconds. Rare grants a knight. Common grants a pawn. But almost one crate in three is a mimic that bites off your weakest piece and leaves you shaken for two turns.",
      tier: 5,
      category: "pieces",
      flavor: "The next one is guaranteed legendary. Probably.",
    },
    instant((inst, api) => {
      const roll = api.rng.next();
      if (roll < 0.3) {
        const took = payTheHouse(api);
        cooldown(api, 2);
        inst.state.outcome = `Mimic: ${took}, and two shaken turns`;
      } else if (roll < 0.6) {
        grantInventory(api, "p", 1);
        inst.state.outcome = "Common drop: a pawn to your pocket";
      } else if (roll < 0.85) {
        grantInventory(api, "n", 1);
        inst.state.outcome = "Rare drop: a knight to your pocket";
      } else if (roll < 0.97) {
        grantInventory(api, "b", 1);
        api.adjustClock({ addSelfSec: 30 });
        inst.state.outcome = "Epic drop: a bishop to your pocket, plus 30 seconds";
      } else {
        grantRandomTier9(api);
        inst.state.outcome = "LEGENDARY: a random apex card is yours!";
      }
    }),
  ),

  // #C7 Poker Bluff --------------------------------------------------------
  // You shove all in on a stone cold bluff. The house edge means the bluff is
  // called more often than it works: about 45 in 100 the opponent folds and you
  // rake a piece out of the pot; the other 55 they call and catch you, and you
  // pay your weakest piece plus a two turn walk of shame.
  card(
    {
      id: "cs_poker_bluff",
      icon: "Diamond",
      name: "Poker Bluff",
      description:
        "You shove all in holding nothing and stare them down. Roughly forty five times in a hundred they fold and you rake one of their pieces into the pot along with 20 seconds. The rest of the time they call your bluff, and you pay your weakest piece and take a two turn walk of shame.",
      tier: 4,
      category: "pieces",
      flavor: "I had it the whole time. Obviously.",
    },
    instant((inst, api) => {
      if (api.rng.int(100) < 45) {
        const raked = rakeEnemyChip(api);
        api.adjustClock({ addSelfSec: 20 });
        inst.state.outcome = `They fold: ${raked}, plus 20 seconds`;
      } else {
        const took = payTheHouse(api);
        cooldown(api, 2);
        inst.state.outcome = `They call your bluff: ${took}, and a two turn walk of shame`;
      }
    }),
  ),
];
