import type { MetadataRoute } from "next";

// Served at /robots.txt. Everything public is crawlable: traditional search
// bots and AI / answer-engine crawlers are all explicitly welcomed. The major
// crawlers are named individually as well as covered by the "*" rule, because
// several answer-engine bots (GPTBot, Google-Extended, ...) only honor a block
// addressed to their own user-agent, and an explicit allow is a clear signal
// that this site wants to be indexed and cited. Only transient, user-specific
// surfaces are excluded: they have no SEO value and waste crawl budget. A
// plain-language description of the game for AI systems lives at /llms.txt.
const DISALLOW = ["/api/", "/game", "/inbox", "/mod", "/friend", "/dev", "/profile/edit"];

// Search engines, then AI / answer-engine crawlers. Same permissive policy for
// all of them.
const NAMED_CRAWLERS = [
  "Googlebot",
  "Google-Extended",
  "Bingbot",
  "Slurp",
  "DuckDuckBot",
  "Applebot",
  "Applebot-Extended",
  "YandexBot",
  "Baiduspider",
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-CloudVertexBot",
  "Amazonbot",
  "Bytespider",
  "CCBot",
  "cohere-ai",
  "Meta-ExternalAgent",
  "Diffbot",
  "Timpibot",
  "YouBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: NAMED_CRAWLERS, allow: "/", disallow: DISALLOW },
    ],
    sitemap: "https://nerfchess.com/sitemap.xml",
    host: "https://nerfchess.com",
  };
}
