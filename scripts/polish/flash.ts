// ---------------------------------------------------------------------------
// test:flash: hydration and flash detector (brief section 3.4). Report only.
//
//   npm run test:flash                          core routes, 390x844, dark +
//                                               light, signed-out + user
//   npm run test:flash -- --routes /lobby --themes light --auth user --png
//   npm run test:flash -- --evidence NAME       save the JSON (and, with --png,
//                                               the strips) under
//                                               docs/polish-pass/evidence/flash/NAME/
//
// Every dimension flag of polish:matrix works here too.
//
// For each cell a CDP screencast records the whole load. The frames on screen
// at first contentful paint, DOMContentLoaded, hydration, and when the first
// /api/auth/me and /api/users/settings answers land are pixel-diffed against
// the settled page (network idle plus 1.5s) and against each other. Each
// changed region is labelled with the element now under it. A region that is
// not content arriving in a box that was already reserved for it (theme,
// board colours, fonts, header shape, late banners) is a finding.
//
// With --png, a strip per cell (key moments with changed regions outlined in
// red, then the settled frame) goes to e2e/__screens__/polish/flash/ or, with
// --evidence, next to the JSON.
// ---------------------------------------------------------------------------

import path from "node:path";
import { EVIDENCE_DIR, launch, parseArgs, rel, SCRATCH_DIR, slug, writeJson } from "./lib/common";
import { measureCell, type CellResult } from "./lib/measure";
import { CORE } from "./lib/routes";
import { line, prepare, routesFrom, statesFrom } from "./lib/run";
import { stateLabel } from "./lib/states";

async function main() {
  const args = parseArgs();
  const routes = routesFrom(args, { routes: CORE });
  const states = statesFrom(args, { viewports: ["390x844"], themes: ["dark", "light"], auths: ["signed-out", "user"] });
  const ev = args.values.get("evidence");
  const dir = ev ? path.join(EVIDENCE_DIR, "flash", ev) : path.join(SCRATCH_DIR, "flash");
  const png = args.flags.has("png");

  await prepare(routes, states, !args.flags.has("no-warm"));
  const browser = await launch();
  const cells: CellResult[] = [];
  try {
    for (const route of routes)
      for (const s of states) {
        const name = `${slug(route)}__${slug(stateLabel(s).replace(/\|/g, "_"))}`;
        const r = await measureCell(browser, route, s, {
          flash: true,
          cls: true,
          flashPng: png ? path.join(dir, `${name}.png`) : undefined,
        });
        cells.push(r);
        console.log(line(r));
      }
  } finally {
    await browser.close();
  }

  const rows = cells.map((c) => ({
    route: c.route,
    state: c.state,
    error: c.error,
    moments: c.flash?.moments,
    vsFinal: c.flash?.vsFinal.map((v) => ({
      from: v.from,
      changed: v.diff.changedFraction,
      regions: v.diff.regions.slice(0, 6).map((r) => ({ x: r.x, y: r.y, w: r.w, h: r.h, element: r.element })),
    })),
    png: c.flash?.png ? rel(c.flash.png) : undefined,
  }));
  const out = writeJson(path.join(dir, "flash.json"), { generatedAt: new Date().toISOString(), rows });
  console.log(`[flash] wrote ${rel(out)}`);
  for (const r of rows) {
    const worst = (r.vsFinal ?? []).filter((v) => v.from !== "authSettled").sort((a, b) => b.changed - a.changed)[0];
    if (worst && worst.changed > 0.02)
      console.log(`  ${r.route}  ${r.state}  ${(worst.changed * 100).toFixed(1)}% of the viewport changes between ${worst.from} and settled`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
