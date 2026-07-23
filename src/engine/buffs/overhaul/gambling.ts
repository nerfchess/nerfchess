// Overhaul gambling set (cards 201-224 of docs/overhaul-roster.md, redesign
// v2): 3 per tier, tiers 1-8. House rules, non-negotiable:
//   - every roll draws from api.rng (the seeded, replay-safe effect RNG),
//     only inside effect/onMovePlayed;
//   - the odds printed on the card ARE the constants in the code below;
//   - payouts are board-based (pieces, moves, drafts), time only as garnish;
//   - the rolled outcome lands in inst.state so the table-side animation can
//     enact what actually happened (the lootbox opens what it opened).

import type { BuffInstance, BuffPick } from "../../buff";
import {
  Buff,
  BuffApi,
  FILE,
  KNIGHT_LEAPS,
  Move,
  PieceType,
  RANK,
  SQ,
  Square,
  activated,
  activatedSimple,
  addEffect,
  addNovel,
  advancePawn,
  advanceablePawns,
  attacksSquare,
  buffRegistry,
  card,
  emptySquares,
  emptyHomeRank,
  flashSquares,
  fwdOf,
  inHalf,
  kingSquare,
  lastMoveBy,
  leapMoves,
  markRevived,
  mySquares,
  pinCosmetic,
  revivable,
  stunEnemy,
  teleportMoves,
  tickTurns,
  turnsLeft,
} from "./shared";

function pickRng<T>(api: BuffApi, arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[api.rng.int(arr.length)];
}

/** Spawn a piece for `color` on a random legal empty square of a zone. */
function spawnRandom(api: BuffApi, type: PieceType, zone: Square[]): Square | null {
  const legal = zone.filter((sq) => type !== "p" || (RANK(sq) !== 0 && RANK(sq) !== 7));
  const sq = pickRng(api, legal);
  if (sq == null) return null;
  api.place(sq, type, api.me);
  flashSquares(api, [sq]);
  return sq;
}

/** A random pawn of mine sidesteps to a random empty neighbor square. */
function randomPawnSidestep(api: BuffApi): boolean {
  const pawns = mySquares(api.board, api.me, "p").filter((sq) => {
    const l = FILE(sq) > 0 && !api.board.pieces[sq - 1];
    const r = FILE(sq) < 7 && !api.board.pieces[sq + 1];
    return l || r;
  });
  const sq = pickRng(api, pawns);
  if (sq == null) return false;
  const opts: Square[] = [];
  if (FILE(sq) > 0 && !api.board.pieces[sq - 1]) opts.push(sq - 1);
  if (FILE(sq) < 7 && !api.board.pieces[sq + 1]) opts.push(sq + 1);
  const to = pickRng(api, opts);
  if (to == null) return false;
  api.relocate(sq, to);
  flashSquares(api, [to], true);
  return true;
}

/** Grant a random implemented buff-mode card of `tier` into my hand. */
function grantRandomOfTier(api: BuffApi, tier: number) {
  const pool = Object.values(buffRegistry.byId).filter(
    (b) =>
      b.implemented &&
      b.tier === tier &&
      !b.special &&
      b.category !== "hex" &&
      b.category !== "nerf",
  );
  const def = pickRng(api, pool);
  if (!def) return;
  const inst: BuffInstance = { id: def.id, tier: def.tier, state: {} };
  def.init?.(inst, api);
  api.mine.buffs.push(inst);
}

