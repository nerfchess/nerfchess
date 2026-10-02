// List addEventListener / setInterval / rAF / new Worker / new AudioContext sites
// that are NOT inside a useEffect body (module level, callbacks, classes).
import fs from "node:fs";
import path from "node:path";
const ROOT = "./src";
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(tsx?)$/.test(e.name)) files.push(p); } })(ROOT);
const pat = /\.addEventListener\(|\bsetInterval\(|new Worker\(|new \(?window\.AudioContext|new AudioContext/g;
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const ranges = []; const re = /\buse(Layout)?Effect\(/g; let m;
  while ((m = re.exec(src))) { let i = m.index + m[0].length, d = 1; for (; i < src.length && d > 0; i++) { if (src[i] === "(") d++; else if (src[i] === ")") d--; } ranges.push([m.index, i]); }
  let p; while ((p = pat.exec(src))) {
    if (ranges.some(([a, b]) => p.index >= a && p.index < b)) continue;
    const line = src.slice(0, p.index).split("\n").length;
    const text = src.split("\n")[line - 1].trim().slice(0, 110);
    console.log(`${path.relative(".", f)}:${line}  ${text}`);
  }
}
