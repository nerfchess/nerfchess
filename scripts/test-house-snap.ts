// Tests the house bots' "I had that premoved" reply (houseSnapReplyMs).
//
//   ./node_modules/.bin/tsx scripts/test-house-snap.ts
//
// Real players queue premoves, and the tell is unmistakable: the recapture comes
// back before you have let go of the mouse. House bots never did this, every
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

import * as bots from "../src/lib/server/bots";
import {
  HOUSE_ROSTER,
  houseSnapReplyMs,
  houseStyle,
  snapContext,
} from "../src/lib/server/bots";
import {
  newGame,
  playMove,
  legalMoves,
  gameInCheck,
  serializeGame,
  deserializeGame,
  UNRESTRICTED_NERF,
  type NerfGame,
} from "../src/engine/game";
import { makeMove, moveToUCI, positionKey } from "../src/engine/board";
import { pickAIMove } from "../src/engine/ai";
import type { Color, Move } from "../src/engine/types";

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

// ---------------------------------------------------------------------------
// 5 and 6 (slice HB, P15): the forced branch and the snapped move itself.
//
// legalMoves is pseudo-legal in this variant (a king may walk into capture), so
// `legalCount === 1` essentially never happens: scouted over 1141 positions it
// occurred 0 times, while exactly one KING-SAFE move occurred 17 times. The
// forced branch was dead code. snapContext(game, me, { kingSafe: true }) counts
// king-safe moves, and houseSnapReplyMs treats a count of one as forced. The
// option is opt-in because the arena calls snapContext for TV filler, whose
// pacing is frozen by the owner (docs/polish-pass/slices/HB.md, hard limit 3).
//
// houseSnapMove answers the recapture a snap is for with at most a tiny search:
// the best recapture on the square the opponent just took on. On positions where
// a real search (hard at 400ms) recaptures there, it must play that same move at
// least 90% of the time, a decline (null) counting as a miss; and when it
// answers anywhere else it must still match the search (at most 10% differ).
// ---------------------------------------------------------------------------

function seeded(seed: number): (max: number) => number {
  let st = (seed * 2654435761) >>> 0 || 1;
  return (max: number) => {
    st = (Math.imul(st, 1664525) + 1013904223) >>> 0;
    return Math.floor((st / 2 ** 32) * max);
  };
}
function hangsKing(g: NerfGame, m: Move): boolean {
  if (m.captured === "k") return false;
  return gameInCheck({ ...g, board: makeMove(g.board, m) }, g.board.turn);
}
const CP: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
/** Engine-free harvest (greedy captures, king usually safe), deterministic. */
function harvest(count: number, seed: number, accept: (g: NerfGame) => boolean): NerfGame[] {
  const out: NerfGame[] = [];
  const seen = new Set<string>();
  const rng = seeded(seed);
  for (let gi = 0; out.length < count && gi < 3000; gi++) {
    let g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed * 10_000 + gi);
    for (let ply = 0; ply < 140 && !g.result; ply++) {
      if (ply >= 6 && accept(g)) {
        const key = positionKey(g.board) + "|" + (g.board.history.length ? moveToUCI(g.board.history[g.board.history.length - 1]) : "");
        if (!seen.has(key)) {
          seen.add(key);
          // playMove mutates in place: keep a detached copy of this position.
          out.push(deserializeGame(serializeGame(g))!);
          if (out.length >= count) break;
        }
      }
      const legal = legalMoves(g);
      if (!legal.length) break;
      const win = legal.find((m) => m.captured === "k");
      const safe = legal.filter((m) => !hangsKing(g, m));
      const pool = safe.length && rng(100) < 92 ? safe : legal;
      const caps = pool.filter((m) => m.captured).sort((a, b) => CP[b.captured!] - CP[a.captured!]);
      const m = win ?? (caps.length && rng(100) < 60 ? caps[rng(Math.min(2, caps.length))] : pool[rng(pool.length)]);
      g = playMove(g, m);
    }
  }
  return out;
}

