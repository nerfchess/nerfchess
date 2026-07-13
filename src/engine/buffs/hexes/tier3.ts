// Tier 3 (Common) hexes: real but bounded curses on the opponent. Each is a
// small tempo edge or a short, single constraint, spread across every piece
// target and across mechanic types (timed filters, petrify, freeze, barred
// squares, king-only, no-pawn-advance, a draft block, and a skip).

import { Buff } from "./shared";
import {
  tierHexes,
  curse,
  walnutAll,
  freezeTarget,
  activated,
  instant,
  addEffect,
  mySquares,
  relRank,
  FILE,
  RANK,
  SQ,
} from "./shared";

const H = tierHexes(3);

/** Chebyshev (king-step) distance a move travels. */
const dist = (from: number, to: number) =>
  Math.max(Math.abs(FILE(to) - FILE(from)), Math.abs(RANK(to) - RANK(from)));

export const HEXES_T3: Buff[] = [
  // --- freeze: one targeted piece -----------------------------------------
  H(
    {
      id: "frostbite",
      name: "Frostbite",
      description: "Freeze one enemy piece you target for 3 of their turns. Kings cannot be targeted.",
      flavor: "The cold sinks into the joints.",
    },
    freezeTarget(3),
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

  // --- petrify all: knights -----------------------------------------------
  H(
    {
      id: "hobbled_cavalry",
      name: "Hobbled Cavalry",
      description: "Your opponent's knights turn to walnuts for 2 of their turns: a walnut can only shuffle one square at a time.",
      flavor: "The horses will not stir.",
      // Board already paints walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["n"] },
    },
    walnutAll(["n"], 2),
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
      description: "Turn one enemy rook you target into a walnut for 2 of their turns, and while the tower stands petrified your opponent cannot castle at all.",
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
        inst.state.turns = 2;
        addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 2 });
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

  // --- timed filter: rooks cannot move ------------------------------------
  H(
    {
      id: "anchored_rooks",
      name: "Anchored Rooks",
      description: "Your opponent cannot move their rooks for their next 2 turns.",
      flavor: "Chains bolt the towers to the floor.",
      fx: { motif: "jail", pieces: ["r"] },
    },
    curse(2, (moves) => moves.filter((m) => m.piece !== "r")),
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
  H(
    {
      id: "spooked_steeds",
      name: "Spooked Steeds",
      description: "Your opponent cannot move their knights for their next 2 turns.",
      flavor: "The horses shy at every shadow.",
      fx: { motif: "jail", pieces: ["n"] },
    },
    curse(2, (moves) => moves.filter((m) => m.piece !== "n")),
  ),

  // --- king_only: only the king may move (one turn) -----------------------
  H(
    {
      id: "royal_duty",
      name: "Royal Duty",
      description: "On your opponent's next turn they may move only their king.",
      flavor: "The crown must answer the summons alone.",
      // Board already paints king_only; fx carried for consistency.
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_only", against: api.opp, turns: 1 });
    }),
  ),

  // --- timed filter: one turn of pawn-or-king moves only --------------------
  H(
    {
      id: "wasted_hour",
      name: "Wasted Hour",
      description: "The officers argue all morning: on your opponent's next turn they may only move a pawn or their king.",
      flavor: "The whole camp oversleeps.",
      fx: { motif: "slow", pieces: ["n", "b", "r", "q"] },
    },
    curse(1, (moves) => moves.filter((m) => m.piece === "p" || m.piece === "k")),
  ),

  // --- timed filter: queen may never advance -------------------------------
  // Not a second Molasses (T1 clamps her slide to 3 squares): this is a
  // DIRECTION lock. She keeps her full range but can only slide sideways or
  // back toward home, never a single square toward you.
  H(
    { id: "leaden_crown", name: "Leaden Crown", description: "The crown is too heavy to march: for your opponent's next 4 turns their queen cannot move toward your side of the board. Sideways and homeward slides are free.", flavor: "The crown weighs heavy on the road to war.", fx: { motif: "anchor", pieces: ["q"] } },
    curse(4, (moves, api) =>
      moves.filter(
        (m) => m.piece !== "q" || relRank(api.opp, m.to) <= relRank(api.opp, m.from),
      ),
    ),
  ),

  // --- full pawn lock: salted ground roots the infantry in place ----------
  H(
    // Distinct from Pawn Nerf (crossref), which only blocks the pawn ADVANCE
    // and still lets pawns capture, for 3 turns. Salt is the heavier-per-turn
    // but shorter version: it freezes the enemy pawns COMPLETELY (no advance
    // and no capture) for 2 turns. curse() keeps the non-empty fallback so it
    // never soft-locks and ticks exactly the opponent's next 2 turns.
    { id: "sown_salt", name: "Sown Salt", description: "Your opponent's pawns are rooted in salted ground and cannot move at all, not even to capture, for their next 2 turns.", flavor: "Nothing grows in salted fields.", fx: { motif: "anchor", pieces: ["p"] } },
    curse(2, (moves) => moves.filter((m) => m.piece !== "p")),
  ),

  // --- timed filter: the center is a truce zone, no captures there ---------
  H(
    // Not a second No Man's Land (that BARS the center outright): pieces may
    // still cross and occupy the middle, they just cannot take anything there.
    { id: "no_trespass", name: "No Trespass", description: "A truce holds at the crossroads: your opponent cannot capture anything standing on the four center squares (d4, e4, d5, e5) for their next 5 turns.", fx: { motif: "muzzle", pieces: "all" } },
    curse(5, (moves) =>
      moves.filter((m) => {
        const cap = m.capturedSquare ?? (m.captured ? m.to : null);
        if (cap == null) return true;
        return ![SQ(3, 3), SQ(4, 3), SQ(3, 4), SQ(4, 4)].includes(cap);
      }),
    ),
  ),
];
