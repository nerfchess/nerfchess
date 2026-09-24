// ---------------------------------------------------------------------------
// test:cls: the layout shift guard.
//
//   npm run test:cls                       core routes, 390x844 + 1280x800,
//                                          dark, full motion, signed-out + user
//   npm run test:cls -- --auth user --net throttled --routes section4
//   npm run test:cls -- --update           rewrite the ceilings from this run
//   npm run test:cls -- --evidence NAME    also save the report to
//                                          docs/polish-pass/evidence/baseline/NAME.json
//
// Every dimension flag of polish:matrix works here too (--viewports, --themes,
// --anim, --auth, --net, --routes).
//
// The gate: each cell's CLS (web-vitals session window, input shifts
// excluded) must be at or under its ceiling in scripts/polish/cls-thresholds.json.
// A cell with no recorded ceiling is held to `target` (0.01, the brief's
// finding threshold). Recorded ceilings are the known debt at the time the
// guard was locked: they may only go DOWN. When a fix lands, run with
// --update so the ceiling follows it; a cell that now meets the target drops
// out of the file. Raising a ceiling by hand needs a reason in the commit.
//
// With --runs N the gate uses the best (lowest) run per cell, so one noisy
// dev-server load does not fail it, and --update records the worst run.
// Report JSON always goes to e2e/__screens__/polish/cls-latest.json (gitignored).
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { argNum, EVIDENCE_DIR, parseArgs, rel, round, SCRATCH_DIR, writeJson } from "./lib/common";
import type { CellResult } from "./lib/measure";
import { CORE } from "./lib/routes";
import { prepare, routesFrom, runCells, statesFrom } from "./lib/run";

const THRESHOLDS = path.join(__dirname, "cls-thresholds.json");

type Thresholds = { target: number; tolerance: number; note?: string; ceilings: Record<string, number> };

function load(): Thresholds {
  if (!fs.existsSync(THRESHOLDS)) return { target: 0.01, tolerance: 0.005, ceilings: {} };
  return JSON.parse(fs.readFileSync(THRESHOLDS, "utf8")) as Thresholds;
}

async function main() {
  const args = parseArgs();
  const routes = routesFrom(args, { routes: CORE });
  const states = statesFrom(args, { auths: ["signed-out", "user"] });
  const runs = Math.max(1, argNum(args, "runs", 1));
  const th = load();

  await prepare(routes, states, !args.flags.has("no-warm"));
  const all: CellResult[][] = [];
  for (let i = 0; i < runs; i++) {
    if (runs > 1) console.log(`[cls] run ${i + 1}/${runs}`);
    all.push(await runCells(routes, states, { label: "cls", cls: true }));
  }

  const key = (c: CellResult) => `${c.route}|${c.state}`;
  const byKey = new Map<string, CellResult[]>();
  for (const run of all) for (const c of run) byKey.set(key(c), [...(byKey.get(key(c)) ?? []), c]);

  const rows = [...byKey.entries()].map(([k, cs]) => {
    const vals = cs.map((c) => c.cls?.cls ?? NaN).filter((v) => Number.isFinite(v));
    const errors = cs.filter((c) => c.error).map((c) => c.error as string);
    const best = vals.length ? Math.min(...vals) : NaN;
    const worst = vals.length ? Math.max(...vals) : NaN;
    const ceiling = th.ceilings[k] ?? th.target;
    const worstCell = cs.reduce((a, c) => ((c.cls?.cls ?? -1) > (a.cls?.cls ?? -1) ? c : a), cs[0]);
    return {
      key: k,
      best,
      worst,
      ceiling,
      pass: vals.length > 0 && best <= ceiling + th.tolerance,
      overTarget: vals.length > 0 && best > th.target,
      errors,
      offenders: worstCell.cls?.offenders.slice(0, 4) ?? [],
      findings: worstCell.cls?.findings ?? [],
    };
  });

  const report = { generatedAt: new Date().toISOString(), target: th.target, runs, rows };
  writeJson(path.join(SCRATCH_DIR, "cls-latest.json"), report);
  const ev = args.values.get("evidence");
  if (ev) console.log(`[cls] evidence: ${rel(writeJson(path.join(EVIDENCE_DIR, "baseline", `${ev}.json`), report))}`);

  if (args.flags.has("update")) {
    const ceilings: Record<string, number> = { ...th.ceilings };
    for (const r of rows) {
      if (!Number.isFinite(r.worst)) continue;
      if (r.worst <= th.target) delete ceilings[r.key];
      else ceilings[r.key] = Math.ceil(r.worst * 1000) / 1000;
    }
    const sorted = Object.fromEntries(Object.entries(ceilings).sort(([a], [b]) => a.localeCompare(b)));
    writeJson(THRESHOLDS, { ...th, ceilings: sorted });
    console.log(`[cls] ceilings updated: ${Object.keys(sorted).length} cells above target recorded in ${rel(THRESHOLDS)}`);
    return;
  }

  const over = rows.filter((r) => r.overTarget);
  const failed = rows.filter((r) => !r.pass);
  console.log(`\n[cls] ${rows.length} cells, ${over.length} above target ${th.target}, ${failed.length} over ceiling`);
  for (const r of over) {
    const top = r.offenders[0];
    console.log(
      `  ${r.pass ? "debt" : "FAIL"}  ${r.key}  CLS ${round(r.best)}  ceiling ${r.ceiling}` +
        (top ? `  top: ${top.selector} dy ${top.maxDy}` : ""),
    );
  }
  for (const r of rows.filter((x) => x.errors.length)) console.log(`  ERROR ${r.key}: ${r.errors[0]}`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
