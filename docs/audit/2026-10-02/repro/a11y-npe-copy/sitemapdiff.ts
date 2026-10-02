import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { STATIC_ROUTES, sourcesOf } from "../../../../../src/lib/sitemapRoutes";
const ROOT=".";
const cur = readFileSync(join(ROOT,"src/lib/sitemapDates.gen.ts"),"utf8");
const m = JSON.parse(cur.slice(cur.indexOf("{"), cur.lastIndexOf("}")+1));
for (const r of STATIC_ROUTES) { if (r.path==="/updates"||r.path==="/puzzles") continue;
  const present = sourcesOf(r).filter(f=>existsSync(join(ROOT,f)));
  const d = present.length? execFileSync("git",["log","-1","--format=%cs","--",...present],{cwd:ROOT,encoding:"utf8"}).trim():null;
  if (m[r.path]!==d) console.log(r.path, "file:", m[r.path], "git:", d);
}
