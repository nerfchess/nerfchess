"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { HeroBoard } from "./HeroBoard";
import { PlayerAvatar } from "./PlayerAvatar";
import { useLobbySnapshot } from "@/lib/lobbyClient";
import { featuredBoard } from "@/lib/spectate/featuredBoard";
import { useArchiveReplay } from "@/lib/spectate/useArchiveReplay";
import { useFeaturedTune } from "@/lib/spectate/useFeaturedTune";
import { clockLabel } from "@/lib/tournaments";
import type { Color } from "@/engine/types";

// Lichess-TV-style hero: when a real game is being played, the landing board
// streams it live (top game = most watched, then longest running). With no
// live games the channel keeps running: a random archived game reruns move by
// move (badged REPLAY), then the next one; the static demo position only
// appears before anything has ever been played.
export function HeroTv() {
  const router = useRouter();
  const lobby = useLobbySnapshot(10000);

  // Featured selection + health-checked failover, shared with /tv. The hero has
  // no channel filter and no manual pin, so it simply follows the first HEALTHY
  // live game: a broken candidate is retried with bounded backoff and then
  // skipped in favor of the next one, instead of the old silent infinite
  // re-watch of games[0].
  const candidateIds = useMemo(() => lobby?.games.map((g) => g.id) ?? [], [lobby]);
  const tune = useFeaturedTune(candidateIds, null, "hero", { surface: "hero", filter: "hero" });
  const { streamId, moves, players, over, draft } = tune;

  const live = tune.live;
  // The archive rerun: a random recently finished game replayed move by move,
  // then another. The hook fetches its pool IMMEDIATELY on mount, in parallel
  // with the lobby poll, so the hero board shows real play right away instead
  // of waiting for the (single global Durable Object, sometimes slow) lobby
  // snapshot. A live game, when one is being played, takes over below (which
  // also pauses every rerun timer); until it does, the rerun keeps the board
  // alive so a visitor never sees a loading gap or a frozen position.
  const replay = useArchiveReplay(!live, null);
  const shownMoves = useMemo(
    () => (live ? moves : replay.moves),
    [live, moves, replay.moves],
  );
  const { board, history } = useMemo(
    () => featuredBoard(live, shownMoves, draft),
    [live, shownMoves, draft],
  );
  const lastMove = history[history.length - 1] ?? null;

  const shownId = live ? streamId : replay.game?.id ?? null;
  const shownPlayers = live ? players : replay.players;
  // The lobby entry for the streaming game, when live: carries the time
  // control and live move count for the overlay header.
  const liveGame = live ? lobby?.games.find((g) => g.id === streamId) ?? null : null;
  // The shown game's mode (nerf/buff), when known: labels the seat ratings
  // and feeds the caption below the board.
  const shownMode = live
    ? liveGame?.mode === "nerf" || liveGame?.mode === "buff"
      ? liveGame.mode
      : null
    : replay.mode;
  // Move number for the header: the streamed move count when live, otherwise
  // the length of the replayed line.
  const moveNumber = shownMoves.length;
  const timeControl = liveGame ? clockLabel(liveGame.timeSec, liveGame.incrementSec) : null;

  // Warm the route the hero links to so tapping "Watch"/"Replay" navigates
  // instantly instead of paying to load the /game/[id] chunk on click. Kept
  // above the early return so hook order stays stable across renders.
  useEffect(() => {
    if (shownId) router.prefetch(`/game/${shownId}`);
  }, [shownId, router]);

  // The three channel states (demo, archive rerun, live) share ONE frame: a
  // fixed-height row above the board, the board, and a fixed-height row below
  // it. Only the rows' content changes, so the board and everything under it
  // (the phone CTAs sit right below the hero) never move when the channel
  // flips from the demo to a rerun to a live game and back. The rows used to
  // come and go per state, which moved the board by a row's height.
  if (!shownId || !shownPlayers) {
    // Nothing live and nothing archived yet: the built-in demo position stands
    // in, with a quiet caption so the board still reads as "this is where the
    // action shows up".
    return (
      <HeroFrame
        top={
          // The empty state's one sentence is body copy, not a caption.
          <span className="min-w-0 truncate text-[13px] text-parchment-400">Live games appear here</span>
        }
        board={<HeroBoard />}
        bottom={
          <div className="ml-auto flex shrink-0 items-center">
            <FrameLink href="/tv" quiet>
              Watch TV &rarr;
            </FrameLink>
          </div>
        }
      />
    );
  }

  // Each seat is its own link into the player's profile. The board link and
  // the name links sit side by side, never nested.
  const seat = (color: Color) => {
    const p = shownPlayers[color];
    return (
      <Link
        href={`/u/${encodeURIComponent(p.name)}`}
        className="group/seat flex min-w-0 items-center gap-2 no-underline"
        title={`${p.name}'s profile`}
      >
        <PlayerAvatar name={p.name} avatar={p.avatar} size={24} />
        <span className="truncate font-display text-[15px] text-parchment-100 underline-offset-4 transition-colors group-hover/seat:text-gold-leaf group-hover/seat:underline group-hover/seat:decoration-gold/50">
          {p.name}
          {/* The rating wears the mode's color (warm rose for Nerf, sky for
              Buff) instead of spelling the mode out next to the number. */}
          {p.rating != null && (
            <span
              className={
                "no-underline " +
                (shownMode === "nerf"
                  ? "text-mode-nerfGlow"
                  : shownMode === "buff"
                    ? "text-mode-buffGlow"
                    : "text-parchment-400")
              }
            >
              {" "}({p.rating})
            </span>
          )}
        </span>
      </Link>
    );
  };

  // Full moves, the way the lobby and TV count them (the stream carries
  // plies): "Move 12" after white's twelfth move, not after the sixth.
  const moveLabel =
    moveNumber > 0 ? (
      <span className="font-mono text-[12px] tabular-nums text-parchment-400">Move {Math.ceil(moveNumber / 2)}</span>
    ) : null;

  // The archive rerun wears ONE clean attribution line ("Featured replay ·
  // white vs black · Mode") in the top row and a single Watch link in the
  // bottom row, instead of scattering a REPLAY badge, mode chip, and archive
  // labels around the frame. Live games keep their full seat-row broadcast
  // header in the same two rows.
  if (!live) {
    const modeLabel = shownMode === "nerf" ? "Nerf" : shownMode === "buff" ? "Buff" : null;
    return (
      <HeroFrame
        top={
          <span className="min-w-0 truncate text-[13px] text-parchment-300">
            Featured replay
            <span className="mx-1.5 text-parchment-500">·</span>
            <span className="text-parchment-100">{shownPlayers.w.name}</span>{" "}
            <span className="text-parchment-400">vs</span>{" "}
            <span className="text-parchment-100">{shownPlayers.b.name}</span>
            {modeLabel && (
              <>
                <span className="mx-1.5 text-parchment-500">·</span>
                <span className={shownMode === "nerf" ? "text-mode-nerfGlow" : "text-mode-buffGlow"}>
                  {modeLabel}
                </span>
              </>
            )}
          </span>
        }
        href={`/game/${shownId}`}
        title="Replay this game"
        board={<HeroBoard board={board} lastMove={lastMove} />}
        bottom={
          <div className="ml-auto flex shrink-0 items-center gap-3">
            {moveLabel}
            <FrameLink href={`/game/${shownId}`}>Watch replay &rarr;</FrameLink>
          </div>
        }
      />
    );
  }

  return (
    <HeroFrame
      top={
        // Black seat on the left, then the live status (LIVE badge when
        // running, mode chip, time control) on the right. Kept out of the
        // board squares so pieces never get covered.
        <>
          {seat("b")}
          <div className="flex shrink-0 items-center gap-1.5">
            {/* LIVE while streaming, "Just finished" while the result lingers. */}
            <span
              className={
                "flex items-center gap-1.5 border px-2 py-1 text-[12px] " +
                (!over
                  ? "border-[rgb(var(--accent-positive-rgb)_/_0.4)] bg-[rgb(var(--accent-positive-rgb)_/_0.1)] text-[rgb(var(--accent-positive-rgb))]"
                  : "border-[color:var(--edge)] bg-[color:var(--bg-zebra)] text-parchment-300")
              }
            >
              {!over ? <span className="dot-live h-2 w-2 bg-[rgb(var(--accent-positive-rgb))]" /> : null}
              {over ? "Just finished" : "LIVE"}
            </span>
            {shownMode ? (
              <span
                className={
                  "border px-2 py-1 text-[12px] " +
                  (shownMode === "nerf"
                    ? "border-mode-nerf/40 bg-mode-nerf/10 text-mode-nerfGlow"
                    : "border-mode-buff/40 bg-mode-buff/10 text-mode-buffGlow")
                }
              >
                {shownMode === "nerf" ? "Nerf" : "Buff"}
              </span>
            ) : null}
            {timeControl ? (
              <span className="hidden border border-[color:var(--edge)] bg-[color:var(--bg-zebra)] px-2 py-1 font-mono text-[12px] tabular-nums text-parchment-300 sm:inline">
                {timeControl}
              </span>
            ) : null}
          </div>
        </>
      }
      href={`/game/${shownId}`}
      title="Watch this game"
      board={<HeroBoard board={board} lastMove={lastMove} />}
      bottom={
        <>
          {seat("w")}
          <div className="ml-auto flex shrink-0 items-center gap-3">
            {moveLabel}
            <FrameLink href={`/game/${shownId}`}>Watch live &rarr;</FrameLink>
          </div>
        </>
      }
    />
  );
}

