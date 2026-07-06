// Orchestrator — port of houseTick's filler path. It only handles SPAWNING;
// each game drives its own actions via its own timer (see game.ts), so there is
// no per-tick engine batch and none of the DO's single-thread caps.
import { HOUSE_ROSTER, pickHouseSeek, type HousePersona } from "../src/lib/server/bots";
import type { ArenaConfig } from "./config";
import { ArenaGame } from "./game";
import type { IngestClient } from "./ingest";
import { randomInt } from "./pools";
import type { ArenaSink } from "./sink";
import type { ArenaGameSummary, ExternalGameMeta } from "./types";

export class Arena {
  private readonly games = new Map<string, ArenaGame>();
  private readonly busy = new Set<string>(); // persona userIds currently seated
  private nextFillerAt = 0;
  private supervisor: ReturnType<typeof setInterval> | null = null;
  private lastSyncAt = 0;
  // With the DO wired, don't spawn until it confirms (ingest on + human present).
  // Standalone (M1, no ingest) follows the local enabled flag.
  private spawning: boolean;
  // Games we've already sent a started-snapshot for this watch episode (Tier 2 /
  // M3): a spectator gets exactly one bootstrap snapshot (the DO turns it into
  // wstart) and then incremental move/draft frames. Cleared when the game leaves
  // the watch set or ends, so a re-watch re-bootstraps.
  private snapshotSent = new Set<string>();

  constructor(
    private readonly config: ArenaConfig,
    private readonly sink: ArenaSink,
    private readonly ingest: IngestClient | null = null,
  ) {
    this.spawning = !ingest;
  }

  start(): void {
    if (this.supervisor) return;
    this.supervisor = setInterval(() => this.tick(), 1000);
  }

  stop(): void {
    if (this.supervisor) clearInterval(this.supervisor);
    this.supervisor = null;
    for (const g of [...this.games.values()]) g.abort("shutdown");
  }

  get enabled(): boolean {
    return this.config.enabled;
  }

  setEnabled(v: boolean): void {
    this.config.enabled = v;
    if (!v) for (const g of [...this.games.values()]) g.abort("paused");
  }

  liveMeta(): ExternalGameMeta[] {
    return [...this.games.values()].map((g) => g.externalMeta());
  }

  private tick(): void {
    const now = Date.now();
    // Periodic DO sync: push the registry, learn whether to keep spawning. Live
    // games always finish; stand-down only stops NEW games (mirror the DO).
    if (this.ingest && now - this.lastSyncAt >= this.config.syncMs) {
      this.lastSyncAt = now;
      this.ingest
        .syncGames(this.liveMeta())
        .then((r) => {
          this.spawning = r.enabled;
          this.reconcileWatch(r.watch);
        })
        .catch(() => {
          this.spawning = false;
        });
    }
    if (!this.config.enabled || !this.spawning) return;
    // Spawn one filler game, capped and spaced (mirror worker.ts:2526).
    if (this.games.size < this.config.maxGames && now >= this.nextFillerAt) {
      const free = HOUSE_ROSTER.filter((p) => !this.busy.has(p.userId));
      if (free.length >= 2) {
        const a = free.splice(randomInt(free.length), 1)[0];
        const b = free.splice(randomInt(free.length), 1)[0];
        this.spawn(a, b);
        this.nextFillerAt = now + 4000 + randomInt(6000);
      }
    }
  }

  private spawn(a: HousePersona, b: HousePersona): void {
    const { pool, mode } = pickHouseSeek(randomInt);
    const aWhite = randomInt(2) === 0;
    const [white, black] = aWhite ? [a, b] : [b, a];
    const game = new ArenaGame(white, black, pool, mode, this.sink, this.config.replayVersion, (g) => this.onDone(g), this.config.fastMs);
    this.games.set(game.id, game);
    this.busy.add(white.userId);
    this.busy.add(black.userId);
    game.start();
  }

  // Post a one-shot bootstrap snapshot for each game a human just started
  // watching (Tier 2 / M3). A game watched before it leaves the opening nerf
  // draft is skipped until it starts (the DO can't reconstruct hidden nerfs), so
  // the spectator waits a beat rather than see an unbuildable board.
  private reconcileWatch(watch: string[]): void {
    if (!this.ingest) return;
    const set = new Set(watch);
    for (const id of [...this.snapshotSent]) if (!set.has(id)) this.snapshotSent.delete(id);
    for (const id of watch) {
      if (this.snapshotSent.has(id)) continue;
      const g = this.games.get(id);
      if (!g || !g.started()) continue;
      this.snapshotSent.add(id);
      // Snapshot first, THEN open the per-move stream — so no move frame can
      // reach the DO before the replica it needs exists.
      void this.ingest.postFrame({ kind: "snapshot", ...g.spectatorSnapshot() });
      this.ingest.beginStreaming(id);
    }
  }

  private onDone(g: ArenaGame): void {
    this.games.delete(g.id);
    this.busy.delete(g.seats.w.userId);
    this.busy.delete(g.seats.b.userId);
    this.snapshotSent.delete(g.id);
  }

  liveCount(): number {
    return this.games.size;
  }

  liveGames(): ArenaGameSummary[] {
    return [...this.games.values()].map((g) => g.summary());
  }
}
