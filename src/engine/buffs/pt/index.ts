// PT set: the "funny / creative" brainstorm batch (see Documents/pt.txt),
// built from ideas that reuse existing engine primitives. Split across three
// theme files; this barrel is what library.ts spreads into ALL_BUFFS.
import type { Buff } from "../../buff";
import { PT_TIME_CARDS } from "./timefaustian";
import { PT_PASSIVE_CARDS } from "./passives";
import { PT_CURSE_CARDS } from "./curseschaos";
import { PT_CASINO_CARDS } from "./casino";

export const PT_CARDS: Buff[] = [
  ...PT_TIME_CARDS,
  ...PT_PASSIVE_CARDS,
  ...PT_CURSE_CARDS,
  ...PT_CASINO_CARDS,
];
