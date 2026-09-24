// ---------------------------------------------------------------------------
// test:console: console and network hygiene guard (brief section 3.6).
//
//   npm run test:console                  core routes, 1280x800, dark,
//                                         signed-out + user
//   npm run test:console -- --update      accept the current set as the baseline
//   npm run test:console -- --evidence NAME   also save to docs/polish-pass/evidence/baseline/
//
// Every dimension flag of polish:matrix works here too.
//
// Per route and auth state it collects console errors, React warnings,
// uncaught page errors, failed requests and 4xx/5xx responses. Items are
// compared by normalized signature (ids and numbers stripped) against
// scripts/polish/console-baseline.json. The gate fails only on a signature
// the baseline does not already list: known debt is recorded, new noise is
// not allowed in. Fixing debt and re-running with --update shrinks the file.
// Plain console warnings (e.g. Chrome's AudioContext autoplay notice) are
// reported but never gate.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { EVIDENCE_DIR, parseArgs, rel, SCRATCH_DIR, writeJson } from "./lib/common";
import type { HygieneItem } from "./lib/hygiene";
import { CORE } from "./lib/routes";
import { prepare, routesFrom, runCells, statesFrom } from "./lib/run";

const BASELINE = path.join(__dirname, "console-baseline.json");

type Baseline = { note?: string; known: Record<string, string[]> };

const GATED: HygieneItem["kind"][] = ["console-error", "react-warning", "pageerror", "http", "requestfailed"];

async function main() {
  const args = parseArgs();
  const routes = routesFrom(args, { routes: CORE });
  const states = statesFrom(args, { viewports: ["1280x800"], auths: ["signed-out", "user"] });
  const base: Baseline = fs.existsSync(BASELINE)
    ? (JSON.parse(fs.readFileSync(BASELINE, "utf8")) as Baseline)
    : { known: {} };

  await prepare(routes, states, !args.flags.has("no-warm"));
  const cells = await runCells(routes, states, { label: "console", console: true });

  // Keyed by route and auth state: viewport and theme rarely change what errors.
  const found = new Map<string, Map<string, HygieneItem>>();
  for (const c of cells) {
    const auth = c.state.split("|")[3];
    const k = `${c.route}|${auth}`;
    const m = found.get(k) ?? new Map<string, HygieneItem>();
    for (const i of c.console?.items ?? []) if (GATED.includes(i.kind)) m.set(`${i.kind}: ${i.sig}`, i);
    if (c.error) m.set(`load: ${c.error}`, { kind: "pageerror", text: c.error, sig: c.error });
    found.set(k, m);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    routes: [...found.entries()].map(([k, m]) => ({
      key: k,
      items: [...m.entries()].map(([sig, i]) => ({ sig, text: i.text, url: i.url })),
    })),
    warnings: cells.flatMap((c) =>
      (c.console?.items ?? []).filter((i) => i.kind === "console-warning").map((i) => `${c.route}: ${i.text.slice(0, 140)}`),
    ).filter((v, i, a) => a.indexOf(v) === i),
    apiCallCounts: cells.map((c) => ({
      route: c.route,
      state: c.state,
      calls: Object.entries(
        (c.console?.apiCalls ?? []).reduce<Record<string, number>>((acc, a) => {
          const p = a.url.split("?")[0];
          acc[p] = (acc[p] ?? 0) + 1;
          return acc;
        }, {}),
      ).sort((a, b) => b[1] - a[1]),
    })),
  };
  writeJson(path.join(SCRATCH_DIR, "console-latest.json"), report);
  const ev = args.values.get("evidence");
  if (ev) console.log(`[console] evidence: ${rel(writeJson(path.join(EVIDENCE_DIR, "baseline", `${ev}.json`), report))}`);

  if (args.flags.has("update")) {
    const known: Record<string, string[]> = { ...base.known };
    for (const [k, m] of found) {
      if (m.size) known[k] = [...m.keys()].sort();
      else delete known[k];
    }
    writeJson(BASELINE, { ...base, known: Object.fromEntries(Object.entries(known).sort(([a], [b]) => a.localeCompare(b))) });
    console.log(`[console] baseline updated in ${rel(BASELINE)}`);
    return;
  }

  let fresh = 0;
  let debt = 0;
  for (const [k, m] of found) {
    const known = new Set(base.known[k] ?? []);
    for (const [sig, i] of m) {
      if (known.has(sig)) {
        debt++;
        continue;
      }
      fresh++;
      console.log(`  NEW  ${k}  ${sig}\n       ${i.text.slice(0, 200)}`);
    }
  }
  console.log(`\n[console] ${cells.length} cells, ${debt} known item(s), ${fresh} new`);
  if (fresh) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
