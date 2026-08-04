// Static check: no rounded corners on rectangular surfaces.
//
// The house rule (docs/design-system.md §5, docs/ui-research.md) is crisp 1px
// corners everywhere, with true circles reserved for avatars and status dots.
// globals.css already enforces most of it:
//
//   [class*="rounded"]:not([class*="rounded-full"]) { border-radius: 1px !important; }
//
// which means the ~190 `rounded-sm/md/lg` classes in the codebase render square
// today. They are a readability smell, not a visual bug, and this check ignores
// them deliberately.
//
// What that rule CANNOT reach is where the real violations live, and both are
// checked here:
//
//   1. `.css` files. The rule is an attribute selector on the class list, so a
//      component stylesheet setting its own `border-radius` bypasses it
//      entirely. This is how the lobby's primary CTA ended up with 9px lintel
//      corners: the roundest element in the product, on the biggest button.
//
//   2. `rounded-full` on a PADDED element. The class is deliberately exempt
//      from the global rule so avatars and dots stay circular, but on an
//      element that also carries px-*/py-* it produces a pill, which is a
//      rounded rectangle by another name.
//
// Run: npx -y tsx scripts/check-rounded.ts        (fails on any violation)
//      npx -y tsx scripts/check-rounded.ts --list (prints every finding)

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..");
const LIST = process.argv.includes("--list");

/** Radius values that are square, circular, or a capsule on a true dot. */
const ALLOWED_VALUES = new Set([
  "0",
  "0px",
  "1px",
  "2px",
  "50%",
  "999px",
  "9999px",
  "inherit",
  "initial",
  "unset",
]);

// Selectors whose radius IS the shape rather than a corner treatment: organic
// VFX blobs, the chest lid arch, gradient glows that have no visible edge.
// Each entry is a substring matched against the rule's selector text.
const SHAPE_EXEMPT = [
  ".draft-mythic-aura", // radial-gradient bloom, no visible edge
  ".pick-dissolve__flare", // gradient flare, no visible edge
  ".chest-lid", // deliberate organic arch on the treasure chest
  ".chest-lock__plate", // a lock plate reads as hardware, not a panel
  ".dgn-torch__flame", // a flame silhouette; the radius IS the shape
  ".us-f-ignite", // usage-beat flame lick; the radius IS the shape
  ".us-f-bloom", // usage-beat petal blob; organic by design
  ".podium-petal", // a falling flower petal; the radius IS the shape
  '[class*="rounded"]', // the global enforcement rule itself
  "primitives.css", // passive VFX pips at 6-12% of the viewport
  "effects.css", // organic VFX blobs
];

// Files where `rounded-full` on a padded element is intentional.
const PILL_EXEMPT: { file: string; why: string }[] = [
  {
    file: "src/components/effects/",
    why: "particle and glow layers: circular by construction",
  },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const findings: string[] = [];
const files = walk(join(ROOT, "src"));

// --- 1. border-radius in stylesheets ---------------------------------------
for (const file of files.filter((f) => f.endsWith(".css"))) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, "utf8");
  const lines = src.split("\n");
  lines.forEach((line, i) => {
    const m = /border-radius:\s*([^;]+);/.exec(line);
    if (!m) return;
    // `!important` is a flag, not a radius component (the global enforcement
    // rule in globals.css is itself `1px !important`).
    const value = m[1].replace(/!important/g, "").trim();
    // Every component of a shorthand has to be allowed ("9px 9px 3px 3px").
    const parts = value.split(/[\s/]+/).filter(Boolean);
    if (parts.every((p) => ALLOWED_VALUES.has(p))) return;
    // Look back for the selector this declaration belongs to.
    let selector = "";
    for (let k = i; k >= 0 && k > i - 40; k--) {
      if (lines[k].includes("{")) {
        selector = lines[k].replace("{", "").trim();
        break;
      }
    }
    if (SHAPE_EXEMPT.some((ex) => selector.includes(ex) || rel.includes(ex))) return;
    findings.push(`${rel}:${i + 1}  border-radius: ${value}   (${selector || "?"})`);
  });
}

// --- 2. rounded-full on a padded element -----------------------------------
// Heuristic by necessity: a class list carrying both `rounded-full` and a
// padding utility is a pill, not a dot. Scoped to the class attribute so it
// never trips on prose.
for (const file of files.filter((f) => f.endsWith(".tsx"))) {
  const rel = relative(ROOT, file);
  if (PILL_EXEMPT.some((ex) => rel.includes(ex.file))) continue;
  const src = readFileSync(file, "utf8");
  src.split("\n").forEach((line, i) => {
    if (!line.includes("rounded-full")) return;
    // Only the segment of the line that looks like a class list.
    // p-0 is no padding at all, so the element is a dot, not a pill.
    if (!/\bp[xy]-[1-9]|\bp-[1-9]/.test(line)) return;
    findings.push(`${rel}:${i + 1}  rounded-full on a padded element (pill)`);
  });
}

if (findings.length === 0) {
  console.log("[check-rounded] OK: no rounded rectangular surfaces in src");
  process.exit(0);
}

console.log(`[check-rounded] ${findings.length} violation(s):\n`);
for (const f of LIST ? findings : findings.slice(0, 40)) console.log("  " + f);
if (!LIST && findings.length > 40) console.log(`  ... and ${findings.length - 40} more (--list)`);
console.log(
  "\nThe house rule is crisp 1px corners on every rectangular surface " +
    "(docs/design-system.md). True circles (avatars, status dots) use rounded-full " +
    "WITHOUT padding. If a radius is genuinely the shape (an organic VFX blob, the " +
    "chest arch), add it to SHAPE_EXEMPT in this script with a reason.",
);
process.exit(1);
