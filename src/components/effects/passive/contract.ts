// Shared props contract for the passive lifecycle components.
//
// These four components (PassiveSpawn, PassiveAura, PassivePulse, PassiveExit)
// are PRESENTATIONAL. They take a card id, the effect color, the target squares,
// and the board metrics, and render the corresponding lifecycle stage inside the
// board viewport. They own no game state and read nothing from the engine; the
// later wiring phase (see docs/passive-effect-audit.md section 5) is responsible
// for computing targetSquares and boardMetrics from synced game state and for
// mounting/unmounting these components at the right plies.
//
// Coordinate convention (documented for the wiring phase):
//   - A square index is 0..63, rank-major: 0 = a1, 7 = h1, 56 = a8, 63 = h8.
//   - boardMetrics.orientation names the side shown at the BOTTOM of the board.
//   - squareCenter() returns pixel coordinates in the board viewport's own
//     coordinate space (the stacking context BoardEffects documents), so the
//     components can be absolutely positioned without knowing page layout.

export type Side = "white" | "black";

/** Geometry of the rendered board, supplied by the wiring layer. */
export interface BoardMetrics {
  /** Edge length of one square, in px. */
  squarePx: number;
  /** Left offset of the board's a-file edge within the effects layer, in px. */
  originX: number;
  /** Top offset of the board's top edge within the effects layer, in px. */
  originY: number;
  /** Side shown at the bottom of the board. */
  orientation: Side;
}

export interface Point {
  x: number;
  y: number;
}

/** Center pixel of a square (0..63, rank-major) for the current orientation. */
export function squareCenter(sq: number, m: BoardMetrics): Point {
  const file = sq % 8; // 0 = a
  const rank = Math.floor(sq / 8); // 0 = rank 1
  const col = m.orientation === "white" ? file : 7 - file;
  const row = m.orientation === "white" ? 7 - rank : rank; // row 0 = top
  return {
    x: m.originX + col * m.squarePx + m.squarePx / 2,
    y: m.originY + row * m.squarePx + m.squarePx / 2,
  };
}

/** Common props shared by every lifecycle component. */
export interface PassiveLifecycleProps {
  /** Card id (unique within its family). */
  cardId: string;
  /** Which library the card is from; disambiguates the 4 shared ids. Defaults
   *  to trying nerf first, then buff. */
  cardFamily?: "nerf" | "buff";
  /** The side the effect belongs to; part of the activation id. */
  color: Side;
  /** Squares the effect lands on (0..63, rank-major). May be empty for
   *  board/clock/winCondition targets that do not attach to squares. */
  targetSquares: number[];
  /** Board geometry from the wiring layer. */
  boardMetrics: BoardMetrics;
  /** Force the reduced-motion static fallback. When omitted the components read
   *  html[data-anim] and prefers-reduced-motion at mount. */
  reduced?: boolean;
  /** Optional hex override for the effect hue. Defaults to the registry color
   *  resolved from the card's palette role. */
  colorHexOverride?: string;
}
