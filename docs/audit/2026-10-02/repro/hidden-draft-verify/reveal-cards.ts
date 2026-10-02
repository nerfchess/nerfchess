import { BUFF_BY_ID, BUFF_POOL_BY_TIER } from "../../../../../src/engine/buffs/library";
import { isRetired } from "../../../../../src/engine/retired";
import { isBoon } from "../../../../../src/engine/buff";
const pooled = new Set(Object.values(BUFF_POOL_BY_TIER).flat().map((b: any) => b.id));
for (const id of ["extra_glance","stream_sniper","third_eye","pr_phishing","wa_foresight","wa_omniscience"]) {
  const b: any = (BUFF_BY_ID as any)[id];
  console.log(id, JSON.stringify({ tier: b?.tier, category: b?.category, retired: isRetired(id), inPool: pooled.has(id), boon: b ? isBoon(b) : null }), (b?.description ?? "").slice(0, 120));
}
