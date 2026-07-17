// Boon-wave plugin signatures — flagships for the boon expansion batch
// (src/engine/buffs/boons2.ts). Same registry contract as the other plugin
// modules (see sigPlugins.tsx): self-contained render art, own CSS
// (boonPlays.css), transform/opacity only, no imports from BoardEffects.tsx.
// Every entry must be a bespoke scene or a template + per-card flourish with
// real per-flourish dressing — the animation audit (npm run test:animations)
// fails shared flagships that grow the committed baseline.

import "./boonPlays.css";

import type { SigPlugin } from "./sigPlugins";

export const PLAYS: Record<string, SigPlugin> = {
};
