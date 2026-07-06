"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { ArrowRight, ChevronRight, Trophy, Tv, Users } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useLobbySnapshot } from "@/lib/lobbyClient";
import { DEFAULT_CATEGORY, getCategory, isRatingCategoryId } from "@/lib/ratingCategories";

// The community hub: who is on top, who is playing the most, who is online
// right now, and what was just played, plus doors to the social spaces.

interface TopPlayer {
  username: string;
  avatar?: string | null;
  rating: number;
  rd: number;
  games: number;
  guest?: boolean;
}

interface ActivePlayer {
  username: string;
  avatar: string | null;
  games: number;
}

interface RecentGame {
  id: string;
  whiteName: string;
  blackName: string;
  winner: "w" | "b" | "draw" | null;
  reason: string;
  rated: boolean;
  category: string;
  completedAt: number;
}

// Doors to the social spaces. Each carries its own accent (coral / sun /
// mint) for the icon chip and the card-juicy hover ring, so the cards read
// as big friendly buttons instead of quiet text blocks.
const HUB_LINKS = [
  {
    href: "/clubs",
    title: "Clubs",
    blurb: "Join a club or start your own.",
    icon: Users,
    hex: "#ef8a5f",
    rgb: "239 138 95",
  },
  {
    href: "/tournaments",
    title: "Tournaments",
    blurb: "Arena events, open to everyone.",
    icon: Trophy,
    hex: "#eec25e",
    rgb: "238 194 94",
  },
  {
    href: "/tv",
    title: "Nerf TV",
    blurb: "Watch the best live game right now.",
    icon: Tv,
    hex: "#58c39a",
    rgb: "88 195 154",
  },
];

