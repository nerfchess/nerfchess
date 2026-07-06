// The achievements catalog and the pure logic that decides which achievements a
// finished game advances. This file is deliberately data + pure functions only:
// no DB, no React, no engine side effects. The server (src/lib/server/
// achievements.ts) builds a context from a finished game and calls the pure
// evaluator here; the page maps each achievement's `icon` name to a real icon
// component. Keeping it pure means the whole unlock rulebook can be reasoned
// about (and unit tested) without a database or a browser.
//
// Every achievement here MUST be evaluable from AchievementContext alone: the
// award pipeline runs once per finished game with only that game's facts plus
// the player's previously unlocked ids. Anything that would need other tables
// (clubs, messages, account age, win streaks) does not belong in this catalog.

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

// Trophy-wall sections. Categories are display grouping only; awarding ignores
// them entirely.
export type AchievementCategory =
  | "journey"
  | "victory"
  | "regicide"
  | "nerf"
  | "buff"
  | "feats"
  | "ladder";

export const CATEGORY_ORDER: AchievementCategory[] = [
  "journey",
  "victory",
  "regicide",
  "nerf",
  "buff",
  "feats",
  "ladder",
];

export const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  journey: "The Journey",
  victory: "Victories",
  regicide: "Regicide",
  nerf: "Nerf Mode",
  buff: "Buff Mode & Draft",
  feats: "Daring Feats",
  ladder: "The Ladder",
};

export const CATEGORY_TAGLINE: Record<AchievementCategory, string> = {
  journey: "Show up, play games, and keep coming back.",
  victory: "Wins of every shape and size.",
  regicide: "There is only one way to win: take the king.",
  nerf: "Triumphs under a secret handicap.",
  buff: "Power-up cards, drafts, and big plays.",
  feats: "One-game heroics worth telling stories about.",
  ladder: "Rating milestones on the climb.",
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
  /** This player's rating entering the game; null unless rated. Used by the
   *  ladder milestones (they unlock on the first rated game played at or above
   *  the mark). */
  myRating: number | null;
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
  /** Trophy-wall section this achievement is displayed under. */
  category: AchievementCategory;
  /** Progress required to unlock. Single-shot feats use 1; milestones count up. */
  goal: number;
  /** How much this finished game contributes toward the goal. Pure: depends only
   *  on the context. Milestones return 1 per qualifying game; feats return 1 the
   *  moment they happen. */
  contribution: (ctx: AchievementContext) => number;
}

// ----- Shared counters (each returns this game's contribution: 0 or 1) -----

// A qualifying, decided game (used by the "games played" milestones).
const played = (ctx: AchievementContext) => (ctx.decided ? 1 : 0);
const aWin = (ctx: AchievementContext) => (ctx.won ? 1 : 0);
const aLoss = (ctx: AchievementContext) => (ctx.lost ? 1 : 0);
const aDraw = (ctx: AchievementContext) => (ctx.drew ? 1 : 0);
const ratedPlayed = (ctx: AchievementContext) => (ctx.decided && ctx.rated ? 1 : 0);
const ratedWin = (ctx: AchievementContext) => (ctx.won && ctx.rated ? 1 : 0);
const nerfPlayed = (ctx: AchievementContext) => (ctx.decided && ctx.mode === "nerf" ? 1 : 0);
const nerfWin = (ctx: AchievementContext) => (ctx.won && ctx.mode === "nerf" ? 1 : 0);
const buffPlayed = (ctx: AchievementContext) => (ctx.decided && ctx.mode === "buff" ? 1 : 0);
const buffWin = (ctx: AchievementContext) => (ctx.won && ctx.mode === "buff" ? 1 : 0);
const draftPlayed = (ctx: AchievementContext) => (ctx.decided && ctx.draft ? 1 : 0);
const draftWin = (ctx: AchievementContext) => (ctx.won && ctx.draft ? 1 : 0);
const regicideWin = (ctx: AchievementContext) => (ctx.kingCapture ? 1 : 0);
const nerfedWin = (ctx: AchievementContext) => (ctx.won && ctx.wasNerfed ? 1 : 0);
const brutalWin = (ctx: AchievementContext) =>
  ctx.won && ctx.wasNerfed && ctx.myNerfTier >= 6 ? 1 : 0;
