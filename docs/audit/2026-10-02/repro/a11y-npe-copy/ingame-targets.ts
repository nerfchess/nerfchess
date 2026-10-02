// Static estimate of raw <button> / role="button" hit areas in the in-game
// surfaces that e2e/sweep.spec.ts never opens (it measures each route at load,
// so the promotion picker, targeting tray, draft overlay, game-over modal and
// in-game menus are never on screen when it measures). Flags a raw button whose
// className literal has no explicit 44px+ floor (min-h-[44px], h-11, h-12,
// min-h-11, size-11, w-11 h-11 ...) and whose vertical padding + text size
// plausibly lands under 44px. Heuristic, read-only.
import ts from "../../../../../node_modules/typescript";
import { readFileSync } from "node:fs";
import { relative } from "node:path";

const ROOT = ".";
const FILES = [
  "src/components/Board.tsx",
  "src/components/DraftOverlay.tsx",
  "src/components/OnlineMatch.tsx",
  "src/components/GameOver.tsx",
  "src/app/game/page.tsx",
  "src/components/dock/targeting.tsx",
  "src/components/dock/DockRow.tsx",
  "src/components/dock/BuffDock.tsx",
  "src/components/dock/bits.tsx",
  "src/components/dock/DockAgainstYou.tsx",
  "src/components/MoveList.tsx",
  "src/components/MoveStrip.tsx",
  "src/components/ChatPanel.tsx",
  "src/components/OpponentDraftViewer.tsx",
  "src/components/board/BoardTools.tsx",
].map((f) => `${ROOT}/${f}`);

const FLOOR = /(min-h-\[(4[4-9]|[5-9]\d)px\]|\bh-1[1-9]\b|\bh-\[(4[4-9]|[5-9]\d)px\]|min-h-1[1-9]\b|\bsize-1[1-9]\b|\bh-full\b|\binset-0\b|\bh-1[4-6]\b|\bw-14 h-14\b)/;
let flagged = 0,
  total = 0;
for (const file of FILES) {
  let src: string;
  try {
    src = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (n: ts.Node) => {
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      const tag = n.tagName.getText(sf);
      let role: string | undefined, cls = "";
      for (const p of n.attributes.properties) {
        if (!ts.isJsxAttribute(p)) continue;
        const name = p.name.getText(sf);
        if (name === "role" && p.initializer && ts.isStringLiteral(p.initializer)) role = p.initializer.text;
        if (name === "className" && p.initializer) cls = p.initializer.getText(sf);
      }
      if (tag === "button" || role === "button") {
        total++;
        if (!FLOOR.test(cls)) {
          const py = /\bpy-(0\.5|1|1\.5|2)\b|\bp-(0\.5|1|1\.5)\b|\bpy-\[[0-9]px\]/.test(cls);
          const small = /text-\[1[0-3]px\]|text-xs|text-sm/.test(cls);
          if (py || small) {
            flagged++;
            const line = sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
            console.log(`${relative(ROOT, file)}:${line}  ${cls.replace(/\s+/g, " ").slice(0, 150)}`);
          }
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}
console.log(`\nraw buttons scanned=${total} likely-under-44px=${flagged}`);
