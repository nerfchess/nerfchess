// Tier 1 (Trivial) hexes: short, single-restriction curses on the opponent,
// each easily worked around and carrying no material swing. This file is the
// authoring template for the other tiers: import only from ./shared, one card
// per `hex(...)`, and lean on `curse`/`walnutTarget`/etc. so the safety rails
// (kings never frozen, filters never soft-lock) come for free.

import { Buff, BuffApi, Mech, Move } from "./shared";
import { tierHexes, hex, curse, mySquares, relRank, tickTurns, turnsLeft, FILE, RANK } from "./shared";

const H = tierHexes(1);

/** Chebyshev (king-step) distance a move travels. */
const dist = (from: number, to: number) =>
  Math.max(Math.abs(FILE(to) - FILE(from)), Math.abs(RANK(to) - RANK(from)));

/** Is a square on the board's rim (a/h file or 1/8 rank)? */
const onRim = (sq: number) =>
  FILE(sq) === 0 || FILE(sq) === 7 || RANK(sq) === 0 || RANK(sq) === 7;

// A curse that grants the first affected piece one escape: while the escape is
// unused the restriction is off, so the first otherwise-forbidden move they play
// slips through; from then on `pred` (a per-move KEEP test) is enforced for the
// rest of the duration. The timer still ticks every one of their turns, so the
// duration is preserved. `pred` reads only move fields, since it is re-checked
// in onMovePlayed after the move is applied. (Mirrors wave4's escapeCurse.)
function escapeCurse(turns: number, pred: (m: Move) => boolean): Mech {
  return {
    kind: "passive",
    init: (inst) => {
      inst.state.turns = turns;
      inst.state.escaped = false;
    },
    filterOpponentMoves: (moves, inst) => {
      if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
      if (!inst.state.escaped) return moves;
      const kept = moves.filter((m) => pred(m));
      return kept.length > 0 ? kept : moves;
    },
    onMovePlayed: (inst, move, api) => {
      if (move.color === api.opp && turnsLeft(inst) > 0 && !inst.state.escaped && !pred(move)) {
        inst.state.escaped = true;
      }
      tickTurns(inst, move, api.opp);
    },
    status: (inst) =>
      !inst.state.escaped ? "one escape move remains" : `${turnsLeft(inst)} of their turns left`,
  };
}

// A curse whose restriction starts one opponent move late: the first of their
// moves passes unrestricted, then `filter` runs for the next `turns` of their
// turns (the duration is preserved, just shifted). Mirrors wave4's delayedCurse.
function delayedCurse(turns: number, filter: (moves: Move[]) => Move[]): Mech {
  return {
    kind: "passive",
    init: (inst) => {
      inst.state.turns = turns;
      inst.state.delay = 1;
    },
    filterOpponentMoves: (moves, inst) => {
      if ((inst.state.delay as number) > 0 || turnsLeft(inst) <= 0 || moves.length === 0) return moves;
      const kept = filter(moves);
      return kept.length > 0 ? kept : moves;
    },
    onMovePlayed: (inst, move, api) => {
      if (move.color === api.opp && (inst.state.delay as number) > 0) {
        inst.state.delay = (inst.state.delay as number) - 1;
        return;
      }
      tickTurns(inst, move, api.opp);
    },
    status: (inst) =>
      (inst.state.delay as number) > 0 ? "not yet in effect" : `${turnsLeft(inst)} of their turns left`,
  };
}

/** Does the opponent hold a pawn poised on its relative 7th rank (one step from
 * promotion)? Used by Promotion Anxiety to detect a promotion held back. */
const poisedToPromote = (api: BuffApi) =>
  mySquares(api.board, api.opp, "p").some((sq) => relRank(api.opp, sq) === 7);

