/// <reference types="@cloudflare/workers-types" />

// Server-side access to the game-server Durable Object from Next route
// handlers. The DO holds the authoritative live-match state; a route that needs
// it (e.g. the profile "Playing Right Now" lookup) reaches the single global
// instance through here rather than scanning the edge-cached lobby snapshot.

import { getCloudflareContext } from "@opennextjs/cloudflare";

// Must match `globalServerName` in worker.ts: both name the ONE global game
// server instance, so a lookup here hits the same DO the sockets talk to.
const GLOBAL_SERVER_NAME = "nerfchess-global";

/** The single global game-server DO stub, or null when the binding is absent
 *  (e.g. a preview build without the DO configured). */
export function getGameServerStub(): DurableObjectStub | null {
  const { env } = getCloudflareContext();
  const ns = (env as { GAME_SERVER?: DurableObjectNamespace }).GAME_SERVER;
  if (!ns) return null;
  return ns.get(ns.idFromName(GLOBAL_SERVER_NAME));
}

/**
 * The started, unfinished game a user currently occupies, resolved from the
 * DO's authoritative live index. Returns null when the user is not playing, the
 * binding is unavailable, or the DO errors -- the caller then simply renders no
 * live preview (never a false one). Best-effort by design.
 */
export async function currentLiveGameForUser(
  userId: string,
): Promise<{ gameId: string; mode?: "nerf" | "buff" } | null> {
  const stub = getGameServerStub();
  if (!stub) return null;
  try {
    // Bounded: the profile page must not hang on a slow DO. A timeout aborts the
    // lookup and the caller renders no live preview, exactly like "not playing".
    const resp = await stub.fetch(
      `https://game-server/live-game?userId=${encodeURIComponent(userId)}`,
      { method: "GET", signal: AbortSignal.timeout(1500) },
    );
    if (!resp.ok) return null;
    const data = (await resp.json()) as { gameId?: string | null; mode?: "nerf" | "buff" };
    if (!data.gameId) return null;
    return { gameId: data.gameId, ...(data.mode ? { mode: data.mode } : {}) };
  } catch {
    return null;
  }
}
