"use client";

// Small polling hook for lobby snapshots (online players + live games).
// Used by the homepage "live now" strip; the lobby page runs its own loop so
// it can surface connection errors.

import { useEffect, useState } from "react";
import { withArenaLobby } from "./arenaLobby";
import { MPLobby } from "./multiplayer";

// One lobby snapshot over the edge-cached HTTP route. This replaces the old
// per-viewer WebSocket `lobby` poll: a crowd of browsers now shares one cached
// copy per colo, so the DO sees ~1 request per cache window instead of one
// socket poll each, and idle viewers hold no socket at all. Arena (OCI
// bot-vs-bot) games merge in client-side, fail-soft — see arenaLobby.ts
// (Tier 3). Throws on a non-OK response so callers keep their last snapshot.
export async function fetchLobbySnapshot(): Promise<MPLobby> {
  const res = await fetch("/api/lobby", { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`lobby ${res.status}`);
  const raw = (await res.json()) as MPLobby;
  return withArenaLobby(raw);
}

// Last good snapshot, kept at module scope so a remount (e.g. a client-side
// navigation back to the home page) can paint the live strip from cache on the
// first render instead of showing a blank while a fresh poll flies. The strip
// is best-effort, so a briefly stale top-game id is fine: the immediate poll
// below refreshes it and any dead game self-corrects on watch failure.
let lastLobby: MPLobby | null = null;

export function useLobbySnapshot(pollMs = 10000): MPLobby | null {
  const [lobby, setLobby] = useState<MPLobby | null>(lastLobby);
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await fetchLobbySnapshot();
        lastLobby = data;
        if (!cancelled) setLobby(data);
      } catch {
        // Leave the last snapshot up; the strip degrades gracefully.
      }
    };
    poll();
    const id = window.setInterval(poll, pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollMs]);
  return lobby;
}
