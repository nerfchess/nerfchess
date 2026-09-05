// Tier 2 (Easy) hexes: a small standing restriction or a ~4-turn timed debuff
// on ONE piece class. No material loss. Slightly heavier than Tier 1 (longer
// durations, brief petrify/freeze, barred squares, a single draft or turn
// denied), but every card is easily played around and carries no material
// swing. Import ONLY from ./shared so the safety rails come for free.

import { Buff, BuffInstance, Mech, Move, BuffApi, Square } from "./shared";
import {
  tierHexes,
  hex,
  curse,
  walnutTarget,
  activated,
  mySquares,
  instant,
  addEffect,
  stealBuffs,
  suppressDraftCards,
  tickTurns,
  turnsLeft,
  inBoard,
  FILE,
  RANK,
  SQ,
} from "./shared";

const H = tierHexes(2);

/** Chebyshev (king-step) distance a move travels. */
const dist = (from: number, to: number) =>
  Math.max(Math.abs(FILE(to) - FILE(from)), Math.abs(RANK(to) - RANK(from)));

/** Wrap a mech so its effect ALSO hands the caster one draft reroll: the
 * draft-touching hexes now nudge a single draft and refund a reroll. */
function grantRerollAfter(mech: Mech): Mech {
  const base = mech.effect;
  return {
    ...mech,
    effect: (inst, api, picks) => {
      if (base) base(inst, api, picks);
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
    },
  };
}

/** Timed opponent curse where the FIRST move the curse would forbid is allowed
 * once (the first affected piece's one legal escape move); after that the
 * restriction bites for the remainder of its `turns` of their turns. */
function curseWithEscape(
  turns: number,
  filter: (moves: Move[], api: BuffApi) => Move[],
): Mech {
  return {
    kind: "passive",
    init: (inst) => {
      inst.state.turns = turns;
      inst.state.escaped = false;
    },
    filterOpponentMoves: (moves, inst, api) => {
      if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
      // Until the escape is spent the curse does not bite.
      if (!inst.state.escaped) return moves;
      const kept = filter(moves, api);
      return kept.length > 0 ? kept : moves;
    },
    onMovePlayed: (inst, move, api) => {
      // Spend the escape the first time the opponent plays a move the curse
      // would otherwise have removed.
      if (
        turnsLeft(inst) > 0 &&
        !inst.state.escaped &&
        move.color === api.opp &&
        filter([move], api).length === 0
      ) {
        inst.state.escaped = true;
      }
      tickTurns(inst, move, api.opp);
    },
    status: (inst) => `${turnsLeft(inst)} of their turns left`,
  };
}

/** Passive that fires `effect` once, right after the opponent's next completed
 * move (a one-move-delayed instant), then retires. */
function afterOppMove(effect: (api: BuffApi) => void): Mech {
  return {
    kind: "passive",
    onMovePlayed: (inst, move, api) => {
      if (inst.spent) return;
      if (move.color === api.opp) {
        effect(api);
        inst.spent = true;
      }
    },
  };
}

