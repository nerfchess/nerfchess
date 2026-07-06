// Barrel for the expanded nerf library. Each tier file exports one array of
// fully-implemented nerfs; they are concatenated here and spread into
// ALL_IMPLEMENTED by implemented.ts. Ids must not collide with existing nerfs.

import { Nerf } from "./shared";
import { NERFS_T1 } from "./tier1";
export { FOOTSOLDIERS_ONLY } from "./tier8";
import { NERFS_T2 } from "./tier2";
import { NERFS_T3 } from "./tier3";
import { NERFS_T4 } from "./tier4";
import { NERFS_T5 } from "./tier5";
import { NERFS_T6 } from "./tier6";
import { NERFS_T7 } from "./tier7";
import { NERFS_T8 } from "./tier8";

export const EXPANDED_NERFS: Nerf[] = [
  ...NERFS_T1,
  ...NERFS_T2,
  ...NERFS_T3,
  ...NERFS_T4,
  ...NERFS_T5,
  ...NERFS_T6,
  ...NERFS_T7,
  ...NERFS_T8,
];
