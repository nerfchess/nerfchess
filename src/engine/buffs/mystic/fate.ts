// Mystic set: FATE & PROPHECY. The cards that read the cards: an oracle's eye
// on the enemy draft (info flag), snipped threads that steal a turn
// (skipOpponent), stars fixing your next draft's tier (forceTier), the Tower
// toppling their next draft outright (blockedDrafts), the Death arcana claiming
// one piece (removeEnemies), and the Grand Conjunction, a once-an-age apex
// alignment (freezeAllEnemies + shieldArmy) flagged special so it never enters
// a normal draft. Every card reuses an existing primitive; kings are never
// removed or frozen, and nothing here can soft-lock a turn.

import { Buff } from "./shared";
import {
  card,
  addEffect,
  instant,
  mySquares,
  removeEnemies,
  skipOpponent,
} from "./shared";

export const MYSTIC_FATE: Buff[] = [
  card(
    {
      id: "oracles_eye",
      name: "Oracle's Eye",
      description:
        "The oracle inhales the vapors and names a number: see the tier of your opponent's next draft.",
      tier: 2,
      category: "info",
      boon: true,
      flavor: "The future is blurry. The price list is not.",
    },
    instant((_inst, api) => {
      api.mine.flags.seeOppTier = true;
    }),
  ),
  card(
    {
      id: "threads_of_fate",
      name: "Threads of Fate",
      description:
        "You find your opponent's thread on the loom and snip one stitch: they skip their next turn.",
      tier: 5,
      category: "tempo",
      flavor: "The Fates do not take requests. You did not ask.",
    },
    skipOpponent(1),
  ),
  card(
    {
      id: "favorable_stars",
      name: "Favorable Stars",
      description:
        "You cast your chart and the houses agree: your next draft is fated to offer tier 6 cards.",
      tier: 5,
      category: "draft",
      flavor: "Born under a good sign, drafting under a better one.",
    },
    instant((_inst, api) => {
      api.mine.flags.forceTier = 6;
    }),
  ),
  card(
    {
      id: "the_tower",
      name: "The Tower",
      description:
        "You deal your opponent the worst card in the deck: their next card draft crumbles and is skipped entirely.",
      tier: 5,
      category: "draft",
      flavor: "Upright: ruin. Reversed: also ruin.",
    },
    instant((_inst, api) => {
      api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + 1;
    }),
  ),
  card(
    {
      id: "death_arcana",
      name: "The Death Arcana",
      description:
        "The thirteenth card turns face up: name one enemy knight, bishop, rook, or queen and its story ends here.",
      tier: 6,
      category: "attack",
      flavor: "It does not mean change this time. It means exactly what it shows.",
    },
    removeEnemies(1, ["n", "b", "r", "q"]),
  ),
  card(
    {
      id: "grand_conjunction",
      name: "Grand Conjunction",
      description:
        "Every sign, sphere, and spirit aligns at once: all enemy pieces except the king are frozen for 2 of their turns, and none of your pieces can be captured for your opponent's next 2 turns.",
      tier: 9,
      special: true,
      category: "tempo",
      flavor: "The astronomers wept. The astrologers said told you so.",
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    // freezeAllEnemies(2) and shieldArmy(2) fused into one instant, exactly
    // like Aegis of the Ages fuses an army shield with king_safe.
    instant((_inst, api) => {
      for (const sq of mySquares(api.board, api.opp)) {
        if (api.board.pieces[sq]!.type === "k") continue;
        addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2 });
      }
      addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 2 });
    }),
  ),
];
