// Regression checks for slice H's realtime rule fixes (F080, F086, F088, F083,
// F078, F052, F053).
//
//   ./node_modules/.bin/tsx scripts/polish/test-realtime-rules.ts
//
// countsForRating is exercised directly. The rest live inside the GameServer
// Durable Object, which next dev does not run, so they are asserted on the
// worker.ts source (POLISH_WORKER_PATH overrides the file, for a before run).

import { readFileSync } from "node:fs";
import { join } from "node:path";

let failures = 0;
function ok(cond: boolean, label: string) {
  console.log((cond ? "  ok  " : "FAIL  ") + label);
  if (!cond) failures++;
}

async function main() {
  const games = (await import("../../src/lib/server/games")) as Record<string, unknown>;
  const countsForRating = games.countsForRating as
    | ((g: { rated: boolean; whiteUserId: string | null; blackUserId: string | null; winner: "w" | "b" | "draw" | null }) => boolean)
    | undefined;
  ok(typeof countsForRating === "function", "games.ts exports countsForRating");
  if (countsForRating) {
    ok(countsForRating({ rated: true, whiteUserId: "u1", blackUserId: "u2", winner: "w" }), "two accounts, rated, decided: rated");
    ok(!countsForRating({ rated: true, whiteUserId: "u1", blackUserId: "u1", winner: "w" }), "the same account on both seats is never rated (F080)");
    ok(!countsForRating({ rated: true, whiteUserId: "u1", blackUserId: null, winner: "b" }), "an anonymous seat is not rated");
    ok(!countsForRating({ rated: false, whiteUserId: "u1", blackUserId: "u2", winner: "w" }), "a casual game is not rated");
  }

  const worker = readFileSync(process.env.POLISH_WORKER_PATH ?? join(__dirname, "..", "..", "worker.ts"), "utf8");
  const fn = (name: string) => {
    const start = worker.indexOf(`private async ${name}(`);
    if (start < 0) return "";
    const next = worker.indexOf("\n  private ", start + 10);
    return worker.slice(start, next < 0 ? undefined : next);
  };

  const offer = fn("offerTakeback");
  const accept = fn("acceptTakeback");
  ok(/match\.takebackToPly = match\.moves\.length - this\.takebackPlies/.test(offer), "a takeback offer pins the ply it rewinds to (F086)");
  ok(/match\.takebackToPly/.test(accept) && /match\.moves\.length - target/.test(accept), "accepting rewinds to the pinned ply, not a recomputed one (F086)");

  const play = fn("playClientMove");
  ok(/finishOnFlag\(match, receivedAt\)/.test(play), "the move's flag check uses the arrival time (F088)");
  ok(/commitMove\([^)]*receivedAt\)/.test(play), "the move's clock bank uses the same arrival time (F088)");

  const schat = fn("spectatorChatMessage");
  ok(/seatedInLiveGame\(match, session\)/.test(schat), "a seated player cannot post spectator chat in their live game (F083)");
  ok(/skipSeated && this\.seatedInLiveGame/.test(worker), "spectator chat fan-out skips seated players (F083)");
  ok(/spectatorChat: this\.seatedInLiveGame\(/.test(worker), "the watch start frame hides spectator chat from seated players (F083)");

  const chat = fn("chatMessage");
  ok(/cleanText\(/.test(chat) && !/raw\.slice\(0, 200\)/.test(chat), "player chat goes through cleanText, not a UTF-16 slice (F052, F053)");
  ok(/cleanText\(/.test(schat) && !/raw\.slice\(0, 200\)/.test(schat), "spectator chat goes through cleanText (F052, F053)");

  ok(!/timeSec > 7200/.test(worker), "no clock bound literal is left in worker.ts (F078)");
  ok((worker.match(/clockWithin\(timeSec, incrementSec, (CUSTOM_GAME_CLOCK|TOURNAMENT_CLOCK)\)/g) ?? []).length === 3, "all three clock checks use src/lib/clockBounds.ts (F078)");

  if (failures) {
    console.log(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\nall realtime rule checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
