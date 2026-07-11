"use client";

// Moderation panel (Lichess-inspired): report queue, flagged chat, player
// lookup with mute/ban actions, rule suggestions, and the audit log.
// Server-side authorization happens in the /api/mod routes; this page just
// hides itself from non-mods.

import { ALL_NERFS } from "@/engine/nerfs/library";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AccountUser, fetchMe } from "@/lib/authClient";
import { isGodPanelUser } from "@/lib/godPanel";
import { ModeBadge } from "@/components/ModeBadge";

type Tab = "reports" | "games" | "chat" | "users" | "suggestions" | "rules" | "buffs" | "log";

interface Report {
  id: string;
  reporter_name: string;
  reported_name: string;
  reason: string;
  description: string;
  game_id: string | null;
  status: string;
  handled_by: string | null;
  created_at: number;
}

interface ChatFlag {
  id: string;
  match_id: string;
  username: string;
  text: string;
  matched_words: string;
  created_at: number;
  reviewed: number;
}

interface ModUser {
  id: string;
  username: string;
  role: string;
  rating: number;
  games: number;
  created_at: number;
  muted_until: number | null;
  banned_until: number | null;
}

interface HistoryEntry {
  mod_name: string;
  target_name?: string;
  action: string;
  expires_at: number | null;
  note: string | null;
  created_at: number;
}

interface Suggestion {
  id: string;
  name: string;
  description: string;
  contact: string | null;
  username: string | null;
  created_at: number;
  // 'nerf' or 'buff'; rows from before the buff form default to 'nerf'.
  kind: string | null;
  // For buff ideas: 'buff' (Buff mode card) or 'boon' (Nerf-mode boon).
  pool: string | null;
}

const DURATIONS: { label: string; ms: number | null }[] = [
  { label: "1 hour", ms: 60 * 60 * 1000 },
  { label: "1 day", ms: 24 * 60 * 60 * 1000 },
  { label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "30 days", ms: 30 * 24 * 60 * 60 * 1000 },
  { label: "Permanent", ms: null },
];

function when(ts: number): string {
  return new Date(ts).toLocaleString();
}

function untilLabel(ts: number | null): string {
  if (!ts || ts <= Date.now()) return "";
  return ts > Date.now() + 50 * 365 * 24 * 60 * 60 * 1000 ? "permanently" : `until ${when(ts)}`;
}

async function postJson(path: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return { ok: res.ok, error: data.error };
}

