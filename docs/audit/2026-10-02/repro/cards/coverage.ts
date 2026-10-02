import fs from "node:fs"; import path from "node:path";
const live = JSON.parse(fs.readFileSync(__dirname+"/live-ids.json","utf8"));
const ROOT=".";
const files: string[] = [];
function walk(d:string){ for(const e of fs.readdirSync(d,{withFileTypes:true})){ const p=path.join(d,e.name); if(e.isDirectory()){ if(e.name==="node_modules"||e.name==="evidence") continue; walk(p);} else if(/\.(ts|cjs|mjs|js)$/.test(e.name)) files.push(p);} }
walk(ROOT+"/scripts"); if (fs.existsSync(ROOT+"/e2e")) walk(ROOT+"/e2e");
for (const extra of ["engine-service/test","arena-service/test"]) if (fs.existsSync(ROOT+"/"+extra)) walk(ROOT+"/"+extra);
const allLive = new Set<string>([...live.nerfs, ...live.buffs]);
const perFile: Record<string, string[]> = {};
const perCard: Record<string, string[]> = {};
for (const f of files) {
  const t = fs.readFileSync(f,"utf8"); const rel = path.relative(ROOT,f);
  if (rel.includes("audit-cards.ts")||rel.includes("gen-card")||rel.includes("propose-retire")) continue;
  for (const m of t.matchAll(/["'`]([a-z0-9]+(?:_[a-z0-9]+)*)["'`]/g)) {
    const id = m[1]; if (!allLive.has(id)) continue;
    (perFile[rel] ??= []); if (!perFile[rel].includes(id)) perFile[rel].push(id);
    (perCard[id] ??= []); if (!perCard[id].includes(rel)) perCard[id].push(rel);
  }
}
const rows = Object.entries(perFile).sort((a,b)=>b[1].length-a[1].length);
for (const [f, ids] of rows) console.log(String(ids.length).padStart(5), f);
const nerfCov = live.nerfs.filter((id:string)=>perCard[id]).length, buffCov = live.buffs.filter((id:string)=>perCard[id]).length;
console.log("live nerfs mentioned in any script:", nerfCov, "/", live.nerfs.length);
console.log("live buffs mentioned in any script:", buffCov, "/", live.buffs.length);
fs.writeFileSync(__dirname+"/per-card-mentions.json", JSON.stringify(perCard,null,1));
