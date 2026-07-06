// The achievements catalog and the pure logic that decides which achievements a
// finished game advances. This file is deliberately data + pure functions only:
// no DB, no React, no engine side effects. The server (src/lib/server/
// achievements.ts) builds a context from a finished game and calls the pure
// evaluator here; the page maps each achievement's `icon` name to a real icon
// component. Keeping it pure means the whole unlock rulebook can be reasoned
// about (and unit tested) without a database or a browser.

export type AchievementRarity = "common" | "rare" | "epic" | "legendary";

// Rendering order + weight: rarer first on the page, and a numeric weight for
// sorting unlocked-before-locked within a tier if a surface wants it.
export const RARITY_ORDER: AchievementRarity[] = ["legendary", "epic", "rare", "common"];

export const RARITY_RANK: Record<AchievementRarity, number> = {
  legendary: 3,
  epic: 2,
  rare: 1,
  common: 0,
};

export const RARITY_LABEL: Record<AchievementRarity, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

// One player's view of a single finished game, reduced to the plain facts the
// predicates need. Built by the server from the recorded game; every field is a
// primitive so this stays trivially testable.
export interface AchievementContext {
  /** The game reached a real result (win/loss/draw), not an abort. */
  decided: boolean;
  won: boolean;
  lost: boolean;
  drew: boolean;
  /** Which pool the game belonged to. */
  mode: "nerf" | "buff";
  /** Draft ruleset (Buff mode, or a Nerf-mode draft game). */
  draft: boolean;
  rated: boolean;
  /** Won specifically by capturing the enemy king. */
  kingCapture: boolean;
  /** This player carried a real secret handicap (not the "none" unrestricted rule). */
  wasNerfed: boolean;
  /** Difficulty tier of this player's handicap (0 when unnerfed). */
  myNerfTier: number;
  /** Plies played (0 when unknown). */
  plies: number;
  /** Highest tier among the cards this player drafted (0 when none). */
  maxBuffTier: number;
  /** This player's final board material minus the opponent's (kings excluded). */
  materialDiff: number;
  /** Opponent rating minus this player's rating going in; null unless rated. */
  opponentRatingDelta: number | null;
  /** Achievements this player had already unlocked before this game. Lets a few
   *  achievements build on earlier ones (e.g. "play both modes"). */
  unlocked: ReadonlySet<string>;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  /** Lucide icon name; the page maps it to a component. */
  icon: string;
  rarity: AchievementRarity;
  /** Progress required to unlock. Single-shot feats use 1; milestones count up. */
  goal: number;
  /** How much this finished game contributes toward the goal. Pure: depends only
   *  on the context. Milestones return 1 per qualifying game; feats return 1 the
   *  moment they happen. */
  contribution: (ctx: AchievementContext) => number;
}

// A qualifying, decided game (used by the "games played" milestones).
const played = (ctx: AchievementContext) => (ctx.decided ? 1 : 0);
const aWin = (ctx: AchievementContext) => (ctx.won ? 1 : 0);

