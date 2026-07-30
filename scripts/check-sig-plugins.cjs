// Single source of truth for the plugin card-id mirror list.
//
// Board.tsx suppresses the GENERATED fallback animation for any card a plugin
// module covers by consulting PLUGIN_ID_SET (built from PLUGIN_IDS in
// sigPlugins.tsx). That list must mirror the union of every plugin module's
// `PLAYS` keys EXACTLY: an id missing from the list plays the wrong (default)
// art over the hand-made one; a stale id renders no art at all.
//
// PLUGIN_IDS cannot be derived at runtime without eagerly importing the six
// plugin modules (~9k lines of render art) into the main bundle, which would
// defeat the code-split (the art is meant to ride the lazy signature-visuals
// chunk). So the list stays a STATIC, MACHINE-GENERATED array, and this script
// is the drift guard: it parses the real `PLAYS` keys straight from the plugin
// source and compares them to the committed list.
//
//   node scripts/check-sig-plugins.cjs           # verify (exit 1 on drift)
//   node scripts/check-sig-plugins.cjs --write    # regenerate the list in place
//
// The verify form is wired into `test:rules`, so drift can never ship: CI fails
// until the committed PLUGIN_IDS is regenerated. This replaces the old dev-only
// console.warn (which was stripped from production and so shipped silently).

const fs = require("fs");
const path = require("path");

const EFFECTS = path.join(__dirname, "..", "src", "components", "effects");
const SIG_PLUGINS = path.join(EFFECTS, "sigPlugins.tsx");
const SIG_MERGED = path.join(EFFECTS, "sigPluginsMerged.tsx");

