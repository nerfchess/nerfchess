// Mystic set: THE OCCULT. Spirit work and hidden power: a third eye that reads
// their hand (info flag), a seance calling a captured piece back (reviveOne),
// a hex doll that pins a piece in place (walnut), a chalk warding circle
// around your throne (king_safe), a ley line no enemy may cross (barLine), a
// spirit guide that walks beside you and departs (summonTemp), and a mirror
// that traps an enemy soul and turns it to your service (convertEnemies).
// Every card reuses an existing primitive and respects the rails: kings are
// never petrified, converted, or targeted, and nothing here can soft-lock.

import { Buff } from "./shared";
import {
  card,
  addEffect,
  barLine,
  convertEnemies,
  instant,
  myHalfZone,
  petrifyTarget,
  reviveOne,
  summonTemp,
} from "./shared";

export const MYSTIC_OCCULT: Buff[] = [
  card(
    {
      id: "third_eye",
      name: "Third Eye",
      description:
        "Your third eye opens: see your opponent's next card options before they pick.",
      tier: 2,
      category: "info",
      boon: true,
      flavor: "It does not blink. It does not need to.",
    },
    instant((_inst, api) => {
      api.mine.flags.seeOppCards = true;
    }),
  ),
  card(
    {
      id: "seance",
      name: "Seance",
      description:
        "The candles gutter and a familiar voice answers: one of your captured knights or bishops returns to an empty square in your half, once.",
      tier: 3,
      category: "pieces",
      flavor: "Is anyone there? Knock twice for check.",
    },
    reviveOne(["n", "b"], myHalfZone),
  ),
  card(
    {
      id: "hex_doll",
      name: "Hex Doll",
      description:
        "You bind a lock of horsehair to a little cloth doll and push in the pin: one enemy piece you choose cannot move for 3 of their turns. Kings cannot be bound.",
      tier: 4,
      category: "hex",
      flavor: "Do not ask where the hair came from.",
      fx: { motif: "jail", pieces: "all" },
    },
    petrifyTarget(3, "Choose the enemy piece the doll binds"),
  ),
  card(
    {
      id: "warding_circle",
      name: "Warding Circle",
      description:
        "You chalk a circle of old names around your throne: your king cannot be captured for your opponent's next 2 turns.",
      tier: 4,
      category: "protection",
      flavor: "Salt, chalk, and absolute confidence.",
      fx: { motif: "ward", pieces: ["k"], self: true },
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_safe", owner: api.me, turns: 2 });
    }),
  ),
  card(
    {
      id: "ley_line",
      name: "Ley Line",
      description:
        "You wake the old current sleeping under the board: pick any square and its entire file becomes impassable to your opponent for their next 3 turns.",
      tier: 5,
      category: "hex",
      flavor: "The land remembers its own roads.",
      fx: { motif: "blindfold" },
    },
    barLine("file", 3),
  ),
  card(
    {
      id: "spirit_guide",
      name: "Spirit Guide",
      description:
        "A patient spirit takes shape at your side: place a bishop on an empty square in your half. It crosses over after 5 of your turns.",
      tier: 5,
      category: "pieces",
      flavor: "It has walked this road before. It knows where the holes are.",
    },
    summonTemp("b", 5, myHalfZone),
  ),
  card(
    {
      id: "mirror_of_souls",
      name: "Mirror of Souls",
      description:
        "You catch an enemy piece's reflection and keep it: one enemy knight or bishop turns to your side. Kings cast no reflection.",
      tier: 6,
      category: "pieces",
      flavor: "The glass gives everything back except loyalty.",
    },
    convertEnemies(1, ["n", "b"], "Choose the enemy piece caught in the mirror"),
  ),
];
