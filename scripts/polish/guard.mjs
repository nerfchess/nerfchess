#!/usr/bin/env node
// Fast pre-push aggregate (brief section 8, F250): runs every cheap, offline
// guard (no dev server, no build, no browser) one after another, keeps going
// past a failure, and prints one summary line per guard plus the tail of each
// failing guard's output. About 20 seconds on the 4-core box.
//
//   npm run guard            # all cheap guards
//   npm run guard -- email   # only the guards whose name contains "email"
//
// CI runs the same list (.github/workflows/guards.yml), so a green `npm run
// guard` before pushing means the guards job will be green too. Guards that
// need the dev server (test:cls, test:console, test:seo-dupes, test:jsonld,
// test:api-fuzz, test:headers, test:codex-routes, test:auth-safety) and the
// engine suites that build dist-server are not in this list; run them when
// you touch what they cover.
import { spawnSync } from "node:child_process";

export const CHEAP_GUARDS = [
  "test:emdash",
  "test:case",
  "test:buttons",
  "test:rounded",
  "test:reduced-motion",
  "test:anim-props",
  "test:sound",
  "test:usage",
  "test:board3d",
  "test:retired",
  "test:card-registry",
  "test:prepaint",
  "test:error-boundaries",
  "test:codex-routes:static",
  "test:seo-static",
  "test:sitemap-dates",
  "test:api-unit",
  "test:text-input",
  "test:auth-safety:unit",
  "test:email",
  "test:custom-bg-url",
  "test:seat-superseded",
  "test:socket-guard",
  "test:realtime-rules",
];

const filter = process.argv.slice(2);
const list = filter.length ? CHEAP_GUARDS.filter((g) => filter.some((f) => g.includes(f))) : CHEAP_GUARDS;
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const failed = [];
const t0 = Date.now();
for (const name of list) {
  const start = Date.now();
  const r = spawnSync(npm, ["run", "-s", name], { encoding: "utf8", env: { ...process.env, FORCE_COLOR: "0" } });
  const secs = ((Date.now() - start) / 1000).toFixed(1);
  const ok = r.status === 0;
  console.log(`${ok ? "ok  " : "FAIL"} ${name} (${secs}s)`);
  if (!ok) failed.push({ name, out: `${r.stdout ?? ""}${r.stderr ?? ""}` });
}
for (const f of failed) {
  const tail = f.out.trim().split("\n").slice(-15).join("\n");
  console.log(`\n--- ${f.name} ---\n${tail}`);
}
console.log(`\n${list.length - failed.length} of ${list.length} guards passed in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
process.exit(failed.length ? 1 : 0);
