// ---------------------------------------------------------------------------
// State-matrix runner (brief section 3.2).
//
//   ./node_modules/.bin/tsx scripts/polish/matrix.ts [options]     (npm run polish:matrix -- ...)
//
//   --routes     core | all | section4 | comma list ("/,/lobby,game")      default core
//   --viewports  360x780,390x844,768x1024,1280x800,1920x1080 | all        default 390x844,1280x800
//   --themes     dark,light | all                                         default dark
//   --anim       full,fast,off,reduced | all                              default full
//   --auth       signed-out,guest,user,mod,admin | all                    default signed-out
//   --net        normal,throttled,fast3g,cpu4 | all                       default normal
//   --probes     cls,console,flash                                        default cls,console
//   --screens    also save a settled viewport screenshot per cell, to
//                e2e/__screens__/polish/<label>/ (gitignored)
//   --flash-png  with the flash probe, save a key-moment strip PNG per cell
//                (to the scratch dir too; copy the ones that matter into evidence)
//   --label      output name; JSON goes to docs/polish-pass/evidence/matrix/<label>.json
//   --no-warm    skip the compile warm-up pass
//
// "all" on every dimension is 5 x 2 x 4 x 5 x 4 = 800 cells per route, which
// is hours; the defaults are the cheap slice. Needs the dev server on :3000;
// the auth states need `npm run polish:seed` once (run automatically if the
// session files are missing).
// ---------------------------------------------------------------------------

import path from "node:path";
import { argList, argStr, EVIDENCE_DIR, parseArgs, rel, stamp, writeJson } from "./lib/common";
import { prepare, routesFrom, runCells, statesFrom } from "./lib/run";
import { stateLabel } from "./lib/states";

const PROBES = ["cls", "console", "flash"] as const;

async function main() {
  const args = parseArgs();
  const routes = routesFrom(args);
  const states = statesFrom(args);
  const probes = argList(args, "probes", PROBES, ["cls", "console"]);
  const label = argStr(args, "label", `matrix-${stamp()}`);

  await prepare(routes, states, !args.flags.has("no-warm"));
  console.log(`[matrix] ${routes.length} routes x ${states.length} states = ${routes.length * states.length} cells, probes ${probes.join(",")}`);
  const cells = await runCells(routes, states, {
    label,
    cls: probes.includes("cls"),
    console: probes.includes("console"),
    flash: probes.includes("flash"),
    flashPngs: args.flags.has("flash-png"),
    screens: args.flags.has("screens"),
  });

  const summary = cells.map((c) => ({
    route: c.route,
    state: c.state,
    status: c.status,
    error: c.error,
    cls: c.cls?.cls,
    clsSum: c.cls?.total,
    shiftsOver001: c.cls?.findings.length,
    topOffender: c.cls?.offenders[0]?.selector,
    consoleErrors: c.console ? c.console.counts["console-error"] + c.console.counts.pageerror + c.console.counts["react-warning"] : undefined,
    http4xx5xx: c.console?.counts.http,
    flashMax: c.flash ? Math.max(0, ...c.flash.vsFinal.map((v) => v.diff.changedFraction)) : undefined,
  }));
  const out = writeJson(path.join(EVIDENCE_DIR, "matrix", `${label}.json`), {
    generatedAt: new Date().toISOString(),
    routes,
    states: states.map(stateLabel),
    probes,
    summary,
    cells,
  });
  console.log(`[matrix] wrote ${rel(out)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
