// Turn an ordinary 2D play into a 3D treatment without touching the 555
// hand-tuned CARD_VFX entries. Pure: reads the play, returns a Vfx3D or
// undefined. An explicit `depth` on the play always wins (null opts out).
//
//   tier >= 4 beam (tier >= 6 bolt/chain), 2+ targets on one line     -> laser
//   tier >= 5 beam with one target and a source                        -> short laser
//   impact "shatter", tier >= 5                                        -> shatter
//   impact "shock" tier >= 6, or travel "wave" tier >= 7               -> ringWave
//   travel "rain" tier >= 7, <= 6 targets                              -> pillar
//   aftermath "frost" | "scorch", tier >= 6, <= 4 targets              -> pillar

import type { Vfx3D, VfxPlay, VfxPoint } from "../vfx/types";

const SQ = 1 / 8;
const EPS = SQ * 0.5;

function sameRank(ps: VfxPoint[]): boolean {
  return ps.every((p) => Math.abs(p.y - ps[0].y) < EPS);
}
function sameFile(ps: VfxPoint[]): boolean {
  return ps.every((p) => Math.abs(p.x - ps[0].x) < EPS);
}
function sameDiagonal(ps: VfxPoint[]): boolean {
  if (ps.length < 2) return false;
  const dx = ps[1].x - ps[0].x;
  const dy = ps[1].y - ps[0].y;
  if (Math.abs(Math.abs(dx) - Math.abs(dy)) > EPS || Math.abs(dx) < EPS) return false;
  const sign = Math.sign(dx * dy);
  return ps.every((p) => {
    const ex = p.x - ps[0].x;
    const ey = p.y - ps[0].y;
    return Math.abs(Math.abs(ex) - Math.abs(ey)) < EPS && (Math.abs(ex) < EPS || Math.sign(ex * ey) === sign);
  });
}

export function deriveDepth(play: VfxPlay): Vfx3D | undefined {
  if (play.depth === null) return undefined;
  if (play.depth) return play.depth;
  const ps = play.targets.map((t) => t.p);
  if (ps.length === 0) return undefined;
  const tier = play.tier;

  // Beams from tier 4, bolts and chains from tier 6: anything that already
  // travels in a straight line gets the laser when its victims share a line.
  const lineTravel = play.travel === "beam" ? tier >= 4 : (play.travel === "bolt" || play.travel === "chain") && tier >= 6;
  if (lineTravel && ps.length >= 2) {
    if (sameRank(ps)) {
      const y = ps[0].y;
      return { primitive: "laserRank", line: { from: { x: 0, y }, to: { x: 1, y } }, fallback: "canvas" };
    }
    if (sameFile(ps)) {
      const x = ps[0].x;
      return { primitive: "laserFile", line: { from: { x, y: 0 }, to: { x, y: 1 } }, fallback: "canvas" };
    }
    if (sameDiagonal(ps)) {
      // Extend the diagonal to the board edges.
      const a = ps[0];
      const b = ps[ps.length - 1];
      const dirx = Math.sign(b.x - a.x) || 1;
      const diry = Math.sign(b.y - a.y) || 1;
      const back = Math.min(dirx > 0 ? a.x : 1 - a.x, diry > 0 ? a.y : 1 - a.y);
      const fwd = Math.min(dirx > 0 ? 1 - b.x : b.x, diry > 0 ? 1 - b.y : b.y);
      return {
        primitive: "laserDiag",
        line: { from: { x: a.x - dirx * back, y: a.y - diry * back }, to: { x: b.x + dirx * fwd, y: b.y + diry * fwd } },
        fallback: "canvas",
      };
    }
  }
  // A single-target beam at tier 5+ still fires as a short laser from its
  // source to the victim (the 2D layer keeps its impact).
  if (tier >= 5 && play.travel === "beam" && ps.length === 1 && play.source) {
    const d = Math.hypot(ps[0].x - play.source.x, ps[0].y - play.source.y);
    if (d > SQ * 1.5) return { primitive: "laserDiag", line: { from: play.source, to: ps[0] }, fallback: "canvas" };
  }
  if (play.impact === "shatter" && tier >= 5) {
    return { primitive: "shatter", squares: ps.slice(0, 8), fallback: "none" };
  }
  if ((play.impact === "shock" && tier >= 6) || (play.travel === "wave" && tier >= 7)) {
    return { primitive: "ringWave", squares: [play.source ?? ps[0]], fallback: "none" };
  }
  // Sky-fall at tier 7+: a column of light stands on each square the rain hits.
  if (play.travel === "rain" && tier >= 7 && ps.length <= 6) {
    return { primitive: "pillar", squares: ps, height: SQ * 0.8, fallback: "none" };
  }
  if ((play.aftermath === "frost" || play.aftermath === "scorch") && tier >= 6 && ps.length <= 4) {
    return { primitive: "pillar", squares: ps, height: SQ * 0.6, fallback: "none" };
  }
  return undefined;
}
