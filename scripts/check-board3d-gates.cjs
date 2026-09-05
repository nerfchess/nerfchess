// Guard for the WebGL board layer: three.js must be imported by exactly one
// file (the engine), and that file must only ever be reached through a dynamic
// import, so no page pays for it until a board actually plays a 3D effect.
//
// Run: node scripts/check-board3d-gates.cjs

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const ENGINE = "src/components/effects/board3d/engine3d.ts";

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|mts|cts)$/.test(entry)) out.push(full);
  }
  return out;
}

const problems = [];
for (const file of walk(path.join(ROOT, "src"))) {
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  const src = fs.readFileSync(file, "utf8");
  const staticThree = /^\s*import\s[^;]*from\s+["']three(\/|["'])/m.test(src);
  if (staticThree && rel !== ENGINE) problems.push(`${rel}: static import of three (only ${ENGINE} may)`);
  // Type-only imports are erased at build time and are fine anywhere.
  const valueImports = src.replace(/^\s*import\s+type\s[^;]*;/gm, "");
  if (rel !== ENGINE && /from\s+["'][^"']*engine3d["']/.test(valueImports)) {
    problems.push(`${rel}: static import of engine3d (use import("./engine3d"))`);
  }
}
if (!fs.existsSync(path.join(ROOT, ENGINE))) problems.push(`${ENGINE} missing`);

if (problems.length) {
  console.error(`[check-board3d-gates] ${problems.length} problem(s):`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log("[check-board3d-gates] OK: three.js is confined to the lazily loaded engine");
