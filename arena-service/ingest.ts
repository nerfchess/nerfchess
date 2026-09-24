// Talks to the DO's /arena/* endpoints (Tier 2 / M2). All calls fail soft: a
// slow or unreachable DO never blocks a game, and syncGames reporting
// enabled=false makes the arena stand down (stop spawning) until the DO is back
// and a human is present.
import type { ArenaFinishedRecord, ArenaFrame, ExternalGameMeta } from "./types";

/** The /arena/games reply, defensively: `watch` is the games a human is
 * spectating, `seated` the persona ids the DO has seated in its own games
 * (slice HB, P19; an older DO omits it). Anything malformed reads as empty. */
export function parseSyncReply(j: { enabled?: unknown; watch?: unknown; seated?: unknown } | null): {
  enabled: boolean;
  watch: string[];
  seated: string[];
} {
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  return { enabled: !!j?.enabled, watch: strings(j?.watch), seated: strings(j?.seated) };
}

export class IngestClient {
  // Game ids the DO currently has a spectator on (Tier 2 / M3). Refreshed from
  // every /arena/games response.
  private watched = new Set<string>();
  // Watched games we've already sent a bootstrap snapshot for. The sink streams
  // move/draft frames only for THESE, so a move can never reach the DO before
  // the snapshot that builds its replica (the DO would otherwise drop it).
  private streaming = new Set<string>();

  constructor(
    private readonly doUrl: string,
    private readonly token: string,
    // Tier 3 / M1: Worker archive route. When set, reportEnd archives there
    // (no DO wake) and the DO gets a display-only notice instead.
    private readonly endUrl = "",
  ) {}

  isWatched(id: string): boolean {
    return this.watched.has(id);
  }

  isStreaming(id: string): boolean {
    return this.streaming.has(id);
  }

  // Per-game delivery chain (slice HB, P18). Frames for one game are posted
  // strictly one after another, so the snapshot that builds the DO's replica
  // always lands before the first move frame for it. Posting them as
  // independent fetches let a move overtake its snapshot (the DO drops a frame
  // for a replica it does not have yet), and the TV watcher missed the start:
  // test/m3-spectate.mjs failed "snapshot precedes first move" in 8 of 10 runs.
  private chains = new Map<string, Promise<void>>();

  private enqueue(id: string, send: () => Promise<void>): Promise<void> {
    const prev = this.chains.get(id) ?? Promise.resolve();
    const next = prev.then(send, send);
    this.chains.set(id, next);
    void next.finally(() => {
      if (this.chains.get(id) === next) this.chains.delete(id);
    });
    return next;
  }

  /** Open the per-move stream for a newly watched game: queue its bootstrap
   * snapshot first and start streaming at once, so the move and draft frames
   * made while the snapshot is in flight queue up behind it instead of being
   * lost. If the snapshot does not land, the stream closes again, the frames
   * queued behind it are dropped, and `onFail` lets the caller re-snapshot on
   * the next sync. */
  beginStreaming(snapshot: Extract<ArenaFrame, { kind: "snapshot" }>, onFail?: () => void): Promise<void> {
    const id = snapshot.id;
    this.streaming.add(id);
    return this.enqueue(id, async () => {
      const res = await this.post("/arena/frame", { frame: snapshot }, 3000);
      if (!res || !res.ok) {
        this.streaming.delete(id);
        onFail?.();
      }
    });
  }

  private async post(path: string, body: unknown, timeoutMs = 4000): Promise<Response | null> {
    // `path` is DO-relative ("/arena/...") or an absolute URL (the Worker
    // archive route). A relative path with no DO configured is a no-op.
    const target = path.startsWith("https://") || path.startsWith("http://") ? path : this.doUrl ? `${this.doUrl}${path}` : "";
    if (!target) return null;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      return await fetch(target, {
        method: "POST",
        signal: ctl.signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${this.token}` },
        body: JSON.stringify(body),
      });
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Push the current live-games registry; returns whether the arena should be
   *  spawning (DO ingest on AND a human present) plus the set of games a human
   *  is spectating (Tier 2 / M3). Any failure => stand down, watch nothing. */
  async syncGames(games: ExternalGameMeta[]): Promise<{ enabled: boolean; watch: string[]; seated: string[] }> {
    const res = await this.post("/arena/games", { games });
    if (!res || !res.ok) {
      this.setWatched([]);
      return { enabled: false, watch: [], seated: [] };
    }
    try {
      const j = (await res.json()) as { enabled?: boolean; watch?: unknown; seated?: unknown };
      const reply = parseSyncReply(j);
      this.setWatched(reply.watch);
      return reply;
    } catch {
      this.setWatched([]);
      return { enabled: false, watch: [], seated: [] };
    }
  }

  private setWatched(watch: string[]): void {
    this.watched = new Set(watch);
    // A game no longer watched stops streaming and must re-snapshot on re-watch.
    for (const id of [...this.streaming]) if (!this.watched.has(id)) this.streaming.delete(id);
  }

  /** Push one spectator frame for a watched game (Tier 2 / M3). Fail-soft and
   *  fire-and-forget: a dropped frame just means one spectator misses one move,
   *  self-healing on the next snapshot. No retry (latency matters more here). */
  postFrame(frame: Exclude<ArenaFrame, { kind: "snapshot" }>): Promise<void> {
    return this.enqueue(frame.id, async () => {
      // Checked at send time: a stream closed by a failed snapshot (or an
      // unwatch) drops what was queued behind it.
      if (!this.streaming.has(frame.id)) return;
      await this.post("/arena/frame", { frame }, 3000);
    });
  }

  /** Report a finished game for archive + rating. One retry, then give up (a
   *  lost filler archive is acceptable).
   *
   *  Tier 3 / M1: with `endUrl` set, the archive write goes to the Worker
   *  route (no DO wake); the DO then gets a display-only `aborted:true` notice
   *  so a watched game's spectator replica still ends promptly (the DO shows
   *  the record's real result either way and skips its own archive, and even
   *  a double archive is safe, recordFinishedGame dedupes by game id). If the
   *  Worker route stays down, fall back to the DO path so nothing is lost. */
  async reportEnd(record: ArenaFinishedRecord): Promise<void> {
    if (this.endUrl) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await this.post(this.endUrl, { record });
        if (res && res.ok) {
          if (this.isStreaming(record.id)) await this.post("/arena/end", { record, aborted: true });
          return;
        }
      }
      // eslint-disable-next-line no-console
      console.error(JSON.stringify({ event: "arena_end_route_failed", id: record.id, fallback: !!this.doUrl }));
    }
    let status: number | "network" = "network";
    let bodyText = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await this.post("/arena/end", { record });
      if (res && res.ok) return;
      status = res ? res.status : "network";
      bodyText = res ? await res.text().catch(() => "") : "";
    }
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ event: "arena_end_report_failed", id: record.id, status, body: bodyText.slice(0, 300) }));
  }

  /** Report an aborted game so the DO ends its spectator replica for watchers.
   *  `aborted: true` tells the DO to skip archive + rating entirely (there is
   *  no outcome to record). Same retry posture as reportEnd; a lost abort is
   *  covered by the DO's own replica watchdog. */
  async reportAbort(record: ArenaFinishedRecord): Promise<void> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await this.post("/arena/end", { record, aborted: true });
      if (res && res.ok) return;
    }
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ event: "arena_abort_report_failed", id: record.id }));
  }
}
