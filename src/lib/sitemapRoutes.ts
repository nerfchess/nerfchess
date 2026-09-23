// The static, indexable routes the sitemap lists, with the source files whose
// last commit dates their <lastmod>. Shared by src/app/sitemap.ts and the
// generator scripts/gen-sitemap-dates.ts, so a route added here gets a real
// date the next time the generator runs (and has none, rather than a made-up
// one, until then).

export type Freq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

export type StaticRoute = {
  path: string;
  priority: number;
  changeFrequency: Freq;
  /** Files (relative to the repo root) whose newest commit is the page's
   *  last modification. The page folder's own page and layout by default. */
  sources?: string[];
};

const dir = (path: string) => (path === "/" ? "src/app" : `src/app${path}`);

export function sourcesOf(route: StaticRoute): string[] {
  if (route.sources) return route.sources;
  const d = dir(route.path);
  return [`${d}/page.tsx`, `${d}/layout.tsx`];
}

export const STATIC_ROUTES: StaticRoute[] = [
  { path: "/", priority: 1, changeFrequency: "weekly", sources: ["src/app/page.tsx", "src/components/HeroTv.tsx"] },
  { path: "/play", priority: 0.9, changeFrequency: "monthly" },
  { path: "/lobby", priority: 0.9, changeFrequency: "monthly" },
  { path: "/codex", priority: 0.9, changeFrequency: "weekly", sources: ["src/app/codex/page.tsx", "src/app/codex/_components/CodexBrowser.tsx"] },
  // The daily puzzle changes every day and needs no account, so it is the
  // strongest recurring-crawl target after the lobby; its lastmod is today.
  // Individual /puzzles/[id] pages are not listed: the corpus is regenerated
  // in batches and those ids do not survive a regeneration.
  { path: "/puzzles", priority: 0.9, changeFrequency: "daily" },
  { path: "/updates", priority: 0.7, changeFrequency: "weekly" },
  { path: "/tutorial", priority: 0.8, changeFrequency: "monthly" },
  { path: "/tutorial/walkthrough", priority: 0.6, changeFrequency: "monthly" },
  { path: "/tutorial/first-game", priority: 0.5, changeFrequency: "monthly" },
  // The guide: evergreen explainer pages written for search and AI answers.
  { path: "/guide", priority: 0.8, changeFrequency: "monthly", sources: ["src/app/guide/page.tsx", "src/app/guide/shared.tsx"] },
  { path: "/guide/how-to-play", priority: 0.8, changeFrequency: "monthly" },
  { path: "/guide/nerf-mode", priority: 0.7, changeFrequency: "monthly" },
  { path: "/guide/buff-mode", priority: 0.7, changeFrequency: "monthly" },
  { path: "/guide/chess-with-power-ups", priority: 0.7, changeFrequency: "monthly" },
  { path: "/guide/capture-the-king", priority: 0.7, changeFrequency: "monthly" },
  { path: "/guide/chess-roguelike", priority: 0.7, changeFrequency: "monthly" },
  { path: "/guide/chess-variants", priority: 0.7, changeFrequency: "monthly" },
  { path: "/guide/glossary", priority: 0.6, changeFrequency: "monthly", sources: ["src/app/guide/glossary/page.tsx", "src/lib/glossary.ts"] },
  // Info and community surfaces.
  { path: "/about", priority: 0.6, changeFrequency: "yearly", sources: ["src/app/about/page.tsx", "src/lib/team.ts"] },
  { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
  { path: "/leaderboard", priority: 0.5, changeFrequency: "daily" },
  { path: "/tournaments", priority: 0.5, changeFrequency: "daily" },
  { path: "/community", priority: 0.5, changeFrequency: "weekly" },
  { path: "/clubs", priority: 0.5, changeFrequency: "weekly" },
  { path: "/achievements", priority: 0.4, changeFrequency: "monthly" },
  { path: "/tv", priority: 0.4, changeFrequency: "daily" },
  { path: "/analysis", priority: 0.4, changeFrequency: "monthly" },
  { path: "/codex/suggest", priority: 0.4, changeFrequency: "yearly" },
  { path: "/contact", priority: 0.3, changeFrequency: "yearly" },
  { path: "/guidelines", priority: 0.2, changeFrequency: "yearly" },
  { path: "/privacy-policy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms-of-service", priority: 0.2, changeFrequency: "yearly" },
];
