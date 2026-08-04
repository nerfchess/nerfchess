// Rating-chart line geometry: the smooth path may never double back in x.
//
// The playtest report behind this suite: "rating graphs still doing circles."
// The old Catmull-Rom smoothing computed control points from neighbours two
// apart, so a burst of games (tightly clustered x) followed by a long quiet
// gap flung a control point to the LEFT of its segment start and the curve
// drew a visible loop. smoothPath now uses Fritsch-Carlson monotone tangents,
// whose control points stay inside their segment by construction. This suite
// pins that property on adversarial spacings so the loop can never return.
//
// Run: npx -y tsx scripts/test-rating-chart.ts

import { smoothPath } from "../src/components/RatingChart";

let failures = 0;

function fail(name: string, detail: string) {
  failures++;
  console.error(`FAIL ${name}: ${detail}`);
}

function ok(name: string) {
  console.log(`  ok ${name}`);
}

/** Every x-coordinate the path visits, in command order: the endpoint AND the
 * control points of each cubic — a loop needs a control point behind the pen,
 * so control points are exactly what must be monotone. */
function pathXs(d: string): number[] {
  const xs: number[] = [];
  const re = /([MLC])([^MLC]*)/g;
  for (const [, cmd, body] of d.matchAll(re)) {
    const nums = body
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (cmd === "M" || cmd === "L") xs.push(nums[0]);
    else if (cmd === "C") xs.push(nums[0], nums[2], nums[4]);
  }
  return xs;
}

function assertMonotoneX(name: string, xs: number[], ys: number[]) {
  const d = smoothPath(xs, ys);
  const seen = pathXs(d);
  for (let i = 1; i < seen.length; i++) {
    if (seen[i] < seen[i - 1] - 1e-9) {
      fail(name, `x doubles back at coord ${i}: ${seen[i - 1]} -> ${seen[i]} in "${d}"`);
      return;
    }
  }
  ok(name);
}

// 1) The reported repro shape: a session burst then a long gap. Under
//    Catmull-Rom, c2x of the last burst segment landed left of the segment.
assertMonotoneX(
  "burst then gap",
  [10, 12, 13, 14, 500],
  [100, 60, 120, 80, 90],
);

// 2) Two bursts around a chasm, ratings swinging hard.
assertMonotoneX(
  "two bursts",
  [0, 1, 2, 3, 300, 301, 302, 600],
  [50, 150, 40, 160, 30, 170, 20, 100],
);

// 3) Duplicate x (same-millisecond finishes surviving the stable sort).
assertMonotoneX("duplicate x", [5, 5, 5, 80, 81], [10, 40, 20, 60, 55]);

// 4) Uniform spacing (the common case must stay smooth and monotone).
assertMonotoneX(
  "uniform spacing",
  [0, 10, 20, 30, 40, 50],
  [100, 90, 110, 70, 130, 120],
);

// 5) Strictly increasing ratings: monotone data must not overshoot. The
//    curve's y range must stay within the data's y range (Fritsch-Carlson's
//    other guarantee — no manufactured peaks).
{
  const xs = [0, 3, 4, 5, 100];
  const ys = [10, 20, 21, 22, 90];
  const d = smoothPath(xs, ys);
  const nums = d
    .replace(/[MLC]/g, " ")
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const yCoords = nums.filter((_, i) => i % 2 === 1);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const bad = yCoords.find((y) => y < lo - 1e-9 || y > hi + 1e-9);
  if (bad !== undefined) fail("no overshoot on monotone data", `control y ${bad} outside [${lo}, ${hi}] in "${d}"`);
  else ok("no overshoot on monotone data");
}

// 6) Degenerate inputs: empty, single point, two points.
{
  if (smoothPath([], []) !== "") fail("empty input", "expected empty string");
  else ok("empty input");
  const one = smoothPath([7], [9]);
  if (!one.startsWith("M")) fail("single point", `got "${one}"`);
  else ok("single point");
  assertMonotoneX("two points", [3, 90], [15, 80]);
}

// 7) All points at one instant (t1 === t0 collapse): straight vertical steps.
assertMonotoneX("all same instant", [50, 50, 50], [10, 30, 20]);

if (failures > 0) {
  console.error(`\n${failures} rating-chart failure(s)`);
  process.exit(1);
}
console.log("\nrating-chart: all checks passed");
