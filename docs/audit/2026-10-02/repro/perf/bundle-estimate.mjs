// Approximate client bundle weight per route WITHOUT next build.
// esbuild bundles each "use client" route entry with code splitting, minify,
// and react/next as externals, then walks the metafile: "initial" = entry chunk
// + chunks reachable by static import; "lazy" = chunks only reachable by import().
// Gzip sizes computed with zlib. Output goes to scratch only.
import * as esbuild from "../../../../../node_modules/esbuild/lib/main.js";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = ".";
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), "out");
const entries = {
  home: "src/app/page.tsx",
  game_local: "src/app/game/page.tsx",
  game_online: "src/app/game/[id]/page.tsx",
  lobby: "src/app/lobby/page.tsx",
  play: "src/app/play/page.tsx",
  analysis: "src/app/analysis/page.tsx",
  puzzles: "src/app/puzzles/page.tsx",
};
const only = process.argv[2];
const sel = only ? { [only]: entries[only] } : entries;

const res = await esbuild.build({
  absWorkingDir: ROOT,
  entryPoints: Object.fromEntries(Object.entries(sel).map(([k, v]) => [k, path.join(ROOT, v)])),
  bundle: true,
  splitting: true,
  format: "esm",
  minify: true,
  target: "es2020",
  platform: "browser",
  outdir: OUT,
  metafile: true,
  write: true,
  logLevel: "error",
  tsconfig: path.join(ROOT, "tsconfig.json"),
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  external: [...(process.env.EXT_LUCIDE ? ["lucide-react"] : []), "react", "react-dom", "react/*", "react-dom/*", "next", "next/*", "server-only"],
  loader: { ".css": "css", ".svg": "file", ".png": "file", ".woff2": "file", ".mp3": "file" },
});
fs.writeFileSync(path.join(OUT, "meta.json"), JSON.stringify(res.metafile));
const outs = res.metafile.outputs;
const rel = (p) => path.relative(ROOT, p);
const gz = (file) => zlib.gzipSync(fs.readFileSync(path.join(ROOT, file))).length;
function walk(start, kinds) {
  const seen = new Set();
  const stack = [start];
  while (stack.length) {
    const o = stack.pop();
    if (seen.has(o)) continue;
    seen.add(o);
    for (const imp of outs[o]?.imports ?? []) if (!imp.external && kinds.includes(imp.kind)) stack.push(imp.path);
  }
  return seen;
}
const kb = (n) => (n / 1024).toFixed(1);
for (const [name] of Object.entries(sel)) {
  const entryOut = Object.keys(outs).find((o) => outs[o].entryPoint && path.basename(o, ".js") === name);
  if (!entryOut) { console.log(name, "no output"); continue; }
  const init = walk(entryOut, ["import-statement"]);
  const all = walk(entryOut, ["import-statement", "dynamic-import"]);
  let ib = 0, ig = 0, ab = 0, ag = 0, css = 0, cssg = 0;
  for (const o of init) { ib += outs[o].bytes; ig += gz(o); const c = outs[o].cssBundle; if (c) { css += outs[c].bytes; cssg += gz(c); } }
  for (const o of all) { ab += outs[o].bytes; ag += gz(o); }
  // top input contributors to the initial set
  const contrib = new Map();
  for (const o of init) for (const [inp, v] of Object.entries(outs[o].inputs)) contrib.set(inp, (contrib.get(inp) ?? 0) + v.bytesInOutput);
  const top = [...contrib.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${kb(v)}KB ${k}`);
  console.log(`\n== ${name}: initial JS ${kb(ib)}KB min / ${kb(ig)}KB gz in ${init.size} chunks; initial CSS ${kb(css)}KB / ${kb(cssg)}KB gz; all reachable JS ${kb(ab)}KB min / ${kb(ag)}KB gz in ${all.size} chunks`);
  console.log("  top initial inputs:\n   " + top.join("\n   "));
}
