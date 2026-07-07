import type { MetadataRoute } from "next";

const BASE = "https://nerfchess.com";

// Served at /sitemap.xml. Static public routes only: per-user pages (profile,
// history, inbox) and the thousands of possible codex filter/query URLs are
// deliberately not enumerated; /codex itself is listed and crawlers can reach
// individual cards through it and the guide pages.
export default function sitemap(): MetadataRoute.Sitemap {
  const entry = (
    path: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  ): MetadataRoute.Sitemap[number] => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  });

  return [
    entry("/", 1, "weekly"),
    entry("/play", 0.9, "monthly"),
    entry("/lobby", 0.9, "monthly"),
    entry("/codex", 0.9, "weekly"),
    entry("/updates", 0.7, "weekly"),
    entry("/tutorial", 0.8, "monthly"),
    entry("/tutorial/walkthrough", 0.6, "monthly"),
    // The guide: evergreen explainer pages written for search and AI answers.
    entry("/guide", 0.8, "monthly"),
    entry("/guide/how-to-play", 0.8, "monthly"),
    entry("/guide/nerf-mode", 0.7, "monthly"),
    entry("/guide/buff-mode", 0.7, "monthly"),
    entry("/guide/chess-with-power-ups", 0.7, "monthly"),
    entry("/guide/capture-the-king", 0.7, "monthly"),
    entry("/guide/chess-roguelike", 0.7, "monthly"),
    entry("/guide/drawback-chess", 0.7, "monthly"),
    entry("/guide/chess-variants", 0.7, "monthly"),
    entry("/guide/glossary", 0.6, "monthly"),
    // Info and community surfaces.
    entry("/about", 0.6, "yearly"),
    entry("/faq", 0.6, "monthly"),
    entry("/leaderboard", 0.5, "daily"),
    entry("/tournaments", 0.5, "daily"),
    entry("/community", 0.5, "weekly"),
    entry("/clubs", 0.5, "weekly"),
    entry("/achievements", 0.4, "monthly"),
    entry("/tv", 0.4, "daily"),
    entry("/codex/suggest", 0.4, "yearly"),
    entry("/contact", 0.3, "yearly"),
    entry("/privacy-policy", 0.2, "yearly"),
  ];
}
