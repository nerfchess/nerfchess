/**
 * Guard for F033 (brief section 8): every route segment that can fail has an
 * error boundary that looks like the site, logs, and offers a way back.
 *
 *  1. Every `error.tsx` under src/app renders the shared RouteError body (which
 *     logs the error, shows the digest, wires Retry to Next's `retry()` and
 *     offers a way out) and hands it `retry`.
 *  2. `global-error.tsx` cannot use RouteError (the root layout and globals.css
 *     are gone when it renders), so its own contract is checked: a <title>, a
 *     console.error, a Retry wired to retry or reset, a way out, no shadow,
 *     no glow, no blur, no transition, and no text under 12px.
 *  3. Segments that fetch or rebuild state on the client and whose parent
 *     boundary would say the wrong thing have a scoped boundary of their own.
 *
 * Run: ./node_modules/.bin/tsx scripts/check-error-boundaries.ts
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const APP = path.join(ROOT, "src", "app");
const failures: string[] = [];

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = walk(APP);
const rel = (f: string) => path.relative(ROOT, f);

// 1. every error.tsx goes through RouteError
const boundaries = files.filter((f) => path.basename(f) === "error.tsx");
for (const f of boundaries) {
  const src = fs.readFileSync(f, "utf8");
  if (!/from "@\/components\/ui\/RouteError"/.test(src) || !/<RouteError\b/.test(src)) {
    failures.push(`${rel(f)}: does not render RouteError (no log, no digest, no shared Retry and way out)`);
  }
  if (!/\bretry\b/.test(src)) failures.push(`${rel(f)}: does not pass Next's retry() to RouteError`);
}

// 2. global-error.tsx contract
const globalError = path.join(APP, "global-error.tsx");
if (!fs.existsSync(globalError)) {
  failures.push("src/app/global-error.tsx is missing");
} else {
  const src = fs.readFileSync(globalError, "utf8");
  const code = src.replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
  const checks: [boolean, string][] = [
    [/<title>/.test(code), "has no <title>"],
    [/console\.error\(/.test(code), "does not log the error"],
    [/onClick=\{\s*(retry|reset)/.test(code), "has no Retry wired to retry() or reset()"],
    [/href="\/[a-z]*"/.test(code), "has no way out link"],
    [!/box-?shadow/i.test(code), "uses a shadow"],
    [!/text-?shadow/i.test(code), "uses a text shadow"],
    [!/backdrop|blur\(/i.test(code), "uses a blur"],
    [!/transition/i.test(code), "declares a transition"],
    [!/uppercase/i.test(code), "uses the retired uppercase caption"],
  ];
  for (const [ok, msg] of checks) if (!ok) failures.push(`src/app/global-error.tsx ${msg}`);
  for (const m of code.matchAll(/font-?size\s*:\s*"?(\d+(?:\.\d+)?)px/gi)) {
    if (Number(m[1]) < 12) failures.push(`src/app/global-error.tsx: ${m[1]}px text is under the 12px caption floor`);
  }
}

// 3. scoped boundaries that must exist
const REQUIRED = [
  "src/app/error.tsx",
  "src/app/achievements/error.tsx",
  "src/app/analysis/error.tsx",
  "src/app/codex/error.tsx",
  "src/app/codex/suggest/error.tsx",
  "src/app/history/error.tsx",
  "src/app/history/[id]/error.tsx",
  "src/app/puzzles/error.tsx",
  "src/app/puzzles/[id]/error.tsx",
  "src/app/stats/error.tsx",
  "src/app/tutorial/error.tsx",
];
for (const r of REQUIRED) if (!fs.existsSync(path.join(ROOT, r))) failures.push(`${r} is missing`);

console.log(`error boundaries: ${boundaries.length} error.tsx files checked, ${REQUIRED.length} required`);
if (failures.length) {
  console.error(`\ncheck-error-boundaries: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log("check-error-boundaries: ok");
