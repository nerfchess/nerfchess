// Shared tournament vocabulary and pure helpers. Kept free of React and server
// imports so both the API route handlers and the client pages can use it. The
// canonical data lives in D1 (see src/lib/server/schema.ts and
// migrations/0015_tournament_details.sql); this module only names the enums and
// derives display values from them.

export type TournamentFormat = "arena" | "swiss" | "single-elim";
export type TournamentMode = "nerf" | "buff";
// A tournament's live phase is derived from its start time and duration rather
// than a stored column, so it advances on its own without a scheduler: an event
// becomes "ongoing" the moment its clock starts and "finished" when the window
// closes. A null start time means the date is still to be announced, which we
// surface as "upcoming".
export type TournamentPhase = "upcoming" | "ongoing" | "finished";

export const TOURNAMENT_FORMATS: TournamentFormat[] = ["arena", "swiss", "single-elim"];
export const TOURNAMENT_MODES: TournamentMode[] = ["nerf", "buff"];

export const FORMAT_LABELS: Record<TournamentFormat, string> = {
  arena: "Arena",
  swiss: "Swiss",
  "single-elim": "Single elimination",
};

export const MODE_LABELS: Record<TournamentMode, string> = {
  nerf: "Nerf",
  buff: "Buff",
};

export function isTournamentFormat(value: unknown): value is TournamentFormat {
  return typeof value === "string" && (TOURNAMENT_FORMATS as string[]).includes(value);
}

export function isTournamentMode(value: unknown): value is TournamentMode {
  return typeof value === "string" && (TOURNAMENT_MODES as string[]).includes(value);
}

export function formatLabel(format: string): string {
  return (FORMAT_LABELS as Record<string, string>)[format] ?? format;
}

export function modeLabel(mode: string): string {
  return (MODE_LABELS as Record<string, string>)[mode] ?? mode;
}

/** Derive the live phase from the start time, duration, and the current clock. */
export function tournamentPhase(
  startsAt: number | null,
  durationMin: number,
  now: number = Date.now(),
): TournamentPhase {
  if (startsAt == null) return "upcoming";
  const endsAt = startsAt + Math.max(1, durationMin) * 60_000;
  if (now < startsAt) return "upcoming";
  if (now < endsAt) return "ongoing";
  return "finished";
}

/** The instant an event closes, or null when its start is still unscheduled. */
export function tournamentEndsAt(startsAt: number | null, durationMin: number): number | null {
  if (startsAt == null) return null;
  return startsAt + Math.max(1, durationMin) * 60_000;
}

/** Lichess-style clock label: "3+2", "30s+0", or "Untimed" for a 0 base. */
export function clockLabel(timeSec: number, incrementSec: number): string {
  if (!timeSec || timeSec <= 0) return "Untimed";
  if (timeSec < 60) return `${timeSec}s+${incrementSec}`;
  const minutes = timeSec % 60 === 0 ? String(timeSec / 60) : (timeSec / 60).toFixed(1);
  return `${minutes}+${incrementSec}`;
}

/** Human duration for the arena length, e.g. "90m" -> "1h 30m". */
export function durationLabel(minutes: number): string {
  const m = Math.max(1, Math.round(minutes));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

/** Compact countdown ("2d 4h", "3h 12m", "45s", or "0s") for a future instant. */
export function countdownLabel(msRemaining: number): string {
  const s = Math.max(0, Math.floor(msRemaining / 1000));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
