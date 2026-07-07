// Fantasy set: GODS & THE DIVINE. Interventions of higher powers: a warding of
// the crown (king_safe), a bolt of judgment that smites enemy pieces
// (removeEnemies), a resurrection of the fallen (reviveOne), a divine command
// that turns a foe to your side (convertEnemies), and a decree that pins the
// enemy court in place (king_only). Every effect reuses an existing primitive
// and respects the rails: kings are never removed, frozen, or converted.

import { Buff } from "./shared";
import {
  card,
  addEffect,
  removeEnemies,
  reviveOne,
  convertEnemies,
  instant,
  backRankZone,
} from "./shared";

export const FANTASY_DIVINE: Buff[] = [
  card(
    {
      id: "divine_intervention",
      name: "Divine Intervention",
      description:
        "A god cups a hand over your crown: your king cannot be captured for your opponent's next 2 turns.",
      tier: 6,
      category: "protection",
      flavor: "Not today, the heavens say.",
      fx: { motif: "ward", pieces: ["k"], self: true },
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_safe", owner: api.me, turns: 2 });
    }),
  ),
  card(
    {
      id: "judgment_day",
      name: "Judgment Day",
      description:
        "A pillar of holy light falls from a clear sky and smites one enemy knight, bishop, rook, or queen you name from the board.",
      tier: 6,
      category: "attack",
      flavor: "Weighed, measured, and found wanting.",
    },
    removeEnemies(1, ["n", "b", "r", "q"]),
  ),
  card(
    {
      id: "hallowed_return",
      name: "Hallowed Return",
      description:
        "A prayer is answered: one of your captured knights, bishops, or rooks is restored to life on an empty square of your back rank, once.",
      tier: 5,
      category: "pieces",
      flavor: "Called back from the far shore.",
    },
    reviveOne(["r", "b", "n"], backRankZone),
  ),
  card(
    {
      id: "divine_mandate",
      name: "Divine Mandate",
      description:
        "You speak with the authority of heaven: one enemy knight, bishop, or rook lays down its old allegiance and joins your army, once. Kings cannot be swayed.",
      tier: 6,
      category: "pieces",
      flavor: "Kneel, and rise ours.",
    },
    convertEnemies(1, ["n", "b", "r"], "Choose an enemy piece to command to your side"),
  ),
  card(
    {
      id: "divine_reckoning",
      name: "Divine Reckoning",
      description:
        "Judgment falls on the whole court: on your opponent's next turn they may move only their king.",
      tier: 6,
      category: "hex",
      flavor: "Every courtier is called to account at once.",
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_only", against: api.opp, turns: 1 });
    }),
  ),
  card(
    {
      id: "heavens_wrath",
      name: "Heaven's Wrath",
      description:
        "The sky splits and twin bolts of wrath descend: smite two enemy knights, bishops, rooks, or queens you name from the board.",
      tier: 8,
      category: "attack",
      flavor: "There is no shelter from a righteous storm.",
    },
    removeEnemies(2, ["n", "b", "r", "q"]),
  ),
];
