import type { MetadataRoute } from "next";

// Served at /robots.txt. Everything public is crawlable: traditional search
// bots and AI/answer-engine crawlers (GPTBot, ClaudeBot, PerplexityBot,
// Google-Extended, etc.) are all welcome, so a single allow-all rule is
// deliberate. Only transient, user-specific surfaces are excluded: they have
// no SEO value and waste crawl budget. A plain-language description of the
// game for AI systems lives at /llms.txt.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/game", "/inbox", "/mod", "/friend"],
      },
    ],
    sitemap: "https://nerfchess.com/sitemap.xml",
  };
}
