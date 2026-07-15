"use client";

// Small polling hook for lobby snapshots (online players + live games).
// Used by the homepage "live now" strip; the lobby page runs its own loop so
// it can surface connection errors.

import { useCallback, useEffect, useState } from "react";
import { withArenaLobby } from "./arenaLobby";
import { MPLobby } from "./multiplayer";

// One lobby snapshot over the edge-cached HTTP route. This replaces the old
// per-viewer WebSocket `lobby` poll: a crowd of browsers now shares one cached
// copy per colo, so the DO sees ~1 request per cache window instead of one
// socket poll each, and idle viewers hold no socket at all. The counts come
// entirely from this one shared snapshot — arena (OCI bot-vs-bot) games are
// unioned into it server-side (worker.ts, gated ARENA_LOBBY_ENABLED), so every
// client agrees; withArenaLobby only warms arena spectator-routing state and
// leaves the numbers untouched (see arenaLobby.ts, Tier 3). Throws on a non-OK
// response so callers keep their last snapshot.
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

// The polling hook with connection status. `failed` flips true only after two
// misses in a row AND with no cached snapshot to fall back on, so a surface can
// swap its skeleton for a designed error state instead of spinning forever when
// the game server is unreachable; stale-but-present data always wins over an
// error. `reload` forces an immediate re-poll (wired to Retry buttons).
export function useLobbySnapshotStatus(pollMs = 10000): {
  lobby: MPLobby | null;
  failed: boolean;
  reload: () => void;
} {
  const [lobby, setLobby] = useState<MPLobby | null>(lastLobby);
  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let failures = 0;
    const poll = async () => {
      try {
        const data = await fetchLobbySnapshot();
        lastLobby = data;
        if (!cancelled) {
          failures = 0;
          setLobby(data);
          setFailed(false);
        }
      } catch {
        // Leave the last snapshot up; the strip degrades gracefully. Only after
        // a second consecutive miss with nothing cached do we report failure.
        if (!cancelled) {
          failures += 1;
          if (failures >= 2 && !lastLobby) setFailed(true);
        }
      }
    };
    poll();
    const id = window.setInterval(poll, pollMs);
    // A backgrounded tab has its setInterval throttled by the browser, so a
    // screen left on the lobby during ramp-up could otherwise hold a stale count
    // for a long time. Re-poll immediately on foreground/focus so it converges on
    // the shared DO snapshot the moment the viewer looks at it again.
    const onForeground = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", onForeground);
    window.addEventListener("focus", onForeground);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onForeground);
      window.removeEventListener("focus", onForeground);
    };
  }, [pollMs, nonce]);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { lobby, failed, reload };
}

export function useLobbySnapshot(pollMs = 10000): MPLobby | null {
  return useLobbySnapshotStatus(pollMs).lobby;
}
