// ---------------------------------------------------------------------------
// Structured data guard (npm run test:jsonld).
//
// Fetches every route's raw HTML from the running site (the sitemap, sampled
// codex cards, and the shared-but-unlisted pages), parses every
// <script type="application/ld+json"> block, and fails when:
//
//   - a block is not valid JSON, or a node has no @type;
//   - a node of a type we emit is missing a property Google requires for it,
//     or carries a property that does not belong to that type (a typo or a
//     schema.org mix-up), per the small schema table below;
//   - a URL in the markup is relative or points off the site where it must not;
//   - an {"@id": ...} reference points at a node no block on the page defines;
//   - a BreadcrumbList's positions are not 1..n, an item repeats a URL, or the
//     last crumb is not the page itself;
//   - an FAQPage question or a HowTo step is not visible on the page, or a
//     HowTo step URL points at a #fragment the page does not have;
//   - a route that should carry a type (Organization on the home page,
//     FAQPage on /faq, Person on /about, Article on the guides, ProfilePage on
//     a real profile, BreadcrumbList on nested pages) does not.
//
//   ./node_modules/.bin/tsx scripts/check-jsonld.ts [--cards N|all] [--json out.json]
//
// Needs the dev server (POLISH_BASE, default http://localhost:3000).
// ---------------------------------------------------------------------------

import { argStr, parseArgs, waitForServer, writeJson, BASE } from "./polish/lib/common";
import { SITE, fetchPage, parseHead, pool, sampleCards, sitemapPaths, type Head } from "./polish/lib/seoCrawl";

const args = parseArgs();
/** U+2014, spelled as an escape so this file never carries one itself. */
const EM_DASH = /\u2014/;
const cardsArg = argStr(args, "cards", "6");
const perFamily = cardsArg === "all" ? Infinity : Math.max(2, Number(cardsArg) || 6);
const jsonOut = args.values.get("json");

const EXTRA = ["/u/polish_user", "/u/nobody_here_404", "/game/ZZZZZ", "/c/ZZZZZ", "/login", "/codex/build"];

type Node = Record<string, unknown>;
type Problem = { path: string; rule: string; detail: string };
const problems: Problem[] = [];
const fail = (path: string, rule: string, detail: string) => problems.push({ path, rule, detail });

// ---- schema table -----------------------------------------------------------
// required: Google's required properties for the rich result (or schema.org's
// minimum for types with no rich result). allowed: every property we accept on
// that type; anything else is an error. Keeping the list to what the site emits
// is deliberate: a new property is a conscious addition here too.

