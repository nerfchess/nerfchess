"use client";

import { SiteHeader } from "@/components/SiteHeader";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { QueueButton } from "@/components/QueueButton";
import { AccountUser, fetchMe } from "@/lib/authClient";
import { MPLobby, MPLobbyChallenge, MPLobbyGame, MPLobbySeek, MPSession, saveOnlineSeat } from "@/lib/multiplayer";
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
  const sessionRef = useRef<MPSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((me) => {
      if (!cancelled) setUser(me);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Poll the lobby snapshot over one long-lived socket.
  useEffect(() => {
    let cancelled = false;
    const session = new MPSession();
    session.persistFriendSession = false;
    session.autoReconnect = false; // fetchLobby reconnects on demand
    sessionRef.current = session;
    const poll = async () => {
      try {
        const data = await session.fetchLobby();
        if (!cancelled) {
          setLobby(data);
          setLobbyError(null);
        }
      } catch {
        if (!cancelled) setLobbyError("Can't reach the game server right now.");
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

  // Answer a quick-pairing seek by queueing into the same pool: the server
  // pairs with the first waiting player immediately. A timeout covers the
  // race where the seeker left between the last poll and the click.
  const [joiningPool, setJoiningPool] = useState<string | null>(null);
  const joinSeek = async (pool: string) => {
    if (!user) {
      router.push("/login?next=/lobby");
      return;
    }
    if (joiningPool) return;
    setJoiningPool(pool);
    const session = new MPSession();
    session.persistFriendSession = false;
    try {
      const paired = await Promise.race([
        session.queue(pool),
        new Promise<never>((_, reject) =>
          window.setTimeout(() => reject(new Error("seek_gone")), 10000),
        ),
      ]);
      saveOnlineSeat(paired.id, { color: paired.color, token: paired.token });
      session.destroy();
      router.push(`/game/${paired.id}`);
    } catch (e) {
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

      <section className="max-w-5xl mx-auto px-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl">Lobby</h1>
            <p className="mt-2 text-parchment-200">
              Find an opponent, challenge a friend, or watch a live game.
            </p>
          </div>
          <div className="flex items-center gap-2 smallcaps text-[11px] text-parchment-300">
            <span className="w-2 h-2 rounded-full bg-verdigris animate-flicker" />
            {onlineCount === null ? "Connecting…" : `${onlineCount} player${onlineCount === 1 ? "" : "s"} online`}
          </div>
        </div>

        {lobbyError && (
          <div className="mt-5 plate p-3 px-4 border-oxblood-glow/60 bg-oxblood/15 text-parchment text-sm">
            {lobbyError}
          </div>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4 min-w-0">
            {/* Step 1: the main action — get matched with a real opponent. */}
            <QueueButton />

            {/* Step 2: play a specific person via a shared code. */}
            <div className="plate p-5 sm:p-6">
              <div className="font-display text-2xl text-parchment">Play a friend</div>
              <p className="mt-1 text-sm text-parchment-300">
                Create a game and send them the code, or enter the code they sent you.
              </p>
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
                    className="min-w-0 flex-1 bg-ink-900/60 border border-white/15 rounded-sm px-4 py-3 font-mono tracking-widest uppercase focus:outline-none focus:border-gold/60 text-parchment placeholder:text-parchment-400/40 placeholder:tracking-normal placeholder:normal-case"
                  />
                  <button
                    onClick={() => router.push(`/friend?code=${encodeURIComponent(joinCode.trim())}`)}
                    disabled={!joinCode.trim()}
                    className="px-5 rounded-sm btn-ghost font-display disabled:opacity-50"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>

            {/* Open challenges: players waiting in a quick-pairing pool plus
                friend games waiting for an opponent. */}
            <div className="plate p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="font-display text-2xl text-parchment">Open challenges</div>
                <span className="smallcaps text-[10px] text-parchment-400">
                  {lobby ? `${waitingCount} waiting` : "…"}
                </span>
              </div>
              {!lobby ? (
                <p className="mt-3 text-sm text-parchment-400">Loading challenges…</p>
              ) : waitingCount === 0 ? (
                <p className="mt-3 text-sm text-parchment-400">
                  No one is waiting right now. Queue for a rated game or create a friend game
                  above and it will show up here until someone accepts.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-white/5">
                  {seeks.map((seek) => (
                    <SeekRow
                      key={`${seek.pool}:${seek.name}:${seek.at}`}
                      seek={seek}
                      isMine={!!user && user.username === seek.name}
                      joining={joiningPool === seek.pool}
                      busy={joiningPool !== null}
                      onJoin={() => joinSeek(seek.pool)}
                    />
                  ))}
                  {challenges.map((challenge) => (
                    <ChallengeRow key={challenge.id} challenge={challenge} />
                  ))}
                </ul>
              )}
            </div>

            {/* Step 3 (optional): watch a game that's happening right now. */}
            <div className="plate p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="font-display text-2xl text-parchment">Live games</div>
                <span className="smallcaps text-[10px] text-parchment-400">
                  {lobby ? `${lobby.games.length} in play` : "…"}
                </span>
              </div>
              {!lobby ? (
                <p className="mt-3 text-sm text-parchment-400">Loading live games…</p>
              ) : lobby.games.length === 0 ? (
                <p className="mt-3 text-sm text-parchment-400">
                  No games in play right now. Start one and someone can watch you.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-white/5">
                  {lobby.games.map((game) => (
                    <LiveGameRow key={game.id} game={game} />
                  ))}
                </ul>
              )}
            </div>

            <div className="text-sm text-parchment-400">
              Prefer practicing solo?{" "}
              <Link href="/play" className="text-parchment-200 underline decoration-white/20 hover:text-parchment-50">
                Play against the bot
              </Link>
              .
            </div>
          </div>

          {/* Who's here right now. */}
          <aside className="plate p-5 h-fit">
            <div className="flex items-center justify-between gap-3">
              <div className="font-display text-xl text-parchment">Online now</div>
            </div>
            {!lobby ? (
              <p className="mt-3 text-sm text-parchment-400">Loading…</p>
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
                        className="flex min-w-0 items-center gap-2 truncate text-parchment-100 hover:text-gold-leaf transition-colors"
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
                {user === null && (
                  <p className="mt-4 border-t border-white/10 pt-3 text-xs text-parchment-400">
                    <Link href="/login?next=/lobby" className="text-gold-leaf hover:underline">
                      Sign in
                    </Link>{" "}
                    to appear here and play rated games.
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
  const name = seek.rating != null ? `${seek.name} (${seek.rating})` : seek.name;
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2 truncate text-sm text-parchment-100">
          <Icon size={14} style={{ color: category.accent }} aria-hidden className="shrink-0" />
          {name}
        </div>
        <div className="mt-0.5 smallcaps text-[9px] text-parchment-400">
          Rated · {clock} · {category.label}
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
  const host =
    challenge.host.rating != null
      ? `${challenge.host.name} (${challenge.host.rating})`
      : challenge.host.name;
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <div className="truncate text-sm text-parchment-100">{host}</div>
        <div className="mt-0.5 smallcaps text-[9px] text-parchment-400">
          Casual · {clock} · code {challenge.id}
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
  const name = (p: { name: string; rating: number | null }) =>
    p.rating != null ? `${p.name} (${p.rating})` : p.name;
  const clock =
    game.timeSec > 0 ? `${Math.round(game.timeSec / 60)}+${game.incrementSec}` : "No clock";
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <div className="truncate text-sm text-parchment-100">
          {name(game.players.w)} <span className="text-parchment-400">vs</span> {name(game.players.b)}
        </div>
        <div className="mt-0.5 smallcaps text-[9px] text-parchment-400">
          {game.rated ? "Rated · " : "Casual · "}
          {clock} · move {Math.ceil(game.moves / 2)}
          {game.watchers > 0 ? ` · ${game.watchers} watching` : ""}
        </div>
      </div>
      <Link
        href={`/game/${game.id}`}
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
