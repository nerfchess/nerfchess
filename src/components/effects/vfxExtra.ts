// Plug-in canvas VFX specs, registered outside vfxSpecs.ts so other
// workstreams can add entries without editing the (very large) core table.
// Keyed by card id; a key already present in CARD_VFX is ignored (core wins).
// Same CardVfx contract as vfxSpecs.ts: travel/impact/aftermath/palette/
// source, optional shake (tier 7+ only by convention).

import type { CardVfx } from "./vfxSpecs";
import { FUNNY_VFX } from "./funnyVfx";

export const EXTRA_CARD_VFX: Record<string, CardVfx> = { ...FUNNY_VFX };
