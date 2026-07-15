"use client";

// Tier 3 client glue (docs/bot-offload-tier3-direct-arena.md): fetch the OCI
// arena's own lobby snapshot purely to route spectator sockets to the arena for
// its live game ids (isArenaGameId / isArenaGameLive / arenaSocketUrl), entirely
// client-side and fail-soft. It does NOT merge arena games/players into the
// lobby COUNTS — the DO already unions arena games server-side into its single
// authoritative /api/lobby snapshot (worker.ts externalLiveGames, gated
// ARENA_LOBBY_ENABLED), so every client shows the same numbers. Doing a second
// per-browser union here would double-count and diverge across tabs.
// Gated by NEXT_PUBLIC_ARENA_URL; empty means Tier 3 routing is off and every
// helper here is a no-op passthrough.

import type { Color } from "@/engine/types";
import type { MPLobby } from "./multiplayer";

export const ARENA_URL = (process.env.NEXT_PUBLIC_ARENA_URL ?? "").trim().replace(/\/$/, "");

// Shape served by the arena's GET /lobby (arena-service/server.ts): its
// ExternalGameMeta plus per-seat avatars and a live watcher count.
type ArenaLobbySeat = { userId: string; name: string; rating: number; avatar?: string | null };
type ArenaLobbyGame = {
  id: string;
  mode: "nerf" | "buff";
  timeSec: number;
  incrementSec: number;
  moves: number;
  watchers?: number;
  seats: Record<Color, ArenaLobbySeat>;
};

// Last good arena snapshot + in-flight dedupe: the homepage strip and the
// lobby page can poll concurrently, and a blip should degrade to slightly
// stale arena games rather than a flickering list.
let lastGames: ArenaLobbyGame[] = [];
let lastAt = 0;
let inflight: Promise<ArenaLobbyGame[]> | null = null;
const FRESH_MS = 4000;
// How long a last-good snapshot may stand in for a failed/blipping fetch before
// it is dropped. A brief blip keeps the games on screen; a genuine outage clears
// them so FINISHED arena games can't linger in the Watch list forever (the
// "ended games should just go away" report). Comfortably longer than one poll.
const STALE_MS = 15_000;

async function fetchArenaGames(): Promise<ArenaLobbyGame[]> {
  if (!ARENA_URL) return [];
  const now = Date.now();
  if (now - lastAt < FRESH_MS) return lastGames;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const ctl = new AbortController();
      const timer = window.setTimeout(() => ctl.abort(), 3000);
      const res = await fetch(`${ARENA_URL}/lobby`, { signal: ctl.signal });
      window.clearTimeout(timer);
      if (!res.ok) return staleOrEmpty();
      const body = (await res.json()) as { games?: ArenaLobbyGame[] };
      lastGames = Array.isArray(body.games) ? body.games.filter((g) => g && typeof g.id === "string") : [];
      lastAt = Date.now();
      return lastGames;
    } catch {
      // Keep a RECENT snapshot through a blip; drop a stale one so an unreachable
      // arena never leaves finished games frozen in the lobby.
      return staleOrEmpty();
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

// The last-good games while they're still recent; otherwise clear and return
// empty so nothing lingers past STALE_MS without a fresh confirmation.
function staleOrEmpty(): ArenaLobbyGame[] {
  if (Date.now() - lastAt > STALE_MS) {
    lastGames = [];
  }
  return lastGames;
}

/** Warm the arena-game id cache so spectator sockets still route to the arena
 *  (isArenaGameId / arenaSocketUrl), then return the DO lobby UNCHANGED.
 *
 *  Counts are single-source: the DO now unions arena games into its own
 *  liveGames and arena seats into its online players server-side (worker.ts
 *  externalLiveGames, gated ARENA_LOBBY_ENABLED), so its /api/lobby snapshot is
 *  already the one authoritative merged number. This helper used to ALSO union
 *  arena games/players on top, per browser, uncapped, from its own 4s-fresh/
 *  15s-stale fail-soft cache — so two tabs open at the same instant could show
 *  different live-game counts (one arena-fresh, one arena-empty). That second,
 *  per-client source is the desync; it is removed here. We keep fetching the
 *  arena snapshot only to keep `lastGames` warm for id-based spectator routing,
 *  and never let it touch the displayed counts. Fail-soft: a fetch error is
 *  swallowed and the DO snapshot is returned as-is. */
export async function withArenaLobby(lobby: MPLobby): Promise<MPLobby> {
  if (!ARENA_URL) return lobby;
  await fetchArenaGames().catch(() => []);
  return lobby;
}

/** Is this game id one the arena is hosting (per the latest snapshot)? Used to
 *  route spectator sockets to the arena instead of the DO (Tier 3 / M3). */
export function isArenaGameId(id: string): boolean {
  return lastGames.some((g) => g.id === id);
}

/** Like isArenaGameId, but fetches a fresh snapshot when the cache is cold —
 *  covers a direct link to a live arena game with no lobby visit before it.
 *  Fail-soft: an unreachable arena answers false. */
export async function isArenaGameLive(id: string): Promise<boolean> {
  if (!ARENA_URL) return false;
  const games = await fetchArenaGames();
  return games.some((g) => g.id === id);
}

/** The arena's spectator WebSocket URL (Tier 3 / M3). */
export function arenaSocketUrl(): string {
  if (!ARENA_URL) return "";
  return `${ARENA_URL.replace(/^http/, "ws")}/socket/v1`;
}
