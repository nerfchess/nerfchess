// Funny/meta plugin signatures (bespoke literal card animations). See
// sigPlugins.tsx for the contract. Self-contained: own SVG, own CSS
// (funnyPlays.css), transform/opacity only. Do NOT import from
// BoardEffects.tsx.

import type { SigPlugin } from "./sigPlugins";

export const PLAYS: Record<string, SigPlugin> = {
  // Filled by the funny/meta bespoke-animation workstream.
};
