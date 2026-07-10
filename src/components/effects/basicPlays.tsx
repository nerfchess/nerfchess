// Tier 1-4 plugin signatures (the "basic" band: unique but restrained plays
// for every card not already covered by the core table or the god / great /
// funny plugin sets). See sigPlugins.tsx for the contract. Self-contained:
// own SVG, own CSS (basicPlays.css), transform/opacity only. Do NOT import
// from BoardEffects.tsx.

import type { SigPlugin } from "./sigPlugins";

export const PLAYS: Record<string, SigPlugin> = {
  // Filled by the tier 1-4 coverage workstream.
};
