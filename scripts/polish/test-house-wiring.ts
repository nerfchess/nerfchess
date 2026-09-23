// Regression checks for the house-bot wiring in worker.ts (docs/polish-pass/
// slices/HB.md REQUESTS R1-R14, HB3.md REQUESTS) and the daily email cron
// (docs/polish-pass/slices/L.md REQUESTS 1).
//
//   ./node_modules/.bin/tsx scripts/polish/test-house-wiring.ts
//
// The Durable Object does not run under next dev, so the DO paths are asserted
// on the worker.ts source (POLISH_WORKER_PATH overrides the file, for a before
// run), and every pure piece they call is exercised directly: the handover
// pause (clockPause.ts), the remote-engine budget rule, the arena overrides
// sanitizer, and the frozen filler pacing.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PAUSE_MAX_MS,
  chargePauseBudget,
  releaseExpiredPause,
  type PausableMatch,
} from "../../src/lib/server/clockPause";
import * as clockPause from "../../src/lib/server/clockPause";
import {
  HOUSE_REMOTE_CEILING_MS,
  HOUSE_SEARCH_CEILING_MS,
  HOUSE_FILLER_THINK_MULTIPLIER,
  bakedResolvedProfile,
  houseMoveBudgetMs,
  houseThinkMs,
} from "../../src/lib/server/bots";
import * as arenaRecord from "../../src/lib/server/arenaRecord";

let failures = 0;
function ok(cond: boolean, label: string) {
  console.log((cond ? "  ok  " : "FAIL  ") + label);
  if (!cond) failures++;
}

const root = join(__dirname, "..", "..");
const workerPath = process.env.POLISH_WORKER_PATH ?? join(root, "worker.ts");
const src = readFileSync(workerPath, "utf8");
const wrangler = readFileSync(join(root, "wrangler.jsonc"), "utf8");
const endRoute = readFileSync(join(root, "src/app/api/arena/end/route.ts"), "utf8");

/** The body of a class method or function, from its signature to the next
 * member at the same indent. Good enough for asserting on one method. */
