// Boon wave 2 — the 2026-07 nerf-mode expansion's boon batch. Boons are the
// rarer, stranger, more transformative side of the draft pool: miracles,
// contracts, rare transformations, comeback engines — never just bigger
// numbers. Every card here carries `boon: true` so it joins nerf mode's
// boon/item bucket, plus a normal BuffCategory for codex grouping.
// Spread into ALL_BUFFS by library.ts; ids must not collide with existing
// cards. Animation flagships live in src/components/effects/boonPlays.tsx.

import type { Buff } from "@/engine/buff";

export const BOON_WAVE2: Buff[] = [];
