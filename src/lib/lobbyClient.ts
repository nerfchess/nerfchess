"use client";

// Small polling hook for lobby snapshots (online players + live games).
// Used by the homepage "live now" strip; the lobby page runs its own loop so
// it can surface connection errors.

import { useEffect, useState } from "react";
import { MPLobby, MPSession } from "./multiplayer";

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
    const session = new MPSession();
    session.persistFriendSession = false;
    session.autoReconnect = false; // fetchLobby reconnects on demand
    const poll = async () => {
      try {
        const data = await session.fetchLobby();
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
      session.destroy();
    };
  }, [pollMs]);
  return lobby;
}
