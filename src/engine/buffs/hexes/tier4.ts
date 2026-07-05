// Tier 4 (Severe) hexes: heavy curses on the opponent. Each one shapes several
// of their turns or takes a whole piece off the board for a while: petrify a
// class of pieces for 3 turns, freeze a targeted piece for 4, bar a whole file,
// force king-only turns, stall every pawn, or gut a draft. Spread across every
// piece target and across mechanic types (timed filter, petrify, freeze, barred
// squares, king-only, no-pawn-advance, draft denial, skip).

import { Buff } from "./shared";
import {
  tierHexes,
  curse,
  walnutAll,
  walnutTarget,
  freezeTarget,
  skipOpponent,
  instant,
  activated,
  addEffect,
  mySquares,
  SQ,
} from "./shared";

const H = tierHexes(4);

export const HEXES_T4: Buff[] = [
  // --- petrify all: rooks for 3 turns -------------------------------------
  H(
    {
      id: "granite_towers",
      name: "Granite Towers",
      description: "Your opponent's rooks turn to walnuts and cannot move for 3 of their turns.",
      flavor: "The towers set hard as granite.",
    },
    walnutAll(["r"], 3),
  ),

  // --- petrify all: bishops for 3 turns -----------------------------------
  H(
    {
      id: "stone_clergy",
      name: "Stone Clergy",
      description: "Your opponent's bishops turn to walnuts and cannot move for 3 of their turns.",
      flavor: "The clergy are carved into the pews.",
    },
    walnutAll(["b"], 3),
  ),

  // --- petrify all: knights for 3 turns -----------------------------------
  H(
    {
      id: "statue_stable",
      name: "Statue Stable",
      description: "Your opponent's knights turn to walnuts and cannot move for 3 of their turns.",
      flavor: "Bronze horses, bolted to their plinths.",
    },
    walnutAll(["n"], 3),
  ),

  // --- petrify: one targeted queen for 3 turns ----------------------------
  H(
    {
      id: "medusas_stare",
      name: "Medusa's Stare",
      description: "Turn one enemy queen you target into a walnut so it cannot move for 3 of their turns.",
      flavor: "Even majesty turns to stone under that gaze.",
    },
    walnutTarget(3, ["q"]),
  ),

  // --- freeze: one targeted piece for 4 turns -----------------------------
  H(
    {
      id: "cryostasis",
      name: "Cryostasis",
      description: "Freeze one enemy piece you target so it cannot move for 4 of their turns. Kings cannot be targeted.",
      flavor: "Locked solid in a block of ice.",
    },
    freezeTarget(4),
  ),

  // --- freeze: two targeted enemy pieces for 2 turns ----------------------
  H(
    {
      id: "hard_frost",
      name: "Hard Frost",
      description: "Freeze two enemy pieces you target so they cannot move for 2 of their turns. Kings cannot be targeted.",
      flavor: "The whole army rimed white overnight.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length >= 2) return null;
        const chosen = picks.map((p) => p.square);
        return {
          kind: "square",
          label: "Choose an enemy piece to freeze",
          squares: mySquares(api.board, api.opp).filter(
            (sq) => api.board.pieces[sq]!.type !== "k" && !chosen.includes(sq),
          ),
        };
      },
      (_inst, api, picks) => {
        for (const pick of picks) {
          if (pick.square != null) {
            addEffect(api, { kind: "freeze", sq: pick.square, owner: api.opp, turns: 2 });
          }
        }
      },
    ),
  ),

  // --- barred: seal a whole file for 3 turns ------------------------------
  H(
    {
      id: "sealed_gate",
      name: "Sealed Gate",
      description: "Your opponent cannot move any piece onto the entire e-file for their next 3 turns.",
      flavor: "The central gate is bricked shut.",
    },
    instant((_inst, api) => {
      const squares = [
        SQ(4, 0), SQ(4, 1), SQ(4, 2), SQ(4, 3),
        SQ(4, 4), SQ(4, 5), SQ(4, 6), SQ(4, 7),
      ];
      addEffect(api, { kind: "barred", squares, against: api.opp, turns: 3 });
    }),
  ),

  // --- king_only: only the king may move for one turn ---------------------
  H(
    {
      id: "abandoned_post",
      name: "Abandoned Post",
      description: "On your opponent's next turn they may move only their king.",
      flavor: "The ranks desert and leave the crown alone.",
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_only", against: api.opp, turns: 1 });
    }),
  ),

  // --- no_pawn_advance: pawns pinned for 3 turns --------------------------
  H(
    {
      id: "frozen_furrows",
      name: "Frozen Furrows",
      description: "Your opponent's pawns cannot advance for their next 3 turns.",
      flavor: "The fields freeze over and nothing moves forward.",
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "no_pawn_advance", against: api.opp, turns: 3 });
    }),
  ),

  // --- draft denial: block one draft and nullify the next -----------------
  H(
    {
      id: "burned_dispatches",
      name: "Burned Dispatches",
      description: "Your opponent's next draft is skipped outright, and the draft after that arrives nullified and inert.",
      flavor: "Two orders lost: one to the fire, one to the smudge.",
    },
    instant((_inst, api) => {
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
      api.theirs.flags.nullifyIncoming = (api.theirs.flags.nullifyIncoming ?? 0) + 1;
    }),
  ),

  // --- skip: opponent loses two turns -------------------------------------
  H(
    {
      id: "lost_weekend",
      name: "Lost Weekend",
      description: "Your opponent skips their next turn.",
      flavor: "A whole day gone and no one recalls it.",
    },
    skipOpponent(1),
  ),

  // --- petrify: one targeted rook for 3 turns -----------------------------
  H(
    {
      id: "ironbound_rook",
      name: "Ironbound Rook",
      description: "Turn one enemy rook you target into a walnut so it cannot move for 3 of their turns.",
      flavor: "Banded and bolted, the tower will not budge.",
    },
    walnutTarget(3, ["r"]),
  ),

  // --- timed filter: neither rook nor queen may move for 2 turns ----------
  H(
    {
      id: "heavy_shackles",
      name: "Heavy Shackles",
      description: "Your opponent cannot move their queen or their rooks for their next 2 turns.",
      flavor: "The heavy pieces are all in irons.",
    },
    curse(2, (moves) => moves.filter((m) => m.piece !== "q" && m.piece !== "r")),
  ),
];
