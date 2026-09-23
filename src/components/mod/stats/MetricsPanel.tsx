"use client";

// Who uses the site, from /api/mod/metrics (src/lib/server/metrics.ts is the
// single source of truth). Every number carries the sentence that defines it,
// and the exclusion rule is printed once above them all (brief section 16).

import { useEffect, useState } from "react";
import { SectionHead, StatGrid, whenShort } from "@/components/mod/ui";

interface DayCount {
  date: string;
  n: number;
}
interface Split {
  total: number;
  registered: number;
  guests: number;
}
interface SeatSplit {
  human: number;
  vsBot: number;
  botOnly: number;
}
interface Metrics {
  generatedAt: number;
  definitions: Record<string, string>;
  accounts: { registered: number; withEmail: number; guests: number; guestsWhoPlayed: number; excluded: { bots: number; tests: number } };
  signups: { today: number; last7d: number; last30d: number; daily: DayCount[]; weekly: DayCount[]; monthly: DayCount[] };
  active: { dau: Split; wau: Split; mau: Split; daily: DayCount[] };
  games: { daily: { date: string; nerf: SeatSplit; buff: SeatSplit }[]; today: SeatSplit; localBotGamesTotal: number };
  online: { humans: number | null; peakToday: number | null; peakAt: number | null; publicFigure: number | null; note: string | null };
}

const n = (v: number | null | undefined) => (v == null ? "n/a" : v.toLocaleString());

