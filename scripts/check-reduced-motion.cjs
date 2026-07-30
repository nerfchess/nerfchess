// Guard: nothing may import `useReducedMotion` from framer-motion.
//
//   node scripts/check-reduced-motion.cjs
//
// framer-motion's hook reads ONLY `(prefers-reduced-motion: reduce)`. It is
// blind to this app's own Settings → Animations switch, which sets
// `html[data-anim="off"]`. Seven components used it, so turning animations off
// in Settings stopped the CSS layer (globals.css has a `html[data-anim="off"] *`
// backstop) while every framer-motion animation kept running — a half-animated
// UI that is worse than either mode. It also captures its value at mount, so
// flipping the setting mid-session did nothing.
//
// @/lib/useReducedMotion checks both signals and stays live via a
// MutationObserver. This check keeps the wrong import from creeping back.

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");
const ALLOW = new Set([
  // The replacement's own doc comment names the banned symbol.
  path.join(SRC, "lib", "useReducedMotion.ts"),
]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const offenders = [];
for (const file of walk(SRC)) {
  if (ALLOW.has(file)) continue;
  const src = fs.readFileSync(file, "utf8");
  // Any framer-motion import statement that names useReducedMotion.
  const re = /import\s*\{[^}]*\buseReducedMotion\b[^}]*\}\s*from\s*["']framer-motion["']/g;
  let m;
  while ((m = re.exec(src))) {
    const line = src.slice(0, m.index).split("\n").length;
    offenders.push(`${path.relative(path.join(__dirname, ".."), file)}:${line}`);
  }
}

if (offenders.length) {
  console.error("reduced-motion check FAILED:");
  console.error(
    `  - ${offenders.length} file(s) import useReducedMotion from framer-motion, which ignores\n` +
      "    the in-app Animations setting (html[data-anim=\"off\"]):",
  );
  for (const o of offenders) console.error("      " + o);
  console.error('\nFix: import { useReducedMotion } from "@/lib/useReducedMotion";');
  process.exit(1);
}

console.log("reduced-motion: no framer-motion useReducedMotion imports");