// The set AND order of plugin modules is itself a single source of truth: the
// `MERGED` spread in sigPluginsMerged.tsx. Deriving it from there (rather than
// a second hardcoded list) means a newly-added plugin module is picked up
// automatically the moment it is spread into MERGED — no drift point between
// this check and the real registry. Order follows the spread order, which is
// the same precedence the registry resolves with.
function discoverModules() {
  const src = fs.readFileSync(SIG_MERGED, "utf8");
  // alias -> module file, from: import { PLAYS as GOD_PLAYS } from "./godPlays";
  const aliasToFile = new Map();
  const importRe = /import\s*{\s*PLAYS\s+as\s+(\w+)\s*}\s*from\s*["']\.\/(\w+)["']/g;
  let m;
  while ((m = importRe.exec(src))) aliasToFile.set(m[1], m[2]);

  // Spread order, from: const MERGED ... = { ...BASIC_PLAYS, ...GOD_PLAYS, ... }
  const mi = src.indexOf("const MERGED");
  if (mi < 0) throw new Error("sigPluginsMerged.tsx: no `const MERGED` found");
  const open = src.indexOf("{", mi);
  const close = src.indexOf("}", open);
  const body = src.slice(open, close);
  const modules = [];
  const spreadRe = /\.\.\.(\w+)/g;
  while ((m = spreadRe.exec(body))) {
    const alias = m[1];
    const file = aliasToFile.get(alias);
    if (!file) throw new Error(`sigPluginsMerged.tsx: MERGED spreads ${alias} with no matching PLAYS import`);
    modules.push({ file: `${file}.tsx`, label: `${file}.tsx` });
  }
  if (!modules.length) throw new Error("sigPluginsMerged.tsx: no plugin modules found in MERGED");
  return modules;
}

const MODULES = discoverModules();

const BEGIN = "// <plugin-ids:generated>";
const END = "// </plugin-ids:generated>";

const isIdentStart = (c) => /[A-Za-z_$]/.test(c);
const isIdentChar = (c) => /[A-Za-z0-9_$]/.test(c);

/**
 * Extract the TOP-LEVEL keys of a module's `export const PLAYS = { ... }`
 * object, in source order. A hand-rolled scanner that tracks bracket depth and
 * skips strings, template literals (with ${} interpolation), and comments, so
 * neither the JSX render art nor nested config objects can be mistaken for a
 * card key. Keys are read only at object depth 1, and only in "expect key"
 * position (right after the opening `{` or a top-level `,`).
 *
 * `marker` is the declaration to scan from, so the same scanner also reads
 * other big keyed tables in JSX modules that cannot be imported headlessly —
 * scripts/check-vfx-coverage.cjs uses it for BoardEffects' `SIGNATURES`.
 */
function extractPlayKeys(src, file, marker = "export const PLAYS") {
  const mi = src.indexOf(marker);
  if (mi < 0) throw new Error(`${file}: no "${marker}" found`);
  let i = src.indexOf("{", mi);
  if (i < 0) throw new Error(`${file}: no opening brace after ${marker}`);

  const keys = [];
  let depth = 0; // {} () [] combined nesting depth, relative to the object
  let mode = "code"; // code | line | block | sq | dq | tpl
  const tplReturn = []; // stack: brace depths at which a ${...} returns to tpl
  let expectKey = false; // at object depth 1, are we positioned before a key?

  for (; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];

    if (mode === "line") {
      if (c === "\n") mode = "code";
      continue;
    }
    if (mode === "block") {
      if (c === "*" && n === "/") {
        mode = "code";
        i++;
      }
      continue;
    }
    if (mode === "sq" || mode === "dq") {
      if (c === "\\") {
        i++;
        continue;
      }
      if ((mode === "sq" && c === "'") || (mode === "dq" && c === '"')) mode = "code";
      continue;
    }
    if (mode === "tpl") {
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === "`") {
        mode = "code";
        continue;
      }
      if (c === "$" && n === "{") {
        // Enter an interpolation: remember to pop back to tpl when the brace
        // that opens now closes.
        tplReturn.push(depth);
        depth++;
        i++;
        mode = "code";
        continue;
      }
      continue;
    }

    // mode === "code"
    if (c === "/" && n === "/") {
      mode = "line";
      i++;
      continue;
    }
    if (c === "/" && n === "*") {
      mode = "block";
      i++;
      continue;
    }
    if (c === "'") {
      mode = "sq";
      continue;
    }
    if (c === '"') {
      mode = "dq";
      continue;
    }
    if (c === "`") {
      mode = "tpl";
      continue;
    }

    if (c === "{" || c === "(" || c === "[") {
      depth++;
      // Entering the object body: the first key sits right after this brace.
      if (c === "{" && depth === 1) expectKey = true;
      continue;
    }
    if (c === "}" || c === ")" || c === "]") {
      depth--;
      if (depth === 0) break; // object closed
      // Closing an interpolation brace returns us to the template literal.
      if (c === "}" && tplReturn.length && tplReturn[tplReturn.length - 1] === depth) {
        tplReturn.pop();
        mode = "tpl";
      }
      continue;
    }

    if (depth === 1) {
      if (c === ",") {
        expectKey = true;
        continue;
      }
      if (c === "{") continue; // (handled above, kept for clarity)
      if (expectKey && isIdentStart(c)) {
        let j = i;
        while (j < src.length && isIdentChar(src[j])) j++;
        const ident = src.slice(i, j);
        // Skip spaces/tabs, then require a ':' to confirm it is a key.
        let k = j;
        while (k < src.length && (src[k] === " " || src[k] === "\t")) k++;
        if (src[k] === ":") {
          keys.push(ident);
          expectKey = false;
        }
        i = j - 1; // resume after the identifier
        continue;
      }
    }
  }
  if (depth !== 0) throw new Error(`${file}: unbalanced braces while scanning ${marker}`);
  return keys;
}

/** The committed PLUGIN_IDS string values, in file order, from sigPlugins.tsx. */
function committedIds(sigSrc) {
  const b = sigSrc.indexOf(BEGIN);
  const e = sigSrc.indexOf(END);
  if (b < 0 || e < 0 || e < b) {
    throw new Error(
      `sigPlugins.tsx: missing generated markers ${BEGIN} / ${END}. ` +
        `Run: node scripts/check-sig-plugins.cjs --write`,
    );
  }
  const block = sigSrc.slice(b + BEGIN.length, e);
  const out = [];
  const re = /"([^"]+)"/g;
  let m;
  while ((m = re.exec(block))) out.push(m[1]);
  return out;
}

