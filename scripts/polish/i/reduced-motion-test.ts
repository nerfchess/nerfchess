// Regression test for the OS-variant gate in scripts/check-reduced-motion.cjs
// (slice I, F190): it must fail on the pre-fix PresenceBadge (motion-reduce:),
// TourCoachOverlay (motion-safe:) and globals.css (@media prefers-reduced-motion)
// from commit b30d21c, and pass on the working-tree versions.
//
//   ./node_modules/.bin/tsx scripts/polish/i/reduced-motion-test.ts

import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const REPO = join(__dirname, "..", "..", "..");
const FILES = ["src/components/PresenceBadge.tsx", "src/components/tutorial/TourCoachOverlay.tsx", "src/app/globals.css"];

function tree(kind: "before" | "after"): string {
  const root = mkdtempSync(join(tmpdir(), `reduced-motion-${kind}-`));
  for (const rel of FILES) {
    const text =
      kind === "before"
        ? execFileSync("git", ["show", `b30d21c:${rel}`], { cwd: REPO, encoding: "utf8" })
        : readFileSync(join(REPO, rel), "utf8");
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  return root;
}

function run(root: string) {
  const r = spawnSync("node", [join(REPO, "scripts/check-reduced-motion.cjs")], {
    env: { ...process.env, REDUCED_MOTION_ROOT: root },
    encoding: "utf8",
  });
  return { code: r.status, out: (r.stdout ?? "") + (r.stderr ?? "") };
}

const before = run(tree("before"));
const after = run(tree("after"));
const want = FILES.map((f) => `${f} (`);
const missing = want.filter((w) => !before.out.includes(w));
// The fixture trees hold none of the baselined files, so the "after" run only
// reports those as stale; any OS-variant failure there is a real regression.
const afterFailed = /OS-only motion gates/.test(after.out);
if (before.code === 0 || missing.length || afterFailed) {
  console.error(`FAIL\nbefore (exit ${before.code}, missing ${missing.join(", ")}):\n${before.out}\nafter:\n${after.out}`);
  process.exit(1);
}
console.log("reduced-motion gate: flags the 3 pre-fix files, passes the fixed ones");
