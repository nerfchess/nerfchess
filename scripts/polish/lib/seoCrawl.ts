// ---------------------------------------------------------------------------
// Crawler-eye view of the site for the SEO and link-preview guards
// (scripts/check-seo.ts, scripts/check-jsonld.ts, scripts/polish/og-grid.ts).
//
// It fetches raw HTML the way a search or unfurl bot does: no JavaScript, one
// GET, a bot user agent. Next serves blocking metadata to bot user agents, so
// what this sees in <head> is what Googlebot, Twitterbot, Slackbot and the
// rest see. Parsing is deliberately small (regex over the tags Next emits);
// the tags are machine written and regular, and a full HTML parser would be a
// new dependency for no gain.
// ---------------------------------------------------------------------------

import { BASE, waitForServer } from "./common";

export const SITE = "https://nerfchess.com";
export const BOT_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
export const UNFURL_UA = "Twitterbot/1.0";

export type Fetched = { path: string; status: number; html: string; ms: number; headers: Headers };

export async function fetchPage(path: string, ua = BOT_UA, timeoutMs = 60_000): Promise<Fetched> {
  const t0 = Date.now();
  const res = await fetchRetry(`${BASE}${path}`, {
    headers: { "user-agent": ua, accept: "text/html" },
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const html = res.status >= 300 && res.status < 400 ? "" : await res.text();
  return { path, status: res.status, html, ms: Date.now() - t0, headers: res.headers };
}

/** fetch() that survives the shared dev server being restarted by its
 *  supervisor mid-crawl: a refused connection waits for the server to answer
 *  again (up to 5 minutes) and retries, twice at most. An HTTP error status is
 *  returned as is; only a dead socket is retried. */
export async function fetchRetry(url: string, init: RequestInit = {}): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(url, attempt ? { ...init, signal: AbortSignal.timeout(60_000) } : init);
    } catch (e) {
      if (attempt >= 2) throw e;
      await waitForServer();
    }
  }
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#x27;": "'",
  "&#39;": "'",
  "&#x2F;": "/",
  "&nbsp;": "\u00a0",
};

export function decode(s: string): string {
  return s
    .replace(/&(amp|lt|gt|quot|nbsp|#x27|#39|#x2F);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)="([^"]*)"/g)) out[m[1].toLowerCase()] = decode(m[2]);
  return out;
}

export type JsonLdBlock = { raw: string; data?: unknown; error?: string };

export type Head = {
  titles: string[];
  /** name= and property= metas, keyed by that name, in document order. */
  meta: Map<string, string[]>;
  links: Record<string, string>[];
  canonical: string | null;
  jsonLd: JsonLdBlock[];
  /** Text of the document with scripts, styles and tags removed (for "is it
   *  visible on the page" checks). */
  text: string;
  /** Every id="" in the document (for fragment checks). */
  ids: Set<string>;
};

export function parseHead(html: string): Head {
  const titles = [...html.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/g)].map((m) => decode(m[1].replace(/\s+/g, " ").trim()));
  const meta = new Map<string, string[]>();
  for (const m of html.matchAll(/<meta\s[^>]*>/g)) {
    const a = attrs(m[0]);
    const key = a.property ?? a.name;
    if (!key || a.content === undefined) continue;
    meta.set(key, [...(meta.get(key) ?? []), a.content]);
  }
  const links = [...html.matchAll(/<link\s[^>]*>/g)].map((m) => attrs(m[0]));
  const canonical = links.find((l) => l.rel === "canonical")?.href ?? null;
  const jsonLd: JsonLdBlock[] = [];
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    const raw = m[1];
    try {
      jsonLd.push({ raw, data: JSON.parse(raw) });
    } catch (e) {
      jsonLd.push({ raw, error: (e as Error).message });
    }
  }
  const text = decode(
    html
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<style[\s\S]*?<\/style>/g, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => decode(m[1])));
  return { titles, meta, links, canonical, jsonLd, text, ids };
}

export const first = (h: Head, key: string): string | undefined => h.meta.get(key)?.[0];

