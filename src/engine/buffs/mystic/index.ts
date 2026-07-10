// Barrel for the "mystic" card set: prophecy and fate, star signs and moon
// phases, tarot, spirits, and ley lines, where every card reuses primitives
// that already exist in the engine. Each themed file exports one array of
// fully implemented cards; they are concatenated here and spread into
// ALL_BUFFS by library.ts, mirroring the FANTASY_CARDS and FUNNY_CARDS
// barrels. Ids must not collide with any existing card.

import { Buff } from "./shared";
import { MYSTIC_CELESTIAL } from "./celestial";
import { MYSTIC_OCCULT } from "./occult";
import { MYSTIC_FATE } from "./fate";

export const MYSTIC_CARDS: Buff[] = [
  ...MYSTIC_CELESTIAL,
  ...MYSTIC_OCCULT,
  ...MYSTIC_FATE,
];
