// Extracts the static label of every <button>, <Button>, <LinkButton> and
// role="button" element under src/ (dev galleries and effects excluded) with
// the TypeScript parser, then classifies the first word: a known imperative
// verb, a known non-verb (noun/adjective/number), or unknown. Prints counts and
// the non-verb list. Heuristic: dynamic labels ({expr}) are reported as such.
import ts from "../../../../../node_modules/typescript";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = ".";
const SRC = join(ROOT, "src");
const SKIP = [/\/app\/dev\//, /\/components\/effects\//, /\/components\/dev\//, /\/app\/mod\//, /\/components\/mod\//, /AdminGodPanel/];

function walk(d: string, out: string[] = []): string[] {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const VERBS = new Set(
  (
    "accept add allow apply approve archive ask back ban block bookmark browse buy cancel change check choose claim clear close collapse confirm connect continue copy create decline delete deny disable dismiss done download draft draw drop edit email enable end enter expand explore export filter find finish flip follow forfeit get give go hide import invite join jump keep kick leave let load log make manage mark mute next offer open pass pause pick pin play post preview print queue rate read rebuild reconnect record redo refresh regenerate reject reload remove rename reopen replay report request rerun reroll reset resign restart restore resume retry return revert review roll run save search see select send set share show sign skip sort spectate start step stop submit suggest swap switch take tap try turn undo unblock unfollow unmute unpin update upload use verify view visit vote wait watch withdraw write zoom bank cast spend draft decline dismiss learn read reveal unban unmute promote demote suspend kill grant revoke purge seed bump nudge forget leave watch scrub " +
    "abort discard undo redo replace merge rescan recalc solve hint analyse analyze study"
  ).split(/\s+/),
);

type Row = { file: string; line: number; tag: string; label: string; aria?: string; dynamic: boolean };
const rows: Row[] = [];

function textOf(node: ts.Node, sf: ts.SourceFile): { text: string; dynamic: boolean } {
  let text = "";
  let dynamic = false;
  const visit = (n: ts.Node) => {
    if (ts.isJsxText(n)) text += " " + n.getText(sf).replace(/\s+/g, " ");
    else if (ts.isJsxExpression(n)) {
      if (n.expression && ts.isStringLiteral(n.expression)) text += n.expression.text;
      else if (n.expression) {
        // a {" "} or a conditional: mark dynamic, try to take string literal branches
        const e = n.expression;
        if (ts.isConditionalExpression(e) && ts.isStringLiteral(e.whenTrue) && ts.isStringLiteral(e.whenFalse)) text += " " + e.whenTrue.text + "|" + e.whenFalse.text;
        else dynamic = true;
      }
    } else if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
      // skip icon children and sr-only spans are still text
      const tag = ts.isJsxElement(n) ? n.openingElement.tagName.getText(sf) : n.tagName.getText(sf);
      if (ts.isJsxSelfClosingElement(n)) return; // icon or void element
      n.children.forEach(visit);
      return;
    } else ts.forEachChild(n, visit);
  };
  (node as ts.JsxElement).children.forEach(visit);
  return { text: text.replace(/\s+/g, " ").trim(), dynamic };
}

function attr(open: ts.JsxOpeningLikeElement, name: string, sf: ts.SourceFile): string | undefined {
  for (const p of open.attributes.properties) {
    if (ts.isJsxAttribute(p) && p.name.getText(sf) === name) {
      if (!p.initializer) return "";
      if (ts.isStringLiteral(p.initializer)) return p.initializer.text;
      return "{expr}";
    }
  }
  return undefined;
}

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  if (SKIP.some((r) => r.test(file))) continue;
  const src = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (n: ts.Node) => {
    if (ts.isJsxElement(n)) {
      const tag = n.openingElement.tagName.getText(sf);
      const role = attr(n.openingElement, "role", sf);
      if (tag === "button" || tag === "Button" || tag === "LinkButton" || role === "button") {
        const { text, dynamic } = textOf(n, sf);
        rows.push({ file: rel, line: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1, tag, label: text, aria: attr(n.openingElement, "aria-label", sf), dynamic });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}

const classify = (r: Row) => {
  const label = (r.label || (r.aria && r.aria !== "{expr}" ? r.aria : "")).replace(/^[^A-Za-z0-9]+/, "");
  if (!label) return r.dynamic || r.aria === "{expr}" ? "dynamic" : "empty";
  const first = label.split(/[\s|,.:!?]+/)[0].toLowerCase().replace(/[^a-z]/g, "");
  if (VERBS.has(first)) return "verb";
  return "nonverb";
};
const counts: Record<string, number> = {};
const nonverb: string[] = [];
for (const r of rows) {
  const c = classify(r);
  counts[c] = (counts[c] ?? 0) + 1;
  if (c === "nonverb") nonverb.push(`${r.file}:${r.line} <${r.tag}> "${(r.label || r.aria || "").slice(0, 60)}"`);
}
console.log("total", rows.length, counts);
const firstWords: Record<string, number> = {};
for (const r of rows) if (classify(r) === "nonverb") { const w = (r.label || r.aria || "").replace(/^[^A-Za-z0-9]+/, "").split(/\s+/)[0]; firstWords[w] = (firstWords[w] ?? 0) + 1; }
console.log("non-verb first words:", Object.entries(firstWords).sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w}:${n}`).join(" "));
writeFileSync(join(__dirname, "button-labels-nonverb.txt"), nonverb.join("\n") + "\n");
console.log("wrote button-labels-nonverb.txt with", nonverb.length, "rows");
