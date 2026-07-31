// Resolving a card's canvas-VFX origin, in one place.
//
// `CardVfx.source` names where a play's particles come from ("the piece that
// moved", "the caster's king", "the sky"). Board used to resolve that with a
// switch statement written out TWICE — once on the removal-diff path and once
// on the zone path — which is exactly the kind of duplication that lets the
// canvas layer and the DOM scene layer drift apart and aim at different
// places. Both now call this.
//
// Output is a VfxPoint: board fractions in 0..1, already orientation-resolved,
// which is the same space the DOM scene layer's geometry vars are derived
// from. Canvas and overlay therefore cannot disagree about where a play
// happens.

import type { BoardState, Color, Square } from "@/engine/types";
import { findKing } from "@/engine/board";
import { frac } from "./geometry";
import type { VfxPoint } from "./vfx/types";
import type { CardVfx } from "./vfxSpecs";

/** Everything the source vocabulary can refer to. */
export interface VfxSourceCtx {
  /** The choreography's origin square (an explicit lead, or the first victim). */
  leadSq: Square;
  /** The square the card was cast on, when the surface knew it. */
  castSq?: Square | null;
  /** The move played this turn, for "mover". */
  moveFrom?: Square | null;
  /** Whose card this is. */
  casterColor: Color;
  board: BoardState;
  orientation: Color;
}

/** Above the top edge of the board: where "sky" sources fall from. */
const SKY: VfxPoint = { x: 0.5, y: -0.06 };
/** Dead centre, the last-resort fallback. */
const CENTRE: VfxPoint = { x: 0.5, y: 0.5 };

export function resolveVfxSource(source: CardVfx["source"], ctx: VfxSourceCtx): VfxPoint {
  switch (source) {
    case "mover":
      return ctx.moveFrom != null
        ? frac(ctx.moveFrom, ctx.orientation)
        : frac(ctx.leadSq, ctx.orientation);
    case "caster": {
      const k = findKing(ctx.board, ctx.casterColor);
      return k != null ? frac(k, ctx.orientation) : CENTRE;
    }
    case "sky":
      return SKY;
    case "center":
      return CENTRE;
    case "cast":
      // The square the card was played on. Falls back to the choreography's
      // own origin when the surface did not tell us — a diff-less play has no
      // square at all, and guessing one would aim the canvas somewhere the DOM
      // art is not.
      return ctx.castSq != null
        ? frac(ctx.castSq, ctx.orientation)
        : frac(ctx.leadSq, ctx.orientation);
    default:
      return frac(ctx.leadSq, ctx.orientation);
  }
}
