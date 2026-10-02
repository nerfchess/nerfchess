// Bundle ONE route entry alone (no cross-entry splitting artifacts from barrels),
// lucide external. Reports initial (static) bytes and top packages.
import * as esbuild from "../../../../../node_modules/esbuild/lib/main.js";
import zlib from "node:zlib";
import path from "node:path";
const ROOT = ".";
const entry = process.argv[2];
const r = await esbuild.build({ absWorkingDir: ROOT, entryPoints: [path.join(ROOT, entry)], bundle: true, minify: true, format: "esm", splitting: true, outdir: "docs/audit/2026-10-02/repro/perf/out-single", write: false, metafile: true, logLevel: "error", jsx: "automatic", tsconfig: ROOT + "/tsconfig.json",
  define: { "process.env.NODE_ENV": '"production"' }, external: ["react", "react-dom", "react/*", "react-dom/*", "next", "next/*", "lucide-react"], loader: { ".css": "empty", ".svg": "empty" } });
const outs = r.metafile.outputs; const files = new Map(r.outputFiles.map((f) => [path.relative(ROOT, f.path), f.contents]));
const entryOut = Object.keys(outs).find((o) => outs[o].entryPoint === entry);
const seen = new Set(); const st = [entryOut];
while (st.length) { const o = st.pop(); if (seen.has(o)) continue; seen.add(o); for (const i of outs[o].imports) if (!i.external && i.kind === "import-statement") st.push(i.path); }
let b = 0, g = 0; const pk = new Map();
for (const o of seen) { b += outs[o].bytes; g += zlib.gzipSync(files.get(o)).length; for (const [inp, v] of Object.entries(outs[o].inputs)) { const m = inp.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/); const k = m ? "npm:" + m[1] : inp.split("/").slice(0, 3).join("/"); pk.set(k, (pk.get(k) ?? 0) + v.bytesInOutput); } }
let ab = 0, ag = 0; for (const [k, c] of files) if (k.endsWith(".js")) { ab += c.length; ag += zlib.gzipSync(c).length; }
console.log(`${entry}: initial ${(b / 1024).toFixed(0)}KB min / ${(g / 1024).toFixed(0)}KB gz; all chunks ${(ab / 1024).toFixed(0)}KB / ${(ag / 1024).toFixed(0)}KB gz`);
console.log("  " + [...pk.entries()].sort((a, c) => c[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${(v / 1024).toFixed(0)}KB`).join(" | "));