export const ACHIEVEMENTS: Achievement[] = [
  // ----- Games-played milestones -----
  {
    id: "first_game",
    name: "First Steps",
    description: "Finish your first game of Nerf Chess.",
    icon: "Footprints",
    rarity: "common",
    goal: 1,
    contribution: played,
  },
  {
    id: "games_10",
    name: "Regular",
    description: "Finish 10 games.",
    icon: "Swords",
    rarity: "common",
    goal: 10,
    contribution: played,
  },
  {
    id: "games_50",
    name: "Devotee",
    description: "Finish 50 games.",
    icon: "Castle",
    rarity: "rare",
    goal: 50,
    contribution: played,
  },
  {
    id: "games_100",
    name: "Centurion",
    description: "Finish 100 games.",
    icon: "Milestone",
    rarity: "epic",
    goal: 100,
    contribution: played,
  },

  // ----- Win milestones -----
  {
    id: "first_win",
    name: "First Blood",
    description: "Win your first game.",
    icon: "Sword",
    rarity: "common",
    goal: 1,
    contribution: aWin,
  },
  {
    id: "wins_10",
    name: "Contender",
    description: "Win 10 games.",
    icon: "Medal",
    rarity: "rare",
    goal: 10,
    contribution: aWin,
  },
  {
    id: "wins_50",
    name: "Conqueror",
    description: "Win 50 games.",
    icon: "Trophy",
    rarity: "epic",
    goal: 50,
    contribution: aWin,
  },
  {
    id: "wins_100",
    name: "Warlord",
    description: "Win 100 games.",
    icon: "Crown",
    rarity: "legendary",
    goal: 100,
    contribution: aWin,
  },

  // ----- Single-game feats -----
  {
    id: "regicide",
    name: "Regicide",
    description: "Win by capturing the enemy king.",
    icon: "Skull",
    rarity: "common",
    goal: 1,
    contribution: (ctx) => (ctx.kingCapture ? 1 : 0),
  },
  {
    id: "win_nerfed",
    name: "What Handicap?",
    description: "Win a game while carrying a secret nerf.",
    icon: "ShieldOff",
    rarity: "rare",
    goal: 1,
    contribution: (ctx) => (ctx.won && ctx.wasNerfed ? 1 : 0),
  },
  {
    id: "win_brutal_nerf",
    name: "Against All Odds",
    description: "Win while carrying a tier 6 or harsher handicap.",
    icon: "Shield",
    rarity: "epic",
    goal: 1,
    contribution: (ctx) => (ctx.won && ctx.wasNerfed && ctx.myNerfTier >= 6 ? 1 : 0),
  },
  {
    id: "win_buff",
    name: "Power Overwhelming",
    description: "Win a game in Buff mode.",
    icon: "Sparkles",
    rarity: "rare",
    goal: 1,
    contribution: (ctx) => (ctx.won && ctx.mode === "buff" ? 1 : 0),
  },
  {
    id: "win_nerf_mode",
    name: "Handicap Match",
    description: "Win a rated game in Nerf mode.",
    icon: "Flame",
    rarity: "common",
    goal: 1,
    contribution: (ctx) => (ctx.won && ctx.mode === "nerf" && ctx.rated ? 1 : 0),
  },
  {
    id: "draft_high",
    name: "Stacked Deck",
    description: "Draft a tier 6 or higher card.",
    icon: "Gem",
    rarity: "rare",
    goal: 1,
    contribution: (ctx) => (ctx.maxBuffTier >= 6 ? 1 : 0),
  },
  {
    id: "draft_tier8",
    name: "Top Shelf",
    description: "Draft a tier 8 (Unhinged) card.",
    icon: "Star",
    rarity: "epic",
    goal: 1,
    contribution: (ctx) => (ctx.maxBuffTier >= 8 ? 1 : 0),
  },
  {
    id: "win_behind_material",
    name: "Scrappy",
    description: "Win a game while behind on material.",
    icon: "Scale",
    rarity: "epic",
    goal: 1,
    contribution: (ctx) => (ctx.won && ctx.materialDiff < 0 ? 1 : 0),
  },
  {
    id: "great_comeback",
    name: "The Great Comeback",
    description: "Win while down at least 5 points of material.",
    icon: "Rocket",
    rarity: "legendary",
    goal: 1,
    contribution: (ctx) => (ctx.won && ctx.materialDiff <= -5 ? 1 : 0),
  },
  {
    id: "giant_slayer",
    name: "Giant Slayer",
    description: "Beat an opponent rated 100 or more above you.",
    icon: "Target",
    rarity: "rare",
    goal: 1,
    contribution: (ctx) =>
      ctx.won && ctx.opponentRatingDelta != null && ctx.opponentRatingDelta >= 100 ? 1 : 0,
  },
  {
    id: "the_long_game",
    name: "The Long Game",
    description: "Win a game lasting at least 60 plies.",
    icon: "Hourglass",
    rarity: "rare",
    goal: 1,
    contribution: (ctx) => (ctx.won && ctx.plies >= 60 ? 1 : 0),
  },
  {
    id: "first_draw",
    name: "Diplomat",
    description: "Draw your first game.",
    icon: "Handshake",
    rarity: "common",
    goal: 1,
    contribution: (ctx) => (ctx.drew ? 1 : 0),
  },

  // ----- Breadth -----
  {
    id: "play_nerf",
    name: "Nerf Native",
    description: "Play a game in Nerf mode.",
    icon: "ShieldOff",
    rarity: "common",
    goal: 1,
    contribution: (ctx) => (ctx.decided && ctx.mode === "nerf" ? 1 : 0),
  },
  {
    id: "play_buff",
    name: "Buff Believer",
    description: "Play a game in Buff mode.",
    icon: "Sparkles",
    rarity: "common",
    goal: 1,
    contribution: (ctx) => (ctx.decided && ctx.mode === "buff" ? 1 : 0),
  },
  {
    id: "all_modes",
    name: "Versatile",
    description: "Play both Nerf mode and Buff mode.",
    icon: "Award",
    rarity: "rare",
    goal: 1,
    // Unlocks the moment a player has seen both modes: this game supplies one
    // side, a previously unlocked breadth achievement supplies the other.
    contribution: (ctx) => {
      if (!ctx.decided) return 0;
      const seenNerf = ctx.mode === "nerf" || ctx.unlocked.has("play_nerf");
      const seenBuff = ctx.mode === "buff" || ctx.unlocked.has("play_buff");
      return seenNerf && seenBuff ? 1 : 0;
    },
  },
];

