"use client";

import { SiteHeader } from "@/components/SiteHeader";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Trophy } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PlayerSearch } from "@/components/PlayerSearch";
import { EmptyState } from "@/components/EmptyState";
import { AccountUser, fetchMe } from "@/lib/authClient";
import { CategoryTabs } from "@/components/ratings/CategoryTabs";
import { Podium } from "@/components/ratings/Podium";
import { DEFAULT_CATEGORY, getCategory, type RatingCategoryId } from "@/lib/ratingCategories";
import { isProvisionalRd, PROVISIONAL_RD } from "@/lib/ratingDisplay";
import { laurelTier } from "@/lib/laurels";
import { LaurelBadge } from "@/components/LaurelBadge";

interface Row {
  username: string;
  avatar?: string | null;
  flair?: string | null;
  bio?: string | null;
  rating: number;
  rd: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  guest?: boolean;
  bot?: boolean;
}

type MeRow = Row & { rank: number };

// Standings are served top-500; the table pages through them 50 at a time.
const PAGE_SIZE = 50;

export default function LeaderboardPage() {
  const [category, setCategory] = useState<RatingCategoryId>(DEFAULT_CATEGORY);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [meRow, setMeRow] = useState<MeRow | null>(null);
  const [me, setMe] = useState<AccountUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Jump-to-me: a bumped nonce triggers the scroll effect after the page state
  // settles; the target rank rides on a ref so the effect never calls setState.
  const [jumpNonce, setJumpNonce] = useState(0);
  const pendingRankRef = useRef<number | null>(null);

  // Clear stale rows the instant the query changes (React's sanctioned
  // adjust-state-on-change pattern) so the effect below only fetches. The page
  // and filter reset too, so switching ladders never lands on a stale page.
  const [prevQuery, setPrevQuery] = useState({ category, reloadKey });
  if (prevQuery.category !== category || prevQuery.reloadKey !== reloadKey) {
    setPrevQuery({ category, reloadKey });
    setRows(null);
    setMeRow(null);
    setError(null);
    setPage(0);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/leaderboard?category=${category}`);
        if (!res.ok) throw new Error("Could not load the leaderboard.");
        const data = (await res.json()) as { players: Row[]; me: MeRow | null };
        if (!cancelled) {
          setRows(data.players);
          setMeRow(data.me ?? null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load the leaderboard.");
      }
      const user = await fetchMe();
      if (!cancelled) setMe(user);
    })();
    return () => {
      cancelled = true;
    };
  }, [category, reloadKey]);

  const active = getCategory(category);
  const isMeName = (name: string) => !!me && name.toLowerCase() === me.username.toLowerCase();

  // True rank comes from the full-standings position, so a filtered view still
  // shows each player's real place on the board.
  const ranked = (rows ?? []).map((row, i) => ({ row, rank: i + 1 }));
  const filtered = ranked;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const meVisible = pageRows.some(({ row }) => isMeName(row.username));
  // A signed-in, ranked viewer can jump to their row; guests have no rank.
  const canJump = !!meRow && !meRow.guest;

  // After a jump changes the page (or when the row was already visible), scroll
  // the target row into view once it renders. Mutating the ref, never setState,
  // keeps this effect free of cascading renders.
  useEffect(() => {
    const rank = pendingRankRef.current;
    if (rank == null) return;
    const el = document.getElementById(`lb-rank-${rank}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      pendingRankRef.current = null;
    }
  }, [jumpNonce, safePage, rows]);

  const jumpToMe = () => {
    if (!meRow) return;
    pendingRankRef.current = meRow.rank;
    const inList = meRow.rank <= (rows?.length ?? 0);
    setPage(inList ? Math.floor((meRow.rank - 1) / PAGE_SIZE) : pageCount - 1);
    setJumpNonce((n) => n + 1);
  };

  return (
    <main className="min-h-screen pb-16">
      <SiteHeader active="/leaderboard" />

      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <span className="eyebrow">Ranked ladder</span>
        <h1 className="mt-1 font-display text-4xl text-parchment-50 sm:text-5xl">Leaderboard</h1>
        <p className="mt-2 max-w-xl text-sm text-parchment-300">
          The strongest players in each mode, ranked by rating. Buff and Nerf keep separate
          ratings, so climb the board in the mode you play best.
        </p>

        {/* Ladder switch: the only two boards, Nerf and Buff. */}
        <CategoryTabs value={category} onChange={setCategory} className="mt-5" />

        {/* Controls: search and the jump-to-me shortcut. */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {canJump && (
            <button
              type="button"
              onClick={jumpToMe}
              className="btn-ghost press ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px]"
            >
              <Trophy size={13} aria-hidden />
              Jump to my rank
            </button>
          )}
        </div>

        <div className="mt-4">
          <PlayerSearch className="max-w-sm" />
        </div>

        {/* Error / disconnected: plain words, a retry, and a way out. */}
        {error && (
          <div
            role="alert"
            className="mt-6 plate flex flex-col gap-3 border-oxblood-glow/60 bg-oxblood/15 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-sm text-parchment">{error}</span>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="btn-leaf press px-4 py-2 text-sm font-semibold"
              >
                Retry
              </button>
              <Link href="/lobby" className="btn-ghost press px-4 py-2 text-sm">
                Back to lobby
              </Link>
            </div>
          </div>
        )}

        {/* Loading: skeleton in the final table geometry, no full-page spinner. */}
        {!rows && !error && <LeaderboardSkeleton />}

        {/* Empty: one sentence and one action, sized to content. */}
        {rows && rows.length === 0 && !error && (
          <EmptyState
            className="mt-8"
            icon={Trophy}
            title={`No ${active.label} ratings yet`}
            body={`Nobody has a rated ${active.label} game on the board. Play one to claim the top spot.`}
            action={{ href: "/lobby", label: `Play a rated ${active.label} game` }}
          />
        )}

        {/* Podium for the active ladder's top three, above the full table. */}
        {rows && rows.length > 0 && (
          <Podium rows={rows.slice(0, 3)} category={category} isMe={isMeName} />
        )}

        {rows && rows.length > 0 && (
          <>
            <div className="mt-6 plate overflow-hidden">
              <div className="grid grid-cols-[2rem_1fr_4.5rem_5.25rem] items-center border-b border-[color:var(--edge)] px-3 py-3 text-xs text-parchment-400 sm:grid-cols-[3rem_1fr_5rem_4rem_6rem] sm:px-4">
                <span className="eyebrow text-[11px]">#</span>
                <span className="eyebrow text-[11px]">Player</span>
                <span className="eyebrow text-right text-[11px]">{active.label}</span>
                <span className="eyebrow hidden text-right text-[11px] sm:block">Games</span>
                <span className="eyebrow text-right text-[11px]">W / L / D</span>
              </div>

              {pageRows.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-parchment-400">
                  No players on this board yet.
                </p>
              ) : (
                pageRows.map(({ row, rank }) => (
                  <LeaderboardRow
                    key={row.guest ? `guest:${row.username}` : row.username}
                    row={row}
                    rank={rank}
                    label={active.label}
                    mine={isMeName(row.username)}
                  />
                ))
              )}

              {/* Signed-in viewer whose row is not on this page: pin it so their
                  true rank is always in reach. */}
              {meRow && !meVisible && (
                <>
                  <div className="border-t border-[color:var(--edge)] px-4 py-1 text-center font-mono text-[11px] text-parchment-500">
                    ···
                  </div>
                  <LeaderboardRow row={meRow} rank={meRow.rank} label={active.label} mine />
                </>
              )}
            </div>

            {pageCount > 1 && (
              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="btn-ghost press inline-flex min-h-[44px] items-center px-4 text-sm disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0 sm:py-2"
                >
                  Previous
                </button>
                <span className="font-mono text-xs tabular-nums text-parchment-400">
                  Ranks {safePage * PAGE_SIZE + 1}
                  {"-"}
                  {Math.min(filtered.length, (safePage + 1) * PAGE_SIZE)} of {filtered.length}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={safePage >= pageCount - 1}
                  className="btn-ghost press inline-flex min-h-[44px] items-center px-4 text-sm disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0 sm:py-2"
                >
                  Next
                </button>
              </div>
            )}

            {/* Eligibility footnote: the actual server rule. A player joins the
                board on their first rated game in this mode (user_ratings.games
                > 0), and a rating reads provisional until its deviation settles
                below PROVISIONAL_RD. The top ten wear the laurel. */}
            <p className="mt-4 flex items-start gap-1.5 text-xs leading-relaxed text-parchment-400">
              <LaurelBadge rank={1} size={13} title="Top-ten honors" className="mt-0.5 shrink-0" />
              <span>
                A player appears here after one rated {active.label} game; the rating shows a{" "}
                <span className="font-mono text-parchment-300">?</span> until its deviation settles
                below {PROVISIONAL_RD}. The top ten wear the laurel: a radiant crown for the
                champion, gold for second and third, silver-brass to tenth.
              </span>
            </p>
          </>
        )}
      </section>
    </main>
  );
}

