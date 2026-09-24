// Slice J (F205): which endings hold the final position before the result
// panel, and for how long. Run: ./node_modules/.bin/tsx scripts/polish/j/test-settle.ts
import { settleMsFor } from "../../../src/components/GameOver";

let failed = 0;
const check = (name: string, got: number, want: number) => {
  if (got !== want) {
    failed++;
    console.error(`FAIL ${name}: got ${got}, want ${want}`);
  }
};
const r = (winner: "w" | "b" | "draw" | null, reason: string) => ({ winner, reason });

// On-board endings settle for 600ms at normal tempo, 360ms at fast.
check("king capture", settleMsFor(r("w", "king captured"), 1), 600);
check("flag", settleMsFor(r("b", "white ran out of time"), 1), 600);
check("rule loss", settleMsFor(r("w", "Glass King: your glass king shattered in the open"), 1), 600);
check("stalemate draw", settleMsFor(r("draw", "stalemate"), 1), 600);
check("fast", settleMsFor(r("w", "king captured"), 0.6), 360);
// Motion off: never.
check("off", settleMsFor(r("w", "king captured"), 0), 0);
// Button presses and interruptions answer at once.
check("resign", settleMsFor(r("w", "resignation"), 1), 0);
check("agreement", settleMsFor(r("draw", "draw by agreement"), 1), 0);
check("abort", settleMsFor(r(null, "aborted"), 1), 0);
check("abandon", settleMsFor(r("b", "abandonment"), 1), 0);
check("interrupted", settleMsFor(r("draw", "game interrupted"), 1), 0);
check("server update", settleMsFor(r("draw", "server update interrupted this game"), 1), 0);
check("maintenance", settleMsFor(r("draw", "House players are paused for maintenance"), 1), 0);

if (failed) process.exit(1);
console.log("[test-settle] OK: 13 cases");
