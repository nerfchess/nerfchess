// For every page.tsx under src/app (dev excluded), report whether the route
// gets its own metadata: a `metadata`/`generateMetadata` export in the page or
// in a layout in its own segment, and whether its path is in seoPages PAGES.
// Also whether its segment (or an ancestor) has an opengraph-image file.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { PAGES } from "../../../../../src/lib/seoPages";
const APP = "./src/app";
const pages: string[] = [];
const walk = (d: string) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) { if (!/\/(dev|api)$/.test(p)) walk(p); } else if (n === "page.tsx") pages.push(p); } };
walk(APP);
const hasMeta = (f: string) => existsSync(f) && /export\s+(const\s+metadata|(async\s+)?function\s+generateMetadata)/.test(readFileSync(f, "utf8"));
const rows = pages.map((p) => {
  const dir = dirname(p);
  const route = "/" + relative(APP, dir).replace(/\([^)]*\)\/?/g, "");
  const own = hasMeta(p) || hasMeta(join(dir, "layout.tsx"));
  let og = false; for (let d = dir; d.startsWith(APP); d = dirname(d)) { if (readdirSync(d).some((n) => /^(opengraph|twitter)-image\./.test(n))) { og = d === dir ? "own" as any : (og || "inherited") as any; if (d === dir) break; } }
  const inPages = Object.prototype.hasOwnProperty.call(PAGES, route === "/" ? "/" : route.replace(/\/$/, ""));
  const client = /^\s*["']use client["']/.test(readFileSync(p, "utf8"));
  return { route: route.replace(/\/$/, "") || "/", own, inPages, og, client };
});
const noMeta = rows.filter((r) => !r.own);
console.log(`pages=${rows.length} withOwnMeta=${rows.length - noMeta.length} noOwnMeta=${noMeta.length} inPAGES=${rows.filter((r) => r.inPages).length}`);
for (const r of noMeta) console.log("  NO OWN METADATA:", r.route, r.client ? "(client page)" : "", "og:", r.og || "none");
const noOg = rows.filter((r) => !r.og);
console.log(`no opengraph-image (own or inherited beyond root): ${noOg.length}`);
console.log(`own og image: ${rows.filter((r) => r.og === "own").length}, inherited: ${rows.filter((r) => r.og === "inherited").length}`);