export const HEXES_T2: Buff[] = [
  H(
    { id: "short_leash", name: "Short Leash", description: "Your opponent's bishops cannot cross into your half of the board for their next 4 turns.", flavor: "Kept close to home.", fx: { motif: "anchor", pieces: ["b"] } },
    curse(4, (moves, api) =>
      moves.filter(
        (m) => m.piece !== "b" || (api.opp === "w" ? RANK(m.to) < 4 : RANK(m.to) >= 4),
      ),
    ),
  ),
  hex(
    { id: "seized_axles", tier: 3, name: "Seized Axles", description: "Your opponent's rooks cannot move sideways for their next 4 turns: they may only slide up and down their own file.", flavor: "The wheels only roll one way now.", fx: { motif: "anchor", pieces: ["r"] } },
    curse(4, (moves) => moves.filter((m) => m.piece !== "r" || FILE(m.from) === FILE(m.to))),
  ),
  hex(
    { id: "rusted_hinges", name: "Rusted Hinges", description: "Your opponent's rooks cannot capture for their next 4 turns.", tier: 3, fx: { motif: "muzzle", pieces: ["r"] } },
    curse(4, (moves) => moves.filter((m) => !(m.piece === "r" && m.captured))),
  ),
  H(
    { id: "blunted_lance", name: "Blunted Lance", description: "Your opponent's knights cannot land on any square defended by one of your pawns, for their next 4 turns.", flavor: "Lances splinter on a wall of pikes.", fx: { motif: "muzzle", pieces: ["n"] } },
    curse(4, (moves, api) =>
      moves.filter((m) => {
        if (m.piece !== "n") return true;
        // A square is pawn-defended if one of MY pawns sits a diagonal step
        // toward my own side of it (I am the opposite color of api.opp: a
        // white pawn on r-1 defends r, a black pawn on r+1 defends r).
        const r = RANK(m.to) + (api.opp === "w" ? 1 : -1);
        for (const df of [-1, 1]) {
          const f = FILE(m.to) + df;
          if (!inBoard(f, r)) continue;
          const p = api.board.pieces[SQ(f, r)];
          if (p && p.color !== api.opp && p.type === "p") return false;
        }
        return true;
      }),
    ),
  ),
  H(
    { id: "safe_passage", name: "Safe Passage", description: "The roads along the edge are under truce: for their next 4 turns your opponent cannot capture anything standing on the outer rim of the board. The first capture the truce would deny is allowed once.", flavor: "Even wars respect the coast road.", fx: { motif: "muzzle", pieces: "all" } },
    curseWithEscape(4, (moves) =>
      moves.filter((m) => {
        const cap = m.capturedSquare ?? (m.captured ? m.to : null);
        if (cap == null) return true;
        return !(FILE(cap) === 0 || FILE(cap) === 7 || RANK(cap) === 0 || RANK(cap) === 7);
      }),
    ),
  ),
  hex(
    { id: "stone_hooves", name: "Stone Hooves", description: "Petrify one of your opponent's knights for 3 of their turns: it can only shuffle one square at a time. Kings cannot be targeted.", tier: 3, flavor: "The cavalry sets like plaster." },
    walnutTarget(3, ["n"]),
  ),
  hex(
    { id: "gargoyles", name: "Gargoyles", description: "Petrify one of your opponent's bishops for 3 of their turns: it can only shuffle one square at a time.", tier: 3, flavor: "Perched, and quite forgotten." },
    walnutTarget(3, ["b"]),
  ),
  H(
    // Distinct from the plain 2-turn single freezes (evil_eye is the canonical
    // one): this stakes the target down first, then leaves it a heavy walnut as
    // it thaws. Freeze (cannot move at all) for 2 turns overlaps a walnut (can
    // only shuffle one square) that outlasts it by a turn, so on the third turn
    // the piece can crawl a single step but no further. A staggered 3-turn
    // lockdown that eases into a shuffle, not another bare freeze.
    { id: "pinned_down", name: "Pinned Down", description: "Choose one enemy piece, never the king. Starting after your opponent's next move it freezes for 2 of their turns, then stays a heavy walnut for 1 more turn, able only to shuffle a single square.", flavor: "Staked to the ground, then too heavy to lift." },
    activated(
      (inst, api, picks) =>
        inst.state.sq != null || picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy piece to pin down",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (inst, _api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.pending = true;
      },
      {
        // Delay activation: the pin lands only after the opponent's next move.
        spendOnUse: false,
        onMovePlayed: (inst, move, api) => {
          if (!inst.state.pending) return;
          // Follow the piece if the opponent moves it on this delayed turn.
          if (move.from === (inst.state.sq as Square)) inst.state.sq = move.to;
          if (move.color !== api.opp) return;
          const sq = inst.state.sq as Square;
          addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2 });
          addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 3 });
          inst.state.pending = false;
          inst.spent = true;
        },
      },
    ),
  ),
  H(
    { id: "cut_purse", name: "Cut Purse", description: "Steal one of your opponent's unspent cards of tier 1, then take a draft reroll. Locked-in upgrades stay put.", flavor: "A hand in every pocket." },
    grantRerollAfter(stealBuffs(1, 1, (b: BuffInstance) => b.state.sq == null && b.state.squares == null)),
  ),
  H(
    { id: "timid_king", name: "Timid King", description: "Your opponent's king cannot end a move beside any of your pieces, for their next 2 turns.", flavor: "He waves you forward from well behind.", fx: { motif: "muzzle", pieces: ["k"] } },
    curse(2, (moves, api) =>
      moves.filter((m) => {
        if (m.piece !== "k") return true;
        for (const df of [-1, 0, 1]) {
          for (const dr of [-1, 0, 1]) {
            if (df === 0 && dr === 0) continue;
            const f = FILE(m.to) + df, r = RANK(m.to) + dr;
            if (!inBoard(f, r)) continue;
            const p = api.board.pieces[SQ(f, r)];
            if (p && p.color !== api.opp) return false;
          }
        }
        return true;
      }),
    ),
  ),
  H(
    { id: "leaden_queen", name: "Leaden Queen", description: "Your opponent's queen can only capture at arm's length: for their next 3 turns her captures must be exactly one square away. The first capture the curse would deny is allowed once.", flavor: "Her gown is sewn with lead.", fx: { motif: "anchor", pieces: ["q"] } },
    curseWithEscape(3, (moves) =>
      moves.filter((m) => m.piece !== "q" || !m.captured || dist(m.from, m.to) <= 1),
    ),
  ),
  H(
    // Board already paints no_pawn_advance; fx carried for consistency.
    { id: "trench_line", name: "Trench Line", description: "Your opponent's pawns cannot advance for their next 2 turns. They may still capture diagonally.", flavor: "The infantry are pinned in the mud.", fx: { motif: "anchor", pieces: ["p"] } },
    instant((_inst, api) => {
      addEffect(api, { kind: "no_pawn_advance", against: api.opp, turns: 2 });
    }),
  ),
  H(
    // Board already paints barred squares; fx carried for consistency
    // (square-scoped, so no pieces field).
    { id: "no_mans_land", name: "No Man's Land", description: "Starting after your opponent's next move, they cannot enter the four center squares (d4, e4, d5, e5) for their next 3 turns.", flavor: "The middle of the board is scorched ground.", fx: { motif: "blindfold" } },
    afterOppMove((api) => {
      const squares = [SQ(3, 3), SQ(4, 3), SQ(3, 4), SQ(4, 4)];
      addEffect(api, { kind: "barred", squares, against: api.opp, turns: 3 });
    }),
  ),
  H(
    { id: "sealed_orders", name: "Sealed Orders", description: "Your opponent's next draft offer contains no draft-manipulation cards, and you take a draft reroll.", flavor: "The dispatch never reaches the tent." },
    grantRerollAfter(suppressDraftCards(1)),
  ),
];