// The one hero frame. Both rows have a FIXED height that depends only on the
// pointer, never on which channel state is showing, so swapping the rows'
// content cannot move the board or the page below it. The top row's 36px holds
// the tallest thing it ever carries (the 28px status chips) plus the 8px gap
// to the board. The bottom row mirrors it on a fine pointer; on a coarse one
// it is 44px with no padding, so its action link can be a full 44px target
// that stops at the frame's edge.
function HeroFrame({
  top,
  bottom,
  board,
  href,
  title,
}: {
  top: React.ReactNode;
  bottom: React.ReactNode;
  board: React.ReactNode;
  href?: string;
  title?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[600px]" data-hero-frame>
      <div className="flex h-[36px] items-center justify-between gap-2 pb-2" data-hero-row="top">
        {top}
      </div>
      {href ? (
        <Link href={href} className="tv-frame group block no-underline" title={title}>
          <div className="overflow-hidden">{board}</div>
        </Link>
      ) : (
        <div className="tv-frame">
          <div className="overflow-hidden">{board}</div>
        </div>
      )}
      <div
        className="flex h-[44px] items-center justify-between gap-2 [@media(pointer:fine)]:h-[36px] [@media(pointer:fine)]:pt-2"
        data-hero-row="bottom"
      >
        {bottom}
      </div>
    </div>
  );
}

// A frame action link: a full-row 44px target on a coarse pointer, its natural
// height on a fine one.
function FrameLink({ href, quiet, children }: { href: string; quiet?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={
        "inline-flex min-h-[44px] shrink-0 items-center text-[13px] no-underline transition-colors [@media(pointer:fine)]:min-h-0 " +
        (quiet ? "text-parchment-400 hover:text-gold-leaf" : "font-medium text-gold-leaf hover:text-parchment-50")
      }
    >
      {children}
    </Link>
  );
}
