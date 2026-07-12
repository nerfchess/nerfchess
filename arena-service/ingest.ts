// Talks to the DO's /arena/* endpoints (Tier 2 / M2). All calls fail soft: a
// slow or unreachable DO never blocks a game, and syncGames reporting
// enabled=false makes the arena stand down (stop spawning) until the DO is back
// and a human is present.
import type { ArenaFinishedRecord, ArenaFrame, ExternalGameMeta } from "./types";

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

  // Called once the snapshot for a newly-watched game has been posted, opening
  // the per-move stream for it.
  beginStreaming(id: string): void {
    this.streaming.add(id);
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
  async syncGames(games: ExternalGameMeta[]): Promise<{ enabled: boolean; watch: string[] }> {
    const res = await this.post("/arena/games", { games });
    if (!res || !res.ok) {
      this.setWatched([]);
      return { enabled: false, watch: [] };
    }
    try {
      const j = (await res.json()) as { enabled?: boolean; watch?: string[] };
      const watch = Array.isArray(j.watch) ? j.watch.filter((x): x is string => typeof x === "string") : [];
      this.setWatched(watch);
      return { enabled: !!j.enabled, watch };
    } catch {
      this.setWatched([]);
      return { enabled: false, watch: [] };
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
  async postFrame(frame: ArenaFrame): Promise<void> {
    await this.post("/arena/frame", { frame }, 3000);
  }

  /** Report a finished game for archive + rating. One retry, then give up (a
   *  lost filler archive is acceptable).
   *
   *  Tier 3 / M1: with `endUrl` set, the archive write goes to the Worker
   *  route (no DO wake); the DO then gets a display-only `aborted:true` notice
   *  so a watched game's spectator replica still ends promptly (the DO shows
   *  the record's real result either way and skips its own archive — and even
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
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await this.post("/arena/end", { record });
      if (res && res.ok) return;
    }
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ event: "arena_end_report_failed", id: record.id }));
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
