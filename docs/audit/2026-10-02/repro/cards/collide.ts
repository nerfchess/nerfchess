import { ALL_NERFS } from "../../../../../src/engine/nerfs/library";
import { ALL_BUFFS } from "../../../../../src/engine/buffs/library";
import { RETIRED, isRetired } from "../../../../../src/engine/retired";
const ids = ['scorched_earth','king_of_the_hill','heavy_boots','pawn_storm','vertigo','slowpoke','cavalry_charge','no_mans_land','anchored_rooks'];
for (const id of ids) {
  const n = ALL_NERFS.find(x=>x.id===id)!, b = ALL_BUFFS.find(x=>x.id===id)!;
  console.log(id, "| retired:", !!RETIRED[id], "| nerf:", n.name, "t"+n.tier, "| buff:", b.name, "t"+b.tier, b.category);
  console.log("   N:", n.description.slice(0,110)); console.log("   B:", b.description.slice(0,110));
}
// merged into targets that collide
for (const [id,r] of Object.entries(RETIRED)) if (r.mergedInto && ids.includes(r.mergedInto)) console.log("mergedInto ambiguous:", id, "->", r.mergedInto, "retired id kind:", ALL_NERFS.some(n=>n.id===id)?"nerf":"buff");
// live duplicate names
const live = [...ALL_NERFS.filter(n=>!isRetired(n.id)).map(n=>({k:"nerf",id:n.id,name:n.name})), ...ALL_BUFFS.filter(b=>!isRetired(b.id)).map(b=>({k:"buff",id:b.id,name:b.name}))];
const m = new Map<string, any[]>(); for (const c of live) { const k=c.name.toLowerCase().trim(); m.set(k,[...(m.get(k)??[]),c]); }
const d = [...m.entries()].filter(([,v])=>v.length>1);
console.log("live duplicate names:", d.length);
for (const [k,v] of d) console.log("  ", k, v.map(c=>c.k+":"+c.id).join(", "));
