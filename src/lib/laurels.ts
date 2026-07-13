// Top-10 leaderboard honors ("laurels"). Owner call: no seasons, but being in
// the current top 10 of a leaderboard is rewarded — a rank-tiered laurel badge
// beside the player's name and the exclusive Laurelled flair (lib/flair.ts).
//
// Everything here is display-driven and stateless: "is this player top 10?" is
// derived from the same /api/leaderboard responses the leaderboard page
// already renders, cached briefly in-module so profiles and search results
// never add polling of their own. Nothing is stored; drop out of the top 10
// and the laurel simply stops rendering.

import { LAUREL_TOP_N } from "./flair";
import { MODE_RATING_CATEGORIES, type RatingCategoryId } from "./ratingCategories";

export { LAUREL_TOP_N };

/** Badge tiers, by rank: a radiant crown-laurel for the champion, gold laurel
 *  for second and third, silver-brass laurel down to tenth. */
export type LaurelTier = "champion" | "gold" | "silver";

export function laurelTier(rank: number): LaurelTier | null {
  if (!Number.isInteger(rank) || rank < 1 || rank > LAUREL_TOP_N) return null;
  if (rank === 1) return "champion";
  if (rank <= 3) return "gold";
  return "silver";
}

/** One top-10 placement: a rank on one category's leaderboard. */
export interface LaurelPlacement {
  category: RatingCategoryId;
  /** Display label of the category ("Nerf", "Buff"). */
  label: string;
  /** 1-based rank as shown on that leaderboard. */
  rank: number;
}

/** Tooltip text for a placement, e.g. "#3 · Nerf leaderboard". */
export function placementTitle(p: LaurelPlacement): string {
  return `#${p.rank} · ${p.label} leaderboard`;
}

/** Every current top-10 placement, keyed by lowercased username. A player on
 *  both boards has two entries, sorted best rank first. */
export type TopStandings = Map<string, LaurelPlacement[]>;

// One fetch per minute at most, shared by every surface (profile header,
// honors section, player search). The pages that mount these surfaces already
// fetch on navigation; this only coalesces those reads.
const STANDINGS_TTL_MS = 60_000;
let cached: { at: number; promise: Promise<TopStandings> } | null = null;

export function fetchTopStandings(): Promise<TopStandings> {
  const now = Date.now();
  if (cached && now - cached.at < STANDINGS_TTL_MS) return cached.promise;
  const promise = loadStandings();
  cached = { at: now, promise };
  // A network failure must not poison the cache for a full minute.
  promise.catch(() => {
    if (cached?.promise === promise) cached = null;
  });
  return promise;
}

async function loadStandings(): Promise<TopStandings> {
  const standings: TopStandings = new Map();
  await Promise.all(
    MODE_RATING_CATEGORIES.map(async (category) => {
      const res = await fetch(`/api/leaderboard?category=${category.id}`);
      if (!res.ok) return;
      const data = (await res.json()) as { players?: { username: string; guest?: boolean }[] };
      (data.players ?? []).slice(0, LAUREL_TOP_N).forEach((player, i) => {
        // Guests keep their on-board rank (i + 1 counts them) but are not
        // keyed: guest names are not stable accounts, so no profile or search
        // result should ever wear a laurel on a guest's behalf.
        if (player.guest) return;
        const key = player.username.toLowerCase();
        const list = standings.get(key) ?? [];
        list.push({ category: category.id, label: category.label, rank: i + 1 });
        standings.set(key, list);
      });
    }),
  );
  for (const list of standings.values()) list.sort((a, b) => a.rank - b.rank);
  return standings;
}
