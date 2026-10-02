import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
const ROOT = ".", SRC = join(ROOT, "src");
function walk(d, out = []) { for (const f of readdirSync(d)) { const p = join(d, f); const s = statSync(p); if (s.isDirectory()) walk(p, out); else if (/\.(tsx|ts)$/.test(f)) out.push(p); } return out; }
const RE = /(?<![\w\[-])-?([a-z]+(?:-[a-z]+)*)-\[([^\]\s"'`]+)\]/g;
const OK = /^(text|w|h|min-w|max-w|min-h|max-h|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|top|left|right|bottom|inset|inset-x|inset-y|rounded|border|border-t|border-b|border-l|border-r|bg|leading|tracking|grid-cols|grid-rows|z|shadow|translate-x|translate-y|duration|delay|ease|opacity|basis|outline|ring|space-x|space-y|size|from|to|via|scroll-mt|line-clamp|font|outline-offset)$/;
const isEffects = (rel) => /src\/components\/effects\/|src\/app\/dev\//.test(rel);
const stats = { chrome: { total: 0, px: 0, tokenVar: 0, pct: 0 }, effects: { total: 0 } };
const chromeFiles = new Map(), chromeVals = new Map(), chromeUtil = new Map();
const pxNonFontNonTouch = new Map();
for (const f of walk(SRC)) {
  const rel = relative(ROOT, f), txt = readFileSync(f, "utf8");
  let m; RE.lastIndex = 0;
  while ((m = RE.exec(txt))) {
    const [, util, val] = m; if (!OK.test(util)) continue;
    if (isEffects(rel)) { stats.effects.total++; continue; }
    const c = stats.chrome; c.total++;
    if (/var\(/.test(val)) c.tokenVar++;
    if (/%$/.test(val)) c.pct++;
    if (/^-?\d+(\.\d+)?px$/.test(val)) {
      c.px++;
      const key = `${util}-[${val}]`;
      if (!(util === "text") && !/^(min-h|min-w|h|w)-\[44px\]$/.test(key)) pxNonFontNonTouch.set(key, (pxNonFontNonTouch.get(key) || 0) + 1);
    }
    chromeFiles.set(rel, (chromeFiles.get(rel) || 0) + 1);
    chromeVals.set(`${util}-[${val}]`, (chromeVals.get(`${util}-[${val}]`) || 0) + 1);
    chromeUtil.set(util, (chromeUtil.get(util) || 0) + 1);
  }
}
const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
console.log(JSON.stringify(stats));
console.log("distinct chrome values:", chromeVals.size, " distinct px non-font non-44 values:", pxNonFontNonTouch.size, " total of those:", [...pxNonFontNonTouch.values()].reduce((a,b)=>a+b,0));
console.log("\nChrome top files:"); for (const [k, v] of top(chromeFiles, 20)) console.log(String(v).padStart(5), k);
console.log("\nChrome top px (non-font, non-44) values:"); for (const [k, v] of top(pxNonFontNonTouch, 30)) console.log(String(v).padStart(5), k);
console.log("\nChrome by util:"); for (const [k, v] of top(chromeUtil, 15)) console.log(String(v).padStart(5), k);
