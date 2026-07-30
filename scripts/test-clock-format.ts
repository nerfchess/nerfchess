// Boundary tests for the clock pill's time rendering (src/lib/clockFormat.ts).
//
//   npx tsx scripts/test-clock-format.ts
//
// The bug being locked out: the sub-10s branch used toFixed(1), which ROUNDS.
// At 9999ms that produced "10.0", so a clock counting down read
//   0:11 -> 0:10 -> 0:10.0 -> 0:09.9
// showing ten seconds twice, the second time while already under ten.

import { formatClock } from "../src/lib/clockFormat";

let failures = 0;
function eq(ms: number, want: string, why = "") {
  const got = formatClock(ms);
  if (got === want) {
    console.log(`  ok  ${String(ms).padStart(7)}ms -> ${got}${why ? "   (" + why + ")" : ""}`);
  } else {
    failures++;
    console.log(`FAIL  ${String(ms).padStart(7)}ms -> ${got}, want ${want}${why ? "   (" + why + ")" : ""}`);
  }
}

console.log("clock formatting");

// The 10s boundary: the regression lived here.
eq(10_001, "0:11", "above 10s ceils");
eq(10_000, "0:10", "exactly 10s");
eq(9_999, "0:09.9", "just under 10s must NOT read 10.0");
eq(9_990, "0:09.9");
eq(9_950, "0:09.9", "flooring, not rounding");
eq(9_900, "0:09.9");

// Tenths never round up into a value the player does not have.
eq(5_099, "0:05.0");
eq(5_000, "0:05.0");
eq(999, "0:00.9", "under a second never reads 1.0");
eq(100, "0:00.1");
eq(1, "0:00.0");
eq(0, "0:00.0", "zero");
eq(-500, "0:00.0", "negative clamps to zero");

// Minute rollover, still ceiled so a clock never reads 0:00 with time left.
eq(60_000, "1:00");
eq(59_999, "1:00");
eq(59_001, "1:00");
eq(59_000, "0:59");
eq(600_000, "10:00");

// Monotonic: as time decreases the rendered string must never read HIGHER.
// This is what actually broke — 0:10 followed by 0:10.0.
{
  const seen: string[] = [];
  for (let ms = 12_000; ms >= 0; ms -= 17) seen.push(formatClock(ms));
  let bad = "";
  for (let i = 1; i < seen.length; i++) {
    if (seen[i] === seen[i - 1]) continue;
    const a = parseSeconds(seen[i - 1]);
    const b = parseSeconds(seen[i]);
    if (b > a) {
      bad = `${seen[i - 1]} -> ${seen[i]}`;
      break;
    }
  }
  if (bad) {
    failures++;
    console.log(`FAIL  countdown went UP: ${bad}`);
  } else {
    console.log("  ok  a descending clock never renders a larger value");
  }
}

function parseSeconds(label: string): number {
  const [m, rest] = label.split(":");
  return Number(m) * 60 + Number(rest);
}

if (failures) {
  console.error(`\n${failures} clock-format assertion(s) failed`);
  process.exit(1);
}
console.log("clock formatting: OK");
