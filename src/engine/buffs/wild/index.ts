// Barrel for the "wild" card set: themed files of fully implemented cards that
// reuse existing engine primitives only. Concatenated here and spread into
// ALL_BUFFS by library.ts, mirroring the FUNNY_CARDS / FANTASY_CARDS barrels.
// Ids are namespaced by prefix (we_ / ww_ / wa_ / wc_) so none collide with an
// existing card.
import { Buff } from "../../buff";
import { WILD_ELEMENTAL } from "./elemental";
import { WILD_WARFARE } from "./warfare";
import { WILD_ARCANE } from "./arcane";
import { WILD_CHAOS } from "./chaos";

export const WILD_CARDS: Buff[] = [
  ...WILD_ELEMENTAL,
  ...WILD_WARFARE,
  ...WILD_ARCANE,
  ...WILD_CHAOS,
];
