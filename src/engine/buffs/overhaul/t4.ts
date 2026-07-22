// Overhaul roster, Tier 4 (docs/overhaul-roster.md): filled by the tier-4
// implementation pass. Cards use ids ov_*, categories from BuffCategory
// EXCLUDING "hex" and "nerf" (buff-mode cards), and api.rng for all
// randomness inside init/effect/onMovePlayed only.

import type { Buff } from "./shared";

export const OVERHAUL_T4: Buff[] = [];
