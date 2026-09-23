import type { MetadataRoute } from "next";

// Served at /robots.txt. Three groups, because a crawler obeys only the most
// specific group that names it:
//
// 1. Link-preview bots (X, Facebook and Instagram, Slack, Discord, LinkedIn,
//    WhatsApp, Telegram, Pinterest, Reddit and the embed services). They fetch
//    one page when a person pastes a link, to draw the card. They may read
//    game pages and invite links, which are exactly the links people paste:
//    /game was disallowed for everyone, and X honours robots.txt, so a shared
//    game or invite unfurled as a bare URL (F238). Those pages still carry
//    noindex, so allowing the fetch does not put them in any index.
// 2. Search engines and AI answer engines, named individually as well as by
//    "*", because several (GPTBot, Google-Extended, ...) only honour a group
//    addressed to their own user agent. Same rules as "*".
// 3. Everyone else ("*").
//
// Blocked for all: the API, moderation, developer tools, private messages,
// settings and the profile editor. Blocked for search only: games, the friend
// shim and invite links (per-game, per-invite, noindex pages that would only
// spend crawl budget). A plain description of the game for AI systems lives
// at /llms.txt.

const PRIVATE = ["/api/", "/mod", "/dev", "/inbox", "/settings", "/profile/edit"];
const SEARCH_DISALLOW = [...PRIVATE, "/game", "/friend", "/c/"];

const UNFURL_BOTS = [
  "Twitterbot",
  "facebookexternalhit",
  "Facebot",
  "Slackbot",
  "Slackbot-LinkExpanding",
  "Discordbot",
  "LinkedInBot",
  "WhatsApp",
  "TelegramBot",
  "Pinterestbot",
  "redditbot",
  "Embedly",
  "Iframely",
  "SkypeUriPreview",
  "Mastodon",
];

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
      { userAgent: UNFURL_BOTS, allow: "/", disallow: PRIVATE },
      { userAgent: NAMED_CRAWLERS, allow: "/", disallow: SEARCH_DISALLOW },
      { userAgent: "*", allow: "/", disallow: SEARCH_DISALLOW },
    ],
    sitemap: "https://nerfchess.com/sitemap.xml",
    host: "https://nerfchess.com",
  };
}
