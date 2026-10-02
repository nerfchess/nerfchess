// Load test: N concurrent simulated games on ONE GameServer instance (the
// production topology: every live game shares the single "nerfchess-global"
// Durable Object). Random legal moves, interleaved round-robin across games.
//   cd . && ./node_modules/.bin/tsx <scratch>/load-test.ts [classic] [draft] [plies]
/* eslint-disable @typescript-eslint/no-explicit-any */
import { FakeStorage, FakeWS, makeCtx, loadWorker, connect, msg } from "./fakeRuntime";
import { legalMoves } from "../../../../../src/engine/game";
import { moveToUCI } from "../../../../../src/engine/board";

const mod = loadWorker();
const nClassic = Number(process.argv[2] ?? 100);
const nDraft = Number(process.argv[3] ?? 30);
const plies = Number(process.argv[4] ?? 60);

type G = { id: string; a: FakeWS; b: FakeWS; draft: boolean; done: boolean; errors: number };

function pct(arr: number[], p: number) {
  const s = [...arr].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

async function main() {
  const storage = new FakeStorage();
  const gs = new mod.GameServer(makeCtx(storage), {});
  // The create limiter is per address; anonymous fake sockets have no addr, so
  // it never bites here.
  const games: G[] = [];
  const t0 = performance.now();
  for (let i = 0; i < nClassic + nDraft; i++) {
    const draft = i >= nClassic;
    const a = connect(gs, {}, `A${i}`);
    await msg(gs, a, "create", draft ? { timeSec: 600, incrementSec: 5, draft: true, mode: "buff" } : { timeSec: 600, incrementSec: 5 });
    const id = a.last("created").d.id;
    const b = connect(gs, {}, `B${i}`);
    await msg(gs, b, "join", { id });
    games.push({ id, a, b, draft, done: false, errors: 0 });
  }
  const setupMs = performance.now() - t0;
  const moveTimes: number[] = [];
  const draftMoveTimes: number[] = [];
  const pickTimes: number[] = [];
  let moves = 0;
  let picks = 0;
  const errorCodes = new Map<string, number>();
  const tLoop = performance.now();
  for (let round = 0; round < plies * 3; round++) {
    let active = 0;
    for (const g of games) {
      if (g.done) continue;
      const match = await (gs as any).loadMatch(g.id);
      if (!match || match.result || match.moves.length >= plies) {
        g.done = true;
        continue;
      }
      active++;
      const game = await (gs as any).gameForPlay(match);
      if (!game) {
        g.done = true;
        continue;
      }
      // Draft: resolve any pending offer first (pick card 0).
      if (g.draft && game.buffs) {
        const holder = (["w", "b"] as const).find((c) => game.buffs.players[c].offer);
        if (holder) {
          const ws = holder === "w" ? g.a : g.b;
          (gs as any).frameBudgets.delete(ws);
          const t = performance.now();
          await msg(gs, ws, "dtPick", { index: 0 });
          pickTimes.push(performance.now() - t);
          picks++;
          continue;
        }
      }
      const legal = legalMoves(game);
      if (!legal.length) {
        g.done = true;
        continue;
      }
      const mv = legal[Math.floor(Math.random() * legal.length)];
      const ws = game.board.turn === "w" ? g.a : g.b;
      ws.clear();
      (gs as any).frameBudgets.delete(ws);
      const t = performance.now();
      await msg(gs, ws, "move", { u: moveToUCI(mv), ply: match.moves.length });
      const dt = performance.now() - t;
      const errs = ws.take("error");
      if (errs.length) {
        g.errors++;
        for (const e of errs) errorCodes.set(e.d.code, (errorCodes.get(e.d.code) ?? 0) + 1);
      } else {
        (g.draft ? draftMoveTimes : moveTimes).push(dt);
        moves++;
      }
    }
    if (!active) break;
  }
  const loopMs = performance.now() - tLoop;
  // Maintenance pass with everything live.
  const live = (await (gs as any).loadLiveMatches()).length;
  const alarmRuns: number[] = [];
  for (let i = 0; i < 3; i++) {
    const tAlarm = performance.now();
    await gs.alarm();
    alarmRuns.push(Math.round(performance.now() - tAlarm));
  }
  const alarmMs = alarmRuns;
  const tLobby = performance.now();
  const z = connect(gs, {}, "lobby");
  await msg(gs, z, "lobby");
  const lobbyMs = performance.now() - tLobby;
  const finished = await Promise.all(games.map(async (g) => (await (gs as any).loadMatch(g.id))?.result));
  const out = {
    games: games.length,
    classic: nClassic,
    draft: nDraft,
    pliesTarget: plies,
    setupMs: Math.round(setupMs),
    movesAccepted: moves,
    draftPicks: picks,
    moveErrors: Object.fromEntries(errorCodes),
    classicMoveMs: moveTimes.length ? { p50: +pct(moveTimes, 50).toFixed(2), p95: +pct(moveTimes, 95).toFixed(2), max: +Math.max(...moveTimes).toFixed(2) } : null,
    draftMoveMs: draftMoveTimes.length ? { p50: +pct(draftMoveTimes, 50).toFixed(2), p95: +pct(draftMoveTimes, 95).toFixed(2), max: +Math.max(...draftMoveTimes).toFixed(2) } : null,
    pickMs: pickTimes.length ? { p50: +pct(pickTimes, 50).toFixed(2), p95: +pct(pickTimes, 95).toFixed(2), max: +Math.max(...pickTimes).toFixed(2) } : null,
    loopMs: Math.round(loopMs),
    serialMovesPerSec: Math.round((moves + picks) / (loopMs / 1000)),
    liveAtAlarm: live,
    alarmMs: alarmMs.join("/"),
    lobbyMs: Math.round(lobbyMs),
    endedWithResult: finished.filter(Boolean).length,
    storageKeys: storage.map.size,
    storageBytes: storage.sizeBytes(),
    avgMatchBytes: Math.round(storage.sizeBytes() / Math.max(1, games.length)),
    storageOps: storage.ops,
  };
  console.log(JSON.stringify(out, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
