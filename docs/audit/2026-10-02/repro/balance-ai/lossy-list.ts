import { ALL_BUFFS } from "../../../../../src/engine/buffs/library";
import { isRetired } from "../../../../../src/engine/retired";
const src = (b: any) => (b.augmentMoves ? b.augmentMoves.toString() : "");
const hits = ALL_BUFFS.filter((b: any) => /inst\.state\.(armed|offered)\s*=\s*true/.test(src(b)));
for (const b of hits) console.log(b.id, "tier", b.tier, isRetired(b.id) ? "RETIRED" : "active", (b as any).opener ? "opener" : "");
