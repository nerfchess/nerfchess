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
  // Tier 3 / M2: browser origins allowed to read GET /lobby (CORS) and open
  // spectator sockets (M3). Comma-separated.
  publicOrigins: string[];
  // Tier 3 / M3: with no DO configured, filler spawns only while a human was
  // seen (a /lobby fetch or a live spectator socket) within this window —
  // replaces the DO's stand-down signal.
  presenceTtlMs: number;
  // Tier 3 / M1: absolute URL of the Worker archive route
  // (https://nerfchess.com/api/arena/end). When set, finished games archive
  // there — a plain Worker request, no DO wake — and the DO is only notified
  // display-only (aborted:true) to close any spectator replicas. Empty = ends
  // keep going to the DO's /arena/end exactly as before.
  endUrl: string;
}

export function loadConfig(): ArenaConfig {
  return {
    token: process.env.ARENA_TOKEN ?? "",
    replayVersion: Number(process.env.ARENA_REPLAY_VERSION ?? "0"),
    // Up to three ongoing bot-vs-bot games, matching the DO's houseVsHouseCapMax.
    // The spaced filler timer starts a fresh game whenever one ends, so the arena
    // keeps a steady set running rather than a crowd. Override with ARENA_MAX_GAMES
    // if a load test needs more.
    maxGames: Number(process.env.ARENA_MAX_GAMES ?? "3"),
    enabled: (process.env.ARENA_ENABLED ?? "true") !== "false",
    port: Number(process.env.PORT ?? "8788"),
    verboseMoves: process.env.ARENA_VERBOSE_MOVES === "true",
    fastMs: Number(process.env.ARENA_FAST_MS ?? "0"),
    doUrl: (process.env.ARENA_DO_URL ?? "").replace(/\/$/, ""),
    ingestToken: process.env.ARENA_INGEST_TOKEN ?? "",
    syncMs: Number(process.env.ARENA_SYNC_MS ?? "4000"),
    endUrl: (process.env.ARENA_END_URL ?? "").replace(/\/$/, ""),
    publicOrigins: (process.env.ARENA_PUBLIC_ORIGINS ?? "https://nerfchess.com,https://www.nerfchess.com")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
    presenceTtlMs: Number(process.env.ARENA_PRESENCE_TTL_MS ?? "60000"),
  };
}
