// Static check: @keyframes bodies stay on compositor-friendly properties.
//
// The house rule (docs/animation-design-brief.md, docs/design-system.md §6)
// is transform/opacity only. The codebase's own comments treat animated
// box-shadow as banned, yet ten keyframes had drifted into animating
// box-shadow, width, or background-color before the 2026-08 smoothness pass
// converted the worst (both infinite loops, the header search width, the
// square lockdown, the draft expiry pulse) to opacity cross-fades over
// pre-baked layers. This gate freezes the remainder: BASELINE lists every
// surviving offender, it may only SHRINK, and a stale entry fails loudly so
// a converted keyframe cannot silently stay listed.
//
// Run: npx -y tsx scripts/check-anim-props.ts
//
// What counts as an offense: a @keyframes body declaring any of the paint or
// layout properties below. clip-path is allowed (paint-only reveal, no
// layout); color/border-color inside keyframes are tolerated for now (cheap
// small-area repaints) but new box-shadow/filter/width/height/inset
// animation must not land.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..");
const BANNED = /\b(box-shadow|filter|backdrop-filter|width|height|top|left|right|bottom|margin[a-z-]*|padding[a-z-]*|background-color|background)\s*:/;

// Offenders grandfathered in at gate birth. Shrink-only: remove entries as
// their keyframes are converted; never add.
const BASELINE = new Set([
  "src/components/DraftOverlay.css::bank-pulse",
  "src/components/DraftOverlay.css::draft-timer-announce",
  "src/components/DraftOverlay.css::dock-pocket-flash",
  "src/components/effects/fruition/fruition.css::frx-frame",
  "src/components/effects/fruition/fruition.css::frx-frame-release",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".css")) out.push(full);
  }
  return out;
}

function keyframeBlocks(css: string): { name: string; body: string }[] {
  const out: { name: string; body: string }[] = [];
  const re = /@keyframes\s+([\w-]+)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    let depth = 1;
    let i = re.lastIndex;
    while (i < css.length && depth > 0) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
      i++;
    }
    out.push({ name: m[1], body: css.slice(re.lastIndex, i - 1) });
  }
  return out;
}

const files = walk(join(ROOT, "src"));
const found = new Set<string>();
const offenders: string[] = [];
for (const file of files) {
  const rel = relative(ROOT, file);
  const css = readFileSync(file, "utf8");
  for (const { name, body } of keyframeBlocks(css)) {
    // Ignore declarations that are part of a shorthand animation reset etc.;
    // scan property positions only.
    const bad = body
      .split(/[;{}]/)
      .map((line) => line.trim())
      .filter((line) => BANNED.test(line));
    if (bad.length === 0) continue;
    const key = `${rel}::${name}`;
    found.add(key);
    if (!BASELINE.has(key)) {
      offenders.push(`${key}\n      ${bad.join("\n      ")}`);
    }
  }
}

const stale = [...BASELINE].filter((k) => !found.has(k));

let failed = false;
if (offenders.length) {
  failed = true;
  console.error(
    `[check-anim-props] ${offenders.length} keyframe(s) animate paint/layout properties (transform/opacity only; see docs/animation-design-brief.md):\n\n  - ${offenders.join("\n  - ")}\n\n` +
      "  Convert to an opacity cross-fade over pre-baked layers (see .waiting-banner\n" +
      "  or .sq-locked in globals.css for the pattern). Never add to BASELINE.",
  );
}
if (stale.length) {
  failed = true;
  console.error(
    `[check-anim-props] ${stale.length} stale BASELINE entr(y/ies) - the keyframe was fixed or renamed; remove from the list:\n  - ${stale.join("\n  - ")}`,
  );
}
if (failed) process.exit(1);
console.log(
  `[check-anim-props] clean: ${files.length} css files scanned, ${BASELINE.size} grandfathered keyframe(s) remain (shrink-only)`,
);
