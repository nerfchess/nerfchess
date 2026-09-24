// Regression test for the transition gate in scripts/check-anim-props.ts
// (slice I, F191 / F192): the gate must fail on the layout-property and
// transition-all motion this pass removed, and pass on the fixed files.
//
//   ./node_modules/.bin/tsx scripts/polish/i/anim-props-test.ts
//
// Builds two throwaway trees under the OS temp dir: "before" holds the
// pre-fix EvalBar and TourCoachOverlay from commit b30d21c plus a CSS rule
// with `transition: all`, "after" holds the working-tree versions. Both carry
// the baselined files so only the fixtures decide the verdict.

import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const REPO = join(__dirname, "..", "..", "..");
const BEFORE_REV = "b30d21c";
const FIXED = ["src/components/EvalBar.tsx", "src/components/tutorial/TourCoachOverlay.tsx"];
const BASELINED = [
  "src/components/BuffCard.tsx",
  "src/components/NerfCard.tsx",
  "src/components/DraftOverlay.css",
  "src/components/effects/fruition/fruition.css",
];

function put(root: string, rel: string, text: string) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
}

function tree(kind: "before" | "after"): string {
  const root = mkdtempSync(join(tmpdir(), `anim-props-${kind}-`));
  for (const rel of BASELINED) put(root, rel, readFileSync(join(REPO, rel), "utf8"));
  for (const rel of FIXED) {
    const text =
      kind === "before"
        ? execFileSync("git", ["show", `${BEFORE_REV}:${rel}`], { cwd: REPO, encoding: "utf8" })
        : readFileSync(join(REPO, rel), "utf8");
    put(root, rel, text);
  }
  put(
    root,
    "src/fixture.css",
    kind === "before"
      ? ".a { transition: all 0.2s ease; }\n.b { transition: 0.2s; }\n.c { transition: height 300ms ease; }\n"
      : ".a { transition: opacity var(--dur-2) var(--ease-out); }\n.c { transition: none; }\n",
  );
  return root;
}

function run(root: string) {
  const r = spawnSync(join(REPO, "node_modules/.bin/tsx"), [join(REPO, "scripts/check-anim-props.ts")], {
    env: { ...process.env, ANIM_PROPS_ROOT: root },
    encoding: "utf8",
  });
  return { code: r.status, out: (r.stdout ?? "") + (r.stderr ?? "") };
}

const before = run(tree("before"));
const after = run(tree("after"));
const expectBefore = [
  "src/components/EvalBar.tsx",
  "src/components/tutorial/TourCoachOverlay.tsx",
  "src/fixture.css (3,",
];
const missing = expectBefore.filter((x) => !before.out.includes(x));
let ok = true;
if (before.code === 0 || missing.length) {
  ok = false;
  console.error(`FAIL before: exit ${before.code}, missing ${missing.join(", ")}\n${before.out}`);
}
if (after.code !== 0) {
  ok = false;
  console.error(`FAIL after: exit ${after.code}\n${after.out}`);
}
if (!ok) process.exit(1);
console.log("anim-props gate: fails on the pre-fix files (3 fixtures), passes on the fixed ones");
