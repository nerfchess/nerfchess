// Summarize NODE_V8_COVERAGE output for src/engine files: function coverage and block (branch-ish) coverage.
import fs from "node:fs"; import path from "node:path";
const dir = process.argv[2]; const filter = process.argv[3] ?? "/src/engine/";
const per = new Map();
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  for (const s of j.result) {
    if (!s.url.includes(filter) || s.url.includes("node_modules")) continue;
    const key = s.url.replace(/^file:\/\//, "").replace(/\?.*$/, "");
    let e = per.get(key); if (!e) per.set(key, (e = { fns: new Map(), blocks: new Map() }));
    for (const fn of s.functions) {
      const r0 = fn.ranges[0];
      const fk = `${fn.functionName}@${r0.startOffset}`;
      e.fns.set(fk, (e.fns.get(fk) ?? 0) + r0.count);
      if (fn.isBlockCoverage) for (const r of fn.ranges.slice(1)) { const bk = `${r.startOffset}-${r.endOffset}`; e.blocks.set(bk, (e.blocks.get(bk) ?? 0) + r.count); }
    }
  }
}
let F = 0, Fc = 0, B = 0, Bc = 0; const rows = [];
for (const [k, e] of per) {
  const f = e.fns.size - 1, fc = [...e.fns.entries()].filter(([n, c]) => n.startsWith("@0") ? false : c > 0).length; // drop module wrapper
  const b = e.blocks.size, bc = [...e.blocks.values()].filter((c) => c > 0).length;
  F += f; Fc += fc; B += b; Bc += bc;
  rows.push([k.split("/src/")[1], f, fc, b, bc]);
}
console.log(`files ${per.size}; functions ${Fc}/${F} = ${(100 * Fc / F).toFixed(1)}%; blocks with count>0 ${Bc}/${B} = ${(100 * Bc / B).toFixed(1)}%`);
console.log("NOTE: V8 only reports blocks it instrumented; unexecuted functions contribute no inner blocks, so block % is optimistic.");
rows.sort((a, b) => (b[1] - b[2]) - (a[1] - a[2]));
for (const r of rows.slice(0, 15)) console.log(`${r[0]}: fns ${r[2]}/${r[1]} blocks ${r[4]}/${r[3]}`);
