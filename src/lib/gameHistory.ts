// Completed-game history persistence (localStorage). Games are recorded once,
// from the "game ended" hook on each play page, newest first. This is purely
// additive bookkeeping: nothing in gameplay reads from it.

import { Color } from "@/engine/types";
import { Nerf } from "@/engine/nerf";

const STORAGE_KEY = "dc:game-history-v1";
// Keep the list bounded so localStorage stays small no matter how much you play.
const MAX_ENTRIES = 200;

export type GameOutcome = "win" | "loss" | "draw";

export type NerfSummary = { name: string; description: string; tier: number };

export type CompletedGame = {
  id: string;
  endedAt: number; // epoch ms
  mode: "ai" | "friend" | "online";
  opponent: string;
  myColor: Color;
  outcome: GameOutcome;
  reason: string;
  rated: boolean;
  moveCount: number;
  /** Seconds per side; 0 means no clock. */
  baseSec: number;
  incSec: number;
  ratingChange: { before: number; after: number } | null;
  myNerf: NerfSummary | null;
  opponentNerf: NerfSummary | null;
  /** UCI move list, recorded since replays shipped; older entries lack it. */
  moves?: string[];
  /** Server match id for online/friend games — the archived copy lives at /game/{id}. */
  serverGameId?: string | null;
};

export function nerfSummary(nerf: Nerf | null | undefined): NerfSummary | null {
  if (!nerf) return null;
  return { name: nerf.name, description: nerf.description, tier: nerf.tier };
}

export function outcomeFor(winner: Color | "draw" | null, myColor: Color): GameOutcome {
  if (winner === "draw") return "draw";
  return winner === myColor ? "win" : "loss";
}

export function loadGameHistory(): CompletedGame[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (g): g is CompletedGame =>
        !!g &&
        typeof g.id === "string" &&
        typeof g.endedAt === "number" &&
        (g.outcome === "win" || g.outcome === "loss" || g.outcome === "draw")
    );
  } catch {
    return [];
  }
}

export function recordCompletedGame(
  entry: Omit<CompletedGame, "id" | "endedAt">
): CompletedGame {
  const completed: CompletedGame = {
    ...entry,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    endedAt: Date.now(),
  };
  if (typeof window === "undefined") return completed;
  try {
    const history = [completed, ...loadGameHistory()].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Quota or private-mode failure: the game still finishes normally.
  }
  return completed;
}

/** Lichess-style speed bucket for a base time in seconds (0 = no clock). */
export function speedLabel(baseSec: number): string {
  if (baseSec <= 0) return "Unlimited";
  if (baseSec < 180) return "Bullet";
  if (baseSec < 600) return "Blitz";
  if (baseSec < 1800) return "Rapid";
  return "Classical";
}

/** Compact "10+0" style time control; a dash when there is no clock. */
export function timeControlLabel(baseSec: number, incSec: number): string {
  if (baseSec <= 0) return "∞";
  const base = baseSec < 60 ? `${baseSec}s` : `${Math.round(baseSec / 60)}`;
  return `${base}+${incSec}`;
}
