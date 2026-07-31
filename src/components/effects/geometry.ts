// The one board-geometry contract, shared by every effect layer.
//
// Before this module the same orientation flip was written out four separate
// times: Board's sqToFrac (canvas VFX), passive/contract.ts squareCenter
// (passive lifecycle), NerfRevealSplash's inline percentages, and every
// hand-rolled `orientation === "w" ? f : 7 - f` inside a scene. They agreed by
// luck rather than by construction, and none of them could answer the two
// questions the directional work needs: "where is this square relative to the
// board centre" and "which way does this effect point".
//
// Everything here is pure: no React, no CSS, no engine imports beyond the
// square helpers. Any layer can import it without a cycle.
//
// Coordinate conventions
//   square    0..63, rank-major, 0 = a1, 7 = h1, 56 = a8, 63 = h8.
//   view cell { col, row } in 0..7 with row 0 at the TOP of the screen, i.e.
//             already resolved for the side shown at the bottom of the board.
//   fraction  { x, y } in 0..1 across the board crop, the canvas VFX space.
//   cells     signed distances measured in squares, the unit the DOM scene art
//             works in (one cell = 12.5% of the board = 100% of a square).

import { FILE, RANK, type Color, type Square } from "@/engine/types";

/** Board edge length in squares. Named so the intent reads at the call site. */
export const BOARD_CELLS = 8;

export interface ViewCell {
  /** 0 = the file drawn at the left edge. */
  col: number;
  /** 0 = the rank drawn at the top edge. */
  row: number;
}

export interface FracPoint {
  x: number;
  y: number;
}

/**
 * A square's position as the viewer sees it. `orientation` is the colour shown
 * at the BOTTOM of the board, matching Board's own `orientation` prop.
 */
export function cellPos(sq: Square, orientation: Color): ViewCell {
  const col = orientation === "w" ? FILE(sq) : 7 - FILE(sq);
  const row = orientation === "w" ? 7 - RANK(sq) : RANK(sq);
  return { col, row };
}

/**
 * A square's centre as a 0..1 fraction of the board crop — the coordinate
 * space the canvas VFX layer draws in. Board's `sqToFrac` is now a re-export
 * of this.
 */
export function frac(sq: Square, orientation: Color): FracPoint {
  const { col, row } = cellPos(sq, orientation);
  return { x: (col + 0.5) / BOARD_CELLS, y: (row + 0.5) / BOARD_CELLS };
}

/**
 * A square's centre offset from the board centre, in cells. This is what the
 * scene art reads as `--fx-ox` / `--fx-oy`: a cast on a1 seen from White is
 * `{ -3.5, +3.5 }`, a cast on e4 is `{ +0.5, +0.5 }`.
 */
export function centreOffset(sq: Square, orientation: Color): { ox: number; oy: number } {
  const { col, row } = cellPos(sq, orientation);
  return { ox: col + 0.5 - BOARD_CELLS / 2, oy: row + 0.5 - BOARD_CELLS / 2 };
}

export interface CellDelta {
  /** Signed cell distance, positive to the viewer's right. */
  dx: number;
  /** Signed cell distance, positive DOWN the screen. */
  dy: number;
  /** Straight-line distance in cells. */
  dist: number;
  /**
   * Aim angle in degrees, CSS `rotate()` convention: 0 points right, 90 points
   * down the screen. A scene that draws its beam pointing right at rest can
   * simply `rotate(calc(var(--fx-ang) * 1deg))` to aim it.
   */
  angDeg: number;
}

