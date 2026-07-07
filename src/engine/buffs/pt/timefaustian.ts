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
  timedAugment,
  emptySquares,
  mySquares,
  inHalf,
  pawnRankOk,
  dist,
} from "../funny/shared";

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
      name: "Golden Touch",
      description:
        "The next enemy piece you capture (other than a king) is reforged as your own and added to your army on an empty square in your half. The price of greed: one of your pawns turns to gold and is lost.",
      tier: 6,
      category: "pieces",
      flavor: "Everything you touch, and everything it costs you.",
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.charges = 1;
      },
      onMovePlayed: (inst, move, api) => {
        if (((inst.state.charges as number) ?? 0) <= 0) return;
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
        inst.state.charges = 0;
        inst.spent = true;
      },
      status: (inst) =>
        ((inst.state.charges as number) ?? 0) > 0 ? "your next capture joins your army" : null,
    },
  ),

  // #5 All In --------------------------------------------------------------
  // Engine order (game.ts): a blockedDrafts round is skipped WITHOUT consuming
  // prepThree / bankBonus / takeBoth, so the two skips resolve first and the
  // banked three-card, tier-up, take-all offer lands on the draft after them.
  // Same net as pt.txt's "three from the next tier up, skip your next two".
  card(
    {
      id: "all_in",
      name: "All In",
      description:
        "Push everything to the center. Your next two draft offers are skipped. The offer after that shows three cards one tier higher, and you take all three.",
      tier: 8,
      category: "draft",
      flavor: "Three sevens or nothing.",
    },
    instant((_inst, api) => {
      api.mine.flags.prepThree = true;
      api.mine.flags.takeBoth = (api.mine.flags.takeBoth ?? 0) + 1;
      api.mine.flags.bankBonus = Math.min(1, (api.mine.flags.bankBonus ?? 0) + 1);
      api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 2;
    }),
  ),

  // #8 Mortgage ------------------------------------------------------------
  card(
    {
      id: "mortgage",
      name: "Mortgage",
      description:
        "Take out a loan against your home: summon a rook on any empty square. The bank keeps the deed, so you can never castle again for the rest of the game.",
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
      name: "Overclocked",
      description:
        "Crank the clock speed: add 60 seconds to your own clock. Then everything runs hot and has to cool down, so for your next 3 turns all your pieces can move only one square.",
      tier: 7,
      category: "tempo",
      flavor: "More gigahertz, more regret.",
      fx: { motif: "anchor", pieces: "all", self: true },
    },
    instant((_inst, api) => {
      api.adjustClock({ addSelfSec: 60 });
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
      name: "Last Meal",
      description:
        "Your king ties on a napkin. For your next 2 turns it may capture any enemy piece (other than a king) up to two squares away, leaping over anything in between.",
      tier: 5,
      category: "attack",
      flavor: "Fork, knife, and no table manners.",
      fx: { motif: "empower", pieces: ["k"], self: true },
    },
    timedAugment(2, (_moves, inst, api) => feastCaptures(api, inst.id)),
  ),

  // #24 Time Out -----------------------------------------------------------
  card(
    {
      id: "time_out",
      name: "Time Out",
      description:
        "The referee throws a flag on your opponent: their next draft is skipped and their clock loses 10 seconds.",
      tier: 5,
      category: "draft",
      flavor: "Two-minute penalty, no draft for you.",
    },
    instant((_inst, api) => {
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
      api.adjustClock({ subOppSec: 10 });
    }),
  ),

  // #48 Compound Interest was intentionally skipped: it needs an off-cadence
  // "grant yourself a bonus card" inject path, and no reusable helper exposes
  // one (draft flags only reshape the NEXT scheduled offer, they cannot insert
  // a new draft). See the report for details.

  // #51 Overtime Pay -------------------------------------------------------
  card(
    {
      id: "overtime_pay",
      name: "Overtime Pay",
      description:
        "You bill for every hour worked: each time you capture an enemy piece (other than a king), 3 seconds are added to your own clock.",
      tier: 4,
      category: "tempo",
      flavor: "Time and a half, in your favor.",
    },
    {
      kind: "passive",
      onMovePlayed: (_inst, move, api) => {
        if (move.color !== api.me) return;
        if (!move.captured || move.captured === "k") return;
        api.adjustClock({ addSelfSec: 3 });
      },
    },
  ),

  // #116 Mystery Box -------------------------------------------------------
  card(
    {
      id: "mystery_box",
      name: "Mystery Box",
      description:
        "Rattle the crate and pop the lid: your next draft offer rolls at a completely random tier, anywhere from 1 to 8.",
      tier: 4,
      category: "draft",
      flavor: "Could be a diamond, could be a sock.",
    },
    instant((_inst, api) => {
      api.mine.flags.forceTier = (1 + api.rng.int(8)) as Tier;
    }),
  ),

  // #117 Swap Meet ---------------------------------------------------------
  // A blind two-way trade: a random unspent, un-bound card of yours and a
  // random one of your opponent's change hands. Only cards that transfer
  // cleanly are eligible (never a spent, nullified, or already-bound-in
  // upgrade), matching the exclusion the shipped buff-theft cards use.
  card(
    {
      id: "swap_meet",
      name: "Swap Meet",
      description:
        "Set up a stall and shake on a deal: one of your held cards and one of your opponent's held cards are picked at random and swapped between you.",
      tier: 5,
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
      const give = mineOpts[api.rng.int(mineOpts.length)];
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
  card(
    {
      id: "gamble",
      name: "Gamble",
      description:
        "Flip a coin. Heads: for your next two draft offers you take every card instead of one. Tails: your next draft is skipped entirely.",
      tier: 6,
      category: "draft",
      flavor: "Heads you win, tails you learn.",
    },
    instant((_inst, api) => {
      if (api.rng.int(2) === 0) {
        api.mine.flags.takeBoth = (api.mine.flags.takeBoth ?? 0) + 2;
      } else {
        api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 1;
      }
    }),
  ),
];
