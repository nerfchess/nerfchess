// Tests the bounded disconnect-pause rules in src/lib/server/clockPause.ts.
//
//   npx tsx scripts/test-clock-pause.ts
//
// The bug being locked out: a player left a house game for five minutes, came
// back, and had lost only ~10 seconds. The pause that protects a disconnected
// player from flagging mid-move had no end condition, and none of the machinery
// that would normally notice (currentClocks, the flag alarm) runs while a clock
// is paused. So the cost of any absence was just the socket's close-detection
// window, and a backgrounded phone tab froze the clock indefinitely.

import {
  PAUSE_BUDGET_MS,
  PAUSE_MAX_MS,
  chargePauseBudget,
  pauseGrantMs,
  releaseExpiredPause,
  type PausableMatch,
} from "../src/lib/server/clockPause";

let failures = 0;
function check(ok: boolean, what: string) {
  if (!ok) {
    failures++;
    console.error("  FAIL " + what);
  }
}

/** A live house game: white is the human, black is the bot. */
function houseGame(over: Partial<PausableMatch> = {}): PausableMatch {
  return {
    startedAt: 1_000,
    result: null,
    runningSince: 1_000,
    disconnectedAt: {},
    bots: { b: "hp_someone" },
    dtDeadline: null,
    pauseUntil: null,
    pausedTotalMs: {},
    ...over,
  };
}

/** Pause the game as detachSession does, at `at`. Mirrors the worker exactly,
 * including the `pausedSince` stamp billing measures from. */
function pause(match: PausableMatch, at: number): number {
  const grant = pauseGrantMs(match, "w");
  match.disconnectedAt.w = at;
  if (grant > 0) {
    match.runningSince = null;
    match.pauseUntil = at + grant;
    match.pausedSince = at;
  }
  return grant;
}

/** Reconnect as the worker really does it: attachSession first (which DELETES
 * disconnectedAt for the returning seat), then chargePauseBudget. Billing must
 * survive that order — it did not, which is the exploit case 8 locks out. */
function reconnect(match: PausableMatch, color: "w" | "b", at: number): void {
  delete match.disconnectedAt[color]; // attachSession
  delete (match as { opponentGoneNotified?: Record<string, boolean> }).opponentGoneNotified?.[color];
  chargePauseBudget(match, color, at);
  match.runningSince = at;
}

console.log("clock pause rules");

// 1. A short absence is still free: reconnect inside the grant costs nothing.
{
  const m = houseGame();
  pause(m, 10_000);
  chargePauseBudget(m, "w", 15_000); // back after 5s
  m.runningSince = 15_000;
  check(m.pausedTotalMs?.w === 5_000, "a 5s absence bills 5s of budget");
  check(m.pauseUntil === null, "reconnecting clears the pause deadline");
}

// 2. THE REPORTED BUG: five minutes away. The pause must expire on its own and
//    the clock must be running again long before the player returns.
{
  const m = houseGame();
  pause(m, 10_000);
  const atDeadline = 10_000 + PAUSE_MAX_MS;
  check(!releaseExpiredPause(m, atDeadline - 1), "the pause holds right up to its deadline");
  check(m.runningSince === null, "and the clock is still paused there");
  check(releaseExpiredPause(m, atDeadline), "the pause releases at its deadline");
  check(m.runningSince === atDeadline, "and the clock restarts at that moment");
  // Five minutes later they are back, and the clock has been running for
  // 5min - 45s of that. The old code charged nothing at all.
  const back = 10_000 + 5 * 60_000;
  const chargedWhileAway = back - (m.runningSince as number);
  check(
    chargedWhileAway === 5 * 60_000 - PAUSE_MAX_MS,
    `a 5min absence now charges ${5 * 60_000 - PAUSE_MAX_MS}ms, not ~0`,
  );
  check(m.pausedTotalMs?.w === PAUSE_MAX_MS, "exactly the grant is billed, never more");
}

// 3. A refresh loop cannot chain grants past the per-game budget.
{
  const m = houseGame();
  let t = 10_000;
  const grants: number[] = [];
  for (let i = 0; i < 6; i++) {
    const grant = pause(m, t);
    grants.push(grant);
    // Away for the whole grant, then straight back, then away again.
    t += grant;
    releaseExpiredPause(m, t);
    m.disconnectedAt = {};
    t += 1;
  }
  const total = grants.reduce((a, b) => a + b, 0);
  check(total === PAUSE_BUDGET_MS, `chained pauses total the budget (${total})`);
  check(grants[grants.length - 1] === 0, "once the budget is spent a pause is refused outright");
  check(m.pausedTotalMs!.w! <= PAUSE_BUDGET_MS, "billed total never exceeds the budget");
}

// 4. A pause refused for lack of budget leaves the clock running, so the player
//    can flag while away exactly like a human-vs-human opponent.
{
  const m = houseGame({ pausedTotalMs: { w: PAUSE_BUDGET_MS } });
  const grant = pause(m, 10_000);
  check(grant === 0, "no grant left");
  check(m.runningSince === 1_000, "the clock was never paused");
  check(m.pauseUntil === null, "and no deadline was set");
}

