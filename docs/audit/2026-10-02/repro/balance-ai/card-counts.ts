import { ALL_BUFFS } from "../../../../../src/engine/buffs/library";
import { ALL_NERFS, PLAYABLE_NERFS, openingNerfPool } from "../../../../../src/engine/nerfs/library";
import { isRetired } from "../../../../../src/engine/retired";
import { aiCanUse } from "../../../../../src/engine/buff";
import fs from "node:fs";
const active = ALL_BUFFS.filter((b) => b.implemented && !isRetired(b.id));
const score = (def: any) => (!def.implemented || def.category === "info" ? 0 : aiCanUse(def) ? 100 : def.kind === "activated" ? 80 : 0);
const zero = active.filter((b) => score(b) === 0);
const byReason: Record<string, number> = {};
for (const b of zero) { const r = b.category === "info" ? "info" : `${b.kind}${(b as any).targets ? "+targets" : ""}`; byReason[r] = (byReason[r] ?? 0) + 1; }
console.log("buffs total", ALL_BUFFS.length, "implemented", ALL_BUFFS.filter(b=>b.implemented).length, "active(non-retired)", active.length);
console.log("bot draft score 0 (bot never picks unless forced):", zero.length, byReason);
console.log("kinds active:", ["passive","activated","instant"].map(k=>`${k}=${active.filter(b=>b.kind===k).length}`).join(" "));
console.log("nerfs total", ALL_NERFS.length, "playable", PLAYABLE_NERFS.length, "playable non-retired", PLAYABLE_NERFS.filter(n=>!isRetired(n.id)).length, "opening pool", openingNerfPool().length);
// coverage of stored winrate snapshot
const t = JSON.parse(fs.readFileSync("./docs/card-winrate.targeted-2026-09-06.json","utf8"));
const g = JSON.parse(fs.readFileSync("./docs/card-winrate.gambling-2026-09-05.json","utf8"));
const ids = new Set([...t.rows, ...g.rows].map((r:any)=>r.id));
const activeIds = new Set(active.map(b=>b.id));
const covered = [...ids].filter(i=>activeIds.has(i)).length;
console.log("winrate rows stored", ids.size, "covering active cards", covered, "of", active.length, `(${(100*covered/active.length).toFixed(1)}%)`);
const rows = [...t.rows, ...g.rows].filter((r:any)=>activeIds.has(r.id));
const outside = rows.filter((r:any)=>Math.abs(r.delta) > 10);
const sig = rows.filter((r:any)=>Math.abs(r.delta) > 2*r.stderr);
console.log("stored rows on active cards with |delta|>10pt (i.e. holder score outside 45-55 if baseline 50):", outside.length, "significant at 2se:", sig.length);
console.log("median pairs", rows.map((r:any)=>r.pairs).sort((a:number,b:number)=>a-b)[Math.floor(rows.length/2)], "median stderr", rows.map((r:any)=>r.stderr).sort((a:number,b:number)=>a-b)[Math.floor(rows.length/2)].toFixed(1));
