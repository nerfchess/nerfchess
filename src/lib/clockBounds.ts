// The time controls the game server will actually run, in one place so the
// HTTP APIs that record or schedule a game refuse the same values the
// Durable Object refuses (worker.ts createMatch and /tournament/create-game).
// Before this, /api/tournaments accepted a 3 hour base clock that the game
// server rejects, so every board of such an event was created void (F078), and
// /api/challenges stored any integer at all (F059).
//
// worker.ts keeps its own literals today; slice H is asked to import these.

export type ClockBounds = { maxBaseSec: number; maxIncrementSec: number };

/** Friend games and direct challenges (worker.ts createMatch). */
export const CUSTOM_GAME_CLOCK: ClockBounds = { maxBaseSec: 7200, maxIncrementSec: 60 };

/** Tournament boards (worker.ts /tournament/create-game). */
export const TOURNAMENT_CLOCK: ClockBounds = { maxBaseSec: 7200, maxIncrementSec: 180 };

/** True when both values are integers inside the bounds (0 is allowed for both). */
export function clockWithin(timeSec: unknown, incrementSec: unknown, bounds: ClockBounds): boolean {
  return (
    Number.isInteger(timeSec) &&
    Number.isInteger(incrementSec) &&
    (timeSec as number) >= 0 &&
    (timeSec as number) <= bounds.maxBaseSec &&
    (incrementSec as number) >= 0 &&
    (incrementSec as number) <= bounds.maxIncrementSec
  );
}
