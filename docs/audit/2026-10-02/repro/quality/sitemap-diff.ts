import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { STATIC_ROUTES, sourcesOf } from "../../../../../src/lib/sitemapRoutes";
const ROOT = ".";
const gen = readFileSync(join(ROOT, "src/lib/sitemapDates.gen.ts"), "utf8");
for (const route of STATIC_ROUTES) {
  if (route.path === "/updates" || route.path === "/puzzles") continue;
  const present = sourcesOf(route).filter((f) => existsSync(join(ROOT, f)));
  if (!present.length) continue;
  const out = execFileSync("git", ["log", "-1", "--format=%cs %h %s", "--", ...present], { cwd: ROOT, encoding: "utf8" }).trim();
  const m = gen.match(new RegExp(`"${route.path.replace(/\//g, "\\/")}": "([0-9-]+)"`));
  const d = out.slice(0, 10);
  if (!m || m[1] !== d) console.log(route.path, "gen:", m?.[1], "git:", out.slice(0, 120));
}
