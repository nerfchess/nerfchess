// Guards the contract that a nerf's board PAINT and its move RULE describe the
// same squares. It exists because Rising Water broke exactly that: the rule
// flooded from the owner's own back rank (mirrored by colour) while the board
// re-derived the geometry as "rank < level" for both sides, so a black-side
// flood washed cyan over rank 1 — the far end of the board from the water, and
// the squares two rooks start on.
//
//   npx tsx scripts/test-nerf-visuals.ts
//
// The check is generic: for every nerf that reports square lists from `visual`,
// every painted square must actually be forbidden by `filterMoves`, for BOTH
// colours and at every state the nerf can reach. Any future nerf that paints
// one thing and enforces another fails here.

import { ALL_NERFS } from "../src/engine/nerfs/library";
import { makeContext, newGameAsColor } from "../src/engine/game";
import { RNG } from "../src/engine/rng";
import type { Color, Move } from "../src/engine/types";
import type { Nerf, NerfState } from "../src/engine/nerf";

const errors: string[] = [];

/** Every from->to pair on the board, so the filter is probed exhaustively
 * rather than only over the handful of moves legal in one position. */
function allSquarePairs(): Move[] {
  const moves: Move[] = [];
  for (let from = 0; from < 64; from++) {
    for (let to = 0; to < 64; to++) {
      if (from !== to) moves.push({ from, to, piece: "q", color: "w" } as Move);
    }
  }
  return moves;
}

const PAIRS = allSquarePairs();

/** Squares the nerf's own filter refuses to move to, at this state. */
function forbiddenTargets(nerf: Nerf, state: NerfState, color: Color): Set<number> {
  const game = newGameAsColor(nerf, color, 1);
  const ctx = makeContext(game, color);
  const mine = PAIRS.map((m) => ({ ...m, color }));
  const allowed = new Set(nerf.filterMoves!(mine, state, ctx).map((m) => m.to));
  const out = new Set<number>();
  for (let sq = 0; sq < 64; sq++) if (!allowed.has(sq)) out.add(sq);
  return out;
}

for (const nerf of ALL_NERFS) {
  if (!nerf.visual || !nerf.filterMoves || !nerf.init) continue;
  for (const color of ["w", "b"] as Color[]) {
    const game = newGameAsColor(nerf, color, 1);
    const ctx = makeContext(game, color);
    // Walk the nerf forward through its own turn-start progression so states
    // like Rising Water's rising level are all covered, not just the initial 0.
    let state = nerf.init(new RNG(1), color);
    for (let turn = 0; turn <= 80; turn += 5) {
      if (nerf.onTurnStart) {
        state = nerf.onTurnStart(state, { ...ctx, moveNumber: turn }, new RNG(1));
      }
      let painted: number[] | undefined;
      try {
        painted = nerf.visual(state, { ...ctx, moveNumber: turn }).waterSquares;
      } catch (e) {
        errors.push(`${nerf.id} (${color}) visual threw at move ${turn}: ${String(e)}`);
        break;
      }
      if (!painted || painted.length === 0) continue;
      const forbidden = forbiddenTargets(nerf, state, color);
      const wrong = painted.filter((sq) => !forbidden.has(sq));
      if (wrong.length) {
        errors.push(
          `${nerf.id} (${color}) at move ${turn}: paints ${wrong.length} square(s) the rule ` +
            `still allows, e.g. ${wrong
              .slice(0, 4)
              .map((sq) => "abcdefgh"[sq % 8] + (Math.floor(sq / 8) + 1))
              .join(", ")}`,
        );
      }
      // And the converse: nothing the rule forbids on a colour-mirrored basis
      // should be left unpainted, or the player cannot see their own handicap.
      const unpainted = [...forbidden].filter((sq) => !painted!.includes(sq));
      if (unpainted.length && unpainted.length < 64) {
        errors.push(
          `${nerf.id} (${color}) at move ${turn}: ${unpainted.length} forbidden square(s) are ` +
            `not painted, e.g. ${unpainted
              .slice(0, 4)
              .map((sq) => "abcdefgh"[sq % 8] + (Math.floor(sq / 8) + 1))
              .join(", ")}`,
        );
      }
    }
  }
}

if (errors.length) {
  console.error(`nerf visual/rule mismatches (${errors.length}):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("nerf visual/rule agreement: OK");
