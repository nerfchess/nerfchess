// Local game history (localStorage). Every completed game is appended here so
// the Stats page can show results, streaks, and a rating trace. Designed to be
// swapped for a server-side archive when accounts land.

const STORAGE_KEY = "nerfchess.history.v1";
const MAX_RECORDS = 500;

export type GameOutcome = "win" | "loss" | "draw";

export interface GameRecord {
  ts: number; // completion time (ms epoch)
  mode: "ai" | "friend";
  outcome: GameOutcome;
  reason: string;
  rated: boolean;
  opponent: string; // "Easy Bot", "Friend", ...
  myNerf: string | null;
  opponentNerf: string | null;
  moves: number; // plies in the game
  durationSec: number | null;
  timeControl: string; // "10+0", "unlimited"
  ratingAfter: number | null; // only for rated games
}

export function formatTimeControl(baseSec: number, incrementSec: number): string {
  if (!baseSec) return "unlimited";
  const base = baseSec % 60 === 0 ? String(baseSec / 60) : (baseSec / 60).toFixed(1);
  return `${base}+${incrementSec || 0}`;
}

export function loadHistory(): GameRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is GameRecord =>
        !!r &&
        typeof r.ts === "number" &&
        (r.outcome === "win" || r.outcome === "loss" || r.outcome === "draw")
    );
  } catch {
    return [];
  }
}

export function recordGame(record: GameRecord) {
  if (typeof window === "undefined") return;
  try {
    const all = [...loadHistory(), record].slice(-MAX_RECORDS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}