export const OVERHAUL_GAMBLING: Buff[] = [
  // 201. Penny Slots (T1) ------------------------------------------------------
  card(
    {
      id: "gm_penny_slots",
      name: "Penny Slots",
      description:
        "Pull the lever: half the time nothing, 35% one random pawn of yours sidesteps, 15% jackpot: a fresh pawn appears on your second rank.",
      tier: 1,
      category: "item",
      icon: "Cherry",
      flavor: "The lever is sticky. Do not ask why.",
    },
    activatedSimple((inst, api) => {
      const r = api.rng.next();
      if (r < 0.5) {
        inst.state.result = "blank";
        const k = kingSquare(api.board, api.me);
        if (k != null) flashSquares(api, [k], true);
      } else if (r < 0.85) {
        inst.state.result = "sidestep";
        randomPawnSidestep(api);
      } else {
        inst.state.result = "jackpot";
        spawnRandom(api, "p", emptyHomeRank(api, 1));
      }
    }),
  ),
  // 202. Heads or Tails (T1) -----------------------------------------------------
  card(
    {
      id: "gm_heads_or_tails",
      name: "Heads or Tails",
      description:
        "Call the coin or take the sure thing. Gamble: flip two coins at 50% each, heads on either wins an extra move right now (75% overall), both tails and nothing. Or skip the flip to reveal the tier of your opponent's next draft offer and gain one reroll.",
      tier: 1,
      category: "tempo",
      icon: "CircleDollarSign",
      flavor: "Best out of one.",
    },
    activated(
      (inst, api, picks) => {
        if (inst.state.result != null || picks.length > 0) return null;
        const k = kingSquare(api.board, api.me);
        return {
          kind: "square",
          label:
            "Flip two coins and press Done, or click your king to skip the flip: reveal your opponent's next draft tier and gain a reroll",
          squares: k != null ? [k] : [],
          finishable: true,
        };
      },
      (inst, api, picks) => {
        if (inst.state.result != null) return;
        if (picks.length > 0) {
          inst.state.result = "intel";
          api.mine.flags.seeOppTier = true;
          api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
          return;
        }
        // Two independent flips; keep the better (heads = the jackpot extra move).
        const a = api.rng.next() < 0.5;
        const b = api.rng.next() < 0.5;
        const heads = a || b;
        inst.state.result = heads ? "heads" : "tails";
        if (heads) {
          api.bs.extraMoves[api.me] += 1;
        } else {
          const k = kingSquare(api.board, api.me);
          if (k != null) flashSquares(api, [k], true);
        }
      },
      { freeAction: true },
    ),
  ),
  // 203. Claw Machine (T1) -----------------------------------------------------------
  card(
    {
      id: "gm_claw_machine",
      name: "Claw Machine",
      description:
        "One grab: 45% a plush mascot rides your king for 5 of your turns, 35% you peek at your opponent's next draft offer, 20% the claw drops a pawn onto your second rank.",
      tier: 1,
      category: "item",
      icon: "Grab",
      flavor: "The claw is not rigged. The claw is destiny.",
    },
    activatedSimple((inst, api) => {
      const r = api.rng.next();
      if (r < 0.45) {
        inst.state.result = "plush";
        const k = kingSquare(api.board, api.me);
        if (k != null) pinCosmetic(api, k, api.me, "plush", 5, "Plush mascot");
      } else if (r < 0.8) {
        inst.state.result = "peek";
        api.mine.flags.seeOppCards = true;
      } else {
        inst.state.result = "pawn";
        spawnRandom(api, "p", emptyHomeRank(api, 1));
      }
    }),
  ),
  // 204. Raffle Ticket (T2) --------------------------------------------------------------
  card(
    {
      id: "gm_raffle_ticket",
      name: "Raffle Ticket",
      description:
        "For your next 3 turns the drum spins after your move: 1 chance in 3 each time that a random pawn of yours marches a free square forward.",
      tier: 1,
      category: "tempo",
      icon: "Ticket",
      flavor: "Winners are drawn hourly. Pawns are drawn onward.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.me) return;
        if (api.rng.next() < 1 / 3) {
          const pawn = pickRng(api, advanceablePawns(api));
          if (pawn != null) {
            advancePawn(api, pawn);
            flashSquares(api, [pawn + fwdOf(api.me)], true);
          }
        }
        tickTurns(inst, move, api.me);
      },
      status: (inst) => `${turnsLeft(inst)} draws left`,
    },
  ),
  // 205. Card Counting (T2) ----------------------------------------------------------------
  card(
    {
      id: "gm_card_counting",
      name: "Card Counting",
      description:
        "Three draws, 55% each, streak ends on a miss: one hit and a random pawn sidesteps; two hits and a random pawn also advances; three hits and a fresh pawn joins your second rank.",
      tier: 2,
      category: "item",
      icon: "Spade",
      flavor: "The shoe knows you are counting. The shoe respects it.",
    },
    activatedSimple((inst, api) => {
      let hits = 0;
      for (let i = 0; i < 3; i++) {
        if (api.rng.next() < 0.55) hits++;
        else break;
      }
      inst.state.result = hits;
      if (hits >= 1) randomPawnSidestep(api);
      if (hits >= 2) {
        const pawn = pickRng(api, advanceablePawns(api));
        if (pawn != null) advancePawn(api, pawn);
      }
      if (hits >= 3) spawnRandom(api, "p", emptyHomeRank(api, 1));
    }),
  ),
  // 206. Loaded Dice (T2) ------------------------------------------------------------------------
  card(
    {
      id: "gm_loaded_dice",
      name: "Loaded Dice",
      description:
        "Pick a pawn and roll two dice. Seven or more: it advances a square. Boxcars (twelve): it advances two. Under seven: the loaded dice grant one free re-roll before giving up.",
      tier: 1,
      category: "movement",
      icon: "Dices",
      flavor: "They only cheat a little. For you.",
      requires: ["p"],
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the pawn rolling the bones",
              squares: advanceablePawns(api),
            },
      (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const roll2d6 = () => 2 + api.rng.int(6) + api.rng.int(6);
        let total = roll2d6();
        let rerolled = false;
        if (total < 7) {
          total = roll2d6();
          rerolled = true;
        }
        inst.state.result = total;
        inst.state.rerolled = rerolled;
        if (total >= 7) {
          advancePawn(api, sq);
          if (total === 12) advancePawn(api, sq + fwdOf(api.me));
        } else {
          flashSquares(api, [sq], true);
        }
      },
      { freeAction: true },
    ),
  ),
  // 207. Lootbox (T3) ---------------------------------------------------------------------------------
  card(
    {
      id: "gm_lootbox",
      name: "Lootbox",
      description:
        "Crack it open: 55% common, a knight of yours may camel-leap on its next move; 25% rare, a pawn spawns on your second rank; 15% epic, your next draft offers three cards; 5% legendary, a random tier 5 card lands in your hand.",
      tier: 3,
      category: "item",
      icon: "Package",
      flavor: "The lid creaks in the exact pitch of hope.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      init: (inst) => {
        inst.state.rarity = null;
      },
      targets: (inst) => (inst.state.rarity != null ? null : null),
      effect: (inst, api) => {
        if (inst.state.rarity != null) return;
        const r = api.rng.next();
        if (r < 0.55) {
          inst.state.rarity = "common";
          inst.state.charges = 1;
        } else if (r < 0.8) {
          inst.state.rarity = "rare";
          spawnRandom(api, "p", emptyHomeRank(api, 1));
          inst.spent = true;
        } else if (r < 0.95) {
          inst.state.rarity = "epic";
          api.mine.flags.prepThree = true;
          inst.spent = true;
        } else {
          inst.state.rarity = "legendary";
          grantRandomOfTier(api, 5);
          inst.spent = true;
        }
      },
      // Common prize: one camel-leap charge across your knights.
      augmentMoves: (moves, inst, api) => {
        if (inst.state.rarity !== "common") return;
        if (((inst.state.charges as number) ?? 0) <= 0) return;
        const CAMEL = [
          [1, 3], [3, 1], [-1, 3], [-3, 1], [1, -3], [3, -1], [-1, -3], [-3, -1],
        ] as const;
        const out: Move[] = [];
        for (const sq of mySquares(api.board, api.me, "n")) {
          out.push(...leapMoves(api.board, sq, CAMEL, inst.id));
        }
        addNovel(moves, out);
      },
      onMovePlayed: (inst, move) => {
        if (inst.state.rarity === "common" && move.via === inst.id) {
          inst.state.charges = 0;
          inst.spent = true;
        }
      },
      status: (inst) =>
        inst.state.rarity == null
          ? "unopened"
          : inst.state.rarity === "common"
            ? "common: a knight may camel-leap"
            : `${inst.state.rarity} opened`,
    },
  ),
  // 208. Three-Card Monte (T3) ---------------------------------------------------------------------------
  card(
    {
      id: "gm_three_card_monte",
      name: "Three-Card Monte",
      description:
        "Follow the queen, one chance in three: find her and you win a free reroll plus a look at your opponent's next draft offer. Miss and the dealer tips his hat.",
      tier: 2,
      category: "draft",
      icon: "Layers",
      flavor: "The hand is quicker than the eye. The odds are printed anyway.",
    },
    activatedSimple((inst, api) => {
      const won = api.rng.int(3) === 0;
      inst.state.result = won ? "found" : "lost";
      if (won) {
        api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
        api.mine.flags.seeOppCards = true;
      }
    }),
  ),
  // 209. Underdog Parlay (T3) --------------------------------------------------------------------------------
  card(
    {
      id: "gm_underdog_parlay",
      name: "Underdog Parlay",
      description:
        "Two legs: put the enemy king under attack within 5 of your turns AND capture within 3. Both hit: a knight joins your back rank. One: a pawn joins your second rank. Neither: the parlay busts and nothing happens.",
      tier: 3,
      category: "attack",
      icon: "TrendingUp",
      flavor: "Nobody believes in you. That is the whole payout structure.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 5;
        inst.state.capWindow = 3;
        inst.state.check = false;
        inst.state.cap = false;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color === api.me) {
          const k = kingSquare(api.board, api.opp);
          if (
            k != null &&
            mySquares(api.board, api.me).some((sq) => attacksSquare(api.board, sq, k))
          ) {
            inst.state.check = true;
          }
          if (move.captured && ((inst.state.capWindow as number) ?? 0) > 0) inst.state.cap = true;
          inst.state.capWindow = ((inst.state.capWindow as number) ?? 0) - 1;
          const t = ((inst.state.turns as number) ?? 0) - 1;
          inst.state.turns = t;
          const done = t <= 0 || (inst.state.check === true && inst.state.cap === true);
          if (done) {
            const hits = (inst.state.check ? 1 : 0) + (inst.state.cap ? 1 : 0);
            if (hits === 2) spawnRandom(api, "n", emptyHomeRank(api, 0));
            else if (hits === 1) spawnRandom(api, "p", emptyHomeRank(api, 1));
            else {
              // The reroll this leg used to hand the opponent has been removed:
              // a total miss now simply busts with no payout to either side.
              const k = kingSquare(api.board, api.me);
              if (k != null) flashSquares(api, [k], true);
            }
            inst.state.result = hits;
            inst.spent = true;
          }
        }
      },
      status: (inst) =>
        `legs: attack ${inst.state.check ? "HIT" : "open"}, capture ${
          inst.state.cap ? "HIT" : ((inst.state.capWindow as number) ?? 0) > 0 ? "open" : "MISS"
        }, ${turnsLeft(inst)} turns`,
    },
  ),
  // 210. River Card (T4) -----------------------------------------------------------------------------------------
  card(
    {
      id: "gm_river_card",
      name: "River Card",
      description:
        "You and your opponent are each dealt a hidden card, ace low king high. Higher card wins: the winner steals a random enemy pawn, which walks across and defects. A tie splits the pot and nothing happens.",
      tier: 3,
      category: "attack",
      icon: "Diamond",
      flavor: "The river forgives nothing.",
    },
    activatedSimple((inst, api) => {
      const mineCard = 1 + api.rng.int(13);
      const theirsCard = 1 + api.rng.int(13);
      inst.state.mine = mineCard;
      inst.state.theirs = theirsCard;
      if (mineCard === theirsCard) return;
      const winner = mineCard > theirsCard ? api.me : api.opp;
      const loser = winner === api.me ? api.opp : api.me;
      const pawns = mySquares(api.board, loser, "p");
      const sq = pickRng(api, pawns);
      if (sq == null) return;
      const zone = emptySquares(api.board, (s) => inHalf(winner, s)).filter(
        (s) => RANK(s) !== 0 && RANK(s) !== 7,
      );
      const to = pickRng(api, zone);
      if (to == null) return;
      api.removePiece(sq, { uncounted: true });
      api.place(to, "p", winner);
      flashSquares(api, [to], winner !== api.me);
    }),
  ),
  // 211. Piece Roulette (T4) ----------------------------------------------------------------------------------------
  card(
    {
      id: "gm_piece_roulette",
      name: "Piece Roulette",
      description:
        "Bet one of your pawns on the wheel: 45% it comes back a knight, 10% it hits the green zero and comes back a rook, 25% nothing, 20% the house takes it.",
      tier: 3,
      category: "pieces",
      icon: "LifeBuoy",
      flavor: "Round and round the little pawn goes.",
      requires: ["p"],
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the pawn on the wheel",
              squares: mySquares(api.board, api.me, "p"),
            },
      (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const r = api.rng.next();
        if (r < 0.45) {
          inst.state.result = "knight";
          api.setPieceType(sq, "n");
        } else if (r < 0.55) {
          inst.state.result = "rook";
          api.setPieceType(sq, "r");
        } else if (r < 0.8) {
          inst.state.result = "nothing";
          flashSquares(api, [sq], true);
        } else {
          inst.state.result = "lost";
          api.removePiece(sq);
        }
      },
    ),
  ),
  // 212. Jackpot Pawn (T4) --------------------------------------------------------------------------------------------
  card(
    {
      id: "gm_jackpot_pawn",
      name: "Jackpot Pawn",
      description:
        "Fit one pawn with slot reels for 5 of your turns: every time it advances, the reels spin: 20% it banks a king-step charge it can spend later, 3% JACKPOT, it promotes to queen on the spot.",
      tier: 3,
      category: "pieces",
      icon: "Coins",
      flavor: "Ka-chunk. Ka-chunk. Believe.",
      requires: ["p"],
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the lucky pawn",
              squares: mySquares(api.board, api.me, "p"),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        inst.state.sq = sq;
        inst.state.turns = 5;
        inst.state.charges = 0;
        pinCosmetic(api, sq, api.me, "slotreels", 5, "Jackpot Pawn");
      },
      augmentMoves: (moves, inst, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || ((inst.state.charges as number) ?? 0) <= 0) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || p.type !== "p") return;
        const out: Square[] = [];
        for (let df = -1; df <= 1; df++) {
          for (let dr = -1; dr <= 1; dr++) {
            if (!df && !dr) continue;
            const f = FILE(sq) + df, r = RANK(sq) + dr;
            if (f < 0 || f > 7 || r < 1 || r > 6) continue;
            if (!api.board.pieces[SQ(f, r)]) out.push(SQ(f, r));
          }
        }
        addNovel(moves, teleportMoves(api.board, sq, out, inst.id));
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        if (move.via === inst.id) {
          inst.state.charges = Math.max(0, ((inst.state.charges as number) ?? 1) - 1);
        }
        if (move.capturedSquare === sq && move.from !== sq) {
          inst.spent = true;
          return;
        }
        if (move.from === sq && move.color === api.me) {
          inst.state.sq = move.to;
          if (move.piece === "p") {
            const r = api.rng.next();
            if (r < 0.03) {
              api.setPieceType(move.to, "q");
              flashSquares(api, [move.to]);
              inst.spent = true;
              return;
            } else if (r < 0.23) {
              inst.state.charges = ((inst.state.charges as number) ?? 0) + 1;
              flashSquares(api, [move.to], true);
            }
          }
        }
        if (move.color === api.me) {
          const t = ((inst.state.turns as number) ?? 0) - 1;
          inst.state.turns = t;
          if (t <= 0 && ((inst.state.charges as number) ?? 0) <= 0) inst.spent = true;
        }
      },
      status: (inst) =>
        inst.state.sq == null
          ? "activate to fit the reels"
          : `${(inst.state.charges as number) ?? 0} banked steps, ${turnsLeft(inst)} spins left`,
    },
  ),
  // 213. Double Down Draft (T5) ----------------------------------------------------------------------------------------
  card(
    {
      id: "gm_double_down_draft",
      name: "Double Down Draft",
      description:
        "Push your chips in, half and half: 50% you take BOTH cards of your next draft, 50% your next draft is skipped entirely while the dealer smiles.",
      tier: 6,
      category: "draft",
      icon: "Copy",
      flavor: "The dealer knocks twice. So does your heart.",
    },
    activatedSimple((inst, api) => {
      const win = api.rng.next() < 0.5;
      inst.state.result = win ? "both" : "bust";
      if (win) api.mine.flags.takeBoth = (api.mine.flags.takeBoth ?? 0) + 1;
      else api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 1;
    }),
  ),
  // 214. Crash Game (T5) -------------------------------------------------------------------------------------------------
  card(
    {
      id: "gm_crash_game",
      name: "Crash Game",
      description:
        "Strap a pawn to the rocket and let it ride: 30% it lands with a free sidestep, 25% it comes back a knight, 20% a knight plus a draft reroll, 10% it comes back a ROOK, 15% the rocket crashes and the pawn burns up.",
      tier: 4,
      category: "pieces",
      icon: "Rocket",
      flavor: "It is not the fall that gets you. It is the multiplier.",
      requires: ["p"],
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the pawn boarding the rocket",
              squares: mySquares(api.board, api.me, "p"),
            },
      (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const r = api.rng.next();
        if (r < 0.3) {
          inst.state.result = "1.5x";
          const opts: Square[] = [];
          if (FILE(sq) > 0 && !api.board.pieces[sq - 1]) opts.push(sq - 1);
          if (FILE(sq) < 7 && !api.board.pieces[sq + 1]) opts.push(sq + 1);
          const to = pickRng(api, opts);
          if (to != null) api.relocate(sq, to);
        } else if (r < 0.55) {
          inst.state.result = "2x";
          api.setPieceType(sq, "n");
        } else if (r < 0.75) {
          inst.state.result = "3x";
          api.setPieceType(sq, "n");
          api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
        } else if (r < 0.85) {
          inst.state.result = "5x";
          api.setPieceType(sq, "r");
        } else {
          inst.state.result = "crash";
          api.removePiece(sq);
        }
        flashSquares(api, [sq], inst.state.result === "crash");
      },
    ),
  ),
  // 215. Blood Wager (T5) --------------------------------------------------------------------------------------------------
  card(
    {
      id: "gm_blood_wager",
      name: "Blood Wager",
      description:
        "Lay one of your knights or bishops on the dais: 55% it rises as a rook, 35% it is taken, 10% the blood god is DELIGHTED: a rook, plus a pawn steps out of the mist beside it.",
      tier: 5,
      category: "pieces",
      icon: "Droplets",
      flavor: "The house always wins. The house is an altar.",
      requires: ["n", "b"],
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the piece on the dais",
              squares: [
                ...mySquares(api.board, api.me, "n"),
                ...mySquares(api.board, api.me, "b"),
              ],
            },
      (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const r = api.rng.next();
        if (r < 0.55) {
          inst.state.result = "rook";
          api.setPieceType(sq, "r");
        } else if (r < 0.9) {
          inst.state.result = "taken";
          api.removePiece(sq);
        } else {
          inst.state.result = "delighted";
          api.setPieceType(sq, "r");
          const adj: Square[] = [];
          for (let df = -1; df <= 1; df++) {
            for (let dr = -1; dr <= 1; dr++) {
              if (!df && !dr) continue;
              const f = FILE(sq) + df, rr = RANK(sq) + dr;
              if (f < 0 || f > 7 || rr < 1 || rr > 6) continue;
              if (!api.board.pieces[SQ(f, rr)]) adj.push(SQ(f, rr));
            }
          }
          const to = pickRng(api, adj);
          if (to != null) api.place(to, "p", api.me);
        }
        flashSquares(api, [sq], inst.state.result === "taken");
      },
    ),
  ),
  // 216. Progressive Jackpot (T6) ----------------------------------------------------------------------------------------------
  card(
    {
      id: "gm_progressive_jackpot",
      name: "Progressive Jackpot",
      description:
        "For 6 of your turns every capture by either side drops a soul in the pot. When time is called, whoever made the LAST capture summons the pot: 2 souls a pawn, 4 a knight, 6 or more a rook, placed in their half. No captures, no winner.",
      tier: 6,
      category: "pieces",
      icon: "Trophy",
      flavor: "The pot does not care whose blood filled it.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 6;
        inst.state.pot = 0;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.captured) {
          inst.state.pot = ((inst.state.pot as number) ?? 0) + 1;
          inst.state.last = move.color;
        }
        if (move.color !== api.me) return;
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t > 0) return;
        const pot = (inst.state.pot as number) ?? 0;
        const winner = inst.state.last as typeof api.me | undefined;
        if (winner != null && pot >= 2) {
          const type: PieceType = pot >= 6 ? "r" : pot >= 4 ? "n" : "p";
          const zone = emptySquares(api.board, (s) => inHalf(winner, s)).filter(
            (s) => type !== "p" || (RANK(s) !== 0 && RANK(s) !== 7),
          );
          const sq = pickRng(api, zone);
          if (sq != null) {
            api.place(sq, type, winner);
            flashSquares(api, [sq], winner !== api.me);
          }
        }
        inst.spent = true;
      },
      status: (inst) =>
        `${(inst.state.pot as number) ?? 0} souls in the pot, ${turnsLeft(inst)} of your turns left`,
    },
  ),
  // 217. The House (T6) ------------------------------------------------------------------------------------------------------------
  card(
    {
      id: "gm_the_house",
      name: "The House",
      description:
        "For 6 of your turns you ARE the house: every draft either player resolves pays you a chip. Cash out automatically: 2 chips buy a reroll, 4 chips a fresh pawn on your second rank.",
      tier: 6,
      category: "draft",
      icon: "Building2",
      flavor: "You do not beat the house. You become it.",
    },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 6;
        inst.state.chips = 0;
        inst.state.seen =
          (api.mine.draftsTaken ?? 0) + (api.theirs.draftsTaken ?? 0);
      },
      onMovePlayed: (inst, move, api) => {
        const now = (api.mine.draftsTaken ?? 0) + (api.theirs.draftsTaken ?? 0);
        const seen = (inst.state.seen as number) ?? now;
        if (now > seen) {
          inst.state.chips = ((inst.state.chips as number) ?? 0) + (now - seen);
          inst.state.seen = now;
          let chips = (inst.state.chips as number) ?? 0;
          if (chips >= 4) {
            spawnRandom(api, "p", emptyHomeRank(api, 1));
            chips -= 4;
          } else if (chips >= 2) {
            api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
            chips -= 2;
          }
          inst.state.chips = chips;
        }
        if (move.color === api.me) tickTurns(inst, move, api.me);
      },
      status: (inst) =>
        `${(inst.state.chips as number) ?? 0} chips, ${turnsLeft(inst)} of your turns of rake left`,
    },
  ),
  // 218. Gacha Banner (T6) ---------------------------------------------------------------------------------------------------------------
  card(
    {
      id: "gm_gacha_banner",
      name: "Gacha Banner",
      description:
        "Three pulls, resolved on the spot: 55% common, a random pawn sidesteps; 30% rare, a pawn spawns on your second rank; 12% epic, a random tier 4 card joins your hand; 3% SSR, a random tier 7 card. Pity rule: three commons upgrade the third to epic.",
      tier: 6,
      category: "item",
      icon: "Star",
      flavor: "Guaranteed drop rates, printed right on the banner. Revolutionary.",
    },
    activatedSimple((inst, api) => {
      const pulls: Array<"common" | "rare" | "epic" | "ssr"> = [];
      for (let i = 0; i < 3; i++) {
        const r = api.rng.next();
        if (r < 0.55) pulls.push("common");
        else if (r < 0.85) pulls.push("rare");
        else if (r < 0.97) pulls.push("epic");
        else pulls.push("ssr");
      }
      // Pity rule. (filter-count, not .every: TS 5.5 infers a type predicate
      // from .every and would narrow pulls to "common"[], breaking the write.)
      if (pulls.filter((p) => p === "common").length === 3) pulls[2] = "epic";
      inst.state.pulls = pulls;
      for (const p of pulls) {
        if (p === "common") randomPawnSidestep(api);
        else if (p === "rare") spawnRandom(api, "p", emptyHomeRank(api, 1));
        else if (p === "epic") grantRandomOfTier(api, 4);
        else grantRandomOfTier(api, 7);
      }
    }),
  ),
  // 219. Seven Cases (T7) -------------------------------------------------------------------------------------------------------------------
  card(
    {
      id: "gm_seven_cases",
      name: "Seven Cases",
      description:
        "Seven cases, one opens at random: two hold pawns, one a knight, one a bishop, one a rook, one a full intelligence packet (a reroll plus your opponent's next offer revealed), and one holds absolutely nothing.",
      tier: 6,
      category: "pieces",
      icon: "BriefcaseBusiness",
      flavor: "The banker is not on the phone. The banker is the phone.",
    },
    activatedSimple((inst, api) => {
      const cases = ["pawn", "pawn", "knight", "bishop", "rook", "intel", "dud"] as const;
      const opened = cases[api.rng.int(cases.length)];
      inst.state.result = opened;
      const zone = emptySquares(api.board, (s) => inHalf(api.me, s));
      if (opened === "pawn") spawnRandom(api, "p", emptyHomeRank(api, 1));
      else if (opened === "knight") spawnRandom(api, "n", zone);
      else if (opened === "bishop") spawnRandom(api, "b", zone);
      else if (opened === "rook") spawnRandom(api, "r", zone);
      else if (opened === "intel") {
        api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
        api.mine.flags.seeOppCards = true;
      } else {
        const k = kingSquare(api.board, api.me);
        if (k != null) flashSquares(api, [k], true);
      }
    }),
  ),
  // 220. Martingale (T7) ----------------------------------------------------------------------------------------------------------------------
  card(
    {
      id: "gm_martingale",
      name: "Martingale",
      description:
        "Flip until you miss, half odds each flip, ladder capped at four: one win pays a pawn, two pays two pawns, three a knight and a pawn, four a rook and a knight. You keep the rung you reached, but going bust on the very first flip stuns the last piece you moved for a turn.",
      tier: 6,
      category: "pieces",
      icon: "Repeat",
      flavor: "The strategy is flawless. The bankroll is a pawn.",
    },
    activatedSimple((inst, api) => {
      let wins = 0;
      while (wins < 4 && api.rng.next() < 0.5) wins++;
      inst.state.wins = wins;
      const zone = emptySquares(api.board, (s) => inHalf(api.me, s));
      if (wins === 4) {
        spawnRandom(api, "r", zone);
        spawnRandom(api, "n", zone);
      } else if (wins === 3) {
        spawnRandom(api, "n", zone);
        spawnRandom(api, "p", emptyHomeRank(api, 1));
      } else if (wins === 2) {
        spawnRandom(api, "p", emptyHomeRank(api, 1));
        spawnRandom(api, "p", emptyHomeRank(api, 1));
      } else if (wins === 1) {
        spawnRandom(api, "p", emptyHomeRank(api, 1));
      } else {
        const last = lastMoveBy(api.board, api.me);
        if (last) {
          const p = api.board.pieces[last.to];
          if (p && p.color === api.me && p.type !== "k") {
            addEffect(api, { kind: "freeze", sq: last.to, owner: api.me, turns: 1, skin: "stun" });
          }
        }
      }
    }),
  ),
  // 221. Devil's Deck (T7) -----------------------------------------------------------------------------------------------------------------------
  card(
    {
      id: "gm_devils_deck",
      name: "Devil's Deck",
      description:
        "Six cards fanned face up, three drawn at random without replacement, all three resolve: the blessings summon a knight, stun three enemy pieces for a turn, revive one of your captured minors, and shield your army for a turn; the two curses take a random pawn of yours, or freeze one of your minors for 2 turns.",
      tier: 7,
      category: "item",
      icon: "Flame",
      flavor: "He shuffles with his tail. It is a whole thing.",
    },
    activatedSimple((inst, api) => {
      const deck = ["knight", "stun3", "revive", "shield", "losepawn", "freezeminor"];
      const drawn: string[] = [];
      for (let i = 0; i < 3; i++) {
        const idx = api.rng.int(deck.length);
        drawn.push(deck.splice(idx, 1)[0]);
      }
      inst.state.drawn = drawn;
      for (const d of drawn) {
        if (d === "knight") {
          spawnRandom(api, "n", emptySquares(api.board, (s) => inHalf(api.me, s)));
        } else if (d === "stun3") {
          const targets = mySquares(api.board, api.opp).filter(
            (s) => api.board.pieces[s]!.type !== "k",
          );
          for (let i = 0; i < 3 && targets.length; i++) {
            const idx = api.rng.int(targets.length);
            stunEnemy(api, targets.splice(idx, 1)[0], 1);
          }
        } else if (d === "revive") {
          const type = (["n", "b"] as PieceType[]).find((t) => revivable(api, t) > 0);
          if (type) {
            const sq = spawnRandom(api, type, emptySquares(api.board, (s) => inHalf(api.me, s)));
            if (sq != null) markRevived(api, type);
          }
        } else if (d === "shield") {
          addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 1 });
        } else if (d === "losepawn") {
          const sq = pickRng(api, mySquares(api.board, api.me, "p"));
          if (sq != null) api.removePiece(sq);
        } else if (d === "freezeminor") {
          const minors = [
            ...mySquares(api.board, api.me, "n"),
            ...mySquares(api.board, api.me, "b"),
          ];
          const sq = pickRng(api, minors);
          if (sq != null) {
            addEffect(api, { kind: "freeze", sq, owner: api.me, turns: 2, skin: "chains" });
          }
        }
      }
    }),
  ),
  // 222. Break the Bank (T8) ----------------------------------------------------------------------------------------------------------------------
  card(
    {
      id: "gm_break_the_bank",
      name: "Break the Bank",
      description:
        "Run the heist: three laser grids, 60% each to slip through. Three clean: your best captured piece returns AND a random tier 6 card joins your hand. Two: the tier 6 card. One: a consolation pawn, but a random piece of yours sits jailed for 2 turns. Zero: two of your pieces are jailed for 2 turns.",
      tier: 7,
      category: "pieces",
      icon: "Vault",
      flavor: "The plan had one job. The plan is in custody.",
    },
    activatedSimple((inst, api) => {
      let hits = 0;
      for (let i = 0; i < 3; i++) if (api.rng.next() < 0.6) hits++;
      inst.state.hits = hits;
      const jail = (n: number) => {
        const targets = mySquares(api.board, api.me).filter(
          (s) => api.board.pieces[s]!.type !== "k",
        );
        for (let i = 0; i < n && targets.length; i++) {
          const idx = api.rng.int(targets.length);
          const sq = targets.splice(idx, 1)[0];
          addEffect(api, { kind: "freeze", sq, owner: api.me, turns: 2, skin: "chains" });
        }
      };
      if (hits === 3) {
        const order: PieceType[] = ["q", "r", "b", "n", "p"];
        const type = order.find((t) => revivable(api, t) > 0);
        if (type) {
          const sq = spawnRandom(
            api,
            type,
            emptySquares(api.board, (s) => inHalf(api.me, s)),
          );
          if (sq != null) markRevived(api, type);
        }
        grantRandomOfTier(api, 6);
      } else if (hits === 2) {
        grantRandomOfTier(api, 6);
      } else if (hits === 1) {
        spawnRandom(api, "p", emptyHomeRank(api, 1));
        jail(1);
      } else {
        jail(2);
      }
    }),
  ),
  // 223. Wheel of the Cosmos (T8) -----------------------------------------------------------------------------------------------------------------------
  card(
    {
      id: "gm_wheel_of_the_cosmos",
      name: "Wheel of the Cosmos",
      description:
        "Twelve equal segments, spun once. Eight are kind: revive a captured minor, march every pawn you own, a three card draft, stun two enemy pieces, promote a random pawn to knight, two rerolls, thaw your whole army, or summon a knight. Four are cruel: lose a random pawn, one of your minors freezes for 2 turns, your opponent gains a reroll, or one of your pawns defects.",
      tier: 8,
      category: "item",
      icon: "Orbit",
      flavor: "The universe is a wheel. The wheel is rigged fairly.",
    },
    activatedSimple((inst, api) => {
      const seg = api.rng.int(12);
      inst.state.segment = seg;
      const myHalf = emptySquares(api.board, (s) => inHalf(api.me, s));
      switch (seg) {
        case 0: {
          const type = (["n", "b"] as PieceType[]).find((t) => revivable(api, t) > 0);
          if (type) {
            const sq = spawnRandom(api, type, myHalf);
            if (sq != null) markRevived(api, type);
          }
          break;
        }
        case 1: {
          const order =
            api.me === "w"
              ? [...advanceablePawns(api)].sort((a, b) => b - a)
              : [...advanceablePawns(api)].sort((a, b) => a - b);
          for (const sq of order) advancePawn(api, sq);
          break;
        }
        case 2:
          api.mine.flags.prepThree = true;
          break;
        case 3: {
          const targets = mySquares(api.board, api.opp).filter(
            (s) => api.board.pieces[s]!.type !== "k",
          );
          for (let i = 0; i < 2 && targets.length; i++) {
            const idx = api.rng.int(targets.length);
            stunEnemy(api, targets.splice(idx, 1)[0], 1);
          }
          break;
        }
        case 4: {
          const sq = pickRng(api, mySquares(api.board, api.me, "p"));
          if (sq != null) api.setPieceType(sq, "n");
          break;
        }
        case 5:
          api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 2;
          break;
        case 6:
          api.bs.effects = api.bs.effects.filter(
            (e) => !((e.kind === "freeze" || e.kind === "walnut") && e.owner === api.me),
          );
          break;
        case 7:
          spawnRandom(api, "n", myHalf);
          break;
        case 8: {
          const sq = pickRng(api, mySquares(api.board, api.me, "p"));
          if (sq != null) api.removePiece(sq);
          break;
        }
        case 9: {
          const minors = [
            ...mySquares(api.board, api.me, "n"),
            ...mySquares(api.board, api.me, "b"),
          ];
          const sq = pickRng(api, minors);
          if (sq != null) {
            addEffect(api, { kind: "freeze", sq, owner: api.me, turns: 2, skin: "ice" });
          }
          break;
        }
        case 10:
          api.theirs.rerollsLeft = (api.theirs.rerollsLeft ?? 0) + 1;
          break;
        default: {
          const sq = pickRng(api, mySquares(api.board, api.me, "p"));
          if (sq != null) {
            const zone = emptySquares(api.board, (s) => inHalf(api.opp, s)).filter(
              (s) => RANK(s) !== 0 && RANK(s) !== 7,
            );
            const to = pickRng(api, zone);
            if (to != null) {
              api.removePiece(sq, { uncounted: true });
              api.place(to, "p", api.opp);
              flashSquares(api, [to], true);
            }
          }
        }
      }
    }),
  ),
  // --- Nerf-mode gambling (owner request): 2 hexes + 2 boons -------------------
  // Hexes are nerf-mode-only by category; the boons carry the boon flag and
  // the same house rules (api.rng, printed odds, board payouts).
  card(
    {
      id: "gm_cursed_dice",
      name: "Cursed Dice",
      description:
        "Force your opponent to roll the bone dice: 40% one random enemy piece freezes for a turn, 35% a random enemy pawn stumbles back a square, 25% the dice grin and nothing happens.",
      tier: 3,
      category: "hex",
      icon: "Dices",
      flavor: "Carved from something that still remembers being alive.",
    },
    activatedSimple((inst, api) => {
      const r = api.rng.next();
      if (r < 0.4) {
        inst.state.result = "freeze";
        const targets = mySquares(api.board, api.opp).filter(
          (s) => api.board.pieces[s]!.type !== "k",
        );
        const sq = pickRng(api, targets);
        if (sq != null) addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 1, skin: "stone" });
      } else if (r < 0.75) {
        inst.state.result = "stumble";
        const back = fwdOf(api.opp) * -1;
        const pawns = mySquares(api.board, api.opp, "p").filter((sq) => {
          const to = sq + back;
          return to >= 0 && to <= 63 && !api.board.pieces[to] && RANK(to) !== 0 && RANK(to) !== 7;
        });
        const sq = pickRng(api, pawns);
        if (sq != null) {
          api.relocate(sq, sq + back);
          flashSquares(api, [sq + back], true);
        }
      } else {
        inst.state.result = "grin";
        const k = kingSquare(api.board, api.opp);
        if (k != null) flashSquares(api, [k], true);
      }
    }),
  ),
  card(
    {
      id: "gm_rigged_raffle",
      name: "Rigged Raffle",
      description:
        "Enter your opponent in a raffle they never asked to join: for their next 3 turns, 1 chance in 3 after each of their moves that the piece they just moved is glued in place for a turn.",
      tier: 5,
      category: "hex",
      icon: "Ticket",
      flavor: "Everyone is a winner. Of glue.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        if (api.rng.next() < 1 / 3) {
          const p = api.board.pieces[move.to];
          if (p && p.color === api.opp && p.type !== "k") {
            addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: 1, skin: "glue" });
          }
        }
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t <= 0) inst.spent = true;
      },
      status: (inst) => `${turnsLeft(inst)} of their turns in the raffle`,
    },
  ),
  card(
    {
      id: "gm_consolation_scratcher",
      name: "Consolation Scratcher",
      description:
        "Scratch it: 50% a random pawn of yours advances a free square, 30% you gain a draft reroll, 20% dust and a lovely sentiment.",
      tier: 1,
      category: "tempo",
      boon: true,
      icon: "Eraser",
      flavor: "Sorry about the handicap. Here is a lottery ticket.",
    },
    activatedSimple((inst, api) => {
      const r = api.rng.next();
      if (r < 0.5) {
        inst.state.result = "advance";
        const pawn = pickRng(api, advanceablePawns(api));
        if (pawn != null) advancePawn(api, pawn);
      } else if (r < 0.8) {
        inst.state.result = "reroll";
        api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
      } else {
        inst.state.result = "dust";
        const k = kingSquare(api.board, api.me);
        if (k != null) flashSquares(api, [k], true);
      }
    }),
  ),
  card(
    {
      id: "gm_hardship_jackpot",
      name: "Hardship Jackpot",
      description:
        "The misery meter pays out: 60% a pawn appears on your second rank, 25% one of your frozen or stuck pieces is thawed, 15% the jackpot doubles: a pawn AND a thaw.",
      tier: 4,
      category: "pieces",
      boon: true,
      icon: "PiggyBank",
      flavor: "Insurance for people the universe keeps picking on.",
    },
    activatedSimple((inst, api) => {
      const thaw = () => {
        const frozen = api.bs.effects.filter(
          (e) => (e.kind === "freeze" || e.kind === "walnut") && e.owner === api.me,
        );
        const e = pickRng(api, frozen);
        if (e) api.bs.effects = api.bs.effects.filter((x) => x !== e);
      };
      const r = api.rng.next();
      if (r < 0.6) {
        inst.state.result = "pawn";
        spawnRandom(api, "p", emptyHomeRank(api, 1));
      } else if (r < 0.85) {
        inst.state.result = "thaw";
        thaw();
      } else {
        inst.state.result = "double";
        spawnRandom(api, "p", emptyHomeRank(api, 1));
        thaw();
      }
    }),
  ),
  // 224. The Last Bet (T8) --------------------------------------------------------------------------------------------------------------------------------
  card(
    {
      id: "gm_the_last_bet",
      name: "The Last Bet",
      description:
        "Push your queen across the felt: 70% she returns empowered, adding knight leaps to her slides for 6 of your turns, but those knight leaps cannot capture. 30% the back room keeps her for 2 of your turns, then returns her untouched to her square, or the nearest empty one.",
      tier: 8,
      category: "pieces",
      icon: "Gem",
      flavor: "She bet herself. Nobody at the table breathed.",
      requires: ["q"],
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.resolved != null
          ? null
          : {
              kind: "square",
              label: "Choose the queen making the bet",
              squares: mySquares(api.board, api.me, "q"),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.resolved != null) return;
        inst.state.resolved = true;
        const win = api.rng.next() < 0.7;
        if (win) {
          inst.state.result = "empowered";
          inst.state.sq = sq;
          inst.state.turns = 6;
          pinCosmetic(api, sq, api.me, "gilded", 6, "The Last Bet");
          flashSquares(api, [sq]);
        } else {
          inst.state.result = "backroom";
          inst.state.homeSq = sq;
          inst.state.wait = 2;
          api.removePiece(sq, { uncounted: true });
          flashSquares(api, [sq], true);
        }
      },
      augmentMoves: (moves, inst, api) => {
        if (inst.state.result !== "empowered") return;
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || ((inst.state.turns as number) ?? 0) <= 0) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || p.type !== "q") return;
        // The granted knight leaps cannot capture: drop any leap that lands on
        // an enemy piece, leaving only the empty-square hops.
        addNovel(
          moves,
          leapMoves(api.board, sq, KNIGHT_LEAPS, inst.id).filter((m) => m.captured == null),
        );
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.state.result === "empowered") {
          const sq = inst.state.sq as Square | undefined;
          if (sq != null) {
            if (move.capturedSquare === sq && move.from !== sq) {
              inst.spent = true;
              return;
            }
            if (move.from === sq && move.color === api.me) inst.state.sq = move.to;
          }
          if (move.color === api.me) {
            const t = ((inst.state.turns as number) ?? 0) - 1;
            inst.state.turns = t;
            if (t <= 0) inst.spent = true;
          }
          return;
        }
        if (inst.state.result === "backroom" && move.color === api.me) {
          const w = ((inst.state.wait as number) ?? 0) - 1;
          inst.state.wait = w;
          if (w > 0) return;
          const home = inst.state.homeSq as Square;
          let to: Square | null = !api.board.pieces[home] ? home : null;
          if (to == null) {
            let best: Square | null = null;
            let bestD = 99;
            for (const s of emptySquares(api.board)) {
              const d =
                Math.abs(FILE(s) - FILE(home)) + Math.abs(RANK(s) - RANK(home));
              if (d < bestD) {
                bestD = d;
                best = s;
              }
            }
            to = best;
          }
          if (to != null) {
            api.place(to, "q", api.me);
            flashSquares(api, [to]);
          }
          inst.spent = true;
        }
      },
      status: (inst) =>
        inst.state.resolved == null
          ? "the felt awaits"
          : inst.state.result === "empowered"
            ? `empowered, ${turnsLeft(inst)} of your turns left`
            : `the back room holds her for ${(inst.state.wait as number) ?? 0} more of your turns`,
    },
  ),
];
