"use client";

// Tier 3 client glue (docs/bot-offload-tier3-direct-arena.md): fetch the OCI
// arena's own lobby snapshot and merge it into the DO lobby, entirely
// client-side and fail-soft — the arena being down just means the lobby shows
// DO games only. Gated by NEXT_PUBLIC_ARENA_URL; empty means Tier 3 is off and
// every helper here is a no-op passthrough.

import type { Color } from "@/engine/types";
import type { MPLobby, MPLobbyGame, MPLobbyPlayer } from "./multiplayer";

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
      if (!res.ok) return lastGames;
      const body = (await res.json()) as { games?: ArenaLobbyGame[] };
      lastGames = Array.isArray(body.games) ? body.games.filter((g) => g && typeof g.id === "string") : [];
      lastAt = Date.now();
      return lastGames;
    } catch {
      // Keep the previous snapshot; an unreachable arena must never break the
      // DO lobby around it.
      return lastGames;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

function toLobbyGame(g: ArenaLobbyGame): MPLobbyGame {
  return {
    id: g.id,
    origin: "arena",
    players: {
      w: { name: g.seats.w.name, rating: Math.round(g.seats.w.rating), avatar: g.seats.w.avatar ?? null },
      b: { name: g.seats.b.name, rating: Math.round(g.seats.b.rating), avatar: g.seats.b.avatar ?? null },
    },
    rated: true,
    draft: true,
    mode: g.mode,
    timeSec: g.timeSec,
    incrementSec: g.incrementSec,
    moves: g.moves,
    watchers: g.watchers ?? 0,
  };
}

/** Merge the arena's live games into a DO lobby snapshot: games union (by id —
 *  during the migration window the DO may still list the same arena games via
 *  ARENA_LOBBY_ENABLED) and every arena seat shown as a playing player, the
 *  same treatment the DO gives its own house seats. */
export async function withArenaLobby(lobby: MPLobby): Promise<MPLobby> {
  if (!ARENA_URL) return lobby;
  const arenaGames = await fetchArenaGames();
  if (arenaGames.length === 0) return lobby;
  const knownGames = new Set(lobby.games.map((g) => g.id));
  const games = [...lobby.games, ...arenaGames.filter((g) => !knownGames.has(g.id)).map(toLobbyGame)];
  // Every arena seat reads as a playing player, the same rule the DO applies
  // to its own house seats: an idle-roster "online" entry upgrades, a missing
  // one is added, so the online panel always agrees with the games panel.
  const seated = new Map<string, ArenaLobbySeat>();
  for (const g of arenaGames) {
    for (const color of ["w", "b"] as Color[]) {
      const seat = g.seats[color];
      if (seat?.name) seated.set(seat.name, seat);
    }
  }
  const players: MPLobbyPlayer[] = lobby.players.map((p) =>
    seated.has(p.name) && p.status !== "playing" ? { ...p, status: "playing" } : p,
  );
  const listed = new Set(players.map((p) => p.name));
  for (const [name, seat] of seated) {
    if (listed.has(name)) continue;
    players.push({ name, rating: Math.round(seat.rating), status: "playing", avatar: seat.avatar ?? null });
  }
  return { ...lobby, games, players };
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