export function MetricsPanel() {
  const [m, setM] = useState<Metrics | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/mod/metrics")
      .then((r) => (r.ok ? (r.json() as Promise<Metrics>) : Promise.reject(r.status)))
      .then((data) => {
        if (live) setM(data);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, []);

  if (failed) return <p className="mt-8 text-sm text-parchment-300">Counts are unavailable right now. Try again in a minute.</p>;
  if (!m) return <p className="mt-8 text-sm text-parchment-400">Loading counts…</p>;
  const d = m.definitions;

  return (
    <div className="mt-10 space-y-8">
      <div>
        <SectionHead title="People" blurb={d.exclusion} />
        <p className="mt-1 max-w-2xl text-[13px] leading-snug text-parchment-400">
          {d.days} Excluded right now: {n(m.accounts.excluded.bots)} bot or seeded accounts, {n(m.accounts.excluded.tests)} test
          accounts. Updated {whenShort(m.generatedAt)}, refreshed at most once a minute.
        </p>
      </div>

      <div className="space-y-2">
        <SectionHead title="Online" blurb={d.online} />
        <StatGrid
          cols={3}
          items={[
            { label: "Humans online now", value: n(m.online.humans) },
            {
              label: "Peak today (humans)",
              value: n(m.online.peakToday),
              sub: m.online.peakAt ? `at ${new Date(m.online.peakAt).toISOString().slice(11, 16)} UTC` : undefined,
            },
            { label: "Public figure", value: n(m.online.publicFigure), sub: "Includes house personas (owner decision)" },
          ]}
        />
        {m.online.note && <p className="text-[13px] text-parchment-400">{m.online.note}</p>}
      </div>

      <div className="space-y-2">
        <SectionHead title="Accounts" blurb={`${d.registered} ${d.guests} ${d.email}`} />
        <StatGrid
          items={[
            { label: "Registered", value: n(m.accounts.registered) },
            { label: "With email", value: n(m.accounts.withEmail) },
            { label: "Guests who played", value: n(m.accounts.guestsWhoPlayed) },
            { label: "Guests, all", value: n(m.accounts.guests) },
          ]}
        />
      </div>

      <div className="space-y-2">
        <SectionHead title="Active users" blurb={d.active} />
        <StatGrid
          cols={3}
          items={(["dau", "wau", "mau"] as const).map((k) => ({
            label: k.toUpperCase(),
            value: n(m.active[k].total),
            sub: `${n(m.active[k].registered)} registered, ${n(m.active[k].guests)} guests`,
          }))}
        />
      </div>

      <div className="space-y-2">
        <SectionHead title="Sign-ups" blurb={d.signups} />
        <StatGrid
          cols={3}
          items={[
            { label: "Today", value: n(m.signups.today) },
            { label: "Last 7 days", value: n(m.signups.last7d) },
            { label: "Last 30 days", value: n(m.signups.last30d) },
          ]}
        />
        <DayBars series={m.signups.daily} label="Sign-ups per day, last 90 days" />
        <details className="text-[13px] text-parchment-300">
          <summary className="cursor-pointer text-parchment-400">By week and month</summary>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <CountTable title="Week starting" rows={m.signups.weekly} />
            <CountTable title="Month" rows={m.signups.monthly.map((r) => ({ ...r, date: r.date.slice(0, 7) }))} />
          </div>
        </details>
      </div>

      <div className="space-y-2">
        <SectionHead title="Games" blurb={d.games} />
        <StatGrid
          cols={4}
          items={[
            { label: "Human vs human today", value: n(m.games.today.human) },
            { label: "Human vs bot today", value: n(m.games.today.vsBot) },
            { label: "Bot vs bot today", value: n(m.games.today.botOnly) },
            { label: "Local bot games, all time", value: n(m.games.localBotGamesTotal) },
          ]}
        />
        <GamesTable days={m.games.daily} />
      </div>
    </div>
  );
}

/** One bar per UTC day, one series, so no legend: the label names it. Each bar
 *  carries its date and count as a tooltip and an accessible label; the week
 *  and month tables below are the table view. */
function DayBars({ series, label }: { series: DayCount[]; label: string }) {
  const max = Math.max(1, ...series.map((s) => s.n));
  return (
    <figure className="plate px-3.5 py-3">
      <figcaption className="text-[13px] text-parchment-400">
        {label} (peak {max.toLocaleString()})
      </figcaption>
      <div className="mt-2 flex h-24 items-end gap-px" role="list" aria-label={label}>
        {series.map((s) => (
          <span
            key={s.date}
            role="listitem"
            title={`${s.date}: ${s.n}`}
            aria-label={`${s.date}: ${s.n}`}
            className="flex h-full min-w-0 flex-1 items-end"
          >
            <span
              className={s.n > 0 ? "block w-full bg-parchment-400" : "block w-full bg-[color:var(--edge)]"}
              style={{ height: s.n > 0 ? `${Math.max(4, (s.n / max) * 100)}%` : "1px" }}
            />
          </span>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[13px] text-parchment-400">
        <span>{series[0]?.date}</span>
        <span>{series[series.length - 1]?.date}</span>
      </div>
    </figure>
  );
}

function CountTable({ title, rows }: { title: string; rows: DayCount[] }) {
  return (
    <table className="w-full text-left tabular-nums">
      <thead>
        <tr className="text-parchment-400">
          <th className="py-1 font-normal">{title}</th>
          <th className="py-1 text-right font-normal">Sign-ups</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.date} className="border-t border-[color:var(--edge)]">
            <td className="whitespace-nowrap py-1">{r.date}</td>
            <td className="py-1 text-right">{r.n.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GamesTable({ days }: { days: Metrics["games"]["daily"] }) {
  const rows = [...days].reverse().slice(0, 14);
  return (
    <div className="plate overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-[13px] tabular-nums">
        <thead>
          <tr className="text-parchment-400">
            <th className="px-3 py-2 font-normal">Day (UTC)</th>
            <th className="px-3 py-2 text-right font-normal">Nerf, human</th>
            <th className="px-3 py-2 text-right font-normal">Nerf, vs bot</th>
            <th className="px-3 py-2 text-right font-normal">Buff, human</th>
            <th className="px-3 py-2 text-right font-normal">Buff, vs bot</th>
            <th className="px-3 py-2 text-right font-normal">Bot vs bot</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.date} className="border-t border-[color:var(--edge)] text-parchment-200">
              <td className="whitespace-nowrap px-3 py-1.5">{r.date}</td>
              <td className="px-3 py-1.5 text-right">{r.nerf.human}</td>
              <td className="px-3 py-1.5 text-right">{r.nerf.vsBot}</td>
              <td className="px-3 py-1.5 text-right">{r.buff.human}</td>
              <td className="px-3 py-1.5 text-right">{r.buff.vsBot}</td>
              <td className="px-3 py-1.5 text-right">{r.nerf.botOnly + r.buff.botOnly}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
