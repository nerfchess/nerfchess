"use client";

import { SiteHeader } from "@/components/SiteHeader";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Eye, Swords, Users } from "lucide-react";
import { QueueButton } from "@/components/QueueButton";
import { withArenaLobby } from "@/lib/arenaLobby";
import { AccountUser, ensureAccount, fetchMe } from "@/lib/authClient";
import { readSnapshot, writeSnapshot } from "@/lib/snapshotCache";
import { MPLobby, MPLobbyChallenge, MPLobbyGame, MPLobbySeek, MPSession, saveOnlineSeat } from "@/lib/multiplayer";
import { ModeBadge } from "@/components/ModeBadge";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { StarField } from "@/components/StarField";
import { categoryForTimeControl, getCategory } from "@/lib/ratingCategories";

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

export default function LobbyPage() {
  const router = useRouter();
  const [user, setUser] = useState<AccountUser | null | undefined>(undefined);
  const [lobby, setLobby] = useState<MPLobby | null>(null);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinCodeError, setJoinCodeError] = useState<string | null>(null);
  const [tab, setTab] = useState<LobbyTab>("quick");
  // Mode filters for the Challenges and Watch tabs.
  const [challengeFilter, setChallengeFilter] = useState<"all" | "nerf" | "buff">("all");
  const [watchFilter, setWatchFilter] = useState<"all" | "nerf" | "buff">("all");
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const sessionRef = useRef<MPSession | null>(null);

  // Friend-code entry validates the shape before navigating, so a typo gets
  // an inline explanation instead of a dead join page.
  const joinFriendCode = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    if (!/^[A-Z0-9]{4,8}$/.test(code)) {
      setJoinCodeError("That doesn't look like a game code. Codes are 4-8 letters and digits, e.g. ABCDE.");
      return;
    }
    router.push(`/friend?code=${encodeURIComponent(code)}`);
  };

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

  // Poll the lobby snapshot over one long-lived socket.
  useEffect(() => {
    let cancelled = false;
    // Instant paint: the last snapshot this tab saw renders immediately
    // (seeks/games a few seconds stale), and the first live poll replaces it.
    const cached = readSnapshot<MPLobby>("nerfchess:lobby-snapshot");
    // Deferred a microtask so the paint happens after mount (no hydration
    // mismatch) but still before the first poll resolves — effectively instant.
    if (cached) queueMicrotask(() => setLobby(cached));
    const session = new MPSession();
    session.persistFriendSession = false;
    session.autoReconnect = false; // fetchLobby reconnects on demand
    sessionRef.current = session;
    // The game server runs on a single-threaded Durable Object, so a snapshot
    // can occasionally arrive late. Keep showing the last good snapshot (the
    // catch below never clears `lobby`) and only surface the error banner
    // after three misses in a row, so a one-off blip doesn't flap "can't reach
    // the game server" at the player.
    let failures = 0;
    const poll = async () => {
      try {
        // Arena (OCI bot-vs-bot) games merge in client-side, fail-soft — see
        // src/lib/arenaLobby.ts (Tier 3).
        const data = await withArenaLobby(await session.fetchLobby());
        if (!cancelled) {
          failures = 0;
          setLobby(data);
          setLobbyError(null);
          writeSnapshot("nerfchess:lobby-snapshot", data);
        }
      } catch {
        if (!cancelled) {
          failures++;
          if (failures >= 3) setLobbyError("Can't reach the game server right now.");
        }
      }
    };
    poll();
    const id = window.setInterval(poll, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      session.destroy();
      sessionRef.current = null;
    };
  }, []);

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
    <main className="min-h-screen pb-16">
      <StarField />
      <SiteHeader active="/lobby" />

      <section className="max-w-7xl mx-auto px-5 sm:px-6">
        {/* Masthead over a plain brass hairline, with the live pulse of the
            lobby as flat chips on the right. */}
        <header className="relative mt-2 sm:mt-4">
          <span className="eyebrow">Find a game</span>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <h1 className="masthead text-4xl sm:text-6xl text-parchment-50">The Lobby</h1>
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <HallStat dotClass="bg-verdigris animate-flicker">
                {onlineCount === null
                  ? "Connecting…"
                  : `${onlineCount} player${onlineCount === 1 ? "" : "s"} online`}
              </HallStat>
              <HallStat dotClass="bg-sun/80">
                {lobby ? `${waitingCount} waiting` : "…"}
              </HallStat>
              <HallStat dotClass="bg-coral/80">
                {lobby ? `${lobby.games.length} in play` : "…"}
              </HallStat>
            </div>
          </div>
          <div className="hall-hairline mt-4" aria-hidden />
        </header>

        {lobbyError && (
          <div role="alert" className="mt-5 plate p-3 px-4 border-oxblood-glow/60 bg-oxblood/15 text-parchment text-sm">
            {lobbyError}
          </div>
        )}

        {/* The lobby's four sections as tabs, so the page never stacks them
            all into one long scroll. Quick Play is the default. */}
        <div
          role="tablist"
          aria-label="Lobby sections"
          className="mt-6 flex flex-wrap gap-1.5 border-b border-white/10 pb-px"
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
                  "flex items-center gap-2 border border-b-0 px-4 py-2.5 font-display text-sm sm:text-base transition-colors " +
                  (selected
                    ? "border-gold/50 bg-gold/10 text-gold-leaf"
                    : "border-white/10 bg-white/[0.03] text-parchment-300 hover:bg-white/[0.06] hover:text-parchment-100")
                }
              >
                {t.label}
                {count != null && count > 0 && (
                  <span className="border border-white/15 bg-ink-900/60 px-1.5 py-px font-mono text-[10px] tabular-nums text-parchment-300">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="space-y-5 min-w-0 stagger-in">
            {tab === "quick" && (
              <div role="tabpanel" id="lobby-panel-quick" aria-labelledby="lobby-tab-quick" className="space-y-5">
                {/* The main action: get matched with a real opponent. */}
                <QueueButton />
                <div className="text-sm">
                  <Link href="/play" className="text-parchment-400 hover:text-parchment-100 transition-colors">
                    Prefer practice? Play a bot instead
                  </Link>
                </div>
              </div>
            )}

            {tab === "friends" && (
            /* Play a specific person via a shared code. */
            <div role="tabpanel" id="lobby-panel-friends" aria-labelledby="lobby-tab-friends" className="plate p-5 sm:p-6">
              <SectionTitle tint="mint" icon={<Users size={15} aria-hidden />}>
                Play a friend
              </SectionTitle>
              <p className="mt-2 text-xs text-parchment-400">
                Create a game and share the code, or enter the one you were given.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/friend"
                  className="btn-leaf press inline-flex items-center justify-center px-6 py-3 font-display text-base font-semibold"
                >
                  Create a game
                </Link>
                <div className="flex flex-1 gap-2">
                  <input
                    value={joinCode}
                    onChange={(e) => {
                      setJoinCode(e.target.value.toUpperCase());
                      setJoinCodeError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") joinFriendCode();
                    }}
                    placeholder="Enter a code, e.g. ABCDE"
                    maxLength={8}
                    aria-label="Friend game code"
                    aria-invalid={joinCodeError != null}
                    className="min-w-0 flex-1 bg-ink-900/60 border border-white/15 px-4 py-3 font-mono tracking-widest uppercase transition-colors focus:outline-none focus:border-gold/60 text-parchment placeholder:text-parchment-400/40 placeholder:tracking-normal placeholder:normal-case"
                  />
                  <button
                    onClick={joinFriendCode}
                    disabled={!joinCode.trim()}
                    title={joinCode.trim() ? undefined : "Enter the code your friend shared"}
                    className="px-5 btn-ghost press font-display disabled:opacity-50"
                  >
                    Join
                  </button>
                </div>
              </div>
              {joinCodeError && (
                <p role="alert" className="mt-2 text-xs text-coral-glow">
                  {joinCodeError}
                </p>
              )}
            </div>
            )}

            {tab === "challenges" && (
            /* Open challenges: players waiting in a quick-pairing pool plus
                friend games waiting for an opponent, each on its own flat row
                wearing its mode color as a plain left border. */
            <div role="tabpanel" id="lobby-panel-challenges" aria-labelledby="lobby-tab-challenges" className="plate p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <SectionTitle tint="sun" icon={<Swords size={15} aria-hidden />}>
                  Open challenges
                </SectionTitle>
                <div className="flex items-center gap-3">
                  <Link
                    href="/friend"
                    className="inline-flex min-h-[44px] items-center sm:min-h-0 smallcaps text-[10px] text-gold-leaf hover:text-gold transition-colors"
                  >
                    Create a friend game
                  </Link>
                  <span className="smallcaps text-[10px] text-parchment-400">
                    {lobby ? `${waitingCount} waiting` : "…"}
                  </span>
                </div>
              </div>
              <ModeFilter value={challengeFilter} onChange={setChallengeFilter} label="Filter challenges by mode" />
              {!lobby ? (
                <SkeletonRows count={3} />
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
            <div role="tabpanel" id="lobby-panel-watch" aria-labelledby="lobby-tab-watch" className="plate p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <SectionTitle tint="coral" icon={<Eye size={15} aria-hidden />}>
                  Live games
                </SectionTitle>
                <div className="flex items-center gap-3">
                  <Link
                    href="/tv"
                    className="inline-flex min-h-[44px] items-center sm:min-h-0 smallcaps text-[10px] text-gold-leaf hover:text-gold transition-colors"
                  >
                    Open Nerf Chess TV
                  </Link>
                  <span className="smallcaps text-[10px] text-parchment-400">
                    {lobby ? `${lobby.games.length} in play` : "…"}
                  </span>
                </div>
              </div>
              <ModeFilter value={watchFilter} onChange={setWatchFilter} label="Filter live games by mode" />
              {!lobby ? (
                <SkeletonRows count={3} />
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
          </div>

          {/* Who's here right now — rides along on desktop scroll. */}
          <aside className="plate p-5 h-fit lg:sticky lg:top-6">
            <div className="flex items-center justify-between gap-3">
              <div className="sec-title font-display text-xl text-parchment">Online now</div>
            </div>
            {!lobby ? (
              <>
                <SkeletonPlayerRows count={5} />
                <p className="mt-3 text-sm text-parchment-500">Seeing who&apos;s online…</p>
              </>
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
                  {visiblePlayers.map((p) => (
                    <li
                      key={p.name}
                      className="-mx-2 flex items-center justify-between gap-2 px-2 py-1 text-sm transition-colors hover:bg-white/[0.04]"
                    >
                      <Link
                        href={`/u/${encodeURIComponent(p.name)}`}
                        className="flex min-h-[44px] min-w-0 items-center gap-2 truncate sm:min-h-0 text-parchment-100 hover:text-gold-leaf transition-colors"
                      >
                        <PlayerAvatar name={p.name} avatar={p.avatar} size={22} />
                        {p.name}
                        {p.rating != null && (
                          <span
                            className="ml-1.5 font-mono text-xs text-parchment-400"
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
                    className="mt-2 w-full border border-white/10 bg-white/[0.03] px-3 py-2 smallcaps text-[10px] text-parchment-300 transition-colors hover:bg-white/[0.07] hover:text-parchment-100"
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
                  <p className="mt-4 border-t border-white/10 pt-3 text-xs text-parchment-400">
                    <Link href="/login?next=/lobby" className="text-gold-leaf hover:underline">
                      Sign in
                    </Link>{" "}
                    to keep your rating.
                  </p>
                )}
              </>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

// One live-pulse chip in the header: a status dot beside a smallcaps count.
function HallStat({ dotClass, children }: { dotClass: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 border border-white/10 bg-white/[0.04] px-3 py-1.5 smallcaps text-[10px] text-parchment-300">
      <span aria-hidden className={`h-1.5 w-1.5 shrink-0 ${dotClass}`} />
      {children}
    </span>
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
  const options = [
    { id: "all", label: "All", selectedClass: "border-gold/50 bg-gold/10 text-gold-leaf" },
    { id: "buff", label: "Buff", selectedClass: "border-mode-buff bg-mode-buff/15 text-mode-buffGlow" },
    { id: "nerf", label: "Nerf", selectedClass: "border-mode-nerf bg-mode-nerf/15 text-mode-nerfGlow" },
  ] as const;
  return (
    <div role="group" aria-label={label} className="mt-3 flex gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={
            "border px-3 py-1 smallcaps text-[10px] transition-colors " +
            (value === o.id
              ? o.selectedClass
              : "border-white/10 text-parchment-400 hover:border-white/25 hover:text-parchment-200")
          }
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
    <span className="shrink-0 border border-[rgb(216_181_110_/_0.35)] bg-[rgb(216_181_110_/_0.08)] px-1.5 py-px font-mono text-[10px] tabular-nums text-parchment-200">
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
      <span className="font-mono text-[10px] tracking-normal">{clock}</span>
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
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="skeleton h-[22px] w-[22px] shrink-0" />
            <span className="skeleton block h-3 w-2/5" />
          </div>
          <span className="skeleton h-4 w-14 shrink-0" />
        </li>
      ))}
    </ul>
  );
}

// Empty state: a quiet flat brass checkerboard with star motes drifting off it.
function HallEmpty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mt-4 flex items-center gap-4 border border-dashed border-white/10 bg-white/[0.015] p-4">
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
    <span className={`shrink-0 border px-2 py-0.5 smallcaps text-[9px] ${styles[status]}`}>
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
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 smallcaps text-[9px] text-parchment-400">
          <ModeBadge mode={seek.mode} compact />
          <TimeControlGlyph timeSec={seek.timeSec} incrementSec={seek.incrementSec} clock={clock} />
          <span>{seek.mode ? "Rated" : "Draft"}</span>
        </div>
      </div>
      {isMine ? (
        <span className="shrink-0 border border-gold/40 bg-gold/10 px-3 py-1.5 smallcaps text-[9px] text-gold-leaf">
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
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 smallcaps text-[9px] text-parchment-400">
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
          <span className="font-mono text-[10px] tracking-normal text-parchment-400">
            code {challenge.id}
          </span>
        </div>
      </div>
      <Link
        href={`/friend?code=${encodeURIComponent(challenge.id)}`}
        aria-label={`Accept ${challenge.host.name}'s challenge`}
        className="btn-leaf press shrink-0 inline-flex items-center px-4 py-2 font-display text-sm font-semibold"
      >
        Accept
      </Link>
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
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 smallcaps text-[9px] text-parchment-400">
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