export const HEXES_T1: Buff[] = [
  H(
    { id: "cold_feet", name: "Cold Feet", description: "Starting after your opponent's next move, their pawns cannot capture for their following 3 turns.", flavor: "The infantry lose their nerve.", fx: { motif: "muzzle", pieces: ["p"] } },
    delayedCurse(3, (moves) => moves.filter((m) => !(m.piece === "p" && m.captured))),
  ),
  H(
    { id: "slippery_grip", name: "Slippery Grip", description: "Starting after your opponent's next move, their rooks slide at most 3 squares for their following 4 turns.", flavor: "Buttered the tower floors.", fx: { motif: "anchor", pieces: ["r"] } },
    delayedCurse(4, (moves) => moves.filter((m) => m.piece !== "r" || dist(m.from, m.to) <= 3)),
  ),
  H(
    { id: "foggy_glasses", name: "Foggy Glasses", description: "Starting after your opponent's next move, their bishops cannot capture for their following 3 turns.", flavor: "Can't hit what you can't see.", fx: { motif: "muzzle", pieces: ["b"] } },
    delayedCurse(3, (moves) => moves.filter((m) => !(m.piece === "b" && m.captured))),
  ),
  H(
    { id: "knock_knees", name: "Knock Knees", description: "Your opponent's knights cannot land on the rim for their next 3 turns.", flavor: "The horses fear the edge of the world.", fx: { motif: "anchor", pieces: ["n"] } },
    curse(3, (moves) => moves.filter((m) => !(m.piece === "n" && onRim(m.to)))),
  ),
  H(
    { id: "molasses", name: "Molasses", description: "Your opponent's queen slides at most 3 squares for their next 3 turns, though it may make one longer move to escape.", flavor: "Slow going, your majesty.", fx: { motif: "anchor", pieces: ["q"] } },
    escapeCurse(3, (m) => m.piece !== "q" || dist(m.from, m.to) <= 3),
  ),
  H(
    { id: "drawbridge", name: "Drawbridge", description: "Your opponent cannot castle for their next 6 turns, though their first castling attempt slips through as one escape.", flavor: "Someone raised it and lost the crank.", fx: { motif: "slow", pieces: ["k", "r"] } },
    escapeCurse(6, (m) => !m.castle),
  ),
  H(
    { id: "stage_fright", name: "Promotion Anxiety", description: "Your opponent's first pawn promotion within their next 4 turns is held back one of their turns; the poised pawn stays on its seventh rank. Promotions after the first go through.", flavor: "The understudy freezes at the footlights.", fx: { motif: "slow", pieces: ["p"] } },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 4;
        inst.state.armed = true;
        inst.state.poised = poisedToPromote(api);
      },
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0 || !inst.state.armed || moves.length === 0) return moves;
        const kept = moves.filter((m) => !m.promotion);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp || turnsLeft(inst) <= 0) return;
        // The block bit this turn only if a pawn was already poised on the 7th
        // at the turn's start: that is the one promotion we delay.
        if (inst.state.armed && inst.state.poised) inst.state.armed = false;
        inst.state.poised = poisedToPromote(api);
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        inst.state.armed
          ? `holding one promotion, ${turnsLeft(inst)} of their turns left`
          : "spent",
    },
  ),
  H(
    { id: "butterfingers", name: "Butterfingers", description: "Your opponent's queen cannot capture for their next 2 turns.", flavor: "Everything she grabs squirts free.", fx: { motif: "muzzle", pieces: ["q"] } },
    curse(2, (moves) => moves.filter((m) => !(m.piece === "q" && m.captured))),
  ),
  H(
    { id: "stiff_joints", name: "Stiff Joints", description: "Your opponent's queen cannot move diagonally for their next 3 turns, though it may make one diagonal move to escape.", flavor: "Sideways or forward. Pick one.", fx: { motif: "anchor", pieces: ["q"] } },
    escapeCurse(
      3,
      (m) =>
        m.piece !== "q" ||
        FILE(m.to) === FILE(m.from) ||
        RANK(m.to) === RANK(m.from),
    ),
  ),
  hex(
    { id: "crossed_wires", name: "Crossed Wires", tier: 2, description: "Your opponent's knights cannot capture for their next 2 turns.", flavor: "The cavalry charges the wrong hill.", fx: { motif: "muzzle", pieces: ["n"] } },
    curse(2, (moves) => moves.filter((m) => !(m.piece === "n" && m.captured))),
  ),
  H(
    { id: "cold_open", name: "Cold Open", description: "Your opponent cannot move their queen for their next turn.", flavor: "The lady sits this one out.", fx: { motif: "jail", pieces: ["q"] } },
    curse(1, (moves) => moves.filter((m) => m.piece !== "q")),
  ),
  H(
    { id: "royal_restraint", name: "Royal Restraint", description: "Your opponent's king cannot capture for their next 4 turns, though it may make one capture to escape.", flavor: "The crown does not stoop to brawling.", fx: { motif: "muzzle", pieces: ["k"] } },
    escapeCurse(4, (m) => !(m.piece === "k" && m.captured)),
  ),
];
