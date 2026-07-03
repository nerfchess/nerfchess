"use client";

import { MobileNavMenu } from "@/components/MobileNavMenu";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import {
  CompletedGame,
  GameOutcome,
  loadGameHistory,
  nerfSummary,
  outcomeFor,
  speedLabel,
  timeControlLabel,
} from "@/lib/gameHistory";
import { getNerf } from "@/engine/nerfs/library";
import { Color } from "@/engine/types";

import { TIER_LABEL } from "@/lib/tiers";

// A row from GET /api/history (the server-side `games` table).
type ServerGameRow = {
  id: string;
  white_name: string;
  black_name: string;
  white_user_id: string | null;
  black_user_id: string | null;
  white_nerf_id: string;
  black_nerf_id: string;
  winner: "w" | "b" | "draw" | null;
  reason: string;
  rated: number;
  white_rating_before: number | null;
  white_rating_after: number | null;
  black_rating_before: number | null;
  black_rating_after: number | null;
  time_sec: number;
  increment_sec: number;
  moves: string | null;
  completed_at: number;
};

// Map an account-stored game into the CompletedGame shape the UI renders.
function fromServerRow(row: ServerGameRow, userId: string): CompletedGame {
  const myColor: Color = row.white_user_id === userId ? "w" : "b";
  const opponent = myColor === "w" ? row.black_name : row.white_name;
  const myNerfId = myColor === "w" ? row.white_nerf_id : row.black_nerf_id;
  const oppNerfId = myColor === "w" ? row.black_nerf_id : row.white_nerf_id;
  const before = myColor === "w" ? row.white_rating_before : row.black_rating_before;
  const after = myColor === "w" ? row.white_rating_after : row.black_rating_after;
  const moveCount = row.moves ? row.moves.split(" ").filter(Boolean).length : 0;
  return {
    id: row.id,
    endedAt: row.completed_at,
    mode: row.rated ? "online" : "friend",
    opponent,
    myColor,
    outcome: outcomeFor(row.winner, myColor),
    reason: row.reason,
    rated: !!row.rated,
    moveCount,
    baseSec: row.time_sec,
    incSec: row.increment_sec,
    ratingChange:
      row.rated && before != null && after != null ? { before, after } : null,
    myNerf: nerfSummary(getNerf(myNerfId)),
    opponentNerf: nerfSummary(getNerf(oppNerfId)),
    // Server games replay from their archived copy at /game/{id}.
    serverGameId: row.id,
  };
}

type Filter = "all" | GameOutcome;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All games" },
  { id: "win", label: "Wins" },
  { id: "loss", label: "Losses" },
  { id: "draw", label: "Draws" },
];

const OUTCOME_STYLE: Record<GameOutcome, { badge: string; text: string; label: string }> = {
  win: { badge: "border-gold/50 bg-gold/15 text-gold-leaf", text: "text-gold-leaf", label: "Win" },
  loss: { badge: "border-oxblood-glow/50 bg-oxblood/15 text-oxblood-glow", text: "text-oxblood-glow", label: "Loss" },
  draw: { badge: "border-bruise-glow/40 bg-bruise/10 text-bruise-glow", text: "text-bruise-glow", label: "Draw" },
};

