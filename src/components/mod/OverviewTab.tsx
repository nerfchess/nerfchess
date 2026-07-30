"use client";

import { useEffect, useState } from "react";

// The moderator overview: the first thing a moderator should see, because until
// now /mod opened straight onto the report queue and there was nowhere at all to
// answer "is the site healthy" or "are the house bots telling the truth".
//
// The house table is the reason this page exists. A bot advertising 1450 should
// score about half its games against humans; a tier scoring 80% is rated too low
// and one scoring 20% is rated too high, and nothing else on the site can tell
// you which. After the 2026-07 rating re-spread that question has teeth: the
// tiers above 2200 knowingly advertise more than the engine can back (see
// docs/house-bots.md), and this is where that shows up as a number.

interface Overview {
  generatedAt: number;
  accounts: {
    membersToday: number;
    membersWeek: number;
    guestsToday: number;
    guestsWeek: number;
    membersTotal: number;
  };
  queue: {
    openReports: number;
    unreviewedChatFlags: number;
    activeMutes: number;
    activeBans: number;
    modActionsWeek: number;
  };
  games: {
    humanGamesLast15Min: number;
    today: { total: number; humanVsHuman: number; humanVsHouse: number };
    week: { total: number; humanVsHuman: number; humanVsHouse: number };
    month: { total: number };
    avgDurationMs: number | null;
  };
  endings: {
    total: number;
    flagged: number;
    abandoned: number;
    resigned: number;
    decided: number;
    drawn: number;
  };
  house: {
    windowDays: number;
    vsHumanGames: number;
    tiers: {
      skill: number;
      played: number;
      won: number;
      drawn: number;
      lost: number;
      scorePct: number | null;
    }[];
  };
  nerfBalance: {
    windowDays: number;
    minSample: number;
    strongest: { id: string; picks: number; winPct: number }[];
    weakest: { id: string; picks: number; winPct: number }[];
  };
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "warn" | "good";
}) {
  return (
    <div className="plate p-4">
      <div className="smallcaps text-[11px] text-parchment-400">{label}</div>
      <div
        className={
          "mt-1 font-display text-2xl tabular-nums " +
          (tone === "warn" ? "text-oxblood-glow" : tone === "good" ? "text-verdigris-glow" : "text-parchment-50")
        }
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] leading-snug text-parchment-400">{sub}</div>}
    </div>
  );
}

