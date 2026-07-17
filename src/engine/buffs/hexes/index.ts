// Barrel for the expanded hex library. Each tier file exports one array of
// fully-implemented hexes (category "hex"); they are concatenated here and
// spread into ALL_BUFFS by library.ts. Existing hexes stay in library.ts; this
// module only adds new ones, so ids must not collide with the originals.

import { Buff } from "./shared";
import { HEXES_T1 } from "./tier1";
import { HEXES_T2 } from "./tier2";
import { HEXES_T3 } from "./tier3";
import { HEXES_T4 } from "./tier4";
import { HEXES_T5 } from "./tier5";
import { HEXES_T6 } from "./tier6";
import { HEXES_T7 } from "./tier7";
import { HEXES_T8 } from "./tier8";
import { HEX_WAVE2 } from "./wave2";
import { HEX_WAVE3 } from "./wave3";

export const NEW_HEXES: Buff[] = [
  ...HEX_WAVE2,
  ...HEX_WAVE3,
  ...HEXES_T1,
  ...HEXES_T2,
  ...HEXES_T3,
  ...HEXES_T4,
  ...HEXES_T5,
  ...HEXES_T6,
  ...HEXES_T7,
  ...HEXES_T8,
];
