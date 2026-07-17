// Curse-wave plugin signatures — flagships for the hex expansion batch
// (src/engine/buffs/hexes/wave2.ts). Same registry contract as the other
// plugin modules (see sigPlugins.tsx): self-contained render art, own CSS
// (cursePlays.css), transform/opacity only, no imports from
// BoardEffects.tsx. Every entry must be a bespoke scene or a template +
// per-card flourish with real per-flourish dressing — the animation audit
// (npm run test:animations) fails shared flagships that grow the committed
// baseline.

import "./cursePlays.css";

import type { SigPlugin } from "./sigPlugins";

export const PLAYS: Record<string, SigPlugin> = {
};
