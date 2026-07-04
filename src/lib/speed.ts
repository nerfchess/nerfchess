// Speed-category (time-control bucket) logic shared by the browser, the
// standalone game server, and the Cloudflare worker. Keep this module free of
// UI imports (icons, React) so server bundles can use it directly; the
// UI-facing registry in ratingCategories.ts builds on top of it.

export type SpeedCategory = "ultrabullet" | "bullet" | "blitz" | "rapid";

export const SPEED_CATEGORIES: SpeedCategory[] = ["ultrabullet", "bullet", "blitz", "rapid"];

export function isSpeedCategory(value: unknown): value is SpeedCategory {
  return typeof value === "string" && (SPEED_CATEGORIES as string[]).includes(value);
}

/** Classify a time control into a speed bucket, Lichess-style: the estimated
 *  game duration is base time plus 40 moves of increment. An untimed game
 *  (timeSec = 0) counts as rapid, the slowest bucket we rate. */
export function categoryForTimeControl(timeSec: number, incrementSec: number): SpeedCategory {
  if (!timeSec) return "rapid";
  const estimatedSec = timeSec + 40 * incrementSec;
  if (estimatedSec < 30) return "ultrabullet";
  if (estimatedSec < 180) return "bullet";
  if (estimatedSec < 480) return "blitz";
  return "rapid";
}
