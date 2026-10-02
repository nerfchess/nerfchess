// Heuristic leak scan: for each useEffect/useLayoutEffect body in src/**/*.tsx?,
// flag subscriptions with no matching teardown in the same body.
import fs from "node:fs";
import path from "node:path";
const ROOT = "./src";
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(tsx?|ts)$/.test(e.name)) files.push(p); } })(ROOT);
const rules = [
  ["addEventListener", /\.addEventListener\(/g, /removeEventListener|once:\s*true|signal[,:\s}]/],
  ["setInterval", /\bsetInterval\(/g, /clearInterval/],
  ["requestAnimationFrame", /\brequestAnimationFrame\(/g, /cancelAnimationFrame/],
  ["Observer", /new (Resize|Intersection|Mutation|Performance)Observer\(/g, /\.disconnect\(\)/],
  ["setTimeout", /\bsetTimeout\(/g, /clearTimeout/],
  ["Worker", /new Worker\(/g, /terminate\(\)/],
];
const findings = []; let effects = 0;
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const re = /\buse(Layout)?Effect\(/g; let m;
  while ((m = re.exec(src))) {
    // find matching close paren of useEffect(
    let i = m.index + m[0].length, depth = 1, inStr = null;
    for (; i < src.length && depth > 0; i++) {
      const c = src[i];
      if (inStr) { if (c === "\\") { i++; continue; } if (c === inStr) inStr = null; continue; }
      if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
      if (c === "/" && src[i + 1] === "/") { const nl = src.indexOf("\n", i); i = nl < 0 ? src.length : nl; continue; }
      if (c === "/" && src[i + 1] === "*") { const e = src.indexOf("*/", i + 2); i = e < 0 ? src.length : e + 1; continue; }
      if (c === "(") depth++; else if (c === ")") depth--;
    }
    effects++;
    const body = src.slice(m.index, i);
    const line = src.slice(0, m.index).split("\n").length;
    for (const [name, open, close] of rules) {
      const n = (body.match(open) || []).length;
      if (n && !close.test(body)) findings.push(`${name.padEnd(22)} ${path.relative(".", f)}:${line} (x${n})`);
    }
  }
}
console.log(`effects scanned: ${effects} in ${files.length} files; flagged: ${findings.length}`);
const by = {}; for (const x of findings) { const k = x.split(" ")[0]; by[k] = (by[k] ?? 0) + 1; } console.log(by);
for (const x of findings.filter((x) => !x.startsWith("setTimeout"))) console.log(x);
