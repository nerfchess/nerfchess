"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Crown, Flame, LogIn, LogOut, Timer, Trophy, Users } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { SiteHeader } from "@/components/SiteHeader";
import { AccountUser, fetchMe } from "@/lib/authClient";
import type { StandingRow, TournamentDetail } from "@/app/api/tournaments/[id]/route";
import {
  clockLabel,
  countdownLabel,
  durationLabel,
  formatLabel,
  modeLabel,
  tournamentPhase,
} from "@/lib/tournaments";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/Button";

type DetailResponse = {
  tournament: TournamentDetail;
  standings: StandingRow[];
  entered: boolean;
};

const MEDALS = ["#d8b56e", "#c7c5c1", "#c79468"]; // gold, silver, bronze

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [me, setMe] = useState<AccountUser | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${encodeURIComponent(id)}`);
    if (!res.ok) {
      throw new Error(res.status === 404 ? "That tournament doesn't exist." : "Could not load the tournament.");
    }
    setData((await res.json()) as DetailResponse);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load the tournament.");
      }
    })();
    fetchMe().then((u) => !cancelled && setMe(u));
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(tick);
    };
  }, [load]);

  const t = data?.tournament;
  // Recompute the phase against the live clock so the page transitions on its
  // own, rather than trusting the snapshot the server returned.
  const phase = useMemo(
    () => (t ? tournamentPhase(t.starts_at, t.duration_min, now) : "upcoming"),
    [t, now],
  );

  const entry = async (action: "join" | "withdraw") => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tournaments/${encodeURIComponent(id)}/entry`, {
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

  if (error && !data) {
    return (
      <main className="min-h-screen">
        <SiteHeader active="/tournaments" />
        <section className="mx-auto max-w-3xl px-6 py-16 text-center">
          <p className="text-parchment-300">{error}</p>
          <LinkButton tone="ghost" href="/tournaments" className="mt-4 inline-block px-4 py-2 text-sm">
            Back to tournaments
          </LinkButton>
        </section>
      </main>
    );
  }

  const standings = data?.standings ?? [];
  const entered = data?.entered ?? false;
  const podium = phase === "finished" ? standings.slice(0, 3) : [];

  return (
    <main className="min-h-screen pb-16">
      <SiteHeader active="/tournaments" />
      <section className="mx-auto max-w-6xl px-5 sm:px-6">
        {!t ? (
          <p className="py-16 text-center text-sm text-parchment-400">Loading...</p>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 smallcaps text-[11px] text-parchment-400">
                  <Trophy size={13} className="text-gold-leaf" />
                  <Link href="/tournaments" className="hover:text-gold-leaf">
                    Tournaments
                  </Link>
                </div>
                <h1 className="mt-1 break-words font-display text-3xl text-parchment-50 sm:text-5xl">{t.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ModeTag mode={t.mode} />
                  <span className="border border-white/15 px-2 py-0.5 font-mono text-xs text-parchment-200">
                    {clockLabel(t.clock_time_sec, t.clock_increment_sec)}
                  </span>
                  <span className="border border-white/15 px-2 py-0.5 smallcaps text-[11px] text-parchment-300">
                    {formatLabel(t.format)}
                  </span>
                  <span
                    className={
                      "border px-2 py-0.5 smallcaps text-[11px] " +
                      (t.rated ? "border-gold/40 text-gold-leaf" : "border-white/15 text-parchment-400")
                    }
                  >
                    {t.rated ? "Rated" : "Casual"}
                  </span>
                  {t.club_name && t.club_id && (
                    <Link
                      href={`/clubs`}
                      className="border border-white/15 px-2 py-0.5 smallcaps text-[11px] text-parchment-300 hover:text-gold-leaf"
                    >
                      {t.club_name}
                    </Link>
                  )}
                </div>
              </div>

              {/* Join / withdraw */}
              <div className="flex flex-col items-end gap-1">
                {me === undefined ? null : phase === "finished" ? (
                  <span className="smallcaps text-[11px] text-parchment-500">Event over</span>
                ) : !me ? (
                  <LinkButton tone="leaf"
                    href={`/login?next=/tournaments/${encodeURIComponent(id)}`}
                    className="flex px-5 py-2.5 text-sm font-semibold">
                    <LogIn size={15} /> Sign in to join
                  </LinkButton>
                ) : entered ? (
                  <Button tone="ghost"
                    onClick={() => entry("withdraw")}
                    disabled={busy}
                    className="flex px-5 py-2.5 text-sm disabled:opacity-50">
                    <LogOut size={15} /> Withdraw
                  </Button>
                ) : (
                  <Button tone="cta"
                    onClick={() => entry("join")}
                    disabled={busy}
                    className="flex px-6 py-2.5 text-sm font-semibold disabled:opacity-50">
                    <LogIn size={15} /> Join
                  </Button>
                )}
                {entered && phase !== "finished" && (
                  <span className="smallcaps text-[11px] text-verdigris-glow">You are in</span>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-5 plate border-oxblood-glow/60 bg-oxblood/15 px-4 py-3 text-sm text-parchment">
                {error}
              </div>
            )}

            {/* Countdown / status banner */}
            <Countdown t={t} phase={phase} now={now} />

            {t.description && <p className="mt-4 max-w-3xl text-parchment-300">{t.description}</p>}

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              {/* Standings */}
              <div className="min-w-0 space-y-4">
                {podium.length > 0 && <Podium podium={podium} />}

                <div className="plate overflow-hidden">
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 px-5 py-3">
                    <span className="smallcaps text-[11px] text-parchment-400">Standings</span>
                    <span className="flex items-center gap-1.5 smallcaps text-[11px] text-parchment-500">
                      <Users size={12} /> {standings.length}/{t.max_players}
                    </span>
                  </div>
                  {standings.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-parchment-400">
                      No players yet. {phase !== "finished" ? "Be the first to join." : ""}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/10 text-left smallcaps text-[11px] text-parchment-500">
                            <th scope="col" className="px-3 py-2 text-right font-medium">
                              #
                            </th>
                            <th scope="col" className="px-2 py-2 font-medium">
                              Player
                            </th>
                            <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">
                              Rating
                            </th>
                            <th scope="col" className="px-3 py-2 text-right font-medium">
                              Score
                            </th>
                            <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">
                              Perf
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {standings.map((s, i) => {
                            const isMe = me?.id === s.user_id;
                            const isCreator = s.user_id === t.creator_user_id;
                            return (
                              <tr key={s.user_id} className={isMe ? "bg-gold/10" : "transition-colors hover:bg-white/5"}>
                                <td className="px-3 py-2 text-right font-mono text-xs text-parchment-500">{i + 1}</td>
                                <td className="px-2 py-2">
                                  <div className="flex items-center gap-2.5">
                                    <PlayerAvatar name={s.username} avatar={s.avatar} size={26} />
                                    <Link
                                      href={`/u/${encodeURIComponent(s.username)}`}
                                      className="min-w-0 truncate text-parchment-100 hover:text-gold-leaf"
                                    >
                                      {s.username}
                                    </Link>
                                    {s.flair && <span aria-hidden>{s.flair}</span>}
                                    {isCreator && <Crown size={12} className="shrink-0 text-gold-leaf" aria-label="Host" />}
                                    {s.streak >= 3 && <Flame size={12} className="shrink-0 text-oxblood-glow" aria-label="On a streak" />}
                                  </div>
                                </td>
                                <td className="hidden px-3 py-2 text-right font-mono text-xs text-parchment-400 sm:table-cell">
                                  {Math.round(s.rating)}
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-sm font-semibold text-parchment-50">
                                  {s.score}
                                </td>
                                <td className="hidden px-3 py-2 text-right font-mono text-xs text-parchment-400 sm:table-cell">
                                  {s.performance != null ? Math.round(s.performance) : "-"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="border-t border-white/10 px-5 py-2.5 text-[11px] text-parchment-500">
                    Standings seed by rating until pairing begins. Live pairing and scoring arrive in a later update.
                  </p>
                </div>
              </div>

              {/* Info sidebar */}
              <aside className="space-y-4">
                <div className="plate overflow-hidden">
                  <div className="border-b border-white/10 px-5 py-3 smallcaps text-[11px] text-parchment-400">
                    Details
                  </div>
                  <dl className="divide-y divide-white/5">
                    <InfoRow label="Time control" value={clockLabel(t.clock_time_sec, t.clock_increment_sec)} mono />
                    <InfoRow label="Mode" value={modeLabel(t.mode)} />
                    <InfoRow label="Rated" value={t.rated ? "Yes" : "Casual"} />
                    <InfoRow label="Format" value={formatLabel(t.format)} />
                    <InfoRow label="Duration" value={durationLabel(t.duration_min)} />
                    <InfoRow
                      label="Starts"
                      value={t.starts_at ? new Date(t.starts_at).toLocaleString() : "To be announced"}
                    />
                    <InfoRow label="Entrants" value={`${standings.length} / ${t.max_players}`} />
                  </dl>
                </div>

                <div className="plate px-5 py-4">
                  <div className="smallcaps text-[11px] text-parchment-400">Host</div>
                  <Link
                    href={`/u/${encodeURIComponent(t.creator_name)}`}
                    className="mt-1.5 flex items-center gap-1.5 text-sm text-parchment-100 hover:text-gold-leaf"
                  >
                    <Crown size={13} className="text-gold-leaf" /> {t.creator_name}
                  </Link>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-parchment-500">
                    <CalendarDays size={12} /> Created {new Date(t.created_at).toLocaleDateString()}
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function Countdown({ t, phase, now }: { t: TournamentDetail; phase: string; now: number }) {
  const endsAt = t.starts_at == null ? null : t.starts_at + t.duration_min * 60_000;

  let kicker: string;
  let big: string;
  let tone = "text-parchment-50";
  if (phase === "ongoing" && endsAt != null) {
    kicker = "In progress";
    big = `${countdownLabel(endsAt - now)} left`;
    tone = "text-verdigris-glow";
  } else if (phase === "finished") {
    kicker = "Finished";
    big = t.starts_at ? new Date(t.starts_at).toLocaleDateString() : "Completed";
    tone = "text-parchment-300";
  } else if (t.starts_at == null) {
    kicker = "Starting";
    big = "Date to be announced";
  } else {
    kicker = "Starts in";
    big = countdownLabel(t.starts_at - now);
    tone = "text-gold-leaf";
  }

  return (
    <div className="mt-5 plate flex items-center gap-4 px-5 py-4">
      <Timer size={22} className="shrink-0 text-parchment-400" aria-hidden />
      <div>
        <div className="smallcaps text-[11px] text-parchment-400">{kicker}</div>
        <div className={"font-display text-2xl tabular-nums sm:text-3xl " + tone} aria-live="polite">
          {big}
        </div>
      </div>
    </div>
  );
}

function Podium({ podium }: { podium: StandingRow[] }) {
  // Classic center-tall arrangement: silver, gold, bronze.
  const order = [podium[1], podium[0], podium[2]].filter(Boolean) as StandingRow[];
  const rankOf = (s: StandingRow) => podium.indexOf(s);
  return (
    <div className="plate px-5 py-6">
      <div className="mb-4 flex items-center gap-2 smallcaps text-[11px] text-parchment-400">
        <Trophy size={13} className="text-gold-leaf" /> Podium
      </div>
      <div className="flex items-end justify-center gap-4 sm:gap-8">
        {order.map((s) => {
          const rank = rankOf(s);
          const size = rank === 0 ? 64 : 48;
          return (
            <div key={s.user_id} className="flex flex-col items-center gap-1.5">
              <span className="font-display text-lg" style={{ color: MEDALS[rank] }}>
                {rank + 1}
              </span>
              <PlayerAvatar name={s.username} avatar={s.avatar} size={size} />
              <Link
                href={`/u/${encodeURIComponent(s.username)}`}
                className="max-w-[6rem] truncate text-sm text-parchment-100 hover:text-gold-leaf"
              >
                {s.username}
              </Link>
              <span className="font-mono text-xs text-parchment-400">{s.score} pts</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-2.5">
      <dt className="smallcaps text-[11px] text-parchment-500">{label}</dt>
      <dd className={"text-sm text-parchment-100 " + (mono ? "font-mono" : "")}>{value}</dd>
    </div>
  );
}

function ModeTag({ mode }: { mode: string }) {
  const cls = mode === "buff" ? "border-mode-buff/40 text-mode-buffGlow" : "border-mode-nerf/40 text-mode-nerfGlow";
  return <span className={"border px-2 py-0.5 smallcaps text-[11px] " + cls}>{modeLabel(mode)}</span>;
}
