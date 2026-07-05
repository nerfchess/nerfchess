"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { AccountUser, fetchMe } from "@/lib/authClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Search, Users } from "lucide-react";

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
  const [query, setQuery] = useState("");
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

  // Client-side filter over the already-fetched list, lichess-teams-style:
  // one search box narrows both "Your clubs" and the full directory. No new
  // API call — we just re-slice what we already have.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clubs;
    return clubs.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.owner_name.toLowerCase().includes(q),
    );
  }, [clubs, query]);

  const yourClubs = useMemo(() => filtered.filter((c) => !!c.joined), [filtered]);

  return (
    <main className="min-h-screen pb-16">
      <SiteHeader active="/clubs" />

      <section className="mx-auto max-w-6xl px-5 sm:px-6">
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

          <div className="min-w-0 space-y-4">
            {/* Search: filters the whole directory in place, like lichess's
                team search box at the top of the teams list. */}
            <div className="plate flex items-center gap-2.5 px-4 py-2.5">
              <Search size={16} className="shrink-0 text-parchment-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search clubs by name, owner, or description"
                aria-label="Search clubs"
                className="w-full bg-transparent text-sm text-parchment placeholder:text-parchment-500 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="shrink-0 smallcaps text-[10px] text-parchment-400 hover:text-parchment-100"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Your clubs: the memberships this account already holds, lifted
                to the top the way lichess surfaces "Your teams". */}
            {yourClubs.length > 0 && (
              <div className="plate overflow-hidden">
                <div className="border-b border-white/10 px-5 py-3 smallcaps text-[10px] text-parchment-400">
                  Your clubs
                </div>
                <ul className="divide-y divide-white/5">
                  {yourClubs.map((club) => (
                    <ClubRow key={club.id} club={club} />
                  ))}
                </ul>
              </div>
            )}

            <div className="plate overflow-hidden">
              <div className="border-b border-white/10 px-5 py-3 smallcaps text-[10px] text-parchment-400">
                {query ? `${filtered.length} match${filtered.length === 1 ? "" : "es"}` : "All clubs"}
              </div>
              {filtered.length === 0 ? (
                <p className="px-5 py-8 text-sm text-parchment-400">
                  {clubs.length === 0
                    ? "No clubs yet. Create the first one."
                    : "No clubs match that search."}
                </p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {filtered.map((club) => (
                    <ClubRow key={club.id} club={club} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

// One directory row, lichess-teams-style: a monogram tile, the club name with
// its description on a second line, and the member count pinned to the right.
function ClubRow({ club }: { club: Club }) {
  return (
    <li>
      <Link
        href={`/clubs/${encodeURIComponent(club.slug)}`}
        className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/5"
      >
        <span
          aria-hidden
          className="grid h-11 w-11 shrink-0 place-items-center border border-white/10 bg-ink-900/60 font-display text-lg text-parchment-200"
        >
          {club.name.trim().charAt(0).toUpperCase() || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-display text-lg text-parchment-50">{club.name}</span>
            {!!club.joined && (
              <span className="shrink-0 border border-gold/40 px-1.5 py-0.5 smallcaps text-[8px] text-gold-leaf">
                Joined
              </span>
            )}
          </div>
          {club.description ? (
            <p className="mt-0.5 truncate text-sm text-parchment-300">{club.description}</p>
          ) : (
            <p className="mt-0.5 truncate text-sm italic text-parchment-500">No description.</p>
          )}
          <div className="mt-0.5 smallcaps text-[9px] text-parchment-400">owner {club.owner_name}</div>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 font-mono text-xs text-parchment-400">
          <Users size={13} />
          {club.members}
        </span>
      </Link>
    </li>
  );
}
