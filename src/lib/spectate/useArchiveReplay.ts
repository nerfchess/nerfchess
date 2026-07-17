"use client";

// The archive rerun channel for the TV surfaces (src/app/tv/page.tsx and
// src/components/HeroTv.tsx): with nothing live, pick a RANDOM recently
// finished game and step through its moves at a broadcast cadence, then dwell
// on the final position and pick another — so TV always opens on a running
// board instead of a static "latest finished game" position or an empty state.
//
// The hook only produces a move PREFIX (plus the game's identity); the caller
// feeds it through the same featuredBoard()/replayUci() path the old static
// fallback used, so no new chess logic exists here. Archived games are
// moves-only (no draft-action record), which is exactly the recordless replay
// featuredBoard already documents for the archive path.
//
// Live priority is the caller's: it passes `playing=false` the moment a live
// tune takes the board, which tears down the step/advance timers (nothing
// ticks in the background); the rerun resumes where it left off if the live
// pool empties again. The archive pool itself is fetched once per mode channel
// regardless of `playing`, so the first fallback frame is ready fast.

import { useEffect, useMemo, useState } from "react";
import type { MPPlayers } from "@/lib/multiplayer";
import type { DraftMode } from "@/engine/buff";

/** One archived game as served by /api/games/recent (`moves` is the
 *  space-separated UCI string the archive stores). */
export interface ArchivedGame {
  id: string;
  white_name: string;
  black_name: string;
  white_rating_before: number | null;
  black_rating_before: number | null;
  moves: string;
  category: string | null;
  white_avatar: string | null;
  black_avatar: string | null;
}

// How many archived games the rerun channel draws from. Small enough to stay a
// cheap read, big enough that back-to-back reruns don't repeat.
const POOL_SIZE = 8;
// Broadcast cadence: one move every 1.5s reads as a game being played, not a
// slideshow and not a blur.
const STEP_MS = 1500;
// Dwell on the final position before cutting to the next rerun, so the result
// registers.
const HOLD_FINAL_MS = 5000;

export interface ArchiveReplay {
  /** The archived game currently being rerun (null before the fetch resolves
   *  or when the archive is empty). */
  game: ArchivedGame | null;
  /** The rerun's moves SO FAR — a prefix of the full line that grows one move
   *  per step while `playing`. */
  moves: string[];
  /** Seat identities in the shape the featured header renders. */
  players: MPPlayers | null;
  /** The rerun game's mode (nerf/buff), when its category records one. */
  mode: DraftMode | null;
  /** True once the archive lookup resolved (even to an empty archive), so the
   *  caller's empty state never flashes before the answer is in. */
  checked: boolean;
}

function pickRandom(pool: ArchivedGame[], excludeId: string | null): ArchivedGame | null {
  if (pool.length === 0) return null;
  const eligible = pool.length > 1 && excludeId ? pool.filter((g) => g.id !== excludeId) : pool;
  return eligible[Math.floor(Math.random() * eligible.length)] ?? null;
}

/**
 * Drive a random-archived-game rerun for a TV surface.
 *
 * @param playing Advance the rerun only while true. The caller passes false the
 *   moment a live game holds the board, which clears every timer; the fetch of
 *   the pool itself is NOT gated so the fallback is ready immediately.
 * @param mode    The channel's mode filter (nerf/buff) or null for all games.
 *   A change fully resets the pool + rerun so nothing from the other pool
 *   lingers, mirroring the surfaces' own channel-switch resets.
 */
export function useArchiveReplay(playing: boolean, mode: DraftMode | null): ArchiveReplay {
  const [pool, setPool] = useState<ArchivedGame[] | null>(null);
  const [checked, setChecked] = useState(false);
  const [game, setGame] = useState<ArchivedGame | null>(null);
  const [ply, setPly] = useState(0);

  // Channel switch: drop the pool and the running rerun so nothing from the
  // other pool lingers. The sanctioned useState compare during render, same as
  // the surfaces' own mode resets.
  const [prevMode, setPrevMode] = useState(mode);
  if (prevMode !== mode) {
    setPrevMode(mode);
    setPool(null);
    setChecked(false);
    setGame(null);
    setPly(0);
  }

  // Fetch the rerun pool once per channel (pool is nulled on a mode switch).
  // Deliberately not gated on `playing` so the first fallback frame is ready
  // the moment the caller needs one.
  useEffect(() => {
    if (pool) return;
    let cancelled = false;
    fetch(`/api/games/recent?limit=${POOL_SIZE}${mode ? `&mode=${mode}` : ""}`)
      .then((res) =>
        res.ok ? (res.json() as Promise<{ game: ArchivedGame | null; games?: ArchivedGame[] }>) : null,
      )
      .then((data) => {
        if (cancelled) return;
        // Older API shape carried a single `game`; treat it as a one-game pool.
        const games = data?.games ?? (data?.game ? [data.game] : []);
        setPool(games);
        setChecked(true);
        if (games.length) {
          setGame(pickRandom(games, null));
          setPly(0);
        }
      })
      .catch(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pool, mode]);

  const allMoves = useMemo(
    () => (game?.moves ? game.moves.split(" ").filter(Boolean) : []),
    [game],
  );
  const done = game != null && ply >= allMoves.length;

  // Step the rerun one move at a time while it is on air. Cleared on pause
  // (a live game took the board), on a game change, and on unmount, so no
  // timer ever ticks behind a live stream.
  useEffect(() => {
    if (!playing || !game || done) return;
    const timer = window.setInterval(() => {
      setPly((p) => Math.min(p + 1, allMoves.length));
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [playing, game, done, allMoves.length]);

  // A finished rerun dwells on the final position, then the channel cuts to
  // another random archived game (never the same one back-to-back while the
  // pool has more than one).
  useEffect(() => {
    if (!playing || !game || !done) return;
    const timer = window.setTimeout(() => {
      setGame((current) => pickRandom(pool ?? [], current?.id ?? null));
      setPly(0);
    }, HOLD_FINAL_MS);
    return () => window.clearTimeout(timer);
  }, [playing, game, done, pool]);

  const players = useMemo<MPPlayers | null>(() => {
    if (!game) return null;
    return {
      w: {
        name: game.white_name,
        rating: game.white_rating_before ? Math.round(game.white_rating_before) : null,
        avatar: game.white_avatar,
      },
      b: {
        name: game.black_name,
        rating: game.black_rating_before ? Math.round(game.black_rating_before) : null,
        avatar: game.black_avatar,
      },
    };
  }, [game]);

  const moves = useMemo(() => allMoves.slice(0, ply), [allMoves, ply]);
  const gameMode: DraftMode | null =
    game?.category === "nerf" || game?.category === "buff" ? game.category : null;

  return { game, moves, players, mode: gameMode, checked };
}
