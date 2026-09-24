"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, Eye, Swords, Trophy, Tv, Users } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { ClubIcon } from "@/components/ClubIcon";
import { ModeBadge } from "@/components/ModeBadge";
import { useLobbySnapshot } from "@/lib/lobbyClient";
import { useSession } from "@/lib/session/SessionProvider";
import { DEFAULT_CATEGORY, getCategory, isRatingCategoryId } from "@/lib/ratingCategories";
import { isProvisionalRd } from "@/lib/ratingDisplay";
import { countdownLabel, modeLabel } from "@/lib/tournaments";
import type { MPLobbyGame } from "@/lib/multiplayer";
import { Button } from "@/components/ui/Button";
import { useSkeletonHold } from "@/components/ui/useSkeletonHold";
import { LinkButton } from "@/components/ui/Button";

// The community hub: friends who are around, who you have just played, the
// latest games, and the doors to clubs, tournaments, and the ladder. Every
// section is drawn only when its data source exists, so nothing is faked.

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

export interface RecentGame {
  id: string;
  whiteName: string;
  blackName: string;
  winner: "w" | "b" | "draw" | null;
  reason: string;
  rated: boolean;
  category: string;
  completedAt: number;
}

interface Club {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string | null;
  owner_name: string;
  members: number;
  joined: number;
}

interface Tournament {
  id: string;
  name: string;
  mode: string;
  players: number;
  starts_at: number | null;
  phase: "upcoming" | "ongoing" | "finished";
}

interface Friend {
  id: string;
  username: string;
  rating: number | null;
  avatar: string | null;
}

interface OpponentGame {
  id: string;
  white_name: string;
  black_name: string;
  white_user_id: string | null;
  black_user_id: string | null;
  completed_at: number;
}

interface Opponent {
  username: string;
  gameId: string;
  at: number;
}

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

// Module-level so the clock read is not an impure call inside a component's
// render (matches timeAgo above).
function startsInLabel(startsAt: number): string {
  return countdownLabel(startsAt - Date.now());
}

