// Tests the house bots' "I had that premoved" reply (houseSnapReplyMs).
//
//   npx tsx scripts/test-house-snap.ts
//
// Real players queue premoves, and the tell is unmistakable: the recapture comes
// back before you have let go of the mouse. House bots never did this — every
// move took at least a second, which is its own giveaway, worst of all on a
// trade where a human answers instantly and the bot sat "thinking" about its only
// sensible move. The rules under test:
//
//   - only a recapture or a forced move can snap, never an ordinary move
//   - a persona snaps SOMETIMES, not always (an always-premoving bot is as
//     robotic as one that never does)
//   - appetite is stable per persona, so a given bot is consistently snappy
//   - a forced move snaps far more often than a discretionary recapture
//   - the delay is a plausible human premove, not zero

import {
  HOUSE_ROSTER,
  houseSnapReplyMs,
  houseStyle,
  snapContext,
} from "../src/lib/server/bots";
import { newGame, playMove, legalMoves, UNRESTRICTED_NERF } from "../src/engine/game";
import { moveToUCI } from "../src/engine/board";

let failures = 0;
function check(ok: boolean, what: string) {
  if (!ok) {
    failures++;
    console.error("  FAIL " + what);
  }
}

/** A deterministic counter "rng" so the probability gate can be probed exactly:
 * returns each value in turn, scaled into the caller's range. */
function fixedRandom(fraction: number) {
  return (max: number) => Math.min(max - 1, Math.floor(fraction * max));
}

const persona = HOUSE_ROSTER[0];
console.log("house snap replies");

// 1. An ordinary position never snaps: nothing was captured and there are many
//    legal moves, so there is something to think about.
{
  const game = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1);
  const ctx = snapContext(game, "w");
  check(ctx.capturedOn === null, "opening position reports no capture");
  check(ctx.legalCount > 1, "opening position has many legal moves");
  for (const f of [0, 0.25, 0.5, 0.75, 0.99]) {
    check(
      houseSnapReplyMs(persona, fixedRandom(f), ctx) === null,
      `an ordinary move never snaps (roll ${f})`,
    );
  }
}

// 2. A real trade: play 1.e4 d5 2.exd5, then Black can recapture on d5.
{
  const game = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1);
  const play = (uci: string) => {
    const m = legalMoves(game).find((x) => moveToUCI(x) === uci);
    if (!m) throw new Error(`illegal in test: ${uci}`);
    playMove(game, m);
  };
  play("e2e4");
  play("d7d5");
  play("e4d5");
  const ctx = snapContext(game, "b");
  check(ctx.capturedOn === 35, `white's capture is reported on d5 (got ${ctx.capturedOn})`);
  check(ctx.myCaptureTargets.includes(35), "black can recapture on d5");
  check(ctx.legalCount > 1, "black is not forced");

  // The gate is the persona's appetite: a roll below it snaps, above it does not.
  const appetite = houseStyle(persona).snapAppetite;
  check(appetite >= 0.15 && appetite <= 0.5, `appetite in range (${appetite})`);
  const snapped = houseSnapReplyMs(persona, fixedRandom(appetite * 0.5), ctx);
  check(snapped != null, "a roll under the appetite snaps the recapture");
  check(
    snapped != null && snapped >= 120 && snapped <= 350,
    `the snap delay is a human premove, not zero (${snapped}ms)`,
  );
  check(
    houseSnapReplyMs(persona, fixedRandom(Math.min(0.999, appetite + 0.4)), ctx) === null,
    "a roll over the appetite paces normally",
  );

  // Across the roster it must be a minority behaviour, not the default.
  let snaps = 0;
  const sample = HOUSE_ROSTER.slice(0, 200);
  for (const p of sample) {
    // One fair-ish draw per persona at the midpoint of the appetite band.
    if (houseSnapReplyMs(p, fixedRandom(0.3), ctx) != null) snaps++;
  }
  const share = snaps / sample.length;
  check(share > 0.05, `some personas snap at a 0.30 roll (${(share * 100).toFixed(0)}%)`);
  check(share < 0.95, `not every persona snaps at a 0.30 roll (${(share * 100).toFixed(0)}%)`);
}

// 3. Appetite is stable per persona across calls and derived only from the name.
{
  for (const p of HOUSE_ROSTER.slice(0, 50)) {
    check(
      houseStyle(p).snapAppetite === houseStyle(p).snapAppetite,
      `appetite unstable for ${p.name}`,
    );
  }
  const distinct = new Set(HOUSE_ROSTER.slice(0, 200).map((p) => houseStyle(p).snapAppetite));
  check(distinct.size > 10, `appetites vary across the roster (${distinct.size} distinct)`);
}

// 4. A forced move snaps much more often than a discretionary recapture: there
//    is literally nothing else to play.
{
  const ctx = { capturedOn: null, myCaptureTargets: [], legalCount: 1 };
  const appetite = houseStyle(persona).snapAppetite;
  check(
    houseSnapReplyMs(persona, fixedRandom(Math.min(0.99, appetite + 0.2)), ctx) != null,
    "a forced move snaps on a roll a discretionary recapture would refuse",
  );
  // Even so, it is not certain: the chance is capped below 1.
  check(
    houseSnapReplyMs(persona, fixedRandom(0.99), ctx) === null,
    "even a forced move does not always snap",
  );
}

if (failures) {
  console.error(`\n${failures} snap-reply assertion(s) failed`);
  process.exit(1);
}
console.log("house snap replies: OK");
