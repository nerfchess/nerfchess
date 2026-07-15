"use client";

// Client-side presence derived from the shared lobby snapshot. NerfChess is
// server-authoritative over the lobby feed (players[], seeks[], games[]); this
// module turns that one feed into per-username presence WITHOUT opening a
// socket per component. It reuses the same edge-cached HTTP lobby route the
// lobby page and hero TV poll (lib/lobbyClient.ts), but through ONE module-level
// refcounted poll shared by every subscriber, so a page with a search box, a
// friends list, and a profile badge all read a single snapshot.
//
// Presence-visibility caveat: a player who hides their online status
// (users.show_online = 0) is still visible in the lobby snapshot to everyone,
// so search results and other players' friends lists cannot cheaply suppress
// them. The profile page and the profile/friends endpoints enforce the hidden
// flag; broad lists surface lobby presence regardless. See spec section 5.

import { useEffect, useMemo, useState } from "react";
import { fetchLobbySnapshot } from "./lobbyClient";
import type { MPLobby, MPLobbyGame } from "./multiplayer";

const POLL_MS = 10000;

// One shared snapshot + poll, refcounted across every hook instance.
let snapshot: MPLobby | null = null;
let subscribers = 0;
let pollTimer: number | null = null;
const listeners = new Set<(lobby: MPLobby | null) => void>();

function emit() {
  for (const fn of [...listeners]) fn(snapshot);
}

async function poll() {
  try {
    snapshot = await fetchLobbySnapshot();
    emit();
  } catch {
    // Keep the last snapshot; presence degrades gracefully to stale/offline.
  }
}

const onForeground = () => {
  if (typeof document === "undefined" || document.visibilityState === "visible") void poll();
};

function startPolling() {
  if (pollTimer !== null || typeof window === "undefined") return;
  void poll();
  pollTimer = window.setInterval(poll, POLL_MS);
  document.addEventListener("visibilitychange", onForeground);
  window.addEventListener("focus", onForeground);
}

function stopPolling() {
  if (pollTimer === null || typeof window === "undefined") return;
  window.clearInterval(pollTimer);
  pollTimer = null;
  document.removeEventListener("visibilitychange", onForeground);
  window.removeEventListener("focus", onForeground);
}

function subscribe(fn: (lobby: MPLobby | null) => void): () => void {
  listeners.add(fn);
  subscribers++;
  if (subscribers === 1) startPolling();
  else fn(snapshot); // hand the newcomer the current snapshot immediately
  return () => {
    listeners.delete(fn);
    subscribers--;
    if (subscribers === 0) stopPolling();
  };
}

/** The latest shared lobby snapshot, or null before the first poll resolves.
 *  Backed by one refcounted poll no matter how many components subscribe. */
export function useLobbyFeed(): MPLobby | null {
  const [lobby, setLobby] = useState<MPLobby | null>(snapshot);
  useEffect(() => subscribe(setLobby), []);
  return lobby;
}

export type PresenceState = "in-game" | "searching" | "online" | "offline";

export interface Presence {
  state: PresenceState;
  /** The live game id when in-game and known (drives the "Watch" affordance). */
  gameId?: string;
  /** The lobby game entry when in-game via games[] (players, mode, clocks). */
  game?: MPLobbyGame;
}

// Case-insensitive name matching: lobby names are display-cased, callers pass
// whatever casing they have.
function nameEq(a: string | null | undefined, b: string): boolean {
  return !!a && a.toLowerCase() === b;
}

/** Derive one username's presence from a lobby snapshot. Priority: in-game
 *  (a game they are seated in) > searching (a seek or a "searching" row) >
 *  online (present in the players list) > offline. Exported for tests and
 *  list rendering that already holds a snapshot from useLobbyFeed. */
export function derivePresence(lobby: MPLobby | null, username: string | null | undefined): Presence {
  const name = (username ?? "").trim().toLowerCase();
  if (!lobby || !name) return { state: "offline" };

  // Seated in a live, watchable game.
  for (const game of lobby.games) {
    if (nameEq(game.players.w?.name, name) || nameEq(game.players.b?.name, name)) {
      return { state: "in-game", gameId: game.id, game };
    }
  }

  // Waiting in a quick-pairing pool.
  for (const seek of lobby.seeks ?? []) {
    if (nameEq(seek.name, name)) return { state: "searching" };
  }

  // In the online list: their status refines online vs searching vs (rare)
  // playing without a public game entry.
  for (const player of lobby.players) {
    if (nameEq(player.name, name)) {
      if (player.status === "playing") return { state: "in-game" };
      if (player.status === "searching") return { state: "searching" };
      return { state: "online" };
    }
  }

  return { state: "offline" };
}

/** Live presence for one username, updating as the shared snapshot changes. */
export function usePresence(username: string | null | undefined): Presence {
  const lobby = useLobbyFeed();
  return useMemo(() => derivePresence(lobby, username), [lobby, username]);
}
