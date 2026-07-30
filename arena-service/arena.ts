// Orchestrator — port of houseTick's filler path. It only handles SPAWNING;
// each game drives its own actions via its own timer (see game.ts), so there is
// no per-tick engine batch and none of the DO's single-thread caps.
import { HOUSE_ROSTER, houseFillerSpawnDelayMs, pickHouseSeek, type HousePersona } from "../src/lib/server/bots";
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
  // Tier 3: when a human was last seen directly — a /lobby fetch or a live
  // spectator socket. With no DO configured this replaces the DO's stand-down
  // signal: spawn only while presence is fresh (see tick).
  private lastPresenceAt = 0;
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

  // A human touched the arena directly (lobby fetch / spectator socket).
  notePresence(): void {
    this.lastPresenceAt = Date.now();
  }

  // Live watcher count per game, supplied by the spectator hub (Tier 3 / M3);
  // stays 0 until the hub wires itself in.
  watcherCountFn: (id: string) => number = () => 0;
  watcherCount(id: string): number {
    return this.watcherCountFn(id);
  }

  private tick(): void {
    const now = Date.now();
    // Tier 3 (no DO): presence-driven stand-down. Spawn only while a human was
    // seen directly within the TTL; live games still play out (mirror the DO's
    // rule that stand-down only stops NEW games).
    if (!this.config.doUrl) {
      this.spawning = now - this.lastPresenceAt < this.config.presenceTtlMs;
    }
    // Periodic DO sync: push the registry, learn whether to keep spawning. Live
    // games always finish; stand-down only stops NEW games (mirror the DO).
    if (this.ingest && this.config.doUrl && now - this.lastSyncAt >= this.config.syncMs) {
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
        // Ramp fast below the 40-game floor, breathe above it (shared pacing
        // with the DO's spawner, so a cold arena reaches the floor in minutes).
        this.nextFillerAt = now + houseFillerSpawnDelayMs(this.games.size, randomInt);
      }
    }
  }

  private spawn(a: HousePersona, b: HousePersona): void {
    const { pool, mode } = pickHouseSeek(randomInt);
    const aWhite = randomInt(2) === 0;
    const [white, black] = aWhite ? [a, b] : [b, a];
    const game = new ArenaGame(white, black, pool, mode, this.sink, this.config.replayVersion, (g) => this.onDone(g), this.config.fastMs, this.config.thinkMult, this.config.searchCeilingMs);
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

  game(id: string): ArenaGame | undefined {
    return this.games.get(id);
  }

  liveGames(): ArenaGameSummary[] {
    return [...this.games.values()].map((g) => g.summary());
  }
}
