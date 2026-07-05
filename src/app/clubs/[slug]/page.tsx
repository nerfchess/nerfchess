"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { CalendarDays, Crown, LogIn, LogOut, Trash2, Trophy, Users } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { SiteHeader } from "@/components/SiteHeader";
import { AccountUser, fetchMe } from "@/lib/authClient";
import type { ClubMemberRow, ClubPostRow, ClubTournamentRow } from "@/app/api/clubs/[slug]/route";

// Club home, lichess-teams-style: description and members on one side, the
// club's events and a members-only message board on the other.

type ClubDetail = {
  club: {
    id: string;
    slug: string;
    name: string;
    description: string;
    owner_user_id: string;
    owner_name: string;
    created_at: number;
  };
  members: ClubMemberRow[];
  posts: ClubPostRow[];
  tournaments: ClubTournamentRow[];
  myRole: string | null;
};

function timeAgo(at: number): string {
  const s = Math.max(1, Math.floor((Date.now() - at) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ClubPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [data, setData] = useState<ClubDetail | null>(null);
  const [me, setMe] = useState<AccountUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [postText, setPostText] = useState("");
  const [postError, setPostError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/clubs/${encodeURIComponent(slug)}`);
    if (!res.ok) {
      throw new Error(res.status === 404 ? "That club doesn't exist." : "Could not load the club.");
    }
    setData((await res.json()) as ClubDetail);
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    load().catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load the club."));
    fetchMe().then((u) => !cancelled && setMe(u));
    return () => {
      cancelled = true;
    };
  }, [load]);

  const membership = async (action: "join" | "leave") => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${encodeURIComponent(slug)}/membership`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || "That didn't work.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  };

  const submitPost = async (event: FormEvent) => {
    event.preventDefault();
    if (!postText.trim()) return;
    setPostError(null);
    try {
      const res = await fetch(`/api/clubs/${encodeURIComponent(slug)}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: postText }),
      });
      const body = (await res.json().catch(() => ({}))) as { post?: ClubPostRow; error?: string };
      if (!res.ok || !body.post) throw new Error(body.error || "Could not post.");
      setData((d) => (d ? { ...d, posts: [body.post!, ...d.posts] } : d));
      setPostText("");
    } catch (e) {
      setPostError(e instanceof Error ? e.message : "Could not post.");
    }
  };

  const deletePost = async (id: string) => {
    try {
      const res = await fetch(`/api/clubs/${encodeURIComponent(slug)}/posts?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) setData((d) => (d ? { ...d, posts: d.posts.filter((p) => p.id !== id) } : d));
    } catch {}
  };

  if (error && !data) {
    return (
      <main className="min-h-screen">
        <SiteHeader active="/clubs" />
        <section className="mx-auto max-w-3xl px-6 py-16 text-center">
          <p className="text-parchment-300">{error}</p>
          <Link href="/clubs" className="mt-4 inline-block btn-ghost px-4 py-2 font-display text-sm">
            Back to clubs
          </Link>
        </section>
      </main>
    );
  }

  const club = data?.club;
  const isOwner = data?.myRole === "owner";
  const isMember = data?.myRole != null;
  const mayModerate = isOwner || me?.role === "mod" || me?.role === "admin";

  return (
    <main className="min-h-screen pb-16">
      <SiteHeader active="/clubs" />
      <section className="mx-auto max-w-6xl px-5 sm:px-6">
        {!club ? (
          <p className="py-16 text-center text-sm text-parchment-400">Loading…</p>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate font-display text-4xl text-parchment-50 sm:text-5xl">{club.name}</h1>
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-parchment-400">
                  <span className="flex items-center gap-1.5">
                    <Crown size={13} className="text-gold-leaf" />
                    <Link href={`/u/${encodeURIComponent(club.owner_name)}`} className="hover:text-gold-leaf">
                      {club.owner_name}
                    </Link>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users size={13} /> {data.members.length} member{data.members.length === 1 ? "" : "s"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarDays size={13} /> since {new Date(club.created_at).toLocaleDateString()}
                  </span>
                </p>
              </div>
              <div className="flex gap-2">
                {me && !isMember && (
                  <button
                    onClick={() => membership("join")}
                    disabled={busy}
                    className="btn-leaf flex items-center gap-1.5 px-4 py-2 font-display text-sm font-semibold disabled:opacity-50"
                  >
                    <LogIn size={14} /> Join club
                  </button>
                )}
                {isMember && !isOwner && (
                  <button
                    onClick={() => membership("leave")}
                    disabled={busy}
                    className="btn-ghost flex items-center gap-1.5 px-4 py-2 font-display text-sm disabled:opacity-50"
                  >
                    <LogOut size={14} /> Leave
                  </button>
                )}
                {isMember && (
                  <Link
                    href={`/tournaments?club=${encodeURIComponent(club.id)}`}
                    className="btn-ghost flex items-center gap-1.5 px-4 py-2 font-display text-sm"
                  >
                    <Trophy size={14} /> New event
                  </Link>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-5 plate border-oxblood-glow/60 bg-oxblood/15 px-4 py-3 text-sm text-parchment">
                {error}
              </div>
            )}
            {club.description && <p className="mt-4 max-w-2xl text-parchment-300">{club.description}</p>}

            <div className="mt-8 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="flex flex-col gap-4">
                {/* Members, sorted by rating — doubles as the club leaderboard. */}
                <div className="plate overflow-hidden">
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 px-5 py-3">
                    <span className="smallcaps text-[10px] text-parchment-400">Leaderboard</span>
                    <span className="smallcaps text-[9px] text-parchment-500">
                      {data.members.length} member{data.members.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ul className="max-h-96 divide-y divide-white/5 overflow-y-auto">
                    {data.members.map((m, i) => (
                      <li key={m.user_id}>
                        <Link
                          href={`/u/${encodeURIComponent(m.username)}`}
                          className="flex items-center gap-2.5 px-5 py-2 transition-colors hover:bg-white/5"
                        >
                          <span className="w-4 shrink-0 font-mono text-[10px] text-parchment-500">{i + 1}</span>
                          <PlayerAvatar name={m.username} avatar={m.avatar} size={22} />
                          <span className="min-w-0 truncate text-sm text-parchment-100">
                            {m.username}
                            {m.role === "owner" && (
                              <Crown size={11} className="ml-1.5 inline text-gold-leaf" aria-label="Owner" />
                            )}
                          </span>
                          <span className="ml-auto shrink-0 font-mono text-xs text-parchment-400">
                            {Math.round(m.rating)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Club events */}
                <div className="plate overflow-hidden">
                  <div className="border-b border-white/10 px-5 py-3 smallcaps text-[10px] text-parchment-400">
                    Events
                  </div>
                  {data.tournaments.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-parchment-400">No events yet.</p>
                  ) : (
                    <ul className="divide-y divide-white/5">
                      {data.tournaments.map((t) => (
                        <li key={t.id} className="px-5 py-2.5">
                          <div className="truncate text-sm text-parchment-100">{t.name}</div>
                          <div className="mt-0.5 smallcaps text-[9px] text-parchment-400">
                            {t.status} · {t.players}/{t.max_players} players
                            {t.starts_at ? ` · ${new Date(t.starts_at).toLocaleString()}` : ""}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Message board */}
              <div className="plate flex h-fit flex-col overflow-hidden">
                <div className="border-b border-white/10 px-5 py-3 smallcaps text-[10px] text-parchment-400">
                  Club board
                </div>
                {isMember ? (
                  <form onSubmit={submitPost} className="border-b border-white/10 px-5 py-4">
                    <textarea
                      value={postText}
                      onChange={(e) => setPostText(e.target.value)}
                      maxLength={500}
                      rows={2}
                      placeholder={`Message the members of ${club.name}…`}
                      className="w-full resize-none border border-white/15 bg-ink-900/60 px-3 py-2 text-sm text-parchment focus:border-gold/60 focus:outline-none"
                    />
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {postError ? (
                        <span className="text-xs text-oxblood-glow">{postError}</span>
                      ) : (
                        <span className="text-[11px] text-parchment-500">Visible to everyone; members can post.</span>
                      )}
                      <button
                        type="submit"
                        disabled={!postText.trim()}
                        className="btn-leaf px-4 py-1.5 font-display text-xs font-semibold disabled:opacity-50"
                      >
                        Post
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="border-b border-white/10 px-5 py-3 text-sm text-parchment-400">
                    {me ? "Join the club to post on its board." : "Sign in and join to post."}
                  </p>
                )}
                {data.posts.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-parchment-400">Nothing posted yet.</p>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {data.posts.map((p) => (
                      <li key={p.id} className="group px-5 py-3">
                        <div className="flex items-center gap-2">
                          <PlayerAvatar name={p.username} avatar={p.avatar} size={20} />
                          <Link
                            href={`/u/${encodeURIComponent(p.username)}`}
                            className="text-sm font-medium text-parchment-100 hover:text-gold-leaf"
                          >
                            {p.username}
                          </Link>
                          <span className="text-[11px] text-parchment-500">{timeAgo(p.created_at)}</span>
                          {(mayModerate || p.user_id === me?.id) && (
                            <button
                              onClick={() => deletePost(p.id)}
                              className="ml-auto text-parchment-500 opacity-0 transition hover:text-oxblood-glow group-hover:opacity-100"
                              aria-label="Delete post"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-parchment-200">{p.text}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
