// Exported identifiers in src/{components,lib,engine} never mentioned in any other file (heuristic).
import fs from "node:fs"; import path from "node:path";
const root = ".";
const walk = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (["node_modules", ".next", "dist", "dist-server", ".open-next"].includes(e.name)) continue; const p = path.join(d, e.name); e.isDirectory() ? walk(p, out) : out.push(p); } return out; };
const all = [...walk(root + "/src"), ...walk(root + "/scripts"), ...walk(root + "/e2e"), ...walk(root + "/server"), ...walk(root + "/arena-service"), ...walk(root + "/engine-service"), root + "/worker.ts"].filter((f) => /\.(ts|tsx|mjs|cjs|js)$/.test(f));
const users = new Map();
for (const f of all) { const t = fs.readFileSync(f, "utf8"); for (const w of new Set(t.match(/[A-Za-z_$][\w$]*/g) ?? [])) { let s = users.get(w); if (!s) users.set(w, (s = new Set())); s.add(f); } }
const out = {};
let total = 0, dead = 0;
for (const f of all.filter((f) => /\/src\/(components|lib|engine)\//.test(f) && /\.(ts|tsx)$/.test(f))) {
  const t = fs.readFileSync(f, "utf8");
  for (const m of t.matchAll(/^export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|const|let|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/gm)) {
    total++;
    const name = m[1];
    const s = users.get(name);
    const others = s ? [...s].filter((x) => x !== f).length : 0;
    if (others === 0) {
      // used inside own file (beyond the declaration)? still an unneeded export
      const selfUses = (t.match(new RegExp(`\\b${name.replace(/\$/g, "\\$")}\\b`, "g")) ?? []).length;
      dead++;
      const key = path.relative(root, f).split("/").slice(0, 3).join("/");
      (out[key] ??= []).push(`${path.relative(root, f)}:${name}${selfUses > 1 ? " (used locally)" : " (UNUSED)"}`);
    }
  }
}
console.log("exports scanned:", total, "never named in another file:", dead);
const unusedAll = Object.values(out).flat().filter((x) => x.endsWith("(UNUSED)"));
console.log("of which not even used in own file:", unusedAll.length);
for (const [k, v] of Object.entries(out).sort((a, b) => b[1].length - a[1].length)) console.log(k, v.length);
console.log("--- UNUSED anywhere ---"); console.log(unusedAll.join("\n"));
