// Nerf wave 2 — the 2026-07 expansion batch, filling the thin tiers of the
// nerf ladder (1, 2, 7, 8) with immediately-readable handicaps. Spread into
// ALL_IMPLEMENTED by implemented.ts; ids must not collide with existing
// nerfs. Every nerf needs a passive-effect composition in
// src/components/effects/passive/registry.ts (test:passive-registry).

import type { Nerf } from "@/engine/nerf";

export const NERF_WAVE2: Nerf[] = [];
