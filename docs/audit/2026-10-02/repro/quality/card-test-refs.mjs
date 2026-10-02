import fs from "node:fs"; import path from "node:path";
const root = ".";
const reg = JSON.parse(fs.readFileSync(root + "/docs/card-registry.json", "utf8")).cards;
const ids = reg.map((c) => c.id);
// test-ish files: scripts/test-*, scripts/polish/test-*, scripts/*.cjs tests, arena/engine test dirs, e2e
const files = [];
const add = (d, re) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isFile() && re.test(f)) files.push(p); } };
add(root + "/scripts", /^(test-|sim-search-nerf-safety|check-glossary)/);
add(root + "/scripts/polish", /^test-/);
for (const d of ["arena-service/test", "engine-service/test", "e2e", "e2e/polish"]) add(path.join(root, d), /\.(ts|mjs|cjs|js)$/);
let blob = files.map((f) => fs.readFileSync(f, "utf8")).join("\n");
const hit = new Map();
for (const id of ids) { const re = new RegExp(`["'\`]${id}["'\`]`); if (re.test(blob)) hit.set(id, true); }
const byKind = {};
for (const c of reg) { const k = c.kind; byKind[k] ??= { total: 0, named: 0 }; byKind[k].total++; if (hit.has(c.id)) byKind[k].named++; }
console.log("test files scanned:", files.length);
console.log("cards named by id in a test file:", hit.size, "of", ids.length, byKind);
const byTier = {};
for (const c of reg) { byTier[c.tier] ??= [0, 0]; byTier[c.tier][0]++; if (hit.has(c.id)) byTier[c.tier][1]++; }
console.log("by tier [total, named]:", JSON.stringify(byTier));