function timeAgo(at: number): string {
  const s = Math.max(1, Math.floor((Date.now() - at) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function resultLabel(winner: "w" | "b" | "draw" | null): string {
  if (winner === "w") return "1-0";
  if (winner === "b") return "0-1";
  if (winner === "draw") return "½-½";
  return "-";
}

export default function CommunityPage() {
  const [top, setTop] = useState<TopPlayer[] | null>(null);
  const [active, setActive] = useState<ActivePlayer[] | null>(null);
  const [recent, setRecent] = useState<RecentGame[] | null>(null);
  const lobby = useLobbySnapshot();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/leaderboard?category=${DEFAULT_CATEGORY}`)
      .then((res) => (res.ok ? (res.json() as Promise<{ players: TopPlayer[] }>) : null))
      .then((data) => {
        if (!cancelled && data) setTop(data.players.slice(0, 10));
      })
      .catch(() => {});
    fetch("/api/community/active")
      .then((res) => (res.ok ? (res.json() as Promise<{ players: ActivePlayer[] }>) : null))
      .then((data) => {
        if (!cancelled && data) setActive(data.players);
      })
      .catch(() => {});
    fetch("/api/community/recent")
      .then((res) => (res.ok ? (res.json() as Promise<{ games: RecentGame[] }>) : null))
      .then((data) => {
        if (!cancelled && data) setRecent(data.games);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const onlineCount = lobby ? lobby.players.length + lobby.anonymous : null;
  const topBoard = getCategory(DEFAULT_CATEGORY);

  return (
    <main className="min-h-screen pb-16">
      <SiteHeader active="/community" />

      <section className="max-w-5xl mx-auto px-5 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl">Community</h1>
          </div>
          <div className="flex items-center gap-2 smallcaps text-[11px] text-parchment-300">
            <span className="w-2 h-2 rounded-full bg-verdigris animate-flicker" />
            {onlineCount === null ? "Connecting…" : `${onlineCount} player${onlineCount === 1 ? "" : "s"} online`}
          </div>
        </div>

        {/* Doors to the social spaces: unmistakably clickable cards. */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {HUB_LINKS.map((card) => {
            const CardIcon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="plate plate-hover card-juicy group flex cursor-pointer items-center gap-3.5 p-4 no-underline"
                style={{ "--tier-rgb": card.rgb } as CSSProperties}
              >
                <span
                  aria-hidden
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] border"
                  style={{ background: `${card.hex}24`, borderColor: `${card.hex}59`, color: card.hex }}
                >
                  <CardIcon size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-xl text-parchment transition-colors group-hover:text-parchment-50">
                    {card.title}
                  </span>
                  <span className="mt-0.5 block text-sm text-parchment-300">{card.blurb}</span>
                </span>
                <ArrowRight
                  size={18}
                  className="shrink-0 text-parchment-400 transition-all group-hover:translate-x-1 group-hover:text-parchment-100"
                  aria-hidden
                />
              </Link>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4 min-w-0">
            {/* The Nerf top ten; both mode ladders live on /leaderboard. */}
            <div className="plate p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="font-display text-2xl text-parchment">Top players</div>
                <Link href="/leaderboard" className="btn-ghost flex items-center gap-1 px-3 py-1.5 text-xs">
                  Full leaderboard <ChevronRight size={13} aria-hidden />
                </Link>
              </div>
              {!top ? (
                <p className="mt-3 text-sm text-parchment-400">Loading…</p>
              ) : top.length === 0 ? (
                <p className="mt-3 text-sm text-parchment-400">
                  Nobody has a {topBoard.label} rating yet. Play a rated game to claim the top spot.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-white/5">
                  {top.map((player, i) => (
                    <li key={player.guest ? `guest:${player.username}` : player.username}>
                      <PlayerLine
                        rank={i + 1}
                        username={player.username}
                        avatar={player.avatar}
                        guest={player.guest}
                        right={
                          <span className="font-mono text-sm tabular-nums text-parchment-100">
                            {Math.round(player.rating)}
                            {player.rd > 150 && <span className="text-parchment-400">?</span>}
                          </span>
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Who played the most this week. */}
            <div className="plate p-5 sm:p-6">
              <div className="font-display text-2xl text-parchment">Most active this week</div>
              {!active ? (
                <p className="mt-3 text-sm text-parchment-400">Loading…</p>
              ) : active.length === 0 ? (
                <p className="mt-3 text-sm text-parchment-400">No games in the last 7 days. Be the first.</p>
              ) : (
                <ul className="mt-3 divide-y divide-white/5">
                  {active.map((player, i) => (
                    <li key={player.username}>
                      <PlayerLine
                        rank={i + 1}
                        username={player.username}
                        avatar={player.avatar}
                        right={
                          <span className="font-mono text-sm tabular-nums text-parchment-100">
                            {player.games}
                            <span className="ml-1 text-xs text-parchment-400">
                              game{player.games === 1 ? "" : "s"}
                            </span>
                          </span>
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* The latest finished games, each opening its replay. */}
            <div className="plate p-5 sm:p-6">
              <div className="font-display text-2xl text-parchment">Recent games</div>
              {!recent ? (
                <p className="mt-3 text-sm text-parchment-400">Loading…</p>
              ) : recent.length === 0 ? (
                <p className="mt-3 text-sm text-parchment-400">No finished games yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-white/5">
                  {recent.map((game) => (
                    <RecentGameRow key={game.id} game={game} />
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Who's here right now, same source as the lobby. */}
          <aside className="plate p-5 h-fit">
            <div className="font-display text-xl text-parchment">Online now</div>
            {!lobby ? (
              <p className="mt-3 text-sm text-parchment-400">Loading…</p>
            ) : lobby.players.length === 0 ? (
              <p className="mt-3 text-sm text-parchment-400">
                No signed-in players right now
                {lobby.anonymous > 0
                  ? `, but ${lobby.anonymous} anonymous player${lobby.anonymous === 1 ? " is" : "s are"} around.`
                  : "."}
              </p>
            ) : (
              <>
                <ul className="mt-3 space-y-2">
                  {lobby.players.map((player) => (
                    <li key={player.name} className="flex items-center justify-between gap-2 text-sm">
                      <Link
                        href={`/u/${encodeURIComponent(player.name)}`}
                        className="flex min-w-0 items-center gap-2 truncate text-parchment-100 hover:text-gold-leaf transition-colors"
                      >
                        <PlayerAvatar name={player.name} avatar={player.avatar} size={22} />
                        {player.name}
                        {player.rating != null && (
                          <span className="ml-1.5 font-mono text-xs text-parchment-400">{player.rating}</span>
                        )}
                      </Link>
                      <OnlineStatusBadge status={player.status} />
                    </li>
                  ))}
                </ul>
                {lobby.anonymous > 0 && (
                  <p className="mt-3 text-xs text-parchment-400">
                    + {lobby.anonymous} anonymous player{lobby.anonymous === 1 ? "" : "s"}
                  </p>
                )}
              </>
            )}
            <p className="mt-4 border-t border-white/10 pt-3 text-xs text-parchment-400">
              Looking for a game?{" "}
              <Link href="/lobby" className="text-gold-leaf hover:underline">
                Head to the lobby
              </Link>
              .
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}

function PlayerLine({
  rank,
  username,
  avatar,
  guest,
  right,
}: {
  rank: number;
  username: string;
  avatar?: string | null;
  guest?: boolean;
  right: React.ReactNode;
}) {
  const body = (
    <>
      <span className="w-6 shrink-0 font-mono text-xs tabular-nums text-parchment-400">{rank}</span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <PlayerAvatar name={username} avatar={avatar} size={24} />
        <span className="truncate font-medium text-parchment-100">{username}</span>
        {guest && (
          <span className="shrink-0 border border-white/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-parchment-400">
            guest
          </span>
        )}
      </span>
      {right}
    </>
  );
  const rowClass = "flex items-center gap-2 py-2";
  if (guest) return <div className={`${rowClass} px-2 -mx-2`}>{body}</div>;
  return (
    <Link
      href={`/u/${encodeURIComponent(username)}`}
      className={`${rowClass} group cursor-pointer rounded-[10px] px-2 -mx-2 transition hover:bg-white/[0.05]`}
    >
      {body}
      <ChevronRight
        size={14}
        className="shrink-0 text-parchment-500 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
        aria-hidden
      />
    </Link>
  );
}

function RecentGameRow({ game }: { game: RecentGame }) {
  const category = getCategory(isRatingCategoryId(game.category) ? game.category : DEFAULT_CATEGORY);
  const Icon = category.icon;
  return (
    <li>
      <Link
        href={`/game/${game.id}`}
        className="group flex cursor-pointer items-center justify-between gap-3 rounded-[10px] px-2 -mx-2 py-2.5 transition hover:bg-white/[0.05]"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm text-parchment-100">
            {game.whiteName} <span className="text-parchment-400">vs</span> {game.blackName}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 smallcaps text-[9px] text-parchment-400">
            <Icon size={11} style={{ color: category.accent }} aria-hidden />
            {category.label} · {game.rated ? "Rated" : "Casual"} · {timeAgo(game.completedAt)}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 font-mono text-sm tabular-nums text-parchment-200">
          {resultLabel(game.winner)}
          <ChevronRight
            size={14}
            className="text-parchment-500 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
            aria-hidden
          />
        </span>
      </Link>
    </li>
  );
}

function OnlineStatusBadge({ status }: { status: "online" | "searching" | "playing" }) {
  const styles: Record<string, string> = {
    online: "border-verdigris/40 bg-verdigris/10 text-verdigris-glow",
    searching: "border-gold/40 bg-gold/10 text-gold-leaf",
    playing: "border-bruise/40 bg-bruise/10 text-bruise-glow",
  };
  const labels: Record<string, string> = {
    online: "Online",
    searching: "Searching",
    playing: "In game",
  };
  return (
    <span className={`shrink-0 border px-2 py-0.5 smallcaps text-[9px] ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
