// Helper for scripts/check-vfx-coverage.cjs: prints the two VFX table key
// sets, every buff's tier, and every library card's ENTRANCE resolution as one
// JSON line. Split out because the checker is .cjs (it shares the source
// scanner with check-sig-plugins.cjs) while these modules are ESM TypeScript
// that tsx can import directly — importing them is what keeps the gate honest,
// since a parsed copy of the tables (or of the entrance resolver) would be its
// own drift point.

import { CARD_VFX } from "../src/components/effects/vfxSpecs";
import { EXTRA_CARD_VFX } from "../src/components/effects/vfxExtra";
import { resolveEntrance } from "../src/components/effects/entranceResolve";
import { BUFF_BY_ID } from "../src/engine/buffs/library";
import { ALL_NERFS } from "../src/engine/nerfs/library";

const tiers: Record<string, number> = {};
for (const [id, def] of Object.entries(BUFF_BY_ID)) {
  if (def?.tier != null) tiers[id] = def.tier;
}

// The REAL resolver, run over the whole library — buffs AND nerfs (nerfs carry
// no BuffCategory and no CardFx, so they exercise the neutral floor). Encoded
// as "motif:jail" / "category:attack" / "default" per card id; anything falsy
// out of the resolver would surface here as a missing/empty entry and fail
// rule 3 in the checker.
const entrances: Record<string, string> = {};
for (const [id, def] of Object.entries(BUFF_BY_ID)) {
  const r = resolveEntrance(def);
  entrances[id] = r ? (r.kind === "motif" ? `motif:${r.motif}` : r.kind === "category" ? `category:${r.category}` : "default") : "";
}
for (const nerf of ALL_NERFS) {
  const r = resolveEntrance(nerf as { category?: string });
  entrances[`nerf:${nerf.id}`] =
    r ? (r.kind === "motif" ? `motif:${r.motif}` : r.kind === "category" ? `category:${r.category}` : "default") : "";
}

process.stdout.write(
  JSON.stringify({
    cardVfx: Object.keys(CARD_VFX),
    extraVfx: Object.keys(EXTRA_CARD_VFX),
    tiers,
    entrances,
  }) + "\n",
);
