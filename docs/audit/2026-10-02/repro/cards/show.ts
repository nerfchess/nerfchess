import { ALL_NERFS } from "../../../../../src/engine/nerfs/library";
import { ALL_BUFFS } from "../../../../../src/engine/buffs/library";
const ids = process.argv.slice(2);
for (const id of ids) { for (const c of [...ALL_NERFS.filter(n=>n.id===id).map(n=>({...n,k:"nerf"})), ...ALL_BUFFS.filter(b=>b.id===id).map(b=>({...b,k:"buff"}))]) console.log(`[${c.k}] ${c.id} "${c.name}" t${c.tier} ${(c as any).kind??""} ${(c as any).category??""} spendOnUse=${(c as any).spendOnUse} free=${(c as any).freeAction}\n   ${c.description}${c.tip? "\n   TIP: "+c.tip:""}`); }
