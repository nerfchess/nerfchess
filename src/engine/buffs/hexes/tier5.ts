// Tier 5 (Brutal) hexes: heavy, multi-turn control curses on the opponent.
// Each card either petrifies a major piece for several turns, locks whole
// classes of pieces, freezes the entire enemy army briefly, strips a turn, or
// otherwise seizes real control. Spread across every piece target and every
// mechanic type (timed filters, petrify, freeze-all, barred squares, king-only,
// no-pawn-advance, draft denial, and a skip). Safety rails (kings never frozen
// or petrified, filters never soft-lock) come from the shared helpers.

import { Buff } from "./shared";
import {
  tierHexes,
  curse,
  walnutAll,
  walnutTarget,
  freezeAllEnemies,
  skipOpponent,
  nullifyDrafts,
  instant,
  activated,
  addEffect,
  mySquares,
  SQ,
} from "./shared";

const H = tierHexes(5);

export const HEXES_T5: Buff[] = [
  // --- petrify the queen (major piece, long) ------------------------------
  H(
    {
      id: "medusas_verdict",
      name: "Medusa's Verdict",
      description: "Your opponent's queen turns to a walnut for 3 of their turns: it can only shuffle one square at a time.",
      flavor: "The lady meets a colder gaze than her own.",
      // Board already paints walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["q"] },
    },
    walnutAll(["q"], 3),
  ),

  // --- petrify both rooks (long) ------------------------------------------
  H(
    {
      id: "granite_ramparts",
      name: "Granite Ramparts",
      description: "Your opponent's rooks turn to walnuts for 3 of their turns: a walnut can only shuffle one square at a time.",
      flavor: "The towers set into bedrock.",
      // Board already paints walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["r"] },
    },
    walnutAll(["r"], 3),
  ),

  // --- petrify both minors (knights and bishops) --------------------------
  H(
    {
      id: "stone_menagerie",
      name: "Stone Menagerie",
      description: "Petrify two enemy minor pieces you target (knights or bishops) for 3 of their turns.",
      flavor: "A gallery of statues where the cavalry stood.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        const chosen = picks.map((p) => p.square);
        return {
          kind: "square",
          label: "Choose an enemy minor to petrify",
          squares: mySquares(api.board, api.opp).filter((sq) => {
            const t = api.board.pieces[sq]!.type;
            return (t === "n" || t === "b") && !chosen.includes(sq);
          }),
        };
      },
      (_inst, api, picks) => {
        for (const pick of picks) {
          if (pick.square != null) {
            addEffect(api, { kind: "walnut", sq: pick.square, owner: api.opp, turns: 3 });
          }
        }
      },
    ),
  ),

  // --- petrify one targeted piece (any non-king, long) --------------------
  H(
    {
      id: "stone_curse",
      name: "Stone Curse",
      description: "Turn one enemy piece you target into a walnut for 4 of their turns: it can only shuffle one square at a time. Kings cannot be targeted.",
      flavor: "Chosen, cursed, and set in stone.",
    },
    walnutTarget(4),
  ),

  // --- freeze the entire enemy army for two turns -------------------------
  H(
    {
      id: "the_big_chill",
      name: "The Big Chill",
      description: "Freeze all of your opponent's pieces except their king for 2 of their turns.",
      flavor: "The whole board glazes over in a single night.",
      // Board already paints freezes; fx carried for consistency.
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    freezeAllEnemies(2),
  ),

  // --- king_only: only the king may move (one full turn) ------------------
  H(
    {
      id: "lone_sovereign",
      name: "Lone Sovereign",
      description: "On your opponent's next turn they may move only their king.",
      flavor: "The court abandons the crown to fend for itself.",
      // Board already paints king_only; fx carried for consistency.
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_only", against: api.opp, turns: 1 });
    }),
  ),

  // --- skip: opponent loses a whole turn ----------------------------------
  H(
    {
      id: "frozen_moment",
      name: "Frozen Moment",
      description: "Your opponent skips their next turn entirely.",
      flavor: "Time simply forgets to move them.",
      fx: { motif: "slow", pieces: "all" },
    },
    skipOpponent(1),
  ),

  // --- no_pawn_advance: pawns nailed down for five turns ------------------
  H(
    {
      id: "iron_furrow",
      name: "Iron Furrow",
      description: "Your opponent's pawns cannot advance for their next 5 turns. They may still capture diagonally.",
      flavor: "The whole front rank is spiked into the earth.",
      // Board already paints no_pawn_advance; fx carried for consistency.
      fx: { motif: "anchor", pieces: ["p"] },
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "no_pawn_advance", against: api.opp, turns: 5 });
    }),
  ),

  // --- timed filter: queen fully locked -----------------------------------
  H(
    {
      id: "throne_bound",
      name: "Throne Bound",
      description: "Your opponent cannot move their queen for their next 3 turns.",
      flavor: "The queen is chained to her own throne.",
      fx: { motif: "jail", pieces: ["q"] },
    },
    curse(3, (moves) => moves.filter((m) => m.piece !== "q")),
  ),

  // --- timed filter: no captures at all -----------------------------------
  H(
    {
      id: "palsied_hands",
      name: "Palsied Hands",
      description: "Your opponent cannot capture with any piece for their next 2 turns.",
      flavor: "Every hand in the army has gone numb.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    curse(2, (moves) => moves.filter((m) => !m.captured)),
  ),

  // --- timed filter: only pawns and the king may move ---------------------
  H(
    {
      id: "peasant_levy",
      name: "Peasant Levy",
      description: "Your opponent may move only their pawns and their king for their next 2 turns.",
      flavor: "The nobles have all fled; only the levy remains.",
      fx: { motif: "jail", pieces: ["n", "b", "r", "q"] },
    },
    curse(2, (moves) => moves.filter((m) => m.piece === "p" || m.piece === "k")),
  ),

  // --- barred: seal the two center ranks ----------------------------------
  H(
    {
      id: "scorched_middle",
      name: "Scorched Middle",
      description: "Your opponent cannot enter any square on the 4th or 5th ranks for their next 3 turns.",
      flavor: "The heart of the board is a wall of fire.",
      // Board already paints barred squares; square-scoped, no pieces field.
      fx: { motif: "blindfold" },
    },
    instant((_inst, api) => {
      const squares: number[] = [];
      for (let f = 0; f < 8; f++) {
        squares.push(SQ(f, 3), SQ(f, 4));
      }
      addEffect(api, { kind: "barred", squares, against: api.opp, turns: 3 });
    }),
  ),

  // --- draft denial: nullify the next two drafts --------------------------
  H(
    {
      id: "hexed_satchel",
      name: "Hexed Satchel",
      description: "Your opponent's next 2 drafted cards arrive nullified and do nothing.",
      flavor: "Every card they draw is already dead in the hand.",
    },
    nullifyDrafts(2),
  ),
];
