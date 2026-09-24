// ---------------------------------------------------------------------------
// Route lists for the polish harness.
//
// CORE is what the cheap guards (test:cls, test:console) run by default: the
// pages every visitor and every signed-in player touches. ALL is every static
// page under src/app (the /dev galleries excluded, like e2e/sweep.spec.ts),
// plus one real param per dynamic family that exists without seeding.
//
// GAME is the local bot game (no Durable Object needed): the same URL /play
// pushes when you start a practice game against the computer.
// ---------------------------------------------------------------------------

export const GAME = "/game?mode=nerf&difficulty=easy&color=w&t=0&inc=0&rated=0";

export const CORE = ["/", "/lobby", "/play", "/profile", GAME, "/leaderboard", "/codex", "/tv"];

/** Brief section 4: the five routes the post-sign-in bump is measured on. */
export const SECTION4 = ["/", "/lobby", "/play", "/profile", GAME];

export const ALL = [
  "/",
  "/about",
  "/achievements",
  "/analysis",
  "/clubs",
  "/codex",
  "/codex/build",
  "/codex/suggest",
  "/codex/buff/pawn_push",
  "/codex/hex/heavy_boots",
  "/codex/boon/extra_glance",
  "/codex/nerf/lucky",
  "/community",
  "/contact",
  "/faq",
  "/friend",
  GAME,
  "/guide",
  "/guide/buff-mode",
  "/guide/capture-the-king",
  "/guide/chess-roguelike",
  "/guide/chess-variants",
  "/guide/chess-with-power-ups",
  "/guide/glossary",
  "/guide/how-to-play",
  "/guide/nerf-mode",
  "/guidelines",
  "/history",
  "/inbox",
  "/leaderboard",
  "/lobby",
  "/login",
  "/mod",
  "/mod/cards",
  "/mod/house",
  "/mod/stats",
  "/play",
  "/privacy-policy",
  "/profile",
  "/profile/edit",
  "/puzzles",
  "/settings",
  "/stats",
  "/terms-of-service",
  "/tournaments",
  "/tutorial",
  "/tutorial/first-game",
  "/tutorial/walkthrough",
  "/tv",
  "/u/polish_user",
  "/updates",
];

export function resolveRoutes(spec: string | undefined, dflt: string[] = CORE): string[] {
  if (!spec) return dflt;
  if (spec === "core") return CORE;
  if (spec === "all") return ALL;
  if (spec === "section4") return SECTION4;
  return spec
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s === "game" ? GAME : s.startsWith("/") ? s : "/" + s));
}
