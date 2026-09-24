// ---------------------------------------------------------------------------
// SEO and link-preview guard (npm run test:seo-dupes).
//
// Crawls the running site the way a bot does (raw HTML, no JavaScript) and
// fails on the metadata bugs the polish pass found (F231 to F239):
//
//   - a duplicate <title> or meta description anywhere in the sitemap;
//   - a canonical that is not the page's own URL (the root "/" leaking into
//     child routes), or an og:url that disagrees with it;
//   - a missing og:title, og:description, og:image (with width, height, alt),
//     og:site_name, og:type, twitter:card summary_large_image, twitter:image;
//   - the brand twice in one title, a description over 160 characters (it
//     truncates in search and in chat previews) or under 50;
//   - a sitemap entry that is not 200 or that carries noindex;
//   - an og:image that does not answer 200 image/png at 1200x630.
//
// Every codex card title and description is also checked for uniqueness
// statically (all 1,600+ cards, from the same helpers the pages use), because
// crawling every card page through `next dev` takes several minutes.
//
//   ./node_modules/.bin/tsx scripts/check-seo.ts                 sitemap, 8 cards per family
//   ./node_modules/.bin/tsx scripts/check-seo.ts --cards all     every card page over HTTP
//   ./node_modules/.bin/tsx scripts/check-seo.ts --json out.json write the full report
//   ./node_modules/.bin/tsx scripts/check-seo.ts --no-static     skip the card uniqueness pass
//
// Needs the dev server (POLISH_BASE, default http://localhost:3000).
// ---------------------------------------------------------------------------

import { argStr, parseArgs, waitForServer, writeJson, BASE } from "./polish/lib/common";
import {
  ROBOTS_EXPECT,
  SITE,
  fetchPage,
  fetchRetry,
  first,
  local,
  parseHead,
  parseRobots,
  pngSize,
  pool,
  robotsAllows,
  sampleCards,
  sitemapPaths,
  type Head,
} from "./polish/lib/seoCrawl";

const args = parseArgs();
/** U+2014, spelled as an escape so this file never carries one itself. */
const EM_DASH = /\u2014/;
const cardsArg = argStr(args, "cards", "8");
const perFamily = cardsArg === "all" ? Infinity : Math.max(2, Number(cardsArg) || 8);
const jsonOut = args.values.get("json");

/** Routes outside the sitemap that are still shared as links, so they must
 *  carry their own canonical and a full preview even though they are noindex
 *  (or not listed). Dynamic ids that need seeded data are discovered below. */
const EXTRA: string[] = [
  "/login",
  "/stats",
  "/history",
  "/profile",
  "/profile/edit",
  "/settings",
  "/friend",
  "/inbox",
  "/game",
  "/codex/build",
  "/u/polish_user",
  "/u/nobody_here_404",
  "/game/ZZZZZ",
  "/history/zzzz",
  "/c/ZZZZZ",
  "/clubs/no-such-club-404",
  "/tournaments/no-such-tournament-404",
];

type Problem = { path: string; rule: string; detail: string };
type PageReport = {
  path: string;
  status: number;
  ms: number;
  inSitemap: boolean;
  title?: string;
  description?: string;
  canonical?: string | null;
  robots?: string;
  og: Record<string, string | undefined>;
  twitter: Record<string, string | undefined>;
  appleTouchIcon?: string;
  themeColor?: string[];
};

const problems: Problem[] = [];
const warnings: Problem[] = [];
const fail = (path: string, rule: string, detail: string) => problems.push({ path, rule, detail });
const warn = (path: string, rule: string, detail: string) => warnings.push({ path, rule, detail });

function selfUrl(path: string): string {
  const p = path.split("?")[0];
  return p === "/" ? SITE : `${SITE}${p}`;
}

const sameUrl = (a: string, b: string) => a.replace(/\/$/, "") === b.replace(/\/$/, "");

async function discover(): Promise<string[]> {
  const out: string[] = [];
  const grab = async (url: string, pick: (j: unknown) => string | null) => {
    try {
      const res = await fetch(`${BASE}${url}`, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) return;
      const p = pick(await res.json());
      if (p) out.push(p);
    } catch {}
  };
  await grab("/api/clubs", (j) => {
    const c = (j as { clubs?: { slug?: string }[] }).clubs?.[0];
    return c?.slug ? `/clubs/${c.slug}` : null;
  });
  await grab("/api/tournaments", (j) => {
    const t = (j as { tournaments?: { id?: string }[] }).tournaments?.[0];
    return t?.id ? `/tournaments/${t.id}` : null;
  });
  await grab("/puzzle-data/puzzles.json", (j) => {
    const list = Array.isArray(j) ? j : (j as { puzzles?: unknown[] }).puzzles;
    const id = (list?.[0] as { id?: string } | undefined)?.id;
    return id ? `/puzzles/${encodeURIComponent(id)}` : null;
  });
  return out;
}

