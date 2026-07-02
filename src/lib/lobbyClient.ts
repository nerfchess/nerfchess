"use client";

// Small polling hook for lobby snapshots (online players + live games).
// Used by the homepage "live now" strip; the lobby page runs its own loop so
// it can surface connection errors.

import { useEffect, useState } from "react";
import { MPLobby, MPSession } from "./multiplayer";

export function useLobbySnapshot(pollMs = 10000): MPLobby | null {
  const [lobby, setLobby] = useState<MPLobby | null>(null);
  useEffect(() => {
    let cancelled = false;
    const session = new MPSession();
    session.persistFriendSession = false;
    session.autoReconnect = false; // fetchLobby reconnects on demand
    const poll = async () => {
      try {
        const data = await session.fetchLobby();
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
