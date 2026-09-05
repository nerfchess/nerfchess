// Static check: no em dashes (U+2014) in USER-FACING text.
//
// The project convention (docs/CHANGELOG.md, DESIGN.md) is that no em dash ever
// reaches the website UI. Em dashes in code COMMENTS are fine (they never
// render); the problem is only em dashes inside strings and JSX text that the
// browser actually paints.
//
// This walks the TypeScript AST rather than grepping lines, so it flags em
// dashes only inside the node kinds that can render as user-facing text
// (string literals, template literals, JSX text) and never inside comments,
// which the parser keeps out of those nodes automatically.
//
// Run: npx -y tsx scripts/check-emdash.ts        (fails on any violation)
//      npx -y tsx scripts/check-emdash.ts --list (prints every occurrence)

import * as ts from "typescript";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..");
const EM = "—";

// Directories to scan for user-facing text.
const SCAN_DIRS = ["src"];

// Files/dirs that are not user-facing website text, or where an em dash is
// data/identifier rather than copy. Kept deliberately small and explicit.
const IGNORE = [
  // Generated registries: derived from other sources, not authored copy.
  "src/lib/cardIconNames.gen.ts",
  "src/lib/cardIconComponents.gen.ts",
  // Demo/dev-only scaffolding never shipped in the product UI.
  "src/components/effects/vfx/demo.ts",
];

// String literals whose CONTENT is never rendered to users (attribute values,
// technical keys). An em dash here would be unusual, but excluding these keeps
// the check focused on copy. We detect by the parent node context.
function isNonRenderedStringContext(node: ts.StringLiteralLike): boolean {
  const p = node.parent;
  // import/export "module specifiers"
  if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return true;
  // JSX attribute values that are never text: className, style ids, data-*,
  // href/src/id/key/type/role. (aria-label / title / alt ARE user-facing.)
  if (ts.isJsxAttribute(p) && ts.isIdentifier(p.name)) {
    const attr = p.name.text;
    const rendered = new Set([
      "aria-label",
      "aria-description",
      "aria-roledescription",
      "title",
      "alt",
      "placeholder",
      "label",
    ]);
    if (rendered.has(attr)) return false;
    // Any other attribute (className, id, href, data-*, role, type...) is not
    // rendered as visible copy.
    return true;
  }
  return false;
}

function listFiles(dir: string, out: string[]) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(ROOT, full);
    if (IGNORE.includes(rel)) continue;
    const st = statSync(full);
    if (st.isDirectory()) {
      listFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
}

type Hit = { file: string; line: number; col: number; text: string };

function scanFile(file: string): Hit[] {
  const src = readFileSync(file, "utf8");
  if (!src.includes(EM)) return [];
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const hits: Hit[] = [];

  const record = (node: ts.Node, raw: string) => {
    if (!raw.includes(EM)) return;
    const pos = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    hits.push({
      file: relative(ROOT, file),
      line: pos.line + 1,
      col: pos.character + 1,
      text: raw.replace(/\s+/g, " ").trim().slice(0, 120),
    });
  };

  const visit = (node: ts.Node) => {
    if (ts.isStringLiteralLike(node)) {
      if (!isNonRenderedStringContext(node as ts.StringLiteralLike)) {
        record(node, node.text);
      }
    } else if (ts.isJsxText(node)) {
      record(node, node.text);
    } else if (
      ts.isTemplateExpression(node) ||
      ts.isNoSubstitutionTemplateLiteral(node)
    ) {
      // Template strings: check the literal chunks only (interpolations are
      // separate expressions visited on their own).
      if (ts.isNoSubstitutionTemplateLiteral(node)) {
        record(node, node.text);
      } else {
        record(node.head, node.head.text);
        for (const span of node.templateSpans) record(span.literal, span.literal.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return hits;
}

function main() {
  const listMode = process.argv.includes("--list");
  const files: string[] = [];
  for (const d of SCAN_DIRS) listFiles(join(ROOT, d), files);

  const all: Hit[] = [];
  for (const f of files) all.push(...scanFile(f));

  if (all.length === 0) {
    console.log("[check-emdash] OK: no user-facing em dashes in " + SCAN_DIRS.join(", "));
    return;
  }

  // Group by file for a readable report.
  const byFile = new Map<string, Hit[]>();
  for (const h of all) {
    if (!byFile.has(h.file)) byFile.set(h.file, []);
    byFile.get(h.file)!.push(h);
  }
  console.error(`[check-emdash] FAIL: ${all.length} user-facing em dash(es) in ${byFile.size} file(s):\n`);
  for (const [file, hits] of [...byFile.entries()].sort()) {
    console.error(`  ${file}`);
    for (const h of hits) {
      console.error(`    ${h.line}:${h.col}  ${h.text}`);
    }
  }
  console.error(
    "\nReplace each em dash with a period, comma, colon, parentheses, or a spaced hyphen ( - ).",
  );
  if (!listMode) process.exit(1);
}

main();
