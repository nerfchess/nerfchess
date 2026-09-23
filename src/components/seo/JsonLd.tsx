// Structured data (schema.org JSON-LD) for every page type that has a true
// thing to say (brief section 18). Server components, no hooks, no client
// JavaScript: crawlers read the script tag straight from the HTML.
//
// Every block goes through <JsonLd>, which escapes the JSON for an inline
// script: a "<" in a club or player name can no longer close the script tag
// early (the old call sites used JSON.stringify straight into
// dangerouslySetInnerHTML). Nodes shared across blocks use stable @id values
// under https://nerfchess.com/#..., so a page's blocks reference the site's
// Organization instead of repeating it. scripts/check-jsonld.ts (npm run
// test:jsonld) parses every route's blocks and validates them.

import { SOCIAL_LINKS } from "@/components/SocialsRow";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";
import { TEAM, type TeamMember } from "@/lib/team";

export const ORG_ID = `${SITE_URL}/#org`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const GAME_ID = `${SITE_URL}/#game`;
const personId = (m: TeamMember) => `${SITE_URL}/about#${m.slug}`;

/** JSON for an inline <script>: <, >, & and the two JS line separators are
 *  escaped, so no string inside can end the script element. */
export function safeJson(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(data) }} />;
}

function teamPerson(m: TeamMember) {
  return {
    "@type": "Person",
    "@id": personId(m),
    name: m.name,
    jobTitle: m.title,
    worksFor: { "@id": ORG_ID },
  };
}

/** The site-wide graph for the root layout: the Organization (with the team
 *  and the official social accounts), the WebSite with its codex search, and
 *  the game itself as one VideoGame node (it used to be two nodes sharing
 *  #game with conflicting fields, F243). */
export function siteGraph() {
  const founders = TEAM.filter((m) => m.founder);
  const members = TEAM.filter((m) => !m.founder);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/icon-512.png`,
        sameAs: SOCIAL_LINKS.map((s) => s.href),
        founder: founders.map(teamPerson),
        member: members.map(teamPerson),
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          url: absoluteUrl("/contact"),
          availableLanguage: "en",
        },
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        name: SITE_NAME,
        url: SITE_URL,
        inLanguage: "en",
        publisher: { "@id": ORG_ID },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/codex?search={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": ["VideoGame", "WebApplication"],
        "@id": GAME_ID,
        name: SITE_NAME,
        alternateName: ["Drawback Chess", "Buff Chess", "Power-up Chess"],
        url: SITE_URL,
        description:
          "A free online chess variant with two modes: Nerf mode gives every player a secret handicap revealed at game end, and Buff mode lets both players draft power-up cards every 5 moves. The game ends by capturing the king, not checkmate.",
        genre: ["Chess variant", "Board game", "Strategy", "Card game"],
        keywords:
          "chess variant, chess with power-ups, power-up chess, buff chess, drawback chess, chess with cards, capture the king chess, chess without checkmate, chess roguelike, chess card game",
        gamePlatform: "Web browser",
        applicationCategory: "GameApplication",
        applicationSubCategory: "Chess",
        operatingSystem: "Any",
        browserRequirements: "Requires a modern web browser with JavaScript",
        inLanguage: "en",
        isAccessibleForFree: true,
        playMode: ["MultiPlayer", "SinglePlayer"],
        numberOfPlayers: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2 },
        image: `${SITE_URL}/icon-512.png`,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock" },
        publisher: { "@id": ORG_ID },
        author: { "@id": ORG_ID },
      },
    ],
  };
}

/** For the root layout's <head> (slice A wires it in place of its inline
 *  script). */
export function SiteJsonLd() {
  return <JsonLd data={siteGraph()} />;
}

/** The Organization node alone, for pages that reference #org but render
 *  outside the root graph (every page does render inside it; this keeps a
 *  page valid on its own if the root block is ever missing). */
function orgRef() {
  return { "@type": "Organization", "@id": ORG_ID, name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/icon-512.png` };
}

export type Crumb = { name: string; path: string };

export function breadcrumbList(crumbs: Crumb[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

/** BreadcrumbList from Home down to the page itself (the last crumb is the
 *  page, with its own URL: F246). */
export function BreadcrumbJsonLd({ crumbs }: { crumbs: Crumb[] }) {
  return <JsonLd data={{ "@context": "https://schema.org", ...breadcrumbList([{ name: "Home", path: "/" }, ...crumbs]) }} />;
}

export type Faq = { question: string; answer: string };

/** FAQPage from the same list the page renders visibly (Google requires the
 *  marked-up questions and answers to be on the page). */
export function FaqJsonLd({ items }: { items: Faq[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      }}
    />
  );
}

/** A guide page: an Article by the Nerf Chess team (the organisation, not a
 *  named person: nobody is credited with writing a page they did not), plus
 *  its breadcrumb trail. No dates are claimed. */
export function ArticleJsonLd({
  headline,
  description,
  path,
  crumbs,
}: {
  headline: string;
  description: string;
  path: string;
  crumbs: Crumb[];
}) {
  const url = absoluteUrl(path);
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          orgRef(),
          {
            "@type": "Article",
            "@id": `${url}#article`,
            headline: headline.slice(0, 110),
            description,
            url,
            mainEntityOfPage: url,
            inLanguage: "en",
            image: `${SITE_URL}/icon-512.png`,
            author: { "@id": ORG_ID },
            publisher: { "@id": ORG_ID },
            about: { "@id": GAME_ID },
          },
          breadcrumbList([{ name: "Home", path: "/" }, ...crumbs]),
        ],
      }}
    />
  );
}

export type HowToStepInput = { name: string; text: string; url?: string };

export function HowToJsonLd({ name, description, steps, path }: { name: string; description: string; steps: HowToStepInput[]; path: string }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "HowTo",
        name,
        description,
        url: absoluteUrl(path),
        step: steps.map((s, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: s.name,
          text: s.text,
          ...(s.url ? { url: absoluteUrl(s.url) } : {}),
        })),
      }}
    />
  );
}

/** The team as Person nodes, for /about (each with an anchor on the page). */
export function TeamJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [orgRef(), ...TEAM.map(teamPerson)],
      }}
    />
  );
}

/** A public profile: ProfilePage whose main entity is the player (a name and
 *  their public game counts, nothing personal). */
export function ProfilePageJsonLd({
  username,
  games,
  ratings,
}: {
  username: string;
  games: number;
  ratings: { mode: "buff" | "nerf"; rating: number }[];
}) {
  const url = absoluteUrl(`/u/${encodeURIComponent(username.toLowerCase())}`);
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "ProfilePage",
            "@id": `${url}#page`,
            url,
            name: `${username} on Nerf Chess`,
            isPartOf: { "@id": WEBSITE_ID },
            mainEntity: {
              "@type": "Person",
              "@id": `${url}#player`,
              name: username,
              identifier: username,
              url,
              description: ratings.length
                ? `Nerf Chess player. ${ratings.map((r) => `${r.mode === "buff" ? "Buff" : "Nerf"} mode rating ${Math.round(r.rating)}`).join(", ")}.`
                : "Nerf Chess player.",
              agentInteractionStatistic: {
                "@type": "InteractionCounter",
                interactionType: "https://schema.org/PlayAction",
                userInteractionCount: games,
              },
            },
          },
          breadcrumbList([
            { name: "Home", path: "/" },
            { name: "Community", path: "/community" },
            { name: username, path: `/u/${encodeURIComponent(username.toLowerCase())}` },
          ]),
        ],
      }}
    />
  );
}
