import { HOUSE_FILLER_THINK_MULTIPLIER, HOUSE_VS_HOUSE_CAP } from "../src/lib/server/bots";

export interface ArenaConfig {
  token: string;
  replayVersion: number;
  maxGames: number;
  // Filler pacing decimation (the DO's affordability lever, ported): every
  // think delay is multiplied by this, so 40-55 slow filler games cost the
  // single-threaded search loop roughly what 15-18 human-paced ones did.
  thinkMult: number;
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
  // Per-move search ceiling for FILLER games, in ms. See ARENA_SEARCH_CEILING_MS
  // in loadConfig for why this exists and why it is safe to cap.
  searchCeilingMs: number;
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
    // The owner target is 40-55 concurrent bot-vs-bot games around the clock
    // (80+ personas on boards). The default IS the shared cap so a plain
    // deploy meets the target; ARENA_MAX_GAMES still overrides for load tests
    // or smaller boxes. Affordable because thinkMult decimates per-game pacing,
    // exactly like the DO's filler multiplier.
    maxGames: Number(process.env.ARENA_MAX_GAMES ?? String(HOUSE_VS_HOUSE_CAP)),
    // The arena runs every search on ONE Node event loop, so total CPU is
    // games/meanDelay x meanSearch. At the 2026-07 numbers (120 games,
    // thinkMult 8 giving a ~23s mean delay, so ~5 searches/second) an uncapped
    // search would want ~1.2 CPU-seconds per wall second at the roster's mean
    // budget, and far more in the elite-vs-elite pairings the filler matcher
    // makes: the loop would fall behind its own 1s tick.
    //
    // Capping is safe because BOT-VS-BOT FILLER IS NEVER RATED OR ARCHIVED
    // (owner rule; see the ArenaEndRecord comment in worker.ts). Nothing here
    // feeds a rating, a profile, or a game history, so the search budget is
    // purely how good the games on TV look. Human-facing bot moves are
    // untouched: those go through engine-service with its own 900ms ceiling.
    // 300ms keeps ~0.7 CPU-seconds per wall second at 120 games.
    searchCeilingMs: Math.max(20, Number(process.env.ARENA_SEARCH_CEILING_MS ?? "300")),
    thinkMult: Math.max(1, Number(process.env.ARENA_THINK_MULT ?? String(HOUSE_FILLER_THINK_MULTIPLIER))),
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
