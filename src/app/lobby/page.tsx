"use client";

import { SiteHeader } from "@/components/SiteHeader";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, Swords, Users } from "lucide-react";
import { QueueButton } from "@/components/QueueButton";
import { AccountUser, ensureAccount, fetchMe } from "@/lib/authClient";
import { fetchLobbySnapshot } from "@/lib/lobbyClient";
import { readSnapshot, writeSnapshot } from "@/lib/snapshotCache";
import { MPLobby, MPLobbyChallenge, MPLobbyGame, MPLobbySeek, MPSession, saveOnlineSeat } from "@/lib/multiplayer";
import { ModeBadge } from "@/components/ModeBadge";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { categoryForTimeControl, getCategory } from "@/lib/ratingCategories";

// The lobby: the central place to find a game. Shows who is online, the games
// being played right now (click to watch), and every way to start playing.
export default function LobbyPage() {
  const router = useRouter();
  const [user, setUser] = useState<AccountUser | null | undefined>(undefined);
  const [lobby, setLobby] = useState<MPLobby | null>(null);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((me) => {
      if (!cancelled) setUser(me);
    });
    return () => {
      cancelled = true;
    };
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
    // the error banner after three misses in a row, so a one-off blip doesn't
    // flap "can't reach the game server" at the player.
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
          if (failures >= 3) setLobbyError("Can't reach the game server right now.");
        }
      }
    };
    poll();
    const id = window.setInterval(poll, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const onlineCount = lobby ? lobby.players.length + lobby.anonymous : null;
  const seeks = lobby?.seeks ?? [];
  const challenges = lobby?.challenges ?? [];
  const waitingCount = seeks.length + challenges.length;

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
      <SiteHeader active="/lobby" />

      <section className="max-w-7xl mx-auto px-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="masthead text-4xl sm:text-5xl text-parchment-50">Lobby</h1>
          </div>
          <div className="flex items-center gap-2 smallcaps text-[11px] text-parchment-300">
            <span className="w-2 h-2 bg-verdigris animate-flicker" />
            {onlineCount === null ? "Connecting…" : `${onlineCount} player${onlineCount === 1 ? "" : "s"} online`}
          </div>
        </div>

        {lobbyError && (
          <div className="mt-5 plate p-3 px-4 border-oxblood-glow/60 bg-oxblood/15 text-parchment text-sm">
            {lobbyError}
          </div>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4 min-w-0">
            {/* Step 1: the main action: get matched with a real opponent. */}
            <QueueButton />

            {/* Step 2: play a specific person via a shared code. */}
            <div className="plate plate-hover p-5 sm:p-6">
              <SectionTitle tint="mint" icon={<Users size={15} aria-hidden />}>
                Play a friend
              </SectionTitle>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/friend"
                  className="btn-leaf inline-flex items-center justify-center px-6 py-3 font-display text-base font-semibold"
                >
                  Create a game
                </Link>
                <div className="flex flex-1 gap-2">
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && joinCode.trim()) {
                        router.push(`/friend?code=${encodeURIComponent(joinCode.trim())}`);
                      }
                    }}
                    placeholder="Enter a code, e.g. ABCDE"
                    maxLength={8}
                    aria-label="Friend game code"
                    className="min-w-0 flex-1 bg-ink-900/60 border border-white/15 px-4 py-3 font-mono tracking-widest uppercase focus:outline-none focus:border-gold/60 text-parchment placeholder:text-parchment-400/40 placeholder:tracking-normal placeholder:normal-case"
                  />
                  <button
                    onClick={() => router.push(`/friend?code=${encodeURIComponent(joinCode.trim())}`)}
                    disabled={!joinCode.trim()}
                    className="px-5 btn-ghost font-display disabled:opacity-50"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>

            {/* Open challenges: players waiting in a quick-pairing pool plus
                friend games waiting for an opponent. */}
            <div className="plate plate-hover p-5 sm:p-6">
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
              {!lobby ? (
                <SkeletonRows count={3} />
              ) : waitingCount === 0 ? (
                <p className="mt-3 text-sm text-parchment-400">No one is waiting right now.</p>
              ) : (
                <ul className="mt-3 divide-y divide-white/5">
                  {seeks.map((seek) => (
                    <SeekRow
                      key={`${seek.mode ?? "buff"}:${seek.pool}:${seek.name}:${seek.at}`}
                      seek={seek}
                      isMine={!!user && user.username === seek.name}
                      joining={joiningPool === `${seek.mode ?? "buff"}:${seek.pool}`}
                      busy={joiningPool !== null}
                      onJoin={() => joinSeek(seek)}
                    />
                  ))}
                  {challenges.map((challenge) => (
                    <ChallengeRow key={challenge.id} challenge={challenge} />
                  ))}
                </ul>
              )}
            </div>

            {/* Step 3 (optional): watch a game that's happening right now. */}
            <div className="plate plate-hover p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <SectionTitle tint="coral" icon={<Eye size={15} aria-hidden />}>
                  Live games
                </SectionTitle>
                <span className="smallcaps text-[10px] text-parchment-400">
                  {lobby ? `${lobby.games.length} in play` : "…"}
                </span>
              </div>
              {!lobby ? (
                <SkeletonRows count={3} />
              ) : lobby.games.length === 0 ? (
                <p className="mt-3 text-sm text-parchment-400">No games in play right now.</p>
              ) : (
                <ul className="mt-3 divide-y divide-white/5">
                  {lobby.games.map((game) => (
                    <LiveGameRow key={game.id} game={game} />
                  ))}
                </ul>
              )}
            </div>

            <div className="text-sm">
              <Link href="/play" className="text-parchment-400 hover:text-parchment-100 transition-colors">
                Play vs bot
              </Link>
            </div>
          </div>

          {/* Who's here right now. */}
          <aside className="plate p-5 h-fit">
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
                <ul className="mt-3 space-y-2">
                  {lobby.players.map((p) => (
                    <li key={p.name} className="flex items-center justify-between gap-2 text-sm">
                      <Link
                        href={`/u/${encodeURIComponent(p.name)}`}
                        className="flex min-h-[44px] min-w-0 items-center gap-2 truncate sm:min-h-0 text-parchment-100 hover:text-gold-leaf transition-colors"
                      >
                        <PlayerAvatar name={p.name} avatar={p.avatar} size={22} />
                        {p.name}
                        {p.rating != null && (
                          <span className="ml-1.5 font-mono text-xs text-parchment-400">{p.rating}</span>
                        )}
                      </Link>
                      <StatusBadge status={p.status} />
                    </li>
                  ))}
                </ul>
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