export const ACHIEVEMENTS_BY_ID: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

// Raw facts a caller supplies for one player's perspective of a finished game;
// buildAchievementContext turns them into the derived context the predicates
// read. Kept separate so the derivation (king-capture detection, nerf check,
// material diff, rating delta) lives in one pure, tested place.
export interface FinishedGameFacts {
  winner: "w" | "b" | "draw" | null;
  color: "w" | "b";
  reason: string;
  mode: "nerf" | "buff";
  draft: boolean;
  rated: boolean;
  /** This player's secret rule id; "none" means unrestricted (Buff mode). */
  myNerfId: string;
  /** Difficulty tier of that rule (0 when unnerfed / unknown). */
  myNerfTier: number;
  plies: number;
  maxBuffTier: number;
  myMaterial: number;
  oppMaterial: number;
  myRatingBefore: number | null;
  oppRatingBefore: number | null;
  unlocked: ReadonlySet<string>;
}

// The unrestricted "rule" carried in Buff mode. A player holding it is not nerfed.
const UNRESTRICTED_NERF_ID = "none";

export function buildAchievementContext(facts: FinishedGameFacts): AchievementContext {
  const decided = facts.winner === "w" || facts.winner === "b" || facts.winner === "draw";
  const won = decided && facts.winner === facts.color;
  const drew = facts.winner === "draw";
  const lost = decided && !won && !drew;
  const wasNerfed = facts.myNerfId !== UNRESTRICTED_NERF_ID && facts.myNerfTier > 0;
  const kingCapture = won && /king captured/i.test(facts.reason);
  const opponentRatingDelta =
    facts.rated && facts.myRatingBefore != null && facts.oppRatingBefore != null
      ? facts.oppRatingBefore - facts.myRatingBefore
      : null;
  return {
    decided,
    won,
    lost,
    drew,
    mode: facts.mode,
    draft: facts.draft,
    rated: facts.rated,
    kingCapture,
    wasNerfed,
    myNerfTier: facts.myNerfTier,
    plies: facts.plies,
    maxBuffTier: facts.maxBuffTier,
    materialDiff: facts.myMaterial - facts.oppMaterial,
    opponentRatingDelta,
    unlocked: facts.unlocked,
  };
}

// The achievements this finished game advances, with how much each advances by.
// Pure: given the same context it always returns the same list.
export function evaluateAchievements(ctx: AchievementContext): Array<{ id: string; amount: number }> {
  const out: Array<{ id: string; amount: number }> = [];
  for (const a of ACHIEVEMENTS) {
    const amount = a.contribution(ctx);
    if (amount > 0) out.push({ id: a.id, amount });
  }
  return out;
}
