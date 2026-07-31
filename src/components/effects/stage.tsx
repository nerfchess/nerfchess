"use client";

// The scene staging primitives every play animation is built on.
//
// Scene art is mounted inside a ONE-CELL grid wrapper (Board's per-square
// effect slot) and then blown up to an oversized canvas so it can spill across
// the board. Three boxes matter, and confusing them is what made effects look
// like they always happened in the middle of the board:
//
//   BoardWideStage — the 14-cell canvas, centred on the cast square. This is
//                    where the ACTION happens. Anchored, so a card cast on a1
//                    plays in the corner.
//   BoardFrame     — a box whose 0..100% is EXACTLY the board, wherever the
//                    stage is anchored. This is where anything that means "the
//                    whole board" goes: washes, rain bands, horizons, edge
//                    rings. Positioned from CSS vars, so it is exact by
//                    construction and needs no JS.
//   AimStage       — BoardWideStage plus the source -> target rotation, so art
//                    authored pointing right aims itself down the real attack
//                    vector.
//
// The geometry vars these read (--fx-board-dx, --fx-anchor-dx, --fx-ang, ...)
// are published by Board on the wrapper span; see effects/geometry.ts for the
// full contract. Custom properties inherit, so they reach here through every
// stacking context in between.
//
// This module imports nothing from BoardEffects, so plugin modules can use it
// without the import cycle the older local copies of Stage were avoiding.

import type { CSSProperties, ReactNode } from "react";
import "./stage.css";

/**
 * The oversized scene canvas, centred on the cast square.
 *
 * Geometry: a 1400% box offset -650% inside a one-cell wrapper is 14 cells
 * across, reaching 7 cells either side of the anchor cell. `--fx-anchor-dx/dy`
 * carry the clamp correction (at most half a cell) that keeps those 14 cells
 * over the 8-cell board; on the vast majority of squares it is 0 and the stage
 * sits exactly on the cast square.
 */
export function BoardWideStage({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      <span className="fx-stage absolute left-[-650%] top-[-650%] block h-[1400%] w-[1400%]">
        {children}
      </span>
    </span>
  );
}

/**
 * A box that is exactly the board, whatever the stage is anchored on.
 *
 * Use this for every layer that means "the board": full-board washes, rain
 * that should fall over the playing area, a horizon line, an edge ring. A
 * fixed percentage of the stage CANNOT mean this once the stage is anchored on
 * the cast square, and that mismatch is the whole class of bug anchoring would
 * otherwise introduce.
 *
 * 100% of the one-cell wrapper is one cell, so the board is 800% and sits at
 * `-col, -row` cells from the anchor.
 */
export function BoardFrame({ children }: { children: ReactNode }) {
  return (
    <span className="fx-board-frame absolute block" aria-hidden="true">
      {children}
    </span>
  );
}

/**
 * The scene canvas, rotated to point down the play's own attack vector.
 *
 * Author the art pointing RIGHT (+x) at rest; it aims itself. Rotation is
 * about the anchor, so a beam starts at the cast square and sweeps toward the
 * victim rather than sitting at a fixed screen angle.
 */
export function AimStage({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      <span className="fx-stage absolute left-[-650%] top-[-650%] block h-[1400%] w-[1400%]">
        <span className="fx-aim absolute inset-0 block">{children}</span>
      </span>
    </span>
  );
}

/**
 * Shift a layer along the play's attack vector — the common "lean this toward
 * the victim" move. `cells` is in board squares, and the unit vector arrives
 * precomputed (`--fx-aim-x/y`) rather than via CSS trig, which is not
 * available on every browser the game supports.
 *
 * Percentages here resolve against the element's own box, so this is meant for
 * a layer sized to roughly one cell. Sized differently, scale `cells` to match.
 */
export function aimOffsetStyle(cells: number): CSSProperties {
  return {
    transform: `translate(calc(var(--fx-aim-x, 1) * ${cells * 100}%), calc(var(--fx-aim-y, 0) * ${cells * 100}%))`,
  };
}
