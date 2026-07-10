// Mystic set: CELESTIAL SIGNS. What the sky writes, the board obeys: a comet
// shard falling into your pocket (grantInventory), the north star revealing
// their burden (info flag), a solstice that lengthens your day (extraMoves),
// the zodiac wheel widening your next draft (draft flags), a ward of starlight
// (shieldArmy), a lunar eclipse that stills the enemy majors (walnutAll), and
// the grand alignment that transfixes the whole enemy court (freezeAllEnemies).
// Every card reuses an existing primitive and respects the rails: kings are
// never frozen or petrified, and no filter here can strand a player.

import { Buff } from "./shared";
import {
  card,
  extraMovesNow,
  freezeAllEnemies,
  grantInventory,
  instant,
  shieldArmy,
  walnutAll,
} from "./shared";

export const MYSTIC_CELESTIAL: Buff[] = [
  card(
    {
      id: "north_star",
      name: "North Star",
      description:
        "The fixed star turns its light on your rival: see your opponent's nerf for the rest of the game.",
      tier: 3,
      category: "info",
      boon: true,
      flavor: "Every traveler lies except the one that never moves.",
    },
    instant((_inst, api) => {
      api.mine.oppNerfRevealed = true;
    }),
  ),
  card(
    {
      id: "comet_shard",
      name: "Comet Shard",
      description:
        "A shard of a passing comet drops into your pocket as a bishop, trailing a fleck of star-iron as a pawn: drop them onto empty squares on later turns.",
      tier: 4,
      category: "pieces",
      flavor: "Wishes granted while supplies last.",
    },
    instant((_inst, api) => {
      grantInventory(api, "b", 1);
      grantInventory(api, "p", 1);
    }),
  ),
  card(
    {
      id: "solstice",
      name: "Solstice",
      description:
        "Free action: the longest day of the year grants you a second move this turn.",
      tier: 4,
      category: "tempo",
      flavor: "The sun lingers. So may you.",
    },
    extraMovesNow(1),
  ),
  card(
    {
      id: "zodiac_wheel",
      name: "Zodiac Wheel",
      description:
        "You read all twelve houses at once: your next draft shows three cards to pick from, and your bank offer improves by one tier.",
      tier: 4,
      category: "draft",
      flavor: "Mercury is in retrograde. Your rooks are in ascension.",
    },
    instant((_inst, api) => {
      api.mine.flags.prepThree = true;
      api.mine.flags.bankBonus = Math.min(1, (api.mine.flags.bankBonus ?? 0) + 1);
    }),
  ),
  card(
    {
      id: "starlight_ward",
      name: "Starlight Ward",
      description:
        "A veil of starlight settles over your army: none of your pieces can be captured for your opponent's next 2 turns.",
      tier: 5,
      category: "protection",
      flavor: "Light that left its star a thousand years ago, arriving exactly on time.",
      fx: { motif: "ward", pieces: "all", self: true },
    },
    shieldArmy(2),
  ),
  card(
    {
      id: "lunar_eclipse",
      name: "Lunar Eclipse",
      description:
        "The moon slides into shadow and the enemy's great powers still with it: your opponent's rooks and queen cannot move for 3 of their turns.",
      tier: 6,
      category: "hex",
      flavor: "Even the tide holds its breath.",
      fx: { motif: "jail", pieces: ["r", "q"] },
    },
    walnutAll(["r", "q"], 3),
  ),
  card(
    {
      id: "celestial_alignment",
      name: "Celestial Alignment",
      description:
        "The wandering stars fall into a single line and the enemy court stands transfixed: every enemy piece except the king is frozen for 2 of their turns.",
      tier: 8,
      category: "tempo",
      flavor: "Once a century, the sky agrees with you.",
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    freezeAllEnemies(2),
  ),
];
