"use client";

import { SiteHeader } from "@/components/SiteHeader";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Cpu, Eye, Swords, Users } from "lucide-react";
import { QuickMatch } from "./QuickMatch";
import { AccountUser, ensureAccount, fetchMe } from "@/lib/authClient";
import { fetchLobbySnapshot } from "@/lib/lobbyClient";
import { readSnapshot, writeSnapshot } from "@/lib/snapshotCache";
import { MPLobby, MPLobbyChallenge, MPLobbyGame, MPLobbySeek, MPSession, saveOnlineSeat } from "@/lib/multiplayer";
import { ModeBadge } from "@/components/ModeBadge";
import { FriendGameProvider, FriendGameSetup, useFriendGame } from "@/components/FriendGame";
import { FriendsPanel } from "@/components/FriendsPanel";
import { StarField } from "@/components/StarField";
import { categoryForTimeControl, getCategory } from "@/lib/ratingCategories";
import { EngravedLabel } from "@/components/dungeon/primitives";
import "@/components/dungeon/dungeon-lobby.css";

// The lobby: the central place to find a game, styled to match the home
// page's dark starry identity. The shared StarField drifts behind flat solid
// ink panels with hairline borders; each row wears its mode color as a plain
// left border — no gradients, washes, or glows. Same data, same handlers,
// same navigation as before — only the presentation changed.
// The four lobby tabs. Quick Play is the default: mode, clock, one button.
const LOBBY_TABS = [
  { id: "quick", label: "Quick Play" },
  { id: "challenges", label: "Challenges" },
  { id: "watch", label: "Watch" },
  { id: "friends", label: "Friends" },
] as const;
type LobbyTab = (typeof LOBBY_TABS)[number]["id"];

// The Online-now sidebar starts folded to this many rows so it never
// competes with matchmaking; "View all N players" unfolds the full list.
const ONLINE_LIST_FOLD = 8;

// The right-rail "Games to watch" panel shows a handful of live boards; the
// full directory lives in the Watch tab.
const WATCH_RAIL_FOLD = 4;

// The lobby is wrapped in FriendGameProvider so the Friends tab can host the
// full "Play a Friend" flow (create + share code, wait for a friend, join by
// code) without leaving /lobby. While a friend game is being created, joined,
// or played, the provider takes over the screen; otherwise it renders the
// lobby below.
export default function LobbyPage() {
  return (
    <FriendGameProvider>
      <LobbyInner />
    </FriendGameProvider>
  );
}