type SnapCtxFn = (g: NerfGame, me: Color, opts?: { kingSafe?: boolean }) => ReturnType<typeof snapContext>;
const snapCtx = snapContext as unknown as SnapCtxFn;
const houseSnapMove = (bots as unknown as { houseSnapMove?: (g: NerfGame, c: Color) => Move | null }).houseSnapMove;

{
  const forced = harvest(20, 5, (g) => {
    const legal = legalMoves(g);
    return legal.length > 1 && legal.filter((m) => !hangsKing(g, m)).length === 1;
  });
  let fired = 0;
  const appetite = houseStyle(persona).snapAppetite;
  for (const g of forced) {
    const ctx = snapCtx(g, g.board.turn, { kingSafe: true });
    if (houseSnapReplyMs(persona, fixedRandom(Math.min(0.99, appetite + 0.2)), ctx) != null) fired++;
  }
  console.log(`  forced branch: fired on ${fired} of ${forced.length} positions with exactly one king-safe move`);
  check(forced.length >= 15, `harvested enough one-king-safe-move positions (${forced.length})`);
  check(fired === forced.length, `the forced branch fires on every one-king-safe-move position (${fired}/${forced.length})`);
  // And the default call (the arena's filler path) is unchanged: no king-safe count.
  const plain = forced.length ? snapContext(forced[0], forced[0].board.turn) : null;
  check(!plain || !("kingSafeCount" in plain), "snapContext without the option carries no king-safe count (filler pacing frozen)");
}

{
  // Candidates: the opponent just captured and this side can recapture on that
  // square without hanging its king. A "recapture position" is one where the
  // reference search (hard at 400ms) does recapture there: that is the premove
  // case a snap exists for. On the others a snap must decline or, if it
  // answers, still match the search; an answer that differs is a wrong snap.
  const candidates = harvest(120, 11, (g) => {
    const last = g.board.history[g.board.history.length - 1];
    if (!last || !last.captured || last.color === g.board.turn) return false;
    if (gameInCheck(g, g.board.turn)) return false;
    return legalMoves(g).some((m) => m.captured && m.to === last.to && !hangsKing(g, m));
  });
  let recaptureN = 0;
  let agree = 0;
  let declinedRecapture = 0;
  let answered = 0;
  let wrong = 0;
  let unsafe = 0;
  for (const g of candidates) {
    if (recaptureN >= 50) break;
    const last = g.board.history[g.board.history.length - 1];
    const ref = pickAIMove(g, "hard", 400);
    const snap = houseSnapMove ? houseSnapMove(g, g.board.turn) : null;
    const same = !!snap && !!ref && moveToUCI(ref) === moveToUCI(snap);
    if (snap) {
      answered++;
      if (!same) wrong++;
      if (hangsKing(g, snap)) unsafe++;
    }
    if (ref && ref.captured && ref.to === last.to) {
      recaptureN++;
      if (same) agree++;
      else if (!snap) declinedRecapture++;
    }
  }
  const share = agree / Math.max(1, recaptureN);
  console.log(
    houseSnapMove
      ? `  houseSnapMove: on ${recaptureN} recapture positions it plays the hard@400 move ${agree} times (${(share * 100).toFixed(0)}%), declines ${declinedRecapture}; across all candidates it answered ${answered}, differing from hard@400 ${wrong} times; king-unsafe ${unsafe}`
      : "  houseSnapMove: not exported on this tree",
  );
  check(!!houseSnapMove, "houseSnapMove is exported");
  check(recaptureN >= 50, `harvested enough recapture positions (${recaptureN})`);
  check(share >= 0.9, `houseSnapMove plays the hard@400 move on at least 90% of recapture positions (${(share * 100).toFixed(0)}%)`);
  check(wrong <= Math.max(1, Math.floor(answered * 0.1)), `a snap that answers differs from hard@400 at most 10% of the time (${wrong}/${answered})`);
  check(unsafe === 0, "houseSnapMove never leaves the king capturable");
}

if (failures) {
  console.error(`\n${failures} snap-reply assertion(s) failed`);
  process.exit(1);
}
console.log("house snap replies: OK");
