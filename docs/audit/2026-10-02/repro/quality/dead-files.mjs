// Files under src/ (not Next route-convention files) that no other file in the repo imports.
import fs from "node:fs"; import path from "node:path";
const root = ".";
const walk = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (["node_modules", ".next", "dist", "dist-server", ".open-next"].includes(e.name)) continue; const p = path.join(d, e.name); e.isDirectory() ? walk(p, out) : out.push(p); } return out; };
const all = [...walk(root + "/src"), ...walk(root + "/scripts"), ...walk(root + "/e2e"), ...walk(root + "/server"), ...walk(root + "/arena-service"), ...walk(root + "/engine-service"), root + "/worker.ts"].filter((f) => /\.(ts|tsx|mjs|cjs|js)$/.test(f));
const srcFiles = all.filter((f) => f.startsWith(root + "/src/") && /\.(ts|tsx)$/.test(f) && !f.endsWith(".d.ts"));
const conv = /^(page|layout|route|error|global-error|loading|not-found|template|default|opengraph-image|twitter-image|icon|apple-icon|sitemap|robots|manifest|middleware|instrumentation)\.(ts|tsx)$/;
const texts = new Map(all.map((f) => [f, fs.readFileSync(f, "utf8")]));
// collect import specifiers from every file, resolved to absolute paths without extension
const imported = new Set();
const specRe = /(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)["']([^"']+)["']/g;
for (const [f, t] of texts) {
  for (const m of t.matchAll(specRe)) {
    let s = m[1];
    let abs = null;
    if (s.startsWith("@/")) abs = path.join(root, "src", s.slice(2));
    else if (s.startsWith(".")) abs = path.resolve(path.dirname(f), s);
    else continue;
    abs = abs.replace(/\.(ts|tsx|js|mjs|cjs)$/, "");
    imported.add(abs); imported.add(abs + "/index");
  }
}
const dead = [];
for (const f of srcFiles) {
  if (conv.test(path.basename(f)) && f.includes("/src/app/")) continue;
  if (f.includes("/src/app/") && /\/(page|layout)\./.test(f)) continue;
  const key = f.replace(/\.(ts|tsx)$/, "");
  if (!imported.has(key)) dead.push(path.relative(root, f) + " (" + texts.get(f).split("\n").length + " lines)");
}
console.log("src ts/tsx files:", srcFiles.length, "never imported by path:", dead.length);
console.log(dead.join("\n"));
