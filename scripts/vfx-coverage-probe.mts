// Helper for scripts/check-vfx-coverage.cjs: prints the two VFX table key
// sets plus every buff's tier as one JSON line. Split out because the checker
// is .cjs (it shares the source scanner with check-sig-plugins.cjs) while
// these modules are ESM TypeScript that tsx can import directly — importing
// them is what keeps the gate honest, since a parsed copy of the tables would
// be its own drift point.

import { CARD_VFX } from "../src/components/effects/vfxSpecs";
import { EXTRA_CARD_VFX } from "../src/components/effects/vfxExtra";
import { BUFF_BY_ID } from "../src/engine/buffs/library";

const tiers: Record<string, number> = {};
for (const [id, def] of Object.entries(BUFF_BY_ID)) {
  if (def?.tier != null) tiers[id] = def.tier;
}

process.stdout.write(
  JSON.stringify({
    cardVfx: Object.keys(CARD_VFX),
    extraVfx: Object.keys(EXTRA_CARD_VFX),
    tiers,
  }) + "\n",
);
