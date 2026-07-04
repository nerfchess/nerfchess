"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { AccountUser, fetchMe } from "@/lib/authClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

interface Club {
  id: string;
  slug: string;
  name: string;
  description: string;
  owner_name: string;
  created_at: number;
  members: number;
  joined?: number;
}

export default function ClubsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AccountUser | null | undefined>(undefined);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/clubs");
    if (!res.ok) throw new Error("Could not load clubs.");
    const data = (await res.json()) as { clubs: Club[] };
    setClubs(data.clubs);
  };

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((me) => !cancelled && setUser(me));
    load().catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load clubs."));
    return () => {
      cancelled = true;
    };
  }, []);

  const createClub = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = (await res.json().catch(() => ({}))) as { club?: Club; error?: string };
      if (!res.ok || !data.club) throw new Error(data.error || "Could not create club.");
      router.push(`/clubs/${encodeURIComponent(data.club.slug)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create club.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen pb-16">
      <SiteHeader active="/clubs" />

      <section className="mx-auto max-w-5xl px-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl text-parchment-50">Clubs</h1>
            <p className="mt-2 text-parchment-300">Player groups for organizing games and events.</p>
          </div>
          <Link href="/tournaments" className="btn-ghost px-4 py-2 font-display text-sm">
            Tournaments
          </Link>
        </div>

        {error && (
          <div className="mt-5 plate border-oxblood-glow/60 bg-oxblood/15 px-4 py-3 text-sm text-parchment">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <form onSubmit={createClub} className="plate h-fit p-5">
            <div className="font-display text-2xl text-parchment">Create club</div>
            {user === undefined ? (
              <p className="mt-4 text-sm text-parchment-400">Checking account...</p>
            ) : !user ? (
              <p className="mt-4 text-sm text-parchment-400">
                <Link href="/login?next=/clubs" className="text-gold-leaf hover:underline">
                  Sign in
                </Link>{" "}
                to create a club.
              </p>
            ) : (
              <>
                <label className="mt-4 block smallcaps text-[10px] text-parchment-400" htmlFor="club-name">
                  Name
                </label>
                <input
                  id="club-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  className="mt-1 w-full border border-white/15 bg-ink-900/60 px-3 py-2 text-sm text-parchment focus:border-gold/60 focus:outline-none"
                />
                <label className="mt-3 block smallcaps text-[10px] text-parchment-400" htmlFor="club-description">
                  Description
                </label>
                <textarea
                  id="club-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={240}
                  rows={4}
                  className="mt-1 w-full resize-none border border-white/15 bg-ink-900/60 px-3 py-2 text-sm text-parchment focus:border-gold/60 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={busy || name.trim().length < 3}
                  className="btn-leaf mt-4 w-full px-4 py-2.5 font-display text-sm font-semibold disabled:opacity-50"
                >
                  {busy ? "Creating..." : "Create club"}
                </button>
              </>
            )}
          </form>

          <div className="plate overflow-hidden">
            <div className="border-b border-white/10 px-5 py-3 smallcaps text-[10px] text-parchment-400">
              {clubs.length} club{clubs.length === 1 ? "" : "s"}
            </div>
            {clubs.length === 0 ? (
              <p className="px-5 py-8 text-sm text-parchment-400">No clubs yet.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {clubs.map((club) => (
                  <li key={club.id}>
                    <Link
                      href={`/clubs/${encodeURIComponent(club.slug)}`}
                      className="block px-5 py-4 transition-colors hover:bg-white/5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-display text-xl text-parchment">{club.name}</span>
                            {!!club.joined && (
                              <span className="shrink-0 rounded-full border border-gold/40 px-2 py-0.5 smallcaps text-[8px] text-gold-leaf">
                                Joined
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 smallcaps text-[9px] text-parchment-400">
                            {club.members} member{club.members === 1 ? "" : "s"} - owner {club.owner_name}
                          </div>
                        </div>
                        <span className="btn-ghost px-3 py-1.5 font-display text-xs">Visit →</span>
                      </div>
                      {club.description && <p className="mt-2 text-sm text-parchment-300">{club.description}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