/** Render the generated block body (between, not including, the markers). */
function renderBlock(groups) {
  const lines = [];
  lines.push("export const PLUGIN_IDS: readonly string[] = [");
  for (const g of groups) {
    lines.push(`  // ${g.label} (${g.ids.length})`);
    // Wrap ids ~6 per line for a readable, stable diff.
    for (let i = 0; i < g.ids.length; i += 6) {
      const chunk = g.ids.slice(i, i + 6).map((id) => `"${id}"`);
      lines.push("  " + chunk.join(", ") + ",");
    }
  }
  lines.push("];");
  return lines.join("\n");
}

function main() {
  const write = process.argv.includes("--write");

  const groups = MODULES.map((mod) => {
    const src = fs.readFileSync(path.join(EFFECTS, mod.file), "utf8");
    return { label: mod.label, ids: extractPlayKeys(src, mod.file) };
  });
  const derived = groups.flatMap((g) => g.ids);

  // Cross-module duplicate ids would make the merge order silently pick a
  // winner; surface them as a hard error.
  const seen = new Map();
  const dupes = [];
  for (const g of groups) {
    for (const id of g.ids) {
      if (seen.has(id)) dupes.push(`"${id}" (in ${seen.get(id)} and ${g.label})`);
      else seen.set(id, g.label);
    }
  }

  const sigSrc = fs.readFileSync(SIG_PLUGINS, "utf8");

  if (write) {
    const b = sigSrc.indexOf(BEGIN);
    const e = sigSrc.indexOf(END);
    if (b < 0 || e < 0 || e < b) {
      console.error(`sigPlugins.tsx: missing generated markers; add ${BEGIN} ... ${END} around PLUGIN_IDS.`);
      process.exit(1);
    }
    const next =
      sigSrc.slice(0, b + BEGIN.length) + "\n" + renderBlock(groups) + "\n" + sigSrc.slice(e);
    fs.writeFileSync(SIG_PLUGINS, next);
    console.log(`sig-plugins: wrote ${derived.length} ids across ${groups.length} modules to sigPlugins.tsx`);
    if (dupes.length) {
      console.error(`\nsig-plugins: duplicate ids across modules:\n  - ${dupes.join("\n  - ")}`);
      process.exit(1);
    }
    return;
  }

  const errors = [];
  if (dupes.length) errors.push(`duplicate ids across modules:\n    - ${dupes.join("\n    - ")}`);

  let committed;
  try {
    committed = committedIds(sigSrc);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const derivedSet = new Set(derived);
  const committedSet = new Set(committed);
  const missing = derived.filter((id) => !committedSet.has(id)); // covered but not listed
  const stale = committed.filter((id) => !derivedSet.has(id)); // listed but not covered
  if (missing.length) errors.push(`missing from PLUGIN_IDS (plugin art will be overridden by generated fallback): ${missing.join(", ")}`);
  if (stale.length) errors.push(`stale in PLUGIN_IDS (card renders no art): ${stale.join(", ")}`);
  if (!missing.length && !stale.length) {
    // Same set but different order also drifts the generated file; catch it so
    // `--write` output stays canonical.
    const a = derived.join(",");
    const c = committed.join(",");
    if (a !== c) errors.push("PLUGIN_IDS order differs from source order");
  }

  if (errors.length) {
    console.error("sig-plugins drift check FAILED:");
    for (const e of errors) console.error("  - " + e);
    console.error("\nFix: node scripts/check-sig-plugins.cjs --write");
    process.exit(1);
  }
  console.log(`sig-plugins: PLUGIN_IDS mirrors ${derived.length} plugin play keys across ${groups.length} modules`);
}

module.exports = { extractPlayKeys, committedIds, MODULES, EFFECTS, SIG_PLUGINS };

if (require.main === module) main();
