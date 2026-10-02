// Count Tailwind arbitrary-value utilities (e.g. text-[13px], w-[37px]) across src/**/*.tsx|ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
const ROOT = ".";
const SRC = join(ROOT, "src");
function walk(d, out = []) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(f)) out.push(p);
  }
  return out;
}
// utility-[value] where utility is a tailwind-ish token, optionally negative, optionally with variants before
const RE = /(?<![\w\[-])-?([a-z]+(?:-[a-z]+)*)-\[([^\]\s"'`]+)\]/g;
const byUtil = new Map(), byFile = new Map(), byVal = new Map();
let total = 0, pxTotal = 0, colorTotal = 0, varTotal = 0;
for (const f of walk(SRC)) {
  const txt = readFileSync(f, "utf8");
  const rel = relative(ROOT, f);
  let m;
  RE.lastIndex = 0;
  while ((m = RE.exec(txt))) {
    const util = m[1], val = m[2];
    // skip things that are clearly not tailwind classes: e.g. array index like foo-[0]? require a known-ish prefix
    if (!/^(text|w|h|min-w|max-w|min-h|max-h|p|px|py|pt|pb|pl|pr|ps|pe|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|top|left|right|bottom|inset|inset-x|inset-y|rounded|border|border-t|border-b|border-l|border-r|bg|leading|tracking|grid-cols|grid-rows|col-span|z|shadow|translate-x|translate-y|scale|rotate|duration|delay|ease|opacity|basis|flex|outline|ring|space-x|space-y|aspect|size|blur|fill|stroke|from|to|via|decoration|underline-offset|scroll-mt|scroll-pb|order|line-clamp|columns|font|content|transition|animate|outline-offset|origin)$/.test(util)) continue;
    total++;
    byUtil.set(util, (byUtil.get(util) || 0) + 1);
    byFile.set(rel, (byFile.get(rel) || 0) + 1);
    const key = `${util}-[${val}]`;
    byVal.set(key, (byVal.get(key) || 0) + 1);
    if (/^-?\d+(\.\d+)?px$/.test(val)) { pxTotal++; }
    if (/^#|^rgb|^hsl/.test(val)) colorTotal++;
    if (/var\(/.test(val)) varTotal++;
  }
}
const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
console.log(JSON.stringify({ total, pxTotal, colorTotal, varTotal, files: byFile.size }, null, 0));
console.log("\nBy utility:"); for (const [k, v] of top(byUtil, 25)) console.log(String(v).padStart(6), k);
console.log("\nTop values:"); for (const [k, v] of top(byVal, 40)) console.log(String(v).padStart(6), k);
console.log("\nTop files:"); for (const [k, v] of top(byFile, 25)) console.log(String(v).padStart(6), k);
// font-size arbitrary distribution
const fs = [...byVal.entries()].filter(([k]) => k.startsWith("text-[") && /px\]$/.test(k)).sort((a, b) => b[1] - a[1]);
console.log("\nArbitrary font sizes:", fs.map(([k, v]) => `${k}:${v}`).join(" "));
