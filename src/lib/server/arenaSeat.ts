// Canonical seat identity for a game simulated on the OCI arena.
//
// The arena service runs house-vs-house games off-box and has NO database. Its
// seat rating is a compile-time constant, houseSeedRating(persona), baked from
// the persona's name and skill (arena-service/game.ts). The seat name is the
// baked persona name for the same reason.
//
// Shipping either straight through to TV is a bug, and it is the one behind
// "this bot says 2600 on TV and 2300 on its profile": the profile reads
// user_ratings, the arena number never came from a database at all, and nothing
// reconciled them. (refreshSeatRatings does exactly this reconciliation, but
// only for matches the Durable Object runs itself.) The constant is numerically
// the frozen legacy users.rating column that ratingSql.ts already names as the
// root of the "ratings don't match between pages" reports.
//
// The gap is unbounded, not cosmetic: a moderator rating override writes the
// database and the arena cannot see it; a roster revision that reaches one
// deploy and not the other shifts one side by the full uplift spread; and arena
// games are rated, so the real bucket drifts every game while the constant
// never moves.
//
// This module holds the decision so it can be tested without standing up a
// Durable Object. The worker supplies the live values it read from its
// house-ratings cache; everything else is fallback policy.

/** What the arena claimed about a seat. */
export interface ArenaSeatClaim {
  userId: string;
  name: string;
  rating: number;
}

/** What the database actually holds, per field, when the cache has it. */
export interface LiveSeatIdentity {
  rating?: number;
  username?: string;
}

export interface ResolvedArenaSeat {
  name: string;
  rating: number;
  /** Whether the rating came from the database rather than the arena. */
  fromDatabase: boolean;
}

/**
 * Prefer the database for both fields, fall back to the arena's claim.
 *
 * The fallback is per FIELD, not all-or-nothing: a roster entry can be missing
 * a rating row for the mode being played while still having a canonical
 * username, and vice versa. Falling back wholesale on a partial cache hit would
 * reintroduce the stale rating precisely when a rename had already been picked
 * up, which is the confusing half-fixed state.
 */
export function resolveArenaSeat(
  arena: ArenaSeatClaim,
  live: LiveSeatIdentity | undefined,
): ResolvedArenaSeat {
  const rating = live?.rating;
  return {
    name: live?.username ?? arena.name,
    rating: rating ?? arena.rating,
    fromDatabase: rating != null,
  };
}
