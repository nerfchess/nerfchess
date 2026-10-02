import { BUFF_BY_ID, BUFF_POOL_BY_TIER } from "../../../../../src/engine/buffs/library";
import { isRetired } from "../../../../../src/engine/retired";
import { isBoon } from "../../../../../src/engine/buff";
import { NERF_REVEAL } from "../../../../../src/engine/draft";
const pooled = new Set(Object.values(BUFF_POOL_BY_TIER).flat().map((b) => b.id));
for (const id of NERF_REVEAL) {
  const b = BUFF_BY_ID[id];
  console.log(id, JSON.stringify({ name: b?.name, tier: b?.tier, kind: b?.kind, category: b?.category, boon: b ? isBoon(b) : null, implemented: b?.implemented, retired: isRetired(id), inPool: pooled.has(id), nerfModeEligible: !!b && !isRetired(id) && pooled.has(id) && (isBoon(b) || b.category === "hex" || b.category === "item") }), "|", (b?.description ?? "").slice(0, 110));
}
