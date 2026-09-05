// Impact vocabulary components: composable violence for flagship scenes.
//
// <LaserStrike>, <PieceShatter>, <Shockwave> mount inside a scene's target
// cell (any absolutely-positioned square-sized box); `quake` is a class for
// the scene's own stage root. See impact.css for the timing contract: the
// laser leads, everything else lands on the shared --imp-delay impact beat,
// so a composite reads as ONE hit. Tint with --imp-rgb.
//
// Node budget: laser 2, shatter 6, shockwave 1 — a full "laser a piece in
// half" composite is 9 nodes, leaving room inside the 16-node scene cap.

import * as React from "react";
import "./impact.css";

type Vars = React.CSSProperties & { "--imp-rgb"?: string; "--imp-delay"?: string };

/** Set the impact tint / delay on a wrapping element. */
export function impactVars(rgb?: string, delaySec?: number): Vars {
  const v: Vars = {};
  if (rgb) v["--imp-rgb"] = rgb;
  if (delaySec != null) v["--imp-delay"] = `${delaySec}s`;
  return v;
}

/** The descending column of light plus its ground flare. */
export function LaserStrike() {
  return (
    <>
      <span className="imp-laser" />
      <span className="imp-laser-flare" />
    </>
  );
}

/** The struck piece splits in half and falls apart, spraying four shards.
 * `glyph` is the full-size silhouette the halves are clipped from — pass the
 * scene's own SVG (or a simple slab) rendered to fill the cell. */
export function PieceShatter({ glyph }: { glyph: React.ReactNode }) {
  return (
    <>
      <span className="imp-half imp-half--l">
        <span>{glyph}</span>
      </span>
      <span className="imp-half imp-half--r">
        <span>{glyph}</span>
      </span>
      <span className="imp-shard" />
      <span className="imp-shard" />
      <span className="imp-shard" />
      <span className="imp-shard" />
    </>
  );
}

/** One expanding ground ring from the impact point. */
export function Shockwave() {
  return <span className="imp-shockwave" />;
}

/** Class for the scene's stage root so the whole stage jolts on the impact
 * beat. In-scene only: a plugin never shakes the real board crop. */
export const QUAKE_CLASS = "imp-quake";
