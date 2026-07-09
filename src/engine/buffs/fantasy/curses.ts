// Fantasy set: CURSES & DARK MAGIC. Malevolent enchantments laid on the enemy.
// Most are timed opponent-move filters built on the shared `curse` helper,
// which guarantees the filter is partial (if a curse would leave the opponent
// with zero moves it falls back to the full move list), plus a couple of mass
// petrifications (walnutAll) and a single freeze. Nothing here can soft-lock a
// turn, and the petrify helpers never touch a king.

import { Buff } from "./shared";
import {
  card,
  curse,
  walnutAll,
  freezeTarget,
  relRank,
  mySquares,
  addEffect,
  turnsLeft,
  tickTurns,
  FILE,
  RANK,
} from "./shared";

export const FANTASY_CURSES: Buff[] = [
  card(
    {
      id: "evil_eye",
      icon: "EyeOff",
      name: "Evil Eye",
      description:
        "One enemy piece you choose cannot move for 3 of their turns. Kings cannot be targeted.",
      tier: 2,
      category: "item",
      flavor: "It feels the stare and dares not move.",
    },
    freezeTarget(3, "charm"),
  ),
  card(
    {
      id: "shackle_the_queen",
      icon: "Lock",
      name: "Shackle the Queen",
      description:
        "Bind the enemy queen in cursed iron: your opponent cannot move their queen for their next 4 turns.",
      tier: 4,
      category: "hex",
      flavor: "Even a crown answers to a good enough chain.",
      fx: { motif: "jail", pieces: ["q"] },
    },
    curse(4, (moves) => moves.filter((m) => m.piece !== "q")),
  ),
  card(
    {
      id: "curse_of_frailty",
      icon: "HeartPulse",
      name: "Curse of Frailty",
      description:
        "A wasting curse saps the enemy's strength: for their next 3 turns your opponent cannot capture, and no piece of theirs may slide more than two squares.",
      tier: 5,
      category: "hex",
      flavor: "Every sword arm goes soft as wax.",
      fx: { motif: "anchor", pieces: "all" },
    },
    curse(3, (moves) =>
      moves.filter((m) => {
        if (m.captured) return false;
        const dist = Math.max(
          Math.abs(FILE(m.to) - FILE(m.from)),
          Math.abs(RANK(m.to) - RANK(m.from)),
        );
        return dist <= 2;
      }),
    ),
  ),
  card(
    {
      id: "doom_march",
      icon: "Footprints",
      name: "Doom March",
      description:
        "A dread compulsion drives the enemy backward: for their next 4 turns every one of your opponent's pieces may only move toward or along its own back rank.",
      tier: 5,
      category: "hex",
      flavor: "One slow, unwilling retreat into the dark.",
      fx: { motif: "anchor", pieces: "all" },
    },
    curse(4, (moves, api) =>
      moves.filter((m) => relRank(api.opp, m.to) <= relRank(api.opp, m.from)),
    ),
  ),
  card(
    {
      id: "chains_of_binding",
      icon: "Anchor",
      name: "Chains of Binding",
      description:
        "Spectral chains lock the enemy's towers: both of your opponent's rooks turn to dead stone and cannot move for 4 of their turns.",
      tier: 5,
      category: "hex",
      flavor: "The clank of iron, then perfect stillness.",
      fx: { motif: "jail", pieces: ["r"] },
    },
    walnutAll(["r"], 4),
  ),
  card(
    {
      id: "hex_of_stone",
      icon: "Mountain",
      name: "Hex of Stone",
      description:
        "A creeping grey hex hardens the enemy's flanks: every one of your opponent's knights and bishops turns to a walnut for 4 of their turns, and for those 4 turns their rooks and queen may slide no more than two squares.",
      tier: 7,
      category: "hex",
      flavor: "The cavalry and the clergy, all one quarry now.",
      fx: { motif: "jail", pieces: ["n", "b"] },
    },
    {
      kind: "passive",
      // Petrify the minors for 4 turns, once, and open a 4-turn clamp window.
      init: (inst, api) => {
        inst.state.turns = 4;
        for (const sq of mySquares(api.board, api.opp)) {
          const t = api.board.pieces[sq]!.type;
          if (t === "n" || t === "b") {
            addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 4 });
          }
        }
      },
      // While the window runs, heavy pieces move like leaden things: a rook or
      // queen may cover at most two squares. Never empties the move list.
      filterOpponentMoves: (moves, inst) => {
        if (turnsLeft(inst) <= 0) return moves;
        const kept = moves.filter((m) => {
          if (m.piece !== "r" && m.piece !== "q") return true;
          const dist = Math.max(
            Math.abs(FILE(m.to) - FILE(m.from)),
            Math.abs(RANK(m.to) - RANK(m.from)),
          );
          return dist <= 2;
        });
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => tickTurns(inst, move, api.opp),
      status: (inst) => `${turnsLeft(inst)} of their turns left`,
    },
  ),
];
