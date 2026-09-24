// ---------------------------------------------------------------------------
// polish:axe: axe-core accessibility scan per route and state. Report only.
//
//   npm run polish:axe                               core routes, 390x844 +
//                                                    1280x800, dark, signed-out
//   npm run polish:axe -- --routes all --themes dark,light --evidence axe-baseline
//
// Every dimension flag of polish:matrix works here too. Runs the WCAG 2.x A
// and AA rule sets after the page settles and groups violations by rule, with
// the first few offending node targets per rule. JSON goes to
// e2e/__screens__/polish/axe-latest.json, or with --evidence NAME to
// docs/polish-pass/evidence/axe/NAME.json.
// ---------------------------------------------------------------------------

import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { EVIDENCE_DIR, launch, parseArgs, rel, SCRATCH_DIR, writeJson } from "./lib/common";
import { settle } from "./lib/probe";
import { CORE } from "./lib/routes";
import { prepare, routesFrom, statesFrom } from "./lib/run";
import { navTimeout, openCell, stateLabel } from "./lib/states";

type Row = {
  route: string;
  state: string;
  error?: string;
  violations: { id: string; impact: string | null; help: string; nodes: number; targets: string[] }[];
};

async function main() {
  const args = parseArgs();
  const routes = routesFrom(args, { routes: CORE });
  const states = statesFrom(args);
  await prepare(routes, states, !args.flags.has("no-warm"));

  const browser = await launch();
  const rows: Row[] = [];
  try {
    for (const route of routes)
      for (const s of states) {
        const { ctx, page } = await openCell(browser, s, { probe: false });
        const row: Row = { route, state: stateLabel(s), violations: [] };
        try {
          await page.goto(route, { waitUntil: "domcontentloaded", timeout: navTimeout(s.net) });
          await settle(page, { quietMs: 1000 });
          const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
          row.violations = res.violations.map((v) => ({
            id: v.id,
            impact: v.impact ?? null,
            help: v.help,
            nodes: v.nodes.length,
            targets: v.nodes.slice(0, 4).map((n) => n.target.join(" ")),
          }));
        } catch (e) {
          row.error = (e as Error).message.split("\n")[0];
        }
        await ctx.close();
        rows.push(row);
        const n = row.violations.reduce((a, v) => a + v.nodes, 0);
        console.log(`  ${route}  ${row.state}  ${row.error ? "ERROR " + row.error : `${row.violations.length} rules, ${n} nodes`}${row.violations.length ? "  " + row.violations.map((v) => v.id).join(",") : ""}`);
      }
  } finally {
    await browser.close();
  }
  const ev = args.values.get("evidence");
  const file = ev ? path.join(EVIDENCE_DIR, "axe", `${ev}.json`) : path.join(SCRATCH_DIR, "axe-latest.json");
  console.log(`[axe] wrote ${rel(writeJson(file, { generatedAt: new Date().toISOString(), rows }))}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