// The page shell (page.tsx) renders on the server and hands in the first
// page of Recent games, so that list paints at its final length (wave 2
// review). Null means the server read failed or ran long, and the list then
// loads here like the other panels.
export default function CommunityClient({ initialRecent }: { initialRecent: RecentGame[] | null }) {
  // Who is looking, from the shared session (F014): the server hint decides
  // the guest nudge and the Friends card on the first paint instead of both
  // appearing once a page-level /me answers. The account id (for picking the
  // opponent out of each game) comes from the full user when it lands.
  const { user: me, display } = useSession();
  const signedIn = !!display && !display.isGuest;
  const [top, setTop] = useState<TopPlayer[] | null>(null);
  const [active, setActive] = useState<ActivePlayer[] | null>(null);
  const [recent, setRecent] = useState<RecentGame[] | null>(initialRecent);
  // Read once on mount: the server's list stands, so the mount load skips it.
  const serverRecent = useRef(initialRecent !== null);
  const [clubs, setClubs] = useState<Club[] | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[] | null>(null);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [opponents, setOpponents] = useState<Opponent[] | null>(null);
  // Per-panel error flags. A settled fetch clears its flag; a failed one raises
  // it so the panel renders the section 8.3 error state (plain sentence + Retry)
  // instead of sitting on its skeleton forever.
  const [err, setErr] = useState<Record<string, boolean>>({});
  const lobby = useLobbySnapshot();

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // One loader per data source. Clears any prior error, drops the panel back to
  // its skeleton, then resolves to data (or raises the panel's error flag).
  // Retry buttons call the same loader, so a recovered network fills the panel.
  const runLoad = useCallback(
    <T,>(key: string, url: string, set: (v: T | null) => void, pick: (raw: unknown) => T) => {
      setErr((e) => (e[key] ? { ...e, [key]: false } : e));
      set(null);
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`${key} ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (mountedRef.current) set(pick(data));
        })
        .catch(() => {
          if (mountedRef.current) setErr((e) => ({ ...e, [key]: true }));
        });
    },
    [],
  );

  const loadTop = useCallback(
    () => runLoad<TopPlayer[]>("top", `/api/leaderboard?category=${DEFAULT_CATEGORY}`, setTop, (d) => (d as { players: TopPlayer[] }).players),
    [runLoad],
  );
  const loadActive = useCallback(
    () => runLoad<ActivePlayer[]>("active", "/api/community/active", setActive, (d) => (d as { players: ActivePlayer[] }).players),
    [runLoad],
  );
  const loadRecent = useCallback(
    () => runLoad<RecentGame[]>("recent", "/api/community/recent", setRecent, (d) => (d as { games: RecentGame[] }).games),
    [runLoad],
  );
  const loadClubs = useCallback(
    () => runLoad<Club[]>("clubs", "/api/clubs", setClubs, (d) => (d as { clubs: Club[] }).clubs),
    [runLoad],
  );
  const loadTournaments = useCallback(
    () => runLoad<Tournament[]>("tournaments", "/api/tournaments", setTournaments, (d) => (d as { tournaments: Tournament[] }).tournaments),
    [runLoad],
  );
  const loadFriends = useCallback(
    () => runLoad<Friend[]>("friends", "/api/friends", setFriends, (d) => (d as { friends: Friend[] }).friends),
    [runLoad],
  );

  useEffect(() => {
    let cancelled = false;
    // Deferred a microtask so each loader's synchronous reset (clear error, drop
    // to skeleton) runs after mount rather than cascading during the effect.
    queueMicrotask(() => {
      if (cancelled) return;
      loadTop();
      loadActive();
      if (!serverRecent.current) loadRecent();
      loadClubs();
      loadTournaments();
    });

    return () => {
      cancelled = true;
    };
  }, [loadTop, loadActive, loadRecent, loadClubs, loadTournaments]);

  // Friends load as soon as the session says a real account is here.
  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) loadFriends();
    });
    return () => {
      cancelled = true;
    };
  }, [signedIn, loadFriends]);

  // Recent opponents need the account id, so they wait for the full user.
  const meId = me && !me.isGuest ? me.id : null;
  const meName = me && !me.isGuest ? me.username : null;
  useEffect(() => {
    if (!meId || !meName) return;
    let cancelled = false;
    fetch(`/api/users/${encodeURIComponent(meName)}/games?limit=20`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const games = (data as { games: OpponentGame[] }).games ?? [];
        const seen = new Set<string>();
        const list: Opponent[] = [];
        for (const g of games) {
          const iAmWhite: boolean = g.white_user_id === meId;
          const oppName = iAmWhite ? g.black_name : g.white_name;
          const oppId: string | null = iAmWhite ? g.black_user_id : g.white_user_id;
          const key = oppName.toLowerCase();
          // Only real accounts (they have a profile); skip anonymous seats and
          // any accidental self-match.
          if (!oppId || oppId === meId || seen.has(key)) continue;
          seen.add(key);
          list.push({ username: oppName, gameId: g.id, at: g.completed_at });
          if (list.length >= 6) break;
        }
        setOpponents(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [meId, meName]);

  const onlineCount = lobby ? lobby.players.length + lobby.anonymous : null;
  const topBoard = getCategory(DEFAULT_CATEGORY);

  // Cross-reference friends with the live lobby snapshot for presence and a
  // Watch link when they are in a game right now.
  const lobbyStatus = new Map(lobby?.players.map((p) => [p.name.toLowerCase(), p.status]) ?? []);
  const lobbyGame = new Map<string, MPLobbyGame>();
  for (const g of lobby?.games ?? []) {
    lobbyGame.set(g.players.w.name.toLowerCase(), g);
    lobbyGame.set(g.players.b.name.toLowerCase(), g);
  }
  const rankPresence = (name: string): number => {
    const s = lobbyStatus.get(name.toLowerCase());
    return s === "playing" ? 0 : s === "searching" ? 1 : s === "online" ? 2 : 3;
  };
  const sortedFriends = friends
    ? [...friends].sort((a, b) => rankPresence(a.username) - rankPresence(b.username))
    : null;
  // Each list keeps its skeleton a minimum time once it has shown, so a list
  // that lands just after the show-delay does not pop (brief section 5.2).
  const hold = {
    friends: useSkeletonHold(!friends && !err.friends),
    recent: useSkeletonHold(!recent && !err.recent),
    top: useSkeletonHold(!top && !err.top),
    clubs: useSkeletonHold(!clubs && !err.clubs),
    active: useSkeletonHold(!active && !err.active),
    tournaments: useSkeletonHold(!tournaments && !err.tournaments),
  };

  return (
    <main className="min-h-screen pb-16">
      <SiteHeader active="/community" />

      <section className="mx-auto max-w-5xl px-5 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="page-title">Community</h1>
          {/* One status pill, same border-chip treatment the lobby uses. */}
          {/* Not a live region (F135): the count changes on every lobby
              poll, and a screen reader would read each change out. */}
          <span
            className="flex items-center gap-2 border border-[color:var(--edge)] bg-[color:var(--bg-zebra)] px-3 py-1.5 text-xs text-parchment-300"
          >
            <span
              aria-hidden
              className={
                "h-1.5 w-1.5 shrink-0 rounded-full " +
                (onlineCount === null ? "bg-parchment-500" : "bg-verdigris motion-safe:animate-flicker")
              }
            />
            {/* The text sits in one grid cell with an invisible sizer, so the
                pill keeps its width when the count replaces the loading line
                (wave 2). It used to shrink from "Connecting to the lobby…"
                to "N players online"; on a phone that let it rejoin the h1's
                row and lifted the whole page 37px (CLS 0.13 alone). */}
            <span className="grid tabular-nums">
              <span className="col-start-1 row-start-1">
                {onlineCount === null
                  ? "Counting players…"
                  : `${onlineCount} player${onlineCount === 1 ? "" : "s"} online`}
              </span>
              <span aria-hidden className="invisible col-start-1 row-start-1">
                888 players online
              </span>
            </span>
          </span>
        </div>

        {/* Guests: a compact sign-in nudge, then straight to the live content. */}
        {display !== undefined && !signedIn && (
          <div className="mt-5 plate flex flex-col gap-3 border-gold/25 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-parchment-200">
              Sign in to add friends, join clubs, and track who you have played.
            </p>
            <LinkButton tone="leaf" href="/login" className="shrink-0 px-4 py-2 text-sm font-semibold">
              Sign in
            </LinkButton>
          </div>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Main column: your people and the latest games. */}
          <div className="min-w-0 space-y-4">
            {/* Session not known yet (a session cookie without the display
                hint, e.g. one from before the hint existed): hold the Friends
                card's place, since a session is most often an account. Without
                it the card entered once /me answered and pushed Recent games
                and the rail down 209px on a phone. */}
            {display === undefined && <FriendsCardSkeleton />}
            {signedIn && (
              <SectionCard title="Friends" icon={<Users size={16} />} tint="mint">
                <ListReserve slots="friends">
                {err.friends ? (
                  <SectionError onRetry={loadFriends} />
                ) : !sortedFriends || hold.friends ? (
                  <ListSkeleton slots="friends" />
                ) : sortedFriends.length === 0 ? (
                  <InlineEmpty
                    title="No friends yet"
                    body="Add players from their profile to see when they are online and watch their live games."
                    action={{ href: "/leaderboard", label: "Find players" }}
                  />
                ) : (
                  <ul className="mt-1 divide-y divide-[color:var(--edge)]">
                    {sortedFriends.map((friend) => {
                      const status = lobbyStatus.get(friend.username.toLowerCase());
                      const game = status === "playing" ? lobbyGame.get(friend.username.toLowerCase()) : undefined;
                      return (
                        <li key={friend.id} className="flex min-h-[44px] items-center gap-2 py-2">
                          <PresenceDot status={status} />
                          <Link
                            href={`/u/${encodeURIComponent(friend.username)}`}
                            className="flex min-w-0 flex-1 items-center gap-2 text-parchment-100 transition-colors hover:text-gold-leaf"
                          >
                            <PlayerAvatar name={friend.username} avatar={friend.avatar} size={26} />
                            <span className="truncate font-medium">{friend.username}</span>
                            {friend.rating != null && (
                              <span className="font-mono text-xs tabular-nums text-parchment-400">{friend.rating}</span>
                            )}
                          </Link>
                          {game ? (
                            <LinkButton tone="ghost"
                              href={`/game/${game.id}${game.origin === "arena" ? "?src=arena" : ""}`}
                              className="shrink-0 px-3 py-1.5 text-[13px]">
                              <Eye size={13} aria-hidden />
                              Watch
                            </LinkButton>
                          ) : (
                            <span className="shrink-0 text-xs text-parchment-500">{presenceLabel(status)}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                </ListReserve>
              </SectionCard>
            )}

            {/* Recent games: the latest finished games, each opening its replay. */}
            <SectionCard title="Recent games" icon={<Tv size={16} />} tint="coral">
              <ListReserve slots="recent">
              {err.recent ? (
                <SectionError onRetry={loadRecent} />
              ) : !recent || hold.recent ? (
                <ListSkeleton slots="recent" />
              ) : recent.length === 0 ? (
                <InlineEmpty
                  title="No finished games yet"
                  body="Completed games land here the moment they end. Play one to break the ice."
                  action={{ href: "/lobby", label: "Find a match" }}
                />
              ) : (
                <ul className="mt-1 divide-y divide-[color:var(--edge)]">
                  {recent.map((game) => (
                    <RecentGameRow key={game.id} game={game} />
                  ))}
                </ul>
              )}
              </ListReserve>
            </SectionCard>
            {/* Last in the column (wave 2): it needs the full user and then a
                games fetch, so it lands seconds after everything else. Above
                Recent games its arrival pushed that card down. */}
            {signedIn && opponents && opponents.length > 0 && (
              <SectionCard title="Recent opponents" icon={<Swords size={16} />} tint="coral">
                <ul className="mt-1 divide-y divide-[color:var(--edge)]">
                  {opponents.map((opp) => (
                    <li key={opp.username}>
                      <Link
                        href={`/u/${encodeURIComponent(opp.username)}`}
                        className="group flex min-h-[44px] items-center gap-2 py-2 transition-colors hover:text-gold-leaf"
                      >
                        <PlayerAvatar name={opp.username} avatar={null} size={26} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 truncate font-medium text-parchment-100 group-hover:text-gold-leaf">
                            {opp.username}
                          </span>
                          <span className="mt-0.5 block text-xs text-parchment-400">Last played {timeAgo(opp.at)}</span>
                        </span>
                        {/* The row opens the profile, so it says so (F169);
                            challenging happens from there. */}
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-parchment-300 group-hover:text-gold-leaf">
                          View profile
                          <ChevronRight size={13} aria-hidden />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
          </div>

          {/* Rail: doors to the wider community. */}
          <aside className="space-y-4">
            <RailCard
              title="Top players"
              icon={<Trophy size={15} />}
              action={{ href: "/leaderboard", label: "Full board" }}
            >
              <ListReserve slots="rank">
              {err.top ? (
                <RailError onRetry={loadTop} />
              ) : !top || hold.top ? (
                <ListSkeleton slots="rank" />
              ) : top.length === 0 ? (
                <EmptyRail>
                  No {topBoard.label} ratings yet.{" "}
                  <Link href="/lobby" className="text-gold-leaf underline underline-offset-2">
                    Play a rated game
                  </Link>
                  .
                </EmptyRail>
              ) : (
                <ol className="mt-1 space-y-0.5">
                  {top.slice(0, 5).map((player, i) => (
                    <li key={player.guest ? `guest:${player.username}` : player.username}>
                      <Link
                        href={`/u/${encodeURIComponent(player.username)}`}
                        className="flex min-h-[40px] items-center gap-2 px-2 -mx-2 transition hover:bg-[var(--surface-hover)]"
                      >
                        <span className="w-4 shrink-0 font-mono text-xs tabular-nums text-parchment-400">{i + 1}</span>
                        <PlayerAvatar name={player.username} avatar={player.avatar} size={22} />
                        <span className="min-w-0 flex-1 truncate text-sm text-parchment-100">{player.username}</span>
                        <span className="shrink-0 font-mono text-sm tabular-nums text-parchment-200">
                          {Math.round(player.rating)}
                          {isProvisionalRd(player.rd) && <span className="text-parchment-400">?</span>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
              </ListReserve>
            </RailCard>

            <RailCard title="Clubs" icon={<Users size={15} />} action={{ href: "/clubs", label: "All clubs" }}>
              <ListReserve slots="clubs">
              {err.clubs ? (
                <RailError onRetry={loadClubs} />
              ) : !clubs || hold.clubs ? (
                <ListSkeleton slots="clubs" />
              ) : clubs.length === 0 ? (
                <EmptyRail>
                  No clubs yet.{" "}
                  <Link href="/clubs" className="text-gold-leaf underline underline-offset-2">
                    Start one
                  </Link>
                  .
                </EmptyRail>
              ) : (
                <ul className="mt-1 space-y-0.5">
                  {clubs.slice(0, 5).map((club) => (
                    <li key={club.id}>
                      <Link
                        href={`/clubs/${club.slug}`}
                        className="flex min-h-[44px] items-center gap-2.5 px-2 -mx-2 transition hover:bg-[var(--surface-hover)]"
                      >
                        <ClubIcon icon={club.icon} name={club.name} size={30} />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-parchment-100">
                          {club.name}
                        </span>
                        <span className="shrink-0 font-mono text-xs tabular-nums text-parchment-400">
                          {club.members} {club.members === 1 ? "member" : "members"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              </ListReserve>
            </RailCard>

            <RailCard
              title="Tournaments"
              icon={<Trophy size={15} />}
              action={{ href: "/tournaments", label: "All events" }}
            >
              <ListReserve slots="events">
                <TournamentRail tournaments={tournaments} held={hold.tournaments} error={!!err.tournaments} onRetry={loadTournaments} />
              </ListReserve>
            </RailCard>

            <RailCard title="Active this week" icon={<Swords size={15} />}>
              <ListReserve slots="rank">
              {err.active ? (
                <RailError onRetry={loadActive} />
              ) : !active || hold.active ? (
                <ListSkeleton slots="rank" />
              ) : active.length === 0 ? (
                <EmptyRail>No games in the last 7 days. Be the first.</EmptyRail>
              ) : (
                <ol className="mt-1 space-y-0.5">
                  {active.slice(0, 5).map((player, i) => (
                    <li key={player.username}>
                      <Link
                        href={`/u/${encodeURIComponent(player.username)}`}
                        className="flex min-h-[40px] items-center gap-2 px-2 -mx-2 transition hover:bg-[var(--surface-hover)]"
                      >
                        <span className="w-4 shrink-0 font-mono text-xs tabular-nums text-parchment-400">{i + 1}</span>
                        <PlayerAvatar name={player.username} avatar={player.avatar} size={22} />
                        <span className="min-w-0 flex-1 truncate text-sm text-parchment-100">{player.username}</span>
                        <span className="shrink-0 font-mono text-xs tabular-nums text-parchment-400">
                          {player.games} {player.games === 1 ? "game" : "games"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
              </ListReserve>
            </RailCard>
          </aside>
        </div>
      </section>
    </main>
  );
}

const SECTION_TINTS = {
  mint: "border-mint/30 bg-mint/10 text-mint-glow",
  sun: "border-sun/30 bg-sun/10 text-brag",
  coral: "border-coral/30 bg-coral/10 text-coral-glow",
} as const;

function SectionCard({
  title,
  icon,
  tint,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  tint: keyof typeof SECTION_TINTS;
  children: React.ReactNode;
}) {
  return (
    <div className="plate p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center border ${SECTION_TINTS[tint]}`}>
          {icon}
        </span>
        <h2 className="font-display text-xl text-parchment">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// The Friends card in its loading geometry (same plate, header row and list
// reserve), unlabelled because the visitor may still turn out to be a guest.
function FriendsCardSkeleton() {
  return (
    <div className="plate p-4 sm:p-5" aria-hidden>
      <div className="flex items-center gap-2.5">
        <span className="skeleton h-8 w-8 shrink-0" />
        <span className="skeleton h-5 w-24" />
      </div>
      <ListReserve slots="friends">
        <ListSkeleton slots="friends" />
      </ListReserve>
    </div>
  );
}

function RailCard({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="rail-panel p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-parchment-400">
            {icon}
          </span>
          <h2 className="font-display text-base text-parchment">{title}</h2>
        </div>
        {action && (
          <Link
            href={action.href}
            // The section "more" link. Same shape the home page and HeroTv
            // already carry: a 44px hit area on a finger, given back to the
            // layout with -my-2 so the header row keeps its height, and stepped
            // down behind `(pointer: fine)`, never `sm:`, since a 1024px
            // tablet is a coarse pointer. It measured 19.5px tall before.
            className="-my-2 inline-flex min-h-[44px] items-center gap-0.5 text-[13px] text-parchment-400 transition-colors hover:text-gold-leaf [@media(pointer:fine)]:my-0 [@media(pointer:fine)]:min-h-0"
          >
            {action.label}
            <ChevronRight size={12} aria-hidden />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function TournamentRail({
  tournaments,
  held,
  error,
  onRetry,
}: {
  tournaments: Tournament[] | null;
  held: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  if (error) return <RailError onRetry={onRetry} />;
  if (!tournaments || held) return <ListSkeleton slots="events" />;
  const live = tournaments
    .filter((t) => t.phase !== "finished")
    .sort((a, b) => {
      if (a.phase !== b.phase) return a.phase === "ongoing" ? -1 : 1;
      return (a.starts_at ?? Infinity) - (b.starts_at ?? Infinity);
    })
    .slice(0, 4);
  if (live.length === 0) {
    return (
      <EmptyRail>
        No upcoming events.{" "}
        <Link href="/tournaments" className="text-gold-leaf underline underline-offset-2">
          Host one
        </Link>
        .
      </EmptyRail>
    );
  }
  return (
    <ul className="mt-1 space-y-0.5">
      {live.map((t) => (
        <li key={t.id}>
          <Link
            href={`/tournaments/${t.id}`}
            className="flex min-h-[44px] items-center gap-2 px-2 -mx-2 transition hover:bg-[var(--surface-hover)]"
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium text-parchment-100">{t.name}</span>
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-sm text-parchment-400">
                <ModeBadge mode={t.mode === "nerf" || t.mode === "buff" ? t.mode : undefined} compact />
                {modeLabel(t.mode)} · {t.players} entered
              </span>
            </span>
            {t.phase === "ongoing" ? (
              <span className="inline-flex shrink-0 items-center gap-1 border border-verdigris/40 bg-verdigris/10 px-1.5 py-0.5 text-xs text-verdigris-glow">
                <span className="h-1.5 w-1.5 rounded-full bg-verdigris-glow" aria-hidden />
                Live
              </span>
            ) : t.starts_at != null ? (
              <span className="shrink-0 font-mono text-xs tabular-nums text-parchment-400">
                in {startsInLabel(t.starts_at)}
              </span>
            ) : (
              <span className="shrink-0 text-xs text-parchment-400">Soon</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function RecentGameRow({ game }: { game: RecentGame }) {
  const category = getCategory(isRatingCategoryId(game.category) ? game.category : DEFAULT_CATEGORY);
  const Icon = category.icon;
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <span className="min-w-0">
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-parchment-100">
          <PlayerNameInline name={game.whiteName} />
          <span className="text-parchment-400">vs</span>
          <PlayerNameInline name={game.blackName} />
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-parchment-400">
          <Icon size={12} style={{ color: category.accent }} aria-hidden />
          {category.label} · {game.rated ? "Rated" : "Casual"} ·{" "}
          {/* Server-rendered rows: the age can tick over between the server's
              clock and hydration, so the label may differ by a second. */}
          <span suppressHydrationWarning>{timeAgo(game.completedAt)}</span>
        </span>
      </span>
      <Link
        href={`/game/${game.id}`}
        aria-label={`Replay ${game.whiteName} versus ${game.blackName}`}
        className="group -my-2 inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-end gap-1.5 font-mono text-sm tabular-nums text-parchment-200 transition-colors hover:text-gold-leaf [@media(pointer:fine)]:my-0 [@media(pointer:fine)]:min-h-0 [@media(pointer:fine)]:min-w-0"
      >
        {resultLabel(game.winner)}
        <ChevronRight
          size={14}
          className="text-parchment-400 transition-transform group-hover:translate-x-0.5 group-hover:text-gold-leaf"
          aria-hidden
        />
      </Link>
    </li>
  );
}

function PlayerNameInline({ name }: { name: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <Link href={`/u/${encodeURIComponent(name)}`} className="truncate hover:text-gold-leaf">
        {name}
      </Link>
    </span>
  );
}

function PresenceDot({ status }: { status?: "online" | "searching" | "playing" }) {
  const cls =
    status === "playing"
      ? "bg-coral"
      : status === "searching"
        ? "bg-sun"
        : status === "online"
          ? "bg-verdigris"
          : "bg-parchment-500";
  return <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${cls}`} />;
}

function presenceLabel(status?: "online" | "searching" | "playing"): string {
  if (status === "searching") return "Searching";
  if (status === "online") return "Online";
  return "Offline";
}

// A section-level empty state: one sentence and one action, sized to content
// (design system section 8), sitting flush inside its card without a nested plate.
function InlineEmpty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: { href: string; label: string };
}) {
  return (
    <div className="mt-2 flex flex-col items-start gap-2.5 py-4">
      <p className="text-sm leading-relaxed text-parchment-300">
        <span className="font-medium text-parchment-100">{title}.</span> {body}
      </p>
      <LinkButton tone="ghost" href={action.href} className="px-3 py-1.5 text-sm">
        {action.label}
      </LinkButton>
    </div>
  );
}

// Centred in the list's reserved height (ListReserve), so an empty rail reads
// as an empty panel rather than a line with a gap under it.
function EmptyRail({ children }: { children: React.ReactNode }) {
  return <p className="my-auto py-2 text-center text-sm text-parchment-400">{children}</p>;
}

// Section-level error (design system 8.3): what failed in plain words, a Retry,
// and a way out. The page's nav and its other panels remain the way out, and a
// Back to lobby link makes it explicit for this larger region.
function SectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="mt-2 flex flex-col items-start gap-2.5 py-4">
      <p className="text-sm leading-relaxed text-parchment-300">
        This section could not load right now.
      </p>
      <div className="flex items-center gap-2">
        <Button tone="ghost" onClick={onRetry} className="px-3 py-1.5 text-sm">
          Retry
        </Button>
        <Link href="/lobby" className="text-sm text-parchment-400 transition-colors hover:text-gold-leaf">
          Back to lobby
        </Link>
      </div>
    </div>
  );
}

// Compact error for a rail panel: one line plus a Retry. The surrounding page
// keeps its own way out (nav and the other panels), so the rail stays tight.
function RailError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="my-auto flex flex-col items-center gap-2 py-2 text-center">
      <p className="text-sm text-parchment-400">Could not load this list.</p>
      <Button tone="ghost" onClick={onRetry} className="px-3 py-1 text-[13px]">
        Retry
      </Button>
    </div>
  );
}

// Loading geometry (wave 2). Each list's skeleton is drawn at its loaded
// geometry: the same top margin, row height, row gap and row count as the
// list it stands in for, so a full list replaces it in place. A list's body
// also keeps that height as a floor (ListReserve), so a shorter list, the
// one-line empty state or the error line leaves the panel the same height
// instead of pulling up every panel below it. Before this the skeletons were
// 32px rows on an 8px gap (3, 4 or 5 of them, not the list's count), and
// the rail panels moved by up to 154px when their data landed.
//
// Row heights are the lists' own: ranked rails (top players, active) are
// min-h-[40px] rows on space-y-0.5, club and event rails min-h-[44px] rows,
// the Friends list 44px rows on 1px dividers, Recent games 2-line rows.
const LIST_SLOTS = {
  // Top players and Active this week: up to 5 rows of 40px.
  rank: {
    rows: 5,
    list: "mt-1 space-y-0.5",
    row: "h-[40px]",
    reserve: "min-h-[calc(0.25rem_+_5_*_40px_+_4_*_0.125rem)]",
  },
  // Clubs: up to 5 rows of 44px.
  clubs: {
    rows: 5,
    list: "mt-1 space-y-0.5",
    row: "h-[44px]",
    reserve: "min-h-[calc(0.25rem_+_5_*_44px_+_4_*_0.125rem)]",
  },
  // Tournaments: up to 4 rows of 44px.
  events: {
    rows: 4,
    list: "mt-1 space-y-0.5",
    row: "h-[44px]",
    reserve: "min-h-[calc(0.25rem_+_4_*_44px_+_3_*_0.125rem)]",
  },
  // Friends: the first 3 rows of 44px on 1px dividers.
  friends: {
    rows: 3,
    list: "mt-1 space-y-px",
    row: "h-[44px]",
    reserve: "min-h-[calc(0.25rem_+_3_*_44px_+_2px)]",
  },
  // Recent games: the feed's full page (/api/community/recent returns 12) of
  // two-line rows (py-2.5, a 1.25rem and a 1rem line with mt-0.5 between:
  // 3.625rem) on 1px dividers. The first page normally arrives server-rendered
  // (page.tsx), so this skeleton only shows on Retry or when the server read
  // failed. No floor: a 12-row floor would leave a 700px blank card under a
  // short feed.
  recent: {
    rows: 12,
    list: "mt-1 space-y-px",
    row: "h-[3.625rem]",
    reserve: "",
  },
} as const;

function ListSkeleton({ slots }: { slots: keyof typeof LIST_SLOTS }) {
  const g = LIST_SLOTS[slots];
  return (
    <div className={g.list} aria-hidden>
      {Array.from({ length: g.rows }).map((_, i) => (
        <div key={i} className={`skeleton ${g.row}`} />
      ))}
    </div>
  );
}

function ListReserve({ slots, children }: { slots: keyof typeof LIST_SLOTS; children: React.ReactNode }) {
  return <div className={`flex flex-col ${LIST_SLOTS[slots].reserve}`}>{children}</div>;
}
