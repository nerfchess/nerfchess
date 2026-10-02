// Walk the esbuild metafile INPUT graph from an entry following only static
// imports: lists CSS reached statically (source bytes) and the import chain
// to a target module. Usage: node static-graph.mjs <entry-src> [target-substring]
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
const meta = JSON.parse(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "out/meta.json"), "utf8"));
const ROOT = ".";
const [entry, target] = process.argv.slice(2);
const ins = meta.inputs;
const prev = new Map([[entry, null]]);
const q = [entry];
while (q.length) {
  const cur = q.shift();
  for (const imp of ins[cur]?.imports ?? []) {
    if (imp.external) continue;
    if (!["import-statement", "require-call", "import-rule"].includes(imp.kind)) continue;
    if (!prev.has(imp.path)) { prev.set(imp.path, cur); q.push(imp.path); }
  }
}
const css = [...prev.keys()].filter((k) => k.endsWith(".css"));
let tot = 0, gzt = 0;
const rows = css.map((c) => { const b = fs.readFileSync(path.join(ROOT, c)); tot += b.length; const g = zlib.gzipSync(b).length; gzt += g; return [b.length, g, c]; }).sort((a, b) => b[0] - a[0]);
console.log(`static modules: ${prev.size}; static CSS files: ${css.length}, ${(tot/1024).toFixed(1)}KB source, ${(gzt/1024).toFixed(1)}KB gz (per-file gz sum)`);
for (const [b, g, c] of rows.slice(0, 15)) console.log(`  ${(b/1024).toFixed(1)}KB (${(g/1024).toFixed(1)} gz) ${c}`);
if (target) {
  const hit = [...prev.keys()].find((k) => k.includes(target));
  if (!hit) console.log("target not statically reachable"); else {
    const chain = []; let c = hit; while (c) { chain.push(c); c = prev.get(c); }
    console.log("chain:\n  " + chain.reverse().join("\n  -> "));
  }
}