function LeaderboardRow({
  row,
  rank,
  label,
  mine,
}: {
  row: Row;
  rank: number;
  label: string;
  mine: boolean;
}) {
  const tier = laurelTier(rank); // champion | gold | silver | null (top 10 only)
  // Honor bands: the top ten carry the laurel and a faint gold wash; ranks
  // 11-100 keep a quiet brass left-edge to mark the honored hundred; below
  // that, plain rows.
  const honored = rank <= 100;
  const tierWash =
    tier === "champion" ? "bg-sun/[0.07]" : tier === "gold" ? "bg-sun/[0.04]" : "";
  const rankTone =
    tier === "champion"
      ? "text-sun-glow"
      : tier === "gold"
        ? "text-sun"
        : tier === "silver"
          ? "text-parchment-200"
          : rank <= 100
            ? "text-parchment-300"
            : "text-parchment-400";

  const rowClass =
    "grid grid-cols-[2rem_1fr_4.5rem_5.25rem] items-center border-b border-[color:var(--edge)] px-3 py-2.5 text-sm transition hover:bg-[var(--surface-hover)] sm:grid-cols-[3rem_1fr_5rem_4rem_6rem] sm:px-4 min-h-[44px] " +
    (mine ? "bg-gold/10" : tierWash);
  const leftEdge = mine
    ? undefined
    : tier
      ? { borderLeft: "2px solid rgba(244,196,48,0.55)" }
      : honored
        ? { borderLeft: "2px solid rgba(244,196,48,0.20)" }
        : undefined;

  const content = (
    <>
      <span className={"font-mono tabular-nums " + rankTone}>{rank}</span>
      <span className="flex min-w-0 items-center gap-2">
        <PlayerAvatar name={row.username} avatar={row.avatar} flair={row.flair} size={24} />
        <span className={"truncate font-medium " + (mine ? "text-gold-leaf" : "text-parchment-100")}>
          {row.username}
        </span>
        {tier && (
          <LaurelBadge rank={rank} title={`#${rank} on the ${label} board`} size={14} className="shrink-0" />
        )}
        {row.bot && <HouseBotChip />}
        {row.guest && <MetaChip>Guest</MetaChip>}
        {mine && (
          <span className="shrink-0 border border-gold/45 px-1.5 py-0.5 text-xs uppercase tracking-[0.06em] text-gold-leaf">
            You
          </span>
        )}
      </span>
      <span className="text-right font-mono tabular-nums text-parchment-100">
        {Math.round(row.rating)}
        {isProvisionalRd(row.rd) && (
          <span className="text-parchment-400" title={`Provisional: rating deviation above ${PROVISIONAL_RD}`}>
            ?
          </span>
        )}
      </span>
      <span className="hidden text-right font-mono tabular-nums text-parchment-400 sm:block">{row.games}</span>
      <span className="text-right font-mono text-xs tabular-nums text-parchment-400 sm:text-sm">
        {row.wins}/{row.losses}/{row.draws}
      </span>
    </>
  );

  if (row.guest) {
    return (
      <div id={`lb-rank-${rank}`} className={rowClass} style={leftEdge}>
        {content}
      </div>
    );
  }
  return (
    <Link id={`lb-rank-${rank}`} href={`/u/${row.username}`} className={rowClass} style={leftEdge}>
      {content}
    </Link>
  );
}

// House engine accounts carry a name everywhere a human does, so they wear the
// outline HOUSE BOT chip at every appearance (design system section 7).
function HouseBotChip() {
  return (
    <span className="shrink-0 whitespace-nowrap border border-[color:var(--edge-strong)] px-1.5 py-0.5 text-xs uppercase tracking-[0.06em] text-parchment-400">
      House bot
    </span>
  );
}

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 border border-[color:var(--edge)] px-1.5 py-0.5 text-xs uppercase tracking-[0.06em] text-parchment-400">
      {children}
    </span>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="mt-8 plate overflow-hidden" aria-hidden>
      <div className="border-b border-[color:var(--edge)] px-4 py-3">
        <div className="skeleton h-3 w-40" />
      </div>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-[color:var(--edge)] px-4 py-2.5">
          <div className="skeleton h-4 w-5" />
          <div className="skeleton h-6 w-6 rounded-md" />
          <div className="skeleton h-4 flex-1" style={{ maxWidth: 160 }} />
          <div className="skeleton h-4 w-12" />
        </div>
      ))}
    </div>
  );
}