const fastWin = (ctx: AchievementContext) => (ctx.won && ctx.plies > 0 && ctx.plies <= 20 ? 1 : 0);
const comebackWin = (ctx: AchievementContext) => (ctx.won && ctx.materialDiff < 0 ? 1 : 0);
const giantSlay = (ctx: AchievementContext) =>
  ctx.won && ctx.opponentRatingDelta != null && ctx.opponentRatingDelta >= 100 ? 1 : 0;
const tier6Pick = (ctx: AchievementContext) => (ctx.maxBuffTier >= 6 ? 1 : 0);
const tier8Pick = (ctx: AchievementContext) => (ctx.maxBuffTier >= 8 ? 1 : 0);
// Reached a rating mark: fires on any rated game entered at or above the mark.
const ratedAt = (mark: number) => (ctx: AchievementContext) =>
  ctx.rated && ctx.myRating != null && ctx.myRating >= mark ? 1 : 0;
const ratedAtIn = (mode: "nerf" | "buff", mark: number) => (ctx: AchievementContext) =>
  ctx.rated && ctx.mode === mode && ctx.myRating != null && ctx.myRating >= mark ? 1 : 0;

export const ACHIEVEMENTS: Achievement[] = [
  // ===================== The Journey =====================
  // ----- Games-played milestones -----
  {
    id: "first_game",
    name: "First Steps",
    description: "Finish your first game of Nerf Chess.",
    icon: "Footprints",
    rarity: "common",
    category: "journey",
    goal: 1,
    contribution: played,
  },
  {
    id: "games_10",
    name: "Regular",
    description: "Finish 10 games.",
    icon: "Swords",
    rarity: "common",
    category: "journey",
    goal: 10,
    contribution: played,
  },
  {
    id: "games_25",
    name: "Warming Up",
    description: "Finish 25 games.",
    icon: "Sprout",
    rarity: "common",
    category: "journey",
    goal: 25,
    contribution: played,
  },
  {
    id: "games_50",
    name: "Devotee",
    description: "Finish 50 games.",
    icon: "Castle",
    rarity: "rare",
    category: "journey",
    goal: 50,
    contribution: played,
  },
  {
    id: "games_100",
    name: "Centurion",
    description: "Finish 100 games.",
    icon: "Milestone",
    rarity: "epic",
    category: "journey",
    goal: 100,
    contribution: played,
  },
  {
    id: "games_250",
    name: "Board Warrior",
    description: "Finish 250 games.",
    icon: "Mountain",
    rarity: "epic",
    category: "journey",
    goal: 250,
    contribution: played,
  },
  {
    id: "games_500",
    name: "Chess Machine",
    description: "Finish 500 games.",
    icon: "Gamepad2",
    rarity: "legendary",
    category: "journey",
    goal: 500,
    contribution: played,
  },
  {
    id: "games_1000",
    name: "Living Legend",
    description: "Finish 1000 games. You basically live here now.",
    icon: "Infinity",
    rarity: "legendary",
    category: "journey",
    goal: 1000,
    contribution: played,
  },

  // ----- Draws -----
  {
    id: "first_draw",
    name: "Diplomat",
    description: "Draw your first game.",
    icon: "Handshake",
    rarity: "common",
    category: "journey",
    goal: 1,
    contribution: aDraw,
  },
  {
    id: "draws_5",
    name: "Peacekeeper",
    description: "Draw 5 games.",
    icon: "Bird",
    rarity: "rare",
    category: "journey",
    goal: 5,
    contribution: aDraw,
  },
  {
    id: "draws_25",
    name: "Treaty Master",
    description: "Draw 25 games. The kings agree to disagree.",
    icon: "Feather",
    rarity: "epic",
    category: "journey",
    goal: 25,
    contribution: aDraw,
  },

  // ----- Losses (every champion starts somewhere) -----
  {
    id: "first_loss",
    name: "Good Sport",
    description: "Lose a game and shake it off. It happens to everyone.",
    icon: "Heart",
    rarity: "common",
    category: "journey",
    goal: 1,
    contribution: aLoss,
  },
  {
    id: "losses_10",
    name: "Never Give Up",
    description: "Lose 10 games. Every loss is a lesson in disguise.",
    icon: "Sunrise",
    rarity: "common",
    category: "journey",
    goal: 10,
    contribution: aLoss,
  },
  {
    id: "losses_50",
    name: "Iron Will",
    description: "Lose 50 games and keep coming back for more.",
    icon: "Anchor",
    rarity: "rare",
    category: "journey",
    goal: 50,
    contribution: aLoss,
  },

  // ----- Rated and casual play -----
  {
    id: "play_casual",
    name: "Just for Fun",
    description: "Finish an unrated game. No points, all glory.",
    icon: "PartyPopper",
    rarity: "common",
    category: "journey",
    goal: 1,
    contribution: (ctx) => (ctx.decided && !ctx.rated ? 1 : 0),
  },
  {
    id: "rated_1",
    name: "Into the Arena",
    description: "Finish your first rated game.",
    icon: "Flag",
    rarity: "common",
    category: "journey",
    goal: 1,
    contribution: ratedPlayed,
  },
  {
    id: "rated_10",
    name: "Arena Regular",
    description: "Finish 10 rated games.",
    icon: "Map",
    rarity: "common",
    category: "journey",
    goal: 10,
    contribution: ratedPlayed,
  },
  {
    id: "rated_50",
    name: "Arena Veteran",
    description: "Finish 50 rated games.",
    icon: "Compass",
    rarity: "rare",
    category: "journey",
    goal: 50,
    contribution: ratedPlayed,
  },
  {
    id: "rated_100",
    name: "Arena Champion",
    description: "Finish 100 rated games.",
    icon: "Landmark",
    rarity: "epic",
    category: "journey",
    goal: 100,
    contribution: ratedPlayed,
  },

  // ----- Breadth -----
  {
    id: "play_nerf",
    name: "Nerf Native",
    description: "Play a game in Nerf mode.",
    icon: "ShieldOff",
    rarity: "common",
    category: "journey",
    goal: 1,
    contribution: nerfPlayed,
  },
  {
    id: "play_buff",
    name: "Buff Believer",
    description: "Play a game in Buff mode.",
    icon: "Sparkles",
    rarity: "common",
    category: "journey",
    goal: 1,
    contribution: buffPlayed,
  },
  {
    id: "all_modes",
    name: "Versatile",
    description: "Play both Nerf mode and Buff mode.",
    icon: "Award",
    rarity: "rare",
    category: "journey",
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

  // ===================== Victories =====================
  {
    id: "first_win",
    name: "First Blood",
    description: "Win your first game.",
    icon: "Sword",
    rarity: "common",
    category: "victory",
    goal: 1,
    contribution: aWin,
  },
  {
    id: "wins_5",
    name: "High Five",
    description: "Win 5 games.",
    icon: "Zap",
    rarity: "common",
    category: "victory",
    goal: 5,
    contribution: aWin,
  },
  {
    id: "wins_10",
    name: "Contender",
    description: "Win 10 games.",
    icon: "Medal",
    rarity: "rare",
    category: "victory",
    goal: 10,
    contribution: aWin,
  },
  {
    id: "wins_25",
    name: "Rising Star",
    description: "Win 25 games.",
    icon: "TrendingUp",
    rarity: "rare",
    category: "victory",
    goal: 25,
    contribution: aWin,
  },
  {
    id: "wins_50",
    name: "Conqueror",
    description: "Win 50 games.",
    icon: "Trophy",
    rarity: "epic",
    category: "victory",
    goal: 50,
    contribution: aWin,
  },
  {
    id: "wins_100",
    name: "Warlord",
    description: "Win 100 games.",
    icon: "Crown",
    rarity: "legendary",
    category: "victory",
    goal: 100,
    contribution: aWin,
  },
  {
    id: "wins_250",
    name: "Unstoppable",
    description: "Win 250 games.",
    icon: "CloudLightning",
    rarity: "legendary",
    category: "victory",
    goal: 250,
    contribution: aWin,
  },
  {
    id: "wins_500",
    name: "Hall of Famer",
    description: "Win 500 games.",
    icon: "Ribbon",
    rarity: "legendary",
    category: "victory",
    goal: 500,
    contribution: aWin,
  },
  {
    id: "rated_win_1",
    name: "Proving Ground",
    description: "Win your first rated game.",
    icon: "BadgeCheck",
    rarity: "common",
    category: "victory",
    goal: 1,
    contribution: ratedWin,
  },
  {
    id: "rated_wins_10",
    name: "Point Collector",
    description: "Win 10 rated games.",
    icon: "Coins",
    rarity: "rare",
    category: "victory",
    goal: 10,
    contribution: ratedWin,
  },
  {
    id: "rated_wins_50",
    name: "Serious Business",
    description: "Win 50 rated games.",
    icon: "Key",
    rarity: "epic",
    category: "victory",
    goal: 50,
    contribution: ratedWin,
  },
  {
    id: "double_champion",
    name: "Double Champion",
    description: "Win a game in Nerf mode and a game in Buff mode.",
    icon: "Sun",
    rarity: "rare",
    category: "victory",
    goal: 1,
    // Same trick as all_modes: this game's win supplies one mode, a previously
    // unlocked per-mode win supplies the other.
    contribution: (ctx) => {
      if (!ctx.won) return 0;
      const wonNerf = ctx.mode === "nerf" || ctx.unlocked.has("nerf_wins_1");
      const wonBuff = ctx.mode === "buff" || ctx.unlocked.has("win_buff");
      return wonNerf && wonBuff ? 1 : 0;
    },
  },

  // ===================== Regicide =====================
  {
    id: "regicide",
    name: "Regicide",
    description: "Win by capturing the enemy king.",
    icon: "Skull",
    rarity: "common",
    category: "regicide",
    goal: 1,
    contribution: regicideWin,
  },
  {
    id: "regicide_10",
    name: "Crown Collector",
    description: "Capture 10 enemy kings.",
    icon: "Crown",
    rarity: "rare",
    category: "regicide",
    goal: 10,
    contribution: regicideWin,
  },
  {
    id: "regicide_50",
    name: "Throne Breaker",
    description: "Capture 50 enemy kings.",
    icon: "Hammer",
    rarity: "epic",
    category: "regicide",
    goal: 50,
    contribution: regicideWin,
  },
  {
    id: "regicide_100",
    name: "King of Kings",
    description: "Capture 100 enemy kings.",
    icon: "Castle",
    rarity: "legendary",
    category: "regicide",
    goal: 100,
    contribution: regicideWin,
  },
  {
    id: "regicide_250",
    name: "Dynasty Ender",
    description: "Capture 250 enemy kings. Royalty fears you.",
    icon: "Skull",
    rarity: "legendary",
    category: "regicide",
    goal: 250,
    contribution: regicideWin,
  },

  // ===================== Nerf Mode =====================
  {
    id: "nerf_games_10",
    name: "Nerf Regular",
    description: "Finish 10 games in Nerf mode.",
    icon: "Turtle",
    rarity: "common",
    category: "nerf",
    goal: 10,
    contribution: nerfPlayed,
  },
  {
    id: "nerf_games_50",
    name: "Nerf Devotee",
    description: "Finish 50 games in Nerf mode.",
    icon: "Ghost",
    rarity: "rare",
    category: "nerf",
    goal: 50,
    contribution: nerfPlayed,
  },
  {
    id: "nerf_games_100",
    name: "Nerf Scholar",
    description: "Finish 100 games in Nerf mode.",
    icon: "GraduationCap",
    rarity: "epic",
    category: "nerf",
    goal: 100,
    contribution: nerfPlayed,
  },
  {
    id: "nerf_wins_1",
    name: "Nerf Winner",
    description: "Win a game in Nerf mode.",
    icon: "Leaf",
    rarity: "common",
    category: "nerf",
    goal: 1,
    contribution: nerfWin,
  },
  {
    id: "win_nerf_mode",
    name: "Handicap Match",
    description: "Win a rated game in Nerf mode.",
    icon: "Flame",
    rarity: "common",
    category: "nerf",
    goal: 1,
    contribution: (ctx) => (ctx.won && ctx.mode === "nerf" && ctx.rated ? 1 : 0),
  },
  {
    id: "nerf_wins_10",
    name: "Nerf Knight",
    description: "Win 10 games in Nerf mode.",
    icon: "Sword",
    rarity: "rare",
    category: "nerf",
    goal: 10,
    contribution: nerfWin,
  },
  {
    id: "nerf_wins_50",
    name: "Nerf Baron",
    description: "Win 50 games in Nerf mode.",
    icon: "Ship",
    rarity: "epic",
    category: "nerf",
    goal: 50,
    contribution: nerfWin,
  },
  {
    id: "nerf_wins_100",
    name: "Nerf Monarch",
    description: "Win 100 games in Nerf mode.",
    icon: "Crown",
    rarity: "legendary",
    category: "nerf",
    goal: 100,
    contribution: nerfWin,
  },
  {
    id: "win_nerfed",
    name: "What Handicap?",
    description: "Win a game while carrying a secret nerf.",
    icon: "ShieldOff",
    rarity: "rare",
    category: "nerf",
    goal: 1,
    contribution: nerfedWin,
  },
  {
    id: "nerfed_wins_10",
    name: "Handicap Hero",
    description: "Win 10 games while carrying a secret nerf.",
    icon: "Dumbbell",
    rarity: "epic",
    category: "nerf",
    goal: 10,
    contribution: nerfedWin,
  },
  {
    id: "nerfed_wins_50",
    name: "Unbreakable",
    description: "Win 50 games while carrying a secret nerf.",
    icon: "Mountain",
    rarity: "legendary",
    category: "nerf",
    goal: 50,
    contribution: nerfedWin,
  },
  {
    id: "win_tier4",
    name: "Heavy Lifting",
    description: "Win while carrying a tier 4 or harsher handicap.",
    icon: "Hammer",
    rarity: "rare",
    category: "nerf",
    goal: 1,
    contribution: (ctx) => (ctx.won && ctx.wasNerfed && ctx.myNerfTier >= 4 ? 1 : 0),
  },
  {
    id: "win_brutal_nerf",
    name: "Against All Odds",
    description: "Win while carrying a tier 6 or harsher handicap.",
    icon: "Shield",
    rarity: "epic",
    category: "nerf",
    goal: 1,
    contribution: brutalWin,
  },
  {
    id: "brutal_wins_10",
    name: "Pain Tolerance",
    description: "Win 10 games while carrying a tier 6 or harsher handicap.",
    icon: "Flame",
    rarity: "legendary",
    category: "nerf",
    goal: 10,
    contribution: brutalWin,
  },
  {
    id: "win_tier8",
    name: "Impossible Mode",
    description: "Win while carrying a tier 8 handicap. How?",
    icon: "Moon",
    rarity: "legendary",
    category: "nerf",
    goal: 1,
    contribution: (ctx) => (ctx.won && ctx.wasNerfed && ctx.myNerfTier >= 8 ? 1 : 0),
  },

  // ===================== Buff Mode & Draft =====================
  {
    id: "buff_games_10",
    name: "Buff Regular",
    description: "Finish 10 games in Buff mode.",
    icon: "Wand2",
    rarity: "common",
    category: "buff",
    goal: 10,
    contribution: buffPlayed,
  },
  {
    id: "buff_games_50",
    name: "Buff Devotee",
    description: "Finish 50 games in Buff mode.",
    icon: "Lightbulb",
    rarity: "rare",
    category: "buff",
    goal: 50,
    contribution: buffPlayed,
  },
  {
    id: "buff_games_100",
    name: "Buff Scholar",
    description: "Finish 100 games in Buff mode.",
    icon: "BookOpen",
    rarity: "epic",
    category: "buff",
    goal: 100,
    contribution: buffPlayed,
  },
  {
    id: "win_buff",
    name: "Power Overwhelming",
    description: "Win a game in Buff mode.",
    icon: "Sparkles",
    rarity: "rare",
    category: "buff",
    goal: 1,
    contribution: buffWin,
  },
  {
    id: "buff_wins_10",
    name: "Buff Knight",
    description: "Win 10 games in Buff mode.",
    icon: "Zap",
    rarity: "rare",
    category: "buff",
    goal: 10,
    contribution: buffWin,
  },
  {
    id: "buff_wins_50",
    name: "Buff Baron",
    description: "Win 50 games in Buff mode.",
    icon: "CloudLightning",
    rarity: "epic",
    category: "buff",
    goal: 50,
    contribution: buffWin,
  },
  {
    id: "buff_wins_100",
    name: "Buff Monarch",
    description: "Win 100 games in Buff mode.",
    icon: "Sun",
    rarity: "legendary",
    category: "buff",
    goal: 100,
    contribution: buffWin,
  },
  {
    id: "play_draft",
    name: "First Draft",
    description: "Finish a Draft game.",
    icon: "Dices",
    rarity: "common",
    category: "buff",
    goal: 1,
    contribution: draftPlayed,
  },
  {
    id: "draft_games_10",
    name: "Deck Hand",
    description: "Finish 10 Draft games.",
    icon: "Layers",
    rarity: "common",
    category: "buff",
    goal: 10,
    contribution: draftPlayed,
  },
  {
    id: "draft_games_50",
    name: "Card Shark",
    description: "Finish 50 Draft games.",
    icon: "Puzzle",
    rarity: "rare",
    category: "buff",
    goal: 50,
    contribution: draftPlayed,
  },
  {
    id: "draft_games_100",
    name: "Master Drafter",
    description: "Finish 100 Draft games.",
    icon: "Gift",
    rarity: "epic",
    category: "buff",
    goal: 100,
    contribution: draftPlayed,
  },
  {
    id: "draft_win_1",
    name: "Draft Victor",
    description: "Win a Draft game.",
    icon: "Ribbon",
    rarity: "common",
    category: "buff",
    goal: 1,
    contribution: draftWin,
  },
  {
    id: "draft_wins_10",
    name: "Sharp Drafter",
    description: "Win 10 Draft games.",
    icon: "Crosshair",
    rarity: "rare",
    category: "buff",
    goal: 10,
    contribution: draftWin,
  },
  {
    id: "draft_wins_50",
    name: "Draft Legend",
    description: "Win 50 Draft games.",
    icon: "Rainbow",
    rarity: "epic",
    category: "buff",
    goal: 50,
    contribution: draftWin,
  },
  {
    id: "draft_tier4",
    name: "Quality Goods",
    description: "Draft a tier 4 or higher card.",
    icon: "Coins",
    rarity: "common",
    category: "buff",
    goal: 1,
    contribution: (ctx) => (ctx.maxBuffTier >= 4 ? 1 : 0),
  },
  {
    id: "draft_high",
    name: "Stacked Deck",
    description: "Draft a tier 6 or higher card.",
    icon: "Gem",
    rarity: "rare",
    category: "buff",
    goal: 1,
    contribution: tier6Pick,
  },
  {
    id: "draft_tier8",
    name: "Top Shelf",
    description: "Draft a tier 8 (Unhinged) card.",
    icon: "Star",
    rarity: "epic",
    category: "buff",
    goal: 1,
    contribution: tier8Pick,
  },
  {
    id: "tier6_picks_25",
    name: "Luxury Taste",
    description: "Draft a tier 6 or higher card in 25 different games.",
    icon: "Gem",
    rarity: "epic",
    category: "buff",
    goal: 25,
    contribution: tier6Pick,
  },
  {
    id: "tier8_picks_10",
    name: "Unhinged Collector",
    description: "Draft a tier 8 (Unhinged) card in 10 different games.",
    icon: "Star",
    rarity: "legendary",
    category: "buff",
    goal: 10,
    contribution: tier8Pick,
  },

  // ===================== Daring Feats =====================
  // ----- Comebacks -----
  {
    id: "win_behind_material",
    name: "Scrappy",
    description: "Win a game while behind on material.",
    icon: "Scale",
    rarity: "epic",
    category: "feats",
    goal: 1,
    contribution: comebackWin,
  },
  {
    id: "great_comeback",
    name: "The Great Comeback",
    description: "Win while down at least 5 points of material.",
    icon: "Rocket",
    rarity: "legendary",
    category: "feats",
    goal: 1,
    contribution: (ctx) => (ctx.won && ctx.materialDiff <= -5 ? 1 : 0),
  },
  {
    id: "miracle_worker",
    name: "Miracle Worker",
    description: "Win while down at least 9 points of material.",
    icon: "Wand2",
    rarity: "legendary",
    category: "feats",
    goal: 1,
    contribution: (ctx) => (ctx.won && ctx.materialDiff <= -9 ? 1 : 0),
  },
  {
    id: "comeback_wins_10",
    name: "Comeback Kid",
    description: "Win 10 games while behind on material.",
    icon: "Rocket",
    rarity: "legendary",
    category: "feats",
    goal: 10,
    contribution: comebackWin,
  },

  // ----- Domination -----
  {
    id: "win_up_10",
    name: "Steamroller",
    description: "Win while ahead by 10 or more points of material.",
    icon: "Waves",
    rarity: "rare",
    category: "feats",
    goal: 1,
    contribution: (ctx) => (ctx.won && ctx.materialDiff >= 10 ? 1 : 0),
  },
  {
    id: "win_up_15",
    name: "Total Domination",
    description: "Win while ahead by 15 or more points of material.",
    icon: "Flame",
    rarity: "epic",
    category: "feats",
    goal: 1,
    contribution: (ctx) => (ctx.won && ctx.materialDiff >= 15 ? 1 : 0),
  },

  // ----- Giant slaying -----
  {
    id: "giant_slayer_50",
    name: "Punching Up",
    description: "Beat an opponent rated 50 or more above you.",
    icon: "Target",
    rarity: "common",
    category: "feats",
    goal: 1,
    contribution: (ctx) =>
      ctx.won && ctx.opponentRatingDelta != null && ctx.opponentRatingDelta >= 50 ? 1 : 0,
  },
  {
    id: "giant_slayer",
    name: "Giant Slayer",
    description: "Beat an opponent rated 100 or more above you.",
    icon: "Target",
    rarity: "rare",
    category: "feats",
    goal: 1,
    contribution: giantSlay,
  },
  {
    id: "giant_slayer_200",
    name: "Dragon Slayer",
    description: "Beat an opponent rated 200 or more above you.",
    icon: "Axe",
    rarity: "epic",
    category: "feats",
    goal: 1,
    contribution: (ctx) =>
      ctx.won && ctx.opponentRatingDelta != null && ctx.opponentRatingDelta >= 200 ? 1 : 0,
  },
  {
    id: "giant_slayer_300",
    name: "Legend Killer",
    description: "Beat an opponent rated 300 or more above you.",
    icon: "Skull",
    rarity: "legendary",
    category: "feats",
    goal: 1,
    contribution: (ctx) =>
      ctx.won && ctx.opponentRatingDelta != null && ctx.opponentRatingDelta >= 300 ? 1 : 0,
  },
  {
    id: "giant_slays_10",
    name: "Upset Artist",
    description: "Beat opponents rated 100 or more above you, 10 times.",
    icon: "TrendingUp",
    rarity: "epic",
    category: "feats",
    goal: 10,
    contribution: giantSlay,
  },

  // ----- Fast wins -----
  {
    id: "win_fast_20",
    name: "Speedy Win",
    description: "Win a game in 20 plies or fewer.",
    icon: "Rabbit",
    rarity: "rare",
    category: "feats",
    goal: 1,
    contribution: fastWin,
  },
  {
    id: "win_fast_12",
    name: "Lightning Strike",
    description: "Win a game in 12 plies or fewer.",
    icon: "Zap",
    rarity: "epic",
    category: "feats",
    goal: 1,
    contribution: (ctx) => (ctx.won && ctx.plies > 0 && ctx.plies <= 12 ? 1 : 0),
  },
  {
    id: "win_fast_8",
    name: "Blink of an Eye",
    description: "Win a game in 8 plies or fewer.",
    icon: "Wind",
    rarity: "legendary",
    category: "feats",
    goal: 1,
    contribution: (ctx) => (ctx.won && ctx.plies > 0 && ctx.plies <= 8 ? 1 : 0),
  },
  {
    id: "fast_wins_10",
    name: "Speed Demon",
    description: "Win 10 games in 20 plies or fewer.",
    icon: "Timer",
    rarity: "epic",
    category: "feats",
    goal: 10,
    contribution: fastWin,
  },

  // ----- Long games -----
  {
    id: "the_long_game",
    name: "The Long Game",
    description: "Win a game lasting at least 60 plies.",
    icon: "Hourglass",
    rarity: "rare",
    category: "feats",
    goal: 1,
    contribution: (ctx) => (ctx.won && ctx.plies >= 60 ? 1 : 0),
  },
  {
    id: "play_long_100",
    name: "Marathon Match",
    description: "Finish a game lasting at least 100 plies.",
    icon: "Hourglass",
    rarity: "rare",
    category: "feats",
    goal: 1,
    contribution: (ctx) => (ctx.decided && ctx.plies >= 100 ? 1 : 0),
  },
  {
    id: "win_long_100",
    name: "Endurance Champion",
    description: "Win a game lasting at least 100 plies.",
    icon: "Sunrise",
    rarity: "epic",
    category: "feats",
    goal: 1,
    contribution: (ctx) => (ctx.won && ctx.plies >= 100 ? 1 : 0),
  },
  {
    id: "play_long_150",
    name: "The Epic",
    description: "Finish a game lasting at least 150 plies.",
    icon: "Map",
    rarity: "epic",
    category: "feats",
    goal: 1,
    contribution: (ctx) => (ctx.decided && ctx.plies >= 150 ? 1 : 0),
  },
  {
    id: "play_long_200",
    name: "Never-Ending Story",
    description: "Finish a game lasting at least 200 plies.",
    icon: "Infinity",
    rarity: "legendary",
    category: "feats",
    goal: 1,
    contribution: (ctx) => (ctx.decided && ctx.plies >= 200 ? 1 : 0),
  },

  // ===================== The Ladder =====================
  // Rating marks. New accounts start at 1500, so the ladder begins above the
  // seed. These read the rating carried INTO a rated game, so the unlock lands
  // on the first rated game played at or above the mark.
  {
    id: "rating_1600",
    name: "Climber",
    description: "Climb to a rating of 1600 in any mode.",
    icon: "TrendingUp",
    rarity: "common",
    category: "ladder",
    goal: 1,
    contribution: ratedAt(1600),
  },
  {
    id: "rating_1700",
    name: "Contender Class",
    description: "Climb to a rating of 1700 in any mode.",
    icon: "Flag",
    rarity: "rare",
    category: "ladder",
    goal: 1,
    contribution: ratedAt(1700),
  },
  {
    id: "rating_1800",
    name: "Expert",
    description: "Climb to a rating of 1800 in any mode.",
    icon: "Star",
    rarity: "epic",
    category: "ladder",
    goal: 1,
    contribution: ratedAt(1800),
  },
  {
    id: "rating_1900",
    name: "Master",
    description: "Climb to a rating of 1900 in any mode.",
    icon: "GraduationCap",
    rarity: "epic",
    category: "ladder",
    goal: 1,
    contribution: ratedAt(1900),
  },
  {
    id: "rating_2000",
    name: "Grandmaster",
    description: "Climb to a rating of 2000 in any mode.",
    icon: "Crown",
    rarity: "legendary",
    category: "ladder",
    goal: 1,
    contribution: ratedAt(2000),
  },
  {
    id: "nerf_rating_1700",
    name: "Nerf Ace",
    description: "Climb to a 1700 rating in Nerf mode.",
    icon: "Shield",
    rarity: "rare",
    category: "ladder",
    goal: 1,
    contribution: ratedAtIn("nerf", 1700),
  },
  {
    id: "nerf_rating_1900",
    name: "Nerf Elite",
    description: "Climb to a 1900 rating in Nerf mode.",
    icon: "ShieldOff",
    rarity: "epic",
    category: "ladder",
    goal: 1,
    contribution: ratedAtIn("nerf", 1900),
  },
  {
    id: "buff_rating_1700",
    name: "Buff Ace",
    description: "Climb to a 1700 rating in Buff mode.",
    icon: "Sparkles",
    rarity: "rare",
    category: "ladder",
    goal: 1,
    contribution: ratedAtIn("buff", 1700),
  },
  {
    id: "buff_rating_1900",
    name: "Buff Elite",
    description: "Climb to a 1900 rating in Buff mode.",
    icon: "Sun",
    rarity: "epic",
    category: "ladder",
    goal: 1,
    contribution: ratedAtIn("buff", 1900),
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
    myRating: facts.rated ? facts.myRatingBefore : null,
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