function report(path: string, status: number, ms: number, h: Head | null, inSitemap: boolean): PageReport {
  const og = (k: string) => (h ? first(h, `og:${k}`) : undefined);
  const tw = (k: string) => (h ? first(h, `twitter:${k}`) : undefined);
  return {
    path,
    status,
    ms,
    inSitemap,
    title: h?.titles[0],
    description: h ? first(h, "description") : undefined,
    canonical: h?.canonical,
    robots: h ? first(h, "robots") : undefined,
    og: {
      title: og("title"),
      description: og("description"),
      url: og("url"),
      site_name: og("site_name"),
      type: og("type"),
      image: og("image"),
      "image:width": og("image:width"),
      "image:height": og("image:height"),
      "image:alt": og("image:alt"),
    },
    twitter: {
      card: tw("card"),
      title: tw("title"),
      description: tw("description"),
      image: tw("image"),
      "image:alt": tw("image:alt"),
    },
    appleTouchIcon: h?.links.find((l) => l.rel === "apple-touch-icon")?.href,
    themeColor: h?.meta.get("theme-color"),
  };
}

function checkPage(r: PageReport, h: Head) {
  const p = r.path;
  if (h.titles.length !== 1) fail(p, "title-count", `${h.titles.length} <title> tags`);
  const title = r.title ?? "";
  if (!title) fail(p, "title-missing", "empty title");
  const brand = (title.match(/Nerf ?Chess/gi) ?? []).length;
  if (brand > 1) fail(p, "title-brand-twice", title);
  if (title.length > 70) warn(p, "title-long", `${title.length} chars: ${title}`);
  const desc = r.description ?? "";
  if (!desc) fail(p, "description-missing", "no meta description");
  else if (desc.length > 160) fail(p, "description-long", `${desc.length} chars`);
  else if (desc.length < 50) fail(p, "description-short", `${desc.length} chars: ${desc}`);
  if (EM_DASH.test(title + desc + (r.og.title ?? "") + (r.og.description ?? ""))) fail(p, "em-dash", "em dash in metadata");

  const self = selfUrl(p);
  if (!r.canonical) fail(p, "canonical-missing", "no rel=canonical");
  else if (!sameUrl(r.canonical, self)) fail(p, "canonical-not-self", `${r.canonical} (expected ${self})`);
  if (!r.og.url) fail(p, "og-url-missing", "no og:url");
  else if (r.canonical && !sameUrl(r.og.url, r.canonical)) fail(p, "og-url-mismatch", `${r.og.url} vs canonical ${r.canonical}`);

  for (const k of ["title", "description", "site_name", "type", "image", "image:width", "image:height", "image:alt"] as const) {
    if (!r.og[k]) fail(p, `og-${k.replace(":", "-")}-missing`, `no og:${k}`);
  }
  if (r.og.site_name && r.og.site_name !== "Nerf Chess") fail(p, "og-site-name", r.og.site_name);
  if (r.og["image:width"] && r.og["image:width"] !== "1200") fail(p, "og-image-width", r.og["image:width"]);
  if (r.og["image:height"] && r.og["image:height"] !== "630") fail(p, "og-image-height", r.og["image:height"]);
  if (r.og.title && r.title && r.og.title !== r.title && !r.title.startsWith(r.og.title)) {
    warn(p, "og-title-differs", `${r.og.title} vs ${r.title}`);
  }
  if (r.og.description && r.og.description.length > 160) fail(p, "og-description-long", `${r.og.description.length} chars`);
  if (r.twitter.card !== "summary_large_image") fail(p, "twitter-card", String(r.twitter.card));
  for (const k of ["title", "description", "image"] as const) {
    if (!r.twitter[k]) fail(p, `twitter-${k}-missing`, `no twitter:${k}`);
  }
  if (r.twitter.title && r.og.title && r.twitter.title !== r.og.title) fail(p, "twitter-title-mismatch", `${r.twitter.title} vs ${r.og.title}`);
  if (r.twitter.image && r.og.image && r.twitter.image !== r.og.image) fail(p, "twitter-image-mismatch", `${r.twitter.image} vs ${r.og.image}`);
  if (!r.appleTouchIcon) fail(p, "apple-touch-icon", "missing");
  if (!r.themeColor?.length) warn(p, "theme-color", "no theme-color meta");
  if (r.inSitemap && /noindex/i.test(r.robots ?? "")) fail(p, "sitemap-noindex", `sitemap lists a noindex page (${r.robots})`);
}

async function staticCards(): Promise<{ checked: number; dupTitles: string[][]; dupDescriptions: string[][] } | null> {
  let seo: typeof import("../src/lib/seoCards");
  try {
    seo = await import("../src/lib/seoCards");
  } catch {
    return null;
  }
  if (typeof seo.allCardMeta !== "function") return null;
  const rows = seo.allCardMeta();
  const groups = (key: "title" | "description") => {
    const m = new Map<string, string[]>();
    for (const r of rows) m.set(r[key], [...(m.get(r[key]) ?? []), r.path]);
    return [...m.values()].filter((v) => v.length > 1);
  };
  return { checked: rows.length, dupTitles: groups("title"), dupDescriptions: groups("description") };
}