const COMMON = ["@context", "@type", "@id", "name", "url", "description", "image", "sameAs", "alternateName", "inLanguage"];
type Rule = { required: string[]; allowed: string[] };
const SCHEMA: Record<string, Rule> = {
  Organization: {
    required: ["name", "url", "logo"],
    allowed: [...COMMON, "logo", "founder", "member", "employee", "contactPoint", "foundingDate", "email", "brand"],
  },
  WebSite: { required: ["name", "url"], allowed: [...COMMON, "publisher", "potentialAction"] },
  SearchAction: { required: ["target", "query-input"], allowed: ["@type", "target", "query-input"] },
  EntryPoint: { required: ["urlTemplate"], allowed: ["@type", "urlTemplate"] },
  VideoGame: {
    required: ["name", "url"],
    allowed: [
      ...COMMON,
      "genre",
      "gamePlatform",
      "applicationCategory",
      "applicationSubCategory",
      "operatingSystem",
      "browserRequirements",
      "playMode",
      "numberOfPlayers",
      "isAccessibleForFree",
      "offers",
      "publisher",
      "author",
      "creator",
      "keywords",
      "gameTip",
    ],
  },
  WebApplication: { required: ["name"], allowed: [] },
  Offer: { required: ["price", "priceCurrency"], allowed: ["@type", "price", "priceCurrency", "availability", "url"] },
  QuantitativeValue: { required: [], allowed: ["@type", "minValue", "maxValue", "value"] },
  ContactPoint: { required: ["contactType"], allowed: ["@type", "contactType", "url", "email", "availableLanguage"] },
  Person: { required: ["name"], allowed: [...COMMON, "jobTitle", "worksFor", "memberOf", "identifier", "interactionStatistic", "agentInteractionStatistic"] },
  ProfilePage: { required: ["mainEntity"], allowed: [...COMMON, "mainEntity", "dateCreated", "dateModified", "isPartOf", "breadcrumb"] },
  InteractionCounter: { required: ["interactionType", "userInteractionCount"], allowed: ["@type", "interactionType", "userInteractionCount", "name"] },
  BreadcrumbList: { required: ["itemListElement"], allowed: ["@context", "@type", "@id", "itemListElement"] },
  ListItem: { required: ["position", "name"], allowed: ["@type", "position", "name", "item"] },
  FAQPage: { required: ["mainEntity"], allowed: ["@context", "@type", "@id", "mainEntity", "name", "url", "isPartOf"] },
  Question: { required: ["name", "acceptedAnswer"], allowed: ["@type", "name", "acceptedAnswer"] },
  Answer: { required: ["text"], allowed: ["@type", "text"] },
  HowTo: { required: ["name", "step"], allowed: [...COMMON, "step", "totalTime", "supply", "tool", "isPartOf"] },
  HowToStep: { required: ["text"], allowed: ["@type", "name", "text", "url", "position", "image"] },
  Article: {
    required: ["headline", "author"],
    allowed: [...COMMON, "headline", "author", "publisher", "datePublished", "dateModified", "mainEntityOfPage", "isPartOf", "about", "articleSection"],
  },
  WebPage: { required: [], allowed: [...COMMON, "isPartOf", "about", "breadcrumb", "mainEntity"] },
  DefinedTermSet: { required: ["name"], allowed: [...COMMON, "hasDefinedTerm"] },
  DefinedTerm: { required: ["name"], allowed: [...COMMON, "inDefinedTermSet", "termCode"] },
  SportsOrganization: { required: ["name"], allowed: [...COMMON, "member", "numberOfMembers"] },
  Event: { required: ["name", "startDate"], allowed: [...COMMON, "startDate", "endDate", "eventStatus", "eventAttendanceMode", "location", "organizer", "maximumAttendeeCapacity"] },
  VirtualLocation: { required: ["url"], allowed: ["@type", "url", "name"] },
};

/** Properties that hold a URL and so must be absolute on nerfchess.com (or an
 *  approved external host, for sameAs). */
const URL_PROPS = new Set(["url", "logo", "image", "item", "urlTemplate", "mainEntityOfPage"]);

// ---- per-route expectations -------------------------------------------------

const EXPECT: { re: RegExp; types: string[] }[] = [
  // The site graph (Organization, WebSite, VideoGame) is in the root layout.
  { re: /^\/$/, types: ["Organization", "WebSite", "VideoGame"] },
  // The team, as Person nodes next to the visible team section.
  { re: /^\/about$/, types: ["Person"] },
  { re: /^\/faq$/, types: ["FAQPage"] },
  { re: /^\/guide$/, types: ["Article", "FAQPage", "BreadcrumbList"] },
  { re: /^\/guide\/glossary$/, types: ["Article", "DefinedTermSet", "BreadcrumbList"] },
  { re: /^\/guide\/[a-z-]+$/, types: ["Article", "BreadcrumbList", "FAQPage"] },
  // The tutorial is the one page that is a step-by-step procedure.
  { re: /^\/tutorial$/, types: ["HowTo"] },
  { re: /^\/codex\/(buff|nerf|hex|boon)\/[^/]+$/, types: ["BreadcrumbList"] },
  { re: /^\/u\/polish_user$/, types: ["ProfilePage", "BreadcrumbList"] },
];

// ---- validation -------------------------------------------------------------

function typesOf(n: Node): string[] {
  const t = n["@type"];
  return Array.isArray(t) ? t.map(String) : t ? [String(t)] : [];
}

/** Walk every object node in a block (graph members, nested values). */
function walk(v: unknown, fn: (n: Node, parentKey: string) => void, key = "") {
  if (Array.isArray(v)) for (const x of v) walk(x, fn, key);
  else if (v && typeof v === "object") {
    fn(v as Node, key);
    for (const [k, x] of Object.entries(v as Node)) walk(x, fn, k);
  }
}

