// PT set: TIME & FAUSTIAN BARGAINS. A batch drafted from the pt.txt brainstorm
// (the "Faustian" A-section, the clock/tempo B-section, and the draft-chaos
// J-section). Every card here reuses primitives that already ship in the
// engine, so the whole file is additive and needs no new engine surface:
//   - draft flags (prepThree / takeBoth / bankBonus / forceTier / blockedDrafts)
//     reached through api.mine.flags and api.theirs.flags, exactly as the wild
//     "arcane" draft cards do. blockedDrafts on api.mine skips the OWNER's own
//     upcoming drafts (game.ts decrements it when that player's draft comes up),
//     which is how the self-cost cards pay their price.
//   - adjustClock (addSelfSec / subOppSec) for the clock cards, the same
//     channel Time Thief and Computer Virus use.
//   - short_leash, the Berserker hangover effect, for a "cool down" downside
//     (it carries the engine's non-soft-lock guarantee: king captures stay
//     legal and the leash is relaxed rather than ever stranding the mover).
//   - api.place / api.removePiece / api.board.castling for the summon-with-cost
//     cards (mutating castling mirrors restoreCastling and replays deterministically).
//   - api.rng, the seeded deterministic RNG (Roulette's source), for the gambles.
//
// Safety notes: no card here freezes, removes, or targets a king. No move
// filter is used (nothing can empty the legal-move list). The one self-restrict
// downside is short_leash, which the engine already guards against soft-lock.

import {
  Buff,
  BuffApi,
  BuffInstance,
  Move,
  PieceType,
  Square,
  Tier,
  card,
  instant,
  activated,
  addEffect,
  emptySquares,
  mySquares,
  inHalf,
  pawnRankOk,
  dist,
} from "../funny/shared";
import { grantRandomTier9 } from "../helpers";
// Card-name lookup via the cycle-free registry (populated by library.ts), read
// only inside a runtime effect — never at module load. Importing library.ts
// directly here would form a library <-> card-module cycle that TDZ-crashes
// under some module-eval orders; the registry breaks that edge.
import { buffRegistry } from "../registry";

/** King "reaching out" to devour: one capture move onto every enemy piece
 * (never a king) standing exactly two king-steps away, leaping whatever sits
 * between. Distance-1 captures are already the king's own moves, so this only
 * adds the extra reach. */
function feastCaptures(api: BuffApi, via: string): Move[] {
  const out: Move[] = [];
  const kingSq = mySquares(api.board, api.me, "k")[0];
  if (kingSq == null) return out;
  for (const sq of mySquares(api.board, api.opp)) {
    const t = api.board.pieces[sq]!;
    if (t.type === "k") continue;
    if (dist(kingSq, sq) === 2) {
      out.push({
        from: kingSq,
        to: sq,
        piece: "k",
        color: api.me,
        captured: t.type,
        capturedSquare: sq,
        via,
      });
    }
  }
  return out;
}

