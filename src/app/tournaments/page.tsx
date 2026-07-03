"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { AccountUser, ensureAccount } from "@/lib/authClient";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

interface Club {
  id: string;
  name: string;
}

interface Tournament {
  id: string;
  name: string;
  description: string;
  creator_name: string;
  club_id: string | null;
  club_name: string | null;
  format: string;
  starts_at: number | null;
  status: string;
  max_players: number;
  created_at: number;
  players: number;
}

const FORMAT_LABELS: Record<string, string> = {
  swiss: "Swiss",
  arena: "Arena",
  "single-elim": "Single elimination",
};

export default function TournamentsPage() {
  const [user, setUser] = useState<AccountUser | null | undefined>(undefined);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState("swiss");
  const [clubId, setClubId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(16);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedClubName = useMemo(
    () => clubs.find((club) => club.id === clubId)?.name ?? null,
    [clubId, clubs],
  );

  const load = async () => {
    const [tournamentRes, clubRes] = await Promise.all([fetch("/api/tournaments"), fetch("/api/clubs")]);
    if (!tournamentRes.ok || !clubRes.ok) throw new Error("Could not load tournaments.");
    const tournamentData = (await tournamentRes.json()) as { tournaments: Tournament[] };
    const clubData = (await clubRes.json()) as { clubs: Club[] };
    setTournaments(tournamentData.tournaments);
    setClubs(clubData.clubs);
  };

  useEffect(() => {
    let cancelled = false;
    const initialClub = new URLSearchParams(window.location.search).get("club");
    if (initialClub) setClubId(initialClub);
    ensureAccount().then((me) => !cancelled && setUser(me));
    load().catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load tournaments."));
    return () => {
      cancelled = true;
    };
  }, []);

  const createTournament = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const starts = startsAt ? new Date(startsAt).getTime() : null;
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          format,
          clubId: clubId || null,
          startsAt: Number.isFinite(starts) ? starts : null,
          maxPlayers,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { tournament?: Tournament; error?: string };
      if (!res.ok || !data.tournament) throw new Error(data.error || "Could not create tournament.");
      const created = {
        ...data.tournament,
        club_name: selectedClubName,
      };
      setTournaments((list) => [created, ...list]);
      setName("");
      setDescription("");
      setStartsAt("");
      setMaxPlayers(16);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create tournament.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen pb-16">
      <SiteHeader active="/tournaments" />

      <section className="mx-auto max-w-5xl px-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl text-parchment-50">Tournaments</h1>
            <p className="mt-2 text-parchment-300">Scheduled events for the Nerfchess ladder.</p>
          </div>
          <Link href="/clubs" className="btn-ghost px-4 py-2 font-display text-sm">
            Clubs
          </Link>
        </div>

        {error && (
          <div className="mt-5 plate border-oxblood-glow/60 bg-oxblood/15 px-4 py-3 text-sm text-parchment">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <form onSubmit={createTournament} className="plate h-fit p-5">
            <div className="font-display text-2xl text-parchment">Create tournament</div>
            {user === undefined ? (
              <p className="mt-4 text-sm text-parchment-400">Checking account...</p>
            ) : !user ? (
              <p className="mt-4 text-sm text-parchment-400">
                <Link href="/login?next=/tournaments" className="text-gold-leaf hover:underline">
                  Sign in
                </Link>{" "}
                to create a tournament.
              </p>
            ) : (
              <>
                <label className="mt-4 block smallcaps text-[10px] text-parchment-400" htmlFor="tournament-name">
                  Name
                </label>
                <input
                  id="tournament-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={70}
                  className="mt-1 w-full border border-white/15 bg-ink-900/60 px-3 py-2 text-sm text-parchment focus:border-gold/60 focus:outline-none"
                />
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block smallcaps text-[10px] text-parchment-400" htmlFor="tournament-format">
                      Format
                    </label>
                    <select
                      id="tournament-format"
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      className="mt-1 w-full border border-white/15 bg-ink-900/60 px-3 py-2 text-sm text-parchment focus:border-gold/60 focus:outline-none"
                    >
                      {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block smallcaps text-[10px] text-parchment-400" htmlFor="tournament-max">
                      Seats
                    </label>
                    <input
                      id="tournament-max"
                      type="number"
                      min={2}
                      max={256}
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(Number(e.target.value))}
                      className="mt-1 w-full border border-white/15 bg-ink-900/60 px-3 py-2 text-sm text-parchment focus:border-gold/60 focus:outline-none"
                    />
                  </div>
                </div>
                <label className="mt-3 block smallcaps text-[10px] text-parchment-400" htmlFor="tournament-club">
                  Club
                </label>
                <select
                  id="tournament-club"
                  value={clubId}
                  onChange={(e) => setClubId(e.target.value)}
                  className="mt-1 w-full border border-white/15 bg-ink-900/60 px-3 py-2 text-sm text-parchment focus:border-gold/60 focus:outline-none"
                >
                  <option value="">Open event</option>
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                    </option>
                  ))}
                </select>
                <label className="mt-3 block smallcaps text-[10px] text-parchment-400" htmlFor="tournament-start">
                  Starts
                </label>
                <input
                  id="tournament-start"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="mt-1 w-full border border-white/15 bg-ink-900/60 px-3 py-2 text-sm text-parchment focus:border-gold/60 focus:outline-none"
                />
                <label className="mt-3 block smallcaps text-[10px] text-parchment-400" htmlFor="tournament-description">
                  Description
                </label>
                <textarea
                  id="tournament-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={280}
                  rows={3}
                  className="mt-1 w-full resize-none border border-white/15 bg-ink-900/60 px-3 py-2 text-sm text-parchment focus:border-gold/60 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={busy || name.trim().length < 3}
                  className="btn-leaf mt-4 w-full px-4 py-2.5 font-display text-sm font-semibold disabled:opacity-50"
                >
                  {busy ? "Creating..." : "Create tournament"}
                </button>
              </>
            )}
          </form>

          <div className="plate overflow-hidden">
            <div className="border-b border-white/10 px-5 py-3 smallcaps text-[10px] text-parchment-400">
              {tournaments.length} event{tournaments.length === 1 ? "" : "s"}
            </div>
            {tournaments.length === 0 ? (
              <p className="px-5 py-8 text-sm text-parchment-400">No tournaments yet.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {tournaments.map((tournament) => (
                  <li key={tournament.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-display text-xl text-parchment">{tournament.name}</div>
                        <div className="mt-0.5 smallcaps text-[9px] text-parchment-400">
                          {FORMAT_LABELS[tournament.format] ?? tournament.format} - {tournament.players}/{tournament.max_players} players
                          {tournament.club_name ? ` - ${tournament.club_name}` : ""}
                        </div>
                      </div>
                      <span className="border border-gold/30 bg-gold/10 px-2 py-1 smallcaps text-[9px] text-gold-leaf">
                        {tournament.status}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-parchment-400">
                      {tournament.starts_at
                        ? new Date(tournament.starts_at).toLocaleString()
                        : "Start time not set"}{" "}
                      - created by {tournament.creator_name}
                    </div>
                    {tournament.description && <p className="mt-2 text-sm text-parchment-300">{tournament.description}</p>}
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
