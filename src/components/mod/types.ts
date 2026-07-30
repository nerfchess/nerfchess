// Shared row shapes for the moderation console. These mirror what the
// /api/mod/* routes return; each section component imports the ones it needs
// instead of every section re-declaring its own copy.

export interface Report {
  id: string;
  reporter_name: string;
  reported_name: string;
  reason: string;
  description: string;
  game_id: string | null;
  status: string;
  handled_by: string | null;
  created_at: number;
}

export interface ChatFlag {
  id: string;
  match_id: string;
  username: string;
  text: string;
  matched_words: string;
  created_at: number;
  reviewed: number;
}

export interface ModUser {
  id: string;
  username: string;
  role: string;
  rating: number;
  games: number;
  created_at: number;
  muted_until: number | null;
  banned_until: number | null;
  // 1 for transient guest accounts (users.is_guest); 0/undefined for members.
  is_guest?: number;
}

export interface HistoryEntry {
  mod_name: string;
  target_name?: string;
  action: string;
  expires_at: number | null;
  note: string | null;
  created_at: number;
}

export interface UserReportEntry {
  reporter_name: string;
  reason: string;
  description: string;
  status: string;
  created_at: number;
}

export interface Suggestion {
  id: string;
  name: string;
  description: string;
  contact: string | null;
  username: string | null;
  created_at: number;
  // 'nerf' or 'buff'; rows from before the buff form default to 'nerf'.
  kind: string | null;
  // For buff ideas: 'buff' (Buff mode card) or 'boon' (Nerf-mode boon).
  pool: string | null;
}

export type SeatKind = "member" | "guest" | "anon" | "house";

export interface ModGameSeat {
  name: string;
  userId: string | null;
  kind: SeatKind;
  ratingBefore: number | null;
  ratingAfter: number | null;
}

export interface ModGame {
  id: string;
  white: ModGameSeat;
  black: ModGameSeat;
  winner: "w" | "b" | "draw" | null;
  reason: string;
  rated: boolean;
  ruleset: string;
  category: string | null;
  timeSec: number;
  incrementSec: number;
  moveCount: number;
  replayable: boolean;
  durationMs: number;
  startedAt: number;
  completedAt: number;
}

export interface GamesStats {
  today: { total: number; humanVsHuman: number; humanVsHouse: number };
  week: { total: number; humanVsHuman: number; humanVsHouse: number };
  averageGame: { moves: number | null; durationMs: number | null };
  topMode: { label: string; games: number } | null;
  humansToday: { members: number; guests: number; anonSeatGames: number };
  // Guest accounts minted today / this rolling week (engaged visitors who
  // opened the lobby or started a bot game, not just finished games).
  // Optional so a cached older payload shape still renders.
  guestsCreated?: { today: number; week: number };
  lastHumanGame: { id: string; completedAt: number } | null;
}

export interface Overview {
  generatedAt: number;
  accounts: {
    membersToday: number;
    membersWeek: number;
    guestsToday: number;
    guestsWeek: number;
    membersTotal: number;
  };
  queue: {
    openReports: number;
    unreviewedChatFlags: number;
    activeMutes: number;
    activeBans: number;
    modActionsWeek: number;
  };
  games: {
    humanGamesLast15Min: number;
    today: { total: number; humanVsHuman: number; humanVsHouse: number };
    week: { total: number; humanVsHuman: number; humanVsHouse: number };
    month: { total: number };
    avgDurationMs: number | null;
  };
  endings: {
    total: number;
    flagged: number;
    abandoned: number;
    resigned: number;
    decided: number;
    drawn: number;
  };
  house: {
    windowDays: number;
    vsHumanGames: number;
    tiers: {
      skill: number;
      played: number;
      won: number;
      drawn: number;
      lost: number;
      scorePct: number | null;
    }[];
  };
  nerfBalance: {
    windowDays: number;
    minSample: number;
    strongest: { id: string; picks: number; winPct: number }[];
    weakest: { id: string; picks: number; winPct: number }[];
  };
}

// Shape of a resolved house-bot strength profile (matches ResolvedSkillProfile
// in bots.ts) and the per-tier state the /api/mod/house route returns.
export type ResolvedProfile = {
  level: string;
  budgetMs: number;
  blunderChance: number;
  maxDepth: number;
  extendedEval: boolean;
  topK: number;
  temperatureCp: number;
  sampleWindowCp: number;
  evalNoiseCp: number;
};

export type SkillTier = {
  skill: number;
  defaults: ResolvedProfile;
  overrides: Record<string, unknown> | null;
  effective: ResolvedProfile;
};

export type PresetMap = Record<string, Record<string, number | boolean>>;

export type HouseState = {
  enabled: boolean;
  games: number;
  min: number;
  max: number;
  clamp: Record<string, [number, number]>;
  presets: { weakened: PresetMap; veryWeak: PresetMap };
  skillTiers: SkillTier[];
};