function body(signature: string): string {
  const at = src.indexOf(signature);
  if (at < 0) return "";
  const rest = src.slice(at + signature.length);
  const next = rest.search(/\n  (private |async |static |\/\/ [A-Z#-])/);
  return signature + (next < 0 ? rest : rest.slice(0, next));
}

// ---------------------------------------------------------------------------
console.log("L request 1: the daily email cron");
{
  const exp = src.slice(src.indexOf("export default {"));
  ok(/async scheduled\(_controller, env, ctx\)/.test(exp), "default export has scheduled()");
  ok(/ctx\.waitUntil\(\s*runDailyJob\(env as unknown as DailyJobEnv\)/.test(exp), "scheduled() runs runDailyJob under waitUntil");
  ok(/\.catch\(\(err\) => \{\s*console\.error\("daily job failed", err\)/.test(exp), "a failed run is logged, never thrown");
  ok(/import \{ runDailyJob, type DailyJobEnv \} from "\.\/src\/lib\/server\/dailyJob"/.test(src), "runDailyJob is imported");
  ok(/"crons":\s*\["0 13 \* \* \*"\]/.test(wrangler), 'wrangler.jsonc has the "0 13 * * *" cron');
}

// ---------------------------------------------------------------------------
console.log("R4: an away human never drains the bot's clock");
{
  const tick = body("  private async houseTick() {");
  ok(
    !/match\.disconnectedAt\[humanSeat\] &&\s*!this\.connectedSession\(match\.id, humanSeat\)\s*\)\s*\{\s*continue;/.test(tick),
    "houseTick no longer holds the bot while its human is away",
  );
  const commit = body("  private async commitMove(");
  ok(/if \(match\.bots\?\.\[mover\] && !nextGame\.result\) await this\.openAwayHandoverPause\(match\)/.test(commit), "a bot move hands an away human the bounded pause");
  const cand = body("  private candidateAlarm(");
  ok(!/guardHeld/.test(cand), "the alarm no longer drops a guard-held bot action");

  const open = (clockPause as Record<string, unknown>).openHandoverPause as
    | ((m: PausableMatch, seat: "w" | "b", now: number, connected: boolean) => boolean)
    | undefined;
  ok(typeof open === "function", "clockPause exports openHandoverPause");
  if (open) {
    // 1+0, human white, bot black. The human detaches on the bot's turn at
    // t=10s with 50s left; the bot has 55s. Old rule: the bot is held and its
    // clock runs out at t=65s, a time win for the absent human.
    const think = 800;
    const m: PausableMatch = {
      startedAt: 1,
      result: null,
      runningSince: 10_000,
      disconnectedAt: { w: 10_000 },
      bots: { b: "hp_x" },
      pauseUntil: null,
      pausedTotalMs: {},
      clocks: { w: 50_000, b: 55_000 },
      setup: { timeSec: 60 },
    };
    // The bot moves after its think: bank its clock, restart on the human.
    const at = 10_000 + think;
    m.clocks!.b -= at - (m.runningSince as number);
    m.runningSince = at;
    const opened = open(m, "w", at, false);
    ok(opened && m.runningSince === null && m.pauseUntil === at + PAUSE_MAX_MS, "the move opens a 45s pause for the away human");
    ok(55_000 - m.clocks!.b === think, `the bot paid only its ${think}ms think`);
    // 30s away: reconnect inside the pause, billed as a detach on their turn.
    const back = at + 30_000;
    chargePauseBudget(m, "w", back);
    m.runningSince = back;
    ok(m.clocks!.w === 20_000 && m.clocks!.b === 55_000 - think, "30s away costs the human 30s and the bot nothing");
    ok(!m.result, "nothing is decided on time");
    // 60s away: the pause releases at 45s and the human's clock runs; the bot
    // is never charged for the absence.
    const m2: PausableMatch = { ...m, runningSince: at, pauseUntil: null, pausedSince: null, pausedTotalMs: {}, clocks: { w: 50_000, b: 55_000 - think }, disconnectedAt: { w: 10_000 } };
    open(m2, "w", at, false);
    releaseExpiredPause(m2, at + PAUSE_MAX_MS);
    ok(m2.clocks!.b === 55_000 - think && m2.clocks!.w === 5_000, "60s away: the bot keeps its clock, the human is billed as today");
    // Present, or a bot seat, or an existing pause: no pause.
    const m3: PausableMatch = { ...m2, runningSince: at, pauseUntil: null, pausedSince: null };
    ok(!open(m3, "w", at, true), "no pause for a present human");
    ok(!open(m3, "b", at, false), "no pause for a bot seat");
  }
}

// ---------------------------------------------------------------------------
console.log("R1, R7: remote only when it pays, with a graded timeout and a breaker");
{
  const play = body("  private async playHouseAction(");
  ok(!/HOUSE_ENGINE_TIMEOUT_MS \+ 2000/.test(src), "the flat 5s clock rule is gone");
  const elig = body("  private houseRemoteEligible(");
  ok(/houseMoveBudgetMs\(profile\.budgetMs, remaining, HOUSE_REMOTE_CEILING_MS, match\.setup\.incrementSec\) >\s*HOUSE_SEARCH_CEILING_MS/.test(elig), "remote iff the graded budget beats the local ceiling");
  ok(/!this\.isBotOnlyMatch\(match\)/.test(elig), "filler never goes remote");
  ok(/pickHouseMove\(game, persona\.skill, randomInt, remaining, undefined, profile, persona, \{\s*incrementSec: match\.setup\.incrementSec,/.test(play), "the local search gets the increment");
  const remote = body("  private async remoteHouseMove(");
  ok(/houseEngineBreaker\.allow\(startedAt\)/.test(remote) && /houseEngineBreaker\.record\(outcome/.test(remote), "the breaker gates and records every remote call");
  ok(/const timeoutMs = houseEngineTimeoutMs\(budgetMs\)/.test(remote) && /setTimeout\(\(\) => ctl\.abort\(\), timeoutMs\)/.test(remote), "the timeout follows the budget");
  // The rule itself, on the baked 2000 tier (the strongest, largest budget).
  const top = bakedResolvedProfile(2000 as never);
  const remoteAt = (clock: number, inc: number) =>
    houseMoveBudgetMs(top.budgetMs, clock, HOUSE_REMOTE_CEILING_MS, inc) > HOUSE_SEARCH_CEILING_MS;
  ok(!remoteAt(20_000, 0), "1+0 with 20s left: local (no round trip on a bullet move)");
  ok(remoteAt(280_000, 0), "5+0 with 280s left: remote");
  const healthz = src.slice(src.indexOf('    if (url.pathname === "/healthz") {'), src.indexOf('    if (url.pathname === "/lobby" && request.method === "GET")'));
  ok(healthz.length > 0 && !/houseEngineBreaker/.test(healthz), "breaker state is not on the public /healthz");
  ok(/houseEngine: houseEngineBreaker\.snapshot\(now\)/.test(body('    if (url.pathname === "/mod/online"')), "breaker state is on the internal /mod/online view");
}

// ---------------------------------------------------------------------------
console.log("R2, R11: pacing gives way to search; filler pacing frozen; snap moves");
{
  const arm = body("  private armBotActionCore(");
  ok(/houseThinkMs\(randomInt, clocks\[turn\] \+ grace, match\.setup\.timeSec, houseFillerThinkMultiplier, tempo\);/.test(arm), "filler keeps its exact call (multiplier, tempo, no options)");
  ok(/expectedSearchMs: houseExpectedSearchMs\(profile\.budgetMs, remaining, remote, incrementSec\)/.test(arm), "human games pass expectedSearchMs");
  ok(/ownMoveIndex: this\.movesByColor\(match, turn\)/.test(arm) && /kingSafeMoves: ctx\.kingSafeCount/.test(arm) && /capturesAvailable:/.test(arm), "human games pass the opening, forced and sharpness inputs");
  ok(/snapContext\(game, turn, \{ kingSafe: true \}\)/.test(arm) && /match\.botSnap = snap != null/.test(arm), "a snap is recorded server-side");
  ok(/move = houseSnapMove\(game, color\)/.test(body("  private async playHouseAction(")), "a snapped move plays houseSnapMove locally");
  // Filler: the same RNG draws give the same delays as the frozen function.
  const seq = (seed: number) => {
    let x = seed >>> 0;
    return (max: number) => {
      x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
      return x % max;
    };
  };
  let same = true;
  for (let i = 0; i < 2000 && same; i++) {
    const clock = 5_000 + ((i * 7919) % 295_000);
    const tempo = 0.75 + (i % 7) * 0.1;
    const a = houseThinkMs(seq(i), clock, 180, HOUSE_FILLER_THINK_MULTIPLIER, tempo);
    const b = houseThinkMs(seq(i), clock, 180, HOUSE_FILLER_THINK_MULTIPLIER, tempo, { filler: true });
    same = a === b;
  }
  ok(same, "filler delays identical to the frozen pacing for 2000 seeds");
}

// ---------------------------------------------------------------------------
console.log("R3, R10: persona, increment, deadline and overrides to the engine; scoreCp back");
{
  const remote = body("  private async remoteHouseMove(");
  ok(/persona: persona\.userId,/.test(remote) && /incrementSec,/.test(remote) && /deadlineMs: Math\.max\(250, timeoutMs - 700\)/.test(remote), "the body carries persona, incrementSec and deadlineMs");
  ok(/scoreCp\?: number \| null/.test(remote), "the reply's scoreCp is read");
  const ser = body("function serializeMatchForEngine(");
  ok(/\.\.\.\(match\.cardOverrides \? \{ cardOverrides: match\.cardOverrides \} : \{\}\)/.test(ser), "serializeMatchForEngine carries cardOverrides");
}

// ---------------------------------------------------------------------------
console.log("R6: resign and draws through the human paths");
{
  ok(/private async resignSeat\(match: StoredMatch, game: NerfGame, color: Color\)/.test(src), "resignSeat is factored out");
  ok(/await this\.resignSeat\(match, game, session\.color\)/.test(body("  private async resignGame(")), "a human resign uses resignSeat");
  ok(/await this\.acceptDrawSeat\(match\)/.test(body("  private async acceptDraw(")), "a human accept uses acceptDrawSeat");
  ok(/kind: "drawAnswer", color: botSeat, at: Date\.now\(\) \+ 1500 \+ randomInt\(3501\)/.test(body("  private async offerDraw(")), "a draw offer to a bot is answered in 1.5-5s");
  const due = body("  private async playHouseDue(");
  ok(/houseDrawDecision\(/.test(due) && /this\.broadcast\(match, "drawDeclined", \{ color: due\.color \}\)/.test(due), "a decline is today's drawDeclined frame");
  ok(/this\.broadcast\(match, "drawOffer", \{ color: due\.color \}\)/.test(due), "a bot's offer is the human drawOffer frame");
  const after = body("  private houseAfterMoveDecision(");
  ok(/houseResignDecision\(/.test(after) && /if \(this\.isBotOnlyMatch\(match\)\) return;/.test(after), "resign decisions for human games only");
}

// ---------------------------------------------------------------------------
console.log("R5: rematch against a bot");
{
  const req = body("  private async rematchRequest(");
  ok(/if \(botId\) this\.scheduleHouseRematchAnswer\(match, opponentColor, botId\)/.test(req), "a bot seat answers instead of opponent_gone");
  const ans = body("  private async answerHouseRematch(");
  ok(/await this\.houseRematchAvailable\(persona\)/.test(ans) && /await this\.startRematch\(match\)/.test(ans), "accept checks availability then starts the rematch");
  ok(/this\.broadcast\(match, "rematchCancelled", \{ color: human \}\)/.test(ans) && /"opponentGone"/.test(ans), "a decline uses the frames of a person leaving");
  ok(/if \(match\.bots\?\.w\) bots\.b = match\.bots\.w;/.test(body("  private async buildRematch(")), "the rematch carries the colour-swapped bots map");
}

// ---------------------------------------------------------------------------
console.log("R9: persona cards and drafts");
{
  const play = body("  private async playHouseAction(");
  ok(/houseDraftChoice\(game, color, draftPersona, randomInt\)/.test(play), "drafts use houseDraftChoice");
  ok(/houseChooseActivation\(game, color, persona, randomInt\)/.test(play), "activations use houseChooseActivation");
  ok(!/aiChooseBuffActivation|aiDraftChoice\(/.test(src), "the old coin plus engine calls are gone");
}

// ---------------------------------------------------------------------------
console.log("R12, R14: one persona per game; arena overrides");
{
  ok(/return Response\.json\(\{ enabled, lobby, watch, seated \}\)/.test(src), "/arena/games returns the DO-seated personas");
  ok(/!arenaSeated\.has\(persona\.userId\)/.test(body("  private async houseTick() {")), "arena-seated personas are not free in houseTick");
  ok(/for \(const id of this\.arenaSeatedIds\(Date\.now\(\)\)\) busy\.add\(id\)/.test(body("  private async playHouseBot(")), "the /play picker skips arena-seated personas");
  ok(/cardOverrides \? \{ cardOverrides \} : \{\}/.test(body("  private buildExternalMatch(")), "the arena replica installs the snapshot's overrides");
  ok(/sanitizeArenaCardOverrides\(rec\.cardOverrides\)/.test(body("  private endExternalForWatchers(")), "the end rebuild installs the record's overrides");
  ok(/cardOverrides: sanitizeArenaCardOverrides\(rec\.cardOverrides\)/.test(endRoute), "the arena end route archives the overrides");
  const sanitize = (arenaRecord as Record<string, unknown>).sanitizeArenaCardOverrides as ((r: unknown) => unknown) | undefined;
  ok(typeof sanitize === "function", "arenaRecord exports sanitizeArenaCardOverrides");
  if (sanitize) {
    ok(JSON.stringify(sanitize({ off: ["chess_diff", 3, ""], tier: { a: 2, b: 9, c: 1.5 }, x: 1 })) === '{"off":["chess_diff"],"tier":{"a":2}}', "keeps only valid off ids and 1-8 tiers");
    ok(sanitize(null) === null && sanitize([]) === null && sanitize({ off: [] }) === null, "garbage reads as no overrides");
  }
}

// ---------------------------------------------------------------------------
console.log("No bot tell reaches a client");
{
  const lines = src.split("\n");
  const leaks = lines.filter(
    (l) => /houseEval|houseDue|botSnap|houseEngineBreaker/.test(l) && /(broadcast|send|sendWatchers)\(|Response\.json\(\{ ok:/.test(l),
  );
  ok(leaks.length === 0, "no server-only house field on a frame line");
  const start = body("  private sendStart(");
  ok(start.length > 0 && !/houseEval|houseDue|botSnap/.test(start), "sendStart carries none of them");
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall house wiring checks passed");
