// Rough scan of hover / press (active) states on interactive elements.
// Every <button ...> / <Link ...> / <a href ...> opening tag in src/**/*.tsx is
// extracted with brace-depth matching (so `onClick={() => x}` does not end the
// tag), and its className text, plus the text of any same-file const it names
// (className={navBtn}), is checked for a hover state (Tailwind hover:, or a
// shared class whose CSS defines :hover) and a press state (active:, .press,
// .card-juicy). Heuristic: a className built in a helper in another file is
// counted as "unknown".
import fs from "node:fs";
import path from "node:path";
const ROOT = "./src";
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d)) {
    const f = path.join(d, e);
    if (fs.statSync(f).isDirectory()) walk(f);
    else if (f.endsWith(".tsx")) files.push(f);
  }
})(ROOT);
// Collect every class selector with :hover / :active in the repo's CSS.
const cssFiles = [];
(function walk(d) {
  for (const e of fs.readdirSync(d)) {
    const f = path.join(d, e);
    if (fs.statSync(f).isDirectory()) walk(f);
    else if (f.endsWith(".css")) cssFiles.push(f);
  }
})(ROOT);
const hoverCls = new Set(), activeCls = new Set();
for (const f of cssFiles) {
  const css = fs.readFileSync(f, "utf8");
  for (const m of css.matchAll(/\.([a-zA-Z0-9_-]+)(?:[^{,]*?):hover/g)) hoverCls.add(m[1]);
  for (const m of css.matchAll(/\.([a-zA-Z0-9_-]+)(?:[^{,]*?):active/g)) activeCls.add(m[1]);
}
const hasCls = (text, set) => {
  for (const tok of text.split(/[^a-zA-Z0-9_-]+/)) if (set.has(tok)) return true;
  return false;
};
function tagEnd(src, i) {
  let depth = 0, q = null;
  for (; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === q && src[i - 1] !== "\\") q = null; continue; }
    if (depth > 0 && (c === '"' || c === "'" || c === "`")) { q = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ">" && depth === 0) return i;
  }
  return -1;
}
let total = 0, hover = 0, press = 0, neither = 0, noClass = 0;
const byTag = {}, perFileNeither = {};
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const re = /<(button|Link|a)[\s>]/g;
  let m;
  while ((m = re.exec(src))) {
    const end = tagEnd(src, m.index + 1);
    if (end < 0) continue;
    const body = src.slice(m.index, end);
    const tag = m[1];
    if (tag === "a" && !/href=/.test(body)) continue;
    total++;
    byTag[tag] = (byTag[tag] ?? 0) + 1;
    let text = body;
    // pull in same-file consts the className names
    const cm = body.match(/className=\{([\s\S]*)\}/);
    if (cm) {
      for (const id of cm[1].match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) ?? []) {
        const def = src.match(new RegExp(`(?:const|let)\\s+${id}\\s*=\\s*([\\s\\S]{0,600}?);`));
        if (def) text += " " + def[1];
      }
    }
    if (!/className=/.test(body)) noClass++;
    const h = /hover:/.test(text) || hasCls(text, hoverCls);
    const p = /active:/.test(text) || hasCls(text, activeCls);
    if (h) hover++;
    if (p) press++;
    if (!h && !p) {
      neither++;
      const rel = path.relative(".", f);
      perFileNeither[rel] = (perFileNeither[rel] ?? 0) + 1;
    }
  }
}
const top = Object.entries(perFileNeither).sort((a, b) => b[1] - a[1]).slice(0, 15);
console.log(JSON.stringify({ total, byTag, withHover: hover, withPress: press, neither, noClassNameAtAll: noClass, hoverClassesInCss: hoverCls.size, activeClassesInCss: activeCls.size, topFilesWithNeither: top }, null, 2));
