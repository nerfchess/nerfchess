// Barrel for the "funny" card set. Each file exports one array of fully
// implemented cards that reuse existing engine primitives only; they are
// concatenated here and spread into ALL_BUFFS by library.ts (mirroring the
// NEW_HEXES barrel). Ids must not collide with any existing card.

import { Buff } from "./shared";
import { FUNNY_SLAPSTICK } from "./slapstick";
import { FUNNY_CURSES } from "./curses";
import { FUNNY_TRANSFORMS } from "./transforms";
import { FUNNY_SUMMONS } from "./summons";
import { FUNNY_CHAOS } from "./chaos";
import { FUNNY_CLOCK } from "./clock";
import { FUNNY_TRADEOFFS } from "./tradeoffs";
import { FUNNY_META } from "./meta";
import { FUNNY_EXPANSION } from "./expansion";

export const FUNNY_CARDS: Buff[] = [
  ...FUNNY_SLAPSTICK,
  ...FUNNY_CURSES,
  ...FUNNY_TRANSFORMS,
  ...FUNNY_SUMMONS,
  ...FUNNY_CHAOS,
  ...FUNNY_CLOCK,
  ...FUNNY_TRADEOFFS,
  ...FUNNY_META,
  ...FUNNY_EXPANSION,
];
