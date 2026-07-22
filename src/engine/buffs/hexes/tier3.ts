// Tier 3 (Common) hexes: real but bounded curses on the opponent. Each is a
// small tempo edge or a short, single constraint, spread across every piece
// target and across mechanic types (timed filters, petrify, freeze, barred
// squares, king-only, no-pawn-advance, a draft block, and a skip).

import { Buff } from "./shared";
import {
  hex,
  tierHexes,
  curse,
  activated,
  instant,
  addEffect,
  mySquares,
  relRank,
  tickTurns,
  turnsLeft,
  FILE,
  RANK,
  SQ,
} from "./shared";
import type { BuffApi, BuffInstance, Mech, Move, Square } from "./shared";

const H = tierHexes(3);

/** Chebyshev (king-step) distance a move travels. */
const dist = (from: number, to: number) =>
  Math.max(Math.abs(FILE(to) - FILE(from)), Math.abs(RANK(to) - RANK(from)));

/** Like curse(), but the constraint sleeps through the opponent's next move and
 * only starts filtering afterward, then runs for `turns` of their following
 * turns. The delay is one opponent move; the duration ticks on the opponent's
 * moves exactly as curse() does. */
function delayedCurse(
  turns: number,
  filter: (moves: Move[], api: BuffApi) => Move[],
): Mech {
  return {
    kind: "passive",
    init: (inst) => {
      inst.state.turns = turns;
      inst.state.delay = 1;
    },
    filterOpponentMoves: (moves, inst, api) => {
      if (((inst.state.delay as number) ?? 0) > 0) return moves;
      if (turnsLeft(inst) <= 0 || moves.length === 0) return moves;
      const kept = filter(moves, api);
      return kept.length > 0 ? kept : moves;
    },
    onMovePlayed: (inst, move, api) => {
      if (move.color !== api.opp) return;
      if (((inst.state.delay as number) ?? 0) > 0) {
        inst.state.delay = ((inst.state.delay as number) ?? 0) - 1;
        return;
      }
      tickTurns(inst, move, api.opp);
    },
    status: (inst) =>
      ((inst.state.delay as number) ?? 0) > 0
        ? "waiting for their next move"
        : `${turnsLeft(inst)} of their turns left`,
  };
}

/** Like instant(), but `effect` fires after the opponent's next move rather
 * than immediately on cast, then the card is spent. */
function delayedInstant(effect: (inst: BuffInstance, api: BuffApi) => void): Mech {
  return {
    kind: "passive",
    init: (inst) => {
      inst.state.delay = 1;
    },
    onMovePlayed: (inst, move, api) => {
      if (inst.state.fired || move.color !== api.opp) return;
      const d = ((inst.state.delay as number) ?? 0) - 1;
      inst.state.delay = d;
      if (d <= 0) {
        effect(inst, api);
        inst.state.fired = true;
        inst.spent = true;
      }
    },
    status: (inst) => (inst.state.fired ? null : "waiting for their next move"),
  };
}