function pct(part: number, whole: number): string {
  if (!whole) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

function duration(ms: number | null): string {
  if (ms == null) return "n/a";
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

/** How far a tier's score sits from a fair 50%, and whether that is worth
 * flagging. A small sample says nothing, so it is never flagged. */
function tierVerdict(scorePct: number | null, played: number): { text: string; tone?: "warn" } {
  if (scorePct == null || played < 20) return { text: "too few games" };
  const drift = scorePct - 50;
  if (Math.abs(drift) <= 10) return { text: "about right" };
  return {
    text: drift > 0 ? `rated ~${Math.round(drift * 7)} too low` : `rated ~${Math.round(-drift * 7)} too high`,
    tone: "warn",
  };
}

export function OverviewTab() {
  const [data, setData] = useState<Overview | null | "error">(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [webhook, setWebhook] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/mod/overview")
      .then((r) => (r.ok ? (r.json() as Promise<Overview>) : Promise.reject(new Error(String(r.status)))))
      .then((json) => setData(json))
      .catch(() => setData("error"));
    fetch("/api/mod/notify-test")
      .then((r) => (r.ok ? (r.json() as Promise<{ configured: boolean }>) : { configured: false }))
      .then((j) => setWebhook(!!j.configured))
      .catch(() => setWebhook(false));
  }, []);

  if (data === null) return <div className="text-parchment-300">Loading overview…</div>;
  if (data === "error") return <div className="text-oxblood-glow">Could not load the overview.</div>;

  const { accounts, queue, games, endings, house, nerfBalance } = data;
  const queueTotal = queue.openReports + queue.unreviewedChatFlags;

  return (
    <div className="space-y-8">
      {/* Anything needing a human decision, first. */}
      <section>
        <h2 className="font-display text-lg text-parchment-100">Needs attention</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Open reports"
            value={queue.openReports}
            tone={queue.openReports > 0 ? "warn" : "good"}
          />
          <Stat
            label="Chat flags"
            value={queue.unreviewedChatFlags}
            sub="unreviewed"
            tone={queue.unreviewedChatFlags > 0 ? "warn" : "good"}
          />
          <Stat label="Active mutes" value={queue.activeMutes} />
          <Stat label="Active bans" value={queue.activeBans} />
        </div>
        {queueTotal === 0 && (
          <p className="mt-2 text-[12px] text-parchment-400">Queue is clear.</p>
        )}
      </section>

      {/* Real people, kept strictly separate from house accounts. */}
      <section>
        <h2 className="font-display text-lg text-parchment-100">Humans</h2>
        <p className="mt-1 text-[12px] text-parchment-400">
          House accounts (<code>hp_</code>) and the retired seeded ones (<code>seed_</code>) are
          excluded from every number here.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Signups today" value={accounts.membersToday} sub={`${accounts.membersWeek} this week`} />
          <Stat label="Guests today" value={accounts.guestsToday} sub={`${accounts.guestsWeek} this week`} />
          <Stat label="Members, all time" value={accounts.membersTotal} />
          <Stat
            label="Human games, 15 min"
            value={games.humanGamesLast15Min}
            sub="finished recently"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Human games today"
            value={games.today.total}
            sub={`${games.today.humanVsHuman} vs human · ${games.today.humanVsHouse} vs house`}
          />
          <Stat
            label="This week"
            value={games.week.total}
            sub={`${pct(games.week.humanVsHuman, games.week.total)} human-vs-human`}
          />
          <Stat label="Last 30 days" value={games.month.total} />
          <Stat label="Average game" value={duration(games.avgDurationMs)} sub="this week" />
        </div>
      </section>

      {/* How games end: the abandon share is the loudest product signal here. */}
      <section>
        <h2 className="font-display text-lg text-parchment-100">How human games ended</h2>
        <p className="mt-1 text-[12px] text-parchment-400">
          Last 7 days, {endings.total} games. A rising abandon share is the loudest signal that
          something mid-game is driving people off.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Decided" value={pct(endings.decided, endings.total)} sub={`${endings.decided} games`} />
          <Stat label="Resigned" value={pct(endings.resigned, endings.total)} sub={`${endings.resigned} games`} />
          <Stat label="Flagged" value={pct(endings.flagged, endings.total)} sub={`${endings.flagged} on time`} />
          <Stat
            label="Abandoned"
            value={pct(endings.abandoned, endings.total)}
            sub={`${endings.abandoned} games`}
            tone={endings.total > 20 && endings.abandoned / endings.total > 0.15 ? "warn" : undefined}
          />
          <Stat label="Drawn" value={pct(endings.drawn, endings.total)} sub={`${endings.drawn} games`} />
        </div>
      </section>

      {/* The house-bot honesty check. */}
      <section>
        <h2 className="font-display text-lg text-parchment-100">House bots against humans</h2>
        <p className="mt-1 text-[12px] leading-snug text-parchment-400">
          Last {house.windowDays} days, {house.vsHumanGames} games where a house seat faced a human.
          Score counts a draw as half a point, so a fairly rated tier should sit near 50%. A tier
          well above that is rated too low for how it plays, and vice versa. The drift estimate is a
          rough Elo reading, not a calculation to act on blindly.
        </p>
        {house.tiers.length === 0 ? (
          <p className="mt-3 text-[12px] text-parchment-400">
            No house-vs-human games archived in this window yet.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-[13px]">
              <thead className="smallcaps text-[11px] text-parchment-400">
                <tr>
                  <th className="py-1.5 pr-3">Tier</th>
                  <th className="py-1.5 pr-3">Games</th>
                  <th className="py-1.5 pr-3">W / D / L</th>
                  <th className="py-1.5 pr-3">Score</th>
                  <th className="py-1.5">Reading</th>
                </tr>
              </thead>
              <tbody className="text-parchment-100">
                {house.tiers.map((t) => {
                  const verdict = tierVerdict(t.scorePct, t.played);
                  return (
                    <tr key={t.skill} className="border-t border-white/5">
                      <td className="py-1.5 pr-3 font-mono tabular-nums">{t.skill}</td>
                      <td className="py-1.5 pr-3 tabular-nums">{t.played}</td>
                      <td className="py-1.5 pr-3 tabular-nums text-parchment-300">
                        {t.won} / {t.drawn} / {t.lost}
                      </td>
                      <td className="py-1.5 pr-3 tabular-nums">
                        {t.scorePct == null ? "n/a" : `${t.scorePct}%`}
                      </td>
                      <td
                        className={
                          "py-1.5 text-[12px] " +
                          (verdict.tone === "warn" ? "text-oxblood-glow" : "text-parchment-400")
                        }
                      >
                        {verdict.text}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Nerf balance, which doubles as the balance dataset. */}
      {(nerfBalance.strongest.length > 0 || nerfBalance.weakest.length > 0) && (
        <section>
          <h2 className="font-display text-lg text-parchment-100">Nerf win rates</h2>
          <p className="mt-1 text-[12px] text-parchment-400">
            Last {nerfBalance.windowDays} days, human games only, at least {nerfBalance.minSample}{" "}
            picks. A nerf is a handicap, so a HIGH win rate means it is not costing its owner enough.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {(
              [
                ["Least punishing", nerfBalance.strongest],
                ["Most punishing", nerfBalance.weakest],
              ] as const
            ).map(([label, rows]) => (
              <div key={label}>
                <div className="smallcaps text-[11px] text-parchment-400">{label}</div>
                <ul className="mt-1.5 space-y-1">
                  {rows.map((r) => (
                    <li key={r.id} className="flex items-baseline justify-between gap-3 text-[13px]">
                      <code className="truncate text-parchment-200">{r.id}</code>
                      <span className="shrink-0 tabular-nums text-parchment-300">
                        {r.winPct}% · {r.picks}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Outbound notifications. */}
      <section>
        <h2 className="font-display text-lg text-parchment-100">Notifications</h2>
        <p className="mt-1 text-[12px] leading-snug text-parchment-400">
          {webhook === null
            ? "Checking…"
            : webhook
            ? "A webhook is configured: every moderator action appends a row to the sheet."
            : "No webhook configured. See docs/mod-notifications.md to point MOD_WEBHOOK_URL at a Google Apps Script."}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            disabled={!webhook || testing === "sending"}
            onClick={async () => {
              setTesting("sending");
              try {
                const res = await fetch("/api/mod/notify-test", { method: "POST" });
                const json = (await res.json()) as { sent?: boolean; error?: string };
                setTesting(json.sent ? "Sent. Check the spreadsheet." : json.error ?? "Failed.");
              } catch {
                setTesting("Failed to send.");
              }
            }}
            className="btn-ghost press px-3 py-1.5 text-[13px] disabled:opacity-40"
          >
            Send test event
          </button>
          {testing && testing !== "sending" && (
            <span className="text-[12px] text-parchment-300">{testing}</span>
          )}
        </div>
      </section>

      <p className="text-[11px] text-parchment-500">
        Generated {new Date(data.generatedAt).toISOString()}.
      </p>
    </div>
  );
}
