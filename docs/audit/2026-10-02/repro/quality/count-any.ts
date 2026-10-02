import ts from "../../../../../node_modules/typescript/lib/typescript.js";
import fs from "node:fs";
import path from "node:path";
const root = ".";
const targets = ["src", "worker.ts", "server", "arena-service", "engine-service", "scripts"];
function walk(p: string, out: string[]) {
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    const b = path.basename(p);
    if (["node_modules", "dist", ".next", "dist-server"].includes(b)) return;
    for (const f of fs.readdirSync(p)) walk(path.join(p, f), out);
  } else if (/\.(ts|tsx|mts|cts)$/.test(p) && !p.endsWith(".d.ts")) out.push(p);
}
const res: Record<string, { total: number; justified: number; hits: string[] }> = {};
for (const t of targets) {
  const files: string[] = [];
  walk(path.join(root, t), files);
  const r = (res[t] = { total: 0, justified: 0, hits: [] as string[] });
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, f.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const lines = src.split("\n");
    const visit = (n: ts.Node) => {
      if (n.kind === ts.SyntaxKind.AnyKeyword) {
        const { line } = sf.getLineAndCharacterOfPosition(n.getStart());
        const ctx = [lines[line - 2] ?? "", lines[line - 1] ?? "", lines[line]].join("\n");
        const justified = /\/\/|\/\*|eslint-disable/.test(ctx);
        r.total++;
        if (justified) r.justified++;
        r.hits.push(`${path.relative(root, f)}:${line + 1}${justified ? " [c]" : ""}: ${lines[line].trim().slice(0, 120)}`);
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
}
for (const [k, v] of Object.entries(res)) console.log(k, "total", v.total, "with-nearby-comment", v.justified);
console.log("---");
for (const v of Object.values(res)) for (const h of v.hits) console.log(h);
