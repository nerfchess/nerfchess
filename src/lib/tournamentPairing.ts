// Swiss-style round pairing, pure and deterministic.
//
// This module has no imports on purpose: it is shared by the server engine
// (src/lib/server/tournamentEngine.ts) and the unit test
// (scripts/test-tournament-pairing.ts), and its output must be a pure
// function of its inputs so a re-run over the same state pairs identically.
//
// The rules, in order:
//   1. Rank entrants by score (desc), then rating (desc), then user id (asc,
//      the determinism tiebreak).
//   2. Odd field: the lowest-ranked player who has not had a bye yet sits
//      out with a bye (worth 1 point, scored by the caller). If everyone has
//      had one, the lowest-ranked player sits out again.
//   3. Pair from the top: the highest unpaired player meets the nearest
//      unpaired player below them they have not already played. If every
//      remaining player is a rematch, the nearest one is taken anyway
//      (avoid rematches when possible, never at the cost of a pairing).
//   4. Colors alternate by board so one player does not hold white all
//      event: on even boards the higher-ranked player is white, on odd
//      boards black.

export type PairingEntrant = {
  userId: string;
  username: string;
  score: number;
  rating: number;
};

export type PairedBoard = { white: PairingEntrant; black: PairingEntrant };

export type RoundPairing = {
  /** Boards in rank order (board 0 is the top board). */
  boards: PairedBoard[];
  /** The player sitting out this round, or null for an even field. */
  bye: PairingEntrant | null;
};

/** Canonical unordered key for a pair of user ids ("a|b" with a < b). */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Pair one Swiss round.
 *
 * @param entrants     the current field (any order; sorted internally).
 * @param previousPairs unordered user-id pairs from earlier rounds
 *                      (pairKey form, or [a, b] tuples via pairKeysOf).
 * @param previousByes  user ids that have already received a bye.
 */
export function pairSwissRound(
  entrants: PairingEntrant[],
  previousPairs: ReadonlySet<string>,
  previousByes: ReadonlySet<string>,
): RoundPairing {
  const ranked = [...entrants].sort(
    (a, b) =>
      b.score - a.score ||
      b.rating - a.rating ||
      (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0),
  );

  let bye: PairingEntrant | null = null;
  if (ranked.length % 2 === 1) {
    // Walk up from the bottom for the first player without a prior bye;
    // fall back to the very bottom when everyone has had one.
    let byeIdx = ranked.length - 1;
    for (let i = ranked.length - 1; i >= 0; i--) {
      if (!previousByes.has(ranked[i].userId)) {
        byeIdx = i;
        break;
      }
    }
    bye = ranked.splice(byeIdx, 1)[0];
  }

  const boards: PairedBoard[] = [];
  const paired = new Array<boolean>(ranked.length).fill(false);
  for (let i = 0; i < ranked.length; i++) {
    if (paired[i]) continue;
    paired[i] = true;
    // Nearest unpaired non-rematch below; nearest unpaired as the fallback.
    let opponent = -1;
    let fallback = -1;
    for (let j = i + 1; j < ranked.length; j++) {
      if (paired[j]) continue;
      if (fallback < 0) fallback = j;
      if (!previousPairs.has(pairKey(ranked[i].userId, ranked[j].userId))) {
        opponent = j;
        break;
      }
    }
    const pick = opponent >= 0 ? opponent : fallback;
    if (pick < 0) break; // no one left (only possible on a malformed even split)
    paired[pick] = true;
    const board = boards.length;
    const high = ranked[i];
    const low = ranked[pick];
    boards.push(board % 2 === 0 ? { white: high, black: low } : { white: low, black: high });
  }

  return { boards, bye };
}
