"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchMe, logout } from "@/lib/authClient";

interface ProfileUser {
  username: string;
  rating: number;
  rd: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: number;
}

interface ProfileGame {
  id: string;
  white_name: string;
  black_name: string;
  winner: "w" | "b" | "draw" | null;
  reason: string;
  rated: number;
  white_rating_before: number | null;
  white_rating_after: number | null;
  black_rating_before: number | null;
  black_rating_after: number | null;
  time_sec: number;
  increment_sec: number;
  completed_at: number;
}

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const username = String(params.username ?? "");
  const [profile, setProfile] = useState<{ user: ProfileUser; games: ProfileGame[] } | null>(null);
  const [isMe, setIsMe] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}`);
      if (cancelled) return;
      if (!res.ok) {
        setMissing(true);
        return;
      }
      const data = (await res.json()) as { user: ProfileUser; games: ProfileGame[] };
      setProfile(data);
      const me = await fetchMe();
      if (!cancelled && me && me.username.toLowerCase() === data.user.username.toLowerCase()) {
        setIsMe(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
    router.refresh();
  };

  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-5 sm:px-10 py-6">
        <Link href="/" className="font-display text-2xl tracking-tight">
          nerf<span className="text-gold-leaf">chess</span>
        </Link>
        <div className="flex items-center gap-3 text-sm font-medium">
          <Link href="/play" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Play</Link>
          <Link href="/leaderboard" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Leaderboard</Link>
        </div>
      </nav>

      <section className="max-w-3xl mx-auto px-6 py-8">
        {missing ? (
          <>
            <h1 className="font-display text-4xl">Player not found</h1>
            <p className="mt-3 text-parchment-200">No account with that name.</p>
          </>
        ) : !profile ? (
          <div className="text-parchment-300">Loading…</div>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-5xl">{profile.user.username}</h1>
                <p className="mt-2 text-parchment-300 text-sm">
                  Member since {new Date(profile.user.createdAt).toLocaleDateString()}
                </p>
              </div>
              {isMe && (
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-sm btn-ghost text-sm font-display"
                >
                  Sign out
                </button>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatCard label="Rating" value={Math.round(profile.user.rating).toString()} accent />
              <StatCard label="Rated games" value={profile.user.games.toString()} />
              <StatCard
                label="Record"
                value={`${profile.user.wins}-${profile.user.losses}-${profile.user.draws}`}
              />
              <StatCard label="Deviation" value={`±${Math.round(profile.user.rd)}`} />
            </div>

            <h2 className="mt-10 font-display text-2xl">Recent games</h2>
            {profile.games.length === 0 ? (
              <p className="mt-3 text-parchment-300">
                No online games yet.{" "}
                <Link href="/play" className="text-gold-leaf hover:underline">
                  Find an opponent
                </Link>{" "}
                to start your history.
              </p>
            ) : (
              <div className="mt-3 plate divide-y divide-white/5">
                {profile.games.map((game) => (
                  <GameRow key={game.id} game={game} viewer={profile.user.username} />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="plate p-4">
      <div className="smallcaps text-[10px] text-parchment-400">{label}</div>
      <div className={`mt-1 font-display text-3xl font-bold ${accent ? "text-gold-leaf" : "text-parchment"}`}>
        {value}
      </div>
    </div>
  );
}

function GameRow({ game, viewer }: { game: ProfileGame; viewer: string }) {
  const viewerIsWhite = game.white_name.toLowerCase() === viewer.toLowerCase();
  const myColor = viewerIsWhite ? "w" : "b";
  const opponent = viewerIsWhite ? game.black_name : game.white_name;
  const outcome = game.winner === "draw" ? "Draw" : game.winner === myColor ? "Won" : "Lost";
  const tone =
    outcome === "Won" ? "text-gold-leaf" : outcome === "Lost" ? "text-oxblood-glow" : "text-bruise-glow";
  const before = viewerIsWhite ? game.white_rating_before : game.black_rating_before;
  const after = viewerIsWhite ? game.white_rating_after : game.black_rating_after;
  const delta = before != null && after != null ? Math.round(after) - Math.round(before) : null;

  return (
    <Link
      href={`/game/${game.id}`}
      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.03] transition"
    >
      <div className="min-w-0">
        <span className={`font-display font-semibold ${tone}`}>{outcome}</span>
        <span className="text-parchment-200"> vs {opponent}</span>
        <span className="text-parchment-400 text-sm"> · {game.reason}</span>
      </div>
      <div className="shrink-0 text-right text-sm">
        {delta != null && (
          <span className={delta >= 0 ? "text-gold-leaf" : "text-oxblood-glow"}>
            {delta >= 0 ? "+" : ""}
            {delta}
          </span>
        )}
        <span className="text-parchment-400 ml-3">
          {new Date(game.completed_at).toLocaleDateString()}
        </span>
      </div>
    </Link>
  );
}