export const HEXES_T3: Buff[] = [
  // --- freeze: one targeted piece, biting a turn late ----------------------
  H(
    {
      id: "frostbite",
      name: "Frostbite",
      description: "Target one enemy piece, kings excluded. The frost bites after your opponent's next move, following the piece if they move it, then freezes it for 3 of their turns.",
      flavor: "The cold sinks into the joints.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose an enemy piece to freeze",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.pending = true;
      },
      onMovePlayed: (inst, move, api) => {
        if (!inst.state.pending || move.color !== api.opp) return;
        // The delay elapses after this opponent move; follow the piece if it
        // was the one they moved, otherwise freeze it where it still stands.
        const sq = inst.state.sq as Square;
        const target = move.from === sq ? move.to : sq;
        addEffect(api, { kind: "freeze", sq: target, owner: api.opp, turns: 3 });
        inst.state.pending = false;
        inst.spent = true;
      },
      status: (inst) =>
        inst.state.sq == null
          ? "activate to choose a piece"
          : inst.state.pending
            ? "freezes after their next move"
            : "cast",
    },
  ),

  // --- petrify: one targeted minor, held longer the closer it wandered ------
  // Distinct from the fixed-type T2 singles (Stone Hooves / Gargoyles): the
  // gorgon sits on YOUR side of the board, so a minor caught in your half
  // meets the gaze up close and stays stone twice as long.
  H(
    {
      id: "gorgons_glance",
      name: "Gorgon's Glance",
      description: "Turn one enemy knight or bishop you target into a walnut: 2 of their turns if it stands in its own half, 4 if it was caught in yours, where the gaze is strongest.",
      flavor: "The closer they creep, the harder the stone sets.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy minor to petrify",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "n" || t === "b";
              }),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        // In MY half (their relative rank 5+): the gaze is close, 4 turns.
        const turns = relRank(api.opp, sq) >= 5 ? 4 : 2;
        addEffect(api, { kind: "walnut", sq, owner: api.opp, turns });
      },
    ),
  ),

  // --- petrify all: knights, taking hold a turn late -----------------------
  H(
    {
      id: "hobbled_cavalry",
      name: "Hobbled Cavalry",
      description: "After your opponent's next move, their knights turn to walnuts for their following 2 turns: a walnut can only shuffle one square at a time.",
      flavor: "The horses will not stir.",
      // Board already paints walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["n"] },
    },
    delayedInstant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        if (api.board.pieces[sq]!.type !== "n") continue;
        addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 2 });
      }
    }),
  ),

  // --- petrify: one targeted rook, and the stone tower forbids castling -----
  // Not a smaller Granite Towers (T4 petrifies ALL rooks): this one takes a
  // single rook AND carries a rider a walnut alone does not give you: castling
  // is a KING move, so a merely-petrified rook could still castle. While this
  // tower stands as stone, no castling of any kind is allowed.
  H(
    {
      id: "petrified_towers",
      name: "Petrified Towers",
      description: "Turn one enemy rook you target into a walnut for 1 of their turns, and while the tower stands petrified your opponent cannot castle at all.",
      flavor: "Stone towers do not roll, and no king shelters behind one.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose an enemy rook to petrify",
              squares: mySquares(api.board, api.opp, "r"),
            },
      effect: (inst, api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 1;
        addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 1 });
      },
      filterOpponentMoves: (moves, inst) => {
        if (inst.state.sq == null || ((inst.state.turns as number) ?? 0) <= 0) return moves;
        const kept = moves.filter((m) => !m.castle);
        // Safety net: never strand the opponent with zero moves.
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.state.sq == null) return;
        if (move.color === api.opp) {
          const t = ((inst.state.turns as number) ?? 0) - 1;
          inst.state.turns = t;
          if (t <= 0) inst.spent = true;
        }
      },
      status: (inst) =>
        inst.state.sq == null
          ? "activate to petrify a rook"
          : `${(inst.state.turns as number) ?? 0} of their turns left`,
    },
  ),

  // --- timed filter: rooks cannot move, starting a turn late ---------------
  H(
    {
      id: "anchored_rooks",
      name: "Anchored Rooks",
      description: "After your opponent's next move, they cannot move their rooks for their following 2 turns.",
      flavor: "Chains bolt the towers to the floor.",
      fx: { motif: "jail", pieces: ["r"] },
    },
    delayedCurse(2, (moves) => moves.filter((m) => m.piece !== "r")),
  ),

  // --- timed filter: bishops cannot move ----------------------------------
  H(
    {
      id: "blinkered_bishops",
      name: "Blinkered Bishops",
      description: "Your opponent cannot move their bishops for their next 2 turns.",
      flavor: "The clergy are shut in the vestry.",
      fx: { motif: "jail", pieces: ["b"] },
    },
    curse(2, (moves) => moves.filter((m) => m.piece !== "b")),
  ),

  // --- timed filter: knights cannot move ----------------------------------
  hex(
    {
      id: "spooked_steeds",
      name: "Spooked Steeds",
      description: "Your opponent cannot move their knights for their next 2 turns.",
      flavor: "The horses shy at every shadow.",
      fx: { motif: "jail", pieces: ["n"] },
      tier: 4,
    },
    curse(2, (moves) => moves.filter((m) => m.piece !== "n")),
  ),

  // --- king_only: only the king may move (one turn) -----------------------
  hex(
    {
      id: "royal_duty",
      name: "Royal Duty",
      description: "On your opponent's next turn they may move only their king.",
      flavor: "The crown must answer the summons alone.",
      // Board already paints king_only; fx carried for consistency.
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
      tier: 4,
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_only", against: api.opp, turns: 1 });
    }),
  ),

  // --- timed filter: one turn of pawn-or-king moves only, a turn late -------
  H(
    {
      id: "wasted_hour",
      name: "Wasted Hour",
      description: "The officers argue all morning: after your opponent's next move, on their following turn they may only move a pawn or their king.",
      flavor: "The whole camp oversleeps.",
      fx: { motif: "slow", pieces: ["n", "b", "r", "q"] },
    },
    delayedCurse(1, (moves) => moves.filter((m) => m.piece === "p" || m.piece === "k")),
  ),

  // --- timed filter: queen may never advance, starting a turn late ---------
  // Not a second Molasses (T1 clamps her slide to 3 squares): this is a
  // DIRECTION lock. She keeps her full range but can only slide sideways or
  // back toward home, never a single square toward you.
  H(
    { id: "leaden_crown", name: "Leaden Crown", description: "The crown is too heavy to march: after your opponent's next move, for their following 4 turns their queen cannot move toward your side of the board. Sideways and homeward slides are free.", flavor: "The crown weighs heavy on the road to war.", fx: { motif: "anchor", pieces: ["q"] } },
    delayedCurse(4, (moves, api) =>
      moves.filter(
        (m) => m.piece !== "q" || relRank(api.opp, m.to) <= relRank(api.opp, m.from),
      ),
    ),
  ),

  // --- full pawn lock: salted ground roots the infantry, one escape allowed -
  H(
    // Distinct from Pawn Nerf (crossref), which only blocks the pawn ADVANCE
    // and still lets pawns capture, for 3 turns. Salt is the heavier-per-turn
    // but shorter version: it freezes the enemy pawns COMPLETELY (no advance
    // and no capture) for 2 turns, except that the first pawn to move may make
    // one escape move before the salt takes full hold. The filter keeps the
    // non-empty fallback so it never soft-locks and ticks exactly the
    // opponent's next 2 turns.
    { id: "sown_salt", name: "Sown Salt", description: "Your opponent's pawns are rooted in salted ground for their next 2 turns and cannot move, not even to capture, except that the first pawn to move may take one escape move, after which every pawn is locked.", flavor: "Nothing grows in salted fields.", fx: { motif: "anchor", pieces: ["p"] } },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 2;
      },
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0) return moves;
        // Before the escape is spent, one pawn may still move; the first pawn
        // move consumes the escape and locks every pawn thereafter.
        if (!inst.state.escapeUsed) return moves;
        const kept = moves.filter((m) => m.piece !== "p");
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        if (!inst.state.escapeUsed && move.piece === "p") inst.state.escapeUsed = true;
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        turnsLeft(inst) <= 0
          ? null
          : inst.state.escapeUsed
            ? `${turnsLeft(inst)} of their turns left`
            : `${turnsLeft(inst)} of their turns left, one pawn may still escape`,
    },
  ),

  // --- timed filter: the center is a truce zone, no captures there ---------
  H(
    // Not a second No Man's Land (that BARS the center outright): pieces may
    // still cross and occupy the middle, they just cannot take anything there.
    { id: "no_trespass", name: "No Trespass", description: "A truce holds at the crossroads: after your opponent's next move, they cannot capture anything standing on the four center squares (d4, e4, d5, e5) for their following 5 turns.", fx: { motif: "muzzle", pieces: "all" } },
    delayedCurse(5, (moves) =>
      moves.filter((m) => {
        const cap = m.capturedSquare ?? (m.captured ? m.to : null);
        if (cap == null) return true;
        return ![SQ(3, 3), SQ(4, 3), SQ(3, 4), SQ(4, 4)].includes(cap);
      }),
    ),
  ),
];