async function checkRobots() {
  const res = await fetchRetry(`${BASE}/robots.txt`, { signal: AbortSignal.timeout(60_000) });
  const groups = parseRobots(await res.text());
  for (const e of ROBOTS_EXPECT) {
    const got = robotsAllows(groups, e.ua, e.path);
    if (got !== e.allowed) fail("/robots.txt", "robots", `${e.ua} ${e.path}: ${got ? "allowed" : "blocked"}, expected ${e.allowed ? "allowed" : "blocked"}`);
  }
}

async function main() {
  await waitForServer();
  const sitemap = await sitemapPaths();
  const inSitemap = new Set(sitemap);
  const crawl = [...new Set([...sampleCards(sitemap, perFamily), ...EXTRA, ...(await discover())])];
  console.log(`check-seo: ${sitemap.length} sitemap entries, crawling ${crawl.length} pages from ${BASE}`);

  const heads = new Map<string, Head>();
  const reports = await pool(crawl, 2, async (path) => {
    try {
      const f = await fetchPage(path);
      if (f.status !== 200) {
        if (inSitemap.has(path)) fail(path, "sitemap-status", `answered ${f.status}`);
        return report(path, f.status, f.ms, null, inSitemap.has(path));
      }
      // A streamed redirect (a 200 whose body is a meta refresh, what
      // redirect() yields once the root layout has started streaming) is a
      // redirect, not a page with metadata of its own.
      if (/http-equiv="refresh"/i.test(f.html)) {
        if (inSitemap.has(path)) fail(path, "sitemap-redirect", "sitemap lists a redirect");
        return report(path, 307, f.ms, null, inSitemap.has(path));
      }
      const h = parseHead(f.html);
      heads.set(path, h);
      const r = report(path, f.status, f.ms, h, inSitemap.has(path));
      checkPage(r, h);
      return r;
    } catch (e) {
      fail(path, "fetch", (e as Error).message);
      return report(path, 0, 0, null, inSitemap.has(path));
    }
  });

  // Duplicates across every indexable page crawled.
  const indexable = reports.filter((r) => r.status === 200 && !/noindex/i.test(r.robots ?? ""));
  for (const key of ["title", "description"] as const) {
    const seen = new Map<string, string[]>();
    for (const r of indexable) {
      const v = r[key];
      if (v) seen.set(v, [...(seen.get(v) ?? []), r.path]);
    }
    for (const [v, paths] of seen) {
      if (paths.length > 1) fail(paths.join(", "), `duplicate-${key}`, v);
    }
  }

  // Every distinct preview image must render.
  const images = [...new Set(reports.map((r) => r.og.image).filter((u): u is string => !!u))];
  const imageResults = await pool(images, 1, async (url) => {
    const t0 = Date.now();
    try {
      const res = await fetchRetry(local(url), { headers: { "user-agent": "Twitterbot/1.0" }, signal: AbortSignal.timeout(60_000) });
      const buf = new Uint8Array(await res.arrayBuffer());
      const size = pngSize(buf);
      const ms = Date.now() - t0;
      const type = res.headers.get("content-type") ?? "";
      if (res.status !== 200) fail(url, "og-image-status", String(res.status));
      else if (!type.startsWith("image/png")) fail(url, "og-image-type", type);
      else if (!size || size.width !== 1200 || size.height !== 630) fail(url, "og-image-size", JSON.stringify(size));
      return { url, status: res.status, type, bytes: buf.length, size, ms, cacheControl: res.headers.get("cache-control") };
    } catch (e) {
      fail(url, "og-image-fetch", (e as Error).message);
      return { url, status: 0, ms: Date.now() - t0 };
    }
  });

  await checkRobots();

  const cards = args.flags.has("no-static") ? null : await staticCards();
  if (cards) {
    for (const d of cards.dupTitles) fail(d.join(", "), "card-duplicate-title", "same title");
    for (const d of cards.dupDescriptions) fail(d.join(", "), "card-duplicate-description", "same description");
  } else if (!args.flags.has("no-static")) {
    warn("src/lib/seoCards.ts", "static-cards", "allCardMeta() not available; card uniqueness not checked");
  }

  const byRule = new Map<string, number>();
  for (const p of problems) byRule.set(p.rule, (byRule.get(p.rule) ?? 0) + 1);
  const summary = {
    base: BASE,
    crawled: crawl.length,
    sitemap: sitemap.length,
    problems: problems.length,
    warnings: warnings.length,
    byRule: Object.fromEntries([...byRule.entries()].sort((a, b) => b[1] - a[1])),
    staticCards: cards ? { checked: cards.checked, dupTitles: cards.dupTitles.length, dupDescriptions: cards.dupDescriptions.length } : null,
  };
  if (jsonOut) writeJson(jsonOut, { summary, problems, warnings, pages: reports, images: imageResults });
  for (const p of problems.slice(0, 80)) console.log(`FAIL ${p.rule.padEnd(24)} ${p.path}  ${p.detail}`);
  if (problems.length > 80) console.log(`... and ${problems.length - 80} more`);
  for (const w of warnings.slice(0, 20)) console.log(`warn ${w.rule.padEnd(24)} ${w.path}  ${w.detail}`);
  console.log(JSON.stringify(summary, null, 2));
  process.exit(problems.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
