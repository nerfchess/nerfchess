import fs from "node:fs";
import { ALL_BUFFS } from "../../../../src/engine/buffs/library";
import { PLAYABLE_NERFS } from "../../../../src/engine/nerfs/library";
const reg = JSON.parse(fs.readFileSync(__dirname + "/../../../../docs/animation-registry.json","utf8"));
const live = new Map<string,number>();
for (const b of ALL_BUFFS) if (b.implemented && b.tier>=1 && b.tier<=8) live.set((b.category==="hex"?"hex":"buff")+":"+b.id,b.tier);
for (const n of PLAYABLE_NERFS) if (n.tier>=1&&n.tier<=8) live.set("nerf:"+n.id,n.tier);
const regm = new Map<string,number>(reg.entries.map((e:any)=>[e.kind+":"+e.id,e.tier]));
let drift=0, missing=0, extra=0; const ex:string[]=[];
for (const [id,t] of live){ if(!regm.has(id)) {missing++; ex.push("missing "+id);} else if(regm.get(id)!==t){drift++; ex.push(`${id} ${regm.get(id)}->${t}`);} }
for (const id of regm.keys()) if(!live.has(id)) {extra++; ex.push("extra "+id);}
const allT = new Map<string,number>(); for (const b of ALL_BUFFS) allT.set(b.id,b.tier);
const t910 = ALL_BUFFS.filter(b=>b.tier>=9).length;
console.log(JSON.stringify({registryEntries:reg.entries.length, live:live.size, tierDrift:drift, missing, extra, buffsTier9plus:t910, sample:ex.slice(0,15)},null,1));
