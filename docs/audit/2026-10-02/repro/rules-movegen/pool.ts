import { BUFF_POOL_BY_TIER, BUFF_BY_ID } from "../../../../../src/engine/buffs/library";
import { isRetired } from "../../../../../src/engine/retired";
const ids = process.argv.slice(2);
for (const id of ids) {
  const tiers = Object.entries(BUFF_POOL_BY_TIER as Record<string, any[]>).filter(([, l]) => l.some((b) => b.id === id)).map(([t]) => t);
  const d = BUFF_BY_ID[id];
  console.log(`${id}: kind=${d?.kind} tier=${d?.tier} implemented=${d?.implemented} pools=[${tiers}] retired=${isRetired(id)} name="${d?.name}" :: ${d?.description?.slice(0, 150)}`);
}