function LobbyInner() {
  const router = useRouter();
  const [user, setUser] = useState<AccountUser | null | undefined>(undefined);
  const [lobby, setLobby] = useState<MPLobby | null>(null);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [tab, setTab] = useState<LobbyTab>("quick");
  // Bumped by a Retry to force an immediate re-poll of the lobby snapshot.
  const [reloadKey, setReloadKey] = useState(0);
  // Mode filters for the Challenges and Watch tabs.
  const [challengeFilter, setChallengeFilter] = useState<"all" | "nerf" | "buff">("all");
  const [watchFilter, setWatchFilter] = useState<"all" | "nerf" | "buff">("all");
  const [showAllPlayers, setShowAllPlayers] = useState(false);

  // A ?tab= query param deep-links a section (e.g. /lobby?tab=watch).
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const wanted = new URLSearchParams(window.location.search).get("tab");
        if (wanted && LOBBY_TABS.some((t) => t.id === wanted)) setTab(wanted as LobbyTab);
      } catch {}
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((me) => {
      if (!cancelled) setUser(me);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Opening the lobby is real engagement: mint a guest account right away
  // (ensureAccount no-ops for signed-in users and dedupes per page load) so
  // engaged visitors show up in the moderators' guest counts instead of being
  // invisible until they join a seek. Fire-and-forget and non-blocking: the
  // lobby renders identically whether or not this ever resolves.
  useEffect(() => {
    void ensureAccount().catch(() => {});
  }, []);

  // Poll the lobby snapshot over the edge-cached HTTP route (no socket). The
  // socket is created on demand only when the player acts (queue / answer a
  // seek / host a challenge), each of which already reconnects.
  useEffect(() => {
    let cancelled = false;
    // Instant paint: the last snapshot this tab saw renders immediately
    // (seeks/games a few seconds stale), and the first live poll replaces it.
    const cached = readSnapshot<MPLobby>("nerfchess:lobby-snapshot");
    // Deferred a microtask so the paint happens after mount (no hydration
    // mismatch) but still before the first poll resolves — effectively instant.
    if (cached) queueMicrotask(() => setLobby(cached));
    // The snapshot is served from an edge cache in front of the single-threaded
    // Durable Object, so a poll can occasionally arrive late. Keep showing the
    // last good snapshot (the catch below never clears `lobby`) and only surface
    // the error state after two misses in a row, so a one-off blip doesn't flap
    // "can't reach the game server" at the player while still resolving the
    // rails out of their skeleton quickly (well under the six-second budget) when
    // the server is genuinely unreachable.
    let failures = 0;
    const poll = async () => {
      try {
        const data = await fetchLobbySnapshot();
        if (!cancelled) {
          failures = 0;
          setLobby(data);
          setLobbyError(null);
          writeSnapshot("nerfchess:lobby-snapshot", data);
        }
      } catch {
        if (!cancelled) {
          failures++;
          if (failures >= 2) setLobbyError("Can't reach the game server right now.");
        }
      }
    };
    poll();
    // Poll a touch faster than before so a game that just ended drops out of the
    // Watch list quickly (the server already omits finished games; this shortens
    // how long a just-ended board can still show).
    const id = window.setInterval(poll, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [reloadKey]);

  const onlineCount = lobby ? lobby.players.length + lobby.anonymous : null;
  const seeks = lobby?.seeks ?? [];
  const challenges = lobby?.challenges ?? [];
  const waitingCount = seeks.length + challenges.length;

  // Sidebar ordering: players searching for a game first (they want an
  // opponent right now), then players mid-game, then idlers; higher-rated
  // first within each group. Folded to a handful of rows by default.
  const statusOrder: Record<"searching" | "playing" | "online", number> = {
    searching: 0,
    playing: 1,
    online: 2,
  };
  const sortedPlayers = lobby
    ? [...lobby.players].sort(
        (a, b) =>
          statusOrder[a.status] - statusOrder[b.status] ||
          (b.rating ?? 0) - (a.rating ?? 0),
      )
    : [];
  const visiblePlayers = showAllPlayers
    ? sortedPlayers
    : sortedPlayers.slice(0, ONLINE_LIST_FOLD);

  // Mode filters for the Challenges and Watch tabs. Legacy entries without a
  // mode only show under All.
  const filteredSeeks =
    challengeFilter === "all" ? seeks : seeks.filter((s) => s.mode === challengeFilter);
  const filteredChallenges =
    challengeFilter === "all"
      ? challenges
      : challenges.filter((c) => c.mode === challengeFilter);
  const games = lobby?.games ?? [];
  const filteredGames =
    watchFilter === "all" ? games : games.filter((g) => g.mode === watchFilter);

  // Answer a quick-pairing seek by queueing into the same pool (same mode and
  // time control): the server pairs with the first waiting player
  // immediately. A timeout covers the race where the seeker left between the
  // last poll and the click.
  const [joiningPool, setJoiningPool] = useState<string | null>(null);
  const joinSeek = async (seek: MPLobbySeek) => {
    if (joiningPool) return;
    // The two modes share pool (time control) names, so key the in-flight
    // marker on both.
    setJoiningPool(`${seek.mode ?? "buff"}:${seek.pool}`);
    // Signed-out players join as a guest (a throwaway account) so the server
    // can seat them: quick pairing needs an identity, but there is no login
    // wall. Ratings only move between registered accounts, so a guest plays
    // out casual; registering later keeps the name and rating.
    let me = user;
    if (!me) {
      me = await ensureAccount();
      if (me) setUser(me);
    }
    if (!me) {
      setJoiningPool(null);
      setLobbyError("Could not start a guest session. Please try again.");
      return;
    }
    const session = new MPSession();
    session.persistFriendSession = false;
    // Answer this exact seek: the server pairs only with this person (or house
    // bot). If they already left it returns seek_gone rather than substituting
    // a random opponent. Older servers omit seek.userId, so this falls back to
    // plain quick pairing there. Hoisted so the timeout path can still honor a
    // pairing that lands a moment after the 10s deadline.
    const queuePromise = session.queue(
      seek.pool,
      seek.mode ?? "buff",
      seek.userId ? { userId: seek.userId } : undefined,
    );
    const enterGame = (paired: { id: string; color: "w" | "b"; token: string }) => {
      saveOnlineSeat(paired.id, { color: paired.color, token: paired.token });
      session.destroy();
      router.push(`/game/${paired.id}`);
    };
    try {
      const paired = await Promise.race([
        queuePromise,
        new Promise<never>((_, reject) =>
          window.setTimeout(() => reject(new Error("seek_gone")), 10000),
        ),
      ]);
      enterGame(paired);
    } catch (e) {
      // The single-threaded Durable Object can answer just after the timeout
      // fires. Before tearing down the socket (which would strand an opponent
      // the server has already paired us with and cost us the seat), give the
      // pairing a brief grace window; if it completed, honor it.
      const late = await Promise.race([
        queuePromise.catch(() => null),
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 400)),
      ]);
      if (late) {
        enterGame(late);
        return;
      }
      session.cancelQueue();
      session.destroy();
      setJoiningPool(null);
      setLobbyError(
        e instanceof Error && e.message === "seek_gone"
          ? "That player is no longer waiting. Try quick pairing instead."
          : "Could not join that game right now.",
      );
    }
  };

  return (
    // Room for the Quick Match mobile sticky bar comes from QuickMatch itself:
    // it mirrors the bar's measured height into the body's bottom padding
    // while the bar is shown, so content is never covered and no static guess
    // is needed here.
    <main className="min-h-screen pb-16">
      <StarField />
      <SiteHeader active="/lobby" />

      <section className="max-w-7xl mx-auto px-5 sm:px-6">
        {/* Masthead over a torchlit brass hairline. On a phone it collapses to
            one compact row — a small engraved title beside the live status pill
            — so matchmaking content starts high on the page instead of below a
            full-height headline. Desktop keeps the monumental masthead and the
            two quiet traffic counters. */}
        <header className="relative mt-2 sm:mt-4">
          <EngravedLabel className="hidden sm:inline-flex">Find a game</EngravedLabel>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 sm:mt-1 sm:items-end">
            <h1 className="masthead text-2xl sm:text-6xl text-parchment-50">The Lobby</h1>
            <div className="flex flex-wrap items-center gap-2 pb-0.5">
              <StatusPill lobby={!!lobby} error={!!lobbyError} onlineCount={onlineCount} />
              {lobby && (
                <span className="hidden sm:contents">
                  <HallStat dotClass="bg-sun/80">{`${waitingCount} waiting`}</HallStat>
                  <HallStat dotClass="bg-coral/80">{`${lobby.games.length} in play`}</HallStat>
                </span>
              )}
            </div>
          </div>
          <div className="hall-hairline mt-2 sm:mt-4" aria-hidden />
        </header>

        {lobbyError && (
          <div role="alert" className="mt-5 plate p-3 px-4 border-oxblood-glow/60 bg-oxblood/15 text-parchment text-sm">
            {lobbyError}
          </div>
        )}

        {/* The lobby's four sections as an underline tab row, so the page never
            stacks them all into one long scroll. Quick Play is the default. One
            flat brass rail runs under the whole row; the active tab is marked by
            a gold underline that sits on that rail (no boxed "folder" borders,
            no double edges against the panel below). The row scrolls sideways on
            a phone too narrow to fit all four rather than breaking into stacked
            boxes, keeping every tab the same height and baseline. */}
        <div
          role="tablist"
          aria-label="Lobby sections"
          className="dgn-tabscroll mt-6 flex items-stretch gap-4 overflow-x-auto border-b border-[color:var(--edge)] sm:gap-7"
        >
          {LOBBY_TABS.map((t) => {
            const count =
              t.id === "challenges"
                ? (lobby ? waitingCount : null)
                : t.id === "watch"
                  ? (lobby ? lobby.games.length : null)
                  : null;
            const selected = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={selected}
                id={`lobby-tab-${t.id}`}
                aria-controls={`lobby-panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={
                  "-mb-px flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-1 pb-2.5 pt-1 font-display text-sm font-semibold transition-colors sm:text-base " +
                  (selected
                    ? "dgn-tab-active text-gold-leaf"
                    : "border-transparent text-parchment-300 hover:border-white/25 hover:text-parchment-50")
                }
              >
                {t.label}
                {count != null && count > 0 && (
                  <span
                    className={
                      "border px-1.5 py-px font-mono text-xs tabular-nums transition-colors " +
                      (selected
                        ? "border-gold/40 bg-gold/15 text-gold-leaf"
                        : "border-[color:var(--edge)] bg-white/[0.06] text-parchment-300")
                    }
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="space-y-5 min-w-0 stagger-in">
            {/* Set up a private game with a specific person: pick a clock and
                mode, create + share the code (or challenge a named friend), or
                join with a code you were given — all without leaving /lobby.
                The friends list lives alongside so one-tap Challenge and the
                code flow share the tab. */}
            {tab === "friends" && <FriendsTab />}

            {tab === "challenges" && (
            /* Open challenges: players waiting in a quick-pairing pool plus
                friend games waiting for an opponent, each on its own flat row
                wearing its mode color as a plain left border. */
            <div role="tabpanel" id="lobby-panel-challenges" aria-labelledby="lobby-tab-challenges" className="dgn-slab dgn-rivets p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <SectionTitle tint="sun" icon={<Swords size={15} aria-hidden />}>
                  Open challenges
                </SectionTitle>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTab("friends")}
                    className="inline-flex min-h-[44px] items-center sm:min-h-0 text-xs text-gold-leaf hover:text-gold transition-colors"
                  >
                    Create a friend game
                  </button>
                  <span className="text-xs text-parchment-400">
                    {lobby ? `${waitingCount} waiting` : "…"}
                  </span>
                </div>
              </div>
              <ModeFilter value={challengeFilter} onChange={setChallengeFilter} label="Filter challenges by mode" />
              {!lobby ? (
                lobbyError ? (
                  <LobbyRailError
                    message="Can't reach the game server, so open challenges aren't available."
                    onRetry={() => setReloadKey((k) => k + 1)}
                  />
                ) : (
                  <SkeletonRows count={3} />
                )
              ) : waitingCount === 0 ? (
                <HallEmpty
                  title="No one is waiting right now."
                  hint="Queue from Quick Play and your seek will appear here for others to answer."
                />
              ) : filteredSeeks.length + filteredChallenges.length === 0 ? (
                <HallEmpty
                  title={`No ${challengeFilter === "nerf" ? "Nerf" : "Buff"} challenges right now.`}
                  hint="Switch the filter to All, or queue from Quick Play to start one."
                />
              ) : (
                <ul className="mt-4 space-y-2.5 stagger-in">
                  {filteredSeeks.map((seek) => (
                    <SeekRow
                      key={`${seek.mode ?? "buff"}:${seek.pool}:${seek.name}:${seek.at}`}
                      seek={seek}
                      isMine={!!user && user.username === seek.name}
                      joining={joiningPool === `${seek.mode ?? "buff"}:${seek.pool}`}
                      busy={joiningPool !== null}
                      onJoin={() => joinSeek(seek)}
                    />
                  ))}
                  {filteredChallenges.map((challenge) => (
                    <ChallengeRow key={challenge.id} challenge={challenge} />
                  ))}
                </ul>
              )}
            </div>
            )}

            {tab === "watch" && (
            /* Watch a game that's happening right now. */
            <div role="tabpanel" id="lobby-panel-watch" aria-labelledby="lobby-tab-watch" className="dgn-slab dgn-rivets p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <SectionTitle tint="coral" icon={<Eye size={15} aria-hidden />}>
                  Live games
                </SectionTitle>
                <div className="flex items-center gap-3">
                  <Link
                    href="/tv"
                    className="inline-flex min-h-[44px] items-center sm:min-h-0 text-xs text-gold-leaf hover:text-gold transition-colors"
                  >
                    Open Nerf Chess TV
                  </Link>
                  <span className="text-xs text-parchment-400">
                    {lobby ? `${lobby.games.length} in play` : "…"}
                  </span>
                </div>
              </div>
              <ModeFilter value={watchFilter} onChange={setWatchFilter} label="Filter live games by mode" />
              {!lobby ? (
                lobbyError ? (
                  <LobbyRailError
                    message="Can't reach the game server, so live games aren't available."
                    onRetry={() => setReloadKey((k) => k + 1)}
                  />
                ) : (
                  <SkeletonRows count={3} />
                )
              ) : lobby.games.length === 0 ? (
                <HallEmpty
                  title="No games in play right now."
                  hint="Answer a challenge and the boards will light up here."
                />
              ) : filteredGames.length === 0 ? (
                <HallEmpty
                  title={`No ${watchFilter === "nerf" ? "Nerf" : "Buff"} games in play right now.`}
                  hint="Switch the filter to All to see every live board."
                />
              ) : (
                <ul className="mt-4 space-y-2.5 stagger-in">
                  {filteredGames.map((game) => (
                    <LiveGameRow key={game.id} game={game} />
                  ))}
                </ul>
              )}
            </div>
            )}

            {/* Quick Play stays MOUNTED across tab switches — hidden with the
                `hidden` attribute, never unmounted. QueueButton owns the live
                matchmaking socket (MPSession) and its "searching" state;
                unmounting it on a tab switch ran its effect cleanup, which
                destroyed the session and silently cancelled an in-flight seek.
                Keeping it mounted preserves the search (and its Cancel button)
                when the player returns, and a pairing that lands while they're
                on another tab still resolves and navigates into the game. Only
                an explicit Cancel or leaving /lobby (unmounting the page) ends
                the seek. Rendered last so the wrapper's space-y never gives the
                visible panel a stray top margin while this one is hidden. */}
            <div
              role="tabpanel"
              id="lobby-panel-quick"
              aria-labelledby="lobby-tab-quick"
              hidden={tab !== "quick"}
              className="space-y-5"
            >
              {/* The main action: get matched with a real opponent. `active`
                  gates the portalled mobile sticky bar to the Quick Play tab. */}
              <QuickMatch active={tab === "quick"} />
              {/* The other ways to start a game, as a proper 3-card row beneath
                  the dominant Quick Match panel so matchmaking stays the
                  headline while these stay one tap away. Each links to its
                  existing flow (Challenges tab, Friends tab, bot practice). */}
              <div>
                <EngravedLabel>Other ways to play</EngravedLabel>
                <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
                  <SecondaryModeCard
                    icon={<Swords size={18} aria-hidden />}
                    title="Custom game"
                    description="Set your own clock and mode, then share an open challenge."
                    onClick={() => setTab("challenges")}
                  />
                  <SecondaryModeCard
                    icon={<Users size={18} aria-hidden />}
                    title="Challenge a friend"
                    description="Create a private game and send the code to someone you know."
                    onClick={() => setTab("friends")}
                  />
                  <SecondaryModeCard
                    icon={<Cpu size={18} aria-hidden />}
                    title="Practice vs computer"
                    description="Warm up against the computer at your chosen difficulty."
                    href="/play"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Who's here right now, plus boards to watch: a stack of rail panels
              that ride along on desktop scroll. */}
          <aside className="h-fit space-y-5 lg:sticky lg:top-6">
            <div className="dgn-slab dgn-rivets p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="sec-title font-display text-xl text-parchment">Online now</div>
              {lobby && onlineCount != null && (
                <span className="font-mono text-xs tabular-nums text-parchment-400">{onlineCount}</span>
              )}
            </div>
            {!lobby ? (
              lobbyError ? (
                <LobbyRailError
                  message="Can't reach the game server, so we can't show who's online."
                  onRetry={() => setReloadKey((k) => k + 1)}
                />
              ) : (
                <>
                  <SkeletonPlayerRows count={5} />
                  <p className="mt-3 text-sm text-parchment-400">Seeing who&apos;s online…</p>
                </>
              )
            ) : (
              <>
                {lobby.players.length === 0 && (
                  <p className="mt-3 text-sm text-parchment-400">
                    No signed-in players right now
                    {lobby.anonymous > 0
                      ? `, but ${lobby.anonymous} anonymous player${lobby.anonymous === 1 ? " is" : "s are"} around.`
                      : "."}
                  </p>
                )}
                <ul className="mt-3 space-y-1">
                  {/* Kept deliberately plain: name + rating + status. Tiny
                      avatars added noise without carrying information. */}
                  {visiblePlayers.map((p) => (
                    <li
                      key={p.name}
                      className="-mx-2 flex items-center justify-between gap-2 px-2 py-1 text-sm transition-colors hover:bg-white/[0.04]"
                    >
                      <Link
                        href={`/u/${encodeURIComponent(p.name)}`}
                        className="flex min-h-[44px] min-w-0 items-center gap-2 sm:min-h-0 text-parchment-100 hover:text-gold-leaf transition-colors"
                      >
                        <span className="min-w-0 truncate">{p.name}</span>
                        {p.rating != null && (
                          <span
                            className="font-mono text-xs text-parchment-400"
                            title="Rating (best mode)"
                          >
                            {p.rating}
                          </span>
                        )}
                      </Link>
                      <StatusBadge status={p.status} />
                    </li>
                  ))}
                </ul>
                {sortedPlayers.length > ONLINE_LIST_FOLD && (
                  <button
                    type="button"
                    onClick={() => setShowAllPlayers((v) => !v)}
                    className="mt-2 min-h-[44px] sm:min-h-0 w-full btn-ghost press px-3 py-2 text-xs font-medium text-parchment-300"
                  >
                    {showAllPlayers
                      ? "Show fewer"
                      : `View all ${sortedPlayers.length} players`}
                  </button>
                )}
                {lobby.players.length > 0 && lobby.anonymous > 0 && (
                  <p className="mt-3 text-xs text-parchment-400">
                    + {lobby.anonymous} anonymous player{lobby.anonymous === 1 ? "" : "s"}
                  </p>
                )}
                {(user === null || user?.isGuest) && (
                  <p className="mt-4 border-t border-[color:var(--edge)] pt-3 text-[13px] text-parchment-300">
                    <Link href="/login?next=/lobby" className="font-semibold text-gold-leaf hover:underline">
                      Sign in
                    </Link>{" "}
                    to keep your rating.
                  </p>
                )}
              </>
            )}
            </div>

            {/* Games to watch: live boards from the same lobby snapshot, linked
                into the spectator route. The data source (lobby.games) always
                exists in the payload, so this panel renders with a designed
                empty state rather than disappearing. */}
            <div className="dgn-slab dgn-rivets p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="sec-title font-display text-xl text-parchment">Games to watch</div>
                {lobby && (
                  <span className="font-mono text-xs tabular-nums text-parchment-400">{lobby.games.length}</span>
                )}
              </div>
              {!lobby ? (
                lobbyError ? (
                  <LobbyRailError
                    message="Can't reach the game server, so live games aren't available."
                    onRetry={() => setReloadKey((k) => k + 1)}
                  />
                ) : (
                  <ul className="mt-3 space-y-2" aria-hidden>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <li key={i} className="skeleton h-12" />
                    ))}
                  </ul>
                )
              ) : lobby.games.length === 0 ? (
                <p className="mt-3 text-sm text-parchment-400">
                  No live games right now. Answer a challenge and the boards light up here.
                </p>
              ) : (
                <>
                  <ul className="mt-3 space-y-2">
                    {lobby.games.slice(0, WATCH_RAIL_FOLD).map((game) => (
                      <RailWatchRow key={game.id} game={game} />
                    ))}
                  </ul>
                  {lobby.games.length > WATCH_RAIL_FOLD && (
                    <button
                      type="button"
                      onClick={() => setTab("watch")}
                      className="mt-2 min-h-[44px] sm:min-h-0 w-full btn-ghost press px-3 py-2 text-xs font-medium text-parchment-300"
                    >
                      {`See all ${lobby.games.length} live games`}
                    </button>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

// One live-pulse chip in the header: a status dot beside a readable count.
function HallStat({ dotClass, children }: { dotClass: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 border border-[color:var(--edge)] bg-white/[0.04] px-3 py-1.5 text-xs tabular-nums text-parchment-300">
      <span aria-hidden className={`h-1.5 w-1.5 shrink-0 ${dotClass}`} />
      {children}
    </span>
  );
}

// The single, coherent connection pill: Connecting while the first snapshot is
// in flight, Reconnecting when polls are failing, otherwise Live with the
// player count. Replaces the old row of fragmentary "…" chips.
function StatusPill({
  lobby,
  error,
  onlineCount,
}: {
  lobby: boolean;
  error: boolean;
  onlineCount: number | null;
}) {
  let dot: string;
  let label: string;
  if (error) {
    dot = "bg-oxblood-glow motion-safe:animate-pulse";
    label = "Reconnecting…";
  } else if (!lobby || onlineCount === null) {
    dot = "bg-parchment-400 motion-safe:animate-pulse";
    label = "Connecting…";
  } else {
    dot = "bg-verdigris animate-flicker";
    label = `Live · ${onlineCount} player${onlineCount === 1 ? "" : "s"}`;
  }
  return (
    <span
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 border border-[color:var(--edge)] bg-white/[0.04] px-3 py-1.5 text-xs font-medium tabular-nums text-parchment-200"
    >
      <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// One secondary play-mode card: a full-height, fully clickable tile (min 44px)
// with an icon, a title, and a one-line description. Renders as a link when it
// points at a route, or a button when it switches lobby tabs.
function SecondaryModeCard({
  icon,
  title,
  description,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span
        aria-hidden
        className="grid h-9 w-9 shrink-0 place-items-center border border-[color:var(--edge)] bg-black/25 text-parchment-200 transition-colors group-hover:border-gold/40 group-hover:text-gold-leaf"
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-display text-[15px] font-semibold text-parchment-100">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-parchment-400">{description}</span>
      </span>
    </>
  );
  // The same carved stone tablet as the time-control tokens, so the whole
  // Quick Play column speaks one material (never the flat .plate next to the
  // chamber's granite).
  const className = "dgn-token press group flex min-h-[44px] items-start gap-3 p-3.5 text-left";
  return href ? (
    <Link href={href} className={className}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

// Each lobby section wears a small color identity: an icon chip beside the
// title (mint for friends, sun for open challenges, coral for live games; the
// online queue keeps the core blue inside QueueButton). Color on the chip
// only, never the whole panel, so the page stays quiet.
const SECTION_TINTS = {
  mint: "border-mint/30 bg-mint/10 text-mint-glow",
  sun: "border-sun/30 bg-sun/10 text-sun-glow",
  coral: "border-coral/30 bg-coral/10 text-coral-glow",
} as const;

// The Friends tab: the one obvious place for playing with friends. The setup
// flow (clock, mode, create + share a code, join by code) sits left and the
// friends list with its one-tap Challenge sits right on lg+; below that they
// stack with setup first. FriendGameSetup's own inline FriendsPanel is
// suppressed here (showFriends={false}) so the list renders exactly once.
// On the direct-challenge flow (?challenge=name) the setup panel is already
// about one opponent, so the list stands down — same as the old inline rule.
function FriendsTab() {
  const { challenging } = useFriendGame();
  return (
    <div
      role="tabpanel"
      id="lobby-panel-friends"
      aria-labelledby="lobby-tab-friends"
      className={"min-w-0 " + (challenging ? "" : "grid gap-5 lg:grid-cols-2 lg:items-start")}
    >
      <div className="dgn-slab dgn-rivets p-5 sm:p-6">
        <SectionTitle tint="mint" icon={<Users size={15} aria-hidden />}>
          Play a friend
        </SectionTitle>
        <p className="mt-2 mb-5 text-xs text-parchment-400">
          Challenge a friend directly. Share a code or pick from your list.
        </p>
        <FriendGameSetup showFriends={false} />
      </div>
      {!challenging && <FriendsPanel />}
    </div>
  );
}

function SectionTitle({
  tint,
  icon,
  children,
}: {
  tint: keyof typeof SECTION_TINTS;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className={`grid h-8 w-8 shrink-0 place-items-center border ${SECTION_TINTS[tint]}`}
      >
        {icon}
      </span>
      <div className="font-display text-2xl text-parchment">{children}</div>
    </div>
  );
}

// Segmented All / Buff / Nerf filter used by the Challenges and Watch tabs.
function ModeFilter({
  value,
  onChange,
  label,
}: {
  value: "all" | "nerf" | "buff";
  onChange: (value: "all" | "nerf" | "buff") => void;
  label: string;
}) {
  // Each segment lights in its own hue when pressed: All in vault gold (the
  // CSS default), Buff blue, Nerf red — sourced from the mode tokens so the
  // filter reads the same colors as the mode everywhere else. Fed via --seg-rgb.
  const options = [
    { id: "all", label: "All", rgb: null },
    { id: "buff", label: "Buff", rgb: "var(--accent-buff-rgb)" },
    { id: "nerf", label: "Nerf", rgb: "var(--accent-nerf-rgb)" },
  ] as const;
  return (
    <div role="group" aria-label={label} className="dgn-seg mt-3">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          style={o.rgb ? ({ "--seg-rgb": o.rgb } as React.CSSProperties) : undefined}
          className="dgn-seg__opt min-h-[44px] px-4 py-1 text-xs font-medium sm:min-h-[34px]"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// The mode's flat left-border color for a lobby row: warm terracotta for
// Nerf, sky for Buff, and the brass default (set in CSS) for legacy/draft
// entries.
function rowModeClass(mode: MPLobbySeek["mode"], fallback = ""): string {
  if (mode === "nerf") return "hall-row--nerf";
  if (mode === "buff") return "hall-row--buff";
  return fallback;
}

// Rating badge chip: the number in mono behind a brass hairline.
function RatingChip({ rating }: { rating?: number | null }) {
  if (rating == null) return null;
  return (
    <span className="shrink-0 border border-[rgb(216_181_110_/_0.35)] bg-[rgb(216_181_110_/_0.08)] px-1.5 py-px font-mono text-xs tabular-nums text-parchment-200">
      {rating}
    </span>
  );
}

// Time-control glyph: the speed icon (bullet/blitz/rapid…) beside the clock
// in mono, tinted with the category's accent.
function TimeControlGlyph({
  timeSec,
  incrementSec,
  clock,
}: {
  timeSec: number;
  incrementSec: number;
  clock: string;
}) {
  const category = getCategory(categoryForTimeControl(timeSec, incrementSec));
  const Icon = category.icon;
  return (
    <span className="inline-flex items-center gap-1 text-parchment-300">
      <Icon size={12} style={{ color: category.accent }} aria-hidden className="shrink-0" />
      <span className="font-mono text-xs tracking-normal">{clock}</span>
      <span>· {category.label}</span>
    </span>
  );
}

// First-load placeholders shaped like the real lobby rows (flat bordered row,
// a two-line text block on the left, an action chip on the right) so the panel
// keeps its shape and nothing jumps when the first snapshot lands. Only shown
// while `lobby` is still null; once a snapshot exists the last-good data
// stays up.
function SkeletonRows({ count }: { count: number }) {
  return (
    <ul className="mt-4 space-y-2.5" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="hall-row flex items-center justify-between gap-3 p-3 sm:px-4">
          <div className="min-w-0 flex-1 space-y-2">
            <span className="skeleton block h-3.5 w-1/2" />
            <span className="skeleton block h-2.5 w-1/3" />
          </div>
          <span className="skeleton h-9 w-20 shrink-0" />
        </li>
      ))}
    </ul>
  );
}

function SkeletonPlayerRows({ count }: { count: number }) {
  return (
    <ul className="mt-3 space-y-2" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="flex items-center justify-between gap-2">
          <span className="skeleton block h-3 w-2/5" />
          <span className="skeleton h-4 w-14 shrink-0" />
        </li>
      ))}
    </ul>
  );
}

// Rail-level error (design system 8.3): plain words plus a Retry. The lobby
// header keeps the connection banner and the page its own way out, so the rail
// stays compact rather than dead-ending on a skeleton.
function LobbyRailError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="mt-3 space-y-2">
      <p className="text-sm text-parchment-300">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-[44px] sm:min-h-0 btn-ghost press px-3 py-2 text-xs font-medium text-parchment-200"
      >
        Retry
      </button>
    </div>
  );
}

// Empty state: a quiet flat brass checkerboard with star motes drifting off it.
function HallEmpty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mt-4 flex items-center gap-4 border border-dashed border-[color:var(--edge)] bg-white/[0.015] p-4">
      <div className="hall-empty-board" aria-hidden>
        <span className="hall-mote" style={{ left: "28%", bottom: "18%" }} />
        <span
          className="hall-mote"
          style={{ left: "54%", bottom: "30%", "--mote-delay": "2.4s" } as React.CSSProperties}
        />
        <span
          className="hall-mote"
          style={{ left: "72%", bottom: "12%", "--mote-delay": "4.7s" } as React.CSSProperties}
        />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-parchment-200">{title}</p>
        <p className="mt-1 text-xs text-parchment-400">{hint}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "online" | "searching" | "playing" }) {
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
    <span className={`shrink-0 border px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// A player's name linking to their profile, with the rating in muted text.
// Used in every lobby row (seeks, challenges, live games) so any name is
// clickable, house bots included (they have real seeded accounts). The tap
// target is a comfortable 44px on phones and stays compact on desktop.
function PlayerNameLink({
  name,
  rating,
  className = "",
}: {
  name: string;
  rating?: number | null;
  className?: string;
}) {
  return (
    <Link
      href={`/u/${encodeURIComponent(name)}`}
      className={
        "inline-flex min-h-[44px] min-w-0 items-center sm:min-h-0 hover:text-gold-leaf hover:underline transition-colors " +
        className
      }
    >
      <span className="truncate">{name}</span>
      {rating != null && <span className="ml-1 shrink-0 text-parchment-400">({rating})</span>}
    </Link>
  );
}

// A player waiting in a quick-pairing pool. Joining queues into the same
// pool, which pairs the two immediately.
function SeekRow({
  seek,
  isMine,
  joining,
  busy,
  onJoin,
}: {
  seek: MPLobbySeek;
  isMine: boolean;
  joining: boolean;
  busy: boolean;
  onJoin: () => void;
}) {
  const clock =
    seek.timeSec >= 60
      ? `${Math.round(seek.timeSec / 60)}+${seek.incrementSec}`
      : `${seek.timeSec}s+${seek.incrementSec}`;
  return (
    <li className={`hall-row ${rowModeClass(seek.mode)} flex items-center justify-between gap-3 p-3 sm:px-4`}>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2 text-sm text-parchment-100">
          <PlayerNameLink name={seek.name} />
          <RatingChip rating={seek.rating} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-parchment-400">
          <ModeBadge mode={seek.mode} compact />
          <TimeControlGlyph timeSec={seek.timeSec} incrementSec={seek.incrementSec} clock={clock} />
          <span>{seek.mode ? "Rated" : "Draft"}</span>
        </div>
      </div>
      {isMine ? (
        <span className="shrink-0 border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold-leaf">
          Your seek
        </span>
      ) : (
        <button
          onClick={onJoin}
          disabled={busy}
          aria-label={`Join ${seek.name}'s ${clock} game`}
          className="btn-leaf press shrink-0 inline-flex items-center px-4 py-2 font-display text-sm font-semibold disabled:opacity-50"
        >
          {joining ? "Joining…" : "Join"}
        </button>
      )}
    </li>
  );
}

function ChallengeRow({ challenge }: { challenge: MPLobbyChallenge }) {
  const { joinWithCode } = useFriendGame();
  const clock =
    challenge.timeSec > 0
      ? `${Math.round(challenge.timeSec / 60)}+${challenge.incrementSec}`
      : "No clock";
  return (
    <li className={`hall-row ${rowModeClass(challenge.mode)} flex items-center justify-between gap-3 p-3 sm:px-4`}>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2 text-sm text-parchment-100">
          <PlayerNameLink name={challenge.host.name} />
          <RatingChip rating={challenge.host.rating} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-parchment-400">
          <ModeBadge mode={challenge.mode} compact />
          {!challenge.mode && challenge.draft && <span className="text-gold-leaf">Draft</span>}
          {challenge.timeSec > 0 ? (
            <TimeControlGlyph
              timeSec={challenge.timeSec}
              incrementSec={challenge.incrementSec}
              clock={clock}
            />
          ) : (
            <span>{clock}</span>
          )}
          <span>{challenge.rated ? "Rated" : "Casual"}</span>
          <span className="font-mono text-xs tracking-normal text-parchment-400">
            code {challenge.id}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => joinWithCode(challenge.id)}
        aria-label={`Accept ${challenge.host.name}'s challenge`}
        className="btn-leaf press shrink-0 inline-flex items-center px-4 py-2 font-display text-sm font-semibold"
      >
        Accept
      </button>
    </li>
  );
}

function LiveGameRow({ game }: { game: MPLobbyGame }) {
  const clock =
    game.timeSec > 0 ? `${Math.round(game.timeSec / 60)}+${game.incrementSec}` : "No clock";
  return (
    <li className={`hall-row ${rowModeClass(game.mode, "hall-row--live")} flex items-center justify-between gap-3 p-3 sm:px-4`}>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5 text-sm text-parchment-100">
          <PlayerNameLink name={game.players.w.name} rating={game.players.w.rating} className="max-w-[45%]" />
          <span className="shrink-0 text-parchment-400">vs</span>
          <PlayerNameLink name={game.players.b.name} rating={game.players.b.rating} className="max-w-[45%]" />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-parchment-400">
          <ModeBadge mode={game.mode} compact />
          {!game.mode && game.draft && <span className="text-gold-leaf">Draft</span>}
          {game.timeSec > 0 ? (
            <TimeControlGlyph timeSec={game.timeSec} incrementSec={game.incrementSec} clock={clock} />
          ) : (
            <span>{clock}</span>
          )}
          <span>{game.rated ? "Rated" : "Casual"}</span>
          <span>move {Math.ceil(game.moves / 2)}</span>
          {game.watchers > 0 && <span>{game.watchers} watching</span>}
        </div>
      </div>
      <Link
        href={`/game/${game.id}${game.origin === "arena" ? "?src=arena" : ""}`}
        aria-label={`Watch ${game.players.w.name} versus ${game.players.b.name}`}
        className="btn-ghost press shrink-0 inline-flex items-center gap-1.5 px-4 py-2 font-display text-sm"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Watch
      </Link>
    </li>
  );
}

// A compact live game for the right-rail "Games to watch" panel: the whole row
// is one link into the spectator route, showing both players WITH their
// ratings, mode + clock, and how deep the game is — so two 5+3 games still
// read differently at a glance. Denser than the full LiveGameRow in the Watch
// tab.
function RailWatchRow({ game }: { game: MPLobbyGame }) {
  const clock =
    game.timeSec > 0 ? `${Math.round(game.timeSec / 60)}+${game.incrementSec}` : "No clock";
  const moveNumber = Math.ceil(game.moves / 2);
  return (
    <li>
      <Link
        href={`/game/${game.id}${game.origin === "arena" ? "?src=arena" : ""}`}
        aria-label={`Watch ${game.players.w.name} versus ${game.players.b.name}`}
        className={`hall-row ${rowModeClass(game.mode, "hall-row--live")} flex flex-col gap-1 p-2.5`}
      >
        <div className="flex min-w-0 items-center gap-1.5 text-[13px] text-parchment-100">
          <span className="min-w-0 truncate">
            {game.players.w.name}
            {game.players.w.rating != null && (
              <span className="font-mono text-[11px] tabular-nums text-parchment-400"> {game.players.w.rating}</span>
            )}
          </span>
          <span className="shrink-0 text-parchment-400">vs</span>
          <span className="min-w-0 truncate">
            {game.players.b.name}
            {game.players.b.rating != null && (
              <span className="font-mono text-[11px] tabular-nums text-parchment-400"> {game.players.b.rating}</span>
            )}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-parchment-400">
          <ModeBadge mode={game.mode} compact />
          <span className="font-mono tabular-nums">{clock}</span>
          {moveNumber > 0 && <span className="tabular-nums">move {moveNumber}</span>}
          {game.watchers > 0 && (
            <span className="tabular-nums">
              {game.watchers} watching
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}