function isRef(n: Node): boolean {
  const keys = Object.keys(n);
  return keys.length === 1 && keys[0] === "@id";
}

function checkUrl(path: string, prop: string, value: unknown) {
  const vals = Array.isArray(value) ? value : [value];
  for (const v of vals) {
    if (typeof v !== "string") continue;
    if (!/^https:\/\//.test(v)) fail(path, "url-not-absolute", `${prop}: ${v}`);
    else if (prop !== "sameAs" && !v.startsWith(SITE)) fail(path, "url-off-site", `${prop}: ${v}`);
  }
}

function validate(path: string, h: Head, blocks: unknown[]) {
  const defined = new Set<string>();
  const refs: string[] = [];
  const present = new Set<string>();

  for (const block of blocks) {
    const root = block as Node;
    const graph = Array.isArray(root["@graph"]) ? (root["@graph"] as Node[]) : [root];
    if (root["@context"] !== "https://schema.org") fail(path, "context", String(root["@context"]));
    for (const top of graph) {
      walk(top, (n, parentKey) => {
        if (isRef(n)) {
          refs.push(String(n["@id"]));
          return;
        }
        if (typeof n["@id"] === "string") defined.add(n["@id"]);
        const types = typesOf(n);
        if (!types.length) {
          // Plain value objects (e.g. an Offer's nested object without a type)
          // are not allowed: every node we emit is typed.
          fail(path, "node-without-type", `${parentKey}: ${JSON.stringify(n).slice(0, 80)}`);
          return;
        }
        for (const t of types) present.add(t);
        const rules = types.map((t) => SCHEMA[t]);
        if (rules.some((r) => !r)) {
          fail(path, "unknown-type", types.join(","));
          return;
        }
        const allowed = new Set(rules.flatMap((r) => r!.allowed));
        for (const req of new Set(rules.flatMap((r) => r!.required))) {
          const v = n[req];
          if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) fail(path, "missing-property", `${types.join(",")}.${req}`);
        }
        for (const [k, v] of Object.entries(n)) {
          if (!allowed.has(k)) fail(path, "unexpected-property", `${types.join(",")}.${k}`);
          if (URL_PROPS.has(k) || k === "sameAs") {
            // `image` may be an ImageObject; `item` may be a node. Strings only here.
            checkUrl(path, k, v);
          }
          if (typeof v === "string" && EM_DASH.test(v)) fail(path, "em-dash", `${k}`);
        }
        if (types.includes("BreadcrumbList")) checkBreadcrumb(path, h, n);
        if (types.includes("FAQPage")) checkFaq(path, h, n);
        if (types.includes("HowTo")) checkHowTo(path, h, n);
        if (types.includes("Article")) {
          const headline = String(n.headline ?? "");
          if (headline.length > 110) fail(path, "article-headline-long", `${headline.length} chars`);
        }
        if (types.includes("SearchAction")) {
          const tpl = (n.target as Node | undefined)?.urlTemplate;
          const qi = String(n["query-input"] ?? "");
          const name = /name=(\w+)/.exec(qi)?.[1];
          if (!name || typeof tpl !== "string" || !tpl.includes(`{${name}}`)) fail(path, "search-action", `${tpl} / ${qi}`);
        }
      });
    }
  }
  for (const r of refs) if (!defined.has(r)) fail(path, "dangling-ref", r);
  // The same @id may appear in several blocks (consumers merge them), but two
  // definitions must not disagree on a property they both set: that is how
  // the root graph ended up with two #game nodes of different types (F243).
  const seen = new Map<string, Node>();
  for (const block of blocks) {
    walk(block, (n) => {
      if (isRef(n) || typeof n["@id"] !== "string") return;
      const id = n["@id"] as string;
      const prev = seen.get(id);
      if (prev) {
        for (const [k, v] of Object.entries(n)) {
          if (k in prev && JSON.stringify(prev[k]) !== JSON.stringify(v)) fail(path, "id-conflict", `${id} ${k}`);
        }
        seen.set(id, { ...prev, ...n });
      } else seen.set(id, n);
    });
  }
  for (const e of EXPECT) {
    if (!e.re.test(path)) continue;
    for (const t of e.types) if (!present.has(t)) fail(path, "expected-type-missing", t);
    break;
  }
}

