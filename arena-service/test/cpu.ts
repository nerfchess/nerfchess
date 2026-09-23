// Arena CPU check (slice HB3, goal 8): a local arena with no DO and a null
// sink, filler capped at --games, for --minutes. Reports event-loop lag
// (monitorEventLoopDelay p50/p95/p99), CPU seconds per wall second and moves
// per second. Bundled and run by test/cpu.test.mjs; the before evidence ran
// the same file against the unmodified arena modules.
import { monitorEventLoopDelay } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import { Arena } from "../arena";
import { loadConfig } from "../config";
import type { ArenaSink } from "../sink";

const arg = (name: string, def: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
};
const GAMES = Number(arg("--games", "60"));
const MINUTES = Number(arg("--minutes", "5"));
const WARMUP_S = Number(arg("--warmup", "60"));
const JSON_OUT = arg("--json", "");

class NullSink implements ArenaSink {
  moves = 0;
  drafts = 0;
  finished = 0;
  gameOpen(): void {}
  move(): void {
    this.moves++;
  }
  draft(): void {
    this.drafts++;
  }
  gameEnd(): void {
    this.finished++;
  }
  gameAbort(): void {}
}

const config = { ...loadConfig(), maxGames: GAMES, doUrl: "", endUrl: "", enabled: true };
const sink = new NullSink();
const arena = new Arena(config, sink, null);
arena.notePresence();
const presence = setInterval(() => arena.notePresence(), 5000);
arena.start();

const h = monitorEventLoopDelay({ resolution: 10 });
let measuring = false;
let cpu0 = process.cpuUsage();
let t0 = Date.now();
let moves0 = 0;
let drafts0 = 0;
const liveSamples: number[] = [];
const sampler = setInterval(() => {
  if (measuring) liveSamples.push(arena.liveCount());
}, 5000);

setTimeout(() => {
  measuring = true;
  h.enable();
  cpu0 = process.cpuUsage();
  t0 = Date.now();
  moves0 = sink.moves;
  drafts0 = sink.drafts;
}, WARMUP_S * 1000);

setTimeout(() => {
  h.disable();
  const wallS = (Date.now() - t0) / 1000;
  const cpu = process.cpuUsage(cpu0);
  const report = {
    games: GAMES,
    minutes: MINUTES,
    warmupS: WARMUP_S,
    meanLive: liveSamples.length ? +(liveSamples.reduce((a, b) => a + b, 0) / liveSamples.length).toFixed(1) : 0,
    lagP50Ms: +(h.percentile(50) / 1e6).toFixed(1),
    lagP95Ms: +(h.percentile(95) / 1e6).toFixed(1),
    lagP99Ms: +(h.percentile(99) / 1e6).toFixed(1),
    lagMaxMs: +(h.max / 1e6).toFixed(1),
    cpuPerWallS: +((cpu.user + cpu.system) / 1e6 / wallS).toFixed(3),
    movesPerS: +((sink.moves - moves0) / wallS).toFixed(2),
    draftActionsPerS: +((sink.drafts - drafts0) / wallS).toFixed(2),
    finished: sink.finished,
  };
  console.log(JSON.stringify(report, null, 2));
  if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(report, null, 2) + "\n");
  clearInterval(presence);
  clearInterval(sampler);
  arena.stop();
  process.exit(0);
}, (WARMUP_S + MINUTES * 60) * 1000);
