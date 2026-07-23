import { ALL_BUFFS } from "../src/engine/buffs/library";
import { ALL_NERFS } from "../src/engine/nerfs/library";
import { isBoon } from "../src/engine/buff";
import * as fs from "fs";
const out: any[] = [];
for (const b of ALL_BUFFS) out.push({ id: b.id, name: b.name, tier: b.tier, kind: "buff", category: b.category, boon: isBoon(b), implemented: b.implemented, description: b.description });
for (const n of ALL_NERFS) out.push({ id: n.id, name: n.name, tier: n.tier, kind: "nerf", category: "nerf-card", boon: false, implemented: n.implemented, description: n.description });
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log("cards:", out.length);
