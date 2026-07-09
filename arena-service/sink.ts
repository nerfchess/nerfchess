import type { IngestClient } from "./ingest";
import type { ArenaFinishedRecord, ArenaGameSummary, Color, StoredDraftAction } from "./types";

/** The one seam between M1 and M2. M1 ships LogSink; M2 ships an ArenaWsSink
 *  that forwards to the DO's /arena WebSocket. Nothing else in the arena changes
 *  between milestones. */
export interface ArenaSink {
  gameOpen(summary: ArenaGameSummary): void;
  move(gameId: string, ply: number, uci: string, clocks: Record<Color, number>): void;
  /** `card` is the fired buff's face on a `use`, streamed to spectators so the
   *  effect renders on their replica (public once fired). Absent for pick/bank. */
  draft(gameId: string, action: StoredDraftAction, card?: { id: string; tier: number }): void;
  /** replayOk = did the finished record round-trip through replayToPosition
   *  back to the in-RAM board? M2 can ignore it; M1 gates on it. */
  gameEnd(record: ArenaFinishedRecord, replayOk: boolean): void;
  /** The game was aborted (shutdown/pause/error) — no result, nothing to
   *  archive or rate. Still MUST reach the DO: a watched game's spectator
   *  replica only ends on an end frame, so a silent abort left TV watchers on
   *  a board frozen forever. The record here is best-effort (an abort can land
   *  mid-nerf-draft, before the game even built). */
  gameAbort(record: ArenaFinishedRecord): void;
}

function log(event: string, data: unknown): void {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ t: new Date().toISOString(), event, ...(data as object) }));
}

/** M1 sink: structured logs + in-memory counters and a ring of recent results
 *  for the /stats and /finished endpoints. */
export class LogSink implements ArenaSink {
  spawnedTotal = 0;
  finishedTotal = 0;
  replayFailures = 0;
  byResult: Record<"w" | "b" | "draw", number> = { w: 0, b: 0, draw: 0 };
  byMode: Record<"nerf" | "buff", number> = { nerf: 0, buff: 0 };
  plySum = 0;
  recent: (ArenaFinishedRecord & { replayOk: boolean })[] = [];

  constructor(private verboseMoves = false) {}

  gameOpen(s: ArenaGameSummary): void {
    this.spawnedTotal++;
    log("game_open", { id: s.id, mode: s.mode, pool: s.pool, w: s.seats.w.name, b: s.seats.b.name });
  }

  move(gameId: string, ply: number, uci: string, clocks: Record<Color, number>): void {
    if (this.verboseMoves) log("move", { id: gameId, ply, uci, w: clocks.w, b: clocks.b });
  }

  draft(gameId: string, action: StoredDraftAction): void {
    if (this.verboseMoves) log("draft", { id: gameId, ...action });
  }

  gameEnd(rec: ArenaFinishedRecord, replayOk: boolean): void {
    this.finishedTotal++;
    this.byMode[rec.mode]++;
    this.plySum += rec.moves.length;
    const w = rec.result.winner;
    this.byResult[w === "w" ? "w" : w === "b" ? "b" : "draw"]++;
    if (!replayOk) {
      this.replayFailures++;
      log("REPLAY_MISMATCH", { id: rec.id, mode: rec.mode, plies: rec.moves.length, reason: rec.result.reason });
    }
    this.recent.unshift({ ...rec, replayOk });
    if (this.recent.length > 50) this.recent.pop();
    log("game_end", {
      id: rec.id, mode: rec.mode, winner: rec.result.winner, reason: rec.result.reason,
      plies: rec.moves.length, drafts: rec.draftActions.length, replayOk,
    });
  }

  gameAbort(rec: ArenaFinishedRecord): void {
    // Not a finish: no result/mode/ply counters (an abort is roster churn, not
    // an outcome).
    log("game_abort", { id: rec.id, mode: rec.mode, reason: rec.result.reason, plies: rec.moves.length });
  }

  stats(): object {
    return {
      spawnedTotal: this.spawnedTotal,
      finishedTotal: this.finishedTotal,
      replayFailures: this.replayFailures,
      byResult: this.byResult,
      byMode: this.byMode,
      avgPlies: this.finishedTotal ? Math.round(this.plySum / this.finishedTotal) : 0,
    };
  }
}

/** M2 sink: forwards finished games to the DO for archive + rating. Only a
 *  round-trip-valid record is reported (a failed self-check is a recording bug —
 *  never archive a game that won't replay). */
export class IngestSink implements ArenaSink {
  constructor(private readonly ingest: IngestClient) {}
  gameOpen(): void {}
  // Stream per-move/draft frames ONLY for games a human is watching (Tier 2 /
  // M3). The DO tells us which via each /arena/games response; unwatched games
  // (the vast majority) stay silent, so the DO pays nothing per move for them.
  move(gameId: string, ply: number, uci: string, clocks: Record<Color, number>): void {
    if (this.ingest.isStreaming(gameId)) void this.ingest.postFrame({ kind: "move", id: gameId, ply, u: uci, clocks });
  }
  draft(gameId: string, action: StoredDraftAction, card?: { id: string; tier: number }): void {
    if (this.ingest.isStreaming(gameId)) void this.ingest.postFrame({ kind: "draft", id: gameId, action, ...(card ? { card } : {}) });
  }
  gameEnd(record: ArenaFinishedRecord, replayOk: boolean): void {
    if (replayOk) void this.ingest.reportEnd(record);
  }
  gameAbort(record: ArenaFinishedRecord): void {
    // Only a streaming game can have a spectator replica at the DO; every
    // other abort has nothing to clean up there.
    if (this.ingest.isStreaming(record.id)) void this.ingest.reportAbort(record);
  }
}

/** Fan a single event stream out to several sinks (e.g. LogSink + IngestSink). */
export class CompositeSink implements ArenaSink {
  constructor(private readonly sinks: ArenaSink[]) {}
  gameOpen(s: ArenaGameSummary): void {
    for (const k of this.sinks) k.gameOpen(s);
  }
  move(gameId: string, ply: number, uci: string, clocks: Record<Color, number>): void {
    for (const k of this.sinks) k.move(gameId, ply, uci, clocks);
  }
  draft(gameId: string, action: StoredDraftAction, card?: { id: string; tier: number }): void {
    for (const k of this.sinks) k.draft(gameId, action, card);
  }
  gameEnd(record: ArenaFinishedRecord, replayOk: boolean): void {
    for (const k of this.sinks) k.gameEnd(record, replayOk);
  }
  gameAbort(record: ArenaFinishedRecord): void {
    for (const k of this.sinks) k.gameAbort(record);
  }
}
