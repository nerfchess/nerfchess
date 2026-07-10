// Barrel for the "fantasy" card set: an epic high-fantasy batch (dragons and
// beasts, gods and the divine, necromancy and undeath, elements and cataclysm,
// mythic artifacts, curses and dark magic, summoning, legendary
// transformations) where every card reuses primitives that already exist in the
// engine. Each themed file exports one array of fully implemented cards; they
// are concatenated here and spread into ALL_BUFFS by library.ts, mirroring the
// FUNNY_CARDS and NEW_HEXES barrels. Ids must not collide with any existing
// card.

import { Buff } from "./shared";
import { FANTASY_BEASTS } from "./beasts";
import { FANTASY_DIVINE } from "./divine";
import { FANTASY_NECROMANCY } from "./necromancy";
import { FANTASY_ELEMENTS } from "./elements";
import { FANTASY_ARTIFACTS } from "./artifacts";
import { FANTASY_CURSES } from "./curses";
import { FANTASY_TRANSFORMS } from "./transforms";
import { FANTASY_SUMMONS } from "./summons";
import { FANTASY_FEY } from "./fey";
import { FANTASY_LEGENDS } from "./legends";

export const FANTASY_CARDS: Buff[] = [
  ...FANTASY_BEASTS,
  ...FANTASY_DIVINE,
  ...FANTASY_NECROMANCY,
  ...FANTASY_ELEMENTS,
  ...FANTASY_ARTIFACTS,
  ...FANTASY_CURSES,
  ...FANTASY_TRANSFORMS,
  ...FANTASY_SUMMONS,
  ...FANTASY_FEY,
  ...FANTASY_LEGENDS,
];
