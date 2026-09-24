// Slice J (F212): the low-time and urgent clock cues. A tick that crosses both
// lines at once must sound the urgent cue, not swallow it.
// Run: ./node_modules/.bin/tsx scripts/polish/j/test-clock-warn.ts
import { clockWarnCue } from "../../../src/components/ClockPill";

let failed = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    failed++;
    console.error(`FAIL ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
};
const EMERG = 10_000; // low line 10s, urgent line 5s

// Smooth countdown: low at 10s, urgent at 5s, once each.
{
  const f = { low: false, urgent: false };
  const cues = [12_000, 9_900, 9_000, 4_900, 4_000, 100, 0].map((ms) => clockWarnCue(f, ms, EMERG));
  eq("smooth", cues, [null, "low", null, "urgent", null, null, null]);
}
// One tick jumps from 12s to 4s (both lines): the urgent cue sounds.
{
  const f = { low: false, urgent: false };
  eq("jump", [12_000, 4_000, 3_000].map((ms) => clockWarnCue(f, ms, EMERG)), [null, "urgent", null]);
}
// Increment climbs back above both lines: both re-arm.
{
  const f = { low: false, urgent: false };
  const cues = [9_000, 4_000, 12_000, 9_000, 4_500].map((ms) => clockWarnCue(f, ms, EMERG));
  eq("rearm", cues, ["low", "urgent", null, "low", "urgent"]);
}
// Flag frame alone never plays the urgent tick at zero.
{
  const f = { low: true, urgent: false };
  eq("zero", clockWarnCue(f, 0, EMERG), null);
}

if (failed) process.exit(1);
console.log("[test-clock-warn] OK: 4 scenarios");
