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
} from "./shared";

export const FANTASY_CURSES: Buff[] = [
  card(
    {
      id: "evil_eye",
      name: "Evil Eye",
      description:
        "One enemy piece you choose cannot move for 2 of their turns. Kings cannot be targeted.",
      tier: 2,
      category: "item",
      flavor: "It feels the stare and dares not move.",
    },
    freezeTarget(2, "charm"),
  ),
  card(
    {
      id: "shackle_the_queen",
      name: "Shackle the Queen",
      description:
        "Bind the enemy queen in cursed iron: your opponent cannot move their queen for their next 3 turns.",
      tier: 4,
      category: "hex",
      flavor: "Even a crown answers to a good enough chain.",
      fx: { motif: "jail", pieces: ["q"] },
    },
    curse(3, (moves) => moves.filter((m) => m.piece !== "q")),
  ),
  card(
    {
      id: "curse_of_frailty",
      name: "Curse of Frailty",
      description:
        "A wasting curse saps the enemy's strength: no piece of your opponent's may capture for their next 2 turns.",
      tier: 5,
      category: "hex",
      flavor: "Every sword arm goes soft as wax.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    curse(2, (moves) => moves.filter((m) => !m.captured)),
  ),
  card(
    {
      id: "doom_march",
      name: "Doom March",
      description:
        "A dread compulsion drives the enemy backward: for their next 3 turns every one of your opponent's pieces may only move toward or along its own back rank.",
      tier: 5,
      category: "hex",
      flavor: "One slow, unwilling retreat into the dark.",
      fx: { motif: "anchor", pieces: "all" },
    },
    curse(3, (moves, api) =>
      moves.filter((m) => relRank(api.opp, m.to) <= relRank(api.opp, m.from)),
    ),
  ),
  card(
    {
      id: "chains_of_binding",
      name: "Chains of Binding",
      description:
        "Spectral chains lock the enemy's towers: both of your opponent's rooks turn to dead stone and cannot move for 3 of their turns.",
      tier: 5,
      category: "hex",
      flavor: "The clank of iron, then perfect stillness.",
      fx: { motif: "jail", pieces: ["r"] },
    },
    walnutAll(["r"], 3),
  ),
  card(
    {
      id: "hex_of_stone",
      name: "Hex of Stone",
      description:
        "A creeping grey hex hardens the enemy's flanks: every one of your opponent's knights and bishops turns to stone for 3 of their turns.",
      tier: 7,
      category: "hex",
      flavor: "The cavalry and the clergy, all one quarry now.",
      fx: { motif: "jail", pieces: ["n", "b"] },
    },
    walnutAll(["n", "b"], 3),
  ),
];