// 5. A draft's lock-in window outranks the pause deadline: it holds the clock
//    for its own reasons and owns the resume.
{
  const m = houseGame({ dtDeadline: 200_000 });
  pause(m, 10_000);
  check(
    !releaseExpiredPause(m, 10_000 + PAUSE_MAX_MS),
    "an open draft window keeps the clock paused past the pause deadline",
  );
  check(m.pauseUntil !== null, "and the deadline survives for the next check");
  check(releaseExpiredPause(m, 200_001), "once the draft window ends the pause releases");
}

// 6. Self-healing: a stale deadline on a game whose clock is already running,
//    or which has finished, is simply dropped and bills nothing.
{
  const m = houseGame({ pauseUntil: 5_000, runningSince: 4_000 });
  m.disconnectedAt.w = 1_000;
  check(!releaseExpiredPause(m, 9_000), "a stale deadline releases nothing");
  check(m.pauseUntil === null, "but is cleared");
  check(!m.pausedTotalMs?.w, "and bills no budget");

  const done = houseGame({ pauseUntil: 5_000, runningSince: null, result: { winner: "w" } });
  check(!releaseExpiredPause(done, 9_000), "a finished game releases nothing");
  check(done.pauseUntil === null, "but its deadline is cleared");
  check(done.runningSince === null, "and its clock stays stopped");
}

// 7. The bot seat never triggers a pause of its own (it has no socket), and the
//    away-seat lookup must never pick it.
{
  const m = houseGame();
  m.disconnectedAt.b = 10_000; // as if the bot seat were marked away
  m.disconnectedAt.w = 12_000;
  m.runningSince = null;
  m.pauseUntil = 12_000 + PAUSE_MAX_MS;
  releaseExpiredPause(m, m.pauseUntil);
  check(m.pausedTotalMs?.w === PAUSE_MAX_MS, "the human seat is billed");
  check(!m.pausedTotalMs?.b, "the bot seat is never billed");
}

// 8. THE RECONNECT EXPLOIT. Cases 1-3 all bill through paths that leave
//    `disconnectedAt` in place, so they passed even while the real reconnect
//    path billed nothing: attachSession deletes disconnectedAt for the
//    returning seat BEFORE chargePauseBudget reads it, so `paused` computed as
//    0, pausedTotalMs never grew, and PAUSE_BUDGET_MS was unreachable — a
//    player could disconnect/reconnect on their own turn forever and be handed
//    a fresh PAUSE_MAX_MS every time.
{
  const m = houseGame();
  pause(m, 10_000);
  reconnect(m, "w", 10_000 + 30_000); // away 30s, back through the real path
  check(m.pausedTotalMs?.w === 30_000, `a 30s absence bills 30s through the reconnect path (got ${m.pausedTotalMs?.w})`);
  check(m.pauseUntil === null, "the reconnect clears the pause deadline");
  check(m.pausedSince == null, "and clears the pause start stamp");
}
{
  // The exploit end to end: repeated disconnect/reconnect cycles must exhaust
  // the per-game budget rather than renew it.
  const m = houseGame();
  let t = 10_000;
  const grants: number[] = [];
  for (let i = 0; i < 8; i++) {
    const grant = pause(m, t);
    grants.push(grant);
    if (grant === 0) break;
    t += grant; // stay away for the whole grant
    reconnect(m, "w", t);
    t += 1;
  }
  check(
    grants[grants.length - 1] === 0,
    "chained disconnect/reconnect cycles exhaust the budget instead of renewing it",
  );
  check(
    (m.pausedTotalMs?.w ?? 0) >= PAUSE_BUDGET_MS,
    `the full budget is billed across cycles (got ${m.pausedTotalMs?.w})`,
  );
  check(
    grants.reduce((a, b) => a + b, 0) === PAUSE_BUDGET_MS,
    "total granted pause never exceeds PAUSE_BUDGET_MS",
  );
}

// 9. A path that resumes the clock for an unrelated reason (a draft action
//    settling) must bill the pause rather than strand the deadline: a stranded
//    pauseUntil is later swept as stale, which bills nothing and silently ends
//    the protection early.
{
  const m = houseGame();
  pause(m, 10_000);
  // settleDraftAction-style resume, 20s in, with the player still away.
  const at = 30_000;
  chargePauseBudget(m, "w", at);
  m.runningSince = at;
  check(m.pausedTotalMs?.w === 20_000, `the interrupted pause bills its 20s (got ${m.pausedTotalMs?.w})`);
  check(m.pauseUntil === null, "and leaves no stranded deadline behind");
}

if (failures) {
  console.error(`\n${failures} clock-pause assertion(s) failed`);
  process.exit(1);
}
console.log("clock pause rules: OK");
