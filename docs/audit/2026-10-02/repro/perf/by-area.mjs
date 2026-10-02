// Group initial-chunk bytes by area (node_modules package / src top dir) for one entry.
import fs from "node:fs";
import path from "node:path";
const meta = JSON.parse(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "out/meta.json"), "utf8"));
const outs = meta.outputs;
const name = process.argv[2];
const entryOut = Object.keys(outs).find((o) => outs[o].entryPoint && path.basename(o, ".js") === name);
const seen = new Set(); const st = [entryOut];
while (st.length) { const o = st.pop(); if (seen.has(o)) continue; seen.add(o); for (const i of outs[o].imports) if (!i.external && i.kind === "import-statement") st.push(i.path); }
const area = (p) => { const m = p.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/); if (m) return "npm:" + m[1]; const s = p.split("/"); return s.slice(0, Math.min(3, s.length - 1)).join("/"); };
const agg = new Map();
for (const o of seen) for (const [inp, v] of Object.entries(outs[o].inputs)) agg.set(area(inp), (agg.get(area(inp)) ?? 0) + v.bytesInOutput);
for (const [k, v] of [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log((v / 1024).toFixed(1).padStart(8) + "KB " + k);
// lazy-only chunks containing three or mediabunny?
const lazyHas = (pkg) => Object.keys(outs).filter((o) => !seen.has(o) && Object.keys(outs[o].inputs).some((i) => i.includes("node_modules/" + pkg + "/")));
console.log("three in lazy chunks:", lazyHas("three").length, " mediabunny in lazy chunks:", lazyHas("mediabunny").length);