/** The vector from one square to another, as the viewer sees it. */
export function cellDelta(from: Square, to: Square, orientation: Color): CellDelta {
  const a = cellPos(from, orientation);
  const b = cellPos(to, orientation);
  const dx = b.col - a.col;
  const dy = b.row - a.row;
  return {
    dx,
    dy,
    dist: Math.hypot(dx, dy),
    angDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}

/**
 * Half-extent of the oversized scene canvas, in cells.
 *
 * Scene art is authored on `BoardWideStage`: a 1400%-wide box inside a
 * ONE-CELL wrapper, offset -650%. That is 14 cells across, so it reaches 7
 * cells either side of whatever cell it is anchored on.
 */
export const STAGE_HALF_EXTENT = 7;

/**
 * How far a scene anchored on `sq` must slide so its canvas still covers the
 * whole board.
 *
 * This is the entire reason `leadShift` used to drag every scene to the board
 * centre. The real constraint is much weaker than that: a 14-cell canvas
 * covers an 8-cell board as long as its centre sits in `[8 - 7, 7]` = `[1, 7]`,
 * and square centres run 0.5 .. 7.5. So the worst case — a corner square — is
 * a HALF-CELL correction, not a three-and-a-half-cell one. Anchoring a scene
 * on the square it was cast on costs almost nothing, and the "only 1/4 of the
 * animation shows" bug never comes back, because the clamp is derived from the
 * canvas geometry rather than guessed per scene.
 *
 * Returns the shift in cells, applied on top of the square's own position.
 */
export function clampAnchor(sq: Square, orientation: Color): { sx: number; sy: number } {
  const { col, row } = cellPos(sq, orientation);
  return { sx: clampAxis(col + 0.5), sy: clampAxis(row + 0.5) };
}

/** One axis of clampAnchor: pull the centre into [8 - H, H]. */
function clampAxis(centre: number): number {
  const lo = BOARD_CELLS - STAGE_HALF_EXTENT;
  const hi = STAGE_HALF_EXTENT;
  if (centre < lo) return lo - centre;
  if (centre > hi) return hi - centre;
  return 0;
}

/**
 * Where the BOARD sits inside a scene canvas anchored on `sq`, in cells.
 *
 * A scene layer that means "the whole board" (a wash, a rain band, a horizon
 * line) cannot use a fixed percentage of the canvas once the canvas stops
 * being board-centred — that assumption is exactly what breaks under
 * anchoring. Instead such a layer renders inside `BoardFrame`, which positions
 * itself from these offsets and is therefore exact for any anchor:
 *
 *   left: calc(var(--fx-board-dx) * 100%); width: 800%;
 *
 * (100% of the one-cell wrapper is one cell; 800% is the whole board.)
 */
export function boardFrameOffset(sq: Square, orientation: Color): { bx: number; by: number } {
  const { col, row } = cellPos(sq, orientation);
  // Subtracting the clamp is load-bearing, and its absence made this function
  // false in exactly the case it exists for. The stage does not sit on the
  // cast square: near an edge it slides itself back by up to half a cell so
  // the 14-cell canvas still covers the board. The frame is drawn INSIDE that
  // stage, so it inherits the slide, and offsetting it by -col alone left it
  // displaced by the clamp -- measured in Chromium as exactly 0.5 cells at
  // every corner and 0 at e4, which is the clamp's own signature.
  const { sx, sy } = clampAnchor(sq, orientation);
  return { bx: -(col + sx), by: -(row + sy) };
}

/**
 * `--fx-board-dx/dy` for a scene that has ALREADY been slid to the board
 * centre by `boardCentreShift`.
 *
 * `boardFrameOffset` returns `-col`, which is correct only while the stage
 * still sits on the cast square. A board-anchored lead does not: its wrapper
 * is translated by `3.5 - col` cells first, so the stage's left edge lands at
 * a fixed -3 cells and the frame needs a fixed offset too. Feeding it `-col`
 * put the board frame `3.5 - col` cells off the board -- up to three and a
 * half cells at the a- and h-files, and exactly right only near the centre
 * files, which is why it read as "slightly wrong" rather than obviously
 * broken. Every board-anchored scene's wash, rain and vignette was displaced.
 *
 * The number is the same one stage.css already carries as its fallback, for
 * exactly this case.
 */
export const BOARD_ANCHORED_FRAME_OFFSET = -(STAGE_HALF_EXTENT - BOARD_CELLS / 2 + 0.5);

/** A scene's geometry with the board frame corrected for a board-anchored
 *  lead. Everything else -- aim, index, side, the cast offset -- is unchanged,
 *  because those still describe the real cast square and the art should still
 *  lean the right way even while playing centred. */
export function boardAnchoredGeo(g: SceneGeo): SceneGeo {
  // Minus the clamp, because a board-anchored lead gets BOTH shifts: the
  // wrapper re-centres it on the board, and the stage inside still clamps
  // itself off `--fx-anchor-dx/dy`. Correcting for only the first left the
  // frame displaced by the clamp -- half a cell at every corner, which is the
  // same residual the anchored path had, arriving by a different route.
  return {
    ...g,
    bx: BOARD_ANCHORED_FRAME_OFFSET - g.ax,
    by: BOARD_ANCHORED_FRAME_OFFSET - g.ay,
  };
}

/**
 * The shift that puts a cast square's oversized canvas dead centre on the
 * board — the pre-existing behaviour, kept for scenes that declare
 * `reach: "board"` because they genuinely depict something happening to the
 * whole board rather than to one square.
 */
export function boardCentreShift(sq: Square, orientation: Color): { sx: number; sy: number } {
  const { col, row } = cellPos(sq, orientation);
  return { sx: BOARD_CELLS / 2 - (col + 0.5), sy: BOARD_CELLS / 2 - (row + 0.5) };
}

/**
 * Which way the caster is pushing, as the viewer sees it: +1 when the caster's
 * home rank is at the bottom of the screen (so its effects roll upward, toward
 * negative `row`), -1 when it is at the top. Scenes read this as `--fx-side`
 * to lean particles and sweeps away from the caster instead of guessing.
 */
export function casterSide(casterColor: Color, orientation: Color): 1 | -1 {
  return casterColor === orientation ? 1 : -1;
}

// --- The geometry a scene can read ------------------------------------------
//
// Every effect wrapper Board mounts publishes these as inheriting CSS custom
// properties, so scene art can aim, lean and stretch itself without any of it
// knowing about squares, orientation or React. They are plain numbers (no
// units) so art can compose them: `rotate(calc(var(--fx-ang) * 1deg))`,
// `scaleX(calc(var(--fx-len) / 8))`, `translateX(calc(var(--fx-ox) * 100%))`.

export interface SceneGeo {
  /** Cast square offset from board centre, in cells. -3.5 .. +3.5. */
  ox: number;
  oy: number;
  /** Where the board sits in this square's canvas, in cells (see BoardFrame). */
  bx: number;
  by: number;
  /** The clamp correction keeping the canvas over the board. -0.5 .. +0.5. */
  ax: number;
  ay: number;
  /** Aim angle for this square's leg, degrees, CSS rotate convention. */
  angDeg: number;
  /** The same aim as a unit vector. Art that only translates uses these rather
   *  than CSS trig, which is not available everywhere the game runs. */
  aimX: number;
  aimY: number;
  /** Leg length in cells. 0 when the scene has no travel. */
  len: number;
  /** This square's place in the victim order, and the total. */
  index: number;
  n: number;
  /** +1 when the caster sits at the bottom of the screen, -1 at the top. */
  side: 1 | -1;
}

/**
 * The CSS variable names scene art reads. Kept here so the complexity gate and
 * every scene module agree on the spelling.
 */
export const FX_GEO_VAR_NAMES = [
  "--fx-ox",
  "--fx-oy",
  "--fx-board-dx",
  "--fx-board-dy",
  "--fx-anchor-dx",
  "--fx-anchor-dy",
  "--fx-ang",
  "--fx-aim-x",
  "--fx-aim-y",
  "--fx-len",
  "--fx-index",
  "--fx-n",
  "--fx-side",
] as const;

/**
 * Round to 3 decimals. These land in the style attribute of up to 64 wrappers
 * per play, and full float precision is both noise in the DOM and a needless
 * source of re-render churn.
 */
function r3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Build the inheriting custom properties for a scene wrapper. */
export function geoVars(g: SceneGeo): Record<string, string> {
  return {
    "--fx-ox": String(r3(g.ox)),
    "--fx-oy": String(r3(g.oy)),
    "--fx-board-dx": String(r3(g.bx)),
    "--fx-board-dy": String(r3(g.by)),
    "--fx-anchor-dx": String(r3(g.ax)),
    "--fx-anchor-dy": String(r3(g.ay)),
    "--fx-ang": String(r3(g.angDeg)),
    "--fx-aim-x": String(r3(g.aimX)),
    "--fx-aim-y": String(r3(g.aimY)),
    "--fx-len": String(r3(g.len)),
    "--fx-index": String(g.index),
    "--fx-n": String(g.n),
    "--fx-side": String(g.side),
  };
}

/**
 * The neutral geometry: a scene that has no travel and no caster to lean away
 * from still gets well-defined vars, so art never has to guard against a
 * missing custom property.
 */
export function neutralGeo(sq: Square, orientation: Color): SceneGeo {
  const { ox, oy } = centreOffset(sq, orientation);
  const { bx, by } = boardFrameOffset(sq, orientation);
  const { sx, sy } = clampAnchor(sq, orientation);
  return {
    ox,
    oy,
    bx,
    by,
    ax: sx,
    ay: sy,
    angDeg: 0,
    aimX: 1,
    aimY: 0,
    len: 0,
    index: 0,
    n: 1,
    side: 1,
  };
}

/**
 * Geometry for a scene with no square at all — the diff-less cast lead, which
 * stages inside a synthetic cell at the board centre because the play removed
 * nothing and touched no zone. Art still gets a complete, well-defined var set;
 * it simply describes a centred, aimless scene.
 */
export function centreGeo(): SceneGeo {
  return {
    ox: 0,
    oy: 0,
    bx: -3.5,
    by: -3.5,
    ax: 0,
    ay: 0,
    angDeg: 0,
    aimX: 1,
    aimY: 0,
    len: 0,
    index: 0,
    n: 1,
    side: 1,
  };
}

/** One cell as a percentage of the board. Scene art works in these units. */
export const CELL_PCT = 100 / BOARD_CELLS;

/**
 * Convert a cell shift into the percentage translate of a ONE-CELL wrapper —
 * the unit Board's per-square effect wrappers live in, where 100% is one
 * square and 800% is the whole board.
 */
export function cellsToWrapperPct(cells: number): number {
  return cells * 100;
}
