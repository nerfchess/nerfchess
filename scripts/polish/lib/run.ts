// ---------------------------------------------------------------------------
// The shared loop behind every polish CLI: parse the dimension flags, make
// sure the server is up and the seeded sessions exist, warm the routes, then
// measure each (route, state) cell and print one line per cell.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { argList, launch, SCRATCH_DIR, slug, waitForServer, warmRoutes, type Args } from "./common";
import { measureCell, type CellResult, type MeasureOpts } from "./measure";
import { resolveRoutes } from "./routes";
import { ANIMS, AUTHS, authFile, cartesian, NETS, stateLabel, THEMES, VIEWPORTS, type Anim, type Auth, type Net, type State, type Theme, type Viewport } from "./states";
import { seedAll } from "../seed";

export type Defaults = {
  routes?: string[];
  viewports?: Viewport[];
  themes?: Theme[];
  anims?: Anim[];
  auths?: Auth[];
  nets?: Net[];
};

export function statesFrom(args: Args, d: Defaults = {}): State[] {
  return cartesian({
    viewports: argList(args, "viewports", VIEWPORTS, d.viewports ?? ["390x844", "1280x800"]),
    themes: argList(args, "themes", THEMES, d.themes ?? ["dark"]),
    anims: argList(args, "anim", ANIMS, d.anims ?? ["full"]),
    auths: argList(args, "auth", AUTHS, d.auths ?? ["signed-out"]),
    nets: argList(args, "net", NETS, d.nets ?? ["normal"]),
  });
}

export function routesFrom(args: Args, d: Defaults = {}): string[] {
  return resolveRoutes(args.values.get("routes"), d.routes);
}

export async function prepare(routes: string[], states: State[], warm = true): Promise<void> {
  await waitForServer();
  if (states.some((s) => s.auth !== "signed-out" && !fs.existsSync(authFile(s.auth)))) await seedAll();
  if (warm) await warmRoutes(routes);
}

export function line(r: CellResult): string {
  const bits = [
    r.error ? `ERROR ${r.error}` : `HTTP ${r.status}`,
    r.cls ? `CLS ${r.cls.cls} (sum ${r.cls.total}, ${r.cls.findings.length} >0.01)` : "",
    r.console ? `console ${r.console.items.filter((i) => i.kind !== "console-warning").length}` : "",
    r.flash ? `flash max ${Math.max(0, ...r.flash.vsFinal.map((v) => v.diff.changedFraction)).toFixed(3)}` : "",
    `${r.loadMs}ms`,
  ].filter(Boolean);
  return `  ${r.route}  ${r.state}  ${bits.join("  ")}`;
}

export async function runCells(
  routes: string[],
  states: State[],
  opts: MeasureOpts & { label: string; screens?: boolean; flashPngs?: boolean },
): Promise<CellResult[]> {
  const browser = await launch();
  const cells: CellResult[] = [];
  try {
    for (const route of routes) {
      for (const s of states) {
        const dir = path.join(SCRATCH_DIR, opts.label, slug(route));
        const name = slug(stateLabel(s).replace(/\|/g, "_"));
        const r = await measureCell(browser, route, s, {
          ...opts,
          flashPng: opts.flashPngs ? path.join(dir, `${name}.flash.png`) : opts.flashPng,
          screenshot: opts.screens ? path.join(dir, `${name}.png`) : opts.screenshot,
        });
        cells.push(r);
        console.log(line(r));
      }
    }
  } finally {
    await browser.close();
  }
  return cells;
}

export { AUTHS, ANIMS, NETS, THEMES, VIEWPORTS };
