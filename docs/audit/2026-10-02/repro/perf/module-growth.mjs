// Module-level Set/Map/array that only ever grows (add/set/push, no delete/clear/splice/length reset).
import fs from "node:fs";
import path from "node:path";
const ROOT = "./src";
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(tsx?)$/.test(e.name)) files.push(p); } })(ROOT);
for (const f of files) {
  if (/\/engine\/|\.gen\.ts$|\/server\//.test(f)) continue; // client runtime only
  const src = fs.readFileSync(f, "utf8");
  const re = /^(?:export )?(?:const|let) (\w+)(?:\s*:\s*[^=]+)?\s*=\s*new (Set|Map|WeakMap|WeakSet)\b/gm; let m;
  while ((m = re.exec(src))) {
    const [, name, kind] = m; if (kind.startsWith("Weak")) continue;
    const grows = new RegExp(`\\b${name}\\.(add|set)\\(`).test(src);
    const shrinks = new RegExp(`\\b${name}\\.(delete|clear)\\(`).test(src) || (src.match(new RegExp(`\\b${name}\\s*=\\s*new`, "g")) || []).length > 1;
    if (grows && !shrinks) {
      const line = src.slice(0, m.index).split("\n").length;
      console.log(`${path.relative(".", f)}:${line} ${kind} ${name}`);
    }
  }
}
