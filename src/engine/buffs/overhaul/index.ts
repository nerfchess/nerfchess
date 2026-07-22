// Overhaul roster barrel: the 224 owner-approved buffs (25 per tier, tiers
// 1-8, plus 3 gambling cards per tier). Contract: docs/overhaul-roster.md.

import type { Buff } from "../../buff";
import { OVERHAUL_T1 } from "./t1";
import { OVERHAUL_T2 } from "./t2";
import { OVERHAUL_T3 } from "./t3";
import { OVERHAUL_T4 } from "./t4";
import { OVERHAUL_T5 } from "./t5";
import { OVERHAUL_T6 } from "./t6";
import { OVERHAUL_T7 } from "./t7";
import { OVERHAUL_T8 } from "./t8";
import { OVERHAUL_GAMBLING } from "./gambling";

export const OVERHAUL_CARDS: Buff[] = [
  ...OVERHAUL_T1,
  ...OVERHAUL_T2,
  ...OVERHAUL_T3,
  ...OVERHAUL_T4,
  ...OVERHAUL_T5,
  ...OVERHAUL_T6,
  ...OVERHAUL_T7,
  ...OVERHAUL_T8,
  ...OVERHAUL_GAMBLING,
];