function checkBreadcrumb(path: string, h: Head, n: Node) {
  const items = (n.itemListElement as Node[]) ?? [];
  const urls = new Set<string>();
  items.forEach((it, i) => {
    if (it.position !== i + 1) fail(path, "breadcrumb-position", `item ${i} has position ${it.position}`);
    const url = typeof it.item === "string" ? it.item : (it.item as Node | undefined)?.["@id"];
    if (typeof url === "string") {
      if (urls.has(url)) fail(path, "breadcrumb-repeat", url);
      urls.add(url);
    } else if (i < items.length - 1) fail(path, "breadcrumb-item-missing", `position ${i + 1}`);
  });
  const last = items[items.length - 1];
  const lastUrl = typeof last?.item === "string" ? last.item : undefined;
  const self = path === "/" ? SITE : `${SITE}${path.split("?")[0]}`;
  if (lastUrl && lastUrl.replace(/\/$/, "") !== self && h.canonical && lastUrl.replace(/\/$/, "") !== h.canonical.replace(/\/$/, "")) {
    fail(path, "breadcrumb-last-not-self", `${lastUrl} (page ${self})`);
  }
}

const norm = (s: string) => s.replace(/\s+/g, " ").replace(/[\u2018\u2019]/g, "'").trim().toLowerCase();

function checkFaq(path: string, h: Head, n: Node) {
  const text = norm(h.text);
  for (const q of (n.mainEntity as Node[]) ?? []) {
    const name = String(q.name ?? "");
    if (!text.includes(norm(name))) fail(path, "faq-question-not-visible", name);
  }
}

function checkHowTo(path: string, h: Head, n: Node) {
  const text = norm(h.text);
  for (const s of (n.step as Node[]) ?? []) {
    const url = typeof s.url === "string" ? s.url : "";
    const frag = url.includes("#") ? url.slice(url.indexOf("#") + 1) : "";
    if (frag && !h.ids.has(frag)) fail(path, "howto-fragment-missing", url);
    const name = String(s.name ?? "");
    if (name && !text.includes(norm(name))) fail(path, "howto-step-not-visible", name);
  }
}

async function main() {
  await waitForServer();
  const sitemap = await sitemapPaths();
  const crawl = [...new Set([...sampleCards(sitemap, perFamily), ...EXTRA])];
  console.log(`check-jsonld: crawling ${crawl.length} pages from ${BASE}`);
  const counts: Record<string, Record<string, number>> = {};
  await pool(crawl, 2, async (path) => {
    let h: Head;
    try {
      const f = await fetchPage(path);
      if (f.status !== 200) return;
      h = parseHead(f.html);
    } catch (e) {
      fail(path, "fetch", (e as Error).message);
      return;
    }
    const blocks: unknown[] = [];
    for (const b of h.jsonLd) {
      if (b.error) fail(path, "invalid-json", b.error);
      else blocks.push(b.data);
    }
    const perType: Record<string, number> = {};
    for (const b of blocks) walk(b, (n) => typesOf(n).forEach((t) => (perType[t] = (perType[t] ?? 0) + 1)));
    counts[path] = perType;
    validate(path, h, blocks);
  });
  const byRule: Record<string, number> = {};
  for (const p of problems) byRule[p.rule] = (byRule[p.rule] ?? 0) + 1;
  const summary = { base: BASE, crawled: crawl.length, problems: problems.length, byRule };
  if (jsonOut) writeJson(jsonOut, { summary, problems, types: counts });
  for (const p of problems.slice(0, 80)) console.log(`FAIL ${p.rule.padEnd(26)} ${p.path}  ${p.detail}`);
  if (problems.length > 80) console.log(`... and ${problems.length - 80} more`);
  console.log(JSON.stringify(summary, null, 2));
  process.exit(problems.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
