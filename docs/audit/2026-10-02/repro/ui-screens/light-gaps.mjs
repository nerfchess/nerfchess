// Which fixed-dark colour utilities (Tailwind `ink-*`, black, white are literal
// hex, not var-backed) are used in chrome and have NO html[data-light] override?
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
const ROOT = ".", SRC = join(ROOT, "src");
function walk(d, out = []) { for (const f of readdirSync(d)) { const p = join(d, f); const s = statSync(p); if (s.isDirectory()) walk(p, out); else if (/\.(tsx)$/.test(f)) out.push(p); } return out; }
const css = readdirSync(SRC, { recursive: true }).filter((f) => f.endsWith(".css")).map((f) => readFileSync(join(SRC, f), "utf8")).join("\n");
// collect light selectors text
const lightBlocks = [];
const re = /([^{}]*html\[data-light\][^{}]*|[^{}]*data-theme="light"[^{}]*)\{/g;
let m; while ((m = re.exec(css))) lightBlocks.push(m[1]);
const lightSel = lightBlocks.join("\n");
const esc = (c) => c.replace(/([/:.\[\]%()#,])/g, "\\$1");
const CLS = /(?<![\w-])((?:[a-z-]+:)*)((?:bg|text|border|border-[trbl]|from|to|via|ring|outline|divide|fill|stroke|placeholder)-(?:ink-\d{2,3}|black|white)(?:\/[\w.\[\]]+)?)(?![\w-])/g;
const uses = new Map(), files = new Map();
for (const f of walk(SRC)) {
  const rel = relative(ROOT, f);
  if (/components\/effects\/|app\/dev\/|components\/clip\/|app\/mod\/|components\/mod\//.test(rel)) continue;
  const txt = readFileSync(f, "utf8");
  let k; CLS.lastIndex = 0;
  while ((k = CLS.exec(txt))) {
    const cls = k[2];
    uses.set(cls, (uses.get(cls) || 0) + 1);
    if (!files.has(cls)) files.set(cls, new Set());
    files.get(cls).add(rel);
  }
}
const rows = [];
for (const [cls, n] of uses) {
  const patched = lightSel.includes("." + esc(cls)) ;
  rows.push({ cls, n, patched, files: [...files.get(cls)].slice(0, 4) });
}
rows.sort((a, b) => b.n - a.n);
const un = rows.filter((r) => !r.patched);
console.log(`distinct fixed-dark classes in chrome: ${rows.length}, uses: ${rows.reduce((a, r) => a + r.n, 0)}`);
console.log(`unpatched for light: ${un.length} classes, ${un.reduce((a, r) => a + r.n, 0)} uses`);
for (const r of un.slice(0, 40)) console.log(String(r.n).padStart(4), r.cls.padEnd(28), r.files.join(", "));
