import ts from "../../../../../node_modules/typescript/lib/typescript.js";
import fs from "fs";
for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (n: ts.Node) => {
    if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && n.tagName.getText() === "Board") {
      console.log("==", file, sf.getLineAndCharacterOfPosition(n.pos).line + 1);
      let p: ts.Node | undefined = n.parent;
      while (p) {
        if (ts.isJsxElement(p)) {
          const o = p.openingElement;
          const ln = sf.getLineAndCharacterOfPosition(o.getStart()).line + 1;
          console.log("  ", ln, o.getText().replace(/\s+/g, " ").slice(0, 300));
        }
        p = p.parent;
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}
