export interface ArenaConfig {
  token: string;
  replayVersion: number;
  maxGames: number;
  enabled: boolean;
  port: number;
  verboseMoves: boolean;
  // Test/load knob: when > 0, replace human-like pacing with a tiny random
  // delay (ms) so games run to completion fast. 0 = real pacing (production).
  fastMs: number;
  // Arena ingestion (Tier 2 / M2). When doUrl+ingestToken are set, the arena
  // registers its games with the DO and reports finished games for archive +
  // rating, and lets the DO gate spawning (stand-down). Empty doUrl = M1 mode
  // (isolated, LogSink only).
  doUrl: string;
  ingestToken: string;
  syncMs: number;
}

export function loadConfig(): ArenaConfig {
  return {
    token: process.env.ARENA_TOKEN ?? "",
    replayVersion: Number(process.env.ARENA_REPLAY_VERSION ?? "0"),
    maxGames: Number(process.env.ARENA_MAX_GAMES ?? "18"),
    enabled: (process.env.ARENA_ENABLED ?? "true") !== "false",
    port: Number(process.env.PORT ?? "8788"),
    verboseMoves: process.env.ARENA_VERBOSE_MOVES === "true",
    fastMs: Number(process.env.ARENA_FAST_MS ?? "0"),
    doUrl: (process.env.ARENA_DO_URL ?? "").replace(/\/$/, ""),
    ingestToken: process.env.ARENA_INGEST_TOKEN ?? "",
    syncMs: Number(process.env.ARENA_SYNC_MS ?? "4000"),
  };
}