export default function ModPage() {
  const [me, setMe] = useState<AccountUser | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("reports");

  useEffect(() => {
    fetchMe().then(setMe);
  }, []);

  const isMod = me && (me.role === "mod" || me.role === "admin");
  // The god panel is the owners' personal tool, so its toggle only shows for a
  // god-panel account (matched case-insensitively, like the game server).
  const isOwner = !!me && isGodPanelUser(me.username);

  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-5 sm:px-10 py-6">
        <Link href="/" className="font-display text-2xl tracking-tight">
          nerf<span className="text-gold-leaf">chess</span>
        </Link>
        <div className="flex items-center gap-3 text-sm font-medium">
          <Link href="/lobby" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Play</Link>
          <Link href="/leaderboard" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Leaderboard</Link>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-6 py-8">
        {me === undefined ? (
          <div className="text-parchment-300">Loading…</div>
        ) : !isMod ? (
          <>
            <h1 className="font-display text-4xl">Moderation</h1>
            <p className="mt-3 text-parchment-200">
              This page is for moderators.{" "}
              {!me && (
                <Link href="/login" className="text-gold-leaf hover:underline">Sign in</Link>
              )}
            </p>
          </>
        ) : (
          <>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <h1 className="font-display text-4xl">Moderation</h1>
              <span className="flex items-center gap-3">
                <Link href="/mod/cards" className="text-sm text-gold-leaf hover:underline">
                  Card editor
                </Link>
                <Link href="/mod/stats" className="text-sm text-gold-leaf hover:underline">
                  Site stats
                </Link>
                <span className="smallcaps text-xs text-parchment-400">
                  signed in as {me.username} · {me.role}
                </span>
              </span>
            </div>

            <HouseBotsToggle />
            {isOwner && <GodPanelToggle />}

            <div className="mt-6 flex flex-wrap gap-1 border-b border-white/10 pb-px">
              {(
                [
                  ["reports", "Reports"],
                  ["games", "Games"],
                  ["chat", "Chat flags"],
                  ["users", "Players"],
                  ["suggestions", "Suggestions"],
                  ["rules", "Nerf feedback"],
                  ["buffs", "Buff feedback"],
                  ["log", "Mod log"],
                ] as [Tab, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-4 py-2 text-sm font-display border-b-2 transition ${
                    tab === key
                      ? "border-gold text-gold-leaf"
                      : "border-transparent text-parchment-300 hover:text-parchment-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-6">
              {tab === "reports" && <ReportsTab />}
              {tab === "games" && <GamesTab />}
              {tab === "chat" && <ChatFlagsTab />}
              {tab === "users" && <UsersTab isAdmin={me.role === "admin"} />}
              {tab === "suggestions" && <SuggestionsTab />}
              {tab === "rules" && <RuleFeedbackTab />}
              {tab === "buffs" && <BuffFeedbackTab />}
              {tab === "log" && <LogTab />}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

// ---------------- rule feedback ----------------

type NerfFeedbackTotal = { nerf_id: string; up: number; down: number; last_at: number };
type NerfFeedbackVote = {
  nerf_id: string;
  vote: number;
  username: string | null;
  game_id: string | null;
  created_at: number;
};

// Post-game thumbs from players, aggregated per rule. The sort favours the
// most-voted rules so the ones that need rebalancing surface first.
function RuleFeedbackTab() {
  const [totals, setTotals] = useState<NerfFeedbackTotal[] | null>(null);
  const [recent, setRecent] = useState<NerfFeedbackVote[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/mod/nerf-feedback")
      .then((res) => (res.ok ? (res.json() as Promise<{ totals: NerfFeedbackTotal[]; recent: NerfFeedbackVote[] }>) : null))
      .then((data) => {
        if (cancelled || !data) return;
        setTotals(data.totals);
        setRecent(data.recent);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const nerfName = (id: string) => ALL_NERFS.find((n) => n.id === id)?.name ?? id;

  if (!totals) return <p className="text-sm text-parchment-400">Loading rule feedback…</p>;
  if (totals.length === 0) {
    return <p className="text-sm text-parchment-400">No feedback yet. Votes appear after players rate their rule post-game.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="plate overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="smallcaps text-[9px] text-parchment-400">
              <th className="px-4 py-2 text-left font-normal">Rule</th>
              <th className="px-4 py-2 text-right font-normal">Liked</th>
              <th className="px-4 py-2 text-right font-normal">Disliked</th>
              <th className="px-4 py-2 text-right font-normal">Score</th>
              <th className="px-4 py-2 text-right font-normal">Last vote</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {totals.map((row) => (
              <tr key={row.nerf_id}>
                <td className="px-4 py-2 text-parchment-100">{nerfName(row.nerf_id)}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-verdigris-glow">{row.up}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-oxblood-glow">{row.down}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-parchment-100">
                  {row.up - row.down > 0 ? "+" : ""}
                  {row.up - row.down}
                </td>
                <td className="px-4 py-2 text-right text-xs text-parchment-400">
                  {new Date(row.last_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {recent.length > 0 && (
        <div>
          <h3 className="smallcaps text-xs text-parchment-400">Recent votes</h3>
          <ul className="mt-2 plate divide-y divide-white/5 text-sm">
            {recent.map((v, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-2">
                <span className="min-w-0 truncate text-parchment-100">
                  <span className={v.vote > 0 ? "text-verdigris-glow" : "text-oxblood-glow"}>
                    {v.vote > 0 ? "+1" : "-1"}
                  </span>{" "}
                  {nerfName(v.nerf_id)}
                  <span className="text-parchment-400"> by {v.username ?? "unknown"}</span>
                </span>
                <span className="shrink-0 text-xs text-parchment-400">
                  {new Date(v.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------- buff feedback ----------------

type BuffFeedbackTotal = { buff_id: string; up: number; down: number; last_at: number };
type BuffFeedbackVote = {
  buff_id: string;
  vote: number;
  username: string | null;
  game_id: string | null;
  created_at: number;
};

// Post-game thumbs from players, aggregated per buff. Same shape as the nerf
// feedback tab: most-voted buffs first so unfair or unfun cards surface.
function BuffFeedbackTab() {
  const [totals, setTotals] = useState<BuffFeedbackTotal[] | null>(null);
  const [recent, setRecent] = useState<BuffFeedbackVote[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/mod/buff-feedback")
      .then((res) => (res.ok ? (res.json() as Promise<{ totals: BuffFeedbackTotal[]; recent: BuffFeedbackVote[] }>) : null))
      .then((data) => {
        if (cancelled || !data) return;
        setTotals(data.totals);
        setRecent(data.recent);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const buffName = (id: string) => BUFF_BY_ID[id]?.name ?? id;

  if (!totals) return <p className="text-sm text-parchment-400">Loading buff feedback…</p>;
  if (totals.length === 0) {
    return <p className="text-sm text-parchment-400">No feedback yet. Votes appear after players rate their buffs post-game.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="plate overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="smallcaps text-[9px] text-parchment-400">
              <th className="px-4 py-2 text-left font-normal">Buff</th>
              <th className="px-4 py-2 text-right font-normal">Liked</th>
              <th className="px-4 py-2 text-right font-normal">Disliked</th>
              <th className="px-4 py-2 text-right font-normal">Score</th>
              <th className="px-4 py-2 text-right font-normal">Last vote</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {totals.map((row) => (
              <tr key={row.buff_id}>
                <td className="px-4 py-2 text-parchment-100">{buffName(row.buff_id)}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-verdigris-glow">{row.up}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-oxblood-glow">{row.down}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-parchment-100">
                  {row.up - row.down > 0 ? "+" : ""}
                  {row.up - row.down}
                </td>
                <td className="px-4 py-2 text-right text-xs text-parchment-400">
                  {new Date(row.last_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {recent.length > 0 && (
        <div>
          <h3 className="smallcaps text-xs text-parchment-400">Recent votes</h3>
          <ul className="mt-2 plate divide-y divide-white/5 text-sm">
            {recent.map((v, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-2">
                <span className="min-w-0 truncate text-parchment-100">
                  <span className={v.vote > 0 ? "text-verdigris-glow" : "text-oxblood-glow"}>
                    {v.vote > 0 ? "+1" : "-1"}
                  </span>{" "}
                  {buffName(v.buff_id)}
                  <span className="text-parchment-400"> by {v.username ?? "unknown"}</span>
                </span>
                <span className="shrink-0 text-xs text-parchment-400">
                  {new Date(v.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------- human games ----------------

type SeatKind = "member" | "guest" | "anon" | "house";

interface ModGameSeat {
  name: string;
  userId: string | null;
  kind: SeatKind;
  ratingBefore: number | null;
  ratingAfter: number | null;
}

interface ModGame {
  id: string;
  white: ModGameSeat;
  black: ModGameSeat;
  winner: "w" | "b" | "draw" | null;
  reason: string;
  rated: boolean;
  ruleset: string;
  category: string | null;
  timeSec: number;
  incrementSec: number;
  moveCount: number;
  replayable: boolean;
  durationMs: number;
  startedAt: number;
  completedAt: number;
}

interface GamesStats {
  today: { total: number; humanVsHuman: number; humanVsHouse: number };
  week: { total: number; humanVsHuman: number; humanVsHouse: number };
  averageGame: { moves: number | null; durationMs: number | null };
  topMode: { label: string; games: number } | null;
  humansToday: { members: number; guests: number; anonSeatGames: number };
  lastHumanGame: { id: string; completedAt: number } | null;
}

function fmtDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function tcLabel(baseSec: number, incSec: number): string {
  if (baseSec <= 0) return "∞";
  const base = baseSec < 60 ? `${baseSec}s` : `${Math.round(baseSec / 60)}`;
  return `${base}+${incSec}`;
}

function resultLabel(winner: ModGame["winner"]): string {
  return winner === "w" ? "1–0" : winner === "b" ? "0–1" : winner === "draw" ? "½–½" : "—";
}

function ratingDelta(seat: ModGameSeat): string | null {
  if (seat.ratingBefore === null || seat.ratingAfter === null) return null;
  const d = Math.round(seat.ratingAfter) - Math.round(seat.ratingBefore);
  return `${d >= 0 ? "+" : ""}${d}`;
}

// Small identity pill after a seat's name: who (or what) was sitting there.
// Registered members get no pill — they are the default. Guests are shown by
// their real guest username (moderator surface; public surfaces already show
// these names too), just marked as guests.
function SeatBadge({ kind }: { kind: SeatKind }) {
  if (kind === "member") return null;
  const style =
    kind === "house"
      ? "border-bruise-glow/40 text-bruise-glow"
      : kind === "guest"
        ? "border-white/20 text-parchment-300"
        : "border-white/15 text-parchment-400";
  const label = kind === "house" ? "house bot" : kind === "guest" ? "guest" : "anon";
  return (
    <span className={`smallcaps text-[9px] px-1.5 py-px rounded-full border ${style}`}>{label}</span>
  );
}

function GameStatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="plate p-4">
      <div className="smallcaps text-[10px] text-parchment-400">{label}</div>
      <div className="mt-1 font-display text-xl text-parchment-50">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-parchment-400">{sub}</div>}
    </div>
  );
}

// Every archived game with at least one HUMAN seat (member, guest, or an
// anonymous seat) — so human-vs-house-bot games count and bot-vs-bot filler
// doesn't. Newest first; the most recent human game is pinned on top. Rows
// link to /game/{id}, the archive replay viewer.
function GamesTab() {
  const [stats, setStats] = useState<GamesStats | null>(null);
  const [games, setGames] = useState<ModGame[] | null>(null);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/mod/games/stats")
      .then((res) => (res.ok ? (res.json() as Promise<GamesStats>) : Promise.reject()))
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {});
    fetch("/api/mod/games")
      .then((res) =>
        res.ok ? (res.json() as Promise<{ games: ModGame[]; nextBefore: number | null }>) : Promise.reject(),
      )
      .then((data) => {
        if (cancelled) return;
        setGames(data.games);
        setNextBefore(data.nextBefore);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = async () => {
    if (nextBefore === null || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/mod/games?before=${nextBefore}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { games: ModGame[]; nextBefore: number | null };
      setGames((prev) => [...(prev ?? []), ...data.games]);
      setNextBefore(data.nextBefore);
    } catch {
      // Leave the cursor as-is so the button can be tried again.
    } finally {
      setLoadingMore(false);
    }
  };

  if (failed) return <p className="text-sm text-parchment-400">Could not load the game archive. Try again in a minute.</p>;

  return (
    <div>
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <GameStatCard
            label="Human games today"
            value={String(stats.today.total)}
            sub={`${stats.today.humanVsHuman} vs humans · ${stats.today.humanVsHouse} vs house`}
          />
          <GameStatCard
            label="This week"
            value={String(stats.week.total)}
            sub={`${stats.week.humanVsHuman} vs humans · ${stats.week.humanVsHouse} vs house`}
          />
          <GameStatCard
            label="Avg. game (7d)"
            value={stats.averageGame.moves !== null ? `${stats.averageGame.moves} moves` : "—"}
            sub={fmtDuration(stats.averageGame.durationMs)}
          />
          <GameStatCard
            label="Most played mode (7d)"
            value={stats.topMode ? stats.topMode.label : "—"}
            sub={stats.topMode ? `${stats.topMode.games} games` : undefined}
          />
          <GameStatCard
            label="Humans today"
            value={`${stats.humansToday.members + stats.humansToday.guests}`}
            sub={`${stats.humansToday.members} members · ${stats.humansToday.guests} guests${
              stats.humansToday.anonSeatGames > 0 ? ` · ${stats.humansToday.anonSeatGames} anon-seat games` : ""
            }`}
          />
          <GameStatCard
            label="Last human game"
            value={stats.lastHumanGame ? when(stats.lastHumanGame.completedAt) : "none yet"}
          />
        </div>
      )}

      {!games ? (
        <p className="mt-6 text-parchment-300">Loading…</p>
      ) : games.length === 0 ? (
        <p className="mt-6 text-parchment-300">No human games recorded yet.</p>
      ) : (
        <>
          <div className="mt-6 space-y-2">
            {games.map((g, i) => (
              <div
                key={g.id}
                className={`plate p-4 ${i === 0 ? "border border-gold/40" : ""}`}
              >
                {i === 0 && (
                  <div className="smallcaps text-[10px] text-gold-leaf">Last human game</div>
                )}
                <div className={`flex flex-wrap items-center gap-2 text-sm ${i === 0 ? "mt-1" : ""}`}>
                  <span className="font-display font-semibold text-parchment-50">
                    {g.white.kind === "member" || g.white.kind === "guest" ? (
                      <Link href={`/u/${g.white.name}`} className="hover:underline">{g.white.name}</Link>
                    ) : (
                      g.white.name
                    )}
                  </span>
                  <SeatBadge kind={g.white.kind} />
                  <span className="font-mono tabular-nums text-parchment-200">{resultLabel(g.winner)}</span>
                  <span className="font-display font-semibold text-parchment-50">
                    {g.black.kind === "member" || g.black.kind === "guest" ? (
                      <Link href={`/u/${g.black.name}`} className="hover:underline">{g.black.name}</Link>
                    ) : (
                      g.black.name
                    )}
                  </span>
                  <SeatBadge kind={g.black.kind} />
                  <ModeBadge mode={g.category === "nerf" || g.category === "buff" ? g.category : undefined} />
                  <span className="smallcaps text-[10px] px-2 py-0.5 rounded-full border border-white/15 text-parchment-300">
                    {g.rated ? "rated" : "casual"}
                  </span>
                  <span className="ml-auto text-xs text-parchment-400">{when(g.completedAt)}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-parchment-400">
                  <span>{g.reason}</span>
                  <span>{tcLabel(g.timeSec, g.incrementSec)}</span>
                  <span>{g.moveCount} moves</span>
                  <span>{fmtDuration(g.durationMs)}</span>
                  {ratingDelta(g.white) && (
                    <span className="font-mono tabular-nums">
                      {g.white.name} {ratingDelta(g.white)}
                    </span>
                  )}
                  {ratingDelta(g.black) && (
                    <span className="font-mono tabular-nums">
                      {g.black.name} {ratingDelta(g.black)}
                    </span>
                  )}
                  {g.replayable ? (
                    <Link href={`/game/${g.id}`} className="ml-auto text-gold-leaf hover:underline">
                      Replay
                    </Link>
                  ) : (
                    <span className="ml-auto text-parchment-400/60" title="This game was archived without its move list.">
                      no moves stored
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {nextBefore !== null && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-4 px-4 py-1.5 rounded-sm btn-ghost text-sm disabled:opacity-60"
            >
              {loadingMore ? "Loading…" : "Load older games"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ---------------- reports ----------------

function ReportsTab() {
  const [status, setStatus] = useState<"open" | "all">("open");
  const [reports, setReports] = useState<Report[] | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/mod/reports?status=${status === "open" ? "open" : "all"}`);
    if (res.ok) setReports(((await res.json()) as { reports: Report[] }).reports);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const close = async (id: string, next: "resolved" | "dismissed") => {
    await postJson("/api/mod/reports", { id, status: next });
    load();
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-sm">
        <FilterButton active={status === "open"} onClick={() => setStatus("open")}>Open</FilterButton>
        <FilterButton active={status === "all"} onClick={() => setStatus("all")}>All</FilterButton>
      </div>
      {!reports ? (
        <p className="mt-4 text-parchment-300">Loading…</p>
      ) : reports.length === 0 ? (
        <p className="mt-4 text-parchment-300">No reports. Quiet day.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="plate p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link href={`/u/${r.reported_name}`} className="font-display font-semibold text-gold-leaf hover:underline">
                  {r.reported_name}
                </Link>
                <span className="smallcaps text-[10px] px-2 py-0.5 rounded-full border border-white/15 text-parchment-300">
                  {r.reason}
                </span>
                <span className="text-parchment-400">
                  reported by {r.reporter_name} · {when(r.created_at)}
                </span>
                {r.status !== "open" && (
                  <span className="text-parchment-400">· {r.status} by {r.handled_by}</span>
                )}
              </div>
              <p className="mt-2 text-parchment-100 text-sm whitespace-pre-wrap">{r.description}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                {r.game_id && (
                  <Link href={`/game/${r.game_id}`} className="px-3 py-1 rounded-sm btn-ghost">
                    View game
                  </Link>
                )}
                {r.status === "open" && (
                  <>
                    <button onClick={() => close(r.id, "resolved")} className="px-3 py-1 rounded-sm btn-ghost text-gold-leaf">
                      Resolve
                    </button>
                    <button onClick={() => close(r.id, "dismissed")} className="px-3 py-1 rounded-sm btn-ghost">
                      Dismiss
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- chat flags ----------------

function ChatFlagsTab() {
  const [all, setAll] = useState(false);
  const [flags, setFlags] = useState<ChatFlag[] | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/mod/chat-flags${all ? "?all=1" : ""}`);
    if (res.ok) setFlags(((await res.json()) as { flags: ChatFlag[] }).flags);
  }, [all]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (id: string) => {
    await postJson("/api/mod/chat-flags", { id });
    load();
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-sm">
        <FilterButton active={!all} onClick={() => setAll(false)}>Unreviewed</FilterButton>
        <FilterButton active={all} onClick={() => setAll(true)}>All</FilterButton>
        {flags && flags.some((f) => !f.reviewed) && (
          <button
            onClick={async () => {
              await postJson("/api/mod/chat-flags", { all: true });
              load();
            }}
            className="ml-auto px-3 py-1 rounded-sm btn-ghost"
          >
            Mark all reviewed
          </button>
        )}
      </div>
      {!flags ? (
        <p className="mt-4 text-parchment-300">Loading…</p>
      ) : flags.length === 0 ? (
        <p className="mt-4 text-parchment-300">Nothing flagged.</p>
      ) : (
        <div className="mt-4 plate divide-y divide-white/5">
          {flags.map((f) => (
            <div key={f.id} className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm">
                  <span className="font-display font-semibold">{f.username}</span>
                  <span className="text-parchment-400"> · game {f.match_id} · {when(f.created_at)}</span>
                </div>
                <p className="mt-1 text-parchment-100 text-sm break-words">{f.text}</p>
                <p className="mt-1 text-oxblood-glow text-xs">matched: {f.matched_words}</p>
              </div>
              {!f.reviewed ? (
                <button onClick={() => review(f.id)} className="shrink-0 px-3 py-1 rounded-sm btn-ghost text-sm">
                  Reviewed
                </button>
              ) : (
                <span className="shrink-0 text-parchment-400 text-xs">reviewed</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- house bots ----------------

// A moderator switch for the house bots: the engine-driven roster that keeps
// the lobby warm. Flipping it writes app_settings.house_enabled; the game
// server reads it within a few seconds, stops advertising bot seeks, and winds
// down any bot game already in progress. Persisted, so it survives redeploys.
function HouseBotsToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [bounds, setBounds] = useState<{ min: number; max: number }>({ min: 30, max: 60 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/mod/house")
      .then((res) =>
        res.ok
          ? (res.json() as Promise<{ enabled: boolean; count: number; min: number; max: number }>)
          : null,
      )
      .then((data) => {
        if (!cancelled && data) {
          setEnabled(data.enabled);
          setCount(data.count);
          setBounds({ min: data.min, max: data.max });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const post = async (body: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/mod/house", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { enabled: boolean; count: number };
      setEnabled(data.enabled);
      setCount(data.count);
    } catch {
      setError("Could not update. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = () => {
    if (enabled !== null && !saving) post({ enabled: !enabled });
  };
  const commitCount = (n: number) => {
    if (!saving && Number.isFinite(n)) post({ count: n });
  };

  return (
    <div className="mt-4 plate space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-sm font-semibold text-parchment-50">House bots</div>
          <p className="mt-0.5 max-w-md text-xs text-parchment-400">
            The engine-driven roster that keeps the lobby warm. Turn off to run pure human traffic;
            bot seeks clear and any bot game winds down within a few seconds.
          </p>
          {error && <p className="mt-1 text-xs text-oxblood-glow">{error}</p>}
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={enabled === null || saving}
          aria-pressed={enabled === true}
          title={enabled === null ? "Loading…" : enabled ? "House bots are on. Click to turn off." : "House bots are off. Click to turn on."}
          className={
            "press shrink-0 inline-flex items-center gap-2 border px-4 py-2 font-display text-sm font-semibold transition disabled:opacity-60 " +
            (enabled === null
              ? "border-white/15 text-parchment-400"
              : enabled
                ? "border-verdigris/50 bg-verdigris/15 text-verdigris-glow"
                : "border-oxblood-glow/50 bg-oxblood/15 text-oxblood-glow")
          }
        >
          <span
            aria-hidden
            className={
              "h-2 w-2 rounded-full " +
              (enabled === null
                ? "bg-parchment-400"
                : enabled
                  ? "bg-verdigris-glow animate-flicker"
                  : "bg-oxblood-glow")
            }
          />
          {enabled === null ? "…" : saving ? "Saving…" : enabled ? "On" : "Off"}
        </button>
      </div>
      {/* Active-bot count: how many of the roster seek, play, and appear online.
          The first N are active, so the base set is always on and raising this
          switches in the expansion personas. Commits on release. */}
      <div className={"border-t border-white/10 pt-3 " + (enabled === false ? "opacity-50" : "")}>
        <div className="flex items-center justify-between">
          <label htmlFor="house-count" className="smallcaps text-[11px] text-parchment-400">
            Active bots in the lobby
          </label>
          <span className="font-mono text-sm text-gold-leaf tabular-nums">{count ?? "…"}</span>
        </div>
        <input
          id="house-count"
          type="range"
          min={bounds.min}
          max={bounds.max}
          step={1}
          value={count ?? bounds.min}
          disabled={count === null || saving}
          onChange={(e) => setCount(Number(e.target.value))}
          onPointerUp={(e) => commitCount(Number((e.target as HTMLInputElement).value))}
          onKeyUp={(e) => commitCount(Number((e.target as HTMLInputElement).value))}
          className="mt-1.5 w-full accent-gold-leaf disabled:cursor-not-allowed"
        />
        <p className="mt-1 text-[11px] text-parchment-400">
          The first {count ?? bounds.min} of the {bounds.max} roster bots seek, play, and show
          online. Takes effect within a few seconds, no redeploy.
        </p>
      </div>
    </div>
  );
}

// The owner god panel is hidden by default; ilovenewjeans switches it on here
// when he wants it, and it mounts in his next game. Mirrors HouseBotsToggle but
// hits the owner-gated /api/mod/god-panel and defaults to off.
function GodPanelToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/mod/god-panel")
      .then((res) => (res.ok ? (res.json() as Promise<{ enabled: boolean }>) : null))
      .then((data) => {
        if (!cancelled && data) setEnabled(data.enabled);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async () => {
    if (enabled === null || saving) return;
    const next = !enabled;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/mod/god-panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { enabled: boolean };
      setEnabled(data.enabled);
    } catch {
      setError("Could not update. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 plate flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <div className="font-display text-sm font-semibold text-parchment-50">God panel</div>
        <p className="mt-0.5 max-w-md text-xs text-parchment-400">
          Your in-game card-summon panel. Hidden by default so it never gets in the way; switch it
          on here and it mounts in your next draft game. Only you can see or use it.
        </p>
        {error && <p className="mt-1 text-xs text-oxblood-glow">{error}</p>}
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={enabled === null || saving}
        aria-pressed={enabled === true}
        title={enabled === null ? "Loading…" : enabled ? "God panel is on. Click to hide it." : "God panel is off. Click to show it."}
        className={
          "press shrink-0 inline-flex items-center gap-2 border px-4 py-2 font-display text-sm font-semibold transition disabled:opacity-60 " +
          (enabled === null
            ? "border-white/15 text-parchment-400"
            : enabled
              ? "border-verdigris/50 bg-verdigris/15 text-verdigris-glow"
              : "border-oxblood-glow/50 bg-oxblood/15 text-oxblood-glow")
        }
      >
        <span
          aria-hidden
          className={
            "h-2 w-2 rounded-full " +
            (enabled === null
              ? "bg-parchment-400"
              : enabled
                ? "bg-verdigris-glow animate-flicker"
                : "bg-oxblood-glow")
          }
        />
        {enabled === null ? "…" : saving ? "Saving…" : enabled ? "On" : "Off"}
      </button>
    </div>
  );
}

// ---------------- players ----------------

function UsersTab({ isAdmin }: { isAdmin: boolean }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<ModUser[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [reports, setReports] = useState<{ reporter_name: string; reason: string; description: string; status: string; created_at: number }[]>([]);
  const [selected, setSelected] = useState<ModUser | null>(null);
  const [action, setAction] = useState<"warn" | "mute" | "ban">("mute");
  const [duration, setDuration] = useState<number | null>(DURATIONS[2].ms);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    // An empty query loads the default roster (recent members) rather than
    // clearing the list, so the panel always opens on something browsable.
    const res = await fetch(
      q.trim() ? `/api/mod/users?q=${encodeURIComponent(q.trim())}` : "/api/mod/users",
    );
    if (!res.ok) return;
    const data = (await res.json()) as {
      users: ModUser[];
      history: HistoryEntry[];
      reports: { reporter_name: string; reason: string; description: string; status: string; created_at: number }[];
    };
    setUsers(data.users);
    setHistory(data.history);
    setReports(data.reports);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const act = async (username: string, body: Record<string, unknown>) => {
    setMessage(null);
    const res = await postJson("/api/mod/users", { username, ...body });
    setMessage(res.ok ? "Done." : res.error ?? "Failed.");
    search(query);
    if (selected) {
      const refreshed = await fetch(`/api/mod/users?q=${encodeURIComponent(selected.username)}`);
      if (refreshed.ok) {
        const data = (await refreshed.json()) as { users: ModUser[] };
        setSelected(data.users.find((u) => u.username === selected.username) ?? null);
      }
    }
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelected(null);
        }}
        placeholder="Search players…"
        className="w-full max-w-sm bg-transparent plate px-4 py-2 text-sm outline-none focus:border-gold/40"
      />

      {!query.trim() && (
        <p className="mt-2 smallcaps text-[10px] text-parchment-400">
          Recent players · type to search anyone
        </p>
      )}
      {users.length === 0 && (
        <p className="mt-4 text-sm text-parchment-400">
          {query.trim() ? "No players match that search." : "No players yet."}
        </p>
      )}

      {users.length > 0 && (
        <div className="mt-4 plate divide-y divide-white/5">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => setSelected(u)}
              className={`w-full text-left px-4 py-3 flex flex-wrap items-center gap-2 hover:bg-white/[0.03] transition ${
                selected?.id === u.id ? "bg-white/[0.04]" : ""
              }`}
            >
              <span className="font-display font-semibold">{u.username}</span>
              {u.role !== "user" && <RoleBadge role={u.role} />}
              {u.banned_until && u.banned_until > Date.now() && (
                <span className="smallcaps text-[10px] px-2 py-0.5 rounded-full bg-oxblood-glow/20 text-oxblood-glow">
                  banned {untilLabel(u.banned_until)}
                </span>
              )}
              {u.muted_until && u.muted_until > Date.now() && (
                <span className="smallcaps text-[10px] px-2 py-0.5 rounded-full bg-bruise-glow/20 text-bruise-glow">
                  muted {untilLabel(u.muted_until)}
                </span>
              )}
              <span className="ml-auto text-parchment-400 text-sm">
                {Math.round(u.rating)} · {u.games} games · joined {new Date(u.created_at).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="mt-4 plate p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/u/${selected.username}`} className="font-display text-xl text-gold-leaf hover:underline">
              {selected.username}
            </Link>
            {selected.role !== "user" && <RoleBadge role={selected.role} />}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as typeof action)}
              className="bg-transparent plate px-3 py-1.5 outline-none"
            >
              <option value="warn">Warn (log only)</option>
              <option value="mute">Mute chat</option>
              <option value="ban">Ban account</option>
            </select>
            {action !== "warn" && (
              <select
                value={duration === null ? "perm" : String(duration)}
                onChange={(e) => setDuration(e.target.value === "perm" ? null : Number(e.target.value))}
                className="bg-transparent plate px-3 py-1.5 outline-none"
              >
                {DURATIONS.map((d) => (
                  <option key={d.label} value={d.ms === null ? "perm" : String(d.ms)}>
                    {d.label}
                  </option>
                ))}
              </select>
            )}
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (for the mod log)"
              className="flex-1 min-w-[160px] bg-transparent plate px-3 py-1.5 outline-none"
            />
            <button
              onClick={() => act(selected.username, { action, durationMs: duration, note })}
              className="px-4 py-1.5 rounded-sm btn-ghost text-oxblood-glow font-display"
            >
              Apply
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {selected.muted_until && selected.muted_until > Date.now() && (
              <button onClick={() => act(selected.username, { action: "unmute" })} className="px-3 py-1 rounded-sm btn-ghost">
                Unmute
              </button>
            )}
            {selected.banned_until && selected.banned_until > Date.now() && (
              <button onClick={() => act(selected.username, { action: "unban" })} className="px-3 py-1 rounded-sm btn-ghost">
                Unban
              </button>
            )}
            {isAdmin && selected.role === "user" && (
              <button
                onClick={() => act(selected.username, { action: "set_role", role: "mod" })}
                className="px-3 py-1 rounded-sm btn-ghost text-gold-leaf"
              >
                Make moderator
              </button>
            )}
            {isAdmin && selected.role === "mod" && (
              <button
                onClick={() => act(selected.username, { action: "set_role", role: "user" })}
                className="px-3 py-1 rounded-sm btn-ghost"
              >
                Remove moderator
              </button>
            )}
          </div>

          {message && <p className="mt-3 text-sm text-parchment-200">{message}</p>}

          {(history.length > 0 || reports.length > 0) && (
            <div className="mt-5 grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="smallcaps text-xs text-parchment-400">Mod history</h3>
                {history.length === 0 ? (
                  <p className="mt-2 text-parchment-300">Clean record.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {history.map((h, i) => (
                      <li key={i} className="text-parchment-200">
                        <span className="text-gold-leaf">{h.action}</span> by {h.mod_name} · {when(h.created_at)}
                        {h.note && <span className="text-parchment-400">: {h.note}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="smallcaps text-xs text-parchment-400">Reports against them</h3>
                {reports.length === 0 ? (
                  <p className="mt-2 text-parchment-300">None.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {reports.map((r, i) => (
                      <li key={i} className="text-parchment-200">
                        <span className="text-oxblood-glow">{r.reason}</span> by {r.reporter_name} ({r.status}) ·{" "}
                        {when(r.created_at)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------- suggestions ----------------

function SuggestionsTab() {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);

  useEffect(() => {
    fetch("/api/mod/suggestions").then(async (res) => {
      if (res.ok) setSuggestions(((await res.json()) as { suggestions: Suggestion[] }).suggestions);
    });
  }, []);

  if (!suggestions) return <p className="text-parchment-300">Loading…</p>;
  if (suggestions.length === 0) return <p className="text-parchment-300">No suggestions yet.</p>;
  return (
    <div className="space-y-2">
      {suggestions.map((s) => (
        <div key={s.id} className="plate p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <ModeBadge mode={s.kind === "buff" ? "buff" : "nerf"} />
            <span className="font-display font-semibold text-gold-leaf">{s.name}</span>
            {s.kind === "buff" && (
              <span className="smallcaps text-[9px] text-parchment-400 border border-white/10 px-1.5 py-px">
                {s.pool === "boon" ? "Nerf-mode boon" : "Buff mode card"}
              </span>
            )}
            <span className="text-parchment-400">
              by {s.username ?? "anonymous"}
              {s.contact ? ` (${s.contact})` : ""} · {when(s.created_at)}
            </span>
          </div>
          <p className="mt-2 text-parchment-100 text-sm whitespace-pre-wrap">{s.description}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------- mod log ----------------

function LogTab() {
  const [log, setLog] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    fetch("/api/mod/log").then(async (res) => {
      if (res.ok) setLog(((await res.json()) as { log: HistoryEntry[] }).log);
    });
  }, []);

  if (!log) return <p className="text-parchment-300">Loading…</p>;
  if (log.length === 0) return <p className="text-parchment-300">No moderation actions yet.</p>;
  return (
    <div className="plate divide-y divide-white/5">
      {log.map((entry, i) => (
        <div key={i} className="px-4 py-3 text-sm flex flex-wrap items-baseline gap-x-2">
          <span className="font-display font-semibold">{entry.mod_name}</span>
          <span className="text-gold-leaf">{entry.action}</span>
          <Link href={`/u/${entry.target_name}`} className="font-display font-semibold hover:underline">
            {entry.target_name}
          </Link>
          {entry.expires_at && <span className="text-parchment-400">{untilLabel(entry.expires_at)}</span>}
          {entry.note && <span className="text-parchment-400">{entry.note}</span>}
          <span className="ml-auto text-parchment-400">{when(entry.created_at)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------- shared bits ----------------

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full border transition ${
        active ? "border-gold/50 text-gold-leaf" : "border-white/15 text-parchment-300 hover:text-parchment-100"
      }`}
    >
      {children}
    </button>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="smallcaps text-[10px] px-2 py-0.5 rounded-full border border-gold/40 text-gold-leaf">
      {role === "admin" ? "Admin" : "Moderator"}
    </span>
  );
}
