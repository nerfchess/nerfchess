// ---------------------------------------------------------------------------
// SEO guard without a server (npm run test:seo-static).
//
// The crawl guards (check-seo.ts, check-jsonld.ts) read the HTML the dev
// server sends, which is the truth a bot sees but needs a live server. This
// guard checks the same rules on the metadata objects themselves, so the
// regressions the polish pass fixed (F231 to F237, F238, F174) fail fast in CI
// or on a box where the dev server is down:
//
//   - every static route row (src/lib/seoPages.ts) yields a self canonical, an
//     og:url equal to it, og and twitter titles equal to <title>, og:type,
//     og:site_name, twitter:card summary_large_image and explicit robots;
//   - no two indexable routes share a title or a description, and no codex
//     card shares one with another card or a route (all 1,600+ cards);
//   - titles carry the brand once, descriptions run 50 to 160 characters,
//     nothing carries an em dash or a raw tier numeral ("a I. Trivial");
//   - the robots policy (src/app/robots.ts) matches ROBOTS_EXPECT.
//
//   ./node_modules/.bin/tsx scripts/check-seo-static.ts
// ---------------------------------------------------------------------------

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import robots from "../src/app/robots";
import { DESCRIPTION_MAX } from "../src/lib/seo";
import { allCardMeta } from "../src/lib/seoCards";
import { PAGES, staticMeta, type StaticPath } from "../src/lib/seoPages";
import { ROBOTS_EXPECT, robotsAllows, type RobotsGroup } from "./polish/lib/seoCrawl";

const APP = join(__dirname, "..", "src", "app");
/** U+2014, spelled as an escape so this file never carries one itself. */
const EM_DASH = new RegExp(String.fromCharCode(0x2014));
const problems: string[] = [];
const fail = (path: string, rule: string, detail = "") => problems.push(`${rule.padEnd(22)} ${path}  ${detail}`);

function titleText(t: Metadata["title"]): string | undefined {
  if (typeof t === "string") return t;
  if (t && typeof t === "object" && "absolute" in t) return t.absolute;
  return undefined;
}

type Row = { path: string; title: string; description: string; indexable: boolean };
const rows: Row[] = [];

for (const path of Object.keys(PAGES) as StaticPath[]) {
  const m = staticMeta(path);
  const title = titleText(m.title) ?? "";
  const description = typeof m.description === "string" ? m.description : "";
  const og = (m.openGraph ?? {}) as Record<string, unknown>;
  const tw = (m.twitter ?? {}) as Record<string, unknown>;
  const robotsMeta = m.robots as { index?: boolean } | undefined;
  if (m.alternates?.canonical !== path) fail(path, "canonical-not-self", String(m.alternates?.canonical));
  if (og.url !== path) fail(path, "og-url-mismatch", String(og.url));
  if (og.title !== title) fail(path, "og-title-mismatch", String(og.title));
  if (og.description !== description) fail(path, "og-description-mismatch");
  if (!og.type) fail(path, "og-type-missing");
  if (og.siteName !== "Nerf Chess") fail(path, "og-site-name-missing");
  if (tw.card !== "summary_large_image") fail(path, "twitter-card", String(tw.card));
  if (tw.title !== title) fail(path, "twitter-title-mismatch", String(tw.title));
  if (typeof robotsMeta?.index !== "boolean") fail(path, "robots-implicit");
  if (!og.images) fail(path, "og-image-missing", "the brand card should be the default");
  // A route that defers to its folder's image file must have one, or it
  // ships with no og:image at all (F233).
  const dir = join(APP, path);
  const src = ["page.tsx", "layout.tsx"].map((f) => join(dir, f)).filter(existsSync).map((f) => readFileSync(f, "utf8")).join("\n");
  if (/image: "segment"/.test(src) && !existsSync(join(dir, "opengraph-image.tsx"))) fail(path, "og-image-missing", "image: \"segment\" without an opengraph-image file");
  rows.push({ path, title, description, indexable: robotsMeta?.index !== false });
}

for (const c of allCardMeta()) rows.push({ ...c, indexable: true });

for (const r of rows) {
  if (!r.title) fail(r.path, "title-missing");
  if ((r.title.match(/nerf ?chess/gi) ?? []).length > 1) fail(r.path, "title-brand-twice", r.title);
  if (r.description.length > DESCRIPTION_MAX) fail(r.path, "description-long", `${r.description.length}`);
  if (r.description.length < 50) fail(r.path, "description-short", `${r.description.length}`);
  if (EM_DASH.test(r.title) || EM_DASH.test(r.description)) fail(r.path, "em-dash");
  if (/\ban? [IVX]+\. /.test(r.description)) fail(r.path, "tier-numeral-in-prose", r.description.slice(0, 60));
}

for (const key of ["title", "description"] as const) {
  const seen = new Map<string, string[]>();
  for (const r of rows.filter((x) => x.indexable)) seen.set(r[key], [...(seen.get(r[key]) ?? []), r.path]);
  for (const [v, paths] of seen) if (paths.length > 1) fail(paths.join(", "), `duplicate-${key}`, v.slice(0, 80));
}

// Robots: the policy object, grouped the way robots.txt serves it.
const policy = robots();
const groups: RobotsGroup[] = (Array.isArray(policy.rules) ? policy.rules : [policy.rules]).map((r) => {
  const list = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
  return {
    agents: list(r.userAgent).map((a) => a.toLowerCase()),
    rules: [...list(r.allow).map((path) => ({ allow: true, path })), ...list(r.disallow).map((path) => ({ allow: false, path }))],
  };
});
for (const e of ROBOTS_EXPECT) {
  const got = robotsAllows(groups, e.ua, e.path);
  if (got !== e.allowed) fail("/robots.txt", "robots", `${e.ua} ${e.path}: ${got ? "allowed" : "blocked"}, expected ${e.allowed ? "allowed" : "blocked"}`);
}
for (const p of ["/mod", "/dev", "/api/", "/inbox", "/settings"]) {
  if (robotsAllows(groups, "Googlebot/2.1", p)) fail("/robots.txt", "robots-private", `${p} open to Googlebot`);
}

const cards = rows.length - Object.keys(PAGES).length;
console.log(`check-seo-static: ${Object.keys(PAGES).length} static routes, ${cards} card pages, ${ROBOTS_EXPECT.length} robots expectations`);
for (const p of problems.slice(0, 60)) console.log(`FAIL ${p}`);
if (problems.length > 60) console.log(`... and ${problems.length - 60} more`);
console.log(problems.length ? `${problems.length} problem(s)` : "OK");
process.exit(problems.length ? 1 : 0);
