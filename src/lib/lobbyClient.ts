"use client";

// Small polling hook for lobby snapshots (online players + live games), shared
// by the home page (hero TV and live counter), community and TV. The lobby
// page runs its own faster loop so it can surface connection errors.

import { useCallback, useEffect, useState } from "react";
import { withArenaLobby } from "./arenaLobby";
import { MPLobby } from "./multiplayer";

// One lobby snapshot over the edge-cached HTTP route. This replaces the old
// per-viewer WebSocket `lobby` poll: a crowd of browsers now shares one cached
// copy per colo, so the DO sees ~1 request per cache window instead of one
// socket poll each, and idle viewers hold no socket at all. The counts come
// entirely from this one shared snapshot: arena (OCI bot-vs-bot) games are
// unioned into it server-side (worker.ts, gated ARENA_LOBBY_ENABLED), so every
// client agrees; withArenaLobby only warms arena spectator-routing state and
// leaves the numbers untouched (see arenaLobby.ts, Tier 3). Throws on a non-OK
// response so callers keep their last snapshot.
export async function fetchLobbySnapshot(): Promise<MPLobby> {
  // Rotating cache-buster + no-store: production served a DAYS-old pinned
  // copy of the bare /api/lobby URL (empty games/seeks while the DO held 70+
  // live games), from some cache layer between the browser and the worker
  // that ignored the response's 3s TTL. The bucketed query param makes every
  // ~3s window a fresh URL, so no URL-keyed cache in front of the worker can
  // ever pin the lobby again; the worker's own edge cache maps ANY query to
  // its shared per-window key (worker.ts handleLobbyEdge), so this adds no
  // load on the game server; a crowd still costs ~1 DO hit per window.
  const bucket = Math.floor(Date.now() / 3000);
  const res = await fetch(`/api/lobby?fresh=${bucket}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`lobby ${res.status}`);
  const raw = (await res.json()) as MPLobby;
  return withArenaLobby(raw);
}

// One shared poller for every surface on the page. Each hook used to run its
// own interval, so the home page (HeroTv and the live counter) fetched the
// same snapshot twice on mount and twice every 10s (F004). Now every mounted
// hook subscribes to one module-level loop: it polls at the fastest interval
// any subscriber asked for, a poll already in flight is shared rather than
// repeated, and the loop stops when the last subscriber unmounts.
//
// The last good snapshot also lives here, so a remount (e.g. a client-side
// navigation back to the home page) paints from it on the first render
// instead of showing a blank while a fresh poll flies. It is best-effort, so a
// briefly stale top-game id is fine: the immediate poll on subscribe
// refreshes it and any dead game self-corrects on watch failure.
type LobbyState = { lobby: MPLobby | null; failed: boolean };

let lastLobby: MPLobby | null = null;
let state: LobbyState = { lobby: null, failed: false };
let failures = 0;
let inflight: Promise<void> | null = null;
let timer: number | null = null;
let timerMs = 0;
let nextId = 0;
const subscribers = new Map<number, { pollMs: number; notify: () => void }>();

function emit() {
  for (const sub of subscribers.values()) sub.notify();
}

// `failed` flips true only after two misses in a row AND with no cached
// snapshot to fall back on; stale-but-present data always wins over an error.
function pollNow(): Promise<void> {
  if (inflight) return inflight;
  inflight = fetchLobbySnapshot()
    .then((data) => {
      lastLobby = data;
      failures = 0;
      state = { lobby: data, failed: false };
    })
    .catch(() => {
      failures += 1;
      if (failures >= 2 && !lastLobby) state = { lobby: state.lobby, failed: true };
    })
    .finally(() => {
      inflight = null;
      emit();
    });
  return inflight;
}

// A backgrounded tab has its setInterval throttled by the browser, so a
// screen left on the lobby during ramp-up could otherwise hold a stale count
// for a long time. Re-poll immediately on foreground/focus so it converges on
// the shared DO snapshot the moment the viewer looks at it again.
function onForeground() {
  if (document.visibilityState === "visible") void pollNow();
}

function reschedule() {
  if (subscribers.size === 0) {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    timerMs = 0;
    document.removeEventListener("visibilitychange", onForeground);
    window.removeEventListener("focus", onForeground);
    return;
  }
  const ms = Math.min(...[...subscribers.values()].map((sub) => sub.pollMs));
  if (timer === null) {
    document.addEventListener("visibilitychange", onForeground);
    window.addEventListener("focus", onForeground);
  }
  if (ms !== timerMs) {
    if (timer !== null) window.clearInterval(timer);
    // Hidden tabs skip the tick; onForeground polls once when shown again.
    timer = window.setInterval(() => {
      if (document.visibilityState !== "hidden") void pollNow();
    }, ms);
    timerMs = ms;
  }
}

/**
 * Subscribe to the shared poll outside React (the presence feed, for one).
 * Calls `onChange` with the latest snapshot whenever a poll lands and returns
 * the unsubscribe; `pollMs` joins the other subscribers' intervals (the loop
 * runs at the fastest).
 */
export function subscribeLobbySnapshot(pollMs: number, onChange: (lobby: MPLobby | null) => void): () => void {
  const id = ++nextId;
  subscribers.set(id, { pollMs, notify: () => onChange(state.lobby) });
  reschedule();
  void pollNow();
  return () => {
    subscribers.delete(id);
    reschedule();
  };
}

/** The last good snapshot, if any poll has landed this page load. */
export function getLobbySnapshot(): MPLobby | null {
  return lastLobby;
}

// The polling hook with connection status. A surface can swap its skeleton
// for a designed error state on `failed` instead of spinning forever when the
// game server is unreachable. `reload` forces an immediate re-poll (wired to
// Retry buttons).
export function useLobbySnapshotStatus(pollMs = 10000): {
  lobby: MPLobby | null;
  failed: boolean;
  reload: () => void;
} {
  const [snap, setSnap] = useState<LobbyState>(() => ({ lobby: lastLobby, failed: false }));
  useEffect(() => {
    const id = ++nextId;
    subscribers.set(id, { pollMs, notify: () => setSnap(state) });
    reschedule();
    void pollNow();
    return () => {
      subscribers.delete(id);
      reschedule();
    };
  }, [pollMs]);
  const reload = useCallback(() => {
    void pollNow();
  }, []);
  return { lobby: snap.lobby, failed: snap.failed, reload };
}

export function useLobbySnapshot(pollMs = 10000): MPLobby | null {
  return useLobbySnapshotStatus(pollMs).lobby;
}
