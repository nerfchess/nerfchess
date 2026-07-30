import { ALL_BUFFS } from "../src/engine/buffs/library";
const ids = process.argv.slice(2);
const m = new Map(ALL_BUFFS.map((b) => [b.id, b]));
for (const id of ids) {
  const b: any = m.get(id);
  if (!b) { console.log(`${id}: NOT FOUND`); continue; }
  console.log(`### ${id} [t${b.tier}] ${b.name} (${b.category}/${b.kind}) fx=${JSON.stringify(b.fx ?? null)}`);
  console.log(`   ${b.description}`);
}