/** Every <loc> of the dev server's sitemap, as a site path. */
export async function sitemapPaths(): Promise<string[]> {
  const res = await fetch(`${BASE}/sitemap.xml`, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`sitemap.xml answered ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
    const u = new URL(decode(m[1]));
    return (u.pathname.replace(/\/$/, "") || "/") + u.search;
  });
}

/** Sitemap entries with the codex card pages sampled: every non-card path,
 *  plus `perFamily` card pages per family (first, last and evenly spaced), or
 *  every card when perFamily is Infinity. */
export function sampleCards(paths: string[], perFamily: number): string[] {
  const card = /^\/codex\/(buff|nerf|hex|boon)\/[^/]+$/;
  const rest = paths.filter((p) => !card.test(p));
  const byFamily = new Map<string, string[]>();
  for (const p of paths) {
    const m = card.exec(p);
    if (m) byFamily.set(m[1], [...(byFamily.get(m[1]) ?? []), p]);
  }
  const picked: string[] = [];
  for (const list of byFamily.values()) {
    if (!Number.isFinite(perFamily) || list.length <= perFamily) {
      picked.push(...list);
      continue;
    }
    const step = (list.length - 1) / (perFamily - 1);
    const idx = new Set<number>();
    for (let i = 0; i < perFamily; i++) idx.add(Math.round(i * step));
    for (const i of idx) picked.push(list[i]);
  }
  return [...rest, ...picked];
}

/** Run `fn` over items with a fixed concurrency (the dev server is shared). */
export async function pool<T, R>(items: T[], n: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

/** An absolute URL from the page (og:image and friends) rewritten onto the
 *  server under test, so a dev crawl fetches the dev image. */
export function local(url: string): string {
  const u = new URL(url, BASE);
  return `${BASE}${u.pathname}${u.search}`;
}

/** Width and height from a PNG's IHDR chunk, or null. */
export function pngSize(buf: Uint8Array): { width: number; height: number } | null {
  if (buf.length < 24 || buf[0] !== 0x89 || buf[1] !== 0x50) return null;
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return { width: dv.getUint32(16), height: dv.getUint32(20) };
}

// ---- robots.txt -------------------------------------------------------------
// A small evaluator of the rules the site serves: the group that names the
// user agent (longest token match) or "*", then the longest matching path
// rule, allow winning a tie. Enough to hold the policy in place (F238):
// unfurl bots may fetch games and invites, search bots may not, and nobody
// crawls the private surfaces.

export type RobotsGroup = { agents: string[]; rules: { allow: boolean; path: string }[] };

export function parseRobots(txt: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let cur: RobotsGroup | null = null;
  let lastWasAgent = false;
  for (const raw of txt.split("\n")) {
    const line = raw.replace(/#.*/, "").trim();
    const m = /^([A-Za-z-]+):\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === "user-agent") {
      if (!cur || !lastWasAgent) {
        cur = { agents: [], rules: [] };
        groups.push(cur);
      }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (cur && (key === "allow" || key === "disallow") && val) cur.rules.push({ allow: key === "allow", path: val });
    }
  }
  return groups;
}

export function robotsAllows(groups: RobotsGroup[], ua: string, path: string): boolean {
  const token = ua.toLowerCase();
  const named = groups.find((g) => g.agents.some((a) => a !== "*" && token.includes(a)));
  const group = named ?? groups.find((g) => g.agents.includes("*"));
  if (!group) return true;
  let best: { allow: boolean; path: string } | null = null;
  for (const r of group.rules) {
    if (!path.startsWith(r.path)) continue;
    if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
  }
  return best ? best.allow : true;
}

export const ROBOTS_EXPECT: { ua: string; path: string; allowed: boolean }[] = [
  // Link previews for the two most shared links (F238).
  { ua: "Twitterbot/1.0", path: "/game/ABCDE", allowed: true },
  { ua: "Twitterbot/1.0", path: "/game/ABCDE/opengraph-image/card", allowed: true },
  { ua: "Twitterbot/1.0", path: "/c/ABCDE", allowed: true },
  { ua: "facebookexternalhit/1.1", path: "/c/ABCDE/opengraph-image/card", allowed: true },
  { ua: "Slackbot-LinkExpanding 1.0", path: "/game/ABCDE", allowed: true },
  { ua: "Discordbot/2.0", path: "/u/someone", allowed: true },
  { ua: "Twitterbot/1.0", path: "/api/lobby", allowed: false },
  { ua: "Twitterbot/1.0", path: "/settings", allowed: false },
  // Search engines: public pages yes, per-game and private pages no.
  { ua: "Googlebot/2.1", path: "/", allowed: true },
  { ua: "Googlebot/2.1", path: "/codex/nerf/lucky", allowed: true },
  { ua: "Googlebot/2.1", path: "/codex", allowed: true },
  { ua: "Googlebot/2.1", path: "/game/ABCDE", allowed: false },
  { ua: "Googlebot/2.1", path: "/c/ABCDE", allowed: false },
  { ua: "Googlebot/2.1", path: "/settings/board", allowed: false },
  { ua: "Googlebot/2.1", path: "/inbox/someone", allowed: false },
  { ua: "Googlebot/2.1", path: "/mod", allowed: false },
  { ua: "Googlebot/2.1", path: "/dev/plays", allowed: false },
  { ua: "Googlebot/2.1", path: "/api/stats", allowed: false },
  { ua: "SomeNewBot/1.0", path: "/settings", allowed: false },
  { ua: "SomeNewBot/1.0", path: "/guide/nerf-mode", allowed: true },
];
