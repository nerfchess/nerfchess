// Walk the import graph from every "use client" module (plus what they import)
// and report any client-reachable module that lives under src/lib/server, or
// reads process.env.<NAME> other than NEXT_PUBLIC_* / NODE_ENV.
import fs from "node:fs";
import path from "node:path";
const ROOT = ".";
const SRC = path.join(ROOT, "src");
const exts = [".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx"];
function resolve(from, spec) {
  let base;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const e of exts) if (fs.existsSync(base + e)) return base + e;
  return null;
}
function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(tsx?|mjs|js)$/.test(f)) out.push(p);
  }
  return out;
}
const all = walk(SRC);
const isClient = (src) => /^\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*\s*["']use client["']/.test(src);
const importRe = /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;
const seen = new Set();
const parent = new Map();
const queue = [];
for (const f of all) {
  const s = fs.readFileSync(f, "utf8");
  if (isClient(s)) { queue.push(f); seen.add(f); parent.set(f, null); }
}
const roots = queue.length;
while (queue.length) {
  const f = queue.shift();
  const s = fs.readFileSync(f, "utf8");
  for (const m of s.matchAll(importRe)) {
    const line = s.slice(Math.max(0, m.index - 0), m.index + m[0].length);
    if (/import\s+type\s/.test(line) || /export\s+type\s/.test(line)) continue;
    const spec = m[1] || m[2];
    const r = resolve(f, spec);
    if (r && !seen.has(r)) { seen.add(r); parent.set(r, f); queue.push(r); }
  }
}
const chain = (f) => { const c = []; while (f) { c.push(path.relative(ROOT, f)); f = parent.get(f); } return c.reverse().join(" -> "); };
let serverHits = 0, envHits = 0;
for (const f of seen) {
  const rel = path.relative(ROOT, f);
  if (rel.startsWith("src/lib/server/")) { serverHits++; console.log("SERVER MODULE REACHABLE FROM CLIENT:", chain(f)); }
  const s = fs.readFileSync(f, "utf8");
  for (const m of s.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
    if (m[1].startsWith("NEXT_PUBLIC_") || m[1] === "NODE_ENV") continue;
    envHits++; console.log("NON-PUBLIC ENV READ IN CLIENT GRAPH:", rel, m[1]);
  }
}
console.log(`client roots=${roots} client-reachable modules=${seen.size} serverHits=${serverHits} envHits=${envHits}`);