export const PT_TIME_CARDS: Buff[] = [
  // #4 Golden Touch --------------------------------------------------------
  // pt.txt downside was "your king cannot move until you make that capture".
  // Kings are never frozen and there is no own-move filter hook, so the cost
  // is reframed as a real Faustian sacrifice: a pawn crumbles to gold dust
  // the moment the treasure lands. The upside (a captured enemy joins your
  // army) is unique in the catalog.
  card(
    {
      id: "golden_touch",
      icon: "Coins",
      name: "Golden Touch",
      description:
        "The next two enemy pieces you capture (other than kings) are reforged as your own and added to your army on empty squares in your half. The price of greed: each reforging turns one of your pawns to gold, and it is lost.",
      tier: 7,
      category: "pieces",
      flavor: "Everything you touch, and everything it costs you.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 2;
      },
      onMovePlayed: (inst, move, api) => {
        const left = (inst.state.charges as number) ?? 0;
        if (left <= 0) return;
        if (move.color !== api.me) return;
        if (!move.captured || move.captured === "k") return;
        const type = move.captured as PieceType;
        const okForPawn = (sq: Square) => type !== "p" || pawnRankOk(sq);
        const half = emptySquares(api.board, (sq) => inHalf(api.me, sq)).filter(okForPawn);
        const spot = half.length
          ? half[0]
          : emptySquares(api.board).filter(okForPawn)[0];
        if (spot == null) return; // no legal square: keep the charge for later
        api.place(spot, type, api.me);
        // Pay the pawn (never the piece we just spawned).
        const pawn = mySquares(api.board, api.me, "p").find((sq) => sq !== spot);
        if (pawn != null) api.removePiece(pawn, { uncounted: true });
        inst.state.charges = left - 1;
        if (left - 1 <= 0) inst.spent = true;
      },
      status: (inst) =>
        ((inst.state.charges as number) ?? 0) > 0
          ? `your next ${(inst.state.charges as number) > 1 ? "2 captures join" : "capture joins"} your army`
          : null,
    },
  ),

  // #5 All In --------------------------------------------------------------
  // Engine order (game.ts): a blockedDrafts round is skipped WITHOUT consuming
  // prepThree / takeBoth, so the single skip resolves first and the banked
  // three-card, take-all offer lands on the draft after it. rollOffer (draft.ts)
  // gives a prepThree offer three cards (never collapsing it into an apex slot),
  // and takeBoth then auto-takes all three. The ante is a single skipped draft.
  card(
    {
      id: "all_in",
      icon: "Club",
      name: "All In",
      description:
        "Push everything to the center. Your next draft offer is skipped. The offer after that shows three cards, and you take all three.",
      tier: 6,
      category: "draft",
      flavor: "Three sevens or nothing.",
    },
    // REBALANCE (~25% weaker): the payout was three cards ONE TIER HIGHER, all
    // taken. The tier lift (bankBonus) is dropped, so All In now banks three
    // cards at the normal tier and still takes all three. Same three-for-one
    // card advantage off a single skipped draft, minus the tier boost on top.
    instant((_inst, api) => {
      api.mine.flags.prepThree = true;
      api.mine.flags.takeBoth = (api.mine.flags.takeBoth ?? 0) + 1;
      api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 1;
    }),
  ),

  // #8 Mortgage ------------------------------------------------------------
  card(
    {
      id: "mortgage",
      icon: "Banknote",
      name: "Mortgage",
      description:
        "Take out a loan against your home: summon a rook on any empty square. Freshly built, the rook cannot capture until after your opponent has replied. The bank keeps the deed, so you can never castle again for the rest of the game.",
      tier: 5,
      category: "pieces",
      flavor: "Sold, to the player in a hurry.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose where the mortgaged rook is built",
              squares: emptySquares(api.board),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        api.place(sq, "r", api.me);
        if (api.me === "w") {
          api.board.castling.wk = false;
          api.board.castling.wq = false;
        } else {
          api.board.castling.bk = false;
          api.board.castling.bq = false;
        }
      },
    ),
  ),

  // #10 Overclocked (renamed to avoid the shipped "Overclock") --------------
  card(
    {
      id: "overclocked",
      icon: "Gauge",
      name: "Overclocked",
      description:
        "Crank the clock speed: add 75 seconds to your own clock. Then everything runs hot and has to cool down, so for your next 3 turns all your pieces can move only one square.",
      tier: 5,
      category: "tempo",
      flavor: "More gigahertz, more regret.",
      fx: { motif: "anchor", pieces: "all", self: true },
    },
    instant((_inst, api) => {
      api.adjustClock({ addSelfSec: 75 });
      addEffect(api, { kind: "short_leash", owner: api.me, turns: 3 });
    }),
  ),

  // #11 Last Meal ----------------------------------------------------------
  // pt.txt's "ignoring danger / cannot be defended" downside is a no-op in a
  // no-check ruleset (the king already walks into any square and there is no
  // defense concept), so it is dropped. What remains is a genuine new power:
  // for two turns the king reaches two squares to devour, then the feast ends.
  card(
    {
      id: "last_meal",
      icon: "Drumstick",
      name: "Last Meal",
      description:
        "Your king ties on a napkin. For your next 3 turns it may capture any enemy piece (other than a king) up to two squares away, leaping over anything in between. The napkin is good for a single outing: the first time your king moves, whether it feasts or comes up empty, the meal is over.",
      tier: 5,
      category: "attack",
      flavor: "Fork, knife, and no table manners.",
      fx: { motif: "empower", pieces: ["k"], self: true },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
      },
      augmentMoves: (moves, inst, api) => {
        if (((inst.state.turns as number) ?? 0) <= 0) return;
        for (const m of feastCaptures(api, inst.id)) moves.push(m);
      },
      onMovePlayed: (inst, move, api) => {
        if (((inst.state.turns as number) ?? 0) <= 0) return;
        if (move.color !== api.me) return;
        // One bite only: the first time your king moves, the charge is spent,
        // whether it took a feast capture or made any other move (a failed or
        // wasted attempt still spends it). Moves by your other pieces do not
        // spend it; the window otherwise lapses after 3 of your turns.
        if (move.piece === "k") {
          inst.state.turns = 0;
          inst.spent = true;
          return;
        }
        const left = ((inst.state.turns as number) ?? 3) - 1;
        inst.state.turns = left;
        if (left <= 0) inst.spent = true;
      },
      status: (inst) => `${(inst.state.turns as number) ?? 0} of your turns to feast`,
    },
  ),

  // #24 Time Out -----------------------------------------------------------
  card(
    {
      id: "time_out",
      icon: "TimerOff",
      name: "Time Out",
      description:
        "The referee throws a flag on your opponent: their next draft is skipped and their clock loses 15 seconds.",
      tier: 3,
      category: "draft",
      flavor: "Two-minute penalty, no draft for you.",
    },
    // REBALANCE (~25% weaker): a full draft-skip stacked with clock damage read
    // rich for tier 5, so the clock bite drops from 20 to 15 seconds. The
    // draft-skip (the card's main effect) is untouched.
    instant((_inst, api) => {
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
      api.adjustClock({ subOppSec: 15 });
    }),
  ),

  // #48 Compound Interest was intentionally skipped: it needs an off-cadence
  // "grant yourself a bonus card" inject path, and no reusable helper exposes
  // one (draft flags only reshape the NEXT scheduled offer, they cannot insert
  // a new draft). See the report for details.

  // #51 Overtime Pay -------------------------------------------------------
  // Reworked (owner): the old version was a passive that dripped 3 seconds
  // onto your clock per capture, so PLAYING the card did nothing visible and
  // it only paid out if you happened to trade. Now it pays the moment you
  // clock in: a lump sum straight onto your own clock, no strings, with a
  // small raise on top (105 seconds). Instant and deterministic (no RNG), and
  // tier drops to 2.
  card(
    {
      id: "overtime_pay",
      icon: "PiggyBank",
      name: "Overtime Pay",
      // Tier 4 (moved up from 2): a flat 105 seconds is a bigger swing than
      // any other pure clock gain in the game; it prices like the other
      // tier-4 clock cards, not a tier-2 trinket.
      description:
        "You clock in and cash out on the spot: 105 seconds go straight onto your own clock the moment you play this. Time and a half, paid in full.",
      tier: 2,
      category: "tempo",
      flavor: "Time and a half, in your favor.",
    },
    instant((_inst, api) => {
      api.adjustClock({ addSelfSec: 105 });
    }),
  ),

  // #116 Mystery Box -------------------------------------------------------
  card(
    {
      id: "mystery_box",
      icon: "Gift",
      name: "Mystery Box",
      description:
        "Rattle the crate and pop the lid: your next draft offer rolls at a completely random tier, anywhere from 2 to 7.",
      tier: 3,
      category: "draft",
      flavor: "Could be a diamond, could be a sock.",
    },
    // REBALANCE (~25% weaker at the top): the random tier ceiling drops from 8
    // to 7, so the box can no longer roll a near-apex tier-8 offer for a tier-4
    // card. Floor unchanged at tier 2.
    instant((_inst, api) => {
      // The floor is tier 2: the sock at the bottom of the crate was thrown out.
      api.mine.flags.forceTier = (2 + api.rng.int(6)) as Tier;
    }),
  ),

  // #117 Swap Meet ---------------------------------------------------------
  // A half-blind trade: your LOWEST-TIER unspent, un-bound card and a random
  // one of your opponent's change hands (you used to give a random card too,
  // so the deal could cost you your best hold). Only cards that transfer
  // cleanly are eligible (never a spent, nullified, or already-bound-in
  // upgrade), matching the exclusion the shipped buff-theft cards use.
  card(
    {
      id: "swap_meet",
      icon: "ArrowLeftRight",
      name: "Swap Meet",
      description:
        "Set up a stall and shake on a deal: your lowest-tier held card and a random one of your opponent's held cards are swapped between you.",
      tier: 4,
      category: "draft",
      flavor: "One player's junk...",
    },
    instant((inst, api) => {
      const eligible = (b: BuffInstance) =>
        b !== inst &&
        !b.spent &&
        !b.nullified &&
        b.state.sq == null &&
        b.state.sqs == null &&
        b.state.squares == null;
      const mineOpts = api.mine.buffs.filter(eligible);
      const theirOpts = api.theirs.buffs.filter(eligible);
      if (mineOpts.length === 0 || theirOpts.length === 0) return;
      // You always put your cheapest eligible card on the table (first-listed
      // wins tier ties, so the pick is deterministic on every replica).
      let give = mineOpts[0];
      for (const b of mineOpts) if (b.tier < give.tier) give = b;
      const take = theirOpts[api.rng.int(theirOpts.length)];
      const gi = api.mine.buffs.indexOf(give);
      const ti = api.theirs.buffs.indexOf(take);
      if (gi < 0 || ti < 0) return;
      api.mine.buffs.splice(gi, 1);
      api.theirs.buffs.splice(ti, 1);
      api.mine.buffs.push(take);
      api.theirs.buffs.push(give);
    }),
  ),

  // #118 Gamble ------------------------------------------------------------
  // REBALANCE (~25% weaker): the coin was weighted 2/3 to heads; it is now a
  // fair 1/2. The prizes are unchanged (heads still takes both cards for two
  // drafts, tails still trades a skipped draft with the opponent, and both
  // faces still bank the +1 tier lift), so the trim is purely to the odds of
  // hitting the strong heads face.
  card(
    {
      id: "gamble",
      icon: "Spade",
      name: "Gamble",
      description:
        "Flip a fair coin, heads half the time. Heads: for your next two draft offers you take every card instead of one, and your next offer rolls a tier higher. Tails: both you and your opponent skip your next draft, but your following offer still rolls a tier higher.",
      tier: 3,
      category: "draft",
      flavor: "Heads you win, tails you win a little.",
    },
    instant((inst, api) => {
      if (api.rng.int(2) === 0) {
        api.mine.flags.takeBoth = (api.mine.flags.takeBoth ?? 0) + 2;
        // outcome: a short human line shown on the board after the coin flip
        // resolves, so the player learns which face came up (see the cast
        // announcement banner). Synced with the card state.
        inst.state.outcome = "Heads: take BOTH cards for your next 2 drafts (+1 tier)";
      } else {
        api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 1;
        api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
        inst.state.outcome = "Tails: you both skip a draft (+1 tier next)";
      }
      // Both faces bank the tier lift (capped at 1 like every bank).
      api.mine.flags.bankBonus = Math.min(1, (api.mine.flags.bankBonus ?? 0) + 1);
    }),
  ),

  // #119 Jackpot -----------------------------------------------------------
  // REBALANCE (~25% weaker): the apex hit rate drops from 2/3 to a fair 1/2
  // coin flip. The miss consolation is unchanged and still rich (next offer is
  // three cards, one tier higher), so a pull is never close to a dead loss, but
  // landing the apex is no longer the odds-on outcome for a tier-7 card.
  card(
    {
      id: "jackpot",
      icon: "Dices",
      name: "Jackpot",
      description:
        "Pull the lever for a one-in-two shot at a random apex card, one of the game's most powerful. Miss, and the consolation is still rich: your next draft rolls one tier higher and offers three cards instead of two.",
      tier: 6,
      category: "draft",
      flavor: "Cherry, cherry, and please, cherry.",
    },
    instant((inst, api) => {
      if (api.rng.int(2) === 0) {
        grantRandomTier9(api);
        inst.state.outcome = "JACKPOT: a random apex card is yours!";
      } else {
        api.mine.flags.bankBonus = Math.min(1, (api.mine.flags.bankBonus ?? 0) + 1);
        api.mine.flags.prepThree = true;
        inst.state.outcome = "So close: next draft is 3 cards, +1 tier";
      }
    }),
  ),

  // #120 Double or Nothing -------------------------------------------------
  // Risk a card you already hold: heads it is upgraded TWO tiers (capped at 8,
  // so it never becomes a tier-9 special, buffed from one, owner request),
  // tails it is knocked down one tier instead of being lost outright (the
  // softened downside, owner request). A random eligible held card is chosen
  // deterministically off the seeded RNG; bound upgrades are excluded (their
  // state points at a board square). Does nothing if you hold no other
  // riskable card.
  card(
    {
      id: "double_or_nothing",
      icon: "Coins",
      name: "Double or Nothing",
      description:
        "Bet one of your other held cards on a coin flip. Heads: it is upgraded two tiers. Tails: it is knocked down one tier, but you keep it.",
      tier: 3,
      category: "draft",
      flavor: "Let it ride.",
    },
    instant((inst, api) => {
      const eligible = api.mine.buffs.filter(
        (b) =>
          b !== inst &&
          !b.spent &&
          !b.nullified &&
          b.state.sq == null &&
          b.state.sqs == null &&
          b.state.squares == null,
      );
      if (eligible.length === 0) {
        inst.state.outcome = "No other card to bet, nothing happens";
        return;
      }
      const stake = eligible[api.rng.int(eligible.length)];
      const stakeName = buffRegistry.byId[stake.id]?.name ?? "a card";
      if (api.rng.int(2) === 0) {
        stake.tier = Math.min(8, stake.tier + 2) as Tier;
        inst.state.outcome = `Heads: ${stakeName} upgraded to tier ${stake.tier}!`;
      } else {
        stake.tier = Math.max(1, stake.tier - 1) as Tier;
        inst.state.outcome = `Tails: ${stakeName} knocked to tier ${stake.tier}`;
      }
    }),
  ),
];
