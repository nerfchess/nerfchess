// Talks to the DO's /arena/* endpoints (Tier 2 / M2). All calls fail soft: a
// slow or unreachable DO never blocks a game, and syncGames reporting
// enabled=false makes the arena stand down (stop spawning) until the DO is back
// and a human is present.
import type { ArenaFinishedRecord, ExternalGameMeta } from "./types";

export class IngestClient {
  constructor(
    private readonly doUrl: string,
    private readonly token: string,
  ) {}

  private async post(path: string, body: unknown, timeoutMs = 4000): Promise<Response | null> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      return await fetch(`${this.doUrl}${path}`, {
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
   *  spawning (DO ingest on AND a human present). Any failure => false. */
  async syncGames(games: ExternalGameMeta[]): Promise<{ enabled: boolean }> {
    const res = await this.post("/arena/games", { games });
    if (!res || !res.ok) return { enabled: false };
    try {
      const j = (await res.json()) as { enabled?: boolean };
      return { enabled: !!j.enabled };
    } catch {
      return { enabled: false };
    }
  }

  /** Report a finished game for archive + rating. One retry, then give up (a
   *  lost filler archive is acceptable). */
  async reportEnd(record: ArenaFinishedRecord): Promise<void> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await this.post("/arena/end", { record });
      if (res && res.ok) return;
    }
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ event: "arena_end_report_failed", id: record.id }));
  }
}