function formatWhen(endedAt: number): string {
  return new Date(endedAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function HistoryPage() {
  // Loaded after mount: localStorage is client-only and this avoids any
  // hydration mismatch between server HTML and the stored list.
  const [games, setGames] = useState<CompletedGame[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<CompletedGame | null>(null);
  const [onAccount, setOnAccount] = useState(false);

  // Signed-in players see their account history (online/friend games recorded
  // server-side, so it follows them across devices); guests fall back to the
  // device-local list. Bot games are always device-local.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/history");
        const data = (await res.json()) as {
          authenticated: boolean;
          userId?: string;
          games: ServerGameRow[];
        };
        if (cancelled) return;
        if (data.authenticated && data.userId) {
          setOnAccount(true);
          setGames(data.games.map((row) => fromServerRow(row, data.userId!)));
          return;
        }
      } catch {
        // Network/parse failure: fall through to the local list.
      }
      if (!cancelled) setGames(loadGameHistory());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!games) return [];
    return filter === "all" ? games : games.filter((g) => g.outcome === filter);
  }, [games, filter]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, win: 0, loss: 0, draw: 0 };
    for (const g of games ?? []) {
      c.all++;
      c[g.outcome]++;
    }
    return c;
  }, [games]);

  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-5 sm:px-10 py-6 sm:py-7">
        <Logo />
        <div className="flex items-center gap-1 sm:gap-2 text-sm font-body font-medium">
          <Link href="/friend" className="hidden sm:inline-block px-3 py-1.5 hover:bg-white/5 text-parchment-100 transition-colors">Play a Friend</Link>
          <Link href="/game?mode=ai" className="hidden sm:inline-block px-3 py-1.5 hover:bg-white/5 text-parchment-100 transition-colors">Play vs Bot</Link>
          <Link href="/leaderboard" className="hidden sm:inline-block px-3 py-1.5 hover:bg-white/5 text-parchment-100 transition-colors">Leaderboard</Link>
          <MobileNavMenu />
        </div>
      </nav>

      <section className="max-w-3xl mx-auto px-5 sm:px-6 py-6 sm:py-8">
        <h1 className="font-display text-4xl sm:text-5xl">Game history</h1>
        <p className="mt-3 text-parchment-200">
          {onAccount
            ? "Your online and friend games, saved to your account, most recent first."
            : "Your finished games on this device, most recent first. Sign in to keep them on your account."}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={
                "px-4 py-2 border font-display text-sm transition " +
                (filter === f.id
                  ? "bg-gold/20 border-gold text-gold-leaf"
                  : "border-white/15 text-parchment-200 hover:border-white/30 hover:bg-white/5")
              }
            >
              {f.label}
              <span className="ml-2 font-mono text-[11px] opacity-70 tabular-nums">
                {counts[f.id]}
              </span>
            </button>
          ))}
        </div>

        {games === null ? (
          <div className="mt-8 text-parchment-300/60">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="mt-8 plate p-8 text-center">
            <p className="text-parchment-200">
              {games.length === 0
                ? "No games yet. Your finished games will show up here."
                : "No games match this filter."}
            </p>
            {games.length === 0 && (
              <div className="mt-5 flex flex-col sm:flex-row justify-center gap-3">
                <Link
                  href="/friend"
                  className="btn-leaf btn-cta px-6 py-3 font-display text-base font-semibold inline-flex items-center justify-center"
                >
                  Play a Friend
                </Link>
                <Link
                  href="/game?mode=ai"
                  className="btn-ghost px-6 py-3 font-display text-base inline-flex items-center justify-center"
                >
                  Play vs Bot
                </Link>
              </div>
            )}
          </div>
        ) : (
          <ul className="mt-6 max-h-[70dvh] overflow-y-auto pr-1 space-y-2">
            {filtered.map((g) => (
              <li key={g.id}>
                <GameRow game={g} onSelect={() => setSelected(g)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && <GameSummary game={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}

function GameRow({ game, onSelect }: { game: CompletedGame; onSelect: () => void }) {
  const style = OUTCOME_STYLE[game.outcome];
  const delta = game.ratingChange
    ? Math.round(game.ratingChange.after - game.ratingChange.before)
    : null;
  // Straight to the board: local move list replays at /history/{id}, online
  // games pull the archived copy at /game/{serverGameId}.
  const replayHref = game.moves?.length
    ? `/history/${game.id}`
    : game.serverGameId
      ? `/game/${game.serverGameId}`
      : null;
  return (
    <div className="plate w-full flex items-stretch transition-colors duration-150 hover:bg-white/[0.04]">
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 p-3 sm:p-4 flex items-center gap-3 sm:gap-4 text-left active:bg-white/[0.06]"
      >
      <span
        className={`shrink-0 grid h-10 w-10 place-items-center border font-display text-sm font-bold ${style.badge}`}
        aria-label={style.label}
      >
        {style.label[0]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="truncate font-display text-base text-parchment-50">
            {game.opponent}
          </span>
          <span className="smallcaps text-[9px] text-parchment-400">
            {game.rated ? "rated" : "casual"}
          </span>
        </span>
        <span className="mt-0.5 block text-xs text-parchment-300">
          {formatWhen(game.endedAt)} · {game.moveCount} moves
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-mono text-sm text-parchment-100 tabular-nums">
          {timeControlLabel(game.baseSec, game.incSec)}
        </span>
        <span className="smallcaps block text-[9px] text-parchment-400">
          {speedLabel(game.baseSec)}
        </span>
      </span>
      {delta !== null && (
        <span
          className={
            "shrink-0 w-12 text-right font-mono text-sm tabular-nums " +
            (delta >= 0 ? "text-gold-leaf" : "text-oxblood-glow")
          }
        >
          {delta >= 0 ? "+" : ""}
          {delta}
        </span>
      )}
      </button>
      {replayHref && (
        <Link
          href={replayHref}
          title="Step through this game move by move"
          className="smallcaps shrink-0 grid place-items-center border-l border-white/10 px-3 text-[9px] text-parchment-400 hover:text-gold-leaf transition-colors"
        >
          Replay
        </Link>
      )}
    </div>
  );
}

function GameSummary({ game, onClose }: { game: CompletedGame; onClose: () => void }) {
  const style = OUTCOME_STYLE[game.outcome];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game summary"
      className="fixed inset-0 z-50 grid place-items-center bg-[#0a111e]/65 px-4 py-6 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="plate gilt w-[min(92vw,26rem)] p-6 sm:p-7"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="smallcaps text-[10px] text-parchment-400">Game summary</p>
            <h2 className={`mt-1 font-display text-3xl font-bold ${style.text}`}>
              {style.label}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="btn-ghost h-8 w-8 inline-flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        <dl className="mt-5 space-y-2.5 text-sm">
          <SummaryRow label="Opponent" value={game.opponent} />
          <SummaryRow label="Played as" value={game.myColor === "w" ? "White" : "Black"} />
          <SummaryRow label="Ended" value={game.reason} />
          <SummaryRow label="Date" value={formatWhen(game.endedAt)} />
          <SummaryRow
            label="Time control"
            value={`${timeControlLabel(game.baseSec, game.incSec)} · ${speedLabel(game.baseSec)}`}
          />
          <SummaryRow label="Moves" value={String(game.moveCount)} />
          <SummaryRow label="Mode" value={game.rated ? "Rated" : "Casual"} />
          {game.ratingChange && (
            <SummaryRow
              label="Rating"
              value={`${Math.round(game.ratingChange.before)} → ${Math.round(game.ratingChange.after)}`}
            />
          )}
        </dl>

        {(game.myNerf || game.opponentNerf) && (
          <div className="mt-5 space-y-2">
            {game.myNerf && <RuleLine label="Your rule" nerf={game.myNerf} />}
            {game.opponentNerf && <RuleLine label="Opponent rule" nerf={game.opponentNerf} />}
          </div>
        )}

        {(game.moves?.length || game.serverGameId) && (
          <Link
            href={game.moves?.length ? `/history/${game.id}` : `/game/${game.serverGameId}`}
            className="btn-leaf mt-5 inline-flex w-full items-center justify-center px-5 py-2.5 font-display text-sm font-semibold"
          >
            Watch replay
          </Link>
        )}

        <p className="mt-5 font-mono text-[10px] text-parchment-400/60 break-all">
          id {game.id}
        </p>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="smallcaps shrink-0 text-[10px] text-parchment-400">{label}</dt>
      <dd className="text-right text-parchment-100">{value}</dd>
    </div>
  );
}

function RuleLine({
  label,
  nerf,
}: {
  label: string;
  nerf: NonNullable<CompletedGame["myNerf"]>;
}) {
  return (
    <div className={`border p-3 tier-bg-${nerf.tier}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="smallcaps text-[9px] text-parchment-400">{label}</span>
        <span className={`smallcaps text-[9px] tier-${nerf.tier}`}>
          {TIER_LABEL[nerf.tier] ?? ""}
        </span>
      </div>
      <div className={`mt-1 font-display text-base font-semibold leading-tight tier-${nerf.tier}`}>
        {nerf.name}
      </div>
      <p className="mt-1 text-xs leading-snug text-parchment-200">{nerf.description}</p>
    </div>
  );
}
