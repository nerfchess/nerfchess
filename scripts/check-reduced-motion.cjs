// Guard: nothing may import `useReducedMotion` from framer-motion.
//
//   node scripts/check-reduced-motion.cjs
//
// framer-motion's hook reads ONLY `(prefers-reduced-motion: reduce)`. It is
// blind to this app's own Settings → Animations switch, which sets
// `html[data-anim="off"]`. Seven components used it, so turning animations off
// in Settings stopped the CSS layer (globals.css has a `html[data-anim="off"] *`
// backstop) while every framer-motion animation kept running, a half-animated
// UI that is worse than either mode. It also captures its value at mount, so
// flipping the setting mid-session did nothing.
//
// @/lib/useReducedMotion checks both signals and stays live via a
// MutationObserver. This check keeps the wrong import from creeping back.
//
// The same blindness in two other places (added in the 2026-09 polish pass,
// slice I, F190). Tailwind's motion-safe: / motion-reduce: variants and a CSS
// @media (prefers-reduced-motion) block read only the OS flag, which the app
// honours only when the player opts in to Follow system motion (default off).
// Use the motion-on: / motion-off: variants (tailwind.config.ts) and
// html[data-anim="off"] selectors instead. OS_VARIANT_BASELINE holds the
// per-file counts at gate birth in files owned by other slices; it may only
// shrink, and a count that drops must be lowered here.
//
// Lastly it reports whether framer-motion's global gate (src/lib/motion.ts,
// installFramerGate) is imported by an always-mounted module; until it is,
// framer animations keep playing with Animations off (F186). SettingsBootstrap
// imports it since wave 2, so a missing import is now a failure.

const fs = require("fs");
const path = require("path");

// REDUCED_MOTION_ROOT points the check at another tree (the regression fixture
// in scripts/polish/i/reduced-motion-test.ts).
const ROOT = process.env.REDUCED_MOTION_ROOT || path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");
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

// --- OS-only motion variants and media queries --------------------------
const OS_VARIANT_BASELINE = {
  "src/app/community/CommunityClient.tsx": 1,
  "src/app/guide/glossary/page.tsx": 2,
  "src/app/lobby/page.tsx": 2,
  "src/app/play/PlayIntro.tsx": 2,
  "src/app/tournaments/page.tsx": 1,
  "src/app/u/[username]/page.tsx": 1,
  "src/components/BuffCard.tsx": 1,
  "src/components/GameOver.tsx": 1,
  "src/components/GlossaryTerm.tsx": 2,
  "src/components/MobileBuffDrawer.tsx": 1,
  "src/components/NerfCard.tsx": 1,
  "src/components/RatingChart.tsx": 1,
  "src/components/clip/clipStudio.css": 1,
  "src/components/codex/CardDetail.tsx": 1,
  "src/components/codex/CardInsights.tsx": 1,
  "src/components/guide/KeyTerms.tsx": 1,
  "src/components/profile/FriendsModule.tsx": 1,
};
const osOffenders = [];
const osStale = [];
const osSeen = new Set();
function walkAll(dir, out = []) {
  for (const entry of fs.readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) walkAll(full, out);
    else if (/\.(tsx|ts|css)$/.test(entry)) out.push(full);
  }
  return out;
}
for (const file of walkAll(SRC)) {
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  const src = fs.readFileSync(file, "utf8");
  const re = file.endsWith(".css")
    ? /@media[^{]*prefers-reduced-motion/g
    : /(?<![\w-])motion-(?:safe|reduce):/g;
  const n = (src.match(re) || []).length;
  const allowed = OS_VARIANT_BASELINE[rel] || 0;
  if (n) osSeen.add(rel);
  if (n > allowed) osOffenders.push(`${rel} (${n}, baseline ${allowed})`);
  else if (n < allowed) osStale.push(`${rel}: ${n} now, baseline says ${allowed}; lower it`);
}
for (const rel of Object.keys(OS_VARIANT_BASELINE)) {
  if (!osSeen.has(rel) && !osStale.some((x) => x.startsWith(rel + ":"))) {
    osStale.push(`${rel}: 0 now, baseline says ${OS_VARIANT_BASELINE[rel]}; remove it`);
  }
}

// --- framer-motion global gate -------------------------------------------
const GATE_HOSTS = ["src/app/layout.tsx", "src/components/SettingsBootstrap.tsx", "src/lib/useReducedMotion.ts"];
const gateInstalled = GATE_HOSTS.some((rel) => {
  const f = path.join(ROOT, rel);
  return fs.existsSync(f) && /from\s+["']@\/lib\/motion["']|import\s+["']@\/lib\/motion["']/.test(fs.readFileSync(f, "utf8"));
});

let failed = false;
if (osOffenders.length) {
  failed = true;
  console.error("reduced-motion check FAILED: OS-only motion gates (motion-safe: / motion-reduce: / @media prefers-reduced-motion):");
  for (const o of osOffenders) console.error("      " + o);
  console.error(
    '\nFix: use motion-on: / motion-off: (tailwind.config.ts) or html[data-anim="off"] selectors;\n' +
      "the OS flag reaches data-anim through applyUiPrefs when the player opts in.",
  );
}
if (osStale.length) {
  failed = true;
  console.error("reduced-motion check: stale OS_VARIANT_BASELINE:\n  - " + osStale.join("\n  - "));
}
if (!gateInstalled) {
  failed = true;
  console.error(
    `reduced-motion check FAILED: framer-motion is not gated by data-anim; none of ${GATE_HOSTS.join(", ")} imports "@/lib/motion" (F186)`,
  );
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
if (failed) process.exit(1);

console.log(
  "reduced-motion: no framer-motion useReducedMotion imports; OS-only motion variants at or under baseline " +
    `(${Object.values(OS_VARIANT_BASELINE).reduce((a, b) => a + b, 0)} grandfathered)` +
    (gateInstalled ? "; framer gate installed" : ""),
);
