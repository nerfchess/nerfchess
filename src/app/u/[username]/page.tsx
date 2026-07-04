"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountUser, fetchMe } from "@/lib/authClient";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PlayerStatsPanel } from "@/components/PlayerStatsPanel";
import { SiteHeader } from "@/components/SiteHeader";
import type { PlayerStats } from "@/lib/playerStats";
import { RatingChart, RatingPoint } from "@/components/RatingChart";
import { RATING_CATEGORIES } from "@/lib/ratingCategories";

interface ProfileUser {
  username: string;
  avatar?: string | null;
  rating: number;
  rd: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: number;
  role: "user" | "mod" | "admin";
  bio: string | null;
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

interface CategoryRatingRow {
  rating: number;
  rd: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  peak: number;
}

interface ProfileData {
  user: ProfileUser;
  games: ProfileGame[];
  ratings?: Record<string, CategoryRatingRow>;
  ratingHistory: RatingPoint[];
}

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const username = String(params.username ?? "");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [me, setMe] = useState<AccountUser | null>(null);
  const [missing, setMissing] = useState(false);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}`);
      if (cancelled) return;
      if (!res.ok) {
        setMissing(true);
        return;
      }
      const data = (await res.json()) as ProfileData;
      setProfile(data);
      fetch(`/api/users/${encodeURIComponent(username)}/stats`)
        .then((r) => (r.ok ? (r.json() as Promise<{ stats: PlayerStats }>) : null))
        .then((s) => {
          if (!cancelled && s) setStats(s.stats);
        })
        .catch(() => {});
      const account = await fetchMe();
      if (!cancelled) setMe(account);
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  const isMe = !!me && !!profile && me.username.toLowerCase() === profile.user.username.toLowerCase();

  return (
    <main className="min-h-screen">
      <SiteHeader />

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
              <div className="flex items-center gap-4">
                {isMe ? (
                  <Link
                    href="/profile"
                    title="Change your profile picture"
                    className="group relative rounded-md ring-1 ring-transparent hover:ring-gold/60 transition"
                  >
                    <PlayerAvatar name={profile.user.username} avatar={profile.user.avatar} size={56} />
                    <span className="absolute inset-x-0 bottom-0 hidden bg-black/70 text-center text-[9px] uppercase tracking-wider text-parchment-100 group-hover:block">
                      edit
                    </span>
                  </Link>
                ) : (
                  <PlayerAvatar name={profile.user.username} avatar={profile.user.avatar} size={56} />
                )}
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="font-display text-5xl">{profile.user.username}</h1>
                    {profile.user.role !== "user" && (
                      <span className="smallcaps text-[10px] px-2 py-0.5 rounded-full border border-gold/40 text-gold-leaf">
                        {profile.user.role === "admin" ? "Admin" : "Moderator"}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-parchment-300 text-sm">
                    Member since {new Date(profile.user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {me && !isMe && (
                  <>
                    <button
                      onClick={() => router.push(`/friend?challenge=${encodeURIComponent(profile.user.username)}`)}
                      className="px-4 py-2 rounded-sm btn-leaf text-sm font-display font-semibold"
                    >
                      Challenge
                    </button>
                    <Link
                      href={`/inbox/${encodeURIComponent(profile.user.username)}`}
                      className="px-4 py-2 rounded-sm btn-ghost text-sm font-display"
                    >
                      Message
                    </Link>
                    <button
                      onClick={() => setReporting(true)}
                      className="px-4 py-2 rounded-sm btn-ghost text-sm font-display text-oxblood-glow"
                    >
                      Report
                    </button>
                  </>
                )}
                {isMe && (
                  <Link href="/profile" className="px-4 py-2 rounded-sm btn-ghost text-sm font-display">
                    Edit profile
                  </Link>
                )}
              </div>
            </div>

            <BioSection
              bio={profile.user.bio}
              editable={isMe}
              onSaved={(bio) =>
                setProfile((p) => (p ? { ...p, user: { ...p.user, bio } } : p))
              }
            />

            {/* One independent rating per time control, Lichess-style. */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RATING_CATEGORIES.map((c) => {
                const r = profile.ratings?.[c.id];
                const Icon = c.icon;
                return (
                  <div key={c.id} className="plate p-3">
                    <div className="flex items-center gap-1.5 smallcaps text-[10px] text-parchment-400">
                      <Icon className="h-3 w-3" style={{ color: c.accent }} strokeWidth={2.2} />
                      {c.label}
                    </div>
                    <div className="mt-1 font-mono text-xl tabular-nums text-parchment-100">
                      {r ? (
                        <>
                          {Math.round(r.rating)}
                          {r.rd > 150 && <span className="text-parchment-400">?</span>}
                        </>
                      ) : (
                        <span className="text-parchment-500">—</span>
                      )}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-parchment-400">
                      {r ? `${r.games} games · peak ${Math.round(r.peak)}` : "no rated games"}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
              <StatCard label="Rated games" value={profile.user.games.toString()} />
              <StatCard
                label="Record"
                value={`${profile.user.wins}-${profile.user.losses}-${profile.user.draws}`}
              />
              <StatCard label="Member since" value={new Date(profile.user.createdAt).toLocaleDateString()} />
            </div>

            {profile.ratingHistory.length >= 2 && (
              <div className="mt-6">
                <RatingChart points={profile.ratingHistory} />
              </div>
            )}

            {stats && (
              <>
                <h2 className="mt-10 font-display text-2xl">Statistics</h2>
                <div className="mt-3">
                  <PlayerStatsPanel stats={stats} />
                </div>
              </>
            )}

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

            {reporting && (
              <ReportModal username={profile.user.username} onClose={() => setReporting(false)} />
            )}
          </>
        )}
      </section>
    </main>
  );
}

function BioSection({
  bio,
  editable,
  onSaved,
}: {
  bio: string | null;
  editable: boolean;
  onSaved: (bio: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(bio ?? "");
  const [saving, setSaving] = useState(false);

  if (!bio && !editable) return null;

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/auth/bio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio: draft.trim() || null }),
    });
    setSaving(false);
    if (res.ok) {
      const data = (await res.json()) as { bio: string | null };
      onSaved(data.bio);
      setDraft(data.bio ?? "");
      setEditing(false);
    }
  };

  return (
    <div className="mt-5">
      {editing ? (
        <div className="plate p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 300))}
            rows={3}
            placeholder="Say something about yourself…"
            className="w-full bg-transparent text-sm text-parchment-100 outline-none resize-none"
            autoFocus
          />
          <div className="mt-2 flex items-center gap-2 text-sm">
            <button
              onClick={save}
              disabled={saving}
              className="px-3 py-1 rounded-sm btn-ghost text-gold-leaf font-display"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setEditing(false)} className="px-3 py-1 rounded-sm btn-ghost">
              Cancel
            </button>
            <span className="ml-auto text-parchment-400 text-xs">{draft.length}/300</span>
          </div>
        </div>
      ) : (
        <p className="text-parchment-200 text-sm whitespace-pre-wrap">
          {bio}
          {editable && (
            <button
              onClick={() => {
                setDraft(bio ?? "");
                setEditing(true);
              }}
              className="ml-2 text-gold-leaf hover:underline"
            >
              {bio ? "Edit" : "Add a bio"}
            </button>
          )}
        </p>
      )}
    </div>
  );
}

const REPORT_REASONS = [
  ["cheating", "Cheating / outside assistance"],
  ["boosting", "Rating manipulation"],
  ["chat", "Offensive chat"],
  ["username", "Inappropriate username"],
  ["other", "Something else"],
] as const;

function ReportModal({ username, onClose }: { username: string; onClose: () => void }) {
  const [reason, setReason] = useState<string>("cheating");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async () => {
    setStatus("sending");
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, reason, description }),
    });
    if (res.ok) {
      setStatus("sent");
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not send the report.");
      setStatus("error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div className="plate p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {status === "sent" ? (
          <>
            <h2 className="font-display text-2xl">Report sent</h2>
            <p className="mt-2 text-parchment-200 text-sm">
              Thanks, a moderator will take a look.
            </p>
            <button onClick={onClose} className="mt-4 px-4 py-2 rounded-sm btn-ghost text-sm font-display">
              Close
            </button>
          </>
        ) : (
          <>
            <h2 className="font-display text-2xl">
              Report <span className="text-gold-leaf">{username}</span>
            </h2>
            <div className="mt-4 space-y-2">
              {REPORT_REASONS.map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm text-parchment-100 cursor-pointer">
                  <input
                    type="radio"
                    name="report-reason"
                    checked={reason === value}
                    onChange={() => setReason(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              rows={4}
              placeholder="What happened? Include game links or examples."
              className="mt-4 w-full plate bg-transparent p-3 text-sm text-parchment-100 outline-none resize-none focus:border-gold/40"
            />
            {status === "error" && <p className="mt-2 text-oxblood-glow text-sm">{error}</p>}
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={submit}
                disabled={status === "sending" || !description.trim()}
                className="px-4 py-2 rounded-sm btn-ghost text-sm font-display text-oxblood-glow disabled:opacity-50"
              >
                {status === "sending" ? "Sending…" : "Send report"}
              </button>
              <button onClick={onClose} className="px-4 py-2 rounded-sm btn-ghost text-sm font-display">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
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