// First-load placeholders. They mirror the real row structure (a two-line
// text block on the left, an action chip on the right) so the panel keeps its
// shape and nothing jumps when the first snapshot lands. Only shown while
// `lobby` is still null; once a snapshot exists the last-good data stays up.
function SkeletonRows({ count }: { count: number }) {
  return (
    <ul className="mt-3 divide-y divide-white/5" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="flex items-center justify-between gap-3 py-2.5">
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
  const category = getCategory(categoryForTimeControl(seek.timeSec, seek.incrementSec));
  const Icon = category.icon;
  const clock =
    seek.timeSec >= 60
      ? `${Math.round(seek.timeSec / 60)}+${seek.incrementSec}`
      : `${seek.timeSec}s+${seek.incrementSec}`;
  return (
    <li className="-mx-2 flex items-center justify-between gap-3 px-2 py-2.5 transition-colors hover:bg-white/[0.045]">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2 text-sm text-parchment-100">
          <Icon size={14} style={{ color: category.accent }} aria-hidden className="shrink-0" />
          <PlayerNameLink name={seek.name} rating={seek.rating} />
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 smallcaps text-[9px] text-parchment-400">
          <ModeBadge mode={seek.mode} compact />
          <span>
            {seek.mode ? "Rated · " : "Draft · "}
            {clock} · {category.label}
          </span>
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
          className="btn-leaf shrink-0 inline-flex items-center px-4 py-2 font-display text-sm font-semibold disabled:opacity-50"
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
    <li className="-mx-2 flex items-center justify-between gap-3 px-2 py-2.5 transition-colors hover:bg-white/[0.045]">
      <div className="min-w-0">
        <div className="flex min-w-0 text-sm text-parchment-100">
          <PlayerNameLink name={challenge.host.name} rating={challenge.host.rating} />
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 smallcaps text-[9px] text-parchment-400">
          <ModeBadge mode={challenge.mode} compact />
          <span>
            {!challenge.mode && challenge.draft && <span className="text-gold-leaf">Draft · </span>}
            {challenge.rated ? "Rated" : "Casual"} · {clock} · code {challenge.id}
          </span>
        </div>
      </div>
      <Link
        href={`/friend?code=${encodeURIComponent(challenge.id)}`}
        className="btn-leaf shrink-0 inline-flex items-center px-4 py-2 font-display text-sm font-semibold"
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
    <li className="-mx-2 flex items-center justify-between gap-3 px-2 py-2.5 transition-colors hover:bg-white/[0.045]">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5 text-sm text-parchment-100">
          <PlayerNameLink name={game.players.w.name} rating={game.players.w.rating} className="max-w-[45%]" />
          <span className="shrink-0 text-parchment-400">vs</span>
          <PlayerNameLink name={game.players.b.name} rating={game.players.b.rating} className="max-w-[45%]" />
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 smallcaps text-[9px] text-parchment-400">
          <ModeBadge mode={game.mode} compact />
          <span>
            {!game.mode && game.draft && <span className="text-gold-leaf">Draft · </span>}
            {game.rated ? "Rated · " : "Casual · "}
            {clock} · move {Math.ceil(game.moves / 2)}
            {game.watchers > 0 ? ` · ${game.watchers} watching` : ""}
          </span>
        </div>
      </div>
      <Link
        href={`/game/${game.id}${game.origin === "arena" ? "?src=arena" : ""}`}
        className="btn-ghost shrink-0 inline-flex items-center gap-1.5 px-4 py-2 font-display text-sm"
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
